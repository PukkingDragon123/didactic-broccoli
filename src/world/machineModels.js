// Gacha machines as voxel art, after the real Japanese capsule-toy machines (Bandai Gashapon, Takara Tomy A.R.T.S
// and the old Yujin / Showa dagashi-ya units): a stackable lower mechanism with the big crank dial, the chrome coin
// mech (slot + return lever), the price plate with its -/+ buttons, the capsule chute with a smoked flap and a tray,
// and a locked coin box; a clear capsule window with the display card (台紙) slotted in at the front; a top lid on
// hinges with a key lock (restocking) and a little sample topper. Older models carry grime, scuffs and sticker
// residue. 5 mm voxels, merged per part, with pixel-art decals for print.
// All dimensions in metres, machine-local: front = +z, origin = floor centre.
import * as THREE from 'three';
import { VoxelModel, metal, gloss, glow, glass } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { voxelMaterials } from '../voxel/materials.js';
import { C, shade, mix } from '../voxel/palette.js';
import { Pix, FONT_EN } from '../gfx/pix.js';
import { BANNER_W, BANNER_H } from '../gfx/banner.js';

export const VS = 0.005; // 5 mm voxels
const vx = (m) => Math.round(m / VS);

export const MACHINE_SPECS = {
  // Showa-era Yujin-style ¥100 unit on a fruit crate: cream enamel, red trim, chrome mech, decades of grime
  retro: {
    w: 0.34, d: 0.32, lowH: 0.36, caseH: 0.33, capH: 0.04, y0: 0.56, price: 100,
    dial: { x: -0.02, y: 0.215, ring: 0.075, knob: 0.05 }, slot: { dx: 0.082, y: 0.285 },
    outlet: { w: 0.12, y0: 0.025, y1: 0.105 }, tray: { w: 0.17, d: 0.12 },
    dome: { w: 0.24, h: 0.11, d: 0.16 },
    style: { body: 0xeadcc0, body2: 0xd2c19c, trim: 0xc8352a, ring: 0xc8352a, ringEdge: 0x8a2018, label: 0xa82a20, grip: 0xd8352a, glass: 0xfff4d6, inner: 0xf0e2c2, stand: 'crate', worn: true, header: 0xc8352a },
  },
  // modern Gashapon-style unit: white body, blue trim, steel stacking rack
  standard: {
    w: 0.36, d: 0.34, lowH: 0.37, caseH: 0.38, capH: 0.045, y0: 0.6, price: 300,
    dial: { x: -0.025, y: 0.22, ring: 0.082, knob: 0.055 }, slot: { dx: 0.088, y: 0.29 },
    outlet: { w: 0.13, y0: 0.025, y1: 0.115 }, tray: { w: 0.18, d: 0.13 },
    dome: { w: 0.28, h: 0.13, d: 0.18 },
    style: { body: 0xf3f3ef, body2: 0xd6d8da, trim: 0x2d5fc0, ring: 0x2d5fc0, ringEdge: 0x1a3c84, label: 0x2d5fc0, grip: 0x2d5fc0, glass: 0xf6fbff, inner: 0xe6eef8, stand: 'rack', header: 0x2d5fc0 },
  },
  // premium ¥500 unit: gloss black with gold trim, black cabinet
  deluxe: {
    w: 0.4, d: 0.38, lowH: 0.38, caseH: 0.42, capH: 0.05, y0: 0.56, price: 500,
    dial: { x: -0.02, y: 0.215, ring: 0.088, knob: 0.06 }, slot: { dx: 0.1, y: 0.3 },
    outlet: { w: 0.15, y0: 0.025, y1: 0.12 }, tray: { w: 0.2, d: 0.14 },
    dome: { w: 0.32, h: 0.14, d: 0.2 },
    style: { body: 0x23201f, body2: 0x161414, trim: 0xd8b04a, ring: 0x3a3330, ringEdge: 0xd8b04a, label: 0xb8902e, grip: 0xd8b04a, glass: 0xf8fbff, inner: 0x2c2826, stand: 'cabinet', gold: true, header: 0x23201f, dark: true },
  },
  // big-capsule display tower: chrome and pearl white, pink and cyan neon, crown on the topper
  royal: {
    w: 0.44, d: 0.4, lowH: 0.4, caseH: 0.46, capH: 0.055, y0: 0.52, price: 1000,
    dial: { x: -0.03, y: 0.23, ring: 0.092, knob: 0.062 }, slot: { dx: 0.112, y: 0.315 },
    outlet: { w: 0.16, y0: 0.025, y1: 0.13 }, tray: { w: 0.22, d: 0.15 },
    dome: { w: 0.36, h: 0.16, d: 0.22 },
    style: { body: 0xf6f0f4, body2: 0xd8ccd6, trim: 0xd24fa8, ring: 0xd24fa8, ringEdge: 0x8a2a70, label: 0xb83a90, grip: 0xc8ccd4, chromeGrip: true, glass: 0xfff8fe, inner: 0xf8e6f2, stand: 'tower', led: 0xff6fd0, led2: 0x6fd8ff, crown: true, header: 0xd24fa8 },
  },
};

/** Machine layout (metres), shared by the models, the game logic and the first-person hands. */
export function layout(spec) {
  const { w, d, y0, lowH, capH } = spec;
  const caseH = spec.caseH;
  const fz = d / 2;
  // the display card hangs at the top front of the window, capsules show below it (like the real ones)
  const bw = Math.min(w - 0.05, spec.caseH * 0.62 * (BANNER_W / BANNER_H));
  const bh = bw * (BANNER_H / BANNER_W);
  const bannerZ = fz - 0.02;
  const caseY0 = y0 + lowH;
  const top = caseY0 + caseH + capH;
  const slot = { x: w / 2 - spec.slot.dx, y: y0 + spec.slot.y, z: fz + 0.012 };
  const O = { x0: -spec.outlet.w / 2, x1: spec.outlet.w / 2, y0: y0 + spec.outlet.y0, y1: y0 + spec.outlet.y1, z: fz };
  return {
    ...spec,
    caseH, ext: 0,
    h: lowH + caseH + capH,
    front: fz,
    caseY0,
    window: { x0: -w / 2 + 0.016, x1: w / 2 - 0.016, y0: caseY0 + 0.004, y1: caseY0 + caseH - 0.006, z0: -fz + 0.02, z1: bannerZ - 0.008 },
    banner: { w: bw, h: bh, x: 0, y: caseY0 + caseH - 0.014 - bh / 2, z: bannerZ },
    handle: { x: spec.dial.x, y: y0 + spec.dial.y, z: fz + VS * 2, r: spec.dial.knob },
    slot,
    // price plate under the coin mech, its -/+ buttons below it
    plate: { x: slot.x, y: slot.y - 0.07, w: 0.068, h: 0.03, z: fz + VS * 2 },
    buttons: { y: slot.y - 0.106, dx: 0.02 },
    outlet: O,
    // coin box: a locked drawer to the right of the chute
    coinBox: { x0: O.x1 + 0.016, x1: w / 2 - 0.018, y0: y0 + 0.02, y1: y0 + spec.outlet.y1 + 0.005, z: fz, depth: 0.11 },
    tray: { x0: -spec.tray.w / 2, x1: spec.tray.w / 2, z0: fz - 0.02, z1: fz + spec.tray.d, y: y0 + spec.outlet.y0 - 0.005, wall: 0.035 },
    hook: { x: w / 2 + 0.012, y: y0 + spec.dial.y + 0.02, z: fz - 0.05 },
    // lid hinge (back top edge of the window)
    lid: { y: caseY0 + caseH, z: -fz - VS, h: capH, lockX: w * 0.22 },
    dome: { ...spec.dome, y: top, z: -0.01 },
    top,
    domeTop: top + spec.dome.h + 0.012,
  };
}

