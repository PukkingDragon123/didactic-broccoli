// The dressing room's set: a small walk-in closet in a 1999 Japanese flat on a spring afternoon. Honey floorboards and a
// warm plaster wall with a wooden skirting and picture rail; an old wardrobe (yōfuku-dansu) with one door open on the
// clothes inside; a cheval mirror; a window onto the neighbours' roof and a cherry branch, with a lace curtain tied
// back; a shoe shelf under it with a paper lamp and a pothos; a hat stand; a pipe clothes rack with a row of hangers in
// the foreground; a braided rag rug where you stand. Low poly with pixel textures (src/dressing/roomTex.js) and a few
// voxel props in the cosmetics' own style. The sun comes in through a window you can't see (behind you, on the left):
// a frame that only the sun's shadow camera sees (layer 2) casts a window-shaped patch of light, mullions and all.
//   const R = buildRoom();  scene.add(R.group);  R.sun (DirectionalLight, shadows), R.hemi, R.fill, R.occ (the sun's window
//   frame), R.rug, R.beam (where the sunbeam is, for the dust motes)
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { VoxelModel, gloss } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { voxelMaterials } from '../voxel/materials.js';
import { VX } from '../cosmetics/voxels.js';
import * as T from './roomTex.js';

export const WALL = -1.95; // the back wall's plane (z)
export const WIN = { x0: 0.22, x1: 1.32, y0: 0.94, y1: 1.94 }; // the window in it
export const LAYER = { room: 0, me: 1, sunOnly: 2 };

const lam = (o) => new THREE.MeshLambertMaterial(o);
const texMat = (p, tile = 1, o = {}) => lam({ map: T.tex(p, { tile }), ...o });

/** Box with world-scaled UVs (metres), bottom at y. */
function boxGeo(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]); }
  return g;
}
function box(parent, w, h, d, mat, x, y, z, o = {}) {
  const m = new THREE.Mesh(boxGeo(w, h, d), mat);
  m.position.set(x, y + h / 2, z);
  if (o.rx || o.ry || o.rz) m.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0);
  m.castShadow = o.cast ?? true; m.receiveShadow = true;
  parent.add(m);
  return m;
}
/** A vertical quad facing +z with world UVs from (u0, v0), bottom-left at (x0, y0). */
function quad(parent, x0, y0, w, h, z, mat, u0 = x0, v0 = y0) {
  const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * w, v0 + uv.getY(i) * h);
  const m = new THREE.Mesh(g, mat);
  m.position.set(x0 + w / 2, y0 + h / 2, z);
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function cyl(parent, rt, rb, h, seg, mat, x, y, z, o = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y + h / 2, z);
  if (o.rx || o.rz || o.ry) m.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0);
  m.castShadow = o.cast ?? true; m.receiveShadow = true;
  parent.add(m);
  return m;
}
// voxel props (metric: voxel size s metres, origin at the model's bottom centre)
const vmats = () => voxelMaterials('normal');
function voxMesh(model, s, pivot = 'bottom') {
  const g = meshVoxels(model, { voxelSize: 1, origin: 'none' });
  g.computeBoundingBox();
  const b = g.boundingBox;
  g.translate(-(b.min.x + b.max.x) / 2, pivot === 'bottom' ? -b.min.y : -(b.min.y + b.max.y) / 2, -(b.min.z + b.max.z) / 2);
  g.scale(s, s, s);
  const m = new THREE.Mesh(g, vmats());
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
const vm = (j = 0.03) => { const v = new VoxelModel(); v.jitter = j; return v; };
function each(x0, x1, y0, y1, z0, z1, fn) { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) fn(x, y, z); }

