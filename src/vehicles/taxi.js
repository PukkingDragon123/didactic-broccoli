// The taxi that takes Grandpa to the station: a late-90s Japanese "comfort" taxi sedan (4.56 x 1.7 x 1.47 m), boxy,
// lemon yellow over deep green with a white pinstripe, chrome bumpers and grille, fender mirrors on stalks out on the
// front wings, the lit roof lamp (andon), the red 空車 sign and the fare meter on the dash, the company's yellow
// diamond on the front doors, a green commercial plate, wheel covers; inside, every seat in white lace covers and a
// driver in his cap and white gloves. The rear left door opens by itself (the driver works it from his seat).
// Low-poly with one pixel atlas, real glass. Faces +z; y = 0 the road.
//   taxiParts() -> { body, glass, door, doorGlass, wheelL, wheelR, lit: { heads, brakes, signs }, mats, dims } (cached)
import { Atlas, ROUGH } from './atlas.js';
import { Geo, triplanar, boxMap } from './geom.js';
import { shell, slab } from './shell.js';
import { ramp, mix, seamLoop, seal, glassPane, lamp, lampLit, plate, grow, rust } from './paint.js';
import { wheelPatches, wheelGeometry, wiper, rods, vehicleMaterials } from './parts.js';
import { Pix, FONT_JP } from '../gfx/pix.js';
import * as THREE from 'three';

const W = 0.85, RND = 0.07, YB = 0.26, WR = 0.31, ARCH = 0.37, AX = 1.42;
const BELT = 0.98, WT = 1.36;
const WS0 = [1.08, 0.86], WS1 = [0.47, 1.41], RW0 = [-1.0, 1.42], RW1 = [-1.52, 0.98];
const zA = (y) => WS0[0] + (y - WS0[1]) * (WS1[0] - WS0[0]) / (WS1[1] - WS0[1]);
export const TAXI = { W, WR, AX, TRACK: 0.75, HINGE: { x: W, z: 0 } };
function arch(zc, n = 9) { const out = []; for (let k = 0; k <= n; k++) { const a = Math.PI * (1 - k / n); out.push([zc + Math.cos(a) * ARCH, YB + Math.sin(a) * ARCH, 0]); } return out; }
const PROFILE = [
  [-2.24, YB, 0], ...arch(-AX), ...arch(AX), [2.27, YB, 1],
  [2.3, 0.44, 1], [2.29, 0.66, 1], [2.22, 0.77, 1], [1.2, 0.84, 1], [WS0[0], WS0[1], 1], [WS1[0], WS1[1], 1], [0.32, 1.47, 1],
  [-0.86, 1.47, 1], [RW0[0], RW0[1], 1], [RW1[0], RW1[1], 1], [-2.15, 0.95, 1], [-2.25, 0.88, 1], [-2.27, 0.44, 1],
];
const E_WS = PROFILE.findIndex((p) => p[0] === WS0[0] && p[1] === WS0[1]);
const E_RW = PROFILE.findIndex((p) => p[0] === RW0[0] && p[1] === RW0[1]);
const WIN_F = [[0.04, BELT], [zA(BELT) - 0.14, BELT], [zA(WT) - 0.14, WT], [0.04, WT]];
const REAR_DOOR = [[-0.95, 0.32], [-0.02, 0.32], [-0.02, 1.385], [-0.86, 1.385], [-0.95, 1.3]];
const WIN_R = [[-0.89, 1.0], [-0.07, 1.0], [-0.07, 1.345], [-0.83, 1.345], [-0.89, 1.28]];
const FRONT_DOOR = [[0.0, 0.32], [1.04, 0.32], [1.04, 0.84], [zA(0.9) - 0.11, 0.9], [zA(1.385) - 0.11, 1.385], [0.0, 1.385]];

