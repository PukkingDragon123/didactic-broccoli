// The neighbourhood's own things, the ones that make a Japanese back lane: the 町内 map board, a bus-stop pole on its
// concrete drum, the ゴミ集積所 collection-day board and a crow notice behind the garbage station, rows of PET bottles
// of water set out against cats, koinobori on a tall pole for the baby's first May, wind chimes, a roadside hokora
// with offerings, a closed barber's faded sign and pole, beer crates outside the old sake and tobacco shop.
//   buildJapan(t)   windChime(t, x, y, z)   petBottles(t, x0, x1, z, n)   koinobori(t, x, z, h)
import { hash2 } from '../core/util.js';
import { ZB, ZF } from './layout.js';

/** 風鈴: a glass bell on a string with its paper strip (hangs from local (x, y, z)). */
export function windChime(t, x, y, z, col = 0xa8d8f0) {
  const B = t.B, m = t.m;
  B.box(m.pv, 0.006, 0.14, 0.006, x, y - 0.14, z, { tint: 0x8a8a88 });
  B.lathe(m.gloss, [[0.045, 0], [0.05, 0.03], [0.035, 0.07], [0.008, 0.085]], x, y - 0.225, z, { tint: col, sides: 7 });
  B.box(m.pv, 0.004, 0.1, 0.004, x, y - 0.32, z, { tint: 0x8a8a88 });
  B.box(m.pv, 0.045, 0.16, 0.004, x, y - 0.48, z, { tint: 0xf4e4e0, ry: 0.5 }); B.box(m.pv, 0.045, 0.03, 0.005, x, y - 0.4, z, { tint: 0xe86a7a, ry: 0.5 });
}

/** 猫よけ: n PET bottles of water in a row at the foot of a wall (local frame). */
export function petBottles(t, x0, x1, z, n, seed = 1) {
  const B = t.B, m = t.m;
  for (let i = 0; i < n; i++) {
    const x = x0 + (x1 - x0) * (i + 0.5) / n + (hash2(i, seed) - 0.5) * 0.06, big = hash2(i, seed + 3) < 0.6, s = big ? 1 : 0.7;
    B.lathe(m.gloss, [[0.045 * s, 0], [0.047 * s, 0.01], [0.047 * s, 0.2 * s], [0.03 * s, 0.26 * s], [0.014 * s, 0.285 * s], [0.014 * s, 0.31 * s]], x, 0, z + (hash2(seed, i) - 0.5) * 0.04, { tint: 0xcfe6f0, sides: 6, caps: 'b' });
    B.cyl(m.pv, 0.016 * s, 0.016 * s, 0.02, x, 0.305 * s, z, { tint: [0x3a7ad8, 0xf4f0e6, 0x3aa85a][i % 3], sides: 6 });
    B.cyl(m.pv, 0.048 * s, 0.048 * s, 0.07 * s, x, 0.1 * s, z, { tint: [0xe8f0f4, 0xd8e8d0][i % 2], sides: 6, caps: '' });
  }
}

/** こいのぼり: a pole with a spinning wheel, the streamer and three carp flying toward +x. */
export function koinobori(t, x, z, h = 7.2) {
  const B = t.B, m = t.m;
  B.lathe(m.metal, [[0.035, 0], [0.022, h]], x, 0, z, { tint: 0xc8ccd0, sides: 6, caps: 't' });
  B.blob(m.metal, x, h + 0.09, z, 0.07, 0.07, 0.07, { tint: 0xe8c040, jitter: 0, lo: 0.8 });
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; B.box(m.metal, 0.02, 0.2, 0.05, x + 0.04, h - 0.12 + Math.sin(a) * 0.12, z + Math.cos(a) * 0.12, { rx: a, tint: k % 2 ? 0xe8c040 : 0xc8282a }); }
  [['fuki', 0.55, 1.25], ['koi0', 1.25, 1.5], ['koi1', 1.9, 1.25], ['koi2', 2.45, 1.0]].forEach(([key, dy, w], i) => {
    B.push(x + 0.05, h - dy, z, 0);
    B.push(0, 0, 0, 0.08 * (i % 2 ? 1 : -1));
    t.decalQ(key, w / 2, -0.16 - w * 0.06, 0, { w, cut: true, rz: -0.12 - i * 0.03 });
    B.pop(); B.pop();
  });
  t.game.player.addObstacle(x - 0.08, x + 0.08, z - 0.08, z + 0.08);
}

