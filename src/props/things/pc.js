// The two 1998 PCs: the beige one on the garage desk (src/pc/PC.js) and your putty-grey CAPSULE-PC 98 at home
// (src/room/pcModel.js). A CRT with a moulded bezel that funnels in to the glass, the tube housing tapering back to
// its vented neck, a tilt-swivel foot; a mid-tower with its CD-ROM, floppy and blank bays, buttons and lamps; a
// keyboard of single sculpted keycaps with printed legends; a speaker with a real cone; the mouse mat, a mug and a
// floppy disk. Everything static is one mesh (one draw call per atlas slot); the mouse is its own (it moves).
//   pcDeskMesh(kind)  kind 'shop' | 'room', in the PC root's frame (desk top at y = 0, the monitor facing +z)
//   pcMouseMesh(kind) the mouse, bottom centre (sits on the mat)
// The screen opening matches the screen quads the two modules put in: shop 0.32 x 0.24 centred (0, 0.22) at
// z = 0.1105 (monitor at z -0.06), room 0.31 x 0.24 centred (0, 0.255) at z = 0.164 (curved back 8 mm at the corners).
import { thingMesh } from './make.js';
import { loft, cap, atZ, rrect } from './form.js';
import { plastic, rubber, chrome, ceramic, flat, darken, lighten, mix } from '../kit/kit.js';
import { framed } from '../kit/prints.js';

const KINDS = {
  shop: {
    shell: 0xe6dcc4, shellD: 0xd2c6a8, key: 0xf0e8d4, mod: 0xcdbf9e, ink: 0x5a5244, speaker: 0x3a3630, pad: 0x2f6fd6,
    mon: { at: [0, 0, -0.06], y0: 0.05, y1: 0.38, fz: 0.186, back: -0.18, sy: 0.22, sw: 0.32, sh: 0.24, sz: 0.1705, curve: 0, foot: 0.02, fr: 0.105 },
    kb: [0, 0, 0.3], tower: [-0.56, 0, -0.08], spk: [0.36, 0, 0, -0.2], pad: [0.3, 0, 0.32], mug: [-0.3, 0, 0.3], disk: [-0.2, 0, 0.42, 0.3],
  },
  room: {
    shell: 0xdcd8cc, shellD: 0xc6c0b0, key: 0xece8dc, mod: 0xbab4a2, ink: 0x56524a, speaker: 0x3a3836, pad: 0xc8403a,
    mon: { at: [0, 0, -0.02], y0: 0.07, y1: 0.43, fz: 0.205, back: -0.205, sy: 0.255, sw: 0.31, sh: 0.24, sz: 0.184, curve: 0.008, foot: 0.03, fr: 0.12 },
    kb: [0, 0, 0.27], tower: [-0.42, 0, -0.06], spk: [0.3, 0, -0.02, -0.25], pad: [0.3, 0, 0.29],
  },
};

