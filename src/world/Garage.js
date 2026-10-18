// The garage: architecture, outside street at dusk, lighting, clutter and fixed interactables.
import * as THREE from 'three';
import { worldBox, worldPlane, pixMat, boxMesh, colMat } from '../gfx/geo.js';
import { posterTexture, Pix } from '../gfx/textures.js';
import { propMesh, hasProp } from './props.js';
import { SHOP_ART } from '../gfx/shopArt.js';
import { hash2 } from '../core/util.js';

export const GARAGE = { minX: -4, maxX: 4, minZ: -5, maxZ: 5, height: 3.2, shutterY: 2.25, doorHalf: 0.6, doorH: 2.1 };

// Machine slots along the left wall (machine centre positions, facing +x)
export const MACHINE_SLOTS = [-0.2, 0.85, -1.25, 1.9, -2.3, -3.35].map((z) => ({ x: -3.42, z, rotY: Math.PI / 2 }));
// Collection shelves on the right wall (centre z), facing -x
export const SHELF_SLOTS = [-0.55, 1.25, 3.05].map((z) => ({ x: 3.93, z, rotY: -Math.PI / 2 }));

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
    const concrete = pixMat('floorHD', { roughness: 0.85, bump: 0.8, ppm: 64 });
    const block = pixMat('blockHD', { roughness: 0.92, bump: 1, ppm: 64 });
    const corr = pixMat('corrugatedHD', { roughness: 0.5, metalness: 0.35, bump: 1.5, ppm: 64 });
    const ply = pixMat('plywoodHD', { roughness: 0.75, bump: 0.6, ppm: 64 });
    const cwall = pixMat('concreteHD', { roughness: 0.92, bump: 1, ppm: 64 });

    // ------------------------------------------------------------ floor & ceiling
    const floor = this.solid(8.4, 0.2, 10.4, concrete, 0, -0.2, 0, { material: 'concrete', cast: false });
    floor.name = 'floor';
    floor.userData.surface = true;
    this.floor = floor;
    const ceil = boxMesh(8.4, 0.12, 10.4, pixMat('plywood', { roughness: 0.9, color: 0x9a8f80 }), { cast: false });
    ceil.position.set(0, H + 0.06, 0);
    this.add(ceil);
    // steel beams
    const beamMat = pixMat('steel', { roughness: 0.55, metalness: 0.5, color: 0x8a8f94 });
    for (const z of [-3.4, -0.6, 2.2]) {
      const b = boxMesh(8, 0.22, 0.12, beamMat);
      b.position.set(0, H - 0.11, z);
      this.add(b);
      const f1 = boxMesh(8, 0.03, 0.2, beamMat); f1.position.set(0, H - 0.21, z); this.add(f1);
    }

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
    // pegboard over the right wall near the front
    const peg = boxMesh(0.02, 0.9, 1.4, pixMat('pegboard', { roughness: 0.9 }));
    peg.position.set(G.maxX - 0.02, 1.55, 4.1);
    this.add(peg);
    this.buildTools(G.maxX - 0.04, 1.55, 4.1);

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
    const shutter = boxMesh(6.0, H - sh - 0.35, 0.06, pixMat('shutter', { roughness: 0.55, metalness: 0.45, bump: 2 }));
    shutter.position.set(0, sh + (H - sh - 0.35) / 2, G.maxZ + 0.05);
    this.add(shutter);
    const bar = boxMesh(6.0, 0.06, 0.1, colMat(0x5d625c, { metalness: 0.6, roughness: 0.4 }));
    bar.position.set(0, sh + 0.03, G.maxZ + 0.05);
    this.add(bar);
    const hood = boxMesh(6.4, 0.38, 0.4, pixMat('steel', { roughness: 0.6, metalness: 0.4 }));
    hood.position.set(0, H - 0.19, G.maxZ + 0.05);
    this.add(hood);
    // shutter rails
    for (const x of [-3.02, 3.02]) { const r = boxMesh(0.06, H, 0.12, colMat(0x6a706a, { metalness: 0.6 })); r.position.set(x, H / 2, G.maxZ + 0.05); this.add(r); }
    // the shutter is open: walk out onto the street. Bounds keep you on the lane.
    const P = this.game.player;
    P.addObstacle(-30, -11, G.maxZ, 30); P.addObstacle(11, 30, G.maxZ, 30);
    P.addObstacle(-30, 30, G.maxZ + 8.7, 30);
    P.addObstacle(-30, -4.1, G.maxZ - 0.1, G.maxZ + 0.4); P.addObstacle(4.1, 30, G.maxZ - 0.1, G.maxZ + 0.4);
    P.addObstacle(-4.3, -3.0, G.maxZ - 0.1, G.maxZ + 0.35); P.addObstacle(3.0, 4.3, G.maxZ - 0.1, G.maxZ + 0.35);
    this.game.physics.addBox({ center: new THREE.Vector3(0, -0.5, G.maxZ + 5), half: new THREE.Vector3(30, 0.5, 6), material: 'concrete' });

    this.buildOutside();
    this.buildFacade();
    this.buildStreetLife();
    this.buildFurniture();
    this.buildPosters();
    this.buildLights();
    this.buildDust();
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
    for (const [a, b, c, px, py, pz] of parts) { const m = boxMesh(a, b, c, frameMat); m.position.set(px, py + b / 2, pz); this.add(m); }
    // frosted wired glass (classic Japanese 網入りガラス)
    const p = new Pix(32, 32, 5);
    p.fill(0xdde6e6);
    for (let i = 0; i < 32; i += 6) { p.rect(i, 0, 1, 32, 0xb8c4c4); p.rect(0, i, 32, 1, 0xb8c4c4); }
    const gt = p.texture();
    const glassMat = new THREE.MeshStandardMaterial({ map: gt, roughness: 0.35, color: 0xfff4e4, emissive: 0xffc890, emissiveMap: gt, emissiveIntensity: 0.95, side: THREE.DoubleSide });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w.z1 - w.z0, w.y1 - w.y0), glassMat);
    glass.rotation.y = Math.PI / 2;
    glass.position.set(x - 0.01, cy, cz);
    this.add(glass);
    // sill with a little cactus & wind-chime
    const sill = boxMesh(0.16, 0.03, w.z1 - w.z0 + 0.1, pixMat('woodLight'));
    sill.position.set(x + 0.08, w.y0 - 0.015, cz);
    this.add(sill);
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
      const m = boxMesh(w, h, 0.12, frame); m.position.set(x, y + h / 2, G.minZ); this.add(m);
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
      m.position.set(x - 0.03, y + py, z + pz); m.rotation.x = rx; m.castShadow = true; this.add(m); return m;
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

  /** Quiet back-street dressing (from src/data/props/street2.js when present). */
  buildStreetLife() {
    const G = GARAGE, z = G.maxZ;
    const P = (id, x, zz, rot = 0, block = false) => {
      if (!hasProp(id)) return;
      this.prop(id, x, 0, zz, rot, { castShadow: false, player: block });
    };
    P('garbage_station', -7.6, z + 1.2, 0, true);
    P('recycle_cage', -9.4, z + 1.1, 0, true);
    P('kei_car', 7.6, z + 2.4, Math.PI / 2, true);
    P('mamachari', 5.2, z + 0.7, 0.2, true);
    P('scooter', -5.3, z + 0.8, -0.3, true);
    P('gate_house', -7.0, z + 8.3, Math.PI, true);
    P('gate_house', 7.4, z + 8.3, Math.PI, true);
    P('plant_pots', 3.3, z + 8.25, Math.PI, true);
    P('jizo_shrine', 9.8, z + 7.9, Math.PI, true);
    P('tomare_sign', -10.2, z + 4.0, Math.PI / 2, true);
    P('ac_unit', -4.7, z + 0.55, 0, true);
    P('power_box', 10.3, z + 0.6, 0, true);
    P('manhole', 1.8, z + 4.4, 0);
    P('drink_cans', -1.6, z + 7.6, 0);
    P('laundry_pole', 9.0, z + 0.6, 0, true);
  }

  /** The shop front as seen from the street (the main menu shot): cladding, signboard, eave, lanterns, sky. */
  buildFacade() {
    const G = GARAGE, H = G.height;
    const fz = G.maxZ + 0.21;
    // dusk sky dome all around (the street-side view looks back over the roof)
    const sky = new Pix(4, 64, 1);
    sky.gradient(0, 0, 4, 64, 0x1a1840, 0xf08a5a);
    sky.rect(0, 56, 4, 8, 0xffb070);
    const st = sky.texture({ nearest: false });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(70, 24, 12), new THREE.MeshBasicMaterial({ map: st, side: THREE.BackSide, fog: false, depthWrite: false }));
    dome.renderOrder = -10;
    this.add(dome);
    // corrugated cladding on the two front piers
    const clad = pixMat('corrugated', { roughness: 0.6, metalness: 0.35, color: 0x7aa6a0 });
    for (const sx of [-1, 1]) { const c = boxMesh(1.24, H + 0.4, 0.04, clad); c.position.set(sx * 3.6, (H + 0.4) / 2, fz); this.add(c); }
    // fascia + glowing shop signboard over the shutter
    const fascia = boxMesh(8.4, 1.1, 0.12, pixMat('woodDark', { roughness: 0.6 }));
    fascia.position.set(0, H + 0.5, fz + 0.02); this.add(fascia);
    const p = new Pix(240, 30, 3);
    p.fill(0xfff4e0); p.frame(0, 0, 240, 30, 0x2a2220); p.frame(2, 2, 236, 26, 0xe5383b);
    p.text('ガチャガレージ', 120, 4, { size: 20, color: 0xe5383b, align: 'center', outline: 0xffffff });
    p.circle(18, 15, 8, 0xff6f91); p.rect(10, 15, 17, 1, 0x2a2220); p.circle(222, 15, 8, 0x5cc4ff); p.rect(214, 15, 17, 1, 0x2a2220);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 0.75), new THREE.MeshStandardMaterial({ map: p.texture(), emissive: 0xffffff, emissiveMap: p.texture(), emissiveIntensity: 0.32, roughness: 0.5 }));
    sign.position.set(0, H + 0.5, fz + 0.09); this.add(sign);
    // tiled eave (庇) with a row of red lanterns
    const eave = boxMesh(8.8, 0.08, 0.9, pixMat('tile', { roughness: 0.7, color: 0x6a7480 }));
    eave.position.set(0, H + 1.1, fz + 0.4); eave.rotation.x = 0.18; this.add(eave);
    const lanternM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff5a3a).multiplyScalar(1.6) });
    const capM = colMat(0x1a1a1a);
    for (let i = 0; i < 6; i++) {
      const x = -3.9 + i * 1.56;
      if (Math.abs(x) < 0.5) continue;
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), lanternM); l.scale.y = 1.3; l.position.set(x, H - 0.3, fz + 0.55); this.add(l);
      for (const dy of [0.17, -0.17]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 10), capM); c.position.set(x, H - 0.3 + dy, fz + 0.55); this.add(c); }
    }
    const glow = new THREE.PointLight(0xff8a5a, 2.2, 6, 1.6); glow.position.set(0, H - 0.3, fz + 1.2); this.add(glow);
    // dagashiya-style things out front
    this.prop('gacha_twin', -2.95, 0, G.maxZ + 0.75, 0, { castShadow: false, fallbackSize: [0.9, 1, 0.4] });
    this.prop('shop_bench', 2.9, 0, G.maxZ + 0.62, 0, { castShadow: false, fallbackSize: [0.9, 0.5, 0.35] });
    this.prop('kakigori_flag', 4.15, 0, G.maxZ + 0.7, -0.3, { castShadow: false, fallbackSize: [0.4, 1.5, 0.2] });
    this.prop('tanuki_statue', -4.05, 0, G.maxZ + 0.7, 0.3, { castShadow: false, fallbackSize: [0.4, 0.5, 0.3] });
  }

  buildOutside() {
    const G = GARAGE;
    // apron + street
    const apron = boxMesh(8, 0.1, 1.2, pixMat('concrete'), { cast: false });
    apron.position.set(0, -0.05, G.maxZ + 0.7);
    this.add(apron);
    const road = new THREE.Mesh(worldPlane(80, 7), pixMat('asphaltLine', { roughness: 0.95, bump: 1 }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, -0.06, G.maxZ + 4.8);
    road.receiveShadow = true;
    this.add(road);
    const side = new THREE.Mesh(worldPlane(80, 1.6), pixMat('concrete', { roughness: 0.95, color: 0xb0a898 }));
    side.rotation.x = -Math.PI / 2;
    side.position.set(0, -0.02, G.maxZ + 9.0);
    side.receiveShadow = true;
    this.add(side);
    // gutter line (side ditch cover)
    const ditch = boxMesh(80, 0.05, 0.3, pixMat('steel', { color: 0x777777, metalness: 0.5 }));
    ditch.position.set(0, -0.05, G.maxZ + 1.45);
    this.add(ditch);
    // block wall across the street
    const bw = boxMesh(30, 1.5, 0.15, pixMat('blockHD', { roughness: 0.92, bump: 1, ppm: 64 }));
    bw.position.set(0, 0.75, G.maxZ + 9.9);
    this.add(bw);
    // house facades & skyline
    this.prop('house_front', -4.5, 0, G.maxZ + 11.2, Math.PI, { castShadow: false, fallbackSize: [6, 6.5, 1], fallbackColor: 0xcfc6b2, receiveShadow: false });
    this.prop('house_front', 4.2, 0, G.maxZ + 11.4, Math.PI, { castShadow: false, fallbackSize: [6, 6.5, 1], fallbackColor: 0xc6bca8, receiveShadow: false, scale: 0.95 });
    this.prop('vending', -0.6, 0, G.maxZ + 9.35, Math.PI, { castShadow: false, fallbackSize: [1, 1.85, 0.75], fallbackColor: 0xd84040 });
    this.prop('vending', 0.5, 0, G.maxZ + 9.35, Math.PI, { castShadow: false, fallbackSize: [1, 1.85, 0.75], fallbackColor: 0x4070d8 });
    this.prop('utility_pole', 2.6, 0, G.maxZ + 9.4, 0, { castShadow: false, fallbackSize: [0.35, 8, 0.35], fallbackColor: 0x9a968e });
    this.prop('street_light', -2.4, 0, G.maxZ + 9.4, Math.PI, { castShadow: false, fallbackSize: [0.3, 4.5, 0.3], fallbackColor: 0x777777 });
    this.prop('post_box', 1.5, 0, G.maxZ + 9.2, Math.PI, { castShadow: false, fallbackSize: [0.45, 1.3, 0.4], fallbackColor: 0xd82020 });
    this.prop('mirror_pole', -5.5, 0, G.maxZ + 1.6, Math.PI * 0.85, { castShadow: false, fallbackSize: [0.6, 3.2, 0.3] });
    this.prop('potted_row', 6.0, 0, G.maxZ + 1.0, Math.PI, { castShadow: false, fallbackSize: [1.2, 1, 0.4], fallbackColor: 0x6a8a4a });
    this.prop('hedge', -7.5, 0, G.maxZ + 1.0, 0, { castShadow: false, fallbackSize: [2, 1, 0.6], fallbackColor: 0x4a7a3a });
    this.prop('bicycle_parking', 5.2, 0, G.maxZ + 9.4, Math.PI, { castShadow: false, fallbackSize: [0.7, 2.6, 0.1] });
    // neighbouring walls left/right of the garage frontage
    for (const sx of [-1, 1]) {
      const nw = boxMesh(12, 3.6, 0.3, pixMat('houseWall', { roughness: 0.9 }));
      nw.position.set(sx * 10.2, 1.8, G.maxZ + 0.15);
      this.add(nw);
    }
    // sky backdrop
    const skyMat = new THREE.MeshBasicMaterial({ map: (() => { const t = posterlessSky(); return t; })(), fog: false });
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(140, 70), skyMat);
    sky.position.set(0, 18, G.maxZ + 55);
    sky.rotation.y = Math.PI;
    this.add(sky);
    // distant skyline silhouettes with lit windows
    const skyline = new THREE.Group();
    for (let i = 0; i < 26; i++) {
      const w = 3 + hash2(i, 1) * 5, h = 4 + hash2(i, 2) * 14;
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 3), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x3a2c44).lerp(new THREE.Color(0x6a4a5a), hash2(i, 3) * 0.5) }));
      b.position.set(-60 + i * 4.8 + hash2(i, 4) * 2, h / 2, G.maxZ + 30 + hash2(i, 5) * 8);
      skyline.add(b);
      // windows
      for (let k = 0; k < 4; k++) {
        if (hash2(i, 10 + k) < 0.5) continue;
        const wl = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.4), new THREE.MeshBasicMaterial({ color: 0xffd08a }));
        wl.position.set(b.position.x - w / 3 + hash2(i, 20 + k) * w * 0.6, 1 + hash2(i, 30 + k) * (h - 2), b.position.z - 1.51);
        wl.rotation.y = Math.PI;
        skyline.add(wl);
      }
    }
    this.add(skyline);
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
      this.add(l);
    }
    const apronM = boxMesh(T.w - 0.16, 0.08, 0.03, legMat); apronM.position.set(T.x, T.h - 0.1, T.z + T.d / 2 - 0.09); this.add(apronM);
    const apronB = boxMesh(T.w - 0.16, 0.08, 0.03, legMat); apronB.position.set(T.x, T.h - 0.1, T.z - T.d / 2 + 0.09); this.add(apronB);
    const shelfLow = boxMesh(T.w - 0.2, 0.025, T.d - 0.2, tableMat); shelfLow.position.set(T.x, 0.18, T.z); this.add(shelfLow);
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
    this.add(mat);
    this.prop('desk_lamp', T.x + 0.68, T.h, T.z - 0.28, -Math.PI * 0.75, { fallbackSize: [0.2, 0.5, 0.3], fallbackColor: 0x334455 });
    this.prop('manga_stack', T.x + 0.62, T.h, T.z + 0.22, 0.3, { fallbackSize: [0.3, 0.3, 0.22], scale: 0.7 });
    this.prop('stool', T.x - 0.3, 0, T.z + 0.85, 0.4, { fallbackSize: [0.35, 0.45, 0.35] });

    // ---------------- steel racks back-left
    const rackMat = pixMat('steel', { roughness: 0.5, metalness: 0.55, color: 0xb8bcc0 });
    const rack = (x, z, w = 1.2, d = 0.45, h = 1.9) => {
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const post = boxMesh(0.035, h, 0.035, rackMat);
        post.position.set(x + sx * (w / 2 - 0.02), h / 2, z + sz * (d / 2 - 0.02));
        this.add(post);
      }
      const levels = [0.08, 0.62, 1.16, 1.7];
      for (const y of levels) {
        const s = boxMesh(w, 0.025, d, rackMat);
        s.position.set(x, y, z);
        this.add(s);
      }
      this.game.player.addObstacle(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
      return levels;
    };
    const lv1 = rack(-3.25, G.minZ + 0.3);
    const lv2 = rack(-1.85, G.minZ + 0.3);
    const cb = pixMat('cardboard', { roughness: 0.95, bump: 1 });
    const box = (x, y, z, w, h, d, label = null, rot = 0) => {
      const b = boxMesh(w, h, d, cb);
      b.position.set(x, y + h / 2, z); b.rotation.y = rot;
      this.add(b);
      // packing tape
      const tape = boxMesh(w + 0.002, 0.002, 0.05, colMat(0xc8a878, { roughness: 0.4, extra: { transparent: true, opacity: 0.85 } }), { cast: false });
      tape.position.set(0, h / 2 + 0.001, 0);
      b.add(tape);
      if (label) {
        const lab = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w * 0.85, 0.36), Math.min(h * 0.7, 0.2)), new THREE.MeshStandardMaterial({ map: posterTexture(label, 72, 40), roughness: 0.9 }));
        lab.position.set(0, 0, d / 2 + 0.002);
        b.add(lab);
      }
      return b;
    };
    box(-3.55, lv1[0] + 0.012, G.minZ + 0.32, 0.5, 0.36, 0.4, 'mikanBox');
    box(-3.0, lv1[0] + 0.012, G.minZ + 0.3, 0.42, 0.42, 0.38, 'capsuleStock');
    box(-3.4, lv1[1] + 0.012, G.minZ + 0.3, 0.55, 0.3, 0.4, 'fragile');
    this.prop('toolbox', -2.95, lv1[1] + 0.012, G.minZ + 0.32, 0.1, { fallbackSize: [0.45, 0.22, 0.2], fallbackColor: 0xc82a2a });
    this.prop('crt_tv', -3.3, lv1[2] + 0.012, G.minZ + 0.3, 0.15, { fallbackSize: [0.5, 0.55, 0.45], scale: 0.85 });
    this.prop('helmet', -2.85, lv1[2] + 0.012, G.minZ + 0.32, -0.4, { fallbackSize: [0.26, 0.16, 0.3] });
    box(-3.4, lv1[3] + 0.012, G.minZ + 0.3, 0.45, 0.25, 0.38, null, 0.05);
    box(-2.95, lv1[3] + 0.012, G.minZ + 0.3, 0.32, 0.2, 0.3, 'mikanBox', -0.1);
    this.prop('capsule_crate', -2.05, lv2[0] + 0.012, G.minZ + 0.3, 0, { fallbackSize: [0.5, 0.35, 0.4] });
    this.prop('rice_sack', -1.5, lv2[0] + 0.012, G.minZ + 0.3, 0.1, { fallbackSize: [0.5, 0.4, 0.35] });
    box(-2.1, lv2[1] + 0.012, G.minZ + 0.3, 0.5, 0.4, 0.4, 'capsuleStock');
    this.prop('noodle_box', -1.55, lv2[1] + 0.012, G.minZ + 0.3, 0, { fallbackSize: [0.35, 0.35, 0.25] });
    this.prop('stove_kettle', -2.15, lv2[2] + 0.012, G.minZ + 0.3, 0.3, { fallbackSize: [0.35, 0.3, 0.3] });
    this.prop('shelf_figures', -1.6, lv2[2] + 0.012, G.minZ + 0.32, 0, { fallbackSize: [0.4, 0.15, 0.1] });
    box(-2.0, lv2[3] + 0.012, G.minZ + 0.3, 0.6, 0.18, 0.4, 'fragile');
    this.prop('daruma', -1.55, lv2[3] + 0.012, G.minZ + 0.32, 0.2, { fallbackSize: [0.16, 0.18, 0.15] });

    // ---------------- back-right: fridge + radio
    this.prop('fridge', 1.25, 0, G.minZ + 0.3, 0, { fallbackSize: [0.5, 0.85, 0.5], player: true, phys: true });
    this.radio = this.prop('radio', 1.25, 0.86, G.minZ + 0.3, -0.12, { fallbackSize: [0.5, 0.28, 0.16], fallbackColor: 0x444444 });
    this.prop('extinguisher', 0.82, 0, G.minZ + 0.14, 0, { fallbackSize: [0.18, 0.5, 0.18] });
    this.prop('manekineko', 1.05, 0.86, G.minZ + 0.38, 0.4, { fallbackSize: [0.15, 0.22, 0.13] });

    // ---------------- PC desk (back-right corner, against the right wall)
    const D = { x: 3.62, z: -3.95, w: 0.7, d: 1.5, h: 0.74 };
    this.pcDesk = D;
    const dtop = this.solid(D.w, 0.04, D.d, pixMat('woodLight', { roughness: 0.6 }), D.x, D.h - 0.04, D.z);
    dtop.userData.surface = true;
    const drawer = boxMesh(D.w - 0.04, D.h - 0.08, 0.42, pixMat('woodLight', { roughness: 0.7, color: 0xd8c8b0 }));
    drawer.position.set(D.x, (D.h - 0.08) / 2, D.z + D.d / 2 - 0.23);
    this.add(drawer);
    for (let i = 0; i < 3; i++) {
      const h = boxMesh(0.02, 0.015, 0.1, colMat(0xd0d0d0, { metalness: 0.9, roughness: 0.3 }));
      h.position.set(D.x - D.w / 2 + 0.005, 0.15 + i * 0.22, D.z + D.d / 2 - 0.23);
      this.add(h);
    }
    const legL = boxMesh(D.w - 0.04, D.h - 0.08, 0.04, pixMat('woodLight', { color: 0xd8c8b0 }));
    legL.position.set(D.x, (D.h - 0.08) / 2, D.z - D.d / 2 + 0.03);
    this.add(legL);
    this.game.player.addObstacle(D.x - D.w / 2, D.x + D.w / 2, D.z - D.d / 2, D.z + D.d / 2);
    this.prop('pipe_chair', D.x - 0.72, 0, D.z + 0.05, Math.PI / 2 + 0.15, { fallbackSize: [0.45, 0.8, 0.45] });

    // ---------------- right-front clutter & heater by the table
    this.prop('heater', -0.95, 0, 1.55, 0.3, { fallbackSize: [0.45, 0.55, 0.45], player: true, phys: true });
    this.cat = this.prop('garage_cat', -1.45, 0, 2.1, 0.9, { fallbackSize: [0.45, 0.3, 0.35], player: true });
    this.prop('beercrate', 3.0, 0, 4.55, 0.1, { fallbackSize: [0.45, 0.3, 0.35], phys: true, player: true });
    this.prop('beercrate', 3.0, 0.3, 4.55, -0.05, { fallbackSize: [0.45, 0.3, 0.35] });
    this.prop('polytank', 3.55, 0, 4.6, -0.3, { fallbackSize: [0.3, 0.45, 0.2], player: true });
    this.prop('ladder', 3.78, 0, 2.95, -Math.PI / 2, { fallbackSize: [0.5, 1.5, 0.6] });
    this.prop('broom', 3.85, 0, 3.45, 0.2, { fallbackSize: [0.3, 1.3, 0.1] });
    this.prop('fan', 2.2, 0, -4.55, -0.5, { fallbackSize: [0.4, 0.9, 0.35] });
    // left-front: bicycle, tyres, umbrella stand, cone
    this.prop('bicycle', -3.55, 0, 3.5, Math.PI / 2, { fallbackSize: [1.8, 1.0, 0.55], player: true });
    this.prop('tires', -2.65, 0, 4.5, 0.2, { fallbackSize: [0.6, 0.6, 0.6], player: true, phys: true });
    this.prop('umbrella_stand', -1.9, 0, 4.72, 0, { fallbackSize: [0.25, 0.9, 0.25] });
    this.prop('cone', -1.45, 0, 4.7, 0.4, { fallbackSize: [0.3, 0.7, 0.3] });
    this.prop('bucket', 2.4, 0, 4.7, 0, { fallbackSize: [0.3, 0.3, 0.3] });
    this.prop('watering_can', 2.05, 0, 4.75, -0.6, { fallbackSize: [0.35, 0.3, 0.15] });

    // ---------------- sell box & storage bin (by the PC)
    this.sellBox = this.makeCrate(3.55, -2.15, 0.5, 0.42, 0.42, 'sellBox');
    this.storageBox = this.makeBin(3.55, -2.78);
    // delivery spot marker (tape square on the floor near the shutter)
    const tapeM = colMat(0xffd23f, { roughness: 0.6 });
    const DS = { x: 1.6, z: 4.1 };
    this.deliverySpot = DS;
    for (const [w, d, x, z] of [[0.9, 0.05, 0, -0.45], [0.9, 0.05, 0, 0.45], [0.05, 0.9, -0.45, 0], [0.05, 0.9, 0.45, 0]]) {
      const t = boxMesh(w, 0.003, d, tapeM, { cast: false }); t.position.set(DS.x + x, 0.002, DS.z + z); this.add(t);
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
      this.add(g);
    };
    // back wall
    P('poster_showa', 0.0068, -1.3, 1.75, G.minZ + 0.01, 0, { tilt: 0.01 });
    P('calendar', 0.006, 1.7, 1.6, G.minZ + 0.01, 0);
    P('tin_genkin', 0.0058, 2.55, 1.9, G.minZ + 0.01, 0, { framed: false });
    P('tin_tanuki_katori', 0.0058, 3.2, 2.45, G.minZ + 0.01, 0, { framed: false, tilt: -0.02 });
    // right wall (facing -x)
    P('tin_milk_caramel', 0.0058, G.maxX - 0.01, 2.35, 2.2, -Math.PI / 2, { framed: false });
    P('tin_neko_shoyu', 0.0058, G.maxX - 0.01, 1.95, -2.4, -Math.PI / 2, { framed: false });
    // left wall (facing +x)
    P('tin_gacha_ramune', 0.0058, G.minX + 0.07, 2.0, -2.75, Math.PI / 2, { framed: false });
    P('tin_fuji_match', 0.0058, G.minX + 0.07, 2.0, -3.75, Math.PI / 2, { framed: false });
    this.buildGachaSign(G.minX + 0.08, 2.4, -0.6);
    P('menu_tags', 0.006, G.minX + 0.07, 2.25, 3.3, Math.PI / 2);
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
    this.add(box);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.45, roughness: 0.6 }));
    face.rotation.y = Math.PI / 2;
    face.position.set(x + 0.105, y, z);
    this.add(face);
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
    this.add(cord);
    for (let i = 1; i < 8; i++) {
      const pt = new THREE.CatmullRomCurve3(pts).getPoint(i / 8);
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), lanternMat);
      l.scale.y = 1.25;
      l.position.copy(pt).add(new THREE.Vector3(0, -0.12, 0));
      this.add(l);
      for (const dy of [0.085, -0.085]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 10), capMat); c.position.copy(l.position).add(new THREE.Vector3(0, dy, 0)); this.add(c); }
    }
    const pl = new THREE.PointLight(0xffa860, 1.6, 4, 1.6);
    pl.position.set(x + 0.6, 2.4, -0.6);
    this.game.scene.add(pl);
  }

  buildLights() {
    const G = GARAGE;
    const scene = this.game.scene;
    // warm sunset sun, low through the shutter and window
    const sun = new THREE.DirectionalLight(0xffa860, 3.2);
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

    const hemi = new THREE.HemisphereLight(0xffe2c4, 0x3a2a20, 0.55);
    scene.add(hemi);
    this.lights.hemi = hemi;

    // fluorescent ceiling fixtures
    this.lights.tubes = [];
    for (const [x, z] of [[0, -2.0], [0, 1.9]]) {
      const fix = boxMesh(0.18, 0.06, 1.3, colMat(0xe8e8e2, { roughness: 0.5 }), { cast: false });
      fix.position.set(x, G.height - 0.27, z);
      this.add(fix);
      const tubeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xeef4ff).multiplyScalar(2.2) });
      for (const dx of [-0.045, 0.045]) {
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.2, 8), tubeMat);
        tube.rotation.x = Math.PI / 2;
        tube.position.set(x + dx, G.height - 0.31, z);
        this.add(tube);
      }
      // hanging wires
      for (const dz of [-0.5, 0.5]) {
        const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.24, 4), colMat(0x222222));
        wire.position.set(x, G.height - 0.12, z + dz);
        this.add(wire);
      }
      const pl = new THREE.PointLight(0xe9f0ff, 5.5, 9, 1.6);
      pl.position.set(x, G.height - 0.45, z);
      scene.add(pl);
      this.lights.tubes.push({ light: pl, mat: tubeMat, base: 5.5 });
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
    const bounce = new THREE.PointLight(0xff9a5a, 2.0, 7, 1.8);
    bounce.position.set(0, 0.6, 4.2);
    scene.add(bounce);
    this.lights.bounce = bounce;

    // outside: vending machine glow + street light
    const vend = new THREE.PointLight(0xdff0ff, 3.5, 6, 1.6);
    vend.position.set(0, 1.2, G.maxZ + 8.4);
    scene.add(vend);
    const street = new THREE.PointLight(0xffc880, 4, 9, 1.5);
    street.position.set(-2.4, 4.0, G.maxZ + 8.6);
    scene.add(street);

    // window light shafts + floor pools (additive volumes)
    const shaftMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uColor: { value: new THREE.Color(0xffb070) }, uTime: { value: 0 }, uStrength: { value: 0.16 } },
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
      uniforms: { uColor: { value: new THREE.Color(0xff9a50) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'uniform vec3 uColor; varying vec2 vUv; void main(){ float a = smoothstep(0.0,0.5,vUv.x)*smoothstep(1.0,0.5,vUv.x)*pow(vUv.y,1.6); gl_FragColor = vec4(uColor*a*0.12,1.0); }',
    }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(0, 0.004, G.maxZ - 1.6);
    this.add(pool);
  }

  buildDust() {
    // floating dust motes catching the light
    const n = 380;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = -3.8 + Math.random() * 7.6;
      pos[i * 3 + 1] = 0.2 + Math.random() * 2.8;
      pos[i * 3 + 2] = -4.8 + Math.random() * 9.6;
      seed[i] = Math.random() * 100;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uPx: { value: window.innerHeight } },
      vertexShader: `attribute float seed; uniform float uTime, uPx; varying float vA;
        void main(){ vec3 p = position;
          p.x += sin(uTime*0.13 + seed)*0.25; p.y += sin(uTime*0.09 + seed*1.7)*0.18; p.z += cos(uTime*0.11 + seed*0.7)*0.25;
          vec4 mv = modelViewMatrix*vec4(p,1.);
          // brighter inside the sunlit front half
          float lit = smoothstep(-1.0, 3.5, p.z) * 0.8 + 0.2;
          vA = lit * (0.5 + 0.5*sin(uTime*0.8 + seed*3.0));
          gl_PointSize = uPx * 0.0045 / -mv.z; gl_Position = projectionMatrix*mv; }`,
      fragmentShader: 'varying float vA; void main(){ vec2 c = gl_PointCoord-0.5; if(dot(c,c)>0.25) discard; gl_FragColor = vec4(vec3(1.0,0.85,0.6)*vA*0.55,1.0); }',
    });
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    this.add(pts);
    this.dust = m;
  }

  /** Room lights on/off (light switch). */
  setLights(on) {
    this.lightsOn = on;
    for (const t of this.lights.tubes) {
      t.light.intensity = on ? t.base : 0;
      t.mat.color.setScalar(on ? 2.2 : 0.15);
    }
    this.lights.hemi.intensity = on ? 0.55 : 0.18;
    this.lightToggle.position.y = on ? 0.012 : -0.012;
  }

  update(dt, t) {
    if (this.shaftMat) this.shaftMat.uniforms.uTime.value = t;
    if (this.dust) this.dust.uniforms.uTime.value = t;
    // door animation
    const d = this.door;
    const target = d.wantOpen ? 1 : 0;
    if (Math.abs(d.open - target) > 0.001) {
      d.open += (target - d.open) * Math.min(1, dt * 3);
      d.pivot.rotation.y = -d.open * 1.75;
    }
    // breathing garage cat
    if (this.cat) this.cat.scale.y = 1 + Math.sin(t * 1.6) * 0.012;
  }
}

function posterlessSky() {
  const p = new Pix(64, 128, 61);
  p.gradient(0, 0, 64, 64, 0x2f3a7a, 0xd8846a);
  p.gradient(0, 64, 64, 40, 0xd8846a, 0xffc890);
  p.rect(0, 104, 64, 24, 0xffd8a0);
  const cloud = (cx, cy, w, c, c2) => {
    for (let i = 0; i < w; i++) {
      const hh = Math.round(Math.sin((i / w) * Math.PI) * 3 + Math.sin(i * 0.9) * 0.8) + 1;
      p.rect(cx + i, cy - hh, 1, hh, c); p.px(cx + i, cy, c2);
    }
  };
  cloud(2, 44, 20, 0xf0a080, 0xc8786a);
  cloud(30, 58, 26, 0xffb890, 0xe0907a);
  cloud(10, 80, 30, 0xffd8b0, 0xf2b08a);
  cloud(40, 90, 18, 0xffe0b8, 0xf2b890);
  p.speckle(0.006, [0xfff8e0], 255, 0, 0, 64, 28);
  p.circle(44, 98, 4, 0xffeab0);
  const t = p.texture();
  t.magFilter = THREE.NearestFilter;
  return t;
}
