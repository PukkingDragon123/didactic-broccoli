// Dogs of the lane, modelled from reference: a Shiba Inu (shoulder 38 cm) with a deep chest, a tucked loin, a fox-like
// head with a separate lower jaw, small thick prick ears, a sickle-curl tail and catlike paws; the white Kishu, the black
// and tan, the sesame, a brown mutt with folded ears and the white ghost mutt with floppy ears share the build. One
// skinned mesh and one painted atlas per coat (with the cream "urajiro" underside of the Japanese breeds), legs on
// two-bone IK, a wagging three-joint tail and a jaw that opens to bark.
//   const d = new Dog('pochi');  scene.add(d.root);  d.speed = 1.2; d.pose = 'stand' | 'sit' | 'sniff' | 'squat'; d.update(dt)
//   d.collar(out) (where a lead clips on)   d.nose(out)   d.barkT = 0.35 (the jaw snaps open)
import * as THREE from 'three';
import { Loft, Builder, egg, fringe, polySkin, shade, mixc, smooth as sm, adist } from './loft.js';
import { legChain, solveLeg } from './ik.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const tri = (x) => { const f = x - Math.floor(x); return f < 0.5 ? f * 2 : 2 - f * 2; };
const jag = (a, b) => 0.16 * (tri(a) * 0.65 + tri(b) * 0.35) - 0.08;
const sec = (p, r, up) => ({ p, r, up });

// [bone, parent, rest joint (m)]
export const DOG_BONES = [
  ['body', null, [0, 0.33, -0.08]],
  ['chest', 'body', [0, 0.335, 0.07]],
  ['neck', 'chest', [0, 0.37, 0.165]],
  ['head', 'neck', [0, 0.445, 0.235]],
  ['jaw', 'head', [0, 0.425, 0.272]],
  ['earL', 'head', [0.032, 0.492, 0.246]], ['earR', 'head', [-0.032, 0.492, 0.246]],
  ['legFL', 'chest', [0.05, 0.3, 0.135]], ['legFR', 'chest', [-0.05, 0.3, 0.135]],
  ['armFL', 'legFL', [0.053, 0.205, 0.105]], ['armFR', 'legFR', [-0.053, 0.205, 0.105]],
  ['pawFL', 'armFL', [0.048, 0.055, 0.13]], ['pawFR', 'armFR', [-0.048, 0.055, 0.13]],
  ['legBL', 'body', [0.054, 0.31, -0.165]], ['legBR', 'body', [-0.054, 0.31, -0.165]],
  ['shinBL', 'legBL', [0.06, 0.205, -0.116]], ['shinBR', 'legBR', [-0.06, 0.205, -0.116]],
  ['pawBL', 'shinBL', [0.051, 0.095, -0.223]], ['pawBR', 'shinBR', [-0.051, 0.095, -0.223]],
  ['tail0', 'body', [0, 0.39, -0.222]], ['tail1', 'tail0', [0, 0.44, -0.24]], ['tail2', 'tail1', [0, 0.48, -0.212]], ['tail3', 'tail2', [0.012, 0.487, -0.168]],
];
const BI = Object.fromEntries(DOG_BONES.map(([n], i) => [n, i]));
const J = Object.fromEntries(DOG_BONES.map(([n, , p]) => [n, p]));

// ------------------------------------------------------------------ coats
const COATS = {
  // red Shiba: fox red with darker tips along the back, cream urajiro, eyebrow dots
  pochi: { fur: 0xd27e3a, back: 0xbb6a2c, cream: 0xf6e9d4, tan: null, nose: 0x1e1a1a, collar: 0xd8282a, tag: 0xe8c04a, ears: 'prick', iris: 0x3a2216 },
  // black and tan Shiba
  kuro: { fur: 0x2a2423, back: 0x1e1a1a, cream: 0xf0e2cc, tan: 0xc88848, nose: 0x141010, collar: 0x2f6fd6, tag: 0xd8d8d0, ears: 'prick', iris: 0x2a1a12 },
  // white Kishu
  shiro: { fur: 0xf0eadc, back: 0xe2dacb, cream: 0xfbf6ec, tan: null, nose: 0x2a2020, collar: 0x2f8a4a, tag: 0xe8c04a, ears: 'prick', iris: 0x3a2418 },
  // sesame Shiba: red with black-tipped hair over the back
  goma: { fur: 0xb47a48, back: 0x4a3426, cream: 0xf2e2c8, tan: null, nose: 0x1a1414, collar: 0xd8a020, tag: 0xe8e0c8, ears: 'prick', iris: 0x2e1c12, sesame: true },
  // a brown mutt with folded ears
  chibi: { fur: 0xa8703e, back: 0x8a5a32, cream: 0xf0dcc0, tan: null, nose: 0x1a1414, collar: 0x3a6ad8, tag: 0xe8c04a, ears: 'fold', iris: 0x3a2214 },
  // the ghost girl's white mutt: floppy grey ears, grey socks, a red collar
  ghost: { fur: 0xf4f0e8, back: 0xe8e2d8, cream: 0xfbf8f2, tan: null, nose: 0x2a2a2a, collar: 0xc84a3a, tag: 0xd8b44a, ears: 'flop', iris: 0x2a2a2a, ear: 0x8e8a84, sock: 0xb8b4ac },
};
export const DOG_COATS = COATS;

