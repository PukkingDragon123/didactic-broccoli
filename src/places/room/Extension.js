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
import * as RT from '../../room/textures.js';
import { pixMat } from '../../gfx/geo.js';
import { Zone, Batch, V, pick, goTo, canvasMat, pixText, grain } from '../../growth/kit.js';
import { ORIGINS } from '../../growth/data.js';

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
    const tex = (pix, { repeat = 1, rough = 0.85 } = {}) => { const map = RT.texOf(pix); map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(1 / repeat, 1 / repeat); return new THREE.MeshStandardMaterial({ map, vertexColors: true, roughness: rough }); };
    const Z = this.zone, M = (m) => Z.mat(m);
    const std = (o) => M(new THREE.MeshStandardMaterial({ vertexColors: true, ...o }));
    const wood = pixMat('woodDark', { roughness: 0.6, bump: 0.3 }).clone(); wood.vertexColors = true;
    const woodL = pixMat('woodLight', { roughness: 0.6, bump: 0.3 }).clone(); woodL.vertexColors = true;
    const tileP = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); x.fillStyle = '#d4e6ec'; x.fillRect(0, 0, 32, 32); x.fillStyle = '#9ab8c4'; for (let i = 0; i < 32; i += 8) { x.fillRect(i, 0, 1, 32); x.fillRect(0, i, 32, 1); } grain(x, 0, 0, 32, 32, ['#c8dce4', '#e0eef2'], 0.06, 5); const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    this.M = {
      paper: M(tex(RT.wallpaper(), { rough: 0.9 })), ceil: M(tex(RT.ceilingBoards(), { repeat: 0.9, rough: 0.8 })), floor: M(tex(RT.flooring(), { rough: 0.55 })),
      genkan: M(tex(RT.genkanTile(), { rough: 0.7 })), tatami: M(new THREE.MeshStandardMaterial({ map: RT.texOf(RT.tatamiFloor()), vertexColors: true, roughness: 0.9 })),
      wood: M(wood), woodL: M(woodL), paint: std({ roughness: 0.7 }), metal: std({ roughness: 0.35, metalness: 0.6 }),
      tile: M(new THREE.MeshStandardMaterial({ map: tileP, vertexColors: true, roughness: 0.35 })),
      glow: new THREE.MeshBasicMaterial({ vertexColors: true }),
      glass: M(new THREE.MeshStandardMaterial({ color: 0xeaf2f8, transparent: true, opacity: 0.1, roughness: 0.2, envMapIntensity: 0.1, depthWrite: false })),
    };
  }

  // ------------------------------------------------------------------ walls, floors, doors (zone-local, origin = middle)
  shell() {
    const Z = this.zone, B = Z.B, M = this.M, t = 0.12;
    const X0 = -2.5, X1 = 2.5, Z0 = -2.8, Z1 = 2.8, ZP = 0.2;
    this.dims = { X0, X1, Z0, Z1, ZP };
    // floors: wood in the kitchen strip, the bathroom tiles, tatami / boards in the back room (swapped per tier)
    B.plane(M.floor, 3.3, 2.1 - ZP, (X0 + 0.8) / 2, 0, (ZP + 2.1) / 2);
    B.plane(M.floor, 2.1, Z1 - 2.1, (-1.3 + 0.8) / 2, 0, (2.1 + Z1) / 2);
    B.plane(M.genkan, 1.2, 0.7, X0 + 0.6, -0.12, Z1 - 0.35);
    B.box(M.woodL, 1.2, 0.12, 0.08, X0 + 0.6, -0.12, Z1 - 0.72, { tint: 0xc8a070 });
    B.plane(M.tile, X1 - 0.8, Z1 - ZP, (0.8 + X1) / 2, 0.01, (ZP + Z1) / 2, { s: 1 });
    // walls (shell boxes outside the interior)
    B.box(M.paper, t, H, Z1 - Z0, X0 - t / 2, 0, 0);
    B.box(M.paper, t, H, Z1 - Z0, X1 + t / 2, 0, 0);
    B.box(M.paper, X1 - X0 + 2 * t, H, t, 0, 0, Z0 - t / 2);
    // front wall with 103's own door at x -1.9
    const dx0 = -2.3, dx1 = -1.5;
    B.box(M.paper, X1 - dx1 + t, H, t, (dx1 + X1 + t) / 2, 0, Z1 + t / 2);
    B.box(M.paper, dx0 - X0 + t, H, t, (X0 - t + dx0) / 2, 0, Z1 + t / 2);
    B.box(M.paper, dx1 - dx0, H - 1.95, t, (dx0 + dx1) / 2, 1.95, Z1 + t / 2);
    B.quad(M.paint, dx1 - dx0, 2.07, (dx0 + dx1) / 2, -0.12, Z1 - 0.01, { ry: Math.PI, tint: 0x8a8e94 });
    B.box(M.metal, 0.06, 0.12, 0.05, dx0 + 0.1, 0.95, Z1 - 0.03, { tint: 0xd8d4c8 });
    // the connecting door from 102 in the west wall (z 0.72..1.48)
    B.quad(M.wood, 0.76, 1.95, X0 + 0.01, 0, 1.1, { ry: Math.PI / 2, tint: 0xb08050 });
    B.box(M.metal, 0.04, 0.04, 0.12, X0 + 0.04, 0.95, 1.38, { tint: 0xc8b048 });
    for (const zz of [0.7, 1.5]) B.box(M.wood, 0.05, 2.0, 0.05, X0 + 0.02, 0, zz, { tint: 0x7a5030 });
    // the partition (kitchen | back room) with an opening x -0.7..0.7, and the bathroom wall (x 0.8, door z 1.1..1.8)
    B.box(M.paper, -0.7 - X0, H, 0.1, (X0 - 0.7) / 2, 0, ZP);
    B.box(M.paper, X1 - 0.7, H, 0.1, (0.7 + X1) / 2, 0, ZP);
    B.box(M.paper, 1.4, H - 1.85, 0.1, 0, 1.85, ZP);
    for (const x of [-0.7, 0.7]) B.box(M.wood, 0.07, 1.85, 0.13, x, 0, ZP, { tint: 0xc89868 });
    B.box(M.wood, 1.54, 0.07, 0.13, 0, 1.85, ZP, { tint: 0xc89868 });
    // the bathroom wall: wallpaper on the kitchen side, tiles inside
    for (const [d, zc, y, h] of [[0.9, (ZP + 1.1) / 2, 0, H], [Z1 - 1.8, (1.8 + Z1) / 2, 0, H], [0.7, 1.45, 1.9, H - 1.9]]) {
      B.box(M.paper, 0.05, h, d, 0.775, y, zc);
      B.box(M.tile, 0.05, h, d, 0.825, y, zc);
    }
    // tiles on the bathroom's other walls (just inside the shell)
    B.box(M.tile, 0.02, H, Z1 - ZP - 0.1, X1 - 0.01, 0, (ZP + Z1) / 2);
    B.box(M.tile, X1 - 0.85, H, 0.02, (0.85 + X1) / 2, 0, Z1 - 0.01);
    B.box(M.tile, X1 - 0.85, H, 0.02, (0.85 + X1) / 2, 0, ZP + 0.06);
    // ceilings
    B.plane(M.ceil, X1 - X0, ZP - Z0, 0, H, (Z0 + ZP) / 2, { down: true });
    B.plane(M.paper, 3.3, Z1 - ZP, (X0 + 0.8) / 2, H, (ZP + Z1) / 2, { down: true, tint: 0xf4f0e8 });
    B.plane(M.tile, X1 - 0.8, Z1 - ZP, (0.8 + X1) / 2, H - 0.01, (ZP + Z1) / 2, { down: true });
    // skirting + mouldings in the back room
    for (const [len, cx, cz, ry] of [[X1 - X0, 0, Z0 + 0.02, 0], [ZP - Z0, X0 + 0.02, (Z0 + ZP) / 2, Math.PI / 2], [ZP - Z0, X1 - 0.02, (Z0 + ZP) / 2, Math.PI / 2]]) {
      B.box(M.wood, len, 0.06, 0.02, cx, 0, cz, { ry, tint: 0x8a6040 });
      B.box(M.wood, len, 0.07, 0.03, cx, H - 0.07, cz, { ry, tint: 0xc89868 });
    }
    // lamps: a kitchen tube, a round ceiling lamp in the back room
    B.box(M.glow, 0.9, 0.05, 0.1, -0.6, H - 0.07, 1.4, { tint: 0xfff4dc });
    B.box(M.paint, 1.0, 0.03, 0.16, -0.6, H - 0.03, 1.4, { tint: 0xe8e4dc });
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
    const Z = this.zone, B = Z.B, M = this.M, z1 = this.dims.Z1;
    // a counter along the front wall: cupboards, a steel top with the sink, the stove on the right end
    B.box(M.paint, 1.9, 0.82, 0.58, -0.35, 0, z1 - 0.3, { tint: 0xf0e6cc });
    for (let i = 0; i < 4; i++) { B.box(M.paint, 0.44, 0.7, 0.01, -1.06 + i * 0.475, 0.06, z1 - 0.595, { tint: 0xf6eedc }); B.box(M.metal, 0.12, 0.015, 0.02, -1.06 + i * 0.475, 0.68, z1 - 0.605, { tint: 0xc8ccd2 }); }
    B.box(M.metal, 1.92, 0.04, 0.62, -0.35, 0.82, z1 - 0.3, { tint: 0xc8ccd2 });
    B.box(M.metal, 0.5, 0.02, 0.36, -0.75, 0.84, z1 - 0.32, { tint: 0x7a7e84 }); // sink basin
    B.box(M.metal, 0.03, 0.3, 0.03, -0.75, 0.86, z1 - 0.08, { tint: 0xd8dce0 });
    B.box(M.metal, 0.03, 0.03, 0.18, -0.75, 1.14, z1 - 0.16, { tint: 0xd8dce0 });
    B.box(M.paint, 1.9, 0.55, 0.34, -0.35, 1.55, z1 - 0.17, { tint: 0xf0e6cc }); // wall cupboard
    B.box(M.paint, 1.9, 0.6, 0.01, -0.35, 0.86, z1 - 0.005, { tint: 0xe4ece8 }); // splash panel
    // exhaust fan box over the stove
    B.box(M.paint, 0.62, 0.3, 0.4, 0.3, 1.75, z1 - 0.2, { tint: 0xd8d4cc });
    Z.prop('gr_stove', 0.3, 0.86, z1 - 0.32, Math.PI);
    this.pan = Z.prop('gr_pan', 0.44, 0.99, z1 - 0.34, Math.PI - 0.4);
    Z.prop('gr_ricecooker', -1.12, 0.86, z1 - 0.3, Math.PI);
    Z.prop('room_mug', -1.25, 0.86, z1 - 0.48, 0.4);
    Z.block(-1.3, 0.6, z1 - 0.62, z1);
    // a little dining spot by the partition: a stool and a narrow shelf-table
    B.box(M.woodL, 1.0, 0.04, 0.32, -1.6, 0.74, 0.42, { tint: 0xc8a070 });
    for (const x of [-2.05, -1.15]) B.box(M.wood, 0.04, 0.74, 0.04, x, 0, 0.5, { tint: 0x7a5030 });
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
    const Z = this.zone, B = Z.B, M = this.M, X1 = this.dims.X1;
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
    B.box(M.metal, 0.04, 0.9, 0.04, X1 - 0.03, 0.9, 2.2, { tint: 0xc8ccd2 }); // shower bar
    B.box(M.metal, 0.06, 0.14, 0.06, X1 - 0.06, 1.75, 2.2, { tint: 0xd8dce0 });
    B.box(M.paint, 0.02, 0.5, 0.36, X1 - 0.01, 1.1, 2.0, { tint: 0xc8d8e4, k: 1.15 }); // mirror
    B.box(M.metal, 0.12, 0.08, 0.2, X1 - 0.06, 0.6, 2.0, { tint: 0xc8ccd2 }); // taps
    // a frosted sliding door, half open, onto the kitchen (x 0.8)
    B.quad(M.paint, 0.36, 1.85, 0.8 - 0.06, 0, 1.62, { ry: Math.PI / 2, tint: 0xd8e0e6 });
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
    const Z = this.zone, M = this.M, { X0, X1, Z0, ZP } = this.dims;
    // tier 1: a spare six-mat room (tatami, a low table, boxes from the move)
    const spare = this.spare = new THREE.Group();
    const S = new Batch(); S.off.copy(Z.o);
    S.plane(M.tatami, X1 - X0, ZP - Z0, 0, 0, (Z0 + ZP) / 2, { unit: true });
    S.build(spare);
    Z.group.add(spare);
    Z.prop('mk_chabudai', 0.2, 0, -1.2, 0.2, 1, spare);
    Z.prop('room_zabuton', 0.25, 0, -0.55, 0.1, 1, spare);
    Z.prop('room_boxes', X1 - 0.5, 0, Z0 + 0.5, 0.2, 1, spare);
    Z.prop('cardboard_bundle', X0 + 0.5, 0, Z0 + 0.45, -0.3, 1, spare);
    // tier 2: the hobby room (boards, the cabinet, the showcase, an armchair, a rug, spotlights)
    const hobby = this.hobby = new THREE.Group();
    const Hb = new Batch(); Hb.off.copy(Z.o);
    Hb.plane(this.M.floor, X1 - X0, ZP - Z0, 0, 0, (Z0 + ZP) / 2);
    Hb.plane(this.M.paint, 2.0, 1.4, 0.3, 0.005, -0.8, { tint: 0x8a2a3a }); // rug
    Hb.plane(this.M.paint, 1.8, 1.2, 0.3, 0.007, -0.8, { tint: 0xa83a48 });
    // the collection cabinet on the back wall: dark wood, 5 shelves, a glass front, a lit header
    const cw = 4.4, cx = 0, cz = Z0 + 0.22;
    Hb.box(M.wood, cw, 0.12, 0.42, cx, 0, cz, { tint: 0x8a5a36 });
    Hb.box(M.wood, cw, 0.08, 0.42, cx, 2.12, cz, { tint: 0x8a5a36 });
    for (const x of [-cw / 2, cw / 2]) Hb.box(M.wood, 0.06, 2.2, 0.42, cx + x, 0, cz, { tint: 0x8a5a36 });
    for (let i = 1; i < 4; i++) Hb.box(M.wood, 0.04, 2.0, 0.42, cx - cw / 2 + i * cw / 4, 0.12, cz, { tint: 0x9a6a40 });
    Hb.box(M.paint, cw - 0.1, 2.0, 0.02, cx, 0.12, cz - 0.2, { tint: 0x2a3a5a }); // a dark blue back so the figures stand out
    this.cabShelves = [0.16, 0.56, 0.96, 1.36, 1.74];
    for (const y of this.cabShelves) Hb.box(M.woodL, cw, 0.025, 0.4, cx, y - 0.03, cz, { tint: 0xd8c8a8 });
    Hb.box(M.glow, cw - 0.1, 0.03, 0.04, cx, 2.06, cz + 0.15, { tint: 0xfff4dc });
    Hb.box(M.paint, cw, 0.1, 0.03, cx, 2.2, cz + 0.2, { tint: 0x2a1a12 });
    // the showcase on the west wall: glass all round, three glass shelves
    const sx = X0 + 0.25;
    Hb.box(M.wood, 0.45, 0.6, 1.3, sx, 0, -1.3, { tint: 0x3a2418 });
    for (const y of [0.62, 1.0, 1.38]) Hb.box(M.paint, 0.4, 0.015, 1.24, sx, y, -1.3, { tint: 0xd8e8ee, k: 1.2 });
    Hb.box(M.wood, 0.45, 0.06, 1.3, sx, 1.78, -1.3, { tint: 0x3a2418 });
    Hb.build(hobby);
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
  /** In 102's kitchen: the old bath door (a decal of Room.js) becomes the door through to 103. */
  doorIn102() {
    const R = this.places.room;
    if (!R?.group) return;
    const g = this.game;
    // room-local: the east wall of the kitchen strip, x 1.8, z 0.95 (src/room/build.js "folding bath door")
    const door = new THREE.Group();
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.86, 0.7), this.places.mat(new THREE.MeshStandardMaterial({ color: 0xb08050, roughness: 0.6 })));
    leaf.position.set(1.775, 0.93, 0.95); door.add(leaf);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.07), canvasMat(32, 14, (x) => { x.fillStyle = '#f4f0e4'; x.fillRect(0, 0, 32, 14); pixText(x, '103 →', 16, 2, { size: 10, align: 'center', color: '#2a2a3a' }); }));
    plate.material = this.places.mat(plate.material);
    plate.position.set(1.752, 1.55, 0.95); plate.rotation.y = -Math.PI / 2; door.add(plate);
    const knob = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), this.places.mat(new THREE.MeshStandardMaterial({ color: 0xc8b048, metalness: 0.6, roughness: 0.3 })));
    knob.position.set(1.74, 0.95, 0.68); door.add(knob);
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