// ----------------------------------------------------------------------------- helpers
const geoCache = new Map();
function geo(key, build, vs = VS, origin = 'none') {
  if (!geoCache.has(key)) geoCache.set(key, meshVoxels(build(), { voxelSize: vs, origin }));
  return geoCache.get(key);
}
const hash = (x, y, z, s = 0) => {
  let h = (x * 374761393 + y * 668265263 + z * 1274126177 + s * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const CHROME = 0xdfe4ea, DARK = 0x18171a, GOLD = 0xe2bc58;

/** Plastic for a machine (gloss enamel, or matte for the old worn ones). */
const plas = (st, c) => (st.worn ? c : gloss(c));
/** Grime for worn machines: darker blotches near the bottom and edges, rust specks, light scuffs. */
function grime(v, st, yMax) {
  if (!st.worn) return;
  v.recolor((x, y, z, c, mat) => {
    if (mat === 2 || mat === 3) return undefined;
    const h = hash(x >> 2, y >> 2, z >> 2, 3);
    const low = 1 - y / yMax;
    if (h < 0.05 + low * 0.1) return mix(c, 0x6a5440, 0.28 + h);
    if (h > 0.985) return mix(c, 0xa5532c, 0.55); // rust speck
    if (h > 0.96 && y % 7 === 0) return mix(c, 0xffffff, 0.25); // scuff
    return undefined;
  });
}

/** Old machines: a hand-painted wobble in the colour, in 4-voxel patches quantised so the faces still merge. */
function worn(v, st) {
  v.jitter = st.worn ? 0.016 : 0;
  v.jitterBlock = 4;
  v.quantize = st.worn ? 10 : 0;
}

/** A rounded rectangle (in x/y) proud of the front face at z, depth dz. */
function plateXY(v, cx, cy, w, h, z, dz, c, r = 1) {
  for (let x = cx - w; x <= cx + w; x++) for (let y = cy - h; y <= cy + h; y++) {
    const ex = Math.max(0, Math.abs(x - cx) - (w - r)), ey = Math.max(0, Math.abs(y - cy) - (h - r));
    if (ex * ex + ey * ey > r * r + 0.3) continue;
    for (let k = 0; k < dz; k++) v.set(x, y, z + k, c);
  }
}

// ----------------------------------------------------------------------------- lower unit (coin mechanism)
function bodyModel(type) {
  const spec = MACHINE_SPECS[type], st = spec.style, L = layout(spec);
  const v = new VoxelModel();
  worn(v, st);
  const W = vx(spec.w), H = vx(spec.lowH), Dd = vx(spec.d);
  const x0 = -W / 2, x1 = W / 2 - 1, z0 = -Dd / 2, z1 = Dd / 2 - 1;
  const B = plas(st, st.body), B2 = plas(st, st.body2), T = plas(st, st.trim);
  v.hollowBox(x0, 0, z0, x1, H - 1, z1, B, 2);
  // rounded vertical edges
  for (let y = 0; y < H; y++) for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) v.set(x, y, z, null);
  // darker kick skirt and a trim band at the top lip
  v.paint(() => v.box(x0, 0, z0, x1, 3, z1, B2));
  v.hollowBox(x0 - 1, H - 3, z0 - 1, x1 + 1, H - 1, z1 + 1, T, 1, ['top', 'bottom']);
  for (const [x, z] of [[x0 - 1, z0 - 1], [x1 + 1, z0 - 1], [x0 - 1, z1 + 1], [x1 + 1, z1 + 1]]) for (let y = H - 3; y < H; y++) v.set(x, y, z, null);
  const yo = (m) => vx(m - spec.y0); // machine height (m) -> body voxel y
  const F = z1 + 1; // first voxel layer in front of the face
  // --- capsule chute: a dark tunnel with a chrome lip
  const O = L.outlet;
  const ox0 = vx(O.x0), ox1 = vx(O.x1) - 1, oy0 = yo(O.y0), oy1 = yo(O.y1) - 1, oz0 = z1 - vx(0.15);
  v.box(ox0 - 1, oy0 - 1, oz0 - 1, ox1 + 1, oy1 + 1, z1, DARK);
  v.box(ox0, oy0, oz0, ox1, oy1, z1, null);
  for (let x = ox0 - 2; x <= ox1 + 2; x++) for (let y = oy0 - 2; y <= oy1 + 2; y++) {
    if (x >= ox0 && x <= ox1 && y >= oy0 && y <= oy1) continue;
    v.set(x, y, F, metal(st.worn ? 0xb8b2a4 : CHROME));
  }
  // --- dial boss with a chrome bezel; the printed ring is a decal around it
  const dx = vx(spec.dial.x), dy = yo(L.handle.y), rb = vx(spec.dial.knob) + 2;
  for (let x = dx - rb - 1; x <= dx + rb + 1; x++) for (let y = dy - rb - 1; y <= dy + rb + 1; y++) {
    const d = Math.hypot(x - dx + 0.5, y - dy + 0.5);
    if (d <= rb - 0.4) v.set(x, y, F, B2);
    else if (d <= rb + 0.9) { v.set(x, y, F, metal(st.gold ? GOLD : CHROME)); v.set(x, y, F + 1, metal(st.gold ? GOLD : CHROME)); }
  }
  // --- coin mech: chrome plate with the slot, a return lever and its little window
  const sx = vx(L.slot.x), sy = yo(L.slot.y);
  plateXY(v, sx, sy, 5, 7, F, 1, metal(st.gold ? GOLD : CHROME), 2);
  plateXY(v, sx, sy, 3, 5, F + 1, 1, metal(st.worn ? 0xc8c2b4 : 0xf0f2f4), 1);
  for (let y = sy - 3; y <= sy + 3; y++) v.set(sx, y, F + 1, DARK);
  v.box(sx - 9, sy - 3, F, sx - 7, sy + 1, F, metal(CHROME)); // return lever housing
  v.box(sx - 9, sy - 2, F + 1, sx - 7, sy - 1, F + 2, gloss(st.trim)); // lever
  // --- price plate frame (the digits are a live texture)
  const P = L.plate, px = vx(P.x), py = yo(P.y), pw = vx(P.w / 2), ph = vx(P.h / 2);
  plateXY(v, px, py, pw + 1, ph + 1, F, 1, st.dark ? 0x0c0c0c : 0x2a2a2e, 1);
  // --- coin box drawer opening: dark seam around it (the drawer itself moves)
  const CB = L.coinBox, cx0 = vx(CB.x0), cx1 = vx(CB.x1) - 1, cy0 = yo(CB.y0), cy1 = yo(CB.y1) - 1;
  v.box(cx0 - 1, cy0 - 1, z1 - 1, cx1 + 1, cy1 + 1, z1, DARK);
  v.box(cx0, cy0, z1 - vx(CB.depth) - 1, cx1, cy1, z1, null);
  v.box(cx0 - 1, cy0 - 1, z1 - vx(CB.depth) - 2, cx1 + 1, cy0 - 1, z1 - 2, DARK); // the drawer runner floor
  // --- sides: recessed carry grips (stackable units), vents, rivets
  for (const sxx of [x0, x1]) {
    const gy = Math.round(H * 0.62);
    v.box(sxx, gy, -6, sxx, gy + 2, 6, DARK);
    for (let i = 0; i < 4; i++) v.box(sxx, 8 + i * 3, -10, sxx, 8 + i * 3, 10, B2);
    for (const zz of [z0 + 4, z1 - 4]) for (const yy of [6, H - 7]) v.set(sxx + (sxx < 0 ? -1 : 1), yy, zz, metal(CHROME));
  }
  // --- stacking rails on the top surface around the window (the window sits inside them)
  grime(v, st, H);
  return v;
}

// ----------------------------------------------------------------------------- capsule window frame
function caseModel(type) {
  const spec = MACHINE_SPECS[type], st = spec.style;
  const v = new VoxelModel();
  worn(v, st);
  const W = vx(spec.w), H = vx(spec.caseH), Dd = vx(spec.d);
  const x0 = -W / 2, x1 = W / 2 - 1, z0 = -Dd / 2, z1 = Dd / 2 - 1;
  const B = plas(st, st.body), T = plas(st, st.trim);
  // back wall (the inner print is a decal) and the back corner posts
  v.box(x0, 0, z0, x1, H - 1, z0 + 1, plas(st, st.inner));
  for (const x of [x0, x1 - 1]) v.box(x, 0, z0, x + 1, H - 1, z0 + 3, B);
  // bottom frame rail around the window (front corners stay clear: rounded acrylic)
  v.box(x0, 0, z0, x1, 1, z1, T);
  v.box(x0 + 2, 0, z0 + 2, x1 - 2, 1, z1 - 2, null);
  for (const [x, z] of [[x0, z1], [x1, z1]]) v.box(x, 0, z, x, 1, z, null);
  // the floor of the window
  v.box(x0 + 2, 0, z0 + 2, x1 - 2, 0, z1 - 2, plas(st, shade(st.inner, 0.94)));
  // display card holder: a slot rail at the front, top and bottom (the card slides in from above)
  const L = layout(spec);
  const bw = Math.round(vx(L.banner.w) / 2) + 1, bz = vx(spec.d / 2 - 0.02);
  const by0 = vx(L.banner.y - L.banner.h / 2 - spec.y0 - spec.lowH) - 1, by1 = vx(L.banner.y + L.banner.h / 2 - spec.y0 - spec.lowH);
  for (const y of [by0, by1]) { v.box(-bw, y, bz - 1, bw - 1, y, bz - 1, glass(0xe8f0f4)); v.box(-bw, y, bz + 1, bw - 1, y, bz + 1, glass(0xe8f0f4)); }
  v.box(-bw - 1, by0, bz - 1, -bw - 1, by1, bz + 1, glass(0xe8f0f4));
  v.box(bw, by0, bz - 1, bw, by1, bz + 1, glass(0xe8f0f4));
  if (st.led) {
    // neon strips up the front edges of the window
    for (const x of [x0, x1]) v.box(x, 2, z1 - 1, x, H - 1, z1 - 1, glow(x < 0 ? st.led : st.led2));
  }
  grime(v, st, H * 2);
  return v;
}

// ----------------------------------------------------------------------------- lid (hinged top, key lock)
function lidModel(type) {
  const spec = MACHINE_SPECS[type], st = spec.style;
  const v = new VoxelModel();
  worn(v, st);
  const W = vx(spec.w), H = vx(spec.capH), Dd = vx(spec.d);
  const x0 = -W / 2 - 1, x1 = W / 2, z0 = -Dd / 2 - 1, z1 = Dd / 2;
  const B = plas(st, st.body), T = plas(st, st.header);
  // lid coordinates: y from 0 (bottom of the lid) up, same x / z as the machine
  v.box(x0, 0, z0, x1, H - 1, z1, B);
  // rounded top edges
  for (let x = x0; x <= x1; x++) { v.set(x, H - 1, z0, null); v.set(x, H - 1, z1, null); }
  for (let z = z0; z <= z1; z++) { v.set(x0, H - 1, z, null); v.set(x1, H - 1, z, null); }
  // header band across the front (the printed label is a decal on it) and a darker lower lip
  v.paint(() => v.box(x0, 1, z1, x1, H - 3, z1, T));
  v.paint(() => v.box(x0, 0, z0, x1, 0, z1, plas(st, st.body2)));
  // key lock on the front, right of centre
  const lx = vx(layout(spec).lid.lockX), ly = Math.round(H / 2);
  for (let x = lx - 2; x <= lx + 1; x++) for (let y = ly - 2; y <= ly + 1; y++) v.set(x, y, z1 + 1, metal(st.gold ? GOLD : CHROME));
  v.set(lx - 1, ly, z1 + 2, DARK); v.set(lx - 1, ly - 1, z1 + 2, DARK);
  // hinge knuckles at the back
  for (const hx of [x0 + 6, x1 - 8]) for (let x = hx; x < hx + 3; x++) { v.set(x, 1, z0 - 1, metal(CHROME)); v.set(x, 2, z0 - 1, metal(CHROME)); }
  // stacking nubs on top
  for (const [x, z] of [[x0 + 4, z0 + 4], [x1 - 5, z0 + 4], [x0 + 4, z1 - 5], [x1 - 5, z1 - 5]]) v.box(x, H, z, x + 1, H, z + 1, plas(st, st.body2));
  if (st.led) v.box(x0 + 2, 0, z1 + 1, x1 - 2, 0, z1 + 1, glow(st.led));
  if (st.gold) v.box(x0, H - 2, z1 + 1, x1, H - 2, z1 + 1, metal(GOLD));
  grime(v, st, H * 4);
  return v;
}

/** Topper base under the sample display on the lid. */
function topperModel(type) {
  const spec = MACHINE_SPECS[type], st = spec.style;
  const v = new VoxelModel();
  v.jitter = 0;
  const W = vx(spec.dome.w + 0.012), Dd = vx(spec.dome.d + 0.012);
  v.box(-W / 2, 0, -Dd / 2, W / 2 - 1, 1, Dd / 2 - 1, plas(st, st.body));
  v.paint(() => v.box(-W / 2, 1, Dd / 2 - 1, W / 2 - 1, 1, Dd / 2 - 1, plas(st, st.trim)));
  // corner posts of the acrylic hood
  const H = vx(spec.dome.h);
  for (const [x, z] of [[-W / 2, -Dd / 2], [W / 2 - 1, -Dd / 2], [-W / 2, Dd / 2 - 1], [W / 2 - 1, Dd / 2 - 1]]) v.box(x, 2, z, x, H + 1, z, plas(st, st.body2));
  v.hollowBox(-W / 2, H + 2, -Dd / 2, W / 2 - 1, H + 2, Dd / 2 - 1, plas(st, st.body), 1);
  return v;
}

/** Royal crown ornament for the topper. */
function crownModel() {
  const v = new VoxelModel();
  v.jitter = 0;
  const g = metal(C.gold);
  v.tube(0, 0, 0, 9, 7, 5, g, 'y');
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const x = Math.round(Math.cos(a) * 8), z = Math.round(Math.sin(a) * 8);
    v.box(x - 1, 5, z - 1, x + 1, 9, z + 1, g);
    v.set(x, 10, z, glow(i % 2 ? 0xff6fd0 : 0x6fd8ff));
  }
  v.sphere(0, 4, 0, 3, glow(0xff4fa0));
  return v;
}