// ------------------------------------------------------------------ the CRT monitor (in its own frame)
function monitor(K, C, kind) {
  const M = C.mon, W = 0.4, H = M.y1 - M.y0, cy = (M.y0 + M.y1) / 2, sh = plastic(C.shell, 0.12), shd = plastic(C.shellD, 0.1);
  const RR = (w, h, r, y = cy) => rrect(w, h, r, 3, 0, y);
  // the bezel and the shell behind it, then the tube housing tapering back to the neck
  const hy = cy + 0.012, back = M.back;
  loft(K, sh, [
    atZ(RR(W - 0.012, H - 0.012, 0.02), M.fz), atZ(RR(W, H, 0.024), M.fz - 0.006), atZ(RR(W, H, 0.024), M.fz - 0.044), atZ(RR(W - 0.018, H - 0.016, 0.02), M.fz - 0.05),
  ]);
  const vents = K.view('vents', { u: (p) => p[0], v: (p) => -p[2], u0: -0.2, u1: 0.2, v0: -M.fz, v1: -back, ppm: 300, rough: 0.7 }, (V) => {
    V.fill(C.shellD);
    for (let k = 0; k < 9; k++) { const v = -back - 0.035 - k * 0.012; V.rect(-0.07, v, 0.07, v - 0.004, darken(C.shellD, 0.45)); V.rect(-0.07, v - 0.004, 0.07, v - 0.005, lighten(C.shellD, 0.15)); }
    V.rect(-0.2, -M.fz + 0.05, 0.2, -M.fz + 0.056, darken(C.shellD, 0.12)); // the seam between the shell halves
  });
  loft(K, vents, [
    atZ(RR(W - 0.018, H - 0.016, 0.02), M.fz - 0.05), atZ(RR(W - 0.05, H - 0.045, 0.04, hy), M.fz - 0.075),
    atZ(RR(0.27, 0.23, 0.05, hy), back + 0.075), atZ(RR(0.205, 0.165, 0.04, hy), back + 0.014), atZ(RR(0.19, 0.15, 0.034, hy), back),
  ]);
  cap(K, shd, RR(0.19, 0.15, 0.034, hy), [], 'z', back, -1);
  // the front face round the screen opening, and the funnel in to the glass
  const oW = M.sw + 0.036, oH = M.sh + 0.034;
  cap(K, sh, RR(W - 0.012, H - 0.012, 0.02), [rrect(oW, oH, 0.012, 3, 0, M.sy)], 'z', M.fz, 1);
  const zg = M.sz + 0.0012;
  loft(K, plastic(darken(C.shell, 0.06), 0.06), [atZ(rrect(oW, oH, 0.012, 3, 0, M.sy), M.fz), atZ(rrect(M.sw + 0.014, M.sh + 0.013, 0.008, 3, 0, M.sy), M.fz - 0.008), atZ(rrect(M.sw + 0.004, M.sh + 0.004, 0.005, 3, 0, M.sy), zg)], { flip: true });
  cap(K, flat(0x141418, 0.15), rrect(M.sw + 0.03, M.sh + 0.03, 0.01, 3, 0, M.sy), [], 'z', M.sz - 0.0015 - M.curve, 1); // the black glass round the picture
  // the chin: badge, knobs, power button
  const chin = M.sy - M.sh / 2 - 0.017, zf = M.fz + 0.0004;
  const badge = K.patch('badge', 52, 10, (V) => {
    V.fill(C.shell);
    const cols = [0xe5383b, 0xf2c21c, 0x58c06c, 0x3f86e8];
    cols.forEach((c, i) => { V.disc(4 + i * 6, 5, 2.4, c); });
    V.text5(kind === 'room' ? 'CAPSULE-PC' : 'GARAGE 98', 27, 8, darken(C.shell, 0.55));
  }, { rough: 0.5 });
  K.face(badge, '+z', -0.17, chin - 0.007, -0.05, chin + 0.0045, zf);
  for (const x of [0.03, 0.058]) { K.cyl(plastic(C.shellD, 0.15), x, chin - 0.002, M.fz - 0.002, 0.0055, 0.008, 12, { axis: 'z' }); K.box(flat(darken(C.shellD, 0.4)), x - 0.0006, chin - 0.0065, M.fz + 0.0058, x + 0.0006, chin + 0.0025, M.fz + 0.0062); }
  K.box(plastic(C.shellD, 0.2), 0.13, chin - 0.008, M.fz - 0.002, 0.168, chin + 0.006, M.fz + 0.005, { bevel: 0.003 });
  K.box(flat(darken(C.shellD, 0.35)), 0.135, chin - 0.0045, M.fz + 0.005, 0.163, chin + 0.0025, M.fz + 0.0054);
  if (kind === 'room') K.glow(() => K.box(0x40ff60, 0.112, chin - 0.003, M.fz - 0.001, 0.12, chin + 0.002, M.fz + 0.0016));
  // the tilt-swivel foot
  K.lathe(shd, [0, 0, 0], [[0, 0], [M.fr - 0.004, 0], [M.fr, 0.004], [M.fr - 0.006, M.foot * 0.7], [M.fr * 0.55, M.foot], [0, M.foot + 0.002]], 16, { sz: 0.82 });
  K.box(shd, -0.055, M.foot - 0.002, -0.05, 0.055, M.y0 + 0.012, 0.045, { bevel: 0.012 });
  // stickers: what the owner stuck on it
  if (kind === 'shop') {
    const note = (key, c, scrib) => K.patch(key, 20, 20, (V) => { V.fill(c); V.box(0, 16, 20, 20, darken(c, 0.08)); for (const [j, w] of scrib) V.box(3, j, 3 + w, j + 1, darken(c, 0.55)); }, { rough: 0.9 });
    const yel = note('note1', 0xf8e070, [[12, 12], [9, 9], [6, 13]]), pink = note('note2', 0xf4a6c8, [[12, 10], [8, 12]]);
    K.at([0.175, M.y1 - 0.03, zf + 0.0006], () => K.face(yel, '+z', -0.019, -0.019, 0.019, 0.019, 0), { rz: -0.14 });
    K.at([-0.18, M.y1 - 0.075, zf + 0.0006], () => K.face(pink, '+z', -0.016, -0.016, 0.016, 0.016, 0), { rz: 0.1 });
    // a capsule toy on top of the set
    K.ball(plastic(0xf06a8a, 0.25), 0.1, M.y1 - 0.004 + 0.0155, 0.06, 0.016, 0.016, 0.016, 12, 4, { y0: -1, y1: 0 });
    K.glass(() => K.ball(K.tint(0xf4f8fa, 90, 0.08), 0.1, M.y1 - 0.004 + 0.0155, 0.06, 0.016, 0.016, 0.016, 12, 4, { y0: 0, y1: 1 }));
    K.ball(plastic(0xf2c21c, 0.2), 0.1, M.y1 - 0.004 + 0.016, 0.06, 0.008, 0.01, 0.008, 8, 3);
  } else {
    const st = K.patch('stickers', 28, 14, (V) => {
      V.fill(C.shell);
      V.disc(6, 7, 5.5, 0xf06a8a); V.box(1, 7, 12, 13, 0xfbf6ea); V.disc(6, 7, 5.5, 0xf06a8a); for (let j = 7; j < 13; j++) for (let i = 1; i < 12; i++) if ((i - 6) ** 2 + (j - 7) ** 2 <= 30) V.px(i, j, 0xfbf6ea); V.hline(1, 11, 7, darken(0xf06a8a, 0.3));
      V.disc(21, 7, 5.5, 0xf2c21c); V.px(19, 8, 0x2a2a2a); V.px(23, 8, 0x2a2a2a); V.hline(20, 22, 5, 0x2a2a2a); V.px(17, 12, 0xf2c21c); V.px(25, 12, 0xf2c21c);
    }, { rough: 0.6 });
    K.face(st, '+z', 0.135, M.y1 - 0.045, 0.19, M.y1 - 0.0175, zf + 0.0002, { sub: [0, 0, 0.5, 1] });
    K.face(st, '+z', -0.193, M.y1 - 0.042, -0.165, M.y1 - 0.0145, zf + 0.0002, { sub: [0.5, 0, 1, 1] });
  }
}

