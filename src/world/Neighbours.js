// The neighbours' houses on both sides of the lane, each with its own build and its own people's story:
//   near side (facing +z, the garage's side):  NE1 the Suzukis' 1970s prefab with the carport and the kei car,
//     NE2 Mrs. Ota's (the landlady) big mortar house behind an Ōya-stone wall with her bonsai, NE3 SAKURA HEIGHTS (the
//     apartment: six flats, an open corridor, steel stairs), NE4 the Kusakas' old wooden one-storey house with an
//     engawa and a biologist's garden, NW1 the Kimuras (next door, morning-glory screen), NW2 old Mrs. Tanaka's
//     wooden house behind the hedge, NW3 the old tobacco shop (shutter down for good), NW4 Mr. Hatoda's house with
//     the pigeon loft on the roof;
//   far side (facing -z): FW1 the Yabukis' overgrown house, FW2 Mr. Mori's, (Mikawa-ya), FE1 the Watanabes' (a new
//     baby), FE2 the Higashikatas', FE3 the Nijimuras' run-down house, FE4 the Yamadas' modern box, FE5 an empty
//     house for rent, FE6 the rental garages.
// Every house keeps its position, footprint and front door (other systems line up with them).
//
//   buildNeighbours(town) sets town.doors = [{ id, house, family, pos (front door, on the step), gate (where you pass
//     the building line), bell (the intercom you ring, y = its height), rotY (a model facing +z at 0 → faces out of the
//     door), side (+1 near / -1 far), unit? (apartment flat number) }]
import * as THREE from 'three';
import { hash2 } from '../core/util.js';
import { NAME_INDEX } from '../gfx/textures.js';
import { ROOM } from './interiors.js';

const ZB = 5.3, ZF = 14.9;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const N = (n) => NAME_INDEX[n] ?? 0;

export function buildNeighbours(t) {
  t.doors = [];
  nearSide(t);
  farSide(t);
}

/** Register a door: door / gate / bell are [x, z] (bell may carry a height). */
function addDoor(t, id, house, family, door, gate, bell, side, extra = {}) {
  t.doors.push({
    id, house, family, side, rotY: side > 0 ? 0 : Math.PI,
    pos: door ? V(door[0], 0, door[1]) : null,
    gate: gate ? V(gate[0], 0, gate[1]) : null,
    bell: bell ? V(bell[0], bell[2] ?? 1.0, bell[1]) : null,
    ...extra,
  });
}

// ------------------------------------------------------------------ kit (world coordinates unless noted)
/** Prop in the current batch frame (local coordinates). */
function lp(t, id, x, y, z, ry = 0, o = {}) { const w = t.B.world(x, y, z); return t.prop(id, w.x, w.y, w.z, t.B.yaw(ry), o); }

/** Name plate, intercom (and an optional enamel plate / lamp / mailbox) on a gate pillar's lane face. */
function pillarKit(t, x, s, { name, y = 0.95, plate = null, lamp = false, mail = null, top = 1.55, z = null, intercom = true } = {}) {
  const B = t.B, m = t.m, zl = z ?? ((s > 0 ? ZB : ZF) + s * 0.076), ry = s > 0 ? 0 : Math.PI;
  if (name !== undefined) {
    B.box(m.pv, 0.14, 0.27, 0.02, x, y + 0.24, zl + s * 0.01, { tint: 0x5a4030 });
    t.sign('namesL', 0.1, 0.2, x, y + 0.275, zl + s * 0.021, { ry }, [name * 12, 0, 12, 24]);
  }
  if (intercom) {
    B.box(m.pv, 0.1, 0.16, 0.035, x, y, zl + s * 0.017, { tint: 0xd8d4cc });
    B.box(m.pv, 0.07, 0.04, 0.01, x, y + 0.095, zl + s * 0.036, { tint: 0x4a4a48 });
    B.box(m.pv, 0.035, 0.035, 0.012, x, y + 0.03, zl + s * 0.036, { tint: 0xe8e4dc });
    B.box(t.G, 0.012, 0.012, 0.006, x + 0.03, y + 0.13, zl + s * 0.038, { tint: 0x60ff80 });
  }
  if (plate) t.sign(plate.key, plate.w, plate.h, x, plate.y, zl + s * 0.008, { ry });
  if (lamp) {
    B.box(m.pv, 0.22, 0.04, 0.22, x, top, zl - s * 0.15, { tint: 0x2a2a2a });
    B.box(t.G, 0.15, 0.2, 0.15, x, top + 0.04, zl - s * 0.15, { tint: 0xffe0a0 });
    B.box(m.pv, 0.24, 0.05, 0.24, x, top + 0.24, zl - s * 0.15, { tint: 0x2a2a2a });
  }
  if (mail) {
    B.box(m.pv, 0.3, 0.3, 0.12, x, y - 0.5, zl + s * 0.06, { tint: mail });
    B.box(m.pv, 0.2, 0.025, 0.01, x, y - 0.27, zl + s * 0.125, { tint: 0x1a1a1a });
  }
}

/** A free-standing gate pillar (門柱): block or render with a cap. */
function pillar(t, x, z, { h = 1.45, mat = null, tint = 0xffffff, w = 0.32 } = {}) {
  const B = t.B, m = t.m;
  B.box(mat || m.block, w, h, w, x, 0, z, { uv: [x, 0.3], ao: 0.15, tint });
  B.box(m.found, w + 0.06, 0.07, w + 0.06, x, h, z, {});
  t.game.player.addObstacle(x - w / 2, x + w / 2, z - w / 2, z + w / 2);
}

/** A potted plant (local frame): pot + leaves (+ flowers). */
function pot(t, x, y, z, s = 1, leaf = 0x4a8a3a, flower = null) {
  const B = t.B, m = t.m;
  B.box(m.pv, 0.22 * s, 0.2 * s, 0.22 * s, x, y, z, { tint: 0xb4603a });
  B.box(m.pv, 0.26 * s, 0.03 * s, 0.26 * s, x, y + 0.2 * s, z, { tint: 0x9a4e2e });
  B.box(m.pv, 0.3 * s, 0.24 * s, 0.3 * s, x, y + 0.22 * s, z, { tint: leaf });
  B.box(m.pv, 0.2 * s, 0.14 * s, 0.2 * s, x + 0.02, y + 0.44 * s, z, { tint: leaf, k: 1.12 });
  if (flower) for (const [dx, dz] of [[-0.08, 0.06], [0.07, -0.05], [0.04, 0.1]]) B.box(m.pv, 0.06 * s, 0.05 * s, 0.06 * s, x + dx * s, y + 0.46 * s, z + dz * s, { tint: flower });
}

/** 朝顔のグリーンカーテン: morning glory on strings from a planter up to the eave (local frame, on the wall plane z). */
function morningGlory(t, x0, x1, y1, z, seed = 1) {
  const B = t.B, m = t.m;
  B.box(m.pv, x1 - x0, 0.22, 0.22, (x0 + x1) / 2, 0, z + 0.2, { tint: 0x5a8ab0 });
  B.box(m.pv, x1 - x0 - 0.04, 0.04, 0.18, (x0 + x1) / 2, 0.2, z + 0.2, { tint: 0x5a4030 });
  B.box(m.metal, x1 - x0 + 0.1, 0.03, 0.03, (x0 + x1) / 2, y1, z + 0.24, { tint: 0x7a7a78 });
  const n = Math.round((x1 - x0) / 0.16);
  for (let i = 0; i <= n; i++) {
    const x = x0 + i * (x1 - x0) / n;
    B.box(m.pv, 0.008, y1 - 0.22, 0.008, x, 0.22, z + 0.22, { tint: 0x8a9a6a });
    const top = 0.5 + hash2(i, seed) * (y1 - 0.6);
    for (let y = 0.3; y < top; y += 0.14) {
      const k = hash2(i * 13 + Math.round(y * 10), seed);
      B.box(m.pv, 0.1 + k * 0.08, 0.1, 0.05, x + (k - 0.5) * 0.06, y, z + 0.22 + (k - 0.5) * 0.04, { tint: k < 0.5 ? 0x3e7a34 : 0x4f8a3a });
      if (k > 0.78) B.box(m.pv, 0.06, 0.06, 0.03, x + 0.04, y + 0.03, z + 0.26, { tint: k > 0.9 ? 0x6a5ad8 : 0x4a7ae8 });
    }
  }
}

