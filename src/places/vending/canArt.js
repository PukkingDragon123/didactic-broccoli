// Pixel-art drink designs for the vending machines: every drink in src/needs/foods.js gets an original parody label
// (flat colours, a logo in the 5x7 bitmap font, crisp kanji from DotGothic16 thresholded to whole pixels, a little
// hand-pixelled emblem) drawn two ways: as a can / bottle sample standing in the machine's window, and as the full
// label unrolled for the close-up. No gradients, no glows: cylinders are shaded with flat bands.
//   drawSample(ctx, food, x, y, w, h)     drawLabel(ctx, food, x, y, w, h)     kanji(ctx, text, x, y, size, col)
import { draw5, textW5 } from '../../gfx/font5x7.js';

const css = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0');
const sh = (n, k) => { const r = Math.min(255, Math.round(((n >> 16) & 255) * k)), g = Math.min(255, Math.round(((n >> 8) & 255) * k)), b = Math.min(255, Math.round((n & 255) * k)); return (r << 16) | (g << 8) | b; };
const lum = (n) => (((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) / 255;

// emblems: 9x9, 'a' ink, 'b' second band colour, 'c' first band colour, 'W' white, 'k' black
const EMB = {
  quiff: ['..aaaaa..', '.aaaaaaa.', 'aaaaaaaaa', 'aa.aaaaaa', '...aaaa..', '..W.W....', '..aaaa...', '...aa....', '.........'],
  sun: ['....b....', '.b..b..b.', '..bbbbb..', '.bbbbbbb.', 'bbbbbbbbb', '.bbbbbbb.', '..bbbbb..', '.b..b..b.', '....b....'],
  zigzag: ['b...b...b', '.b.b.b.b.', '..b...b..', '.........', 'a...a...a', '.a.a.a.a.', '..a...a..', '.........', '.........'],
  steam: ['..a...a..', '.a...a...', '..a...a..', '...a...a.', '..a...a..', '.........', 'bbbbbbbbb', '.bbbbbbb.', '..bbbbb..'],
  leaf: ['......bb.', '....bbbb.', '..bbbbbb.', '.bbbbbab.', '.bbbbab..', 'bbbbab...', 'bbbab....', '.aa......', 'a........'],
  wheat: ['....a....', '...aba...', '..ababa..', '...aba...', '..ababa..', '...aba...', '....a....', '....a....', '....a....'],
  flower: ['...b.b...', '..bbbbb..', '.bbWWWbb.', '..bWaWb..', '.bbWWWbb.', '..bbbbb..', '...b.b...', '....a....', '...aa....'],
  cup: ['..a..a...', '...a..a..', '.........', '.bbbbbb..', '.bWWWWbbb', '.bWWWWb.b', '.bWWWWbbb', '.bbbbbb..', 'aaaaaaaa.'],
  corn: ['....a....', '...bbb...', '..bbbbb..', '..bbbbb..', '..bbbbb..', '..bbbbb..', '.a.bbb.a.', 'aa..b..aa', 'a.......a'],
  beans: ['.........', '.aa...aa.', 'aaaa.aaaa', 'aaaa.aaaa', '.aa...aa.', '...aa....', '..aaaa...', '..aaaa...', '...aa....'],
  mountain: ['.........', '....W....', '...WWa...', '..WWaaa..', '.aaaaaaa.', 'aaaaaaaaa', 'bbbbbbbbb', '.b.b.b.b.', '.........'],
  wave: ['.........', '..aaa....', '.a...a...', 'a..W..a..', '..WWW..a.', '.WWWWW..a', 'bbbbbbbbb', 'b.b.b.b.b', '.........'],
  drop: ['....a....', '....a....', '...aaa...', '...aaa...', '..aaWaa..', '..aWaaa..', '..aaaaa..', '...aaa...', '.........'],
  bolt: ['.....bb..', '....bb...', '...bb....', '..bbbbb..', '....bb...', '...bb....', '..bb.....', '.bb......', '.........'],
  fist: ['.........', '.aaaaaa..', 'aWaWaWaa.', 'aaaaaaaa.', 'aaaaaaaa.', '.aaaaaa..', '..aaaa...', '..aaaa...', '.........'],
  bubbles: ['......a..', '.....a.a.', '..a...a..', '.a.a.....', '..a...a..', '.....a.a.', 'a.....a..', '.a.......', '.........'],
  squiggle: ['.........', '.aa......', 'a..a.....', '....a..a.', '.....aa..', '.........', '.WWWWWWW.', '.........', '.........'],
  grapes: ['....a....', '...a.....', '.bbbbb...', 'bbbbbbb..', '.bbbbbb..', '..bbbbb..', '...bbb...', '....b....', '.........'],
  lemon: ['.........', '...bbbb..', '..bbbbbb.', '.bbbWbbbb', '.bbbbbbbb', '.bbbbbbb.', '..bbbbb..', '.........', '.........'],
  dots: ['.b.....b.', '...b.....', '......b..', '.b.......', '....b...b', '..b......', '.......b.', '.b..b....', '.........'],
  marble: ['...aaa...', '..a...a..', '.a.WW..a.', '.a.W...a.', '.a.....a.', '..a...a..', '...aaa...', '.........', '.........'],
  mustache: ['.........', '.........', '.aa...aa.', 'aaaa.aaaa', 'a.aaaaa.a', '...aaa...', '.........', '.........', '.........'],
  oden: ['....a....', '....a....', '...bbb...', '...bbb...', '...aaa...', '..WWWWW..', '...aaa...', '....a....', '....a....'],
  q: ['..aaaaa..', '.aa...aa.', '......aa.', '....aaa..', '...aa....', '...aa....', '.........', '...aa....', '.........'],
  jar: ['..aaaaa..', '..a...a..', '.aaaaaaa.', '.abbbbba.', '.abWbbba.', '.abbbbba.', '.abbbbba.', '.aaaaaaa.', '.........'],
  cow: ['a.......a', '.aaaaaaa.', '.aWaWWaa.', '.aaaaaaa.', '..WbbbW..', '..bbabb..', '...bbb...', '.........', '.........'],
  stripes: ['b.b.b.b.b', 'b.b.b.b.b', 'b.b.b.b.b', 'b.b.b.b.b', 'b.b.b.b.b', 'b.b.b.b.b', 'b.b.b.b.b', 'b.b.b.b.b', 'b.b.b.b.b'],
  fan: ['.........', 'b.......b', '.b.....b.', '..b...b..', 'bbbbbbbbb', '.bbbbbbb.', '..bbbbb..', '...a.a...', '....a....'],
  plum: ['....b....', '..bWbWb..', '.bbbWbbb.', '.WbbabbW.', '.bbbWbbb.', '..bWbWb..', '....b....', '.........', '.........'],
};

function emblem(ctx, name, x, y, s, a) {
  const e = EMB[name];
  if (!e) return;
  const pal = { a: css(a.ink ?? 0), b: css(a.band2 ?? 0xffffff), c: css(a.band ?? 0xffffff), W: '#ffffff', k: '#141014' };
  e.forEach((row, ry) => { for (let rx = 0; rx < row.length; rx++) { const p = pal[row[rx]]; if (p) { ctx.fillStyle = p; ctx.fillRect(x + rx * s, y + ry * s, s, s); } } });
}

// ------------------------------------------------------------------ crisp kanji (thresholded canvas text)
const kc = document.createElement('canvas');
kc.width = 128; kc.height = 128;
const kx = kc.getContext('2d', { willReadFrequently: true });
const kcache = new Map();
/** Kanji / kana as whole pixels: mask of the text at `size` px (horizontal, or vertical with vert). */
function kmask(text, size, vert = false) {
  const key = text + '|' + size + '|' + vert;
  if (kcache.has(key)) return kcache.get(key);
  kx.clearRect(0, 0, 128, 128);
  kx.fillStyle = '#fff';
  kx.font = `${size}px "DotGothic16", monospace`;
  kx.textBaseline = 'top';
  const chars = [...text];
  let w, h;
  if (vert) { chars.forEach((c, i) => kx.fillText(c, 0, i * size)); w = size; h = chars.length * size; }
  else { kx.fillText(text, 0, 0); w = Math.min(128, Math.ceil(kx.measureText(text).width)); h = size + 2; }
  const d = kx.getImageData(0, 0, Math.max(1, w), Math.max(1, Math.min(128, h))).data;
  const pts = [];
  for (let y = 0; y < Math.min(128, h); y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 110) pts.push(x, y);
  const m = { w, h: Math.min(128, h), pts };
  if (document.fonts?.check?.(`${size}px "DotGothic16"`, text)) kcache.set(key, m);
  return m;
}
export function kanji(ctx, text, x, y, size, col, { vert = false, align = 'left', shadow = null } = {}) {
  const m = kmask(text, size, vert);
  const ox = align === 'center' ? Math.round(x - m.w / 2) : align === 'right' ? x - m.w : x;
  if (shadow != null) { ctx.fillStyle = css(shadow); for (let i = 0; i < m.pts.length; i += 2) ctx.fillRect(ox + m.pts[i] + 1, y + m.pts[i + 1] + 1, 1, 1); }
  ctx.fillStyle = css(col);
  for (let i = 0; i < m.pts.length; i += 2) ctx.fillRect(ox + m.pts[i], y + m.pts[i + 1], 1, 1);
  return m;
}
/** Make sure every glyph we draw is loaded (DotGothic16 subsets load lazily). */
export function loadLabelFonts(foods) {
  const text = foods.map((f) => (f.art?.kanji || '') + (f.jp || '')).join('') + '準備中円売切あたたかいつめたい酒年齢確認はい';
  return document.fonts?.load ? document.fonts.load('16px "DotGothic16"', text).catch(() => {}) : Promise.resolve();
}

// ------------------------------------------------------------------ a sample in the window
/** The can / bottle as it stands behind the glass, w x h px, x / y = top-left. */
export function drawSample(ctx, f, x, y, w, h) {
  const a = f.art || {};
  const shape = a.shape || 'can';
  const body = a.body ?? 0xcccccc;
  let top = y, bw = w, bx = x;
  if (shape === 'pet' || shape === 'mini') {
    // cap, neck, shoulder
    const capW = Math.round(w * 0.36), neckW = Math.round(w * 0.44), capH = Math.max(3, Math.round(h * 0.08)), neckH = Math.round(h * 0.12);
    const cx = x + Math.round((w - capW) / 2), nx = x + Math.round((w - neckW) / 2);
    const glassCol = shape === 'mini' ? sh(body, 0.85) : 0xd8e8ee;
    ctx.fillStyle = css(shape === 'mini' ? a.band2 ?? 0xd8b040 : (a.band2 === 0xffffff ? a.band : a.band2) ?? 0x2a6ad8);
    ctx.fillRect(cx, y, capW, capH);
    ctx.fillStyle = css(glassCol); ctx.fillRect(nx, y + capH, neckW, neckH);
    ctx.fillStyle = css(sh(glassCol, 0.85)); ctx.fillRect(nx + neckW - 1, y + capH, 1, neckH);
    for (let i = 0; i < 3; i++) { const sw = neckW + Math.round((w - neckW) * (i + 1) / 3); ctx.fillStyle = css(glassCol); ctx.fillRect(x + Math.round((w - sw) / 2), y + capH + neckH + i, sw, 1); }
    top = y + capH + neckH + 3;
    if (shape === 'mini') { bw = Math.round(w * 0.8); bx = x + Math.round((w - bw) / 2); }
  } else if (shape === 'cup') {
    ctx.fillStyle = css(0xd8b040); ctx.fillRect(x, y + Math.round(h * 0.28), w, 2);
    top = y + Math.round(h * 0.28) + 2;
  } else {
    // the can's top rim
    ctx.fillStyle = '#c8ccd2'; ctx.fillRect(x + 1, y, w - 2, 2);
    ctx.fillStyle = '#9aa0a6'; ctx.fillRect(x + 1, y + 2, w - 2, 1);
    top = y + 3;
  }
  const bh = y + h - top - (shape === 'can' || shape === 'tall' ? 2 : 0);
  labelBody(ctx, f, bx, top, bw, bh, false);
  if (shape === 'can' || shape === 'tall') { ctx.fillStyle = '#9aa0a6'; ctx.fillRect(x + 1, y + h - 2, w - 2, 2); }
  if (shape === 'pet' || shape === 'cup') {
    // clear plastic above and below the label shows the drink colour
    ctx.fillStyle = css(sh(body, 1.05));
    ctx.fillRect(bx, top, bw, 2);
  }
  // cylinder shading: a highlight band at the left, a shadow band at the right (flat tones)
  ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(bx + 2, top, 2, bh);
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(bx + bw - 3, top, 3, bh);
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(bx + bw - 6, top, 3, bh);
}

/** The printed wrap: body colour, the logo band, sub text, emblem, kanji. big = the unrolled close-up. */
function labelBody(ctx, f, x, y, w, h, big) {
  const a = f.art || {};
  const body = a.body ?? 0xcccccc, band = a.band ?? 0xffffff, band2 = a.band2 ?? 0x333333, ink = a.ink ?? 0x1a1a1a;
  ctx.fillStyle = css(body); ctx.fillRect(x, y, w, h);
  const s = big ? 2 : 1;
  // pattern behind (some designs)
  if (a.emblem === 'dots' || a.emblem === 'stripes') {
    ctx.fillStyle = css(band2);
    for (let yy = 0; yy < h; yy += 6 * s) for (let xx = (yy / (6 * s)) % 2 ? 3 * s : 0; xx < w; xx += 6 * s) ctx.fillRect(x + xx, y + yy, a.emblem === 'dots' ? 2 * s : s, a.emblem === 'dots' ? 2 * s : 6 * s);
  }
  // the logo band at ~45% height
  const bandH = (big ? 26 : 13);
  const by = y + Math.round(h * 0.4);
  ctx.fillStyle = css(band); ctx.fillRect(x, by, w, bandH);
  ctx.fillStyle = css(band2); ctx.fillRect(x, by - s, w, s); ctx.fillRect(x, by + bandH, w, s);
  const logo = a.logo || f.name.toUpperCase();
  const ls = big ? (textW5(logo, 3) < w - 8 ? 3 : 2) : 1;
  const lw = textW5(logo, ls);
  const inkOnBand = lum(band) > 0.55 ? ink : 0xffffff;
  if (lw <= w - 2) draw5(ctx, logo, x + Math.round((w - lw) / 2), by + Math.round((bandH - 7 * ls) / 2), { s: ls, col: css(inkOnBand) });
  else draw5(ctx, logo.slice(0, Math.max(1, Math.floor((w - 2) / (6 * ls)))), x + 1, by + Math.round((bandH - 7 * ls) / 2), { s: ls, col: css(inkOnBand) });
  // sub text under the band
  const sub = a.sub || '';
  const subCol = lum(body) > 0.55 ? ink : 0xffffff;
  if (sub) { const ss = big ? 2 : 1, sw = textW5(sub, ss); if (sw <= w - 2) draw5(ctx, sub, x + Math.round((w - sw) / 2), by + bandH + (big ? 6 : 3), { s: ss, col: css(subCol) }); }
  // emblem in the upper part, kanji down the side
  if (a.emblem && a.emblem !== 'dots' && a.emblem !== 'stripes') {
    const es = big ? 4 : (w >= 26 ? 2 : 1);
    emblem(ctx, a.emblem, x + Math.round((w - 9 * es) / 2) + (big ? -Math.round(w * 0.12) : 0), y + Math.max(1, Math.round((by - y - 9 * es) / 2)), es, a);
  }
  if (a.kanji) {
    if (big) kanji(ctx, a.kanji, x + w - 22, y + 6, 16, subCol, { vert: true });
    else if (h > 40) kanji(ctx, a.kanji.slice(0, 2), x + Math.round(w / 2), y + h - 13, 10, subCol, { align: 'center' });
  }
  if (big) {
    // the small print: a barcode, the volume, ingredients as tiny pixel dashes
    const bx0 = x + 8, by0 = y + h - 34;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(bx0 - 2, by0 - 2, 44, 24);
    ctx.fillStyle = '#141014';
    for (let i = 0; i < 40; i++) if ((i * 7 + 3) % 5 < 3 || i % 9 === 0) ctx.fillRect(bx0 + i, by0, 1, 16);
    draw5(ctx, f.art?.shape === 'pet' ? '500ML' : f.art?.shape === 'mini' ? '120ML' : f.art?.shape === 'tall' ? '500ML' : f.art?.shape === 'cup' ? '180ML' : '350ML', x + w - 50, y + h - 16, { s: 1, col: css(subCol) });
    ctx.fillStyle = css(subCol);
    for (let r = 0; r < 4; r++) for (let i = 0; i < 9; i++) if ((i + r) % 4) ctx.fillRect(x + w - 70 + i * 6, y + h - 52 + r * 6, 4, 1);
  }
}

/** The whole label unrolled (close-up view), w x h. */
export function drawLabel(ctx, f, x, y, w, h) {
  labelBody(ctx, f, x, y, w, h, true);
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x, y, 2, h); ctx.fillRect(x + w - 2, y, 2, h);
}