// ------------------------------------------------------------------ small voxel props
/** One shoe (toe toward +z): kind 'sneaker' | 'loafer' | 'boot' | 'geta'. */
function shoeModel(kind, col, col2 = 0xf4ecdc) {
  const v = vm(0.03);
  if (kind === 'geta') {
    each(-2, 2, 2, 2, -5, 5, (x, y, z) => v.set(x, y, z, (x + z) % 3 ? 0xc89a64 : 0xb88a56));
    each(-2, 2, 0, 1, -4, -3, (x, y, z) => v.set(x, y, z, 0x9a7048)); each(-2, 2, 0, 1, 2, 3, (x, y, z) => v.set(x, y, z, 0x9a7048));
    v.set(0, 3, 3, col).set(0, 4, 2, col).set(-1, 3, 0, col).set(1, 3, 0, col).set(-2, 3, -1, col).set(2, 3, -1, col).set(-1, 4, 1, col).set(1, 4, 1, col);
    return v;
  }
  const tall = kind === 'boot' ? 9 : 3;
  each(-2, 2, 0, tall + 1, -5, 6, (x, y, z) => {
    const toe = z > 2 ? z - 2 : 0;
    if (y > 1 + Math.max(0, 3 - toe) && z > 1) return; // the toe slopes down
    if (kind === 'boot' && y > 4 && z > 0) return;
    if (kind !== 'boot' && y > 3) return;
    if (Math.abs(x) === 2 && z > 4) return;
    const sole = y === 0;
    if (y >= 2 && Math.abs(x) <= 1 && z >= -3 && z <= 1 && y >= (kind === 'boot' ? tall : 3)) return; // the opening
    let c = sole ? (kind === 'loafer' ? 0x5a3a28 : col2) : col;
    if (kind === 'sneaker' && y === 1) c = col2;
    if (kind === 'sneaker' && !sole && Math.abs(x) <= 1 && y === 3 && z >= 1 && z <= 3) c = 0xf6f0e4; // laces
    v.set(x, y, z, kind === 'boot' && !sole ? gloss(c) : c);
  });
  return v;
}
function plantModel() {
  const v = vm(0.05);
  each(-3, 3, 0, 5, -3, 3, (x, y, z) => { const r = Math.hypot(x, z); if (r <= 3.2 - (y < 2 ? 0.6 : 0) && (r > 2.2 || y < 1)) v.set(x, y, z, y === 5 ? 0xd8885a : 0xc8784a); });
  each(-2, 2, 4, 4, -2, 2, (x, y, z) => v.set(x, y, z, 0x6a4a30));
  // trailing pothos leaves, spilling over the rim
  const leaves = [[0, 7, 0], [-2, 6, 2], [2, 6, -1], [3, 5, 2], [-3, 4, -2], [4, 3, 3], [-4, 2, 1], [5, 1, 3], [1, 8, -2], [-1, 6, -3], [4, 0, 4], [-5, 0, 2]];
  leaves.forEach(([x, y, z], i) => {
    each(x - 1, x + 1, y, y + 1, z - 1, z + 1, (a, b, c) => { if (Math.abs(a - x) + Math.abs(c - z) + (b - y) <= 2) v.set(a, b, c, (a + b + i) % 3 === 0 ? 0x8ac85a : i % 2 ? 0x5ea844 : 0x4a9a3a); });
  });
  return v;
}
function hatBoxModel() {
  const v = vm(0.02);
  each(-7, 7, 0, 7, -7, 7, (x, y, z) => { const r = Math.hypot(x, z); if (r > 7.2) return; v.set(x, y, z, y >= 6 ? (r > 6.4 ? 0xd85a6a : 0xf2e2cc) : Math.floor((Math.atan2(x, z) + 4) * 3) % 2 ? 0xf2e2cc : 0xe8a0a8); });
  return v;
}
function foldedStack(cols) {
  const v = vm(0.03);
  cols.forEach((c, i) => each(-6, 6, i * 2, i * 2 + 1, -4, 4, (x, y, z) => { if (Math.abs(x) === 6 && y % 2 === 1) return; v.set(x, y, z, y % 2 === 1 && Math.abs(z) === 4 ? T.shade(c, 0.9) : c); }));
  return v;
}

