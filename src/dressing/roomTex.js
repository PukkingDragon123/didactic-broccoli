// Pixel-art textures for the dressing room (src/dressing/room.js), painted texel by texel with the game's Pix canvas
// (src/gfx/pix.js): honey floorboards, a warm plaster wall, wood grains for the furniture, a braided rag rug, the view
// out of the window on a spring afternoon in 1999, a lace curtain, washi for the paper lamp, mirror glass, a calendar and
// small cloth patterns for the clothes on the rack. Bright and soft like the rest of the game: pastel, warm lights, lilac
// shade, no black. Everything is nearest-filtered (the stage draws at art resolution: a texel is a pixel or a few).
//   tex(pix, { tile, wrap }) -> THREE.Texture      tile: metres per repeat (for world-UV boxes)
import * as THREE from 'three';
import { Pix } from '../gfx/pix.js';

const h2 = (x, y, s = 0) => { let h = Math.imul(x * 374761393 + y * 668265263 + s * 1013904223, 1274126177); h ^= h >>> 13; return ((Math.imul(h, 1274126177) ^ (h >>> 16)) >>> 0) / 4294967296; };
export const shade = (c, f) => {
  const r = Math.min(255, Math.max(0, Math.round(((c >> 16) & 255) * f))), g = Math.min(255, Math.max(0, Math.round(((c >> 8) & 255) * f))), b = Math.min(255, Math.max(0, Math.round((c & 255) * f)));
  return (r << 16) | (g << 8) | b;
};
export const mix = (a, b, t) => {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255, br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
};
/** Shade toward a lilac shadow instead of black (the game's shade colour). */
const dim = (c, k) => mix(shade(c, 1 - k * 0.55), 0x7a6a9a, k * 0.35);

/** A nearest-filtered sRGB texture; tile = metres one repeat covers (world-UV geometry), wrap = repeat. */
export function tex(p, { tile = 1, wrap = true } = {}) {
  p.flush();
  const t = new THREE.CanvasTexture(p.canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestMipmapNearestFilter;
  if (wrap) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / tile, 1 / tile); }
  return t;
}

// ------------------------------------------------------------------ floor + walls
/** Honey oak floorboards, 2 m tile at 64 px/m: planks run along v, staggered end joints, a grain in each plank. */
export function floorboards() {
  const N = 128, p = new Pix(N, N, 11), pw = 8; // 12.5 cm planks
  const BASE = [0xd8ad78, 0xcfa26e, 0xdcb482, 0xd2a774, 0xc99c68];
  for (let x = 0; x < N; x++) {
    const k = Math.floor(x / pw), base = BASE[Math.floor(h2(k, 3) * BASE.length)];
    const joints = [Math.floor(h2(k, 5) * N), Math.floor(h2(k, 5) * N + N / 2 + h2(k, 9) * 30) % N];
    for (let y = 0; y < N; y++) {
      const seg = y >= Math.min(...joints) && y < Math.max(...joints) ? 1 : 0;
      const b = seg ? mix(base, BASE[Math.floor(h2(k, 7) * BASE.length)], 0.6) : base;
      const gx = x % pw;
      const grain = Math.sin((y * 0.11 + Math.sin(y * 0.045 + k * 2.1) * 2.2 + gx * 0.9) * 1.7);
      let c = shade(b, 0.95 + (grain > 0.82 ? -0.06 : grain < -0.9 ? 0.04 : 0) + h2(x, y, 2) * 0.03);
      if (h2(x >> 1, y >> 2, k) > 0.985) c = shade(b, 0.82); // a knot fleck
      if (gx === 0) c = dim(b, 0.45); // the gap between planks
      else if (gx === 1) c = shade(b, 1.04);
      if (joints.includes(y)) c = dim(b, 0.4);
      p.px(x, y, c);
    }
  }
  return p;
}

/** Warm plaster wall (a sandy juraku finish), 1 m tile at 64 px/m. */
export function plaster() {
  const N = 64, p = new Pix(N, N, 21), B = 0xf3e4c8;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const n = h2(x, y, 4), m = h2(x >> 2, y >> 2, 6);
    p.px(x, y, n > 0.965 ? 0xe2cfae : n < 0.025 ? 0xfaf0dc : shade(B, 0.985 + m * 0.02 + (n - 0.5) * 0.012));
  }
  return p;
}

