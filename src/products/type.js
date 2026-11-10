// Lettering for the label studio. Everything is a 1-bit mask ({ w, h, b }) so a wordmark can be set, made bold, slanted,
// arched, outlined and given a hard shadow like a sign painter would, and never anti-aliased:
//   m5(str, s)       the game's 5 x 7 bitmap capitals          m3(str)   a 3 x 5 micro face for small print
//   mk(str, size)    DotGothic16 kana / kanji (whole pixels)    ma(str)   Alagard (16 px grid)
//   bold / grow / shear / arc / wave / scale / vert   mask -> mask
//   label(px, mask, x, y, { c, out, sh, align })   draw it with an outline and a hard drop shadow
// The canvas faces load lazily: masks made before a face is ready are not cached, and whenFontsReady() resolves when
// every string asked for so far can be set properly (the atlases repaint then).
import { mask5 } from '../gfx/font5x7.js';

const mk0 = (w, h) => ({ w, h, b: new Uint8Array(Math.max(1, w * h)) });
const at = (m, x, y) => (x < 0 || y < 0 || x >= m.w || y >= m.h ? 0 : m.b[y * m.w + x]);

// ------------------------------------------------------------------ the bitmap faces
/** The 5 x 7 capitals at scale s. */
export function m5(str, s = 1) {
  const pts = mask5(String(str));
  let w = 0;
  for (const [x] of pts) w = Math.max(w, x + 1);
  const m = mk0(Math.max(1, w) * s, 7 * s);
  for (const [x, y] of pts) for (let a = 0; a < s; a++) for (let b = 0; b < s; b++) m.b[(y * s + b) * m.w + x * s + a] = 1;
  return m;
}

const G3 = {
  A: '.#.|#.#|###|#.#|#.#', B: '##.|#.#|##.|#.#|##.', C: '.##|#..|#..|#..|.##', D: '##.|#.#|#.#|#.#|##.', E: '###|#..|##.|#..|###',
  F: '###|#..|##.|#..|#..', G: '.##|#..|#.#|#.#|.##', H: '#.#|#.#|###|#.#|#.#', I: '###|.#.|.#.|.#.|###', J: '..#|..#|..#|#.#|.#.',
  K: '#.#|#.#|##.|#.#|#.#', L: '#..|#..|#..|#..|###', M: '#.#|###|###|#.#|#.#', N: '##.|#.#|#.#|#.#|#.#', O: '.#.|#.#|#.#|#.#|.#.',
  P: '##.|#.#|##.|#..|#..', Q: '.#.|#.#|#.#|.#.|..#', R: '##.|#.#|##.|#.#|#.#', S: '.##|#..|.#.|..#|##.', T: '###|.#.|.#.|.#.|.#.',
  U: '#.#|#.#|#.#|#.#|###', V: '#.#|#.#|#.#|#.#|.#.', W: '#.#|#.#|###|###|#.#', X: '#.#|#.#|.#.|#.#|#.#', Y: '#.#|#.#|.#.|.#.|.#.',
  Z: '###|..#|.#.|#..|###',
  0: '###|#.#|#.#|#.#|###', 1: '.#.|##.|.#.|.#.|###', 2: '##.|..#|.#.|#..|###', 3: '##.|..#|.#.|..#|##.', 4: '#.#|#.#|###|..#|..#',
  5: '###|#..|##.|..#|##.', 6: '.##|#..|###|#.#|###', 7: '###|..#|.#.|.#.|.#.', 8: '###|#.#|###|#.#|###', 9: '###|#.#|###|..#|##.',
  ' ': '..|..|..|..|..', '.': '.|.|.|.|#', ',': '.|.|.|#|#', ':': '.|#|.|#|.', '-': '...|...|###|...|...', '/': '..#|..#|.#.|#..|#..',
  '%': '#.#|..#|.#.|#..|#.#', '(': '.#|#.|#.|#.|.#', ')': '#.|.#|.#|.#|#.', '!': '#|#|#|.|#', '+': '...|.#.|###|.#.|...', '\'': '#|#|.|.|.',
  '&': '.#.|#.#|.#.|#.#|.##', '*': '...|#.#|.#.|#.#|...', '¥': '#.#|.#.|###|.#.|.#.', '?': '##.|..#|.#.|...|.#.', '=': '...|###|...|###|...', '·': '.|.|#|.|.',
  '<': '..#|.#.|#..|.#.|..#', '>': '#..|.#.|..#|.#.|#..', '#': '#.#|###|#.#|###|#.#',
};
/** The 3 x 5 micro capitals (small print: ingredients, addresses, barcode digits). */
export function m3(str) {
  const chars = [...String(str).toUpperCase()].map((ch) => (G3[ch] || G3['?']).split('|'));
  let w = 0;
  for (const g of chars) w += g[0].length + 1;
  const m = mk0(Math.max(1, w - 1), 5);
  let x = 0;
  for (const g of chars) { g.forEach((row, y) => { for (let i = 0; i < row.length; i++) if (row[i] === '#') m.b[y * m.w + x + i] = 1; }); x += g[0].length + 1; }
  return m;
}
/** Width of a micro line. */
export const w3 = (str) => m3(str).w;