/** 給湯器: a gas water heater on the wall (local frame), with its pipes running down. */
function heater(t, x, y, z) {
  const B = t.B, m = t.m;
  B.box(m.pv, 0.36, 0.5, 0.16, x, y, z + 0.08, { tint: 0xe8e6de });
  t.sign('heaterFace', 0.34, 0.28, x, y + 0.18, z + 0.161);
  for (const [dx, c] of [[-0.1, 0xc8b848], [0, 0xd8d8d0], [0.1, 0xd8d8d0]]) B.box(m.metal, 0.03, y, 0.03, x + dx, 0, z + 0.05, { tint: c });
}

/** A baby stroller (local frame). */
function stroller(t, x, z, ry = 0) {
  const B = t.B, m = t.m;
  B.push(x, 0, z, ry);
  for (const [dx, dz] of [[-0.2, -0.25], [0.2, -0.25], [-0.2, 0.25], [0.2, 0.25]]) B.box(m.pv, 0.04, 0.14, 0.14, dx, 0, dz, { tint: 0x2a2a2a });
  B.box(m.metal, 0.44, 0.04, 0.6, 0, 0.14, 0, { tint: 0xc8ccd0 });
  B.box(m.pv, 0.4, 0.3, 0.5, 0, 0.2, 0.02, { tint: 0xe8a8b8 });
  B.box(m.pv, 0.42, 0.28, 0.3, 0, 0.5, -0.12, { tint: 0xd890a8, rx: -0.3 });
  for (const s of [-1, 1]) B.box(m.metal, 0.025, 0.6, 0.025, s * 0.2, 0.4, 0.3, { rx: -0.45, tint: 0xc8ccd0 });
  B.box(m.pv, 0.44, 0.04, 0.04, 0, 0.95, 0.52, { tint: 0x2a2a2a });
  B.pop();
}

/** 盆栽棚: a two-tier bonsai bench with little trees (local frame). */
function bonsaiShelf(t, x, z, len = 1.6) {
  const B = t.B, m = t.m;
  for (const dx of [-len / 2 + 0.06, len / 2 - 0.06]) for (const dz of [-0.15, 0.15]) B.box(m.wood, 0.06, 0.62, 0.06, x + dx, 0, z + dz, { tint: 0x6a5038 });
  for (const [y, dz] of [[0.36, 0.1], [0.62, -0.08]]) B.box(m.wood, len, 0.04, 0.24, x, y, z + dz, { tint: 0x8a6a48 });
  for (let i = 0; i < 5; i++) {
    const tier = i % 2, px = x - len / 2 + 0.2 + i * (len - 0.4) / 4, py = tier ? 0.66 : 0.4, pz = z + (tier ? -0.08 : 0.1), k = hash2(i, 31);
    B.box(m.pv, 0.2, 0.06, 0.13, px, py, pz, { tint: [0x4a3a5a, 0x8a3a2a, 0x2a4a5a][i % 3] });
    B.box(m.wood, 0.03, 0.12 + k * 0.08, 0.03, px + 0.02, py + 0.06, pz, { tint: 0x5a4030, rz: (k - 0.5) * 0.6 });
    B.box(m.pv, 0.22 + k * 0.08, 0.06, 0.14, px + (k - 0.5) * 0.1, py + 0.17 + k * 0.08, pz, { tint: k < 0.5 ? 0x3e6a2e : 0x4a7a34 });
    B.box(m.pv, 0.14, 0.05, 0.1, px - (k - 0.5) * 0.06, py + 0.24 + k * 0.08, pz, { tint: 0x4f8a3a });
  }
}

/** 鳩舎: the pigeon loft astride a roof (local frame): frame, mesh front, tin roof, landing board, a name board. */
function pigeonLoft(t, x, y, z) {
  const B = t.B, m = t.m, W = 1.5, H = 0.95, D = 1.0;
  B.box(m.wood, W + 0.1, 0.06, D + 0.1, x, y, z, { tint: 0x7a6048 });
  for (const dx of [-W / 2, W / 2]) for (const dz of [-D / 2, D / 2]) B.box(m.wood, 0.06, H, 0.06, x + dx, y, z + dz, { tint: 0x6a5038 });
  for (const dz of [-D / 2]) B.box(m.wood, W, H, 0.04, x, y, z + dz, { tint: 0x8a7050 });
  for (const s of [-1, 1]) B.box(m.wood, 0.04, H, D, x + s * W / 2, y, z, { tint: 0x8a7050 });
  t.quadUV(t.fenceMeshM(), W, H - 0.08, x, y + 0.06, z + D / 2, [0, 0, W / 0.2, (H - 0.08) / 0.2], { tint: 0xc8ccc0 });
  B.box(m.tin, W + 0.3, 0.05, D + 0.3, x, y + H, z - 0.02, { rx: 0.12, tint: 0xb8c0c4 });
  B.box(m.wood, W * 0.7, 0.04, 0.35, x, y + 0.32, z + D / 2 + 0.17, { tint: 0x9a7a58 });
  for (let i = 0; i < 4; i++) B.box(m.metal, 0.012, 0.25, 0.012, x - 0.3 + i * 0.2, y + 0.36, z + D / 2 + 0.05, { tint: 0x9a9a98 });
  t.sign('pigeonBoard', 0.5, 0.15, x, y + H - 0.22, z + D / 2 + 0.02);
}

/** 縁側: a wooden veranda (local frame) along the front: deck on stubby posts, a stone step, garden clogs. */
function engawa(t, x0, x1, base) {
  const B = t.B, m = t.m, d = 0.62;
  B.box(m.woodL, x1 - x0, 0.06, d, (x0 + x1) / 2, base - 0.06, d / 2, { tint: 0xb89870, uv: [0, 0] });
  for (let x = x0 + 0.08; x < x1; x += 0.6) B.box(m.wood, 0.08, base - 0.06, 0.08, x, 0, d - 0.08, { tint: 0x4a3828 });
  B.box(m.wood, x1 - x0, 0.08, 0.06, (x0 + x1) / 2, base - 0.14, d - 0.03, { tint: 0x5a4430 });
  const sx = (x0 + x1) / 2;
  B.box(m.found, 0.6, base * 0.55, 0.4, sx, 0, d + 0.22, { tint: 0xa8a49a, ry: 0.06 });
  for (const s of [-1, 1]) { B.box(m.wood, 0.1, 0.04, 0.24, sx + s * 0.09, base * 0.55, d + 0.22, { tint: 0x8a6a48 }); B.box(m.pv, 0.012, 0.03, 0.12, sx + s * 0.09, base * 0.55 + 0.04, d + 0.26, { tint: 0xd83a2a }); }
}

/** Wooden planks nailed across a window (the Nijimuras' boarded-up room), local frame on the wall. */
function boards(t, x, y, w, h, z = 0.08) {
  const B = t.B, m = t.m;
  for (let i = 0; i < 4; i++) {
    const k = hash2(i, Math.round(x * 10));
    B.box(m.woodL, w + 0.2, 0.14, 0.03, x, y + 0.1 + i * (h - 0.2) / 3, z + i * 0.004, { rz: (k - 0.5) * 0.18, tint: k < 0.5 ? 0x8a7a62 : 0x9a8a70 });
  }
}

