// Block audit: boots the game headless with ?blockaudit (src/dev/blockTag.js), enters every place (the lane with
// Mikawa-ya, the park and the van; the ramen shop; room #102; flat #103; the annex; the four mall floors; the museum)
// and lists every visible piece built from a three.js primitive: standalone meshes whose geometry is a Box / Cylinder /
// Sphere / Cone / Torus / Capsule / Circle / Plane geometry, every box / plane / extra geometry merged by the static
// batchers (Town.js, src/room/build.js, src/growth/kit.js) and voxel props with no model. Each piece is classed as
// architecture (walls, floors, ceilings, roofs, road and ground, thin trim on them, glazing, printed planes: allowed) or
// not (a prop built from blocks: to be replaced with a real model). The garage (Garage.js, GarageDetail.js,
// garageDressing.js, garageArt.js) is skipped. Writes shots/audit/BLOCKS.txt (grouped by place and source line) and
// shots/audit/blocks.json.
//   node tools/block-audit.mjs [--places lane,ramen,...] [--all]   (--all also lists the allowed pieces; wrap it in
//   tools/slot.sh on a shared machine)
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const ALL = args.includes('--all');
let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = createRequire('/opt/node-tools/node_modules/')('playwright')); }
const root = resolve(import.meta.dirname, '..');
const server = await createServer({ root, configFile: resolve(root, 'vite.config.js'), server: { port: 0, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] }, fs: { strict: false } }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
// place -> setup (run in the page with game, dbg); the lane pass also covers Mikawa-ya, the park, the van, the museum
const SETUPS = {
  lane: 'dbg.museum?.(false); dbg.needs?.exit?.();',
  ramen: 'dbg.needs.enter("ramen");',
  room: 'dbg.growth.go("room");',
  home103: 'dbg.growth.own("home103", "hobby"); dbg.growth.go("home103");',
  annex: 'dbg.growth.own("home103", "hobby", "annex"); dbg.growth.annex(5); dbg.growth.go("annex");',
  mall1: 'dbg.growth.own("home103", "hobby", "annex", "mall"); dbg.growth.go("mall1");',
  mall2: 'dbg.growth.own("home103", "hobby", "annex", "mall", "mall2"); dbg.growth.go("mall2");',
  mall3: 'dbg.growth.own("home103", "hobby", "annex", "mall", "mall2", "mall3"); dbg.growth.go("mall3");',
  mall4: 'dbg.growth.own("home103", "hobby", "annex", "mall", "mall2", "mall3", "mall4"); dbg.growth.go("mall4");',
};
const want = flag('places', Object.keys(SETUPS).join(',')).split(',');
const items = [];
const errors = [];
try {
  const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('gacha-garage-save-v2', JSON.stringify({ settings: { quality: 'low' } })); } catch { /* */ } });
  const pg = await ctx.newPage();
  pg.on('pageerror', (e) => errors.push(String(e.message || e)));
  await pg.goto(`http://127.0.0.1:${server.httpServer.address().port}/index.html?autotest&q=low&blockaudit`, { waitUntil: 'load', timeout: 240000 });
  await pg.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
  for (const name of want) {
    const setup = SETUPS[name];
    const res = await pg.evaluate(({ setup, name }) => {
      const g = window.__game, dbg = window.dbg, THREE = dbg.THREE;
      try { dbg.growth?.level?.(40); new Function('game', 'dbg', setup)(g, dbg); } catch (e) { return { err: String(e) }; }
      for (let k = 0; k < 3 && g.cutscene?.active; k++) g.cutscene.finish();
      dbg.step?.(1.0);
      for (let i = 0; i < 10; i++) g.update(1 / 30);
      const scene = g.scene;
      scene.updateMatrixWorld(true);
      const places = g.places, here = places.where;
      if ((name === 'lane') !== !here) return { err: 'not in ' + name + ' (where: ' + here + ')' };
      const placeGroups = new Map(Object.values(places.list).filter((d) => d.group).map((d) => [d.group, d.id]));
      const GARAGE_SRC = /src\/world\/Garage\.js|GarageDetail\.js|garageDressing\.js|garageArt\.js/;
      const PRIM = /^(Box|Cylinder|Sphere|Cone|Torus|TorusKnot|Capsule|Circle|Plane|Ring|Octahedron|Icosahedron|Dodecahedron|Tetrahedron)Geometry$/;
      // where an object lives: the place group it's under, or a named area on the lane
      const area = (o) => {
        for (let p = o; p; p = p.parent) {
          if (placeGroups.has(p)) return placeGroups.get(p);
          if (p === g.museum?.group) return 'museum';
          if (p === g.garage?.group || /^garage/.test(p.name || '')) return 'garage';
          if (p.name === 'mikawaya' || /^mikawaya:/.test(p.name || '')) return 'mikawaya';
          if (p.name === 'van') return 'van';
        }
        return 'lane';
      };
      const srcOf = (o) => { for (let p = o; p; p = p.parent) if (p.userData?.src?.length) return p.userData.src; return []; };
      const isAsset = (o) => { for (let p = o; p; p = p.parent) if (p.userData?.asset || p.geometry?.userData?.asset) return true; return false; };
      const isPerson = (o) => { for (let p = o; p; p = p.parent) if (p.isSkinnedMesh || p.isBone || p.userData?.human || /^(human|person|npc|ped)/i.test(p.name || '')) return true; return false; };
      const matOf = (o) => (Array.isArray(o.material) ? o.material.find((m) => m.visible !== false) : o.material);
      const desc = (m) => {
        if (!m) return '?';
        const map = m.map;
        const k = m.userData?.key || m.name || map?.userData?.key || map?.name || (map?.image?.src ? map.image.src.split('/').pop().split('?')[0] : map ? 'canvas' : '');
        return (k || 'flat #' + m.color?.getHexString?.()) + (m.vertexColors ? ' (tinted)' : '');
      };
      const ARCH_MAT = /plaster|shikkui|juraku|wall|floor|ceil|roof|tile|asphalt|concrete|ground|grass|tatami|doma|siding|brick|block|mortar|gravel|paving|kenchi|road|gutter|curb|kerb|tunnel|girder|ballast|marble|carpet|oya|prefab|slab|stucco|terrazzo|linoleum|lino|boardWall|planks|shutter|corrugated|metalRoof|stone|soil|dirt|sand|moss|hedge|sky|water/i;
      // architecture or not, from the world-space size (and the material): a reason string, or null for a prop
      const archWhy = (s, kind, mdesc, m) => {
        const [x, y, z] = s, hmin = Math.min(x, z), hmax = Math.max(x, z), all = [x, y, z].sort((a, b) => a - b);
        if (/Plane|Circle/.test(kind)) {
          if (m?.transparent && m.opacity < 0.6) return 'glazing / shadow decal';
          if (m?.map || /canvas|stain|print|poster|sign|label|decal/i.test(mdesc)) return 'printed plane (sign face, poster, label, screen, stain decal)';
          if (Math.max(x, y, z) >= 1.5) return 'floor / wall / ceiling plane';
        }
        if (all[0] <= 0.008) return 'flat paint / tape / paper (no thickness)';
        if (m?.transparent && m.opacity < 0.6 && all[0] < 0.03) return 'glazing';
        if (y <= 0.35 && hmin >= 1.2) return 'floor / ceiling / roof slab';
        if (y >= 1.2 && hmin <= 0.35 && hmax >= 1.0) return 'wall';
        if (ARCH_MAT.test(mdesc) && all[2] >= 0.9) return 'architecture surface (' + mdesc.split(' ')[0] + ')';
        if (all[1] <= 0.2 && hmax >= 1.5 && y <= 0.2) return 'trim strip (kamoi, skirting, rail)';
        if (all[1] <= 0.25 && y >= 2.2 && hmax <= 0.3) return 'post / pillar';
        return null;
      };
      const out = [];
      const _b = new THREE.Box3(), _v = new THREE.Vector3();
      const push = (o, kind, box, mdesc, m, src) => {
        const a = area(o);
        if (a === 'garage' || (src[0] && GARAGE_SRC.test(src[0]))) return;
        if (name !== 'lane' && a !== name) return; // (each place's own pass)
        if (name === 'lane' && placeGroups.has(o)) return;
        const s = box.getSize(_v).toArray().map((v) => +v.toFixed(3));
        if (Math.max(...s) < 0.004) return;
        const c = box.getCenter(new THREE.Vector3()).toArray().map((v) => +v.toFixed(2));
        out.push({ place: a, kind, src: src.join(' < ') || '(' + (o.name || o.parent?.name || 'unnamed') + ')', at: c, size: s, mat: mdesc, arch: archWhy(s, kind, mdesc, m), person: isPerson(o) });
      };
      const visibleChain = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
      const roots = name === 'lane' ? [scene] : [places.list[name]?.group].filter(Boolean);
      for (const r of roots) r.traverseVisible((o) => {
        if (!(o.isMesh || o.isInstancedMesh) || o.isSkinnedMesh || !o.geometry || !visibleChain(o)) return;
        const m = matOf(o);
        if (!m || m.visible === false || m.colorWrite === false || (m.transparent && m.opacity <= 0.02)) return;
        const geo = o.geometry;
        // merged batcher geometry: one record per box / plane
        if (o.userData.blocks) {
          for (const b of o.userData.blocks) {
            if (b.kind.startsWith('model:')) continue;
            _b.set(new THREE.Vector3(...b.min), new THREE.Vector3(...b.max)).applyMatrix4(o.matrixWorld);
            push(o, 'batch ' + b.kind.replace('Geometry', ''), _b.clone(), b.mat, m, b.src);
          }
          return;
        }
        if (isAsset(o)) return;
        if (PRIM.test(geo.type)) {
          if (!geo.boundingBox) geo.computeBoundingBox();
          const n = o.isInstancedMesh ? o.count : 1;
          for (let i = 0; i < n; i++) {
            _b.copy(geo.boundingBox);
            if (o.isInstancedMesh) { const mm = new THREE.Matrix4(); o.getMatrixAt(i, mm); _b.applyMatrix4(mm); }
            _b.applyMatrix4(o.matrixWorld);
            push(o, geo.type.replace('Geometry', ''), _b.clone(), desc(m), m, srcOf(o));
          }
          return;
        }
        // a prop drawn with its voxel build (no model)
        if (geo.userData?.voxelSize && !geo.userData.asset) {
          _b.setFromObject(o);
          push(o, 'voxel prop ' + (o.userData.propId || o.name || ''), _b.clone(), 'voxel', m, srcOf(o));
        }
      });
      return { where: here, out };
    }, { setup, name });
    if (res.err) { errors.push(`${name}: ${res.err}`); continue; }
    items.push(...res.out.map((r) => ({ ...r, pass: name })));
  }
} finally {
  await browser.close();
  await server.close();
}
// ---------------------------------------------------------------- source markers
// A call site whose source line carries a comment `arch: <reason>`, or that sits between `// arch-begin: <reason>` and
// `// arch-end`, is architecture by its author's word (a window frame, a balcony rail, the railway track...): the reason
// is listed with it. Every other piece is judged by its size and material (archWhy above).
const srcCache = new Map();
const srcLines = (f) => { if (!srcCache.has(f)) { try { srcCache.set(f, readFileSync(resolve(root, f), 'utf8').split('\n')); } catch { srcCache.set(f, []); } } return srcCache.get(f); };
const marked = (frame) => {
  const [f, n] = frame.split(':'), L = srcLines(f), i = +n - 1;
  const own = (L[i] || '').match(/\barch: ([^*]+?)\s*(\*\/|$)/);
  if (own) return own[1];
  for (let k = i; k >= 0; k--) {
    if (/\/\/ arch-end\b/.test(L[k])) return null;
    const b = L[k].match(/\/\/ arch-begin: (.+)$/);
    if (b) return b[1].trim();
  }
  return null;
};

