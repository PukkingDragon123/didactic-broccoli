// Procedural pixel-art texture library (32 px per metre for architecture). All deterministic.
import * as THREE from 'three';
import { Pix, bumpFrom, FONT_JP, FONT_EN } from './pix.js';
import { hash2 } from '../core/util.js';

const cache = new Map();
const bumpCache = new Map();

function mk(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
}

/** Returns { map, bump } textures for a recipe key (both cached; clone() to change repeat). */
export function tex(key) {
  const pix = mk(key, () => RECIPES[key]());
  let t = bumpCache.get(key);
  if (!t) {
    t = { map: pix.texture({ repeat: [1, 1] }), bump: bumpFrom(pix) };
    t.bump.wrapS = t.bump.wrapT = THREE.RepeatWrapping;
    t.bump.magFilter = THREE.NearestFilter;
    t.size = [pix.w / 32, pix.h / 32]; // metres covered by one repeat at 32px/m
    bumpCache.set(key, t);
  }
  return t;
}

export function pixOf(key) { return mk(key, () => RECIPES[key]()); }

const shadeC = (c, f) => {
  const r = Math.min(255, Math.round(((c >> 16) & 255) * f)), g = Math.min(255, Math.round(((c >> 8) & 255) * f)), b = Math.min(255, Math.round((c & 255) * f));
  return (r << 16) | (g << 8) | b;
};

function planks(w, h, plankH, base, opts = {}) {
  const p = new Pix(w, h, opts.seed || 7);
  const vary = opts.vary ?? 0.12;
  for (let y0 = 0, k = 0; y0 < h; y0 += plankH, k++) {
    const f = 1 + (hash2(k, 3) - 0.5) * vary * 2;
    const col = shadeC(base, f);
    p.rect(0, y0, w, plankH, col);
    // grain
    for (let y = y0 + 1; y < y0 + plankH - 1; y++) {
      let x = 0;
      while (x < w) {
        const len = 3 + Math.floor(p.r() * 14);
        if (p.r() < 0.55) p.line(x, y, Math.min(w - 1, x + len), y, shadeC(col, 0.86 + p.r() * 0.08));
        x += len + 1;
      }
    }
    // highlight + gap
    p.rect(0, y0, w, 1, shadeC(col, 1.12));
    p.rect(0, y0 + plankH - 1, w, 1, shadeC(base, 0.55));
    // butt joints (staggered)
    const jx = Math.floor(hash2(k, 9) * w);
    p.rect(jx, y0, 1, plankH, shadeC(base, 0.6));
    // knots
    if (hash2(k, 5) < 0.5) {
      const kx = Math.floor(hash2(k, 6) * w), ky = y0 + 2 + Math.floor(hash2(k, 7) * (plankH - 4));
      p.circle(kx, ky, 1, shadeC(col, 0.65));
      p.px(kx, ky, shadeC(col, 0.5));
    }
  }
  p.noise(0.04);
  return p;
}