// ------------------------------------------------------------------ the tower (bottom centre, front +z)
function tower(K, C, kind) {
  const sh = plastic(C.shell, 0.12), shd = plastic(C.shellD, 0.12), F = 0.2065;
  for (const x of [-0.07, 0.07]) for (const z of [-0.18, 0.17]) K.cyl(rubber(0x34322e), x, 0, z, 0.009, 0.008, 10);
  K.box(sh, -0.09, 0.008, -0.205, 0.09, 0.404, 0.19, { bevel: 0.004 });
  // the side panel's lip and the screws at the back
  for (const s of [-1, 1]) K.box(shd, s * 0.0905 - 0.0005, 0.02, -0.196, s * 0.0905 + 0.0005, 0.394, 0.182);
  for (const y of [0.05, 0.36]) for (const s of [-1, 1]) K.cyl(chrome(0xa8acb0), s * 0.078, y, -0.205, 0.003, 0.002, 8, { axis: 'z', r1: 0.0028 });
  // the front bezel, moulded: a soft top edge, the lower grille
  K.box(sh, -0.092, 0.006, 0.188, 0.092, 0.41, F - 0.002, { bevel: 0.007 });
  const front = K.view('front', { u: (p) => p[0], v: (p) => p[1], u0: -0.092, u1: 0.092, v0: 0.006, v1: 0.41, ppm: 400, rough: 0.66 }, (V) => {
    V.fill(C.shell);
    for (let k = 0; k < 7; k++) { const y = 0.03 + k * 0.009; V.rect(-0.06, y, 0.06, y + 0.004, darken(C.shell, 0.5)); V.rect(-0.06, y + 0.004, 0.06, y + 0.005, lighten(C.shell, 0.2)); }
    V.rect(-0.092, 0.225, 0.092, 0.227, darken(C.shell, 0.2));
  });
  K.box(front, -0.088, 0.01, F - 0.002, 0.088, 0.405, F);
  // 5.25" bays: a CD-ROM drive and a blank cover; a 3.5" floppy drive
  const drv = plastic(mix(C.shell, 0xd8d0b8, 0.4), 0.12), dk = flat(0x2a2824, 0.3);
  K.box(drv, -0.074, 0.335, F - 0.002, 0.074, 0.377, F + 0.003, { bevel: 0.0015 });
  K.box(dk, -0.07, 0.355, F + 0.003, 0.07, 0.3556, F + 0.0033); // the tray's lip
  K.box(plastic(C.shellD, 0.2), 0.05, 0.34, F + 0.003, 0.066, 0.346, F + 0.006, { bevel: 0.0012 });
  K.cyl(dk, -0.062, 0.341, F + 0.003, 0.0028, 0.002, 8, { axis: 'z' });
  K.cyl(plastic(0x4a4640), -0.048, 0.342, F + 0.003, 0.004, 0.003, 10, { axis: 'z' });
  K.glow(() => K.box(0x3cae5a, 0.034, 0.341, F + 0.003, 0.04, 0.344, F + 0.0036));
  const cdl = K.patch('cdlogo', 30, 8, (V) => { V.fill(mix(C.shell, 0xd8d0b8, 0.4)); V.text5('CD-ROM', 1, 7, darken(C.shell, 0.5)); }, { rough: 0.6 });
  K.face(cdl, '+z', -0.07, 0.364, -0.025, 0.374, F + 0.0032);
  K.box(sh, -0.074, 0.29, F - 0.002, 0.074, 0.331, F + 0.002, { bevel: 0.0015 });
  K.box(drv, -0.052, 0.245, F - 0.002, 0.052, 0.27, F + 0.003, { bevel: 0.0015 });
  K.box(dk, -0.045, 0.2565, F + 0.003, 0.028, 0.2605, F + 0.0034);
  K.box(plastic(C.shellD, 0.2), 0.034, 0.249, F + 0.003, 0.046, 0.254, F + 0.006, { bevel: 0.001 });
  K.glow(() => K.box(0x3cae5a, 0.034, 0.262, F + 0.003, 0.04, 0.2645, F + 0.0036));
  if (kind === 'room') {
    // a floppy left half in the drive
    K.box(plastic(0x2f4a8a, 0.15), -0.044, 0.2575, F + 0.003, 0.0255, 0.2593, F + 0.045);
    K.box(chrome(0xc4c8cc), -0.024, 0.2572, F + 0.03, 0.004, 0.2596, F + 0.045);
  }
  // buttons and lamps
  K.cyl(plastic(C.shellD, 0.25), 0, 0.165, F - 0.002, 0.016, 0.006, 16, { axis: 'z' });
  K.cyl(plastic(C.shell, 0.25), 0, 0.165, F + 0.004, 0.012, 0.004, 16, { axis: 'z' });
  K.cyl(plastic(C.shellD), 0.045, 0.165, F, 0.0045, 0.003, 10, { axis: 'z' });
  K.glow(() => { K.box(0x40ff60, -0.05, 0.2, F, -0.042, 0.204, F + 0.0012); K.box(0xffa040, -0.035, 0.2, F, -0.027, 0.204, F + 0.0012); });
  const badge = K.patch('tbadge', 40, 14, (V) => {
    framed(V, kind === 'room' ? 0xc8352a : 0x2a2e3a, 0x8a8a90);
    V.text5(kind === 'room' ? 'CAPSULE' : 'TURBO', 20, 11, 0xf2ead6, { align: 'center' });
    V.text5(kind === 'room' ? '98' : '333', 20, 5, 0xf2c21c, { align: 'center' });
  }, { rough: 0.4 });
  K.face(badge, '+z', -0.07, 0.1, -0.03, 0.114, F + 0.0002);
}

