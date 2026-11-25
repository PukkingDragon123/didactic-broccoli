// The garage: architecture, outside street at dusk, lighting and fixed interactables. It starts nearly empty: the
// furniture and decor you buy are placed with the builder (src/build/) on the attach points below (ATTACH).
import * as THREE from 'three';
import { worldBox, pixMat, boxMesh, colMat as plainMat } from '../gfx/geo.js';
import { detailize, surfaceTex } from './surfaces.js';
import { posterTexture, Pix } from '../gfx/textures.js';
import { FONT_EN } from '../gfx/pix.js';
import { propMesh, hasProp, propSize } from './props.js';
import { Town } from './Town.js';
import { archReady, archFace } from './archModels.js';
import { GarageDetail, garageBatches, bakeInto, placeProp, surfMat } from './GarageDetail.js';
import { GarageMess, kitMesh, kitOrigin, propMap, LANTERN_PTS } from './garageMess.js';
import { dressGarage } from './garageLayout.js';

// the garage's plain-coloured parts (frames, the door furniture, the bar, the table legs...) get real surface detail
const colCache = new Map();
function colMat(color, opts = {}) {
  const k = color + JSON.stringify(opts);
  if (!colCache.has(k)) colCache.set(k, detailize(plainMat(color, opts).clone(), (opts.metalness ?? 0) >= 0.3 ? 'metal' : 'paint'));
  return colCache.get(k);
}

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
const RACK_Y = [0.08, 0.62, 1.16, 1.7];
export const ATTACH = {
  surfaces: [
    // (the middle of the counter: the rest of it is Grandpa's clutter, src/world/garageLayout.js)
    { id: 'table', x0: -0.3, x1: 0.55, z0: -0.08, z1: 0.36, y: 0.78, h: 0.7 },
    { id: 'desk', x0: 3.29, x1: 3.95, z0: -4.68, z1: -3.2, y: 0.74, h: 0.9 },
    // (the racks are full of Grandpa's stock: src/world/garageLayout.js)
    { id: 'highShelf', x0: 3.75, x1: 3.98, z0: 0.9, z1: 3.76, y: 2.475, h: 0.5 },
    { id: 'sill', x0: -3.99, x1: -3.83, z0: 1.45, z1: 2.2, y: 1.75, h: 0.55 },
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
    { face: '+z', u0: -0.3, u1: 0.3, y0: 2.25, y1: 3.0 }, // the wall clock over the back door
    { face: '+z', u0: -1.52, u1: -0.58, y0: 2.22, y1: 2.9 }, // Grandpa's kamidana (the charm shelf)
    { face: '+z', u0: -1.98, u1: -1.58, y0: 2.2, y1: 2.8 }, // the lucky rake
    { face: '+x', u0: 2.9, u1: 4.35, y0: 0, y1: 2.1 }, // Grandpa's workbench and the jar shelf over it
    // Grandpa's things round the walls (src/plugins/garageDressing.js)
    { face: '+x', u0: -4.65, u1: -1.58, y0: 1.85, y1: 2.62 }, // stock shelves over the machine row
    { face: '+x', u0: 2.9, u1: 4.9, y0: 2.0, y1: 3.1 }, // the bicycle hung over the workbench
    { face: '-x', u0: -3.1, u1: -1.3, y0: 1.0, y1: 1.95 }, // jar shelf, calendar, mirror
    { face: '-x', u0: 0.1, u1: 0.6, y0: 1.05, y1: 1.8 }, // a poster between the wall shelves' slots
    { face: '-x', u0: 1.9, u1: 2.4, y0: 1.05, y1: 1.8 }, // and another
    { face: '-x', u0: 3.7, u1: 4.95, y0: 0, y1: 2.2 }, // the fire alarm and the steel shelving unit
    { face: '+z', u0: 1.85, u1: 2.35, y0: 1.8, y1: 2.5 }, // a poster over the sink
    { face: '+z', u0: 2.88, u1: 3.43, y0: 1.9, y1: 2.4 }, // the dartboard
    { face: '+z', u0: -1.16, u1: -0.86, y0: 1.45, y1: 1.65 }, // the opening-hours card
    // Grandpa's mess and its notices (src/world/garageLayout.js, src/world/GarageDetail.js electrical)
    { face: '+z', u0: -1.2, u1: -0.7, y0: 0, y1: 1.95 }, // the broom bin and the no-credit notice
    { face: '+z', u0: 1.45, u1: 1.8, y0: 1.42, y1: 1.95 }, // the kaiju poster over the fridge
    { face: '+z', u0: 3.3, u1: 3.8, y0: 2.45, y1: 2.65 }, // the shoplifting notice
    { face: '+z', u0: -2.4, u1: 2.4, y0: 2.95, y1: 3.2 }, // the knob-and-tube wiring
    { face: '-x', u0: -0.85, u1: -0.25, y0: 2.0, y1: 2.25 }, // tin signs under the high shelf
    { face: '-x', u0: 2.78, u1: 3.32, y0: 2.0, y1: 2.25 },
    { face: '-x', u0: 1.88, u1: 2.42, y0: 0.9, y1: 1.95 }, // his jacket over the fan
    { face: '-x', u0: -1.8, u1: -1.4, y0: 0, y1: 0.9 }, // crates of stock by the sell box
    { face: '+x', u0: 0.5, u1: 0.82, y0: 1.85, y1: 2.55 }, // the soy sauce tin sign
    { face: '+x', u0: -4.95, u1: -4.75, y0: 0, y1: 3.2 }, // the outlet and its conduit in the back corner
    { face: '+x', u0: -4.9, u1: 4.9, y0: 3.05, y1: 3.3 }, // the wiring on the wall plate
    { face: '+x', u0: -4.25, u1: -3.75, y0: 2.3, y1: 2.8 }, // posters over the plank shelves
    { face: '+x', u0: -2.7, u1: -2.2, y0: 2.3, y1: 2.8 },
    { face: '+z', u0: 2.45, u1: 2.85, y0: 2.0, y1: 2.5 }, // the Showa poster by the water heater
    { face: '+x', u0: 3.05, u1: 3.35, y0: 1.35, y1: 1.75 }, // the lost-cat poster by the workbench
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

// everything that stands, hangs or is fixed in the garage is a real model (src/world/garageMess.js): the invisible
// boxes below only carry the physics and the placement surfaces of the work table and the PC desk
const HIDDEN = new THREE.MeshBasicMaterial({ visible: false });
// the steel racks (shelf_steel) scaled so their boards land on RACK_Y (+ 1.25 cm); the legs stand 5 cm into the slab
const RACK_SY = 1.0672, RACK_DY = -0.0505;

export class Garage {
  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    this.group.name = 'garage';
    game.scene.add(this.group);
    this.lights = {};
    this.build();
  }

  add(obj, parent = this.group) { parent.add(obj); return obj; }
  /** Static decoration: merged into the garage's shared batch instead of being its own draw call. */
  bake(obj) { bakeInto(this.SB, obj); return obj; }

  /** static box with optional physics + player collision */
  solid(w, h, d, mat, x, y, z, { phys = true, player = false, material = 'wood', cast = true, receive = true, rotY = 0 } = {}) {
    const m = boxMesh(w, h, d, mat, { cast, receive });
    m.position.set(x, y + h / 2, z);
    m.rotation.y = rotY;
    this.add(m);
    if (phys) this.game.physics.addBox({ center: m.position, half: new THREE.Vector3(w / 2, h / 2, d / 2), rotY, material });
    if (player) {
      const hw = rotY ? d / 2 : w / 2, hd = rotY ? w / 2 : d / 2;
      this.game.player.addObstacle(x - hw, x + hw, z - hd, z + hd);
    }
    return m;
  }

  /** Static voxel prop merged into the shared prop batch (falls back to a normal mesh when the prop is missing). */
  sprop(id, x, y, z, rotY = 0, opts = {}) {
    if (!hasProp(id) || !this.PB) return this.prop(id, x, y, z, rotY, opts);
    return placeProp(this.game, this.PB, id, x, y, z, rotY, { scale: opts.scale || 1, block: !!opts.player, phys: !!opts.phys, material: opts.material || 'wood' });
  }

  prop(id, x, y, z, rotY = 0, opts = {}) {
    const m = propMesh(id, opts);
    m.position.set(x, y, z);
    m.rotation.y = rotY;
    if (opts.scale) m.scale.setScalar(opts.scale);
    this.add(m);
    if (opts.player) {
      const s = new THREE.Box3().setFromObject(m);
      this.game.player.addObstacle(s.min.x - 0.02, s.max.x + 0.02, s.min.z - 0.02, s.max.z + 0.02);
    }
    if (opts.phys) {
      const s = new THREE.Box3().setFromObject(m);
      const c = s.getCenter(new THREE.Vector3()), h = s.getSize(new THREE.Vector3()).multiplyScalar(0.5);
      this.game.physics.addBox({ center: c, half: h, material: opts.material || 'wood' });
    }
    return m;
  }

  build() {
    const G = GARAGE;
    const H = G.height;
    // static decoration is merged into a few big meshes (SB: boxes / decals / cards, PB: voxel props)
    Object.assign(this, garageBatches(G));
    this.mess = new GarageMess(this);
    // the HD surfaces at their authored 64 px/m (worn slab, blocks, ribbed steel, plywood sheets, form concrete)
    const concrete = surfMat('garageSlab', { ppm: 64, roughness: 0.84, bump: 0.3, color: 0xd2cabe });
    const block = surfMat('blockHD', { ppm: 64, roughness: 0.92, bump: 0.5 });
    const corr = surfMat('corrugatedHD', { ppm: 64, roughness: 0.5, metalness: 0.35, bump: 0.7 });
    // plywood: 91 x 182 cm sheets, each its own grain and tone (art/lowpix/world_arch/tex/make_tex.py), 128 px/m
    const ply = new THREE.MeshStandardMaterial({ map: surfaceTex('plywood', 3.64), roughness: 0.75, color: new THREE.Color(1.3, 1.3, 1.3) }); // lifted: the corner is dim
    const cwall = surfMat('concreteHD', { ppm: 64, roughness: 0.92, bump: 0.5 });

    // ------------------------------------------------------------ floor & ceiling
    const floor = this.solid(8.4, 0.2, 10.4, concrete, 0, -0.2, 0, { material: 'concrete', cast: false });
    floor.name = 'floor';
    floor.userData.surface = true;
    this.floor = floor;
    // the roof casts shadows: low sun only gets in through the shutter and the window (no light through the roof boards)
    const ceil = boxMesh(8.4, 0.12, 10.4, new THREE.MeshStandardMaterial({ map: surfaceTex('plywood', 3.64), roughness: 0.9, color: 0xc8bca8 }), { cast: true });
    ceil.position.set(0, H + 0.06, 0);
    this.add(ceil);
    // (joists, steel H-beams, columns and the rest of the structure: GarageDetail)

    // ------------------------------------------------------------ walls
    // left wall (x=-4): block skirting + corrugated metal, with a window
    this.solid(0.2, 1.0, 10.4, block, G.minX - 0.1, 0, 0, { player: true, material: 'concrete' });
    const win = { z0: 1.05, z1: 2.65, y0: 1.75, y1: 2.6 };
    const upperH = H - 1.0;
    // pieces around window
    this.solid(0.12, upperH, win.z0 - (-5.2), corr, G.minX - 0.06, 1.0, (win.z0 + -5.2) / 2, { phys: false, material: 'metal' });
    this.solid(0.12, upperH, 5.2 - win.z1, corr, G.minX - 0.06, 1.0, (win.z1 + 5.2) / 2, { phys: false, material: 'metal' });
    this.solid(0.12, win.y0 - 1.0, win.z1 - win.z0, corr, G.minX - 0.06, 1.0, (win.z0 + win.z1) / 2, { phys: false });
    this.solid(0.12, H - win.y1, win.z1 - win.z0, corr, G.minX - 0.06, win.y1, (win.z0 + win.z1) / 2, { phys: false });
    this.buildWindow(G.minX, win);
    this.window = win;

    // right wall (x=+4): plywood boards (hobby wall)
    this.solid(0.2, H, 10.4, ply, G.maxX + 0.1, 0, 0, { player: true });

    // back wall (z=-5): exposed concrete with the museum door opening
    const dh = G.doorHalf;
    this.solid(4 - dh + 0.2, H, 0.2, cwall, (-4.2 - dh) / 2, 0, G.minZ - 0.1, { player: true, material: 'concrete' });
    this.solid(4 - dh + 0.2, H, 0.2, cwall, (4.2 + dh) / 2, 0, G.minZ - 0.1, { player: true, material: 'concrete' });
    this.solid(dh * 2, H - G.doorH, 0.2, cwall, 0, G.doorH, G.minZ - 0.1, { phys: false });
    this.buildDoor();

    // front: shutter + side walls
    const sh = G.shutterY;
    this.solid(1.2, H, 0.2, cwall, -3.6 + 0.0, 0, G.maxZ + 0.1, { player: true, material: 'concrete' });
    this.solid(1.2, H, 0.2, cwall, 3.6, 0, G.maxZ + 0.1, { player: true, material: 'concrete' });
    // roller shutter: its visible height changes as it rolls up into the hood (setShutter)
    // the curtain is painted by lowpix (art/lowpix/world_arch/_src/shopfront.py: shutter); setShutter maps its lower part
    this.shutterFace = archFace('shutter');
    const shutterMat = this.shutterFace ? Object.assign(this.shutterFace.material.clone(), { roughness: 0.5, metalness: 0.3 }) : pixMat('shutter', { roughness: 0.55, metalness: 0.45, bump: 2 });
    const shutter = new THREE.Mesh(new THREE.BufferGeometry(), shutterMat);
    shutter.castShadow = true; shutter.receiveShadow = true;
    shutter.position.set(0, 0, G.maxZ + 0.05);
    shutter.name = 'shutter';
    this.add(shutter);
    const bar = boxMesh(6.0, 0.06, 0.1, colMat(0x5d625c, { metalness: 0.6, roughness: 0.4 }));
    bar.position.set(0, sh + 0.03, G.maxZ + 0.05);
    this.add(bar);
    this.shutterMesh = shutter;
    this.shutterBar = bar;
    this.shutterOb = this.game.player.addObstacle(-3.0, 3.0, G.maxZ - 0.05, G.maxZ + 0.18);
    this.shutterOpen = -1;
    // the hood and the guide rails are part of the lowpix shop front (Town.buildShopFront) unless it failed to load
    if (!archReady('shopfront')) {
      const hood = boxMesh(6.4, 0.38, 0.4, pixMat('steel', { roughness: 0.6, metalness: 0.4 }));
      hood.position.set(0, H - 0.19, G.maxZ + 0.05);
      this.bake(hood);
      for (const x of [-3.02, 3.02]) { const r = boxMesh(0.06, H, 0.12, colMat(0x6a706a, { metalness: 0.6 })); r.position.set(x, H / 2, G.maxZ + 0.05); this.bake(r); }
    }
    // the shop front piers (the street, the neighbourhood and the shop facade live in Town.js)
    const P = this.game.player;
    P.addObstacle(-4.3, -3.0, G.maxZ - 0.1, G.maxZ + 0.35); P.addObstacle(3.0, 4.3, G.maxZ - 0.1, G.maxZ + 0.35);
    this.town = new Town(this.game, this);
    this.buildFurniture();
    this.buildPosters();
    this.buildLights();
    this.buildDust();
    this.detail = new GarageDetail(this, G);
    dressGarage(this);
    this.mess.flush(this.group);
    this.SB.build(this.group, { cast: true });
    this.PB.build(this.group, true);
  }

  buildWindow(x, w) {
    const cz = (w.z0 + w.z1) / 2, cy = (w.y0 + w.y1) / 2;
    // the steel sash window with its wooden sill, and the cafe curtain bunched on its rod (the garage kit)
    this.mess.put('gk_window', x, w.y0, cz, { ry: Math.PI / 2, hang: true, overlapOk: true });
    this.mess.put('gk_curtain', x, w.y0, cz, { ry: Math.PI / 2, hang: true, overlapOk: true });
    // frosted wired glass (classic Japanese 網入りガラス)
    const p = new Pix(32, 32, 5);
    p.fill(0xdde6e6);
    for (let i = 0; i < 32; i += 6) { p.rect(i, 0, 1, 32, 0xb8c4c4); p.rect(0, i, 32, 1, 0xb8c4c4); }
    const gt = p.texture();
    const glassMat = new THREE.MeshStandardMaterial({ map: gt, roughness: 0.35, color: 0xfff4e4, emissive: 0xffc890, emissiveMap: gt, emissiveIntensity: 0.95, side: THREE.DoubleSide });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w.z1 - w.z0, w.y1 - w.y0), glassMat);
    glass.rotation.y = Math.PI / 2;
    glass.position.set(x - 0.01, cy, cz);
    this.bake(glass);
  }

  buildDoor() {
    const G = GARAGE;
    // steel door (opens later when the museum is unlocked)
    const pivot = new THREE.Group();
    pivot.position.set(-G.doorHalf, 0, G.minZ + 0.02);
    // the green steel door (garage kit): hinged at the pivot, lever handles both sides, a kick plate
    const door = kitMesh('gk_door');
    door.position.copy(kitOrigin('gk_door'));
    door.castShadow = true;
    pivot.add(door);
    // "for rent" sign taped to the door
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.42), new THREE.MeshStandardMaterial({ map: posterTexture('museumSign', 64, 54), roughness: 0.9 }));
    sign.position.set(G.doorHalf, 1.45, 0.03);
    pivot.add(sign);
    this.add(pivot);
    this.door = { pivot, door, sign, open: 0 };
    this.doorObstacle = this.game.player.addObstacle(-G.doorHalf, G.doorHalf, G.minZ - 0.25, G.minZ + 0.05);
    this.mess.put('gk_doorframe', 0, 0, G.minZ, { hang: true });
    // the light switch: a bakelite plate (the click target) and its toggle, which flips
    const sw = kitMesh('gk_switch');
    const oS = kitOrigin('gk_switch');
    sw.position.set(G.doorHalf + 0.28, 1.2, G.minZ).add(oS);
    this.add(sw);
    const toggle = kitMesh('gk_toggle');
    this.lightToggleBase = new THREE.Vector3(0, 0, 0.012).sub(oS).add(kitOrigin('gk_toggle'));
    toggle.position.copy(this.lightToggleBase);
    toggle.position.y += 0.012;
    sw.add(toggle);
    this.lightSwitch = sw;
    this.lightToggle = toggle;
  }

  buildFurniture() {
    const G = GARAGE;
    // ---------------- the work table / counter (centre): a grey steel office desk with its drawer pedestals
    const T = { x: 0.2, z: 0.1, w: 1.8, d: 0.9, h: 0.78 };
    this.table = T;
    this.mess.put('gm_desk', T.x, 0, T.z, { sx: T.w / 2.0, sy: T.h / 0.787, sz: T.d / 0.947, shadow: true });
    const top = this.solid(T.w, 0.06, T.d, HIDDEN, T.x, T.h - 0.06, T.z, { material: 'metal', cast: false });
    top.userData.surface = true;
    this.tableTop = top;
    this.game.player.addObstacle(T.x - T.w / 2, T.x + T.w / 2, T.z - T.d / 2, T.z + T.d / 2);
    // cutting mat
    const p = new Pix(64, 40, 9);
    p.fill(0x24503a);
    for (let x = 0; x < 64; x += 4) p.rect(x, 0, 1, 40, 0x2e5c44);
    for (let y = 0; y < 40; y += 4) p.rect(0, y, 64, 1, 0x2e5c44);
    for (let x = 0; x < 64; x += 16) p.rect(x, 0, 1, 40, 0x5a8a72);
    for (let y = 0; y < 40; y += 16) p.rect(0, y, 64, 1, 0x5a8a72);
    p.noise(0.05);
    const mat = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), new THREE.MeshStandardMaterial({ map: p.texture(), roughness: 0.75 }));
    mat.rotation.x = -Math.PI / 2;
    mat.position.set(T.x - 0.25, T.h + 0.002, T.z + 0.05);
    mat.receiveShadow = true;
    this.bake(mat);
    this.sprop('desk_lamp', T.x + 0.68, T.h, T.z - 0.28, -Math.PI * 0.75, { fallbackSize: [0.2, 0.5, 0.3], fallbackColor: 0x334455 });

    // ---------------- steel racks back-left (shelf_steel: black angle frames, wooden boards)
    const rack = (x, z, w = 1.2, d = 0.45) => {
      this.mess.put('gm_rack', x, RACK_DY, z, { sx: w / 1.097, sy: RACK_SY, sz: d / 0.502, hang: true, overlapOk: true }); // (its feet in the slab)
      this.game.player.addObstacle(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
    };
    // the racks start empty: their shelves are attach points (ATTACH.surfaces)
    rack(-3.25, G.minZ + 0.3);
    rack(-1.85, G.minZ + 0.3);

    // ---------------- back-right: fridge + radio, the fan by the sink
    // (the fridge against the wall, Grandpa's radio-cassette on top of it; the extinguisher by the PC desk)
    const fs = propSize('fridge');
    this.sprop('fridge', 1.25, 0, G.minZ + fs.z / 2 + 0.02, 0, { fallbackSize: [0.5, 0.85, 0.5], player: true, phys: true });
    this.radio = this.prop('radio', 1.22, fs.y, G.minZ + fs.z / 2 + 0.04, -0.12, { fallbackSize: [0.5, 0.28, 0.16], fallbackColor: 0x444444 });
    this.sprop('extinguisher', 3.12, 0, G.minZ + 0.16, -0.2, { fallbackSize: [0.18, 0.5, 0.18] });

    // ---------------- PC desk (back-right corner, against the right wall)
    const D = { x: 3.62, z: -3.95, w: 0.7, d: 1.5, h: 0.74 };
    this.pcDesk = D;
    // the same grey steel desk, turned to face the room
    this.mess.put('gm_desk', D.x, 0, D.z, { ry: -Math.PI / 2, sx: D.d / 2.0, sy: D.h / 0.787, sz: D.w / 0.947 });
    const dtop = this.solid(D.w, 0.04, D.d, HIDDEN, D.x, D.h - 0.04, D.z, { material: 'metal', cast: false });
    dtop.userData.surface = true;
    this.game.player.addObstacle(D.x - D.w / 2, D.x + D.w / 2, D.z - D.d / 2, D.z + D.d / 2);
    this.sprop('pipe_chair', D.x - 0.72, 0, D.z + 0.05, Math.PI / 2 + 0.15, { fallbackSize: [0.45, 0.8, 0.45] });

    // ---------------- the heater by the table (Mikan's warm corner); the rest of the floor is yours to furnish
    this.sprop('heater', -0.95, 0, 1.55, 0.3, { fallbackSize: [0.45, 0.55, 0.45], player: true, phys: true });

    // ---------------- sell box & storage bin (by the PC)
    this.sellBox = this.makeCrate(3.55, -2.15, 0.5, 0.42, 0.42, 'sellBox');
    this.storageBox = this.makeBin(3.55, -2.78);
    // the delivery spot (a square of yellow floor tape near the shutter: GarageDetail.floor)
    this.deliverySpot = { x: 1.6, z: 4.1 };
  }

  makeCrate(x, z, w, h, d, label) {
    // an open cardboard box of odds and ends (junk_box) at the sell box's size, its paper label on the room side
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const box = propMesh('gm_junkbox');
    const s = propSize('gm_junkbox');
    box.scale.set(w / s.x, h / s.y, d / s.z);
    box.castShadow = true;
    g.add(box);
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.26), new THREE.MeshStandardMaterial({ map: posterTexture(label, 64, 50), roughness: 0.9 }));
    lab.rotation.y = -Math.PI / 2;
    lab.position.set(-w / 2 - 0.004, h * 0.5, 0);
    g.add(lab);
    this.add(g);
    this.game.player.addObstacle(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
    this.game.physics.addBox({ center: new THREE.Vector3(x, h / 2, z), half: new THREE.Vector3(w / 2, h / 2, d / 2), material: 'wood' });
    g.userData.top = h;
    return g;
  }

  makeBin(x, z) {
    // the storage bin (garage kit: a frosted tub with a blue lid), its paper label on the room side
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const w = 0.5, h = 0.38, d = 0.5;
    const bin = kitMesh('gk_bin');
    bin.castShadow = true;
    g.add(bin);
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.12), new THREE.MeshStandardMaterial({ map: posterTexture('storageLabel', 48, 26), roughness: 0.9 }));
    lab.rotation.y = -Math.PI / 2;
    lab.position.set(-0.249, h * 0.6, 0);
    g.add(lab);
    this.add(g);
    this.game.player.addObstacle(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
    this.game.physics.addBox({ center: new THREE.Vector3(x, h / 2, z), half: new THREE.Vector3(w / 2 + 0.015, h / 2 + 0.02, d / 2 + 0.015), material: 'wood' });
    g.userData.lid = bin;
    return g;
  }

  buildPosters() {
    // the walls start bare: posters, clocks and signs are bought and hung with the builder (ATTACH.walls); Grandpa's
    // own prints and notices are src/world/garageLayout.js and src/plugins/garageDressing.js
    this.buildGachaSign(GARAGE.minX + 0.14, 2.4, -0.6); // mounted proud of the steel column behind it
  }

  /** Lit "ガチャコーナー" light-box sign + a string of paper lanterns over the machine row. */
  buildGachaSign(x, y, z) {
    // 192 x 48 texels on the 1.6 x 0.4 m face (120 px/m); every line in a high-res pixel font on its own grid: the kana
    // in DotGothic16 and GACHA CORNER in Alagard, both at their native 16 px
    const p = new Pix(192, 48, 8);
    p.fill(0xfff4e0);
    p.rect(0, 0, 192, 4, 0xe5383b); p.rect(0, 44, 192, 4, 0xe5383b);
    p.text('ガチャガチャ', 96, 5, { size: 16, color: 0xe5383b, outline: 0xffffff, align: 'center' });
    p.text('GACHA CORNER', 96, 24, { font: FONT_EN, size: 16, color: 0x2a2220, align: 'center' });
    const t = p.texture();
    // the housing (garage kit), its back on the steel column, standoffs to the wall; the lit face recessed in its rim
    this.mess.put('gk_lightbox', x, y - 0.21, z, { ry: Math.PI / 2, hang: true, overlapOk: true });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.3, roughness: 0.6 }));
    face.rotation.y = Math.PI / 2;
    face.position.set(x + 0.086, y, z);
    this.bake(face);
    // paper lanterns (chochin models) on a cord tied under the beams over the machine row, lit from inside (unlit
    // material, bright enough to bloom softly)
    this.mess.put('gk_lanterns', 0, 0, 0, { hang: true, overlapOk: true });
    const lanternMat = new THREE.MeshBasicMaterial({ map: propMap('gm_chochin'), color: new THREE.Color(1.45, 1.38, 1.3) });
    const lh = 0.24, ls = lh / this.mess.h('gm_chochin');
    for (let i = 1; i < 8; i++) {
      const [px, py, pz] = LANTERN_PTS[i];
      this.mess.put('gm_chochin', px, py - 0.034 - lh, pz, { s: ls, ry: i * 0.7, mat: lanternMat, hang: true, overlapOk: true });
    }
    const pl = new THREE.PointLight(0xffa860, 1.6, 4, 1.6);
    pl.position.set(x + 0.6, 2.4, -0.6);
    this.game.scene.add(pl);
  }

  buildLights() {
    const G = GARAGE;
    const scene = this.game.scene;
    // warm sunset sun, low through the shutter and window
    const sun = new THREE.DirectionalLight(0xffd8a8, 3.0);
    sun.position.set(-5.5, 5.2, 14);
    sun.target.position.set(0.5, 0, 0);
    sun.castShadow = true;
    const sc = sun.shadow.camera;
    sc.left = -9; sc.right = 9; sc.top = 9; sc.bottom = -9; sc.near = 1; sc.far = 40;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    scene.add(sun, sun.target);
    this.game.renderer.registerShadowLight(sun, 1);
    this.lights.sun = sun;

    const hemi = new THREE.HemisphereLight(0xb9cfe8, 0x6b5a4a, 0.75);
    scene.add(hemi);
    this.lights.hemi = hemi;

    // fluorescent ceiling fixtures (twin-tube inverted-Fuji type; fix = the body, the click target for the dead tube).
    // They sit between the steel beams; tubes[1] (front) is the dead one in a new game.
    this.lights.tubes = [];
    for (const [x, z] of [[0, -2.0], [0, 0.8]]) {
      const top = G.height - 0.18;
      // the inverted-Fuji fixture (garage kit; the click target for the dead tube) and its two tubes
      const fix = kitMesh('gk_fluoro');
      fix.rotation.y = Math.PI / 2;
      fix.position.set(x, top, z).add(kitOrigin('gk_fluoro').applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2));
      this.add(fix);
      const tubeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xeef4ff).multiplyScalar(2.2), map: propMap('gk_tube') });
      for (const dx of [-0.034, 0.034]) this.mess.put('gk_tube', x + dx, top - 0.108, z, { ry: Math.PI / 2, mat: tubeMat, hang: true, overlapOk: true });
      // (a soft falloff, so the two fixtures light the whole room evenly like a cartoon interior; the light hangs a metre
      // under the ceiling, as if the fixture's reflector threw it down: 0.45 m under it, it blew the boards out to white)
      const pl = new THREE.PointLight(0xf0f2ff, 5.5, 9.5, 1.45);
      pl.position.set(x, G.height - 0.95, z);
      scene.add(pl);
      this.lights.tubes.push({ light: pl, mat: tubeMat, base: 5.5, fix });
    }

    // desk lamp spot over the work table
    const T = this.table;
    // (soft: at 9 it burnt anything pale on the table out to a glowing white card)
    const spot = new THREE.SpotLight(0xffd8a0, 4.2, 4.5, 0.8, 0.85, 1.4);
    spot.position.set(T.x + 0.55, T.h + 0.5, T.z - 0.25);
    spot.target.position.set(T.x - 0.1, T.h, T.z + 0.1);
    // (no shadow map of its own: the room light's shadowed key, src/gfx/roomGI.js, throws the table's shadows; one more
    // shadowed spot would cost every lit material a shadow sampler and a varying, which some GPUs don't have)
    spot.castShadow = false;
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

    // window light shafts + floor pools (additive volumes)
    const shaftMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uColor: { value: new THREE.Color(0xffdcb0) }, uTime: { value: 0 }, uStrength: { value: 0.13 } },
      vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv=uv; vW=(modelMatrix*vec4(position,1.)).xyz; gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.); }',
      fragmentShader: `uniform vec3 uColor; uniform float uTime, uStrength; varying vec2 vUv; varying vec3 vW;
        void main(){ float edge = smoothstep(0.0,0.25,vUv.x)*smoothstep(1.0,0.75,vUv.x);
          float along = smoothstep(0.0,0.15,vUv.y)*smoothstep(1.0,0.4,vUv.y);
          float flick = 0.9 + 0.1*sin(uTime*0.7 + vW.z*2.0);
          gl_FragColor = vec4(uColor * edge * along * uStrength * flick, 1.0); }`,
    });
    this.shaftMat = shaftMat;
    const w = this.window;
    const dir = sun.position.clone().sub(sun.target.position).normalize().negate();
    for (let i = 0; i < 2; i++) {
      const len = 4.2;
      const geo = new THREE.PlaneGeometry(0.75, len);
      geo.translate(0, -len / 2, 0);
      const shaft = new THREE.Mesh(geo, shaftMat);
      const start = new THREE.Vector3(G.minX + 0.02, (w.y0 + w.y1) / 2, w.z0 + 0.4 + i * 0.8);
      shaft.position.copy(start);
      shaft.lookAt(start.clone().add(new THREE.Vector3(0, 1, 0)));
      shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
      shaft.rotateY(Math.PI / 2 + i * 0.3);
      this.add(shaft);
    }
    // the big glow pool under the shutter
    const poolGeo = new THREE.PlaneGeometry(6, 3.2);
    const pool = new THREE.Mesh(poolGeo, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color(0xffcf98) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'uniform vec3 uColor; varying vec2 vUv; void main(){ float a = smoothstep(0.0,0.5,vUv.x)*smoothstep(1.0,0.5,vUv.x)*pow(vUv.y,1.6); gl_FragColor = vec4(uColor*a*0.12,1.0); }',
    }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(0, 0.004, G.maxZ - 1.6);
    this.add(pool);
    this.pool = pool;
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

  /** Roll the shutter: 0 = closed to the ground, 1 = open (tucked under the hood). */
  setShutter(k, instant = false) {
    void instant;
    if (Math.abs(k - this.shutterOpen) < 1e-4) return;
    this.shutterOpen = k;
    const G = GARAGE, top = G.height - 0.35, low = G.shutterY;
    const bottom = low * k, h = top - bottom;
    const m = this.shutterMesh;
    m.geometry.dispose();
    m.geometry = worldBox(6.0, h, 0.06);
    const F = this.shutterFace;
    if (F) { // the lowest h metres of the painted curtain (its bottom bar stays at the bottom)
      const pos = m.geometry.attributes.position, uv = m.geometry.attributes.uv;
      for (let i = 0; i < pos.count; i++) uv.setXY(i, ...F.uv(pos.getX(i), F.y0 + pos.getY(i) + h / 2));
      uv.needsUpdate = true;
    }
    m.position.y = bottom + h / 2;
    this.shutterBar.position.y = bottom + 0.03;
    this.shutterOb.enabled = k < 0.85;
    // daylight only pours in once it's up
    if (this.lights.bounce) this.lights.bounce.intensity = 2.0 * k;
    if (this.pool) this.pool.visible = k > 0.05;
    if (this.pool) this.pool.material.uniforms.uColor.value.setHex(0xffcf98).multiplyScalar(k);
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
    this.lightToggle.position.y = this.lightToggleBase.y + (on ? 0.012 : -0.012);
  }

  update(dt, t) {
    this.town?.update(dt, t);
    this.detail?.update(dt, t);
    if (this.shaftMat) this.shaftMat.uniforms.uTime.value = t;
    // door animation
    const d = this.door;
    const target = d.wantOpen ? 1 : 0;
    if (Math.abs(d.open - target) > 0.001) {
      d.open += (target - d.open) * Math.min(1, dt * 3);
      d.pivot.rotation.y = -d.open * 1.75;
    }
  }
}

