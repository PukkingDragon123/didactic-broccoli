// E-Mart deliveries: cardboard boxes slide in under the shutter after a doorbell and a passing truck.
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { pixMat } from '../gfx/geo.js';
import { Pix, FONT_EN } from '../gfx/pix.js';
import { SERIES_BY_ID, getItem } from '../data/series/index.js';
import { drawPattern } from './cards.js';
import { ease } from '../core/util.js';

const hex = (s) => parseInt(String(s).replace('#', ''), 16);
let nextId = 1;

function labelTex(kind, info) {
  const p = new Pix(96, 64, 4);
  if (kind === 'refill') {
    const s = SERIES_BY_ID[info.series];
    drawPattern(p, 0, 0, 96, 64, s.card.pattern, hex(s.card.bg), hex(s.card.accent));
    p.rect(0, 0, 96, 18, hex(s.card.accent));
    p.text(s.jp, 48, 2, { size: 12, color: 0xffffff, align: 'center' });
    p.text('カプセル', 48, 22, { size: 12, color: hex(s.card.text), align: 'center' });
    p.text(`${info.count}個入`, 48, 38, { size: 14, color: 0xe5383b, outline: 0xffffff, align: 'center' });
  } else if (kind === 'single') {
    p.fill(0xf2d070);
    for (let y = 0; y < 64; y += 6) for (let x = (y / 6) % 2 ? 3 : 0; x < 96; x += 6) p.circle(x, y, 1, 0xf8e0a0);
    p.rect(14, 16, 68, 32, 0xffffff);
    p.text('中古フィギュア', 48, 18, { size: 9, color: 0x333333, align: 'center' });
    p.text(getItem(info.key)?.jp || '', 48, 32, { size: 10, color: 0xe5383b, align: 'center' });
  } else {
    p.fill(0xc89a5f); p.noise(0.05);
    p.rect(6, 6, 84, 52, 0xf7f0de);
    p.text(info.jp || 'お届け物', 48, 10, { size: 12, color: 0x333333, align: 'center' });
    p.text(info.name || '', 48, 28, { size: 9, color: 0x666666, align: 'center', font: FONT_EN });
    p.rect(20, 42, 56, 12, 0xffd23f);
    p.text('ワレモノ注意', 48, 42, { size: 9, color: 0xd8282a, align: 'center' });
  }
  return p.texture();
}

export function makeBoxMesh(kind, info, size = [0.36, 0.24, 0.28]) {
  const [w, h, d] = size;
  const group = new THREE.Group();
  const card = pixMat('cardboard', { roughness: 0.95 });
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(0, h / 2, 0);
  const label = new THREE.MeshStandardMaterial({ map: labelTex(kind, info), roughness: 0.85 });
  const mats = kind === 'single'
    ? [label, label, label, label, label, label]
    : [card, card, card, card, label, label];
  const box = new THREE.Mesh(geo, mats);
  box.castShadow = true; box.receiveShadow = true;
  group.add(box);
  if (kind !== 'single') {
    const tape = new THREE.Mesh(new THREE.BoxGeometry(w + 0.002, 0.002, 0.05), new THREE.MeshStandardMaterial({ color: 0xc8a878, roughness: 0.35, transparent: true, opacity: 0.9 }));
    tape.position.y = h + 0.001;
    group.add(tape);
  }
  group.userData.size = size;
  return group;
}

/** Paint roller (museum remodel tool). */
export function makeRoller() {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.3, 10), new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.4 }));
  handle.position.set(0, 0.15, 0);
  g.add(handle);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.12), new THREE.MeshStandardMaterial({ color: 0xc8ccd2, metalness: 0.9, roughness: 0.3 }));
  arm.position.set(0, 0.3, 0.06);
  g.add(arm);
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 16), new THREE.MeshStandardMaterial({ color: 0xf6f0e8, roughness: 0.95 }));
  roll.rotation.z = Math.PI / 2;
  roll.position.set(0, 0.3, 0.12);
  g.add(roll);
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return g;
}

export class Delivery {
  constructor(game) {
    this.game = game;
    this.queue = [];
    this.busyT = 0;
  }

  /** Queue a delivery. data: {type:'refill'|'single'|'decor', ...} */
  order(data, opts = {}) {
    data.oid = nextId++;
    this.queue.push({ data, delay: opts.delay ?? 2.2 });
  }

  spawnRefillBox(series, count, pos) {
    const data = { type: 'refill', series, count, label: `${SERIES_BY_ID[series].jp} ×${count}` };
    const mesh = makeBoxMesh('refill', data, this.sizeFor(data));
    return this.game.items.spawnBox(data, pos, mesh);
  }

  sizeFor(data) {
    if (data.type === 'refill') { const s = Math.min(1.25, 0.8 + data.count / 60); return [0.36 * s, 0.22 * s, 0.28 * s]; }
    if (data.type === 'single') return [0.16, 0.05, 0.12];
    if (data.type === 'decor') return data.boxSize || [0.5, 0.4, 0.45];
    return [0.3, 0.25, 0.25];
  }

  meshFor(data) {
    if (data.type === 'roller') return makeRoller();
    const kind = data.type === 'refill' ? 'refill' : data.type === 'single' ? 'single' : 'decor';
    return makeBoxMesh(kind, data, this.sizeFor(data));
  }

  arrive(data) {
    const g = this.game;
    const DS = g.garage.deliverySpot;
    const target = new THREE.Vector3(DS.x + (Math.random() - 0.5) * 0.5, 0, DS.z + (Math.random() - 0.5) * 0.4);
    const start = new THREE.Vector3(target.x + (Math.random() - 0.5) * 0.4, 0, 7.2);
    const mesh = this.meshFor(data);
    mesh.position.copy(start);
    mesh.rotation.y = (Math.random() - 0.5) * 0.6;
    g.scene.add(mesh);
    audio.play('truck', { pos: new THREE.Vector3(0, 1, 9), vol: 0.9 });
    g.tweens.wait(0.9, () => audio.play('doorbell', { pos: new THREE.Vector3(1.5, 1.6, 4.9), vol: 0.9 }));
    g.tweens.add({
      delay: 1.6, dur: 1.0, ease: ease.outCubic,
      update: (k) => { mesh.position.lerpVectors(start, target, k); mesh.rotation.z = Math.sin(k * Math.PI * 3) * 0.04 * (1 - k); },
      done: () => {
        audio.play('drop', { pos: target, vol: 0.7 });
        g.scene.remove(mesh);
        g.items.spawnBox(data, target, mesh);
      },
    });
    g.tweens.wait(1.6, () => audio.play('whoosh', { pos: start, v: 0.12, dur: 0.6 }));
  }

  update(dt) {
    if (this.busyT > 0) this.busyT -= dt;
    for (const q of this.queue) q.delay -= dt;
    if (this.busyT <= 0 && this.queue.length && this.queue[0].delay <= 0) {
      const q = this.queue.shift();
      this.arrive(q.data);
      this.busyT = 0.9;
      if (!this.queue.length) this.game.news('お届け物です！ Delivery at the shutter', '');
    }
  }
}
