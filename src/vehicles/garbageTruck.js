// The town's garbage truck: a small Japanese 2-ton packer (パッカー車), low-poly with one pixel atlas. A white cab-over
// cab with a blue stripe, square headlights, a black grille band, big mirrors on stalks; the packer body in white with
// a deep blue band, 清掃車 and MORIO CITY down the sides, marker lamps; the hopper at the back with its loading mouth,
// the rotating packer plate inside it (moves: `blade`), the crew's step and grab rails; dual rear wheels.
// Faces +z, y = 0 the road.   garbageTruckParts() -> { body, glass, blade, wheelF: [l, r], wheelR: [l, r], mats, dims }
import * as THREE from 'three';
import { Atlas, ROUGH } from './atlas.js';
import { Geo, triplanar, boxMap } from './geom.js';
import { shell, slab } from './shell.js';
import { ramp, mix, seamLoop, seal, glassPane, rust, lamp, plate, seeded } from './paint.js';
import { wheelPatches, wheelGeometry, rods, vehicleMaterials, wiper } from './parts.js';
import { Pix, FONT_JP } from '../gfx/pix.js';

export const TRUCK = { W: 0.85, WR: 0.37, AXF: 1.75, AXR: -1.0, TRACKF: 0.68, TRACKR: 0.6, BLADE: { y: 1.32, z: -2.28 }, STEP_Z: -2.55 };
const W = TRUCK.W, WR = TRUCK.WR;
const CAB = { z0: 1.22, z1: 2.4, y0: 0.62, roof: 2.08 };
const BODY = { z0: -2.02, z1: 1.14, y0: 0.82, y1: 2.28 };
const WHITE = ramp(0xf0f0ea), BLUE = ramp(0x2a62b0), TRIM = 0x222426, RUBBER = 0x1c1e20, CHROME = [0x5a6064, 0xb8c0c4, 0xeef4f4];
const WS0 = [2.38, 1.3], WS1 = [2.28, 1.92];
const zWS = (y) => WS0[0] + (y - WS0[1]) * (WS1[0] - WS0[0]) / (WS1[1] - WS0[1]);

const CAB_PROFILE = [
  [CAB.z0, CAB.y0, 0], [CAB.z1 - 0.02, CAB.y0, 1], [CAB.z1, 1.25, 1], [WS0[0], WS0[1], 1], [WS1[0], WS1[1], 1], [2.2, 2.05, 1], [2.08, CAB.roof, 1],
  [CAB.z0 + 0.06, CAB.roof, 1], [CAB.z0, 2.0, 1],
];
const E_WS = 3;
const CAB_DOOR_WIN = [[1.32, 1.3], [zWS(1.3) - 0.1, 1.3], [zWS(1.88) - 0.1, 1.88], [1.32, 1.88]];
const CAB_BACK_WIN = { u0: 0.12, u1: 0.42, hx: 0.5 };
const BODY_PROFILE = [
  [BODY.z0, BODY.y0, 0], [BODY.z1, BODY.y0, 0], [BODY.z1, BODY.y1 - 0.08, 1], [BODY.z1 - 0.1, BODY.y1, 1], [BODY.z0 + 0.1, BODY.y1, 1], [BODY.z0, BODY.y1 - 0.1, 1],
];

function paintAtlas() {
  const A = new Atlas(1024, 1024);
  const ppm = 64;
  const V = {
    L: A.view('ext:+x', { u: (p) => -p[2], v: (p) => p[1], u0: -2.7, u1: 2.6, v0: 0.2, v1: 2.4, ppm }),
    R: A.view('ext:-x', { u: (p) => p[2], v: (p) => p[1], u0: -2.7, u1: 2.6, v0: 0.2, v1: 2.4, ppm }),
    F: A.view('ext:+z', { u: (p) => p[0], v: (p) => p[1], u0: -0.9, u1: 0.9, v0: 0.2, v1: 2.4, ppm: 80 }),
    B: A.view('ext:-z', { u: (p) => -p[0], v: (p) => p[1], u0: -0.9, u1: 0.9, v0: 0.2, v1: 2.4, ppm: 80 }),
    T: A.view('ext:+y', { u: (p) => p[0], v: (p) => p[2], u0: -0.9, u1: 0.9, v0: -2.7, v1: 2.6, ppm: 40 }),
    I: A.patch('in', 8, 8),
  };
  V.I.A.ink(ROUGH.plastic); V.I.fill(0x3a3c40);
  V.wheel = wheelPatches(A, { name: 'gt', steel: 0xe8e8e0, cap: 0.24, holes: 8, nuts: 6 });
  V.plate = A.patch('plate', 66, 33); plate(V.plate, { top: 'MORIO 800', num: '3-71', kana: 'sa', bg: 0x2a6a3a, ink: 0xf2f2e8, frame: 0x1a3a22 });
  V.lit = A.patch('lit', 8, 8); V.lit.fill(0xfff4d8);
  paintSide(V.L, 1); paintSide(V.R, -1); paintFront(V.F); paintRear(V.B);
  V.T.A.ink(ROUGH.paint); V.T.fill(WHITE[2]);
  for (let z = -1.9; z < 1.1; z += 0.3) V.T.hline(0, V.T.W, V.T.j(z), WHITE[1]);
  return { A, V };
}

