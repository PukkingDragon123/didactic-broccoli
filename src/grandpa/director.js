// Day one in person, and strict about it: Grandpa follows the opening's to-do list (game.story.step(), the
// 'story:step' event), walks to where each job is and calls you over (he leads, you follow), explains it in his own
// words (pointing, or showing you first: he thumps the breaker), reacts when it's done, and keeps you to it:
//   - wander off while there's work and he shouts after you; keep going and he comes and fetches you back (a quick
//     fade: you're stood in front of him, being told off)
//   - try to jump ahead (the computer before the garage is clean, an odd job off the board) and he stops you
//   - dawdle and the nudges get sharper
// He also has something to say when you slap him, drop things, pet or pick up the cat, stare at him or run about.
// Out-of-the-garage jobs (Mikawa-ya, the garbage station) he supervises from his stool out front. Once the garage is
// clean and you've sat down at the computer, he calls you out front to say goodbye (src/grandpa/index.js goodbye()).
// Nothing here can strand you: the zone you're kept to always includes the current job, a fetch puts you somewhere
// free next to him, and if the tin money ran out before Mikawa-ya he hands you some of his own.
import * as THREE from 'three';
import { Story } from '../game/Story.js';
import { audio } from '../core/audio.js';
import { STEPS, REACT, ANECDOTES, BACK, SCOLD, pick } from './data.js';
import { SUPPLIES } from '../data/supplies.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const OUTSIDE = new Set(['shutter', 'shop', 'trashout']);
const BYE_AT = Story.ORDER.indexOf('job');
const PC_AT = Story.ORDER.indexOf('pc');
const GARAGE_C = { x: 0.3, z: 3.2, r: 9.5 }; // the garage and the lane in front of it
const MIKAWAYA = { x: -11.5, z: 15.6 }, STATION = { x: -6.6, z: 5.8 }, FRONT = { x: 0.6, z: 6.6 };
const NEED = { milk: 'milk', 'a broom': 'broom', 'a fluorescent tube': 'tube' };

