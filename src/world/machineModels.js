// Voxel cabinets for each gacha machine type + the anchor points the mechanics need.
// All dimensions in metres, machine-local: front = +z, origin = floor centre.
import * as THREE from 'three';
import { VoxelModel, metal, gloss, glow } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { voxelMaterials } from '../voxel/materials.js';
import { C, shade } from '../voxel/palette.js';
import { hash2 } from '../core/util.js';

const VS = 0.01; // 1 cm voxels for machine bodies
const h3 = (x, y, z) => hash2(x * 7 + z * 131, y * 13 + z * 3);

/** Common layout for every machine: computed from a spec. */
function layout(spec) {
  const { w, d, h, y0, win, handleY, outlet } = spec;
  const fz = d / 2;
  return {
    ...spec,
    front: fz,
    window: { x0: -w / 2 + win.side, x1: w / 2 - win.side, y0: y0 + win.y0, y1: y0 + win.y1, z0: -fz + win.back, z1: fz - 0.012 },
    handle: { x: 0, y: y0 + handleY, z: fz + 0.012, r: spec.handleR || 0.05 },
    slot: { x: spec.slotX ?? 0.0, y: y0 + handleY + (spec.slotDy ?? 0.075), z: fz + 0.015 },
    outlet: { x0: -outlet.w / 2, x1: outlet.w / 2, y0: y0 + outlet.y0, y1: y0 + outlet.y1, z: fz },
    tray: { x0: -spec.tray.w / 2, x1: spec.tray.w / 2, z0: fz - 0.02, z1: fz + spec.tray.d, y: y0 + outlet.y0 - 0.005, wall: 0.035 },
    hook: { x: w / 2 + 0.012, y: y0 + handleY + 0.02, z: fz - 0.05 },
    top: y0 + h,
  };
}

// ----------------------------------------------------------------------------- RETRO
function retroBody(L) {
  const v = new VoxelModel();
  v.jitter = 0.03;
  const W = Math.round(L.w / VS), D = Math.round(L.d / VS), H = Math.round(L.h / VS);
  const x0 = -Math.floor(W / 2), x1 = x0 + W - 1, z0 = -Math.floor(D / 2), z1 = z0 + D - 1;
  const red = 0xc8352a, redD = 0x9a2620, cream = 0xf2e6c8;
  const lowH = 40, winTop = 84;
  // lower cabinet
  v.box(x0, 0, z0, x1, lowH, z1, red);
  v.paint(() => { v.box(x0, 0, z0, x1, 2, z1, redD); v.box(x0, lowH - 1, z0, x1, lowH, z1, metal(C.chrome)); });
  // outlet recess
  const o = L.outlet;
  v.box(Math.round(o.x0 / VS), Math.round((o.y0 - L.y0) / VS), z1 - 9, Math.round(o.x1 / VS) - 1, Math.round((o.y1 - L.y0) / VS), z1, null);
  v.box(Math.round(o.x0 / VS) - 1, Math.round((o.y0 - L.y0) / VS) - 1, z1, Math.round(o.x1 / VS), Math.round((o.y0 - L.y0) / VS) - 1, z1, metal(C.chrome));
  // coin plate (chrome, raised)
  v.box(-10, 20, z1 + 1, 9, 38, z1 + 1, metal(0xd8dce2));
  v.paint(() => v.box(-10, 20, z1 + 1, 9, 20, z1 + 1, metal(0xa8acb2)));
  // coin slot
  v.box(-1, 33, z1 + 1, 0, 36, z1 + 1, 0x202020);
  // window frame: corner pillars + back panel
  for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) v.box(px, lowH, pz, px + (px === x0 ? 1 : -1), winTop, pz + (pz === z0 ? 1 : -1), metal(C.chrome));
  v.box(x0, lowH, z0, x1, winTop, z0 + 1, cream);
  v.paint(() => { for (let y = lowH; y < winTop; y += 6) v.box(x0 + 2, y, z0 + 1, x1 - 2, y + 2, z0 + 1, 0xffd8c0); });
  // top cap with rounded edge
  v.box(x0, winTop, z0, x1, winTop + 6, z1, red);
  v.box(x0 + 1, winTop + 7, z0 + 1, x1 - 1, winTop + 8, z1 - 1, red);
  v.paint(() => v.box(x0, winTop, z0, x1, winTop, z1, metal(C.chrome)));
  // header sign board
  v.box(x0 + 2, winTop + 8, z1 - 3, x1 - 2, winTop + 20, z1 - 2, cream);
  v.box(x0 + 1, winTop + 8, z1 - 4, x0 + 2, winTop + 21, z1 - 2, red);
  v.box(x1 - 2, winTop + 8, z1 - 4, x1 - 1, winTop + 21, z1 - 2, red);
  v.box(x0 + 1, winTop + 20, z1 - 4, x1 - 1, winTop + 21, z1 - 2, red);
  // rust, scratches and an old sticker
  v.paint(() => {
    for (let x = x0; x <= x1; x++) for (let y = 0; y <= winTop + 8; y++) for (const z of [z1, z0]) {
      const r = h3(x, y, z);
      if (r < 0.025) v.set(x, y, z, 0x7a3a22);
      else if (r < 0.04) v.set(x, y, z, shade(red, 1.2));
    }
    for (let z = z0; z <= z1; z++) for (let y = 0; y <= lowH; y++) {
      if (h3(x0, y, z) < 0.03) v.set(x0, y, z, 0x7a3a22);
      if (h3(x1, y, z) < 0.03) v.set(x1, y, z, 0x7a3a22);
    }
    v.box(x0, 6, z0 + 6, x0, 16, z0 + 18, 0xffe066);
    v.box(x0, 8, z0 + 8, x0, 14, z0 + 16, 0xff6f91);
  });
  // side handles / feet
  v.box(x0 - 1, 0, z0 + 2, x0 - 1, 2, z0 + 6, metal(0x666666));
  v.box(x1 + 1, 0, z0 + 2, x1 + 1, 2, z0 + 6, metal(0x666666));
  // rope hook on the right side
  v.box(x1 + 1, 31, z1 - 6, x1 + 2, 32, z1 - 4, metal(0x888888));
  return v;
}

