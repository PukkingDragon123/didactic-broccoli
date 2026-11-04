// Day one in person: Grandpa follows the opening's to-do list (game.story.step(), the 'story:step' event) and stands
// where each job is, explains it in his own words (pointing, or showing you first: he thumps the breaker), reacts when
// it's done (a dry joke, a thumbs up), nudges you when you dawdle or wander off, and has something to say when you
// slap him, drop things, pet or pick up the cat, stare at him or run about. Out-of-the-garage jobs (Mikawa-ya, the
// garbage station) he supervises from his stool out front, fanning himself. Once the place is clean (everything up to
// the computer note), he calls you out front to say goodbye (src/grandpa/index.js goodbye()).
import * as THREE from 'three';
import { Story } from '../game/Story.js';
import { audio } from '../core/audio.js';
import { STEPS, REACT, ANECDOTES, BACK, pick } from './data.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const OUTSIDE = new Set(['letter', 'shutter', 'shop', 'trashout']);
const BYE_AT = Story.ORDER.indexOf('read_pc');

export class Director {
  constructor(sys) {
    this.sys = sys;
    this.game = sys.game;
    this.active = false;
    this.run = null;
    this.step = null;
    this.cool = {}; // comment cooldowns (game time)
    this.idleT = 0;
    this.nudgeN = 0;
    this.farT = 0;
    this.stareT = 0;
    this.byeWaiting = false;
    this.game.events.on('story:step', ({ id, prev }) => { if (this.active) this.onStep(id, prev); });
  }

  get gp() { return this.sys.gp; }
  get s() { return this.sys.s; }

  start({ quiet = true } = {}) {
    this.active = true;
    this.step = this.game.story.step();
    this.quiet = quiet; // he's just said what the first job is
    this.begin(this.step, null);
  }

  stop() { this.active = false; this.cancel(); this.byeWaiting = false; }
  cancel() { if (this.run) this.run.dead = true; this.run = null; }

  /** Is the scene free for him to talk (no cutscene, chat, note in your hands, computer)? */
  free() {
    const g = this.game;
    return !g.cutscene.active && !g.talk?.active && !g.life?.notes?.isOpen && !g.pc?.active && !g.held.reading;
  }
  /** Say a line once the scene's free (resolves after it's been read). */
  async line(text, run, opts = {}) {
    await this.sys.until(() => run.dead || this.free());
    if (run.dead) return false;
    await this.gp.say(text, { wait: true, ...opts });
    return !run.dead;
  }

  onStep(id, prev) {
    if (id === this.step) return;
    this.step = id;
    this.begin(id, prev);
  }

  begin(id, prev) {
    this.cancel();
    const run = this.run = { dead: false, id };
    this.idleT = 0; this.nudgeN = 0; this.farT = 0; this.explained = false;
    this.plan(id, prev, run).catch((e) => console.error('grandpa', e));
  }

  async plan(id, prev, run) {
    const gp = this.gp, sys = this.sys, story = this.game.story;
    // the job just finished: his reaction first
    const P = prev && STEPS[prev];
    if (P?.done && story.isDone(prev)) {
      await this.sys.until(() => run.dead || this.free());
      if (run.dead) return;
      gp.lookAt = 'player';
      if (P.doneAct) gp.act(P.doneAct, P.doneAct === 'fan' ? 3 : 2.2);
      gp.expr('happy', 2.5);
      for (const l of P.done) if (!(await this.line(l, run))) return;
    }
    if (Story.ORDER.indexOf(id) >= BYE_AT || id === 'ready') { this.handoff(run); return; }
    const S = STEPS[id];
    if (!S) return;
    // over to where the job is (or his stool for the ones out in the lane)
    if (S.sit) {
      if (!(await sys.sitOnStool()) || run.dead) return;
    } else if (S.at) {
      const spot = sys.nav.nearestFree(V(S.at[0], 0, S.at[1])) || V(S.at[0], 0, S.at[1]);
      const f = V(...S.face);
      const ok = await gp.goTo(spot, { face: Math.atan2(f.x - spot.x, f.z - spot.z) });
      if (run.dead) return;
      if (!ok) { await sys.wait(0.5); if (run.dead) return; }
    }
    gp.lookAt = 'player';
    // wait for you to come within earshot (he won't shout the whole explanation across the lane)
    let t = 0;
    await sys.until((dt) => run.dead || (gp.playerDist < 7 && this.free()) || (t += dt) > 14);
    if (run.dead) return;
    if (this.quiet) { this.quiet = false; this.explained = true; return; }
    // show you first
    if (S.demo && !this.s.flags['demo_' + id]) {
      this.s.flags['demo_' + id] = true;
      if (!(await this.line(S.say[0], run))) return;
      const at = sys.nav.nearestFree(V(S.demo.at[0], 0, S.demo.at[1]));
      const f = V(...S.face);
      await gp.goTo(at, { face: Math.atan2(f.x - at.x, f.z - at.z) });
      if (run.dead) return;
      await sys.wait(0.5);
      gp.lookAt = f;
      gp.act(S.demo.act, 2.0);
      for (const d of [0.55, 1.45]) sys.wait(d).then(() => { if (!run.dead) { audio.play('thud', { pos: f, vol: 0.6 }); this.game.player.shake = Math.max(this.game.player.shake || 0, 0.03); } });
      await sys.wait(2.0);
      if (run.dead) return;
      gp.lookAt = 'player';
      for (const l of S.say.slice(1)) if (!(await this.line(l, run))) return;
      if (!(await this.line('Like that.', run))) return;
      const spot = sys.nav.nearestFree(V(S.at[0], 0, S.at[1]));
      gp.goTo(spot, { face: Math.atan2(f.x - spot.x, f.z - spot.z) });
    } else {
      for (let i = 0; i < S.say.length; i++) {
        if (i === 0 && S.act) gp.act(S.act, 2.6, V(...S.face));
        if (!(await this.line(S.say[i], run))) return;
      }
    }
    this.explained = true;
    gp.lookAt = 'player';
  }

