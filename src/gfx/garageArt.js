// Pixel-art atlases for the garage interior detail pass (src/world/GarageDetail.js):
//   decalAtlas()  alpha-tested grime: oil stains, tyre tracks, water stains, cracks, scuffs, paint, hazard tape,
//                 dust and wall-foot grime (painted in light neutrals and tinted per placement by vertex colour).
//   cardAtlas()   little handwritten shop cards, signs, kids' drawings, a clock face and a tear-off calendar.
//                 Painted at twice the decal density (the card art in 2 x 2 texel blocks) so that every word on
//                 them is set in a high-res pixel font at its native size (house rule: no 5x7 / tiny bitmap fonts):
//                 Japanese in DotGothic16, Latin in Alagard, at 16 px (or a clean 2x / 3x for the big ones).
// Each atlas returns { tex, size: [w, h], rect(name) -> [u0, v0, u1, v1] } (UVs with v up, three.js style).
import * as THREE from 'three';
import { drawPrint } from './printAtlas.js';
import { Pix } from './pix.js';
import { hash2 } from '../core/util.js';

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
  // re-rasterised at K x the old cell grid (~258 px/m on the garage floor, docs/ART.md): every shape is drawn at the fine
  // grid from the same rules (never a blow-up), with clean stepped edges instead of an ordered dither (no speckle)
  const K = 3, A = new Atlas(512 * K, 512 * K, 77), p = A.p;
  const put = (x, y, c) => p.px(x, y, c);
  const cell = (n, x, y, w, h, fn) => A.cell(n, x * K, y * K, w * K, h * K, fn);
  const vk = (x, y, sc, s) => vn(x, y, sc * K, s); // the noise at the same size in metres as before
  const flat = () => 0.5; // a threshold where the old art dithered

  /** Lobed blob: inside where noise-warped radius < R. layers: [[rFrac, colour], ...] from outside in. */
  const blob = (x0, y0, w, h, s, layers, { lobes = 5, warp = 0.28 } = {}) => {
    const cx = x0 + w / 2, cy = y0 + h / 2, rx = w / 2 - 2 * K, ry = h / 2 - 2 * K;
    const ph = [hash2(s, 1) * 6.28, hash2(s, 2) * 6.28, hash2(s, 3) * 6.28];
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry, a = Math.atan2(dy, dx);
      const R = 1 - warp * (0.5 + 0.5 * Math.sin(a * lobes + ph[0])) * 0.6 - warp * 0.4 * (0.5 + 0.5 * Math.sin(a * (lobes + 3) + ph[1])) - (vk(x, y, 5, s) - 0.5) * warp;
      const d = Math.hypot(dx, dy) / Math.max(0.2, R);
      for (const [rf, c] of layers) if (d < rf) put(x, y, c);
    }
  };
  const dot = (x, y, r, c) => { for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) if (xx * xx + yy * yy <= r * r + 0.5) put(x + xx, y + yy, c); };

  // big oil stain under where Grandpa's car used to stand: soft outer halo, darker core, drip satellites
  cell('oilBig', 0, 0, 128, 96, (x0, y0, w, h) => {
    blob(x0, y0, w, h, 3, [[1.0, 0xc4beb4], [0.82, 0xaca69c], [0.55, 0x938d84], [0.3, 0x7e7870]], { lobes: 4, warp: 0.34 });
    for (let i = 0; i < 9; i++) {
      const a = hash2(i, 31) * 6.28, r = 0.62 + hash2(i, 32) * 0.3;
      const x = Math.round(x0 + w / 2 + Math.cos(a) * r * w / 2), y = Math.round(y0 + h / 2 + Math.sin(a) * r * h / 2);
      const rr = (1 + Math.floor(hash2(i, 33) * 3)) * K;
      dot(x, y, rr, rr > 2 * K ? 0x938d84 : 0xaca69c);
    }
  });
  cell('oilSmall', 128, 0, 64, 48, (x0, y0, w, h) => blob(x0, y0, w, h, 5, [[1.0, 0xbcb6ac], [0.65, 0x9c968c], [0.32, 0x847e76]], { lobes: 3, warp: 0.3 }));
  cell('oilDrips', 192, 0, 32, 32, (x0, y0, w, h) => {
    for (let i = 0; i < 7; i++) {
      const x = x0 + Math.round(w * (0.12 + hash2(i, 41) * 0.75)), y = y0 + Math.round(h * (0.12 + hash2(i, 42) * 0.75)), r = (hash2(i, 43) < 0.4 ? 2 : 1) * K;
      dot(x, y, r, r > K ? 0x8e8880 : 0xa29c92);
      if (r > K) dot(x + Math.round(r * 0.4), y + Math.round(r * 0.4), Math.round(r * 0.45), 0x7e7870); // the wet middle
    }
  });
  // tyre track: a worn band with tread blocks, broken where the rubber didn't take
  cell('tyre', 224, 0, 16, 160, (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0 + 2 * K; x < x0 + w - 2 * K; x++) {
      const along = (y - y0) / h, fade = Math.sin(along * Math.PI);
      const tread = (Math.floor(y / (2 * K)) + (x - x0 > w / 2 ? 1 : 0)) % 3 !== 0;
      if (vk(x, y, 6, 9) * fade > 0.28 + 0.15) put(x, y, tread ? 0x8a867e : 0x9c978e);
    }
  });
  // water stain running down a wall from the top: tide lines and a darker damp body
  cell('wallWater', 256, 0, 96, 128, (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const u = (x - x0) / w - 0.5, t = (y - y0) / h;
      const width = 0.48 - t * 0.32 + (vk(x, y, 10, 4) - 0.5) * 0.18;
      const d = Math.abs(u) / Math.max(0.02, width);
      if (d > 1 || t > 0.95) continue;
      const tide = Math.abs(d - 0.92) < 0.06 || (Math.abs(d - 0.7) < 0.035 && t < 0.7);
      const runs = Math.abs(Math.sin(u * 37 + Math.floor(t * 3))) > 0.94 && t > 0.3;
      if (tide) put(x, y, 0xb0a594);
      else if (runs) put(x, y, 0xbcb3a4);
      else if (t < 0.45 && d < 0.85) put(x, y, 0xd0c8ba); // the damp body, upper part, a clean step
    }
  });
  cell('rust', 352, 0, 24, 128, (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++) {
      const t = (y - y0) / h, yy = y / K, hw = Math.max(0.6, (1 - t) * 4 + Math.sin(yy * 0.3) * 0.6) * K;
      const cx = x0 + w / 2 + Math.sin(yy * 0.07) * 1.5 * K;
      for (let x = x0; x < x0 + w; x++) {
        const d = Math.abs(x - cx) / hw;
        if (d < 1 && flat() < 1.05 - t * 0.8 - d * 0.3) put(x, y, d < 0.4 ? 0x9a5a34 : 0xb47a52);
      }
    }
  });
  // ring-shaped leak stain on the ceiling board
  cell('ceilStain', 384, 0, 128, 96, (x0, y0, w, h) => {
    blob(x0, y0, w, h, 11, [[1.0, 0x9a8a72], [0.94, 0xc2b6a2], [0.66, 0xa49480], [0.6, 0xc8bca8], [0.3, 0xb0a28c]], { lobes: 6, warp: 0.3 });
  });
  cell('ceilStain2', 400, 288, 112, 80, (x0, y0, w, h) => {
    blob(x0, y0, w, h, 13, [[1.0, 0x9a8a72], [0.92, 0xc4b8a4], [0.5, 0xa49480], [0.44, 0xc8bca8]], { lobes: 5, warp: 0.36 });
  });
  // hairline crack network with a chipped branch (1-texel lines at the fine grid: hairlines)
  cell('crack', 0, 96, 128, 64, (x0, y0, w, h) => {
    const walk = (x, y, dx, dy, n, s) => {
      for (let i = 0; i < n * K; i++) {
        put(Math.round(x), Math.round(y), 0x5e5a54);
        if (hash2(i, s) < 0.1) put(Math.round(x), Math.round(y) + 1, 0x77726a);
        x += dx + (hash2(i, s + 1) - 0.5) * 1.4; y += dy + (hash2(i, s + 2) - 0.5) * 1.4;
        if (x < x0 + 1 || x > x0 + w - 2 || y < y0 + 1 || y > y0 + h - 2) break;
      }
    };
    walk(x0 + 2 * K, y0 + 30 * K, 1, 0.12, 120, 5);
    walk(x0 + 46 * K, y0 + 35 * K, 0.5, 0.8, 30, 6);
    walk(x0 + 80 * K, y0 + 40 * K, 0.7, -0.75, 34, 7);
    walk(x0 + 20 * K, y0 + 32 * K, 0.3, -0.9, 20, 8);
  });
  cell('scuffs', 128, 48, 96, 48, (x0, y0, w, h) => {
    for (let i = 0; i < 26; i++) {
      const x = x0 + 4 * K + hash2(i, 51) * (w - 20 * K), y = y0 + 4 * K + hash2(i, 52) * (h - 8 * K), a = (hash2(i, 53) - 0.5) * 0.9, len = (4 + hash2(i, 54) * 12) * K;
      const c = hash2(i, 55) < 0.5 ? 0x77736c : 0x8a857c;
      for (let k = 0; k < len; k++) { const px = Math.round(x + Math.cos(a) * k), py = Math.round(y + Math.sin(a) * k); put(px, py, c); if (k > 2 && k < len - 3) put(px, py + 1, c); }
    }
  });
  // spilt paint: a blue puddle and white drips
  cell('paintBlue', 384, 96, 64, 64, (x0, y0, w, h) => {
    blob(x0 + 8 * K, y0 + 8 * K, 44 * K, 40 * K, 21, [[1.0, 0x4a7ab0], [0.6, 0x3a6aa0]], { lobes: 5, warp: 0.4 });
    for (let i = 0; i < 12; i++) dot(x0 + Math.floor(hash2(i, 61) * 60 * K), y0 + Math.floor(hash2(i, 62) * 60 * K), i % 3 === 0 ? K : Math.ceil(K / 2), 0x4a7ab0);
  });
  cell('paintWhite', 448, 96, 64, 64, (x0, y0, w, h) => {
    for (let i = 0; i < 18; i++) dot(x0 + (4 + Math.floor(hash2(i, 71) * 56)) * K, y0 + (4 + Math.floor(hash2(i, 72) * 56)) * K, (hash2(i, 73) < 0.3 ? 2 : 1) * K, 0xeeeae2);
    blob(x0 + 20 * K, y0 + 20 * K, 24 * K, 20 * K, 23, [[1.0, 0xeeeae2]], { lobes: 4, warp: 0.4 });
  });
  // worn yellow/black hazard stripes and a worn yellow line
  cell('hazard', 0, 160, 256, 16, (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const band = Math.floor(((x - x0) + (y - y0)) / (12 * K)) % 2;
      const wear = vk(x, y, 4, 33) + (y - y0 < K || y0 + h - 1 - y < K ? 0.2 : 0);
      if (wear > 0.72) continue;
      put(x, y, band ? 0x2a2826 : (wear > 0.6 ? 0xc8a838 : 0xe8c43a));
    }
  });
  cell('yline', 0, 176, 256, 8, (x0, y0, w, h) => {
    for (let y = y0 + K; y < y0 + h - K; y++) for (let x = x0; x < x0 + w; x++) {
      const wear = vk(x, y, 5, 41);
      if (wear > 0.64) continue;
      put(x, y, wear > 0.5 ? 0xd8c890 : 0xf0d860);
    }
  });
  // grime band rising from the floor (tileable across): wall feet, in clean steps
  cell('grime', 0, 192, 128, 48, (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const t = 1 - (y - y0) / h; // 1 at the floor (bottom row)
      const n = vk(x - x0, y, 9, 51) * 0.35 + vk(x - x0, y, 3, 52) * 0.15;
      const k = t * t * 0.95 + n * t - 0.12;
      if (k > 0.5) put(x, y, k > 0.78 ? 0x8e8a82 : 0xa29e96);
    }
  });
  // dust drifted against the wall foot on the floor (tileable across; the wall side is the top row)
  cell('dustEdge', 128, 192, 128, 48, (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const t = 1 - (y - y0) / h; // 1 at the wall
      const k = t * t * 0.9 + vk(x - x0, y, 7, 61) * 0.5 * t - 0.15;
      if (k > 0.5) put(x, y, k > 0.8 ? 0xd0c8b8 : 0xc0b8aa);
    }
  });
  // dusty shoe prints
  cell('prints', 256, 160, 64, 128, (x0, y0, w, h) => {
    const shoe = (cx, cy, flip, s) => {
      for (let y = -9 * K; y <= 9 * K; y++) for (let x = -4 * K; x <= 4 * K; x++) {
        const X = x / K, Y = y / K;
        const heel = Y > 4, ok = heel ? (X * X) / 12 + ((Y - 7) * (Y - 7)) / 6 < 1 : (X * X) / 16 + ((Y + 1) * (Y + 1)) / 36 < 1;
        const sole = (Math.floor(Y * 1.5) + 99) % 2 === 0; // the tread bars across the sole
        if (ok && !(Y > 2.6 && Y < 4.4) && sole && hash2(Math.floor(X * 2) + s * 3, Math.floor(Y * 2) + s) < 0.8) put(cx + (flip ? -x : x), cy + y, 0xc4bcb0);
      }
    };
    shoe(x0 + 20 * K, y0 + 16 * K, false, 1); shoe(x0 + 40 * K, y0 + 44 * K, true, 2); shoe(x0 + 22 * K, y0 + 74 * K, false, 3); shoe(x0 + 42 * K, y0 + 104 * K, true, 4);
  });
  // steel grating for the trench drain (opaque): bearing bars every 4.6 cm, a cross bar every 14 cm
  cell('grate', 320, 160, 128, 24, (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const ey = Math.min(y - y0, y0 + h - 1 - y), edge = ey < 2 * K;
      const bar = (x - x0) % (4 * K) < K;
      const cross = Math.abs(((y - y0) % (12 * K)) - 6 * K) < Math.ceil(K / 2);
      let c = 0x1c1a18;
      if (edge) c = ey < K ? 0x5e5a54 : 0x7a766e;
      else if (bar || cross) c = (x - x0) % (4 * K) === 0 ? 0x86827a : 0x6e6a64; // a lit edge on each bar
      if (!edge && (bar || cross) && vk(x, y, 6, 71) > 0.62) c = 0x8a5a36; // rust
      put(x, y, c);
    }
  });
  // grime around a switch / door handle
  cell('smudge', 448, 160, 32, 32, (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const d = Math.hypot(x - x0 - w / 2, (y - y0 - h / 2) * 0.8) / (15 * K);
      if (d < 1 && (1 - d) * 0.9 + vk(x, y, 3, 81) * 0.3 - 0.25 > 0.5) put(x, y, 0xa29e96);
    }
  });
  // dusty patch / swept arc
  cell('dust', 256, 288, 96, 96, (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const d = Math.hypot(x - x0 - w / 2, y - y0 - h / 2) / (w / 2);
      const k = (1 - d) * 0.8 + vk(x, y, 6, 91) * 0.5 - 0.42;
      if (d < 1 && k > 0.5) put(x, y, k > 0.75 ? 0xb4ac9e : 0xc2baac);
    }
  });
  // rusty can rings left on the floor
  cell('rings', 352, 288, 48, 48, (x0, y0) => {
    for (const [cx, cy, r] of [[16, 18, 9], [31, 30, 8], [22, 36, 6]]) for (let a = 0; a < 6.28; a += 0.04 / K) {
      if (hash2(Math.round(a * 30), r) < 0.18) continue;
      for (let t = 0; t < Math.ceil(K / 1.5); t++) put(Math.round(x0 + (cx + Math.cos(a) * r) * K) + 0, Math.round(y0 + (cy + Math.sin(a) * r) * K) + t, 0x8a6a4a);
    }
  });
  // cracked, patched mortar repair (opaque-ish lighter patch)
  cell('patch', 0, 240, 96, 64, (x0, y0, w, h) => {
    blob(x0, y0, w, h, 101, [[1.0, 0xb8b2a6], [0.94, 0xaaa498]], { lobes: 3, warp: 0.25 });
    for (let i = 0; i < 40; i++) dot(x0 + (10 + Math.floor(hash2(i, 103) * 76)) * K, y0 + (8 + Math.floor(hash2(i, 104) * 48)) * K, Math.ceil(K / 2), 0x9c968a);
  });
  // wet, darker concrete by the drain and the sink
  cell('damp', 96, 240, 96, 64, (x0, y0, w, h) => blob(x0, y0, w, h, 111, [[1.0, 0x9a9488], [0.6, 0x8c867a]], { lobes: 5, warp: 0.3 }));
  DECALS = A.done();
  return DECALS;
}

