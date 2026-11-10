// Pixel art for MIKAWA-YA's interior, packed into one atlas so the whole shop's printed matter merges into a couple of
// draw calls: product labels (snack boxes, tall boxes, cans, plastic-model box tops, cardboard), sun-faded posters, a
// Shōwa calendar, the kujibiki board, menko / bromide sheets, strips of bagged toys, fly paper, hand-written signs, the
// price board, the noren. Plus a repeating tatami texture and the little TV's animated screen.
//   const A = mikawayaAtlas();  A.uv('poster0') -> [u0, v0, u1, v1];  A.tex;  A.repaint() (after web fonts load)
//   tatamiTexture();  tvScreen() -> { tex, update(dt) }
// The atlas is four times its old resolution: the packs on the shelves (snack / tall / can / kit / card cells), the
// signs, tags, price board, noren and calendar are painted fresh through the label studio (src/products: kana
// wordmarks, mascots, bursts, prices); the older posters and toy sheets are kept and enlarged, their gradients
// replaced by two-ink dithering.
import * as THREE from 'three';
import { Pix, FONT_JP } from '../gfx/pix.js';
import { Px, dk, lt, on, dith } from '../products/px.js';
import { m5, m3, mk, bold, x2, label, whenFontsReady } from '../products/type.js';
import { PAT, burst, pill, seal } from '../products/print.js';
import { spr } from '../products/labels.js';
import { ART } from '../products/art.js';
import { framed, whenPhotosReady } from '../products/photos.js';

const Z = 4; // the enlargement
const AW = 512 * Z, AH = 256 * Z;
const rnd = (s) => { let x = s * 9301 + 49297; return () => ((x = (x * 9301 + 49297) % 233280) / 233280); };
const lerp = (a, b, t) => a + (b - a) * t;
const hx = (c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];

// 3x5 digits for price tags
const D3 = {
  0: ['###', '#.#', '#.#', '#.#', '###'], 1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['##.', '..#', '.#.', '#..', '###'], 3: ['##.', '..#', '.#.', '..#', '##.'],
  4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '##.', '..#', '##.'], 6: ['.##', '#..', '###', '#.#', '###'], 7: ['###', '..#', '.#.', '.#.', '.#.'],
  8: ['###', '#.#', '###', '#.#', '###'], 9: ['###', '#.#', '###', '..#', '##.'],
};
function digits(p, str, x, y, col) { let cx = x; for (const ch of str) { const g = D3[ch]; if (g) g.forEach((r, j) => [...r].forEach((c, i) => { if (c === '#') p.px(cx + i, y + j, col); })); cx += 4; } return cx - x; }

// 8x8 motifs for product art
const MOTIF = {
  star: ['...#....', '...#....', '..###...', '#######.', '.#####..', '..###...', '.##.##..', '.#...#..'],
  heart: ['........', '.##.##..', '#######.', '#######.', '.#####..', '..###...', '...#....', '........'],
  smile: ['..####..', '.######.', '##.##.##', '########', '#.####.#', '##....##', '.######.', '..####..'],
  berry: ['..#.#...', '...#....', '.#####..', '#.###.#.', '#######.', '.#.#.#..', '.#####..', '..###...'],
  orange: ['....#...', '..###...', '.#####..', '###.###.', '#######.', '#######.', '.#####..', '..###...'],
  grape: ['....#...', '.##.#...', '###.##..', '.##.###.', '..##.#..', '..###...', '...#....', '........'],
  fish: ['........', '.####...', '###.##.#', '########', '#######.', '.####..#', '........', '........'],
  cat: ['#.....#.', '##...##.', '#######.', '#.###.#.', '#######.', '##.#.##.', '.#####..', '........'],
  robot: ['...#....', '.#####..', '.#.#.#..', '.#####..', '.##.##..', '#######.', '#.###.#.', '.#...#..'],
  car: ['........', '..###...', '.#####..', '########', '########', '.#....#.', '........', '........'],
  bolt: ['....##..', '...##...', '..##....', '.######.', '....##..', '...##...', '..##....', '.#......'],
  flower: ['..#.#...', '.#####..', '##.#.##.', '.#####..', '..#.#...', '...#....', '..###...', '...#....'],
  ghost: ['..###...', '.#####..', '##.#.##.', '#######.', '#######.', '#######.', '#.#.#.#.', '........'],
  frog: ['.##.##..', '#.##.##.', '#######.', '#######.', '#.....#.', '.#####..', '##...##.', '........'],
  bear: ['##...##.', '#######.', '.#####..', '##.#.##.', '#######.', '##.#.##.', '.#####..', '........'],
  ufo: ['...##...', '..####..', '.######.', '########', '#.#.#.#.', '.######.', '..#..#..', '.#....#.'],
};
const MOTIFS = Object.keys(MOTIF);
function motif(p, name, x, y, col, s = 1) { MOTIF[name].forEach((r, j) => [...r].forEach((c, i) => { if (c === '#') p.rect(x + i * s, y + j * s, s, s, col); })); }

const SHOWA = [0xd8463a, 0xe8b830, 0x2f8ab0, 0x3aa65a, 0xf08a3a, 0xe85a8a, 0x8a5ad8, 0x2a4a9a, 0xf4e6c8, 0x1e2a3a, 0xc83a2a, 0x58c0b0];
/** A few dark marks standing in for tiny printed text. */
function scribble(p, x, y, w, col, r) { for (let i = 0; i < w; i++) if (r() > 0.28) p.px(x + i, y, col); }

/** Sun damage: reds and magentas fade first, everything drifts toward old paper, a few stains. */
function fade(p, k, r) {
  for (let i = 0; i < p.d.length; i += 4) {
    if (p.d[i + 3] < 10) continue;
    let R = p.d[i], G = p.d[i + 1], B = p.d[i + 2];
    const l = 0.3 * R + 0.59 * G + 0.11 * B;
    R = lerp(R, l, k * 0.75); G = lerp(G, l, k * 0.45); B = lerp(B, l + 18, k * 0.3);
    p.d[i] = lerp(R, 236, k * 0.5); p.d[i + 1] = lerp(G, 226, k * 0.5); p.d[i + 2] = lerp(B, 200, k * 0.5);
  }
  p.dirty = true;
  for (let n = 0; n < 3; n++) p.blotch(Math.floor(r() * p.w), Math.floor(r() * p.h), 2 + r() * 4, 0xb89a60, 0.18);
}