function painter(C, part) {
  const T = C.tan;
  return (P, N, u) => {
    const ax = Math.abs(P.x), fl = jag(P.y * 150 + P.x * 120, P.y * 87 - P.x * 101);
    let c = C.fur;
    if (part === 'nose') return N.y > 0.5 ? shade(C.nose, 0.18) : (P.y < 0.4345 && ax > 0.003 && ax < 0.008 && P.z > 0.361) ? 0x050404 : C.nose;
    if (part === 'collar') return C.collar;
    if (part === 'tag') return C.tag;
    if (part === 'jaw') {
      if (N.y > 0.35 && ax < 0.011) return 0xd06870; // the tongue
      if (N.y > 0.2) return 0x7a3438;
      return P.y > 0.414 && N.y > -0.3 ? 0x2a1a1a : C.cream;
    }
    if (part === 'earL' || part === 'earR') {
      const s = part === 'earL' ? 1 : -1, th = u * Math.PI * 2 + Math.PI;
      if (C.ears === 'flop') return C.ear;
      c = C.fur;
      if (C.ears === 'prick' && Math.abs(adist(th, 0)) < 1.0 && N.z > 0) {
        const h = (P.y - J.earL[1]) / 0.05;
        c = h < 0.8 ? C.cream : C.fur;
        if (h < 0.7 && tri((P.x * s) * 700 + h * 2) < 0.18) c = shade(C.cream, -0.08);
      }
      if (C.ears === 'fold' && N.z > 0.3 && P.y < 0.5) c = shade(C.fur, -0.12);
      return C === COATS.kuro && c === C.fur ? C.fur : c;
    }
    if (part === 'head') {
      const front = P.z > 0.27;
      // eyes: dark almond, a lighter iris ring, the catchlight; a dark rim
      if (front && N.z > 0.2) {
        const ex = ax - 0.0265, ey = P.y - (0.469 + ex * 0.15);
        const q = (ex / 0.0102) ** 2 + (ey / 0.0074) ** 2;
        if (q < 1) {
          if (Math.hypot(ex + 0.0025, ey - 0.0025) < 0.0018) return 0xfbf6ec;
          return q < 0.42 ? 0x0e0a08 : q < 0.8 ? C.iris : 0x120c0a;
        }
        if (q < 1.45) return 0x1a1210;
        // the eyebrow dots
        if (C.ears !== 'flop' && ((ax - 0.022) / 0.0065) ** 2 + ((P.y - 0.4835) / 0.004) ** 2 < 1) return T || C.cream;
      }
      // the mouth: a dark lip line down the muzzle side to the corner; whisker dots
      if (P.z > 0.292 && ax > 0.006) {
        const lipY = 0.4165 + Math.max(0, 0.31 - P.z) * 0.35;
        if (Math.abs(P.y - lipY) < 0.0016 && N.y < 0.2) return 0x241818;
        if (P.y < lipY && N.y < -0.4) return 0x7a3438; // the roof of the mouth (seen when she barks)
      }
      if (P.z > 0.3 && P.z < 0.34 && P.y > 0.421 && P.y < 0.432 && ax > 0.011) {
        for (let r = 0; r < 2; r++) for (let k = 0; k < 3; k++) if (Math.hypot(P.z - (0.308 + k * 0.009), P.y - (0.424 + r * 0.004)) < 0.0011) return shade(C.cream, -0.3);
      }
      // urajiro: cream cheeks, muzzle sides and the underside; the bridge of the nose keeps the coat colour
      const cheek = P.y < 0.455 + fl * 0.02 - Math.max(0, 0.27 - P.z) * 0.6 && (ax > 0.012 || P.y < 0.43) && P.z > 0.235;
      if (cheek || P.y < 0.43) c = C.cream;
      else if (T && P.y < 0.462 && P.z > 0.24) c = T;
      if (C.ears === 'flop' && P.y > 0.47 && P.z < 0.27 && ax > 0.03) c = shade(C.fur, -0.05);
    } else if (part === 'tail') {
      const toC = (0 - P.x) * N.x + (0.435 - P.y) * N.y + (-0.19 - P.z) * N.z;
      c = toC > 0.004 ? C.cream : C.fur;
      if (c === C.fur && C.sesame && tri(P.x * 260) < 0.4) c = C.back;
    } else if (part.startsWith('leg')) {
      const side = part[4] === 'L' ? 1 : -1, hind = part[3] === 'B';
      const inner = (P.x - J['leg' + part.slice(3)][0]) * side < -0.004 + fl * 0.02;
      c = inner || P.y < (hind ? 0.075 : 0.085) + fl * 0.03 ? C.cream : C.fur;
      if (T && c === C.fur && P.y < 0.2) c = T;
      if (C.sock && P.y < 0.06) c = C.sock;
      if (hind && P.y > 0.23 && c === C.cream) c = C.fur;
      if (P.y < 0.012 && N.y < -0.6) return 0x2e2624; // pads
      if (P.y < 0.032 && P.y > 0.012 && N.z > 0.3) { const b = J['paw' + part.slice(3)]; for (const g of [-0.007, 0, 0.007]) if (Math.abs(P.x - b[0] - g) < 0.0009) return shade(c, -0.25); }
    } else {
      // body: cream underside, chest and throat; a darker saddle along the back (sesame: black-tipped streaks)
      const y = P.y + fl * 0.012;
      if (y < 0.29 - Math.max(0, P.z - 0.04) * 0.25 || (P.z > 0.13 && y < 0.395 - Math.max(0, P.z - 0.13) * 0.0 && ax < 0.052 - (0.395 - y) * 0.05) || (P.z > 0.18 && y < 0.43 && N.y < 0.2)) c = C.cream;
      else if (T && y < 0.32) c = T;
      else if (P.y > 0.37 && ax < 0.05 + fl * 0.1) c = C.sesame ? (tri(P.x * 230 + Math.sin(P.z * 40) * 0.6) < 0.5 - Math.max(0, ax - 0.03) * 12 ? C.back : mixc(c, C.back, 0.35)) : mixc(c, C.back, 0.55);
    }
    if (N.y < -0.5) c = shade(c, -0.1); else if (N.y < -0.15) c = shade(c, -0.05); else if (N.y > 0.85) c = shade(c, 0.05);
    return c;
  };
}