// ------------------------------------------------------------------ the canvas faces (thresholded to whole pixels)
let cv = null, cx = null;
const cache = new Map();
const asked = { jp: new Set(), en: new Set() };
const JP = '"DotGothic16", monospace', EN = '"Alagard", serif';
function canvasMask(text, family, size, vert, key) {
  const k = key + '|' + size + '|' + (vert ? 'v' : 'h') + '|' + text;
  const hit = cache.get(k);
  if (hit) return hit;
  if (typeof document === 'undefined') return mk0(Math.max(1, [...text].length * size), size);
  if (!cv) { cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; cx = cv.getContext('2d', { willReadFrequently: true }); }
  const chars = [...text];
  cx.clearRect(0, 0, cv.width, cv.height);
  cx.fillStyle = '#fff';
  cx.font = `${size}px ${family}`;
  cx.textBaseline = 'top';
  let w, h;
  if (vert) {
    // tategaki: one glyph per line; the long vowel mark turns on its side, small kana sit up and to the right
    chars.forEach((c, i) => {
      if (c === 'ー' || c === '〜' || c === '～') { cx.save(); cx.translate(Math.round(size / 2) + 2, i * size + Math.round(size / 2) + 2); cx.rotate(Math.PI / 2); cx.fillText(c, -Math.round(size / 2), -Math.round(size / 2)); cx.restore(); }
      else if ('ャュョッァィゥェォゃゅょっ'.includes(c)) cx.fillText(c, 2 + Math.round(size * 0.14), i * size + 2 - Math.round(size * 0.2));
      else cx.fillText(c, 2, i * size + 2);
    });
    w = size + 4; h = chars.length * size + 4;
  } else {
    cx.fillText(text, 2, 2);
    w = Math.min(cv.width, Math.ceil(cx.measureText(text).width) + 4); h = Math.min(cv.height, size + 6);
  }
  const d = cx.getImageData(0, 0, Math.max(1, w), Math.max(1, Math.min(cv.height, h))).data;
  const full = mk0(w, Math.min(cv.height, h));
  for (let i = 0; i < full.b.length; i++) full.b[i] = d[i * 4 + 3] > 112 ? 1 : 0;
  const m = trim(full);
  const ready = !document.fonts?.check || document.fonts.check(`${size}px ${family.split(',')[0]}`, text);
  if (ready) cache.set(k, m);
  return m;
}
/** Kana / kanji in DotGothic16 (crisp at 16; 12 and 10 hold up for kana). o: { vert } */
export function mk(text, size = 16, o = {}) { asked.jp.add(text); return canvasMask(String(text), JP, size, !!o.vert, 'jp'); }
/** Alagard (16 px grid; 32 for a big wordmark). */
export function ma(text, size = 16) { asked.en.add(text); return canvasMask(String(text), EN, size, false, 'en'); }

