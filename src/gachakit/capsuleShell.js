// Capsule shells: the two moulded halves of a gashapon capsule, low-poly with smooth normals and a painted skin.
// Built the way the real ones are: a dome that sits inside the coloured half's lip (the seam ring, proud of the dome
// and knurled), four locking lugs on the lip with the dome's tabs between them, a flat spot to stand on with its foot
// ring, air holes round both poles, the injection gate in a dimple on top, finger dimples, and lettering embossed
// round the rim. Shapes: ball (48 / 65 / 75 mm), egg, daruma, can; every shape shares the same skins, mapped by
// (angle round, distance from the seam): a band patch up to SPLIT of the way to the pole, a polar cap patch beyond.
// Skins are neutral (tinted by the material colour): 'plastic' (opaque), 'clear' (alpha), 'tint' (denser clear, for
// coloured clear halves), 'frost' (frosted), 'secret' (black lacquer with gilt lettering and a wave pattern).
//   shellGeo(shape, r, part, detail) -> { geo, outer: [start, count] }   (outer: the outside surface, for the coat)
//   shellSkin(kind) -> Atlas texture
import * as THREE from 'three';
import { Atlas } from '../vehicles/atlas.js';
import { mask5, textW5 } from '../gfx/font5x7.js';
import { GeoS } from './geo.js';

const BW = 1016, BH = 150, CP = 180, CR = 86, SPLIT = 0.6;
const D2R = Math.PI / 180;

// ----------------------------------------------------------------------------- skins
// [colour, alpha] per tone: base, lite (raised / catching light), hi (the brightest edge), sh1, sh2 (shade), deep (holes)
const PAL = {
  plastic: { base: [0xe2e2e4, 255], lite: [0xf1f1f2, 255], hi: [0xffffff, 255], sh1: [0xc6c6d0, 255], sh2: [0xa4a4b4, 255], deep: [0x666674, 255], inner: [0xbcbcc8, 255] },
  clear: { base: [0xdfe8f4, 13], lite: [0xf2f6fc, 84], hi: [0xffffff, 170], sh1: [0x9fb0c6, 104], sh2: [0x7d8fa8, 150], deep: [0x44536a, 210], inner: [0xdfe8f4, 9] },
  tint: { base: [0xf0f0f4, 96], lite: [0xffffff, 150], hi: [0xffffff, 215], sh1: [0xc4c4d2, 150], sh2: [0x9a9ab0, 185], deep: [0x55556a, 225], inner: [0xe6e6ee, 84] },
  frost: { base: [0xf0f0f3, 214], lite: [0xfafafb, 232], hi: [0xffffff, 250], sh1: [0xcacad6, 234], sh2: [0xaaaaba, 244], deep: [0x70707e, 255], inner: [0xdcdce6, 226] },
  secret: { base: [0x1f1a1e, 255], lite: [0xd9ac3c, 255], hi: [0xfbe9a0, 255], sh1: [0x141014, 255], sh2: [0x0b090b, 255], deep: [0x000000, 255], inner: [0x2c2429, 255], line: [0x8a6a22, 255], gloss: [0x3a3138, 255] },
};

const glyphCache = new Map();
/** Forget the cached glyph masks (the kana font has just loaded: masks drawn before it were the fallback font's). */
export function clearGlyphs() { glyphCache.clear(); }
/** Pixel mask of a string in the game's kana font (for the few kanji stamped into skins and seals). */
export function glyphMask(str, size = 32, font = '"DotGothic16", monospace') {
  const k = str + size + font;
  if (glyphCache.has(k)) return glyphCache.get(k);
  const c = document.createElement('canvas');
  c.width = size * str.length + 8; c.height = size + 8;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.font = `${size}px ${font}`; g.textBaseline = 'top'; g.fillStyle = '#fff';
  g.fillText(str, 2, 2);
  const d = g.getImageData(0, 0, c.width, c.height).data, out = [];
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 120) out.push([x - 2, y - 2]);
  out.w = Math.ceil(g.measureText(str).width);
  glyphCache.set(k, out);
  return out;
}