function retroCrate() {
  const v = new VoxelModel();
  v.jitter = 0.06;
  const wood = 0xb88a52, dark = 0x7a5530;
  // fruit crate 56 x 44 x 46 cm at 2cm voxels: 28 x 22 x 23
  for (let y = 0; y < 22; y++) {
    const slat = y % 5 < 4 || y === 21;
    for (let x = -14; x <= 13; x++) for (let z = -11; z <= 11; z++) {
      const edge = x === -14 || x === 13 || z === -11 || z === 11;
      const top = y === 21;
      if ((edge && slat) || top) v.set(x, y, z, top ? (((x + 14) % 5 === 4) ? dark : wood) : wood);
    }
  }
  v.box(-14, 0, -11, -13, 21, -10, dark); v.box(12, 0, -11, 13, 21, -10, dark);
  v.box(-14, 0, 10, -13, 21, 11, dark); v.box(12, 0, 10, 13, 21, 11, dark);
  // stencil text "みかん" style mark
  v.project(['RRR.R.R.RRR', 'R...R.R.R.R', 'RRR.RRR.RRR'], { R: 0xd86a2a }, -5, 12);
  return v;
}

// ----------------------------------------------------------------------------- MODERN (standard / deluxe / royal)
function modernBody(L, style) {
  const v = new VoxelModel();
  v.jitter = 0.015;
  const W = Math.round(L.w / VS), D = Math.round(L.d / VS), H = Math.round(L.h / VS);
  const x0 = -Math.floor(W / 2), x1 = x0 + W - 1, z0 = -Math.floor(D / 2), z1 = z0 + D - 1;
  const { body, trim, accent, inner } = style;
  const winY0 = Math.round((L.window.y0 - L.y0) / VS), winY1 = Math.round((L.window.y1 - L.y0) / VS);
  // shell
  v.box(x0, 0, z0, x1, H - 1, z1, body);
  // hollow window cavity (front open)
  v.box(x0 + 3, winY0, z0 + 3, x1 - 3, winY1, z1, null);
  v.paint(() => v.box(x0 + 3, winY0, z0 + 2, x1 - 3, winY1, z0 + 2, inner));
  // trim around window
  v.box(x0 + 2, winY0 - 1, z1, x1 - 2, winY0 - 1, z1, trim);
  v.box(x0 + 2, winY1 + 1, z1, x1 - 2, winY1 + 1, z1, trim);
  v.box(x0 + 2, winY0 - 1, z1, x0 + 2, winY1 + 1, z1, trim);
  v.box(x1 - 2, winY0 - 1, z1, x1 - 2, winY1 + 1, z1, trim);
  // side accent stripes
  v.paint(() => {
    v.box(x0, 0, z0, x0, H - 1, z1, body);
    for (const sx of [x0, x1]) { v.box(sx, winY0 - 6, z0 + 4, sx, winY0 - 3, z1 - 4, accent); v.box(sx, 4, z0 + 4, sx, 7, z1 - 4, accent); }
    v.box(x0, 0, z0, x1, 1, z1, shade(body, 0.7));
  });
  // handle unit plate
  const hy = Math.round((L.handle.y - L.y0) / VS);
  v.box(-13, hy - 9, z1 + 1, 12, hy + 12, z1 + 1, metal(0xd8dce2));
  v.paint(() => v.box(-13, hy - 9, z1 + 1, 12, hy - 9, z1 + 1, metal(0x9aa0a8)));
  // coin slots (one per 100 yen) above the handle
  const slots = Math.max(1, Math.min(5, Math.round(L.price / 100)));
  for (let i = 0; i < slots; i++) {
    const sx = -((slots - 1) * 4) / 2 + i * 4;
    v.box(Math.round(sx), hy + 7, z1 + 1, Math.round(sx), hy + 10, z1 + 1, 0x202020);
  }
  // outlet recess with chrome lip
  const o = L.outlet;
  const oy0 = Math.round((o.y0 - L.y0) / VS), oy1 = Math.round((o.y1 - L.y0) / VS);
  v.box(Math.round(o.x0 / VS), oy0, z1 - 10, Math.round(o.x1 / VS) - 1, oy1, z1, null);
  v.box(Math.round(o.x0 / VS) - 1, oy0 - 1, z1, Math.round(o.x1 / VS), oy0 - 1, z1, metal(C.chrome));
  v.box(Math.round(o.x0 / VS) - 1, oy1 + 1, z1, Math.round(o.x1 / VS), oy1 + 1, z1, metal(C.chrome));
  // top cap
  v.box(x0 - 1, H - 2, z0 - 1, x1 + 1, H - 1, z1 + 1, trim);
  // card holder frame on top (card plane is added separately)
  v.box(x0 + 1, H, z1 - 4, x1 - 1, H + 1, z1 - 2, trim);
  v.box(x0 + 1, H, z1 - 4, x0 + 2, H + 26, z1 - 2, trim);
  v.box(x1 - 2, H, z1 - 4, x1 - 1, H + 26, z1 - 2, trim);
  v.box(x0 + 1, H + 25, z1 - 4, x1 - 1, H + 26, z1 - 2, trim);
  v.box(x0 + 3, H + 2, z1 - 4, x1 - 3, H + 24, z1 - 4, 0x303030);
  if (style.led) {
    for (let y = winY0; y <= winY1; y += 1) { v.set(x0 + 1, y, z1, glow(style.led)); v.set(x1 - 1, y, z1, glow(style.led)); }
    for (let x = x0 + 1; x <= x1 - 1; x++) v.set(x, H - 3, z1 + 1, glow(style.led2 || style.led));
  }
  if (style.crown) {
    for (let i = -2; i <= 2; i++) v.box(i * 7 - 1, H + 27, z1 - 4, i * 7 + 1, H + 30 + (i === 0 ? 4 : 0), z1 - 2, metal(C.gold));
    v.box(x0 + 2, H + 26, z1 - 4, x1 - 2, H + 27, z1 - 2, metal(C.gold));
  }
  // rivets
  v.paint(() => { for (const [x, y] of [[x0 + 1, 2], [x1 - 1, 2], [x0 + 1, H - 4], [x1 - 1, H - 4]]) v.set(x, y, z1, metal(C.silver)); });
  // rope hook
  v.box(x1 + 1, hy + 1, z1 - 6, x1 + 2, hy + 2, z1 - 4, metal(0x888888));
  return v;
}

