// The garage's fittings and dressing, built into the garage's kit (src/garage/kit.js: one merged mesh per material):
//   * inside: the plank counter (work table), two bolted steel-angle racks, the grey steel office desk and its shelf of
//     binders, the terrazzo sink on block piers with its wall tap, tiles and soap net, the distribution board with its
//     conduits, knob-and-tube wiring to the fluorescent fittings, outlets and cords, the gacha corner (vinyl tiles, the
//     lit sign, a string of lanterns), the trench drain, painted bay lines, cracks, oil and tyre marks;
//   * out front: the tin awning on its outriggers, the sign board under two gooseneck lamps, four paper lanterns, the
//     noren (hung while the shop is open), the louvred vent, the service bracket and cable down to the watt-hour meter
//     with its inspection stickers, the 消火器 box, 火の用心 and the block's address plate.
// Printed matter comes from the pixel print sheet, marks from the marks sheet (src/gfx/garageArt.js). The props that
// stand here (fridge, radio, chair, heater, changer ...) come from the prop library and are merged per material page.
// Contract: new GarageDetail(garage, G) after the garage's envelope and lights exist; update() once per frame.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { prints, marks } from '../gfx/garageArt.js';
import { propGeometry, propMaterials, propSize, hasProp } from './props.js';
import { BUILD, TINT, RACK_Y, tintK } from './Garage.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V3(0, 1, 0);

/** Library props merged into one mesh per material (a prop family shares an atlas page), split by shadow casting. */
export class PropBatch {
  constructor() { this.lists = new Map(); }
  /** Merge a prop in at (x, y, z); o: scale, player (obstacle), phys (collider), material, cast. Returns its size. */
  place(game, id, x, y, z, ry = 0, o = {}) {
    const geo = hasProp(id) ? propGeometry(id) : null;
    if (!geo?.index) return null;
    const mats = propMaterials(id), s = o.scale || 1, cast = o.cast ?? true;
    const m = new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromAxisAngle(UP, ry), V3(s, s, s));
    const idx = geo.index.array, groups = geo.groups.length ? geo.groups : [{ start: 0, count: idx.length, materialIndex: 0 }];
    for (const gr of groups) {
      const mat = Array.isArray(mats) ? mats[gr.materialIndex] : mats;
      if (!mat || !gr.count) continue;
      let lo = Infinity, hi = -1;
      for (let i = gr.start; i < gr.start + gr.count; i++) { const v = idx[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
      const sub = new THREE.BufferGeometry();
      for (const name of ['position', 'normal', 'color', 'uv']) {
        const a = geo.attributes[name];
        if (a) sub.setAttribute(name, new THREE.BufferAttribute(a.array.slice(lo * a.itemSize, (hi + 1) * a.itemSize), a.itemSize));
      }
      const ind = new Uint32Array(gr.count);
      for (let i = 0; i < gr.count; i++) ind[i] = idx[gr.start + i] - lo;
      sub.setIndex(new THREE.BufferAttribute(ind, 1));
      sub.applyMatrix4(m);
      const c = cast && gr.materialIndex < 3, key = mat.uuid + (c ? 'c' : 'n') + Object.keys(sub.attributes).length;
      if (!this.lists.has(key)) this.lists.set(key, { mat, cast: c, list: [] });
      this.lists.get(key).list.push(sub);
    }
    const sz = propSize(id).multiplyScalar(s), cs = Math.abs(Math.cos(ry)), sn = Math.abs(Math.sin(ry));
    const ex = (sz.x * cs + sz.z * sn) / 2, ez = (sz.x * sn + sz.z * cs) / 2, pad = 0.02;
    if (o.player) game.player.addObstacle(x - ex - pad, x + ex + pad, z - ez - pad, z + ez + pad);
    if (o.phys) game.physics.addBox({ center: V3(x, y + sz.y / 2, z), half: V3(ex, sz.y / 2, ez), material: o.material || 'wood' });
    return sz;
  }
  build(parent) {
    for (const { mat, cast, list } of this.lists.values()) {
      const g = mergeGeometries(list, false);
      for (const x of list) x.dispose();
      if (!g) continue;
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, mat);
      m.castShadow = cast; m.receiveShadow = true;
      m.matrixAutoUpdate = false;
      m.name = 'garage:props';
      parent.add(m);
    }
    this.lists.clear();
  }
}

/** A solid of revolution about a vertical axis through (x, z), from y: prof = [[r, dy], ...] bottom to top. */
function turn(g, x, y, z, prof, segs = 16, o = {}) {
  g.push(new THREE.Matrix4().makeRotationZ(Math.PI / 2).setPosition(x, y, z));
  g.lathe(prof, segs, o);
  g.pop();
}
/** The same about a horizontal axis along +z from (x, y, z). */
function turnZ(g, x, y, z, prof, segs = 16) {
  g.push(new THREE.Matrix4().makeRotationY(-Math.PI / 2).setPosition(x, y, z));
  g.lathe(prof, segs);
  g.pop();
}

export class GarageDetail {
  constructor(garage, G) {
    this.garage = garage;
    this.game = garage.game;
    this.G = G;
    this.K = garage.K;
    this.P = prints();
    this.M = marks();
    this.counter();
    this.racks();
    this.desk();
    this.sink();
    this.electrical();
    this.gachaCorner();
    this.floorMarks();
    this.wallBits();
    this.props();
    this.street();
  }

  /** A print from the sheet, w metres wide (its height follows the art). */
  pr(name, face, x, y, z, w, o = {}) { const [pw, ph] = this.P.px(name); this.K.sticker('print', this.P.rect(name), face, x, y, z, w, w * ph / pw, o); }
  mark(name, face, x, y, z, w, h, o = {}) { this.K.sticker('marks', this.M.rect(name), face, x, y, z, w, h, o); }
  /** The soft contact shadow under a piece of furniture. */
  shade(x, z, w, d) { this.mark('shade', '+y', x, 0.003, z, w, d); }