// ----------------------------------------------------------------------------- moving parts
/** Coin box drawer: front panel with a key lock, a tray behind it (coins are instanced on top). */
function drawerModel(type) {
  const spec = MACHINE_SPECS[type], st = spec.style, L = layout(spec);
  const v = new VoxelModel();
  worn(v, st);
  const CB = L.coinBox;
  const w = vx(CB.x1 - CB.x0), h = vx(CB.y1 - CB.y0), dep = vx(CB.depth);
  // drawer coordinates: x 0..w-1, y 0..h-1, z from -dep (back) to 0 (front panel)
  v.box(0, 0, -1, w - 1, h - 1, 0, plas(st, st.body2));
  v.paint(() => v.box(1, 1, 0, w - 2, h - 2, 0, plas(st, st.body)));
  v.hollowBox(1, 0, -dep, w - 2, Math.round(h * 0.55), -2, metal(0x9aa0a8), 1, ['top']);
  const kx = Math.round(w * 0.7), ky = Math.round(h * 0.62);
  for (let x = kx - 1; x <= kx + 1; x++) for (let y = ky - 1; y <= ky + 1; y++) v.set(x, y, 1, metal(st.gold ? GOLD : CHROME));
  v.set(kx, ky, 2, DARK);
  v.box(2, h - 3, 1, Math.round(w * 0.45), h - 3, 1, metal(CHROME)); // finger pull
  return v;
}

