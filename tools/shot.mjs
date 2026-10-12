#!/usr/bin/env node
// Скриншот любой страницы книги: node tools/shot.mjs <file.html> <out.png> [width] [height] [query]
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const [file, out, width = '1400', height = '1600', query = ''] = process.argv.slice(2);
if (!file || !out) { console.error('usage: node tools/shot.mjs <file.html> <out.png> [width] [height] [query]'); process.exit(2); }
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = mkdtempSync(join(tmpdir(), 'book-shot-'));
rmSync(resolve(out), { force: true });
const child = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--allow-file-access-from-files', '--user-data-dir=' + profile, '--virtual-time-budget=30000', '--window-size=' + width + ',' + height, '--screenshot=' + resolve(out), pathToFileURL(resolve(file)).href + (query ? '?' + query : '')], { stdio: 'ignore' });
let last = -1;
const done = () => { clearInterval(poll); child.kill('SIGKILL'); setTimeout(() => { rmSync(profile, { recursive: true, force: true }); console.log(resolve(out)); process.exit(0); }, 150); };
const poll = setInterval(() => { if (!existsSync(out)) return; const size = statSync(out).size; if (size > 0 && size === last) done(); last = size; }, 300);
setTimeout(done, 60000);
