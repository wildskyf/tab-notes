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

// 4. #37: titles and download names work in any script
{
  const { context } = await launch(401)
  const page = await context.newPage()
  await page.goto(`${base}/newtab.html`); await sleep(800)
  await page.evaluate(() => browser.storage.local.set({ list: [
    { content: '今天要買牛奶', time: 3 },
    { content: 'Caf&eacute;&nbsp;au lait<div>second line</div>', time: 2 },
    { content: '<img src="data:image/png;base64,AAAA">', time: 1 },
  ] }))
  await page.reload(); await sleep(1000)
  const titles = await page.$$eval('#list li > span', spans => spans.map(s => s.childNodes[0].textContent))
  check('CJK, accented and image-only titles', JSON.stringify(titles) === JSON.stringify(['今天要買牛奶', 'Café au la', '(EMPTY)']), JSON.stringify(titles))
  await page.evaluate(() => { HTMLAnchorElement.prototype.click = function () { window.downloadName = this.download } })
  const names = []
  for (const index of [0, 2]) {
    await page.$$eval('#list li .dnld', (buttons, i) => buttons[i].click(), index)
    await sleep(200)
    names.push(await page.evaluate(() => window.downloadName))
  }
  check('download file names are plain text', JSON.stringify(names) === JSON.stringify(['今天要買牛奶.txt', 'note.txt']), JSON.stringify(names))
  await context.close()
}

// 5. #38: text inserted without a key press (mouse paste, drag and drop) is saved
{
  const { context } = await launch(401)
  const page = await context.newPage()
  await page.goto(`${base}/newtab.html`); await sleep(800)
  await page.focus('#note-content')
  await page.evaluate(() => document.execCommand('insertText', false, 'pasted with the mouse'))
  await sleep(800)
  const stored = await page.evaluate(() => browser.storage.local.get().then(s => s.list[0].content))
  check('mouse paste is saved', stored === 'pasted with the mouse', stored)
  await context.close()
}

// 6. #39: two Tab Notes pages do not overwrite each other
{
  const { context } = await launch(401)
  const a = await context.newPage(); await a.goto(`${base}/newtab.html`); await sleep(800)
  await a.evaluate(() => browser.storage.local.set({ list: [{ content: 'start', time: 1 }] }))
  await a.reload(); await sleep(800)
  const b = await context.newPage(); await b.goto(`${base}/newtab.html`); await sleep(1000)

  await a.focus('#note-content'); await a.keyboard.press('End'); await a.keyboard.type(' from A'); await sleep(800)
  check('the other page shows the new text', (await b.$eval('#note-content', e => e.innerText)) === 'start from A')
  await b.focus('#note-content'); await b.keyboard.press('End'); await b.keyboard.type(' from B'); await sleep(800)
  let notes = await b.evaluate(() => browser.storage.local.get().then(s => s.list.map(n => n.content)))
  check('edits from both pages are kept', JSON.stringify(notes) === JSON.stringify(['start from A from B']), JSON.stringify(notes))

  // Page B is mid-typing (not saved yet) when page A saves the same note
  await b.evaluate(() => document.execCommand('insertText', false, ' unsaved'))
  await a.evaluate(async () => {
    const { list } = await browser.storage.local.get('list')
    list[0] = { content: 'changed elsewhere', time: Date.now() }
    await browser.storage.local.set({ list })
  })
  await sleep(1000)
  notes = await b.evaluate(() => browser.storage.local.get().then(s => s.list.map(n => n.content).sort()))
  check('a conflicting edit keeps both versions', JSON.stringify(notes) === JSON.stringify(['changed elsewhere', 'start from A from B unsaved']), JSON.stringify(notes))
  await context.close()
}

// 7. Import adds notes from every export format and never wipes existing notes
{
  const { context } = await launch(401)
  const page = await context.newPage()
  const dialogs = []
  page.on('dialog', d => { dialogs.push(d.message()); d.accept() })
  const importText = async text => {
    await page.goto(`${base}/newtab.html`); await sleep(500)
    await page.evaluate(() => browser.storage.local.set({ list: [{ content: 'existing', time: 100 }] }))
    await page.goto(`${base}/import.html`); await sleep(500)
    await page.fill('#import-content', text)
    await page.click('#import-button'); await sleep(400)
    const result = await page.textContent('#import-result')
    const notes = await page.evaluate(() => browser.storage.local.get().then(s => s.list.map(n => n.content)))
    return { result, notes }
  }
  let r = await importText('one\n\n<<10>>\n\ntwo\n\n<<20>>')
  check('4.x export with trimmed trailing newlines', JSON.stringify(r.notes) === JSON.stringify(['existing', 'two', 'one']) && r.result === 'Imported 2 notes.', JSON.stringify(r))
  r = await importText('only note\n\n<<10>>')
  check('single 4.x note', JSON.stringify(r.notes) === JSON.stringify(['existing', 'only note']), JSON.stringify(r))
  r = await importText(JSON.stringify({ version: 5, mode: 'day', list: [{ content: 'from json', time: 50 }, { content: 'existing', time: 40 }] }, null, '  '))
  check('3.2.0 JSON export, skipping a note that already exists', JSON.stringify(r.notes) === JSON.stringify(['existing', 'from json']) && r.result === 'Imported 1 note, skipped 1 already there or empty.', JSON.stringify(r))
  r = await importText('first plain\nnote\n\n--------------------\n\nsecond plain')
  check('3.2.0 plain-text export', JSON.stringify(r.notes) === JSON.stringify(['first plain\nnote', 'second plain', 'existing']), JSON.stringify(r))
  await page.goto(`${base}/newtab.html`); await sleep(800)
  const converted = await page.evaluate(() => browser.storage.local.get().then(s => s.list[0].content))
  check('imported plain-text note keeps its line break', converted === 'first plain<br>note', converted)
  dialogs.length = 0
  r = await importText('just some text')
  check('unknown text asks first, then adds one note', dialogs.length === 1 && JSON.stringify(r.notes) === JSON.stringify(['just some text', 'existing']), JSON.stringify({ r, dialogs }))
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${base}/newtab.html`); await sleep(800)
  check('new tab still works after importing', errors.length === 0, errors.join(', '))
  await context.close()
}

finish()
