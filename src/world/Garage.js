// The garage: Grandpa's Shōwa-era roll-shutter garage turned capsule-toy shop, as a low-poly cel model of the real
// thing. A timber frame (posts, studs, girts, wall plates) clad in small-wave zinc sheets (totan) on a concrete-block
// footing; king-post trusses and purlins under a corrugated roof; a light steel roll shutter with its box, guide
// rails, bottom bar and padlock; and a tin false front with the sign board, the awning, the lanterns and the noren.
// This file builds the envelope, the moving parts (shutter, back door, light switch) and the lights, and owns every
// hook the game uses; the fittings (counter, racks, sink, desk, wiring, the street-front dressing) are in
// GarageDetail.js, the painted surfaces in src/gfx/garageArt.js, the building kit in src/garage/kit.js.
// It starts nearly empty: the furniture and decor you buy are placed with the builder (src/build/) on the attach
// points below (ATTACH).
//
// Hooks: GARAGE, MACHINE_SLOTS, SHELF_SLOTS, ATTACH; garage.group / add() / prop(); floor, table, tableTop, pcDesk,
// window, deliverySpot, sellBox, storageBox, radio; shutterMesh, setShutter(k), shutterOpen, shutterOb; door
// ({ pivot, door, sign, open, wantOpen }), doorObstacle; lightSwitch, lightToggle, setLights(on), lightsOn;
// lights ({ sun, hemi, tubes: [{ light, mat, base, fix, dead }], desk, bounce });
// windowGlass; town (built here, after the envelope); ownsFront (the town leaves the street front to this file).
import * as THREE from 'three';
import { posterTexture } from '../gfx/textures.js';
import { surface, surfaceAvg, shutterInk, marks, prints, SHUTTER } from '../gfx/garageArt.js';
import { propMesh } from './props.js';
import { hash2 } from '../core/util.js';
import { Town } from './Town.js';
import { Kit } from '../garage/kit.js';
import { GarageDetail, PropBatch } from './GarageDetail.js';

export const GARAGE = { minX: -4, maxX: 4, minZ: -5, maxZ: 5, height: 3.2, shutterY: 2.25, doorHalf: 0.6, doorH: 2.1 };

// Machine slots along the left wall (machine centre positions, facing +x)
export const MACHINE_SLOTS = [-0.2, 0.85, -1.25, 1.9, -2.3, -3.35].map((z) => ({ x: -3.42, z, rotY: Math.PI / 2 }));
// Collection shelves on the right wall (centre z), facing -x
export const SHELF_SLOTS = [-0.55, 1.25, 3.05].map((z) => ({ x: 3.93, z, rotY: -Math.PI / 2 }));

// Attach points for placing furniture and decor (src/build/Builder.js). All world-space, the garage being fixed.
//   surfaces: flat tops you can put small things on: { id, x0, x1, z0, z1, y, h (headroom) }
//   walls: hanging zones: { id, face ('+x' wall at x = minX facing +x, '-x', '+z'), at (the wall plane), u0, u1 (along the
//          wall: z for the side walls, x for the back wall), y0, y1 }
//   wallBlock: what is already on the walls: { face, u0, u1, y0, y1 }
//   floorBlock: fixed things standing on the floor that aren't player obstacles; keepClear: segments people walk
//          along and spots that must stay free: { a: [x, z], b: [x, z], r }
export const RACK_Y = [0.08, 0.62, 1.16, 1.7];
export const ATTACH = {
  surfaces: [
    { id: 'table', x0: -0.68, x1: 1.08, z0: -0.33, z1: 0.53, y: 0.78, h: 0.7 },
    { id: 'desk', x0: 3.29, x1: 3.95, z0: -4.68, z1: -3.2, y: 0.74, h: 0.9 },
    ...[-3.25, -1.85].flatMap((x, r) => RACK_Y.map((y, i) => ({ id: `rack${r}_${i}`, x0: x - 0.58, x1: x + 0.58, z0: -4.92, z1: -4.5, y: y + 0.0125, h: i < 3 ? 0.5 : 0.9 }))),
    { id: 'highShelf', x0: 3.75, x1: 3.98, z0: -1.1, z1: 3.76, y: 2.475, h: 0.5 },
    { id: 'sill', x0: -3.99, x1: -3.83, z0: 1.0, z1: 2.7, y: 1.75, h: 0.55 },
  ],
  walls: [
    { id: 'back', face: '+z', at: -4.995, u0: -3.95, u1: 3.95, y0: 0.35, y1: 2.9 },
    { id: 'right', face: '-x', at: 3.995, u0: -4.9, u1: 4.9, y0: 0.35, y1: 2.42 },
    { id: 'left', face: '+x', at: -3.995, u0: -4.9, u1: 4.9, y0: 1.0, y1: 2.7 },
  ],
  wallBlock: [
    { face: '+z', u0: -0.82, u1: 0.82, y0: 0, y1: 2.25 }, // the back door and its frame
    { face: '+z', u0: 0.78, u1: 0.98, y0: 1.1, y1: 3.2 }, // light switch and conduit
    { face: '+z', u0: 0.93, u1: 1.31, y0: 1.75, y1: 3.2 }, // breaker panel
    { face: '+z', u0: -3.95, u1: -1.2, y0: 0, y1: 1.98 }, // the steel racks
    { face: '+z', u0: -2.97, u1: -2.33, y0: 2.3, y1: 2.8 }, // the safety-first board
    { face: '+z', u0: 0.9, u1: 1.6, y0: 0, y1: 1.2 }, // fridge and radio
    { face: '+z', u0: 2.1, u1: 3.2, y0: 0, y1: 1.7 }, // the sink and the water heater
    { face: '+z', u0: 3.2, u1: 3.95, y0: 0, y1: 0.8 }, // the PC desk end
    { face: '-x', u0: -4.75, u1: -3.15, y0: 0, y1: 2.1 }, // the PC desk, its shelf, photos
    { face: '-x', u0: -3.1, u1: -1.85, y0: 0, y1: 0.6 }, // sell box and storage bin
    { face: '+x', u0: -4.45, u1: -3.75, y0: 0, y1: 1.4 }, // coin changer
    { face: '+x', u0: 0.95, u1: 2.75, y0: 1.6, y1: 2.75 }, // the window
    { face: '+x', u0: -1.48, u1: 0.28, y0: 2.12, y1: 2.7 }, // the GACHA CORNER light box
    { face: '+x', u0: -4.9, u1: 4.9, y0: 2.7, y1: 3.3 }, // lanterns and wiring
  ],
  keepClear: [
    { a: [0.4, 5.2], b: [0.4, 4.2], r: 0.45 }, // in under the shutter
    { a: [0.4, 4.2], b: [-2.2, 3.1], r: 0.42 }, // customers' path to the machines
    { a: [-2.45, 3.1], b: [-2.45, -3.6], r: 0.42 }, // ...and along the machine row
    { a: [1.6, 4.1], b: [1.6, 4.1], r: 0.62 }, // the delivery spot
    { a: [0, -4.4], b: [0, -3.9], r: 0.75 }, // the museum door swing
    { a: [2.95, -3.9], b: [2.6, -3.4], r: 0.38 }, // the PC chair
    { a: [3.05, -2.45], b: [3.05, -2.45], r: 0.3 }, // in front of the sell box and bin
  ],
};

