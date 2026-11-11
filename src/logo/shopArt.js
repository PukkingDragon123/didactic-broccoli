// Where the shop's logo and name show in the lane (src/logo/logo.js), painted as pixel art at about a centimetre a
// texel: the three panels of the noren over the shutter (indigo cotton, the logo dyed on a cream roundel on the
// middle panel, the name in white across the outer two), and the projecting sign on the right pier (袖看板: a cream
// enamel board in a black frame, the logo at the top and the name down it). Until the player draws a logo the noren
// keeps Grandpa's crest and the name ガチャガレージ / GACHA GARAGE.
//   paintNoren(pix, part 'L' | 'C' | 'R', L)   paintSign(pix, L)   norenPreview(L), signPreview(L) -> canvas
import { Pix } from '../gfx/pix.js';
import { draw5, textW5 } from '../gfx/font5x7.js';
import { paintLogo } from './logo.js';

export const NOREN = { w: 66, h: 72 }; // texels a panel (0.66 x 0.72 m)
export const SIGN = { w: 44, h: 104 }; // the board's face (0.44 x 1.04 m)
const IND = 0x24345e, IND_L = 0x2e4274, IND_D = 0x182446, WHITE = 0xf2eee4, CREAM = 0xf4ead0, INK = 0x241a1e, RED = 0xc8322c;
const hash = (x, y, s = 0) => { let h = Math.imul(x * 374761393 + y * 668265263 + s * 2147483647, 1274126177); h ^= h >>> 13; return ((h >>> 0) % 1000) / 1000; };
const hex = (c) => '#' + c.toString(16).padStart(6, '0');

/** DotGothic16 characters as hard texels, centred on cx (one per 16 texels), or down a column (vert). */
function glyphs(p, str, cx, y, col, { vert = false, size = 16, shadow = null } = {}) {
  const chars = [...str];
  if (!chars.length) return;
  const t = document.createElement('canvas'); t.width = t.height = size + 2;
  const g = t.getContext('2d', { willReadFrequently: true });
  chars.forEach((ch, i) => {
    g.clearRect(0, 0, t.width, t.height);
    g.font = `${size}px "DotGothic16"`; g.textBaseline = 'top'; g.fillStyle = '#000'; g.fillText(ch, 0, 0);
    const d = g.getImageData(0, 0, t.width, t.height).data;
    const x0 = vert ? Math.round(cx - size / 2) : Math.round(cx - (chars.length * size) / 2 + i * size), y0 = vert ? y + i * (size + 1) : y;
    for (let j = 0; j < t.height; j++) for (let k = 0; k < t.width; k++) if (d[(j * t.width + k) * 4 + 3] > 110) {
      if (shadow != null) p.px(x0 + k + 1, y0 + j + 1, shadow);
      p.px(x0 + k, y0 + j, col);
    }
  });
}
function text5(p, str, cx, y, col) {
  const c = p.ctx; p.flush();
  draw5(c, str, Math.round(cx - textW5(str) / 2), y, { s: 1, col: hex(col) });
  p.pull();
}

