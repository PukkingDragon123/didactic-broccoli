// The special NPCs' extras, modelled and hand-painted (src/people/wornKit.js; they replace the old voxel pieces):
//   head units (1 = 1/20 of the head's height; chin -4, nose 1.8, eyes 6, brows 8, crown 16, face plane z ~10.8; ride
//   in a group on the head bone scaled to the head, like src/staff/looks.js headUnits):
//     kappaDish() -> { group, water } (water: its own material, recoloured as it dries), kappaBeak(), tanukiEar(),
//     tanukiLeaf(), hitai() (the yurei's paper triangle and ties), antenna() (a spring and a ball), nib() (a G-pen nib
//     earring), hood(col) (open at the face, drawstrings), eyepatch()
//   metres (on body bones): kappaShell(H), tanukiTail(H), pin(kind) (heart, peace, dollar, yen), wand(), binoculars(),
//     meat(), gpen()
import * as THREE from 'three';
import { kitMat, lathe, loft, slab, piece, ellipse, hh, tone, mix } from './wornKit.js';

const INK = [30, 24, 26];
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const rim = (u, v, w) => Math.min(u, 1 - u, v, 1 - v) < w;

// ------------------------------------------------------------------ materials (painted once, shared)
const M = {
  ceramic: () => kitMat('ceramic', 64, 32, (u, v, i, j) => {
    const crack = hh(i >> 2, j >> 1, 3) > 0.93 || (hh(i, j >> 2, 4) > 0.97);
    const k = 0.94 + 0.08 * hh(i >> 1, j >> 1, 5) - (v > 0.8 ? 0.06 : 0);
    return crack ? [178, 170, 150] : tone([236, 230, 212], k);
  }, { rough: 0.35 }),
  ceramicIn: () => kitMat('ceramicIn', 32, 32, (u, v, i, j) => tone([204, 196, 176], 0.92 + 0.1 * hh(i >> 1, j >> 1, 6)), { rough: 0.5, side: THREE.DoubleSide }),
  beak: () => kitMat('beak', 48, 48, (u, v, i, j) => {
    const low = u > 0.25 && u < 0.75, line = Math.abs(u - 0.25) < 0.025 || Math.abs(u - 0.75) < 0.025;
    if (line) return [96, 62, 26];
    let c = low ? [190, 136, 44] : [232, 186, 52];
    c = tone(c, 0.92 + 0.1 * hh(i, j >> 1, 7) + (v > 0.85 ? -0.08 : 0));
    if (!low && v > 0.62 && v < 0.7 && (Math.abs(u - 0.06) < 0.025 || Math.abs(u - 0.94) < 0.025)) return [70, 44, 20]; // nostrils
    return c;
  }, { rough: 0.45 }),
  shell: () => kitMat('shell', 96, 48, (u, v0, i, j) => {
    const v = 1 - v0; // (0 at the apex, 1 at the rim)
    // scutes: a central row and a ring of plates round it, dark seams, growth rings, a pale marginal band at the rim
    if (v > 0.86) return tone(hh(i >> 2, 1, 8) > 0.5 ? [184, 168, 104] : [170, 152, 92], 0.95 + 0.08 * hh(i, j, 9));
    const ring = v < 0.34 ? 0 : 1, n = ring ? 10 : 5, a = u * n + (ring ? 0.5 : 0), f = a - Math.floor(a);
    const vr = ring ? (v - 0.34) / 0.52 : v / 0.34, seam = f < 0.06 || f > 0.94 || Math.abs(v - 0.34) < 0.02 || Math.abs(v - 0.86) < 0.02;
    if (seam) return [52, 58, 30];
    const grow = Math.abs(Math.sin(Math.min(f, 1 - f) * 18 + vr * 6)) < 0.15;
    const base = (Math.floor(a) + ring) % 2 ? [108, 122, 58] : [92, 106, 48];
    return tone(base, (grow ? 0.86 : 1) * (0.93 + 0.1 * hh(i >> 1, j >> 1, 10)) * (1 - 0.15 * vr * vr));
  }, { rough: 0.55 }),
  fur: (key, base, dark) => kitMat('fur:' + key, 32, 64, (u, v, i, j) => {
    const s = hh(i, 0, 11), streak = 0.86 + 0.24 * hh(i, j >> 2, 12) + 0.06 * Math.sin(j * 0.6 + s * 6);
    return tone(dark && dark(u, v) ? [52, 38, 28] : base, streak);
  }, { rough: 0.95 }),
  leaf: () => kitMat('leaf', 32, 48, (u, v, i, j) => {
    const mid = Math.abs(u - 0.5) < 0.04, vein = Math.abs(((v * 6 + Math.abs(u - 0.5) * 5) % 1) - 0.5) < 0.06 && !mid;
    return mid ? [196, 214, 120] : vein ? [70, 122, 46] : tone([86, 146, 56], 0.92 + 0.12 * hh(i >> 1, j >> 1, 13) - 0.12 * Math.abs(u - 0.5));
  }, { rough: 0.6, side: THREE.DoubleSide }),
  paper: () => kitMat('hitai', 48, 32, (u, v, i, j) => {
    if (rim(u, v, 0.05)) return [200, 196, 186];
    return tone([246, 244, 236], 0.95 + 0.06 * hh(i >> 1, j, 14));
  }, { rough: 0.9 }),
  steel: () => kitMat('steel', 16, 32, (u, v, i, j) => tone([176, 182, 190], 0.82 + 0.24 * hh(i, j >> 1, 15) + (i % 8 < 2 ? 0.12 : 0)), { rough: 0.3, metal: 0.85 }),
  red: () => kitMat('redGloss', 16, 16, (u, v, i, j) => tone([214, 48, 44], 0.9 + 0.1 * hh(i, j, 16) + (j < 4 && i < 6 ? 0.35 : 0)), { rough: 0.25 }),
  gold: () => kitMat('goldMetal', 32, 32, (u, v, i, j) => tone([226, 186, 90], 0.82 + 0.25 * hh(i >> 1, j, 17) + (j < 3 ? 0.15 : 0)), { rough: 0.3, metal: 0.9 }),
  nib: () => kitMat('nib', 32, 64, (u, v, i, j) => {
    // the split up the middle to a breather hole, the shoulders engraved
    if (Math.abs(u - 0.5) < 0.04 && v < 0.55) return [64, 48, 20];
    if (Math.hypot((u - 0.5) * 1.6, v - 0.55) < 0.05) return [40, 30, 14];
    if (Math.abs(v - 0.78) < 0.02) return [150, 116, 50];
    return tone([226, 186, 92], 0.85 + 0.25 * (1 - Math.abs(u - 0.5) * 1.6) + (hh(i, j, 18) - 0.5) * 0.08);
  }, { rough: 0.28, metal: 0.9 }),
  hood: (col) => kitMat('hood:' + col.join(','), 64, 64, (u, v, i, j) => {
    const k = 0.9 + 0.1 * hh(i >> 1, j, 19) + ((i + (j >> 1)) % 2 ? 0.03 : -0.03);
    const hem = u < 0.03 || u > 0.97; // the opening's hem
    return tone(hem ? mix(col, [255, 255, 255], 0.12) : col, k * (hem ? 1.05 : 1));
  }, { rough: 0.95, side: THREE.DoubleSide }),
  cord: () => kitMat('cord', 8, 16, (u, v, i, j) => tone([216, 208, 192], 0.9 + 0.1 * ((i + j) % 2)), { rough: 0.9 }),
  black: () => kitMat('patch', 32, 32, (u, v, i, j) => (rim(u, v, 0.08) ? [44, 40, 46] : tone([24, 20, 26], 0.9 + 0.2 * hh(i, j, 20))), { rough: 0.7 }),
  strap: () => kitMat('strap', 16, 8, (u, v, i, j) => tone([42, 36, 40], 0.9 + 0.1 * ((i >> 1) % 2)), { rough: 0.7 }),
  lacquer: () => kitMat('lacquer', 8, 64, (u, v, i, j) => {
    if (v > 0.84 && v < 0.9) return [226, 186, 80];
    return tone([148, 30, 30], 0.86 + 0.12 * hh(i, j >> 2, 21) + (i < 2 ? 0.25 : 0));
  }, { rough: 0.2 }),
  star: () => kitMat('paperStar', 32, 32, (u, v, i, j) => tone([248, 214, 64], 0.92 + 0.1 * hh(i, j, 22) - (rim(u, v, 0.1) ? 0.15 : 0)), { rough: 0.85 }),
  rubber: () => kitMat('binoRubber', 32, 32, (u, v, i, j) => {
    if (v > 0.9) return [60, 64, 72];
    const knurl = ((i + (j >> 1)) % 4 < 2) && v > 0.25 && v < 0.75;
    return tone([36, 38, 44], knurl ? 0.8 : 1 + 0.1 * hh(i, j, 23));
  }, { rough: 0.75 }),
  lens: () => kitMat('lens', 16, 16, (u, v, i, j) => (v > 0.5 ? tone([70, 110, 160], 0.9 + 0.3 * (i < 5 && j > 10 ? 1 : 0)) : [40, 44, 52]), { rough: 0.1, metal: 0.3 }),
  meat: () => kitMat('meat', 64, 32, (u, v, i, j) => {
    // seared crust, darker grill streaks, the fatty cut ends
    if (v < 0.07 || v > 0.93) return tone([232, 172, 118], 0.95 + 0.1 * hh(i, j, 24));
    const grill = Math.abs(((u * 6 + v * 1.5) % 1) - 0.5) < 0.07;
    return tone(grill ? [96, 44, 22] : [164, 82, 44], 0.9 + 0.16 * hh(i >> 1, j >> 1, 25));
  }, { rough: 0.6 }),
  bone: () => kitMat('bone', 16, 16, (u, v, i, j) => tone([244, 236, 216], 0.92 + 0.08 * hh(i, j, 26)), { rough: 0.6 }),
  wood: () => kitMat('penWood', 8, 64, (u, v, i, j) => {
    if (v > 0.86) return tone([168, 168, 176], 0.9 + (i < 2 ? 0.2 : 0)); // the ferrule
    return tone([82, 52, 36], 0.86 + 0.22 * hh(i, j >> 2, 27));
  }, { rough: 0.55 }),
};
const pinMat = (kind) => kitMat('pin:' + kind, 32, 32, (u, v, i, j) => {
  const x = u * 2 - 1, y = v * 2 - 1, r = Math.hypot(x, y), gold = kind !== 'yen';
  const face = gold ? [228, 188, 84] : [212, 216, 226], deep = gold ? [150, 112, 40] : [118, 122, 134];
  const shine = clamp01(1 - Math.hypot(x + 0.4, y - 0.45) * 2.2) * 0.35;
  let ink = false;
  if (kind === 'peace') ink = (r > 0.62 && r < 0.8) || (Math.abs(x) < 0.08 && r < 0.66) || (y < 0 && Math.abs(Math.abs(x) + y * 0.95) < 0.09 && r < 0.66);
  if (kind === 'dollar' || kind === 'yen') {
    const g = kind === 'yen' ? ['#...#', '.#.#.', '..#..', '#####', '..#..', '#####', '..#..'] : ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'];
    const gx = Math.floor((x * 0.62 + 0.5) * 5), gy = Math.floor((-y * 0.62 + 0.5) * 7);
    ink = gx >= 0 && gx < 5 && gy >= 0 && gy < 7 && g[gy][gx] === '#';
  }
  const c = ink ? deep : r > 0.9 ? deep : face;
  return tone(c, 0.92 + 0.08 * hh(i, j, 28) + shine);
}, { rough: 0.3, metal: 0.85 });

