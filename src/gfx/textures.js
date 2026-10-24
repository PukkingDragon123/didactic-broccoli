// Procedural pixel-art texture library (32 px per metre for architecture). All deterministic.
import * as THREE from 'three';
import { Pix, bumpFrom, FONT_JP, FONT_EN, FONT_DISPLAY } from './pix.js';
import { hash2 } from '../core/util.js';
import { shopPix } from './shopTextures.js';

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
  plywoodHD: () => shopPix('plywoodHD'),
  concreteHD: () => shopPix('concreteHD'),
  floorHD: () => shopPix('floorHD'),
  corrugatedHD: () => shopPix('corrugatedHD'),
  blockHD: () => shopPix('blockHD'),
  koshiita: () => shopPix('koshiita'),
  shikkui: () => shopPix('shikkui'),
  shopCeiling: () => shopPix('shopCeiling'),
  siding: () => shopPix('siding'),
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
  /** Roller shutter (2 m × 4 m): rolled slats with highlight/shadow lips, dents, chalky paint, rust at the foot and grime runs. */
  shutter() {
    const p = new Pix(64, 128, 32);
    for (let y = 0; y < 128; y++) {
      const ph = y % 4;
      for (let x = 0; x < 64; x++) {
        const dent = hash2(x >> 2, y >> 2) < 0.03 ? 0.9 : 1;
        p.px(x, y, shadeC([0xc2c8c1, 0xaab0a9, 0x969c95, 0x70766f][ph], dent * (0.97 + hash2(x >> 4, y >> 3) * 0.05)));
      }
    }
    // end locks (slat clips) every 2 m along the edges
    for (let y = 1; y < 128; y += 4) { p.px(0, y, 0x5a605a); p.px(63, y, 0x5a605a); }
    // chalky patches and grime runs from the top hood
    for (let i = 0; i < 6; i++) p.blotch(Math.floor(p.r() * 64), Math.floor(p.r() * 128), 4, 0xd0d4cc, 0.25);
    for (let i = 0; i < 10; i++) { const x = Math.floor(hash2(i, 5) * 64); const len = 20 + hash2(i, 6) * 70; for (let y = 0; y < len; y++) if (y % 4 !== 0) p.px(x, y, 0x5e625a, 90 * (1 - y / len)); }
    // rust spots on slat lips + rusty foot
    for (let i = 0; i < 26; i++) { const x = Math.floor(hash2(i, 7) * 64), y = Math.floor(hash2(i, 8) * 32) * 4 + 3; p.px(x, y, 0x8d5a3a); p.px(x + 1, y, 0x7a4a2a, 160); if (hash2(i, 9) < 0.5) p.px(x, y + 1, 0x8d6a4a, 120); }
    for (let y = 112; y < 128; y++) for (let x = 0; x < 64; x++) if (hash2(x, y) < (y - 108) / 24) p.px(x, y, hash2(x, y + 3) < 0.5 ? 0x8d5a3a : 0x6e4a32, 140);
    p.rect(0, 126, 64, 2, 0x4d524c);
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
  /** Fibre-cement siding (2 m tile): 25 cm boards with shadow lips, staggered butt joints with caulk, nail heads, rain grime. */
  houseWall() {
    const p = new Pix(64, 64, 62);
    for (let row = 0; row < 8; row++) {
      const y0 = row * 8, base = shadeC(0xd4cbb6, 0.97 + hash2(row, 1) * 0.05);
      p.rect(0, y0, 64, 8, base);
      for (let x = 0; x < 64; x++) if (hash2(x, row + 3) < 0.25) p.px(x, y0 + 2 + Math.floor(hash2(row, x) * 4), shadeC(base, 0.96));
      p.rect(0, y0, 64, 1, shadeC(base, 1.08));
      p.rect(0, y0 + 7, 64, 1, shadeC(base, 0.72));
      p.rect(0, y0 + 6, 64, 1, shadeC(base, 0.92));
      const jx = Math.floor(hash2(row, 9) * 64);
      p.rect(jx, y0, 1, 7, 0xb8b0a0); p.px(jx + 1, y0 + 3, 0x9a9282);
      for (let x = 6; x < 64; x += 16) p.px((x + row * 5) % 64, y0 + 4, 0xa8a090);
    }
    // grime runs under the windows / from the eaves
    for (let i = 0; i < 6; i++) { const x = Math.floor(hash2(i, 21) * 64); const len = 10 + hash2(i, 22) * 40; for (let y = 0; y < len; y++) p.px(x + (y % 9 === 0 ? 1 : 0), y, 0x8a8270, 70 * (1 - y / len)); }
    for (let x = 0; x < 64; x++) for (let y = 58; y < 64; y++) if ((x + y) % 2) p.px(x, y, 0x8a8270, 60);
    p.noise(0.025);
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
  // ------------------------------------------------------------ the lane outside (Town.js)
  /** Old asphalt (8 m tile at 32 px/m): aggregate, tar-sealed cracks, a patch repair, oil drips. */
  asphaltHD() {
    const p = new Pix(256, 256, 101);
    p.fill(0x4a4846);
    for (let i = 0; i < 18; i++) p.blotch(Math.floor(hash2(i, 1) * 256), Math.floor(hash2(i, 2) * 256), 14 + Math.floor(hash2(i, 3) * 12), i % 2 ? 0x524f4c : 0x43413f, 0.35);
    p.speckle(0.16, [0x3a3836, 0x5a5856, 0x625e5a, 0x6e6a64, 0x56524e]);
    p.speckle(0.02, [0x8a8680, 0x9a948c]);
    // tar-sealed cracks (glossy black) and open hairline cracks
    const crackLine = (x, y, n, c, w, s) => { for (let i = 0; i < n; i++) { p.px(x, y, c); if (w > 1) p.px(x + 1, y, c); x += hash2(i, s) < 0.5 ? 1 : -1; y += hash2(i, s + 1) < 0.7 ? 1 : 0; x = (x + 256) % 256; y = (y + 256) % 256; } };
    crackLine(40, 10, 140, 0x262422, 2, 3); crackLine(180, 120, 90, 0x262422, 2, 5);
    crackLine(120, 30, 60, 0x34322f, 1, 7); crackLine(210, 200, 50, 0x34322f, 1, 9); crackLine(20, 180, 70, 0x34322f, 1, 11);
    // patch repair (slightly darker, tidy cut edges)
    p.rect(150, 20, 40, 26, 0x3e3c3a); p.speckle(0.18, [0x2e2c2a, 0x52504c, 0x5a5652], 255, 150, 20, 40, 26);
    p.frame(150, 20, 40, 26, 0x2a2826);
    // oil drips
    for (const [x, y] of [[90, 200], [96, 206], [60, 90]]) p.blotch(x, y, 3, 0x2a2826, 0.5);
    return p;
  },
  /** Worn white road paint (thermoplastic with aggregate showing through). */
  roadPaint() {
    const p = new Pix(32, 32, 113);
    p.fill(0xe6e2d6);
    p.speckle(0.16, [0xc8c4b8, 0xd4d0c4, 0xf2eee4]);
    p.speckle(0.05, [0x6a6662, 0x8a8680, 0x5a5652]);
    p.blotch(10, 20, 4, 0x8a8680, 0.3); p.blotch(26, 6, 3, 0x7a7670, 0.3);
    return p;
  },
  /** Yellow/black hazard stripes (tiling). */
  hazard() {
    const p = new Pix(32, 32, 114);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) p.px(x, y, ((x + y) >> 3) % 2 ? 0x1e1c1a : 0xf0c018);
    p.noise(0.08);
    p.speckle(0.04, [0x8a7a5a, 0x5a4a3a]);
    return p;
  },
  /** Concrete paving slabs (30 cm) for the strip along the far side. */
  paving() {
    const p = new Pix(64, 64, 102);
    p.fill(0x9a958c);
    for (let j = 0; j < 64; j += 10) for (let i = 0; i < 64; i += 10) { const c = shadeC(0xa29d94, 0.94 + hash2(i, j) * 0.1); p.rect(i + 1, j + 1, 9, 9, c); p.px(i + 1, j + 1, shadeC(c, 1.08)); }
    p.speckle(0.12, [0x8a857c, 0xaaa59c]);
    p.blotch(40, 20, 6, 0x6a665e, 0.3); p.blotch(12, 50, 5, 0x5a6a3a, 0.3);
    return p;
  },
  /** U-gutter concrete lids (側溝の蓋): 50 cm lids with lifting slots, worn edges. */
  gutterLid() {
    const p = new Pix(64, 16, 103);
    p.fill(0x8a867e);
    for (let i = 0; i < 64; i += 16) {
      const c = shadeC(0xa39f96, 0.92 + hash2(i, 1) * 0.12);
      p.rect(i + 1, 1, 15, 14, c);
      p.rect(i + 1, 1, 15, 1, shadeC(c, 1.1)); p.rect(i + 1, 14, 15, 1, shadeC(c, 0.8));
      p.rect(i + 3, 6, 3, 3, 0x2a2826); p.px(i + 3, 6, 0x1a1816);
      p.speckle(0.1, [shadeC(c, 0.88), shadeC(c, 1.06)], 255, i + 1, 1, 15, 14);
    }
    return p;
  },
  /** Galvanised steel grating (グレーチング). */
  grate() {
    const p = new Pix(16, 16, 104);
    p.fill(0x1a1816);
    for (let x = 0; x < 16; x += 2) p.rect(x, 0, 1, 16, (x % 4) ? 0x8a8e8e : 0x9aa0a0);
    for (let y = 0; y < 16; y += 8) p.rect(0, y, 16, 1, 0x7a7e7e);
    p.blotch(10, 12, 3, 0x6a4a2a, 0.4);
    return p;
  },
  /** Red brick, English bond, with soot, efflorescence and a few replaced bricks (64 px/m). */
  brickHD() {
    const p = new Pix(128, 128, 105);
    p.fill(0x8a8276);
    for (let row = 0; row < 26; row++) {
      const y0 = Math.round(row * 128 / 26), h = Math.round((row + 1) * 128 / 26) - y0;
      const header = row % 2 === 1, bw = header ? 8 : 16, off = header ? 4 : 0;
      for (let bx = -16; bx < 128; bx += bw) {
        const k = hash2(bx + 40, row);
        let c = shadeC([0x9a4a32, 0xa85a3c, 0x8a3e2c, 0xb4664a, 0x7a3a2a][Math.floor(k * 5)], 0.92 + hash2(bx, row + 7) * 0.14);
        if (k > 0.97) c = 0xc08a6a;
        for (let y = 1; y < h; y++) for (let x = 1; x < bw; x++) {
          const X = bx + off + x;
          if (X < 0 || X >= 128) continue;
          p.px(X, y0 + y, hash2(X, y0 + y) < 0.12 ? shadeC(c, 0.85) : c);
        }
        if (bx + off + 1 >= 0) p.px(bx + off + 1, y0 + 1, shadeC(c, 1.15));
      }
    }
    // soot/grime gradient from the top and runs of efflorescence
    for (let x = 0; x < 128; x++) for (let y = 0; y < 30; y++) if (hash2(x, y) < (30 - y) / 40) p.px(x, y, 0x2a2420, 70);
    for (let i = 0; i < 8; i++) { const x = Math.floor(hash2(i, 31) * 128), y0 = 30 + Math.floor(hash2(i, 32) * 70); for (let y = 0; y < 12; y++) if (hash2(x, y + i) < 0.7) p.px(x + (y % 5 === 0 ? 1 : 0), y0 + y, 0xe8e2d6, 120 - y * 9); }
    for (let x = 0; x < 128; x++) for (let y = 116; y < 128; y++) if ((x + y) % 2) p.px(x, y, 0x3a3028, 60);
    return p;
  },
  /** 間知石 retaining wall: diagonal dressed granite blocks in courses, fine joints, moss and water stains (64 px/m). */
  kenchi() {
    const p = new Pix(128, 128, 106);
    p.fill(0x7a766c);
    const S = 12; // half-diagonal of a stone (~0.19 m)
    for (let j = -1; j <= 11; j++) for (let i = -1; i <= 6; i++) {
      const cx = i * S * 2 + (j % 2 ? S : 0), cy = j * S;
      const base = shadeC([0xaaa598, 0x9e998e, 0xb4afa2, 0x948f84, 0xa8a090][Math.floor(hash2(i + 20, j + 20) * 5)], 0.96 + hash2(i, j) * 0.08);
      for (let y = -S + 1; y <= S - 1; y++) for (let x = -S + 1; x <= S - 1; x++) {
        const d = Math.abs(x) + Math.abs(y);
        if (d > S - 1) continue;
        const X = ((cx + x) % 128 + 128) % 128, Y = ((cy + y) % 128 + 128) % 128;
        let c = hash2(X, Y) < 0.14 ? shadeC(base, 0.92) : hash2(X + 1, Y) < 0.06 ? shadeC(base, 1.06) : base;
        if (d > S - 3) c = shadeC(base, y < 0 ? 1.08 : 0.86);
        if (d < 3) c = shadeC(base, 1.03);
        p.px(X, Y, c);
      }
    }
    // moss creeping along joints, rust-brown water stains
    for (let i = 0; i < 200; i++) { const x = Math.floor(hash2(i, 41) * 128), y = Math.floor(hash2(i, 42) * 128); const [r] = p.get(x, y); if (r < 128) p.px(x, y, [0x5a7a32, 0x6a8a3a, 0x4a6a2a][i % 3]); }
    for (let i = 0; i < 8; i++) { const x = Math.floor(hash2(i, 51) * 128); const y0 = Math.floor(hash2(i, 52) * 64); for (let y = 0; y < 24 + hash2(i, 53) * 40; y++) p.px(x + (y % 7 === 0 ? 1 : 0), (y0 + y) % 128, 0x5a5244, 70); }
    return p;
  },
  /** Underpass wall: damp concrete with seepage streaks, calcite drips and soot (64 px/m). */
  tunnelWall() {
    const p = new Pix(128, 128, 107);
    p.fill(0x8a867c);
    for (let i = 0; i < 14; i++) p.blotch(Math.floor(hash2(i, 1) * 128), Math.floor(hash2(i, 2) * 128), 10 + Math.floor(hash2(i, 3) * 12), i % 2 ? 0x7a766c : 0x96928a, 0.45);
    p.speckle(0.1, [0x7e7a70, 0x9a968c, 0x6e6a62]);
    for (let x = 0; x < 128; x += 64) { p.rect(x, 0, 1, 128, 0x5e5a52); p.rect(x + 1, 0, 1, 128, 0xa29e94); }
    for (let i = 0; i < 18; i++) { const x = Math.floor(hash2(i, 11) * 128); const len = 30 + hash2(i, 12) * 90; for (let y = 0; y < len; y++) { p.px(x, y, 0x3a3630, 140 * (1 - y / len)); if (y < len * 0.5) p.px(x + 1, y, 0x4a463e, 90 * (1 - y / len)); } }
    for (let i = 0; i < 7; i++) { const x = Math.floor(hash2(i, 21) * 128); for (let y = 0; y < 8 + hash2(i, 22) * 14; y++) p.px(x, y, 0xe4e0d4, 150 - y * 8); }
    for (let x = 0; x < 128; x++) for (let y = 100; y < 128; y++) if (hash2(x, y) < (y - 96) / 40) p.px(x, y, 0x3a382e, 90);
    return p;
  },
  /** Kawara roof tiles seen down the slope: rounded tile columns (25 cm) with lapped courses and moss. */
  roofTile() {
    const p = new Pix(64, 64, 108);
    const ramp = [0x9aa0a8, 0xa8aeb6, 0x9ca2aa, 0x8a9098, 0x7a8088, 0x6a7078, 0x5e646c, 0x80868e];
    for (let x = 0; x < 64; x++) for (let y = 0; y < 64; y++) p.px(x, y, shadeC(ramp[x % 8], 0.96 + hash2(x >> 3, y >> 3) * 0.08));
    for (let y = 0; y < 64; y += 9) for (let x = 0; x < 64; x++) { p.px(x, y, shadeC(ramp[x % 8], 0.7)); p.px(x, y + 1, shadeC(ramp[x % 8], 1.08)); }
    for (let i = 0; i < 40; i++) { const x = Math.floor(hash2(i, 31) * 64), y = Math.floor(hash2(i, 32) * 64); if (x % 8 > 4) p.px(x, y, [0x5a6a3a, 0x6a7a42][i % 2]); }
    p.noise(0.03);
    return p;
  },
  /** Painted riveted steel (girders): mottled paint, rivet rows, rust blooms (64 px/m). */
  girder() {
    const p = new Pix(64, 64, 109);
    p.fill(0x8a8478);
    for (let i = 0; i < 8; i++) p.blotch(Math.floor(hash2(i, 1) * 64), Math.floor(hash2(i, 2) * 64), 6 + Math.floor(hash2(i, 3) * 6), i % 2 ? 0x7e786c : 0x948e82, 0.4);
    for (const y of [3, 60]) for (let x = 2; x < 64; x += 5) { p.px(x, y, 0xb0aa9e); p.px(x + 1, y + 1, 0x5a5448); p.px(x + 1, y, 0x9a9488); }
    for (let i = 0; i < 9; i++) { const x = Math.floor(hash2(i, 11) * 64), y = Math.floor(hash2(i, 12) * 64); p.blotch(x, y, 2, 0x7a4a2a, 0.6); for (let k = 1; k < 6 + hash2(i, 13) * 10; k++) p.px(x, y + k, 0x7a4a2a, 120 - k * 8); }
    p.speckle(0.05, [0x6e685c, 0xa09a8e]);
    return p;
  },
  /** Track ballast. */
  ballast() {
    const p = new Pix(32, 32, 110);
    p.fill(0x6e6a64);
    for (let i = 0; i < 220; i++) { const x = Math.floor(hash2(i, 1) * 32), y = Math.floor(hash2(i, 2) * 32), c = [0x8a867e, 0x5a5650, 0x9a968e, 0x7a7068, 0x4a4640][i % 5]; p.px(x, y, c); p.px(x + 1, y, shadeC(c, 0.85)); p.px(x, y + 1, shadeC(c, 0.75)); }
    return p;
  },
  /** Stucco (モルタル) wall: trowel texture, hairline cracks, rain stains under sills. */
  mortar() {
    const p = new Pix(64, 64, 111);
    p.fill(0xd6cfc0);
    for (let i = 0; i < 10; i++) p.blotch(Math.floor(hash2(i, 1) * 64), Math.floor(hash2(i, 2) * 64), 8, i % 2 ? 0xccc5b6 : 0xdcd6c8, 0.35);
    p.speckle(0.14, [0xc8c1b2, 0xe0dacc, 0xbeb6a6]);
    let x = 12, y = 6; for (let i = 0; i < 30; i++) { p.px(x, y, 0xa49c8c); x += hash2(i, 5) < 0.5 ? 1 : 0; y++; if (hash2(i, 6) < 0.3) x--; }
    for (let i = 0; i < 6; i++) { const sx = Math.floor(hash2(i, 9) * 64); for (let yy = 0; yy < 12 + hash2(i, 10) * 30; yy++) p.px(sx, yy, 0x9a9282, 70); }
    return p;
  },
  /** Small square ceramic floor tiles for the corner shop (64 px/m). */
  shopTile() {
    const p = new Pix(64, 64, 112);
    p.fill(0x9a948a);
    for (let j = 0; j < 64; j += 8) for (let i = 0; i < 64; i += 8) {
      const c = ((i + j) / 8) % 2 ? 0xd8d2c4 : 0xc2baa8;
      p.rect(i + 1, j + 1, 7, 7, shadeC(c, 0.96 + hash2(i, j) * 0.06));
      p.px(i + 1, j + 1, shadeC(c, 1.08));
    }
    p.speckle(0.04, [0x8a847a, 0xb0a898]);
    p.blotch(40, 30, 10, 0x8a8478, 0.25);
    return p;
  },
  // ------------------------------------------------------------ museum floors
  grassFloor() {
    const p = new Pix(32, 32, 71);
    p.fill(0x5fae45);
    p.noise(0.08);
    for (let i = 0; i < 90; i++) { const x = Math.floor(p.r() * 32), y = Math.floor(p.r() * 32); p.px(x, y, 0x7fce5a); p.px(x, y + 1, 0x4a9a38); }
    p.speckle(0.006, [0xffffff, 0xffe066, 0xff9fd0]);
    return p;
  },
  gravel() {
    const p = new Pix(64, 64, 72);
    p.fill(0xd8d2c4);
    p.noise(0.06);
    p.speckle(0.2, [0xc4bdae, 0xe8e2d6, 0xb8b0a0]);
    for (let y = 2; y < 64; y += 5) for (let x = 0; x < 64; x++) { const yy = y + Math.round(Math.sin(x / 6) * 1.2); p.px(x, yy, 0xb8b0a0); p.px(x, yy + 1, 0xece6da); }
    return p;
  },
  marble() {
    const p = new Pix(64, 64, 73);
    p.fill(0xf2efe8);
    p.noise(0.025);
    let x = 5, y = 0;
    for (let i = 0; i < 90; i++) { p.px(x, y, 0xb8b4ac); p.px(x + 1, y, 0xd0ccc4); y++; x += Math.round((p.r() - 0.4) * 2); if (y > 63) { y = 0; x = Math.floor(p.r() * 64); } }
    for (let i = 0; i < 40; i++) { const a = Math.floor(p.r() * 64), b = Math.floor(p.r() * 64); p.line(a, b, a + 6, b + 3, 0xd8d4cc); }
    p.rect(0, 0, 64, 1, 0xc8c4bc); p.rect(0, 0, 1, 64, 0xc8c4bc); p.rect(0, 32, 64, 1, 0xc8c4bc); p.rect(32, 0, 1, 64, 0xc8c4bc);
    return p;
  },
  carpet() {
    const p = new Pix(32, 32, 74);
    p.fill(0x9a1f2a);
    p.noise(0.08);
    for (let y = 0; y < 32; y += 8) for (let x = 0; x < 32; x += 8) { p.px(x + 4, y + 4, 0xd4a83a); p.px(x + 3, y + 4, 0xb8862a); p.px(x + 5, y + 4, 0xb8862a); p.px(x + 4, y + 3, 0xb8862a); p.px(x + 4, y + 5, 0xb8862a); }
    return p;
  },
  candyFloor() {
    const p = new Pix(32, 32, 75);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) p.px(x, y, ((x >> 3) + (y >> 3)) % 2 ? 0xffc8dc : 0xfff4f8);
    p.speckle(0.03, [0xff6f91, 0x5cc4ff, 0xffd23f, 0x58c06c]);
    return p;
  },
  waterFloor() {
    const p = new Pix(32, 32, 76);
    p.fill(0x3a9ad9);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (Math.sin(x / 3 + Math.sin(y / 4) * 2) > 0.85) p.px(x, y, 0x8fd4ff);
    p.rect(0, 0, 32, 1, 0x2a7ab9); p.rect(0, 0, 1, 32, 0x2a7ab9);
    return p;
  },
  spaceFloor() {
    const p = new Pix(64, 64, 77);
    p.fill(0x0f1430);
    p.noise(0.15);
    p.blotch(20, 40, 14, 0x3a1a5a, 0.4);
    p.blotch(48, 14, 10, 0x1a3a6a, 0.4);
    p.speckle(0.02, [0xffffff, 0xbfe0ff, 0xffe8a0]);
    for (const [x, y] of [[10, 10], [50, 44], [30, 58]]) { p.px(x, y, 0xffffff); p.px(x - 1, y, 0x9fb8ff); p.px(x + 1, y, 0x9fb8ff); p.px(x, y - 1, 0x9fb8ff); p.px(x, y + 1, 0x9fb8ff); }
    return p;
  },
  nightFloor() { const p = planks(64, 64, 8, 0x3a2a4a, { seed: 78 }); p.speckle(0.004, [0x9fe8a0]); return p; },
  // ------------------------------------------------------------ museum walls
  woodPanel() {
    const p = new Pix(64, 64, 81);
    for (let x = 0; x < 64; x += 8) {
      const c = shadeC(0xa8784a, 0.9 + hash2(x, 1) * 0.2);
      p.rect(x, 0, 8, 64, c);
      for (let y = 0; y < 64; y += 2) if (p.r() < 0.5) p.px(x + 2 + Math.floor(p.r() * 4), y, shadeC(c, 0.85));
      p.rect(x, 0, 1, 64, shadeC(c, 0.6));
    }
    p.noise(0.03);
    return p;
  },
  shoji() {
    const p = new Pix(64, 64, 82);
    p.fill(0xf6f0e0);
    p.noise(0.02);
    for (let x = 0; x < 64; x += 16) p.rect(x, 0, 2, 64, 0x9a6a3f);
    for (let y = 0; y < 64; y += 21) p.rect(0, y, 64, 2, 0x9a6a3f);
    return p;
  },
  bambooWall() {
    const p = new Pix(64, 64, 83);
    p.fill(0x6a8a3a);
    for (let x = 0; x < 64; x += 6) {
      p.rect(x, 0, 5, 64, 0x9ab85a); p.rect(x, 0, 1, 64, 0xbcd87a); p.rect(x + 4, 0, 1, 64, 0x6a8a3a);
      const off = Math.floor(hash2(x, 2) * 20);
      for (let y = off; y < 64; y += 21) { p.rect(x, y, 5, 1, 0x5a7a2a); p.rect(x, y + 1, 5, 1, 0xc8e08a); }
    }
    return p;
  },
  sakuraWall() {
    const p = new Pix(64, 64, 84);
    p.fill(0xffeef2);
    for (let i = 0; i < 18; i++) {
      const x = Math.floor(hash2(i, 1) * 64), y = Math.floor(hash2(i, 2) * 64);
      p.px(x, y, 0xffc2d4); p.px(x - 1, y, 0xff9fbf); p.px(x + 1, y, 0xff9fbf); p.px(x, y - 1, 0xff9fbf); p.px(x, y + 1, 0xff9fbf); p.px(x, y, 0xffe066);
    }
    p.noise(0.02);
    return p;
  },
  candyStripe() {
    const p = new Pix(32, 32, 85);
    const cols = [0xffc8dc, 0xfff4f8, 0xc8e8ff, 0xfff4f8];
    for (let x = 0; x < 32; x++) p.rect(x, 0, 1, 32, cols[Math.floor(x / 4) % 4]);
    p.speckle(0.01, [0xffffff]);
    return p;
  },
  seaWall() {
    const p = new Pix(64, 64, 86);
    p.gradient(0, 0, 64, 64, 0x6fc8f0, 0x1a5a9a);
    const fish = (x, y, c) => { p.rect(x, y, 4, 2, c); p.px(x + 4, y - 1, c); p.px(x + 4, y + 2, c); p.px(x + 1, y, 0x111111); };
    fish(8, 20, 0xff8c2e); fish(40, 34, 0xffd23f); fish(22, 48, 0xff6f91); fish(50, 12, 0xffffff);
    for (let i = 0; i < 12; i++) p.circle(Math.floor(hash2(i, 3) * 64), Math.floor(hash2(i, 4) * 64), 1, 0xbfe8ff, 160);
    for (let x = 0; x < 64; x += 5) { const h = 6 + Math.floor(hash2(x, 5) * 10); p.rect(x, 64 - h, 2, h, 0x2a8a4a); }
    return p;
  },
  cosmosWall() {
    const p = new Pix(64, 64, 87);
    p.fill(0x0c0f26);
    p.blotch(16, 20, 16, 0x3a1a6a, 0.45);
    p.blotch(48, 44, 14, 0x1a3a7a, 0.45);
    p.speckle(0.02, [0xffffff, 0xbfe0ff]);
    p.circle(44, 18, 6, 0xe8a85a); p.line(34, 20, 54, 16, 0xf8d8a0);
    p.circle(14, 50, 3, 0x7ad8ff);
    return p;
  },
  neonWall() {
    const p = new Pix(64, 64, 88);
    p.gradient(0, 0, 64, 40, 0x1a1040, 0x5a2a6a);
    p.rect(0, 40, 64, 24, 0x140c24);
    for (let x = 0; x < 64; x += 9) {
      const h = 14 + Math.floor(hash2(x, 6) * 22);
      p.rect(x, 64 - h, 8, h, 0x22183a);
      for (let wy = 64 - h + 2; wy < 62; wy += 3) for (let wx = x + 1; wx < x + 7; wx += 2) if (hash2(wx, wy) < 0.45) p.px(wx, wy, [0xffd08a, 0xff6fd0, 0x6fd8ff][Math.floor(hash2(wx, wy + 1) * 3)]);
    }
    p.speckle(0.006, [0xffffff], 255, 0, 0, 64, 30);
    return p;
  },
  ghostWall() {
    const p = new Pix(64, 64, 89);
    p.fill(0x3a2a52);
    p.noise(0.05);
    const ghost = (x, y) => { p.rect(x, y, 6, 6, 0x6a5a8a); p.rect(x + 1, y - 1, 4, 1, 0x6a5a8a); p.px(x + 1, y + 6, 0x6a5a8a); p.px(x + 4, y + 6, 0x6a5a8a); p.px(x + 2, y + 2, 0x221a32); p.px(x + 4, y + 2, 0x221a32); };
    ghost(10, 12); ghost(42, 30); ghost(20, 46); ghost(52, 6);
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

// ---------------------------------------------------------------------- town (unit-mapped: one texture per face)
// Windows, doors, signboards, the commuter train and the distant skyline. townPix(key) -> cached Pix.
const curtainCols = [0xd88a4a, 0x8ab0d8, 0xe0c890, 0xa8c878, 0xe8b088];
function sash(p, mull = true) {
  const { w, h } = p;
  p.frame(0, 0, w, h, 0xc8ccd0); p.frame(1, 1, w - 2, h - 2, 0x7a8086);
  if (mull) { const m = w >> 1; p.rect(m - 1, 1, 2, h - 2, 0xb8bcc0); p.rect(m, 1, 1, h - 2, 0x8a9096); }
  p.rect(2, h - 3, w - 4, 1, 0x9aa0a6);
}
function litGlass(p, k = 0) {
  const { w, h } = p;
  p.gradient(2, 2, w - 4, h - 4, 0xffe8b0, 0xffc070);
  // warm lamp hot-spot near the ceiling
  for (let y = 2; y < h * 0.4; y++) for (let x = 2; x < w - 2; x++) if (Math.abs(x - w / 2) < w * 0.25 - y * 0.3) p.px(x, y, 0xfff4d8, 120);
  const cc = curtainCols[k % curtainCols.length];
  const cw = Math.max(3, Math.round(w * (0.18 + hash2(k, 3) * 0.12)));
  for (const side of [0, 1]) for (let x = 0; x < cw; x++) {
    const X = side ? w - 3 - x : 2 + x;
    const c = shadeC(cc, x % 2 ? 0.8 : 0.95);
    for (let y = 3; y < h - 3; y++) p.px(X, y, c);
  }
  p.rect(2, 2, w - 4, 1, 0x5a4a3a);
  if (hash2(k, 7) < 0.5) { p.rect(Math.round(w * 0.42), 3, Math.max(2, w >> 3), 2, 0x6a4a2a); p.rect(Math.round(w * 0.42), 5, Math.max(2, w >> 3), 1, 0xfffae8); }
  if (hash2(k, 8) < 0.45) { const px0 = Math.round(w * 0.55 + hash2(k, 9) * w * 0.1); p.rect(px0, h - 7, 3, 3, 0x4a7a3a); p.rect(px0 + 1, h - 4, 2, 1, 0x8a5a3a); }
  if (hash2(k, 10) < 0.3) { const hx = Math.round(w * 0.3 + hash2(k, 11) * w * 0.2); p.rect(hx, h - 10, 3, 3, 0x4a3428, 200); p.rect(hx - 1, h - 7, 5, 4, 0x5a4434, 190); }
}
const TOWN = {
  winLit: (p) => { litGlass(p, 0); sash(p); },
  winLit2: (p) => { litGlass(p, 1); sash(p); },
  winLit3: (p) => { litGlass(p, 3); sash(p); },
  winLit4: (p) => { litGlass(p, 4); sash(p); },
  /** Unlit pane reflecting the dusk sky. */
  winDark: (p) => {
    const { w, h } = p;
    p.gradient(2, 2, w - 4, h - 4, 0x9ab4cc, 0x4a5868);
    for (let i = -h; i < w; i += Math.max(9, w >> 1)) for (let k = 0; k < h; k++) { p.px(i + k, h - 1 - k, 0xc8d4dc, 140); p.px(i + k + 1, h - 1 - k, 0xb0c0cc, 80); }
    p.rect(2, 2, 2, h - 4, 0x3a4250); p.rect(w - 4, 2, 2, h - 4, 0x3a4250);
    sash(p);
  },
  /** Frosted wired glass (bathroom), dimly lit. */
  winFrost: (p) => {
    const { w, h } = p;
    p.fill(0xe8dcc0);
    for (let y = 2; y < h; y += 3) for (let x = 2; x < w; x += 3) p.px(x + (y % 2), y, 0xc8bca0);
    p.noise(0.04);
    sash(p, false);
  },
  /** Lit shoji screen behind glass. */
  winShoji: (p) => {
    const { w, h } = p;
    p.fill(0xfff0d0);
    for (let x = 2; x < w; x += 5) p.rect(x, 2, 1, h - 4, 0x8a6a48);
    for (let y = 2; y < h; y += 6) p.rect(2, y, w - 4, 1, 0x8a6a48);
    sash(p);
  },
  /** TV-lit room (cool flicker baked in). */
  winTV: (p) => {
    const { w, h } = p;
    p.gradient(2, 2, w - 4, h - 4, 0x9ab8e8, 0x5a78b8);
    for (let x = 2; x < 2 + w * 0.2; x++) for (let y = 3; y < h - 3; y++) p.px(x, y, x % 2 ? 0x4a5a88 : 0x5a6a98);
    p.rect(2, 2, w - 4, 1, 0x3a3a4a);
    sash(p);
  },
  /** Lace curtain, lit. */
  winLace: (p) => {
    const { w, h } = p;
    p.gradient(2, 2, w - 4, h - 4, 0xfff0d0, 0xf0d0a0);
    for (let y = 3; y < h - 3; y++) for (let x = 3; x < w - 3; x++) if ((x + y * 2) % 5 === 0 || (x * 2 + y) % 7 === 0) p.px(x, y, 0xffffff, 170);
    for (let x = 3; x < w - 3; x += 2) p.px(x, h - 4, 0xffffff);
    sash(p);
  },
  /** Sliding entrance (genkan) doors: lattice over frosted glass, lit from the hall. */
  doorGenkan: (p) => {
    const { w, h } = p;
    p.fill(0x4a3a2a);
    for (const x0 of [2, w >> 1]) {
      const pw = (w >> 1) - 2;
      p.gradient(x0 + 1, 2, pw - 1, h - 4, 0xfff0c8, 0xf0c890);
      for (let y = 4; y < h - 3; y += 4) p.rect(x0 + 1, y, pw - 1, 1, 0x6a5038);
      p.rect(x0 + (pw >> 1), 2, 1, h - 4, 0x6a5038);
      p.frame(x0, 1, pw + 1, h - 2, 0x3a2c20);
    }
    p.rect(0, h - 2, w, 2, 0x9a9088);
  },
  /** Beige steel apartment door with peephole, nameplate and newspaper slot. */
  doorApt: (p) => {
    const { w, h } = p;
    p.fill(0xd8ccb0);
    p.frame(0, 0, w, h, 0x8a8478); p.frame(1, 1, w - 2, h - 2, 0xe6dcc4);
    p.rect(w - 5, Math.round(h * 0.48), 3, 2, 0xc8ccd0); p.px(w - 5, Math.round(h * 0.48) + 2, 0x8a8e90);
    p.px(w >> 1, Math.round(h * 0.28), 0x2a2a2a);
    p.rect(3, Math.round(h * 0.2), 6, 3, 0xfbf8f0); p.rect(4, Math.round(h * 0.2) + 1, 4, 1, 0x5a5a5a);
    p.rect((w >> 1) - 3, Math.round(h * 0.62), 6, 2, 0x8a8478);
    for (let y = h - 6; y < h; y++) for (let x = 1; x < w - 1; x++) if ((x + y) % 2) p.px(x, y, 0xa89c84, 120);
  },
  /** Closed shop's shutter with a faded old sign board above (tobacco shop). */
  oldSign: (p) => {
    const { w, h } = p;
    p.fill(0xe8dcc0);
    p.frame(0, 0, w, h, 0x5a4a3a);
    p.text('TOBACCO', w / 2, 3, { size: 16, color: 0x8a3a2a, align: 'center', font: FONT_DISPLAY });
    p.text('たばこ・塩', w / 2, h - 13, { size: 10, color: 0x3a5a8a, align: 'center' });
    for (let i = 0; i < 12; i++) { const x = Math.floor(hash2(i, 1) * w); for (let y = 0; y < h; y++) if (hash2(x, y + i) < 0.5) p.px(x, y, 0x8a7a60, 60); }
    p.noise(0.06);
  },
  /** GACHA GARAGE lightbox face (lit). */
  gachaSign: (p) => {
    const { w, h } = p;
    p.fill(0xfff4e2);
    // soft fluorescent banding behind the acrylic
    for (const y of [Math.round(h * 0.3), Math.round(h * 0.7)]) for (let x = 0; x < w; x++) p.px(x, y, 0xffffff, 90);
    p.rect(0, 0, w, 5, 0xe5383b); p.rect(0, 5, w, 1, 0xb8282a);
    p.rect(0, h - 11, w, 11, 0x2a5ab0); p.rect(0, h - 12, w, 1, 0x1a3a80);
    p.text('CAPSULE TOYS  ·  ガチャガチャ  ·  TOYS & CHARMS', w / 2, h - 10, { size: 8, color: 0xffffff, align: 'center', font: FONT_EN });
    const cap = (cx, cy, r, top) => {
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
        const d = x * x + y * y;
        if (d > r * r + r) continue;
        let c = y < 0 ? top : 0xffffff;
        if (d > (r - 1.5) * (r - 1.5)) c = 0x2a1a1a;
        else if (y === 0 || y === 1) c = shadeC(top, 0.7);
        p.px(cx + x, cy + y, c);
      }
      p.rect(cx - Math.round(r * 0.5), cy - Math.round(r * 0.55), 3, 2, 0xffffff);
    };
    cap(22, Math.round(h * 0.45), 13, 0xff6f91);
    cap(w - 22, Math.round(h * 0.45), 13, 0x5cc4ff);
    const ty = 6, size = Math.round(h * 0.72);
    p.text('GACHA GARAGE', w / 2 + 2, ty + 2, { size, color: 0x3a1a1a, align: 'center', font: FONT_DISPLAY });
    p.text('GACHA GARAGE', w / 2, ty, { size, color: 0xe5383b, align: 'center', font: FONT_DISPLAY, outline: 0x3a1a1a });
    // highlight stripe on the letters
    for (let x = 40; x < w - 40; x++) for (let y = ty + 4; y < ty + 7; y++) { const [r, g, b] = p.get(x, y); if (r > 200 && g < 90) p.px(x, y, 0xff7a6a); }
  },
  /** The same face, unlit, sun-faded and dusty (abandoned shop). */
  gachaSignDusty: (p) => {
    TOWN.gachaSign(p);
    const { w, h } = p;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const [r, g, b] = p.get(x, y);
      const l = r * 0.3 + g * 0.59 + b * 0.11;
      const k = 0.55;
      p.px(x, y, [(r * (1 - k) + l * k) * 0.72 + 18, (g * (1 - k) + l * k) * 0.7 + 14, (b * (1 - k) + l * k) * 0.66 + 8]);
    }
    for (let i = 0; i < 40; i++) { const x = Math.floor(hash2(i, 3) * w); const len = 6 + hash2(i, 4) * h; for (let y = 0; y < len; y++) p.px(x, y, 0x4a3e30, 90 * (1 - y / len)); }
    p.speckle(0.08, [0x8a7e68, 0x6a6050, 0xa89c84], 140);
    for (let i = 0; i < 9; i++) p.line(w - 1, 0, w - 1 - 14 + i * 1.6, 12 - Math.abs(i - 4) * 1.5, 0xd8d0c0, 110);
    for (let i = 0; i < 6; i++) p.line(0, h - 1 - i * 2, 10 - i, h - 1, 0xd8d0c0, 90);
  },
  /** Projecting side sign (袖看板), both faces. */
  sodeSign: (p) => {
    const { w, h } = p;
    p.fill(0xe5383b);
    p.frame(0, 0, w, h, 0x3a1a1a); p.frame(1, 1, w - 2, h - 2, 0xfff4e2);
    p.circle(w >> 1, 9, 6, 0xffffff); for (let x = -6; x <= 6; x++) for (let y = -6; y <= 0; y++) if (x * x + y * y <= 40) p.px((w >> 1) + x, 9 + y, 0xffd23f);
    p.rect((w >> 1) - 6, 9, 13, 1, 0x3a1a1a);
    [...'GACHA'].forEach((ch, i) => p.text(ch, w >> 1, 19 + i * 11, { size: 14, color: 0xfff4e2, align: 'center', font: FONT_DISPLAY, outline: 0x7a1010 }));
  },
  /** Blocky paper lantern panel. */
  lantern: (p) => {
    const { w, h } = p;
    p.fill(0xd8302a);
    for (let y = 1; y < h; y += 3) p.rect(0, y, w, 1, 0xb02420);
    for (let x = 0; x < w; x++) { p.px(x, 0, 0x8a1a16); p.px(x, h - 1, 0x8a1a16); }
    p.rect((w >> 1) - 4, (h >> 1) - 5, 8, 9, 0xfff0d8);
    p.text('ガ', w >> 1, (h >> 1) - 6, { size: 9, color: 0x1a1414, align: 'center' });
  },
  /** のぼり flag: OPEN. */
  nobori: (p) => {
    const { w, h } = p;
    p.fill(0xfbf8f0);
    p.rect(0, 0, w, 5, 0xe5383b); p.rect(w - 3, 0, 3, h, 0xe5383b);
    [...'OPEN'].forEach((ch, i) => p.text(ch, (w - 3) >> 1, 7 + i * 13, { size: 16, color: 0xe5383b, align: 'center', font: FONT_DISPLAY }));
    p.text('営', (w - 3) >> 1, 61, { size: 10, color: 0x2a5ab0, align: 'center' });
    p.text('業', (w - 3) >> 1, 72, { size: 10, color: 0x2a5ab0, align: 'center' });
    p.noise(0.03);
  },
  /** Hanging OPEN plate. */
  openPlate: (p) => {
    const { w, h } = p;
    p.fill(0x2a6a3a); p.frame(0, 0, w, h, 0x1a3a22); p.frame(1, 1, w - 2, h - 2, 0xf4ecd8);
    p.text('OPEN', w / 2, 2, { size: 12, color: 0xfff4e2, align: 'center', font: FONT_DISPLAY });
  },
  /** Corner shop signboard. */
  mikawaya: (p) => {
    const { w, h } = p;
    p.fill(0x1f5a3a);
    p.frame(0, 0, w, h, 0x0f2a1c); p.frame(2, 2, w - 4, h - 4, 0xf4ecd8);
    p.circle(20, h >> 1, 12, 0xe5383b); p.circle(20, h >> 1, 9, 0xfbf8f0);
    p.text('三', 20, (h >> 1) - 8, { size: 14, color: 0xe5383b, align: 'center' });
    p.text('MIKAWA-YA', w / 2 + 8, 2, { size: Math.round(h * 0.62), color: 0xfbf4e2, align: 'center', font: FONT_DISPLAY, shadow: 0x0a1a10 });
    p.text('GENERAL STORE  ·  SAKE & GROCERIES', w / 2 + 8, h - 12, { size: 8, color: 0xffd23f, align: 'center', font: FONT_EN });
    p.text('三河屋', w - 22, h - 15, { size: 10, color: 0xfbf4e2, align: 'center' });
  },
  /** Round height-limit sign (cut-out). */
  clearance: (p) => {
    const { w } = p;
    const c = w / 2 - 0.5, r = w / 2 - 0.5;
    for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) { const d = Math.hypot(x - c, y - c); if (d <= r) p.px(x, y, d > r - 3.2 ? 0xd8282a : 0xfbf8f0); }
    p.text('3.4m', c + 0.5, c - 5, { size: 9, color: 0x1a1a1a, align: 'center', font: FONT_EN });
    for (let k = 0; k < 3; k++) { p.rect(c - 2 + k, 6 + k, 5 - 2 * k, 1, 0x1a1a1a); p.rect(c - 2 + k, w - 7 - k, 5 - 2 * k, 1, 0x1a1a1a); }
  },
  /** Supplementary plate under the round sign. */
  clearancePlate: (p) => {
    const { w, h } = p;
    p.fill(0xfbf8f0); p.frame(0, 0, w, h, 0x1a3a8a);
    p.text('高さ制限 3.4m', w / 2, 1, { size: 9, color: 0x1a3a8a, align: 'center' });
    p.text('HEIGHT LIMIT 3.4 m', w / 2, h - 9, { size: 8, color: 0x1a1a1a, align: 'center', font: FONT_EN });
  },
  /** Road text decal: 止まれ (white on transparent). */
  tomare: (p) => {
    const { w, h } = p;
    p.text('止まれ', w / 2, -1, { size: h - 2, color: 0xeeeae0, align: 'center' });
    for (let i = 0; i < w * h * 0.08; i++) { const x = Math.floor(p.r() * w), y = Math.floor(p.r() * h); const [r] = p.get(x, y); if (r > 200) p.px(x, y, 0xb8b4a8); }
  },
  /** Road text decal: 30 (speed limit). */
  speed30: (p) => {
    const { w, h } = p;
    p.text('30', w / 2, -2, { size: h + 2, color: 0xeeeae0, align: 'center', font: FONT_DISPLAY });
  },
  /** Yellow/black hazard stripes. */
  hazard: (p) => {
    const { w, h } = p;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) p.px(x, y, ((x + y) >> 2) % 2 ? 0x1a1a1a : 0xf2c41a);
    p.noise(0.08);
  },
  /** Enamel plate naming the underpass. */
  underpassName: (p) => {
    const { w, h } = p;
    p.fill(0x1a3a8a); p.frame(0, 0, w, h, 0xfbf8f0);
    p.text('上山ガード', w / 2, 1, { size: 10, color: 0xfbf8f0, align: 'center' });
    p.text('KAMIYAMA UNDERPASS', w / 2, h - 9, { size: 8, color: 0xfbf8f0, align: 'center', font: FONT_EN });
  },
  /** Apartment name plate. */
  aptName: (p) => {
    const { w, h } = p;
    p.fill(0xf4ecd8); p.frame(0, 0, w, h, 0x8a6a4a);
    p.text('SAKURA HEIGHTS', w / 2, 2, { size: 8, color: 0x8a3a5a, align: 'center', font: FONT_EN });
    p.text('さくら荘', w / 2, h - 11, { size: 9, color: 0x3a2a1a, align: 'center' });
  },
  /** Commuter car side (14 m × 3.25 m): ribbed stainless, coloured stripe, four doors. */
  trainSide: (p) => trainSide(p, false),
  trainSideE: (p) => trainSide(p, true),
  trainFront: (p) => trainFront(p, false),
  trainFrontE: (p) => trainFront(p, true),
  /** Distant mid-rise facade with a window grid (map + lit-window mask). */
  skyline: (p) => skyline(p, false),
  skylineE: (p) => skyline(p, true),
};
const TRAIN_DOORS = [0.11, 0.37, 0.63, 0.89];
function trainSide(p, emissive) {
  const { w, h } = p;
  const lit = (x, y, c) => p.px(x, y, emissive ? c : shadeC(c, 0.92));
  p.fill(emissive ? 0x000000 : 0xc4c8cc);
  if (!emissive) {
    for (let x = 0; x < w; x += 64) p.rect(x, 6, 1, h - 12, 0x9aa0a6);
    for (let y = 70; y < h - 8; y += 3) p.rect(0, y, w, 1, 0xaeb4b8);
    p.rect(0, 0, w, 6, 0x8a9096); p.rect(0, 6, w, 1, 0x6a7076);
    p.rect(0, h - 8, w, 8, 0x3a3e42);
    p.rect(0, 18, w, 3, 0x2fae5a); p.rect(0, 60, w, 7, 0x2fae5a); p.rect(0, 67, w, 1, 0x1a7a3a);
  }
  const doorW = 40;
  const doorX = TRAIN_DOORS.map((f) => Math.round(f * w - doorW / 2));
  // windows between the doors (paired panes)
  for (let i = 0; i < doorX.length - 1; i++) {
    const a = doorX[i] + doorW + 8, b = doorX[i + 1] - 8;
    const n = Math.max(1, Math.round((b - a) / 34));
    const pw = Math.floor((b - a - (n - 1) * 4) / n);
    for (let k = 0; k < n; k++) {
      const x0 = a + k * (pw + 4);
      if (!emissive) p.rect(x0 - 1, 25, pw + 2, 30, 0x4a4e52);
      for (let y = 26; y < 54; y++) for (let x = x0; x < x0 + pw; x++) {
        let c = y < 29 ? 0xffffff : 0xfff2d8;
        if (y > 44) c = 0xd8c8a8;
        if ((x - x0) % 9 === 4 && y > 30 && y < 34) c = 0x6a6a6a;
        if (hash2(x >> 2, i * 5 + k) < 0.25 && y > 38 && y < 45 && (x % 4) < 3) c = 0x3a3028;
        lit(x, y, c);
      }
      if (!emissive) p.rect(x0 + (pw >> 1), 26, 1, 28, 0x6a6e72);
    }
  }
  // end windows beside the cab ends
  for (const x0 of [6, w - 26]) { if (!emissive) p.rect(x0 - 1, 25, 22, 30, 0x4a4e52); for (let y = 26; y < 54; y++) for (let x = x0; x < x0 + 20; x++) lit(x, y, y > 44 ? 0xd8c8a8 : 0xfff2d8); }
  // doors with tall windows
  for (const x0 of doorX) {
    if (!emissive) { p.rect(x0, 14, doorW, h - 22, 0xb8bcc0); p.frame(x0, 14, doorW, h - 22, 0x5a5e62); p.rect(x0 + doorW / 2, 14, 1, h - 22, 0x5a5e62); p.rect(x0, 18, doorW, 3, 0x2fae5a); }
    for (const dx of [4, doorW / 2 + 4]) for (let y = 24; y < 58; y++) for (let x = x0 + dx; x < x0 + dx + doorW / 2 - 8; x++) lit(x, y, y > 50 ? 0xd8c8a8 : 0xfff0d0);
  }
}
function trainFront(p, emissive) {
  const { w, h } = p;
  p.fill(emissive ? 0x000000 : 0xc4c8cc);
  if (!emissive) {
    p.rect(0, 0, w, 6, 0x8a9096);
    p.rect(0, 58, w, 9, 0x2fae5a);
    p.rect(0, h - 8, w, 8, 0x3a3e42);
    p.rect(6, 20, w - 12, 34, 0x1a1e22);
    p.rect(w / 2 - 1, 20, 2, 34, 0x8a9096);
    p.rect(w / 2 - 12, 82, 24, 8, 0x2a2a2a);
  }
  // destination LED + cab glow + headlights
  for (let y = 9; y < 17; y++) for (let x = w / 2 - 22; x < w / 2 + 22; x++) p.px(x, y, emissive ? 0xff9a2a : 0x2a1a0a);
  p.text('LOCAL', w / 2, 8, { size: 8, color: emissive ? 0xffd090 : 0xff9a2a, align: 'center', font: FONT_EN });
  for (const x0 of [8, w - 20]) for (let y = 70; y < 76; y++) for (let x = x0; x < x0 + 12; x++) p.px(x, y, emissive ? 0xffffff : 0xf8f4e8);
  if (emissive) for (let y = 22; y < 52; y++) for (let x = 8; x < w - 8; x++) if (y > 40) p.px(x, y, 0x3a3020);
}
function skyline(p, emissive) {
  const { w, h } = p;
  p.fill(emissive ? 0x000000 : 0x7a8698);
  if (!emissive) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (hash2(x >> 3, y >> 2) < 0.15) p.px(x, y, 0x728090);
  for (let y = 5; y < h - 2; y += 5) for (let x = 3; x < w - 2; x += 4) {
    const k = hash2(x * 3 + p.w, y * 7 + h);
    const on = k < 0.06;
    if (emissive && !on) continue;
    p.rect(x, y, 2, 2, on ? 0xc8b890 : 0x6c7888);
  }
  if (!emissive) { p.rect(0, 0, w, 2, 0x66727f); for (let x = 0; x < w; x += 16) p.rect(x, 0, 1, h, 0x6e7a88); }
}

const townCache = new Map();
/** Cached Pix for a town texture key at the given pixel size. */
export function townPix(key, w, h) {
  const ck = key + w + 'x' + h;
  if (!townCache.has(ck)) {
    const p = new Pix(w, h, 7 + w);
    TOWN[key](p);
    townCache.set(ck, p);
  }
  return townCache.get(ck);
}

export { Pix, FONT_JP, FONT_EN };
