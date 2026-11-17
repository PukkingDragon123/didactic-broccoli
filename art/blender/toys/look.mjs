// Contact sheet of the Blender toy figures as the game draws them (toylook.html, src/dev/toyLook.js):
//   tools/slot.sh node art/blender/toys/look.mjs <series>[/<id>,...] <out.png> [--views a,b,...] [--size 360] [--light shop]
// views: front (3/4 front), back (3/4 back), side, top, t<sec> (the gimmick at that time, 3/4 front), e.g. t0.4
//   --spec views.json: per figure views instead, { "<id>": ["front", "t1.0", ...] } (rows padded to the longest)
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const pos = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const [which, out] = pos;
const size = +opt('size', 360);
const views = opt('views', 'front,back,t0.5,t1.0,t1.9').split(',');
const light = opt('light', 'catalogue');
const bg = opt('bg', '#9c958c');
const spec = opt('spec', null) ? JSON.parse((await import('node:fs')).readFileSync(opt('spec', null), 'utf8')) : null;
let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = createRequire('/opt/node-tools/node_modules/')('playwright')); }
const root = resolve(import.meta.dirname, '../../..');
const server = await createServer({ root, configFile: resolve(root, 'vite.config.js'), server: { port: 0, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] } }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await (await browser.newContext({ viewport: { width: 600, height: 600 } })).newPage();
pg.on('pageerror', (e) => console.log('[pageerror]', e.message));
pg.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.text()); });
const V = { front: { yaw: -0.65, pitch: 0.24 }, back: { yaw: Math.PI - 0.65, pitch: 0.3 }, side: { yaw: -Math.PI / 2, pitch: 0.06 }, top: { yaw: -0.3, pitch: 1.2 }, front2: { yaw: 0.65, pitch: 0.24 } };
try {
  await pg.goto(`http://127.0.0.1:${server.httpServer.address().port}/toylook.html`, { waitUntil: 'load', timeout: 120000 });
  await pg.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  const [series, ids] = which.split('/');
  const keys = ids ? ids.split(',').map((i) => `${series}/${i}`) : await pg.evaluate((s) => import('/src/data/series/index.js').then((m) => m.SERIES_BY_ID[s].items.map((i) => i.key)), series);
  const tiles = [];
  const cols = spec ? Math.max(...keys.map((k) => (spec[k.split('/')[1]] || views).length)) : views.length;
  for (const k of keys) {
    const vs = spec ? spec[k.split('/')[1]] || views : views;
    for (let i = 0; i < cols; i++) {
      const v = vs[i];
      if (!v) { tiles.push(null); continue; }
      const o = v.startsWith('t') ? { ...V.front, t: +v.slice(1) } : { ...V[v] };
      const url = await pg.evaluate(([k, o]) => window.look(k, o), [k, { ...o, size, light, bg }]);
      tiles.push(Buffer.from(url.split(',')[1], 'base64'));
    }
  }
  const rows = keys.length;
  await sharp({ create: { width: cols * size, height: rows * size, channels: 4, background: bg } })
    .composite(tiles.map((b, i) => (b ? { input: b, left: (i % cols) * size, top: Math.floor(i / cols) * size } : null)).filter(Boolean)).png().toFile(out);
  console.log('wrote', out, `${cols}x${rows}`);
} finally { await browser.close(); await server.close(); }
