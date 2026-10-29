// The three lane regulars as Humans with their finishing touches (an affectionate nod to a certain bizarre
// adventure's fourth arc; original low-poly designs in the game's own style):
//   Kishibe Rohan  cropped knit top (bare midriff, zig-zag trim), pale trousers, zig-zag headband, pen-nib earrings,
//                  a sketchbook in the left hand and a G-pen in the right
//   Josuke         towering pompadour, a long gakuran (chōran: coat skirts from garb.js) with gold heart / peace pins
//   Okuyasu        buzzed spikes, a scar through the brow, the gakuran worn open over a mustard tee, baggy trousers
//
//   createCharacter(id, { seed, lazy }) -> Human (presets.js BUILD[id] + the touches below; dressHuman for hand poses)
//
// The base painters (paint.js) know nothing about crops, open jackets or coat seams, so after the atlas is painted
// `retouch` walks every texel again (the mesh layout is deterministic: same spec -> same faces and rects) and lets a
// character painter repaint the ones it cares about. Voxel props ride on the bones like the closet cosmetics.
import * as THREE from 'three';
import { createHuman } from '../people/index.js';
import { buildPlan } from '../people/body.js';
import { buildMesh, ATLAS } from '../people/mesh.js';
import { dressHuman } from '../people/cosmetics.js';
import { shadeInto, over, h2, mixc, G } from '../people/paintlib.js';
import { VoxelModel, metal, gloss } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { voxelMaterials } from '../voxel/materials.js';

const INK = [28, 22, 22], GOLD = [214, 170, 70];
const TORSO = { spine: 1, chestLo: 1, chestHi: 1, traps: 1, hipsUp: 1, hipsLo: 1 };

// ------------------------------------------------------------------ retouching the painted atlas
/**
 * Re-walk every atlas texel of h (exactly like paint.js) and let fn(c, o) repaint it: o holds the current colour
 * (rgb 0..255, a); return true to write it back. c: { x, y, z (rest-pose metres), nx, ny, nz, part, kind, e, rb, rt, rh, px, i, j }.
 */
export function retouch(h, fn) {
  h.finishPaint?.();
  const m = buildMesh(buildPlan(h.spec));
  m.geometry.dispose();
  if (m.block.x !== h.face.B.x || m.block.y !== h.face.B.y) { console.warn('retouch: atlas layout mismatch'); return; }
  const d = h.pix.d, o = new Float32Array(4);
  const c = { x: 0, y: 0, z: 0, i: 0, j: 0, part: '', kind: '', nx: 0, ny: 0, nz: 0, px: 0, e: 0, rb: 0, rt: 0, rh: 0, seg: null };
  for (const f of m.faces) {
    c.seg = f.seg; c.part = f.seg.part; c.kind = f.kind; c.nx = f.N[0]; c.ny = f.N[1]; c.nz = f.N[2]; c.px = 1 / f.dens;
    const R = f.rect, sw = f.s1 - f.s0, rh = f.r1 - f.r0;
    for (let j = 0; j < R.h; j++) {
      const r = f.r1 - (j - 0.5) / f.dens;
      for (let i = 0; i < R.w; i++) {
        const s = f.s0 + (i - 0.5) / f.dens;
        c.x = f.o[0] + f.U[0] * s + f.V[0] * r; c.y = f.o[1] + f.U[1] * s + f.V[1] * r; c.z = f.o[2] + f.U[2] * s + f.V[2] * r;
        c.i = R.x + i; c.j = R.y + j;
        c.e = sw > 0 ? ((s - f.s0) / sw) * 2 - 1 : 0;
        c.rb = r - f.r0; c.rt = f.r1 - r; c.rh = rh;
        const p = (c.j * ATLAS + c.i) * 4;
        o[0] = d[p]; o[1] = d[p + 1]; o[2] = d[p + 2]; o[3] = d[p + 3];
        if (!fn(c, o)) continue;
        d[p] = Math.max(0, Math.min(255, o[0])); d[p + 1] = Math.max(0, Math.min(255, o[1])); d[p + 2] = Math.max(0, Math.min(255, o[2])); d[p + 3] = o[3];
      }
    }
  }
  h.pix.dirty = true;
  h.pix.flush();
  h.tex.needsUpdate = true;
}

