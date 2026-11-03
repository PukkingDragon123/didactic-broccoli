// The shop annex: old Mr. Sugimoto's tobacco shop (NW3 on the lane, shutter down for good: src/world/Neighbours.js),
// bought through Ota Real Estate and turned into a second little gacha shop in tiny physical steps, like the garage's
// opening: clear out the junk (hold on each pile: it goes into a bag that ends up out front), sweep the dust and the
// cobwebs, bring the dead tubes back to life, paint the grimy walls strip by strip, then hang the new sign outside.
// Then six machine spots (src/growth/machines.js), the old tobacco counter as a display, and customers of its own
// (src/growth/crowd.js) in shop hours; while you're away its customers are simulated on the machines' records.
// The lane front is dressed with our own meshes over the old shutter (a FOR SALE board, the works, the new front):
// Town.js / Neighbours.js are untouched. The inside is only built once the shop is yours.
//   game.growth.annex = { zone, spots, crowd, step, open, build(), apply(), simulate(min) }   save: game.state.growth.annex
import * as THREE from 'three';
import { audio } from '../../core/audio.js';
import { bgm } from '../../core/bgm.js';
import { pixMat } from '../../gfx/geo.js';
import { propMesh } from '../../world/props.js';
import { Zone, Batch, V, pick, rnd, canvasMat, pixText, grain, sfx } from '../kit.js';
import { MachineSpots } from '../machines.js';
import { Crowd, NavGrid } from '../crowd.js';
import { ORIGINS, ANNEX_SLOTS } from '../data.js';

const LANE = { x: -18.0, z: 5.3 }; // the old shop's centre on the building line (NW3)
const DOOR = { x: -18.715, w: 2.53 }; // its shutter
const H = 2.7;
const STEPS = [
  { id: 'junk', name: 'Clear out the junk', sub: 'Hold LMB on each pile: it goes in a bag' },
  { id: 'dust', name: 'Sweep the dust and the cobwebs', sub: 'Hold LMB on the dust, the webs in the corners' },
  { id: 'tubes', name: 'Fix the lights', sub: 'Hold LMB on each dead tube' },
  { id: 'paint', name: 'Paint the walls', sub: 'Hold LMB on a wall: strip by strip' },
  { id: 'sign', name: 'Hang the new sign', sub: 'Outside: hold LMB on the sign board by the door' },
];
// the piles of junk: [x, z, [[prop, dx, dz, ry, scale], ...]]
const JUNK = [
  [-1.3, 1.5, [['cardboard_mess', 0, 0, 0.4, 1.4], ['junk_box', 0.3, -0.25, 0.3, 1.2]]],
  [-1.4, -0.4, [['rubbish_pile', 0, 0, 1.2, 1.5], ['newspaper_stack', 0.35, 0.25, 0.2, 1.2]]],
  [-0.3, -2.0, [['junk_box_open', 0, 0, 0.2, 1.3], ['junk_box', 0.45, 0.1, 0.5, 1.2], ['cardboard_bundle', -0.45, 0.05, -0.3, 1.1]]],
  [1.35, -1.6, [['tires', 0, 0, 0, 1.2], ['pipe_chair', -0.4, 0.3, 1.2, 1.0]]],
  [0.8, 0.6, [['newspaper_stack', 0, 0, 0.6, 1.3], ['junk_box', 0.3, -0.3, -0.4, 1.2]]],
  [1.75, -0.3, [['junk_box', 0, 0, -0.3, 1.3], ['cardboard_mess', -0.2, 0.35, 2.0, 0.9]]],
];
const DUST = [[-0.6, 1.2], [0.4, 1.6], [-1.2, 0.1], [0.2, -0.6], [-0.4, -1.4], [1.0, -0.9], [1.6, 0.9], [-1.7, -1.8]];
const WEBS = [[-2.4, -2.85, 0], [2.4, -2.85, -Math.PI / 2], [-2.4, 2.6, Math.PI / 2]];
const TUBES = [[-0.6, 1.1], [-0.6, -1.2]];
const WALLS = [['left', -2.45, 0, Math.PI / 2, 5.8], ['back', 0, -2.9, 0, 4.9], ['right', 2.45, 0, -Math.PI / 2, 5.8]];

export class Annex {
  constructor(game, growth) {
    this.game = game;
    this.G = growth;
    this.s = growth.s.annex;
    const t = this.s.tasks;
    t.junk ||= JUNK.map(() => false); t.dust ||= [...DUST, ...WEBS].map(() => false); t.tubes ||= [false, false, false, false]; t.paint ||= Array(12).fill(false);
    t.bagsOut ??= 0;
    this.zone = null;
    this.front();
    if (this.owned) this.build(); // (the inside is only built once it's yours)
    this.apply();
    game.events.on('levelUp', () => this.updateFront());
    game.events.on('growth', ({ id } = {}) => { if (id === 'annex' || id === 'mall') { if (this.owned) this.build(); this.apply(); } });
  }

  build() {
    if (this.zone) return this.zone;
    const game = this.game;
    const Z = this.zone = new Zone(game, {
      id: 'annex', name: 'Shop annex', origin: ORIGINS.annex, light: 'lamp', far: 34,
      spawn: [-0.7, 2.2, 0], exit: { x: DOOR.x, z: LANE.z + 0.9, yaw: Math.PI },
      lamp: { x: -0.6, y: 2.4, z: 1.1, color: 0xf4f8ff, intensity: 3.2 },
      lamp2: { x: -0.6, y: 2.4, z: -1.2, color: 0xf4f8ff, intensity: 3.2 },
      onEnter: () => this.onEnter(), onExit: () => this.onExit(), update: (dt) => this.tick(dt),
    });
    this.mats();
    this.shell();
    this.counter();
    this.junk();
    this.dust();
    this.tubes();
    this.checklist();
    Z.flush();
    this.spots = new MachineSpots(game, Z, { key: 'annex', slots: ANNEX_SLOTS, first: 7, label: 'annex machine spot' });
    this.nav = this.navGrid();
    this.crowd = new Crowd(game, Z, {
      nav: this.nav, max: 4, door: [-0.7, 2.5, Math.PI],
      spots: () => this.customerSpots(),
      rate: () => (this.isOpen() ? 0.05 + 0.08 * (game.sim?.footfall?.() ?? 1) * Math.min(1, this.spots.playable().length / 2) : 0),
    });
    return Z;
  }

