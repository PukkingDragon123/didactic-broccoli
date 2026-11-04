// game.drive: you drive Grandpa's old kei van into town yourself, the new game's opening. Out of town on the country
// road (src/drive/country.js, an off-map zone built for the drive and disposed after it), then a cut in the dark of the
// railway underpass to the town's real east underpass, down the lane, and you park across from the garage's shutter.
//
//   game.drive.start(opts) -> Promise   resolves once the van is parked at PARK (src/life/van.js) with the engine off
//                                       and you still in the driver's seat (camera in the cab); also when skipped.
//                                       opts: { from: 'start' | 'lane' | <metres along the road>, fadeIn: seconds,
//                                       exitPrompt: true (offer "get out" if nothing takes over once parked),
//                                       music: true (the 'intro' piece over the drive) }
//   game.drive.active    true from start() until parked;   game.drive.seated: parked, still in the cab
//   game.drive.skip()    straight to parked (also: hold Enter, or the cutscene layer's "Hold to skip" on touch)
//   game.drive.leave({ animate }) -> Promise   out of the van: the door swings open, you step out by it facing the
//                                       shutter (seated mode ends by itself if a cutscene takes the camera)
//   events: 'drive:start', 'drive:lane' (the van enters the real lane), 'drive:parked', 'drive:end' (out of the seat)
//
// Controls: W / ↑ throttle, S / ↓ brake then reverse, A / D (← →) steer, Space handbrake, H horn, R radio, L lights,
// the mouse looks round the cab (clamped). Soft barriers keep you on the road (a thud, a pixel dust puff); a wrong turn
// meets 通行止め with room to turn round; stuck against something for a few seconds, the van is set back on the road.
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { radio } from '../core/music.js';
import { bgm } from '../core/bgm.js';
import { installDriveTouch } from '../core/touch.js';
import { PARK } from '../life/van.js';
import { VanPhysics, VMAX } from './physics.js';
import { Country } from './country.js';
import { Road, Course } from './route.js';
import { CabArms } from './arms.js';
import { DriveUI } from './ui.js';
import { chalkTexture, driveFontText } from './art.js';
import { propGeometry } from '../world/props.js';
import { voxelMaterials } from '../voxel/materials.js';
import './sfx.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const wrapA = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const HL = 1.72, HW = 0.74; // the van's half length / half width (bumpers, mirrors folded)
const EYE = V3(-0.34, 1.44, 0.98); // the driver's eye in the van's body space
const LOOK0 = -0.13; // resting pitch: the road ahead, the wheel and the dial low in view
// the town's east underpass and the lane (see src/world/Town.js): where you come out, where you can drive
const LANE_IN = { x: 37.2, z: 9.3 };
const LANE_RECTS = [{ x0: 25.0, x1: 44, z0: 6.62, z1: 11.6 }, { x0: -24, x1: 25.6, z0: 6.15, z1: 13.32 }];
const LANE_PATH = [[44, 9.3], [34, 9.3], [24, 9.8], [15, 11.3], [8, 12.35], [PARK.x, PARK.z], [-6, PARK.z]];

export class Drive {
  constructor(game) {
    this.game = game;
    this.state = 'off';
    this.phys = new VanPhysics();
    this.look = { yaw: 0, pitch: LOOK0, idle: 0 };
    this.said = new Set();
    this.ui = new DriveUI(game);
    this.auto = false;
    this.skipT = 0;
    this.laneRoad = new Road('lane', LANE_PATH, { half: 2.5, edge: 99 });
    this.q = { pen: 0 };
    this._v = V3(0, 0, 0); this._w = V3(0, 0, 0); this._q = new THREE.Quaternion(); this._q2 = new THREE.Quaternion(); this._e = new THREE.Euler(0, 0, 0, 'YXZ');
  }

  get van() { return this.game.life?.van || null; }
  get active() { return ['country', 'lane', 'parking'].includes(this.state); }
  get seated() { return this.state === 'seated'; }

  // ------------------------------------------------------------------ start / skip / finish
  start(opts = {}) {
    if (this.promise) return this.promise;
    this.buildMs = 0;
    const g = this.game;
    if (!this.van) return Promise.resolve();
    this.opts = { from: 'start', fadeIn: 1.4, exitPrompt: true, ...opts };
    this.promise = new Promise((res) => { this.resolve = res; });
    this.state = 'loading';
    g.cutscene?.setFade(1);
    this.freeze(true);
    const fonts = (async () => {
      try { await Promise.race([document.fonts.load('16px "DotGothic16"', driveFontText()), new Promise((r) => setTimeout(r, 2500))]); } catch { /* no font API */ }
    })();
    fonts.then(() => this.begin()).catch((e) => { console.error('drive', e); this.finish(true); });
    return this.promise;
  }

  begin() {
    const g = this.game, van = this.van, o = this.opts;
    this.said.clear();
    this.t = 0; this.fadeT = 0; this.cutK = 0; this.stuckT = 0; this.bumpT = 0; this.puffT = 0; this.petalT = 0; this.lastPen = 0; this.noteT = 0;
    this.horn = 0; this.lights = false; this.radioOn = false; this.handbrake = false;
    van.setDoor(0); van.setLights(false); van.setBrake(false); van.cabGlass(true); van.lean(0, 0, 0);
    this._inCab = true;
    this.arms?.dispose();
    this.arms = new CabArms(van, g.state.avatar || {}, this.skinRGB());
    this.ui.show(true);
    if (g.input.touch) this.touch ||= installDriveTouch(g.input, { onOut: () => this.leave() });
    this.touch?.seated(false);
    this.saveEnv();
    if (o.from === 'lane') this.enterLane({ fade: o.fadeIn });
    else {
      this.buildCountry();
      const s0 = typeof o.from === 'number' ? o.from : this.country.S.start;
      this.placeOnRoad(s0);
      this.state = 'country';
      this.fadeIn(o.fadeIn);
    }
    this.startAudio();
    // the menu's music gives way to the gentle intro piece (it ends by itself; R puts the van's radio on)
    if (o.music !== false && audio.ready && bgm.current !== 'intro') bgm.play('intro', { loop: false, fade: 2 });
    g.events.emit('drive:start', { from: o.from });
  }

