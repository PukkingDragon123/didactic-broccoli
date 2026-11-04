// Your van: Grandpa's old cab-over kei box van (right-hand drive, 3.39 x 1.48 x 1.88 m, spring 1999), low-poly with
// one hand-painted pixel atlas (src/vehicles/): pale mint paint gone chalky on the roof, panel seams, rubber window
// seals, drip rails, black resin bumpers, rectangular headlights with their reflectors, amber corner lamps, tall tail
// clusters, door mirrors on stalks and a little under-mirror on the left corner, wipers, a fuel lid, mud flaps, steel
// wheels with hubcaps on 145R12s, rust round the arches and a couple of dents, yellow kei plates, the momiji mark on
// the hatch, the faded "Gacha Garage" decal down both sides, and a roof rack with a tarp bundle and a ladder.
// Windows are real glass (you see the cab and the boxes in the back through them). The body (exterior and interior)
// is one mesh, the glass another; the four wheels, the driver's door, the steering wheel, the dial, its needle and the
// omamori move on their own; lamps that are switched on are two unlit meshes shown and hidden.
// It drives in during the intro (you drive it yourself: src/drive/) and then stays parked across the lane from the garage.
//   van.root (Group, faces +z locally)   van.setPose(x, z, heading)   van.roll(dist)   van.setDoor(k 0..1)
//   van.setLights(on)  van.setBrake(on)   van.eye(out) driver's eye (world)   van.doorStep(out) where you stand once out
//   van.park() (obstacle + physics + door click)
// The cab, for driving it from the inside: a thin two-spoke wheel on a steep cab-over column (indicator and wiper
// stalks, the key on its ring), the binnacle (speedometer with its needle, fuel and temperature gauges, warning lamps,
// the odometer), vents, the radio-cassette, heater sliders, the ashtray and the glovebox; wooden-bead seat covers and
// lace on the headrests, sun visors, door cards with window cranks, the rear-view mirror with Grandpa's 交通安全
// omamori swinging on its cord, a daruma and his photo on the dash.
//   van.place(x, y, z, heading, slope)   van.lean(pitch, roll, bounce)   van.steer(wheelAngle, steeringWheelTurn)
//   van.gauge(kmh)   van.lamps({ hand, beam, radio })   van.swing(dt, ax, az) (the charm, from the cab's acceleration)
//   van.cabGlass(clear) (near-clear windows while you sit inside)   van.cab = { wheel, spin, needle, charm, ... }
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { ease } from '../core/util.js';
import { vanDecalPix } from './art.js';
import { mask5, textW5 } from '../gfx/font5x7.js';
import { Atlas, ROUGH } from '../vehicles/atlas.js';
import { Geo, triplanar, boxMap } from '../vehicles/geom.js';
import { shell, slab } from '../vehicles/shell.js';
import { ramp, mix, seamLoop, seal, glassPane, rust, dent, lamp, lampLit, plate, grow, seeded } from '../vehicles/paint.js';
import { wheelPatches, wheelGeometry, doorMirror, wiper, rods, vehicleMaterials } from '../vehicles/parts.js';

export const PARK = { x: 3.4, z: 12.5, heading: -Math.PI / 2 }; // across the lane from the shutter, nose pointing west

// ------------------------------------------------------------------ dimensions (van-local metres, +z forward, -x driver)
const W = 0.7375, RND = 0.05; // half width, edge rounding
const YB = 0.265, WR = 0.265, AX = 1.08, ARCH = 0.335; // sill, wheel radius, axles at +-AX, arch radius
const ZF = 1.665, ZR = -1.665, ROOF = 1.875;
const BELT = 1.06, WTOP = 1.74;
const WS0 = [1.635, 1.035], WS1 = [1.43, 1.79]; // the windscreen's base and top (z, y)
const zWS = (y) => WS0[0] + (y - WS0[1]) * (WS1[0] - WS0[0]) / (WS1[1] - WS0[1]);
const zDoor = (y) => zWS(y) - 0.062, zWin = (y) => zDoor(y) - 0.026; // a slim A-pillar: the door 6 cm behind the glass
const TRACK = 0.645; // wheel centres at x = +-TRACK
const T_IN = 0.03; // inner shell offset
const DOOR_T = 0.065; // door thickness

