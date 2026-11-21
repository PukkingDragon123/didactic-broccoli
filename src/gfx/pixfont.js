// High-resolution pixel type for everything the game draws into canvases (screens, labels, tickets, seals, flyers):
// Alagard (src/ui/fonts.css) for Latin, DotGothic16 for kana and kanji, both set at their native 16 px grid (or whole
// multiples of it), rasterised once per glyph and alpha-thresholded, so every edge is a hard pixel step: never
// smoothed, never a tiny bitmap face, never a blown-up chunky glyph. (It replaces the old 5 x 7 bitmap font.)
//   textWPx(str, s = 1)          width in px of one line at scale s (s: whole multiples of the 16 px grid)
//   drawPx(g, str, x, y, o)      o: { s, col, align: 'left'|'center'|'right', lh (gap between lines), max (steps s
//                                down to fit, never below 1) }; y = the top of the capitals. Returns { w, h, s }.
//   maskPx(str) -> [[x, y]...]   the lit pixels of one line at scale 1, relative to its cap top-left
//   PX_CAP, PX_LINE              cap height and line pitch at scale 1
const EN = '"Alagard", "Pixelify Sans", "DotGothic16"', JP = '"DotGothic16", "Pixelify Sans"';
const SIZE = 16, BASE = 14; // native size; the baseline row inside a glyph cell
export const PX_CAP = 11, PX_LINE = 16;
const ALIAS = { '’': '\'', '‘': '\'', '“': '"', '”': '"', '–': '-', '—': '-', '…': '...' };
const cjk = (ch) => ch.codePointAt(0) > 0x2e7f;
const cache = new Map();
let cv = null, cx = null;

function glyph(ch) {
  const c = ALIAS[ch] ?? ch;
  let gl = cache.get(c);
  if (gl) return gl;
  if (typeof document === 'undefined') return { w: 8, px: [] };
  if (!cv) { cv = document.createElement('canvas'); cv.width = cv.height = 48; cx = cv.getContext('2d', { willReadFrequently: true }); }
  const font = `${SIZE}px ${cjk(c) ? JP : EN}`;
  cx.clearRect(0, 0, 48, 48); cx.font = font; cx.textBaseline = 'alphabetic'; cx.fillStyle = '#fff';
  cx.fillText(c, 4, 4 + BASE);
  const d = cx.getImageData(0, 0, 48, 48).data, px = [];
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (d[(y * 48 + x) * 4 + 3] > 110) px.push([x - 4, y - 4 - (BASE - PX_CAP)]);
  gl = { w: Math.round(cx.measureText(c).width), px };
  // only keep it once the face itself is in (before that the browser draws a fallback font)
  if (document.fonts?.check?.(font, c) !== false) cache.set(c, gl);
  return gl;
}

/** Width in pixels of one line at scale s. */
export function textWPx(str, s = 1) {
  let w = 0;
  for (const ch of String(str)) w += glyph(ch).w * s;
  return w;
}

/** Draw pixel text (see the header). */
export function drawPx(g, str, x, y, o = {}) {
  const lines = String(str).split('\n');
  let s = Math.max(1, Math.round(o.s || 1));
  if (o.max) while (s > 1 && Math.max(...lines.map((l) => textWPx(l, s))) > o.max) s--;
  const gap = o.lh ?? (PX_LINE - PX_CAP) * s;
  g.save(); g.fillStyle = o.col || '#1a1420';
  let yy = Math.round(y), wmax = 0;
  for (const line of lines) {
    const lw = textWPx(line, s);
    wmax = Math.max(wmax, lw);
    let xx = Math.round(o.align === 'center' ? x - lw / 2 : o.align === 'right' ? x - lw : x);
    for (const ch of line) {
      const gl = glyph(ch);
      for (const [gx, gy] of gl.px) g.fillRect(xx + gx * s, yy + gy * s, s, s);
      xx += gl.w * s;
    }
    yy += PX_CAP * s + gap;
  }
  g.restore();
  return { w: wmax, h: yy - Math.round(y) - gap, s };
}

/** The lit pixels of one line at scale 1, relative to its cap top-left. */
export function maskPx(str) {
  const out = [];
  let xx = 0;
  for (const ch of String(str)) {
    const gl = glyph(ch);
    for (const [gx, gy] of gl.px) out.push([xx + gx, gy]);
    xx += gl.w;
  }
  return out;
}
