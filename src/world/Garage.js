// The garage: architecture, outside street at dusk, lighting and fixed interactables. It starts nearly empty: the
// furniture and decor you buy are placed with the builder (src/build/) on the attach points below (ATTACH).
import * as THREE from 'three';
import { worldBox, worldPlane, pixMat, boxMesh, colMat } from '../gfx/geo.js';
import { posterTexture, Pix } from '../gfx/textures.js';
import { propMesh, hasProp } from './props.js';
import { SHOP_ART } from '../gfx/shopArt.js';
import { hash2 } from '../core/util.js';
import { Town } from './Town.js';
import { GarageDetail, garageBatches, bakeInto, placeProp, surfMat } from './GarageDetail.js';

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
    // the HD surfaces at their authored 64 px/m (worn slab, blocks, ribbed steel, plywood sheets, form concrete)
    const concrete = surfMat('garageSlab', { ppm: 64, roughness: 0.84, bump: 0.3, color: 0xd2cabe });
    const block = surfMat('blockHD', { ppm: 64, roughness: 0.92, bump: 0.5 });
    const corr = surfMat('corrugatedHD', { ppm: 64, roughness: 0.5, metalness: 0.35, bump: 0.7 });
    const ply = surfMat('plywoodHD', { ppm: 64, roughness: 0.75, bump: 0.3 });
    const cwall = surfMat('concreteHD', { ppm: 64, roughness: 0.92, bump: 0.5 });

    // ------------------------------------------------------------ floor & ceiling
    const floor = this.solid(8.4, 0.2, 10.4, concrete, 0, -0.2, 0, { material: 'concrete', cast: false });
    floor.name = 'floor';
    floor.userData.surface = true;
    this.floor = floor;
    // the roof casts shadows: low sun only gets in through the shutter and the window (no light through the roof boards)
    const ceil = boxMesh(8.4, 0.12, 10.4, surfMat('plywoodHD', { ppm: 64, roughness: 0.9, color: 0xb0a490, bump: 0.25 }), { cast: true });
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
    const shutter = new THREE.Mesh(new THREE.BufferGeometry(), pixMat('shutter', { roughness: 0.55, metalness: 0.45, bump: 2 }));
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
    const hood = boxMesh(6.4, 0.38, 0.4, pixMat('steel', { roughness: 0.6, metalness: 0.4 }));
    hood.position.set(0, H - 0.19, G.maxZ + 0.05);
    this.bake(hood);
    // shutter rails
    for (const x of [-3.02, 3.02]) { const r = boxMesh(0.06, H, 0.12, colMat(0x6a706a, { metalness: 0.6 })); r.position.set(x, H / 2, G.maxZ + 0.05); this.bake(r); }
    // the shop front piers (the street, the neighbourhood and the shop facade live in Town.js)
    const P = this.game.player;
    P.addObstacle(-4.3, -3.0, G.maxZ - 0.1, G.maxZ + 0.35); P.addObstacle(3.0, 4.3, G.maxZ - 0.1, G.maxZ + 0.35);
    this.town = new Town(this.game, this);
    this.buildFurniture();
    this.buildPosters();
    this.buildLights();
    this.buildDust();
    this.detail = new GarageDetail(this, G);
    this.SB.build(this.group, { cast: true });
    this.PB.build(this.group, true);
  }

  buildWindow(x, w) {
    const frameMat = colMat(0xb8bdb8, { metalness: 0.5, roughness: 0.4 });
    const fw = 0.04;
    const cz = (w.z0 + w.z1) / 2, cy = (w.y0 + w.y1) / 2;
    const parts = [
      [0.1, fw, w.z1 - w.z0, x, w.y0, cz], [0.1, fw, w.z1 - w.z0, x, w.y1 - fw, cz],
      [0.1, w.y1 - w.y0, fw, x, w.y0, w.z0 + fw / 2], [0.1, w.y1 - w.y0, fw, x, w.y0, w.z1 - fw / 2],
      [0.1, w.y1 - w.y0, fw * 0.8, x, w.y0, cz],
    ];
    for (const [a, b, c, px, py, pz] of parts) { const m = boxMesh(a, b, c, frameMat); m.position.set(px, py + b / 2, pz); this.bake(m); }
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
    // sill (the cactus, aloe and wind chime are in GarageDetail)
    const sill = boxMesh(0.17, 0.03, w.z1 - w.z0 + 0.12, pixMat('woodLight'));
    sill.position.set(x + 0.085, w.y0 - 0.015, cz);
    this.bake(sill);
  }

  buildDoor() {
    const G = GARAGE;
    // steel door (opens later when the museum is unlocked)
    const doorMat = pixMat('steelGreen', { roughness: 0.55, metalness: 0.35, color: 0xb8c8bc });
    const pivot = new THREE.Group();
    pivot.position.set(-G.doorHalf, 0, G.minZ + 0.02);
    const door = boxMesh(G.doorHalf * 2, G.doorH, 0.05, doorMat);
    door.position.set(G.doorHalf, G.doorH / 2, 0);
    pivot.add(door);
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.08, 12), colMat(0xd8d8d8, { metalness: 1, roughness: 0.25 }));
    knob.rotation.x = Math.PI / 2;
    knob.position.set(G.doorHalf * 2 - 0.1, 1.0, 0.05);
    pivot.add(knob);
    // "for rent" sign taped to the door
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.42), new THREE.MeshStandardMaterial({ map: posterTexture('museumSign', 64, 54), roughness: 0.9 }));
    sign.position.set(G.doorHalf, 1.45, 0.03);
    pivot.add(sign);
    this.add(pivot);
    this.door = { pivot, door, sign, open: 0 };
    this.doorObstacle = this.game.player.addObstacle(-G.doorHalf, G.doorHalf, G.minZ - 0.25, G.minZ + 0.05);
    const frame = colMat(0x4a4f4a, { metalness: 0.5, roughness: 0.5 });
    for (const [w, h, x, y] of [[0.06, G.doorH, -G.doorHalf - 0.03, 0], [0.06, G.doorH, G.doorHalf + 0.03, 0], [G.doorHalf * 2 + 0.12, 0.06, 0, G.doorH]]) {
      const m = boxMesh(w, h, 0.12, frame); m.position.set(x, y + h / 2, G.minZ); this.bake(m);
    }
    // light switch plate
    const sw = boxMesh(0.08, 0.12, 0.02, colMat(0xf2efe6, { roughness: 0.5 }));
    sw.position.set(G.doorHalf + 0.28, 1.2, G.minZ + 0.01);
    this.add(sw);
    const toggle = boxMesh(0.025, 0.04, 0.02, colMat(0xffffff, { roughness: 0.4 }));
    toggle.position.set(0, 0.012, 0.015);
    sw.add(toggle);
    this.lightSwitch = sw;
    this.lightToggle = toggle;
  }

  buildTools(x, y, z) {
    const steel = colMat(0xb8bec4, { metalness: 0.9, roughness: 0.35 });
    const red = colMat(0xc8352a, { roughness: 0.5 });
    const wood = colMat(0x9a6a3f, { roughness: 0.7 });
    const yellow = colMat(0xe8c22a, { roughness: 0.5 });
    const T = (geoArgs, mat, px, py, pz, rx = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(...geoArgs), mat);
      m.position.set(x - 0.03, y + py, z + pz); m.rotation.x = rx; m.castShadow = true; this.bake(m); return m;
    };
    // hammer
    T([0.02, 0.28, 0.025], wood, 0, 0.05, -0.5); T([0.03, 0.04, 0.11], steel, 0, 0.2, -0.5);
    // wrenches
    T([0.01, 0.24, 0.025], steel, 0, 0.05, -0.32); T([0.01, 0.04, 0.05], steel, 0, 0.18, -0.32);
    T([0.01, 0.2, 0.022], steel, 0, 0.03, -0.24); T([0.01, 0.035, 0.045], steel, 0, 0.14, -0.24);
    // screwdrivers
    for (let i = 0; i < 4; i++) { T([0.02, 0.09, 0.02], [red, yellow, red, yellow][i], 0, 0.22, -0.08 + i * 0.05); T([0.006, 0.12, 0.006], steel, 0, 0.11, -0.08 + i * 0.05); }
    // saw
    T([0.004, 0.12, 0.42], steel, 0, -0.2, 0.25); T([0.03, 0.1, 0.1], wood, 0, -0.2, 0.47);
    // tape measure + pliers
    T([0.04, 0.07, 0.07], yellow, 0, 0.12, 0.2);
    T([0.015, 0.16, 0.02], red, 0, 0.1, 0.36, 0.2); T([0.015, 0.16, 0.02], red, 0, 0.1, 0.4, -0.2);
  }

  buildFurniture() {
    const G = GARAGE;
    const tableMat = pixMat('woodTable', { roughness: 0.55 });
    const legMat = pixMat('woodDark', { roughness: 0.7 });
    // ---------------- work table (centre)
    const T = { x: 0.2, z: 0.1, w: 1.8, d: 0.9, h: 0.78 };
    this.table = T;
    const top = this.solid(T.w, 0.06, T.d, tableMat, T.x, T.h - 0.06, T.z, { material: 'wood' });
    top.userData.surface = true;
    this.tableTop = top;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const l = boxMesh(0.07, T.h - 0.06, 0.07, legMat);
      l.position.set(T.x + sx * (T.w / 2 - 0.08), (T.h - 0.06) / 2, T.z + sz * (T.d / 2 - 0.08));
      this.bake(l);
    }
    const apronM = boxMesh(T.w - 0.16, 0.08, 0.03, legMat); apronM.position.set(T.x, T.h - 0.1, T.z + T.d / 2 - 0.09); this.bake(apronM);
    const apronB = boxMesh(T.w - 0.16, 0.08, 0.03, legMat); apronB.position.set(T.x, T.h - 0.1, T.z - T.d / 2 + 0.09); this.bake(apronB);
    const shelfLow = boxMesh(T.w - 0.2, 0.025, T.d - 0.2, tableMat); shelfLow.position.set(T.x, 0.18, T.z); this.bake(shelfLow);
    this.game.player.addObstacle(T.x - T.w / 2, T.x + T.w / 2, T.z - T.d / 2, T.z + T.d / 2);
    // cutting mat
    const p = new Pix(64, 40, 9);
    p.fill(0x24503a);
    for (let x = 0; x < 64; x += 4) p.rect(x, 0, 1, 40, 0x2e5c44);
    for (let y = 0; y < 40; y += 4) p.rect(0, y, 64, 1, 0x2e5c44);
    for (let x = 0; x < 64; x += 16) p.rect(x, 0, 1, 40, 0x5a8a72);
    for (let y = 0; y < 40; y += 16) p.rect(0, y, 64, 1, 0x5a8a72);
    p.noise(0.05);
    const mat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.004, 0.5), new THREE.MeshStandardMaterial({ map: p.texture(), roughness: 0.75 }));
    mat.position.set(T.x - 0.25, T.h + 0.002, T.z + 0.05);
    mat.receiveShadow = true;
    this.bake(mat);
    this.sprop('desk_lamp', T.x + 0.68, T.h, T.z - 0.28, -Math.PI * 0.75, { fallbackSize: [0.2, 0.5, 0.3], fallbackColor: 0x334455 });
    // shadow under the table top on the low shelf
    const sh = boxMesh(T.w - 0.22, 0.002, T.d - 0.22, colMat(0x2a2420, { roughness: 1, extra: { transparent: true, opacity: 0.35, depthWrite: false } }), { cast: false });
    sh.position.set(T.x, 0.194, T.z);
    this.bake(sh);

    // ---------------- steel racks back-left
    const rackMat = pixMat('steel', { roughness: 0.5, metalness: 0.55, color: 0xb8bcc0 });
    const rack = (x, z, w = 1.2, d = 0.45, h = 1.9) => {
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const post = boxMesh(0.035, h, 0.035, rackMat);
        post.position.set(x + sx * (w / 2 - 0.02), h / 2, z + sz * (d / 2 - 0.02));
        this.bake(post);
        // plastic foot caps
        const foot = boxMesh(0.045, 0.02, 0.045, colMat(0x2a2a2a, { roughness: 0.8 }));
        foot.position.set(x + sx * (w / 2 - 0.02), 0.01, z + sz * (d / 2 - 0.02));
        this.bake(foot);
      }
      const levels = [0.08, 0.62, 1.16, 1.7];
      for (const y of levels) {
        const s = boxMesh(w, 0.025, d, rackMat);
        s.position.set(x, y, z);
        this.bake(s);
        // folded front lip of each shelf
        const lip = boxMesh(w, 0.04, 0.012, rackMat);
        lip.position.set(x, y - 0.008, z + d / 2 - 0.006);
        this.bake(lip);
      }
      // diagonal sway braces on the back
      for (const k of [-1, 1]) {
        const br = boxMesh(0.012, 1.6, 0.012, rackMat);
        br.position.set(x, 0.95, z - d / 2 + 0.01);
        br.rotation.z = k * 0.62;
        this.bake(br);
      }
      this.game.player.addObstacle(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
      return levels;
    };
    // the racks start empty: their shelves are attach points (ATTACH.surfaces)
    rack(-3.25, G.minZ + 0.3);
    rack(-1.85, G.minZ + 0.3);

    // ---------------- back-right: fridge + radio, the fan by the sink
    this.sprop('fridge', 1.25, 0, G.minZ + 0.3, 0, { fallbackSize: [0.5, 0.85, 0.5], player: true, phys: true });
    this.radio = this.prop('radio', 1.25, 0.86, G.minZ + 0.3, -0.12, { fallbackSize: [0.5, 0.28, 0.16], fallbackColor: 0x444444 });
    this.sprop('extinguisher', 0.82, 0, G.minZ + 0.14, 0, { fallbackSize: [0.18, 0.5, 0.18] });

    // ---------------- PC desk (back-right corner, against the right wall)
    const D = { x: 3.62, z: -3.95, w: 0.7, d: 1.5, h: 0.74 };
    this.pcDesk = D;
    const dtop = this.solid(D.w, 0.04, D.d, pixMat('woodLight', { roughness: 0.6 }), D.x, D.h - 0.04, D.z);
    dtop.userData.surface = true;
    const drawer = boxMesh(D.w - 0.04, D.h - 0.08, 0.42, pixMat('woodLight', { roughness: 0.7, color: 0xd8c8b0 }));
    drawer.position.set(D.x, (D.h - 0.08) / 2, D.z + D.d / 2 - 0.23);
    this.bake(drawer);
    for (let i = 0; i < 3; i++) {
      const h = boxMesh(0.02, 0.015, 0.1, colMat(0xd0d0d0, { metalness: 0.9, roughness: 0.3 }));
      h.position.set(D.x - D.w / 2 + 0.005, 0.15 + i * 0.22, D.z + D.d / 2 - 0.23);
      this.bake(h);
    }
    const legL = boxMesh(D.w - 0.04, D.h - 0.08, 0.04, pixMat('woodLight', { color: 0xd8c8b0 }));
    legL.position.set(D.x, (D.h - 0.08) / 2, D.z - D.d / 2 + 0.03);
    this.bake(legL);
    this.game.player.addObstacle(D.x - D.w / 2, D.x + D.w / 2, D.z - D.d / 2, D.z + D.d / 2);
    this.sprop('pipe_chair', D.x - 0.72, 0, D.z + 0.05, Math.PI / 2 + 0.15, { fallbackSize: [0.45, 0.8, 0.45] });

    // ---------------- the heater by the table (Mikan's warm corner); the rest of the floor is yours to furnish
    this.sprop('heater', -0.95, 0, 1.55, 0.3, { fallbackSize: [0.45, 0.55, 0.45], player: true, phys: true });

    // ---------------- sell box & storage bin (by the PC)
    this.sellBox = this.makeCrate(3.55, -2.15, 0.5, 0.42, 0.42, 'sellBox');
    this.storageBox = this.makeBin(3.55, -2.78);
    // delivery spot marker (tape square on the floor near the shutter)
    const tapeM = colMat(0xffd23f, { roughness: 0.6 });
    const DS = { x: 1.6, z: 4.1 };
    this.deliverySpot = DS;
    for (const [w, d, x, z] of [[0.9, 0.05, 0, -0.45], [0.9, 0.05, 0, 0.45], [0.05, 0.9, -0.45, 0], [0.05, 0.9, 0.45, 0]]) {
      const t = boxMesh(w, 0.003, d, tapeM, { cast: false }); t.position.set(DS.x + x, 0.002, DS.z + z); this.bake(t);
    }
  }

  makeCrate(x, z, w, h, d, label) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const cb = pixMat('cardboard', { roughness: 0.95 });
    const thick = 0.012;
    const parts = [[w, thick, d, 0, thick / 2, 0], [thick, h, d, -w / 2, h / 2, 0], [thick, h, d, w / 2, h / 2, 0], [w, h, thick, 0, h / 2, -d / 2], [w, h, thick, 0, h / 2, d / 2]];
    for (const [a, b, c, px, py, pz] of parts) { const m = boxMesh(a, b, c, cb); m.position.set(px, py, pz); g.add(m); }
    // open flaps
    const flap = (px, pz, ry, ww) => { const f = boxMesh(ww, 0.008, 0.18, cb); f.position.set(px, h + 0.04, pz); f.rotation.set(-0.9, ry, 0); g.add(f); return f; };
    flap(0, d / 2 + 0.06, 0, w); flap(0, -d / 2 - 0.06, Math.PI, w);
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.26), new THREE.MeshStandardMaterial({ map: posterTexture(label, 64, 50), roughness: 0.9 }));
    lab.rotation.y = -Math.PI / 2;
    lab.position.set(-w / 2 - 0.003, h * 0.55, 0);
    g.add(lab);
    this.add(g);
    this.game.player.addObstacle(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
    this.game.physics.addBox({ center: new THREE.Vector3(x, h / 2, z), half: new THREE.Vector3(w / 2, h / 2, d / 2), material: 'wood' });
    g.userData.top = h;
    return g;
  }

  makeBin(x, z) {
    // translucent plastic storage bin with a blue lid
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const w = 0.5, h = 0.38, d = 0.5;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshPhysicalMaterial({ color: 0xe8f0f4, transparent: true, opacity: 0.55, roughness: 0.3, clearcoat: 0.6 }));
    body.position.y = h / 2;
    g.add(body);
    const lid = boxMesh(w + 0.03, 0.04, d + 0.03, colMat(0x3f86e8, { roughness: 0.4 }));
    lid.position.y = h + 0.02;
    g.add(lid);
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.12), new THREE.MeshStandardMaterial({ map: posterTexture('storageLabel', 48, 26), roughness: 0.9 }));
    lab.rotation.y = -Math.PI / 2;
    lab.position.set(-w / 2 - 0.003, h * 0.62, 0);
    g.add(lab);
    // some blurry contents (colourful capsules) at the bottom
    for (let i = 0; i < 7; i++) {
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), colMat([0xff6f91, 0x5cc4ff, 0xffd23f, 0x58c06c][i % 4], { roughness: 0.3 }));
      c.position.set((hash2(i, 1) - 0.5) * 0.36, 0.04, (hash2(i, 2) - 0.5) * 0.36);
      g.add(c);
    }
    this.add(g);
    this.game.player.addObstacle(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
    this.game.physics.addBox({ center: new THREE.Vector3(x, h / 2, z), half: new THREE.Vector3(w / 2 + 0.015, h / 2 + 0.02, d / 2 + 0.015), material: 'wood' });
    g.userData.lid = lid;
    return g;
  }

  buildPosters() {
    const G = GARAGE;
    // framed 3D pieces (wooden or metal frame, glass front) and thick enamel tin plates
    const artTex = new Map();
    const tex = (id) => {
      if (!artTex.has(id)) { const a = SHOP_ART[id]; const p = new Pix(a.w, a.h, 4); a.paint(p); artTex.set(id, p.texture()); }
      return artTex.get(id);
    };
    const frameM = colMat(0x3a2418, { roughness: 0.5 });
    const glassM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0.05, clearcoat: 1, depthWrite: false });
    const P = (id, scale, x, y, z, ry, { framed = true, tilt = 0 } = {}) => {
      const a = SHOP_ART[id];
      if (!a) return;
      const w = a.w * scale, h = a.h * scale;
      const g = new THREE.Group();
      g.position.set(x, y, z); g.rotation.set(0, ry, tilt);
      const art = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.006), [frameM, frameM, frameM, frameM, new THREE.MeshStandardMaterial({ map: tex(id), roughness: framed ? 0.7 : 0.3, metalness: framed ? 0 : 0.15 }), frameM]);
      art.position.z = framed ? 0.012 : 0.004;
      art.castShadow = true;
      g.add(art);
      if (framed) {
        const t = 0.022;
        for (const [fw, fh, fx, fy] of [[w + 2 * t, t, 0, h / 2 + t / 2], [w + 2 * t, t, 0, -h / 2 - t / 2], [t, h, -w / 2 - t / 2, 0], [t, h, w / 2 + t / 2, 0]]) {
          const f = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.03), frameM); f.position.set(fx, fy, 0.015); f.castShadow = true; g.add(f);
        }
        const gl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glassM); gl.position.z = 0.0255; gl.userData.noRim = true; g.add(gl);
      }
      this.bake(g);
    };
    // the walls start bare: posters, clocks and signs are bought and hung with the builder (ATTACH.walls)
    void P;
    this.buildGachaSign(G.minX + 0.14, 2.4, -0.6); // mounted proud of the steel column behind it
  }

  /** Lit "ガチャコーナー" light-box sign + a string of paper lanterns over the machine row. */
  buildGachaSign(x, y, z) {
    const p = new Pix(160, 40, 8);
    p.fill(0xfff4e0);
    p.rect(0, 0, 160, 4, 0xe5383b); p.rect(0, 36, 160, 4, 0xe5383b);
    p.text('ガチャガチャ', 80, 6, { size: 20, color: 0xe5383b, outline: 0xffffff, align: 'center' });
    p.text('★ GACHA CORNER ★', 80, 26, { size: 9, color: 0x2a2220, align: 'center' });
    for (let i = 0; i < 6; i++) { const cx = 12 + i * 27.2; p.circle(Math.round(i % 2 ? 150 : 10), 20, 0, 0xffffff); void cx; }
    const t = p.texture();
    const box = boxMesh(0.1, 0.42, 1.65, colMat(0x2a2220, { roughness: 0.5 }));
    box.position.set(x + 0.05, y, z);
    this.bake(box);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.45, roughness: 0.6 }));
    face.rotation.y = Math.PI / 2;
    face.position.set(x + 0.105, y, z);
    this.bake(face);
    // paper lanterns strung along the wall
    const lanternMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffb070).multiplyScalar(1.5) });
    const capMat = colMat(0x2a2220);
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const zz = -3.6 + i * 0.75;
      const yy = 2.95 - Math.sin((i / 8) * Math.PI) * 0.22 - (i % 2) * 0.03;
      pts.push(new THREE.Vector3(x + 0.35, yy, zz));
    }
    const cord = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.004, 4), capMat);
    this.bake(cord);
    for (let i = 1; i < 8; i++) {
      const pt = new THREE.CatmullRomCurve3(pts).getPoint(i / 8);
      // blocky paper lantern: a fat middle, slimmer top and bottom tiers, black caps
      const l = new THREE.Group();
      l.position.copy(pt).add(new THREE.Vector3(0, -0.12, 0));
      for (const [w, h, y] of [[0.13, 0.1, 0], [0.105, 0.035, 0.065], [0.105, 0.035, -0.065]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), lanternMat); b.position.y = y; l.add(b); }
      for (const dy of [0.09, -0.09]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.06), capMat); c.position.y = dy; l.add(c); }
      l.rotation.y = i * 0.3;
      this.bake(l);
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
      const fix = boxMesh(0.24, 0.022, 1.3, colMat(0xf2f0ea, { roughness: 0.4 }), { cast: false });
      fix.position.set(x, top + 0.011, z);
      this.add(fix);
      const tubeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xeef4ff).multiplyScalar(2.2) });
      for (const dx of [-0.034, 0.034]) {
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.22, 8), tubeMat);
        tube.rotation.x = Math.PI / 2;
        tube.position.set(x + dx, top - 0.108, z);
        this.bake(tube);
      }
      // (a soft falloff, so the two fixtures light the whole room evenly like a cartoon interior; the light hangs a metre
      // under the ceiling, as if the fixture's reflector threw it down: 0.45 m under it, it blew the boards out to white)
      const pl = new THREE.PointLight(0xf0f2ff, 5.5, 9.5, 1.45);
      pl.position.set(x, G.height - 0.95, z);
      scene.add(pl);
      this.lights.tubes.push({ light: pl, mat: tubeMat, base: 5.5, fix });
    }

    // desk lamp spot over the work table
    const T = this.table;
    const spot = new THREE.SpotLight(0xffd8a0, 9, 4.5, 0.75, 0.55, 1.4);
    spot.position.set(T.x + 0.55, T.h + 0.5, T.z - 0.25);
    spot.target.position.set(T.x - 0.1, T.h, T.z + 0.1);
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
    this.lightToggle.position.y = on ? 0.012 : -0.012;
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

