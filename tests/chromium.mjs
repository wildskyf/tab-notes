// Chromium checks: no network requests, leftover sync settings removed, settings and fonts work
import { chromium } from 'playwright'
import crypto from 'node:crypto'
import fs from 'node:fs'
import { buildExtension, check, finish, sleep } from './lib.mjs'

const dir = fs.realpathSync(process.argv[2] || buildExtension())
// Chromium derives an unpacked extension's id from its path
const id = [...crypto.createHash('sha256').update(dir).digest('hex').slice(0, 32)]
  .map(c => String.fromCharCode(97 + parseInt(c, 16))).join('')
const base = `chrome-extension://${id}`

const launch = async githubStatus => {
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${dir}`, `--load-extension=${dir}`],
  })
  const requests = []
  context.on('request', r => { if (!r.url().startsWith('chrome-extension://')) requests.push(`${r.method()} ${r.url()}`) })
  // Never reach the real GitHub API
  await context.route('https://api.github.com/**', route => route.fulfill({
    status: githubStatus, contentType: 'application/json',
    body: JSON.stringify({ files: { 'tab-notes.html': { content: 'from gist\n\n<<1700000000000>>\n\n' } } }),
  }))
  return { context, requests }
}

// 1. Without sync set up, typing and saving makes no network requests
{
  const { context, requests } = await launch(401)
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${base}/newtab.html`); await sleep(1000)
  await page.locator('#note-content').type('secret note')
  await sleep(6500)
  check('no network requests without sync', requests.length === 0, requests.join(', '))
  check('note is saved locally', (await page.evaluate(() => browser.storage.local.get().then(s => s.list[0].content))).includes('secret note'))
  check('status says Saved.', (await page.textContent('#status')) === 'Saved.')

  const font = await page.evaluate(() => getComputedStyle(document.querySelector('#note-content')).fontFamily)
  check('default font is Roboto Mono, not "undefined"', font.includes('Roboto Mono'), font)

  await page.goto(`${base}/settings.html`); await sleep(1000)
  await page.evaluate(() => document.querySelector('#dark-mode-toggle').click())
  await sleep(500)
  check('settings dark mode switch saves', (await page.evaluate(() => browser.storage.local.get().then(s => s.mode))) === 'night')
  check('no page errors', errors.length === 0, errors.join(', '))
  await context.close()
}

// 2. Leftover GitHub sync settings are deleted and never used
{
  const { context, requests } = await launch(200)
  const page = await context.newPage()
  await page.goto(`${base}/newtab.html`); await sleep(800)
  await page.evaluate(() => browser.storage.local.set({ gistid: 'fakegist', map: 'faketoken', offline: true }))
  await page.reload(); await sleep(1000)
  await page.locator('#note-content').type('still local')
  await sleep(1500)
  const left = await page.evaluate(() => browser.storage.local.get(['gistid', 'map', 'offline']))
  check('stored GitHub token and sync state are deleted', Object.keys(left).length === 0, JSON.stringify(left))
  check('no network requests with old sync settings', requests.length === 0, requests.join(', '))
  await context.close()
}

// 3. Font settings are shown and apply to the notes page
{
  const { context } = await launch(401)
  const page = await context.newPage()
  await page.goto(`${base}/settings.html`); await sleep(1000)
  check('Roboto Mono and Default size are preselected', await page.evaluate(() =>
    document.querySelector('#robotomono').checked && document.querySelector('#default').checked))
  await page.evaluate(() => { document.querySelector('#lora').click(); document.querySelector('#large').click() })
  await sleep(500)
  await page.goto(`${base}/newtab.html`); await sleep(1000)
  const style = await page.evaluate(() => { const cs = getComputedStyle(document.querySelector('#note-content')); return { font: cs.fontFamily, size: cs.fontSize } })
  check('chosen font and size apply to notes', style.font === 'Lora' && style.size === '30px', JSON.stringify(style))
  await context.close()
}

finish()