// ---------------------------------------------------------------------------------------------- glyphs
// ---- the cards' lettering: high-res pixel fonts at their native 16 px (x s), thresholded so every texel is hard
const FONT_JP = '"DotGothic16"', FONT_LAT = '"Alagard"';
const GLYPHS = new Map();
// every character the cards use, so their font files are fetched early (the JP font comes in unicode-range parts);
// cardAtlas() repaints itself once they are in if it had to draw before
const CARD_JP = '1回円カプセルはここへ↓両替新入荷安全第一火の用心回収ガチャ!日', CARD_LAT = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!:-x ';
const cardFonts = typeof document !== 'undefined' && document.fonts?.load
  ? Promise.all([16, 32, 48].flatMap((z) => [document.fonts.load(`${z}px ${FONT_JP}`, CARD_JP), document.fonts.load(`${z}px ${FONT_LAT}`, CARD_LAT)])).catch(() => {})
  : Promise.resolve();
const fontsReady = () => { try { return document.fonts.check(`16px ${FONT_JP}`, CARD_JP) && document.fonts.check(`16px ${FONT_LAT}`, CARD_LAT); } catch { return true; } };
/** The lit texels of one character at `size` px ([[x, y]...], advance). */
function glyph(ch, size) {
  const key = ch + '|' + size;
  if (GLYPHS.has(key)) return GLYPHS.get(key);
  const f = /^[\x20-\x7e]$/.test(ch) ? FONT_LAT : FONT_JP;
  const c = document.createElement('canvas'), W = Math.ceil(size * 1.6), H = Math.ceil(size * 1.5);
  c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.font = `${size}px ${f}`; g.textBaseline = 'top'; g.fillStyle = '#fff';
  g.fillText(ch, 0, 0);
  const d = g.getImageData(0, 0, W, H).data, px = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 110) px.push([x, y]);
  const out = { px, adv: Math.round(g.measureText(ch).width) };
  GLYPHS.set(key, out);
  return out;
}
/**
 * Draw lettering; (x, y) = top-left in card units (centre x when align = 'center'). s = 1 (16 px), 2 or 3 (a clean
 * multiple); bold doubles the strokes a texel over; wob = a marker's unsteady baseline. A line too wide for its cell
 * is tracked in a texel per letter, and nothing is drawn outside the cell. Returns the width in card units.
 */
