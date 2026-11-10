// A real cat, modelled from reference (a small, round-bellied adult; body 40 cm nose to rump, shoulder 24 cm): a
// lofted torso with a deep chest, a soft belly and a fluffy bib; a round head with full cheeks, whisker pads, a
// modelled nose and cupped ears; legs with elbows, knees, hocks and toed paws; a tail in five joints; whiskers.
// One skinned mesh, one painted atlas per coat (calico Mikan, the dark tabby stray). The face is painted: curved decal
// patches lying on the head (eyes, mouth) whose UVs switch between expression frames painted in the same atlas.
// Rest pose: standing, facing +z, metres, paws on y = 0; +x is the cat's LEFT.
import * as THREE from 'three';
import { Loft, Builder, egg, fringe, polySkin, strand, shade, mixc, clamp, smooth, adist } from '../animals/loft.js';

// [bone, parent, rest joint (m)]
export const CAT_BONES = [
  ['body', null, [0, 0.172, -0.06]],
  ['chest', 'body', [0, 0.18, 0.04]],
  ['head', 'chest', [0, 0.248, 0.188]],
  ['earL', 'head', [0.025, 0.294, 0.212]], ['earR', 'head', [-0.025, 0.294, 0.212]],
  ['legFL', 'chest', [0.03, 0.165, 0.112]], ['legFR', 'chest', [-0.03, 0.165, 0.112]],
  ['armFL', 'legFL', [0.033, 0.098, 0.096]], ['armFR', 'legFR', [-0.033, 0.098, 0.096]],
  ['pawFL', 'armFL', [0.03, 0.03, 0.112]], ['pawFR', 'armFR', [-0.03, 0.03, 0.112]],
  ['legBL', 'body', [0.04, 0.165, -0.14]], ['legBR', 'body', [-0.04, 0.165, -0.14]],
  ['shinBL', 'legBL', [0.044, 0.103, -0.11]], ['shinBR', 'legBR', [-0.044, 0.103, -0.11]],
  ['pawBL', 'shinBL', [0.038, 0.048, -0.17]], ['pawBR', 'shinBR', [-0.038, 0.048, -0.17]],
  ['tail0', 'body', [0, 0.2, -0.212]], ['tail1', 'tail0', [0, 0.2, -0.262]], ['tail2', 'tail1', [0, 0.2, -0.312]],
  ['tail3', 'tail2', [0, 0.2, -0.362]], ['tail4', 'tail3', [0, 0.2, -0.412]],
];
export const TAIL_N = 5;
export const CAT_JOINT = Object.fromEntries(CAT_BONES.map(([n, , p]) => [n, p]));
const BI = Object.fromEntries(CAT_BONES.map(([n], i) => [n, i]));
const J = CAT_JOINT;

// ------------------------------------------------------------------ coats
// A coat: colours plus a function giving the base colour at a rest point (before the painted shading tones).
const tri = (x) => { const f = x - Math.floor(x); return f < 0.5 ? f * 2 : 2 - f * 2; };
/** Furry edge: the comb of fur teeth along a patch boundary (two crossed saw-teeth, never noise). */
const jag = (a, b) => 0.16 * (tri(a) * 0.65 + tri(b) * 0.35) - 0.08;
const ell = (P, c, r) => ((P.x - c[0]) / r[0]) ** 2 + ((P.y - c[1]) / r[1]) ** 2 + ((P.z - c[2]) / r[2]) ** 2;