  get owned() { return this.G.has('annex'); }
  get step() { return this.s.open ? STEPS.length : this.s.step; }
  get open() { return !!this.s.open; }
  /** Customers can come: renovated, in shop hours, and not closed by the bank. */
  isOpen() {
    const g = this.game, h = g.clock?.hours ?? 12, hr = g.sim?.hours || { open: 9, close: 21 };
    return this.open && h >= hr.open && h < hr.close && !this.G.closedByBank('annex');
  }

  mats() {
    const Z = this.zone, M = (m) => Z.mat(m);
    const tm = (k, o) => { const m = pixMat(k, o).clone(); m.vertexColors = true; return M(m); };
    this.M = {
      conc: tm('concrete', { roughness: 0.95, bump: 0.6 }), plaster: tm('plaster', { roughness: 0.95, bump: 0.5 }), wood: tm('woodDark', { roughness: 0.7 }), woodL: tm('woodLight', { roughness: 0.7 }),
      tile: tm('tile', { roughness: 0.5 }), ceil: tm('plaster', { roughness: 0.9, bump: 0.2 }),
      paint: M(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 })), metal: M(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.6 })),
      glow: new THREE.MeshBasicMaterial({ vertexColors: true }),
    };
    // wall strips: grimy and freshly painted
    this.dirty = M(new THREE.MeshStandardMaterial({ map: pixMat('plaster', {}).map, color: 0x8e8068, roughness: 0.95 }));
    this.clean = M(new THREE.MeshStandardMaterial({ map: pixMat('plaster', {}).map, color: 0xfff6e2, roughness: 0.9 }));
    this.tubeOn = new THREE.MeshBasicMaterial({ color: 0xf4faff });
    this.tubeOff = M(new THREE.MeshStandardMaterial({ color: 0x6a6e72, roughness: 0.4 }));
  }

  // ------------------------------------------------------------------ the room
  shell() {
    const Z = this.zone, B = Z.B, M = this.M, X0 = -2.45, X1 = 2.45, Z0 = -2.9, Z1 = 2.9, t = 0.15;
    this.dims = { X0, X1, Z0, Z1 };
    B.plane(M.conc, X1 - X0, Z1 - Z0, 0, 0, 0, { tint: 0xa8a090 });
    B.plane(M.ceil, X1 - X0, Z1 - Z0, 0, H, 0, { down: true, tint: 0xe8e0cc });
    for (let z = Z0 + 0.6; z < Z1; z += 0.9) B.box(M.wood, X1 - X0, 0.04, 0.05, 0, H - 0.04, z, { tint: 0x8a6a48 }); // ceiling battens
    // the painted walls are strips (12: 4 per wall) so the paint goes on bit by bit
    this.strips = [];
    WALLS.forEach(([id, cx, cz, ry, len], w) => {
      for (let k = 0; k < 4; k++) {
        const sl = len / 4, u = -len / 2 + (k + 0.5) * sl;
        const geo = new THREE.PlaneGeometry(sl, H - 0.3);
        const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sl / 2 + k * sl / 2, uv.getY(i) * (H - 0.3) / 2);
        const m = new THREE.Mesh(geo, this.dirty);
        const dx = Math.cos(ry) * u, dz = -Math.sin(ry) * u;
        m.position.copy(Z.L(cx + dx + Math.sin(ry) * 0.01, 0.15 + (H - 0.3) / 2, cz + dz + Math.cos(ry) * 0.01));
        m.rotation.y = ry;
        Z.group.add(m);
        this.strips[w * 4 + k] = m;
      }
    });
    // skirting and the wall shells behind
    for (const [id, cx, cz, ry, len] of WALLS) {
      B.box(M.wood, len, 0.15, 0.03, cx + Math.sin(ry) * 0.015, 0, cz + Math.cos(ry) * 0.015, { ry, tint: 0x4a3020 });
      B.box(M.wood, len, 0.15, 0.03, cx + Math.sin(ry) * 0.015, H - 0.15, cz + Math.cos(ry) * 0.015, { ry, tint: 0x6a4a30 });
      B.box(M.plaster, len + 0.3, H, t, cx - Math.sin(ry) * t / 2, 0, cz - Math.cos(ry) * t / 2, { ry, tint: 0x6a5a48 });
      void id;
    }
    // front wall: the shutter opening (x -1.98..0.55), the tobacco window (0.75..1.45), plain wall
    const o0 = -1.98, o1 = 0.55;
    B.box(M.plaster, o0 - X0 + t, H, t, (X0 - t + o0) / 2, 0, Z1 + t / 2, { tint: 0x8a7a64 });
    B.box(M.plaster, X1 - o1 + t, 0.8, t, (o1 + X1 + t) / 2, 0, Z1 + t / 2, { tint: 0x8a7a64 });
    B.box(M.plaster, X1 - 1.45 + t, H - 0.8, t, (1.45 + X1 + t) / 2, 0.8, Z1 + t / 2, { tint: 0x8a7a64 });
    B.box(M.plaster, 0.2, H - 0.8, t, 0.65, 0.8, Z1 + t / 2, { tint: 0x8a7a64 });
    B.box(M.plaster, 0.7, H - 1.85, t, 1.1, 1.85, Z1 + t / 2, { tint: 0x8a7a64 });
    B.box(M.plaster, o1 - o0, H - 2.1, t, (o0 + o1) / 2, 2.1, Z1 + t / 2, { tint: 0x8a7a64 });
    B.box(M.metal, o1 - o0 + 0.1, 0.06, 0.1, (o0 + o1) / 2, 2.08, Z1, { tint: 0x7a7e7a }); // shutter rail
    for (const x of [o0, o1]) B.box(M.metal, 0.06, 2.1, 0.1, x, 0, Z1, { tint: 0x7a7e7a });
    // the tobacco window from inside: sliding glass with the red plate above
    B.box(M.paint, 0.7, 0.08, 0.08, 1.1, 1.85, Z1 - 0.02, { tint: 0x8a3a2a });
    B.box(M.paint, 0.7, 0.03, 0.1, 1.1, 0.8, Z1 - 0.02, { tint: 0x9a9a92 });
    B.quad(M.paint, 0.66, 1.0, 1.1, 0.83, Z1 + 0.02, { ry: Math.PI, tint: 0xb8d0d8, k: 0.8 });
    // the back door to Mr. Sugimoto's old rooms (locked storage)
    B.box(M.wood, 0.85, 1.95, 0.05, 1.6, 0, Z0 + 0.03, { tint: 0x6a4a30 });
    B.box(M.metal, 0.05, 0.05, 0.06, 1.3, 0.95, Z0 + 0.07, { tint: 0xc8b048 });
    Z.hit(0.85, 1.95, 0.1, 1.6, 0.98, Z0 + 0.06, { reach: 2.2, hint: () => ({ key: '', text: 'Back rooms', sub: 'Mr. Sugimoto\'s old living rooms. Locked: his family\'s things are still in there' }), use: () => false });
    // the painted view out of the open shutter (the lane, the houses across it)
    this.view = canvasMat(128, 64, (x, w, h) => this.drawView(x, w, h), { glow: true });
    const vq = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), this.view);
    vq.position.copy(Z.L(-0.7, 2.1, Z1 + 2.6)); vq.rotation.y = Math.PI;
    Z.group.add(vq);
    B.plane(M.conc, 10, 2.6, -0.7, -0.02, Z1 + 1.3, { tint: 0x7a7468 }); // the pavement just outside
    // walls of the room (player) and the front wall pieces
    Z.block(X0 - 0.5, X0, Z0 - 0.5, Z1 + 0.5); Z.block(X1, X1 + 0.5, Z0 - 0.5, Z1 + 0.5); Z.block(X0 - 0.5, X1 + 0.5, Z0 - 0.5, Z0);
    Z.block(X0, o0, Z1, Z1 + 0.5); Z.block(o1, X1, Z1, Z1 + 0.5);
    this.exitLine = Z.block(o0, o1, Z1 + 0.35, Z1 + 0.6); // you leave through the door click, not by walking into the view
    // leave by the door
    Z.hit(o1 - o0, 2.1, 0.3, (o0 + o1) / 2, 1.05, Z1 + 0.2, { reach: 2.6, hint: () => ({ key: 'LMB', text: 'Go outside', sub: 'Back to the lane' }), use: () => { this.game.places.exit({ sound: 'slideDoor' }); return false; } });
    // lamps: two twin-tube fixtures (their tubes are in tubes())
    for (const [x, z] of TUBES) { B.box(M.metal, 1.3, 0.06, 0.26, x, H - 0.07, z, { tint: 0xd8dcd8 }); }
  }
  drawView(x, w, h) {
    const R = (c, a, b, ww, hh) => { x.fillStyle = c; x.fillRect(a, b, ww, hh); };
    R('#9ec4e2', 0, 0, w, 20); R('#b8d4ea', 0, 8, w, 12);
    // houses across the lane: Mr. Mori's, the Yabukis' overgrown one
    R('#c8c0b0', 0, 14, 40, 34); R('#8a909a', 0, 10, 42, 5); for (let i = 0; i < 3; i++) R('#3a4a5a', 4 + i * 12, 22, 8, 7);
    R('#b8a888', 44, 18, 46, 30); R('#6a5a48', 42, 14, 50, 5); R('#f4e8b0', 52, 26, 10, 8); R('#3a4a5a', 70, 26, 10, 8);
    R('#d8d0c0', 94, 12, 34, 36); R('#5a6a7a', 92, 8, 36, 5); R('#e8e0b8', 100, 20, 8, 10);
    R('#3a6a3a', 46, 40, 20, 8); R('#4a7a3a', 84, 38, 10, 10);
    R('#7a6a5a', 30, 4, 2, 44); R('#2a2a2a', 0, 6, w, 1); // a pole, its wire
    R('#bab4a8', 0, 48, w, 4); R('#4a4a50', 0, 52, w, 12); R('#e8e4d8', 0, 57, w, 1);
    grain(x, 0, 48, w, 16, ['#55555a', '#3e3e44'], 0.08, 4);
  }

  counter() {
    const Z = this.zone, B = Z.B, M = this.M, z1 = this.dims.Z1;
    // the old tobacco counter under the window, tiled front, and the cigarette shelves on the right wall
    B.box(M.tile, 1.4, 0.85, 0.6, 1.75, 0, z1 - 0.4, { tint: 0xc84a3a });
    B.box(M.woodL, 1.5, 0.05, 0.66, 1.75, 0.85, z1 - 0.4, { tint: 0xc8a070 });
    Z.prop('cash_register', 2.1, 0.9, z1 - 0.45, Math.PI + 0.3, 0.9);
    Z.block(1.05, 2.45, z1 - 0.72, z1);
    // an open shelf unit: back board, two sides, five shelves
    B.box(M.wood, 0.03, 2.0, 2.6, 2.43, 0, 0.1, { tint: 0x7a5230 });
    for (const z of [-1.2, 1.4]) B.box(M.wood, 0.32, 2.0, 0.04, 2.29, 0, z, { tint: 0x6a4428 });
    for (let i = 0; i < 5; i++) B.box(M.woodL, 0.3, 0.025, 2.56, 2.28, 0.35 + i * 0.38, 0.1, { tint: 0xb89068 });
    Z.block(2.12, 2.45, -1.2, 1.4);
    // after the renovation: figures on the counter and the shelves (the old stock's place)
    const disp = this.display = new THREE.Group();
    for (let i = 0; i < 4; i++) this.zone.prop('capsule_jar', 1.35 + i * 0.22, 0.9, z1 - 0.3, i * 0.4, 0.8, disp);
    for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) this.zone.prop(['shelf_figures', 'capsule_jar', 'manga_stack'][(r + i) % 3], 2.28, 0.37 + r * 0.38, -1.0 + i * 0.42, -Math.PI / 2, 0.55, disp);
    Z.group.add(disp);
    this.oldStock = new THREE.Group();
    for (let r = 0; r < 4; r++) for (let i = 0; i < 5; i++) this.zone.prop('mk_cigar_box', 2.28, 0.37 + r * 0.38, -0.9 + i * 0.5, -Math.PI / 2, 1, this.oldStock);
    Z.group.add(this.oldStock);
  }

  // ------------------------------------------------------------------ step 1: the junk
  junk() {
    const Z = this.zone;
    this.junkM = JUNK.map(([x, z, parts], i) => {
      // one pile = a few props in a group pivoting at the pile's centre (it shrinks into a bag)
      const m = new THREE.Group();
      m.position.copy(Z.L(x, 0, z));
      Z.group.add(m);
      for (const [id, dx, dz, ry, sc] of parts) { const p = Z.prop(id, x + dx, 0, z + dz, ry, sc, m); p.position.sub(m.position); }
      const b = Z.block(x - 0.45, x + 0.45, z - 0.4, z + 0.4);
      Z.hit(1.0, 0.9, 0.9, x, 0.45, z, {
        reach: 2.4,
        hint: () => (this.s.tasks.junk[i] ? null : this.step !== 0 ? { key: '', text: 'Junk', sub: 'Later' } : { key: 'Hold LMB', text: 'Bag up the junk', sub: `${this.count('junk')} / ${JUNK.length} piles cleared` }),
        use: () => this.step === 0 && !this.s.tasks.junk[i],
        hold: this.holdTask(() => this.step === 0 && !this.s.tasks.junk[i], 1.3, (k) => { m.scale.setScalar(1 - 0.6 * k); m.position.y = Math.sin(k * 30) * 0.01; }, () => this.clearJunk(i)),
      });
      return { m, b };
    });
  }
  clearJunk(i) {
    const J = this.junkM[i], g = this.game;
    this.s.tasks.junk[i] = true;
    J.m.visible = false;
    g.player.removeObstacle(J.b);
    g.effects.puff({ pos: J.m.position.clone().add(V(0, 0.3, 0)), count: 8, colors: [0xb8a890, 0x9a8a78], size: 0.07, up: 0.2, radius: 0.5 });
    sfx('junkBag', { vol: 0.7 });
    this.s.tasks.bagsOut++;
    this.updateFront();
    this.done('junk');
  }

  // ------------------------------------------------------------------ step 2: dust and cobwebs
  dust() {
    const Z = this.zone;
    const dm = canvasMat(32, 32, (x) => { for (let i = 0; i < 260; i++) { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * 15; x.fillStyle = pick(['#6a5e4e', '#7a6e5c', '#5a5042']); x.fillRect(16 + Math.cos(a) * r | 0, 16 + Math.sin(a) * r | 0, 1, 1); } }, { alpha: true });
    const mat = Z.mat(dm);
    this.dustM = [...DUST.map(([x, z]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), mat);
      m.rotation.x = -Math.PI / 2; m.rotation.z = rnd(0, 6);
      m.position.copy(Z.L(x, 0.012, z));
      Z.group.add(m);
      return m;
    }), ...WEBS.map(([x, z, ry]) => Z.prop('cobweb', x, H - 0.42, z, ry, 1))];
    this.dustM.forEach((m, i) => {
      const web = i >= DUST.length, p = this.zone.local(m.position);
      Z.hit(web ? 0.5 : 0.9, web ? 0.5 : 0.1, web ? 0.5 : 0.9, p.x, web ? H - 0.25 : 0.05, p.z, {
        reach: web ? 3.2 : 2.6,
        hint: () => (this.s.tasks.dust[i] || this.step !== 1 ? null : { key: 'Hold LMB', text: web ? 'Knock down the cobweb' : 'Sweep up the dust', sub: `${this.count('dust')} / ${this.s.tasks.dust.length} done` }),
        use: () => this.step === 1 && !this.s.tasks.dust[i],
        hold: this.holdTask(() => this.step === 1 && !this.s.tasks.dust[i], web ? 0.8 : 1.0, (k) => { m.scale.setScalar(1 - 0.7 * k); if (Math.random() < 0.2) sfx('sweep', { vol: 0.3 }); }, () => {
          this.s.tasks.dust[i] = true; m.visible = false;
          this.game.effects.puff({ pos: m.position.clone().add(V(0, web ? 0 : 0.1, 0)), count: 6, size: 0.05, up: 0.15, radius: 0.4 });
          this.done('dust');
        }),
      });
    });
    this.broom = Z.prop('broom', -2.25, 0, 2.3, 0.2, 1);
  }

  // ------------------------------------------------------------------ step 3: the lights
  tubes() {
    const Z = this.zone;
    this.tubeM = [];
    TUBES.forEach(([x, z], f) => {
      for (const dz of [-0.07, 0.07]) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.2, 6), this.tubeOff);
        m.rotation.z = Math.PI / 2;
        m.position.copy(Z.L(x, H - 0.1, z + dz));
        Z.group.add(m);
        this.tubeM.push(m);
      }
      Z.hit(1.3, 0.25, 0.4, x, H - 0.12, z, {
        reach: 3.4,
        hint: () => (this.step !== 2 ? null : this.fixtureDone(f) ? { key: '', text: 'Working', sub: '' } : { key: 'Hold LMB', text: 'Fit new tubes', sub: `${this.count('tubes')} / 4 tubes. Twist them into the holders` }),
        use: () => this.step === 2 && !this.fixtureDone(f),
        hold: this.holdTask(() => this.step === 2 && !this.fixtureDone(f), 1.4, (k) => { this.tubeM[f * 2 + (k < 0.5 ? 0 : 1)].rotation.x = k * 6; }, () => {
          this.s.tasks.tubes[f * 2] = this.s.tasks.tubes[f * 2 + 1] = true;
          sfx('tubeStart', { vol: 0.7 });
          this.flicker = { t: 0, f };
          this.done('tubes');
        }),
      });
    });
  }
  fixtureDone(f) { return this.s.tasks.tubes[f * 2] && this.s.tasks.tubes[f * 2 + 1]; }

  // ------------------------------------------------------------------ step 4: paint
  paintHits() {
    if (this.paintHit) return;
    this.paintHit = true;
    const Z = this.zone;
    WALLS.forEach(([id, cx, cz, ry, len], w) => {
      const deep = Math.abs(Math.sin(ry)) > 0.5;
      Z.hit(deep ? 0.2 : len, H - 0.3, deep ? len : 0.2, cx + Math.sin(ry) * 0.1, H / 2, cz + Math.cos(ry) * 0.1, {
        reach: 3.0,
        hint: () => (this.step !== 3 ? null : this.wallDone(w) ? { key: '', text: 'Painted', sub: `${id} wall` } : { key: 'Hold LMB', text: `Paint the ${id} wall`, sub: `${this.count('paint')} / 12 strips. Fresh cream emulsion` }),
        use: () => this.step === 3 && !this.wallDone(w),
        hold: {
          canStart: () => this.step === 3 && !this.wallDone(w),
          start: () => { this.painting = { w, t: 0 }; sfx('paintRoll', { vol: 0.5 }); },
          update: (dt) => this.paintStep(dt),
          done: () => !this.painting || this.wallDone(w),
          end: () => { this.painting = null; this.roller.visible = false; },
        },
      });
    });
    this.roller = propMesh('gr_roller', { castShadow: false });
    Z.convert(this.roller);
    this.roller.visible = false;
    Z.group.add(this.roller);
  }
  wallDone(w) { return [0, 1, 2, 3].every((k) => this.s.tasks.paint[w * 4 + k]); }
  paintStep(dt) {
    const P = this.painting;
    if (!P) return;
    P.t += dt;
    const k = [0, 1, 2, 3].find((q) => !this.s.tasks.paint[P.w * 4 + q]);
    if (k === undefined) { this.painting = null; return; }
    const strip = this.strips[P.w * 4 + k];
    // the roller goes up and down the strip
    const R = this.roller;
    R.visible = true;
    R.position.copy(strip.position).add(V(Math.sin(strip.rotation.y) * 0.08, -1.0 + Math.abs(Math.sin(P.t * 3.2)) * 1.4, Math.cos(strip.rotation.y) * 0.08));
    R.rotation.set(0, strip.rotation.y, 0);
    if (P.t >= 0.9) {
      P.t = 0;
      this.s.tasks.paint[P.w * 4 + k] = true;
      strip.material = this.clean;
      sfx('paintRoll', { vol: 0.5 });
      this.done('paint');
    }
  }

  // ------------------------------------------------------------------ progress
  count(id) { return this.s.tasks[id].filter(Boolean).length; }
  holdTask(can, dur, each, finish) {
    let t = 0, live = false;
    return {
      canStart: can,
      start: () => { t = 0; live = true; },
      update: (dt) => { if (!live) return; t += dt; each(Math.min(1, t / dur)); if (t >= dur) { live = false; finish(); } },
      done: () => !live,
      end: () => { if (live) { live = false; each(0); } },
    };
  }
  /** A task finished: when its whole step is done, on to the next one. */
  done(id) {
    const g = this.game;
    this.drawChecklist();
    g.save?.();
    if (!this.s.tasks[id].every(Boolean)) return;
    const i = STEPS.findIndex((s) => s.id === id);
    if (i !== this.s.step) return;
    this.s.step = i + 1;
    g.progress?.addXP(60, 'annex');
    try { audio.play('task', { vol: 0.6 }); } catch { /* */ }
    const next = STEPS[this.s.step];
    g.news?.(`${STEPS[i].name}: done!`, next ? `Next: ${next.name}` : '', 6000);
    g.events.emit('growth', { type: 'annexStep', id, step: this.s.step });
    this.apply();
  }

  checklist() {
    const Z = this.zone;
    this.note = canvasMat(64, 80, (x) => this.drawNote(x));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), Z.mat(this.note));
    m.position.copy(Z.L(-2.43, 1.5, 2.45)); m.rotation.y = Math.PI / 2;
    Z.group.add(m);
    Z.hit(0.05, 0.5, 0.4, -2.43, 1.5, 2.45, { reach: 2.6, hint: () => { const s = STEPS[this.step]; return s ? { key: '', text: `To do: ${s.name}`, sub: s.sub } : { key: '', text: 'Renovation list', sub: 'All done. The annex is open!' }; }, use: () => false });
  }
  drawNote(x) {
    x.fillStyle = '#f6e284'; x.fillRect(0, 0, 64, 80);
    grain(x, 0, 0, 64, 80, ['#ead47a', '#fbec9a'], 0.06, 9);
    x.fillStyle = 'rgba(214,196,150,.9)'; x.fillRect(20, 0, 24, 5);
    pixText(x, 'TO DO', 32, 6, { size: 10, align: 'center', color: '#c8322c', font: 'Alagard' });
    STEPS.forEach((s, i) => {
      const y = 20 + i * 11, done = i < this.step;
      x.fillStyle = '#241a1e'; x.fillRect(3, y + 2, 6, 6); x.fillStyle = '#f6e284'; x.fillRect(4, y + 3, 4, 4);
      if (done) { x.fillStyle = '#c8322c'; x.fillRect(4, y + 5, 2, 2); x.fillRect(6, y + 3, 2, 3); }
      const words = ['JUNK', 'SWEEP', 'LIGHTS', 'PAINT', 'SIGN'][i];
      pixText(x, words, 12, y, { size: 9, color: done ? '#8a7a5a' : i === this.step ? '#241a1e' : '#5e5046', font: 'Alagard' });
      if (done) { x.fillStyle = '#c8322c'; x.fillRect(12, y + 5, 44, 1); }
      if (i === this.step && this.s.tasks[s.id] && Array.isArray(this.s.tasks[s.id])) pixText(x, `${this.count(s.id)}/${this.s.tasks[s.id].length}`, 62, y, { size: 8, align: 'right', color: '#2f5a9a', font: 'DotGothic16' });
    });
  }
  drawChecklist() { this.note.userData.pix.redraw(); }

  /** Show / hide everything for the current state. */
  apply() {
    const t = this.s.tasks, st = this.step;
    if (!this.zone) { this.updateFront(); return; }
    this.junkM.forEach((J, i) => { J.m.visible = !t.junk[i]; if (t.junk[i]) this.game.player.removeObstacle(J.b); });
    this.dustM.forEach((m, i) => { m.visible = !t.dust[i]; });
    this.broom.visible = st === 1;
    this.tubeM.forEach((m, i) => { m.material = t.tubes[i] ? this.tubeOn : this.tubeOff; });
    this.strips.forEach((m, i) => { m.material = t.paint[i] ? this.clean : this.dirty; });
    if (st >= 3) this.paintHits();
    this.oldStock.visible = st < 1;
    this.display.visible = this.open;
    // the lamps: daylight from the door until the tubes work
    const D = this.zone.def, Z = this.zone;
    const lit = [this.fixtureDone(0), this.fixtureDone(1)];
    // before the tubes work: daylight through the open shutter (low, by the door), the back half in the gloom
    const l1 = lit[0] ? Z.L(-0.6, 2.4, 1.1) : Z.L(-0.6, 1.9, 2.3), l2 = lit[1] ? Z.L(-0.6, 2.4, -1.2) : Z.L(0.0, 2.0, -0.9);
    Object.assign(D.lamp, { x: l1.x, y: l1.y, z: l1.z, color: lit[0] ? 0xf4f8ff : 0xf0e4cc, intensity: lit[0] ? 3.2 : 3.6 });
    Object.assign(D.lamp2, { x: l2.x, y: l2.y, z: l2.z, color: lit[1] ? 0xf4f8ff : 0xc8bca8, intensity: lit[1] ? 3.2 : 2.2 });
    if (this.spots) { if (this.open && this.zone.inside) this.spots.ensureBuilt(); for (const mk of this.spots.markers) if (mk) mk.g.visible = this.open && !this.spots.at(this.spots.markers.indexOf(mk)); }
    this.drawChecklist();
    this.updateFront();
  }

  // ------------------------------------------------------------------ customers
  navGrid() {
    const { X0, X1, Z0, Z1 } = this.dims;
    const N = new NavGrid(X0, Z0, X1, Z1 + 0.6, 0.25);
    N.block(X0 - 1, -1.5, Z0 - 1, 2.0, 0); // the machines on the left wall
    N.block(X0 - 1, X1 + 1, Z0 - 1, -1.95, 0); // and at the back
    N.block(1.05, X1 + 1, Z1 - 0.72, Z1 + 1, 0.1); // the counter
    N.block(2.05, X1 + 1, -1.3, 1.5, 0.1); // the shelves
    N.block(X0 - 1, -1.98, Z1, Z1 + 1, 0); N.block(0.55, X1 + 1, Z1, Z1 + 1, 0);
    return N;
  }
  customerSpots() {
    const out = [];
    for (const m of this.spots.list) {
      const s = ANNEX_SLOTS[m.data.slot];
      const px = s[0] + Math.sin(s[2]) * 0.85, pz = s[1] + Math.cos(s[2]) * 0.85;
      out.push({ key: 'm' + m.data.slot, pos: { x: px, z: pz }, yaw: Math.atan2(s[0] - px, s[1] - pz), machine: m.canPlay() ? m : null });
    }
    out.push({ key: 'counter', pos: { x: 1.3, z: 1.75 }, yaw: 0, fake: true }, { key: 'shelf', pos: { x: 1.6, z: 0.2 }, yaw: Math.PI / 2, fake: true });
    return out.filter((s) => s.machine || s.fake);
  }

  /** Away from the annex: customers on the machines' records (Growth calls this with shop minutes). */
  simulate(minutes) {
    if (!this.zone || !this.isOpen() || this.zone.inside) return null;
    const r = this.spots.simulate(minutes, 1.8);
    this.s.customers = (this.s.customers || 0) + r.plays;
    return r;
  }

  // ------------------------------------------------------------------ per frame
  onEnter() {
    if (this.open) this.spots.ensureBuilt();
    this.apply();
    if (this.isOpen()) this.crowd.prefill(Math.min(2, this.spots.playable().length));
    const s = STEPS[this.step];
    if (s && s.id !== 'sign') this.game.tweens.wait(1.0, () => this.game.tip?.(`annex_${s.id}`, s.name, s.sub));
  }
  onExit() { this.crowd.clear(); this.painting = null; }
  tick(dt) {
    if (this.open) { this.spots.update(dt); this.crowd.update(dt, this.isOpen()); }
    const F = this.flicker;
    if (F) {
      F.t += dt;
      const on = F.t > 1.2 || Math.sin(F.t * 40) > 0.3;
      this.tubeM[F.f * 2].material = this.tubeM[F.f * 2 + 1].material = on ? this.tubeOn : this.tubeOff;
      if (F.t > 1.3) { this.flicker = null; this.apply(); }
    }
    const day = this.game.clock?.daylight?.() ?? 1, k = 0.35 + 0.65 * day;
    this.view.color.setRGB(k, k * (0.9 + 0.1 * day), k * (0.85 + 0.15 * day));
  }

  // ------------------------------------------------------------------ the front on the lane
  front() {
    const g = this.game, town = g.garage?.town;
    const grp = this.frontG = new THREE.Group();
    grp.name = 'annex:front';
    g.scene.add(grp);
    const zf = LANE.z + 0.09; // just in front of the old shutter and its posters
    const P = (rough = 0.7, metal = 0) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: metal });
    const pv = town?.P?.(0.75) || P(), metal = town?.P?.(0.4, 0.55) || P(0.4, 0.55);
    // FOR SALE: a board taped over the shutter
    this.saleG = new THREE.Group();
    const sale = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.86), canvasMat(40, 56, (x) => {
      x.fillStyle = '#fbf8f0'; x.fillRect(0, 0, 40, 56); x.fillStyle = '#d8282a'; x.fillRect(0, 0, 40, 2); x.fillRect(0, 54, 40, 2); x.fillRect(0, 0, 2, 56); x.fillRect(38, 0, 2, 56);
      pixText(x, '売物件', 20, 4, { size: 12, align: 'center', color: '#d8282a' });
      pixText(x, 'FOR SALE', 20, 20, { size: 8, align: 'center', color: '#1a1a1a', font: 'Alagard' });
      x.fillStyle = '#1f4a9a'; x.fillRect(4, 33, 32, 10);
      pixText(x, '太田不動産', 20, 33, { size: 8, align: 'center', color: '#fbf8f0' });
      pixText(x, '3-2711', 20, 45, { size: 8, align: 'center', color: '#1a1a1a', font: 'DotGothic16' });
    }));
    sale.position.set(DOOR.x + 0.3, 1.45, zf); this.saleG.add(sale);
    for (const [dx, dy] of [[-0.24, 0.42], [0.24, 0.42]]) { const tp = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.04), new THREE.MeshStandardMaterial({ color: 0xd6c496, roughness: 0.9 })); tp.position.set(DOOR.x + 0.3 + dx, 1.45 + dy, zf + 0.002); tp.rotation.z = dx > 0 ? -0.3 : 0.3; this.saleG.add(tp); }
    grp.add(this.saleG);
    // THE WORKS: the shutter rolled up (a dark doorway), a work lamp, bags of junk piling up outside
    const works = this.worksG = new THREE.Group();
    const B = new Batch();
    B.box(metal, DOOR.w + 0.06, 0.34, 0.36, DOOR.x, 2.12, LANE.z + 0.12, { tint: 0x8a8e8a }); // the rolled-up shutter in its box
    B.build(works);
    // the open doorway: a painting of the inside as it is right now (junk, a ladder, the walls as far as they're painted)
    this.holeMat = canvasMat(64, 44, (x) => this.drawHole(x), { glow: true });
    const hole = new THREE.Mesh(new THREE.PlaneGeometry(DOOR.w - 0.04, 1.72), this.holeMat);
    hole.position.set(DOOR.x, 0.4 + 0.86, zf); works.add(hole);
    grp.add(works);
    this.bags = [];
    for (let i = 0; i < JUNK.length; i++) {
      const b = propMesh(i % 2 ? 'trash_bag' : 'trash_bag_b', { castShadow: false });
      b.position.set(DOOR.x - 1.05 + (i % 3) * 0.36, 0, LANE.z + 0.35 + Math.floor(i / 3) * 0.3); b.rotation.y = i * 1.3;
      b.visible = false; grp.add(b); this.bags.push(b);
    }
    // the new sign, first leaning by the door (step 5), then up over the old one
    this.sign = canvasMat(128, 20, (x) => this.drawSign(x), { glow: true });
    this.signBoard = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.6, 0.08), [pv, pv, pv, pv, this.sign, pv]);
    grp.add(this.signBoard);
    // OPEN: glass sliding doors, a noren, two lanterns, a capsule-machine poster, the light inside
    const op = this.openG = new THREE.Group();
    const O = new Batch();
    for (const sx of [-0.62, 0.62]) {
      O.box(metal, 1.22, 0.05, 0.05, DOOR.x + sx, 0.4, zf, { tint: 0x9aa0a6 }); O.box(metal, 1.22, 0.05, 0.05, DOOR.x + sx, 2.0, zf, { tint: 0x9aa0a6 });
      for (const ex of [-0.6, 0.6]) O.box(metal, 0.05, 1.65, 0.05, DOOR.x + sx + ex, 0.4, zf, { tint: 0x9aa0a6 });
    }
    O.build(op);
    const inside = new THREE.Mesh(new THREE.PlaneGeometry(DOOR.w - 0.1, 1.6), canvasMat(64, 40, (x) => {
      x.fillStyle = '#e8e2d0'; x.fillRect(0, 0, 64, 40); x.fillStyle = '#b8b0a0'; x.fillRect(0, 30, 64, 10);
      for (let i = 0; i < 3; i++) { x.fillStyle = ['#d8322c', '#2f6ad8', '#f2c230'][i]; x.fillRect(4 + i * 12, 8, 9, 22); x.fillStyle = '#e8f4f6'; x.fillRect(5 + i * 12, 10, 7, 8); }
      x.fillStyle = '#c84a3a'; x.fillRect(46, 20, 16, 10);
    }, { glow: true }));
    inside.position.set(DOOR.x, 1.2, zf - 0.01); op.add(inside);
    this.insideMat = inside.material;
    const noren = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.55), canvasMat(48, 18, (x) => {
      x.fillStyle = '#1f3a7a'; x.fillRect(0, 0, 48, 18);
      for (const sx of [15, 31]) { x.fillStyle = '#132650'; x.fillRect(sx, 4, 1, 14); }
      pixText(x, 'ガチャ', 24, 3, { size: 10, align: 'center', color: '#f4f0e6' });
    }, { side: THREE.DoubleSide }));
    noren.position.set(DOOR.x, 1.75, zf + 0.12); op.add(noren);
    this.noren = noren;
    for (const sx of [-1.45, 1.45]) { const l = propMesh('chochin_stand', { castShadow: false }); l.position.set(DOOR.x + sx, 0, LANE.z + 0.35); l.scale.setScalar(0.8); op.add(l); }
    // an A-frame board on the pavement: what's in the machines today
    const board = canvasMat(28, 40, (x) => {
      x.fillStyle = '#2a3a2a'; x.fillRect(0, 0, 28, 40); x.fillStyle = '#8a6a48'; x.fillRect(0, 0, 28, 2); x.fillRect(0, 38, 28, 2); x.fillRect(0, 0, 2, 40); x.fillRect(26, 0, 2, 40);
      pixText(x, 'ガチャ', 14, 3, { size: 8, align: 'center', color: '#f4f0e6' });
      x.fillStyle = '#f4f0e6'; x.fillRect(8, 15, 12, 5); x.fillStyle = '#e5383b'; x.fillRect(8, 20, 12, 5); x.fillStyle = '#241a1e'; x.fillRect(7, 20, 14, 1);
      pixText(x, '2号店', 14, 27, { size: 8, align: 'center', color: '#ffd23f' });
    }, { side: THREE.DoubleSide });
    for (const s of [-1, 1]) { const q = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.62), board); q.position.set(DOOR.x - 0.95, 0.3, LANE.z + 0.85 + s * 0.09); q.rotation.order = 'YXZ'; q.rotation.set(-0.28, s > 0 ? 0 : Math.PI, 0); op.add(q); } // the two boards meet at the top
    grp.add(op);
    // the door: in (owned), or a look at the old place
    const hb = new THREE.Mesh(new THREE.BoxGeometry(DOOR.w, 2.0, 0.3), new THREE.MeshBasicMaterial({ visible: false }));
    hb.position.set(DOOR.x, 1.4, LANE.z + 0.15);
    g.scene.add(hb);
    g.interaction.add(hb, { reach: 2.6, hint: () => this.frontHint(), use: () => { if (this.owned) { this.build(); this.game.places.enter('annex', { sound: 'slideDoor' }); } return false; } });
    // step 5: the sign board, leaning against the wall by the door
    const sh = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 0.4), new THREE.MeshBasicMaterial({ visible: false }));
    sh.position.set(DOOR.x + 1.6, 0.35, LANE.z + 0.35);
    g.scene.add(sh);
    let t = 0, live = false;
    g.interaction.add(sh, {
      reach: 2.6,
      hint: () => (this.step === 4 ? { key: 'Hold LMB', text: 'Hang the new sign', sub: 'GACHA GARAGE annex. Up it goes' } : null),
      use: () => this.step === 4,
      hold: {
        canStart: () => this.step === 4,
        start: () => { t = 0; live = true; },
        update: (dt) => { if (!live) return; t += dt; this.signLift = Math.min(1, t / 1.6); this.placeSign(); if (t >= 1.6) { live = false; this.hangSign(); } },
        done: () => !live,
        end: () => { if (live) { live = false; this.signLift = 0; this.placeSign(); } },
      },
    });
    this.signLift = 0;
  }
  drawHole(x) {
    const t = this.s.tasks, R = (c, a, b, w, h) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
    const painted = t.paint.filter(Boolean).length / 12;
    R(painted > 0.5 ? '#e8dcc0' : '#8a7c66', 0, 0, 64, 30); // the back wall
    if (painted > 0 && painted <= 0.5) R('#e8dcc0', 0, 0, Math.round(64 * painted * 2), 30);
    R('#6a6458', 0, 30, 64, 14); R('#5a544a', 0, 30, 64, 1); // the floor
    R('#3a2a20', 44, 4, 14, 26); R('#2a1e16', 46, 6, 10, 24); // the back door
    const junk = t.junk.filter((j) => !j).length;
    for (let i = 0; i < junk; i++) { R(['#a07848', '#8a6a40', '#6a6a62'][i % 3], 4 + i * 9, 24 - (i % 2) * 4, 8, 12 + (i % 2) * 4); R('#5a4630', 4 + i * 9, 24 - (i % 2) * 4, 8, 1); }
    if (this.step >= 2) { for (const lx of [24, 32]) R('#c8b048', lx, 6, 1, 32); for (let y = 10; y < 38; y += 5) R('#c8b048', 24, y, 9, 1); } // a stepladder
    if (this.step >= 3) { R('#f4f0e6', 36, 34, 4, 5); R('#2a5aa8', 36, 34, 4, 1); R('#f4f0e6', 41, 35, 4, 4); } // paint tins
    R('#f4f8ff', 18, 0, 20, 2); // the tube light (dark until it works)
    if (t.tubes.filter(Boolean).length < 2) R('#4a4a48', 18, 0, 20, 2);
  }
  drawSign(x) {
    x.fillStyle = '#fbf6e8'; x.fillRect(0, 0, 128, 20);
    x.fillStyle = '#d8322c'; x.fillRect(0, 0, 128, 2); x.fillRect(0, 18, 128, 2);
    pixText(x, 'ガチャガレージ', 6, 3, { size: 12, color: '#d8322c' });
    x.fillStyle = '#241a1e'; x.fillRect(88, 3, 34, 14);
    pixText(x, '2号店', 105, 4, { size: 10, align: 'center', color: '#ffd23f' });
  }
  placeSign() {
    const S = this.signBoard, k = this.signLift;
    if (this.open) { S.position.set(-18.2, 3.12, LANE.z + 0.1); S.rotation.set(0, 0, 0); S.visible = true; return; }
    S.visible = this.owned && this.step >= 4;
    const k2 = k * k * (3 - 2 * k);
    S.position.set(DOOR.x + 1.6 + (-18.2 - DOOR.x - 1.6) * k2, 0.42 + (3.12 - 0.42) * k2, LANE.z + 0.32 - 0.22 * k2);
    S.rotation.set(-0.25 * (1 - k2), 0, 0);
    S.scale.setScalar(k < 0.01 ? 0.5 : 0.5 + 0.5 * k2);
  }
  hangSign() {
    const g = this.game;
    this.s.open = true;
    this.s.step = STEPS.length;
    this.signLift = 1;
    try { audio.play('thud', { vol: 0.6 }); } catch { /* */ }
    try { bgm.stinger('jingle_open'); } catch { /* no music */ }
    g.effects.confetti?.({ pos: V(DOOR.x, 2.6, LANE.z + 0.6), count: 50, radius: 0.6 });
    g.progress?.addXP(250, 'annex');
    this.G.give('gr_annex_open');
    g.news?.('GACHA GARAGE annex is open!', 'Order machines for its six spots (click a taped square inside)', 8000);
    g.events.emit('growth', { type: 'annexOpen' });
    this.apply();
    g.save?.();
  }
  frontHint() {
    if (this.owned) {
      if (this.open) return { key: 'LMB', text: 'GACHA GARAGE annex', sub: this.G.closedByBank('annex') ? 'Closed by the bank: pay your overdue bills' : this.isOpen() ? 'Open' : 'Closed (shop hours)' };
      const s = STEPS[this.step];
      return { key: 'LMB', text: 'Your annex (the old tobacco shop)', sub: s ? `Renovation: ${s.name.toLowerCase()}` : '' };
    }
    if (this.G.status('annex').state === 'available') return { key: '', text: 'The old tobacco shop', sub: 'For sale: Ota Real Estate (on the computer, or ring Mrs. Ota\'s bell)' };
    return null;
  }
  updateFront() {
    if (!this.frontG) return;
    const owned = this.owned, avail = this.G.status('annex').state === 'available';
    this.saleG.visible = !owned && avail;
    this.worksG.visible = owned && !this.open;
    this.openG.visible = owned && this.open;
    if (owned && !this.open) this.holeMat.userData.pix.redraw();
    const nb = owned && !this.open && this.step <= 1 ? this.s.tasks.bagsOut : 0;
    this.bags.forEach((b, i) => { b.visible = i < nb; });
    this.placeSign();
  }
  /** The front at night: the sign and the shop light up while it's open. */
  updateLane(dt) {
    if (!this.frontG) return;
    this.laneT = (this.laneT || 0) - dt;
    if (this.laneT > 0) return;
    this.laneT = 0.5;
    const on = this.isOpen(), night = 1 - (this.game.clock?.daylight?.() ?? 1);
    const k = on ? 0.85 + 0.35 * night : 0.45;
    this.sign.color?.setRGB(k, k, k);
    this.insideMat.color?.setRGB(on ? 1 : 0.35, on ? 0.98 : 0.33, on ? 0.92 : 0.3);
    this.noren.visible = on;
    const tL = this.s.tasks.tubes.filter(Boolean).length / 4, hk = 0.38 + 0.5 * tL;
    this.holeMat.color.setRGB(hk, hk * 0.96, hk * 0.9);
  }
}
export { STEPS as ANNEX_STEPS };