/** The crank: a white dial with a chunky grip bar (colour per model). Centred on its axis, facing +z. */
function handleModel(type) {
  const spec = MACHINE_SPECS[type], st = spec.style;
  const v = new VoxelModel();
  v.jitter = 0;
  const R = vx(spec.dial.knob);
  const disc = st.dark ? gloss(0x2c2826) : gloss(0xf6f4ee);
  for (let x = -R; x < R; x++) for (let y = -R; y < R; y++) {
    const d = Math.hypot(x + 0.5, y + 0.5);
    if (d > R + 0.2) continue;
    v.set(x, y, 0, d > R - 1.2 ? (st.gold ? metal(GOLD) : disc) : disc);
    v.set(x, y, 1, disc);
  }
  const grip = st.chromeGrip ? metal(st.grip) : st.gold ? metal(GOLD) : gloss(st.grip);
  const gw = Math.max(2, Math.round(R * 0.22));
  v.box(-gw, -R + 2, 2, gw - 1, R - 3, 5, grip);
  // rounded bar ends
  for (const y of [-R + 2, R - 3]) for (const x of [-gw, gw - 1]) v.set(x, y, 5, null);
  // yellow arrow at the top of the bar (align it with the faceplate marks)
  v.box(-1, R - 6, 6, 0, R - 5, 6, gloss(0xffd23f));
  v.set(-1, R - 4, 6, gloss(0xffd23f)); v.set(0, R - 4, 6, gloss(0xffd23f));
  v.box(-1, -1, 6, 0, 0, 6, metal(CHROME)); // hub
  return v;
}

/** Smoked flap over the chute (hinged at its top edge). */
function flapModel(type) {
  const spec = MACHINE_SPECS[type];
  const v = new VoxelModel();
  v.jitter = 0;
  const w = vx(spec.outlet.w) - 2, h = vx(spec.outlet.y1 - spec.outlet.y0) - 2;
  v.box(-w / 2, -h, 0, w / 2 - 1, -1, 0, glass(0x8a96a4));
  v.box(-w / 2, -2, 0, w / 2 - 1, -1, 0, metal(CHROME)); // hinge strip
  return v;
}

/** Capsule tray under the chute. */
function trayModel(type) {
  const spec = MACHINE_SPECS[type], st = spec.style, L = layout(spec);
  const v = new VoxelModel();
  worn(v, st);
  const T = L.tray;
  const x0 = vx(T.x0), x1 = vx(T.x1) - 1, z0 = vx(T.z0), z1 = vx(T.z1) - 1, wall = vx(T.wall);
  const c = metal(st.worn ? 0xb8b2a4 : st.gold ? 0x3a3634 : CHROME);
  v.box(x0, -2, z0, x1, -1, z1, c);
  v.box(x0, 0, z0, x0, wall - 1, z1, c);
  v.box(x1, 0, z0, x1, wall - 1, z1, c);
  v.box(x0, 0, z1, x1, Math.round(wall * 0.75), z1, c);
  v.box(x0 + 1, -1, z0, x1 - 1, -1, z1 - 1, st.dark ? 0x101010 : 0x3a3a40); // rubber mat
  return v;
}

