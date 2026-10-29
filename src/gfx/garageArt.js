// Pixel-art atlases for the garage interior detail pass (src/world/GarageDetail.js):
//   decalAtlas()  alpha-tested grime: oil stains, tyre tracks, water stains, cracks, scuffs, paint, hazard tape,
//                 dust and wall-foot grime (painted in light neutrals and tinted per placement by vertex colour).
//   cardAtlas()   little handwritten shop cards, signs, kids' drawings, a clock face and a tear-off calendar.
//                 Japanese uses tiny hand-made glyphs and Latin the 5 x 7 bitmap font, so nothing depends on a
//                 web font being loaded.
// Each atlas returns { tex, size: [w, h], rect(name) -> [u0, v0, u1, v1] } (UVs with v up, three.js style).
import * as THREE from 'three';
import { Pix } from './pix.js';
import { hash2 } from '../core/util.js';
import { mask5, textW5 } from './font5x7.js';

const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bayer = (x, y) => (B4[((y & 3) << 2) + (x & 3)] + 0.5) / 16;
const sh = (c, f) => {
  const r = Math.min(255, ((c >> 16) & 255) * f), g = Math.min(255, ((c >> 8) & 255) * f), b = Math.min(255, (c & 255) * f);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
};
const mixC = (a, b, t) => {
  const ch = (h, s) => (h >> s) & 255;
  return (Math.round(ch(a, 16) + (ch(b, 16) - ch(a, 16)) * t) << 16) | (Math.round(ch(a, 8) + (ch(b, 8) - ch(a, 8)) * t) << 8) | Math.round(ch(a, 0) + (ch(b, 0) - ch(a, 0)) * t);
};
/** Smooth 2D value noise in [0,1). */
function vn(x, y, sc = 8, s = 0) {
  const fx = x / sc + 0.37, fy = y / sc + 0.53;
  const ix = Math.floor(fx), iy = Math.floor(fy);
  const sm = (t) => t * t * (3 - 2 * t);
  const ux = sm(fx - ix), uy = sm(fy - iy);
  const h = (a, b) => hash2(a * 7 + s * 131, b * 13 + s * 71);
  return (h(ix, iy) * (1 - ux) + h(ix + 1, iy) * ux) * (1 - uy) + (h(ix, iy + 1) * (1 - ux) + h(ix + 1, iy + 1) * ux) * uy;
}

class Atlas {
  constructor(w, h, seed) { this.p = new Pix(w, h, seed); this.rects = {}; this.w = w; this.h = h; }
  cell(name, x, y, w, h, fn) { this.rects[name] = [x, y, w, h]; fn(x, y, w, h); }
  done() {
    const tex = this.p.texture();
    tex.generateMipmaps = true;
    const { w, h, rects } = this;
    return {
      tex, size: [w, h],
      /** [u0, v0, u1, v1]; half-pixel inset so neighbouring cells never bleed in. */
      rect: (n) => { const r = rects[n]; if (!r) return [0, 0, 1, 1]; return [(r[0] + 0.5) / w, 1 - (r[1] + r[3] - 0.5) / h, (r[0] + r[2] - 0.5) / w, 1 - (r[1] + 0.5) / h]; },
      px: (n) => rects[n],
    };
  }
}