const CALICO = {
  name: 'calico',
  W: 0xf4efe4, W2: 0xe2d8c8, O: 0xe8913c, O2: 0xd47a3c, K: 0x2f2724, K2: 0x4a3c34,
  pink: 0xeaa6aa, pinkD: 0xc87482, nose: 0xec9aa2, noseD: 0xb8606e, iris: [0x8fc44c, 0xc8d860, 0x4e8a3a], lid: 0x2a1a16,
  base(P, part, th) {
    const { W, O, K } = this;
    const flowB = jag(P.y * 165 + P.x * 140, P.y * 97 - P.x * 121), flowL = jag(P.x * 170 + P.z * 150, P.z * 101 - P.x * 77);
    if (part === 'earL') return O;
    if (part === 'earR') return K;
    if (part === 'tail') {
      const z = P.z;
      if (z > -0.245 + jag(P.y * 200, P.x * 160) * 0.1) return K;
      if (z < -0.445) return K;
      return tri(z * 22 + 0.3) < 0.24 ? this.O2 : O;
    }
    if (part === 'head') {
      const front = P.z > 0.226;
      // white muzzle, chin, lower cheeks and the blaze between the eyes
      const blaze = Math.abs(P.x) < 0.0032 + Math.max(0, 0.271 - P.y) * 0.95 + jag(P.y * 260, P.x * 200) * 0.01;
      if (P.y < 0.2515 + jag(P.x * 220 + P.z * 90, P.x * 130) * 0.04 || (front && P.y < 0.296 && blaze && P.z > 0.232)) return W;
      if (P.z > 0.252 && P.y < 0.262) return W;
      if (P.x > 0) {
        // tabby lines on her orange forehead
        if (P.z > 0.205 && P.y > 0.284 && P.x > 0.004 && P.x < 0.03) {
          const k = (P.x - 0.004) / 0.026, line = tri(k * 3 + 0.5) < 0.22 && P.y > 0.287 + k * 0.004;
          if (line) return this.O2;
        }
        return O;
      }
      return K;
    }
    if (part.startsWith('leg')) {
      const hind = part[3] === 'B', left = part[4] === 'L';
      if (hind && P.y > 0.118 + flowL * 0.06) return left ? O : K;
      if (!hind && !left && P.y > 0.165 + flowL * 0.05) return K;
      if (!hind && left && P.y > 0.175 + flowL * 0.05) return K;
      return W;
    }
    // body: white belly, bib and chest; a black saddle over the back that runs down her right side (an orange fleck in
    // it), orange over the rump and her left thigh, a dab of orange on her left shoulder
    const y = P.y + flowB * 0.01;
    if (y < 0.142 - Math.max(0, P.z - 0.02) * 0.25) return W;
    if (P.z > 0.105 && y < 0.226 && Math.abs(P.x) < 0.045 - (0.226 - y) * 0.08) return W;
    if (P.z > 0.16 && y < 0.25) return W;
    const blobs = (L) => { let m = 9; for (const [c, r] of L) m = Math.min(m, ell(P, c, r)); return m + flowB; };
    const orange = () => {
      // faint tabby bars, broken up low on the flank
      const ph = P.z * 27 + Math.sin(P.y * 55 + P.x * 25) * 0.25, wdt = 0.05 + 0.1 * smooth(0.16, 0.245, P.y);
      return tri(ph) < wdt && tri(P.y * 48 + P.z * 9) > 0.25 ? this.O2 : O;
    };
    if (blobs([[[0.02, 0.247, -0.07], [0.016, 0.012, 0.024]], [[0.052, 0.208, 0.092], [0.02, 0.026, 0.024]]]) < 1) return orange();
    if (blobs([[[-0.008, 0.236, 0.0], [0.062, 0.042, 0.092]], [[0.034, 0.226, 0.064], [0.04, 0.034, 0.042]], [[-0.052, 0.196, -0.045], [0.04, 0.052, 0.085]], [[0.05, 0.208, -0.035], [0.028, 0.03, 0.036]]]) < 1) return K;
    if (blobs([[[0, 0.226, -0.172], [0.066, 0.046, 0.062]], [[0.052, 0.168, -0.15], [0.03, 0.058, 0.052]], [[-0.056, 0.17, -0.122], [0.03, 0.04, 0.04]]]) < 1) return orange();
    return W;
  },
};

const TABBY = {
  name: 'tabby',
  W: 0x8c8682, W2: 0x6e6864, O: 0x5c5654, O2: 0x2c2826, K: 0x3a3534, K2: 0x524a46,
  pink: 0xb88a8a, pinkD: 0x8a5a5e, nose: 0x5a4446, noseD: 0x2e2224, iris: [0xd0a038, 0xe8c860, 0x9a6a20], lid: 0x161212,
  base(P, part) {
    const { W, O, O2 } = this;
    if (part === 'earL' || part === 'earR') return O2;
    if (part === 'tail') return P.z < -0.43 ? O2 : tri(P.z * 24) < 0.4 ? O2 : O;
    if (part === 'head') {
      if (P.z > 0.25 && P.y < 0.26) return W;
      if (P.y < 0.25) return mixc(O, W, 0.5);
      if (P.y > 0.28 && P.z > 0.2 && tri(P.x * 120 + 0.5) < 0.3 && Math.abs(P.x) < 0.02) return O2; // the forehead M
      if (P.z < 0.24 && P.y > 0.255 && P.y < 0.27 && Math.abs(P.x) > 0.025) return O2; // the cheek line
      return O;
    }
    if (part.startsWith('leg')) return P.y < 0.1 ? (tri(P.y * 55) < 0.3 ? O2 : O) : O;
    if (P.y < 0.135) return mixc(O, W, 0.45);
    if (P.z > 0.13 && P.y < 0.215 && Math.abs(P.x) < 0.02) return mixc(O, W, 0.6);
    if (P.y > 0.228 && Math.abs(P.x) < 0.012) return O2; // dark stripe down the spine
    const ph = P.z * 32 + Math.sin(P.y * 60) * 0.2;
    return tri(ph) < 0.3 + 0.15 * smooth(0.14, 0.24, P.y) ? O2 : O;
  },
};
export const COATS = { calico: CALICO, tabby: TABBY };

