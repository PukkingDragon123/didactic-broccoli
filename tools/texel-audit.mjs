// Texel-density audit: boots the game headless, visits the lane, the garage and every interior (so lazy assets load
// and the off-map rooms get built), then measures how many texture pixels land on each metre of every textured
// surface (texture px / m, from each triangle's UV area x texture size x repeat vs its world area) and the GPU memory
// of all the textures in use. Surfaces the player can walk up to (within 6 m of a walkable spot and below 3.5 m) are
// "close", the rest "far"; each is checked against the standard in docs/ART.md (Texel density).
// Usage: tools/slot.sh node tools/texel-audit.mjs [out=shots/textures] [close=256] [far=128] [scope=all|lane|rooms|mall]
// Writes <out>/lowres_list.txt (everything under the standard, worst first), <out>/texel_all.txt and texel.json.
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [outDir = 'shots/textures', CLOSE = '256', FAR = '128', SCOPE = 'all'] = process.argv.slice(2);
// SCOPE (to keep a headless run small): all | lane (no interiors) | rooms (room, ramen, flat 103, annex) | mall
let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = createRequire('/opt/node-tools/node_modules/')('playwright')); }
const root = resolve(import.meta.dirname, '..');
const server = await createServer({ root, configFile: resolve(root, 'vite.config.js'), server: { port: 0, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] } }, logLevel: 'error' });
await server.listen();
const url = `http://127.0.0.1:${server.httpServer.address().port}/index.html?autotest&q=high`;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } });
// remember where every canvas was painted (the recipe / function that drew it) so procedural textures get a name
await ctx.addInitScript(() => {
  const gc = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (...a) {
    if (!this.__who) {
      const st = (new Error().stack || '').split('\n').slice(2);
      const fr = [];
      for (const l of st) {
        const m = /at (?:(?:new )?([\w$.<>]+) )?\(?https?:\/\/[^/]+\/(src\/[^?:]+)(?:\?[^:]*)?:(\d+)/.exec(l);
        if (!m || /gfx\/pix\.js|node_modules/.test(m[2])) continue;
        fr.push((m[1] ? m[1].replace(/^Object\./, '') + '@' : '') + m[2].replace(/^src\//, '') + ':' + m[3]);
        if (fr.length >= 2) break;
      }
      this.__who = fr.join(' < ') || 'canvas';
    }
    return gc.apply(this, a);
  };
});
const pg = await ctx.newPage();
const errors = [];
pg.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
pg.on('pageerror', (e) => errors.push('[pageerror] ' + (e.message || e).toString().slice(0, 200)));

const P = Math.PI;
const VIEWS = [[0, 2, 0], [0, -2, P], [0, 13, 0], [-2, 10.5, -P / 2], [6, 9.5, P / 2], [-12, 12.5, P], [13, 13, P], [-8.5, 14.5, P],
  [-28, 8, P / 2], [20, 10, -P / 2], [-20, 10, P / 2], [0, -20, 0], [0, 30, 0], [30, -10, 0], [-30, -10, 0], [60, -30, 0]];

function measure([CLOSE, FAR, SCOPE]) {
  const g = window.__game, scene = g.scene, THREE = g.camera.constructor.__three || null;
  scene.updateMatrixWorld(true);
  // ---- walkable spots (xz) and the interiors' groups
  const walk = [];
  const addW = (x, z) => { if (Number.isFinite(x) && Number.isFinite(z)) walk.push([x, z]); };
  for (let x = -6; x <= 6; x += 2) for (let z = -6; z <= 6; z += 2) addW(x, z); // the garage
  for (const l of g.garage?.town?.lanes || []) for (let x = l.x0; x <= l.x1; x += 2) addW(x, l.z);
  const t = g.garage?.town;
  for (const s of Object.values(t?.spots || {})) addW(s.pos?.x, s.pos?.z);
  for (const p of Object.values(t?.paths || {})) for (const v of p) addW(v.x, v.z);
  for (const d of t?.doors || []) { addW(d.pos?.x, d.pos?.z); addW(d.gate?.x, d.gate?.z); }
  for (const v of window.__views || []) addW(v[0], v[1]);
  const places = g.places?.list || {};
  const placeGroups = new Set(Object.values(places).map((d) => d.group).filter(Boolean));
  const inPlace = (o) => { for (let p = o; p; p = p.parent) if (placeGroups.has(p)) return p; return null; };
  const near = (x, z) => { let b = 1e9; for (const [a, c] of walk) { const d = (a - x) ** 2 + (c - z) ** 2; if (d < b) b = d; } return Math.sqrt(b); };
  const hidden = (o, pl) => { for (let p = o; p && p !== pl; p = p.parent) if (!p.visible) return true; return false; };
  const label = (o) => {
    const chain = []; let asset = null;
    for (let p = o; p && p !== scene; p = p.parent) {
      if (!asset && p.userData?.asset) asset = p.userData.asset;
      if (p.name && !/^(Group|Scene|mesh|Object3D)$/i.test(p.name)) chain.unshift(p.name);
    }
    const top = chain.slice(0, 2).join(' > ') || '(unnamed)';
    return asset ? 'asset:' + asset : top;
  };
  const texName = (tx) => {
    const im = tx.image;
    if (!im) return 'none';
    if (im.__who) return im.__who;
    if (im.src) return im.src.replace(/^https?:\/\/[^/]+\//, '').replace(/^blob:.*/, 'blob');
    if (tx.name) return 'tex:' + tx.name;
    return (im.constructor?.name || 'image');
  };
  const texBytes = (tx) => {
    const im = tx.image; if (!im) return 0;
    const w = im.width || im.videoWidth || 0, h = im.height || im.videoHeight || 0;
    const mips = tx.generateMipmaps !== false && tx.minFilter !== 1003 && tx.minFilter !== 1006 ? 4 / 3 : 1;
    return w * h * 4 * mips;
  };
  const MAPS = ['map', 'bumpMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'alphaMap', 'aoMap', 'lightMap', 'displacementMap', 'specularMap', 'envMap'];
  const texSeen = new Map(); // image -> { bytes, name, users }
  const groups = new Map();
  const black = [];
  const a = new Float32Array(9), m4 = new (g.camera.matrixWorld.constructor)(), im4 = new (g.camera.matrixWorld.constructor)();
  const v = [0, 0, 0].map(() => g.camera.position.clone());
  scene.traverse((o) => {
    if (!(o.isMesh || o.isSkinnedMesh || o.isInstancedMesh) || !o.geometry?.attributes?.position) return;
    const pl = inPlace(o);
    if (pl ? hidden(o, pl) : hidden(o, null)) return; // interiors are measured even while you're not in them
    if (SCOPE === 'lane' && pl) return;
    if (SCOPE === 'rooms' && !(pl && !/mall/.test(pl.name || ''))) return;
    if (SCOPE === 'mall' && !(pl && /mall/.test(pl.name || ''))) return;
    const geo = o.geometry, pos = geo.attributes.position, idx = geo.index;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const groupsG = geo.groups?.length ? geo.groups : [{ start: 0, count: idx ? idx.count : pos.count, materialIndex: 0 }];
    for (const mat of mats) {
      if (!mat) continue;
      for (const k of MAPS) { const tx = mat[k]; if (tx?.isTexture && tx.image && !tx.isCubeTexture && !tx.isRenderTargetTexture) { const key = tx.image; let e = texSeen.get(key); if (!e) texSeen.set(key, e = { bytes: texBytes(tx), name: texName(tx), w: tx.image.width, h: tx.image.height, users: new Set() }); e.users.add(label(o)); } }
    }
    for (const mat of mats) { // renders black: vertex colours on with no colour attribute, or a black unlit-looking material
      if (!mat || !mat.visible || mat.colorWrite === false) continue;
      const why = mat.vertexColors && !geo.attributes.color && !o.isInstancedMesh ? 'vertexColors without a colour attribute'
        : (mat.color && mat.color.r + mat.color.g + mat.color.b < 0.01 && !mat.map && !(mat.emissive && mat.emissive.r + mat.emissive.g + mat.emissive.b > 0.01) && !mat.transparent) ? 'black material, no map' : null;
      if (why) { const c = new (g.camera.position.constructor)(); o.getWorldPosition(c); black.push(`${why}: ${pl?.name ? '[' + pl.name + '] ' : ''}${label(o)} ${mat.name || mat.type} ${geo.type} ${o.name || ''} at ${[c.x, c.y, c.z].map((v) => v.toFixed(1)).join(',')} parent ${o.parent?.name || o.parent?.type}`); }
    }
    const nInst = o.isInstancedMesh ? Math.min(o.count, 6) : 1;
    for (const gr of groupsG) {
      const mat = mats[gr.materialIndex ?? 0];
      if (!mat || !mat.visible || mat.colorWrite === false || (mat.transparent && mat.opacity < 0.3)) continue;
      const tx = mat.map;
      if (!tx?.image || !(tx.image.width > 0)) continue;
      const uvA = geo.attributes[tx.channel ? 'uv' + tx.channel : 'uv'] || geo.attributes.uv;
      const key0 = texName(tx);
      if (!uvA) { const k = key0 + ' || world-projected || ' + label(o); if (!groups.has(k)) groups.set(k, { tex: key0, who: label(o), px: [tx.image.width, tx.image.height], close: [], far: [], proj: true, rep: [tx.repeat.x, tx.repeat.y] }); continue; }
      const W = tx.image.width, H = tx.image.height, rep = Math.abs(tx.repeat.x * tx.repeat.y) || 1;
      const bd = !!(mat.userData?.backdrop || mat.userData?.lightmap); // scenery behind a window, far impostors, AO overlays: listed apart
      const k = key0 + ' || ' + label(o) + ' || ' + tx.repeat.x.toFixed(4) + (bd ? ' || bd' : '');
      let e = groups.get(k);
      if (!e) groups.set(k, e = { tex: key0, who: label(o), px: [W, H], rep: [+tx.repeat.x.toFixed(4), +tx.repeat.y.toFixed(4)], close: [], far: [], place: pl?.name || null, bd });
      const nTri = Math.floor(gr.count / 3), step = Math.max(1, Math.floor(nTri / 300));
      for (let ii = 0; ii < nInst; ii++) {
        m4.copy(o.matrixWorld);
        if (o.isInstancedMesh) { o.getMatrixAt(ii, im4); m4.multiply(im4); }
        for (let tIdx = 0; tIdx < nTri; tIdx += step) {
          const ids = [0, 1, 2].map((j) => { const q = gr.start + tIdx * 3 + j; return idx ? idx.getX(q) : q; });
          for (let j = 0; j < 3; j++) v[j].fromBufferAttribute(pos, ids[j]).applyMatrix4(m4);
          const e1 = v[1].clone().sub(v[0]), e2 = v[2].clone().sub(v[0]);
          const area = e1.cross(e2).length() / 2;
          if (!(area > 1e-7)) continue;
          const u0 = uvA.getX(ids[0]), w0 = uvA.getY(ids[0]), u1 = uvA.getX(ids[1]), w1 = uvA.getY(ids[1]), u2 = uvA.getX(ids[2]), w2 = uvA.getY(ids[2]);
          const uvArea = Math.abs((u1 - u0) * (w2 - w0) - (u2 - u0) * (w1 - w0)) / 2;
          if (!(uvArea > 0)) continue;
          const dens = Math.sqrt(uvArea * rep * W * H / area);
          const cx = (v[0].x + v[1].x + v[2].x) / 3, cy = (v[0].y + v[1].y + v[2].y) / 3, cz = (v[0].z + v[1].z + v[2].z) / 3;
          const dn = pl ? 0 : near(cx, cz);
          const isClose = pl ? cy - pl.position.y < 3.5 : cy < 3.5 && dn < 6;
          // far: what the screen can show from the nearest walkable spot (docs/ART.md): 768 / distance, 16..FAR px/m
          const dist = Math.hypot(dn, cy - (pl ? pl.position.y : 0) - 1.6);
          const req = isClose ? CLOSE : Math.max(16, Math.min(FAR, 768 / Math.max(dist, 0.1)));
          (isClose ? e.close : e.far).push([dens, area * (step / nInst), dens / req]);
        }
      }
    }
  });
  const stat = (arr) => {
    if (!arr.length) return null;
    const tot = arr.reduce((q, r) => q + r[1], 0);
    const at = (s, f, i) => { let c = 0; for (const r of s) { c += r[1]; if (c >= f * tot) return r[i]; } return s[s.length - 1][i]; };
    const sd = [...arr].sort((x, y) => x[0] - y[0]), sr = [...arr].sort((x, y) => x[2] - y[2]);
    return { p10: +at(sd, 0.1, 0).toFixed(1), p50: +at(sd, 0.5, 0).toFixed(1), ratio: +at(sr, 0.5, 2).toFixed(2), area: +tot.toFixed(2) };
  };
  const rows = [...groups.values()].map((e) => ({ tex: e.tex, who: e.who, px: e.px, rep: e.rep, place: e.place, proj: !!e.proj, bd: !!e.bd, close: stat(e.close), far: stat(e.far) }));
  let bytes = 0; const texList = [];
  for (const e of texSeen.values()) { bytes += e.bytes; texList.push({ name: e.name, w: e.w, h: e.h, mb: +(e.bytes / 1048576).toFixed(2), users: [...e.users].slice(0, 4) }); }
  texList.sort((x, y) => y.mb - x.mb);
  return { rows, mem: { textures: texSeen.size, mb: +(bytes / 1048576).toFixed(1) }, texList, walk: walk.length, black: [...new Set(black)] };
}

try {
  await pg.goto(url, { waitUntil: 'load', timeout: 180000 });
  await pg.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
  await pg.evaluate((V) => { window.__views = V; try { window.dbg.shopOpen(); window.dbg.time(11); } catch {} }, VIEWS);
  for (const [x, z, yaw] of VIEWS) {
    await pg.evaluate(([x, z, yaw]) => { window.dbg.view(x, z, yaw, 0.05); window.dbg.step(0.1); const g = window.__game; g.renderer.render(0, g.time); }, [x, z, yaw]);
    await pg.waitForTimeout(900);
  }
  // build and visit every interior (the flat next door, the annex, the mall floors, your room, the ramen shop)
  const ids = SCOPE === 'lane' ? [] : await pg.evaluate((SCOPE) => {
    const D = window.dbg.growth;
    try { if (SCOPE !== 'mall') { D.own('home103', 'hobby', 'annex'); D.annex(5); } if (SCOPE !== 'rooms') D.own('mall'); } catch (e) { console.log('growth', e.message); }
    try { if (SCOPE !== 'rooms') for (const n of [1, 2, 3, 4]) D.G.mall.ensureFloor(n); } catch { /* */ }
    return Object.keys(window.__game.places.list).filter((id) => (SCOPE === 'mall' ? /^mall/.test(id) : SCOPE === 'rooms' ? !/^mall/.test(id) : true));
  }, SCOPE);
  for (const id of ids) {
    await pg.evaluate((id) => { const g = window.__game; try { if (window.dbg.growth && /^(home103|annex|mall\d)$/.test(id)) window.dbg.growth.go(id); else { g.places.setWhere(id); const d = g.places.list[id]; g.player.pos.set(d.spawn.x, 0, d.spawn.z); } window.dbg.step(0.1); g.renderer.render(0, g.time); } catch (e) { console.log('visit', id, e.message); } }, id);
    await pg.waitForTimeout(1500);
  }
  await pg.evaluate(() => { window.__game.places.setWhere(null); window.dbg.view(0, 2, 0, 0); });
  await pg.waitForTimeout(3000);
  const res = await pg.evaluate(measure, [+CLOSE, +FAR, SCOPE]);
  mkdirSync(resolve(root, outDir), { recursive: true });
  writeFileSync(resolve(root, outDir, 'texel.json'), JSON.stringify(res, null, 1));
  // ---- report
  const C = +CLOSE, F = +FAR;
  const short = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
  const bad = [];
  for (const r of res.rows) {
    if (r.proj || r.bd) continue;
    if (r.close && r.close.area > 0.02 && r.close.ratio < 0.9) bad.push({ ...r, zone: 'close', d: r.close.p50, area: r.close.area, need: C, score: (C / r.close.p50) * Math.sqrt(r.close.area) });
    else if (r.far && r.far.area > 0.05 && r.far.ratio < 0.9) bad.push({ ...r, zone: 'far', d: r.far.p50, area: r.far.area, need: Math.round(r.far.p50 / Math.max(r.far.ratio, 1e-3)), score: Math.sqrt(r.far.area) * 0.35 / r.far.ratio });
  }
  bad.sort((x, y) => x.d / x.need - y.d / y.need || y.area - x.area);
  const fmt = (r) => `${String(r.d).padStart(6)} px/m  (need ${r.need})  ${r.zone.padEnd(5)} ${String(r.area).padStart(8)} m²  tex ${r.px.join('x').padEnd(9)} rep ${r.rep.join(',').padEnd(14)} ${short(r.place ? '[' + r.place + '] ' : '', 18)}${short(r.who, 46).padEnd(46)}  ${r.tex}`;
  const head = [`TEXEL DENSITY AUDIT ${new Date().toISOString()}  scope ${SCOPE}  standard: close >= ${C} px/m, far >= min(${F}, 768 / distance) px/m (docs/ART.md)`,
    `UNDER STANDARD: ${bad.length} surface groups (texture x mesh); close ${bad.filter((b) => b.zone === 'close').length}, far ${bad.filter((b) => b.zone === 'far').length}`,
    `GPU TEXTURE MEMORY (all textures on meshes, RGBA8 + mips): ${res.mem.mb} MB in ${res.mem.textures} textures`, ''];
  writeFileSync(resolve(root, outDir, 'lowres_list.txt'), [...head, 'density (area-weighted median), zone, area, texture size, repeat, where, texture source', ...bad.map(fmt), '', `BLACK SURFACES (${res.black.length}):`, ...res.black.map((b) => '  ' + b), '', 'BACKDROPS AND LIGHT OVERLAYS (views behind windows, far impostors, AO maps; not surface art, not listed above):',
    ...res.rows.filter((r) => r.bd && (r.close || r.far)).map((r) => `  ${(r.close || r.far).p50} px/m  ${(r.close || r.far).area} m²  ${r.px.join('x')}  ${r.place || ''} ${r.who}  ${r.tex}`),
    '', ...(errors.length ? ['CONSOLE ERRORS:', ...errors.slice(0, 20)] : [])].join('\n') + '\n');
  const all = res.rows.filter((r) => !r.proj && (r.close || r.far)).map((r) => ({ ...r, zone: r.close ? 'close' : 'far', d: (r.close || r.far).p50, area: (r.close || r.far).area, need: r.close ? C : F })).sort((x, y) => y.area - x.area);
  writeFileSync(resolve(root, outDir, 'texel_all.txt'), [...head, ...all.map(fmt), '', 'WORLD-PROJECTED (no uv):', ...res.rows.filter((r) => r.proj).map((r) => `  ${r.who}  ${r.tex}  ${r.px.join('x')}`), '', 'TEXTURES BY MEMORY:', ...res.texList.map((x) => `  ${String(x.mb).padStart(6)} MB  ${x.w}x${x.h}  ${short(x.name, 70).padEnd(70)}  ${x.users.join(', ')}`)].join('\n') + '\n');
  console.log(head.join('\n'));
  console.log('written', outDir + '/lowres_list.txt', 'errors:', errors.length);
} catch (e) { console.error('ERROR', e.message); }
finally { await browser.close(); await server.close(); }
