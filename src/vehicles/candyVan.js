// Gen-san's FREE CANDY van: a battered 1980s one-box panel van (3.68 x 1.6 x 1.84 m), cream with a faded red waist
// stripe and pinstripe, chrome bumpers and grille, round headlights in square chrome bezels, a solid load side with
// FREE CANDY sign-painted down it (he bought it from a sweets wholesaler and never repainted it), a sliding door on the
// kerb side, a top-hinged rear hatch, a replacement passenger door a shade off, rust, a roof rack with a spare tyre
// and a box, steel wheels with chrome dog-dish hubcaps, a green commercial plate. Low-poly with one pixel atlas.
// Built facing +z (the vehicles' convention) and turned to face +x for the market's courier (src/market/van.js).
//   candyVanParts() -> { body, glass, door, doorGlass, hatch, hatchGlass, wheelR, wheelL, mats, dims } (shared, cached)
import * as THREE from 'three';
import { Atlas, ROUGH } from './atlas.js';
import { Geo, triplanar, boxMap } from './geom.js';
import { shell, slab } from './shell.js';
import { ramp, mix, seamLoop, seal, glassPane, rust, dent, lamp, plate, grow, seeded } from './paint.js';
import { wheelPatches, wheelGeometry, doorMirror, wiper, rods, vehicleMaterials } from './parts.js';
import { mask5, textW5 } from '../gfx/font5x7.js';

// dimensions (metres, +z forward, -x the driver's side)
const W = 0.795, RND = 0.07, YB = 0.3, WR = 0.29, ARCH = 0.36, AXF = 1.16, AXR = -1.12;
const ZF = 1.8, ZR = -1.8, ROOF = 1.84, BELT = 1.04, WTOP = 1.72;
const WS0 = [1.76, 1.02], WS1 = [1.55, 1.76];
const zWS = (y) => WS0[0] + (y - WS0[1]) * (WS1[0] - WS0[0]) / (WS1[1] - WS0[1]);
const zDoor = (y) => zWS(y) - 0.085, zWin = (y) => zDoor(y) - 0.035;
const T_IN = 0.03, DOOR_T = 0.06;
export const CANDY = { W, ZF, ZR, WR, AXF, AXR, TRACK: 0.68, HINGE_Z: 1.66, DOOR_Z0: 0.86, HATCH_TOP: 1.79, HATCH_BOT: 0.42, HATCH_X: 0.64, YB };

function arch(zc, n = 9) {
  const out = [];
  for (let k = 0; k <= n; k++) { const a = Math.PI * (1 - k / n); out.push([zc + Math.cos(a) * ARCH, YB + Math.sin(a) * ARCH, 0]); }
  return out;
}
const PROFILE = [
  [ZR, YB, 0], ...arch(AXR), ...arch(AXF),
  [1.79, YB, 1], [ZF, 0.98, 1], [WS0[0], WS0[1], 1], [WS1[0], WS1[1], 1], [1.51, 1.815, 1], [1.44, ROOF, 1],
  [-1.72, ROOF, 1], [-1.785, 1.81, 1], [ZR, 1.74, 1],
];
const E_WS = PROFILE.findIndex((p) => p[0] === WS0[0] && p[1] === WS0[1]);
const E_REAR = PROFILE.length - 1;
const DOOR = [[CANDY.DOOR_Z0, 0.7], [1.66, 0.7], [1.66, 0.95], [zDoor(1.02), 1.02], [zDoor(1.7), 1.7], [zDoor(1.7) - 0.035, 1.755], [CANDY.DOOR_Z0, 1.755]];
function doorWin() {
  const r = 0.035, pts = [];
  for (let k = 0; k <= 2; k++) { const a = Math.PI + (k / 2) * Math.PI / 2; pts.push([0.9 + r + Math.cos(a) * r, BELT + r + Math.sin(a) * r]); }
  pts.push([zWin(BELT), BELT], [zWin(WTOP), WTOP]);
  for (let k = 0; k <= 2; k++) { const a = Math.PI / 2 + (k / 2) * Math.PI / 2; pts.push([0.9 + r + Math.cos(a) * r, WTOP - r + Math.sin(a) * r]); }
  return pts;
}
const WIN_DOOR = doorWin();
const SLIDE = { z0: -0.1, z1: 0.8, y0: 0.34, y1: 1.76 };
const HATCH = [[-CANDY.HATCH_X, CANDY.HATCH_BOT], [CANDY.HATCH_X, CANDY.HATCH_BOT], [CANDY.HATCH_X, CANDY.HATCH_TOP], [-CANDY.HATCH_X, CANDY.HATCH_TOP]];
const HATCH_WIN = [[-0.55, 1.2], [0.55, 1.2], [0.55, 1.7], [-0.55, 1.7]];