const RECIPES = {
  concrete() {
    const p = new Pix(64, 64, 11);
    p.fill(0x8f8a84);
    p.noise(0.07);
    p.speckle(0.08, [0x7c7772, 0x9d9892, 0x86817b]);
    p.speckle(0.01, [0x6a6560, 0xb0aba4]);
    // stains & patches
    p.blotch(18, 40, 9, 0x5a554f, 0.35);
    p.blotch(48, 14, 6, 0x4a4540, 0.4);
    p.blotch(40, 50, 12, 0x9a958e, 0.25);
    // hairline cracks
    let x = 10, y = 4;
    for (let i = 0; i < 18; i++) { p.px(x, y, 0x6e6964); x += p.r() < 0.5 ? 1 : 0; y += 1; if (p.r() < 0.3) x -= 1; }
    // expansion joints at tile edge
    p.rect(0, 0, 64, 1, 0x67625d); p.rect(0, 0, 1, 64, 0x67625d);
    p.rect(0, 1, 64, 1, 0xa29d96); p.rect(1, 0, 1, 64, 0xa29d96);
    return p;
  },
  concreteWall() {
    const p = new Pix(64, 64, 12);
    p.fill(0xb5aea3);
    p.noise(0.05);
    p.speckle(0.06, [0xa8a196, 0xc0b9ad]);
    // formwork tie holes (Japanese exposed concrete)
    for (const [x, y] of [[8, 10], [40, 10], [8, 42], [40, 42]]) { p.circle(x, y, 1, 0x8a8378); p.px(x, y, 0x6a6358); }
    p.rect(0, 31, 64, 1, 0xa39c90);
    p.rect(31, 0, 1, 64, 0xa39c90);
    // water streaks
    for (let i = 0; i < 6; i++) { const sx = Math.floor(p.r() * 64); for (let y = 0; y < 12 + p.r() * 30; y++) p.px(sx, y, 0x9e978b, 120); }
    return p;
  },
  plaster() {
    const p = new Pix(64, 64, 13);
    p.fill(0xd9cdb4);
    p.noise(0.035);
    p.speckle(0.05, [0xcfc2a8, 0xe2d7c0]);
    p.blotch(20, 50, 10, 0xc2b497, 0.25);
    p.blotch(50, 20, 8, 0xe6dcc8, 0.3);
    return p;
  },
  woodFloor() { return planks(64, 64, 8, 0x9a6a3f, { seed: 21 }); },
  woodTable() { return planks(64, 64, 10, 0x8a5a33, { seed: 22, vary: 0.08 }); },
  woodLight() { return planks(64, 64, 8, 0xc49a63, { seed: 23 }); },
  woodDark() { return planks(64, 64, 8, 0x5e3c22, { seed: 24, vary: 0.07 }); },
  plywood() {
    const p = new Pix(64, 64, 25);
    p.fill(0xc8a678);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const v = Math.sin((x * 0.15 + Math.sin(y * 0.09) * 3) + hash2(x >> 3, y >> 4)) * 0.5 + 0.5;
      if (v > 0.85) p.px(x, y, 0xb08c5e);
    }
    p.noise(0.05);
    return p;
  },
  corrugated() {
    const p = new Pix(32, 64, 31);
    for (let x = 0; x < 32; x++) {
      const ph = x % 4;
      const c = [0x9aa3a6, 0xb6bec0, 0x8b9497, 0x737c80][ph];
      p.rect(x, 0, 1, 64, c);
    }
    p.noise(0.05);
    for (let i = 0; i < 4; i++) { const sx = Math.floor(p.r() * 32); for (let y = 0; y < 20 + p.r() * 40; y++) p.px(sx, y, 0x8a5a3a, 110); }
    p.blotch(10, 60, 6, 0x7a4a2a, 0.4);
    return p;
  },
  shutter() {
    const p = new Pix(64, 64, 32);
    for (let y = 0; y < 64; y++) {
      const ph = y % 4;
      p.rect(0, y, 64, 1, [0xb9bfb8, 0xa9afa8, 0x969c95, 0x7b817a][ph]);
    }
    p.noise(0.04);
    for (let i = 0; i < 5; i++) p.blotch(Math.floor(p.r() * 64), Math.floor(p.r() * 64), 4, 0x8d6a4a, 0.35);
    p.rect(0, 62, 64, 2, 0x5d625c);
    return p;
  },
  cardboard() {
    const p = new Pix(32, 32, 41);
    p.fill(0xb98a55);
    for (let x = 0; x < 32; x += 3) p.rect(x, 0, 1, 32, 0xb08250);
    p.noise(0.05);
    p.speckle(0.02, [0xa07040, 0xc8996a]);
    return p;
  },
  pegboard() {
    const p = new Pix(32, 32, 42);
    p.fill(0xa0774e);
    p.noise(0.05);
    for (let y = 2; y < 32; y += 4) for (let x = 2; x < 32; x += 4) { p.px(x, y, 0x3a2818); p.px(x + 1, y, 0x5a3e25); }
    return p;
  },
  steel() {
    const p = new Pix(32, 32, 43);
    p.fill(0x6e7a7f);
    p.noise(0.05);
    for (let i = 0; i < 8; i++) { const x = Math.floor(p.r() * 32), y = Math.floor(p.r() * 32); p.line(x, y, x + 3 + Math.floor(p.r() * 5), y + (p.r() < 0.5 ? 0 : 1), 0x9aa5aa); }
    return p;
  },
  steelGreen() {
    const p = new Pix(32, 32, 44);
    p.fill(0x5f7f6a);
    p.noise(0.05);
    for (let i = 0; i < 6; i++) { const x = Math.floor(p.r() * 32), y = Math.floor(p.r() * 32); p.line(x, y, x + 4, y, 0x86a691); }
    p.blotch(24, 26, 3, 0x7a5a3a, 0.4);
    return p;
  },
  tatami() {
    const p = new Pix(32, 64, 51);
    p.fill(0xc5b77a);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 32; x++) {
      if ((x + (y % 2)) % 2 === 0) p.px(x, y, 0xb9aa6a);
      if (y % 4 === 0) p.px(x, y, 0xad9e60);
    }
    p.noise(0.04);
    // heri (border cloth) on the long sides
    p.rect(0, 0, 3, 64, 0x2f4a32); p.rect(29, 0, 3, 64, 0x2f4a32);
    for (let y = 0; y < 64; y += 3) { p.px(1, y, 0xc8b060); p.px(30, y, 0xc8b060); }
    return p;
  },
  asphalt() {
    const p = new Pix(64, 64, 52);
    p.fill(0x4a4846);
    p.noise(0.1);
    p.speckle(0.12, [0x3a3836, 0x5a5856, 0x625e5a, 0x6e6a64]);
    p.blotch(20, 30, 10, 0x3a3836, 0.4);
    return p;
  },
  asphaltLine() {
    const p = new Pix(64, 64, 53);
    p.fill(0x4a4846);
    p.noise(0.1);
    p.speckle(0.12, [0x3a3836, 0x5a5856, 0x625e5a]);
    p.rect(0, 28, 64, 5, 0xd8d4c8);
    p.noise(0.08, 0, 28, 64, 5);
    p.speckle(0.2, [0x8a8680], 255, 0, 28, 64, 5);
    return p;
  },
  brick() {
    const p = new Pix(64, 64, 54);
    p.fill(0x8a7f74);
    for (let row = 0; row < 16; row++) {
      const off = row % 2 ? 4 : 0;
      for (let bx = -8; bx < 64; bx += 8) {
        const c = shadeC(0xa8553d, 0.85 + hash2(bx + off, row) * 0.3);
        p.rect(bx + off + 1, row * 4 + 1, 7, 3, c);
        p.px(bx + off + 1, row * 4 + 1, shadeC(c, 1.15));
      }
    }
    p.noise(0.06);
    return p;
  },
  tile() {
    const p = new Pix(32, 32, 55);
    p.fill(0xe8e6df);
    for (let i = 0; i < 32; i += 8) { p.rect(i, 0, 1, 32, 0xb8b4aa); p.rect(0, i, 32, 1, 0xb8b4aa); }
    p.noise(0.025);
    return p;
  },
  blockWall() {
    const p = new Pix(64, 32, 56);
    p.fill(0x9c9890);
    for (let row = 0; row < 2; row++) for (let bx = 0; bx < 64; bx += 13) {
      const off = row ? 6 : 0;
      p.frame(bx + off, row * 16, 13, 16, 0x7e7a72);
    }
    p.noise(0.08);
    p.speckle(0.05, [0x8a867e, 0xaaa69e]);
    return p;
  },
  sky() {
    const p = new Pix(64, 128, 61);
    p.gradient(0, 0, 64, 70, 0x3f4a8a, 0xf2a46a);
    p.gradient(0, 70, 64, 40, 0xf2a46a, 0xffd6a0);
    p.rect(0, 110, 64, 18, 0xffd6a0);
    // pixel clouds
    const cloud = (cx, cy, w, c, c2) => {
      for (let i = 0; i < w; i++) { const hh = Math.round(Math.sin((i / w) * Math.PI) * 3) + 1; p.rect(cx + i, cy - hh, 1, hh, c); p.px(cx + i, cy, c2); }
    };
    cloud(4, 40, 18, 0xffb98a, 0xe0866a);
    cloud(34, 55, 22, 0xffc89a, 0xe89a72);
    cloud(16, 78, 26, 0xffe0b0, 0xf2b07a);
    p.speckle(0.004, [0xffffff], 255, 0, 0, 64, 30);
    return p;
  },
  houseWall() {
    const p = new Pix(32, 32, 62);
    p.fill(0xcfc6b2);
    for (let y = 0; y < 32; y += 4) p.rect(0, y, 32, 1, 0xb8ae98);
    p.noise(0.05);
    return p;
  },
  felt() {
    const p = new Pix(32, 32, 63);
    p.fill(0x2f5c3a);
    p.noise(0.08);
    return p;
  },
  velvet() {
    const p = new Pix(32, 32, 64);
    p.fill(0x8a1f2a);
    p.noise(0.1);
    return p;
  },
  rope() {
    const p = new Pix(8, 16, 65);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 8; x++) p.px(x, y, ((x + y) % 4 < 2) ? 0xd9c08a : 0xb89a62);
    return p;
  },
};

