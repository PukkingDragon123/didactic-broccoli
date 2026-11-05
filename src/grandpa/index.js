// game.grandpa: Grandpa in person on your first day. A fresh game: he's out front of the shutter on his stool with
// Mikan, dozing in the sun while the opening plays (src/arrival/: 'arrival:start'); the engine dies across the lane, he
// wakes and shuffles over ('arrival:wake'), taps on the window and meets you in a cinematic chat
// (src/grandpa/scenes.js); then he walks you through the opening jobs himself (src/grandpa/director.js) until the
// place is clean, says goodbye at a taxi and leaves you his notebook. Afterwards he phones now and then and sends a
// postcard (src/grandpa/phone.js). Save data: game.state.grandpa (ensureState).
//
//   grandpa.present            he's in the lane today (met, not gone)
//   grandpa.meet({ opening }) -> Promise   the meeting, from the cab to the stool (Story.newGame awaits it); opening:
//                              a cutscene script played first, in the same cutscene (the arrival), so the cut into his
//                              window tap is seamless
//   grandpa.doze() / wake()    asleep on his stool (fan going slack, Mikan asleep at his feet) / awake and off to the van
//                              (on 'arrival:start' / 'arrival:wake')
//   grandpa.hideCrowd(on, r)   passers-by within r metres of the van step out of shot (and stay out) until off
//   grandpa.cardLine(stepId)   his short line for the objective card (null when he isn't here)
//   grandpa.goalOverride()     the objective while he wants you for something (the goodbye)
//   grandpa.gp                 the character (src/grandpa/Grandpa.js)   grandpa.nav (src/grandpa/nav.js)
// Events: 'grandpa:met', 'grandpa:left', 'grandpa:call' { id }.
import * as THREE from 'three';
import { ensureState } from '../game/stateExt.js';
import { Game } from '../game/Game.js';
import { propMesh } from '../world/props.js';
import { Grandpa } from './Grandpa.js';
import { Nav } from './nav.js';
import { Director } from './director.js';
import { GrandpaPhone } from './phone.js';
import { STEPS } from './data.js';
import * as scenes from './scenes.js';
import './sfx.js';
import './grandpa.css';

const DEFAULTS = { v: 1, met: false, left: false, legacy: false, calls: {}, checkins: 0, lastCall: 0, postcard: false, slaps: 0, flags: {}, anecdote: 0, leftAt: 0 };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
/** His stool out front, right of the shutter (where the bench goes once the shop reopens), and where he sits on it. */
export const STOOL = { x: 2.75, z: 5.78, rotY: -0.45 };

export class GrandpaSystem {
  constructor(game) {
    this.game = game;
    this.s = ensureState(game, 'grandpa', DEFAULTS);
    this.waiters = [];
    this.nav = new Nav(game);
    this.mode = 'off'; // 'wait' (on his stool, before you arrive) | 'scene' | 'guide' | 'gone'
    this.gp = null;
    this.stool = null;
  }

  get story() { return this.game.story; }
  get present() { return !!this.gp && this.gp.visible && this.mode !== 'gone' && this.mode !== 'off'; }

  install() {
    const g = this.game, s = this.s, st = g.state.story;
    // who's he today? An old save (already past the meeting without ever meeting him) has him gone already.
    if (!s.met && (g.story.done || st.intro)) { s.legacy = true; s.left = true; }
    this.phone = new GrandpaPhone(this);
    this.phone.install();
    if (s.left || g.story.done || g.visiting || g.mp?.isGuest) {
      this.mode = 'gone';
      // his empty stool out front and his notebook on the desk, until the shop reopens
      if (s.met && s.left && !g.visiting) { if (!g.story.done) this.buildStool(); this.placeNotebook(); }
      Game.updaters.push((gg, dt) => this.update(dt));
      return;
    }
    this.gp = new Grandpa(g);
    this.gp.id = 'grandpa';
    this.gp.gesture = (name) => this.gp.act(name, 2.4);
    this.buildStool();
    this.director = new Director(this);
    this.hookInput();
    if (!s.met) {
      // a new game: he hands you the key himself
      const H = g.held, i = H.find('key');
      if (i >= 0 && !st.shutter) H.consume(i);
      this.waitOnStool();
      g.events.on('arrival:start', () => this.doze());
      g.events.on('arrival:wake', () => this.wake());
    } else {
      // a save from the middle of day one: he's still about
      this.mode = 'guide';
      this.seatAt();
      this.director.start({ quiet: false });
    }
    Game.updaters.push((gg, dt) => this.update(dt));
  }

