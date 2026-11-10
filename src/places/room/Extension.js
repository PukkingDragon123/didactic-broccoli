// Flat 103 next door, joined to your room (#102) once you rent it (game.growth, src/growth/): Mrs. Ota's nephew puts a
// door where the old, dead unit bath was, in your kitchen's east wall. Through it (and through 103's own front door
// on the lane): a kitchen with a two-ring gas stove where you cook simple meals (one per mealtime, more energy than
// anything from a shop), a tiled bathroom with an ofuro (fill it at the panel, get in: energy back, the hangover
// gone), and a back room: a spare six-mat room, then (the hobby room upgrade) a lit collection cabinet that shows one
// of every figure you've discovered, a glass showcase for 24 favourites and an armchair to admire them from.
// Built off the map (src/growth/data.js ORIGINS.home103) once you rent it, and only shown while you're in it. Extends src/places/room/
// Room.js without changing it: the connecting door is added to the room's group.
//   game.places.home103 = { zone, build(), cookStep(dt), takeDish(), fillBath(), bath(), applyTier() }     save: game.state.growth.home
import * as THREE from 'three';
import { audio } from '../../core/audio.js';
import { makeItemMesh } from '../../game/collectibles.js';
import { makeToolMesh } from '../../game/Held.js';
import { TOOLS } from '../../data/tools.js';
import { FOODS } from '../../needs/foods.js';
import { getItem } from '../../data/series/index.js';
import { RARITY_ORDER } from '../../data/rarity.js';
import { Zone, V, pick, goTo, canvasMat, pixText } from '../../growth/kit.js';
import { ORIGINS } from '../../growth/data.js';
import { IKit, imats } from '../ikit.js';

const ROOM102 = new THREE.Vector3(80, 0, -80); // src/places/room/Room.js ORIGIN
const LANE_DOOR = { x: 21.7, z: 2.2 }; // 103's door on the lane (Sakura Heights, src/world/Neighbours.js: unit 3)
const sfx = (n, o = {}) => { try { audio.play(n, o); } catch { /* audio not ready */ } };
const H = 2.4;

// ------------------------------------------------------------------ home-cooked food (carried tools + FOODS entries)
const DISHES = {
  home_tkg: { name: 'Tamago kake gohan', jp: '卵かけご飯', prop: 'gr_dish_tkg', icon: 'onigiri', energy: 22, full: 30, fx: [['calm', 60, 0.6]], pros: 'Home-made: a raw egg over hot rice, soy sauce', cons: 'Very breakfast' },
  home_yakisoba: { name: 'Home yakisoba', jp: '焼きそば', prop: 'gr_dish_yakisoba', icon: 'cupnoodle', how: 'slurp', energy: 30, full: 38, fx: [['warm', 60, 1]], pros: 'Home-made: fried noodles, cabbage, aonori', cons: 'Aonori in your teeth' },
  home_curry: { name: 'Home curry rice', jp: 'カレーライス', prop: 'gr_dish_curry', icon: 'onigiri', energy: 36, full: 48, fx: [['warm', 90, 1], ['full', 120, 1]], pros: 'Home-made curry: big, slow energy', cons: 'You will smell of curry' },
};
for (const [id, d] of Object.entries(DISHES)) {
  if (!FOODS[id]) FOODS[id] = { id, how: d.how || 'eat', energy: d.energy, full: d.full, fx: d.fx, drunk: 0, cures: ['hungry'], price: 0, name: d.name, jp: d.jp, prop: d.prop, icon: d.icon, pros: d.pros, cons: d.cons, desc: `${d.name}, cooked in your own kitchen.`, hot: true };
  if (!TOOLS[id]) TOOLS[id] = { name: d.name, icon: d.icon, prop: d.prop, desc: `${d.pros}. Click to eat it.`, hand: 0.16 };
}
const MEAL = (h) => (h < 11 ? ['breakfast', 'home_tkg'] : h < 16 ? ['lunch', 'home_yakisoba'] : ['dinner', 'home_curry']);

export class Extension {
  constructor(game, places) {
    this.game = game;
    this.places = places;
    this.G = game.growth;
    this.s = this.G.s.home;
    this.s.figs ||= [];
    this.zone = null;
    this.doorIn102();
    this.laneDoor();
    if (this.tier >= 1) this.build(); // (the flat itself is only built once it's yours)
    this.applyTier();
    game.events.on('growth', ({ id } = {}) => { if (id === 'home103' || id === 'hobby') { if (this.tier >= 1) this.build(); this.applyTier(); } });
  }

  build() {
    if (this.zone) return this.zone;
    const Z = this.zone = new Zone(this.game, {
      id: 'home103', name: 'Flat 103', origin: ORIGINS.home103, light: 'lamp', far: 30,
      spawn: [-1.9, 1.85, 0], exit: { x: LANE_DOOR.x, z: LANE_DOOR.z + 0.75, yaw: Math.PI },
      lamp: { x: -0.6, y: 2.2, z: 1.4, color: 0xffe6c0, intensity: 2.6 },
      lamp2: { x: 0, y: 2.2, z: -1.3, color: 0xfff0dc, intensity: 2.8 },
      onEnter: () => this.onEnter(), onExit: () => this.onExit(), update: (dt) => this.tick(dt),
    });
    this.mats();
    this.shell();
    this.kitchen();
    this.bathroom();
    this.backRoom();
    Z.flush();
    return Z;
  }

  get tier() { return this.G.has('hobby') ? 2 : this.G.has('home103') ? 1 : 0; }

  mats() {
    const Z = this.zone;
    this.conv = (m) => Z.mat(m);
    this.IM = imats(this.places._ikConv ||= (m) => this.places.mat(m));
    const M = this.IM;
    this.M = { glass: M.glass, glow: M.glow };
  }
  /** A kit in this zone's coordinates (frame at the zone origin). */
  kit() { const K = new IKit(this.IM); return { K, F: K.at(this.zone.o.x, 0, this.zone.o.z, 0) }; }

