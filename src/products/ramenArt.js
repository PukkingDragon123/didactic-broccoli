// Printed matter for Ramen Yamada, painted with the label studio: the ticket machine's buttons (each a little card
// with the dish drawn on it, its name in kana, the price), the wall plaques, the laminated menu, the signboard, the
// noren, the standing board, the nobori flag and the beer poster (the brewery's owl). Each returns a Px; Ramen.js
// draws them onto its panel canvases.
import { Px, dk, lt, on } from './px.js';
import { m5, m3, mk, bold, x2, label } from './type.js';
import { PAT, burst, pill } from './print.js';
import { ART } from './art.js';
import { spr } from './labels.js';
import { framed, hasPhoto } from './photos.js';

const INK = 0x2e1f28, W0 = 0xfffaf0, RED = 0xc8302a;
const K = (t, z = 12) => mk(t, z), KB = (t) => bold(mk(t, 16));
const putc = (p, m, cx, y, c, out, sh) => label(p, m, cx, y, { c, out, sh, align: 'c' });
const atc = (p, s, cx, by) => p.blit(s, Math.round(cx - s.w / 2), by - s.h);
const S = (w, h, f) => { const p = new Px(w, h); f(p); return p.outline(INK).trim(); };
const memo = new Map();
const BROTH = { rm_shoyu: 0x9a5a22, rm_miso: 0xc8883a, rm_tonkotsu: 0xf0e4c8, rm_shio: 0xe8d8a0, rm_tantan: 0xd04a1e };
/** A small picture of a dish (about 44 x 34). */
export function dish(id) {
  if (memo.has(id)) return memo.get(id);
  const ph = { rm_shoyu: 'ramen_shoyu', rm_tonkotsu: 'ramen_tonkotsu', rm_miso: 'ramen_miso', rm_gyoza: 'gyoza' }[id];
  if (ph && hasPhoto(ph)) { const f = framed(ph, 40, 36, { shape: 'circle', n: 12 }); memo.set(id, f); return f; }
  if (ph) return drawn(id); // (not kept: the photo may still be on its way)
  const s0 = drawn(id); memo.set(id, s0); return s0;
}
function drawn(id) {
  let s;
  if (BROTH[id]) {
    s = S(46, 34, (p) => {
      p.shape(2, 10, 42, 22, (x, y) => y >= 12 && ((x - 23) / 20) ** 2 + ((y - 12) / 18) ** 2 <= 1, W0);
      p.shape(2, 10, 42, 22, (x, y) => y >= 12 && ((x - 23) / 20) ** 2 + ((y - 12) / 18) ** 2 <= 1 && y > 17 && y < 20 && Math.round(x) % 6 < 3, 0xe0443a);
      p.rect(16, 29, 14, 3, W0);
      p.ell(23, 12, 20, 5.5, W0); p.ell(23, 12, 18, 4.2, BROTH[id]);
      for (let x = 9; x < 37; x += 3) p.rect(x, 11 + ((x / 3) % 2), 2, 1, 0xf8e098);
      if (id === 'rm_tantan') { p.ell(23, 12, 5, 2, 0x8a3a1a); p.rect(28, 10, 4, 2, 0x4a9a3a); }
      else if (id === 'rm_miso') { p.rect(26, 10, 5, 3, 0xf8d848); p.rect(14, 11, 6, 2, 0xf4f0e0); }
      else { p.ell(14, 11, 4, 2, 0xf0b8a0); p.rect(27, 8, 8, 5, 0x26342a); p.ell(22, 13, 2.6, 1.4, W0); p.set(22, 13, 0xf8c040); if (id === 'rm_shio') p.rect(30, 13, 3, 1, 0xf8e040); }
    });
  } else if (id === 'rm_gyoza') s = S(46, 26, (p) => { p.ell(23, 19, 21, 6, W0); p.rect(8, 21, 30, 1, 0xd8d4e0); for (let i = 0; i < 6; i++) { const x = 7 + i * 6.4; p.shape(x - 4, 6, 9, 14, (px, py) => ((px - x) / 3.6) ** 2 + ((py - 16) / 9) ** 2 <= 1 && py < 17, 0xf4e8c8); p.rect(Math.round(x - 3), 9, 6, 2, 0xb8742a); p.rect(Math.round(x - 2), 8, 4, 1, 0x8a4a1e); } });
  else if (id === 'rm_rice' || id === 'rm_chashu') s = S(40, 34, (p) => { const don = id === 'rm_chashu'; p.shape(4, 14, 32, 18, (x, y) => y >= 15 && ((x - 20) / 15) ** 2 + ((y - 15) / 15) ** 2 <= 1, don ? 0xc8302a : W0); if (!don) p.rect(6, 17, 28, 2, 0x2a4a8a); p.rect(14, 29, 12, 3, don ? 0x1e1e1e : W0); p.ell(20, 12, 14, 8, don ? 0xb06a3a : 0xfaf8f2); if (don) { p.rect(12, 9, 6, 3, 0x8a4a1e); p.rect(21, 8, 7, 3, 0x8a4a1e); p.rect(18, 12, 4, 2, 0x4a9a3a); } else { p.rect(13, 8, 3, 1, 0xe6e2d8); p.rect(22, 10, 3, 1, 0xe6e2d8); p.rect(17, 6, 2, 1, 0xe6e2d8); } });
  else if (id === 'rm_beer') s = S(40, 44, (p) => { p.shape(4, 0, 16, 44, (x, y) => y >= 1 && y <= 42 && Math.abs(x - 12) <= (y < 12 ? 2.6 : y < 18 ? 2.6 + (y - 12) * 0.7 : 7), 0x6a3a10); p.rect(10, 0, 5, 3, 0xd8b040); p.rect(6, 22, 13, 12, 0xf4e8c0); p.rect(6, 26, 13, 4, 0x1e2a6a); p.rect(6, 19, 1, 22, 0x9a6a30); p.rect(26, 22, 11, 20, 0xe4f2f8); p.rect(27, 28, 9, 13, 0xf0b030); p.rect(27, 24, 9, 5, W0); p.ell(31.5, 23, 5, 2.5, W0); });
  else if (id === 'rm_sake') s = S(40, 40, (p) => { p.shape(4, 0, 20, 40, (x, y) => y >= 1 && y <= 38 && Math.abs(x - 14) <= (y < 8 ? 4 : y < 13 ? 3 : 3 + Math.sin(((y - 13) / 25) * Math.PI) * 6), W0); p.rect(8, 22, 12, 3, 0x1e3a6a); p.rect(11, 1, 6, 2, 0xd8d4e0); p.shape(26, 26, 12, 12, (x, y) => y >= 28 && y <= 37 && Math.abs(x - 32) <= 5.5 - (y - 28) * 0.25, W0); p.rect(27, 29, 10, 1, 0x1e3a6a); for (const [x, ph] of [[12, 0], [17, 2]]) for (let i = 0; i < 5; i++) p.rect(x + Math.round(Math.sin((i + ph) * 0.9)), -i, 1, 1, W0); });
  else if (id === 'rm_oolong') s = ART.glass(0x7a4418, { ice: 0xe8f4fa, straw: 0x2a8a3a });
  else s = S(44, 26, (p) => { p.ell(22, 20, 20, 5, W0); for (let k = 0; k < 7; k++) p.ring(22, 13, 16 - k * 1.6, 9 - k * 0.9, 1, k % 2 ? 0xe8c878 : 0xf8e098); p.ell(22, 13, 5, 3, 0xf8e098); });
  return s;
}
const fitH = (sp, h) => { if (sp.h <= h) return sp; const k = h / sp.h, o = new Px(Math.max(1, Math.round(sp.w * k)), h); for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) o.d[y * o.w + x] = sp.get(Math.floor(x / k), Math.floor(y / k)); return o; };