/** Plain light ceiling boards with battens. */
export function ceiling() {
  const N = 64, p = new Pix(N, N, 31);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const bd = Math.floor(x / 16);
    p.px(x, y, x % 16 === 0 ? 0xb8946a : shade(bd % 2 ? 0xe2c8a0 : 0xdcc29a, 0.97 + h2(x, y, bd) * 0.04));
  }
  return p;
}

/** Wood grain for furniture (1 m tile, 64 px/m): vertical grain, base colour per call. */
export function wood(base = 0xa8744a, seed = 1, plank = 0) {
  const N = 64, p = new Pix(N, N, 41 + seed);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const g = Math.sin((x * 0.42 + Math.sin(y * 0.06 + x * 0.12 + seed) * 2.4) * 1.3);
    let c = shade(base, 0.96 + (g > 0.86 ? -0.07 : g < -0.92 ? 0.05 : 0) + h2(x, y, seed) * 0.03);
    if (plank && x % plank === 0) c = dim(base, 0.35);
    p.px(x, y, c);
  }
  return p;
}

// ------------------------------------------------------------------ the rug
/** A round braided rag rug: concentric braids in pastel rag colours, the braid's twist drawn as slanted dashes. */
export function rug() {
  const N = 128, p = new Pix(N, N, 51), c = N / 2 - 0.5;
  const RINGS = [0xe8b8a8, 0xf2e2c4, 0xb8cca0, 0xe8c87a, 0xf2e2c4, 0xc4b4dc, 0xe8a898, 0xf0dcb8, 0xa8c4b8, 0xe6b48a, 0xd8a8b8];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = x - c, dy = y - c, r = Math.hypot(dx, dy);
    if (r > N / 2 - 0.5) continue;
    const w = 5.4, ring = Math.floor(r / w), u = (r % w) / w;
    const col = r < 6 ? 0xe8c87a : RINGS[ring % RINGS.length];
    const a = Math.atan2(dy, dx) * (r + 4) / 3.2; // the braid's twist: slanted dashes along each ring
    const twist = ((a + u * 2.2) % 2 + 2) % 2;
    let k = twist < 0.35 ? 0.86 : twist < 1.0 ? 1.02 : 0.96;
    if (u < 0.14 || u > 0.9) k *= 0.88; // the seam between braids
    if (r > N / 2 - 3) k *= 0.9;
    p.px(x, y, k < 0.9 ? dim(col, 0.22) : shade(col, k * (0.98 + h2(x, y, 3) * 0.03)));
  }
  return p;
}

// ------------------------------------------------------------------ the window
/** The view out of the window: a pastel spring sky, the neighbours' house in the afternoon sun, a pole and its wires,
 *  and a branch of cherry blossom leaning in from the top right. (w x h texels, about 80 px/m.) */