/** The painted colour at a rest point: the coat's base, the shading tones, and the drawn details. */
function painter(C, part) {
  return (P, N, u) => {
    const th = u * Math.PI * 2 + Math.PI;
    let c = C.base(P, part, th);
    // inner ear: pink skin with white furnishings
    if ((part === 'earL' || part === 'earR') && Math.abs(adist(th, 0)) < 0.95 && N.z > 0.05) {
      const s = part === 'earL' ? 1 : -1, b = J[part];
      const h = (P.y - b[1]) / 0.045, x = (P.x - b[0]) * s;
      c = h < 0.75 ? C.pink : shade(C.pink, -0.12);
      // the furnishings: a few long white tufts fanning up from the inner base
      const fan = Math.atan2(x + 0.004, h * 0.045 + 0.004);
      if (h < 0.46 && tri(fan * 3 + 0.25) < 0.13 * (1 - h * 1.6)) c = mixc(c, C.W === 0xf4efe4 ? 0xfaf6ee : 0xb0a8a4, 0.75);
      return c;
    }
    // paws: toe grooves on top, pink toe beans underneath (tabby: dark beans)
    if (part.startsWith('leg') && P.y < 0.024) {
      if (N.y < -0.55) {
        const s = part[4] === 'L' ? 1 : -1, b = J['paw' + part.slice(3)], fx = (P.x - b[0]) * s, fz = P.z - (part[3] === 'F' ? 0.138 : -0.128);
        const beans = [[0, -0.012, 0.0065], [-0.0085, 0.004, 0.0032], [-0.003, 0.0085, 0.0032], [0.003, 0.0085, 0.0032], [0.0085, 0.004, 0.0032]];
        for (const [bx, bz, r] of beans) if (Math.hypot(fx - bx, fz - bz) < r) return C.pink;
        return shade(c, -0.08);
      }
      if (P.y > 0.008 && N.z > 0.2) {
        const b = J['paw' + part.slice(3)], dx = P.x - b[0];
        for (const g of [-0.0055, 0, 0.0055]) if (Math.abs(dx - g) < 0.0007 && P.z > (part[3] === 'F' ? 0.135 : -0.142)) return shade(c, -0.28);
      }
    }
    // the bib: soft chevrons of fur in a darker white
    if (part === 'body' && P.z > 0.13 && P.y < 0.205 && P.y > 0.15 && c === C.W) {
      const k = (P.y + Math.abs(P.x) * 0.55) * 95;
      if (tri(k) < 0.14) c = mixc(C.W, C.W2, 0.55);
    }
    // whisker spots on the pads
    if (part === 'head' && P.z > 0.252 && P.y < 0.256 && P.y > 0.246) {
      const ax = Math.abs(P.x);
      for (let r = 0; r < 3; r++) for (let q = 0; q < 4; q++) {
        const sx = 0.0055 + q * 0.0024, sy = 0.2545 - r * 0.0028 - q * 0.0006;
        if (Math.hypot(ax - sx, P.y - sy) < 0.00042) return shade(C.W, -0.28);
      }
    }
    // the mascara line from the inner corner of each eye
    if (part === 'head' && P.z > 0.24) {
      const ax = Math.abs(P.x);
      if (ax > 0.0072 && ax < 0.0095 && P.y < 0.2675 && P.y > 0.2605 && Math.abs((P.y - 0.2605) - (ax - 0.0072) * 2.6) < 0.0011) return shade(c, c === C.K ? 0.18 : -0.35);
    }
    // painted tones: a shade band underneath, a sheen along the top
    if (N.y < -0.5) c = shade(c, -0.1);
    else if (N.y < -0.15) c = shade(c, -0.05);
    else if (N.y > 0.82 && part !== 'tail') c = shade(c, 0.05);
    return c;
  };
}

