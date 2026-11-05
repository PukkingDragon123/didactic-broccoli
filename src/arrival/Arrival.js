// The new game's opening (Story.newGame; src/plugins/arrival.js installs it as game.arrival). There is no drive: you
// have just pulled up in Grandpa's old van across the lane from his shut-up garage, and the opening is shot like a
// film's: letterboxed, to Senbazuru, about 57 seconds, hold to skip. The world first (the steel pylon, a train, the
// lane and its people), then the van, then you in it:
//   1 pylon    fade up on the steel tower and the wires against the late sun; a slow crane down to the railway bridge
//              (crows; a crossing bell far off; the train's rumble arrives before the cut)
//   2 train    low under the bridge: the rumble builds, then the train thunders across overhead
//   3 lane     the lane, wide and long: the pigeons on the road burst up at the noise; the title card drops in
//   4 mikawa   Mikawa-san in his doorway lights a cigar (the flame lights his face), puffs, squints down the lane
//   5 mikan    close and low: Mikan asleep in the sun by Grandpa's stool
//   6 grandpa  Grandpa nodding off on his stool, the fan going slack, his chin sinking
//   7 van      cut on the engine's rumble: the van just pulled up, idling, its dust settling round the wheels
//   8 key      in the cab: your hand turns the key back, the engine dies (the van shudders), the key comes out
//   9 charm    Grandpa's omamori on the mirror swinging to a stop; the hot engine ticks
//  10 mirror   the door mirror: in it, Grandpa jolts awake, gets up and shuffles over to the van
// It ends on the first frame of Grandpa's window tap (src/grandpa/scenes.js tapScene: the driver's eye looking out at
// the lane, fov 56, the cab glass on), which Grandpa's meeting plays straight after in the same cutscene.
//   game.arrival.scene(c)   the script (a generator for src/game/Cutscene.js)
//   game.arrival.play()     the opening on its own, as its own cutscene (Story's fallback without Grandpa) -> Promise
//   game.arrival.active / .shot / .t   while it plays: the shot ({ id, at, dur, what }) and seconds into the opening
//   game.arrival.seated     from the opening until you're out of the van: the cab look (glass, shade, your arms)
//                           follows the camera in and out of the cab
//   SHOTS                   the shot list ({ id, at, dur, what })
// Events: 'arrival:start' (Grandpa nods off on his stool, Mikan asleep at his feet), 'arrival:wake' (the engine has
// died: he wakes and comes over), 'arrival:end' (the last frame: the window tap takes over).
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { bgm } from '../core/bgm.js';
import { PARK } from '../life/van.js';
import { STOOL } from '../grandpa/index.js';
import { CabArms } from './arms.js';
import { DoorMirror } from './mirror.js';
import { TitleCard } from './title.js';
import './poses.js';
import './sfx.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const smooth = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
const smoother = (t) => { t = clamp01(t); return t * t * t * (t * (t * 6 - 15) + 10); };
const _v = new THREE.Vector3(), _w = new THREE.Vector3();

const LIST = [
  { id: 'pylon', dur: 9.0, what: 'Fade up on the steel pylon and the wires; a slow crane down to the railway bridge' },
  { id: 'train', dur: 6.0, what: 'Low under the bridge: the rumble builds, then the train thunders across overhead' },
  { id: 'lane', dur: 9.5, what: 'The lane, wide: the pigeons burst up off the road; the title card drops in' },
  { id: 'mikawa', dur: 6.5, what: 'Mikawa-san in his doorway lights a cigar, puffs, squints down the lane' },
  { id: 'mikan', dur: 3.5, what: 'Mikan asleep in the sun by the stool' },
  { id: 'grandpa', dur: 5.0, what: 'Grandpa nodding off on his stool, the fan going slack' },
  { id: 'van', dur: 5.5, what: 'Cut on the engine: the van just pulled up, idling, its dust settling' },
  { id: 'key', dur: 4.0, what: 'In the cab: your hand turns the key, the engine dies, the key comes out' },
  { id: 'charm', dur: 3.0, what: "Grandpa's omamori swinging to a stop; the hot engine ticks" },
  { id: 'mirror', dur: 5.0, what: 'The door mirror: Grandpa jolts awake, gets up, shuffles over' },
];
let at = 0;
export const SHOTS = LIST.map((s) => { const o = { ...s, at }; at += s.dur; return o; });
export const LENGTH = at;

