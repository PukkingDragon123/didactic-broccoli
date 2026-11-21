// game.unlocks: the things that come with play rather than with the shop level (the table: src/data/unlocks.js APPS),
// so far the Capsule 98 programs on the garage PC. A new game starts with two (the Navigator and Pichat); the rest
// install one by one as the opening goes on and the shop finds its feet. Old saves keep every program they had.
//   unlocks.has(id)            'app:<id>' (or a bare program id): is it there yet?
//   unlocks.grant(id, why)     unlock it now (an event did it: the first real mail, say)
//   unlocks.daysOpen           in-game days since the reopening (0 on the day itself, -1 before)
// Events: 'unlock' { id, kind, name, why } (once per id; the PC turns it into a "new program installed" moment).
// Save data: game.state.unlocks { v, got: [ids], openDay }.
import { ensureState } from '../game/stateExt.js';
import { APPS, START_APPS, SYSTEM_APPS, appRule } from '../data/unlocks.js';

const appId = (id) => (id.startsWith('app:') ? id : `app:${id}`);

export class Unlocks {
  constructor(game) {
    this.game = game;
    const st = game.state, had = !!st.unlocks;
    // a save from before this existed (or one already past the opening) keeps everything it could use
    const fresh = !had && !st.story?.complete && !st.story?.intro && !st.os?.flags?.seeded && !st.grandpa?.met;
    this.s = ensureState(game, 'unlocks', { v: 1, got: [], openDay: null, legacy: false });
    if (!had) {
      if (fresh) this.s.got = START_APPS.map(appId);
      else this.s.legacy = true;
    }
    this.got = new Set(this.s.got);
    this.t = 0;
  }

  get daysOpen() {
    const d = this.s.openDay;
    return d == null ? -1 : (this.game.clock?.day ?? d) - d;
  }

  /** Is it unlocked? Ids without a play rule (or system pieces) always are. */
  has(id) {
    if (!id) return true;
    const bare = id.startsWith('app:') ? id.slice(4) : id;
    if (SYSTEM_APPS.has(bare)) return true;
    if (this.s.legacy) return true;
    return this.got.has(appId(bare));
  }

  grant(id, why = '') {
    const k = appId(id.startsWith('app:') ? id.slice(4) : id);
    if (this.got.has(k) || this.s.legacy) return false;
    this.got.add(k);
    this.s.got.push(k);
    this.game.events.emit('unlock', { id: k, kind: 'app', name: k.slice(4), why });
    this.game.save?.();
    return true;
  }

  /** Does a condition hold right now? */
  met(rule) {
    const g = this.game, S = g.story;
    if (!rule) return true;
    const open = !!S?.done;
    if (rule.open && !open) return false;
    if (rule.days && this.daysOpen < rule.days) return false;
    if (rule.left && !g.state.grandpa?.left) return false;
    if (rule.level && (g.progress?.level ?? 1) < rule.level) return false;
    if (rule.customers && (g.state.stats?.customers || 0) < rule.customers) return false;
    if (rule.step || rule.done) {
      if (!S) return false;
      if (!open) {
        const order = S.constructor.ORDER || [];
        const cur = order.indexOf(S.step());
        if (rule.step && (cur < 0 ? S.step() !== 'ready' : cur < order.indexOf(rule.step))) return false;
        if (rule.done && !S.isDone(rule.done)) return false;
      }
    }
    return true;
  }

  /** Programs the OS knows about (ids of registered apps), so unknown ones get APP_DEFAULT. */
  known() { return this.game.os ? [...this.game.os.apps.keys()] : Object.keys(APPS); }

  update(dt) {
    const g = this.game;
    this.t -= dt;
    if (this.t > 0 || this.s.legacy || g.visiting) return;
    this.t = 1;
    if (g.story?.done && this.s.openDay == null) this.s.openDay = g.clock?.day ?? 1;
    for (const id of this.known()) {
      if (SYSTEM_APPS.has(id) || this.got.has(appId(id))) continue;
      if (this.met(appRule(id))) this.grant(id, 'progress');
    }
  }
}