// ------------------------------------------------------------------ the shapes
const sec = (p, r, up) => ({ p, r, up });
const torsoLoft = () => {
  const ruff = (r, a) => fringe(r, Math.PI * 0.72, Math.PI * 1.28, 5, a);
  return new Loft([
    sec([0, 0.188, -0.205], egg(0.04, 0.04, 0.047)),
    sec([0, 0.181, -0.178], egg(0.056, 0.054, 0.063, { bumps: [[0.75, 0.003, 0.3], [-0.75, 0.003, 0.3]] })),
    sec([0, 0.176, -0.138], egg(0.064, 0.06, 0.074, { p: 2.15 })),
    sec([0, 0.173, -0.088], egg(0.066, 0.063, 0.078, { p: 2.1 })),
    sec([0, 0.175, -0.032], egg(0.063, 0.063, 0.072, { p: 2.1 })),
    sec([0, 0.178, 0.022], egg(0.058, 0.06, 0.066)),
    sec([0, 0.182, 0.072], egg(0.052, 0.057, 0.064, { bumps: [[0.5, 0.003, 0.25], [-0.5, 0.003, 0.25]] })),
    sec([0, 0.193, 0.112], ruff(egg(0.046, 0.05, 0.062, { bumps: [[0.55, 0.004, 0.25], [-0.55, 0.004, 0.25]] }), 0.003)),
    sec([0, 0.21, 0.145], ruff(egg(0.039, 0.041, 0.055), 0.005)),
    sec([0, 0.232, 0.17], ruff(egg(0.034, 0.034, 0.046), 0.004)),
    sec([0, 0.252, 0.193], fringe(egg(0.035, 0.03, 0.043), Math.PI * 0.6, Math.PI * 1.4, 6, 0.003)),
    sec([0, 0.263, 0.214], egg(0.028, 0.022, 0.032)),
  ], { cap: [0.026, 0.01], capSteps: 5 });
};
const headLoft = () => {
  const cheeks = (r, a) => fringe(fringe(r, Math.PI * 0.55, Math.PI * 0.86, 3, a), Math.PI * 1.14, Math.PI * 1.45, 3, a);
  const jaw = (k) => [[Math.PI * 0.8, -0.006 * k, 0.32], [-Math.PI * 0.8, -0.006 * k, 0.32]];
  const pads = [[Math.PI * 0.7, 0.0032, 0.32], [-Math.PI * 0.7, 0.0032, 0.32], [Math.PI, 0.0012, 0.25]];
  return new Loft([
    sec([0, 0.27, 0.183], egg(0.026, 0.024, 0.023)),
    sec([0, 0.271, 0.195], egg(0.036, 0.033, 0.029, { bumps: jaw(0.5) })),
    sec([0, 0.27, 0.209], cheeks(egg(0.041, 0.037, 0.033, { p: 2.1, bumps: jaw(0.8) }), 0.0025)),
    sec([0, 0.268, 0.223], cheeks(egg(0.0425, 0.036, 0.035, { p: 2.2, bumps: jaw(1) }), 0.0032)),
    sec([0, 0.267, 0.236], cheeks(egg(0.0395, 0.032, 0.034, { p: 2.15, bumps: [...jaw(0.9), [0.62, 0.002, 0.2], [-0.62, 0.002, 0.2]] }), 0.002)),
    sec([0, 0.264, 0.246], egg(0.0315, 0.0235, 0.03, { bumps: [[0.6, 0.0025, 0.22], [-0.6, 0.0025, 0.22]] })),
    sec([0, 0.258, 0.2535], egg(0.0225, 0.0145, 0.0235, { bumps: pads })),
    sec([0, 0.2555, 0.2595], egg(0.017, 0.0095, 0.0175, { bumps: pads })),
  ], { cap: [0.012, 0.0055], capSteps: 5 });
};
const noseLoft = () => {
  const tri3 = (w, u, d) => egg(w, u, d, { p: 2.4, bumps: [[Math.PI * 0.78, -0.0022, 0.3], [-Math.PI * 0.78, -0.0022, 0.3]] });
  return new Loft([sec([0, 0.2598, 0.2565], tri3(0.006, 0.0036, 0.0044)), sec([0, 0.2601, 0.2632], tri3(0.0071, 0.0039, 0.0049)), sec([0, 0.2603, 0.2668], tri3(0.0063, 0.0033, 0.0043))], { cap: [0, 0.0024], capSteps: 4 });
};
const earLoft = (s) => {
  const cup = (w, u, d) => egg(w, u, d, { p: 2.3, bumps: [[0, -0.012, 0.55]] });
  const up = [s * 0.32, 0, 1];
  return new Loft([
    sec([s * 0.021, 0.284, 0.215], cup(0.019, 0.009, 0.012), up),
    sec([s * 0.025, 0.296, 0.213], cup(0.0195, 0.0095, 0.009), up),
    sec([s * 0.0292, 0.3085, 0.211], cup(0.0152, 0.008, 0.0066), up),
    sec([s * 0.0334, 0.3195, 0.209], cup(0.0096, 0.0057, 0.0045), up),
    sec([s * 0.0372, 0.3305, 0.207], egg(0.0034, 0.0017, 0.0021), up),
  ], { cap: [0, 0.0045], capSteps: 3 });
};
const foreLoft = (s) => {
  const F = [0, 0, 1], U = [0, 1, 0], toes = [[0, -0.0014, 0.1], [0.72, -0.0012, 0.1], [-0.72, -0.0012, 0.1]];
  return new Loft([
    sec([s * 0.022, 0.208, 0.104], egg(0.017, 0.022, 0.024), F),
    sec([s * 0.03, 0.166, 0.112], egg(0.0205, 0.026, 0.028), F),
    sec([s * 0.032, 0.131, 0.104], egg(0.0172, 0.0205, 0.0225), F),
    sec([s * 0.033, 0.099, 0.097], fringe(egg(0.0145, 0.0155, 0.019), Math.PI * 0.8, Math.PI * 1.2, 2, 0.0025), F),
    sec([s * 0.032, 0.066, 0.104], egg(0.0124, 0.0128, 0.0138), F),
    sec([s * 0.03, 0.034, 0.111], egg(0.0114, 0.0118, 0.0122), F),
    sec([s * 0.03, 0.017, 0.121], egg(0.0148, 0.0135, 0.0115), [0, 0.6, 0.8]),
    sec([s * 0.03, 0.0122, 0.131], egg(0.0162, 0.011, 0.0112, { p: 2.3 }), U),
    sec([s * 0.03, 0.0102, 0.1405], egg(0.0154, 0.0088, 0.0092, { p: 2.4, bumps: toes }), U),
  ], { cap: [0, 0.0072], capSteps: 4 });
};
const hindLoft = (s) => {
  const F = [0, 0, 1], U = [0, 1, 0], toes = [[0, -0.0014, 0.1], [0.72, -0.0012, 0.1], [-0.72, -0.0012, 0.1]];
  const pants = (r, a) => fringe(r, Math.PI * 0.75, Math.PI * 1.25, 3, a);
  return new Loft([
    sec([s * 0.03, 0.2, -0.135], egg(0.02, 0.034, 0.036), F),
    sec([s * 0.04, 0.166, -0.14], pants(egg(0.0235, 0.04, 0.041), 0.003), F),
    sec([s * 0.0435, 0.132, -0.126], pants(egg(0.021, 0.032, 0.035), 0.0035), F),
    sec([s * 0.0442, 0.104, -0.111], egg(0.016, 0.018, 0.022), F),
    sec([s * 0.042, 0.076, -0.139], egg(0.0122, 0.012, 0.016), F),
    sec([s * 0.039, 0.049, -0.169], egg(0.0108, 0.0098, 0.0122), F),
    sec([s * 0.037, 0.024, -0.158], egg(0.0118, 0.0108, 0.0108), [0, 0.5, 0.86]),
    sec([s * 0.037, 0.0122, -0.145], egg(0.0152, 0.011, 0.011, { p: 2.3 }), U),
    sec([s * 0.037, 0.0102, -0.1335], egg(0.0146, 0.0088, 0.0092, { p: 2.4, bumps: toes }), U),
  ], { cap: [0, 0.007], capSteps: 4 });
};
const tailLoft = () => {
  const fluff = (r) => fringe(r, Math.PI * 0.15, Math.PI * 1.85, 9, 0.0016);
  return new Loft([
    sec([0, 0.198, -0.19], egg(0.0165, 0.0165, 0.0165)),
    sec([0, 0.2, -0.215], fluff(egg(0.0168, 0.0168, 0.0165))),
    sec([0, 0.2, -0.262], fluff(egg(0.0152, 0.0152, 0.015))),
    sec([0, 0.2, -0.312], fluff(egg(0.0144, 0.0144, 0.0142))),
    sec([0, 0.2, -0.362], fluff(egg(0.0138, 0.0138, 0.0136))),
    sec([0, 0.2, -0.412], fluff(egg(0.0136, 0.0136, 0.0134))),
    sec([0, 0.2, -0.452], fluff(egg(0.0132, 0.0132, 0.013))),
  ], { cap: [0, 0.02], capSteps: 5 });
};