/** A -/+ button for the price plate. */
function buttonModel(sign, dark) {
  const v = new VoxelModel();
  v.jitter = 0;
  const col = sign > 0 ? 0x3cae5a : 0xe5383b;
  v.box(-2, -2, 0, 1, 1, 0, metal(dark ? 0x3a3634 : CHROME));
  v.box(-2, -2, 1, 1, 1, 1, gloss(col));
  v.box(-1, -1, 2, 0, 0, 2, gloss(col));
  // the sign, pressed into the face
  v.box(-2, -1, 2, 1, 0, 2, gloss(0xfbf8f2));
  if (sign > 0) v.box(-1, -2, 2, 0, 1, 2, gloss(0xfbf8f2));
  return v;
}

// ----------------------------------------------------------------------------- stands
/** Old fruit crate the Shōwa machine stands on. */
function retroCrate() {
  const v = new VoxelModel();
  v.jitter = 0.06;
  v.jitterBlock = 2;
  v.quantize = 12;
  const wood = 0xb88a52, dark = 0x7a5530;
  const TOP = 27;
  for (let y = 0; y <= TOP; y++) {
    const slat = y % 5 < 4 || y === TOP;
    for (let x = -14; x <= 13; x++) for (let z = -11; z <= 11; z++) {
      const edge = x === -14 || x === 13 || z === -11 || z === 11;
      const top = y === TOP;
      if ((edge && slat) || top) v.set(x, y, z, top ? (((x + 14) % 5 === 4) ? dark : wood) : wood);
    }
  }
  v.box(-14, 0, -11, -13, TOP, -10, dark); v.box(12, 0, -11, 13, TOP, -10, dark);
  v.box(-14, 0, 10, -13, TOP, 11, dark); v.box(12, 0, 10, 13, TOP, 11, dark);
  v.project(['RRR.R.R.RRR', 'R...R.R.R.R', 'RRR.RRR.RRR'], { R: 0xd86a2a }, -5, 16);
  return v;
}

/** Steel stacking rack (standard), black cabinet (deluxe) or chrome tower with neon (royal). 1 cm voxels. */
function standModel(type) {
  const spec = MACHINE_SPECS[type], st = spec.style;
  const v = new VoxelModel();
  const s = 0.01, W = Math.round((spec.w + 0.02) / s), D = Math.round((spec.d + 0.02) / s), H = Math.round(spec.y0 / s);
  const x0 = -W / 2, x1 = W / 2 - 1, z0 = -D / 2, z1 = D / 2 - 1;
  v.jitter = 0;
  if (st.stand === 'rack') {
    const steel = metal(0xb4bac2), dk = metal(0x7a828c);
    for (const [x, z] of [[x0, z0], [x1 - 1, z0], [x0, z1 - 1], [x1 - 1, z1 - 1]]) v.box(x, 0, z, x + 1, H - 1, z + 1, steel);
    for (const y of [3, H - 2]) { v.hollowBox(x0, y, z0, x1, y + 1, z1, steel, 2, ['top', 'bottom']); }
    v.box(x0 + 2, 4, z0 + 2, x1 - 2, 4, z1 - 2, dk); // lower shelf
    v.box(x0, H - 1, z0, x1, H - 1, z1, dk); // top plate
    // a carton of spare capsules on the shelf
    v.box(x0 + 4, 5, z0 + 4, x1 - 8, 18, z1 - 6, 0xc89a5f);
    v.box(x0 + 4, 18, -1, x1 - 8, 18, 1, 0xd8b88a); // tape
    v.project(['RRRRRRRR', 'R......R', 'RRRRRRRR'], { R: st.trim }, x0 + 6, 14);
    // adjustable feet
    for (const [x, z] of [[x0, z0], [x1 - 1, z0], [x0, z1 - 1], [x1 - 1, z1 - 1]]) v.box(x, 0, z, x + 1, 0, z + 1, 0x222222);
  } else {
    const dark = st.stand === 'cabinet';
    const body = dark ? gloss(0x1e1c1b) : metal(0xd8dde4), trim = dark ? metal(GOLD) : gloss(st.trim);
    v.box(x0, 2, z0, x1, H - 1, z1, body);
    v.box(x0 + 1, 0, z0 + 1, x1 - 1, 1, z1 - 1, 0x141414); // plinth
    v.paint(() => v.box(x0, H - 1, z0, x1, H - 1, z1, dark ? gloss(0x2a2624) : metal(0xeef0f4)));
    // front door with panel lines and a gold / chrome plate
    v.box(x0 + 3, 6, z1 + 1, x1 - 3, H - 6, z1 + 1, dark ? gloss(0x262322) : metal(0xe4e8ee));
    v.box(x0 + 3, 6, z1 + 1, x1 - 3, 6, z1 + 1, trim); v.box(x0 + 3, H - 6, z1 + 1, x1 - 3, H - 6, z1 + 1, trim);
    v.box(x0 + 3, 6, z1 + 1, x0 + 3, H - 6, z1 + 1, trim); v.box(x1 - 3, 6, z1 + 1, x1 - 3, H - 6, z1 + 1, trim);
    v.box(-1, H - 12, z1 + 2, 0, H - 10, z1 + 2, metal(dark ? GOLD : CHROME)); // key
    if (st.led) {
      v.box(x0, 2, z1 + 1, x1, 2, z1 + 1, glow(st.led));
      v.box(x0, H - 2, z1 + 1, x1, H - 2, z1 + 1, glow(st.led2));
      for (const x of [x0 - 1, x1 + 1]) v.box(x, 4, z1 - 1, x, H - 4, z1 - 1, glow(x < 0 ? st.led : st.led2));
    }
    // vents on the sides
    for (const x of [x0, x1]) for (let i = 0; i < 5; i++) v.box(x, 10 + i * 4, -6, x, 10 + i * 4, 6, dark ? 0x0c0c0c : 0x8a909a);
  }
  return v;
}

// ----------------------------------------------------------------------------- pixel-art decals
const decalCache = new Map();
const PXM = 600; // decal pixels per metre (6 px / cm)