/** Rounded rectangle (counter-clockwise, z right / y up). */
function rrect(z0, y0, z1, y1, r, n = 2) {
  const pts = [];
  for (const [cz, cy, a0] of [[z1 - r, y0 + r, -Math.PI / 2], [z1 - r, y1 - r, 0], [z0 + r, y1 - r, Math.PI / 2], [z0 + r, y0 + r, Math.PI]]) {
    for (let k = 0; k <= n; k++) { const a = a0 + (k / n) * Math.PI / 2; pts.push([cz + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  }
  return pts;
}
function arch(zc, n = 9) {
  const out = [];
  for (let k = 0; k <= n; k++) { const a = Math.PI * (1 - k / n); out.push([zc + Math.cos(a) * ARCH, YB + Math.sin(a) * ARCH, 0]); }
  return out;
}
const PROFILE = [
  [ZR, YB, 0], ...arch(-AX), ...arch(AX),
  [1.66, YB, 1], [ZF, 1.0, 1], [WS0[0], WS0[1], 1], [WS1[0], WS1[1], 1], [1.395, 1.848, 1], [1.33, ROOF, 1],
  [-1.6, ROOF, 1], [-1.648, 1.85, 1], [ZR, 1.79, 1],
];
const E_WS = PROFILE.findIndex((p) => p[0] === WS0[0] && p[1] === WS0[1]);
const E_REAR = PROFILE.length - 1;
const REAR_WIN = { y0: 1.07, y1: 1.74, hx: 0.56 };
const WS_HOLE = { u0: 0.025, u1: 0.975, hx: W - RND - 0.006 };
const wsY = (u) => WS0[1] + (WS1[1] - WS0[1]) * u;

// the driver's door (vehicle right = -x) and the windows
const DOOR = [[0.8, 0.66], [1.585, 0.66], [1.585, 0.96], [zDoor(1.035), 1.035], [zDoor(1.75), 1.75], [zDoor(1.75) - 0.035, 1.795], [0.8, 1.795]];
const HINGE_Z = 1.585;
function doorWindow() {
  const r = 0.035, pts = [];
  for (let k = 0; k <= 2; k++) { const a = Math.PI + (k / 2) * Math.PI / 2; pts.push([0.84 + r + Math.cos(a) * r, BELT + r + Math.sin(a) * r]); }
  pts.push([zWin(BELT), BELT], [zWin(WTOP), WTOP]);
  for (let k = 0; k <= 2; k++) { const a = Math.PI / 2 + (k / 2) * Math.PI / 2; pts.push([0.84 + r + Math.cos(a) * r, WTOP - r + Math.sin(a) * r]); }
  return pts;
}
const WIN_DOOR = doorWindow();
const WIN_SLIDE = rrect(-0.12, BELT, 0.68, WTOP, 0.04);
const WIN_QTR = rrect(-1.56, BELT, -0.27, WTOP, 0.045);
const SLIDE = { z0: -0.17, z1: 0.735, y0: 0.3, y1: 1.8 };

// ------------------------------------------------------------------ colours
const PAINT = 0xc6dccd; // pale mint, a little chalky
const PR = ramp(PAINT), ROOFC = mix(PAINT, 0xf0f0e2, 0.38), RR = ramp(ROOFC);
const TRIM = 0x26282a, RUBBER = 0x1c1e20, RESIN = ramp(0x3c3e40), CHROME = [0x5a6064, 0xb8c0c4, 0xeef4f4];
const IN = { trim: 0x34363a, card: 0x45484e, head: 0x6a6964, dash: 0x2c2a2a, carpet: 0x2a2c30, metal: mix(PAINT, 0x3a4048, 0.45), ply: 0xa88a5e };

// ------------------------------------------------------------------ the atlas
function paintAtlas() {
  const A = new Atlas(1024, 1024);
  const V = {
    L: A.view('ext:+x', { u: (p) => -p[2], v: (p) => p[1], u0: -1.76, u1: 1.76, v0: 0.12, v1: 1.92 }),
    R: A.view('ext:-x', { u: (p) => p[2], v: (p) => p[1], u0: -1.76, u1: 1.76, v0: 0.12, v1: 1.92 }),
    F: A.view('ext:+z', { u: (p) => p[0], v: (p) => p[1], u0: -0.76, u1: 0.76, v0: 0.12, v1: 1.92 }),
    B: A.view('ext:-z', { u: (p) => -p[0], v: (p) => p[1], u0: -0.76, u1: 0.76, v0: 0.12, v1: 1.92 }),
    T: A.view('ext:+y', { u: (p) => p[0], v: (p) => p[2], u0: -0.76, u1: 0.76, v0: -1.76, v1: 1.76 }),
    IR: A.view('in:+x', { u: (p) => p[2], v: (p) => p[1], u0: -1.72, u1: 1.72, v0: 0.24, v1: 1.9 }),
    IL: A.view('in:-x', { u: (p) => p[2], v: (p) => p[1], u0: -1.72, u1: 1.72, v0: 0.24, v1: 1.9 }),
    IF: A.view('in:+y', { u: (p) => p[0], v: (p) => p[2], u0: -0.74, u1: 0.74, v0: -1.72, v1: 1.72 }),
    IH: A.view('in:-y', { u: (p) => p[0], v: (p) => p[2], u0: -0.74, u1: 0.74, v0: -1.72, v1: 1.72 }),
    IB: A.view('in:+z', { u: (p) => p[0], v: (p) => p[1], u0: -0.74, u1: 0.74, v0: 0.24, v1: 1.9 }),
    IFr: A.view('in:-z', { u: (p) => -p[0], v: (p) => p[1], u0: -0.74, u1: 0.74, v0: 0.24, v1: 1.9 }),
    D: A.view('dash', { u: (p) => -p[0], v: (p) => p[1], u0: -0.72, u1: 0.72, v0: 0.78, v1: 1.24, ppm: 200 }),
  };
  V.wheelL = wheelPatches(A, { name: 'wl', steel: 0xc4c8c4, text: '145R12 6PR' });
  V.plate = A.patch('plate', 66, 33); plate(V.plate, { top: 'MORIO 480', num: '50-71', kana: 'a' });
  V.beads = A.patch('beads', 48, 64); paintBeads(V.beads);
  V.lace = A.patch('lace', 32, 24); paintLace(V.lace);
  V.tarp = A.patch('tarp', 64, 48); paintTarp(V.tarp);
  V.card = A.patch('cardboard', 40, 32); paintCardboard(V.card);
  V.mirror = A.patch('mirror', 48, 14); paintMirror(V.mirror);
  V.charm = A.patch('charm', 10, 14); paintCharm(V.charm);
  V.flap = A.patch('flap', 18, 22); paintFlap(V.flap);
  V.litHead = A.patch('lit:head', 22, 14); lampLit(V.litHead, 0, 0, 22, 14, 'head');
  V.litTail = A.patch('lit:tail', 13, 18); lampLit(V.litTail, 0, 0, 13, 18, 'red');
  V.litAmber = A.patch('lit:amber', 8, 6); lampLit(V.litAmber, 0, 0, 8, 6, 'amber');
  V.photo = A.patch('photo', 12, 16); paintPhoto(V.photo);
  V.dmirror = A.patch('door-mirror', 10, 14); paintDoorMirror(V.dmirror);
  paintSide(V.L, 1); paintSide(V.R, -1);
  paintFront(V.F); paintRear(V.B); paintRoof(V.T);
  paintInside(V);
  paintDash(V.D);
  return { A, V };
}

/** One side of the body, seen from outside (sx = +1: the van's left, -1: the driver's side). */
function paintSide(S, sx) {
  const A = S.A;
  const U = (z) => (sx > 0 ? -z : z), I = (z) => S.i(U(z)), J = (y) => S.j(y);
  const P = (pts) => pts.map(([z, y]) => [U(z), y]);
  A.ink(ROUGH.paint);
  // base paint, the sky on the upper panels, the ground's darkness creeping up the sills
  S.box(0, 0, S.W, S.H, (i, j) => {
    const y = S.o.v0 + (j + 0.5) / S.ppm;
    if (y > 1.79) return PR[3];
    if (y < 0.34) return y < 0.285 ? PR[0] : PR[1];
    return PR[2];
  });
  S.hline(0, S.W, J(0.34), PR[1]);
  S.hline(0, S.W, J(1.808), PR[4]);
  // the pressed character line along the waist
  S.hline(I(1.6), I(-1.64), J(0.985), PR[1]); S.hline(I(1.6), I(-1.64), J(0.995), PR[4]);
  // the B-pillar between the windows, blacked out
  A.ink(ROUGH.plastic);
  S.rect(U(0.70), BELT - 0.01, U(0.835), WTOP + 0.012, TRIM);
  S.rect(U(-0.205), BELT - 0.01, U(-0.16), WTOP + 0.012, TRIM);
  A.ink(ROUGH.paint);
  // wheel arches: the lip turning in, a highlight on the flare
  for (const zc of [-AX, AX]) {
    for (let j = J(YB); j < J(YB + ARCH + 0.05); j++) for (let i = I(zc) - 45; i <= I(zc) + 45; i++) {
      const z = sx > 0 ? -(S.o.u0 + (i + 0.5) / S.ppm) : S.o.u0 + (i + 0.5) / S.ppm, y = S.o.v0 + (j + 0.5) / S.ppm;
      const r = Math.hypot(z - zc, y - YB);
      if (r < ARCH) continue;
      if (r < ARCH + 0.012) S.px(i, j, PR[0]);
      else if (r < ARCH + 0.024) S.px(i, j, PR[1]);
      else if (r < ARCH + 0.034 && y > YB + 0.12) S.px(i, j, PR[3]);
    }
  }
  // seams: the front doors, the sliding door and its rail, the fuel lid (left side)
  seamLoop(S, P(grow(DOOR, 0.002)), PR[0], PR[3], sx > 0 ? -1 : 1, -1);
  const SL = [[SLIDE.z0, SLIDE.y0], [SLIDE.z1, SLIDE.y0], [SLIDE.z1, SLIDE.y1], [SLIDE.z0, SLIDE.y1]];
  seamLoop(S, P(SL), PR[0], PR[3], sx > 0 ? -1 : 1, -1);
  S.hline(I(SLIDE.z0), I(-1.05), J(1.035), PR[0]); S.hline(I(SLIDE.z0), I(-1.05), J(1.025), PR[1]); S.hline(I(SLIDE.z0), I(-1.05), J(1.045), PR[4]);
  // the step below the front door (a black kick plate)
  A.ink(ROUGH.plastic);
  S.rect(U(1.40), 0.31, U(1.58), 0.36, RESIN[1]); S.hline(I(1.40), I(1.58) - (sx > 0 ? -1 : 1), J(0.36), RESIN[3]);
  A.ink(ROUGH.paint);
  if (sx > 0) {
    const FL = rrect(-0.62, 0.72, -0.47, 0.86, 0.02, 1);
    seamLoop(S, P(FL), PR[0], PR[3], -1, -1);
    S.px(I(-0.49), J(0.79), PR[1]); S.px(I(-0.49), J(0.8), PR[0]);
  }
  // red reflectors low on the rear corners
  A.ink(ROUGH.lens); S.rect(U(-1.58), 0.47, U(-1.52), 0.5, 0xc82a28); S.px(I(-1.55), J(0.5) - 1, 0xff8a70); A.ink(ROUGH.paint);
  // the side indicator on the front corner, and the door handles' finger pockets
  A.ink(ROUGH.lens);
  S.rect(U(1.52), 0.52, U(1.6), 0.55, 0xf09a2a); S.hline(I(1.52), I(1.6) - (sx > 0 ? -1 : 1), J(0.55) - 1, 0xffc060);
  A.ink(ROUGH.paint);
  S.rect(U(0.86), 0.97, U(0.97), 0.985, PR[0]);
  S.rect(U(0.6), 0.93, U(0.7), 0.945, PR[0]);
  // windows: glass, rubber
  const wins = [WIN_DOOR, WIN_SLIDE, WIN_QTR];
  for (const [k, w] of wins.entries()) { glassPane(S, P(w), { seed: k * 3 + (sx > 0 ? 1 : 2), alpha: 118 }); seal(S, P(w), RUBBER, 2); }
  // what wraps round from the nose and the tail: bumper ends, the headlight housings, corner lamps, tail clusters
  A.ink(ROUGH.plastic);
  for (const [za, zb, y0, y1] of [[1.616, 1.72, 0.24, 0.44], [-1.72, -1.616, 0.25, 0.43]]) {
    S.rect(U(za), y0, U(zb), y1, RESIN[2]); S.rect(U(za), y1 - 0.01, U(zb), y1, RESIN[3]); S.rect(U(za), y0, U(zb), y0 + 0.01, RESIN[0]);
  }
  S.rect(U(1.666), 0.588, U(1.69), 0.747, TRIM);
  A.ink(ROUGH.lens);
  S.rect(U(1.666), 0.47, U(1.69), 0.535, 0xf09a2a);
  for (const [y0, y1, c] of [[0.77, 0.845, 0xf09a2a], [0.585, 0.77, 0xc82a28], [0.525, 0.585, 0xdcdedc], [0.455, 0.525, 0x9a1a1c]]) S.rect(U(-1.69), y0, U(-1.636), y1, c);
  A.ink(ROUGH.paint);
  // the drip rail's shadow along the roof edge
  S.hline(0, S.W, J(1.818), PR[1]);
  // the decal, faded by twenty summers
  const dp = vanDecalPix(); dp.flush();
  const dz0 = sx > 0 ? 0.12 : -1.48, top = J(1.035);
  for (let y = 0; y < dp.h; y++) for (let x = 0; x < dp.w; x++) {
    const k = (y * dp.w + x) * 4;
    if (dp.d[k + 3] < 128) continue;
    const c = (dp.d[k] << 16) | (dp.d[k + 1] << 8) | dp.d[k + 2];
    const i = (sx > 0 ? I(dz0) : I(dz0)) + x, j = top - y;
    if (i < 0 || i >= S.W) continue;
    S.px(i, j, mix(c, PAINT, 0.3));
  }
  // rust: the arches, the sills, the bottom of the sliding door; and the dents
  const r = seeded(sx > 0 ? 11 : 23);
  for (const [zc, angs] of [[-AX, sx > 0 ? [0.5, 2.3] : [0.7, 2.5]], [AX, sx > 0 ? [2.2] : [0.8]]]) {
    for (const a of angs) {
      const z = zc + Math.cos(a) * (ARCH + 0.024), y = YB + Math.sin(a) * (ARCH + 0.024);
      rust(S, I(z), J(y) - 3, 7 + Math.round(r() * 5), 3 + Math.round(r() * 2), Math.round(r() * 999), { freckles: 1 });
    }
  }
  for (const z of sx > 0 ? [-1.52, 0.42] : [-1.5, 0.2]) rust(S, I(z), J(YB) + 1, 9 + Math.round(r() * 6), 3, Math.round(r() * 999), { freckles: 1 });
  rust(S, I(sx > 0 ? -0.05 : 0.5), J(SLIDE.y0) + 1, 8, 2, 77, { freckles: 1 });
  if (sx > 0) dent(S, I(-1.25), J(0.78), 9, 6, PR);
  else { dent(S, I(1.25), J(0.75), 7, 5, PR); dent(S, I(-0.6), J(0.5), 5, 4, PR); }
  // scuffs along the waist where the boxes went in
  S.hline(I(0.5), I(0.2), J(0.9), PR[3]);
}

function paintFront(F) {
  const A = F.A, J = (y) => F.j(y), I = (x) => F.i(x);
  A.ink(ROUGH.paint);
  F.box(0, 0, F.W, F.H, (i, j) => { const y = F.o.v0 + (j + 0.5) / F.ppm; return y > 0.975 ? PR[3] : y < 0.46 ? PR[1] : PR[2]; });
  // a pressed crease across the nose, the bonnet-less front's only line
  F.hline(0, F.W, J(0.865), PR[1]); F.hline(0, F.W, J(0.875), PR[4]);
  // the cowl: black plastic with intake slots
  A.ink(ROUGH.plastic);
  F.rect(-0.76, 1.0, 0.76, 1.04, TRIM);
  for (let x = -0.6; x <= 0.6; x += 0.04) F.rect(x, 1.008, x + 0.022, 1.03, 0x121314);
  // windscreen and its rubber
  const ws = [[-WS_HOLE.hx, wsY(WS_HOLE.u0)], [WS_HOLE.hx, wsY(WS_HOLE.u0)], [WS_HOLE.hx, wsY(WS_HOLE.u1)], [-WS_HOLE.hx, wsY(WS_HOLE.u1)]];
  glassPane(F, ws, { seed: 5, alpha: 104, slope: 0.5, streak: 0.4 });
  seal(F, ws, RUBBER, 2);
  F.hline(0, F.W, J(1.795), PR[3]); F.hline(0, F.W, J(1.81), PR[4]);
  // headlights (chrome bezel, reflector), amber corner lamps, the grille with a blank badge, the lower intake
  for (const s of [-1, 1]) {
    const x0 = s > 0 ? 0.45 : -0.665, x1 = s > 0 ? 0.665 : -0.45;
    A.ink(ROUGH.plastic); F.rect(x0 - 0.012, 0.588, x1 + 0.012, 0.747, TRIM);
    lamp(F, I(x0), J(0.6), I(x1), J(0.735), 'head');
    const a0 = s > 0 ? 0.5 : -0.665, a1 = s > 0 ? 0.665 : -0.5;
    lamp(F, I(a0), J(0.47), I(a1), J(0.535), 'amber', { bezel: [0x2a2a2a, 0x4a4a4a, 0x6a6a6a] });
  }
  A.ink(ROUGH.plastic);
  F.rect(-0.38, 0.615, 0.38, 0.725, 0x18191a);
  for (let y = 0.63; y < 0.72; y += 0.022) { F.rect(-0.37, y, 0.37, y + 0.008, 0x3a3c3e); F.hline(I(-0.37), I(0.37) - 1, J(y + 0.008), 0x6a6e70); }
  A.ink(ROUGH.chrome);
  F.rect(-0.05, 0.655, 0.05, 0.685, CHROME[1]); F.hline(I(-0.05), I(0.05) - 1, J(0.685) - 1, CHROME[2]); F.hline(I(-0.05), I(0.05) - 1, J(0.655), CHROME[0]);
  A.ink(ROUGH.plastic);
  F.rect(-0.3, 0.47, 0.3, 0.53, 0x18191a);
  for (let x = -0.29; x < 0.29; x += 0.03) F.rect(x, 0.48, x + 0.018, 0.52, 0x2e3032);
  // the bumper (dark resin), its moulded groove
  F.box(0, J(0.24), F.W, J(0.44), (i, j) => (j === J(0.44) - 1 ? RESIN[3] : j <= J(0.25) ? RESIN[0] : j === J(0.33) ? RESIN[0] : j === J(0.33) + 1 ? RESIN[3] : RESIN[2]));
  A.ink(ROUGH.paint);
  // rust at the lower corners, a chip on the nose, and petals
  rust(F, I(-0.62), J(0.445), 8, 3, 5, { freckles: 2 }); rust(F, I(0.6), J(0.445), 6, 2, 9);
  F.px(I(0.2), J(0.86), PR[0]); F.px(I(0.21), J(0.86), PR[1]);
  for (const [x, y] of [[-0.3, 1.01], [0.42, 1.02], [0.1, 1.015]]) { F.px(I(x), J(y), 0xf4b8c8); F.px(I(x) + 1, J(y), 0xe898b0); }
}

function paintRear(B) {
  const A = B.A, I = (x) => B.i(-x), J = (y) => B.j(y);
  const R = (x0, y0, x1, y1, c) => B.rect(-x0, y0, -x1, y1, c);
  A.ink(ROUGH.paint);
  B.box(0, 0, B.W, B.H, (i, j) => { const y = B.o.v0 + (j + 0.5) / B.ppm; return y > 1.8 ? PR[3] : y < 0.45 ? PR[1] : PR[2]; });
  // the hatch: its seam, the window and its rubber, the handle bar, the plate recess and lamp
  seamLoop(B, [[-0.6, 0.445], [0.6, 0.445], [0.6, 1.8], [-0.6, 1.8]], PR[0], PR[3], 0, -1);
  const rw = [[-REAR_WIN.hx, REAR_WIN.y0], [REAR_WIN.hx, REAR_WIN.y0], [REAR_WIN.hx, REAR_WIN.y1], [-REAR_WIN.hx, REAR_WIN.y1]];
  glassPane(B, rw, { seed: 8, alpha: 110, slope: 0.7 });
  seal(B, rw, RUBBER, 2);
  A.ink(ROUGH.plastic);
  R(-0.2, 0.69, 0.2, 0.735, TRIM); B.hline(I(0.2), I(-0.2) - 1, J(0.735) - 1, 0x4a4c4e);
  A.ink(ROUGH.chrome);
  R(-0.06, 0.7, 0.06, 0.718, CHROME[1]); B.hline(I(0.06), I(-0.06) - 1, J(0.718) - 1, CHROME[2]);
  A.ink(ROUGH.paint);
  R(-0.19, 0.49, 0.19, 0.68, PR[1]); B.frame(I(0.19), J(0.49), I(-0.19), J(0.68), PR[0]);
  // tail clusters on the corners: amber, red, white reverse, a red reflector
  for (const s of [-1, 1]) {
    const x0 = s > 0 ? 0.615 : -0.745, x1 = s > 0 ? 0.745 : -0.615;
    const i0 = Math.min(I(x0), I(x1)), i1 = Math.max(I(x0), I(x1));
    A.ink(ROUGH.plastic); B.box(i0 - 1, J(0.455), i1 + 1, J(0.845), 0x1a1a1c);
    lamp(B, i0, J(0.77), i1, J(0.84), 'amber', { bezel: false });
    lamp(B, i0, J(0.585), i1, J(0.765), 'red', { bezel: false });
    lamp(B, i0, J(0.525), i1, J(0.58), 'white', { bezel: false });
    lamp(B, i0, J(0.46), i1, J(0.52), 'red', { bezel: false });
  }
  // the momiji mark (Grandpa's elderly-driver sticker), lower right of the hatch
  const mi = I(-0.42), mj = J(0.63);
  B.sprite(['..yy..', '.oyyy.', 'ooyyyy', 'ooyyyy', 'ooyyyy', '.ooyy.', '.ooyy.', '..oy..', '..oy..', '...y..'], { o: 0xf08a1a, y: 0xf8d82a }, mi, mj);
  // the bumper, a ribbed step pad in the middle
  B.box(0, J(0.25), B.W, J(0.43), (i, j) => (j === J(0.43) - 1 ? RESIN[3] : j <= J(0.26) ? RESIN[0] : RESIN[2]));
  for (let x = -0.18; x < 0.18; x += 0.02) R(x, 0.415, x + 0.01, 0.428, RESIN[1]);
  // rust where the hatch rots first, and along the bottom
  rust(B, I(0.3), J(0.448), 12, 3, 41, { freckles: 3 }); rust(B, I(-0.15), J(0.448), 7, 2, 43);
  rust(B, I(-0.66), J(0.27), 6, 2, 45);
}

function paintRoof(T) {
  const A = T.A, J = (z) => T.j(z), I = (x) => T.i(x);
  A.ink(ROUGH.paint);
  T.box(0, 0, T.W, T.H, (i, j) => { const x = T.o.u0 + (i + 0.5) / T.ppm; return Math.abs(x) > 0.66 ? RR[1] : RR[2]; });
  // pressed ribs across the roof
  for (let z = -1.45; z < 1.2; z += 0.19) { T.hline(I(-0.6), I(0.6), J(z), RR[1]); T.hline(I(-0.6), I(0.6), J(z) + 1, RR[4]); }
  // grime in the gutters, a few sakura petals, a bird dropping (of course)
  for (let j = 0; j < T.H; j += 1) { T.px(I(-0.7), j, RR[0]); T.px(I(0.7), j, RR[0]); }
  const r = seeded(99);
  for (let k = 0; k < 14; k++) { const i = Math.round(r() * T.W), j = Math.round(r() * T.H); T.px(i, j, 0xf4b8c8); if (r() < 0.5) T.px(i + 1, j, 0xe898b0); }
  T.px(I(0.3), J(0.8), 0xf4f4ec); T.px(I(0.31), J(0.8), 0xd8d8cc); T.px(I(0.3), J(0.81), 0xe8e8e0);
}

/** Inside: door cards, trim, the headliner, the floors, the hatch. */
function paintInside(V) {
  const { IR, IL, IF, IH, IB, IFr } = V;
  const A = IR.A;
  for (const S of [IR, IL]) {
    const J = (y) => S.j(y), I = (z) => S.i(z);
    A.ink(ROUGH.plastic);
    // the load space: painted metal with pressed ribs and lightening holes, darker low down
    S.box(0, 0, S.W, S.H, (i, j) => { const y = S.o.v0 + (j + 0.5) / S.ppm; return y < 0.62 ? mix(IN.metal, 0x101214, 0.35) : IN.metal; });
    for (let z = -1.55; z < 0.6; z += 0.36) { S.rect(z, 0.66, z + 0.24, 0.98, mix(IN.metal, 0x101214, 0.18)); S.frame(I(z), J(0.66), I(z + 0.24), J(0.98), mix(IN.metal, 0xffffff, 0.12)); S.disc(I(z + 0.12), J(0.82), 4, mix(IN.metal, 0x000000, 0.55)); }
    S.rect(-1.72, 1.77, 1.72, 1.9, IN.head);
    // the cab: door card (vinyl, a pocket, a speaker grille), trim round the windows, the A-pillar
    S.rect(0.62, 0.24, 1.72, 1.9, IN.trim);
    S.rect(0.8, 0.6, 1.6, 1.04, IN.card);
    S.hline(I(0.8), I(1.6), J(1.04), mix(IN.card, 0xffffff, 0.15));
    S.rect(0.84, 0.64, 1.3, 0.76, mix(IN.card, 0x000000, 0.25)); S.hline(I(0.84), I(1.3), J(0.76), mix(IN.card, 0xffffff, 0.2)); // pocket
    for (let k = 0; k < 4; k++) S.hline(I(1.36), I(1.52), J(0.68) + k * 2, 0x1e1f22); // speaker
    S.hline(I(0.8), I(1.6), J(0.86), mix(IN.card, 0x000000, 0.3)); // the vinyl's stitched seam
    S.rect(1.6, 0.24, 1.72, 1.9, IN.trim);
    S.rect(0.62, 1.77, 1.72, 1.9, IN.head);
    // the door window's inner seal
    seal(S, WIN_DOOR, 0x141516, 1);
  }
  // headliner: vinyl, seams, the dome light; the bare roof over the load
  {
    const S = IH, J = (z) => S.j(z), I = (x) => S.i(x);
    A.ink(ROUGH.fabric);
    S.box(0, 0, S.W, S.H, (i, j) => { const z = S.o.v0 + (j + 0.5) / S.ppm; return z > 0.55 ? (((i + j) % 6 === 0) ? mix(IN.head, 0x000000, 0.08) : IN.head) : mix(IN.metal, 0x000000, 0.1); });
    for (const z of [0.95, 1.3]) S.hline(0, S.W, J(z), mix(IN.head, 0x000000, 0.2));
    for (let z = -1.5; z < 0.5; z += 0.38) { S.hline(0, S.W, J(z), mix(IN.metal, 0x000000, 0.35)); S.hline(0, S.W, J(z) + 1, mix(IN.metal, 0xffffff, 0.15)); }
    A.ink(ROUGH.lens);
    S.rect(-0.09, 0.62, 0.09, 0.7, 0xe8e4d4); S.frame(I(-0.09), J(0.62), I(0.09), J(0.7), 0x8a8a84);
  }
  // floors: the cab's ribbed rubber mat, the dash top over it; the plywood in the back
  {
    const S = IF, J = (z) => S.j(z), I = (x) => S.i(x);
    A.ink(ROUGH.rubber);
    S.box(0, 0, S.W, S.H, (i, j) => { const z = S.o.v0 + (j + 0.5) / S.ppm; return z > 0.62 ? (j % 3 === 0 ? 0x1a1b1d : IN.carpet) : IN.ply; });
    A.ink(ROUGH.matte);
    for (let x = -0.7; x < 0.7; x += 0.16) S.vline(I(x), J(-1.7), J(0.6), mix(IN.ply, 0x000000, 0.35));
    for (const [x, z] of [[-0.5, -1.2], [0.2, -0.4], [-0.1, 0.3], [0.45, -1.4]]) S.px(I(x), J(z), 0x6a5a4a);
    S.rect(-0.74, -0.75 - ARCH, -0.6, -0.75 + 0.3, IN.metal);
    // the dash top: dark plastic, the defroster grille along the glass
    A.ink(ROUGH.plastic);
    S.rect(-0.74, 1.4, 0.74, 1.72, IN.dash);
    for (let x = -0.6; x < 0.6; x += 0.03) S.rect(x, 1.6, x + 0.016, 1.625, 0x141414);
  }
  // the hatch's inner panel, the inner front wall and the windscreen pillars (trim)
  A.ink(ROUGH.plastic);
  IB.fill(IN.metal); IB.rect(-0.55, 0.5, 0.55, 1.0, mix(IN.metal, 0x000000, 0.18)); IB.rect(-0.74, 1.77, 0.74, 1.9, IN.head);
  seal(IB, [[-REAR_WIN.hx, REAR_WIN.y0], [REAR_WIN.hx, REAR_WIN.y0], [REAR_WIN.hx, REAR_WIN.y1], [-REAR_WIN.hx, REAR_WIN.y1]], 0x141516, 1);
  IFr.fill(IN.trim); IFr.rect(-0.74, 1.76, 0.74, 1.9, IN.head);
}

/** The dash's rear face (what you look at): binnacle surround, vents, radio-cassette, heater sliders, glovebox. */
function paintDash(D) {
  const A = D.A, X = (x) => D.i(-x), J = (y) => D.j(y);
  const R = (x0, y0, x1, y1, c) => D.rect(-x0, y0, -x1, y1, c);
  A.ink(ROUGH.plastic);
  const C = ramp(IN.dash);
  D.box(0, 0, D.W, D.H, (i, j) => { const y = D.o.v0 + (j + 0.5) / D.ppm; return y > 1.02 ? C[3] : y < 0.82 ? C[1] : C[2]; });
  D.hline(0, D.W, J(1.032), C[4]);
  // a moulded line along the dash
  D.hline(0, D.W, J(0.97), C[1]); D.hline(0, D.W, J(0.968), C[3]);
  // centre vents: two louvred rectangles; side vents (round-cornered squares)
  const vent = (x0, y0, x1, y1) => {
    R(x0, y0, x1, y1, 0x0e0e10);
    for (let y = y0 + 0.006; y < y1 - 0.003; y += 0.009) R(x0 + 0.004, y, x1 - 0.004, y + 0.004, 0x3a3838);
    D.frame(Math.min(X(x0), X(x1)), J(y0), Math.max(X(x0), X(x1)), J(y1), C[0]);
  };
  vent(-0.11, 0.975, -0.01, 1.02); vent(0.01, 0.975, 0.11, 1.02);
  vent(-0.7, 0.95, -0.62, 1.01); vent(0.62, 0.95, 0.7, 1.01);
  // the radio-cassette (DIN): tuning dial, cassette slot, presets, an LCD
  R(-0.095, 0.905, 0.095, 0.957, 0x161618);
  A.ink(ROUGH.metal);
  R(-0.09, 0.91, 0.09, 0.952, 0x3a3a3c);
  R(-0.06, 0.925, 0.03, 0.94, 0x0c0c0c); D.hline(X(0.03), X(-0.06), J(0.94), 0x5a5a5c); // tape slot
  A.ink(ROUGH.lens);
  R(0.04, 0.93, 0.085, 0.948, 0x2a4a2a); D.text5('80.7', X(0.08) + 0, J(0.946), 0x8ad88a);
  A.ink(ROUGH.metal);
  for (let k = 0; k < 5; k++) R(-0.08 + k * 0.026, 0.913, -0.062 + k * 0.026, 0.92, 0xb8b8b4);
  D.disc(X(-0.075), J(0.937), 3.2, 0x9a9a98); D.disc(X(-0.075), J(0.937), 1.6, 0x6a6a68);
  // heater controls: three sliders on a plate, a fan knob
  A.ink(ROUGH.plastic);
  R(-0.1, 0.845, 0.1, 0.895, 0x1c1c1e);
  for (const [k, p] of [[0, 0.3], [1, 0.7], [2, 0.5]]) { const x0 = -0.085 + k * 0.05; R(x0, 0.866, x0 + 0.04, 0.869, 0x0a0a0a); R(x0 + p * 0.034, 0.857, x0 + p * 0.034 + 0.008, 0.878, 0xc8c4bc); }
  D.text5('C', X(-0.095), J(0.892), 0x4a8ad8); D.text5('H', X(-0.035), J(0.892), 0xd84a3a);
  // ashtray (pull-out, chrome lip)
  R(-0.06, 0.815, 0.06, 0.838, 0x141416); A.ink(ROUGH.chrome); R(-0.03, 0.833, 0.03, 0.837, CHROME[1]);
  // glovebox on the passenger side, with its keyhole and a sticker
  A.ink(ROUGH.plastic);
  R(0.2, 0.84, 0.58, 0.955, C[2]); D.frame(X(0.58), J(0.84), X(0.2), J(0.955), C[0]); D.hline(X(0.58), X(0.2) - 1, J(0.955) - 2, C[3]);
  R(0.37, 0.925, 0.41, 0.94, C[0]); D.px(X(0.39), J(0.93), CHROME[2]);
  R(0.48, 0.86, 0.54, 0.895, 0xf2ead2); D.text5('OIL', X(0.535), J(0.89), 0x8a2a2a);
  // the hazard switch, the cigarette lighter, the driver's side switches
  R(0.12, 0.93, 0.15, 0.95, 0xc82a2a); D.px(X(0.135), J(0.94), 0xffffff);
  D.disc(X(0.16), J(0.88), 4, 0x0a0a0a); D.disc(X(0.16), J(0.88), 2.5, 0x6a6a6a);
  for (let k = 0; k < 3; k++) R(-0.64 + k * 0.035, 0.885, -0.615 + k * 0.035, 0.915, 0x141416);
  // the ignition / cluster surround behind the wheel
  R(-0.53, 0.99, -0.15, 1.24, C[1]);
}

function paintBeads(P) {
  const A = P.A;
  A.ink(ROUGH.fabric);
  P.fill(0x3a4250);
  A.ink(ROUGH.lens);
  const wood = [0x6a4422, 0x9a6a3a, 0xc8945a, 0xe8c08a];
  for (let j = 2; j < P.H - 2; j += 4) for (let i = 2; i < P.W - 2; i += 4) {
    const t = ((i >> 2) + (j >> 2)) % 3 === 0 ? 1 : 0;
    P.px(i, j, wood[1 - t + 1]); P.px(i + 1, j, wood[1]); P.px(i, j + 1, wood[3 - t]); P.px(i + 1, j + 1, wood[2]);
    P.px(i + 2, j, 0x2a2018); P.px(i, j + 2, 0x2a2018);
  }
}
function paintLace(P) {
  P.A.ink(ROUGH.fabric);
  P.fill(0x3a4250);
  for (let j = 0; j < P.H; j++) for (let i = 0; i < P.W; i++) {
    const lace = j > 6 && ((i + j) % 4 === 0 || (i - j + 64) % 4 === 0 || j === 7);
    const scallop = j <= 6 && j >= 3 && Math.hypot((i % 6) - 2.5, j - 6) < 3.2;
    if (lace || scallop) P.px(i, j, (i + j) % 8 === 0 ? 0xe8e4dc : 0xf6f4ee);
  }
}
function paintTarp(P) {
  P.A.ink(ROUGH.tarp);
  const B = ramp(0x2f6fd6);
  P.box(0, 0, P.W, P.H, (i, j) => { const f = Math.sin(i * 0.31 + Math.sin(j * 0.2) * 2); return f > 0.75 ? B[3] : f < -0.6 ? B[1] : B[2]; });
  P.A.ink(ROUGH.fabric);
  for (const i of [14, 44]) for (let j = 0; j < P.H; j++) { P.px(i, j, j % 3 ? 0xd8c890 : 0xa89860); P.px(i + 1, j, 0xb8a870); }
  for (const i of [2, P.W - 3]) for (let j = 0; j < P.H; j += 9) P.px(i, j, 0xd8d8d8); // eyelets
}
function paintCardboard(P) {
  P.A.ink(ROUGH.matte);
  P.box(0, 0, P.W, P.H, (i, j) => (j % 7 === 0 ? 0xb88a52 : 0xc89a60));
  P.rect(0, 13, P.W, 19, 0xd8c890); P.hline(0, P.W - 1, 18, 0xe8dca8);
  P.text5('KITCHEN', 4, 10, 0x2a2a2a);
}
function paintMirror(P) {
  P.A.ink(ROUGH.glass);
  P.fill(0x3e4046);
  P.rect(10, 4, 38, 13, 0xc8d4d8); P.rect(10, 4, 38, 7, 0x9aa8a0); P.hline(10, 37, 12, 0xeef2ee);
  P.rect(4, 0, 13, 7, 0xa8784a); P.hline(4, 12, 6, 0xc8965a); P.rect(30, 0, 42, 8, 0xb8865a); P.hline(30, 41, 7, 0xd0a46a);
  P.rect(17, 0, 28, 4, 0x4a4a48);
  P.frame(0, 0, P.W, P.H, 0x141414);
}
function paintCharm(P) {
  P.A.ink(ROUGH.fabric);
  P.fill(0xc8202a);
  for (let j = 2; j < P.H - 2; j++) for (let i = 1; i < P.W - 1; i++) if ((i + j) % 3 === 0) P.px(i, j, 0xe8b83a);
  P.rect(3, 4, 7, 11, 0xf2e8d0); P.vline(5, 5, 10, 0x2a1a14); // the white panel with the characters
  P.hline(0, P.W - 1, P.H - 1, 0xf2c83a);
}
function paintFlap(P) {
  P.A.ink(ROUGH.rubber);
  P.fill(0x1e1e20);
  for (let j = 2; j < P.H - 2; j += 3) P.hline(2, P.W - 3, j, 0x2a2a2c);
  P.rect(4, 8, 14, 14, 0xb8bcc0); P.rect(5, 9, 13, 13, 0x1e1e20);
}
/** What a door mirror shows: sky, the lane's roofs, the road, the van's own mint flank down one side. */
function paintDoorMirror(P) {
  P.A.ink(ROUGH.glass);
  P.box(0, 0, P.W, P.H, (i, j) => (j > 8 ? (j > 11 ? 0xd4e4ec : 0xb4ccd8) : j > 6 ? 0x8a8070 : 0x6e6e6a));
  P.box(0, 0, 3, 10, PR[2]); P.vline(3, 0, 9, PR[0]);
  P.hline(4, 9, 3, 0xd8d4c8);
  P.frame(0, 0, P.W, P.H, 0x2a2c2e);
}
function paintPhoto(P) {
  P.A.ink(ROUGH.matte);
  P.fill(0xf4f0e6); P.rect(1, 3, 11, 15, 0x8aa0b0); P.rect(1, 3, 11, 7, 0x6a8a5a);
  P.rect(4, 6, 8, 12, 0x5a4a3a); P.rect(5, 10, 7, 13, 0xd8a888); P.rect(4, 13, 8, 14, 0xe8e8e8);
}

// ------------------------------------------------------------------ geometry
function buildGeos() {
  const { A, V } = paintAtlas();
  const ext = triplanar({ px: V.L, nx: V.R, py: V.T, pz: V.F, nz: V.B }, A.swatch(0x18191a, ROUGH.matte));
  const inn = triplanar({ px: V.IR, nx: V.IL, py: V.IF, ny: V.IH, pz: V.IB, nz: V.IFr });
  const sw = (c, r) => A.swatch(c, r);
  const under = sw(0x16171a, ROUGH.matte), rubber = sw(RUBBER, ROUGH.rubber), jamb = sw(PR[1], ROUGH.paint);
  const G = new Geo(1), GL = new Geo(1);
  // ---- the shell, inside and out, with its windows
  shell(G, {
    pts: PROFILE, W, R: RND, K: 2, uv: ext,
    sideHoles: {
      pos: [{ pts: WIN_DOOR, glass: true, wall: rubber }, { pts: WIN_SLIDE, glass: true, wall: rubber }, { pts: WIN_QTR, glass: true, wall: rubber }],
      neg: [{ pts: grow(DOOR, 0.004), wall: jamb }, { pts: WIN_SLIDE, glass: true, wall: rubber }, { pts: WIN_QTR, glass: true, wall: rubber }],
    },
    bandHoles: [
      { e: E_WS, u0: WS_HOLE.u0, u1: WS_HOLE.u1, hx: WS_HOLE.hx },
      { e: E_REAR, u0: (1.79 - REAR_WIN.y1) / (1.79 - YB), u1: (1.79 - REAR_WIN.y0) / (1.79 - YB), hx: REAR_WIN.hx },
    ],
    bandUv: (e) => (PROFILE[e][2] === 0 ? under : null),
    wallUv: rubber, glassUv: ext, glassGeo: GL,
    inner: { t: T_IN, uv: inn },
  });
  exterior(G, V, A);
  interior(G, V, A);
  return { A, V, G, GL };
}

/** Bumpers, lamps, plates, grille, mirrors, wipers, drip rails, the rack and its load, flaps, the running gear. */
function exterior(G, V, A) {
  const ext = triplanar({ px: V.L, nx: V.R, py: V.T, pz: V.F, nz: V.B }, A.swatch(0x18191a, ROUGH.matte));
  const sw = (c, r = ROUGH.plastic) => A.swatch(c, r);
  G.with(ext, 0, () => {
    // bumpers (their faces painted in the front / rear views)
    G.box(-W + 0.004, 0.24, 1.62, W - 0.004, 0.44, 1.712, { bevel: 0.025 });
    G.box(-W + 0.004, 0.25, -1.712, W - 0.004, 0.43, -1.62, { bevel: 0.025 });
    // headlight housings, corner lamps, the grille, proud of the front
    for (const s of [-1, 1]) {
      G.box(s > 0 ? 0.438 : -0.677, 0.588, ZF - 0.01, s > 0 ? 0.677 : -0.438, 0.747, ZF + 0.014, { bevel: 0.006 });
      G.box(s > 0 ? 0.5 : -0.668, 0.47, ZF - 0.01, s > 0 ? 0.668 : -0.5, 0.535, ZF + 0.01, { bevel: 0.004 });
      // tail clusters wrap the rear corners
      G.box(s > 0 ? 0.612 : -0.748, 0.455, ZR - 0.016, s > 0 ? 0.748 : -0.612, 0.845, ZR + 0.03, { bevel: 0.008 });
    }
    G.box(-0.385, 0.61, ZF - 0.01, 0.385, 0.73, ZF + 0.006, { bevel: 0.004 });
  });
  // plates (their own patch), the rear plate's lamp
  const pl = (z, y, dir) => G.with(boxMap(V.plate, [-0.165, y, z - 0.004, 0.165, y + 0.165, z + 0.004]), 0, () => G.box(-0.165, y, z - 0.004, 0.165, y + 0.165, z + 0.004, { skip: dir > 0 ? ['nz'] : ['pz'] }));
  pl(1.716, 0.257, 1); pl(ZR - 0.006, 0.5, -1);
  G.with(sw(CHROME[1], ROUGH.chrome), 0, () => G.box(-0.07, 0.682, ZR - 0.03, 0.07, 0.702, ZR, { bevel: 0.006 }));
  // the side indicators
  G.with(ext, 0, () => { for (const s of [-1, 1]) G.box(s * W - 0.006, 0.52, 1.52, s * W + 0.006, 0.55, 1.6); });
  // door handles (front left, the sliding doors; the driver's is on the door)
  G.with(sw(0x2a2c2e), 0, () => {
    G.box(W, 0.968, 0.86, W + 0.012, 0.99, 0.97, { bevel: 0.004 });
    for (const s of [-1, 1]) G.box(s * W - (s < 0 ? 0.012 : 0), 0.928, 0.6, s * W + (s > 0 ? 0.012 : 0), 0.948, 0.7, { bevel: 0.004 });
  });
  G.with(sw(CHROME[2], ROUGH.chrome), 0, () => { G.box(W + 0.005, 0.975, 0.87, W + 0.015, 0.983, 0.96); for (const s of [-1, 1]) G.box(s * (W + 0.01) - 0.004, 0.934, 0.61, s * (W + 0.01) + 0.004, 0.942, 0.69); });
  // fuel lid (left rear), slightly proud
  G.with(ext, 0, () => G.box(W - 0.002, 0.725, -0.615, W + 0.004, 0.855, -0.475));
  // drip rails along the roof, down the A-pillars
  G.with(sw(PR[1], ROUGH.paint), 0, () => {
    for (const s of [-1, 1]) {
      G.box(s * W - 0.006, 1.822, -1.6, s * W + 0.006, 1.836, 1.36);
      G.strut([s * (W - 0.002), 1.83, 1.375], [s * (W - 0.002), WS0[1] + 0.03, zWS(WS0[1] + 0.03) - 0.052], 0.005);
    }
  });
  // the wipers, parked along the bottom of the windscreen
  const up = [0, 0.9655, -0.2621], out = [0, 0.2621, 0.9655];
  for (const px of [-0.52, 0.04]) {
    const y = WS0[1] + 0.03, piv = [px, y, zWS(y) + 0.012];
    const d = [0.985, 0.17 * up[1], 0.17 * up[2]], l = Math.hypot(...d);
    wiper(G, piv, d.map((v) => v / l), 0.44, 0.38, out, sw(0x161618));
  }
  // the radio aerial up the left A-pillar
  G.with(sw(0x8a8e92, ROUGH.chrome), 0, () => { G.strut([W - 0.02, 1.04, 1.6], [W + 0.03, 1.98, 1.24], 0.004, { round: 4 }); G.box(W - 0.03, 1.02, 1.58, W, 1.06, 1.62, { bevel: 0.006 }); });
  // the left door mirror, and the little under-mirror on the left front corner
  doorMirror(G, [W + 0.004, 1.12, 1.5], [W + 0.115, 1.2, 1.47], { uvBody: sw(0x1e1f21), uvGlass: mirrorUv(V, W + 0.115, 1.2, true) });
  G.with(sw(0x1e1f21), 0, () => {
    G.strut([0.69, 1.0, 1.63], [0.75, 1.16, 1.72], 0.008, { round: 4 });
    G.box(0.72, 1.14, 1.70, 0.79, 1.2, 1.745, { bevel: 0.012 });
  });
  G.with(sw(0x9ab0bc, ROUGH.glass), 0, () => G.quad([0.725, 1.145, 1.699], [0.785, 1.145, 1.699], [0.785, 1.195, 1.699], [0.725, 1.195, 1.699], [0, 0, -1]));
  // the roof rack: gutter feet, two rails, cross bars; the tarp bundle roped down; an aluminium ladder
  const rack = sw(0x2a2c30, ROUGH.metal);
  G.with(rack, 0, () => {
    for (const s of [-1, 1]) {
      for (const z of [-1.45, -0.6, 0.3, 1.15]) { G.box(s * W - 0.012, 1.80, z - 0.03, s * W + 0.014, 1.845, z + 0.03, { bevel: 0.005 }); G.strut([s * (W + 0.002), 1.84, z], [s * 0.62, 1.955, z], 0.011); }
      rods(G, [[s * 0.62, 1.96, -1.52], [s * 0.62, 1.96, 1.24]], 0.014, 6);
    }
    for (const z of [-1.45, -0.6, 0.3, 1.15]) rods(G, [[-0.62, 1.965, z], [0.62, 1.965, z]], 0.012, 4);
    rods(G, [[-0.62, 1.96, 1.24], [-0.5, 2.03, 1.32], [0.5, 2.03, 1.32], [0.62, 1.96, 1.24]], 0.013, 6); // the front hoop
  });
  G.with(boxMap(V.tarp, [-0.5, 1.975, -1.2, 0.36, 2.17, -0.3]), 0, () => G.box(-0.5, 1.975, -1.2, 0.36, 2.17, -0.3, { bevel: 0.05 }));
  G.with(sw(0xd8c890, ROUGH.fabric), 0, () => { for (const z of [-1.02, -0.5]) { rods(G, [[-0.62, 1.965, z], [-0.5, 2.0, z], [-0.46, 2.175, z], [0.32, 2.175, z], [0.36, 2.0, z], [0.62, 1.965, z]], 0.008, 4); } });
  G.with(sw(0xc8ccd0, ROUGH.metal), 0, () => {
    for (const x of [0.1, 0.5]) G.box(x - 0.02, 1.978, -0.15, x + 0.02, 2.0, 1.22, { bevel: 0.004 });
    for (let z = -0.05; z < 1.2; z += 0.28) G.strut([0.1, 1.99, z], [0.5, 1.99, z], 0.011, { round: 4 });
  });
  // mud flaps behind every wheel
  for (const zf of [AX - ARCH - 0.02, -AX - ARCH - 0.02]) for (const s of [-1, 1]) G.with(boxMap(V.flap, [s > 0 ? 0.52 : -W, 0.1, zf - 0.006, s > 0 ? W : -0.52, 0.33, zf]), 0, () => G.box(s > 0 ? 0.52 : -W + 0.005, 0.1, zf - 0.006, s > 0 ? W - 0.005 : -0.52, 0.33, zf));
  // the running gear under it: axle tubes, the leaf springs, the fuel tank, the exhaust
  G.with(sw(0x18191a, ROUGH.metal), 0, () => {
    G.strut([-0.58, WR, -AX], [0.58, WR, -AX], 0.04, { round: 6 });
    G.box(-0.5, WR - 0.03, AX - 0.06, 0.5, WR + 0.03, AX + 0.06);
    for (const s of [-1, 1]) G.box(s * 0.5 - 0.03, 0.2, -AX - 0.45, s * 0.5 + 0.03, 0.24, -AX + 0.45);
    G.box(-0.45, 0.14, -0.6, 0.25, 0.27, 0.15, { bevel: 0.02 });
    G.box(-0.3, 0.12, 0.25, 0.3, 0.28, 0.75, { bevel: 0.03 });
  });
  G.with(sw(0x5a5048, ROUGH.metal), 0, () => { G.strut([0.32, 0.16, -0.7], [0.4, 0.17, -1.6], 0.022, { round: 6 }); G.strut([0.4, 0.17, -1.6], [0.4, 0.17, -1.69], 0.026, { round: 6 }); });
}

/** uv over the door-mirror patch for a mirror head centred at (x, y) (the van's flank on the inboard side). */
function mirrorUv(V, x, y, left) {
  const w = 0.1, h = 0.14;
  return (p) => { const s = (p[0] - (x - w / 2)) / w, t = (p[1] - (y - h / 2)) / h; return V.dmirror.st(Math.min(0.99, Math.max(0.01, left ? s : 1 - s)), Math.min(0.99, Math.max(0.01, t))); };
}

/** The cab and the load space. */
function interior(G, V, A) {
  const inn = triplanar({ px: V.IR, nx: V.IL, py: V.IF, ny: V.IH, pz: V.IB, nz: V.IFr });
  const dash = triplanar({ px: A.swatch(IN.dash, ROUGH.plastic), nx: A.swatch(IN.dash, ROUGH.plastic), py: V.IF, ny: A.swatch(0x1a1a1a, ROUGH.plastic), pz: A.swatch(IN.dash, ROUGH.plastic), nz: V.D });
  const sw = (c, r = ROUGH.plastic) => A.swatch(c, r);
  // floors: the footwell, the seat box over the front wheels, the load floor (raised over the engine)
  G.with(inn, 0, () => {
    G.box(-W + T_IN, 0.4, 1.0, W - T_IN, 0.42, 1.635, { skip: ['ny'] });
    G.box(-W + T_IN, 0.42, 0.6, W - T_IN, 0.58, 1.0, { skip: ['ny'] });
    G.box(-W + T_IN, 0.3, -1.635, W - T_IN, 0.64, 0.6, { skip: ['ny'] });
  });
  // the dash: a deep shelf under the glass, the binnacle hump in front of the driver, the steering column
  G.with(dash, 0, () => {
    G.box(-W + T_IN, 0.78, 1.4, W - T_IN, 1.035, 1.6, { bevel: 0.012 });
    G.box(-0.53, 1.0, 1.51, -0.15, 1.2, 1.58, { bevel: 0.01 });
  });
  G.with(sw(0x222224), 0, () => {
    // the binnacle's hood over the dial, and its cheeks
    G.box(-0.535, 1.198, 1.42, -0.145, 1.218, 1.58, { bevel: 0.006 });
    for (const x of [-0.535, -0.165]) G.box(x, 1.035, 1.43, x + 0.02, 1.205, 1.52, { bevel: 0.004 });
    G.box(-0.535, 1.035, 1.43, -0.145, 1.06, 1.52, { bevel: 0.004 });
  });
  // the steering column, in the wheel's own tilted frame: tube, shroud, the stalks, the key on its ring
  {
    const m = new THREE.Matrix4().compose(CAB.wheel, new THREE.Quaternion().setFromEuler(new THREE.Euler(CAB.wheelTilt, 0, 0)), new THREE.Vector3(1, 1, 1));
    G.push(m);
    G.with(sw(0x1e1e20), 0, () => {
      G.cyl('z', [0, 0, 0.06], 0.028, 0.42, 8);
      G.box(-0.055, -0.05, 0.07, 0.055, 0.045, 0.2, { bevel: 0.015 });
      G.strut([-0.05, 0.01, 0.1], [-0.17, 0.035, 0.07], 0.007, { round: 4 }); // indicators (right)
      G.strut([0.05, 0.01, 0.1], [0.16, 0.03, 0.07], 0.007, { round: 4 }); // wipers (left)
    });
    G.with(sw(CHROME[2], ROUGH.chrome), 0, () => { G.box(-0.07, -0.03, 0.125, -0.055, -0.02, 0.145); G.box(-0.078, -0.07, 0.13, -0.072, -0.03, 0.14); });
    G.with(sw(0xd83a2a), 0, () => G.box(-0.082, -0.1, 0.128, -0.068, -0.07, 0.142));
    G.pop();
  }
  // gear stick out of the floor, a handbrake lever by the seat
  G.with(sw(0x1a1a1c), 0, () => {
    G.box(-0.05, 0.42, 1.18, 0.05, 0.47, 1.28, { bevel: 0.02 });
    G.strut([0, 0.46, 1.23], [0.03, 0.86, 1.15], 0.009, { round: 6 });
    G.strut([0.07, 0.62, 0.92], [0.07, 0.72, 1.08], 0.012);
  });
  G.with(sw(0x2a2a2a, ROUGH.chrome), 0, () => G.box(0.005, 0.85, 1.125, 0.055, 0.9, 1.175, { bevel: 0.018 }));
  // seats: cushions and backs in wooden-bead covers, lace on the headrests
  for (const [x0, x1] of [[-0.6, -0.08], [0.08, 0.6]]) {
    const cx = (x0 + x1) / 2;
    G.with(sw(0x262830), 0, () => G.box(x0 + 0.03, 0.58, 0.68, x1 - 0.03, 0.62, 1.1));
    G.with(boxMap(V.beads, [x0, 0.61, 0.7, x1, 0.71, 1.13]), 0, () => G.box(x0, 0.61, 0.7, x1, 0.71, 1.13, { bevel: 0.03 }));
    const back = new THREE.Matrix4().makeRotationX(-0.16).setPosition(0, 0.69, 0.72);
    G.push(back);
    G.with(boxMap(V.beads, [x0, 0.02, -0.06, x1, 0.64, 0.06]), 0, () => G.box(x0, 0.02, -0.06, x1, 0.64, 0.06, { bevel: 0.035 }));
    G.with(boxMap(V.lace, [cx - 0.13, 0.67, -0.05, cx + 0.13, 0.88, 0.05]), 0, () => G.box(cx - 0.13, 0.67, -0.05, cx + 0.13, 0.88, 0.05, { bevel: 0.03 }));
    G.with(sw(0x8a8e92, ROUGH.chrome), 0, () => { for (const dx of [-0.07, 0.07]) G.box(cx + dx - 0.006, 0.62, -0.006, cx + dx + 0.006, 0.68, 0.006); });
    G.pop();
  }
  // sun visors flipped up, the rear-view mirror on its stalk, the dome light
  G.with(sw(0x5e5d58, ROUGH.fabric), 0, () => { for (const [x0, x1] of [[-0.66, -0.1], [0.1, 0.66]]) G.box(x0, 1.815, 1.12, x1, 1.835, 1.34, { bevel: 0.008 }); });
  G.with(sw(0x1e1e20), 0, () => {
    G.strut([0, 1.8, 1.41], [0, 1.72, 1.415], 0.01, { round: 4 });
    G.box(-CAB.mirror.w / 2 - 0.01, 1.665, 1.398, CAB.mirror.w / 2 + 0.01, 1.73, 1.43, { bevel: 0.012 });
  });
  G.with(boxMap(V.mirror, [-CAB.mirror.w / 2, CAB.mirror.y - CAB.mirror.h / 2, 0, CAB.mirror.w / 2, CAB.mirror.y + CAB.mirror.h / 2, 0], { flip: true }), 0, () => {
    const M = CAB.mirror;
    G.quad([-M.w / 2, M.y - M.h / 2, M.z], [M.w / 2, M.y - M.h / 2, M.z], [M.w / 2, M.y + M.h / 2, M.z], [-M.w / 2, M.y + M.h / 2, M.z], [0, 0, -1]);
  });
  G.with(sw(0xe8e4d4, ROUGH.lens), 0, () => G.box(-0.08, 1.83, 0.63, 0.08, 1.85, 0.69, { bevel: 0.008 }));
  // the passenger door card's armrest, crank and handle (the driver's are on his door)
  doorFittings(G, A, 1);
  // things on the dash: a daruma, a box of tissues in a crocheted cover, Grandpa's photo propped up
  G.with(sw(0xc8282a, ROUGH.paint), 0, () => { G.box(0.3, 1.035, 1.5, 0.36, 1.1, 1.56, { bevel: 0.025 }); });
  G.with(sw(0xf4ecd8, ROUGH.paint), 0, () => G.box(0.312, 1.06, 1.497, 0.348, 1.085, 1.5));
  G.with(sw(0xe8dcc4, ROUGH.fabric), 0, () => G.box(0.42, 1.035, 1.47, 0.62, 1.1, 1.58, { bevel: 0.015 }));
  G.with(sw(0xf8f6f0, ROUGH.fabric), 0, () => G.box(0.5, 1.1, 1.51, 0.54, 1.12, 1.54, { bevel: 0.006 }));
  G.push(new THREE.Matrix4().makeRotationX(0.22).setPosition(0.16, 1.035, 1.55));
  G.with(boxMap(V.photo, [-0.04, 0, -0.003, 0.04, 0.105, 0.003]), 0, () => G.box(-0.04, 0, -0.003, 0.04, 0.105, 0.003));
  G.pop();
  // a pipe guard behind the seats, the moving boxes in the back
  G.with(sw(0x2a2c30, ROUGH.metal), 0, () => rods(G, [[-0.65, 0.62, 0.6], [-0.65, 1.3, 0.6], [0.65, 1.3, 0.6], [0.65, 0.62, 0.6]], 0.014, 6));
  const boxes = [[-0.6, 0.64, -1.6, -0.06, 1.06, -1.05, 0.1], [0.02, 0.64, -1.6, 0.58, 0.99, -1.1, -0.06], [-0.5, 1.06, -1.55, -0.12, 1.34, -1.12, 0.12], [-0.62, 0.64, -0.9, -0.08, 0.9, -0.3, -0.05], [0.06, 0.64, -0.95, 0.6, 1.14, -0.35, 0.04]];
  for (const [x0, y0, z0, x1, y1, z1, ry] of boxes) {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    G.push(new THREE.Matrix4().makeRotationY(ry).setPosition(cx, 0, cz));
    G.with(boxMap(V.card, [x0 - cx, y0, z0 - cz, x1 - cx, y1, z1 - cz]), 0, () => G.box(x0 - cx, y0, z0 - cz, x1 - cx, y1, z1 - cz, { bevel: 0.008 }));
    G.pop();
  }
}

/** Armrest, window crank, door handle and lock knob on a door card (sx: the door's side, -1 the driver's). */
function doorFittings(G, A, sx) {
  const xi = sx * (W - (sx < 0 ? DOOR_T : T_IN)); // the card's face
  const toward = -sx; // into the cab
  const sw = (c, r = ROUGH.plastic) => A.swatch(c, r);
  G.with(sw(0x3a3c42), 0, () => G.box(Math.min(xi, xi + toward * 0.06), 0.86, 0.95, Math.max(xi, xi + toward * 0.06), 0.92, 1.32, { bevel: 0.015 }));
  G.with(sw(CHROME[1], ROUGH.chrome), 0, () => {
    // window crank: boss, arm, knob
    const cx = xi + toward * 0.012;
    G.cyl('x', [Math.min(cx, cx + toward * 0.015), 0.74, 1.1], 0.022, 0.015, 8);
    G.strut([cx + toward * 0.018, 0.74, 1.1], [cx + toward * 0.018, 0.8, 1.16], 0.006);
    // inner door handle
    G.box(Math.min(xi, xi + toward * 0.02), 1.0, 1.36, Math.max(xi, xi + toward * 0.02), 1.015, 1.44, { bevel: 0.004 });
  });
  G.with(sw(0x1a1a1a), 0, () => G.cyl('x', [Math.min(xi + toward * 0.033, xi + toward * 0.06), 0.8, 1.16], 0.012, 0.03, 6));
  G.with(sw(0x1e1e20), 0, () => G.box(Math.min(xi, xi + toward * 0.012) - 0.002, BELT - 0.04, 0.9, Math.max(xi, xi + toward * 0.012) + 0.002, BELT, 0.92));
}

/** The driver's door: skin, window and its glass, the card, the mirror, the handle. Body space (closed). */
function buildDoor(V, A) {
  const ext = triplanar({ px: V.L, nx: V.R, py: V.T, pz: V.F, nz: V.B }, A.swatch(0x18191a, ROUGH.matte));
  const inn = triplanar({ px: V.IR, nx: V.IL, py: V.IF, ny: V.IH, pz: V.IB, nz: V.IFr });
  const G = new Geo(1), GL = new Geo(1);
  slab(G, DOOR, [WIN_DOOR], -W, -(W - DOOR_T), { uvOut: ext, uvIn: inn, uvEdge: A.swatch(PR[1], ROUGH.paint), uvHole: A.swatch(RUBBER, ROUGH.rubber) });
  GL.with(ext, 0, () => GL.polyHoles(WIN_DOOR, [], (z, y) => [-(W - 0.014), y, z], [-1, 0, 0]));
  doorMirror(G, [-W - 0.004, 1.12, 1.5], [-W - 0.115, 1.2, 1.47], { uvBody: A.swatch(0x1e1f21, ROUGH.plastic), uvGlass: mirrorUv(V, -W - 0.115, 1.2, false) });
  G.with(A.swatch(0x2a2c2e, ROUGH.plastic), 0, () => G.box(-W - 0.012, 0.968, 0.86, -W, 0.99, 0.97, { bevel: 0.004 }));
  G.with(A.swatch(CHROME[2], ROUGH.chrome), 0, () => G.box(-W - 0.015, 0.975, 0.87, -W - 0.005, 0.983, 0.96));
  doorFittings(G, A, -1);
  return { G, GL };
}

/** The steering wheel in its own plane (x = the driver's left, y up, -z towards the driver). */
function buildSteeringWheel(A) {
  const G = new Geo(1), R = CAB.wheelR;
  G.with(A.swatch(0x1c1c1e, ROUGH.plastic), 0, () => G.torus(R, 0.0125, 28, 6));
  G.with(A.swatch(0x262628, ROUGH.plastic), 0, () => {
    // two spokes, to 4 and 8 o'clock as the driver sees it (x = his left), dished towards the column
    for (const s of [-1, 1]) G.strut([s * 0.045, -0.025, 0.022], [s * 0.866 * (R - 0.008), -0.5 * (R - 0.008), 0.002], 0.011, { bevel: 0.004 });
    G.box(-0.055, -0.055, -0.004, 0.055, 0.035, 0.034, { bevel: 0.016 });
    G.cyl('z', [0, 0, 0.03], 0.03, 0.05, 8);
  });
  G.with(A.swatch(CHROME[1], ROUGH.chrome), 0, () => G.box(-0.018, -0.022, -0.008, 0.018, -0.006, 0.0));
  return G.build();
}

/** Grandpa's 交通安全 omamori: a red brocade bag on a cord, gold knot, hanging from the pivot at the top (y = 0 down). */
function buildCharm(V, A) {
  const G = new Geo(1);
  G.with(A.swatch(0xe8d8b0, ROUGH.fabric), 0, () => G.strut([0, 0, 0], [0, -0.042, 0], 0.0018));
  G.with(A.swatch(0xf2c83a, ROUGH.fabric), 0, () => G.box(-0.005, -0.05, -0.004, 0.005, -0.04, 0.004));
  G.with(boxMap(V.charm, [-0.017, -0.105, -0.004, 0.017, -0.05, 0.004]), 0, () => G.box(-0.017, -0.105, -0.004, 0.017, -0.05, 0.004, { bevel: 0.002 }));
  return G.build();
}

/** Lamps switched on: [heads + tails, brakes]: unlit quads just proud of the lenses. */
function buildLit(V) {
  const H = new Geo(1), B = new Geo(1);
  const q = (G, v, x0, y0, x1, y1, z, dir) => G.quad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], [0, 0, dir], dir > 0 ? [v.st(0, 0), v.st(1, 0), v.st(1, 1), v.st(0, 1)] : [v.st(1, 0), v.st(0, 0), v.st(0, 1), v.st(1, 1)]);
  for (const s of [-1, 1]) {
    const x0 = s > 0 ? 0.45 : -0.665, x1 = s > 0 ? 0.665 : -0.45;
    q(H, V.litHead, x0, 0.6, x1, 0.735, ZF + 0.0155, 1);
    const t0 = s > 0 ? 0.615 : -0.745, t1 = s > 0 ? 0.745 : -0.615;
    q(H, V.litTail, t0, 0.46, t1, 0.52, ZR - 0.0175, -1);
    q(B, V.litTail, t0, 0.585, t1, 0.765, ZR - 0.0178, -1);
  }
  return { heads: H.build(), brakes: B.build() };
}

// ------------------------------------------------------------------ the cab parts (contract with src/drive)
// where the cab parts sit (van body-space metres)
export const CAB = {
  wheel: new THREE.Vector3(-0.34, 1.15, 1.30), wheelTilt: 0.86, wheelR: 0.18, // centre, tilt back from vertical, rim radius
  dial: { x: -0.34, y: 1.128, z: 1.475, w: 0.3, h: 0.12 },
  mirror: { x: 0.0, y: 1.6975, z: 1.3965, w: 0.18, h: 0.05 },
  charm: new THREE.Vector3(0.0, 1.664, 1.414),
};
const DIAL_W = 160, DIAL_H = 64, DIAL_C = [54, 31]; // the dial texture and the speedometer's pivot (px)
const SWEEP0 = (210 / 180) * Math.PI, SWEEP = (240 / 180) * Math.PI; // 0 km/h at 7 o'clock, 120 at 5

/** Paint the binnacle face: speedometer (0-120), odometer, fuel and temperature gauges, warning lamps. */
function paintDial(ctx, lamps = {}) {
  const P = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const num = (str, x, y, col) => { ctx.fillStyle = col; for (const [i, j] of mask5(str)) ctx.fillRect(x - (textW5(str) >> 1) + i, y + j, 1, 1); };
  const arcPx = (cx, cy, r, a, col) => P(Math.round(cx + Math.cos(a) * r - 0.5), Math.round(cy - Math.sin(a) * r - 0.5), 1, 1, col);
  P(0, 0, DIAL_W, DIAL_H, '#0b0c0d');
  P(1, 1, DIAL_W - 2, DIAL_H - 2, '#141618');
  const [cx, cy] = DIAL_C;
  // the speedometer: its chrome ring, ticks every 5, numbers every 40, red past 100
  for (let a = 0; a < 360; a += 1.5) { const r = a * Math.PI / 180; arcPx(cx, cy, 30.5, r, a > 20 && a < 160 ? '#9aa0a4' : '#4a4e52'); }
  P(cx - 30, cy + 22, 61, 9, '#141618');
  for (let k = 0; k <= 24; k++) {
    const a = SWEEP0 - (k / 24) * SWEEP, big = k % 4 === 0, mid = k % 2 === 0, red = k >= 20;
    for (let r = big ? 23 : mid ? 25 : 26.5; r <= 27.5; r += 0.5) arcPx(cx, cy, r, a, red ? '#e8402a' : big ? '#f4f0e0' : '#a8a498');
  }
  for (const [s, k] of [['0', 0], ['40', 8], ['80', 16], ['120', 24]]) { const a = SWEEP0 - (k / 24) * SWEEP; num(s, Math.round(cx + Math.cos(a) * 16.5), Math.round(cy - Math.sin(a) * 16.5) - 3, k === 24 ? '#e8402a' : '#f4f0e0'); }
  num('KM/H', cx, cy + 7, '#8a887e');
  // the odometer in the gap at the bottom: five white wheels and a black tenths wheel
  P(cx - 19, cy + 17, 38, 10, '#030303');
  ctx.fillStyle = '#e8e4d8';
  let ox = cx - 18;
  for (const ch of '08476') { for (const [i, j] of mask5(ch)) ctx.fillRect(ox + i, cy + 18 + j, 1, 1); ox += 6; }
  P(ox - 1, cy + 17, 7, 10, '#d8d4c8'); ctx.fillStyle = '#101010'; for (const [i, j] of mask5('3')) ctx.fillRect(ox + i, cy + 18 + j, 1, 1);
  // fuel (E . . F, just over a quarter) and temperature (C . H, the middle)
  const small = (gx, gy, lo, hi, loC, hiC, k) => {
    for (let a = 0; a < 360; a += 3) { const r = a * Math.PI / 180; if (a > 200 && a < 340) continue; arcPx(gx, gy, 14.5, r, a > 30 && a < 150 ? '#7a8084' : '#3a3e42'); }
    for (let t = 0; t <= 4; t++) { const a = Math.PI * 0.8 - (t / 4) * Math.PI * 0.6; for (let r = t % 2 ? 11 : 9.5; r <= 12; r += 0.5) arcPx(gx, gy, r, a, t === 0 ? loC : t === 4 ? hiC : '#c8c4b8'); }
    num(lo, gx - 11, gy + 1, loC); num(hi, gx + 11, gy + 1, hiC);
    const a = Math.PI * 0.8 - k * Math.PI * 0.6;
    for (let r = 0; r <= 10; r += 0.5) arcPx(gx, gy, r, a, '#f07a2a');
    P(gx - 1, gy - 1, 3, 3, '#3a3a3e');
  };
  small(136, 19, 'E', 'F', '#e8402a', '#c8c4b8', 0.3);
  small(136, 47, 'C', 'H', '#4a8ad8', '#e8402a', 0.46);
  // lamps: handbrake (red P), headlights (green), radio (amber FM); the oil and charge lamps stay dark
  const lamp = (x, y, on, col, str) => { P(x, y, 15, 9, on ? col : '#1c1c20'); P(x, y, 15, 1, on ? '#ffffff' : '#26262c'); num(str, x + 8, y + 1, on ? '#1a1416' : '#3a3a42'); };
  lamp(92, 5, !!lamps.hand, '#e8402a', 'P'); lamp(92, 16, !!lamps.beam, '#58d058', 'L'); lamp(92, 27, !!lamps.radio, '#f0b030', 'FM');
  lamp(92, 38, false, '#e8402a', 'OIL'); lamp(92, 49, false, '#e8402a', '+-');
  P(0, 0, DIAL_W, 1, '#2a2c2e'); P(0, DIAL_H - 1, DIAL_W, 1, '#030303');
}

/** A material for the inside of the cab: the sun's direct light scaled down (the roof shades you), sky and bounce kept. */
export function cabShade(m, k = 0.33) {
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    prev?.(sh, r);
    sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_begin>', THREE.ShaderChunk.lights_fragment_begin.replace(/getDirectionalLightInfo\( directionalLight, directLight \);/g, `getDirectionalLightInfo( directionalLight, directLight ); directLight.color *= ${k.toFixed(2)};`));
  };
  const key = m.customProgramCacheKey?.() || '';
  m.customProgramCacheKey = () => key + '-cab' + k;
  return m;
}

