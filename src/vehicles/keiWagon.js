// Mr. Tanaka's little red kei tall wagon (a mid-90s five-door, 3.39 x 1.47 x 1.62 m): a short bonnet, a steep
// windscreen, a tall glasshouse; cherry red with black trim, big rectangular headlights, a slim grille, body-coloured
// bumpers with black lower lips, door mirrors, a rear wiper, silver plastic wheel covers, yellow kei plates, a
// tissue box on the parcel shelf and a little lucky cat on the dash. Low-poly with one pixel atlas, real glass.
// Faces +z, y = 0 the road.   keiWagonMesh() -> Mesh (the body; glass and wheels are its children)
import * as THREE from 'three';
import { Atlas, ROUGH } from './atlas.js';
import { Geo, triplanar, boxMap } from './geom.js';
import { shell } from './shell.js';
import { ramp, mix, seamLoop, seal, glassPane, lamp, plate, dent } from './paint.js';
import { wheelPatches, wheelGeometry, doorMirror, wiper, vehicleMaterials } from './parts.js';

const W = 0.735, RND = 0.07, YB = 0.3, WR = 0.27, ARCH = 0.325, AXF = 1.12, AXR = -1.22;
const BELT = 0.98, WTOP = 1.5;
const WS0 = [1.08, 0.94], WS1 = [0.42, 1.55];
const zWS = (y) => WS0[0] + (y - WS0[1]) * (WS1[0] - WS0[0]) / (WS1[1] - WS0[1]);
function arch(zc, n = 9) { const out = []; for (let k = 0; k <= n; k++) { const a = Math.PI * (1 - k / n); out.push([zc + Math.cos(a) * ARCH, YB + Math.sin(a) * ARCH, 0]); } return out; }
const PROFILE = [
  [-1.68, YB, 0], ...arch(AXR), ...arch(AXF),
  [1.66, YB, 1], [1.69, 0.55, 1], [1.67, 0.72, 1], [1.6, 0.82, 1], [1.12, 0.92, 1], [WS0[0], WS0[1], 1], [WS1[0], WS1[1], 1], [0.32, 1.605, 1],
  [-1.5, 1.62, 1], [-1.6, 1.58, 1], [-1.66, 1.42, 1], [-1.69, 0.6, 1], [-1.7, 0.36, 1],
];
const E_WS = PROFILE.findIndex((p) => p[0] === WS0[0] && p[1] === WS0[1]);
const E_HATCH = PROFILE.findIndex((p) => p[0] === -1.66 && p[1] === 1.42);
const win = (pts) => pts;
const WIN_F = win([[0.06, BELT], [zWS(BELT) - 0.16, BELT], [zWS(WTOP) - 0.16, WTOP], [0.06, WTOP]]);
const WIN_R = win([[-0.8, BELT], [-0.04, BELT], [-0.04, WTOP], [-0.8, WTOP]]);
const WIN_Q = win([[-1.42, 1.02], [-0.92, 1.0], [-0.92, 1.48], [-1.32, 1.48]]);
const RED = ramp(0xc42a2e), TRIM = 0x202224, RUBBER = 0x1a1c1e, CHROME = [0x5a6064, 0xb8c0c4, 0xeef4f4];