/** A soft, simplified version of paint.js' body shading (enough for repainted patches). */
function bodyK(c, P) {
  let k = 0.9 + 0.12 * Math.min(1, Math.max(0, c.y / P.H * 1.25));
  if (c.kind === 'side') k *= 1 - 0.07 * c.e * c.e;
  else if (c.kind === 'bot') k *= 0.7;
  if (TORSO[c.part] && Math.abs(c.nx) > 0.55) k *= 0.88;
  return k * (1 + 0.03 * Math.sin(c.x * 37 + c.z * 23 + Math.sin(c.y * 13) * 2) * Math.sin(c.y * 29 + c.x * 11));
}
const cloth = (c, k = 0.05) => 1 + (h2(c.i, c.j, 11) - 0.5) * k;
const front = (c) => c.nz > 0.45;

function skinAt(c, o, P, skin, k = 1) {
  shadeInto(o, skin, k * bodyK(c, P) * (1 + (h2(c.i, c.j, 21) - 0.5) * 0.035), 0.25);
  over(o, [210, 120, 110], 0.05 * Math.max(0, 1 - Math.abs(c.e)));
}

/** Trousers below a raised hem: cloth, belt with a buckle, fly and slanted pockets (cf. paint.js bottomPx). */
function trousersAt(c, o, P, spec) {
  const H = P.H, Bt = spec.bottom, waist = P.pelvisY + 0.004 * H, ax = Math.abs(c.x);
  shadeInto(o, Bt.col, bodyK(c, P) * cloth(c, 0.06));
  if (c.y > waist - 0.02 * H) {
    if (Bt.belt) {
      shadeInto(o, Bt.belt, bodyK(c, P) * (Math.abs(c.y - waist + 0.01 * H) < 0.004 * H ? 1.12 : 1));
      if (front(c) && ax < 0.016 * H) { shadeInto(o, GOLD, 0.95 + 0.15 * h2(c.i, c.j, 5)); if (Math.abs(ax - 0.016 * H) < c.px) over(o, INK, 0.5); }
    }
    if (Math.abs(c.y - (waist - 0.02 * H)) < c.px * 0.7) over(o, INK, 0.35);
    if (Math.abs(c.y - waist) < c.px * 0.6) over(o, INK, 0.3);
    return;
  }
  if (front(c) && Math.abs(c.x - 0.008 * H) < c.px * 0.6) over(o, INK, 0.35);
  const pxl = P.hipsX * 0.62 + (waist - c.y) * 0.45;
  if (front(c) && Math.abs(ax - pxl) < c.px * 0.8 && c.y > waist - 0.075 * H) over(o, INK, 0.4);
}