// ------------------------------------------------------------------ the face atlas (below the coat)
// Eye frames: both eyes side by side (left half = her right eye); mouth frames. Painted with antialiased paths at
// ~5000 px/m on the curved decal patches, linear filtering, so they read as painted, not as pixels.
export const ATLAS_W = 1024, ATLAS_H = 1536, FACE_Y = 1024;
export const EYE_F = { w: 224, h: 96 }, MOUTH_F = { w: 96, h: 64 };
// the patches in the front view (metres): each eye's box, the mouth's box
const EYE_C = [0.0184, 0.2728], EYE_HW = 0.0128, EYE_HH = 0.011, MOUTH_C = [0, 0.2462], MOUTH_HW = 0.0118, MOUTH_HH = 0.011;
export const EYES = {}, MOUTHS = {};
{
  let x = 0, y = FACE_Y;
  const names = [];
  for (const k of ['open', 'wide', 'slit', 'half']) for (const l of ['', 'L', 'R']) names.push(k + l);
  names.push('content', 'sleepy', 'squeeze', 'blink');
  for (const n of names) { if (x + EYE_F.w > ATLAS_W) { x = 0; y += EYE_F.h; } EYES[n] = [x, y]; x += EYE_F.w; }
  x = 0; y += EYE_F.h;
  for (const n of ['w', 'happy', 'open', 'blep', 'lap', 'yawn', 'hiss']) { MOUTHS[n] = [x, y]; x += MOUTH_F.w; }
}
const hex = (c) => '#' + c.toString(16).padStart(6, '0');