// ------------------------------------------------------------------ painters (each paints a fresh w x h Pix)
const P = {};
// small product labels: snack boxes, cups, bags
for (let i = 0; i < 24; i++) {
  P['snack' + i] = (p) => {
    const r = rnd(i * 7 + 3), bg = SHOWA[(i * 5) % SHOWA.length], ac = SHOWA[(i * 7 + 3) % SHOWA.length];
    p.fill(bg);
    const band = i % 3;
    if (band === 0) p.rect(0, 0, p.w, 4, ac);
    else if (band === 1) { p.rect(0, p.h - 5, p.w, 5, ac); for (let x = 0; x < p.w; x += 3) p.px(x, p.h - 6, ac); }
    else for (let y = 0; y < p.h; y += 4) p.rect(0, y, 2, 2, ac);
    const lum = hx(bg).reduce((a, b) => a + b) / 3;
    const fg = lum > 150 ? 0x2a1a1a : 0xfbf6e8;
    p.circle(8, 8, 5, lum > 150 ? ac : 0xfbf6e8);
    motif(p, MOTIFS[i % MOTIFS.length], 4, 4, lum > 150 ? 0xfbf6e8 : ac);
    scribble(p, 2, band === 1 ? 2 : p.h - 3, 12, fg, r);
    p.frame(0, 0, p.w, p.h, hx(bg).map((v) => v * 0.7));
  };
}
// tall boxes: detergent, cereal, soap
for (let i = 0; i < 8; i++) {
  P['tall' + i] = (p) => {
    const r = rnd(i * 13 + 5), bg = [0xf4f0e4, 0x2f8ab0, 0xe8b830, 0xd8463a, 0x3aa65a, 0xf4e6c8, 0x2a4a9a, 0xe85a8a][i], ac = [0x2f6fd6, 0xfbf6e8, 0xd8463a, 0xfbf6e8, 0xfbf6e8, 0xc83a2a, 0xe8b830, 0xfbf6e8][i];
    p.fill(bg);
    p.rect(0, 3, p.w, 7, ac);
    motif(p, MOTIFS[(i * 3 + 2) % MOTIFS.length], 4, 12, ac);
    p.tinyText(['NEW', 'TOP', 'BIG', 'MAX', 'ACE', 'NEW', 'SUN', 'JOY'][i], 8, 4, { color: bg, align: 'center' });
    scribble(p, 2, 21, 12, 0x2a2a2a, r);
    p.frame(0, 0, p.w, p.h, hx(bg).map((v) => v * 0.72));
  };
}
// can / jar wraps
for (let i = 0; i < 6; i++) {
  P['can' + i] = (p) => {
    const r = rnd(i * 31 + 1), bg = [0xd8463a, 0xf4f0e4, 0x2f8ab0, 0xe8b830, 0x3aa65a, 0x1e2a3a][i];
    p.fill(bg);
    p.rect(0, 0, p.w, 2, 0xc8ccd0); p.rect(0, p.h - 2, p.w, 2, 0xc8ccd0);
    p.rect(0, 4, p.w, 4, [0xfbf6e8, 0xd8463a, 0xfbf6e8, 0xd8463a, 0xf4e6c8, 0xe8b830][i]);
    scribble(p, 1, 9, 14, 0x2a2a2a, r);
  };
}
// plastic model kit box tops: a big robot / tank / ship / plane on a dramatic sky
const KIT = [
  { sky: [0x1a2a5a, 0x4a6aba], m: 'robot', c: 0xe8e4dc, t: 'ROBO' },
  { sky: [0x6a4a2a, 0xd8a050], m: 'car', c: 0x5a6a3a, t: 'TANK' },
  { sky: [0x1a4a7a, 0x8ac8e8], m: 'fish', c: 0x8a8e94, t: 'SHIP' },
  { sky: [0xd86a2a, 0xf8d080], m: 'bolt', c: 0x2a4a2a, t: 'ZERO' },
  { sky: [0x2a1a3a, 0xa04a8a], m: 'ufo', c: 0xd8dce2, t: 'UFO' },
];
KIT.forEach((k, i) => {
  P['kit' + i] = (p) => {
    p.gradient(0, 0, p.w, p.h, k.sky[0], k.sky[1]);
    const r = rnd(i + 40);
    for (let n = 0; n < 6; n++) p.px(Math.floor(r() * p.w), Math.floor(r() * 6), 0xfbf6e8);
    motif(p, k.m, 15, 1, k.c, 2);
    p.rect(0, p.h - 5, p.w, 5, 0xd8302a);
    p.tinyText(k.t, 2, p.h - 13, { color: 0xffd23f, shadow: 0x1a1a1a });
    p.tinyText('1/100', p.w - 1, p.h - 5, { color: 0xfbf6e8, align: 'right' });
    p.frame(0, 0, p.w, p.h, 0xf4ecd8);
  };
});
// cardboard sides: plain kraft with printed logos and tape
const CARD = ['みかん', 'ラムネ', 'こわれもの', ''];
CARD.forEach((t, i) => {
  P['card' + i] = (p) => {
    const r = rnd(i + 70);
    p.fill(0xc49a62);
    for (let y = 0; y < p.h; y += 2) for (let x = 0; x < p.w; x++) if (r() < 0.12) p.px(x, y, 0xb08850);
    p.rect(0, p.h / 2 - 1, p.w, 3, 0xd9c58e);
    if (t) p.text(t, p.w / 2, 3, { size: 10, color: i === 1 ? 0x2a5aa8 : 0x8a2a1a, align: 'center', font: FONT_JP });
    else { p.circle(p.w / 2, 7, 4, 0x8a2a1a); p.circle(p.w / 2, 7, 2, 0xc49a62); }
    p.frame(0, 0, p.w, p.h, 0x9c7444);
  };
});
P.news = (p) => {
  const r = rnd(91);
  p.fill(0xe8e2d2);
  for (let y = 1; y < p.h; y += 2) for (let x = 1; x < p.w - 1; x++) if (r() < 0.6) p.px(x, y, 0x8a8478);
  p.rect(1, 1, 7, 5, 0x5a5650);
  p.rect(9, 1, 6, 2, 0x2a2622);
};
// ---- faded posters
P.poster0 = (p) => { // ramune
  p.gradient(0, 0, p.w, p.h, 0x8ad0f0, 0xe8f8ff);
  for (let y = 40; y < p.h; y++) for (let x = 0; x < p.w; x++) if ((x + y) % 7 === 0) p.px(x, y, 0xc8eaf8);
  // a big bottle
  const bx = 12;
  p.rect(bx + 4, 10, 6, 4, 0x2a6ad8); p.rect(bx + 3, 14, 8, 4, 0x9ee0d8); p.rect(bx + 5, 18, 4, 3, 0x7cc8c0);
  p.rect(bx + 6, 18, 2, 2, 0xffffff); p.rect(bx + 1, 21, 12, 24, 0x9ee0d8); p.rect(bx + 2, 22, 2, 20, 0xe0fff8);
  p.rect(bx + 1, 30, 12, 7, 0xfbf6e8); p.rect(bx + 3, 32, 8, 3, 0x2f6fd6);
  p.text('ラムネ', p.w / 2, 46, { size: 12, color: 0x1a4aa8, align: 'center', font: FONT_JP, outline: 0xfbf6e8 });
  p.tinyText('10', 33, 4, { color: 0xd8302a });
};
P.poster1 = (p) => { // ice candy
  p.fill(0xfbf2e0);
  for (let x = 0; x < p.w; x += 6) p.rect(x, 0, 3, p.h, 0xf6dcd0);
  p.rect(14, 8, 12, 22, 0xe85a8a); p.rect(14, 8, 12, 4, 0xf8a0c0); p.rect(18, 30, 4, 10, 0xd8b078);
  p.rect(16, 14, 2, 10, 0xfbd0e0);
  p.text('アイス', p.w / 2, 42, { size: 12, color: 0xd8302a, align: 'center', font: FONT_JP });
  p.text('冷たい', p.w / 2, 2, { size: 9, color: 0x2a5aa8, align: 'center', font: FONT_JP });
};
P.poster2 = (p) => { // super robot model kit
  p.gradient(0, 0, p.w, p.h, 0x0a1440, 0x3a2a7a);
  const r = rnd(5);
  for (let n = 0; n < 30; n++) p.px(Math.floor(r() * p.w), Math.floor(r() * p.h), 0xfbf6e8);
  motif(p, 'robot', 8, 8, 0xd8dce2, 3);
  p.rect(14, 11, 3, 2, 0xffd23f); p.rect(20, 11, 3, 2, 0xffd23f);
  p.rect(8, 23, 24, 2, 0xd8302a);
  p.text('超合金', p.w / 2, 37, { size: 10, color: 0xffd23f, align: 'center', font: FONT_JP, outline: 0x6a1a1a });
  p.tinyText('NEW!', p.w / 2, p.h - 9, { color: 0xfbf6e8, align: 'center' });
};
P.poster3 = (p) => { // pro wrestling night
  p.fill(0xf0c838);
  p.rect(0, 0, p.w, 12, 0x1a1a1a);
  p.text('プロレス', p.w / 2, 1, { size: 9, color: 0xf0c838, align: 'center', font: FONT_JP });
  // two burly silhouettes squaring off
  for (const [x, c] of [[6, 0x3a1a1a], [22, 0x8a2a1a]]) {
    p.rect(x + 3, 16, 5, 5, c); p.rect(x, 21, 11, 12, c); p.rect(x - 2, 22, 3, 8, c); p.rect(x + 10, 22, 3, 8, c);
    p.rect(x + 1, 33, 4, 10, c); p.rect(x + 6, 33, 4, 10, c);
  }
  p.rect(0, 44, p.w, 2, 0xd8302a);
  p.tinyText('SAT 8:00', p.w / 2, 49, { color: 0x1a1a1a, align: 'center' });
};
P.poster4 = (p) => { // curry
  p.fill(0xf08a3a);
  p.circle(20, 22, 13, 0xfbf6e8); p.circle(20, 22, 11, 0xe8e0c8);
  for (let y = 15; y < 30; y++) for (let x = 12; x < 30; x++) if ((x - 22) ** 2 / 64 + (y - 22) ** 2 / 40 < 1) p.px(x, y, 0xa86018);
  for (let y = 16; y < 28; y++) for (let x = 9; x < 21; x++) if ((x - 15) ** 2 / 30 + (y - 22) ** 2 / 30 < 1) p.px(x, y, 0xfbf8f0);
  p.text('カレー', p.w / 2, 38, { size: 12, color: 0xfbf6e8, align: 'center', font: FONT_JP, outline: 0x8a2a1a });
  p.tinyText('3 MIN', p.w / 2, p.h - 8, { color: 0x6a1a0a, align: 'center' });
};
P.poster5 = (p) => { // a monster movie
  p.gradient(0, 0, p.w, p.h, 0x2a0a0a, 0x8a2a1a);
  for (let x = 0; x < p.w; x += 4) p.rect(x, 40 + ((x * 7) % 5), 3, 20, 0x1a1a1a);
  // the kaiju
  p.rect(10, 12, 16, 22, 0x2a4a2a); p.rect(14, 8, 10, 8, 0x2a4a2a); p.rect(18, 10, 2, 2, 0xffd23f); p.rect(4, 26, 8, 4, 0x2a4a2a);
  for (let i = 0; i < 4; i++) p.rect(12 + i * 4, 6 - (i % 2), 2, 4, 0x6a8a5a);
  p.line(24, 12, 38, 4, 0xa8e0ff); p.line(24, 13, 38, 6, 0xffffff);
  p.text('大怪獣', p.w / 2, 42, { size: 10, color: 0xffd23f, align: 'center', font: FONT_JP, outline: 0x1a0a0a });
};
P.calendar = (p) => {
  p.fill(0xfbf8f0);
  // a photo of Fuji
  p.gradient(2, 2, p.w - 4, 18, 0x6ab0e8, 0xd8ecf8);
  for (let x = 2; x < p.w - 2; x++) { const hh = Math.max(0, 14 - Math.abs(x - p.w / 2) * 0.8); p.rect(x, 20 - hh, 1, hh, 0x4a5a7a); if (hh > 10) p.rect(x, 20 - hh, 1, hh - 10, 0xfbfbff); }
  p.rect(2, 19, p.w - 4, 2, 0x3a6a3a);
  p.tinyText('8', 4, 23, { color: 0xd8302a });
  p.text('昭和63年', p.w - 3, 22, { size: 8, color: 0x2a2a2a, align: 'right', font: FONT_JP });
  for (let j = 0; j < 5; j++) for (let i = 0; i < 7; i++) p.rect(3 + i * 4, 32 + j * 3, 2, 1, i === 0 ? 0xd8302a : i === 6 ? 0x2a5aa8 : 0x3a3a3a);
  p.rect(p.w / 2 - 1, 0, 2, 2, 0x6a6a6a);
};
P.kuji = (p) => {
  p.fill(0xf4e6c8);
  p.rect(0, 0, p.w, 12, 0xd8302a);
  p.text('くじ', 12, 1, { size: 10, color: 0xfbf6e8, align: 'center', font: FONT_JP });
  p.tinyText('20', p.w - 3, 3, { color: 0xffd23f, align: 'right' });
  // prizes: 1st 2nd 3rd
  const prizes = [['car', 0x2f6fd6], ['robot', 0xd8dce2], ['star', 0xe8b830]];
  prizes.forEach(([m, c], i) => { p.rect(2 + i * 13, 14, 11, 13, 0xfbf8f0); p.frame(2 + i * 13, 14, 11, 13, 0xc8a878); motif(p, m, 3 + i * 13, 16, c); p.px(4 + i * 13, 25, 0xd8302a); });
  // a grid of folded tickets, some already torn off
  const r = rnd(17), cols = [0xf6a0b8, 0xf8e080, 0xa8d8f0, 0xb8e8a0];
  for (let j = 0; j < 5; j++) for (let i = 0; i < 7; i++) {
    const x = 2 + i * 5 + (j % 2), y = 30 + j * 4;
    if (r() < 0.32) { p.rect(x, y, 4, 3, 0xd8c8a8); p.px(x + 1, y, 0xb8a888); continue; }
    p.rect(x, y, 4, 3, cols[(i + j) % 4]); p.px(x + 1, y + 1, 0x8a6a6a);
  }
  p.frame(0, 0, p.w, p.h, 0x8a6a3a);
};
P.menko = (p) => {
  p.fill(0xe8dcc0);
  const faces = [[0xd8302a, 'smile'], [0x2f6fd6, 'robot'], [0xe8b830, 'cat'], [0x3aa65a, 'frog'], [0x8a5ad8, 'ghost'], [0xf08a3a, 'bear']];
  faces.forEach(([c, m], k) => {
    const i = k % 2, j = Math.floor(k / 2), x = 2 + i * 15, y = 2 + j * 13;
    if (k % 3 === 0) { p.circle(x + 6, y + 6, 6, c); p.circle(x + 6, y + 6, 4, 0xfbf6e8); motif(p, m, x + 2, y + 2, c); }
    else { p.rect(x, y, 13, 12, c); p.rect(x + 1, y + 1, 11, 10, 0xfbf6e8); motif(p, m, x + 2, y + 2, c); }
  });
  p.frame(0, 0, p.w, p.h, 0xb8a888);
};
P.bromide = (p) => {
  p.fill(0xf4f0e8);
  const r = rnd(23), fr = [0xe85a8a, 0x2f8ab0, 0xe8b830, 0x8a5ad8];
  for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) {
    const x = 1 + i * 10, y = 1 + j * 10, sk = 0xe8c8a8;
    p.rect(x, y, 9, 9, fr[(i + j) % 4]); p.rect(x + 1, y + 1, 7, 7, 0xd8d0c8);
    const hc = r() < 0.5 ? 0x2a1a1a : 0x5a3a2a;
    p.rect(x + 2, y + 2, 5, 3, hc); p.rect(x + 3, y + 3, 3, 3, sk); p.rect(x + 2, y + 6, 5, 2, fr[(i + j + 1) % 4]);
  }
};
for (let i = 0; i < 4; i++) {
  P['strip' + i] = (p) => {
    const r = rnd(i * 3 + 61);
    // header card
    p.rect(0, 0, p.w, 9, [0xf8e080, 0xf6a0b8, 0xa8d8f0, 0xb8e8a0][i]);
    p.rect(p.w / 2 - 1, 1, 2, 2, 0x5a4a3a);
    p.tinyText(['TOY', 'FUN', 'GO!', 'WOW'][i], p.w / 2, 2, { color: 0xd8302a, align: 'center' });
    const toys = [['star', 0xe8b830], ['ring', 0xd8302a], ['ball', 0x2f6fd6], ['whistle', 0x3aa65a], ['heart', 0xe85a8a], ['car', 0x8a5ad8]];
    for (let k = 0; k < 4; k++) {
      const y = 10 + k * 11;
      p.rect(1, y, p.w - 2, 10, 0xe8f4f8); p.rect(1, y, p.w - 2, 1, 0xc8d8e0); p.rect(1, y + 9, p.w - 2, 1, 0xa8b8c0);
      const [m, c] = toys[Math.floor(r() * toys.length)];
      if (MOTIF[m]) motif(p, m, 2, y + 1, c);
      else if (m === 'ring') { p.circle(6, y + 5, 3, c); p.circle(6, y + 5, 1, 0xe8f4f8); }
      else if (m === 'ball') p.circle(6, y + 5, 3, c);
      else { p.rect(2, y + 3, 7, 3, c); p.rect(8, y + 2, 2, 5, c); }
      p.px(p.w - 3, y + 1, 0xc8ccd0);
    }
  };
}
P.flypaper = (p) => {
  const r = rnd(9);
  for (let y = 0; y < p.h; y++) for (let x = 1; x < p.w - 1; x++) p.px(x, y, (x + y) % 5 ? 0xd8a838 : 0xc89028);
  p.rect(0, 0, p.w, 2, 0xa87818);
  for (let n = 0; n < 9; n++) { const x = 1 + Math.floor(r() * (p.w - 3)), y = 4 + Math.floor(r() * (p.h - 6)); p.rect(x, y, 2, 1, 0x1a1a1a); p.px(x + (r() < 0.5 ? -1 : 2), y - 1, 0x4a4a4a); }
};
P.tabako = (p) => {
  p.fill(0xc8282a); p.frame(0, 0, p.w, p.h, 0xfbf6e8); p.frame(1, 1, p.w - 2, p.h - 2, 0x8a1a1a);
  p.text('たばこ', p.w / 2, 1, { size: 12, color: 0xfbf6e8, align: 'center', font: FONT_JP });
};
P.kinen = (p) => {
  p.fill(0xfbf8f0); p.frame(0, 0, p.w, p.h, 0xd8302a);
  p.text('禁煙', p.w / 2, 0, { size: 10, color: 0xd8302a, align: 'center', font: FONT_JP });
};
P.manbiki = (p) => {
  p.fill(0xfbf8f0); p.frame(0, 0, p.w, p.h, 0x2a2a2a);
  p.text('万引き禁止', p.w / 2, 1, { size: 9, color: 0x1a1a1a, align: 'center', font: FONT_JP });
};
P.tsuke = (p) => {
  p.fill(0xf4ecd8); p.frame(0, 0, p.w, p.h, 0x6a4a2a);
  p.text('ツケおことわり', p.w / 2, 1, { size: 9, color: 0x8a1a1a, align: 'center', font: FONT_JP });
};
P.dagashi = (p) => {
  p.fill(0xe8b830); p.frame(0, 0, p.w, p.h, 0x8a5a1a);
  p.text('駄菓子', p.w / 2, 1, { size: 12, color: 0x8a1a1a, align: 'center', font: FONT_JP });
};
for (const [i, v] of ['10', '20', '30', '50'].entries()) {
  P['tag' + i] = (p) => { p.fill(0xfbf8f0); p.rect(0, 0, p.w, 1, 0xd8302a); digits(p, v, 1, 2, 0xd8302a); p.rect(9, 3, 2, 3, 0xd8302a); };
}
P.menu = (p) => {
  p.fill(0x5a3a22); p.frame(0, 0, p.w, p.h, 0x3a2414);
  const rows = [['MILK', '150'], ['BROOM', '600'], ['TOOLS', '900'], ['AA', '300'], ['TUBE', '400'], ['FLYER', '500'], ['WATCH', '4000']];
  rows.forEach(([a, b], i) => {
    const y = 2 + i * 8;
    p.rect(2, y, p.w - 4, 7, i % 2 ? 0xf4ecd8 : 0xfbf6e8);
    p.tinyText(a, 3, y, { color: 0x1a1a1a });
    p.tinyText(b, p.w - 3, y, { color: 0xc8282a, align: 'right' });
  });
};
P.photo = (p) => { // a framed snapshot: a strapping young man flexing on a beach, long ago
  p.fill(0x5a3a22); p.rect(1, 1, p.w - 2, p.h - 2, 0xd8d0c0);
  p.gradient(2, 2, p.w - 4, 10, 0x9a9a9a, 0xc8c8c0); p.rect(2, 12, p.w - 4, p.h - 14, 0xb8b0a0);
  const c = 0x5a5048;
  p.rect(7, 4, 3, 3, c); p.rect(6, 7, 5, 6, 0x7a7068); p.rect(3, 6, 3, 2, c); p.rect(11, 6, 3, 2, c); p.rect(3, 4, 2, 2, c); p.rect(12, 4, 2, 2, c);
  p.rect(6, 13, 2, 5, c); p.rect(9, 13, 2, 5, c); p.rect(5, 8, 7, 1, 0x3a3430);
};
P.noren = (p) => {
  p.fill(0x22305a);
  for (let y = 0; y < p.h; y += 3) for (let x = 0; x < p.w; x++) if ((x * 7 + y) % 11 === 0) p.px(x, y, 0x2a3a6a);
  p.rect(0, 0, p.w, 3, 0x1a2444);
  p.text('三河屋', p.w / 2, 4, { size: 14, color: 0xf4f0e4, align: 'center', font: FONT_JP });
  // two slits between the three panels (cut out: alpha 0)
  for (const x of [Math.round(p.w / 3), Math.round((2 * p.w) / 3)]) for (let y = 5; y < p.h; y++) p.d[(y * p.w + x) * 4 + 3] = 0;
  for (let x = 0; x < p.w; x++) if ((x * 5) % 7 < 2) p.d[((p.h - 1) * p.w + x) * 4 + 3] = 0; // frayed hem
  p.dirty = true;
};
P.freezerSign = (p) => {
  p.fill(0xfbf8f0); p.rect(0, 0, p.w, 3, 0x2f6fd6); p.rect(0, p.h - 3, p.w, 3, 0x2f6fd6);
  p.text('アイスクリーム', p.w / 2, 3, { size: 9, color: 0xd8302a, align: 'center', font: FONT_JP });
};
P.milkSign = (p) => {
  p.fill(0x2f6fd6); p.frame(0, 0, p.w, p.h, 0xfbf6e8);
  p.text('牛乳', p.w / 2, 1, { size: 10, color: 0xfbf6e8, align: 'center', font: FONT_JP });
};
P.flyerSign = (p) => {
  p.fill(0xfbf8f0); p.frame(0, 0, p.w, p.h, 0xe85a8a);
  p.tinyText('GACHA', p.w / 2, 1, { color: 0xd8302a, align: 'center' });
  p.tinyText('FLYERS', p.w / 2, 9, { color: 0x2a5aa8, align: 'center' });
};

