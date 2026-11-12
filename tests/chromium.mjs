// Chromium checks: no network without sync, legacy sync still works, settings save, default font
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

// 2. Installs that set up sync before it was hidden keep syncing
{
  const { context, requests } = await launch(200)
  const page = await context.newPage()
  await page.goto(`${base}/newtab.html`); await sleep(800)
  await page.evaluate(() => browser.storage.local.set({ gistid: 'fakegist', map: 'faketoken', offline: false }))
  await page.reload(); await sleep(1000)
  await page.locator('#note-content').type('synced')
  await sleep(2000)
  check('legacy sync sends a PATCH to the configured gist', requests.some(r => r === 'PATCH https://api.github.com/gists/fakegist'), requests.join(', '))
  check('status says Saved and synced.', (await page.textContent('#status')) === 'Saved and synced.')
  await context.close()
}

finish()
