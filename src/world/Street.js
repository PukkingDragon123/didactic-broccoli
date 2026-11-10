// The quiet back street outside the shop: a flock of pigeons that peck about and scatter when you come
// close (and now and then leave a dropping: src/places/pigeons.js), and Mikan the cat — a shy stray hiding in the
// garage until you feed her, then a friend who wanders the shop and the lane, can be picked up and carried, and
// sometimes stalks a pigeon (crouch, creep, a wiggle, the pounce: the whole flock bursts away).
import * as THREE from 'three';
import { hasProp } from './props.js';
import { audio } from '../core/audio.js';
import { GARAGE } from './Garage.js';
import { CatRig } from './CatRig.js';
import { PigeonFlock } from '../animals/pigeon.js';
import '../animals/props.js'; // the prop library's pigeons and strays drawn with the real models

const BOUNDS = { x0: -18, x1: 18, z0: GARAGE.maxZ + 0.6, z1: GARAGE.maxZ + 8.6 };
const rnd = (a, b) => a + Math.random() * (b - a);
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
// where the shy stray hides inside the garage before she trusts you
const HIDE = [new THREE.Vector3(0.35, 0, 0.1), new THREE.Vector3(0.7, 0, -4.25), new THREE.Vector3(-2.3, 0, -1.6)];

const _m4 = new THREE.Matrix4(), _q4 = new THREE.Quaternion(), _e4 = new THREE.Euler();

