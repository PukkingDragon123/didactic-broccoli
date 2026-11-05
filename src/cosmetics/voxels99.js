// Voxel models for the 1999 closet (src/cosmetics/more.js), in the same frames as src/cosmetics/voxels.js: head pieces in
// head units (1 voxel = 1/20 of the head height, head bone at the origin, +z = the face, +x = the wearer's left; chin -4,
// eyes 6, brows 8, hair line 13.2, crown 16, cranium centre z 2.4, face plane z 10.8). Glasses and face masks sit in the
// "eyes" frame (origin at eye level, lenses at z 12); side-worn masks share the kitsune mask's frame; body pieces are metric
// voxels (V = height / 140) built per wearer. Every builder returns a VoxelModel.
import { VOX } from '../people/cosmetics.js';
import { glass } from '../voxel/VoxelModel.js';
import { VX, SHAPES } from './voxels.js';

const { vm, each, rbox, front, hash, hood, gloss, INK } = VOX;
const { blob, cap, band } = SHAPES;
const CREAM = 0xfaf4e6;
const dec = (v) => v & 0xffffff;
function shade(c, k) { const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255; const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return (f(r) << 16) | (f(g) << 8) | f(b); }
/** A copy of a model with its colours swapped (map: { from: to }, matched on the colour). */
function recolour(v, map, jitter = 0.02) {
  const out = vm(jitter);
  v.forEach((x, y, z, c) => { const k = map[dec(c)]; out.set(x, y, z, k ?? c); });
  return out;
}