  // ------------------------------------------------------------------ the goodbye: out front, calling you over
  async handoff(run) {
    const gp = this.gp, sys = this.sys;
    if (gp.sitting) await gp.standUp();
    await gp.goTo(V(1.5, 0, 6.15), { face: -0.6 });
    if (run.dead) return;
    gp.lookAt = 'player';
    this.byeWaiting = true;
    this.byeT = 0;
    this.byeCall = 0;
  }

  updateBye(dt) {
    const g = this.game, gp = this.gp;
    this.byeT += dt;
    if (gp.walking) return;
    if (this.byeT > this.byeCall) {
      this.byeCall = this.byeT + 22;
      if (this.free()) {
        gp.act('beckon', 2.4);
        gp.say(pick(['Kiddo! Out front a minute.', 'Kiddo! Come here a minute.', "Oi! Out front. I haven't got all day. Literally."]), { style: 'shout' });
        if (gp.playerDist > 14) g.news('Grandpa is calling you', '"Kiddo! Out front a minute."', 5000);
      }
    }
    if (gp.playerDist < 4.4 && this.free() && !g.held.busy) { this.byeWaiting = false; this.sys.goodbye(); }
  }

  // ------------------------------------------------------------------ chatter: comments, nudges
  /** A remark (rate-limited per kind, never over himself or a scene). */
  remark(kind, lines, cool = 30, opts = {}) {
    const t = this.game.time;
    if ((this.cool[kind] || -1e9) > t || !this.free() || (this.gp.talking && !opts.force) || !this.gp.visible) return false;
    if (opts.force) this.game.bubbles?.clear(this.gp.h);
    this.cool[kind] = t + cool;
    if (opts.act) this.gp.act(opts.act, opts.actDur || 2);
    if (opts.expr) this.gp.expr(opts.expr, 2.5);
    this.gp.say(Array.isArray(lines) ? pick(lines) : lines, { style: opts.style || 'say' });
    return true;
  }

  onSlap() {
    const s = this.s, g = this.game, gp = this.gp;
    s.slaps = (s.slaps || 0) + 1;
    this.cool.slap = 0;
    gp.expr('angry', 3);
    g.effects?.mark?.({ sprite: 'anger', pos: gp.headTop(V(0, 0, 0)).add(V(0.12, 0.05, 0)), color: 0xd83a2a, size: 0.05, life: 1.4 });
    this.sys.wait(0.35).then(() => this.remark('slap', s.slaps > 2 ? REACT.slapAgain : REACT.slap, 1, { act: 'shake', actDur: 1.6, style: 'shout', force: true }));
  }

  onDrop(it) {
    if (this.gp.playerDist > 6) return;
    if (it?.data?.bag || it?.data?.junk) return; // dropping rubbish bags is part of the job
    this.remark('drop', REACT.drop, 40, { act: 'shrug', actDur: 1.4 });
  }

  blocked() { this.remark('blocked', REACT.blocked, 12); }

