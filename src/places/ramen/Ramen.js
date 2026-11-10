// RAMEN YAMADA (らーめん山田): the little ramen-ya in the front of FE4 on the far side of the lane (the Yamadas live
// upstairs: the shop has its own door, the family's is round the side; their son is Lord Kuromaru), dressed with a
// noren, a red lantern, a signboard, a standing menu and a sliding door (the house itself is src/world/Neighbours.js').
// Inside (built off the
// map, x 110..130 z -90..-70, shown only while you're in it): a long counter with red stools, the open kitchen (stock
// pots that steam, the noodle boiler, the gyoza griddle, bowls on the shelves), menu plaques on the wall and the ticket
// machine by the door. Buy tickets (the machine works like the vending machines), sit down: the master takes your
// tickets, cooks, shouts, serves. Hold LMB on a bowl to eat (slurps, steam), click a drink to drink it. The pink phone
// calls a friend from the lane to join you (Josuke, Okuyasu...): eating together gives extra stamina for the day. The
// master also pays cash for washing dishes in the back (pick a bowl, scrub it with the sponge, rinse, rack it).
//   game.places.ramen = { enter(), seat, served, washing, ... }      save: game.state.ramen
import * as THREE from 'three';
import { audio } from '../../core/audio.js';
import { ensureState } from '../../game/stateExt.js';
import { Human } from '../../people/Human.js';
import { makeSpec } from '../../people/presets.js';
import { hex } from '../../people/paintlib.js';
import { draw5 } from '../../gfx/font5x7.js';
import { makeToolMesh } from '../../game/Held.js';
import { FOODS } from '../../needs/foods.js';
import { kanji } from '../vending/canArt.js';
import { whenPhotosReady } from '../../products/photos.js';
import { ticketsArt, plaqueArt, menuCardArt, signArt, norenArt, boardArt, flagArt, beerPosterArt } from '../../products/ramenArt.js';
import { PanelMode } from '../vending/panel.js';
import { IKit, imats, surf, convertAll } from '../ikit.js';
import { pixCanvas, hitBox, prop, sitDown, standUp, paperFill } from '../util.js';
import { payCash, earnCash, yen } from '../money.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const O = V(120, 0, -80);
const L = (x, y, z) => V(O.x + x, y, O.z + z);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rnd = (a, b) => a + Math.random() * (b - a);
const FRONT = { door: V(13.9, 0, 18.4) }; // FE4's front door (Town.js)
const MENU = ['rm_shoyu', 'rm_miso', 'rm_tonkotsu', 'rm_shio', 'rm_tantan', 'rm_gyoza', 'rm_rice', 'rm_chashu', 'rm_beer', 'rm_sake', 'rm_oolong', 'rm_kaedama'];
const COOK = { rm_shoyu: 16, rm_miso: 18, rm_tonkotsu: 18, rm_shio: 15, rm_tantan: 20, rm_gyoza: 14, rm_rice: 4, rm_chashu: 8, rm_beer: 3, rm_sake: 6, rm_oolong: 3, rm_kaedama: 10 };
const PROP = { rm_shoyu: 'rm_bowl_shoyu', rm_miso: 'rm_bowl_miso', rm_tonkotsu: 'rm_bowl_tonkotsu', rm_shio: 'rm_bowl_shio', rm_tantan: 'rm_bowl_tantan', rm_gyoza: 'rm_gyoza', rm_rice: 'rm_rice', rm_chashu: 'rm_chashu', rm_beer: 'rm_beer', rm_sake: 'rm_sake', rm_oolong: 'rm_oolong', rm_kaedama: 'rm_bowl_shoyu' };
const SHORT = { rm_shoyu: 'SHOYU', rm_miso: 'MISO', rm_tonkotsu: 'TONKOTSU', rm_shio: 'SHIO', rm_tantan: 'TANTAN', rm_gyoza: 'GYOZA X6', rm_rice: 'RICE', rm_chashu: 'CHASHU DON', rm_beer: 'BEER', rm_sake: 'HOT SAKE', rm_oolong: 'OOLONG', rm_kaedama: 'KAEDAMA' };
const SEATS = [-2.05, -1.38, -0.71, -0.04, 0.63, 1.28];
const SEAT_Z = 0.3, TOP_Y = 1.0, SERVE_Z = -0.3;
const FRIENDS = { josuke: { name: 'Josuke', order: 'rm_shoyu', yum: ['Not bad, not bad at all. Great!', 'Yo, this broth is crazy good.', 'Hey, don\'t look at my hair while I eat.'] }, okuyasu: { name: 'Okuyasu', order: 'rm_tonkotsu', yum: ['WHOA! My tongue is having a festival!', 'Mmmh! I could cry! Am I crying?!', 'This is... this is the best ramen of my LIFE. Again.'] }, rohan: { name: 'Rohan', order: 'rm_shio', yum: ['Hm. Acceptable. The yuzu is a nice detail.', 'Do not slurp at me.', 'I am sketching the steam. Be quiet.'] } };
const WASH = 10;
/** A prop with its own materials, in the room's lamp light. */
const iprop = (places, id, ...a) => convertAll(prop(id, null, ...a), places._ikConv ||= (m) => places.mat(m));

export class Ramen {
  constructor(game, places) {
    this.game = game;
    this.places = places;
    this.town = game.garage.town;
    this.s = ensureState(game, 'ramen', { v: 1, visits: 0, bowls: 0, lastWash: 0, washes: 0, met: false, withFriends: 0 });
    this.served = [];
    this.queue = [];
    this.friends = [];
    this.steamT = 0;
    this.seatI = -1;
    this.buildFront();
    this.group = new THREE.Group();
    this.group.name = 'ramen';
    game.scene.add(this.group);
    this.buildRoom();
    this.buildKitchen();
    this.buildMaster();
    this.buildTicketMachine();
    this.buildMenu();
    this.buildPhone();
    this.buildSink();
    places.add({
      id: 'ramen', name: 'Ramen Yamada', group: this.group,
      spawn: { ...L(1.9, 0, 1.95), yaw: 0 }, exit: { x: FRONT.door.x, z: FRONT.door.z - 0.8, yaw: 0 },
      lamp: { ...L(0, 2.2, 0.15), color: 0xffdcb0, intensity: 4.2 },
      lamp2: { ...L(-0.3, 2.2, -1.6), color: 0xfff0d8, intensity: 3.2 },
      far: 28,
      onEnter: () => this.onEnter(), onExit: () => this.onExit(), update: (dt) => this.tick(dt),
    });
    this.fontsReady = document.fonts?.load ? document.fonts.load('16px "DotGothic16"', 'らーめん山田営業中醤油味噌豚骨塩担々麺餃子ライスチャーシュー丼瓶ビール熱燗烏龍茶替え玉食券お品書き') : Promise.resolve();
    Promise.all([this.fontsReady, whenPhotosReady()]).then(() => this.redrawArt());
  }

