// Gacha machine cabinets modelled on real Japanese capsule-toy machines (Takara Tomy / Bandai style):
// a white lower unit with the coin dial, coin slot, return button and outlet; a clear capsule case with the
// printed banner (台紙) inside; a top cap; and a clear dome on top that shows sample figures.
// All dimensions in metres, machine-local: front = +z, origin = floor centre.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { VoxelModel, metal, gloss, glow } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { voxelMaterials } from '../voxel/materials.js';
import { C, shade } from '../voxel/palette.js';
import { Pix, FONT_EN } from '../gfx/pix.js';
import { BANNER_W, BANNER_H } from '../gfx/banner.js';

const VS = 0.005; // 5 mm voxels for cabinets

export const MACHINE_SPECS = {
  retro: {
    w: 0.34, d: 0.32, lowH: 0.36, caseH: 0.33, capH: 0.035, y0: 0.56, price: 100,
    dial: { x: -0.02, y: 0.215, ring: 0.075, knob: 0.05 }, slot: { dx: 0.082, y: 0.275 },
    outlet: { w: 0.12, y0: 0.025, y1: 0.105 }, tray: { w: 0.17, d: 0.12 },
    dome: { w: 0.26, h: 0.12, d: 0.17 },
    style: { body: 0xe9dcc0, body2: 0xd8c8a4, ring: 0xc8352a, ringEdge: 0x8a2018, label: 0xa82a20, glass: 0xfff4d6, inner: 0xf2e6c8, stand: 'crate', worn: true },
  },
  standard: {
    w: 0.36, d: 0.34, lowH: 0.37, caseH: 0.38, capH: 0.04, y0: 0.6, price: 300,
    dial: { x: -0.025, y: 0.22, ring: 0.082, knob: 0.055 }, slot: { dx: 0.088, y: 0.285 },
    outlet: { w: 0.13, y0: 0.025, y1: 0.115 }, tray: { w: 0.18, d: 0.13 },
    dome: { w: 0.3, h: 0.14, d: 0.2 },
    style: { body: 0xf6f5f0, body2: 0xe2e2dc, ring: 0x1f4fae, ringEdge: 0x143478, label: 0x1f4fae, glass: 0xf6fbff, inner: 0xe8eef6, stand: 0xd4d8de },
  },
  deluxe: {
    w: 0.4, d: 0.38, lowH: 0.38, caseH: 0.42, capH: 0.045, y0: 0.56, price: 500, bulge: 0.05, sidePanel: true,
    dial: { x: 0, y: 0.215, ring: 0.085, knob: 0.06 }, slot: { dx: 0.11, y: 0.3 },
    outlet: { w: 0.15, y0: 0.025, y1: 0.12 }, tray: { w: 0.2, d: 0.14 },
    dome: { w: 0.34, h: 0.15, d: 0.22 },
    style: { body: 0xf1e9d6, body2: 0xdcd0b4, panel: 0x6a2c22, ring: 0x6a2c22, ringEdge: 0x3e1a14, label: 0x6a2c22, glass: 0xf8fbff, inner: 0xf4ece0, stand: 0xc9c0ae, lcd: true },
  },
  royal: {
    w: 0.44, d: 0.4, lowH: 0.4, caseH: 0.46, capH: 0.05, y0: 0.52, price: 1000,
    dial: { x: -0.03, y: 0.23, ring: 0.09, knob: 0.062 }, slot: { dx: 0.115, y: 0.31 },
    outlet: { w: 0.16, y0: 0.025, y1: 0.13 }, tray: { w: 0.22, d: 0.15 },
    dome: { w: 0.38, h: 0.17, d: 0.24 },
    style: { body: 0xf7f2f6, body2: 0xe6dce6, ring: 0xd24fa8, ringEdge: 0x8a2a70, label: 0xb83a90, glass: 0xfff8fe, inner: 0xfbeaf6, stand: 0xe0d6e2, lcd: true, led: 0xff6fd0, led2: 0x6fd8ff, crown: true, gold: true },
  },
};