// ------------------------------------------------------------------ the fresh painters (label studio, full size)
const INK = 0x2e1f28, W0 = 0xfffaf0, RED = 0xc8302a;
const K = (t, z = 16) => mk(t, z), KB = (t) => bold(mk(t, 16));
const putc = (p, m, cx, y, c, out, sh) => label(p, m, cx, y, { c, out, sh, align: 'c' });
const atc = (p, sp, cx, by) => { if (sp) p.blit(sp, Math.round(cx - sp.w / 2), by - sp.h); };
const fit = (sp, w, h) => { let q = sp; while (q.w > w || q.h > h) { const o = new Px(Math.ceil(q.w / 2), Math.ceil(q.h / 2)); for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) o.d[y * o.w + x] = q.get(x * 2, y * 2); q = o; } return q; };
const A_ = (name, ...a) => ART[name](...a);
/** A real photo in a little round window (or the drawing, until the photos are in). */
const PH = (name, alt, w = 38, h = 34) => framed(name, w, h, { shape: 'circle', n: 10 }) || alt();
const N = {};
// snack packs (64 x 64): name, ground, accent, what's on it
const SNACKS = [
  ['えびせん', 0xf08a8a, 0xc8302a, () => A_('fish', 0xf8b0a0)], ['ポテト', 0xf8d030, 0xc8302a, () => A_('senbei')], ['キャラメル', 0xf4c81a, 0x8a4a1a, () => spr('momo', 'wave')], ['ガム', 0x58c0b0, 0xfffaf0, () => A_('bubbles', 3, 0xff8ab0)],
  ['ラムネ', 0x8ad8f0, 0x2a6ad8, () => A_('marble')], ['こんぺい', 0x8a5ad8, 0xffd23f, () => A_('moon')], ['せんべい', 0x8a4a1a, 0xe8c040, () => A_('senbei')], ['ビスケ', 0xe8b870, 0x6a3a1e, () => PH('buns', () => spr('kamepan', 0))],
  ['チョコ', 0x5a2e16, 0xe0443a, () => PH('choco', () => A_('cocoa'))], ['あめ', 0xe0443a, 0xfffaf0, () => A_('candy', 0xffd23f)], ['するめ', 0xe8dcc0, 0x1e2a6a, () => A_('fish', 0x8a94a8)], ['きなこ', 0xd8a850, 0x6a3a1e, () => A_('beans')],
  ['ふがし', 0x7a4a26, 0xf4e6c4, () => A_('barley')], ['ポン', 0xf4ead2, 0xe0443a, () => A_('corn')], ['ゼリー', 0x58c06c, 0xff6f91, () => PH('strawberry', () => A_('citrus', 0x8ad06a, 0xd8f0a0))], ['カレー', 0xf08a2a, 0x6a1a0a, () => spr('nabe', 'ladle')],
  ['のりしお', 0x2a8a4a, 0xfffaf0, () => A_('wave', 0x1e6a3a)], ['うめ', 0xa8283a, 0xf8a8c0, () => A_('plum')], ['ソース', 0x4a2a14, 0xf4c040, () => A_('senbei')], ['ミント', 0xb8ecd8, 0x2a8a6a, () => A_('leaves', 0x3aa07a)],
  ['ココア', 0x2a5ab0, 0xfffaf0, () => A_('cocoa')], ['みかん', 0xf8a030, 0x2a8a3a, () => PH('orange', () => A_('citrus', 0xf8a030, 0xfbc060))], ['ぶどう', 0x6a2a9a, 0xf4d030, () => PH('grapes', () => A_('grapes'))], ['メロン', 0x3ac850, 0xfffaf0, () => PH('melon', () => A_('melon'))],
];
SNACKS.forEach(([name, bg, ac, art], i) => {
  N['snack' + i] = () => {
    const p = new Px(64, 64); p.fill(bg);
    const style = i % 4;
    if (style === 0) p.rect(0, 0, 64, 64, PAT.rays(bg, lt(bg, 0.16), 32, 44, 12));
    else if (style === 1) p.rect(0, 0, 64, 64, PAT.stripes(bg, lt(bg, 0.14), 6, 'd'));
    else if (style === 2) p.rect(0, 0, 64, 64, PAT.dots(bg, lt(bg, 0.2), 10, 2));
    p.rect(0, 0, 64, 17, ac); p.rect(0, 17, 64, 1, dk(ac, 0.4));
    const m = name.length > 3 ? K(name, 12) : KB(name);
    putc(p, m, 32, name.length > 3 ? 3 : 1, on(ac));
    atc(p, fit(art(), 44, 34), 26, 58);
    const yen = [10, 20, 30, 50, 100][(i * 3) % 5];
    p.ell(52, 50, 10, 10, INK); p.ell(52, 50, 9, 9, 0xffd23f); putc(p, m3(String(yen)), 52, 46, RED); putc(p, m3('YEN'), 52, 53, RED);
    if (i === 2 || i === 7) pill(p, 3, 20, K('おまけ付き', 10), { c: W0, text: RED, ink: INK, pad: 4, padY: 1 });
    p.frame(0, 0, 64, 64, dk(bg, 0.35));
    return p;
  };
});
// tall boxes (64 x 96)
const TALLS = [
  ['ピカピカ', '洗剤', 0xf4f0e4, 0x2f6fd6, () => A_('bubbles', 4)], ['せっけん', 'ミルク', 0x2f8ab0, 0xfffaf0, () => A_('splash')], ['コーン', 'フレーク', 0xf8d030, 0xc8302a, () => spr('kokekko', 'crow')], ['マッチ', 'ふじ', 0xc8302a, 0xfffaf0, () => PH('fuji', () => A_('mountain', 0x3a6ac8), 52, 40)],
  ['かとり', '線香', 0x2a7a4a, 0xf4e6c8, () => null], ['歯みがき', 'さわやか', 0xf4e6c8, 0xc83a2a, () => A_('leaves', 0x3aa07a)], ['ティッシュ', 'やわらか', 0x2a4a9a, 0xe8b830, () => A_('jasmine')], ['ねこごはん', 'かつお味', 0xf08aa8, 0xfffaf0, () => PH('cat', () => spr('neko', 'slurp'), 50, 46)],
];
TALLS.forEach(([name, sub, bg, ac, art], i) => {
  N['tall' + i] = () => {
    const p = new Px(64, 96); p.fill(bg);
    p.rect(0, 0, 64, 96, i % 2 ? PAT.stripes(bg, lt(bg, 0.12), 8, 'v') : PAT.halftone(bg, lt(bg, 0.2), 32, 60, 60, 6));
    p.rect(0, 8, 64, 22, ac); p.rect(0, 30, 64, 1, dk(ac, 0.4)); p.rect(0, 7, 64, 1, dk(ac, 0.4));
    putc(p, name.length > 3 ? K(name, 12) : KB(name), 32, name.length > 3 ? 13 : 11, on(ac));
    if (i === 4) { for (let k = 0; k < 4; k++) p.ring(32, 60, 20 - k * 5, 20 - k * 5, 2, 0x1e4a2a); p.rect(31, 58, 3, 3, RED); }
    else atc(p, fit(art(), 56, 46), 32, 82);
    pill(p, 32, 83, K(sub, 10), { c: W0, text: INK, ink: INK, align: 'c', pad: 6, padY: 1 });
    p.frame(0, 0, 64, 96, dk(bg, 0.35));
    return p;
  };
});
// tins: the wrap (128 x 64)
const TINS = [['ねこ缶', 'まぐろ', 0xd8463a, () => PH('cat', () => spr('neko', 'slurp'), 30, 28)], ['さば', '水煮', 0xf4f0e4, () => PH('sardines', () => A_('fish', 0x4a7ab8), 34, 26)], ['みかん', 'シロップ', 0x2f8ab0, () => PH('mikan', () => A_('citrus', 0xf8a030, 0xfbc060), 30, 28)], ['コーン', 'つぶ', 0xe8b830, () => PH('corn', () => A_('corn'), 30, 28)], ['カレー', '中辛', 0x3aa65a, () => PH('curry', () => spr('nabe', 'steam'), 30, 28)], ['のり', 'つくだ煮', 0x1e2a3a, () => A_('wave', 0x2a4a6a)]];
TINS.forEach(([name, sub, bg, art], i) => {
  N['can' + i] = () => {
    const p = new Px(128, 64); p.fill(bg);
    p.rect(0, 0, 128, 5, 0xc8ccd0); p.rect(0, 59, 128, 5, 0xc8ccd0); p.rect(0, 5, 128, 1, 0x8a9098); p.rect(0, 58, 128, 1, 0x8a9098);
    for (const x0 of [0, 64]) { p.rect(x0 + 2, 9, 60, 16, on(bg) === 0x241a1e ? RED : W0); putc(p, name.length > 2 ? K(name, 12) : KB(name), x0 + 32, name.length > 2 ? 11 : 9, on(bg) === 0x241a1e ? W0 : RED); atc(p, fit(art(), 40, 28), x0 + 22, 56); putc(p, K(sub, 10), x0 + 48, 34, on(bg)); }
    return p;
  };
});
// model-kit box tops (128 x 64): a machine against a dithered sky
const KITS = [['ロボ', 0x1a2a5a, 0x4a6aba], ['せんしゃ', 0x6a4a2a, 0xd8a050], ['ふね', 0x1a4a7a, 0x8ac8e8], ['ひこうき', 0xd86a2a, 0xf8d080], ['えんばん', 0x2a1a3a, 0xa04a8a]];
KITS.forEach(([name, c0, c1], i) => {
  N['kit' + i] = () => {
    const p = new Px(128, 64); p.fill(PAT.fade(c0, c1, 4, 60));
    for (let n = 0; n < 14; n++) p.set((n * 37) % 128, (n * 11) % 22, W0);
    const G = 0xd8dce2, D = 0x5a6a7a, cx = 86;
    if (i === 0) { p.rect(cx - 9, 8, 18, 14, G); p.rect(cx - 6, 12, 4, 3, 0xffd23f); p.rect(cx + 2, 12, 4, 3, 0xffd23f); p.rect(cx - 14, 24, 28, 20, G); p.rect(cx - 22, 24, 7, 18, D); p.rect(cx + 15, 24, 7, 18, D); p.rect(cx - 10, 44, 8, 14, D); p.rect(cx + 2, 44, 8, 14, D); p.rect(cx - 4, 28, 8, 8, RED); p.rect(cx - 1, 2, 2, 6, D); }
    else if (i === 1) { p.rect(cx - 28, 34, 56, 12, 0x5a6a3a); p.rrect(cx - 32, 44, 64, 12, 6, 0x3a4a2a); for (let k = 0; k < 6; k++) p.ell(cx - 25 + k * 10, 50, 4, 4, 0x1e2a1a); p.rect(cx - 12, 24, 26, 11, 0x6a7a4a); p.rect(cx + 12, 27, 34, 4, 0x4a5a3a); p.rect(cx - 4, 18, 8, 6, 0x6a7a4a); }
    else if (i === 2) { p.poly([[cx - 40, 40], [cx + 40, 40], [cx + 30, 52], [cx - 32, 52]], 0x8a8e94); p.rect(cx - 18, 30, 30, 10, G); p.rect(cx - 8, 20, 12, 10, G); p.rect(cx - 3, 10, 3, 10, D); p.rect(cx + 14, 34, 16, 3, D); p.rect(0, 52, 128, 12, 0x2a5a9a); for (let x = 0; x < 128; x += 9) p.rect(x, 53 + (x % 2), 5, 1, W0); }
    else if (i === 3) { p.poly([[cx - 36, 34], [cx + 30, 28], [cx + 38, 32], [cx + 30, 38], [cx - 36, 38]], 0x3a5a3a); p.poly([[cx - 6, 34], [cx + 8, 12], [cx + 16, 12], [cx + 10, 34]], 0x2a4a2a); p.poly([[cx - 6, 36], [cx + 8, 56], [cx + 16, 56], [cx + 10, 36]], 0x2a4a2a); p.poly([[cx - 34, 34], [cx - 28, 22], [cx - 22, 22], [cx - 24, 34]], 0x2a4a2a); p.ell(cx - 12, 34, 5, 5, RED); p.ell(cx + 36, 33, 2, 6, D); }
    else { p.ell(cx, 34, 34, 9, G); p.ell(cx, 28, 14, 10, 0x9ad8f8); p.ell(cx, 36, 34, 5, D); for (let k = -2; k <= 2; k++) p.ell(cx + k * 13, 36, 2.5, 2.5, 0xffd23f); p.poly([[cx - 8, 42], [cx + 8, 42], [cx + 18, 62], [cx - 18, 62]], (x, y) => (dith(x, y, 0.5) ? 0xf8f0a0 : undefined)); }
    p.rect(0, 0, 44, 64, dk(c0, 0.25)); p.rect(44, 0, 2, 64, 0xffd23f);
    const v = mk(name, 12, { vert: true }); p.mask(v, 6, 4, 0xffd23f);
    label(p, m5('1/100'), 21, 6, { c: W0 }); label(p, m3('HOBBY'), 22, 18, { c: W0 }); label(p, m3('MATSU'), 22, 26, { c: W0 });
    p.rect(20, 44, 22, 14, RED); label(p, m3('NEW!'), 31, 49, { c: W0, align: 'c' });
    p.frame(0, 0, 128, 64, 0xf4ecd8);
    return p;
  };
});
// cardboard (128 x 80)
['みかん', 'ラムネ', 'こわれもの', ''].forEach((t, i) => {
  N['card' + i] = () => {
    const p = new Px(128, 80); p.fill(0xc49a62);
    for (let y = 0; y < 80; y += 4) p.rect(0, y, 128, 1, 0xb88e58);
    p.rect(0, 34, 128, 12, 0xd9c58e); p.rect(0, 34, 128, 1, 0xc0aa72); p.rect(0, 45, 128, 1, 0xc0aa72);
    const c = i === 1 ? 0x2a5aa8 : 0x8a2a1a;
    if (t) { putc(p, x2(bold(mk(t, 16))).w < 120 ? x2(bold(mk(t, 16))) : KB(t), 64, t.length > 3 ? 6 : 2, c); if (i === 0) atc(p, A_('citrus', 0xb86a2a, 0xc49a62), 20, 78); if (i === 2) { p.rect(96, 50, 2, 22, c); p.poly([[97, 46], [90, 56], [104, 56]], c); p.rect(108, 50, 2, 22, c); p.poly([[109, 46], [102, 56], [116, 56]], c); } }
    else { p.ring(64, 20, 14, 14, 3, c); label(p, m5('MIKAWA-YA'), 64, 56, { c, align: 'c' }); }
    label(p, m3('12 X 24'), 6, 70, { c: dk(0xc49a62, 0.4) });
    p.frame(0, 0, 128, 80, 0x9c7444);
    return p;
  };
});
// hand-lettered signs and tags
const sign = (key, text, bg, ink, o = {}) => { N[key] = (w, h) => { const p = new Px(w, h); p.fill(bg); p.frame(0, 0, w, h, o.frame ?? ink, 2); if (o.inner) p.frame(4, 4, w - 8, h - 8, o.inner); let m = x2(bold(mk(text, 16))); if (m.w > w - 12 || m.h > h - 8) m = bold(mk(text, 16)); putc(p, m, w / 2, Math.round((h - m.h) / 2), ink); return p; }; };
sign('tabako', 'たばこ', 0xc8282a, 0xfbf6e8, { inner: 0x8a1a1a }); sign('kinen', '禁煙', 0xfbf8f0, 0xd8302a); sign('manbiki', '万引き禁止', 0xfbf8f0, 0x1a1a1a);
sign('tsuke', 'ツケおことわり', 0xf4ecd8, 0x8a1a1a, { frame: 0x6a4a2a }); sign('dagashi', '駄菓子', 0xe8b830, 0x8a1a1a, { frame: 0x8a5a1a });
sign('freezerSign', 'アイスクリーム', 0xfbf8f0, 0xd8302a, { frame: 0x2f6fd6 }); sign('milkSign', '牛乳', 0x2f6fd6, 0xfbf6e8); sign('flyerSign', 'チラシ', 0xfbf8f0, 0xd8302a, { frame: 0xe85a8a });
['10', '20', '30', '50'].forEach((v, i) => { N['tag' + i] = (w, h) => { const p = new Px(w, h); p.fill(0xfbf8f0); p.rect(0, 0, w, 4, RED); p.frame(0, 0, w, h, 0xb8a888); label(p, m5(v, 2), w / 2 - 6, 10, { c: RED, align: 'c' }); label(p, K('円', 12), w - 15, 12, { c: RED }); return p; }; });
N.menu = (w, h) => {
  const p = new Px(w, h); p.fill(0x5a3a22); p.frame(0, 0, w, h, 0x3a2414, 3);
  putc(p, KB('おしながき'), w / 2, 8, 0xf4e6c4);
  [['牛乳', 150], ['ほうき', 600], ['工具セット', 900], ['乾電池', 300], ['蛍光ランプ', 400], ['チラシ', 500], ['懐中時計', 4000]].forEach(([a, b], i) => {
    const y = 32 + i * 29; p.rect(8, y, w - 16, 25, i % 2 ? 0xf4ecd8 : 0xfbf6e8); p.rect(8, y + 24, w - 16, 1, 0xc8b890);
    label(p, K(a, 16), 14, y + 4, { c: 0x1a1a1a }); label(p, m5(String(b), 2), w - 30, y + 6, { c: 0xc8282a, align: 'r' }); label(p, K('円', 12), w - 28, y + 8, { c: 0xc8282a });
  });
  return p;
};
N.calendar = (w, h) => {
  const p = new Px(w, h); p.fill(0xfbf8f0);
  p.rect(6, 6, w - 12, 76, PAT.fade(0x6ab0e8, 0xd8ecf8, 6, 70)); atc(p, A_('mountain', 0x4a5a7a), w / 2, 82); p.rect(6, 80, w - 12, 4, 0x3a6a3a);
  label(p, m5('4', 3), 10, 92, { c: 0xd8302a }); label(p, K('平成11年', 12), w - 8, 92, { c: 0x2a2a2a, align: 'r' }); label(p, m3('1999 APRIL'), w - 8, 108, { c: 0x2a2a2a, align: 'r' });
  ['日', '月', '火', '水', '木', '金', '土'].forEach((d, i) => label(p, K(d, 10), 12 + i * 15, 120, { c: i === 0 ? 0xd8302a : i === 6 ? 0x2a5aa8 : 0x3a3a3a, align: 'c' }));
  for (let d = 1; d <= 30; d++) { const k = d + 3, i = k % 7, j = Math.floor(k / 7); label(p, m3(String(d)), 12 + i * 15, 134 + j * 11, { c: i === 0 || d === 29 ? 0xd8302a : i === 6 ? 0x2a5aa8 : 0x3a3a3a, align: 'c' }); }
  p.rect(w / 2 - 3, 0, 6, 6, 0x6a6a6a); p.frame(0, 0, w, h, 0xc8c0b0);
  return p;
};
N.noren = (w, h) => {
  const p = new Px(w, h); p.fill(0x22305a);
  for (let y = 0; y < h; y += 6) for (let x = (y / 6) % 2 ? 3 : 0; x < w; x += 12) p.rect(x, y, 2, 2, 0x2a3a6a);
  p.rect(0, 0, w, 10, 0x1a2444);
  const m = x2(x2(mk('三河屋', 16))); putc(p, m.w < w - 20 ? m : x2(bold(mk('三河屋', 16))), w / 2, 22, 0xf4f0e4);
  for (const x of [Math.round(w / 3), Math.round((2 * w) / 3)]) p.cut(x - 1, 18, 3, h);
  for (let x = 0; x < w; x += 7) p.cut(x, h - 3 - (x % 3), 3, 6);
  return p;
};

