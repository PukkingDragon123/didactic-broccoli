// Store-art frames of the whole street dancing in front of the open garage (late-game save, HUD hidden, film
// grain off so GIFs compress and loop cleanly). Everyone shares one song clock, so N frames covering a whole
// number of bars loop seamlessly.
// node tools/promo-dance.mjs <outDir> [config.json]   (default: the 960x320 banner below)
// config: { W, H, frames, fps, bpm, sub (update substeps per frame), warm (bars before frame 0), only: [frame...],
//   cam: { pos, look, fov }, cat: { x, z, heading } | null, pigeons: [[x, z, heading], ...] (frozen; others hidden),
//   people: [{ preset ('keeper' = Mikawa-ya's shopkeeper), seed, x, z, ry (default: face the camera) + turn, style, mirror,
//              amp, look: 'cam' | index into people | [x, y, z] }] }
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';

// The itch.io banner: one of each preset + Mikan in two staggered rows (screen-slot spacing so nobody hides
// behind the front row), 2 bars at 125 BPM = 48 frames at 12.5 fps (8 cs GIF delay) -> a seamless loop.
const BANNER = {
  W: 960, H: 320, frames: 48, fps: 12.5, bpm: 125, sub: 4, warm: 2,
  cam: { pos: [0, 1.75, 14.0], look: [0, 1.12, 5.5], fov: 26.5 },
  cat: { x: -0.52, z: 7.65, heading: 0.15 },
  pigeons: [[-3.9, 7.8, 1.2], [3.95, 8.0, -2.0]],
  people: [
    { preset: 'tourist', seed: 4, x: -4.62, z: 5.9, style: 'wave' },
    { preset: 'salaryman', seed: 2, x: -3.3, z: 5.9, style: 'disco', mirror: false },
    { preset: 'office_lady', seed: 4, x: -1.98, z: 5.9, style: 'step', mirror: false },
    { preset: 'construction', seed: 3, x: -0.66, z: 5.9, style: 'twist' },
    { preset: 'otaku', seed: 2, x: 0.66, z: 5.9, style: 'robot', mirror: false },
    { preset: 'delivery', seed: 2, x: 1.98, z: 5.9, style: 'bounce' },
    { preset: 'gyaru', seed: 2, x: 3.3, z: 5.9, style: 'disco', mirror: true, look: 7, turn: 0.35 },
    { preset: 'schoolboy', seed: 2, x: 4.62, z: 5.9, style: 'twist', mirror: true, look: 6, turn: -0.35 },
    { preset: 'grandma', seed: 3, x: -3.32, z: 7.2, style: 'bon', mirror: false, look: 9, turn: 0.3 },
    { preset: 'grandpa', seed: 6, x: -2.21, z: 7.2, style: 'bon', mirror: false, look: 8, turn: -0.3 },
    { preset: 'mom', seed: 4, x: -1.11, z: 7.2, style: 'step', mirror: true, look: 11, turn: -0.25 },
    { preset: 'kid', seed: 1, x: 0.0, z: 7.2, style: 'bounce' },
    { preset: 'schoolgirl', seed: 2, x: 1.11, z: 7.2, style: 'wave', mirror: true },
    { preset: 'shopkeeper', seed: 1, x: 2.21, z: 7.2, style: 'bon', mirror: false },
    { preset: 'keeper', x: 3.32, z: 7.2, style: 'bon', mirror: false },
  ],
};
const [outDir, cfgPath] = process.argv.slice(2);
const cfg = cfgPath ? JSON.parse(readFileSync(cfgPath, 'utf8')) : BANNER;
mkdirSync(outDir, { recursive: true });
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const root = '/home/user/didactic-broccoli';
const server = await createServer({ root, configFile: root + '/vite.config.js', server: { port: 0, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] } }, logLevel: 'error' });
await server.listen();
const url = `http://127.0.0.1:${server.httpServer.address().port}/index.html?autotest&q=${cfg.q || 'ultra'}`;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const pg = await (await browser.newContext({ viewport: { width: cfg.W, height: cfg.H } })).newPage();
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
  const info = await pg.evaluate(async (cfg) => {
    const { createHuman } = await import('/src/people/index.js');
    const g = window.__game;
    g.noSave = true;
    window.requestAnimationFrame = () => 0; // frames are stepped and rendered by hand
    for (const id of ['hud', 'touch', 'news', 'title', 'm-gear']) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
    g.held.anchor.visible = false;
    if (g.renderer.grade) g.renderer.grade.uniforms.uGrain.value = 0;
    // an empty lane: no walkers, no trains; Mikawa-ya's keeper comes out to join in
    const P = g.pedestrians;
    P.spawnT = 1e9; P.say = () => {};
    for (const p of [...P.list]) P.remove(p);
    const keeper = P.keeper?.h; P.keeper = null;
    const T = g.garage.town;
    for (const tr of T.trains || []) { tr.g.visible = false; tr.wait = 1e9; }
    // the song clock everyone dances to
    window.__songT = 0;
    const clock = () => window.__songT;
    const V = g.camera.position.constructor;
    const camPos = new V(...cfg.cam.pos);
    const people = cfg.people.map((d, i) => {
      const h = d.preset === 'keeper' && keeper ? keeper : createHuman({ preset: d.preset, seed: d.seed ?? i + 1, lazy: false });
      h.finishPaint?.();
      if (h.root.parent !== g.scene) { h.root.removeFromParent(); g.scene.add(h.root); }
      h.root.position.set(d.x, 0, d.z);
      h.root.rotation.y = (d.ry ?? Math.atan2(camPos.x - d.x, camPos.z - d.z)) + (d.turn || 0);
      return { h, d };
    });
    for (const p of people) {
      const L = p.d.look;
      p.lookAt = L === 'cam' || L === undefined ? camPos : Array.isArray(L) ? new V(...L) : (() => { const o = people[L].h; return new V(o.root.position.x, o.height * 0.93, o.root.position.z); })();
    }
    // settle standing, then start dancing on the clock
    for (let i = 0; i < 60; i++) for (const p of people) p.h.update(1 / 60, { lookAt: p.lookAt });
    for (const p of people) p.h.gesture('dance', { bpm: cfg.bpm, clock, style: p.d.style, mirror: p.d.mirror, amp: p.d.amp });
    // Mikan grooves along; pigeons frozen where placed
    const S = g.street, c = S.cat;
    if (cfg.cat) { c.pos.set(cfg.cat.x, 0, cfg.cat.z); c.heading = cfg.cat.heading ?? 0; c.g.rotation.y = c.heading; S.setCatState('groove', 1e9, { bpm: cfg.bpm, clock }); }
    else c.g.visible = false;
    S.updatePigeons = () => {};
    S.pigeons.forEach((pp, i) => {
      const q = (cfg.pigeons || [])[i];
      pp.g.visible = !!q;
      if (q) { pp.g.position.set(q[0], 0, q[1]); pp.g.rotation.y = q[2] || 0; }
    });
    g.player.pos.set(0, 0, -3); // keep the player (and the cat's curiosity) out of the way
    g.cutscene.play(function* (cs) { while (true) yield cs.wait(1e9); }, { skippable: false, letterbox: false });
    const step = (dt) => {
      const n = cfg.sub || 4;
      for (let s = 0; s < n; s++) {
        window.__songT += dt / n;
        g.update(dt / n);
        for (const p of people) p.h.update(dt / n, { lookAt: p.lookAt });
      }
    };
    window.__frame = () => {
      const cs = g.cutscene;
      cs.camOn = true; cs.hand = 0; cs.offset?.set(0, 0, 0); // locked-off camera (no handheld sway)
      cs.pos.set(...cfg.cam.pos); cs.look.set(...cfg.cam.look); cs.fov = cfg.cam.fov || 40;
      step(1 / cfg.fps);
      g.render(1 / cfg.fps);
    };
    // warm up a whole number of bars (blend-in done, springs settled), then frame 0 starts on a downbeat
    const bar = 4 * 60 / cfg.bpm, warm = (cfg.warm ?? 2) * bar;
    while (window.__songT < warm - 1e-6) step(Math.min(1 / cfg.fps, warm - window.__songT));
    window.__songT = Math.round(window.__songT / bar) * bar;
    return { styles: people.map((p) => `${p.h.preset}:${p.h.gestures.find((x) => x.name === 'dance')?.pose.style}`), keeper: !!keeper, songT: window.__songT };
  }, cfg);
  console.log(JSON.stringify(info));
  const only = cfg.only ? new Set(cfg.only) : null;
  for (let i = 0; i < cfg.frames; i++) {
    await pg.evaluate(() => window.__frame());
    if (!only || only.has(i)) await pg.screenshot({ path: `${outDir}/f${String(i).padStart(3, '0')}.png` });
    if (i % 8 === 0) console.log('frame', i);
  }
} finally {
  await browser.close();
  await server.close();
}
