// GACHA KAIKAN (ガチャ会館): the flagship, a capsule-toy department store in the old building by Morio Station (bought
// from Ota Real Estate's site, src/growth/data.js 'mall'; floors 2-4 fitted out later). Four floors, each its own zone
// off the map (only the floor you're on exists), joined by criss-crossing escalators (step on: you ride up or down with
// the steps moving under you, and arrive on the next floor) and a lift (src/growth/mall/Elevator.js). Walls and islands
// of route machines (instanced; their operator pays you a commission every day), eight machine spots of your own per
// floor (ordinary GachaMachines: restock and empty their coin boxes by hand; cartons from the stock room on 1F), bright
// tiles, neon, and crowds (src/growth/crowd.js, with a level of detail by distance). While you're elsewhere the floors'
// customers are simulated on the machines' records. You get there through the east underpass ("toward the station").
//   game.growth.mall = { zones[1..4], spots[1..4], elevator, floorsOpen, cur, build(), ensureFloor(n), swapTo(n), ride,
//                        startRide(gap, 'up' | 'down'), simulate(min) }     save: game.state.growth.mall / .machines
import * as THREE from 'three';
import { audio } from '../../core/audio.js';
import { bgm } from '../../core/bgm.js';
import { playSong } from '../../room/sfx.js';
import { propGeometry } from '../../world/props.js';
import { capsuleCost } from '../../game/economy.js';
import { SERIES_BY_ID } from '../../data/series/index.js';
import { Zone, V, canvasMat, pixText, grain, goTo, sfx, brightVoxel, bright } from '../kit.js';
import { IKit, imats, photoNorm } from '../../places/ikit.js';
import { MachineSpots } from '../machines.js';
import { Crowd, NavGrid } from '../crowd.js';
import { slip } from '../paper.js';
import { ORIGINS, yen } from '../data.js';
import { X0, X1, Z0, Z1, FH, CH, FLOORS, FLAT, RUN, PATH, GAPS, LIFT, MALL_SLOTS, STACK_WALLS, ISLANDS, THEMES, CENTRE_Z, SPEED, stepY, pathZ, minusHoles } from './layout.js';
import { buildEscalators, ceilingWell } from './Escalator.js';
import { Elevator } from './Elevator.js';

const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'];
const RIDE_SPEED = SPEED; // the same speed as the steps (layout.js)

// the far version of a route-machine module: a box, its front painted like the voxel model (1 texel = 1 voxel)
const STACK_COLS = { red: [0xd8322c, 0xf4f0e6], blue: [0x2f6ad8, 0xf2c230], yellow: [0xf2c230, 0xd8322c], pink: [0xe86aa8, 0xf4f0e6], green: [0x3a9a5a, 0xf4f0e6], black: [0x26262c, 0xd4a83a] };
let farGeoC = null;
function farGeo() {
  if (!farGeoC) { farGeoC = new THREE.BoxGeometry(0.92, 2.0, 0.44); farGeoC.translate(0, 1.0, 0); }
  return farGeoC;
}
const farCache = {};
function farMats(c) {
  if (farCache[c]) return farCache[c];
  const [body, trim] = STACK_COLS[c] || STACK_COLS.red;
  const hex = (v) => '#' + v.toString(16).padStart(6, '0');
  const cv = document.createElement('canvas'); cv.width = 37; cv.height = 80;
  const x = cv.getContext('2d');
  const R = (col, a, b, w, h) => { x.fillStyle = col; x.fillRect(a, 79 - (b + h - 1), w, h); }; // voxel coordinates, y up
  R('#2a2a30', 0, 0, 37, 4);
  const caps = ['#e5383b', '#3a7ad8', '#f2c230', '#5ab060', '#e86aa8', '#f08a3a', '#8a5bd6', '#f4f0e6'];
  for (const cx of [9, 27]) for (const y0 of [4, 40]) {
    R(hex(body), cx - 8, y0, 17, 34); R(hex(trim), cx - 8, y0 + 34, 17, 2);
    R('#e8f4f6', cx - 6, y0 + 17, 13, 15);
    for (let yy = y0 + 18; yy <= y0 + 26; yy += 2) for (let xx = cx - 5; xx <= cx + 4; xx += 2) R(caps[(xx * 7 + yy * 3) % caps.length], xx + ((yy >> 1) % 2), yy, 1, 1);
    for (let i = 0; i < 13; i++) R((i + y0) % 4 === 0 ? caps[(cx + y0) % 7] : '#fbf8f2', cx - 6 + i, y0 + 12, 1, 5);
    R('#c8ccd2', cx - 4, y0 + 5, 9, 6); R('#e8ecf0', cx - 2, y0 + 7, 5, 3); R('#1a1a1a', cx - 3, y0 + 1, 7, 3);
  }
  R(hex(trim), 0, 76, 37, 4);
  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.colorSpace = THREE.SRGBColorSpace;
  const side = bright(new THREE.MeshStandardMaterial({ color: body, roughness: 0.45 }));
  const front = bright(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 }));
  const top = bright(new THREE.MeshStandardMaterial({ color: trim, roughness: 0.4 }));
  farCache[c] = [side, side, top, side, front, side];
  return farCache[c];
}

export class Mall {
  constructor(game, growth) {
    this.game = game;
    this.G = growth;
    this.s = growth.s.mall;
    this.zones = {};
    this.spots = {};
    this.crowds = {};
    this.navs = {};
    this.esc = {};
    this.stackSpots = {};
    this.rideBlocks = {};
    this.elevator = new Elevator(this);
    this.built = false;
    // the four floors are only built once the building is yours (a moment's work, hidden behind the contract)
    if (this.owned) this.build();
    this.laneEntry();
    game.events.on('newDay', () => this.payout());
    game.events.on('growth', ({ id } = {}) => { if (id === 'mall') this.build(); this.refresh(); });
    this.refresh();
  }
  /** The ground floor now, the floors above one at a time in the background (or at once when you go up). */
  build() {
    if (this.built) return;
    this.built = true;
    const t0 = performance.now();
    this.ensureFloor(1);
    this.buildMs = Math.round(performance.now() - t0);
    const later = (fn) => (window.requestIdleCallback ? window.requestIdleCallback(fn, { timeout: 4000 }) : setTimeout(fn, 600));
    const next = () => { const n = [2, 3, 4].find((k) => !this.zones[k]); if (n) { this.ensureFloor(n); later(next); } };
    later(next);
    this.refresh();
  }
  ensureFloor(n) {
    if (!this.zones[n]) this.buildFloor(n);
    return this.zones[n];
  }

  get owned() { return this.G.has('mall'); }
  get floorsOpen() { return this.owned ? Math.max(1, this.s.floors || 1) : 0; }
  /** The floor zone you're in (or null). */
  get cur() { const w = this.game.places?.where; return w && w.startsWith('mall') ? this.zones[+w.slice(4)] : null; }
  get curN() { const w = this.game.places?.where; return w && w.startsWith('mall') ? +w.slice(4) : 0; }
  floorName(k) { return THEMES[k].name; }
  isOpen() {
    const g = this.game, h = g.clock?.hours ?? 12, hr = g.sim?.hours || { open: 9, close: 21 };
    return this.owned && h >= hr.open && h < Math.max(hr.close, 21) && !this.G.closedByBank('mall');
  }

