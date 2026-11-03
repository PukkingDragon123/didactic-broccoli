// The FREE CANDY van and Gen-san, the old delivery uncle who drives it. A battered 1980s one-box panel van in chunky
// voxels (cream paint, a faded red stripe, rust, a roof rack), FREE CANDY hand-painted down both sides (he bought it
// from a sweets wholesaler and never repainted it: it's a running joke on the lane), a driver's door and a rear hatch
// that open, wheels that turn, and its own little engine sound that moves with it.
//   buildVan() -> { root, wheels[], door (pivot), hatch (pivot), cargo (Group), length, width, setWheels(dist) }
//   makeDriver() -> Human (cap, moustache, round glasses, Lane Express polo)
//   VanEngine: start(pos), move(pos, speed), stop()
import * as THREE from 'three';
import { VoxelModel, gloss, metal, glass } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { voxelMaterials } from '../voxel/materials.js';
import { shade } from '../voxel/palette.js';
import { Pix } from '../gfx/pix.js';
import { mask5, textW5 } from '../gfx/font5x7.js';
import { Human } from '../people/Human.js';
import { makeSpec } from '../people/presets.js';
import { audio } from '../core/audio.js';

const VS = 0.04; // 4 cm voxels
const PAINT = 0xefe6d2, PAINT2 = 0xe2d6bc, STRIPE = 0xc8302a, RUST = 0x8a4a2a, DARK = 0x2a2a2e, TRIM = 0x3a3a3e, GLASS = 0x26323e;
const hash = (x, y, z, s = 0) => { let h = (x * 374761393 + y * 668265263 + z * 2147483647 + s * 1013904223) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// body extents in voxels: nose at +x
const X0 = -46, X1 = 46, Z = 20, Y0 = 6, Y1 = 46;
const WHEELS = [[-28, -Z], [-28, Z], [29, -Z], [29, Z]];
const WR = 7.5; // wheel radius
const DOOR = { x0: 30, x1: 44, y0: 9, y1: 42 }; // driver's door (right side, +z)
const HATCH = { y0: 10, y1: 43, z0: -17, z1: 17 };

function frontX(y) { return y > 27 ? X1 - Math.round((y - 27) * 0.28) : X1; }
function bodyModel() {
  const v = new VoxelModel();
  v.jitter = 0.025;
  const paint = (x, y, z) => {
    // rust freckles low down and around the wheel arches, scuffs, the stripe
    const low = y < 13, h = hash(x, y, z, 1);
    if (y >= 15 && y <= 16) return gloss(shade(STRIPE, 0.86 + h * 0.12));
    if ((low && h < 0.12) || h < 0.012) return gloss(shade(RUST, 0.85 + h));
    return gloss(shade(y > 40 ? PAINT2 : PAINT, 0.93 + hash(x, y, z, 2) * 0.07));
  };
  // the shell (1 voxel thick), slanted windscreen, rounded roof edges
  v.shape(X0, Y0, -Z, X1, Y1, Z, (x, y, z) => {
    if (x > frontX(y)) return false;
    const edge = x === X0 || x === frontX(y) || x === frontX(y) - 1 && y > 27 || Math.abs(z) === Z || y === Y0 || y === Y1;
    if (!edge) return false;
    if (y === Y1 && (Math.abs(z) === Z || x === X0 || x >= frontX(y) - 1)) return false; // round the roof edge
    if (y === Y1 - 1 && Math.abs(z) === Z && (x === X0 || x >= frontX(y) - 1)) return false;
    return true;
  }, paint);
  // wheel arches
  for (const [wx, wz] of WHEELS) v.shape(wx - 10, Y0, wz - 2, wx + 10, Y0 + 11, wz + 2, (x, y) => (x - wx) ** 2 + (y - 7) ** 2 < (WR + 1.8) ** 2, null);
  for (const [wx, wz] of WHEELS) v.shape(wx - 10, Y0, Math.sign(wz) * (Z - 1), wx + 10, Y0 + 11, Math.sign(wz) * Z, (x, y) => { const d = Math.hypot(x - wx, y - 7); return d >= WR + 1.8 && d < WR + 2.9; }, gloss(DARK));
  // windscreen (slanted), cab side windows, small rear window
  v.paint(() => {
    v.shape(X1 - 6, 28, -Z + 2, X1, 43, Z - 2, (x, y) => x >= frontX(y) - 1, gloss(GLASS));
    for (const s of [-1, 1]) v.box(31, 28, s * Z, 43, 42, s * Z, gloss(GLASS));
    v.box(X0, 31, -15, X0, 41, 15, gloss(GLASS));
    // B-pillar and door seams
    for (const s of [-1, 1]) { v.box(30, 9, s * Z, 30, 43, s * Z, gloss(TRIM)); v.box(44, 9, s * Z, 44, 30, s * Z, gloss(TRIM)); }
    v.box(-8, 9, -Z, -8, 43, -Z, gloss(TRIM)); v.box(26, 9, -Z, 26, 43, -Z, gloss(TRIM)); // sliding door (kerb side)
    v.box(-6, 30, -Z, 24, 30, -Z, gloss(TRIM));
  });
  // front: grille, headlights, indicators, plate; rear: tail lights and plate
  v.paint(() => {
    for (let y = 18; y <= 23; y += 2) v.box(X1, y, -11, X1, y, 11, gloss(DARK));
    for (const s of [-1, 1]) {
      v.shape(X1, 17, s * 15 - 3, X1, 24, s * 15 + 3, (x, y, z) => (y - 20.5) ** 2 + (z - s * 15) ** 2 < 10, glass(0xfff0c0));
      v.box(X1, 13, s * 17 - 1, X1, 14, s * 17 + 1, gloss(0xff9a2a));
      v.box(X0, 14, s * 17 - 1, X0, 19, s * 17 + 1, gloss(0xd8282a));
      v.box(X0, 20, s * 17 - 1, X0, 21, s * 17 + 1, gloss(0xff9a2a));
    }
    v.box(X1, 10, -5, X1, 13, 5, gloss(0xf4f0e0)); v.box(X0, 10, -5, X0, 13, 5, gloss(0xf4f0e0));
    v.box(X0, 9, -17, X0, 43, -17, gloss(TRIM)); v.box(X0, 9, 17, X0, 43, 17, gloss(TRIM)); v.box(X0, 43, -17, X0, 43, 17, gloss(TRIM)); // hatch seam
  });
  // bumpers, mirrors, wipers, a roof rack with a spare box
  v.box(X1 + 1, 8, -Z, X1 + 2, 12, Z, gloss(DARK)); v.box(X0 - 2, 8, -Z, X0 - 1, 12, Z, gloss(DARK));
  for (const s of [-1, 1]) { v.line(42, 33, s * Z, 44, 34, s * (Z + 3), metal(0x9a9a9e)); v.box(43, 32, s * (Z + 3) - 1, 45, 36, s * (Z + 3) + 1, gloss(DARK)); }
  v.line(X1 - 2, 29, -12, X1 - 5, 38, -4, gloss(DARK)); v.line(X1 - 2, 29, 2, X1 - 5, 38, 10, gloss(DARK));
  for (const x of [-38, -14, 10, 26]) v.box(x, Y1 + 1, -Z + 1, x, Y1 + 2, Z - 1, metal(0x8a8a8e));
  v.box(-40, Y1 + 3, -Z + 1, 28, Y1 + 3, -Z + 1, metal(0x8a8a8e)); v.box(-40, Y1 + 3, Z - 1, 28, Y1 + 3, Z - 1, metal(0x8a8a8e));
  v.box(-30, Y1 + 3, -12, -12, Y1 + 9, 6, (x, y, z) => gloss(shade(0xc89a5f, 0.9 + hash(x, y, z, 5) * 0.1)));
  v.box(-30, Y1 + 6, -12, -12, Y1 + 6, 6, gloss(0x3a2a20)); // strap
  v.cylinder(4, Y1 + 3, -2, 7, 3, gloss(0x2a2a2a)); v.cylinder(4, Y1 + 3, -2, 3, 4, metal(0xb8b8bc)); // spare tyre
  // open the driver's door and the rear hatch holes; a dark interior shows through
  v.box(DOOR.x0 + 1, DOOR.y0, Z, DOOR.x1 - 1, DOOR.y1, Z, null);
  v.box(X0, HATCH.y0, HATCH.z0 + 1, X0, HATCH.y1 - 1, HATCH.z1 - 1, null);
  v.box(DOOR.x0, Y0 + 1, Z - 6, DOOR.x1, Y1 - 1, Z - 6, gloss(0x3a3430)); // cab back wall seen through the door
  v.box(DOOR.x0 + 2, 14, Z - 5, DOOR.x1 - 6, 20, Z - 1, gloss(0x6a4a3a)); // the seat
  v.box(DOOR.x1 - 4, 24, Z - 4, DOOR.x1 - 3, 30, Z - 2, gloss(DARK)); // steering column
  v.box(X0 + 1, Y0 + 1, -Z + 1, X0 + 30, Y0 + 1, Z - 1, gloss(0x4a4440)); // cargo floor
  v.box(X0 + 30, Y0 + 1, -Z + 1, X0 + 30, Y1 - 1, Z - 1, gloss(0x302c2a)); // bulkhead
  return v;
}
function wheelModel() {
  const v = new VoxelModel();
  v.jitter = 0.02;
  v.cylinder(0, 0, -2, WR, 5, (x, y) => { const d = Math.hypot(x, y); return gloss(d < 3.2 ? 0xb8b8bc : d < 4.5 ? 0x5a5a5e : 0x1e1e20); }, 'z');
  v.box(-1, -4, 2, 1, 4, 2, gloss(0x8a8a8e)); v.box(-4, -1, 2, 4, 1, 2, gloss(0x8a8a8e)); // spokes so you see it turn
  return v;
}
function doorModel() {
  const v = new VoxelModel();
  v.jitter = 0.02;
  const w = DOOR.x1 - DOOR.x0 - 1;
  v.box(0, DOOR.y0, 0, -w, DOOR.y1, 0, (x, y, z) => (y >= 15 && y <= 16 ? gloss(STRIPE) : gloss(shade(PAINT, 0.92 + hash(x, y, z, 7) * 0.07))));
  v.box(-1, 28, 0, -w + 1, 41, 0, gloss(GLASS));
  v.box(-w + 2, 22, 1, -w + 4, 22, 1, metal(0xb8b8bc)); // handle
  return v;
}
function hatchModel() {
  const v = new VoxelModel();
  v.jitter = 0.02;
  v.box(0, -(HATCH.y1 - HATCH.y0), HATCH.z0 + 1, 0, 0, HATCH.z1 - 1, (x, y, z) => gloss(shade(PAINT, 0.92 + hash(x, y, z, 9) * 0.07)));
  v.box(0, -12, -14, 0, -2, 14, gloss(GLASS));
  v.box(-1, -26, -4, -1, -24, 4, metal(0xb8b8bc));
  return v;
}

// ------------------------------------------------------------------ the FREE CANDY lettering (side panels, rear)
const texCache = {};
/** Chunky letters: the 5x7 font scaled up, with a dark outline (sign-painter style). */
function bigText(p, str, cx, y, s, col, out) {
  const w = textW5(str) * s, x0 = Math.round(cx - w / 2);
  const m = mask5(str);
  const set = new Set();
  for (const [i, j] of m) for (let a = 0; a < s; a++) for (let b = 0; b < s; b++) set.add(`${x0 + i * s + a},${y + j * s + b}`);
  for (const k of set) { const [x, yy] = k.split(',').map(Number); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1]]) if (!set.has(`${x + dx},${yy + dy}`)) p.px(x + dx, yy + dy, out); }
  for (const k of set) { const [x, yy] = k.split(',').map(Number); p.px(x, yy, (yy - y) < s * 2 ? shade(col, 1.12) : col); }
}
function sideTexture() {
  if (texCache.side) return texCache.side;
  const p = new Pix(128, 64, 1979);
  // transparent background: only the paint
  bigText(p, 'FREE', 46, 3, 3, 0xff5a8a, 0x5a1a2a);
  bigText(p, 'CANDY', 46, 27, 3, 0xe8302a, 0x5a1a2a);
  // a lollipop and two wrapped sweets
  for (let y = 0; y < 22; y++) for (let x = 0; x < 22; x++) { const dx = x - 10.5, dy = y - 10.5, d = Math.hypot(dx, dy); if (d < 10.5) { const a = Math.atan2(dy, dx) + d * 0.35; p.px(96 + x, 6 + y, d > 9.5 ? 0x5a1a2a : Math.floor((a / Math.PI) * 3 + 6) % 2 ? 0xff5a8a : 0xfff4e0); } }
  p.rect(106, 28, 2, 22, 0xf4ead6); p.rect(108, 28, 1, 22, 0xc8bca6);
  const sweet = (x, y, c) => { p.rect(x + 3, y, 6, 5, c); p.rect(x + 4, y + 1, 2, 1, 0xffffff); for (const s of [0, 10]) { p.px(x + s, y, c); p.px(x + s + 1, y + 1, c); p.px(x + s + 1, y + 2, c); p.px(x + s + 1, y + 3, c); p.px(x + s, y + 4, c); p.px(x + s + 1 + (s ? -1 : 1) * 0, y + 2, c); } p.px(x + 2, y + 2, c); p.px(x + 9, y + 2, c); };
  sweet(86, 44, 0x58c06c); sweet(110, 40, 0xffd23f);
  // the small print, and the chips and scratches of twenty years on the lane
  p.tinyText("GEN'S LANE EXPRESS", 46, 52, { color: 0x2a3a6a, align: 'center' });
  const r = (i) => hash(i, 3, 7, 1979);
  for (let i = 0; i < 26; i++) { const x = Math.floor(r(i) * 92), y = Math.floor(r(i + 99) * 50); p.px(x, y, 0x000000, 0); p.d[(y * 128 + x) * 4 + 3] = 0; p.px(x + 1, y, 0x000000, 0); p.d[(y * 128 + x + 1) * 4 + 3] = 0; }
  p.dirty = true;
  const t = p.texture();
  t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  return (texCache.side = t);
}
function rearTexture() {
  if (texCache.rear) return texCache.rear;
  const p = new Pix(64, 32, 77);
  bigText(p, 'FREE', 32, 2, 2, 0xff5a8a, 0x5a1a2a);
  bigText(p, 'CANDY', 32, 17, 2, 0xe8302a, 0x5a1a2a);
  const t = p.texture(); t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  return (texCache.rear = t);
}
function plateTexture() {
  if (texCache.plate) return texCache.plate;
  const p = new Pix(32, 16, 5);
  p.fill(0xf4f4ea); p.frame(0, 0, 32, 16, 0x3a6a3a);
  p.tinyText('MORIO 50', 16, 1, { color: 0x2a5a2a, align: 'center' });
  p.tinyText('12-34', 16, 8, { color: 0x2a5a2a, align: 'center' });
  const t = p.texture(); t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  return (texCache.plate = t);
}