// ------------------------------------------------------------------ head units
export function kappaDish() {
  const rimM = lathe([[4.3, 0], [6.1, 0], [6.5, 0.45], [6.4, 1.2], [5.9, 1.55], [4.9, 1.3], [4.4, 0.7], [4.3, 0]], M.ceramic(), { N: 28, key: 'kappaRim' });
  const floor = lathe([[0, 0.2], [4.5, 0.2]], M.ceramicIn(), { N: 24, key: 'kappaFloor' });
  const waterMat = new THREE.MeshStandardMaterial({ map: kitMat('water', 32, 32, (u, v, i, j) => tone([226, 236, 244], 0.9 + 0.12 * Math.sin(Math.hypot(i - 16, j - 16) * 1.3) + 0.04 * hh(i, j, 29))).map, roughness: 0.12, metalness: 0.1 });
  const water = lathe([[0, 0], [4.5, 0], [4.5, 0.6], [0, 0.6]], waterMat, { N: 24, key: 'kappaWater' });
  water.raycast = () => {};
  return { group: piece(rimM, floor), water };
}
export function kappaBeak() {
  const path = [];
  for (let i = 0; i <= 6; i++) { const t = i / 6; path.push({ c: [0, -0.4 - 0.8 * t * t, t * 5.2], rx: 3.2 * (1 - t * 0.62) * (i === 6 ? 0.55 : 1), rz: 1.9 * (1 - t * 0.6) * (i === 6 ? 0.6 : 1) }); }
  return piece(loft(path, M.beak(), { N: 16, key: 'kappaBeak' }));
}
export function kappaShell(H) {
  // a dome (half-axes: 0.088 H across, 0.104 H tall, 0.046 H deep) bulging backwards (-z) from its rim, which sits on
  // the back (the pivot); a rolled lip round the rim
  const prof = [[0.94, -0.07], [1.06, -0.03], [1.04, 0]];
  for (let i = 1; i <= 10; i++) { const a = (i / 10) * Math.PI / 2; prof.push([Math.cos(a) * 1.02, Math.sin(a)]); }
  const m = lathe(prof, M.shell(), { N: 30, key: 'kappaShell' });
  m.rotation.x = -Math.PI / 2; // the lathe's +y (its apex) points back (-z); its z runs up the back
  m.scale.set(0.088 * H, 0.046 * H, 0.104 * H);
  return piece(m);
}
export function tanukiEar() {
  const sh = [[-2.4, 0], [-2.1, 1.6], [-1.1, 3.1], [0, 3.6], [1.1, 3.1], [2.1, 1.6], [2.4, 0], [0, -0.4]];
  const mat = kitMat('tanukiEar', 32, 32, (u, v, i, j) => (v > 0.72 ? tone([46, 34, 26], 0.9 + 0.1 * hh(i, j, 30)) : Math.hypot((u - 0.5) * 1.6, v - 0.38) < 0.22 ? [214, 190, 160] : tone([118, 84, 56], 0.86 + 0.2 * hh(i, j >> 1, 31))), { rough: 0.95 });
  return piece(slab(sh, 0.9, mat, { bevel: 0.35, key: 'tanukiEar' }));
}
export function tanukiLeaf() {
  const sh = [];
  for (let i = 0; i <= 16; i++) { const t = i / 16, w = Math.sin(t * Math.PI) ** 0.8 * 2.4; sh.push([w, -4 + t * 8]); }
  for (let i = 15; i >= 1; i--) { const t = i / 16, w = Math.sin(t * Math.PI) ** 0.8 * 2.4; sh.push([-w, -4 + t * 8]); }
  const m = slab(sh, 0.32, M.leaf(), { bevel: 0.3, key: 'tanukiLeaf' });
  m.rotation.x = -Math.PI / 2; // lying flat on the head
  const stem = loft([{ c: [0, 0, 4], rx: 0.2, rz: 0.2 }, { c: [0, 0.3, 5.4], rx: 0.15, rz: 0.15 }], M.leaf(), { N: 6, key: 'leafStem' });
  return piece(m, stem);
}
export function tanukiTail(H) {
  // a bushy striped tail hanging back and down from its root (-z), fullest two thirds along
  const L = 0.13 * H, path = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10, r = (0.016 + Math.sin(Math.min(1, t / 0.78) * Math.PI) * 0.02 + (t > 0.9 ? -0.012 * (t - 0.9) * 10 : 0)) * H / 1.6; path.push({ c: [0, -0.01 * t * t * H, -t * L], rx: r, rz: r * 0.92 }); }
  path[10].rx = path[10].rz = 0.004;
  const mat = M.fur('tail', [138, 104, 72], (u, v) => v > 0.86 || Math.floor(v * 5.5) % 2 === 1);
  return piece(loft(path, mat, { N: 12, up: [0, 1, 0], key: 'tanukiTail:' + H.toFixed(2) }));
}
export function hitai() {
  const tri = slab([[-4.2, 0], [4.2, 0], [0, 4.6]], 0.3, M.paper(), { bevel: 0.25, curve: 2, key: 'hitai' });
  const ties = [];
  for (const sx of [-1, 1]) ties.push(loft([{ c: [sx * 4, 0.6, 0], rx: 0.18, rz: 0.4 }, { c: [sx * 6.4, 0.9, -2.2], rx: 0.18, rz: 0.4 }, { c: [sx * 7.6, 1.1, -5.4], rx: 0.18, rz: 0.4 }], M.paper(), { N: 6, key: 'hitaiTie' + sx }));
  return piece(tri, ...ties);
}
export function antenna() {
  const path = [];
  for (let i = 0; i <= 28; i++) { const t = i / 28, a = t * Math.PI * 2 * 5; path.push({ c: [Math.cos(a) * 0.5, t * 7, Math.sin(a) * 0.5], rx: 0.2, rz: 0.2 }); }
  const spring = loft(path, M.steel(), { N: 6, key: 'antennaSpring' });
  const prof = [];
  for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + (i / 8) * Math.PI; prof.push([Math.cos(a) * 1.4, 8.3 + Math.sin(a) * 1.4]); }
  const ball = lathe(prof, M.red(), { N: 14, key: 'antennaBall' });
  return piece(spring, ball);
}
export function nib() {
  const sh = [[-1.1, 3], [1.1, 3], [1.05, 0.6], [0.5, -1.6], [0, -3.6], [-0.5, -1.6], [-1.05, 0.6]];
  const n = slab(sh, 0.22, M.nib(), { bevel: 0.3, curve: 4, key: 'nib' });
  const hoopProf = [];
  for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI * 2; hoopProf.push([1.0 + Math.cos(a) * 0.18, Math.sin(a) * 0.18]); }
  const hoop = lathe(hoopProf, M.gold(), { N: 12, key: 'nibHoop' });
  hoop.rotation.x = Math.PI / 2; hoop.position.y = 4;
  return piece(n, hoop);
}
/** A hood up round the head, open at the face and under the chin, a hemmed opening and two drawstrings. */
export function hood(col = [44, 36, 56]) {
  const prof = [[9.4, -9], [10.6, -6], [10.8, -1], [10.6, 5], [10.2, 10], [8.8, 15], [6.2, 19.4], [3, 21.4], [0.2, 22]];
  const m = lathe(prof, M.hood(col), { N: 26, phi0: 0.82, phiLen: Math.PI * 2 - 1.64, key: 'hood' });
  m.scale.set(0.92, 1, 1.05); m.position.set(0, 0, 1.6);
  const cords = [];
  for (const sx of [-1, 1]) cords.push(loft([{ c: [sx * 5.8, 1, 9.2], rx: 0.22, rz: 0.22 }, { c: [sx * 5.4, -3, 9.6], rx: 0.22, rz: 0.22 }, { c: [sx * 5.2, -6.5, 9.4], rx: 0.3, rz: 0.3 }], M.cord(), { N: 6, key: 'hoodCord' + sx }));
  return piece(m, ...cords);
}
export function eyepatch() {
  const patch = slab(ellipse(1.9, 1.6, 18), 0.45, M.black(), { bevel: 0.4, key: 'eyepatch' });
  patch.position.set(-3, 6, 10.9);
  patch.rotation.y = -0.28;
  const band = lathe([[1, -0.22], [1, 0.22]], M.strap(), { N: 32, key: 'patchBand' });
  band.scale.set(8.5, 1, 9.6); band.position.set(0, 8, 2.2); band.rotation.set(0.32, 0, 0.12);
  return piece(patch, band);
}

