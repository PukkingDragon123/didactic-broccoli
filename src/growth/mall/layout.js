// GACHA KAIKAN's floor plan (zone-local metres; every floor is its own zone, see src/growth/data.js ORIGINS).
// A floor is W x D (x -13..13, z -9..9), the front (station side, the 1F entrance) at +z. Floors are FH apart; the
// ceiling is at CH (the slab between shows only round the escalator wells).
//
// Escalators: one pair (an UP lane and a DOWN lane) per gap between two floors, criss-crossing: the 1-2 and 3-4 pairs
// rise toward -z at x ~ +4.5, the 2-3 pair rises toward +z at x ~ -4.5, so the wells of neighbouring gaps never
// overlap. Along a pair, u is the horizontal distance from the start of the bottom landing: a flat FLAT, the incline
// RUN (30 degrees, FH high), a flat FLAT at the top.
// The lift: a car in the west wall (x -12.8..-10.85, z -1..1), doors at x -10.6, identical on every floor so moving
// between floors is a seamless zone swap while the doors are shut.

export const W = 26, D = 18, X0 = -13, X1 = 13, Z0 = -9, Z1 = 9;
export const FH = 4.2, CH = 3.6, FLOORS = 4;
export const FLAT = 1.0, RUN = FH / Math.tan(Math.PI / 6), PATH = FLAT * 2 + RUN;
export const STEP = 0.4;
/** How fast the steps move (m/s along the floor): you ride exactly as fast as the step under you. */
export const SPEED = 1.1;

/** gap g joins floor g and g + 1. x: the pair's centre, dir: -1 rises toward -z, +1 toward +z; zb: where the incline
 *  starts (bottom), lanes: the UP and DOWN lane centres. */
export const GAPS = {
  1: { x: 4.5, dir: -1, zb: 3.6, up: 3.85, down: 5.15 },
  2: { x: -4.5, dir: 1, zb: -3.6, up: -5.15, down: -3.85 },
  3: { x: 4.5, dir: -1, zb: 3.6, up: 3.85, down: 5.15 },
};
for (const G of Object.values(GAPS)) {
  G.z0 = G.zb - G.dir * FLAT; // start of the bottom landing
  G.zt = G.zb + G.dir * RUN; // top of the incline
  G.z1 = G.zt + G.dir * FLAT; // end of the top landing
  // the well: where the upper floor is cut away above the escalator (head room for riders)
  const zc = G.zb + G.dir * RUN * 0.36;
  G.well = { x0: G.x - 1.3, x1: G.x + 1.3, z0: Math.min(zc, G.zt), z1: Math.max(zc, G.zt) };
}
/** Step height above the lower floor at u. */
export const stepY = (u) => Math.min(1, Math.max(0, (u - FLAT) / RUN)) * FH;
/** z of the path at u for a gap. */
export const pathZ = (G, u) => G.z0 + G.dir * u;

export const LIFT = { x0: -12.8, x1: -10.85, z0: -1.0, z1: 1.0, door: -10.6, dw: 0.55, ch: 2.4 };

/** The player's machine spots on each floor: 4 on the back wall, 4 on the east wall. [x, z, rotY] */
export const MALL_SLOTS = [
  [-9.6, -8.42, 0], [-8.5, -8.42, 0], [-7.4, -8.42, 0], [-6.3, -8.42, 0],
  [12.42, -6.0, -Math.PI / 2], [12.42, -4.9, -Math.PI / 2], [12.42, -3.8, -Math.PI / 2], [12.42, -2.7, -Math.PI / 2],
];

/** Walls of route machines: [from, to] along the wall (each module 0.92 wide). */
export const STACK_WALLS = [
  { wall: 'back', runs: [[-12.5, -10.6], [-5.3, 12.5]] },
  { wall: 'east', runs: [[-8.5, -7.0], [-1.7, 8.4]] },
  { wall: 'west', runs: [[-8.5, -7.3], [-4.6, -1.9], [1.9, 8.4]] },
];
export const ISLANDS = [{ x0: -11.2, x1: -7.3, z: -4.2 }, { x0: -11.2, x1: -7.3, z: 4.2 }, { x0: 7.6, x1: 11.4, z: 3.0 }, { x0: 7.6, x1: 10.4, z: -5.0 }, { x0: -1.4, x1: 1.4, z: -5.6 }];
/** A centrepiece on each floor's promenade (voxel props on a round plinth), at (0, CENTRE_Z). */
export const CENTRE_Z = 1.2;

export const THEMES = {
  1: { centre: ['capsule_statue', 'lucky_cat_big'], name: 'Welcome floor', jp: 'ようこそ', a: '#f6e8ec', b: '#e8a8bc', grout: '#c8889c', accent: '#f04a8a', wall: 0xfff4f6, band: 0xf04a8a, stacks: ['red', 'pink', 'yellow', 'blue'] },
  2: { centre: ['rocket', 'astronaut'], name: 'Anime & characters', jp: 'アニメ・キャラ', a: '#eef8f6', b: '#9adcd0', grout: '#6ab8ac', accent: '#2ab8e8', wall: 0xf2fbfd, band: 0x2ab8e8, stacks: ['blue', 'pink', 'green', 'yellow'] },
  3: { centre: ['daruma', 'tin_robot'], name: 'Retro & kaiju', jp: 'レトロ・怪獣', a: '#f4e2c4', b: '#c8784a', grout: '#9a5a38', accent: '#f08a2a', wall: 0xfff2dc, band: 0xc84a2a, stacks: ['red', 'green', 'yellow', 'black'] },
  4: { centre: ['shell_giant', 'macaron_tower'], name: 'Premium & events', jp: 'プレミアム', a: '#2a2630', b: '#5a4a2a', grout: '#d4a83a', accent: '#ffd23f', wall: 0xf4f0e8, band: 0x2a2630, stacks: ['black', 'blue', 'pink', 'red'] },
};

/** Split an outer rectangle into rectangles that cover it except the holes (for floors and ceilings with wells). */
export function minusHoles(outer, holes) {
  const xs = [...new Set([outer.x0, outer.x1, ...holes.flatMap((h) => [h.x0, h.x1])])].filter((x) => x >= outer.x0 && x <= outer.x1).sort((a, b) => a - b);
  const zs = [...new Set([outer.z0, outer.z1, ...holes.flatMap((h) => [h.z0, h.z1])])].filter((z) => z >= outer.z0 && z <= outer.z1).sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
    const cx = (xs[i] + xs[i + 1]) / 2, cz = (zs[j] + zs[j + 1]) / 2;
    if (holes.some((h) => cx > h.x0 && cx < h.x1 && cz > h.z0 && cz < h.z1)) continue;
    out.push({ x0: xs[i], x1: xs[i + 1], z0: zs[j], z1: zs[j + 1] });
  }
  return out;
}