// ------------------------------------------------------------------ the keyboard (bottom centre, 0.432 x 0.024 x 0.132)
const ROWS = [
  { w: [1.5, 1, 1.5, 7, 1.5, 1, 1.5], t: ['CTL', '', 'ALT', '', 'ALT', '', 'CTL'] },
  { w: [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.75], t: ['', ...'ZXCVBNM,./', ''] },
  { w: [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25], t: ['', ...'ASDFGHJKL;\'', ''] },
  { w: [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5], t: ['', ...'QWERTYUIOP[]', ''] },
  { w: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2], t: [...'`1234567890-=', ''] },
];
function keyboard(K, C, kind) {
  const u = 0.0182, zFront = 0.058, x0 = -0.205, yAt = (z) => 0.0123 + (0.06 - z) * 0.063;
  const caseC = plastic(C.shell, 0.14);
  K.prism(caseC, [[-0.066, 0], [0.066, 0], [0.066, 0.0085], [0.06, 0.0122], [-0.056, 0.0195], [-0.066, 0.021]], { plane: 'zy', a: -0.216, b: 0.216 });
  // the key well: a darker tray the keys stand in
  K.prism(plastic(C.shellD, 0.06), [[0.0602, 0.0122], [0.06, 0.0129], [-0.052, 0.0191], [-0.0522, 0.0185]], { plane: 'zy', a: -0.21, b: 0.21 });
  const keys = [];
  ROWS.forEach((row, r) => { let x = x0; row.w.forEach((w, i) => { keys.push({ x: x + (w * u) / 2, z: zFront - (r + 0.5) * u, w: w * u, d: u, t: row.t[i], mod: w > 1.2 || r === 0 }); x += w * u; }); });
  // the F row (narrower), the arrows, the numpad
  { let x = x0; [1, 0.5, 1, 1, 1, 1, 0.5, 1, 1, 1, 1, 0.5, 1, 1, 1, 1].forEach((w, i) => { if (w === 1) keys.push({ x: x + (w * u) / 2, z: zFront - 5.65 * u, w: u, d: u * 0.8, t: i ? '' : 'ESC', mod: i === 0, esc: i === 0 }); x += w * u; }); }
  const ax = 0.0993;
  keys.push({ x: ax, z: zFront - 1.5 * u, w: u, d: u, t: '', mod: true });
  for (const k of [-1, 0, 1]) keys.push({ x: ax + k * u, z: zFront - 0.5 * u, w: u, d: u, t: '', mod: true });
  const nx = 0.1397;
  for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) {
    if ((r === 0 && c === 1) || (r === 0 && c === 3) || (r === 2 && c === 3)) continue;
    const tall = c === 3 && (r === 1 || r === 3), wide = r === 0 && c === 0;
    keys.push({ x: nx + c * u + (wide ? u / 2 : 0), z: zFront - (r + 0.5) * u + (tall ? u / 2 : 0), w: wide ? 2 * u : u, d: tall ? 2 * u : u, t: r >= 1 && r <= 3 && c < 3 ? String((r - 1) * 3 + c + 1) : r === 0 && c === 0 ? '0' : '', mod: c === 3 });
  }
  const top = K.view('keys', { u: (p) => p[0], v: (p) => -p[2], u0: -0.216, u1: 0.216, v0: -0.066, v1: 0.066, ppm: 640, rough: 0.55 }, (V) => {
    V.fill(C.key);
    for (const k of keys) {
      const c = k.esc && kind === 'room' ? 0xd8483a : k.mod ? C.mod : C.key;
      V.rect(k.x - k.w / 2, -k.z - k.d / 2, k.x + k.w / 2, -k.z + k.d / 2, c);
      // a dished top: lighter towards the front edge
      V.rect(k.x - k.w / 2 + 0.002, -k.z - k.d / 2 + 0.0015, k.x + k.w / 2 - 0.002, -k.z - k.d / 2 + 0.0025, lighten(c, 0.25));
      if (k.t) { const i = V.i(k.x - k.w / 2 + 0.0035), j = V.j(-k.z + k.d / 2 - 0.0028); V.text5(k.t.length > 1 ? k.t.slice(0, 1) : k.t, i, j, k.esc && kind === 'room' ? 0xfbf2e4 : C.ink); }
    }
    // the lamps strip at the back
    V.rect(0.12, 0.052, 0.21, 0.064, darken(C.shell, 0.06));
    for (let k = 0; k < 3; k++) V.rect(0.13 + k * 0.024, 0.056, 0.136 + k * 0.024, 0.059, kind === 'room' && k === 1 ? 0x40ff60 : 0x3a4a3a);
    V.text5('CAPSULE', V.i(-0.2), V.j(0.062), darken(C.shell, 0.4));
  });
  // the top surface of the case takes the strip / the name from the view
  cap(K, top, [[-0.21, 0.052], [0.21, 0.052], [0.21, 0.064], [-0.21, 0.064]].map(([x, z]) => [x, -z]), [], 'y', 0.0201, 1);
  for (const k of keys) {
    const y0 = yAt(k.z) - 0.001, h = 0.0072, c = plastic(k.esc && kind === 'room' ? 0xd8483a : k.mod ? C.mod : C.key, 0.12);
    const bot = rrect(k.w - 0.0016, k.d - 0.0016, 0.0016, 1, k.x, -k.z), tp = rrect(k.w - 0.0046, k.d - 0.0052, 0.0018, 1, k.x, -k.z - 0.0006);
    loft(K, c, [bot.map(([x, z]) => [x, y0, -z]), tp.map(([x, z]) => [x, y0 + h, -z])]);
    cap(K, top, tp.map(([x, z]) => [x, z]).map(([x, z]) => [x, -z]), [], 'y', y0 + h, 1);
  }
  // the cable out of the back
  K.tube(rubber(0x8a8478), [[0, 0.012, -0.066], [0.004, 0.008, -0.08], [0.01, 0.003, -0.1]], 0.0022, 6);
}