/** Common layout for every machine, computed from a spec and the case extension (capacity upgrades). */
export function layout(spec, ext = 0) {
  const { w, d, y0, lowH, capH } = spec;
  const caseH = spec.caseH + ext;
  const fz = d / 2;
  const bw = w - 0.04;
  const bh = bw * (BANNER_H / BANNER_W);
  const bannerZ = fz - 0.018;
  const caseY0 = y0 + lowH;
  const top = caseY0 + caseH + capH;
  return {
    ...spec,
    caseH, ext,
    h: lowH + caseH + capH,
    front: fz,
    caseY0,
    window: { x0: -w / 2 + 0.014, x1: w / 2 - 0.014, y0: caseY0 + 0.006, y1: caseY0 + caseH - 0.006, z0: -fz + 0.016, z1: bannerZ - 0.006 },
    banner: { w: bw, h: bh, x: 0, y: caseY0 + 0.012 + bh / 2, z: bannerZ },
    handle: { x: spec.dial.x, y: y0 + spec.dial.y, z: fz + 0.001, r: spec.dial.knob },
    slot: { x: w / 2 - spec.slot.dx, y: y0 + spec.slot.y, z: fz + 0.012 },
    outlet: { x0: -spec.outlet.w / 2, x1: spec.outlet.w / 2, y0: y0 + spec.outlet.y0, y1: y0 + spec.outlet.y1, z: fz },
    tray: { x0: -spec.tray.w / 2, x1: spec.tray.w / 2, z0: fz - 0.02, z1: fz + spec.tray.d, y: y0 + spec.outlet.y0 - 0.005, wall: 0.035 },
    hook: { x: w / 2 + (spec.sidePanel ? 0.034 : 0.012), y: y0 + spec.dial.y + 0.02, z: fz - 0.05 },
    dome: { ...spec.dome, y: top, z: -0.01 },
    top,
    domeTop: top + spec.dome.h + 0.012,
  };
}

// ----------------------------------------------------------------------------- voxel helpers
/** Royal crown ornament for the dome top. */
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

