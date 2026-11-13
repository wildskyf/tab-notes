// Firefox checks: upgrade from 3.2.0 (the AMO version before 4.x) to the current build.
// Needs a local Firefox 140+; set FIREFOX_BIN if it is not in the default macOS location.
import puppeteer from 'puppeteer-core'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { buildExtension, check, finish, sleep, tempDir } from './lib.mjs'

const OLD_XPI = 'https://addons.mozilla.org/firefox/downloads/file/3916639/tab_notes-3.2.0.xpi'
const UUID = '11111111-2222-3333-4444-555555555555'
const base = `moz-extension://${UUID}`

const newDir = process.argv[2] || buildExtension()
const oldDir = path.join(tempDir('v3.2.0'), 'unpacked')
const xpi = `${oldDir}.xpi`
fs.writeFileSync(xpi, Buffer.from(await (await fetch(OLD_XPI)).arrayBuffer()))
execFileSync('unzip', ['-q', xpi, '-d', oldDir])

const browser = await puppeteer.launch({
  browser: 'firefox', headless: true,
  executablePath: process.env.FIREFOX_BIN || '/Applications/Firefox.app/Contents/MacOS/firefox',
  // System access lets the test open extension pages, which WebDriver BiDi refuses to navigate to
  env: { ...process.env, MOZ_REMOTE_ALLOW_SYSTEM_ACCESS: '1' },
  // A fixed internal UUID keeps the same storage across both installs
  extraPrefsFirefox: { 'extensions.webextensions.uuids': JSON.stringify({ 'note-tab@wildsky.cc': UUID }) },
})
const bidi = browser.connection
const requests = []
await bidi.send('session.subscribe', { events: ['network.beforeRequestSent'] })
bidi.on('network.beforeRequestSent', e => {
  if (!/^(moz-extension|data|about|chrome|resource):/.test(e.request.url)) { requests.push(`${e.request.method} ${e.request.url}`) }
})

const chromeContext = (await bidi.send('browsingContext.getTree', { 'moz:scope': 'chrome' })).result.contexts[0].context
const evalIn = async (context, expression) => {
  const { result } = await bidi.send('script.evaluate', { expression, target: { context }, awaitPromise: true })
  if (result.type !== 'success') { throw new Error(result.exceptionDetails?.text) }
  return result.result.value
}
const closeTabs = () => evalIn(chromeContext, `for (const t of [...gBrowser.tabs].slice(1)) gBrowser.removeTab(t); 1`)
const openPage = async page => {
  const url = `${base}/${page}`
  await evalIn(chromeContext, `gBrowser.selectedTab = gBrowser.addTab('${url}', { triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal() }); 1`)
  for (let i = 0; i < 30; i++) {
    await sleep(300)
    const tab = (await bidi.send('browsingContext.getTree', {})).result.contexts.find(c => c.url === url)
    if (tab) { await sleep(1200); return tab.context }
  }
  throw new Error(`could not open ${url}`)
}
const typeInto = async (context, selector, text) => {
  const { result } = await bidi.send('script.evaluate', { expression: `document.querySelector('${selector}')`, target: { context }, awaitPromise: false })
  await bidi.send('input.performActions', { context, actions: [
    { type: 'pointer', id: 'mouse', actions: [
      { type: 'pointerMove', x: 0, y: 0, origin: { type: 'element', element: { sharedId: result.result.sharedId } } },
      { type: 'pointerDown', button: 0 }, { type: 'pointerUp', button: 0 }] },
    { type: 'key', id: 'keyboard', actions: [...text].flatMap(value => [{ type: 'keyDown', value }, { type: 'keyUp', value }]) },
  ] })
}

// 3.2.0 stored plain text from a textarea
await browser.installExtension(oldDir)
let tab = await openPage('newtab.html')
await evalIn(tab, `browser.storage.local.set({ list: [
  { content: 'line one\\nline two\\n\\na < b && c > d', time: 2 },
  { content: 'single line', time: 1 } ] }).then(() => 1)`)
await closeTabs()

await browser.installExtension(newDir)
tab = await openPage('newtab.html')
const after = JSON.parse(await evalIn(tab, `(async () => JSON.stringify({
  shown: document.querySelector('#note-content').innerText,
  list: (await browser.storage.local.get()).list.map(n => n.content),
  modeSwitcherHidden: document.querySelector('#mode-switcher').hidden,
  font: getComputedStyle(document.querySelector('#note-content')).fontFamily,
}))()`))
check('notes from 3.2.0 survive the upgrade', after.list.length === 2, JSON.stringify(after.list))
check('multi-line note keeps its line breaks', after.shown === 'line one\nline two\n\na < b && c > d', JSON.stringify(after.shown))
check('plain-text note is stored as escaped HTML', after.list[0] === 'line one<br>line two<br><br>a &lt; b &amp;&amp; c &gt; d', after.list[0])
check('dark mode switch is shown after upgrading', after.modeSwitcherHidden === false)
check('default font is Roboto Mono', after.font.includes('Roboto Mono'), after.font)

await typeInto(tab, '#note-content', 'typed')
await sleep(6500)
check('status says Saved.', (await evalIn(tab, `document.querySelector('#status').textContent`)) === 'Saved.')

await closeTabs()
tab = await openPage('settings.html')
await evalIn(tab, `document.querySelector('#dark-mode-toggle').click(), 1`)
await sleep(500)
check('settings dark mode switch saves', (await evalIn(tab, `browser.storage.local.get().then(s => s.mode)`)) === 'night')

// to-do checkboxes use caretPositionFromPoint in Firefox
await evalIn(tab, `browser.storage.local.set({ list: [{ content: '', time: Date.now() }] }).then(() => 1)`)
await closeTabs()
tab = await openPage('newtab.html')
await typeInto(tab, '#note-content', '[ ] task')
await sleep(800)
const noteText = () => evalIn(tab, `document.querySelector('#note-content').innerText.replace(/\\u00a0/g, ' ')`)
check('"[ ] " becomes a checkbox in Firefox', (await noteText()) === '☐ task', JSON.stringify(await noteText()))
const box = JSON.parse(await evalIn(tab, `(() => {
  const node = document.createTreeWalker(document.querySelector('#note-content'), NodeFilter.SHOW_TEXT).nextNode()
  const range = document.createRange(); range.setStart(node, 0); range.setEnd(node, 1)
  const r = range.getBoundingClientRect()
  return JSON.stringify({ x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) })
})()`))
await bidi.send('input.performActions', { context: tab, actions: [{ type: 'pointer', id: 'mouse', actions: [
  { type: 'pointerMove', x: box.x, y: box.y }, { type: 'pointerDown', button: 0 }, { type: 'pointerUp', button: 0 }] }] })
await sleep(800)
check('clicking the checkbox toggles it in Firefox', (await noteText()) === '☑ task', JSON.stringify(await noteText()))

check('no network requests at all', requests.length === 0, requests.join(', '))
await browser.close()
finish()