let geos = null;
function vanGeos() {
  if (!geos) geos = { body: meshVoxels(bodyModel(), { voxelSize: VS, origin: 'none' }), wheel: meshVoxels(wheelModel(), { voxelSize: VS, origin: 'none' }), door: meshVoxels(doorModel(), { voxelSize: VS, origin: 'none' }), hatch: meshVoxels(hatchModel(), { voxelSize: VS, origin: 'none' }) };
  return geos;
}

/** The van: root faces +x (its nose); y = 0 is the road. */
export function buildVan() {
  const G = vanGeos();
  const mats = voxelMaterials('normal');
  const root = new THREE.Group();
  root.name = 'freeCandyVan';
  const body = new THREE.Mesh(G.body, mats);
  body.castShadow = true; body.receiveShadow = true;
  root.add(body);
  const decal = (tex, w, h) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.5, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -2 })); m.userData.noRim = true; m.raycast = () => {}; return m; };
  // FREE CANDY down both sides (on the panel behind the cab), on the hatch, and the plates
  for (const s of [-1, 1]) {
    const d = decal(sideTexture(), 2.56, 1.28);
    d.position.set((-40 + 26) / 2 * VS - 0.12, 0.49 + 1.28 / 2, s * (Z + 1) * VS + s * 0.003);
    if (s < 0) d.rotation.y = Math.PI;
    root.add(d);
  }
  const wheels = WHEELS.map(([x, z]) => {
    const w = new THREE.Mesh(G.wheel, mats);
    w.castShadow = true;
    const piv = new THREE.Group();
    piv.position.set(x * VS, WR * VS, z * VS + (z > 0 ? -0.04 : 0.04));
    if (z < 0) w.rotation.y = Math.PI;
    piv.add(w);
    root.add(piv);
    return piv;
  });
  const door = new THREE.Group();
  door.position.set(DOOR.x1 * VS, 0, (Z + 1) * VS);
  const dm = new THREE.Mesh(G.door, mats); dm.castShadow = true; door.add(dm);
  root.add(door);
  const hatch = new THREE.Group();
  hatch.position.set((X0 - 0.5) * VS, HATCH.y1 * VS, 0);
  const hm = new THREE.Mesh(G.hatch, mats); hm.castShadow = true; hatch.add(hm);
  const rd = decal(rearTexture(), 1.0, 0.5); rd.position.set(-0.045, -0.95, 0); rd.rotation.y = -Math.PI / 2; hatch.add(rd);
  root.add(hatch);
  const plate = decal(plateTexture(), 0.34, 0.17);
  plate.position.set((X0 - 0.4) * VS - 0.06, 0.48, 0); plate.rotation.y = -Math.PI / 2; root.add(plate);
  const plate2 = decal(plateTexture(), 0.34, 0.17);
  plate2.position.set((X1 + 2.2) * VS + 0.01, 0.4, 0); plate2.rotation.y = Math.PI / 2; root.add(plate2);
  // the cargo: the boxes for this stop sit in the back, visible when the hatch is up
  const cargo = new THREE.Group();
  cargo.position.set((X0 + 8) * VS, (Y0 + 2) * VS, 0);
  root.add(cargo);
  const api = {
    root, wheels, door, hatch, cargo, length: (X1 - X0) * VS, width: Z * 2 * VS,
    rearX: X0 * VS, frontX: X1 * VS, doorX: (DOOR.x0 + DOOR.x1) / 2 * VS, sideZ: (Z + 1) * VS,
    roll: 0,
    setWheels(dist) { api.roll = dist / (WR * VS); for (const w of wheels) w.rotation.z = -api.roll; },
  };
  return api;
}

