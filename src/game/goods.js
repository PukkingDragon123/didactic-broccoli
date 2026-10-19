// Shop goods: small upgrades you buy on E-Mart that show up in the world and help the business.
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { Pix, FONT_EN } from '../gfx/pix.js';
import { GARAGE } from '../world/Garage.js';

export const GOODS = {
  tip_jar: { jp: 'チップ瓶', name: 'Tip Jar', price: 1500, desc: 'Museum visitors tip 1.5x more', museum: true },
  furin: { jp: '風鈴', name: 'Wind Chime', price: 1200, desc: 'A cool, clear chime. Museum beauty up', museum: true },
  capsule_bin: { jp: 'カプセル回収箱', name: 'Capsule Recycling Bin', price: 900, desc: '¥5 back for every capsule you open' },
  ticket_machine: { jp: '券売機', name: 'Ticket Machine', price: 8000, desc: 'Museum tickets cost 20% more', museum: true },
  neon_open: { jp: 'ネオン看板', name: 'Neon OPEN Sign', price: 12000, desc: '15% more customers' },
};

export const hasGood = (g, id) => !!g.state.goods?.[id];

function mat(c, o = {}) { return new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, ...o }); }

function buildTipJar() {
  const g = new THREE.Group();
  const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.15, 20, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xeaf6ff, transparent: true, opacity: 0.25, roughness: 0.05, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }));
  jar.position.y = 0.075; jar.renderOrder = 3; g.add(jar);
  const lid = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.006, 6, 20), mat(0xd8b040, { metalness: 0.8 }));
  lid.rotation.x = Math.PI / 2; lid.position.y = 0.15; g.add(lid);
  const coins = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.05, 0.04, 16), mat(0xe0b860, { metalness: 0.9, roughness: 0.3 }));
  coins.position.y = 0.02; g.add(coins);
  const p = new Pix(48, 20, 2); p.fill(0xfff8e0); p.text('TIPS', 24, 6, { size: 8, color: 0xd8282a, align: 'center', font: FONT_EN });
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.034), mat(0xffffff, { map: p.texture() })); lab.position.set(0, 0.09, 0.0605); g.add(lab);
  g.userData.coins = coins;
  return g;
}

function buildFurin() {
  const g = new THREE.Group();
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), new THREE.MeshPhysicalMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0.55, roughness: 0.05, clearcoat: 1, side: THREE.DoubleSide }));
  g.add(bell);
  const paint = new THREE.Mesh(new THREE.SphereGeometry(0.046, 16, 6, 0, Math.PI * 2, Math.PI * 0.32, Math.PI * 0.12), mat(0x3a6ad8, { side: THREE.DoubleSide }));
  g.add(paint);
  const str = new THREE.Mesh(new THREE.CylinderGeometry(0.001, 0.001, 0.2), mat(0xd82020)); str.position.y = -0.08; g.add(str);
  const p = new Pix(16, 40, 3); p.fill(0xfff8f0); p.text('涼', 8, 12, { size: 12, color: 0x3a6ad8, align: 'center' });
  const tanzaku = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.09), mat(0xffffff, { map: p.texture(), side: THREE.DoubleSide })); tanzaku.position.y = -0.22; g.add(tanzaku);
  g.userData.swing = tanzaku;
  return g;
}

function buildBin() {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.28), mat(0x2f9a5a, { roughness: 0.4 }));
  box.position.y = 0.21; box.castShadow = true; g.add(box);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.07, 20), mat(0x101010)); hole.rotation.x = -Math.PI / 2; hole.position.y = 0.421; g.add(hole);
  const p = new Pix(64, 32, 4); p.fill(0x2f9a5a); p.text('CAPSULE', 32, 5, { size: 8, color: 0xffffff, align: 'center', font: FONT_EN }); p.text('RECYCLING', 32, 18, { size: 8, color: 0xffffff, align: 'center', font: FONT_EN });
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.13), mat(0xffffff, { map: p.texture() })); lab.position.set(0, 0.26, 0.141); g.add(lab);
  return g;
}

function buildTicketMachine() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.45, 0.42), mat(0xe8e4dc, { roughness: 0.35 }));
  body.position.y = 0.725; body.castShadow = true; g.add(body);
  const p = new Pix(96, 128, 5);
  p.fill(0xe8e4dc); p.rect(6, 6, 84, 22, 0x1a3a7a); p.text('TICKETS', 48, 8, { size: 16, color: 0xffffff, align: 'center', font: FONT_EN });
  for (let i = 0; i < 6; i++) { const x = 10 + (i % 3) * 27, y = 36 + Math.floor(i / 3) * 26; p.rect(x, y, 22, 20, i === 0 ? 0xffd23f : 0xffffff); p.frame(x, y, 22, 20, 0x8a8a8a); }
  p.rect(30, 96, 36, 6, 0x101010); p.text('ADMISSION', 48, 110, { size: 8, color: 0x2a2a2a, align: 'center', font: FONT_EN });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.59), mat(0xffffff, { map: p.texture(), emissive: 0xffffff, emissiveMap: p.texture(), emissiveIntensity: 0.15 }));
  face.position.set(0, 1.0, 0.211); g.add(face);
  return g;
}

function buildNeon() {
  const g = new THREE.Group();
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.36, 0.04), mat(0x1a1420));
  g.add(board);
  const p = new Pix(90, 36, 6); p.fill(0x1a1420);
  p.text('OPEN', 45, 6, { size: 24, color: 0xff4fa0, align: 'center', outline: 0x6a1a40, font: FONT_EN });
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.34), new THREE.MeshBasicMaterial({ map: p.texture(), color: new THREE.Color(1.8, 1.8, 1.8) }));
  neon.position.z = 0.021; g.add(neon);
  const light = new THREE.PointLight(0xff4fa0, 1.6, 4, 1.6); light.position.z = 0.4; g.add(light);
  g.userData.neon = neon;
  return g;
}

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
      f.userData.swing.rotation.y = Math.sin(this.t * 1.7) * 0.6;
      f.rotation.z = Math.sin(this.t * 1.1) * 0.05;
      if (Math.random() < dt * 0.12 && this.game.player.pos.z < GARAGE.minZ) audio.play('furin', { pos: f.getWorldPosition(new THREE.Vector3()), vol: 0.5 });
    }
    const n = this.meshes.neon_open;
    if (n) n.userData.neon.material.color.setScalar(Math.random() < 0.01 ? 0.6 : 1.8);
  }
}
