// The new game's opening (Story.newGame; src/plugins/arrival.js installs it as game.arrival): Grandpa's old van drives
// into the lane, and that is all of it. A little film, never interactive (you don't drive): letterboxed, to
// Senbazuru, about 18 seconds, hold to skip. Three shots:
//   1 underpass  low in the lane, looking back at the east underpass: black, an engine echoing in it; the van comes out
//                of the dark into the late sun and rolls up past the lens
//   2 lane       a low tracking shot alongside as it rolls down the lane past the houses: wheels turning, the body
//                swaying on its springs, a little dust, you at the wheel; the title card drops in over it
//   3 pullup     from behind: it eases over to the kerb across from the garage, brake lights on, the nose dips and
//                rocks back, the pigeons go up; the engine dies, the van settles (Grandpa, dozing out front, jolts awake)
// It ends on the first frame of Grandpa's window tap (src/grandpa/scenes.js tapScene: the driver's eye looking out at
// the lane, fov 56, the cab glass on), which his meeting plays straight after in the same cutscene: a plain cut.
// The drive is a pure function of the shot's time (where the van is, how it sits on its springs), so skipping or
// stepping it in big steps lands exactly where playing it does.
//   game.arrival.scene(c)   the script (a generator for src/game/Cutscene.js)
//   game.arrival.play()     the opening on its own, as its own cutscene (Story's fallback without Grandpa) -> Promise
//   game.arrival.active / .shot / .t   while it plays: the shot ({ id, at, dur, what }) and seconds into the opening
//   game.arrival.seated     from the opening until you're out of the van: you at the wheel (your character, seen from
//                           outside; the cab glass, the shade and your arms once the camera is in the cab)
//   SHOTS                   the shot list ({ id, at, dur, what })
// Events: 'arrival:start' (Grandpa nods off on his stool), 'arrival:wake' (the engine has died: he wakes and comes
// over), 'arrival:end' (the last frame: the window tap takes over).
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { bgm } from '../core/bgm.js';
import { PARK } from '../life/van.js';
import { CabArms } from './arms.js';
import { Driver } from './driver.js';
import { TitleCard } from './title.js';
import './sfx.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const smooth = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
const smoother = (t) => { t = clamp01(t); return t * t * t * (t * (t * 6 - 15) + 10); };
const _v = new THREE.Vector3(), _w = new THREE.Vector3();

const LIST = [
  { id: 'underpass', dur: 5.4, what: 'Looking back at the east underpass: the van comes out of the dark into the sun, past the lens' },
  { id: 'lane', dur: 4.8, what: 'Low, tracking alongside as it rolls down the lane; the title card drops in' },
  { id: 'pullup', dur: 7.4, what: 'From behind: it pulls up across from the garage, brake lights on; the engine dies' },
];
let at = 0;
export const SHOTS = LIST.map((s) => { const o = { ...s, at }; at += s.dur; return o; });
export const LENGTH = at;

/** Where the player's feet wait during the opening: off the road at the lane's far end, out of every shot. */
const OFFSTAGE = { x: -20, z: 10 };
/** Your left hand resting on your knee once you're parked (van body space). */
const LAP_L = V(-0.2, 0.86, 1.12);
/** Where the tap scene's first shot looks from the driver's seat (src/grandpa/scenes.js tapScene). */
export const HANDOFF = { look: V(1.7, 1.0, 8.6), fov: 56 };

// ------------------------------------------------------------------ the way in (the van's centre, driving west = -x)
const LANE_Z = 10.45; // through the underpass and down the lane: the left of the carriageway
const OVER = { from: 12.4, to: 5.2 }; // where it eases over to the kerb across from the garage
const WHEELBASE = 2.16, AXLE = 1.08, NOSE = 1.67;
const SEAM = 26; // the underpass mouth: the road's seam there thumps under each axle
const DARK = 35.4; // further in than this the underpass is pitch black (src/world/tunnelDark.js)
const laneZ = (x) => LANE_Z + (PARK.z - LANE_Z) * smoother((OVER.from - x) / (OVER.from - OVER.to));
const slope = (x) => (laneZ(x - 0.06) - laneZ(x + 0.06)) / 0.12; // metres to the left per metre driven
const heading = (x) => Math.atan2(-1, slope(x));

