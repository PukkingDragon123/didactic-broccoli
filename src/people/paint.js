// Atlas painter for everything except the face block. Every texel knows its rest-pose surface point
// (x, y, z), face normal and part, so clothing is described in body space: hems, seams, plackets, buttons,
// collars, pockets, belts, folds and patterns line up across faces. A soft baked occlusion / roundness pass
// gives the boxes volume.
import { clamp01, sstep, mixc, mixT, G, h2, vnoise, shadeInto, over, hairPx, scaleO, q8 } from './paintlib.js';
import { walkTexels, cursor, texelAt } from './mesh.js';
import { makeHairPainters } from './paintHair.js';

const WHITE = [244, 242, 236], INK = [28, 22, 22], GOLD = [214, 170, 70], SILVER = [190, 190, 196];
const C_255_255_255 = [255, 255, 255];
const C_210_120_110 = [210, 120, 110];
const C_70_72_84 = [70, 72, 84];
const C_236_170_160 = [236, 170, 160];
const C_246_214_206 = [246, 214, 206];
const C_150_150_150 = [150, 150, 150];
const C_200_140_70 = [200, 140, 70];
const C_220_150_80 = [220, 150, 80];
const C_255_245_235 = [255, 245, 235];
const C_200_180_140 = [200, 180, 140];
const C_255_248_238 = [255, 248, 238];
const C_255_240_225 = [255, 240, 225];
const C_150_100_70 = [150, 100, 70];
const C_220_120_110 = [220, 120, 110];
const C_255_230_215 = [255, 230, 215];
const C_230_150_140 = [230, 150, 140];
const C_215_115_105 = [215, 115, 105];
const C_252_252_250 = [252, 252, 250];
const C_40_60_120 = [40, 60, 120];
const C_60_90_160 = [60, 90, 160];
const C_120_90_60 = [120, 90, 60];

/**
 * Paint every face of the atlas. A generator: yields after each face (and every ~1200 texels inside a big one) so the
 * work can be time-sliced (see Human); run it to completion with paintAtlas().
 */
export function* paintAtlasJob(spec, P, faces, pix) {
  const ctx = makePainters(spec, P);
  const d = pix.d, W = pix.w, o = new Float32Array(4), c = cursor();
  for (const f of faces) {
    const fn = ctx[f.tube ? f.mat : f.seg.mat] || ctx.body;
    yield* walkTexels(f, c, (c) => {
      o[3] = 255;
      fn(c, o);
      const p = (c.j * W + c.i) * 4;
      d[p] = q8(o[0], c.i, c.j); d[p + 1] = q8(o[1], c.i, c.j); d[p + 2] = q8(o[2], c.i, c.j); d[p + 3] = o[3];
    });
    yield f;
  }
  pix.dirty = true;
}
export function paintAtlas(spec, P, faces, pix) { const it = paintAtlasJob(spec, P, faces, pix); while (!it.next().done); }

/** Instant placeholder: every face filled with the colour its painter gives at the face centre. */
export function paintAtlasFlat(spec, P, faces, pix) {
  const ctx = makePainters(spec, P);
  const d = pix.d, W = pix.w, o = new Float32Array(4), c = cursor();
  for (const f of faces) {
    const fn = ctx[f.tube ? f.mat : f.seg.mat] || ctx.body;
    const R = f.rect;
    o[0] = o[1] = o[2] = 128; o[3] = 255;
    if (texelAt(f, c, R.x + (R.w >> 1), R.y + (R.h >> 1))) fn(c, o);
    for (let j = 0; j < R.h; j++) for (let i = 0; i < R.w; i++) {
      const p = ((R.y + j) * W + R.x + i) * 4;
      d[p] = o[0]; d[p + 1] = o[1]; d[p + 2] = o[2]; d[p + 3] = 255;
    }
  }
  pix.dirty = true;
}

