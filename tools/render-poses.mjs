// Render toys in ACTION POSES for the comic cards (tools/bake-cards.py card5): each figure's own gimmick clip frozen at
// a few points (wind-up, mid-gimmick, signature end pose), from a few angles, transparent. Same page as render-toys.
//   tools/slot.sh node tools/render-poses.mjs series[,series] [--size 768]
// Out: shots/.art-cache/toys/<series>/pose/<item>_<n>.png  (n: 0 = t 0.3, 1 = t 0.6, 2 = t 1.0)
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const only = args.find((a) => !a.startsWith('--'))?.split(',') || null;
const size = +(args[args.indexOf('--size') + 1] || 768) || 768;
const POSES = [{ t: 0.3, yaw: -0.9 }, { t: 0.6, yaw: 0.2 }, { t: 1.0, yaw: -0.3 }];
let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = createRequire('/opt/node-tools/node_modules/')('playwright')); }
const root = resolve(import.meta.dirname, '..');
const OUT = resolve(root, 'shots/.art-cache/toys');
const server = await createServer({ root, configFile: resolve(root, 'vite.config.js'), server: { port: 0, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] } }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await (await browser.newContext({ viewport: { width: 600, height: 600 } })).newPage();
pg.on('pageerror', (e) => console.log('[pageerror]', e.message));
try {
  await pg.goto(`http://127.0.0.1:${server.httpServer.address().port}/printtoys.html`, { waitUntil: 'load', timeout: 120000 });
  await pg.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  const list = (await pg.evaluate(() => window.toyList())).filter((s) => !only || only.includes(s.id));
  let n = 0;
  for (const s of list) {
    mkdirSync(resolve(OUT, s.id, 'pose'), { recursive: true });
    for (const it of s.items) {
      for (let i = 0; i < POSES.length; i++) {
        try {
          const url = await pg.evaluate(([k, sz, p]) => window.renderToy(k, { size: sz, clip: 'gimmick', t: p.t, yaw: p.yaw }), [it.key, size, POSES[i]]);
          writeFileSync(resolve(OUT, s.id, 'pose', `${it.id}_${i}.png`), Buffer.from(url.split(',')[1], 'base64'));
          n++;
        } catch (e) { console.log('fail', it.key, e.message); }
      }
    }
  }
  console.log('rendered', n, 'poses');
} catch (e) { console.error('ERROR', e.message); }
finally { await browser.close(); await server.close(); }