// layout: [key, w, h, alpha?]  (packed left to right in rows)
const CELLS = [
  ...Array.from({ length: 24 }, (_, i) => ['snack' + i, 16, 16]),
  ...Array.from({ length: 8 }, (_, i) => ['tall' + i, 16, 24]),
  ...Array.from({ length: 6 }, (_, i) => ['can' + i, 32, 16]),
  ...KIT.map((_, i) => ['kit' + i, 32, 16]),
  ...CARD.map((_, i) => ['card' + i, 32, 20]),
  ['news', 16, 16],
  ...Array.from({ length: 6 }, (_, i) => ['poster' + i, 40, 60]),
  ['calendar', 32, 48], ['kuji', 40, 52], ['menko', 32, 40], ['bromide', 32, 42],
  ...Array.from({ length: 4 }, (_, i) => ['strip' + i, 12, 54]),
  ['flypaper', 6, 48], ['menu', 44, 60], ['photo', 16, 20], ['noren', 72, 26],
  ['tabako', 40, 15], ['kinen', 24, 12], ['manbiki', 56, 12], ['tsuke', 64, 12], ['dagashi', 40, 15],
  ['freezerSign', 64, 14], ['milkSign', 28, 14], ['flyerSign', 32, 17],
  ...['10', '20', '30', '50'].map((_, i) => ['tag' + i, 12, 8]),
];
const ALPHA = new Set(['flypaper', 'noren']); // painted with transparent gaps

