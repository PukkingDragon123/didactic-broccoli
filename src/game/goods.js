// Shop goods: small upgrades you buy on E-Mart that show up in the world and help the business.
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { Pix } from '../gfx/pix.js';
import { GARAGE } from '../world/Garage.js';
import { propMesh, propSize } from '../world/props.js';
import { assetSlot } from '../kit/assets.js';
import { buildPiece } from '../build/models.js';
import { thingMesh } from '../props/things/make.js';
import { paint, matte, metal } from '../props/kit/kit.js';
import { FURNITURE } from '../build/catalogue.js';

export const GOODS = {
  tip_jar: { jp: 'チップ瓶', name: 'Tip Jar', price: 1500, desc: 'Museum visitors tip 1.5x more', museum: true },
  furin: { jp: '風鈴', name: 'Wind Chime', price: 1200, desc: 'A cool, clear chime. Museum beauty up', museum: true },
  capsule_bin: { jp: 'カプセル回収箱', name: 'Capsule Recycling Bin', price: 900, desc: '¥5 back for every capsule you open' },
  ticket_machine: { jp: '券売機', name: 'Ticket Machine', price: 8000, desc: 'Museum tickets cost 20% more', museum: true },
  neon_open: { jp: 'ネオン看板', name: 'Neon OPEN Sign', price: 12000, desc: '15% more customers' },
};

export const hasGood = (g, id) => !!g.state.goods?.[id];

function mat(c, o = {}) { return new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, ...o }); }

// the jar and the wind chime are the modelled props (src/props/models), the bin a real plastic container (Poly Haven, CC0)
function buildTipJar() {
  const g = new THREE.Group();
  g.add(propMesh('tip_jar', { fallbackSize: [0.12, 0.14, 0.12] }));
  return g;
}

function buildFurin() {
  // hangs from its hook at the group's origin; the strip's sway turns the whole chime a little
  const g = new THREE.Group(), m = propMesh('furin', { fallbackSize: [0.08, 0.27, 0.08] });
  m.position.y = -propSize('furin').y;
  g.add(m);
  g.userData.swing = m;
  return g;
}

let binLabel = null;
function buildBin() {
  const g = new THREE.Group();
  const box = assetSlot('industrial_pastic_container', { size: [0.4, 0.4, 0.5], fit: 'contain' });
  box.rotation.y = Math.PI / 2; // its long side to the front
  g.add(box);
  if (!binLabel) {
    const p = new Pix(96, 48, 4);
    p.fill(0xf2ecd8); p.frame(0, 0, 96, 48, 0xc8bfa8);
    p.rect(2, 2, 92, 13, 0x2f7a4a);
    p.tinyText('CAPSULE', 48, 4, { color: 0xf2ecd8, align: 'center' });
    p.text('カプセル回収', 48, 15, { size: 16, color: 0x2a2420, align: 'center' });
    p.tinyText('¥5 BACK EACH', 48, 36, { color: 0xb8343a, align: 'center' });
    // the recycling arrows, by hand
    for (const [x, y] of [[6, 22], [7, 21], [8, 20], [9, 21], [10, 22], [8, 21], [8, 22], [8, 23], [8, 24], [86, 26], [87, 27], [88, 28], [89, 27], [90, 26], [88, 27], [88, 26], [88, 25], [88, 24]]) p.px(x, y, 0x2f7a4a);
    binLabel = new THREE.MeshStandardMaterial({ map: p.texture(), roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 });
  }
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.09), binLabel);
  lab.position.set(0, 0.2, 0.19); lab.userData.noRim = true;
  g.add(lab);
  return g;
}

/** The museum's ticket machine (a 券売機 from reference: a cream steel cabinet on a plinth, the lit header, the panel of
 * ticket buttons behind its bezel, the coin plate, the ticket and change tray), modelled with the prop kit. */
