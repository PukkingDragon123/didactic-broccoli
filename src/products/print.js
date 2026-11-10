// The printer's stock for the label studio: background patterns, bursts and ribbons, and the small print every 1999
// Japanese pack carries: the 品名 / 原材料名 / 内容量 / 賞味期限 / 製造者 box, a JAN barcode (49...), the steel / aluminium /
// PET marks, "あき缶はくずかごへ" with its little figure, a price with 税別. Flat inks and ordered dithering only.
import { Px, dith, dk, lt, on, NONE } from './px.js';
import { m5, m3, mk, bold, label, x2 } from './type.js';

const INK = 0x2e1f28, W = 0xfffaf0;

// ------------------------------------------------------------------ patterns: (x, y) -> colour, for any fill
export const PAT = {
  /** Stripes w wide: dir 'v' | 'h' | 'd' (rising) | 'e' (falling). */
  stripes: (a, b, w = 4, dir = 'v') => (x, y) => { const t = dir === 'v' ? x : dir === 'h' ? y : dir === 'd' ? x + y : x - y + 4096; return Math.floor(t / w) % 2 ? b : a; },
  /** Polka dots on a staggered grid. */
  dots: (bg, fg, pitch = 10, r = 2.2) => (x, y) => { const row = Math.floor(y / pitch), ox = row % 2 ? pitch / 2 : 0; const dx = ((x + ox) % pitch) - pitch / 2 + 0.5, dy = (y % pitch) - pitch / 2 + 0.5; return dx * dx + dy * dy <= r * r ? fg : bg; },
  /** A sunburst from (cx, cy): n rays. */
  rays: (a, b, cx, cy, n = 12) => (x, y) => (Math.floor(((Math.atan2(y + 0.5 - cy, x + 0.5 - cx) + Math.PI) / (Math.PI * 2)) * n * 2) % 2 ? b : a),
  checks: (a, b, n = 6) => (x, y) => ((Math.floor(x / n) + Math.floor(y / n)) % 2 ? b : a),
  /** Wavy bands. */
  waves: (a, b, period = 24, amp = 3, band = 8) => (x, y) => (Math.floor((y + Math.sin((x / period) * Math.PI * 2) * amp + 4096) / band) % 2 ? b : a),
  /** Seigaiha: rows of overlapping arcs (the old wave pattern). */
  seigaiha: (a, b, r = 10) => (x, y) => {
    const row = Math.floor(y / (r / 2)), best = [0, -1].map((k) => { const rr = row + k, cy = (rr + 1) * (r / 2) + r / 2, cx = (Math.floor((x + (rr % 2 ? r : 0)) / (r * 2)) * r * 2) + r - (rr % 2 ? r : 0); return Math.hypot(x + 0.5 - cx, y + 0.5 - cy); });
    for (const d of best) if (d <= r) return Math.floor(d / (r / 3.4)) % 2 ? a : b;
    return a;
  },
  /** Diamonds (argyle). */
  diamonds: (a, b, w = 12, h = 16) => (x, y) => ((Math.floor((x / w + y / h)) + Math.floor((x / w - y / h + 64))) % 2 ? b : a),
  /** A dithered fade from a (top, y0) to b (bottom, y1): two flat inks, ordered dots between. */
  fade: (a, b, y0, y1) => (x, y) => (dith(x, y, (y - y0) / Math.max(1, y1 - y0)) ? b : a),
  /** The same sideways. */
  fadeX: (a, b, x0, x1) => (x, y) => (dith(x, y, (x - x0) / Math.max(1, x1 - x0)) ? b : a),
  /** Halftone dots that swell towards (cx, cy). */
  halftone: (bg, fg, cx, cy, reach = 80, pitch = 6) => (x, y) => { const gx = Math.floor(x / pitch) * pitch + pitch / 2, gy = Math.floor(y / pitch) * pitch + pitch / 2; const r = Math.max(0, 1 - Math.hypot(gx - cx, gy - cy) / reach) * pitch * 0.62; return Math.hypot(x + 0.5 - gx, y + 0.5 - gy) <= r ? fg : bg; },
  /** Scattered little bubbles (rings) from a fixed table. */
  fizz: (bg, fg, seed = 1) => { const B = []; let s = seed * 7919; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647); for (let i = 0; i < 40; i++) B.push([r() * 256, r() * 256, 1.5 + r() * 3.5]); return (x, y) => { for (const [bx, by, br] of B) { const d = Math.hypot(((x % 256) + 0.5) - bx, ((y % 256) + 0.5) - by); if (d <= br && d > br - 1.15) return fg; } return bg; }; },
};