const CREAM = 0xeee4cc, CR = ramp(CREAM), ROOFC = mix(CREAM, 0xf6f2e6, 0.4), RR = ramp(ROOFC), DOORC = ramp(mix(CREAM, 0xd8d8c0, 0.45));
const STRIPE = ramp(0xc8302a), TRIM = 0x26282a, RUBBER = 0x1c1e20, CHROME = [0x5a6064, 0xb8c0c4, 0xeef4f4];
const IN = { trim: 0x3a3632, card: 0x5a4a3e, head: 0x8a8070, metal: mix(CREAM, 0x3a3830, 0.5), floor: 0x3a3836, dash: 0x2a2826 };

/** Sign-writer letters: the 5 x 7 font at scale s, a dark outline, a lighter top (pixels; (i, j) = top-left). */
function signText(V, str, i, j, s, col, out, hi) {
  const set = new Set(), m = mask5(str);
  for (const [x, y] of m) for (let a = 0; a < s; a++) for (let b = 0; b < s; b++) set.add(`${i + x * s + a},${j - y * s - b}`);
  for (const k of set) { const [x, y] = k.split(',').map(Number); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [2, -2], [1, -2]]) if (!set.has(`${x + dx},${y + dy}`)) V.px(x + dx, y + dy, out); }
  for (const k of set) { const [x, y] = k.split(',').map(Number); V.px(x, y, (j - y) % (7 * s) < s ? hi : col); }
  return textW5(str, s);
}

function paintAtlas() {
  const A = new Atlas(1024, 1024);
  const V = {
    L: A.view('ext:+x', { u: (p) => -p[2], v: (p) => p[1], u0: -1.9, u1: 1.9, v0: 0.12, v1: 1.88 }),
    R: A.view('ext:-x', { u: (p) => p[2], v: (p) => p[1], u0: -1.9, u1: 1.9, v0: 0.12, v1: 1.88 }),
    F: A.view('ext:+z', { u: (p) => p[0], v: (p) => p[1], u0: -0.82, u1: 0.82, v0: 0.12, v1: 1.88 }),
    B: A.view('ext:-z', { u: (p) => -p[0], v: (p) => p[1], u0: -0.82, u1: 0.82, v0: 0.12, v1: 1.88 }),
    T: A.view('ext:+y', { u: (p) => p[0], v: (p) => p[2], u0: -0.82, u1: 0.82, v0: -1.9, v1: 1.9 }),
    IR: A.view('in:+x', { u: (p) => p[2], v: (p) => p[1], u0: -1.86, u1: 1.86, v0: 0.28, v1: 1.86 }),
    IL: A.view('in:-x', { u: (p) => p[2], v: (p) => p[1], u0: -1.86, u1: 1.86, v0: 0.28, v1: 1.86 }),
    IF: A.view('in:+y', { u: (p) => p[0], v: (p) => p[2], u0: -0.8, u1: 0.8, v0: -1.86, v1: 1.86, ppm: 60 }),
    IH: A.view('in:-y', { u: (p) => p[0], v: (p) => p[2], u0: -0.8, u1: 0.8, v0: -1.86, v1: 1.86, ppm: 60 }),
    IB: A.view('in:+z', { u: (p) => p[0], v: (p) => p[1], u0: -0.8, u1: 0.8, v0: 0.28, v1: 1.86, ppm: 60 }),
    IFr: A.view('in:-z', { u: (p) => -p[0], v: (p) => p[1], u0: -0.8, u1: 0.8, v0: 0.28, v1: 1.86, ppm: 60 }),
  };
  V.wheel = wheelPatches(A, { name: 'cw', steel: 0xd8d4c8, cap: 0.42, holes: 0, text: false });
  V.plate = A.patch('plate', 66, 33); plate(V.plate, { top: 'MORIO 400', num: '12-34', kana: 'sa', bg: 0x2a6a3a, ink: 0xf2f2e8, frame: 0x1a3a22 });
  V.lit = A.patch('lit', 16, 16); for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) { const d = Math.hypot(i - 7.5, j - 7.5); V.lit.px(i, j, d < 3 ? 0xffffff : d < 6 ? 0xfff8e0 : 0xffe8b0); }
  V.box = A.patch('box', 32, 24); V.box.A.ink(ROUGH.matte); V.box.box(0, 0, 32, 24, (i, j) => (j % 6 === 0 ? 0xb88a52 : 0xc89a60)); V.box.rect(0, 10, 32, 14, 0xd8c890);
  V.jar = A.patch('jar', 12, 16); paintJar(V.jar);
  paintSide(V.L, 1); paintSide(V.R, -1); paintFront(V.F); paintRear(V.B); paintRoof(V.T); paintInside(V);
  return { A, V };
}

