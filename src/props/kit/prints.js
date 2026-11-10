// Print and paint for props, on atlas views (pixel coordinates from the bottom left): Japanese text through
// DotGothic16 thresholded to whole pixels, the shared painted textures (board grain, the dirt line at the foot of
// things), and the small print real labels are made of (rules, barcodes, warning marks, little mascots).
// Every design here is original.
import { mix } from '../../vehicles/paint.js';
import { seeded } from '../../vehicles/paint.js';
import { lighten, darken } from './kit.js';

// ------------------------------------------------------------------ kana / kanji
let kx = null;
const kcache = new Map();
function kmask(text, size, vert) {
  const key = text + '|' + size + '|' + vert;
  if (kcache.has(key)) return kcache.get(key);
  if (!kx) { const c = document.createElement('canvas'); c.width = 256; c.height = 256; kx = c.getContext('2d', { willReadFrequently: true }); }
  kx.clearRect(0, 0, 256, 256);
  kx.fillStyle = '#fff';
  kx.font = `${size}px "DotGothic16", monospace`;
  kx.textBaseline = 'top';
  const chars = [...text];
  let w, h;
  if (vert) { chars.forEach((c, i) => kx.fillText(c, 0, i * size)); w = size; h = Math.min(256, chars.length * size); }
  else { kx.fillText(text, 0, 0); w = Math.max(1, Math.min(256, Math.ceil(kx.measureText(text).width))); h = size + 2; }
  const d = kx.getImageData(0, 0, w, h).data, pts = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 110) pts.push(x, y);
  const m = { w, h, pts };
  kcache.set(key, m);
  return m;
}
/**
 * Japanese text on a view: (i, j) = the top-left pixel (j counts from the bottom, like View.text5). o: { size: 16
 * (the font's crisp size; 8 is a rough half size for small print), s: integer scale, align, vert, shadow }.
 * Painted when the font is in (K.whenFont): a prop built before the font arrives gets its text a moment later.
 */
export function kana(K, V, text, i, j, col, o = {}) {
  const size = o.size || 16, s = o.s || 1;
  K.whenFont(text, () => {
    const m = kmask(text, size, !!o.vert), w = m.w * s;
    const x0 = o.align === 'center' ? i - Math.round(w / 2) : o.align === 'right' ? i - w : i;
    for (let k = 0; k < m.pts.length; k += 2) for (let a = 0; a < s; a++) for (let b = 0; b < s; b++) {
      if (o.shadow !== undefined) V.px(x0 + m.pts[k] * s + a + s, j - m.pts[k + 1] * s - b - s, o.shadow);
    }
    for (let k = 0; k < m.pts.length; k += 2) for (let a = 0; a < s; a++) for (let b = 0; b < s; b++) V.px(x0 + m.pts[k] * s + a, j - m.pts[k + 1] * s - b, col);
  });
}