/** Old fruit crate the Shōwa machine stands on. */
function retroCrate() {
  const v = new VoxelModel();
  v.jitter = 0.06;
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

const geoCache = new Map();
function geo(key, build, vs = VS, origin = 'bottom') {
  if (!geoCache.has(key)) geoCache.set(key, meshVoxels(build(), { voxelSize: vs, origin }));
  return geoCache.get(key);
}

// ----------------------------------------------------------------------------- pixel-art decals
const decalCache = new Map();
const PXM = 600; // decal pixels per metre (6 px / cm)

/** Front faceplate of the lower unit: dial ring with arrows, coin labels, return-button label, sticker. */
function faceplateTexture(type) {
  if (decalCache.has('face:' + type)) return decalCache.get('face:' + type);
  const spec = MACHINE_SPECS[type], st = spec.style;
  const W = Math.round(spec.w * PXM), H = Math.round(spec.lowH * PXM);
  const p = new Pix(W, H, 3);
  const X = (m) => Math.round((m + spec.w / 2) * PXM), Y = (m) => Math.round((spec.lowH - m) * PXM);
  const cx = X(spec.dial.x), cy = Y(spec.dial.y);
  const R = Math.round(spec.dial.ring * PXM), r = Math.round((spec.dial.knob + 0.011) * PXM);
  const yellow = 0xffd23f;
  // ring
  for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
    const d = Math.sqrt(x * x + y * y);
    if (d > R + 0.4 || d < r) continue;
    p.px(cx + x, cy + y, d > R - 1.6 || d < r + 1.2 ? st.ringEdge : st.ring);
  }
  // curved yellow arrows (clockwise) in 4 segments
  const mid = (R + r) / 2;
  for (let s = 0; s < 4; s++) {
    const a0 = s * Math.PI / 2 + 0.35, a1 = a0 + Math.PI / 2 - 0.75;
    for (let a = a0; a <= a1; a += 0.01) {
      for (let k = -1; k <= 1; k++) p.px(cx + Math.round(Math.cos(a) * (mid + k * 0.6)), cy + Math.round(Math.sin(a) * (mid + k * 0.6)), yellow);
    }
    // arrow head at a1 (pointing clockwise = increasing angle on screen)
    for (let t = 0; t < 6; t++) {
      const a = a1 + 0.012 * t;
      const rr = 3.5 - t * 0.6;
      for (let k = -rr; k <= rr; k += 0.5) p.px(cx + Math.round(Math.cos(a) * (mid + k)), cy + Math.round(Math.sin(a) * (mid + k)), yellow);
    }
  }
  // alignment triangles at 3 and 9 o'clock (▶ ◀) + top/bottom ticks
  for (let t = 0; t < 6; t++) for (let k = -t; k <= t; k++) {
    p.px(cx - R + 3 + (5 - t), cy + Math.round(k * 0.7), yellow);
    p.px(cx + R - 3 - (5 - t), cy + Math.round(k * 0.7), yellow);
  }
  // coin count label (top-left)
  const lab = st.label;
  const coins = spec.price >= 1000 ? '1000円' : spec.price === 100 ? '100円' : `${spec.price / 100}コイン`;
  const lw = Math.round(p.measure(coins, 16)) + 14;
  const lx = 10, ly = 10;
  for (let j = 0; j < 22; j++) for (let i = 0; i < lw; i++) {
    const rx = i < 6 ? 6 - i : i > lw - 7 ? i - (lw - 7) : 0, ry = j < 6 ? 6 - j : j > 15 ? j - 15 : 0;
    if (rx * rx + ry * ry <= 36) p.px(lx + i, ly + j, (rx * rx + ry * ry > 22) ? 0xffffff : lab);
  }
  p.text(coins, lx + lw / 2, ly + 2, { size: 16, color: 0xffffff, align: 'center' });
  // "コイン投入口" label above the slot, with an arrow
  const sx = X(spec.w / 2 - spec.slot.dx), sy = Y(spec.slot.y);
  const tw = Math.round(p.measure('コイン投入口', 10)) + 10;
  const tx0 = Math.min(W - tw - 4, sx - Math.round(tw * 0.75)), ty0 = sy - 34;
  for (let j = 0; j < 14; j++) for (let i = 0; i < tw; i++) {
    const rx = i < 4 ? 4 - i : i > tw - 5 ? i - (tw - 5) : 0, ry = j < 4 ? 4 - j : j > 9 ? j - 9 : 0;
    if (rx * rx + ry * ry <= 16) p.px(tx0 + i, ty0 + j, lab);
  }
  p.text('コイン投入口', tx0 + tw / 2, ty0 + 1, { size: 10, color: 0xffffff, align: 'center' });
  for (let t = 0; t < 5; t++) { p.px(tx0 + tw - 6 + t, ty0 + 15 + t, yellow); p.px(tx0 + tw - 5 + t, ty0 + 15 + t, yellow); }
  // vertical "コイン返却ボタン" label at the right edge
  const vx = W - 16, vy = Math.max(ty0 + 18, sy - 6);
  const chars = [...'返却ボタン'];
  const vh = chars.length * 11 + 6;
  for (let j = 0; j < vh; j++) for (let i = 0; i < 13; i++) {
    const ry = j < 4 ? 4 - j : j > vh - 5 ? j - (vh - 5) : 0, rx = i < 4 ? 4 - i : i > 8 ? i - 8 : 0;
    if (rx * rx + ry * ry <= 16) p.px(vx + i, vy + j, lab);
  }
  chars.forEach((ch, i) => p.text(ch, vx + 6.5, vy + 3 + i * 11, { size: 10, color: 0xffffff, align: 'center' }));
  // instruction sticker (bottom-left)
  const sw = 74, sh = 30, stx = 8, sty = Y(spec.outlet.y1) - sh - 6;
  p.rect(stx, sty, sw, sh, 0xffffff);
  p.frame(stx, sty, sw, sh, 0x8a8a8a);
  p.text('▶◀印を合わせ', stx + 3, sty + 2, { size: 8, color: 0x1a1a1a });
  p.text('てからコインを', stx + 3, sty + 11, { size: 8, color: 0x1a1a1a });
  p.text('入れてください', stx + 3, sty + 20, { size: 8, color: 0x1a1a1a });
  // "取り出し口" above the outlet
  p.text('とりだしぐち', X(0), Y(spec.outlet.y1) - 13, { size: 8, color: 0x6a6a6a, align: 'center' });
  // price LCD (deluxe / royal)
  if (st.lcd) {
    const lx2 = X(-spec.w / 2) + 12, ly2 = sty - 26;
    p.rect(lx2, ly2, 56, 18, 0x2a2a2a);
    p.rect(lx2 + 2, ly2 + 2, 52, 14, 0x0e2a12);
    p.text(`¥${spec.price}`, lx2 + 28, ly2 + 3, { size: 12, color: 0x7dff8a, align: 'center', font: FONT_EN });
  }
  if (st.worn) { p.flush(); p.pull(); for (let i = 0; i < p.d.length; i += 4) if (p.d[i + 3] && (i / 4) % 7 === 0 && Math.random() < 0.15) p.d[i + 3] = 0; p.dirty = true; }
  const t = p.texture();
  t.minFilter = THREE.LinearMipmapLinearFilter;
  decalCache.set('face:' + type, t);
  return t;
}