// ---------------------------------------------------------------------------------------------- decals
let DECALS = null;
export function decalAtlas() {
  if (DECALS) return DECALS;
  const A = new Atlas(512, 512, 77), p = A.p;
  const put = (x, y, c) => p.px(x, y, c);

  /** Lobed blob: inside where noise-warped radius < R. layers: [[rFrac, colour], ...] from outside in. */
  const blob = (x0, y0, w, h, s, layers, { lobes = 5, warp = 0.28, dither = true } = {}) => {
    const cx = x0 + w / 2, cy = y0 + h / 2, rx = w / 2 - 2, ry = h / 2 - 2;
    const ph = [hash2(s, 1) * 6.28, hash2(s, 2) * 6.28, hash2(s, 3) * 6.28];
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry, a = Math.atan2(dy, dx);
      const R = 1 - warp * (0.5 + 0.5 * Math.sin(a * lobes + ph[0])) * 0.6 - warp * 0.4 * (0.5 + 0.5 * Math.sin(a * (lobes + 3) + ph[1])) - (vn(x, y, 5, s) - 0.5) * warp;
      const d = Math.hypot(dx, dy) / Math.max(0.2, R);
      for (const [rf, c] of layers) {
        const edge = dither ? (d - rf) * 10 : -1;
        if (d < rf && (edge < -1 || edge < bayer(x, y) - 1)) { put(x, y, c); }
      }
    }
  };

  // big oil stain under where Grandpa's car used to stand: soft outer halo, darker core, drip satellites
  A.cell('oilBig', 0, 0, 128, 96, (x0, y0, w, h) => {
    blob(x0, y0, w, h, 3, [[1.0, 0xb4aea4], [0.82, 0x948e84], [0.55, 0x77716a], [0.3, 0x5c5752]], { lobes: 4, warp: 0.34 });
    for (let i = 0; i < 9; i++) {
      const a = hash2(i, 31) * 6.28, r = 0.62 + hash2(i, 32) * 0.3;
      const x = Math.round(x0 + w / 2 + Math.cos(a) * r * w / 2), y = Math.round(y0 + h / 2 + Math.sin(a) * r * h / 2);
      const rr = 1 + Math.floor(hash2(i, 33) * 3);
      for (let yy = -rr; yy <= rr; yy++) for (let xx = -rr; xx <= rr; xx++) if (xx * xx + yy * yy <= rr * rr + 1) put(x + xx, y + yy, rr > 2 ? 0x77716a : 0x948e84);
    }
  });
  A.cell('oilSmall', 128, 0, 64, 48, (x0, y0, w, h) => blob(x0, y0, w, h, 5, [[1.0, 0xa8a298], [0.65, 0x807a72], [0.32, 0x625d58]], { lobes: 3, warp: 0.3 }));
  A.cell('oilDrips', 192, 0, 32, 32, (x0, y0) => {
    for (let i = 0; i < 7; i++) {
      const x = x0 + 4 + Math.floor(hash2(i, 41) * 24), y = y0 + 4 + Math.floor(hash2(i, 42) * 24), r = hash2(i, 43) < 0.4 ? 2 : 1;
      for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) if (xx * xx + yy * yy <= r * r + 0.5) put(x + xx, y + yy, r > 1 ? 0x6e6862 : 0x88827a);
    }
  });
  // tyre track: a worn band with tread blocks, broken where the rubber didn't take
  A.cell('tyre', 224, 0, 16, 160, (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0 + 2; x < x0 + w - 2; x++) {
      const along = (y - y0) / h, fade = Math.sin(along * Math.PI);
      const tread = ((y >> 1) + (x - x0 > 7 ? 1 : 0)) % 3 !== 0;
      const n = vn(x, y, 6, 9);
      if (n * fade > 0.28 + bayer(x, y) * 0.3) put(x, y, tread ? 0x8a867e : 0x9c978e);
    }
  });
  // water stain running down a wall from the top: tide lines and a darker damp body
  A.cell('wallWater', 256, 0, 96, 128, (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const u = (x - x0) / w - 0.5, t = (y - y0) / h;
      const width = 0.48 - t * 0.32 + (vn(x, y, 10, 4) - 0.5) * 0.18;
      const d = Math.abs(u) / Math.max(0.02, width);
      if (d > 1 || t > 0.95) continue;
      const tide = Math.abs(d - 0.92) < 0.06 || (Math.abs(d - 0.7) < 0.035 && t < 0.7);
      const runs = Math.abs(Math.sin(u * 37 + Math.floor(t * 3))) > 0.94 && t > 0.3;
      if (tide) put(x, y, 0x9a8e7c);
      else if (runs) put(x, y, 0xa89e8e);
      else if (bayer(x, y) < (1 - t) * 0.55 + 0.1) put(x, y, 0xbcb4a6);
    }
  });
  A.cell('rust', 352, 0, 24, 128, (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++) {
      const t = (y - y0) / h, hw = Math.max(0.6, (1 - t) * 4 + Math.sin(y * 0.3) * 0.6);
      const cx = x0 + w / 2 + Math.sin(y * 0.07) * 1.5;
      for (let x = x0; x < x0 + w; x++) {
        const d = Math.abs(x - cx) / hw;
        if (d < 1 && bayer(x, y) < 1.05 - t * 0.8 - d * 0.3) put(x, y, d < 0.4 ? 0x9a5a34 : 0xb47a52);
      }
    }
  });
  // ring-shaped leak stain on the ceiling board
  A.cell('ceilStain', 384, 0, 128, 96, (x0, y0, w, h) => {
    blob(x0, y0, w, h, 11, [[1.0, 0x9a8a72], [0.94, 0xc2b6a2], [0.66, 0xa49480], [0.6, 0xc8bca8], [0.3, 0xb0a28c]], { lobes: 6, warp: 0.3 });
  });
  A.cell('ceilStain2', 400, 288, 112, 80, (x0, y0, w, h) => {
    blob(x0, y0, w, h, 13, [[1.0, 0x9a8a72], [0.92, 0xc4b8a4], [0.5, 0xa49480], [0.44, 0xc8bca8]], { lobes: 5, warp: 0.36 });
  });
  // hairline crack network with a chipped branch
  A.cell('crack', 0, 96, 128, 64, (x0, y0, w, h) => {
    const walk = (x, y, dx, dy, n, s) => {
      for (let i = 0; i < n; i++) {
        put(Math.round(x), Math.round(y), 0x5e5a54);
        if (hash2(i, s) < 0.1) put(Math.round(x), Math.round(y) + 1, 0x77726a);
        x += dx + (hash2(i, s + 1) - 0.5) * 1.4; y += dy + (hash2(i, s + 2) - 0.5) * 1.4;
        if (x < x0 + 1 || x > x0 + w - 2 || y < y0 + 1 || y > y0 + h - 2) break;
      }
    };
    walk(x0 + 2, y0 + 30, 1, 0.12, 120, 5);
    walk(x0 + 46, y0 + 35, 0.5, 0.8, 30, 6);
    walk(x0 + 80, y0 + 40, 0.7, -0.75, 34, 7);
    walk(x0 + 20, y0 + 32, 0.3, -0.9, 20, 8);
  });
  A.cell('scuffs', 128, 48, 96, 48, (x0, y0, w, h) => {
    for (let i = 0; i < 26; i++) {
      const x = x0 + 4 + hash2(i, 51) * (w - 20), y = y0 + 4 + hash2(i, 52) * (h - 8), a = (hash2(i, 53) - 0.5) * 0.9, len = 4 + hash2(i, 54) * 12;
      for (let k = 0; k < len; k++) put(Math.round(x + Math.cos(a) * k), Math.round(y + Math.sin(a) * k), hash2(i, 55) < 0.5 ? 0x77736c : 0x8a857c);
    }
  });
  // spilt paint: a blue puddle and white drips
  A.cell('paintBlue', 384, 96, 64, 64, (x0, y0, w, h) => {
    blob(x0 + 8, y0 + 8, 44, 40, 21, [[1.0, 0x4a7ab0], [0.6, 0x3a6aa0]], { lobes: 5, warp: 0.4, dither: false });
    for (let i = 0; i < 12; i++) { const x = x0 + Math.floor(hash2(i, 61) * 60), y = y0 + Math.floor(hash2(i, 62) * 60); put(x, y, 0x4a7ab0); if (i % 3 === 0) put(x + 1, y, 0x4a7ab0); }
  });
  A.cell('paintWhite', 448, 96, 64, 64, (x0, y0, w, h) => {
    for (let i = 0; i < 18; i++) {
      const x = x0 + 4 + Math.floor(hash2(i, 71) * 56), y = y0 + 4 + Math.floor(hash2(i, 72) * 56), r = hash2(i, 73) < 0.3 ? 2 : 1;
      for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) if (xx * xx + yy * yy <= r * r) put(x + xx, y + yy, 0xeeeae2);
    }
    blob(x0 + 20, y0 + 20, 24, 20, 23, [[1.0, 0xeeeae2]], { lobes: 4, warp: 0.4, dither: false });
  });
  // worn yellow/black hazard stripes and a worn yellow line
  A.cell('hazard', 0, 160, 256, 16, (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const band = Math.floor(((x - x0) + (y - y0)) / 12) % 2;
      const wear = vn(x, y, 4, 33) + (y === y0 || y === y0 + h - 1 ? 0.2 : 0);
      if (wear > 0.72) continue;
      put(x, y, band ? 0x2a2826 : (wear > 0.6 ? 0xc8a838 : 0xe8c43a));
    }
  });
  A.cell('yline', 0, 176, 256, 8, (x0, y0, w, h) => {
    for (let y = y0 + 1; y < y0 + h - 1; y++) for (let x = x0; x < x0 + w; x++) {
      const wear = vn(x, y, 5, 41);
      if (wear > 0.68 || (wear > 0.6 && bayer(x, y) > 0.5)) continue;
      put(x, y, wear > 0.5 ? 0xd8c890 : 0xf0d860);
    }
  });
  // dithered grime band rising from the floor (tileable across): wall feet
  A.cell('grime', 0, 192, 128, 48, (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const t = 1 - (y - y0) / h; // 1 at the floor (bottom row)
      const n = vn(x - x0, y, 9, 51) * 0.35 + vn(x - x0, y, 3, 52) * 0.15;
      const k = t * t * 0.95 + n * t - 0.12;
      if (k > bayer(x, y)) put(x, y, t > 0.8 && hash2(x, y) < 0.5 ? 0x8e8a82 : 0xa29e96);
    }
    // splash specks
    for (let i = 0; i < 70; i++) put(x0 + Math.floor(hash2(i, 53) * w), y0 + h - 1 - Math.floor(Math.pow(hash2(i, 54), 2) * h * 0.8), 0x8a867e);
  });
  // dust drifted against the wall foot on the floor (tileable across; the wall side is the top row)
  A.cell('dustEdge', 128, 192, 128, 48, (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const t = 1 - (y - y0) / h; // 1 at the wall
      const n = vn(x - x0, y, 7, 61) * 0.5;
      if (t * t * 0.9 + n * t - 0.15 > bayer(x, y)) put(x, y, hash2(x, y + 3) < 0.15 ? 0xd0c8b8 : 0xc0b8aa);
    }
    for (let i = 0; i < 30; i++) put(x0 + Math.floor(hash2(i, 63) * w), y0 + Math.floor(hash2(i, 64) * h * 0.7), 0x6a645c);
  });
  // dusty shoe prints
  A.cell('prints', 256, 160, 64, 128, (x0, y0, w, h) => {
    const shoe = (cx, cy, flip, s) => {
      for (let y = -9; y <= 9; y++) for (let x = -4; x <= 4; x++) {
        const heel = y > 4, ok = heel ? (x * x) / 12 + ((y - 7) * (y - 7)) / 6 < 1 : (x * x) / 16 + ((y + 1) * (y + 1)) / 36 < 1;
        if (ok && !(y === 4 || y === 3) && ((x + y) % 2 === 0 || hash2(x + s, y) < 0.4) && hash2(x + s * 3, y + s) < 0.75) put(cx + (flip ? -x : x), cy + y, 0xc4bcb0);
      }
    };
    shoe(x0 + 20, y0 + 16, false, 1); shoe(x0 + 40, y0 + 44, true, 2); shoe(x0 + 22, y0 + 74, false, 3); shoe(x0 + 42, y0 + 104, true, 4);
  });
  // steel grating for the trench drain (opaque)
  A.cell('grate', 320, 160, 128, 24, (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const edge = y === y0 || y === y0 + h - 1 || y === y0 + 1 || y === y0 + h - 2;
      const bar = (x - x0) % 4 === 0;
      const cross = (y - y0) % 12 === 6;
      let c = 0x1c1a18;
      if (edge) c = y === y0 || y === y0 + h - 1 ? 0x5e5a54 : 0x7a766e;
      else if (bar || cross) c = (x + y) % 7 === 0 ? 0x6a4a32 : 0x6e6a64;
      if (!edge && (bar || cross) && vn(x, y, 6, 71) > 0.62) c = 0x8a5a36; // rust
      put(x, y, c);
    }
  });
  // grime around a switch / door handle
  A.cell('smudge', 448, 160, 32, 32, (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const d = Math.hypot(x - x0 - 16, (y - y0 - 16) * 0.8) / 15;
      if (d < 1 && (1 - d) * 0.9 + vn(x, y, 3, 81) * 0.3 - 0.25 > bayer(x, y)) put(x, y, 0xa29e96);
    }
  });
  // dusty patch / swept arc
  A.cell('dust', 256, 288, 96, 96, (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const d = Math.hypot(x - x0 - w / 2, y - y0 - h / 2) / (w / 2);
      if (d < 1 && (1 - d) * 0.8 + vn(x, y, 6, 91) * 0.5 - 0.42 > bayer(x, y)) put(x, y, hash2(x, y) < 0.1 ? 0x8a847a : 0xc2baac);
    }
  });
  // rusty can rings left on the floor
  A.cell('rings', 352, 288, 48, 48, (x0, y0) => {
    for (const [cx, cy, r] of [[16, 18, 9], [31, 30, 8], [22, 36, 6]]) for (let a = 0; a < 6.28; a += 0.04) {
      if (hash2(Math.round(a * 30), r) < 0.18) continue;
      put(Math.round(x0 + cx + Math.cos(a) * r), Math.round(y0 + cy + Math.sin(a) * r), 0x8a6a4a);
    }
  });
  // cracked, patched mortar repair (opaque-ish lighter patch)
  A.cell('patch', 0, 240, 96, 64, (x0, y0, w, h) => {
    blob(x0, y0, w, h, 101, [[1.0, 0xb8b2a6], [0.94, 0xaaa498]], { lobes: 3, warp: 0.25 });
    for (let i = 0; i < 40; i++) put(x0 + 10 + Math.floor(hash2(i, 103) * 76), y0 + 8 + Math.floor(hash2(i, 104) * 48), 0x9c968a);
  });
  // wet, darker concrete by the drain and the sink
  A.cell('damp', 96, 240, 96, 64, (x0, y0, w, h) => blob(x0, y0, w, h, 111, [[1.0, 0x9a9488], [0.6, 0x8c867a]], { lobes: 5, warp: 0.3 }));
  DECALS = A.done();
  return DECALS;
}