  /** Straight to parked (fade, the van at PARK, engine off). */
  skip() {
    if (!this.promise) { this.start({ from: 'lane', fadeIn: 0 }); }
    if (this.state === 'loading') { this.skipPending = true; return; }
    if (!this.active) return;
    const g = this.game;
    g.cutscene?.setFade(1);
    if (this.state !== 'lane' && this.state !== 'parking') this.enterLane({ fade: 0, quiet: true });
    this.phys.reset(PARK.x, PARK.z, PARK.heading);
    this.applyVan(0);
    this.parked(true);
    this.fadeIn(0.6);
  }

  // ------------------------------------------------------------------ the world
  buildCountry() {
    this.country?.dispose();
    const t0 = performance.now();
    this.country = new Country(this.game);
    this.buildMs = Math.round(performance.now() - t0);
    this.course = this.country.course;
    this.road = this.country.main;
    this.country.onHonk = () => this.say('honk', ["Sorry! These roads are narrow.", "Okay, okay! Keep left, I know."]);
    // the new materials compile now, under the black, not on the first frame of the drive
    try { this.game.renderer.renderer.compile(this.country.group, this.game.camera, this.game.scene); } catch { /* best effort */ }
    this.enterCountryEnv();
  }

  placeOnRoad(s, d = 1.35, v = 0) {
    const p = this.road.at(s, d, {});
    this.phys.reset(p.x, p.z, p.heading, v);
    this.applyVan(0);
  }

  /** The cut: from the country underpass's dark to the town's east underpass. */
  enterLane({ fade = 0.9, quiet = false } = {}) {
    const g = this.game;
    const v = Math.min(Math.max(0, this.phys.v), 6.5);
    if (this.country) { this.country.dispose(); this.country = null; }
    this.exitCountryEnv();
    this.countryAmbience(false);
    this.course = new Course({ rects: LANE_RECTS });
    this.road = this.laneRoad;
    this.laneObstacles();
    this.phys.reset(LANE_IN.x, LANE_IN.z, -Math.PI / 2, v);
    this.applyVan(0);
    this.state = 'lane';
    this.laneT = 0;
    this.addMarks();
    if (!quiet) this.fadeIn(fade);
    g.events.emit('drive:lane');
    if (!quiet) setTimeout(() => this.say('lane', ["Grandpa's lane. The trains still rattle the windows."]), 900);
  }

  /** Static things in the lane to bump into: the player's obstacle boxes that stand in the road (not the van's own). */
  laneObstacles() {
    const g = this.game, van = this.van;
    this.boxes = g.player.obstacles.filter((o) => o.enabled && o !== van.ob && o.maxX - o.minX < 8 && o.maxZ - o.minZ < 8 && o.maxZ > 6.0 && o.minZ < 13.4 && o.minX < 44 && o.maxX > -25);
  }