// ------------------------------------------------------------------ the near side
function nearSide(t) {
  const m = t.m, B = t.B, s = 1;

  // ---- NE1: the Suzukis. A 1970s light-steel prefab (ribbed enamel panels, low hip roof in brown steel), carport
  t.house({ x: 7.05, z: 1.4, w: 5.2, d: 6.2, wallA: m.prefab, wallB: m.prefab, roof: 'hip', roofM: m.roofMetal, eave: 0.55, verge: 0.45, step: 0.42, rise: 0.08,
    trim: 0x8a7458, corner: 0x8a7458, gutterTint: 0x6a5a4a, antenna: 1.2, balcony: { x0: -2.3, x1: 0.9, futon: 0xf0d8b0, dish: true, tint: 0xb8b0a0 },
    win: [[0, 1.4, 1.5, 1.1, 'lit', { tobukuro: 1, cc: 2, tbTint: 0x8a7458 }], [0, -1.9, 0.7, 0.6, 'frost', { grille: true, sill: 1.3 }], [1, -0.7, 2.6, 1.85, 'lace', { sill: 0.05, room: ROOM.living }],
      [1, 1.8, 1.0, 1.0, 'lit2', { tobukuro: 1, curtain: 3, tbTint: 0x8a7458 }], [0, 2.2, 1.2, 1.0, 'kitchen', { face: 'r' }], [1, 4.0, 1.0, 1.0, 'dark', { face: 'r' }], [1, 2.0, 0.8, 0.9, 'lit3', { face: 'l' }]],
    door: { x: -0.4, kind: 'west', w: 0.95, name: N('鈴木'), porch: 'tile', mail: 0x2a5a8a },
    extra: (Bq, f) => {
      lp(t, 'ac_unit', 0.55, f.fy[1], 0.55, Math.PI);
      heater(t, -1.35, 1.0, 0);
      pot(t, 0.4, 0, 0.35, 0.9, 0x4a8a3a, 0xff8fb2);
    } });
  t.yard(4.35, 9.75, 1.4, ZB - 0.15, m.strip);
  for (const [x, z] of [[4.6, 5.0], [7.5, 5.0], [4.6, 2.0], [7.5, 2.0]]) B.box(m.metal, 0.08, 2.35, 0.08, x, 0, z, { tint: 0xa8acae });
  B.box(m.metal, 3.2, 0.06, 3.5, 6.05, 2.36, 3.5, { rx: -0.05, tint: 0x9aa8b0 });
  B.box(m.metal, 3.2, 0.12, 0.08, 6.05, 2.28, 5.25, { tint: 0x8a9096 });
  for (let x = 4.75; x < 7.4; x += 0.45) B.box(m.metal, 0.03, 0.04, 3.4, x, 2.3, 3.5, { tint: 0x7a8288 });
  t.prop('kei_car', 6.05, 0, 3.15, 0, { block: true });
  t.prop('bicycle', 5.0, 0, 1.9, Math.PI / 2 + 0.2, { scale: 0.62 });
  pillar(t, 7.45, ZB - 0.15, { h: 1.35, mat: m.prefab, tint: 0xd8d0bc, w: 0.3 });
  pillarKit(t, 7.45, s, { name: N('鈴木'), y: 0.92, z: ZB + 0.005 });
  t.blockWall(7.6, 9.75, ZB, s, { gaps: [[8.35, 9.2]], deco: true });
  t.gate(8.35, 9.2, ZB, s);
  t.prop('ac_unit', 9.3, 0, 1.75, 0);
  addDoor(t, 'suzuki', 'NE1', 'Suzuki', [6.65, 1.7], [6.4, ZB], [7.45, ZB + 0.08, 0.92], s);

  // ---- NE2: Mrs. Ota, the landlady. A big mortar house with a glazed blue roof, behind an Ōya-stone wall; her bonsai
  t.house({ x: 13.95, z: 3.9, w: 5.2, d: 6.8, wallA: m.mortarG, wallB: m.mortarG, roofM: m.roofBlue, pent: true, antenna: -1.5, trim: 0x5a6a5a, solar: 0.9, skirt: { h: 0.75 },
    win: [[0, -1.4, 1.6, 1.1, 'lit3', { grille: true, room: ROOM.washitsu, curtain: 0 }], [0, 1.6, 0.8, 0.6, 'frost', { sill: 1.3, grille: true }], [1, -1.2, 1.6, 1.1, 'shoji', { tobukuro: -1 }], [1, 1.4, 1.4, 1.1, 'lit', { hood: true, sudare: 0.7, cc: 4 }],
      [0, 2.0, 1.2, 1.0, 'kitchen', { face: 'l' }], [1, 3.5, 1.0, 0.9, 'lit4', { face: 'l' }], [1, 2.2, 0.8, 0.9, 'dark', { face: 'r' }]],
    door: { x: 0.3, kind: 'genkan', w: 1.3, name: N('太田'), porch: 'stone', milk: false }, ac: [[1, 0.12]] });
  t.yard(11.3, 16.6, 3.9, ZB - 0.15, m.ground);
  // stepping stones from the gate, the bonsai bench, a stone lantern
  for (const [x, z, r] of [[14.15, 4.95, 0.1], [14.3, 4.45, -0.2]]) B.box(m.found, 0.5, 0.05, 0.36, x, 0, z, { ry: r, tint: 0xb8b4ac });
  B.push(0, 0, 0); bonsaiShelf(t, 12.4, 4.55, 1.5); B.pop();
  t.prop('stone_lantern', 15.2, 0, 4.35, -0.3, { scale: 0.65 });
  t.blockWall(11.3, 16.6, ZB, s, { gaps: [[13.6, 14.6]], mat: m.oya, h: 1.35 });
  t.gate(13.6, 14.6, ZB, s, 0.6);
  // a little tiled roof over the gate, her name and her agency's enamel plate on the pillars
  B.box(m.wood, 1.5, 0.08, 0.2, 14.1, 1.72, ZB - 0.08, { tint: 0x3a3430 });
  for (let j = 0; j < 2; j++) B.box(m.roofBlue, 1.7 - j * 0.3, 0.07, 0.6 - j * 0.2, 14.1, 1.8 + j * 0.07, ZB - 0.08, {});
  pillarKit(t, 14.72, s, { name: N('太田'), y: 0.95 });
  pillarKit(t, 13.48, s, { intercom: false, plate: { key: 'otaFudosan', w: 0.27, h: 0.18, y: 0.9 } });
  t.prop('ac_unit', 16.35, 0, 1.6, -Math.PI / 2);
  addDoor(t, 'ota', 'NE2', 'Ota', [14.25, 4.2], [14.1, ZB], [14.72, ZB + 0.08, 0.95], s);

  // ---- NE3: SAKURA HEIGHTS
  apartment(t, 19.35, 2.2);

  // ---- NE4: the Kusakas. An old wooden one-storey house (下見板, ibushi tiles, rafters) and a biologist's garden
  t.house({ x: 24.2, z: 2.6, w: 2.9, d: 5.8, floors: 1, h1: 2.6, base: 0.5, wallA: m.board, roofM: m.roofIbushi, eave: 0.7, verge: 0.3, barge: 0x2a2018, rafters: true, soffit: 0x6a5a48, gutterTint: 0x6a6460,
    win: [[0, 0.65, 1.3, 1.25, 'lit3', { tobukuro: -1, sill: 0.7, room: ROOM.washitsu, curtain: 0, tbTint: 0x4a3828, frame: 0x5a4a38 }], [0, 2.4, 1.2, 1.0, 'lit', { face: 'l', frame: 0x5a4a38 }]],
    door: { x: -0.85, kind: 'wood', w: 0.95, name: N('日下'), porch: 'stone', lamp: -1, milk: false, umbrella: false, noCanopy: true },
    extra: (Bq, f) => {
      engawa(t, -0.1, 1.42, f.base);
      // specimen jars and seedling trays on the engawa, pots along the front
      for (let i = 0; i < 4; i++) { Bq.box(m.gloss, 0.1, 0.16, 0.1, 0.05 + i * 0.16, f.base, 0.25, { tint: [0xb8d8c8, 0xc8d8b0, 0xd8e8e0, 0xa8c8b8][i] }); Bq.box(m.pv, 0.11, 0.03, 0.11, 0.05 + i * 0.16, f.base + 0.16, 0.25, { tint: 0x8a6a48 }); }
      Bq.box(m.pv, 0.5, 0.06, 0.32, 1.0, f.base, 0.3, { tint: 0x2a2a2a });
      for (let i = 0; i < 6; i++) Bq.box(m.pv, 0.06, 0.05, 0.06, 0.82 + (i % 3) * 0.17, f.base + 0.06, 0.22 + Math.floor(i / 3) * 0.15, { tint: 0x5aa84a });
      pot(t, -0.3, 0, 0.9, 1.1, 0x3e7a34);
      pot(t, 1.25, 0, 1.15, 0.8, 0x4f8a3a, 0xffd23f);
      // a loofah trellis (へちま棚) along the west side
      for (const dz of [0.2, 1.5]) Bq.box(m.wood, 0.05, 2.0, 0.05, -1.75, 0, dz, { tint: 0x8a7a5a });
      Bq.box(m.wood, 0.05, 0.05, 1.4, -1.75, 2.0, 0.85, { tint: 0x8a7a5a });
      for (let i = 0; i < 9; i++) { const k = hash2(i, 77); Bq.box(m.pv, 0.08, 0.2 + k * 0.2, 0.18, -1.75, 1.0 + k * 0.9, 0.25 + i * 0.15, { tint: k < 0.5 ? 0x3e7a34 : 0x5a9a42 }); if (k > 0.7) Bq.box(m.pv, 0.07, 0.3, 0.07, -1.72, 1.4 + k * 0.3, 0.3 + i * 0.15, { tint: 0x7aa84a }); }
    } });
  t.yard(22.75, 25.7, 2.6, ZB - 0.15, m.ground);
  // a bamboo garden gate (枝折戸) beside the little post, bamboo fences
  for (const x of [24.15, 25.2]) t.prop('bamboo_fence', x, 0, ZB - 0.1, 0);
  t.blockWall(22.6, 22.8, ZB, s, { pillars: false });
  for (const x of [22.85, 23.55]) B.box(m.wood, 0.07, 1.2, 0.07, x, 0, ZB - 0.08, { tint: 0x8a7a5a });
  for (let i = 0; i < 8; i++) B.box(m.pv, 0.04, 0.95, 0.03, 23.0 + i * 0.07, 0.1, ZB - 0.3 - i * 0.05, { tint: 0xc8b070, ry: -0.6 });
  for (const y of [0.3, 0.85]) B.box(m.pv, 0.62, 0.035, 0.035, 23.25, y, ZB - 0.45, { tint: 0xa88a50, ry: -0.6 });
  pillarKit(t, 22.7, s, { name: N('日下'), y: 0.75, z: ZB + 0.005 });
  t.prop('pine_tree', 25.1, 0, 3.9, 0.6, { scale: 0.75 });
  t.prop('stone_lantern', 24.95, 0, 4.75, -0.4, { scale: 0.7 });
  addDoor(t, 'kusaka', 'NE4', 'Kusaka', [23.35, 2.95], [23.2, ZB], [22.7, ZB + 0.08, 0.75], s);

  // ---- NW1: the Kimuras, right next door. Mortar ground floor, siding above, morning glory on the kitchen window
  t.house({ x: -7.05, z: 3.4, w: 5.25, d: 7.0, wallA: m.mortarP, wallB: m.siding, roofM: m.roofBrown, pent: true, antenna: 1.0, trim: 0x4a3a2a,
    win: [[0, -1.2, 1.6, 1.15, 'kitchen', { grille: true }], [0, 1.7, 0.8, 0.6, 'frost', { sill: 1.3 }], [1, -1.4, 1.5, 1.1, 'lit2', { tobukuro: -1, cc: 1 }], [1, 1.3, 1.5, 1.1, 'tv', { cc: 5 }],
      [0, 2.4, 1.0, 1.0, 'lit4', { face: 'l' }], [1, 1.8, 1.0, 0.9, 'dark', { face: 'l' }]],
    door: { x: 0.6, kind: 'genkan', w: 1.2, lamp: -1, mail: 0x8a8e92, name: N('木村'), porch: 'tile' }, ac: [[1, -0.05]],
    extra: (Bq, f) => { morningGlory(t, -2.1, -0.3, f.fy[1] - 0.4, 0.05, 3); heater(t, 2.2, 1.0, 0); } });
  t.yard(-9.75, -4.35, 3.4, ZB - 0.15, m.strip);
  t.blockWall(-9.75, -4.35, ZB, s, { gaps: [[-5.35, -4.6]], deco: true });
  pillarKit(t, -5.47, s, { name: N('木村'), y: 0.95, lamp: true, top: 1.63 });
  t.prop('plant_pots', -8.6, 0, 4.85, Math.PI, { scale: 0.75 });
  addDoor(t, 'kimura', 'NW1', 'Kimura', [-6.45, 3.7], [-4.97, ZB], [-5.47, ZB + 0.08, 0.95], s);

  // ---- NW2: old Mrs. Tanaka. A 1960s wooden two-storey (mortar below, grey siding above, rafters) behind the hedge
  t.house({ x: -12.55, z: 3.7, w: 5.2, d: 6.6, wallA: m.mortar, wallB: m.wallGrey, roofM: m.roofIbushi, pent: true, balcony: { x0: -0.6, x1: 2.3, pots: 3, tint: 0x9a8a72 }, antenna: -1.4, trim: 0x4a3828, rafters: true, soffit: 0x7a6a58,
    win: [[0, -1.3, 1.6, 1.1, 'lit2', { flowers: true, room: ROOM.living, curtain: 1, cc: 0 }], [0, 1.6, 1.2, 1.1, 'shoji', { grille: true }], [1, 0.85, 2.4, 1.85, 'lit4', { sill: 0.05, room: ROOM.washitsu, curtain: 2 }], [1, -1.6, 1.2, 1.0, 'dark', { hood: true }],
      [0, 2.5, 1.2, 1.0, 'kitchen', { face: 'r' }], [1, 2.2, 1.0, 0.9, 'lit', { face: 'r' }], [1, 3.2, 0.9, 0.9, 'lit3', { face: 'l' }]],
    door: { x: 0.1, kind: 'wood', w: 1.2, name: N('田中'), porch: 'stone' },
    extra: (Bq, f) => {
      // a wind chime (風鈴) under the balcony eave, a long-wire radio antenna to the ridge
      Bq.box(m.pv, 0.008, 0.18, 0.008, 2.1, f.top - 0.3, 0.6, { tint: 0x8a8a88 });
      Bq.box(m.gloss, 0.1, 0.09, 0.1, 2.1, f.top - 0.4, 0.6, { tint: 0xa8d8f0 });
      Bq.box(m.pv, 0.05, 0.16, 0.008, 2.1, f.top - 0.58, 0.6, { tint: 0xe86a7a });
      pot(t, -0.85, 0, 0.45, 0.8, 0x4a8a3a, 0xe5383b);
      pot(t, 0.95, 0, 0.42, 0.7, 0x3e7a34);
    } });
  t.yard(-15.2, -9.9, 3.7, ZB - 0.15, m.ground);
  t.blockWall(-15.2, -9.9, ZB, s, { h: 0.5, gaps: [[-10.95, -10.1]] });
  for (const x of [-14.15, -12.15]) t.prop('hedge', x, 0.5, ZB - 0.32, 0);
  pillar(t, -11.12, ZB - 0.15, { h: 1.3 });
  pillarKit(t, -11.12, s, { name: N('田中'), y: 0.85, z: ZB + 0.012 });
  t.prop('stray_cat_sit', -13.4, 1.1, ZB - 0.25, 0.3);
  addDoor(t, 'tanaka', 'NW2', 'Tanaka', [-12.45, 4.0], [-10.52, ZB], [-11.12, ZB + 0.08, 0.85], s);

  // ---- NW3: the old tobacco shop, shutter down for good: boards upstairs, the little tobacco window still there
  t.house({ x: -18.0, z: ZB - 0.02, w: 5.15, d: 7.0, wallA: m.siding, wallB: m.board, roofM: m.roofGrey, trim: 0x3a2a20, rafters: true, soffit: 0x6a5a48,
    win: [[1, -1.3, 1.4, 1.0, 'lit2', { tobukuro: 1, room: ROOM.washitsu, curtain: 1, cc: 6, frame: 0x6a5a48 }], [1, 1.3, 1.4, 1.0, 'dark', { grille: true, frame: 0x6a5a48 }], [0, 3.0, 1.0, 0.9, 'dark', { face: 'r' }], [1, 3.4, 1.0, 0.9, 'lit', { face: 'r' }]],
    extra: (Bq, f) => {
      // a drying pole (物干し竿) sticking out of the upstairs window with a towel on it
      Bq.box(m.metal, 0.04, 0.04, 1.4, 1.3, f.fy[1] + 1.2, 0.6, { tint: 0x7ab0d8 });
      Bq.box(m.pv, 0.4, 0.5, 0.02, 1.3, f.fy[1] + 0.72, 0.95, { tint: 0xf4f0e6, ry: 0.1 });
    } });
  B.box(m.shutterM, 2.53, 2.1, 0.06, -18.715, 0.4, ZB + 0.01, { uv: [0, 0.3] });
  B.box(m.metal, 2.75, 0.3, 0.32, -18.715, 2.5, ZB + 0.1, { tint: 0x7a7e7a });
  B.box(t.T('oldSign', 96, 24, { rough: 0.9 }), 3.9, 0.55, 0.06, -18.2, 2.85, ZB + 0.04, { unit: true });
  t.sign('closedNotice', 0.32, 0.42, -18.4, 1.25, ZB + 0.045);
  // the tobacco window: red plate, sliding glass, a tiled counter ledge
  B.box(t.T('tobaccoWin', 24, 36, { glow: 0.25, rough: 0.4 }), 0.7, 1.05, 0.06, -16.9, 0.85, ZB + 0.01, { unit: true });
  B.box(m.tile, 0.84, 0.08, 0.3, -16.9, 0.82, ZB + 0.15, { tint: 0xc84a3a });
  B.box(m.pv, 0.84, 0.42, 0.06, -16.9, 0.4, ZB + 0.04, { tint: 0x8a3a2a });
  B.box(m.pv, 0.6, 0.1, 0.25, -16.9, 0.9, ZB + 0.14, { tint: 0x2a2a2a });
  t.prop('vending', -16.05, 0, 5.68, 0, { dim: true, block: true });
  t.prop('weeds', -19.6, 0, 5.45, 0.2);
  addDoor(t, 'tobacco', 'NW3', 'the old tobacco shop', null, [-18.7, ZB], [-16.9, ZB + 0.2, 1.1], s);

  // ---- NW4: Mr. Hatoda, the pigeon man: a garden house with the loft on the roof
  t.house({ x: -23.25, z: 2.0, w: 4.8, d: 6.0, wallA: m.wallCream, wallB: m.wallCream, roofM: m.roofGreen, pent: true, trim: 0x5a4a3a,
    win: [[0, -0.9, 1.8, 1.15, 'shoji', { tobukuro: 1 }], [1, 0.9, 1.4, 1.0, 'lit', { sudare: 0.65, cc: 3 }], [1, -1.3, 0.9, 0.9, 'dark'], [0, 2.4, 1.0, 1.0, 'kitchen', { face: 'r' }]],
    door: { x: 1.3, kind: 'genkan', w: 1.2, lamp: -1, name: N('鳩田') },
    extra: (Bq, f) => {
      pigeonLoft(t, -1.0, f.ridge - 0.25, -3.0);
      for (const [x, y, z, r] of [[-0.6, f.ridge + 0.72, -2.9, 0.3], [-1.3, f.ridge + 0.72, -3.2, 2.6], [-1.0, f.ridge - 0.28, -2.38, 0.1], [0.8, f.ridge - 0.02, -3.0, 1.4], [1.3, f.ridge - 0.02, -3.0, -1.6]]) lp(t, 'pigeon', x, y, z, r);
    } });
  t.yard(-25.7, -20.85, 2.0, ZB - 0.15, m.ground);
  t.blockWall(-25.7, -20.85, ZB, s, { gaps: [[-22.6, -21.8]] });
  t.gate(-22.6, -21.8, ZB, s, 0.2);
  pillarKit(t, -22.72, s, { name: N('鳩田'), y: 0.95, mail: 0x8a8e92 });
  t.prop('pine_tree', -24.7, 0, 3.6, 0.2);
  t.prop('laundry_pole', -23.4, 0, 3.75, 0, { scale: 0.85 });
  addDoor(t, 'hatoda', 'NW4', 'Hatoda', [-21.95, 2.3], [-22.2, ZB], [-22.72, ZB + 0.08, 0.95], s);

  // second row behind (skyline over the roofs). The east half is the park now (src/world/Park.js); the west half stays
  // clear of the museum behind the garage
  for (const [x, w, h] of [[-23, 6, 6.2], [-17, 5.5, 7.4], [-13.2, 3.4, 5.8]]) t.backHouse(x, -6.3, w, 7, h, 1);
}