export const V99 = {
  // ================================================================== hats
  /** The Duck Head: a big round yellow duck head you wear over your own, an orange bill, shiny eyes, a tuft. */
  duck() {
    const Y = 0xf8d64a, Y2 = 0xfce67e, Y3 = 0xe8b832, BILL = 0xf59a2c, BILL2 = 0xd8781e;
    const v = vm(0.025);
    blob(v, [0, 7.4, 2.6], [11.2, 12.2, 11.4], (x, y, z, q) => {
      if (y < -4.6 && Math.hypot(x, z - 2.4) < 6.4) return null; // the neck hole
      if (q < 0.7) return null; // hollow (the inside never shows)
      return y > 14 || (x + z > 12 && y > 9) ? Y2 : y < -1 && q > 0.86 ? Y3 : hash(x, y, z, 21) > 0.9 ? Y3 : Y;
    });
    // the bill: a wide flat upper bill over a lower one, a darker line between, two nostril dots
    blob(v, [0, 4.6, 15.6], [6.4, 2.2, 6], (x, y, z) => (z < 11 ? null : y < 4 ? BILL2 : (x + z) % 7 === 0 ? shade(BILL, 1.06) : BILL));
    blob(v, [0, 2.2, 14.2], [5, 1.5, 4.6], (x, y, z) => (z < 11 ? null : BILL2));
    v.set(-2, 6, 19, BILL2).set(2, 6, 19, BILL2);
    // eyes: glossy black with a cream glint; pink cheeks
    for (const sx of [-1, 1]) {
      each(sx * 5 - 1, sx * 5 + 1, 9, 12, 8, 14, (x, y, z) => { if (Math.abs(x - sx * 5) + Math.abs(y - 10.5) * 0.7 <= 1.6) front(v, x, y, gloss(INK), 4, 16); });
      front(v, sx * 5 - sx, 12, CREAM, 4, 16);
      front(v, sx * 8, 6, 0xf4a0a0, -2, 16); front(v, sx * 8 + sx, 6, 0xf4a0a0, -2, 16);
    }
    // a tuft of three feathers on top
    for (const [x, h, lean] of [[-1, 4, -0.5], [0, 5, 0], [1, 4, 0.5]]) for (let i = 0; i < h; i++) v.set(x + Math.round(lean * i), 19 + i, 2 - Math.round(i * 0.6), i === h - 1 ? Y3 : Y2);
    return v;
  },
  /** Hisshō hachimaki: a white headband with a red rising sun and brushed marks, tied at the back. */
  hachimaki() {
    const v = vm(0.02);
    band(v, 10.5, 12.5, (x, y, z) => (hash(x, y, z, 3) > 0.92 ? 0xece6d8 : CREAM), 0.5);
    for (let x = -2; x <= 2; x++) for (let y = 10; y <= 13; y++) if (Math.hypot(x, (y - 11.5) * 1.1) < 2.3) front(v, x, y, 0xd42a2a, 4, 16);
    for (const sx of [-1, 1]) for (const [dx, y] of [[4, 12], [5, 11], [4, 11], [6, 12], [6, 11]]) front(v, sx * dx, y, 0x2a2224, 2, 16);
    each(-1, 1, 10, 12, -10, -8, (x, y, z) => v.set(x, y, z, 0xece6d8)); // knot
    for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) v.set(sx * (1 + Math.round(i * 0.5)), 10 - i, -9 - Math.round(i * 0.4), i % 2 ? 0xece6d8 : CREAM);
    return v;
  },
  /** Daruma hood: red papier-mâché round your face, a white face frame, black crane brows, gold whiskers. */
  daruma() {
    const R = 0xd8342e, R2 = 0xb82824, GOLD = 0xe8b440;
    const v = hood(vm(0.02), {
      col: R, rim: 0xf6f0e2, hole: [6.2, 7.9, 3.4], thick: 2.2,
      paint: (x, y, z, col, d, e) => {
        if (z > 3 && e < 2.7) return 0xf6f0e2; // the white face, a clean oval round the hole
        if (col !== R) return col;
        return hash(x >> 1, y >> 1, z >> 1, 5) > 0.9 ? R2 : col;
      },
    });
    // the brows (crane wings) arched over the face, gold whiskers either side of the chin, a gold rim on the face
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 5; i++) { front(v, sx * (1 + i), 12 + (i === 1 || i === 2 ? 1 : 0), INK, 4, 20); if (i > 0 && i < 4) front(v, sx * (1 + i), 13 + (i === 2 ? 1 : 0), INK, 4, 20); }
      for (let i = 0; i < 3; i++) front(v, sx * (6 - i), -2 - i, GOLD, 4, 20);
    }
    // a gold mark on the forehead (福, simplified to a few strokes)
    for (const [x, y] of [[-1, 18], [0, 18], [1, 18], [0, 17], [-1, 16], [1, 16], [-1, 15], [0, 15], [1, 15]]) front(v, x, y, GOLD, 0, 20);
    return v;
  },
  /** Capsule helmet: the top half of a gacha capsule (pink, glossy) with its cream seam ring and a star sticker. */
  capsuleHat() {
    const P = 0xff8ab4, P2 = 0xf06a9a, HI = 0xffb8d2;
    const v = vm(0.015);
    each(-11, 11, 8, 22, -9, 14, (x, y, z) => {
      const r = Math.hypot(x / 10.4, (y - 8.5) / 12, (z - 2.4) / 11.2);
      if (r > 1 || r < 0.86) return;
      const hi = x < -2 && y > 15 && z > 4 && x > -7;
      v.set(x, y, z, y <= 9 ? 0xf4ecdc : gloss(hi ? HI : y < 12 ? P2 : P));
    });
    each(-11, 11, 8, 9, -10, 15, (x, y, z) => { const r = Math.hypot(x / 10.8, (z - 2.4) / 11.6); if (r <= 1 && r > 0.9) v.set(x, y, z, 0xe8dcc4); });
    for (const [x, y] of [[4, 16], [3, 15], [5, 15], [4, 15], [3, 14], [5, 14], [2, 15], [6, 15]]) front(v, x, y, gloss(0xffd23f), 0, 20);
    return v;
  },
  /** A fisherman's bucket hat: faded khaki, a stitched band, a red-and-white spoon and a feather fly hooked on. */
  fishHat() {
    const K = 0x9a9868, K2 = 0x86845a, BAND = 0x6a5a3a;
    const v = vm(0.03);
    for (let y = 13; y <= 20; y++) each(-10, 10, y, y, -9, 14, (x, yy, z) => {
      const r = Math.hypot(x / (8.3 - (y - 13) * 0.12), (z - 2.4) / (9.5 - (y - 13) * 0.14));
      if (r > 1 || (r < 0.82 && y < 20)) return;
      v.set(x, y, z, y <= 14 ? BAND : y === 20 && r < 0.5 ? K2 : (x * 3 + y + z) % 5 === 0 ? K2 : K);
    });
    each(-14, 14, 10, 13, -12, 17, (x, y, z) => {
      const r = Math.hypot(x / 12.6, (z - 2.4) / 13.6);
      if (r > 1 || r < 0.66) return;
      const yy = 13 - Math.round((r - 0.66) * 7.5);
      if (y !== yy) return;
      v.set(x, y, z, r > 0.95 ? K2 : K);
    });
    // the lures on the left side of the crown
    for (const [x, y, z, c] of [[7, 17, 5, 0xd8342e], [7, 16, 5, CREAM], [7, 15, 5, 0xd8342e], [8, 17, 4, 0xc8c8d0], [7, 18, 3, 0xffd23f], [7, 19, 2, 0xffd23f], [8, 18, 2, 0x5aa04a], [7, 17, 2, 0x5aa04a]]) v.set(x, y, z, x === 8 && c === 0xc8c8d0 ? gloss(c) : c);
    return v;
  },
  /** A folded newspaper kabuto for Children's Day: grey print, a red headline, the two horn flaps up at the front. */
  kabuto() {
    const P = 0xeae4d2, LINE = 0x9a96a0, RED = 0xc8302a;
    const v = vm(0.02);
    const ink = (x, y) => (y % 2 === 0 && (x + 40) % 7 !== 0 ? LINE : null);
    for (let y = 13; y <= 27; y++) {
      const hw = 11 * (1 - (y - 13) / 15) + 0.6;
      each(-12, 12, y, y, -7, 12, (x, yy, z) => {
        if (Math.abs(x) > hw) return;
        const zf = 11 - (y - 13) * 0.35, zb = -6 + (y - 13) * 0.3;
        if (z > zf || z < zb) return;
        const face = z > zf - 1 || z < zb + 1 || Math.abs(x) > hw - 1;
        v.set(x, y, z, face && y > 18 && y < 23 && x > -6 && x < 2 && z > zf - 1 ? RED : face ? ink(x, y) ?? P : P);
      });
    }
    // the folded cuff at the front, and the horns standing up and out from it
    each(-12, 12, 12, 14, 9, 12, (x, y, z) => { if (Math.abs(x) <= 12 - (y - 12)) v.set(x, y, z, y === 14 ? 0xd8d2c0 : P); });
    for (const sx of [-1, 1]) for (let i = 0; i < 9; i++) {
      const w = Math.max(0, 3 - i * 0.35);
      for (let k = -Math.round(w); k <= Math.round(w); k++) v.set(sx * (5 + Math.round(i * 0.55)) + k, 15 + i, 12 - Math.round(i * 0.15), (i + k) % 3 === 0 ? LINE : P);
    }
    return v;
  },
  /** A sakura hair clip: a five-petal blossom and a bud on a little bar (built facing +z; worn on the side). */
  sakuraClip() {
    const PK = 0xf6bcd0, PK2 = 0xe896b4, Y = 0xf2c84a;
    const v = vm(0.02);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      blob(v, [Math.cos(a) * 2.6, -Math.sin(a) * 2.6, 0], [1.8, 1.8, 0.8], (x, y) => (Math.hypot(x - Math.cos(a) * 3.6, y + Math.sin(a) * 3.6) < 0.8 ? null : (x + y) % 3 === 0 ? PK2 : PK));
    }
    v.set(0, 0, 1, Y).set(1, 0, 1, Y).set(0, 1, 1, Y).set(-1, 0, 1, 0xd8a83a);
    blob(v, [5, -3, 0], [1.2, 1.4, 1], PK2);
    each(-3, 6, -2, -2, -1, -1, (x, y, z) => v.set(x, y, z, 0x8a6a5a));
    return v;
  },
  /** A kagami mochi hat: two stacked rice cakes on a paper skirt, a bitter orange with its leaf on top. */
  kagami() {
    const M = 0xfaf6ea, M2 = 0xe8e2d0, OR = 0xf08a2a;
    const v = vm(0.03);
    each(-8, 8, 14, 14, -6, 11, (x, y, z) => { if (Math.max(Math.abs(x), Math.abs(z - 2.4)) <= 8) v.set(x, y, z, Math.max(Math.abs(x), Math.abs(z - 2.4)) === 8 ? 0xd8302a : CREAM); });
    blob(v, [0, 17, 2.4], [7, 2.6, 7], (x, y, z, q) => (y < 15 ? null : q > 0.8 && y < 17 ? M2 : M));
    blob(v, [0, 20.6, 2.4], [5.4, 2.2, 5.4], (x, y, z, q) => (y < 19 ? null : q > 0.8 && y < 20.5 ? M2 : M));
    blob(v, [0, 24, 2.4], [2.6, 2.2, 2.6], (x, y) => (y > 25 ? 0xf4a03e : OR));
    v.set(0, 26, 2, 0x5a8a3a).set(1, 26, 3, 0x6aa04a).set(2, 26, 3, 0x6aa04a).set(2, 25, 4, 0x5a8a3a);
    return v;
  },
  /** A gambler's green visor: an elastic band and a see-through green bill. */
  visor() {
    const v = vm(0.01);
    band(v, 11, 12, (x, y, z, a) => (Math.abs(a) > 2.2 ? 0x2a2a2a : gloss(0x2a7a4a)), 0.6);
    each(-10, 10, 12, 12, 6, 19, (x, y, z) => {
      const r = Math.hypot(x / 9.6, (z - 6) / 12.6);
      if (r > 1 || z < 9) return;
      if (rbox(x, 11, z, [0, 6.2, 2.2], [7.5, 10.8, 8.9], 4.4) < 0.6) return;
      v.set(x, y, z, r > 0.92 ? gloss(0x2a7a4a) : glass(0x5ad08a));
    });
    return v;
  },
  /** A Christmas-cake Santa hat (the konbini part-timers' one): red felt flopping over, a fur band, a pompom. */
  santa() {
    const R = 0xd8342e, R2 = 0xb02a28, FUR = 0xf6f0e2, FUR2 = 0xe2dccc;
    const v = vm(0.03);
    cap(v, { grow: 0.2, th: 1.6, y0: 11, col: (x, y) => (y <= 12 ? (hash(x, y, 0, 3) > 0.5 ? FUR : FUR2) : y > 20 ? R2 : R) });
    for (let i = 0; i < 12; i++) {
      const t = i / 11, cx = Math.round(t * t * 9), cy = 20 + Math.round(Math.sin(t * 2.4) * 5), r = 5.4 * (1 - t) + 1.2;
      blob(v, [cx, cy, 1.4 - t * 3], [r, r, r], (x, y, z) => (hash(x, y, z, 9) > 0.85 ? R2 : R));
    }
    blob(v, [10.5, 19, -1.4], [2.2, 2.2, 2.2], (x, y, z) => (hash(x, y, z, 4) > 0.5 ? FUR : FUR2));
    return v;
  },
  /** A chonmage wig: a shaved pate (in your own skin colour), side hair, the folded topknot tied with white cord. */
  chonmage(skin = 0xecc8aa) {
    const HAIR = 0x24202a, HAIR2 = 0x3a3442, sk2 = shade(skin, 0.92);
    const v = vm(0.02);
    cap(v, { th: 1.4, y0: 9, col: (x, y, z) => {
      const side = Math.abs(x) > 6.4 || z < -3 || y < 13;
      if (!side) return (x + z) % 5 === 0 ? sk2 : skin;
      return (x + y) % 4 === 0 ? HAIR2 : HAIR;
    }, keep: (x, y, z) => z < 9 || y > 13 });
    // the topknot: a bundle along the top of the head, folded forward, a white cord round its base
    each(-1, 1, 19, 21, -6, 6, (x, y, z) => { if (y === 21 && (z < -5 || z > 5)) return; v.set(x, y, z, z === -2 || z === -1 ? CREAM : (z + y) % 3 === 0 ? HAIR2 : HAIR); });
    each(-1, 1, 21, 22, 4, 7, (x, y, z) => v.set(x, y, z, HAIR));
    return v;
  },

  // ================================================================== glasses & masks (eyes frame)
  /** Tengu mask: a red face with fierce brows, gold eyes and a very long nose. */
  tengu() {
    const R = 0xd8382e, R2 = 0xb02a24, W = 0xf4ecdc, AU = 0xe8b440;
    const v = vm(0.015);
    for (let y = -11; y <= 7; y++) for (let x = -7; x <= 7; x++) {
      const w = y > 3 ? 7 - (y - 3) * 0.6 : y < -6 ? 7 - (-6 - y) * 0.9 : 7;
      if (Math.abs(x) > w + 0.3) continue;
      const zt = Math.round(13.4 - (x / (w + 0.6)) ** 2 * 2.6);
      for (let z = zt - 1; z <= zt; z++) v.set(x, y, z, z < zt ? R2 : R);
    }
    for (let i = 0; i <= 14; i++) {
      const r = 1.9 * (1 - i / 17) + 0.5, cy = -1.4 + i * 0.12, cz = 13.5 + i;
      each(-3, 3, -4, 3, Math.round(cz), Math.round(cz), (x, y, z) => { if (Math.hypot(x, y - cy) <= r) v.set(x, y, z, y > cy + r * 0.4 ? shade(R, 1.08) : R); });
    }
    for (const sx of [-1, 1]) {
      front(v, sx * 3, 1, gloss(AU), 6, 20); front(v, sx * 4, 1, gloss(AU), 6, 20); front(v, sx * 3, 0, gloss(INK), 6, 20);
      for (let i = 0; i < 6; i++) { const x = sx * (1 + i), y = 3 + Math.round(i * 0.5); front(v, x, y, W, 6, 20); front(v, x, y + 1, i > 2 ? W : 0xe2d8c8, 6, 20); }
      for (let i = 0; i < 4; i++) front(v, sx * (2 + i), -6 - (i > 1 ? 1 : 0), W, 6, 20); // the moustache
    }
    for (let x = -3; x <= 3; x++) for (let y = -11; y <= -8; y++) if (Math.abs(x) + (y + 11) * 0.5 < 3.4) front(v, x, y, (x + y) % 2 ? W : 0xe2d8c8, 6, 20); // beard
    for (let x = -2; x <= 2; x++) front(v, x, -7, 0x7a1a1a, 6, 20);
    return v;
  },
  /** Thick bottle-bottom specs: heavy black round frames, lenses drawn as rings. */
  gariben() {
    const F = gloss(0x1c1a20), v = vm(0.01);
    for (const sx of [-1, 1]) {
      each(-9, 9, -5, 5, 11, 12, (x, y, z) => {
        const r = Math.hypot(x - sx * 3.9, y - 0.4);
        if (r > 4.4) return;
        if (r > 3.2) { v.set(x, y, z, F); return; }
        if (z === 11) return;
        v.set(x, y, z, Math.floor(r * 1.6) % 2 ? glass(0xd8e4ec) : glass(0xa8bccc));
      });
      for (let z = 3; z <= 11; z++) v.set(sx * 8, 1, z, F);
    }
    v.set(0, 1, 12, F).set(0, 2, 12, F);
    return v;
  },
  /** Hay-fever kit: wraparound pollen goggles over the eyes and a pleated mask (spring 1999's commute). */
  kafun() {
    const v = VX.maskSurgical();
    const out = vm(0.01);
    v.forEach((x, y, z, c) => out.set(x, y, z, c));
    each(-8, 8, -3, 3, 9, 13, (x, y, z) => {
      const zc = Math.round(12.4 - (x / 8.4) ** 2 * 3.4);
      if (z !== zc) return;
      const rim = Math.abs(y) === 3 || Math.abs(x) === 8;
      out.set(x, y, z, rim ? 0xf2eee4 : glass(0xbcdcec));
    });
    for (const sx of [-1, 1]) for (let z = 2; z <= 9; z++) out.set(sx * 8, 1, z, 0x5a8ac8); // the strap
    return out;
  },
  /** Wraparound Y2K shades: one curved lens shifting purple to orange, a thin silver bar on top. */
  wrapShades() {
    const COL = [0x6a4ab8, 0x4a6ad8, 0x3a9ac8, 0x58b89a, 0xd8a83a, 0xe8683a];
    const v = vm(0.01);
    for (let x = -9; x <= 9; x++) {
      const z = Math.round(12.4 - (x / 9.4) ** 2 * 5.5);
      const c = COL[Math.min(COL.length - 1, Math.floor(((x + 9) / 19) * COL.length))];
      for (let y = -2; y <= 2; y++) if (!(Math.abs(x) > 7 && y === -2)) v.set(x, y, z, gloss(c));
      v.set(x, 3, z, gloss(0xc8ccd8));
    }
    v.set(0, -2, 12, null).set(0, -1, 12, null).set(-1, -2, 12, null).set(1, -2, 12, null);
    for (const sx of [-1, 1]) for (let z = 2; z <= 7; z++) v.set(sx * 9, 2, z, gloss(0xc8ccd8));
    return v;
  },
  /** A Kaiser moustache: a big waxed handlebar curling up at both ends. */
  kaiser() {
    const B = 0x3a2a22, B2 = 0x5a4232;
    const v = vm(0.02);
    for (const sx of [-1, 1]) for (let i = 0; i <= 8; i++) {
      const x = sx * i, y = -4.4 + (i > 4 ? (i - 4) * 0.9 : -i * 0.15), th = i < 3 ? 2 : i < 6 ? 1.5 : 1;
      for (let k = 0; k < th; k++) v.set(x, Math.round(y - k), 12 + (i < 4 ? 1 : 0), k ? B : i % 2 ? B2 : B);
    }
    v.set(-8, -0.6, 12, B).set(8, -0.6, 12, B).set(-7, 0.2, 12, B2).set(7, 0.2, 12, B2);
    return v;
  },
  /** A sukeban's black cloth mask. */
  blackMask() {
    const v = VX.maskSurgical();
    return recolour(v, { 0xf6f6f4: 0x3a3c52, 0xdcdcdc: 0x52546e, 0xf0f0ee: 0x2a2c3a }, 0.02);
  },

  // ================================================================== side-worn festival masks (kitsune frame)
  /** Okame: the round, smiling lady of good fortune. */
  okame() {
    return VX.maskBase(0xfaf2e4, (v) => {
      for (const sx of [-1, 1]) {
        front(v, sx * 2, 2, INK); front(v, sx * 3, 2, INK); front(v, sx * 4, 3, INK); // smiling eyes
        front(v, sx * 2, 6, INK); front(v, sx * 3, 6, INK); // high little brows
        each(sx * 5 - 1, sx * 5 + 1, -3, -1, 0, 6, (x, y, z) => front(v, x, y, 0xf4a0a8)); // round cheeks
      }
      front(v, 0, -4, 0xc8302a); front(v, -1, -4, 0xd84040); front(v, 1, -4, 0xd84040);
      front(v, 0, 5, 0xd84040); // the beauty mark
    });
  },
  /** Kurogitsune: the black fox, its gold eyes and red marks (the festival fox mask, recoloured). */
  kurogitsune() {
    const src = VOX.MODELS.kitsune();
    return recolour(src, { 0xf8f4ea: 0x2a2630, 0xe8e2d4: 0x1c1a22, [INK]: 0xf2c040, 0xe0b040: 0xc8302a }, 0.02);
  },
  /** A bootleg hero mask from a festival stall: silver face, red crest, big amber eyes that are not quite right. */
  heroMask() {
    return VX.maskBase(0xd8dce4, (v) => {
      for (const sx of [-1, 1]) {
        each(sx * 3 - 2, sx * 3 + 1, 0, 3, 0, 6, (x, y, z) => { if (Math.abs(x - sx * 2.5) + Math.abs(y - 1.5) * 1.2 < 2.6) front(v, x, y, gloss(0xf2a83a)); });
        front(v, sx * 5, 3, INK); front(v, sx * 1, 0, INK);
      }
      for (let y = -2; y <= 6; y++) front(v, 0, y, y > 3 ? 0xd8302a : 0xb8bcc8);
      for (let x = -3; x <= 3; x++) front(v, x, -5, 0x8a8e98);
      front(v, -5, -3, 0xd8302a); front(v, 5, -3, 0xd8302a);
    });
  },

  // ================================================================== body pieces (metric voxels, V = H / 140)
  /** An obi round the waist (half-widths X, Z and height h in voxels) with a butterfly bow at the back (or a plain knot). */
  obi(X, Z, h, col, col2, bow = true) {
    const v = vm(0.02);
    each(-X, X, 0, h, -Z, Z, (x, y, z) => {
      if (Math.abs(x) < X && Math.abs(z) < Z) return;
      v.set(x, y, z, y === Math.round(h / 2) ? col2 : (x + y * 3) % 7 === 0 ? shade(col, 0.9) : col);
    });
    if (bow) {
      for (const sx of [-1, 1]) blob(v, [sx * 6, h / 2 + 1, -Z - 3], [5.5, 4, 2.2], (x, y, z) => (Math.hypot(x - sx * 6, y - h / 2 - 1) < 1.5 && z > -Z - 3 ? null : (x + y) % 5 === 0 ? shade(col, 0.88) : col));
      each(-2, 2, Math.round(h / 2) - 2, Math.round(h / 2) + 3, -Z - 4, -Z - 1, (x, y, z) => v.set(x, y, z, col2));
      for (const sx of [-1, 1]) for (let i = 0; i < 8; i++) each(sx * 2, sx * 4, -i - 1, -i - 1, -Z - 2, -Z - 2, (x, y, z) => v.set(x + sx * Math.round(i * 0.3), y, z, col));
    } else {
      each(-2, 2, 0, h, -Z - 2, -Z - 1, (x, y, z) => v.set(x, y, z, col2));
      for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) v.set(sx * 2 + sx * Math.round(i * 0.3), -i, -Z - 1, col);
    }
    return v;
  },
  /** A loosened salaryman's tie: the knot pulled down, the blade swinging a little off-centre. */
  tie(col = 0xb02a30, col2 = 0x2a2a4a) {
    const v = vm(0.02);
    each(-1, 1, -2, 0, 0, 1, (x, y, z) => v.set(x, y, z, col));
    for (let i = 0; i < 26; i++) {
      const w = i < 3 ? 1 : i > 22 ? 2 - Math.floor((i - 22) / 2) : 2, x0 = Math.round(i * 0.06);
      for (let x = -w; x <= w; x++) v.set(x + x0, -3 - i, 0, (i + x + 40) % 6 < 2 ? col2 : col);
    }
    return v;
  },
  /** A fat, fluffy tanuki tail segment (len voxels long, radius r0 -> r1), brown with dark rings. */
  tanukiSeg(len, r0, r1, tip = false) {
    const v = vm(0.04);
    for (let d = 0; d <= len; d++) {
      const r = r0 + (r1 - r0) * (d / len), ring = (d % 6 < 2);
      each(-7, 7, -7, 7, -d, -d, (x, y, z) => {
        if (x * x + y * y > r * r + 0.3) return;
        v.set(x, y, z, tip && d > len - 3 ? 0x3a2a22 : ring ? 0x5a4030 : hash(x, y, z, 6) > 0.8 ? 0xa07a50 : 0x8a6644);
      });
    }
    return v;
  },
  /** A thief's furoshiki bundle: green cloth with white karakusa swirls, knotted on top. */
  furoshiki() {
    const G = 0x3a8a4a, G2 = 0x2a6a3a, W = 0xf2eee0;
    const v = vm(0.03);
    const swirl = (x, y, z) => { const a = Math.atan2(y, x) + Math.hypot(x, y) * 0.55 + z * 0.2; return Math.abs(((a / Math.PI * 2) % 2 + 2) % 2 - 1) < 0.16; };
    blob(v, [0, -1, -8], [10, 9.5, 7], (x, y, z) => (z > -2 ? null : swirl(x, y + 1, z) ? W : hash(x, y, z, 3) > 0.85 ? G2 : G));
    blob(v, [0, 9, -8], [3, 2.4, 2.6], (x, y, z) => (swirl(x, y, z) ? W : G2));
    for (const sx of [-1, 1]) blob(v, [sx * 4, 11, -8], [2.4, 1.4, 1.6], (x, y, z) => (swirl(x, y, z) ? W : G));
    for (const sx of [-1, 1]) for (let y = -6; y <= 11; y++) v.set(sx * 6, y, y > 8 ? Math.round(-1 + (y - 8) * 0.9) : -1, G2);
    return v;
  },
  /** The tanuki kigurumi's hood bits drawn over the face hole: a dark eye mask. */
};