/** Front print of the lower unit: dial ring with arrows, labels, instruction sticker (no prices: see the plate). */
function faceplateTexture(type) {
  if (decalCache.has('face:' + type)) return decalCache.get('face:' + type);
  const spec = MACHINE_SPECS[type], st = spec.style;
  const W = Math.round(spec.w * PXM), H = Math.round(spec.lowH * PXM);
  const p = new Pix(W, H, 3);
  const X = (m) => Math.round((m + spec.w / 2) * PXM), Y = (m) => Math.round((spec.lowH - m) * PXM);
  const cx = X(spec.dial.x), cy = Y(spec.dial.y);
  const R = Math.round(spec.dial.ring * PXM), r = Math.round((spec.dial.knob + 0.014) * PXM);
  const yellow = 0xffd23f;
  for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
    const d = Math.sqrt(x * x + y * y);
    if (d > R + 0.4 || d < r) continue;
    p.px(cx + x, cy + y, d > R - 1.6 || d < r + 1.2 ? st.ringEdge : st.ring);
  }
  const mid = (R + r) / 2;
  for (let s = 0; s < 4; s++) {
    const a0 = s * Math.PI / 2 + 0.35, a1 = a0 + Math.PI / 2 - 0.75;
    for (let a = a0; a <= a1; a += 0.01) for (let k = -1; k <= 1; k++) p.px(cx + Math.round(Math.cos(a) * (mid + k * 0.6)), cy + Math.round(Math.sin(a) * (mid + k * 0.6)), yellow);
    for (let t = 0; t < 6; t++) {
      const a = a1 + 0.012 * t, rr = 3.5 - t * 0.6;
      for (let k = -rr; k <= rr; k += 0.5) p.px(cx + Math.round(Math.cos(a) * (mid + k)), cy + Math.round(Math.sin(a) * (mid + k)), yellow);
    }
  }
  for (let t = 0; t < 6; t++) for (let k = -t; k <= t; k++) {
    p.px(cx - R + 3 + (5 - t), cy + Math.round(k * 0.7), yellow);
    p.px(cx + R - 3 - (5 - t), cy + Math.round(k * 0.7), yellow);
  }
  const lab = st.label, ink = st.dark ? 0xe8d8a8 : 0x1a1a1a;
  // "コイン投入口" above the coin mech
  const sx = X(spec.w / 2 - spec.slot.dx), sy = Y(spec.slot.y);
  const tw = Math.round(p.measure('コイン投入口', 10)) + 10;
  const tx0 = Math.min(W - tw - 4, Math.max(4, sx - Math.round(tw / 2))), ty0 = sy - 62;
  for (let j = 0; j < 14; j++) for (let i = 0; i < tw; i++) {
    const rx = i < 4 ? 4 - i : i > tw - 5 ? i - (tw - 5) : 0, ry = j < 4 ? 4 - j : j > 9 ? j - 9 : 0;
    if (rx * rx + ry * ry <= 16) p.px(tx0 + i, ty0 + j, lab);
  }
  p.text('コイン投入口', tx0 + tw / 2, ty0 + 1, { size: 10, color: 0xffffff, align: 'center' });
  // little label left of the plate: ねだん (price), and a hint under the -/+ buttons
  p.text('ねだん', sx - 36, Y(spec.slot.y - 0.07) - 5, { size: 8, color: ink, align: 'right' });
  // "とりだしぐち" above the chute, "COIN" over the coin box
  p.text('とりだしぐち', X(0), Y(spec.outlet.y1) - 13, { size: 8, color: st.dark ? 0xc8b890 : 0x6a6a6a, align: 'center' });
  const L = layout(spec);
  p.tinyText('COIN BOX', X((L.coinBox.x0 + L.coinBox.x1) / 2), Y(spec.outlet.y1 + 0.012) - 4, { color: st.dark ? 0xc8b890 : 0x5a5a5a, align: 'center' });
  // instruction sticker (bottom-left)
  const sw = 74, sh = 30, stx = 8, sty = Y(spec.outlet.y1) - sh - 22;
  p.rect(stx, sty, sw, sh, 0xfbf8f0);
  p.frame(stx, sty, sw, sh, 0x8a8a8a);
  p.text('▶◀印を合わせ', stx + 3, sty + 2, { size: 8, color: 0x1a1a1a });
  p.text('てからコインを', stx + 3, sty + 11, { size: 8, color: 0x1a1a1a });
  p.text('入れてください', stx + 3, sty + 20, { size: 8, color: 0x1a1a1a });
  if (st.worn) { p.flush(); p.pull(); for (let i = 0; i < p.d.length; i += 4) if (p.d[i + 3] && (i / 4) % 7 === 0 && Math.random() < 0.15) p.d[i + 3] = 0; p.dirty = true; }
  const t = p.texture();
  t.minFilter = THREE.LinearMipmapLinearFilter;
  decalCache.set('face:' + type, t);
  return t;
}

/** Header label on the front of the lid: CAPSULE TOYS + machine number. */
function capLabelTexture(type, no = 1) {
  const k = `cap:${type}:${no}`;
  if (decalCache.has(k)) return decalCache.get(k);
  const spec = MACHINE_SPECS[type], st = spec.style;
  const p = new Pix(160, 16, 4);
  p.fill(st.header);
  const ink = st.dark ? 0xe2bc58 : 0xffffff;
  p.text('CAPSULE TOYS', 6, 2, { size: 10, color: ink, font: FONT_EN });
  p.rect(112, 3, 42, 10, 0xffffff); p.frame(112, 3, 42, 10, 0x9a9a9a);
  p.text(`No.${String(no).padStart(3, '0')}`, 133, 2, { size: 8, color: 0x2a2a2a, align: 'center', font: FONT_EN });
  const t = p.texture();
  decalCache.set(k, t);
  return t;
}

/** Side stickers: a model badge, the age sticker and (old machines) peeled residue. */
function sideTexture(type) {
  const k = 'side:' + type;
  if (decalCache.has(k)) return decalCache.get(k);
  const spec = MACHINE_SPECS[type], st = spec.style;
  const W = Math.round(spec.d * PXM), H = Math.round(spec.lowH * PXM);
  const p = new Pix(W, H, 7);
  // big badge
  const bx = 14, by = 18, bw = W - 28, bh = 44;
  p.rect(bx, by, bw, bh, st.header);
  p.frame(bx + 2, by + 2, bw - 4, bh - 4, st.dark ? GOLD : 0xffffff);
  p.text('ガチャ', bx + bw / 2, by + 6, { size: 16, color: st.dark ? GOLD : 0xffffff, align: 'center' });
  p.tinyText(type === 'retro' ? 'SHOWA 100' : type === 'standard' ? 'GACHA STATION' : type === 'deluxe' ? 'DELUXE 500' : 'ROYAL', bx + bw / 2, by + 28, { color: st.dark ? GOLD : 0xffffff, align: 'center' });
  // age sticker
  const ax = 18, ay = H - 70;
  p.rect(ax, ay, 56, 26, 0xfff4b0); p.frame(ax, ay, 56, 26, 0xd8a020);
  p.text('対象年齢', ax + 28, ay + 2, { size: 8, color: 0x3a2a10, align: 'center' });
  p.text('15才以上', ax + 28, ay + 13, { size: 8, color: 0xd8282a, align: 'center' });
  if (st.worn) {
    // peeled sticker residue and tape marks
    p.rect(W - 70, H - 96, 44, 30, 0xf4ecd8, 200); p.rect(W - 66, H - 92, 14, 10, 0xe8dcc0);
    p.rect(30, 80, 30, 8, 0xe8dcb0, 160);
  }
  const t = p.texture();
  t.minFilter = THREE.LinearMipmapLinearFilter;
  decalCache.set(k, t);
  return t;
}

