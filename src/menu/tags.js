// The title menu's buttons: wooden fuda (shop plaques) threaded on the twine, painted texel by texel (src/menu/pixel.js).
// A plank cut with a stepped point at the left end, a brass grommet in the punched hole (the twine runs through it),
// grain along the board, end grain on the cut, dings; the label carved into the face (ink letters with a lit groove edge
// under them), a hand-pixelled icon of its own (src/menu/tagicons.js, never the gacha capsule) and a red-pen note
// (both in Alagard, a high-res pixel font). The
// first item is a red-lacquered plank with cream letters. Three layers, so the menu can move them apart for depth:
// the face (plain / hot: the lettering turns red-ink or warm cream and the wood warms; never a glow), the plank's
// thick side (the face's silhouette extruded down, end grain) and its hard shadow (silhouette).
//   paintTag({ label, note, icon, w, h, seed, primary, wood, hot }) -> art     paintSide(o) -> art     paintShadow(o)
//   tagMetrics(items, bare) -> { w, h }      HOLE, DEPTH
import { art, textMask, rng, hex, shade, INK } from './pixel.js';

// the price-style note: Alagard too (Pixelify Sans for a glyph Alagard lacks, like ¥), never the tiny 5 x 7 face
const noteMask = (s) => textMask(s, 'Alagard", "Pixelify Sans');
import { iconPx } from './tagicons.js';

export const HOLE = { x: 7, r: 2 }; // the punched hole's centre column (texels)
export const DEPTH = 4; // the plank's thickness, in texels
export const TAG_H = 30;
const CUT = 8;
const WOODS = {
  hinoki: { hi: hex(0xe2bc84), mid: hex(0xcca06a), lo: hex(0xae8252), deep: hex(0x7e5632), side: hex(0x6a4428), sideLo: hex(0x4e301a) },
  keyaki: { hi: hex(0xd09a5e), mid: hex(0xb47c44), lo: hex(0x946034), deep: hex(0x6a4022), side: hex(0x58361c), sideLo: hex(0x3e2412) },
  sugi: { hi: hex(0xd8a274), mid: hex(0xbe8458), lo: hex(0x9c6440), deep: hex(0x6e4228), side: hex(0x5e3820), sideLo: hex(0x422614) },
  red: { hi: hex(0xd8503e), mid: hex(0xc0302a), lo: hex(0xa22824), deep: hex(0x701a18), side: hex(0x5a1616), sideLo: hex(0x3e0e10) },
};
const RED = hex(0xc8322c), CREAM = hex(0xf8efd8), WARM = hex(0xffe39a);
const BRASS = [hex(0xf2d27a), hex(0xc8962e), hex(0x8a5e1c)];

/** Uniform tag size for a set of items (so the strand reads as one set). */
export function tagMetrics(items, bare = false) {
  let lw = 0, nw = 0;
  for (const it of items) { lw = Math.max(lw, textMask(it.label).w); nw = Math.max(nw, it.note ? noteMask(it.note).w : 0); }
  return { w: (bare ? 18 : 42) + lw + 12 + (nw ? nw + 4 : 0) + 6, h: TAG_H, lw, nw };
}

const shapeOf = (w, h) => (x, y) => x >= 0 && y >= 0 && x < w && y < h && x >= CUT - y && x >= CUT - (h - 1 - y)
  && !(x >= w - 2 && (y === 0 || y === h - 1)) && !(x === w - 1 && (y === 1 || y === h - 2));