/** The body on its springs over the road at x: a slow sway, a patter, and the seam at the mouth under each axle. */
function roadFeel(x, out) {
  const s = 40 - x;
  out.pitch = 0.0028 * Math.sin(s * 2.9 + 2);
  out.roll = 0.0055 * Math.sin(s * 0.93) + 0.0035 * Math.sin(s * 2.3 + 1.3);
  out.bounce = 0.004 * Math.sin(s * 1.7) + 0.0025 * Math.sin(s * 3.9 + 0.7);
  for (const [off, nose] of [[-AXLE, -1], [AXLE, 1]]) { // the front axle kicks the nose up, the rear one tips it down
    const d = SEAM - (x + off);
    if (d > 0 && d < 5) { const k = Math.exp(-d * 1.3) * Math.sin(d * 5.2); out.pitch += nose * 0.02 * k; out.bounce += 0.014 * k; }
  }
  return out;
}

// the three shots' driving: x(t) of the van's centre and its speed (m/s)
const S1 = { x0: 42.0, v: 4.6 };
const S2 = { x0: 26.6, v: 3.45, a: -0.24 };
const S3 = { x0: 12.8, v: 2.9, brake: 1.891, stop: 4.591, off: 5.6 }; // cruise, brake from `brake`, stopped at `stop`, key off at `off`