  // ------------------------------------------------------------------ helpers
  /** A frame-driven wait (seconds of game time). */
  wait(sec) { let t = 0; return new Promise((res) => this.waiters.push({ fn: (dt) => (t += dt) >= sec, res })); }
  until(fn) { return new Promise((res) => this.waiters.push({ fn, res })); }

  buildStool() {
    const g = this.game;
    const m = propMesh('stool', { fallbackSize: [0.36, 0.45, 0.36], fallbackColor: 0xa8743e });
    m.position.set(STOOL.x, 0, STOOL.z);
    m.rotation.y = 0.3;
    m.name = 'grandpa-stool';
    g.scene.add(m);
    this.stool = m;
    this.stoolOb = g.player.addObstacle(STOOL.x - 0.2, STOOL.x + 0.2, STOOL.z - 0.2, STOOL.z + 0.2, 'grandpaStool');
    this.stoolOb.grandpa = true; // he steps onto it himself; the nav adds it separately
    this.nav.extra.push({ minX: STOOL.x - 0.16, maxX: STOOL.x + 0.16, minZ: STOOL.z - 0.16, maxZ: STOOL.z + 0.16 });
    g.interaction.add(m, { reach: 2.2, hint: () => (this.gp?.sitting ? null : { key: '', text: "Grandpa's stool", sub: "Forty years of his backside. Best not." }), use: () => false });
  }

  removeStool() {
    const g = this.game;
    if (!this.stool) return;
    g.interaction.remove(this.stool);
    this.stool.removeFromParent();
    g.player.removeObstacle(this.stoolOb);
    this.nav.extra.length = 0;
    this.stool = null;
  }

  /** Straight onto the stool (no walking): seated, fan out. */
  seatAt() {
    const gp = this.gp, f = new THREE.Vector3(Math.sin(STOOL.rotY), 0, Math.cos(STOOL.rotY));
    gp.place(V(STOOL.x, 0, STOOL.z).addScaledVector(f, 0.08), STOOL.rotY);
    gp.sitting = true;
    gp.sitT = 1;
    gp.po.k = 1;
    gp.setPose('gp_sit');
    gp.po.fan = true;
  }

  /** Walk to the stool, turn round and sit (resolves once seated). */
  async sitOnStool() {
    const gp = this.gp;
    if (gp.sitting && gp.distTo(V(STOOL.x, 0, STOOL.z)) < 0.3) return true;
    const f = new THREE.Vector3(Math.sin(STOOL.rotY), 0, Math.cos(STOOL.rotY));
    const front = V(STOOL.x, 0, STOOL.z).addScaledVector(f, 0.42);
    const ok = await gp.goTo(front, { face: STOOL.rotY });
    if (!ok) return false;
    await this.until(() => Math.abs(Math.atan2(Math.sin(gp.yaw - STOOL.rotY), Math.cos(gp.yaw - STOOL.rotY))) < 0.25 || gp.walking);
    if (gp.walking) return false;
    const from = gp.pos.clone(), to = V(STOOL.x, 0, STOOL.z).addScaledVector(f, 0.08);
    let t = 0;
    gp.sitDown();
    await this.until((dt) => { t = Math.min(1, t + dt / 0.9); gp.pos.lerpVectors(from, to, t); return t >= 1 || !gp.sitting; });
    return gp.sitting;
  }