// ------------------------------------------------------------------ the shapes
const torso = () => new Loft([
  sec([0, 0.346, -0.214], egg(0.0575, 0.0517, 0.0667)),
  sec([0, 0.338, -0.182], egg(0.077, 0.0667, 0.0828, { bumps: [[0.8, 0.004, 0.3], [-0.8, 0.004, 0.3]] })),
  sec([0, 0.335, -0.125], egg(0.0805, 0.0667, 0.0805)),
  sec([0, 0.334, -0.055], egg(0.0828, 0.0678, 0.0897)),
  sec([0, 0.33, 0.015], egg(0.0885, 0.0701, 0.1127, { p: 2.1 })),
  sec([0, 0.333, 0.085], egg(0.0862, 0.0725, 0.1242, { p: 2.1, bumps: [[0.5, 0.004, 0.25], [-0.5, 0.004, 0.25]] })),
  sec([0, 0.347, 0.145], fringe(egg(0.0736, 0.0667, 0.1127), Math.PI * 0.75, Math.PI * 1.25, 4, 0.005)),
  sec([0, 0.375, 0.193], fringe(egg(0.0586, 0.0575, 0.0782), Math.PI * 0.7, Math.PI * 1.3, 4, 0.004)),
  sec([0, 0.41, 0.224], egg(0.0517, 0.0506, 0.0621)),
  sec([0, 0.44, 0.249], egg(0.0437, 0.0414, 0.046)),
], { cap: [0.03, 0.012], capSteps: 5 });
const head = (C) => {
  const ruff = (r, a) => fringe(fringe(r, Math.PI * 0.55, Math.PI * 0.9, 3, a), Math.PI * 1.1, Math.PI * 1.45, 3, a);
  const flop = C.ears === 'flop';
  return new Loft([
    sec([0, 0.466, 0.203], egg(0.03, 0.03, 0.028)),
    sec([0, 0.468, 0.222], egg(flop ? 0.048 : 0.053, 0.047, 0.045)),
    sec([0, 0.465, 0.248], ruff(egg(flop ? 0.054 : 0.064, 0.05, 0.053, { p: 2.1 }), flop ? 0.002 : 0.007)),
    sec([0, 0.461, 0.27], ruff(egg(0.055, 0.044, 0.049, { p: 2.15 }), 0.004)),
    sec([0, 0.452, 0.29], egg(0.038, 0.032, 0.04, { bumps: [[0.55, 0.003, 0.25], [-0.55, 0.003, 0.25]] })),
    sec([0, 0.44, 0.31], egg(0.028, 0.023, 0.024)),
    sec([0, 0.435, 0.33], egg(0.023, 0.019, 0.018)),
    sec([0, 0.433, 0.347], egg(0.0185, 0.016, 0.014)),
  ], { cap: [0.012, 0.008], capSteps: 5 });
};
const jaw = () => new Loft([
  sec([0, 0.418, 0.27], egg(0.028, 0.012, 0.02)),
  sec([0, 0.416, 0.297], egg(0.023, 0.009, 0.015)),
  sec([0, 0.415, 0.322], egg(0.018, 0.007, 0.011)),
  sec([0, 0.416, 0.341], egg(0.014, 0.006, 0.008)),
], { cap: [0, 0.008], capSteps: 4 });
const nose = () => new Loft([sec([0, 0.4365, 0.351], egg(0.0125, 0.009, 0.0085, { p: 2.4 })), sec([0, 0.438, 0.359], egg(0.0122, 0.0088, 0.008, { p: 2.4 }))], { cap: [0, 0.0045], capSteps: 4 });
function ear(C, s) {
  if (C.ears === 'flop') {
    const O = [s, 0, 0];
    return new Loft([
      sec([s * 0.038, 0.488, 0.244], egg(0.008, 0.02, 0.018), O),
      sec([s * 0.058, 0.497, 0.244], egg(0.006, 0.024, 0.021), O),
      sec([s * 0.072, 0.478, 0.25], egg(0.0055, 0.024, 0.021), O),
      sec([s * 0.076, 0.445, 0.256], egg(0.005, 0.02, 0.018), O),
      sec([s * 0.073, 0.418, 0.259], egg(0.004, 0.012, 0.011), O),
    ], { cap: [0, 0.006], capSteps: 3 });
  }
  const fold = C.ears === 'fold', up = [s * 0.3, 0, 1], cup = (w, u, d) => egg(w, u, d, { p: 2.2, bumps: [[0, -0.014, 0.55]] });
  return new Loft([
    sec([s * 0.028, 0.48, 0.247], cup(0.024, 0.012, 0.016), up),
    sec([s * 0.033, 0.496, 0.246], cup(0.0235, 0.012, 0.012), up),
    sec([s * 0.038, 0.515, 0.248], cup(0.017, 0.0095, 0.009), up),
    fold ? sec([s * 0.043, 0.527, 0.258], cup(0.011, 0.006, 0.006), [s * 0.3, 0.6, 0.6]) : sec([s * 0.042, 0.532, 0.25], cup(0.0105, 0.006, 0.006), up),
    fold ? sec([s * 0.046, 0.522, 0.272], egg(0.004, 0.002, 0.003), [s * 0.3, 1, 0]) : sec([s * 0.046, 0.546, 0.252], egg(0.0035, 0.002, 0.0025), up),
  ], { cap: [0, 0.005], capSteps: 3 });
}
const toes = [[0, -0.0018, 0.12], [0.75, -0.0016, 0.12], [-0.75, -0.0016, 0.12]];
const fore = (s) => {
  const F = [0, 0, 1], U = [0, 1, 0];
  return new Loft([
    sec([s * 0.034, 0.365, 0.128], egg(0.0312, 0.048, 0.0504), F),
    sec([s * 0.05, 0.3, 0.135], egg(0.0372, 0.0504, 0.0552), F),
    sec([s * 0.054, 0.25, 0.12], egg(0.0312, 0.0384, 0.0444), F),
    sec([s * 0.054, 0.205, 0.105], egg(0.0252, 0.0276, 0.036), F),
    sec([s * 0.051, 0.14, 0.115], egg(0.021, 0.0228, 0.024), F),
    sec([s * 0.049, 0.09, 0.124], egg(0.019, 0.0198, 0.0192), F),
    sec([s * 0.048, 0.055, 0.13], egg(0.0182, 0.019, 0.019), F),
    sec([s * 0.048, 0.031, 0.141], egg(0.021, 0.0204, 0.0186), [0, 0.6, 0.8]),
    sec([s * 0.048, 0.0195, 0.156], egg(0.0258, 0.019, 0.018, { p: 2.3 }), U),
    sec([s * 0.048, 0.0168, 0.172], egg(0.0246, 0.0154, 0.0156, { p: 2.4, bumps: toes }), U),
  ], { cap: [0, 0.0095], capSteps: 4 });
};
const hindL = (s) => {
  const F = [0, 0, 1], U = [0, 1, 0];
  return new Loft([
    sec([s * 0.036, 0.37, -0.15], egg(0.036, 0.06, 0.06), F),
    sec([s * 0.056, 0.31, -0.165], egg(0.0408, 0.0696, 0.072), F),
    sec([s * 0.061, 0.255, -0.14], egg(0.0348, 0.054, 0.0576), F),
    sec([s * 0.061, 0.205, -0.118], egg(0.0264, 0.0312, 0.036), F),
    sec([s * 0.057, 0.15, -0.17], egg(0.0216, 0.0228, 0.0312), F),
    sec([s * 0.052, 0.095, -0.222], egg(0.018, 0.0186, 0.0228), F),
    sec([s * 0.051, 0.05, -0.2], egg(0.0182, 0.0192, 0.019), [0, 0.45, 0.9]),
    sec([s * 0.051, 0.0195, -0.174], egg(0.0252, 0.019, 0.018, { p: 2.3 }), U),
    sec([s * 0.051, 0.0168, -0.159], egg(0.024, 0.0154, 0.0156, { p: 2.4, bumps: toes }), U),
  ], { cap: [0, 0.0095], capSteps: 4 });
};
const tail = () => {
  const X1 = [1, 0, 0], fl = (r) => fringe(r, 0, Math.PI * 2 - 0.01, 10, 0.003);
  return new Loft([
    sec([0, 0.37, -0.2], egg(0.022, 0.022, 0.022), X1),
    sec([0, 0.395, -0.226], fl(egg(0.028, 0.028, 0.028)), X1),
    sec([0, 0.44, -0.242], fl(egg(0.031, 0.031, 0.031)), X1),
    sec([0, 0.48, -0.214], fl(egg(0.029, 0.029, 0.029)), X1),
    sec([0.012, 0.49, -0.17], fl(egg(0.024, 0.024, 0.024)), X1),
    sec([0.026, 0.47, -0.14], egg(0.018, 0.018, 0.018), X1),
  ], { cap: [0, 0.018], capSteps: 4 });
};
/** The collar: a band round the neck (an ellipse round the neck axis) and its tag. */
function collar() {
  const C = new THREE.Vector3(0, 0.39, 0.205), A = new THREE.Vector3(0, 0.655, 0.756).normalize(), U = new THREE.Vector3(0, 0.756, -0.655), S = new THREE.Vector3(1, 0, 0);
  const n = 28, secs = [];
  for (let k = 0; k <= n; k++) {
    const f = (k / n) * Math.PI * 2, c = Math.cos(f), r = c > 0 ? 0.058 : 0.058 + 0.02 * -c;
    const p = C.clone().addScaledVector(S, Math.sin(f) * 0.061).addScaledVector(U, c * r);
    secs.push(sec(p.toArray(), egg(0.0032, 0.0085, 0.0085), A.toArray()));
  }
  const tag = C.clone().addScaledVector(U, -0.084).addScaledVector(A, -0.008);
  const D = U.clone().negate();
  const tagL = new Loft([sec(tag.clone().addScaledVector(D, -0.002).toArray(), egg(0.0095, 0.0095, 0.0095), A.toArray()), sec(tag.clone().addScaledVector(D, 0.002).toArray(), egg(0.0095, 0.0095, 0.0095), A.toArray())], { cap: [0.001, 0.001], capSteps: 2 });
  return { band: new Loft(secs), tag: tagL };
}

