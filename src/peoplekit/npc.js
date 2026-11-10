// The lane people's own props and the staff applicants' extras, modelled with the people kit (src/peoplekit/kit.js):
//   NPC (src/npc/looks.js): Rohan's zig-zag headband, G-pen nib earrings, sketchbook and G-pen; Josuke's and Okuyasu's
//     collar pins; the sorcerer's hood, eyepatch and chopstick wand; the bush guy's binoculars; the pirate's manga meat.
//   STAFF (src/staff/looks.js): the kappa's dish (rim + water), beak and shell; the tanuki's ears, leaf and striped tail;
//   the yurei's forehead triangle; the not-a-ninja's mask; the robot kid's antenna.
//   OLDMAN (src/places/mikawaya/oldman.js): Mikawa-san's cloth mask, white beard and brows, fedora and cigar.
// Head pieces in head units (1 = 1/20 head; chin -4, eyes 6, crown 16, face z 10.8); the rest in metres unless noted.
import * as THREE from 'three';
import { Kit, MAT, HEAD, v3, oval, smooth, headRing, headPt, frontZ, sd, shade, mix, lerp } from './kit.js';
import { hood, ear, bead, INK } from './parts.js';

const TAU = Math.PI * 2;
const M = () => new Kit({ uvk: 1 }); // metric pieces: uvs in metres