function ticketMachineBody(K) {
  const body = paint(0xe2ddd2, 0.25), navy = paint(0x1a3a7a, 0.3), dark = matte(0x2a2a2e), steel = metal(0xa8acb0, 0.35);
  K.box(dark, -0.235, 0, -0.195, 0.235, 0.07, 0.195, { bevel: 0.004 }); // the plinth
  K.box(body, -0.25, 0.07, -0.21, 0.25, 1.36, 0.2, { bevel: 0.012 });
  K.box(navy, -0.252, 1.32, -0.212, 0.252, 1.45, 0.226, { bevel: 0.01 }); // the header (a lit sign behind its face)
  K.glow(() => K.box(0xf4ecd8, -0.22, 1.335, 0.226, 0.22, 1.435, 0.228, { bevel: 0 }));
  // the bezel round the button panel
  for (const [x0, y0, x1, y1] of [[-0.232, 0.69, 0.232, 0.705], [-0.232, 1.295, 0.232, 1.31], [-0.232, 0.705, -0.22, 1.295], [0.22, 0.705, 0.232, 1.295]]) K.box(steel, x0, y0, 0.2, x1, y1, 0.214, { bevel: 0.002 });
  // the coin plate (slot and return lever) and the note slot
  K.box(steel, 0.06, 0.52, 0.2, 0.22, 0.66, 0.212, { bevel: 0.003 });
  K.box(dark, 0.12, 0.6, 0.211, 0.2, 0.606, 0.214, { bevel: 0 });
  K.box(paint(0xc8302a), 0.09, 0.545, 0.21, 0.115, 0.585, 0.226, { bevel: 0.004 });
  K.box(dark, -0.2, 0.6, 0.2, -0.04, 0.615, 0.212, { bevel: 0.002 });
  // the ticket and change tray: a recess with a hinged flap
  K.box(dark, -0.17, 0.2, 0.14, 0.17, 0.32, 0.201, { bevel: 0.006 });
  K.box(steel, -0.18, 0.19, 0.2, 0.18, 0.205, 0.235, { bevel: 0.004 });
  K.box(paint(0xd8d2c4, 0.2), -0.16, 0.25, 0.195, 0.16, 0.31, 0.205, { bevel: 0.003 });
  // vents down each side
  for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) K.box(dark, sx * 0.2505 - 0.001, 0.9 + i * 0.03, -0.12, sx * 0.2505 + 0.001, 0.912 + i * 0.03, 0.08, { bevel: 0 });
}
function buildTicketMachine() {
  const g = new THREE.Group();
  const body = thingMesh('decor', 'ticketMachine', [-0.252, 0, -0.212, 0.252, 1.45, 0.228], ticketMachineBody);
  g.add(body);
  // the button panel behind the bezel: six lit ticket buttons (what they sell, the price), the coin-in display
  const p = new Pix(132, 176, 5), BTN = [['ADULT', '¥300', 0xffd23f], ['CHILD', '¥150', 0xf4ecd8], ['SENIOR', '¥200', 0xf4ecd8], ['FAMILY', '¥700', 0xf4ecd8], ['ANNUAL', '¥2000', 0xf4ecd8], ['DONATE', '¥100', 0xf4ecd8]];
  p.fill(0xd6d0c2); p.frame(0, 0, 132, 176, 0xb8b2a4);
  p.rect(6, 6, 120, 18, 0x22324e); p.text('入館券', 66, 5, { size: 16, color: 0xf4ecd8, align: 'center' });
  BTN.forEach(([t, yen, c], i) => {
    const x = 8 + (i % 2) * 60, y = 30 + Math.floor(i / 2) * 40;
    p.rect(x, y, 56, 34, 0x8a8a8a); p.rect(x + 1, y + 1, 54, 32, c); p.rect(x + 1, y + 30, 54, 3, 0xc8c0a8);
    p.tinyText(t, x + 28, y + 6, { color: 0x2a2420, align: 'center' }); p.tinyText(yen, x + 28, y + 18, { color: 0xb8343a, align: 'center' });
  });
  p.rect(8, 152, 70, 16, 0x1e2a1e); p.tinyText('¥    0', 72, 156, { color: 0x8ad06a, align: 'right' });
  p.tinyText('IN', 84, 156, { color: 0x2a2420 });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.59), mat(0xffffff, { map: p.texture(), roughness: 0.3 }));
  face.position.set(0, 1.0, 0.202); g.add(face);
  return g;
}

