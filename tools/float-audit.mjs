// Floating-prop audit: boots the game headless, enters the places given (default: the lane, the ramen shop, Mikawa-ya,
// room #102, the garage), and lists every placed prop (userData.propId / userData.asset roots) that neither rests on
// something below it nor touches a wall or ceiling (a gap of more than GAP metres under its lowest point and no contact
// within GAP on any side or above). Writes shots/audit/FLOAT.txt.
//   node tools/float-audit.mjs [--gap 0.03]   (wrap it in tools/slot.sh on a shared machine)
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const GAP = Number(args[args.indexOf('--gap') + 1]) || 0.03;
let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = createRequire('/opt/node-tools/node_modules/')('playwright')); }
const root = resolve(import.meta.dirname, '..');
const server = await createServer({ root, configFile: resolve(root, 'vite.config.js'), server: { port: 0, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] }, fs: { strict: false } }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const SETUPS = {
  lane: '',
  ramen: 'dbg.needs.enter("ramen");',
  room: 'dbg.growth.go("room");',
  garage: 'dbg.shopOpen?.(); game.gachaDebug?.setup?.();',
};
const out = [];
try {
  const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('gacha-garage-save-v2', JSON.stringify({ settings: { quality: 'low' } })); } catch { /* */ } });
  const pg = await ctx.newPage();
  await pg.goto(`http://127.0.0.1:${server.httpServer.address().port}/index.html?autotest&q=low`, { waitUntil: 'load', timeout: 240000 });
  await pg.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
  const seen = new Set();
  for (const [name, setup] of Object.entries(SETUPS)) {
    const res = await pg.evaluate(({ setup, GAP, name }) => {
      const g = window.__game, dbg = window.dbg;
      try { new Function('game', 'dbg', setup)(g, dbg); } catch (e) { return { err: String(e) }; }
      for (let k = 0; k < 3 && g.cutscene?.active; k++) g.cutscene.finish();
      dbg.step?.(1.5);
      for (let i = 0; i < 20; i++) g.update(1 / 30);
      const THREE = dbg.THREE;
      const scene = g.scene;
      scene.updateMatrixWorld(true);
      const tagged = (o) => o.userData && (o.userData.propId || o.userData.asset);
      const roots = [];
      scene.traverseVisible((o) => {
        if (!tagged(o)) return;
        for (let p = o.parent; p; p = p.parent) if (tagged(p)) return;
        roots.push(o);
      });
      const meshes = [];
      scene.traverseVisible((o) => { if (o.isMesh && !o.isSkinnedMesh && o.geometry) { const b = new THREE.Box3().setFromObject(o); if (!b.isEmpty()) meshes.push({ o, b }); } });
      const own = new Set();
      const ray = new THREE.Raycaster();
      const dirs = [[0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]].map((d) => new THREE.Vector3(...d));
      const res = [];
      for (const r of roots) {
        const b = new THREE.Box3().setFromObject(r);
        if (b.isEmpty()) continue;
        const sz = b.getSize(new THREE.Vector3());
        if (Math.max(sz.x, sz.y, sz.z) > 6 || Math.max(sz.x, sz.y, sz.z) < 0.02) continue;
        own.clear(); r.traverse((o) => own.add(o));
        const near = b.clone().expandByScalar(0.12);
        const cand = meshes.filter((m) => !own.has(m.o) && m.b.intersectsBox(near)).map((m) => m.o);
        if (!cand.length) { res.push({ id: r.userData.propId || r.userData.asset, p: b.getCenter(new THREE.Vector3()).toArray().map((v) => +v.toFixed(2)), gap: 'nothing near' }); continue; }
        const c = b.getCenter(new THREE.Vector3());
        // under: five points on the bottom face
        const under = [[0, 0], [0.35, 0.35], [-0.35, 0.35], [0.35, -0.35], [-0.35, -0.35]].map(([fx, fz]) => new THREE.Vector3(c.x + fx * sz.x, b.min.y + 0.01, c.z + fz * sz.z));
        let best = Infinity;
        for (const o of under) { ray.set(o, dirs[0]); ray.far = 1; const h = ray.intersectObjects(cand, false)[0]; if (h) best = Math.min(best, h.distance - 0.01); }
        if (best <= GAP) continue;
        // or touching a wall / ceiling (wall clocks, posters, hanging lamps)
        let touch = false;
        for (const d of dirs.slice(1)) {
          const half = Math.abs(d.x) * sz.x / 2 + Math.abs(d.y) * sz.y / 2 + Math.abs(d.z) * sz.z / 2;
          ray.set(c, d); ray.far = half + GAP + 0.02;
          if (ray.intersectObjects(cand, false)[0]) { touch = true; break; }
        }
        if (touch) continue;
        // the surface under it (for the fix): any mesh whose footprint holds the centre, up to 3 m down
        const col = meshes.filter((m) => !own.has(m.o) && m.b.min.x <= c.x && m.b.max.x >= c.x && m.b.min.z <= c.z && m.b.max.z >= c.z && m.b.min.y < b.min.y).map((m) => m.o);
        ray.set(new THREE.Vector3(c.x, b.min.y + 0.01, c.z), dirs[0]); ray.far = 3;
        const hit = ray.intersectObjects(col, false)[0];
        res.push({ id: r.userData.propId || r.userData.asset, p: c.toArray().map((v) => +v.toFixed(2)), gap: best === Infinity ? '>1 m' : +best.toFixed(3), minY: +b.min.y.toFixed(3), below: hit ? +hit.point.y.toFixed(3) + ' (' + (hit.object.userData.propId || hit.object.parent?.userData?.propId || hit.object.parent?.userData?.asset || hit.object.name || '?') + ')' : 'none' });
      }
      return { roots: roots.length, res };
    }, { setup, GAP, name });
    if (res.err) { out.push(`${name}: setup failed: ${res.err}`); continue; }
    const fresh = res.res.filter((f) => { const k = f.id + f.p.join(','); if (seen.has(k)) return false; seen.add(k); return true; });
    out.push(`== ${name}: ${res.roots} props, ${fresh.length} floating`);
    for (const f of fresh) out.push(`  ${f.id}  at ${f.p.join(', ')}  gap ${f.gap}  bottom ${f.minY}  surface ${f.below}`);
  }
} finally {
  await browser.close();
  await server.close();
}
mkdirSync(resolve(root, 'shots/audit'), { recursive: true });
writeFileSync(resolve(root, 'shots/audit/FLOAT.txt'), out.join('\n') + '\n');
console.log(out.join('\n'));