/** Strip on the front of the top cap: brand + machine number. */
function capLabelTexture(type, no = 1) {
  const k = `cap:${type}:${no}`;
  if (decalCache.has(k)) return decalCache.get(k);
  const spec = MACHINE_SPECS[type];
  const p = new Pix(160, 16, 4);
  p.fill(spec.style.body);
  p.text('GACHA GARAGE', 6, 2, { size: 10, color: 0x4a4a4a, font: FONT_EN });
  p.rect(112, 3, 42, 10, 0xffffff); p.frame(112, 3, 42, 10, 0x9a9a9a);
  p.text(`No.${String(no).padStart(3, '0')}`, 133, 2, { size: 8, color: 0x2a2a2a, align: 'center', font: FONT_EN });
  p.circle(102, 8, 3, spec.style.ring);
  const t = p.texture();
  decalCache.set(k, t);
  return t;
}

/** Tall side panel (deluxe): JAPANESE CAPSULE TOY GACHA. */
function sidePanelTexture(h) {
  const k = 'side:' + h.toFixed(2);
  if (decalCache.has(k)) return decalCache.get(k);
  const H = Math.round(h * 200), W = 40;
  const p = new Pix(W, H, 5);
  p.fill(0xf6f4ee);
  // vertical text, rotated: draw onto a temp canvas then rotate
  p.flush();
  const c = p.ctx;
  c.save();
  c.translate(W / 2, H - 10);
  c.rotate(-Math.PI / 2);
  c.fillStyle = '#1a1a1a';
  c.textBaseline = 'middle';
  c.font = '9px "Pixelify Sans", monospace';
  c.fillText('JAPANESE', 0, -11);
  c.fillText('CAPSULE TOY', 0, -1);
  c.font = '22px "Pixelify Sans", monospace';
  c.fillText('GACHA', 70, -4);
  c.restore();
  p.pull();
  // threshold for crisp pixels, then the edge trims
  for (let i = 0; i < p.d.length; i += 4) {
    const dark = p.d[i] < 150;
    p.d[i] = dark ? 26 : 0xf6; p.d[i + 1] = dark ? 26 : 0xf4; p.d[i + 2] = dark ? 26 : 0xee;
  }
  p.dirty = true;
  p.rect(0, 0, 2, H, 0xd8d4ca); p.rect(W - 2, 0, 2, H, 0xd8d4ca);
  const t = p.texture();
  decalCache.set(k, t);
  return t;
}

/** Back wall print inside the capsule case. */
function innerPrintTexture(color) {
  const k = 'inner:' + color;
  if (decalCache.has(k)) return decalCache.get(k);
  const p = new Pix(64, 64, 9);
  p.fill(color);
  for (let y = 0; y < 64; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < 64; x += 8) p.circle(x, y, 1, shade(color, 0.93));
  const t = p.texture({ repeat: [3, 3] });
  decalCache.set(k, t);
  return t;
}

// ----------------------------------------------------------------------------- clear plastic
const glassMats = new Map();
export function clearPlastic(tint = 0xf6fbff, opacity = 0.12) {
  const k = tint + ':' + opacity;
  if (!glassMats.has(k)) glassMats.set(k, new THREE.MeshPhysicalMaterial({ color: tint, transparent: true, opacity, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 2.4, depthWrite: false, side: THREE.DoubleSide, specularIntensity: 1 }));
  return glassMats.get(k);
}

