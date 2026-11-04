// game.grandpa: Grandpa in person on your first day. A fresh game: he's out front of the shutter on his stool with
// Mikan, waves your van into its spot (on 'drive:lane'), taps on the window once you're parked, and meets you in a
// cinematic chat (src/grandpa/scenes.js); then he walks you through the opening jobs himself (src/grandpa/director.js)
// until the place is clean, says goodbye at a taxi and leaves you his notebook. Afterwards he phones now and then and
// sends a postcard (src/grandpa/phone.js). Save data: game.state.grandpa (ensureState).
//
//   grandpa.present            he's in the lane today (met, not gone)
//   grandpa.meet() -> Promise  the meeting, from the cab to the stool (Story.newGame awaits it)
//   grandpa.onLane()           put him out front waving the van in (on 'drive:lane'; the fallback arrival emits it too)
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
/** Where he stands to wave your van in. */
export const MARSHAL = { x: 2.2, z: 6.7 };

export class GrandpaSystem {
  constructor(game) {
    this.game = game;
    this.s = ensureState(game, 'grandpa', DEFAULTS);
    this.waiters = [];
    this.nav = new Nav(game);
    this.mode = 'off'; // 'wait' (on his stool, before you arrive) | 'marshal' | 'scene' | 'guide' | 'gone'
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
      g.events.on('drive:lane', () => this.onLane());
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

  /** The van is in the lane: on his feet, waving it in. */
  onLane() {
    const g = this.game;
    if (!this.gp || this.s.met || this.mode === 'marshal') return;
    this.mode = 'marshal';
    const gp = this.gp;
    gp.standUp().then(() => gp.goTo(V(MARSHAL.x, 0, MARSHAL.z), { speed: 0.7 }));
    this.marshalT = 0;
    this.marshalSaid = 0;
    void g;
  }

  /** Per frame while he's waving the van in: beckon while it's coming, palm up when it's there. */
  updateMarshal(dt) {
    const g = this.game, gp = this.gp, van = g.life?.van;
    if (!van) return;
    const p = van.root.position, d = Math.hypot(p.x - 3.4, p.z - 12.5);
    gp.lookAt = V(p.x, 1.2, p.z);
    this.marshalT += dt;
    if (gp.walking || gp.sitting) return;
    gp.faceTo(p);
    const want = d > 6 ? 'wave' : d > 0.6 ? 'beckon' : 'stop';
    if (gp.po.act !== want && (this.marshalT > 0.6 || want === 'stop')) { gp.act(want, Infinity); this.marshalT = 0; }
    const lines = [[30, 'Here! Over here!'], [8, 'Bit more... bit more...'], [1.2, 'Stop! STOP! ...Good.']];
    for (let i = this.marshalSaid; i < lines.length; i++) if (d < lines[i][0]) { gp.say(lines[i][1], { style: i === 2 ? 'shout' : 'say', dur: 2.6 }); this.marshalSaid = i + 1; break; }
  }

  // ------------------------------------------------------------------ the meeting (Story.newGame awaits this)
  async meet() {
    const g = this.game;
    if (!this.gp) return;
    this.mode = 'scene';
    this.hideCrowd(true);
    await g.cutscene.play((c) => scenes.tapScene(c, this), { skippable: true });
    await this.talk(scenes.meetScript(this), { leave: false });
    await g.cutscene.play((c) => scenes.storyScene(c, this), { skippable: true });
    this.hideCrowd(false);
    this.s.met = true;
    this.mode = 'guide';
    g.events.emit('grandpa:met', {});
    this.director.start();
    g.save();
  }

  /** Passers-by and the lane's people step out of shot while his scenes play (on: true hides, false brings back). */
  hideCrowd(on) {
    if (on) { this.hidden ||= new Set(); this.sweepCrowd(); }
    else if (this.hidden) { for (const r of this.hidden) r.visible = true; this.hidden = null; }
  }
  /** (every frame while hidden: people who wander in later are kept out of shot too) */
  sweepCrowd() {
    const g = this.game, quiet = (this.quietT = (this.quietT || 0) + 1) % 15 === 0;
    for (const p of [...(g.pedestrians?.list || []), ...(g.lane?.list || [])]) {
      const r = p.h?.root;
      if (r && r.visible && Math.hypot(r.position.x - 1.5, r.position.z - 8) < 15) { r.visible = false; this.hidden.add(r); }
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
    if (this.mode === 'marshal') this.updateMarshal(dt);
    if (this.mode === 'guide') this.director.update(dt);
    // the van door, the shop sign: his stool goes when the shop opens
    this.gp.update(dt);
  }
}