// ---------------------------------------------------------------------------------------------- glyphs
// 7-row hand-drawn kana/kanji for in-world cards (rows top to bottom; '#' = ink).
const JP = {
  '回': ['#######', '#.....#', '#.###.#', '#.#.#.#', '#.###.#', '#.....#', '#######'],
  '円': ['#######', '#..#..#', '#..#..#', '#######', '#.....#', '#.....#', '#....##'],
  'カ': ['..#....', '#######', '..#...#', '..#...#', '.#....#', '.#....#', '#...##.'],
  'プ': ['.....#.#', '######.#', '.....#..', '....#...', '...#....', '..#.....', '##......'],
  'セ': ['.#.....', '.#..###', '######.', '.#...#.', '.#..#..', '.#.....', '..####.'],
  'ル': ['.#..#..', '.#..#..', '.#..#..', '.#..#..', '.#..#.#', '#...##.', '#...#..'],
  'は': ['#..#...', '#.#####', '#..#...', '#..#...', '#.###..', '#.#.#..', '#..###.'],
  'こ': ['.......', '.#####.', '.......', '.......', '.......', '#......', '.######'],
  'へ': ['.......', '.......', '..#....', '.#.#...', '#...#..', '.....#.', '......#'],
  '安': ['...#...', '#######', '#..#..#', '..#....', '#######', '.#..#..', '#..#.##'],
  '全': ['...#...', '..#.#..', '.#...#.', '#######', '...#...', '.#####.', '#######'],
  '第': ['#.#.#.#', '.#...#.', '#######', '...#..#', '#######', '.#.#...', '#..#.##'],
  '一': ['.......', '.......', '.......', '#######', '.......', '.......', '.......'],
  '火': ['...#...', '#..#..#', '.#.#.#.', '...#...', '..#.#..', '.#...#.', '#.....#'],
  'の': ['..###..', '.#.#.#.', '#..#..#', '#..#..#', '#.#...#', '.#...#.', '....#..'],
  '用': ['.######', '.#..#.#', '.######', '.#..#.#', '.######', '#...#.#', '#...###'],
  '心': ['...#...', '....#..', '.#.....', '.#..#.#', '#...#.#', '#...#..', '..###..'],
  'ガ': ['..#..#.#', '######..', '..#..#..', '..#..#..', '.#...#..', '.#...#..', '#..##...'],
  'チ': ['....##.', '.###...', '...#...', '#######', '...#...', '..#....', '##.....'],
  'ャ': ['......', '......', '.#....', '.#####', '.#..#.', '..#...', '..#...'],
  '収': ['..#.#..', '#.#.##.', '#.#.#.#', '#.#..#.', '###.#.#', '..#.#.#', '..##...'],
  '両': ['#######', '...#...', '#######', '#.#.#.#', '#.#.#.#', '#.....#', '#....##'],
  '替': ['.#..#..', '###.###', '.#..#..', '#.#.#.#', '.#####.', '.#####.', '.#...#.', '.#####.'],
  '入': ['..#....', '...#...', '...#...', '...#...', '..#.#..', '.#...#.', '#.....#'],
  '荷': ['.#...#.', '#######', '.#...#.', '..#####', '.##..#.', '#.#.##.', '..#..#.'],
  '新': ['.#..#..', '###.#..', '#.#.###', '###.#.#', '.#..#.#', '###.#.#', '.#.#..#'],
  '月': ['.#####.', '.#...#.', '.#####.', '.#...#.', '.#####.', '.#...#.', '#...##.'],
  '大': ['...#...', '...#...', '#######', '...#...', '..#.#..', '.#...#.', '#.....#'],
  '日': ['#####', '#...#', '#...#', '#####', '#...#', '#...#', '#####'],
  '土': ['...#...', '...#...', '.#####.', '...#...', '...#...', '...#...', '#######'],
  '!': ['#', '#', '#', '#', '#', '.', '#'],
  '↓': ['..#..', '..#..', '..#..', '#.#.#', '.###.', '..#..', '.....'],
  '→': ['.......', '....#..', '.....#.', '#######', '.....#.', '....#..', '.......'],
  ' ': ['...', '...', '...', '...', '...', '...', '...'],
};
/** Ink pixels of a mixed string: JP glyphs from the table above, everything else from the 5 x 7 font. */
function inkMask(str) {
  const out = []; let xx = 0;
  for (const ch of str) {
    const g = JP[ch];
    if (g) {
      const off = 7 - g.length; // taller glyphs (8 rows) rise one pixel above the line
      g.forEach((row, ry) => { for (let rx = 0; rx < row.length; rx++) if (row[rx] === '#') out.push([xx + rx, ry + off]); });
      xx += g[0].length + 1;
    } else {
      for (const [x, y] of mask5(ch)) out.push([xx + x, y]);
      xx += textW5(ch) + 1;
    }
  }
  return { px: out, w: Math.max(0, xx - 1) };
}
/** Draw ink text; (x, y) = top-left (centre x when align = 'center'). s = pixel scale; marker = slightly wobbly strokes. */
function ink(p, str, x, y, col, { s = 1, align = 'left', bold = false, wob = 0 } = {}) {
  const m = inkMask(str);
  const ox = align === 'center' ? Math.round(x - (m.w * s) / 2) : x;
  for (const [mx, my] of m.px) {
    const dy = wob ? Math.round(Math.sin((mx + my * 0.5) * 0.7 + wob) * 0.6) : 0;
    p.rect(ox + mx * s, y + my * s + dy, s, s, col);
    if (bold) p.rect(ox + mx * s + 1, y + my * s + dy, s, s, col);
  }
  return m.w * s;
}
/** Vertical JP text (one glyph per line), centred on x. */
function inkV(p, str, cx, y, col, s = 1, gap = 2) {
  let yy = y;
  for (const ch of str) { ink(p, ch, cx, yy, col, { s, align: 'center' }); yy += (JP[ch]?.length || 7) * s + gap; }
}