// Nothing on a pack may look generated (docs/ART.md): grounds are flat inks, and what decorates them is drawn or
// photographed and placed by hand. The repeating fills above are kept for the two things that are themselves the
// design (a striped sweet wrapper, the polka dots the milky drink is known for: PAT.raw); everywhere else they give
// the plain ground colour. Sunbursts (rays) and two-ink dither fades (skies) stay: they are drawn pictures.
PAT.raw = { stripes: PAT.stripes, dots: PAT.dots };
for (const k of ['stripes', 'checks', 'waves', 'seigaiha', 'diamonds', 'halftone', 'fizz', 'dots']) PAT[k] = (a) => () => a;

// ------------------------------------------------------------------ badges
/** Lines of lettering centred on (cx, cy). lines: [{ m (mask), c }] or masks. */
function stackText(p, cx, cy, lines, c, gap = 2) {
  const L = lines.map((l) => (l.m ? l : { m: l })), H = L.reduce((a, l) => a + l.m.h + gap, -gap);
  let y = Math.round(cy - H / 2);
  for (const l of L) { label(p, l.m, cx, y, { c: l.c ?? c, align: 'c', out: l.out, sh: l.sh }); y += l.m.h + gap; }
}
/** A starburst flash with lettering: 新発売, 果汁10%, おまけ付き. o: { c, ink, text (colour), n, rim, rot } */
export function burst(p, cx, cy, r, lines, o = {}) {
  const c = o.c ?? 0xffd23f, ink = o.ink ?? INK, n = o.n ?? 12;
  p.burst(cx, cy, r + 1.5, r * 0.78 + 1.5, n, ink, o.rot ?? 0.2);
  p.burst(cx, cy, r, r * 0.78, n, c, o.rot ?? 0.2);
  if (o.rim) p.ring(cx, cy, r * 0.7, r * 0.7, 1, o.rim);
  stackText(p, cx, cy, lines, o.text ?? 0xc8281e, o.gap ?? 1);
}
/** A round seal: ring, lettering. o: { c, ink, text, double } */
export function roundel(p, cx, cy, r, lines, o = {}) {
  const c = o.c ?? W, ink = o.ink ?? INK;
  p.ell(cx, cy, r + 1, r + 1, ink); p.ell(cx, cy, r, r, c);
  if (o.double) p.ring(cx, cy, r - 2, r - 2, 1, o.double);
  stackText(p, cx, cy, lines, o.text ?? ink, o.gap ?? 1);
}
/** A ribbon with notched ends. o: { c, ink, text } */
export function ribbon(p, x, y, w, h, m, o = {}) {
  const c = o.c ?? 0xe0443a, ink = o.ink ?? INK, n = Math.round(h * 0.4);
  const tail = (x0, s) => { p.poly([[x0, y + 3], [x0 + s * (n + 6), y + 3], [x0 + s * (n + 6), y + h + 3], [x0, y + h + 3], [x0 + s * n, y + 3 + h / 2]], dk(c, 0.3)); };
  tail(x - 6, 1); tail(x + w + 6, -1);
  p.rect(x - 1, y - 1, w + 2, h + 2, ink); p.rect(x, y, w, h, c); p.rect(x, y + h - 2, w, 2, dk(c, 0.18));
  label(p, m, x + w / 2, y + Math.round((h - m.h) / 2), { c: o.text ?? on(c), align: 'c' });
}
/** A rounded tag (あったか〜い / つめた〜い / 無糖). */
export function pill(p, x, y, m, o = {}) {
  const c = o.c ?? 0xe0443a, w = m.w + (o.pad ?? 8), h = m.h + (o.padY ?? 4);
  const x0 = o.align === 'c' ? Math.round(x - w / 2) : x;
  if (o.ink !== null) p.rrect(x0 - 1, y - 1, w + 2, h + 2, (h + 2) / 2, o.ink ?? INK);
  p.rrect(x0, y, w, h, h / 2, c);
  label(p, m, x0 + Math.round((w - m.w) / 2), y + Math.round((h - m.h) / 2), { c: o.text ?? on(c) });
  return { w, h, x: x0 };
}
/** A red hanko seal with kanji stacked in it. */
export function seal(p, x, y, text, o = {}) {
  const c = o.c ?? 0xc8281e, size = o.size ?? 12, chars = [...text], cols = o.cols ?? (chars.length > 2 ? 2 : 1), rows = Math.ceil(chars.length / cols);
  const w = cols * (size + 1) + 5, h = rows * (size + 1) + 5;
  if (o.round) p.ell(x + w / 2, y + h / 2, w / 2 + 1, h / 2 + 1, c); else p.rrect(x, y, w, h, 2, c);
  p.frame(x + 1, y + 1, w - 2, h - 2, o.paper ?? W);
  chars.forEach((ch, i) => { const col = cols - 1 - Math.floor(i / rows), row = i % rows, m = mk(ch, size); p.mask(m, x + 3 + col * (size + 1) + Math.round((size - m.w) / 2), y + 3 + row * (size + 1) + Math.round((size - m.h) / 2), o.paper ?? W); });
  return { w, h };
}