// ------------------------------------------------------------------ per character painters
const PAINT = {
  /** Cropped knit: bare midriff between the ribbed hem and the belt, gold zig-zag trims on the hem and cuffs. */
  rohan(h) {
    const P = h.P, spec = h.spec, H = P.H, T = spec.top;
    const waist = P.pelvisY + 0.004 * H, crop = P.waistY + 0.014 * H, knitHem = P.hipY + 0.012 * H;
    const cuff = P.elbowY + 0.065 * H, trim = [222, 186, 92];
    const zig = (c, y0, amp, per) => { const u = (Math.abs(c.nz) > 0.6 ? c.x * Math.sign(c.nz) : c.z * -Math.sign(c.nx || 1) + 0.3) / per; return y0 + (Math.abs((u - Math.floor(u)) - 0.5) * 2 - 0.5) * amp; };
    retouch(h, (c, o) => {
      if (TORSO[c.part] && c.kind !== 'top' && c.kind !== 'bot') {
        if (c.y < crop && c.y > waist) {
          skinAt(c, o, P, spec.skin);
          // a hint of abs and the navel
          if (front(c)) {
            if (Math.abs(c.x) < c.px * 0.7) over(o, [150, 80, 70], 0.12);
            const ny = P.waistY - 0.026 * H;
            if (Math.hypot(c.x, (c.y - ny) * 0.7) < 0.0035 * H) over(o, [110, 56, 50], 0.6);
            over(o, [150, 80, 70], 0.06 * G(Math.abs(c.x) - 0.03 * H, c.y - (P.waistY + 0.002 * H), 0.012 * H, 0.008 * H));
          }
          // shadow under the hem
          if (crop - c.y < 0.01 * H) { const k = 1 - 0.25 * (1 - (crop - c.y) / (0.01 * H)); o[0] *= k; o[1] *= k * 0.97; o[2] *= k * 0.95; }
          return true;
        }
        if (c.y <= waist && c.y > knitHem - 0.004 * H) { trousersAt(c, o, P, spec); return true; }
        if (c.y >= crop && c.y < crop + 0.02 * H) {
          shadeInto(o, T.col, bodyK(c, P) * (c.i % 2 ? 0.86 : 1));
          const zy = zig(c, crop + 0.01 * H, 0.012 * H, 0.03 * H);
          if (Math.abs(c.y - zy) < 0.0028 * H) shadeInto(o, trim, 0.98);
          if (c.y - crop < c.px * 1.2) over(o, INK, 0.4);
          return true;
        }
        return false;
      }
      if (c.part === 'uarm' && c.y > cuff && c.y < cuff + 0.02 * H) {
        const zy = cuff + 0.01 * H + (Math.abs(((c.e + 1) * 3) % 1 - 0.5) * 2 - 0.5) * 0.008 * H;
        if (Math.abs(c.y - zy) < 0.0024 * H) { shadeInto(o, trim, 0.95); return true; }
      }
      return false;
    });
  },

  /** The coat skirts: wool, a dark opening edge down the front, a back vent, side seams and a heavy hem. */
  josuke(h) {
    const P = h.P, H = P.H, col = h.spec.top.col;
    retouch(h, (c, o) => {
      if (c.part !== 'coat') return false;
      if (c.kind === 'bot') { shadeInto(o, col, 0.45); return true; }
      const ax = Math.abs(c.x);
      let k = bodyK(c, P) * cloth(c, 0.06) * (1 - 0.1 * Math.max(0, Math.sin(c.x * 160 + c.z * 90 + Math.sin(c.y * 40) * 1.5)) ** 3);
      if (c.kind === 'top') k *= 0.85;
      shadeInto(o, col, k);
      if (c.kind !== 'side') return true;
      if (c.rb < 0.012 * H) { o[0] *= 0.92; o[1] *= 0.92; o[2] *= 0.92; if (Math.abs(c.rb - 0.012 * H) < c.px * 0.7) over(o, INK, 0.3); }
      if (c.rb < c.px * 1.2) over(o, INK, 0.35);
      if (ax < 0.0025 * P.H + c.px * 1.6 && Math.abs(c.nx) < 0.5) over(o, INK, 0.55); // the opening (front) / vent (back)
      if (Math.abs(c.nx) > 0.9 && Math.abs(c.e) < 0.08) over(o, INK, 0.18);
      if (c.rt < c.px * 1.2) over(o, INK, 0.2);
      return true;
    });
  },

  /** The gakuran hangs open over a mustard tee (red lining along the edges); open collar; scar through the brow. */
  okuyasu(h) {
    const P = h.P, H = P.H, spec = h.spec, T = spec.top;
    const yN = P.neckBase, hem = P.hipY + 0.004 * H, tee = [246, 206, 52], lining = [150, 32, 40];
    const open = (y) => 0.018 * H + Math.max(0, yN - y) * 0.2;
    retouch(h, (c, o) => {
      const ax = Math.abs(c.x);
      if (TORSO[c.part] && front(c) && c.y > P.hipY - 0.01 * H && c.y < yN + 0.01 * H) {
        const w = open(c.y);
        if (ax < w) {
          shadeInto(o, tee, bodyK(c, P) * cloth(c, 0.05) * (1 - 0.12 * (1 - ax / w)));
          if (c.y > yN - 0.012 * H) shadeInto(o, tee, bodyK(c, P) * (c.i % 2 ? 0.84 : 0.98)); // crew neck rib
          if (c.y < hem + 0.004 * H && c.y > hem - 0.002 * H) over(o, INK, 0.25);
          return true;
        }
        if (c.y > hem && ax < w + 0.011 * H) { shadeInto(o, lining, bodyK(c, P) * cloth(c)); if (ax > w + 0.011 * H - c.px * 1.2) over(o, INK, 0.5); return true; }
        // buttons down the wearer's right edge
        if (c.y > hem + 0.02 * H && c.x < 0) {
          for (let b = 0; b < 5; b++) {
            const by = yN - 0.03 * H - b * 0.068 * H, bx = -(open(by) + 0.022 * H), r = 0.0065 * H;
            const dd = Math.hypot(c.x - bx, c.y - by);
            if (dd < r + c.px * 0.6) { if (dd > r - c.px * 0.4) over(o, mixc(GOLD, INK, 0.6), 0.9); else { shadeInto(o, GOLD, 1); if (c.x < bx && c.y > by) over(o, [255, 255, 255], 0.35); } return true; }
          }
        }
        // the closed jacket's centre line and buttons are gone now
        if (ax < 0.04 * H && c.y > hem) { shadeInto(o, T.col, bodyK(c, P) * cloth(c, 0.06)); return true; }
      }
      // open collar: a V of skin at the throat
      if (c.part === 'neck' && front(c) && c.y < yN + 0.045 * H && ax < 0.012 * H + (c.y - yN + 0.01 * H) * 0.45) { skinAt(c, o, P, spec.skin, 0.95); return true; }
      return false;
    });
    scar(h);
  },
};