  /** Grandpa's chalk marks where the van goes, and a cone at the far end of the spot. */
  addMarks() {
    const g = this.game;
    this.dropMarks();
    const t = chalkTexture();
    const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, color: 0xe8e4da });
    const geo = new THREE.PlaneGeometry(2.0, 4.0);
    geo.rotateX(-Math.PI / 2);
    const mark = new THREE.Mesh(geo, m);
    mark.position.set(PARK.x, 0.012, PARK.z);
    mark.rotation.y = PARK.heading + Math.PI; // the arrow points the way in (west, nose first)
    g.scene.add(mark);
    const cg = propGeometry('cone');
    const cone = cg ? new THREE.Mesh(cg, voxelMaterials('normal')) : null;
    if (cone) { cone.position.set(PARK.x - 2.75, 0, PARK.z + 0.1); cone.castShadow = true; g.scene.add(cone); }
    this.marks = { mark, cone, t, m, geo, cx: PARK.x - 2.75, cz: PARK.z + 0.1, tip: 0, tipV: 0, dir: 0 };
  }
  dropMarks() {
    const M = this.marks;
    if (!M) return;
    M.mark.parent?.remove(M.mark); M.cone?.parent?.remove(M.cone);
    M.geo.dispose(); M.m.dispose(); M.t.dispose();
    this.marks = null;
  }

  // ------------------------------------------------------------------ environment (camera range, fog, sky) while out of town
  saveEnv() {
    const g = this.game, cam = g.camera;
    if (this.env) return;
    const town = g.garage.town;
    let dome = null;
    town?.group.traverse((o) => { if (!dome && o.isMesh && o.material === town.skyMat) dome = o; });
    this.env = { near: cam.near, far: cam.far, dome, domePos: dome?.position.clone(), radioPos: radio.pos };
  }
  enterCountryEnv() {
    const cam = this.game.camera;
    cam.near = 0.06; cam.far = 560; cam.updateProjectionMatrix();
    this.outside = true;
  }
  exitCountryEnv() {
    const g = this.game, cam = g.camera, E = this.env;
    this.outside = false;
    if (!E) return;
    cam.near = E.near; cam.far = E.far; cam.updateProjectionMatrix();
    if (E.dome) { E.dome.position.copy(E.domePos); E.dome.updateMatrix(); }
    g.lighting?.refresh?.(); // the fog goes back to the town's
  }
  /** Each frame out of town: the far fog of the open country, the sky dome round the camera. */
  countryEnv() {
    const g = this.game, f = g.scene.fog, E = this.env;
    if (f) { f.near = 90; f.far = 520; }
    if (E?.dome) { E.dome.position.copy(g.camera.position); E.dome.updateMatrix(); }
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

  fadeIn(dur) { this.fadeT = dur > 0 ? dur : 0; this.fadeDur = dur; if (!(dur > 0)) this.game.cutscene?.setFade(0); }

  say(key, lines, force = true) {
    if (this.said.has(key)) return;
    this.said.add(key);
    const text = lines[Math.floor(Math.random() * lines.length)];
    this.game.monologue?.say(text, { force });
  }

  // ------------------------------------------------------------------ audio
  startAudio() {
    if (!audio.ready) return;
    const L = (name, vol, bus) => { const h = audio.loop(name, bus ? { bus } : {}); h?.set(vol, 0.6); return h; };
    this.snd = {
      engine: L('vanEngine', 0.0),
      road: L('drvRoad', 0),
      wind: L('drvWind', 0),
      horn: L('drvHornLoop', 0),
      frogs: this.country ? L('drvFrogs', 0.55, audio.amb) : null,
      birds: this.country ? L('birds', 0.05, audio.amb) : null,
    };
    audio.play('drvStart', { vol: 0.9 });
    setTimeout(() => this.snd?.engine?.set(0.2, 0.3), 850);
  }
  stopAudio(engineOff = false) {
    const S = this.snd;
    if (!S) return;
    for (const k of Object.keys(S)) { if (k === 'frogs' || k === 'birds') S[k]?.stopAll(); else S[k]?.stopAll(); }
    this.snd = null;
    if (engineOff) audio.play('engineOff', { vol: 0.9 });
  }
  countryAmbience(on) {
    const S = this.snd;
    if (!S) return;
    if (!on) { S.frogs?.stopAll(); S.birds?.stopAll(); S.frogs = S.birds = null; }
  }
  updateAudio(dt) {
    const S = this.snd, P = this.phys;
    if (!S) return;
    const v = Math.abs(P.v);
    if (S.engine) {
      const osc = S.engine.osc;
      if (osc) osc.frequency.setTargetAtTime(20 + P.rpm * 0.021 + (P.shiftT > 0 ? -4 : 0), audio.now, 0.04);
      if (S.engine.filter) S.engine.filter.frequency.setTargetAtTime(260 + P.throttle * 520 + P.rpm * 0.06, audio.now, 0.05);
      if (this.t > 0.9) S.engine.set(0.17 + P.throttle * 0.12, 0.15);
    }
    S.road?.set(Math.min(0.32, v * 0.024), 0.2);
    if (S.road?.filter) S.road.filter.frequency.setTargetAtTime(180 + v * 32, audio.now, 0.1);
    S.wind?.set(Math.min(0.08, v * v * 0.00035), 0.3);
    S.horn?.set(this.horn > 0 ? 0.9 : 0, 0.02);
    if (P.shifted) { audio.play('drvShift', { vol: 0.5 }); P.shifted = 0; }
  }

  toggleRadio() {
    const g = this.game;
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
    void g;
  }
  radioOff() {
    if (!this.radioOn) return;
    this.radioOn = false;
    radio.setStation(-1);
    radio.attach(this.env?.radioPos || null);
  }

  // ------------------------------------------------------------------ input
  readInput(dt) {
    const inp = this.game.input;
    if (this.auto) return this.autopilot(dt);
    const k = (a, b) => inp.key(a) || (b && inp.key(b));
    let steer = 0;
    if (k('KeyA', 'ArrowLeft')) steer += 1;
    if (k('KeyD', 'ArrowRight')) steer -= 1;
    return { throttle: k('KeyW', 'ArrowUp') ? 1 : 0, brake: k('KeyS', 'ArrowDown') ? 1 : 0, steer, hand: inp.key('Space') };
  }

  /** Debug / test autopilot: keep left along the road, slow for bends, wait at the crossing, park. */
  autopilot() {
    const P = this.phys, r = this.road, q = r.nearest(P.x, P.z, {});
    const inLane = r === this.laneRoad;
    const C = this.country;
    let vt = inLane ? 7 : 13.5;
    const look = Math.max(5, Math.abs(P.v) * 1.1);
    const off = inLane ? 0 : 1.35;
    // the spur by mistake: turn round on its pad (not handled: the autopilot never takes it)
    const tp = r.at(q.s + look, off, {});
    if (!inLane) {
      for (let s = q.s; s < q.s + 40; s += 4) { const kap = Math.abs(r.curvature(s, 5)); if (kap > 1e-3) vt = Math.min(vt, Math.sqrt(4.2 / kap)); }
      const X = C?.crossing;
      if (X && X.state !== 'idle' && X.state !== 'done' && q.s < C.S.crossing - 6) vt = Math.min(vt, Math.max(0, (C.S.crossing - 10.5 - q.s) * 0.55));
      for (const T of C?.trucks || []) if (T.mesh.visible && T.s > q.s && T.s - q.s < 30) vt = Math.min(vt, 7);
    } else {
      const d = Math.hypot(P.x - PARK.x, P.z - PARK.z);
      if (P.x < PARK.x + 12) vt = Math.min(vt, Math.max(0.6, d * 0.7));
      if (P.x < PARK.x + 0.3) vt = 0;
    }
    const dx = tp.x - P.x, dz = tp.z - P.z;
    const alpha = wrapA(Math.atan2(dx, dz) - P.h);
    const delta = Math.atan2(2 * 2.16 * Math.sin(alpha), Math.hypot(dx, dz));
    const steer = clamp(delta / Math.max(0.05, P.maxDelta(P.v)), -1, 1);
    const err = vt - P.v;
    return { throttle: err > 0.3 ? clamp(err * 0.6, 0, 1) : 0, brake: err < -0.5 ? clamp(-err * 0.35, 0, 1) : vt === 0 && P.v > 0.05 ? 0.6 : 0, steer, hand: false, analog: true };
  }

  // ------------------------------------------------------------------ the frame
  update(dt) {
    const g = this.game;
    if (this.state === 'off' || this.state === 'loading') { if (this.state === 'loading') this.holdCamera(); return; }
    if (this.state === 'seated') { this.updateSeated(dt); return; }
    if (this.state === 'leaving') { this.updateLeaving(dt); return; }
    // fades
    if (this.fadeT > 0) { this.fadeT = Math.max(0, this.fadeT - dt); g.cutscene?.setFade(Math.max(this.cutK, this.fadeT / this.fadeDur)); }
    const paused = !g.input.locked || g.uiOpen || g.pc?.active;
    if (paused) { this.placeCamera(0); return; }
    this.t += dt;
    if (this.skipPending) { this.skipPending = false; this.skip(); return; }
    // hold Enter (or the touch SKIP) to skip
    const holdSkip = g.input.key('Enter');
    this.skipT = holdSkip ? this.skipT + dt : Math.max(0, this.skipT - dt * 2);
    this.ui.skipBar(this.skipT > 0.05 ? this.skipT / 0.9 : null);
    if (this.skipT > 0.9) { this.skipT = 0; this.ui.skipBar(null); this.skip(); return; }
    const inp = g.input;
    if (inp.keyPressed('KeyR')) this.toggleRadio();
    if (inp.keyPressed('KeyL')) { this.lights = !this.lights; this.van.setLights(this.lights); audio.play('relay', { vol: 0.25 }); }
    this.horn = inp.key('KeyH') ? 1 : 0;
    if (this.state === 'parking') { this.updateParking(dt); return; }
    const ctl = this.readInput(dt);
    if (ctl.hand && !this.handbrake) audio.play('drvHandbrake', { vol: 0.5 });
    this.handbrake = !!ctl.hand;
    // people in front of you in the lane: brake for them
    if (this.state === 'lane') this.yieldToPeople(ctl);
    const P = this.phys;
    const x0 = P.x, z0 = P.z;
    P.step(dt, ctl);
    if (this.state === 'lane' && P.v > 7.5) P.v -= (P.v - 7.5) * Math.min(1, dt * 2); // it's a narrow lane
    this.collide(dt, ctl);
    this.applyVan(Math.hypot(P.x - x0, P.z - z0) * Math.sign(P.v || 1));
    this.progress(dt, ctl);
    this.van.setBrake(P.braking > 0.1 && P.v > 0.2 || this.handbrake);
    this.van.lamps({ hand: this.handbrake, beam: this.lights, radio: this.radioOn });
    this.arms?.update(dt, { turn: this.van.cab?.spin.rotation.z || 0, horn: this.horn });
    this.van.swing(dt, P.ax, P.alat);
    this.placeCamera(dt);
    if (this.country) {
      this.countryEnv();
      const q = this.road.nearest(P.x, P.z, {});
      this.country.update(dt, { s: q.s, d: q.d, x: P.x, z: P.z, v: P.v, vanMatrix: this.van.root.matrixWorld });
      this.effectsCountry(dt, q);
    }
    this.updateAudio(dt);
    // the controls note goes once you've driven a bit
    this.noteT += dt;
    if (this.noteT > 16 || (this.country && this.sNow > this.country.S.start + 160)) this.ui.noteAway();
    g.player.pos.set(P.x, 0, P.z);
  }

  /** Where the van is, story-wise: the monologue cues, the cut into town, the parking assist. */
  progress(dt, ctl) {
    const P = this.phys, C = this.country;
    if (C) {
      const q = C.main.nearest(P.x, P.z, {}), sp = C.spur.nearest(P.x, P.z, {});
      const onSpur = sp.dist < q.dist - 0.5;
      this.sNow = q.s;
      const S = C.S;
      if (this.t > 2.5) this.say('start', ["Grandpa's old van. It still smells of his cigarettes."]);
      if (q.s > S.start + 70) this.say('dir', ['Morio-chō. Grandpa said: left after the big tower.']);
      if (q.s > S.pylon - 150 && !onSpur) this.say('tower', ["There's the big tower. Left after it..."]);
      if (onSpur && sp.s > 24) this.say('spur', ["This doesn't look right..."]);
      if (onSpur && sp.s > C.spur.length - 16) this.say('closed', ['Road closed. He did say LEFT after the tower. Turn round.']);
      if (C.crossing.state === 'warn') this.say('xing', ['Of course. The one train an hour.']);
      if (q.s < S.start - 6 && P.v < -0.5) this.say('back', ["Town's the other way."]);
      // into the dark under the embankment: fade, then cut to the town
      const into = q.s - S.portal;
      this.cutK = clamp(into / 10, 0, 1);
      if (this.fadeT <= 0) this.game.cutscene?.setFade(this.cutK);
      if (into > 2) this.say('town', ['Into town.']);
      if (this.cutK >= 1 || q.s > S.end - 4) { this.cutK = 0; this.enterLane({ fade: 1.0 }); return; }
      // stuck against something with the throttle down: back on the road after a moment
      this.stuckT = (this.lastPen > 0.01 && Math.abs(P.v) < 0.3 && (ctl.throttle > 0.5 || ctl.brake > 0.5)) ? this.stuckT + dt : Math.max(0, this.stuckT - dt);
      if (this.stuckT > 3.5) { this.stuckT = 0; this.rescue(onSpur ? C.spur : C.main, onSpur ? sp : q); }
      return;
    }
    // the lane
    this.laneT += dt;
    const d = Math.hypot(P.x - PARK.x, P.z - PARK.z), ang = Math.abs(wrapA(P.h - PARK.heading));
    if (P.x < 16) this.say('garage', ['There it is. Gacha Garage.', "There it is. Grandpa's garage."]);
    if (P.x < 11) this.say('spot', ["His spot's right across from the shutter. The chalk marks."]);
    if (P.x < PARK.x - 5) this.say('past', ['Too far. Back up a bit.']);
    this.stillT = Math.abs(P.v) < 0.25 ? (this.stillT || 0) + dt : 0;
    if ((d < 1.5 && Math.abs(P.v) < 1.8 && ang < 0.55) || (d < 3.2 && this.stillT > 1.4 && ang < 0.8)) this.beginParking();
    this.stuckT = (this.lastPen > 0.01 && Math.abs(P.v) < 0.3 && (ctl.throttle > 0.5 || ctl.brake > 0.5)) ? this.stuckT + dt : Math.max(0, this.stuckT - dt);
    if (this.stuckT > 3.5) { this.stuckT = 0; this.rescue(this.laneRoad, this.laneRoad.nearest(P.x, P.z, {})); }
  }

  /** Back on the road, the right way round (after a short fade). */
  rescue(road, q) {
    const g = this.game;
    g.cutscene?.setFade(1);
    const toTown = road === this.laneRoad || road.name === 'main';
    const s = Math.max(2, q.s - (toTown ? 2 : -2));
    const p = road.at(s, road === this.laneRoad ? 0 : 1.35, {});
    this.phys.reset(p.x, p.z, toTown ? p.heading : p.heading + Math.PI, 0);
    this.applyVan(0);
    this.fadeIn(0.7);
    this.say('rescue', ["Okay... let's try that again."]);
  }

  // ------------------------------------------------------------------ collisions: soft road edges, things in the way
  corners() {
    const P = this.phys, fx = Math.sin(P.h), fz = Math.cos(P.h), lx = Math.cos(P.h), lz = -Math.sin(P.h);
    const out = [];
    for (const [f, l] of [[HL, HW], [HL, -HW], [-HL, HW], [-HL, -HW], [0, HW], [0, -HW], [HL, 0], [-HL, 0]]) out.push([P.x + fx * f + lx * l, P.z + fz * f + lz * l, f, l]);
    return out;
  }

  collide(dt, ctl) {
    const P = this.phys, C = this.course;
    let maxPen = 0, px = 0, pz = 0, at = null, torque = 0;
    // the road's edges (verges, kerbs, fences, paddy banks): push the deepest corner back in
    for (const c of this.corners()) {
      const r = C.push(c[0], c[1], this.q);
      if (r.pen > 0.001) {
        if (r.pen > maxPen) { maxPen = r.pen; at = c; }
        px += r.nx * r.pen; pz += r.nz * r.pen;
        const rx = c[0] - P.x, rz = c[1] - P.z;
        torque += (rz * r.nx - rx * r.nz) * r.pen;
      }
    }
    const obs = this.dynamicObstacles();
    for (const k of [-1.0, 0, 1.0]) {
      const cx = P.x + Math.sin(P.h) * k, cz = P.z + Math.cos(P.h) * k, R = 0.76;
      for (const o of obs) {
        let dx, dz, d, pen;
        if (o.box) {
          const qx = clamp(cx, o.box.minX, o.box.maxX), qz = clamp(cz, o.box.minZ, o.box.maxZ);
          dx = cx - qx; dz = cz - qz; d = Math.hypot(dx, dz); pen = R - d;
        } else { dx = cx - o.x; dz = cz - o.z; d = Math.hypot(dx, dz); pen = R + o.r - d; }
        if (pen <= 0) continue;
        if (o.kind === 'cone') { this.knockCone(dx, dz); continue; }
        const nx = d > 1e-4 ? dx / d : -Math.sin(P.h), nz = d > 1e-4 ? dz / d : -Math.cos(P.h);
        px += nx * pen; pz += nz * pen;
        if (pen > maxPen) { maxPen = pen; at = [cx - nx * R, cz - nz * R, k, 0]; }
        torque += ((cz - P.z) * nx - (cx - P.x) * nz) * pen * 0.5;
      }
    }
    this.lastPen = maxPen;
    if (maxPen <= 0) return;
    const pl = Math.hypot(px, pz), nx = px / pl, nz = pz / pl;
    const push = Math.min(maxPen, 0.6);
    P.x += nx * push; P.z += nz * push;
    // velocity into the barrier is lost (a little bounce), the rest scrapes on
    const fx = Math.sin(P.h), fz = Math.cos(P.h);
    const vx = fx * P.v, vz = fz * P.v, vn = vx * nx + vz * nz;
    if (vn < 0) {
      const impact = -vn;
      const wx = vx - nx * vn * 1.25, wz = vz - nz * vn * 1.25;
      P.v = (wx * fx + wz * fz) * (1 - Math.min(0.5, impact * 0.08));
      if (impact > 1.1 && this.bumpT <= 0) this.bump(at, impact);
      else if (Math.abs(P.v) > 2.5 && audio.canPlay('drvScrape', 0.25)) audio.play('drvScrape', { v: Math.min(1, Math.abs(P.v) / 8) });
    }
    // and the van turns to run along it
    P.h += clamp(torque * 0.35, -0.04, 0.04);
    void ctl; void dt;
  }

  dynamicObstacles() {
    const list = [];
    if (this.country) for (const o of this.country.obstacles) list.push(o);
    if (this.state === 'lane' || this.state === 'parking') {
      for (const b of this.boxes || []) list.push({ box: b, kind: 'static' });
      const M = this.marks;
      if (M?.cone && !M.knocked) list.push({ x: M.cx, z: M.cz, r: 0.18, kind: 'cone' });
    }
    return list;
  }

  bump(at, impact) {
    const g = this.game, P = this.phys;
    this.bumpT = 0.45;
    const v = Math.min(1, impact / 6);
    const pos = at ? V3(at[0], 0.35, at[1]) : V3(P.x, 0.35, P.z);
    audio.play('drvBump', { v: 0.35 + v * 0.65, vol: 1 });
    audio.play('thud', { v: 0.3 + v * 0.5, pos, vol: 0.6 });
    g.effects?.puff({ pos, count: 5 + Math.round(v * 6), colors: [0xb8a888, 0x9a8a70, 0xd0c4a8], size: 0.08 + v * 0.06, speed: 0.6 + v, up: 0.3, life: 0.9 });
    P.kick(0.25 + v * 0.6, (Math.random() - 0.5) * 0.4);
    g.player.shake = Math.max(g.player.shake, 0.2 + v * 0.5);
    if (impact > 2.5) this.say('bump' + Math.floor(this.t / 25), ['Oof. Sorry, van.', 'Easy... Grandpa would kill me.', 'That was a fence. Probably.'], false);
  }

  knockCone(dx, dz) {
    const M = this.marks;
    if (!M || M.knocked) return;
    M.knocked = true;
    M.dir = Math.atan2(-dx, -dz);
    M.tipV = 4;
    audio.play('drop', { pos: V3(M.cx, 0.3, M.cz), vol: 0.5 });
  }

  yieldToPeople(ctl) {
    const g = this.game, P = this.phys, fx = Math.sin(P.h), fz = Math.cos(P.h);
    const people = [...(g.pedestrians?.list || []), ...(g.lane?.list || [])].map((p) => p.h?.root?.position).filter(Boolean);
    let lim = Infinity;
    for (const p of people) {
      const dx = p.x - P.x, dz = p.z - P.z;
      const f = dx * fx + dz * fz, l = dx * fz - dz * fx;
      if (Math.abs(l) > 1.25) continue;
      if (P.v >= 0 && f > 0 && f < 9) lim = Math.min(lim, Math.max(0, (f - HL - 0.9) * 0.9));
      if (P.v < 0 && f < 0 && f > -7) lim = Math.min(lim, Math.max(0, (-f - HL - 0.9) * 0.9));
    }
    if (lim < Math.abs(P.v)) { ctl.throttle = 0; ctl.brake = 1; if (P.v < 0) { P.v = Math.max(P.v, -lim); } this.say('careful', ['Whoa, careful...', 'Sorry! After you.']); }
  }

  // ------------------------------------------------------------------ the van on the road
  applyVan(rolled) {
    const P = this.phys, van = this.van;
    let y = 0, slope = 0;
    if (this.country && this.road) {
      const q = this.road.nearest(P.x, P.z, {});
      y = this.road.heightAt(q.s);
      const yA = this.road.heightAt(q.s - 1.08), yB = this.road.heightAt(q.s + 1.08);
      const dir = Math.cos(P.h - Math.atan2(q.tx, q.tz)) >= 0 ? 1 : -1;
      slope = Math.atan2(-(yB - yA) * dir, 2.16);
    }
    van.place(P.x, y, P.z, P.h, slope);
    // bumps in the old asphalt (and the rails at the crossing)
    const v = Math.abs(P.v);
    const C = this.country;
    if (C && this.sNow && Math.abs(this.sNow - C.S.crossing) < 0.9 && v > 1 && !this._rail) { this._rail = true; P.kick(0.35, 0.2); audio.play('drvBump', { v: 0.25 }); }
    if (C && this.sNow && Math.abs(this.sNow - C.S.crossing) > 2) this._rail = false;
    const n = Math.sin(P.dist * 2.7) * Math.sin(P.dist * 0.83 + 1.1);
    van.lean(P.pitch + n * 0.0025 * Math.min(1, v / 6), -P.roll, P.bounce + Math.abs(n) * 0.004 * Math.min(1, v / 6));
    if (rolled) van.roll(rolled);
    const turn = -P.delta * 9.5;
    van.steer(P.delta, clamp(turn, -6, 6));
    van.gauge(P.kmh * (P.v < 0 ? 0.6 : 1));
    van.root.updateMatrixWorld(true);
  }

  // ------------------------------------------------------------------ the camera in the cab
  placeCamera(dt) {
    const g = this.game, inp = g.input, cam = g.camera, L = this.look, P = this.phys, van = this.van;
    if (inp.locked && dt > 0) {
      const s = 0.0022 * (inp.sensitivity || 1), mx = inp.mouse.dx, my = inp.mouse.dy;
      if (mx || my) L.idle = 0; else L.idle += dt;
      L.yaw = clamp(L.yaw - mx * s, -1.9, 1.9);
      L.pitch = clamp(L.pitch - my * s * (inp.invertY ? -1 : 1), -0.95, 0.5);
      // glance into the bend; drift back to the road ahead when the mouse rests
      if (L.idle > 1.3 && (Math.abs(P.v) > 1.2 || this.state === 'parking')) {
        const want = clamp(P.delta * 1.1, -0.35, 0.35) + (P.v < -0.5 ? 0 : 0);
        L.yaw += (want - L.yaw) * Math.min(1, dt * 1.6);
        L.pitch += (LOOK0 - L.pitch) * Math.min(1, dt * 1.6);
      }
    }
    const body = van.body;
    body.updateMatrixWorld(true);
    if (this.debugCam) { cam.position.copy(this.debugCam.pos); cam.lookAt(this.debugCam.look); if (this.debugCam.fov) { cam.fov = this.debugCam.fov; cam.updateProjectionMatrix(); } cam.updateMatrixWorld(true); return; }
    const eye = this._v.copy(EYE).applyMatrix4(body.matrixWorld);
    // the head rides the body, but only part of its pitch and roll
    van.root.getWorldQuaternion(this._q);
    this._q2.setFromEuler(this._e.set(body.rotation.x * 0.55, 0, body.rotation.z * 0.55, 'YXZ'));
    this._q.multiply(this._q2);
    this._q2.setFromEuler(this._e.set(L.pitch, Math.PI + L.yaw, 0, 'YXZ'));
    this._q.multiply(this._q2);
    cam.position.copy(eye);
    const sh = g.player.shake * g.player.shake;
    if (sh > 0) { cam.position.x += (Math.random() - 0.5) * sh * 0.02; cam.position.y += (Math.random() - 0.5) * sh * 0.02; }
    cam.quaternion.copy(this._q);
    const fov = g.player.baseFov + Math.min(6, (P.kmh / 55) * 5);
    if (Math.abs(cam.fov - fov) > 0.05) { cam.fov = fov; cam.updateProjectionMatrix(); }
    cam.updateMatrixWorld(true);
  }

  /** While loading (black screen) keep the camera somewhere harmless. */
  holdCamera() { }

  // ------------------------------------------------------------------ dust, petals, the shoulder
  effectsCountry(dt, q) {
    const g = this.game, P = this.phys, v = Math.abs(P.v), C = this.country;
    this.bumpT -= dt;
    // on the gravel shoulder: dust from the wheels, gravel spitting
    const off = Math.abs(q.d) > this.road.half - 0.35 && q.dist > 0 ? Math.abs(q.d) - this.road.half + 0.35 : 0;
    this.puffT -= dt;
    if (off > 0.15 && v > 2 && this.puffT <= 0) {
      this.puffT = 0.12;
      const side = Math.sign(q.d) || 1, lx = Math.cos(P.h), lz = -Math.sin(P.h);
      const p = V3(P.x - Math.sin(P.h) * 1.1 + lx * side * 0.7, 0.15, P.z - Math.cos(P.h) * 1.1 + lz * side * 0.7);
      g.effects?.puff({ pos: p, count: 2, colors: [0xc8b898, 0xb0a080], size: 0.07, speed: 0.4, up: 0.2, life: 0.8 });
      if (audio.canPlay('drvGravel', 0.18)) audio.play('drvGravel', { vol: 0.6 });
    }
    // sakura petals drifting across the road
    this.petalT -= dt;
    if (this.petalT <= 0) {
      this.petalT = 0.35;
      for (const s of C.sakura || []) {
        if (Math.hypot(s.x - P.x, s.z - P.z) > 30) continue;
        g.effects?.confetti({ pos: V3(s.x + (Math.random() - 0.5) * 3, 3.2, s.z + (Math.random() - 0.5) * 3), count: 3, petal: true, speed: 0.6, radius: 1.2 });
      }
    }
  }

  // ------------------------------------------------------------------ parking
  beginParking() {
    const P = this.phys;
    this.state = 'parking';
    this.park = { t: 0, x: P.x, z: P.z, h: P.h, dur: 0.9 + Math.hypot(P.x - PARK.x, P.z - PARK.z) * 0.45, v: P.v, done: false, handT: 0 };
    this.ui.prompt(null);
  }
  updateParking(dt) {
    const K = this.park, P = this.phys, van = this.van;
    K.t += dt;
    const k = smooth(K.t / K.dur);
    const x = K.x + (PARK.x - K.x) * k, z = K.z + (PARK.z - K.z) * k, h = K.h + wrapA(PARK.heading - K.h) * k;
    const moved = Math.hypot(x - P.x, z - P.z);
    const fwd = (x - P.x) * Math.sin(P.h) + (z - P.z) * Math.cos(P.h);
    P.v = dt > 0 ? fwd / dt : 0;
    P.x = x; P.z = z; P.h = h;
    P.delta *= Math.max(0, 1 - dt * 3);
    P.ax = -2.5 * (1 - k); P.alat = 0;
    P.suspension(dt);
    this.applyVan(moved * Math.sign(fwd || 1));
    van.setBrake(true);
    this.arms?.update(dt, { turn: van.cab?.spin.rotation.z || 0, horn: this.horn });
    van.swing(dt, P.ax, 0);
    this.placeCamera(dt);
    this.updateAudio(dt);
    if (K.t >= K.dur && !K.done) {
      K.done = true; P.v = 0;
      audio.play('drvHandbrake', { vol: 0.7 });
      this.handbrake = true;
      van.lamps({ hand: true, beam: this.lights, radio: this.radioOn });
      P.kick(0, 0.25);
    }
    this.game.player.pos.set(P.x, 0, P.z);
    if (K.done) { K.handT += dt; if (K.handT > 0.75) this.parked(false); }
  }

  /** Engine off, the van parked for good: resolve start(). */
  parked(instant) {
    const g = this.game, van = this.van;
    this.phys.reset(PARK.x, PARK.z, PARK.heading);
    van.place(PARK.x, 0, PARK.z, PARK.heading, 0);
    van.lean(0, 0, 0); van.steer(0, 0); van.gauge(0);
    van.setBrake(false); van.setLights(false);
    van.lamps({ hand: true, beam: false, radio: false });
    this.radioOff();
    this.stopAudio(true);
    this.lights = false;
    this.state = 'seated';
    this.seatT = 0;
    this.tick = { n: 0, t: 0.5 };
    this.ui.skipBar(null);
    this.ui.noteAway();
    this.touch?.seated(true);
    if (!instant) setTimeout(() => this.say('made', ['Made it. The old thing still runs.']), 700);
    g.effects?.puff({ pos: van.local(0.4, 0.25, -1.75), count: 4, color: 0x9a948a, size: 0.06, speed: 0.2, up: 0.15, life: 1.4 });
    this.cone();
    this.standByDoor();
    g.events.emit('drive:parked');
    const r = this.resolve; this.resolve = null;
    r?.();
  }

  /** Your own feet by the driver's door, facing the shutter (where a cutscene's toPlayer() or leave() ends up). */
  standByDoor() {
    const g = this.game, st = this.van.doorStep(V3());
    g.player.pos.set(st.x, 0, st.z);
    g.player.yaw = Math.atan2(-(0.85 - st.x), -(5.0 - st.z));
    g.player.pitch = -0.02;
    g.player.vel.set(0, 0, 0);
  }

  /** Put a knocked cone back up (out of the way) when you're parked. */
  cone() {
    const M = this.marks;
    if (M?.cone && M.knocked) { M.cone.rotation.set(0, 0, 0); M.cone.position.set(PARK.x - 3.0, 0, PARK.z + 0.6); }
  }

  // ------------------------------------------------------------------ parked, still in the seat
  updateSeated(dt) {
    const g = this.game, van = this.van;
    this.seatT += dt;
    if (this.fadeT > 0) { this.fadeT = Math.max(0, this.fadeT - dt); g.cutscene?.setFade(this.fadeT / this.fadeDur); }
    // the inside of the cab (clear glass, shade, your arms) only while the camera is in it
    this.syncCab();
    // a cutscene (Grandpa's meeting) takes the camera: hand it over, tidy up once it's finished
    if (g.cutscene?.active) { if (!this.handedOver) { this.handedOver = true; this.ui.show(false); this.touch?.seated(false); } return; }
    // the hot engine ticks as it cools, slower and slower (a cutscene that takes over plays its own)
    const T = this.tick;
    if (T && T.n < 12 && !this.handedOver) { T.t -= dt; if (T.t <= 0) { T.n++; T.t = 0.35 + T.n * 0.18 + Math.random() * 0.4; audio.play('engineTick', { pos: van.local(0, 0.5, 1.2), vol: 1 }); } }
    if (this.handedOver) { this.release({ keepPlayer: true }); return; }
    this.arms?.update(dt, { turn: 0, horn: 0 });
    van.swing(dt, 0, 0);
    this.placeCamera(dt);
    // nobody took over: offer to get out
    if (this.opts?.exitPrompt && this.seatT > 1.6) {
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
    if (!animate) { van.setDoor(1); this.release(); return Promise.resolve(); }
    this.state = 'leaving';
    this.leaveK = 0;
    audio.play('carDoor', { pos: van.local(-0.7, 1, 1), vol: 1 });
    this.leaveFrom = { pos: g.camera.position.clone(), q: g.camera.quaternion.clone() };
    return new Promise((res) => { this.leaveRes = res; });
  }
  updateLeaving(dt) {
    const g = this.game, van = this.van, cam = g.camera;
    this.leaveK += dt;
    const kd = smooth(this.leaveK / 0.55);
    van.setDoor(kd);
    const k = smooth((this.leaveK - 0.35) / 1.0);
    const out = van.doorStep(V3()).setY(g.player.eye);
    const lookAt = V3(0.85, 1.3, 5.0);
    const m = new THREE.Matrix4().lookAt(out, lookAt, V3(0, 1, 0));
    const qOut = new THREE.Quaternion().setFromRotationMatrix(m);
    const mid = this.leaveFrom.pos.clone().lerp(out, 0.5); mid.y = Math.min(this.leaveFrom.pos.y, out.y) - 0.18;
    const a = this.leaveFrom.pos.clone().lerp(mid, k), b = mid.clone().lerp(out, k);
    cam.position.copy(a.lerp(b, k));
    cam.quaternion.copy(this.leaveFrom.q).slerp(qOut, k);
    cam.updateMatrixWorld(true);
    this.syncCab();
    if (this.leaveK >= 1.4) { this.release(); const r = this.leaveRes; this.leaveRes = null; r?.(); }
  }

  /** Seated mode over: the player stands by the van door, facing the shutter, back in control (unless a cutscene is). */
  release({ keepPlayer = false } = {}) {
    const g = this.game, van = this.van;
    if (this.state === 'off') return;
    if (!keepPlayer) this.standByDoor();
    this.finish(false);
  }

  /** Tear down whatever is left (the zone, sounds, UI, the cab) and give the player back. */
  finish(failed) {
    const g = this.game, van = this.van;
    this.country?.dispose(); this.country = null;
    this.exitCountryEnv();
    this.stopAudio(false);
    this.radioOff();
    this.dropMarks();
    this.arms?.dispose(); this.arms = null;
    van?.cabGlass(false);
    van?.lean(0, 0, 0);
    this.ui.show(false);
    this.touch?.dispose(); this.touch = null;
    this.env = null;
    const wasSeated = this.state === 'seated' || this.state === 'leaving';
    this.state = 'off';
    // after a cutscene took over, whoever runs the scene after it owns the player and the HUD: leave them alone
    if (!this.handedOver && !g.cutscene?.active) { this.freeze(false); g.cutscene?.setFade(0); }
    this.handedOver = false; this._prompted = false; this._inCab = undefined;
    this.promise = null;
    const r = this.resolve; this.resolve = null;
    r?.();
    if (wasSeated || failed) g.events.emit('drive:end', { failed: !!failed });
  }

  // ------------------------------------------------------------------ debug
  /** Teleport along the way: a name ('start', 'farm', 'bus', 'pylon', 'junction', 'spur', 'konbini', 'crossing', 'truck', 'dip', 'tunnel', 'lane', 'park') or metres. */
  teleport(where, { v = 0 } = {}) {
    if (!this.active) return 'not driving';
    const C = this.country;
    if (where === 'lane' || where === 'park') {
      if (this.state !== 'lane') this.enterLane({ fade: 0, quiet: true });
      const p = where === 'park' ? { x: PARK.x + 7, z: PARK.z - 0.4, h: PARK.heading } : { x: LANE_IN.x, z: LANE_IN.z, h: -Math.PI / 2 };
      this.phys.reset(p.x, p.z, p.h, v); this.applyVan(0);
      return where;
    }
    if (!C) return 'in the lane';
    if (where === 'spur') { const p = C.spur.at(30, 0, {}); this.phys.reset(p.x, p.z, p.heading, v); this.applyVan(0); return 'spur'; }
    const S = C.S, map = { start: S.start, farm: S.farm1 - 30, bus: S.bus - 40, pylon: S.pylon - 60, junction: S.junction - 20, konbini: S.konbini - 10, crossing: S.crossing - 150, truck: S.farm1 + 60, dip: S.dip - 30, tunnel: S.portal - 10 };
    const s = typeof where === 'number' ? where : map[where];
    if (s === undefined) return Object.keys(map);
    this.placeOnRoad(s, 1.35, v);
    return s;
  }
}