export function buildJapan(t) {
  const B = t.B, m = t.m, P = t.game.player;
  // ---- 町内案内図: the neighbourhood map board on two steel posts with a little roof (west end, near side)
  {
    const x = -23.55, z = 5.44;
    for (const dx of [-0.66, 0.66]) B.rod(m.metal, [x + dx, 0, z], [x + dx, 1.95, z], 0.03, { tint: 0x7a8a82, sides: 6 });
    B.box(m.metal, 1.28, 0.86, 0.04, x, 0.92, z, { tint: 0x7a8a82 });
    t.sign('mapBoard', x, 0.95, z + 0.022, { w: 1.2 });
    B.face(m.tinroof, [x - 0.78, 1.88, z + 0.2], [x + 0.78, 1.88, z + 0.2], [x + 0.78, 1.98, z - 0.1], [x - 0.78, 1.98, z - 0.1], { tint: 0x6f9a8e, both: true });
    P.addObstacle(x - 0.72, x + 0.72, z - 0.06, z + 0.06);
  }
  // ---- the bus stop: a pole on a concrete drum, the round name sign both ways along the lane, the timetable
  {
    const x = 21.0, z = 14.22;
    B.lathe(m.concrete, [[0.2, 0], [0.22, 0.04], [0.22, 0.26], [0.18, 0.3]], x, 0, z, { tint: 0xb4b0a6, sides: 10, caps: 't' });
    B.rod(m.metal, [x, 0.3, z], [x, 2.45, z], 0.025, { tint: 0xd8dce0, sides: 6 });
    B.push(x, 0, z, Math.PI / 2);
    B.cyl(m.metal, 0.22, 0.22, 0.03, 0, 2.2, -0.015, { rx: Math.PI / 2, tint: 0xe8e4d8, sides: 14 });
    t.sign('busRound', 0, 1.99, 0.018, {}); t.sign('busRound', 0, 1.99, -0.018, { ry: Math.PI });
    B.pop();
    B.push(x, 0, z - 0.03, Math.PI);
    B.box(m.metal, 0.34, 0.46, 0.02, 0, 1.2, 0, { tint: 0xd8dce0 }); t.sign('busTime', 0, 1.22, 0.012, {});
    B.pop();
    P.addObstacle(x - 0.22, x + 0.22, z - 0.22, z + 0.22);
  }
  // ---- behind the garbage station: the collection days and the crow notice on the wall, bottles against cats
  t.sign('gomi', -6.75, 0.62, ZB + 0.006, {});
  t.sign('crowNote', -6.12, 0.82, ZB + 0.006, { rz: -0.03 });
  petBottles(t, 7.65, 8.3, ZB + 0.07, 4, 2);
  petBottles(t, -9.68, -8.78, ZB + 0.07, 6, 3);
  petBottles(t, 4.75, 6.4, ZF - 0.07, 8, 5);
  petBottles(t, -15.0, -13.6, ZB + 0.07, 7, 8);
  petBottles(t, -25.5, -24.4, ZF - 0.08, 5, 11);
  // ---- koinobori for the Watanabes' baby (his first May), over their front yard
  koinobori(t, -2.15, 15.75, 7.4);
  // ---- a roadside hokora at the foot of the embankment: a stone base, a tiny shrine, a jizō in his red bib, offerings
  {
    const x = -25.42, z = 5.58;
    B.box(m.stone, 0.56, 0.42, 0.4, x, 0, z, { tint: 0xd8d4c8, bevel: 0.02 });
    B.box(m.wood, 0.44, 0.44, 0.3, x, 0.42, z - 0.02, { tint: 0x8a6a4a, skip: 'pz' });
    B.box(m.pv, 0.4, 0.4, 0.02, x, 0.44, z - 0.15, { tint: 0x3a2a20 });
    for (const s of [-1, 1]) B.face(m.kawara, [x - 0.3 * 1, 0.86, z + s * 0.24], [x + 0.3, 0.86, z + s * 0.24], [x + 0.3, 1.0, z - 0.02], [x - 0.3, 1.0, z - 0.02], { tint: 0x7e848e, both: true });
    B.rod(m.ridge, [x - 0.32, 1.01, z - 0.02], [x + 0.32, 1.01, z - 0.02], 0.03, { tint: 0x5e646e, sides: 5 });
    B.lathe(m.pv, [[0.07, 0], [0.075, 0.14], [0.05, 0.19], [0.062, 0.24], [0.045, 0.3], [0.01, 0.32]], x, 0.43, z - 0.02, { tint: 0xa9a59c, sides: 7 });
    B.box(m.pv, 0.12, 0.07, 0.02, x, 0.54, z + 0.055, { tint: 0xc8282a });
    B.cyl(m.gloss, 0.025, 0.03, 0.06, x - 0.14, 0.42, z + 0.12, { tint: 0xe8f0f0, sides: 6 });
    B.blob(m.pv, x + 0.13, 0.455, z + 0.13, 0.035, 0.03, 0.035, { tint: 0xf0902a, jitter: 0.05, lo: 0.85 });
    B.cyl(m.pv, 0.02, 0.02, 0.1, x + 0.2, 0.42, z + 0.05, { tint: 0x5a7a5a, sides: 5 }); B.blob(m.pv, x + 0.2, 0.57, z + 0.05, 0.05, 0.05, 0.05, { tint: 0xf4e04a, lo: 0.85 });
    P.addObstacle(x - 0.3, x + 0.3, z - 0.22, z + 0.22);
  }
  // ---- the empty house was a barber's: a faded board over the door, the pole (stopped) beside it
  B.push(17.6, 0, 16.0 - 0.02, Math.PI);
  t.sign('barber', -0.8, 2.52, 0.03, { w: 0.9 });
  B.cyl(m.metal, 0.075, 0.075, 0.07, 0, 2.05, 0.14, { tint: 0xb8bcc0, sides: 8 }); B.cyl(m.metal, 0.075, 0.075, 0.07, 0, 1.38, 0.14, { tint: 0xb8bcc0, sides: 8 });
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2, a1 = ((k + 1) / 8) * Math.PI * 2, r = 0.06, U = t.atlas.trim.uv('barberPole', [k / 8, 0, (k + 1) / 8, 1]); B.face(t.tm, [Math.sin(a) * r, 1.45, 0.14 + Math.cos(a) * r], [Math.sin(a1) * r, 1.45, 0.14 + Math.cos(a1) * r], [Math.sin(a1) * r, 2.05, 0.14 + Math.cos(a1) * r], [Math.sin(a) * r, 2.05, 0.14 + Math.cos(a) * r], { rect: U, tint: 0xd8d4cc }); }
  B.box(m.metal, 0.04, 0.04, 0.14, 0, 2.1, 0.07, { tint: 0x8a8e90 }); B.box(m.metal, 0.04, 0.04, 0.14, 0, 1.36, 0.07, { tint: 0x8a8e90 });
  B.pop();
  // ---- the old sake and tobacco shop: crates left by the shutter
  t.prop('beercrate', -20.15, 0, 5.52, 0.08, { block: true });
  t.prop('beercrate', -20.15, 0.28, 5.52, -0.12);
  t.prop('beercrate', -19.7, 0, 5.5, -0.2);
}