export const NPC = {
  /** Rohan's headband: a green band round the hair with zig-zag gold edges and a dark centre line (head units). */
  headband() {
    const K = new Kit();
    const N = 26, seg = N * 4, R = (a) => headPt([Math.sin(a), 0, Math.cos(a)], 0.55, [0, 11.4, HEAD.C[2]]);
    const tri = (a) => { const u = (a / TAU) * N; return Math.abs(u - Math.floor(u) - 0.5) * 2; };
    const top = (a) => 12.3 + tri(a) * 1.1, bot = (a) => 10.5 - (1 - tri(a)) * 0.9;
    const col = (p, a) => { const y = p[1]; return y > top(a) - 0.5 || y < bot(a) + 0.5 ? 0xd8b45a : Math.abs(y - 11.4) < 0.28 ? 0x1d3a30 : 0x2f6a58; };
    const P = (off) => (i, j) => { const a = (i / seg) * TAU, c = R(a), r = Math.hypot(c[0], c[2] - HEAD.C[2]) + off; const y = lerp(bot(a), top(a), j / 6); return [Math.sin(a) * r, y, HEAD.C[2] + Math.cos(a) * r]; };
    K.grid(seg, 6, P(0.35), { wrapU: true, mat: MAT.cloth, out: (p) => [p[0], 0, p[2] - HEAD.C[2]], col: (p, u) => col(p, u * TAU) });
    K.grid(seg, 6, P(-0.1), { wrapU: true, mat: MAT.cloth, out: (p) => [-p[0], 0, -(p[2] - HEAD.C[2])], col: 0x1d3a30 });
    for (const e of [0, 6]) K.grid(seg, 2, (i, k) => { const a = (i / seg) * TAU, c = R(a), r = Math.hypot(c[0], c[2] - HEAD.C[2]) + lerp(0.35, -0.1, k / 2); const y = e ? top(a) : bot(a); return [Math.sin(a) * r, y + (e ? 1 : -1) * Math.sin((k / 2) * Math.PI) * 0.12, HEAD.C[2] + Math.cos(a) * r]; }, { wrapU: true, mat: MAT.cloth, col: 0xd8b45a, out: () => [0, e ? 1 : -1, 0] });
    return K.build();
  },
  /** A G-pen nib earring (head units): a little hoop and the split nib, hanging from the pivot. */
  nib() {
    const K = new Kit();
    K.tube(oval(0.42, 0.42, 16).map(([x, y]) => [x, y + 0.05, 0]), 0.09, { closed: true, sides: 5, mat: MAT.metal, col: 0xd9b25c });
    const out = smooth([[-0.48, -0.45], [0.48, -0.45], [0.5, -1.6], [0.28, -2.7], [0.03, -3.55], [-0.03, -3.55], [-0.28, -2.7], [-0.5, -1.6]], 3, true);
    K.plate(out, (x, y) => -0.08 * x * x * 4 + 0.02 * y, 0.12, { mat: MAT.metal, col: (p) => (Math.abs(p[0]) < 0.05 && p[1] < -1.6 ? 0x6a5426 : 0xd9b25c), rings: 6 });
    K.blob([0, -1.5, 0.1], [0.12, 0.12, 0.08], { mat: MAT.matte, col: 0x3a2a14, seg: 8 });
    return K.build();
  },
  /** A gold heart pin (metres, facing +z). */
  heart() {
    const K = M();
    const h = [];
    for (let i = 0; i < 48; i++) { const t = (i / 48) * TAU; h.push([16 * Math.sin(t) ** 3 * 0.0011, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 0.0011]); }
    K.slab(h, 0.005, { mat: MAT.metal, col: 0xe8c050, b: 0.0022 });
    return K.build();
  },
  /** A peace-sign pin (metres). */
  peace() {
    const K = M();
    K.tube(oval(0.0165, 0.0165, 40).map(([x, y]) => [x, y, 0]), 0.0024, { closed: true, sides: 8, mat: MAT.metal, col: 0xe8c050 });
    K.tube([[0, 0.0155, 0], [0, -0.0155, 0]], 0.002, { sides: 8, caps: 'round', mat: MAT.metal, col: 0xe8c050 });
    for (const sx of [-1, 1]) K.tube([[0, 0, 0], [sx * 0.011, -0.011, 0]], 0.002, { sides: 8, caps: 'round', mat: MAT.metal, col: 0xe8c050 });
    return K.build();
  },
  /** Dollar / yen glyph pins (metres): brushed strokes in gold or silver. */
  glyph(kind) {
    const K = M(), c = kind === 'yen' ? 0xd8dce4 : 0xe8c050, r = 0.0022;
    const stroke = (pts, sub = 4) => K.tube(sub > 1 ? smooth(pts, sub) : pts, r, { sides: 8, caps: 'round', mat: MAT.metal, col: c });
    if (kind === 'yen') {
      stroke([[-0.011, 0.015, 0], [0, 0.002, 0], [0.011, 0.015, 0]], 1);
      stroke([[0, 0.002, 0], [0, -0.016, 0]], 1);
      stroke([[-0.009, -0.001, 0], [0.009, -0.001, 0]], 1); stroke([[-0.009, -0.007, 0], [0.009, -0.007, 0]], 1);
    } else {
      stroke([[0.009, 0.009, 0], [0.002, 0.012, 0], [-0.008, 0.008, 0], [-0.006, 0.002, 0], [0.006, -0.002, 0], [0.008, -0.009, 0], [-0.002, -0.012, 0], [-0.009, -0.009, 0]]);
      stroke([[0, 0.016, 0], [0, -0.016, 0]], 1);
    }
    return K.build();
  },
  /** Rohan's sketchbook (hand-local, metres): kraft hardcover, wire spiral, the open page on the palm side. */
  sketchbook(drawPage) {
    const K = M();
    const W = 0.016, Hb = 0.2, D = 0.155;
    const page = K.paint('rohanPage', 48, 60, drawPage, { rough: 0.95 });
    const tex = K.extra.find((e) => e.key === 'rohanPage').tex; // a printed page: crisp pixels
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
    const rect = (w, h) => smooth([[-w, -h], [w, -h], [w, h], [-w, h]], 1, true);
    K.with([W / 2 - 0.0015, 0, 0], [0, Math.PI / 2, 0], 1, () => K.slab(rect(D / 2, Hb / 2), 0.003, { mat: MAT.card, col: 0x9a7a52, b: 0.001 }));
    K.with([-W / 2 + 0.0015, 0, 0], [0, -Math.PI / 2, 0], 1, () => K.slab(rect(D / 2, Hb / 2), 0.003, { mat: MAT.card, col: 0x9a7a52, b: 0.001, faceMat: page, faceCol: 0xffffff, uvMap: (x, y) => [(x + D / 2) / D, (y + Hb / 2) / Hb] }));
    K.with([0, 0, 0.004], [0, 0, 0], 1, () => K.slab(rect(W / 2 - 0.003, Hb / 2 - 0.004), D - 0.012, { mat: MAT.paper, col: 0xece4d0, b: 0.001 }));
    for (let k = 0; k < 11; k++) {
      const y = Hb / 2 - 0.012 - k * 0.0175;
      K.tube(oval(W * 0.62, 0.0055, 14).map(([x, z]) => [x, y + z * 0.15, -D / 2 + z * 0.4]), 0.0009, { closed: true, sides: 5, mat: MAT.metal, col: 0x2a2a2e });
    }
    return K.build();
  },
  /** The G-pen (hand-local, metres): a slim dark holder, a ferrule and a gold nib. */
  gpen() {
    const K = M();
    K.lathe([[0, -0.03], [0.0035, -0.029], [0.0046, -0.01], [0.0042, 0.06], [0.0036, 0.098], [0, 0.1]], { seg: 12, mat: MAT.gloss, col: 0x3a2a24 });
    K.lathe([[0.0037, -0.042], [0.0044, -0.03], [0.0036, -0.028]], { seg: 12, mat: MAT.metal, col: 0xb8b8c0 });
    K.with([0, -0.043, 0], [0, 0, 0], 1, () => K.plate(smooth([[-0.0032, 0], [0.0032, 0], [0.002, -0.012], [0, -0.018], [-0.002, -0.012]], 2, true), (x) => -x * x * 30, 0.0007, { mat: MAT.metal, col: 0xd9b25c, rings: 4 }));
    return K.build();
  },
  /** The sorcerer's hoodie hood (head units): a deep hood with an oval opening and two drawstrings. */
  hood() {
    const K = new Kit();
    hood(K, { col: 0x2c2438, rim: 0x3e3450, grow: 1.1, th: 1.4, hole: [6.6, 8.4, 5.4], neck: -1.8, mat: MAT.cloth, pole: [0, 0.6, -1] });
    for (const sx of [-3, 3]) {
      K.tube(smooth([[sx, -1.2, 10.4], [sx * 1.05, -4.0, 10.8], [sx, -6.2, 10.6]], 3), 0.18, { sides: 6, mat: MAT.cloth, col: 0xd8d0c0 });
      K.with([sx, -6.6, 10.6], [0, 0, 0], 1, () => K.lathe([[0, -0.6], [0.3, -0.5], [0.3, 0.3], [0, 0.4]], { seg: 8, mat: MAT.plastic, col: 0xc8c0b0 }));
    }
    return K.build();
  },
  /** The sorcerer's eyepatch over the right eye (head units) and its band round the head. */
  eyepatch() {
    const K = new Kit();
    const c = [-3.0, 6.0];
    const pf = (x, y) => frontZ(x, y, 0.3) + 0.15 + 0.3 * Math.max(0, 1 - ((x - c[0]) / 1.8) ** 2 - ((y - c[1]) / 1.8) ** 2);
    K.plate(oval(1.85, 1.8, 32, 2.2, c[0], c[1]), pf, 0.35, { mat: MAT.leather, col: 0x18141a, rings: 6 });
    const pts = [[-4.8, 7.4, 9.6], [-7.4, 8.6, 4], [-6.6, 10.6, -3.4], [-1, 12.6, -6.6], [4.8, 14.6, -4], [7.2, 15.8, 2.6], [4.4, 15.4, 8.8], [0.2, 11.4, 11.2], [-1.4, 7.6, 11.4]].map(([x, y, z]) => headPt([x, y - HEAD.C[1], z - HEAD.C[2]], 0.4));
    K.tube(smooth(pts, 4), 0.22, { sides: 6, ry: 0.4, mat: MAT.leather, col: 0x2a2428, caps: 'round' });
    return K.build();
  },
  /** The sorcerer's "wand" (metres): a lacquered chopstick with a folded paper star on top. */
  wand() {
    const K = M();
    K.lathe([[0, -0.1], [0.0018, -0.099], [0.0034, 0.08], [0.0036, 0.11], [0, 0.112]], { seg: 10, mat: MAT.gloss, col: 0x8a1e1e });
    const star = [];
    for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU, r = i % 2 ? 0.0072 : 0.017; star.push([Math.sin(a) * r, Math.cos(a) * r]); }
    K.with([0, 0.128, 0], [0, 0, 0], 1, () => K.plate(star, (x, y) => 0.004 * (1 - Math.hypot(x, y) / 0.017), 0.0018, { mat: MAT.paper, col: (p, side) => (side === 'front' ? 0xf6d43c : 0xd8a020), rings: 4, c: [0, 0] }));
    return K.build();
  },
  /** Binoculars (metres, eyepieces toward -z): two rubber-armoured barrels, a hinge and focus wheel, blue lenses. */
  binoculars() {
    const K = M();
    for (const sx of [-1, 1]) K.with([sx * 0.04, 0, 0], [Math.PI / 2, 0, 0], 1, () => {
      K.lathe([[0, -0.072], [0.013, -0.071], [0.015, -0.05], [0.0175, -0.02], [0.0175, 0.05], [0.0205, 0.058], [0.0205, 0.072], [0.016, 0.073]], { seg: 16, mat: MAT.rubber, col: 0x22242a });
      K.lathe([[0.016, 0.073], [0, 0.071]], { seg: 16, mat: MAT.eye, col: 0x3a5a8a });
      K.lathe([[0.0125, -0.074], [0, -0.073]], { seg: 12, mat: MAT.eye, col: 0x2a3a5a, flip: true });
    });
    K.sculpt((p) => sd.box(p, [0, 0, -0.01], [0.03, 0.007, 0.03], 0.005), [-0.04, -0.012, -0.045, 0.04, 0.012, 0.025], 0.003, { mat: MAT.plastic, col: 0x3a3e46 });
    K.with([0, 0.008, -0.03], [0, 0, Math.PI / 2], 1, () => K.lathe([[0.006, -0.006], [0.0065, 0], [0.006, 0.006]], { seg: 14, mat: MAT.rubber, col: 0x2a2c32 }));
    return K.build();
  },
  /** A big manga steak on the bone (metres). */
  meat() {
    const K = M();
    K.sculpt((p) => {
      let d = sd.ell(p, [0, 0, 0], [0.058, 0.047, 0.047]);
      d = sd.u(d, sd.ell(p, [0.02, 0.012, 0.01], [0.04, 0.038, 0.04]), 0.02);
      return d;
    }, [-0.07, -0.06, -0.06, 0.07, 0.06, 0.06], 0.0052, { mat: MAT.soft, col: (p, n) => (n[1] > 0.5 ? 0xa0522d : n[1] < -0.4 ? 0x7a3a1c : 0x8a4424) });
    for (const sx of [-1, 1]) {
      K.tube([[sx * 0.05, 0, 0], [sx * 0.098, 0.004, 0]], 0.0105, { sides: 10, mat: MAT.soft, col: 0xf4eee0 });
      K.sculpt((p) => sd.u(sd.sphere(p, [sx * 0.106, 0.014, 0], 0.013), sd.sphere(p, [sx * 0.106, -0.008, 0], 0.013), 0.006), [sx * 0.106 - 0.02, -0.025, -0.016, sx * 0.106 + 0.02, 0.03, 0.016], 0.0026, { mat: MAT.soft, col: 0xf4eee0 });
    }
    return K.build();
  },
};

