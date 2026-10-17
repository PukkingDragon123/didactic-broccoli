// Museum visitors — jointed chibi voxel characters (see docs/VOXEL_GUIDE.md "Characters").
// Every character is modelled standing (arms down, feet on y=0, facing +z, centred on x=0) and each
// voxel goes into one of six part models: head, torso, armL (-x), armR (+x), legL (-x), legR (+x).
// Arms swing about the shoulder joint, legs about the hip joint (rotation about x), the head turns
// about the neck. The torso always reaches a couple of rows below the hip pivot so swinging legs
// never open a gap, and arm/leg tops are rounded around their pivots. Anything held in a hand lives
// in that arm's part; straps, backpacks and carriers live in the torso; hats and glasses in the head.
import { C, shade, mix } from '../voxel/palette.js';
import { gloss, metal, glow, glass } from '../voxel/VoxelModel.js';

const K = C.ink;
const WH = 0xffffff;

// ----------------------------------------------------------------------------- small utilities
function hash(x, y, z = 0, s = 0) {
  let h = (x * 374761393 + y * 668265263 + z * 1442695041 + s * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const mirror = (rows) => rows.map((r) => [...r].reverse().join(''));

/** Predicate for a box with rounded edges/corners (radius r; ry for the vertical rounding). */
function rtest(x0, y0, z0, x1, y1, z1, r, ry = r) {
  const rx = Math.min(r, (x1 - x0) / 2), rz = Math.min(r, (z1 - z0) / 2), rY = Math.min(ry, (y1 - y0) / 2);
  const e = 0.35;
  return (x, y, z) => {
    if (x < x0 || x > x1 || y < y0 || y > y1 || z < z0 || z > z1) return false;
    const dx = Math.max(0, x0 + rx - x, x - (x1 - rx)) / (rx + e);
    const dy = Math.max(0, y0 + rY - y, y - (y1 - rY)) / (rY + e);
    const dz = Math.max(0, z0 + rz - z, z - (z1 - rz)) / (rz + e);
    return dx * dx + dy * dy + dz * dz <= 1;
  };
}
function rbox(v, x0, y0, z0, x1, y1, z1, r, c, ry = r) {
  return v.shape(x0, y0, z0, x1, y1, z1, rtest(x0, y0, z0, x1, y1, z1, r, ry), c);
}
/** Run fn(sign) for the left (-1, -x) and right (+1, +x) side. */
const sides = (fn) => { fn(-1); fn(1); };

// ----------------------------------------------------------------------------- body frame + rig
/**
 * Body proportions in voxels. Adults are ~47–50 voxels tall, the head (incl. hair) ~1/3 of that.
 * hipY: top row of the legs (hip pivot). pelvis: torso rows that overlap the legs below the pivot.
 * shY: top row of the torso/arms (shoulder line). lean: forward stoop (z shift of shoulders/head).
 */
function frame(o = {}) {
  const f = {
    hipY: 16, pelvis: 2, legIn: 1, legOut: 4, lz0: -1, lz1: 1,
    shY: 29, tw: 4, tz0: -2, tz1: 2,
    armIn: 5, armOut: 7, az0: -1, az1: 1, handY: 14, handH: 3,
    hw: 7, hh: 14, hz0: -6, hz1: 6, hr: 4,
    lean: 0, headFwd: 0, headDrop: 0,
    ...o,
  };
  f.neckY = f.shY + 1;
  f.hy0 = f.shY + 2 - f.headDrop;
  f.hy1 = f.hy0 + f.hh - 1;
  f.ax = Math.round((f.armIn + f.armOut) / 2);
  f.lx = Math.round((f.legIn + f.legOut) / 2);
  f.waistY = o.waistY ?? f.hipY + 2;
  f.eyeY = f.hy0 + (o.eyeRow ?? 5); // reference eye row (4-row eye patterns start one row higher)
  f.fringe = f.eyeY + 3; // default bottom row of the bangs (one free row above the eyes)
  f.pelvisY = f.hipY - f.pelvis; // bottom row of the torso
  return f;
}
function rigOf(f) {
  const hz = f.lean + f.headFwd;
  return {
    neck: [0, f.neckY - f.headDrop, hz], hip: [0, f.hipY, 0],
    shoulderL: [-f.ax, f.shY - 1, f.lean], shoulderR: [f.ax, f.shY - 1, f.lean],
    hipL: [-f.lx, f.hipY, 0], hipR: [f.lx, f.hipY, 0],
  };
}

/** Final pass: apply the stoop (shear the upper torso forward, shift arms/head with it). */
function finish(p, f) {
  if (f.lean) {
    const vox = [];
    p.torso.forEach((x, y, z, c) => vox.push([x, y, z, c]));
    p.torso.map.clear();
    const y0 = f.waistY, y1 = f.shY;
    // shear the lower rows first so the higher (shifted) rows win where they overlap
    vox.sort((a, b) => a[1] - b[1]);
    for (const [x, y, z, c] of vox) {
      const t = clamp01((y - y0) / (y1 - y0));
      p.torso.set(x, y, z + Math.round(f.lean * Math.sqrt(t)), c);
    }
    p.armL.translate(0, 0, f.lean);
    p.armR.translate(0, 0, f.lean);
  }
  if (f.lean || f.headFwd) p.head.translate(0, 0, f.lean + f.headFwd);
}

// ----------------------------------------------------------------------------- legs + shoes
/**
 * o: skin, pants (colour|null), pantsY (lowest pants row), hem, crease, socks, sockY (top sock row),
 *    sockLoose, shoe ('sneaker' | 'loafer' | 'pump' | 'platform' | 'boot' | 'sandal' | 'flat'),
 *    shoeC, soleC, accent, lace, bootY, col(x,y,z,c,s) per-voxel override.
 */
function legs(p, f, o) {
  const skin = o.skin ?? C.skin;
  const H = shoeHeight(o);
  sides((s) => {
    const m = s < 0 ? p.legL : p.legR;
    const xa = s < 0 ? -f.legOut : f.legIn, xb = s < 0 ? -f.legIn : f.legOut;
    const xo = s < 0 ? xa : xb, xi = s < 0 ? xb : xa, xm = s * f.lx;
    for (let y = H; y <= f.hipY; y++) for (let x = xa; x <= xb; x++) for (let z = f.lz0; z <= f.lz1; z++) {
      if (y >= f.pelvisY && x === xo) continue; // tucked inside the torso: no coincident faces
      let c;
      if (o.bootY && y <= o.bootY) {
        c = gloss(y === o.bootY ? shade(o.shoeC, 1.12) : o.shoeC);
      } else if (o.pants && y >= (o.pantsY ?? H)) {
        c = o.pants;
        if (o.hem && y === (o.pantsY ?? H)) c = shade(c, 0.84);
        if (o.crease && z === f.lz1 && x === xm && y < f.pelvisY) c = shade(c, 1.1);
        if (x === xi) c = shade(c, 0.93);
        if (o.knee && y === Math.round((f.hipY + H) / 2) && z === f.lz1 && x !== xi && hash(x, y, z, 1) < 0.6) c = shade(c, 0.88);
      } else if (o.socks && y <= o.sockY) {
        c = y === o.sockY ? shade(o.socks, 0.9) : o.socks;
        if (o.sockStripe && y === o.sockY - 1) c = o.sockStripe;
      } else {
        c = skin;
        if (x === xi) c = shade(skin, 0.96);
      }
      if (o.col) c = o.col(x, y, z, c, s) ?? c;
      m.set(x, y, z, c);
    }
    if (o.sockLoose) { // baggy loose socks bunch around the shins
      for (let y = H; y <= H + 3; y++) {
        for (let x = xa - 1; x <= xb + 1; x++) for (let z = f.lz0 - 1; z <= f.lz1 + 1; z++) {
          const edgeX = x < xa || x > xb, edgeZ = z < f.lz0 || z > f.lz1;
          if (edgeX === edgeZ) continue;
          if (y === H + 3 && hash(x, y, z, 5) < 0.5) continue;
          m.set(x, y, z, hash(x, y, z, 6) < 0.4 ? shade(o.socks, 0.88) : o.socks);
        }
      }
    }
    if (o.bootY) { // folded boot cuff
      const y = o.bootY;
      for (let x = xa - 1; x <= xb + 1; x++) for (let z = f.lz0 - 1; z <= f.lz1 + 1; z++) {
        const edgeX = x < xa || x > xb, edgeZ = z < f.lz0 || z > f.lz1;
        if (edgeX === edgeZ) continue;
        if (x === xi - s) continue;
        m.set(x, y, z, gloss(o.cuffC ?? shade(o.shoeC, 1.15)));
      }
    }
    shoe(m, f, o, s, xa, xb);
  });
}
function shoeHeight(o) {
  return { platform: 5, sandal: 2 }[o.shoe] ?? 3;
}
function shoe(m, f, o, s, xa, xb) {
  const st = o.shoe ?? 'sneaker';
  const c = o.shoeC ?? C.white;
  const sole = o.soleC ?? shade(c, 0.72);
  const acc = o.accent ?? C.red;
  const skin = o.skin ?? C.skin;
  const z0 = f.lz0, zt = f.lz1 + 2;
  const xo = s < 0 ? xa : xb, xm = s * f.lx;
  const toeCorner = (x, z) => z === zt && x === xo;
  for (let x = xa; x <= xb; x++) for (let z = z0; z <= zt; z++) {
    if (toeCorner(x, z)) continue;
    const front = z === zt, back = z === z0, instep = z === f.lz1 + 1;
    if (st === 'sneaker') {
      m.set(x, 0, z, front || back ? shade(sole, 0.92) : sole);
      m.set(x, 1, z, x === xo && !front && !back ? acc : front ? shade(c, 0.94) : c);
      if (z <= f.lz1 + 1) m.set(x, 2, z, back ? acc : instep ? (x === xm || x === xm - s ? o.lace ?? WH : shade(c, 0.88)) : c);
    } else if (st === 'loafer' || st === 'flat') {
      m.set(x, 0, z, sole);
      m.set(x, 1, z, (st === 'loafer' ? gloss : (q) => q)(front ? shade(c, 1.08) : c));
      if (z <= f.lz1 + 1) m.set(x, 2, z, (st === 'loafer' ? gloss : (q) => q)(instep ? shade(c, 0.75) : c));
    } else if (st === 'pump') {
      if (back || z >= f.lz1) m.set(x, 0, z, gloss(sole)); // heel + ball of the foot
      m.set(x, 1, z, gloss(front ? shade(c, 1.1) : c));
      if (z <= f.lz1 + 1) m.set(x, 2, z, back || instep ? gloss(c) : skin);
    } else if (st === 'platform') {
      const pc = o.platC ?? WH;
      for (let y = 0; y <= 2; y++) m.set(x, y, z, y === 1 ? shade(pc, 0.88) : pc);
      m.set(x, 3, z, gloss(front ? shade(c, 1.1) : c));
      if (z <= f.lz1 + 1) m.set(x, 4, z, gloss(instep ? acc : c));
    } else if (st === 'boot') {
      m.set(x, 0, z, sole);
      m.set(x, 1, z, gloss(front ? shade(c, 1.12) : c));
      if (z <= f.lz1 + 1) m.set(x, 2, z, gloss(c));
    } else if (st === 'sandal') {
      m.set(x, 0, z, sole);
      let u = skin;
      if (z === f.lz1) u = c; // strap across the foot
      if (front) u = (x & 1) ? shade(skin, 0.9) : skin; // toes
      m.set(x, 1, z, u);
    }
  }
}

// ----------------------------------------------------------------------------- torso
/** Base torso block + neck. o.col(x,y,z) -> colour. */
function torso(p, f, o) {
  const t = p.torso;
  for (let y = f.pelvisY; y <= f.shY; y++) for (let x = -f.tw; x <= f.tw; x++) for (let z = f.tz0; z <= f.tz1; z++) {
    const ax = Math.abs(x);
    if (ax === f.tw && (z === f.tz0 || z === f.tz1)) continue;
    t.set(x, y, z, o.col(x, y, z));
  }
  if (o.neck !== false) t.box(-1, f.shY + 1, -1, 1, f.shY + 1, 1, o.neckC ?? shade(o.skin ?? C.skin, 0.92));
}
/** Common outfit colouring: top above waistY, bottom (pants/skirt band) up to waistY, optional belt. */
function outfit(f, { top, bottom, belt = null, folds = true, col = null }) {
  return (x, y, z) => {
    let c;
    if (y <= f.waistY) {
      c = bottom;
      if (belt && y === f.waistY) c = belt;
    } else {
      c = top;
      if (folds && (z === f.tz1 || z === f.tz0) && Math.abs(x) === 2 && y <= f.waistY + 3) c = shade(top, 0.9);
      if (y === f.waistY + 1) c = shade(c, 0.93);
    }
    if (col) c = col(x, y, z, c) ?? c;
    return c;
  };
}
/** Flared skirt in the torso part, from the waist down to row hemY. bell=true for a puffy shape. */
function skirt(p, f, { c, hemY, flare = 2, pleats = true, stripe = null, waist = f.waistY, bell = false, col = null }) {
  const t = p.torso;
  const n = Math.max(1, waist - hemY);
  for (let y = hemY; y <= waist; y++) {
    const k = (waist - y) / n;
    const e = Math.round(0.6 + flare * (bell ? Math.sqrt(k) : k));
    const hx = f.tw + e, z0 = f.tz0 - e, z1 = f.tz1 + e;
    for (let x = -hx; x <= hx; x++) for (let z = z0; z <= z1; z++) {
      const ax = Math.abs(x);
      if (ax === hx && (z === z0 || z === z1)) continue;
      if (ax >= hx - 1 && (z <= z0 + 1 || z >= z1 - 1) && e >= 3 && !(ax === hx - 1 && (z === z0 + 1 || z === z1 - 1))) continue;
      let cc = c;
      if (pleats) {
        const edge = ax >= hx - (e >= 3 ? 1 : 0) ? z : x; // pleats run all around
        if (((edge % 2) + 2) % 2 === 0) cc = shade(c, 0.86);
      }
      if (stripe && y === hemY + 1) cc = stripe;
      if (y === hemY) cc = shade(cc, 0.9);
      if (col) cc = col(x, y, z, cc, e) ?? cc;
      t.set(x, y, z, cc);
    }
  }
}

// ----------------------------------------------------------------------------- arms
/**
 * o: skin, sleeve, sleeveY (lowest sleeve row), cuff, forearm, hand (glove colour), puff (bool),
 *    elbowFold, col(x,y,z,c,s) override.
 */
function arms(p, f, o) {
  const skin = o.skin ?? C.skin;
  sides((s) => {
    const m = s < 0 ? p.armL : p.armR;
    const xa = s < 0 ? -f.armOut : f.armIn, xb = s < 0 ? -f.armIn : f.armOut;
    const xo = s < 0 ? xa : xb, xi = s < 0 ? xb : xa, xm = s * f.ax;
    const zm = Math.round((f.az0 + f.az1) / 2);
    const hTop = f.handY + f.handH - 1;
    const hand = o.hand ?? skin;
    for (let y = f.handY; y <= f.shY; y++) for (let x = xa; x <= xb; x++) for (let z = f.az0; z <= f.az1; z++) {
      if (y === f.shY && x === xo) continue; // sloped shoulder
      if (y === f.shY && (z === f.az0 || z === f.az1) && x !== xm) continue;
      if (y === f.handY && x !== xm && z !== zm) continue; // rounded fist
      let c;
      if (y <= hTop) c = y === f.handY ? shade(hand, 0.94) : hand;
      else if (y >= o.sleeveY) {
        c = o.sleeve;
        if (y === o.sleeveY && o.cuff) c = o.cuff;
        if (o.elbowFold && y === Math.round((f.shY + f.handY) / 2) + 1 && z !== zm && x === xm) c = shade(c, 0.88);
        if (x === xi) c = shade(c, 0.95);
      } else c = o.forearm ?? skin;
      if (o.col) c = o.col(x, y, z, c, s) ?? c;
      m.set(x, y, z, c);
    }
    m.set(xi, hTop - 1, f.az1 + 1, hand); // thumb
    if (o.puff) { // puffy short sleeve: a ring around the upper arm
      const pc = o.sleeve;
      for (let y = o.sleeveY; y <= f.shY - 1; y++) for (let x = xa - 1; x <= xb + 1; x++) for (let z = f.az0 - 1; z <= f.az1 + 1; z++) {
        const exo = x === xo + s, exi = x === xi - s, ez = z < f.az0 || z > f.az1;
        if (exi || (exo && ez)) continue;
        if (!exo && !ez) continue;
        if (y === f.shY - 1 && (ez && exo)) continue;
        m.set(x, y, z, y === o.sleeveY ? (o.cuff ?? shade(pc, 0.9)) : (y === f.shY - 1 ? shade(pc, 1.05) : pc));
      }
    }
  });
}

// ----------------------------------------------------------------------------- head, face, hair
const EYES = {
  // right-eye patterns: columns go inner -> outer, rows top -> bottom. The left eye is mirrored,
  // except highlight pixels (W/w) which keep their screen side so both eyes catch the same light.
  round: { rows: ['KK', 'WK', 'KK', 'II'], oy: 1 },
  lash: { rows: ['KKL', 'WK.', 'KK.', 'II.'], oy: 1 },
  big: { rows: ['KKKL', 'WKK.', 'KKw.', 'III.'], ox: -1, oy: 1 },
  sparkle: { rows: ['KKKL', 'WIK.', 'IIw.', 'iii.'], ox: -1, oy: 1 },
  tired: { rows: ['DD.', 'KKK', 'WK.', 'SS.'], oy: 1 },
  happy: { rows: ['.K.', 'K.K'], ox: -1, oy: 0 },
  calm: { rows: ['KKK', '.I.'], ox: -1, oy: 0 },
  dot: { rows: ['K', 'K'], ox: 0, oy: 0 },
  small: { rows: ['WK', 'KK'], oy: 0 },
  sleepy: { rows: ['KK'], oy: -1 },
  gyaru: { rows: ['KKKL', 'KWIK', 'KIwK', '.LL.'], ox: -1, oy: 1 },
};
const MOUTHS = {
  smile: ['M.M', '.M.'],
  grin: ['MMM', '.T.'],
  open: ['MMM', 'MTM'],
  cat: ['M.M.M', '.M.M.'],
  flat: ['MM'],
  dot: ['M'],
  o: ['.M.', 'M.M', '.M.'],
  smirk: ['..M', 'MM.'],
  lips: ['PPP'],
  tiny: ['M'],
  sigh: ['.MM', 'M..'],
  wide: ['M...M', '.MMM.'],
  wavy: ['.M.M.', 'M.M.M'],
};

/**
 * o: skin, eyes (style), iris, lash, eyeX (inner column of the right eye), mouth, blush (colour|false),
 *    brows (colour|false), browDY, browShape, nose (bool), mouthC, freckles
 */
function face(h, f, o) {
  const skin = o.skin ?? C.skin;
  const iris = o.iris ?? 0x5b3424;
  const L = {
    K: o.eyeC ?? K, W: WH, w: mix(iris, WH, 0.6), I: iris, i: shade(iris, 1.45), L: o.lash ?? K,
    D: shade(skin, 0.82), S: mix(shade(skin, 0.86), 0x8a6aa8, 0.18),
    M: o.mouthC ?? 0x8a3b3b, T: C.tongue, P: o.lipC ?? 0xff8fa8, B: o.blush || C.blush,
  };
  const ex = o.eyeX ?? 3;
  const ey = f.eyeY + (o.eyeDY ?? 0);
  const e = EYES[o.eyes ?? 'round'];
  const rowsR = e.rows, rowsL = rowsR.map((r) => {
    const a = [...r].reverse();
    [...r].forEach((ch, i) => { if (ch === 'W' || ch === 'w') { const j = a.length - 1 - i; [a[i], a[j]] = [a[j], a[i]]; } });
    return a.join('');
  });
  const w = rowsR[0].length;
  const ox = e.ox ?? 0, oy = e.oy ?? 0;
  if (o.blush !== false) {
    const bw = o.blushW ?? 2;
    h.project(['B'.repeat(bw)], L, ex + 1, ey - 3 + (o.blushDY ?? 0));
    h.project(['B'.repeat(bw)], L, -ex - bw, ey - 3 + (o.blushDY ?? 0));
  }
  h.project(rowsR, L, ex + ox, ey + oy);
  h.project(rowsL, L, -ex - ox - w + 1, ey + oy);
  if (o.brows) {
    const by = ey + 3 + (o.browDY ?? 0);
    const bc = { B: o.brows };
    const br = o.browShape ?? ['BB'];
    h.project(br, bc, ex, by);
    h.project(mirror(br), bc, -ex - br[0].length + 1, by);
  }
  if (o.nose) h.project(['D'], L, 0, ey - 1);
  if (o.freckles) {
    h.project(['D.D'], L, ex, ey - 3);
    h.project(['D.D'], L, -ex - 2, ey - 3);
  }
  const m = MOUTHS[o.mouth ?? 'smile'];
  const mw = m[0].length;
  h.project(m, L, -Math.floor(mw / 2), f.hy0 + 2 + (m.length >= 3 ? 1 : 0) + (o.mouthDY ?? 0));
}

/** Skull, ears, face. Hair/hats are added by the caller. */
function head(p, f, o) {
  const h = p.head;
  const skin = o.skin ?? C.skin;
  rbox(h, -f.hw, f.hy0, f.hz0, f.hw, f.hy1, f.hz1, f.hr, (x, y, z) => (y <= f.hy0 + 1 && z < 3 ? shade(skin, 0.94) : skin));
  if (o.ears !== false) {
    sides((s) => {
      h.box(s * (f.hw + 1), f.eyeY - 3, -1, s * (f.hw + 1), f.eyeY - 1, 0, skin);
      h.set(s * (f.hw + 1), f.eyeY - 2, 0, shade(skin, 0.86));
    });
  }
  face(h, f, o);
  return h;
}

/**
 * Hair cap: a shell around the skull, kept where y >= bottom(x, z).
 * z: { bangs(x) -> y, side, ear, back, vol (shell thickness), top (extra height), curl (0..1 bumpy) }
 */
function hairCap(h, f, hc, z) {
  const vol = z.vol ?? 1, top = z.top ?? vol;
  const skull = rtest(-f.hw, f.hy0, f.hz0, f.hw, f.hy1, f.hz1, f.hr);
  const outer = rtest(-f.hw - vol, f.hy0 - 3, f.hz0 - vol, f.hw + vol, f.hy1 + top, f.hz1 + 1, f.hr + vol, f.hr + Math.min(vol, top));
  const inner = vol > 1 ? rtest(-f.hw - vol + 1, f.hy0 - 3, f.hz0 - vol + 1, f.hw + vol - 1, f.hy1 + top - 1, f.hz1 + 1, f.hr + vol - 1, f.hr + vol) : null;
  const bot = (x, zz) => {
    const ax = Math.abs(x);
    if (zz >= 1 && ax <= f.hw - 2) return z.bangs(x); // face side: fringe line
    if (zz >= 1) return z.side ?? z.ear; // temples / side locks
    if (zz >= -2 && ax >= f.hw - 1) return z.ear; // over the ears
    return z.back;
  };
  const col = z.col ?? hairColor(f, hc, z);
  h.shape(-f.hw - vol, f.hy0 - 3, f.hz0 - vol, f.hw + vol, f.hy1 + top, f.hz1 + 1, (x, y, zz) => {
    if (!outer(x, y, zz) || skull(x, y, zz) || y < bot(x, zz)) return false;
    if (y < f.hy0 + 1 && zz > -3 && Math.abs(x) < f.hw - 1) return false; // nothing under the jaw
    if (z.curl && inner && !inner(x, y, zz) && hash(x, y, zz, 21) < z.curl) return false; // bumpy perm
    if (z.skip && z.skip(x, y, zz)) return false;
    return true;
  }, col);
  // the skull under the hair gets a darker hair colour (no skin peeking through diagonal gaps)
  h.paint(() => h.shape(-f.hw, f.hy0, f.hz0, f.hw, f.hy1, f.hz1, (x, y, zz) => skull(x, y, zz) && y >= bot(x, zz), shade(hc, 0.7)));
  return bot;
}
function hairColor(f, hc, z = {}) {
  const lum = ((hc >> 16) & 255) * 0.3 + ((hc >> 8) & 255) * 0.59 + (hc & 255) * 0.11;
  const hi = z.hi ?? (lum < 90 ? mix(hc, 0x8c96c0, 0.22) : mix(hc, WH, 0.3));
  const dk = shade(hc, 0.8);
  return (x, y, zz) => {
    let c = hc;
    const strand = hash(x, 0, zz > 0 ? 1 : zz, 11);
    if (strand < 0.3) c = shade(hc, 0.9);
    else if (strand > 0.85) c = shade(hc, 1.08);
    if (z.curl && hash(x, y, zz, 23) < 0.35) c = shade(hc, 0.88);
    if (y < f.hy0 + 4) c = mix(c, dk, 0.5);
    // glossy "angel ring" highlight: two short arcs on the front of the crown and one on the back
    const ax = Math.abs(x), ring = f.hy1 + (z.ringDY ?? 0);
    if (z.ring !== false) {
      if (zz >= f.hz1 - 2 && ax >= 2 && ax <= 4 && y === ring - (ax >= 4 ? 1 : 0)) c = hi;
      else if (zz <= f.hz0 && ax <= 3 && y === ring - 2 && hash(x, 2, zz, 4) < 0.8) c = hi;
    }
    return c;
  };
}
/** Jagged bangs helper: base row + per-|x| offsets (offs[0] = centre column). */
const bangsFrom = (base, offs) => (x) => base + (offs[Math.min(Math.abs(x), offs.length - 1)] ?? 0);
/** Asymmetric bangs helper: offs indexed by x + 8. */
const bangsAsym = (base, offs) => (x) => base + (offs[Math.max(0, Math.min(offs.length - 1, x + 8))] ?? 0);

/** Long hair curtain hanging down the back (head part). */
function hairBack(h, f, hc, { bottom, width = f.hw, z0 = f.hz0 - 1, z1 = -3, top = f.hy0 + 4, taper = 2, flare = 0, wave = 0, col = null }) {
  const cfn = col ?? hairColor(f, hc, { ring: false });
  for (let y = bottom; y <= top; y++) {
    const t = (top - y) / Math.max(1, top - bottom);
    const hwid = Math.round(width + 1 - taper * t + flare * Math.sin(t * Math.PI));
    const zb = Math.round(z0 + t * 1.5 + (wave ? Math.sin(y * 0.9) * wave : 0)), zf = y >= f.hy0 ? Math.min(z1, -1) : z1;
    for (let x = -hwid; x <= hwid; x++) {
      const ends = bottom + (hash(x, 0, 0, 9) < 0.45 ? 1 : 0) + (Math.abs(x) === hwid ? 1 : 0) + (Math.abs(x) <= 1 ? 0 : 0);
      if (y < ends) continue;
      for (let z = zb; z <= zf; z++) {
        if (Math.abs(x) === hwid && (z === zb || z === zf)) continue;
        if (!h.has(x, y, z)) h.set(x, y, z, cfn(x, y, z));
      }
    }
  }
}
/** Hanging tail of hair (twin-tails / ponytails) as a chain of ellipsoids. */
function hairTail(h, f, hc, x, y, z, len, r, { dx = 0, dz = 0, tie = null, curl = 0 } = {}) {
  const cfn = hairColor(f, hc, { ring: false });
  for (let i = 0; i <= len; i++) {
    const t = i / len;
    const rr = r * (t < 0.2 ? 0.75 + t * 1.25 : 1.05 - 0.8 * t * t);
    const cx = x + dx * Math.sin(t * Math.PI * 0.8) + (curl ? Math.sin(t * 9) * curl : 0), cz = z + dz * t;
    h.ellipsoid(cx, y - i, cz, rr, 1.1, rr, (xx, yy, zz) => cfn(xx, yy, zz));
  }
  if (tie) h.ellipsoid(x, y + 1, z, r * 0.75, 0.7, r * 0.75, tie);
}
/** Hair bun (sphere) with a highlight. */
function hairBun(h, f, hc, x, y, z, r) {
  const cfn = hairColor(f, hc, { ring: false });
  h.sphere(x, y, z, r, (xx, yy, zz) => (yy > y + r * 0.4 && hash(xx, yy, zz, 3) < 0.4 ? mix(hc, WH, 0.25) : cfn(xx, yy, zz)));
}

// ----------------------------------------------------------------------------- head accessories
/** Glasses: raised frame around both eyes + temples to the ears. */
function glasses(h, f, o = {}) {
  const fc = o.c ?? 0x2a2a30, ex = o.eyeX ?? 3, ey = f.eyeY + 1 + (o.eyeDY ?? 0);
  const z = o.z ?? f.hz1 + 1;
  sides((s) => {
    const xa = s < 0 ? -ex - 3 : ex - 1, xb = s < 0 ? -ex + 1 : ex + 3;
    for (let x = xa; x <= xb; x++) for (let y = ey - 4; y <= ey + 1; y++) {
      const edge = x === xa || x === xb || y === ey - 4 || y === ey + 1;
      if (!edge) {
        if (o.lens) h.set(x, y, z, o.lens);
        continue;
      }
      if (o.round && (x === xa || x === xb) && (y === ey - 4 || y === ey + 1)) continue;
      h.set(x, y, z, fc);
    }
    // temple arm back to the ear
    if (o.arms !== false) for (let zz = -1; zz <= f.hz1 - 1; zz++) {
      const x = s * (f.hw + 1);
      if (zz >= f.hz1 - 2) h.set(s * (f.hw), ey, zz + 1, fc);
      else h.set(x, ey, zz, fc);
    }
  });
  for (let x = -ex + 2; x <= ex - 2; x++) h.set(x, ey, z, fc); // bridge
}

/** Hats sit on top of the hair (overwriting it). type: 'cap' | 'school' | 'sun' | 'flat' | 'bucket'. */
function hat(h, f, type, o = {}) {
  const c = o.c, yb = o.y ?? f.eyeY + 4;
  const hw = f.hw, hz0 = f.hz0, hz1 = f.hz1;
  const col = (x, y, z) => {
    let cc = c;
    if (o.tweed) cc = hash(x, y, z, 31) < 0.35 ? shade(c, 0.86) : hash(x, y, z, 32) < 0.2 ? shade(c, 1.12) : c;
    if (y === yb) cc = shade(cc, 0.92);
    return o.col ? (o.col(x, y, z, cc) ?? cc) : cc;
  };
  if (type === 'cap' || type === 'school') {
    const dome = rtest(-hw - 2, yb - 8, hz0 - 2, hw + 2, f.hy1 + 3, hz1 + 2, f.hr + 2, 5);
    h.shape(-hw - 2, yb, hz0 - 2, hw + 2, f.hy1 + 3, hz1 + 2, dome, col);
    // panel seams
    h.paint(() => {
      for (let y = yb + 1; y <= f.hy1 + 3; y++) { h.set(0, y, hz1 + 2, shade(c, 0.85)); h.set(0, y, hz0 - 2, shade(c, 0.85)); }
    });
    h.set(0, f.hy1 + 4, 0, shade(c, 0.85)); // button
    if (type === 'cap') {
      for (let z = hz1 + 2; z <= hz1 + 5; z++) for (let x = -5; x <= 5; x++) {
        if (z === hz1 + 5 && Math.abs(x) >= 4) continue;
        if (z === hz1 + 4 && Math.abs(x) === 5) continue;
        h.set(x, yb, z, o.brim ?? shade(c, 0.9));
      }
      if (o.logo) h.project(['.L.', 'L.L', '.L.'], { L: o.logo }, -1, yb + 4, '+z');
    } else {
      // rolled brim all around + elastic chin strap
      const ring = rtest(-hw - 3, yb - 8, hz0 - 3, hw + 3, yb + 8, hz1 + 3, f.hr + 3);
      h.shape(-hw - 3, yb, hz0 - 3, hw + 3, yb, hz1 + 3, (x, y, z) => ring(x, y, z) && !dome(x, y, z), shade(c, 0.95));
      for (let x = -4; x <= 4; x++) h.set(x, yb, hz1 + 3 + (Math.abs(x) <= 2 ? 1 : 0), shade(c, 0.95));
      if (o.band) h.paint(() => h.shape(-hw - 2, yb + 1, hz0 - 2, hw + 2, yb + 1, hz1 + 2, () => true, o.band));
      sides((sx) => {
        for (let y = f.hy0 + 1; y < yb; y++) h.set(sx * (hw + 1), y, 1, 0x3a3436);
      });
    }
  } else if (type === 'sun' || type === 'bucket') {
    const R = type === 'sun' ? hw + 5 : hw + 3;
    const crown = rtest(-hw - 1, yb - 8, hz0 - 1, hw + 1, f.hy1 + 3, hz1 + 1, f.hr + 1, 3);
    h.shape(-hw - 1, yb + 1, hz0 - 1, hw + 1, f.hy1 + 3, hz1 + 1, crown, col);
    // brim (slightly drooping at the rim)
    h.shape(-R, yb - 1, -R, R, yb, R, (x, y, z) => {
      const d = Math.sqrt(x * x * 0.85 + z * z);
      if (d > R + 0.3) return false;
      if (y === yb - 1) return type === 'bucket' ? d > R - 1.5 : d > R - 1.2 && z < 2;
      return type === 'bucket' ? d <= R - 1 : !(d > R - 1.2 && z < 2);
    }, (x, y, z) => (y < yb ? shade(c, 0.9) : (Math.round(Math.sqrt(x * x + z * z)) % 2 ? c : shade(c, 0.95))));
    if (o.band) h.paint(() => h.shape(-hw - 1, yb + 1, hz0 - 1, hw + 1, yb + 2, hz1 + 1, () => true, o.band));
    if (o.bow) { h.box(hw + 2, yb + 1, 1, hw + 2, yb + 2, 3, o.bow); h.set(hw + 2, yb, 3, o.bow); }
  } else if (type === 'flat') {
    const top = f.hy1 + 1;
    const capT = rtest(-hw - 1, yb - 8, hz0 - 1, hw + 1, top, hz1 + 1, f.hr + 1, 2);
    h.shape(-hw - 1, yb, hz0 - 1, hw + 1, top, hz1 + 1, capT, col);
    // the flat top slopes forward and overhangs the bill
    for (let y = yb + 1; y <= top - 1; y++) {
      const zf = hz1 + 1 + Math.min(2, top - y);
      for (let x = -hw + 1 + (top - y > 2 ? 0 : 1); x <= hw - 1 - (top - y > 2 ? 0 : 1); x++) for (let z = hz1 - 1; z <= zf; z++) h.set(x, y, z, col(x, y, z));
    }
    for (let z = hz1 + 2; z <= hz1 + 4; z++) for (let x = -5; x <= 5; x++) {
      if (z === hz1 + 4 && Math.abs(x) >= 4) continue;
      h.set(x, yb, z, shade(c, 0.8));
    }
    h.set(0, top + 1, 0, shade(c, 0.8)); // button
  }
}
/** Headband: recolours the hair around the head at rows y..y+th-1 (flush, so it never reads as a brim). */
function headband(h, f, y, c, th = 2) {
  const skull = rtest(-f.hw, f.hy0, f.hz0, f.hw, f.hy1, f.hz1, f.hr);
  h.paint(() => h.shape(-f.hw - 3, y, f.hz0 - 3, f.hw + 3, y + th - 1, f.hz1 + 3, (x, yy, z) => !skull(x, yy, z), (x, yy, z) => (yy === y ? shade(c, 0.92) : c)));
}

// ----------------------------------------------------------------------------- carried things
/** Rectangular bag hanging from the fist of arm side s. Returns its extents. */
function handBag(m, f, s, o) {
  const xm = s * f.ax, hw = o.thick ?? 1;
  const top = f.handY - 1 - (o.drop ?? 1), H = o.h ?? 8, len = o.len ?? 9;
  const z0 = -Math.floor(len / 2) + (o.dz ?? 0), z1 = z0 + len - 1;
  const c = o.c;
  const bot = top - H + 1;
  for (let y = bot; y <= top; y++) for (let z = z0; z <= z1; z++) for (let x = xm - hw; x <= xm + hw; x++) {
    if ((z === z0 || z === z1) && (y === top || y === bot) && o.round !== false) continue;
    if (o.open && y === top && Math.abs(x - xm) < hw && z > z0 && z < z1) continue; // open top (paper bags)
    let cc = c;
    if (y === top) cc = shade(c, 1.06);
    if (y === bot) cc = shade(c, 0.85);
    if (o.col) cc = o.col(x, y, z, cc, { xm, top, bot, z0, z1 }) ?? cc;
    m.set(x, y, z, cc);
  }
  // handle loop from the fist down to the bag
  const hc = o.handle ?? shade(c, 0.8);
  const hz = o.handleZ ?? 1;
  for (let y = top + 1; y <= f.handY; y++) { m.set(xm, y, -hz, hc); m.set(xm, y, hz, hc); }
  return { top, z0, z1, bot, xm };
}

/** Backpack on the torso (behind) with shoulder straps. */
function backpack(p, f, o) {
  const t = p.torso;
  const c = o.c, dk = shade(c, 0.8);
  const top = o.top ?? f.shY - 1, bot = o.bottom ?? f.waistY;
  const hw = o.hw ?? f.tw - 1, z1 = f.tz0 - 1, z0 = z1 - (o.depth ?? 3) + 1;
  rbox(t, -hw, bot, z0, hw, top, z1, o.r ?? 1, (x, y, z) => {
    if (y === bot) return dk;
    if (o.col) return o.col(x, y, z, c) ?? c;
    return c;
  });
  if (o.pocket) rbox(t, -hw + 1, bot + 1, z0 - 1, hw - 1, bot + (o.pocketH ?? 3), z0 - 1, 0, o.pocket);
  if (o.zip) for (let x = -hw + 1; x <= hw - 1; x++) t.set(x, top, z0 + 1, o.zip);
  // straps over the shoulders and down the front
  const sc = o.strap ?? dk;
  sides((s) => {
    const x = s * (f.tw - 1);
    for (let z = f.tz0; z <= f.tz1; z++) t.set(x, f.shY + 1, z, sc);
    t.set(x, f.shY + 1, z1, sc);
    for (let y = f.waistY + 2; y <= f.shY; y++) t.set(x, y, f.tz1 + 1, sc);
    t.set(x, f.waistY + 2, f.tz1 + 1, shade(sc, 0.8));
  });
  return { z0, z1, top, bot, hw };
}

/** Diagonal strap across the torso from one shoulder to the opposite hip (front + back). */
function sash(p, f, c, s = 1, { y0 = f.waistY, front = true, back = true } = {}) {
  const t = p.torso;
  for (let y = y0; y <= f.shY + 1; y++) {
    const k = (y - y0) / (f.shY + 1 - y0);
    const x = Math.round(-s * (f.tw - 1) + s * (2 * f.tw - 2) * k);
    if (front) t.set(x, y, f.tz1 + 1, c);
    if (back) t.set(x, y, f.tz0 - 1, c);
  }
  for (let z = f.tz0 - 1; z <= f.tz1 + 1; z++) t.set(s * (f.tw - 1), f.shY + 1, z, c);
}

/** Small capsule-toy charm hanging from (x, y, z). */
function charm(m, x, y, z, c1, c2 = WH) {
  m.set(x, y, z, metal(C.silver));
  m.set(x, y - 1, z, c1).set(x, y - 2, z, c2);
}

// ----------------------------------------------------------------------------- colour sets
const SKINS = { fair: 0xffe2cc, light: 0xffd9bf, warm: 0xf6c8a2, tan: 0xd99a68, deep: 0xb07a52, dark: 0x8a5a3c };
const HAIR = {
  black: 0x2a2228, darkbrown: 0x4a3024, brown: 0x7a4a2e, chestnut: 0x8e5636, blonde: 0xf2d38a,
  bleach: 0xf8e2a8, grey: 0xb8b4b4, white: 0xeeeae6, lavender: 0xc9b6e4, pink: 0xff9ec4, blue: 0x7cc0f0,
  ginger: 0xd9773a, ash: 0x9a9898, caramel: 0xc98a4a, rose: 0xf4b0b0,
};

// ============================================================================ frames
const F_GIRL = frame({ hipY: 16, shY: 29 });
const F_BOY = frame({ hipY: 17, shY: 30 });
const F_MAN = frame({ hipY: 17, shY: 31 });
const F_KID = frame({ hipY: 9, legIn: 1, legOut: 3, shY: 19, tw: 3, tz0: -2, tz1: 1, armIn: 4, armOut: 6, handY: 8, hw: 6, hh: 12, hz0: -5, hz1: 5, hr: 4, waistY: 11 });
const F_GRANDMA = frame({ hipY: 13, shY: 26, lean: 2, headFwd: 1, headDrop: 1, waistY: 15, handY: 12 });
const F_GRANDPA = frame({ hipY: 16, shY: 29, lean: 1, headFwd: 1 });

// ============================================================================ characters
export default {
  // ------------------------------------------------------------------------ schoolgirl
  schoolgirl: {
    name: 'Schoolgirl', voxel: 0.032, variants: 3, rig: rigOf(F_GIRL),
    build(p, v) {
      const f = F_GIRL;
      const V = [
        { skin: SKINS.light, hair: HAIR.black, style: 'hime', collar: C.navy, scarf: C.red, skirt: C.navy, socks: 0x2a2a34, sockY: 7, bag: 'hand', iris: 0x4a2a1c },
        { skin: SKINS.fair, hair: HAIR.chestnut, style: 'twin', collar: C.navy, scarf: 0xe8506a, skirt: 0x5a6274, socks: WH, sockY: 6, bag: 'pack', tie: C.pink, iris: 0x7a4a2a },
        { skin: SKINS.warm, hair: HAIR.darkbrown, style: 'bob', collar: 0x6a9ad0, scarf: C.navy, skirt: 0x3c5a8a, socks: WH, sockY: 8, bag: 'handL', iris: 0x3a5a8a },
      ][v];
      const top = WH;
      const t = p.torso;
      legs(p, f, { skin: V.skin, socks: V.socks, sockY: V.sockY, shoe: 'loafer', shoeC: 0x6a3a22, soleC: 0x2a1a14 });
      torso(p, f, { skin: V.skin, col: outfit(f, { top, bottom: V.skirt }) });
      skirt(p, f, { c: V.skirt, hemY: 10, flare: 2 });
      arms(p, f, { skin: V.skin, sleeve: top, sleeveY: f.handY + 3, cuff: V.collar, elbowFold: true,
        col: (x, y, z, c) => (y === f.handY + 4 ? WH : y === f.handY + 5 ? V.collar : null) });
      // sailor collar: square flap on the back with a white stripe
      for (let y = f.shY - 6; y <= f.shY; y++) for (let x = -f.tw; x <= f.tw; x++) {
        const edge = y === f.shY - 6 || Math.abs(x) === f.tw;
        const stripe = !edge && (y === f.shY - 5 || Math.abs(x) === f.tw - 1);
        t.set(x, y, f.tz0 - 1, stripe ? WH : V.collar);
      }
      // ... and a V in front
      for (let y = f.shY - 6; y <= f.shY; y++) {
        const d = f.shY - y;
        const xin = Math.max(0, f.tw - 1 - d);
        for (let x = -f.tw; x <= f.tw; x++) {
          const ax = Math.abs(x);
          if (ax < xin || (ax > xin + 2 && y < f.shY)) continue;
          t.set(x, y, f.tz1, ax === xin + 1 && y < f.shY ? WH : V.collar);
        }
        for (let x = -xin + 1; x <= xin - 1; x++) if (y > f.shY - 4) t.set(x, y, f.tz1, V.skin);
      }
      // sailor scarf: bow knot + two tails
      t.layer(['RR.RR', 'RRKRR', '.RRR.', '.R.R.', '.R.R.', 'R...R'], { R: V.scarf, K: shade(V.scarf, 0.75) }, { x: -2, y: f.shY - 4, z: f.tz1 + 1 });
      t.set(0, f.shY - 5, f.tz1 + 2, shade(V.scarf, 0.85));
      // head + hair
      const h = head(p, f, { skin: V.skin, eyes: 'lash', iris: V.iris, mouth: ['smile', 'open', 'wide'][v], ears: V.style === 'twin' });
      if (V.style === 'hime') {
        hairCap(h, f, V.hair, { bangs: bangsFrom(f.fringe, [0, 0, 1, 0, 0, 1, 0, -1]), side: f.hy0 - 3, ear: f.hy0 - 3, back: f.hy0 - 3 });
        hairBack(h, f, V.hair, { bottom: f.waistY + 2, z1: -3, taper: 2 });
        sides((s) => h.box(s * (f.hw + 1), f.hy0 - 6, 2, s * f.hw, f.hy0 - 1, 4, V.hair)); // hime side locks
        h.set(-2, f.hy1 + 2, 1, V.hair).set(-2, f.hy1 + 3, 0, V.hair).set(-1, f.hy1 + 4, 0, V.hair); // ahoge
      } else if (V.style === 'twin') {
        hairCap(h, f, V.hair, { bangs: bangsFrom(f.fringe, [1, 0, 0, 1, 0, 0, -1, -2]), side: f.eyeY - 3, ear: f.eyeY + 1, back: f.hy0 + 1 });
        sides((s) => hairTail(h, f, V.hair, s * (f.hw + 2), f.hy1 - 3, -2, 15, 2.6, { dx: s * 1.2, dz: -1, tie: V.tie }));
      } else {
        hairCap(h, f, V.hair, { bangs: bangsAsym(f.fringe, [0, 0, -1, 0, 0, 1, 0, 1, 1, 2, 2, 2, 1, 1, 0, -1, -2]), side: f.hy0 - 1, ear: f.hy0 - 1, back: f.hy0 - 1, vol: 2 });
        h.box(2, f.fringe + 2, f.hz1 + 2, 4, f.fringe + 2, f.hz1 + 2, gloss(C.yellow)); // hair clip
        h.box(2, f.fringe + 3, f.hz1 + 2, 4, f.fringe + 3, f.hz1 + 2, gloss(C.yellow));
      }
      // bag
      if (V.bag === 'hand' || V.bag === 'handL') {
        const s = V.bag === 'hand' ? 1 : -1;
        const m = s > 0 ? p.armR : p.armL;
        const bc = V.bag === 'hand' ? 0x2a2426 : 0x6a4026;
        const b = handBag(m, f, s, { c: gloss(bc), h: 8, len: 10, thick: 1 });
        m.set(b.xm + s * 2, b.top - 2, 0, metal(C.gold)).set(b.xm + s * 2, b.top - 3, 0, metal(C.gold));
        charm(m, b.xm + s * 2, b.top - 1, b.z1 - 1, C.pink, WH);
      } else {
        const bp = backpack(p, f, { c: 0xe9d7b8, strap: 0xc4a77e, pocket: 0xd8c09a, hw: 3, zip: 0xb09070 });
        charm(t, 2, bp.top - 1, bp.z0 - 1, C.sky, WH);
      }
      finish(p, f);
    },
  },

  // ------------------------------------------------------------------------ schoolboy
  schoolboy: {
    name: 'Schoolboy', voxel: 0.031, variants: 3, rig: rigOf(F_BOY),
    build(p, v) {
      const f = F_BOY;
      const V = [
        { skin: SKINS.light, hair: HAIR.black, style: 'spiky', shoe: WH, acc: C.red, bag: 'pack', bagC: C.navy },
        { skin: SKINS.warm, hair: HAIR.darkbrown, style: 'neat', shoe: WH, acc: C.blue, bag: 'hand', bagC: 0x1e1c1e },
        { skin: SKINS.fair, hair: HAIR.black, style: 'buzz', shoe: 0x2a2a30, acc: WH, bag: 'sport', bagC: C.blue, specs: true },
      ][v];
      const jacket = 0x1f2230, t = p.torso;
      legs(p, f, { skin: V.skin, pants: jacket, hem: true, crease: true, shoe: 'sneaker', shoeC: V.shoe, soleC: V.shoe === WH ? 0xe8e4dc : WH, accent: V.acc, lace: V.shoe === WH ? 0xdcd8d0 : WH });
      torso(p, f, { skin: V.skin, col: outfit(f, { top: jacket, bottom: jacket, folds: true, col: (x, y, z, c) => (y === f.pelvisY + 1 && z === f.tz1 ? shade(jacket, 1.25) : null) }) });
      arms(p, f, { skin: V.skin, sleeve: jacket, sleeveY: f.handY + 3, cuff: shade(jacket, 1.2), elbowFold: true });
      sides((s) => { const m = s < 0 ? p.armL : p.armR; m.set(s * f.armOut, f.handY + 4, 0, metal(C.gold)); });
      // stand collar around the neck with a white celluloid line + gold buttons
      for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) {
        if (Math.abs(x) <= 1 && Math.abs(z) <= 1) continue;
        if (Math.abs(x) === 2 && Math.abs(z) === 2) continue;
        t.set(x, f.shY + 1, z, z === 2 && Math.abs(x) <= 1 ? WH : jacket);
      }
      t.set(0, f.shY + 1, 2, null);
      for (let y = f.pelvisY + 2; y <= f.shY - 1; y += 2) t.set(0, y, f.tz1 + 1, metal(C.gold));
      t.set(-3, f.shY - 2, f.tz1, shade(jacket, 1.3)); // badge
      const h = head(p, f, { skin: V.skin, eyes: 'round', iris: 0x3a2418, mouth: ['grin', 'smile', 'smirk'][v], brows: shade(V.hair, 0.8), browShape: ['BB'] });
      if (V.style === 'spiky') {
        hairCap(h, f, V.hair, { bangs: bangsFrom(f.fringe, [1, 0, 1, -1, 1, 0, -1, -2]), side: f.eyeY, ear: f.eyeY + 1, back: f.hy0 + 1 });
        for (const [x, z, hgt] of [[-4, 2, 3], [-1, 3, 3], [2, 2, 4], [5, 0, 2], [-5, -2, 2], [0, -2, 3], [3, -4, 2]]) {
          h.cone(x, f.hy1 + 1, z, 1.6, hgt, (xx, yy, zz) => hairColor(f, V.hair)(xx, yy, zz));
        }
      } else if (V.style === 'neat') {
        hairCap(h, f, V.hair, { bangs: bangsAsym(f.fringe, [0, 0, 0, 0, 0, 0, 1, 1, 2, 3, 3, 3, 3, 2, 1, 0, -1]), side: f.eyeY, ear: f.eyeY + 1, back: f.hy0 + 1, top: 2 });
      } else {
        hairCap(h, f, mix(V.hair, V.skin, 0.2), { bangs: bangsFrom(f.fringe + 2, [0, 0, 0, 0, 0, 0, 0, -1]), side: f.eyeY + 1, ear: f.eyeY + 2, back: f.hy0 + 1, top: 1, ring: false });
      }
      if (V.specs) glasses(h, f, { c: 0x2a2a34 });
      if (V.bag === 'pack') {
        const bp = backpack(p, f, { c: V.bagC, strap: 0x1a2240, pocket: shade(V.bagC, 1.15), hw: 3, zip: 0xd0d0d8 });
        charm(t, -2, bp.top - 1, bp.z0 - 1, C.lime, WH);
      } else if (V.bag === 'hand') {
        handBag(p.armR, f, 1, { c: gloss(V.bagC), h: 8, len: 10, thick: 1 });
      } else {
        // sports barrel bag in the left hand
        const m = p.armL, xm = -f.ax, top = f.handY - 2;
        m.shape(xm - 2, top - 5, -5, xm + 2, top, 5, (x, y, z) => ((x - xm) / 2.6) ** 2 + ((y - top + 2.5) / 3.1) ** 2 <= 1 && Math.abs(z) <= 5,
          (x, y, z) => (Math.abs(z) === 5 ? WH : y === top - 3 ? WH : V.bagC));
        for (let y = top + 1; y <= f.handY; y++) { m.set(xm, y, -2, 0x222222); m.set(xm, y, 2, 0x222222); }
      }
      finish(p, f);
    },
  },

  // ------------------------------------------------------------------------ salaryman
  salaryman: {
    name: 'Salaryman', voxel: 0.032, variants: 3, rig: rigOf(F_MAN),
    build(p, v) {
      const f = F_MAN;
      const V = [
        { skin: SKINS.light, suit: 0x2c3448, tie: C.red, hair: HAIR.black, specs: false, case: 0x2a2220, mouth: 'flat' },
        { skin: SKINS.warm, suit: 0x5a5c62, tie: 0x2f5fb0, hair: HAIR.darkbrown, specs: true, case: 0x6a4428, mouth: 'sigh' },
        { skin: SKINS.light, suit: 0x26262a, tie: 0x6a8c3a, hair: HAIR.ash, specs: false, case: 0x1e1e22, mouth: 'wavy' },
      ][v];
      const shirt = WH, t = p.torso;
      legs(p, f, { skin: V.skin, pants: V.suit, hem: true, crease: true, shoe: 'loafer', shoeC: 0x2a1c16, soleC: 0x141010 });
      torso(p, f, { skin: V.skin, col: outfit(f, { top: V.suit, bottom: V.suit, belt: 0x1a1414 }) });
      arms(p, f, { skin: V.skin, sleeve: V.suit, sleeveY: f.handY + 3, cuff: shirt, elbowFold: true });
      // shirt V, lapels, tie
      for (let y = f.shY - 6; y <= f.shY; y++) {
        const d = f.shY - y, xin = Math.max(0, 3 - Math.floor(d / 2));
        for (let x = -xin; x <= xin; x++) t.set(x, y, f.tz1, shirt);
        sides((s) => t.set(s * (xin + 1), y, f.tz1, shade(V.suit, 1.18)));
      }
      t.box(-1, f.shY - 1, f.tz1, 1, f.shY, f.tz1, shirt);
      sides((s) => t.set(s * 1, f.shY + 1, 1, shirt).set(s * 2, f.shY, 1, shirt)); // collar points
      t.set(0, f.shY - 1, f.tz1 + 1, shade(V.tie, 0.85)); // knot
      for (let y = f.waistY + 2; y <= f.shY - 2; y++) t.set(0, y, f.tz1 + 1, (y % 3 === 0) ? shade(V.tie, 0.78) : V.tie);
      t.set(0, f.waistY + 1, f.tz1 + 1, shade(V.tie, 0.7));
      t.set(1, f.waistY + 3, f.tz1, metal(C.gold)).set(1, f.waistY + 5, f.tz1, metal(C.gold));
      t.set(-3, f.shY - 3, f.tz1, WH).set(-3, f.shY - 2, f.tz1, WH); // pocket square
      t.set(3, f.shY - 3, f.tz1, metal(C.gold)); // company pin
      const h = head(p, f, { skin: V.skin, eyes: 'tired', iris: 0x3a2a22, mouth: V.mouth, brows: shade(V.hair, 0.85), browShape: ['.BB'], blush: false, nose: true });
      hairCap(h, f, V.hair, { bangs: bangsAsym(f.fringe + 2, [0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 3, 3, 2, 2, 1, 0, -1]), side: f.eyeY + 1, ear: f.eyeY + 1, back: f.hy0 + 1 });
      h.project(['K'], { K: shade(V.hair, 0.6) }, -2, f.hy1 + 1, '+y'); // parting
      if (V.specs) glasses(h, f, { c: 0x6a6a74 });
      if (v === 2) { // tired stubble
        h.project(['S.S.S', '.S.S.'], { S: shade(V.skin, 0.84) }, -2, f.hy0 + 1);
      }
      const b = handBag(p.armR, f, 1, { c: gloss(V.case), h: 7, len: 11, thick: 1, handle: 0x1a1414 });
      p.armR.set(b.xm + 2, b.top - 1, 0, metal(C.silver)).set(b.xm - 2, b.top - 1, 0, metal(C.silver));
      finish(p, f);
    },
  },

  // ------------------------------------------------------------------------ office lady
  office_lady: {
    name: 'Office Lady', voxel: 0.032, variants: 3, rig: rigOf(F_GIRL),
    build(p, v) {
      const f = F_GIRL;
      const V = [
        { skin: SKINS.light, hair: HAIR.brown, style: 'bob', blouse: WH, bottom: 0x3a3c48, slacks: false, shoe: 0x1e1a1c, tote: 0xd8b48a, iris: 0x5a3424 },
        { skin: SKINS.fair, hair: HAIR.black, style: 'pony', blouse: 0xffd6dc, bottom: 0x2a3550, slacks: false, shoe: 0x2a3550, tote: 0x2a2426, iris: 0x3a2418 },
        { skin: SKINS.warm, hair: HAIR.chestnut, style: 'long', blouse: 0xcfe4f6, bottom: 0x8a8478, slacks: true, shoe: 0x6a4a3a, tote: 0xc84a3a, iris: 0x6a4a2a },
      ][v];
      const t = p.torso;
      if (V.slacks) legs(p, f, { skin: V.skin, pants: V.bottom, hem: true, crease: true, shoe: 'pump', shoeC: V.shoe, soleC: shade(V.shoe, 0.7) });
      else legs(p, f, { skin: V.skin, shoe: 'pump', shoeC: V.shoe, soleC: shade(V.shoe, 0.6), col: (x, y, z, c) => (c === V.skin || c === shade(V.skin, 0.96) ? mix(c, 0xd8b8a0, 0.25) : null) });
      torso(p, f, { skin: V.skin, col: outfit(f, { top: V.blouse, bottom: V.bottom, belt: V.slacks ? 0x3a2a22 : null }) });
      if (!V.slacks) {
        skirt(p, f, { c: V.bottom, hemY: 9, flare: 0, pleats: false, col: (x, y, z, cc) => (x === 0 && z < 0 && y <= 10 ? null : (Math.abs(x) === 2 && z > 0 && y < 13 ? shade(cc, 0.92) : cc)) });
        p.torso.set(0, 9, f.tz0 - 1, null).set(0, 10, f.tz0 - 1, null); // back slit
      }
      arms(p, f, { skin: V.skin, sleeve: V.blouse, sleeveY: f.handY + 3, cuff: shade(V.blouse, 0.9), elbowFold: true });
      p.armL.box(-f.armIn, f.handY + 3, f.az0, -f.armIn, f.handY + 3, f.az1, metal(C.silver)); // wristwatch
      p.armL.set(-f.armOut, f.handY + 3, 0, metal(C.gold));
      // blouse collar + buttons
      for (let x = -2; x <= 2; x++) t.set(x, f.shY, f.tz1, Math.abs(x) <= 1 ? V.skin : shade(V.blouse, 0.9));
      t.set(0, f.shY - 1, f.tz1, V.skin);
      sides((s) => { t.set(s * 2, f.shY, f.tz1 + 1, V.blouse); t.set(s, f.shY - 1, f.tz1 + 1, V.blouse); });
      for (let y = f.waistY + 2; y <= f.shY - 3; y += 2) t.set(0, y, f.tz1 + 1, shade(V.blouse, 0.82));
      if (v === 0) { // lanyard + ID card
        for (let y = f.shY - 4; y <= f.shY; y++) { t.set(-2 + Math.floor((f.shY - y) / 3), y, f.tz1 + 1, C.blue); t.set(2 - Math.floor((f.shY - y) / 3), y, f.tz1 + 1, C.blue); }
        t.box(-1, f.waistY + 2, f.tz1 + 1, 1, f.waistY + 4, f.tz1 + 1, WH);
        t.set(-1, f.waistY + 3, f.tz1 + 2, C.sky).set(0, f.waistY + 3, f.tz1 + 1, 0x8a8a8a).set(1, f.waistY + 3, f.tz1 + 1, 0x8a8a8a);
      } else if (v === 1) { // pearl necklace
        for (const [x, y] of [[-2, f.shY], [-1, f.shY - 1], [0, f.shY - 1], [1, f.shY - 1], [2, f.shY]]) t.set(x, y, f.tz1 + 1, gloss(0xf6f0e6));
      }
      const h = head(p, f, { skin: V.skin, eyes: 'lash', iris: V.iris, mouth: ['smile', 'tiny', 'smile'][v], lash: 0x2a1a1a, mouthC: 0xc85a68, ears: V.style === 'pony' });
      if (V.style === 'bob') {
        hairCap(h, f, V.hair, { bangs: bangsAsym(f.fringe, [0, 0, -1, -1, 0, 0, 1, 1, 2, 2, 2, 1, 1, 0, 0, -1, -2]), side: f.hy0 - 1, ear: f.hy0 - 1, back: f.hy0 - 1, vol: 2 });
      } else if (V.style === 'pony') {
        hairCap(h, f, V.hair, { bangs: bangsFrom(f.fringe + 1, [2, 1, 0, 0, 0, -1, -2, -3]), side: f.eyeY - 2, ear: f.eyeY + 1, back: f.hy0 + 2 });
        hairTail(h, f, V.hair, 0, f.hy0 + 3, f.hz0 - 2, 10, 2.2, { dz: -1, tie: 0x2a2a2a });
        h.set(f.hw + 1, f.eyeY - 3, 0, metal(C.gold)).set(-f.hw - 1, f.eyeY - 3, 0, metal(C.gold)); // earrings
      } else {
        hairCap(h, f, V.hair, { bangs: bangsAsym(f.fringe, [-2, -1, 0, 0, 1, 1, 2, 3, 3, 3, 2, 1, 0, 0, -1, -2, -3]), side: f.hy0 - 3, ear: f.hy0 - 3, back: f.hy0 - 3, vol: 1 });
        hairBack(h, f, V.hair, { bottom: f.shY - 6, z1: -3, taper: 1, flare: 1 });
        sides((s) => { for (let y = f.hy0 - 5; y < f.hy0; y++) h.box(s * f.hw, y, 1, s * (f.hw + 1), y, 3, hairColor(f, V.hair, { ring: false })(s, y, 1)); });
        h.layer(['BB.BB', 'BBKBB', 'B...B'], { B: gloss(0x2a3a6a), K: gloss(C.gold) }, { x: -2, y: f.hy0 + 8, z: f.hz0 - 2, depth: 1 }); // ribbon barrette
      }
      // tote bag in the right hand
      const b = handBag(p.armR, f, 1, { c: V.tote, h: 9, len: 9, thick: 1, drop: 2, handle: shade(V.tote, 0.75),
        col: (x, y, z, cc, B) => (y === B.top - 3 && Math.abs(z) <= 2 && x === B.xm + 1 ? shade(V.tote, 0.82) : null) });
      p.armR.box(b.xm, b.top + 1, b.z0 + 2, b.xm, b.top + 1, b.z1 - 2, v === 2 ? 0xf2e6c8 : 0x9ab0c8); // papers peeking out
      finish(p, f);
    },
  },

  // ------------------------------------------------------------------------ grandma
  grandma: {
    name: 'Grandma', voxel: 0.03, variants: 3, rig: rigOf(F_GRANDMA),
    build(p, v) {
      const f = F_GRANDMA;
      const V = [
        { skin: SKINS.light, hair: 0xc4bcc8, cardigan: 0xa47aa8, blouse: 0xf3ead8, skirt: 0x6a5244, bag: 0x3a6ab0, bagDot: WH, specs: false },
        { skin: SKINS.warm, hair: 0xe8e4e0, cardigan: 0x8aa07a, blouse: 0xf6e2e2, skirt: 0x4a4a56, bag: 0xd85a5a, bagDot: 0xf6d06a, specs: true },
        { skin: SKINS.fair, hair: 0xb8a8d4, cardigan: 0xc98a7a, blouse: WH, skirt: 0x3a4a6a, bag: 0x6a8a4a, bagDot: 0xf2e6c8, specs: false },
      ][v];
      const t = p.torso;
      legs(p, f, { skin: V.skin, socks: mix(V.skin, 0xb89880, 0.45), sockY: f.hipY, shoe: 'flat', shoeC: 0x5a4034, soleC: 0x2a2020 });
      torso(p, f, { skin: V.skin, col: outfit(f, { top: V.cardigan, bottom: V.skirt, folds: false,
        col: (x, y, z, c) => (y > f.waistY && z === f.tz1 && Math.abs(x) <= 1 && y >= f.shY - 4 ? V.blouse : (y > f.waistY && z === f.tz1 && Math.abs(x) === 1 && y < f.shY - 4 ? shade(V.cardigan, 1.1) : (y > f.waistY && hash(x, y, z, 41) < 0.12 ? shade(c, 0.9) : null))) }) });
      skirt(p, f, { c: V.skirt, hemY: 4, flare: 2, pleats: true, waist: f.waistY });
      arms(p, f, { skin: V.skin, sleeve: V.cardigan, sleeveY: f.handY + 3, cuff: shade(V.cardigan, 0.85), elbowFold: true });
      // cardigan buttons + pockets
      for (let y = f.waistY + 2; y <= f.shY - 5; y += 2) t.set(-1, y, f.tz1 + 1, gloss(0xf2e6c8));
      sides((s) => { for (let x = 2; x <= 3; x++) t.set(s * x, f.waistY + 2, f.tz1 + 1, shade(V.cardigan, 0.85)); });
      t.box(-1, f.shY, f.tz1, 1, f.shY, f.tz1, V.blouse);
      const h = head(p, f, { skin: V.skin, eyes: 'happy', mouth: 'smile', brows: 0xa8a0a0, browDY: -1, blushW: 2, blush: 0xffa0a8, nose: true });
      // perm: puffy curly shell with bumpy surface
      hairCap(h, f, V.hair, { bangs: bangsFrom(f.fringe + 2, [1, 0, 1, 0, -1, 0, -1, -2]), side: f.eyeY - 1, ear: f.eyeY, back: f.hy0, vol: 2, top: 2, curl: 0.3, ring: false });
      for (let i = 0; i < 12; i++) { // little curls all round the perm
        const a = (i + 0.5) / 12 * Math.PI * 2, rr = i % 2 ? 8.6 : 8.2;
        const cz = Math.sin(a) * 7.2 - 0.5;
        if (cz > 3.5) continue;
        h.sphere(Math.cos(a) * rr, f.eyeY + 2 + (i % 3), cz, 1.3, shade(V.hair, i % 2 ? 0.9 : 1.05));
      }
      for (const [x, z] of [[-3, -2], [2, -3], [0, 1], [4, 0], [-4, 1]]) h.sphere(x, f.hy1 + 2, z, 1.4, shade(V.hair, 1.04));
      if (V.specs) {
        glasses(h, f, { c: 0xb08a5a, round: true });
        for (let y = f.eyeY; y >= f.hy0 - 2; y--) h.set(f.hw + 1, y, 1, metal(C.gold)); // glasses chain
      }
      // cloth bag with polka dots in the left hand
      handBag(p.armL, f, -1, { c: V.bag, h: 8, len: 9, thick: 1, drop: 2, handle: shade(V.bag, 0.8),
        col: (x, y, z, cc) => ((((y % 3) + 3) % 3 === 1) && (((z + (y % 6 < 3 ? 0 : 1)) % 2 + 2) % 2 === 0) ? V.bagDot : cc) });
      finish(p, f);
    },
  },

  // ------------------------------------------------------------------------ grandpa
  grandpa: {
    name: 'Grandpa', voxel: 0.031, variants: 3, rig: rigOf(F_GRANDPA),
    build(p, v) {
      const f = F_GRANDPA;
      const V = [
        { skin: SKINS.light, cap: 0x8a7a5a, vest: 0xd8c49a, shirt: 0xeef0f6, pants: 0x6a6460, cane: C.woodDark, tache: true, specs: false },
        { skin: SKINS.warm, cap: 0x4a5a6a, vest: 0x6a7a4a, shirt: 0xd6e6f6, pants: 0x5a4a3a, cane: 0x8a5a3a, tache: false, specs: true },
        { skin: SKINS.light, cap: 0x7a3a3a, vest: 0x8a3a46, shirt: 0xf6f0e0, pants: 0x3a3a44, cane: metal(0xb8bcc8), tache: true, specs: false },
      ][v];
      const t = p.torso;
      legs(p, f, { skin: V.skin, pants: V.pants, hem: true, crease: true, shoe: 'loafer', shoeC: 0x4a3024, soleC: 0x1a1414 });
      torso(p, f, { skin: V.skin, col: outfit(f, { top: V.vest, bottom: V.pants, belt: 0x3a2a20,
        col: (x, y, z, c) => (y > f.waistY + 1 && (x + y) % 2 === 0 && z !== f.tz1 ? shade(V.vest, 0.92) : null) }) });
      arms(p, f, { skin: V.skin, sleeve: V.shirt, sleeveY: f.handY + 3, cuff: shade(V.shirt, 0.9), elbowFold: true });
      // vest V-neck showing the shirt and a small bow tie / collar
      for (let y = f.shY - 5; y <= f.shY; y++) {
        const xin = Math.max(0, Math.floor((y - (f.shY - 5)) / 2));
        for (let x = -xin; x <= xin; x++) t.set(x, y, f.tz1, V.shirt);
      }
      sides((s) => { for (let y = f.shY - 1; y <= f.shY; y++) t.set(s * f.tw, y, 0, V.shirt); }); // shirt shoulders
      for (let y = f.waistY + 2; y <= f.shY - 5; y += 2) t.set(0, y, f.tz1 + 1, gloss(0x5a4030));
      sides((s) => t.set(s * 2, f.waistY + 3, f.tz1 + 1, shade(V.vest, 0.8)));
      const h = head(p, f, { skin: V.skin, eyes: v === 1 ? 'small' : 'calm', mouth: V.tache ? 'dot' : 'smile', brows: 0xf2eeea, browShape: ['BBB'], browDY: 0, blush: 0xffb0a8, nose: true });
      hairCap(h, f, 0xd8d4d0, { bangs: () => f.hy1, side: f.eyeY - 1, ear: f.eyeY - 1, back: f.hy0 + 1, ring: false });
      if (V.tache) h.project(['WW.WW', 'W...W'], { W: 0xf4f0ec }, -2, f.hy0 + 3, '+z', { raise: true });
      if (V.specs) glasses(h, f, { c: 0x3a3436 });
      hat(h, f, 'flat', { c: V.cap, tweed: true, y: f.fringe + 1 });
      // walking cane in the right hand
      const m = p.armR, xm = f.ax;
      for (let y = 0; y < f.handY; y++) m.set(xm, y, 1, y === 0 ? 0x2a2a2a : V.cane);
      const ht = f.handY + f.handH;
      for (const [y, z] of [[ht - 1, 1], [ht, 1], [ht, 2], [ht, 3], [ht - 1, 4], [ht - 2, 4]]) m.set(xm, y, z, V.cane);
      finish(p, f);
    },
  },

  // ------------------------------------------------------------------------ kid
  kid: {
    name: 'Kid', voxel: 0.028, variants: 3, rig: rigOf(F_KID),
    build(p, v) {
      const f = F_KID;
      const V = [
        { skin: SKINS.light, shirt: C.sky, shorts: C.navy, hair: HAIR.black, rand: 0x2a2224, hat: C.yellow, girl: false },
        { skin: SKINS.fair, shirt: 0xffb8c8, shorts: 0x8a6a9a, hair: HAIR.darkbrown, rand: 0xd23a3a, hat: C.yellow, girl: true },
        { skin: SKINS.deep, shirt: C.lime, shorts: 0x6a5240, hair: HAIR.black, rand: 0x2a4a8a, hat: C.red, girl: false },
      ][v];
      const t = p.torso;
      legs(p, f, { skin: V.skin, pants: V.shorts, pantsY: f.hipY - 3, hem: true, socks: WH, sockY: 4, sockStripe: V.girl ? C.pink : C.sky, shoe: 'sneaker', shoeC: WH, accent: V.rand === 0x2a2224 ? C.blue : V.rand });
      torso(p, f, { skin: V.skin, col: outfit(f, { top: V.shirt, bottom: V.shorts, folds: false }) });
      arms(p, f, { skin: V.skin, sleeve: V.shirt, sleeveY: f.shY - 3, cuff: shade(V.shirt, 0.9) });
      // T-shirt print
      if (v === 0) t.project(['.Y.', 'YYY', '.Y.'], { Y: C.yellow }, -1, f.shY - 3, '+z');
      else if (v === 1) t.project(['R.R', 'RRR', '.R.'], { R: C.hotpink }, -1, f.shY - 3, '+z');
      else t.project(['WWW', 'W.W'], { W: WH }, -1, f.shY - 3, '+z');
      // name tag
      t.set(-2, f.shY - 2, f.tz1 + 1, WH);
      const h = head(p, f, { skin: V.skin, eyes: 'round', iris: 0x3a2418, mouth: ['open', 'smile', 'grin'][v], eyeX: 2, blushW: 2 });
      hairCap(h, f, V.hair, { bangs: bangsFrom(f.fringe, [0, 1, 0, 1, 0, -1, -2]), side: f.eyeY - 1, ear: f.eyeY + 1, back: f.hy0 + 1 });
      if (V.girl) sides((s) => hairTail(h, f, V.hair, s * (f.hw + 1), f.eyeY - 1, -2, 5, 1.6, { tie: C.hotpink }));
      hat(h, f, 'school', { c: V.hat, y: f.fringe + 1, band: V.girl ? C.hotpink : null });
      // randoseru (glossy box backpack with a flap and a clasp)
      const top = f.shY + 1, bot = f.waistY - 2, z1 = f.tz0 - 1, z0 = z1 - 3;
      rbox(t, -3, bot, z0, 3, top, z1, 1, gloss(V.rand));
      rbox(t, -3, bot + 3, z0 - 1, 3, top, z0 - 1, 1, gloss(shade(V.rand, 1.12))); // flap
      t.set(0, bot + 3, z0 - 2, metal(C.gold)).set(0, bot + 4, z0 - 2, metal(C.gold));
      for (let x = -2; x <= 2; x++) t.set(x, bot + 1, z0, gloss(shade(V.rand, 0.75)));
      t.set(3, bot + 2, z0 + 1, glow(C.yellow)); // reflector
      charm(t, -4, top - 1, z0 + 2, C.pink, WH);
      sides((s) => { for (let y = f.waistY + 1; y <= f.shY + 1; y++) t.set(s * 2, y, f.tz1 + 1, gloss(shade(V.rand, 0.8))); for (let z = f.tz0; z <= f.tz1; z++) t.set(s * 2, f.shY + 1, z, gloss(shade(V.rand, 0.8))); });
      finish(p, f);
    },
  },

  // ------------------------------------------------------------------------ tourist
  tourist: {
    name: 'Tourist', voxel: 0.031, variants: 3, rig: rigOf(F_BOY),
    build(p, v) {
      const f = F_BOY;
      const V = [
        { skin: SKINS.fair, hair: HAIR.ginger, shirt: 0x2f8fd6, print: 'aloha', shorts: 0xd6c08a, hat: 'sun', hatC: 0xf2e2b0, pack: 0x4a7a4a, freckles: true, iris: 0x3a7ab0 },
        { skin: SKINS.dark, hair: HAIR.black, shirt: 0xf2ece0, print: 'stripe', shorts: 0x5a6a7a, hat: 'bucket', hatC: 0xe07a3a, pack: 0x3a4a6a, freckles: false, iris: 0x3a2418 },
        { skin: SKINS.light, hair: HAIR.blonde, shirt: 0xb8a878, print: 'safari', shorts: 0x6a5a40, hat: 'cap', hatC: 0x2a8a7a, pack: 0xc84a3a, freckles: false, iris: 0x4a8a5a },
      ][v];
      const t = p.torso;
      legs(p, f, { skin: V.skin, pants: V.shorts, pantsY: f.hipY - 5, hem: true, socks: v === 2 ? WH : null, sockY: 5, shoe: v === 0 ? 'sandal' : 'sneaker', shoeC: v === 0 ? 0x6a4a2a : 0x8a8a92, soleC: v === 0 ? 0x4a3020 : WH, accent: C.orange });
      const pr = (x, y, z, c) => {
        if (y <= f.waistY) return null;
        if (V.print === 'aloha') {
          const n = hash(x >> 1, y >> 1, z >> 1, 51);
          if (n < 0.18) return 0xf6f0e0;
          if (n < 0.3) return C.yellow;
          if (n < 0.38) return 0x2a6aa0;
        } else if (V.print === 'stripe') {
          if (y % 3 === 0) return 0x2a4a8a;
        }
        return null;
      };
      torso(p, f, { skin: V.skin, col: outfit(f, { top: V.shirt, bottom: V.shorts, belt: 0x4a3a2a, col: pr }) });
      arms(p, f, { skin: V.skin, sleeve: V.shirt, sleeveY: f.shY - 4, cuff: shade(V.shirt, 0.88), col: (x, y, z, c, s) => (y >= f.shY - 4 && y !== f.shY - 4 ? pr(x, y, z, c) : null) });
      if (V.print !== 'stripe') { // open collar
        t.set(0, f.shY, f.tz1, V.skin).set(0, f.shY - 1, f.tz1, V.skin);
        sides((s) => t.set(s, f.shY, f.tz1 + 1, shade(V.shirt, 0.9)));
        for (let y = f.waistY + 2; y <= f.shY - 3; y += 2) t.set(0, y, f.tz1, shade(V.shirt, 0.75));
      }
      if (V.print === 'safari') { // waist pouch
        for (let x = -f.tw - 1; x <= f.tw + 1; x++) for (let z = f.tz0 - 1; z <= f.tz1 + 1; z++) {
          if (Math.abs(x) <= f.tw && z >= f.tz0 && z <= f.tz1) continue;
          if (Math.abs(x) === f.tw + 1 && (z === f.tz0 - 1 || z === f.tz1 + 1)) continue;
          t.set(x, f.waistY, z, 0x2a2a30);
        }
        rbox(t, -2, f.waistY - 2, f.tz1 + 1, 2, f.waistY + 1, f.tz1 + 3, 1, 0x3a6a8a);
        for (let x = -1; x <= 1; x++) t.set(x, f.waistY + 1, f.tz1 + 3, metal(C.silver));
        t.set(2, f.waistY, f.tz1 + 4, metal(C.silver));
      }
      if (V.print === 'safari') sides((s) => { t.box(s * 2, f.shY - 4, f.tz1 + 1, s * 3, f.shY - 3, f.tz1 + 1, shade(V.shirt, 0.9)); t.set(s * 2, f.shY - 3, f.tz1 + 1, shade(V.shirt, 0.8)); });
      backpack(p, f, { c: V.pack, strap: shade(V.pack, 0.7), pocket: shade(V.pack, 1.15), hw: 3, depth: 4, top: f.shY, bottom: f.waistY - 1, zip: 0xd0c8b0 });
      t.box(-3, f.shY + 1, f.tz0 - 4, 3, f.shY + 2, f.tz0 - 4, 0x3a5a8a); // bedroll
      // camera on a neck strap (first two) — the third holds it
      if (v < 2) {
        sides((s) => { for (let y = f.shY - 5; y <= f.shY; y++) t.set(s * (1 + Math.floor((y - (f.shY - 5)) / 2)), y, f.tz1 + 1, 0x2a2a2a); });
        t.box(-2, f.shY - 8, f.tz1 + 1, 2, f.shY - 6, f.tz1 + 2, 0x2a2a30);
        t.box(-2, f.shY - 6, f.tz1 + 1, -1, f.shY - 6, f.tz1 + 2, metal(C.silver));
        t.cylinder(0, f.shY - 7, f.tz1 + 3, 1, 2, 0x1a1a1e, 'z');
        t.set(0, f.shY - 7, f.tz1 + 4, glass(0x6a8ac8));
        t.set(1, f.shY - 6, f.tz1 + 2, glow(0xff5a4a));
      } else {
        const m = p.armR, xm = f.ax;
        m.box(xm - 1, f.handY - 1, 1, xm + 1, f.handY + 1, 4, 0x2a2a30);
        m.box(xm - 1, f.handY + 1, 1, xm + 1, f.handY + 1, 2, metal(C.silver));
        m.cylinder(xm, f.handY, 5, 1, 2, 0x1a1a1e, 'z');
        m.set(xm, f.handY, 7, glass(0x6a8ac8));
      }
      // folded map in the left hand
      const ml = p.armL, xl = -f.ax;
      ml.shape(xl, f.handY - 1, 1, xl, f.handY + 5, 6, () => true, (x, y, z) => {
        if (z === 1 || y === f.handY - 1) return 0xd8ceb0;
        const n = hash(x, y, z, 61);
        return n < 0.25 ? 0x8ac87a : n < 0.4 ? 0x7ab8e8 : (y + z) % 4 === 0 ? 0xe8a05a : 0xf6f0dc;
      });
      ml.set(xl, f.handY + 3, 3, C.red);
      const h = head(p, f, { skin: V.skin, eyes: 'round', iris: V.iris, mouth: ['open', 'grin', 'smile'][v], freckles: V.freckles, brows: shade(V.hair, 0.8), browDY: -1 });
      if (v === 1) {
        hairCap(h, f, V.hair, { bangs: bangsFrom(f.fringe + 1, [0, 0, 0, 0, 0, 0, -1, -2]), side: f.eyeY, ear: f.eyeY + 1, back: f.hy0 + 1, vol: 2, curl: 0.3, ring: false });
      } else {
        hairCap(h, f, V.hair, { bangs: bangsFrom(f.fringe, [1, 0, 1, 0, 1, 0, -1, -2]), side: f.eyeY, ear: f.eyeY + 1, back: f.hy0 + 1 });
      }
      if (V.hat === 'cap') {
        hat(h, f, 'cap', { c: V.hatC, y: f.fringe + 1, logo: WH });

      } else hat(h, f, V.hat, { c: V.hatC, y: f.fringe + 2, band: V.hat === 'sun' ? C.red : null, bow: V.hat === 'sun' ? C.red : null });
      finish(p, f);
    },
  },

  // ------------------------------------------------------------------------ otaku
  otaku: {
    name: 'Otaku', voxel: 0.031, variants: 3, rig: rigOf(F_BOY),
    build(p, v) {
      const f = F_BOY;
      const V = [
        { skin: SKINS.light, hair: HAIR.black, plaid: [0xc83a3a, 0x7a1e26], tee: WH, jeans: 0x3a5a8a, band: WH, bandMark: C.red, pack: 0x2a2a30, specs: 0x2a2a34 },
        { skin: SKINS.warm, hair: HAIR.darkbrown, plaid: [0x3a8a4a, 0x1e4a2a], tee: 0x2a2a30, jeans: 0x4a4a5a, band: C.red, bandMark: WH, pack: 0x3a4a7a, specs: 0x7a3a3a },
        { skin: SKINS.fair, hair: 0x3a3a4a, plaid: [0x3a5ab0, 0x1e2a5a], tee: 0xf6e46a, jeans: 0x6a7a9a, band: 0xffa8d0, bandMark: C.purple, pack: 0x6a3a5a, specs: 0x2a2a34 },
      ][v];
      const t = p.torso;
      const plaid = (x, y, z) => {
        const a = ((x + 20) % 4 === 0), b = ((y + 20) % 4 === 0);
        return a && b ? V.plaid[1] : a || b ? mix(V.plaid[0], V.plaid[1], 0.55) : (((x + y) & 1) ? V.plaid[0] : shade(V.plaid[0], 1.08));
      };
      legs(p, f, { skin: V.skin, pants: V.jeans, hem: true, knee: true, shoe: 'sneaker', shoeC: 0xd8d4cc, accent: 0x4a4a52, soleC: 0x8a8680,
        col: (x, y, z, c) => (y > 3 && c === V.jeans && hash(x, y, z, 71) < 0.12 ? shade(V.jeans, 1.15) : null) });
      torso(p, f, { skin: V.skin, col: outfit(f, { top: V.plaid[0], bottom: V.jeans, belt: 0x2a2220, folds: false,
        col: (x, y, z, c) => (y > f.waistY ? (z === f.tz1 && Math.abs(x) <= 1 ? V.tee : plaid(x, y, z)) : null) }) });
      arms(p, f, { skin: V.skin, sleeve: V.plaid[0], sleeveY: f.handY + 3, cuff: V.plaid[1], col: (x, y, z, c) => (y > f.handY + 3 ? plaid(x, y, z) : null) });
      // tee print under the open shirt + collar
      t.project(['P', 'P'], { P: V.bandMark }, 0, f.shY - 4, '+z');
      sides((s) => t.set(s * 2, f.shY, f.tz1 + 1, V.plaid[1]).set(s * 2, f.shY - 1, f.tz1 + 1, V.plaid[0]));
      // backpack with rolled posters sticking out
      const bp = backpack(p, f, { c: V.pack, strap: shade(V.pack, 0.75), pocket: shade(V.pack, 1.25), hw: 3, depth: 4, top: f.shY - 1, bottom: f.waistY - 1, zip: 0xc8c8d0 });
      const posters = [[-2, 0xf6d0e0, -1], [1, 0xc8e8ff, 1], [2, 0xfff0a8, 2]];
      for (const [px, pc, lean] of posters.slice(0, v === 1 ? 2 : 3)) {
        const y0 = bp.top - 2, len = 9 - Math.abs(lean);
        for (let i = 0; i < len; i++) {
          const y = y0 + i, z = bp.z0 + 1 - Math.round(i * 0.55), x = px + Math.round(lean * i * 0.25);
          t.set(x, y, z, i === len - 1 ? shade(pc, 0.85) : pc);
          t.set(x, y, z - 1, i % 3 === 1 ? C.hotpink : pc);
        }
      }
      charm(t, -3, bp.top - 1, bp.z0 - 1, C.pink, C.sky);
      charm(t, 3, bp.top - 2, bp.z0 - 1, C.yellow, WH);
      // paper shopping bags (with prints) in both hands
      sides((s) => {
        const m = s < 0 ? p.armL : p.armR;
        const bc = s < 0 ? 0xf6f0e6 : 0xd8b88a;
        const B = handBag(m, f, s, { c: bc, h: 8, len: 7, thick: 1, open: true, handle: 0x8a6a4a, handleZ: 1,
          col: (x, y, z, cc, b) => (x === b.xm + s && y < b.top - 1 && y > b.bot + 1 && Math.abs(z) <= 2 ? (s < 0 ? (Math.abs(z) + y) % 3 === 0 ? C.hotpink : 0xffd0e0 : (y % 2 ? C.sky : WH)) : null) });
        if (s < 0) m.box(B.xm, B.top, -1, B.xm, B.top + 3, 0, 0xffa8c8); // box sticking out
        else m.box(B.xm, B.top, 1, B.xm, B.top + 4, 1, 0x8ac8f0); // poster tube
      });
      const h = head(p, f, { skin: V.skin, eyes: 'round', iris: 0x2a2028, mouth: ['open', 'cat', 'grin'][v] });
      hairCap(h, f, V.hair, { bangs: bangsFrom(f.fringe, [0, 1, -1, 0, 1, -1, 0, -2]), side: f.eyeY - 1, ear: f.eyeY, back: f.hy0, vol: 1, top: 2 });
      for (const [x, z] of [[-3, 1], [2, 2], [0, -3], [4, -1]]) h.set(x, f.hy1 + 3, z, V.hair); // messy tufts
      glasses(h, f, { c: V.specs, lens: glass(0xdfefff) });
      headband(h, f, f.fringe + 1, V.band, 2);
      h.project(['MM', 'MM'], { M: V.bandMark }, -1, f.fringe + 2, '+z', { raise: true });
      h.box(0, f.fringe + 1, f.hz0 - 2, 0, f.fringe + 2, f.hz0 - 2, shade(V.band, 0.9)); // knot
      h.box(-1, f.fringe - 3, f.hz0 - 2, -1, f.fringe, f.hz0 - 2, V.band);
      h.box(1, f.fringe - 2, f.hz0 - 2, 1, f.fringe, f.hz0 - 2, V.band);
      finish(p, f);
    },
  },

  // ------------------------------------------------------------------------ gyaru
  gyaru: {
    name: 'Gyaru', voxel: 0.032, variants: 3, rig: rigOf(F_GIRL),
    build(p, v) {
      const f = F_GIRL;
      const V = [
        { skin: SKINS.tan, hair: HAIR.bleach, top: WH, cardi: 0xf2d8a8, skirt: 0x6a5a8a, plat: 0x2a2224, shoe: 0x2a2224, phone: 0xff7ab0, flower: C.hotpink, iris: 0x9a6a3a, loose: true },
        { skin: SKINS.tan, hair: HAIR.caramel, top: 0xe8c07a, cardi: null, skirt: 0x4a6a9a, plat: WH, shoe: WH, phone: 0xc8a8ff, flower: C.yellow, iris: 0x6a8ac8, loose: false },
        { skin: SKINS.deep, hair: HAIR.rose, top: 0xffc8dc, cardi: null, skirt: 0x2a2228, plat: 0xff8ab8, shoe: 0xff8ab8, phone: 0x6ad8e8, flower: WH, iris: 0xb06a9a, loose: false },
      ][v];
      const t = p.torso;
      const leopard = (x, y, z) => { const n = hash(x >> 0, y, z, 81); return n < 0.12 ? 0x3a2418 : n < 0.25 ? 0xa86a2a : null; };
      legs(p, f, { skin: V.skin, socks: V.loose ? WH : null, sockY: 8, sockLoose: V.loose, shoe: 'platform', shoeC: V.shoe, platC: V.plat, accent: gloss(C.gold) });
      torso(p, f, { skin: V.skin, col: outfit(f, { top: V.top, bottom: V.skirt, folds: true, col: (x, y, z, c) => (v === 1 && y > f.waistY ? leopard(x, y, z) : null) }) });
      skirt(p, f, { c: V.skirt, hemY: 12, flare: 1, pleats: v !== 1, col: (x, y, z, cc) => (v === 0 && ((x + 20) % 3 === 0 || (y % 3 === 0)) ? shade(cc, 0.8) : (v === 1 && hash(x, y, z, 82) < 0.15 ? shade(cc, 1.15) : null)) });
      if (v === 2) { // hoodie: sleeves, pocket, strings
        arms(p, f, { skin: V.skin, sleeve: V.top, sleeveY: f.handY + 3, cuff: shade(V.top, 0.88) });
        t.box(-2, f.waistY + 1, f.tz1 + 1, 2, f.waistY + 3, f.tz1 + 1, shade(V.top, 0.92));
        t.set(-1, f.shY - 1, f.tz1 + 1, WH).set(-1, f.shY - 2, f.tz1 + 1, WH).set(1, f.shY - 1, f.tz1 + 1, WH).set(1, f.shY - 3, f.tz1 + 1, WH);
        for (let x = -3; x <= 3; x++) t.set(x, f.shY + 1, f.tz0 - 1, shade(V.top, 0.9)); // hood
        t.box(-3, f.shY - 1, f.tz0 - 1, 3, f.shY, f.tz0 - 1, shade(V.top, 0.95));
      } else if (v === 0) { // blouse + cardigan tied around the waist + ribbon
        arms(p, f, { skin: V.skin, sleeve: V.top, sleeveY: f.handY + 4, cuff: WH, elbowFold: true });
        for (let x = -f.tw - 1; x <= f.tw + 1; x++) for (let z = f.tz0 - 1; z <= f.tz1 + 1; z++) {
          if (Math.abs(x) <= f.tw && z >= f.tz0 && z <= f.tz1) continue;
          if (Math.abs(x) === f.tw + 1 && (z === f.tz0 - 1 || z === f.tz1 + 1)) continue;
          t.set(x, f.waistY, z, V.cardi);
          t.set(x, f.waistY + 1, z, shade(V.cardi, 1.05));
        }
        t.box(-2, f.waistY - 1, f.tz1 + 2, -1, f.waistY, f.tz1 + 2, V.cardi);
        t.box(0, f.waistY - 4, f.tz1 + 2, 0, f.waistY - 1, f.tz1 + 2, shade(V.cardi, 0.9));
        t.box(-1, f.waistY - 3, f.tz1 + 2, -1, f.waistY - 1, f.tz1 + 2, V.cardi);
        t.box(-1, f.shY - 2, f.tz1 + 1, 1, f.shY - 2, f.tz1 + 1, C.red); // ribbon
        t.set(0, f.shY - 3, f.tz1 + 1, C.red).set(0, f.shY - 2, f.tz1 + 2, shade(C.red, 0.8));
        t.box(-1, f.shY, f.tz1, 1, f.shY, f.tz1, V.skin);
      } else { // off-shoulder leopard top
        arms(p, f, { skin: V.skin, sleeve: V.top, sleeveY: f.shY - 2, cuff: V.top, col: (x, y, z, c) => (y >= f.shY - 1 ? V.skin : y === f.shY - 2 ? leopard(x, y, z) ?? V.top : null) });
        for (let x = -f.tw; x <= f.tw; x++) for (let z = f.tz0; z <= f.tz1; z++) if (t.has(x, f.shY, z)) t.set(x, f.shY, z, V.skin);
        for (let x = -2; x <= 2; x++) t.set(x, f.shY - 1, f.tz1, V.skin);
        t.set(0, f.shY - 1, f.tz1 + 1, metal(C.gold)); // necklace
      }
      // bracelets
      p.armL.box(-f.armOut, f.handY + 3, f.az0, -f.armIn, f.handY + 3, f.az1, gloss(C.gold));
      // phone (with charm) in the right hand
      const m = p.armR, xm = f.ax;
      m.box(xm - 1, f.handY - 2, 2, xm + 1, f.handY + 2, 2, gloss(V.phone));
      m.set(xm + 1, f.handY + 1, 2, gloss(WH)).set(xm, f.handY - 1, 2, gloss(C.gold)).set(xm - 1, f.handY + 2, 2, glow(0xffffff));
      m.box(xm - 1, f.handY - 2, 1, xm + 1, f.handY + 2, 1, 0x2a2a30);
      for (let i = 1; i <= 3; i++) m.set(xm + 1, f.handY - 2 - i, 2, i === 3 ? C.hotpink : metal(C.silver));
      // head: big eyes with lashes, glossy lips, big voluminous hair
      const h = head(p, f, { skin: V.skin, eyes: 'gyaru', iris: V.iris, mouth: 'lips', lipC: v === 2 ? 0xff9ac0 : 0xffd8e0, blush: 0xff8a8a, blushW: 2, ears: false });
      hairCap(h, f, V.hair, { bangs: bangsAsym(f.fringe, [-3, -2, -1, 0, 0, 1, 2, 3, 3, 3, 3, 2, 2, 1, 0, -1, -2]), side: f.hy0 - 4, ear: f.hy0 - 4, back: f.hy0 - 4, vol: 2, top: 3 });
      hairBack(h, f, V.hair, { bottom: f.waistY, width: f.hw + 1, z1: -2, taper: 0, flare: 2, wave: 0.6 });
      sides((s) => { // big curls at the sides falling over the shoulders
        for (let i = 0; i < 4; i++) h.sphere(s * (f.hw + 1), f.hy0 - 1 - i * 2, 1 - (i % 2), 1.6, hairColor(f, V.hair, { ring: false })(s, i, 0));
      });
      if (v === 0) h.project(['.F.', 'FYF', '.F.'], { F: V.flower, Y: C.yellow }, f.hw - 4, f.fringe + 4, '+z', { raise: true });
      else if (v === 1) h.project(['KKGKK', 'KK.KK'], { K: gloss(0x2a2030), G: metal(C.gold) }, -2, f.hy1 + 1, '+z', { raise: true }); // sunglasses on the head
      else { headband(h, f, f.fringe + 3, WH, 1); h.project(['W.W', '.W.', 'W.W'], { W: WH }, 3, f.fringe + 5, '+z', { raise: true }); }
      finish(p, f);
    },
  },

  // ------------------------------------------------------------------------ cosplayer
  cosplayer: {
    name: 'Cosplayer', voxel: 0.031, variants: 3, rig: rigOf(F_GIRL),
    build(p, v) {
      const f = F_GIRL;
      const V = [
        { skin: SKINS.fair, hair: HAIR.pink, dress: 0xff7aa8, trim: WH, bow: C.red, gem: C.hotpink, iris: 0xd04a8a, wand: 'star' },
        { skin: SKINS.light, hair: HAIR.blue, dress: 0x5a8ae8, trim: WH, bow: C.yellow, gem: C.sky, iris: 0x3a5ac8, wand: 'moon' },
        { skin: SKINS.warm, hair: HAIR.blonde, dress: 0xffb03a, trim: WH, bow: C.hotpink, gem: C.red, iris: 0xc87a2a, wand: 'heart' },
      ][v];
      const t = p.torso;
      legs(p, f, { skin: V.skin, socks: WH, sockY: 10, shoe: 'boot', shoeC: V.dress, soleC: shade(V.dress, 0.6), bootY: 6, cuffC: WH });
      torso(p, f, { skin: V.skin, col: outfit(f, { top: V.dress, bottom: V.dress, folds: false, col: (x, y, z, c) => (y === f.waistY + 1 ? V.trim : null) }) });
      skirt(p, f, { c: WH, hemY: 10, flare: 3, bell: true, pleats: false, col: (x, y, z, cc) => (y === 10 && (x + z) % 2 ? shade(WH, 0.9) : cc) }); // petticoat
      skirt(p, f, { c: V.dress, hemY: 12, flare: 3, bell: true, pleats: true, stripe: WH, col: (x, y, z, cc) => (y === 12 ? (((x + z) & 1) ? V.trim : shade(V.trim, 0.92)) : null) });
      arms(p, f, { skin: V.skin, sleeve: V.dress, sleeveY: f.shY - 3, cuff: V.trim, puff: true, hand: WH, forearm: V.skin,
        col: (x, y, z, c) => (y <= f.handY + 6 && y > f.handY + 2 ? (y === f.handY + 6 ? shade(V.dress, 1.1) : WH) : null) });
      // big chest bow with a gem + collar
      t.box(-1, f.shY - 4, f.tz1 + 1, 1, f.shY - 2, f.tz1 + 1, V.bow);
      sides((s) => { t.box(s * 2, f.shY - 4, f.tz1 + 1, s * 3, f.shY - 1, f.tz1 + 1, V.bow); t.set(s * 3, f.shY - 1, f.tz1 + 1, null); t.set(s * 2, f.shY - 5, f.tz1 + 1, V.bow).set(s * 3, f.shY - 6, f.tz1 + 1, shade(V.bow, 0.85)); });
      t.set(0, f.shY - 3, f.tz1 + 2, gloss(V.gem));
      for (let x = -3; x <= 3; x++) t.set(x, f.shY, f.tz1 + (Math.abs(x) === 3 ? 0 : 1), V.trim);
      // back bow
      t.box(-1, f.waistY + 1, f.tz0 - 1, 1, f.waistY + 2, f.tz0 - 1, V.bow);
      sides((s) => { t.box(s * 2, f.waistY, f.tz0 - 1, s * 4, f.waistY + 3, f.tz0 - 1, V.bow); t.box(s * 2, f.waistY - 5, f.tz0 - 2, s * 2, f.waistY - 1, f.tz0 - 2, shade(V.bow, 0.85)); });
      // wand in the right hand, pointing forward
      const m = p.armR, xm = f.ax;
      for (let i = 0; i <= 6; i++) m.set(xm, f.handY + 1 + Math.round(i * 0.5), 2 + i, i < 1 ? gloss(V.trim) : i === 6 ? metal(C.gold) : gloss(shade(V.dress, 1.15)));
      const tips = {
        star: ['..Y..', '.YYY.', 'YYYYY', '.YYY.', '.Y.Y.'],
        moon: ['.YYY.', 'YY...', 'Y....', 'YY...', '.YYY.'],
        heart: ['.R.R.', 'RRRRR', 'RRRRR', '.RRR.', '..R..'],
      };
      const ty = f.handY + 7, tz = 9;
      m.layer(tips[V.wand], { Y: gloss(C.yellow), R: gloss(C.hotpink) }, { x: xm, y: ty + 2, z: tz - 2, plane: 'zy', depth: 1 });
      m.set(xm + 1, ty, tz, gloss(V.gem)).set(xm - 1, ty, tz, gloss(V.gem));
      m.set(xm, ty + 4, tz + 2, glow(0xfff6c0)).set(xm, ty - 3, tz - 3, glow(0xfff6c0)); // sparkles
      // head: sparkly eyes, long twin tails with bows, tiara
      const h = head(p, f, { skin: V.skin, eyes: 'sparkle', iris: V.iris, mouth: 'open', ears: false, blushW: 2 });
      hairCap(h, f, V.hair, { bangs: bangsFrom(f.fringe, [1, -1, 0, 1, -1, 0, 0, -2]), side: f.hy0 - 2, ear: f.eyeY - 2, back: f.hy0 });
      sides((s) => {
        hairTail(h, f, V.hair, s * (f.hw + 2), f.hy1 - 3, -2, 20, 2.4, { dx: s * 2, dz: -2, curl: 0.5 });
        h.layer(['BB.BB', 'BBKBB', 'BB.BB'], { B: gloss(V.bow), K: gloss(shade(V.bow, 0.75)) }, { x: s * (f.hw + 2) - 2, y: f.hy1, z: 1, depth: 2 });
      });
      h.project(['..G..', '.GJG.', 'GGGGG'], { G: metal(C.gold), J: gloss(V.gem) }, -2, f.fringe + 3, '+z', { raise: true });
      finish(p, f);
    },
  },

  // ------------------------------------------------------------------------ mom + baby
  mom_baby: {
    name: 'Mom & Baby', voxel: 0.032, variants: 3, rig: rigOf(F_GIRL),
    build(p, v) {
      const f = F_GIRL;
      const V = [
        { skin: SKINS.light, hair: HAIR.brown, style: 'bun', knit: 0xe8dcc4, bottom: 0x4a5a7a, slacks: true, carrier: 0x3a4a6a, babyHat: 0xc8946a, ears: 'bear', babySkin: SKINS.fair },
        { skin: SKINS.warm, hair: HAIR.black, style: 'low', knit: 0x9ab08a, bottom: 0xd8c4a8, slacks: false, carrier: 0xe8a0a8, babyHat: WH, ears: 'bunny', babySkin: SKINS.warm },
        { skin: SKINS.deep, hair: HAIR.darkbrown, style: 'bob', knit: 0xe8b84a, bottom: 0x3a3a40, slacks: true, carrier: 0x7a8a5a, babyHat: 0xfff0a0, ears: 'none', babySkin: SKINS.deep },
      ][v];
      const t = p.torso;
      if (V.slacks) legs(p, f, { skin: V.skin, pants: V.bottom, hem: true, shoe: 'sneaker', shoeC: WH, accent: V.carrier, soleC: 0xe8e2d8 });
      else legs(p, f, { skin: V.skin, shoe: 'flat', shoeC: 0x8a6a5a, soleC: 0x4a3a32 });
      const knit = (x, y, z, c) => (y > f.waistY && ((x + 20) % 2 === 0) && (y % 2 === 0) ? shade(V.knit, 0.92) : null);
      torso(p, f, { skin: V.skin, col: outfit(f, { top: V.knit, bottom: V.bottom, folds: false, col: knit }) });
      if (!V.slacks) skirt(p, f, { c: V.bottom, hemY: 4, flare: 2, pleats: true });
      arms(p, f, { skin: V.skin, sleeve: V.knit, sleeveY: f.handY + 3, cuff: shade(V.knit, 0.85), col: (x, y, z, c) => (y > f.handY + 3 && (y % 2 === 0) && z === f.az1 ? shade(V.knit, 0.92) : null) });
      // baby carrier: padded pouch on the chest, straps over the shoulders crossing on the back
      const cz = f.tz1 + 1, cy0 = f.waistY, cy1 = f.shY - 4;
      rbox(t, -3, cy0, cz, 3, cy1, cz + 3, 1, (x, y, z) => (y === cy0 ? shade(V.carrier, 0.8) : z === cz + 3 && Math.abs(x) <= 1 && y < cy1 - 1 ? shade(V.carrier, 1.12) : V.carrier));
      sides((s) => {
        for (let y = cy1; y <= f.shY; y++) t.set(s * 3, y, f.tz1 + 1, shade(V.carrier, 0.85));
        for (let z = f.tz0 - 1; z <= f.tz1 + 1; z++) t.set(s * 3, f.shY + 1, z, shade(V.carrier, 0.85));
        for (let y = f.waistY; y <= f.shY; y++) t.set(Math.round(s * (3 - 6 * (f.shY - y) / (f.shY - f.waistY))), y, f.tz0 - 1, shade(V.carrier, 0.85));
      });
      for (let x = -f.tw - 1; x <= f.tw + 1; x++) for (let z = f.tz0 - 1; z <= f.tz1; z++) {
        if (Math.abs(x) <= f.tw && z >= f.tz0) continue;
        t.set(x, f.waistY, z, shade(V.carrier, 0.75)); // waist belt
      }
      // baby: little legs dangling, arms out, round head with a hat
      sides((s) => {
        t.box(s * 2, cy0 - 3, cz + 2, s * 2, cy0 - 1, cz + 2, mix(V.babyHat, WH, 0.4));
        t.set(s * 2, cy0 - 4, cz + 2, V.babySkin);
        t.box(s * 4, cy1 - 2, cz + 2, s * 4, cy1 - 1, cz + 2, mix(V.babyHat, WH, 0.4));
        t.set(s * 4, cy1 - 3, cz + 2, V.babySkin);
      });
      const bx = 0, by = f.shY - 3, bz = cz + 3;
      const hatZone = (x, y, z) => y >= by + 2 || z <= bz - 2;
      t.shape(bx - 4, by - 4, bz - 4, bx + 4, by + 4, bz + 4, (x, y, z) => (x - bx) ** 2 + (y - by) ** 2 + (z - bz) ** 2 <= 12.5,
        (x, y, z) => (hatZone(x, y, z) ? ((x + y + z) % 3 === 0 ? shade(V.babyHat, 0.92) : V.babyHat) : V.babySkin));
      for (let x = -3; x <= 3; x++) t.set(x, by + 2, bz + 3 - (Math.abs(x) >= 3 ? 1 : 0), shade(V.babyHat, 0.9)); // hat rim
      t.project(['K...K', 'K...K'], { K }, bx - 2, by + 1, '+z');
      t.project(['P.....P'], { P: C.blush }, bx - 3, by - 1, '+z');
      t.project(['M'], { M: 0xd05a6a }, bx, by - 1, '+z');
      if (V.ears === 'bear') sides((s) => { t.sphere(bx + s * 3, by + 3, bz - 1, 1.2, V.babyHat); t.set(bx + s * 3, by + 3, bz + 1, shade(V.babyHat, 1.25)); });
      else if (V.ears === 'bunny') sides((s) => { t.box(bx + s * 2, by + 3, bz - 1, bx + s * 2, by + 7, bz - 1, V.babyHat); t.box(bx + s * 2, by + 4, bz, bx + s * 2, by + 6, bz, C.pink); });
      else { t.set(bx, by + 4, bz - 1, shade(V.babyHat, 0.9)); t.sphere(bx, by + 5, bz - 1, 1, C.red); } // pom-pom
      // mom head
      const h = head(p, f, { skin: V.skin, eyes: v === 1 ? 'happy' : 'lash', iris: 0x4a2a1c, mouth: 'smile', mouthC: 0xb04a52, ears: V.style === 'low' });
      if (V.style === 'bun') {
        hairCap(h, f, V.hair, { bangs: bangsAsym(f.fringe, [-1, -1, 0, 0, 1, 1, 2, 2, 2, 2, 1, 1, 0, 0, 0, -1, -2]), side: f.eyeY - 3, ear: f.eyeY - 1, back: f.hy0 + 1 });
        hairBun(h, f, V.hair, 0, f.hy1 - 2, f.hz0 - 2, 3.2);
        h.line(-4, f.hy1 - 4, f.hz0 - 2, 3, f.hy1 - 1, f.hz0 - 3, gloss(C.woodDark)); // kanzashi hair stick
        h.set(-4, f.hy1 - 4, f.hz0 - 2, gloss(C.red)).set(-5, f.hy1 - 5, f.hz0 - 2, gloss(C.red));
      } else if (V.style === 'low') {
        hairCap(h, f, V.hair, { bangs: bangsFrom(f.fringe + 1, [2, 1, 0, -1, -1, -2, -2, -3]), side: f.eyeY - 3, ear: f.eyeY + 1, back: f.hy0 });
        hairTail(h, f, V.hair, 3, f.hy0 + 2, f.hz0 + 1, 8, 2, { dx: 2, dz: 2, tie: C.yellow });
      } else {
        hairCap(h, f, V.hair, { bangs: bangsAsym(f.fringe, [0, 0, 0, 0, 0, 1, 1, 2, 2, 2, 1, 1, 0, 0, 0, -1, -2]), side: f.hy0, ear: f.hy0, back: f.hy0, vol: 2, curl: 0.25 });
      }
      // nappy bag in the left hand
      handBag(p.armL, f, -1, { c: shade(V.carrier, 1.1), h: 7, len: 9, thick: 1, drop: 1, col: (x, y, z, cc) => (y === f.handY - 5 ? WH : null) });
      finish(p, f);
    },
  },
};
