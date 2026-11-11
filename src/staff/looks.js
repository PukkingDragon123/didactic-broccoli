// How applicants and staff look: a Human from a preset + seed + a few overrides (saved as a tiny `look` record), the
// shop apron once they're hired, and the voxel extras of the odd ones: the kappa's water dish (it shows how wet it is),
// beak and shell; the tanuki's ears, striped tail and the leaf on his hat; the yurei's white forehead triangle (and
// she floats, a little see-through); the not-a-ninja's face mask; the robot kid's antenna. Plus head-and-shoulders
// portraits rendered from the actual 3D look into chunky pixel art for the Inspired site, Pichat and the rota.
//
//   lookSpec(look, { uniform })               -> a Human spec (src/people/presets.js makeSpec + overrides)
//   buildPerson(look, { uniform, lazy })       -> Human with the extras (h.staffRig: { dish, setDish(k), ... })
//   portrait(game, look, { size, uniform })    -> data: URL (cached; renders once, ~a frame's work)
//   portraitLater(game, look, cb)              queue a portrait so pages never hitch (cb(url) when ready)
import * as THREE from 'three';
import { Human } from '../people/Human.js';
import { makeSpec } from '../people/presets.js';
import { dressHuman } from '../people/cosmetics.js';
import { mixc } from '../people/paintlib.js';
import { VoxelModel, gloss } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { voxelMaterials } from '../voxel/materials.js';

export const APRON = [176, 44, 52]; // Gacha Garage red
const BAGS = new Set(['briefcase', 'shoulderbag', 'tote', 'backpack', 'randoseru', 'ecobag', 'handbag', 'camera', 'cane', 'towel', 'pouch']);

/** A Human spec for a look record { base, seed, kind, o }. */
export function lookSpec(look, { uniform = false } = {}) {
  const spec = makeSpec(look.base || 'salaryman', look.seed || 1);
  const o = look.o || {};
  for (const [k, v] of Object.entries(o)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && spec[k] && typeof spec[k] === 'object' && !Array.isArray(spec[k])) spec[k] = { ...spec[k], ...structuredClone(v) };
    else spec[k] = structuredClone(v);
  }
  if (o.hair?.col && !o.hair.hi) {
    const hc = spec.hair.col;
    spec.hair.hi = spec.hair.grey ? [250, 250, 248] : hc[0] < 80 ? mixc(hc, [176, 180, 214], 0.75) : mixc(hc, [255, 244, 222], 0.55);
  }
  if (o.H) spec.H = o.H;
  if (uniform) {
    // work clothes: bags stay at home, the shop's red apron goes on
    spec.acc = (spec.acc || []).filter((a) => !BAGS.has(a.kind) && a.kind !== 'apron');
    spec.acc.push({ kind: 'apron', col: APRON.slice(), col2: [240, 232, 220] });
  }
  return spec;
}

// ------------------------------------------------------------------ voxel extras
const vm = (j = 0.03) => { const v = new VoxelModel(); v.jitter = j; return v; };
const geos = new Map();
/** Geometry in model units (voxel (x, y, z) centred on (x, y, z)). */
function geo(key, build) {
  let g = geos.get(key);
  if (!g) { g = meshVoxels(build(), { voxelSize: 1, origin: 'none' }); g.translate(-0.5, -0.5, -0.5); g.computeBoundingSphere(); geos.set(key, g); }
  return g;
}
function vmesh(key, build) {
  const m = new THREE.Mesh(geo(key, build), voxelMaterials('normal'));
  m.castShadow = true; m.receiveShadow = true; m.raycast = () => {};
  return m;
}
/** A group on the head bone in head units (1 = 1/20 of the head's height; chin -4, eyes 6, crown 16, face z 10.8). */
function headUnits(h) {
  const P = h.P, U = P.hu / 20;
  const g = new THREE.Group();
  g.scale.set(U * P.hw / (0.335 * P.hu), U, U * P.hd / (0.42 * P.hu));
  h.b.head.add(g);
  return g;
}