function paintFace(g, C) {
  // the fur round each eye (for lids drawn over it) and whether a closed lid line reads dark or light on it
  const furAt = (sx) => C.base(new THREE.Vector3(sx * EYE_C[0], EYE_C[1] + 0.006, 0.25), 'head', 0);
  const lum = (c) => (((c >> 16) & 255) * 0.3 + ((c >> 8) & 255) * 0.55 + (c & 255) * 0.15) / 255;
  const lidOn = (fur) => (lum(fur) < 0.3 ? shade(fur, 0.32) : mixc(C.lid, fur, 0.15));
  const [I0, I1, I2] = C.iris;
  // one eye in a 112 x 96 box; inner = +1 when the nose is to the right of the box
  const eye = (x0, y0, kind, look, inner, sx) => {
    const cx = x0 + 56, cy = y0 + 49, big = kind === 'wide' ? 1.1 : 1;
    const a = 41 * big, b = 34 * big, tilt = 0.1 * inner; // outer corner higher
    const fur = furAt(sx);
    g.save(); g.translate(cx, cy); g.rotate(tilt);
    const shape = () => {
      g.beginPath();
      g.moveTo(-a * inner, -2);
      g.bezierCurveTo(-a * 0.6 * inner, -b * 1.18, a * 0.5 * inner, -b * 1.1, a * inner, 5);
      g.bezierCurveTo(a * 0.55 * inner, b * 1.05, -a * 0.6 * inner, b * 1.0, -a * inner, -2);
      g.closePath();
    };
    shape(); g.save(); g.clip();
    // iris: base, darker limbus ring, a lighter crescent below (light passing through), the lid's shadow on top
    g.fillStyle = hex(I0); g.fillRect(-a - 4, -b - 4, a * 2 + 8, b * 2 + 8);
    const px = look * 9, ip = kind === 'half' ? 0 : 0;
    g.fillStyle = hex(I1); g.beginPath(); g.ellipse(px * 0.4, b * 0.38, a * 0.62, b * 0.5, 0, 0, Math.PI * 2); g.fill();
    g.lineWidth = 5; g.strokeStyle = hex(I2); g.beginPath(); g.ellipse(px * 0.25, ip, a * 0.96, b * 0.98, 0, 0, Math.PI * 2); g.stroke();
    g.fillStyle = hex(shade(I0, -0.35)); g.beginPath(); g.ellipse(0, -b * 1.02, a * 1.1, b * 0.42, 0, 0, Math.PI * 2); g.fill();
    // pupil
    const pw = kind === 'wide' ? 15 : kind === 'slit' ? 3.2 : kind === 'half' ? 9 : 10.5, ph = kind === 'wide' ? 20 : kind === 'slit' ? 26 : 24;
    g.fillStyle = '#140c0c'; g.beginPath(); g.ellipse(px, 2, pw, ph, 0, 0, Math.PI * 2); g.fill();
    // catchlights: one window above-left, a small bounce below-right (the same light for both eyes)
    g.fillStyle = '#fffdf6';
    g.beginPath(); g.ellipse(-9, -10, 6.5, 5.2, -0.4, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(9, 12, 2.6, 2.2, 0, 0, Math.PI * 2); g.fill();
    // half-closed: the upper lid comes down over the top
    if (kind === 'half') {
      g.fillStyle = hex(fur); g.beginPath(); g.moveTo(-a - 6, -b - 8); g.lineTo(a + 6, -b - 8); g.lineTo(a + 6, -4); g.bezierCurveTo(a * 0.4, 3, -a * 0.4, 3, -a - 6, -1); g.closePath(); g.fill();
      g.strokeStyle = hex(C.lid); g.lineWidth = 4.5; g.beginPath(); g.moveTo(-a - 2, -1); g.bezierCurveTo(-a * 0.4, 3, a * 0.4, 3, a + 2, -4); g.stroke();
    }
    g.restore();
    // the dark lid rim, heavier on the upper lid, running out at the inner corner
    g.strokeStyle = hex(C.lid); g.lineJoin = 'round'; g.lineCap = 'round';
    g.lineWidth = 4; shape(); g.stroke();
    g.lineWidth = 6; g.beginPath(); g.moveTo(-a * inner, -2); g.bezierCurveTo(-a * 0.6 * inner, -b * 1.18, a * 0.5 * inner, -b * 1.1, a * inner, 5); g.stroke();
    g.lineWidth = 4; g.beginPath(); g.moveTo(a * inner * 0.97, 6); g.lineTo(a * inner * 1.1, 12); g.stroke();
    g.restore();
  };
  const closed = (x0, y0, kind, inner, sx) => {
    const cx = x0 + 56, cy = y0 + 49, a = 38, fur = furAt(sx);
    g.save(); g.translate(cx, cy); g.rotate(0.1 * inner);
    g.strokeStyle = hex(lidOn(fur)); g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 5.5;
    g.beginPath();
    if (kind === 'content') { g.moveTo(-a, 8); g.bezierCurveTo(-a * 0.5, -16, a * 0.5, -16, a, 6); }
    else if (kind === 'sleepy') { g.moveTo(-a, -2); g.bezierCurveTo(-a * 0.45, 13, a * 0.45, 13, a, -4); }
    else if (kind === 'blink') { g.moveTo(-a, 2); g.bezierCurveTo(-a * 0.4, 7, a * 0.4, 7, a, 0); }
    else { const t = inner; g.moveTo(t * -a * 0.9, -12); g.lineTo(t * a * 0.55, 1); g.lineTo(t * -a * 0.9, 13); }
    g.stroke();
    if (kind === 'content' || kind === 'sleepy') {
      // lashes of fur at the outer corner
      g.lineWidth = 3.5; g.beginPath(); g.moveTo(a * -inner * 0.98, kind === 'content' ? 7 : -3); g.lineTo(a * -inner * 1.18, kind === 'content' ? 13 : -9); g.stroke();
    }
    if (kind === 'content') {
      g.fillStyle = 'rgba(232,128,140,0.55)';
      for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(-12 + k * 12, 30, 3.2, 2, 0, 0, Math.PI * 2); g.fill(); }
    }
    g.restore();
  };
  for (const [name, [x, y]] of Object.entries(EYES)) {
    g.clearRect(x, y, EYE_F.w, EYE_F.h);
    const kind = name.replace(/[LR]$/, ''), look = name.endsWith('L') ? 1 : name.endsWith('R') ? -1 : 0;
    if (['content', 'sleepy', 'squeeze', 'blink'].includes(kind)) { closed(x, y, kind, 1, -1); closed(x + 112, y, kind, -1, 1); }
    // her right eye sits on the left of the frame; 'L' (looking to her left) moves both pupils toward the frame's right
    else { eye(x, y, kind, look, 1, -1); eye(x + 112, y, kind, look, -1, 1); }
  }
  // mouths: on the white muzzle under the nose (which is modelled); the frame's top centre is just under the nose
  const lip = hex(C.name === 'calico' ? 0x5a3436 : 0x241a1a), mouthIn = '#5a2228', tongue = '#e8848e', tongueD = '#c8606e', fang = '#fbf6ec';
  for (const [name, [x, y]] of Object.entries(MOUTHS)) {
    g.clearRect(x, y, MOUTH_F.w, MOUTH_F.h);
    g.save(); g.translate(x + 48, y + 6); g.scale(1.3, 1.3);
    g.strokeStyle = lip; g.fillStyle = lip; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 3.4;
    const smile = (open) => {
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 12 + open * 0.3); g.stroke();
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(0, 12); g.bezierCurveTo(s * 4, 20 + open, s * 13, 21 + open, s * 18, 13); g.stroke(); }
    };
    const openMouth = (w, h, fangs) => {
      g.fillStyle = mouthIn; g.beginPath(); g.moveTo(-w, 13); g.bezierCurveTo(-w * 0.8, 13 + h * 1.2, w * 0.8, 13 + h * 1.2, w, 13); g.bezierCurveTo(w * 0.5, 9, -w * 0.5, 9, -w, 13); g.fill();
      g.fillStyle = tongue; g.beginPath(); g.ellipse(0, 13 + h * 0.78, w * 0.62, h * 0.32, 0, 0, Math.PI * 2); g.fill();
      if (fangs) { g.fillStyle = fang; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * w * 0.62, 11.5); g.lineTo(s * w * 0.48, 13 + h * 0.34); g.lineTo(s * w * 0.36, 12); g.fill(); } }
      g.lineWidth = 3; g.beginPath(); g.moveTo(-w, 13); g.bezierCurveTo(-w * 0.8, 13 + h * 1.2, w * 0.8, 13 + h * 1.2, w, 13); g.bezierCurveTo(w * 0.5, 9, -w * 0.5, 9, -w, 13); g.stroke();
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 10.5); g.stroke();
    };
    if (name === 'w') smile(0);
    else if (name === 'happy') { smile(0); g.fillStyle = tongue; g.beginPath(); g.moveTo(-6, 16); g.bezierCurveTo(-5, 26, 5, 26, 6, 16); g.fill(); g.strokeStyle = lip; g.lineWidth = 2.6; g.beginPath(); g.moveTo(-6, 16); g.bezierCurveTo(-5, 26, 5, 26, 6, 16); g.stroke(); }
    else if (name === 'open') openMouth(13, 22, true);
    else if (name === 'yawn') openMouth(16, 26, true);
    else if (name === 'hiss') { openMouth(17, 24, true); g.strokeStyle = lip; g.lineWidth = 2.4; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 5, -3); g.lineTo(s * 14, -5); g.stroke(); } }
    else if (name === 'blep' || name === 'lap') {
      smile(0);
      const L2 = name === 'lap' ? 20 : 11;
      g.fillStyle = tongue; g.beginPath(); g.moveTo(-5, 15); g.bezierCurveTo(-6, 15 + L2, 6, 15 + L2, 5, 15); g.fill();
      g.strokeStyle = tongueD; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, 17); g.lineTo(0, 12 + L2 * 0.8); g.stroke();
    }
    g.restore();
  }
}