/** Resolves when the faces can set every string asked for so far (call after a first paint, then repaint). */
export function whenFontsReady(extra = '') {
  if (typeof document === 'undefined' || !document.fonts?.load) return Promise.resolve();
  const jp = [...new Set([...asked.jp].join('') + extra)].join('');
  return Promise.all([
    document.fonts.load('16px "DotGothic16"', jp || 'あ').catch(() => {}),
    document.fonts.load('16px "Alagard"', 'A').catch(() => {}),
  ]).then(() => { cache.clear(); });
}

// ------------------------------------------------------------------ mask -> mask
export function trim(m) {
  let x0 = m.w, y0 = m.h, x1 = -1, y1 = -1;
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.b[y * m.w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return mk0(1, 1);
  const o = mk0(x1 - x0 + 1, y1 - y0 + 1);
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) o.b[y * o.w + x] = m.b[(y + y0) * m.w + x + x0];
  return o;
}
/** Heavier strokes: n extra pixels to the right (and down with `v`). */
export function bold(m, n = 1, v = 0) {
  const o = mk0(m.w + n, m.h + v);
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.b[y * m.w + x]) for (let a = 0; a <= n; a++) for (let b = 0; b <= v; b++) o.b[(y + b) * o.w + x + a] = 1;
  return o;
}
/** The mask swollen by n pixels all round (what an outline is cut from). round: no corner pixels. */
export function grow(m, n = 1, round = false) {
  const o = mk0(m.w + 2 * n, m.h + 2 * n);
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.b[y * m.w + x]) {
    for (let a = -n; a <= n; a++) for (let b = -n; b <= n; b++) { if (round && Math.abs(a) + Math.abs(b) > n + (n > 1 ? 1 : 0)) continue; o.b[(y + n + b) * o.w + x + n + a] = 1; }
  }
  return o;
}
/** Italic: each row moved right by k pixels per row above the baseline. */
export function shear(m, k = 0.25) {
  const ex = Math.ceil(Math.abs(k) * (m.h - 1));
  const o = mk0(m.w + ex, m.h);
  for (let y = 0; y < m.h; y++) { const dx = Math.round((k > 0 ? (m.h - 1 - y) : -y) * Math.abs(k)); for (let x = 0; x < m.w; x++) if (m.b[y * m.w + x]) o.b[y * o.w + x + dx] = 1; }
  return o;
}
/** Arched: the middle rises by amp pixels (amp < 0: sags). */
export function arc(m, amp = 3) {
  const a = Math.abs(amp);
  const o = mk0(m.w, m.h + a);
  for (let x = 0; x < m.w; x++) {
    const t = m.w > 1 ? (x / (m.w - 1)) * 2 - 1 : 0, lift = Math.round((1 - t * t) * a);
    const dy = amp > 0 ? a - lift : lift;
    for (let y = 0; y < m.h; y++) if (m.b[y * m.w + x]) o.b[(y + dy) * o.w + x] = 1;
  }
  return o;
}
/** A wave along the line (fizzy drinks). */
export function wave(m, amp = 1, period = 12, phase = 0) {
  const o = mk0(m.w, m.h + amp * 2);
  for (let x = 0; x < m.w; x++) { const dy = amp + Math.round(Math.sin((x / period) * Math.PI * 2 + phase) * amp); for (let y = 0; y < m.h; y++) if (m.b[y * m.w + x]) o.b[(y + dy) * o.w + x] = 1; }
  return o;
}
/** Whole-number enlargement. */
export function scale(m, sx = 2, sy = sx) {
  const o = mk0(m.w * sx, m.h * sy);
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) o.b[y * o.w + x] = m.b[Math.floor(y / sy) * m.w + Math.floor(x / sx)];
  return o;
}
/** Twice the size with the stair-steps smoothed (EPX): a 16 px kana line becomes a 32 px wordmark with clean diagonals. */
export function x2(m) {
  const o = mk0(m.w * 2, m.h * 2), g = (x, y) => at(m, Math.max(0, Math.min(m.w - 1, x)), Math.max(0, Math.min(m.h - 1, y)));
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const P = g(x, y), A = g(x, y - 1), B = g(x + 1, y), C = g(x - 1, y), D = g(x, y + 1), i = (y * 2) * o.w + x * 2;
    o.b[i] = C === A && C !== D && A !== B ? A : P;
    o.b[i + 1] = A === B && A !== C && B !== D ? B : P;
    o.b[i + o.w] = D === C && D !== B && C !== A ? C : P;
    o.b[i + o.w + 1] = B === D && B !== A && D !== C ? D : P;
  }
  return o;
}
/** Latin letters stacked down a column (5 x 7 or micro masks made per character by `face`). */
export function stack(str, face = m5, gap = 1) {
  const g = [...String(str)].map((c) => face(c));
  const w = Math.max(...g.map((q) => q.w)), h = g.reduce((a, q) => a + q.h + gap, -gap);
  const o = mk0(w, h);
  let y = 0;
  for (const q of g) { const dx = Math.floor((w - q.w) / 2); for (let j = 0; j < q.h; j++) for (let i = 0; i < q.w; i++) if (q.b[j * q.w + i]) o.b[(y + j) * w + dx + i] = 1; y += q.h + gap; }
  return o;
}
/** Two masks side by side (gap pixels apart, bottoms aligned). */
export function join(a, b, gap = 1) {
  const o = mk0(a.w + gap + b.w, Math.max(a.h, b.h));
  for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) if (a.b[y * a.w + x]) o.b[(y + o.h - a.h) * o.w + x] = 1;
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) if (b.b[y * b.w + x]) o.b[(y + o.h - b.h) * o.w + a.w + gap + x] = 1;
  return o;
}