const CACHE = {};
export function dogAssets(kind = 'pochi') {
  if (CACHE[kind]) return CACHE[kind];
  const C = COATS[kind] || COATS.pochi;
  const B = new Builder(1024, 1024, 4), b = (n) => BI[n];
  B.part(torso(), { rect: [0, 0, 760, 440], cols: 40, rows: 34, paint: painter(C, 'body'), skin: polySkin([[0, 0.34, -0.26], J.chest, J.neck, J.head, [0, 0.46, 0.27]], [b('body'), b('chest'), b('neck'), b('head')], [0.05, 0.03, 0.025]) });
  B.part(head(C), { rect: [768, 0, 256, 300], cols: 44, rows: 32, paint: painter(C, 'head'), skin: () => [[b('head'), 1]] });
  B.part(jaw(), { rect: [768, 308, 128, 96], cols: 20, rows: 10, paint: painter(C, 'jaw'), skin: () => [[b('jaw'), 1]] });
  B.part(nose(), { rect: [904, 308, 64, 48], cols: 16, rows: 6, paint: painter(C, 'nose'), skin: () => [[b('head'), 1]] });
  for (const [n, s, x] of [['earL', 1, 768], ['earR', -1, 872]]) B.part(ear(C, s), { rect: [x, 412, 96, 100], cols: 18, rows: 12, paint: painter(C, n), skin: () => [[b(n), 1]] });
  const legs = [['FL', 1, 0], ['FR', -1, 128], ['BL', 1, 256], ['BR', -1, 384]];
  for (const [k, s, x] of legs) {
    const front = k[0] === 'F', top = front ? 'chest' : 'body', j1 = J['leg' + k], j2 = J[(front ? 'arm' : 'shin') + k], j3 = J['paw' + k];
    const toe = front ? [s * 0.048, 0.014, 0.18] : [s * 0.051, 0.014, -0.15];
    B.part(front ? fore(s) : hindL(s), { rect: [x, 520, 120, 400], cols: 18, rows: 26, paint: painter(C, 'leg' + k), skin: polySkin([[j1[0] * 0.6, j1[1] + 0.07, j1[2]], j1, j2, j3, toe], [b(top), b('leg' + k), b((front ? 'arm' : 'shin') + k), b('paw' + k)], front ? [0.035, 0.022, 0.016] : [0.05, 0.024, 0.016]) });
  }
  B.part(tail(), { rect: [512, 520, 120, 400], cols: 18, rows: 30, paint: painter(C, 'tail'), skin: polySkin([[0, 0.35, -0.18], J.tail0, J.tail1, J.tail2, J.tail3, [0.03, 0.46, -0.13]], [b('body'), b('tail0'), b('tail1'), b('tail2'), b('tail3')], 0.02) });
  const K = collar();
  B.part(K.band, { rect: [640, 520, 120, 64], cols: 10, rows: 30, paint: painter(C, 'collar'), skin: () => [[b('neck'), 0.6], [b('chest'), 0.4]] });
  B.part(K.tag, { rect: [640, 592, 48, 32], cols: 12, rows: 6, paint: painter(C, 'tag'), skin: () => [[b('neck'), 0.6], [b('chest'), 0.4]] });
  CACHE[kind] = { geometry: B.geometry(), map: B.texture() };
  return CACHE[kind];
}

