// A stray cat on the lane at night (not Mikan: a dark one): most nights, some time after nine, she pads in from one of
// the underpasses along the house fronts, stops to sit, groom or stare at you, keeps clear of people (src/people/
// crowd.js), bolts if you come at her, and slips away down the other end or into the alley by Mikawa-ya.
//   new StrayCat(game).update(dt)
import * as THREE from 'three';
import { CatRig } from '../world/CatRig.js';
import { crowdOf } from '../people/crowd.js';
import { audio } from '../core/audio.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const V = (x, z) => new THREE.Vector3(x, 0, z);

export class StrayCat {
  constructor(game) {
    this.game = game;
    this.rig = null;
    this.on = false;
    this.nightOf = -1;
    this.stats = { nights: 0, visits: 0, bolts: 0 };
    this.t = 0;
  }
  build() {
    const r = this.rig = new CatRig({ coat: 'tabby' }); // a dark grey mackerel tabby with amber eyes
    r.root.scale.setScalar(0.94);
    r.root.visible = false;
    this.game.scene.add(r.root);
    this.a = crowdOf(this.game).agent(r.root.position, { r: 0.16, kind: 'cat', owner: this });
    this.a.hidden = true;
  }
  get hour() { return this.game.clock?.hours ?? 15; }
  night() { const h = this.hour; return h >= 21 || h < 4.5; }

  start() {
    if (!this.rig) this.build();
    const side = Math.random() < 0.5 ? -1 : 1, z = Math.random() < 0.5 ? 6.0 : 14.1;
    this.rig.root.position.set(side * 27.5, 0, z);
    this.rig.root.visible = true;
    this.a.hidden = false;
    this.dir = -side;
    this.z = z;
    this.path = [];
    for (let k = 1; k <= 3; k++) this.path.push(V(side * 27.5 - side * k * rnd(12, 16), z + rnd(-0.25, 0.25)));
    this.path.push(Math.random() < 0.3 ? V(-8.4, 18.5) : V(-side * 28, z));
    this.state = 'walk'; this.wait = 0; this.on = true;
    this.rig.setPose('walk');
    this.stats.visits++;
  }
  stop() { this.on = false; if (this.rig) { this.rig.root.visible = false; this.a.hidden = true; } }

  update(dt) {
    this.t += dt;
    const day = this.game.clock?.day ?? 1;
    if (!this.on) {
      if (!this.night()) return;
      // most nights she comes by once or twice
      if (this.nightOf !== day + (this.hour < 12 ? -1 : 0)) { this.nightOf = day + (this.hour < 12 ? -1 : 0); this.left = Math.random() < 0.8 ? (Math.random() < 0.5 ? 2 : 1) : 0; this.nextT = rnd(10, 90); this.stats.nights++; }
      if (this.left > 0 && (this.nextT -= dt) <= 0) { this.left--; this.nextT = rnd(120, 300); this.start(); }
      return;
    }
    if (!this.night() && this.state !== 'bolt' && this.rig.root.position.distanceTo(this.game.player.pos) > 12) { this.stop(); return; }
    const r = this.rig, pos = r.root.position, pl = this.game.player.pos;
    const pd = Math.hypot(pl.x - pos.x, pl.z - pos.z);
    const C = crowdOf(this.game);
    // you come at her: she bolts for the nearest end
    if (pd < 1.5 && this.state !== 'bolt' && Math.hypot(this.game.player.vel.x, this.game.player.vel.z) > 0.8) {
      this.state = 'bolt';
      this.path = [V(pos.x < pl.x ? -28 : 28, this.z)];
      r.mood = 'scared';
      try { audio.play('meow', { pos: pos.clone().setY(0.3), vol: 0.5 }); } catch { /* */ }
      this.stats.bolts++;
    }
    let speed = 0;
    if (this.wait > 0) {
      this.wait -= dt;
      C.idle(this.a, dt);
      r.lookAt = pd < 5 ? this.game.camera.position : null;
      if (this.wait <= 0) { r.setPose('walk'); r.mood = 'calm'; }
    } else if (this.path.length) {
      const res = C.step(this.a, dt, { target: this.path[0], final: this.path.length === 1, speed: this.state === 'bolt' ? 2.6 : 0.55, tight: true });
      if (res.corner || res.arrived) {
        this.path.shift();
        if (this.path.length && this.state === 'walk') { this.wait = rnd(5, 12); r.setPose(pick(['sit', 'groom', 'sit'])); }
      }
      speed = this.a.speed;
      if (speed > 0.05) r.root.rotation.y += Math.atan2(Math.sin(Math.atan2(this.a.vel.x, this.a.vel.z) - r.root.rotation.y), Math.cos(Math.atan2(this.a.vel.x, this.a.vel.z) - r.root.rotation.y)) * Math.min(1, dt * 8);
      r.lookAt = null;
    } else { this.stop(); return; }
    if (pd < 30) r.update(dt, speed);
  }
}
