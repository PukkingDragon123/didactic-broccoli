// Captures in-game frames (HUD hidden, people and the cat placed) for store art: covers, banners, GIFs.
// node promo.mjs <outDir> <width> <height> <frames> <camJSON>
// camJSON: { pos:[x,y,z], look:[x,y,z], sway:[dx,dy,dz], fov }
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const [outDir, W, H, N, camArg] = process.argv.slice(2);
const cam = JSON.parse(camArg);
mkdirSync(outDir, { recursive: true });
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const root = '/home/user/didactic-broccoli';
const server = await createServer({ root, configFile: root + '/vite.config.js', server: { port: 0, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] } }, logLevel: 'error' });
await server.listen();
const url = `http://127.0.0.1:${server.httpServer.address().port}/index.html?autotest&q=ultra`;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await (await browser.newContext({ viewport: { width: +W, height: +H } })).newPage();
pg.on('pageerror', (e) => console.log('pageerror', e.message));
const save = {
  money: 48000, pulls: 140,
  machines: [
    { id: 'm1', type: 'retro', slot: 0, up: { speed: 1, cap: 1, coins: 1 }, stock: Array(14).fill('mochi'), series: 'mochi' },
    { id: 'm2', type: 'standard', slot: 1, up: { speed: 1, cap: 1, coins: 0 }, stock: Array(18).fill('konbini'), series: 'konbini' },
    { id: 'm3', type: 'deluxe', slot: 2, up: { speed: 0, cap: 0, coins: 0 }, stock: Array(16).fill('neko_cafe'), series: 'neko_cafe' },
    { id: 'm4', type: 'standard', slot: 3, up: { speed: 0, cap: 0, coins: 0 }, stock: Array(16).fill('wagashi'), series: 'wagashi' },
  ],
  licenses: ['mochi', 'konbini', 'neko_cafe', 'wagashi'], lightsOn: true, radio: 0,
};
await pg.goto(url, { waitUntil: 'load', timeout: 240000 });
await pg.waitForFunction(() => window.__ready === true, null, { timeout: 240000 });
await pg.evaluate((sv) => { window.__game.noSave = true; localStorage.clear(); localStorage.setItem('gacha-garage-save-v1', JSON.stringify(sv)); }, save);
await pg.reload({ waitUntil: 'load', timeout: 240000 });
await pg.waitForFunction(() => window.__ready === true, null, { timeout: 240000 });
await pg.evaluate((cam) => {
  const g = window.__game;
  g.noSave = true;
  // freeze the browser loop: frames are stepped and rendered by hand
  window.requestAnimationFrame = () => 0;
  for (const id of ['hud', 'touch', 'news', 'title', 'm-gear']) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
  g.held.anchor.visible = false;
  // a couple of neighbours out for a walk, Mikan on the step
  const P = g.pedestrians;
  P.spawnT = 1e9;
  P.say = () => {};
  const people = cam.people || [[-6.5, 7.3, 1], [7.5, 7.7, -1]];
  for (const [x, z, dir] of people) {
    P.spawn();
    const p = P.list[P.list.length - 1];
    p.h.finishPaint?.();
    p.h.root.position.set(x, 0, z);
    p.lane = { z, x0: -35, x1: 35 };
    p.path = [new (p.h.root.position.constructor)(dir > 0 ? 35 : -35, 0, z)];
    p.h.root.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    p.wantsIn = false; p.visited = true; p.speed = 1.0;
  }
  // a commuter train crossing over the underpass during the shot
  if (cam.train) { const T = g.garage.town; T.runTrain(cam.train[0], cam.train[1]); const tr = T.trains.find((t) => t.s === cam.train[0]); tr.z = cam.train[2]; tr.played = true; }
  const c = g.street.cat;
  c.pos.set(1.6, 0, 5.6); c.heading = 0.6; g.street.setCatState('sit', 1e9);
  g.cutscene.play(function* (cs) { while (true) yield cs.wait(1e9); }, { skippable: false, letterbox: false });
  window.__cam = cam;
  window.__frame = (i, n) => {
    const T = window.__game.camera.position.constructor;
    const k = Math.sin((i / n) * Math.PI * 2);
    const cs = g.cutscene;
    cs.camOn = true;
    cs.pos.set(cam.pos[0] + cam.sway[0] * k, cam.pos[1] + cam.sway[1] * k, cam.pos[2] + cam.sway[2] * k);
    cs.look.set(cam.look[0], cam.look[1], cam.look[2]);
    cs.fov = cam.fov || 55;
    g.update(1 / 12);
    g.render(1 / 12);
    void T;
  };
  for (let i = 0; i < 24; i++) { g.update(1 / 12); }
}, cam);
for (let i = 0; i < +N; i++) {
  await pg.evaluate(([i, n]) => window.__frame(i, n), [i, +N]);
  await pg.screenshot({ path: `${outDir}/f${String(i).padStart(3, '0')}.png` });
  if (i % 8 === 0) console.log('frame', i);
}
await browser.close();
await server.close();