function paintAtlas() {
  const A = new Atlas(1024, 512);
  const V = {
    L: A.view('ext:+x', { u: (p) => -p[2], v: (p) => p[1], u0: -1.78, u1: 1.78, v0: 0.18, v1: 1.68 }),
    R: A.view('ext:-x', { u: (p) => p[2], v: (p) => p[1], u0: -1.78, u1: 1.78, v0: 0.18, v1: 1.68 }),
    F: A.view('ext:+z', { u: (p) => p[0], v: (p) => p[1], u0: -0.76, u1: 0.76, v0: 0.18, v1: 1.68 }),
    B: A.view('ext:-z', { u: (p) => -p[0], v: (p) => p[1], u0: -0.76, u1: 0.76, v0: 0.18, v1: 1.68 }),
    T: A.view('ext:+y', { u: (p) => p[0], v: (p) => p[2], u0: -0.76, u1: 0.76, v0: -1.78, v1: 1.78, ppm: 60 }),
    I: A.view('in', { u: (p) => p[2], v: (p) => p[1], u0: -1.72, u1: 1.72, v0: 0.3, v1: 1.64, ppm: 40 }),
    IT: A.view('in:t', { u: (p) => p[0], v: (p) => p[2], u0: -0.74, u1: 0.74, v0: -1.72, v1: 1.72, ppm: 40 }),
  };
  V.wheel = wheelPatches(A, { name: 'kw', steel: 0xd0d4d8, cap: 0.16, holes: 10, nuts: 0 });
  V.plate = A.patch('plate', 66, 33); plate(V.plate, { top: 'MORIO 580', num: '21-08', kana: 'sa' });
  for (const [S, sx] of [[V.L, 1], [V.R, -1]]) paintSide(S, sx);
  paintFront(V.F); paintRear(V.B);
  V.T.A.ink(ROUGH.paint); V.T.fill(RED[2]); V.T.rect(-0.62, -1.4, 0.62, 0.25, RED[3]);
  V.I.A.ink(ROUGH.fabric); V.I.fill(0x3a3c42); V.I.rect(-1.72, 1.45, 1.72, 1.64, 0x8a8880); V.IT.fill(0x8a8880); V.IT.rect(-0.74, -1.72, 0.74, 1.0, 0x34363a);
  return { A, V };
}
function paintSide(S, sx) {
  const A = S.A, U = (z) => (sx > 0 ? -z : z), I = (z) => S.i(U(z)), J = (y) => S.j(y), P = (pts) => pts.map(([z, y]) => [U(z), y]);
  A.ink(ROUGH.paint);
  S.box(0, 0, S.W, S.H, (i, j) => { const y = S.o.v0 + (j + 0.5) / S.ppm; return y > 1.55 ? RED[3] : y < 0.42 ? TRIM : y < 0.47 ? RED[1] : RED[2]; });
  S.hline(0, S.W, J(0.9), RED[3]); S.hline(0, S.W, J(0.89), RED[1]);
  // arches
  for (const zc of [AXR, AXF]) for (let j = J(YB); j < J(YB + ARCH + 0.04); j++) for (let i = I(zc) - 45; i <= I(zc) + 45; i++) {
    const z = sx > 0 ? -(S.o.u0 + (i + 0.5) / S.ppm) : S.o.u0 + (i + 0.5) / S.ppm, y = S.o.v0 + (j + 0.5) / S.ppm, r = Math.hypot(z - zc, y - YB);
    if (r >= ARCH && r < ARCH + 0.014) S.px(i, j, TRIM); else if (r >= ARCH + 0.014 && r < ARCH + 0.026 && y > YB + 0.1) S.px(i, j, RED[3]);
  }
  // the doors, the fuel lid, the handles' pockets; the black B and C pillars between the windows
  seamLoop(S, P([[0.02, 0.36], [1.02, 0.36], [1.04, 0.86], [zWS(1.0) - 0.125, 1.0], [zWS(1.54) - 0.125, 1.54], [0.02, 1.54]]), RED[0], RED[3], sx > 0 ? -1 : 1, -1);
  seamLoop(S, P([[-0.86, 0.36], [0.0, 0.36], [0.0, 1.56], [-0.86, 1.56]]), RED[0], RED[3], sx > 0 ? -1 : 1, -1);
  if (sx < 0) seamLoop(S, P([[-1.3, 0.72], [-1.16, 0.72], [-1.16, 0.84], [-1.3, 0.84]]), RED[0], RED[3], 1, -1);
  A.ink(ROUGH.plastic);
  S.rect(U(-0.06), BELT, U(0.08), WTOP + 0.02, TRIM); S.rect(U(-0.94), BELT, U(-0.78), WTOP + 0.02, TRIM);
  S.rect(U(0.15), 0.86, U(0.25), 0.88, TRIM); S.rect(U(-0.75), 0.86, U(-0.65), 0.88, TRIM);
  for (const w of [WIN_F, WIN_R, WIN_Q]) { glassPane(S, P(w), { seed: sx > 0 ? 1 : 4, alpha: 128 }); seal(S, P(w), RUBBER, 2); }
  // bumper wraps
  S.rect(U(1.55), 0.4, U(1.75), 0.6, RED[2]); S.rect(U(1.55), 0.36, U(1.75), 0.42, TRIM);
  S.rect(U(-1.75), 0.38, U(-1.6), 0.6, RED[2]); S.rect(U(-1.75), 0.34, U(-1.6), 0.4, TRIM);
  A.ink(ROUGH.lens); S.rect(U(1.58), 0.68, U(1.68), 0.76, 0xf4f4f0); S.rect(U(-1.75), 0.86, U(-1.66), 1.1, 0xc82a28);
  A.ink(ROUGH.paint);
  if (sx > 0) dent(S, I(-0.5), J(0.62), 8, 5, RED);
}
function paintFront(F) {
  const A = F.A, I = (x) => F.i(x), J = (y) => F.j(y);
  A.ink(ROUGH.paint);
  F.box(0, 0, F.W, F.H, (i, j) => { const y = F.o.v0 + (j + 0.5) / F.ppm; return y < 0.42 ? TRIM : y > 0.84 ? RED[3] : RED[2]; });
  const ws = [[-(W - RND - 0.01), 0.96], [W - RND - 0.01, 0.96], [W - RND - 0.01, 1.53], [-(W - RND - 0.01), 1.53]];
  glassPane(F, ws, { seed: 3, alpha: 112, slope: 0.4 }); seal(F, ws, RUBBER, 2);
  for (const s of [-1, 1]) lamp(F, I(s > 0 ? 0.38 : -0.66), J(0.65), I(s > 0 ? 0.66 : -0.38), J(0.77), 'head');
  A.ink(ROUGH.plastic); F.rect(-0.34, 0.66, 0.34, 0.74, TRIM); for (let x = -0.32; x < 0.32; x += 0.04) F.rect(x, 0.675, x + 0.02, 0.725, 0x3a3c3e);
  F.rect(-0.5, 0.44, 0.5, 0.52, TRIM);
  for (const s of [-1, 1]) lamp(F, I(s > 0 ? 0.52 : -0.66), J(0.46), I(s > 0 ? 0.66 : -0.52), J(0.51), 'amber', { bezel: false });
}
function paintRear(B) {
  const A = B.A, I = (x) => B.i(-x), J = (y) => B.j(y);
  A.ink(ROUGH.paint);
  B.box(0, 0, B.W, B.H, (i, j) => { const y = B.o.v0 + (j + 0.5) / B.ppm; return y < 0.4 ? TRIM : RED[2]; });
  const hw = [[-0.56, 1.0], [0.56, 1.0], [0.56, 1.4], [-0.56, 1.4]];
  glassPane(B, hw, { seed: 6, alpha: 130 }); seal(B, hw, RUBBER, 2);
  seamLoop(B, [[-0.62, 0.42], [0.62, 0.42], [0.62, 1.56], [-0.62, 1.56]], RED[0], RED[3], 0, -1);
  for (const s of [-1, 1]) { const x0 = s > 0 ? 0.62 : -0.74, x1 = s > 0 ? 0.74 : -0.62, i0 = Math.min(I(x0), I(x1)), i1 = Math.max(I(x0), I(x1)); lamp(B, i0, J(0.98), i1, J(1.12), 'red', { bezel: false }); lamp(B, i0, J(0.86), i1, J(0.98), 'amber', { bezel: false }); lamp(B, i0, J(0.8), i1, J(0.86), 'white', { bezel: false }); }
  A.ink(ROUGH.chrome); B.rect(-0.1, 0.8, 0.1, 0.83, CHROME[1]);
}