/** Clear case shell: rounded front corners (or a bulging curved front), open top & bottom. */
function caseShellGeometry(w, d, h, bulge = 0) {
  const s = new THREE.Shape();
  const hw = w / 2, hd = d / 2, rf = 0.028, rb = 0.008;
  // shape in (x, z') with z' = -z so the extrusion can be rotated upright
  s.moveTo(-hw + rb, hd);
  s.lineTo(hw - rb, hd);
  s.quadraticCurveTo(hw, hd, hw, hd - rb);
  if (bulge) {
    s.lineTo(hw, -hd + 0.01);
    s.quadraticCurveTo(hw, -hd - bulge * 0.2, hw - 0.04, -hd - bulge * 0.6);
    s.quadraticCurveTo(0, -hd - bulge * 1.25, -hw + 0.04, -hd - bulge * 0.6);
    s.quadraticCurveTo(-hw, -hd - bulge * 0.2, -hw, -hd + 0.01);
  } else {
    s.lineTo(hw, -hd + rf);
    s.quadraticCurveTo(hw, -hd, hw - rf, -hd);
    s.lineTo(-hw + rf, -hd);
    s.quadraticCurveTo(-hw, -hd, -hw, -hd + rf);
  }
  s.lineTo(-hw, hd - rb);
  s.quadraticCurveTo(-hw, hd, -hw + rb, hd);
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 10 });
  g.rotateX(-Math.PI / 2); // extrude along +y, shape y → -z
  // drop the caps (group 0, non-indexed geometry); keep the walls
  const walls = g.groups.find((gr) => gr.materialIndex === 1);
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv']) {
    const a = g.attributes[name];
    out.setAttribute(name, new THREE.BufferAttribute(a.array.slice(walls.start * a.itemSize, (walls.start + walls.count) * a.itemSize), a.itemSize));
  }
  g.dispose();
  out.computeVertexNormals();
  return out;
}

// ----------------------------------------------------------------------------- bevelled blocky bodies
// Smooth bevelled plastic (not voxels): chunky readable blocks with soft highlights, like toy-machine plastic.
const plasticCache = new Map();
function plastic(color, opts = {}) {
  const k = color + JSON.stringify(opts);
  if (!plasticCache.has(k)) plasticCache.set(k, new THREE.MeshPhysicalMaterial({ color, roughness: opts.rough ?? 0.32, clearcoat: opts.coat ?? 0.6, clearcoatRoughness: 0.25, metalness: opts.metal ?? 0, envMapIntensity: 1.1 }));
  return plasticCache.get(k);
}
const rbox = (w, h, d, r, mat, seg = 3) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2)), mat);

function blockyLower(spec) {
  const st = spec.style;
  const g = new THREE.Group();
  const add = (m, x, y, z) => { m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  const { w, d, lowH } = spec;
  add(rbox(w, lowH - 0.012, d, 0.016, plastic(st.body)), 0, (lowH - 0.012) / 2 + 0.012, 0);
  add(rbox(w - 0.004, 0.016, d - 0.004, 0.005, plastic(st.body2, { rough: 0.6, coat: 0 })), 0, 0.008, 0); // skirt
  add(rbox(w + 0.004, 0.014, d + 0.004, 0.006, plastic(st.body2)), 0, lowH - 0.007, 0); // top lip
  if (st.panel) add(rbox(w - 0.03, lowH - 0.05, 0.008, 0.006, plastic(st.panel)), 0, lowH / 2, d / 2 + 0.001);
  // outlet: chrome lip around a dark recess
  const o = spec.outlet, ow = o.w, oh = o.y1 - o.y0;
  add(rbox(ow + 0.024, oh + 0.024, 0.012, 0.006, plastic(0xdfe3e8, { metal: 0.85, rough: 0.25 })), 0, o.y0 + oh / 2, d / 2 + 0.002);
  add(new THREE.Mesh(new THREE.BoxGeometry(ow, oh, 0.004), new THREE.MeshStandardMaterial({ color: 0x16161a, roughness: 0.9 })), 0, o.y0 + oh / 2, d / 2 + 0.0075);
  // knob boss with a chrome bezel
  const br = spec.dial.knob + 0.008;
  const boss = add(new THREE.Mesh(new THREE.CylinderGeometry(br, br, 0.008, 40), plastic(st.body)), spec.dial.x, spec.dial.y, d / 2 + 0.004);
  boss.rotation.x = Math.PI / 2;
  const bez = add(new THREE.Mesh(new THREE.TorusGeometry(br, 0.0035, 8, 40), plastic(0xe8ecf0, { metal: 0.9, rough: 0.2 })), spec.dial.x, spec.dial.y, d / 2 + 0.008);
  void bez;
  if (st.worn) for (const [x, y] of [[-0.1, 0.05], [0.12, 0.32], [-0.13, 0.28]]) add(new THREE.Mesh(new THREE.CircleGeometry(0.006, 6), new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 1 })), x, y, d / 2 + 0.0012);
  return g;
}