/** SAKURA HEIGHTS: six flats (101-103, 201-203), an open corridor with a railing, steel stairs, meters, washing
 *  machines, umbrellas, the mailbox bank, bicycles and the landlady's vacancy board. */
function apartment(t, x, z) {
  const B = t.B, m = t.m, W = 5.0, D = 7.0;
  t.house({ x, z, w: W, d: D, wallA: m.wallBlue, wallB: m.wallBlue, roof: 'shed', roofM: m.tin, eave: 0.6, step: 0.5, rise: 0.08, trim: 0x8a8e92, gutterTint: 0x7a7e82, tiles: false,
    win: [[0, -1.75, 0.6, 0.5, 'frost', { sill: 1.45, grille: true }], [0, 0.0, 0.6, 0.5, 'frost', { sill: 1.45, grille: true }], [0, 1.75, 0.6, 0.5, 'kitchen', { sill: 1.45, grille: true, lit: 0.9 }],
      [1, -1.75, 0.6, 0.5, 'kitchen', { sill: 1.45, grille: true }], [1, 0.0, 0.6, 0.5, 'frost', { sill: 1.45, grille: true }], [1, 1.75, 0.6, 0.5, 'frost', { sill: 1.45, grille: true }],
      [0, 2.5, 1.2, 1.0, 'lit2', { face: 'l' }], [1, 2.5, 1.2, 1.0, 'dark', { face: 'l' }], [0, 5.0, 1.2, 1.0, 'tv', { face: 'l' }], [1, 5.0, 1.2, 1.0, 'lit', { face: 'l' }]] });
  B.push(x, 0, z, 0);
  const fy = [0.4, 3.05], units = [];
  for (const [i, fl] of [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]]) {
    const dx = -1.15 + i * 1.75, y = fy[fl], no = fl * 3 + i;
    units.push([dx, fl]);
    B.box(t.doorMats.apt, 0.85, 1.95, 0.1, dx, y, 0, { unit: true });
    for (const sd of [-1, 1]) B.box(m.metal, 0.05, 2.0, 0.08, dx + sd * 0.45, y, 0.02, { tint: 0x8a8478 });
    // ceiling light over each door, room number and name slot, the meters and a water heater beside it
    B.box(t.G, 0.12, 0.06, 0.12, dx + 0.6, y + 2.15, 0.25, { tint: hash2(i, fl) < 0.6 ? 0xfff0c0 : 0x9a9a8a });
    t.sign('aptNos', 0.16, 0.08, dx, y + 2.03, 0.056, {}, [(no % 3) * 16, Math.floor(no / 3) * 8, 16, 8]);
    if (no !== 1) t.sign('namesL', 0.06, 0.12, dx + 0.32, y + 1.5, 0.056, {}, [(12 + no) % 17 * 12, 0, 12, 24]);
    B.box(m.pv, 0.3, 0.4, 0.1, dx - 0.65, y + 0.2, 0.08, { tint: 0x9aa4a8 });
    B.box(m.pv, 0.22, 0.3, 0.12, dx - 0.65, y + 1.75, 0.07, { tint: 0xd8d4c8 });
    B.box(m.gloss, 0.12, 0.08, 0.02, dx - 0.65, y + 1.9, 0.135, { tint: 0x2a2c2e });
    if (fl === 1) {
      // upstairs: washing machines on the corridor, an umbrella or two
      if (i !== 1) { B.box(m.pv, 0.55, 0.85, 0.55, dx - 0.62, y, 0.62, { tint: 0xf0eee6 }); B.box(m.pv, 0.5, 0.05, 0.5, dx - 0.62, y + 0.85, 0.62, { tint: 0x9ab0c0 }); B.box(m.pv, 0.12, 0.03, 0.02, dx - 0.62, y + 0.7, 0.9, { tint: 0x3a3a3a }); }
      t.umbrellaStand(dx + 0.62, y, 0.3, no);
    } else if (i !== 1) t.umbrellaStand(dx + 0.6, y - 0.4, 0.35, no);
  }
  // 2F corridor: slab with a drip edge, a see-through steel railing, columns, a lamp under the slab
  B.box(m.conc, W + 0.9, 0.18, 1.2, 0.45, fy[1] - 0.18, 0.6, { k: 0.95 });
  B.box(m.pv, W + 0.92, 0.06, 0.06, 0.45, fy[1] - 0.24, 1.18, { tint: 0x8a8680 });
  B.box(m.pv, W + 0.9, 0.2, 0.08, 0.45, fy[1], 1.16, { tint: 0xd8dce0 });
  B.box(m.metal, W + 0.9, 0.05, 0.07, 0.45, fy[1] + 1.05, 1.16, { tint: 0x8a9096 });
  for (let u = -W / 2; u <= W / 2 + 0.9; u += 0.12) B.box(m.metal, 0.022, 0.85, 0.022, u, fy[1] + 0.2, 1.16, { tint: 0x9aa0a6 });
  for (const cx of [-W / 2 + 0.05, 0, W / 2 + 0.85]) B.box(m.metal, 0.1, fy[1], 0.1, cx, 0, 1.15, { tint: 0x8a9096 });
  B.box(t.T('aptName', 48, 20), 0.9, 0.36, 0.04, -1.4, fy[1] + 0.35, 1.21, { unit: true });
  t.sign('aptRecruit', 0.4, 0.26, 1.2, fy[1] + 0.4, 1.205);
  // futons and towels hung over the corridor railing
  B.box(m.pv, 1.1, 0.5, 0.06, 2.35, fy[1] + 0.6, 1.23, { tint: 0xd8e8f0 });
  B.box(m.pv, 1.1, 0.06, 0.16, 2.35, fy[1] + 1.06, 1.16, { tint: 0xd8e8f0 });
  B.box(m.pv, 0.35, 0.45, 0.03, -1.8, fy[1] + 0.65, 1.21, { tint: 0xf2a0b8 });
  // steel stairs on the east end rising along -z: treads, stringers, a landing, a handrail
  const sx = W / 2 + 0.45, n = 14;
  const rx = -Math.atan2(fy[1] - 0.2, 3.3);
  for (let i = 0; i < n; i++) { B.box(m.metal, 0.75, 0.04, 0.26, sx, 0.2 + (i + 1) * (fy[1] - 0.2) / n - 0.04, -2.95 + i * 0.24, { tint: 0x7a8288 }); B.box(m.metal, 0.75, 0.14, 0.02, sx, 0.2 + (i + 1) * (fy[1] - 0.2) / n - 0.14, -2.95 + i * 0.24 - 0.12, { tint: 0x6a7278 }); }
  for (const dx of [-0.4, 0.4]) B.box(m.metal, 0.05, 0.25, 4.36, sx + dx, 1.6 - 0.125, -1.3, { rx, tint: 0x6a7278 });
  B.box(m.metal, 0.04, 0.04, 4.36, sx + 0.42, 2.5, -1.3, { rx, tint: 0xc8ccd0 });
  for (let k = 0; k < 6; k++) { const zz = -2.8 + k * 0.6, yy = 0.2 + (k * 0.6 + 0.15) / 3.3 * (fy[1] - 0.2); B.box(m.metal, 0.025, 0.9, 0.025, sx + 0.42, yy, zz, { tint: 0xc8ccd0 }); }
  B.box(m.metal, 0.06, 0.9, 0.06, sx + 0.42, 0.2, -2.95, { tint: 0xc8ccd0 });
  B.box(m.found, 0.9, 0.2, 0.5, sx, 0, -3.2, {});
  // under the stairs: a bicycle and a tricycle, rust on the stringers
  lp(t, 'mamachari', sx + 0.05, 0, -0.2, Math.PI / 2 + 0.1);
  B.box(m.pv, 0.3, 0.3, 0.45, sx, 0.15, 0.85, { tint: 0xd8282a });
  for (const dz of [0.68, 1.02]) B.box(m.pv, 0.04, 0.2, 0.2, sx + 0.17, 0, 0.85 + (dz - 0.85) * 1.6, { tint: 0x2a2a2a });
  // mailboxes on a post with the six slots, the corridor's gas pipe
  B.box(m.metal, 0.9, 0.55, 0.32, -2.0, 0.9, 1.0, { tint: 0xb8bcc0 });
  for (let i = 0; i < 6; i++) B.box(m.pv, 0.13, 0.12, 0.02, -2.38 + (i % 3) * 0.29 + 0.07, 1.0 + Math.floor(i / 3) * 0.24, 1.17, { tint: 0x9aa0a6 });
  B.box(m.metal, 0.08, 0.9, 0.08, -2.0, 0, 1.0, { tint: 0x8a8e92 });
  B.box(m.metal, W - 0.3, 0.04, 0.04, 0, fy[1] - 0.32, 0.05, { tint: 0xc8b848 });
  B.pop();
  t.yard(16.8, 22.65, z, ZB - 0.15, m.strip);
  t.blockWall(16.8, 22.65, ZB, 1, { h: 0.9, gaps: [[18.6, 20.2]], pillars: false });
  t.prop('mamachari', 21.2, 0, 4.3, Math.PI / 2 - 0.1, { block: true });
  t.prop('scooter', 17.6, 0, 4.2, -Math.PI / 2 + 0.2, { block: true });
  t.prop('recycle_cage', 17.35, 0, 2.95, 0, { block: true });
  // the yard is walkable: the building, columns, stairs and mailbox post are obstacles
  const P = t.game.player;
  P.addObstacle(x - W / 2 - 0.05, x + W / 2 + 0.05, z - D, z + 0.08);
  for (const cx of [-W / 2 + 0.05, 0, W / 2 + 0.85]) P.addObstacle(x + cx - 0.08, x + cx + 0.08, z + 1.07, z + 1.23);
  P.addObstacle(x + W / 2 + 0.02, x + W / 2 + 0.9, z - 3.2, z + 1.05);
  P.addObstacle(x - 2.08, x - 1.92, z + 0.92, z + 1.08);
  P.addObstacle(16.75, 16.95, z, ZB); P.addObstacle(22.55, 22.75, z, ZB);
  P.addObstacle(16.8, 18.6, ZB - 0.17, ZB); P.addObstacle(20.2, 22.65, ZB - 0.17, ZB);
  addDoor(t, 'heights', 'NE3', 'Sakura Heights 101', [x - 1.15, z + 0.3], [x - 1.15, z + 0.3], [x - 1.15 - 0.42, z + 0.1, 1.3], 1, { unit: '101', atDoor: true });
  units.forEach(([dx, fl], i) => { if (i) t.doors.push({ id: 'heights' + (fl ? 201 + i - 3 : 101 + i), house: 'NE3', family: 'Sakura Heights ' + (fl ? 201 + i - 3 : 101 + i), side: 1, rotY: 0, pos: V(x + dx, fy[fl], z + 0.3), gate: V(19.4, 0, ZB), bell: V(x + dx - 0.42, fy[fl] + 1.3, z + 0.1), unit: String(fl ? 201 + i - 3 : 101 + i), atDoor: true }); });
}