// ------------------------------------------------------------------ the small print
/** Advance of a string set in DotGothic at `size` (full-width glyphs = size, ASCII = half). */
const adv = (s, size) => [...s].reduce((a, ch) => a + (ch.charCodeAt(0) > 0x2e7f ? size : Math.ceil(size / 2)), 0);
/** Break text into lines no wider than w pixels (Japanese: anywhere; keeps 、。 off the start of a line). */
export function wrapJP(text, w, size = 12) {
  const out = []; let line = '';
  for (const ch of [...text]) {
    if (adv(line + ch, size) > w && line && !'、。）」'.includes(ch)) { out.push(line); line = ch; } else line += ch;
  }
  if (line) out.push(line);
  return out;
}
/**
 * The 品名 box: rows [[heading, text], ...] set small, headings on a tinted tab. Returns the y under it.
 * o: { ink, paper, size (12), lh, frame, max (y limit: rows that don't fit are dropped) }
 */
export function infoBox(p, x, y, w, rows, o = {}) {
  const ink = o.ink ?? INK, size = o.size ?? 12, lh = o.lh ?? size + 2, paper = o.paper ?? null;
  const y0 = y;
  const plan = [];
  for (const [head, text] of rows) {
    const hw = adv(head, size) + 4;
    const lines = wrapJP(text, w - hw - 6, size);
    const rest = lines.length > 1 ? wrapJP([...text].slice([...lines[0]].length).join(''), w - 6, size) : [];
    const n = 1 + rest.length;
    if (o.max && y + n * lh + 3 > o.max) break;
    plan.push({ head, hw, first: lines[0] || '', rest, y });
    y += n * lh + 1;
  }
  if (paper !== null) p.rect(x, y0, w, y - y0 + 1, paper);
  for (const r of plan) {
    p.rect(x + 1, r.y + 1, r.hw, lh - 1, o.tab ?? dk(paper ?? W, 0.16));
    label(p, mk(r.head, size), x + 3, r.y + 1 + Math.round((lh - size) / 2), { c: ink });
    label(p, mk(r.first, size), x + r.hw + 4, r.y + 1 + Math.round((lh - size) / 2), { c: ink });
    r.rest.forEach((l, i) => label(p, mk(l, size), x + 4, r.y + 1 + (i + 1) * lh + Math.round((lh - size) / 2), { c: ink }));
    if (r !== plan[0]) p.rect(x + 1, r.y, w - 2, 1, o.rule ?? dk(paper ?? W, 0.3));
  }
  if (o.frame !== false) p.frame(x, y0, w, y - y0 + 1, ink);
  return y + 2;
}

const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
/** The thirteen digits of a JAN code from its first twelve (check digit worked out). */
export function jan13(d12) { const d = [...String(d12).padEnd(12, '0').slice(0, 12)].map(Number); const s = d.reduce((a, v, i) => a + v * (i % 2 ? 3 : 1), 0); return d.join('') + ((10 - (s % 10)) % 10); }
/**
 * A JAN-13 barcode, one pixel per module, in its white box with the digits under it. (x, y) = box top-left.
 * Box: 113 x (h + 13). Returns { w, h }.
 */
export function barcode(p, x, y, d12, o = {}) {
  const code = jan13(d12), h = o.h ?? 20, ink = o.ink ?? 0x1e1820;
  const bw = 113, bh = h + 13;
  p.rect(x, y, bw, bh, o.paper ?? 0xffffff);
  let bits = '101';
  const par = PARITY[+code[0]];
  for (let i = 1; i <= 6; i++) bits += (par[i - 1] === 'L' ? L : G)[+code[i]];
  bits += '01010';
  for (let i = 7; i <= 12; i++) bits += L[+code[i]].replace(/[01]/g, (b) => (b === '1' ? '0' : '1'));
  bits += '101';
  const bx = x + 11;
  for (let i = 0; i < bits.length; i++) if (bits[i] === '1') { const guard = i < 3 || (i >= 45 && i < 50) || i >= 92; p.rect(bx + i, y + 3, 1, h + (guard ? 4 : 0), ink); }
  p.mask(m3(code[0]), x + 4, y + h + 6, ink);
  p.mask(m3(code.slice(1, 7)), bx + 6, y + h + 6, ink);
  p.mask(m3(code.slice(7)), bx + 52, y + h + 6, ink);
  return { w: bw, h: bh, code };
}

