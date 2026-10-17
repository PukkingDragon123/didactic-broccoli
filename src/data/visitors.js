// Museum visitors — jointed chibi voxel characters (see docs/VOXEL_GUIDE.md "Characters").
// Every character is modelled standing (arms down, feet on y=0, facing +z, centred on x=0) and each
// voxel goes into one of six part models: head, torso, armL (-x), armR (+x), legL (-x), legR (+x).
// Arms swing about the shoulder joint, legs about the hip joint (rotation about x), the head turns
// about the neck. The torso always reaches a couple of rows below the hip pivot so swinging legs
// never open a gap, and arm/leg tops are rounded around their pivots.
import { C, shade, mix } from '../voxel/palette.js';
import { gloss, metal, glass } from '../voxel/VoxelModel.js';

const K = C.ink;
const WH = 0xffffff;

// ----------------------------------------------------------------------------- small utilities
function hash(x, y, z = 0, s = 0) {
  let h = (x * 374761393 + y * 668265263 + z * 1442695041 + s * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const clamp01 = (t) => Math.max(0, Math.min(1, t));

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
/** Mirror-aware helper: run fn(sign) for the left (-1) and right (+1) side. */
const sides = (fn) => { fn(-1); fn(1); };

// ----------------------------------------------------------------------------- body frame + rig
/**
 * Body proportions in voxels. Adults are ~47–50 voxels tall, the head (incl. hair) ~1/3 of that.
 * hipY: top row of the legs (hip pivot). pelvis: rows of torso that overlap the legs below the pivot.
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
  f.eyeY = f.hy0 + (o.eyeRow ?? 5); // reference eye row (patterns may start one row higher)
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

/** Final pass: apply the stoop (shear the upper torso forward, shift arms/head). */
function finish(p, f) {
  if (f.lean) {
    const vox = [];
    p.torso.forEach((x, y, z, c) => vox.push([x, y, z, c]));
    p.torso.map.clear();
    const y0 = f.waistY, y1 = f.shY;
    for (const [x, y, z, c] of vox) {
      const t = clamp01((y - y0) / (y1 - y0));
      p.torso.set(x, y, z + Math.round(f.lean * t * t), c);
    }
    p.armL.translate(0, 0, f.lean);
    p.armR.translate(0, 0, f.lean);
  }
  if (f.lean || f.headFwd) p.head.translate(0, 0, f.lean + f.headFwd);
}

// ----------------------------------------------------------------------------- legs + shoes
/**
 * o: skin, pants (colour or null), pantsY (lowest pants row), hem, crease, socks, sockY (top sock row),
 *    shoe style ('sneaker' | 'loafer' | 'pump' | 'platform' | 'boot' | 'sandal'), shoeC, soleC, accent,
 *    col(x,y,z,c,s) per-voxel override.
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
      if (o.pants && y >= (o.pantsY ?? H)) {
        c = o.pants;
        if (o.hem && y === (o.pantsY ?? H)) c = shade(c, 0.84);
        if (o.crease && z === f.lz1 && x === xm && y < f.pelvisY) c = shade(c, 1.1);
        if (x === xi) c = shade(c, 0.94);
        if (o.knee && y === Math.round((f.hipY + H) / 2) && z === f.lz1 && x !== xi) c = shade(c, 0.9);
      } else if (o.socks && y <= o.sockY) {
        c = y === o.sockY ? shade(o.socks, 0.9) : o.socks;
        if (o.sockLoose && y <= o.sockY - 1 && hash(x, y, z, 3) < 0.35) c = shade(o.socks, 0.92);
      } else {
        c = skin;
        if (y === f.pelvisY - 3 && z === f.lz1 && x === xm) c = shade(skin, 0.95); // knee hint
      }
      if (o.col) c = o.col(x, y, z, c, s) ?? c;
      m.set(x, y, z, c);
    }
    if (o.sockLoose) { // baggy loose socks bunch around the ankle
      const yl = H, yt = o.sockY - 1;
      for (let y = yl; y <= yt; y++) {
        const bulge = y <= yl + 2 ? 1 : 0;
        if (!bulge) continue;
        for (let x = xa - 1; x <= xb + 1; x++) for (let z = f.lz0 - 1; z <= f.lz1 + 1; z++) {
          const edgeX = x < xa || x > xb, edgeZ = z < f.lz0 || z > f.lz1;
          if (edgeX && edgeZ) continue;
          if (!edgeX && !edgeZ) continue;
          m.set(x, y, z, hash(x, y, z, 5) < 0.4 ? shade(o.socks, 0.9) : o.socks);
        }
      }
    }
    shoe(m, f, o, s, xa, xb, H);
  });
}
function shoeHeight(o) {
  return { platform: 5, pump: 3, sandal: 2, boot: 3 }[o.shoe] ?? 3;
}
function shoe(m, f, o, s, xa, xb, H) {
  const st = o.shoe ?? 'sneaker';
  const c = o.shoeC ?? C.white;
  const sole = o.soleC ?? shade(c, 0.72);
  const acc = o.accent ?? C.red;
  const skin = o.skin ?? C.skin;
  const z0 = f.lz0, zt = f.lz1 + 2;
  const xo = s < 0 ? xa : xb, xm = s * f.lx;
  const toeCorner = (x, z) => z === zt && x === xo;
  if (st === 'sneaker') {
    for (let x = xa; x <= xb; x++) for (let z = z0; z <= zt; z++) {
      if (toeCorner(x, z)) continue;
      m.set(x, 0, z, z === zt || z === z0 ? shade(sole, 0.92) : sole);
      let u = c;
      if (x === xo && z > z0 && z < zt) u = acc; // side swoosh
      if (z === zt) u = shade(c, 0.94);
      m.set(x, 1, z, u);
      if (z <= f.lz1 + 1) m.set(x, 2, z, z === z0 ? acc : z === f.lz1 + 1 ? (x === xm || x === xm - s ? o.lace ?? WH : shade(c, 0.9)) : c);
    }
  } else if (st === 'loafer') {
    for (let x = xa; x <= xb; x++) for (let z = z0; z <= zt; z++) {
      if (toeCorner(x, z)) continue;
      m.set(x, 0, z, sole);
      m.set(x, 1, z, gloss(z === zt ? shade(c, 1.08) : c));
      if (z <= f.lz1 + 1) m.set(x, 2, z, gloss(z === f.lz1 + 1 ? shade(c, 0.75) : c));
    }
  } else if (st === 'pump') {
    for (let x = xa; x <= xb; x++) for (let z = z0; z <= zt; z++) {
      if (toeCorner(x, z)) continue;
      if (z === z0 || z >= f.lz1) m.set(x, 0, z, sole); // heel + ball of foot
      m.set(x, 1, z, gloss(z === zt ? shade(c, 1.1) : c));
      if (z <= f.lz1 + 1) m.set(x, 2, z, z === z0 ? gloss(c) : z === f.lz1 + 1 ? gloss(c) : skin);
    }
    m.set(xm, 0, z0, sole);
  } else if (st === 'platform') {
    const pc = o.platC ?? WH;
    for (let x = xa; x <= xb; x++) for (let z = z0; z <= zt; z++) {
      if (toeCorner(x, z)) continue;
      for (let y = 0; y <= 2; y++) m.set(x, y, z, y === 1 ? shade(pc, 0.86) : pc);
      m.set(x, 3, z, gloss(z === zt ? shade(c, 1.1) : c));
      if (z <= f.lz1 + 1) m.set(x, 4, z, gloss(z === f.lz1 + 1 ? acc : c));
    }
  } else if (st === 'boot') {
    for (let x = xa; x <= xb; x++) for (let z = z0; z <= zt; z++) {
      if (toeCorner(x, z)) continue;
      m.set(x, 0, z, sole);
      m.set(x, 1, z, gloss(z === zt ? shade(c, 1.1) : c));
      if (z <= f.lz1 + 1) m.set(x, 2, z, gloss(c));
    }
  } else if (st === 'sandal') {
    for (let x = xa; x <= xb; x++) for (let z = z0; z <= zt; z++) {
      if (toeCorner(x, z)) continue;
      m.set(x, 0, z, sole);
      let u = skin;
      if (z === f.lz1) u = c; // strap across the foot
      if (z === zt) u = (x & 1) ? shade(skin, 0.9) : skin; // toes
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
  if (o.neck !== false) t.box(-1, f.shY + 1, -1, 1, f.shY + 1, 1, o.neckC ?? o.skin ?? C.skin);
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
      if (folds && (z === f.tz1 || z === f.tz0) && Math.abs(x) === 2 && y <= f.waistY + 3 && y > f.waistY) c = shade(top, 0.9);
      if (y === f.waistY + 1) c = shade(c, 0.93);
    }
    if (col) c = col(x, y, z, c) ?? c;
    return c;
  };
}
/** Flared skirt in the torso part, from the waist down to row hemY. */
function skirt(p, f, { c, hemY, flare = 2, pleats = true, stripe = null, waist = f.waistY, col = null }) {
  const t = p.torso;
  const n = waist - hemY;
  for (let y = hemY; y <= waist; y++) {
    const k = (waist - y) / n;
    const e = Math.round(0.6 + flare * k);
    const hx = f.tw + e, z0 = f.tz0 - e, z1 = f.tz1 + e;
    for (let x = -hx; x <= hx; x++) for (let z = z0; z <= z1; z++) {
      const ax = Math.abs(x);
      if (ax === hx && (z === z0 || z === z1)) continue;
      let cc = c;
      if (pleats) {
        const edge = ax === hx ? z : x; // pleat stripes run around the skirt
        if (((edge % 2) + 2) % 2 === 0) cc = shade(c, 0.86);
      }
      if (stripe && (y === hemY + 1)) cc = stripe;
      if (y === hemY) cc = shade(cc, 0.9);
      if (col) cc = col(x, y, z, cc) ?? cc;
      t.set(x, y, z, cc);
    }
  }
}

// ----------------------------------------------------------------------------- arms
/**
 * o: skin, sleeve, sleeveY (lowest sleeve row), cuff, forearm, hand (glove), puff (bool),
 *    col(x,y,z,c,s) override.
 */
function arms(p, f, o) {
  const skin = o.skin ?? C.skin;
  sides((s) => {
    const m = s < 0 ? p.armL : p.armR;
    const xa = s < 0 ? -f.armOut : f.armIn, xb = s < 0 ? -f.armIn : f.armOut;
    const xo = s < 0 ? xa : xb, xm = s * f.ax;
    const zm = Math.round((f.az0 + f.az1) / 2);
    const hTop = f.handY + f.handH - 1;
    for (let y = f.handY; y <= f.shY; y++) for (let x = xa; x <= xb; x++) for (let z = f.az0; z <= f.az1; z++) {
      if (y === f.shY && x === xo) continue; // sloped shoulder
      if (y === f.shY && (z === f.az0 || z === f.az1) && x !== xm) continue;
      if (y === f.handY && x !== xm && z !== zm) continue; // rounded fist
      let c;
      if (y <= hTop) c = o.hand ?? skin;
      else if (y >= o.sleeveY) {
        c = o.sleeve;
        if (y === o.sleeveY && o.cuff) c = o.cuff;
        if (o.elbowFold && y === Math.round((f.shY + f.handY) / 2) && z === f.az1 && x === xm) c = shade(c, 0.88);
      } else c = o.forearm ?? skin;
      if (o.col) c = o.col(x, y, z, c, s) ?? c;
      m.set(x, y, z, c);
    }
    if (o.hand !== undefined || true) {
      // thumb nub on the front-inner side of the hand
      const xi = s < 0 ? xb : xa;
      m.set(xi, hTop - 1, f.az1 + 1, o.hand ?? skin);
    }
    if (o.puff) { // puffy short sleeve
      const pc = o.sleeve;
      for (let y = o.sleeveY; y <= f.shY - 1; y++) for (let x = xa - (s < 0 ? 1 : 0); x <= xb + (s > 0 ? 1 : 0); x++) for (let z = f.az0 - 1; z <= f.az1 + 1; z++) {
        if (m.has(x, y, z) && !(x === xo + s || z < f.az0 || z > f.az1)) continue;
        const ex = x === xo + s, ez = z < f.az0 || z > f.az1;
        if (ex && ez) continue;
        if (x === (s < 0 ? xb : xa) && ez) continue; // keep the inner side flush with the torso
        m.set(x, y, z, y === o.sleeveY ? (o.cuff ?? shade(pc, 0.9)) : pc);
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
  sleepy: { rows: ['KK'], oy: -1 },
  gyaru: { rows: ['LKKL', 'WIK.', 'IIw.', 'LL..'], ox: -1, oy: 1 },
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
  wavy: ['M.M.M', '.M.M.'],
  sigh: ['.MM', 'M..'],
};

/**
 * o: skin, eyes (style), iris, lash, eyeX (inner column of the right eye), mouth, blush (colour|false),
 *    brows (colour|false), browDY, nose (bool), mouthC, freckles
 */
function face(h, f, o) {
  const skin = o.skin ?? C.skin;
  const iris = o.iris ?? 0x5b3424;
  const L = {
    K: o.eyeC ?? K, W: WH, w: mix(iris, WH, 0.6), I: iris, i: shade(iris, 1.45), L: o.lash ?? K, D: shade(skin, 0.82), S: shade(skin, 0.9),
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
  h.project(rowsR, L, ex + ox, ey + oy);
  h.project(rowsL, L, -ex - ox - w + 1, ey + oy);
  if (o.brows) {
    const by = ey + 2 + (o.browDY ?? 0);
    const bc = { B: o.brows };
    const br = o.browShape ?? ['BB'];
    h.project(br, bc, ex, by);
    h.project(br.map((r) => [...r].reverse().join('')), bc, -ex - br[0].length + 1, by);
  }
  if (o.blush !== false) {
    const bw = o.blushW ?? 2;
    h.project(['B'.repeat(bw)], L, ex + 1, ey - 3 + (o.blushDY ?? 0));
    h.project(['B'.repeat(bw)], L, -ex - bw, ey - 3 + (o.blushDY ?? 0));
  }
  if (o.nose) h.project(['D'], L, 0, ey - 2);
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
  rbox(h, -f.hw, f.hy0, f.hz0, f.hw, f.hy1, f.hz1, f.hr, (x, y, z) => (y <= f.hy0 + 1 && z < 2 ? shade(skin, 0.95) : skin));
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
 * z: { bangs(x) -> y, side, ear, back, vol (shell thickness), top (extra height) }
 */
function hairCap(h, f, hc, z) {
  const vol = z.vol ?? 1, top = z.top ?? 1;
  const skull = rtest(-f.hw, f.hy0, f.hz0, f.hw, f.hy1, f.hz1, f.hr);
  const outer = rtest(-f.hw - vol, f.hy0 - 3, f.hz0 - vol, f.hw + vol, f.hy1 + top, f.hz1 + 1, f.hr + vol, f.hr + vol + 1);
  const bot = (x, zz) => {
    const ax = Math.abs(x);
    if (zz >= 1 && ax <= f.hw - 2) return z.bangs(x); // face side: fringe line
    if (zz >= 1) return z.side ?? z.ear; // temples / side locks
    if (zz >= -2 && ax >= f.hw - 1) return z.ear; // over the ears
    return z.back;
  };
  const col = hairColor(f, hc, z);
  h.shape(-f.hw - vol, f.hy0 - 3, f.hz0 - vol, f.hw + vol, f.hy1 + top, f.hz1 + 1,
    (x, y, zz) => outer(x, y, zz) && !skull(x, y, zz) && y >= bot(x, zz) && (y >= f.hy0 + 1 || zz <= -3 || Math.abs(x) >= f.hw - 1) &&
      !(z.skip && z.skip(x, y, zz)), col);
  // the skull under the hair gets a darker hair colour (no skin peeking through diagonal gaps)
  h.paint(() => h.shape(-f.hw, f.hy0, f.hz0, f.hw, f.hy1, f.hz1, (x, y, zz) => skull(x, y, zz) && y > bot(x, zz) + (zz >= f.hz1 - 1 ? 0 : 0) && !(zz >= f.hz1 && Math.abs(x) <= f.hw - 2 && y <= z.bangs(x)), shade(hc, 0.7)));
  return bot;
}
function hairColor(f, hc, z = {}) {
  const lum = ((hc >> 16) & 255) * 0.3 + ((hc >> 8) & 255) * 0.59 + (hc & 255) * 0.11;
  const hi = z.hi ?? (lum < 90 ? mix(hc, 0x8c96c0, 0.28) : mix(hc, WH, 0.28));
  const dk = shade(hc, 0.8);
  return (x, y, zz) => {
    let c = hc;
    const strand = hash(x, 0, zz > 0 ? 1 : zz, 11);
    if (strand < 0.3) c = shade(hc, 0.9);
    else if (strand > 0.85) c = shade(hc, 1.08);
    if (y < f.hy0 + 4) c = mix(c, dk, 0.5);
    // glossy "angel ring" highlight: two short arcs on the crown (front) and one on the back
    const ax = Math.abs(x), ring = f.hy1 - 1 + (z.ringDY ?? 0);
    if (zz >= 2 && ax >= 2 && ax <= 5 && y === ring - (ax >= 4 ? 1 : 0)) c = hi;
    else if (zz <= -3 && ax <= 4 && y === ring - 1 - (ax >= 3 ? 1 : 0) && hash(x, 2, zz, 4) < 0.8) c = hi;
    return c;
  };
}
/** Jagged bangs helper: base row + per-|x| offsets. */
const bangsFrom = (base, offs) => (x) => base + (offs[Math.min(Math.abs(x), offs.length - 1)] ?? 0);

/** Long hair curtain hanging down the back (head part). */
function hairBack(h, f, hc, { bottom, width = f.hw, z0 = f.hz0 - 1, z1 = -3, top = f.hy0 + 4, taper = 2, flare = 0, col = null }) {
  const cfn = col ?? hairColor(f, hc);
  for (let y = bottom; y <= top; y++) {
    const t = (top - y) / Math.max(1, top - bottom);
    const hwid = Math.round(width + 1 - taper * t + flare * Math.sin(t * Math.PI));
    const zb = Math.round(z0 + t * 1.5), zf = y >= f.hy0 ? Math.min(z1, -1) : z1;
    for (let x = -hwid; x <= hwid; x++) {
      const ends = bottom + (hash(x, 0, 0, 9) < 0.45 ? 1 : 0) + (Math.abs(x) === hwid ? 1 : 0);
      if (y < ends) continue;
      for (let z = zb; z <= zf; z++) {
        if (Math.abs(x) === hwid && (z === zb || z === zf)) continue;
        if (!h.has(x, y, z)) h.set(x, y, z, cfn(x, y, z));
      }
    }
  }
}
/** Hanging tail of hair (twin-tails / ponytails) as a chain of ellipsoids. */
function hairTail(h, f, hc, x, y, z, len, r, { dx = 0, dz = 0, tie = null } = {}) {
  const cfn = hairColor(f, hc);
  for (let i = 0; i <= len; i++) {
    const t = i / len;
    const rr = r * (t < 0.25 ? 0.8 + t : 1.05 - 0.75 * t * t);
    const cx = x + dx * Math.sin(t * Math.PI * 0.8), cz = z + dz * t;
    h.ellipsoid(cx, y - i, cz, rr, 0.7, rr, (xx, yy, zz) => cfn(xx, yy, zz));
  }
  if (tie) h.ellipsoid(x, y + 1, z, r * 0.7, 0.6, r * 0.7, tie);
}

// ----------------------------------------------------------------------------- accessories
/** Glasses: raised frame around both eyes + temples to the ears. */
function glasses(h, f, o = {}) {
  const fc = o.c ?? 0x2a2a30, ex = o.eyeX ?? 3, ey = f.eyeY + (o.eyeDY ?? 0);
  const z = f.hz1 + 1;
  const round = o.round;
  sides((s) => {
    const xa = s < 0 ? -ex - 2 : ex - 1, xb = s < 0 ? -ex + 1 : ex + 2;
    for (let x = xa; x <= xb; x++) for (let y = ey - 3; y <= ey + 1; y++) {
      const edge = x === xa || x === xb || y === ey - 3 || y === ey + 1;
      if (!edge) continue;
      if (round && (x === xa || x === xb) && (y === ey - 3 || y === ey + 1)) continue;
      h.set(x, y, z, fc);
    }
    if (o.lens) for (let x = xa + 1; x < xb; x++) for (let y = ey - 2; y <= ey; y++) h.set(x, y, z, glass(o.lens));
    // temple arm
    const xs = s * (f.hw + 1);
    for (let zz = 0; zz <= f.hz1; zz++) h.set(s * (f.hw - (zz > 4 ? (zz - 4) : 0) + (zz > 4 ? 0 : 1)), ey, zz, fc);
    h.set(xs, ey, -1, fc);
  });
  for (let x = -ex + 2; x <= ex - 2; x++) h.set(x, ey, z, fc); // bridge
}

/** Rectangle bag with a handle, hanging from the hand of arm m (side s). */
function handBag(m, f, s, o) {
  const xm = s * f.ax, hw = o.thick ?? 1;
  const top = f.handY - 1 - (o.drop ?? 1), H = o.h ?? 8, len = o.len ?? 9;
  const z0 = -Math.floor(len / 2) + (o.dz ?? 0), z1 = z0 + len - 1;
  const c = o.c;
  for (let y = top - H + 1; y <= top; y++) for (let z = z0; z <= z1; z++) for (let x = xm - hw; x <= xm + hw; x++) {
    if ((z === z0 || z === z1) && (y === top || y === top - H + 1) && o.round !== false) continue;
    let cc = c;
    if (y === top) cc = shade(c, 1.08);
    if (y === top - H + 1) cc = shade(c, 0.85);
    if (o.flap && y >= top - 2 && Math.abs(x - xm) === hw && x * s > xm * s) cc = shade(c, 0.9);
    if (o.col) cc = o.col(x, y, z, cc) ?? cc;
    m.set(x, y, z, cc);
  }
  // handle from the fist down to the bag
  const hc = o.handle ?? shade(c, 0.8);
  for (let y = top + 1; y <= f.handY; y++) { m.set(xm, y, -1, hc); m.set(xm, y, 1, hc); }
  return { top, z0, z1, bottom: top - H + 1 };
}

/** Backpack on the torso (behind). */
function backpack(p, f, o) {
  const t = p.torso;
  const c = o.c, dk = shade(c, 0.82);
  const top = o.top ?? f.shY - 1, bot = o.bottom ?? f.waistY;
  const hw = o.hw ?? f.tw - 1, z1 = f.tz0 - 1, z0 = z1 - (o.depth ?? 3) + 1;
  rbox(t, -hw, bot, z0, hw, top, z1, o.r ?? 1, (x, y, z) => {
    if (y === bot) return dk;
    if (o.pocket && y <= bot + (o.pocketH ?? 3) && Math.abs(x) <= hw - 1 && z === z0) return o.pocket;
    return c;
  });
  if (o.pocket) rbox(t, -hw + 1, bot + 1, z0 - 1, hw - 1, bot + (o.pocketH ?? 3), z0 - 1, 0, o.pocket);
  // straps over the shoulders and down the front
  const sc = o.strap ?? dk;
  sides((s) => {
    const x = s * (f.tw - 1);
    for (let z = f.tz0; z <= f.tz1; z++) t.set(x, f.shY + 0, z, sc);
    t.set(x, f.shY + 0, z1, sc);
    for (let y = f.waistY + 2; y <= f.shY; y++) t.set(x, y, f.tz1 + 1, sc);
    t.set(x, f.waistY + 2, f.tz1 + 1, shade(sc, 0.8));
  });
  return { z0, z1, top, bot, hw };
}

// ----------------------------------------------------------------------------- colour sets
const SKINS = { fair: 0xffe0c8, light: C.skin, warm: 0xf6c9a4, tan: 0xdea578, deep: 0xb07850, dark: 0x8a5a3c };
const HAIR = {
  black: 0x2a2228, darkbrown: 0x4a3024, brown: 0x7a4a2e, chestnut: 0x8e5636, blonde: 0xf2d38a,
  bleach: 0xf6dfa4, grey: 0xb8b4b4, white: 0xeeeae6, lavender: 0xc9b6e4, pink: 0xffa8c8, blue: 0x7cc0f0,
  ginger: 0xd9773a, ash: 0x8c8a8e,
};

// ============================================================================ characters
const F_GIRL = frame({ hipY: 16, shY: 29 });
const F_BOY = frame({ hipY: 17, shY: 30 });
const F_MAN = frame({ hipY: 17, shY: 31 });
const F_KID = frame({ hipY: 9, pelvis: 2, legIn: 1, legOut: 3, shY: 19, tw: 3, tz0: -2, tz1: 1, armIn: 4, armOut: 6, handY: 8, hw: 7, hh: 13, hz0: -6, hz1: 5, eyeRow: 5, waistY: 11 });

export default {
  // ------------------------------------------------------------------------ schoolgirl
  schoolgirl: {
    name: 'Schoolgirl', voxel: 0.032, variants: 3, rig: rigOf(F_GIRL),
    build(p, v) {
      const f = F_GIRL;
      const V = [
        { skin: SKINS.light, hair: HAIR.black, style: 'hime', collar: C.navy, scarf: C.red, skirt: C.navy, socks: C.navy, sockY: 9, bag: 'hand' },
        { skin: SKINS.fair, hair: HAIR.chestnut, style: 'twin', collar: C.navy, scarf: 0xe8506a, skirt: 0x5a6274, socks: WH, sockY: 6, bag: 'pack', tie: C.pink },
        { skin: SKINS.warm, hair: HAIR.darkbrown, style: 'bob', collar: 0x6a9ad0, scarf: C.navy, skirt: 0x3c5a8a, socks: WH, sockY: 8, bag: 'handL' },
      ][v];
      const top = WH;
      legs(p, f, { skin: V.skin, socks: V.socks, sockY: V.sockY, shoe: 'loafer', shoeC: 0x6a3a22, soleC: 0x2a1a14 });
      torso(p, f, { skin: V.skin, col: outfit(f, { top, bottom: V.skirt }) });
      skirt(p, f, { c: V.skirt, hemY: 10, flare: 2 });
      arms(p, f, { skin: V.skin, sleeve: top, sleeveY: f.handY + 3, cuff: V.collar, elbowFold: true,
        col: (x, y, z, c) => (y === f.handY + 4 ? WH : y === f.handY + 5 ? V.collar : null) });
      // sailor collar: square flap on the back + V in front
      const t = p.torso;
      for (let y = f.shY - 6; y <= f.shY; y++) for (let x = -f.tw; x <= f.tw; x++) {
        const edge = y === f.shY - 6 || Math.abs(x) === f.tw;
        const stripe = !edge && (y === f.shY - 5 || Math.abs(x) === f.tw - 1);
        t.set(x, y, f.tz0 - 1, stripe ? WH : V.collar);
      }
      for (let x = -f.tw + 1; x <= f.tw - 1; x++) t.set(x, f.shY, f.tz0 - 1 + 0, V.collar);
      for (let y = f.shY - 6; y <= f.shY; y++) {
        const d = f.shY - y; // V narrows downwards
        const xin = Math.max(0, f.tw - 1 - d);
        for (let x = -f.tw; x <= f.tw; x++) {
          const ax = Math.abs(x);
          if (ax < xin) continue;
          if (ax > xin + 2 && y < f.shY) continue;
          t.set(x, y, f.tz1, ax === xin + 1 && y < f.shY ? WH : V.collar);
        }
        for (let x = -xin + 1; x <= xin - 1; x++) if (y > f.shY - 4) t.set(x, y, f.tz1, V.skin);
      }
      // scarf knot + tails
      t.box(-1, f.shY - 6, f.tz1 + 1, 1, f.shY - 5, f.tz1 + 1, V.scarf);
      t.set(0, f.shY - 5, f.tz1 + 2, shade(V.scarf, 0.85));
      t.box(-1, f.shY - 9, f.tz1 + 1, -1, f.shY - 7, f.tz1 + 1, V.scarf);
      t.box(1, f.shY - 9, f.tz1 + 1, 1, f.shY - 7, f.tz1 + 1, shade(V.scarf, 0.9));
      t.set(-1, f.shY - 9, f.tz1 + 1, shade(V.scarf, 0.8));
      // head + hair
      const h = head(p, f, { skin: V.skin, eyes: 'lash', iris: v === 2 ? 0x3a5a8a : 0x4a2a1c, mouth: v === 1 ? 'open' : 'smile', ears: V.style !== 'hime' });
      if (V.style === 'hime') {
        hairCap(h, f, V.hair, { bangs: bangsFrom(f.eyeY + 2, [0, 0, 1, 0, 0, 1, 0, -1]), side: f.hy0 - 3, ear: f.hy0 - 3, back: f.hy0 - 3, vol: 1 });
        hairBack(h, f, V.hair, { bottom: f.waistY + 1, z1: -3, taper: 2 });
        sides((s) => h.box(s * (f.hw + 1), f.hy0 - 6, 2, s * (f.hw), f.hy0 - 1, 4, V.hair));
        h.set(-3, f.hy1 + 2, 2, V.hair).set(-3, f.hy1 + 3, 1, V.hair); // ahoge
      } else if (V.style === 'twin') {
        hairCap(h, f, V.hair, { bangs: bangsFrom(f.eyeY + 2, [1, 0, 0, 1, 0, 0, -1, -2]), side: f.eyeY - 3, ear: f.eyeY + 1, back: f.hy0 + 1 });
        sides((s) => hairTail(h, f, V.hair, s * (f.hw + 2), f.hy1 - 3, -2, 15, 2.6, { dx: s * 1.2, dz: -1, tie: V.tie }));
      } else {
        hairCap(h, f, V.hair, { bangs: bangsFrom(f.eyeY + 2, [1, 1, 0, 0, 1, 0, -1, -2]), side: f.hy0 - 1, ear: f.hy0 - 1, back: f.hy0 - 1, vol: 1 });
        h.box(2, f.eyeY + 3, f.hz1 + 2, 4, f.eyeY + 3, f.hz1 + 2, C.yellow); // hair clip
      }
      // bag
      if (V.bag === 'hand' || V.bag === 'handL') {
        const s = V.bag === 'hand' ? 1 : -1;
        const m = s > 0 ? p.armR : p.armL;
        const bc = V.bag === 'hand' ? 0x2a2426 : 0x6a4026;
        const b = handBag(m, f, s, { c: gloss(bc), h: 8, len: 10, thick: 1 });
        m.set(s * f.ax + s * 2, b.top - 3, 0, metal(C.gold));
        m.set(s * f.ax + s * 2, b.top - 4, 0, metal(C.gold));
      } else {
        backpack(p, f, { c: 0xe9d7b8, strap: 0xc4a77e, pocket: 0xd8c09a, hw: 3 });
        // tiny capsule-toy charm
        t.set(2, f.shY - 1, f.tz0 - 5, metal(C.silver));
        t.sphere(2, f.shY - 3, f.tz0 - 5, 1, C.pink);
      }
      finish(p, f);
    },
  },

  // ------------------------------------------------------------------------ salaryman
  salaryman: {
    name: 'Salaryman', voxel: 0.031, variants: 3, rig: rigOf(F_MAN),
    build(p, v) {
      const f = F_MAN;
      const V = [
        { skin: SKINS.light, suit: 0x2c3448, tie: C.red, hair: HAIR.black, specs: false, case: 0x2a2220 },
        { skin: SKINS.warm, suit: 0x5a5c62, tie: 0x2f5fb0, hair: HAIR.darkbrown, specs: true, case: 0x6a4428 },
        { skin: SKINS.light, suit: 0x26262a, tie: 0x6a8c3a, hair: HAIR.ash, specs: false, case: 0x1e1e22 },
      ][v];
      const shirt = WH;
      legs(p, f, { skin: V.skin, pants: V.suit, hem: true, crease: true, shoe: 'loafer', shoeC: 0x2a1c16, soleC: 0x141010 });
      torso(p, f, { skin: V.skin, col: outfit(f, { top: V.suit, bottom: V.suit, belt: 0x1a1414 }) });
      arms(p, f, { skin: V.skin, sleeve: V.suit, sleeveY: f.handY + 3, cuff: shirt, elbowFold: true });
      const t = p.torso;
      // shirt V + tie + lapels
      for (let y = f.shY - 6; y <= f.shY; y++) {
        const d = f.shY - y, xin = Math.max(0, 3 - Math.floor(d / 2));
        for (let x = -xin; x <= xin; x++) t.set(x, y, f.tz1, shirt);
        sides((s) => t.set(s * (xin + 1), y, f.tz1, shade(V.suit, 1.15)));
      }
      t.box(-1, f.shY - 1, f.tz1, 1, f.shY, f.tz1, shirt);
      t.set(0, f.shY - 1, f.tz1 + 1, V.tie);
      for (let y = f.waistY + 2; y <= f.shY - 2; y++) t.set(0, y, f.tz1 + 1, y === f.waistY + 2 ? shade(V.tie, 0.8) : V.tie);
      for (let y = f.waistY + 3; y <= f.shY - 3; y++) t.set(0, y, f.tz1 + 1, (y % 3 === 0) ? shade(V.tie, 0.75) : V.tie);
      t.set(1, f.waistY + 3, f.tz1, metal(C.gold));
      t.set(1, f.waistY + 5, f.tz1, metal(C.gold));
      t.set(3, f.shY - 3, f.tz1, WH); // pocket square
      const h = head(p, f, { skin: V.skin, eyes: 'tired', iris: 0x3a2a22, mouth: v === 2 ? 'sigh' : 'flat', brows: shade(V.hair, 0.9), browDY: 1, blush: false });
      hairCap(h, f, V.hair, { bangs: (x) => (x < -1 ? f.eyeY + 3 : x < 2 ? f.eyeY + 5 : f.eyeY + 6), side: f.eyeY + 1, ear: f.eyeY + 1, back: f.hy0 + 1 });
      if (V.specs) glasses(h, f, { c: 0x3a3a44 });
      const b = handBag(p.armR, f, 1, { c: gloss(V.case), h: 7, len: 11, thick: 1, handle: 0x1a1414 });
      p.armR.set(f.ax + 2, b.top - 1, 0, metal(C.silver));
      finish(p, f);
    },
  },

  // ------------------------------------------------------------------------ kid
  kid: {
    name: 'Kid', voxel: 0.028, variants: 3, rig: rigOf(F_KID),
    build(p, v) {
      const f = F_KID;
      const V = [
        { skin: SKINS.light, shirt: C.sky, shorts: C.navy, hair: HAIR.black, rand: 0x2a2224, hat: C.yellow },
        { skin: SKINS.fair, shirt: C.pink, shorts: 0x8a6a9a, hair: HAIR.darkbrown, rand: 0xd23a3a, hat: C.yellow },
        { skin: SKINS.warm, shirt: C.lime, shorts: 0x6a5240, hair: HAIR.brown, rand: 0x2a4a8a, hat: C.red },
      ][v];
      legs(p, f, { skin: V.skin, pants: V.shorts, pantsY: f.hipY - 3, hem: true, socks: WH, sockY: 4, shoe: 'sneaker', shoeC: WH, accent: V.rand });
      torso(p, f, { skin: V.skin, col: outfit(f, { top: V.shirt, bottom: V.shorts, folds: false }) });
      arms(p, f, { skin: V.skin, sleeve: V.shirt, sleeveY: f.shY - 3, cuff: shade(V.shirt, 0.9) });
      const h = head(p, f, { skin: V.skin, eyes: 'round', iris: 0x3a2418, mouth: 'open', eyeX: 2 });
      hairCap(h, f, V.hair, { bangs: bangsFrom(f.eyeY + 2, [0, 1, 0, 1, 0, -1, -2]), side: f.eyeY - 1, ear: f.eyeY + 1, back: f.hy0 + 1 });
      backpack(p, f, { c: gloss(V.rand), top: f.shY + 1, bottom: f.waistY - 1, depth: 4, hw: 3 });
      finish(p, f);
    },
  },
};