// ------------------------------------------------------------------ the mouse (bottom centre)
function mouse(K, C) {
  const y0 = 0.004, dk = darken(C.shell, 0.45);
  // the shell takes its two-button split from a view from above
  const top = K.view('mtop', { u: (p) => p[0], v: (p) => -p[2], u0: -0.028, u1: 0.028, v0: -0.044, v1: 0.04, ppm: 1400, rough: 0.6 }, (V) => {
    V.fill(C.shell); V.rect(-0.0004, -0.043, 0.0004, -0.013, dk); V.rect(-0.026, -0.0136, 0.026, -0.0128, dk);
    V.rect(-0.012, 0.012, 0.012, 0.03, lighten(C.shell, 0.06));
  });
  K.ball(top, 0, y0, 0.003, 0.027, 0.03, 0.039, 14, 5, { y0: 0, y1: 1 });
  K.lathe(plastic(C.shellD, 0.05), [0, y0 - 0.002, 0.003], [[0, 0], [0.026, 0], [0.027, 0.002]], 14, { sz: 39 / 27 });
  // the cable out of the front
  K.tube(rubber(0x8a8478), [[0, y0 + 0.006, 0.041], [0, y0 + 0.002, 0.05], [0.004, 0.0015, 0.065]], 0.0018, 6);
}