  // ------------------------------------------------------------------ walls, floors, doors (zone-local, origin = middle)
  shell() {
    const Z = this.zone, t = 0.12;
    const X0 = -2.5, X1 = 2.5, Z0 = -2.8, Z1 = 2.8, ZP = 0.2;
    this.dims = { X0, X1, Z0, Z1, ZP };
    const { K, F } = this.kit(), o = Z.o;
    const PAPER = 0xede7da, WOOD = 0xb98a5a, TRIM = 0xc79a6a, BT = 0xcfe0e6;
    // floors: wood-look flooring in the kitchen strip (boards along z), the genkan a step down, the bathroom's tiles
    F.box('wood', X0, -0.05, ZP, 0.8, 0, Z1 - 0.7, { tint: WOOD, grain: 'z' });
    F.box('wood', -1.3, -0.05, Z1 - 0.7, 0.8, 0, Z1, { tint: WOOD, grain: 'z' });
    F.box('ftile', X0, -0.16, Z1 - 0.7, -1.3, -0.12, Z1, { tint: 0x9a958c });
    F.box('timber', X0, -0.12, Z1 - 0.76, -1.3, 0.006, Z1 - 0.68, { tint: 0x8a5a36, grain: 'x', bevel: 0.008 });
    F.box('ftile', -1.32, -0.12, Z1 - 0.68, -1.3, 0, Z1, { tint: 0x8e8980 });
    F.box('tile', 0.85, -0.04, ZP + 0.05, X1, 0.01, Z1, { tint: 0xa9bcc2 });
    F.box('zinc', 1.3, 0.008, 1.5, 1.42, 0.012, 1.62, { tint: 0x9aa0a4 });
    // walls: wallpaper round the kitchen and the back room, tiles inside the bathroom
    F.box('wallpaper', X0 - t, -0.12, Z0 - t, X0, H, Z1 + t, { tint: PAPER });
    F.box('wallpaper', X1, -0.12, Z0 - t, X1 + t, H, Z1 + t, { tint: PAPER });
    F.box('wallpaper', X0 - t, 0, Z0 - t, X1 + t, H, Z0, { tint: PAPER });
    const dx0 = -2.3, dx1 = -1.5;
    F.box('wallpaper', dx1 + 0.04, -0.12, Z1, X1 + t, H, Z1 + t, { tint: PAPER });
    F.box('wallpaper', X0 - t, -0.12, Z1, dx0 - 0.04, H, Z1 + t, { tint: PAPER });
    F.box('wallpaper', dx0 - 0.04, 1.88, Z1, dx1 + 0.04, H, Z1 + t, { tint: PAPER });
    // 103's own front door (steel, from inside) in its frame
    const FF = K.at(o.x, 0, o.z + Z1, Math.PI); // local x = -x, local +z = into the room
    FF.box('satin', -dx1 + 0.002, -0.118, 0.005, -dx0 - 0.002, 1.83, 0.045, { tint: 0xcfc6b2, bevel: 0.008 });
    FF.box('satin', -dx1 + 0.07, -0.02, 0.045, -dx0 - 0.07, 1.73, 0.05, { tint: 0xc4bba6 });
    for (const [a, b] of [[-dx1 - 0.045, -dx1], [-dx0, -dx0 + 0.045]]) FF.box('paint', a, -0.12, -0.01, b, 1.88, 0.07, { tint: 0x8e887e, bevel: 0.006 });
    FF.box('paint', -dx1 - 0.045, 1.83, -0.01, -dx0 + 0.045, 1.88, 0.07, { tint: 0x8e887e, bevel: 0.006 });
    const hx = -dx0 - 0.08;
    FF.lathe('chrome', hx, 0.85, 0.045, [[0, 0], [0.032, 0], [0.034, 0.006], [0.028, 0.012], [0.012, 0.016], [0, 0.016]], 16, { axis: 'z' });
    FF.rod('chrome', [hx, 0.85, 0.055], [hx, 0.85, 0.105], 0.009, { sides: 12 });
    FF.rod('chrome', [hx, 0.85, 0.105], [hx - 0.12, 0.845, 0.11], 0.009, { sides: 12 });
    FF.lathe('chrome', -(dx0 + dx1) / 2, 1.45, 0.045, [[0, 0], [0.012, 0], [0.012, 0.008], [0.005, 0.01], [0, 0.009]], 12, { axis: 'z' });
    FF.switchPlate(-dx1 + 0.25, 1.1, 0);
    // the connecting door from 102 in the west wall (z 0.72..1.48): a flush door with its casing and a brass knob
    const FW = K.at(o.x + X0, 0, o.z, Math.PI / 2); // local x = -z, local +z = into the room (+x)
    FW.box('ply', -1.48, 0, 0.0, -0.72, 1.95, 0.035, { tint: 0xa87a4c, bevel: 0.006 });
    for (const zz of [-1.52, -0.68]) FW.box('wood', zz - 0.04, 0, -0.01, zz + 0.04, 2.0, 0.05, { tint: TRIM, grain: 'y', bevel: 0.004 });
    FW.box('wood', -1.56, 1.95, -0.01, -0.64, 2.03, 0.05, { tint: TRIM, grain: 'x', bevel: 0.004 });
    FW.lathe('satin', -1.38, 0.95, 0.035, [[0, 0], [0.028, 0], [0.028, 0.006], [0.01, 0.01], [0.01, 0.045], [0.026, 0.055], [0.028, 0.07], [0.018, 0.08], [0, 0.082]], 16, { axis: 'z', tint: 0xc8a048 });
    // the partition (kitchen | back room) with an opening x -0.7..0.7, and the bathroom wall (x 0.8, door z 1.1..1.8)
    F.box('wallpaper', X0, 0, ZP - 0.05, -0.7, H, ZP + 0.05, { tint: PAPER });
    F.box('wallpaper', 0.7, 0, ZP - 0.05, X1, H, ZP + 0.05, { tint: PAPER });
    F.box('wallpaper', -0.7, 1.85, ZP - 0.05, 0.7, H, ZP + 0.05, { tint: PAPER });
    for (const x of [-0.7, 0.7]) F.box('wood', x - 0.045, 0, ZP - 0.065, x + 0.045, 1.92, ZP + 0.065, { tint: TRIM, grain: 'y', bevel: 0.004 });
    F.box('wood', -0.745, 1.85, ZP - 0.065, 0.745, 1.92, ZP + 0.065, { tint: TRIM, grain: 'x', bevel: 0.004 });
    F.box('wood', -0.7, -0.05, ZP - 0.05, 0.7, 0.004, ZP + 0.05, { tint: 0xb48a5c, grain: 'x', bevel: 0.003 });
    for (const [z0, z1, y0, y1] of [[ZP + 0.05, 1.1, 0, H], [1.8, Z1, 0, H], [1.1, 1.8, 1.9, H]]) {
      F.box('wallpaper', 0.75, y0, z0, 0.8, y1, z1, { tint: PAPER });
      F.box('tile', 0.8, y0, z0, 0.85, y1, z1, { tint: BT });
    }
    F.box('satin', 0.74, 1.88, 1.08, 0.86, 1.92, 1.82, { tint: 0xb8bcc2, bevel: 0.004 });
    for (const zz of [1.08, 1.8]) F.box('satin', 0.74, 0, zz, 0.86, 1.9, zz + 0.02, { tint: 0xb8bcc2 });
    F.box('tile', X1 - 0.012, 0, ZP + 0.05, X1, H, Z1, { tint: BT });
    F.box('tile', 0.85, 0, Z1 - 0.012, X1, H, Z1, { tint: BT });
    F.box('tile', 0.85, 0, ZP + 0.05, X1, H, ZP + 0.062, { tint: BT });
    // ceilings: white in the kitchen, a bathroom ceiling of moisture-proof panels, boards and battens in the back room
    F.box('ply', X0, H, Z0, X1, H + 0.02, ZP, { tint: 0xc8a57a });
    for (let x = X0 + 0.45; x < X1 - 0.1; x += 0.45) F.box('wood', x - 0.015, H - 0.03, Z0, x + 0.015, H, ZP - 0.05, { tint: 0xa77a4e, grain: 'z' });
    F.box('wallpaper', X0, H, ZP, 0.8, H + 0.02, Z1, { tint: 0xf2efe8 });
    F.box('paint', 0.8, H - 0.02, ZP, X1, H, Z1, { tint: 0xe8ecec });
    for (let z = ZP + 0.3; z < Z1; z += 0.3) F.box('satin', 0.85, H - 0.024, z - 0.004, X1, H - 0.02, z + 0.004, { tint: 0xc8ccce });
    // skirting + mouldings in the back room, vinyl skirting in the kitchen
    for (const [a, b] of [[[X0, Z0], [X1, Z0 + 0.014]], [[X0, Z0], [X0 + 0.014, ZP - 0.05]], [[X1 - 0.014, Z0], [X1, ZP - 0.05]]]) {
      F.box('wood', a[0], 0, a[1], b[0], 0.06, b[1], { tint: 0x7a5236, bevel: 0.003 });
      F.box('wood', a[0], H - 0.07, a[1], b[0], H, b[1], { tint: TRIM, bevel: 0.003 });
    }
    F.box('satin', X0, 0, ZP + 0.05, X0 + 0.012, 0.06, Z1 - 0.7, { tint: 0x8a7a6a });
    // lamps: a fluorescent batten over the kitchen, a frosted bowl in the bathroom (the back room's pendant is in backRoom)
    F.batten(-0.6, H, 1.4, 0.9);
    F.lathe('frost', 1.65, H - 0.13, 1.5, [[0, 0], [0.09, 0.01], [0.12, 0.05], [0.12, 0.11], [0.13, 0.13]], 20, { tint: 0xf4f4ee });
    F.lathe('glow', 1.65, H - 0.125, 1.5, [[0, 0], [0.07, 0.02], [0.08, 0.04], [0, 0.05]], 12, { tint: 0xfff6e4 });
    K.done(Z.group, 'home103');
    // obstacles
    Z.block(X0 - 0.5, X0, Z0 - 0.5, Z1 + 0.5); Z.block(X1, X1 + 0.5, Z0 - 0.5, Z1 + 0.5);
    Z.block(X0 - 0.5, X1 + 0.5, Z0 - 0.5, Z0); Z.block(X0 - 0.5, X1 + 0.5, Z1, Z1 + 0.5);
    Z.block(X0, -0.7, ZP - 0.06, ZP + 0.06); Z.block(0.7, X1, ZP - 0.06, ZP + 0.06);
    Z.block(0.75, 0.85, ZP, 1.1); Z.block(0.75, 0.85, 1.8, Z1);
    Z.block(X0, -1.3, Z1 - 0.75, Z1); // the genkan is a step down: you stay on the wood
    // ray blockers (no clicking through walls)
    for (const [w, d, x, z] of [[-0.7 - X0, 0.1, (X0 - 0.7) / 2, ZP], [X1 - 0.7, 0.1, (0.7 + X1) / 2, ZP], [0.1, 0.9, 0.8, (ZP + 1.1) / 2], [0.1, Z1 - 1.8, 0.8, (1.8 + Z1) / 2]]) {
      const b = Z.hit(w, H, d, x, H / 2, z, null);
      this.game.interaction.blockers.push(b);
    }
    // the doors
    Z.hit(0.1, 1.95, 0.76, X0 + 0.05, 0.98, 1.1, { reach: 2.2, hint: () => ({ key: 'LMB', text: 'Back to your room (102)', sub: 'The connecting door' }), use: () => { this.to102(); return false; } });
    Z.hit(0.8, 2.0, 0.1, -1.9, 0.9, Z1 - 0.05, { reach: 2.4, hint: () => ({ key: 'LMB', text: 'Go outside', sub: 'Sakura Heights #103' }), use: () => { this.places.exit({ sound: 'lockClick' }); return false; } });
  }

