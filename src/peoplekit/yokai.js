// The yokai who come out on the lane after dark (src/npc/props.js Creature): a kappa, a white kitsune (its three tails
// are their own meshes), a Shigaraki-style tanuki and a kasa-obake, modelled with the people kit (src/peoplekit/kit.js)
// in metres, standing on the origin, facing +z. Charming, a little uncanny: sculpted bodies with smooth joins, glossy
// bead eyes, painted details. Every builder returns a BufferGeometry (drawn with kitMaterials('self'): faintly self-lit
// after dark).
import { Kit, MAT, v3, oval, smooth, sd, shade, mix, lerp } from './kit.js';
import { bead, INK } from './parts.js';

const TAU = Math.PI * 2;
const M = () => new Kit({ uvk: 1 });

export const YOKAI = {
  /** Kappa (~0.95 m): green and a little slimy, a yellow beak, a turtle shell, webbed hands and feet, the dish on top. */
  kappa() {
    const G = 0x5aa04a, D = 0x3f7f38, BELLY = 0xd8d890, Y = 0xe8c040;
    const K = M();
    K.sculpt((p) => {
      let d = sd.ell(p, [0, 0.36, 0.01], [0.17, 0.21, 0.14]);
      d = sd.u(d, sd.ell(p, [0, 0.71, 0.02], [0.155, 0.145, 0.15]), 0.05); // head
      for (const sx of [-1, 1]) {
        d = sd.u(d, sd.cone(p, [sx * 0.14, 0.47, 0.0], [sx * 0.24, 0.36, 0.06], 0.045, 0.032), 0.03); // upper arm
        d = sd.u(d, sd.cone(p, [sx * 0.24, 0.36, 0.06], [sx * 0.26, 0.27, 0.12], 0.032, 0.026), 0.02);
        for (const a of [-0.5, 0, 0.5]) d = sd.u(d, sd.cone(p, [sx * 0.26, 0.27, 0.12], [sx * (0.26 + Math.sin(a) * 0.04), 0.22, 0.12 + Math.cos(a) * 0.045], 0.016, 0.008), 0.012); // fingers
        d = sd.u(d, sd.cone(p, [sx * 0.08, 0.2, 0.0], [sx * 0.1, 0.05, 0.03], 0.055, 0.04), 0.04); // legs
        d = sd.u(d, sd.ell(p, [sx * 0.105, 0.02, 0.07], [0.06, 0.022, 0.085]), 0.03); // webbed feet
      }
      return Math.max(d, -p[1]);
    }, [-0.32, -0.01, -0.2, 0.32, 0.88, 0.24], 0.014, { mat: MAT.plastic, col: (p, n) => (p[2] > 0.08 && p[1] > 0.2 && p[1] < 0.5 && Math.abs(p[0]) < 0.12 ? BELLY : n[1] > 0.6 || p[2] < -0.08 ? D : G) });
    // the shell on the back: plates and a pale rim
    const plates = K.paint('kappaYokaiShell', 128, 128, (g, w, h) => {
      g.fillStyle = '#6a4a2a'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#8a6a3a'; g.strokeStyle = '#4a321c'; g.lineWidth = 3;
      const hx = (cx, cy, r) => { g.beginPath(); for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke(); };
      for (const [x, y] of [[64, 64], [64, 24], [64, 104], [29, 44], [99, 44], [29, 84], [99, 84]]) hx(x, y, 19);
    }, { rough: 0.45 });
    K.sculpt((p) => Math.max(sd.ell(p, [0, 0.37, -0.1], [0.19, 0.21, 0.1]), p[2] + 0.1), [-0.21, 0.14, -0.22, 0.21, 0.6, -0.08], 0.01, { mat: plates, col: 0xffffff, uvMap: (p) => [(p[0] + 0.19) / 0.38, (p[1] - 0.16) / 0.42] });
    K.tube(oval(0.19, 0.21, 48).map(([x, y]) => [x, y + 0.37, -0.1]), 0.012, { closed: true, sides: 6, mat: MAT.plastic, col: 0xc8b878 });
    // the beak, the eyes, the fringe and the dish
    K.sculpt((p) => sd.u(sd.ell(p, [0, 0.675, 0.15], [0.06, 0.028, 0.07]), sd.ell(p, [0, 0.645, 0.14], [0.05, 0.02, 0.06]), 0.01), [-0.08, 0.6, 0.06, 0.08, 0.72, 0.24], 0.006, { mat: MAT.gloss, col: (p) => (p[1] < 0.655 ? shade(Y, 0.78) : Y) });
    for (const sx of [-1, 1]) bead(K, [sx * 0.072, 0.755, 0.125], 0.038, { dir: [sx * 0.3, 0, 1], pupil: 0.5 });
    for (let k = 0; k < 20; k++) {
      const a = (k / 20) * TAU, s = Math.sin(a), c = Math.cos(a);
      if (c > 0.6) continue; // the face stays clear
      K.tube(smooth([[s * 0.12, 0.82, 0.02 + c * 0.12], [s * 0.158, 0.79, 0.02 + c * 0.158], [s * 0.165, 0.73 - (k % 2) * 0.015, 0.02 + c * 0.165]], 3), (t) => 0.024 * (1 - t) + 0.005, { sides: 6, caps: 'round', mat: MAT.fur, col: k % 2 ? 0x2a4a2a : 0x34583a });
    }
    K.with([0, 0.835, 0.02], [0, 0, 0], 1, () => {
      K.lathe([[0.09, 0], [0.108, 0.008], [0.11, 0.026], [0.1, 0.03], [0.09, 0.02], [0.06, 0.014], [0, 0.012]], { seg: 32, mat: MAT.gloss, col: 0xf0ead6 });
      K.lathe([[0.092, 0.022], [0, 0.022]], { seg: 32, mat: MAT.glass, col: 0x7ac0e8, flip: true });
    });
    return K.build();
  },
  /** Kitsune (~0.65 m): a white fox sitting up, red markings, amber eyes (the tails: kitsuneTail). */
  kitsune() {
    const W = 0xf4f0ea, C = 0xe8e0d4, R = 0xc83030;
    const K = M();
    K.sculpt((p) => {
      let d = sd.ell(p, [0, 0.19, -0.03], [0.11, 0.17, 0.11]); // haunches
      d = sd.u(d, sd.ell(p, [0, 0.31, 0.04], [0.085, 0.12, 0.08]), 0.05); // chest
      d = sd.u(d, sd.ell(p, [0, 0.45, 0.04], [0.08, 0.075, 0.08]), 0.04); // head
      d = sd.u(d, sd.cone(p, [0, 0.435, 0.09], [0, 0.415, 0.19], 0.042, 0.016), 0.03); // muzzle
      for (const sx of [-1, 1]) {
        const ear = (q) => sd.cone([q[0], q[1], (q[2] - 0.02) * 2.4 + 0.02], [sx * 0.045, 0.5, 0.02], [sx * 0.085, 0.62, 0.02], 0.032, 0.004);
        d = sd.u(d, ear(p), 0.02);
        d = sd.u(d, sd.cone(p, [sx * 0.045, 0.3, 0.07], [sx * 0.045, 0.02, 0.1], 0.025, 0.02), 0.025); // forelegs
        d = sd.u(d, sd.ell(p, [sx * 0.045, 0.012, 0.115], [0.025, 0.014, 0.035]), 0.01); // paws
        d = sd.u(d, sd.ell(p, [sx * 0.085, 0.03, 0.0], [0.04, 0.03, 0.09]), 0.03); // hind feet
      }
      return Math.max(d, -p[1]);
    }, [-0.16, -0.01, -0.16, 0.16, 0.66, 0.22], 0.0095, { mat: MAT.fur, col: (p, n) => {
      const ax = Math.abs(p[0]);
      if (p[1] > 0.5 && n[2] > 0.3 && ax > 0.04) return R; // inside the ears
      if (p[1] > 0.462 && p[1] < 0.478 && ax > 0.03 && ax < 0.07 && n[2] > 0.4) return R; // flame brows
      if (p[2] > 0.08 && p[1] > 0.22 && p[1] < 0.4) return C;
      return W;
    } });
    K.blob([0, 0.418, 0.198], [0.015, 0.012, 0.012], { mat: MAT.eye, col: INK, seg: 10 });
    for (const sx of [-1, 1]) {
      K.blob([sx * 0.043, 0.452, 0.104], [0.016, 0.011, 0.008], { mat: MAT.eye, col: 0xe8a020, seg: 12 });
      K.blob([sx * 0.043, 0.452, 0.111], [0.004, 0.009, 0.003], { mat: MAT.eye, col: INK, seg: 8 });
      K.tube([[sx * 0.022, 0.405, 0.15], [sx * 0.05, 0.395, 0.12]], 0.003, { sides: 4, mat: MAT.matte, col: R });
    }
    K.tube(oval(0.07, 0.06, 32).map(([x, z]) => [x, 0.385, 0.04 + z]), 0.008, { closed: true, sides: 6, mat: MAT.cloth, col: R });
    K.blob([0, 0.36, 0.11], [0.012, 0.016, 0.01], { mat: MAT.metal, col: 0xe0b040, seg: 10 }); // a little bell
    return K.build();
  },
  kitsuneTail() {
    const K = M();
    const path = [];
    for (let k = 0; k <= 14; k++) { const t = k / 14; path.push([0, t * 0.36, -Math.sin(t * 2.6) * 0.045]); }
    K.tube(path, (t) => 0.03 + Math.sin(Math.min(1, t * 1.05) * Math.PI) ** 0.8 * 0.05, { sides: 14, caps: 'round', mat: MAT.fur, col: (p) => (p[1] > 0.3 ? 0xc83030 : 0xf4f0ea) });
    return K.build();
  },
  /** Tanuki (~0.95 m): the round-bellied Shigaraki statue: straw hat, sake bottle, a ledger, a cheeky grin. */
  tanuki() {
    const B = 0x8a6a4a, Dk = 0x4a3426, L = 0xd8c8a8;
    const K = M();
    K.sculpt((p) => {
      let d = sd.ell(p, [0, 0.28, 0], [0.2, 0.235, 0.18]); // the belly
      d = sd.u(d, sd.ell(p, [0, 0.62, 0.015], [0.14, 0.13, 0.13]), 0.06); // head
      d = sd.u(d, sd.ell(p, [0, 0.585, 0.12], [0.06, 0.04, 0.045]), 0.03); // muzzle
      for (const sx of [-1, 1]) {
        d = sd.u(d, sd.ell(p, [sx * 0.085, 0.725, -0.01], [0.04, 0.035, 0.025]), 0.02); // ears
        d = sd.u(d, sd.cone(p, [sx * 0.17, 0.42, 0.0], [sx * 0.22, 0.3, 0.1], 0.05, 0.04), 0.04); // arms
        d = sd.u(d, sd.ell(p, [sx * 0.1, 0.02, 0.07], [0.065, 0.03, 0.08]), 0.04); // feet
      }
      d = sd.u(d, sd.cone(p, [0, 0.16, -0.16], [0, 0.06, -0.22], 0.05, 0.035), 0.04); // tail
      return Math.max(d, -p[1]);
    }, [-0.3, -0.01, -0.3, 0.3, 0.78, 0.26], 0.014, { mat: MAT.plastic, col: (p, n) => {
      if (p[2] > 0.05 && p[1] > 0.06 && p[1] < 0.45 && Math.hypot(p[0], (p[1] - 0.27) * 0.9) < 0.15) return L; // the belly
      if (p[1] > 0.56 && p[1] < 0.63 && p[2] > 0.13) return L;
      if (p[1] > 0.6 && p[1] < 0.66 && Math.abs(p[0]) > 0.03 && Math.abs(p[0]) < 0.11 && p[2] > 0.09) return Dk; // the mask round the eyes
      if (p[2] < -0.17 && p[1] < 0.15 && Math.floor((p[1] - 0.05) / 0.025) % 2) return Dk; // a ringed tail
      return B;
    } });
    for (const sx of [-1, 1]) bead(K, [sx * 0.058, 0.635, 0.118], 0.026, { dir: [sx * 0.3, 0, 1], pupil: 0.55 });
    K.blob([0, 0.598, 0.163], [0.02, 0.015, 0.014], { mat: MAT.eye, col: INK, seg: 10 });
    K.tube(smooth([[-0.03, 0.555, 0.15], [0, 0.545, 0.158], [0.03, 0.555, 0.15]], 3), 0.004, { sides: 4, mat: MAT.matte, col: 0x3a2418 });
    // the straw hat (woven, tied under the chin)
    K.with([0, 0.705, 0.0], [0.12, 0, 0], 1, () => {
      K.lathe([[0.235, 0], [0.2, 0.025], [0.13, 0.07], [0.04, 0.105], [0, 0.11]], { seg: 40, sub: 2, mat: MAT.straw, col: 0xc8a050 });
      K.lathe([[0.235, 0], [0, 0.085]], { seg: 40, mat: MAT.straw, col: 0xa88038, flip: true });
    });
    for (const sx of [-1, 1]) K.tube(smooth([[sx * 0.13, 0.72, 0.03], [sx * 0.12, 0.6, 0.08], [sx * 0.04, 0.52, 0.13]], 3), 0.0035, { sides: 4, mat: MAT.cloth, col: 0xf2e8d0 });
    // the sake bottle in the right hand, the ledger in the left
    K.with([0.24, 0.24, 0.12], [0, 0, -0.12], 1, () => {
      K.lathe([[0, 0], [0.04, 0.005], [0.052, 0.04], [0.045, 0.1], [0.018, 0.14], [0.016, 0.17], [0.022, 0.18], [0, 0.182]], { seg: 20, sub: 2, mat: MAT.gloss, col: (p) => (p[1] > 0.125 ? 0xf2ece0 : 0x8a3a2a) });
      K.with([0, 0.065, 0.049], [0, 0, 0], 1, () => K.plate(smooth([[-0.022, -0.03], [0.022, -0.03], [0.022, 0.03], [-0.022, 0.03]], 1, true), () => 0, 0.002, { mat: MAT.paper, col: 0xf2ece0, rings: 2 }));
    });
    K.with([-0.24, 0.27, 0.12], [0.2, 0.25, 0.25], 1, () => {
      K.slab(smooth([[-0.05, -0.07], [0.05, -0.07], [0.05, 0.07], [-0.05, 0.07]], 1, true), 0.025, { mat: MAT.paper, col: 0xe8e0c0, b: 0.003, faceCol: 0xe8dcb8 });
      K.tube([[-0.05, 0.0, 0.0135], [0.05, 0.0, 0.0135]], 0.003, { sides: 4, mat: MAT.cloth, col: 0x2a3a6a });
      K.with([0.0, 0.025, 0.0135], [0, 0, 0], 1, () => K.plate(smooth([[-0.012, -0.03], [0.012, -0.03], [0.012, 0.03], [-0.012, 0.03]], 1, true), () => 0, 0.001, { mat: MAT.paper, col: 0xf6f2e8, rings: 2 }));
    });
    return K.build();
  },
  /** Kasa-obake (~1.15 m): an old oiled-paper umbrella with one eye, a long tongue, one leg and a geta. */
  kasa() {
    const P = 0xb8323a, P2 = 0xa02a32, RIB = 0x6a3a24, LEG = 0xe0c0a0;
    const K = M();
    K.at([0, 0.075, 0]); // (the geta stands on the ground)
    // the canopy, folded down: eight paper panels pleated between the ribs
    const fold = (y, a) => 1 + 0.16 * (Math.abs(Math.sin(a * 4)) - 0.5) * Math.min(1, (1.0 - y) / 0.4);
    K.lathe([[0.3, 0.3], [0.31, 0.36], [0.27, 0.5], [0.2, 0.7], [0.12, 0.86], [0.05, 0.98], [0.012, 1.02]], { seg: 64, sub: 3, mat: MAT.paper, sx: fold, sz: fold, col: (p) => { const a = Math.atan2(p[0], p[2]); return Math.floor(((a + Math.PI) / TAU) * 8) % 2 ? P : P2; } });
    K.lathe([[0.28, 0.3], [0.1, 0.8], [0, 0.95]], { seg: 64, mat: MAT.paper, sx: fold, sz: fold, col: shade(P, 0.6), flip: true });
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU + Math.PI / 8;
      const pts = [[0.3, 0.3], [0.31, 0.36], [0.27, 0.5], [0.2, 0.7], [0.12, 0.86], [0.05, 0.98]].map(([r, y]) => { const f = fold(y, a) + 0.03; return [Math.sin(a) * r * f, y, Math.cos(a) * r * f]; });
      K.tube(smooth(pts, 3), 0.006, { sides: 5, caps: 'round', mat: MAT.wood, col: RIB });
    }
    K.lathe([[0.012, 0.99], [0.016, 1.06], [0.026, 1.08], [0.02, 1.11], [0, 1.12]], { seg: 12, mat: MAT.wood, col: RIB });
    K.tube(oval(0.29, 0.29, 48).map(([x, z]) => [x, 0.31, z]), 0.01, { closed: true, sides: 6, mat: MAT.cloth, col: 0x2a2228 });
    // one big eye and the long tongue
    K.with([0, 0.66, 0.2], [-0.33, 0, 0], 1, () => {
      K.plate(oval(0.075, 0.062, 32), (x, y) => 0.012 * (1 - (x / 0.075) ** 2 - (y / 0.062) ** 2), 0.012, { mat: MAT.gloss, col: 0xfffaf0, rings: 5 });
      K.plate(oval(0.032, 0.036, 24, 2, 0.008, -0.004), () => 0.02, 0.006, { mat: MAT.eye, col: INK, rings: 3 });
      K.blob([0.018, 0.012, 0.025], [0.008, 0.008, 0.004], { mat: MAT.eye, col: 0xffffff, seg: 8 });
      K.tube(smooth([[-0.08, 0.05, 0.0], [0, 0.085, 0.01], [0.08, 0.05, 0.0]], 4), 0.006, { sides: 5, caps: 'round', mat: MAT.matte, col: 0x3a1418 });
    });
    K.tube(smooth([[0.0, 0.54, 0.22], [0.02, 0.47, 0.27], [0.01, 0.4, 0.28], [0.04, 0.35, 0.25]], 4), (t) => 0.03 - t * 0.008, { sides: 10, ry: 0.35, up: [0, 0, 1], caps: 'round', mat: MAT.soft, col: 0xe8606a });
    // one leg (the handle grew a knee) and a geta
    K.sculpt((p) => {
      let d = sd.cone(p, [0, 0.33, 0], [0.005, 0.17, 0.01], 0.032, 0.03);
      d = sd.u(d, sd.cone(p, [0.005, 0.17, 0.01], [0, 0.055, -0.005], 0.03, 0.022), 0.02);
      d = sd.u(d, sd.ell(p, [0, 0.04, 0.03], [0.03, 0.022, 0.06]), 0.02);
      return d;
    }, [-0.06, 0.01, -0.06, 0.06, 0.34, 0.1], 0.007, { mat: MAT.soft, col: LEG });
    K.sculpt((p) => {
      let d = sd.box(p, [0, -0.015, 0.02], [0.05, 0.008, 0.11], 0.006);
      for (const z of [-0.045, 0.075]) d = Math.min(d, sd.box(p, [0, -0.045, z], [0.045, 0.024, 0.009], 0.003));
      return d;
    }, [-0.06, -0.075, -0.1, 0.06, 0.0, 0.14], 0.005, { mat: MAT.wood, col: 0x8a6a4a });
    K.tube(smooth([[-0.035, -0.006, -0.02], [0, 0.03, 0.06], [0.035, -0.006, -0.02]], 4), 0.006, { sides: 5, mat: MAT.cloth, col: 0xc8302a });
    K.end();
    return K.build();
  },
};
void v3; void mix; void lerp; void sd;