function paintSide(S, sx) {
  const A = S.A, U = (z) => (sx > 0 ? -z : z), I = (z) => S.i(U(z)), J = (y) => S.j(y), P = (pts) => pts.map(([z, y]) => [U(z), y]);
  A.ink(ROUGH.paint);
  S.box(0, 0, S.W, S.H, (i, j) => { const y = S.o.v0 + (j + 0.5) / S.ppm; return y > 1.765 ? CR[3] : y < 0.37 ? (y < 0.32 ? CR[0] : CR[1]) : CR[2]; });
  // the replacement passenger door, a shade off
  if (sx > 0) S.poly(P(DOOR), DOORC[2]);
  // the red waist stripe and its pinstripe
  A.ink(ROUGH.paint);
  S.rect(-1.9, 0.5, 1.9, 0.56, STRIPE[2]); S.hline(0, S.W, J(0.56) - 1, STRIPE[3]); S.hline(0, S.W, J(0.5), STRIPE[1]);
  S.hline(0, S.W, J(0.585), STRIPE[2]);
  S.hline(0, S.W, J(1.79), CR[4]);
  // arches with their lips
  for (const zc of [AXR, AXF]) {
    for (let j = J(YB); j < J(YB + ARCH + 0.05); j++) for (let i = I(zc) - 50; i <= I(zc) + 50; i++) {
      const z = sx > 0 ? -(S.o.u0 + (i + 0.5) / S.ppm) : S.o.u0 + (i + 0.5) / S.ppm, y = S.o.v0 + (j + 0.5) / S.ppm, r = Math.hypot(z - zc, y - YB);
      if (r < ARCH) continue;
      if (r < ARCH + 0.012) S.px(i, j, CR[0]); else if (r < ARCH + 0.024) S.px(i, j, CR[1]); else if (r < ARCH + 0.034 && y > YB + 0.12) S.px(i, j, CR[3]);
    }
  }
  // seams: the front doors, the sliding door (kerb side) and its rail, the fuel lid (driver's side)
  seamLoop(S, P(grow(DOOR, 0.002)), CR[0], CR[3], sx > 0 ? -1 : 1, -1);
  if (sx > 0) {
    seamLoop(S, P([[SLIDE.z0, SLIDE.y0], [SLIDE.z1, SLIDE.y0], [SLIDE.z1, SLIDE.y1], [SLIDE.z0, SLIDE.y1]]), CR[0], CR[3], -1, -1);
    S.hline(I(SLIDE.z0), I(-1.2), J(1.0), CR[0]); S.hline(I(SLIDE.z0), I(-1.2), J(1.01), CR[4]);
  } else {
    seamLoop(S, P([[-0.95, 0.68], [-0.82, 0.68], [-0.82, 0.8], [-0.95, 0.8]]), CR[0], CR[3], 1, -1);
  }
  // the windows: the cab doors only (a panel van)
  glassPane(S, P(WIN_DOOR), { seed: sx > 0 ? 2 : 5, alpha: 120 }); seal(S, P(WIN_DOOR), RUBBER, 2);
  // chrome door handles' pockets, a side marker
  S.rect(U(0.92), 0.935, U(1.04), 0.95, CR[0]);
  A.ink(ROUGH.lens); S.rect(U(1.62), 0.5, U(1.72), 0.535, 0xf09a2a); A.ink(ROUGH.paint);
  // bumper ends (chrome) and lamp wraps
  A.ink(ROUGH.chrome);
  for (const [za, zb] of [[1.76, 1.86], [-1.86, -1.76]]) { S.rect(U(za), 0.26, U(zb), 0.42, CHROME[1]); S.rect(U(za), 0.4, U(zb), 0.42, CHROME[2]); S.rect(U(za), 0.26, U(zb), 0.28, CHROME[0]); }
  A.ink(ROUGH.lens);
  for (const [y0, y1, c] of [[0.74, 0.86, 0xc82a28], [0.62, 0.74, 0xf09a2a], [0.5, 0.62, 0xc82a28]]) S.rect(U(-1.86), y0, U(-1.8), y1, c);
  A.ink(ROUGH.paint);
  // FREE CANDY, sign-painted on the load side, with a lollipop and two wrapped sweets; GEN'S LANE EXPRESS under it
  const left = sx > 0 ? I(0.62) : I(-1.62), top = J(1.64);
  A.ink(ROUGH.paint);
  signText(S, 'FREE', left + 4, top, 5, 0xff5a8a, 0x5a1a2a, 0xffa0bc);
  signText(S, 'CANDY', left + 4, top - 42, 5, 0xe8302a, 0x5a1a2a, 0xff7a5a);
  // the lollipop (a swirl of pink and cream, a stick)
  const lx = left + 160, ly = top - 18;
  for (let y = -13; y <= 13; y++) for (let x = -13; x <= 13; x++) { const d = Math.hypot(x, y); if (d > 13.4) continue; const a = Math.atan2(y, x) + d * 0.32; S.px(lx + x, ly + y, d > 12.2 ? 0x5a1a2a : Math.floor((a / Math.PI) * 3 + 6) % 2 ? 0xff5a8a : 0xfff4e0); }
  S.box(lx - 1, ly - 50, lx + 2, ly - 13, 0xf4ead6); S.vline(lx + 1, ly - 50, ly - 14, 0xc8bca6);
  const sweet = (x, y, c) => { S.box(x + 3, y - 5, x + 10, y, c); S.px(x + 4, y - 2, 0xffffff); S.px(x + 5, y - 2, 0xffffff); for (const dx of [0, 1, 2]) { S.vline(x + dx, y - 4 + dx, y - 1 - dx + 1, c); S.vline(x + 12 - dx, y - 4 + dx, y - 1 - dx + 1, c); } };
  sweet(lx - 30, ly - 38, 0x58c06c); sweet(lx + 12, ly - 44, 0xffd23f);
  S.text5("GEN'S LANE EXPRESS", left + 6, top - 86, 0x2a3a6a);
  S.text5('TEL 03-3814-1979', left + 6, top - 96, 0x2a3a6a);
  // chips in the lettering, twenty years on the lane
  const r = seeded(sx > 0 ? 31 : 37);
  for (let k = 0; k < 18; k++) { const i = left + Math.floor(r() * 150), j = top - Math.floor(r() * 80); const c = S.get(i, j); if (c !== CR[2]) S.px(i, j, mix(c, CR[2], 0.7)); }
  // rust: arches, sills, the bottom of the doors; a dent in the load side
  for (const [zc, a] of [[AXR, 0.6], [AXR, 2.3], [AXF, 2.0]]) rust(S, I(zc + Math.cos(a) * (ARCH + 0.025)), J(YB + Math.sin(a) * (ARCH + 0.025)) - 3, 8, 4, Math.round(r() * 999));
  for (const z of [-1.55, 0.4]) rust(S, I(z), J(YB) + 1, 10, 3, Math.round(r() * 999));
  rust(S, I(1.2), J(0.7) + 1, 7, 2, 55);
  dent(S, I(-0.55), J(0.62), 10, 6, CR);
  S.hline(0, S.W, J(1.775), CR[1]);
}
function paintFront(F) {
  const A = F.A, I = (x) => F.i(x), J = (y) => F.j(y);
  A.ink(ROUGH.paint);
  F.box(0, 0, F.W, F.H, (i, j) => { const y = F.o.v0 + (j + 0.5) / F.ppm; return y > 0.96 ? CR[3] : CR[2]; });
  F.rect(-0.82, 0.86, 0.82, 0.9, STRIPE[2]); F.hline(0, F.W, J(0.9) - 1, STRIPE[3]);
  A.ink(ROUGH.plastic); F.rect(-0.82, 0.98, 0.82, 1.025, TRIM);
  const ws = [[-(W - RND - 0.008), zToY(0.025)], [W - RND - 0.008, zToY(0.025)], [W - RND - 0.008, zToY(0.975)], [-(W - RND - 0.008), zToY(0.975)]];
  glassPane(F, ws, { seed: 4, alpha: 108, slope: 0.5 }); seal(F, ws, RUBBER, 2);
  // the chrome grille, round headlights in square chrome bezels, amber lamps under them
  A.ink(ROUGH.chrome);
  F.rect(-0.46, 0.56, 0.46, 0.78, CHROME[0]);
  for (let y = 0.575; y < 0.77; y += 0.03) { F.rect(-0.44, y, 0.44, y + 0.012, CHROME[1]); F.hline(I(-0.44), I(0.44) - 1, J(y + 0.012) - 1, CHROME[2]); }
  F.rect(-0.06, 0.64, 0.06, 0.7, 0x1a1a1a); F.text5('GEN', I(0), J(0.69), CHROME[2], { align: 'center' });
  for (const s of [-1, 1]) {
    const cx = s * 0.6, cy = 0.67;
    F.rect(cx - 0.12, cy - 0.12, cx + 0.12, cy + 0.12, CHROME[1]); F.frame(I(cx - 0.12), J(cy - 0.12), I(cx + 0.12), J(cy + 0.12), CHROME[0]); F.hline(I(cx - 0.12), I(cx + 0.12) - 1, J(cy + 0.12) - 1, CHROME[2]);
    A.ink(ROUGH.lens);
    F.disc(I(cx), J(cy), 9.5, (i, j) => { const d = Math.hypot(i + 0.5 - I(cx), j + 0.5 - J(cy)); return d > 8.5 ? 0x8a9498 : d < 3 ? 0xffffff : (i + j) % 3 ? 0xdce6e8 : 0xb8c4c8; });
    F.px(I(cx) - 4, J(cy) + 3, 0xffffff); F.px(I(cx) - 3, J(cy) + 4, 0xffffff);
    lamp(F, I(cx - 0.1), J(0.46), I(cx + 0.1), J(0.52), 'amber', { bezel: [0x5a6064, 0xb8c0c4, 0xeef4f4] });
    A.ink(ROUGH.chrome);
  }
  F.box(0, J(0.26), F.W, J(0.42), (i, j) => (j >= J(0.42) - 2 ? CHROME[2] : j <= J(0.27) ? CHROME[0] : (j - J(0.26)) % 5 === 0 ? CHROME[0] : CHROME[1]));
  A.ink(ROUGH.paint);
  rust(F, I(-0.7), J(0.43), 9, 3, 7); rust(F, I(0.66), J(0.43), 6, 2, 8);
}
const zToY = (u) => WS0[1] + (WS1[1] - WS0[1]) * u;
function paintRear(B) {
  const A = B.A, I = (x) => B.i(-x), J = (y) => B.j(y);
  A.ink(ROUGH.paint);
  B.box(0, 0, B.W, B.H, (i, j) => { const y = B.o.v0 + (j + 0.5) / B.ppm; return y > 1.78 ? CR[3] : CR[2]; });
  B.rect(-0.82, 0.86, 0.82, 0.9, STRIPE[2]);
  // the hatch (its own panel, painted here): window, FREE CANDY in small, plate recess and lamp, handle
  const hw = HATCH_WIN.map(([x, y]) => [-x, y]);
  glassPane(B, hw, { seed: 9, alpha: 110 }); seal(B, hw, RUBBER, 2);
  signText(B, 'FREE', I(0.33), J(1.12), 2, 0xff5a8a, 0x5a1a2a, 0xffa0bc);
  signText(B, 'CANDY', I(0.33) + 52, J(1.12), 2, 0xe8302a, 0x5a1a2a, 0xff7a5a);
  B.rect(-0.2, 0.5, 0.2, 0.7, CR[1]); B.frame(I(0.2), J(0.5), I(-0.2), J(0.7), CR[0]);
  A.ink(ROUGH.chrome); B.rect(-0.12, 0.72, 0.12, 0.75, CHROME[1]); B.hline(I(0.12), I(-0.12) - 1, J(0.75) - 1, CHROME[2]);
  // tail lamps on the corners
  for (const s of [-1, 1]) {
    const x0 = s > 0 ? 0.66 : -0.8, x1 = s > 0 ? 0.8 : -0.66, i0 = Math.min(I(x0), I(x1)), i1 = Math.max(I(x0), I(x1));
    A.ink(ROUGH.chrome); B.box(i0 - 1, J(0.49), i1 + 1, J(0.87), CHROME[1]);
    lamp(B, i0, J(0.74), i1, J(0.86), 'red', { bezel: false });
    lamp(B, i0, J(0.62), i1, J(0.74), 'amber', { bezel: false });
    lamp(B, i0, J(0.5), i1, J(0.62), 'red', { bezel: false });
  }
  A.ink(ROUGH.chrome);
  B.box(0, J(0.26), B.W, J(0.42), (i, j) => (j >= J(0.42) - 2 ? CHROME[2] : j <= J(0.27) ? CHROME[0] : CHROME[1]));
  A.ink(ROUGH.paint);
  rust(B, I(0.3), J(CANDY.HATCH_BOT) + 1, 14, 3, 13); rust(B, I(-0.4), J(CANDY.HATCH_BOT) + 1, 8, 2, 17);
}
function paintRoof(T) {
  T.A.ink(ROUGH.paint);
  T.box(0, 0, T.W, T.H, (i) => (Math.abs(T.o.u0 + (i + 0.5) / T.ppm) > 0.72 ? RR[1] : RR[2]));
  for (let z = -1.6; z < 1.3; z += 0.22) { T.hline(T.i(-0.66), T.i(0.66), T.j(z), RR[1]); T.hline(T.i(-0.66), T.i(0.66), T.j(z) + 1, RR[4]); }
  const r = seeded(5);
  for (let k = 0; k < 8; k++) { const i = Math.floor(r() * T.W), j = Math.floor(r() * T.H); T.px(i, j, 0x8a4a26); T.px(i + 1, j, 0xa86a3a); }
}
function paintInside(V) {
  const A = V.IR.A;
  A.ink(ROUGH.plastic);
  for (const S of [V.IR, V.IL]) {
    S.box(0, 0, S.W, S.H, (i, j) => { const y = S.o.v0 + (j + 0.5) / S.ppm; return y < 0.5 ? mix(IN.metal, 0x101010, 0.3) : IN.metal; });
    for (let z = -1.7; z < 0.7; z += 0.4) { S.rect(z, 0.55, z + 0.3, 1.5, mix(IN.metal, 0x101214, 0.15)); S.frame(S.i(z), S.j(0.55), S.i(z + 0.3), S.j(1.5), mix(IN.metal, 0xffffff, 0.12)); }
    S.rect(0.75, 0.28, 1.86, 1.86, IN.trim); S.rect(0.9, 0.7, 1.7, 1.02, IN.card); S.hline(S.i(0.9), S.i(1.7), S.j(1.02), mix(IN.card, 0xffffff, 0.2));
    seal(S, WIN_DOOR, 0x141516, 1);
  }
  V.IF.fill(IN.floor); for (let j = 0; j < V.IF.H; j += 4) V.IF.hline(0, V.IF.W, j, mix(IN.floor, 0x000000, 0.3));
  V.IF.rect(-0.8, 1.45, 0.8, 1.86, IN.dash);
  V.IH.fill(IN.head); V.IB.fill(IN.metal); V.IB.rect(-0.8, 1.76, 0.8, 1.86, IN.head);
  V.IFr.fill(IN.trim); V.IFr.rect(-0.8, 0.75, 0.8, 1.02, IN.dash);
  for (let x = -0.5; x < -0.1; x += 0.05) V.IFr.rect(-x, 0.9, -x - 0.03, 0.95, 0x141414);
}
function paintJar(P) {
  P.A.ink(ROUGH.glass);
  P.fill(0xdce8ec);
  const c = [0xff5a8a, 0xffd23f, 0x58c06c, 0xe8302a, 0x6a9ae8];
  for (let j = 1; j < 11; j++) for (let i = 1; i < 11; i++) if ((i * 3 + j * 5) % 4) P.px(i, j, c[(i * 7 + j * 3) % 5]);
  P.rect(0, 12, 12, 16, 0xe8402a); P.hline(0, 11, 15, 0xff7a5a);
}

