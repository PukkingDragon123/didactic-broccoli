// The town outside the garage: the lane at dusk, the shop facade and signboard, the neighbours' houses,
// the corner shop, utility poles, street dressing, the sky and skyline, and the street bounds.
import * as THREE from 'three';
import { worldPlane, pixMat, boxMesh, colMat } from '../gfx/geo.js';
import { Pix } from '../gfx/textures.js';
import { propMesh, hasProp } from './props.js';
import { hash2 } from '../core/util.js';
import { GARAGE } from './Garage.js';

export class Town {
  constructor(game, garage) {
    this.game = game;
    this.garage = garage;
    this.group = new THREE.Group();
    this.group.name = 'town';
    game.scene.add(this.group);
    this.build();
  }

  add(obj, parent = this.group) { parent.add(obj); return obj; }
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
    const G = GARAGE, scene = this.game.scene;
    // walk out onto the street; bounds keep you on the lane
    const P = this.game.player;
    P.addObstacle(-40, -25, G.maxZ, 30); P.addObstacle(25, 40, G.maxZ, 30);
    P.addObstacle(-40, 40, G.maxZ + 8.7, 30);
    P.addObstacle(-40, -4.1, G.maxZ - 0.1, G.maxZ + 0.5); P.addObstacle(4.1, 40, G.maxZ - 0.1, G.maxZ + 0.5);
    this.game.physics.addBox({ center: new THREE.Vector3(0, -0.5, G.maxZ + 5), half: new THREE.Vector3(40, 0.5, 6), material: 'concrete' });
    this.buildOutside();
    this.buildFacade();
    this.buildStreetLife();
    // outside: vending machine glow + street light
    const vend = new THREE.PointLight(0xdff0ff, 3.5, 6, 1.6);
    vend.position.set(0, 1.2, G.maxZ + 8.4);
    scene.add(vend);
    const street = new THREE.PointLight(0xffc880, 4, 9, 1.5);
    street.position.set(-2.4, 4.0, G.maxZ + 8.6);
    scene.add(street);
  }

  update(dt, t) { void dt; void t; }

  /** The lane beyond the shop: neighbours' houses and walls, a corner liquor shop, poles with sagging wires, lamps. */
  buildNeighbourhood() {
    const G = GARAGE, z = G.maxZ;
    const block = pixMat('blockHD', { roughness: 0.92, bump: 1, ppm: 64 });
    const wall = (x0, x1, zz, h = 1.4) => { const w = boxMesh(x1 - x0, h, 0.16, block); w.position.set((x0 + x1) / 2, h / 2, zz); this.add(w); };
    // garage side: walls with gates, houses behind
    for (const sx of [-1, 1]) {
      const a = 4.2 * sx;
      // a neighbour's tall side wall right next to the shop, then low block walls with gates
      const side = boxMesh(2.2, 3.4, 0.3, pixMat('houseWall', { roughness: 0.9 })); side.position.set(sx * 5.3, 1.7, z + 0.15); this.add(side);
      wall(sx > 0 ? 6.4 : -9.6, sx > 0 ? 9.6 : -6.4, z + 0.3);
      wall(sx > 0 ? 12.7 : -18.6, sx > 0 ? 18.6 : -12.7, z + 0.3);
      wall(sx > 0 ? 21.7 : -26, sx > 0 ? 26 : -21.7, z + 0.3);
      void a;
      for (const hx of [8, 15.6, 23.8]) this.prop('house_front', sx * hx, 0, z - 1.6, 0, { castShadow: false, receiveShadow: false, fallbackSize: [6, 6.5, 1] });
      for (const gx of [11.15, 20.15]) if (hasProp('gate_house')) this.prop('gate_house', sx * gx, 0, z + 0.3, 0, { castShadow: false });
    }
    // across the lane: more houses, walls and a corner liquor shop (酒屋) with vending machines
    for (const hx of [-21.5, -15.8, 10.4, 16.2, 22]) this.prop('house_front', hx, 0, z + 11.3, Math.PI, { castShadow: false, receiveShadow: false, fallbackSize: [6, 6.5, 1], scale: 0.9 + hash2(hx, 1) * 0.15 });
    this.buildCornerShop(-12.6, z + 9.2);
    // utility poles with three sagging wires per span
    const poles = [-19, -11.5, 2.6, 11, 19.5];
    for (const px of poles) if (Math.abs(px - 2.6) > 0.1) this.prop('utility_pole', px, 0, z + 9.4, 0, { castShadow: false, fallbackSize: [0.35, 8, 0.35] });
    const wireM = new THREE.MeshBasicMaterial({ color: 0x1a1618 });
    for (let i = 0; i < poles.length - 1; i++) {
      for (const [dy, dz] of [[7.4, 0.5], [7.4, -0.5], [6.6, 0]]) {
        const a = new THREE.Vector3(poles[i], dy, z + 9.4 + dz), b = new THREE.Vector3(poles[i + 1], dy, z + 9.4 + dz);
        const pts = [];
        for (let k = 0; k <= 16; k++) { const t = k / 16; const pt = a.clone().lerp(b, t); pt.y -= Math.sin(t * Math.PI) * 0.55; pts.push(pt); }
        this.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.012, 4), wireM));
      }
    }
    // a drop wire from the near pole to the shop roof
    { const a = new THREE.Vector3(2.6, 6.6, z + 9.4), b = new THREE.Vector3(2.0, 3.6, z + 0.3); const pts = []; for (let k = 0; k <= 12; k++) { const t = k / 12; const pt = a.clone().lerp(b, t); pt.y -= Math.sin(t * Math.PI) * 0.4; pts.push(pt); } this.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.01, 4), wireM)); }
    // more street lamps down the lane
    for (const [lx, lit] of [[-15, true], [9.5, false], [21, false]]) {
      this.prop('street_light', lx, 0, z + 9.4, Math.PI, { castShadow: false, fallbackSize: [0.3, 4.5, 0.3] });
      if (lit) { const l = new THREE.PointLight(0xffd8a0, 3.5, 9, 1.6); l.position.set(lx, 4.0, z + 8.6); this.add(l); }
    }
  }

  /** A tiny corner liquor/sundries shop across the lane: lit sign, striped awning, vending machines, crates. */
  buildCornerShop(x, zz) {
    const g = new THREE.Group();
    g.position.set(x, 0, zz);
    g.rotation.y = Math.PI;
    this.add(g);
    const facade = boxMesh(5.2, 3.4, 0.3, pixMat('houseWall', { roughness: 0.9, color: 0xd8ccb8 }));
    facade.position.set(0, 1.7, -0.2); g.add(facade);
    // glass shopfront glowing from inside
    const win = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.9), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffe2b0).multiplyScalar(1.1) }));
    win.position.set(-0.6, 1.05, -0.04); g.add(win);
    for (let i = 0; i <= 4; i++) { const m = boxMesh(0.05, 1.95, 0.06, colMat(0x6a6e72, { metalness: 0.6 })); m.position.set(-2.1 + i * 0.75, 1.05, -0.02); g.add(m); }
    // shelves silhouettes inside
    for (let i = 0; i < 3; i++) { const sh = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.05), new THREE.MeshBasicMaterial({ color: 0x8a6a4a })); sh.position.set(-0.6, 0.5 + i * 0.5, -0.035); g.add(sh); }
    // sign
    const p = new Pix(160, 32, 9);
    p.fill(0x1f3a7a); p.frame(1, 1, 158, 30, 0xffffff);
    p.text('さかや・たばこ', 80, 6, { size: 18, color: 0xffffff, align: 'center' });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 0.88), new THREE.MeshStandardMaterial({ map: p.texture(), emissive: 0xffffff, emissiveMap: p.texture(), emissiveIntensity: 0.35 }));
    sign.position.set(0, 2.75, -0.03); g.add(sign);
    // awning
    const aw = new Pix(32, 8, 2);
    for (let i = 0; i < 32; i++) for (let j = 0; j < 8; j++) aw.px(i, j, Math.floor(i / 4) % 2 ? 0xf2f0ea : 0x2f8a4a);
    const at = aw.texture(); at.wrapS = THREE.RepeatWrapping; at.repeat.set(3, 1);
    const awning = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 0.8), new THREE.MeshStandardMaterial({ map: at, roughness: 0.9, side: THREE.DoubleSide }));
    awning.position.set(0, 2.25, 0.3); awning.rotation.x = -Math.PI / 2 - 0.5; g.add(awning);
    const shopLight = new THREE.PointLight(0xffe0b0, 2.5, 6, 1.6); shopLight.position.set(-0.6, 1.4, 0.8); g.add(shopLight);
    // out front (local +z faces the lane after the rotation)
    const put = (id, lx, lz, rot = 0) => { if (!hasProp(id)) return; const m = propMesh(id, { castShadow: false }); m.position.set(lx, 0, lz); m.rotation.y = rot; g.add(m); };
    put('vending', 1.6, 0.25); put('vending', 2.55, 0.25);
    put('beercrate', -2.3, 0.3, 0.2); put('shop_bench', -1.0, 0.45);
    put('kakigori_flag', -2.4, 0.9, 0.4);
    this.game.player.addObstacle(x - 2.9, x + 2.9, zz - 0.4, zz + 1.0);
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
    const bw = boxMesh(60, 1.5, 0.15, pixMat('blockHD', { roughness: 0.92, bump: 1, ppm: 64 }));
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
    this.buildNeighbourhood();
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
