// game.life: everyday life around the shop (phase 2). Owns Grandpa's notes, your van, the opening's chores (with
// src/game/Story.js), the OPEN sign, the trash loop with the garbage truck, the side jobs on the notice board and the
// daily open / close routine. Save data: game.state.life (ensureState).
//
//   life.signOpen            the OPEN sign shows OPEN (game.sim.isOpen requires it)
//   life.dirt() -> 0..1      mess the shop quality should know about: an overflowing trash can, shells on the floor
//   life.power               the main breaker is on
//   life.notes / van / chores / sign / trash / jobs / routine   (src/life/*.js)
// Events: 'noteRead' { id, first }, 'trashOut' { item }, 'signFlip' { open }, 'jobDone' { id, pay }, 'power' { on },
//         'garbageCollected' { bags }, 'shopClosed' { day }.
import * as THREE from 'three';
import { Game } from '../game/Game.js';
import { ensureState } from '../game/stateExt.js';
import { audio } from '../core/audio.js';
import './sfx.js';
import './tools.js';
import { GRIP_AS } from './tools.js';
import { Notes } from './notes.js';
import { Van } from './van.js';
import { Chores } from './chores.js';
import { OpenSign } from './sign.js';
import { Trash } from './trash.js';
import { Jobs } from './jobs.js';
import { Routine } from './routine.js';
import './life.css';

const DEFAULTS = {
  v: 1,
  notes: [],
  power: false,
  sign: { found: false, hung: false, open: false },
  trash: { level: 0, spilled: 0 },
  station: { n: 0 },
  lastPickup: 0,
  jobs: { done: {}, last: {}, lastT: {}, earned: 0, count: 0 },
  closedDay: 0,
};

export class Life {
  constructor(game) {
    this.game = game;
    this.s = ensureState(game, 'life', DEFAULTS);
    for (const k of ['sign', 'trash', 'station', 'jobs']) for (const [kk, vv] of Object.entries(DEFAULTS[k])) if (this.s[k][kk] === undefined) this.s[k][kk] = structuredClone(vv);
    // a save from before this system whose opening was already done: the power's on and the sign hangs, open
    if (game.story?.done && !this.s.sign.hung) Object.assign(this.s.sign, { found: true, hung: true, open: true });
    if (game.story?.done || game.state.story?.shutter && game.state.lightsOn) this.s.power = true;
  }

  get power() { return !!this.s.power; }
  /** The street ATM (src/money/atm.js, when it's there), for the objective marker. */
  atmPos() { const a = this.game.atm?.root; return a ? a.localToWorld(new THREE.Vector3(0, 1.3, 0.2)) : null; }
  get signOpen() { return !!(this.s.sign.hung && this.s.sign.open); }

  install() {
    const g = this.game;
    this.notes = new Notes(g, this);
    this.van = new Van(g);
    this.van.park();
    this.van.setDoor(g.story?.done || g.state.story?.intro ? 0 : 1);
    this.trash = new Trash(g, this);
    this.sign = new OpenSign(g, this);
    this.chores = new Chores(g, this);
    this.jobs = new Jobs(g, this);
    this.routine = new Routine(g, this);
    this.hookHands();
    this.hookPower();
    // a job that was running when the game was last saved is gone: so are its tools
    const H = g.held;
    for (let i = 0; i < H.slots.length; i++) { const it = H.slots[i]; if (it?.kind === 'tool' && it.data?.job && !this.jobs.active) H.consume(i); }
    g.story?.setup?.(this);
    Game.updaters.push((gg, dt) => this.update(dt));
  }

  /** Mess the shop's quality (game.sim.shopQuality cleanliness) should count, 0..1. */
  dirt() {
    let d = this.trash?.dirt() || 0;
    const sh = this.game.shells?.list;
    if (sh) { let n = 0; for (const e of sh) { const p = e.obj.position; if (Math.abs(p.x) < 4 && Math.abs(p.z) < 5) n++; } d += Math.min(0.4, n * 0.04); }
    return Math.min(1, d);
  }

  // ------------------------------------------------------------------ hooks into other systems (instance-level only)
  /** The hands hold Grandpa's notes up to read, and grip the new tools like things they already know. */
  hookHands() {
    const fp = this.game.fp;
    if (!fp || fp._lifeHooked) return;
    fp._lifeHooked = true;
    const choose = fp.choose.bind(fp), grip = fp.gripPose.bind(fp);
    fp.choose = (H, W) => {
      if (!fp.act && this.notes.sheet.parent === this.game.held.anchor) { const r = this.notes.handPose(fp, H, W); if (r) return r; }
      return choose(H, W);
    };
    fp.gripPose = (obj, kind, data, pose, H, W) => {
      const m = kind === 'tool' ? GRIP_AS[data?.id] : null;
      if (m) return grip(obj, m.kind || kind, m.tool ? { id: m.tool } : data, pose, H, W);
      return grip(obj, kind, data, pose, H, W);
    };
  }

  /** No power until the main breaker is up: the light switch just clicks. */
  hookPower() {
    const g = this.game, G = g.garage;
    const set = G.setLights.bind(G);
    G.setLights = (on) => set(on && this.power);
    if (!this.power) set(false);
    const h = G.lightSwitch.userData.handler;
    if (h && !h._life) {
      h._life = true;
      const hint = h.hint, use = h.use;
      h.hint = (held, hit) => (this.power ? hint(held, hit) : { key: 'LMB', text: 'Lights on', sub: 'Click... nothing. No power?' });
      h.use = (held, hit) => {
        if (this.power) return use(held, hit);
        audio.play('relay', { pos: G.lightSwitch.getWorldPosition(new THREE.Vector3()), vol: 0.7 });
        g.tip('nopower', 'No power', "Grandpa's note: the main breaker first");
        return false;
      };
    }
  }

  setPower(on) {
    const g = this.game;
    this.s.power = on;
    if (on) { g.garage.setLights(g.state.lightsOn === true); }
    else g.garage.setLights(false);
    g.ambience?.hum?.set(on ? 0.012 : 0, 1.2);
    g.events.emit('power', { on });
  }

  // ------------------------------------------------------------------ per frame
  update(dt) {
    this.notes.update(dt);
    this.chores.update(dt);
    this.sign.update(dt);
    this.trash.update(dt);
    this.jobs.update(dt);
    this.routine.update(dt);
  }

  /** Hint / click for the life tools in your hands (Held -> Story.toolHint -> here). */
  toolHint(it) {
    const id = it.data.id;
    return this.jobs.toolHint?.(it) || this.chores.toolHint?.(it) || ({
      rag: { key: '', text: it.data.wet ? 'Wet rag' : 'Dry rag', sub: it.data.wet ? 'Hold click on the dusty counter' : 'Wet it at the sink first' },
      bin_bags: { key: '', text: 'Bin bags', sub: 'Hold click on a heap of rubbish' },
      coin_float: { key: '', text: 'Change float', sub: 'Into the cash tray on the counter' },
      junk_box: { key: '', text: 'Box of old parts', sub: 'Out to the garbage station, left of the shop' },
      cardboard: { key: '', text: 'Cardboard', sub: 'Out to the garbage station, left of the shop' },
      open_sign: { key: '', text: 'OPEN sign', sub: 'It hangs on the hook outside, right of the shutter' },
      poop_bag_full: { key: '', text: 'Full poop bag', sub: 'Bin it: the garbage station or the shop trash can' },
    })[id] || null;
  }
}
