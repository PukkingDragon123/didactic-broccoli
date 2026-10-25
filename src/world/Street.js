// The quiet back street outside the shop: a flock of pigeons that peck about and scatter when you come
// close, and Mikan the cat — a shy stray hiding in the garage until you feed her, then a friend who
// wanders the shop and the lane and can be picked up and carried.
import * as THREE from 'three';
import { propMesh, hasProp } from './props.js';
import { audio } from '../core/audio.js';
import { GARAGE } from './Garage.js';
import { CatRig } from './CatRig.js';

const BOUNDS = { x0: -18, x1: 18, z0: GARAGE.maxZ + 0.6, z1: GARAGE.maxZ + 8.6 };
const rnd = (a, b) => a + Math.random() * (b - a);
// where the shy stray hides inside the garage before she trusts you
const HIDE = [new THREE.Vector3(0.35, 0, 0.1), new THREE.Vector3(0.7, 0, -4.25), new THREE.Vector3(-2.3, 0, -1.6)];

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
  // A low-poly calico (CatRig) that wanders, sits, grooms, kneads and naps in sunny spots (stretching when she wakes),
  // sometimes trots over to you with her tail up, and can be picked up (dangles, swishes, looks at you) and petted.
  buildCat() {
    const rig = new CatRig();
    const st = this.game.state.story;
    const wild = !!st && !st.complete && !st.fed;
    const start = wild ? HIDE[0].clone() : new THREE.Vector3(-1.4, 0, 2.6);
    this.cat = { rig, g: rig.root, state: wild ? 'hide' : 'sit', t: 0, dur: 6, pos: start, heading: wild ? 0.6 : -2.4, target: null, held: false, purr: 0, wild, mew: 6 };
    rig.setPose(wild ? 'sleep' : 'sit');
    rig.root.position.copy(this.cat.pos);
    rig.root.rotation.y = this.cat.heading;
    this.group.add(rig.root);
    this.catInteract();
  }

  catInteract() {
    const c = this.cat;
    this.game.interaction.add(c.g, {
      hint: (held) => {
        if (c.wild) return { key: '', text: 'A shy stray cat', sub: 'She looks hungry...' };
        if (c.state === 'drink') return null;
        return this.game.held.canTake() ? { key: 'LMB', text: 'Pick up Mikan' } : { key: '', text: 'Mikan', sub: 'Free a slot to pick her up' };
      },
      use: () => { if (c.wild) this.fleeCat(); else this.pickUpCat(); return false; },
    });
  }

  pickUpCat() {
    const c = this.cat, game = this.game;
    if (!game.held.canTake() || c.held || c.wild) return;
    c.held = true;
    game.interaction.remove(c.g);
    const holder = new THREE.Group();
    holder.position.copy(c.g.getWorldPosition(new THREE.Vector3()));
    this.group.remove(c.g);
    c.g.position.set(0, -0.12, 0);
    c.g.rotation.set(0, 0, 0);
    holder.add(c.g);
    game.scene.add(holder);
    c.rig.setPose('held');
    game.held.take('cat', { cat: true }, holder);
    audio.play('meow', { vol: 0.8 });
  }

  /** Clicking while holding the cat: a little pet. */
  pet() {
    const c = this.cat;
    audio.play('purr', { vol: 0.6 });
    c.purr = 1.2;
    c.rig.pet?.();
    const p = this.game.held.item?.obj.getWorldPosition(new THREE.Vector3());
    if (p) this.game.effects.sparks({ pos: p.add(new THREE.Vector3(0, 0.15, 0)), count: 6, colors: [0xff9fae], speed: 0.2, size: 0.02, gravity: -0.3, life: 1.2, star: 0 });
  }

  releaseCat(at) {
    const c = this.cat;
    c.held = false;
    c.g.parent?.remove(c.g);
    c.pos.copy(at).setY(0);
    c.g.position.copy(c.pos);
    this.group.add(c.g);
    this.setCatState('walk', 3);
    c.target = c.pos.clone().add(new THREE.Vector3(Math.random() - 0.5, 0, 1.5));
    this.catInteract();
    audio.play('meow', { pos: c.pos.clone().setY(0.3), vol: 0.6, pitch: 1.2 });
  }

  /** 'groove' sits and bobs along to a beat: opts { bpm, phase, clock } (see CatRig.setPose). */
  setCatState(st, dur, opts) {
    const c = this.cat;
    c.state = st; c.t = 0; c.dur = dur;
    c.rig.setPose(st === 'approach' || st === 'walk' || st === 'flee' || st === 'bowl' ? 'walk' : st, opts);
    c.rig.mood = st === 'flee' || st === 'hide' ? 'scared' : st === 'approach' || st === 'groove' ? 'happy' : 'calm';
  }

  // ---- story hooks: the shy stray inside the garage
  /** Run to the hiding spot farthest from the player. */
  fleeCat() {
    const c = this.cat, pl = this.game.player.pos;
    const far = HIDE.slice().sort((a, b) => Math.hypot(b.x - pl.x, b.z - pl.z) - Math.hypot(a.x - pl.x, a.z - pl.z))[0];
    if (c.target && c.state === 'flee') return;
    c.target = far.clone();
    this.setCatState('flee', 8);
    audio.play('meow', { pos: c.pos.clone().setY(0.3), vol: 0.5, pitch: 1.4 });
  }

  scareCat() { if (this.cat.wild) this.fleeCat(); }
  catComeTo(bowl) { const c = this.cat; c.target = bowl.clone().add(new THREE.Vector3(0.04, 0, -0.18)); c.bowl = bowl.clone(); this.setCatState('bowl', 30); }
  catArrived() { return this.cat.state === 'drink'; }
  catDrink(sec) { const c = this.cat; this.setCatState('drink', sec); }
  befriendCat() { const c = this.cat; c.wild = false; this.setCatState('sit', 8); }

  /** Height she rests at: the towel nest when inside Grandpa's box bed, else the floor. */
  catFloor(p) {
    const bed = this.game.story?.bed;
    if (!bed) return 0;
    if (!this.bedBox || this.bedBox.obj !== bed) { const b = new THREE.Box3().setFromObject(bed); this.bedBox = { obj: bed, b }; }
    const b = this.bedBox.b;
    return p.x > b.min.x + 0.05 && p.x < b.max.x - 0.05 && p.z > b.min.z + 0.05 && p.z < b.max.z - 0.05 ? b.min.y + (b.max.y - b.min.y) * 0.42 : 0;
  }

  pickCatTarget() {
    // favourite spots: the bed by the heater, under the work table, the shutter's sunny apron, the vending machines, the bench
    const spots = [[-1.5, 2.15], [0.4, 0.1], [1.0, 4.2], [-2.6, 6.0], [3.4, 5.9], [0.2, 5.9], [2.4, -0.4]];
    const sp = spots[Math.floor(Math.random() * spots.length)];
    return new THREE.Vector3(sp[0] + rnd(-0.25, 0.25), 0, sp[1] + rnd(-0.2, 0.2));
  }

  updateCat(dt) {
    const c = this.cat;
    const pl = this.game.player.pos;
    // eyes: slit pupils outside in the low sun, wide in the dim garage (wider still with the lights off)
    const inside = c.pos.z < GARAGE.maxZ - 0.3 && !c.held;
    c.rig.dark = inside ? (this.game.garage?.lightsOn ? 0.45 : 0.9) : 0.12;
    if (c.held) { c.rig.lookAt = this.game.camera.position; c.rig.update(dt, 0); return; }
    c.t += dt;
    const toPlayer = Math.hypot(pl.x - c.pos.x, pl.z - c.pos.z);
    let speed = 0;
    const cine = this.game.cutscene?.active;
    if (c.wild && c.state === 'hide') {
      // a hungry stray: keeps its distance and mews now and then
      if (toPlayer < 1.7 && !cine && this.game.state.story?.shutter) this.fleeCat();
      c.mew -= dt;
      if (c.mew < 0) { c.mew = 7 + Math.random() * 9; if (toPlayer < 9) audio.play('meow', { pos: c.pos.clone().setY(0.3), vol: 0.45, pitch: 1.15 }); }
    }
    if (c.state === 'walk' || c.state === 'approach' || c.state === 'flee' || c.state === 'bowl') {
      if (c.state === 'approach') c.target = pl.clone().setY(0);
      const d = c.target.clone().sub(c.pos).setY(0);
      const len = d.length();
      const stop = c.state === 'approach' ? 0.55 : 0.08;
      if (len < stop || c.t > 14) {
        if (c.state === 'bowl') { this.setCatState('drink', 60); c.heading = Math.atan2(c.bowl.x - c.pos.x, c.bowl.z - c.pos.z); }
        else if (c.state === 'flee') this.setCatState('hide', 1e9);
        else {
          // arrived: sit and look at you if you're near, otherwise groom or nap
          const next = c.state === 'approach' ? 'sit' : (Math.random() < 0.35 ? 'knead' : Math.random() < 0.5 ? 'groom' : 'sit');
          this.setCatState(next, next === 'knead' ? rnd(2.5, 4) : rnd(5, 10)); // kneading settles into a nap
          if (c.state === 'sit' && toPlayer < 2) { audio.play('meow', { pos: c.pos.clone().setY(0.3), vol: 0.55 }); this.game.effects.sparks({ pos: c.pos.clone().setY(0.45), count: 4, colors: [0xff9fae], speed: 0.15, size: 0.02, gravity: -0.3, life: 1, star: 0 }); }
        }
      } else {
        speed = c.state === 'flee' ? 1.5 : c.state === 'approach' ? 0.75 : c.state === 'bowl' ? 0.8 : 0.42;
        const step = d.normalize().multiplyScalar(Math.min(len, dt * speed));
        // only cross the shutter line near the middle
        const nz = c.pos.z + step.z;
        if ((c.pos.z - GARAGE.maxZ) * (nz - GARAGE.maxZ) < 0 && Math.abs(c.pos.x) > 2.8) c.target.x = 0;
        else c.pos.add(step);
        c.heading = Math.atan2(step.x, step.z);
      }
    } else if (c.wild || c.state === 'drink') {
      // stays put (hiding / lapping milk)
    } else if (c.t > c.dur && c.state === 'knead') this.setCatState('sleep', rnd(14, 30));
    else if (c.t > c.dur && c.state === 'sleep') this.setCatState('stretch', 3.2); // waking up: a long stretch first
    else if (c.t > c.dur) {
      // curious about you now and then; otherwise off to a favourite spot
      if (toPlayer < 6 && Math.random() < 0.45) this.setCatState('approach', 10);
      else { this.setCatState('walk', 12); c.target = this.pickCatTarget(); }
    } else if (c.state === 'sleep' && toPlayer < 1.2 && c.t > 2) {
      this.setCatState('sit', 6); // you woke it up
    }
    if (c.state === 'drink' && !c.wild && c.t > c.dur) this.setCatState('sit', 6);
    // sitting cats watch you (head and eyes follow the camera)
    const watching = (c.state === 'sit' || c.state === 'hide' || c.state === 'groove' || c.state === 'knead' || (c.state === 'approach' && speed === 0)) && toPlayer < 4;
    c.rig.lookAt = watching ? this.game.camera.position : null;
    if ((c.state === 'sit' || c.state === 'hide' || c.state === 'groove') && toPlayer < 4) {
      const want = Math.atan2(pl.x - c.pos.x, pl.z - c.pos.z) - c.g.rotation.y;
      c.rig.lookYaw += ((((want + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * 0.8 - c.rig.lookYaw) * Math.min(1, dt * 3);
      c.rig.lookYaw = Math.max(-0.9, Math.min(0.9, c.rig.lookYaw));
    } else c.rig.lookYaw *= 1 - Math.min(1, dt * 3);
    c.rig.update(dt, speed);
    // in the cardboard bed she lies on the towel, not inside it (a little hop in / out)
    c.y = (c.y || 0) + (this.catFloor(c.pos) - (c.y || 0)) * Math.min(1, dt * 8);
    c.g.position.set(c.pos.x, c.y, c.pos.z);
    c.g.rotation.y += ((c.heading - c.g.rotation.y + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 6);
  }

  update(dt, t) {
    this.updatePigeons(dt, t);
    this.updateCat(dt);
  }
}

export { hasProp };