export function windowView(w = 88, h = 80) {
  const p = new Pix(w, h, 61);
  const SKY = [0x9ec4e6, 0xa8cceb, 0xb4d4ee, 0xc0dcf0, 0xcce2f0, 0xd8e8ee];
  for (let y = 0; y < h; y++) {
    const t = y / (h * 0.62), i = Math.min(SKY.length - 1, Math.floor(t * SKY.length));
    for (let x = 0; x < w; x++) {
      const f = t * SKY.length - i, dither = f > 0.6 && (x + y) % 2 === 0 && i < SKY.length - 1;
      p.px(x, y, SKY[dither ? i + 1 : i]);
    }
  }
  // clouds: lumpy cream clusters, lit from the top right
  const cloud = (cx, cy, s) => {
    for (const [ox, oy, r] of [[0, 0, 4], [5, -2, 5], [10, 0, 4], [4, 2, 4], [-4, 2, 3], [14, 2, 3]]) {
      const R = r * s;
      for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
        if (x * x + y * y > R * R || oy * s + y > 3 * s) continue;
        const X = Math.round(cx + ox * s + x), Y = Math.round(cy + oy * s + y);
        p.px(X, Y, y > R * 0.35 ? 0xe2e6ee : x - y > R * 0.6 ? 0xfff8ec : 0xf6f2ea);
      }
    }
  };
  cloud(12, 14, 1); cloud(54, 9, 0.8);
  // the neighbours' house: a cream mortar wall in the sun, a grey-blue kawara roof over it, a little window with bars
  const roofY = Math.round(h * 0.5);
  for (let y = roofY; y < h; y++) for (let x = 0; x < w; x++) {
    if (y < roofY + 7) {
      const tile = (y - roofY) % 3 === 0 ? 0x5a6a80 : (x + Math.floor((y - roofY) / 3) * 2) % 6 === 0 ? 0x6c7c92 : 0x7a8aa2;
      if (x < w - 30 + (y - roofY) * 2) p.px(x, y, y === roofY ? 0x4a586c : tile);
      else p.px(x, y, (x + y) % 9 === 0 ? 0xd8c8a6 : 0xeedcba); // the next house's wall, further back
    } else {
      p.px(x, y, h2(x, y, 7) > 0.94 ? 0xe0cca4 : (y - roofY) % 9 === 0 ? 0xe4d2ae : 0xf0e0be);
    }
  }
  for (let x = 0; x < w - 30 + 14; x++) p.px(x, roofY + 7, 0xb8a080); // the eaves' shadow line
  for (let y = roofY + 8; y < roofY + 9 + 4; y++) for (let x = 0; x < w - 30 + 14; x++) p.px(x, y, mix(0xf0e0be, 0x9a8aa8, 0.3 - (y - roofY - 8) * 0.07));
  // their window: frosted glass behind iron bars
  const wx = 16, wy = roofY + 16;
  for (let y = 0; y < 14; y++) for (let x = 0; x < 22; x++) {
    const edge = x === 0 || y === 0 || x === 21 || y === 13;
    p.px(wx + x, wy + y, edge ? 0x9a8670 : x % 5 === 2 ? 0x6a6a7a : y < 3 ? 0xc8d4dc : 0xd8e0e4);
  }
  // a utility pole on the right with its wires sagging across the sky
  const px0 = w - 18;
  for (let y = 4; y < h; y++) for (let k = 0; k < 3; k++) p.px(px0 + k, y, k === 0 ? 0xa8a0a0 : k === 1 ? 0x928a8e : 0x7a7480);
  for (let k = -6; k <= 8; k++) p.px(px0 + k, 10, 0x7a7480);
  for (const [y0, sag] of [[10, 5], [14, 4]]) for (let x = 0; x < px0; x++) { const t = x / px0; p.px(x, Math.round(y0 + 2 + Math.sin(t * Math.PI) * sag), 0x6a6476); }
  // a sakura branch leaning in from the top right: a crooked dark branch, blossom in clumps with holes
  const BL = [0xfbe0ea, 0xf4c6d6, 0xe6a6bc, 0xc88aa8];
  const line = (x0, y0, x1, y1, wd) => { const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))); for (let i = 0; i <= n; i++) for (let k = 0; k < wd; k++) p.px(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n) + k, 0x6a4a50); };
  line(w, 2, w - 22, 12, 2); line(w - 14, 7, w - 30, 6, 1); line(w - 22, 12, w - 34, 20, 1);
  for (const [cx, cy, r] of [[w - 6, 4, 5], [w - 18, 8, 5], [w - 28, 5, 4], [w - 34, 19, 4], [w - 24, 15, 4], [w - 2, 12, 4]]) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x, y) / r, hh = h2(cx + x, cy + y, 9);
      if (d > 1 || (d > 0.7 && hh < 0.4) || hh < 0.07) continue;
      const lit = (x - y) / r + (hh - 0.5) * 0.6;
      p.px(cx + x, cy + y, BL[d > 0.85 ? 2 : lit > 0.6 ? 0 : lit > -0.3 ? 1 : 2]);
    }
  }
  for (let n = 0; n < 6; n++) p.px(Math.floor(h2(n, 1, 3) * (w - 20)) + 10, Math.floor(h2(n, 2, 3) * h * 0.45) + 8, BL[n % 2]); // petals adrift
  return p;
}

/** A lace curtain: cream net in soft folds, a band of little lace diamonds, a scalloped hem (alpha: the holes). */
export function lace(w = 24, h = 72) {
  const p = new Pix(w, h, 71);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const fold = Math.sin((x / w) * Math.PI * 4 + 0.6) * 0.5 + 0.5;
    if (y > h - 5 && Math.hypot((x % 6) - 2.5, y - (h - 5)) > 3.2) continue; // scalloped hem
    const band = y > h - 18 && y < h - 7;
    const dia = band && Math.abs((x % 6) - 2.5) + Math.abs(((y - (h - 18)) % 6) - 2.5) < 1.6; // lace diamonds
    if (dia && (x + y) % 2) continue;
    const mesh = !band && (x + y * 3) % 7 === 0 && y % 2 === 0;
    p.px(x, y, mesh ? shade(0xe6dcc8, 0.94) : band ? 0xfaf2e2 : shade(0xf4ecdc, 0.9 + fold * 0.12));
  }
  return p;
}

