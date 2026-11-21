// After he's gone: Grandpa on the phone. His number is in the phone book (Phone > Grandpa (Atami)),
// and he rings the desk phone now and then: the evening he arrives, when Mikawa-san tells him a machine came, the
// morning after the reopening, then every few days to check in. Answering at the computer stands you up and the call
// plays as a cinematic chat by the beige desk telephone (his lines float over it; you answer with floating choices),
// with the transcript kept in the Phone window too. (He doesn't write: no letters, no mail.)
import { audio } from '../core/audio.js';
import { gpVoice } from './Grandpa.js';
import { phoneMesh } from './props.js';
import { CALLS, PHONE, TTS, VOICE } from './data.js';

const SPOT = { x: 3.78, z: -3.32 }; // on the computer desk, by the front edge

export class GrandpaPhone {
  constructor(sys) {
    this.sys = sys;
    this.game = sys.game;
    this.pending = null; // { id, t, tries } a call he's trying to make
    this.wait = 0;
  }
  get s() { return this.sys.s; }

  install() {
    const g = this.game, os = g.os;
    // the desk telephone
    const D = g.garage.pcDesk;
    const m = this.obj = phoneMesh();
    m.position.set(SPOT.x, D.h + 0.002, SPOT.z);
    m.rotation.y = -Math.PI / 2 - 0.35;
    m.name = 'desk-phone';
    g.scene.add(m);
    g.interaction.add(m, { reach: 2.2, hint: () => ({ key: '', text: 'The desk telephone', sub: 'It rings through the computer (Phone)' }), use: () => false });
    if (!os?.phone) return;
    os.phone.register(PHONE, { name: 'Grandpa (Atami)', icon: 'heart', voice: { base: VOICE.base, duty: VOICE.duty }, about: "Fumiko's house, by the sea", onCall: (call) => this.transcript(call, pickFrom(CALLS.dialled)) });
  }

  /** He rings (the desk phone, through the computer). */
  ring(id) {
    const os = this.game.os;
    if (!os?.phone) return false;
    if (!os.installed?.('phone')) this.game.unlocks?.grant('phone', 'call');
    const p = this.pending = { id, t: 0, tries: (this.pending?.id === id ? this.pending.tries : 0) + 1, answered: false };
    os.phone.ring({ number: PHONE, name: 'Grandpa', onCall: (call) => { p.answered = true; return this.answer(call, id); } });
    this.game.events.emit('grandpa:call', { id });
    return true;
  }

  script(id) {
    if (id === 'checkin') return CALLS.checkin[this.s.checkins % CALLS.checkin.length];
    return CALLS[id];
  }

  /** You picked up: the call as a cinematic chat (or, when that can't happen, the transcript in the Phone window). */
  answer(call, id) {
    const g = this.game, s = this.s;
    s.calls[id] = true;
    if (id === 'checkin') s.checkins = (s.checkins || 0) + 1;
    s.lastCall = g.clock?.day || 0;
    this.pending = null;
    g.save();
    const steps = this.script(id);
    if (!g.talk || !g.pc) return this.transcript(call, steps);
    if (g.pc.active) g.pc.exit(); // (inside the click: the pointer can lock again)
    return this.cinematic(call, steps);
  }

  /** The plain version: lines and choices in the Phone window. */
  async transcript(call, steps) {
    for (const st of steps) {
      if (call.ended) return;
      if (typeof st === 'string') await call.say(st);
      else if (st.ask) {
        const v = await call.ask('', st.ask.map(([label], i) => ({ label, value: i })));
        if (v === null || v === undefined) return;
        await call.say(st.ask[v][1]);
      }
    }
  }

  async cinematic(call, steps) {
    const g = this.game, sys = this.sys;
    await sys.until(() => !g.pc.active && !g.cutscene.active && !g.talk.active);
    // the transcript keeps up in the Phone window (typed in the background)
    let q = Promise.resolve();
    const log = (text, who) => { q = q.then(() => (call.ended ? null : call.say(text, who))); };
    const who = { name: 'Grandpa (phone)', anchor: this.obj, headY: 0.42, color: '#e8c070', tts: TTS, voice: gpVoice(0.8), noTurn: true };
    audio.play('hookUp', { vol: 0.6 });
    await g.talk.start(who, async (t) => {
      const me = t.session.me.h;
      me.gesture('gp_handset');
      for (const st of steps) {
        if (typeof st === 'string') { log(st); await t.say(st); }
        else if (st.ask) {
          const i = await t.choose(st.ask.map(([label]) => label));
          if (i < 0) break;
          log(st.ask[i][0], 'You');
          log(st.ask[i][1]);
          await t.say(st.ask[i][1]);
        }
      }
      await t.wait(0.4);
      me.clearGesture();
    }, { leave: true });
    audio.play('hookDown', { vol: 0.7 });
    await q;
    call.hangup();
  }

  // ------------------------------------------------------------------ when he rings
  update(dt) {
    const g = this.game, s = this.s, story = g.story;
    if (!g.os?.phone) return;
    if (g.cutscene.active || g.talk?.active) return;
    this.wait -= dt;
    // a ring that nobody answered: he tries again in a couple of minutes (three times)
    const p = this.pending;
    if (p) {
      p.t += dt;
      if (!p.answered && !p.retry && p.t > 24) {
        if (p.tries >= 3) { s.calls[p.id] = 'missed'; this.pending = null; } else { p.retry = true; p.t = -120; }
      }
      if (p.retry && p.t > 0) this.ring(p.id);
      return;
    }
    if (this.wait > 0) return;
    this.wait = 3;
    const day = g.clock?.day || 1, hour = g.clock?.hours ?? 12;
    if (s.met && s.left && !s.calls.arrived && (g.state.playTime || 0) - (s.leftAt || 0) > 150) { this.ring('arrived'); return; }
    if (s.met && s.left && !s.calls.machine && story.isDone('buymachine') && (this.machineT = (this.machineT || 0) + 3) > 45) { this.ring('machine'); return; }
    if (!story.done || !s.met) return; // (an old save that never met him: just his number in the phone book)
    if (!s.calls.opened && day >= 2 && hour >= 9.4 && hour < 20) { this.ring('opened'); return; }
    if ((s.checkins || 0) < CALLS.checkin.length && day >= (s.lastCall || 1) + 3 && hour >= 10.5 && hour < 18 && Math.random() < 0.02) this.ring('checkin');
  }
}

const pickFrom = (a) => a[Math.floor(Math.random() * a.length)];