const YEL = ramp(0xf2c840), GRN = ramp(0x1f5a3c), WHITE = 0xf4f2ea, TRIM = 0x1e2022, RUBBER = 0x1a1c1e, CHROME = [0x5a6064, 0xc0c8cc, 0xf2f6f6];
const IN = { trim: 0x3a3c40, head: 0x8a8678, floor: 0x2a2c30, dash: 0x2a2a2c, seat: 0x3e4656 };

function kanji(V, str, i, j, col) {
  const p = new Pix(16 * str.length + 8, 22);
  p.ctx.font = `16px ${FONT_JP}`; p.ctx.textBaseline = 'top'; p.ctx.fillStyle = '#fff'; p.ctx.fillText(str, 4, 2);
  p.pull();
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (p.d[(y * p.w + x) * 4 + 3] > 110) V.px(i + x, j - y, col);
}

function paintAtlas() {
  const A = new Atlas(1024, 1024);
  const V = {
    L: A.view('ext:+x', { u: (p) => -p[2], v: (p) => p[1], u0: -2.36, u1: 2.36, v0: 0.12, v1: 1.5 }),
    R: A.view('ext:-x', { u: (p) => p[2], v: (p) => p[1], u0: -2.36, u1: 2.36, v0: 0.12, v1: 1.5 }),
    F: A.view('ext:+z', { u: (p) => p[0], v: (p) => p[1], u0: -0.9, u1: 0.9, v0: 0.12, v1: 1.5 }),
    B: A.view('ext:-z', { u: (p) => -p[0], v: (p) => p[1], u0: -0.9, u1: 0.9, v0: 0.12, v1: 1.5 }),
    T: A.view('ext:+y', { u: (p) => p[0], v: (p) => p[2], u0: -0.9, u1: 0.9, v0: -2.36, v1: 2.36, ppm: 80 }),
    IR: A.view('in:+x', { u: (p) => p[2], v: (p) => p[1], u0: -2.3, u1: 2.3, v0: 0.2, v1: 1.5, ppm: 50 }),
    IL: A.view('in:-x', { u: (p) => p[2], v: (p) => p[1], u0: -2.3, u1: 2.3, v0: 0.2, v1: 1.5, ppm: 50 }),
    IF: A.view('in:+y', { u: (p) => p[0], v: (p) => p[2], u0: -0.85, u1: 0.85, v0: -2.3, v1: 2.3, ppm: 50 }),
    IH: A.view('in:-y', { u: (p) => p[0], v: (p) => p[2], u0: -0.85, u1: 0.85, v0: -2.3, v1: 2.3, ppm: 50 }),
  };
  V.wheel = wheelPatches(A, { name: 'tx', steel: 0xd8dcdc, cap: 0.34, holes: 12, nuts: 0 });
  V.plate = A.patch('plate', 66, 33); plate(V.plate, { top: 'MORIO 500', num: '17-74', kana: 'sa', bg: 0x2a6a3a, ink: 0xf2f2e8, frame: 0x1a3a22 });
  V.lace = A.patch('lace', 32, 32); paintLace(V.lace);
  V.andon = A.patch('andon', 40, 12); paintAndon(V.andon);
  V.kusha = A.patch('kusha', 36, 18); V.kusha.A.ink(ROUGH.lens); V.kusha.fill(0xd8282a); V.kusha.frame(0, 0, 36, 18, 0x8a1010); kanji(V.kusha, '空車', 2, 19, 0xfff4e8);
  V.meter = A.patch('meter', 24, 10); V.meter.fill(0x101010); V.meter.text5('660', 22, 8, 0xff5a3a, { align: 'right' }); V.meter.rect(1, 1, 6, 4, 0x58d058);
  V.litHead = A.patch('lit:head', 22, 12); lampLit(V.litHead, 0, 0, 22, 12, 'head');
  V.litTail = A.patch('lit:tail', 16, 10); lampLit(V.litTail, 0, 0, 16, 10, 'red');
  V.uniform = A.patch('uniform', 16, 16); V.uniform.fill(0x3a4458); V.uniform.rect(6, 0, 10, 16, 0xe8e8e0); V.uniform.rect(7, 4, 9, 14, 0x8a2a2a);
  for (const [S, sx] of [[V.L, 1], [V.R, -1]]) paintSide(S, sx);
  paintFront(V.F); paintRear(V.B);
  V.T.A.ink(ROUGH.paint); V.T.fill(YEL[2]); V.T.rect(-0.9, 0.95, 0.9, 2.36, GRN[2]); V.T.rect(-0.9, -2.36, 0.9, -1.55, GRN[2]);
  for (const S of [V.IR, V.IL]) { S.A.ink(ROUGH.plastic); S.fill(IN.trim); S.rect(-2.3, 1.36, 2.3, 1.5, IN.head); S.rect(-0.9, 0.5, 0.95, 0.95, 0x4a4c52); seal(S, WIN_F, 0x101112, 1); seal(S, WIN_R, 0x101112, 1); }
  V.IF.fill(IN.floor); V.IF.rect(-0.85, 0.95, 0.85, 1.25, IN.dash); V.IF.rect(-0.85, -2.3, 0.85, -1.0, 0x3a3836);
  V.IH.fill(IN.head); V.IH.rect(-0.08, -0.3, 0.08, -0.2, 0xe8e4d4);
  return { A, V };
}
/** A lace cover over the top of a seat back: white lace with little rosettes, a scalloped hem, the fabric below. */
function paintLace(P) {
  P.A.ink(ROUGH.fabric);
  const F = ramp(IN.seat), hem = Math.round(P.H * 0.42);
  P.box(0, 0, P.W, P.H, (i, j) => (j % 4 === 0 ? F[1] : F[2]));
  for (let j = hem - 3; j < P.H; j++) for (let i = 0; i < P.W; i++) {
    if (j < hem && Math.hypot((i % 6) - 2.5, j - hem + 0.5) > 3) continue; // the scalloped hem
    let c = 0xf6f4ee;
    if ((i % 4 === 1 && j % 4 === 2) || (i % 4 === 3 && j % 4 === 0)) c = 0xb8b4ac; // the net's holes
    const ri = i % 10, rj = (j - hem) % 10;
    if (Math.abs(ri - 5) + Math.abs(rj - 5) <= 2) c = (ri + rj) % 2 ? 0xe2ded4 : 0xffffff; // rosettes
    if (j === P.H - 1) c = 0xe8e4dc;
    P.px(i, j, c);
  }
}
function paintAndon(P) {
  P.A.ink(ROUGH.lens);
  P.fill(0xfff2c0);
  P.frame(0, 0, P.W, P.H, 0x2a5a3a); P.hline(1, P.W - 2, 1, 0x2a5a3a);
  P.text5('TAXI', 21, 9, 0x1f5a3c, { align: 'center' });
  // the company's mark: a yellow diamond with a green heart
  for (const ox of [5, P.W - 6]) for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) { const a = Math.abs(x) + Math.abs(y); if (a <= 3) P.px(ox + x, 6 + y, a <= 1 ? 0x2a6a46 : 0xf2b81a); }
}

