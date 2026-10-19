// Pixel-art surfaces for the Shōwa-era shop interior (64 px per metre — twice the garage density).
import * as THREE from 'three';
import { Pix, bumpFrom } from './pix.js';
import { hash2 } from '../core/util.js';

export const SHOP_PPM = 64;
const sh = (c, f) => {
  const r = Math.min(255, ((c >> 16) & 255) * f), g = Math.min(255, ((c >> 8) & 255) * f), b = Math.min(255, (c & 255) * f);
  return (r << 16) | (g << 8) | b;
};

// wrap-around pixel helpers so stains and seams tile seamlessly
const wpx = (p, x, y, c, a = 255) => p.px(((Math.round(x) % p.w) + p.w) % p.w, ((Math.round(y) % p.h) + p.h) % p.h, c, a);
/** Darken/lighten the existing pixel (wrapping). */
const wmul = (p, x, y, f) => {
  x = ((Math.round(x) % p.w) + p.w) % p.w; y = ((Math.round(y) % p.h) + p.h) % p.h;
  const [r, g, b] = p.get(x, y);
  p.px(x, y, [Math.min(255, r * f), Math.min(255, g * f), Math.min(255, b * f)]);
};
/** Ordered-dither soft patch of colour c (strength 0..1 at the centre). */
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function patch(p, cx, cy, rx, ry, c, k = 0.6) {
  for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
    const d = Math.sqrt((x / rx) ** 2 + (y / ry) ** 2);
    if (d > 1) continue;
    const X = Math.round(cx + x), Y = Math.round(cy + y);
    if ((1 - d) * 16 * k > B4[((Y & 3) * 4) + (X & 3)]) wpx(p, X, Y, c);
  }
}
/** Vertical run (rain / rust streak) that fades and narrows as it falls. */
function streak(p, x, y, len, c, a0 = 140, wobble = 0.25, seed = 1) {
  let xx = x;
  for (let i = 0; i < len; i++) {
    const a = a0 * (1 - i / len);
    wpx(p, xx, y + i, c, a);
    if (i < len * 0.4) wpx(p, xx + 1, y + i, c, a * 0.5);
    if (hash2(i + seed * 31, seed) < wobble * 0.2) xx += hash2(i, seed + 3) < 0.5 ? -1 : 1;
  }
}
/** Hairline crack: a wandering 1px line. */
function crack(p, x, y, len, c, dir = 1, seed = 1) {
  let xx = x, yy = y;
  for (let i = 0; i < len; i++) {
    wpx(p, xx, yy, c);
    if (hash2(i, seed) < 0.12) wpx(p, xx + 1, yy, sh(c, 1.25));
    yy += 1;
    const r = hash2(i + 7, seed);
    if (r < 0.3) xx += dir; else if (r < 0.42) xx -= dir;
  }
}

