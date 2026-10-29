// Desktop wallpapers for CAPSULE OS 98 (small pixel paintings, scaled up crisp by CSS).
import { Pix } from '../../gfx/pix.js';
import { hash2 } from '../../core/util.js';

export const WALLPAPERS = [
  { name: 'Dusk Lane', draw: dusk },
  { name: 'Capsule Teal', draw: teal },
  { name: 'Mikan Nap', draw: mikan },
  { name: 'Star Capsules', draw: stars },
];

const cache = new Map();
export function wallpaperURL(k) {
  k = ((k % WALLPAPERS.length) + WALLPAPERS.length) % WALLPAPERS.length;
  if (!cache.has(k)) {
    const p = new Pix(320, 240, 5 + k);
    WALLPAPERS[k].draw(p);
    p.flush();
    cache.set(k, p.canvas.toDataURL());
  }
  return cache.get(k);
}

function capsule(p, x, y, c, s = 1) {
  const rows = ['.WWW.', 'WWWWW', 'RRRRR', 'CCCCC', '.CCC.'];
  p.sprite(rows, { W: 0xfbf8f0, R: 0x9a9aa8, C: c }, x, y, s);
}

function dusk(p) {
  const { w, h } = p;
  p.gradient(0, 0, w, Math.round(h * 0.75), 0x3a3a7a, 0xffa86a);
  p.circle(Math.round(w * 0.7), Math.round(h * 0.66), 16, 0xffe0a0);
  for (let k = 0; k < 7; k++) { const y = Math.round(h * (0.15 + k * 0.08)), x = Math.round(hash2(k, 1) * w); for (let i = 0; i < 40 + k * 6; i++) p.px((x + i) % w, y, k > 3 ? 0xffc890 : 0xd88aa0); }
  // rooftops + poles
  let x = 0, k = 0;
  while (x < w) { const bw = 30 + Math.floor(hash2(k, 2) * 30), top = Math.round(h * (0.62 + hash2(k, 3) * 0.1)); for (let xx = x; xx < x + bw; xx++) { const t = Math.abs(xx - x - bw / 2) / (bw / 2); for (let y = Math.round(top + t * 6); y < h; y++) p.px(xx, y, 0x2a2238); } if (hash2(k, 4) < 0.6) p.rect(x + 6, top + 12, 5, 4, 0xffd890); x += bw; k++; }
  for (const px of [Math.round(w * 0.22), Math.round(w * 0.85)]) { p.rect(px, Math.round(h * 0.25), 2, h, 0x1a1424); p.rect(px - 8, Math.round(h * 0.3), 18, 1, 0x1a1424); }
  for (let xx = 0; xx < w; xx++) p.px(xx, Math.round(h * 0.33 + Math.sin(xx / w * Math.PI * 2) * 6), 0x1a1424);
  p.text('Capsule', 12, 10, { size: 16, font: '"Alagard", monospace', color: 0xfff4e0, shadow: 0x2a1a3a });
  p.text('OS 98', 12, 26, { size: 16, font: '"Alagard", monospace', color: 0xffd23f, shadow: 0x2a1a3a });
}

function teal(p) {
  const { w, h } = p;
  p.fill(0x2a8a8a);
  for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) if ((xx + y) % 4 === 0) p.px(xx, y, 0x2f9494);
  const cols = [0xff6f91, 0x5cc4ff, 0xffd23f, 0x58c06c, 0xd94fb0, 0xff8c2e];
  for (let y = 8, r = 0; y < h; y += 26, r++) for (let xx = (r % 2) * 18 + 8; xx < w; xx += 36) capsule(p, xx, y, cols[(xx / 18 + r) % cols.length | 0]);
  p.rect(Math.round(w / 2) - 60, Math.round(h / 2) - 22, 120, 44, 0x1f6a6a);
  p.text('Capsule OS 98', Math.round(w / 2), Math.round(h / 2) - 8, { size: 16, font: '"Alagard", monospace', color: 0xffffff, align: 'center', shadow: 0x0a3a3a });
}

function mikan(p) {
  const { w, h } = p;
  p.gradient(0, 0, w, h, 0xffe0b0, 0xffb070);
  // paw prints
  for (let i = 0; i < 26; i++) { const x = Math.round(hash2(i, 1) * w), y = Math.round(hash2(i, 2) * h); p.circle(x, y, 2, 0xffc890); for (const [dx, dy] of [[-3, -3], [0, -4], [3, -3]]) p.px(x + dx, y + dy, 0xffc890); }
  // a sleeping calico on a cushion
  const cx = Math.round(w / 2), cy = Math.round(h * 0.62);
  p.rect(cx - 50, cy + 8, 100, 14, 0xd8643a); p.rect(cx - 48, cy + 8, 96, 2, 0xe8845a);
  for (let y = -16; y <= 8; y++) for (let x = -38; x <= 38; x++) {
    if ((x / 38) ** 2 + (y / 16) ** 2 > 1) continue;
    const n = hash2(Math.floor((x + 40) / 9), Math.floor((y + 20) / 7));
    p.px(cx + x, cy + y, n > 0.7 ? 0xf08a3a : n < 0.2 ? 0x3a2e2a : 0xfbf6ec);
  }
  for (let y = -10; y <= 6; y++) for (let x = -14; x <= 14; x++) if ((x / 14) ** 2 + (y / 10) ** 2 <= 1) p.px(cx + 30 + x, cy - 4 + y, x < 0 ? 0xfbf6ec : 0xf08a3a);
  p.rect(cx + 22, cy - 18, 4, 5, 0xf08a3a); p.rect(cx + 36, cy - 18, 4, 5, 0x3a2e2a);
  p.rect(cx + 24, cy - 4, 4, 1, 0x3a2e2a); p.rect(cx + 33, cy - 4, 4, 1, 0x3a2e2a);
  p.text('z', cx + 48, cy - 34, { size: 16, font: '"Alagard", monospace', color: 0x8a5a3a });
  p.text('Z', cx + 58, cy - 50, { size: 16, font: '"Alagard", monospace', color: 0x8a5a3a });
}

function stars(p) {
  const { w, h } = p;
  p.gradient(0, 0, w, h, 0x0a0a2a, 0x2a1a4a);
  for (let i = 0; i < 160; i++) p.px(Math.round(hash2(i, 3) * w), Math.round(hash2(i, 4) * h), hash2(i, 5) < 0.2 ? 0xffe8a0 : 0xc8d8ff);
  const cols = [0xff6f91, 0x5cc4ff, 0xffd23f, 0x58c06c, 0xd94fb0];
  for (let i = 0; i < 9; i++) capsule(p, Math.round(hash2(i, 8) * (w - 20)), Math.round(hash2(i, 9) * (h - 20)), cols[i % cols.length], 2);
  p.circle(Math.round(w * 0.8), Math.round(h * 0.22), 14, 0xfff4c8); p.circle(Math.round(w * 0.8) + 5, Math.round(h * 0.22) - 3, 12, 0x0a0a2a);
}