function paintSide(S, sx) {
  const A = S.A, U = (z) => (sx > 0 ? -z : z), I = (z) => S.i(U(z)), J = (y) => S.j(y), P = (pts) => pts.map(([z, y]) => [U(z), y]);
  A.ink(ROUGH.paint);
  // yellow over green, a white pinstripe at the waist
  S.box(0, 0, S.W, S.H, (i, j) => { const y = S.o.v0 + (j + 0.5) / S.ppm; return y > 0.95 ? (y > 1.42 ? YEL[3] : YEL[2]) : y < 0.33 ? GRN[1] : GRN[2]; });
  S.hline(0, S.W, J(0.94), WHITE); S.hline(0, S.W, J(0.93), GRN[0]);
  S.hline(0, S.W, J(0.7), GRN[3]); S.hline(0, S.W, J(0.69), GRN[1]);
  for (const zc of [-AX, AX]) for (let j = J(YB); j < J(YB + ARCH + 0.04); j++) for (let i = I(zc) - 50; i <= I(zc) + 50; i++) {
    const z = sx > 0 ? -(S.o.u0 + (i + 0.5) / S.ppm) : S.o.u0 + (i + 0.5) / S.ppm, y = S.o.v0 + (j + 0.5) / S.ppm, r = Math.hypot(z - zc, y - YB);
    if (r >= ARCH && r < ARCH + 0.012) S.px(i, j, GRN[0]); else if (r >= ARCH + 0.012 && r < ARCH + 0.024 && y > YB + 0.1) S.px(i, j, GRN[3]);
  }
  // doors, chrome handles' pockets, the black B-pillar, the fuel lid (right rear wing)
  seamLoop(S, P(grow(FRONT_DOOR, 0.002)), GRN[0], GRN[3], sx > 0 ? -1 : 1, -1);
  seamLoop(S, P(grow(REAR_DOOR, 0.002)), GRN[0], GRN[3], sx > 0 ? -1 : 1, -1);
  A.ink(ROUGH.plastic);
  S.rect(U(-0.04), BELT, U(0.06), WT + 0.02, TRIM);
  if (sx < 0) seamLoop(S, P([[-1.9, 0.72], [-1.76, 0.72], [-1.76, 0.84], [-1.9, 0.84]]), GRN[0], GRN[3], 1, -1);
  A.ink(ROUGH.chrome);
  for (const z of [0.1, -0.85]) { S.rect(U(z), 0.88, U(z + 0.1), 0.9, CHROME[1]); S.hline(I(z), I(z + 0.1) - (sx > 0 ? -1 : 1), J(0.9) - 1, CHROME[2]); }
  S.rect(U(-2.3), 0.62, U(2.35), 0.635, CHROME[1]); // the chrome side moulding
  A.ink(ROUGH.paint);
  for (const w of [WIN_F, WIN_R]) { glassPane(S, P(w), { seed: sx > 0 ? 2 : 7, alpha: 120 }); seal(S, P(w), RUBBER, 2); }
  // the company's mark on the front doors, its name on the rear doors
  const mi = I(0.55), mj = J(0.8);
  for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) { const a = Math.abs(x) + Math.abs(y); if (a <= 6) S.px(mi + x, mj + y, a <= 2 ? GRN[1] : a === 6 ? 0x8a6a10 : 0xf2b81a); }
  S.text5('MORIO TAXI', sx > 0 ? I(-0.15) : I(-0.88), J(0.84), WHITE);
  S.text5('TEL 55-1999', sx > 0 ? I(-0.2) : I(-0.83), J(0.76), YEL[3]);
  // bumper ends and lamp wraps
  A.ink(ROUGH.chrome);
  for (const [za, zb] of [[2.22, 2.36], [-2.36, -2.22]]) { S.rect(U(za), 0.3, U(zb), 0.46, CHROME[1]); S.rect(U(za), 0.37, U(zb), 0.39, TRIM); S.rect(U(za), 0.44, U(zb), 0.46, CHROME[2]); }
  A.ink(ROUGH.lens); S.rect(U(2.2), 0.58, U(2.3), 0.62, 0xf09a2a); S.rect(U(-2.32), 0.56, U(-2.22), 0.72, 0xc82a28);
  A.ink(ROUGH.paint);
  rust(S, I(-AX + 0.3), J(YB + 0.25), 5, 2, 3, { freckles: 0 });
}
function paintFront(F) {
  const A = F.A, I = (x) => F.i(x), J = (y) => F.j(y);
  A.ink(ROUGH.paint);
  F.box(0, 0, F.W, F.H, (i, j) => { const y = F.o.v0 + (j + 0.5) / F.ppm; return y > 0.9 ? YEL[2] : GRN[2]; });
  const ws = [[-(W - RND - 0.01), WS0[1] + 0.02], [W - RND - 0.01, WS0[1] + 0.02], [W - RND - 0.01, WS1[1] - 0.02], [-(W - RND - 0.01), WS1[1] - 0.02]];
  glassPane(F, ws, { seed: 3, alpha: 110, slope: 0.4 }); seal(F, ws, RUBBER, 2);
  // the chrome grille between square headlights, amber corner lamps, the chrome bumper
  A.ink(ROUGH.chrome);
  F.rect(-0.42, 0.56, 0.42, 0.72, CHROME[0]);
  for (let y = 0.575; y < 0.71; y += 0.025) F.rect(-0.4, y, 0.4, y + 0.012, CHROME[1]);
  F.vline(I(0), J(0.56), J(0.72), CHROME[2]);
  for (const s of [-1, 1]) {
    lamp(F, I(s > 0 ? 0.46 : -0.74), J(0.57), I(s > 0 ? 0.74 : -0.46), J(0.71), 'head');
    lamp(F, I(s > 0 ? 0.6 : -0.8), J(0.48), I(s > 0 ? 0.8 : -0.6), J(0.53), 'amber', { bezel: false });
  }
  F.box(0, J(0.3), F.W, J(0.46), (i, j) => (j >= J(0.46) - 2 ? CHROME[2] : j === J(0.38) || j === J(0.38) - 1 ? TRIM : j <= J(0.31) ? CHROME[0] : CHROME[1]));
}
function paintRear(B) {
  const A = B.A, I = (x) => B.i(-x), J = (y) => B.j(y);
  A.ink(ROUGH.paint);
  B.box(0, 0, B.W, B.H, (i, j) => { const y = B.o.v0 + (j + 0.5) / B.ppm; return y > 1.0 ? YEL[2] : GRN[2]; });
  const rw = [[-(W - RND - 0.02), 1.0], [W - RND - 0.02, 1.0], [W - RND - 0.02, 1.4], [-(W - RND - 0.02), 1.4]];
  glassPane(B, rw, { seed: 6, alpha: 120 }); seal(B, rw, RUBBER, 2);
  seamLoop(B, [[-0.72, 0.5], [0.72, 0.5], [0.72, 0.93], [-0.72, 0.93]], GRN[0], GRN[3], 0, -1); // the boot lid
  for (const s of [-1, 1]) { const x0 = s > 0 ? 0.5 : -0.84, x1 = s > 0 ? 0.84 : -0.5, i0 = Math.min(I(x0), I(x1)), i1 = Math.max(I(x0), I(x1)); lamp(B, i0, J(0.62), i1, J(0.72), 'red', { bezel: false }); lamp(B, i0, J(0.56), i1, J(0.62), 'amber', { bezel: false }); }
  A.ink(ROUGH.chrome); B.rect(-0.12, 0.74, 0.12, 0.76, CHROME[1]);
  B.text5('MORIO TAXI', I(0), J(0.9), YEL[3], { align: 'center' });
  B.box(0, J(0.3), B.W, J(0.46), (i, j) => (j >= J(0.46) - 2 ? CHROME[2] : j === J(0.38) ? TRIM : CHROME[1]));
}