// the building (metres): the walls' top plate is GARAGE.height, the roof a low gable behind the false front
export const BUILD = {
  ridge: 4.26, plate: 0.16, // the ridge; the wall plate's depth (trusses sit on it)
  truss: [-3.4, -0.6, 2.2], // king-post trusses (z)
  box: { y0: 2.62, y1: 3.04, z0: 4.78, z1: 5.12 }, // the shutter box over the opening
  parapet: 4.42, // top of the false front
  awning: { y: 3.3, z1: 6.15, drop: 0.26 }, // the lean-to over the shutter: height at the wall, its front edge, its fall
  win: { z0: 1.05, z1: 2.65, y0: 1.75, y1: 2.6 },
};
// the colour each part comes out as (sRGB): pastel, a little desaturated
export const TINT = {
  teal: 0x6ba396, tealDark: 0x578c80, roof: 0xab6a50, zinc: 0xb4bcbc, zincOld: 0xadb3ad, zincIn: 0xaab3b4,
  post: 0xc4a27a, beam: 0xae8a62, purlin: 0xbd9a70, brown: 0x7a5c4a, ply: 0xd0b084,
  mortar: 0xd6cebc, block: 0xb9b5ab, slab: 0xb9b5ab, apron: 0xaaa69c,
  steel: 0x98a2a6, steelDark: 0x6c767c, galv: 0xbcc6c8, door: 0xa9c0b2, frame: 0x62756b,
  ivory: 0xf2ecd8, white: 0xf2efe6, black: 0x3a343e, rubber: 0x34303a, red: 0xcf4a3e, brass: 0xd8b25a, bamboo: 0xcdb46c,
};