function buildNeon() {
  // the catalogue's neon sign (src/build/models.js), a size up, lit
  const { root, parts } = buildPiece(FURNITURE.neon_open, { design: 0 });
  root.scale.setScalar(1.25);
  const face = parts.neon.face;
  face.material = new THREE.MeshBasicMaterial({ map: parts.neon.on, color: new THREE.Color(1.8, 1.8, 1.8) });
  const light = new THREE.PointLight(0xff4fa0, 1.6, 4, 1.6); light.position.z = 0.4; root.add(light);
  root.userData.neon = face;
  return root;
}

/** The goods' models (previews, the prop stage). */
export const GOODS_MODELS = { tip_jar: buildTipJar, furin: buildFurin, capsule_bin: buildBin, ticket_machine: buildTicketMachine, neon_open: buildNeon };

export class Goods {
  constructor(game) {
    this.game = game;
    if (!game.state.goods) game.state.goods = {};
    this.meshes = {};
    this.t = 0;
    for (const id of Object.keys(game.state.goods)) this.place(id, false);
    game.events.on?.('discover', () => this.onOpen());
  }

  buy(id) {
    const g = this.game, def = GOODS[id];
    if (!def) return { ok: false, msg: '?' };
    if (g.state.goods[id]) return { ok: false, msg: 'Already owned' };
    if (def.museum && !g.museum?.data.owned) return { ok: false, msg: 'You need a museum first' };
    if (!g.spend(def.price)) return { ok: false, msg: 'Not enough money' };
    g.state.goods[id] = true;
    this.place(id, true);
    g.museum?.recompute();
    g.save();
    return { ok: true, msg: `${def.name} installed!` };
  }

  place(id, animate) {
    const g = this.game, M = g.museum;
    let obj = null;
    if (id === 'capsule_bin') { obj = buildBin(); obj.position.set(2.2, 0, -4.55); g.scene.add(obj); }
    else if (id === 'neon_open') { obj = buildNeon(); obj.position.set(3.0, 2.55, GARAGE.maxZ + 0.24); g.scene.add(obj); }
    else if (M?.data.owned && M.shell) {
      const zS = M.zS;
      if (id === 'tip_jar') { obj = buildTipJar(); obj.position.set(1.62, 0.96, zS + 0.75); }
      else if (id === 'furin') { obj = buildFurin(); obj.position.set(-0.75, 2.3, zS + 0.25); }
      else if (id === 'ticket_machine') { obj = buildTicketMachine(); obj.position.set(-1.6, 0, zS + 0.35); g.player.addObstacle(-1.88, -1.32, zS, zS + 0.6); }
      if (obj) M.group.add(obj);
    }
    if (!obj) return;
    this.meshes[id] = obj;
    if (animate) {
      const p = obj.getWorldPosition(new THREE.Vector3());
      g.effects.sparks({ pos: p.add(new THREE.Vector3(0, 0.2, 0)), count: 30, colors: [0xffffff, 0xffe9a0], speed: 0.6, size: 0.015 });
      audio.play('upgrade', { pos: p, vol: 0.7 });
    }
  }

  /** The museum was just bought or rebuilt: place the museum goods. */
  refresh() { for (const id of Object.keys(this.game.state.goods)) if (!this.meshes[id] || !this.meshes[id].parent) this.place(id, false); }

  onOpen() {
    if (!hasGood(this.game, 'capsule_bin')) return;
    this.game.addMoney(5, true);
  }

  update(dt) {
    this.t += dt;
    const f = this.meshes.furin;
    if (f) {
      f.userData.swing.rotation.y = Math.sin(this.t * 1.7) * 0.3;
      f.rotation.z = Math.sin(this.t * 1.1) * 0.05;
      if (Math.random() < dt * 0.12 && this.game.player.pos.z < GARAGE.minZ) audio.play('furin', { pos: f.getWorldPosition(new THREE.Vector3()), vol: 0.5 });
    }
    const n = this.meshes.neon_open;
    if (n) n.userData.neon.material.color.setScalar(Math.random() < 0.01 ? 0.6 : 1.8);
  }
}
