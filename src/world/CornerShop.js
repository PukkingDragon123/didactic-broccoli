// MIKAWA-YA, the corner store across the lane (x∈[-15.45,-9.4], z∈[14.9,19.95]): shell, shopfront, signboard, the
// dwelling upstairs and a packed Shōwa 駄菓子屋 / よろず屋 interior. The shell merges into the town's batches; the
// interior has its own: one batch for wood, printed matter and the hundreds of little product boxes (one atlas,
// src/world/mikawayaArt.js), and every static voxel prop merged into two meshes (fixtures + small clutter, which hides
// when you're far away). No extra lights: the shop's one warm point light, the fluorescent tubes and a glowing TV.
//
// Layout (looking in from the door, +z; x decreases to your right): a concrete floor (doma) packed with goods, the
// raised tatami back room (小上がり, z ≥ 18.15, 0.42 m up) where the old man sits on the edge behind the counter.
//   buildCornerShop(town) sets town.cornerShop = {
//     counter, keeper: { pos, rotY }, inside: { minX, maxX, minZ, maxZ }, door,         (the contract)
//     seat: { pos, rotY, y },  stock: [...],  tv: { pos },  ashtray, detail,  update(dt, playerPos) }
//   stock entries (sold physically by src/plugins/mikawaya.js):
//     { id: supply id, prop, units: [{ p: Vector3, q: Quaternion, s }], restock: seconds, jar?: true (an endless
//       source: units are the jars themselves), label }
import * as THREE from 'three';
import { propGeometry } from './props.js';
import { mikawayaAtlas, tatamiTexture, tvScreen } from './mikawayaArt.js';

const ZF = 14.9; // the far building line (Town.js)
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _m = new THREE.Matrix4(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
const rng = (seed) => { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; }; };

// interior frame
export const MK = {
  x0: -15.45, x1: -9.4, z0: ZF, z1: 19.95, H1: 2.85,
  XI0: -15.2, XI1: -9.65, ZI0: ZF + 0.28, ZI1: 19.7,
  dx0: -13.3, dx1: -11.55, // the door opening
  ZP: 18.15, YP: 0.42, // the back room's front edge and floor height
  seat: { x: -11.95, z: 17.88 }, // where the old man's feet go when he sits on the edge (facing the door)
};

/**
 * Merge static voxel props into one mesh (one geometry group per voxel material).
 * items: [{ id, x, y, z, ry, rx, rz, s, k (brightness) }]
 */
function mergeVoxelProps(items, mats) {
  const B = Array.from({ length: 5 }, () => ({ pos: [], nrm: [], col: [], idx: [], n: 0 }));
  const nm = new THREE.Matrix3();
  for (const it of items) {
    const g = propGeometry(it.id);
    if (!g) continue;
    _q.setFromEuler(_e.set(it.rx || 0, it.ry || 0, it.rz || 0, 'YXZ'));
    _m.compose(_v.set(it.x, it.y, it.z), _q, _s.setScalar(it.s || 1));
    nm.getNormalMatrix(_m);
    const P = g.attributes.position.array, N = g.attributes.normal.array, C = g.attributes.color.array, I = g.index.array, k = it.k ?? 1;
    for (const grp of g.groups) {
      const b = B[grp.materialIndex];
      if (!b) continue;
      let lo = Infinity, hi = -1;
      for (let i = grp.start; i < grp.start + grp.count; i++) { const q = I[i]; if (q < lo) lo = q; if (q > hi) hi = q; }
      if (hi < 0) continue;
      const base = b.n;
      for (let q = lo; q <= hi; q++) {
        _v.set(P[q * 3], P[q * 3 + 1], P[q * 3 + 2]).applyMatrix4(_m); b.pos.push(_v.x, _v.y, _v.z);
        _v.set(N[q * 3], N[q * 3 + 1], N[q * 3 + 2]).applyMatrix3(nm).normalize(); b.nrm.push(_v.x, _v.y, _v.z);
        b.col.push(C[q * 3] * k, C[q * 3 + 1] * k, C[q * 3 + 2] * k);
      }
      for (let i = grp.start; i < grp.start + grp.count; i++) b.idx.push(I[i] - lo + base);
      b.n += hi - lo + 1;
    }
  }
  const nV = B.reduce((a, b) => a + b.n, 0), nI = B.reduce((a, b) => a + b.idx.length, 0);
  const pos = new Float32Array(nV * 3), nrm = new Float32Array(nV * 3), col = new Float32Array(nV * 3), idx = new Uint32Array(nI);
  const geo = new THREE.BufferGeometry();
  let vo = 0, io = 0;
  B.forEach((b, mi) => {
    if (!b.idx.length) return;
    pos.set(b.pos, vo * 3); nrm.set(b.nrm, vo * 3); col.set(b.col, vo * 3);
    for (let i = 0; i < b.idx.length; i++) idx[io + i] = b.idx[i] + vo;
    geo.addGroup(io, b.idx.length, mi);
    vo += b.n; io += b.idx.length;
  });
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, mats);
  mesh.matrixAutoUpdate = false;
  mesh.receiveShadow = true;
  mesh.userData.tris = nI / 3;
  return mesh;
}