export class Garage {
  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    this.group.name = 'garage';
    game.scene.add(this.group);
    this.lights = {};
    this.ownsFront = true; // the town (src/world/Town.js) leaves the garage's street front to this file
    this.build();
  }

  add(obj, parent = this.group) { parent.add(obj); return obj; }

  /** A prop from the library as its own mesh (things that are clicked or taken); opts: scale, player, phys, material. */
  prop(id, x, y, z, rotY = 0, opts = {}) {
    const m = propMesh(id, opts);
    m.position.set(x, y, z);
    m.rotation.y = rotY;
    if (opts.scale) m.scale.setScalar(opts.scale);
    this.add(m);
    if (opts.player || opts.phys) {
      const s = new THREE.Box3().setFromObject(m);
      if (opts.player) this.game.player.addObstacle(s.min.x - 0.02, s.max.x + 0.02, s.min.z - 0.02, s.max.z + 0.02);
      if (opts.phys) this.game.physics.addBox({ center: s.getCenter(new THREE.Vector3()), half: s.getSize(new THREE.Vector3()).multiplyScalar(0.5), material: opts.material || 'wood' });
    }
    return m;
  }
  /** A static prop merged into the garage's prop batch (no draw call of its own). */
  sprop(id, x, y, z, rotY = 0, opts = {}) { return this.PB.place(this.game, id, x, y, z, rotY, opts); }

  /** An invisible solid: a physics box and, with player, a wall for the player. */
  solid(w, h, d, x, y, z, { phys = true, player = false, material = 'wood' } = {}) {
    if (phys) this.game.physics.addBox({ center: new THREE.Vector3(x, y + h / 2, z), half: new THREE.Vector3(w / 2, h / 2, d / 2), material });
    if (player) this.game.player.addObstacle(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
  }

  materials() {
    const P = prints(), M = marks();
    const std = (o) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, ...o });
    // a photographed surface from the shared library, at its real size (a part's tint is the colour it comes out as)
    const ph = (name, o = {}, grainV = false) => { const mat = std({ map: surface(name), ...o }); mat.userData.avg = surfaceAvg(name); mat.userData.grainV = grainV; return mat; };
    const lit = (k) => std({ map: P.tex, alphaTest: 0.5, emissive: 0xffffff, emissiveMap: P.tex, emissiveIntensity: k, roughness: 0.9 });
    const m = {
      totan: ph('steel_galvanised', { roughness: 0.6 }), wood: ph('wood_planks', { roughness: 0.9 }, true), trim: ph('timber_dark', { roughness: 0.82 }, true),
      ply: ph('plywood', { roughness: 0.84 }), concrete: ph('concrete', { roughness: 0.93 }), stained: ph('concrete_stained', { roughness: 0.93 }),
      block: ph('block_wall', { roughness: 0.95 }), mortar: ph('plaster_cream', { roughness: 0.92 }), tile: ph('tile_white', { roughness: 0.42 }),
      terrazzo: ph('concrete_stained', { roughness: 0.62 }), ptile: ph('tile_checker_floor', { roughness: 0.58 }),
      paint: ph('steel_painted', { roughness: 0.64 }), flat: ph('steel_painted', { roughness: 0.86 }), rubber: ph('rubber', { roughness: 0.95 }),
      card: ph('cardboard', { roughness: 0.95 }), canvas: ph('canvas_cloth', { roughness: 0.97 }), indigo: ph('indigo_cloth', { roughness: 0.97, side: THREE.DoubleSide }),
      gloss: std({ roughness: 0.3 }), chrome: std({ roughness: 0.24, metalness: 1 }),
      cloth: std({ map: P.tex, alphaTest: 0.5, roughness: 0.96, side: THREE.DoubleSide }),
      print: std({ map: P.tex, alphaTest: 0.5, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
      marks: std({ map: M.tex, transparent: true, depthWrite: false, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }),
      shutter: ph('steel_painted', { roughness: 0.56 }),
      shutterInk: std({ map: shutterInk(), transparent: true, depthWrite: false, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }),
      glass: new THREE.MeshStandardMaterial({ map: surface('frosted_glass'), roughness: 0.4, color: 0xfff4e4, emissive: 0xffc890, emissiveMap: surface('frosted_glass'), emissiveIntensity: 0.95, side: THREE.DoubleSide }),
      lantern: lit(0.6), lanternIn: lit(0.55), signGlow: lit(0.28),
      bulb: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffe2b0).multiplyScalar(1.7) }),
    };
    m.marks.userData.order = 1;
    for (const [k, v] of Object.entries(m)) v.name = 'garage-' + k;
    return m;
  }

  build() {
    const G = GARAGE, H = G.height, T = TINT, B = BUILD;
    this.mats = this.materials();
    const K = this.K = new Kit(this.mats);
    this.PB = new PropBatch();
    this.window = B.win;
    this.pcDesk = { x: 3.62, z: -3.95, w: 0.7, d: 1.5, h: 0.74 };

    // ------------------------------------------------------------ the slab and the apron
    const floor = K.mesh('concrete', (g) => { g.tint(T.slab); g.box(-4.2, -0.2, -5.2, 4.2, 0, 5.2, { skip: ['ny'] }); }, { cast: false });
    floor.name = 'floor';
    floor.userData.surface = true;
    this.add(floor);
    this.floor = floor;
    this.game.physics.addBox({ center: new THREE.Vector3(0, -0.1, 0), half: new THREE.Vector3(4.2, 0.1, 5.2), material: 'concrete' });
    K.box('stained', -4.3, -0.2, 5.2, 4.3, 0, 5.75, { tint: T.apron, skip: ['ny'] });
    // the steel sill the bottom bar lands on, and the staple the padlock goes through
    K.box('paint', -3.0, 0, 4.99, 3.0, 0.004, 5.11, { tint: T.steel });
    K.box('paint', 0.17, 0, 5.1, 0.23, 0.03, 5.13, { tint: T.steelDark });

    this.walls(K);
    this.front(K);
    this.roof(K);
    this.buildShutter(K);
    this.buildDoor(K);

    // the street, the neighbourhood and the things out front that come and go with the shop's hours live in Town.js
    this.town = new Town(this.game, this);
    this.buildCrates();
    this.buildLights(K);
    this.buildDust();
    this.detail = new GarageDetail(this, G);
    K.build(this.group, 'garage');
    this.PB.build(this.group);
  }

  // ---------------------------------------------------------------------------------------------- walls
  /** A zinc sheet wall in the plane x = at (axis 'x') or z = at ('z'), from a0 to a1 along it, with holes [[a0, a1, y0, y1]]. */
  tin(K, axis, at, a0, a1, y0, y1, inTint, outTint, sign, holes = []) {
    const cuts = [a0, ...holes.flatMap((h) => [h[0], h[1]]), a1], t = 0.012;
    const face = (b0, b1, v0, v1) => {
      if (b1 - b0 < 1e-4 || v1 - v0 < 1e-4) return;
      for (const [off, tint, s] of [[0, inTint, -sign], [t * sign, outTint, sign]]) {
        const pt = (b, w, up) => (axis === 'x' ? [at + off + w * sign, up ? v1 : v0, b] : [b, up ? v1 : v0, at + off + w * sign]);
        K.wave('totan', b0, b1, pt, axis === 'x' ? [s, 0, 0] : [0, 0, s], { tint, cast: s === sign });
      }
    };
    for (let i = 0; i + 1 < cuts.length; i++) {
      const hole = i % 2 ? holes[(i - 1) / 2] : null;
      if (!hole) face(cuts[i], cuts[i + 1], y0, y1);
      else { face(cuts[i], cuts[i + 1], y0, hole[2]); face(cuts[i], cuts[i + 1], hole[3], y1); }
    }
  }

  walls(K) {
    const G = GARAGE, H = G.height, T = TINT, B = BUILD, W = B.win, top = H + B.plate;
    const stud = (x0, x1, z, y0, y1, w = 0.045, tint = T.post) => K.box('wood', x0, y0, z - w / 2, x1, y1, z + w / 2, { grain: 'y', tint });

    // ---- left wall (x = -4): three courses of concrete block, then the frame and the zinc; the window in it
    K.box('block', -4.2, 0, -5.2, -4.0, 1.0, 5.2, { tint: T.block, cast: true });
    this.solid(0.2, 1.0, 10.4, -4.1, 0, 0, { player: true, material: 'concrete' });
    K.box('mortar', -4.2, 1.0, -5.2, -4.117, 1.03, 5.2, { tint: T.mortar }); // the sloped mortar cap outside
    K.box('wood', -4.105, 1.0, -5.0, -4.0, 1.09, 5.0, { grain: 'z', tint: T.beam }); // sill
    this.tin(K, 'x', -4.105, -5.2, 5.2, 1.0, top, T.zincIn, T.zincOld, -1, [[W.z0, W.z1, W.y0, W.y1]]);
    const postsL = [-4.94, -3.4, -0.6, W.z0 - 0.07, W.z1 + 0.07, 4.94];
    for (const z of postsL) stud(-4.105, -4.0, z, 1.09, H, 0.105);
    for (let z = -4.94 + 0.455; z < 4.9; z += 0.455) {
      if (postsL.some((p) => Math.abs(p - z) < 0.2)) continue;
      if (z > W.z0 - 0.07 && z < W.z1 + 0.07) { stud(-4.105, -4.0, z, 1.09, W.y0 - 0.03); stud(-4.105, -4.0, z, W.y1 + 0.2, H); } else stud(-4.105, -4.0, z, 1.09, H);
    }
    // girts between the studs and the sheets (they stop at the window), the window's header and sill, the wall plate
    for (const y of [1.5, 2.02, 2.52, 2.96]) for (const [z0, z1] of (y > W.y0 - 0.1 && y < W.y1 + 0.1 ? [[-5, W.z0 - 0.12], [W.z1 + 0.12, 5]] : [[-5, 5]])) K.box('wood', -4.105, y - 0.03, z0, -4.078, y + 0.03, z1, { grain: 'z', tint: T.purlin });
    K.box('wood', -4.105, W.y1 + 0.02, W.z0 - 0.12, -4.0, W.y1 + 0.2, W.z1 + 0.12, { grain: 'z', tint: T.beam });
    K.box('wood', -4.105, W.y0 - 0.03, W.z0 - 0.12, -3.83, W.y0, W.z1 + 0.12, { grain: 'z', tint: T.post });
    K.box('wood', -4.105, H, -5.0, -3.985, top, 5.0, { grain: 'z', tint: T.beam });
    // let-in braces in the end bays
    K.beam('wood', [-4.09, 1.12, -4.86], [-4.09, 3.14, -3.5], 0.03, 0.09, { tint: T.purlin });
    K.beam('wood', [-4.09, 1.12, 4.86], [-4.09, 3.14, 3.5], 0.03, 0.09, { tint: T.purlin });
    this.buildWindow(K, -4, W);

    // ---- right wall (x = +4): plywood lining up to the high shelf (the hobby wall), frame and zinc above
    this.solid(0.2, H, 10.4, 4.1, 0, 0, { player: true });
    K.box('concrete', 4.02, 0, -5.2, 4.2, 0.12, 5.2, { tint: T.apron });
    K.box('ply', 4.0, 0.09, -5.0, 4.02, 2.45, 5.0, { tint: T.ply, skip: ['px'] });
    K.box('wood', 3.985, 0, -5.0, 4.02, 0.09, 5.0, { grain: 'z', tint: T.brown });
    for (let z = -5 + 0.91; z < 4.95; z += 0.91) K.box('wood', 3.992, 0.09, z - 0.02, 4.0, 2.43, z + 0.02, { grain: 'y', tint: T.beam }); // battens over the sheet joints
    K.box('wood', 3.975, 2.43, -5.0, 4.02, 2.45, 5.0, { grain: 'z', tint: T.beam });
    this.tin(K, 'x', 4.105, -5.2, 5.2, 0.12, top, T.zincIn, T.zincOld, 1);
    for (const z of [-4.94, -3.4, -0.6, 2.2, 4.94]) stud(4.0, 4.105, z, 2.45, H, 0.105);
    for (let z = -4.94 + 0.455; z < 4.9; z += 0.455) if (![-3.4, -0.6, 2.2].some((p) => Math.abs(p - z) < 0.2)) stud(4.0, 4.105, z, 2.45, H);
    K.box('wood', 4.078, 2.8, -5, 4.105, 2.86, 5, { grain: 'z', tint: T.purlin });
    K.box('wood', 3.985, H, -5.0, 4.105, top, 5.0, { grain: 'z', tint: T.beam });

    // ---- back wall (z = -5): the museum building's rendered wall, with the steel door's opening; the gable above
    const dh = G.doorHalf + 0.06, dt = G.doorH + 0.06;
    K.box('mortar', -4.2, 0, -5.2, -dh, H, -5.0, { tint: T.mortar, cast: true });
    K.box('mortar', dh, 0, -5.2, 4.2, H, -5.0, { tint: T.mortar, cast: true });
    K.box('mortar', -dh, dt, -5.2, dh, H, -5.0, { tint: T.mortar, cast: true });
    this.solid(4 - G.doorHalf + 0.2, H, 0.2, (-4.2 - G.doorHalf) / 2, 0, -5.1, { player: true, material: 'concrete' });
    this.solid(4 - G.doorHalf + 0.2, H, 0.2, (4.2 + G.doorHalf) / 2, 0, -5.1, { player: true, material: 'concrete' });
    K.box('mortar', -4.2, 0, -5.02, 4.2, 0.1, -5.0, { tint: tintK(T.mortar, 0.86), skip: ['ny'] });
    const g = K.use('mortar', { tint: T.mortar, cast: true });
    for (const [z, n] of [[-5.0, 1], [-5.2, -1]]) g.fan([[-4.2, H, z], [4.2, H, z], [4.2, top + 0.02, z], [0, B.ridge, z], [-4.2, top + 0.02, z]], [0, 0, n]);
  }

  buildWindow(K, x, w) {
    const T = TINT, cz = (w.z0 + w.z1) / 2, f = 0.035;
    // the aluminium frame in the opening (the sash that slides is src/life/chores.js), the fixed pane behind it
    for (const [y0, y1, z0, z1] of [[w.y0, w.y0 + f, w.z0, w.z1], [w.y1 - f, w.y1, w.z0, w.z1], [w.y0, w.y1, w.z0, w.z0 + f], [w.y0, w.y1, w.z1 - f, w.z1], [w.y0, w.y1, cz - f / 2, cz + f / 2]]) K.box('paint', x - 0.105, y0, z0, x + 0.02, y1, z1, { tint: T.galv });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w.z1 - w.z0, w.y1 - w.y0), this.mats.glass);
    glass.geometry.attributes.uv.array.set([0, w.y1 - w.y0, w.z1 - w.z0, w.y1 - w.y0, 0, 0, w.z1 - w.z0, 0]);
    glass.rotation.y = Math.PI / 2;
    glass.position.set(x - 0.01, (w.y0 + w.y1) / 2, cz);
    glass.matrixAutoUpdate = false; glass.updateMatrix();
    glass.name = 'garage:window';
    this.add(glass);
    this.windowGlass = this.mats.glass;
    // outside: a little tin hood over the head and the sill's drip
    K.box('paint', x - 0.2, w.y1 + 0.03, w.z0 - 0.08, x - 0.117, w.y1 + 0.05, w.z1 + 0.08, { tint: T.zincOld });
    K.box('paint', x - 0.17, w.y0 - 0.03, w.z0 - 0.05, x - 0.117, w.y0, w.z1 + 0.05, { tint: T.galv });
  }

  // ---------------------------------------------------------------------------------------------- the street front
  front(K) {
    const G = GARAGE, H = G.height, T = TINT, B = BUILD, top = H + B.plate, zi = 5.0, zo = 5.2;
    // piers: corner and door posts, studs and girts inside, zinc outside painted teal, on a concrete kerb
    for (const s of [-1, 1]) {
      this.solid(1.2, H, 0.2, s * 3.6, 0, 5.1, { player: true, material: 'concrete' });
      K.box('concrete', s > 0 ? 3.09 : -4.25, 0, zi, s > 0 ? 4.25 : -3.09, 0.12, zo + 0.012, { tint: T.apron });
      K.box('wood', s * 3.0, 0, zi, s * 3.12, H, zi + 0.12, { grain: 'y', tint: T.post, cast: true });
      K.box('wood', s * 3.995, 0.12, zi, s * 4.1, H, zi + 0.105, { grain: 'y', tint: T.post });
      K.box('wood', s * 3.52, 0.12, zi, s * 3.565, H, zi + 0.105, { grain: 'y', tint: T.post });
      for (const y of [0.9, 1.7, 2.5]) K.box('wood', s > 0 ? 3.12 : -4.0, y - 0.03, zo - 0.03, s > 0 ? 4.0 : -3.12, y + 0.03, zo, { grain: 'x', tint: T.purlin });
      this.tin(K, 'z', zo, s > 0 ? 3.09 : -4.25, s > 0 ? 4.25 : -3.09, 0.12, H, T.zincIn, T.teal, 1);
      // outside: the door post's casing and the corner board, painted brown
      K.box('trim', s > 0 ? 2.99 : -3.1, 0, zo, s > 0 ? 3.1 : -2.99, B.box.y0 + 0.04, zo + 0.035, { grain: 'y', tint: T.brown });
      K.box('trim', s > 0 ? 4.17 : -4.27, 0.12, zo - 0.08, s > 0 ? 4.27 : -4.17, B.parapet, zo + 0.03, { grain: 'y', tint: T.brown });
    }
    this.game.player.addObstacle(-4.3, -3.0, G.maxZ - 0.1, G.maxZ + 0.35); this.game.player.addObstacle(3.0, 4.3, G.maxZ - 0.1, G.maxZ + 0.35);
    // the header over the opening, the front wall plate; outside, the board that hides the shutter box
    K.box('wood', -4.1, B.box.y1, zi, 4.1, H, zi + 0.12, { grain: 'x', tint: T.beam, cast: true });
    K.box('wood', -4.105, H, zi - 0.015, 4.105, top, zi + 0.105, { grain: 'x', tint: T.beam });
    K.box('trim', -2.99, B.box.y0, zo - 0.045, 2.99, H + 0.02, zo + 0.02, { grain: 'x', tint: T.brown, cast: true });
    // the false front: zinc on studs up to the coping; inside you see its back up to the roof
    this.tin(K, 'z', zo, -4.25, 4.25, H, B.parapet, T.zincIn, T.teal, 1);
    for (const s of [-1, 1]) K.quad('totan', [s * 4.25, H, zi], [s * 4.25, H, zo], [s * 4.25, B.parapet, zo], [s * 4.25, B.parapet, zi], [s, 0, 0], { tint: T.tealDark });
    for (let x = -3.64; x < 3.7; x += 0.91) K.box('wood', x - 0.022, top, zi + 0.11, x + 0.022, B.ridge - Math.abs(x) * (B.ridge - top) / 4.3 - 0.03, zo, { grain: 'y', tint: T.post });
    K.box('paint', -4.3, B.parapet, zi - 0.04, 4.3, B.parapet + 0.045, zo + 0.05, { tint: T.galv, bevel: 0.01, cast: true }); // coping
    // the guide rails (channels on the door posts) with their hazard tape, and the shutter box
    for (const s of [-1, 1]) {
      K.box('paint', s * 2.99, 0, 5.012, s * 3.0, B.box.y0, 5.088, { tint: T.steel });
      for (const z of [5.005, 5.085]) K.box('paint', s > 0 ? 2.955 : -3.0, 0, z, s > 0 ? 3.0 : -2.955, B.box.y0, z + 0.01, { tint: T.steel, cast: true });
    }
    const bx = B.box;
    K.box('paint', -3.2, bx.y0, bx.z0, 3.2, bx.y1, bx.z1, { tint: T.galv, bevel: 0.012, cast: true, skip: ['pz'] });
    for (const s of [-1, 1]) {
      K.box('paint', s > 0 ? 3.2 : -3.215, bx.y0 - 0.02, bx.z0 - 0.02, s > 0 ? 3.215 : -3.2, bx.y1 + 0.02, bx.z1, { tint: T.steel }); // end plates
      K.use('paint', { tint: T.steelDark }).cyl('x', [s > 0 ? 3.215 : -3.235, (bx.y0 + bx.y1) / 2, bx.z0 + 0.17], 0.035, 0.02, 6).cyl('x', [s > 0 ? 3.235 : -3.25, (bx.y0 + bx.y1) / 2, bx.z0 + 0.17], 0.018, 0.015, 14); // the spring shaft's end
      for (const x of [1.1, 2.9]) K.box('paint', s * x - 0.02, bx.y1, bx.z0 + 0.1, s * x + 0.02, H, bx.z0 + 0.14, { tint: T.steel }); // hangers to the header
    }
    for (const x of [-1.6, 0, 1.6]) K.box('paint', x - 0.004, bx.y0 - 0.002, bx.z0 - 0.002, x + 0.004, bx.y1 + 0.002, bx.z0 + 0.004, { tint: T.steel }); // the box's seams
    K.sticker('print', prints().rect('maker'), '-z', 2.2, bx.y0 + 0.2, bx.z0 - 0.003, 0.29, 0.07);
    K.sticker('print', prints().rect('chui'), '-z', 0, bx.y0 + 0.13, bx.z0 - 0.003, 0.5, 0.147);
    K.sticker('print', prints().rect('kentei'), '-z', 2.52, bx.y0 + 0.2, bx.z0 - 0.003, 0.09, 0.056, { rot: 0.05 });
  }

  // ---------------------------------------------------------------------------------------------- the roof
  roof(K) {
    const G = GARAGE, H = G.height, T = TINT, B = BUILD, top = H + B.plate, R = B.ridge, X = 4.34, z0 = -5.3, z1 = 5.2;
    const E = top - (X - 4.2) * (R - top) / 4.2, L = Math.hypot(X, R - E); // the eave's height, a slope's length
    // the sheets: rust-proof red outside, bare zinc inside, the waves running down the slope
    for (const s of [-1, 1]) for (const [dy, tint, n] of [[0, T.zincIn, -1], [0.014, T.roof, 1]]) {
      K.wave('totan', z0, z1, (c, w, up) => (up ? [0, R + dy + w, c] : [s * X, E + dy + w, c]), [s * 0.2 * n, n, 0], { tint, cast: n > 0, uv: (p) => [p[2], Math.hypot(p[0], R - p[1])] });
    }
    K.box('paint', -0.12, R, z0, 0.12, R + 0.04, z1, { tint: T.roof, bevel: 0.018 }); // ridge cap
    void L;
    // king-post trusses on the wall plates: tie beam, rafters, king post, struts, bolted straps
    const yAt = (x) => R - Math.abs(x) * (R - E) / X; // the roof's underside
    for (const z of B.truss) {
      K.box('wood', -4.1, H, z - 0.06, 4.1, top, z + 0.06, { grain: 'x', tint: T.beam });
      for (const s of [-1, 1]) {
        K.beam('wood', [s * 4.05, top + 0.02, z], [s * 0.05, yAt(0.05) - 0.14, z], 0.1, 0.13, { tint: T.beam });
        K.beam('wood', [s * 0.06, top + 0.05, z], [s * 2.0, yAt(2.0) - 0.2, z], 0.08, 0.08, { tint: T.purlin });
        K.box('paint', s * 3.72 - 0.03, H - 0.012, z - 0.066, s * 3.72 + 0.03, top + 0.1, z + 0.066, { tint: T.steelDark }); // heel strap
        for (const zz of [z - 0.072, z + 0.064]) K.box('paint', s * 3.72 - 0.014, top - 0.1, zz, s * 3.72 + 0.014, top - 0.072, zz + 0.008, { tint: T.steel });
      }
      K.box('wood', -0.055, top, z - 0.055, 0.055, R - 0.1, z + 0.055, { grain: 'y', tint: T.beam });
      K.box('paint', -0.035, top - 0.03, z - 0.062, 0.035, top + 0.16, z + 0.062, { tint: T.steelDark });
    }
    // purlins on the rafters (and on the gables), the ridge purlin
    for (const s of [-1, 1]) for (const x of [0.75, 1.6, 2.45, 3.3, 4.12]) K.box('wood', s * x - 0.03, yAt(x) - 0.075, -5.0, s * x + 0.03, yAt(x) - 0.004, 5.0, { grain: 'z', tint: T.purlin });
    K.box('wood', -0.04, R - 0.1, -5.0, 0.04, R - 0.004, 5.0, { grain: 'z', tint: T.purlin });
    // the east eave's half-round gutter and the downpipe at the front corner (its brackets, the shoe at the foot)
    const gx = X + 0.05, gy = E - 0.03;
    K.box('paint', gx - 0.05, gy - 0.06, -5.3, gx + 0.05, gy - 0.05, 5.16, { tint: T.galv, cast: true });
    for (const s of [-1, 1]) K.box('paint', gx + s * 0.05 - 0.004, gy - 0.06, -5.3, gx + s * 0.05 + 0.004, gy + (s > 0 ? 0.02 : 0.035), 5.16, { tint: T.galv });
    for (const z of [-5.3, 5.152]) K.box('paint', gx - 0.05, gy - 0.06, z, gx + 0.05, gy + 0.02, z + 0.008, { tint: T.galv });
    for (let z = -4.6; z < 5; z += 1.15) K.box('paint', X - 0.02, gy - 0.07, z - 0.008, gx + 0.06, gy - 0.055, z + 0.008, { tint: T.steelDark });
    const px = 4.2, pz = 5.27;
    K.pipe('paint', [[gx, gy - 0.05, 5.1], [gx - 0.02, gy - 0.22, 5.2], [px, gy - 0.34, pz], [px, 0.2, pz], [px - 0.02, 0.07, pz + 0.12]], 0.032, { tint: T.galv, sides: 14, cast: true });
    for (const y of [0.6, 1.7, 2.75]) { K.box('paint', px - 0.045, y, pz - 0.045, px + 0.045, y + 0.03, pz + 0.045, { tint: T.steelDark }); K.box('paint', px - 0.01, y + 0.005, pz - 0.07, px + 0.01, y + 0.025, pz - 0.04, { tint: T.steelDark }); }
  }

  // ---------------------------------------------------------------------------------------------- the roll shutter
  buildShutter(K) {
    const G = GARAGE, T = TINT, P = SHUTTER.pitch, hw = 3.02, N = 36, bar = 0.07;
    // a slat's rolled section (y up it, z out): the interlocking curl at the foot, then the bowed face
    const SLAT = [[0, -0.002], [0.006, 0.008], [0.016, 0.012], [0.036, 0.0125], [0.056, 0.009], [P, -0.002]];
    this.slatVerts = (SLAT.length - 1) * 6;
    // the curtain from the bottom bar up: each slat is a face and its rolled lower lip. Its length above the box's
    // mouth is simply not drawn (setShutter moves the mesh and the draw range).
    const uvF = (p) => [(p[0] + hw) / SHUTTER.w, p[1] / SHUTTER.h];
    const base = 0xb3bdbc, rusty = 0xb89a84; // slats 20 to 25 sat rolled against the damp box for years
    const m = K.mesh('shutter', (g) => {
      for (let k = 0; k < N; k++) {
        const y0 = bar + k * P;
        g.tint(k >= 20 && k <= 25 ? rusty : base, k === 22 || k === 23 ? 0.86 : k % 7 === 3 ? 0.95 : 1);
        for (let i = 0; i + 1 < SLAT.length; i++) g.quad([-hw, y0 + SLAT[i][0], SLAT[i][1]], [hw, y0 + SLAT[i][0], SLAT[i][1]], [hw, y0 + SLAT[i + 1][0], SLAT[i + 1][1]], [-hw, y0 + SLAT[i + 1][0], SLAT[i + 1][1]], [0, 0, 1]);
      }
    });
    const ink = K.mesh('shutterInk', (g) => {
      g.uv = uvF;
      for (let k = 0; k < N; k++) {
        const y0 = bar + k * P;
        for (let i = 0; i + 1 < SLAT.length; i++) g.quad([-hw, y0 + SLAT[i][0], SLAT[i][1] + 0.0006], [hw, y0 + SLAT[i][0], SLAT[i][1] + 0.0006], [hw, y0 + SLAT[i + 1][0], SLAT[i + 1][1] + 0.0006], [-hw, y0 + SLAT[i + 1][0], SLAT[i + 1][1] + 0.0006], [0, 0, 1]);
      }
    }, { cast: false });
    ink.raycast = () => {}; ink.renderOrder = 1;
    const back = K.mesh('paint', (g) => {
      for (let k = 0; k < N; k++) {
        const y0 = bar + k * P;
        g.tint(T.galv, k % 9 === 4 ? 0.9 : 1);
        for (let i = 0; i + 1 < SLAT.length; i++) g.quad([-hw, y0 + SLAT[i][0], SLAT[i][1] - 0.006], [hw, y0 + SLAT[i][0], SLAT[i][1] - 0.006], [hw, y0 + SLAT[i + 1][0], SLAT[i + 1][1] - 0.006], [-hw, y0 + SLAT[i + 1][0], SLAT[i + 1][1] - 0.006], [0, 0, -1]);
      }
    });
    // the bottom bar: an aluminium T with a rubber seal, two lift handles, the lock plate and the hasp with its padlock
    const fit = K.mesh('paint', (g) => {
      g.tint(T.galv); g.box(-hw, 0.012, -0.022, hw, bar, 0.022, { bevel: 0.006 });
      g.tint(T.rubber); g.box(-hw, 0, -0.012, hw, 0.014, 0.012);
      g.tint(T.steelDark);
      for (const x of [-1.5, 1.5]) for (const s of [-1, 1]) { g.box(x - 0.07, 0.03, s > 0 ? 0.022 : -0.05, x - 0.058, 0.05, s > 0 ? 0.05 : -0.022); g.box(x + 0.058, 0.03, s > 0 ? 0.022 : -0.05, x + 0.07, 0.05, s > 0 ? 0.05 : -0.022); g.box(x - 0.07, 0.03, s > 0 ? 0.04 : -0.052, x + 0.07, 0.05, s > 0 ? 0.052 : -0.04); }
      g.tint(T.steel); g.box(-0.05, 0.016, 0.022, 0.05, 0.064, 0.03, { bevel: 0.004 });
      g.tint(T.brass); g.cyl('z', [0, 0.04, 0.03], 0.013, 0.008, 16); g.tint(T.black); g.box(-0.002, 0.032, 0.038, 0.002, 0.048, 0.0385);
      g.tint(T.steelDark); g.box(0.17, 0.02, 0.022, 0.23, 0.05, 0.03); g.box(0.19, 0.026, 0.03, 0.21, 0.044, 0.06);
      // the padlock (brass body, steel shackle) through the hasp
      g.tint(T.brass); g.box(0.172, -0.012 + 0.02, 0.062, 0.228, 0.03 + 0.02, 0.086, { bevel: 0.006 });
      g.tint(T.steel); g.strut([0.184, 0.05, 0.074], [0.184, 0.075, 0.074], 0.005, { round: 5 }); g.strut([0.216, 0.05, 0.074], [0.216, 0.075, 0.074], 0.005, { round: 5 }); g.strut([0.184, 0.075, 0.074], [0.216, 0.075, 0.074], 0.005, { round: 5 });
    });
    for (const o of [m, back, fit, ink]) { o.frustumCulled = false; }
    m.position.set(0, 0, G.maxZ + 0.05);
    m.name = 'shutter';
    back.raycast = () => {}; fit.name = 'shutter-bar';
    m.add(back, fit, ink);
    this.shutterInkMesh = ink;
    this.add(m);
    this.shutterMesh = m;
    this.shutterBack = back;
    this.shutterBar = fit;
    this.shutterSlats = N;
    this.shutterOb = this.game.player.addObstacle(-3.0, 3.0, G.maxZ - 0.05, G.maxZ + 0.18);
    this.shutterOpen = -1;
  }

  buildDoor(K) {
    const G = GARAGE, T = TINT, w = G.doorHalf * 2, h = G.doorH;
    // the steel door to the back (it opens when the museum is unlocked): a pressed flush leaf with a louvre and a kick
    // plate, three hinges, a lever handle with its cylinder
    const pivot = new THREE.Group();
    pivot.position.set(-G.doorHalf, 0, G.minZ + 0.02);
    const door = K.mesh('paint', (g) => {
      g.tint(T.door); g.box(0, 0.006, -0.02, w, h, 0.02);
      // the pressed panels: raised stiles and rails
      for (const [x0, y0, x1, y1] of [[0.04, 0.24, w - 0.04, 0.3], [0.04, 1.02, w - 0.04, 1.1], [0.04, h - 0.1, w - 0.04, h - 0.04], [0.04, 0.24, 0.1, h - 0.04], [w - 0.1, 0.24, w - 0.04, h - 0.04]]) g.box(x0, y0, 0.02, x1, y1, 0.026);
      g.tint(T.steel); g.box(0.02, 0.012, 0.02, w - 0.02, 0.2, 0.024); // kick plate
      g.tint(T.frame); for (let k = 0; k < 5; k++) g.quad([0.3, 0.42 + k * 0.05, 0.021], [w - 0.3, 0.42 + k * 0.05, 0.021], [w - 0.3, 0.455 + k * 0.05, 0.034], [0.3, 0.455 + k * 0.05, 0.034], [0, 0.6, 1]); // louvre
      g.box(0.28, 0.4, 0.02, 0.3, 0.69, 0.034); g.box(w - 0.3, 0.4, 0.02, w - 0.28, 0.69, 0.034);
      g.tint(T.steelDark); for (const y of [0.25, 1.05, 1.85]) g.cyl('y', [0.0, y - 0.05, 0.03], 0.012, 0.1, 12); // hinges
    }, { cast: true });
    pivot.add(door);
    const knob = K.mesh('chrome', (g) => {
      g.tint(0xd8dcde); g.box(w - 0.14, 0.94, 0.02, w - 0.06, 1.1, 0.028, { bevel: 0.004 });
      g.cyl('z', [w - 0.1, 1.05, 0.028], 0.014, 0.03, 16); g.box(w - 0.22, 1.04, 0.05, w - 0.088, 1.06, 0.064, { bevel: 0.006 });
      g.cyl('z', [w - 0.1, 0.975, 0.028], 0.012, 0.006, 16);
    });
    pivot.add(knob);
    // "for rent" sign taped to the door
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.42), new THREE.MeshStandardMaterial({ map: posterTexture('museumSign', 64, 54), roughness: 0.9 }));
    sign.position.set(G.doorHalf, 1.55, 0.029);
    pivot.add(sign);
    this.add(pivot);
    this.door = { pivot, door, sign, open: 0 };
    this.doorObstacle = this.game.player.addObstacle(-G.doorHalf, G.doorHalf, G.minZ - 0.25, G.minZ + 0.05);
    // the steel frame in the opening, and the threshold
    for (const [x0, y0, x1, y1] of [[-G.doorHalf - 0.06, 0, -G.doorHalf, h], [G.doorHalf, 0, G.doorHalf + 0.06, h], [-G.doorHalf - 0.06, h, G.doorHalf + 0.06, h + 0.06]]) K.box('paint', x0, y0, G.minZ - 0.08, x1, y1, G.minZ + 0.045, { tint: T.frame });
    K.box('paint', -G.doorHalf, 0, G.minZ - 0.08, G.doorHalf, 0.012, G.minZ + 0.04, { tint: T.steel });
    // the light switch: an exposed ivory box with a tumbler (the game clicks the box, the tumbler flips)
    const sw = K.mesh('gloss', (g) => { g.tint(T.ivory); g.box(-0.04, -0.06, 0, 0.04, 0.06, 0.034, { bevel: 0.008 }); g.tint(tintK(T.ivory, 0.8)); g.box(-0.018, -0.03, 0.034, 0.018, 0.03, 0.038); }, { cast: false });
    sw.position.set(G.doorHalf + 0.28, 1.2, G.minZ + 0.001);
    this.add(sw);
    const toggle = K.mesh('gloss', (g) => { g.tint(T.white); g.box(-0.011, -0.016, 0, 0.011, 0.016, 0.016, { bevel: 0.004 }); }, { cast: false });
    toggle.position.set(0, 0.012, 0.036);
    sw.add(toggle);
    this.lightSwitch = sw;
    this.lightToggle = toggle;
  }

  /** The sell box (an open carton) and the storage bin by the PC: the game clicks them. */
  buildCrates() {
    const K = this.K, T = TINT;
    const crate = (x, z, w, h, d, label) => {
      const g0 = new THREE.Group();
      g0.position.set(x, 0, z);
      const cb = 0xd2a878;
      g0.add(K.mesh('card', (g) => {
        g.tint(cb); const t = 0.012;
        g.box(-w / 2, 0, -d / 2, w / 2, t, d / 2); g.box(-w / 2, 0, -d / 2, -w / 2 + t, h, d / 2); g.box(w / 2 - t, 0, -d / 2, w / 2, h, d / 2); g.box(-w / 2, 0, -d / 2, w / 2, h, -d / 2 + t); g.box(-w / 2, 0, d / 2 - t, w / 2, h, d / 2);
        // the flaps folded out, the tape down the middle
        g.tint(cb, 0.92);
        for (const s of [-1, 1]) { g.quad([-w / 2, h, s * d / 2], [w / 2, h, s * d / 2], [w / 2, h - 0.1, s * (d / 2 + 0.14)], [-w / 2, h - 0.1, s * (d / 2 + 0.14)], [0, 1, s]); g.quad([-w / 2, h, s * d / 2], [w / 2, h, s * d / 2], [w / 2, h - 0.1, s * (d / 2 + 0.14)], [-w / 2, h - 0.1, s * (d / 2 + 0.14)], [0, -1, -s]); }
        g.tint(0xc8b48a); g.box(-w / 2 - 0.001, h * 0.3, -0.03, -w / 2 + 0.001, h, 0.03);
      }));
      const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.26), new THREE.MeshStandardMaterial({ map: posterTexture(label, 64, 50), roughness: 0.9 }));
      lab.rotation.y = -Math.PI / 2;
      lab.position.set(-w / 2 - 0.003, h * 0.55, 0);
      g0.add(lab);
      this.add(g0);
      this.game.player.addObstacle(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
      this.game.physics.addBox({ center: new THREE.Vector3(x, h / 2, z), half: new THREE.Vector3(w / 2, h / 2, d / 2), material: 'wood' });
      g0.userData.top = h;
      return g0;
    };
    this.sellBox = crate(3.55, -2.15, 0.5, 0.42, 0.42, 'sellBox');
    // the storage bin: translucent plastic, a blue lid with clips, a few capsules showing through
    const x = 3.55, z = -2.78, w = 0.5, h = 0.38, d = 0.5, g0 = new THREE.Group();
    g0.position.set(x, 0, z);
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshPhysicalMaterial({ color: 0xe8f0f4, transparent: true, opacity: 0.5, roughness: 0.22 }));
    body.position.y = h / 2;
    g0.add(body);
    const lid = K.mesh('paint', (g) => { g.tint(0x6a9ad8); g.box(-w / 2 - 0.015, 0, -d / 2 - 0.015, w / 2 + 0.015, 0.04, d / 2 + 0.015, { bevel: 0.012 }); g.tint(0x4d7fc0); for (const s of [-1, 1]) g.box(s * (w / 2 + 0.012) - 0.01, -0.04, -0.05, s * (w / 2 + 0.012) + 0.01, 0.03, 0.05, { bevel: 0.004 }); });
    lid.position.y = h;
    g0.add(lid);
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.12), new THREE.MeshStandardMaterial({ map: posterTexture('storageLabel', 48, 26), roughness: 0.9 }));
    lab.rotation.y = -Math.PI / 2;
    lab.position.set(-w / 2 - 0.003, h * 0.62, 0);
    g0.add(lab);
    g0.add(K.mesh('gloss', (g) => { for (let i = 0; i < 7; i++) { g.tint([0xf08aa0, 0x7cc8f0, 0xf4d660, 0x7ccc8a][i % 4]); g.push(new THREE.Matrix4().makeTranslation((hash2(i, 1) - 0.5) * 0.36, 0.045, (hash2(i, 2) - 0.5) * 0.36)); g.lathe([[0, -0.035], [0.018, -0.03], [0.03, -0.018], [0.035, 0], [0.03, 0.018], [0.018, 0.03], [0, 0.035]], 14); g.pop(); } }, { cast: false }));
    this.add(g0);
    this.game.player.addObstacle(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
    this.game.physics.addBox({ center: new THREE.Vector3(x, h / 2, z), half: new THREE.Vector3(w / 2 + 0.015, h / 2 + 0.02, d / 2 + 0.015), material: 'wood' });
    g0.userData.lid = lid;
    this.storageBox = g0;
    void T;
  }

  // ---------------------------------------------------------------------------------------------- lights
  buildLights(K) {
    const G = GARAGE, T = TINT;
    const scene = this.game.scene;
    // the sun (the moon by night: src/game/Lighting.js), low through the shutter and the window
    const sun = new THREE.DirectionalLight(0xffd8a8, 3.0);
    sun.position.set(-5.5, 5.2, 14);
    sun.target.position.set(0.5, 0, 0);
    sun.castShadow = true;
    const sc = sun.shadow.camera;
    sc.left = -9; sc.right = 9; sc.top = 9; sc.bottom = -9; sc.near = 1; sc.far = 40;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    sun.shadow.radius = 2.4; // a soft, natural edge
    scene.add(sun, sun.target);
    this.game.renderer.registerShadowLight(sun, 1);
    this.lights.sun = sun;

    const hemi = new THREE.HemisphereLight(0xb9cfe8, 0x6b5a4a, 0.75);
    scene.add(hemi);
    this.lights.hemi = hemi;

    // Fluorescent fittings (twin-tube inverted-Fuji, 逆富士) on battens under the tie beams. Two carry the room's real
    // light (tubes[0] back, tubes[1] front: the dead one in a new game; fix = the body, the click target); the other
    // five are on the same switch and only glow.
    this.lights.tubes = [];
    this.fixTop = G.height - 0.18;
    for (const x of [-2.4, 0, 2.4]) K.box('wood', x - 0.045, G.height - 0.09, -4.9, x + 0.045, G.height, 4.9, { grain: 'z', tint: T.purlin });
    for (const [x, z] of [[0, -2.0], [0, 0.8]]) {
      const tubeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xeef4ff).multiplyScalar(2.2) });
      const fix = K.mesh('gloss', (g) => fixtureBody(g, 1.3), { cast: false, tint: T.white });
      fix.position.set(x, this.fixTop, z);
      fix.name = 'tube-fixture';
      this.add(fix);
      const tubes = new THREE.Mesh(tubeGeometry([[0, 0]], 1.3), tubeMat);
      tubes.position.copy(fix.position);
      this.add(tubes);
      // (a soft falloff, so the two fixtures light the whole room evenly like a cartoon interior; the light hangs a metre
      // under the ceiling, as if the fixture's reflector threw it down)
      const pl = new THREE.PointLight(0xf0f2ff, 5.5, 9.5, 1.45);
      pl.position.set(x, G.height - 0.95, z);
      scene.add(pl);
      this.lights.tubes.push({ light: pl, mat: tubeMat, base: 5.5, fix });
    }
    this.extraFix = [[-2.4, -2.0], [-2.4, 0.8], [2.4, -2.0], [2.4, 0.8], [0, 3.6]];
    const g = K.use('gloss', { tint: T.white });
    for (const [x, z] of this.extraFix) { g.push(new THREE.Matrix4().makeTranslation(x, this.fixTop, z)); fixtureBody(g, 1.3); g.pop(); }
    const extra = new THREE.Mesh(tubeGeometry(this.extraFix, 1.3), this.lights.tubes[0].mat);
    extra.position.y = this.fixTop;
    this.add(extra);

    // desk lamp spot over the work table
    const Tb = this.table = { x: 0.2, z: 0.1, w: 1.8, d: 0.9, h: 0.78 };
    const spot = new THREE.SpotLight(0xffd8a0, 9, 4.5, 0.75, 0.55, 1.4);
    spot.position.set(Tb.x + 0.55, Tb.h + 0.5, Tb.z - 0.25);
    spot.target.position.set(Tb.x - 0.1, Tb.h, Tb.z + 0.1);
    spot.castShadow = true;
    spot.shadow.bias = -0.0006;
    spot.shadow.normalBias = 0.01;
    spot.shadow.camera.near = 0.05;
    scene.add(spot, spot.target);
    this.game.renderer.registerShadowLight(spot, 0.5);
    this.lights.desk = spot;

    // warm bounce from the low sun hitting the floor
    const bounce = new THREE.PointLight(0xffd0a0, 2.0, 7, 1.8);
    bounce.position.set(0, 0.6, 4.2);
    scene.add(bounce);
    this.lights.bounce = bounce;

    // (no light-shaft quads: the low sun through the window lights the floor and the wall with its own shadow map)
  }

  buildDust() {
    // floating dust motes catching the light: pixel motes (src/gfx/pixfx.js), brighter in the sunlit front half
    const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    this.dustField = this.game.effects?.motes({
      count: 380, min: new THREE.Vector3(-3.8, 0.2, -4.8), max: new THREE.Vector3(3.8, 3.0, 4.8), size: 0.007,
      colors: [0xfff0d0, 0xffe2b0, 0xf4e8d8],
      lit: (x, y, z) => (smooth(-1, 3.5, z) * 0.8 + 0.2) * (0.35 + 0.65 * Math.max(0, this.shutterOpen)),
    });
  }

  /** Roll the shutter: 0 = closed to the ground, 1 = open (the bottom bar up at head height, the rest in the box). */
  setShutter(k, instant = false) {
    void instant;
    if (Math.abs(k - this.shutterOpen) < 1e-4) return;
    this.shutterOpen = k;
    const G = GARAGE, bottom = G.shutterY * k, m = this.shutterMesh;
    m.position.y = bottom;
    // the slats that have come out of the box's mouth
    const n = Math.max(0, Math.min(this.shutterSlats, Math.ceil((BUILD.box.y0 + 0.03 - bottom - 0.07) / SHUTTER.pitch)));
    m.geometry.setDrawRange(0, n * this.slatVerts);
    this.shutterBack.geometry.setDrawRange(0, n * this.slatVerts);
    this.shutterInkMesh.geometry.setDrawRange(0, n * this.slatVerts);
    this.shutterOb.enabled = k < 0.85;
    // daylight only pours in once it's up
    if (this.lights.bounce) this.lights.bounce.intensity = 2.0 * k;
  }

  /** Room lights on/off (light switch). Dead tubes stay dark. */
  setLights(on) {
    this.lightsOn = on;
    for (const t of this.lights.tubes) {
      const lit = on && !t.dead;
      t.light.intensity = lit ? t.base : 0;
      t.mat.color.setScalar(lit ? 2.2 : 0.15);
    }
    this.lights.hemi.intensity = on ? 0.75 : 0.25;
    this.lightToggle.position.y = on ? 0.012 : -0.012;
  }

  update(dt, t) {
    this.town?.update(dt, t);
    this.detail?.update(dt, t);
    // door animation
    const d = this.door;
    const target = d.wantOpen ? 1 : 0;
    if (Math.abs(d.open - target) > 0.001) {
      d.open += (target - d.open) * Math.min(1, dt * 3);
      d.pivot.rotation.y = -d.open * 1.75;
    }
  }
}