function blockyCap(spec) {
  const st = spec.style;
  const g = new THREE.Group();
  const m = rbox(spec.w + 0.01, spec.capH, spec.d + 0.01, 0.014, plastic(st.body));
  m.position.y = spec.capH / 2; m.castShadow = true; g.add(m);
  const lip = rbox(spec.w + 0.006, 0.006, spec.d + 0.006, 0.003, plastic(st.body2));
  lip.position.y = 0.003; g.add(lip);
  if (st.led) {
    const led = new THREE.Mesh(new THREE.BoxGeometry(spec.w * 0.9, 0.006, 0.004), new THREE.MeshBasicMaterial({ color: new THREE.Color(st.led).multiplyScalar(2) }));
    led.position.set(0, 0.01, (spec.d + 0.01) / 2 + 0.002); g.add(led);
  }
  return g;
}

function blockyStand(spec) {
  const st = spec.style;
  const g = new THREE.Group();
  const w = spec.w + 0.02, d = spec.d + 0.02, h = spec.y0;
  const main = rbox(w, h - 0.03, d, 0.012, plastic(st.stand, { rough: 0.45, coat: 0.3 }));
  main.position.y = h / 2 + 0.015; main.castShadow = true; main.receiveShadow = true; g.add(main);
  const toe = rbox(w - 0.02, 0.04, d - 0.02, 0.008, plastic(shade(st.stand, 0.5), { rough: 0.8, coat: 0 }));
  toe.position.y = 0.02; g.add(toe);
  // vent slats
  const ventM = plastic(shade(st.stand, 0.78), { rough: 0.6, coat: 0 });
  for (let i = 0; i < 9; i++) { const v = new THREE.Mesh(new THREE.BoxGeometry(w - 0.12, 0.008, 0.004), ventM); v.position.set(0, 0.1 + i * (h - 0.25) / 9, d / 2 + 0.002); g.add(v); }
  if (st.gold) for (const y of [0.05, h - 0.03]) { const t = new THREE.Mesh(new THREE.BoxGeometry(w, 0.008, 0.004), plastic(0xe8c050, { metal: 1, rough: 0.25 })); t.position.set(0, y, d / 2 + 0.003); g.add(t); }
  const key = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.004, 16), plastic(0xd8b040, { metal: 1 }));
  key.rotation.x = Math.PI / 2; key.position.set(0, h - 0.07, d / 2 + 0.003); g.add(key);
  return g;
}

// ----------------------------------------------------------------------------- assembly
const decalMat = (map, opts = {}) => new THREE.MeshStandardMaterial({ map, transparent: false, alphaTest: 0.5, roughness: 0.4, ...opts });

/**
 * Build the static meshes for a machine type.
 * opts: { ext (case extension, m), no (machine number), banner (Texture) }
 * Returns { group, L, body, stand, bannerMesh, domeAnchor, glassParts }
 */