/** Washi for the paper lamp: warm cream with fibres, lit from inside (a brighter middle in stepped bands). */
export function washi(w = 32, h = 48) {
  const p = new Pix(w, h, 81);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = Math.abs(y / h - 0.5) * 2, band = v < 0.35 ? 0 : v < 0.7 ? 1 : 2;
    let c = [0xfff2d0, 0xfbe6bc, 0xf2d6a8][band];
    if (h2(x, y, 3) > 0.93) c = shade(c, 0.94);
    if (h2(x >> 1, y, 5) > 0.97) c = 0xe8c898; // a fibre
    if (y % 12 === 0) c = 0xc8a070; // the bamboo ribs show through as darker rings
    p.px(x, y, c);
  }
  return p;
}

/** Mirror glass: a cool grey-blue with stepped diagonal streaks (no smooth reflections, no white). */
export function glass(w = 24, h = 72) {
  const p = new Pix(w, h, 91);
  p.fill(0x8ea4b6);
  for (let i = -h; i < h * 2; i++) {
    for (let k = 0; k < 3; k++) p.px(Math.round(i * 0.45) + k + 2, h - 1 - i, 0xa4b8c8);
    p.px(Math.round(i * 0.45) + 9, h - 1 - i, 0xa0b4c4);
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (y > h - 6) p.px(x, y, 0x7e92a6);
  return p;
}

/** A 1999 calendar: a pixel photo of a shrine in spring over the April grid. */
export function calendar(w = 24, h = 36) {
  const p = new Pix(w, h, 101);
  p.fill(0xf8f0e0);
  // the picture: sky, a red torii, pink trees
  for (let y = 2; y < 16; y++) for (let x = 2; x < w - 2; x++) p.px(x, y, y < 9 ? 0xb8d4ec : y < 12 ? 0xf0c8d8 : 0x9ab888);
  for (let x = 6; x < w - 6; x++) { p.px(x, 6, 0xc83a32); p.px(x, 7, 0xa82a2a); }
  for (const x of [8, w - 9]) for (let y = 7; y < 15; y++) p.px(x, y, 0xc83a32);
  p.px(4, 10, 0xf4b0c8); p.px(5, 9, 0xf4b0c8); p.px(w - 5, 10, 0xf4b0c8); p.px(w - 6, 11, 0xe898b0);
  // the month and the grid of days (Sundays in red)
  for (let x = 9; x < 15; x++) p.px(x, 19, 0x3a2a30);
  for (let r = 0; r < 5; r++) for (let d = 0; d < 7; d++) p.px(3 + d * 3, 23 + r * 2.5, d === 0 ? 0xc83a32 : 0x5a4a50);
  for (let x = 0; x < w; x++) { p.px(x, 0, 0xd8c8b0); p.px(x, h - 1, 0xd8c8b0); }
  return p;
}

// ------------------------------------------------------------------ cloth for the clothes on the rack / in the wardrobe
/** A 16 x 16 cloth tile: kind 'plain' | 'stripe' | 'check' | 'dots' | 'flower' | 'denim' | 'knit'. */
export function cloth(col, kind = 'plain', col2 = 0xf4ecdc, seed = 1) {
  const N = 16, p = new Pix(N, N, 111 + seed);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let c = shade(col, 0.97 + h2(x, y, seed) * 0.05);
    if (kind === 'stripe' && x % 6 < 2) c = col2;
    else if (kind === 'check') { const a = x % 8 < 4, b = y % 8 < 4; c = a && b ? col2 : a || b ? mix(col, col2, 0.5) : c; }
    else if (kind === 'dots' && (x % 6 === 2 && y % 6 === 2 || (x + 3) % 6 === 2 && (y + 3) % 6 === 2)) c = col2;
    else if (kind === 'flower') { const fx = (x + (y >> 3) * 4) % 8, fy = y % 8; if ((fx === 3 && fy >= 2 && fy <= 4) || (fy === 3 && fx >= 2 && fx <= 4)) c = fx === 3 && fy === 3 ? 0xf2c44a : col2; }
    else if (kind === 'denim') c = (x + y) % 3 === 0 ? shade(col, 1.12) : c;
    else if (kind === 'knit') c = (x % 4 < 2) !== (y % 2 === 0) ? shade(col, 0.93) : c;
    p.px(x, y, c);
  }
  return p;
}