let PARTS = null;
function parts() {
  if (PARTS) return PARTS;
  const { A, V } = paintAtlas();
  const ext = triplanar({ px: V.L, nx: V.R, py: V.T, pz: V.F, nz: V.B }, A.swatch(0x18191a, ROUGH.matte));
  const inn = triplanar({ px: V.I, nx: V.I, py: V.IT, ny: V.IT, pz: A.swatch(0x34363a), nz: A.swatch(0x2a2c30) });
  const sw = (c, r = ROUGH.plastic) => A.swatch(c, r);
  const rubber = sw(RUBBER, ROUGH.rubber), dark = sw(0x18191a, ROUGH.matte);
  const G = new Geo(1), GL = new Geo(1);
  shell(G, {
    pts: PROFILE, W, R: RND, K: 2, uv: ext,
    sideHoles: { pos: [WIN_F, WIN_R, WIN_Q].map((pts) => ({ pts, glass: true, wall: rubber })), neg: [WIN_F, WIN_R, WIN_Q].map((pts) => ({ pts, glass: true, wall: rubber })) },
    bandHoles: [{ e: E_WS, u0: 0.03, u1: 0.97, hx: W - RND - 0.01 }, { e: E_HATCH, u0: (1.42 - 1.4) / (1.42 - 0.6), u1: (1.42 - 1.0) / (1.42 - 0.6), hx: 0.56 }],
    bandUv: (e) => (PROFILE[e][2] === 0 ? dark : null),
    wallUv: rubber, glassUv: ext, glassGeo: GL, inner: { t: 0.03, uv: inn },
  });
  G.with(ext, 0, () => {
    for (const s of [-1, 1]) G.box(s > 0 ? 0.37 : -0.67, 0.64, 1.63, s > 0 ? 0.67 : -0.37, 0.78, 1.7, { bevel: 0.01 });
    G.box(-0.72, 0.34, 1.6, 0.72, 0.6, 1.72, { bevel: 0.04 });
    G.box(-0.72, 0.34, -1.74, 0.72, 0.6, -1.62, { bevel: 0.04 });
    for (const s of [-1, 1]) G.box(s > 0 ? 0.61 : -0.75, 0.79, -1.71, s > 0 ? 0.75 : -0.61, 1.13, -1.62, { bevel: 0.01 });
  });
  for (const [z, y, n] of [[1.725, 0.4, 1], [-1.69, 0.62, -1]]) G.with(boxMap(V.plate, [-0.165, y, z - 0.004, 0.165, y + 0.165, z + 0.004]), 0, () => G.box(-0.165, y, z - 0.004, 0.165, y + 0.165, z + 0.004, { skip: n > 0 ? ['nz'] : ['pz'] }));
  for (const s of [-1, 1]) doorMirror(G, [s * (W + 0.004), 1.02, 0.95], [s * (W + 0.1), 1.08, 0.92], { w: 0.09, h: 0.11, uvBody: sw(TRIM), uvGlass: sw(0x9ab0bc, ROUGH.glass) });
  G.with(sw(TRIM), 0, () => { for (const s of [-1, 1]) for (const z of [0.2, -0.7]) G.box(s * W - 0.006, 0.855, z - 0.05, s * W + 0.006, 0.885, z + 0.05, { bevel: 0.003 }); });
  const d = [0, WS1[1] - WS0[1], WS1[0] - WS0[0]], l = Math.hypot(d[1], d[2]), u = [0, d[1] / l, d[2] / l], out = [0, -u[2], u[1]];
  for (const px of [-0.5, 0.02]) { const y = WS0[1] + 0.03, dd = [0.97, 0.24 * u[1], 0.24 * u[2]], ll = Math.hypot(...dd); wiper(G, [px, y, zWS(y) + 0.012], dd.map((v) => v / ll), 0.44, 0.4, out, sw(0x161618)); }
  wiper(G, [0, 1.42, -1.675], [0.0, -0.4, -0.03].map((v) => v / 0.401), 0.3, 0.3, [0, 0.05, -1], sw(0x161618));
  // inside: seats, the dash, the wheel, a lucky cat, a tissue box on the parcel shelf
  G.with(sw(0x4a4e58, ROUGH.fabric), 0, () => {
    for (const s of [-1, 1]) { G.box(s > 0 ? 0.08 : -0.62, 0.5, 0.15, s > 0 ? 0.62 : -0.08, 0.62, 0.62, { bevel: 0.03 }); G.box(s > 0 ? 0.1 : -0.6, 0.6, 0.08, s > 0 ? 0.6 : -0.1, 1.25, 0.2, { bevel: 0.04 }); }
    G.box(-0.66, 0.5, -0.95, 0.66, 0.6, -0.45, { bevel: 0.03 }); G.box(-0.66, 0.6, -1.0, 0.66, 1.15, -0.88, { bevel: 0.04 });
  });
  G.with(sw(0x2a2c30), 0, () => {
    G.box(-0.7, 0.7, 0.85, 0.7, 0.93, 1.12, { bevel: 0.02 });
    G.push(new THREE.Matrix4().compose(new THREE.Vector3(-0.36, 1.0, 0.72), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.4, 0, 0)), new THREE.Vector3(1, 1, 1)));
    G.torus(0.17, 0.012, 20, 4); G.strut([-0.16, 0, 0], [0.16, 0, 0], 0.012);
    G.pop();
  });
  G.with(sw(0xf4f0e6, ROUGH.paint), 0, () => G.box(0.3, 0.93, 0.98, 0.36, 1.01, 1.04, { bevel: 0.015 }));
  G.with(sw(0xc8282a, ROUGH.paint), 0, () => G.box(0.31, 0.985, 0.975, 0.35, 0.99, 0.98));
  G.with(sw(0xf0b8c8, ROUGH.fabric), 0, () => G.box(-0.3, 1.15, -1.55, 0.0, 1.22, -1.4, { bevel: 0.01 }));
  G.with(sw(0x18191a, ROUGH.metal), 0, () => { G.strut([-0.6, WR, AXR], [0.6, WR, AXR], 0.035, { round: 6 }); G.box(-0.5, 0.18, -0.6, 0.5, 0.3, 0.9); });
  const mats = vehicleMaterials(A);
  PARTS = { body: G.build(), glass: GL.build(), wheels: [1, -1].map((side) => wheelGeometry(V.wheel, { r: WR, w: 0.155, rim: 0.165, side })), mats };
  return PARTS;
}

/** Mr. Tanaka's wagon, parked: the body mesh (raycast against it), its glass and wheels as children. */
export function keiWagonMesh() {
  const P = parts(), M = P.mats;
  const car = new THREE.Mesh(P.body, M.body);
  car.name = 'keiWagon';
  car.castShadow = true; car.receiveShadow = true;
  const gl = new THREE.Mesh(P.glass, M.glass);
  gl.renderOrder = 2; gl.raycast = () => {};
  car.add(gl);
  for (const [x, z] of [[-0.62, AXF], [0.62, AXF], [-0.62, AXR], [0.62, AXR]]) {
    const w = new THREE.Mesh(P.wheels[x > 0 ? 0 : 1], M.body);
    w.position.set(x, WR, z);
    w.castShadow = true;
    w.raycast = () => {};
    car.add(w);
  }
  return car;
}
