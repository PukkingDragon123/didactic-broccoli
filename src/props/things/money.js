// Money you handle: the ¥100 coin (22.6 mm, cupronickel: a raised rim, a "100" in relief on one face and a ginkgo
// leaf on the other, an original design) and the cloth coin bag (a kinchaku: a gathered pouch in red cotton with a
// frilled collar, a braided cord round the neck and two knotted tails).
//   yenCoinGeometry(): centred, lying flat; everything in material slot 2, so callers drawing it with the voxel
//   material set get the polished-metal slot (vertex-coloured silver) and callers with page.mats() the atlas.
//   coinBagMesh(): centred on its bounding box (as the old voxel bag), drawn with its atlas page.
import { thingGeometry, thingMesh } from './make.js';
import { sweep, glyphs } from './form.js';
import { metal, fabric, matte, flat, mix, darken, lighten } from '../kit/kit.js';
import { photoInto } from '../kit/prints.js';

const R = 0.0113, HT = 0.00095;
export const COIN_R = R, COIN_T = HT * 2;

function coin(K) {
  const face = metal(0xc6cacd, 0.18), rim = metal(0xd6d9dc, 0.25), relief = metal(0xdfe2e4, 0.2);
  const Rr = R - 0.0011, Rf = Rr - 0.00025, hf = HT - 0.0002;
  // body: the fields sit a little below the rolled rim on both faces
  K.lathe(face, [0, 0, 0], [[0, -hf], [Rf, -hf]], 18);
  K.lathe(rim, [0, 0, 0], [[Rf, -hf], [Rr, -HT], [R - 0.0003, -HT], [R, -HT + 0.0003], [R, HT - 0.0003], [R - 0.0003, HT], [Rr, HT], [Rf, hf]], 18);
  K.lathe(face, [0, 0, 0], [[Rf, hf], [0, hf]], 18);
  // the face: "100", the date line under it as a raised bar
  glyphs(K, relief, '100', 0, -0.0006, 0.0074, hf - 0.00002, hf + 0.00016, { gap: 0.7 });
  K.box(relief, -0.0028, hf - 0.00002, 0.0049, 0.0028, hf + 0.0001, 0.0058);
  K.box(relief, -0.0028, hf - 0.00002, -0.0068, 0.0028, hf + 0.0001, -0.0059);
  // the other face: a ginkgo leaf (a fan with a notch, its stem) in low relief
  const leaf = [];
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI * (0.2 + 0.6 * (i / 12)), notch = Math.abs(i - 6) < 1 ? 0.0016 : 0;
    const r = 0.0066 - notch - 0.0004 * Math.cos((i / 12) * Math.PI * 6) ** 2;
    leaf.push([Math.cos(a) * r, -0.0028 + Math.sin(a) * r]);
  }
  leaf.push([0.0004, -0.0026], [-0.0004, -0.0026]);
  K.prism(relief, leaf.map(([x, y]) => [-x, -y + 0.0006]), { plane: 'xz', a: -hf - 0.00016, b: -hf + 0.00002, caps: 'a' });
  K.prism(relief, [[-0.00035, 0.0026], [0.00035, 0.0026], [0.0006, 0.0062], [0.0001, 0.0062]], { plane: 'xz', a: -hf - 0.00014, b: -hf + 0.00002, caps: 'a' });
}

/** The ¥100 coin (lying flat, centred). Shared geometry for coin piles and flying coins. */
export function yenCoinGeometry() {
  return thingGeometry('money', 'yen100', [-R, -HT, -R, R, HT, R], coin, { slot: 2, crease: 40 });
}

// ------------------------------------------------------------------ the coin bag (old voxel box 0.078 x 0.09 x 0.066, centred)
const RED = 0x9a3a2c, CORD = 0xd8b45a;
function bag(K, B) {
  const y0 = B.y0, cloth = K.patch('cloth', 64, 48, (V) => {
    V.fill(RED);
    photoInto(K, V, 'canvas_cloth', RED, (V) => {
      // a hand-sewn hem line near the top and a little woven tag
      for (let i = 0; i < 64; i += 3) V.px(i, 41, lighten(RED, 0.25));
      V.box(26, 14, 38, 24, 0xe6d6a8); V.frame(26, 14, 38, 24, darken(0xe6d6a8, 0.25));
      for (const [i, j] of [[29, 18], [30, 19], [31, 20], [32, 19], [33, 18], [34, 19], [35, 20], [31, 17], [33, 21]]) V.px(i, j, 0xa83a2a);
    });
  }, { rough: 0.95 });
  // the pouch: a fat round bottom gathered into pleats towards the neck
  const prof = [[0, 0.0], [0.016, 0.001], [0.03, 0.007], [0.037, 0.018], [0.038, 0.032], [0.033, 0.046], [0.022, 0.058], [0.013, 0.065]];
  const pleat = (r, a, k) => r * (1 + (k / prof.length) ** 2 * 0.16 * Math.cos(a * 11) + 0.02 * Math.sin(a * 3 + k));
  sweep(K, cloth, [0, y0, 0], prof, 22, { mod: pleat, sz: 0.85 });
  // the gathered neck and the frill above it
  const neck = [[0.013, 0.065], [0.0115, 0.068], [0.012, 0.071]];
  sweep(K, matte(darken(RED, 0.12), 0.08), [0, y0, 0], neck, 22, { mod: (r, a) => r * (1 + 0.12 * Math.cos(a * 11)), sz: 0.85 });
  const frill = [[0.012, 0.071], [0.017, 0.078], [0.023, 0.086], [0.0245, 0.0895]];
  const fr = (r, a, k) => r * (1 + (0.05 + k * 0.035) * Math.cos(a * 11) + 0.02 * Math.cos(a * 4 + k));
  sweep(K, matte(RED, 0.12), [0, y0, 0], frill, 22, { mod: fr, sz: 0.85 });
  sweep(K, matte(darken(RED, 0.3), 0), [0, y0, 0], frill.map(([r, y]) => [r - 0.0009, y]), 22, { mod: fr, sz: 0.85, flip: true });
  // the cord: a braided loop round the neck, two tails with knots
  const cord = matte(CORD, 0.18);
  K.torus(cord, 0, y0 + 0.0685, 0, 0.0128, 0.0016, 14, 5, { sz: 0.85 });
  for (const s of [-1, 1]) {
    const p0 = [s * 0.006, y0 + 0.068, 0.011];
    const tail = [p0, [s * 0.011, y0 + 0.062, 0.017], [s * 0.016, y0 + 0.05, 0.022], [s * 0.019, y0 + 0.04, 0.024]];
    K.tube(cord, tail, 0.0014, 6);
    K.ball(matte(darken(CORD, 0.1), 0.15), tail[3][0], tail[3][1] - 0.001, tail[3][2], 0.0032, 0.0034, 0.0032, 8, 5);
  }
  K.ball(cord, 0, y0 + 0.0686, 0.0115, 0.0034, 0.0028, 0.0026, 8, 5); // the knot where the cord crosses
}
export function coinBagMesh() {
  const m = thingMesh('money', 'coinBag', [-0.039, -0.045, -0.033, 0.039, 0.045, 0.033], bag);
  m.userData.noRim = true;
  return m;
}