// ------------------------------------------------------------------ small print
/** Lines of "small print": broken rules of ink, w wide, starting at the top-left (i, j). */
export function smallPrint(V, i, j, w, lines, col, o = {}) {
  const r = seeded(o.seed ?? (i * 31 + j * 7 + w));
  for (let l = 0; l < lines; l++) {
    let x = i;
    const end = i + (l === lines - 1 ? Math.round(w * (0.45 + r() * 0.4)) : w);
    while (x < end) { const n = 2 + Math.floor(r() * 5); V.hline(x, Math.min(end, x + n) - 1, j - l * (o.lh ?? 3), col); x += n + 1 + (r() < 0.3 ? 1 : 0); }
  }
}
/** A barcode w x h px with its number line; (i, j) bottom-left. */
export function barcode(V, i, j, w, h, ink = 0x1a1a1a, bg = 0xffffff, seed = 5) {
  const r = seeded(seed);
  V.box(i, j, i + w, j + h, bg);
  for (let x = i + 1; x < i + w - 1;) { const n = r() < 0.3 ? 2 : 1; if (r() < 0.62) V.box(x, j + 2, Math.min(i + w - 1, x + n), j + h - 1, ink); x += n; }
  for (let x = i + 1; x < i + w - 1; x += 2) V.px(x, j + 1, ink);
}
/** A warning triangle (yellow, black edge, an exclamation mark): centre-bottom at (ci, j), `s` px tall. */
export function warnTri(V, ci, j, s = 11, col = 0xf5c518, ink = 0x1e1e1e) {
  for (let y = 0; y < s; y++) { const hw = Math.round((s - 1 - y) * 0.6); for (let x = -hw; x <= hw; x++) V.px(ci + x, j + y, Math.abs(x) >= hw - 0 || y === 0 ? ink : col); }
  for (let y = 3; y < s - 3; y++) V.px(ci, j + y, ink);
  V.px(ci, j + 1, ink); V.px(ci, j + 2, col);
}
/** Three chasing arrows in a triangle: the recycling mark, 9 px. */
export function recycle(V, i, j, col) {
  V.sprite(['...##....', '..#..#...', '.#....#..', '.#.....#.', '#...#...#', '#..###...', '.#######.', '....#....', '...#.....'], { '#': col }, i, j);
}
/** Mascots for labels and stickers (original, hand-pixelled): each { rows, legend keys: a b c k w }. */
export const MASCOT = {
  // a round cat face with a bell
  neko: ['..k.....k..', '.kak...kak.', '.kaakkkaak.', 'kaaaaaaaaak', 'kakaaaaakak', 'kaaaapaaaak', 'kaawkakwaak', '.kaaaaaaak.', '..kkkbkkk..', '....kbk....'],
  // a sparrow
  suzume: ['...kkk....', '..kbbbk...', '.kbkbbwk..', 'yybbbwwk..', '.kbbbwwwkk', '.kbbbbwwbk', '..kbbbbbk.', '...kkkkk..', '....y.y...'],
  // a daruma-ish sun
  hinode: ['....rr....', '..rrrrrr..', '.rrrrrrrr.', '.rrwwwwrr.', 'rrwkwwkwrr', 'rrwwwwwwrr', '.rrwrrwrr.', '.rrrrrrrr.', '..rrrrrr..'],
  // a goldfish
  kingyo: ['..rr....r.', '.rrrr..rr.', 'rrwrrrrrr.', 'rkwrrrrr..', 'rrrrrrrrr.', '.rrrr..rr.', '..rr....r.'],
  // a frog
  kaeru: ['.kk....kk.', 'kwkk..kkwk', 'kkgggggkkk', 'kggggggggk', 'kgkggggkgk', 'kggkkkkggk', '.kggggggk.', '..kkkkkk..'],
  // a little oni / kaiju head
  kaiju: ['k...kk...k', 'kk.kggk.kk', '.kgggggk..', 'kgwkggwkgk', 'kgggggggk.', 'kgwwwwwgk.', '.kgkgkgk..', '..kkkkk...'],
  // a tanuki
  tanuki: ['.kk....kk.', 'kbbk..kbbk', 'kbbbkkbbbk', 'kbkkbbkkbk', 'kbwkbbkwbk', 'kbbbkkbbbk', '.kbbwwbbk.', '..kkkkkk..'],
  // a crane, wings up
  tsuru: ['w.......w.', 'ww.....ww.', '.ww.r.ww..', '.wwwwwww..', '..wwwww...', '...wwwkk..', '....w.....', '....w.....'],
  // a wave
  nami: ['...ww.....', '..wbbw....', '.wbbbbw..w', 'wbbwwbbwwb', 'bbw..wbbbb', 'bbbbbbbbbb'],
  // a fox mask
  kitsune: ['k.......k.', 'kk.....kk.', 'kwk...kwk.', 'kwwkkkwwk.', 'kwrwwwrwk.', 'kwwwwwwwk.', '.kwwkwwk..', '..kwwwk...', '...kkk....'],
};
/** Draw a mascot: top-left (i, j); palette { a: fur, b: second, w: white, k: outline, r: red, g: green, y: yellow, p: pink }. */
export function mascot(V, name, i, j, pal = {}, s = 1) {
  const L = { a: 0xf2ead8, b: 0x8a5a36, w: 0xffffff, k: 0x2a2024, r: 0xd8322a, g: 0x5aa84a, y: 0xf2b838, p: 0xf09aa8, ...pal };
  const rows = MASCOT[name];
  if (s === 1) return V.sprite(rows, L, i, j);
  rows.forEach((row, y) => [...row].forEach((ch, x) => { const c = L[ch]; if (c !== undefined && ch !== '.') V.box(i + x * s, j - y * s - s + 1, i + x * s + s, j - y * s + 1, c); }));
  return V;
}
/** Fill with a frame: an outer line, an optional inner line. */
export function framed(V, bg, line, inner = null) {
  V.fill(bg); V.frame(0, 0, V.W, V.H, line);
  if (inner !== null) V.frame(2, 2, V.W - 2, V.H - 2, inner);
}
/** Diagonal hazard stripes over a box of pixels. */
export function hazard(V, i0, j0, i1, j1, a = 0xf5c518, b = 0x24221e, w = 6) {
  V.box(i0, j0, i1, j1, (i, j) => (Math.floor((i + j) / w) % 2 ? a : b));
}