  /** Click him: a little chat (what's next, the old days, his back). */
  async chat() {
    const sys = this.sys, gp = this.gp, s = this.s;
    if (this.chatting || !this.free()) return;
    this.chatting = true;
    const id = this.step;
    const S = STEPS[id];
    await sys.talk(async (t) => {
      await t.say(pick(['Hm?', 'What is it, kiddo?', 'Yes? I was resting my eyes.']));
      const i = await t.choose(["What's next?", 'Tell me about the old days.', "How's your back?", 'Never mind.']);
      if (i === 0) {
        if (S) { if (S.act) gp.act(S.act, 2.6, V(...S.face)); for (const l of S.say) await t.say(l); }
        else await t.say("Carry on, kiddo. You're doing fine.");
      } else if (i === 1) {
        const a = ANECDOTES[(s.anecdote || 0) % ANECDOTES.length];
        s.anecdote = (s.anecdote || 0) + 1;
        for (const l of a) await t.say(l);
      } else if (i === 2) { gp.act('back', 2.2); await t.say(pick(BACK)); }
      else await t.say(pick(['Hmph.', 'Carry on, then.', "Then why'd you poke me?"]));
    });
    this.chatting = false;
    this.idleT = 0;
  }

  update(dt) {
    if (!this.active) return;
    const g = this.game, gp = this.gp, P = g.player, st = g.street;
    if (this.byeWaiting) { this.updateBye(dt); return; }
    const S = STEPS[this.step];
    const busy = !this.free() || gp.walking;
    // nudges when you dawdle (near enough to hear him)
    if (this.explained && S && !busy) {
      if (gp.playerDist < 14) this.idleT += dt;
      const at = [40, 55, 70, 90][Math.min(3, this.nudgeN)];
      if (this.idleT > at && S.nudge?.length) {
        this.idleT = 0;
        this.nudgeN++;
        const l = S.nudge[(this.nudgeN - 1) % S.nudge.length];
        if (S.act && !gp.sitting) gp.act(S.act, 2.4, V(...S.face));
        else if (S.act) gp.act('point', 2.4, V(...S.face));
        gp.say(this.nudgeN > 2 && Math.random() < 0.4 ? pick(REACT.idle) : l);
      }
    }
    // little things he does while he waits: fans himself, rubs his back, touches his cap, coughs
    if (this.explained && !busy && !gp.talking && !gp.po.act && !gp.sitting) {
      this.fidgetT = (this.fidgetT ?? 10) - dt;
      if (this.fidgetT < 0) {
        this.fidgetT = 12 + Math.random() * 14;
        const f = pick(['fan', 'fan', 'back', 'cap', 'scratch', 'cough']);
        if (f === 'cough') { audio.play('cough', { pos: gp.pos.clone().setY(1.4), vol: 0.45 }); gp.act('back', 1.4); } else gp.act(f, f === 'fan' ? 4.5 : 2.2);
      }
    }
    // wandering off while the job's in the garage
    const away = Math.hypot(P.pos.x, P.pos.z - 2) > 15;
    if (S && !OUTSIDE.has(this.step) && away && this.explained) {
      this.farT += dt;
      if (this.farT > 14) {
        this.farT = -30;
        g.news('Grandpa, from the garage', `"${pick(REACT.far)} ${S.nudge?.[0] || ''}"`, 5500);
        gp.say(pick(REACT.far), { style: 'shout' });
      }
    } else if (this.farT > 0) this.farT = 0;
    else this.farT = Math.min(0, this.farT + dt);
    // the cat
    if (st?.petting && gp.playerDist < 6) this.remark('pet', REACT.pet, 90, { expr: 'happy' });
    if (st?.cat?.held && gp.playerDist < 6) this.remark('hold', REACT.hold, 120);
    // staring at him
    const toGp = gp.head(V(0, 0, 0)).sub(g.camera.position);
    const dist = toGp.length();
    const fwd = g.camera.getWorldDirection(V(0, 0, 0));
    if (dist < 3 && toGp.normalize().dot(fwd) > 0.985 && !busy && !gp.talking) { this.stareT += dt; if (this.stareT > 4) { this.stareT = 0; this.remark('stare', REACT.stare, 120); } } else this.stareT = 0;
    // running about in the garage
    if (P.vel && Math.hypot(P.vel.x, P.vel.z) > 3.2 && gp.playerDist < 3.5 && Math.abs(P.pos.x) < 4 && P.pos.z < 5) this.remark('run', REACT.run, 150);
    // the radio, milk in your hands
    if (g.story.flags.radio && !this.s.flags.radio) { this.s.flags.radio = true; if (gp.playerDist < 10) this.remark('radio', REACT.radio, 1, { act: 'nod' }); }
    if (g.held.holding('milk') && !this.s.flags.milk && gp.playerDist < 6) { this.s.flags.milk = true; this.remark('milk', REACT.milk, 1); }
  }
}