/** Back wall print inside the capsule window. */
function innerPrintTexture(color) {
  const k = 'inner:' + color;
  if (decalCache.has(k)) return decalCache.get(k);
  const p = new Pix(64, 64, 9);
  p.fill(color);
  for (let y = 0; y < 64; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < 64; x += 8) p.circle(x, y, 1, shade(color, color < 0x404040 ? 1.6 : 0.93));
  const t = p.texture({ repeat: [3, 3] });
  decalCache.set(k, t);
  return t;
}

/**
 * Live price plate texture: the price in big digits and the recommended price under it.
 * Returns { texture, draw(price, rec) }.
 */
export function pricePlate(type) {
  const st = MACHINE_SPECS[type].style;
  const p = new Pix(68, 30, 5);
  const tex = p.texture();
  const draw = (price, rec = null) => {
    p.fill(st.dark ? 0x0a0a0a : 0x1a1c1e);
    p.rect(1, 1, 66, 19, 0x0e2412);
    const s = `¥${price}`;
    const w = p.measure(s, 16, FONT_EN);
    p.text(s, Math.round(34 - w / 2), 1, { size: 16, color: 0x8dff98, font: FONT_EN });
    if (rec) p.tinyText(`REC ¥${rec}`, 34, 21, { color: price > rec * 1.25 ? 0xff8a6a : price < rec * 0.8 ? 0xffe08a : 0xc8d0c8, align: 'center' });
    else p.tinyText('PRICE', 34, 21, { color: 0x9aa09a, align: 'center' });
    p.flush();
    tex.needsUpdate = true;
  };
  return { texture: tex, draw };
}

// ----------------------------------------------------------------------------- clear plastic
const glassMats = new Map();
export function clearPlastic(tint = 0xf6fbff, opacity = 0.12) {
  const k = tint + ':' + opacity;
  if (!glassMats.has(k)) glassMats.set(k, new THREE.MeshPhysicalMaterial({ color: tint, transparent: true, opacity, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide }));
  return glassMats.get(k);
}