export function buildMachineModel(type, opts = {}) {
  const spec = MACHINE_SPECS[type];
  const st = spec.style;
  const L = layout(spec, opts.ext || 0);
  const group = new THREE.Group();
  const mats = voxelMaterials('normal');
  const parts = [];
  const add = (m, cast = true) => { m.castShadow = cast; m.receiveShadow = true; group.add(m); parts.push(m); return m; };

  // lower unit
  const body = add(blockyLower(spec));
  body.position.y = L.y0;
  // faceplate decal
  const face = new THREE.Mesh(new THREE.PlaneGeometry(spec.w, spec.lowH), decalMat(faceplateTexture(type), { roughness: 0.35 }));
  face.position.set(0, L.y0 + spec.lowH / 2, L.front + (st.panel ? 0.0062 : 0.0009));
  face.userData.noRim = true;
  add(face, false);
  // stand
  let stand;
  if (st.stand === 'crate') stand = add(new THREE.Mesh(geo('retro-crate', retroCrate, 0.02), mats));
  else stand = add(blockyStand(spec));

  // capsule case: back print, floor, banner, clear shell
  const cy0 = L.caseY0, ch = L.caseH;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(spec.w - 0.012, ch), new THREE.MeshStandardMaterial({ map: innerPrintTexture(st.inner), roughness: 0.6 }));
  back.position.set(0, cy0 + ch / 2, -spec.d / 2 + 0.008);
  add(back, false);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(spec.w - 0.012, spec.d - 0.012), new THREE.MeshStandardMaterial({ color: st.inner, roughness: 0.5 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, cy0 + 0.002, 0);
  add(floor, false);
  // case corner posts at the back (white)
  const postM = new THREE.MeshStandardMaterial({ color: st.body, roughness: 0.35 });
  for (const sx of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.012, ch, 0.012), postM);
    post.position.set(sx * (spec.w / 2 - 0.006), cy0 + ch / 2, -spec.d / 2 + 0.006);
    add(post);
  }
  const bannerMat = new THREE.MeshPhysicalMaterial({ map: opts.banner || null, color: opts.banner ? 0xffffff : 0xdddddd, roughness: 0.42, clearcoat: 0.8, clearcoatRoughness: 0.12, emissive: 0xffffff, emissiveMap: opts.banner || null, emissiveIntensity: opts.banner ? 0.12 : 0 });
  const bannerMesh = new THREE.Mesh(new THREE.PlaneGeometry(L.banner.w, L.banner.h), bannerMat);
  bannerMesh.position.set(L.banner.x, L.banner.y, L.banner.z);
  bannerMesh.userData.noRim = true;
  add(bannerMesh, false);
  // banner holder rails (thin clear plastic clips)
  const clipM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, transparent: true, opacity: 0.6 });
  for (const yy of [L.banner.y - L.banner.h / 2 - 0.002, L.banner.y + L.banner.h / 2 + 0.002]) {
    const clip = new THREE.Mesh(new THREE.BoxGeometry(L.banner.w + 0.01, 0.006, 0.01), clipM);
    clip.position.set(0, yy, L.banner.z);
    clip.userData.noRim = true;
    add(clip, false);
  }
  const glassM = clearPlastic(st.glass, st.worn ? 0.16 : 0.1);
  const shell = new THREE.Mesh(caseShellGeometry(spec.w - 0.002, spec.d - 0.002, ch, spec.bulge || 0), glassM);
  shell.position.y = cy0;
  shell.renderOrder = 3;
  shell.userData.noRim = true;
  group.add(shell);
  // glass highlight streaks
  const streakM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.14, depthWrite: false });
  for (const [x, wd, op] of [[-spec.w / 2 + 0.05, 0.022, 1], [-spec.w / 2 + 0.085, 0.008, 0.7]]) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(wd, ch * 0.8), streakM);
    s.position.set(x, cy0 + ch * 0.5, L.front + (spec.bulge ? spec.bulge * 0.8 : 0.001));
    s.rotation.z = -0.22;
    s.material = streakM;
    s.scale.x = op;
    s.userData.noRim = true;
    s.raycast = () => {};
    group.add(s);
  }
  // top cap + label
  const cap = add(blockyCap(spec));
  cap.position.y = cy0 + ch;
  const capLab = new THREE.Mesh(new THREE.PlaneGeometry(spec.w * 0.9, spec.w * 0.9 / 10), decalMat(capLabelTexture(type, opts.no || 1)));
  capLab.position.set(0, cy0 + ch + spec.capH / 2, (spec.d + 0.01) / 2 + 0.0008);
  capLab.userData.noRim = true;
  add(capLab, false);
  // royal: LED strips on the case front corners
  if (st.led) {
    const ledM = new THREE.MeshBasicMaterial({ color: new THREE.Color(st.led).multiplyScalar(2.2) });
    const ledM2 = new THREE.MeshBasicMaterial({ color: new THREE.Color(st.led2).multiplyScalar(2.2) });
    for (const sx of [-1, 1]) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.006, ch, 0.006), sx < 0 ? ledM : ledM2);
      l.position.set(sx * (spec.w / 2 - 0.004), cy0 + ch / 2, L.front - 0.004);
      group.add(l);
    }
  }
  // side panel (deluxe)
  if (spec.sidePanel) {
    const H = L.top + 0.02;
    const pm = new THREE.MeshStandardMaterial({ map: sidePanelTexture(H), roughness: 0.4 });
    const edge = new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.4 });
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.02, H, spec.d + 0.03), [pm, edge, edge, edge, edge, edge]);
    panel.position.set(spec.w / 2 + 0.012, H / 2, 0);
    add(panel);
  }

  // sample-figure dome on top
  const D = L.dome;
  const base = new THREE.Mesh(new THREE.BoxGeometry(D.w + 0.012, 0.012, D.d + 0.012), new THREE.MeshStandardMaterial({ color: st.body, roughness: 0.35 }));
  base.position.set(0, D.y + 0.006, D.z);
  add(base);
  const domeG = new RoundedBoxGeometry(D.w, D.h, D.d, 4, 0.03);
  const dome = new THREE.Mesh(domeG, clearPlastic(st.glass, st.worn ? 0.18 : 0.1));
  dome.position.set(0, D.y + 0.012 + D.h / 2, D.z);
  dome.renderOrder = 3;
  dome.userData.noRim = true;
  group.add(dome);
  const domeAnchor = new THREE.Group();
  domeAnchor.position.set(0, D.y + 0.012, D.z);
  group.add(domeAnchor);
  if (st.crown) {
    const crown = add(new THREE.Mesh(geo('crown', crownModel, 0.004), mats));
    crown.position.set(0, D.y + 0.012 + D.h, D.z);
  }

  return { group, L, body, stand, bannerMesh, domeAnchor, glassParts: [shell, dome] };
}