  // ------------------------------------------------------------------ kitchen
  kitchen() {
    const Z = this.zone, z1 = this.dims.Z1, { K, F } = this.kit();
    // the sink unit along the front wall: cupboard doors, a stainless top with its basin, the mixer tap; the two-ring
    // gas stove on its own steel top on the right; a tiled splash-back, a wall cupboard, the range hood
    const CR = 0xefe5cc;
    F.box('ply', -1.3, 0.08, z1 - 0.6, 0.6, 0.8, z1, { tint: CR, bevel: 0.006 });
    F.box('flat', -1.28, 0, z1 - 0.56, 0.58, 0.08, z1, { tint: 0x3a3430 });
    for (let i = 0; i < 4; i++) {
      const x = -1.06 + i * 0.475;
      F.box('ply', x - 0.225, 0.11, z1 - 0.615, x + 0.225, 0.77, z1 - 0.6, { tint: 0xf6eedc, bevel: 0.004 });
      F.box('chrome', x - 0.06, 0.68, z1 - 0.635, x + 0.06, 0.695, z1 - 0.615, { bevel: 0.004 });
    }
    F.box('zinc', -1.32, 0.8, z1 - 0.62, 0.62, 0.84, z1, { tint: 0xc8ccd0, bevel: 0.008 });
    F.box('zinc', -1.0, 0.7, z1 - 0.5, -0.5, 0.842, z1 - 0.14, { tint: 0x8a8e94, skip: ['py'] });
    F.box('zinc', -0.99, 0.69, z1 - 0.49, -0.51, 0.7, z1 - 0.15, { tint: 0x7a7e84 });
    F.lathe('chrome', -0.75, 0.84, z1 - 0.08, [[0, 0], [0.03, 0], [0.03, 0.02], [0.014, 0.03], [0.014, 0.26], [0, 0.27]], 14);
    F.pipe('chrome', [[-0.75, 1.07, z1 - 0.08], [-0.75, 1.11, z1 - 0.12], [-0.75, 1.1, z1 - 0.26]], 0.011, { sides: 12 });
    F.box('chrome', -0.77, 1.1, z1 - 0.07, -0.73, 1.12, z1 + 0.02, { bevel: 0.006 });
    F.box('tile', -1.3, 0.84, z1 - 0.012, 0.6, 1.45, z1, { tint: 0xe8ece6 });
    F.box('ply', -1.3, 1.45, z1 - 0.34, -0.02, 2.0, z1, { tint: CR, bevel: 0.006 });
    for (let i = 0; i < 3; i++) { const x = -1.08 + i * 0.42; F.box('ply', x - 0.2, 1.47, z1 - 0.355, x + 0.2, 1.98, z1 - 0.34, { tint: 0xf6eedc, bevel: 0.004 }); F.box('chrome', x - 0.06, 1.5, z1 - 0.375, x + 0.06, 1.515, z1 - 0.355, { bevel: 0.004 }); }
    // the range hood: a cream canopy, its grease filter and lamp, the duct up to the ceiling
    F.box('satin', 0.0, 1.62, z1 - 0.46, 0.62, 1.84, z1, { tint: 0xe6e0d2, bevel: 0.012 });
    F.box('satin', 0.03, 1.615, z1 - 0.44, 0.59, 1.62, z1 - 0.04, { tint: 0x8a8e92 });
    F.box('glow', 0.42, 1.612, z1 - 0.4, 0.54, 1.616, z1 - 0.32, { tint: 0xfff2d8 });
    F.box('satin', 0.12, 1.84, z1 - 0.32, 0.5, H, z1 - 0.04, { tint: 0xe0dacc, bevel: 0.006 });
    F.box('satin', 0.04, 1.7, z1 - 0.465, 0.2, 1.76, z1 - 0.458, { tint: 0x5a5e62 });
    Z.prop('gr_stove', 0.3, 0.86, z1 - 0.32, Math.PI);
    this.pan = Z.prop('gr_pan', 0.44, 0.99, z1 - 0.34, Math.PI - 0.4);
    Z.prop('gr_ricecooker', -1.12, 0.86, z1 - 0.3, Math.PI);
    Z.prop('room_mug', -1.25, 0.86, z1 - 0.48, 0.4);
    Z.block(-1.3, 0.6, z1 - 0.62, z1);
    // a little dining spot by the partition: a stool and a narrow shelf-table on two legs
    F.box('wood', -2.1, 0.74, 0.27, -1.1, 0.775, 0.58, { tint: 0xc8a070, grain: 'x', bevel: 0.008 });
    for (const x of [-2.05, -1.15]) { F.box('timber', x - 0.02, 0, 0.47, x + 0.02, 0.74, 0.51, { tint: 0x7a5030, grain: 'y', bevel: 0.004 }); F.box('timber', x - 0.02, 0.02, 0.27, x + 0.02, 0.05, 0.56, { tint: 0x7a5030, bevel: 0.004 }); }
    K.done(Z.group, 'home103:kitchen');
    Z.prop('stool', -1.25, 0, 0.7, 0.2);
    Z.block(-2.1, -1.1, 0.25, 0.6);
    // the stove: hold to cook
    this.stoveHit = Z.hit(0.6, 0.3, 0.45, 0.3, 1.0, z1 - 0.32, {
      reach: 2.2,
      hint: () => this.cookHint(),
      use: () => !this.cooking && !this.dish && this.canCook() === null,
      hold: {
        canStart: () => !this.cooking && !this.dish && this.canCook() === null,
        start: () => { this.cooking = { t: 0 }; sfx('gasOn', { vol: 0.6 }); },
        update: (dt) => this.cookStep(dt),
        done: () => !this.cooking,
        end: () => { if (this.cooking && this.cooking.t < 2.6) this.cooking = null; },
      },
    });
    // the sink: a glass of water
    Z.hit(0.5, 0.25, 0.4, -0.75, 0.95, z1 - 0.32, { reach: 2, hint: () => ({ key: 'LMB', text: 'A glass of tap water', sub: 'Morio-cho tap water. Perfectly fine.' }), use: () => { sfx('pour', { vol: 0.4 }); this.game.needs?.add(2, 'water'); this.game.needs?.cure?.('jitters'); return false; } });
  }
  canCook() {
    const h = this.game.clock?.hours ?? 12, [meal] = MEAL(h), day = this.game.clock?.day ?? 1;
    if (this.s.cooked[meal] === day) return `You already made ${meal} today`;
    return null;
  }
  cookHint() {
    if (this.dish) return { key: '', text: 'It\'s ready: on the counter', sub: 'Pick it up and eat' };
    const why = this.canCook(), [meal, id] = MEAL(this.game.clock?.hours ?? 12);
    if (why) return { key: '', text: 'Gas stove', sub: why };
    return { key: 'Hold LMB', text: `Cook ${meal}: ${DISHES[id].name}`, sub: `${DISHES[id].pros}. 15 minutes` };
  }
  cookStep(dt) {
    const C = this.cooking;
    if (!C) return;
    C.t += dt;
    const g = this.game, pan = this.pan;
    pan.position.y = 0.99 + Math.abs(Math.sin(C.t * 9)) * 0.025;
    pan.rotation.z = Math.sin(C.t * 9) * 0.06;
    if (Math.floor(C.t * 1.5) !== Math.floor((C.t - dt) * 1.5)) { sfx('sizzle', { vol: 0.5 }); g.effects.puff({ pos: pan.position.clone().add(V(0, 0.08, 0)), count: 3, colors: [0xf4f4f0, 0xe0e0dc], size: 0.05, up: 0.35, radius: 0.12, life: 1.2 }); }
    if (C.t >= 2.8) {
      this.cooking = null;
      pan.rotation.z = 0; pan.position.y = 0.99;
      const h = g.clock?.hours ?? 12, [meal, id] = MEAL(h);
      this.s.cooked[meal] = g.clock?.day ?? 1;
      g.clock?.advance?.(15);
      // the dish appears on the counter by the stove: click it to pick it up
      const obj = makeToolMesh(id);
      obj.position.copy(this.zone.L(-0.3, 0.92, this.dims.Z1 - 0.32));
      this.zone.group.add(obj);
      this.zone.convert(obj);
      this.dish = { id, obj };
      this.zone.target(obj, { reach: 2.2, hint: () => (this.game.held.canTake() ? { key: 'LMB', text: `Take the ${DISHES[id].name}`, sub: 'Then click to eat it' } : { key: '', text: DISHES[id].name, sub: 'Your hands are full' }), use: () => { this.takeDish(); return false; } });
      sfx('task', { vol: 0.4 });
      g.monologue?.say(pick(['Smells like home.', 'Not bad, if I say so myself.', 'Grandma\'s recipe. More or less.']), { force: true });
      this.G.give('gr_cook');
      g.events.emit('cooked', { id, meal });
      g.save?.();
    }
  }
  takeDish() {
    const D = this.dish, H = this.game.held;
    if (!D || !H.canTake()) return;
    this.zone.untarget(D.obj);
    this.dish = null;
    const p = D.obj.getWorldPosition(new THREE.Vector3());
    this.zone.group.remove(D.obj);
    const obj = makeToolMesh(D.id);
    obj.position.copy(p);
    this.game.scene.add(obj);
    H.take('tool', { id: D.id }, obj);
  }