// ------------------------------------------------------------------ the speaker (bottom centre, front +z)
function speaker(K, C) {
  const bx = plastic(C.speaker, 0.1);
  K.box(bx, -0.058, 0, -0.06, 0.058, 0.188, 0.055, { bevel: 0.01 });
  const gr = K.patch('grille', 40, 56, (V) => {
    V.fill(0x26241f);
    for (let j = 1; j < 56; j += 2) for (let i = (j >> 1) & 1; i < 40; i += 2) V.px(i, j, 0x34312a);
    V.text5('MEGA', 20, 7, 0x8a8478, { align: 'center' });
  }, { rough: 0.95 });
  K.face(gr, '+z', -0.05, 0.008, 0.05, 0.18, 0.0552);
  // the woofer: surround, cone, dust cap; the tweeter above
  const cone = flat(0x2a2824, 0.6);
  K.lathe(rubber(0x1e1c1a), [0, 0.07, 0.0554], [[0.042, 0], [0.042, 0.002], [0.038, 0.0042], [0.034, 0.002]], 16, { axis: 'z' });
  K.lathe(cone, [0, 0.07, 0.0554], [[0.034, 0.002], [0.013, -0.009], [0.0125, -0.009]], 16, { axis: 'z' });
  K.ball(flat(0x3a3832, 0.4), 0, 0.07, 0.0464, 0.0125, 0.007, 0.0125, 12, 3, { y0: 0, axis: 'z' });
  K.lathe(chrome(0x9a9ea2), [0, 0.142, 0.0554], [[0.016, 0], [0.016, 0.002], [0.011, 0.003]], 14, { axis: 'z' });
  K.ball(chrome(0xb8bcc0), 0, 0.142, 0.0578, 0.01, 0.004, 0.01, 12, 3, { y0: 0, axis: 'z' });
  K.cyl(plastic(0x2a2824, 0.2), 0.04, 0.02, 0.055, 0.0065, 0.008, 12, { axis: 'z' });
  K.glow(() => K.box(0x40ff60, -0.044, 0.018, 0.0552, -0.039, 0.0215, 0.0566));
  K.tube(rubber(0x26262a), [[0, 0.02, -0.06], [0.004, 0.006, -0.075], [0.01, 0.0015, -0.1]], 0.0018, 6);
}