function ink(p, str, x, y, col, { s = 1, align = 'left', bold = false, wob = 0 } = {}) {
  const P = p.hi || p, k = p.k || 1, size = 16 * s, cell = p.cellBox;
  const gs = [...str].map((ch) => glyph(ch, size));
  let track = 0, W = gs.reduce((a, gl) => a + gl.adv, 0);
  if (cell) { const room = cell[2] * k - 4; while (W + track * (gs.length - 1) > room && track > -2) track--; W += track * (gs.length - 1); }
  let X = Math.round(x * k - (align === 'center' ? W / 2 : 0));
  const Y = Math.round(y * k);
  const inside = (xx, yy) => !cell || (xx >= cell[0] * k && yy >= cell[1] * k && xx < (cell[0] + cell[2]) * k && yy < (cell[1] + cell[3]) * k);
  gs.forEach((gl, i) => {
    const dy = wob ? Math.round(Math.sin(i * 1.3 + wob) * 0.8) : 0;
    for (const [gx, gy] of gl.px) {
      if (inside(X + gx, Y + gy + dy)) P.px(X + gx, Y + gy + dy, col);
      if (bold && inside(X + gx + 1, Y + gy + dy)) P.px(X + gx + 1, Y + gy + dy, col);
    }
    X += gl.adv + track;
  });
  return W / k;
}
/** Vertical JP text (one glyph per line), centred on x. */
function inkV(p, str, cx, y, col, s = 1, gap = 2) {
  let yy = y;
  for (const ch of str) { ink(p, ch, cx, yy, col, { s, align: 'center' }); yy += (16 * s) / (p.k || 1) + gap; }
}