let SHARED = null;
/** Everything that's the same for every van: the atlas, the geometries, the materials (built once). */
function shared() {
  if (SHARED) return SHARED;
  const { A, V, G, GL } = buildGeos();
  const door = buildDoor(V, A);
  const wheelL = wheelGeometry(V.wheelL, { r: WR, w: 0.145, rim: 0.152, side: 1 });
  const wheelR = wheelGeometry(V.wheelL, { r: WR, w: 0.145, rim: 0.152, side: -1 });
  const lit = buildLit(V);
  // the door hangs on its hinge: its geometry moved so the hinge line is the origin
  const dg = door.G.build(), dgl = door.GL.build();
  for (const g of [dg, dgl]) { g.translate(W, 0, -HINGE_Z); g.computeBoundingSphere(); }
  const mats = vehicleMaterials(A);
  mats.lit.color.setScalar(1.0);
  SHARED = { A, V, body: G.build(), glass: GL.build(), door: dg, doorGlass: dgl, wheelL, wheelR, steer: buildSteeringWheel(A), charm: buildCharm(V, A), lit, mats };
  return SHARED;
}

export class Van {
  constructor(game) {
    this.game = game;
    const S = shared(), M = S.mats;
    const root = new THREE.Group();
    root.name = 'van';
    this.root = root;
    this.body = new THREE.Group(); // bobs on the suspension
    root.add(this.body);
    const body = new THREE.Mesh(S.body, M.body);
    body.castShadow = true; body.receiveShadow = true;
    body.name = 'van-body';
    this.body.add(body);
    this.bodyMesh = body;
    const glassM = new THREE.Mesh(S.glass, M.glass);
    glassM.name = 'van-glass'; glassM.renderOrder = 2; glassM.raycast = () => {};
    this.body.add(glassM);
    this.glassMesh = glassM;
    // the door hangs on its hinge (pivot at the door's front edge)
    this.doorPivot = new THREE.Group();
    this.doorPivot.position.set(-W, 0, HINGE_Z);
    const door = new THREE.Mesh(S.door, M.body);
    door.castShadow = true; door.receiveShadow = true;
    door.name = 'van-door';
    this.doorPivot.add(door);
    const dgl = new THREE.Mesh(S.doorGlass, M.glass);
    dgl.renderOrder = 2; dgl.raycast = () => {};
    this.doorPivot.add(dgl);
    this.doorGlassMesh = dgl;
    this.body.add(this.doorPivot);
    this.doorMesh = door;
    this.door = 0;
    // wheels (outside the bobbing body)
    this.wheels = [];
    for (const [x, z] of [[-TRACK, AX], [TRACK, AX], [-TRACK, -AX], [TRACK, -AX]]) {
      const w = new THREE.Mesh(x > 0 ? S.wheelL : S.wheelR, M.body);
      w.position.set(x, WR, z);
      w.castShadow = true;
      w.name = 'van-wheel';
      root.add(w);
      this.wheels.push(w);
    }
    // lamps when they're on: unlit quads over the lenses
    this.headMesh = new THREE.Mesh(S.lit.heads, M.lit);
    this.brakeMesh = new THREE.Mesh(S.lit.brakes, M.lit);
    for (const m of [this.headMesh, this.brakeMesh]) { m.raycast = () => {}; this.body.add(m); }
    this.heads = [this.headMesh]; this.brakes = [this.brakeMesh];
    this.setLights(false); this.setBrake(false);
    // front wheels steer about their kingpin before they spin
    for (const w of this.wheels.slice(0, 2)) w.rotation.order = 'YXZ';
    root.rotation.order = 'YXZ'; // heading, then the slope of the road
    this.buildCab(S);
    game.scene.add(root);
    this.dist = 0;
    this.bob = 0;
    this.setPose(PARK.x, PARK.z, PARK.heading);
  }