/** Where the player's feet wait during the opening: west of the pigeons' patch of road, near enough for Mikawa-ya to live. */
const OFFSTAGE = { x: -20, z: 10 };
/** Your left hand resting on your knee while you sit parked (van body space). */
const LAP_L = V(-0.2, 0.86, 1.12);
/** Where the tap scene's first shot looks from the driver's seat (src/grandpa/scenes.js tapScene). */
export const HANDOFF = { look: V(1.7, 1.0, 8.6), fov: 56 };

/**
 * Where to look from `pos` (fov, aspect) so that `target` lands at normalised screen point (nx, ny): a few corrective
 * steps of the look point in the view plane (for a match cut: one thing taking the place of another on screen).
 */
const _cam = new THREE.PerspectiveCamera();
function aimFor(pos, target, nx, ny, fov, aspect) {
  _cam.fov = fov; _cam.aspect = aspect; _cam.updateProjectionMatrix();
  _cam.position.copy(pos);
  const look = target.clone(), p = new THREE.Vector3(), r = new THREE.Vector3(), u = new THREE.Vector3();
  const dist = pos.distanceTo(target), tv = Math.tan(THREE.MathUtils.degToRad(fov) / 2), th = tv * aspect;
  for (let i = 0; i < 8; i++) {
    _cam.lookAt(look); _cam.updateMatrixWorld();
    p.copy(target).project(_cam);
    r.setFromMatrixColumn(_cam.matrixWorld, 0); u.setFromMatrixColumn(_cam.matrixWorld, 1);
    look.addScaledVector(r, (p.x - nx) * th * dist).addScaledVector(u, (p.y - ny) * tv * dist);
  }
  return look;
}

/** A camera move: pos / look / fov eased from a to b over the shot (b = a: locked off). */
function move(c, a, b, k) {
  c.pos.lerpVectors(a.pos, b.pos, k);
  c.look.lerpVectors(a.look, b.look, k);
  c.fov = a.fov + (b.fov - a.fov) * k;
}