export const STAFF = {
  /** The kappa's dish (head units): a pale glazed saucer on the crown (the water is its own mesh). */
  dishRim() {
    const K = new Kit();
    K.lathe([[4.7, 0], [6.0, 0.15], [6.3, 0.75], [6.0, 1.3], [5.5, 1.25], [5.0, 0.6], [3.2, 0.35], [0, 0.3]], { seg: 40, sub: 2, mat: MAT.gloss, col: (p) => (Math.hypot(p[0], p[2]) > 5.6 ? 0xd8d2c0 : 0xeae6da) });
    K.lathe([[4.7, 0], [0, -0.2]], { seg: 40, mat: MAT.gloss, col: 0xcfc8b4, flip: true });
    return K.build();
  },
  dishWater() { const K = new Kit(); K.lathe([[0, -0.5], [4.85, -0.5], [4.9, 0.5], [0, 0.55]], { seg: 32, mat: MAT.matte, col: 0xffffff }); return K.build(); },
  /** The kappa's beak (head units, sits on the face). */
  beak() {
    const K = new Kit();
    K.sculpt((p) => {
      const up = sd.ell(p, [0, 0.3, 1.4], [2.9, 1.25, 2.6]);
      const lo = sd.ell(p, [0, -1.1, 1.0], [2.4, 0.9, 2.1]);
      return Math.max(sd.u(sd.cut(up, sd.ell(p, [0, -0.4, 3.2], [3.2, 0.25, 1.6]), 0.15), lo, 0.2), -p[2] - 0.2);
    }, [-3.5, -2.6, -0.6, 3.5, 2, 4.6], 0.22, { mat: MAT.gloss, col: (p) => (p[1] < -0.4 ? 0xb8862a : 0xe8b830) });
    for (const sx of [-1, 1]) K.blob([sx * 0.7, 0.9, 3.7], [0.22, 0.14, 0.12], { mat: MAT.matte, col: 0x6a4a1a, seg: 6 });
    return K.build();
  },
  /** The kappa's shell (metres / unit = H / 120, pivot in the middle of its inner face): plates, a pale rim. */
  shell() {
    const K = new Kit();
    const plates = K.paint('kappaShell', 128, 128, (g, w, h) => {
      g.fillStyle = '#50602c'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#6a7a3a'; g.strokeStyle = '#3e4a22'; g.lineWidth = 3;
      const hex = (cx, cy, r) => { g.beginPath(); for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + Math.PI / 6; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke(); };
      for (const [x, y] of [[64, 64], [64, 26], [64, 102], [31, 45], [97, 45], [31, 83], [97, 83]]) hex(x, y, 18);
    }, { rough: 0.5 });
    K.sculpt((p) => Math.max(sd.ell(p, [0, 0, 0.3], [10.4, 12.4, 5.6]), p[2] - 0.2), [-11, -13, -6, 11, 13, 0.6], 0.55, { mat: plates, col: 0xffffff, uvMap: (p) => [(p[0] + 10.4) / 20.8, (p[1] + 12.4) / 24.8] });
    K.tube(oval(10.4, 12.4, 64).map(([x, y]) => [x, y, -0.25]), 0.9, { closed: true, sides: 8, ry: 0.7, up: [0, 0, 1], mat: MAT.plastic, col: 0xb8a868 });
    return K.build();
  },
  /** Tanuki ear (head units). */
  tanukiEar() { const K = new Kit(); ear(K, [0, 0, 0], { w: 2.4, h: 2.6, th: 0.9, col: 0x6a4a32, inner: 0x2a2018, tilt: 0, lean: 0 }); return K.build(); },
  /** The leaf a tanuki puts on his head to change shape (head units, lying in x / z). */
  leaf() {
    const K = new Kit();
    const out = smooth([[0, -3.8], [1.6, -1.6], [2.2, 0.6], [1.2, 2.8], [0, 4.2], [-1.2, 2.8], [-2.2, 0.6], [-1.6, -1.6]], 4, true);
    K.with([0, 0, 0], [-Math.PI / 2, 0, 0], 1, () => K.plate(out, (x, y) => 0.12 * x * x - 0.04 * y, 0.22, { mat: MAT.plastic, col: (p, side) => (Math.abs(p[0]) < 0.14 ? 0x3a6a24 : side === 'front' ? 0x5a9a3a : 0x4a8a30), rings: 6 }));
    K.with([0, 0, 0], [-Math.PI / 2, 0, 0], 1, () => K.tube([[0, -3.6, 0.15], [0, -5.4, 0.05]], 0.14, { sides: 5, caps: 'round', mat: MAT.wood, col: 0x3a6a24 }));
    return K.build();
  },
  /** Bushy striped tail (metres / unit = H / 140), pointing down and back from the pivot. */
  tanukiTail() {
    const K = new Kit();
    const path = [];
    for (let k = 0; k <= 24; k++) path.push([0, Math.sin((k / 24) * 1.2) * 1.5, -18 * k / 24]);
    K.tube(path, (t) => 2.2 + Math.sin(Math.min(1, t * 1.25) * Math.PI) * 2.9, { sides: 16, caps: 'round', mat: MAT.fur, col: (p) => { const d = -p[2]; return d > 15 ? 0x3a2a1e : d < 3 && p[1] > 1.5 ? 0xc8a878 : Math.floor(d / 4) % 2 ? 0x3a2a1e : 0x8a6a4a; } });
    return K.build();
  },
  /** The yurei's white triangle (head units, built standing at the origin, facing +z). */
  hitai() {
    const K = new Kit();
    K.plate(smooth([[-4.0, 0], [4.0, 0], [0.12, 4.8], [-0.12, 4.8]], 3, true), (x) => -0.05 * x * x, 0.18, { mat: MAT.cloth, col: (p, side) => (side === 'front' ? 0xf4f2ec : 0xd8d4c8), rings: 5 });
    for (const sx of [-1, 1]) K.tube(smooth([[sx * 3.9, 0.4, -0.7], [sx * 6.2, 0.6, -2.4], [sx * 7.6, 0.8, -5.6]], 3), 0.16, { sides: 5, mat: MAT.cloth, col: 0xd8d4c8 });
    return K.build();
  },
  /** Cloth mask over nose and mouth (head units, the head frame). */
  mask() {
    const K = new Kit();
    const out = smooth([[-7.4, 3.2], [0, 3.6], [7.4, 3.2], [7.0, -3.8], [3.6, -5.6], [0, -6.0], [-3.6, -5.6], [-7.0, -3.8]], 4, true);
    K.plate(out, (x, y) => frontZ(x, y, 0.25) + 0.3 + (Math.abs(x) < 1 ? 0.25 * (1 - Math.abs(x)) * Math.max(0, (y + 1) / 4) : 0), 0.45, { mat: MAT.cloth, col: (p, side) => (side === 'front' && p[1] > 2.6 ? 0x1a1c2a : 0x24263a), rings: 10, c: [0, -1] });
    for (const sx of [-1, 1]) K.tube(smooth([[sx * 7.2, 2.6, 4.2], [sx * 7.8, 3.6, -1.2], [sx * 6.0, 4.6, -6.4]], 3), 0.5, { sides: 6, ry: 0.35, up: [0, 1, 0], mat: MAT.cloth, col: 0x1a1c2a });
    return K.build();
  },
  /** A springy antenna with a red ball (head units, from the pivot up). */
  antenna() {
    const K = new Kit();
    const coil = [];
    for (let k = 0; k <= 60; k++) { const t = k / 60, a = t * TAU * 5; coil.push([Math.cos(a) * 0.38, t * 6.8, Math.sin(a) * 0.38]); }
    K.tube(coil, 0.12, { sides: 5, mat: MAT.metal, col: 0x9aa0a8 });
    K.with([0, -0.2, 0], [0, 0, 0], 1, () => K.lathe([[0, 0], [0.75, 0.05], [0.7, 0.5], [0.4, 0.7], [0, 0.72]], { seg: 12, mat: MAT.plastic, col: 0x5a5e66 }));
    K.blob([0, 7.9, 0], 1.2, { mat: MAT.gloss, col: 0xe03030, seg: 16 });
    return K.build();
  },
};

