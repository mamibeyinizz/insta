// kullanım: node render.mjs <çıktıDizini> <fps> <k> <n> <toplamKare> <sorgu> <png|jpg> [t1 t2 ...]
// k: başlangıç kare, n: adım (paralel işçiler), sorgu: ?s=..&ox=..&oy=.. gibi
import { createRequire } from 'module'; const require = createRequire(import.meta.url); const { chromium } = require('playwright');
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const [outDir, fps, k, n, total, query, fmt, ...times] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.error('PAGEERR', e.message));
page.on('console', m => { if (m.type() === 'error') console.error('CONSOLE', m.text()); });
await page.goto('file://' + dir + '/index.html' + (query === '-' ? '' : query));
await page.waitForFunction('window.ready===true', null, { timeout: 120000 });
const jobs = times.map(t => ({ t: parseFloat(t), name: 't' + parseFloat(t).toFixed(2) }));
if (!times.length) for (let f = parseInt(k); f < parseInt(total); f += parseInt(n)) jobs.push({ t: f / parseFloat(fps), name: 'f' + String(f).padStart(5, '0') });
const t0 = Date.now(); let c = 0;
for (const j of jobs) {
  await page.evaluate(t => window.frame(t), j.t);
  const opt = fmt === 'png' ? { type: 'png' } : { type: 'jpeg', quality: 95 };
  await page.screenshot({ path: path.join(outDir, j.name + '.' + (fmt === 'png' ? 'png' : 'jpg')), ...opt });
  c++; if (c % 50 === 0) console.log(`worker ${k}: ${c}/${jobs.length} ${(Date.now() - t0) / c | 0}ms/frame`);
}
await browser.close();