function kanji(V, str, i, j, col, outline) {
  const p = new Pix(16 * str.length + 8, 22);
  p.ctx.font = `16px ${FONT_JP}`; p.ctx.textBaseline = 'top'; p.ctx.fillStyle = '#fff'; p.ctx.fillText(str, 4, 2);
  p.pull();
  const set = [];
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (p.d[(y * p.w + x) * 4 + 3] > 110) set.push([x, y]);
  // twice the size: chunky sign-painted strokes
  for (const [x, y] of set) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [2, 0], [0, 2], [2, 1], [1, 2]]) { for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) if (outline !== undefined) V.px(i + x * 2 + dx + a, j - y * 2 - dy - b, outline); }
  for (const [x, y] of set) for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) V.px(i + x * 2 + a, j - y * 2 - b, col);
}

function paintSide(S, sx) {
  const A = S.A, U = (z) => (sx > 0 ? -z : z), I = (z) => S.i(U(z)), J = (y) => S.j(y), P = (pts) => pts.map(([z, y]) => [U(z), y]);
  A.ink(ROUGH.paint);
  S.fill(WHITE[2]);
  // the packer body: a deep blue band, the 清掃車 lettering, the town's name, a panel seam grid
  S.rect(U(BODY.z0), 1.08, U(BODY.z1), 1.34, BLUE[2]); S.hline(I(BODY.z0), I(BODY.z1), J(1.34) - 1, BLUE[3]); S.hline(I(BODY.z0), I(BODY.z1), J(1.08), BLUE[1]);
  S.rect(U(BODY.z0), 1.37, U(BODY.z1), 1.39, BLUE[2]);
  for (const z of [-1.2, -0.3, 0.6]) S.vline(I(z), J(BODY.y0), J(BODY.y1), WHITE[1]);
  S.hline(I(BODY.z0), I(BODY.z1), J(2.18), WHITE[1]);
  kanji(S, '清掃車', sx > 0 ? I(0.75) : I(-1.62), J(2.06), 0x1e4a8a, WHITE[3]);
  S.text5('MORIO CITY', sx > 0 ? I(0.72) : I(-1.6), J(1.31), 0xffffff, { s: 1 });
  S.text5('KEEP OUR LANES CLEAN', sx > 0 ? I(0.72) : I(-1.6), J(1.18), mix(BLUE[2], 0xffffff, 0.7));
  // marker lamps along the bottom of the body
  A.ink(ROUGH.lens);
  for (let z = -1.8; z < 1.0; z += 0.55) { S.rect(U(z), 0.86, U(z + 0.05), 0.9, 0xf09a2a); S.px(I(z) + (sx > 0 ? -1 : 1), J(0.9) - 1, 0xffd080); }
  A.ink(ROUGH.paint);
  // the hopper: grey steel, the tail lamps' wrap
  S.rect(U(-2.5), 0.62, U(BODY.z0), 2.0, mix(WHITE[2], 0x8a8e92, 0.35));
  S.hline(I(-2.5), I(BODY.z0), J(1.4), WHITE[1]);
  // the cab: door seam, its window, a blue stripe, the step, the side indicator
  S.rect(U(CAB.z0), 1.02, U(CAB.z1), 1.08, BLUE[2]);
  seamLoop(S, P([[1.28, 0.7], [CAB.z1 - 0.08, 0.7], [CAB.z1 - 0.08, 1.2], [zWS(1.3) - 0.06, 1.3], [zWS(1.95) - 0.06, 1.95], [1.28, 1.95]]), WHITE[0], WHITE[4], sx > 0 ? -1 : 1, -1);
  glassPane(S, P(CAB_DOOR_WIN), { seed: sx > 0 ? 3 : 6, alpha: 150 }); seal(S, P(CAB_DOOR_WIN), RUBBER, 2);
  A.ink(ROUGH.plastic); S.rect(U(1.6), 0.5, U(2.1), 0.62, TRIM); S.rect(U(1.7), 0.56, U(2.0), 0.58, 0x3a3c3e);
  A.ink(ROUGH.lens); S.rect(U(2.2), 0.95, U(2.3), 0.99, 0xf09a2a);
  A.ink(ROUGH.paint);
  // grime and a little rust where the bags drip
  const r = seeded(sx > 0 ? 3 : 4);
  for (let k = 0; k < 4; k++) rust(S, I(-2.4 + r() * 0.3), J(0.62) + 1, 4 + Math.round(r() * 4), 2, Math.round(r() * 999), { base: 0x6a5a3a, freckles: 1 });
  rust(S, I(BODY.z0 + 0.3), J(BODY.y0) + 1, 10, 3, 5, { base: 0x7a6a4a });
}
function paintFront(F) {
  const A = F.A, I = (x) => F.i(x), J = (y) => F.j(y);
  A.ink(ROUGH.paint);
  F.fill(WHITE[2]);
  F.rect(-0.9, 1.02, 0.9, 1.08, BLUE[2]);
  const ws = [[-0.72, WS0[1] + 0.02], [0.72, WS0[1] + 0.02], [0.72, WS1[1] - 0.02], [-0.72, WS1[1] - 0.02]];
  glassPane(F, ws, { seed: 2, alpha: 140, slope: 0.4 }); seal(F, ws, RUBBER, 2);
  // the black grille band, square headlights, amber lamps, the bumper
  A.ink(ROUGH.plastic);
  F.rect(-0.85, 0.82, 0.85, 0.98, TRIM);
  for (let y = 0.84; y < 0.97; y += 0.025) F.rect(-0.45, y, 0.45, y + 0.012, 0x3a3c3e);
  A.ink(ROUGH.chrome); F.rect(-0.08, 0.885, 0.08, 0.915, CHROME[1]); F.hline(I(-0.08), I(0.08) - 1, J(0.915) - 1, CHROME[2]);
  for (const s of [-1, 1]) {
    lamp(F, I(s > 0 ? 0.55 : -0.8), J(0.84), I(s > 0 ? 0.8 : -0.55), J(0.96), 'head');
    lamp(F, I(s > 0 ? 0.6 : -0.8), J(0.66), I(s > 0 ? 0.8 : -0.6), J(0.72), 'amber');
  }
  A.ink(ROUGH.plastic);
  F.box(0, F.j(0.45), F.W, F.j(0.64), (i, j) => (j === F.j(0.64) - 1 ? 0x5a5c5e : 0x2e3032));
  F.rect(-0.55, 1.1, 0.55, 1.2, WHITE[1]);
  F.text5('MORIO CITY', I(0), J(1.18), BLUE[1], { align: 'center' });
}
function paintRear(B) {
  const A = B.A, I = (x) => B.i(-x), J = (y) => B.j(y);
  A.ink(ROUGH.paint);
  B.fill(mix(WHITE[2], 0x8a8e92, 0.3));
  // the hopper's mouth (dark) with its lip; chevrons on the tailgate; lamps; the plate
  B.rect(-0.66, 0.78, 0.66, 1.42, 0x141516);
  B.hline(I(0.66), I(-0.66), J(1.42), 0xc8ccd0);
  for (let x = -0.8; x < 0.8; x += 0.16) B.poly([[-x, 0.5], [-x - 0.08, 0.5], [-x - 0.16, 0.7], [-x - 0.08, 0.7]], 0xe8b81a);
  B.rect(-0.85, 1.45, 0.85, 1.5, BLUE[2]);
  for (const s of [-1, 1]) {
    const x0 = s > 0 ? 0.68 : -0.84, x1 = s > 0 ? 0.84 : -0.68, i0 = Math.min(I(x0), I(x1)), i1 = Math.max(I(x0), I(x1));
    lamp(B, i0, J(1.62), i1, J(1.76), 'red', { bezel: false });
    lamp(B, i0, J(1.54), i1, J(1.6), 'amber', { bezel: false });
  }
  B.text5('MORIO CITY', I(0), J(1.95), BLUE[1], { align: 'center' });
}