// ---------------------------------------------------------------------- posters & signs
const POSTERS = {
  gachaPoster(p) {
    p.gradient(0, 0, p.w, p.h, 0xffe1ec, 0xffb3cc);
    for (let i = 0; i < 26; i++) p.circle(Math.floor(p.r() * p.w), Math.floor(p.r() * p.h), 1, 0xffffff, 120);
    const cap = (cx, cy, r, c) => {
      p.circle(cx, cy, r, 0xffffff);
      for (let y = 0; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) p.px(cx + x, cy + y, c);
      p.line(cx - r, cy, cx + r, cy, shadeC(c, 0.7));
      p.px(cx - r + 2, cy - r + 2, 0xffffff); p.px(cx - r + 3, cy - r + 2, 0xffffff);
    };
    cap(16, 64, 9, 0xff6f91); cap(38, 72, 11, 0x5cc4ff); cap(54, 60, 7, 0xffd23f); cap(28, 88, 8, 0x58c06c);
    p.text('ガチャガチャ', p.w / 2, 6, { size: 16, color: 0xffffff, outline: 0xe5383b, align: 'center' });
    p.text('新シリーズ入荷!', p.w / 2, 26, { size: 12, color: 0x6a2c40, align: 'center' });
    p.text('1回 100円', p.w / 2, 100, { size: 12, color: 0xffffff, outline: 0x6a2c40, align: 'center' });
  },
  safety(p) {
    p.fill(0xf4f1e8);
    p.frame(0, 0, p.w, p.h, 0x2a8a3a); p.frame(1, 1, p.w - 2, p.h - 2, 0x2a8a3a);
    p.rect(p.w / 2 - 3, 6, 6, 18, 0x2a8a3a); p.rect(p.w / 2 - 9, 12, 18, 6, 0x2a8a3a);
    p.text('安全第一', p.w / 2, 30, { size: 14, color: 0x1f6a2c, align: 'center' });
  },
  nosmoking(p) {
    p.fill(0xf7f3ea);
    p.circle(p.w / 2, 18, 13, 0xd8282a); p.circle(p.w / 2, 18, 10, 0xf7f3ea);
    p.rect(p.w / 2 - 8, 17, 16, 3, 0x333333); p.rect(p.w / 2 + 6, 17, 2, 3, 0xff8a3a);
    p.line(p.w / 2 - 8, 10, p.w / 2 + 8, 26, 0xd8282a); p.line(p.w / 2 - 7, 10, p.w / 2 + 9, 26, 0xd8282a);
    p.text('禁煙', p.w / 2, 34, { size: 14, color: 0xd8282a, align: 'center' });
  },
  gamePoster(p) {
    p.gradient(0, 0, p.w, p.h, 0x1b2347, 0x5a3a8a);
    p.speckle(0.03, [0xffffff, 0xffe08a]);
    p.text('スーパー', p.w / 2, 6, { size: 12, color: 0xffd23f, outline: 0x8a2a2a, align: 'center' });
    p.text('カプセル', p.w / 2, 20, { size: 16, color: 0xffffff, outline: 0xe5383b, align: 'center' });
    p.text('大冒険', p.w / 2, 40, { size: 16, color: 0xffd23f, outline: 0x8a2a2a, align: 'center' });
    p.sprite([
      '...RRRR...', '..RRRRRRR.', '..BBBSSB..', '.BSBSSSBSS', '.BSBBSSSBS', '.BBSSSSBB.', '...SSSSS..',
      '..RRBRR...', '.RRRBRRBR.', 'RRRRBBBBRR', 'SSRBYBBYBR', 'SSSBBBBBB.', 'SS.BBB.BBB', '..BBB...BB',
    ], { R: 0xe5383b, B: 0x2f6fd6, S: 0xffd9bf, Y: 0xffd23f }, p.w / 2 - 10, 62, 2);
    p.text('1987', p.w / 2, p.h - 14, { size: 10, color: 0xc9c6c0, align: 'center' });
  },
  kaijuPoster(p) {
    p.gradient(0, 0, p.w, p.h, 0xe86a3a, 0x3a1a2a);
    for (let x = 0; x < p.w; x += 6) { const hh = 10 + Math.floor(hash2(x, 1) * 20); p.rect(x, p.h - hh - 12, 5, hh, 0x1a1218); if (hash2(x, 2) < 0.5) p.px(x + 2, p.h - hh - 6, 0xffd23f); }
    p.sprite([
      '....GG....', '...GGGG...', '..GGWGKG..', '..GGGGGG..', '.GGGGGGG..', 'GG.GGGGGG.', '...GGGGGG.', '..GGGGGGGG',
      '..GGG.GGGG', '..GG...GGG',
    ], { G: 0x3a8a4a, W: 0xffffff, K: 0x000000 }, 14, 30, 3);
    p.text('怪獣大決戦', p.w / 2, 6, { size: 14, color: 0xffd23f, outline: 0x3a0a0a, align: 'center' });
  },
  lostCat(p) {
    p.fill(0xfbf8ee);
    p.text('迷い猫', p.w / 2, 4, { size: 14, color: 0xd8282a, align: 'center' });
    p.text('さがしています', p.w / 2, 20, { size: 9, color: 0x333333, align: 'center' });
    p.rect(8, 32, p.w - 16, 30, 0xe8e2d0);
    p.sprite(['.O...O.', '.OO.OO.', 'OOOOOOO', 'OKOOOKO', 'OOOPOOO', '.OOOOO.', '.OO.OO.'], { O: 0xe8a25a, K: 0x222222, P: 0xff9fae }, p.w / 2 - 10, 36, 3);
    for (let i = 0; i < 4; i++) p.rect(8, 68 + i * 6, p.w - 16 - (i % 2) * 10, 2, 0x888888);
    for (let x = 6; x < p.w - 4; x += 7) { p.rect(x, p.h - 14, 4, 14, 0xfbf8ee); p.frame(x, p.h - 14, 4, 14, 0xbbbbbb); }
  },
  matsuri(p) {
    p.gradient(0, 0, p.w, p.h, 0x0f1a3a, 0x3a2a5a);
    const fw = (cx, cy, r, c) => { for (let a = 0; a < 16; a++) { const an = a / 16 * Math.PI * 2; for (let k = 2; k < r; k += 2) p.px(cx + Math.round(Math.cos(an) * k), cy + Math.round(Math.sin(an) * k), c); } };
    fw(20, 30, 14, 0xff6f9a); fw(46, 22, 11, 0xffd23f); fw(36, 46, 9, 0x5cc4ff);
    for (let i = 0; i < 6; i++) { p.rect(6 + i * 10, 70, 6, 8, 0xe5383b); p.rect(7 + i * 10, 71, 4, 6, 0xff8a5a); p.px(9 + i * 10, 69, 0x333333); }
    p.line(4, 69, p.w - 4, 69, 0x333333);
    p.text('夏祭り', p.w / 2, 82, { size: 16, color: 0xffffff, outline: 0xe5383b, align: 'center' });
    p.text('8月15日', p.w / 2, 102, { size: 10, color: 0xffd23f, align: 'center' });
  },
  calendar(p) {
    p.fill(0xfbfaf4);
    p.rect(0, 0, p.w, 30, 0x8fb85a);
    p.sprite(['..WW..', '.WWWW.', 'WWWWWW', '..GG..', '..GG..'], { W: 0xffc2d4, G: 0x5e3a22 }, 6, 6, 3);
    p.text('10月', p.w - 6, 6, { size: 14, color: 0xffffff, align: 'right' });
    const d = ['日', '月', '火', '水', '木', '金', '土'];
    d.forEach((s, i) => p.text(s, 5 + i * 8.5, 34, { size: 8, color: i === 0 ? 0xd8282a : i === 6 ? 0x2f6fd6 : 0x333333 }));
    for (let n = 1; n <= 31; n++) {
      const pos = n + 2, col = pos % 7, row = Math.floor(pos / 7);
      p.rect(5 + col * 8.5, 46 + row * 8, 5, 5, col === 0 ? 0xffb0b0 : 0xd8d8d0);
      if (n === 17) p.frame(4 + col * 8.5, 45 + row * 8, 7, 7, 0xd8282a);
    }
  },
  idol(p) {
    p.gradient(0, 0, p.w, p.h, 0xffb3e0, 0x9fd9ff);
    for (let i = 0; i < 30; i++) p.px(Math.floor(p.r() * p.w), Math.floor(p.r() * p.h), 0xffffff);
    p.sprite([
      '...KKKK...', '..KKKKKKK.', '.KKSSSSKKK', '.KSKSSKSKK', '.KSSSSSSKK', '.KKSPPSKK.', '..KSSSSK..', '...PPPP...',
      '..PPWWPP..', '.SPPWWPPS.', '.S.PPPP.S.', '...PPPP...', '...S..S...',
    ], { K: 0x3a2a4a, S: 0xffd9bf, P: 0xff6f9a, W: 0xffffff }, p.w / 2 - 15, 34, 3);
    p.text('ライブ', p.w / 2, 6, { size: 14, color: 0xffffff, outline: 0xd94fb0, align: 'center' });
    p.text('★NEW SINGLE★', p.w / 2, 22, { size: 8, color: 0xd94fb0, align: 'center', font: FONT_EN });
  },
  museumSign(p) {
    p.fill(0x3a2a1c);
    p.frame(1, 1, p.w - 2, p.h - 2, 0xd4a83a);
    p.text('貸倉庫', p.w / 2, 4, { size: 16, color: 0xf3e9d2, align: 'center' });
    p.text('FOR RENT', p.w / 2, 24, { size: 10, color: 0xd4a83a, align: 'center', font: FONT_EN });
    p.text('入居者募集中', p.w / 2, 38, { size: 9, color: 0xf3e9d2, align: 'center' });
  },
  sellBox(p) {
    p.fill(0xc89a5f);
    p.noise(0.04);
    p.rect(4, 4, p.w - 8, p.h - 8, 0xf7f0de);
    p.text('買取', p.w / 2, 8, { size: 16, color: 0xd8282a, align: 'center' });
    p.text('BOX', p.w / 2, 28, { size: 10, color: 0x333333, align: 'center', font: FONT_EN });
    p.text('高価買取中!', p.w / 2, 42, { size: 8, color: 0xd8282a, align: 'center' });
  },
  storageLabel(p) {
    p.fill(0xf7f0de);
    p.text('保管', p.w / 2, 3, { size: 12, color: 0x2f6fd6, align: 'center' });
    p.text('STORAGE', p.w / 2, 18, { size: 7, color: 0x333333, align: 'center', font: FONT_EN });
  },
  mikanBox(p) {
    p.fill(0xc89a5f); p.noise(0.05);
    p.circle(18, p.h / 2, 9, 0xff9a1f); p.circle(18, p.h / 2, 7, 0xffb34d); p.rect(17, p.h / 2 - 11, 2, 3, 0x3a8a3a);
    p.text('みかん', 46, p.h / 2 - 9, { size: 16, color: 0xe86a1a, align: 'center' });
  },
  fragile(p) {
    p.fill(0xc89a5f); p.noise(0.05);
    p.rect(2, 2, p.w - 4, p.h - 4, 0xffd23f);
    p.text('ワレモノ', p.w / 2, 4, { size: 12, color: 0xd8282a, align: 'center' });
    p.text('注意', p.w / 2, 18, { size: 12, color: 0xd8282a, align: 'center' });
  },
  capsuleStock(p) {
    p.fill(0xc89a5f); p.noise(0.05);
    p.text('カプセル在庫', p.w / 2, 4, { size: 10, color: 0x333333, align: 'center' });
    for (let i = 0; i < 5; i++) { p.circle(10 + i * 12, 26, 4, [0xff6f91, 0x5cc4ff, 0xffd23f, 0x58c06c, 0xff8c2e][i]); p.rect(6 + i * 12, 22, 9, 4, 0xffffff, 140); }
    p.text('天地無用', p.w / 2, 34, { size: 8, color: 0xd8282a, align: 'center' });
  },
  rice(p) {
    p.fill(0xeee6d0); p.noise(0.04);
    p.text('お米', p.w / 2, 4, { size: 16, color: 0x2a6a2a, align: 'center' });
    p.text('新潟県産', p.w / 2, 24, { size: 8, color: 0x8a2a2a, align: 'center' });
  },
};

export function poster(key, w = 64, h = 96, seed = 3) {
  return mk('poster:' + key + w + 'x' + h, () => {
    const p = new Pix(w, h, seed);
    POSTERS[key](p);
    // paper wear
    p.noise(0.03);
    return p;
  });
}

export function posterTexture(key, w, h) {
  const p = poster(key, w, h);
  return p.texture();
}

export { Pix, FONT_JP, FONT_EN };
