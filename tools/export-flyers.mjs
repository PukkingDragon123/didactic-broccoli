// Export every flyer / promo poster (src/gfx/flyers.js) as a PNG, scaled up with hard pixel edges.
// Usage: node tools/export-flyers.mjs <outDir> [scale=4]
// Writes <id>.png for each design and flyers.json ([{ id, kind, name, file, w, h }]).
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [outArg = 'shots/flyers', scaleArg = '4'] = process.argv.slice(2);
const out = resolve(outArg), k = +scaleArg;
mkdirSync(out, { recursive: true });
let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = createRequire('/opt/node-tools/node_modules/')('playwright')); }
const root = resolve(import.meta.dirname, '..');
const server = await createServer({ root, configFile: resolve(root, 'vite.config.js'), server: { port: 0, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] } }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await browser.newPage();
pg.on('pageerror', (e) => console.log('pageerror', e.message));
try {
  await pg.goto(`http://127.0.0.1:${server.httpServer.address().port}/flyers.html`, { waitUntil: 'load', timeout: 120000 });
  await pg.waitForFunction(() => window.__ready === true, null, { timeout: 600000 });
  const sheets = await pg.evaluate((k) => [...document.querySelectorAll('#grid canvas')].map((c) => {
    const u = document.createElement('canvas'); u.width = c.width * k; u.height = c.height * k;
    const g = u.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, u.width, u.height);
    return { id: c.dataset.id, caption: c.nextSibling?.textContent || '', png: u.toDataURL('image/png'), w: u.width, h: u.height };
  }), k);
  const index = [];
  for (const s of sheets) {
    writeFileSync(resolve(out, `${s.id}.png`), Buffer.from(s.png.split(',')[1], 'base64'));
    const m = /^\S+ - (.*) \((\w+)\)$/.exec(s.caption) || [];
    index.push({ id: s.id, name: m[1] || s.id, kind: m[2] || '', file: `${s.id}.png`, w: s.w, h: s.h });
  }
  writeFileSync(resolve(out, 'flyers.json'), JSON.stringify(index, null, 1));
  console.log(`exported ${index.length} sheets to ${out}`);
} finally {
  await browser.close();
  await server.close();
}
