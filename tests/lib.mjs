// Shared helpers: build the store package and load that, so tests see exactly what users get.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

export const tempDir = prefix => fs.mkdtempSync(path.join(os.tmpdir(), `tab-notes-${prefix}-`))

// Build with web-ext (same ignore list as the store upload) and unzip into a temp dir
export const buildExtension = () => {
  const out = tempDir('build')
  execFileSync('npx', ['--yes', 'web-ext@10', 'build', '--artifacts-dir', out], { cwd: ROOT, stdio: 'ignore' })
  const zip = fs.readdirSync(out).find(f => f.endsWith('.zip'))
  const dir = path.join(out, 'unpacked')
  execFileSync('unzip', ['-q', path.join(out, zip), '-d', dir])
  return dir
}

let failures = 0
export const check = (name, ok, detail = '') => {
  if (!ok) { failures++ }
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`)
}
export const finish = () => {
  console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed')
  process.exit(failures ? 1 : 0)
}