export function makePainters(spec, P) {
  const H = P.H, hu = P.hu, T = spec.top, Bt = spec.bottom, skin = spec.skin, hair = spec.hair;
  const accOf = (k) => spec.acc.find((a) => a.kind === k);
  const tuck = T.tuck || ['suit', 'blazer'].includes(T.kind) ? true : T.tuck;
  const waist = P.pelvisY + 0.004 * H; // trousers waistband top
  const topHem = {
    suit: P.crotchY + 0.03 * H, blazer: P.hipY + 0.015 * H, gakuran: P.hipY + 0.004 * H, sailor: P.pelvisY - 0.008 * H, cardigan: P.hipY,
    knit: P.hipY + 0.012 * H, jacket: P.hipY + 0.01 * H, workjacket: P.hipY + 0.005 * H,
    onesie: P.crotchY - 0.006 * H, happi: P.hipY - 0.012 * H, // costumes (cosmetics.js)
  }[T.kind] ?? (T.tuck ? waist : P.hipY + 0.022 * H);
  const sleeve = T.sleeve || (['tee', 'aloha', 'polo'].includes(T.kind) ? 'short' : 'long');
  const cuffY = sleeve === 'short' ? P.elbowY + (T.kind === 'tee' && T.fitted ? 0.085 : 0.065) * H : sleeve === 'mid' ? P.elbowY - 0.055 * H : P.wristY + 0.008 * H;
  const skirt = Bt.kind === 'skirt';
  const botHem = Bt.kind === 'shorts' ? P.kneeY + (spec.age === 'kid' ? 0.075 : 0.05) * H : skirt ? Infinity : P.ankleY + 0.01 * H;
  const sockTop = spec.legs === 'kneesocks' ? P.kneeY - 0.025 * H : spec.legs === 'loosesocks' ? P.ankleY + 0.11 * H : spec.socks ? P.ankleY + 0.055 * H : 0;
  const bootTop = spec.shoes.kind === 'tabi' ? P.ankleY + 0.08 * H : spec.shoes.kind === 'boots' ? P.ankleY + 0.035 * H : 0;
  const bagStrap = spec.acc.find((a) => a.kind === 'shoulderbag' || a.kind === 'tote');
  const pack = spec.acc.find((a) => a.kind === 'backpack' || a.kind === 'randoseru');
  const cam = accOf('camera'), apron = accOf('apron');
  const LIMB = { uarm: 1, farm: 1, thigh: 1, calf: 1, shin: 1 };
  const TORSO = { spine: 1, chestLo: 1, chestHi: 1, traps: 1, hipsUp: 1, hipsLo: 1 };

  // ---------------------------------------------------------------- shared shading
  /** Baked occlusion + roundness for body surfaces. */
  function bodyK(c) {
    let k = 0.9 + 0.12 * clamp01(c.y / H * 1.25);
    if (c.kind === 'side') k *= 1 - 0.07 * c.e * c.e;
    else if (c.kind === 'bot') k *= 0.7;
    const ax = Math.abs(c.x), sx = Math.sign(c.x) || 1;
    if (LIMB[c.part]) {
      const inward = -sx * c.nx;
      if (inward > 0.3) k *= 1 - 0.13 * inward;
      if (c.part === 'thigh' && inward > 0.2) k *= 1 - 0.18 * sstep(P.crotchY - 0.08 * H, P.crotchY, c.y);
      if (c.part === 'uarm' && inward > 0.2) k *= 1 - 0.12 * sstep(P.bustY, P.shoulderY, c.y);
    } else if (TORSO[c.part]) {
      if (Math.abs(c.nx) > 0.55) k *= 1 - 0.1 - 0.12 * sstep(P.bustY - 0.04 * H, P.shoulderY, c.y);
      if (c.part === 'hipsLo' && c.y < P.crotchY + 0.03 * H && ax < P.hipX * 0.8) k *= 0.8;
      if (c.part === 'traps' && c.kind === 'top') k *= 1.04;
    }
    // large soft variation so flat panels don't look printed
    k *= 1 + 0.03 * Math.sin(c.x * 37 + c.z * 23 + Math.sin(c.y * 13) * 2) * Math.sin(c.y * 29 + c.x * 11);
    return k;
  }
  const front = (c) => c.nz > 0.45, back = (c) => c.nz < -0.45;
  /** Folds: soft dark creases that wander a little. */
  function fold(c, amp, freq, phase, along) {
    const v = Math.sin(along * freq + phase + Math.sin(along * 37 + phase * 3) * 1.3);
    return 1 - amp * Math.max(0, v) ** 3;
  }
  /**
   * Cloth at texel scale (multiplier): the weave of each fabric (atlas texels: u runs round a limb / body, v along it),
   * 2-4 px clusters on top so nothing reads as a flat fill. Dark cloth gets proportionally more (pixel ramps are
   * closer together in the darks).
   */
  function fabricK(c, kind) {
    const i = c.i, j = c.j;
    const n = h2(i, j, 11) - 0.5;
    const cl = vnoise(i * 0.42, j * 0.42, 12) - 0.5;
    switch (kind) {
      case 'knit': { // stockinette: columns of little Vs, a soft row rhythm
        const col = i % 3, row = (j + (col === 1 ? 1 : 0)) & 1;
        return (col === 2 ? 0.87 : 1.035) * (row ? 1.03 : 0.975) * (1 + cl * 0.1 + n * 0.03);
      }
      case 'wool': { // suiting twill + heather flecks
        const tw = ((i + j) % 4) < 2 ? 1.035 : 0.965, fl = h2(i, j, 13);
        return tw * (1 + cl * 0.09) * (fl > 0.95 ? 1.12 : fl < 0.04 ? 0.88 : 1);
      }
      case 'denim': { // 3/1 twill (diagonal), vertical slubs, the odd white weft fleck
        const tw = ((i + j) % 3) === 0 ? 1.1 : 0.965;
        const slub = vnoise(i * 0.9, j * 0.07, 14) - 0.5;
        return tw * (1 + slub * 0.2 + n * 0.05) * (h2(i, j, 16) > 0.97 ? 1.18 : 1);
      }
      case 'nylon': return 1 + cl * 0.06 + n * 0.02;
      case 'leather': return 1 + cl * 0.12 + n * 0.04;
      default: { // cotton: plain weave + horizontal slubs
        const pw = ((i + j) & 1) ? 1.02 : 0.98;
        const slub = vnoise(i * 0.1, j * 0.85, 15) - 0.5;
        return pw * (1 + slub * 0.09 + cl * 0.07);
      }
    }
  }
  /**
   * A field of creases (strokes, not sine bands): streaks run along `a` (low frequency fa, metres) and repeat across `b`
   * (high frequency fb); returns a multiplier with a dark trough and a lit ridge beside it.
   */
  function crease(a, b, fa, fb, amp, seed) {
    if (amp <= 0.004) return 1;
    const t = vnoise(a * fa + (vnoise(b * fb * 0.12, a * fa * 0.6, seed + 1) - 0.5) * 2.2, b * fb, seed);
    return 1 - amp * sstep(0.6, 0.8, t) + amp * 0.55 * G(t - 0.4, 0, 0.07, 1);
  }
  // tartan for flannel / school skirts
  function plaid(u, v, a, b, sc = 1) {
    const f = (t, w) => { const q = ((t % w) + w) % w; return q < w * 0.32 ? 1 : q < w * 0.4 ? 0.5 : 0; };
    const A = f(u / sc, 0.06), B = f(v / sc, 0.06), C = f(u / sc + 0.03, 0.06) * 0.5, D = f(v / sc + 0.03, 0.06) * 0.5;
    const t = (A + B) / 2, thin = Math.max(C, D) > 0.4 && ((Math.round(u / 0.004) + Math.round(v / 0.004)) % 2 === 0) ? 1 : 0;
    const col = mixT(a, b, t * 0.75);
    return thin ? mixT(col, [230, 220, 200], 0.25) : col;
  }
  // world-ish horizontal coordinate around the torso / limbs (continuous across front/back/sides)
  const around = (c) => (Math.abs(c.nz) > 0.6 ? c.x * Math.sign(c.nz) : c.z * -Math.sign(c.nx || 1) + 0.3);
  function button(c, o, bx, by, r, col) {
    const dx = c.x - bx, dy = c.y - by, d = Math.sqrt(dx * dx + dy * dy);
    if (d > r + c.px * 0.6) return false;
    if (d > r - c.px * 0.4) over(o, mixT(col, INK, 0.6), 0.9);
    else { o[0] = col[0]; o[1] = col[1]; o[2] = col[2]; if (dx < 0 && dy > 0) over(o, C_255_255_255, 0.35); }
    return true;
  }

  // ---------------------------------------------------------------- skin
  function skinPx(c, o, k = 1) {
    let kk = k * bodyK(c);
    // skin is never one flat tone: warm / cool clusters and a fine grain (2-4 px), not single-pixel noise
    const m = vnoise(c.i * 0.2, c.j * 0.2, 21) - 0.5, m2 = vnoise(c.i * 0.55, c.j * 0.55, 22) - 0.5;
    kk *= 1 + m * 0.07 + m2 * 0.035;
    shadeInto(o, skin, kk, 0.25);
    over(o, C_210_120_110, 0.04 + 0.08 * clamp01(m * 2.5)); // warm blotches
    // knees / elbows
    if (c.part === 'thigh' || c.part === 'calf') {
      const dk = c.y - P.kneeY;
      if (front(c)) { kk = 1 + 0.07 * G(dk - 0.015 * H, 0, 0.012 * H, 1) - 0.08 * G(dk + 0.012 * H, 0, 0.006 * H, 1); o[0] *= kk; o[1] *= kk; o[2] *= kk; over(o, C_210_120_110, 0.12 * G(dk, 0, 0.018 * H, 1)); }
      if (back(c) && Math.abs(dk) < 0.012 * H) { o[0] *= 0.88; o[1] *= 0.86; o[2] *= 0.86; }
    }
    if ((c.part === 'farm' || c.part === 'uarm') && back(c) && Math.abs(c.y - P.elbowY) < 0.012 * H) { o[0] *= 0.92; o[1] *= 0.88; o[2] *= 0.88; over(o, C_210_120_110, 0.1); }
    // elders: a few age spots and the odd vein on forearms / backs of hands
    if (spec.age === 'elder') {
      if (h2(c.i >> 1, c.j >> 1, 95) > 0.985) over(o, C_150_100_70, 0.3);
      if ((c.part === 'farm' || c.part === 'palm') && c.nx * (Math.sign(c.x) || 1) > 0.3) { const v = vnoise(c.y * 90, c.z * 300, 96); if (Math.abs(v - 0.5) < 0.03) over(o, [110, 120, 150], 0.22); }
    }
  }

  function neckPx(c, o) {
    skinPx(c, o);
    // shadow under the jaw
    const t = sstep(P.chin - 0.02 * hu, P.chin + 0.12 * hu, c.y);
    o[0] *= 1 - 0.32 * t; o[1] *= 1 - 0.36 * t; o[2] *= 1 - 0.34 * t;
    if (spec.sex === 'm' && spec.age !== 'kid' && front(c) && Math.abs(c.x) < 0.01 && Math.abs(c.y - (P.chin - 0.06 * hu)) < 0.012) { o[0] *= 1.05; o[1] *= 1.05; o[2] *= 1.05; }
    if (spec.face.stubble && c.y > P.chin - 0.1 * hu && front(c)) over(o, C_70_72_84, spec.face.stubble * 0.25 * h2(c.i, c.j, 77));
    collarPx(c, o);
  }

  /** Collars that wrap the neck (dress shirts, polos, gakuran, crew necks, turtle...). */
  function collarPx(c, o) { // returns true when it painted collar cloth
    const k = T.kind, base = P.neckBase;
    let col = null, top = base, tie = false;
    if (k === 'suit' || (k === 'shirt' && !T.open) || k === 'flannel' || k === 'workjacket') { col = k === 'suit' ? T.shirt : k === 'flannel' ? plaid(around(c), c.y, T.col, T.col2) : T.col; top = base + 0.03 * H; tie = k === 'suit'; }
    else if (k === 'gakuran') { col = T.col; top = base + 0.04 * H; }
    else if (k === 'polo' || k === 'jacket' || k === 'blazer' || k === 'cardigan' || k === 'blouse') {
      col = k === 'polo' ? T.col : k === 'jacket' ? T.col : T.shirt || T.col; top = base + 0.022 * H;
      if ((k === 'blazer' || k === 'cardigan' || k === 'blouse') && front(c)) top = base + 0.008 * H;
    } else if (k === 'knit' || k === 'tee' || k === 'sailor' || k === 'onesie') { col = k === 'sailor' ? (T.col[0] > 128 ? T.col : T.col) : T.col; top = base + 0.006 * H; }
    if (!col || c.y > top) return false;
    // open V at the throat for collared shirts without a tie
    if (!tie && k !== 'gakuran' && front(c) && Math.abs(c.x) < (c.y - base) * 0.9 + 0.004 && k !== 'knit' && k !== 'tee') return false;
    const kk = bodyK(c) * fabricK(c, k === 'knit' || k === 'cardigan' ? 'knit' : 'cotton') * (k === 'gakuran' ? 1 : 1.02);
    shadeInto(o, col, kk);
    if (Math.abs(c.y - top) < c.px * 1.2) over(o, INK, 0.35);
    if (k === 'gakuran' && c.y > top - c.px * 1.6) over(o, WHITE, 0.9); // white inner collar
    if (k === 'gakuran' && front(c) && Math.abs(c.x) < c.px * 0.6) over(o, INK, 0.6);
    if (tie && front(c)) {
      const kw = 0.012 * H - (top - c.y) * 0.1;
      if (Math.abs(c.x) < kw) { shadeInto(o, T.tie, 0.95 * fabricK(c, 'cotton')); if (Math.abs(Math.abs(c.x) - kw) < c.px) over(o, INK, 0.4); }
      else if (Math.abs(c.x) < kw + 0.018 * H) { if (Math.abs(c.y - (top - (Math.abs(c.x) - kw) * 1.2)) < c.px * 0.7) over(o, INK, 0.3); }
    }
    return true;
  }

  const handK = H * (P.f ? 0.92 : 1), handZ = 0.004 * H;
  /** Hands: pink palms with their creases, knuckles and tendons on the back, finger joints, nails with a moon and a free edge. */
  function handPx(c, o) {
    skinPx(c, o, 0.96);
    const sx = Math.sign(c.x) || 1;
    const palm = -sx * c.nx, bk = -palm; // palm faces the thigh (left hand: -x)
    if (palm > 0.25) over(o, C_236_170_160, 0.2 * palm);
    if (!c.tube) return;
    const line = (d, w = 1) => Math.abs(d) < c.px * 0.55 * w;
    if (c.part === 'palm') {
      const t = clamp01((P.wristY - c.y) / (0.05 * handK)), zz = (c.z - handZ) / (0.024 * handK); // t: wrist 0 .. knuckles 1; zz: thumb side +
      if (palm > 0.45) {
        if (line(t - (0.8 - 0.06 * zz - 0.04 * zz * zz) , 1.2) && zz < 0.55) { o[0] *= 0.8; o[1] *= 0.72; o[2] *= 0.72; } // heart line
        if (line(t - (0.6 + 0.12 * zz), 1.1) && zz > -0.6 && zz < 0.8) { o[0] *= 0.82; o[1] *= 0.74; o[2] *= 0.74; } // head line
        if (line(Math.hypot((zz - 0.85) * 0.9, (t - 0.25) * 1.2) - 0.55, 1.1) && t < 0.62) { o[0] *= 0.82; o[1] *= 0.74; o[2] *= 0.74; } // life line round the thumb
        if (t < 0.06) { o[0] *= 0.9; o[1] *= 0.86; o[2] *= 0.86; } // wrist crease
        over(o, C_255_230_215, 0.12 * G(zz - 0.7, t - 0.35, 0.3, 0.25)); // the ball of the thumb
      } else if (bk > 0.35) {
        // knuckles: a bump per finger at the knuckle line, creases between; tendons fanning to the wrist
        const fz = [0.0168, 0.0056, -0.0058, -0.0168].map((z) => handZ + z * handK);
        let nearK = 9; for (const z of fz) nearK = Math.min(nearK, Math.abs(c.z - z));
        if (t > 0.82) { const b = G(nearK, 0, 0.004 * handK, 1); o[0] *= 0.92 + 0.14 * b; o[1] *= 0.9 + 0.14 * b; o[2] *= 0.9 + 0.13 * b; over(o, C_210_120_110, 0.12 * b); }
        else if (t > 0.25) { const tz = fz.map((z) => lerpK(z, handZ, 1 - t)); let nt = 9; for (const z of tz) nt = Math.min(nt, Math.abs(c.z - z)); if (nt < 0.0016 * handK) { o[0] *= 1.04; o[1] *= 1.04; o[2] *= 1.03; } }
      }
    }
    if (c.part === 'fingers' || c.part === 'thumb') {
      const L = c.lt, th = c.part === 'thumb';
      const joints = th ? [0.34, 0.68] : [0.45, 0.75];
      for (const jt of joints) {
        const d = (L - jt) * c.rh;
        if (palm > 0.3 && Math.abs(d) < c.px * 0.6) { o[0] *= 0.76; o[1] *= 0.68; o[2] *= 0.68; } // the crease on the inside
        else if (bk > 0.3 && Math.abs(d) < c.px * 1.6) { const w = Math.abs(d) < c.px * 0.6 ? 0.86 : 1.05; o[0] *= w; o[1] *= w * 0.98; o[2] *= w * 0.98; } // knuckle wrinkles
      }
      // fingers meet their neighbours: a little occlusion on the facing sides
      if (!th && Math.abs(c.nz) > 0.7) { o[0] *= 0.88; o[1] *= 0.85; o[2] *= 0.85; }
      if (L > 0.86) over(o, C_220_120_110, 0.12); // warm fingertips
      // the nail
      const nailL = th ? 0.7 : 0.77;
      if (bk > 0.28 && L > nailL) {
        const edge = Math.min((L - nailL) * c.rh, (bk - 0.28) * 0.02);
        over(o, mixT(skin, [252, 232, 222], 0.55), 0.85);
        if (L > 0.95) over(o, C_255_248_238, 0.5); // free edge
        else if (L < nailL + 0.05) over(o, C_255_245_235, 0.3); // lunula
        if (edge < c.px * 0.8) over(o, [150, 90, 80], 0.45);
      }
    }
  }
  function lerpK(a, b, t) { return a + (b - a) * t; }

  // ---------------------------------------------------------------- tops
  function topPx(c, o) {
    const k = T.kind, ax = Math.abs(c.x), fr = front(c), bk = back(c);
    const arm = c.part === 'uarm' || c.part === 'farm';
    let fab = k === 'knit' || k === 'cardigan' ? 'knit' : k === 'suit' || k === 'blazer' || k === 'gakuran' ? 'wool' : k === 'workjacket' || k === 'jacket' ? 'nylon' : 'cotton';
    let col = T.col;
    if (k === 'flannel') col = plaid(arm ? c.y * 0.6 + around(c) * 0.3 : around(c), c.y, T.col, T.col2);
    else if (k === 'aloha') col = aloha(c);
    else if (k === 'tee' && (T.print === 'border' || T.print === 'stripes') && !arm) col = (Math.floor(c.y / (T.print === 'border' ? 0.022 : 0.04) / (H / 1.7))) % 2 ? T.col2 : T.col;
    else if (T.pattern === 'floral' && false) col = T.col;
    let kk = bodyK(c) * fabricK(c, fab);
    // folds: elbow crease, waist bunching, armpit drape
    const stiff = k === 'suit' || k === 'blazer' || k === 'gakuran' ? 0.6 : k === 'knit' || k === 'cardigan' ? 0.75 : 1;
    if (arm) {
      const ar = around(c), inner = clamp01(-Math.sign(c.x || 1) * c.nx * 0.5 + c.nz * 0.7);
      kk *= crease(ar, c.y + ar * 0.35, 22, 150, 0.24 * stiff * G(c.y - P.elbowY, 0, 0.04 * H, 1) * (0.45 + 0.55 * inner), 31); // elbow
      kk *= crease(c.y, ar, 5, 55, 0.08 * stiff, 32); // the sleeve's long drape
      if (sleeve === 'long') kk *= crease(ar, c.y, 30, 230, 0.15 * stiff * sstep(P.wristY + 0.07 * H, P.wristY + 0.015 * H, c.y), 33); // bunching at the cuff
      kk *= crease(c.y - ar * 0.8, ar + c.y * 0.6, 14, 110, 0.12 * stiff * G(c.y - P.shoulderY + 0.05 * H, 0, 0.035 * H, 1) * inner, 34); // armpit
    } else {
      const ar = around(c), sideW = clamp01((Math.abs(c.nx) - 0.35) / 0.4);
      if (tuck) kk *= crease(c.y, ar, 45, 130, 0.2 * stiff * sstep(waist + 0.06 * H, waist + 0.01 * H, c.y) * (c.y > waist - 0.01 * H ? 1 : 0), 35); // bunching at the waistband
      kk *= crease(c.y * 0.7 + ar * 0.7, c.y - ar * 0.9, 9, 85, 0.13 * stiff * sideW * sstep(P.waistY - 0.04 * H, P.bustY, c.y), 36); // drape from the armpits
      kk *= crease(c.y, ar, 5, 48, (bk ? 0.08 : 0.05) * stiff, 37); // soft hang of the cloth
      if (!tuck && c.y < topHem + 0.05 * H) kk *= crease(c.y, ar, 30, 90, 0.1 * stiff * sstep(topHem + 0.05 * H, topHem, c.y), 38); // the loose hem
    }
    shadeInto(o, col, kk);
    // hem shadow (top overhangs the trousers) + hem line
    if (!arm && Math.abs(c.y - topHem) < c.px * 1.5 && k !== 'sailor' && k !== 'onesie') over(o, INK, 0.25);
    if (k === 'onesie' && T.spots && vnoise(around(c) * (T.spotF || 34) + (arm ? 7 : 0), c.y * (T.spotF || 34), 5) > (T.spotT || 0.72)) shadeInto(o, T.spots, kk * (T.spotK || 1));
    if (k === 'happi' && arm && c.y - cuffY < 0.02 * H) { shadeInto(o, T.col3, kk); if (Math.abs(c.y - cuffY - 0.02 * H) < c.px * 0.7) over(o, INK, 0.3); }
    if (arm && sleeve === 'short' && c.y - cuffY < 0.012 * H) { if (k === 'polo' || k === 'tee') { scaleO(o, c.i % 2 ? 0.92 : 1.02); } if (Math.abs(c.y - cuffY - 0.012 * H) < c.px * 0.6) over(o, INK, 0.25); }
    if (arm && sleeve === 'long' && c.y - cuffY < 0.025 * H && ['cardigan', 'knit', 'workjacket', 'jacket', 'flannel', 'sailor', 'gakuran'].includes(k)) {
      if (k === 'sailor') { shadeInto(o, T.collar, kk); const q = (c.y - cuffY) / (0.025 * H); if (Math.abs(q - 0.45) < 0.12 || Math.abs(q - 0.75) < 0.12) shadeInto(o, T.stripe, kk); }
      else if (k === 'cardigan' || k === 'knit') shadeInto(o, col, kk * (c.i % 2 ? 0.88 : 1));
      if (Math.abs(c.y - cuffY - 0.025 * H) < c.px * 0.6) over(o, INK, 0.3);
      if (k === 'gakuran' && !fr && !bk && Math.abs(c.y - cuffY - 0.012 * H) < 0.004 && Math.abs(c.e) < 0.4) over(o, GOLD, 0.95);
    }
    if (arm) {
      // shoulder seam + sleeve seam
      if (c.y > P.shoulderY - 0.006 * H && c.part === 'uarm' && Math.abs(c.y - (P.shoulderY - 0.004 * H)) < c.px * 0.6) over(o, INK, 0.2);
      if (k === 'suit' || k === 'blazer') { if (sleeve === 'long' && c.y < cuffY + 0.004 * H) shadeInto(o, T.shirt, bodyK(c)); if (Math.abs(c.y - cuffY - 0.004 * H) < c.px * 0.6) over(o, INK, 0.4); }
      return;
    }
    // side seams
    if (Math.abs(c.nx) > 0.9 && Math.abs(c.e) < 0.08) over(o, INK, 0.16);
    if (bk && ax < c.px * 0.5 && (k === 'suit' || k === 'blazer' || k === 'gakuran')) over(o, INK, 0.25);
    // ---- per garment fronts
    const yN = P.neckBase, yB = P.bustY;
    if (k === 'suit' || k === 'blazer' || k === 'cardigan' || (k === 'polo' && T.vest)) {
      const vb = k === 'suit' ? yB - 0.055 * H : k === 'blazer' ? yB - 0.07 * H : yB - 0.03 * H;
      const vw = k === 'cardigan' ? 0.04 * H : 0.045 * H;
      const vx = c.y > vb ? (c.y - vb) / (yN - vb) * vw + 0.004 : -1;
      if (fr && ax < vx) { innerPx(c, o, k === 'polo' ? { kind: 'polo', col: T.col } : { kind: k === 'suit' ? 'shirt' : 'blouse', col: T.shirt || WHITE, tie: k === 'suit' ? T.tie : null }); return; }
      if (k === 'polo') { shadeInto(o, T.vest, bodyK(c) * fabricK(c, 'knit')); if (Math.abs(c.y - topHem - 0.02 * H) < 0.02 * H) shadeInto(o, T.vest, bodyK(c) * (c.i % 2 ? 0.88 : 1)); }
      if (fr && ax < vx + c.px * 1.2) over(o, INK, 0.55);
      // lapels (suits)
      if ((k === 'suit' || k === 'blazer') && fr && c.y > vb && ax < vx + 0.03 * H) {
        const lx = ax - vx;
        if (Math.abs(lx - (0.028 * H - (c.y - vb) * 0.12)) < c.px * 0.7 && c.y < yN - 0.02 * H) over(o, INK, 0.35);
        else if (lx < 0.026 * H) scaleO(o, 1.06);
        if (Math.abs(c.y - (yN - 0.035 * H)) < c.px * 0.6 && lx < 0.03 * H) over(o, INK, 0.3); // gorge
      }
      if (fr && c.y <= vb + 0.002) {
        if (Math.abs(c.x - 0.004 * H) < c.px * 0.6) over(o, INK, 0.5);
        const bs = k === 'cardigan' ? [vb - 0.01 * H, vb - 0.055 * H, vb - 0.1 * H, vb - 0.145 * H] : k === 'polo' ? [] : [vb - 0.012 * H, vb - 0.075 * H];
        for (const by of bs) if (by > topHem + 0.01 * H && button(c, o, 0.0045 * H, by, 0.0055 * H * (k === 'cardigan' ? 0.8 : 1), mixT(T.col, INK, 0.5))) break;
      }
      if (k === 'suit' || k === 'blazer') {
        // hip pocket flaps + breast pocket
        const py = P.pelvisY - 0.025 * H;
        if (fr && ax > 0.022 * H && ax < 0.075 * H && c.y < py && c.y > py - 0.018 * H) { scaleO(o, 1.05); if (Math.abs(c.y - py) < c.px * 0.7 || Math.abs(c.y - (py - 0.018 * H)) < c.px * 0.6) over(o, INK, 0.35); }
        if (k === 'suit' && fr && c.x > 0.03 * H && c.x < 0.07 * H && Math.abs(c.y - (yB + 0.02 * H)) < c.px * 0.6) over(o, INK, 0.35);
      }
      if (k === 'cardigan' && fr && ax > 0.02 * H && ax < 0.065 * H && c.y < P.hipY + 0.06 * H && c.y > topHem + 0.025 * H) { if (Math.abs(c.y - (P.hipY + 0.06 * H)) < c.px * 0.7) over(o, INK, 0.35); }
      if (k === 'cardigan' && c.y < topHem + 0.025 * H) shadeInto(o, col, bodyK(c) * (c.i % 2 ? 0.86 : 1));
      return;
    }
    if (k === 'gakuran') {
      if (fr && ax < c.px * 0.6) over(o, INK, 0.7);
      if (fr) for (let b = 0; b < 5; b++) if (button(c, o, 0, yN - 0.03 * H - b * 0.068 * H, 0.0065 * H, GOLD)) break;
      if (fr && ax > 0.03 * H && ax < 0.07 * H && Math.abs(c.y - (P.pelvisY - 0.02 * H)) < c.px * 0.6) over(o, INK, 0.5);
      return;
    }
    if (k === 'sailor') {
      const vb = yB - 0.005 * H, vw = 0.06 * H, band = 0.026 * H;
      const vx = (c.y - vb) / (yN - vb) * vw;
      if (fr && c.y > vb - band * 0.5) {
        const dEdge = ax - vx;
        if (dEdge < 0 && c.y < yN - 0.02 * H) { // modesty panel
          shadeInto(o, T.col[0] > 128 ? T.col : T.collar, bodyK(c) * fabricK(c, 'cotton'));
          if (c.y > yN - 0.035 * H) { if (Math.abs(c.y - (yN - 0.035 * H)) < c.px) over(o, INK, 0.3); }
          return;
        }
        if (dEdge < band) { const q = dEdge / band; shadeInto(o, T.collar, bodyK(c) * fabricK(c, 'wool')); if (Math.abs(q - 0.7) < 0.09 || Math.abs(q - 0.88) < 0.08) shadeInto(o, T.stripe, bodyK(c)); if (dEdge < c.px) over(o, INK, 0.4); }
      }
      // back flap
      if (bk && ax < 0.088 * H && c.y > yB - 0.035 * H) {
        const dB = c.y - (yB - 0.035 * H), dS = 0.088 * H - ax;
        shadeInto(o, T.collar, bodyK(c) * fabricK(c, 'wool'));
        const m = Math.min(dB, dS);
        if (Math.abs(m - 0.008 * H) < c.px * 0.8 || Math.abs(m - 0.014 * H) < c.px * 0.8) shadeInto(o, T.stripe, bodyK(c));
        if (m < c.px) over(o, INK, 0.4);
      }
      // scarf knot + tails
      if (fr) {
        const ky = vb + 0.006 * H;
        if (ax < 0.022 * H && Math.abs(c.y - ky) < 0.012 * H) { shadeInto(o, T.scarf, 0.95 * (1 - ax / (0.05 * H))); if (Math.abs(Math.abs(c.y - ky) - 0.012 * H) < c.px) over(o, INK, 0.4); }
        const tl = c.y < ky && c.y > ky - 0.07 * H ? 0.012 * H + (ky - c.y) * 0.18 : -1;
        if (tl > 0 && Math.abs(ax - (0.006 * H + (ky - c.y) * 0.12)) < tl * 0.5) { shadeInto(o, T.scarf, 0.9); if (c.y < ky - 0.066 * H) over(o, INK, 0.3); }
      }
      return;
    }
    if (k === 'shirt' || k === 'blouse' || k === 'flannel' || k === 'aloha' || k === 'polo' || k === 'workjacket' || k === 'jacket') {
      const placketTo = k === 'polo' ? yB + 0.05 * H : topHem;
      if (fr && ax < 0.008 * H && c.y > placketTo) {
        if (Math.abs(ax - 0.008 * H) < c.px * 0.8) over(o, INK, 0.3);
        if (k === 'workjacket' || k === 'jacket') { if (ax < c.px * 0.7) over(o, C_150_150_150, 0.8); }
        else for (let b = 0; b < 8; b++) { const by = yN - 0.03 * H - b * (k === 'polo' ? 0.028 : 0.062) * H; if (by < placketTo) break; if (button(c, o, 0, by, 0.0042 * H, k === 'aloha' ? [240, 236, 220] : mixT(T.col, WHITE, 0.6))) break; }
      }
      if ((k === 'shirt' && spec.sex === 'm') || k === 'flannel' || k === 'workjacket') {
        const xs = k === 'shirt' ? [1] : [1, -1];
        for (const sx of xs) {
          const px0 = sx * 0.05 * H, py0 = yB + 0.035 * H;
          if (fr && Math.abs(c.x - px0) < 0.022 * H && c.y < py0 && c.y > py0 - 0.05 * H) {
            if (Math.abs(Math.abs(c.x - px0) - 0.022 * H) < c.px || Math.abs(c.y - (py0 - 0.05 * H)) < c.px) over(o, INK, 0.3);
            if (k !== 'shirt' && c.y > py0 - 0.012 * H) { scaleO(o, 1.04); if (Math.abs(c.y - (py0 - 0.012 * H)) < c.px) over(o, INK, 0.35); }
          }
        }
      }
      if (T.band && c.y > yB + 0.012 * H && c.y < yB + 0.035 * H) { shadeInto(o, T.band, bodyK(c)); }
      if (T.uniform && fr && c.x > 0.03 * H && c.x < 0.065 * H && c.y > yB + 0.045 * H && c.y < yB + 0.065 * H) shadeInto(o, WHITE, bodyK(c));
      if ((k === 'aloha' || k === 'jacket' || k === 'workjacket') && fr && ax < 0.02 * H + (c.y - (yN - 0.06 * H)) * 0.6 && c.y > yN - 0.06 * H) { innerPx(c, o, { kind: 'skin' }); return; }
      if ((k === 'workjacket' || k === 'jacket') && fr && Math.abs(c.y - (P.hipY + 0.06 * H)) < c.px * 0.7 && ax > 0.03 * H && ax < 0.07 * H) over(o, INK, 0.4);
      if (k === 'blouse' && T.cardigan) { /* open cardigan over the blouse */
        if (ax > 0.045 * H) { shadeInto(o, T.cardigan, bodyK(c) * fabricK(c, 'knit')); if (Math.abs(ax - 0.045 * H) < c.px) over(o, INK, 0.4); }
      }
      return;
    }
    if (k === 'onesie') {
      // animal suit: a soft belly panel (with plate stripes) and a zip up the front
      if (T.col2 && fr) {
        const by = (P.bustY + P.crotchY) / 2, bh = (P.bustY - P.crotchY) / 2 + 0.01 * H, bw = P.waistX * 0.8;
        const q = (c.x / bw) ** 2 + ((c.y - by) / bh) ** 2;
        if (q < 1) { shadeInto(o, T.col2, bodyK(c) * fabricK(c, 'knit') * (Math.floor((c.y - by) / (0.024 * H)) % 2 ? 0.93 : 1)); if (q > 0.88) over(o, INK, 0.2); }
      }
      if (fr && ax < c.px * 0.7 && c.y > P.hipY && c.y < yN) over(o, [120, 120, 126], 0.45);
      return;
    }
    if (k === 'happi') {
      // open front over a white undershirt, a contrasting collar band (eri) down both edges, a sash and a hem border
      const ex = 0.014 * H + (yN - c.y) * 0.16, bw = 0.022 * H;
      if (fr && ax < ex && c.y < yN - 0.004 * H) { innerPx(c, o, { kind: 'tee', col: [246, 244, 238] }); return; }
      const band = (fr && ax < ex + bw) || (!fr && c.y > yN - 0.03 * H && (c.part === 'traps' || c.part === 'chestHi'));
      if (band) {
        shadeInto(o, T.col2, bodyK(c) * fabricK(c, 'cotton'));
        if (fr && Math.abs(((c.y / (0.03 * H)) % 1) - 0.5) < 0.12 && Math.abs(ax - ex - bw / 2) < bw * 0.28) over(o, T.col3, 0.9);
        if (fr && Math.abs(ax - ex - bw) < c.px) over(o, INK, 0.35);
      } else {
        // a little white cross pattern + the hem border
        const u = around(c) / (0.034 * H), v = c.y / (0.034 * H), du = u - Math.round(u), dv = v - Math.round(v);
        if ((Math.abs(du) < 0.06 && Math.abs(dv) < 0.2) || (Math.abs(dv) < 0.06 && Math.abs(du) < 0.2)) over(o, T.col3, 0.75);
        if (c.y < topHem + 0.024 * H) { shadeInto(o, T.col3, bodyK(c)); const w = Math.sin(around(c) * 180) * 0.004 * H; if (Math.abs(c.y - topHem - 0.012 * H - w) < c.px * 0.8) over(o, T.col2, 0.9); }
      }
      // the sash
      const sy = P.pelvisY + 0.012 * H;
      if (Math.abs(c.y - sy) < 0.014 * H) { shadeInto(o, T.col2, bodyK(c) * (Math.abs(c.y - sy) < 0.004 * H ? 1.08 : 1)); if (Math.abs(Math.abs(c.y - sy) - 0.014 * H) < c.px) over(o, INK, 0.3); }
      return;
    }
    if (k === 'tee' || k === 'knit') {
      // crew neck rib
      if (c.y > yN - 0.012 * H && (c.part === 'traps' || c.part === 'chestHi')) shadeInto(o, col, bodyK(c) * (c.i % 2 ? 0.88 : 1));
      if (k === 'knit' && c.y < topHem + 0.025 * H) shadeInto(o, col, bodyK(c) * (c.i % 2 ? 0.86 : 1));
      if ((k === 'tee' || (k === 'knit' && T.print === 'pix')) && fr && T.print && T.print !== 'none' && T.print !== 'border' && T.print !== 'stripes') {
        const cy = yB + (0.01 + (T.pixY || 0)) * H, dx = c.x, dy = c.y - cy, r = 0.04 * H;
        let m = false;
        if (T.print === 'circle') m = Math.hypot(dx, dy) < r && Math.hypot(dx, dy) > r * 0.55;
        else if (T.print === 'star') { const a = Math.atan2(dy, dx), rr = r * (0.55 + 0.45 * Math.abs(Math.cos(a * 2.5))); m = Math.hypot(dx, dy) < rr; }
        else if (T.print === 'heart') { const X = dx / r, Y = dy / r + 0.2; m = (X * X + Y * Y - 0.5) ** 3 - X * X * Y * Y * Y < 0; }
        else if (T.print === 'pix' && T.pix) {
          // a pixel picture (thrift tees: { w, h, data: [r, g, b, ...] }) in a square on the chest
          // (pixS scales it up for big prints; a portrait picture keeps its aspect)
          const s = r * 1.25 * (T.pixS || 1), sy = s * T.pix.h / T.pix.w, u = (dx + s) / (2 * s), w = 1 - (dy + sy) / (2 * sy);
          if (u >= 0 && u < 1 && w >= 0 && w < 1) { const i = (Math.floor(w * T.pix.h) * T.pix.w + Math.floor(u * T.pix.w)) * 3; shadeInto(o, [T.pix.data[i], T.pix.data[i + 1], T.pix.data[i + 2]], bodyK(c) * 0.98); }
        }
        if (m) shadeInto(o, T.col2, bodyK(c) * 0.98);
      }
    }
  }

  function aloha(c) {
    const u = around(c) * 22, v = c.y * 22;
    const ci = Math.floor(u), cj = Math.floor(v);
    let best = 9, col = T.col;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const fx = ci + a + h2(ci + a, cj + b, 1), fy = cj + b + h2(ci + a, cj + b, 2);
      const dx = u - fx, dy = v - fy, d = Math.hypot(dx, dy);
      const ang = Math.atan2(dy, dx), petal = 0.32 + 0.12 * Math.cos(ang * 5 + h2(ci + a, cj + b, 3) * 6);
      if (d < petal && d < best) { best = d; col = d < 0.08 ? [240, 200, 60] : h2(ci + a, cj + b, 4) > 0.6 ? [60, 120, 70] : T.col2; }
    }
    return col;
  }

  /** What shows inside a V-neck: shirt + tie, blouse, polo or skin. */
  function innerPx(c, o, L) {
    const ax = Math.abs(c.x);
    if (L.kind === 'skin') { skinPx(c, o, 0.92); return; }
    shadeInto(o, L.col, bodyK(c) * fabricK(c, 'cotton') * 0.98);
    if (L.tie) {
      const tw = 0.01 * H + (P.neckBase - c.y) * 0.06;
      if (ax < tw) {
        let tc = L.tie;
        if (T.tieKind === 'stripe' && Math.floor((c.y - c.x) / 0.012) % 2) tc = mixT(tc, [230, 220, 200], 0.35);
        if (T.tieKind === 'dots' && (Math.round(c.y / 0.01) + Math.round(c.x / 0.01)) % 2 === 0 && h2(c.i, c.j, 3) > 0.3) tc = mixT(tc, [230, 220, 200], 0.3);
        shadeInto(o, tc, bodyK(c) * (1 - ax / tw * 0.12));
        if (Math.abs(ax - tw) < c.px * 0.8) over(o, INK, 0.4);
        if (c.y > P.neckBase - 0.012 * H) shadeInto(o, L.tie, 0.85); // knot
        return;
      }
    }
    // collar points
    const yN = P.neckBase;
    if (c.y > yN - 0.035 * H && ax < 0.03 * H) {
      const edge = (yN - c.y) * 0.75 + 0.008 * H;
      if (Math.abs(ax - edge) < c.px * 0.8) over(o, INK, 0.3);
    }
    if (L.kind === 'shirt' && ax < c.px * 0.6) over(o, INK, 0.25);
  }

  // ---------------------------------------------------------------- bottoms
  function bottomPx(c, o) {
    const k = Bt.kind, ax = Math.abs(c.x), fr = front(c), bk = back(c);
    const leg = c.part === 'thigh' || c.part === 'calf' || c.part === 'shin';
    let col = Bt.col;
    if (skirt) col = Bt.plaid ? plaid(around(c), c.y, Bt.col, Bt.plaid, 1.2) : Bt.col;
    const fab = k === 'jeans' ? 'denim' : k === 'slacks' ? 'wool' : 'cotton';
    let kk = bodyK(c) * fabricK(c, fab);
    if (leg) {
      const sx = Math.sign(c.x) || 1;
      const ar = around(c);
      kk *= crease(ar, c.y + ar * 0.25, 20, 210, 0.24 * G(c.y - P.kneeY, 0, 0.03 * H, 1) * (bk ? 1 : 0.35), 41); // behind the knee
      if (fr && c.part === 'thigh' && c.y > P.crotchY - 0.08 * H && -sx * c.nx > -0.3) {
        const wk = crease(c.x * sx, c.y - (c.x - P.hipX * sx) * sx * 1.4, 26, 230, (k === 'jeans' ? 0.22 : 0.14) * sstep(P.crotchY - 0.08 * H, P.crotchY - 0.01 * H, c.y), 42);
        kk *= k === 'jeans' ? 2 - wk : wk; // jeans: worn-light whiskers
      }
      if (c.y < botHem + 0.08 * H && k !== 'shorts') kk *= crease(ar, c.y + ar * 0.3, 24, 240, 0.2 * sstep(botHem + 0.08 * H, botHem + 0.01 * H, c.y), 43); // stacking over the shoe
      kk *= crease(c.y, ar, 4.5, 46, 0.07, 44); // the long hang of the leg
      if (fr && Math.abs(c.y - P.kneeY - 0.015 * H) < 0.03 * H) kk *= 1.03;
    }
    if (k === 'jeans') {
      // wear: lighter thigh fronts / knees, darker seams
      const wear = fr ? 0.16 * G(0, c.y - (P.kneeY + 0.08 * H), 1, 0.09 * H) * (0.6 + 0.4 * vnoise(c.x * 60, c.y * 30, 4)) : 0;
      col = mixT(col, [150, 170, 200], wear);
    }
    shadeInto(o, col, kk);
    // waistband / belt
    if (!skirt && c.y > waist - 0.02 * H && c.y <= waist + 0.002 * H && !(c.y > topHem)) {
      if (Bt.belt && (tuck || T.kind === 'flannel')) {
        shadeInto(o, Bt.belt, bodyK(c) * fabricK(c, 'leather') * (Math.abs(c.y - waist + 0.01 * H) < 0.004 * H ? 1.12 : 1));
        if (fr && ax < 0.016 * H) { shadeInto(o, SILVER, 0.9 + 0.2 * h2(c.i, c.j, 5)); if (Math.abs(ax - 0.016 * H) < c.px || Math.abs(Math.abs(c.y - waist + 0.009 * H) - 0.009 * H) < c.px * 0.8) over(o, INK, 0.5); }
      }
      if (Math.abs(c.y - (waist - 0.02 * H)) < c.px * 0.7) over(o, INK, 0.35);
      if (Math.abs(c.y - waist) < c.px * 0.6) over(o, INK, 0.3);
    }
    if (skirt) return;
    if (leg) {
      // side seams (outer), inseam (inner), trouser crease (front)
      const sx = Math.sign(c.x) || 1;
      if (sx * c.nx > 0.9 && Math.abs(c.e) < 0.1) over(o, k === 'jeans' ? [200, 140, 70] : INK, k === 'jeans' ? 0.5 : 0.2);
      if (k === 'slacks' && !Bt.noCrease && fr && Math.abs(c.e) < 0.07) scaleO(o, 1.1);
      if (k === 'cargo' && sx * c.nx > 0.5 && c.part === 'thigh' && c.y < P.hipY - 0.07 * H && c.y > P.kneeY + 0.04 * H) {
        const top = P.hipY - 0.07 * H, fy = top - 0.022 * H;
        if (c.y > fy) { scaleO(o, 1.06); if (Math.abs(c.y - fy) < c.px) over(o, INK, 0.4); }
        if (Math.abs(c.y - top) < c.px || Math.abs(c.y - (P.kneeY + 0.04 * H)) < c.px || Math.abs(c.e) > 0.85) over(o, INK, 0.35);
      }
      if (c.y < botHem + 0.012 * H && Math.abs(c.y - botHem - 0.012 * H) < c.px * 0.7) over(o, INK, 0.3);
      if (k === 'shorts' && c.y < botHem + 0.012 * H) scaleO(o, 1.05);
      return;
    }
    // hips: fly, pockets, back pockets / yoke
    if (fr && c.y < waist - 0.02 * H && c.y > P.crotchY + 0.02 * H && Math.abs(c.x - 0.008 * H) < c.px * 0.6) over(o, k === 'jeans' ? [200, 140, 70] : INK, 0.35);
    if (fr && c.y < waist - 0.02 * H) {
      const pxl = P.hipsX * 0.62 + (waist - c.y) * 0.45; // slanted pocket opening
      if (Math.abs(ax - pxl) < c.px * 0.8 && c.y > waist - 0.075 * H) over(o, INK, 0.4);
      if (k === 'jeans' && Math.abs(ax - pxl - c.px * 1.5) < c.px * 0.5 && c.y > waist - 0.075 * H) over(o, C_200_140_70, 0.5);
      if (k === 'jeans' && Math.abs(c.y - (waist - 0.075 * H)) < c.px && Math.abs(ax - pxl) < c.px * 1.4) over(o, C_220_150_80, 0.9);
    }
    if (bk && c.y < waist - 0.03 * H && c.y > waist - 0.1 * H && ax > 0.015 * H && ax < 0.07 * H) {
      if (k === 'jeans') { if (Math.abs(c.y - (waist - 0.03 * H)) < c.px || Math.abs(ax - 0.015 * H) < c.px || Math.abs(ax - 0.07 * H) < c.px) over(o, C_200_140_70, 0.5); }
      else if (Math.abs(c.y - (waist - 0.04 * H)) < c.px * 0.7 && ax > 0.025 * H && ax < 0.06 * H) over(o, INK, 0.45);
    }
  }

  // ---------------------------------------------------------------- legs below the hem
  function legwearPx(c, o) {
    const lw = spec.legs;
    if (bootTop && c.y < bootTop && (c.part === 'shin')) { shoeUpper(c, o); return; }
    if (sockTop && c.y < sockTop && lw !== 'tights') {
      const sc = spec.socks?.col || WHITE;
      shadeInto(o, sc, bodyK(c) * (c.i % 2 ? 0.93 : 1.02));
      if (sockTop - c.y < 0.012 * H) shadeInto(o, sc, bodyK(c) * (c.i % 2 ? 0.86 : 1));
      if (spec.legs === 'kneesocks' && Math.abs(c.y - sockTop) < c.px * 0.7) over(o, INK, 0.2);
      return;
    }
    skinPx(c, o);
    if (lw === 'tights') {
      const tc = spec.tights || [60, 50, 54];
      const sheer = 0.55 + 0.25 * Math.abs(c.e);
      over(o, tc, sheer);
      if (Math.abs(c.e) < 0.25 && front(c)) over(o, C_255_245_235, 0.06);
    }
  }

  // ---------------------------------------------------------------- shoes
  function shoeUpper(c, o) {
    const S = spec.shoes, k = S.kind;
    let col = S.col;
    let fab = k === 'sneaker' || k === 'comfort' ? 'cotton' : 'leather';
    shadeInto(o, col, bodyK(c) * fabricK(c, fab));
    if (k === 'tabi') {
      // kohaze clasps up the inner side
      const sx = Math.sign(c.x) || 1;
      if (-sx * c.nx > 0.5 && Math.abs(c.e) < 0.25 && Math.abs(((c.y / (0.012 * H)) % 1) - 0.5) < 0.18) over(o, GOLD, 0.8);
      if (Math.abs(c.y - bootTop) < c.px) over(o, INK, 0.4);
    }
    if (k === 'boots' && front(c) && Math.abs(c.e) < 0.3 && Math.round(c.y / (0.01 * H)) % 2 === 0) over(o, C_200_180_140, 0.6);
  }
  /** Shoes (tubes): the upper by kind (laces and eyelets, toe caps, welts, straps, velcro, clasps), soles with tread. */
  function shoeTubePx(c, o) {
    const S = spec.shoes, k = S.kind, M = c.seg.meta, t = (c.z - M.z0) / M.fl, sx = Math.sign(c.x) || 1;
    const inner = -sx * c.nx > 0.45, top = c.ny > 0.45, dx = c.x - sx * M.lx;
    const leather = k === 'oxford' || k === 'loafer' || k === 'pumps' || k === 'boots';
    const lightK = 0.78 + 0.26 * clamp01(c.ny * 0.6 + c.nz * 0.25 + 0.5);
    if (c.part === 'sole' || c.part === 'heel') {
      const soleCol = k === 'sneaker' || k === 'platform' ? [232, 228, 218] : k === 'tabi' ? [46, 44, 46] : k === 'comfort' ? [206, 196, 180] : k === 'sandal' ? mixT(S.col, [60, 40, 30], 0.3) : [44, 34, 30];
      let kk = lightK * (1 + (vnoise(c.i * 0.5, c.j * 0.5, 51) - 0.5) * 0.08);
      if (c.ny < -0.5) { kk *= 0.55; if ((Math.floor(c.z * 260) + Math.floor(c.x * 200)) % 3 === 0) kk *= 0.8; } // tread underneath
      shadeInto(o, soleCol, kk);
      if (c.ny > -0.5 && c.ny < 0.5) {
        // the sole's edge: tread grooves on sneakers, a stitched welt line on leather soles, a coloured midsole stripe
        const h = c.y / Math.max(1e-4, S_sole());
        if ((k === 'sneaker' || k === 'comfort' || k === 'boots' || k === 'platform') && Math.abs(((c.z * 180) % 1) - 0.5) < 0.18 && h < 0.4) { o[0] *= 0.82; o[1] *= 0.82; o[2] *= 0.82; }
        if (k === 'sneaker' && Math.abs(h - 0.62) < 0.12) shadeInto(o, S.col2 || [180, 40, 40], lightK * 0.95);
        if (leather && Math.abs(h - 0.8) < 0.1 && (c.i % 3) === 0) shadeInto(o, mixT(soleCol, [200, 170, 120], 0.5), lightK);
      }
      if (c.ny > 0.5) { o[0] *= 0.7; o[1] *= 0.7; o[2] *= 0.7; }
      return;
    }
    // ---- the upper
    if (k === 'sandal') {
      // the bare (or socked) foot, toes at the front, straps over the instep
      const sk = spec.socks?.col || skin;
      shadeInto(o, sk, lightK * (1 + (vnoise(c.i * 0.3, c.j * 0.3, 52) - 0.5) * 0.06));
      if (!spec.socks?.col) over(o, C_210_120_110, 0.08);
      if (t > 0.78 && top) { const q = ((c.x * sx - (M.lx - 0.02)) / 0.008) % 1; if (Math.abs(q) < 0.12) { o[0] *= 0.8; o[1] *= 0.76; o[2] *= 0.76; } }
      if ((t > 0.52 && t < 0.64) || (t > 0.16 && t < 0.22 && !top)) { shadeInto(o, S.col, lightK * fabricK(c, 'leather')); if (Math.abs(t - 0.52) < 0.012 || Math.abs(t - 0.64) < 0.012) over(o, INK, 0.3); }
      return;
    }
    let col = S.col;
    let kk = lightK * fabricK(c, leather ? 'leather' : k === 'tabi' ? 'cotton' : 'nylon');
    if (k === 'sneaker' || k === 'platform') {
      // canvas upper, a rubber toe cap, a stripe down the side, a padded collar, laces over the tongue
      if (t > 0.82) col = mixT(S.col, [236, 234, 228], 0.7);
      if (!top && !inner && Math.abs(c.y - (M.base(c.z) + 0.02 * H + (t - 0.45) * 0.03 * H)) < 0.005 * H && t > 0.25 && t < 0.75) col = S.col2 || [40, 60, 120];
      if (c.y > M.top(c.z) - 0.007 * H && t < 0.35) kk *= 0.86; // the collar
    }
    shadeInto(o, col, kk);
    if (leather) {
      // polish: short highlight dashes on the toe and heel, a welt line above the sole
      const g = G(c.ny - 0.55, 0, 0.18, 1) * (t > 0.7 ? 1 : t < 0.12 ? 0.6 : 0.25);
      if (g > 0.25 && (c.i + c.j) % 3 !== 0) over(o, C_255_248_238, 0.3 * g);
      if (Math.abs(c.y - M.base(c.z) - 0.003 * H) < c.px * 0.7) over(o, INK, 0.45);
      if (k === 'oxford' && Math.abs(t - 0.74) < 0.012 && c.ny > -0.2) over(o, INK, 0.4); // cap toe seam
      if (k === 'oxford' && Math.abs(t - 0.74) < 0.04 && Math.abs(t - 0.74) > 0.02 && c.ny > 0.2 && (c.i % 2) === 0) over(o, INK, 0.25); // brogue holes
      if (k === 'loafer' && top && t > 0.42 && t < 0.52 && Math.abs(dx) < 0.016 * H) { shadeInto(o, mixT(col, INK, 0.2), lightK); if (Math.abs(t - 0.47) < 0.012 && Math.abs(dx) < 0.006 * H) shadeInto(o, mixT(col, INK, 0.6), 1); } // penny strap
      if (k === 'pumps' && c.y > M.top(c.z) - 0.004 * H) over(o, INK, 0.3);
    }
    // laces over the instep
    if ((k === 'oxford' || k === 'sneaker' || k === 'boots' || k === 'platform') && top && t > 0.28 && t < (k === 'boots' ? 0.66 : 0.62)) {
      const w = (k === 'boots' ? 0.012 : 0.0095) * H;
      if (Math.abs(dx) < w) {
        const tongue = mixT(col, INK, 0.25);
        shadeInto(o, tongue, lightK);
        const q = ((t - 0.28) * M.fl / (0.011 * H)) % 1;
        const lace = k === 'sneaker' ? [246, 244, 238] : k === 'boots' ? [170, 120, 70] : [30, 24, 22];
        if (Math.abs(Math.abs(dx) / w - q) < 0.22 || Math.abs(Math.abs(dx) / w - (1 - q)) < 0.22) shadeInto(o, lace, lightK * (q < 0.5 ? 1 : 0.85));
        if (Math.abs(Math.abs(dx) - w) < c.px * 0.8) over(o, INK, 0.4);
      } else if (Math.abs(Math.abs(dx) - w - 0.002 * H) < 0.0016 * H && ((t * M.fl / (0.011 * H)) % 1) < 0.3) shadeInto(o, [180, 180, 186], 0.9); // eyelets
    }
    if (k === 'comfort' && top && t > 0.3 && t < 0.64) {
      // two velcro straps across the instep
      for (const tc of [0.38, 0.54]) if (Math.abs(t - tc) < 0.045) { shadeInto(o, mixT(col, INK, 0.12), lightK * fabricK(c, 'nylon')); if (Math.abs(Math.abs(t - tc) - 0.045) < 0.008) over(o, INK, 0.35); if (Math.abs(dx + sx * 0.012 * H) < 0.004 * H) shadeInto(o, [200, 196, 186], lightK); }
    }
    if (k === 'tabi') {
      if (t > 0.86 && top && Math.abs(dx + sx * 0.008 * H) < c.px * 0.8) over(o, INK, 0.7); // the split toe
      if (inner && c.y > P.ankleY && (Math.floor(c.y / (0.012 * H)) % 2) === 0 && Math.abs(t - 0.2) < 0.06) over(o, GOLD, 0.8); // kohaze clasps
    }
    if (k === 'boots' && c.y > P.ankleY + 0.02 * H && (c.j % 4) === 0 && !top) over(o, INK, 0.08);
    // creases where the foot bends
    if (top && Math.abs(t - 0.66) < 0.06) { const w = crease(c.x * 3, t * 8, 40, 30, 0.18, 53); o[0] *= w; o[1] *= w; o[2] *= w; }
    // dust and wear low on the toe
    if (c.y < M.base(c.z) + 0.008 * H && t > 0.8) over(o, [150, 140, 120], 0.12);
  }
  const S_sole = () => (spec.shoes.kind === 'platform' ? 0.032 * H : spec.shoes.kind === 'sneaker' || spec.shoes.kind === 'comfort' || spec.shoes.kind === 'boots' || spec.shoes.kind === 'tabi' ? 0.014 * H : spec.shoes.kind === 'sandal' ? 0.012 * H : 0.008 * H);
  function shoePx(c, o) {
    if (c.tube) { shoeTubePx(c, o); return; }
    const S = spec.shoes, k = S.kind, toe = c.part === 'toe';
    const sole = k === 'platform' ? 0.032 * H : k === 'sneaker' || k === 'comfort' || k === 'boots' || k === 'tabi' ? 0.014 * H : k === 'sandal' ? 0.012 * H : 0.007 * H;
    const soleCol = k === 'sneaker' || k === 'platform' ? [238, 236, 230] : k === 'tabi' ? [40, 40, 44] : k === 'comfort' ? [210, 200, 186] : k === 'sandal' ? S.col : [40, 30, 26];
    if (c.kind === 'bot') { shadeInto(o, mixT(soleCol, INK, 0.4), 0.7); return; }
    if (c.y < sole) {
      shadeInto(o, soleCol, 0.95 * fabricK(c, 'cotton'));
      if (k === 'sneaker' && Math.abs(c.y - sole * 0.55) < c.px * 0.6) shadeInto(o, S.col2 || INK, 0.9);
      if (Math.abs(c.y - sole) < c.px * 0.6) over(o, INK, 0.3);
      return;
    }
    // what the upper looks like
    let col = S.col;
    if (k === 'sandal') { const sc = spec.socks?.col || skin; shadeInto(o, sc, bodyK(c) * (c.i % 2 ? 0.94 : 1)); if (!toe && c.y < sole + 0.02 * H && (front(c) || c.kind === 'top') || (toe && c.kind === 'top' && c.z < 0.11 * H)) { if (Math.abs(c.nx) < 0.9) shadeInto(o, S.col, 0.9); } return; }
    if (k === 'pumps' && c.kind === 'top' && !toe) { legwearPx({ ...c, part: 'shin' }, o); if (Math.abs(c.z - (-0.01)) < 0.008) over(o, S.col, 0.9); return; }
    const leather = k === 'oxford' || k === 'loafer' || k === 'pumps' || k === 'boots';
    let kk = bodyK(c) * 1.05 * fabricK(c, leather ? 'leather' : 'cotton');
    shadeInto(o, col, kk);
    if (leather) {
      // polished highlight on the toe and the heel
      const hi = (toe ? 0.35 : 0.12) * G(c.e, c.rb / Math.max(c.rh, 1e-4) - 0.6, 0.4, 0.25) * (c.kind === 'top' ? 1.2 : 0.8);
      over(o, C_255_248_238, hi);
      if (Math.abs(c.y - sole - c.px) < c.px * 0.6) over(o, INK, 0.4); // welt
    }
    if (k === 'sneaker' || k === 'comfort' || k === 'platform') {
      if (toe && c.kind === 'top') shadeInto(o, mixT(col, WHITE, 0.25), kk);
      const sx = Math.sign(c.x) || 1;
      if (k === 'sneaker' && sx * c.nx > 0.7 && !toe && Math.abs(c.y - sole - 0.012 * H + c.e * 0.006 * H) < 0.004 * H) shadeInto(o, S.col2 || INK, 0.95);
    }
    if (!toe && c.kind === 'top') {
      // laces / straps across the instep
      if (k === 'oxford' || k === 'sneaker' || k === 'boots') { if (c.z > -0.01 && Math.abs(c.x - P.hipX * Math.sign(c.x)) < 0.012 * H) { const q = (c.z * 260) % 1; shadeInto(o, k === 'sneaker' ? [246, 246, 242] : mixT(col, INK, 0.5), q < 0.45 ? 1 : 0.7); } }
      if (k === 'loafer' && c.z > 0.005 && c.z < 0.025) shadeInto(o, mixT(col, INK, 0.25), 1);
      if (k === 'comfort' && (Math.abs(c.z - 0.01) < 0.006 || Math.abs(c.z - 0.035) < 0.006)) shadeInto(o, mixT(col, INK, 0.2), 1);
    }
    if (k === 'tabi' && toe && front(c) && Math.abs(c.x - Math.sign(c.x) * (P.hipX - 0.005)) < c.px * 0.7) over(o, INK, 0.7);
    if (k === 'oxford' && toe && c.kind === 'top' && c.z < P.footL * 0.62 && c.z > P.footL * 0.58) over(o, INK, 0.3);
  }

  // ---------------------------------------------------------------- body dispatcher
  function bodyPx(c, o) {
    const p = c.part, y = c.y;
    // the hem lips (anatomy.js: a garment's edge sits proud of what is under it): the underside belongs to the
    // garment above it, in its own shadow
    const under = c.tube && c.ny < -0.25;
    if (p === 'uarm' || p === 'farm') {
      if (y > cuffY - (c.tube ? 0.0015 * H : 0)) { topPx(c, o); if (under && y < cuffY + 0.001 * H) scaleO(o, 0.66); } else skinPx(c, o);
      straps(c, o);
      return;
    }
    if (p === 'thigh' || p === 'calf' || p === 'shin') {
      if (!skirt && y >= botHem - (c.tube ? 0.0017 * H : 0)) { bottomPx(c, o); if (under && y < botHem + 0.001 * H) scaleO(o, 0.62); } else legwearPx(c, o);
      if (apron && y > P.kneeY + 0.02 * H) apronLeg(c, o);
      return;
    }
    // torso
    if (y > topHem - (c.tube ? 0.0017 * H : 0)) { topPx(c, o); if (under && y < topHem + 0.001 * H) scaleO(o, 0.66); }
    else bottomPx(c, o);
    if (apron) apronBib(c, o);
    straps(c, o);
  }
  function apronLeg() {}
  function apronBib(c, o) {
    const a = apron, ax = Math.abs(c.x);
    if (front(c) && c.y > P.pelvisY && c.y < P.bustY + 0.05 * H && ax < 0.07 * H) {
      shadeInto(o, a.col, bodyK(c) * fabricK(c, 'cotton'));
      if (Math.abs(ax - 0.07 * H) < c.px * 1.2 || Math.abs(c.y - (P.bustY + 0.05 * H)) < c.px) over(o, INK, 0.3);
      if (ax < 0.04 * H && Math.abs(c.y - (P.bustY - 0.03 * H)) < c.px * 0.6) over(o, INK, 0.35);
    }
    // neck strap + waist ties
    if (c.y > P.bustY + 0.05 * H && Math.abs(ax - (0.055 * H - (c.y - P.bustY) * 0.25)) < 0.006 * H && !back(c)) shadeInto(o, a.col, bodyK(c) * 0.95);
    if (Math.abs(c.y - (P.pelvisY + 0.008 * H)) < 0.006 * H && !front(c)) shadeInto(o, a.col, bodyK(c) * 0.95);
  }
  function straps(c, o) {
    // shoulder bag strap (over one shoulder), backpack straps, camera strap
    const ax = Math.abs(c.x);
    if (bagStrap) {
      const sd = bagStrap.side || 1;
      if (Math.sign(c.x) === sd && (c.part === 'traps' || c.part === 'chestHi' || c.part === 'chestLo') && Math.abs(c.ny) < 0.95) {
        const sx = P.chestTopX * 0.75;
        if (Math.abs(ax - sx) < 0.011 * H && (c.kind === 'top' || Math.abs(c.nz) > 0.4)) { shadeInto(o, mixT(bagStrap.col, INK, 0.15), bodyK(c) * 0.95); if (Math.abs(Math.abs(ax - sx) - 0.011 * H) < c.px * 0.7) over(o, INK, 0.4); }
      }
    }
    if (pack && (c.part === 'traps' || c.part === 'chestHi' || c.part === 'chestLo')) {
      const sx = P.chestTopX * 0.62;
      if (Math.abs(ax - sx) < 0.014 * H && (c.kind === 'top' || front(c) || (back(c) && c.y > P.shoulderY - 0.02 * H))) {
        shadeInto(o, mixT(pack.col, INK, 0.25), bodyK(c) * 0.95);
        if (Math.abs(Math.abs(ax - sx) - 0.014 * H) < c.px * 0.7) over(o, INK, 0.45);
        if (front(c) && Math.abs(c.y - P.bustY) < 0.006 * H) shadeInto(o, SILVER, 0.7);
      }
    }
    if (cam && (c.part === 'traps' || c.part === 'chestHi') && !back(c)) {
      const w = P.hw * 0.9 + (P.neckBase - c.y) * 0.3;
      if (Math.abs(ax - w) < 0.006 * H && c.y > P.bustY) shadeInto(o, [30, 30, 32], 0.9);
    }
  }

  // ---------------------------------------------------------------- head (sides / back / top / jaw), ears, nose
  const HP = makeHairPainters(spec, P, fabricK);
  /** The modelled shirt collar (anatomy.js): the shirt's cloth, cut away in the open V, a fold line along the top. */
  function collarTubePx(c, o) {
    o[3] = 255;
    skinPx(c, o);
    if (!collarPx(c, o)) { o[3] = 0; return; }
    if (c.lt > 0.82) scaleO(o, 0.86); // the fold at the top edge
    if (c.ny < -0.2 || c.lt < 0.08) scaleO(o, 0.72); // the inside / underside
  }
  /** Skin of the head (sides, back, under the jaw; the front is the face block): mottled, form-shaded, scalp hair over it. */
  function headPx(c, o) {
    let k = 0.9 * (1 + (vnoise(c.i * 0.3, c.j * 0.3, 21) - 0.5) * 0.05);
    if (c.ny < -0.2) k *= 0.82 + 0.18 * (1 + c.ny); // under the jaw
    // behind / round the ear a little darker, the back of the head away from the light
    if (Math.abs(c.nx) > 0.5 && c.y > P.earBot - 0.04 * hu && c.y < P.earTop + 0.03 * hu && Math.abs(c.z - (P.hcz - 0.11 * hu)) < 0.08 * hu) k *= 0.86;
    shadeInto(o, skin, k, 0.25);
    over(o, C_210_120_110, 0.06 * clamp01(c.nz)); // warm cheeks / temples
    if (spec.face.stubble && c.y < P.mouthY + 0.06 * hu && c.z > P.hcz - 0.12 * hu) over(o, C_70_72_84, spec.face.stubble * (0.14 + 0.24 * h2(c.i, c.j, 77)) * (c.ny < -0.2 ? 1.2 : 1));
    if (spec.face.spots && h2(c.i >> 1, c.j >> 1, 93) > 0.975) over(o, C_150_100_70, 0.28);
    if (hair.style === 'bald' && c.ny > 0.2) over(o, C_255_240_225, 0.16 * G(c.x, c.z - P.hcz - 0.02, 0.035, 0.04) * c.ny); // a shine on the skull
    HP.scalp(c, o);
    // glasses temple arms on their way to the ears
    if (spec.glasses && Math.abs(c.nx) > 0.45 && Math.abs(c.y - (P.eyeY + 0.02 * hu)) < c.px * 0.9 && c.z > P.hcz - 0.13 * hu) over(o, spec.glasses.col, 0.95);
  }
  /** The ear: an outer shell (helix rim, the bowl of the concha, a soft lobe), the back of it and its edge. */
  function earPx(c, o) {
    const outward = c.nx > 0.35; // authored on the left (+x)
    const ey = c.lt * 2 - 1, ez = (c.z - (P.hcz - 0.11 * hu)) / (0.05 * hu);
    let k = outward ? 0.9 : 0.76;
    shadeInto(o, skin, k, 0.3);
    over(o, C_220_120_110, 0.14);
    if (outward) {
      const r = Math.hypot(ez * 1.0, ey * 0.95);
      if (r > 0.8) over(o, C_255_230_215, 0.1); // the helix catches the light
      else if (r > 0.64) { o[0] *= 0.9; o[1] *= 0.86; o[2] *= 0.86; } // the groove inside it
      if (Math.hypot(ez + 0.12, ey + 0.08) < 0.34) { o[0] *= 0.8; o[1] *= 0.74; o[2] *= 0.74; } // concha
      if (Math.hypot(ez - 0.32, ey + 0.2) < 0.12) { o[0] *= 0.82; o[1] *= 0.76; o[2] *= 0.76; } // tragus shadow
      if (ey < -0.62) over(o, C_230_150_140, 0.18); // the lobe
    }
    HP.scalp(c, o) && null;
    if (spec.glasses && Math.abs(c.y - (P.eyeY + 0.02 * hu)) < c.px * 0.8 && c.nx > 0.2) over(o, spec.glasses.col, 0.9);
  }
  /** The nose's sides and underside (its front is in the face block): nostrils, wings, a warm tip. */
  function nosePx(c, o) {
    const nzK = P.kid ? 0.72 : P.f ? 0.84 : 1;
    if (c.ny < -0.3) {
      shadeInto(o, skin, 0.66, 0.35);
      const nx = (Math.abs(c.x) - 0.022 * hu * nzK) / (0.014 * hu * nzK), nz = (c.z - (P.zf + 0.018 * hu)) / (0.012 * hu);
      if (nx * nx + nz * nz < 1) shadeInto(o, [72, 38, 36], 1);
      else if (nx * nx + nz * nz < 1.8) { o[0] *= 0.86; o[1] *= 0.82; o[2] *= 0.82; }
      return;
    }
    shadeInto(o, skin, 0.84 + 0.1 * clamp01(c.nz), 0.3);
    if (c.y < P.noseY + 0.02 * hu && Math.abs(c.x) > 0.03 * hu * nzK) { o[0] *= 0.9; o[1] *= 0.86; o[2] *= 0.86; } // the crease round the wings
    over(o, C_215_115_105, 0.08 * clamp01((P.noseY + 0.05 * hu - c.y) / (0.05 * hu)));
  }

  // ---------------------------------------------------------------- hair shells
  function hairShellPx(c, o) {
    const part = c.part, side = c.kind === 'side';
    const sideways = side && Math.abs(c.nx) > 0.4;
    // strands run down the sides (combed slightly back on the temples) and radiate from the crown on top
    const u = c.kind === 'top' ? Math.atan2(c.x - (hair.part || 0) * P.hw * 0.3, c.z - P.hcz + 0.04 * hu) * 34 : c.i + (sideways ? Math.round(c.rt / c.px * 0.3) : 0);
    let sheen;
    if (c.kind === 'top') sheen = 0.3 * G(0, Math.hypot(c.x, c.z - P.hcz) - P.hw * 0.58, 1, 0.03 * hu);
    else if (part === 'tail' || part === 'hairLong') sheen = 0.5 * G(0, c.rt - 0.035, 1, 0.022);
    else if (part === 'bangs') sheen = 0.5 * G(0, c.rt / c.rh - 0.3, 1, 0.14);
    else {
      // an arc of sheen around the head, broken up by strands
      const yb = P.crown - 0.2 * hu - 0.05 * hu * c.e * c.e + Math.sin(c.i * 0.9) * 0.008 * hu;
      sheen = 0.45 * G(0, c.y - yb, 1, 0.03 * hu) * (0.55 + 0.45 * Math.sin(c.i * 0.37 + c.j * 0.05));
    }
    if (c.kind === 'bot' && (part === 'bangs' || part === 'fringe')) { o[3] = 0; return; } // thin strands: no visible underside
    let k = 1;
    if (c.kind === 'bot') k = 0.5;
    else if (side) k = 0.9 + 0.12 * (1 - c.e * c.e) - 0.18 * clamp01(1 - c.rb / (0.05 * hu));
    if (part === 'hairSide' && c.nx * Math.sign(c.x || 1) < -0.5) k *= 0.55;
    if (hair.style === 'perm') {
      // tight curls: blotchy rings with bright tops
      const q = vnoise(c.i * 0.6, c.j * 0.6, 8), q2 = vnoise(c.i * 0.6 + 7, c.j * 0.6 - 3, 9);
      k *= 0.7 + 0.45 * Math.abs(Math.sin(q * 9)) + 0.12 * (q2 - 0.5);
      hairPx(o, hair, c.i * 0.25, c.j * 0.25, k, sheen * 0.35 + (Math.sin(q * 9) > 0.8 ? 0.25 : 0));
    } else hairPx(o, hair, u, c.j, k, sheen);
    if (hair.grey && hair.style !== 'perm' && h2(c.i, c.j, 44) > 0.72) over(o, C_252_252_250, 0.22);
    // parting line on top
    if (c.kind === 'top' && hair.part && ['sidepart', 'long', 'bob', 'short'].includes(hair.style) && Math.abs(c.x - hair.part * P.hw * 0.3) < c.px * 0.6 && c.z > P.hcz - 0.05 * hu) shadeInto(o, skin, 0.75);
    // ragged lower edges (alpha cut), tapered sideburns, swept / curly fringes
    if (side) {
      const cut = c.seg.cut;
      let edge = c.rb / c.px;
      if (cut === 'side') edge = (c.rb - (c.e * Math.sign(hair.part || 1) + 1) * 0.025 * hu) / c.px;
      else if (cut === 'swept') edge = (c.rb - (1 - c.e * (hair.part || 1)) * 0.035 * hu) / c.px;
      else if (cut === 'curly') edge = (c.rb - Math.abs(Math.sin(c.e * 7)) * 0.025 * hu) / c.px;
      if (part === 'hairSide' && sideways && (hair.style === 'short' || hair.style === 'sidepart' || hair.style === 'buzz' || hair.style === 'ponytail' || hair.style === 'bun')) edge = (c.rb - clamp01(-c.e) * 0.08 * hu) / c.px;
      const depth = cut === 'messy' ? 5 : part === 'tail' ? 7 : part === 'hairCap' ? 3.5 : part === 'bangs' ? 4 : 2.8;
      const col = Math.floor(c.i / (cut === 'messy' ? 2 : 1));
      const tip = h2(col, 3, 17) * depth + (part === 'tail' ? Math.abs(c.e) * 5 : 0) + (part === 'bangs' && h2(col >> 2, 5, 18) > 0.7 ? 2 : 0);
      if (edge < tip) o[3] = 0;
      else if (edge < depth + 1.5) { o[0] *= 0.8; o[1] *= 0.8; o[2] *= 0.8; }
    }
  }

  // ---------------------------------------------------------------- hats
  function hatPx(c, o) {
    const Hh = spec.hat, k = Hh.kind;
    let col = Hh.col, kk = 0.95 * (c.kind === 'bot' ? 0.5 : 1) * fabricK(c, k === 'hardhat' ? 'leather' : 'cotton');
    if (k === 'flatcap') kk *= 1 + ((((c.i + (c.j >> 1)) % 4) < 2) ? 0.05 : -0.05) * (c.j % 2 ? 1 : -1);
    if (k === 'sunhat') kk *= (c.i + c.j) % 2 ? 0.92 : 1.04;
    if (c.kind === 'side') kk *= 0.94 + 0.06 * (1 - c.e * c.e);
    shadeInto(o, col, kk);
    if (k === 'hardhat') { over(o, C_255_255_255, 0.25 * G(c.e, c.rb / c.rh - 0.6, 0.35, 0.25)); if (c.kind === 'side' && c.nz > 0.9 && Math.abs(c.e) < 0.3 && Math.abs(c.rb / c.rh - 0.5) < 0.2 && (Math.abs(c.e) < 0.1 || Math.abs(c.rb / c.rh - 0.5) < 0.07)) shadeInto(o, [40, 150, 60], 0.95); }
    if (k === 'cap' && c.kind === 'side' && c.nz > 0.9 && Math.abs(c.e) < 0.35 && c.rb / c.rh > 0.3 && c.rb / c.rh < 0.75) shadeInto(o, Hh.col2 || WHITE, 0.95);
    if (k === 'cap' && c.kind === 'top' && Math.hypot(c.x, c.z - P.hcz) < 0.008) shadeInto(o, mixT(col, INK, 0.3), 1);
    if ((k === 'sunhat' || k === 'bucket') && c.kind === 'side' && c.rb < 0.02 * hu + 0.012) shadeInto(o, Hh.col2 || mixT(col, INK, 0.3), 0.9);
    if (k === 'schoolhat' && c.kind === 'side' && c.rb < 0.012) shadeInto(o, mixT(col, WHITE, 0.4), 0.95);
    if (k === 'headband') { shadeInto(o, col, 0.95 * (c.i % 3 ? 1 : 0.93)); if (front(c) && Math.abs(c.x) < 0.02) over(o, C_40_60_120, 0.15); }
    if (c.kind === 'side' && c.rb < c.px * 1.2) over(o, INK, 0.25);
  }
  function hat2Px(c, o) {
    const Hh = spec.hat;
    const col = Hh.kind === 'cap' ? Hh.col : Hh.col;
    let kk = c.kind === 'bot' ? 0.55 : c.kind === 'top' ? 1 : 0.85;
    if (Hh.kind === 'sunhat') kk *= (c.i + c.j) % 2 ? 0.92 : 1.04;
    shadeInto(o, col, kk * fabricK(c, 'cotton'));
    if (c.kind === 'top' && Hh.kind === 'cap') { const r = Math.hypot(c.x, (c.z - P.zf) * 0.6); if (Math.abs(((r / 0.008) % 1) - 0.5) < 0.1) over(o, INK, 0.12); }
    if (c.kind === 'side') over(o, INK, 0.2);
  }

  // ---------------------------------------------------------------- accessories
  function accPx(c, o) {
    const p = c.part, a = spec.acc;
    const leatherK = () => fabricK(c, 'leather') * (c.kind === 'top' ? 1.05 : c.kind === 'bot' ? 0.6 : 0.9 + 0.1 * (1 - c.e * c.e));
    const edge = (w = 1) => c.kind === 'side' && (Math.abs(c.e) > 1 - c.px * 2.4 * w / Math.max(0.01, c.f.s1 - c.f.s0) || c.rb < c.px * w || c.rt < c.px * w);
    if (p === 'skirt' || p === 'skirtUp') {
      let col = Bt.plaid ? plaid(around(c), c.y * 0.9, Bt.col, Bt.plaid, 1.2) : Bt.col;
      let kk = (c.kind === 'bot' ? 0.45 : 0.9 + 0.1 * (c.y - P.kneeY) / H * 2) * fabricK(c, 'wool');
      if (Bt.cut === 'pleated' || Bt.cut === 'long') { const a2 = Math.atan2(c.x, c.z) * (Bt.cut === 'pleated' ? 18 : 10) / Math.PI; const q = a2 - Math.floor(a2); kk *= q < 0.5 ? 1.05 : 0.88; if (q < 0.08) kk *= 0.8; }
      if (Bt.cut === 'pencil' && back(c) && Math.abs(c.x) < c.px && c.rb < 0.06 * H) { o[0] = 30; o[1] = 24; o[2] = 24; return; }
      if (c.kind === 'side') kk *= 1 - 0.06 * c.e * c.e;
      shadeInto(o, col, kk);
      if (p === 'skirtUp' && c.rt < 0.018 * H && c.kind === 'side') { shadeInto(o, col, kk * 0.92); if (Math.abs(c.rt - 0.018 * H) < c.px) over(o, INK, 0.4); }
      if (c.kind === 'side' && c.rb < c.px * 1.2 && p === 'skirt') over(o, INK, 0.3);
      if (apron && p === 'skirtUp' && front(c)) apronBib(c, o);
      return;
    }
    if (p === 'loosesock') {
      shadeInto(o, WHITE, (0.86 + 0.14 * Math.abs(Math.sin(c.y * 420 + vnoise(c.i * 0.4, c.j * 0.2, 2) * 2))) * (c.i % 2 ? 0.95 : 1.02) * (c.kind === 'top' ? 0.8 : 1));
      return;
    }
    if (p === 'tobiThigh' || p === 'tobiShin' || p === 'wideShin') {
      let kk = (0.88 + 0.12 * (1 - c.e * c.e)) * fabricK(c, 'cotton') * fold(c, 0.16, 140, c.i * 0.1, c.y + Math.sin(c.e * 3) * 0.02);
      if (-Math.sign(c.x) * c.nx > 0.4) kk *= 0.86;
      shadeInto(o, Bt.col, kk * (0.9 + 0.12 * clamp01(c.y / H * 1.4)));
      if (p === 'tobiShin' && c.rb < 0.012 * H) shadeInto(o, Bt.col, kk * 0.8);
      return;
    }
    const acc = (k) => a.find((x) => x.kind === k);
    if (p === 'apron') {
      const A = acc('apron');
      shadeInto(o, A.col, (c.kind === 'side' ? 0.92 : 0.6) * fabricK(c, 'cotton') * fold(c, 0.12, 160, 1, c.x * 2));
      if (front(c) && Math.abs(c.x) < 0.08 * H && Math.abs(c.y - (P.hipY - 0.0 * H)) < 0.05 * H) { if (Math.abs(Math.abs(c.x) - 0.08 * H) < c.px || Math.abs(c.y - (P.hipY + 0.05 * H)) < c.px) over(o, INK, 0.35); if (Math.abs(c.x) < c.px * 0.6) over(o, INK, 0.3); }
      if (c.rb < c.px * 1.2) over(o, INK, 0.3);
      return;
    }
    if (p === 'briefcase' || p === 'handbag' || p === 'ecobag' || p.endsWith('Handle')) {
      const A = acc(p.replace('Handle', ''));
      const eco = A.kind === 'ecobag';
      shadeInto(o, A.col, (eco ? fabricK(c, 'cotton') * (0.92 + 0.08 * Math.sin(c.y * 300)) : leatherK()) * (c.kind === 'side' && Math.abs(c.nx) > 0.5 ? 0.92 : 0.8));
      if (p.endsWith('Handle')) { shadeInto(o, mixT(A.col, INK, 0.3), 0.9); return; }
      if (!eco && edge(1.2)) over(o, INK, 0.35);
      if (A.kind === 'briefcase' && c.kind === 'side' && Math.abs(c.nx) > 0.5) {
        if (c.rt < 0.05 && c.rt > 0.045) over(o, INK, 0.3);
        if (Math.abs(c.rt - 0.03) < 0.008 && Math.abs(Math.abs(c.e) - 0.5) < 0.08) shadeInto(o, GOLD, 1);
      }
      if (eco && c.kind === 'side' && Math.abs(c.nx) > 0.5 && Math.abs(c.e) < 0.4 && Math.abs(c.rb / c.rh - 0.5) < 0.12) shadeInto(o, mixT(A.col, INK, 0.45), 0.95);
      return;
    }
    if (p === 'leek' && c.tube) {
      const t = c.lt, g = (c.i % 3) === 0 ? 0.9 : 1;
      if (t < 0.5) { shadeInto(o, mixT([236, 236, 222], [190, 214, 160], sstep(0.3, 0.5, t)), (0.82 + 0.2 * clamp01(c.nz + 0.5)) * g); if (t < 0.04) shadeInto(o, [180, 170, 140], 0.8); }
      else { shadeInto(o, mixT([90, 150, 70], [50, 110, 45], (t - 0.5) * 2), (0.78 + 0.25 * clamp01(c.nz + 0.5)) * g); if ((c.i + c.j) % 5 === 0) scaleO(o, 0.9); }
      return;
    }
    if (p === 'leek') {
      const t = c.rb / c.rh;
      shadeInto(o, t < 0.55 ? [236, 236, 222] : [70, 140, 60], (0.85 + 0.15 * (1 - c.e * c.e)) * (c.i % 2 ? 0.95 : 1.03));
      if (c.kind === 'top') shadeInto(o, [50, 110, 45], 0.9);
      return;
    }
    if (p === 'shoulderbag' || p === 'tote') {
      const A = a.find((x) => x.kind === p);
      shadeInto(o, A.col, (p === 'tote' && !A.school ? fabricK(c, 'cotton') : leatherK()) * (c.kind === 'side' ? 0.95 : 0.75));
      if (edge(1.2)) over(o, INK, 0.3);
      if (c.kind === 'side' && Math.abs(c.nx) > 0.5 && c.rt < 0.35 * c.rh && c.rt > 0.33 * c.rh - c.px) over(o, INK, 0.4);
      if (A.school && c.kind === 'side' && Math.abs(c.nx) > 0.5 && Math.abs(c.e) < 0.25 && Math.abs(c.rb / c.rh - 0.6) < 0.1) shadeInto(o, GOLD, 0.9);
      return;
    }
    if (p === 'camera' || p === 'propCam') {
      shadeInto(o, [34, 34, 36], fabricK(c, 'leather') * (c.kind === 'top' ? 1.1 : 0.9));
      if (c.kind === 'top' || c.rt < 0.012) shadeInto(o, [170, 170, 176], 0.9);
      if (front(c) && c.e > 0.5 && c.rt < 0.025 && c.rt > 0.012) shadeInto(o, [220, 60, 50], 1);
      return;
    }
    if (p === 'lens') {
      shadeInto(o, [28, 28, 30], 0.95);
      if (c.kind === 'top' || c.kind === 'bot') { shadeInto(o, [60, 70, 90], 1); over(o, C_255_255_255, 0.3 * G(c.e, c.rb / Math.max(c.rh, 1e-4) - 0.7, 0.3, 0.2)); }
      return;
    }
    if (p === 'phone') {
      shadeInto(o, [30, 30, 34], 1);
      if (c.nz > 0.5 || c.nz < -0.5) { const screen = Math.abs(c.e) < 0.8 && c.rb > c.px * 2 && c.rt > c.px * 2; if (screen && c.nz < 0) shadeInto(o, [70, 120, 170], 1.1); }
      return;
    }
    if (p === 'backpack' || p === 'packPocket' || p === 'randoseru') {
      const A = acc('backpack') || acc('randoseru');
      const rs = A.kind === 'randoseru';
      shadeInto(o, A.col, (rs ? leatherK() * 1.05 : fabricK(c, 'nylon')) * (c.kind === 'top' ? 1.02 : c.kind === 'bot' ? 0.6 : 0.88 + 0.1 * (1 - c.e * c.e)));
      if (rs) {
        // the big flap over the back with a metal clasp
        if (back(c) && c.rb > c.rh * 0.25) { shadeInto(o, mixT(A.col, [255, 255, 255], 0.06), leatherK() * 1.04); if (Math.abs(c.rb - c.rh * 0.25) < c.px) over(o, INK, 0.4); }
        if (back(c) && Math.abs(c.e) < 0.12 && Math.abs(c.rb - c.rh * 0.3) < 0.012) shadeInto(o, GOLD, 1);
        if (c.kind === 'top') over(o, C_255_255_255, 0.15);
      } else {
        if (edge(1)) over(o, INK, 0.3);
        if (p === 'backpack' && back(c) && c.rt < 0.012 && c.rt > 0.006) shadeInto(o, SILVER, 0.8);
      }
      if (c.kind === 'side' && Math.abs(c.nx) > 0.5 && Math.abs(c.e) < 0.08) over(o, INK, 0.25);
      return;
    }
    if (p === 'poster') { shadeInto(o, [236, 230, 214], 0.95); if (c.kind === 'top') shadeInto(o, [220, 100, 120], 1); if (Math.abs(c.e) < 0.2) shadeInto(o, [220, 100, 140], 0.9); return; }
    if (p === 'cane' && c.tube) {
      // varnished wood: grain streaks along, a brass ferrule and a black rubber foot at the bottom
      const A = acc('cane'), along = c.lt * c.rh;
      if (c.y < 0.04) { shadeInto(o, [36, 32, 32], (0.8 + 0.25 * clamp01(c.ny + 0.5)) * ((c.j % 3) ? 1 : 0.85)); return; }
      if (c.y < 0.05) { shadeInto(o, [180, 146, 82], 0.8 + 0.4 * Math.max(0, c.nz * 0.5 + c.nx * 0.5)); return; }
      const g = vnoise(c.i * 1.2, along * 90, 61);
      shadeInto(o, A.col, (0.74 + 0.3 * g + (h2(c.i, c.j, 62) - 0.5) * 0.05) * (0.85 + 0.25 * clamp01(c.nz * 0.5 + 0.5)));
      if (c.nz > 0.5 && g > 0.4) over(o, [255, 236, 200], 0.18 * c.nz);
      return;
    }
    if (p === 'cane' || p === 'caneTop') { const A = acc('cane'); shadeInto(o, A.col, fabricK(c, 'leather') * (0.8 + 0.25 * (1 - c.e * c.e))); if (c.rb < 0.015 && p === 'cane') shadeInto(o, [30, 26, 24], 1); return; }
    if ((p === 'towel' || p === 'towelEnd') && c.tube) {
      // terry cloth: loops in a fine grid, soft folds, a blue stripe near the ends
      const loop = ((c.i + (c.j & 1)) & 1) ? 1.04 : 0.95;
      shadeInto(o, WHITE, (0.8 + 0.2 * clamp01(c.ny * 0.5 + c.nz * 0.4 + 0.5)) * loop * crease(c.x * 5, c.y + c.x, 12, 120, 0.12, 71) * (1 + (vnoise(c.i * 0.4, c.j * 0.4, 72) - 0.5) * 0.06));
      if (p === 'towelEnd' && c.lt > 0.82 && c.lt < 0.9) shadeInto(o, C_60_90_160, 0.9 * loop);
      if (p === 'towelEnd' && c.lt > 0.97) over(o, INK, 0.15);
      return;
    }
    if (p === 'towel' || p === 'towelEnd') { shadeInto(o, WHITE, (0.88 + 0.12 * h2(c.i, c.j, 9)) * (c.kind === 'bot' ? 0.6 : 1) * fold(c, 0.1, 400, 0, c.x + c.z)); if (Math.abs(c.rb - 0.008) < c.px && p === 'towelEnd') over(o, C_60_90_160, 0.6); return; }
    if (p === 'pouch') { shadeInto(o, acc('pouch').col, leatherK()); if (edge(1)) over(o, INK, 0.35); if (front(c) && Math.abs(c.rt - 0.015) < c.px) over(o, INK, 0.4); return; }
    if (p === 'parcel') {
      shadeInto(o, [196, 156, 104], fabricK(c, 'cotton') * (c.kind === 'top' ? 1.05 : 0.92));
      if (c.kind === 'top' && Math.abs(c.x) < 0.025) shadeInto(o, [214, 190, 140], 1);
      if (c.kind === 'side' && Math.abs(c.e) < 0.12 && c.rt < 0.04) shadeInto(o, [214, 190, 140], 1);
      if (edge(1)) over(o, C_120_90_60, 0.4);
      return;
    }
    shadeInto(o, [200, 0, 200], 1);
  }

  return { body: bodyPx, collar: collarTubePx, skin: neckPx, hand: handPx, shoe: shoePx, head: headPx, ear: earPx, nose: nosePx, hair: (c, o) => (c.tube ? HP.hairTube(c, o) : hairShellPx(c, o)), hat: (c, o) => (c.tube ? HP.hatTube(c, o) : hatPx(c, o)), hat2: hat2Px, acc: accPx };
}