export class Arrival {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.seated = false;
    this.shot = null;
    this.t = 0;
    this.runs = 0;
  }

  get van() { return this.game.life?.van || null; }

  /** The opening as its own cutscene (no Grandpa to hand over to). */
  play() {
    const g = this.game;
    const hid = !g.grandpa?.hidden;
    if (hid) g.grandpa?.hideCrowd?.(true, 80);
    return g.cutscene.play((c) => this.scene(c), { skippable: true }).then(() => { if (hid) g.grandpa?.hideCrowd?.(false); });
  }

  // ------------------------------------------------------------------ the script
  *scene(c) {
    this.begin(c);
    for (const S of SHOTS) {
      this.shot = S;
      yield* this.run(c, S, this['shot' + S.id[0].toUpperCase() + S.id.slice(1)](c));
    }
    this.handoff(c);
  }

  /** Run one shot: its cues (seconds into the shot) fire in order, tick(t, dt) every frame; skipping fires the rest. */
  *run(c, S, { tick = null, cues = [] }) {
    let t = 0, i = 0;
    cues.sort((a, b) => a[0] - b[0]);
    const fire = () => { while (i < cues.length && cues[i][0] <= t) cues[i++][1](); };
    fire();
    tick?.(0, 0);
    yield c.until((dt) => {
      const step = Math.min(S.dur - t, dt);
      t += step;
      this.t = S.at + t;
      fire();
      tick?.(t, step);
      this.idle(step);
      return t >= S.dur;
    });
  }

  /** A sound, unless the opening is being skipped (no burst of everything at once). */
  sfx(name, opts = {}) { if (!this.c?.skipping) audio.play(name, opts); }

  begin(c) {
    const g = this.game, van = this.van, P = g.player;
    this.c = c;
    this.runs++;
    this.active = true;
    this.seated = true;
    this.t = 0;
    c.setFade(1);
    c.hand = 0;
    c.camOn = true;
    // you're in the van (the window tap puts your feet down by its door); meanwhile "you" stand off the road, where the
    // pigeons won't take fright at you before their shot
    P.pos.set(OFFSTAGE.x, 0, OFFSTAGE.z);
    P.vel?.set(0, 0, 0);
    if (van) {
      // the van: just pulled up, the engine idling, the brake lights on, the key turned in the ignition
      van.setPose(PARK.x, PARK.z, PARK.heading);
      van.setDoor(0); van.setLights(false); van.setBrake(true); van.suspend(0, 0); van.gauge(0);
      van.lamps({ hand: false, beam: false, radio: false });
      van.keyAt(0.9, 0);
      if (van.cab?.key) van.cab.key.visible = true;
      this.engineOn = true;
      // (a low idle across the lane until the cut to the van brings it up)
      try { this.engine = audio.loop('vanEngine', { pos: van.local(0, 0.6, 1.2), ref: 2.2, rolloff: 1.3 }); this.engine?.set(0.12, 0.4); } catch { this.engine = null; }
      let skin = null;
      try { const fp = g.fp; if (fp?.human && fp.handColor) skin = fp.handColor(fp.human); } catch { /* no body yet */ }
      this.arms?.dispose();
      this.arms = new CabArms(van, g.state.avatar || {}, skin);
      this.arms.visible = false;
      this.arms.reach('left', LAP_L, 0.01); // parked: the left hand off the wheel, on your knee
      this.charm = null;
    }
    // no stray trains in the shots (the east one runs on cue)
    for (const tr of g.garage.town?.trains || []) if (!tr.g.visible) tr.wait = Math.max(tr.wait, LENGTH + 30);
    this.title?.dispose();
    this.title = new TitleCard(c.el);
    const u = g.renderer.grade?.uniforms;
    if (u && !this.gradeBase) this.gradeBase = { sat: u.uSaturation.value, con: u.uContrast.value, vig: u.uVignette.value };
    g.events.emit('arrival:start', {});
    bgm.play('intro', { loop: false, fade: 3 });
  }

  /** Per frame while the opening plays: the idling engine shakes the van; the charm swings to a stop. */
  idle(dt) {
    const van = this.van;
    if (!van) return;
    if (this.engineOn) van.lean(0, (Math.random() - 0.5) * 0.0016, (Math.random() - 0.5) * 0.0024);
    else if (this.settle) {
      const S = this.settle;
      S.t += dt;
      van.lean(Math.sin(S.t * 9) * Math.exp(-S.t * 3.2) * 0.018, Math.sin(S.t * 7 + 1) * Math.exp(-S.t * 3.5) * 0.01, 0);
      if (S.t > 2) { this.settle = null; van.lean(0, 0, 0); }
    }
    const C = this.charm;
    if (C && van.cab) {
      // a damped pendulum (period ~0.7 s), still by the time the mirror shot starts
      C.t += dt;
      const amp = 0.5 * Math.exp(-C.t * 0.45) * (1 - smooth((C.t - 4.4) / 1.5)), w = 9.2;
      van.cab.charm.rotation.set(amp * Math.cos(C.t * w), 0, amp * 0.22 * Math.sin(C.t * w * 0.97 + 0.6));
      if (C.t > 5.9) { van.cab.charm.rotation.set(0, 0, 0); this.charm = null; }
    }
  }

  // ------------------------------------------------------------------ 1. the pylon, the wires: a crane down
  shotPylon(c) {
    const g = this.game, town = g.garage.town;
    const A = { pos: V(7.8, 6.7, 12.0), look: V(24.4, 14.8, 4.3), fov: 52 };
    const B = { pos: V(13.0, 1.8, 9.4), look: V(30, 3.4, 9.8), fov: 46 };
    return {
      tick: (t) => {
        c.setFade(1 - smooth((t - 0.4) / 3.2));
        move(c, A, B, smoother(t / 8.6));
      },
      cues: [
        [1.4, () => this.sfx('crow', { pos: V(30, 14, -6), vol: 0.9 })],
        [4.6, () => this.sfx('crow', { pos: V(-6, 12, 20), vol: 0.6 })],
        [5.2, () => this.sfx('crossing', { pos: V(34, 2, -36), vol: 1.2, ref: 6 })],
        // the train: its rumble starts a beat before the cut
        [7.8, () => {
          const tr = town?.trains?.find((x) => x.s > 0);
          if (!tr || !town.runTrain) return;
          town.runTrain(1, -1);
          const len = new THREE.Box3().setFromObject(tr.g).getSize(_v).z || 41.8;
          tr.g.position.x = 30;
          tr.z = 54.4 + len / 2; // its head just inside the distance where its sound starts (Town.update)
          tr.g.position.z = tr.z;
          tr.played = false;
        }],
      ],
    };
  }

  // ------------------------------------------------------------------ 2. under the bridge: the train overhead
  shotTrain(c) {
    const A = { pos: V(19.0, 1.5, 7.3), look: V(31, 6.7, 11.0), fov: 35 };
    const B = { pos: V(19.6, 1.45, 7.2), look: V(31, 6.8, 10.9), fov: 34 };
    return { tick: (t) => move(c, A, B, smooth(t / 6)) };
  }

  // ------------------------------------------------------------------ 3. the lane, wide: pigeons, the title
  shotLane(c) {
    const g = this.game, st = g.street;
    const A = { pos: V(18.6, 2.0, 10.9), look: V(-4, 1.0, 9.8), fov: 36 };
    const B = { pos: V(16.8, 1.8, 10.65), look: V(-4, 0.95, 9.6), fov: 36 };
    // the flock, pecking on the road a little way off (any that flew off earlier come straight back down)
    const flock = st?.pigeons || [];
    const spots = [[9.6, 9.9], [10.4, 10.9], [8.8, 11.5], [10.9, 9.5], [9.2, 12.1], [10.1, 11.8], [8.4, 10.3]];
    flock.forEach((p, i) => {
      const s = spots[i % spots.length];
      p.pos.set(s[0], 0, s[1]); p.heading = 1.2 + i * 0.9; p.peck = i % 2 ? 0.8 : 0;
      if (p.state !== 'walk') { p.state = 'land'; p.target = p.pos.clone(); p.g.visible = true; } // (lands this frame)
    });
    return {
      tick: (t) => move(c, A, B, smooth(t / 9.5)),
      cues: [
        [1.0, () => { const from = V(5.5, 0, 10.6); for (const p of flock) st.flyOff(p, from); }],
        [1.9, () => { this.title?.show(); this.sfx('paper', { vol: 0.8 }); }],
        [7.6, () => this.title?.hide()],
      ],
    };
  }

  // ------------------------------------------------------------------ 4. Mikawa-san lights a cigar in his doorway
  shotMikawa(c) {
    const g = this.game, mk = g.places?.mikawaya, om = mk?.oldman;
    const A = { pos: V(-10.72, 1.42, 12.95), look: V(-12.36, 1.68, 15.0), fov: 32 };
    const B = { pos: V(-11.02, 1.47, 13.42), look: V(-12.38, 1.72, 15.05), fov: 32 };
    if (om) { om.h.root.position.set(-12.42, 0, 15.12); om.h.root.rotation.y = Math.PI - 0.32; om.h.hasPrev = false; mk.keeper.look = null; }
    const tip = () => (om ? om.cigarTip(_w) : _w.set(-12.4, 1.75, 15.0));
    const smoke = (n, life) => g.effects.puff({ pos: tip(), count: n, colors: [0xdcdcd4, 0xc4c4bc, 0xe8e8e0], size: 0.04, speed: 0.07, up: 0.16, gravity: -0.08, drag: 1.4, life, radius: 0.012 });
    let flame = null;
    return {
      tick: (t) => {
        move(c, A, B, smooth(t / 6.5));
        if (flame) {
          const on = t > 1.12 && t < 2.35;
          flame.position.copy(tip()).add(_v.set(0.01, -0.035, -0.02));
          flame.intensity = on ? 0.6 + Math.sin(t * 37) * 0.1 + Math.sin(t * 23) * 0.08 : 0;
          if (t > 2.4) { flame.removeFromParent(); this.flame = flame = null; }
        }
      },
      cues: [
        [0.35, () => om?.h.gesture('arr_light')],
        [1.05, () => {
          this.sfx('lighter', { pos: tip(), vol: 1.2 });
          g.effects.sparks({ pos: tip(), count: 6, colors: [0xffd070, 0xff9a3a], speed: 0.4, size: 0.012, star: 0.7, life: 0.35, gravity: 2 });
          flame = this.flame = new THREE.PointLight(0xffa04a, 0, 1.3, 2);
          g.scene.add(flame);
        }],
        [1.2, () => g.effects.emit({ sprite: 'spark', pos: tip().add(_v.set(0, -0.02, -0.01)), color: 0xffb040, life: 1.1, size: 0.028, anim: 'loop', fps: 9, fade: 0.25 })],
        [2.5, () => { smoke(4, 3.4); this.sfx('cigar', { pos: tip(), vol: 0.7 }); }],
        [3.5, () => { if (mk) mk.keeper.look = V(2.4, 1.3, 12.2); }],
        [4.9, () => smoke(3, 3.0)],
      ],
    };
  }

  // ------------------------------------------------------------------ 5. Mikan asleep in the sun
  shotMikan(c) {
    const cat = this.game.street?.cat;
    const at = cat ? cat.pos : V(STOOL.x + 0.5, 0, STOOL.z + 0.42);
    const A = { pos: V(at.x - 0.32, 0.3, at.z + 1.72), look: V(at.x + 0.02, 0.14, at.z), fov: 23 };
    const B = { pos: V(at.x - 0.2, 0.28, at.z + 1.5), look: V(at.x + 0.02, 0.13, at.z), fov: 23 };
    return {
      tick: (t) => move(c, A, B, smooth(t / 3.5)),
      cues: [[0.4, () => this.sfx('purr', { pos: V(at.x, 0.2, at.z), vol: 0.7 })]],
    };
  }

  // ------------------------------------------------------------------ 6. Grandpa nodding off
  shotGrandpa(c) {
    const g = this.game, gp = g.grandpa?.gp;
    const A = { pos: V(3.75, 0.86, 7.85), look: V(2.75, 0.98, 5.86), fov: 30 };
    const B = { pos: V(3.6, 0.84, 7.45), look: V(2.75, 0.99, 5.86), fov: 30 };
    const zz = () => { if (gp) g.effects.mark({ sprite: 'zz', pos: gp.headTop(_v).add(_w.set(0.06, 0.04, 0.02)), color: 0xdce8ff, size: 0.045, life: 2.2, rise: 0.16, dx: 0.06 }); };
    // where the round fan is on screen, frame by frame, as it's drawn (for the match cut into the next shot)
    const fan = gp?.fan;
    if (fan?.geometry) {
      const geo = fan.geometry, b = geo.boundingBox || (geo.computeBoundingBox(), geo.boundingBox);
      const disc = V((b.min.x + b.max.x) / 2, b.max.y - (b.max.x - b.min.x) / 2, (b.min.z + b.max.z) / 2); // (the paper; the handle hangs below)
      this.fanAt = null;
      fan.onAfterRender = () => { if (this.shot?.id === 'grandpa') this.fanAt = disc.clone().applyMatrix4(fan.matrixWorld).project(g.camera); };
    }
    return {
      tick: (t) => move(c, A, B, smooth(t / 5)),
      cues: [[0.5, zz], [1.2, () => this.sfx('snore', { pos: gp ? gp.pos.clone().setY(1.2) : V(2.75, 1.2, 5.8), vol: 0.9 })], [2.4, zz], [4.2, zz]],
    };
  }

  // ------------------------------------------------------------------ 7. the van, just pulled up, idling
  shotVan(c) {
    const g = this.game, van = this.van, gp = g.grandpa?.gp;
    const A = { pos: V(1.35, 0.3, 10.2), look: V(3.6, 0.65, 12.0), fov: 38 };
    const B = { pos: V(0.15, 0.42, 10.95), look: V(2.6, 0.85, 12.3), fov: 40 };
    // a match cut: the front wheel's hub opens the shot exactly where Grandpa's round fan was in the last frame drawn
    if (gp?.fan) delete gp.fan.onAfterRender;
    const fan = this.fanAt;
    this.fanAt = null;
    if (van && fan) {
      const hub = van.local(-0.72, 0.265, 1.08);
      A.pos = hub.clone().add(V(-0.62, 0.16, -1.5));
      A.look = aimFor(A.pos, hub, THREE.MathUtils.clamp(fan.x, -0.6, 0.6), THREE.MathUtils.clamp(fan.y, -0.5, 0.5), A.fov, g.camera.aspect);
    }
    const dust = (x, z, n) => g.effects.puff({ pos: van.local(x, 0.12, z), count: n, colors: [0xb8a890, 0x9a8a78, 0xd0c4b0], size: 0.11, speed: 0.22, up: 0.06, gravity: 0.03, drag: 1.0, life: 5.0, radius: 0.5 });
    let exhaust = 0;
    return {
      tick: (t, dt) => {
        move(c, A, B, smooth(t / 5.5));
        if (van && this.engineOn && (exhaust -= dt) <= 0) {
          exhaust = 0.55;
          g.effects.puff({ pos: van.local(0.42, 0.22, -1.8), count: 2, colors: [0x8e8e96, 0xa6a6ae], size: 0.05, speed: 0.12, up: 0.1, gravity: -0.04, drag: 1.5, life: 1.8, radius: 0.02 });
        }
      },
      cues: van ? [
        [0, () => { this.engine?.set(0.42, 0.02); dust(-0.75, 1.1, 7); dust(-0.8, -1.1, 6); dust(0.7, 1.1, 4); dust(-0.9, 0.0, 4); }], // (the cut lands on the engine's rumble)
        [3.4, () => { van.setBrake(false); van.lamps({ hand: true }); }], // the handbrake on, the foot off the pedal
      ] : [],
    };
  }

  // ------------------------------------------------------------------ 8. the key: the engine dies, the key comes out
  shotKey(c) {
    const van = this.van, arms = this.arms;
    if (!van?.cab) return { cues: [] };
    const cab = van.cab, B0 = (x, y, z) => van.local(x, y, z, new THREE.Vector3());
    const A = { pos: B0(-0.33, 1.43, 0.99), look: B0(-0.39, 1.04, 1.37), fov: 46 };
    const B = { pos: B0(-0.345, 1.415, 1.02), look: B0(-0.4, 1.03, 1.37), fov: 44 };
    const head = () => cab.key.position.clone().add(_v.set(-0.048, 0, 0)); // the fist round the key's head (body space)
    const ELBOW = V(-0.25, 0.15, -1); // reaching under the wheel: the elbow back and a little out
    let turn = null, out = null, carry = false;
    return {
      tick: (t, dt) => {
        c.hand = 0.0012;
        move(c, A, B, smooth(t / 4));
        if (turn) { turn.t += dt; van.keyAt(0.9 * (1 - smooth(turn.t / 0.22)), 0); if (turn.t > 0.22) turn = null; }
        if (out) { out.t += dt; van.keyAt(0, 0.042 * smooth(out.t / 0.3)); if (out.t > 0.3) out = null; }
        if (carry && arms) { van.keyAt(0, 0); cab.key.position.copy(arms.fist('right', _v)).add(_w.set(0.015, -0.004, 0)); }
      },
      cues: [
        [0.25, () => arms?.reach('right', head(), 0.6, ELBOW)],
        [1.0, () => { turn = { t: 0 }; this.sfx('arrIgnition', { vol: 1 }); }],
        [1.12, () => this.engineOff()],
        [1.75, () => { out = { t: 0 }; this.sfx('arrKeys', { vol: 0.9 }); }],
        [2.1, () => {
          // the hand comes away with the keys, down into your lap
          this.keyHome ||= cab.key.position.clone();
          carry = true;
          arms?.reach('right', V(-0.46, 0.84, 1.13), 0.8, ELBOW);
        }],
        [3.3, () => { carry = false; cab.key.visible = false; arms?.reach('right', null, 0.6); }],
      ],
    };
  }

  /** The key's turned back: the engine coughs and dies, the van settles on its springs, the dash goes dark. */
  engineOff() {
    const van = this.van;
    if (!this.engineOn) return;
    this.engineOn = false;
    this.engine?.stopAll(); this.engine = null;
    if (van) {
      this.sfx('engineOff', { pos: van.local(0, 0.6, 1.2), vol: 1 });
      this.sfx('arrSettle', { pos: van.local(0, 0.5, 0), vol: 0.9 });
      van.lamps({});
      this.settle = { t: 0 };
      this.charm = { t: 0 }; // the shudder sets the omamori swinging
    }
    bgm.duck(true, 0.45, 'arrival');
  }

  // ------------------------------------------------------------------ 9. the omamori swinging to a stop
  shotCharm(c) {
    const van = this.van;
    if (!van) return { cues: [] };
    const A = { pos: van.local(0.075, 1.5, 1.13), look: van.local(0.0, 1.6, 1.414), fov: 27 };
    const B = { pos: van.local(0.068, 1.505, 1.16), look: van.local(0.0, 1.605, 1.414), fov: 27 };
    const tick = () => this.sfx('engineTick', { pos: van.local(0, 0.6, 1.3), vol: 2.4 });
    return {
      tick: (t) => { c.hand = 0.001; move(c, A, B, smooth(t / 3)); },
      cues: [[0.45, tick], [1.5, tick], [2.7, tick]],
    };
  }

  // ------------------------------------------------------------------ 10. the door mirror: Grandpa wakes, comes over
  shotMirror(c) {
    const g = this.game, van = this.van;
    if (!van) return { cues: [[0.6, () => g.events.emit('arrival:wake', {})]] };
    const A = { pos: van.local(-0.48, 1.35, 1.05), look: van.local(-0.85, 1.205, 1.45), fov: 21 };
    const B = { pos: van.local(-0.5, 1.345, 1.08), look: van.local(-0.852, 1.2, 1.45), fov: 20 };
    try { this.mirrorFx = new DoorMirror(van, () => g.frame); this.mirrorFx.aim(V(2.6, 0.95, 6.4), 24); } catch (e) { console.warn('arrival mirror', e); this.mirrorFx = null; }
    const tick = () => this.sfx('engineTick', { pos: van.local(0, 0.6, 1.3), vol: 2.2 });
    return {
      tick: (t) => { c.hand = 0.0025; move(c, A, B, smooth(t / 5)); },
      cues: [
        [0.6, () => { g.events.emit('arrival:wake', {}); bgm.duck(false, 1, 'arrival'); }],
        [1.4, tick], [3.3, tick],
      ],
    };
  }

  // ------------------------------------------------------------------ the hand-off
  /** The last frame: the driver's eye looking out at the lane, exactly where Grandpa's window tap starts. */
  handoff(c) {
    const g = this.game, van = this.van;
    this.tidy();
    if (van) { van.eye(c.pos); van.cabGlass(true); }
    else c.pos.set(2.4, 1.42, 12.16);
    c.look.copy(HANDOFF.look);
    c.fov = HANDOFF.fov;
    c.hand = 0.006;
    c.camOn = true;
    c.applyCamera();
    this.shot = null;
    this.active = false;
    g.events.emit('arrival:end', {});
  }

  /**
   * A touch of golden-hour film over the opening (the grade pass, src/core/renderer.js): warmer highlights, a little
   * more colour and contrast, a deeper vignette; in over the fade-up, out over the last shot (gone by the hand-off).
   * Per frame after the lighting (which owns uWarm), so it never fights it.
   */
  grade() {
    const g = this.game, u = g.renderer.grade?.uniforms, B = this.gradeBase;
    if (!u || !B) return;
    const k = this.active ? smooth(this.t / 3) * (1 - smooth((this.t - (LENGTH - 4.5)) / 4)) : 0;
    u.uWarm.value = (g.lighting?.look?.warm ?? 0.004) + 0.03 * k;
    u.uSaturation.value = B.sat + 0.05 * k;
    u.uContrast.value = B.con + 0.04 * k;
    u.uVignette.value = B.vig + 0.08 * k;
  }

  /** Put back everything the opening moved or added (idempotent): it runs at the hand-off, or when cut short. */
  tidy() {
    const g = this.game, van = this.van, mk = g.places?.mikawaya;
    this.engine?.stopAll(); this.engine = null;
    this.engineOn = false;
    this.settle = null;
    if (van) {
      van.lean(0, 0, 0); van.setBrake(false); van.lamps({});
      if (this.charm) { van.cab?.charm.rotation.set(0, 0, 0); this.charm = null; }
      if (van.cab?.key) { van.keyAt(0, 0); if (this.keyHome) van.cab.key.position.copy(this.keyHome); van.cab.key.visible = false; } // (in your pocket)
      this.arms?.reach('right', null, 0.01);
    }
    if (mk?.oldman && mk.home) { mk.oldman.h.root.position.copy(mk.home.pos); mk.oldman.h.root.rotation.y = mk.home.rotY; mk.oldman.h.hasPrev = false; mk.keeper.look = null; }
    this.flame?.removeFromParent(); this.flame = null;
    if (g.grandpa?.gp?.fan) delete g.grandpa.gp.fan.onAfterRender;
    this.mirrorFx?.dispose(); this.mirrorFx = null;
    this.title?.dispose(); this.title = null;
    bgm.duck(false, 1, 'arrival');
    const u = g.renderer.grade?.uniforms, B = this.gradeBase;
    if (u && B) { u.uSaturation.value = B.sat; u.uContrast.value = B.con; u.uVignette.value = B.vig; u.uWarm.value = g.lighting?.look?.warm ?? u.uWarm.value; this.gradeBase = null; }
  }

  /** The cutscene ended before the hand-off (another took over): tidy up, let the cab look go. */
  abort() {
    this.tidy();
    this.active = false;
    this.shot = null;
    this.release();
  }

  // ------------------------------------------------------------------ the cab look, until you're out of the van
  /** Per frame (src/plugins/arrival.js). */
  update(dt) {
    const g = this.game, van = this.van;
    if (this.active && !g.cutscene.active) this.abort();
    if (this.active) this.grade();
    if (!this.seated) return;
    if (!van || !g.cutscene.active) { this.release(); return; }
    // near-clear glass, the roof's shade and your arms only while the camera is in the cab
    const p = van.root.worldToLocal(_v.copy(g.camera.position));
    const inside = Math.abs(p.x) < 0.74 && p.y > 0.3 && p.y < 1.9 && p.z > 0.3 && p.z < 1.66;
    if (inside !== !!van.inCab) van.cabGlass(inside);
    if (this.arms) { this.arms.visible = inside; this.arms.update(dt); }
    if (!inside && van.door > 0.5) this.release(); // out of the van
  }

  release() {
    this.seated = false;
    this.arms?.dispose(); this.arms = null;
    if (this.van?.inCab) this.van.cabGlass(false);
  }
}