/** Card paper with a soft shadowed edge, optional tape strips and a punched corner. */
function card(p, x, y, w, h, paper, { edge = null, tape = false, torn = false } = {}) {
  p.rect(x, y, w, h, paper);
  for (let i = 0; i < w * h * 0.04; i++) p.px(x + Math.floor(hash2(i, x + 3) * w), y + Math.floor(hash2(i, y + 5) * h), sh(paper, 0.95));
  if (edge !== null) p.frame(x, y, w, h, edge);
  else { p.rect(x, y + h - 1, w, 1, sh(paper, 0.86)); p.rect(x + w - 1, y, 1, h, sh(paper, 0.9)); }
  if (torn) for (let i = 0; i < w; i += 2) if (hash2(i, x) < 0.5) p.px(x + i, y, 0, 0); // leave holes: alpha 0 untouched by px with a=0
  if (tape) { p.rect(x + 2, y - 1, 8, 4, 0xe8e0c4); p.rect(x + w - 10, y - 1, 8, 4, 0xe8e0c4); }
}

let CARDS = null;
export function cardAtlas() {
  if (CARDS) return CARDS;
  const A = new Atlas(512, 256, 91), p = A.p;
  const RED = 0xd8342a, INK = 0x2a2428, BLUE = 0x2a52a8, GREEN = 0x2a8a4a, PAPER = 0xf6f0e0;

  // price cards for the machine wall: "1回 ¥100" etc. with a red underline
  ['100', '200', '300', '500'].forEach((pr, i) => A.cell('price' + pr, i * 48, 0, 48, 32, (x, y, w, h) => {
    card(p, x, y, w, h, i === 3 ? 0xfff2a8 : PAPER);
    ink(p, '1回', x + 4, y + 4, INK, { wob: i });
    ink(p, pr + '円', x + w / 2, y + 15, RED, { s: 1, align: 'center', bold: true, wob: i + 2 });
    p.rect(x + 6, y + 25, w - 12, 1, RED);
    p.circle(x + w - 8, y + 7, 3, i === 3 ? RED : 0xffd23f);
  }));
  // "capsules go here ↓"
  A.cell('return', 192, 0, 64, 40, (x, y, w, h) => {
    card(p, x, y, w, h, 0xe8f4ff, { edge: BLUE });
    ink(p, 'カプセル', x + w / 2, y + 5, BLUE, { align: 'center' });
    ink(p, 'はここへ', x + w / 2, y + 16, INK, { align: 'center' });
    ink(p, '↓', x + w / 2, y + 27, RED, { align: 'center', bold: true });
  });
  A.cell('changeCard', 256, 0, 64, 40, (x, y, w, h) => {
    card(p, x, y, w, h, PAPER, { edge: RED });
    ink(p, '両替', x + w / 2, y + 5, RED, { s: 2, align: 'center', wob: 1 });
    ink(p, '100円 OK', x + w / 2, y + 26, INK, { align: 'center' });
  });
  A.cell('newCard', 320, 0, 48, 40, (x, y, w, h) => {
    // yellow starburst "新入荷!"
    const cx = x + w / 2, cy = y + h / 2;
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
      const a = Math.atan2(yy - cy, xx - cx), r = Math.hypot((xx - cx) / 23, (yy - cy) / 19);
      if (r < 0.78 + 0.22 * (Math.cos(a * 9) > 0 ? 1 : 0)) p.px(xx, yy, r > 0.85 ? 0xe8a020 : 0xffd84a);
    }
    ink(p, '新入荷', cx, cy - 8, RED, { align: 'center', bold: true });
    ink(p, 'NEW!', cx, cy + 2, INK, { align: 'center' });
  });
  // green-cross "安全第一" board
  A.cell('anzen', 368, 0, 64, 48, (x, y, w, h) => {
    card(p, x, y, w, h, 0xf4f4ee, { edge: 0x3a3a3a });
    p.rect(x + 6, y + 8, 14, 4, GREEN); p.rect(x + 11, y + 3, 4, 14, GREEN);
    ink(p, '安全', x + 40, y + 5, GREEN, { align: 'center', bold: true });
    ink(p, '第一', x + w / 2, y + 26, GREEN, { s: 2, align: 'center' });
    p.rect(x, y + h - 4, w, 3, GREEN);
  });
  // wooden "火の用心" board (vertical)
  A.cell('hinoyojin', 432, 0, 24, 72, (x, y, w, h) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) p.px(xx, yy, sh(0xc89a62, 0.92 + vn(xx * 3, yy * 0.3, 4, 3) * 0.14));
    p.frame(x, y, w, h, 0x7a5432);
    p.circle(x + w / 2, y + 3, 1, 0x3a2a1a);
    inkV(p, '火の用心', x + w / 2, y + 8, INK, 2, 1);
  });
  // "CAPSULE RETURN" label for the return box
  A.cell('returnLabel', 456, 0, 56, 24, (x, y, w, h) => {
    card(p, x, y, w, h, 0xfbf8f0, { edge: RED });
    ink(p, 'カプセル回収', x + w / 2, y + 4, RED, { align: 'center' });
    ink(p, 'RETURN', x + w / 2, y + 14, INK, { align: 'center' });
  });
  // kids' crayon drawings: Mikan the cat and a gacha machine
  A.cell('drawCat', 0, 40, 64, 48, (x, y, w, h) => {
    card(p, x, y, w, h, 0xfdfaf2, { tape: true });
    const cr = (xx, yy, c) => { if (hash2(xx, yy) < 0.82) p.px(xx, yy, c); };
    for (let a = 0; a < 6.28; a += 0.05) { cr(Math.round(x + 26 + Math.cos(a) * 14), Math.round(y + 30 + Math.sin(a) * 10), 0xe88a3a); cr(Math.round(x + 26 + Math.cos(a) * 9), Math.round(y + 17 + Math.sin(a) * 7), 0xe88a3a); }
    for (let i = 0; i < 5; i++) { cr(x + 19 + i, y + 11 - i, 0xe88a3a); cr(x + 33 - i, y + 11 - i, 0xe88a3a); }
    p.px(x + 23, y + 16, INK); p.px(x + 29, y + 16, INK); p.px(x + 26, y + 19, 0xe86a8a);
    for (let i = 0; i < 12; i++) cr(x + 40 + i, y + 32 - Math.round(Math.sin(i * 0.5) * 4), 0xe88a3a);
    for (let i = 0; i < 20; i++) cr(x + 18 + Math.floor(hash2(i, 9) * 18), y + 24 + Math.floor(hash2(i, 8) * 12), 0x3a3030);
    ink(p, 'MIKAN', x + 50, y + 4, 0xe8463a, { align: 'center', wob: 3 });
    p.circle(x + 54, y + 38, 3, 0xffd23f);
  });
  A.cell('drawGacha', 64, 40, 64, 48, (x, y, w, h) => {
    card(p, x, y, w, h, 0xfdfaf2, { tape: true });
    const cr = (xx, yy, c) => { if (hash2(xx * 3, yy) < 0.8) p.px(xx, yy, c); };
    for (let yy = 0; yy < 18; yy++) { cr(x + 14, y + 10 + yy, 0x3a6ad8); cr(x + 34, y + 10 + yy, 0x3a6ad8); }
    for (let xx = 0; xx < 21; xx++) { cr(x + 14 + xx, y + 10, 0x3a6ad8); cr(x + 14 + xx, y + 27, 0x3a6ad8); cr(x + 14 + xx, y + 42, 0xd83a3a); }
    for (let yy = 27; yy < 43; yy++) { cr(x + 14, y + yy, 0xd83a3a); cr(x + 34, y + yy, 0xd83a3a); }
    for (const [cx, cy, c] of [[19, 15, 0xff6f91], [27, 14, 0xffd23f], [22, 22, 0x58c06c], [30, 22, 0x5cc4ff]]) p.circle(x + cx, y + cy, 2, c);
    p.circle(x + 24, y + 33, 3, 0x9a9aa8);
    ink(p, 'ガチャ!', x + 50, y + 8, 0xe8463a, { align: 'center', wob: 1 });
    p.circle(x + 50, y + 30, 4, 0xff9fae); p.circle(x + 50, y + 30, 2, 0xfdfaf2);
  });
  // faded sepia photo of the shop in the old days
  A.cell('photo', 128, 40, 40, 48, (x, y, w, h) => {
    card(p, x, y, w, h, 0xf2ecdc);
    for (let yy = y + 3; yy < y + 34; yy++) for (let xx = x + 3; xx < x + w - 3; xx++) {
      const sky = yy < y + 14, shop = yy >= y + 14 && xx > x + 8 && xx < x + w - 8;
      let c = sky ? 0xc8b48c : 0x8a7454;
      if (shop) c = yy < y + 18 ? 0x5a4630 : (xx - x) % 6 < 3 ? 0x9a8462 : 0x6a5640;
      if (Math.abs(xx - (x + 15)) < 2 && yy > y + 22) c = 0x4a3a28; // a tiny figure: grandpa
      if (Math.hypot(xx - (x + 15), yy - (y + 21)) < 2.2) c = 0x4a3a28;
      p.px(xx, yy, sh(c, 0.92 + hash2(xx, yy) * 0.12));
    }
    ink(p, '1972', x + w / 2, y + 37, 0x7a6a58, { align: 'center' });
  });
  // a handwritten notice with Grandpa's house rules
  A.cell('rules', 168, 40, 64, 72, (x, y, w, h) => {
    card(p, x, y, w, h, 0xfffbe8, { tape: true });
    for (let k = 0; k < 7; k++) p.rect(x + 3, y + 14 + k * 8, w - 6, 1, 0xc8d8e8);
    ink(p, 'RULES', x + w / 2, y + 4, RED, { align: 'center', wob: 2 });
    ['1 BE KIND', '2 ONE AT', '  A TIME', '3 NO CAT', '  FEEDING', '4 HAVE FUN'].forEach((t, k) => ink(p, t, x + 4, y + 16 + k * 8 - 7 + 6, INK, { wob: k }));
    p.circle(x + w - 9, y + h - 9, 4, RED); p.circle(x + w - 9, y + h - 9, 2, 0xfffbe8);
  });
  // tear-off daily calendar: red header, a big date
  A.cell('himekuri', 232, 40, 40, 56, (x, y, w, h) => {
    p.rect(x, y, w, h, 0xfbf8f0);
    p.rect(x, y, w, 9, 0x2a2428); p.rect(x + 4, y + 3, 4, 3, 0xd8c890); p.rect(x + w - 8, y + 3, 4, 3, 0xd8c890);
    ink(p, 'AUG', x + w / 2, y + 12, INK, { align: 'center' });
    const m = inkMask('15');
    const s = 3;
    for (const [mx, my] of m.px) p.rect(x + w / 2 - (m.w * s) / 2 + mx * s, y + 22 + my * s, s, s, RED);
    ink(p, '日', x + w / 2, y + h - 10, RED, { align: 'center' });
    for (let i = 0; i < w; i++) if (hash2(i, 99) < 0.6) p.px(x + i, y + 9, 0xd8d0c0);
    p.rect(x, y + h - 1, w, 1, 0xd8d0c0);
  });
  // school-style wall clock face (4:52, golden hour)
  A.cell('clock', 272, 40, 64, 64, (x, y, w, h) => {
    const cx = x + 31.5, cy = y + 31.5;
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
      const d = Math.hypot(xx - cx, yy - cy);
      if (d < 31.5) p.px(xx, yy, d > 28 ? 0x2a2a2e : d > 26.5 ? 0xc8c8cc : 0xf6f4ec);
    }
    for (let k = 0; k < 60; k++) {
      const a = (k / 60) * Math.PI * 2, r0 = k % 5 ? 24 : 21;
      for (let r = r0; r <= 25; r++) p.px(Math.round(cx + Math.sin(a) * r), Math.round(cy - Math.cos(a) * r), INK);
    }
    const hand = (a, len, c, wdt = 1) => { for (let r = -3; r <= len; r++) for (let o = 0; o < wdt; o++) p.px(Math.round(cx + Math.sin(a) * r + o * Math.cos(a)), Math.round(cy - Math.cos(a) * r + o * Math.sin(a)), c); };
    hand(((4 + 52 / 60) / 12) * Math.PI * 2, 13, INK, 2);
    hand((52 / 60) * Math.PI * 2, 20, INK, 2);
    hand((17 / 60) * Math.PI * 2, 22, RED, 1);
    p.circle(cx, cy, 1, RED);
    const tm = inkMask('SEIKO');
    for (const [mx, my] of tm.px) if (my % 1 === 0) p.px(Math.round(cx - tm.w / 2 + mx), y + 18 + my, 0x6a6a70);
  });
  // breaker panel door face: grey steel, a vent grille and a sticker
  A.cell('breaker', 336, 48, 40, 56, (x, y, w, h) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) p.px(xx, yy, sh(0xc8c8c0, 0.95 + vn(xx, yy, 6, 5) * 0.08));
    p.frame(x, y, w, h, 0x8a8a84); p.frame(x + 1, y + 1, w - 2, h - 2, 0xdcdcd4);
    for (let k = 0; k < 4; k++) p.rect(x + 8, y + 6 + k * 3, w - 16, 1, 0x7a7a74);
    p.rect(x + 6, y + 22, w - 12, 12, 0xf6f4ec); p.frame(x + 6, y + 22, w - 12, 12, RED);
    ink(p, 'TEL', x + w / 2, y + 25, RED, { align: 'center' });
    p.rect(x + w - 6, y + 36, 3, 8, 0x5a5a56);
    for (let i = 0; i < 30; i++) p.px(x + Math.floor(hash2(i, 7) * w), y + h - 1 - Math.floor(hash2(i, 8) * 10), 0x9a8a6a);
  });
  // label strip for spare capsule stock crates
  A.cell('stockLabel', 376, 48, 56, 20, (x, y, w, h) => {
    card(p, x, y, w, h, 0xffffff, { edge: BLUE });
    ink(p, 'カプセル', x + w / 2, y + 3, BLUE, { align: 'center' });
    ink(p, 'x200', x + w / 2, y + 12, INK, { align: 'center' });
  });
  // "ガチャ" paper lantern strip / nobori flag body (vertical)
  A.cell('nobori', 432, 72, 32, 128, (x, y, w, h) => {
    p.rect(x, y, w, h, 0xe8463a);
    p.rect(x, y, w, 10, 0xfbf8f0); p.rect(x, y + h - 10, w, 10, 0xfbf8f0);
    for (let k = 0; k < 4; k++) p.rect(x + w - 4, y + 14 + k * 30, 4, 2, 0xfbf8f0); // loops
    inkV(p, 'ガチャ', x + w / 2 - 2, y + 18, 0xffffff, 3, 4);
    for (let i = 0; i < 6; i++) p.circle(x + 6 + (i % 2) * 14, y + 90 + i * 5, 2, [0xffd23f, 0x5cc4ff, 0x58c06c][i % 3]);
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (hash2(xx, yy) < 0.04) { const [r, g, b] = p.get(xx, yy); p.px(xx, yy, [r * 0.9, g * 0.9, b * 0.9]); }
  });
  // ON / OFF sticker for the switch & a "節電" (save power) tag
  A.cell('switchTag', 464, 72, 32, 16, (x, y, w, h) => {
    card(p, x, y, w, h, 0xfff2a8, { edge: 0xc8a020 });
    ink(p, 'LIGHT', x + w / 2, y + 4, INK, { align: 'center' });
  });
  // memo pad with a delivery note
  A.cell('memo', 0, 88, 48, 48, (x, y, w, h) => {
    card(p, x, y, w, h, 0xfff6a8, { tape: true });
    ink(p, 'TUE', x + 4, y + 6, BLUE, { wob: 1 });
    ink(p, 'DELIVERY', x + 4, y + 17, INK, { wob: 2 });
    ink(p, '10:00', x + 4, y + 28, INK, { wob: 3 });
    p.rect(x + 4, y + 38, 30, 1, RED);
  });
  // "OPEN" hand sign with opening hours
  A.cell('hours', 48, 88, 64, 40, (x, y, w, h) => {
    card(p, x, y, w, h, 0xfdfaf2, { edge: 0x5a3a24 });
    ink(p, 'OPEN', x + w / 2, y + 5, GREEN, { align: 'center', bold: true });
    ink(p, '10:00-19:00', x + w / 2, y + 17, INK, { align: 'center' });
    ink(p, '日 CLOSED', x + w / 2, y + 28, RED, { align: 'center' });
  });
  CARDS = A.done();
  return CARDS;
}

/** Banded ambient-occlusion gradient (alpha only): opaque edge on the left/bottom fading out, a few crisp steps. */
let AO = null;
export function aoTexture() {
  if (AO) return AO;
  const c = document.createElement('canvas');
  c.width = 32; c.height = 4;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(32, 4);
  for (let x = 0; x < 32; x++) {
    const t = x / 31;
    const a = Math.pow(1 - t, 1.8);
    const q = Math.round(a * 6) / 6; // posterised bands: pixel-art shading rather than a smooth airbrush
    for (let y = 0; y < 4; y++) { const i = (y * 32 + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 0; img.data[i + 3] = Math.round(q * 255); }
  }
  ctx.putImageData(img, 0, 0);
  AO = new THREE.CanvasTexture(c);
  AO.magFilter = THREE.NearestFilter;
  AO.minFilter = THREE.LinearFilter;
  AO.generateMipmaps = false;
  AO.wrapS = THREE.ClampToEdgeWrapping; AO.wrapT = THREE.RepeatWrapping;
  return AO;
}

export { mixC as mixColor };
