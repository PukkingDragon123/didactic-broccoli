// Garage look check: boots the game once, opens the shop with machines (dbg.shopOpen + gachaDebug.setup), and snaps
// the garage from free camera positions, then runs the mess audit (src/world/garageMess.js: overlaps and anything
// floating among the placed models). Wrap it in tools/slot.sh on a shared machine.
//   node tools/garage-views.mjs [--q medium] [--hour 13] [--out shots/garage] [--size 960x540] [--views name,name]
//   -> <out>/<view>.png, <out>/audit.json
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const Q = flag('q', 'medium'), HOUR = +flag('hour', 13), OUT = resolve(import.meta.dirname, '..', flag('out', 'shots/garage'));
const [W, H] = flag('size', '960x540').split('x').map(Number);
// name: [eye x, y, z, look x, y, z, fov]
const VIEWS = {
  front: [0.5, 1.62, 4.6, -0.2, 1.1, -2.0, 70],       // in under the shutter, looking in
  back: [0.4, 1.62, -3.6, 0.0, 1.1, 3.0, 70],         // from the back door, looking out to the shutter
  left: [2.8, 1.6, 0.4, -3.0, 1.2, -0.6, 72],         // across to the machine row
  right: [-1.9, 1.6, -0.6, 3.5, 1.2, 0.6, 72],        // across to the right wall and the PC corner
  racks: [-1.0, 1.5, -2.6, -2.6, 1.0, -4.8, 62],      // close: the racks and the back-left corner
  counter: [0.25, 1.45, 1.55, 0.35, 0.7, -0.1, 60],   // close: the cluttered counter
  shutter: [0.6, 1.5, 2.4, -1.6, 0.4, 4.8, 64],       // close: the refill cartons by the shutter
  frontright: [0.9, 1.5, 2.6, 3.4, 0.7, 4.6, 64],     // close: the front-right corner, ladder and shelf unit
  ceiling: [0.0, 1.5, 3.8, 0.0, 3.1, -1.5, 70],       // the ceiling: joists, beams, wiring, fixtures
  pc: [1.6, 1.55, -2.4, 3.8, 1.0, -4.2, 64],          // the PC corner, the back right
  bench: [-1.6, 1.5, 2.2, -3.8, 0.9, 4.2, 64],        // the workbench corner
};
const list = flag('views', Object.keys(VIEWS).join(',')).split(',').filter(Boolean);
// --probe x,y,z;x,y,z: list what stands at those points (names, prop ids)
const RAYS = flag('rays', '').split(';').filter(Boolean).map((s) => s.split(',').map(Number));
const PROBE = flag('probe', '').split(';').filter(Boolean).map((s) => s.split(',').map(Number));