// ------------------------------------------------------------------ desk things
function mat(K, C, kind) {
  const art = K.patch('pad', 64, 54, (V) => {
    V.fill(C.pad);
    // an original pad: a capsule mascot waving, a ring of capsules round it and the shop's name
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; V.disc(32 + Math.cos(a) * 22, 30 + Math.sin(a) * 19, 2.2, [0xf2c21c, 0xfbf6ea, 0x58c06c, 0xe5383b][k % 4]); }
    V.disc(32, 30, 11, 0xfbf6ea); for (let j = 30; j < 42; j++) for (let i = 21; i < 44; i++) if ((i - 32) ** 2 + (j - 30) ** 2 <= 121) V.px(i, j, kind === 'room' ? 0xf2c21c : 0xf06a8a);
    V.hline(21, 43, 30, 0x2a2420);
    V.px(28, 26, 0x2a2420); V.px(36, 26, 0x2a2420); V.hline(30, 34, 23, 0x2a2420); V.px(29, 24, 0x2a2420); V.px(35, 24, 0x2a2420);
    V.text5(kind === 'room' ? 'CAPSULE' : 'GACHA', 32, 9, 0xfbf6ea, { align: 'center' });
  }, { rough: 0.95 });
  K.prism(rubber(0x26262a), rrect(0.2, 0.17, 0.012, 3), { plane: 'xz', a: 0, b: 0.0032 });
  K.face(art, '+y', -0.096, -0.081, 0.096, 0.081, 0.0034);
}
function mug(K) {
  const c = ceramic(0xeee4cc);
  K.lathe(c, [0, 0, 0], [[0, 0], [0.034, 0], [0.036, 0.003], [0.04, 0.088], [0.0405, 0.09], [0.0375, 0.09], [0.0355, 0.086]], 16);
  K.lathe(ceramic(0xe6dcc2), [0, 0, 0], [[0.0355, 0.086], [0.033, 0.01], [0, 0.008]], 16);
  K.lathe(flat(0x4a2a18, 0.15), [0, 0, 0], [[0.0345, 0.07], [0, 0.07]], 16);
  const print = K.patch('mugart', 40, 24, (V) => { V.fill(0xeee4cc); V.disc(20, 13, 7, 0x3a7ad8); V.hline(13, 27, 13, 0xeee4cc); V.disc(20, 13, 3, 0xf2c21c); V.text5('No.1', 20, 4 + 1, 0x3a7ad8, { align: 'center' }); }, { rough: 0.3 });
  K.wrap(print, 0, 0.025, 0.075, 0, 0.0372, { n: 16, arc: Math.PI * 0.7, turn: 0, r1: 0.0398 });
  K.tube(c, [[-0.038, 0.072, 0], [-0.056, 0.07, 0], [-0.062, 0.05, 0], [-0.055, 0.028, 0], [-0.037, 0.024, 0]], 0.005, 4, { flat: [0.012, 0.007], up: [0, 0, 1] });
}
function disk(K) {
  const sh = plastic(0x2a3a78, 0.12);
  K.box(sh, -0.045, 0, -0.047, 0.045, 0.0033, 0.047, { bevel: 0.0008 });
  K.box(chrome(0xb8bcc0), -0.012, 0.0001, -0.047, 0.024, 0.0035, -0.022);
  K.box(flat(0x1a1a20), -0.004, 0.0033, -0.044, 0.008, 0.0036, -0.03);
  const lab = K.patch('disklabel', 40, 26, (V) => { V.fill(0xf2ece0); V.box(0, 22, 40, 26, 0xd8483a); for (const [j, w] of [[17, 30], [12, 22], [7, 26]]) V.box(4, j, 4 + w, j + 1, 0x3a4a8a); V.text5('SAVE', 4, 20, 0x3a4a8a); }, { rough: 0.85 });
  K.face(lab, '+y', -0.036, -0.012, 0.036, 0.04, 0.0034);
}

function desk(kind) {
  return (K) => {
    const C = KINDS[kind];
    K.at(C.mon.at, () => monitor(K, C, kind));
    K.at(C.kb, () => keyboard(K, C, kind));
    K.at(C.tower, () => tower(K, C, kind));
    K.at([C.spk[0], C.spk[1], C.spk[2]], () => speaker(K, C), { ry: C.spk[3] });
    K.at(C.pad, () => mat(K, C, kind));
    if (C.mug) K.at(C.mug, () => mug(K));
    if (C.disk) K.at([C.disk[0], C.disk[1], C.disk[2]], () => disk(K), { ry: C.disk[3] });
  };
}
export function pcDeskMesh(kind = 'shop') {
  return thingMesh('pc', 'desk:' + kind, [-0.66, 0, -0.3, 0.45, 0.44, 0.5], desk(kind), { name: 'pc-desk' });
}
export function pcMouseMesh(kind = 'shop') {
  return thingMesh('pc', 'mouse:' + kind, [-0.027, 0, -0.036, 0.027, 0.034, 0.066], (K) => mouse(K, KINDS[kind]), { name: 'pc-mouse' });
}