const MODELS = {
  /** The kappa's dish: a pale ceramic ring on the crown (the water is its own mesh so it can dry out). */
  dishRim() {
    const v = vm(0.02);
    for (let x = -6; x <= 6; x++) for (let z = -6; z <= 6; z++) {
      const r = Math.hypot(x, z);
      if (r <= 6.2 && r > 4.6) { v.set(x, 0, z, r > 5.6 ? 0xd8d2c0 : 0xeae6da); v.set(x, 1, z, 0xf2eee4); }
      else if (r <= 4.6) v.set(x, 0, z, 0xcfc8b4);
    }
    return v;
  },
  dishWater() {
    const v = vm(0);
    for (let x = -5; x <= 5; x++) for (let z = -5; z <= 5; z++) if (Math.hypot(x, z) <= 4.7) v.set(x, 0, z, gloss(0xffffff));
    return v;
  },
  beak() {
    const v = vm(0.02), Y = 0xe8b830, D = 0xb8862a;
    for (let x = -3; x <= 3; x++) for (let z = 0; z <= 4; z++) for (let y = -2; y <= 1; y++) {
      if (Math.abs(x) === 3 && z > 1) continue;
      if (Math.abs(x) === 2 && z > 3) continue;
      if (y === 1 && z >= 3) continue;
      v.set(x, y, z, y < 0 ? D : Y);
    }
    v.set(0, 0, 5, Y); v.set(0, -1, 5, D);
    return v;
  },
  /** The shell (metres / voxel = P.H / 120, pivot at the middle of its inner face). */
  shell() {
    const v = vm(0.04), A = 0x6a7a3a, B = 0x50602c, E = 0xb8a868;
    for (let x = -10; x <= 10; x++) for (let y = -12; y <= 12; y++) for (let z = -5; z <= 0; z++) {
      const e = (x / 10.5) ** 2 + (y / 12.5) ** 2 + ((z + 0.5) / 5.5) ** 2;
      if (e > 1) continue;
      const rim = (x / 10.5) ** 2 + (y / 12.5) ** 2 > 0.82;
      const plate = (Math.floor((x + 30) / 5) + Math.floor((y + 30) / 5)) % 2;
      v.set(x, y, z, rim ? E : plate ? A : B);
    }
    return v;
  },
  /** Tanuki ear (head units). */
  tanukiEar() {
    const v = vm(0.03), B = 0x6a4a32, D = 0x2a2018;
    for (let x = -2; x <= 2; x++) for (let y = 0; y <= 3; y++) if (Math.hypot(x, y * 0.9) <= 2.6) v.set(x, y, 0, y >= 2 && Math.abs(x) <= 1 ? D : B);
    for (let x = -1; x <= 1; x++) v.set(x, 1, -1, B);
    return v;
  },
  /** The leaf a tanuki puts on his head to change shape (head units). */
  leaf() {
    const v = vm(0.02), G = 0x5a9a3a, D = 0x3a6a24;
    const rows = ['...G...', '..GGG..', '.GGDGG.', 'GGGDGGG', '.GGDGG.', '..GDG..', '...D...', '...D...'];
    rows.forEach((r, i) => [...r].forEach((ch, x) => { if (ch !== '.') v.set(x - 3, 0, i - 4, ch === 'D' ? D : G); }));
    return v;
  },
  /** Bushy striped tail (metres / voxel = P.H / 140), pointing down and back from the pivot. */
  tanukiTail() {
    const v = vm(0.05), B = 0x8a6a4a, D = 0x3a2a1e, L = 0xc8a878;
    for (let i = 0; i <= 18; i++) {
      const r = 2.2 + Math.sin(Math.min(1, i / 14) * Math.PI) * 2.8;
      const col = i > 15 ? D : Math.floor(i / 4) % 2 ? D : B;
      for (let x = -6; x <= 6; x++) for (let y = -6; y <= 6; y++) if (Math.hypot(x, y) <= r) v.set(x, y, -i, i < 3 && y > 2 ? L : col);
    }
    return v;
  },
  /** The yurei's white triangle on the forehead (head units). */
  hitai() {
    const v = vm(0.01), W = 0xf4f2ec, K = 0xd8d4c8;
    for (let y = 0; y < 5; y++) for (let x = -(4 - y); x <= 4 - y; x++) v.set(x, y, 0, y === 0 || Math.abs(x) === 4 - y ? K : W);
    for (let x = -7; x <= 7; x++) if (Math.abs(x) > 4) v.set(x, 1, -Math.round((Math.abs(x) - 4) * 0.8), K);
    return v;
  },
  /** Cloth mask over nose and mouth (head units). */
  mask() {
    const v = vm(0.02), C = 0x24263a, D = 0x1a1c2a;
    for (let x = -7; x <= 7; x++) for (let y = -5; y <= 3; y++) {
      const z = Math.round(10.6 - (x * x) / 9 - (y < -2 ? (y + 2) * (y + 2) * 0.4 : 0));
      if (z < 2) continue;
      v.set(x, y, z, y === 3 ? D : C);
      v.set(x, y, z - 1, C);
    }
    return v;
  },
  /** Springy antenna with a red ball (head units). */
  antenna() {
    const v = vm(0), S = 0x9aa0a8, R = gloss(0xe03030);
    for (let y = 0; y < 7; y++) v.set(y % 2 ? 1 : 0, y, 0, S);
    for (let x = -1; x <= 1; x++) for (let y = 7; y <= 9; y++) for (let z = -1; z <= 1; z++) if (Math.abs(x) + Math.abs(y - 8) + Math.abs(z) <= 2) v.set(x, y, z, R);
    return v;
  },
};