let ATLAS = null;
/** The shop's shared atlas (cached). */
export function mikawayaAtlas() {
  if (ATLAS) return ATLAS;
  const canvas = document.createElement('canvas');
  canvas.width = AW; canvas.height = AH;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const rects = {};
  let x = 0, y = 0, rowH = 0;
  for (const [k, w0, h0] of CELLS) {
    const w = w0 * Z, h = h0 * Z;
    if (x + w > AW) { x = 0; y += rowH + Z; rowH = 0; }
    rects[k] = [x, y, w, h];
    x += w + Z; rowH = Math.max(rowH, h);
  }
  if (y + rowH > AH) console.warn('mikawaya atlas overflow', y + rowH);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.anisotropy = 4;
  const paint = () => {
    ctx.clearRect(0, 0, AW, AH);
    for (const [k, w0, h0] of CELLS) {
      const [rx, ry, w, h] = rects[k];
      try {
        if (N[k]) { N[k](w, h).draw(ctx, rx, ry, 1); continue; }
        // an older painter at its own size, enlarged; its gradients become two-ink dithers
        const p = new Pix(w0, h0, rx * 31 + ry);
        p.gradient = (gx, gy, gw, gh, c1, c2) => { for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) p.px(gx + i, gy + j, dith(gx + i, gy + j, j / Math.max(1, gh - 1)) ? c2 : c1); return p; };
        if (!ALPHA.has(k)) p.fill(0xffffff);
        P[k](p);
        if (/^poster|kuji|menko|bromide/.test(k)) fade(p, 0.32 + ((rx + ry) % 3) * 0.08, rnd(rx + ry));
        p.flush();
        ctx.drawImage(p.canvas, rx, ry, w, h);
      } catch (e) { console.warn('mikawaya art', k, e); }
    }
    tex.needsUpdate = true;
  };
  paint();
  Promise.all([whenFontsReady('三河屋平成年日月火水木金土牛乳ほうき工具セット乾電池蛍光ランプチラシ懐中時計おしながき円'), whenPhotosReady()]).then(paint);
  ATLAS = {
    tex, rects, W: AW, H: AH,
    has: (k) => !!rects[k],
    /** [u0, v0, u1, v1] of a cell (a 0.5 px inset keeps neighbours from bleeding in). */
    uv(k, inset = 0.5) { const [rx, ry, w, h] = rects[k]; return [(rx + inset) / AW, 1 - (ry + h - inset) / AH, (rx + w - inset) / AW, 1 - (ry + inset) / AH]; },
    /** A tiny solid swatch inside a cell (box sides, tops). */
    edge(k) { const [rx, ry, w, h] = rects[k]; return [(rx + 0.5) / AW, 1 - (ry + h - 0.5) / AH, (rx + 1.5) / AW, 1 - (ry + h - 1.5) / AH]; },
    repaint: paint,
  };
  return ATLAS;
}

