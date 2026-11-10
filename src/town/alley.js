// The dressing of alley A1, the ghost alley beside Mikawa-ya (src/world/GhostAlley.js runs its story; its positions
// are kept): the old round post box at the mouth, a weathered timber lamp pole with an enamel shade on a bracket arm,
// precast drain lids down the east side, weeds in the cracks, a furled umbrella someone left against the wall, a
// cracked pot with a dead plant and one knocked over, the meter board on Mikawa-ya's flank, and at the
// shrine two small stone lanterns and the offerings (a cup of water, a sake flask, coins, flowers in bamboo tubes).
// Drawn into the lane's batch and the lane's prop instances, so it adds no draw calls of its own.
//   buildAlley(t)
import { hash2 } from '../core/util.js';
import { crown } from './foliage.js';

const POST = [-7.86, 15.25], LAMP = [-7.62, 18.35];

export function buildAlley(t) {
  const B = t.B, m = t.m;
  // 丸型ポスト at the mouth, its slot toward the alley
  t.prop('post_box', POST[0], 0, POST[1], -Math.PI / 2);
  // the lamp: a timber pole (checked, its foot dark with wet), a steel bracket arm with a brace, an enamel shade
  const [lx, lz] = LAMP, sx = lx - 0.56;
  B.lathe(m.wood, [[0.068, 0], [0.066, 0.4], [0.062, 2.95], [0.058, 3.02]], lx, 0, lz, { tint: 0x6a5846, sides: 10, caps: 't' });
  B.lathe(m.wood, [[0.071, 0], [0.069, 0.32]], lx, 0, lz, { tint: 0x3e342a, sides: 10 });
  B.lathe(m.metal, [[0.072, 0], [0.074, 0.02], [0.04, 0.07], [0.001, 0.08]], lx, 3.02, lz, { tint: 0x4a4a46, sides: 10 });
  for (const y of [2.74, 2.86]) B.lathe(m.metal, [[0.066, 0], [0.068, 0.006], [0.068, 0.03], [0.066, 0.036]], lx, y, lz, { tint: 0x3a3a38, sides: 10 });
  B.rod(m.metal, [lx - 0.05, 2.82, lz], [sx, 2.82, lz], 0.016, { tint: 0x3a3a38, sides: 8 });
  B.rod(m.metal, [lx - 0.06, 2.5, lz], [lx - 0.32, 2.81, lz], 0.01, { tint: 0x3a3a38, sides: 6 });
  B.rod(m.metal, [sx, 2.82, lz], [sx, 2.64, lz], 0.009, { tint: 0x2a2a28, sides: 6 });
  const shade = [[0.175, 0], [0.17, 0.008], [0.15, 0.022], [0.09, 0.06], [0.04, 0.09], [0.03, 0.1], [0.022, 0.11]];
  B.lathe(m.gloss, shade, sx, 2.53, lz, { tint: 0x2e5a3e, sides: 14, caps: 't' });
  B.lathe(m.gloss, shade.map(([r, y]) => [r - 0.004, y - 0.003]).reverse(), sx, 2.53, lz, { tint: 0xe8e4d8, sides: 14 });
  B.lathe(m.metal, [[0.02, 0], [0.022, 0.03], [0.018, 0.05]], sx, 2.56, lz, { tint: 0x8a7a50, sides: 8 }); // the socket
  // an enamel number plate and the switch box low on the pole
  B.push(lx + 0.068, 0, lz, Math.PI / 2);
  B.box(m.gloss, 0.08, 0.1, 0.012, 0, 1.58, 0.006, { tint: 0xe8e4d8, bevel: 0.003 });
  B.box(m.metal, 0.07, 0.11, 0.05, 0, 1.2, 0.025, { tint: 0x8a8e88, bevel: 0.008 });
  B.pop();
  B.tube(m.pv, [[sx + 0.02, 2.82, lz + 0.01], [lx - 0.06, 2.84, lz + 0.03], [lx + 0.02, 2.7, lz + 0.07], [lx + 0.02, 1.32, lz + 0.07]], 0.006, { tint: 0x2a2828, sides: 4 });
  // drain lids down the east side: precast slabs with chamfered arrises, hand notches, a few cracked and sunk
  for (let z = 15.6, i = 0; z < 21.5; z += 0.6, i++) {
    const k = hash2(i, 3), sunk = k < 0.2 ? -0.008 : 0;
    B.box(m.concrete, 0.3, 0.035, 0.585, -7.68, sunk, z, { tint: k < 0.2 ? 0x8a8880 : k > 0.7 ? 0xa8a49a : 0x9c988e, bevel: 0.008, uv: [z, i * 0.3] });
    for (const dz of [-0.24, 0.24]) B.box(m.pv, 0.07, 0.004, 0.025, -7.68, 0.034 + sunk, z + dz, { tint: 0x3a3834 });
  }
  B.box(m.pv, 0.3, 0.01, 5.9, -7.68, -0.006, 18.55, { tint: 0x2a2a28 }); // the dark joint line under them
  // weeds where the paving meets the walls
  for (let i = 0; i < 14; i++) {
    const z = 15.4 + hash2(i, 5) * 6.2, west = hash2(i, 6) < 0.5, k = hash2(i, 7);
    t.prop('weeds', west ? -9.2 : -7.5, 0, z, west ? Math.PI / 2 : -Math.PI / 2, { scale: 0.45 + k * 0.4 });
  }
  // a furled umbrella left leaning on the west wall: ferrule, the wrapped canopy, its strap, shaft and J handle
  B.push(-8.98, 0, 17.6, 0);
  const lean = 0.36, up = (y) => [-Math.sin(lean) * y, Math.cos(lean) * y];
  B.lathe(m.pv, [[0.004, 0], [0.008, 0.03], [0.022, 0.08], [0.04, 0.3], [0.046, 0.45], [0.03, 0.62], [0.01, 0.66]], 0, 0, 0, { rz: lean, tint: 0x2a3050, sides: 10 });
  B.lathe(m.pv, [[0.043, 0.36], [0.045, 0.385]], 0, 0, 0, { rz: lean, tint: 0x1a1c2a, sides: 10 });
  const [hx, hy] = up(0.66), [tx, ty] = up(0.8);
  B.rod(m.metal, [hx, hy, 0], [tx, ty, 0], 0.007, { tint: 0x8a8e90, sides: 6 });
  B.tube(m.wood, [[tx, ty, 0], [tx - 0.02, ty + 0.06, 0], [tx - 0.05, ty + 0.1, 0], [tx - 0.1, ty + 0.1, 0], [tx - 0.12, ty + 0.06, 0], [tx - 0.11, ty + 0.03, 0]], 0.012, { tint: 0x6a4a30, sides: 6 });
  B.pop();
  // pots: a cracked one with a dead plant, a smaller one knocked over and its soil spilt
  B.lathe(m.pv, [[0.08, 0], [0.086, 0.012], [0.11, 0.16], [0.124, 0.165], [0.128, 0.18], [0.124, 0.192], [0.112, 0.192]], -9.12, 0, 19.2, { tint: 0xa8583a, sides: 12, caps: 'b' });
  B.cyl(m.dirt, 0.112, 0.112, 0.01, -9.12, 0.17, 19.2, { tint: 0x6a5a48, sides: 12, caps: 't' });
  for (let i = 0; i < 5; i++) { const a = i * 1.3, h = 0.12 + hash2(i, 9) * 0.14; B.rod(m.wood, [-9.12 + Math.cos(a) * 0.03, 0.18, 19.2 + Math.sin(a) * 0.03], [-9.12 + Math.cos(a) * 0.09, 0.18 + h, 19.2 + Math.sin(a) * 0.09], 0.004, { tint: 0x8a7458, sides: 4 }); }
  B.lathe(m.pv, [[0.05, 0], [0.054, 0.01], [0.072, 0.11], [0.082, 0.115], [0.084, 0.126], [0.074, 0.128]], -8.92, 0.08, 19.45, { rz: Math.PI / 2 - 0.08, ry: 0.6, tint: 0x98482a, sides: 12, caps: 'b' });
  B.blob(m.dirt, -8.8, 0.0, 19.52, 0.12, 0.025, 0.08, { tint: 0x6a5440, jitter: 0.3 });
  // the meter board on Mikawa-ya's flank (facing into the alley), its conduit up to the eave
  B.push(-9.3, 0, 18.2, Math.PI / 2);
  B.box(m.wood, 0.26, 0.38, 0.022, 0, 1.18, 0.011, { tint: 0x7a6650 });
  B.box(m.pv, 0.15, 0.2, 0.09, 0, 1.24, 0.065, { tint: 0x4a4a48, bevel: 0.012 });
  t.signInto(B, 'elecMeter', 0, 1.245, 0.111, { w: 0.145 });
  B.tube(m.pv, [[0.05, 1.44, 0.03], [0.05, 2.9, 0.03], [0.12, 3.0, 0.03]], 0.012, { tint: 0x8a8e90, sides: 6 });
  B.pop();
  // the shrine (Neighbours.js puts the library's jizo_shrine at -8.42, 21.4): two small stone lanterns either side
  for (const x of [-9.05, -7.8]) t.prop('stone_lantern', x, 0, 21.0, Math.PI, { scale: 0.6 });
  // offerings on the shrine's stone base: a cup of water, a sake flask, a few coins, flowers in two bamboo tubes
  const yb = 0.19, zo = 21.14; // on the upper step, in front of the Jizō
  B.lathe(m.gloss, [[0.024, 0], [0.028, 0.004], [0.034, 0.05], [0.032, 0.052], [0.03, 0.006]], -8.6, yb, zo, { tint: 0xe8e4dc, sides: 12, caps: 'b' });
  B.cyl(m.gloss, 0.03, 0.03, 0.002, -8.6, yb + 0.045, zo, { tint: 0xc8dce4, sides: 12, caps: 't' });
  B.lathe(m.gloss, [[0.02, 0], [0.036, 0.01], [0.04, 0.05], [0.03, 0.09], [0.012, 0.11], [0.012, 0.13], [0.016, 0.135]], -8.26, yb, zo, { tint: 0xf4f0e6, sides: 12, caps: 'bt' });
  for (let i = 0; i < 4; i++) B.cyl(m.metal, 0.012, 0.012, 0.003, -8.42 + (i % 2) * 0.012, yb + i * 0.0032, zo + (i > 1 ? 0.01 : 0), { tint: i % 2 ? 0xc8a840 : 0xb8bcc0, sides: 10 });
  for (const [x, c] of [[-8.74, 'azalea'], [-8.1, 'azalea']]) {
    B.lathe(m.pv, [[0.026, 0], [0.026, 0.16], [0.024, 0.165]], x, yb, zo, { tint: 0x6a8a48, sides: 10, caps: 't' });
    for (let i = 0; i < 3; i++) B.rod(m.pv, [x, yb + 0.15, zo], [x + (i - 1) * 0.03, yb + 0.28, zo + (i % 2) * 0.02], 0.003, { tint: 0x4a7a34, sides: 4 });
    crown(t, x, yb + 0.3, zo, 0.07, 0.06, 0.06, { kind: c, card: 0.1, density: 3, core: false, seed: Math.round(x * 10) });
  }
}
