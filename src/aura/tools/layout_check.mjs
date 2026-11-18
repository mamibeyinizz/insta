// Altyazı ve uyarı metni kutularını (yerleşim verisi) güvenli bölgeye karşı doğrular.
import { createRequire } from 'module'; const require = createRequire(import.meta.url); const { chromium } = require('playwright');
import path from 'path'; import { fileURLToPath } from 'url';
const dir = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto('file://' + dir + '/index.html?s=0.445&oy=0.26'); await page.waitForFunction('window.ready===true');
const res = await page.evaluate(() => {
  const out = [];
  SEGS.forEach((s, i) => {
    window.frame((s.a + s.b) / 2);
    const sp = [...document.querySelectorAll('#capin span')].map(e => e.getBoundingClientRect());
    const left = Math.min(...sp.map(r => r.left)), right = Math.max(...sp.map(r => r.right)), top = Math.min(...sp.map(r => r.top)), bottom = Math.max(...sp.map(r => r.bottom));
    const lines = new Set(sp.map(r => Math.round(r.top))).size;
    const box = document.getElementById('capin').getBoundingClientRect();
    out.push({ seg: i, a: s.a, b: s.b, text: s.words.join(' '), lines, textW: Math.round(right - left), textLeft: Math.round(left), textRight: Math.round(right), textTop: Math.round(top), textBottom: Math.round(bottom), scrim: [Math.round(box.left), Math.round(box.top), Math.round(box.right), Math.round(box.bottom)], font: getComputedStyle(document.getElementById('capin')).fontSize });
  });
  const d = document.getElementById('disc'); const r = document.createRange(); r.selectNodeContents(d); const rc = r.getBoundingClientRect();
  return { segs: out, disc: { left: Math.round(rc.left), right: Math.round(rc.right), top: Math.round(rc.top), bottom: Math.round(rc.bottom), w: Math.round(rc.width), font: getComputedStyle(d).fontSize, opacity: getComputedStyle(d).opacity } };
});
console.log(JSON.stringify(res, null, 1));
await browser.close();