const _tc = new THREE.Color();
/** A tint scaled in brightness (sRGB hex in and out). */
export function tintK(c, k) { _tc.setHex(c).multiplyScalar(k); return _tc.getHex(); }

/** An inverted-Fuji fluorescent fitting's body about the origin (its top at y = 0, along z): the white enamel channel,
 *  the sloped reflectors, the lamp holders, the ballast cover's screws and the pull switch at one end. */
export function fixtureBody(g, len = 1.3) {
  const h = len / 2, col = g.rgb, k = (f) => [col[0] * f, col[1] * f, col[2] * f];
  // cross-section (x, y): wide at the ceiling, narrow below
  const S = [[-0.12, 0], [0.12, 0], [0.12, -0.022], [0.058, -0.085], [-0.058, -0.085], [-0.12, -0.022]];
  for (let i = 0; i < S.length; i++) {
    const a = S[i], b = S[(i + 1) % S.length], n = [b[1] - a[1], -(b[0] - a[0]), 0];
    g.rgb = k(i === 3 ? 0.9 : 1);
    g.quad([a[0], a[1], -h], [b[0], b[1], -h], [b[0], b[1], h], [a[0], a[1], h], [-n[0], -n[1], 0]);
  }
  for (const s of [-1, 1]) {
    g.rgb = k(0.94); g.fan(S.map(([x, y]) => [x, y, s * h]), [0, 0, s]);
    g.rgb = k(0.8); for (const x of [-0.034, 0.034]) g.box(x - 0.012, -0.132, s * (h - 0.03) - 0.012, x + 0.012, -0.085, s * (h - 0.03) + 0.012); // lamp holders
    g.rgb = k(0.62); for (const x of [-0.085, 0.085]) g.box(x - 0.005, 0, s * 0.35 - 0.005, x + 0.005, 0.09, s * 0.35 + 0.005); // stems to the batten
  }
  g.rgb = k(0.7); g.box(-0.012, -0.089, -0.25, 0.012, -0.085, -0.23); g.box(-0.012, -0.089, 0.23, 0.012, -0.085, 0.25); // screws
  // the pull switch and its cord with the little acorn
  g.rgb = k(0.86); g.box(0.07, -0.06, h - 0.2, 0.1, -0.03, h - 0.16);
  g.rgb = k(0.92); g.strut([0.085, -0.06, h - 0.18], [0.085, -0.52, h - 0.18], 0.002, { round: 4 });
  g.rgb = k(0.8); g.box(0.077, -0.56, h - 0.188, 0.093, -0.52, h - 0.172, { bevel: 0.005 });
  g.rgb = col;
}
/** The tubes of fittings at [[x, z]] (y = 0 at the fitting's top), as one unlit geometry. */
export function tubeGeometry(at, len = 1.3) {
  const parts = [];
  for (const [x, z] of at) for (const dx of [-0.034, 0.034]) {
    const c = new THREE.CylinderGeometry(0.014, 0.014, len - 0.08, 14);
    c.rotateX(Math.PI / 2); c.translate(x + dx, -0.108, z);
    parts.push(c.toNonIndexed());
  }
  const n = parts.reduce((a, p) => a + p.attributes.position.count, 0), pos = new Float32Array(n * 3);
  let o = 0;
  for (const p of parts) { pos.set(p.attributes.position.array, o); o += p.attributes.position.array.length; p.dispose(); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return geo;
}
