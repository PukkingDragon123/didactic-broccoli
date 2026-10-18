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