// ------------------------------------------------------------------ the far side
function farSide(t) {
  const m = t.m, B = t.B, s = -1;

  // ---- FW1: the Yabukis. Rain shutters shut upstairs, the garden gone wild, a note on the gate
  t.house({ x: -23.25, z: 16.3, w: 4.8, d: 7, side: s, wallA: m.wallGrey, wallB: m.wallGrey, roofM: m.roofBlue, pent: true, antenna: -1,
    win: [[0, 1.0, 1.6, 1.1, 'lit', { cc: 3, curtain: 4 }], [1, 1.0, 1.6, 1.1, 'lace', { amado: true, tobukuro: 1 }], [1, -1.4, 0.9, 0.9, 'dark', { amado: true, tobukuro: -1 }], [0, 2.5, 1.0, 1.0, 'kitchen', { face: 'r' }], [1, 2.8, 1.0, 0.9, 'dark', { face: 'r' }]],
    door: { x: -1.1, kind: 'genkan', w: 1.2, name: N('矢吹'), milk: false }, ac: [[1, -0.35]],
    extra: (Bq, f) => { for (let i = 0; i < 5; i++) lp(t, 'weeds', -2.0 + i * 0.9, 0, 0.5 + hash2(i, 5) * 0.6, i, { scale: 1.2 + hash2(i, 6) * 0.6 }); } });
  t.yard(-25.7, -20.85, ZF + 0.15, 16.3, m.ground);
  t.woodFence(-25.7, -20.85, ZF, s, { gaps: [[-22.15, -21.3]] });
  t.gate(-22.15, -21.3, ZF, s, 0.5);
  t.prop('hedge', -24.5, 0.9, ZF + 0.25, Math.PI + 0.3, { scale: 1.2 });
  pillarKit(t, -21.18, s, { name: N('矢吹'), y: 1.0, z: ZF - 0.04 });
  t.sign('patrolNote', 0.22, 0.2, -22.05, 1.35, ZF - 0.07, { ry: Math.PI });
  addDoor(t, 'yabuki', 'FW1', 'Yabuki', [-22.15, 16.0], [-21.72, ZF], [-21.18, ZF - 0.1, 1.0], s);

  // ---- FW2: old Mr. Mori (hard of hearing; the TV is always on), a futon out on the balcony
  t.house({ x: -18.1, z: 15.9, w: 5.0, d: 7, side: s, wallA: m.mortar, wallB: m.mortarP, roofM: m.roofBrown, pent: true, balcony: { x0: -2.1, x1: 0.8, futon: 0xfbf8f0, futonX: -0.2 },
    win: [[0, -1.3, 1.6, 1.1, 'tv', { grille: true }], [0, 1.4, 1.2, 1.1, 'dark', { room: ROOM.washitsu }], [1, -0.65, 2.4, 1.85, 'lit2', { sill: 0.05, room: ROOM.washitsu, curtain: 1, cc: 2 }], [1, 1.6, 0.9, 0.9, 'lit', { sudare: 0.7 }], [0, 2.3, 1.0, 1.0, 'kitchen', { face: 'l' }], [1, 3.3, 0.9, 0.9, 'dark', { face: 'l' }]],
    door: { x: 0.9, kind: 'wood', w: 1.1, lamp: -1, mail: 0x3a6a3a, name: N('森'), porch: 'stone' } });
  t.yard(-20.6, -15.55, ZF + 0.15, 15.9, m.strip);
  t.blockWall(-20.6, -15.55, ZF, s, { gaps: [[-18.6, -17.7]] });
  pillarKit(t, -18.72, s, { name: N('森'), y: 0.95 });
  t.prop('vending', -17.0, 0, 14.45, Math.PI, { dim: true, block: true });
  t.prop('vending', -16.0, 0, 14.45, Math.PI, { dim: true, block: true });
  t.prop('drink_cans', -16.5, 0, 13.9, 0.6);
  t.prop('bonsai', -19.9, 0, 15.3, 0.4, { scale: 1.4 });
  addDoor(t, 'mori', 'FW2', 'Mori', [-19.0, 15.6], [-18.15, ZF], [-18.72, ZF - 0.08, 0.95], s);

  // (corner shop x∈[-15.45,-9.4] is built separately; alley A1 x∈[-9.4,-7.45] is the ghost alley, src/world/GhostAlley.js)
  B.box(m.block, 0.15, 1.9, 2.5, -9.47, 0, 21.2, { ao: 0.15 });
  t.prop('jizo_shrine', -8.42, 0, 21.4, Math.PI, { block: true });
  t.prop('mirror_pole', -8.45, 0, 5.52, 0, { block: true });
  t.prop('tomare_sign', -7.15, 0, 14.72, 0, { block: true });
  B.box(m.block, 0.15, 1.9, 7.6, -7.38, 0, 18.6, { uv: [0, 0], ao: 0.15 });
  B.box(m.found, 0.21, 0.07, 7.6, -7.38, 1.9, 18.6);
  B.box(m.block, 2.2, 1.9, 0.15, -8.42, 0, 22.45, { ao: 0.15 });

  // ---- FE1: the Watanabes, with a new baby: tiny clothes on the line, a stroller by the door, a card on the bell
  t.house({ x: -4.5, z: 16.5, w: 5.4, d: 7, side: s, wallA: m.wallCream, wallB: m.wallBeige, roofM: m.roofGrey, pent: true, antenna: 1.4, balcony: { x0: -2.4, x1: 0.2, small: true, colors: [0xfbf8f0, 0xf8c8d8, 0xc8e0f8, 0xfff0b0, 0xfbf8f0], pots: 1 },
    win: [[0, -1.4, 1.6, 1.1, 'lit2', { room: ROOM.living, curtain: 1, cc: 4 }], [0, 1.6, 0.8, 0.6, 'frost', { sill: 1.3, grille: true }], [1, -1.1, 1.6, 1.85, 'lit', { sill: 0.05, curtain: 2 }], [1, 1.5, 1.2, 1.0, 'lit3', { room: ROOM.kid, curtain: 4, cc: 5, lit: 0.45 }],
      [0, 2.5, 1.0, 1.0, 'kitchen', { face: 'l' }], [1, 3.0, 1.0, 0.9, 'dark', { face: 'r' }]],
    door: { x: 0.3, kind: 'genkan', w: 1.2, mail: 0xc83a2a, name: N('渡辺') }, ac: [[1, 0.2]],
    extra: () => { stroller(t, 1.3, 0.55, 0.3); } });
  t.yard(-7.4, -1.7, ZF + 0.15, 16.5, m.ground);
  t.blockWall(-7.4, -1.7, ZF, s, { gaps: [[-4.4, -3.5]], clean: [[-6.5, -4.55]] });
  t.gate(-4.4, -3.5, ZF, s, 0.45);
  pillarKit(t, -3.38, s, { name: N('渡辺'), y: 0.95, plate: { key: 'babySign', w: 0.13, h: 0.13, y: 0.62 } });
  addDoor(t, 'watanabe', 'FE1', 'Watanabe', [-4.8, 16.2], [-3.95, ZF], [-3.38, ZF - 0.08, 0.95], s);

  // ---- FE2: the Higashikatas. A tidy 1980s two-tone house: brick-tile skirt, slate roof, a Western front door
  t.house({ x: 1.4, z: 16.6, w: 5.8, d: 7, side: s, wallA: m.wallBeige, wallB: m.wallCream, roofM: m.roofSlate, pent: true, pentM: m.roofSlate, balcony: { x0: -0.4, x1: 2.6, dish: true }, trim: 0x3a2a20, skirt: { h: 0.6, mat: m.brick }, corner: 0xe8e4da,
    win: [[0, -1.6, 1.6, 1.1, 'lit', { flowers: true, cc: 1 }], [0, 1.6, 1.2, 1.0, 'kitchen', { grille: true }], [1, 1.1, 2.6, 1.85, 'lace', { sill: 0.05 }], [1, -1.9, 1.0, 1.0, 'lit2', { hood: true, room: ROOM.kid, curtain: 3 }],
      [0, 2.2, 1.0, 1.0, 'lit4', { face: 'r' }], [1, 2.5, 1.0, 0.9, 'dark', { face: 'l' }]],
    door: { x: -0.1, kind: 'west', w: 1.0, lamp: -1, name: N('東方'), porch: 'tile' } });
  t.yard(-1.7, 4.45, ZF + 0.15, 16.6, m.strip);
  t.blockWall(-1.7, 4.45, ZF, s, { gaps: [[3.0, 3.8]], deco: true });
  pillarKit(t, 2.88, s, { name: N('東方'), y: 0.95, lamp: true, top: 1.63 });
  addDoor(t, 'josuke', 'FE2', 'Higashikata', [1.5, 16.3], [3.4, ZF], [2.88, ZF - 0.08, 0.95], s);

  // ---- FE3: the Nijimuras. Run down: a boarded-up window, shutters shut, weeds, a rusty gate
  t.house({ x: 7.25, z: 16.0, w: 5.3, d: 7, side: s, wallA: m.mortarG, wallB: m.mortarG, roofM: m.roofGrey, pent: true, antenna: -1.2,
    win: [[0, -1.2, 1.8, 1.15, 'shoji', { tobukuro: 1 }], [0, 1.7, 0.8, 0.6, 'frost', { sill: 1.3 }], [1, -1.3, 1.5, 1.1, 'empty', { lit: 0, curtain: 0 }], [1, 1.4, 1.5, 1.1, 'dark', { amado: true, tobukuro: 1 }],
      [0, 2.6, 1.1, 1.0, 'lit', { face: 'l', curtain: 4, cc: 0 }], [1, 2.6, 1.0, 0.9, 'dark', { face: 'r' }]],
    door: { x: 0.4, kind: 'genkan', w: 1.2, name: N('虹村'), milk: false }, ac: [[1, 0.05]],
    extra: (Bq, f) => {
      boards(t, -1.3, f.fy[1] + 0.85, 1.5, 1.1);
      for (let i = 0; i < 6; i++) Bq.quad(t.decal('stainDrip', 16, 48), 0.6, 1.4 + hash2(i, 9), -2.2 + i * 0.85, f.fy[1] - 1.2 - hash2(i, 8) * 0.6, 0.013, { tint: 0x9a968c, flipU: i % 2 === 1 });
      for (let i = 0; i < 4; i++) lp(t, 'weeds', -2.0 + i * 1.3, 0, 0.45, i * 1.7, { scale: 1.3 });
    } });
  t.yard(4.55, 9.95, ZF + 0.15, 16.0, m.ground);
  t.blockWall(4.55, 9.95, ZF, s, { h: 0.55, gaps: [[6.9, 7.8]] });
  for (const x of [5.6, 8.85]) t.prop('hedge', x, 0.55, ZF + 0.3, Math.PI, { scale: 1.1 });
  t.gate(6.9, 7.8, ZF, s, 0.08);
  pillar(t, 7.92, ZF + 0.15, { h: 1.25 });
  pillarKit(t, 7.92, s, { name: N('虹村'), y: 0.85, z: ZF - 0.012 });
  addDoor(t, 'okuyasu', 'FE3', 'Nijimura', [6.85, 15.7], [7.35, ZF], [7.92, ZF - 0.08, 0.85], s);

  // ---- FE4: the Yamadas' modern box (shed roof in blue steel); purple curtains drawn upstairs (Lord Kuromaru's lair)
  t.house({ x: 12.7, z: 18.4, w: 5.0, d: 6.4, side: s, wallA: m.wallGrey, wallB: m.siding, roof: 'shed', roofM: m.roofMetalB, eave: 0.5, step: 0.4, rise: 0.1, trim: 0x2a2a2a, gutterTint: 0x3a3a3a, corner: 0x3a3a3a,
    win: [[0, -1.5, 1.4, 1.1, 'lit2', { room: ROOM.living, curtain: 3 }], [1, -0.6, 2.8, 0.9, 'lit', { sill: 0.9, room: ROOM.kid, curtain: 4, cc: 6, lit: 0.7 }], [1, 1.9, 0.6, 0.9, 'dark'], [0, 2.4, 1.0, 1.0, 'kitchen', { face: 'l' }], [1, 3.4, 1.0, 0.9, 'tv', { face: 'r' }]],
    door: { x: 1.2, kind: 'west', w: 0.95, mail: 0x2a2a2a, name: N('山田'), porch: 'tile' } });
  t.yard(10.15, 15.3, ZF, 18.4, m.strip);
  t.prop('scooter', 11.3, 0, 16.5, Math.PI / 2 + 0.2, { block: true });
  t.prop('mamachari', 14.4, 0, 16.0, -Math.PI / 2 - 0.15, { block: true });
  t.prop('mirror_pole', 10.6, 0, 14.6, Math.PI, { block: true });
  // a modern "function post" (機能門柱): name, intercom, mailbox and a light on one slim post
  B.box(m.metal, 0.22, 1.35, 0.14, 10.45, 0, ZF + 0.35, { tint: 0x3a3a3c });
  B.box(m.pv, 0.26, 0.3, 0.2, 10.45, 0.55, ZF + 0.33, { tint: 0x5a5a5c });
  B.box(t.G, 0.16, 0.05, 0.06, 10.45, 1.3, ZF + 0.29, { tint: 0xfff0d0 });
  t.game.player.addObstacle(10.3, 10.6, ZF + 0.23, ZF + 0.47);
  pillarKit(t, 10.45, s, { name: N('山田'), y: 0.95, z: ZF + 0.28 });
  addDoor(t, 'yamada', 'FE4', 'Yamada', [11.5, 18.1], [11.2, ZF], [10.45, ZF + 0.2, 0.95], s);

  // ---- FE5: an empty house for rent: shutters closed, no washing, weeds, the agency's board on the gate
  t.house({ x: 18.2, z: 16.0, w: 5.2, d: 7, side: s, wallA: m.mortarP, wallB: m.wallCream, roofM: m.roofBrown, pent: true, solar: -0.6, balcony: { x0: -2.2, x1: 0.6, laundry: false },
    win: [[0, -1.4, 1.6, 1.1, 'empty', { lit: 0, curtain: 0 }], [0, 1.6, 1.0, 1.0, 'dark', { grille: true, amado: true }], [1, -0.8, 2.4, 1.85, 'dark', { sill: 0.05, amado: true }], [1, 1.6, 1.0, 1.0, 'dark', { amado: true, tobukuro: 1 }],
      [0, 2.6, 1.0, 1.0, 'empty', { face: 'r', lit: 0, curtain: 0 }], [1, 3.1, 1.0, 0.9, 'dark', { face: 'l' }]],
    door: { x: 1.4, kind: 'genkan', w: 1.1, lamp: -1, name: N('伊藤'), milk: false, umbrella: false } });
  t.yard(15.5, 20.9, ZF + 0.15, 16.0, m.strip);
  t.blockWall(15.5, 20.9, ZF, s, { gaps: [[16.4, 17.3]] });
  t.gate(16.4, 17.3, ZF, s, 0.0);
  pillarKit(t, 17.42, s, { y: 0.95, plate: { key: 'forRent', w: 0.28, h: 0.36, y: 0.55 } });
  t.prop('plant_pots', 19.6, 0, 14.53, Math.PI, { scale: 0.8 });
  for (let i = 0; i < 4; i++) t.prop('weeds', 16.0 + i * 1.3, 0, 15.4 + hash2(i, 3) * 0.4, i, { scale: 1.1 });
  addDoor(t, 'forrent', 'FE5', 'For rent', [16.8, 15.7], [16.85, ZF], [17.42, ZF - 0.08, 0.95], s);

  // ---- FE6: rental garages (貸しガレージ); the pirate's flag on the roof of the left one
  B.push(23.4, 0, 15.2, Math.PI);
  B.box(m.found, 4.7, 0.12, 5.2, 0, 0, -2.6);
  B.box(m.tin, 4.6, 2.7, 5.0, 0, 0.1, -2.6, { uv: [0, 0], ao: 0.2 });
  for (const dx of [-1.15, 1.15]) {
    B.box(m.shutterM, 2.0, 2.2, 0.05, dx, 0.1, 0.02);
    B.box(m.metal, 2.2, 0.26, 0.3, dx, 2.3, 0.12, { tint: 0x7a7e7a });
    B.box(m.pv, 0.3, 0.12, 0.02, dx + 0.6, 1.9, 0.06, { tint: 0xf4f0e6 });
    B.box(m.pv, 0.14, 0.18, 0.012, dx - 0.75, 1.75, 0.055, { tint: 0xf4f0e6 });
    B.quad(t.decal('stainDrip', 16, 48), 1.8, 1.2, dx, 0.95, 0.05, { tint: 0x9a7a5a, flipU: dx > 0 });
  }
  B.box(m.tinRed, 5.0, 0.08, 5.5, 0, 2.8, -2.6, { rx: 0.06 });
  B.box(m.metal, 0.04, 1.6, 0.04, 1.9, 2.85, -0.8, { tint: 0x8a8a88 });
  B.box(m.pv, 0.6, 0.4, 0.015, 2.2, 3.95, -0.8, { tint: 0x1a1a1a });
  B.box(m.pv, 0.16, 0.12, 0.02, 2.2, 4.1, -0.8, { tint: 0xf4f0e6 });
  B.box(m.pv, 0.26, 0.04, 0.025, 2.2, 4.2, -0.8, { tint: 0xe8c860 });
  B.pop();
  t.yard(21.05, 25.7, ZF, 15.2, m.strip);
  t.prop('weeds', 22.1, 0, 15.0, 2);
  t.prop('weeds', 25.2, 0, 14.95, 0.6);
  addDoor(t, 'garage6', 'FE6', 'Rental garage', [22.25, 15.4], [22.25, ZF], [22.25, 15.12, 1.2], s, { knockOnly: true });

  // second row and mid-rise blocks over the roofs
  for (const [x, w, h] of [[-23, 5.5, 7.6], [-17.2, 5, 6.2], [-11.6, 5.6, 7.2], [-5.4, 5.4, 6.0], [0.6, 5.6, 7.8], [6.6, 5.2, 6.4], [12.6, 5.8, 7.4], [18.6, 5.2, 6.1], [24.0, 4.6, 7.0]]) t.backHouse(x, 24.6 + hash2(x, 3) * 1.2, w, 7, h, -1);
  t.midrise(-6, 36, 16, 12.5);
  t.midrise(14, 38, 12, 15.5);
}