// ---------------------------------------------------------------- the report
// the call site: the first frame, unless that line is a small helper called from 3+ places (then its caller)
const callers = new Map();
for (const r of items) { const f = r.src.split(' < '); if (f[1]) { if (!callers.has(f[0])) callers.set(f[0], new Set()); callers.get(f[0]).add(f[1]); } }
const site = (r) => { const f = r.src.split(' < '); return (callers.get(f[0])?.size >= 3 && f[1] ? (callers.get(f[1])?.size >= 3 && f[2] ? f[2] : f[1]) : f[0]); };
for (const r of items) r.site = site(r);
// (only the piece's own line and its call site count: a prop helper called from an architecture range stays a prop)
for (const r of items) {
  if (r.arch) continue;
  const f = r.src.split(' < ');
  // a one-line pass-through wrapper (const box = (...) => Bi.box(...), add(obj) { parent.add(obj); ... }) hands the mark to its caller
  const own = f[1] && /=>\s*\w+\.(box|plane|quad|geo|add)\(|^\s*\w+\([^)]*\)\s*\{\s*\w+\.add\(/.test(srcLines(f[0].split(':')[0])[+f[0].split(':')[1] - 1] || '') ? f[1] : f[0];
  const why = own && marked(own);
  if (why) r.arch = 'marked: ' + why;
}
const props = items.filter((r) => !r.arch), arch = items.filter((r) => r.arch);
const group = (list) => {
  const m = new Map();
  for (const r of list) {
    const k = r.place + '|' + r.site + '|' + r.kind;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en', { numeric: true }));
};
const fmt = (r) => `(${r.at.join(', ')}) ${r.size.join('x')}`;
const lines = [];
lines.push(`Block audit ${new Date().toISOString().slice(0, 16)}: ${props.length} non-architecture primitive pieces (${group(props).length} source lines), ${arch.length} allowed as architecture.`);
lines.push('Each line: source line (the call site; past small helpers)  kind  xN  material  e.g. (centre) size in metres.');
if (errors.length) lines.push('Errors: ' + errors.join(' | '));
const byPlace = new Map();
for (const [k, list] of group(props)) { const p = k.split('|')[0]; if (!byPlace.has(p)) byPlace.set(p, []); byPlace.get(p).push(list); }
for (const [p, groups] of byPlace) {
  lines.push('', `== ${p}: ${groups.reduce((n, l) => n + l.length, 0)} pieces`);
  for (const l of groups) {
    const r = l[0];
    lines.push(`  ${r.site}  ${r.kind}  x${l.length}  ${r.mat}${r.person ? '  [on a person]' : ''}  e.g. ${l.slice(0, 2).map(fmt).join('; ')}`);
  }
}
lines.push('', `== allowed as architecture: ${arch.length} pieces`);
for (const [, l] of group(arch)) {
  const r = l[0];
  if (ALL) lines.push(`  ${r.place}  ${r.site}  ${r.kind}  x${l.length}  ${r.mat}  ${r.arch}  e.g. ${fmt(r)}`);
}
if (!ALL) {
  const why = new Map();
  for (const r of arch) { const k = r.arch.replace(/ \(.*\)$/, ''); why.set(k, (why.get(k) || 0) + 1); }
  for (const [k, n] of why) lines.push(`  ${k}: ${n}`);
  lines.push('  (--all lists them by source line)');
}
mkdirSync(resolve(root, 'shots/audit'), { recursive: true });
writeFileSync(resolve(root, 'shots/audit/BLOCKS.txt'), lines.join('\n') + '\n');
writeFileSync(resolve(root, 'shots/audit/blocks.json'), JSON.stringify(items));
console.log(lines.slice(0, 3).join('\n'));
for (const [p, groups] of byPlace) console.log(`  ${p}: ${groups.reduce((n, l) => n + l.length, 0)} pieces in ${groups.length} source lines`);
if (errors.length) { console.log('errors:', errors.join('\n')); }
