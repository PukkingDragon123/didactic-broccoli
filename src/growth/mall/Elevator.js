// The Kaikan's lift: one car serving every floor. Each floor's zone has the same car interior behind the same doors
// (layout.js LIFT), so going up or down is a zone swap while the doors are shut: you never see a seam.
// Outside: a call button and the floor indicator over the doors. Inside: a button for every floor (the ones not fitted
// out yet are dead), open / close, a mirror, a handrail, an inspection sticker, and muzak (src/growth/sfx.js) while
// you're in the car. Arriving: a soft two-note ding and the doors slide open.
//   new Elevator(mall)   .build(zone, n)  .call(n)  .press(n)  .update(dt)  .inCar()
import * as THREE from 'three';
import { audio } from '../../core/audio.js';
import { playSong } from '../../room/sfx.js';
import { LIFT, CH, FLOORS } from './layout.js';
import { canvasMat, pixText, sfx } from '../kit.js';
import { photoNorm } from '../../places/ikit.js';
import { photoTex } from '../../kit/photoTex.js';

const MOVE = 1.9, DOOR_T = 0.9, HOLD = 5;

export class Elevator {
  constructor(mall) {
    this.mall = mall;
    this.game = mall.game;
    this.s = mall.s;
    this.car = { floor: Math.min(Math.max(1, this.s.elev || 1), FLOORS), state: 'idle', k: 0, t: 0, target: null, dir: 0 };
    this.parts = {};
    this.out = canvasMat(24, 12, (x) => this.drawOut(x), { glow: true });
    this.inside = canvasMat(24, 56, (x) => this.drawIn(x), { glow: true });
    this.music = null;
    this.musicT = 0;
  }