function modernStand(style, w, h, d) {
  const v = new VoxelModel();
  v.jitter = 0.02;
  const W = Math.round(w / 0.02), H = Math.round(h / 0.02), D = Math.round(d / 0.02);
  const x0 = -Math.floor(W / 2), x1 = x0 + W - 1, z0 = -Math.floor(D / 2), z1 = z0 + D - 1;
  v.box(x0, 0, z0, x1, H - 1, z1, style.stand);
  v.paint(() => {
    v.box(x0, 0, z0, x1, 0, z1, shade(style.stand, 0.6));
    for (let y = 4; y < H - 3; y += 2) v.box(x0 + 3, y, z1, x1 - 3, y, z1, shade(style.stand, 0.82)); // vents
    v.box(x0, H - 1, z0, x1, H - 1, z1, style.trim);
  });
  // keyhole
  v.set(0, H - 4, z1 + 1, metal(C.brass));
  return v;
}

const cache = new Map();
function geo(key, build, vs = VS) {
  if (!cache.has(key)) cache.set(key, meshVoxels(build(), { voxelSize: vs, origin: 'bottom' }));
  return cache.get(key);
}

export const MACHINE_SPECS = {
  retro: {
    w: 0.44, d: 0.36, h: 0.92, y0: 0.44, price: 100,
    win: { side: 0.02, back: 0.02, y0: 0.41, y1: 0.84 },
    handleY: 0.27, handleR: 0.045, slotDy: 0.075,
    outlet: { w: 0.15, y0: 0.05, y1: 0.16 },
    tray: { w: 0.2, d: 0.13 },
    header: { y: 0.92 + 0.02, w: 0.38, h: 0.1 },
  },
  standard: {
    w: 0.5, d: 0.42, h: 0.8, y0: 0.52, price: 300,
    win: { side: 0.03, back: 0.03, y0: 0.34, y1: 0.74 },
    handleY: 0.22, handleR: 0.05,
    outlet: { w: 0.17, y0: 0.04, y1: 0.13 },
    tray: { w: 0.22, d: 0.14 },
    card: { w: 0.44, h: 0.22 },
    style: { body: 0xf4f2ec, trim: 0x2f6fd6, accent: 0x5cc4ff, inner: 0xdde8f4, stand: 0xd8dde4 },
  },
  deluxe: {
    w: 0.54, d: 0.44, h: 0.86, y0: 0.52, price: 500,
    win: { side: 0.03, back: 0.03, y0: 0.34, y1: 0.8 },
    handleY: 0.22, handleR: 0.055,
    outlet: { w: 0.19, y0: 0.04, y1: 0.14 },
    tray: { w: 0.24, d: 0.15 },
    card: { w: 0.48, h: 0.24 },
    style: { body: 0x22201e, trim: metal(C.gold), accent: 0xd4a83a, inner: 0x3a3028, stand: 0x2a2826, led: 0xffd27a, led2: 0xff9a5a },
  },
  royal: {
    w: 0.58, d: 0.46, h: 1.0, y0: 0.5, price: 1000,
    win: { side: 0.03, back: 0.03, y0: 0.34, y1: 0.94 },
    handleY: 0.22, handleR: 0.06,
    outlet: { w: 0.2, y0: 0.04, y1: 0.15 },
    tray: { w: 0.26, d: 0.16 },
    card: { w: 0.52, h: 0.24 },
    style: { body: 0xe8ecf2, trim: metal(C.chrome), accent: 0xd94fb0, inner: 0xf6e8f4, stand: 0xc8ccd4, led: 0xff6fd0, led2: 0x6fd8ff, crown: true },
  },
};