/** The ticket machine's face: 300 x 372, a header and twelve buttons (3 x 4). sel: lit button (-1: none). */
export function ticketsArt(MENU, FOODS, sel, blink) {
  const W = 300, H = 372, p = new Px(W, H);
  p.fill(0xe9e6de);
  p.rect(0, 0, W, 34, RED); p.rect(0, 34, W, 3, 0x7a1a14);
  label(p, x2(bold(mk('食券', 16))), 8, 1, { c: W0 });
  label(p, K('先にお求めください'), 84, 5, { c: W0 }); label(p, m5('MEAL TICKETS'), 84, 21, { c: 0xffd8a0 });
  MENU.forEach((id, i) => {
    const f = FOODS[id], x = 6 + (i % 3) * 98, y = 42 + Math.floor(i / 3) * 82, drink = id === 'rm_beer' || id === 'rm_sake' || id === 'rm_oolong', on_ = i === sel;
    const base = drink ? 0xdce8f0 : i < 5 ? 0xf8ecd0 : 0xe6eed6;
    p.rect(x, y, 92, 76, 0x6a6e76); p.rect(x + 1, y + 1, 90, 72, base); p.rect(x + 1, y + 73, 90, 2, dk(base, 0.3));
    p.rect(x + 1, y + 1, 90, 17, drink ? 0x2a5ab0 : i < 5 ? RED : 0x3a8a4a);
    const jp = f.jp, m = [...jp].length > 5 ? K(jp, 12) : KB(jp);
    putc(p, m, x + 46, y + ([...jp].length > 5 ? 3 : 1), W0);
    atc(p, fitH(dish(id), 36), x + 30, y + 58);
    label(p, m5(String(f.price), 1), x + 86, y + 26, { c: RED, align: 'r' }); label(p, K('円', 10), x + 76, y + 36, { c: RED });
    // the lamp along the foot of the button
    p.rect(x + 4, y + 62, 84, 8, on_ ? (blink ? 0xff4a32 : 0xa82418) : dk(base, 0.14)); p.rect(x + 4, y + 69, 84, 1, dk(base, 0.4));
    if (on_) { p.frame(x - 1, y - 1, 94, 78, blink ? 0xc8322c : 0xe8b830, 2); label(p, m3('PUSH'), x + 46, y + 63, { c: W0, align: 'c' }); }
  });
  return p;
}
/** A wall plaque: 32 x 88, the dish down the board, the price at the foot. */
export function plaqueArt(f) {
  const p = new Px(32, 88); p.fill(0xe8d0a0);
  for (let x = 0; x < 32; x += 5) p.rect(x, 0, 1, 88, 0xdcc290); p.rect(0, 0, 2, 88, 0xc8a870); p.rect(30, 0, 2, 88, 0xc8a870);
  p.ell(16, 5, 2, 2, 0x5a4a3a);
  const v = mk([...f.jp].slice(0, 5).join(''), 12, { vert: true }); p.mask(v, Math.round(16 - v.w / 2), 10, 0x1a1208);
  putc(p, m5(String(f.price)), 14, 76, RED); label(p, K('円', 10), 24, 74, { c: RED });
  return p;
}
/** The laminated menu: 352 x 200, two columns with the dishes drawn. */
export function menuCardArt(MENU, FOODS, sel) {
  const W = 352, H = 200, p = new Px(W, H);
  p.fill(0xf6eedc); p.frame(0, 0, W, H, 0x8a6a4a, 2); p.frame(4, 4, W - 8, H - 8, 0xd8c8a8);
  p.rect(2, 2, W - 4, 24, RED); label(p, KB('お品書き'), 10, 6, { c: W0 }); label(p, K('らーめん山田'), W - 10, 8, { c: W0, align: 'r' });
  MENU.forEach((id, i) => {
    const f = FOODS[id], x = 8 + Math.floor(i / 6) * 172, y = 31 + (i % 6) * 27;
    if (i === sel) { p.rect(x - 2, y - 1, 168, 26, 0xffe8a0); p.frame(x - 2, y - 1, 168, 26, 0x2f5a9a); }
    atc(p, fitH(dish(id), 22), x + 16, y + 23);
    label(p, K(f.jp, [...f.jp].length > 6 ? 12 : 16), x + 36, y + ([...f.jp].length > 6 ? 6 : 4), { c: 0x241a1e });
    label(p, m5(String(f.price)), x + 150, y + 9, { c: RED, align: 'r' }); label(p, K('円', 10), x + 152, y + 7, { c: RED });
    p.rect(x + 34, y + 24, 132, 1, 0xd8c8a8);
  });
  return p;
}
/** The signboard over the door (320 x 64). */
export function signArt() {
  const p = new Px(320, 64); p.fill(0x2a1a12);
  for (let x = 0; x < 320; x += 23) p.rect(x, 0, 1, 64, 0x34221a);
  p.rect(0, 0, 320, 4, 0xc8a060); p.rect(0, 60, 320, 4, 0xc8a060);
  putc(p, x2(bold(mk('らーめん山田', 16))), 160, 8, 0xf4e8c8, null, [2, 2, 0x0e0806]);
  putc(p, m5('RAMEN YAMADA'), 160, 48, 0xe8402a);
  atc(p, fitH(dish('rm_shoyu'), 30), 26, 54); atc(p, fitH(dish('rm_gyoza'), 22), 294, 52);
  return p;
}
/** The noren (96 x 64): three panels. */
export function norenArt() {
  const p = new Px(96, 64); p.fill(0x1e2a52);
  for (let x = 31; x < 96; x += 32) p.rect(x, 0, 2, 64, 0x141c3a);
  p.rect(0, 0, 96, 5, 0x141c3a);
  putc(p, x2(mk('ら', 16)), 16, 18, 0xf4f0e4); putc(p, x2(mk('め', 16)), 48, 18, 0xf4f0e4); putc(p, x2(mk('ん', 16)), 80, 18, 0xf4f0e4);
  return p;
}
/** The standing board outside (96 x 144). */
export function boardArt(FOODS) {
  const p = new Px(96, 144); p.fill(0x1e2a22); p.frame(0, 0, 96, 144, 0x8a6a3a, 3);
  putc(p, KB('お品書き'), 48, 8, 0xf4f0e4); p.rect(10, 28, 76, 1, 0x8a9a8a);
  ['rm_shoyu', 'rm_miso', 'rm_tonkotsu', 'rm_gyoza', 'rm_beer'].forEach((id, i) => { const f = FOODS[id], y = 34 + i * 20; label(p, K([...f.jp].slice(0, 4).join(''), 12), 8, y, { c: 0xf4f0e4 }); label(p, m5(String(f.price)), 88, y + 3, { c: 0xffd23f, align: 'r' }); });
  atc(p, dish('rm_shoyu'), 48, 140);
  return p;
}
/** The nobori flag (32 x 128). */
export function flagArt() {
  const p = new Px(32, 128); p.fill(RED); p.rect(0, 0, 32, 6, W0); p.rect(0, 122, 32, 6, W0);
  const v = x2(mk('ラーメン', 16, { vert: true })); p.mask(v, Math.round(16 - v.w / 2) + 1, 10 + 1, 0x7a1a14); p.mask(v, Math.round(16 - v.w / 2), 10, W0);
  return p;
}
/** The beer poster on the wall (64 x 96): the brewery's owl with a mug. */
export function beerPosterArt() {
  const p = new Px(64, 96); p.fill(PAT.rays(0xf4e8c8, 0xf0dca8, 32, 60, 14));
  p.rect(0, 0, 64, 20, 0x1e2a6a); p.rect(0, 20, 64, 2, 0xd8a830);
  putc(p, KB('生ビール'), 32, 2, 0xf4f0e0);
  atc(p, spr('fukuro', 'mug'), 32, 74);
  burst(p, 12, 34, 10, [m3('550')], { c: 0xffd23f, text: RED, ink: INK });
  p.rect(0, 78, 64, 18, 0xd8a830); putc(p, mk('ホーホー酒造', 10), 32, 80, 0x101848); putc(p, m3('HOHO BREWERY'), 32, 90, 0x101848);
  p.frame(0, 0, 64, 96, 0x8a6a3a);
  return p;
}
export { pill, lt, on };