let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = createRequire('/opt/node-tools/node_modules/')('playwright')); }
const root = resolve(import.meta.dirname, '..');
const server = await createServer({ root, configFile: resolve(root, 'vite.config.js'), server: { port: 0, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] }, fs: { strict: false } }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
mkdirSync(OUT, { recursive: true });
try {
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  await ctx.addInitScript((qq) => { try { localStorage.setItem('gacha-garage-save-v2', JSON.stringify({ settings: { quality: qq } })); } catch { /* */ } }, Q);
  const pg = await ctx.newPage();
  pg.on('console', (m) => { const t = m.text(); if (m.type() === 'error' && !/GPU stall|willReadFrequently/.test(t)) errors.push(`[${m.type()}] ${t}`); });
  pg.on('console', (m) => { if (m.text().startsWith('RAYS ')) console.log(m.text()); });
  pg.on('pageerror', (e) => errors.push(`[pageerror] ${e.stack || e.message}`));
  await pg.goto(`http://127.0.0.1:${server.httpServer.address().port}/index.html?autotest&q=${Q}`, { waitUntil: 'load', timeout: 240000 });
  await pg.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
  await pg.evaluate((hour) => {
    const g = window.__game, dbg = window.dbg;
    try { if (g.places?.where) g.places.setWhere(null); } catch { /* */ }
    dbg.time(hour); dbg.shopOpen?.(); g.gachaDebug?.setup?.(); dbg.view(0.6, 3.4, 0.35, -0.12);
    for (let k = 0; k < 3 && g.cutscene?.active; k++) { g.cutscene.finish(); dbg.step(0.2); }
    dbg.time(hour); dbg.step(1.5);
    for (let i = 0; i < 2; i++) { g.update(1 / 30); g.renderer.render(1 / 30, g.time); }
  }, HOUR);
  for (let k = 0; k < 400; k++) {
    const more = await pg.evaluate(() => { const R = window.__game.renderer, gl = R.renderer.getContext(); const m = R.gi?.finish?.(6); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); return !!m; });
    if (!more) break;
  }
  await pg.evaluate((r) => { window.__rays = r; }, RAYS);
  for (const name of list) {
    const v = VIEWS[name];
    if (!v) continue;
    const url = await pg.evaluate(async ([ex, ey, ez, lx, ly, lz, fov]) => {
      const g = window.__game, R = g.renderer, cam = g.camera;
      cam.traverse((o) => { if (o !== cam) o.visible = false; }); // (no hands or held things in the pictures)
      g.player.pos.set(ex, 0, ez);
      for (let i = 0; i < 5; i++) {
        g.update(1 / 30);
        cam.position.set(ex, ey, ez); cam.fov = fov; cam.updateProjectionMatrix(); cam.lookAt(lx, ly, lz); cam.updateMatrixWorld();
        g.garage?.town?.cull?.update(cam, 1);
        R.render(1 / 30, g.time);
      }
      const T = window.dbg.THREE, rc = new T.Raycaster(), hits = [];
      for (const [px, py] of window.__rays || []) {
        rc.setFromCamera(new T.Vector2(px * 2 - 1, 1 - py * 2), cam);
        const vis = (o) => { for (; o; o = o.parent) if (!o.visible) return false; return true; }; const all = rc.intersectObjects(g.scene.children, true).filter((x) => vis(x.object)); const h = all[0]; if (h) { const pp = []; for (let o = h.object; o; o = o.parent) pp.push(o.name || o.type); h.object.name += " <" + pp.join("<") + ">"; }
        if (h) hits.push({ px, py, name: h.object.name, inst: h.instanceId, d: +h.distance.toFixed(2), p: h.point.toArray().map((q) => +q.toFixed(2)) });
      }
      if (hits.length) console.log('RAYS ' + JSON.stringify(hits));
      return R.renderer.domElement.toDataURL('image/png');
    }, v);
    writeFileSync(resolve(OUT, name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
    console.log('shot', name);
  }
  if (PROBE.length) console.log(JSON.stringify(await pg.evaluate((pts) => {
    const g = window.__game, T = window.dbg.THREE, out = [];
    g.scene.updateMatrixWorld(true);
    for (const p of pts) {
      const v = new T.Vector3(...p), hits = [];
      g.scene.traverse((o) => {
        if (!o.isMesh || o.isInstancedMesh) return;
        const b = new T.Box3().setFromObject(o);
        if (b.containsPoint(v)) { let n = o.name || o.userData.propId || ''; for (let q = o.parent; q && !n; q = q.parent) n = q.name || q.userData?.propId || ''; hits.push(n + ' [' + b.min.toArray().map((x) => x.toFixed(2)) + ' / ' + b.max.toArray().map((x) => x.toFixed(2)) + ']'); }
      });
      for (const q of g.garage?.mess?.placed || []) if (q.box.containsPoint(v)) hits.unshift(`placed ${q.id} @${q.x.toFixed(2)},${q.y.toFixed(2)},${q.z.toFixed(2)} ${JSON.stringify(q.o)}`);
      out.push({ p, hits: hits.slice(0, 12) });
    }
    return out;
  }, PROBE), null, 1));
  const audit = await pg.evaluate(() => {
    const g = window.__game, m = g.garage?.mess;
    const machines = (g.machines || []).map((x) => { const b = new window.dbg.THREE.Box3().setFromObject(x.group || x.root || x.mesh || x); return { min: b.min.toArray(), max: b.max.toArray() }; });
    const tris = [];
    g.garage.group.traverse((o) => { if (o.isInstancedMesh || o.isMesh) { const gg = o.geometry, n = (gg.index ? gg.index.count : gg.attributes.position.count) / 3; tris.push([o.name || o.userData.propId || o.type, Math.round(n * (o.isInstancedMesh ? o.count : 1)), o.isInstancedMesh ? o.count : 1, o.castShadow]); } });
    tris.sort((a, b) => b[1] - a[1]);
    const total = tris.reduce((a, b) => a + b[1], 0);
    return m ? { ...m.audit(), machines, total, tris: tris.slice(0, 40) } : { err: 'no mess' };
  });
  writeFileSync(resolve(OUT, 'audit.json'), JSON.stringify(audit, null, 1));
  console.log('audit', audit.placed, 'placed,', audit.overlaps?.length, 'overlaps,', audit.floating?.length, 'floating');
} catch (e) { console.error('ERROR', e.stack || e.message); }
finally {
  if (errors.length) console.log('console errors:\n' + errors.slice(0, 30).join('\n'));
  else console.log('no console errors');
  await browser.close();
  await server.close();
}