// ------------------------------------------------------------------ the rig
const LEGS = [['legFL', 'armFL', 'pawFL', 0, 1], ['legFR', 'armFR', 'pawFR', 0, -1], ['legBL', 'shinBL', 'pawBL', 1, 1], ['legBR', 'shinBR', 'pawBR', 1, -1]];
const _e = new THREE.Euler(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _inv = new THREE.Matrix4();
const _end = new THREE.Vector3(), _foot = new THREE.Vector3();

/** A dog: one skinned mesh on a skeleton, posed in code. pose: stand | sit | sniff | squat (bark: barkT > 0). */
export class Dog {
  constructor(kind = 'pochi', opts = {}) {
    const A = dogAssets(kind);
    this.kind = kind;
    this.root = new THREE.Group();
    this.root.name = 'dog:' + kind;
    this.mat = new THREE.MeshStandardMaterial({ map: A.map, roughness: 0.88, metalness: 0 });
    this.bones = [];
    for (const [name, parent, p] of DOG_BONES) {
      const bn = new THREE.Bone(); bn.name = name;
      const pp = parent ? J[parent] : [0, 0, 0];
      bn.position.set(p[0] - pp[0], p[1] - pp[1], p[2] - pp[2]);
      if (parent) this.bones.find((x) => x.name === parent).add(bn);
      this.bones.push(bn);
    }
    this.b = Object.fromEntries(this.bones.map((x) => [x.name, x]));
    this.rest = Object.fromEntries(this.bones.map((x) => [x.name, x.position.clone()]));
    this.legs = LEGS.map(([a, m, p, hind, side]) => legChain(J, [a, m, p], hind ? [side * 0.051, 0, -0.17] : [side * 0.048, 0, 0.158], hind, side));
    this.mesh = new THREE.SkinnedMesh(A.geometry, this.mat);
    this.mesh.add(this.bones[0]);
    this.mesh.updateMatrixWorld(true);
    this.mesh.bind(new THREE.Skeleton(this.bones));
    this.mesh.castShadow = opts.cast ?? true; this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    this.mesh.raycast = () => {};
    this.root.add(this.mesh);
    this.pos = this.root.position;
    this.heading = 0; this.phase = 0; this.speed = 0; this.pose = 'stand'; this.wag = 0.5; this.t = Math.random() * 10; this.barkT = 0;
    this.w = { stand: 1, sit: 0, sniff: 0, squat: 0 };
    this.spd = 0; this.look = [0, 0]; this.lookAt = null; this.tailS = [0, 0]; this.yawRate = 0; this.prevYaw = null;
  }

  /** World position of the collar (where the lead clips on). */
  collar(out = new THREE.Vector3()) { return this.b.neck.localToWorld(out.set(0, -0.006, 0.07)); }
  nose(out = new THREE.Vector3()) { return this.b.head.localToWorld(out.set(0, -0.006, 0.13)); }

  update(dt) {
    dt = Math.min(dt, 0.1);
    if (!(dt > 0)) return;
    this.t += dt;
    const b = this.b, R = this.rest, t = this.t;
    for (const k of Object.keys(this.w)) this.w[k] += ((k === this.pose ? 1 : 0) - this.w[k]) * Math.min(1, dt * 6);
    const W = this.w, sit = W.sit, sniff = W.sniff, squat = W.squat;
    this.spd = lerp(this.spd, this.speed, 1 - Math.exp(-dt * 6));
    const v = this.spd, mov = sm(0.05, 0.25, v) * (1 - sit) * (1 - squat);
    this.phase += dt * (2.2 + v * 5.2);
    const yaw = this.root.rotation.y;
    if (this.prevYaw === null) this.prevYaw = yaw;
    this.yawRate = lerp(this.yawRate, clamp(Math.atan2(Math.sin(yaw - this.prevYaw), Math.cos(yaw - this.prevYaw)) / dt, -10, 10), 1 - Math.exp(-dt * 8)); this.prevYaw = yaw;
    // trunk
    const ph = this.phase, trot = sm(0.5, 0.9, v);
    let y = -0.1 * sit - 0.07 * squat + (Math.abs(Math.sin(ph)) - 0.5) * 0.008 * mov * (0.5 + trot), pitch = -0.62 * sit - 0.28 * squat + 0.06 * sniff;
    pitch += Math.sin(ph * 2) * 0.025 * mov * trot;
    b.body.position.set(R.body.x, R.body.y + y, R.body.z - 0.02 * sit);
    b.body.quaternion.setFromEuler(_e.set(pitch, 0, Math.sin(ph) * 0.03 * mov, 'YXZ'));
    const br = Math.sin(t * (this.barkT > 0 ? 9 : 2.6)) * 0.008;
    b.chest.quaternion.setFromEuler(_e.set(-0.2 * sit + 0.12 * squat + 0.08 * sniff, clamp(this.yawRate * 0.05, -0.2, 0.2) + Math.sin(ph) * 0.04 * mov, 0, 'YXZ'));
    b.chest.scale.set(1 + br * 0.5, 1 + br, 1);
    // neck and head: up when sitting, down to the ground when sniffing, a jerk with each bark
    this.barkT = Math.max(0, this.barkT - dt);
    const bark = this.barkT > 0 ? Math.sin((0.35 - this.barkT) / 0.35 * Math.PI) : 0;
    const idleY = Math.sin(t * 0.45) * 0.45 * (1 - mov) * (1 - sniff), idleP = Math.sin(t * 0.7) * 0.06;
    let hy = idleY + Math.sin(t * 1.7) * 0.3 * sniff, hp = idleP * (1 - sniff) + 0.05 * mov;
    if (this.lookAt) {
      this.root.updateWorldMatrix(true, false);
      _v.copy(this.lookAt); this.root.worldToLocal(_v);
      const a = Math.atan2(_v.x, _v.z - 0.3);
      if (Math.abs(a) < 1.6) hy = lerp(hy, clamp(a, -0.9, 0.9), 0.85);
    }
    this.look[0] = lerp(this.look[0], hy, 1 - Math.exp(-dt * 5)); this.look[1] = lerp(this.look[1], hp, 1 - Math.exp(-dt * 8));
    const trunk = _q.copy(b.body.quaternion).multiply(b.chest.quaternion);
    const neckP = 0.95 * sniff + 0.25 * squat - 0.35 * sit - 0.25 * bark, neckQ = _q2.setFromEuler(_e.set(neckP + 0.1 * mov, this.look[0] * 0.4, 0, 'YXZ'));
    b.neck.quaternion.copy(trunk).invert().multiply(neckQ).slerp(neckQ, 0.3);
    const hq = _e.set(this.look[1] + 0.35 * sniff + Math.sin(t * 9) * 0.05 * sniff - 0.15 * bark - neckP * 0.55, this.look[0] * 0.6, Math.sin(t * 0.33) * 0.06 * (1 - mov), 'YXZ');
    b.head.quaternion.setFromEuler(hq);
    b.jaw.quaternion.setFromEuler(_e.set(0.38 * bark + (sniff > 0.5 ? 0 : 0.03 * Math.max(0, Math.sin(t * 3.1)) * (this.pant || 0)), 0, 0));
    for (const [n, s] of [['earL', 1], ['earR', -1]]) b[n].quaternion.setFromEuler(_e.set(-0.25 * sit * 0 + 0.15 * bark - 0.12 * mov * trot, 0, -s * (0.05 + 0.08 * Math.sin(t * 0.8 + s)), 'YXZ'));
    // tail: a wag (faster when happy), up and over; straight up and still when squatting
    const wagF = 6 + this.wag * 10, wagA = (0.12 + this.wag * 0.38) * (1 - squat);
    b.tail0.quaternion.setFromEuler(_e.set(-0.1 * squat + 0.12 * sit, Math.sin(t * wagF) * wagA, Math.sin(t * wagF) * wagA * 0.5 - 0.15, 'YXZ'));
    b.tail1.quaternion.setFromEuler(_e.set(0.1 * sit - 0.4 * squat, Math.sin(t * wagF - 0.6) * wagA * 0.5, 0, 'YXZ'));
    b.tail2.quaternion.setFromEuler(_e.set(-0.5 * squat, Math.sin(t * wagF - 1.2) * wagA * 0.4, 0, 'YXZ'));
    // legs: a walk / trot of diagonal pairs; sitting folds the hind legs onto the hocks, squatting crouches them
    this.root.updateMatrixWorld(true);
    _inv.copy(this.root.matrixWorld).invert();
    const fwd = _v3.set(0, 0, 1).applyQuaternion(b.body.quaternion), amp = (0.3 + 0.18 * trot) * mov;
    for (let i = 0; i < 4; i++) {
      const L = this.legs[i], hind = L.hind, A = b[L.a];
      const piv = A.parent.localToWorld(_v.copy(A.position)).applyMatrix4(_inv);
      const off = i === 0 || i === 3 ? 0 : Math.PI, a = ph + off;
      const lift = Math.max(0, Math.cos(a)) * mov;
      let ang = Math.sin(a) * amp;
      if (hind) ang += 1.15 * sit + 0.6 * squat; else ang += -0.05 * sit - 0.12 * sniff;
      const reach = Math.max(0.02, piv.y) / Math.max(0.35, Math.cos(clamp(ang, -1.2, 1.2)));
      let s = clamp(reach / L.L, 0.3, 1.5);
      if (hind) s = lerp(s, 0.6, sit) * (1 - 0.15 * squat);
      s *= 1 - 0.16 * lift;
      _foot.set(piv.x, piv.y - Math.cos(ang) * s * L.L, piv.z + Math.sin(ang) * s * L.L);
      const contact = clamp(1 - lift * 1.3, 0, 1);
      _foot.y = lerp(_foot.y, 0, contact);
      const sh = hind ? sit : 0;
      _end.copy(_foot);
      if (hind) _end.add(_v2.set(0, lerp(L.off.y, 0.02, sh), lerp(L.off.z, -0.085, sh)));
      else _end.add(_v2.copy(L.off));
      solveLeg(b, L, { piv, end: _end, foot: _foot, fwd, parentQ: hind ? b.body.quaternion : trunk, contact, flex: hind ? -0.3 * (1 - contact) : 0.6 * (1 - contact) });
    }
  }

  dispose() { this.root.removeFromParent(); }
}

// ------------------------------------------------------------------ the street dogs (walked on a lead by passers-by)
// Drop-in for src/npc/streetProps.js's voxel StreetDog: same API (pos, heading, speed, pose, wag, vel, collar(), nose(),
// bark(), update(dt), dispose()).
const STREET = { shiro: { scale: 1.06 }, goma: { scale: 1 }, chibi: { scale: 0.84 } };
export const DOG_KINDS = Object.keys(STREET);
export class StreetDog extends Dog {
  constructor(game, kind = 'shiro') {
    super(STREET[kind] ? kind : 'shiro');
    this.game = game;
    this.root.scale.setScalar(STREET[kind]?.scale || 1);
    this.vel = { x: 0, z: 0 };
    this.t = Math.random() * 9;
    game.scene.add(this.root);
  }
  bark() {
    this.barkT = 0.35;
    import('../core/audio.js').then(({ audio }) => { try { audio.play('bark', { pos: this.nose(new THREE.Vector3()), vol: 0.7, pitch: 1.15 }); } catch { /* audio not ready */ } });
  }
  update(dt) {
    const r = this.root;
    r.rotation.y += Math.atan2(Math.sin(this.heading - r.rotation.y), Math.cos(this.heading - r.rotation.y)) * Math.min(1, dt * 8);
    super.update(dt);
  }
}
