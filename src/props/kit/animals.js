// Animals for the prop library, in the same blocky-but-soft low-poly as the people: cats (calico by default), pigeons,
// a crow. Bodies are chamfered boxes and faceted blobs; faces are small pixel prints on the flat front of the head.
import { flat, matte, darken, lighten } from './kit.js';
import { blob } from './shapes.js';

const FUR = { white: 0xeeeae0, orange: 0xe08a3a, black: 0x3a3230, pink: 0xf0a8a8, grey: 0x8a8e96 };

/** A cat's head at (x, y, z) (its centre), facing +z, about `s` wide. coat: { base, ear, patch } */
export function catHead(K, x, y, z, s, coat = {}, o = {}) {
  const base = coat.base ?? FUR.white, w = s, h = s * 0.82, d = s * 0.78;
  K.box(matte(base, 0.1), x - w / 2, y - h / 2, z - d / 2, x + w / 2, y + h / 2, z + d / 2, { bevel: s * 0.16, edge: null });
  // cheeks and muzzle
  K.box(matte(coat.muzzle ?? lighten(base, 0.2), 0.1), x - w * 0.24, y - h * 0.4, z + d * 0.34, x + w * 0.24, y - h * 0.02, z + d / 2 + s * 0.07, { bevel: s * 0.05, edge: null });
  // ears: little wedges, pink inside
  for (const sx of [-1, 1]) {
    const ex = x + sx * w * 0.3, c = sx > 0 ? (coat.earR ?? coat.ear ?? base) : (coat.earL ?? coat.ear ?? base);
    K.prism(flat(c, 0.9), [[ex - s * 0.17, y + h * 0.36], [ex + s * 0.17, y + h * 0.36], [ex + sx * s * 0.07, y + h * 0.8]], { plane: 'xy', a: z - d * 0.16, b: z + d * 0.12 });
    K.tri(flat(FUR.pink, 0.9), [ex - s * 0.09, y + h * 0.4, z + d * 0.125], [ex + s * 0.09, y + h * 0.4, z + d * 0.125], [ex + sx * s * 0.05, y + h * 0.66, z + d * 0.125], [0, 0, 1]);
  }
  // a patch over one eye (calico)
  if (coat.patch) K.box(flat(coat.patch, 0.9), x + w * 0.02, y + h * 0.1, z - d * 0.3, x + w / 2 + 0.001, y + h / 2 + 0.001, z + d / 2 - s * 0.1, { bevel: s * 0.12, edge: null });
  if (coat.patch2) K.box(flat(coat.patch2, 0.9), x - w / 2 - 0.001, y + h * 0.16, z - d * 0.34, x - w * 0.1, y + h / 2 + 0.001, z + d * 0.2, { bevel: s * 0.12, edge: null });
  // the face print
  const eyes = o.eyes ?? 'open';
  const V = K.patch(`catface:${eyes}:${base}`, 28, 18, (V) => {
    V.fill(base);
    const ink = 0x2a2226;
    if (eyes === 'open') for (const i of [5, 19]) { V.box(i, 9, i + 4, 14, ink); V.box(i + 1, 12, i + 2, 13, 0xffffff); V.px(i + 2, 10, 0x6a8a4a); }
    else for (const i of [5, 19]) { V.hline(i, i + 3, 10, ink); V.px(i, 11, ink); V.px(i + 3, 11, ink); }
    V.box(13, 6, 15, 8, 0xe88a8a); V.px(13, 5, ink); V.px(14, 5, ink); V.px(12, 4, ink); V.px(15, 4, ink); V.px(11, 5, ink); V.px(16, 5, ink);
    for (const [i, d] of [[1, 1], [24, -1]]) { V.hline(i, i + 2, 6, 0xb8b0a8); V.hline(i, i + 2, 4, 0xb8b0a8); }
  }, { shared: true });
  K.face(V, '+z', x - w * 0.36, y - h * 0.34, x + w * 0.36, y + h * 0.2, z + d / 2 + s * 0.072);
  return K;
}
/** A cat's tail: a tube of ringed segments along pts (calico tails go orange / black). */
export function catTail(K, pts, r, cols) {
  for (let k = 0; k + 1 < pts.length; k++) K.tube(flat(cols[k % cols.length], 0.9), [pts[k], pts[k + 1]], r * (1 - k * 0.06), 5);
  return K;
}
export const CALICO = { base: FUR.white, patch: FUR.orange, patch2: FUR.black, earL: FUR.black, earR: FUR.orange };
export { FUR };