let PARTS = null;
export function taxiParts() {
  if (PARTS) return PARTS;
  const { A, V } = paintAtlas();
  const ext = triplanar({ px: V.L, nx: V.R, py: V.T, pz: V.F, nz: V.B }, A.swatch(0x18191a, ROUGH.matte));
  const inn = triplanar({ px: V.IR, nx: V.IL, py: V.IF, ny: V.IH, pz: A.swatch(IN.trim, ROUGH.plastic), nz: A.swatch(IN.trim, ROUGH.plastic) });
  const sw = (c, r = ROUGH.plastic) => A.swatch(c, r);
  const rubber = sw(RUBBER, ROUGH.rubber), dark = sw(0x18191a, ROUGH.matte), jamb = sw(GRN[1], ROUGH.paint);
  const G = new Geo(1), GL = new Geo(1);
  shell(G, {
    pts: PROFILE, W, R: RND, K: 2, uv: ext,
    sideHoles: {
      pos: [{ pts: WIN_F, glass: true, wall: rubber }, { pts: grow(REAR_DOOR, 0.004), wall: jamb }],
      neg: [{ pts: WIN_F, glass: true, wall: rubber }, { pts: WIN_R, glass: true, wall: rubber }],
    },
    bandHoles: [
      { e: E_WS, u0: 0.03, u1: 0.97, hx: W - RND - 0.01 },
      { e: E_RW, u0: 0.05, u1: 0.95, hx: W - RND - 0.02 },
    ],
    bandUv: (e) => (PROFILE[e][2] === 0 ? dark : null),
    wallUv: rubber, glassUv: ext, glassGeo: GL, inner: { t: 0.03, uv: inn },
  });
  // bumpers, lamp housings, the grille, plates, the side mouldings
  G.with(ext, 0, () => {
    G.box(-W - 0.01, 0.3, 2.2, W + 0.01, 0.46, 2.36, { bevel: 0.03 });
    G.box(-W - 0.01, 0.3, -2.36, W + 0.01, 0.46, -2.22, { bevel: 0.03 });
    G.box(-0.75, 0.56, 2.24, 0.75, 0.72, 2.31, { bevel: 0.01 });
  });
  for (const [z, y, n] of [[2.364, 0.29, 1], [-2.278, 0.6, -1]]) G.with(boxMap(V.plate, [-0.165, y, z - 0.004, 0.165, y + 0.165, z + 0.004]), 0, () => G.box(-0.165, y, z - 0.004, 0.165, y + 0.165, z + 0.004, { skip: n > 0 ? ['nz'] : ['pz'] }));
  // fender mirrors on chrome stalks, out on the front wings
  G.with(sw(CHROME[1], ROUGH.chrome), 0, () => { for (const s of [-1, 1]) G.strut([s * 0.72, 0.83, 1.95], [s * 0.76, 0.97, 1.98], 0.007, { round: 4 }); });
  G.with(sw(0x1a1a1c), 0, () => { for (const s of [-1, 1]) G.box(s * 0.76 - 0.045, 0.95, 1.95, s * 0.76 + 0.045, 1.02, 2.0, { bevel: 0.015 }); });
  G.with(sw(0x9ab0bc, ROUGH.glass), 0, () => { for (const s of [-1, 1]) G.quad([s * 0.76 - 0.04, 0.955, 1.949], [s * 0.76 + 0.04, 0.955, 1.949], [s * 0.76 + 0.04, 1.015, 1.949], [s * 0.76 - 0.04, 1.015, 1.949], [0, 0, -1]); });
  // wipers, handles, the roof lamp's base, the aerial
  const d = [0, WS1[1] - WS0[1], WS1[0] - WS0[0]], l = Math.hypot(d[1], d[2]), u = [0, d[1] / l, d[2] / l], out = [0, -u[2], u[1]];
  for (const px of [-0.6, 0.02]) { const y = WS0[1] + 0.03, dd = [0.97, 0.24 * u[1], 0.24 * u[2]], ll = Math.hypot(...dd); wiper(G, [px, y, zA(y) + 0.012], dd.map((v) => v / ll), 0.5, 0.46, out, sw(0x161618)); }
  G.with(sw(CHROME[2], ROUGH.chrome), 0, () => { for (const z of [0.1]) G.box(W - 0.002, 0.882, z, W + 0.01, 0.898, z + 0.1, { bevel: 0.003 }); G.box(-W - 0.01, 0.882, 0.1, -W + 0.002, 0.898, 0.2, { bevel: 0.003 }); G.box(-W - 0.01, 0.882, -0.85, -W + 0.002, 0.898, -0.75, { bevel: 0.003 }); });
  G.with(sw(0x1f2a24), 0, () => G.box(-0.22, 1.465, -0.42, 0.22, 1.5, -0.06, { bevel: 0.01 }));
  G.with(sw(0x8a8e92, ROUGH.chrome), 0, () => G.strut([-0.6, 0.94, -1.95], [-0.62, 1.6, -2.1], 0.004, { round: 4 }));
  // the running gear
  G.with(sw(0x18191a, ROUGH.metal), 0, () => { G.strut([-0.66, WR, -AX], [0.66, WR, -AX], 0.04, { round: 6 }); G.box(-0.5, 0.18, -1.0, 0.5, 0.3, 1.8); });
  G.with(sw(0x5a5048, ROUGH.metal), 0, () => G.strut([0.45, 0.2, -1.5], [0.48, 0.2, -2.33], 0.024, { round: 6 }));
  // inside: the dash and its meter, two front seats and the rear bench in lace, the driver
  G.with(sw(IN.dash), 0, () => {
    G.box(-W + 0.03, 0.62, 0.85, W - 0.03, 0.88, 1.04, { bevel: 0.02 });
    G.push(new THREE.Matrix4().compose(new THREE.Vector3(-0.4, 0.95, 0.68), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.42, 0, 0)), new THREE.Vector3(1, 1, 1)));
    G.torus(0.18, 0.013, 22, 4); G.strut([-0.17, 0, 0], [0.17, 0, 0], 0.012); G.cyl('z', [0, 0, 0], 0.03, 0.35, 6);
    G.pop();
    G.box(-0.02, 0.88, 0.86, 0.16, 0.95, 0.94, { bevel: 0.008 }); // the meter's case
  });
  G.with(boxMap(V.meter, [-0.01, 0.89, 0.858, 0.15, 0.94, 0.858]), 0, () => G.quad([-0.01, 0.89, 0.858], [0.15, 0.89, 0.858], [0.15, 0.94, 0.858], [-0.01, 0.94, 0.858], [0, 0, -1]));
  const seat = (x0, x1, z0, z1, y0, y1, back) => {
    G.with(sw(IN.seat, ROUGH.fabric), 0, () => G.box(x0, y0 - 0.12, z0 + 0.03, x1, y0, z1 - 0.03));
    G.with(sw(IN.seat, ROUGH.fabric), 0, () => G.box(x0, y0, z0, x1, y1, z1, { bevel: 0.03 }));
    G.push(new THREE.Matrix4().makeRotationX(-0.2).setPosition(0, y1 - 0.02, z0 + 0.04));
    G.with(boxMap(V.lace, [x0, 0, -0.06, x1, back, 0.05]), 0, () => G.box(x0, 0, -0.06, x1, back, 0.05, { bevel: 0.035 }));
    G.pop();
  };
  seat(-0.7, -0.1, 0.25, 0.75, 0.42, 0.5, 0.62);
  seat(0.1, 0.7, 0.25, 0.75, 0.42, 0.5, 0.62);
  seat(-0.74, 0.74, -0.8, -0.28, 0.33, 0.43, 0.6);
  // the driver: his jacket, his face, his cap, his white gloves on the wheel
  G.with(boxMap(V.uniform, [-0.58, 0.5, 0.32, -0.22, 1.08, 0.58]), 0, () => G.box(-0.58, 0.5, 0.32, -0.22, 1.08, 0.58, { bevel: 0.05 }));
  G.with(sw(0xd8a888, ROUGH.matte), 0, () => G.box(-0.48, 1.1, 0.38, -0.32, 1.28, 0.54, { bevel: 0.04 }));
  G.with(sw(0x2a3448, ROUGH.fabric), 0, () => { G.box(-0.5, 1.26, 0.36, -0.3, 1.33, 0.56, { bevel: 0.02 }); G.box(-0.47, 1.26, 0.54, -0.33, 1.28, 0.62); });
  G.with(sw(0xf2c840, ROUGH.chrome), 0, () => G.box(-0.42, 1.28, 0.561, -0.38, 1.31, 0.565));
  G.with(sw(0xf8f8f4, ROUGH.fabric), 0, () => { for (const s of [-1, 1]) G.box(-0.4 + s * 0.15 - 0.035, 1.01, 0.6, -0.4 + s * 0.15 + 0.035, 1.07, 0.68, { bevel: 0.015 }); });
  const body = G.build();
  // the automatic rear door (left, +x), in body space shut; moved so its hinge (the front edge) is the origin
  const D = new Geo(1), DG = new Geo(1);
  slab(D, REAR_DOOR, [WIN_R], W, W - 0.06, { uvOut: ext, uvIn: inn, uvEdge: jamb, uvHole: rubber });
  DG.with(ext, 0, () => DG.polyHoles(WIN_R, [], (z, y) => [W - 0.014, y, z], [1, 0, 0]));
  D.with(sw(CHROME[2], ROUGH.chrome), 0, () => D.box(W - 0.002, 0.882, -0.85, W + 0.01, 0.898, -0.75, { bevel: 0.003 }));
  const door = D.build(), doorGlass = DG.build();
  for (const g of [door, doorGlass]) { g.translate(-W, 0, 0); g.computeBoundingSphere(); }
  // lamps: headlights (on while the taxi runs), the tail lamps (its brakes), the roof lamp, 空車 and the meter (always lit)
  const q = (G2, v, pts, n) => G2.quad(...pts, n, [v.st(0, 0), v.st(1, 0), v.st(1, 1), v.st(0, 1)]);
  const H = new Geo(1), Bk = new Geo(1), S = new Geo(1);
  for (const s of [-1, 1]) {
    const x0 = s > 0 ? 0.46 : -0.74, x1 = s > 0 ? 0.74 : -0.46;
    q(H, V.litHead, [[x0, 0.57, 2.312], [x1, 0.57, 2.312], [x1, 0.71, 2.312], [x0, 0.71, 2.312]], [0, 0, 1]);
    const t0 = s > 0 ? 0.5 : -0.84, t1 = s > 0 ? 0.84 : -0.5;
    q(Bk, V.litTail, [[t1, 0.62, -2.276], [t0, 0.62, -2.276], [t0, 0.72, -2.276], [t1, 0.72, -2.276]], [0, 0, -1]);
  }
  // the andon: a box on the roof, lit all round
  S.with(boxMap(V.andon, [-0.2, 1.5, -0.4, 0.2, 1.62, -0.08]), 0, () => S.box(-0.2, 1.5, -0.4, 0.2, 1.62, -0.08, { bevel: 0.01, skip: ['ny'] }));
  // 空車 standing on the dash behind the glass (read from outside), its back to the cab
  q(S, V.kusha, [[0.62, 0.88, 0.84], [0.32, 0.88, 0.84], [0.32, 1.03, 0.84], [0.62, 1.03, 0.84]], [0, 0, 1]);
  q(S, V.kusha, [[0.32, 0.88, 0.838], [0.62, 0.88, 0.838], [0.62, 1.03, 0.838], [0.32, 1.03, 0.838]], [0, 0, -1]);
  const mats = vehicleMaterials(A);
  PARTS = {
    body, glass: GL.build(), door, doorGlass, mats,
    wheelL: wheelGeometry(V.wheel, { r: WR, w: 0.185, rim: 0.18, side: 1 }), wheelR: wheelGeometry(V.wheel, { r: WR, w: 0.185, rim: 0.18, side: -1 }),
    lit: { heads: H.build(), brakes: Bk.build(), signs: S.build() },
  };
  return PARTS;
}
