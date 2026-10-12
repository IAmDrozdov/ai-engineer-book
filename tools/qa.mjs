#!/usr/bin/env node
// Проверка страницы книги в headless Chrome: отчёт о проблемах и скриншоты рисунков.
// node tools/qa.mjs <папка-главы | путь к html> [--shots] [--sections] [--dark] [--mobile] [--out <папка для скриншотов>]
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const outArg = outIdx >= 0 ? args.splice(outIdx, 2)[1] : null;
const flags = new Set(args.filter((a) => a.startsWith('--')));
const target = args.find((a) => !a.startsWith('--'));
if (!target) { console.error('usage: node tools/qa.mjs <chapter-dir|file.html> [--shots] [--sections] [--dark] [--mobile]'); process.exit(2); }

let file = resolve(existsSync(target) ? target : join(ROOT, target));
if (statSync(file).isDirectory()) file = join(file, 'index.html');
const slug = basename(dirname(file));
const outDir = outArg ? resolve(outArg) : join(ROOT, '_qa', slug);
mkdirSync(outDir, { recursive: true });
const theme = flags.has('--dark') ? '&theme=dark' : '';

function chrome(extra, url, waitFile) {
  // Chrome в headless-режиме не всегда завершается сам: ждём результат и гасим процесс.
  const profile = mkdtempSync(join(tmpdir(), 'book-qa-'));
  return new Promise((done) => {
    const child = spawn(CHROME, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
      '--allow-file-access-from-files', '--user-data-dir=' + profile, '--virtual-time-budget=60000', ...extra, url,
    ], { stdio: ['ignore', 'pipe', 'ignore'] });
    let out = '', idle = null, finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearInterval(poll); clearTimeout(idle); clearTimeout(hard);
      child.kill('SIGKILL');
      setTimeout(() => { rmSync(profile, { recursive: true, force: true }); done(out); }, 150);
    };
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      out += chunk;
      clearTimeout(idle);
      if (!waitFile && /<\/html>\s*$/.test(out)) idle = setTimeout(finish, 400);
    });
    child.on('exit', finish);
    let lastSize = -1;
    const poll = setInterval(() => {
      if (!waitFile || !existsSync(waitFile)) return;
      const size = statSync(waitFile).size;
      if (size > 0 && size === lastSize) finish();
      lastSize = size;
    }, 300);
    const hard = setTimeout(finish, 90000);
  });
}
const pageUrl = (query) => pathToFileURL(file).href + '?qa=1' + theme + (query || '');

async function report(width) {
  // Под нагрузкой Chrome иногда отдаёт DOM раньше, чем страница дорисовала схемы: пробуем несколько раз.
  for (let attempt = 0; attempt < 4; attempt++) {
    const dom = await chrome(['--window-size=' + width + ',1400', '--dump-dom'], pageUrl());
    const m = dom.match(/<script type="application\/json" id="qa-report">([\s\S]*?)<\/script>/);
    if (m) return JSON.parse(m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
  }
  return null;
}
async function shot(name, width, height, query) {
  const out = join(outDir, name);
  rmSync(out, { force: true });
  await chrome(['--window-size=' + width + ',' + Math.min(Math.max(height, 300), 3000), '--screenshot=' + out], pageUrl(query), out);
  return out;
}

const rep = await report(1400);
if (!rep) { console.error('FAIL: страница не дошла до конца инициализации (нет qa-report). Проверь синтаксис HTML и подключение assets.'); process.exit(1); }
const narrow = await report(500);
const narrowOverflow = narrow ? narrow.issues.filter((i) => i.kind === 'overflow').map((i) => ({ kind: 'overflow-mobile', msg: i.msg })) : [];
rep.issues.push(...narrowOverflow);
writeFileSync(join(outDir, 'report.json'), JSON.stringify(rep, null, 2));

console.log('PAGE', rep.title);
console.log('STATS', JSON.stringify(rep.stats));
console.log('FIGURES');
rep.figures.forEach((f) => console.log('  ' + f.i + '. [' + f.kind + '] #' + f.id + ' ' + f.height + 'px — ' + f.caption));
console.log(rep.issues.length ? 'ISSUES (' + rep.issues.length + ')' : 'ISSUES none');
rep.issues.forEach((i) => console.log('  - [' + i.kind + '] ' + i.msg));

const shots = [];
if (flags.has('--shots')) {
  shots.push(await shot('top.png', 1400, 1500, '&only=top'));
  let batch = [], sum = 0;
  const flush = async () => {
    if (!batch.length) return;
    const from = batch[0].i, to = batch[batch.length - 1].i;
    shots.push(await shot('fig-' + String(from).padStart(2, '0') + '-' + String(to).padStart(2, '0') + '.png', 1400, sum + 60, '&only=fig:' + from + '-' + to));
    batch = []; sum = 0;
  };
  for (const f of rep.figures) {
    if (batch.length && (sum + f.height + 14 > 1500 || batch.length >= 3)) await flush();
    batch.push(f); sum += f.height + 14;
  }
  await flush();
}
if (flags.has('--sections')) {
  for (const sec of rep.sections) shots.push(await shot('sec-' + String(sec.i).padStart(2, '0') + '.png', 1400, Math.min(sec.height + 60, 3000), '&only=sec:' + sec.i));
}
if (flags.has('--mobile')) shots.push(await shot('narrow.png', 500, 1800, '&only=top'));
if (shots.length) { console.log('SHOTS'); shots.forEach((p) => console.log('  ' + p)); }
process.exit(rep.issues.length ? 1 : 0);
