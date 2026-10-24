// Shared painting helpers for the humans: hashing, colour maths, hair strands, fabric.
// Colours are [r, g, b] arrays in sRGB 0..255; painters write into a reusable Float32Array(4) (r, g, b, a).

export const hex = (c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
export const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
export const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
export const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const mulc = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const G = (x, y, sx, sy) => { const e = (x * x) / (2 * sx * sx) + (y * y) / (2 * sy * sy); return e > 9 ? 0 : Math.exp(-e); };

/** Integer hash -> [0, 1). */
export function h2(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** Smooth value noise in 2D (bilinear between hashed lattice points). */
export function vnoise(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = h2(xi, yi, s), b = h2(xi + 1, yi, s), c = h2(xi, yi + 1, s), d = h2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** out = colour c * k (with a warm shadow shift so skin / fabric shadows don't go grey). */
export function shadeInto(o, c, k, warm = 0.12) {
  const d = 1 - k;
  o[0] = c[0] * k * (1 + d * warm); o[1] = c[1] * k * (1 + d * warm * 0.2); o[2] = c[2] * k * (1 - d * warm * 0.9);
  return o;
}
/** Blend colour c over o with alpha t. */
export function over(o, c, t) {
  if (t <= 0) return o;
  if (t > 1) t = 1;
  o[0] += (c[0] - o[0]) * t; o[1] += (c[1] - o[1]) * t; o[2] += (c[2] - o[2]) * t;
  return o;
}

/**
 * Hair strands: u runs across strands (texels), v along them. k = light (1 normal). Returns into o.
 * hair: { col, hi } — base colour and sheen colour.
 */
export function hairPx(o, hair, u, v, k = 1, sheen = 0) {
  const s = Math.floor(u);
  const ha = h2(s, 7, 3), hb = h2(s >> 1, 9, 4);
  const strand = ha * 0.55 + hb * 0.45; // per-strand tone
  const along = 0.5 + 0.5 * Math.sin(v * 0.33 + ha * 6.28) * Math.sin(v * 0.11 + hb * 4);
  let t = 0.72 + strand * 0.42 + (along - 0.5) * 0.3;
  // clumps: darker gaps between hair locks
  const clump = Math.sin((u + Math.sin(v * 0.12 + s * 0.7) * 1.6) * 0.9);
  if (clump < 0) t += clump * 0.18;
  const c = hair.col, kt = t * k;
  o[0] = c[0] * kt; o[1] = c[1] * kt; o[2] = c[2] * kt; o[3] = 255;
  if (sheen > 0) {
    const sh = sheen * (0.55 + strand * 0.9) * (0.6 + along * 0.8);
    over(o, hair.hi, sh < 0.85 ? sh : 0.85);
  }
  return o;
}
/** o *= k (with the same warm shadow shift as shadeInto). */
export function scaleO(o, k, warm = 0.12) {
  const d = 1 - k;
  o[0] *= k * (1 + d * warm); o[1] *= k * (1 + d * warm * 0.2); o[2] *= k * (1 - d * warm * 0.9);
  return o;
}

export const SKIN_SHADOW = [150, 70, 60];
