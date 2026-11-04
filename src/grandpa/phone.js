// After he's gone: Grandpa on the phone, and a postcard. His number is in the phone book (Phone > Grandpa (Atami)),
// and he rings the desk phone now and then: the evening he arrives, when Mikawa-san tells him a machine came, the
// morning after the reopening, then every few days to check in. Answering at the computer stands you up and the call
// plays as a cinematic chat by the beige desk telephone (his lines float over it; you answer with floating choices),
// with the transcript kept in the Phone window too. A few days after the reopening a postcard comes by e-mail (his
// sister's grandson types; a pixel-art postcard of the sea).
import { audio } from '../core/audio.js';
import { draw5 } from '../gfx/font5x7.js';
import { gpVoice } from './Grandpa.js';
import { phoneMesh } from './props.js';
import { CALLS, PHONE, POSTCARD, TTS, VOICE } from './data.js';

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

  // ------------------------------------------------------------------ when he rings, and the postcard
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
    if (!s.postcard && day >= 4 && hour >= 8) { this.postcard(); return; }
    if ((s.checkins || 0) < CALLS.checkin.length && day >= (s.lastCall || 1) + 3 && hour >= 10.5 && hour < 18 && Math.random() < 0.02) this.ring('checkin');
  }

  postcard() {
    const g = this.game, s = this.s, os = g.os;
    s.postcard = true;
    if (!os?.mail) return;
    let img = '';
    try { img = postcardArt(); } catch { img = ''; }
    const body = POSTCARD.body.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]).replace(/\n/g, '<br>');
    os.mail.send({ from: 'Grandpa', addr: 'takumi.k@atami.ne.jp', subject: POSTCARD.subject, html: true, body: `${img ? `<p><img class="gp-postcard" src="${img}" width="352" height="224" alt="A postcard of the sea at Atami" style="image-rendering:pixelated;display:block;border:2px solid #2a2622"></p>` : ''}<p>${body}</p>` });
    g.save();
  }
}

const pickFrom = (a) => a[Math.floor(Math.random() * a.length)];

/** A 176 x 112 pixel-art postcard: the bay at dusk, the island, the hot-spring steam, ATAMI in the corner. */
export function postcardArt() {
  const W = 176, H = 112;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const px = (x, y, col) => { c.fillStyle = col; c.fillRect(x, y, 1, 1); };
  const rect = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  // sky in stepped bands
  ['#f2c27a', '#f0b070', '#e89a6a', '#d88470', '#b87478'].forEach((col, i) => rect(0, i * 9, W, 9, col));
  rect(0, 45, W, 12, '#9a7088');
  // the sun, low, cut by the horizon
  for (let y = -9; y <= 9; y++) for (let x = -9; x <= 9; x++) if (x * x + y * y <= 81 && 50 + y < 62) px(120 + x, 50 + y, y < -4 ? '#fff0c0' : '#ffe0a0');
  // hills on the left with the town, the island on the horizon
  for (let x = 0; x < 70; x++) { const h = Math.round(22 + Math.sin(x * 0.09) * 6 + Math.sin(x * 0.31) * 2 - x * 0.18); rect(x, 62 - h, 1, h, '#4a5a6a'); }
  for (let x = 0; x < 60; x++) { const h = Math.round(10 + Math.sin(x * 0.2 + 1) * 3 - x * 0.1); rect(x, 62 - h, 1, h, '#3a4858'); }
  for (let i = 0; i < 26; i++) { const x = 4 + ((i * 37) % 56), y = 46 + ((i * 13) % 12); rect(x, y, 2, 2, i % 3 ? '#ffd890' : '#f0f0e0'); }
  for (let x = 136; x < 160; x++) { const h = Math.round(4 - Math.abs(x - 147) * 0.3); if (h > 0) rect(x, 62 - h, 1, h, '#5a5a74'); }
  // the sea: stepped rows of wave dashes, the sun's road on the water
  ['#5a6a8a', '#4a5a7a', '#3e4e6c', '#34425e', '#2a3650'].forEach((col, i) => rect(0, 62 + i * 10, W, 10, col));
  for (let y = 63; y < H; y += 3) for (let x = (y * 7) % 11; x < W; x += 11) rect(x, y, 4, 1, y < 80 ? '#8a9ab8' : '#6a7a98');
  for (let y = 63; y < 92; y += 2) { const w = Math.max(2, 14 - (y - 63) * 0.4); rect(Math.round(120 - w / 2 + Math.sin(y) * 2), y, Math.round(w), 1, '#ffd890'); }
  // the hot-spring mark and its steam
  rect(16, 82, 22, 14, '#e8dcc0'); rect(17, 83, 20, 12, '#c84a3a');
  for (let k = 0; k < 3; k++) for (let y = 0; y < 7; y++) px(21 + k * 6 + (y % 3 === 1 ? 1 : 0), 84 + y, '#f4ece0');
  rect(20, 91, 14, 2, '#f4ece0');
  // ATAMI, and a postmark circle
  c.fillStyle = '#2a2622';
  draw5(c, 'GREETINGS FROM', 6, 4, { s: 1, col: '#3a2a2a' });
  draw5(c, 'ATAMI', 6, 14, { s: 2, col: '#7a2a2a' });
  for (let a = 0; a < 40; a++) { const t = a / 40 * Math.PI * 2; px(Math.round(156 + Math.cos(t) * 12), Math.round(18 + Math.sin(t) * 12), '#5a3a4a'); }
  draw5(c, '99', 151, 15, { s: 1, col: '#5a3a4a' });
  const out = document.createElement('canvas');
  out.width = W * 2; out.height = H * 2;
  const o = out.getContext('2d');
  o.imageSmoothingEnabled = false;
  o.drawImage(cv, 0, 0, W * 2, H * 2);
  return out.toDataURL('image/png');
}