// ------------------------------------------------------------------ drawing
/**
 * Draw a mask as lettering. o: { c (ink), out (outline colour), ow (outline width, default 1), sh ([dx, dy, colour] hard
 * shadow, under the outline too), align: 'l' | 'c' | 'r', base: true -> y is the bottom edge }. Returns the mask.
 */
export function label(px, m, x, y, o = {}) {
  const ow = o.out !== undefined && o.out !== null ? (o.ow ?? 1) : 0;
  let ox = o.align === 'c' ? Math.round(x - m.w / 2) : o.align === 'r' ? x - m.w : x;
  const oy = o.base ? y - m.h : y;
  ox = Math.round(ox);
  if (o.sh) { const g = ow ? grow(m, ow, o.round) : m; px.mask(g, ox - ow + o.sh[0], oy - ow + o.sh[1], o.sh[2]); }
  if (ow) px.mask(grow(m, ow, o.round), ox - ow, oy - ow, o.out);
  px.mask(m, ox, oy, o.c ?? 0x241a1e);
  return m;
}
/** Micro text, wrapped to a width; returns the y after the last line. o: { c, lh (line height, 7), align } */
export function small(px, str, x, y, w, o = {}) {
  const lh = o.lh ?? 7, words = String(str).split(' ');
  let line = '';
  const put = (s) => { const m = m3(s); px.mask(m, o.align === 'c' ? Math.round(x + (w - m.w) / 2) : o.align === 'r' ? x + w - m.w : x, y, o.c ?? 0x241a1e); y += lh; };
  for (const wd of words) {
    const t = line ? line + ' ' + wd : wd;
    if (w3(t) > w && line) { put(line); line = wd; } else line = t;
  }
  if (line) put(line);
  return y;
}
export { at as maskAt };