  /** Steering wheel, speedometer and the swinging omamori (inside the bobbing body). */
  buildCab(S) {
    const M = S.mats;
    const cab = this.cab = { charmA: [0, 0], charmV: [0, 0], kmh: 0, lampState: '' };
    // steering wheel: tilt (pivot) -> turn (spin) -> mesh
    cab.wheel = new THREE.Group();
    cab.wheel.position.copy(CAB.wheel);
    cab.wheel.rotation.x = CAB.wheelTilt;
    cab.spin = new THREE.Group();
    cab.wheel.add(cab.spin);
    const sw = new THREE.Mesh(S.steer, M.body);
    sw.castShadow = false;
    cab.spin.add(sw);
    this.body.add(cab.wheel);
    // the binnacle face (canvas) and its needle
    const c = document.createElement('canvas');
    c.width = DIAL_W; c.height = DIAL_H;
    cab.dialCtx = c.getContext('2d');
    paintDial(cab.dialCtx);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
    cab.dialTex = tex;
    const D = CAB.dial;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(D.w, D.h), cabShade(new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.4, roughness: 0.8 }), 0.2));
    face.position.set(D.x, D.y, D.z);
    face.lookAt(-0.34, 1.44, 0.98); // tipped back towards the driver's eye
    face.raycast = () => {};
    this.body.add(face);
    cab.face = face;
    const ng = new THREE.BoxGeometry(0.0032, 0.054, 0.002);
    ng.translate(0, 0.02, 0);
    const needle = new THREE.Mesh(ng, new THREE.MeshBasicMaterial({ color: 0xff6a2a }));
    needle.position.set((DIAL_C[0] / DIAL_W - 0.5) * D.w, (0.5 - DIAL_C[1] / DIAL_H) * D.h, 0.003);
    face.add(needle);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.004, 8).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x1a1a1a }));
    hub.position.copy(needle.position).setZ(0.005);
    face.add(hub);
    cab.needle = needle;
    // the omamori on its cord
    cab.charm = new THREE.Group();
    cab.charm.position.copy(CAB.charm);
    cab.charm.add(new THREE.Mesh(S.charm, M.body));
    this.body.add(cab.charm);
    this.gauge(0);
  }

  /** Put the van down at a pose: x, ground height y, z, heading, slope (> 0 tips the nose down, as on a descent). */
  place(x, y, z, heading, slope = 0) {
    this.root.position.set(x, y, z);
    this.root.rotation.set(slope, heading, 0);
    this.root.updateMatrixWorld(true);
  }

  /** Body on its springs: pitch (> 0 nose down), roll (> 0 leans to the van's right, -x), bounce (m). */
  lean(pitch, roll = 0, bounce = 0) {
    this.body.rotation.set(pitch, 0, roll);
    this.body.position.y = bounce;
  }

  /** Front wheels turned by `angle` (> 0 to the left), the steering wheel by `turn` (> 0 clockwise for the driver). */
  steer(angle, turn = -angle * 9) {
    this.wheels[0].rotation.y = this.wheels[1].rotation.y = angle;
    if (this.cab) this.cab.spin.rotation.z = turn;
  }

  /** Speedometer needle (km/h, 0-120). */
  gauge(kmh) {
    const cab = this.cab;
    if (!cab) return;
    cab.kmh += (Math.max(0, Math.min(125, kmh)) - cab.kmh) * 0.35; // a little needle lag
    // the needle's angle on the dial (0 at 7 o'clock, 120 at 5), from its rest pointing up
    cab.needle.rotation.z = SWEEP0 - (cab.kmh / 120) * SWEEP - Math.PI / 2 + Math.sin(cab.kmh * 1.7) * 0.01;
  }

  /** Dashboard lamps: { hand, beam, radio } (repaints the dial only when something changes). */
  lamps(l) {
    const cab = this.cab, k = `${+!!l.hand}${+!!l.beam}${+!!l.radio}`;
    if (!cab || k === cab.lampState) return;
    cab.lampState = k;
    paintDial(cab.dialCtx, l);
    cab.dialTex.needsUpdate = true;
  }

  /** The omamori swings with the cab's acceleration: ax forward, az to the van's left (m/s²). */
  swing(dt, ax = 0, az = 0) {
    const cab = this.cab;
    if (!cab || dt <= 0) return;
    const L = 0.11, g = 9.8, c = 2.2, A = cab.charmA, Vv = cab.charmV;
    const h = Math.min(dt, 1 / 30);
    for (let i = 0; i < 2; i++) {
      const f = i === 0 ? ax : -az;
      Vv[i] += (-(g / L) * Math.sin(A[i]) + (f / L) * Math.cos(A[i]) - c * Vv[i]) * h;
      A[i] = Math.max(-1.1, Math.min(1.1, A[i] + Vv[i] * h));
    }
    cab.charm.rotation.set(A[0], 0, A[1]);
  }

  /** While you sit inside: near-clear windows, and the cab in the roof's shade (direct sun cut to a third). */
  cabGlass(clear) {
    const S = shared(), M = S.mats;
    const parts = [this.bodyMesh, this.doorMesh, this.cab?.spin.children[0], this.cab?.charm.children[0]].filter(Boolean);
    const glass = [this.glassMesh, this.doorGlassMesh];
    if (!clear) { for (const m of parts) m.material = M.body; for (const m of glass) m.material = M.glass; return; }
    if (!Van.clearMats) {
      // no sharp speculars in the cab (they bloom): one even roughness, no env sheen; the glass all but clear
      const b = cabShade(M.body.clone()); b.roughnessMap = null; b.roughness = 0.78; b.envMapIntensity = 0.35;
      const gl = M.glass.clone(); gl.opacity = 0.2; gl.roughnessMap = null; gl.roughness = 0.9; gl.envMapIntensity = 0.2; gl.metalness = 0;
      Van.clearMats = { body: b, glass: gl };
    }
    for (const m of parts) m.material = Van.clearMats.body;
    for (const m of glass) m.material = Van.clearMats.glass;
  }

  setPose(x, z, heading = PARK.heading) {
    this.root.position.set(x, 0, z);
    this.root.rotation.set(0, heading, 0);
    this.root.updateMatrixWorld(true);
  }

  /** Roll the wheels on by `d` metres (and a touch of body bounce). */
  roll(d) {
    this.dist += d;
    const a = this.dist / WR;
    for (const w of this.wheels) w.rotation.x = a;
  }

  /** Body pitch / bounce: pitch > 0 dips the nose (braking). */
  suspend(pitch, bounce = 0) {
    this.body.rotation.x = pitch;
    this.body.position.y = bounce;
  }

  setLights(on) { for (const h of this.heads) h.visible = on; }
  setBrake(on) { for (const b of this.brakes) b.visible = on; }

  /** Driver door open amount 0..1 (it swings out about its front hinge). */
  setDoor(k) {
    this.door = k;
    this.doorPivot.rotation.y = k * 1.15;
  }

  local(x, y, z, out = new THREE.Vector3()) { return this.root.localToWorld(out.set(x, y, z)); }
  /** The driver's eye, sitting in the cab (world). */
  eye(out = new THREE.Vector3()) { return this.local(-0.34, 1.42, 1.0, out); }
  /** A point ahead of the driver, through the windscreen (world). */
  ahead(dist = 10, out = new THREE.Vector3()) { return this.local(-0.34, 1.3, 1.0 + dist, out); }
  /** Where you stand once you're out of the driver's door (world, on the ground). */
  doorStep(out = new THREE.Vector3()) { return this.local(-0.72 - 0.55, 0, 1.04, out); }

  /** Parked for good: something to bump into, a door you can open and shut. */
  park() {
    const g = this.game;
    if (this.parked) return;
    this.parked = true;
    this.root.updateMatrixWorld(true);
    // the footprint the old van had (mirrors and bumpers included), wherever it's parked
    const box = new THREE.Box3();
    for (const [x, z] of [[FOOT.x0, FOOT.z0], [FOOT.x1, FOOT.z0], [FOOT.x0, FOOT.z1], [FOOT.x1, FOOT.z1]]) box.expandByPoint(this.local(x, 0, z));
    box.min.y = 0; box.max.y = FOOT.top;
    this.ob = g.player.addObstacle(box.min.x, box.max.x, box.min.z, box.max.z);
    const c = box.getCenter(new THREE.Vector3()), hs = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    g.physics.addBox({ center: c, half: hs, material: 'metal' });
    g.interaction.add(this.doorMesh, {
      reach: 2.4,
      hint: () => ({ key: 'LMB', text: this.door > 0.5 ? 'Shut the van door' : 'Open the van door', sub: "Grandpa's old van" }),
      use: () => { this.toggleDoor(); return false; },
    });
    g.interaction.add(this.bodyMesh, { reach: 2.4, hint: () => ({ key: '', text: "Grandpa's old van", sub: 'It still smells of his cigarettes' }), use: () => false });
  }

  toggleDoor() {
    const g = this.game, from = this.door, to = from > 0.5 ? 0 : 1;
    const p = this.local(-W, 1.0, 1.04);
    if (to) audio.play('carDoor', { pos: p, vol: 0.8 });
    g.tweens.add({ dur: to ? 0.45 : 0.3, ease: to ? ease.outCubic : ease.inQuad, update: (k) => this.setDoor(from + (to - from) * k), done: () => { if (!to) { audio.play('carDoor', { pos: p, close: true, vol: 1 }); g.player.shake = Math.max(g.player.shake, 0.12); } } });
  }
}
// the parked footprint (van-local): exactly the old voxel van's box, so the lane's obstacles stay where they were
const FOOT = { x0: -0.8, x1: 0.84, z0: -1.72, z1: 1.76, top: 2.17 };
