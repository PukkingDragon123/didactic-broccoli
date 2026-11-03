// The shop's daily routine once it has reopened. Mornings: unlock and roll up the shutter, flip the sign to OPEN.
// At closing time (game.sim's close hour) the day isn't over until you've closed up: flip the sign to CLOSED, then pull
// the shutter down from outside with the hooked pole and lock it; that leads into the day summary and the sunset
// fly-out (game.sim.endDay). Doze off without closing up and the day ends late on its own.
//   routine.goal() -> objective for the card (or null)   routine.closing (waiting for you to close up)
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { GARAGE } from '../world/Garage.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const LATE = 3; // hours after closing time when the day ends without you

export class Routine {
  constructor(game, life) {
    this.game = game;
    this.life = life;
    this.closing = false;
    this.roll = null;
    this.hookShutter();
    this.hookEndDay();
  }

  get done() { return !!this.game.story?.done; }
  get locked() { return !!this.life.s.locked; }
  outside() { return this.game.player.pos.z > GARAGE.maxZ + 0.1; }

  // ------------------------------------------------------------------ the shutter (the story owns it until the reopening)
  hookShutter() {
    const g = this.game, G = g.garage;
    g.interaction.remove(G.shutterMesh);
    g.interaction.add(G.shutterMesh, {
      reach: 2.6,
      hint: (held) => (this.done ? this.hint() : g.story.shutterHint(held)),
      use: (held) => (this.done ? this.use() : this.life.notes.isRead('letter') ? g.story.useShutter(held) : false),
      hold: {
        canStart: () => this.done && !!this.holdDir(),
        start: () => { this.roll = { dir: this.holdDir(), t: 0, snd: false }; },
        update: (dt) => this.rollShutter(dt),
        done: () => !this.roll,
        end: () => { this.roll = null; },
      },
    });
  }

  /** +1 roll it up, -1 pull it down, 0 nothing to do from here. */
  holdDir() {
    const k = this.game.garage.shutterOpen;
    if (k < 0.98 && !this.locked) return 1;
    if (k > 0.02 && this.outside()) return -1;
    return 0;
  }

  hint() {
    const g = this.game, k = g.garage.shutterOpen, out = this.outside();
    if (k < 0.02 && this.locked) {
      if (!out) return { key: '', text: 'The shutter is locked', sub: 'From outside' };
      return g.held.holding('key') ? { key: 'LMB', text: 'Unlock the shutter' } : { key: '', text: 'Locked for the night', sub: `Hold the key${this.pick('key')} and click` };
    }
    if (k < 0.98) return { key: 'Hold LMB', text: 'Roll the shutter up', sub: this.roll ? `${Math.round(k * 100)}%` : 'Good morning!' };
    if (!out) return { key: '', text: 'The shutter', sub: 'Pull it down from outside, with the hooked pole' };
    return { key: 'Hold LMB', text: 'Pull the shutter down', sub: this.life.signOpen ? 'Flip the sign to CLOSED too' : 'With the hooked pole' };
  }

  pick(id) { const i = this.game.held.find(id); return i < 0 ? '' : ` (press ${i + 1})`; }

  use() {
    const g = this.game;
    if (g.garage.shutterOpen < 0.02 && this.locked) {
      if (!g.held.holding('key') || !this.outside()) return false;
      // the key in the padlock at the bottom bar
      audio.play('keyTurn', { pos: V(0, 0.5, GARAGE.maxZ), vol: 1 });
      if (g.fp?.live) g.fp.play('key', 1.0, { obj: g.held.item.obj });
      this.life.s.locked = false;
      g.save();
      return false;
    }
    return this.holdDir() ? undefined : false;
  }

