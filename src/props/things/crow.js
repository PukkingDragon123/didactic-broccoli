// A jungle crow (hashibuto-garasu) for prop models: the heavy arched bill and the steep forehead, a glossy blue-black
// coat painted feather by feather, the wings folded along the back with their primaries crossing over the tail, a
// graduated tail, the thigh feathers, and scaly black legs gripping with three toes forward and one back.
//   jungleCrow(K, x, y, z, s)  standing on (x, y, z) facing +z, about 0.42 m beak to tail at s = 1 (call inside K.at)
import { mat, flat, matte } from '../kit/kit.js';
import { loft, ellipse } from './form.js';

const INK = 0x16171e, BLUE = 0x2a3046, SHEEN = 0x3c4668, VIO = 0x34304a;

function ring(cx, cy, cz, rx, ry, n = 12) { return ellipse(rx, ry, n).map(([x, y]) => [cx + x, cy + y, cz]); }

export function jungleCrow(K, x, y, z, s = 1) {
  K.at([x, y, z], () => {
    const coat = K.view('crowcoat', { u: (p) => p[2], v: (p) => p[1], u0: -0.24, u1: 0.22, v0: -0.01, v1: 0.24, ppm: 420, rough: 0.42 }, (V) => {
      V.fill(INK);
      // scalloped contour feathers on the body: rows of little arcs, the sheen on their upper edges
      for (let j = 20; j < 70; j += 5) for (let i = 70 + ((j / 5) % 2) * 3; i < 150; i += 6) { V.hline(i, i + 3, j, BLUE); V.px(i + 1, j + 1, SHEEN); V.px(i - 1, j - 1, VIO); }
      // the folded wing: coverts in rows, then the long primaries and secondaries running back
      for (let k = 0; k < 7; k++) { const j = 48 - k * 3; V.hline(25 + k * 4, 130 - k * 6, j, k % 2 ? BLUE : SHEEN); }
      for (let k = 0; k < 5; k++) V.hline(4 + k * 3, 60, 34 - k * 2, VIO);
      // the head: fine feathering, a lighter sheen over the crown
      for (let j = 66; j < 84; j += 3) for (let i = 140; i < 186; i += 4) V.px(i + (j % 2), j, j > 76 ? SHEEN : BLUE);
    });
    const c = coat, bill = mat(0x14141a, 0.32, 0x3a3c44), leg = mat(0x1c1c22, 0.6, 0x34343c);
    // the body: sections along the length, tail root to the throat
    const B = [[-0.1, 0.086, 0.018, 0.016], [-0.075, 0.088, 0.04, 0.036], [-0.035, 0.095, 0.053, 0.05], [0.005, 0.106, 0.056, 0.056], [0.04, 0.12, 0.05, 0.052], [0.066, 0.138, 0.037, 0.04], [0.084, 0.156, 0.031, 0.034], [0.096, 0.168, 0.031, 0.034]];
    loft(K, c, B.map(([zz, cy, rx, ry]) => ring(0, cy, zz, rx, ry)));
    // the head: a domed skull, the steep forehead, the cheeks
    K.ball(c, 0, 0.175, 0.105, 0.035, 0.034, 0.042, 12, 5);
    K.ball(c, 0, 0.188, 0.122, 0.024, 0.022, 0.024, 10, 4);
    // the bill: deep at the base, the culmen arching down to a hooked tip
    const bs = [];
    for (let k = 0; k <= 6; k++) {
      const t = k / 6, zz = 0.128 + t * 0.072, cy = 0.176 - t * t * 0.022 - t * 0.004, rx = 0.012 * (1 - t * 0.82), ry = 0.0175 * (1 - t * 0.78);
      bs.push(ring(0, cy, zz, Math.max(0.0012, rx), Math.max(0.0012, ry), 10));
    }
    loft(K, bill, bs);
    K.ball(bill, 0, 0.152, 0.2, 0.002, 0.003, 0.003, 6, 2);
    K.box(flat(0x24242c, 0.5), -0.0125, 0.172, 0.13, 0.0125, 0.1725, 0.172); // the gape line
    // nasal bristles over the base of the bill
    for (const sx of [-1, 1]) K.ball(matte(0x20222c, 0), sx * 0.006, 0.186, 0.133, 0.009, 0.006, 0.014, 8, 3);
    // eyes: dark brown with a wet glint
    for (const sx of [-1, 1]) { K.ball(mat(0x2a1a14, 0.12), sx * 0.029, 0.183, 0.116, 0.0055, 0.0055, 0.005, 8, 3); K.ball(flat(0xc8ccd4, 0.1), sx * 0.033, 0.185, 0.118, 0.0012, 0.0012, 0.0012, 4, 2); }
    // the folded wings, primaries crossing over the tail
    for (const sx of [-1, 1]) {
      const W = [[0.055, 0.13, 0.044, 0.012, 0.03], [0.01, 0.12, 0.056, 0.015, 0.038], [-0.05, 0.103, 0.052, 0.011, 0.032], [-0.11, 0.088, 0.034, 0.007, 0.02], [-0.16, 0.08, 0.016, 0.004, 0.01], [-0.19, 0.078, 0.008, 0.0015, 0.004]];
      loft(K, c, W.map(([zz, cy, cx, rx, ry]) => ring(sx * cx, cy, zz, rx, ry, 10)));
    }
    // the tail: a graduated fan of feathers, a little drooped
    const tail = K.view('crowtail', { u: (p) => p[0], v: (p) => -p[2], u0: -0.045, u1: 0.045, v0: 0.08, v1: 0.24, ppm: 500, rough: 0.42 }, (V) => { V.fill(INK); for (let k = -3; k <= 3; k++) V.vline(22 + k * 6, 0, 80, k % 2 ? BLUE : SHEEN); });
    K.at([0, 0.085, -0.09], () => {
      for (let k = -3; k <= 3; k++) {
        const len = 0.135 - Math.abs(k) * 0.012, xs = k * 0.0085;
        K.prism(tail, [[xs - 0.007, 0], [xs + 0.007, 0], [xs * 1.6 + 0.008, -len + 0.01], [xs * 1.6, -len], [xs * 1.6 - 0.008, -len + 0.01]].map(([u, v]) => [u, v]), { plane: 'xz', a: -0.002 - Math.abs(k) * 0.0006, b: 0.002 - Math.abs(k) * 0.0006 });
      }
    }, { rx: 0.2 });
    // the thighs and the legs: scaly tarsi, three toes forward, one back, hooked claws
    for (const sx of [-1, 1]) {
      K.ball(c, sx * 0.024, 0.075, 0.005, 0.02, 0.026, 0.026, 8, 4);
      K.tube(leg, [[sx * 0.024, 0.058, 0.002], [sx * 0.023, 0.03, 0.006], [sx * 0.022, 0.006, 0.01]], 0.0042, 6, { r1: 0.0036 });
      for (let r = 0; r < 4; r++) K.lathe(flat(0x2a2a32, 0.5), [sx * 0.023, 0.012 + r * 0.011, 0.008], [[0.0046, 0], [0.0046, 0.002]], 6, { caps: false });
      const f = [sx * 0.022, 0.004, 0.01];
      for (const [a, l] of [[-0.45, 0.034], [0, 0.04], [0.45, 0.032], [Math.PI, 0.026]]) {
        const dx = Math.sin(a) * l * sx, dz = Math.cos(a) * l;
        K.tube(leg, [f, [f[0] + dx * 0.55, 0.004, f[2] + dz * 0.55], [f[0] + dx, 0.002, f[2] + dz]], 0.0026, 5, { r1: 0.002 });
        K.tube(flat(0x101014, 0.3), [[f[0] + dx, 0.002, f[2] + dz], [f[0] + dx * 1.18, -0.003, f[2] + dz * 1.18]], 0.0016, 4, { r1: 0.0004 });
      }
    }
  }, { s });
  return K;
}