/** One noren panel. */
export function paintNoren(p, part, L) {
  const { w, h } = p;
  // indigo cotton: a woven tooth, faint vertical folds, the loops' shadow at the top and a double hem
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const fold = Math.sin(x / w * Math.PI * 2 + (part === 'L' ? 0.5 : part === 'R' ? 2.1 : 1.3));
    let c = (x * 3 + y * 5) % 11 === 0 ? IND_L : IND;
    if (fold > 0.86) c = (x + y) % 2 ? IND_L : c; else if (fold < -0.88) c = (x + y) % 2 ? IND_D : c;
    if (hash(x, y, 7) < 0.04) c = IND_D;
    p.px(x, y, c);
  }
  p.rect(0, 0, w, 6, IND_D);
  for (let x = 3; x < w; x += 11) { p.rect(x, 0, 6, 5, IND_L); p.rect(x, 5, 6, 1, IND_D); } // the loops round the rod
  p.rect(0, h - 4, w, 1, 0x8a9ac8); p.rect(0, h - 2, w, 2, IND_D);
  p.rect(0, 6, 1, h - 6, IND_D); p.rect(w - 1, 6, 1, h - 6, IND_D);
  if (part === 'C') {
    // the logo on a cream roundel (the crest dyed white when it's still Grandpa's)
    const cx = w >> 1, cy = 30, R = 22;
    for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) { const d = x * x + y * y; if (d <= R * R + R) p.px(cx + x, cy + y, d > (R - 2) * (R - 2) + R ? WHITE : L.custom ? CREAM : IND); }
    const s = 32;
    paintLogo(p, cx - s / 2, cy - s / 2, s, L.custom ? { L } : { L, mono: WHITE });
    text5(p, L.en, cx, h - 14, WHITE);
  } else {
    // the name across the outer panels, white, the left half on the left
    const chars = [...L.jp], half = Math.ceil(chars.length / 2), mine = part === 'L' ? chars.slice(0, half) : chars.slice(half);
    const per = Math.min(4, mine.length);
    if (per) {
      const rows = Math.ceil(mine.length / 4);
      for (let r = 0; r < rows; r++) glyphs(p, mine.slice(r * 4, r * 4 + 4).join(''), w / 2, 22 + r * 18 - (rows - 1) * 9, WHITE);
    }
  }
  p.noise(0.03);
  return p;
}

/** The projecting sign's face: cream enamel in a black frame, red rules, the logo, the name down it. */
export function paintSign(p, L) {
  const { w, h } = p;
  p.fill(INK);
  p.rect(2, 2, w - 4, h - 4, CREAM);
  p.frame(4, 4, w - 8, h - 8, RED);
  for (let i = 0; i < 260; i++) { const x = 3 + Math.floor(hash(i, 1, 3) * (w - 6)), y = 3 + Math.floor(hash(i, 2, 3) * (h - 6)); p.px(x, y, hash(i, 3, 3) < 0.5 ? 0xe8dcc0 : 0xfaf4e4); } // enamel speckle
  // rust and chips round the bolts and the edge
  for (const [x, y] of [[6, 6], [w - 7, 6], [6, h - 7], [w - 7, h - 7]]) { p.rect(x - 1, y - 1, 3, 3, 0x6a5a50); p.px(x, y, 0xb8b0a0); p.px(x + 1, y + 1, 0x8a5a3a); }
  for (let i = 0; i < 14; i++) { const x = 2 + Math.floor(hash(i, 9, 1) * (w - 4)), y = hash(i, 8, 1) < 0.5 ? 2 : h - 3; p.px(x, y, 0x8a5a3a); }
  // the logo, the name down the board (up to 6 characters at 16 texels; longer names in two columns)
  const s = 32, ly = 9;
  paintLogo(p, (w - s) >> 1, ly, s, { L });
  p.rect(8, ly + s + 3, w - 16, 1, RED);
  const chars = [...L.jp], top = ly + s + 7, room = Math.floor((h - top - 14) / 17);
  if (chars.length <= room) glyphs(p, chars.join(''), w / 2, top, INK, { vert: true });
  else { const k = Math.ceil(chars.length / 2); glyphs(p, chars.slice(0, k).join(''), w / 2 + 9, top, INK, { vert: true }); glyphs(p, chars.slice(k).join(''), w / 2 - 9, top, INK, { vert: true }); }
  const en = L.en.length > 8 ? L.en.split(' ')[0].slice(0, 8) : L.en;
  text5(p, en, w / 2, h - 13, RED);
  return p;
}

/** The three noren panels side by side (the editor's preview). */
export function norenPreview(L) {
  const g = 2, cv = document.createElement('canvas');
  cv.width = NOREN.w * 3 + g * 2; cv.height = NOREN.h;
  const x = cv.getContext('2d');
  ['L', 'C', 'R'].forEach((part, i) => x.drawImage(paintNoren(new Pix(NOREN.w, NOREN.h, 5), part, L).flush().canvas, i * (NOREN.w + g), 0));
  return cv;
}
export function signPreview(L) { return paintSign(new Pix(SIGN.w, SIGN.h, 6), L).flush().canvas; }