  waitOnStool() {
    const g = this.game;
    this.mode = 'wait';
    this.seatAt();
    this.gp.lookAt = null;
    const cat = g.street?.cat;
    if (cat && cat.wild) { cat.pos.set(STOOL.x + 0.55, 0, STOOL.z + 0.35); cat.heading = 2.6; g.street.setCatState('sit', 1e9); }
  }

  /** The opening (src/arrival/): nodding off on his stool in the sun, the fan going slack, Mikan asleep at his feet. */
  doze() {
    const g = this.game, gp = this.gp;
    if (!gp || this.s.met) return;
    if (!gp.sitting) this.seatAt();
    gp.lookAt = null;
    gp.act('doze', Infinity);
    gp.expr('sleepy', 1e6);
    const cat = g.street?.cat;
    if (cat && cat.wild) { cat.pos.set(STOOL.x + 0.5, 0, STOOL.z + 0.42); cat.heading = 2.3; g.street.setCatState('sleep', 1e9); }
  }

  /** The van's engine dies across the lane: he jolts awake, gets up and shuffles over to its window (scenes.VAN_SIDE). */
  wake() {
    const gp = this.gp;
    if (!gp || this.s.met) return;
    gp.act(null);
    gp.expr('surprised', 1.4);
    gp.lookAt = this.game.life?.van ? this.game.life.van.local(-0.3, 1.3, 0.8) : null;
    gp.goTo(V(scenes.VAN_SIDE.x, 0, scenes.VAN_SIDE.z), { speed: 0.8, direct: true, face: 0 });
  }

  // ------------------------------------------------------------------ the meeting (Story.newGame awaits this)
  async meet({ opening = null } = {}) {
    const g = this.game, sys = this;
    if (!this.gp) return;
    this.mode = 'scene';
    this.hideCrowd(true, opening ? 80 : 15); // (the opening's wide shots take in the whole lane)
    await g.cutscene.play(function* (c) { if (opening) yield* opening(c); yield* scenes.tapScene(c, sys); }, { skippable: true });
    await this.talk(scenes.meetScript(this), { leave: false });
    await g.cutscene.play((c) => scenes.storyScene(c, this), { skippable: true });
    this.hideCrowd(false);
    this.s.met = true;
    this.mode = 'guide';
    g.events.emit('grandpa:met', {});
    this.director.start();
    g.save();
  }

  /** Passers-by and the lane's people step out of shot while his scenes play (on: true hides everyone within r metres
   *  of the van and the shutter, false brings them all back). */
  hideCrowd(on, r = 15) {
    if (on) { this.hidden ||= new Set(); this.hideR = r; this.sweepCrowd(); }
    else if (this.hidden) { for (const o of this.hidden) o.visible = true; this.hidden = null; }
  }
  /** (every frame while hidden: people who wander in later are kept out of shot too) */
  sweepCrowd() {
    const g = this.game, quiet = (this.quietT = (this.quietT || 0) + 1) % 15 === 0;
    for (const p of [...(g.pedestrians?.list || []), ...(g.lane?.list || [])]) {
      const r = p.h?.root;
      if (r && r.visible && Math.hypot(r.position.x - 1.5, r.position.z - 8) < (this.hideR || 15)) { r.visible = false; this.hidden.add(r); }
      if (quiet && r && this.hidden.has(r)) g.bubbles?.clear(p.h); // (and what they were saying)
    }
  }

  /** A cinematic chat with him (src/talk/Talk.js), waiting for anything else on screen to finish first. */
  async talk(script, opts = {}) {
    const g = this.game;
    await this.until(() => !g.cutscene.active && !g.talk?.active && !g.pc?.active);
    if (!g.talk) return null;
    return g.talk.start(this.gp, script, { id: 'grandpa', name: this.gp.name, color: this.gp.color, ...opts });
  }