  // ---------------------------------------------------------------------------------------------- the counter
  counter() {
    const g0 = this.garage, K = this.K, T = TINT, t = g0.table, x0 = t.x - t.w / 2, x1 = t.x + t.w / 2, z0 = t.z - t.d / 2, z1 = t.z + t.d / 2, h = t.h;
    // three planks, the game's placing surface
    const top = K.mesh('wood', (g) => {
      g.grain('x');
      for (let i = 0; i < 3; i++) { g.tint([0xe2c08e, 0xd6b382, 0xdcb98a][i]); g.box(-t.w / 2, -0.03, -t.d / 2 + i * t.d / 3, t.w / 2, 0.03, -t.d / 2 + (i + 1) * t.d / 3); }
    });
    top.position.set(t.x, h - 0.03, t.z);
    top.userData.surface = true;
    top.name = 'counter-top';
    g0.add(top);
    g0.tableTop = top;
    this.game.physics.addBox({ center: V3(t.x, h - 0.03, t.z), half: V3(t.w / 2, 0.03, t.d / 2), material: 'wood' });
    this.game.player.addObstacle(x0, x1, z0, z1);
    // square legs, aprons let into them, a low stretcher frame with a slatted shelf, one drawer
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const lx = t.x + sx * (t.w / 2 - 0.1), lz = t.z + sz * (t.d / 2 - 0.09);
      K.box('wood', lx - 0.045, 0, lz - 0.045, lx + 0.045, h - 0.06, lz + 0.045, { grain: 'y', tint: T.beam, cast: true });
      K.box('flat', lx - 0.03, 0, lz - 0.03, lx + 0.03, 0.006, lz + 0.03, { tint: T.rubber });
    }
    for (const sz of [-1, 1]) {
      const z = t.z + sz * (t.d / 2 - 0.09);
      K.box('wood', x0 + 0.145, h - 0.19, z - 0.013, x1 - 0.145, h - 0.06, z + 0.013, { grain: 'x', tint: T.purlin, cast: true });
      K.box('wood', x0 + 0.145, 0.14, z - 0.02, x1 - 0.145, 0.2, z + 0.02, { grain: 'x', tint: T.beam });
    }
    for (const sx of [-1, 1]) {
      const x = t.x + sx * (t.w / 2 - 0.1);
      K.box('wood', x - 0.013, h - 0.19, z0 + 0.135, x + 0.013, h - 0.06, z1 - 0.135, { grain: 'z', tint: T.purlin });
      K.box('wood', x - 0.02, 0.14, z0 + 0.135, x + 0.02, 0.2, z1 - 0.135, { grain: 'z', tint: T.beam });
    }
    for (let i = 0; i < 5; i++) { const z = z0 + 0.17 + i * (t.d - 0.34) / 4; K.box('wood', x0 + 0.12, 0.2, z - 0.05, x1 - 0.12, 0.218, z + 0.05, { grain: 'x', tint: i % 2 ? T.post : T.purlin }); }
    K.box('wood', t.x + 0.25, h - 0.175, z1 - 0.09, t.x + 0.7, h - 0.075, z1 - 0.062, { grain: 'x', tint: T.post });
    K.box('paint', t.x + 0.44, h - 0.135, z1 - 0.062, t.x + 0.51, h - 0.115, z1 - 0.045, { tint: T.steelDark });
    // the cutting mat he left on it
    this.pr('mat', '+y', t.x - 0.25, h + 0.002, t.z + 0.05, 0.8);
    this.shade(t.x, t.z, t.w + 0.14, t.d + 0.14);
  }

  // ---------------------------------------------------------------------------------------------- the steel racks
  racks() {
    const K = this.K, T = TINT, G = this.G, col = 0xa9bcae, z = G.minZ + 0.3, w = 1.2, d = 0.45, h = 1.9;
    for (const x of [-3.25, -1.85]) {
      // bolted angle posts, shelves with a folded lip, gusset plates under each corner, cross braces at the back
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const px = x + sx * w / 2, pz = z + sz * d / 2;
        K.box('paint', Math.min(px, px - sx * 0.036), 0.012, Math.min(pz, pz - sz * 0.003), Math.max(px, px - sx * 0.036), h, Math.max(pz, pz - sz * 0.003), { tint: col });
        K.box('paint', Math.min(px, px - sx * 0.003), 0.012, Math.min(pz, pz - sz * 0.036), Math.max(px, px - sx * 0.003), h, Math.max(pz, pz - sz * 0.036), { tint: tintK(col, 0.9) });
        K.box('flat', px - sx * 0.04 - 0.002, 0, pz - sz * 0.04 - 0.002, px + 0.002, 0.014, pz + 0.002, { tint: T.rubber });
        if (sz > 0) for (const y of RACK_Y) K.use('paint', { tint: tintK(col, 0.82) }).tri([px - sx * 0.004, y - 0.012, pz + 0.001], [px - sx * 0.1, y - 0.012, pz + 0.001], [px - sx * 0.004, y - 0.1, pz + 0.001], [0, 0, 1]);
      }
      for (const y of RACK_Y) {
        K.box('paint', x - w / 2 + 0.004, y - 0.0125, z - d / 2 + 0.004, x + w / 2 - 0.004, y + 0.0125, z + d / 2 - 0.004, { tint: col });
        K.box('paint', x - w / 2 + 0.004, y - 0.04, z + d / 2 - 0.012, x + w / 2 - 0.004, y - 0.0125, z + d / 2 - 0.004, { tint: tintK(col, 0.9) });
      }
      for (const s of [-1, 1]) K.beam('paint', [x - s * w / 2, 0.14, z - d / 2 + 0.006], [x + s * w / 2, 1.66, z - d / 2 + 0.006], 0.004, 0.022, { tint: tintK(col, 0.8) });
      // the bolts: a hex head at every shelf on each post's front and side leg
      const bolt = K.use('paint', { tint: T.steel });
      for (const sx of [-1, 1]) for (const y of RACK_Y) {
        bolt.cyl('z', [x + sx * (w / 2 - 0.018), y - 0.03, z + d / 2], 0.0065, 0.005, 6);
        for (const sz of [-1, 1]) bolt.cyl('x', [x + sx * w / 2 - (sx > 0 ? 0 : 0.005), y - 0.03, z + sz * (d / 2 - 0.018)], 0.0065, 0.005, 6);
      }
      this.game.player.addObstacle(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
      this.shade(x, z, w + 0.1, d + 0.1);
    }
  }

  // ---------------------------------------------------------------------------------------------- the PC desk
  desk() {
    const K = this.K, T = TINT, G = this.G, D = this.garage.pcDesk, x0 = D.x - D.w / 2, x1 = D.x + D.w / 2, z0 = D.z - D.d / 2, z1 = D.z + D.d / 2, h = D.h;
    const grey = 0xb9c2bd, lino = 0xcfdccf;
    // a grey steel office desk: lino top with a rolled edge, a three-drawer pedestal facing the room, a panel leg
    K.box('paint', x0, h - 0.035, z0, x1, h, z1, { tint: lino, bevel: 0.008, cast: true });
    K.box('paint', x0 + 0.01, h - 0.11, z0 + 0.03, x1 - 0.02, h - 0.035, z1 - 0.03, { tint: grey });
    K.box('paint', x0 + 0.02, 0.05, z1 - 0.48, x1 - 0.02, h - 0.11, z1 - 0.03, { tint: grey, cast: true });
    K.box('paint', x0 + 0.04, 0, z1 - 0.46, x1 - 0.04, 0.05, z1 - 0.05, { tint: T.steelDark });
    [[0.07, 0.25], [0.27, 0.45], [0.47, 0.62]].forEach(([y0, y1]) => {
      K.box('paint', x0 + 0.008, y0, z1 - 0.465, x0 + 0.02, y1, z1 - 0.045, { tint: tintK(grey, 1.06), bevel: 0.004 });
      K.box('paint', x0 + 0.002, y1 - 0.06, z1 - 0.33, x0 + 0.009, y1 - 0.035, z1 - 0.18, { tint: T.steelDark });
      K.box('gloss', x0 + 0.004, y0 + 0.03, z1 - 0.29, x0 + 0.009, y0 + 0.06, z1 - 0.22, { tint: T.white });
    });
    K.box('paint', x0 + 0.008, h - 0.105, z0 + 0.1, x0 + 0.02, h - 0.04, z1 - 0.52, { tint: tintK(grey, 1.06), bevel: 0.004 });
    K.box('paint', x0 + 0.002, h - 0.085, D.z - 0.3, x0 + 0.009, h - 0.065, D.z - 0.14, { tint: T.steelDark });
    K.box('paint', x0 + 0.02, 0, z0 + 0.03, x1 - 0.02, h - 0.11, z0 + 0.055, { tint: grey, cast: true });
    K.use('chrome', { tint: 0xdfe3e4 }).cyl('x', [x0 + 0.003, 0.585, z1 - 0.1], 0.011, 0.006, 14).cyl('x', [x0 + 0.003, h - 0.07, z1 - 0.56], 0.009, 0.006, 14);
    K.box('paint', x1 - 0.04, 0.3, z0 + 0.055, x1 - 0.02, h - 0.11, z1 - 0.48, { tint: tintK(grey, 0.92) });
    this.game.physics.addBox({ center: V3(D.x, h - 0.02, D.z), half: V3(D.w / 2, 0.02, D.d / 2), material: 'wood' });
    this.game.player.addObstacle(x0, x1, z0, z1);
    this.shade(D.x, D.z, D.w + 0.1, D.d + 0.1);
    // the shelf over it: binders with their spine labels, a photo and a memo pinned to the plywood
    K.box('wood', G.maxX - 0.22, 1.78, D.z - 0.55, G.maxX, 1.8, D.z + 0.65, { grain: 'z', tint: T.ply });
    for (const z of [D.z - 0.45, D.z + 0.55]) { K.box('paint', G.maxX - 0.2, 1.762, z - 0.01, G.maxX, 1.78, z + 0.01, { tint: T.steelDark }); K.beam('paint', [G.maxX - 0.19, 1.77, z], [G.maxX - 0.008, 1.6, z], 0.012, 0.012, { tint: T.steelDark }); }
    [0x5f86c0, 0x5f86c0, 0xcf5a4e, 0x6aa878, 0xe6cc62, 0x55505c, 0x5f86c0].forEach((c, i) => {
      const z = D.z - 0.5 + i * 0.052, hh = 0.27 - (i % 3) * 0.02;
      K.box('paint', G.maxX - 0.215, 1.8, z, G.maxX - 0.02, 1.8 + hh, z + 0.046, { tint: c });
      K.box('flat', G.maxX - 0.2165, 1.86, z + 0.008, G.maxX - 0.215, 1.95, z + 0.038, { tint: T.white });
    });
    this.pr('photo', '-x', G.maxX - 0.003, 1.42, D.z - 0.55, 0.12, { rot: 0.06 });
    this.pr('memo', '-x', G.maxX - 0.003, 1.45, D.z + 0.1, 0.14, { rot: -0.08 });
    // the enamel pendant's flex and pull cord (the lamp is a prop)
    K.rod('flat', [D.x - 0.1, G.height - 0.1, D.z + 0.1], [D.x - 0.1, G.height + 0.16, D.z + 0.1], 0.004, { tint: T.black, sides: 4 });
    K.rod('flat', [D.x - 0.04, G.height - 0.72, D.z + 0.16], [D.x - 0.04, G.height - 1.2, D.z + 0.16], 0.002, { tint: T.ivory, sides: 4 });
    K.box('gloss', D.x - 0.048, G.height - 1.235, D.z + 0.152, D.x - 0.032, G.height - 1.2, D.z + 0.168, { tint: T.brass, bevel: 0.004 });
  }

  // ---------------------------------------------------------------------------------------------- the sink
  sink() {
    const K = this.K, T = TINT, G = this.G, x = 2.62, bz = G.minZ, top = 0.82, x0 = x - 0.36, x1 = x + 0.36, z1 = bz + 0.5, tz = 0xe9ece4;
    // white tiles on the wall behind, a 節水 sticker, one tile gone
    K.box('tile', 2.1, 0.8, bz, 3.14, 1.4, bz + 0.012, { tint: T.white, skip: ['nz'] });
    K.box('mortar', 2.9, 1.2, bz + 0.012, 3.0, 1.3, bz + 0.0135, { tint: tintK(TINT.mortar, 0.8) });
    this.pr('sessui', '+z', 2.4, 1.24, bz + 0.0145, 0.086);
    // the terrazzo sink (thick walls, a brass drain) on two block piers, a board between them for the bin bags
    K.box('terrazzo', x0, 0.58, bz + 0.01, x1, 0.63, z1, { tint: tz, cast: true });
    for (const [a0, a1, b0, b1] of [[x0, x1, z1 - 0.07, z1], [x0, x1, bz + 0.01, bz + 0.08], [x0, x0 + 0.07, bz + 0.08, z1 - 0.07], [x1 - 0.07, x1, bz + 0.08, z1 - 0.07]]) K.box('terrazzo', a0, 0.63, b0, a1, top, b1, { tint: tz, bevel: 0.01, cast: true });
    turn(K.use('gloss', { tint: T.brass }), x, 0.63, bz + 0.26, [[0, 0], [0.028, 0], [0.028, 0.004], [0.02, 0.004], [0.018, 0.001], [0, 0.001]], 18);
    for (const s of [-1, 1]) K.box('block', x + s * 0.3 - 0.07, 0, bz + 0.06, x + s * 0.3 + 0.07, 0.58, z1 - 0.04, { tint: T.block, cast: true });
    K.box('wood', x - 0.23, 0.1, bz + 0.08, x + 0.23, 0.12, z1 - 0.06, { grain: 'x', tint: T.post });
    for (const zz of [bz + 0.14, z1 - 0.12]) K.box('wood', x - 0.23, 0.06, zz - 0.02, x + 0.23, 0.1, zz + 0.02, { grain: 'x', tint: T.beam });
    this.game.physics.addBox({ center: V3(x, top / 2, bz + 0.25), half: V3(0.36, top / 2, 0.25), material: 'concrete' });
    this.game.player.addObstacle(x0 - 0.02, x1 + 0.02, bz, z1 + 0.02);
    this.shade(x, bz + 0.27, 0.86, 0.6);
    // the wall tap: flange, body, a cross handle, the spout with a stub of green hose; the soap in its net
    const c = K.use('chrome', { tint: 0xe0e4e6 });
    turnZ(c, x, 1.04, bz + 0.012, [[0, 0], [0.032, 0], [0.034, 0.004], [0.032, 0.008], [0.02, 0.014], [0.016, 0.03], [0.016, 0.105], [0.019, 0.112], [0.016, 0.12], [0, 0.12]], 18);
    turn(c, x, 1.04, bz + 0.1, [[0.016, 0], [0.012, 0.012], [0.012, 0.045], [0.016, 0.05], [0.014, 0.058], [0, 0.06]], 14);
    c.strut([x - 0.04, 1.095, bz + 0.1], [x + 0.04, 1.095, bz + 0.1], 0.006, { round: 10 }); c.strut([x, 1.095, bz + 0.06], [x, 1.095, bz + 0.14], 0.006, { round: 10 }); for (const [dx, dz] of [[-0.04, 0], [0.04, 0], [0, -0.04], [0, 0.04]]) K.ball('chrome', [x + dx, 1.095, bz + 0.1 + dz], 0.009, { tint: 0xe0e4e6 });
    K.pipe('chrome', [[x, 1.04, bz + 0.11], [x, 1.03, bz + 0.15], [x, 0.995, bz + 0.175], [x, 0.95, bz + 0.175]], 0.013, { tint: 0xe0e4e6, sides: 12 });
    K.rod('flat', [x, 0.955, bz + 0.175], [x + 0.005, 0.87, bz + 0.18], 0.015, { tint: 0x7fae84, sides: 12 });
    K.rod('flat', [x + 0.03, 1.04, bz + 0.1], [x + 0.1, 0.93, bz + 0.12], 0.002, { tint: T.ivory, sides: 4 });
    K.box('flat', x + 0.075, 0.87, bz + 0.095, x + 0.125, 0.93, bz + 0.145, { tint: 0xf0c868, bevel: 0.015 });
    // the supply up the wall and across to the heater, the trap and waste under the bowl
    K.pipe('paint', [[x, 1.07, bz + 0.03], [x, 1.62, bz + 0.03], [x + 0.2, 1.62, bz + 0.03]], 0.011, { tint: T.galv, sides: 10 });
    for (const y of [1.2, 1.5]) K.box('paint', x - 0.022, y, bz + 0.012, x + 0.022, y + 0.014, bz + 0.046, { tint: T.steel });
    K.pipe('paint', [[x, 0.58, bz + 0.26], [x, 0.36, bz + 0.26], [x, 0.3, bz + 0.2], [x, 0.3, bz + 0.07], [x, 0, bz + 0.05]], 0.024, { tint: 0xb6b8b2, sides: 14 });
  }

  // ---------------------------------------------------------------------------------------------- electrical
  electrical() {
    const K = this.K, T = TINT, G = this.G, H = G.height, bz = G.minZ, bx = 1.12;
    const pvc = (pts, r = 0.011) => K.pipe('paint', pts, r, { tint: 0xc4c6be, sides: 10 });
    const saddle = (x, y, z, axis = 'x') => K.box('paint', x - (axis === 'x' ? 0.022 : 0.004), y - 0.006, z - (axis === 'x' ? 0.004 : 0.022), x + (axis === 'x' ? 0.022 : 0.004), y + 0.006, z + (axis === 'x' ? 0.02 : 0.022), { tint: T.steel });
    // the distribution board by the back door: a painted backboard, the enamelled box, its face with the knife switch's
    // slot (the lever is src/life/chores.js), the contract sticker, three conduits up to the wall plate
    K.box('wood', bx - 0.21, 1.7, bz, bx + 0.21, 2.3, bz + 0.02, { grain: 'y', tint: T.brown });
    K.box('paint', bx - 0.15, 1.8, bz + 0.02, bx + 0.15, 2.22, bz + 0.1, { tint: 0xc9c6b8, bevel: 0.01 });
    this.pr('breaker', '+z', bx, 2.01, bz + 0.1015, 0.292);
    const fz = bz + 0.1015, px = 0.292 / 154; // the face print's scale: the parts below sit on what it draws
    for (const [x0, x1, y0, y1] of [[-18, -16, -36, 68], [16, 18, -36, 68], [-18, 18, 66, 68], [-18, 18, -36, -34]]) K.box('paint', bx + x0 * px, 2.01 + y0 * px, fz, bx + x1 * px, 2.01 + y1 * px, fz + 0.008, { tint: 0x8f9296 });
    for (let k = -1; k <= 1; k++) turnZ(K.use('gloss', { tint: T.ivory }), bx + k * 41 * px, 2.01 - 64 * px, fz, [[0.024, 0], [0.024, 0.006], [0.019, 0.016], [0.012, 0.02], [0, 0.02]], 18);
    for (let k = -1; k <= 1; k++) K.box('paint', bx + k * 41 * px - 0.012, 2.01 - 64 * px - 0.002, fz + 0.02, bx + k * 41 * px + 0.012, 2.01 - 64 * px + 0.002, fz + 0.022, { tint: T.steelDark });
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) turnZ(K.use('chrome', { tint: 0xd8dcde }), bx + sx * 0.136, 2.01 + sy * 0.197, fz, [[0.006, 0], [0.006, 0.002], [0.003, 0.004], [0, 0.004]], 10);
    this.pr('keiyaku', '+z', bx, 1.75, bz + 0.0215, 0.125, { rot: -0.03 });
    for (const dx of [-0.09, 0, 0.09]) { pvc([[bx + dx, 2.22, bz + 0.04], [bx + dx, H + 0.05, bz + 0.04]], 0.012); for (const y of [2.5, 2.95]) saddle(bx + dx, y, bz + 0.03); }
    // the light switch's own conduit and label
    const sw = this.garage.lightSwitch.position;
    pvc([[sw.x, sw.y + 0.06, bz + 0.018], [sw.x, H + 0.05, bz + 0.018]], 0.01);
    for (const y of [1.7, 2.4, 3.0]) saddle(sw.x, y, bz + 0.01);
    this.pr('dento', '+z', sw.x, sw.y + 0.105, bz + 0.003, 0.085);
    // knob-and-tube wiring: twin black cable on white porcelain knobs, along the back wall and out along the battens
    const knob = (x, y, z) => K.box('gloss', x - 0.011, y - 0.011, z - 0.011, x + 0.011, y + 0.011, z + 0.011, { tint: T.white, bevel: 0.004 });
    const cable = (a, b) => { K.rod('flat', a, b, 0.0045, { tint: T.black, sides: 4 }); const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 0.6)); for (let i = 0; i <= n; i++) knob(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n + 0.012, a[2] + (b[2] - a[2]) * i / n); };
    cable([-2.46, H - 0.06, bz + 0.03], [2.46, H - 0.06, bz + 0.03]);
    for (const [x, zEnd] of [[-2.4, 0.8], [0, 3.6], [2.4, 0.8]]) { cable([x + 0.056, H - 0.03, bz + 0.03], [x + 0.056, H - 0.03, zEnd - 0.5]); K.rod('flat', [x + 0.056, H - 0.03, zEnd - 0.5], [x + 0.05, H - 0.17, zEnd - 0.55], 0.004, { tint: T.black, sides: 4 }); }
    // left wall: a conduit along the blocks with an outlet behind each machine slot and the machine's fat cable
    const wx = G.minX + 0.02;
    pvc([[wx, 0.42, -4.4], [wx, 0.42, 2.25]], 0.012);
    pvc([[wx, 0.42, -4.4], [wx, 1.0, -4.4], [wx + 0.01, 1.1, -4.38], [wx + 0.01, H, -4.38]], 0.012);
    for (const sz of [-3.35, -2.3, -1.25, -0.2, 0.85, 1.9]) {
      const oz = sz + 0.3;
      K.box('gloss', G.minX, 0.305, oz - 0.0375, G.minX + 0.04, 0.415, oz + 0.0375, { tint: T.ivory, bevel: 0.006 });
      K.box('flat', G.minX + 0.04, 0.37, oz - 0.012, G.minX + 0.066, 0.4, oz + 0.012, { tint: T.black });
      K.pipe('flat', [[G.minX + 0.07, 0.385, oz], [G.minX + 0.16, 0.3, oz - 0.05], [G.minX + 0.2, 0.02, oz - 0.15], [-3.62, 0.012, sz]], 0.006, { tint: T.black, sides: 4 });
      saddle(wx, 0.42, oz - 0.14, 'z');
    }
    // outlets by the PC and by the back door; the desk lamp's flex runs across the floor under strips of gaffer tape
    K.box('gloss', G.maxX - 0.03, 0.26, -4.89, G.maxX, 0.38, -4.81, { tint: T.ivory, bevel: 0.006 });
    K.pipe('flat', [[G.maxX - 0.03, 0.34, -4.85], [3.8, 0.02, -4.6], [3.72, 0.02, -4.3]], 0.006, { tint: T.black, sides: 4 });
    K.box('gloss', 0.74, 0.24, bz, 0.82, 0.36, bz + 0.03, { tint: T.ivory, bevel: 0.006 });
    const t = this.garage.table, lx = t.x + t.w / 2 - 0.1, lz = t.z - t.d / 2 + 0.1;
    K.pipe('flat', [[0.78, 0.33, bz + 0.06], [0.8, 0.008, bz + 0.25], [1.0, 0.006, -3.6], [1.12, 0.006, -1.5], [lx + 0.02, 0.006, lz - 0.08], [lx, 0.05, lz], [lx, t.h - 0.07, lz]], 0.0055, { tint: T.black, sides: 4 });
    for (const [x, z, r] of [[0.9, -4.2, 0.17], [1.05, -2.7, 0.06], [1.115, -1.7, 0.02]]) K.sticker('flat', [0, 0, 1, 1], '+y', x, 0.0125, z, 0.06, 0.16, { rot: r + Math.PI / 2, tint: 0x8f9296 });
  }

  // ---------------------------------------------------------------------------------------------- the gacha corner
  gachaCorner() {
    const K = this.K, T = TINT, G = this.G, x = G.minX;
    // vinyl tiles laid over the slab along the machine row, an aluminium strip at their edge
    const t = { x0: x + 0.005, x1: -2.2, z0: -3.78, z1: 2.42 };
    K.box('ptile', t.x0, 0, t.z0, t.x1, 0.006, t.z1, { tint: T.white, skip: ['ny'] });
    K.box('paint', t.x1, 0, t.z0 - 0.03, t.x1 + 0.03, 0.008, t.z1 + 0.03, { tint: T.galv });
    for (const z of [t.z0 - 0.03, t.z1]) K.box('paint', t.x0, 0, z, t.x1, 0.008, z + 0.03, { tint: T.galv });
    // the lit sign box on the studs, hung from the girt on two straps
    const sy = 2.4, sz = -0.6;
    K.box('paint', x + 0.02, sy - 0.215, sz - 0.825, x + 0.135, sy + 0.215, sz + 0.825, { tint: 0x57505e, bevel: 0.01 });
    K.sticker('signGlow', this.P.rect('gachaSign'), '+x', x + 0.137, sy, sz, 1.6, 0.398);
    for (const dz of [-0.6, 0.6]) K.box('paint', x + 0.03, sy + 0.215, sz + dz - 0.012, x + 0.04, sy + 0.56, sz + dz + 0.012, { tint: T.steelDark });
    const pl = new THREE.PointLight(0xffa860, 1.6, 4, 1.6);
    pl.position.set(x + 0.6, sy, sz);
    this.game.scene.add(pl);
    this.signLight = pl;
    // a string of small paper lanterns along the wall plate
    const pts = [];
    for (let i = 0; i <= 8; i++) pts.push([x + 0.35, 2.98 - Math.sin((i / 8) * Math.PI) * 0.2 - (i % 2) * 0.03, -3.6 + i * 0.75]);
    K.pipe('flat', pts, 0.004, { tint: T.black, sides: 4 });
    for (const p of [pts[0], pts[8]]) K.rod('flat', p, [x + 0.11, p[1] + 0.12, p[2]], 0.004, { tint: T.black, sides: 4 });
    for (let i = 1; i < 8; i++) this.lantern('lanternIn', pts[i][0], pts[i][1] - 0.15, pts[i][2], 0.55, i * 0.7);
    // notices on little boards nailed across the studs
    const board = (y, z, w, h) => K.box('wood', x, y - h / 2, z - w / 2, x + 0.012, y + h / 2, z + w / 2, { tint: T.ply });
    board(1.78, -0.725, 0.56, 0.2); this.pr('kaishu', '+x', x + 0.014, 1.78, -0.725, 0.2, { rot: 0.03 });
    board(1.62, -4.1, 0.56, 0.2); this.pr('ryogae', '+x', x + 0.014, 1.62, -4.1, 0.2, { rot: -0.02 });
    board(1.72, 4.35, 0.56, 0.36); this.pr('rules', '+x', x + 0.014, 1.72, 4.35, 0.25, { rot: -0.03 });
  }

  /** A paper lantern (chochin) hanging with its body's centre at (x, y, z): s = size, turned by ry. */
  lantern(key, x, y, z, s = 1, ry = 0) {
    const K = this.K, r = this.P.rect('lantern'), hh = 0.17 * s;
    const body = [];
    for (let k = 0; k <= 8; k++) { const t = -1 + k / 4; body.push([(0.062 + 0.086 * Math.pow(1 - t * t, 0.62)) * s, t * hh]); }
    const g = K.use(key, {});
    g.push(new THREE.Matrix4().makeRotationY(ry).setPosition(x, y, z));
    turn(g, 0, 0, 0, body, 20, { uvBand: (k, i, n, pts) => pts.map((p, j) => [r[0] + ((j === 0 || j === 3 ? i : i + 1) / n) * (r[2] - r[0]), r[1] + ((p[0] + hh) / (2 * hh)) * (r[3] - r[1])]) });
    g.pop();
    const c = K.use('flat', { tint: TINT.black });
    turn(c, x, y + hh, z, [[0.066 * s, 0], [0.066 * s, 0.03 * s], [0, 0.03 * s]], 16);
    turn(c, x, y - hh - 0.03 * s, z, [[0, 0], [0.066 * s, 0], [0.066 * s, 0.03 * s]], 16);
    K.rod('flat', [x, y + hh + 0.03 * s, z], [x, y + hh + 0.12 * s, z], 0.004, { tint: TINT.black, sides: 4 });
    K.box('flat', x - 0.012 * s, y - hh - 0.1 * s, z - 0.012 * s, x + 0.012 * s, y - hh - 0.03 * s, z + 0.012 * s, { tint: TINT.brass });
  }

  // ---------------------------------------------------------------------------------------------- floor marks
  floorMarks() {
    const K = this.K, G = this.G;
    const F = (n, x, z, w, h, o = {}) => this.mark(n, '+y', x, 0.0018 + (o.lift || 0), z, w, h, o);
    /** A painted line from (x0, z0) to (x1, z1) (axis-aligned), in pieces a metre long. */
    const line = (x0, z0, x1, z1, tint, w = 0.075) => {
      const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L)), rot = Math.abs(x1 - x0) > Math.abs(z1 - z0) ? 0 : Math.PI / 2;
      for (let i = 0; i < n; i++) { const k = (i + 0.5) / n; F('line', x0 + (x1 - x0) * k, z0 + (z1 - z0) * k, L / n, w, { rot: rot + (i % 2 ? Math.PI : 0), tint, lift: 0.0004 }); }
    };
    // the bay Grandpa's car stood in (white, worn), the keep-clear box at the back door and the delivery square (yellow)
    const white = 0xf4f1e8, yellow = 0xf2cf52;
    line(-1.15, -3.3, -1.15, 4.5, white); line(1.6, -3.3, 1.6, 2.9, white); line(-1.15, -3.3, 1.6, -3.3, white);
    line(-0.75, -3.8, 0.75, -3.8, yellow, 0.05); line(-0.75, -4.95, -0.75, -3.8, yellow, 0.05); line(0.75, -4.95, 0.75, -3.8, yellow, 0.05);
    for (let i = 0; i < 4; i++) F('line', -0.45 + i * 0.3, -4.4, 0.62, 0.05, { rot: Math.PI / 4, tint: yellow, lift: 0.0004 });
    const DS = this.garage.deliverySpot = { x: 1.6, z: 4.1 };
    for (const [dx, dz, r] of [[0, -0.45, 0], [0, 0.45, 0], [-0.45, 0, 1], [0.45, 0, 1]]) F('line', DS.x + dx, DS.z + dz, 0.95, 0.05, { rot: r * Math.PI / 2, tint: yellow, lift: 0.0008 });
    // oil where the engine sat, drips, faded tyre tracks in from the shutter, cracks from the corners, stains
    F('oilA', 0.3, -1.75, 1.5, 1.15, { rot: 0.25 }); F('oilB', -0.2, 3.0, 0.8, 0.64, { rot: -0.4 });
    for (const x of [-0.62, 0.92]) F('tyre', x, 3.55, 0.17, 2.5, { rot: x > 0 ? Math.PI : 0, lift: 0.0002 });
    F('crackA', 2.3, 1.9, 1.7, 0.85, { rot: 0.6 }); F('crackB', -1.7, -3.1, 1.3, 0.87, { rot: -0.9 }); F('crackC', 2.2, 4.1, 1.4, 0.88, { rot: 2.2 });
    F('spill', 1.5, -0.8, 0.4, 0.4, { rot: 0.4 });
    F('scuff', 0.3, 4.3, 1.2, 0.48, { rot: 0.1 }); F('scuff', 3.0, -3.0, 0.7, 0.28, { rot: 0.8 });
    for (const sz of [-3.35, -1.25, 0.85]) F('scuff', -2.7, sz, 0.56, 0.22, { rot: Math.PI / 2 + sz * 0.1, lift: 0.0072 });
    // the trench drain along the shutter's threshold: a steel frame, the grating's flat bars
    const dz = G.maxZ - 0.32;
    K.quad('grate', [-2.9, 0.003, dz + 0.08], [2.9, 0.003, dz + 0.08], [2.9, 0.003, dz - 0.08], [-2.9, 0.003, dz - 0.08], [0, 1, 0], { rect: [0, 0, 5.8, 0.16] });
    for (const s of [-1, 1]) K.box('paint', -2.92, 0, dz + s * 0.09 - 0.012, 2.92, 0.005, dz + s * 0.09 + 0.012, { tint: TINT.steelDark });
    // damp and moss at the foot of the back wall, water down it from the old roof leak, rust under the tin's laps
    this.mark('damp', '+z', -2.4, 0.2, G.minZ + 0.022, 2.6, 0.4); this.mark('damp', '+z', 2.6, 0.17, G.minZ + 0.022, 2.2, 0.34);
    this.mark('water', '+z', -3.5, 2.5, G.minZ + 0.002, 0.7, 1.4); this.mark('water', '+z', 3.5, 2.6, G.minZ + 0.002, 0.55, 1.1);
    for (const [z, y, h] of [[-4.2, 2.6, 0.7], [-2.0, 2.7, 0.5], [0.5, 2.75, 0.45], [3.8, 2.6, 0.7]]) this.mark('rust', '+x', G.minX - 0.103, y, z, 0.07, h);
    for (const [z, y, h] of [[-1.5, 2.95, 0.4], [1.2, 2.9, 0.5], [3.9, 2.95, 0.4]]) this.mark('rust', '-x', G.maxX + 0.103, y, z, 0.07, h);
  }

  // ---------------------------------------------------------------------------------------------- shelves, notices
  wallBits() {
    const K = this.K, T = TINT, G = this.G, H = G.height, W = BUILD.win;
    // right wall: the long high shelf on steel brackets (empty: an attach point)
    const sy = 2.45, z0 = -1.12, z1 = 3.78;
    K.box('wood', G.maxX - 0.26, sy, z0, G.maxX, sy + 0.025, z1, { grain: 'z', tint: T.ply });
    K.box('wood', G.maxX - 0.275, sy - 0.02, z0, G.maxX - 0.26, sy + 0.025, z1, { grain: 'z', tint: T.beam });
    for (const z of [-0.95, 0.9, 2.35, 3.6]) {
      K.box('paint', G.maxX - 0.22, sy - 0.02, z - 0.012, G.maxX, sy, z + 0.012, { tint: T.steelDark });
      K.box('paint', G.maxX - 0.02, sy - 0.2, z - 0.012, G.maxX, sy - 0.02, z + 0.012, { tint: T.steelDark });
      K.beam('paint', [G.maxX - 0.2, sy - 0.02, z], [G.maxX - 0.012, sy - 0.19, z], 0.012, 0.012, { tint: T.steelDark });
    }
    // back wall: 安全第一 over the racks; the 消火器 plate over the extinguisher
    K.box('paint', -2.96, 2.31, G.minZ, -2.34, 2.79, G.minZ + 0.012, { tint: T.white });
    this.pr('anzen', '+z', -2.65, 2.55, G.minZ + 0.014, 0.6);
    this.pr('shokaki', '+z', 0.82, 1.02, G.minZ + 0.003, 0.11);
    // the front piers, inside: 火の用心 and 整理整頓 on the studs; the hooked pole for pulling the shutter down
    this.pr('hinoyojin', '-z', -3.545, 1.7, G.maxZ - 0.002, 0.105);
    K.box('paint', 3.38, 1.82, G.maxZ - 0.008, 3.7, 1.93, G.maxZ, { tint: T.white });
    this.pr('seiton', '-z', 3.54, 1.875, G.maxZ - 0.01, 0.3);
    const hp = [-3.2, 0, G.maxZ - 0.14], ht = [-3.24, 2.05, G.maxZ - 0.03];
    K.rod('paint', hp, ht, 0.011, { tint: T.galv, sides: 6 });
    K.pipe('paint', [ht, [ht[0], ht[1] + 0.08, ht[2]], [ht[0] + 0.05, ht[1] + 0.1, ht[2]], [ht[0] + 0.07, ht[1] + 0.05, ht[2]]], 0.008, { tint: T.galv, sides: 5 });
    K.box('flat', hp[0] - 0.016, 0, hp[2] - 0.016, hp[0] + 0.016, 0.07, hp[2] + 0.016, { tint: T.rubber });
    // tiger tape up the guide rails
    for (const s of [-1, 1]) for (let i = 0; i < 12; i++) K.sticker('print', this.P.rect('hazard'), '-z', s * 2.978, 0.045 + i * 0.09, 5.004, 0.09, 0.044, { rot: Math.PI / 2 });
    // the window: a curtain wire and a faded cafe curtain bunched at one end
    const cz = (W.z0 + W.z1) / 2;
    K.rod('paint', [G.minX + 0.07, W.y1 + 0.03, W.z0 - 0.1], [G.minX + 0.07, W.y1 + 0.03, W.z1 + 0.1], 0.005, { tint: T.galv, sides: 5 });
    for (let i = 0; i < 6; i++) K.box('flat', G.minX + 0.058 + (i % 2) * 0.012, W.y0 + 0.04, W.z1 - 0.04 - i * 0.034, G.minX + 0.078 + (i % 2) * 0.012, W.y1 + 0.03, W.z1 - 0.008 - i * 0.034, { tint: i % 2 ? 0xe2d2a8 : 0xefe4c2 });
    K.rod('flat', [G.minX + 0.2, W.y1 + 0.02, cz + 0.2], [G.minX + 0.2, W.y1 - 0.03, cz + 0.2], 0.002, { tint: T.ivory, sides: 4 });
    void H;
  }

  // ---------------------------------------------------------------------------------------------- library props
  props() {
    const g0 = this.garage, G = this.G, t = g0.table, D = g0.pcDesk, W = BUILD.win;
    const S = (id, x, y, z, ry, o) => g0.sprop(id, x, y, z, ry, o);
    S('desk_lamp', t.x + 0.68, t.h, t.z - 0.28, -Math.PI * 0.75);
    // back-right: fridge with the radio on it, the extinguisher; the heater by the counter (Mikan's warm corner)
    const fr = S('fridge', 1.25, 0, G.minZ + 0.3, 0, { player: true, phys: true });
    g0.radio = g0.prop('radio', 1.25, fr ? fr.y : 0.86, G.minZ + 0.3, -0.12, { fallbackSize: [0.5, 0.28, 0.16], fallbackColor: 0x444444 });
    S('extinguisher', 0.82, 0, G.minZ + 0.14, 0);
    S('pipe_chair', D.x - 0.72, 0, D.z + 0.05, Math.PI / 2 + 0.15);
    S('heater', -0.95, 0, 1.55, 0.3, { player: true, phys: true });
    S('shop_lamp', D.x - 0.1, G.height - 0.1 - 0.68, D.z + 0.1, 0);
    // the gacha corner: the coin changer at the back of the row, the capsule return box, the pink public phone
    S('coin_changer', -3.73, 0, -4.1, Math.PI / 2, { player: true, phys: true });
    S('capsule_return', -3.45, 0.006, -0.725, Math.PI / 2, { player: true, phys: true });
    S('pink_phone', -3.72, 0, 2.62, Math.PI / 2, { player: true, phys: true });
    S('water_heater', 2.8, 1.36 - 0.24, G.minZ + 0.2, 0);
    S('furin', G.minX + 0.2, W.y1 - 0.03 - 0.264, (W.z0 + W.z1) / 2 + 0.2, Math.PI / 2);
    this.shade(1.25, G.minZ + 0.3, 0.66, 0.66); this.shade(-0.95, 1.55, 0.6, 0.6); this.shade(3.55, -2.15, 0.62, 0.56); this.shade(3.55, -2.78, 0.64, 0.64);
    this.shade(-3.72, 2.62, 0.5, 0.55); this.shade(-3.73, -4.1, 0.55, 0.6);
  }

  // ---------------------------------------------------------------------------------------------- the street front
  street() {
    const g0 = this.garage, K = this.K, T = TINT, B = BUILD, A = B.awning, zo = 5.212;
    const ay = (z) => A.y - (z - zo) * A.drop / (A.z1 - zo); // the awning's underside
    // the awning: zinc sheets (rust-proof red) on two battens over five outriggers, knee braces at the piers, a fascia
    for (const [dy, tint, n] of [[0, T.zincIn, -1], [0.014, T.roof, 1]]) K.wave('totan', -4.12, 4.12, (c, w, up) => (up ? [c, ay(zo) + dy + w, zo] : [c, ay(A.z1) + dy + w, A.z1]), [0, n, n * 0.2], { tint, cast: n > 0, uv: (p) => [p[0], Math.hypot(p[2] - zo, A.y - p[1])] });
    K.box('paint', -4.12, A.y + 0.012, zo, 4.12, A.y + 0.05, zo + 0.05, { tint: T.galv });
    for (const x of [-3.95, -1.98, 0, 1.98, 3.95]) K.beam('wood', [x, ay(zo) - 0.06, zo - 0.01], [x, ay(A.z1 - 0.03) - 0.06, A.z1 - 0.03], 0.05, 0.07, { tint: T.brown, cast: true });
    for (const z of [5.5, 5.95]) K.box('wood', -4.1, ay(z) - 0.024, z - 0.02, 4.1, ay(z) - 0.002, z + 0.02, { grain: 'x', tint: T.brown });
    K.box('wood', -4.14, ay(A.z1) - 0.1, A.z1 - 0.012, 4.14, ay(A.z1) + 0.012, A.z1 + 0.012, { grain: 'x', tint: T.brown, cast: true });
    for (const x of [-3.95, -3.06, 3.06, 3.95]) K.beam('wood', [x, 2.72, zo + 0.03], [x, ay(5.8) - 0.09, 5.8], 0.045, 0.045, { tint: T.brown });
    // four paper lanterns under its edge; the noren on a bamboo pole (hung out while the shop is open)
    for (const [i, x] of [-3.2, -1.6, 1.6, 3.2].entries()) { this.lantern('lantern', x, 2.64, 6.02, 1, i * 1.3); K.rod('flat', [x, 2.83, 6.02], [x, ay(6.02) - 0.03, 6.02], 0.004, { tint: T.black, sides: 4 }); }
    const noren = new THREE.Group();
    noren.name = 'garage:noren';
    const ny = 2.99, nz = 6.06;
    noren.add(K.mesh('cloth', (g) => {
      ['norenL', 'norenC', 'norenR'].forEach((n, i) => {
        const r = this.P.rect(n), x = (i - 1) * 0.69;
        g.quad([x - 0.33, ny - 0.735, nz + 0.02], [x + 0.33, ny - 0.735, nz + 0.02], [x + 0.33, ny - 0.015, nz], [x - 0.33, ny - 0.015, nz], [0, 0, 1], [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]]);
      });
    }));
    noren.add(K.mesh('paint', (g) => {
      g.tint(T.bamboo); g.strut([-1.16, ny, nz], [1.16, ny, nz], 0.014, { round: 12 });
      g.tint(tintK(T.bamboo, 0.7)); for (const x of [-0.6, 0.1, 0.75]) g.box(x - 0.004, ny - 0.016, nz - 0.016, x + 0.004, ny + 0.016, nz + 0.016);
      g.tint(T.steelDark); for (const x of [-1.05, 1.05]) g.strut([x, ny + 0.012, nz], [x, ay(nz) - 0.01, nz], 0.004, { round: 4 });
    }));
    g0.add(noren);
    this.noren = noren;
    // the sign board on two battens, its frame, and the gooseneck lamps over it (lit while the shop is open)
    const sy = 3.9, sz = zo + 0.05;
    for (const y of [sy - 0.3, sy + 0.3]) K.box('wood', -2.0, y - 0.025, zo, 2.0, y + 0.025, sz - 0.014, { grain: 'x', tint: T.brown });
    K.box('paint', -2.03, sy - 0.43, sz - 0.014, 2.03, sy + 0.43, sz, { tint: T.brown, cast: true });
    this.pr('signBoard', '+z', 0, sy, sz + 0.002, 4.0);
    const bulbs = [];
    for (const x of [-1.25, 1.25]) {
      K.pipe('paint', [[x, 4.36, zo], [x, 4.46, zo + 0.14], [x, 4.5, zo + 0.34], [x, 4.44, zo + 0.42]], 0.012, { tint: T.steelDark, sides: 10 });
      K.box('paint', x - 0.03, 4.33, zo, x + 0.03, 4.39, zo + 0.012, { tint: T.steelDark });
      turn(K.use('paint', { tint: 0x5f8f7c, cast: true }), x, 4.35, zo + 0.42, [[0.13, 0], [0.125, 0.012], [0.09, 0.05], [0.05, 0.075], [0.03, 0.1], [0, 0.102]], 20);
      turn(K.use('gloss', { tint: T.white }), x, 4.352, zo + 0.42, [[0, 0.06], [0.045, 0.06], [0.085, 0.04], [0.12, 0.002]], 20, { flip: true });
      bulbs.push([x, 4.36, zo + 0.42]);
    }
    this.bulbs = new THREE.Mesh(new THREE.BufferGeometry(), g0.mats.bulb);
    { const parts = bulbs.map(([x, y, z]) => { const s = new THREE.SphereGeometry(0.03, 16, 10); s.translate(x, y, z); return s; }); this.bulbs.geometry = mergeGeometries(parts, false); }
    this.bulbs.name = 'garage:signBulbs';
    g0.add(this.bulbs);
    // the louvred vent in the false front
    const vx = -3.3, vy = 3.86;
    K.box('paint', vx - 0.24, vy - 0.24, zo, vx + 0.24, vy + 0.24, zo + 0.03, { tint: T.galv });
    K.box('flat', vx - 0.2, vy - 0.2, zo + 0.03, vx + 0.2, vy + 0.2, zo + 0.031, { tint: T.black });
    for (let i = 0; i < 6; i++) K.quad('paint', [vx - 0.2, vy - 0.2 + i * 0.066, zo + 0.06], [vx + 0.2, vy - 0.2 + i * 0.066, zo + 0.06], [vx + 0.2, vy - 0.13 + i * 0.066, zo + 0.032], [vx - 0.2, vy - 0.13 + i * 0.066, zo + 0.032], [0, 0.5, 1], { tint: tintK(T.galv, i % 2 ? 0.94 : 1) });
    // the service bracket where the pole's drop lands, its insulators, the cable down to the meter
    const mx = 3.99;
    K.box('paint', 3.84, 4.3, zo, 3.96, 4.36, zo + 0.012, { tint: T.steelDark });
    K.beam('paint', [3.9, 4.33, zo], [3.9, 4.45, zo + 0.1], 0.02, 0.02, { tint: T.steelDark });
    for (const dx of [-0.04, 0.04]) turn(K.use('gloss', { tint: T.white }), 3.9 + dx, 4.45, zo + 0.1, [[0, 0], [0.02, 0], [0.022, 0.006], [0.014, 0.018], [0.014, 0.024], [0.022, 0.036], [0.02, 0.042], [0, 0.042]], 14);
    K.pipe('flat', [[3.9, 4.46, zo + 0.1], [4.06, 4.3, zo + 0.02], [4.08, 2.78, zo + 0.02], [mx, 2.64, zo + 0.03]], 0.008, { tint: T.black, sides: 5 });
    for (const y of [3.0, 3.6, 4.1]) K.box('paint', 4.062, y, zo, 4.098, y + 0.012, zo + 0.032, { tint: T.steel });
    // the watt-hour meter on its board: base, rim and face, the terminal cover with its seal, the inspection stickers
    K.box('wood', mx - 0.15, 2.18, zo, mx + 0.15, 2.64, zo + 0.02, { grain: 'y', tint: T.brown });
    turnZ(K.use('paint', { tint: 0x8d9698, cast: true }), mx, 2.47, zo + 0.02, [[0.1, 0], [0.1, 0.046], [0.098, 0.056], [0.094, 0.062], [0, 0.062]], 28);
    turnZ(K.use('gloss', { tint: 0xdfe8ea }), mx, 2.47, zo + 0.082, [[0.094, 0], [0.093, 0.02], [0.089, 0.031], [0.083, 0.036], [0.08, 0.034], [0.08, 0.004]], 28);
    this.pr('meter', '+z', mx, 2.47, zo + 0.088, 0.166);
    K.box('paint', mx - 0.06, 2.26, zo + 0.02, mx + 0.06, 2.35, zo + 0.07, { tint: 0x5f666c, bevel: 0.008 });
    K.box('gloss', mx + 0.035, 2.27, zo + 0.07, mx + 0.05, 2.285, zo + 0.076, { tint: T.red });
    this.pr('kentei', '+z', mx - 0.09, 2.585, zo + 0.022, 0.09, { rot: 0.04 });
    // the fire-extinguisher box on the pier: red steel, a pull handle, 消火器 down its door
    const ex = 3.5;
    K.box('paint', ex - 0.13, 0.3, zo, ex + 0.13, 0.94, zo + 0.17, { tint: T.red, bevel: 0.012, cast: true });
    K.box('paint', ex - 0.11, 0.32, zo + 0.17, ex + 0.11, 0.92, zo + 0.174, { tint: tintK(T.red, 0.9) });
    K.box('paint', ex + 0.07, 0.56, zo + 0.174, ex + 0.09, 0.66, zo + 0.19, { tint: T.steelDark });
    this.pr('shokaki', '+z', ex - 0.02, 0.63, zo + 0.176, 0.125);
    for (const s of [-1, 1]) K.box('paint', ex + s * 0.1 - 0.01, 0.26, zo, ex + s * 0.1 + 0.01, 0.3, zo + 0.03, { tint: T.steelDark });
    // 火の用心 and the block's enamel address plate on the left pier
    this.pr('hinoyojin', '+z', -3.3, 1.55, zo + 0.002, 0.105, { rot: 0.02 });
    this.pr('chome', '+z', -3.92, 1.9, zo + 0.004, 0.125);
    K.box('paint', -3.99, 1.68, zo, -3.85, 2.12, zo + 0.003, { tint: 0x3a5a90 });
  }

  update() {
    const g0 = this.garage, town = g0.town, S = town?.shop, M = g0.mats;
    const open = !!town?.shopOpen;
    if (this.noren.visible !== open) this.noren.visible = open;
    // the lanterns out front glow with the town's switch and the time of day (the town drives its own lantern
    // material and the warm point light under the awning: this copies it); the sign's lamps burn while it's open
    const k = S?.lanternM ? S.lanternM.emissiveIntensity : (town?.lanternsOn ? 1.2 : 0);
    M.lantern.emissiveIntensity = k * 0.7;
    M.lantern.color.setScalar(k > 0.01 ? 1 : 0.5);
    const lit = open && k > 0.01;
    if (this.bulbs.visible !== lit) this.bulbs.visible = lit;
    // inside, the sign box and the string of lanterns only need the mains
    const power = this.game.bills?.powerOn !== false ? 1 : 0;
    M.lanternIn.emissiveIntensity = 0.9 * power; M.lanternIn.color.setScalar(power ? 1 : 0.5);
    M.signGlow.emissiveIntensity = 0.28 * power;
    this.signLight.intensity = 1.6 * power;
  }
}
