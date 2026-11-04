// game.drive: the new game's arrival, played. You sit in Grandpa's old kei van in the dark of the lane's east
// underpass, the engine idling while a train rumbles over the girders; then you roll out into the lane at golden hour,
// past the neighbours' houses and Mikawa-ya, and park across from the garage's shutter (Grandpa waves you in: he is the
// Grandpa agent's, placed on 'drive:lane'). A parking assist eases the van into the spot; handbrake, engine off, the hot
// block ticks, and the camera settles on the side window, where Grandpa's meeting picks up.
//
//   game.drive.start(opts) -> Promise   resolves once the van is parked at PARK (src/life/van.js) with the engine off
//                                       and you still in the driver's seat (camera in the cab); also when skipped.
//                                       opts: { fadeIn: seconds (1.6), exitPrompt: true (offer "get out" if nothing
//                                       takes over once parked), music: true (the 'intro' piece), train: true (one
//                                       over the underpass as you start), endLook: [x, y, z] / endFov: where the
//                                       camera settles once parked (default: Grandpa's first shot from the seat) }
//   game.drive.active    true from start() until parked;   game.drive.seated: parked, still in the cab
//   game.drive.skip()    straight to parked (also: hold Enter, or the touch SKIP button)
//   game.drive.leave({ animate }) -> Promise   out of the van: the door swings open, you step out beside it facing
//                                       the shutter (seated mode ends by itself once a cutscene has taken the camera)
//   events: 'drive:start', 'drive:lane' (fired at the start: you're in the lane's underpass), 'drive:parked' (engine
//   off), 'drive:end' (out of the seat)
//
// Controls: W / ↑ go, S / ↓ brake then reverse, A / D (← →) steer, Space brake (handbrake), H horn, R radio, L lights,
// the mouse looks round the cab (clamped). The lane's walls, kerbs, poles and parked things are soft barriers (a thud,
// a pixel dust puff); people in front of the van make it slow and stop; stuck against something for a few seconds,
// the van is set back on the lane.
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { radio } from '../core/music.js';
import { bgm } from '../core/bgm.js';
import { installDriveTouch } from '../core/touch.js';
import { PARK } from '../life/van.js';
import { propSize } from '../world/props.js';
import { VanPhysics } from './physics.js';
import { Road, Course } from './route.js';
import { CabArms } from './arms.js';
import { DriveUI } from './ui.js';
import { chalkTexture } from './art.js';
import './sfx.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const wrapA = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const smoother = (t) => { t = clamp(t, 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const HL = 1.72, HW = 0.74; // the van's half length / half width
const EYE = V3(-0.34, 1.44, 0.98); // the driver's eye in the van's body space
const LOOK0 = -0.13; // resting pitch: the lane ahead, the wheel and the dial low in view
// the lane (src/world/Town.js): you start in the dark of the east underpass, on the left of its roadway
const START = { x: 31.6, z: 10.0 }; // under the tracks (x 30 / 33), the dash just catching the light from the mouth
const RECTS = [{ x0: 25.0, x1: 38.6, z0: 6.62, z1: 11.6 }, { x0: -24, x1: 25.6, z0: 6.15, z1: 13.32 }]; // underpass, lane
const PATH = [[39, 10.0], [30, 10.0], [22, 10.5], [14, 11.6], [8, 12.35], [PARK.x, PARK.z], [-6, PARK.z]];
// where the camera settles once you're parked: Grandpa's first shot from the seat (src/grandpa/scenes.js tapScene)
const END_LOOK = [1.7, 1.0, 8.6], END_FOV = 56, END_DUR = 1.7;
const UNDERPASS_Z = 9.6;

export class Drive {
  constructor(game) {
    this.game = game;
    this.state = 'off';
    this.phys = new VanPhysics();
    this.look = { yaw: 0, pitch: LOOK0, idle: 0 };
    this.said = new Set();
    this.ui = new DriveUI(game);
    this.auto = false;
    this.path = new Road('lane', PATH, { half: 2.5, edge: 99 });
    this.course = new Course({ rects: RECTS });
    this.q = { pen: 0 };
    this.ctl = { throttle: 0, brake: 0 };
    this._v = V3(0, 0, 0); this._w = V3(0, 0, 0); this._q = new THREE.Quaternion(); this._q2 = new THREE.Quaternion(); this._e = new THREE.Euler(0, 0, 0, 'YXZ'); this._m = new THREE.Matrix4();
  }

  get van() { return this.game.life?.van || null; }
  get active() { return this.state === 'driving' || this.state === 'parking'; }
  get seated() { return this.state === 'seated'; }

  // ------------------------------------------------------------------ start / skip
  start(opts = {}) {
    if (this.promise) return this.promise;
    if (!this.van) return Promise.resolve();
    this.opts = { fadeIn: 1.6, exitPrompt: true, music: true, train: true, endLook: END_LOOK, endFov: END_FOV, ...opts };
    this.promise = new Promise((res) => { this.resolve = res; });
    try { this.begin(); } catch (e) { console.error('drive', e); this.finish(true); }
    return this.promise;
  }