export function paintTag(o) {
  const w = o.w, h = o.h || TAG_H, T = WOODS[o.primary ? 'red' : o.wood || 'hinoki'];
  const a = art(w, h), r = rng(o.seed || 7), inside = shapeOf(w, h);
  const warm = o.hot ? 1.06 : 1;
  // grain: hard bands along the board, a wavy dark figure, a knot or two (lacquer: a quieter figure)
  const bands = []; let v = 0;
  for (let y = 0; y < h; y++) { if (r() < 0.4) v = Math.floor(r() * 4); bands.push(v); }
  const knots = o.primary ? [] : [[Math.floor(w * (0.55 + r() * 0.35)), 4 + Math.floor(r() * (h - 8))]];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!inside(x, y)) continue;
    let c = [T.mid, T.hi, T.mid, T.lo][bands[y]];
    if (Math.sin(x * (o.primary ? 0.09 : 0.17) + bands[y] * 2.1 + y * 0.6) > (o.primary ? 0.95 : 0.84)) c = T.lo;
    for (const [kx, ky] of knots) { const d = Math.hypot((x - kx) * 0.45, y - ky); if (d < 1.3) c = T.deep; else if (d < 2.4) c = T.lo; }
    if (r() < 0.015) c = T.lo;
    a.px(x, y, shade(c, warm));
  }
  // the edges: ink rim, a lit top / left bevel, a dark bottom / right bevel, end grain along the cut
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!inside(x, y)) continue;
    if (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)) { a.px(x, y, INK); continue; }
    if (!inside(x, y - 2) || (!inside(x - 2, y) && y < h / 2)) a.px(x, y, shade(T.hi, 1.08 * warm));
    else if (!inside(x, y + 2) || !inside(x + 2, y)) a.px(x, y, T.deep);
    else if (x < CUT + 2 && (!inside(x - 2, y) || !inside(x - 3, y)) && (x + y) % 3 === 0) a.px(x, y, T.lo);
  }
  // dings and a nail-scratch (wear)
  for (let i = 0; i < 3; i++) { const x = CUT + 4 + Math.floor(r() * (w - CUT - 8)), y = 3 + Math.floor(r() * (h - 6)); if (inside(x, y)) a.px(x, y, T.deep); }
  // the punched hole and its brass grommet
  const hx = HOLE.x, hy = Math.floor(h / 2);
  for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) {
    const d = Math.hypot(x, y);
    if (d <= 1.6) a.clear(hx + x, hy + y);
    else if (d <= 2.3) a.px(hx + x, hy + y, INK);
    else if (d <= 3.3) a.px(hx + x, hy + y, x + y < 0 ? BRASS[0] : x + y > 1 ? BRASS[2] : BRASS[1]);
    else if (d <= 3.9) a.px(hx + x, hy + y, INK);
  }
  // the icon
  const ic = o.icon && iconPx(o.icon);
  const ix = 16;
  if (ic) {
    const iy = Math.floor((h - ic.h) / 2);
    for (let y = 0; y < ic.h; y++) for (let x = 0; x < ic.w; x++) { const i = (y * ic.w + x) * 4; if (ic.d[i + 3] > 128) a.px(ix + x, iy + y, [ic.d[i], ic.d[i + 1], ic.d[i + 2]]); }
  }
  // the label, carved: the letters in ink (red ink / warm cream when hot), the groove's lower lip lit
  const m = textMask(o.label);
  const lx = ic ? ix + 24 : 18, ly = Math.round((h - m.base) / 2) - 1 + (m.h - m.base > 2 ? 0 : 1);
  const lip = shade(T.hi, 1.12 * warm);
  for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) if (m.at(i, j) && !m.at(i, j + 1) && inside(lx + i, ly + j + 1)) a.px(lx + i, ly + j + 1, lip);
  a.mask(m, lx, ly, o.primary ? (o.hot ? WARM : CREAM) : o.hot ? RED : INK);
  // the note, pencilled like a price on the right (cream on the lacquered plank)
  if (o.note) {
    const n = noteMask(o.note), nx = w - 7 - n.w, ny = Math.round((h - n.base) / 2) - 1;
    a.mask(n, nx, ny, o.primary ? CREAM : RED);
    for (let x = nx - 1; x <= nx + n.w; x++) if (r() < 0.85) a.px(x, ny + n.base + 2, o.primary ? CREAM : RED);
  }
  return a;
}

/** The plank's thick side: its silhouette extruded straight down DEPTH texels, end grain, an ink foot. */
export function paintSide(o) {
  const w = o.w, h = o.h || TAG_H, T = WOODS[o.primary ? 'red' : o.wood || 'hinoki'];
  const a = art(w, h + DEPTH), inside = shapeOf(w, h);
  const ext = (x, y) => { for (let d = 0; d <= DEPTH; d++) if (inside(x, y - d)) return true; return false; };
  for (let y = 0; y < h + DEPTH; y++) for (let x = 0; x < w; x++) {
    if (!ext(x, y)) continue;
    const e = !ext(x - 1, y) || !ext(x + 1, y) || !ext(x, y + 1);
    a.px(x, y, e ? INK : x % 4 === 0 || (x + y) % 7 === 0 ? T.sideLo : T.side);
  }
  return a;
}

/** The hard shadow: the plank and its side as one ink silhouette. */
export function paintShadow(o) {
  const w = o.w, h = o.h || TAG_H, a = art(w, h + DEPTH), inside = shapeOf(w, h);
  for (let y = 0; y < h + DEPTH; y++) for (let x = 0; x < w; x++) {
    for (let d = 0; d <= DEPTH; d++) if (inside(x, y - d)) { a.px(x, y, INK); break; }
  }
  const hx = HOLE.x, hy = Math.floor(h / 2);
  for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) a.clear(hx + x, hy + y);
  return a;
}
