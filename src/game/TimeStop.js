// The old pocket watch (an affectionate nod to a certain bizarre adventure): click it and time stops.
// A negative-colour shockwave sweeps out from the centre of the screen, the world drains to grey and freezes
// (people, pigeons, trains, the cat, capsules in mid-air) while you can still walk around; the clock ticks the
// seconds away, then everything lurches back into motion. The watch then needs a minute to wind back up.
//   game.timeStop.start()   .frozen (Game.update skips the world while true)   .ready
import { audio } from '../core/audio.js';
import { menace } from '../ui/menacing.js';

const DUR = 5, COOL = 60;

export class TimeStop {
  constructor(game) {
    this.game = game;
    this.t = 0; this.cool = 0; this.active = false; this.ticked = 0;
    const ring = this.ring = document.createElement('div');
    ring.id = 'tsring';
    document.body.appendChild(ring);
  }

  get frozen() { return this.active && this.t > 0.35; }
  get ready() { return !this.active && this.cool <= 0; }

  start() {
    const g = this.game;
    if (!this.ready || g.cutscene.active) { if (!this.active) g.news('The watch is still winding back up', `${Math.ceil(this.cool)} s`); return false; }
    this.active = true; this.t = 0; this.ticked = 0;
    this.pulse();
    audio.play('timestop');
    menace({ kind: 'do', dur: 1.8 });
    g.state.flags && (g.state.flags.timeStops = (g.state.flags.timeStops || 0) + 1);
    return true;
  }

  /** The expanding negative-colour sphere. */
  pulse() {
    const r = this.ring;
    r.classList.remove('go'); void r.offsetWidth; r.classList.add('go');
  }

  update(dt) {
    if (!this.active) { this.cool = Math.max(0, this.cool - dt); return; }
    this.t += dt;
    if (this.t > 0.35) document.body.classList.add('timestop');
    // one tick per frozen second, louder as it runs out
    const s = Math.floor(this.t - 0.35);
    if (s > this.ticked && this.t < DUR) { this.ticked = s; audio.play('clockTick', { vol: 0.5 + s * 0.12 }); }
    if (this.t >= DUR) {
      this.active = false; this.cool = COOL;
      document.body.classList.remove('timestop');
      this.pulse();
      audio.play('timestop', { resume: true });
    }
  }
}