const skins = new Map();
/** The painted skin of a kind: { A (Atlas), tex, V: { TB, BB, TC, BC, IN }, sw: { lite, base, sh1, sh2 } } */
export function shellSkin(kind = 'plastic', repaint = false) {
  if (skins.has(kind) && !repaint) return skins.get(kind);
  const P = PAL[kind], A = new Atlas(1024, 512);
  const V = { TB: A.patch('TB', BW, BH), BB: A.patch('BB', BW, BH), TC: A.patch('TC', CP, CP), BC: A.patch('BC', CP, CP), IN: A.patch('IN', 32, 32), SW: A.patch('SW', 64, 16) };
  const put = (v, i, j, t) => v.px(i, j, t[0], t[1]);
  const fill = (v, i0, j0, i1, j1, t) => v.box(i0, j0, i1, j1, t[0], t[1]);
  /** Raised lettering / marks: the body in `lite`, a bright edge up and to the left, a shade edge down and to the right. */
  const emboss = (v, mask, i, j) => {
    for (const [x, y] of mask) put(v, i + x + 1, j - y - 1, P.sh2);
    for (const [x, y] of mask) put(v, i + x - 1, j - y + 1, P.hi);
    for (const [x, y] of mask) put(v, i + x, j - y, P.lite);
  };
  const scaled = (mask, s) => { const out = []; for (const [x, y] of mask) for (let a = 0; a < s; a++) for (let b = 0; b < s; b++) out.push([x * s + a, y * s + b]); return out; };
  const text = (v, str, i, j, s = 2, align = 'left') => { const w = textW5(str, s); emboss(v, scaled(mask5(str), s), align === 'center' ? i - Math.round(w / 2) : i, j); return w; };
  const isKana = (str) => /[^\x00-\x7f]/.test(str);
  const wordW = (str) => (isKana(str) ? glyphMask(str, 16).w : textW5(str, 2));
  const word = (v, str, i, j) => { if (!isKana(str)) return text(v, str, i, j, 2); const m = glyphMask(str, 16); emboss(v, m, i, j + 1); return m.w; };
  const diamond = (r) => { const m = []; for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (Math.abs(x) + Math.abs(y) <= r) m.push([x + r, y + r]); return m; };
  /** A pressed-in dimple: shade inside its upper left, light on its lower right lip. */
  const dimple = (v, ci, cj, r) => {
    for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) {
      const d = Math.hypot(x, y);
      if (d > r + 0.5) continue;
      const side = (-x + y) / (r * 1.414); // > 0: upper left
      if (d > r - 1.2) put(v, ci + x, cj + y, side > 0.1 ? P.sh2 : P.hi);
      else if (side > 0.25 && d > r * 0.35) put(v, ci + x, cj + y, P.sh1);
      else put(v, ci + x, cj + y, kind === 'secret' ? P.gloss : P.base);
    }
  };
  /** An air hole: a dark hole with a lit lower lip. */
  const hole = (v, ci, cj, r) => { v.disc(ci, cj - 1, r + 1.2, P.hi[0], P.hi[1]); v.disc(ci, cj + 0.6, r + 1, P.sh2[0], P.sh2[1]); v.disc(ci, cj, r, P.deep[0], P.deep[1]); };

  // ---- top band (seam at the bottom row)
  const T = V.TB;
  fill(T, 0, 0, BW, BH, P.base);
  fill(T, 0, 0, BW, 1, P.sh2); fill(T, 0, 1, BW, 5, P.lite); fill(T, 0, 5, BW, 6, P.sh1); // the rim bead
  fill(T, 0, 27, BW, 28, P.sh1); fill(T, 0, 28, BW, 29, P.lite); // a parting step
  const ARROW = ['....#....', '....##...', '#########', '....##...', '....#....'].flatMap((row, y) => [...row].map((c, x) => (c === '#' ? [x, y] : null)).filter(Boolean));
  for (let q = 0; q < 4; q++) {
    const u = 127 + q * 254;
    const w = text(T, 'OPEN', u - 44, 50, 2);
    emboss(T, scaled(ARROW, 2), u - 44 + w + 8, 48);
  }
  if (kind === 'secret') {
    // gilt rings and the mark of the secret capsule
    fill(T, 0, 60, BW, 61, P.line); fill(T, 0, 126, BW, 128, P.lite); fill(T, 0, 129, BW, 130, P.line);
    const g = glyphMask('秘', 48);
    for (const u of [254, 762]) {
      T.ring(u, 93, 28, 31, P.lite[0], 255); T.ring(u, 93, 25, 26, P.line[0], 255);
      for (const [x, y] of g) put(T, u - 24 + x, 93 + 24 - y, P.lite);
      for (const [x, y] of g) if (!g.some(([a, b]) => a === x - 1 && b === y - 1)) put(T, u - 24 + x, 93 + 24 - y, P.hi);
    }
    // little clouds of gold dust beside the marks (placed by hand, not noise)
    for (const [u, j] of [[60, 80], [72, 86], [66, 96], [448, 100], [460, 92], [470, 104], [566, 84], [578, 90], [960, 98], [972, 88], [950, 108]]) { put(T, u, j, P.lite); put(T, u + 1, j, P.line); }
  } else {
    // the maker's monogram in a ring, front and back
    for (const u of [254, 762]) {
      for (let a = 0; a < 360; a += 1) { const x = Math.round(u + Math.cos(a * D2R) * 27), y = Math.round(94 + Math.sin(a * D2R) * 27); put(T, x + 1, y - 1, P.sh2); }
      for (let a = 0; a < 360; a += 1) { const x = Math.round(u + Math.cos(a * D2R) * 27), y = Math.round(94 + Math.sin(a * D2R) * 27); put(T, x - 1, y + 1, P.hi); put(T, x, y, P.lite); }
      text(T, 'GG', u, 104, 3, 'center');
    }
    for (const u of [508, 1010]) text(T, 'No.5', u - 20, 76, 1);
  }

  // ---- bottom band (seam at the top row): the lip, the lettering, the dimples
  const B = V.BB, J = (jr) => BH - 1 - jr;
  fill(B, 0, 0, BW, BH, P.base);
  fill(B, 0, J(2), BW, J(-1), kind === 'secret' ? P.lite : P.hi); // the chamfer catches the light
  fill(B, 0, J(17), BW, J(2), kind === 'secret' ? P.gloss : P.lite); // the lip's wall
  for (let i = 3; i < BW; i += 7) fill(B, i, J(14), i + 1, J(5), kind === 'secret' ? P.line : P.sh1); // knurling
  fill(B, 0, J(18), BW, J(17), P.sh1);
  fill(B, 0, J(22), BW, J(18), P.sh2); // the step under the lip, in its shadow
  fill(B, 0, J(24), BW, J(22), P.sh1);
  // lettering round the rim: the words spread evenly, a diamond between each
  const WORDS = kind === 'secret' ? ['GACHA GARAGE', 'SUPER SECRET', 'DO NOT PEEK', 'GACHA GARAGE', 'SUPER SECRET', 'NO REFUNDS'] : ['GACHA GARAGE', '誤飲注意', 'TWIST TO OPEN', '対象年齢15才以上', 'PP 5', 'MADE IN JAPAN'];
  const sum = WORDS.reduce((a, w) => a + wordW(w), 0), gap = (BW - sum) / WORDS.length;
  let x = Math.round(gap / 2);
  for (const w of WORDS) { x += word(B, w, x, J(31)); emboss(B, diamond(3), Math.round(x + gap / 2) - 3, J(34)); x = Math.round(x + gap); }
  for (let q = 0; q < 4; q++) dimple(B, 127 + q * 254, J(80), 13);
  fill(B, 0, J(119), BW, J(118), P.sh1); fill(B, 0, J(120), BW, J(119), kind === 'secret' ? P.line : P.lite);
  text(B, 'A-3', 500, J(96), 1);
  if (kind === 'secret') {
    // seigaiha (wave scales) in gilt line, between the lettering and the mould line
    for (let row = 0; row < 3; row++) for (let u = (row % 2) * 16; u < BW; u += 32) {
      const cj = J(64 + row * 18) - 16;
      if (row === 1 && [127, 381, 635, 889].some((d) => Math.abs(u + 16 - d) < 34)) continue; // keep the dimples clear
      for (const rr of [15, 10, 5]) for (let a = 0; a <= 180; a += 2) put(B, Math.round(u + 16 + Math.cos(a * D2R) * rr), Math.round(cj + Math.sin(a * D2R) * rr), rr === 15 ? P.lite : P.line);
    }
  }

  // ---- caps (polar: the pole in the middle)
  const c = CP / 2;
  const TCv = V.TC, BCv = V.BC;
  fill(TCv, 0, 0, CP, CP, P.base); fill(BCv, 0, 0, CP, CP, P.base);
  // top: the flat with the injection gate in its dimple, three air holes
  TCv.ring(c, c, CR * 0.278, CR * 0.3, P.sh1[0], P.sh1[1]);
  TCv.disc(c, c, CR * 0.278, P.lite[0], P.lite[1]);
  TCv.ring(c, c, CR * 0.175, CR * 0.215, P.sh2[0], P.sh2[1]);
  TCv.disc(c, c, CR * 0.175, P.sh1[0], P.sh1[1]);
  TCv.disc(c, c, 3.2, P.lite[0], P.lite[1]); TCv.disc(c - 0.5, c + 0.5, 1.4, P.hi[0], P.hi[1]);
  for (let k = 0; k < 3; k++) { const a = (90 + k * 120) * D2R; hole(TCv, Math.round(c + Math.cos(a) * CR * 0.56), Math.round(c + Math.sin(a) * CR * 0.56), 3.6); }
  TCv.ring(c, c, CR * 0.8, CR * 0.815, P.sh1[0], P.sh1[1]);
  // bottom: the flat spot, its foot ring, air holes, the gate scar, the moulder's marks
  BCv.ring(c, c, CR * 0.5, CR * 0.58, P.sh1[0], P.sh1[1]);
  BCv.disc(c, c, CR * 0.5, P.lite[0], P.lite[1]);
  BCv.ring(c, c, CR * 0.395, CR * 0.43, P.sh2[0], P.sh2[1]); BCv.ring(c, c, CR * 0.43, CR * 0.455, P.hi[0], P.hi[1]);
  for (let k = 0; k < 3; k++) { const a = (90 + k * 120) * D2R; hole(BCv, Math.round(c + Math.cos(a) * CR * 0.27), Math.round(c + Math.sin(a) * CR * 0.27), 3.2); }
  BCv.disc(c, c, 4.5, P.sh1[0], P.sh1[1]); BCv.disc(c, c, 2.2, P.hi[0], P.hi[1]);
  text(BCv, 'GG', c, c - 9, 1, 'center');
  BCv.ring(c, c, CR * 0.86, CR * 0.875, P.sh1[0], P.sh1[1]);

  fill(V.IN, 0, 0, 32, 32, P.inner);
  [P.lite, P.base, P.sh1, P.sh2].forEach((t, k) => fill(V.SW, k * 16, 0, k * 16 + 16, 16, t));
  // the bands wrap: their padding takes the far edge's pixels, so no seam shows when the texture is minified
  for (const v of [T, B]) for (let j = 0; j < BH; j++) for (let p = 1; p <= 2; p++) {
    const y = v.r.y + BH - 1 - j, i0 = (y * A.w + v.r.x) * 4, i1 = (y * A.w + v.r.x + BW - 1) * 4;
    for (let q = 0; q < 4; q++) { A.d[i0 - p * 4 + q] = A.d[i1 - (p - 1) * 4 + q]; A.d[i1 + p * 4 + q] = A.d[i0 + (p - 1) * 4 + q]; }
  }
  const tex = A.texture();
  tex.anisotropy = 8;
  const mid = (k) => V.SW.st((k * 16 + 8) / 64, 0.5);
  const skin = { A, tex, V, sw: { lite: () => mid(0), base: () => mid(1), sh1: () => mid(2), sh2: () => mid(3), inner: () => V.IN.st(0.5, 0.5) } };
  if (repaint) return skin;
  skins.set(kind, skin);
  // the lettering has kana in it: painted again once the kana font has loaded
  try {
    const K = '秘誤飲注意対象年齢才以上15';
    if (!document.fonts?.check?.('16px "DotGothic16"', K)) document.fonts.load('16px "DotGothic16"', K).then(() => { glyphCache.clear(); tex.image = shellSkin(kind, true).A.canvas(); tex.needsUpdate = true; }, () => {});
  } catch { /* no font loading */ }
  return skin;
}