  // ------------------------------------------------------------------ the shopfront on the lane (FE4)
  buildFront() {
    const g = this.game, t = this.town, m = t.m;
    const grp = new THREE.Group();
    grp.name = 'ramen:front';
    g.scene.add(grp);
    const B = new t.B.constructor();
    const dx = FRONT.door.x, z = FRONT.door.z;
    // a wooden sliding door with glass panes over the house door (the lattice, the frosted lower panel)
    B.box(m.wood, 1.16, 0.08, 0.1, dx, 2.08, z - 0.08, { tint: 0x6a4428 });
    B.box(m.wood, 1.2, 0.04, 0.12, dx, 0, z - 0.08, { tint: 0x5a3a20 });
    for (const sx of [-0.56, 0.56]) B.box(m.wood, 0.06, 2.1, 0.1, dx + sx, 0, z - 0.08, { tint: 0x6a4428 });
    for (const lx of [-0.27, 0.27]) {
      for (const y of [0.04, 0.72, 2.0]) B.box(m.wood, 0.5, 0.04, 0.05, dx + lx, y, z - 0.11, { tint: 0x7a5030 });
      for (const sx of [-0.24, 0.24]) B.box(m.wood, 0.03, 2.0, 0.05, dx + lx + sx, 0.04, z - 0.11, { tint: 0x7a5030 });
      for (let i = 1; i < 4; i++) B.box(m.wood, 0.015, 1.28, 0.03, dx + lx - 0.24 + i * 0.12, 0.74, z - 0.12, { tint: 0x7a5030 });
      B.box(m.wood, 0.46, 0.66, 0.02, dx + lx, 0.06, z - 0.105, { tint: 0x5a3a20 });
    }
    // the eave and the signboard above
    B.box(m.wood, 2.6, 0.06, 0.55, dx - 0.3, 2.32, z - 0.27, { tint: 0x4a3020, rx: 0.08 });
    B.build(grp);
    this.frontGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.28), new THREE.MeshBasicMaterial({ color: 0x6a5238 }));
    this.frontGlass.position.set(dx, 0.74 + 0.64, z - 0.1);
    this.frontGlass.rotation.y = Math.PI;
    grp.add(this.frontGlass);
    // signboard, noren, lantern, the standing menu, a nobori flag
    this.sign = pixCanvas(320, 64);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.46, 0.06), [t.P(0.7), t.P(0.7), t.P(0.7), t.P(0.7), new THREE.MeshStandardMaterial({ map: this.sign.tex, roughness: 0.6 }), t.P(0.7)]);
    sign.position.set(dx - 0.3, 2.68, z - 0.06); sign.rotation.y = Math.PI;
    grp.add(sign);
    this.noren = pixCanvas(96, 64);
    const norenMat = new THREE.MeshStandardMaterial({ map: this.noren.tex, roughness: 0.95, side: THREE.DoubleSide });
    this.norenStrips = [];
    for (let i = 0; i < 3; i++) {
      const geo = new THREE.PlaneGeometry(0.36, 0.52);
      const uv = geo.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setX(k, (i + uv.getX(k)) / 3);
      geo.translate(0, -0.26, 0);
      const s = new THREE.Mesh(geo, norenMat);
      s.position.set(dx + 0.37 - i * 0.37, 2.08, z - 0.2); s.rotation.y = Math.PI;
      grp.add(s);
      this.norenStrips.push(s);
    }
    B.box(m.metal, 1.2, 0.025, 0.025, dx, 2.08, z - 0.2);
    const lan = prop('rm_lantern', null, dx - 0.78, 1.55, z - 0.32, 0, 0.75);
    grp.add(lan);
    this.lantern = lan;
    this.board = pixCanvas(96, 144);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.75), new THREE.MeshStandardMaterial({ map: this.board.tex, roughness: 0.85 }));
    board.position.set(11.6, 0.62, 15.35); board.rotation.set(-0.12, Math.PI + 0.25, 0);
    grp.add(board);
    for (const sx of [-0.22, 0.22]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.0, 0.04), t.P(0.8)); leg.position.set(11.6 + sx * Math.cos(0.25), 0.5, 15.38 - sx * Math.sin(0.25)); leg.rotation.y = 0.25; grp.add(leg); }
    this.flag = pixCanvas(32, 128);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 1.4), new THREE.MeshStandardMaterial({ map: this.flag.tex, roughness: 0.9, side: THREE.DoubleSide }));
    flag.position.set(15.05, 1.45, 15.2); flag.rotation.y = Math.PI;
    grp.add(flag);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.3, 6), t.P(0.4, 0.6));
    pole.position.set(15.25, 1.15, 15.2); grp.add(pole);
    g.player.addObstacle(11.35, 11.85, 15.15, 15.55);
    this.redrawArt();
    // the door into the shop
    const hb = hitBox(1.1, 2.0, 0.2, dx, 1.0, z - 0.1);
    grp.add(hb);
    this.places.door(hb, { to: 'ramen', text: 'Ramen Yamada', sub: 'Go in. Something smells amazing.', reach: 2.3, can: () => (this.openNow() ? null : 'Closed. Open 11:00 - 24:00') });
    this.front = grp;
  }

  openNow() { const h = this.game.clock?.hours ?? 18; return h >= 11 || h < 0.5 || !this.game.clock; }

  redrawArt() {
    // (painted by the label studio: src/products/ramenArt.js)
    this.sign?.redraw((c) => signArt().draw(c, 0, 0, 1));
    this.noren?.redraw((c) => norenArt().draw(c, 0, 0, 1));
    this.board?.redraw((c) => boardArt(FOODS).draw(c, 0, 0, 1));
    this.flag?.redraw((c) => flagArt().draw(c, 0, 0, 1));
    this.posterArt?.redraw((c) => beerPosterArt().draw(c, 0, 0, 1));
    this.redrawPlaques?.();
    this.drawTickets?.();
    this.drawMenuCard?.();
  }

  // ------------------------------------------------------------------ the room (off the map)
  buildRoom() {
    const g = this.game, P = this.places;
    const conv = P._ikConv ||= (mm) => P.mat(mm);
    const K = new IKit(imats(conv)), F = K.at(O.x, 0, O.z, 0);
    const H = 2.6, TIL = 0xe4e0d2, WAIN = 0x6e4a2e, PLA = 0xe0d3b6, OAK = 0x5a3822;
    // ---- floor: red quarry tiles out front, wet concrete behind the counter; a drain channel by the sink
    F.box('ftile', -3, -0.04, -0.25, 3, 0, 2.5, { tint: 0x94584a });
    F.box('stain', -3, -0.04, -2.5, 3, -0.002, -0.25, { tint: 0x7c766c });
    F.box('zinc', -2.95, -0.003, -1.86, 2.95, 0.001, -1.76, { tint: 0x8a8e90 });
    for (let x = -2.9; x < 2.9; x += 0.05) F.box('flat', x, 0.0005, -1.85, x + 0.012, 0.0015, -1.77, { tint: 0x2e2c2a });
    // ---- walls: a board wainscot with its rail out front, white tiles round the kitchen, aged plaster above
    const wall = (Fr, a, b, hole = null) => {
      if (hole) { Fr.box('plaster', a, 0, -0.12, b, hole[0], 0, { tint: PLA }); Fr.box('plaster', a, hole[1], -0.12, b, H, 0, { tint: PLA }); } else Fr.box('plaster', a, 0, -0.12, b, H, 0, { tint: PLA });
      Fr.box('wood', a, 0, 0, b, 0.9, 0.018, { tint: WAIN, grain: 'y' });
      for (let x = a + 0.15; x < b - 0.05; x += 0.15) Fr.box('wood', x - 0.004, 0.08, 0.017, x + 0.004, 0.9, 0.021, { tint: 0x4e3220 });
      Fr.box('timber', a, 0.88, 0, b, 0.94, 0.04, { tint: 0x4a2e1c, grain: 'x', bevel: 0.006 });
      Fr.box('timber', a, 0, 0, b, 0.08, 0.026, { tint: 0x3a2416, grain: 'x', bevel: 0.004 });
      Fr.box('timber', a, H - 0.07, 0, b, H, 0.028, { tint: 0x4a2e1c, grain: 'x', bevel: 0.004 });
    };
    const tiles = (Fr, a, b) => {
      Fr.box('plaster', a, 0, -0.12, b, H, 0, { tint: PLA });
      Fr.box('tile', a, 0, 0, b, 1.86, 0.012, { tint: TIL });
      Fr.box('tile', a, 1.86, 0, b, 1.9, 0.02, { tint: 0xd8d2c2, bevel: 0.006 });
      Fr.box('timber', a, H - 0.07, 0, b, H, 0.028, { tint: 0x4a2e1c, grain: 'x', bevel: 0.004 });
    };
    const FB = K.at(O.x, 0, O.z - 2.5, 0), FL = K.at(O.x - 3, 0, O.z, Math.PI / 2), FR = K.at(O.x + 3, 0, O.z, -Math.PI / 2), FFr = K.at(O.x, 0, O.z + 2.5, Math.PI);
    tiles(FB, -3, 3);                         // back wall (local x = x)
    tiles(FL, 0.25, 2.5); wall(FL, -2.5, 0.25);  // west wall: local x = -z
    tiles(FR, -2.5, -0.25); wall(FR, -0.25, 2.5); // east wall: local x = z
    // front wall (local x = -x): either side of the door x 1.45..2.35, the window at x -0.8..1.2
    wall(FFr, -1.45, -1.2); wall(FFr, -1.2, 0.8, [1.05, 1.9]); wall(FFr, 0.8, 3); wall(FFr, -3, -2.35);
    FFr.box('plaster', -2.35, 2.05, -0.12, -1.45, H, 0, { tint: PLA });
    // ---- a frosted window in the front wall, left of the door, glowing with the lane outside
    const wx0 = -0.8, wx1 = 1.2, wy0 = 1.05, wy1 = 1.9; // world-x range (local -x)
    this.daylight = new THREE.MeshBasicMaterial({ map: surf('frosted_glass'), color: 0xf4ead8 });
    const pane = FFr.glass(wx1 - wx0, wy1 - wy0, -(wx0 + wx1) / 2, (wy0 + wy1) / 2, -0.03, { mat: this.daylight }); pane.renderOrder = 0;
    FFr.sash(-wx1, -wx0, wy0, wy1, 0.02, { depth: 0.06, noGlass: true, tint: 0xb8bcc0 });
    for (let i = 1; i < 8; i++) { const x = -wx1 + (wx1 - wx0) * i / 8; FFr.box('wood', x - 0.008, wy0, 0.022, x + 0.008, wy1, 0.04, { tint: 0x5a3a22, grain: 'y' }); }
    FFr.box('wood', -wx1 - 0.08, wy0 - 0.05, 0, -wx0 + 0.08, wy0 - 0.02, 0.12, { tint: 0x6a4428, grain: 'x', bevel: 0.006 });
    // ---- the shop door from inside: a wooden sliding door, glass over a lattice, a board below, the lane behind
    const dX = 1.9, dw = 0.9;
    const lane = new THREE.MeshBasicMaterial({ map: surf('frosted_glass'), color: 0xe8e0d0 });
    this.laneMat = lane;
    FFr.glass(dw - 0.12, 1.25, -dX, 1.32, -0.02, { mat: lane }).renderOrder = 0;
    for (const sx of [-1, 1]) FFr.box('wood', -dX + sx * dw / 2 - 0.04, 0, -0.06, -dX + sx * dw / 2 + 0.04, 2.08, 0.06, { tint: 0x4e301c, grain: 'y', bevel: 0.006 });
    FFr.box('wood', -dX - dw / 2 - 0.04, 2.0, -0.06, -dX + dw / 2 + 0.04, 2.08, 0.06, { tint: 0x4e301c, grain: 'x', bevel: 0.006 });
    const lx0 = -dX - dw / 2 + 0.02, lx1 = -dX + dw / 2 - 0.02;
    FFr.box('wood', lx0, 0.01, 0.0, lx0 + 0.05, 1.99, 0.04, { tint: 0x6a4428, grain: 'y', bevel: 0.004 });
    FFr.box('wood', lx1 - 0.05, 0.01, 0.0, lx1, 1.99, 0.04, { tint: 0x6a4428, grain: 'y', bevel: 0.004 });
    for (const [y0, y1] of [[0.01, 0.08], [0.66, 0.72], [1.93, 1.99]]) FFr.box('wood', lx0 + 0.05, y0, 0.0, lx1 - 0.05, y1, 0.04, { tint: 0x6a4428, grain: 'x', bevel: 0.004 });
    FFr.box('wood', lx0 + 0.05, 0.08, 0.008, lx1 - 0.05, 0.66, 0.026, { tint: 0x5a3a22, grain: 'y' });
    for (let i = 1; i < 6; i++) { const x = lx0 + 0.05 + (lx1 - lx0 - 0.1) * i / 6; FFr.box('wood', x - 0.007, 0.72, 0.012, x + 0.007, 1.93, 0.03, { tint: 0x6a4428, grain: 'y' }); }
    FFr.box('chrome', lx0 + 0.06, 0.95, 0.04, lx0 + 0.08, 1.12, 0.05, { bevel: 0.004 });
    // ---- ceiling: boards and battens, browned over the kitchen; a duct from the hood
    F.box('ply', -3, H, -2.5, 3, H + 0.02, 2.5, { tint: 0xcdb894 });
    for (let x = -2.4; x < 3; x += 0.6) F.box('wood', x - 0.018, H - 0.03, -2.5, x + 0.018, H, 2.5, { tint: 0x8a6440, grain: 'z' });
    F.box('ply', -2.2, H - 0.003, -2.5, 1.4, H, -1.2, { tint: 0xa88e6a });
    // ---- the counter: board front, thick light top with a rounded nose, the raised ledge, the chrome foot rail
    const cx0 = -2.55, cx1 = 1.45;
    F.box('timber', cx0, 0.06, -0.76, cx1, 0.95, -0.27, { tint: OAK, grain: 'y', bevel: 0.006 });
    F.box('timber', cx0 + 0.01, 0, -0.74, cx1 - 0.01, 0.06, -0.31, { tint: 0x2a1c14 });
    for (let x = cx0 + 0.12; x < cx1 - 0.05; x += 0.12) F.box('timber', x - 0.004, 0.08, -0.268, x + 0.004, 0.93, -0.262, { tint: 0x3e2618 });
    F.box('wood', cx0 - 0.05, 0.95, -0.78, cx1 + 0.05, TOP_Y, -0.13, { tint: 0xd6ae78, grain: 'x', bevel: 0.016 });
    F.box('wood', cx0, TOP_Y, -0.8, cx1, 1.13, -0.64, { tint: 0xc89c66, grain: 'x', bevel: 0.01 });
    F.box('timber', cx0, 0.95, -0.82, cx1, 1.15, -0.79, { tint: OAK, grain: 'x', bevel: 0.004 });
    F.rod('chrome', [cx0 + 0.05, 0.16, -0.17], [cx1 - 0.05, 0.16, -0.17], 0.017, { sides: 14 });
    for (let x = cx0 + 0.2; x < cx1; x += 0.95) { F.rod('chrome', [x, 0.16, -0.17], [x, 0.16, -0.27], 0.012, { sides: 10 }); F.rod('chrome', [x, 0.16, -0.17], [x, 0.0, -0.17], 0.012, { sides: 10 }); }
    // condiment trays: soy cruet, vinegar, chilli oil, pepper, the chopstick box, a napkin holder
    for (const x of [-1.72, -0.38, 0.95]) {
      F.box('wood', x - 0.11, TOP_Y, -0.68, x + 0.11, TOP_Y + 0.018, -0.58, { tint: 0x4a2e1c, bevel: 0.004 });
      const y = TOP_Y + 0.018;
      F.lathe('glass2', x - 0.075, y, -0.63, [[0, 0], [0.022, 0], [0.024, 0.04], [0.016, 0.07], [0.008, 0.085], [0.008, 0.1], [0, 0.1]], 14, { tint: 0x3a2010 });
      F.lathe('gloss', x - 0.075, y + 0.1, -0.63, [[0.0, 0], [0.011, 0], [0.011, 0.014], [0, 0.016]], 10, { tint: 0xc8302a });
      F.lathe('glass2', x - 0.03, y, -0.63, [[0, 0], [0.02, 0], [0.022, 0.05], [0.012, 0.075], [0.008, 0.09], [0, 0.09]], 14, { tint: 0xd8c08a });
      F.lathe('gloss', x - 0.03, y + 0.09, -0.63, [[0.0, 0], [0.01, 0], [0.01, 0.012], [0, 0.014]], 10, { tint: 0x2a2a2e });
      F.lathe('glass2', x + 0.015, y, -0.63, [[0, 0], [0.024, 0], [0.025, 0.05], [0.024, 0.055], [0, 0.055]], 14, { tint: 0xb8302a });
      F.lathe('chrome', x + 0.015, y + 0.055, -0.63, [[0.0, 0], [0.026, 0], [0.026, 0.012], [0, 0.016]], 14);
      F.lathe('gloss', x + 0.06, y, -0.63, [[0, 0], [0.016, 0], [0.017, 0.05], [0.015, 0.06], [0, 0.062]], 12, { tint: 0xf2eee6 });
      F.box('wood', x + 0.12, TOP_Y, -0.67, x + 0.19, TOP_Y + 0.11, -0.53, { tint: 0xc8a06a, bevel: 0.006 });
      for (let k = 0; k < 5; k++) F.box('wood', x + 0.13 + k * 0.011, TOP_Y + 0.11, -0.64, x + 0.136 + k * 0.011, TOP_Y + 0.15, -0.56, { tint: 0xe2c89a });
      F.box('satin', x - 0.2, TOP_Y, -0.6, x - 0.14, TOP_Y + 0.085, -0.56, { tint: 0xd8dcdc, bevel: 0.004 });
      F.box('paper', x - 0.195, TOP_Y + 0.02, -0.598, x - 0.145, TOP_Y + 0.1, -0.562, { tint: 0xf4f2ec });
    }
    // ---- the kitchen: stainless back counter with its doors, bowl shelves, the low range for the stock pots, the griddle
    F.box('zinc', -2.95, 0.12, -2.48, 2.95, 0.84, -1.9, { tint: 0xc4c8ca, bevel: 0.008 });
    F.box('zinc', -2.97, 0.84, -2.5, 2.97, 0.87, -1.88, { tint: 0xd4d8da, bevel: 0.006 });
    F.box('zinc', -2.95, 0.87, -2.5, 2.95, 0.95, -2.48, { tint: 0xd0d4d6 });
    for (let x = -2.9; x < 2.9; x += 0.6) {
      F.box('zinc', x + 0.02, 0.16, -1.905, x + 0.56, 0.8, -1.895, { tint: 0xd2d6d8, bevel: 0.004 });
      F.box('chrome', x + 0.42, 0.6, -1.895, x + 0.52, 0.615, -1.875, { bevel: 0.004 });
    }
    for (const x of [-2.9, 0, 2.9]) F.bx('zinc', 0.04, 0.12, 0.04, x, 0, -1.94, { tint: 0x9a9ea0 });
    for (const y of [1.55, 1.95]) {
      F.box('wood', -2.0, y, -2.485, 2.4, y + 0.03, -2.22, { tint: 0x7a5232, grain: 'x', bevel: 0.004 });
      for (const x of [-1.9, 0.2, 2.3]) F.box('satin', x - 0.012, y - 0.12, -2.485, x + 0.012, y, -2.25, { tint: 0x6a6a6e });
    }
    F.box('zinc', -2.1, 0.08, -1.86, -1.0, 0.66, -1.24, { tint: 0x9aa0a4, bevel: 0.01 });
    F.box('flat', -2.1, 0, -1.84, -1.0, 0.08, -1.26, { tint: 0x2e2e30 });
    for (const x of [-1.8, -1.3]) {
      F.lathe('flat', x, 0.66, -1.55, [[0.0, 0], [0.2, 0], [0.2, 0.012], [0.0, 0.012]], 20, { tint: 0x2a2a2c });
      F.lathe('flat', x, 0.672, -1.55, [[0.08, 0], [0.09, 0.02], [0.1, 0.02], [0.11, 0]], 16, { tint: 0x3a3a3c });
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; F.box('flat', x + Math.cos(a) * 0.1 - 0.012, 0.672, -1.55 + Math.sin(a) * 0.1 - 0.012, x + Math.cos(a) * 0.17 + 0.012, 0.7, -1.55 + Math.sin(a) * 0.17 + 0.012, { tint: 0x1e1e20 }); }
      F.lathe('chrome', x, 0.42, -1.235, [[0, 0], [0.02, 0], [0.022, 0.02], [0.016, 0.03], [0, 0.03]], 12, { axis: 'z' });
    }
    F.pipe('satin', [[-2.95, 0.3, -1.3], [-2.2, 0.3, -1.3], [-2.1, 0.3, -1.3]], 0.012, { tint: 0xc8a048 });
    F.box('flat', 1.1, 0.06, -1.88, 1.8, 0.75, -1.33, { tint: 0x323234, bevel: 0.01 });
    F.box('flat', 1.1, 0, -1.86, 1.8, 0.06, -1.35, { tint: 0x1e1e20 });
    F.box('satin', 1.11, 0.75, -1.87, 1.79, 0.78, -1.34, { tint: 0x2a2a2e, bevel: 0.006 });
    F.box('satin', 1.1, 0.78, -1.88, 1.8, 0.84, -1.86, { tint: 0x3a3a3e });
    for (const x of [1.25, 1.45, 1.65]) F.lathe('chrome', x, 0.45, -1.33, [[0, 0], [0.016, 0], [0.018, 0.018], [0, 0.022]], 10, { axis: 'z' });
    // the hood over the range: a stainless canopy with a lip, filters, the duct
    F.box('zinc', -2.1, 2.3, -2.06, 1.3, 2.36, -1.32, { tint: 0xc8ccce, bevel: 0.01 });
    F.box('zinc', -2.1, 2.12, -1.36, 1.3, 2.3, -1.3, { tint: 0xd0d4d6, bevel: 0.008 });
    F.box('zinc', -2.1, 2.12, -2.06, 1.3, 2.3, -2.0, { tint: 0xc0c4c6, bevel: 0.008 });
    for (const x of [-2.1, 1.24]) F.box('zinc', x, 2.12, -2.0, x + 0.06, 2.3, -1.36, { tint: 0xc0c4c6 });
    for (let x = -1.95; x < 1.2; x += 0.5) F.box('satin', x, 2.29, -1.98, x + 0.46, 2.3, -1.4, { tint: 0x9aa0a2 });
    F.box('zinc', -0.6, 2.36, -1.9, -0.2, H, -1.5, { tint: 0xb8bcbe, bevel: 0.01 });
    for (const x of [-1.9, 1.1]) F.rod('satin', [x, 2.36, -1.7], [x, H, -1.7], 0.008, { tint: 0x8a8e90, sides: 8 });
    // the side table for the dirty bowls, the TV shelf, the sake shelf over the back counter
    F.box('zinc', -2.87, 0.1, -1.16, -2.37, 0.79, -0.74, { tint: 0xb4b8ba, bevel: 0.008 });
    F.box('zinc', -2.89, 0.79, -1.18, -2.35, 0.82, -0.72, { tint: 0xc8ccce, bevel: 0.005 });
    for (const [x, z] of [[-2.84, -1.13], [-2.4, -1.13], [-2.84, -0.77], [-2.4, -0.77]]) F.bx('zinc', 0.03, 0.1, 0.03, x, 0, z, { tint: 0x9a9ea0 });
    F.box('wood', -2.98, 1.94, 1.64, -2.5, 1.98, 2.16, { tint: 0x4a2e1c, bevel: 0.006 });
    for (const z of [1.7, 2.1]) F.box('timber', -2.98, 1.8, z - 0.015, -2.9, 1.94, z + 0.015, { tint: 0x3a2416 });
    F.box('wood', 1.6, 1.95, -2.49, 2.8, 1.98, -2.27, { tint: 0x6a4428, grain: 'x', bevel: 0.004 });
    for (let i = 0; i < 6; i++) {
      const x = 1.75 + i * 0.18, tall = 0.26 + (i % 2) * 0.05, c = [0x2a5a2a, 0xe8e0c8, 0x6a3a10, 0x1e3a6a][i % 4];
      F.lathe('glass2', x, 1.98, -2.38, [[0, 0], [0.035, 0], [0.036, tall * 0.62], [0.016, tall * 0.8], [0.012, tall], [0, tall]], 14, { tint: c });
      F.lathe('gloss', x, 1.98 + tall, -2.38, [[0, 0], [0.013, 0], [0.013, 0.02], [0, 0.02]], 10, { tint: 0xd8b048 });
      F.sticker('paper', [0, 0, 1, 1], '+z', x, 1.98 + tall * 0.35, -2.343, 0.05, 0.08, { tint: [0xf2ead2, 0xd23a2a, 0xf2ead2, 0xe8d088][i % 4] });
    }
    // ---- pendant lamps: red enamel shades over the counter
    for (const x of [-1.6, 0, 1.4]) {
      F.rod('flat', [x, H, 0.2], [x, 2.12, 0.2], 0.004, { tint: 0x1e1e1e, sides: 6 });
      F.lathe('gloss', x, 1.94, 0.2, [[0.17, 0], [0.165, 0.008], [0.12, 0.05], [0.06, 0.13], [0.03, 0.17], [0.022, 0.19], [0, 0.19]], 24, { tint: 0xc8402e });
      F.lathe('gloss', x, 1.945, 0.2, [[0.02, 0.17], [0.056, 0.125], [0.115, 0.05], [0.158, 0.008]], 24, { tint: 0xf2eee4, flip: true });
      F.lathe('glow', x, 1.93, 0.2, [[0, 0], [0.03, 0.01], [0.04, 0.04], [0.032, 0.07], [0.016, 0.09], [0, 0.09]], 14, { tint: 0xfff0c8 });
    }
    K.done(this.group, 'ramen');
    // stools
    this.stools = SEATS.map((x) => { const s = prop('rm_stool', null, O.x + x, 0, O.z + SEAT_Z); this.group.add(convertAll(s, conv)); return s; });
    // walls and the counter block you
    const pl = g.player, ob = (a, b, c, d) => pl.addObstacle(O.x + a, O.x + b, O.z + c, O.z + d);
    ob(-3.4, -2.95, -3, 3); ob(2.95, 3.4, -3, 3); ob(-3.4, 3.4, -2.95, -2.45); ob(-3.4, 1.45, 2.45, 2.95); ob(2.35, 3.4, 2.45, 2.95);
    ob(-2.6, 1.5, -2.45, -0.2); // the counter and everything behind it
    // the exit door (inside)
    const door = hitBox(0.9, 2.0, 0.1, ...L(1.9, 1.0, 2.46).toArray());
    this.group.add(door);
    g.interaction.add(door, { reach: 2.2, hint: () => ({ key: 'LMB', text: 'Leave', sub: this.served.some((s) => !s.done) ? 'You haven\'t finished!' : 'Back out to the lane' }), use: () => { this.leave(); return false; } });
    // stools to sit on
    SEATS.forEach((x, i) => {
      const hb = hitBox(0.38, 0.75, 0.38, ...L(x, 0.38, SEAT_Z).toArray());
      this.group.add(hb);
      g.interaction.add(hb, { reach: 2.2, hint: () => (this.seatI === i ? null : this.friends.some((f) => f.seat === i) ? null : { key: 'LMB', text: 'Sit at the counter', sub: this.ticketCount() ? 'The master takes your tickets' : 'Buy tickets at the machine by the door' }), use: () => { this.sit(i); return false; } });
    });
  }

  buildKitchen() {
    const P = this.places, grp = this.group;
    const add = (id, x, y, z, ry = 0, s = 1) => { const m = iprop(this.places, id, O.x + x, y, O.z + z, ry, s); grp.add(m); return m; };
    this.pots = [add('rm_pot', -1.8, 0.7, -1.55), add('rm_pot', -1.3, 0.7, -1.55, 0.6, 0.85)];
    this.boiler = add('rm_boiler', 0.2, 0, -1.5);
    for (let i = 0; i < 6; i++) add('rm_bowl_clean', -1.6 + i * 0.12, 1.585 + (i % 3) * 0.075, -2.36, i, 0.85);
    for (let i = 0; i < 8; i++) add('rm_bowl_clean', -0.2 + (i % 4) * 0.2, 1.985, -2.36, i, 0.8);
    add('rm_gyoza', 1.45, 0.78, -1.6, 0.3);
    add('rm_beer', 2.2, 0.86, -2.2, 0.2);
    add('rm_beer', 2.35, 0.86, -2.15, -0.4);
    add('rm_sake', 2.05, 0.86, -2.25);
    // the dirty bowls waiting by the sink
    this.dirtyStack = [];
    for (let i = 0; i < 5; i++) this.dirtyStack.push(add('rm_bowl_dirty', -2.62, 0.82 + i * 0.065, -0.95, i * 0.7, 0.92));
    this.rack = add('rm_rack', -2.62, 0.86, -2.15, Math.PI / 2, 0.9);
    add('mk_kamidana', 0.6, 2.05, -2.42, 0);
    add('pendulum_clock', -2.2, 1.45, -2.46, 0);
    add('manekineko', 1.38, 1.0, -0.42, -0.3);
    add('crt_tv', -2.72, 1.98, 1.9, Math.PI / 2, 0.85);
    // posters, a clock, the TV up in the corner
    const poster = pixCanvas(64, 96, (c) => beerPosterArt().draw(c, 0, 0, 1));
    const pm = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.63), P.mat(new THREE.MeshStandardMaterial({ map: poster.tex, roughness: 0.8 })));
    pm.position.copy(L(-2.96, 1.6, 1.4)); pm.rotation.y = Math.PI / 2;
    grp.add(pm);
    this.posterArt = poster;
  }

  // ------------------------------------------------------------------ the master
  buildMaster() {
    const spec = makeSpec('construction', 808);
    Object.assign(spec, {
      name: 'Master', H: 1.74, build: 1.12, belly: 0.25,
      hair: { style: 'buzz', col: hex(0x2a2428), hi: [120, 120, 140] },
      hat: { kind: 'headband', col: [240, 240, 236] },
      top: { kind: 'tee', col: hex(0x1e1e22), print: 'none', col2: hex(0xf0f0ec), sleeve: 'short' },
      bottom: { kind: 'slacks', col: hex(0x2a2a30), noCrease: true },
      shoes: { kind: 'boots', col: hex(0x1e1e22) },
      acc: [{ kind: 'apron', col: hex(0x2a3450), col2: [236, 232, 220] }, { kind: 'towel', col: [240, 240, 236] }],
      walk: { style: 'heavy' },
    });
    spec.face = { ...spec.face, stubble: 0.7, browW: 1.5 };
    const h = new Human(spec, { lazy: true });
    h.tts = { gender: 'm', pitch: 0.82, rate: 1.05, seed: 88 };
    this.master = { h, home: L(-0.35, 0, -1.05), look: null };
    h.root.position.copy(this.master.home);
    h.root.rotation.y = 0;
    this.group.add(h.root);
    const hit = hitBox(0.6, 1.8, 0.5, 0, 0.9, 0);
    h.root.add(hit);
    this.game.interaction.add(hit, { reach: 2.8, hint: () => (this.game.talk?.active ? null : { key: 'LMB', text: 'Talk to the master', sub: 'Gruff. Excellent broth.' }), use: () => { this.talkMaster(); return false; } });
    this.who = { name: 'Master', id: 'ramen_master', h, color: '#f0a040', tts: h.tts };
  }

  shout(text, dur) {
    const g = this.game;
    if (!g.bubbles) return;
    audio.play('shout', { vol: 0.4 });
    g.bubbles.say(this.master.h, text, { dur: dur ?? Math.max(2.2, 1 + text.length * 0.05), style: 'shout' });
  }

  talkMaster() {
    const g = this.game, S = this.s, self = this;
    if (g.talk?.active || this.washing) return;
    g.talk.start(this.who, async (t) => {
      if (!S.met) { S.met = true; await t.say('Irasshai. Tickets from the machine, sit anywhere. Slurp loud. It\'s polite.'); await t.say('Broth\'s been going eighteen hours. Don\'t you dare leave any.'); }
      else await t.say(pick(['Hm.', 'Oi. Hungry?', 'What.']));
      for (let r = 0; r < 4; r++) {
        const canWash = self.washAvailable();
        const i = await t.choose(['What\'s good today?', canWash === true ? 'Need someone to wash dishes?' : 'Long day?', r === 0 ? 'Is Hiroshi your son?' : 'See you, master.']);
        if (i === 0) {
          const N = g.needs;
          if (N?.hangover > 0.2) await t.say('You look like death. Shio. Salt broth, yuzu. Fixes anything. And an oolong.');
          else if (N && N.energy < 30) await t.say('Tonkotsu. It\'ll put you back on your feet. Then flat on your back. Then on your feet again.');
          else await t.say(pick(['Shoyu. Always shoyu. The rest is for tourists.', 'Gyoza and a beer, if you\'re not working.', 'Tantan-men, if you\'re brave. Finish the soup and I\'ll respect you.']));
        } else if (i === 1 && canWash === true) {
          await t.say('...You serious? The sink\'s in the back. Ten bowls. Scrub them, rinse them, rack them.');
          await t.say('¥1,200, cash. Break one and it comes out of it.');
          const y = await t.choose(['I\'m in.', 'Maybe later.']);
          if (y === 0) { await t.say('Hn. Apron\'s on the hook.'); self.startWash = true; return; }
        } else if (i === 1) {
          await t.say(typeof canWash === 'string' ? canWash : 'Every day\'s long when you stand over a pot.');
        } else if (r === 0) {
          await t.say('...Upstairs. Calls himself "Lord Kuromaru" now. Keeper of some shadow.', { gesture: 'shrug' });
          await t.say('Still comes down for tantan-men at seven sharp. Sorcerers eat like anyone else.');
        } else { await t.say(pick(['Hn.', 'Come back hungry.', 'Arigatou gozaimashita.'])); return; }
      }
    }, { name: 'Master', id: 'ramen_master', color: '#f0a040' }).then(() => { if (this.startWash) { this.startWash = false; this.washStart(); } });
  }

  // ------------------------------------------------------------------ the ticket machine (食券機)
  buildTicketMachine() {
    const g = this.game, P = this.places, t = this.town;
    const root = new THREE.Group();
    root.position.copy(L(2.68, 0, 1.15));
    root.rotation.y = -Math.PI / 2;
    this.group.add(root);
    root.updateMatrixWorld(true);
    void t;
    // the cabinet: a pressed steel case on a plinth, the panel under a hood, the coin and note slots, the return lever,
    // the ticket chute with its tray, the change cup
    const K = new IKit(imats(P._ikConv ||= (mm) => P.mat(mm))), F = K.root;
    F.box('paint', -0.31, 0.06, -0.225, 0.31, 1.5, 0.2, { tint: 0xd6dade, bevel: 0.018 });
    F.box('flat', -0.29, 0, -0.2, 0.29, 0.06, 0.17, { tint: 0x2e3034 });
    F.box('paint', -0.32, 1.5, -0.235, 0.32, 1.62, 0.235, { tint: 0xc8302a, bevel: 0.02 });
    F.box('satin', -0.29, 0.84, 0.2, 0.29, 1.56, 0.226, { tint: 0x9aa0a6, bevel: 0.006 });
    F.box('satin', -0.3, 1.55, 0.2, 0.3, 1.58, 0.27, { tint: 0xb8bcc0, bevel: 0.006 });
    F.box('satin', -0.27, 0.46, 0.2, 0.27, 0.8, 0.222, { tint: 0xb4b8bc, bevel: 0.006 });
    F.box('flat', 0.08, 0.66, 0.222, 0.24, 0.7, 0.226, { tint: 0x1e1e22 });
    F.box('flat', -0.24, 0.7, 0.222, -0.04, 0.73, 0.226, { tint: 0x1e1e22 });
    F.box('chrome', 0.13, 0.56, 0.222, 0.2, 0.6, 0.25, { bevel: 0.006 });
    F.box('flat', -0.15, 0.53, 0.222, 0.15, 0.59, 0.234, { tint: 0x2a2a2e, bevel: 0.006 });
    F.box('satin', -0.17, 0.2, 0.2, 0.17, 0.4, 0.26, { tint: 0xa8acb0, bevel: 0.01 });
    F.box('flat', -0.12, 0.24, 0.255, 0.12, 0.34, 0.262, { tint: 0x26262a });
    F.box('satin', -0.28, 0.08, 0.2, 0.28, 0.12, 0.22, { tint: 0x9aa0a6 });
    K.done(root, 'ramen:tickets');
    this.tm = { root, canvas: pixCanvas(300, 372), sel: 0 };
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.67), new THREE.MeshBasicMaterial({ map: this.tm.canvas.tex, color: 0xdedede }));
    panel.position.set(0, 1.2, 0.228); panel.raycast = () => {};
    root.add(panel);
    const hb = hitBox(0.62, 1.55, 0.1, 0, 0.78, 0.25);
    root.add(hb);
    g.interaction.add(hb, { reach: 2.2, hint: () => ({ key: 'LMB', text: 'Ticket machine', sub: 'Choose, pay, take the ticket. Then sit at the counter.' }), use: () => { this.openTickets(); return false; } });
    this.pm = new PanelMode(g, {
      onMove: (dx, dy) => { const c = this.tm.sel % 3, r = Math.floor(this.tm.sel / 3); this.tm.sel = ((r + dy + 4) % 4) * 3 + (c + dx + 3) % 3; audio.play('vendBeep', { vol: 0.25, f: 1760 }); this.drawTickets(); },
      onAct: () => this.buyTicket(),
      hint: () => { const f = FOODS[MENU[this.tm.sel]]; return { key: 'LMB', text: `${f.name}  ${yen(f.price)}`, sub: `${f.pros} · RMB step back` }; },
    });
    this.drawTickets();
  }
  local(x, y, z) { return this.tm.root.localToWorld(V(x, y, z)); }
  openTickets() {
    if (this.pm.active || this.game.cutscene.active) return;
    this.pm.enter({ pos: this.local(0, 1.24, 1.2), look: this.local(0, 1.2, 0.2), fov: 22 });
    this.drawTickets();
  }
  drawTickets() {
    if (!this.tm) return;
    const sel = this.pm?.active ? this.tm.sel : -1, blink = Math.floor((this.game.time || 0) * 3) % 2 === 0;
    this.tm.canvas.redraw((c) => ticketsArt(MENU, FOODS, sel, blink).draw(c, 0, 0, 1));
  }
  buyTicket() {
    const g = this.game, H = g.held, id = MENU[this.tm.sel], f = FOODS[id];
    if (id === 'rm_kaedama' && !this.served.some((s) => s.ramen)) { audio.play('vendNo', { vol: 0.5 }); g.news('Kaedama goes into a bowl you already have'); return; }
    const ti = H.find('meal_ticket');
    if (ti < 0 && !H.canTake()) { audio.play('vendNo', { vol: 0.5 }); g.news('Your hands are full', 'Free a slot for the ticket'); return; }
    if (!payCash(g, f.price, `Ramen Yamada: ${f.name}`, this.local(0.18, 0.95, 0.25))) { audio.play('vendNo', { vol: 0.5 }); return; }
    audio.play('ticket', { vol: 0.7 });
    if (ti >= 0) { H.slots[ti].data.dishes.push(id); g.events.emit('slot', H.sel); g.news(`Ticket: ${f.name}`, `${H.slots[ti].data.dishes.length} tickets in hand`); }
    else { const obj = makeToolMesh('meal_ticket'); obj.position.copy(this.local(0, 0.56, 0.3)); g.scene.add(obj); H.take('tool', { id: 'meal_ticket', dishes: [id], uses: 1 }, obj); }
    const t = H.slots[H.find('meal_ticket')];
    if (t?.data?.dishes) { t.data.uses = t.data.dishes.length; g.events.emit('slot', H.sel); }
  }
  ticketCount() { const i = this.game.held.find('meal_ticket'); return i >= 0 ? this.game.held.slots[i].data.dishes?.length || 0 : 0; }

  // ------------------------------------------------------------------ the menu plaques on the wall (お品書き)
  buildMenu() {
    const g = this.game, P = this.places;
    this.plaques = MENU.slice(0, 11).map((id, i) => {
      const art = pixCanvas(32, 88);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.36), P.mat(new THREE.MeshStandardMaterial({ map: art.tex, roughness: 0.7 })));
      m.position.copy(L(2.965, 1.55 + (i % 2) * 0.02, -0.15 + i * 0.105)); m.rotation.y = -Math.PI / 2;
      m.rotation.z = (i % 3 - 1) * 0.02;
      this.group.add(m);
      g.interaction.add(m, { reach: 2.2, hint: () => { const f = FOODS[id]; return { key: '', text: `${f.jp}  ${f.name}  ${yen(f.price)}`, sub: `+ ${f.pros}  - ${f.cons}` }; }, use: () => false });
      return { id, art };
    });
    this.redrawPlaques = () => {
      for (const p of this.plaques) p.art.redraw((c) => plaqueArt(FOODS[p.id]).draw(c, 0, 0, 1));
    };
    this.redrawPlaques();
    // laminated paper menus on the counter: pick one up and read it (point at a dish for what it does)
    this.menuCard = pixCanvas(352, 200);
    const cardMat = P.mat(new THREE.MeshStandardMaterial({ map: this.menuCard.tex, roughness: 0.4 }));
    this.cards = [1, 4].map((si) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.33, 0.19).rotateX(-Math.PI / 2), cardMat);
      m.position.copy(L(SEATS[si] + 0.3, TOP_Y + 0.004, -0.22)); m.rotation.y = 0.12 * (si - 2.5);
      this.group.add(m);
      g.interaction.add(m, { reach: 2, hint: () => ({ key: 'LMB', text: 'Read the menu', sub: 'A laminated card, a little sticky' }), use: () => { this.readMenu(m); return false; } });
      return m;
    });
    this.menuSel = 0;
    this.menuPm = new PanelMode(g, {
      onMove: (dx, dy) => { const c = this.menuSel >= 6 ? 1 : 0, r = this.menuSel % 6; this.menuSel = ((c + dx + 2) % 2) * 6 + (r + dy + 6) % 6; audio.play('paper', { vol: 0.3 }); this.drawMenuCard(); },
      onAct: () => { const f = FOODS[MENU[this.menuSel]]; this.shout(this.menuSel === 0 ? 'Good choice. Ticket from the machine.' : `${f.name}? Machine. By the door.`); },
      hint: () => { const f = FOODS[MENU[this.menuSel]]; return { key: '', text: `${f.jp}  ${f.name}  ${yen(f.price)}`, sub: `+ ${f.pros}  - ${f.cons}` }; },
      onExit: () => this.drawMenuCard(),
    });
    this.drawMenuCard();
  }
  readMenu(card) {
    if (this.menuPm.active || this.game.cutscene.active) return;
    const p = card.getWorldPosition(new THREE.Vector3());
    this.menuPm.enter({ pos: p.clone().add(V(0, 0.42, 0.18)), look: p.clone().add(V(0, 0, -0.01)), fov: 30 });
    audio.play('paper', { vol: 0.5 });
    this.drawMenuCard();
  }
  drawMenuCard() {
    if (!this.menuCard) return;
    const sel = this.menuPm?.active ? this.menuSel : -1;
    this.menuCard.redraw((c) => menuCardArt(MENU, FOODS, sel).draw(c, 0, 0, 1));
  }

  // ------------------------------------------------------------------ the pink phone: call a friend
  buildPhone() {
    const g = this.game, P = this.places;
    const ph = iprop(this.places, 'pink_phone', ...L(2.7, 0, 0.25).toArray(), -Math.PI / 2, 1);
    this.group.add(ph);
    this.phone = ph;
    g.interaction.add(ph, {
      reach: 2.2,
      hint: () => (this.friends.length >= 2 ? { key: '', text: 'Pink phone', sub: 'Your friends are already here' } : { key: 'LMB', text: 'Call a friend (¥10)', sub: 'Ramen tastes better together: extra stamina' }),
      use: () => { this.callFriend(); return false; },
    });
  }
  metFriends() {
    const met = this.game.state.npcs?.met || {};
    return Object.keys(FRIENDS).filter((id) => met[id] || this.game.lane?.mem?.met?.(id));
  }
  async callFriend() {
    const g = this.game;
    if (this.friends.length >= 2 || this.calling || !g.talk) return;
    const can = this.metFriends().filter((id) => !this.friends.some((f) => f.id === id));
    if (!can.length) { g.monologue?.say('I don\'t have anyone\'s number yet. I should get to know the lane.', { force: true }); return; }
    if (!payCash(g, 10, 'Pink phone', this.phone.getWorldPosition(new THREE.Vector3()).setY(1.2))) return;
    audio.play('dialTone', { vol: 0.5 });
    this.calling = true;
    const i = await g.talk.quick({ name: 'Phone', anchor: this.phone, headY: 1.5 }, [...can.map((id) => `Call ${FRIENDS[id].name}`), 'Hang up'], { time: 8, prompt: 'Who to call?' });
    this.calling = false;
    if (i < 0 || i >= can.length) { audio.play('hookDown', { vol: 0.5 }); return; }
    const id = can[i];
    audio.play('ringback', { vol: 0.5 });
    g.tweens.wait(2.2, () => {
      g.monologue?.say(`${FRIENDS[id].name}: "${pick(['Ramen? Say no more. I\'m coming!', 'Yo! Give me five minutes.', 'Is it the place with the red lantern? On my way!'])}"`, { force: true });
      g.tweens.wait(14 + Math.random() * 8, () => this.friendArrives(id));
    });
  }
  ensureNpc(id) {
    const Lane = this.game.lane;
    if (!Lane) return null;
    for (let k = 0; k < 40 && !Lane.npc(id) && Lane.pending.length; k++) Lane.spawnNext();
    return Lane.npc(id);
  }
  friendArrives(id) {
    const g = this.game;
    if (this.places.where !== 'ramen' || this.friends.some((f) => f.id === id)) return;
    const n = this.ensureNpc(id);
    if (!n) return;
    g.lane.cancel(n);
    n.activity = 'ramen'; n.script = true;
    n.setPresent(true);
    n.place(L(1.9, 0, 2.1), Math.PI);
    n.h.finishPaint?.();
    const used = new Set([this.seatI, ...this.friends.map((f) => f.seat)]);
    let seat = -1;
    const near = this.seatI >= 0 ? [this.seatI + 1, this.seatI - 1, this.seatI + 2, this.seatI - 2] : [5, 4, 3];
    for (const s of near) if (s >= 0 && s < SEATS.length && !used.has(s)) { seat = s; break; }
    if (seat < 0) for (let s = SEATS.length - 1; s >= 0; s--) if (!used.has(s)) { seat = s; break; }
    const f = { id, n, seat, state: 'walk', order: FRIENDS[id].order, bowl: null };
    this.friends.push(f);
    audio.play('chimeEntrance', { vol: 0.6 });
    this.shout('Irasshai!!');
    n.walk([L(1.6, 0, 1.0), L(SEATS[seat], 0, SEAT_Z + 0.06)], { speed: 1.1, then: () => { f.state = 'sit'; n.faceTo(Math.PI); sitDown(n.h, 0.74); n.say(pick([`Yo, ${'shopkeeper'}!`, 'This place smells like heaven.', 'Scoot over. I\'m starving.'])); this.cook(f.order, f); } });
  }
  sendFriendsHome() {
    for (const f of this.friends) {
      const n = f.n;
      f.bowl?.mesh?.parent?.remove(f.bowl.mesh);
      n.script = false; n.activity = null;
      standUp(n.h);
      n.place(V(FRONT.door.x - 0.4 - Math.random() * 0.6, 0, FRONT.door.z - 1.2), Math.PI);
      n.say?.(pick(['Thanks for the call!', 'That was great. See ya!', 'Ugh, I ate too much.']));
    }
    this.friends = [];
  }
  /** Click a friend at the counter: a little chat. */
  chatFriend(f) {
    const g = this.game;
    if (!g.talk || g.talk.active) return;
    const name = FRIENDS[f.id].name;
    g.talk.start(f.n, async (t) => {
      await t.say(pick([`So... how's the shop? Your grandpa would be proud, y'know.`, 'Have you tried the gyoza here? Life-changing.', 'The master scares me a little. In a good way.']));
      const i = await t.choose(['The shop\'s going great!', 'Honestly? I\'m exhausted.', 'Your turn to pay next time.']);
      if (i === 0) await t.say('Nice! Save me a rare one, okay?');
      else if (i === 1) { await t.say('Eat up, then. Ramen fixes everything. Mostly.'); g.needs?.add(4, 'friend'); }
      else await t.say(`${name === 'Okuyasu' ? 'Wait, what? ...Okay. Fair.' : 'Ha! Deal.'}`);
    }, { name, id: f.id });
  }

  // ------------------------------------------------------------------ sitting, ordering, eating
  sit(i) {
    const g = this.game;
    if (this.friends.some((f) => f.seat === i)) return;
    this.seatI = i;
    this.places.sitAt({ pos: L(SEATS[i], 0, SEAT_Z + 0.05), yaw: 0, eye: 1.22, rest: 1.2, onStand: () => { this.seatI = -1; } });
    // the master takes your tickets
    const H = g.held, dishes = [];
    for (let ti = H.find('meal_ticket'); ti >= 0; ti = H.find('meal_ticket')) {
      const it = H.slots[ti];
      dishes.push(...(it.data.dishes || []));
      it.obj.parent?.remove(it.obj);
      H.slots[ti] = null;
      if (ti === H.sel) g.events.emit('held', null);
    }
    if (dishes.length) {
      g.events.emit('slot', H.sel);
      g.tweens.wait(0.8, () => {
        this.shout(`Hai! ${dishes.map((d) => FOODS[d].name.replace(/ \(\d+\)/, '')).join(', ')}!`, 3);
        this.master.h.gesture?.('point');
        for (const d of dishes) this.cook(d, null);
      });
    } else if (!this.served.length) g.tweens.wait(0.6, () => this.shout(pick(['Ticket first.', 'Machine by the door.', 'Oi. Ticket.'])));
  }

  cook(id, friend) {
    // one thing at a time (drinks jump the queue: they're just poured)
    const q = { id, t: (COOK[id] || 10) * (friend ? 0.7 : 1), friend };
    if (FOODS[id].how === 'drink') this.queue.unshift(q); else this.queue.push(q);
    if (FOODS[id].how === 'bowl' && (id === 'rm_gyoza')) audio.play('sizzle', { pos: L(1.45, 1, -1.6), vol: 0.6 });
  }

  serve(q) {
    const g = this.game, id = q.id, f = FOODS[id];
    const seat = q.friend ? q.friend.seat : this.seatI;
    if (seat < 0) { this.queue.unshift({ ...q, t: 2 }); return; }
    const kind = id === 'rm_gyoza' ? 1 : (f.how === 'drink' ? -1 : id === 'rm_rice' || id === 'rm_chashu' ? 1.6 : 0);
    if (id === 'rm_kaedama') { const b = this.served.find((s) => s.ramen && !s.friend); if (b) { b.left = Math.min(1, b.left + 0.6); b.kaedama = true; this.shout('Kaedama!'); audio.play('splash', { vol: 0.4 }); return; } }
    const pos = L(SEATS[seat] + kind * 0.2, TOP_Y, SERVE_Z + (kind ? 0.02 : 0));
    const mesh = iprop(this.places, PROP[id], pos.x, pos.y, pos.z, Math.random() * 0.4);
    this.group.add(mesh);
    const s = { id, f, mesh, seat, left: 1, done: false, friend: q.friend, ramen: id.startsWith('rm_') && PROP[id].startsWith('rm_bowl'), pos };
    this.served.push(s);
    audio.play('place', { pos, vol: 0.6 });
    if (q.friend) { q.friend.bowl = s; return; }
    this.shout(pick(['Omachi!', 'Hai, omachidou!', 'Here.']));
    g.interaction.add(mesh, {
      reach: 1.6,
      hint: () => (s.done ? null : { key: s.ramen || id === 'rm_gyoza' || id === 'rm_rice' || id === 'rm_chashu' ? 'Hold LMB' : 'LMB', text: `${f.how === 'drink' ? 'Drink' : 'Eat'}: ${f.name}`, sub: s.ramen ? 'Slurp loud. It\'s polite.' : f.pros }),
      use: () => { if (f.how === 'drink') { this.drinkIt(s); return false; } return true; },
      hold: {
        canStart: () => !s.done && f.how !== 'drink',
        start: () => { s.eating = true; g.player.lookLocked = false; },
        update: (dt) => this.eatStep(s, dt),
        done: () => s.done,
        end: () => { s.eating = false; },
      },
    });
  }

  eatStep(s, dt) {
    const g = this.game;
    s.left -= dt / (s.ramen ? 5.5 : 3.2);
    s.sT = (s.sT || 0) - dt;
    if (s.sT <= 0) {
      s.sT = s.ramen ? 0.9 : 0.55;
      audio.play(s.ramen ? 'slurp' : 'bite', { vol: 0.75, dur: 0.6 });
      if (s.ramen) g.effects.puff({ pos: s.pos.clone().add(V(0, 0.12, 0)), count: 2, colors: [0xf8f8f8, 0xe8e8e8], size: 0.035, up: 0.25, gravity: -0.15, life: 1.0 });
      g.player.shake = Math.max(g.player.shake, 0.06);
    }
    // you lean into the bowl a little
    const P = g.player;
    P.pitch += (-0.42 - P.pitch) * Math.min(1, dt * 2);
    if (s.left <= 0) this.finishDish(s);
  }
  drinkIt(s) {
    if (s.done) return;
    for (const t of [0, 0.35, 0.7]) this.game.tweens.wait(t, () => audio.play('gulp', { vol: 0.8 }));
    this.game.tweens.wait(0.9, () => this.finishDish(s));
  }
  finishDish(s) {
    const g = this.game;
    if (s.done) return;
    s.done = true;
    g.interaction.remove(s.mesh);
    const empty = s.ramen ? 'rm_bowl_empty' : null;
    if (empty) { const p = s.mesh.position.clone(), r = s.mesh.rotation.y; s.mesh.parent?.remove(s.mesh); s.mesh = iprop(this.places, empty, p.x, p.y, p.z, r); this.group.add(s.mesh); }
    else s.mesh.scale.multiplyScalar(0.9);
    g.needs?.consume(s.id);
    if (s.kaedama) g.needs?.consume('rm_kaedama', { quiet: true });
    this.s.bowls++;
    const together = this.friends.some((f) => f.state === 'sit');
    if (s.ramen) {
      this.shout(pick(['Hn. Good slurp.', 'Finished the soup? ...Respect.', 'Gochisousama is what you say now.']));
      if (together) {
        const N = g.needs;
        if (N) { N.s.bonus = Math.max(N.s.bonus || 0, 20); N.add(15, 'friends'); N.lit(); }
        this.s.withFriends++;
        g.monologue?.say('Ramen with friends hits different. I could run a marathon.', { force: true });
        g.events.emit('ramenWithFriends', { friends: this.friends.map((f) => f.id) });
      } else g.monologue?.say(pick(['Gochisousama deshita!', 'Perfect. Absolutely perfect.', 'I\'m going to dream about that broth.']), { force: true });
    }
    g.save();
  }

  // ------------------------------------------------------------------ entering / leaving
  /** The frosted window and the door glass glow with the lane outside: daylight, dusk, the lamps at night. */
  lightWindows() {
    const day = this.game.clock?.daylight?.() ?? 1, c = new THREE.Color(0x6a5c50).lerp(new THREE.Color(0xf4ead8), day);
    this.daylight?.color.copy(c); this.laneMat?.color.copy(c).multiplyScalar(0.94);
  }
  onEnter() {
    const g = this.game;
    this.lightWindows();
    this.s.visits++;
    g.tweens.wait(0.6, () => this.shout('Irasshai!!'));
    g.tweens.wait(1.6, () => g.tip?.('ramen', 'Buy a ticket at the machine by the door', 'Then sit at the counter. Hold LMB on the bowl to eat.'));
  }
  onExit() {
    this.washStop?.(true);
    this.sendFriendsHome();
    for (const s of this.served) { this.game.interaction.remove(s.mesh); s.mesh.parent?.remove(s.mesh); }
    this.served = []; this.queue = [];
    this.seatI = -1;
  }
  leave() {
    const g = this.game;
    if (this.washing) return;
    if (this.served.some((s) => !s.done && !s.friend)) this.shout('Oi! You\'re leaving that?!');
    else this.shout('Arigatou gozaimashita!');
    this.places.exit();
    void g;
  }

  // ------------------------------------------------------------------ per frame (inside)
  tick(dt) {
    const g = this.game;
    // the master: watches the counter, cooks
    const M = this.master;
    if (!this.washing) M.h.update(dt, { speed: 0, lookAt: this.queue.length ? L(0.2, 1.0, -1.5) : g.camera.position, talking: !!g.bubbles?.isTalking(M.h) || (g.talk?.active && g.talk.session?.spk?.h === M.h) });
    if (this.queue.length) {
      this.queue[0].t -= dt;
      if (this.queue[0].t <= 0) this.serve(this.queue.shift());
    }
    // steam from the pots and the bowls
    this.steamT -= dt;
    if (this.steamT <= 0) {
      this.steamT = 0.5;
      for (const p of this.pots) g.effects.puff({ pos: p.position.clone().add(V(rnd(-0.08, 0.08), 0.38, rnd(-0.08, 0.08))), count: 1, colors: [0xf4f4f4, 0xe0e0e0], size: 0.07, up: 0.3, gravity: -0.12, life: 1.8, drag: 1.2 });
      if (Math.random() < 0.5) g.effects.puff({ pos: this.boiler.position.clone().add(V(rnd(-0.25, 0.25), 0.85, 0)), count: 1, colors: [0xf4f4f4], size: 0.06, up: 0.35, gravity: -0.1, life: 1.4 });
      for (const s of this.served) if (!s.done && (s.ramen || s.id === 'rm_gyoza')) g.effects.puff({ pos: s.pos.clone().add(V(rnd(-0.04, 0.04), 0.13, rnd(-0.04, 0.04))), count: 1, colors: [0xf8f8f8, 0xeaeaea], size: 0.03, up: 0.18, gravity: -0.1, life: 1.2 });
    }
    // friends at the counter eat when their bowl comes
    for (const f of this.friends) {
      if (f.state !== 'sit') continue;
      const b = f.bowl;
      if (b && !b.done) {
        if (!f.eating) { f.eating = true; f.n.gesture?.('eat'); f.n.say(pick(FRIENDS[f.id].yum)); }
        b.left -= dt / 14;
        if (b.left <= 0) { b.done = true; f.n.clearGesture?.(); const p = b.mesh.position.clone(); b.mesh.parent?.remove(b.mesh); b.mesh = iprop(this.places, 'rm_bowl_empty', p.x, p.y, p.z); this.group.add(b.mesh); f.n.say(pick(['Gochisousama!', 'Haaah. Perfect.', 'I\'m so full.'])); }
      }
    }
    this.washTick?.(dt);
    // the noren on the lane sways a little in the breeze (when you get back out)
  }

  update(dt) {
    const g = this.game;
    // outside: the noren sways, the doorway glows warm in the evening; the pots only run while you're inside
    const pp = g.player.pos;
    if (Math.abs(pp.x - FRONT.door.x) < 25 && Math.abs(pp.z - FRONT.door.z) < 25) {
      const t = g.time;
      this.norenStrips.forEach((s, i) => { s.rotation.x = Math.sin(t * 1.3 + i * 0.9) * 0.06; });
      this.glowT = (this.glowT || 0) - dt;
      if (this.glowT <= 0) { this.glowT = 3; const day = g.clock?.daylight?.() ?? 1, open = this.openNow(); this.frontGlass.material.color.set(open ? (day > 0.5 ? 0x8a6a48 : 0xffc888) : 0x2a2420); }
    }
  }

  // ------------------------------------------------------------------ washing dishes in the back
  washAvailable() {
    const c = this.game.clock, h = c?.hours ?? 15;
    if (h < 11 || h >= 22) return 'Kitchen\'s closed for that.';
    if (this.s.lastWash === (c?.day ?? 1)) return 'You did today\'s. Come back tomorrow.';
    return true;
  }
  buildSink() {
    const g = this.game, P = this.places;
    this.sink = iprop(this.places, 'rm_sink', ...L(-2.6, 0, -1.6).toArray(), Math.PI / 2);
    this.group.add(this.sink);
    this.sponge = iprop(this.places, 'rm_sponge', ...L(-2.42, 0.86, -1.95).toArray(), 0.3);
    this.group.add(this.sponge);
    const W = { spot: L(-2.0, 0, -1.6), bowlAt: L(-2.6, 0.64, -1.6), tap: L(-2.62, 1.0, -1.45) };
    this.W = W;
    const hits = [];
    const add = (obj, h) => { this.group.add(obj); g.interaction.add(obj, h); hits.push(obj); return obj; };
    // the stack of dirty bowls
    add(hitBox(0.35, 0.5, 0.35, ...L(-2.62, 1.05, -0.95).toArray()), { reach: 1.8, hint: () => (this.washing && !this.wb ? { key: 'LMB', text: 'Take a dirty bowl', sub: `${this.wash.left} left to wash` } : null), use: () => { this.washTake(); return false; } });
    // the bowl in the sink: scrub (hold, move the mouse in circles)
    add(hitBox(0.4, 0.25, 0.4, W.bowlAt.x, W.bowlAt.y + 0.05, W.bowlAt.z), {
      reach: 1.8,
      hint: () => (!this.washing || !this.wb ? null : this.wb.grime > 0 ? { key: 'Hold LMB', text: 'Scrub', sub: 'Move the mouse round and round' } : !this.wb.rinsed ? { key: '', text: 'Clean!', sub: 'Rinse it under the tap' } : { key: '', text: 'Rinsed', sub: 'Into the rack' }),
      use: () => !!(this.washing && this.wb && this.wb.grime > 0),
      hold: {
        canStart: () => !!(this.washing && this.wb && this.wb.grime > 0),
        start: () => { g.player.lookLocked = true; this.scrub = { x: 0, y: 0, t: 0 }; },
        update: (dt) => this.scrubStep(dt),
        done: () => !this.wb || this.wb.grime <= 0,
        end: () => { g.player.lookLocked = false; this.scrub = null; this.sponge.position.copy(L(-2.42, 0.86, -1.95)); },
      },
    });
    add(hitBox(0.14, 0.3, 0.14, W.tap.x, W.tap.y + 0.1, W.tap.z), { reach: 1.8, hint: () => (this.washing && this.wb && this.wb.grime <= 0 && !this.wb.rinsed ? { key: 'LMB', text: 'Rinse it', sub: 'Turn the tap' } : null), use: () => { this.washRinse(); return false; } });
    add(hitBox(0.5, 0.25, 0.4, ...L(-2.62, 0.98, -2.15).toArray()), { reach: 1.9, hint: () => (this.washing && this.wb?.rinsed ? { key: 'LMB', text: 'Into the rack', sub: `${this.wash.racked + 1} / ${WASH}` } : null), use: () => { this.washRack(); return false; } });
  }
  washStart() {
    const g = this.game, self = this;
    if (this.washing) return;
    this.places.standUp();
    this.washing = true;
    this.wash = { left: WASH, racked: 0, t: 0, chipped: 0 };
    this.s.lastWash = g.clock?.day ?? 1;
    g.cutscene.play(function* (c) {
      yield c.fade(1, 0.35);
      self.places.lockAt(self.W.spot, { yaw: Math.PI / 2, pitch: -0.62 });
      for (const b of self.dirtyStack) b.visible = true;
      yield c.wait(0.15);
      yield c.fade(0, 0.4);
    }, { letterbox: false, skippable: false }).then(() => g.news('Washing dishes', 'Take a bowl, scrub it (hold LMB, circles), rinse it, rack it. Ten bowls.', 6000));
  }
  washTake() {
    if (!this.washing || this.wb) return;
    const W = this.W;
    const m = iprop(this.places, 'rm_bowl_dirty', W.bowlAt.x, W.bowlAt.y, W.bowlAt.z, Math.random() * 3);
    this.group.add(m);
    this.wb = { mesh: m, grime: 1, rinsed: false };
    const top = this.dirtyStack.filter((b) => b.visible).pop();
    if (top && this.wash.left <= 5) top.visible = false;
    audio.play('dishClink', { vol: 0.6 });
  }
  scrubStep(dt) {
    const g = this.game, S = this.scrub, wb = this.wb;
    if (!S || !wb) return;
    const inp = g.input, mv = Math.hypot(inp.mouse.dx, inp.mouse.dy);
    S.x = Math.max(-1, Math.min(1, S.x + inp.mouse.dx * 0.01)); S.y = Math.max(-1, Math.min(1, S.y + inp.mouse.dy * 0.01));
    S.t += dt;
    const W = this.W;
    this.sponge.position.set(W.bowlAt.x + S.y * 0.05, W.bowlAt.y + 0.06, W.bowlAt.z - S.x * 0.06);
    wb.grime -= Math.min(0.06, mv * 0.0011) + dt * 0.02;
    this.bubT = (this.bubT || 0) - dt;
    if (mv > 2 && this.bubT <= 0) {
      this.bubT = 0.12;
      g.effects.sparks({ pos: this.sponge.position.clone().add(V(0, 0.03, 0)), count: 3, colors: [0xffffff, 0xe8f4ff, 0xd8ecff], speed: 0.25, size: 0.012, star: 0, gravity: -0.4, life: 0.8, drag: 3 });
      if (Math.random() < 0.4) audio.play('scrub', { vol: 0.45 });
    }
    if (wb.grime <= 0) {
      wb.grime = 0;
      const p = wb.mesh.position.clone(), r = wb.mesh.rotation.y;
      wb.mesh.parent?.remove(wb.mesh);
      wb.mesh = iprop(this.places, 'rm_bowl_clean', p.x, p.y, p.z, r);
      this.group.add(wb.mesh);
      audio.play('dishClink', { vol: 0.7 });
      g.effects.sparks({ pos: p.clone().add(V(0, 0.1, 0)), count: 8, colors: [0xffffff, 0xe0f0ff], speed: 0.4, size: 0.012, star: 0.6, life: 0.7 });
    }
  }
  washRinse() {
    const g = this.game, wb = this.wb;
    if (!this.washing || !wb || wb.grime > 0 || wb.rinsed) return;
    wb.rinsed = true;
    audio.play('faucet', { vol: 0.7, dur: 0.9 });
    for (let i = 0; i < 4; i++) g.tweens.wait(i * 0.18, () => g.effects.splash({ pos: wb.mesh.position.clone().add(V(0, 0.08, 0)), color: 0xd8ecff, size: 0.05, count: 3 }));
  }
  washRack() {
    const g = this.game, wb = this.wb, W = this.wash;
    if (!this.washing || !wb?.rinsed) return;
    const i = W.racked, to = L(-2.62 + (i % 5 - 2) * 0.075, 0.95, -2.15 + (i >= 5 ? 0.12 : -0.08));
    const m = wb.mesh, from = m.position.clone();
    this.wb = null;
    g.tweens.add({ dur: 0.35, update: (k) => { m.position.lerpVectors(from, to, k); m.position.y += Math.sin(k * Math.PI) * 0.1; m.rotation.z = k * 1.2; }, done: () => { audio.play('dishClink', { vol: 0.6 }); } });
    W.racked++; W.left--;
    (this.racked ||= []).push(m);
    if (W.left <= 0) this.washStop(false);
  }
  washTick(dt) { if (this.washing && this.wash) { this.wash.t += dt; if (this.wash.t > 600) this.washStop(false); } }
  washStop(abort) {
    const g = this.game, W = this.wash, self = this;
    if (!this.washing) return;
    this.washing = false;
    if (this.wb) { this.wb.mesh.parent?.remove(this.wb.mesh); this.wb = null; }
    const pay = 120 * (W?.racked || 0) + (W?.racked >= WASH && W.t < 150 ? 300 : 0);
    const done = () => {
      for (const m of this.racked || []) m.parent?.remove(m);
      this.racked = [];
      for (const b of this.dirtyStack) b.visible = true;
    };
    if (abort) { this.places.unlock(); done(); return; }
    g.cutscene.play(function* (c) {
      yield c.fade(1, 0.35);
      self.places.unlock();
      g.player.pos.copy(L(-0.7, 0, 0.9)); g.player.yaw = 0; g.player.pitch = -0.1;
      done();
      yield c.wait(0.15);
      yield c.fade(0, 0.4);
    }, { letterbox: false, skippable: false }).then(() => {
      this.shout(W.t < 150 ? 'Oi. Fast hands. Here.' : 'Hn. Done. Here.');
      g.tweens.wait(0.8, () => earnCash(g, pay, { from: this.master.h.root.getWorldPosition(new THREE.Vector3()).setY(1.2), label: `Washing up at Ramen Yamada: ${W.racked} bowls` }));
      g.needs?.work(8, 'dishes');
      g.progress?.addXP?.(20, 'job');
      this.s.washes++;
      g.events.emit('jobDone', { id: 'dishes', pay, where: 'ramen' });
    });
  }
}