const R = {
  /** Plywood sheets (2 m × 4 m tile): rotary-cut figure, football patches, sheet seams with screws, scuffs, a damp tide line. */
  plywoodHD() {
    const p = new Pix(128, 256, 41);
    for (let sheet = 0; sheet < 2; sheet++) {
      const x0 = sheet * 64, base = sheet ? 0xc8a068 : 0xc0965e;
      for (let y = 0; y < 256; y++) for (let x = x0; x < x0 + 64; x++) {
        // wide wavy rotary-peel figure + fine grain lines
        const w = Math.sin(y * 0.07 + Math.sin(x * 0.045 + sheet * 2) * 2.6 + x * 0.015 + sheet) * 0.5 + 0.5;
        const fine = hash2(x * 3 + sheet, y >> 2) < 0.08;
        let c = base;
        if (w > 0.86) c = sh(base, 0.86); else if (w > 0.78) c = sh(base, 0.93); else if (w < 0.08) c = sh(base, 1.07);
        if (fine) c = sh(c, 0.94);
        p.px(x, y, c);
      }
      // cathedral arcs
      for (let k = 0; k < 3; k++) {
        const cx = x0 + 14 + hash2(sheet, k) * 36, cy = 30 + k * 80 + hash2(k, sheet) * 20;
        for (let a = -1.2; a <= 1.2; a += 0.04) for (const r of [10, 14, 18]) wpx(p, cx + Math.sin(a) * r * 0.8, cy + Math.cos(a) * r * 1.6 - r, sh(base, 0.82));
      }
      // knots and a boat-shaped patch repair
      for (let k = 0; k < 2; k++) {
        const kx = x0 + 10 + Math.floor(hash2(sheet + 5, k) * 44), ky = 20 + Math.floor(hash2(k, sheet + 9) * 210);
        for (let a = 0; a < 6.28; a += 0.25) wpx(p, kx + Math.cos(a) * 3, ky + Math.sin(a) * 2, 0x8a6238);
        p.rect(kx - 1, ky, 3, 1, 0x5e3e22); wpx(p, kx, ky - 1, 0x6a4628);
      }
      const px0 = x0 + 20 + Math.floor(hash2(sheet, 44) * 20), py0 = 60 + Math.floor(hash2(sheet, 45) * 120);
      for (let y = -4; y <= 4; y++) { const hw = Math.round(9 * Math.sqrt(1 - (y / 4.5) ** 2)); for (let x = -hw; x <= hw; x++) wpx(p, px0 + x, py0 + y, x === -hw || x === hw || Math.abs(y) === 4 ? sh(base, 0.8) : sh(base, 1.04)); }
      // seam (dark gap + bevelled edges) and screws every 16 px with a little rust halo
      p.rect(x0, 0, 1, 256, 0x5a3e24); p.rect(x0 + 1, 0, 1, 256, sh(base, 1.12)); p.rect(x0 + 63, 0, 1, 256, sh(base, 0.82));
      for (let y = 6; y < 256; y += 20) {
        for (const sx of [x0 + 3, x0 + 61]) { wpx(p, sx, y, 0x4a4a4a); wpx(p, sx + 1, y, 0x9a9a9a); wpx(p, sx, y + 1, 0x7a5a3a, 120); if (hash2(sx, y) < 0.3) streak(p, sx, y + 2, 6 + hash2(y, sx) * 8, 0x7a5030, 90, 0, sx + y); }
      }
      // middle nailing line (studs behind)
      for (let y = 12; y < 256; y += 24) { wpx(p, x0 + 32, y, 0x5a5a5a); wpx(p, x0 + 33, y, 0x8a8a8a); }
    }
    // horizontal seam at 2 m
    p.rect(0, 127, 128, 1, 0x5a3e24); p.rect(0, 128, 128, 1, 0xd8b080);
    // scuffs, pencil marks, drawing-pin holes, tape residue
    for (let i = 0; i < 26; i++) { const x = hash2(i, 61) * 128, y = 140 + hash2(i, 62) * 110; p.line(x, y, x + 3 + hash2(i, 63) * 6, y + (hash2(i, 64) < 0.5 ? 0 : 1), 0x9a7448, 120); }
    for (let i = 0; i < 8; i++) { const x = hash2(i, 71) * 120, y = 40 + hash2(i, 72) * 120; p.line(x, y, x + 5, y, 0x5a5050, 90); }
    for (let i = 0; i < 30; i++) wpx(p, hash2(i, 81) * 128, 70 + hash2(i, 82) * 120, 0x4a3a2a);
    for (let i = 0; i < 3; i++) { const x = 10 + hash2(i, 91) * 100, y = 90 + hash2(i, 92) * 60; p.rect(x, y, 6, 2, 0xe0c890, 150); }
    // damp tide line near the floor (wavy), darker below
    for (let x = 0; x < 128; x++) {
      const top = 236 + Math.round(Math.sin(x * 0.21) * 2 + Math.sin(x * 0.07 + 1) * 3);
      wpx(p, x, top, 0x7a5634, 170);
      for (let y = top + 1; y < 256; y++) wmul(p, x, y, (x + y) % 2 ? 0.86 : 0.9);
    }
    return p;
  },
  /** Cast concrete (2 m × 4 m tile): form panel seams, Pコン tie holes with rust tears, rain streaks, efflorescence, cracks. */
  concreteHD() {
    const p = new Pix(128, 256, 42);
    p.fill(0xa8a49c);
    // large soft mottling in three tones
    for (let i = 0; i < 16; i++) patch(p, hash2(i, 3) * 128, hash2(i, 4) * 256, 12 + hash2(i, 5) * 22, 10 + hash2(i, 8) * 30, [0x9e9a92, 0xb0aca4, 0xa29e95][i % 3], 0.75);
    // pinholes (air bubbles)
    for (let i = 0; i < 260; i++) { const x = hash2(i, 11) * 128, y = hash2(i, 12) * 256; wpx(p, x, y, 0x86827a); if (hash2(i, 13) < 0.3) wpx(p, x + 1, y, 0xbab6ae); }
    // panel seams (1 m × 2 m panels) with a slight lip
    for (const x of [0, 64]) { p.rect(x, 0, 1, 256, 0x86827a); p.rect(x + 1, 0, 1, 256, 0xb6b2aa); }
    for (const y of [0, 128]) { p.rect(0, y, 128, 1, 0x86827a); p.rect(0, y + 1, 128, 1, 0xb4b0a8); }
    // tie holes: recessed cones with a mortar plug, some leaking rust
    for (const y of [32, 96, 160, 224]) for (const x of [16, 48, 80, 112]) {
      p.circle(x, y, 2, 0x8e8a82); p.circle(x, y, 1, 0x76726a); wpx(p, x - 1, y - 1, 0x6a665e); wpx(p, x + 1, y + 1, 0xbcb8b0);
      if (hash2(x, y) < 0.35) streak(p, x, y + 3, 10 + hash2(y, x) * 26, 0x8a5a3a, 110, 0.3, x + y);
    }
    // rain streaks from the top, grey-black
    for (let i = 0; i < 22; i++) streak(p, hash2(i, 21) * 128, 50 + hash2(i, 22) * 30, 30 + hash2(i, 23) * 120, 0x7a766e, 70 + hash2(i, 24) * 50, 0.4, i + 3);
    // efflorescence under the horizontal seam
    for (let x = 0; x < 128; x++) if (hash2(x, 31) < 0.4) for (let y = 130; y < 130 + hash2(x, 32) * 9; y++) wpx(p, x, y, 0xe6e2da, 110 - (y - 130) * 10);
    // cracks
    crack(p, 30, 140, 46, 0x6e6a62, 1, 3); crack(p, 98, 20, 30, 0x6e6a62, -1, 4); crack(p, 70, 190, 24, 0x6e6a62, 1, 5);
    // honeycomb (rock pocket) and a patched repair
    for (let i = 0; i < 40; i++) wpx(p, 92 + hash2(i, 41) * 12, 200 + hash2(i, 42) * 6, hash2(i, 43) < 0.5 ? 0x6e6a62 : 0x5e5a52);
    patch(p, 40, 70, 8, 5, 0xb8b4a8, 0.9);
    // splash dirt and moss at the foot
    for (let x = 0; x < 128; x++) for (let y = 244; y < 256; y++) if ((x + y) % 2 || y > 250) wmul(p, x, y, 0.84 - (y - 244) * 0.008);
    for (let i = 0; i < 70; i++) wpx(p, hash2(i, 51) * 128, 248 + hash2(i, 52) * 8, hash2(i, 53) < 0.5 ? 0x5a6a3a : 0x4a5a32);
    return p;
  },
  /** Concrete block wall (ブロック塀): staggered porous blocks, chipped corners, efflorescence, moss and splash dirt at the foot. */
  blockHD() {
    const p = new Pix(128, 128, 45);
    p.fill(0x7e7a72);
    for (let r = 0; r < 8; r++) for (let c = -1; c < 4; c++) {
      const x0 = c * 32 + (r % 2) * 16, y0 = r * 16;
      const base = sh(0xaaa69c, 0.92 + hash2(r, c + 5) * 0.12);
      for (let y = 1; y < 15; y++) for (let x = 1; x < 31; x++) {
        const k = hash2(x0 + x, y0 + y);
        wpx(p, x0 + x, y0 + y, k < 0.1 ? sh(base, 0.86) : k > 0.94 ? sh(base, 1.08) : base);
      }
      for (let x = 1; x < 31; x++) { wpx(p, x0 + x, y0 + 1, sh(base, 1.1)); wpx(p, x0 + x, y0 + 14, sh(base, 0.84)); }
      for (let y = 1; y < 15; y++) { wpx(p, x0 + 1, y0 + y, sh(base, 1.05)); wpx(p, x0 + 30, y0 + y, sh(base, 0.88)); }
      // chipped corners
      if (hash2(r, c + 11) < 0.4) { wpx(p, x0 + 1, y0 + 1, 0x7e7a72); wpx(p, x0 + 2, y0 + 1, sh(base, 0.8)); }
      if (hash2(r, c + 12) < 0.3) { wpx(p, x0 + 30, y0 + 14, 0x7e7a72); wpx(p, x0 + 29, y0 + 14, sh(base, 0.8)); }
      // efflorescence bleeding from the bed joint
      if (hash2(r, c + 13) < 0.3) for (let x = 4; x < 26; x++) if (hash2(x, r + c) < 0.5) for (let y = 15; y > 15 - hash2(x, c) * 5; y--) wpx(p, x0 + x, y0 + y, 0xe2ded4, 90);
    }
    // black mould streaks running down the face
    for (let i = 0; i < 9; i++) streak(p, hash2(i, 61) * 128, hash2(i, 62) * 40, 20 + hash2(i, 63) * 60, 0x4a4840, 80, 0.3, i + 9);
    crack(p, 84, 10, 50, 0x5e5a52, 1, 7);
    // splash dirt and moss at the foot
    for (let x = 0; x < 128; x++) for (let y = 112; y < 128; y++) if ((x * 3 + y) % 3 === 0 || y > 120) wmul(p, x, y, 0.88 - (y - 112) * 0.01);
    for (let i = 0; i < 120; i++) { const x = hash2(i, 71) * 128, y = 116 + hash2(i, 72) * 12; wpx(p, x, y, [0x5a7038, 0x4a6030, 0x6a8040][i % 3]); }
    return p;
  },
  /** Garage floor slab: joints, an oil stain, tyre scuffs, hairline cracks. */
  floorHD() {
    const p = new Pix(128, 128, 43);
    p.fill(0x9c988e);
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) { const k = hash2(x, y); if (k < 0.06) p.px(x, y, 0x8e8a80); else if (k > 0.95) p.px(x, y, 0xaaa69c); }
    for (let i = 0; i < 6; i++) patch(p, hash2(i, 5) * 128, hash2(i, 6) * 128, 14, 10, i % 2 ? 0x96928a : 0xa4a096, 0.6);
    p.rect(0, 0, 128, 2, 0x6e6a62); p.rect(0, 0, 2, 128, 0x6e6a62);
    for (let y = -14; y <= 14; y++) for (let x = -20; x <= 20; x++) { const d = (x * x) / 400 + (y * y) / 196; if (d < 1 && (d < 0.6 || (x + y) % 2)) p.px(70 + x, 80 + y, d < 0.4 ? 0x5e5a54 : 0x76726a); }
    for (let i = 0; i < 5; i++) wpx(p, 96 + hash2(i, 9) * 10, 40 + hash2(i, 10) * 10, 0x6a665e);
    for (const x0 of [20, 34]) for (let y = 0; y < 128; y++) if (hash2(x0, y) < 0.35) wpx(p, x0 + Math.round(Math.sin(y * 0.05) * 2), y, 0x8a867c);
    let cx = 20, cy = 30; for (let i = 0; i < 40; i++) { p.px(cx, cy, 0x6a665e); cx += hash2(i, 1) < 0.5 ? 1 : 0; cy += 1; if (hash2(i, 2) < 0.3) cx += 1; }
    return p;
  },
  /** Corrugated steel: ribbed shading, purlin fastener rows with washers, rust runs, chalky paint wear, an overlap seam. */
  corrugatedHD() {
    const p = new Pix(128, 128, 44);
    const ramp = [0x6e7a80, 0x86929a, 0xa2aeb4, 0xaab6bc, 0x96a2a8, 0x7a868c, 0x606c72, 0x58646a];
    for (let x = 0; x < 128; x++) for (let y = 0; y < 128; y++) {
      // gentle dents bend the rib shading
      const dent = Math.round(Math.sin(y * 0.11 + x * 0.02) * 0.6 + (hash2(x >> 3, y >> 4) < 0.08 ? 1 : 0));
      p.px(x, y, ramp[(x + dent + 8) % 8]);
    }
    // chalky paint loss patches (lighter, flatter)
    for (let i = 0; i < 7; i++) patch(p, hash2(i, 3) * 128, hash2(i, 4) * 128, 5 + hash2(i, 5) * 8, 4 + hash2(i, 6) * 10, 0xb4bcbe, 0.55);
    // overlap seam
    p.rect(0, 0, 1, 128, 0x3e484e); p.rect(1, 0, 1, 128, 0xc4ccd0);
    // purlin fastener rows (bolt on every other crest) with washers and rust tears
    for (const y of [10, 74]) for (let x = 3; x < 128; x += 16) {
      wpx(p, x - 1, y, 0x4a4e50); wpx(p, x + 1, y, 0x4a4e50); wpx(p, x, y - 1, 0x4a4e50); wpx(p, x, y + 1, 0x4a4e50);
      wpx(p, x, y, 0xdcdfe0);
      if (hash2(x, y) < 0.55) streak(p, x, y + 2, 12 + hash2(y, x) * 40, 0x8a4a26, 180, 0.15, x * 7 + y);
    }
    // long rust runs down a few valleys + rusty foot
    for (let i = 0; i < 5; i++) { const x = Math.floor(hash2(i, 7) * 15) * 8 + 6; streak(p, x, hash2(i, 9) * 40, 30 + hash2(i, 8) * 70, 0x9a5a32, 150, 0, i + 40); }
    for (let x = 0; x < 128; x++) for (let y = 118; y < 128; y++) if (hash2(x, y) < (y - 116) / 14) wpx(p, x, y, hash2(x, y + 1) < 0.5 ? 0x8a4a26 : 0x6a3a1e, 160);
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