// ------------------------------------------------------------------ Gen-san
export function makeDriver() {
  const spec = makeSpec('grandpa', 1979);
  Object.assign(spec, {
    name: 'Gen-san', H: 1.6, build: 1.04, belly: 0.75,
    hair: { ...spec.hair, style: 'short', col: [196, 192, 186], grey: 1 },
    face: { ...spec.face, mustache: true, wrinkles: 1, spots: 1, stubble: 0.15, browW: 1.35, lipFull: 0.75 },
    glasses: { kind: 'round', col: [70, 50, 34], thick: 1 },
    hat: { kind: 'cap', col: [228, 84, 120], col2: [250, 240, 228] },
    top: { kind: 'polo', col: [236, 228, 210], band: [200, 48, 42], sleeve: 'short', uniform: true },
    bottom: { kind: 'cargo', col: [58, 64, 80] },
    shoes: { kind: 'sneaker', col: [240, 240, 236], col2: [200, 48, 42] }, socks: { col: [236, 236, 232] },
    acc: [{ kind: 'pouch', col: [42, 38, 34] }],
    walk: { style: 'elder', hunch: 0.35 },
  });
  const h = new Human(spec, { lazy: true });
  h.root.name = 'gensan';
  return h;
}

// ------------------------------------------------------------------ engine sound that follows the van
export class VanEngine {
  constructor() { this.on = false; }
  start(pos) {
    if (this.on || !audio.ready) return;
    const ctx = audio.ctx;
    try {
      const pan = ctx.createPanner();
      pan.panningModel = 'equalpower'; pan.distanceModel = 'inverse'; pan.refDistance = 3; pan.rolloffFactor = 1.2; pan.maxDistance = 80;
      const g = ctx.createGain(); g.gain.value = 0;
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 42;
      const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = 21;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260; lp.Q.value = 2;
      const g2 = ctx.createGain(); g2.gain.value = 0.35;
      o.connect(lp); o2.connect(g2).connect(lp); lp.connect(g).connect(pan).connect(audio.sfx);
      o.start(); o2.start();
      Object.assign(this, { pan, g, o, o2, lp, on: true });
      this.move(pos, 0);
      g.gain.setTargetAtTime(0.16, ctx.currentTime, 0.3);
    } catch { this.on = false; }
  }
  move(pos, speed = 0) {
    if (!this.on) return;
    const t = audio.ctx.currentTime;
    const P = this.pan;
    if (P.positionX) { P.positionX.setTargetAtTime(pos.x, t, 0.05); P.positionY.setTargetAtTime(pos.y, t, 0.05); P.positionZ.setTargetAtTime(pos.z, t, 0.05); } else P.setPosition(pos.x, pos.y, pos.z);
    const f = 38 + Math.min(1, Math.abs(speed) / 7) * 46;
    this.o.frequency.setTargetAtTime(f, t, 0.15); this.o2.frequency.setTargetAtTime(f / 2, t, 0.15);
    this.lp.frequency.setTargetAtTime(220 + Math.abs(speed) * 60, t, 0.2);
  }
  stop() {
    if (!this.on) return;
    this.on = false;
    const t = audio.ctx.currentTime;
    this.g.gain.setTargetAtTime(0, t, 0.25);
    const { o, o2 } = this;
    setTimeout(() => { try { o.stop(); o2.stop(); } catch { /* stopped */ } }, 1200);
  }
}
