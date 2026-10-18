// Pixel-art surfaces for the Shōwa-era shop interior (64 px per metre — twice the garage density).
import * as THREE from 'three';
import { Pix, bumpFrom } from './pix.js';
import { hash2 } from '../core/util.js';

export const SHOP_PPM = 64;
const sh = (c, f) => {
  const r = Math.min(255, ((c >> 16) & 255) * f), g = Math.min(255, ((c >> 8) & 255) * f), b = Math.min(255, (c & 255) * f);
  return (r << 16) | (g << 8) | b;
};

const R = {
  /** Plywood sheets: wavy grain, knots, a sheet seam with screws. */
  plywoodHD() {
    const p = new Pix(128, 128, 41);
    p.fill(0xc49a63);
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
      const w = Math.sin(y * 0.09 + Math.sin(x * 0.05) * 2.2 + x * 0.012) * 0.5 + 0.5;
      if (w > 0.82) p.px(x, y, 0xb08654); else if (w < 0.1) p.px(x, y, 0xd2aa72);
    }
    for (const [kx, ky] of [[30, 40], [92, 96], [70, 18]]) { for (let a = 0; a < 6.28; a += 0.2) p.px(kx + Math.round(Math.cos(a) * 4), ky + Math.round(Math.sin(a) * 2), 0x8a6238); p.rect(kx - 1, ky, 3, 1, 0x6a4628); }
    p.rect(0, 0, 1, 128, 0x7a5634); p.rect(1, 0, 1, 128, 0xd8b080);
    for (let y = 8; y < 128; y += 24) { p.px(4, y, 0x5a5a5a); p.px(5, y, 0x8a8a8a); }
    return p;
  },
  /** Cast concrete wall: form panel seams, tie holes, soft stains. */
  concreteHD() {
    const p = new Pix(128, 128, 42);
    p.fill(0xa8a49c);
    for (let i = 0; i < 9; i++) { const cx = hash2(i, 3) * 128, cy = hash2(i, 4) * 128, r = 10 + hash2(i, 5) * 22, c = hash2(i, 6) < 0.5 ? 0x9e9a92 : 0xb2aea6; for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y < r * r && ((x + y + 128) % 2 === 0)) p.px((Math.round(cx + x) + 128) % 128, (Math.round(cy + y) + 128) % 128, c); }
    p.rect(0, 0, 128, 1, 0x8a867e); p.rect(0, 64, 128, 1, 0x8a867e); p.rect(0, 0, 1, 128, 0x8a867e);
    for (const y of [16, 48, 80, 112]) for (const x of [16, 48, 80, 112]) { p.px(x, y, 0x86827a); p.px(x + 1, y, 0x8e8a82); }
    for (let x = 0; x < 128; x++) if (hash2(x, 9) < 0.35) for (let y = 120; y < 128; y++) if ((x + y) % 2) p.px(x, y, 0x8e8a80);
    return p;
  },
  /** Concrete block wall (ブロック塀): staggered blocks with mortar, chips and a stain or two. */
  blockHD() {
    const p = new Pix(128, 128, 45);
    p.fill(0x8a867e);
    for (let r = 0; r < 8; r++) for (let c = -1; c < 4; c++) {
      const x0 = c * 32 + (r % 2) * 16, y0 = r * 16;
      const base = sh(0xaaa69c, 0.94 + hash2(r, c + 5) * 0.1);
      p.rect(x0 + 1, y0 + 1, 30, 14, base);
      p.rect(x0 + 1, y0 + 1, 30, 1, sh(base, 1.08));
      p.rect(x0 + 1, y0 + 14, 30, 1, sh(base, 0.85));
      for (let k = 0; k < 10; k++) p.px(x0 + 2 + Math.floor(hash2(r * 7 + k, c) * 28), y0 + 2 + Math.floor(hash2(c * 3 + k, r) * 12), sh(base, 0.88));
    }
    for (let x = 0; x < 128; x++) if (hash2(x, 11) < 0.3) for (let y = 110; y < 128; y++) if ((x + y) % 2) p.px(x, y, 0x6e6a5e, 120);
    return p;
  },
  /** Garage floor slab: joints, an oil stain, hairline cracks. */
  floorHD() {
    const p = new Pix(128, 128, 43);
    p.fill(0x9c988e);
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) { const k = hash2(x, y); if (k < 0.06) p.px(x, y, 0x8e8a80); else if (k > 0.95) p.px(x, y, 0xaaa69c); }
    p.rect(0, 0, 128, 2, 0x6e6a62); p.rect(0, 0, 2, 128, 0x6e6a62);
    for (let y = -14; y <= 14; y++) for (let x = -20; x <= 20; x++) { const d = (x * x) / 400 + (y * y) / 196; if (d < 1 && (d < 0.6 || (x + y) % 2)) p.px(70 + x, 80 + y, d < 0.4 ? 0x5e5a54 : 0x76726a); }
    let cx = 20, cy = 30; for (let i = 0; i < 40; i++) { p.px(cx, cy, 0x6a665e); cx += hash2(i, 1) < 0.5 ? 1 : 0; cy += 1; if (hash2(i, 2) < 0.3) cx += 1; }
    return p;
  },
  /** Corrugated steel: ribbed shading with deliberate rust runs. */
  corrugatedHD() {
    const p = new Pix(128, 128, 44);
    const ramp = [0x6e7a80, 0x88949a, 0xa4b0b6, 0x96a2a8, 0x7a868c, 0x606c72, 0x56626a, 0x626e74];
    for (let x = 0; x < 128; x++) p.rect(x, 0, 1, 128, ramp[x % 8]);
    for (let i = 0; i < 6; i++) { const x = Math.floor(hash2(i, 7) * 120); const len = 20 + hash2(i, 8) * 70; for (let y = 0; y < len; y++) { p.px(x, y, 0x8a5a3a, 200 - y * 2); if (y % 3 === 0) p.px(x + 1, y, 0x9a6a46, 120); } }
    for (let y = 0; y < 128; y += 64) for (let x = 2; x < 128; x += 16) { p.px(x, y + 4, 0xd8dcde); p.px(x + 1, y + 4, 0x4a4a4a); }
    return p;
  },
  /** Old varnished floorboards, darker where feet have worn the varnish. */
  shopFloor() {
    const p = new Pix(128, 128, 31);
    const H = 12; // ~19 cm boards
    for (let y0 = 0, k = 0; y0 < 128; y0 += H, k++) {
      const base = sh(0x6e4a2c, 0.9 + hash2(k, 3) * 0.2);
      p.rect(0, y0, 128, H, base);
      // long grain strokes
      for (let y = y0 + 1; y < y0 + H - 1; y++) {
        for (let x = 0; x < 128;) {
          const len = 6 + Math.floor(hash2(x + k * 31, y) * 22);
          if (hash2(y * 7 + k, x) < 0.5) p.line(x, y, Math.min(127, x + len), y, sh(base, 0.88 + hash2(x, y + k) * 0.06));
          x += len + 2;
        }
      }
      p.rect(0, y0, 128, 1, sh(base, 1.15));
      p.rect(0, y0 + H - 1, 128, 1, sh(base, 0.5));
      // staggered butt joints with nail heads
      for (const jx of [Math.floor(hash2(k, 9) * 128), (Math.floor(hash2(k, 9) * 128) + 64) % 128]) {
        p.rect(jx, y0, 1, H, sh(base, 0.5));
        p.px(jx + 2, y0 + 2, 0x3a2a1c); p.px(jx + 2, y0 + H - 3, 0x3a2a1c);
      }
      if (hash2(k, 5) < 0.6) {
        const kx = Math.floor(hash2(k, 6) * 120) + 4, ky = y0 + 3 + Math.floor(hash2(k, 7) * (H - 6));
        p.rect(kx - 2, ky, 5, 1, sh(base, 0.7)); p.px(kx, ky, sh(base, 0.5)); p.px(kx - 1, ky - 1, sh(base, 0.75)); p.px(kx + 1, ky + 1, sh(base, 0.75));
      }
    }
    // varnish sheen streaks
    for (let i = 0; i < 5; i++) { const x0 = Math.floor(hash2(i, 77) * 128); for (let y = 0; y < 128; y++) if ((y + i) % 3) p.px(x0 + Math.floor(y / 9), y, 0xa8805a, 40); }
    return p;
  },
  /** 腰板: vertical dark boards with a batten every 4 boards. */
  koshiita() {
    const p = new Pix(128, 64, 32);
    for (let x0 = 0, k = 0; x0 < 128; x0 += 8, k++) {
      const base = sh(0x4a3020, 0.9 + hash2(k, 1) * 0.18);
      p.rect(x0, 0, 8, 64, base);
      for (let x = x0 + 1; x < x0 + 7; x++) for (let y = 0; y < 64;) { const len = 4 + Math.floor(hash2(x, y + k) * 12); if (hash2(y, x * 3) < 0.45) p.line(x, y, x, Math.min(63, y + len), sh(base, 0.85)); y += len + 2; }
      p.rect(x0, 0, 1, 64, sh(base, 0.55));
      p.rect(x0 + 1, 0, 1, 64, sh(base, 1.12));
    }
    for (let x0 = 0; x0 < 128; x0 += 32) { p.rect(x0, 0, 3, 64, 0x3a2418); p.rect(x0 + 1, 0, 1, 64, 0x5a3c28); }
    return p;
  },
  /** 漆喰: warm off-white plaster with soft trowel arcs (deliberate, not noise). */
  shikkui() {
    const p = new Pix(128, 128, 33);
    p.fill(0xeae4d8);
    // very soft, large tonal patches (hand-troweled plaster), ordered-dithered so they stay pixel-crisp
    const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    for (let i = 0; i < 7; i++) {
      const cx = hash2(i, 1) * 128, cy = hash2(i, 2) * 128, r = 18 + hash2(i, 3) * 26;
      const c = hash2(i, 4) < 0.5 ? 0xe4ddd0 : 0xefeae0;
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
        const d = Math.sqrt(x * x + y * y) / r;
        if (d > 1) continue;
        const X = Math.round(cx + x), Y = Math.round(cy + y);
        if ((1 - d) * 16 * 0.6 > B[((Y & 3) * 4) + (X & 3)]) p.px((X + 128) % 128, (Y + 128) % 128, c);
      }
    }
    return p;
  },
  /** 竿縁天井: board ceiling with thin battens. */
  shopCeiling() {
    const p = new Pix(128, 128, 34);
    for (let x0 = 0, k = 0; x0 < 128; x0 += 16, k++) {
      const base = sh(0x9a7448, 0.92 + hash2(k, 2) * 0.14);
      p.rect(x0, 0, 16, 128, base);
      for (let x = x0 + 1; x < x0 + 15; x++) for (let y = 0; y < 128;) { const len = 8 + Math.floor(hash2(x, y) * 20); if (hash2(y + k, x) < 0.4) p.line(x, y, x, Math.min(127, y + len), sh(base, 0.9)); y += len + 3; }
      p.rect(x0, 0, 1, 128, sh(base, 0.7));
    }
    for (let y0 = 0; y0 < 128; y0 += 32) { p.rect(0, y0, 128, 3, 0x5a3e24); p.rect(0, y0, 128, 1, 0x7a5636); }
    return p;
  },
  /** Dark weathered clapboard (exterior). */
  siding() {
    const p = new Pix(64, 64, 35);
    for (let y0 = 0, k = 0; y0 < 64; y0 += 8, k++) {
      const base = sh(0x3a2c22, 0.9 + hash2(k, 4) * 0.2);
      p.rect(0, y0, 64, 8, base);
      p.rect(0, y0, 64, 1, sh(base, 1.3));
      p.rect(0, y0 + 7, 64, 1, sh(base, 0.5));
      for (let x = 0; x < 64; x += 3) if (hash2(x, k) < 0.4) p.px(x, y0 + 3 + Math.floor(hash2(k, x) * 3), sh(base, 0.8));
    }
    return p;
  },
};

const pixCache = new Map();
const matCache = new Map();
export function shopPix(key) {
  if (!pixCache.has(key)) pixCache.set(key, R[key]());
  return pixCache.get(key);
}

/** Material whose UVs are in metres (geometry UV = world metres). */
export function shopMat(key, opts = {}) {
  const ck = key + JSON.stringify(opts);
  if (matCache.has(ck)) return matCache.get(ck);
  const p = shopPix(key);
  const map = p.texture();
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(SHOP_PPM / p.w, SHOP_PPM / p.h);
  const bump = bumpFrom(p);
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.copy(map.repeat);
  const m = new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: opts.bump ?? 0.8, roughness: opts.roughness ?? 0.8, color: opts.color ?? 0xffffff });
  if (opts.emissive) { m.emissive = new THREE.Color(opts.emissive); m.emissiveMap = map; m.emissiveIntensity = opts.emissiveIntensity ?? 1; }
  matCache.set(ck, m);
  return m;
}