// ------------------------------------------------------------------ shared painted textures
/** A board's grain (160 x 20 px, the grain along the width): lit top edge, shaded bottom, broken grain lines, a knot, nails. */
export function plankTex(K, c, v = 0) {
  return K.patch(`plank:${c}:${v}`, 160, 20, (V) => {
    const W = V.W, H = V.H, r = seeded(c + v * 977 + 3), dk = darken(c, 0.22), dk2 = darken(c, 0.42), lt = lighten(c, 0.22);
    V.fill(c);
    V.box(0, H - 2, W, H, lt); V.box(0, 0, W, 2, dk);
    for (const j0 of [5, 9, 13, 16]) {
      let j = j0 + Math.floor(r() * 2), i = Math.floor(r() * 12);
      while (i < W) {
        const n = 10 + Math.floor(r() * 30);
        V.hline(i, Math.min(W - 1, i + n), j, dk);
        i += n + 2 + Math.floor(r() * 9);
        if (r() < 0.5) j += r() < 0.5 ? 1 : -1;
        j = Math.max(3, Math.min(H - 4, j));
      }
    }
    // a knot the grain flows round
    const kx0 = Math.round(W * (0.2 + r() * 0.6)), ky = 6 + Math.floor(r() * 8);
    V.ring(kx0, ky, 1.2, 2.6, dk2); V.px(kx0, ky, dk); V.hline(kx0 - 7, kx0 - 4, ky + 3, dk); V.hline(kx0 + 3, kx0 + 7, ky - 3, dk);
    // the ends: a dark cut edge, a nail head each side
    V.box(0, 0, 2, H, dk); V.box(W - 2, 0, W, H, dk);
    for (const i of [7, W - 8]) { V.box(i, 9, i + 2, 11, dk2); V.px(i, 11, lt); }
  }, { shared: true, rough: 0.8 });
}
/** The dirt line at the foot of a thing (64 x 16): the surface colour above, a ragged splash of dirt below. */
export function dirtTex(K, base, dirt = 0x5c5446, v = 0) {
  return K.patch(`dirt:${base}:${dirt}:${v}`, 64, 16, (V) => {
    const W = V.W, H = V.H, r = seeded(base + dirt + v * 31), a = mix(base, dirt, 0.38), b = mix(base, dirt, 0.68);
    V.fill(base);
    const bumps = Array.from({ length: 6 }, (_, k) => ({ c: (k + 0.2 + r() * 0.6) * (W / 6), s: 4 + r() * 6, h: 3 + r() * 6 }));
    for (let i = 0; i < W; i++) {
      let top = 5;
      for (const m of [...bumps, { ...bumps[0], c: bumps[0].c + W }, { ...bumps[5], c: bumps[5].c - W }]) top = Math.max(top, 5 + m.h * Math.max(0, 1 - ((i - m.c) / m.s) ** 2));
      top = Math.round(top);
      for (let j = 0; j < top; j++) V.px(i, j, j < Math.max(2, top - 5) ? b : a);
    }
    for (let k = 0; k < 7; k++) { const i = Math.floor(r() * W), j = 11 + Math.floor(r() * 4); V.px(i, j, a); if (r() < 0.4) V.px(i + 1, j, a); }
  }, { shared: true, rough: 0.95 });
}
/** Wire mesh as a cut-out (glass slot): w x h px, a wire every `cell` px on a see-through ground. Shared per page. */
export function meshTex(K, c, cell = 8, o = {}) {
  const n = o.n ?? 4, S = cell * n;
  return K.patch(`mesh:${c}:${cell}:${o.diag ? 1 : 0}`, S, S, (V) => {
    V.box(0, 0, S, S, c, 0);
    const dk = darken(c, 0.25);
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const on = o.diag ? ((i + j) % cell === 0 || (i - j + S * 4) % cell === 0) : (i % cell === 0 || j % cell === 0);
      if (on) V.px(i, j, (o.diag ? (i - j + S * 4) % cell === 0 : j % cell === 0) ? c : dk, 255);
    }
  }, { shared: true, rough: 0.5 });
}
/** Tile a cut-out mesh over a rectangle of a plane (both sides). facing as K.face; cells of `size` metres. */
export function meshPanel(K, V, facing, a0, b0, a1, b1, w, size = 0.2) {
  const na = Math.max(1, Math.round(Math.abs(a1 - a0) / size)), nb = Math.max(1, Math.round(Math.abs(b1 - b0) / size));
  K.glass(() => { for (let i = 0; i < na; i++) for (let j = 0; j < nb; j++) K.face(V, facing, a0 + (a1 - a0) * (i / na), b0 + (b1 - b0) * (j / nb), a0 + (a1 - a0) * ((i + 1) / na), b0 + (b1 - b0) * ((j + 1) / nb), w, { both: true }); });
  return K;
}
/** Louvre slats painted on a box of pixels: dark gaps with a lit lip under each. */
export function louvres(V, i0, j0, i1, j1, c, step = 4) {
  const dk = darken(c, 0.5), lt = lighten(c, 0.25);
  for (let j = j0; j < j1; j += step) { V.box(i0, j, i1, j + 1, lt); V.box(i0, j + 1, i1, j + Math.max(2, step - 1), dk); }
  V.frame(i0 - 1, j0 - 1, i1 + 1, j1 + 1, darken(c, 0.25));
}
/** Rust creeping up from an edge at row j0 between columns i0..i1 (a few blisters, seeded). */
export function rustEdge(V, i0, i1, j0, h, seed = 1, base = 0x8a4a26) {
  const r = seeded(seed), n = Math.max(1, Math.round((i1 - i0) / 26));
  for (let k = 0; k < n; k++) {
    const c = i0 + (i1 - i0) * ((k + 0.2 + r() * 0.6) / n), w = 6 + r() * 12, hh = h * (0.4 + r() * 0.6);
    for (let i = Math.round(c - w); i <= Math.round(c + w); i++) {
      if (i < i0 || i >= i1) continue;
      const top = Math.round(hh * Math.max(0, 1 - ((i - c) / w) ** 2));
      for (let j = 0; j < top; j++) V.px(i, j0 + j, j === top - 1 ? mix(base, 0xd08850, 0.4) : (i + j * 3 + seed) % 5 === 0 ? mix(base, 0x2a160c, 0.5) : base);
    }
  }
}
/** A sticker: a framed label with one line of 5x7 text. */
export function sticker(V, i, j, w, h, bg, ink, text, o = {}) {
  V.box(i, j, i + w, j + h, bg); if (o.frame !== undefined) V.frame(i, j, i + w, j + h, o.frame);
  if (text) V.text5(text, i + Math.round(w / 2), j + Math.round(h / 2) + 3, ink, { align: 'center', s: o.s ?? 1 });
}
/** A clock dial filling a square view: ticks, hands at h:m, a red second hand if o.sec. */
export function clockFace(V, h = 10, m = 10, o = {}) {
  const c = V.W / 2, R = c - 1, bg = o.bg ?? 0xf2efe6, ink = o.ink ?? 0x26221e;
  V.box(0, 0, V.W, V.H, o.rim ?? ink);
  V.disc(c, c, R, bg);
  V.ring(c, c, R - 1.5, R, o.rim ?? ink);
  for (let k = 0; k < 12; k++) { const a = (k / 12) * 6.2832, r0 = R * (k % 3 ? 0.84 : 0.76); V.line(Math.round(c - 0.5 + Math.sin(a) * r0), Math.round(c - 0.5 + Math.cos(a) * r0), Math.round(c - 0.5 + Math.sin(a) * R * 0.9), Math.round(c - 0.5 + Math.cos(a) * R * 0.9), ink); }
  const hand = (a, l, w, col) => { for (let t = 0; t <= l; t += 0.5) for (let d = -w; d <= w; d++) V.px(Math.round(c - 0.5 + Math.sin(a) * t + Math.cos(a) * d * 0.5), Math.round(c - 0.5 + Math.cos(a) * t - Math.sin(a) * d * 0.5), col); };
  hand(((h % 12) + m / 60) / 12 * 6.2832, R * 0.5, 1, ink); hand((m / 60) * 6.2832, R * 0.76, 1, ink);
  if (o.sec !== undefined) hand((o.sec / 60) * 6.2832, R * 0.8, 0, 0xc8302a);
  V.disc(c, c, 1.6, o.hub ?? ink);
}
