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
  garage: [null, 'dbg.shopOpen?.(); game.gachaDebug.setup(); dbg.view(0.6, 3.4, 0.35, -0.12);'],
  mikawaya: [null, 'dbg.view(-12.4, 15.55, Math.PI, -0.06);'],
  ramen: [null, 'dbg.needs.enter("ramen"); game.player.pitch = -0.08;'],
  room: [null, 'dbg.growth.go("room"); game.player.pos.set(80.75, 0, -79.6); game.player.yaw = 0.45; game.player.pitch = -0.12;'],
  back103: [null, 'dbg.growth.own("home103", "hobby"); dbg.growth.go("home103", 1.6, -0.5, 0.8, -0.12);'],
  kitchen: [null, 'dbg.growth.own("home103"); dbg.growth.go("home103", -0.4, 0.85, Math.PI + 0.25, -0.22);'],
  bath: [null, 'dbg.growth.own("home103"); dbg.growth.go("home103", 1.3, 2.3, -0.35, -0.4);'],
};
const HOURS = { day: 13, night: 21.5 };
const list = flag('views', Object.keys(VIEWS).flatMap((v) => [v + '_day', v + '_night']).join(',')).split(',');
// --perf: one boot, every preset in --q switched at runtime, only timings (no pictures)
const PERF = args.includes('--perf');

let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = createRequire('/opt/node-tools/node_modules/')('playwright')); }
const root = resolve(import.meta.dirname, '..');
const server = await createServer({ root, configFile: resolve(root, 'vite.config.js'), server: { port: 0, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] }, fs: { strict: false } }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const errors = [];
try {
  let ctx = null, pg = null;
  const perfAll = {};
  for (const q of QS) {
    if (!pg || !PERF) {
      ctx = await browser.newContext({ viewport: { width: W, height: H } });
      await ctx.addInitScript((qq) => { try { localStorage.setItem('gacha-garage-save-v2', JSON.stringify({ settings: { quality: qq } })); } catch { /* */ } }, q);
      pg = await ctx.newPage();
      pg.on('console', (m) => { const t = m.text(); if ((m.type() === 'error' || /GL_INVALID|WebGL: |room light/.test(t)) && !/GPU stall|willReadFrequently/.test(t)) errors.push(`[${m.type()}] ${t}`); });
      pg.on('pageerror', (e) => errors.push(`[pageerror] ${e.stack || e.message}`));
      await pg.goto(`http://127.0.0.1:${server.httpServer.address().port}/index.html?autotest&q=${q}`, { waitUntil: 'load', timeout: 240000 });
      await pg.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
    } else await pg.evaluate((qq) => { window.__game.renderer.setQuality(qq); }, q);
    const dir = resolve(root, 'shots/render', TAG, q);
    mkdirSync(dir, { recursive: true });
    const times = {};
    for (const name of list) {
      const [view, when] = name.split('_');
      if (!VIEWS[view]) continue;
      const setup = VIEWS[view][1];
      // the room's light probes, in chunks with a fence between them (a software GPU loses the context otherwise)
      await pg.evaluate(({ setup, hour }) => {
        const g = window.__game, dbg = window.dbg, R = g.renderer;
        try { if (g.places?.where) g.places.setWhere(null); } catch { /* */ }
        dbg.time(hour);
        // eslint-disable-next-line no-new-func
        new Function('game', 'dbg', setup)(g, dbg);
        // (setting a view up can start a cutscene, such as moving into a flat: end it and place the camera again)
        for (let k = 0; k < 3 && g.cutscene?.active; k++) { g.cutscene.finish(); dbg.step(0.2); new Function('game', 'dbg', setup)(g, dbg); }
        dbg.time(hour);
        dbg.step(1.5);
        if (g.cutscene?.active) { g.cutscene.finish(); new Function('game', 'dbg', setup)(g, dbg); }
        for (let i = 0; i < 2; i++) { g.update(1 / 30); R.render(1 / 30, g.time); }
      }, { setup, hour: HOURS[when] ?? 13 });
      for (let k = 0; k < 400; k++) {
        const more = await pg.evaluate(() => { const R = window.__game.renderer, gl = R.renderer.getContext(); const m = R.gi?.finish?.(6); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); return !!m; });
        if (!more) break;
      }
      const res = await pg.evaluate(async ({ setup, hour, frames, shot }) => {
        const g = window.__game, R = g.renderer;
        // settle: autofocus, light pool fades, eye adaptation
        for (let i = 0; i < 4; i++) { g.update(1 / 30); R.render(1 / 30, g.time); }
        const gl = R.renderer.getContext(), px = new Uint8Array(4);
        let ms = 0;
        const info = R.renderer.info;
        info.autoReset = false;
        for (let i = 0; i < frames; i++) {
          info.reset();
          const t0 = performance.now();
          g.update(1 / 60); R.render(1 / 60, g.time);
          gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); // (a fence: waits for the frame)
          ms += performance.now() - t0;
        }
        const calls = info.render.calls, tris = info.render.triangles;
        info.autoReset = true;
        R.render(1 / 60, g.time);
        return { ms: ms / frames, url: shot ? R.renderer.domElement.toDataURL('image/png') : '', calls, tris, lost: gl.isContextLost() };
      }, { setup, hour: HOURS[when] ?? 13, frames: FRAMES, shot: !PERF });
      if (!PERF) writeFileSync(resolve(dir, name + '.png'), Buffer.from(res.url.split(',')[1], 'base64'));
      times[name] = { ms: +res.ms.toFixed(1), calls: res.calls, tris: res.tris, ...(res.lost ? { lost: true } : {}) };
      console.log(q, name, times[name]);
    }
    writeFileSync(resolve(dir, 'times.json'), JSON.stringify(times, null, 1));
    perfAll[q] = times;
    if (!PERF) { await ctx.close(); pg = null; }
  }
  if (PERF) writeFileSync(resolve(root, 'shots/render', TAG, 'perf.json'), JSON.stringify(perfAll, null, 1));
} catch (e) { console.error('ERROR', e.stack || e.message); }
finally {
  if (errors.length) console.log('console errors:\n' + errors.slice(0, 30).join('\n'));
  else console.log('no console errors');
  await browser.close();
  await server.close();
}