/** Distance from p to the segment a-b (xz). */
function segDist(p, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, L = dx * dx + dz * dz;
  const t = L ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / L)) : 0;
  return Math.hypot(p.x - (a.x + dx * t), p.z - (a.z + dz * t));
}

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
    this.awayT = 0; // seconds you've been outside the zone
    this.callT = 0;
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
    this.hook();
    this.begin(this.step, null);
  }

  stop() { this.active = false; this.cancel(); this.byeWaiting = false; }
  cancel() { if (this.run) this.run.dead = true; this.run = null; }

  /** Is the scene free for him to talk (no cutscene, chat, computer, nothing in your hands being read)? */
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
    this.idleT = 0; this.nudgeN = 0; this.awayT = 0; this.callT = 0; this.explained = false; this.arrived = false;
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
      if (!ok) { gp.place(spot, Math.atan2(f.x - spot.x, f.z - spot.z)); await sys.wait(0.3); if (run.dead) return; }
    }
    this.arrived = true;
    gp.lookAt = 'player';
    // he calls you over and waits until you're with him (he won't explain it across the lane)
    let t = 0;
    await sys.until((dt) => {
      if (run.dead) return true;
      if (gp.playerDist < (S.sit ? 7 : 5) && this.free()) return true;
      t += dt;
      if (t > 3 && this.free() && !gp.talking && (this.callT -= dt) <= 0) {
        this.callT = 9;
        gp.act('beckon', 2.2);
        gp.say(pick(REACT.calling), { style: 'shout' });
      }
      return t > 45;
    });
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
      if (!(await this.line('Like that. Now you.', run))) return;
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
    const gp = this.gp;
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
      this.byeCall = this.byeT + 18;
      if (this.free()) {
        gp.act('beckon', 2.4);
        gp.say(pick(['Kiddo! Out front a minute.', 'Kiddo! Come here.', 'Out front, kiddo. My taxi is coming.']), { style: 'shout' });
        if (gp.playerDist > 14) g.news('Grandpa is calling you', '"Kiddo! Out front a minute."', 5000);
      }
    }
    if (gp.playerDist < 4.4 && this.free() && !g.held.busy) { this.byeWaiting = false; this.sys.goodbye(); }
  }

  // ------------------------------------------------------------------ keeping you to it
  /** Can you be here right now? The garage and the lane in front, plus the way to and from the current errand. */
  inZone(p = this.game.player.pos) {
    if (Math.hypot(p.x - GARAGE_C.x, p.z - GARAGE_C.z) < GARAGE_C.r) return true;
    const id = this.step;
    if (id === 'shop') return segDist(p, FRONT, MIKAWAYA) < 5 || Math.hypot(p.x - MIKAWAYA.x, p.z - MIKAWAYA.z) < 7;
    if (id === 'trashout') return segDist(p, FRONT, STATION) < 4.5 || Math.hypot(p.x - STATION.x, p.z - STATION.z) < 5;
    return false;
  }

  /** Where to stand you when he fetches you back: free floor in front of him. */
  fetchSpot() {
    const gp = this.gp, sys = this.sys;
    const f = V(Math.sin(gp.yaw), 0, Math.cos(gp.yaw));
    const want = gp.pos.clone().addScaledVector(f, 1.3);
    const spot = sys.nav.nearestFree(want) || sys.nav.nearestFree(V(FRONT.x, 0, FRONT.z)) || V(FRONT.x, 0, FRONT.z);
    return spot.setY(0);
  }

  /** You kept walking: a quick fade, and you're stood in front of him getting told off. */
  fetch() {
    const g = this.game, gp = this.gp, P = g.player;
    this.awayT = -6;
    this.s.hauls = (this.s.hauls || 0) + 1;
    const n = this.s.hauls;
    const to = this.fetchSpot();
    g.cutscene.play(function* (c) {
      yield c.fade(1, 0.3);
      P.pos.set(to.x, 0, to.z);
      P.vel?.set?.(0, 0, 0);
      P.yaw = Math.atan2(-(gp.pos.x - to.x), -(gp.pos.z - to.z));
      P.pitch = -0.05;
      yield c.toPlayer(0);
      yield c.fade(0, 0.35);
    }, { skippable: false, letterbox: false }).then(() => {
      gp.lookAt = 'player';
      gp.expr('angry', 3.5);
      gp.act(n > 2 ? 'shake' : 'point', 2, n > 2 ? null : V(...(STEPS[this.step]?.face || [0, 1, 0])));
      gp.say(SCOLD.haul[Math.min(SCOLD.haul.length - 1, n - 1)], { style: 'shout' });
      this.idleT = 0;
    });
  }

  updateLeash(dt) {
    const g = this.game, gp = this.gp;
    if (!this.run || !this.free() || g.held.busy || g.uiOpen) return;
    if (this.inZone()) { if (this.awayT > 0) this.awayT = 0; else this.awayT = Math.min(0, this.awayT + dt); return; }
    const was = this.awayT;
    this.awayT += dt;
    if (was <= 0 && this.awayT > 0) {
      gp.expr('angry', 2.5);
      gp.act('beckon', 2.2);
      const line = pick(SCOLD.away);
      gp.say(line, { style: 'shout' });
      g.news('Grandpa', `"${line}"`, 4500);
    }
    // keep going and he fetches you (sooner the further you go)
    const far = Math.hypot(g.player.pos.x - GARAGE_C.x, g.player.pos.z - GARAGE_C.z) - GARAGE_C.r;
    if (this.awayT > 6 || (this.awayT > 1.5 && far > 9)) this.fetch();
  }

  /** Jumping ahead: the computer before the place is clean, odd jobs before he's done with you. */
  hook() {
    if (this._hooked) return;
    this._hooked = true;
    const g = this.game;
    const refuse = (kind) => {
      const gp = this.gp;
      if (!gp?.visible) return;
      this.game.bubbles?.clear(gp.h);
      gp.expr('angry', 2.5);
      gp.act('no', 1.6);
      const line = pick(SCOLD.early[kind]);
      gp.say(line, { style: 'shout' });
      g.news('Grandpa', `"${line}"`, 4000);
    };
    const pc = g.pc;
    if (pc?.enter) {
      const enter = pc.enter.bind(pc);
      pc.enter = (...a) => {
        if (this.active && !this.byeWaiting && Story.ORDER.indexOf(g.story.step()) < PC_AT && Story.ORDER.indexOf(g.story.step()) >= 0) { refuse('pc'); return false; }
        return enter(...a);
      };
    }
    const jobs = g.life?.jobs;
    if (jobs?.take) {
      const take = jobs.take.bind(jobs);
      jobs.take = (...a) => {
        if (this.active && this.sys.mode === 'guide') { refuse('board'); return false; }
        return take(...a);
      };
    }
  }

  /** The tin money's gone and Mikawa-ya still has things you need: he makes it up (so the opening can't stall). */
  updateMoney() {
    const g = this.game, story = g.story;
    if (this.step !== 'shop' || this.s.flags.gaveMoney || !this.free()) return;
    const need = story.shopping().reduce((a, n) => a + (SUPPLIES.find((x) => x.id === NEED[n])?.price || 600), 0);
    if (!need || story.totalMoney() >= need) return;
    this.s.flags.gaveMoney = true;
    const add = Math.ceil((need - story.totalMoney() + 200) / 100) * 100;
    g.addMoney(add, false, 'From Grandpa');
    this.gp.expr('sad', 2.5);
    this.remark('money', REACT.money, 1, { force: true, act: 'give', actDur: 1.6 });
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
      await t.say(pick(['Hm?', 'What is it, kiddo?', 'Yes?']));
      const i = await t.choose(["What's next?", 'Tell me about the old days.', "How's your back?", 'Never mind.']);
      if (i === 0) {
        if (S) { if (S.act) gp.act(S.act, 2.6, V(...S.face)); for (const l of S.say) await t.say(l); }
        else await t.say("Carry on, kiddo. You're doing fine.");
      } else if (i === 1) {
        const a = ANECDOTES[(s.anecdote || 0) % ANECDOTES.length];
        s.anecdote = (s.anecdote || 0) + 1;
        for (const l of a) await t.say(l);
        await t.say('Right. Back to work.');
      } else if (i === 2) { gp.act('back', 2.2); await t.say(pick(BACK)); }
      else await t.say(pick(['Then get on with it.', 'Back to work, then.']));
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
    this.updateLeash(dt);
    this.updateMoney();
    // nudges when you dawdle (near enough to hear him): sooner than before, and sharper each time
    if (this.explained && S && !busy) {
      if (gp.playerDist < 14) this.idleT += dt;
      const at = [28, 38, 48, 60][Math.min(3, this.nudgeN)];
      if (this.idleT > at && S.nudge?.length) {
        this.idleT = 0;
        this.nudgeN++;
        const cross = this.nudgeN > 2;
        const l = cross ? SCOLD.idle[(this.nudgeN - 3) % SCOLD.idle.length] : S.nudge[(this.nudgeN - 1) % S.nudge.length];
        if (S.act && !gp.sitting) gp.act(S.act, 2.4, V(...S.face));
        else if (S.act) gp.act('point', 2.4, V(...S.face));
        if (cross) gp.expr('angry', 2.5);
        gp.say(l, { style: cross ? 'shout' : 'say' });
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
    // the cat
    if (st?.petting && gp.playerDist < 6) this.remark('pet', REACT.pet, 90, { expr: 'happy' });
    if (st?.cat?.held && gp.playerDist < 6) this.remark('hold', REACT.hold, 120);
    // staring at him
    const toGp = gp.head(V(0, 0, 0)).sub(g.camera.position);
    const dist = toGp.length();
    const fwd = g.camera.getWorldDirection(V(0, 0, 0));
    if (dist < 3 && toGp.normalize().dot(fwd) > 0.985 && !busy && !gp.talking) { this.stareT += dt; if (this.stareT > 5) { this.stareT = 0; this.remark('stare', REACT.stare, 120); } } else this.stareT = 0;
    // running about in the garage
    if (P.vel && Math.hypot(P.vel.x, P.vel.z) > 3.2 && gp.playerDist < 3.5 && Math.abs(P.pos.x) < 4 && P.pos.z < 5) this.remark('run', REACT.run, 150);
    // the radio, milk in your hands
    if (g.story.flags.radio && !this.s.flags.radio) { this.s.flags.radio = true; if (gp.playerDist < 10) this.remark('radio', REACT.radio, 1, { act: 'nod' }); }
    if (g.held.holding('milk') && !this.s.flags.milk && gp.playerDist < 6) { this.s.flags.milk = true; this.remark('milk', REACT.milk, 1); }
  }
}
