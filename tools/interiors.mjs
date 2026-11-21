// Interior look check: boots the game once per quality preset and snaps the 3D canvas (no HUD) of every interior by
// day and by night, plus the average render time of each view (headless SwiftShader: compare runs, not absolute FPS).
// Usage:
//   node tools/interiors.mjs [--q high] [--tag after] [--size 960x540] [--views garage_day,room_night,...] [--frames 6]
//   -> shots/render/<tag>/<q>/<view>.png and shots/render/<tag>/<q>/times.json
// Wrap it in tools/slot.sh on a shared machine.
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const QS = flag('q', 'high').split(','), TAG = flag('tag', 'now'), FRAMES = +flag('frames', 6);
const [W, H] = flag('size', '960x540').split('x').map(Number);

// each view: [hour, setup]; zone-local coordinates for the flats (dbg.growth.go)
const VIEWS = {
  garage: [null, 'game.gachaDebug.setup(); dbg.view(0.6, 3.4, 0.35, -0.12);'],
  mikawaya: [null, 'dbg.view(-12.4, 15.55, Math.PI, -0.06);'],
  ramen: [null, 'dbg.needs.enter("ramen"); game.player.pitch = -0.08;'],
  room: [null, 'dbg.growth.go("room"); game.player.pitch = -0.1;'],
  back103: [null, 'dbg.growth.own("home103", "hobby"); dbg.growth.go("home103", 0.2, 0.9, -0.15, -0.08);'],
  kitchen: [null, 'dbg.growth.own("home103"); dbg.growth.go("home103", -0.4, 0.85, Math.PI + 0.25, -0.22);'],
  bath: [null, 'dbg.growth.own("home103"); dbg.growth.go("home103", 1.25, 2.45, -0.55, -0.25);'],
};
const HOURS = { day: 13, night: 21.5 };
const list = flag('views', Object.keys(VIEWS).flatMap((v) => [v + '_day', v + '_night']).join(',')).split(',');

let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = createRequire('/opt/node-tools/node_modules/')('playwright')); }
const root = resolve(import.meta.dirname, '..');
const server = await createServer({ root, configFile: resolve(root, 'vite.config.js'), server: { port: 0, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] } }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const errors = [];
try {
  for (const q of QS) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    await ctx.addInitScript((qq) => { try { localStorage.setItem('gacha-garage-save-v2', JSON.stringify({ settings: { quality: qq } })); } catch { /* */ } }, q);
    const pg = await ctx.newPage();
    pg.on('console', (m) => { if (m.type() === 'error' && !/GPU stall|willReadFrequently/.test(m.text())) errors.push(`[${q}] ${m.text()}`); });
    pg.on('pageerror', (e) => errors.push(`[${q} pageerror] ${e.stack || e.message}`));
    await pg.goto(`http://127.0.0.1:${server.httpServer.address().port}/index.html?autotest&q=${q}`, { waitUntil: 'load', timeout: 240000 });
    await pg.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
    const dir = resolve(root, 'shots/render', TAG, q);
    mkdirSync(dir, { recursive: true });
    const times = {};
    for (const name of list) {
      const [view, when] = name.split('_');
      if (!VIEWS[view]) continue;
      const setup = VIEWS[view][1];
      const res = await pg.evaluate(async ({ setup, hour, frames }) => {
        const g = window.__game, dbg = window.dbg;
        try { if (g.places?.where) g.places.setWhere(null); } catch { /* */ }
        dbg.time(hour);
        // eslint-disable-next-line no-new-func
        new Function('game', 'dbg', setup)(g, dbg);
        dbg.time(hour);
        dbg.step(1.5);
        const R = g.renderer;
        // settle: autofocus, light pool fades, eye adaptation
        for (let i = 0; i < 4; i++) { g.update(1 / 30); R.render(1 / 30, g.time); }
        const gl = R.renderer.getContext(), px = new Uint8Array(4);
        let ms = 0;
        for (let i = 0; i < frames; i++) {
          const t0 = performance.now();
          g.update(1 / 60); R.render(1 / 60, g.time);
          gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); // (a fence: waits for the frame)
          ms += performance.now() - t0;
        }
        R.render(1 / 60, g.time);
        return { ms: ms / frames, url: R.renderer.domElement.toDataURL('image/png'), calls: R.renderer.info.render.calls, tris: R.renderer.info.render.triangles };
      }, { setup, hour: HOURS[when] ?? 13, frames: FRAMES });
      writeFileSync(resolve(dir, name + '.png'), Buffer.from(res.url.split(',')[1], 'base64'));
      times[name] = { ms: +res.ms.toFixed(1), calls: res.calls, tris: res.tris };
      console.log(q, name, times[name]);
    }
    writeFileSync(resolve(dir, 'times.json'), JSON.stringify(times, null, 1));
    await ctx.close();
  }
} catch (e) { console.error('ERROR', e.stack || e.message); }
finally {
  if (errors.length) console.log('console errors:\n' + errors.slice(0, 30).join('\n'));
  else console.log('no console errors');
  await browser.close();
  await server.close();
}