/** Okuyasu's scar: a pale diagonal through his left brow, drawn into the face painter's top layer so every repaint keeps it. */
function scar(h) {
  const F = h.face;
  F.bake();
  const B = F.B, L = F.L, s = F.s, lay = F.lay;
  const a = [L.cx + L.hw * 0.18, L.browY - 9 * s], b = [L.cx + L.hw * 0.62, L.eyeY - 1.5 * s];
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
  for (let j = 0; j < B.h; j++) for (let i = 0; i < B.w; i++) {
    const x = i + 0.5, y = j + 0.5;
    const t = ((x - a[0]) * dx + (y - a[1]) * dy) / (len * len);
    if (t < -0.05 || t > 1.05) continue;
    const dist = Math.abs((x - a[0]) * dy - (y - a[1]) * dx) / len;
    // skip the eye itself (the scar jumps the lid)
    if (Math.abs(y - L.eyeY) < L.eh * 1.3 && Math.abs(Math.abs(x - L.cx) - L.eyeX) < L.ew * 1.2) continue;
    const w = 0.9 * s * (1 - Math.abs(t - 0.5) * 0.7);
    const q = j * B.w + i;
    let col = null, al = 0;
    if (dist < w) { col = [214, 150, 138]; al = 0.9; } else if (dist < w + 0.9) { col = [150, 84, 78]; al = 0.55; }
    // stitch marks across it
    const st = (t * len) / (3.2 * s);
    if (!col && dist < w + 2.2 * s && Math.abs(st - Math.round(st)) < 0.12 && t > 0.1 && t < 0.9) { col = [140, 80, 74]; al = 0.6; }
    if (!col) continue;
    // straight-alpha "over" onto whatever the layer already holds (hairline hair)
    const a0 = lay[q * 4 + 3], oa = al + a0 * (1 - al);
    for (let m = 0; m < 3; m++) lay[q * 4 + m] = (col[m] * al + lay[q * 4 + m] * a0 * (1 - al)) / oa;
    lay[q * 4 + 3] = oa;
  }
  F.paint(h.E);
  h.pix.flush();
  h.tex.needsUpdate = true;
  h.faceExprKey = null;
}