const DISH_WET = new THREE.Color(0x5aa8e0), DISH_DRY = new THREE.Color(0xb8ae94);

/** The extras for a look's kind, attached to h's bones. Returns the rig (or null). */
function dressKind(h, kind) {
  const P = h.P, J = h.J, b = h.b;
  const rig = { kind, parts: [], t: Math.random() * 10, anims: [] };
  if (kind === 'kappa') {
    const hg = headUnits(h); rig.parts.push(hg);
    const rim = vmesh('kappa:dish', MODELS.dishRim);
    rim.position.set(0, 17.3, 2.0);
    hg.add(rim);
    const water = new THREE.Mesh(geo('kappa:water', MODELS.dishWater), new THREE.MeshStandardMaterial({ color: DISH_WET.clone(), roughness: 0.15, metalness: 0.1 }));
    water.position.set(0, 17.9, 2.0); water.scale.y = 0.6; water.raycast = () => {};
    hg.add(water);
    rig.water = water;
    const beak = vmesh('kappa:beak', MODELS.beak);
    beak.position.set(0, 0.4, 10.2);
    hg.add(beak);
    const V = P.H / 120;
    const shell = vmesh('kappa:shell', MODELS.shell);
    shell.scale.setScalar(V);
    const y = (P.waistY + P.shoulderY) / 2 - 0.02 * P.H;
    shell.position.set(0, y - J.chest[1], -P.chestZ - 0.006 * P.H);
    b.chest.add(shell); rig.parts.push(shell);
    rig.setDish = (k) => { water.material.color.copy(DISH_DRY).lerp(DISH_WET, Math.max(0, Math.min(1, k))); water.scale.y = 0.25 + 0.5 * k; water.position.y = 17.55 + 0.35 * k; };
  } else if (kind === 'tanuki') {
    const hg = headUnits(h); rig.parts.push(hg);
    for (const sx of [-1, 1]) { const e = vmesh('tanuki:ear', MODELS.tanukiEar); e.position.set(sx * 5.0, 20.4, 1.8); e.rotation.z = -sx * 0.35; hg.add(e); }
    const leaf = vmesh('tanuki:leaf', MODELS.leaf);
    leaf.position.set(0.5, 21.2, 2.2); leaf.rotation.set(0.15, 0.6, 0.1);
    hg.add(leaf);
    const V = P.H / 140;
    const tail = new THREE.Group();
    tail.position.set(0, P.hipY - J.hips[1], -P.hipsZ - 0.01 * P.H);
    tail.rotation.x = -0.75;
    const tm = vmesh('tanuki:tail', MODELS.tanukiTail);
    tm.scale.setScalar(V);
    tail.add(tm);
    b.hips.add(tail); rig.parts.push(tail);
    rig.anims.push((dt, t, moving) => { tail.rotation.y = Math.sin(t * (moving ? 7 : 1.6)) * (moving ? 0.35 : 0.12); tail.rotation.x = -0.75 + Math.sin(t * 2.1) * 0.05; });
  } else if (kind === 'ghost') {
    const hg = headUnits(h); rig.parts.push(hg);
    const tri = vmesh('yurei:hitai', MODELS.hitai);
    tri.position.set(0, 12.2, 10.4); tri.rotation.x = -0.22;
    hg.add(tri);
    // a little see-through, drifting just above the floor (no glow: just less there)
    h.mat.transparent = true; h.mat.opacity = 0.78; h.mat.depthWrite = true;
    h.mesh.castShadow = false;
    rig.anims.push((dt, t) => { h.mesh.position.y = 0.06 + Math.sin(t * 1.7) * 0.025; });
  } else if (kind === 'ninja') {
    const hg = headUnits(h); rig.parts.push(hg);
    const mask = vmesh('ninja:mask', MODELS.mask); mask.position.z = 1.1; hg.add(mask);
  } else if (kind === 'robokid') {
    const hg = headUnits(h); rig.parts.push(hg);
    for (const sx of [-1, 1]) { const a = vmesh('robo:antenna', MODELS.antenna); a.position.set(sx * 4.5, 15.5, 2); a.rotation.z = -sx * 0.3; hg.add(a); rig.anims.push((dt, t, moving) => { a.rotation.z = -sx * 0.3 + Math.sin(t * (moving ? 11 : 3) + sx) * (moving ? 0.18 : 0.06); }); }
  } else return null;
  return rig;
}