  // ------------------------------------------------------------------ geometry (per floor zone)
  build(zone, n) {
    const Z = zone, B = Z.B, L = LIFT;
    // hairline stainless (the brushed photo), vinyl cloth on the lobby walls
    const steel = Z.mat(photoNorm('steel_galvanised', { rough: 0.34, metal: 0.65, metres: 0.8 }));
    const paint = Z.mat(photoNorm('canvas_cloth', { rough: 0.86 }));
    const glow = new THREE.MeshBasicMaterial({ vertexColors: true });
    const dw = L.dw, wx = L.door;
    // the lobby wall with the doorway, the shaft above
    B.box(paint, 0.12, CH, 1.2 - dw, wx + 0.02, 0, -(1.2 + dw) / 2, { tint: 0xd8d4cc });
    B.box(paint, 0.12, CH, 1.2 - dw, wx + 0.02, 0, (1.2 + dw) / 2, { tint: 0xd8d4cc });
    B.box(paint, 0.12, CH - 2.15, dw * 2, wx + 0.02, 2.15, 0, { tint: 0xd8d4cc });
    B.box(steel, 0.06, 2.2, 0.08, wx + 0.09, 0, -dw - 0.04, { tint: 0xc8ccd2 });
    B.box(steel, 0.06, 2.2, 0.08, wx + 0.09, 0, dw + 0.04, { tint: 0xc8ccd2 });
    B.box(steel, 0.06, 0.08, dw * 2 + 0.16, wx + 0.09, 2.12, 0, { tint: 0xc8ccd2 });
    for (const z of [-1.2, 1.2]) B.box(paint, L.door - (-13), CH, 0.12, (-13 + L.door) / 2, 0, z, { tint: 0xd8d4cc });
    // the car: steel walls, the mirror at the back, a handrail, a glowing ceiling, a rubber floor
    B.plane(paint, L.x1 - L.x0, L.z1 - L.z0, (L.x0 + L.x1) / 2, 0.005, 0, { tint: 0x3a3a40 });
    B.box(steel, 0.02, L.ch, L.z1 - L.z0, L.x0, 0, 0, { tint: 0xb8bcc2 });
    for (const z of [L.z0, L.z1]) B.box(steel, L.x1 - L.x0, L.ch, 0.02, (L.x0 + L.x1) / 2, 0, z, { tint: 0xc0c4ca });
    B.box(steel, 0.01, 1.1, 1.6, L.x0 + 0.015, 0.95, 0, { tint: 0xe8f0f6 }); // mirror
    B.box(steel, 0.04, 0.04, 1.8, L.x0 + 0.06, 0.9, 0, { tint: 0xd8dce2 });
    for (const z of [L.z0 + 0.05, L.z1 - 0.05]) B.box(steel, 1.7, 0.04, 0.04, (L.x0 + L.x1) / 2, 0.9, z, { tint: 0xd8dce2 });
    B.box(glow, L.x1 - L.x0 - 0.2, 0.02, L.z1 - L.z0 - 0.2, (L.x0 + L.x1) / 2, L.ch - 0.04, 0, { tint: 0xfff8e8 });
    B.box(paint, L.x1 - L.x0 + 0.1, 0.06, L.z1 - L.z0 + 0.1, (L.x0 + L.x1) / 2, L.ch, 0, { tint: 0x8a8e94 });
    B.box(steel, 0.08, L.ch, L.z1 - dw - 0.01, L.x1 + 0.12, 0, -(dw + L.z1) / 2, { tint: 0xb8bcc2 });
    B.box(steel, 0.08, L.ch, L.z1 - dw - 0.01, L.x1 + 0.12, 0, (dw + L.z1) / 2, { tint: 0xb8bcc2 });
    // the doors (two leaves sliding apart)
    const leafM = Z.mat(new THREE.MeshStandardMaterial({ map: photoTex('steel_galvanised', { repeat: [0.6, 2.6] }), color: 0xa2a8ae, roughness: 0.38, metalness: 0.55, envMapIntensity: 0.4 }));
    const leaves = [-1, 1].map((s) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.1, dw), leafM);
      m.position.copy(Z.L(wx - 0.02, 1.05, s * dw / 2));
      Z.group.add(m);
      return { m, s };
    });
    // the indicator over the doors, the call button beside them, the floor buttons inside
    const ind = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.18), this.out);
    ind.position.copy(Z.L(wx + 0.09, 2.42, 0)); ind.rotation.y = Math.PI / 2; Z.group.add(ind);
    const callMat = canvasMat(12, 20, (x) => this.drawCall(x, n), { glow: true });
    const call = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.2), callMat);
    call.position.copy(Z.L(wx + 0.09, 1.15, 0.82)); call.rotation.y = Math.PI / 2; Z.group.add(call);
    const pan = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.46), this.inside);
    pan.position.copy(Z.L(L.x1 + 0.07, 1.25, -0.78)); pan.rotation.y = -Math.PI / 2; Z.group.add(pan);
    const sticker = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.1), canvasMat(20, 14, (x) => { x.fillStyle = '#f4f0e4'; x.fillRect(0, 0, 20, 14); x.fillStyle = '#2f5a9a'; x.fillRect(0, 0, 20, 4); pixText(x, '検査済', 10, 4, { size: 8, align: 'center', color: '#241a1e' }); }));
    sticker.material = Z.mat(sticker.material);
    sticker.position.copy(Z.L(-11.5, 1.55, L.z1 - 0.015)); sticker.rotation.y = Math.PI; Z.group.add(sticker);
    // clickables
    Z.hit(0.08, 0.24, 0.16, wx + 0.1, 1.15, 0.82, { reach: 2.2, hint: () => this.callHint(n), use: () => { this.call(n); return false; } });
    for (let k = 1; k <= FLOORS; k++) {
      Z.hit(0.06, 0.055, 0.08, L.x1 + 0.06, 1.357 - (FLOORS - k) * 0.0575, -0.78, { reach: 1.8, hint: () => this.btnHint(k), use: () => { this.press(k); return false; } });
    }
    Z.hit(0.06, 0.06, 0.16, L.x1 + 0.06, 1.08, -0.78, { reach: 1.8, hint: () => ({ key: 'LMB', text: '◀▶ Open', sub: '' }), use: () => { this.openHere(); return false; } });
    // obstacles: the shaft, the car walls, and the doorway while the doors are shut
    Z.block(-13.5, L.x0, -1.3, 1.3);
    Z.block(-13.5, wx + 0.08, -1.3, L.z0); Z.block(-13.5, wx + 0.08, L.z1, 1.3);
    Z.block(L.x1 + 0.05, wx + 0.08, L.z0, -dw); Z.block(L.x1 + 0.05, wx + 0.08, dw, L.z1);
    const door = Z.block(wx - 0.08, wx + 0.12, -dw, dw);
    this.parts[n] = { zone: Z, leaves, door, callMat };
  }

  drawOut(x) {
    x.fillStyle = '#1a1a1e'; x.fillRect(0, 0, 24, 12);
    const c = this.car;
    x.fillStyle = '#ff9a3a';
    pixText(x, `${c.floor}F`, 15, 1, { size: 10, align: 'center', color: '#ff9a3a', font: 'DotGothic16' });
    if (c.dir) { x.fillStyle = '#ff9a3a'; const y = c.dir > 0 ? 3 : 8; for (let i = 0; i < 3; i++) x.fillRect(4 - i, y + (c.dir > 0 ? i : -i), 1 + i * 2, 1); }
  }
  drawIn(x) {
    x.fillStyle = '#c0c4ca'; x.fillRect(0, 0, 24, 56);
    x.fillStyle = '#1a1a1e'; x.fillRect(4, 2, 16, 8);
    pixText(x, `${this.car.floor}`, 12, 1, { size: 8, align: 'center', color: '#ff9a3a', font: 'DotGothic16' });
    const open = this.mall.floorsOpen;
    for (let k = FLOORS; k >= 1; k--) {
      const y = 12 + (FLOORS - k) * 7;
      const lit = this.car.target === k;
      x.fillStyle = '#7a7e84'; x.fillRect(8, y, 8, 6);
      x.fillStyle = lit ? '#ffcf5a' : k <= open ? '#f4f4f0' : '#9a9ea4'; x.fillRect(9, y + 1, 6, 4);
      pixText(x, String(k), 12, y - 1, { size: 8, align: 'center', color: lit ? '#c8322c' : '#241a1e', font: 'DotGothic16' });
    }
    x.fillStyle = '#7a7e84'; x.fillRect(5, 46, 14, 6);
    x.fillStyle = '#f4f4f0'; x.fillRect(6, 47, 12, 4);
    x.fillStyle = '#241a1e'; x.fillRect(8, 48, 2, 2); x.fillRect(14, 48, 2, 2);
  }
  drawCall(x, n) {
    x.fillStyle = '#c0c4ca'; x.fillRect(0, 0, 12, 20);
    const lit = this.car.target === n && this.car.floor !== n;
    x.fillStyle = '#7a7e84'; x.fillRect(3, 6, 6, 8);
    x.fillStyle = lit ? '#ffcf5a' : '#f4f4f0'; x.fillRect(4, 7, 4, 6);
    x.fillStyle = lit ? '#c8322c' : '#5a5e64'; x.fillRect(5, 8, 2, 1); x.fillRect(5, 11, 2, 1);
  }
  redraw() {
    this.out.userData.pix.redraw(); this.inside.userData.pix.redraw();
    for (const [n, P] of Object.entries(this.parts)) P.callMat.userData.pix.redraw((x) => this.drawCall(x, +n));
  }

  callHint(n) {
    const c = this.car;
    if (c.floor === n && (c.state === 'open' || c.state === 'opening')) return { key: '', text: 'The lift is here', sub: 'Step in' };
    if (c.target === n) return { key: '', text: 'Lift called', sub: `It\'s on ${c.floor}F` };
    return { key: 'LMB', text: 'Call the lift', sub: `It\'s on ${c.floor}F` };
  }
  btnHint(k) {
    if (k > this.mall.floorsOpen) return { key: '', text: `${k}F`, sub: 'Under construction (fit it out on Ota Real Estate\'s site)' };
    return { key: 'LMB', text: `${k}F: ${this.mall.floorName(k)}`, sub: k === this.car.floor ? 'You\'re here' : '' };
  }

  // ------------------------------------------------------------------ control
  call(n) {
    const c = this.car;
    sfx('elevButton', { vol: 0.5 });
    if (c.floor === n && c.state !== 'moving') { this.openDoors(); return; }
    if (c.target === null) c.target = n; else c.queued = n;
    if (c.state === 'idle') this.depart();
    this.redraw();
  }
  press(k) {
    const c = this.car;
    if (k > this.mall.floorsOpen) { sfx('error', { vol: 0.3 }); return; }
    sfx('elevButton', { vol: 0.5 });
    if (k === c.floor && c.state !== 'moving') { this.openDoors(); return; }
    c.target = k;
    if (c.state === 'open' || c.state === 'opening') { c.state = 'closing'; }
    else if (c.state === 'idle') this.depart();
    this.redraw();
  }
  openHere() { const c = this.car; sfx('elevButton', { vol: 0.5 }); if (c.state !== 'moving') this.openDoors(); }
  openDoors() { const c = this.car; if (c.state === 'idle' || c.state === 'closing') { c.state = 'opening'; sfx('elevDoor', { vol: 0.5 }); } else if (c.state === 'open') c.t = 0; }
  depart() {
    const c = this.car;
    if (c.target === null || c.target === c.floor) { c.target = null; return; }
    c.state = 'moving'; c.t = 0; c.dir = Math.sign(c.target - c.floor);
    this.riding = this.inCar();
    if (this.riding) { this.motor = audio.loop?.('elevMotor', { vol: 0 }); this.motor?.set(0.05, 0.3); this.game.player.shake = Math.max(this.game.player.shake, 0.12); }
    this.redraw();
  }

  /** Is the player in the car (on the floor they're on)? */
  inCar() {
    const z = this.mall.cur;
    if (!z) return false;
    const p = z.local(this.game.player.pos), L = LIFT;
    return p.x > L.x0 - 0.1 && p.x < L.x1 + 0.2 && p.z > L.z0 && p.z < L.z1;
  }

  update(dt) {
    const c = this.car, g = this.game;
    if (c.state === 'opening') {
      c.k = Math.min(1, c.k + dt / DOOR_T);
      if (c.k >= 1) { c.state = 'open'; c.t = 0; }
    } else if (c.state === 'open') {
      c.t += dt;
      const p = this.mall.cur?.local(g.player.pos);
      const inDoor = p && Math.abs(p.z) < LIFT.dw + 0.1 && p.x > LIFT.door - 0.6 && p.x < LIFT.door + 0.5;
      if (c.t > HOLD && !inDoor) { c.state = 'closing'; sfx('elevDoor', { vol: 0.45 }); }
    } else if (c.state === 'closing') {
      c.k = Math.max(0, c.k - dt / DOOR_T);
      if (c.k <= 0) { c.state = 'idle'; if (c.target !== null && c.target !== c.floor) this.depart(); else c.target = null; }
    } else if (c.state === 'moving') {
      c.t += dt;
      if (this.riding && this.mall.cur) g.player.eye = 1.58 + Math.sin(c.t * 7) * 0.004;
      if (c.t >= MOVE) {
        c.t = 0;
        c.floor += c.dir;
        this.s.elev = c.floor;
        this.redraw();
        if (c.floor === c.target) this.arrive();
      }
    }
    // the current floor's doors
    for (const [n, P] of Object.entries(this.parts)) {
      const k = +n === c.floor ? c.k : 0;
      const e = k * k * (3 - 2 * k);
      for (const { m, s } of P.leaves) m.position.z = P.zone.o.z + s * (LIFT.dw / 2 + e * LIFT.dw * 0.98);
      P.door.enabled = !(+n === c.floor && c.k > 0.85);
    }
    // muzak while you're in the car
    const inside = this.inCar() && this.mall.cur;
    this.musicT = inside ? 0 : this.musicT + dt;
    if (inside && !this.music) { try { this.music = playSong('muzak', { vol: 0.9 }); } catch { this.music = null; } this.mall.duck(true); }
    if (this.music && this.musicT > 1.5) { this.music.stop(1.2); this.music = null; this.mall.duck(false); }
  }

  arrive() {
    const c = this.car, g = this.game;
    c.dir = 0;
    if (this.motor) { this.motor.stopAll?.(); this.motor = null; }
    if (this.riding) g.player.eye = 1.58;
    if (this.riding && this.mall.cur) { // (still in the building: the day may have ended in the car)
      this.riding = false;
      g.player.eye = 1.58;
      g.player.shake = Math.max(g.player.shake, 0.1);
      this.mall.swapTo(c.floor);
      this.mall.G.give('gr_elevator');
    }
    this.riding = false;
    c.target = c.queued ?? null; c.queued = null;
    sfx('elevDing', { vol: 0.7 });
    c.state = 'opening';
    g.tweens.wait(0.25, () => sfx('elevDoor', { vol: 0.5 }));
    this.redraw();
  }
}