// ------------------------------------------------------------------ metres
export function pin(kind) {
  let m;
  if (kind === 'heart') {
    const sh = [];
    for (let i = 0; i < 40; i++) { const t = (i / 40) * Math.PI * 2; sh.push([16 * Math.sin(t) ** 3 / 16 * 0.016, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16 * 0.016]); }
    m = slab(sh, 0.005, pinMat('heartGold'), { bevel: 0.4, key: 'pinHeart' });
  } else m = slab(ellipse(0.015, 0.015, 24), 0.004, pinMat(kind), { bevel: 0.4, key: 'pinDisc' });
  return piece(m);
}
export function wand() {
  const stick = lathe([[0.0001, -0.105], [0.0026, -0.1], [0.0034, 0.0], [0.0042, 0.1], [0.0044, 0.114], [0.0001, 0.116]], M.lacquer(), { N: 8, key: 'wandStick' });
  const sh = [];
  for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? 0.0065 : 0.016; sh.push([Math.cos(a) * r, Math.sin(a) * r]); }
  const star = slab(sh, 0.003, M.star(), { bevel: 0.2, curve: 2, key: 'wandStar' });
  star.position.y = 0.128;
  return piece(stick, star);
}
export function binoculars() {
  const parts = [];
  for (const sx of [-1, 1]) {
    const b = lathe([[0.0001, -0.07], [0.012, -0.07], [0.019, -0.066], [0.02, -0.03], [0.022, 0.04], [0.024, 0.066], [0.024, 0.07], [0.0185, 0.07]], M.rubber(), { N: 16, key: 'binoBarrel' });
    b.rotation.x = Math.PI / 2; b.position.x = sx * 0.04;
    const l = lathe([[0.019, 0.0695], [0.0001, 0.0695]], M.lens(), { N: 16, key: 'binoLens' });
    l.rotation.x = Math.PI / 2; l.position.x = sx * 0.04;
    parts.push(b, l);
  }
  const bridge = loft([{ c: [-0.03, 0, -0.03], rx: 0.009, rz: 0.012 }, { c: [0.03, 0, -0.03], rx: 0.009, rz: 0.012 }], M.rubber(), { N: 10, up: [0, 0, 1], key: 'binoBridge' });
  const hinge = lathe([[0.007, -0.045], [0.008, 0.02], [0.006, 0.026]], M.steel(), { N: 10, key: 'binoHinge' });
  hinge.rotation.x = Math.PI / 2;
  return piece(...parts, bridge, hinge);
}
export function meat() {
  const prof = [];
  for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI; prof.push([Math.cos(a) * 0.05 * (1 + 0.06 * Math.sin(i * 1.7)), Math.sin(a) * 0.062]); }
  const cut = lathe(prof, M.meat(), { N: 18, key: 'meatCut' });
  cut.rotation.z = Math.PI / 2; cut.scale.set(1, 1, 0.82);
  const bones = [];
  for (const sx of [-1, 1]) {
    bones.push(loft([{ c: [sx * 0.05, 0, 0], rx: 0.011, rz: 0.011 }, { c: [sx * 0.1, 0, 0], rx: 0.01, rz: 0.01 }], M.bone(), { N: 8, up: [0, 1, 0], key: 'meatBone' + sx }));
    for (const sy of [-1, 1]) {
      const p = [];
      for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + (i / 6) * Math.PI; p.push([Math.cos(a) * 0.017, Math.sin(a) * 0.017]); }
      const knob = lathe(p, M.bone(), { N: 10, key: 'meatKnob' });
      knob.position.set(sx * 0.11, sy * 0.012, 0);
      bones.push(knob);
    }
  }
  return piece(cut, ...bones);
}
/** The G-pen: a slim dark wooden holder (a turned shaft, the ferrule) and a gold nib. */
export function gpen() {
  const holder = lathe([[0.0001, -0.03], [0.0036, -0.026], [0.0046, 0.04], [0.0046, 0.088], [0.0042, 0.1], [0.0001, 0.1]], M.wood(), { N: 10, key: 'gpenHolder' });
  const n = slab([[-0.0028, 0], [0.0028, 0], [0.0026, -0.009], [0.0011, -0.018], [0, -0.024], [-0.0011, -0.018], [-0.0026, -0.009]], 0.0012, M.nib(), { bevel: 0.3, curve: 2, key: 'gpenNib' });
  n.position.y = -0.028;
  return piece(holder, n);
}