/** Build the person: Human + hand poses + the extras of their kind (+ the apron when uniform). */
export function buildPerson(look, { uniform = false, lazy = true } = {}) {
  const spec = lookSpec(look, { uniform });
  const h = new Human(spec, { lazy });
  h.npcProps = {};
  dressHuman(h, {});
  const rig = dressKind(h, look.kind);
  h.staffRig = rig;
  if (rig) {
    const up = h.update, dis = h.dispose;
    h.update = function (dt, o = {}) {
      up.call(this, dt, o);
      rig.t += dt;
      for (const a of rig.anims) a(dt, rig.t, (o.speed || 0) > 0.1);
    };
    h.dispose = function () { for (const p of rig.parts) p.removeFromParent(); dis.call(this); };
  }
  return h;
}

// ------------------------------------------------------------------ portraits
const cache = new Map();
const queue = [];
let pumping = false, cam = null;
const keyOf = (look, size, uniform) => JSON.stringify([look.base, look.seed, look.kind, look.o, size, uniform]);

/** A head-and-shoulders portrait of a look, as a pixel-art data URL (rendered small, shown with nearest scaling). */
export function portrait(game, look, { size = 48, uniform = false, bg = null } = {}) {
  const k = keyOf(look, size, uniform);
  if (cache.has(k)) return cache.get(k);
  let url = '';
  try { url = render(game, look, size, uniform, bg); } catch (e) { console.warn('staff portrait', e); }
  cache.set(k, url);
  return url;
}
export const portraitCached = (look, { size = 48, uniform = false } = {}) => cache.get(keyOf(look, size, uniform)) || null;

