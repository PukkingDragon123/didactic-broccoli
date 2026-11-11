// Voxel colour upgrade for collectible figures (the owner's "dense voxel figures, upgraded", after The Bear Must Eat):
// every voxel's flat palette colour becomes realistic painted-vinyl pixel art, per voxel:
//  - a hue-shifted 7-step ramp per colour (shadows cool and muted, highlights warm) picked with 3D ordered dithering,
//  - soft low-frequency mottling (cast vinyl / fur / cloth read as material, not flat fills),
//  - top-lit / under-shadowed voxels, darker crevices, paint worn lighter on exposed edges and corners,
//  - a natural, slightly muted grade (no candy colours).
// Glow and glass voxels keep their colour. Runs once per figure model (src/game/collectibles.js), no textures.
import { vnoise, h2 } from '../people/paintlib.js';

const OFF = 512, SY = 1024, SZ = 1048576;
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const RAMPS = new Map();
function ramp(c) {
  let R = RAMPS.get(c);
  if (R) return R;
  let r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  // natural grade: a little desaturated and compressed
  const l = r * 0.3 + g * 0.59 + b * 0.11;
  r = 10 + (r + (l - r) * 0.2) * 0.92; g = 9 + (g + (l - g) * 0.2) * 0.91; b = 8 + (b + (l - b) * 0.2) * 0.88;
  R = [];
  for (let i = 0; i < 7; i++) {
    const f = (i - 3) / 3, k = 1 + f * (f < 0 ? 0.36 : 0.24);
    let rr = r * k, gg = g * k, bb = b * k;
    if (f < 0) { rr -= -f * 9; gg -= -f * 5; bb += -f * 9; } else { rr += f * 12; gg += f * 7; bb -= f * 5; }
    R.push(((rr < 0 ? 0 : rr > 255 ? 255 : rr | 0) << 16) | ((gg < 0 ? 0 : gg > 255 ? 255 : gg | 0) << 8) | (bb < 0 ? 0 : bb > 255 ? 255 : bb | 0));
  }
  RAMPS.set(c, R);
  return R;
}

/**
 * Upgrade the colours of a VoxelModel in place. o.scale: voxels per design voxel (2 for up-resolved figures), which
 * sets the noise and wear sizes so they read the same at every density.
 */
export function upgradeVoxels(model, o = {}) {
  const map = model.map, s = o.scale || 1, f = 0.22 / s;
  const has = (k) => map.has(k);
  const out = [];
  for (const [k, v] of map) {
    const mat = v & 0x8000000 ? (v >>> 24) & 7 : 0;
    if (mat === 3 || mat === 4) continue; // glow, glass
    const x = (k % SY) - OFF, y = (Math.floor(k / SY) % SY) - OFF, z = Math.floor(k / SZ) - OFF;
    // exposure: which of the 6 neighbours are open
    const up = !has(k + SY), dn = !has(k - SY), open = (up ? 1 : 0) + (dn ? 1 : 0) + (has(k + 1) ? 0 : 1) + (has(k - 1) ? 0 : 1) + (has(k + SZ) ? 0 : 1) + (has(k - SZ) ? 0 : 1);
    if (open === 0) continue; // hidden inside: leave as is
    // crevice: count filled voxels on the 12 edge-diagonals (more = tucked in)
    let fill = 0;
    for (const d of [1 + SY, 1 - SY, -1 + SY, -1 - SY, SZ + SY, SZ - SY, -SZ + SY, -SZ - SY, 1 + SZ, 1 - SZ, -1 + SZ, -1 - SZ]) if (has(k + d)) fill++;
    let t = 0;
    t += (vnoise(x * f, (y + z * 0.7) * f, 41) - 0.5) * 0.7 + (vnoise(x * f * 2.6, (y * 1.3 + z) * f * 2.6, 42) - 0.5) * 0.3; // mottling
    if (up) t += 0.18; else if (dn) t -= 0.26;
    if (fill >= 9) t -= 0.16 * ((fill - 8) / 4);
    if (open >= 3 && h2(Math.floor(x / (2 * s)) + 99, Math.floor(y / (2 * s)) * 31 + Math.floor(z / (2 * s)), 43) > 0.55) t += 0.2; // worn edge
    if (mat === 1) t += up ? 0.06 : 0; // gloss catches the light a little more
    if (mat === 2) t += (h2(x, y * 7 + z, 44) - 0.5) * 0.25; // brushed metal
    const R = ramp(v & 0xffffff);
    let u = (0.5 + t) * 6; if (u < 0) u = 0; else if (u > 6) u = 6;
    let i = Math.floor(u);
    if (i < 6 && (B4[(((y & 3) << 2) | ((x + z) & 3))] + 0.5) / 16 < u - i) i++;
    out.push(k, v - (v & 0xffffff) + R[i]);
  }
  for (let i = 0; i < out.length; i += 2) map.set(out[i], out[i + 1]);
  model.jitter = 0; // the colour now carries the variation (no extra random noise from the mesher)
  return model;
}