  rollShutter(dt) {
    const g = this.game, G = g.garage, r = this.roll;
    if (!r) return;
    r.t += dt;
    if (!r.snd) { r.snd = true; audio.play('shutterRoll', { pos: V(0, 2, GARAGE.maxZ), dur: 2.4, vol: 1 }); }
    const k = Math.max(0, Math.min(1, G.shutterOpen + r.dir * dt / 2.0));
    G.setShutter(k);
    g.held.swing = 0.3;
    if ((r.dir > 0 && k >= 0.999) || (r.dir < 0 && k <= 0.001)) {
      this.roll = null;
      if (r.dir < 0) {
        // down with a clang; the padlock clicks shut
        audio.play('thud', { pos: V(0, 0.2, GARAGE.maxZ), v: 0.8 });
        g.tweens.wait(0.4, () => audio.play('keyTurn', { pos: V(0, 0.4, GARAGE.maxZ), vol: 0.8 }));
        this.life.s.locked = true;
        g.player.shake = Math.max(g.player.shake, 0.15);
      }
      g.save();
      this.checkClosed();
    }
  }

  // ------------------------------------------------------------------ closing time
  hookEndDay() {
    const sim = this.game.sim;
    if (!sim || sim._lifeHooked) return;
    sim._lifeHooked = true;
    const end = sim.endDay.bind(sim);
    this.endDay = end;
    sim.endDay = (reason = 'close') => {
      if (reason === 'close' && !this.game.visiting && !this.closedUp()) {
        // not until you've closed up
        if (!this.closing) {
          this.closing = true;
          this.game.news('Closing time!', 'Flip the sign to CLOSED and pull the shutter down', 7000);
          audio.play('townChime', { vol: 0.5 });
        }
        return null;
      }
      this.closing = false;
      this.game.events.emit('shopClosed', { day: this.game.clock?.day });
      return end(reason);
    };
    this.game.events.on('signFlip', () => this.checkClosed());
  }

  closedUp() { return !this.life.signOpen && this.game.garage.shutterOpen < 0.05; }

  checkClosed() {
    if (this.closing && this.closedUp()) this.game.tweens.wait(0.8, () => { if (this.closing && this.closedUp()) this.game.sim.endDay('close'); });
  }

  update() {
    const g = this.game, c = g.clock;
    if (!this.closing || !c || g.cutscene.active) return;
    // too late: you nod off with the lights on, the day ends without you
    if (c.hours >= (g.sim?.hours?.close ?? 19) + LATE || c.hours < 5) {
      this.life.sign.flip(false, { quiet: true });
      g.garage.setShutter(0);
      this.life.s.locked = true;
      this.closing = false;
      g.news('You dozed off at the counter...', 'The day ended without closing up properly', 6000);
      this.endDay?.('late');
    }
  }

  /** What the daily routine wants from you now (objective card). */
  goal() {
    const g = this.game, c = g.clock, sign = this.life.sign, G = g.garage;
    if (!this.done || g.visiting || !c) return null;
    const signAt = () => sign.board.getWorldPosition(V(0, 0, 0));
    const shutterAt = () => V(0, 1.2, GARAGE.maxZ + 0.05);
    if (this.closing) {
      if (this.life.signOpen) return { id: 'close:sign', icon: 'open_sign', text: 'Closing time: flip the sign', sub: 'To CLOSED, on the hook right of the shutter', at: signAt };
      return { id: 'close:shutter', icon: 'key', text: 'Pull the shutter down', sub: this.outside() ? 'Hold click on it: the hooked pole does the rest' : 'From outside', at: shutterAt };
    }
    const open = g.sim?.hours?.open ?? 9, close = g.sim?.hours?.close ?? 19;
    if (c.hours >= open - 1.5 && c.hours < close - 0.25) {
      if (G.shutterOpen < 0.9) return { id: 'open:shutter', icon: 'key', text: 'Open up the shop', sub: this.locked ? 'Unlock the shutter and roll it up' : 'Roll the shutter up', at: shutterAt };
      if (!this.life.signOpen && c.hours >= open - 0.5) return { id: 'open:sign', icon: 'open_sign', text: 'Flip the sign to OPEN', sub: 'Customers can come in', at: signAt };
    }
    return null;
  }
}