export const OLDMAN = {
  /** The cloth mask: over the nose and mouth, curved round the face, pleats, ear loops, a hole for the cigar. */
  mask() {
    const K = new Kit();
    const out = smooth([[-8.6, 4.4], [0, 4.9], [8.6, 4.4], [8.4, -3.8], [4.6, -6.2], [0, -6.8], [-4.6, -6.2], [-8.4, -3.8]], 4, true);
    const f = (x, y) => 12.6 - (x / 9.6) ** 2 * 6.0 + (y < -2 ? (y + 2) * 0.5 : 0) - (y > 2 ? (y - 2) * 0.3 : 0) + (Math.abs(y + 1) < 0.5 || Math.abs(y - 2) < 0.5 ? 0.18 : 0);
    K.plate(out, f, 0.5, { mat: MAT.cloth, rings: 12, c: [0, -0.6], col: (p, side) => (side === 'back' ? 0xdcdcd6 : Math.abs(p[1] + 1) < 0.5 || Math.abs(p[1] - 2) < 0.5 ? 0xdcdcd6 : 0xf4f4f0) });
    K.blob([0.5, -0.5, f(0.5, -0.5) + 0.3], [0.9, 0.8, 0.25], { mat: MAT.matte, col: 0x5a4a44, seg: 10 });
    for (const sx of [-1, 1]) for (const y0 of [4, -3.6]) K.tube(smooth([[sx * 8.5, y0, f(8.5, y0) - 0.2], [sx * 9.1, y0 * 0.6 + 0.4, 4.4], [sx * 8.6, 0.6, 2.0]], 3), 0.16, { sides: 5, mat: MAT.cloth, col: 0xe8e8e4 });
    return K.build();
  },
  /** White beard: thick sideburns down the jaw, a trimmed chin beard under the mask, bushy white brows. */
  beard() {
    const K = new Kit();
    K.sculpt((p) => {
      let d = sd.ell(p, [0, -7.4, 8.2], [6.6, 3.8, 4.8]);
      for (const sx of [-1, 1]) {
        d = sd.u(d, sd.cone(p, [sx * 7.0, 6.6, 4.4], [sx * 6.0, -4.6, 6.6], 1.4, 1.9), 1.6);
      }
      return d;
    }, [-9.5, -12, 1.5, 9.5, 8.6, 13.6], 0.5, { mat: MAT.fur, col: (p, n) => (n[1] < -0.5 ? 0xd8d4cc : 0xeeece6) });
    for (const sx of [-1, 1]) K.sculpt((p) => { const q = [p[0] * sx, p[1], p[2]]; return sd.u(sd.cone(q, [1.6, 8.3, 10.8], [5.6, 8.9, 9.8], 0.75, 0.6), sd.ell(q, [5.0, 8.5, 10.0], [1.0, 0.8, 0.7]), 0.4); }, [sx > 0 ? 0.5 : -7, 6.8, 8, sx > 0 ? 7 : -0.5, 10.2, 12.4], 0.2, { mat: MAT.fur, col: 0xf2f0ea });
    return K.build();
  },
  /** A fedora: a pinched crown, a dark band, a curled brim. */
  hat() {
    const F = 0xb8a47e, D = 0x9a8662;
    const K = new Kit();
    K.with([0, 0, 2.4], [0, 0, 0], 1, () => {
      K.lathe([[8.3, 12.2], [8.2, 15.0], [7.6, 19.6], [6.2, 21.6], [3.6, 22.1], [0, 21.4]], { seg: 48, sub: 3, sz: 1.14, mat: MAT.cloth, col: F, sx: (y, a) => 1 - (y > 19 ? 0.12 * (y - 19) / 3 * Math.cos(a) ** 2 * 0 : 0), shift: (y) => [0, 0] });
      K.lathe([[7.8, 12.4], [7.2, 19.6], [0, 20.8]], { seg: 48, sz: 1.14, mat: MAT.cloth, col: D, flip: true });
      K.lathe([[8.36, 12.5], [8.32, 14.6]], { seg: 48, sz: 1.14, mat: MAT.cloth, col: 0x3a2a1e });
    });
    // the pinch: two dents either side at the front of the crown
    for (const sx of [-1, 1]) K.blob([sx * 3.2, 19.4, 9.6], [1.6, 2.0, 0.5], { mat: MAT.cloth, col: D, seg: 10 });
    const n = 64, inner = oval(8.2, 9.35, n).map(([x, z]) => [x, 12.4, 2.4 + z]), outer = oval(12.6, 12.4, n).map(([x, z]) => [x, 11.6, 2.6 + z]);
    K.washer(inner, outer, 0.5, { mat: MAT.cloth, col: F, underCol: D, rows: 6, shape: (p, t) => [p[0], p[1] + (t > 0.6 ? Math.abs(p[0]) / 12.6 * (t - 0.6) * 4.2 : 0) - (Math.abs(p[0]) < 6 && p[2] > 10 ? (t * t) * 1.2 : 0), p[2]] });
    return K.build();
  },
  /** The cigar (head units, along +z from the pivot): brown wrap, a gold band, grey ash (the ember is its own mesh). */
  cigar() {
    const K = new Kit();
    K.with([0.5, 0.5, 0], [Math.PI / 2, 0, 0], 1, () => {
      K.lathe([[0, -0.2], [0.85, 0], [0.95, 2.6], [0.95, 9.6]], { seg: 14, mat: MAT.leather, col: 0x6a3a1e });
      K.lathe([[1.02, 2.4], [1.02, 3.6]], { seg: 14, mat: MAT.metal, col: 0xd8a830 });
      K.lathe([[0.95, 9.6], [0.92, 11.2], [0.7, 11.9], [0, 12.1]], { seg: 14, mat: MAT.soft, col: 0x9a9a94 });
    });
    return K.build();
  },
};

/** The ember: a small self-lit cap at the cigar's tip (MeshBasicMaterial: it is lit from inside). */
export function ember() {
  const K = new Kit();
  K.blob([0.5, 0.5, 12.2], [0.75, 0.75, 0.35], { seg: 10, col: 0xff5a2a });
  const m = new THREE.Mesh(K.build(), new THREE.MeshBasicMaterial({ vertexColors: true }));
  m.raycast = () => {};
  return m;
}
void v3; void shade; void mix; void bead; void INK; void headRing;