/** The material mark: 'steel' (circle of arrows), 'alu' (triangle of arrows), 'pet' (triangle, 1), 'paper', 'glass'. ~26 px. */
export function recycle(p, x, y, kind = 'steel', o = {}) {
  const ink = o.ink ?? INK, s = 26;
  if (o.paper !== null) p.rect(x, y, s, s + (o.caption === false ? 0 : 11), o.paper ?? W);
  const cx = x + s / 2, cy = y + s / 2;
  if (kind === 'steel' || kind === 'glass') {
    p.ring(cx, cy, 12, 12, 2, ink);
    // two arrowheads on the ring, the gaps before them
    p.rect(Math.round(cx) - 1, y, 4, 4, o.paper ?? W); p.poly([[cx + 3, y - 1], [cx + 3, y + 6], [cx - 2, y + 2.5]], ink);
    p.rect(Math.round(cx) - 3, y + s - 4, 4, 4, o.paper ?? W); p.poly([[cx - 3, y + s + 1], [cx - 3, y + s - 6], [cx + 2, y + s - 2.5]], ink);
    label(p, mk(kind === 'steel' ? '鉄' : 'ガ', 12), cx, cy - 6, { c: ink, align: 'c' });
  } else {
    const A = [cx, y + 1], B = [x + s - 1, y + s - 3], C = [x + 1, y + s - 3];
    p.path([A, B, C], ink, 2, true);
    // arrowheads at the corners
    p.poly([[A[0] + 1, A[1] - 1], [A[0] + 6, A[1] + 3], [A[0] - 1, A[1] + 5]], ink);
    p.poly([[B[0] + 1, B[1] + 1], [B[0] - 6, B[1] + 2], [B[0] - 2, B[1] - 5]], ink);
    p.poly([[C[0] - 1, C[1] + 1], [C[0] + 2, C[1] - 6], [C[0] + 6, C[1] + 1]], ink);
    if (kind === 'pet') label(p, m5('1'), cx, cy - 1, { c: ink, align: 'c' });
    else label(p, mk(kind === 'alu' ? 'ア' : '紙', 12), cx, cy - 3, { c: ink, align: 'c' });
  }
  if (o.caption !== false) label(p, kind === 'pet' ? m5('PET') : mk({ steel: 'スチール', alu: 'アルミ', paper: '紙パック', glass: 'ガラス' }[kind], 8 + (kind === 'paper' ? 0 : 0)), cx, y + s + 1, { c: ink, align: 'c' });
  return { w: s, h: s + 11 };
}
/** The tidy-man: a little figure dropping a can into a bin (24 x 24), for あき缶はくずかごへ. */
export function binMan(p, x, y, ink = INK) {
  const R = ['........................', '.....###................', '....#####...............', '....#####...............', '.....###................', '....#####....##.........', '...#######..####........', '..#########.####........', '..##.####.###...........', '..##.####..##...........', '..##.####...............', '.....####....#########..', '.....####....#########..', '....##..##....#.#.#.#...', '....##..##....#.#.#.#...', '....##..##....#.#.#.#...', '....##..##....#.#.#.#...', '...###..###...#.#.#.#...', '...##....##...#######...', '..###....###..#######...'];
  p.sprite(R, { '#': ink }, x, y + 2);
}
/** "あき缶はくずかごへ" with the figure, in a ruled box. Returns its height. */
export function binNote(p, x, y, w, o = {}) {
  const ink = o.ink ?? INK;
  if (o.paper !== null && o.paper !== undefined) p.rect(x, y, w, 26, o.paper);
  binMan(p, x + 1, y, ink);
  const two = w < 26 + 9 * 12 + 2;
  if (two) { label(p, mk('あき缶は', 12), x + 28, y + 1, { c: ink }); label(p, mk('くずかごへ', 12), x + 28, y + 13, { c: ink }); }
  else label(p, mk('あき缶はくずかごへ', 12), x + 28, y + 7, { c: ink });
  return 26;
}
/** ¥130 税別 as a little price flash. */
export function price(p, x, y, yen, o = {}) {
  const ink = o.ink ?? INK, m = m5('¥' + yen, o.s ?? 2);
  label(p, m, x, y, { c: o.c ?? ink });
  label(p, mk('税別', 12), x + m.w + 3, y + m.h - 12, { c: ink });
  return m.w + 3 + 24;
}
/** A brand's small mark for back panels and lids: kana set bold with a rule under it. */
export function brandLine(p, x, y, w, jp, en, o = {}) {
  const c = o.c ?? INK;
  const m = bold(mk(jp, 16));
  label(p, m, x + w / 2, y, { c, align: 'c' });
  if (en) label(p, m3(en), x + w / 2, y + m.h + 2, { c, align: 'c' });
  return m.h + (en ? 9 : 2);
}
export { stackText, adv, x2, lt, NONE, Px };