// ------------------------------------------------------------------ assembly
/** Curved decal patches lying on the head: each a (n+1) x (m+1) grid with st (0..1) for remapping to frames. */
function decals(B, head, C) {
  const us = [], vs = [];
  for (let i = 0; i <= 480; i++) us.push(i / 480);
  for (let j = 0; j <= 280; j++) vs.push(j / 280);
  const S = head.sample(us, vs), cand = [];
  for (let q = 0; q < S.P.length / 3; q++) if (S.N[q * 3 + 2] > 0.12 && S.P[q * 3 + 2] > 0.225) cand.push(q);
  const find = (x, y) => {
    let best = cand[0], bd = 1e9;
    for (const q of cand) { const dx = S.P[q * 3] - x, dy = S.P[q * 3 + 1] - y, d = dx * dx + dy * dy - S.P[q * 3 + 2] * 1e-4; if (d < bd) { bd = d; best = q; } }
    return best;
  };
  const patch = (cx, cy, hw, hh, n, m, off) => {
    const base = B.count, st = [];
    for (let j = 0; j <= m; j++) for (let i = 0; i <= n; i++) {
      const s = i / n, t = j / m, x = cx - hw + s * hw * 2, y = cy + hh - t * hh * 2, q = find(x, y);
      const N = [S.N[q * 3], S.N[q * 3 + 1], S.N[q * 3 + 2]];
      B.vert([x + N[0] * off, y + N[1] * off, S.P[q * 3 + 2] + N[2] * off], N, [0, 0], [[BI.head, 1]]);
      st.push(s, t);
    }
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
      const a = base + j * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1;
      B.idx.push(a, c, b, b, c, d);
    }
    return { base, count: (n + 1) * (m + 1), st };
  };
  // her right eye (-x) is the left half of each eye frame
  const eyeR = patch(-EYE_C[0], EYE_C[1], EYE_HW, EYE_HH, 10, 9, 0.001);
  const eyeL = patch(EYE_C[0], EYE_C[1], EYE_HW, EYE_HH, 10, 9, 0.001);
  const mouth = patch(MOUTH_C[0], MOUTH_C[1], MOUTH_HW, MOUTH_HH, 10, 8, 0.0009);
  return { eyes: [{ ...eyeR, u0: 0, du: 0.5 }, { ...eyeL, u0: 0.5, du: 0.5 }], mouth: [{ ...mouth, u0: 0, du: 1 }] };
}

/** Point decal patches at the atlas frame [x, y] (w x h px). */
export function setFrame(uvAttr, patches, [x, y], w, h) {
  for (const P of patches) for (let k = 0; k < P.count; k++) {
    const s = P.st[k * 2], t = P.st[k * 2 + 1];
    uvAttr.setXY(P.base + k, (x + (P.u0 + s * P.du) * w) / ATLAS_W, (y + t * h) / ATLAS_H);
  }
}