  begin() {
    const g = this.game, van = this.van, o = this.opts;
    this.said.clear();
    this.t = 0; this.stuckT = 0; this.bumpT = 0; this.lastPen = 0; this.noteT = 0; this.stillT = 0; this.skipT = 0; this.rumble = 0;
    this.horn = 0; this.lights = false; this.radioOn = false; this.handbrake = false; this.engineOn = true;
    this.ctl.throttle = 0; this.ctl.brake = 0;
    this.look.yaw = 0; this.look.pitch = LOOK0; this.look.idle = 0;
    this.handedOver = false; this._prompted = false;
    this.freeze(true);
    g.cutscene?.setFade(1);
    this.fadeT = this.fadeDur = o.fadeIn > 0 ? o.fadeIn : 0;
    if (!(o.fadeIn > 0)) g.cutscene?.setFade(0);
    // the van, idling in the dark of the underpass
    this.phys.reset(START.x, START.z, -Math.PI / 2, 0);
    van.setDoor(0); van.setLights(false); van.setBrake(false); van.cabGlass(true); van.lean(0, 0, 0);
    this._inCab = true;
    this.applyVan(0);
    this.arms?.dispose();
    this.arms = new CabArms(van, g.state.avatar || {}, this.skinRGB());
    this.obstacles();
    this.addMarks();
    this.env = { radioPos: radio.pos };
    this.ui.show(true);
    if (g.input.touch) this.touch ||= installDriveTouch(g.input, { onOut: () => this.leave() });
    this.touch?.seated(false);
    this.state = 'driving';
    this.placeCamera(0);
    this.startAudio();
    if (o.music !== false && audio.ready && bgm.current !== 'intro') bgm.play('intro', { loop: false, fade: 2 });
    if (o.train !== false) this.trainOverhead();
    g.events.emit('drive:start', {});
    g.events.emit('drive:lane', { x: START.x });
  }

  /** Straight to parked (the van in its spot, engine off, the camera on the side window). */
  skip() {
    if (!this.promise) { this.start({ fadeIn: 0 }); }
    if (!this.active) return;
    this.game.cutscene?.setFade(1);
    this.phys.reset(PARK.x, PARK.z, PARK.heading);
    this.applyVan(0);
    this.parked(true);
  }

  /** A train over the underpass as you start (the town's own, the east side). */
  trainOverhead() {
    const town = this.game.garage?.town, tr = town?.trains?.find((t) => t.s > 0);
    if (!tr || !town.runTrain) return;
    town.runTrain(1, -1);
    const len = new THREE.Box3().setFromObject(tr.g).getSize(V3(0, 0, 0)).z || 42;
    tr.z = UNDERPASS_Z + len / 2 + 20; // its head reaches the bridge a second or two in
    tr.played = false;
    this.train = { tr, len };
  }

  // ------------------------------------------------------------------ the lane: what's in the way, the spot
  /** Boxes to bump into: the player's obstacles in the roadway (not the van's own) and the town's props standing in it. */
  obstacles() {
    const g = this.game, van = this.van, town = g.garage?.town;
    const inRoad = (a, b, c, d) => b > -25 && a < 39 && d > 6.0 && c < 13.45;
    const boxes = g.player.obstacles.filter((o) => o.enabled && o !== van.ob && o.maxX - o.minX < 8 && o.maxZ - o.minZ < 8 && inRoad(o.minX, o.maxX, o.minZ, o.maxZ));
    const m = new THREE.Matrix4();
    for (const e of town?.cull?.list || []) {
      const id = e.im?.name?.startsWith('props:') ? e.im.name.slice(6) : null;
      if (!id || !e.base) continue;
      const sz = propSize(id);
      for (let i = 0; i < e.base.length / 16; i++) {
        m.fromArray(e.base, i * 16);
        const el = m.elements, s = Math.hypot(el[0], el[1], el[2]), ry = Math.atan2(el[8], el[0]);
        const x = el[12], y = el[13], z = el[14];
        if (sz.y * s < 0.45 || y > 0.5) continue; // flat things on the road (lids, cans, weeds) and things up on walls
        // tall things (poles, lamps, trees) stand on a slim foot: their crossarms and crowns are far overhead
        const tall = sz.y * s > 3, hx = tall ? 0.22 : (sz.x * s) / 2, hz = tall ? 0.22 : (sz.z * s) / 2, c = Math.abs(Math.cos(ry)), sn = Math.abs(Math.sin(ry));
        const ex = hx * c + hz * sn, ez = hx * sn + hz * c;
        if (ex > 3 || ez > 3) continue;
        if (inRoad(x - ex, x + ex, z - ez, z + ez)) boxes.push({ minX: x - ex, maxX: x + ex, minZ: z - ez, maxZ: z + ez });
      }
    }
    this.boxes = boxes;
  }