/** Build the static meshes for a machine type. Returns {group, L, parts} */
export function buildMachineModel(type) {
  const spec = MACHINE_SPECS[type];
  const L = layout(spec);
  const group = new THREE.Group();
  const mats = voxelMaterials('normal');
  let body, stand;
  if (type === 'retro') {
    body = new THREE.Mesh(geo('retro-body', () => retroBody(L)), mats);
    stand = new THREE.Mesh(geo('retro-crate', retroCrate, 0.02), mats);
  } else {
    body = new THREE.Mesh(geo(type + '-body', () => modernBody(L, spec.style)), mats);
    stand = new THREE.Mesh(geo(type + '-stand', () => modernStand(spec.style, spec.w + 0.02, spec.y0, spec.d + 0.02), 0.02), mats);
  }
  body.position.y = L.y0;
  for (const m of [body, stand]) { m.castShadow = true; m.receiveShadow = true; group.add(m); }
  return { group, L, body, stand };
}

/** Handle (rotating knob) mesh; colour by crank level. */
export function buildHandle(r, level) {
  const cols = [0x2a2a2a, 0xd8352a, 0x2f6fd6, C.chrome, C.gold, C.gold];
  const v = new VoxelModel();
  v.jitter = 0;
  const R = Math.round(r / 0.005);
  // base disc
  v.cylinder(0, 0, 0, R, 2, metal(0xc8ccd2), 'z');
  v.cylinder(0, 0, 2, R - 2, 1, metal(0xe8ecf2), 'z');
  // grip bar across the disc
  const gc = level >= 3 ? metal(cols[level]) : gloss(cols[level]);
  v.box(-R + 1, -2, 3, R - 1, 2, 6, gc);
  v.box(-R + 1, -1, 7, R - 1, 1, 7, gc);
  v.box(-2, -2, 3, 1, 1, 8, metal(0xd8dce2));
  const g = meshVoxels(v, { voxelSize: 0.005, origin: 'none' });
  g.translate(0, 0, 0);
  const mesh = new THREE.Mesh(g, voxelMaterials('normal'));
  mesh.castShadow = true;
  return mesh;
}