export class Street {
  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    game.scene.add(this.group);
    this.pigeons = [];
    // the whole flock is one instanced, morphing mesh (src/animals/pigeon.js); each bird keeps an empty group (p.g) as
    // its transform and visibility, which other systems move and hide
    this.flock = new PigeonFlock(16);
    this.group.add(this.flock.mesh);
    for (let i = 0; i < 7; i++) this.addPigeon(true);
    this.buildCat();
    this.coo = 4;
  }

  addPigeon(initial) {
    const g = new THREE.Group();
    const p = {
      g, state: initial ? 'walk' : 'land', t: rnd(0, 3), heading: rnd(0, 6.28), speed: 0,
      pos: initial ? new THREE.Vector3(rnd(-4, 5), 0, rnd(BOUNDS.z0 + 1.5, BOUNDS.z1 - 1)) : new THREE.Vector3(rnd(-8, 8), 5, BOUNDS.z1 + 2),
      vel: new THREE.Vector3(), target: null, peck: 0,
      anim: { peck: 0, bob: 0, fly: 0, flap: 0 }, tint: Math.random() < 0.3 ? rnd(0.62, 0.8) : rnd(0.9, 1),
    };
    if (!initial) { p.target = new THREE.Vector3(rnd(-5, 5), 0, rnd(BOUNDS.z0 + 2, BOUNDS.z1 - 1)); p.flying = true; }
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
        const A = p.anim;
        A.fly = Math.max(0, A.fly - dt * 4);
        if (p.peck > 0) { p.peck -= dt; A.peck = Math.max(0, Math.sin(p.peck * 14)); A.bob = 0; p.g.position.y = 0; }
        else {
          A.peck = 0; A.bob = 0.5 + 0.5 * Math.sin(p.t * 18);
          p.heading += Math.sin(p.t * 0.7 + p.pos.x) * dt * 1.5;
          const sp = 0.35;
          p.pos.x += Math.sin(p.heading) * sp * dt; p.pos.z += Math.cos(p.heading) * sp * dt;
          if (p.pos.x < BOUNDS.x0 + 1 || p.pos.x > BOUNDS.x1 - 1 || p.pos.z < BOUNDS.z0 + 0.8 || p.pos.z > BOUNDS.z1 - 0.5) p.heading += Math.PI * dt * 2;
          if (Math.random() < dt * 0.4) p.peck = rnd(0.5, 1.5);
          p.g.position.y = Math.abs(Math.sin(p.t * 9)) * 0.012;
        }
        p.g.rotation.y = p.heading;
        // a little something left on the pavement now and then
        if (Math.random() < dt * 0.0012) this.game.places?.pigeons?.drop(p.pos.x - Math.sin(p.heading) * 0.08, 0.1, p.pos.z - Math.cos(p.heading) * 0.08);
        // too close: everybody up!
        if (Math.hypot(pl.x - p.pos.x, pl.z - p.pos.z) < 2.2 || p.scare) this.flyOff(p, p.scareFrom);
      } else if (p.state === 'fly') {
        p.vel.y += dt * 1.5;
        p.pos.addScaledVector(p.vel, dt);
        p.anim.fly = 1; p.anim.flap = p.t * 24;
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
        p.anim.fly = 1; p.anim.flap = p.t * (len < 0.6 ? 26 : 13); // gliding in, a flurry to land
        if (!p.dropped && p.pos.y > 2 && Math.random() < dt * 0.12) { p.dropped = true; this.game.places?.pigeons?.drop(p.pos.x, p.pos.y - 0.1, p.pos.z); }
        if (len < 0.05) { p.state = 'walk'; p.pos.y = 0; p.dropped = false; p.heading = rnd(0, 6.28); }
        else { p.pos.addScaledVector(d.normalize(), Math.min(len, dt * 3)); p.g.rotation.y = Math.atan2(d.x, d.z); }
      }
      p.scare = false; p.scareFrom = null;
      p.g.position.x = p.pos.x; p.g.position.z = p.pos.z;
      if (p.state !== 'walk') p.g.position.y = p.pos.y;
    }
    this.drawPigeons();
    // ambient cooing when you're outside
    this.coo -= dt;
    if (this.coo <= 0) {
      this.coo = rnd(5, 11);
      const w = this.pigeons.find((p) => p.state === 'walk');
      if (w && pl.z > GARAGE.maxZ - 2) audio.play('coo', { pos: w.pos.clone().setY(0.2), vol: 0.5 });
    }
  }

  /** Write the flock's instances: each bird's group transform (pitched into its climb when flying) and its pose. */
  drawPigeons() {
    let n = 0;
    for (const p of this.pigeons) {
      if (!p.g.visible) continue;
      const g = p.g, fly = p.state === 'fly' || p.state === 'land';
      _q4.setFromEuler(_e4.set(fly ? (p.state === 'fly' ? -0.35 : -0.15) : g.rotation.x, g.rotation.y, g.rotation.z, 'YXZ'));
      this.flock.set(n++, _m4.compose(g.position, _q4, g.scale), p.anim, p.tint);
    }
    this.flock.commit(n);
  }

  /** Up and away from `from` (default: you). */
  flyOff(p, from = null) {
    if (p.state !== 'walk') return;
    p.state = 'fly';
    const away = p.pos.clone().sub(from || this.game.player.pos).setY(0).normalize();
    p.vel.set(away.x * 2.5 + rnd(-0.6, 0.6), 1.6, away.z * 2.5 + 1);
    p.g.rotation.y = Math.atan2(p.vel.x, p.vel.z);
    audio.play('flutter', { pos: p.pos.clone().setY(0.3), vol: 0.8 });
    // the rest of the flock goes too
    for (const o of this.pigeons) if (o !== p && o.state === 'walk' && o.pos.distanceTo(p.pos) < 3) { o.scare = true; o.scareFrom = from; }
  }

  // ------------------------------------------------------------------ the stray cat
  // A chubby voxel calico (CatRig) that wanders, sits, grooms, kneads and naps in sunny spots (stretching when she wakes),
  // sometimes trots over to you with her tail up, laps up spilt milk, and can be petted (look at her and hold LMB: your
  // hand strokes her head and back, she leans in, purrs, kneads and slow-blinks; overdo it and she swats or nibbles and
  // stalks off) or picked up (RMB; then LMB strokes her in your arms).
  buildCat() {
    const rig = new CatRig();
    const st = this.game.state.story;
    const wild = !!st && !st.complete && !st.fed;
    const start = wild ? HIDE[0].clone() : new THREE.Vector3(-1.4, 0, 2.6);
    this.cat = { rig, g: rig.root, state: wild ? 'hide' : 'sit', t: 0, dur: 6, pos: start, heading: wild ? 0.6 : -2.4, target: null, held: false, purr: 0, wild, mew: 6, space: 0 };
    rig.setPose(wild ? 'sleep' : 'sit');
    rig.root.position.copy(this.cat.pos);
    rig.root.rotation.y = this.cat.heading;
    rig.onFx = (kind, pos) => { if (kind === 'zz') this.game.effects?.mark({ sprite: 'zz', pos, color: 0xdce8ff, size: 0.03, life: 2.2, rise: 0.14, dx: 0.05 }); };
    this.group.add(rig.root);
    this.petting = null;
    this.catInteract();
  }

  catInteract() {
    const c = this.cat, g = this.game;
    g.interaction.add(c.g, {
      reach: 1.6,
      hint: () => {
        if (c.wild) return { key: '', text: 'A shy stray cat', sub: 'She looks hungry...' };
        if (c.state === 'drink' || c.state === 'lap') return null;
        if (this.petting) return { key: 'Hold LMB', text: 'Petting Mikan', sub: this.petting.annoy > 0.2 ? 'Her tail is twitching...' : 'Purrrr...' };
        if (c.space > 0) return { key: '', text: 'Mikan', sub: 'She wants a little space' };
        return { key: 'Hold LMB', text: 'Pet Mikan', sub: g.held.canTake() ? 'RMB to pick her up' : 'Free a slot to pick her up' };
      },
      use: () => { if (c.wild) { this.fleeCat(); return false; } return c.space <= 0 && c.state !== 'drink' && c.state !== 'lap'; },
      alt: () => { if (!c.wild && !this.petting) this.pickUpCat(); },
      hold: {
        canStart: () => !c.wild && !c.held && c.space <= 0,
        start: () => this.startPet(),
        update: (dt) => this.updatePet(dt),
        end: () => this.endPet(),
        done: () => !this.petting,
      },
    });
  }

  pickUpCat() {
    const c = this.cat, game = this.game;
    if (!game.held.canTake() || c.held || c.wild) return;
    this.endPet();
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
    c.rig.say('wide', 'open', 0.5);
    game.held.take('cat', { cat: true }, holder);
    audio.play('meow', { vol: 0.8 });
  }

  /** Clicking while holding the cat: a stroke along her back. */
  pet() {
    const c = this.cat;
    audio.play('purr', { vol: 0.6 });
    c.purr = 1.2;
    c.rig.pet();
    const p = c.rig.headTop(new THREE.Vector3());
    this.game.effects.hearts({ pos: p.add(new THREE.Vector3(0, 0.03, 0)), count: 2, size: 0.03 });
  }

  // ---- petting her where she is
  startPet() {
    const c = this.cat;
    if (c.wild || c.held) return;
    // she stops for it (a sleeping cat stays curled up and purrs)
    if (['walk', 'approach', 'groom', 'stretch'].includes(c.state)) this.setCatState('sit', 60);
    c.dur = Math.max(c.dur, c.t + 60);
    this.petting = { t: 0, limit: rnd(6.5, 10.5), annoy: 0, heart: 0.5, purr: 0.4, u: 0, pt: new THREE.Vector3(), done: false };
    c.rig.say('wide', null, 0.25);
  }

  updatePet(dt) {
    const P = this.petting, c = this.cat;
    if (!P) return;
    P.t += dt;
    // the stroke: from the top of her head down her back (pressing in), then lifted back to the head
    const ph = (P.t * 0.75) % 1;
    P.u = ph < 0.68 ? ph / 0.68 : 1 - (ph - 0.68) / 0.32;
    P.lift = ph < 0.68 ? 0 : Math.sin(Math.PI * (ph - 0.68) / 0.32);
    const head = c.rig.headTop(_a), back = c.rig.backTop(0.85, _b);
    P.pt.copy(head).lerp(back, Math.min(1, P.u * 1.1)).y += P.lift * 0.05;
    const settle = Math.min(1, P.t / 0.8);
    c.rig.petAt(P.pt, settle);
    // she gets tired of it: ears back, tail lashing... then a swat or a nibble and off she goes
    P.annoy = Math.max(0, Math.min(1, (P.t - P.limit) / 1.6));
    c.rig.annoyed(P.annoy);
    if (P.annoy <= 0) {
      P.purr -= dt;
      if (P.purr <= 0 && P.t > 0.6) { P.purr = 1.25; audio.play('purr', { pos: c.pos.clone().setY(0.25), vol: 0.75 }); }
      P.heart -= dt;
      if (P.heart <= 0 && P.t > 0.9) { P.heart = rnd(0.8, 1.4); this.game.effects.hearts({ pos: c.rig.headTop(_a).add(_c.set(0, 0.04, 0)), count: 1, size: 0.034 }); }
    }
    if (P.annoy >= 1 && !P.done) {
      P.done = true;
      const swat = Math.random() < 0.55;
      c.rig.react(swat ? 'swat' : 'nibble');
      audio.play('meow', { pos: c.pos.clone().setY(0.25), vol: 0.7, pitch: 0.75 });
      this.game.effects.mark({ sprite: 'anger', pos: c.rig.headTop(_a).add(_c.set(0.05, 0.05, 0)), size: 0.04, life: 1.2, rise: 0.03, fps: 6 });
      this.game.fp?.flinch?.();
      this.game.news(swat ? 'Mikan swatted your hand!' : 'Ow! Mikan nibbled your finger.');
      this.petting = null;
      c.space = 14;
      // and she stalks off somewhere else
      setTimeout(() => { if (!c.held && !this.petting) { this.setCatState('walk', 12); c.target = this.pickCatTarget(this.game.player.pos); } }, 450);
    }
  }

  endPet() {
    if (!this.petting) return;
    const c = this.cat;
    this.petting = null;
    c.rig.annoyed(0);
    if (c.state === 'sit') c.dur = c.t + rnd(3, 6);
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
    c.rig.setPose(st === 'approach' || st === 'walk' || st === 'flee' || st === 'bowl' || st === 'puddle' || st === 'pounce' ? 'walk' : st === 'lap' ? 'drink' : st, opts);
    c.rig.mood = st === 'flee' || st === 'hide' ? 'scared' : st === 'approach' || st === 'groove' ? 'happy' : 'calm';
    if (st !== 'stalk') { c.rig.wiggle = 0; c.wig = 0; }
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

  pickCatTarget(away = null) {
    // favourite spots: the bed by the heater, under the work table, the shutter's sunny apron, the vending machines, the bench
    let spots = [[-1.5, 2.15], [0.4, 0.1], [1.0, 4.2], [-2.6, 6.0], [3.4, 5.9], [0.2, 5.9], [2.4, -0.4]];
    if (away) spots = spots.filter(([x, z]) => Math.hypot(x - away.x, z - away.z) > 2.2);
    const sp = spots[Math.floor(Math.random() * spots.length)] || [0.4, 0.1];
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
    c.space = Math.max(0, c.space - dt);
    const toPlayer = Math.hypot(pl.x - c.pos.x, pl.z - c.pos.z);
    if (this.petting) { c.t = Math.min(c.t, 1); if (toPlayer > 1.7) this.endPet(); }
    let speed = 0;
    const cine = this.game.cutscene?.active;
    if (c.wild && c.state === 'hide') {
      // a hungry stray: keeps its distance and mews now and then
      if (toPlayer < 1.7 && !cine && this.game.state.story?.shutter) this.fleeCat();
      c.mew -= dt;
      if (c.mew < 0) { c.mew = 7 + Math.random() * 9; if (toPlayer < 9) audio.play('meow', { pos: c.pos.clone().setY(0.3), vol: 0.45, pitch: 1.15 }); }
    }
    if (c.state === 'stalk') speed = this.stalk(dt);
    else if (c.state === 'pounce') speed = this.pounceStep(dt);
    else if (c.state === 'walk' || c.state === 'approach' || c.state === 'flee' || c.state === 'bowl' || c.state === 'puddle') {
      if (c.state === 'approach') c.target = pl.clone().setY(0);
      const d = c.target.clone().sub(c.pos).setY(0);
      const len = d.length();
      const stop = c.state === 'approach' ? 0.55 : 0.08;
      if (len < stop || c.t > 14) {
        if (c.state === 'bowl') { this.setCatState('drink', 60); c.heading = Math.atan2(c.bowl.x - c.pos.x, c.bowl.z - c.pos.z); }
        else if (c.state === 'puddle') { this.setCatState('lap', 40); c.heading = Math.atan2(c.puddle.x - c.pos.x, c.puddle.z - c.pos.z); }
        else if (c.state === 'flee') this.setCatState('hide', 1e9);
        else {
          // arrived: sit and look at you if you're near, otherwise groom or nap
          const next = c.state === 'approach' ? 'sit' : (Math.random() < 0.35 ? 'knead' : Math.random() < 0.5 ? 'groom' : 'sit');
          this.setCatState(next, next === 'knead' ? rnd(2.5, 4) : rnd(5, 10)); // kneading settles into a nap
          if (c.state === 'sit' && toPlayer < 2) { audio.play('meow', { pos: c.pos.clone().setY(0.3), vol: 0.55 }); c.rig.meow(); this.game.effects.hearts({ pos: c.rig.headTop(_a).add(_c.set(0, 0.04, 0)), count: 1, size: 0.03 }); }
        }
      } else {
        speed = c.state === 'flee' ? 1.5 : c.state === 'approach' ? 0.75 : c.state === 'bowl' || c.state === 'puddle' ? 0.8 : 0.42;
        const step = d.normalize().multiplyScalar(Math.min(len, dt * speed));
        // only cross the shutter line near the middle
        const nz = c.pos.z + step.z;
        if ((c.pos.z - GARAGE.maxZ) * (nz - GARAGE.maxZ) < 0 && Math.abs(c.pos.x) > 2.8) c.target.x = 0;
        else c.pos.add(step);
        c.heading = Math.atan2(step.x, step.z);
      }
    } else if (c.wild || c.state === 'drink' || c.state === 'lap') {
      // stays put (hiding / drinking from the bowl / lapping up spilt milk)
      const P = this.game.pour;
      if (c.state === 'drink' && P && c.t > 0.5 && !P.drink(0.01, dt) && !c.wild && !this.game.cutscene?.active) { this.setCatState('sit', rnd(4, 7)); c.rig.say('content', 'blep', 1.2); }
      if (c.state === 'lap' && (!P || !P.lap(c.puddle, 0.009, dt))) { this.setCatState('sit', rnd(4, 7)); c.rig.say('content', 'blep', 1.2); }
    } else if (c.t > c.dur && c.state === 'knead') this.setCatState('sleep', rnd(14, 30));
    else if (c.t > c.dur && c.state === 'sleep') this.setCatState('stretch', 3.2); // waking up: a long stretch first
    else if (c.t > c.dur) {
      // spilt milk or a full bowl first; curious about you now and then; otherwise off to a favourite spot
      const P = this.game.pour, q = P?.nearestPuddle(c.pos, 5);
      if (q) { c.puddle = q; const d = _a.set(q.x - c.pos.x, 0, q.z - c.pos.z); const L = d.length() || 1; c.target = new THREE.Vector3(q.x - d.x / L * 0.17, 0, q.z - d.z / L * 0.17); this.setCatState('puddle', 14); }
      else if (this.tryHunt()) { /* stalking a pigeon */ }
      else if (P && P.bowlLevel > 0.12 && Math.random() < 0.3 && this.game.story?.bowl) this.catComeTo(this.game.story.bowl.getWorldPosition(_b).setY(0));
      else if (toPlayer < 6 && Math.random() < 0.45) this.setCatState('approach', 10);
      else { this.setCatState('walk', 12); c.target = this.pickCatTarget(); }
    } else if (c.state === 'sleep' && toPlayer < 1.2 && c.t > 2) {
      this.setCatState('sit', 6); // you woke it up
    }
    if (c.state === 'drink' && !c.wild && c.t > c.dur) this.setCatState('sit', 6);
    // sitting cats watch you (head and eyes follow the camera)
    const watching = (c.state === 'sit' || c.state === 'hide' || c.state === 'groove' || c.state === 'knead' || (c.state === 'approach' && speed === 0)) && toPlayer < 4;
    c.rig.lookAt = watching ? this.game.camera.position : c.state === 'stalk' && c.prey ? c.prey.g.position : null;
    if ((c.state === 'sit' || c.state === 'hide' || c.state === 'groove') && toPlayer < 4) {
      const want = Math.atan2(pl.x - c.pos.x, pl.z - c.pos.z) - c.g.rotation.y;
      c.rig.lookYaw += ((((want + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * 0.8 - c.rig.lookYaw) * Math.min(1, dt * 3);
      c.rig.lookYaw = Math.max(-0.9, Math.min(0.9, c.rig.lookYaw));
    } else c.rig.lookYaw *= 1 - Math.min(1, dt * 3);
    c.rig.update(dt, speed);
    // in the cardboard bed she lies on the towel, not inside it (a little hop in / out)
    c.y = (c.y || 0) + (this.catFloor(c.pos) - (c.y || 0)) * Math.min(1, dt * 8);
    c.g.position.set(c.pos.x, c.y + (c.jumpY || 0), c.pos.z);
    c.g.rotation.y += ((c.heading - c.g.rotation.y + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 6);
  }

  // ---- the hunt: crouch, creep up on a pigeon, wiggle, pounce (the flock bursts away; she never catches one)
  tryHunt() {
    const c = this.cat, pl = this.game.player.pos;
    if (c.wild || c.held || this.petting || Math.random() > 0.4) return false;
    let best = null, bd = 7;
    for (const p of this.pigeons) {
      if (p.state !== 'walk') continue;
      const d = Math.hypot(p.pos.x - c.pos.x, p.pos.z - c.pos.z);
      if (d < bd && d > 1.2 && Math.hypot(p.pos.x - pl.x, p.pos.z - pl.z) > 2.6) { bd = d; best = p; }
    }
    if (!best) return false;
    c.prey = best;
    this.setCatState('stalk', 22);
    return true;
  }

  stalk(dt) {
    const c = this.cat, p = c.prey;
    if (!p || p.state !== 'walk' || c.t > 20) { this.setCatState('sit', rnd(3, 5)); c.rig.say('wide', null, 1.2); return 0; }
    const d = _a.set(p.pos.x - c.pos.x, 0, p.pos.z - c.pos.z), len = d.length();
    c.heading = Math.atan2(d.x, d.z);
    c.rig.lookAt = _b.copy(p.pos).setY(0.12);
    if (len > 1.05) {
      // creeping: a few steps, freeze, a few more
      const go = Math.sin(c.t * 2.2) > -0.3 ? 1 : 0;
      c.pos.addScaledVector(d.normalize(), Math.min(len, dt * 0.24 * go));
      c.rig.wiggle = 0;
      return 0.24 * go;
    }
    c.wig = (c.wig || 0) + dt;
    c.rig.wiggle = Math.min(1, c.wig * 2);
    if (c.wig > 1.25) this.pounce();
    return 0;
  }

  pounce() {
    const c = this.cat, p = c.prey;
    const dir = _a.set(p.pos.x - c.pos.x, 0, p.pos.z - c.pos.z).normalize();
    c.jump = { t: 0, from: c.pos.clone(), to: p.pos.clone().setY(0).addScaledVector(dir, 0.25) };
    this.setCatState('pounce', 2);
    c.rig.say('wide', 'open', 0.5);
    this.flyOff(p, c.pos);
    audio.play('meow', { pos: c.pos.clone().setY(0.3), vol: 0.5, pitch: 1.3 });
    this.game.events.emit('catPounce', { at: c.pos.clone() });
  }

  pounceStep(dt) {
    const c = this.cat, J = c.jump;
    if (!J) { this.setCatState('sit', 3); return 0; }
    J.t += dt;
    const k = Math.min(1, J.t / 0.42);
    c.pos.lerpVectors(J.from, J.to, k);
    c.jumpY = Math.sin(k * Math.PI) * 0.24;
    if (k >= 1) {
      c.jumpY = 0; c.jump = null; c.prey = null;
      // missed, of course: sits and watches them go, pretending it was the plan
      this.setCatState('sit', rnd(4, 7));
      c.rig.say('wide', null, 1.4);
      c.rig.lookAt = null;
      return 0;
    }
    return 2.4;
  }

  update(dt, t) {
    this.updatePigeons(dt, t);
    this.updateCat(dt);
  }
}

export { hasProp };