// ----------------------------------------------------------------------------- shapes
// Profiles in units of the capsule's radius: [r, y, crease, w] with w = 0 at the seam .. 1 at the pole (the skin's
// coordinate; one point sits exactly on SPLIT). Walked anticlockwise round the solid: the top from the seam up to the
// pole, the bottom from the pole out and up to the seam.
const cs = (deg) => [Math.cos(deg * D2R), Math.sin(deg * D2R)];
function ballTop(hi, R = 1, sy = 1) {
  // the rim bead, the dome, then the flattened pole: a raised boss ring round the gate's dimple
  const p = [[0.985 * R, 0, 1, 0], [1.006 * R, 0.01, 0, 0.008], [1.006 * R, 0.03, 0, 0.02], [0.998 * R, 0.045, 1, 0.03]];
  for (const d of hi ? [4, 9, 15, 21, 27, 33, 39, 45, 50, 54, 59, 64, 69, 73] : [6, 18, 30, 42, 54, 66]) { const [c, s] = cs(d); p.push([c * R, s * sy, 0, d / 90]); }
  const [c, s] = cs(76.5);
  p.push([c * R, s * sy, 1, 0.86], [c * R * 0.92, s * sy + 0.012, 0, 0.875], [c * R * 0.8, s * sy + 0.014, 1, 0.889], [c * R * 0.62, s * sy + 0.004, 1, 0.91], [c * R * 0.5, s * sy - 0.012, 1, 0.93], [0, s * sy - 0.012, 0, 1]);
  return p;
}
function ballBottom(hi, R = 1, sy = 1, flat = 0.9) {
  // the flat spot at y = -flat * sy
  const lat0 = Math.asin(flat) / D2R; // where the sphere meets the flat
  const p = [[0, -flat * sy, 0, 1], [0.4 * R * Math.cos(lat0 * D2R) / 0.436, -flat * sy, 1, 0.8]];
  const [c0, s0] = cs(lat0 - 2.5);
  p.push([c0 * R, -s0 * sy, 1, 0.69]);
  for (const d of hi ? [58, 54, 49, 44, 39, 34, 29, 24, 19, 14, 8] : [54, 42, 30, 18, 8]) { const [c, s] = cs(d); p.push([c * R, -s * sy, d === 8 ? 1 : 0, d / 90]); }
  // the seam ring, stepped: a wall, a bead round its middle, the chamfer the dome sits in
  p.push([1.04 * R, -0.115, 1, 0.075], [1.04 * R, -0.086, 1, 0.058], [1.054 * R, -0.076, 0, 0.052], [1.054 * R, -0.05, 0, 0.038], [1.04 * R, -0.04, 1, 0.032], [1.04 * R, -0.018, 1, 0.02], [1.025 * R, 0, 1, 0], [0.945 * R, 0, 1, 0]);
  return p;
}
const lerp = (a, b, t) => a + (b - a) * t;
/** A blob profile through control radii: r(y) by smooth interpolation, for the egg and the daruma. */
function blob(points, n, hi) {
  // points: [[y, r], ...] rising; sampled n times with a smoothstep between neighbours
  const out = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n, f = t * (points.length - 1), i = Math.min(points.length - 2, Math.floor(f)), u = f - i, e = u * u * (3 - 2 * u);
    out.push([lerp(points[i][1], points[i + 1][1], e), lerp(points[i][0], points[i + 1][0], u)]);
  }
  void hi;
  return out;
}
const SHAPES = {
  ball: { top: (hi) => ballTop(hi), bottom: (hi) => ballBottom(hi) },
  // an egg: a taller, narrower dome over a rounder cup
  egg: { top: (hi) => ballTop(hi, 0.9, 1.28).map((p, k) => (k < 2 ? p : [p[0] * (1 - 0.1 * p[3]), p[1], p[2], p[3]])), bottom: (hi) => ballBottom(hi, 0.9, 0.98, 0.9), lip: 0.9 },
  // a daruma: a big belly below, the smaller head above, no neck
  daruma: {
    top: (hi) => {
      const p = [[0.985 * 0.96, 0, 1, 0], [0.96, 0.014, 1, 0.012]];
      const ys = hi ? [0.08, 0.24, 0.42, 0.6, 0.78, 0.93, 1.03] : [0.1, 0.42, 0.78, 1.0];
      const ws = hi ? [0.06, 0.2, 0.34, 0.47, 0.6, 0.72, 0.82] : [0.08, 0.34, 0.6, 0.78];
      ys.forEach((y, k) => {
        // shoulders narrowing into a head of radius 0.66 centred at y = 0.48
        const head = Math.sqrt(Math.max(0, 0.66 * 0.66 - (y - 0.48) ** 2)), sh = 0.96 - y * 0.62;
        p.push([Math.max(head, y < 0.42 ? Math.max(sh, head) : head), y, 0, ws[k]]);
      });
      p.push([0.2, 1.11, 1, 0.9], [0.13, 1.098, 1, 0.94], [0, 1.098, 0, 1]);
      return p;
    },
    bottom: (hi) => ballBottom(hi, 0.96, 0.9, 0.86), lip: 0.96,
  },
  // a drink can: straight walls, chamfered shoulders, a recessed lid
  can: {
    top: (hi) => { void hi; return [[0.985 * 0.74, 0, 1, 0], [0.74, 0.014, 1, 0.012], [0.74, 0.3, 0, 0.25], [0.74, 0.68, 0, 0.6], [0.74, 0.8, 1, 0.7], [0.66, 0.9, 1, 0.8], [0.62, 0.9, 1, 0.84], [0.6, 0.87, 1, 0.88], [0, 0.87, 0, 1]]; },
    bottom: (hi) => { void hi; return [[0, -0.87, 0, 1], [0.5, -0.87, 1, 0.84], [0.56, -0.9, 1, 0.8], [0.66, -0.9, 1, 0.76], [0.74, -0.8, 1, 0.69], [0.74, -0.66, 0, 0.6], [0.74, -0.35, 0, 0.3], [0.74, -0.125, 1, 0.089], [0.78, -0.115, 1, 0.075], [0.78, -0.018, 1, 0.02], [0.768, 0, 1, 0], [0.7, 0, 1, 0]]; },
    lip: 0.75,
  },
};
export const SHAPE_NAMES = Object.keys(SHAPES);
void blob;