let PARTS = null;
/** The candy van's geometries and materials (built once, shared). Built facing +z. */
export function candyVanParts() {
  if (PARTS) return PARTS;
  const { A, V } = paintAtlas();
  const ext = triplanar({ px: V.L, nx: V.R, py: V.T, pz: V.F, nz: V.B }, A.swatch(0x18191a, ROUGH.matte));
  const inn = triplanar({ px: V.IR, nx: V.IL, py: V.IF, ny: V.IH, pz: V.IB, nz: V.IFr });
  const sw = (c, r = ROUGH.plastic) => A.swatch(c, r);
  const under = sw(0x16171a, ROUGH.matte), rubber = sw(RUBBER, ROUGH.rubber), jamb = sw(CR[1], ROUGH.paint);
  const G = new Geo(1), GL = new Geo(1);
  const hTop = (1.74 - CANDY.HATCH_TOP), hBot = (1.74 - CANDY.HATCH_BOT);
  shell(G, {
    pts: PROFILE, W, R: RND, K: 2, uv: ext,
    sideHoles: {
      pos: [{ pts: WIN_DOOR, glass: true, wall: rubber }],
      neg: [{ pts: grow(DOOR, 0.004), wall: jamb }],
    },
    bandHoles: [
      { e: E_WS, u0: 0.025, u1: 0.975, hx: W - RND - 0.008 },
      { e: E_REAR, u0: Math.max(0.005, hTop / (1.74 - YB)), u1: hBot / (1.74 - YB), hx: CANDY.HATCH_X + 0.004, glass: false, wall: jamb },
    ],
    bandUv: (e) => (PROFILE[e][2] === 0 ? under : null),
    wallUv: rubber, glassUv: ext, glassGeo: GL,
    inner: { t: T_IN, uv: inn },
  });
  // bumpers (chrome, painted in the views), lamp housings, the grille, plates
  G.with(ext, 0, () => {
    G.box(-W - 0.005, 0.26, 1.76, W + 0.005, 0.42, 1.86, { bevel: 0.03 });
    G.box(-W - 0.005, 0.26, -1.86, W + 0.005, 0.42, -1.76, { bevel: 0.03 });
    G.box(-0.47, 0.55, ZF - 0.01, 0.47, 0.79, ZF + 0.012, { bevel: 0.006 });
    for (const s of [-1, 1]) {
      G.box(s * 0.6 - 0.125, 0.545, ZF - 0.01, s * 0.6 + 0.125, 0.795, ZF + 0.02, { bevel: 0.01 });
      G.box(s * 0.6 - 0.105, 0.455, ZF - 0.01, s * 0.6 + 0.105, 0.525, ZF + 0.012, { bevel: 0.005 });
      G.box(s > 0 ? 0.655 : -0.805, 0.485, ZR - 0.02, s > 0 ? 0.805 : -0.655, 0.875, ZR + 0.03, { bevel: 0.01 });
    }
  });
  const pl = (z, y) => G.with(boxMap(V.plate, [-0.165, y, z - 0.004, 0.165, y + 0.165, z + 0.004]), 0, () => G.box(-0.165, y, z - 0.004, 0.165, y + 0.165, z + 0.004));
  pl(1.865, 0.255);
  // handles, mirrors (fender mirrors on long stalks, very 80s), wipers, drip rails
  G.with(sw(CHROME[1], ROUGH.chrome), 0, () => {
    G.box(W, 0.93, 0.92, W + 0.014, 0.955, 1.04, { bevel: 0.004 });
    G.box(W, 0.93, 0.68, W + 0.014, 0.955, 0.78, { bevel: 0.004 });
    for (const s of [-1, 1]) {
      G.strut([s * 0.72, 0.99, 1.62], [s * 0.78, 1.18, 1.66], 0.008, { round: 4 });
      G.box(s * 0.78 - 0.045, 1.15, 1.63, s * 0.78 + 0.045, 1.24, 1.68, { bevel: 0.015 });
    }
  });
  G.with(sw(0x9ab0bc, ROUGH.glass), 0, () => { for (const s of [-1, 1]) G.quad([s * 0.78 - 0.04, 1.155, 1.629], [s * 0.78 + 0.04, 1.155, 1.629], [s * 0.78 + 0.04, 1.235, 1.629], [s * 0.78 - 0.04, 1.235, 1.629], [0, 0, -1]); });
  const up = [0, (WS1[1] - WS0[1]), (WS1[0] - WS0[0])], ul = Math.hypot(up[1], up[2]), u = [0, up[1] / ul, up[2] / ul], out = [0, -u[2], u[1]];
  for (const px of [-0.56, 0.06]) { const y = WS0[1] + 0.03, d = [0.985, 0.17 * u[1], 0.17 * u[2]], l = Math.hypot(...d); wiper(G, [px, y, zWS(y) + 0.012], d.map((v) => v / l), 0.48, 0.42, out, sw(0x161618)); }
  G.with(sw(CR[1], ROUGH.paint), 0, () => { for (const s of [-1, 1]) G.box(s * W - 0.006, 1.775, -1.72, s * W + 0.006, 1.79, 1.46); });
  // roof rack: rails, bars, a spare tyre, a box strapped down
  G.with(sw(0xb8bcc0, ROUGH.chrome), 0, () => {
    for (const s of [-1, 1]) { for (const z of [-1.55, -0.6, 0.4, 1.3]) G.strut([s * (W - 0.01), 1.79, z], [s * 0.68, 1.92, z], 0.012); rods(G, [[s * 0.68, 1.92, -1.6], [s * 0.68, 1.92, 1.35]], 0.014, 6); }
    for (const z of [-1.55, -0.6, 0.4, 1.3]) rods(G, [[-0.68, 1.925, z], [0.68, 1.925, z]], 0.012, 4);
  });
  G.with(boxMap(V.box, [-0.62, 1.935, -1.5, -0.05, 2.17, -0.82]), 0, () => G.box(-0.62, 1.935, -1.5, -0.05, 2.17, -0.82, { bevel: 0.01 }));
  G.with(sw(0x3a2a20, ROUGH.fabric), 0, () => { G.box(-0.64, 1.94, -1.18, -0.03, 2.18, -1.14); });
  const spare = wheelGeometry(V.wheel, { r: 0.27, w: 0.15, rim: 0.17, side: 1, segs: 14 });
  const sm = new THREE.Matrix4().makeRotationZ(Math.PI / 2).setPosition(0.3, 2.01, 0.1);
  // the running gear
  G.with(sw(0x18191a, ROUGH.metal), 0, () => {
    G.strut([-0.62, WR, AXR], [0.62, WR, AXR], 0.045, { round: 6 });
    G.box(-0.55, WR - 0.03, AXF - 0.07, 0.55, WR + 0.03, AXF + 0.07);
    G.box(-0.45, 0.15, -0.5, 0.3, 0.3, 0.4, { bevel: 0.03 });
  });
  G.with(sw(0x5a5048, ROUGH.metal), 0, () => G.strut([-0.45, 0.18, -0.9], [-0.45, 0.18, -1.86], 0.025, { round: 6 }));
  // the cab: a vinyl bench, the dash with a jar of candy on it, the wheel, the floors
  G.with(inn, 0, () => {
    G.box(-W + T_IN, 0.33, -1.77, W - T_IN, 0.36, 0.7, { skip: ['ny'] });
    G.box(-W + T_IN, 0.45, 0.7, W - T_IN, 0.66, 1.1, { skip: ['ny'] });
    G.box(-W + T_IN, 0.43, 1.1, W - T_IN, 0.45, 1.77, { skip: ['ny'] });
    G.box(-W + T_IN, 0.76, 1.48, W - T_IN, 1.02, 1.74, { bevel: 0.012 });
    G.box(-W + T_IN, 0.36, 0.66, W - T_IN, 1.5, 0.7); // bulkhead behind the bench
  });
  G.with(sw(0x6a3a2a, ROUGH.plastic), 0, () => {
    G.box(-0.74, 0.66, 0.72, 0.74, 0.76, 1.15, { bevel: 0.03 });
    G.push(new THREE.Matrix4().makeRotationX(-0.14).setPosition(0, 0.74, 0.78));
    G.box(-0.74, 0.0, -0.06, 0.74, 0.62, 0.05, { bevel: 0.035 });
    G.pop();
  });
  G.with(sw(0x1c1c1e, ROUGH.plastic), 0, () => {
    G.push(new THREE.Matrix4().compose(new THREE.Vector3(-0.38, 1.13, 1.38), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.95, 0, 0)), new THREE.Vector3(1, 1, 1)));
    G.torus(0.19, 0.014, 22, 4);
    G.strut([-0.18, 0, 0], [0.18, 0, 0], 0.012);
    G.cyl('z', [0, 0, 0], 0.035, 0.4, 6);
    G.pop();
    G.box(-0.6, 1.0, 1.5, -0.16, 1.12, 1.62, { bevel: 0.01 });
  });
  G.with(boxMap(V.jar, [0.3, 1.02, 1.56, 0.42, 1.18, 1.68]), 0, () => G.cyl('y', [0.36, 1.02, 1.62], 0.06, 0.16, 8));
  const body = G.build();
  // the spare tyre on the rack (its own wheel geometry merged in)
  spare.applyMatrix4(sm);
  // ---- the driver's door (body space, closed), moved so the hinge is the origin
  const D = new Geo(1), DG = new Geo(1);
  slab(D, DOOR, [WIN_DOOR], -W, -(W - DOOR_T), { uvOut: ext, uvIn: inn, uvEdge: jamb, uvHole: rubber });
  DG.with(ext, 0, () => DG.polyHoles(WIN_DOOR, [], (z, y) => [-(W - 0.014), y, z], [-1, 0, 0]));
  D.with(sw(CHROME[1], ROUGH.chrome), 0, () => D.box(-W - 0.014, 0.93, 0.92, -W, 0.955, 1.04, { bevel: 0.004 }));
  // ---- the rear hatch (body space, shut), moved so its top hinge is the origin
  const H = new Geo(1), HG = new Geo(1);
  slab(H, HATCH, [HATCH_WIN], ZR - 0.002, ZR + 0.045, { axis: 'z', uvOut: ext, uvIn: inn, uvEdge: jamb, uvHole: rubber });
  HG.with(ext, 0, () => HG.polyHoles(HATCH_WIN, [], (x, y) => [x, y, ZR + 0.012], [0, 0, -1]));
  H.with(sw(CHROME[1], ROUGH.chrome), 0, () => H.box(-0.12, 0.72, ZR - 0.016, 0.12, 0.75, ZR - 0.002, { bevel: 0.006 }));
  const hp = (z, y) => H.with(boxMap(V.plate, [-0.165, y, z - 0.004, 0.165, y + 0.165, z + 0.004]), 0, () => H.box(-0.165, y, z - 0.004, 0.165, y + 0.165, z + 0.004));
  hp(ZR - 0.008, 0.52);
  // lit lamps (headlights) when the van's lights are on: not used on the lane by day
  const mats = vehicleMaterials(A);
  const wheelR = wheelGeometry(V.wheel, { r: WR, w: 0.165, rim: 0.165, side: -1 });
  const wheelL = wheelGeometry(V.wheel, { r: WR, w: 0.165, rim: 0.165, side: 1 });
  PARTS = { A, V, body, spare, glass: GL.build(), door: D.build(), doorGlass: DG.build(), hatch: H.build(), hatchGlass: HG.build(), wheelL, wheelR, mats };
  return PARTS;
}