/** Small electric motor + belt (crank upgrade lv5). */
export function buildMotor() {
  const v = new VoxelModel();
  v.box(-6, 0, -5, 5, 9, 5, 0x3a4048);
  v.paint(() => { for (let y = 1; y < 9; y += 2) v.box(-6, y, -5, 5, y, -5, 0x2a3038); });
  v.cylinder(0, 4, 6, 3, 2, metal(C.chrome), 'z');
  v.set(-4, 10, 0, glow(0x60ff80));
  v.project(['Y.Y', '.Y.'], { Y: 0xffd23f }, -1, 8);
  const mesh = new THREE.Mesh(meshVoxels(v, { voxelSize: 0.008 }), voxelMaterials('normal'));
  mesh.castShadow = true;
  return mesh;
}

/** Clear hopper extension on top (capacity upgrades). */
export function buildHopper(w, d, tall) {
  const g = new THREE.Group();
  const h = tall ? 0.26 : 0.16;
  const frame = new THREE.MeshStandardMaterial({ color: 0xd8dce2, metalness: 0.9, roughness: 0.3 });
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0xf0f8ff, transparent: true, opacity: 0.22, roughness: 0.05, clearcoat: 1, depthWrite: false });
  const box = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, h, d * 0.7), glassM);
  box.position.y = h / 2;
  g.add(box);
  const rim = new THREE.Mesh(new THREE.BoxGeometry(w * 0.84, 0.02, d * 0.74), frame);
  rim.position.y = h;
  g.add(rim);
  const base = new THREE.Mesh(new THREE.BoxGeometry(w * 0.84, 0.02, d * 0.74), frame);
  base.position.y = 0.01;
  base.castShadow = true;
  g.add(base);
  g.userData.inner = { w: w * 0.8, h, d: d * 0.7 };
  return g;
}

/** Fake coin (brass token with a hole, like a 5-yen coin). */
let coinGeo = null, coinMat = null;
export function makeCoin() {
  if (!coinGeo) {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, 0.0115, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, 0.0028, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    coinGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.0012, bevelEnabled: true, bevelThickness: 0.0003, bevelSize: 0.0004, bevelSegments: 1, curveSegments: 20 });
    coinGeo.center();
    coinMat = new THREE.MeshStandardMaterial({ color: 0xe0b860, metalness: 1, roughness: 0.3, envMapIntensity: 1.8 });
  }
  const m = new THREE.Mesh(coinGeo, coinMat);
  m.castShadow = true;
  return m;
}