/** Handle (rotating knob): white disc with a raised grip bar; the grip colour shows the crank upgrade. */
export function buildHandle(r, level) {
  const cols = [0xf4f4f0, 0xd8352a, 0x2f6fd6, 0xe0e4ea, 0xe8c050, 0xe8c050];
  const g = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.97, 0.009, 48), plastic(0xf4f4f0));
  disc.rotation.x = Math.PI / 2; disc.position.z = 0.0045; g.add(disc);
  const gripM = level >= 3 ? plastic(cols[level], { metal: 0.9, rough: 0.22 }) : plastic(cols[level]);
  const grip = rbox(r * 0.42, r * 1.86, 0.02, r * 0.18, gripM);
  grip.position.z = 0.019; g.add(grip);
  const tri = new THREE.Shape(); tri.moveTo(0, 0.012); tri.lineTo(-0.008, -0.004); tri.lineTo(0.008, -0.004); tri.closePath();
  const tm = new THREE.Mesh(new THREE.ShapeGeometry(tri), new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.4 }));
  tm.position.set(0, r * 0.68, 0.0295); g.add(tm);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.22, r * 0.22, 0.004, 24), plastic(cols[level] === 0xf4f4f0 ? 0xdcdcd6 : cols[level]));
  hub.rotation.x = Math.PI / 2; hub.position.z = 0.0295; g.add(hub);
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return g;
}

/** Coin slot module (chrome ring, slot), coin-return button and keyhole. */
export function buildSlotModule(worn = false) {
  const g = new THREE.Group();
  const ch = plastic(worn ? 0xb0aca0 : 0xe4e8ec, { metal: 0.9, rough: worn ? 0.5 : 0.2 });
  const cyl = (r, h, m, x, y, z) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 32), m); c.rotation.x = Math.PI / 2; c.position.set(x, y, z + h / 2); g.add(c); return c; };
  cyl(0.028, 0.005, ch, 0, 0, 0);
  cyl(0.023, 0.006, plastic(0xf2f2ee), 0, 0, 0.004);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.028, 0.004), new THREE.MeshStandardMaterial({ color: 0x18181a }));
  slot.position.set(0, 0, 0.0095); g.add(slot);
  cyl(0.013, 0.005, ch, -0.018, -0.048, 0);
  cyl(0.010, 0.007, plastic(0xe8e8e4), -0.018, -0.048, 0.003);
  cyl(0.01, 0.005, ch, 0.024, -0.075, 0);
  const kh = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.008, 0.002), new THREE.MeshStandardMaterial({ color: 0x18181a })); kh.position.set(0.024, -0.075, 0.0055); g.add(kh);
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return g;
}

/** Small electric motor (crank upgrade lv5). */
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

/** Case extension (m) for a capacity upgrade level: the clear case grows taller. */
export function caseExtension(capLevel) { return capLevel >= 4 ? 0.12 : capLevel >= 2 ? 0.06 : 0; }

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