/** Clear window walls: front with rounded front corners, left and right sides (open top, back and bottom). */
function windowGeometry(w, d, h) {
  const s = new THREE.Shape();
  const hw = w / 2, hd = d / 2, rf = 0.022;
  s.moveTo(-hw, -hd + 0.012);
  s.lineTo(-hw, hd - rf);
  s.quadraticCurveTo(-hw, hd, -hw + rf, hd);
  s.lineTo(hw - rf, hd);
  s.quadraticCurveTo(hw, hd, hw, hd - rf);
  s.lineTo(hw, -hd + 0.012);
  const pts = s.getPoints(4);
  const pos = [], idx = [];
  pts.forEach((p, i) => { pos.push(p.x, 0, p.y, p.x, h, p.y); if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ----------------------------------------------------------------------------- assembly
const decalMat = new Map();
function dmat(map, opts = {}) {
  const k = map.uuid + JSON.stringify(opts);
  if (!decalMat.has(k)) decalMat.set(k, new THREE.MeshStandardMaterial({ map, alphaTest: 0.5, roughness: 0.4, ...opts }));
  return decalMat.get(k);
}
function plane(w, h, mat) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.userData.noRim = true;
  m.castShadow = false;
  m.receiveShadow = true;
  return m;
}

/**
 * Build the meshes for a machine type. opts: { no (machine number), banner (Texture) }.
 * Returns { group, L, body, bannerMesh, domeAnchor, lid, lidPivot, drawer, coinAnchor, flapPivot, handleGroup,
 *   plate: { mesh, draw }, buttons: { minus, plus }, glassParts, keyhole }
 */
export function buildMachineModel(type, opts = {}) {
  const spec = MACHINE_SPECS[type];
  const st = spec.style;
  const L = layout(spec);
  const group = new THREE.Group();
  const mats = voxelMaterials('normal');
  const vmesh = (key, build, vs = VS) => {
    const m = new THREE.Mesh(geo(`${type}:${key}`, build, vs), mats);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  };
  // stand
  let stand;
  if (st.stand === 'crate') { stand = new THREE.Mesh(geo('retro-crate', retroCrate, 0.02, 'bottom'), mats); stand.castShadow = stand.receiveShadow = true; }
  else stand = vmesh('stand', () => standModel(type), 0.01);
  group.add(stand);
  // lower unit + prints
  const body = vmesh('body', () => bodyModel(type));
  body.position.y = L.y0;
  group.add(body);
  const face = plane(spec.w, spec.lowH, dmat(faceplateTexture(type), { roughness: 0.35 }));
  face.position.set(0, L.y0 + spec.lowH / 2, L.front + 0.0006);
  group.add(face);
  for (const sx of [-1, 1]) {
    const side = plane(spec.d, spec.lowH, dmat(sideTexture(type), { roughness: 0.4 }));
    side.position.set(sx * (spec.w / 2 + 0.0006), L.y0 + spec.lowH / 2, 0);
    side.rotation.y = sx * Math.PI / 2;
    group.add(side);
  }
  // capsule window: frame, back print, display card, clear walls
  const frame = vmesh('case', () => caseModel(type));
  frame.position.y = L.caseY0;
  group.add(frame);
  const back = plane(spec.w - 0.024, L.caseH - 0.012, new THREE.MeshStandardMaterial({ map: innerPrintTexture(st.inner), roughness: 0.6 }));
  back.position.set(0, L.caseY0 + L.caseH / 2, -spec.d / 2 + 2 * VS + 0.0006);
  group.add(back);
  const bannerMat = new THREE.MeshStandardMaterial({ map: opts.banner || null, color: opts.banner ? 0xffffff : 0xdddddd, roughness: 0.42, emissive: 0xffffff, emissiveMap: opts.banner || null, emissiveIntensity: opts.banner ? 0.1 : 0 });
  const bannerHolder = new THREE.Group();
  bannerHolder.position.set(L.banner.x, L.banner.y, L.banner.z + VS * 0.5);
  const bannerMesh = plane(L.banner.w, L.banner.h, bannerMat);
  bannerHolder.add(bannerMesh);
  group.add(bannerHolder);
  const shell = new THREE.Mesh(windowGeometry(spec.w - 0.004, spec.d - 0.004, L.caseH), clearPlastic(st.glass, st.worn ? 0.17 : 0.1));
  shell.position.y = L.caseY0;
  shell.renderOrder = 3;
  shell.userData.noRim = true;
  shell.raycast = () => {};
  group.add(shell);
  // lid on its hinge (with the header label, the sample topper and, on the royal, the crown)
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, L.lid.y, L.lid.z);
  group.add(lidPivot);
  const lid = new THREE.Group();
  lid.position.set(0, 0, -L.lid.z);
  lidPivot.add(lid);
  const lidMesh = vmesh('lid', () => lidModel(type));
  lidMesh.userData.part = 'lid';
  lid.add(lidMesh);
  const capLab = plane(spec.w * 0.86, spec.w * 0.86 / 10, dmat(capLabelTexture(type, opts.no || 1)));
  capLab.position.set(-spec.w * 0.04, spec.capH * 0.52, spec.d / 2 + VS + 0.0006);
  capLab.userData.part = 'lid';
  lid.add(capLab);
  const D = L.dome;
  const topper = vmesh('topper', () => topperModel(type));
  topper.position.set(0, spec.capH + VS, D.z);
  lid.add(topper);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(D.w, D.h, D.d), clearPlastic(st.glass, st.worn ? 0.18 : 0.1));
  hood.position.set(0, spec.capH + VS * 3 + D.h / 2, D.z);
  hood.renderOrder = 3;
  hood.userData.noRim = true;
  hood.raycast = () => {};
  lid.add(hood);
  const domeAnchor = new THREE.Group();
  domeAnchor.position.set(0, spec.capH + VS * 3, D.z);
  lid.add(domeAnchor);
  if (st.crown) {
    const crown = new THREE.Mesh(geo('crown', crownModel, 0.004, 'bottom'), mats);
    crown.position.set(0, spec.capH + VS * 4 + D.h, D.z);
    lid.add(crown);
  }
  // coin box drawer
  const CB = L.coinBox;
  const drawer = new THREE.Group();
  drawer.position.set(CB.x0, CB.y0, CB.z);
  const drawerMesh = vmesh('drawer', () => drawerModel(type));
  drawerMesh.userData.part = 'coinbox';
  drawer.add(drawerMesh);
  const coinAnchor = new THREE.Group(); // coins pile up in here
  coinAnchor.position.set(VS * 2, VS, -vx(CB.depth) * VS + VS * 2);
  drawer.add(coinAnchor);
  group.add(drawer);
  // crank
  const handleGroup = new THREE.Group();
  handleGroup.position.set(L.handle.x, L.handle.y, L.handle.z);
  const handle = vmesh('handle', () => handleModel(type));
  handle.userData.part = 'handle';
  const hpiv = new THREE.Group();
  hpiv.add(handle);
  handleGroup.add(hpiv);
  group.add(handleGroup);
  // flap
  const O = L.outlet;
  const flapPivot = new THREE.Group();
  flapPivot.position.set(0, O.y1 - VS, L.front + VS * 0.5);
  const flap = vmesh('flap', () => flapModel(type));
  flap.castShadow = false;
  flapPivot.add(flap);
  group.add(flapPivot);
  // tray
  const tray = vmesh('tray', () => trayModel(type));
  tray.position.y = L.tray.y;
  group.add(tray);
  // price plate + buttons
  const pp = pricePlate(type);
  const plateMesh = plane(L.plate.w, L.plate.h, new THREE.MeshStandardMaterial({ map: pp.texture, emissive: 0xffffff, emissiveMap: pp.texture, emissiveIntensity: 0.35, roughness: 0.3 }));
  plateMesh.position.set(L.plate.x, L.plate.y, L.front + VS * 1 + 0.0008);
  plateMesh.userData.part = 'plate';
  group.add(plateMesh);
  const minus = new THREE.Mesh(geo(`btn-1:${!!st.dark}`, () => buttonModel(-1, st.dark)), mats);
  const plus = new THREE.Mesh(geo(`btn1:${!!st.dark}`, () => buttonModel(1, st.dark)), mats);
  minus.position.set(L.plate.x - L.buttons.dx, L.buttons.y, L.front);
  plus.position.set(L.plate.x + L.buttons.dx, L.buttons.y, L.front);
  minus.userData.part = 'priceDown'; plus.userData.part = 'priceUp';
  group.add(minus, plus);
  // the body voxels are positioned by their own origin: shift the parts that were built in machine coordinates
  return {
    group, L, body, stand, bannerMesh, bannerHolder, domeAnchor, lid, lidPivot, drawer, coinAnchor, flapPivot, handleGroup, handlePivot: hpiv,
    plate: { mesh: plateMesh, draw: pp.draw }, buttons: { minus, plus }, glassParts: [shell, hood], tray,
  };
}

/** Handle (dev viewers): the voxel crank on its own. */
export function buildHandle(r, type = 'standard') {
  const m = new THREE.Mesh(geo(`${type}:handle`, () => handleModel(type)), voxelMaterials('normal'));
  m.castShadow = true;
  const g = new THREE.Group();
  g.add(m);
  return g;
}

/** Kept for older callers: cases no longer grow (capacity upgrades are gone). */
export function caseExtension() { return 0; }

/** Fake coin on the owner's test rope (brass token with a hole, like a 5-yen coin). */
let coinGeo = null, coinMat = null;
export function makeCoin() {
  if (!coinGeo) {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, 0.0115, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, 0.0028, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    coinGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.0012, bevelEnabled: true, bevelThickness: 0.0003, bevelSize: 0.0004, bevelSegments: 1, curveSegments: 8 });
    coinGeo.center();
    coinMat = new THREE.MeshStandardMaterial({ color: 0xe0b860, metalness: 1, roughness: 0.3, envMapIntensity: 1.8 });
  }
  const m = new THREE.Mesh(coinGeo, coinMat);
  m.castShadow = true;
  return m;
}

/** A ¥100 coin as a little voxel disc (lying flat, centred). Shared geometry for coin piles. */
let yenGeo = null;
export function yenCoinGeometry() {
  if (!yenGeo) {
    const v = new VoxelModel();
    v.jitter = 0;
    for (let x = -4; x < 4; x++) for (let z = -4; z < 4; z++) {
      const d = Math.hypot(x + 0.5, z + 0.5);
      if (d > 4.1) continue;
      v.set(x, 0, z, metal(d > 3.2 ? 0xd4d6da : 0xe8eaee));
      if (d < 2.4 && ((x + z) & 1)) v.set(x, 0, z, metal(0xc8cace)); // the stamped "100"
    }
    yenGeo = meshVoxels(v, { voxelSize: 0.0029, origin: 'center' });
  }
  return yenGeo;
}