export function buildCornerShop(t) {
  const B = t.B, m = t.m;
  const { x0, x1, z0, z1, H1, dx0, dx1 } = MK;
  const cx = (x0 + x1) / 2;
  const I = (k) => t.indoor(k);
  buildShell(t, B, m, I, cx);

  // ================================================================== the interior
  const A = mikawayaAtlas();
  const shop = new THREE.Group();
  shop.name = 'mikawaya';
  t.add(shop);
  const Bi = new B.constructor(); // the interior's own batch (wood, printed matter, products)
  const prodMat = I(new THREE.MeshStandardMaterial({ map: A.tex, vertexColors: true, roughness: 0.72 }));
  const decalMat = I(new THREE.MeshStandardMaterial({ map: A.tex, vertexColors: true, roughness: 0.85, alphaTest: 0.5, side: THREE.DoubleSide }));
  decalMat.polygonOffset = true; decalMat.polygonOffsetFactor = -2; decalMat.polygonOffsetUnits = -4;
  const tat = tatamiTexture();
  tat.repeat.set(1 / 1.8, 1 / 0.9);
  const tatamiMat = I(new THREE.MeshStandardMaterial({ map: tat, vertexColors: true, roughness: 0.92 }));
  const big = [], small = []; // voxel props for the two merged meshes
  const stock = [];
  const R = rng(1962);
  const wd = I(m.wood), wdL = I(m.woodL), pv = I(m.pv), gl = I(m.gloss), mt = I(m.metal);

  // --- helpers in the current local frame of Bi (push / pop)
  const vox = (id, lx, ly, lz, lry = 0, o = {}) => { const p = Bi.world(lx, ly, lz); (o.big ? big : small).push({ id, x: p.x, y: p.y, z: p.z, ry: Bi.yaw(lry), rx: o.rx, rz: o.rz, s: o.s, k: o.k }); };
  const unit = (lx, ly, lz, lry = 0, o = {}) => ({ p: Bi.world(lx, ly, lz), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(o.rx || 0, Bi.yaw(lry), o.rz || 0, 'YXZ')), s: o.s || 1 });
  const uvBox = (g, front, side, top) => {
    const uv = g.attributes.uv;
    for (let f = 0; f < 6; f++) {
      const r = f === 4 || f === 5 ? front : f === 2 && top ? top : side;
      for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, r[0] + uv.getX(i) * (r[2] - r[0]), r[1] + uv.getY(i) * (r[3] - r[1])); }
    }
  };
  /** A product box with its label on the front (+z local) and the label's edge colour elsewhere. */
  const prod = (key, w, h, d, x, y, z, ry = 0, o = {}) => {
    const g = new THREE.BoxGeometry(w, h, d);
    uvBox(g, A.uv(key), A.edge(key), o.top ? A.uv(o.top) : null);
    if (o.rz) g.rotateZ(o.rz);
    if (ry) g.rotateY(ry);
    g.translate(x, y + h / 2, z);
    Bi.geo(prodMat, g, { tint: o.tint ?? 0xffffff, k: o.k ?? 1 });
  };
  /** A can / cup / jar: the label wraps around, the caps take its edge colour. */
  const can = (key, r, h, x, y, z, o = {}) => {
    const g = new THREE.CylinderGeometry(r * (o.top ?? 1), r, h, 10, 1);
    const uv = g.attributes.uv, F = A.uv(key), E = A.edge(key);
    for (let i = 0; i < uv.count; i++) { const rr = i < 22 ? F : E; uv.setXY(i, rr[0] + uv.getX(i) * (rr[2] - rr[0]), rr[1] + uv.getY(i) * (rr[3] - rr[1])); }
    g.translate(x, y + h / 2, z);
    Bi.geo(prodMat, g, { k: o.k ?? 1 });
  };
  /** A flat printed decal (poster, sign) facing +z local. */
  const decal = (key, w, h, x, y, z, ry = 0, o = {}) => {
    const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv, r = A.uv(key);
    for (let i = 0; i < uv.count; i++) uv.setXY(i, r[0] + uv.getX(i) * (r[2] - r[0]), r[1] + uv.getY(i) * (r[3] - r[1]));
    if (o.rx) g.rotateX(o.rx);
    if (o.rz) g.rotateZ(o.rz);
    if (ry) g.rotateY(ry);
    g.translate(x, y + h / 2, z);
    Bi.geo(decalMat, g, { k: o.k ?? 1 });
  };
  const box = (mat, w, h, d, x, y, z, o = {}) => Bi.box(mat, w, h, d, x, y, z, o);
  /** Fill a shelf (local x from a to b, front at z = 0, depth d) with product facings. */
  const fillShelf = (a, b, y, d, hMax, kinds, o = {}) => {
    let x = a + 0.01;
    while (x < b - 0.05) {
      const kind = kinds[Math.floor(R() * kinds.length)];
      let w, h, key, dd = d * (0.8 + R() * 0.15);
      if (kind === 'snack') { w = 0.07 + R() * 0.05; h = Math.min(hMax, 0.08 + R() * 0.08); key = 'snack' + Math.floor(R() * 24); }
      else if (kind === 'tall') { w = 0.08 + R() * 0.05; h = Math.min(hMax, 0.18 + R() * 0.12); key = 'tall' + Math.floor(R() * 8); }
      else if (kind === 'card') { w = 0.22 + R() * 0.14; h = Math.min(hMax, 0.16 + R() * 0.14); key = 'card' + Math.floor(R() * 4); dd = d * 0.92; }
      else if (kind === 'kit') { w = 0.3; h = 0.05 + R() * 0.03; key = 'kit' + Math.floor(R() * 5); }
      else { // a row of cans / cup noodles
        const r = 0.035 + R() * 0.015, n = 2 + Math.floor(R() * 2), ck = 'can' + Math.floor(R() * 6), hh = Math.min(hMax, 0.08 + R() * 0.05);
        for (let i = 0; i < n && x + r * 2 < b; i++) { for (const zz of [-r - 0.01, -r * 3 - 0.02]) can(ck, r, hh, x + r, y, zz, { top: R() < 0.3 ? 1.15 : 1, k: o.k }); if (R() < 0.35 && hh * 2 < hMax) can(ck, r, hh, x + r, y + hh, -r - 0.01, { k: o.k }); x += r * 2 + 0.005; }
        x += 0.01;
        continue;
      }
      if (x + w > b) w = b - x;
      if (w < 0.05) break;
      if (kind === 'kit') { // a pile of model kits
        const n = 1 + Math.floor(R() * Math.min(5, hMax / h));
        for (let i = 0; i < n; i++) prod(key, w, h, dd, x + w / 2 + (R() - 0.5) * 0.02, y + i * h, -dd / 2 - 0.01, (R() - 0.5) * 0.06, { k: o.k });
      } else {
        prod(key, w - 0.006, h, dd, x + w / 2, y, -dd / 2 - 0.01, (R() - 0.5) * 0.05, { k: o.k });
        if (kind === 'snack' && R() < 0.4 && h * 2 < hMax) prod(key, w - 0.01, h, dd * 0.9, x + w / 2, y + h, -dd / 2 - 0.02, (R() - 0.5) * 0.1, { k: o.k });
      }
      x += w + 0.004;
    }
  };

  // ---- floor: concrete doma, a door mat
  box(I(m.conc), x1 - x0 - 0.5, 0.06, MK.ZP - MK.ZI0 + 0.1, cx, -0.052, (MK.ZI0 + MK.ZP) / 2, { k: 0.85 });
  box(pv, 1.2, 0.012, 0.55, (dx0 + dx1) / 2, 0, MK.ZI0 + 0.32, { tint: 0x6a4a3a });

  // ---- the back room: agari-kamachi edge, tatami, kamoi beam, fusuma, the old man's things
  const { ZP, YP, XI0, XI1, ZI1 } = MK;
  box(wd, XI1 - XI0, YP, 0.12, (XI0 + XI1) / 2, 0, ZP + 0.06, { tint: 0x7a5038 }); // the polished edge (上がり框)
  box(wd, XI1 - XI0, YP - 0.04, ZI1 - ZP - 0.12, (XI0 + XI1) / 2, 0, (ZP + 0.12 + ZI1) / 2, { tint: 0x5a3a28 });
  Bi.plane(tatamiMat, XI1 - XI0, ZI1 - ZP - 0.12, (XI0 + XI1) / 2, YP - 0.002, (ZP + 0.12 + ZI1) / 2, { uv: [0.35, 0.1] });
  box(wd, XI1 - XI0, 0.12, 0.16, (XI0 + XI1) / 2, 2.08, ZP + 0.04, { tint: 0x6a4630 }); // kamoi
  box(I(m.shikkui), XI1 - XI0, H1 - 2.2, 0.04, (XI0 + XI1) / 2, 2.2, ZP + 0.06, { k: 0.95 }); // the wall over the opening
  for (const x of [XI0 + 0.06, XI1 - 0.06]) box(wd, 0.12, 2.1, 0.12, x, 0, ZP + 0.06, { tint: 0x6a4630 });
  // fusuma on the back wall (cream panels, dark frames, round pulls)
  for (let i = 0; i < 4; i++) {
    const fx = -14.55 + i * 0.86;
    box(I(m.pv), 0.84, 1.62, 0.02, fx, YP, ZI1 - 0.02, { tint: [0xe8dcc0, 0xe4d8bc][i % 2] });
    for (const [w, h, x, y] of [[0.86, 0.03, fx, YP + 1.6], [0.86, 0.03, fx, YP], [0.03, 1.62, fx - 0.42, YP], [0.03, 1.62, fx + 0.42, YP]]) box(wd, w, h, 0.03, x, y, ZI1 - 0.035, { tint: 0x3a2418 });
    box(mt, 0.05, 0.05, 0.01, fx + (i % 2 ? -0.33 : 0.33), YP + 0.82, ZI1 - 0.04, { tint: 0x2a2420 });
  }
  box(wd, XI1 - XI0, 0.05, 0.05, (XI0 + XI1) / 2, YP + 1.64, ZI1 - 0.04, { tint: 0x3a2418 });
  // the old man's spot: his ashtray full of cigar stubs, the cigar box, the fan pointed at him
  vox('mk_ashtray', -11.32, YP, 18.42, 0.4, { big: false });
  vox('mk_tv_cabinet', -14.55, YP, 18.78, 2.2, { big: true });
  vox('crt_tv', -14.55, YP + 0.38, 18.78, 2.2, { big: true });
  vox('fan', -10.85, YP, 18.62, -1.9, { big: true });
  vox('mk_chabudai', -13.15, YP, 19.12, 0.2, { big: true });
  vox('mk_tea_set', -13.0, YP + 0.32, 19.02, 0.6);
  vox('mk_ashtray', -13.38, YP + 0.32, 19.2, 1.3, { k: 0.9 });
  prod('news', 0.3, 0.012, 0.4, -12.85, YP + 0.32, 19.3, 0.5, { k: 0.95 });
  vox('mk_zabuton', -12.25, YP, 19.2, 0.15, { big: true });
  vox('mk_zabuton', -13.85, YP, 19.4, -0.3, { big: true, k: 0.92 });
  vox('mk_tansu', -10.3, YP, 19.46, Math.PI, { big: true });
  vox('radio', -10.45, YP + 0.96, 19.5, Math.PI + 0.1);
  vox('mk_phone', -9.98, YP + 0.96, 19.42, Math.PI - 0.3);
  vox('daruma', -10.72, YP + 0.96, 19.33, Math.PI + 0.3);
  decal('photo', 0.13, 0.16, -10.12, YP + 0.96, 19.6, Math.PI - 0.25, { rx: 0.15 });
  vox('mk_kamidana', -12.9, 2.28, ZI1 - 0.14, Math.PI, { big: true });
  vox('pendulum_clock', -11.4, 1.62, ZI1 - 0.07, Math.PI, { big: true });
  decal('calendar', 0.34, 0.5, XI0 + 0.03, 1.3, 19.25, Math.PI / 2);
  vox('shop_lamp', -12.9, H1 - 0.72, 19.0, 0, { big: true });
  // stock piled at the east end of the back room
  prod('card1', 0.5, 0.36, 0.42, -10.05, YP, 18.55, Math.PI / 2 + 0.05);
  prod('card0', 0.46, 0.3, 0.4, -10.07, YP + 0.36, 18.58, Math.PI / 2 - 0.1);
  vox('mk_snack_carton', -10.1, YP, 19.0, -Math.PI / 2 + 0.2, { big: true });
  // the noren half-curtain over the left of the opening, the irony sign right over his head
  decal('noren', 0.95, 0.42, -13.9, 1.66, ZP + 0.0, Math.PI);
  decal('kinen', 0.26, 0.13, -11.95, 2.33, ZP - 0.0, Math.PI);
  decal('menu', 0.44, 0.6, -12.6, 2.18, ZP - 0.0, Math.PI, { rz: 0.02 });
  decal('tsuke', 0.56, 0.11, -13.75, 2.42, ZP - 0.0, Math.PI, { rz: -0.03 });
  decal('poster3', 0.36, 0.54, -14.75, 2.22, ZP - 0.0, Math.PI, { rz: 0.04 });
  decal('poster5', 0.36, 0.54, -10.7, 2.22, ZP - 0.0, Math.PI, { rz: -0.03 });

  // ---- the counter: an old glass showcase, the register, the watch in its case, batteries on pegs, flyers
  const ctr = { x: -12.15, z: 17.33 };
  vox('shop_counter', ctr.x, 0, ctr.z, Math.PI, { big: true });
  vox('cash_register', -12.45, 0.96, 17.42, 0);
  vox('abacus', -12.1, 0.96, 17.16, Math.PI + 0.12);
  vox('call_bell', -12.27, 0.96, 17.14, 0.4);
  vox('manekineko', -12.88, 0.96, 17.48, Math.PI + 0.35);
  vox('mk_cigar_box', -11.95, 0.96, 17.5, Math.PI - 0.2);
  vox('mk_watch_case', -11.72, 0.96, 17.22, Math.PI - 0.1);
  vox('mk_peg_stand', -11.47, 0.96, 17.42, Math.PI + 0.15);
  decal('flyerSign', 0.17, 0.09, -12.76, 1.0, 17.42, Math.PI + 0.25, { rx: -0.25 });
  decal('tag3', 0.07, 0.045, -11.72, 0.963, 17.1, Math.PI, { rx: -Math.PI / 2 + 0.2 });
  const counter = new THREE.Group();
  counter.name = 'cornerShopCounter';
  counter.position.set(ctr.x, 0.46, ctr.z); // origin 0.5 m under the counter top (things bought land on it)
  const hit = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.96, 0.56), new THREE.MeshBasicMaterial());
  hit.position.y = 0.02; hit.visible = false;
  counter.add(hit);
  t.add(counter);
  Bi.push(-11.47, 0.96, 17.42, Math.PI + 0.15); // battery packs hanging on the peg stand's hooks
  stock.push({ id: 'batteries', prop: 'battery_pack', restock: 45, units: [[-0.06, 0.05], [0.05, 0.05], [-0.06, 0.19], [0.05, 0.19]].map(([x, y]) => unit(x, y, 0.035, 0)) });
  Bi.pop();
  stock.push({ id: 'watch', prop: 'pocket_watch', restock: 120, unique: true, units: [{ p: new THREE.Vector3(-11.72, 1.035, 17.22), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.5, Math.PI - 0.1, 0)), s: 1.15 }] });
  stock.push({ id: 'flyers', prop: 'flyer_stack', restock: 40, units: [0, 1, 2].map((i) => ({ p: new THREE.Vector3(-12.72 + i * 0.012, 0.965 + i * 0.022, 17.24 - i * 0.01), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI + 0.3 - i * 0.12, 0)), s: 0.9 })) });

  // ---- west wall: tall shelving to the ceiling, daily goods, tool kits, model kits stacked on top
  Bi.push(XI0, 0, 16.68, Math.PI / 2); // local x runs along the wall (toward the door), +z into the room
  for (const [a, b] of [[-1.38, -0.02], [0.02, 1.38]]) {
    for (const x of [a, b]) box(wdL, 0.035, 2.1, 0.47, x, 0, 0.235, { tint: 0xc89a6a });
    box(wdL, b - a, 2.1, 0.015, (a + b) / 2, 0, 0.01, { tint: 0xa87a4a, k: 0.8 }); // back board
    const ys = [0.06, 0.46, 0.84, 1.22, 1.6, 2.0];
    ys.forEach((y, i) => {
      box(wdL, b - a, 0.025, 0.47, (a + b) / 2, y - 0.025, 0.235, { tint: 0xd0a070 });
      box(pv, b - a, 0.022, 0.006, (a + b) / 2, y - 0.03, 0.472, { tint: 0xe8463a }); // price rail
      if (i === ys.length - 1) return;
      const hMax = ys[i + 1] - y - 0.04;
      Bi.push(0, 0, 0.465);
      // leave room on the bottom shelf of the near section for the tool kits
      if (i === 0 && a > -1) fillShelf(a, a + 0.2, y, 0.42, hMax, ['card']);
      else if (i === 0) fillShelf(a, b, y, 0.42, hMax, ['card', 'tall']);
      else fillShelf(a, b, y, 0.42, hMax, i >= 4 ? ['kit', 'snack', 'card'] : i === 1 ? ['tall', 'can', 'snack'] : ['snack', 'can', 'tall', 'snack']);
      Bi.pop();
      for (let k = 0; k < 3; k++) decal('tag' + ((k + i) % 4), 0.055, 0.035, a + 0.2 + k * 0.42, y - 0.035, 0.475, 0, { k: 0.95 });
    });
  }
  // model kits and cardboard stacked to the ceiling
  Bi.push(0, 2.0, 0.24);
  let kx = -1.36;
  while (kx < 1.2) {
    const w = 0.28 + R() * 0.1, n = 3 + Math.floor(R() * 5), key = 'kit' + Math.floor(R() * 5);
    for (let i = 0; i < n && 0.07 * (i + 1) < 0.76; i++) prod(key, w, 0.065, 0.36, kx + w / 2 + (R() - 0.5) * 0.03, i * 0.068, 0, (R() - 0.5) * 0.08);
    kx += w + 0.02;
  }
  Bi.pop();
  // the tool kits for sale on the bottom shelf, near section
  stock.push({ id: 'toolkit', prop: 'toolkit_case', restock: 60, units: [unit(0.48, 0.06, 0.25, 0), unit(0.98, 0.06, 0.25, 0.05)] });
  // the kujibiki board on the end panel, facing the door
  Bi.pop();
  decal('kuji', 0.46, 0.6, XI0 + 0.24, 1.24, 15.27, Math.PI, { rz: 0.03 });
  decal('dagashi', 0.4, 0.15, XI0 + 0.24, 1.88, 15.27, Math.PI);

  // ---- the island: a low stepped table of dagashi, candy jars on top, strips of toys hanging over it
  const isl = { x: -13.88, z: 16.6 };
  Bi.push(isl.x, 0, isl.z, Math.PI / 2); // local +z = +x world (faces the main aisle), local x = -z world
  box(wd, 1.3, 0.6, 0.6, 0, 0, 0, { tint: 0x8a5a38 });
  box(wd, 1.34, 0.03, 0.64, 0, 0.6, 0, { tint: 0x6a4028 });
  box(wd, 1.3, 0.2, 0.26, 0, 0.63, -0.17, { tint: 0x7a4a30 }); // the riser tier
  box(wd, 1.32, 0.02, 0.28, 0, 0.83, -0.17, { tint: 0x6a4028 });
  // open trays of sweets on the lower tier, packets on the riser, a striped skirt round the base
  for (let i = 0; i < 7; i++) {
    const x = -0.58 + i * 0.165;
    if (i === 1 || i === 2) continue; // the puff-stick box sits here
    prod('snack' + ((i * 5) % 24), 0.15, 0.05, 0.13, x, 0.63, 0.22, (R() - 0.5) * 0.08);
    for (let k = 0; k < 4; k++) prod('snack' + ((i * 5 + k * 3) % 24), 0.045, 0.03, 0.045, x - 0.04 + (k % 2) * 0.07, 0.68, 0.18 + Math.floor(k / 2) * 0.06, R() * 3, { k: 1.05 });
  }
  for (let i = 0; i < 9; i++) prod('snack' + ((i * 7 + 2) % 24), 0.1, 0.07 + R() * 0.05, 0.06, -0.55 + i * 0.135, 0.85, -0.06, (R() - 0.5) * 0.2);
  for (let i = 0; i < 12; i++) box(pv, 0.11, 0.56, 0.005, -0.6 + i * 0.11, 0.02, 0.302, { tint: i % 2 ? 0xe8463a : 0xf4ead2 });
  vox('mk_puff_box', -0.32, 0.63, 0.2, 0, { big: false });
  for (const [i, id] of ['mk_candy_jar_a', 'mk_candy_jar_b', 'mk_candy_jar_c'].entries()) vox(id, 0.15 + i * 0.19, 0.85, -0.17, (i - 1) * 0.3);
  stock.push({ id: 'puffstick', prop: 'puff_stick', restock: 25, units: [-0.38, -0.34, -0.3, -0.26].flatMap((x, i) => [unit(x, 0.645, 0.18 + (i % 2) * 0.03, 0.3 * i, { rx: (i % 2 ? 0.08 : -0.06) })]) });
  stock.push({ id: 'candy', prop: 'candy_piece', restock: 0, jar: true, hit: [0.17, 0.25, 0.17], units: [0, 1, 2].map((i) => unit(0.15 + i * 0.19, 0.85, -0.17, 0)) });
  // the bar overhead, strips of bagged toys, menko and bromide sheets clipped on
  box(mt, 1.5, 0.02, 0.02, 0, 2.52, 0.0, { tint: 0x9aa0a6 });
  for (const x of [-0.72, 0.72]) box(mt, 0.015, H1 - 2.52, 0.015, x, 2.52, 0, { tint: 0x9aa0a6 });
  for (let i = 0; i < 6; i++) decal('strip' + (i % 4), 0.2, 0.9, -0.62 + i * 0.25, 1.6, 0.0, (R() - 0.5) * 0.3);
  Bi.pop();
  // a second bar over the east wall goods: menko + bromide sheets
  for (const [i, key] of ['menko', 'bromide', 'strip2'].entries()) decal(key, key === 'strip2' ? 0.2 : 0.34, key === 'strip2' ? 0.9 : 0.42, -10.5, key === 'strip2' ? 1.85 : 2.1, 15.95 + i * 0.45, -Math.PI / 2 + 0.25, { rz: (i - 1) * 0.04 });
  box(mt, 0.02, 0.02, 1.4, -10.5, 2.52, 16.4, { tint: 0x9aa0a6 });

  // ---- east wall: the stepped dagashi rack, jars above, the open milk case
  vox('dagashi_rack', XI1 - 0.25, 0, 16.55, -Math.PI / 2, { big: true });
  vox('wall_shelf_jars', XI1 - 0.12, 1.42, 16.55, -Math.PI / 2, { big: true });
  decal('poster0', 0.4, 0.6, XI1 - 0.01, 2.04, 16.15, -Math.PI / 2, { rz: 0.03 });
  decal('poster1', 0.4, 0.6, XI1 - 0.01, 2.06, 16.75, -Math.PI / 2, { rz: -0.04 });
  decal('poster2', 0.36, 0.54, XI1 - 0.01, 1.04, 15.55, -Math.PI / 2, { rz: -0.02 });
  Bi.push(XI1 - 0.3, 0, 17.55, -Math.PI / 2); // the milk case (local +z = -x world: into the room)
  vox('mk_dairy_case', 0, 0, 0, 0, { big: true });
  decal('milkSign', 0.36, 0.17, 0, 1.56, 0.315, 0);
  stock.push({ id: 'milk', prop: 'milk_carton', restock: 35, units: [unit(-0.16, 0.8, -0.02, 0.1), unit(0.06, 0.8, -0.03, -0.12), unit(-0.1, 1.16, -0.03, 0.05), unit(0.12, 1.16, -0.02, 0)] });
  Bi.pop();
  decal('poster4', 0.4, 0.6, XI1 - 0.01, 1.95, 17.62, -Math.PI / 2, { rz: 0.02 });
  vox('pink_phone', XI1 - 0.22, 0, 15.52, -Math.PI / 2, { big: true });

  // ---- the front: ramune in a tub of ice water, the broom bucket, the ice-cream chest, the fluorescent tubes
  vox('mk_ramune_tub', -14.3, 0, 15.6, Math.PI, { big: true });
  stock.push({ id: 'ramune', prop: 'ramune_bottle', restock: 30, units: [[-14.53, 15.5], [-14.35, 15.66], [-14.2, 15.52], [-14.05, 15.7], [-14.4, 15.8]].map(([x, z], i) => ({ p: new THREE.Vector3(x, 0.47, z), q: new THREE.Quaternion().setFromEuler(new THREE.Euler((i - 2) * 0.06, i, (i % 2 ? 0.1 : -0.08))), s: 1 })) });
  vox('mk_broom_bin', -13.62, 0, 15.42, 0.3, { big: true });
  stock.push({ id: 'broom', prop: 'broom', restock: 50, units: [[-13.66, 15.4, 0.12, 0.1, 0.3], [-13.58, 15.46, -0.1, 0.06, 1.8], [-13.6, 15.36, 0.04, -0.12, 3.4]].map(([x, z, rz, rx, ry]) => ({ p: new THREE.Vector3(x, 0.03, z), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), s: 1 })) });
  vox('mk_ice_freezer', -10.8, 0, 15.56, Math.PI, { big: true });
  decal('freezerSign', 0.6, 0.13, -10.8, 0.5, 15.235, Math.PI);
  vox('mk_tube_box', -14.45, 0, 17.88, 0.35, { big: true });
  stock.push({ id: 'tube', prop: 'tube_box', restock: 45, units: [[-14.5, 17.86, 0.06], [-14.42, 17.9, -0.05], [-14.46, 17.82, 0.02]].map(([x, z, tilt], i) => ({ p: new THREE.Vector3(x, 0.65 + i * 0.01, z), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0.35 + i * 0.4, Math.PI / 2 + tilt * 0.5, 'YXZ')), s: 1 })) });
  // floor clutter at the back west: cardboard, bundled newspapers, a carton of snacks
  prod('card2', 0.45, 0.34, 0.4, -14.0, 0, 17.62, 0.12);
  prod('card3', 0.38, 0.28, 0.36, -14.02, 0.34, 17.6, -0.2);
  vox('mk_snack_carton', -13.78, 0, 18.0, 0.1, { big: true, s: 0.85 });
  for (let i = 0; i < 3; i++) { prod('news', 0.3, 0.08, 0.42, -14.55, i * 0.085, 17.42 - 0.02 * i, 0.3 * i, { top: 'news' }); }
  box(pv, 0.31, 0.005, 0.01, -14.55, 0.26, 17.42, { tint: 0xd8c88a });
  // signs over the door and on the windows
  decal('manbiki', 0.56, 0.12, (dx0 + dx1) / 2, 2.35, MK.ZI0 + 0.01, 0);
  decal('flypaper', 0.06, 0.5, -13.55, 2.28, 17.95, 0.4);
  decal('flypaper', 0.06, 0.5, -10.9, 2.26, 16.4, 1.2);

  // ---- outside: the red tobacco sign behind the east window, a standing ashtray by the door
  decal('tabako', 0.42, 0.16, -10.45, 1.95, z0 + 0.13, Math.PI);
  t.prop('mk_stand_ashtray', -13.7, 0, 14.5, 0.3, { block: true });

  // ---- fluorescent fixtures + the shop's one warm light
  for (const x of [-13.95, -11.0]) {
    box(pv, 0.2, 0.06, 1.5, x, H1 - 0.13, 16.5, { tint: 0xe8e8e2 });
    Bi.box(t.G, 0.05, 0.04, 1.4, x - 0.05, H1 - 0.17, 16.5, { tint: 0xfff6e8 });
    Bi.box(t.G, 0.05, 0.04, 1.4, x + 0.05, H1 - 0.17, 16.5, { tint: 0xfff6e8 });
  }
  const L = new THREE.PointLight(0xfff0d8, 8.5, 9.5, 1.4);
  L.position.set(-12.3, 2.3, 17.5);
  t.add(L);

  // ---- assemble: batch + two merged voxel meshes + the TV screen
  Bi.build(shop);
  const vm = t.indoorVoxel();
  const fixtures = mergeVoxelProps(big, vm), detail = mergeVoxelProps(small, vm);
  fixtures.name = 'mikawaya:fixtures'; detail.name = 'mikawaya:detail';
  shop.add(fixtures, detail);
  const tv = tvScreen();
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.235, 0.19), new THREE.MeshBasicMaterial({ map: tv.tex, color: 0xc8c8c8 }));
  _q.setFromEuler(_e.set(0, 2.2, 0));
  scr.position.set(-0.06, 0.22, 0.222).applyQuaternion(_q).add(_v.set(-14.55, YP + 0.38, 18.78));
  scr.quaternion.copy(_q);
  scr.userData.noRim = true;
  shop.add(scr);

  t.cornerShop = {
    counter,
    keeper: { pos: new THREE.Vector3(MK.seat.x, 0, MK.seat.z), rotY: Math.PI },
    seat: { pos: new THREE.Vector3(MK.seat.x, 0, MK.seat.z), rotY: Math.PI + 0.12, y: YP },
    inside: { minX: XI0, maxX: XI1, minZ: z0, maxZ: ZI1 },
    door: { x0: dx0, x1: dx1, z: z0 },
    stock,
    tv: { pos: new THREE.Vector3(-14.55, YP + 0.62, 18.78) },
    ashtray: new THREE.Vector3(-11.32, YP + 0.05, 18.42),
    light: L,
    detail,
    tris: { fixtures: fixtures.userData.tris, detail: detail.userData.tris },
    /** Per frame (from the plugin): the TV, and the small clutter only when you're close enough to see it. */
    update(dt, pp) {
      const d = Math.hypot(pp.x - -12.4, pp.z - 17.2);
      detail.visible = d < 11;
      scr.visible = d < 16;
      if (scr.visible) tv.update(dt);
    },
  };

  // ---- collisions (player) + physics boxes (dropped things land on the counter, table, back room)
  const P = t.game.player;
  const o = (a, b, c, d) => P.addObstacle(a, b, c, d);
  o(x0, dx0, z0 - 0.08, z0 + 0.24); o(dx1, x1, z0 - 0.08, z0 + 0.24);
  o(x0, x0 + 0.27, z0, z1); o(x1 - 0.27, x1, z0, z1); o(x0, x1, z1 - 0.28, z1);
  o(XI0, XI0 + 0.5, 15.2, 18.15); // west shelving
  o(-14.25, -13.5, 15.95, 17.3); // the island
  o(XI0, -13.62, 17.3, 18.15); // floor clutter, tube box
  o(-14.74, -13.86, 15.2, 15.95); o(-13.8, -13.44, 15.2, 15.62); // ramune tub, brooms
  o(-11.42, -10.18, 15.2, 15.9); o(-10.15, XI1, 15.2, 15.78); // ice-cream chest, phone
  o(-10.15, XI1, 16.05, 17.05); o(-10.25, XI1, 17.08, 18.05); // dagashi rack, milk case
  o(-12.97, -11.33, 17.03, 17.63); // the counter
  o(-12.97, -11.2, 17.63, 18.15); // behind the counter: the old man's knees
  o(XI0, XI1, 18.12, ZI1); // the raised back room
  const ph = t.game.physics;
  for (const [cxx, czz, hx, hz] of [[x0 + 0.125, (z0 + z1) / 2, 0.125, (z1 - z0) / 2], [x1 - 0.125, (z0 + z1) / 2, 0.125, (z1 - z0) / 2], [cx, z1 - 0.125, (x1 - x0) / 2, 0.125]]) {
    ph.addBox({ center: new THREE.Vector3(cxx, 1.5, czz), half: new THREE.Vector3(hx, 1.5, hz), material: 'concrete' });
  }
  ph.addBox({ center: new THREE.Vector3(ctr.x, 0.48, ctr.z), half: new THREE.Vector3(0.8, 0.48, 0.28), material: 'wood' });
  ph.addBox({ center: new THREE.Vector3((XI0 + XI1) / 2, YP / 2, (ZP + ZI1) / 2), half: new THREE.Vector3((XI1 - XI0) / 2, YP / 2, (ZI1 - ZP) / 2), material: 'wood' });
  ph.addBox({ center: new THREE.Vector3(isl.x, 0.42, isl.z), half: new THREE.Vector3(0.32, 0.42, 0.66), material: 'wood' });
  ph.addBox({ center: new THREE.Vector3(XI0 + 0.24, 1.2, 16.68), half: new THREE.Vector3(0.24, 1.2, 1.4), material: 'wood' });
}