/** A pigeon standing on (x, y, z), facing +z, about 0.3 long. */
export function pigeon(K, x, y, z, o = {}) {
  const g = o.c ?? 0x8a909c, s = o.s ?? 1, dk = darken(g, 0.3);
  blob(K, flat(g, 0.85), x, y + 0.085 * s, z - 0.01 * s, 0.058 * s, 0.062 * s, 0.11 * s, { fine: true, jit: 0.03, seed: 2 });
  blob(K, flat(0x6f7f8c, 0.6), x, y + 0.13 * s, z + 0.075 * s, 0.04 * s, 0.05 * s, 0.045 * s, { fine: true, jit: 0.02, seed: 4 }); // the green-violet neck
  blob(K, flat(g, 0.85), x, y + 0.178 * s, z + 0.09 * s, 0.034 * s, 0.034 * s, 0.038 * s, { fine: true, jit: 0.02, seed: 5 });
  K.tube(flat(0x3a3a3e, 0.6), [[x, y + 0.176 * s, z + 0.12 * s], [x, y + 0.168 * s, z + 0.152 * s]], 0.009 * s, 4, { r1: 0.002 });
  K.box(flat(0xf2efe6, 0.6), x - 0.008 * s, y + 0.178 * s, z + 0.118 * s, x + 0.008 * s, y + 0.188 * s, z + 0.13 * s);
  for (const sx of [-1, 1]) {
    K.box(flat(0xe8742a, 0.5), x + sx * 0.03 * s, y + 0.182 * s, z + 0.1 * s, x + sx * 0.036 * s, y + 0.194 * s, z + 0.112 * s); // eye
    if (!o.fly) {
      // folded wings with two dark bars, the feet
      blob(K, flat(lighten(g, 0.12), 0.85), x + sx * 0.05 * s, y + 0.09 * s, z - 0.03 * s, 0.018 * s, 0.045 * s, 0.1 * s, { fine: false, jit: 0.04, seed: 7 + sx });
      for (const dz of [-0.05, -0.085]) K.box(flat(dk, 0.85), x + sx * 0.058 * s, y + 0.06 * s, z + dz * s, x + sx * 0.07 * s, y + 0.11 * s, z + (dz + 0.014) * s);
      K.rod(flat(0xd86a5a, 0.7), [x + sx * 0.022 * s, y + 0.03 * s, z], [x + sx * 0.024 * s, y, z + 0.004 * s], 0.005 * s, 4);
      K.box(flat(0xd86a5a, 0.7), x + sx * 0.024 * s - 0.012 * s, y, z - 0.006 * s, x + sx * 0.024 * s + 0.012 * s, y + 0.005 * s, z + 0.03 * s);
    }
  }
  K.box(flat(dk, 0.85), x - 0.03 * s, y + 0.055 * s, z - 0.155 * s, x + 0.03 * s, y + 0.075 * s, z - 0.09 * s, { bevel: 0.006 * s, edge: null }); // tail
  return K;
}
/** A crow perched on (x, y, z), facing +z. */
export function crow(K, x, y, z, s = 1) {
  const c = flat(0x24242a, 0.6);
  blob(K, c, x, y + 0.075 * s, z - 0.01 * s, 0.05 * s, 0.055 * s, 0.1 * s, { fine: true, jit: 0.03, seed: 3 });
  blob(K, c, x, y + 0.145 * s, z + 0.07 * s, 0.036 * s, 0.038 * s, 0.042 * s, { fine: true, jit: 0.02, seed: 6 });
  K.tube(flat(0x3a3a40, 0.5), [[x, y + 0.145 * s, z + 0.1 * s], [x, y + 0.13 * s, z + 0.165 * s]], 0.014 * s, 4, { r1: 0.003 });
  K.box(c, x - 0.028 * s, y + 0.03 * s, z - 0.17 * s, x + 0.028 * s, y + 0.05 * s, z - 0.08 * s, { bevel: 0.005 * s, edge: null });
  for (const sx of [-1, 1]) { K.box(flat(0xd8d8d0, 0.4), x + sx * 0.03 * s, y + 0.152 * s, z + 0.085 * s, x + sx * 0.037 * s, y + 0.162 * s, z + 0.095 * s); K.rod(flat(0x3a3a40, 0.6), [x + sx * 0.02 * s, y + 0.03 * s, z], [x + sx * 0.02 * s, y, z + 0.005 * s], 0.005 * s, 4); }
  return K;
}
