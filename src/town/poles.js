// Concrete utility poles the way they stand in a Japanese back street, and everything strung between them: an earth
// wire on the cap, a crossarm with three high-voltage pin insulators, cut-out fuses and the leads down to a grey pole
// transformer, a vertical low-voltage rack, service drops to every eave, the telecom bundle on its lashed messenger with
// splice closures and a terminal box, a fluorescent 防犯灯, step bolts, number plates, the yellow-and-black band at car
// height, wrapped advertisements, guy wires with yellow guards at the ends of the line.
//   pole(t, x, z, o) one pole (o: transformer, lamp, ad, hydrant, side: which way the lane lies, -1 = toward -z)
//   buildPoles(t)   the lane's seven poles and all the wires
import { ZP, POLE_X, POLE } from './layout.js';

const CONC = 0xb9b6ad, STEEL = 0x8f979b, WIRE = 0x2a2828, PORC = 0xe8e4d8;
const rad = (y) => 0.165 - (0.165 - 0.095) * (y / POLE.top);

export function pole(t, x, z, o = {}) {
  const B = t.B, m = t.m, s = o.side ?? -1; // the lane side
  B.push(x, 0, z, s < 0 ? 0 : Math.PI);    // local -z = toward the lane
  B.lathe(m.concrete, [[0.165, 0], [0.095, POLE.top]], 0, 0, 0, { sides: 10, tint: CONC, caps: 't' });
  B.lathe(m.hazard, [[rad(0.55) + 0.004, 0.55], [rad(1.45) + 0.004, 1.45]], 0, 0, 0, { sides: 10 });
  B.cyl(m.metal, 0.11, 0.1, 0.06, 0, POLE.top, 0, { tint: STEEL, sides: 8 });
  // step bolts, alternating, from above head height
  for (let y = 1.85, i = 0; y < POLE.top - 0.9; y += 0.45, i++) { const sx = i % 2 ? 1 : -1; B.rod(m.metal, [sx * (rad(y) - 0.02), y, 0], [sx * (rad(y) + 0.14), y, 0], 0.009, { tint: 0x7a7e80, sides: 4 }); }
  // steel bands where the fittings clamp on, each with its bolt lugs
  const band = (y, h = 0.05) => { const r = rad(y) + 0.007; B.lathe(m.metal, [[r, 0], [r + 0.003, 0.008], [r + 0.003, h - 0.008], [r, h]], 0, y, 0, { tint: STEEL, sides: 10 }); for (const sx of [-1, 1]) B.box(m.metal, 0.03, h * 0.7, 0.05, sx * (r + 0.012), y + h * 0.15, 0, { tint: 0x777f83, bevel: 0.006 }); };
  for (const y of [POLE.hv - 0.24, POLE.hv - 0.72, POLE.lv[0] - 0.04, POLE.lv[2] - 0.04, POLE.tel - 0.05, 2.9]) band(y);
  // the high-voltage crossarm, its braces and three pin insulators
  const ya = POLE.hv - 0.2;
  B.box(m.metal, 0.07, 0.07, POLE.arm, 0, ya, -0.1, { tint: STEEL });
  for (const sz of [-1, 1]) B.beam(m.metal, [0, ya - 0.5, 0], [0, ya, sz * 0.55 - 0.1], 0.03, { tint: STEEL });
  for (const dz of [-0.8, -0.4, 0.8]) { B.lathe(m.metal, [[0.012, 0], [0.012, 0.09]], 0, ya + 0.07, dz - 0.1, { tint: STEEL, sides: 5 }); B.lathe(m.gloss, [[0.03, 0], [0.058, 0.012], [0.064, 0.03], [0.058, 0.05], [0.032, 0.058], [0.034, 0.075], [0.052, 0.085], [0.054, 0.1], [0.036, 0.112], [0.03, 0.135], [0.012, 0.14]], 0, ya + 0.14, dz - 0.1, { tint: PORC, sides: 8, caps: 't' }); }
  B.rod(m.metal, [0, POLE.top + 0.06, 0], [0, POLE.top + 0.3, 0], 0.012, { tint: STEEL, sides: 4 });
  // the low-voltage rack: three spools stacked on the far side
  for (const y of POLE.lv) { B.box(m.metal, 0.04, 0.03, 0.12, 0, y - 0.015, rad(y) + 0.05, { tint: STEEL }); B.cyl(m.gloss, 0.03, 0.03, 0.06, 0, y - 0.03, rad(y) + 0.13, { tint: PORC, sides: 6 }); }
  if (o.transformer) {
    const yt = POLE.tr, zt = -(rad(yt) + 0.3);
    B.box(m.metal, 0.5, 0.05, 0.08, 0, yt + 0.5, -rad(yt) - 0.03, { tint: STEEL }); B.box(m.metal, 0.5, 0.05, 0.08, 0, yt + 0.1, -rad(yt) - 0.03, { tint: STEEL });
    B.lathe(m.pv, [[0.2, 0], [0.24, 0.04], [0.24, 0.6], [0.2, 0.66], [0.1, 0.68]], 0, yt, zt, { tint: 0x99a1a3, sides: 10, caps: 'tb' });
    for (let k = 0; k < 6; k++) { const a = Math.PI * (0.2 + k * 0.32); B.box(m.pv, 0.03, 0.44, 0.07, Math.sin(a) * 0.27, yt + 0.1, zt - Math.cos(a) * 0.27 * 0.9, { ry: a, tint: 0x8b9395 }); }
    for (const dx of [-0.1, 0.1]) B.lathe(m.gloss, [[0.03, 0], [0.05, 0.04], [0.03, 0.08], [0.05, 0.12], [0.02, 0.18]], dx, yt + 0.66, zt, { tint: 0x9a6a4a, sides: 6, caps: 't' });
    B.box(m.pv, 0.16, 0.1, 0.02, 0, yt + 0.28, zt - 0.245, { tint: 0xe8e4d8 });
    // cut-outs on a little arm, the leads from the line down through them to the bushings
    const yc = POLE.hv - 0.95;
    B.box(m.metal, 0.6, 0.05, 0.05, 0, yc, -rad(yc) - 0.03, { tint: STEEL });
    for (const dx of [-0.22, 0.22]) {
      B.lathe(m.gloss, [[0.04, 0], [0.05, 0.03], [0.05, 0.2], [0.03, 0.24]], dx, yc - 0.22, -rad(yc) - 0.1, { tint: PORC, sides: 6, caps: 'tb' });
      B.tube(m.pv, [[0, POLE.hv, dx < 0 ? -0.8 : -0.4], [dx, yc + 0.2, -0.35], [dx, yc + 0.02, -rad(yc) - 0.1]], 0.008, { tint: WIRE, sides: 3 });
      B.tube(m.pv, [[dx, yc - 0.22, -rad(yc) - 0.1], [dx * 0.8, yt + 1.0, zt + 0.05], [dx * 0.45, yt + 0.84, zt]], 0.008, { tint: WIRE, sides: 3 });
    }
    B.tube(m.pv, [[0.2, yt + 0.5, zt + 0.1], [0.24, yt + 0.6, 0.1], [0, POLE.lv[1], rad(7.7) + 0.13]], 0.01, { tint: WIRE, sides: 3 });
  }
  if (o.lamp) { // 防犯灯: a bare fluorescent fitting on a short arm
    B.tube(m.metal, [[0, POLE.lamp - 0.2, -rad(5)], [0, POLE.lamp, -0.4], [0, POLE.lamp + 0.02, -0.75]], 0.016, { tint: STEEL, sides: 5 });
    B.box(m.pv, 0.12, 0.06, 0.66, 0, POLE.lamp - 0.04, -0.75, { tint: 0xe8e6de, bevel: 0.015 });
    B.box(t.G, 0.07, 0.03, 0.58, 0, POLE.lamp - 0.07, -0.75, { tint: 0xf4f8ff });
  }
  // telecom: a terminal box, the cable's clamp
  B.box(m.pv, 0.16, 0.24, 0.1, 0.06, POLE.tel - 0.5, -rad(5.2) - 0.05, { tint: 0x9aa09a, bevel: 0.012 });
  B.box(m.metal, 0.06, 0.05, 0.14, 0, POLE.tel - 0.03, -rad(5.5) - 0.06, { tint: STEEL });
  // plates: the power company's number, the telephone company's, a wrapped advertisement, a hydrant sign
  if (!o.bare) { t.sign('poleNo', 0, 2.62, -rad(2.7) - 0.008, { ry: Math.PI }); t.sign('poleNtt', 0.02, 2.36, -rad(2.4) - 0.01, { ry: Math.PI, w: 0.1 }); }
  if (o.ad) { const r = rad(2) + 0.012; for (const [a, u0, u1] of [[-0.62, 0, 0.3], [0, 0.3, 0.7], [0.62, 0.7, 1]]) { B.push(0, 0, 0, Math.PI + a); t.sign(o.ad, 0, 1.55, r * 0.985, { w: 2 * r * Math.tan(0.31) + 0.004, h: 0.9, sub: [u0, 0, u1, 1] }); B.pop(); } }
  if (o.hydrant) { B.box(m.metal, 0.03, 0.03, 0.2, 0, 3.3, -rad(3.3) - 0.1, { tint: STEEL }); B.push(0, 0, -rad(3.3) - 0.2, Math.PI / 2); t.sign('hydrant', 0, 3.1, 0.012, {}); t.sign('hydrant', 0, 3.1, -0.012, { ry: Math.PI }); B.pop(); }
  if (o.sign) { t.sign(o.sign, -0.02, 1.62, -rad(1.8) - 0.012, { ry: Math.PI }); }
  B.pop();
}