const geos = new Map();
/**
 * One half of a capsule in metres, the seam at y = 0. part 'top' | 'bottom', detail 'hi' | 'lo'.
 * Returns { geo, outer: [start, count] }: the outside surface comes last (the clear coat draws just that range).
 */
export function shellGeo(shape = 'ball', r = 0.0325, part = 'top', detail = 'hi', extras = null) {
  const key = `${shape}|${r}|${part}|${detail}|${extras ? extras.key : ''}`;
  if (geos.has(key)) return geos.get(key);
  const S = SHAPES[shape] || SHAPES.ball, hi = detail === 'hi', segs = hi ? 56 : 20, top = part === 'top';
  const skin = shellSkin('plastic'), V = skin.V; // every skin has the same layout
  const prof = top ? S.top(hi) : S.bottom(hi);
  const G = new GeoS(1);
  G.push(new THREE.Matrix4().makeScale(r, r, r));
  const band = top ? V.TB : V.BB, cap = top ? V.TC : V.BC;
  const uv = (k, t, s, p, seg) => {
    const w = prof[k][3], isCap = Math.min(prof[seg][3], prof[seg + 1][3]) >= SPLIT - 1e-6;
    if (!isCap) { const v = Math.min(1, w / SPLIT); return band.st(Math.min(0.9995, Math.max(0.0005, 1 - s)), Math.min(0.999, Math.max(0.001, top ? v : 1 - v))); }
    const rho = Math.max(0, (1 - w) / (1 - SPLIT)) * CR / CP, a = s * Math.PI * 2;
    return cap.st(0.5 + Math.cos(a) * rho, 0.5 + (top ? -1 : 1) * Math.sin(a) * rho);
  };
  // ---- inside first (far wall of a clear half draws before its near outside)
  if (hi) {
    const inner = prof.filter((p) => p[3] > 0.05 || top).map((p) => { const l = Math.hypot(p[0], p[1]) || 1, k = Math.max(0, 1 - 0.055 / l); return [p[0] * k, p[1] * k, 0]; });
    if (!top) { inner.length = Math.max(0, inner.length - 3); inner.push([prof[prof.length - 1][0], -0.03, 1], [prof[prof.length - 1][0], 0, 1]); }
    else inner[0] = [prof[0][0] - 0.04, 0, 1];
    if (!top) inner[0][1] += 0.045; // the floor is thicker
    if (!top && inner[1]) inner[1][1] = inner[0][1];
    G.with(skin.sw.inner, 0, () => G.revolve(inner, segs, { flip: true, uv: skin.sw.inner }));
    if (top) G.with(skin.sw.lite, 0, () => G.revolve([[prof[0][0] - 0.04, 0, 1], [prof[0][0], 0, 1]], segs, { uv: skin.sw.lite })); // the rim it stands on
  }
  // lo-detail bottoms carry a stand-in for what is inside (a lump and a folded paper), seen through the dome
  if (!hi && !top && !extras?.empty) {
    G.with(skin.sw.sh2, 0, () => { G.box(-0.34, -0.66, -0.2, 0.2, -0.12, 0.3, { bevel: 0.14 }); });
    G.with(skin.sw.lite, 0, () => { G.push(new THREE.Matrix4().makeRotationY(0.5)); G.box(-0.4, -0.5, -0.5, 0.4, 0.5, -0.44); G.pop(); });
  }
  const start = G.S[0].p.length / 3;
  G.revolve(prof, segs, { uv });
  // ---- lugs: blocks on the lip, the dome's tabs between them
  const lipR = (S.lip || 1) * 1;
  for (let q = 0; q < 4; q++) {
    G.push(new THREE.Matrix4().makeRotationY(-(q * 90 + 45) * D2R));
    if (top) G.with(skin.sw.lite, 0, () => G.box(lipR * 0.985, 0.004, -0.085, lipR * 1.03, 0.066, 0.085, { bevel: 0.012, skip: ['nx'] }));
    else G.with(skin.sw.lite, 0, () => { for (const s of [-1, 1]) G.box(lipR * 1.03, -0.112, s * 0.15 - 0.045, lipR * 1.062, -0.004, s * 0.15 + 0.045, { bevel: 0.01, skip: ['nx'] }); });
    G.pop();
  }
  if (hi) {
    const P = (a, lat, R) => [Math.cos(a) * Math.cos(lat) * R, Math.sin(lat) * R * (shape === 'ball' ? 1 : 0.94), Math.sin(a) * Math.cos(lat) * R];
    if (!top && shape !== 'can') {
      // moulded grip ribs down the cup: twelve raised strips, each with its two flanks
      const k0 = shape === 'ball' ? 1 : lipR * 0.985;
      for (let q = 0; q < 12; q++) {
        const a0 = (q * 30 + 15) * D2R, w0 = 1.5 * D2R, w1 = 2.8 * D2R, N = (a, lat) => [Math.cos(a) * Math.cos(lat), Math.sin(lat), Math.sin(a) * Math.cos(lat)];
        for (let j = 0; j < 5; j++) {
          const lA = -(25 + j * 5.4) * D2R, lB = -(25 + (j + 1) * 5.4) * D2R, hA = j === 0 ? 1.004 : 1.02, hB = j === 4 ? 1.004 : 1.02;
          for (const [u0, u1, r0, r1] of [[-w1, -w0, 1.0, 1], [-w0, w0, 1, 1], [w0, w1, 1, 1.0]]) {
            const ra0 = (r0 === 1 ? hA : 1.0) * k0, ra1 = (r1 === 1 ? hA : 1.0) * k0, rb0 = (r0 === 1 ? hB : 1.0) * k0, rb1 = (r1 === 1 ? hB : 1.0) * k0;
            const na = N(a0 + (u0 + u1) / 2 + (u0 < -w0 ? -0.5 : u1 > w0 ? 0.5 : 0), (lA + lB) / 2);
            G.quadN(P(a0 + u0, lB, rb0), P(a0 + u1, lB, rb1), P(a0 + u1, lA, ra1), P(a0 + u0, lA, ra0), na, na, na, na, skin.sw.lite(), skin.sw.lite(), skin.sw.lite(), skin.sw.lite());
          }
        }
      }
    }
    if (top) {
      // the thumb tab on the dome's rim, at the back: where you push the lid up
      G.push(new THREE.Matrix4().makeRotationY(-270 * D2R));
      G.with(skin.sw.lite, 0, () => { G.box(lipR * 0.97, 0.002, -0.12, lipR * 1.1, 0.03, 0.12, { bevel: 0.012, skip: ['nx'] }); for (const z of [-0.07, 0, 0.07]) G.box(lipR * 1.03, 0.03, z - 0.012, lipR * 1.09, 0.038, z + 0.012, { bevel: 0.004 }); });
      G.pop();
    } else {
      // and the notch in the seam ring under it
      G.push(new THREE.Matrix4().makeRotationY(-270 * D2R));
      G.with(skin.sw.sh2, 0, () => G.box(lipR * 1.03, -0.03, -0.1, lipR * 1.058, 0.0005, 0.1, { bevel: 0.006, skip: ['nx'] }));
      G.pop();
    }
  }
  G.pop();
  const geo = G.build();
  geo.clearGroups();
  const out = { geo, outer: [start, geo.attributes.position.count - start] };
  geos.set(key, out);
  return out;
}

/** Radius of a shape's profile at height y (units of r) on the half `part`: where stickers and seals sit. */
export function profileAt(shape, part, yUnit) {
  const S = SHAPES[shape] || SHAPES.ball, prof = part === 'top' ? S.top(true) : S.bottom(true);
  for (let k = 0; k + 1 < prof.length; k++) {
    const [r0, y0] = prof[k], [r1, y1] = prof[k + 1];
    if ((yUnit - y0) * (yUnit - y1) <= 0 && Math.abs(y1 - y0) > 1e-6) { const t = (yUnit - y0) / (y1 - y0); return r0 + (r1 - r0) * t; }
  }
  return 1;
}
/** The outline of a half as [[r, y], ...] from the seam towards the pole (units of r). */
export function profileOf(shape, part) {
  const S = SHAPES[shape] || SHAPES.ball, prof = part === 'top' ? S.top(true) : S.bottom(true).slice().reverse();
  return prof.map((p) => [p[0], p[1]]);
}
export function shapeLip(shape) { return (SHAPES[shape] || SHAPES.ball).lip || 1; }