/** Render it a little later (one per frame) and call cb(url). */
export function portraitLater(game, look, cb, opts = {}) {
  const hit = portraitCached(look, opts);
  if (hit) { cb(hit); return; }
  queue.push([look, cb, opts]);
  if (pumping) return;
  pumping = true;
  const step = () => {
    const job = queue.shift();
    if (!job) { pumping = false; return; }
    const [l, f, o] = job;
    const url = portrait(game, l, o);
    try { f(url); } catch (e) { console.warn(e); }
    setTimeout(step, 16);
  };
  setTimeout(step, 16);
}

function render(game, look, size, uniform, bg) {
  const T = game.thumbs, r = T?.renderer;
  if (!r) return '';
  const h = buildPerson(look, { uniform, lazy: false });
  h.setExpression('smile');
  h.update(0.016, {});
  h.root.updateMatrixWorld(true);
  const eyeY = h.P.eyeY;
  const box = new THREE.Box3().setFromObject(h.root);
  cam ||= new THREE.PerspectiveCamera(22, 1, 0.01, 10);
  // framing: from the top of the head (and anything on it: hat, dish, ears) down to the shoulders
  const top = Math.min(box.max.y, eyeY + 0.32) + 0.025, bottom = eyeY - 0.21;
  const cy = (top + bottom) / 2, half = (top - bottom) / 2;
  const dist = half / Math.tan(THREE.MathUtils.degToRad(11)) * 1.04;
  const dir = new THREE.Vector3(0.36, 0.1, 1).normalize();
  cam.position.set(dir.x * dist, cy + dir.y * dist, dir.z * dist + h.P.zf * 0.5);
  cam.lookAt(0, cy, 0);
  cam.updateProjectionMatrix();
  T.scene.add(h.root);
  if (T.rt.width !== size) T.rt.setSize(size, size);
  const prevRT = r.getRenderTarget(), prevClear = r.getClearColor(new THREE.Color()), prevAlpha = r.getClearAlpha();
  r.setRenderTarget(T.rt);
  r.setClearColor(bg ?? 0x000000, bg == null ? 0 : 1);
  r.clear();
  r.render(T.scene, cam);
  const px = new Uint8Array(size * size * 4);
  r.readRenderTargetPixels(T.rt, 0, 0, size, size, px);
  r.setRenderTarget(prevRT);
  r.setClearColor(prevClear, prevAlpha);
  T.scene.remove(h.root);
  h.dispose?.();
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    const src = (size - 1 - y) * size * 4, dst = y * size * 4;
    for (let i = 0; i < size * 4; i += 4) {
      const a = px[src + i + 3];
      // hard alpha (pixel art: a texel is there or it isn't)
      img.data[dst + i] = px[src + i]; img.data[dst + i + 1] = px[src + i + 1]; img.data[dst + i + 2] = px[src + i + 2];
      img.data[dst + i + 3] = a > 110 ? 255 : 0;
    }
  }
  ctx.putImageData(img, 0, 0);
  // a 1-px dark outline round the figure, like the game's icons
  const out = document.createElement('canvas');
  out.width = out.height = size;
  const o = out.getContext('2d');
  const d = img.data, od = o.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    if (d[i + 3]) { od.data[i] = d[i]; od.data[i + 1] = d[i + 1]; od.data[i + 2] = d[i + 2]; od.data[i + 3] = 255; continue; }
    const n = (xx, yy) => xx >= 0 && yy >= 0 && xx < size && yy < size && d[(yy * size + xx) * 4 + 3];
    if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) { od.data[i] = 26; od.data[i + 1] = 18; od.data[i + 2] = 22; od.data[i + 3] = 255; }
  }
  o.putImageData(od, 0, 0);
  return out.toDataURL();
}