const CACHE = {};
/** Shared skinned geometry + painted atlas for a coat ('calico' Mikan, 'tabby' the stray); lod 1: about a third of the triangles. */
export function catAssets(coat = 'calico', lod = 0) {
  const key = coat + (lod ? ':lo' : '');
  if (CACHE[key]) return CACHE[key];
  const q = lod ? 0.55 : 1, Q = (n) => Math.max(6, Math.round(n * q)); // (a lighter build for baked props)
  const C = COATS[coat] || CALICO;
  const B = new Builder(ATLAS_W, ATLAS_H, 4);
  const b = (n) => BI[n];
  // torso: rump -> body, chest, neck -> head
  B.part(torsoLoft(), { rect: [0, 0, 760, 512], cols: Q(48), rows: Q(38), paint: painter(C, 'body'), skin: polySkin([[0, 0.18, -0.26], J.chest, [0, 0.215, 0.16], J.head, [0, 0.27, 0.23]], [b('body'), b('chest'), b('chest'), b('head')], 0.035) });
  const head = headLoft();
  B.part(head, { rect: [768, 0, 256, 320], cols: Q(44), rows: Q(32), paint: painter(C, 'head'), skin: () => [[b('head'), 1]] });
  B.part(noseLoft(), { rect: [976, 458, 48, 48], cols: Q(16), rows: Q(8), paint: (P, N) => (N.y > 0.55 ? shade(C.nose, 0.1) : P.y < 0.2586 && P.z > 0.264 && Math.abs(Math.abs(P.x) - 0.0036) < 0.0014 ? C.noseD : C.nose), skin: () => [[b('head'), 1]] });
  for (const [n, s, x] of [['earL', 1, 768], ['earR', -1, 872]]) B.part(earLoft(s), { rect: [x, 328, 96, 120], cols: Q(20), rows: Q(12), paint: painter(C, n), skin: () => [[b(n), 1]] });
  const legs = [['FL', 1, 0], ['FR', -1, 128], ['BL', 1, 256], ['BR', -1, 384]];
  for (const [k, s, x] of legs) {
    const front = k[0] === 'F', top = front ? 'chest' : 'body', j1 = J[(front ? 'leg' : 'leg') + k], j2 = J[(front ? 'arm' : 'shin') + k], j3 = J['paw' + k];
    const toe = front ? [s * 0.03, 0.01, 0.148] : [s * 0.037, 0.01, -0.127];
    B.part(front ? foreLoft(s) : hindLoft(s), {
      rect: [x, 520, 120, 376], cols: Q(20), rows: Q(26), paint: painter(C, 'leg' + k),
      skin: polySkin([[j1[0] * 0.6, j1[1] + 0.05, j1[2]], j1, j2, j3, toe], [b(top), b('leg' + k), b((front ? 'arm' : 'shin') + k), b('paw' + k)], front ? [0.022, 0.016, 0.012] : [0.034, 0.018, 0.012]),
    });
  }
  B.part(tailLoft(), { rect: [512, 520, 120, 496], cols: Q(14), rows: Q(34), paint: painter(C, 'tail'), skin: polySkin([[0, 0.2, -0.17], J.tail0, J.tail1, J.tail2, J.tail3, J.tail4, [0, 0.2, -0.5]], [b('body'), b('tail0'), b('tail1'), b('tail2'), b('tail3'), b('tail4')], 0.022) });
  // whiskers (pale, a gentle droop) and the brow whiskers above the eyes: they sample a white texel of the bib
  const WH = [(694 + 0.5) / ATLAS_W, (604 + 0.5) / ATLAS_H];
  for (const s of [1, -1]) {
    for (let i = 0; i < 4; i++) {
      const y0 = 0.2532 - i * 0.0022, a = 0.22 - i * 0.16, len = 0.066 - i * 0.004;
      const pts = []; for (let k = 0; k <= 5; k++) { const t = k / 5; pts.push([s * (0.0085 + t * len * Math.cos(a) * 0.95), y0 + t * len * Math.sin(a) * 0.6 - t * t * 0.012, 0.2585 - t * len * 0.32]); }
      B.loose(strand(pts, 0.00042, 0.00012), WH, [[b('head'), 1]]);
    }
    for (let i = 0; i < 2; i++) {
      const pts = []; for (let k = 0; k <= 4; k++) { const t = k / 4; pts.push([s * (0.019 + i * 0.006 + t * 0.022), 0.2865 + i * 0.002 + t * 0.012 - t * t * 0.006, 0.244 - i * 0.004 + t * 0.004]); }
      B.loose(strand(pts, 0.00032, 0.0001), WH, [[b('head'), 1]]);
    }
  }
  const D = decals(B, head, C);
  const map = B.texture((g) => { g.fillStyle = '#ffffff'; g.fillRect(690, 600, 8, 8); paintFace(g, C); });
  // a lower roughness for the nose leather and the wet eyes would need a second map: the fur's 0.9 reads right at
  // play distance, and the painted catchlights carry the eyes
  const geometry = B.geometry();
  CACHE[key] = { geometry, map, eyes: D.eyes, mouth: D.mouth };
  return CACHE[key];
}