// ------------------------------------------------------------------ clothes on hangers
const CLOTH = new Map();
function clothMat(col, kind = 'plain', col2) {
  const k = `${col}|${kind}|${col2}`;
  if (!CLOTH.has(k)) CLOTH.set(k, texMat(T.cloth(col, kind, col2, CLOTH.size), 0.25));
  return CLOTH.get(k);
}
/** A garment hanging from a hook at the group's origin (facing +z): kind 'shirt' | 'coat' | 'dress' | 'pants' | 'happi'. */
function garment(kind, mat, o = {}) {
  const g = new THREE.Group();
  const wire = lam({ color: o.wood ? 0xb07a48 : 0x9aa0b0 });
  // the hanger: a hook and the shoulder bar
  box(g, 0.012, 0.05, 0.012, wire, 0, -0.05, 0, { cast: false });
  box(g, 0.4, 0.018, 0.02, wire, 0, -0.075, 0, { cast: false });
  const top = -0.07;
  if (kind === 'pants') {
    box(g, 0.34, 0.5, 0.035, mat, 0, top - 0.5, 0);
    box(g, 0.012, 0.47, 0.037, lam({ color: 0x2c3a58 }), 0, top - 0.48, 0, { cast: false }); // the crease between the legs
    return g;
  }
  const len = kind === 'coat' ? 0.92 : kind === 'dress' ? 0.88 : kind === 'happi' ? 0.62 : 0.66;
  box(g, 0.42, 0.07, 0.07, mat, 0, top - 0.07, 0); // shoulders
  if (kind === 'dress') {
    box(g, 0.32, 0.3, 0.06, mat, 0, top - 0.37, 0);
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.3, len - 0.3, 4, 1), mat);
    skirt.rotation.y = Math.PI / 4; skirt.scale.set(1, 1, 0.3);
    skirt.position.set(0, top - 0.37 - (len - 0.3) / 2, 0);
    skirt.castShadow = skirt.receiveShadow = true;
    g.add(skirt);
  } else box(g, 0.38, len - 0.07, 0.065, mat, 0, top - len, 0);
  if (kind !== 'dress') {
    const sl = kind === 'happi' ? 0.3 : 0.5;
    for (const s of [-1, 1]) box(g, 0.09, sl, 0.055, mat, s * 0.235, top - 0.05 - sl, 0, { rz: s * 0.12 });
  }
  if (o.collar != null) for (const s of [-1, 1]) box(g, 0.07, 0.06, 0.02, lam({ color: o.collar }), s * 0.045, top - 0.12, 0.036, { rz: s * 0.5, cast: false });
  if (o.band != null) for (const s of [-1, 1]) box(g, 0.05, len - 0.1, 0.012, lam({ color: o.band }), s * 0.06, top - len + 0.02, 0.038, { cast: false });
  return g;
}