  // ------------------------------------------------------------------ building one floor
  buildFloor(n) {
    const T = THEMES[n];
    const Z = this.zones[n] = new Zone(this.game, {
      id: 'mall' + n, name: `Gacha Kaikan ${n}F`, origin: ORIGINS['mall' + n], light: 'bright', far: 46,
      spawn: n === 1 ? [0, 7.6, 0] : [GAPS[n - 1].down, pathZ(GAPS[n - 1], PATH) + GAPS[n - 1].dir * 0.8, GAPS[n - 1].dir > 0 ? Math.PI : 0],
      exit: this.exitSpot(),
      onEnter: () => this.onEnter(n), onExit: () => this.onExit(n), update: (dt) => this.tick(n, dt),
    });
    const B = Z.B;
    // surfaces from the photo library: vinyl cloth walls, 30 cm vinyl checker tiles in the floor's colour, 60 cm acoustic
    // ceiling tiles, brushed steel; the light fittings, the walls' skirting and band are modelled (src/places/ikit.js)
    const paint = Z.mat(photoNorm('canvas_cloth', { rough: 0.86 }));
    const metal = Z.mat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.65 }));
    const glow = new THREE.MeshBasicMaterial({ vertexColors: true });
    const floor = Z.mat(photoNorm('tile_checker_floor', { rough: 0.48 }));
    const ceil = Z.mat(photoNorm('tile_white', { rough: 0.86, metres: 2.4 }));
    this.mats = { paint, metal, glow };
    const K = new IKit(imats(bright)), F = K.at(Z.o.x, 0, Z.o.z, 0), FT = new THREE.Color(T.a).lerp(new THREE.Color(T.b), 0.55);
    const below = n > 1 ? GAPS[n - 1].well : null, above = n < FLOORS ? GAPS[n].well : null;
    // floor (with the well of the escalators from below), ceiling (with the well to the floor above)
    for (const r of minusHoles({ x0: X0, x1: X1, z0: Z0, z1: Z1 }, below ? [below] : [])) B.plane(floor, r.x1 - r.x0, r.z1 - r.z0, (r.x0 + r.x1) / 2, 0, (r.z0 + r.z1) / 2, { tint: FT });
    for (const r of minusHoles({ x0: X0, x1: X1, z0: Z0, z1: Z1 }, above ? [above] : [])) B.plane(ceil, r.x1 - r.x0, r.z1 - r.z0, (r.x0 + r.x1) / 2, CH, (r.z0 + r.z1) / 2, { down: true, tint: 0xf0f0ec });
    // ceiling lights: long glowing strips in a grid (not over the well)
    for (let x = -11; x <= 11; x += 3.6) for (const z of [-6, -1.5, 3, 7]) {
      if (above && x > above.x0 - 0.8 && x < above.x1 + 0.8 && z > above.z0 - 1.6 && z < above.z1 + 1.6) continue;
      // a recessed troffer: white frame, the diffuser, a louvre of cross blades
      F.box('satin', x - 0.19, CH - 0.022, z - 1.27, x + 0.19, CH + 0.01, z + 1.27, { tint: 0xeeeeea, bevel: 0.012 });
      F.box('glow', x - 0.14, CH - 0.03, z - 1.22, x + 0.14, CH - 0.022, z + 1.22, { tint: 0xfffaf0 });
      for (let k = -4; k <= 4; k++) F.box('satin', x - 0.14, CH - 0.05, z + k * 0.27 - 0.005, x + 0.14, CH - 0.022, z + k * 0.27 + 0.005, { tint: 0xe4e4e0 });
      for (const sx of [-1, 1]) F.box('satin', x + sx * 0.145 - 0.006, CH - 0.06, z - 1.22, x + sx * 0.145 + 0.006, CH - 0.022, z + 1.22, { tint: 0xe4e4e0 });
    }
    // walls: vinyl cloth, a coloured band with a steel trim, a skirting
    const wall = (w, x, z, ry) => {
      const hx = ry ? 0.1 : w / 2, hz = ry ? w / 2 : 0.1;
      F.box('wallpaper', x - hx, 0, z - hz, x + hx, CH, z + hz, { tint: T.wall });
      F.box('gloss', x - hx - 0.012, 0, z - hz - 0.012, x + hx + 0.012, 0.12, z + hz + 0.012, { tint: 0x3a3a40, bevel: 0.008 });
      F.box('gloss', x - hx - 0.012, 2.25, z - hz - 0.012, x + hx + 0.012, 2.39, z + hz + 0.012, { tint: T.band, bevel: 0.01 });
      F.box('chrome', x - hx - 0.016, 2.39, z - hz - 0.016, x + hx + 0.016, 2.41, z + hz + 0.016, { bevel: 0.004 });
    };
    wall(X1 - X0 + 0.4, 0, Z0 - 0.1, 0);
    wall(Z1 - Z0, X1 + 0.1, 0, Math.PI / 2);
    wall(Z1 - Z0, X0 - 0.1, 0, Math.PI / 2);
    this.front(Z, n, paint, metal, glow, wall);
    Z.block(X0 - 1, X1 + 1, Z0 - 1, Z0); Z.block(X1, X1 + 1, Z0, Z1 + 1); Z.block(X0 - 1, X0, Z0, Z1 + 1);
    // escalators: the pair up from here (n < 4), the pair arriving from below (n > 1)
    this.esc[n] = [];
    this.rideBlocks[n] = [];
    if (above) {
      this.esc[n].push(buildEscalators(Z, n, 0, { open: () => this.floorsOpen > n }));
      ceilingWell(Z, n, paint);
      this.stub(Z, n, n + 1, FH, above);
      this.escBlocksLower(Z, n);
    }
    if (below) {
      this.esc[n].push(buildEscalators(Z, n - 1, -FH));
      this.floorWell(Z, n, below, paint, metal);
      this.stub(Z, n, n - 1, -FH, below, GAPS[n - 1]);
      this.escBlocksUpper(Z, n);
    }
    this.escHits(Z, n);
    this.elevator.build(Z, n);
    this.stacks(Z, n);
    this.signs(Z, n);
    if (n === 1) this.groundFloor(Z, paint, metal, glow);
    K.done(Z.group, 'mall' + n);
    Z.flush();
    // machine spots, the walk grid, the customers
    this.spots[n] = new MachineSpots(this.game, Z, { key: 'mall' + n, slots: MALL_SLOTS, first: n * 100 + 1, label: `${n}F machine spot`, active: () => this.floorsOpen >= n });
    this.navs[n] = this.navGrid(n);
    const door = n === 1 ? [0, 8.2, Math.PI] : [LIFT.door + 0.7, 0, Math.PI / 2]; // upstairs, people come and go by the lift
    this.crowds[n] = new Crowd(this.game, Z, {
      nav: this.navs[n], max: [0, 16, 13, 12, 11][n], door, pool: (this.pool ||= []),
      spots: () => this.customerSpots(n),
      rate: () => (this.isOpen() && this.floorsOpen >= n ? 0.35 + 0.45 * (this.game.sim?.footfall?.() ?? 1) : 0),
    });
    this.crowds[n].onServe = () => this.countCustomer();
    this.crowds[n].fakePlay = (p) => { const s = p.target; if (!s?.fake || !s.at) return; sfx('coinInsert', { pos: s.at, vol: 0.35 }); this.game.tweens.wait(1.0, () => sfx('gachan', { pos: s.at, vol: 0.45 })); this.countCustomer(); };
  }

  exitSpot() {
    const t = (this.game.garage?.town?.tunnels || []).find((x) => x.dir > 0) || { x: 28.5, z: 9.6 };
    return { x: t.x - 1.2, z: t.z, yaw: Math.PI / 2 };
  }

  /** The front wall: 1F the entrance and the display windows, upstairs big windows over the station. */
  front(Z, n, paint, metal, glow, wall) {
    const B = Z.B, T = THEMES[n];
    const view = canvasMat(160, 64, (x, w, h) => this.drawView(x, w, h, n), { glow: true });
    this.views ||= [];
    this.views.push(view);
    const vq = new THREE.Mesh(new THREE.PlaneGeometry(34, 13.6), view);
    vq.position.copy(Z.L(0, 3.0, Z1 + 4)); vq.rotation.y = Math.PI;
    Z.group.add(vq);
    const glass = Z.mat(new THREE.MeshStandardMaterial({ color: 0xd8eef4, roughness: 0.05, transparent: true, opacity: 0.18, depthWrite: false }));
    const pane = (x0, x1, y0, y1) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), glass); m.position.copy(Z.L((x0 + x1) / 2, (y0 + y1) / 2, Z1 - 0.02)); m.rotation.y = Math.PI; Z.group.add(m); };
    if (n === 1) {
      // entrance x -2..2 (two pairs of automatic doors), display windows on both sides
      for (const [x0, x1] of [[X0, -10.5], [-2.6, -2.0], [2.0, 2.6], [10.5, X1]]) B.box(paint, x1 - x0, CH, 0.2, (x0 + x1) / 2, 0, Z1 + 0.1, { tint: T.wall });
      for (const [x0, x1] of [[-10.5, -2.6], [2.6, 10.5]]) {
        B.box(paint, x1 - x0, 0.5, 0.2, (x0 + x1) / 2, 0, Z1 + 0.1, { tint: 0x3a3a40 });
        B.box(paint, x1 - x0, CH - 3.0, 0.2, (x0 + x1) / 2, 3.0, Z1 + 0.1, { tint: T.wall });
        pane(x0, x1, 0.5, 3.0);
        for (let x = x0; x <= x1 + 0.01; x += (x1 - x0) / 3) B.box(metal, 0.06, 2.5, 0.08, x, 0.5, Z1, { tint: 0xc8ccd2 });
      }
      B.box(paint, 4.0, CH - 2.6, 0.2, 0, 2.6, Z1 + 0.1, { tint: T.wall });
      B.box(metal, 4.1, 0.1, 0.12, 0, 2.55, Z1, { tint: 0xc8ccd2 });
      this.doors = [];
      for (const s of [-1, 1]) for (const k of [0, 1]) {
        const d = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.5, 0.04), glass);
        const fr = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 0.06), Z.mat(new THREE.MeshStandardMaterial({ color: 0xc8ccd2, metalness: 0.6, roughness: 0.3 })));
        fr.position.y = -1.22; d.add(fr);
        const x0 = s * (0.5 + k * 1.0);
        d.position.copy(Z.L(x0, 1.28, Z1 - 0.05));
        Z.group.add(d);
        this.doors.push({ m: d, x0, s });
      }
      Z.block(X0, -2.0, Z1, Z1 + 1); Z.block(2.0, X1, Z1, Z1 + 1); Z.block(-2.0, 2.0, Z1 + 0.3, Z1 + 1);
      Z.hit(4.0, 2.5, 0.3, 0, 1.25, Z1 + 0.05, { reach: 2.6, hint: () => ({ key: 'LMB', text: 'Leave the Kaikan', sub: 'Back through the underpass to the lane' }), use: () => { this.game.places.exit({ sound: 'slideDoor' }); return false; } });
      // the welcome mat and the floor directory by the doors
      B.plane(paint, 3.6, 1.4, 0, 0.006, Z1 - 0.9, { tint: 0x2a3a5a });
    } else {
      // the front wall round two long windows (x -11.5..-2.5 and 2.5..11.5, sill 1.0, head 3.1)
      for (const [x0, x1] of [[X0 - 0.2, -11.5], [-2.5, 2.5], [11.5, X1 + 0.2]]) B.box(paint, x1 - x0, CH, 0.2, (x0 + x1) / 2, 0, Z1 + 0.1, { tint: T.wall });
      for (const [x0, x1] of [[-11.5, -2.5], [2.5, 11.5]]) {
        B.box(paint, x1 - x0, 1.0, 0.2, (x0 + x1) / 2, 0, Z1 + 0.1, { tint: T.wall });
        B.box(paint, x1 - x0, 0.12, 0.22, (x0 + x1) / 2, 0, Z1 + 0.1, { tint: 0x3a3a40 });
        B.box(paint, x1 - x0, CH - 3.1, 0.2, (x0 + x1) / 2, 3.1, Z1 + 0.1, { tint: T.wall });
        B.box(metal, x1 - x0, 0.05, 0.3, (x0 + x1) / 2, 0.98, Z1 - 0.05, { tint: 0xd8dce2 });
        pane(x0, x1, 1.0, 3.1);
        for (let x = x0; x <= x1 + 0.01; x += (x1 - x0) / 4) B.box(metal, 0.06, 2.1, 0.08, x, 1.0, Z1 - 0.02, { tint: 0xc8ccd2 });
      }
      Z.block(X0, X1, Z1, Z1 + 1);
      this.windows ||= {};
      this.windows[n] = true;
      // benches under the windows
      for (const x of [-7, 7]) Z.prop('park_bench', x, 0, Z1 - 0.7, Math.PI, 0.9);
      Z.block(-8.2, -5.8, Z1 - 1.0, Z1); Z.block(5.8, 8.2, Z1 - 1.0, Z1);
    }
  }
  /** The view out of the windows: the station plaza (1F) or roofs and the tracks (upstairs), dusk or day. */
  drawView(x, w, h, n) {
    const R = (c, a, b, ww, hh) => { x.fillStyle = c; x.fillRect(a, b, ww, hh); };
    R('#8ab4d8', 0, 0, w, h); R('#a8c8e0', 0, 16, w, 12); R('#c8d8e8', 0, 26, w, 8);
    const base = n === 1 ? 44 : 34 + n * 3;
    for (let i = 0; i < 12; i++) { const bw = 10 + (i * 7) % 9, bh = 10 + (i * 13) % 18; R(['#8a8e9a', '#9aa0aa', '#7a7e8a'][i % 3], i * 14 - 4, base - bh, bw, bh); for (let k = 0; k < 3; k++) R('#e8e0a8', i * 14 - 2 + k * 3, base - bh + 3, 1, 1); }
    if (n === 1) {
      R('#6a6e78', 0, 44, w, 20); R('#5a5e66', 0, 50, w, 2);
      R('#c8c4bc', 40, 30, 80, 14); R('#2a5aa8', 40, 30, 80, 3); pixText(x, '森尾駅', 80, 31, { size: 8, align: 'center', color: '#fbf8f0' }); // the station building
      for (let i = 0; i < 8; i++) R(['#d8463a', '#3a7ad8', '#f2c230', '#5ab060'][i % 4], 8 + i * 19, 52, 3, 6); // people on the plaza
      R('#3a3a42', 0, 60, w, 4);
    } else {
      R('#4a4e58', 0, base, w, 3); R('#c8c8c0', 0, base + 3, w, 1); // the elevated tracks
      R('#8a9a5a', 20, base - 6, 56, 6); R('#d8d4c8', 22, base - 5, 52, 3); for (let i = 0; i < 6; i++) R('#9ac8e8', 24 + i * 8, base - 5, 5, 2); // a train
      R('#6a6a72', 0, base + 4, w, h - base - 4);
      for (let i = 0; i < 20; i++) R(['#b87a5a', '#8a8e94', '#a89a8a'][i % 3], i * 8, base + 6 + (i % 3) * 2, 7, h);
    }
    grain(x, 0, 0, w, h, ['#ffffff10', '#00000010'], 0.04, n);
  }

  /** A slice of the floor above (y = FH) or below (y = -FH) seen through a well: tiles, a railing, a ceiling, walls of
   *  machines painted at its edges. */
  stub(Z, n, m, y, well, gapBelow = null) {
    const T = THEMES[m], B = Z.B;
    const floor = Z.mat(photoNorm('tile_checker_floor', { rough: 0.48 }));
    const G = gapBelow || GAPS[n];
    const r = { x0: well.x0 - 3.5, x1: well.x1 + 3.5, z0: Math.min(well.z0, G.z0, G.z1) - 2.5, z1: Math.max(well.z1, G.z0, G.z1) + 2.5 };
    for (const q of minusHoles(r, y > 0 ? [well] : [])) B.plane(floor, q.x1 - q.x0, q.z1 - q.z0, (q.x0 + q.x1) / 2, y, (q.z0 + q.z1) / 2, { tint: new THREE.Color(T.a).lerp(new THREE.Color(T.b), 0.55) });
    const paint = this.mats.paint, glow = this.mats.glow;
    if (y > 0) {
      B.plane(paint, r.x1 - r.x0, r.z1 - r.z0, (r.x0 + r.x1) / 2, y + CH, (r.z0 + r.z1) / 2, { down: true, tint: 0xf4f4f2 });
      for (let x = r.x0 + 1; x < r.x1; x += 3) B.box(glow, 0.2, 0.03, r.z1 - r.z0 - 1, x, y + CH - 0.04, (r.z0 + r.z1) / 2, { tint: 0xfffaf0 });
      this.railing(Z, well, y, G);
    }
    // a row of real route machines along the far edge (where a rider looks), painted walls round the rest
    const far = y > 0 ? (G.dir < 0 ? r.z0 : r.z1) : (G.dir < 0 ? r.z1 : r.z0);
    const into = far === r.z0 ? 1 : -1;
    const row = [];
    for (let x = r.x0 + 0.5; x <= r.x1 - 0.4; x += 0.92) row.push({ x, z: far + into * 0.24, ry: into > 0 ? 0 : Math.PI, c: T.stacks[row.length % T.stacks.length] });
    this.instStacks(Z, row, y);
    const wallM = canvasMat(96, 32, (x) => this.drawStubWall(x, T), { glow: true });
    wallM.map.wrapS = THREE.RepeatWrapping;
    const edge = (len, cx, cz, ry) => { const geo = new THREE.PlaneGeometry(len, CH); const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * len / 4); const p = new THREE.Mesh(geo, wallM); p.position.copy(Z.L(cx, y + CH / 2, cz)); p.rotation.y = ry; Z.group.add(p); };
    edge(r.x1 - r.x0, (r.x0 + r.x1) / 2, r.z0, 0);
    edge(r.x1 - r.x0, (r.x0 + r.x1) / 2, r.z1, Math.PI);
    edge(r.z1 - r.z0, r.x0, (r.z0 + r.z1) / 2, Math.PI / 2);
    edge(r.z1 - r.z0, r.x1, (r.z0 + r.z1) / 2, -Math.PI / 2);
  }
  drawStubWall(x, T) {
    x.fillStyle = '#' + T.wall.toString(16).padStart(6, '0'); x.fillRect(0, 0, 96, 32);
    const cols = { red: '#d8322c', blue: '#2f6ad8', yellow: '#f2c230', pink: '#e86aa8', green: '#3a9a5a', black: '#26262c' };
    for (let i = 0; i < 4; i++) for (const ty of [6, 18]) {
      const c = cols[T.stacks[(i + ty) % T.stacks.length]];
      x.fillStyle = c; x.fillRect(i * 24 + 2, ty, 20, 12);
      x.fillStyle = '#e8f4f6'; x.fillRect(i * 24 + 5, ty + 1, 14, 6);
      for (let k = 0; k < 5; k++) { x.fillStyle = ['#e5383b', '#3a7ad8', '#f2c230', '#5ab060', '#e86aa8'][(k + i) % 5]; x.fillRect(i * 24 + 6 + k * 3, ty + 4, 2, 2); }
    }
    x.fillStyle = T.accent; x.fillRect(0, 2, 96, 2);
    x.fillStyle = '#3a3a40'; x.fillRect(0, 30, 96, 2);
  }
  /** Glass railing round a well (not on the side the escalator comes out). */
  railing(Z, well, y, G) {
    const B = Z.B, metal = this.mats.metal;
    const glass = Z.mat(new THREE.MeshStandardMaterial({ color: 0xd8eef4, roughness: 0.05, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
    const exitZ = G.zt; // the escalators pass this side
    const sides = [[well.x0, well.z0, well.x0, well.z1], [well.x1, well.z0, well.x1, well.z1], [well.x0, exitZ === well.z0 ? well.z1 : well.z0, well.x1, exitZ === well.z0 ? well.z1 : well.z0]];
    for (const [ax, az, bx, bz] of sides) {
      const len = Math.hypot(bx - ax, bz - az), cx = (ax + bx) / 2, cz = (az + bz) / 2, ry = ax === bx ? Math.PI / 2 : 0;
      const p = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.9), glass);
      p.position.copy(Z.L(cx, y + 0.5, cz)); p.rotation.y = ry; Z.group.add(p);
      B.box(metal, len + 0.06, 0.05, 0.06, cx, y + 0.95, cz, { ry, tint: 0xd8dce2 });
      B.box(metal, len + 0.06, 0.05, 0.08, cx, y + 0.02, cz, { ry, tint: 0xb8bcc2 });
    }
  }
  /** The well in this floor's floor (the escalators from below): the slab edge, the railing. */
  floorWell(Z, n, W, paint, metal) {
    const B = Z.B;
    for (const [w, d, x, z] of [[W.x1 - W.x0, 0.06, (W.x0 + W.x1) / 2, W.z0], [W.x1 - W.x0, 0.06, (W.x0 + W.x1) / 2, W.z1], [0.06, W.z1 - W.z0, W.x0, (W.z0 + W.z1) / 2], [0.06, W.z1 - W.z0, W.x1, (W.z0 + W.z1) / 2]]) {
      B.box(paint, w, FH - CH, d, x, -(FH - CH), z, { tint: 0xf4f4f0 });
    }
    this.railing(Z, W, 0, GAPS[n - 1]);
    void metal;
  }

  // ------------------------------------------------------------------ escalator obstacles and the ride
  escBlocksLower(Z, n) {
    const G = GAPS[n], lo = Math.min(pathZ(G, 0.45), pathZ(G, PATH)), hi = Math.max(pathZ(G, 0.45), pathZ(G, PATH));
    const b = this.rideBlocks[n];
    b.push(Z.block(G.x - 1.42, G.x + 1.42, lo, hi));
    const d0 = Math.min(pathZ(G, 0), pathZ(G, 0.45)), d1 = Math.max(pathZ(G, 0), pathZ(G, 0.45));
    b.push(Z.block(G.down - 0.6, G.x + 1.42, d0, d1));
  }
  escBlocksUpper(Z, n) {
    const G = GAPS[n - 1], W = G.well, b = this.rideBlocks[n];
    b.push(Z.block(W.x0 - 0.08, W.x1 + 0.08, W.z0 - 0.08, W.z1 + 0.08));
    const a0 = Math.min(G.zt, pathZ(G, PATH)), a1 = Math.max(G.zt, pathZ(G, PATH));
    b.push(Z.block(G.up - 0.6, G.up + 0.5, a0, a1)); // arrivals only
    const e0 = Math.min(G.zt, pathZ(G, PATH - 0.45)), e1 = Math.max(G.zt, pathZ(G, PATH - 0.45));
    b.push(Z.block(G.down - 0.45, W.x1 + 0.08, e0, e1));
    for (const x of [W.x0 - 0.12, W.x1 + 0.12]) b.push(Z.block(x - 0.05, x + 0.05, a0, a1));
  }
  escHits(Z, n) {
    if (n < FLOORS) {
      const G = GAPS[n], z = pathZ(G, 0.25);
      Z.hit(0.9, 1.0, 0.6, G.up, 0.5, z, { reach: 2.6, hint: () => (this.floorsOpen > n ? { key: 'LMB', text: `Ride up to ${n + 1}F`, sub: THEMES[n + 1].name } : { key: '', text: `${n + 1}F: opening soon`, sub: 'Fit it out on Ota Real Estate\'s site' }), use: () => { this.startRide(n, 'up'); return false; } });
    }
    if (n > 1) {
      const G = GAPS[n - 1], z = pathZ(G, PATH - 0.25);
      Z.hit(0.9, 1.0, 0.6, G.down, 0.5, z, { reach: 2.6, hint: () => ({ key: 'LMB', text: `Ride down to ${n - 1}F`, sub: THEMES[n - 1].name }), use: () => { this.startRide(n - 1, 'down'); return false; } });
    }
  }
  startRide(gap, lane) {
    const g = this.game;
    if (this.ride || g.cutscene.active) return;
    if (lane === 'up' && this.floorsOpen <= gap) { sfx('error', { vol: 0.3 }); return; }
    const G = GAPS[gap];
    this.ride = { gap, lane, G, u: lane === 'up' ? 0.25 : PATH - 0.25, swapped: false, fade: 0, x: lane === 'up' ? G.up : G.down };
    for (const n of [gap, gap + 1]) for (const o of this.rideBlocks[n] || []) o.enabled = false;
    g.places.standUp();
    sfx('escStep', { vol: 0.6 });
    this.escLoop?.set(0.06, 0.3);
  }
  updateRide(dt) {
    const R = this.ride, g = this.game, P = g.player, inp = g.input;
    for (const k of MOVE_KEYS) inp.keys.delete(k);
    inp.axis.x = inp.axis.z = 0;
    P.vel.set(0, 0, 0);
    const up = R.lane === 'up';
    R.u += (up ? 1 : -1) * RIDE_SPEED * dt;
    // the zone swap (a blink while the camera's in the well)
    const swapAt = up ? FLAT + RUN : FLAT + RUN * 0.6;
    if (!R.swapped && (up ? R.u >= swapAt : R.u <= swapAt)) {
      R.fade += dt;
      g.cutscene.setFade(Math.min(1, R.fade / 0.1));
      if (R.fade >= 0.1) { R.swapped = true; this.swapTo(up ? R.gap + 1 : R.gap, false, { x: R.x, z: pathZ(R.G, R.u) }); R.fade = 0.12; }
      R.u -= (up ? 1 : -1) * RIDE_SPEED * dt * 0.6; // hold still for the blink
    } else if (R.swapped && R.fade > 0) { R.fade -= dt; g.cutscene.setFade(Math.max(0, R.fade / 0.12)); }
    const zone = this.zones[R.swapped ? (up ? R.gap + 1 : R.gap) : (up ? R.gap : R.gap + 1)];
    const inUpper = zone === this.zones[R.gap + 1];
    const y = stepY(Math.min(PATH, Math.max(0, R.u)));
    P.eye = 1.58 + y - (inUpper ? FH : 0);
    const z = pathZ(R.G, R.u);
    P.pos.copy(zone.L(R.x, 0, z));
    if (g.needs) g.needs.hasPrev = false; // standing still on the steps: no walking tiredness
    if (Math.floor(R.u / 0.4) !== Math.floor((R.u - RIDE_SPEED * dt) / 0.4) && Math.random() < 0.3) sfx('escStep', { vol: 0.15 });
    const done = up ? R.u >= PATH + 0.55 : R.u <= -0.55;
    if (done) {
      P.eye = 1.58;
      g.cutscene.setFade(0);
      for (const n of [R.gap, R.gap + 1]) for (const o of this.rideBlocks[n] || []) o.enabled = true;
      this.ride = null;
      this.escLoop?.set(0.02, 0.5);
      this.G.give('gr_escalator');
      sfx('escStep', { vol: 0.5 });
    }
  }

  cancelRide() {
    const R = this.ride;
    if (!R) return;
    for (const n of [R.gap, R.gap + 1]) for (const o of this.rideBlocks[n] || []) o.enabled = true;
    this.ride = null;
    this.game.player.eye = 1.58;
    this.game.cutscene.setFade(0);
  }
  /** Move to floor n: at the same zone-local spot (the lift), or at spot { x, z } (zone-local). The player is moved
   *  before the zone switch, so the floor's onEnter (its crowd filling in) already knows where you are. */
  swapTo(n, keep = true, spot = null) {
    const g = this.game, from = this.cur;
    const p = spot || (keep && from ? from.local(g.player.pos) : null);
    const Z = this.ensureFloor(n);
    if (p) g.player.pos.copy(Z.L(p.x, 0, p.z));
    this.swapping = true;
    g.places.setWhere('mall' + n);
    this.swapping = false;
    if (g.needs) g.needs.hasPrev = false;
  }

  // ------------------------------------------------------------------ route machines, signs, the ground floor
  /** Instanced route-machine modules, one mesh per body colour. list: [{ x, z, ry, c }]. Two levels of detail: the
   *  voxel model close to you, a flat-fronted box with the same front painted on it further away (lod(), 4 Hz). */
  instStacks(Z, list, y = 0) {
    const by = new Map();
    for (const s of list) { if (!by.has(s.c)) by.set(s.c, []); by.get(s.c).push(s); }
    const q = new THREE.Quaternion(), one = V(1, 1, 1), Y = V(0, 1, 0);
    (this.lodSets ||= {})[Z.id] ||= [];
    for (const [c, arr] of by) {
      const geo = propGeometry(`gr_stack_${c}`);
      if (!geo) continue;
      const near = new THREE.InstancedMesh(geo, brightVoxel(), arr.length);
      const far = new THREE.InstancedMesh(farGeo(), farMats(c), arr.length);
      const mats = arr.map((s) => new THREE.Matrix4().compose(Z.L(s.x, y, s.z), q.setFromAxisAngle(Y, s.ry), one));
      for (const im of [near, far]) { im.receiveShadow = true; im.frustumCulled = false; Z.group.add(im); }
      const set = { near, far, mats, pos: arr.map((s) => Z.L(s.x, y + 1, s.z)) };
      this.lodSets[Z.id].push(set);
      this.lodSet(set, null);
    }
  }
  /** Sort one colour's modules into near (voxel) and far (box) by distance from cam (null: all far). */
  lodSet(set, cam, d2 = 64) {
    let a = 0, b = 0;
    set.pos.forEach((p, i) => {
      if (cam && p.distanceToSquared(cam) < d2) set.near.setMatrixAt(a++, set.mats[i]);
      else set.far.setMatrixAt(b++, set.mats[i]);
    });
    set.near.count = a; set.far.count = b;
    set.near.instanceMatrix.needsUpdate = true; set.far.instanceMatrix.needsUpdate = true;
  }
  lod(n) {
    const P = this.game.player, cam = (this._lodV ||= V()).set(P.pos.x, P.eye, P.pos.z); // (the player: moved at once by a swap)
    for (const set of this.lodSets?.['mall' + n] || []) this.lodSet(set, cam);
  }
  stacks(Z, n) {
    const T = THEMES[n], list = [];
    const put = (x, z, ry) => list.push({ x, z, ry, c: T.stacks[Math.floor(Math.abs(Math.sin(x * 12.9 + z * 78.2 + n) * 43758.5)) % T.stacks.length] });
    const step = 0.92;
    for (const W of STACK_WALLS) for (const [a, b] of W.runs) for (let u = a; u <= b + 0.01; u += step) {
      if (W.wall === 'back') put(u, Z0 + 0.24, 0);
      if (W.wall === 'east') put(X1 - 0.24, u, -Math.PI / 2);
      if (W.wall === 'west') { if (n === 1 && u > -7.2 && u < -4.8) continue; put(X0 + 0.24, u, Math.PI / 2); }
    }
    for (const I of ISLANDS) for (let x = I.x0; x <= I.x1 + 0.01; x += step) { put(x, I.z + 0.24, 0); put(x, I.z - 0.24, Math.PI); }
    this.instStacks(Z, list);
    // where customers stand to play them
    this.stackSpots[n] = list.map((s, i) => {
      const fx = Math.sin(s.ry), fz = Math.cos(s.ry);
      return { key: 's' + i, pos: { x: s.x + fx * 0.8, z: s.z + fz * 0.8 }, yaw: Math.atan2(-fx, -fz), fake: true, at: Z.L(s.x, 1.0, s.z) };
    });
    for (const I of ISLANDS) Z.block(I.x0 - 0.5, I.x1 + 0.5, I.z - 0.5, I.z + 0.5);
    Z.block(X0, X1, Z0, Z0 + 0.5); // back wall machines
    Z.block(X1 - 0.5, X1, Z0, Z1);
    Z.block(X0, X0 + 0.5, Z0, -1.3); Z.block(X0, X0 + 0.5, 1.3, Z1);
  }

  signs(Z, n) {
    const T = THEMES[n];
    const neon = (w, h, pw, ph, draw, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), canvasMat(pw, ph, draw, { glow: true, alpha: true })); m.position.copy(Z.L(x, y, z)); m.rotation.y = ry; Z.group.add(m); return m; };
    const tube = (x, txt, size, col, cx, cy) => { pixText(x, txt, cx + 1, cy + 1, { size, align: 'center', color: '#00000066', font: /[ぁ-んァ-ン一-龯]/.test(txt) ? 'DotGothic16' : 'Alagard' }); pixText(x, txt, cx, cy, { size, align: 'center', color: col, font: /[ぁ-んァ-ン一-龯]/.test(txt) ? 'DotGothic16' : 'Alagard' }); };
    // over the back wall: the floor's name in neon
    neon(6, 0.9, 120, 18, (x) => { x.fillStyle = '#1a1a22'; x.fillRect(0, 0, 120, 18); x.fillStyle = T.accent; x.fillRect(0, 0, 120, 1); x.fillRect(0, 17, 120, 1); tube(x, `${n}F ${T.jp}`, 12, T.accent, 60, 2); }, 2.0, 2.95, Z0 + 0.13, 0);
    neon(6, 0.9, 120, 18, (x) => { x.fillStyle = '#1a1a22'; x.fillRect(0, 0, 120, 18); x.fillStyle = '#ffd23f'; x.fillRect(0, 0, 120, 1); x.fillRect(0, 17, 120, 1); tube(x, 'GACHA KAIKAN', 12, '#ffd23f', 60, 2); }, X1 - 0.13, 2.95, 4.0, -Math.PI / 2);
    neon(5, 0.9, 100, 18, (x) => { x.fillStyle = '#1a1a22'; x.fillRect(0, 0, 100, 18); tube(x, 'ガチャガチャ', 12, '#ff6fa8', 50, 2); }, X0 + 0.13, 2.95, 5.0, Math.PI / 2);
    // the floor directory by the lift
    neon(1.0, 1.3, 32, 44, (x) => {
      x.fillStyle = '#f4f0e6'; x.fillRect(0, 0, 32, 44); x.fillStyle = '#241a1e'; x.fillRect(0, 0, 32, 8);
      pixText(x, 'FLOOR', 16, 0, { size: 8, align: 'center', color: '#f4f0e6', font: 'Alagard' });
      for (let k = FLOORS; k >= 1; k--) { const y = 10 + (FLOORS - k) * 8; x.fillStyle = k === n ? THEMES[k].accent : '#5e5046'; x.fillRect(2, y, 8, 7); pixText(x, `${k}F`, 6, y - 1, { size: 8, align: 'center', color: '#fbf8f0', font: 'DotGothic16' }); pixText(x, THEMES[k].jp.slice(0, 4), 12, y - 1, { size: 8, color: '#241a1e' }); }
    }, LIFT.door + 0.1, 1.6, -1.9, Math.PI / 2);
    // over the escalators: where they go
    if (n < FLOORS) { const G = GAPS[n]; neon(1.8, 0.35, 48, 10, (x) => { x.fillStyle = '#1a1a22'; x.fillRect(0, 0, 48, 10); pixText(x, `▲ ${n + 1}F`, 24, 0, { size: 8, align: 'center', color: '#7aff9a', font: 'DotGothic16' }); }, G.x, 2.7, pathZ(G, 0) - G.dir * 0.3, G.dir > 0 ? 0 : Math.PI); }
    if (n > 1) { const G = GAPS[n - 1]; neon(1.8, 0.35, 48, 10, (x) => { x.fillStyle = '#1a1a22'; x.fillRect(0, 0, 48, 10); pixText(x, `▼ ${n - 1}F`, 24, 0, { size: 8, align: 'center', color: '#ffb05a', font: 'DotGothic16' }); }, G.x, 2.4, pathZ(G, PATH) + G.dir * 0.3, G.dir > 0 ? Math.PI : 0); }
    // the floor's centrepiece on a round plinth, and two sale banners hanging over the promenade
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.05, 0.35, 16), Z.mat(new THREE.MeshStandardMaterial({ color: new THREE.Color(T.band), roughness: 0.4 })));
    plinth.position.copy(Z.L(0, 0.175, CENTRE_Z)); Z.group.add(plinth);
    Z.prop(T.centre[0], -0.25, 0.35, CENTRE_Z, 0.4, 1.2);
    Z.prop(T.centre[1], 0.55, 0.35, CENTRE_Z + 0.3, -0.6, 0.9);
    Z.block(-1.05, 1.05, CENTRE_Z - 1.05, CENTRE_Z + 1.05);
    for (const [z, i] of [[4.6, 0], [-2.6, 1]]) {
      const b = neon(1.6, 0.8, 40, 20, (x) => {
        x.fillStyle = ['#ffd23f', '#ffffff'][i]; x.fillRect(0, 0, 40, 20);
        x.fillStyle = T.accent; x.fillRect(0, 0, 40, 3); x.fillRect(0, 17, 40, 3);
        pixText(x, i ? '新作入荷' : 'ガチャ祭', 20, 4, { size: 10, align: 'center', color: i ? T.accent : '#c8322c' });
      }, 0, 2.55, z, 0);
      b.material.side = THREE.DoubleSide;
      const str = new THREE.Mesh(new THREE.BoxGeometry(0.01, CH - 2.95, 0.01), this.mats.metal); str.position.copy(Z.L(0, 2.95 + (CH - 2.95) / 2, z)); Z.group.add(str);
    }
    // capsule-toy posters on the front wall, pixel art only
    for (const [x, i] of [[-12.2, 0], [12.2, 1]]) neon(0.9, 1.25, 30, 42, (c) => this.drawPoster(c, i + n), x, 1.6, Z1 - 0.12, Math.PI);
  }
  drawPoster(x, i) {
    const bg = ['#ffd23f', '#5cc4ff', '#ff6f91', '#58c06c'][i % 4];
    x.fillStyle = bg; x.fillRect(0, 0, 30, 42);
    x.fillStyle = '#241a1e'; x.fillRect(0, 0, 30, 1); x.fillRect(0, 41, 30, 1); x.fillRect(0, 0, 1, 42); x.fillRect(29, 0, 1, 42);
    // a capsule: two halves
    x.fillStyle = '#f4f0e6'; x.fillRect(8, 8, 14, 7); x.fillStyle = ['#e5383b', '#3a7ad8', '#8a5bd6', '#f08a3a'][i % 4]; x.fillRect(8, 15, 14, 7);
    x.fillStyle = '#241a1e'; x.fillRect(7, 14, 16, 1);
    pixText(x, 'NEW!', 15, 25, { size: 8, align: 'center', color: '#c8322c', font: 'Alagard' });
    pixText(x, '新作', 15, 32, { size: 8, align: 'center', color: '#241a1e' });
  }

  groundFloor(Z, paint, metal, glow) {
    const B = Z.B;
    // the info counter by the door: today's numbers
    B.box(paint, 3.0, 1.0, 0.7, 7.5, 0, 6.9, { tint: 0xf04a8a });
    B.box(paint, 3.1, 0.06, 0.8, 7.5, 1.0, 6.9, { tint: 0xf4f0e8 });
    B.box(glow, 2.6, 0.08, 0.02, 7.5, 0.8, 6.54, { tint: 0xffd8e8 });
    Z.prop('cash_register', 7.0, 1.06, 6.95, Math.PI, 0.9);
    Z.prop('call_bell', 8.2, 1.06, 6.7, 0, 1);
    Z.block(5.9, 9.1, 6.45, 7.35);
    Z.hit(3.0, 1.1, 0.8, 7.5, 0.55, 6.9, { reach: 2.6, hint: () => this.infoHint(), use: () => false });
    // coin changers and a capsule return box by the lift
    Z.prop('coin_changer', -9.7, 0, -1.9, Math.PI / 2, 1);
    Z.prop('coin_changer', -9.7, 0, 1.9, Math.PI / 2, 1);
    Z.block(-10.1, -9.3, -2.3, -1.5); Z.block(-10.1, -9.3, 1.5, 2.3);
    Z.prop('capsule_return', 1.6, 0, 7.8, Math.PI, 1);
    Z.block(1.3, 1.9, 7.5, 8.1);
    // the stock room door (west wall): capsule cartons for the Kaikan's machines
    B.box(paint, 0.06, 2.1, 1.1, X0 + 0.04, 0, -6.0, { tint: 0x7a8088 });
    B.box(metal, 0.04, 0.06, 0.2, X0 + 0.09, 1.0, -5.65, { tint: 0xc8ccd2 });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.16), Z.mat(canvasMat(40, 12, (x) => { x.fillStyle = '#2a2a30'; x.fillRect(0, 0, 40, 12); pixText(x, 'STOCK 倉庫', 20, 1, { size: 8, align: 'center', color: '#f4f0e6' }); })));
    pl.position.copy(Z.L(X0 + 0.08, 2.25, -6.0)); pl.rotation.y = Math.PI / 2; Z.group.add(pl);
    Z.hit(0.2, 2.1, 1.1, X0 + 0.1, 1.05, -6.0, { reach: 2.4, hint: () => ({ key: 'LMB', text: 'Stock room', sub: 'Capsule cartons for the Kaikan\'s machines (paid from the bank)' }), use: () => { this.stockRoom(); return false; } });
  }
  infoHint() {
    let cash = 0, stock = 0, n = 0;
    if (!this.built) return null;
    for (const k of Object.keys(this.spots)) { const t = this.spots[k].totals(); cash += t.cash; stock += t.stock; n += t.n; }
    return { key: '', text: `Kaikan today: ${this.s.today || 0} customers, commission ${yen(this.s.commission || 0)}`, sub: `${n} machines of yours: ${yen(cash)} in their coin boxes, ${stock} capsules left` };
  }
  async stockRoom() {
    const g = this.game;
    const lic = g.state.licenses || ['mochi'];
    const series = await slip(g, {
      title: 'Stock room', jp: '倉庫', note: 'A carton of 20 capsules, straight off the shelf. Paid by bank transfer.',
      options: lic.slice(-8).map((id) => ({ label: SERIES_BY_ID[id]?.name || id, sub: `${SERIES_BY_ID[id]?.jp || ''}`, price: capsuleCost(id) * 20, value: id })),
    });
    if (!series) return;
    const cost = capsuleCost(series) * 20;
    if (!g.sim?.payDigital(cost, `capsules:${series}`)) { g.news?.('The bank declined the transfer', `${yen(cost)} needed`); return; }
    const data = { type: 'refill', series, count: 20, label: `${SERIES_BY_ID[series]?.name} x20` };
    const mesh = g.delivery.meshFor(data);
    mesh.position.copy(this.zones[1].L(X0 + 0.8, 0.9, -6.0));
    g.scene.add(mesh);
    if (g.held.canTake()) g.held.take('box', data, mesh);
    else { g.scene.remove(mesh); g.delivery.spawnRefillBox(series, 20, this.zones[1].L(X0 + 0.9, 0.3, -6.0)); }
    sfx('pickup', { vol: 0.5 });
  }

  // ------------------------------------------------------------------ customers
  navGrid(n) {
    const N = new NavGrid(X0, Z0, X1, Z1 + 0.5, 0.5);
    N.block(X0 - 1, X1 + 1, Z0 - 1, Z0 + 0.6, 0);
    N.block(X1 - 0.6, X1 + 1, Z0 - 1, Z1 + 1, 0);
    N.block(X0 - 1, X0 + 0.6, Z0 - 1, Z1 + 1, 0);
    N.block(X0 - 1, LIFT.door + 0.3, -1.4, 1.4, 0);
    for (const I of ISLANDS) N.block(I.x0 - 0.5, I.x1 + 0.5, I.z - 0.5, I.z + 0.5, 0.1);
    for (const s of MALL_SLOTS) N.block(s[0] - 0.4, s[0] + 0.4, s[1] - 0.4, s[1] + 0.4, 0.05);
    N.block(-1.05, 1.05, CENTRE_Z - 1.05, CENTRE_Z + 1.05, 0.1);
    if (n < FLOORS) { const G = GAPS[n]; N.block(G.x - 1.45, G.x + 1.45, Math.min(G.z0, G.z1), Math.max(G.z0, G.z1), 0.1); }
    if (n > 1) { const G = GAPS[n - 1]; N.block(G.x - 1.45, G.x + 1.45, Math.min(G.well.z0, G.zt, G.z1) - 0.2, Math.max(G.well.z1, G.zt, G.z1) + 0.2, 0.1); N.open(G.up - 0.3, G.up + 0.3, pathZ(G, PATH) + G.dir * 0.3, pathZ(G, PATH) + G.dir * 0.9); }
    if (n === 1) { N.block(5.9, 9.1, 6.45, 7.35, 0.1); N.block(-10.1, -9.3, -2.3, 2.3, 0.1); N.block(X0 - 1, -2.0, Z1, Z1 + 1, 0); N.block(2.0, X1 + 1, Z1, Z1 + 1, 0); }
    else N.block(X0 - 1, X1 + 1, Z1 - 0.4, Z1 + 1, 0);
    return N;
  }
  customerSpots(n) {
    const out = [];
    for (const m of this.spots[n].list) {
      const s = MALL_SLOTS[m.data.slot];
      const px = s[0] + Math.sin(s[2]) * 0.85, pz = s[1] + Math.cos(s[2]) * 0.85;
      if (m.canPlay()) out.push({ key: 'm' + m.data.slot, pos: { x: px, z: pz }, yaw: Math.atan2(s[0] - px, s[1] - pz), machine: m });
    }
    const st = this.stackSpots[n];
    for (let i = 0; i < 10; i++) out.push(st[(Math.random() * st.length) | 0]);
    return out;
  }
  countCustomer(k = 1) {
    this.s.today = (this.s.today || 0) + k;
    this.s.customers = (this.s.customers || 0) + k;
    if (this.s.today >= 40) this.G.give('gr_crowd');
    else this.G.count('gr_crowd', this.s.today);
  }

  /** Away from the Kaikan (or on another floor): customers on the machines' records. Minutes of shop time. */
  simulate(minutes) {
    if (!this.built || !this.isOpen()) return;
    const foot = this.game.sim?.footfall?.() ?? 1;
    for (let n = 1; n <= this.floorsOpen; n++) {
      // the route machines' commission (every floor, whether you're there or not)
      this.s.commission = (this.s.commission || 0) + minutes * 9 * foot * (1 + (n - 1) * 0.15);
      if (n === this.curN || !this.spots[n]) continue;
      const r = this.spots[n].simulate(minutes, 3 + n * 0.4);
      this.countCustomer(r.plays + Math.round(minutes * 0.25 * foot * Math.random()));
    }
  }
  /** The route operator pays the day's commission into the bank every morning. */
  payout() {
    const amt = Math.round((this.s.commission || 0) / 10) * 10;
    this.s.commission = 0;
    this.s.today = 0;
    if (!this.owned || amt <= 0) return;
    this.game.sim?.receiveDigital(amt, 'Kaikan route machine commission');
    this.game.news?.('Kaikan commission paid', `${yen(amt)} from the route machines, into the bank`, 6000);
  }

  // ------------------------------------------------------------------ getting there (the east underpass)
  laneEntry() {
    const g = this.game, t = (g.garage?.town?.tunnels || []).find((x) => x.dir > 0) || { x: 28.5, z: 9.6 };
    const hb = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.6, 6.2), new THREE.MeshBasicMaterial({ visible: false }));
    hb.position.set(t.x - 0.25, 1.3, t.z);
    g.scene.add(hb);
    g.interaction.add(hb, {
      reach: 2.6,
      hint: () => {
        if (this.owned) return { key: 'LMB', text: 'Walk on to Morio Station', sub: `GACHA KAIKAN, ${this.floorsOpen} floor${this.floorsOpen > 1 ? 's' : ''} open` };
        if (this.G.status('mall').state === 'available') return { key: '', text: 'Toward Morio Station', sub: 'The empty building by the station is for sale (Ota Real Estate)' };
        return null;
      },
      use: () => { if (this.owned) { this.build(); goTo(g, 'mall1', this.zones[1].at(0, 7.4, 0), { sound: 'slideDoor', fade: 0.45 }); } return false; },
    });
    // a little sign on the wall by the underpass, once it's yours
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.48), canvasMat(48, 20, (x) => {
      x.fillStyle = '#1f4a9a'; x.fillRect(0, 0, 48, 20); x.fillStyle = '#fbf8f0'; x.fillRect(1, 1, 46, 1);
      pixText(x, 'ガチャ会館 →', 24, 2, { size: 8, align: 'center', color: '#ffd23f' });
      pixText(x, 'STATION', 24, 11, { size: 8, align: 'center', color: '#fbf8f0', font: 'Alagard' });
    }));
    sign.position.set(t.mouth ? t.mouth - 0.6 : t.x - 3, 2.0, 6.62);
    g.scene.add(sign);
    this.laneSign = sign;
  }

  // ------------------------------------------------------------------ state
  refresh() {
    if (this.laneSign) this.laneSign.visible = this.owned;
    for (const n of Object.keys(this.esc)) for (const e of this.esc[n]) e.refresh?.();
    this.elevator?.redraw();
  }
  duck(on) {
    if (on) { this.song?.stop(0.5); this.song = null; }
    else if (this.cur && !this.song) { try { this.song = playSong('kaikan', { vol: 0.55 }); } catch { this.song = null; } }
  }
  onEnter(n) {
    const g = this.game;
    this.lodT = 0; // sort the machine walls' detail on the first frame here
    const Sp = this.spots[n];
    if (this.floorsOpen >= n) Sp.ensureBuilt();
    for (const e of this.esc[n]) e.refresh?.();
    if (this.isOpen() && this.floorsOpen >= n) this.crowds[n].prefill(Math.round(this.crowds[n].max * 0.6));
    if (!this.inside) {
      this.inside = true;
      try { bgm.duck(true, 0.12, 'kaikan'); } catch { /* */ }
      this.duck(false);
      this.crowdLoop = audio.loop?.('crowd', { vol: 0 });
      this.escLoop = audio.loop?.('escalatorHum', { vol: 0 });
      this.escLoop?.set(0.02, 0.5);
      try { audio.play('mallChime', { vol: 0.5 }); } catch { /* */ }
      g.news?.('GACHA KAIKAN ガチャ会館', `${this.isOpen() ? 'Open' : 'Closed to customers'} · ${this.floorsOpen} floor${this.floorsOpen > 1 ? 's' : ''} · today ${this.s.today || 0} customers`, 5000);
    }
    if (!g.state.flags.kaikanTip) { g.state.flags.kaikanTip = true; g.tweens.wait(1.2, () => g.tip?.('kaikan', 'GACHA KAIKAN', 'Click the taped squares to order machines. Cartons: the stock room on the west wall')); }
  }
  onExit(n) {
    this.crowds[n].clear();
    if (this.ride && !this.swapping) this.cancelRide();
    // left the building altogether? (a floor swap calls onExit then onEnter)
    setTimeout(() => {
      if (this.cur) return;
      this.inside = false;
      this.song?.stop(0.6); this.song = null;
      try { bgm.duck(false, 0, 'kaikan'); } catch { /* */ }
      this.crowdLoop?.stopAll?.(); this.crowdLoop = null;
      this.escLoop?.stopAll?.(); this.escLoop = null;
    }, 0);
  }
  tick(n, dt) {
    const g = this.game;
    this.lodT = (this.lodT || 0) - dt;
    if (this.lodT <= 0) { this.lodT = 0.25; this.lod(n); }
    for (const e of this.esc[n]) e.update(dt);
    if (this.floorsOpen >= n) { this.spots[n].update(dt); this.crowds[n].update(dt, this.isOpen()); }
    this.crowdLoop?.set(Math.min(0.12, this.crowds[n].count * 0.008), 0.5);
    if (this.ride) this.updateRide(dt);
    else this.autoRide(n);
    // the automatic doors on 1F
    if (n === 1 && this.doors) {
      const p = this.zones[1].local(g.player.pos);
      const near = Math.abs(p.x) < 3 && p.z > Z1 - 3 || this.crowds[1].people.some((q) => { const l = this.zones[1].local(q.root.position); return Math.abs(l.x) < 2.5 && l.z > Z1 - 2.2; });
      this.doorK = Math.max(0, Math.min(1, (this.doorK || 0) + (near ? dt : -dt) * 2.5));
      for (const d of this.doors) d.m.position.x = this.zones[1].o.x + d.x0 + d.s * this.doorK * 0.95;
    }
    this.viewT = (this.viewT || 0) - dt;
    if (this.viewT <= 0) {
      this.viewT = 2;
      const day = g.clock?.daylight?.() ?? 1, k = 0.3 + 0.7 * day;
      for (const v of this.views || []) v.color.setRGB(k * 0.95, k * (0.92 + 0.08 * day), k * (0.95 + 0.05 * day) + (1 - day) * 0.1);
    }
  }
  /** Walk onto an escalator's landing (facing the way it goes) and it takes you. */
  autoRide(n) {
    const g = this.game, inp = g.input;
    if (!(inp.key('KeyW') || inp.key('ArrowUp') || inp.axis.z < -0.3)) return;
    const p = this.zones[n].local(g.player.pos);
    const fwdZ = -Math.cos(g.player.yaw);
    if (n < FLOORS && this.floorsOpen > n) {
      const G = GAPS[n], z0 = pathZ(G, 0), z1 = pathZ(G, 0.45);
      if (Math.abs(p.x - G.up) < 0.42 && p.z > Math.min(z0, z1) && p.z < Math.max(z0, z1) && fwdZ * G.dir > 0.4) this.startRide(n, 'up');
    }
    if (n > 1) {
      const G = GAPS[n - 1], z0 = pathZ(G, PATH), z1 = pathZ(G, PATH - 0.45);
      if (Math.abs(p.x - G.down) < 0.42 && p.z > Math.min(z0, z1) && p.z < Math.max(z0, z1) && fwdZ * -G.dir > 0.4) this.startRide(n - 1, 'down');
    }
  }
  /** Every frame (from the growth plugin): the lift and the time that passes. */
  update(dt) {
    this.elevator.update(dt);
    if (!this.cur && this.ride) this.cancelRide();
  }
}