  // ------------------------------------------------------------------ bathroom
  bathroom() {
    const Z = this.zone, X1 = this.dims.X1, { K, F } = this.kit();
    // the tub against the east wall, the wash place with the stool, the bucket, a shower on the wall, a mirror
    const tub = { x: X1 - 0.55, z: 0.82 };
    Z.prop('gr_ofuro', tub.x, 0, tub.z, -Math.PI / 2, 1);
    Z.block(tub.x - 0.4, X1, tub.z - 0.53, tub.z + 0.53);
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.9), Z.mat(new THREE.MeshStandardMaterial({ color: 0x6ab8d8, roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.82 })));
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.copy(Z.L(tub.x, 0.12, tub.z));
    Z.group.add(this.water);
    this.tub = tub;
    Z.prop('gr_bath_stool', X1 - 0.75, 0, 2.05, 0.3);
    Z.prop('gr_oke', X1 - 0.45, 0, 2.35, 0);
    // the shower: a slide bar with the head in its holder, the hose down to the mixer; the mirror and a soap shelf
    const FE = K.at(Z.o.x + X1, 0, Z.o.z, -Math.PI / 2); // local x = z, local +z = into the room (-x)
    FE.rod('chrome', [2.2, 0.95, 0.04], [2.2, 1.85, 0.04], 0.012, { sides: 12 });
    for (const y of [0.95, 1.85]) FE.box('chrome', 2.18, y - 0.02, 0, 2.22, y + 0.02, 0.05, { bevel: 0.006 });
    FE.box('gloss', 2.17, 1.66, 0.04, 2.23, 1.72, 0.07, { tint: 0xe8e8ea, bevel: 0.008 });
    FE.lathe('gloss', 2.2, 1.75, 0.08, [[0.0, -0.04], [0.035, -0.035], [0.04, 0], [0.035, 0.012], [0, 0.014]], 16, { axis: 'z', tint: 0xeeeeef });
    FE.rod('gloss', [2.2, 1.66, 0.06], [2.2, 1.66, 0.075], 0.012, { tint: 0xe8e8ea });
    FE.pipe('chrome', [[2.2, 1.66, 0.07], [2.22, 1.2, 0.1], [2.16, 0.75, 0.08], [2.05, 0.62, 0.06]], 0.009, { sides: 8 });
    FE.box('chrome', 1.88, 0.56, 0, 2.12, 0.64, 0.06, { bevel: 0.015 });
    for (const x of [1.92, 2.08]) FE.lathe('chrome', x, 0.6, 0.06, [[0, 0], [0.026, 0], [0.026, 0.012], [0.02, 0.03], [0, 0.032]], 12, { axis: 'z' });
    FE.rod('chrome', [2.0, 0.56, 0.05], [2.0, 0.5, 0.1], 0.008, { sides: 10 });
    FE.box('satin', 1.78, 1.04, 0.0, 2.22, 1.58, 0.012, { tint: 0xb8bcc2, bevel: 0.004 });
    FE.box('chrome', 1.8, 1.06, 0.012, 2.2, 1.56, 0.014, { tint: 0xdde6ea });
    FE.box('gloss', 1.82, 0.96, 0, 2.18, 0.98, 0.1, { tint: 0xf2f2f0, bevel: 0.006 });
    // a frosted sliding door, half open, onto the kitchen (x 0.8): its frame, the panel, a pull
    const FD = K.at(Z.o.x + 0.8, 0, Z.o.z, Math.PI / 2); // local x = -z, local +z = +x (into the bathroom)
    for (const [a, b] of [[-1.8, -1.77], [-1.45, -1.42]]) FD.box('satin', a, 0.01, 0.0, b, 1.86, 0.03, { tint: 0xc8ccd2, bevel: 0.004 });
    for (const [a, b] of [[0.01, 0.1], [1.78, 1.86]]) FD.box('satin', -1.77, a, 0.0, -1.45, b, 0.03, { tint: 0xc8ccd2, bevel: 0.004 });
    FD.box('frost', -1.77, 0.1, 0.01, -1.45, 1.78, 0.02, { tint: 0xd8e2e8 });
    for (let y = 0.26; y < 1.7; y += 0.16) for (const [z0, z1] of [[0.0, 0.01], [0.02, 0.03]]) FD.box('satin', -1.77, y, z0, -1.45, y + 0.012, z1, { tint: 0xc0c6cc });
    FD.box('satin', -1.47, 0.85, 0.03, -1.44, 1.0, 0.045, { tint: 0x8a8e94, bevel: 0.005 });
    K.done(Z.group, 'home103:bath');
    // the water heater panel by the door, inside: "fill the bath"
    this.panel = canvasMat(24, 18, (x) => this.drawPanel(x), { glow: true });
    const pm = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.15), this.panel);
    pm.position.copy(Z.L(0.86, 1.3, 0.6)); pm.rotation.y = Math.PI / 2;
    Z.group.add(pm);
    Z.hit(0.06, 0.18, 0.22, 0.86, 1.3, 0.6, { reach: 2.2, hint: () => this.panelHint(), use: () => { this.fillBath(); return false; } });
    Z.hit(0.8, 0.6, 1.0, tub.x, 0.3, tub.z, { reach: 2.4, hint: () => this.tubHint(), use: () => { this.bath(); return false; } });
    this.setWater(this.s.bathFull ? 1 : 0);
  }
  drawPanel(x) {
    const full = this.s.bathFull, fill = this.filling;
    x.fillStyle = '#d8d4cc'; x.fillRect(0, 0, 24, 18);
    x.fillStyle = '#1e2a24'; x.fillRect(2, 2, 20, 8);
    x.fillStyle = fill ? '#ffb040' : full ? '#60ff80' : '#3a6a4a';
    x.font = '8px "DotGothic16"'; x.textBaseline = 'top';
    x.fillText(fill ? 'お湯' : full ? '42℃' : '--', 4, 2);
    x.fillStyle = '#c8322c'; x.fillRect(4, 12, 6, 4);
    x.fillStyle = '#3a5a9a'; x.fillRect(14, 12, 6, 4);
  }
  panelHint() {
    if (this.filling) return { key: '', text: 'Filling the bath...', sub: 'Hot water, 42°C' };
    if (this.s.bathFull) return { key: '', text: 'The bath is ready', sub: '42°C. Get in!' };
    return { key: 'LMB', text: 'Fill the bath', sub: 'The water heater does the rest' };
  }
  tubHint() {
    if (this.filling) return { key: '', text: 'Still filling', sub: '' };
    if (!this.s.bathFull) return { key: '', text: 'The ofuro', sub: 'Empty. Fill it at the panel by the door' };
    const N = this.game.needs, hang = N?.s.hangover > 0.05;
    return { key: 'LMB', text: 'Get in the bath', sub: `30 minutes: energy back up${hang ? ', the hangover gone' : ''}` };
  }
  setWater(k) {
    this.waterK = k;
    this.water.visible = k > 0.02;
    this.water.position.y = 0.1 + k * 0.42;
  }
  fillBath() {
    if (this.filling || this.s.bathFull) return;
    this.filling = { t: 0 };
    sfx('elevButton', { vol: 0.5 });
    sfx('bathFill', { vol: 0.6 });
    this.panel.userData.pix.redraw();
  }
  bath() {
    const g = this.game, self = this, tub = this.tub, Z = this.zone;
    if (!this.s.bathFull || this.filling || g.cutscene.active) return;
    g.cutscene.play(function* (c) {
      yield c.cam({ pos: Z.L(tub.x - 0.1, 0.95, tub.z + 0.3), look: Z.L(tub.x - 1.2, 1.0, tub.z - 0.2), dur: 1.2, fov: 66 });
      sfx('bathSplash', { vol: 0.7 });
      g.effects.puff({ pos: Z.L(tub.x, 0.6, tub.z), count: 10, colors: [0xf4f8fa, 0xe8eef2], size: 0.07, up: 0.3, radius: 0.5, life: 1.6 });
      yield c.wait(0.6);
      g.monologue?.say(pick(['Ahhhhh...', 'Ii yu da na...', 'This is the life.']), { force: true });
      yield c.wait(1.4);
      yield c.fade(1, 1.2);
      g.clock?.advance?.(30);
      const N = g.needs;
      if (N) {
        const hung = N.s.hangover > 0.05;
        N.s.hangover = 0;
        N.add(35, 'bath');
        N.buff('warm', 180, 1); N.buff('calm', 120, 1);
        N.clear('stinky');
        if (hung) g.tweens.wait(3, () => g.monologue?.say('Headache\'s gone. The bath fixes everything.', { force: true }));
      }
      self.s.bathFull = false; self.s.bathDay = g.clock?.day ?? 1;
      self.setWater(0);
      self.panel.userData.pix.redraw();
      g.lighting?.refresh();
      yield c.wait(0.4);
      yield c.fade(0, 1.0);
      yield c.toPlayer(0.8);
    }).then(() => { this.G.give('gr_bath'); g.events.emit('bath', {}); g.save?.(); });
  }

  // ------------------------------------------------------------------ the back room (spare room / hobby room)
  backRoom() {
    const Z = this.zone, M = this.M, { X0, X1, Z0, ZP } = this.dims, o = Z.o;
    // always there: the pendant, a window in the east wall with shoji in front of it (lit by the day outside)
    { const { K, F } = this.kit();
      this.pendant = F.washiLamp(0, H, -1.3, { drop: 0.18 });
      this.pendant.material = this.IM.washiOn;
      const FE = K.at(o.x + X1, 0, o.z, -Math.PI / 2); // local x = z, local +z = into the room (-x)
      FE.box('wood', -2.0, 0.85, -0.02, -0.5, 0.88, 0.1, { tint: 0xc9a172, grain: 'x', bevel: 0.006 });
      FE.box('wood', -2.04, 0.88, -0.02, -1.98, 1.85, 0.06, { tint: 0xc79a6a, grain: 'y', bevel: 0.004 });
      FE.box('wood', -0.52, 0.88, -0.02, -0.46, 1.85, 0.06, { tint: 0xc79a6a, grain: 'y', bevel: 0.004 });
      FE.box('wood', -2.04, 1.85, -0.02, -0.46, 1.91, 0.06, { tint: 0xc79a6a, grain: 'x', bevel: 0.004 });
      FE.shoji(-1.98, -1.24, 0.88, 1.85, 0.05, { glow: true, nx: 3, ny: 4 });
      FE.shoji(-1.26, -0.52, 0.88, 1.85, 0.02, { glow: true, nx: 3, ny: 4 });
      K.done(Z.group, 'home103:back'); }
    // the spare room: tatami (mats and half mats, staggered), a chabudai, boxes nobody has opened
    const spare = this.spare = new THREE.Group();
    { const { K, F } = this.kit();
      F.box('flat', X0, -0.08, Z0, X1, -0.056, ZP - 0.05, { tint: 0x2e2622 });
      const L = (X1 - X0) / 3, D = (ZP - 0.05 - Z0) / 4;
      for (let r = 0; r < 4; r++) {
        const z0 = Z0 + r * D, cuts = r % 2 ? [X0, X0 + L / 2, X0 + 1.5 * L, X0 + 2.5 * L, X1] : [X0, X0 + L, X0 + 2 * L, X1];
        for (let i = 0; i + 1 < cuts.length; i++) F.tatami(cuts[i], z0, cuts[i + 1], z0 + D, { tint: [0xc4b984, 0xc0b47c, 0xc6bb88, 0xbeb27a][(r + i) % 4] });
      }
      K.done(spare, 'home103:spare'); }
    Z.group.add(spare);
    Z.prop('mk_chabudai', 0.2, 0, -1.2, 0.2, 1, spare);
    Z.prop('room_zabuton', 0.25, 0, -0.55, 0.1, 1, spare);
    Z.prop('room_boxes', X1 - 0.5, 0, Z0 + 0.5, 0.2, 1, spare);
    Z.prop('cardboard_bundle', X0 + 0.5, 0, Z0 + 0.45, -0.3, 1, spare);
    // the hobby room: boards, a rug, the long lit collection cabinet, the glass showcase, the armchair
    const hobby = this.hobby = new THREE.Group();
    const cw = 4.4, cx = 0, cz = Z0 + 0.22, sx = X0 + 0.25;
    { const { K, F } = this.kit();
      F.box('wood', X0, -0.05, Z0, X1, 0, ZP - 0.05, { tint: 0xa8784c, grain: 'x' });
      F.box('cloth', -0.7, 0, -1.5, 1.3, 0.008, -0.1, { tint: 0x8a2a3a });
      F.box('cloth', -0.6, 0.008, -1.4, 1.2, 0.011, -0.2, { tint: 0xa83a48 });
      F.box('cloth', -0.5, 0.011, -1.3, 1.1, 0.012, -0.3, { tint: 0x8a2a3a });
      // the cabinet: plinth, carcase, uprights, the shelves, the dark blue back, the cornice with its light
      const W = 0x7a4a2c, c0 = cx - cw / 2, c1 = cx + cw / 2, zb = cz - 0.21, zf = cz + 0.21;
      F.box('timber', c0, 0, zb, c1, 0.12, zf, { tint: W, grain: 'x', bevel: 0.006 });
      F.box('timber', c0 - 0.02, 2.12, zb, c1 + 0.02, 2.2, zf + 0.02, { tint: W, grain: 'x', bevel: 0.008 });
      for (const x of [c0, c1 - 0.06]) F.box('timber', x, 0.12, zb, x + 0.06, 2.12, zf, { tint: W, grain: 'y', bevel: 0.004 });
      for (let i = 1; i < 4; i++) { const x = c0 + i * cw / 4; F.box('timber', x - 0.02, 0.12, zb, x + 0.02, 2.12, zf, { tint: 0x8a5a36, grain: 'y', bevel: 0.003 }); }
      F.box('cloth', c0 + 0.06, 0.12, zb, c1 - 0.06, 2.12, zb + 0.02, { tint: 0x2a3a5a });
      this.cabShelves = [0.16, 0.56, 0.96, 1.36, 1.74];
      for (const y of this.cabShelves) F.box('wood', c0 + 0.06, y - 0.03, zb + 0.02, c1 - 0.06, y, zf - 0.01, { tint: 0xd8c8a8, grain: 'x', bevel: 0.003 });
      F.box('satin', c0 + 0.1, 2.08, cz + 0.1, c1 - 0.1, 2.12, cz + 0.18, { tint: 0x9a9ea2 });
      F.box('glow', c0 + 0.12, 2.06, cz + 0.12, c1 - 0.12, 2.08, cz + 0.16, { tint: 0xfff4dc });
      for (let i = 0; i < 4; i++) { const a = c0 + 0.06 + i * cw / 4, b = a + cw / 4 - 0.06; for (const [p, q] of [[a, a + 0.02], [b - 0.02, b]]) F.box('timber', p, 0.13, zf - 0.006, q, 2.11, zf + 0.012, { tint: 0x6a3e24 }); F.box('chrome', b - 0.06, 1.0, zf + 0.012, b - 0.04, 1.2, zf + 0.022, { bevel: 0.004 }); }
      F.box('timber', c0 - 0.02, 2.2, zf - 0.02, c1 + 0.02, 2.32, zf + 0.02, { tint: 0x2a1a12, bevel: 0.006 });
      // the showcase: a low cabinet on the west wall with a glass case on top
      F.box('timber', sx - 0.225, 0, -1.95, sx + 0.225, 0.6, -0.65, { tint: 0x3a2418, bevel: 0.008 });
      for (const zz of [-1.62, -0.98]) F.box('timber', sx + 0.22, 0.06, zz - 0.3, sx + 0.228, 0.56, zz + 0.3, { tint: 0x4a2e1e, bevel: 0.004 });
      for (const y of [0.62, 1.0, 1.38]) F.box('glass2', sx - 0.2, y - 0.015, -1.92, sx + 0.2, y, -0.68, { tint: 0xd8e8ee });
      for (const [x, z] of [[sx - 0.21, -1.94], [sx + 0.21, -1.94], [sx - 0.21, -0.66], [sx + 0.21, -0.66]]) F.box('chrome', x - 0.012, 0.6, z - 0.012, x + 0.012, 1.78, z + 0.012);
      F.box('timber', sx - 0.225, 1.78, -1.95, sx + 0.225, 1.84, -0.65, { tint: 0x3a2418, bevel: 0.008 });
      K.done(hobby, 'home103:hobby'); }
    const glassF = new THREE.Mesh(new THREE.PlaneGeometry(cw - 0.1, 2.0), M.glass);
    glassF.position.copy(Z.L(cx, 1.12, cz + 0.215)); hobby.add(glassF);
    const glassS = new THREE.Mesh(new THREE.PlaneGeometry(1.24, 1.2), M.glass);
    glassS.position.copy(Z.L(sx + 0.22, 1.2, -1.3)); glassS.rotation.y = Math.PI / 2; hobby.add(glassS);
    this.plaque = canvasMat(96, 16, (x) => this.drawPlaque(x));
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.12), Z.mat(this.plaque));
    pl.position.copy(Z.L(cx, 2.25, cz + 0.22)); hobby.add(pl);
    Z.prop('armchair', X1 - 0.6, 0, -0.6, -Math.PI + 0.5, 1, hobby); // turned to face the cabinet
    Z.prop('floor_lamp', X1 - 0.35, 0, -1.6, 0, 1, hobby);
    Z.prop('plant_monstera', X0 + 0.4, 0, -0.25, 0.3, 0.9, hobby);
    Z.group.add(hobby);
    this.figGroup = new THREE.Group(); hobby.add(this.figGroup);
    this.showGroup = new THREE.Group(); hobby.add(this.showGroup);
    this.cab = { cw, cx, cz, per: 14 };
    this.showSlots = [];
    for (const y of [0.63, 1.01, 1.39]) for (let i = 0; i < 8; i++) this.showSlots.push(V(sx, y + 0.01, -1.85 + i * 0.157));
    // clickables (only meaningful at tier 2)
    this.cabHit = Z.hit(cw, 2.1, 0.45, cx, 1.06, cz, { reach: 3, hint: () => (this.tier < 2 ? null : this.cabHint()), use: () => false });
    this.showHit = Z.hit(0.45, 1.2, 1.3, sx, 1.2, -1.3, { reach: 2.4, hint: () => (this.tier < 2 ? null : this.showHint()), use: () => { if (this.tier >= 2) this.showUse(); return false; } });
    this.chairHit = Z.hit(0.7, 0.9, 0.7, X1 - 0.6, 0.45, -0.6, { reach: 2.2, hint: () => (this.tier < 2 || this.places.seat ? null : { key: 'LMB', text: 'Sit in the armchair', sub: 'Admire the collection. Energy comes back slowly' }), use: () => { if (this.tier >= 2) { this.places.sitAt({ pos: Z.L(X1 - 0.62, 0, -0.55), yaw: 0.5, eye: 1.08, rest: 2.0 }); sfx('sigh', { vol: 0.5 }); } return false; } });
    this.hobbyBlocks = [];
  }
  drawPlaque(x) {
    x.fillStyle = '#2a1a12'; x.fillRect(0, 0, 96, 16);
    x.fillStyle = '#d4a83a'; x.fillRect(1, 1, 94, 1); x.fillRect(1, 14, 94, 1);
    const n = Object.keys(this.game.state.discovered || {}).length;
    pixText(x, `MY COLLECTION  ${n}`, 48, 3, { size: 10, color: '#f4e8c8', align: 'center', font: 'Alagard' });
  }
  cabHint() {
    const n = Object.keys(this.game.state.discovered || {}).length;
    return { key: '', text: `Your collection: ${n} figure${n === 1 ? '' : 's'} discovered`, sub: n > this.cabSlots ? `The ${this.cabSlots} rarest on show` : 'One of every figure you\'ve pulled, on show' };
  }
  showHint() {
    const H = this.game.held, it = H.item, n = this.s.figs.length, max = this.showSlots.length;
    if (it?.kind === 'toy') return n >= max ? { key: '', text: 'Showcase', sub: 'Full' } : { key: 'LMB', text: 'Put it in the showcase', sub: `${n} / ${max}. Your favourites, not for sale` };
    if (n && H.canTake()) return { key: 'LMB', text: 'Take a figure out', sub: `${n} in the showcase` };
    return { key: '', text: 'Glass showcase', sub: 'Bring a figure to put it on show' };
  }
  showUse() {
    const g = this.game, H = g.held, it = H.item, F = this.s.figs;
    if (it?.kind === 'toy') {
      if (F.length >= this.showSlots.length) return;
      const d = { key: it.data.key, finish: it.data.finish };
      const i = F.length, p = this.zone.L(this.showSlots[i].x, this.showSlots[i].y, this.showSlots[i].z);
      H.putTo(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -Math.PI / 2, 0)), (obj) => { obj.parent?.remove(obj); F.push(d); this.drawShowcase(); sfx('place', { vol: 0.6 }); g.save?.(); }, { dur: 0.4 });
      return;
    }
    if (!F.length || !H.canTake()) return;
    const d = F.pop();
    const holder = new THREE.Group();
    holder.add(makeItemMesh(d.key, d.finish));
    const sl = this.showSlots[F.length];
    holder.position.copy(this.zone.L(sl.x, sl.y, sl.z));
    g.scene.add(holder);
    this.drawShowcase();
    H.take('toy', { key: d.key, finish: d.finish }, holder);
    g.save?.();
  }
  drawShowcase() {
    const G = this.showGroup;
    for (const c of [...G.children]) G.remove(c);
    this.s.figs.forEach((d, i) => {
      const m = makeItemMesh(d.key, d.finish), sl = this.showSlots[i];
      m.position.copy(this.zone.L(sl.x, sl.y, sl.z)); m.rotation.y = -Math.PI / 2 + (i % 2 ? 0.2 : -0.2);
      m.scale.multiplyScalar(0.8);
      this.zone.convert(m);
      G.add(m);
    });
  }
  /** One of every discovered figure, rarest first, on the cabinet's shelves (rebuilt when the count changes). */
  drawCabinet() {
    const disc = Object.keys(this.game.state.discovered || {});
    if (this.cabN === disc.length) return;
    this.cabN = disc.length;
    const G = this.figGroup;
    for (const c of [...G.children]) G.remove(c);
    const rank = (k) => { const it = getItem(k); return it ? RARITY_ORDER.indexOf(it.rarity) : -1; };
    const keys = disc.filter((k) => getItem(k)).sort((a, b) => rank(b) - rank(a) || a.localeCompare(b));
    const C = this.cab, per = C.per;
    this.cabSlots = per * this.cabShelves.length;
    keys.slice(0, this.cabSlots).forEach((k, i) => {
      const row = Math.floor(i / per), col = i % per;
      const m = makeItemMesh(k, 'normal');
      const sz = m.geometry?.userData?.size;
      const sc = sz ? Math.min(3, 0.2 / Math.max(sz.y, 0.01), 0.24 / Math.max(sz.x, sz.z, 0.01)) : 1;
      m.scale.multiplyScalar(sc);
      m.position.copy(this.zone.L(C.cx - C.cw / 2 + (col + 0.5) * C.cw / per, this.cabShelves[row], C.cz + 0.02));
      m.rotation.y = (col % 3 - 1) * 0.18;
      this.zone.convert(m);
      G.add(m);
    });
    this.plaque.userData.pix.redraw();
  }

  // ------------------------------------------------------------------ the tiers
  applyTier() {
    const t = this.tier;
    if (!this.zone) { this.updateDoor102(); return; }
    this.spare.visible = t < 2;
    this.hobby.visible = t >= 2;
    for (const o of this.hobbyBlocks) this.game.player.removeObstacle(o);
    this.hobbyBlocks = [];
    const { X0, X1, Z0 } = this.dims;
    if (t >= 2) {
      this.hobbyBlocks.push(this.zone.block(-2.2, 2.2, Z0, Z0 + 0.45), this.zone.block(X0, X0 + 0.5, -1.95, -0.65), this.zone.block(X1 - 0.95, X1 - 0.25, -0.95, -0.25));
      this.drawShowcase();
    } else this.hobbyBlocks.push(this.zone.block(-0.25, 0.65, -1.55, -0.85));
    this.updateDoor102();
  }

  // ------------------------------------------------------------------ the doors outside the zone
  /** In 102's kitchen: the old bath door (Room's folding door) is covered by the door through to 103. */
  doorIn102() {
    const R = this.places.room;
    if (!R?.group) return;
    const g = this.game;
    const door = new THREE.Group();
    // a flush door in a casing proud of the wall (room-local: east wall x 1.8, z 0.6..1.3), a brass knob, the card
    const K = new IKit(imats(this.places._ikConv ||= (m) => this.places.mat(m))), F = K.at(1.8, 0, 0, -Math.PI / 2); // local x = z, +z = -x
    F.box('ply', 0.6, 0.0, 0.035, 1.3, 1.9, 0.075, { tint: 0xa87a4c, bevel: 0.006 });
    for (const zz of [0.56, 1.34]) F.box('wood', zz - 0.045, 0, -0.005, zz + 0.045, 1.98, 0.09, { tint: 0xc79a6a, grain: 'y', bevel: 0.004 });
    F.box('wood', 0.515, 1.9, -0.005, 1.385, 1.98, 0.09, { tint: 0xc79a6a, grain: 'x', bevel: 0.004 });
    F.lathe('satin', 0.7, 0.95, 0.075, [[0, 0], [0.028, 0], [0.028, 0.006], [0.01, 0.01], [0.01, 0.045], [0.026, 0.055], [0.028, 0.07], [0.018, 0.08], [0, 0.082]], 16, { axis: 'z', tint: 0xc8a048 });
    K.done(door, 'room102:door103');
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.07), canvasMat(32, 14, (x) => { x.fillStyle = '#f4f0e4'; x.fillRect(0, 0, 32, 14); pixText(x, '103 →', 16, 2, { size: 10, align: 'center', color: '#2a2a3a' }); }));
    plate.material = this.places.mat(plate.material);
    plate.position.set(1.723, 1.55, 0.95); plate.rotation.y = -Math.PI / 2; door.add(plate);
    R.group.add(door);
    this.door102 = door;
    const hb = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.9, 0.7), new THREE.MeshBasicMaterial({ visible: false }));
    hb.position.set(1.75, 0.95, 0.95);
    R.group.add(hb);
    g.interaction.add(hb, {
      reach: 2.2,
      hint: () => (this.tier >= 1 ? { key: 'LMB', text: 'Through to 103', sub: this.tier >= 2 ? 'Kitchen, bath and your hobby room' : 'Kitchen, bath and the back room' }
        : { key: '', text: 'The unit bath', sub: 'The gas heater died years ago. Mrs. Ota says "next year". Flat 103 next door has a real bath...' }),
      use: () => { if (this.tier >= 1) goTo(g, 'home103', this.build().at(-2.0, 1.1, -Math.PI / 2), { sound: 'roomDoorOpen' }); return false; },
    });
  }
  updateDoor102() { if (this.door102) this.door102.visible = this.tier >= 1; if (this.card103) this.card103.visible = this.tier >= 1; }
  to102() { goTo(this.game, 'room', { x: ROOM102.x + 1.3, z: ROOM102.z + 0.95, yaw: Math.PI / 2 }, { sound: 'roomDoorOpen' }); }

  /** 103's own front door on the lane (and your name card on it once it's yours). */
  laneDoor() {
    const g = this.game;
    const card = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.06), canvasMat(32, 12, (x) => { x.fillStyle = '#f4f0e4'; x.fillRect(0, 0, 32, 12); pixText(x, '103', 16, 1, { size: 10, align: 'center', color: '#2a2a3a' }); }));
    card.position.set(LANE_DOOR.x + 0.27, 1.95, LANE_DOOR.z + 0.056);
    g.scene.add(card);
    this.card103 = card;
    const hb = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.95, 0.12), new THREE.MeshBasicMaterial({ visible: false }));
    hb.position.set(LANE_DOOR.x, 0.4 + 0.98, LANE_DOOR.z + 0.08);
    g.scene.add(hb);
    g.interaction.add(hb, {
      reach: 2.2,
      hint: () => (this.tier >= 1 ? { key: 'LMB', text: 'Flat 103 (yours)', sub: 'Kitchen, bath, back room' } : { key: '', text: 'Sakura Heights #103', sub: 'Vacant. 入居者募集: Ota Real Estate' }),
      use: () => { if (this.tier >= 1) { this.build(); this.places.enter('home103', { sound: 'lockClick' }); } return false; },
    });
  }

  // ------------------------------------------------------------------ per frame (only while you're in 103)
  onEnter() {
    const day = this.game.clock?.daylight?.() ?? 1;
    this.IM?.shojiLit.color.setRGB(0.42 + 0.62 * day, 0.4 + 0.6 * day, 0.42 + 0.52 * day);
    if (this.tier >= 2) { this.drawCabinet(); this.drawShowcase(); }
    if (this.tier >= 1 && !this.game.state.flags.home103tip) { this.game.state.flags.home103tip = true; this.game.tweens.wait(1.2, () => this.game.tip?.('home103', 'Flat 103', 'Cook at the stove (hold LMB), fill the bath at the panel by its door')); }
  }
  onExit() { this.places.standUp(); }
  tick(dt) {
    const F = this.filling;
    if (F) {
      F.t += dt;
      this.setWater(Math.min(1, F.t / 7));
      if (Math.floor(F.t / 2.2) !== Math.floor((F.t - dt) / 2.2) && F.t < 7) sfx('bathFill', { vol: 0.45 });
      if (F.t >= 7) {
        this.filling = null;
        this.s.bathFull = true;
        this.game.clock?.advance?.(10);
        sfx('ofuroReady', { vol: 0.7 });
        this.game.bubbles?.say?.(() => this.zone.L(0.86, 1.6, 0.6), 'お風呂が沸きました♪', { style: 'think' });
        this.panel.userData.pix.redraw();
      }
    }
    // steam over a hot bath, now and then
    this.steamT = (this.steamT || 0) - dt;
    if (this.s.bathFull && this.steamT <= 0) {
      this.steamT = 0.7;
      this.game.effects.puff({ pos: this.zone.L(this.tub.x + (Math.random() - 0.5) * 0.4, 0.58, this.tub.z + (Math.random() - 0.5) * 0.6), count: 1, colors: [0xf4f8fa, 0xe4eaee], size: 0.06, up: 0.18, radius: 0.1, life: 2.2, gravity: -0.02 });
    }
    if (this.tier >= 2) { this.cabT = (this.cabT || 0) - dt; if (this.cabT <= 0) { this.cabT = 5; this.drawCabinet(); } }
  }
}