let PARTS = null;
export function garbageTruckParts() {
  if (PARTS) return PARTS;
  const { A, V } = paintAtlas();
  const ext = triplanar({ px: V.L, nx: V.R, py: V.T, pz: V.F, nz: V.B }, A.swatch(0x18191a, ROUGH.matte));
  const inn = (p, n) => V.I.st(0.5, 0.5);
  const sw = (c, r = ROUGH.plastic) => A.swatch(c, r);
  const rubber = sw(RUBBER, ROUGH.rubber), dark = sw(0x18191a, ROUGH.matte);
  const G = new Geo(1), GL = new Geo(1);
  // the cab, with real glass and a simple inside
  shell(G, {
    pts: CAB_PROFILE, W, R: 0.07, K: 2, uv: ext,
    sideHoles: { pos: [{ pts: CAB_DOOR_WIN, glass: true, wall: rubber }], neg: [{ pts: CAB_DOOR_WIN, glass: true, wall: rubber }] },
    bandHoles: [{ e: E_WS, u0: 0.03, u1: 0.97, hx: 0.72 }],
    bandUv: (e) => (CAB_PROFILE[e][2] === 0 ? dark : null),
    wallUv: rubber, glassUv: ext, glassGeo: GL, inner: { t: 0.03, uv: inn },
  });
  G.with(sw(0x2a2c30), 0, () => {
    G.box(-W + 0.03, 1.0, 2.05, W - 0.03, 1.28, 2.32, { bevel: 0.015 }); // dash
    for (const s of [-1, 1]) G.box(s > 0 ? 0.1 : -0.75, 0.9, 1.3, s > 0 ? 0.75 : -0.1, 1.0, 1.75, { bevel: 0.03 });
    G.box(-0.75, 1.0, 1.26, 0.75, 1.65, 1.36, { bevel: 0.03 });
    G.push(new THREE.Matrix4().compose(new THREE.Vector3(-0.42, 1.38, 2.0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.95, 0, 0)), new THREE.Vector3(1, 1, 1)));
    G.torus(0.2, 0.014, 20, 4); G.strut([-0.19, 0, 0], [0.19, 0, 0], 0.012);
    G.pop();
  });
  // the packer body
  shell(G, { pts: BODY_PROFILE, W: W + 0.01, R: 0.1, K: 2, uv: ext, bandUv: (e) => (BODY_PROFILE[e][2] === 0 ? dark : null) });
  // the hopper: sides, top and bottom; its back a plate with the loading mouth cut in it, the dark throat behind
  G.with(ext, 0, () => {
    G.box(-W, 0.62, -2.5, W, 2.0, BODY.z0 + 0.02, { skip: ['nz'] });
    G.box(-W - 0.005, 0.27, -2.62, W + 0.005, 0.32, -2.46, { bevel: 0.01 }); // the crew's step
  });
  const MOUTH = [[-0.64, 0.8], [0.64, 0.8], [0.64, 1.4], [-0.64, 1.4]];
  slab(G, [[-W, 0.62], [W, 0.62], [W, 2.0], [-W, 2.0]], [MOUTH], -2.5, -2.46, { axis: 'z', uvOut: ext, uvIn: dark, uvEdge: ext, uvHole: sw(0xc8ccd0, ROUGH.metal) });
  G.with(dark, 0, () => G.box(-0.64, 0.8, -2.46, 0.64, 1.4, -1.95, { inward: true, skip: ['nz'] }));
  G.with(sw(CHROME[1], ROUGH.chrome), 0, () => {
    for (const s of [-1, 1]) rods(G, [[s * 0.8, 0.5, -2.52], [s * 0.8, 1.9, -2.52]], 0.018, 6);
    rods(G, [[-0.6, 1.62, -2.52], [0.6, 1.62, -2.52]], 0.016, 6);
  });
  // the cab's bumper, mirrors on big stalks, wipers; the chassis rails and the fuel tank
  G.with(ext, 0, () => G.box(-W - 0.01, 0.45, CAB.z1 - 0.05, W + 0.01, 0.64, CAB.z1 + 0.06, { bevel: 0.02 }));
  const pl = (z, y) => G.with(boxMap(V.plate, [-0.165, y, z - 0.004, 0.165, y + 0.165, z + 0.004]), 0, () => G.box(-0.165, y, z - 0.004, 0.165, y + 0.165, z + 0.004));
  pl(CAB.z1 + 0.065, 0.465);
  G.with(sw(0x1e1f21), 0, () => {
    for (const s of [-1, 1]) {
      rods(G, [[s * W, 1.85, 2.3], [s * (W + 0.18), 1.85, 2.34], [s * (W + 0.18), 1.4, 2.34]], 0.012, 4);
      G.box(s * (W + 0.18) - 0.05, 1.35, 2.3, s * (W + 0.18) + 0.05, 1.7, 2.37, { bevel: 0.015 });
    }
    G.box(-0.45, 0.42, -2.0, 0.45, 0.62, 1.4); // frame rails / sub-frame
    G.box(0.55, 0.45, 0.2, 0.84, 0.75, 0.9, { bevel: 0.04 }); // fuel tank
  });
  G.with(sw(0x9ab0bc, ROUGH.glass), 0, () => { for (const s of [-1, 1]) G.quad([s * (W + 0.18) - 0.04, 1.37, 2.299], [s * (W + 0.18) + 0.04, 1.37, 2.299], [s * (W + 0.18) + 0.04, 1.68, 2.299], [s * (W + 0.18) - 0.04, 1.68, 2.299], [0, 0, -1]); });
  const u = [0, 0.987, -0.159], out = [0, 0.159, 0.987];
  for (const px of [-0.6, 0.02]) wiper(G, [px, WS0[1] + 0.03, zWS(WS0[1] + 0.03) + 0.012], [0.98, 0.18 * u[1], 0.18 * u[2]].map((v, i, a) => v / Math.hypot(...a)), 0.55, 0.5, out, sw(0x161618));
  // mud guards over the rear wheels
  G.with(sw(0x1e1f21), 0, () => { for (const s of [-1, 1]) G.box(s > 0 ? 0.5 : -W - 0.01, 0.78, TRUCK.AXR - 0.5, s > 0 ? W + 0.01 : -0.5, 0.82, TRUCK.AXR + 0.5); });
  // the rotating packer plate (its own mesh): a shaft and a curved plate hanging from it
  const B = new Geo(1);
  B.with(sw(0x6a6e72, ROUGH.metal), 0, () => {
    B.cyl('x', [-0.62, 0, 0], 0.05, 1.24, 8);
    for (let k = 0; k < 3; k++) { const a0 = -0.2 + k * 0.25, a1 = a0 + 0.25, r0 = 0.12 + k * 0.17, r1 = r0 + 0.17; B.quad([-0.6, -r0, Math.sin(a0) * r0], [0.6, -r0, Math.sin(a0) * r0], [0.6, -r1, Math.sin(a1) * r1], [-0.6, -r1, Math.sin(a1) * r1], [0, 0, 1]); B.quad([-0.6, -r0, Math.sin(a0) * r0 - 0.02], [0.6, -r0, Math.sin(a0) * r0 - 0.02], [0.6, -r1, Math.sin(a1) * r1 - 0.02], [-0.6, -r1, Math.sin(a1) * r1 - 0.02], [0, 0, -1]); }
  });
  const mats = vehicleMaterials(A);
  const wf = [1, -1].map((side) => wheelGeometry(V.wheel, { r: WR, w: 0.2, rim: 0.2, side }));
  // dual rear wheels: two tyres side by side in one geometry
  const wr = [1, -1].map((side) => {
    const a = wheelGeometry(V.wheel, { r: WR, w: 0.2, rim: 0.2, side }), b = wheelGeometry(V.wheel, { r: WR, w: 0.2, rim: 0.2, side: -side });
    b.translate(-side * 0.22, 0, 0);
    const g = new THREE.BufferGeometry();
    for (const k of ['position', 'normal', 'uv']) { const x = a.attributes[k], y = b.attributes[k]; const arr = new Float32Array(x.array.length + y.array.length); arr.set(x.array); arr.set(y.array, x.array.length); g.setAttribute(k, new THREE.BufferAttribute(arr, x.itemSize)); }
    g.addGroup(0, a.attributes.position.count + b.attributes.position.count, 0);
    g.computeBoundingSphere();
    return g;
  });
  PARTS = { A, V, body: G.build(), glass: GL.build(), blade: B.build(), wheelF: wf, wheelR: wr, mats };
  return PARTS;
}