// ------------------------------------------------------------------ the room
export function buildRoom() {
  const group = new THREE.Group();
  group.name = 'dressing-room';
  const floorM = texMat(T.floorboards(), 2);
  const wallM = texMat(T.plaster(), 1);
  const trimM = texMat(T.wood(0xc8986a, 3), 1);
  const ceilM = texMat(T.ceiling(), 1);

  // ---- floor, walls, ceiling
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(9, 8), floorM);
  { const uv = fl.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 9, uv.getY(i) * 8); }
  fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, 2); fl.receiveShadow = true;
  group.add(fl);
  const H = 2.46, X0 = -4.5, X1 = 4.5;
  quad(group, X0, 0, WIN.x0 - X0, H, WALL, wallM);
  quad(group, WIN.x1, 0, X1 - WIN.x1, H, WALL, wallM);
  quad(group, WIN.x0, 0, WIN.x1 - WIN.x0, WIN.y0, WALL, wallM);
  quad(group, WIN.x0, WIN.y1, WIN.x1 - WIN.x0, H - WIN.y1, WALL, wallM);
  for (const sx of [-1, 1]) { const w = quad(group, -2, 0, 4.2, H, 0, wallM); w.rotation.y = -sx * Math.PI / 2; w.position.set(sx * 3.4, H / 2, WALL + 2.1); }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(9, 6), ceilM);
  { const uv = ceil.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 9, uv.getY(i) * 6); }
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, 1); group.add(ceil);
  // skirting (habaki) and the picture rail (nageshi)
  box(group, 9, 0.075, 0.018, trimM, 0, 0, WALL + 0.009, { cast: false });
  box(group, 9, 0.055, 0.035, trimM, 0, 1.99, WALL + 0.017);

  // ---- the window: a deep reveal, an aluminium sash slid half open, the view, a sill, a lace curtain tied back
  const W = WIN, ww = W.x1 - W.x0, wh = W.y1 - W.y0, rev = 0.14;
  const revM = lam({ color: 0xead8b8 });
  box(group, ww + 0.02, 0.012, rev, revM, (W.x0 + W.x1) / 2, W.y1 - 0.012, WALL - rev / 2, { cast: false });
  box(group, 0.012, wh, rev, revM, W.x0, W.y0, WALL - rev / 2, { cast: false });
  box(group, 0.012, wh, rev, revM, W.x1, W.y0, WALL - rev / 2, { cast: false });
  const view = new THREE.Mesh(new THREE.PlaneGeometry(ww * 1.5, wh * 1.36), new THREE.MeshBasicMaterial({ map: T.tex(T.windowView(), { wrap: false }) }));
  view.position.set((W.x0 + W.x1) / 2 + 0.06, (W.y0 + W.y1) / 2 + 0.02, WALL - 0.36);
  group.add(view);
  const alu = lam({ color: 0xb8bcc6 }), alu2 = lam({ color: 0xa2a6b4 });
  const fz = WALL - 0.07;
  box(group, ww, 0.035, 0.05, alu, (W.x0 + W.x1) / 2, W.y0, fz, { cast: false });
  box(group, ww, 0.035, 0.05, alu, (W.x0 + W.x1) / 2, W.y1 - 0.035, fz, { cast: false });
  box(group, 0.035, wh, 0.05, alu, W.x0 + 0.017, W.y0, fz, { cast: false });
  box(group, 0.035, wh, 0.05, alu, W.x1 - 0.017, W.y0, fz, { cast: false });
  // both panes on the left half (one slid behind the other): their stiles, a crescent lock, faintly blue glass
  const pw = ww / 2 + 0.02;
  for (const [x, z, m] of [[W.x0 + pw / 2 + 0.02, fz - 0.012, alu2], [W.x0 + pw / 2 + 0.09, fz + 0.012, alu]]) {
    box(group, 0.03, wh - 0.06, 0.022, m, x - pw / 2 + 0.015, W.y0 + 0.03, z, { cast: false });
    box(group, 0.03, wh - 0.06, 0.022, m, x + pw / 2 - 0.015, W.y0 + 0.03, z, { cast: false });
    box(group, pw, 0.03, 0.022, m, x, W.y0 + 0.03, z, { cast: false });
    box(group, pw, 0.03, 0.022, m, x, W.y1 - 0.06, z, { cast: false });
  }
  box(group, 0.03, 0.03, 0.012, lam({ color: 0xd8b84a }), W.x0 + pw + 0.07, (W.y0 + W.y1) / 2, fz + 0.03, { cast: false });
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(pw - 0.04, wh - 0.1), new THREE.MeshBasicMaterial({ color: 0xc4dcec, transparent: true, opacity: 0.22, depthWrite: false }));
  pane.position.set(W.x0 + pw / 2 + 0.06, (W.y0 + W.y1) / 2, fz + 0.002);
  group.add(pane);
  box(group, ww + 0.16, 0.025, 0.12, trimM, (W.x0 + W.x1) / 2, W.y0 - 0.025, WALL + 0.03); // the sill
  // the lace curtain on its rod, gathered to the right and tied with a ribbon
  box(group, ww + 0.34, 0.016, 0.016, lam({ color: 0xc8a070 }), (W.x0 + W.x1) / 2, W.y1 + 0.06, WALL + 0.07, { cast: false });
  const laceM = lam({ map: T.tex(T.lace(), { wrap: false }), alphaTest: 0.5, side: THREE.DoubleSide });
  const cw = 0.34, panels = 6, curtain = new THREE.Group();
  for (let i = 0; i < panels; i++) {
    const pg = new THREE.PlaneGeometry(cw / panels * 1.25, wh + 0.16);
    const uv = pg.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setX(k, (i + uv.getX(k)) / panels);
    const m = new THREE.Mesh(pg, laceM);
    m.rotation.y = i % 2 ? 0.55 : -0.55;
    m.position.set((i + 0.5) * cw / panels, -(wh + 0.16) / 2, i % 2 ? 0.012 : 0);
    m.castShadow = true; m.receiveShadow = true;
    curtain.add(m);
  }
  curtain.position.set(W.x1 - cw + 0.12, W.y1 + 0.06, WALL + 0.08);
  group.add(curtain);
  box(group, 0.22, 0.03, 0.06, lam({ color: 0xe0788a }), W.x1 - cw / 2 + 0.12, W.y0 + 0.36, WALL + 0.1, { cast: false });

  // ---- the shoe shelf under the window, a paper lamp and a pothos on top
  const shelfM = texMat(T.wood(0xc49060, 5), 1);
  const sx0 = 0.12, sw = 1.3, sd = 0.3, sz = WALL + sd / 2 + 0.01;
  for (const y of [0.02, 0.22, 0.42]) box(group, sw, 0.022, sd, shelfM, sx0 + sw / 2, y, sz);
  for (const x of [sx0 + 0.012, sx0 + sw - 0.012]) box(group, 0.024, 0.44, sd, shelfM, x, 0, sz);
  const shoes = [['sneaker', 0xd8443a, 0xf4ecdc, 0.38, 0.044], ['loafer', 0x6a4430, 0x5a3a28, 0.86, 0.044], ['geta', 0xc8302a, 0, 1.18, 0.044], ['sneaker', 0x3a6ab8, 0xf4ecdc, 0.52, 0.244], ['sneaker', 0xf2ece0, 0xc8302a, 1.02, 0.244]];
  for (const [kind, col, col2, x, y] of shoes) for (const s of [-1, 1]) {
    const m = voxMesh(shoeModel(kind, col, col2), 0.021);
    m.position.set(x + s * 0.065, y, sz + 0.01); m.rotation.y = s * 0.06;
    group.add(m);
  }
  for (const s of [-1, 1]) { const m = voxMesh(shoeModel('boot', 0xf2c430, 0x3a3a40), 0.022); m.position.set(1.58 + s * 0.07, 0, WALL + 0.24); m.rotation.y = 0.5 + s * 0.08; group.add(m); }
  // the paper lamp (an Akari-style washi shade on a wooden stand), lit
  const lampM = new THREE.MeshBasicMaterial({ map: T.tex(T.washi(), { wrap: false }) });
  const lamp = new THREE.Group();
  cyl(lamp, 0.08, 0.09, 0.03, 8, trimM, 0, 0, 0);
  cyl(lamp, 0.01, 0.01, 0.08, 6, trimM, 0, 0.03, 0);
  const shadeM = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 6), lampM);
  shadeM.scale.set(1, 1.25, 1); shadeM.position.y = 0.11 + 0.18; lamp.add(shadeM);
  cyl(lamp, 0.03, 0.03, 0.02, 8, trimM, 0, 0.47, 0, { cast: false });
  lamp.position.set(sx0 + sw - 0.2, 0.442, sz);
  group.add(lamp);
  const plant = voxMesh(plantModel(), 0.022);
  plant.position.set(sx0 + 0.2, 0.442, sz);
  group.add(plant);

  // ---- the wardrobe (left): walnut veneer, a cornice, two drawers, the right-hand door open on the clothes inside
  const wdM = texMat(T.wood(0x9a6440, 2), 1), wdD = texMat(T.wood(0x7a4c32, 4), 1), inM = lam({ color: 0x8a6448 });
  const brass = lam({ color: 0xd8b04a });
  const wd = new THREE.Group();
  const WW = 1.16, WH = 1.94, WD = 0.56;
  box(wd, 0.03, WH - 0.08, WD, wdM, -WW / 2 + 0.015, 0.08, 0);
  box(wd, 0.03, WH - 0.08, WD, wdM, WW / 2 - 0.015, 0.08, 0);
  box(wd, WW + 0.06, 0.06, WD + 0.05, wdD, 0, WH - 0.04, 0.012); // cornice
  box(wd, WW, 0.08, WD - 0.04, wdD, 0, 0, -0.01); // plinth
  box(wd, WW - 0.06, WH - 0.12, 0.02, inM, 0, 0.08, -WD / 2 + 0.01, { cast: false }); // back
  box(wd, WW - 0.06, 0.025, WD - 0.04, wdM, 0, 0.44, 0); // over the drawers
  box(wd, WW - 0.06, 0.02, WD - 0.06, inM, 0, 1.6, -0.01); // the hat shelf
  box(wd, 0.02, 1.12, WD - 0.06, inM, 0, 0.465, -0.01, { cast: false }); // the middle partition
  cyl(wd, 0.012, 0.012, WW / 2 - 0.08, 6, brass, WW / 4, 1.5, 0, { rz: Math.PI / 2, cast: false }); // hanging rail
  wd.children.at(-1).position.set(WW / 4, 1.5, 0);
  for (let i = 0; i < 2; i++) {
    box(wd, WW - 0.08, 0.17, 0.025, wdM, 0, 0.09 + i * 0.18, WD / 2 - 0.0125);
    for (const s of [-1, 1]) box(wd, 0.06, 0.018, 0.02, brass, s * 0.26, 0.17 + i * 0.18, WD / 2 + 0.01, { cast: false });
  }
  // doors: a raised panel each, a small brass knob; the left one shut, the right one swung open toward the room
  const door = (open) => {
    const d = new THREE.Group(), dw = WW / 2 - 0.03, dh = WH - 0.56;
    box(d, dw, dh, 0.025, wdM, open ? -dw / 2 : dw / 2, 0, 0);
    const px = open ? -dw / 2 : dw / 2;
    for (const [w, h, x, y] of [[dw - 0.08, 0.03, 0, 0.06], [dw - 0.08, 0.03, 0, dh - 0.09], [0.03, dh - 0.12, -dw / 2 + 0.055, 0.06], [0.03, dh - 0.12, dw / 2 - 0.055, 0.06]]) box(d, w, h, 0.012, wdD, px + x, y, 0.018, { cast: false });
    box(d, 0.022, 0.05, 0.022, brass, open ? -dw + 0.05 : dw - 0.05, dh * 0.48, 0.022, { cast: false });
    if (open) { // a mirror strip on the inside of the open door
      const m = new THREE.Mesh(new THREE.PlaneGeometry(dw - 0.16, dh - 0.3), lam({ map: T.tex(T.glass(), { wrap: false }) }));
      m.position.set(-dw / 2, dh / 2, -0.014); m.rotation.y = Math.PI; m.receiveShadow = true; d.add(m);
    }
    return d;
  };
  const dl = door(false); dl.position.set(-WW / 2 + 0.03, 0.47, WD / 2 - 0.0125); wd.add(dl);
  const dr = door(true); dr.position.set(WW / 2 - 0.03, 0.47, WD / 2 - 0.0125); dr.rotation.y = -1.95; wd.add(dr);
  // inside: clothes on the rail, folded jumpers on the shelf, a hat box on top
  const inner = [['coat', clothMat(0x8a5a3a, 'plain'), { collar: 0x6a4028 }], ['shirt', clothMat(0xf0e4d0, 'stripe', 0x8aa8d8)], ['dress', clothMat(0xe89aa8, 'flower', 0xfff2e4)], ['shirt', clothMat(0x4a6a9a, 'denim')], ['happi', clothMat(0x2a3f78, 'plain'), { band: 0xc8302a }]];
  inner.forEach(([k, m, o], i) => { const gg = garment(k, m, o); gg.position.set(WW / 2 - 0.1 - i * 0.075, 1.5, 0.02 - i * 0.012); gg.rotation.y = -1.25 + i * 0.05; wd.add(gg); });
  const st = voxMesh(foldedStack([0xc8604a, 0xe8c87a, 0x7aa0c8, 0xf0e6d4]), 0.022); st.position.set(WW / 4, 1.622, 0.02); wd.add(st);
  const st2 = voxMesh(foldedStack([0x9ab888, 0xd8a8c0]), 0.022); st2.position.set(-WW / 4, 1.622, 0.02); wd.add(st2);
  const hb = voxMesh(hatBoxModel(), 0.022); hb.position.set(-0.22, WH + 0.02, 0); wd.add(hb);
  wd.position.set(-1.72, 0, WALL + WD / 2 + 0.01);
  group.add(wd);

  // ---- the cheval mirror, angled toward you
  const mfM = texMat(T.wood(0xb67e4c, 7), 1);
  const mir = new THREE.Group();
  for (const s of [-1, 1]) { box(mir, 0.04, 1.62, 0.04, mfM, s * 0.29, 0.05, 0); box(mir, 0.06, 0.04, 0.4, mfM, s * 0.29, 0, 0); }
  const plate = new THREE.Group();
  box(plate, 0.5, 1.28, 0.03, mfM, 0, -0.64, 0);
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 1.2), lam({ map: T.tex(T.glass(), { wrap: false }) }));
  gl.position.set(0, 0, 0.016); gl.receiveShadow = true; plate.add(gl);
  plate.position.y = 1.0; plate.rotation.x = -0.07; mir.add(plate);
  for (const s of [-1, 1]) box(mir, 0.03, 0.03, 0.03, brass, s * 0.27, 0.985, 0, { cast: false });
  mir.position.set(-0.68, 0, WALL + 0.42); mir.rotation.y = 0.32;
  group.add(mir);

  // ---- a calendar pinned inside the wardrobe's open door, over the mirror strip
  const cal = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.3), lam({ map: T.tex(T.calendar(), { wrap: false }) }));
  cal.position.set(-0.27, 1.12, -0.017); cal.rotation.y = Math.PI; cal.receiveShadow = true; dr.add(cal);

  // ---- the hat stand (right of the window): a turned pole, pegs, a straw hat, a scarf and a tote
  const hs = new THREE.Group();
  cyl(hs, 0.022, 0.026, 1.72, 8, trimM, 0, 0, 0);
  cyl(hs, 0.04, 0.03, 0.05, 8, trimM, 0, 1.72, 0);
  for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; const f = box(hs, 0.03, 0.03, 0.3, trimM, Math.sin(a) * 0.13, 0, Math.cos(a) * 0.13); f.rotation.y = a; }
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; const pg = box(hs, 0.016, 0.016, 0.16, trimM, Math.sin(a) * 0.07, 1.56, Math.cos(a) * 0.07, { cast: false }); pg.rotation.set(-0.5 * Math.cos(a), a, 0, 'YXZ'); }
  const hat = voxMesh(VX.strawhat(), 0.0118, 'center'); hat.position.set(0.02, 1.76, 0.02); hat.rotation.set(0.25, 0.4, -0.2); hs.add(hat);
  const scarf = clothMat(0xd85a5a, 'knit');
  box(hs, 0.07, 0.62, 0.02, scarf, -0.09, 1.0, 0.07, { rz: 0.06 });
  box(hs, 0.07, 0.5, 0.02, scarf, -0.02, 1.08, 0.1, { rz: -0.04 });
  const tote = new THREE.Group();
  box(tote, 0.3, 0.32, 0.05, clothMat(0xe6d6b4, 'plain'), 0, -0.48, 0);
  box(tote, 0.02, 0.18, 0.012, lam({ color: 0xb89a6a }), -0.08, -0.17, 0, { rz: 0.35, cast: false });
  box(tote, 0.02, 0.18, 0.012, lam({ color: 0xb89a6a }), 0.08, -0.17, 0, { rz: -0.35, cast: false });
  box(tote, 0.1, 0.1, 0.004, lam({ color: 0x8ab06a }), 0.04, -0.34, 0.027, { cast: false });
  tote.position.set(0.1, 1.56, -0.05); tote.rotation.y = 0.7; hs.add(tote);
  hs.position.set(1.62, 0, WALL + 0.32);
  group.add(hs);

  // ---- the clothes rack in the right foreground: a chrome pipe frame on castors, a row of hangers
  const pipe = lam({ color: 0xc0c4d0 });
  const rk = new THREE.Group(), RL = 1.05, RH = 1.6;
  for (const s of [-1, 1]) {
    cyl(rk, 0.016, 0.016, RH, 6, pipe, s * RL / 2, 0.06, 0);
    box(rk, 0.03, 0.03, 0.46, pipe, s * RL / 2, 0.05, 0);
    for (const z of [-0.21, 0.21]) cyl(rk, 0.025, 0.025, 0.05, 6, lam({ color: 0x5a5a6a }), s * RL / 2, 0, z, { rx: Math.PI / 2 });
  }
  const bar = cyl(rk, 0.014, 0.014, RL, 6, pipe, 0, RH + 0.04, 0, { rz: Math.PI / 2 });
  bar.position.set(0, RH + 0.04, 0);
  const rackClothes = [
    ['coat', clothMat(0xf2c430, 'plain'), { collar: 0xe0a820 }], ['shirt', clothMat(0xf4ecdc, 'check', 0xd85a5a)], ['dress', clothMat(0x7ab0d8, 'dots', 0xf6efe0)],
    ['pants', clothMat(0x3a4c70, 'denim')], ['shirt', clothMat(0x9ac88a, 'plain'), { collar: 0xf2ecd8 }], ['happi', clothMat(0xb02a2a, 'plain'), { band: 0x1e1e26 }], ['coat', clothMat(0xc8b8d8, 'knit')],
  ];
  rackClothes.forEach(([k, m, o], i) => {
    const gg = garment(k, m, { ...o, wood: i % 3 === 0 });
    gg.position.set(-RL / 2 + 0.1 + i * 0.13, RH + 0.04, 0);
    gg.rotation.y = Math.PI / 2 - 0.25 + ((i * 37) % 7) * 0.05;
    rk.add(gg);
  });
  rk.position.set(1.75, 0, -0.55); rk.rotation.y = -0.95;
  group.add(rk);

  // ---- the rug you stand on
  const rugM = lam({ map: T.tex(T.rug(), { wrap: false }), alphaTest: 0.5 });
  const rugMesh = new THREE.Mesh(new THREE.CircleGeometry(0.62, 28), rugM);
  rugMesh.rotation.x = -Math.PI / 2; rugMesh.position.y = 0.004; rugMesh.receiveShadow = true;
  group.add(rugMesh);

  // ---- light: a soft lilac sky fill and a warm floor bounce, a cool fill from the right, and the afternoon sun through
  // the window behind you (its frame is only seen by the sun's shadow camera)
  const hemi = new THREE.HemisphereLight(0xdcd8f6, 0xb89a7c, 2.0);
  const fill = new THREE.DirectionalLight(0xe4e0ff, 0.6);
  fill.position.set(2.4, 2.2, 3.6);
  const sun = new THREE.DirectionalLight(0xffe4bc, 2.3);
  const L = new THREE.Vector3(-0.45, 0.55, 0.7).normalize(); // toward the sun: low, from the front left
  const target = new THREE.Vector3(0.02, 1.0, 0); // through you, onto the floor behind you and up the wall
  sun.position.copy(target).addScaledVector(L, 9);
  sun.target.position.copy(target);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const sc = sun.shadow.camera; sc.left = -3.6; sc.right = 3.6; sc.top = 3.4; sc.bottom = -3.4; sc.near = 1; sc.far = 18;
  sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.012;
  sc.layers.enableAll();
  for (const l of [hemi, fill, sun]) l.layers.enableAll();
  group.add(hemi, fill, sun, sun.target);
  // the window frame the sun comes through: a wall of shadow with a two-by-two sash in it
  const occ = new THREE.Group(), oM = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, colorWrite: false, depthWrite: false });
  const ow = 1.55, oh = 1.75, bar2 = 0.045;
  const slab = (w, h, x, y) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), oM); m.position.set(x, y, 0); m.castShadow = true; m.layers.set(LAYER.sunOnly); occ.add(m); };
  slab(12, 6, 0, oh / 2 + 3); slab(12, 6, 0, -oh / 2 - 3); slab(6, oh, -ow / 2 - 3, 0); slab(6, oh, ow / 2 + 3, 0);
  slab(bar2, oh, 0.05, 0); slab(ow, bar2, 0, -0.2);
  occ.position.copy(target).addScaledVector(L, 3.1);
  occ.lookAt(target);
  group.add(occ);
  // the beam's volume (for the dust motes): from the window down to the floor round you
  const beam = { from: occ.position.clone(), dir: L.clone().negate(), w: ow, h: oh, q: occ.quaternion.clone() };

  mergeStatic(group, new Set([rugMesh]));
  return { group, sun, hemi, fill, occ, rug: rugMesh, beam };
}

/** The set never moves: its plain meshes are merged into one per material (and shadow casting), so a frame is a few
 *  dozen draw calls instead of a few hundred. Voxel props (multi-material) and anything in `keep` stay as they are. */
function mergeStatic(root, keep) {
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert(), buckets = new Map(), done = [];
  root.traverse((o) => {
    if (!o.isMesh || keep.has(o) || Array.isArray(o.material) || o.layers.mask !== 1 << LAYER.room) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    g.applyMatrix4(o.matrixWorld.clone().premultiply(inv));
    const key = `${o.material.uuid}|${o.castShadow}|${o.receiveShadow}`;
    if (!buckets.has(key)) buckets.set(key, { mat: o.material, cast: o.castShadow, rec: o.receiveShadow, list: [] });
    buckets.get(key).list.push(g);
    done.push(o);
  });
  for (const o of done) o.removeFromParent();
  for (const { mat, cast, rec, list } of buckets.values()) {
    const m = new THREE.Mesh(list.length > 1 ? mergeGeometries(list) : list[0], mat);
    m.castShadow = cast; m.receiveShadow = rec;
    root.add(m);
  }
  // (empty groups left behind are harmless; their voxel children stay where they were)
}