/** Cables between two poles at the lane's standard heights (a = [x, z], b = [x, z]). */
function span(t, a, b, i) {
  const B = t.B, m = t.m, W = (y, dz, sag, r = 0.011, o = {}) => B.wire(m.pv, [a[0], y, a[1] + dz], [b[0], y, b[1] + dz], sag, r, { tint: WIRE, ...o });
  W(POLE.top + 0.3, 0, 0.3, 0.008);
  for (const [dz, sag] of [[-0.9, 0.42], [-0.5, 0.46], [0.7, 0.4]]) W(POLE.hv + 0.02, dz, sag, 0.012);
  POLE.lv.forEach((y, k) => W(y, 0.3, 0.36 + k * 0.03, 0.013));
  // the telecom bundle on the lane side: a steel messenger, the fat cable lashed under it, a thinner one below
  W(POLE.tel + 0.16, -0.17, 0.3, 0.007); W(POLE.tel, -0.17, 0.3, 0.03, { sides: 5 }); W(POLE.catv, -0.19, 0.27, 0.02, { sides: 4 });
  for (let k = 1; k < 8; k++) { const tt = k / 8, x = a[0] + (b[0] - a[0]) * tt, y = POLE.tel - 4 * 0.3 * tt * (1 - tt); B.box(m.pv, 0.012, 0.19, 0.012, x, y, a[1] - 0.17, { tint: 0x3a3836 }); }
  if (i % 2 === 0) { const tt = 0.3, x = a[0] + (b[0] - a[0]) * tt, y = POLE.tel - 4 * 0.3 * tt * (1 - tt); B.cyl(m.pv, 0.075, 0.075, 0.6, x - 0.3, y - 0.07, a[1] - 0.17, { rz: -Math.PI / 2, tint: 0x2c2c2e, sides: 8 }); }
}