/**
 * The card painter: the same calls as a Pix (px, rect, frame, circle, get) in card units, each texel painted as a
 * k x k block of the real, denser atlas (p.hi), so the art keeps its look while the lettering gets the fine grid.
 */
function blockPainter(P, k) {
  const q = {
    hi: P, k, cellBox: null, get ctx() { return P.ctx; },
    px(x, y, c, a = 255) { x |= 0; y |= 0; for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) P.px(x * k + i, y * k + j, c, a); return q; },
    rect(x, y, w, h, c, a = 255) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) q.px(i, j, c, a); return q; },
    frame(x, y, w, h, c) { for (let i = x; i < x + w; i++) { q.px(i, y, c); q.px(i, y + h - 1, c); } for (let j = y; j < y + h; j++) { q.px(x, j, c); q.px(x + w - 1, j, c); } return q; },
    circle(cx, cy, r, c, a = 255) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) q.px(cx + x, cy + y, c, a); return q; },
    get(x, y) { return P.get(x * k, y * k); },
    flush() { P.flush(); }, pull() { P.pull(); },
  };
  return q;
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
  const ready = fontsReady();
  CARDS = paintCards().done();
  if (!ready) cardFonts.then(() => { GLYPHS.clear(); const B = paintCards(); CARDS.tex.image = B.p.flush().canvas; CARDS.tex.needsUpdate = true; });
  return CARDS;
}