  /** Grandpa's chalk marks where the van goes (the arrow points nose-first into the spot). */
  addMarks() {
    this.dropMarks();
    const t = chalkTexture();
    const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, color: 0xe8e4da });
    const geo = new THREE.PlaneGeometry(2.0, 4.0);
    geo.rotateX(-Math.PI / 2);
    const mark = new THREE.Mesh(geo, m);
    mark.position.set(PARK.x, 0.012, PARK.z);
    mark.rotation.y = PARK.heading + Math.PI;
    mark.name = 'drive-chalk';
    this.game.scene.add(mark);
    this.marks = { mark, t, m, geo };
  }
  dropMarks() {
    const M = this.marks;
    if (!M) return;
    M.mark.parent?.remove(M.mark);
    M.geo.dispose(); M.m.dispose(); M.t.dispose();
    this.marks = null;
  }

  // ------------------------------------------------------------------ the player while driving
  freeze(on) {
    const g = this.game;
    g.player.frozen = on;
    g.held.anchor.visible = !on;
    g.interaction.enabled = !on;
    g.uiCine = on;
    document.body.classList.toggle('cine', on);
    if (on) g.player.vel.set(0, 0, 0);
  }

  skinRGB() {
    const fp = this.game.fp;
    try { if (fp?.human && fp.handColor) return fp.handColor(fp.human); } catch { /* no body yet */ }
    return null;
  }

  say(key, lines, force = true) {
    if (this.said.has(key)) return;
    this.said.add(key);
    this.game.monologue?.say(lines[Math.floor(Math.random() * lines.length)], { force });
  }

  // ------------------------------------------------------------------ audio
  startAudio() {
    if (!audio.ready) return;
    const L = (name, vol) => { const h = audio.loop(name, {}); h?.set(vol, 0.4); return h; };
    this.snd = { engine: L('drvEngine', 0.22), whine: L('drvWhine', 1), crunch: L('drvCrunch', 1), road: L('drvRoad', 0), horn: L('drvHornLoop', 0) };
  }
  stopAudio(engineOff = false) {
    const S = this.snd;
    if (!S) return;
    for (const h of Object.values(S)) h?.stopAll();
    this.snd = null;
    if (engineOff) audio.play('engineOff', { vol: 0.9 });
  }
  updateAudio() {
    const S = this.snd, P = this.phys;
    if (!S) return;
    const v = Math.abs(P.v);
    S.engine?.synth?.tune?.(P.rpm + (P.shiftT > 0 ? -250 : 0), P.throttle);
    S.engine?.set(0.2 + P.throttle * 0.1, 0.12);
    // straight-cut whine: first gear and reverse
    const whine = P.gear <= 1 ? Math.min(1, v / 3) * (P.gear === 0 ? 0.03 : 0.016) : 0.004 * Math.min(1, v / 4);
    S.whine?.synth?.tune?.(170 + v * (P.gear === 0 ? 190 : 140), whine);
    S.crunch?.synth?.tune?.(v * 9);
    S.road?.set(Math.min(0.24, v * 0.035), 0.2);
    if (S.road?.filter) S.road.filter.frequency.setTargetAtTime(150 + v * 40, audio.now, 0.1);
    S.horn?.set(this.horn > 0 ? 0.9 : 0, 0.02);
    if (P.shifted) { audio.play('drvShift', { vol: 0.5 }); P.shifted = 0; }
  }

  toggleRadio() {
    if (!audio.ready) return;
    if (!this.radioOn) {
      this.radioOn = true;
      radio.attach(null); // inside the cab: not positional
      const st = radio.cycle() < 0 ? radio.cycle() : radio.station;
      const S = radio.stations[st];
      if (S) this.ui.ticket(S.name, S.jp);
    } else {
      const st = radio.cycle();
      if (st < 0) { this.radioOn = false; this.ui.ticket('Radio off'); radio.attach(this.env?.radioPos || null); }
      else { const S = radio.stations[st]; this.ui.ticket(S.name, S.jp); }
    }
  }
  radioOff() {
    if (!this.radioOn) return;
    this.radioOn = false;
    radio.setStation(-1);
    radio.attach(this.env?.radioPos || null);
  }

  // ------------------------------------------------------------------ input: keys ease in and out (no jolts)
  readInput(dt) {
    const inp = this.game.input, C = this.ctl;
    if (this.auto) return this.autopilot();
    const k = (a, b) => inp.key(a) || (b && inp.key(b));
    let steer = 0;
    if (k('KeyA', 'ArrowLeft')) steer += 1;
    if (k('KeyD', 'ArrowRight')) steer -= 1;
    const wantT = k('KeyW', 'ArrowUp') ? 1 : 0, wantB = k('KeyS', 'ArrowDown') ? 1 : 0;
    C.throttle += clamp(wantT - C.throttle, -dt * 4, dt * 1.6);
    C.brake += clamp(wantB - C.brake, -dt * 6, dt * 3.5);
    return { throttle: C.throttle, brake: C.brake, steer, hand: inp.key('Space') };
  }

  /** Test autopilot: follow the lane to the spot, slowing down to park. */
  autopilot() {
    const P = this.phys, r = this.path, q = r.nearest(P.x, P.z, {});
    let vt = 5.2;
    const d = Math.hypot(P.x - PARK.x, P.z - PARK.z);
    if (d < 12) vt = Math.min(vt, Math.max(0.6, d * 0.7));
    if (d < 0.4) vt = 0;
    const tp = r.at(q.s + Math.max(4, Math.abs(P.v) * 1.1), 0, {});
    const dx = tp.x - P.x, dz = tp.z - P.z;
    const alpha = wrapA(Math.atan2(dx, dz) - P.h);
    const delta = Math.atan2(2 * 2.16 * Math.sin(alpha), Math.hypot(dx, dz));
    const steer = clamp(delta / Math.max(0.05, P.maxDelta(P.v)), -1, 1);
    const err = vt - P.v;
    return { throttle: err > 0.3 ? clamp(err * 0.5, 0, 1) : 0, brake: err < -0.4 ? clamp(-err * 0.4, 0, 1) : vt === 0 && P.v > 0.05 ? 0.6 : 0, steer, hand: false, analog: true };
  }

  // ------------------------------------------------------------------ the frame
  update(dt) {
    const g = this.game;
    if (this.state === 'off') return;
    if (this.state === 'seated') { this.updateSeated(dt); return; }
    if (this.state === 'leaving') { this.updateLeaving(dt); return; }
    if (this.fadeT > 0) { this.fadeT = Math.max(0, this.fadeT - dt); g.cutscene?.setFade(smooth(this.fadeT / this.fadeDur)); }
    const paused = !g.input.locked || g.uiOpen || g.pc?.active;
    if (paused) { this.placeCamera(0); return; }
    this.t += dt;
    // hold Enter (or the touch SKIP) to skip
    this.skipT = g.input.key('Enter') ? this.skipT + dt : Math.max(0, this.skipT - dt * 2);
    this.ui.skipBar(this.skipT > 0.05 ? this.skipT / 0.9 : null);
    if (this.skipT > 0.9) { this.skipT = 0; this.ui.skipBar(null); this.skip(); return; }
    const inp = g.input;
    if (inp.keyPressed('KeyR')) this.toggleRadio();
    if (inp.keyPressed('KeyL')) { this.lights = !this.lights; this.van.setLights(this.lights); audio.play('relay', { vol: 0.25 }); }
    this.horn = inp.key('KeyH') ? 1 : 0;
    this.trainRumble(dt);
    if (this.state === 'parking') { this.updateParking(dt); return; }
    const ctl = this.readInput(dt);
    if (ctl.hand && !this.handbrake) audio.play('drvHandbrake', { vol: 0.5 });
    this.handbrake = !!ctl.hand;
    this.yieldToPeople(ctl);
    const P = this.phys, x0 = P.x, z0 = P.z;
    P.step(dt, ctl);
    this.collide();
    this.applyVan(Math.hypot(P.x - x0, P.z - z0) * Math.sign(P.v || 1));
    this.progress(dt, ctl);
    if (this.state !== 'driving') return;
    this.van.setBrake((P.braking > 0.1 && P.v > 0.2) || this.handbrake);
    this.van.lamps({ hand: this.handbrake, beam: this.lights, radio: this.radioOn });
    this.arms?.update(dt, { turn: this.van.cab?.spin.rotation.z || 0, horn: this.horn });
    this.van.swing(dt, P.ax, P.alat);
    this.placeCamera(dt);
    this.updateAudio();
    this.noteT += dt;
    if (this.noteT > 14 || P.x < 20) this.ui.noteAway();
    g.player.pos.set(P.x, 0, P.z);
  }

  /** The train overhead shakes the cab a little while it crosses the bridge. */
  trainRumble(dt) {
    const T = this.train;
    let k = 0;
    if (T?.tr.g.visible && this.phys.x > 22) k = clamp(1 - Math.abs(T.tr.z - UNDERPASS_Z) / (T.len / 2 + 8), 0, 1);
    this.rumble += (k - this.rumble) * Math.min(1, dt * 3);
  }

  /** Cues along the lane, the parking assist, getting unstuck. */
  progress(dt, ctl) {
    const g = this.game, P = this.phys;
    if (this.t > 1.8) this.say('lane', ["Grandpa's lane. The trains still rattle the windows."]);
    if (P.x < 23 && g.grandpa?.gp) this.say('gp', ['Is that... Grandpa? Waving me in?']);
    if (P.x < 15) this.say('garage', ['There it is. Gacha Garage.', "There it is. Grandpa's garage."], false);
    if (P.x < PARK.x - 4.5) this.say('past', ['Too far. Back up a bit.']);
    const d = Math.hypot(P.x - PARK.x, P.z - PARK.z), ang = Math.abs(wrapA(P.h - PARK.heading));
    this.stillT = Math.abs(P.v) < 0.25 ? this.stillT + dt : 0;
    if ((d < 1.5 && Math.abs(P.v) < 1.8 && ang < 0.55) || (d < 3.2 && this.stillT > 1.4 && ang < 0.8)) { this.beginParking(); return; }
    // pressed against something with the pedal down and going nowhere: back on the lane after a moment
    this.stuckT = (this.lastPen > 0.01 && Math.abs(P.v) < 0.3 && (ctl.throttle > 0.5 || ctl.brake > 0.5)) ? this.stuckT + dt : Math.max(0, this.stuckT - dt);
    if (this.stuckT > 3.5) { this.stuckT = 0; this.rescue(); }
  }

  /** Back on the lane, facing the garage (after a short dip to black). */
  rescue() {
    const q = this.path.nearest(this.phys.x, this.phys.z, {}), p = this.path.at(Math.max(2, q.s - 1), 0, {});
    this.game.cutscene?.setFade(1);
    this.phys.reset(p.x, p.z, p.heading, 0);
    this.ctl.throttle = this.ctl.brake = 0;
    this.applyVan(0);
    this.fadeT = this.fadeDur = 0.7;
    this.say('rescue', ["Okay... let's try that again."]);
  }

  // ------------------------------------------------------------------ collisions: soft walls, kerbs, poles, props
  corners() {
    const P = this.phys, fx = Math.sin(P.h), fz = Math.cos(P.h), lx = Math.cos(P.h), lz = -Math.sin(P.h);
    const out = [];
    for (const [f, l] of [[HL, HW], [HL, -HW], [-HL, HW], [-HL, -HW], [0, HW], [0, -HW], [HL, 0], [-HL, 0], [HL * 0.5, HW], [HL * 0.5, -HW], [-HL * 0.5, HW], [-HL * 0.5, -HW]]) out.push([P.x + fx * f + lx * l, P.z + fz * f + lz * l]);
    return out;
  }

  collide() {
    const P = this.phys;
    let maxPen = 0, px = 0, pz = 0, at = null, torque = 0;
    // the lane's edges: walls, kerbs, the underpass: push the van's outline back inside
    for (const c of this.corners()) {
      const r = this.course.push(c[0], c[1], this.q);
      if (r.pen <= 0.001) continue;
      if (r.pen > maxPen) { maxPen = r.pen; at = c; }
      px += r.nx * r.pen; pz += r.nz * r.pen;
      torque += ((c[1] - P.z) * r.nx - (c[0] - P.x) * r.nz) * r.pen;
    }
    // things standing in the road: the van's outline (three circles) against their boxes
    for (const k of [-1.0, 0, 1.0]) {
      const cx = P.x + Math.sin(P.h) * k, cz = P.z + Math.cos(P.h) * k, R = 0.76;
      for (const b of this.boxes || []) {
        const qx = clamp(cx, b.minX, b.maxX), qz = clamp(cz, b.minZ, b.maxZ), dx = cx - qx, dz = cz - qz, d = Math.hypot(dx, dz), pen = R - d;
        if (pen <= 0) continue;
        const nx = d > 1e-4 ? dx / d : -Math.sin(P.h), nz = d > 1e-4 ? dz / d : -Math.cos(P.h);
        px += nx * pen; pz += nz * pen;
        if (pen > maxPen) { maxPen = pen; at = [qx, qz]; }
        torque += ((cz - P.z) * nx - (cx - P.x) * nz) * pen * 0.5;
      }
    }
    this.lastPen = maxPen;
    if (maxPen <= 0) return;
    const pl = Math.hypot(px, pz), nx = px / pl, nz = pz / pl;
    const push = Math.min(maxPen, 0.5);
    P.x += nx * push; P.z += nz * push;
    // speed into the obstacle is lost (with a little give), the rest slides along it
    const fx = Math.sin(P.h), fz = Math.cos(P.h), vx = fx * P.v, vz = fz * P.v, vn = vx * nx + vz * nz;
    if (vn < 0) {
      const impact = -vn;
      const wx = vx - nx * vn * 1.15, wz = vz - nz * vn * 1.15;
      P.v = (wx * fx + wz * fz) * (1 - Math.min(0.5, impact * 0.12));
      if (impact > 0.9 && this.bumpT <= 0) this.bump(at, impact);
      else if (Math.abs(P.v) > 1.5 && audio.canPlay('drvScrape', 0.3)) audio.play('drvScrape', { v: Math.min(1, Math.abs(P.v) / 5) });
    }
    P.h += clamp(torque * 0.3, -0.03, 0.03); // and turns to run along it
  }

  bump(at, impact) {
    const g = this.game, P = this.phys;
    this.bumpT = 0.45;
    const v = Math.min(1, impact / 4);
    const pos = at ? V3(at[0], 0.35, at[1]) : V3(P.x, 0.35, P.z);
    audio.play('drvBump', { v: 0.35 + v * 0.65, vol: 1 });
    audio.play('thud', { v: 0.3 + v * 0.5, pos, vol: 0.6 });
    g.effects?.puff({ pos, count: 4 + Math.round(v * 5), colors: [0xb8a888, 0x9a8a70, 0xd0c4a8], size: 0.07 + v * 0.05, speed: 0.5 + v, up: 0.3, life: 0.9 });
    P.kick(0.2 + v * 0.5, (Math.random() - 0.5) * 0.35);
    g.player.shake = Math.max(g.player.shake, 0.15 + v * 0.35);
    if (impact > 1.8) this.say('bump' + Math.floor(this.t / 20), ['Oof. Sorry, van.', 'Easy... Grandpa would kill me.'], false);
  }

  /** Somebody in front of the van (passers-by, the neighbours, Grandpa, the cat): ease off and stop short of them. */
  yieldToPeople(ctl) {
    const g = this.game, P = this.phys, fx = Math.sin(P.h), fz = Math.cos(P.h);
    const pts = [...(g.pedestrians?.list || []), ...(g.lane?.list || [])].map((p) => p.h?.root?.visible !== false && p.h?.root?.position).filter(Boolean);
    const gp = g.grandpa?.gp;
    const gpos = gp?.h?.root?.position || gp?.pos;
    if (gpos) pts.push(gpos);
    if (g.street?.cat?.pos) pts.push(g.street.cat.pos);
    let lim = Infinity;
    for (const p of pts) {
      const dx = p.x - P.x, dz = p.z - P.z;
      const f = dx * fx + dz * fz, l = dx * fz - dz * fx;
      if (Math.abs(l) > 1.2) continue;
      if (P.v >= 0 && f > 0 && f < 10) lim = Math.min(lim, Math.max(0, (f - HL - 0.8) * 0.8));
      if (P.v < 0 && f < 0 && f > -8) lim = Math.min(lim, Math.max(0, (-f - HL - 0.8) * 0.8));
    }
    if (lim < Math.abs(P.v)) {
      ctl.throttle = 0;
      ctl.brake = clamp((Math.abs(P.v) - lim) * 0.9, 0.35, 1);
      if (P.v < 0) P.v = Math.max(P.v, -lim);
      if (Math.abs(P.v) > 0.6) this.say('careful', ['Whoa, careful...', 'Sorry! After you.']);
    }
  }

  // ------------------------------------------------------------------ the van on the road
  applyVan(rolled) {
    const P = this.phys, van = this.van, v = Math.abs(P.v);
    van.place(P.x, 0, P.z, P.h, 0);
    // the old lane's patches and dips under the wheels
    const n = Math.sin(P.dist * 2.7) * Math.sin(P.dist * 0.83 + 1.1);
    van.lean(P.pitch + n * 0.002 * Math.min(1, v / 4), -P.roll, P.bounce + Math.abs(n) * 0.003 * Math.min(1, v / 4));
    if (rolled) van.roll(rolled);
    van.steer(P.delta, clamp(-P.delta * 9.5, -6, 6));
    van.gauge(P.kmh * (P.v < 0 ? 0.6 : 1));
    van.root.updateMatrixWorld(true);
  }

  // ------------------------------------------------------------------ the camera in the cab
  mouseLook(dt, recenter) {
    const inp = this.game.input, L = this.look, P = this.phys;
    if (!inp.locked || dt <= 0) return;
    const s = 0.0022 * (inp.sensitivity || 1), mx = inp.mouse.dx, my = inp.mouse.dy;
    if (mx || my) L.idle = 0; else L.idle += dt;
    L.yaw = clamp(L.yaw - mx * s, -1.9, 1.9);
    L.pitch = clamp(L.pitch - my * s * (inp.invertY ? -1 : 1), -0.95, 0.5);
    // glance into the turn; drift back to the road ahead once the mouse rests
    if (recenter && L.idle > 1.3 && Math.abs(P.v) > 0.8) {
      const want = clamp(P.delta * 1.1, -0.35, 0.35);
      L.yaw += (want - L.yaw) * Math.min(1, dt * 1.5);
      L.pitch += (LOOK0 - L.pitch) * Math.min(1, dt * 1.5);
    }
  }

  placeCamera(dt) {
    const g = this.game, cam = g.camera, L = this.look, P = this.phys, van = this.van;
    this.mouseLook(dt, true);
    van.body.updateMatrixWorld(true);
    if (this.debugCam) { cam.position.copy(this.debugCam.pos); cam.lookAt(this.debugCam.look); if (this.debugCam.fov) { cam.fov = this.debugCam.fov; cam.updateProjectionMatrix(); } cam.updateMatrixWorld(true); return; }
    const eye = this._v.copy(EYE).applyMatrix4(van.body.matrixWorld);
    // the head rides the body, but only part of its pitch and roll (a seat and a neck in between)
    van.root.getWorldQuaternion(this._q);
    this._q2.setFromEuler(this._e.set(van.body.rotation.x * 0.55, 0, van.body.rotation.z * 0.55, 'YXZ'));
    this._q.multiply(this._q2);
    this._q2.setFromEuler(this._e.set(L.pitch, Math.PI + L.yaw, 0, 'YXZ'));
    this._q.multiply(this._q2);
    cam.position.copy(eye);
    cam.quaternion.copy(this._q);
    this.shake(cam);
    const fov = g.player.baseFov + Math.min(2, (P.kmh / 24) * 2);
    if (Math.abs(cam.fov - fov) > 0.05) { cam.fov = fov; cam.updateProjectionMatrix(); }
    cam.updateMatrixWorld(true);
  }

  /** The engine's buzz through the seat (idle, more with the throttle), a train overhead, a bump: tiny and quick. */
  shake(cam) {
    const g = this.game, P = this.phys, t = this.t || 0;
    const a = (this.engineOn ? 0.00035 + 0.00035 * P.throttle + 0.0002 * Math.min(1, Math.abs(P.v) / 5) : 0) + this.rumble * 0.0022;
    cam.position.y += a * (Math.sin(t * 71.3) * 0.6 + Math.sin(t * 113.7) * 0.4);
    cam.position.x += a * 0.5 * Math.sin(t * 89.1);
    const sh = g.player.shake * g.player.shake;
    if (sh > 0) { cam.position.x += (Math.random() - 0.5) * sh * 0.012; cam.position.y += (Math.random() - 0.5) * sh * 0.012; }
  }

  // ------------------------------------------------------------------ parking
  beginParking() {
    const P = this.phys;
    this.state = 'parking';
    this.park = { t: 0, x: P.x, z: P.z, h: P.h, dur: 1.0 + Math.hypot(P.x - PARK.x, P.z - PARK.z) * 0.5, done: false, handT: 0 };
    this.ctl.throttle = 0;
  }
  updateParking(dt) {
    const K = this.park, P = this.phys, van = this.van;
    K.t += dt;
    const k = smoother(K.t / K.dur);
    const x = K.x + (PARK.x - K.x) * k, z = K.z + (PARK.z - K.z) * k, h = K.h + wrapA(PARK.heading - K.h) * k;
    const fwd = (x - P.x) * Math.sin(P.h) + (z - P.z) * Math.cos(P.h), moved = Math.hypot(x - P.x, z - P.z);
    const v0 = P.v;
    P.v = dt > 0 ? fwd / dt : 0;
    P.ax = dt > 0 ? (P.v - v0) / dt : 0; P.alat = 0;
    P.x = x; P.z = z; P.h = h;
    P.delta *= Math.max(0, 1 - dt * 3);
    P.rpm += (850 - P.rpm) * Math.min(1, dt * 4); P.throttle = 0;
    P.suspension(dt);
    this.applyVan(moved * Math.sign(fwd || 1));
    van.setBrake(true);
    this.arms?.update(dt, { turn: van.cab?.spin.rotation.z || 0, horn: this.horn });
    van.swing(dt, clamp(P.ax, -3, 3), 0);
    this.placeCamera(dt);
    this.updateAudio();
    this.game.player.pos.set(P.x, 0, P.z);
    if (K.t >= K.dur && !K.done) {
      K.done = true; P.v = 0;
      audio.play('drvHandbrake', { vol: 0.75 });
      this.handbrake = true;
      van.lamps({ hand: true, beam: this.lights, radio: this.radioOn });
      P.kick(0, 0.2);
    }
    if (K.done) { K.handT += dt; if (K.handT > 0.8) this.parked(false); }
  }

  /** Engine off, the van in its spot: 'drive:parked'; the camera settles on the side window, then start() resolves. */
  parked(instant) {
    const g = this.game, van = this.van;
    this.phys.reset(PARK.x, PARK.z, PARK.heading);
    van.place(PARK.x, 0, PARK.z, PARK.heading, 0);
    van.lean(0, 0, 0); van.steer(0, 0); van.gauge(0); van.setBrake(false); van.setLights(false);
    van.lamps({ hand: true, beam: false, radio: false });
    this.radioOff();
    this.stopAudio(!instant);
    this.engineOn = false; this.lights = false;
    this.state = 'seated';
    this.seatT = 0;
    this.tick = { n: 0, t: 0.6 };
    this.ui.skipBar(null);
    this.ui.noteAway();
    this.touch?.seated(true);
    this.standByDoor();
    if (!instant && !g.grandpa?.gp) setTimeout(() => this.say('made', ['Made it. The old thing still runs.']), 700);
    if (!instant) g.effects?.puff({ pos: van.local(0.4, 0.25, -1.75), count: 4, color: 0x9a948a, size: 0.06, speed: 0.2, up: 0.15, life: 1.4 });
    // the camera eases from your eyes on the lane to the side window (where Grandpa's first shot starts)
    const o = this.opts || {}, cam = g.camera;
    const toPos = van.eye(V3(0, 0, 0)), toLook = V3(...(o.endLook || END_LOOK));
    const toQ = new THREE.Quaternion().setFromRotationMatrix(this._m.lookAt(toPos, toLook, V3(0, 1, 0)));
    this.endCam = { t: instant ? END_DUR : 0, fromPos: cam.position.clone(), fromQ: cam.quaternion.clone(), fromFov: cam.fov, toPos, toQ, toFov: o.endFov || END_FOV };
    this.look.yaw = 0; this.look.pitch = 0;
    if (instant) { this.placeEndCamera(); this.fadeT = this.fadeDur = 0.6; }
    g.events.emit('drive:parked', {});
    if (instant) this.resolveNow();
  }
  resolveNow() { const r = this.resolve; this.resolve = null; r?.(); }

  /** The settling camera: eased from the driving view to the end framing, then the mouse free to look round it. */
  placeEndCamera(dt = 0) {
    const g = this.game, cam = g.camera, E = this.endCam, L = this.look;
    const k = smoother(E.t / END_DUR);
    cam.position.copy(E.fromPos).lerp(E.toPos, k);
    cam.quaternion.copy(E.fromQ).slerp(E.toQ, k);
    if (k >= 1) {
      this.mouseLook(dt, false);
      L.yaw = clamp(L.yaw, -1.2, 1.2); L.pitch = clamp(L.pitch, -0.6, 0.45);
      cam.quaternion.multiply(this._q2.setFromEuler(this._e.set(L.pitch, L.yaw, 0, 'YXZ')));
    }
    const fov = E.fromFov + (E.toFov - E.fromFov) * k;
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    cam.updateMatrixWorld(true);
  }

  /** Your own feet by the driver's door, facing the shutter (where a cutscene's toPlayer() or leave() ends up). */
  standByDoor() {
    const g = this.game, st = this.van.doorStep(V3());
    g.player.pos.set(st.x, 0, st.z);
    g.player.yaw = Math.atan2(-(0.85 - st.x), -(5.0 - st.z));
    g.player.pitch = -0.02;
    g.player.vel.set(0, 0, 0);
  }

  // ------------------------------------------------------------------ parked, still in the seat
  updateSeated(dt) {
    const g = this.game, van = this.van;
    this.seatT += dt; this.t += dt;
    if (this.fadeT > 0) { this.fadeT = Math.max(0, this.fadeT - dt); g.cutscene?.setFade(smooth(this.fadeT / this.fadeDur)); }
    this.syncCab();
    // a cutscene (Grandpa's meeting) takes the camera: hand it over, tidy up once it's finished
    if (g.cutscene?.active) { if (!this.handedOver) { this.handedOver = true; this.ui.show(false); this.touch?.seated(false); } return; }
    if (this.handedOver) { this.release({ keepPlayer: true }); return; }
    // the hot engine ticks as it cools, slower and slower
    const T = this.tick;
    if (T && T.n < 12) { T.t -= dt; if (T.t <= 0) { T.n++; T.t = 0.35 + T.n * 0.18 + Math.random() * 0.4; audio.play('engineTick', { pos: van.local(0, 0.5, 1.2), vol: 1 }); } }
    this.arms?.update(dt, { turn: 0, horn: 0 });
    van.swing(dt, 0, 0);
    const E = this.endCam;
    if (E) {
      E.t = Math.min(END_DUR, E.t + dt);
      this.placeEndCamera(dt);
      if (E.t >= END_DUR && this.resolve) this.resolveNow(); // settled: Grandpa's scene can take it from here
    }
    if (this.opts?.exitPrompt && this.seatT > END_DUR + 0.6) {
      if (!this._prompted) { this._prompted = true; this.ui.prompt(`<span class="k">${g.input.touch ? 'Tap' : 'LMB'}</span>Get out of the van`); }
      if (g.input.locked && g.input.buttonDown(0)) this.leave();
    }
  }

  /** Cab look (near-clear glass, the roof's shade, your arms on the wheel) only while the camera is inside the cab. */
  syncCab() {
    const van = this.van;
    const p = van.root.worldToLocal(this._w.copy(this.game.camera.position));
    const inside = Math.abs(p.x) < 0.74 && p.y > 0.3 && p.y < 1.9 && p.z > 0.3 && p.z < 1.66;
    if (inside === this._inCab) return;
    this._inCab = inside;
    van.cabGlass(inside);
    if (this.arms) this.arms.visible = inside;
  }

  /** Out of the van: the door swings open, you step out beside it, facing the shutter. */
  leave({ animate = true } = {}) {
    if (this.state !== 'seated') return Promise.resolve();
    const g = this.game, van = this.van;
    this.ui.prompt(null);
    this.resolveNow();
    if (!animate) { van.setDoor(1); this.release(); return Promise.resolve(); }
    this.state = 'leaving';
    this.leaveK = 0;
    audio.play('carDoor', { pos: van.local(-0.7, 1, 1), vol: 1 });
    this.leaveFrom = { pos: g.camera.position.clone(), q: g.camera.quaternion.clone(), fov: g.camera.fov };
    return new Promise((res) => { this.leaveRes = res; });
  }
  updateLeaving(dt) {
    const g = this.game, van = this.van, cam = g.camera, F = this.leaveFrom;
    this.leaveK += dt;
    van.setDoor(smooth(this.leaveK / 0.55));
    const k = smoother((this.leaveK - 0.35) / 1.0);
    const out = van.doorStep(V3()).setY(g.player.eye);
    const qOut = new THREE.Quaternion().setFromRotationMatrix(this._m.lookAt(out, V3(0.85, 1.3, 5.0), V3(0, 1, 0)));
    const mid = F.pos.clone().lerp(out, 0.5); mid.y = Math.min(F.pos.y, out.y) - 0.18;
    const a = F.pos.clone().lerp(mid, k), b = mid.lerp(out, k);
    cam.position.copy(a.lerp(b, k));
    cam.quaternion.copy(F.q).slerp(qOut, k);
    const fov = F.fov + (g.player.baseFov - F.fov) * k;
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    cam.updateMatrixWorld(true);
    this.syncCab();
    if (this.leaveK >= 1.4) { this.release(); const r = this.leaveRes; this.leaveRes = null; r?.(); }
  }

  /** Seated mode over: the player by the van door, facing the shutter, back in control (unless a scene owns them). */
  release({ keepPlayer = false } = {}) {
    if (this.state === 'off') return;
    if (!keepPlayer) this.standByDoor();
    this.finish(false);
  }

  /** Tear down whatever is left (sounds, UI, the cab, the chalk) and give the player back. */
  finish(failed) {
    const g = this.game, van = this.van;
    this.stopAudio(false);
    this.radioOff();
    this.dropMarks();
    this.arms?.dispose(); this.arms = null;
    van?.cabGlass(false);
    van?.lean(0, 0, 0);
    this.ui.show(false);
    this.touch?.dispose(); this.touch = null;
    const wasSeated = this.state === 'seated' || this.state === 'leaving';
    this.state = 'off';
    this.train = null; this.endCam = null; this.debugCam = null;
    // after a cutscene took over, whoever runs the scene after it owns the player and the HUD: leave them alone
    if (!this.handedOver && !g.cutscene?.active) {
      this.freeze(false); g.cutscene?.setFade(0);
      const cam = g.camera;
      if (Math.abs(cam.fov - g.player.baseFov) > 0.01) { cam.fov = g.player.baseFov; cam.updateProjectionMatrix(); }
    }
    this.handedOver = false; this._prompted = false; this._inCab = undefined;
    this.promise = null;
    this.resolveNow();
    if (wasSeated || failed) g.events.emit('drive:end', { failed: !!failed });
  }

  // ------------------------------------------------------------------ debug
  /** Teleport along the lane: 'start', 'mid', 'garage' (a few metres short of the spot), or an x. */
  teleport(where, { v = 0 } = {}) {
    if (!this.active) return 'not driving';
    const x = where === 'start' ? START.x : where === 'mid' ? 18 : where === 'garage' ? PARK.x + 7 : +where;
    if (!Number.isFinite(x)) return ['start', 'mid', 'garage'];
    const q = this.path.nearest(x, 10, {}), p = this.path.at(q.s, 0, {});
    this.state = 'driving';
    this.phys.reset(p.x, p.z, p.heading, v);
    this.applyVan(0);
    return [+p.x.toFixed(2), +p.z.toFixed(2)];
  }
}