export function buildPoles(t) {
  const B = t.B, m = t.m, P = t.game.player;
  const opts = [{ ad: 'adPawn' }, { transformer: true, lamp: true, sign: 'hinoyojin' }, { hydrant: true }, { transformer: true, ad: 'adDentist' }, { lamp: true, sign: 'school' }, { transformer: true, hydrant: true, ad: 'adOta' }, { lamp: true }];
  POLE_X.forEach((x, i) => {
    pole(t, x, ZP, opts[i]);
    P.addObstacle(x - 0.2, x + 0.2, ZP - 0.2, ZP + 0.2);
    if (i) span(t, [POLE_X[i - 1], ZP], [x, ZP], i);
  });
  // service drops: power from the low-voltage rack to every eave, a telephone drop to every other house
  const drops = [...t.anchors.near, ...t.anchors.far];
  drops.forEach((p, k) => {
    let best = POLE_X[0];
    for (const x of POLE_X) if (Math.abs(x - p.x) < Math.abs(best - p.x)) best = x;
    B.wire(m.pv, [best, POLE.lv[2], ZP + 0.3], [p.x, p.y, p.z], 0.45, 0.009, { tint: WIRE });
    if (k % 2 === 0) B.wire(m.pv, [best, POLE.tel - 0.4, ZP - 0.15], [p.x + 0.25, p.y - 0.25, p.z], 0.3, 0.006, { tint: WIRE });
  });
  // the garage's own drops (power to the east pier, telephone to the west)
  B.wire(m.pv, [2.6, POLE.lv[2], ZP + 0.3], [3.9, 4.45, 5.15], 0.5, 0.009, { tint: WIRE });
  B.wire(m.pv, [-6.3, POLE.tel - 0.4, ZP - 0.15], [-4.2, 4.45, 5.15], 0.4, 0.006, { tint: WIRE });
  // a guy wire with its yellow guard at each end of the line
  for (const [px, ax] of [[-22.4, -24.0], [24.6, 25.75]]) {
    const top = [px, 7.0, ZP], foot = [ax, 0.05, 14.62], k = 0.3, g1 = foot.map((v, j) => v + (top[j] - v) * k);
    B.rod(m.metal, foot, top, 0.012, { tint: 0x5a5c5e, sides: 4 });
    B.rod(m.pv, foot, g1, 0.045, { tint: 0xe8c234, sides: 6 });
    B.box(m.concrete, 0.3, 0.06, 0.3, ax, 0, 14.62, { tint: 0xb4b0a6 });
    P.addObstacle(ax - 0.2, ax + 0.2, 14.42, 14.82);
  }
}