function paintCards() {
  const K = 2, A = new Atlas(512 * K, 256 * K, 91), p = blockPainter(A.p, K);
  // cells are laid out in card units; the atlas stores them K times denser
  const cell = A.cell.bind(A);
  A.cell = (name, x, y, w, h, fn) => { p.cellBox = [x, y, w, h]; cell(name, x * K, y * K, w * K, h * K, () => fn(x, y, w, h)); p.cellBox = null; };
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
    ink(p, '15', x + w / 2, y + 20, RED, { s: 3, align: 'center' }); // (Alagard at a clean 3x)
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
    ink(p, 'MORIO', cx, y + 15, 0x6a6a70, { align: 'center' }); // (the maker's name: our own, never a real brand)
  });
  // breaker panel door face: grey steel, a vent grille and a sticker
  A.cell('breaker', 336, 48, 40, 56, (x, y, w, h) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) p.px(xx, yy, sh(0xc8c8c0, 0.95 + vn(xx, yy, 6, 5) * 0.08));
    p.frame(x, y, w, h, 0x8a8a84); p.frame(x + 1, y + 1, w - 2, h - 2, 0xdcdcd4);
    for (let k = 0; k < 4; k++) p.rect(x + 8, y + 6 + k * 3, w - 16, 1, 0x7a7a74);
    p.rect(x + 6, y + 22, w - 12, 12, 0xf6f4ec); p.frame(x + 6, y + 22, w - 12, 12, RED);
    ink(p, '100V', x + w / 2, y + 25, RED, { align: 'center' });
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
  // the pictures among the cards are real photos (tools/bake-misc.py 'gcard:<cell>')
  p.flush?.();
  for (const k of ['drawCat', 'drawGacha', 'photo']) { const r = A.rects[k]; if (r) drawPrint(p.ctx, 'misc', 'gcard:' + k, r[0], r[1], r[2], r[3]); }
  p.pull?.();
  return A;
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
