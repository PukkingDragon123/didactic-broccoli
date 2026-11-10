// The neighbourhood's own things, the ones that make a Japanese back lane: the 町内 map board, a bus-stop pole on its
// concrete drum, the ゴミ集積所 collection-day board and a crow notice behind the garbage station, rows of PET bottles
// of water set out against cats, koinobori on a tall pole for the baby's first May, wind chimes, a roadside hokora
// with offerings, a closed barber's faded sign and pole, beer crates outside the old sake and tobacco shop.
//   buildJapan(t)   windChime(t, x, y, z)   petBottles(t, x0, x1, z, n)   koinobori(t, x, z, h)
import * as THREE from 'three';
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

/** こいのぼり: a pole with its spinning wheel, the streamer and three carp, each a tapering windsock that fills and
 *  swings round the pole with the wind (Town.swing). */
export function koinobori(t, x, z, h = 7.2) {
  const B = t.B, m = t.m, K = t.batch(), A = t.atlas.decal;
  B.lathe(m.metal, [[0.036, 0], [0.034, 1.2], [0.022, h]], x, 0, z, { tint: 0xc8ccd0, sides: 6, caps: 't' });
  B.lathe(m.metal, [[0.012, 0], [0.05, 0.03], [0.062, 0.07], [0.05, 0.11], [0.012, 0.13]], x, h, z, { tint: 0xe8c040, sides: 8 });
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; B.extrude(m.metal, [[0, 0], [0.2, -0.035], [0.22, 0], [0.2, 0.035]], -0.004, 0.004, { m: new THREE.Matrix4().makeRotationX(a).setPosition(x + 0.05, h - 0.14, z), tint: k % 2 ? 0xe8c040 : 0xc8483a }); }
  B.lathe(m.metal, [[0.02, 0], [0.02, 0.1]], x, h - 0.14, z, { rz: -Math.PI / 2, tint: 0x8a8e90, sides: 5 });
  [['fuki', 0.6, 1.25, 0.1], ['koi0', 1.3, 1.5, 0.17], ['koi1', 1.95, 1.25, 0.14], ['koi2', 2.5, 1.0, 0.11]].forEach(([key, dy, len, r], i) => {
    const [u0, v0, u1, v1] = A.uv(key), n = 7, sides = 10, P = [], T = [], y0 = -dy, sag = 0.1 + i * 0.02;
    const ring = (k) => { const tt = k / n, rr = r * (1 - 0.55 * tt) * (key === 'fuki' ? 1 - 0.3 * tt : 1), cx = 0.06 + tt * len, cy = y0 - sag * tt * tt * len; return Array.from({ length: sides + 1 }, (_, s2) => { const an = (s2 / sides) * Math.PI * 2; return [cx, cy + Math.cos(an) * rr, Math.sin(an) * rr, u0 + (u1 - u0) * tt, v0 + (v1 - v0) * (0.5 + 0.42 * Math.cos(an))]; }); };
    for (let k = 0; k < n; k++) { const R0 = ring(k), R1 = ring(k + 1); for (let s2 = 0; s2 < sides; s2++) for (const q of [R0[s2], R1[s2], R1[s2 + 1], R0[s2], R1[s2 + 1], R0[s2 + 1]]) { P.push(q[0], q[1], q[2]); T.push(q[3], q[4]); } }
    K.tris(t.cut, P, T, {});
    K.tube(t.cut, [[0, y0 + 0.02, 0], [0.06, y0 + r, 0]], 0.004, { sides: 3 }); K.tube(t.cut, [[0, y0 - 0.02, 0], [0.06, y0 - r, 0]], 0.004, { sides: 3 });
  });
  t.swing(K, new THREE.Matrix4().multiplyMatrices(B.top, new THREE.Matrix4().makeTranslation(x + 0.03, h, z)), { axis: 'y', ph: x, amp: 1 });
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
  // the green crow net (カラスよけネット), bundled up and thrown over the wall top behind the pad until the bags come out,
  // a fold of it hanging down the lane face with its weighted hem
  {
    if (!t._crowNet) { const nm = t.fence.clone(), mp = t.fence.map.clone(); mp.repeat.set(30, 30); mp.needsUpdate = true; nm.map = mp; nm.name = 'crowNet'; t._crowNet = nm; }
    const NM = t._crowNet, yt = 1.462, x0 = -7.15, x1 = -6.0, zw = ZB - 0.075, G = 0x2c7050;
    // the bundle: lumpy, thicker where it was gathered, lying along the coping
    const roll = [], n = 9;
    for (let k = 0; k <= n; k++) { const u = k / n, x = x0 + (x1 - x0) * u; roll.push([x, yt + 0.06 + 0.02 * Math.sin(u * 9.4), zw + 0.025 * Math.sin(u * 6.1 + 1)]); }
    B.tube(m.pv, roll, 0.055, { tint: 0x1f4a36, sides: 10 });
    B.tube(NM, roll, 0.068, { tint: G, sides: 10 });
    for (const [u, r] of [[0.22, 0.085], [0.61, 0.08]]) { const p = roll[Math.round(u * n)]; B.blob(NM, p[0], p[1], p[2], 0.12, r, 0.09, { tint: G, jitter: 0.3, seed: Math.round(u * 50) }); B.blob(m.pv, p[0], p[1], p[2], 0.1, r * 0.8, 0.075, { tint: 0x1f4a36, jitter: 0.3, seed: Math.round(u * 50) }); }
    // the fold down the lane face (out past the coping's nose), its hem in a chain
    const zf = ZB + 0.04, hem = (u) => yt - 0.24 - 0.06 * Math.sin(u * 7.0 + 0.6);
    for (let k = 0; k < 6; k++) {
      const u0 = k / 6, u1 = (k + 1) / 6, xa = x0 + 0.1 + (x1 - x0 - 0.2) * u0, xb = x0 + 0.1 + (x1 - x0 - 0.2) * u1;
      B.face(NM, [xa, hem(u0), zf], [xb, hem(u1), zf], [xb, yt + 0.02, zf - 0.005], [xa, yt + 0.02, zf - 0.005], { both: true, tint: G, uvs: [[xa, hem(u0)], [xb, hem(u1)], [xb, yt], [xa, yt]] });
    }
    const ch = []; for (let k = 0; k <= 12; k++) { const u = k / 12; ch.push([x0 + 0.1 + (x1 - x0 - 0.2) * u, hem(u) - 0.004, zf + 0.004]); }
    B.tube(m.metal, ch, 0.008, { tint: 0x5a5e60, sides: 6 });
  }
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
    // the shrine itself is the prop library's (a tiled gable on posts, two Jizō in red bibs), on a stone step with offerings
    B.box(m.stone, 0.74, 0.12, 0.5, x, 0, z - 0.02, { tint: 0xc8c4b8, bevel: 0.02 });
    t.prop('jizo_shrine', x, 0.12, z - 0.03, 0, { scale: 0.6 });
    B.lathe(m.gloss, [[0.022, 0], [0.026, 0.004], [0.03, 0.05], [0.027, 0.052]], x - 0.2, 0.234, z + 0.15, { tint: 0xe8f0f0, sides: 14, caps: 'b' });
    B.lathe(m.pv, [[0.001, 0], [0.026, 0.006], [0.036, 0.024], [0.032, 0.04], [0.012, 0.05], [0.001, 0.05]], x + 0.2, 0.234, z + 0.15, { tint: 0xf0902a, sides: 14, caps: '' });
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