/** Repeating tatami: straw weave with a dark cloth border (heri) on the long sides. 1 repeat = one 0.9 x 1.8 m mat. */
let TATAMI = null;
export function tatamiTexture() {
  if (TATAMI) return TATAMI;
  const p = new Pix(32, 64, 4);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 32; x++) {
    const w = (y % 2 === 0 ? 0.94 : 1.02) * (1 + ((x * 13 + y * 7) % 5) * 0.012);
    p.px(x, y, [Math.round(0xb8 * w), Math.round(0xb0 * w), Math.round(0x72 * w)]);
  }
  p.rect(0, 0, 2, 64, 0x2a2a2e); p.rect(30, 0, 2, 64, 0x2a2a2e);
  p.rect(0, 0, 32, 1, 0x8a8250);
  TATAMI = p.texture({ repeat: [1, 1] });
  return TATAMI;
}

/** The little CRT's screen: a few broadcasts that change every so often (baseball, sumo, the news, a samurai drama). */
export function tvScreen() {
  const p = new Pix(32, 24, 3);
  const tex = p.texture();
  tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
  let t = 0, acc = 0, show = 0, showT = 0;
  const draw = () => {
    const f = Math.floor(t * 4);
    if (show === 0) { // baseball
      p.fill(0x3a8a3a); p.rect(0, 0, 32, 7, 0x5a7aa8);
      for (let x = 0; x < 32; x += 2) p.px(x, 6, 0xd8d8d0);
      p.rect(8, 14, 16, 8, 0xb88a5a); p.px(14 + (f % 6), 12 - (f % 3), 0xffffff);
      p.rect(10, 10, 2, 4, 0xf0f0f0); p.rect(20, 11, 2, 4, 0x2a3a8a);
      p.rect(1, 18, 9, 5, 0x1a1a1a); p.tinyText('3-2', 2, 18, { color: 0xffd23f });
    } else if (show === 1) { // sumo
      p.fill(0x6a4a2a); p.circle(16, 15, 9, 0xc8a878); p.circle(16, 15, 7, 0xd8b888);
      const s = Math.sin(t * 3) * 2;
      p.rect(11 + s, 9, 5, 8, 0xe8c0a0); p.rect(17 + s, 9, 5, 8, 0xd0a888); p.rect(11 + s, 14, 5, 2, 0x2a2a6a); p.rect(17 + s, 14, 5, 2, 0x8a2a2a);
      p.rect(0, 0, 32, 3, 0x8a1a1a);
    } else if (show === 2) { // the evening news
      p.fill(0x2a4a7a); p.rect(0, 16, 32, 8, 0xe8e4dc);
      p.rect(12, 5, 8, 6, 0xe0b898); p.rect(12, 4, 8, 2, 0x1a1a1a); p.rect(10, 11, 12, 6, 0x2a2a3a); p.rect(15, 11, 2, 4, 0xd8302a);
      p.px(15, 9 + (f % 2), 0x8a3a3a);
      for (let x = 2; x < 30; x += 3) p.px(x, 19, 0x2a2a2a);
    } else { // jidaigeki
      p.fill(0x3a2a4a); p.rect(0, 15, 32, 9, 0x5a4a3a);
      const s = (f % 8) - 4;
      p.rect(8, 6, 4, 10, 0x2a2a3a); p.rect(9, 4, 2, 2, 0xe0b898); p.line(12, 8, 16 + s, 4, 0xe8e8f0);
      p.rect(20, 7, 4, 9, 0x8a2a2a); p.rect(21, 5, 2, 2, 0xe0b898);
    }
    // scanlines + a little snow
    for (let y = 0; y < 24; y += 2) for (let x = 0; x < 32; x++) { const c = p.get(x, y); p.px(x, y, [c[0] * 0.82, c[1] * 0.82, c[2] * 0.82]); }
    for (let n = 0; n < 6; n++) p.px((f * 7 + n * 13) % 32, (f * 3 + n * 5) % 24, 0xd8d8d8, 120);
    p.flush();
    tex.needsUpdate = true;
  };
  draw();
  return {
    tex,
    update(dt) {
      t += dt; acc += dt; showT += dt;
      if (showT > 14) { showT = 0; show = (show + 1) % 4; }
      if (acc > 0.25) { acc = 0; draw(); }
    },
  };
}
