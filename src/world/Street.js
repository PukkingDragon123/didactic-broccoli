// The quiet back street outside the shop: a flock of pigeons that peck about and scatter when you come
// close, and a stray cat that wanders, sits, and can be picked up and carried.
import * as THREE from 'three';
import { propMesh, hasProp } from './props.js';
import { audio } from '../core/audio.js';
import { GARAGE } from './Garage.js';

const BOUNDS = { x0: -11, x1: 11, z0: GARAGE.maxZ + 0.6, z1: GARAGE.maxZ + 8.6 };
const rnd = (a, b) => a + Math.random() * (b - a);

function swapMesh(group, id, fallback) {
  group.clear();
  const m = propMesh(id, { fallbackSize: fallback, castShadow: false });
  m.castShadow = true;
  group.add(m);
  return m;
}

export class Street {
  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    game.scene.add(this.group);
    this.pigeons = [];
    for (let i = 0; i < 7; i++) this.addPigeon(true);
    this.buildCat();
    this.coo = 4;
  }

  addPigeon(initial) {
    const g = new THREE.Group();
    swapMesh(g, 'pigeon', [0.25, 0.2, 0.3]);
    const p = {
      g, state: initial ? 'walk' : 'land', t: rnd(0, 3), heading: rnd(0, 6.28), speed: 0,
      pos: initial ? new THREE.Vector3(rnd(-4, 5), 0, rnd(BOUNDS.z0 + 1.5, BOUNDS.z1 - 1)) : new THREE.Vector3(rnd(-8, 8), 5, BOUNDS.z1 + 2),
      vel: new THREE.Vector3(), target: null, peck: 0,
    };
    if (!initial) { p.target = new THREE.Vector3(rnd(-5, 5), 0, rnd(BOUNDS.z0 + 2, BOUNDS.z1 - 1)); swapMesh(g, 'pigeon_fly', [0.5, 0.15, 0.3]); p.flying = true; }
    g.position.copy(p.pos);
    g.scale.setScalar(rnd(0.9, 1.1));
    this.group.add(g);
    this.pigeons.push(p);
  }

  updatePigeons(dt, t) {
    const pl = this.game.player.pos;
    for (const p of this.pigeons) {
      p.t += dt;
      if (p.state === 'walk') {
        // bob-walk, stop to peck, turn now and then
        if (p.peck > 0) { p.peck -= dt; p.g.children[0].rotation.x = Math.max(0, Math.sin(p.peck * 18)) * 0.5; }
        else {
          p.g.children[0].rotation.x = 0;
          p.heading += Math.sin(p.t * 0.7 + p.pos.x) * dt * 1.5;
          const sp = 0.35;
          p.pos.x += Math.sin(p.heading) * sp * dt; p.pos.z += Math.cos(p.heading) * sp * dt;
          if (p.pos.x < BOUNDS.x0 + 1 || p.pos.x > BOUNDS.x1 - 1 || p.pos.z < BOUNDS.z0 + 0.8 || p.pos.z > BOUNDS.z1 - 0.5) p.heading += Math.PI * dt * 2;
          if (Math.random() < dt * 0.4) p.peck = rnd(0.5, 1.5);
          p.g.position.y = Math.abs(Math.sin(p.t * 9)) * 0.012;
        }
        p.g.rotation.y = p.heading;
        // too close: everybody up!
        if (Math.hypot(pl.x - p.pos.x, pl.z - p.pos.z) < 2.2 || p.scare) this.flyOff(p);
      } else if (p.state === 'fly') {
        p.vel.y += dt * 1.5;
        p.pos.addScaledVector(p.vel, dt);
        p.g.children[0].scale.y = 0.7 + Math.abs(Math.sin(p.t * 22)) * 0.6;
        if (p.pos.y > 9) { p.state = 'gone'; p.g.visible = false; p.wait = rnd(8, 20); }
      } else if (p.state === 'gone') {
        p.wait -= dt;
        if (p.wait <= 0) {
          p.state = 'land'; p.g.visible = true;
          p.pos.set(rnd(-8, 8), 6, BOUNDS.z1 + 3);
          p.target = new THREE.Vector3(rnd(-5, 5), 0, rnd(BOUNDS.z0 + 2, BOUNDS.z1 - 1));
          if (Math.hypot(pl.x - p.target.x, pl.z - p.target.z) < 4) p.target.x = -p.target.x;
        }
      } else if (p.state === 'land') {
        const d = p.target.clone().sub(p.pos);
        const len = d.length();
        p.g.children[0].scale.y = 0.7 + Math.abs(Math.sin(p.t * 16)) * 0.5;
        if (len < 0.05) { p.state = 'walk'; p.pos.y = 0; swapMesh(p.g, 'pigeon', [0.25, 0.2, 0.3]); p.heading = rnd(0, 6.28); }
        else { p.pos.addScaledVector(d.normalize(), Math.min(len, dt * 3)); p.g.rotation.y = Math.atan2(d.x, d.z); }
      }
      p.scare = false;
      p.g.position.x = p.pos.x; p.g.position.z = p.pos.z;
      if (p.state !== 'walk') p.g.position.y = p.pos.y;
    }
    // ambient cooing when you're outside
    this.coo -= dt;
    if (this.coo <= 0) {
      this.coo = rnd(5, 11);
      const w = this.pigeons.find((p) => p.state === 'walk');
      if (w && pl.z > GARAGE.maxZ - 2) audio.play('coo', { pos: w.pos.clone().setY(0.2), vol: 0.5 });
    }
  }

  flyOff(p) {
    if (p.state !== 'walk') return;
    p.state = 'fly';
    swapMesh(p.g, 'pigeon_fly', [0.5, 0.15, 0.3]);
    const away = p.pos.clone().sub(this.game.player.pos).setY(0).normalize();
    p.vel.set(away.x * 2.5 + rnd(-0.6, 0.6), 1.6, away.z * 2.5 + 1);
    p.g.rotation.y = Math.atan2(p.vel.x, p.vel.z);
    audio.play('flutter', { pos: p.pos.clone().setY(0.3), vol: 0.8 });
    // the rest of the flock goes too
    for (const o of this.pigeons) if (o !== p && o.state === 'walk' && o.pos.distanceTo(p.pos) < 3) o.scare = true;
  }

  // ------------------------------------------------------------------ the stray cat
  buildCat() {
    const g = new THREE.Group();
    this.cat = { g, state: 'sit', t: 0, pos: new THREE.Vector3(3.6, 0, GARAGE.maxZ + 1.4), heading: -2.4, target: null, held: false };
    swapMesh(g, 'stray_cat_sit', [0.3, 0.3, 0.4]);
    g.position.copy(this.cat.pos);
    g.rotation.y = this.cat.heading;
    this.group.add(g);
    const game = this.game;
    game.interaction.add(g, {
      hint: (held) => (held ? null : { key: 'L', text: 'だっこする · Pick up the cat' }),
      use: () => { this.pickUpCat(); return false; },
    });
  }

  pickUpCat() {
    const c = this.cat, game = this.game;
    if (game.held.item || c.held) return;
    c.held = true;
    game.interaction.remove(c.g);
    const holder = new THREE.Group();
    const m = propMesh('stray_cat_held', { fallbackSize: [0.3, 0.4, 0.3] });
    holder.add(m);
    holder.position.copy(c.g.getWorldPosition(new THREE.Vector3()));
    this.group.remove(c.g);
    game.scene.add(holder);
    game.held.take('cat', { cat: true }, holder);
    audio.play('meow', { vol: 0.8 });
  }

  /** Clicking while holding the cat: a little pet. */
  pet() {
    audio.play('purr', { vol: 0.6 });
    const p = this.game.held.item?.obj.getWorldPosition(new THREE.Vector3());
    if (p) this.game.effects.sparks({ pos: p.add(new THREE.Vector3(0, 0.12, 0)), count: 6, colors: [0xff9fae], speed: 0.2, size: 0.02, gravity: -0.3, life: 1.2, star: 0 });
  }

  releaseCat(at) {
    const c = this.cat;
    c.held = false;
    c.pos.copy(at).setY(0);
    c.state = 'walk'; c.t = 0;
    c.target = null;
    swapMesh(c.g, 'stray_cat', [0.3, 0.3, 0.45]);
    c.g.position.copy(c.pos);
    this.group.add(c.g);
    this.game.interaction.add(c.g, {
      hint: (held) => (held ? null : { key: 'L', text: 'だっこする · Pick up the cat' }),
      use: () => { this.pickUpCat(); return false; },
    });
    audio.play('meow', { pos: c.pos.clone().setY(0.3), vol: 0.6, pitch: 1.2 });
  }

  updateCat(dt) {
    const c = this.cat;
    if (c.held) return;
    c.t += dt;
    if (c.state === 'sit' && c.t > rnd(6, 14)) {
      c.state = 'walk'; c.t = 0;
      c.target = new THREE.Vector3(rnd(-5, 6), 0, rnd(GARAGE.maxZ - 3.5, BOUNDS.z1 - 1));
      swapMesh(c.g, 'stray_cat', [0.3, 0.3, 0.45]);
    } else if (c.state === 'walk') {
      if (!c.target) c.target = new THREE.Vector3(rnd(-5, 6), 0, rnd(GARAGE.maxZ - 3.5, BOUNDS.z1 - 1));
      const d = c.target.clone().sub(c.pos).setY(0);
      const len = d.length();
      if (len < 0.1 || c.t > 12) {
        c.state = 'sit'; c.t = 0;
        swapMesh(c.g, 'stray_cat_sit', [0.3, 0.3, 0.4]);
        if (Math.random() < 0.5) audio.play('meow', { pos: c.pos.clone().setY(0.3), vol: 0.45 });
      } else {
        // the shutter: only cross it near the middle
        const step = d.normalize().multiplyScalar(Math.min(len, dt * 0.55));
        const nz = c.pos.z + step.z;
        if ((c.pos.z - GARAGE.maxZ) * (nz - GARAGE.maxZ) < 0 && Math.abs(c.pos.x) > 2.8) c.target.x = 0;
        else c.pos.add(step);
        c.heading = Math.atan2(step.x, step.z);
        c.g.position.y = Math.abs(Math.sin(c.t * 8)) * 0.008;
      }
    }
    c.g.position.x = c.pos.x; c.g.position.z = c.pos.z;
    c.g.rotation.y += ((c.heading - c.g.rotation.y + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 6);
  }

  update(dt, t) {
    this.updatePigeons(dt, t);
    this.updateCat(dt);
  }
}

export { hasProp };