// ------------------------------------------------------------------ voxel props
const _geo = new Map();
const vmesh = (key, build, res = 1) => {
  let g = _geo.get(key);
  if (!g) {
    const v = build();
    g = meshVoxels(v, { voxelSize: 1, origin: 'none' });
    g.translate(-0.5, -0.5, -0.5);
    g.scale(1 / res, 1 / res, 1 / res);
    g.computeBoundingSphere();
    _geo.set(key, g);
  }
  const m = new THREE.Mesh(g, voxelMaterials('normal'));
  m.castShadow = true; m.receiveShadow = true; m.raycast = () => {};
  return m;
};
const vm = (j = 0.02) => { const v = new VoxelModel(); v.jitter = j; return v; };
function rbox(x, y, z, c, a, r) {
  const qx = Math.abs(x - c[0]) - a[0] + r, qy = Math.abs(y - c[1]) - a[1] + r, qz = Math.abs(z - c[2]) - a[2] + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
}

const MODELS = {
  /** Rohan's headband in head units (res 2): a band around the hair with zig-zag (sawtooth) edges. */
  headband() {
    const v = vm(0.015), R = 2, BAND = 0x2f6a58, EDGE = 0xd8b45a, DARK = 0x1d3a30;
    for (let i = -11 * R; i <= 11 * R; i++) for (let j = 9 * R; j <= 17 * R; j++) for (let k = -10 * R; k <= 13 * R; k++) {
      const x = i / R, y = j / R, z = k / R;
      const d = rbox(x, y, z, [0, 6.4, 2.4], [7.6, 10.4, 9.1], 3.7);
      if (d < 0.3 || d > 1.0) continue;
      const a = Math.atan2(x, z - 2.4), u = (a / (Math.PI * 2)) * 26, tri = Math.abs(u - Math.floor(u) - 0.5) * 2;
      const top = 12.3 + tri * 1.1, bot = 10.5 - (1 - tri) * 0.9;
      if (y > top || y < bot) continue;
      const edge = y > top - 0.55 || y < bot + 0.55;
      v.set(i, j, k, edge ? EDGE : Math.abs(y - 11.4) < 0.3 ? DARK : BAND);
    }
    return v;
  },
  /** A G-pen nib earring (res 4, head units): a little hoop and the split nib. */
  nib() {
    const v = vm(0.01), M = metal(0xd9b25c), D = metal(0x6a5426), R = 4;
    for (let y = -14; y <= 0; y++) {
      const w = y > -9 ? 2 : Math.max(0, Math.round((y + 14) * 0.45));
      for (let x = -w; x <= w; x++) v.set(x, y, 0, x === 0 && y < -5 ? D : M);
    }
    v.set(0, -7, 0, D).set(0, -6, 0, D);
    for (const [x, y] of [[-1, 1], [1, 1], [-1, 2], [1, 2], [0, 3], [-1, 0], [1, 0]]) v.set(x, y, 0, M);
    void R;
    return v;
  },
  /** Heart pin (metric, res 1 => scaled by the caller). */
  heart() {
    const v = vm(0.01), C = metal(0xe8c050), D = metal(0x9a7426);
    const rows = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '#') { v.set(x - 3, 5 - y, 0, C); v.set(x - 3, 5 - y, -1, D); } }));
    v.set(-2, 4, 1, gloss(0xfff4c0));
    return v;
  },
  /** Peace sign pin. */
  peace() {
    const v = vm(0.01), C = metal(0xe8c050), D = metal(0x9a7426);
    for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) {
      const r = Math.hypot(x, y);
      const ring = r > 3.2 && r < 4.6;
      const bar = x === 0 && r < 3.6;
      const legs = y < 0 && Math.abs(Math.abs(x) + y) < 0.6 && r < 3.6;
      if (ring || bar || legs) { v.set(x, y, 0, C); v.set(x, y, -1, D); }
    }
    return v;
  },
  /** Dollar / yen glyph pins (Okuyasu). */
  glyph(kind) {
    const v = vm(0.01), C = kind === 'yen' ? metal(0xd8dce4) : metal(0xe8c050), D = kind === 'yen' ? metal(0x7a7e88) : metal(0x9a7426);
    const G = kind === 'yen'
      ? ['#...#', '.#.#.', '..#..', '#####', '..#..', '#####', '..#..']
      : ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'];
    G.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '#') { v.set(x - 2, 6 - y, 0, C); v.set(x - 2, 6 - y, -1, D); } }));
    return v;
  },
};