export class Arrival {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.seated = false;
    this.shot = null;
    this.t = 0;
    this.runs = 0;
    this.feel = { pitch: 0, roll: 0, bounce: 0 };
    this.lastX = null;
    this.speed = 0;
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
      this.lastX = null;
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
    // however this cutscene ends (played out, skipped, cut short), your character and the cab are handed back before
    // the next thing (the chat with Grandpa) wants them
    c.atEnd?.(() => { if (this.active) this.abort(); else if (this.seated) this.release(); });
    // "you" are in the van (the window tap puts your feet down by its door); meanwhile the first-person player waits
    // off the road, where the pigeons won't take fright at it
    P.pos.set(OFFSTAGE.x, 0, OFFSTAGE.z);
    P.vel?.set(0, 0, 0);
    if (van) {
      van.setDoor(0); van.setLights(false); van.setBrake(false); van.lean(0, 0, 0); van.steer(0); van.gauge(0);
      van.lamps({ hand: false, beam: false, radio: false });
      van.keyAt(0.9, 0);
      if (van.cab?.key) van.cab.key.visible = true;
      this.engineOn = true;
      this.speed = S1.v;
      this.offAt = null;
      try { this.engine = audio.loop('vanEngine', {}); this.engine?.set(0, 0.01); } catch { this.engine = null; }
      let skin = null;
      try { const fp = g.fp; if (fp?.human && fp.handColor) skin = fp.handColor(fp.human); } catch { /* no body yet */ }
      this.arms?.dispose();
      this.arms = new CabArms(van, g.state.avatar || {}, skin);
      this.arms.visible = false;
      this.driver?.dispose();
      try { this.driver = new Driver(g, van); } catch (e) { console.warn('arrival driver', e); this.driver = null; }
      this.lastX = null;
      this.place(S1.x0, 0);
    }
    // the lane's pigeons, pecking on the road where the van is about to pull up
    const flock = g.street?.pigeons || [];
    const spots = [[6.7, 11.5], [7.4, 12.5], [5.9, 12.1], [8.0, 11.2], [6.3, 12.9], [8.5, 12.2], [5.5, 11.3]];
    flock.forEach((p, i) => {
      const s = spots[i % spots.length];
      p.pos.set(s[0], 0, s[1]); p.heading = 1.2 + i * 0.9; p.peck = 30; // (heads down until the van's upon them)
      if (p.state !== 'walk') { p.state = 'land'; p.target = p.pos.clone(); p.g.visible = true; } // (lands this frame)
    });
    this.title?.dispose();
    this.title = new TitleCard(c.el);
    const u = g.renderer.grade?.uniforms;
    if (u?.uVignette && !this.gradeBase) this.gradeBase = { vig: u.uVignette.value };
    g.events.emit('arrival:start', {});
    bgm.play('intro', { loop: false, fade: 1.6 });
  }

  // ------------------------------------------------------------------ the van on its way in
  /**
   * Put the van where its centre is at x on the way in, sitting on its springs as the road and its own braking
   * (accel, m/s²) have it; extra: { pitch, roll, bounce } on top (the stop's rebound, the engine's shudder).
   */
  place(x, accel = 0, extra = null) {
    const van = this.van;
    if (!van) return;
    const h = heading(x);
    van.setPose(x, laneZ(x), h);
    van.steer(Math.atan(WHEELBASE * (heading(x - 0.3) - heading(x + 0.3)) / 0.6));
    if (this.lastX !== null) van.roll(Math.abs(this.lastX - x) * Math.hypot(1, slope(x)));
    this.lastX = x;
    const F = roadFeel(x, this.feel), still = this.speed < 0.05 ? 0 : 1;
    let pitch = F.pitch * still - accel * 0.021, roll = F.roll * still + this.speed * this.speed * (heading(x - 0.3) - heading(x + 0.3)) / 0.6 * 0.006, bounce = F.bounce * still;
    if (extra) { pitch += extra.pitch || 0; roll += extra.roll || 0; bounce += extra.bounce || 0; }
    if (this.engineOn && !still) { roll += (Math.random() - 0.5) * 0.0016; bounce += (Math.random() - 0.5) * 0.0022; } // idling
    van.lean(pitch, roll, bounce);
    van.root.visible = x < DARK || this.shot?.id !== 'underpass'; // (it only exists once it is in the dark of the underpass)
  }

  /** Per frame while it drives: the engine's note and loudness from where the camera is, the dust, the exhaust. */
  road(c, dt) {
    const g = this.game, van = this.van;
    if (!van || dt <= 0 || c.skipping) return;
    const d = _v.copy(c.pos).distanceTo(van.root.position);
    if (this.engine) {
      this.engine.set(this.engineOn ? Math.min(0.5, 1.5 / (1 + d * 0.3)) * smooth(this.t / 0.8) : 0, 0.1);
      if (this.engine.osc) this.engine.osc.frequency.value = 36 + this.speed * 5.5;
    }
    if (!van.root.visible) return;
    if (this.engineOn && (this.exhaustT = (this.exhaustT || 0) - dt) <= 0) {
      this.exhaustT = 0.34;
      g.effects.puff({ pos: van.local(0.42, 0.2, -1.78), count: 1, colors: [0x8e8e96, 0xa6a6ae], size: 0.055, speed: 0.12, up: 0.12, gravity: -0.05, drag: 1.5, life: 1.5, radius: 0.02 });
    }
    if ((this.dustD = (this.dustD || 0) + this.speed * dt) > 0.7 && this.speed > 0.6) {
      this.dustD = 0;
      for (const sx of [-0.645, 0.645]) g.effects.puff({ pos: van.local(sx, 0.07, -AXLE - 0.24), count: 1, colors: [0xb8a890, 0x9a8a78, 0xd0c4b0], size: 0.085, speed: 0.16, up: 0.07, gravity: 0.02, drag: 1.2, life: 1.5, radius: 0.12 });
    }
  }

  // ------------------------------------------------------------------ 1. out of the dark underpass into the light
  shotUnderpass(c) {
    const van = this.van;
    const A = { pos: V(16.3, 0.52, 9.05), look: V(27.2, 1.5, 10.5), fov: 33 };
    const B = { pos: V(16.6, 0.6, 9.0), look: V(26.0, 1.35, 10.5), fov: 33 };
    return {
      tick: (t, dt) => {
        c.hand = 0.004;
        c.setFade(1 - smooth((t - 0.15) / 1.5));
        const x = S1.x0 - S1.v * t;
        this.speed = S1.v;
        this.place(x);
        const k = smooth(t / 5.4);
        c.pos.lerpVectors(A.pos, B.pos, k);
        c.look.lerpVectors(A.look, B.look, k);
        // as it comes up to the lens the camera gives it a little of its attention
        if (van) c.look.lerp(_w.set(x - 0.6, 1.0, laneZ(x)), 0.5 * smooth((t - 3.9) / 1.5));
        c.fov = A.fov;
        this.road(c, dt);
      },
      cues: [[0.3, () => this.sfx('crow', { pos: V(30, 14, -6), vol: 0.7 })]],
    };
  }

  // ------------------------------------------------------------------ 2. alongside, down the lane; the title
  shotLane(c) {
    return {
      tick: (t, dt) => {
        c.hand = 0.011;
        const x = S2.x0 - (S2.v * t + 0.5 * S2.a * t * t);
        this.speed = S2.v + S2.a * t;
        this.place(x, S2.a);
        // a camera car ahead of it on the garage side, at hub height, falling back along its flank; it looks over the
        // van's roof, so the van rides low in the frame and the houses and the title card have the top of it
        const k = t / 4.8, z = laneZ(x);
        c.pos.set(x - 5.8 + 1.7 * k, 0.42 + 0.08 * k + 0.004 * Math.sin((40 - x) * 3.1), z - 4.2 + 0.2 * k);
        c.look.set(x - 0.4 + 0.4 * k, 1.68 - 0.12 * k, z);
        c.fov = 40;
        this.road(c, dt);
      },
      cues: [
        [0.7, () => { this.title?.show(); this.sfx('paper', { vol: 0.8 }); }],
        [4.5, () => this.title?.hide()],
      ],
    };
  }

  // ------------------------------------------------------------------ 3. pulling up across from the garage
  shotPullup(c) {
    const g = this.game, van = this.van, st = g.street;
    const A = { pos: V(16.4, 0.72, 11.25), look: V(4.0, 1.15, 10.3), fov: 36 };
    const B = { pos: V(10.9, 1.22, 11.75), look: V(3.2, 1.0, 10.9), fov: 34 };
    const dust = (x, z, n) => g.effects.puff({ pos: van.local(x, 0.1, z), count: n, colors: [0xb8a890, 0x9a8a78, 0xd0c4b0], size: 0.1, speed: 0.2, up: 0.06, gravity: 0.03, drag: 1.0, life: 2.6, radius: 0.35 });
    const tb = S3.stop - S3.brake, decel = S3.v / tb, ext = { pitch: 0, roll: 0, bounce: 0 };
    return {
      tick: (t, dt) => {
        c.hand = 0.005;
        let x, a = 0;
        if (t < S3.brake) { x = S3.x0 - S3.v * t; this.speed = S3.v; }
        else if (t < S3.stop) { const u = t - S3.brake; x = S3.x0 - S3.v * S3.brake - (S3.v * u - 0.5 * decel * u * u); this.speed = S3.v - decel * u; a = -decel * smooth(u / 0.35); }
        else { x = PARK.x; this.speed = 0; }
        // stopped: the nose, dipped under the brakes, rocks back on its springs; the dead engine's last shudder
        ext.pitch = ext.roll = ext.bounce = 0;
        if (t >= S3.stop) { const u = t - S3.stop; ext.pitch = decel * 0.021 * Math.exp(-u * 3.4) * Math.cos(u * 8.2); }
        if (this.offAt !== null) { const u = t - this.offAt; ext.pitch += Math.sin(u * 9) * Math.exp(-u * 3.2) * 0.016; ext.roll += Math.sin(u * 7 + 1) * Math.exp(-u * 3.5) * 0.009; }
        this.place(x, a, ext);
        const k = smoother(t / 7.4);
        c.pos.lerpVectors(A.pos, B.pos, k);
        c.look.lerpVectors(A.look, B.look, k);
        c.fov = A.fov + (B.fov - A.fov) * k;
        // the pigeons on the road get out of its way
        if (van && st && !c.skipping && this.speed > 0.2) {
          const nose = van.local(0, 0, NOSE, _w);
          for (const p of st.pigeons || []) if (p.state === 'walk' && Math.hypot(p.pos.x - nose.x, p.pos.z - nose.z) < 3.3) st.flyOff(p, nose);
        }
        this.road(c, dt);
      },
      cues: van ? [
        [S3.brake, () => van.setBrake(true)],
        [S3.stop, () => { if (!c.skipping) { dust(-0.72, 1.0, 3); dust(0.72, 1.0, 3); dust(-0.72, -1.1, 3); dust(0.72, -1.1, 2); } }],
        [S3.off - 0.14, () => this.sfx('arrIgnition', { pos: van.local(-0.4, 1.0, 1.3), vol: 1.2 })],
        [S3.off, () => { this.offAt = S3.off; this.engineOff(); }],
        [S3.off + 0.05, () => g.events.emit('arrival:wake', {})],
        [S3.off + 1.2, () => this.sfx('engineTick', { pos: van.local(0, 0.6, 1.3), vol: 2.2 })],
      ] : [[S3.off, () => g.events.emit('arrival:wake', {})]],
    };
  }

  /** The key's turned back: the engine coughs and dies, the brake lights go out, the van settles on its springs. */
  engineOff() {
    const van = this.van;
    if (!this.engineOn) return;
    this.engineOn = false;
    this.engine?.stopAll(); this.engine = null;
    if (!van) return;
    this.sfx('engineOff', { pos: van.local(0, 0.6, 1.2), vol: 1 });
    this.sfx('arrSettle', { pos: van.local(0, 0.5, 0), vol: 0.9 });
    van.setBrake(false);
    van.keyAt(0, 0);
    van.lamps({ hand: true });
  }

  // ------------------------------------------------------------------ the hand-off
  /** The last frame: the driver's eye looking out at the lane, exactly where Grandpa's window tap starts. */
  handoff(c) {
    const g = this.game, van = this.van;
    this.tidy();
    if (van) {
      van.eye(c.pos); van.cabGlass(true);
      if (this.driver) this.driver.visible = false;
      if (this.arms) { this.arms.visible = true; this.arms.reach('left', LAP_L, 0.01); }
    } else c.pos.set(2.4, 1.42, 12.16);
    c.look.copy(HANDOFF.look);
    c.fov = HANDOFF.fov;
    c.hand = 0.006;
    c.camOn = true;
    c.applyCamera();
    this.shot = null;
    this.active = false;
    g.events.emit('arrival:end', {});
  }

  /** A touch more vignette over the opening (the grade pass, src/core/renderer.js), in over the fade-up and gone by the
   *  hand-off. Per frame, so it never fights whoever else sets the look. */
  grade() {
    const u = this.game.renderer.grade?.uniforms, B = this.gradeBase;
    if (!u?.uVignette || !B) return;
    u.uVignette.value = B.vig + (this.active ? 0.07 * smooth(this.t / 2) * (1 - smooth((this.t - (LENGTH - 2)) / 1.8)) : 0);
  }

  /** Put everything the opening moved or added back where the game expects it (idempotent): parked, engine off, quiet.
   *  It runs at the hand-off, or when the opening is cut short. */
  tidy() {
    const g = this.game, van = this.van, st = g.street;
    this.engine?.stopAll(); this.engine = null;
    this.engineOn = false;
    this.offAt = null;
    this.speed = 0;
    if (van) {
      van.root.visible = true;
      van.setPose(PARK.x, PARK.z, PARK.heading);
      van.lean(0, 0, 0); van.steer(0); van.setBrake(false); van.lamps({});
      if (van.cab?.key) { van.keyAt(0, 0); van.cab.key.visible = false; } // (in your pocket)
      // nothing is left standing where it parked
      const nose = van.local(0, 0, 0, _w);
      for (const p of st?.pigeons || []) if (p.state === 'walk') { p.peck = 0; if (Math.abs(p.pos.x - nose.x) < 2.2 && Math.abs(p.pos.z - nose.z) < 1.2) p.pos.set(nose.x - 3.2 - Math.random(), 0, nose.z - 2.4 - Math.random()); }
    }
    this.title?.dispose(); this.title = null;
    const u = g.renderer.grade?.uniforms, B = this.gradeBase;
    if (u?.uVignette && B) { u.uVignette.value = B.vig; this.gradeBase = null; }
  }

  /** The cutscene ended before the hand-off (another took over): tidy up, let the cab look go. */
  abort() {
    this.tidy();
    this.active = false;
    this.shot = null;
    this.release();
  }

  // ------------------------------------------------------------------ you in the van, until you're out of it
  /** Per frame (src/plugins/arrival.js). */
  update(dt) {
    const g = this.game, van = this.van;
    if (this.active && !g.cutscene.active) this.abort();
    if (this.active) this.grade();
    if (!this.seated) return;
    if (!van || !g.cutscene.active) { this.release(); return; }
    // from outside you're seen at the wheel; once the camera is in the cab it is your eyes: near-clear glass, the roof's
    // shade and your arms
    const p = van.root.worldToLocal(_v.copy(g.camera.position));
    const inside = Math.abs(p.x) < 0.74 && p.y > 0.3 && p.y < 1.9 && p.z > 0.3 && p.z < 1.66;
    if (inside !== !!van.inCab) van.cabGlass(inside);
    if (this.arms) { this.arms.visible = inside; this.arms.update(dt); }
    if (this.driver) { this.driver.visible = !inside; this.driver.update(dt, van.wheels[0].rotation.y); }
    if (!inside && van.door > 0.5) this.release(); // out of the van
  }

  release() {
    this.seated = false;
    this.arms?.dispose(); this.arms = null;
    this.driver?.dispose(); this.driver = null;
    if (this.van?.inCab) this.van.cabGlass(false);
  }
}
