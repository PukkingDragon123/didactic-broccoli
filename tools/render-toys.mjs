// Render every toy that exists right now as a clean product shot (the in-game mesh, catalogue lighting, transparent),
// for the display cards and toy packaging (tools/bake-cards.py). Re-run after the toy line-up changes.
//   tools/slot.sh node tools/render-toys.mjs [series,series] [--size 1024]  (card resolution: the hero is never upscaled)
// Out: shots/.art-cache/toys/<series>/<item>.png + shots/.art-cache/toys/lineup.json (series, names, rarities)
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const only = args.find((a) => !a.startsWith('--'))?.split(',') || null;
const size = +(args[args.indexOf('--size') + 1] || 1024) || 1024;
let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = createRequire('/opt/node-tools/node_modules/')('playwright')); }
const root = resolve(import.meta.dirname, '..');
const OUT = resolve(root, 'shots/.art-cache/toys');
const server = await createServer({ root, configFile: resolve(root, 'vite.config.js'), server: { port: 0, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] } }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await (await browser.newContext({ viewport: { width: 600, height: 600 } })).newPage();
pg.on('pageerror', (e) => console.log('[pageerror]', e.message));
pg.on('console', (m) => { if (m.type() === 'error') console.log('[console]', m.text()); });
try {
  await pg.goto(`http://127.0.0.1:${server.httpServer.address().port}/printtoys.html`, { waitUntil: 'load', timeout: 120000 });
  await pg.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  const list = (await pg.evaluate(() => window.toyList())).filter((s) => !only || only.includes(s.id));
  mkdirSync(OUT, { recursive: true });
  let n = 0;
  for (const s of list) {
    mkdirSync(resolve(OUT, s.id), { recursive: true });
    for (const it of s.items) {
      try {
        const url = await pg.evaluate(([k, sz]) => window.renderToy(k, { size: sz }), [it.key, size]);
        writeFileSync(resolve(OUT, s.id, it.id + '.png'), Buffer.from(url.split(',')[1], 'base64'));
        n++;
      } catch (e) { console.log('fail', it.key, e.message); it.fail = true; }
    }
  }
  const prev = (() => { try { return JSON.parse(readFileSync(resolve(OUT, 'lineup.json'), 'utf8')); } catch { return {}; } })();
  const all = { ...prev, ...Object.fromEntries(list.map((s) => [s.id, s])) };
  writeFileSync(resolve(OUT, 'lineup.json'), JSON.stringify(all, null, 1));
  console.log('rendered', n, 'toys in', list.length, 'series ->', OUT);
} catch (e) { console.error('ERROR', e.message); }
finally { await browser.close(); await server.close(); }