/** A sketch on the open page (canvas, pixel style): a scratchy face study, hatching, a signature squiggle. */
let _pageTex = null;
function pageTexture() {
  if (_pageTex) return _pageTex;
  const W = 48, Hh = 60, cv = document.createElement('canvas');
  cv.width = W; cv.height = Hh;
  const g = cv.getContext('2d');
  g.fillStyle = '#f2ead8'; g.fillRect(0, 0, W, Hh);
  g.fillStyle = '#d8ccb4'; g.fillRect(0, 0, 2, Hh);
  const dot = (x, y, c = '#2a2428') => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), 1, 1); };
  // a face in three-quarter view
  for (let a = 0; a < Math.PI * 2; a += 0.06) dot(22 + Math.cos(a) * 11, 22 + Math.sin(a) * 14 * (a > 0 && a < Math.PI ? 1.05 : 1));
  for (let x = 14; x < 31; x += 2) dot(x, 18, '#4a4248');
  dot(17, 20); dot(18, 20); dot(26, 20); dot(27, 20); dot(22, 26); dot(23, 27); for (let x = 19; x < 27; x++) dot(x, 31, '#5a4a50');
  for (let i = 0; i < 26; i++) dot(10 + i * 0.4, 8 + i * 0.25, '#3a3036'); // hair strokes
  for (let i = 0; i < 18; i++) dot(31 + (i % 3), 12 + i, '#6a6268');
  for (let y = 40; y < 52; y += 2) for (let x = 6; x < 40; x += 3) if ((x + y) % 5) dot(x + (y % 4 ? 1 : 0), y, '#8a8288');
  g.fillStyle = '#b8323a'; g.fillRect(34, 53, 9, 1); g.fillRect(36, 54, 6, 1);
  _pageTex = new THREE.CanvasTexture(cv);
  _pageTex.colorSpace = THREE.SRGBColorSpace; _pageTex.magFilter = THREE.NearestFilter; _pageTex.minFilter = THREE.NearestFilter; _pageTex.generateMipmaps = false;
  return _pageTex;
}

/** Rohan's sketchbook (hand-local, metres): spiral-bound kraft cover on one side, the open page on the other. */
function sketchbook() {
  const g = new THREE.Group();
  const W = 0.016, Hb = 0.2, D = 0.155;
  const cover = new THREE.MeshStandardMaterial({ color: 0x9a7a52, roughness: 0.9 });
  const page = new THREE.MeshStandardMaterial({ map: pageTexture(), roughness: 0.95 });
  const edge = new THREE.MeshStandardMaterial({ color: 0xece4d0, roughness: 0.95 });
  // box faces: +x, -x, +y, -y, +z, -z
  const book = new THREE.Mesh(new THREE.BoxGeometry(W, Hb, D), [cover, page, edge, edge, edge, edge]); // the page faces the palm
  book.castShadow = true;
  g.add(book);
  const ring = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.4, metalness: 0.6 });
  for (let k = 0; k < 9; k++) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(W * 1.25, 0.006, 0.006), ring);
    r.position.set(0, Hb / 2 - 0.012 - k * 0.022, -D / 2);
    g.add(r);
  }
  g.userData.page = book;
  return g;
}