/** The building: walls, shopfront, signboard, awning, the dwelling upstairs, the alley side (merged with the town). */
function buildShell(t, B, m, I, cx) {
  const { x0, x1, z0, z1, H1, dx0, dx1 } = MK;
  // threshold
  B.box(m.metal, dx1 - dx0 + 0.2, 0.025, 0.12, (dx0 + dx1) / 2, 0, z0 + 0.02, { tint: 0xb8bcc0 });
  // shell: side walls (both floors), back wall, ceiling / 2F floor
  for (const [xa, xb] of [[x0, x0 + 0.25], [x1 - 0.25, x1]]) {
    B.box(m.mortar, 0.25, H1 + 0.1, z1 - z0, (xa + xb) / 2, 0, (z0 + z1) / 2, { uv: [0, 0], ao: 0.15 });
  }
  B.box(m.mortar, x1 - x0, H1 + 0.1, 0.25, cx, 0, z1 - 0.125, { ao: 0.15 });
  // interior finishes: wainscot + plaster on the inner faces
  for (const sx of [-1, 1]) {
    const wx = sx < 0 ? x0 + 0.26 : x1 - 0.26;
    B.box(I(m.koshi), 0.02, 0.9, z1 - z0 - 0.3, wx, 0, (z0 + z1) / 2, { k: 0.9 });
    B.box(I(m.shikkui), 0.02, H1 - 0.9, z1 - z0 - 0.3, wx, 0.9, (z0 + z1) / 2, { k: 0.9 });
  }
  B.box(I(m.shikkui), x1 - x0 - 0.5, H1, 0.02, cx, 0, z1 - 0.26, { k: 0.85 });
  B.box(I(m.ceil), x1 - x0 - 0.5, 0.06, z1 - z0 - 0.3, cx, H1 - 0.06, (z0 + z1) / 2 + 0.02, { k: 0.9 });
  for (const z of [16.0, 17.2, 18.4, 19.4]) B.box(I(m.wood), x1 - x0 - 0.5, 0.08, 0.1, cx, H1 - 0.14, z, { k: 0.75 }); // exposed joists
  B.box(I(m.wood), x1 - x0 - 0.6, 0.02, 0.2, cx, 2.3, z0 + 0.21, { k: 0.8 });
  B.box(m.wood, x1 - x0 - 0.5, 0.22, z1 - z0, cx, H1, (z0 + z1) / 2, { k: 0.8 });
  // shopfront: piers, kick panels, display windows, transom, door frame, open sliding doors
  for (const [a, b] of [[x0, x0 + 0.3], [x1 - 0.3, x1]]) B.box(m.mortar, b - a, H1 + 0.1, 0.28, (a + b) / 2, 0, z0 + 0.14, { ao: 0.2 });
  for (const [a, b] of [[x0 + 0.3, dx0], [dx1, x1 - 0.3]]) {
    B.box(m.pv, b - a, 0.6, 0.2, (a + b) / 2, 0, z0 + 0.1, { tint: 0x8a6a4a });
    B.box(m.metal, b - a, 0.05, 0.24, (a + b) / 2, 0.6, z0 + 0.1, { tint: 0xb8bcc0 });
    B.box(m.metal, 0.05, 1.6, 0.06, (a + b) / 2, 0.65, z0 + 0.1, { tint: 0xb8bcc0 });
    for (const sx of [a + 0.025, b - 0.025]) B.box(m.metal, 0.05, 1.6, 0.08, sx, 0.65, z0 + 0.1, { tint: 0xb8bcc0 });
    t.add(t.glassPane(b - a, 1.6, (a + b) / 2, 0.65 + 0.8, z0 + 0.1));
  }
  B.box(m.metal, x1 - x0 - 0.6, 0.06, 0.24, cx, 2.25, z0 + 0.1, { tint: 0xb8bcc0 });
  B.box(m.wood, x1 - x0 - 0.6, 0.6, 0.2, cx, 2.31, z0 + 0.1);
  for (const sx of [dx0, dx1]) B.box(m.metal, 0.06, 2.25, 0.12, sx, 0, z0 + 0.06, { tint: 0xa8acb0 });
  // the two door leaves, slid open in front of the windows
  for (const [a, b] of [[dx0 - 0.85, dx0 - 0.02], [dx1 + 0.02, dx1 + 0.85]]) {
    for (const sx of [a, b]) B.box(m.pv, 0.05, 2.18, 0.05, sx, 0.03, z0 - 0.04, { tint: 0xa8acb0 });
    for (const y of [0.03, 2.16]) B.box(m.pv, b - a, 0.05, 0.05, (a + b) / 2, y, z0 - 0.04, { tint: 0xa8acb0 });
    B.box(m.pv, b - a, 0.04, 0.05, (a + b) / 2, 0.95, z0 - 0.04, { tint: 0xa8acb0 });
    t.add(t.glassPane(b - a - 0.05, 2.1, (a + b) / 2, 1.08, z0 - 0.04));
  }
  // posters in the windows
  const poster = (key, w, h, x, y) => B.quad(t.T2(key), w, h, x, y, z0 + 0.13, { ry: Math.PI });
  poster('matsuri', 0.42, 0.64, -14.6, 1.0); poster('idol', 0.42, 0.64, -10.4, 1.0);
  // signboard, awning and the dwelling upstairs
  const sign = t.vmesh(new THREE.BoxGeometry(x1 - x0 + 0.1, 0.78, 0.12), [t.P(0.5), t.P(0.5), t.P(0.5), t.P(0.5), t.T('mikawaya', 240, 36, { glow: 0.55, rough: 0.4 }), t.P(0.5)]);
  sign.position.set(cx, H1 + 0.6, z0 - 0.16); sign.rotation.y = Math.PI;
  t.add(sign);
  B.box(m.metal, x1 - x0 + 0.2, 0.06, 0.16, cx, H1 + 0.98, z0 - 0.16, { tint: 0x3a3c40 });
  const aw = t.awningMat();
  for (let j = 0; j < 3; j++) B.box(aw, x1 - x0 - 0.3, 0.07, 0.9 - j * 0.28, cx, 2.3 + j * 0.07, z0 - (0.9 - j * 0.28) / 2, { uv: [0.2, 0] });
  B.box(aw, x1 - x0 - 0.3, 0.22, 0.03, cx, 2.1, z0 - 0.9, { uv: [0.2, 0] });
  t.house({ x: cx, z: z0, w: x1 - x0, d: z1 - z0, side: -1, y0: H1 + 0.22, floors: 1, h1: 2.5, wallA: m.wallCream, roofM: m.roofGrey, antenna: 1.6,
    win: [[0, -1.4, 1.6, 1.1, 'lit', { tobukuro: -1, sill: 0.8 }], [0, 1.5, 1.4, 1.0, 'lit2', { sill: 0.8 }], [0, 2.5, 1.2, 1.0, 'lit3', { face: 'l', sill: 0.8, clean: true }], [0, 2.5, 1.0, 1.0, 'dark', { face: 'r', sill: 0.8 }]] });
  // side (alley) wall details: a frosted window, an AC unit, the back door lamp
  B.box(t.win.frost, 0.8, 0.6, 0.1, x1, 1.6, 18.4, { unit: true, ry: Math.PI / 2 });
  t.prop('propane', x1 + 0.22, 0, 17.4, Math.PI / 2);
  t.prop('beercrate', -9.95, 0, 14.4, 0.15);
  t.prop('beercrate', -9.95, 0.28, 14.4, -0.1);
  t.prop('sign_stand', -11.15, 0, 14.5, Math.PI + 0.25, { block: true });
}