  // ------------------------------------------------------------------ the goodbye
  async goodbye() {
    const g = this.game;
    if (this.mode === 'gone' || this.leaving) return;
    this.leaving = true;
    this.director.stop();
    this.mode = 'scene';
    this.hideCrowd(true);
    await g.cutscene.play((c) => scenes.taxiArriveScene(c, this), { skippable: true });
    await this.talk(scenes.byeScript(this), { leave: false });
    await g.cutscene.play((c) => scenes.taxiLeaveScene(c, this), { skippable: true });
    this.hideCrowd(false);
    this.leave();
    // his notebook, read in your hands
    setTimeout(() => g.life?.notes?.open('book'), 400);
  }

  /** Gone for good (the taxi took him): the notebook stays on the desk, the notes carry on. */
  leave() {
    const g = this.game, s = this.s;
    s.left = true;
    s.leftAt = g.state.playTime || 0;
    this.mode = 'gone';
    this.director?.stop();
    if (this.gp) { this.gp.setVisible(false); g.interaction.remove(this.gp.hit); }
    this.placeNotebook();
    g.events.emit('grandpa:left', {});
    g.guide?.pulse();
    g.save();
  }

  /** His notebook on the computer desk, for good: click to read (a note in src/life/notes.js). */
  placeNotebook() {
    const g = this.game, D = g.garage.pcDesk;
    if (this.book || !g.life?.notes) return;
    const m = propMesh('grandpa_notebook', { fallbackSize: [0.15, 0.03, 0.2], fallbackColor: 0x5a3420 });
    m.position.set(D.x - 0.12, D.h + 0.002, D.z + 0.12);
    m.rotation.y = -Math.PI / 2 + 0.25;
    g.scene.add(m);
    g.interaction.add(m, { reach: 2.4, hint: () => (g.held.busy ? null : { key: 'LMB', text: "Read Grandpa's notebook", sub: 'Everything, written down twice' }), use: () => { g.life.notes.open('book'); return false; } });
    this.book = m;
  }

  /** The objective while he wants you for something. */
  goalOverride() {
    if (this.mode === 'guide' && this.director?.byeWaiting) {
      const gp = this.gp;
      return { id: 'gp:bye', icon: 'heart', text: 'Grandpa wants you out front', sub: '', say: 'Kiddo! Out front a minute.', at: () => gp.head(new THREE.Vector3()).add(new THREE.Vector3(0, 0.3, 0)) };
    }
    return null;
  }

  /** His line for the objective card while he's here. */
  cardLine(id) {
    if (this.mode !== 'guide' || !this.gp) return null;
    return STEPS[id]?.card || null;
  }

  // ------------------------------------------------------------------ input hooks: clicking him, slapping him, dropping things
  hookInput() {
    const g = this.game, gp = this.gp;
    g.interaction.add(gp.hit, {
      reach: 2.6,
      hint: () => (!gp.visible || this.mode !== 'guide' || g.talk?.active ? null : { key: 'LMB', text: 'Talk to Grandpa', sub: 'RMB: slap (why would you)' }),
      use: () => { if (this.mode === 'guide') this.director.chat(); return false; },
      alt: () => { g.fp?.slap?.(); },
      noHighlight: true,
    });
    g.events.on('slap', (e) => { if (e?.human === gp.h) this.director?.onSlap(); });
    const H = g.held;
    if (!H._gpHooked) {
      H._gpHooked = true;
      const drop = H.drop.bind(H);
      H.drop = (...a) => { const it = H.item; const r = drop(...a); if (it && this.mode === 'guide') this.director?.onDrop(it); return r; };
    }
  }

  // ------------------------------------------------------------------ per frame
  update(dt) {
    for (let i = this.waiters.length - 1; i >= 0; i--) { const w = this.waiters[i]; if (w.fn(dt)) { this.waiters.splice(i, 1); w.res(true); } }
    this.phone?.update(dt);
    if (this.hidden) this.sweepCrowd();
    if (this.stool && this.game.story.done && !this.game.cutscene.active) this.removeStool();
    if (!this.gp || this.mode === 'gone') return;
    if (this.mode === 'guide') this.director.update(dt);
    // the van door, the shop sign: his stool goes when the shop opens
    this.gp.update(dt);
  }
}