/** The G-pen (hand-local): a slim dark holder with a gold nib. */
function gpen() {
  const g = new THREE.Group();
  const holder = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.13, 0.009), new THREE.MeshStandardMaterial({ color: 0x3a2a24, roughness: 0.6 }));
  holder.position.y = 0.035;
  const nib = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.022, 0.004), new THREE.MeshStandardMaterial({ color: 0xd9b25c, roughness: 0.3, metalness: 0.9 }));
  nib.position.y = -0.04;
  g.add(holder, nib);
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.raycast = () => {}; } });
  return g;
}

// ------------------------------------------------------------------ dressing
function headGroup(h) {
  const P = h.P, U = P.hu / 20;
  const g = new THREE.Group();
  g.scale.set(U * P.hw / (0.335 * P.hu), U, U * P.hd / (0.42 * P.hu));
  h.b.head.add(g);
  return g;
}
/** A metric pin on a bone at an absolute rest-pose point (x, y, z), facing +z, `vox` metres per voxel. */
function pin(h, bone, key, build, p, vox, rot = [0, 0, 0]) {
  const m = vmesh(key, build);
  const J = h.J[bone];
  m.position.set(p[0] - J[0], p[1] - J[1], p[2] - J[2]);
  m.rotation.set(...rot);
  m.scale.setScalar(vox);
  h.b[bone].add(m);
  return m;
}

const DRESS = {
  rohan(h) {
    const hg = headGroup(h);
    hg.add(vmesh('rohan:headband', MODELS.headband, 2));
    for (const sx of [1, -1]) {
      const e = vmesh('rohan:nib', MODELS.nib, 4);
      e.position.set(sx * 7.5, 1.6, 0.7);
      e.rotation.y = sx * 1.2;
      hg.add(e);
      h.npcProps.earrings = (h.npcProps.earrings || []).concat(e);
    }
    // sketchbook gripped in the left hand, pen in the right
    const book = sketchbook();
    book.position.set(-0.016, -0.08, 0.03);
    h.b.handL.add(book);
    const pen = gpen();
    pen.position.set(-0.004, -0.07, 0.022);
    pen.rotation.set(0.5, 0, 0);
    h.b.handR.add(pen);
    h.npcProps.book = book; h.npcProps.pen = pen;
  },
  josuke(h) {
    const P = h.P, H = P.H, hu = P.hu;
    const y = P.neckBase + 0.02 * H, nz = -0.011 * H + hu * 0.205;
    pin(h, 'neck', 'pin:heart', MODELS.heart, [hu * 0.15, y, nz], 0.005, [0, 0.45, 0]);
    pin(h, 'neck', 'pin:peace', MODELS.peace, [-hu * 0.15, y, nz], 0.0044, [0, -0.45, 0]);
  },
  okuyasu(h) {
    const P = h.P, H = P.H, hu = P.hu;
    const y = P.neckBase + 0.018 * H, nz = -0.011 * H + hu * 0.205;
    pin(h, 'neck', 'pin:dollar', () => MODELS.glyph('dollar'), [hu * 0.15, y, nz], 0.0042, [0, 0.45, 0]);
    pin(h, 'neck', 'pin:yen', () => MODELS.glyph('yen'), [-hu * 0.15, y, nz], 0.0042, [0, -0.45, 0]);
  },
};

/** Build a character: preset look, retouched atlas, props, hand-pose support. */
export function createCharacter(id, { seed = 7, height } = {}) {
  const h = createHuman({ preset: id, seed, height, lazy: false });
  h.npcProps = {};
  PAINT[id]?.(h);
  DRESS[id]?.(h);
  dressHuman(h, {}); // pose.hands / peace fingers for the bizarre poses
  return h;
}
