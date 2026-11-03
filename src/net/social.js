// Playing together: typed chat floating over the speaker, emotes (the bizarre poses!), slapping a friend, picking a
// friend's pocket (sneak up behind them, E) and the session's rap sheet (who slapped and stole what), which the
// police (src/net/police.js) read when someone calls 110 about a friend.
//   chat    'chat' { x }              -> everyone: 'chat' { id, x }
//   emotes  'emo' { e }               -> everyone: 'emo' { id, e }
//   slap    'slap' { to }             -> everyone: 'slapped' { by, to }   (the one slapped gets shaken and knocked back)
//   steal   'steal' { to }            -> victim: 'rob' { by, pct | exact }  -> host: 'robbed' { by, amount }
//                                      -> thief: 'loot' { from, amount, back }     (slap the thief within a minute to
//                                         get it back: the host sends the thief a 'rob' with exact)
//   rap     host -> everyone: 'rap' { sheet: { id: { slaps, thefts, stolen, fines, calls } } }
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { talk } from '../people/voice.js';
import { menace } from '../ui/menacing.js';
import { BIZARRE } from '../people/bizarre.js';

export const EMOTES = [
  ['pose_point', 'Menacing point'], ['pose_lean', 'Dramatic lean'], ['pose_cross', 'Crossed arms'],
  ['dab', 'Dab'], ['flex', 'Flex'], ['peace', 'Double peace'], ['wave', 'Wave'], ['bow', 'Bow'], ['cheer', 'Cheer'], ['clap', 'Clap'], ['shrug', 'Shrug'],
];
const EMOTE_IDS = new Set(EMOTES.map((e) => e[0]));
const STEAL_COOLDOWN = 20000, CHASE_WINDOW = 60000;
const yen = (n) => '¥' + Math.round(n).toLocaleString('en-US');
const _v = new THREE.Vector3(), _w = new THREE.Vector3();

export class Social {
  constructor(mp) {
    this.mp = mp;
    this.game = mp.game;
    this.emoteI = 0;
    this.rap = {}; // host: id -> { slaps, thefts: [{ victim, amount, t, back }], fines, calls, open: [offences] }
    this.sheet = {}; // everyone: the public rap sheet
    this.stealT = 0;
  }
  get s() { return this.mp.s; }

  install() {
    const S = this.s, g = this.game;
    S.on('chat', (m, from) => this.onChat(m, from));
    S.on('emo', (m, from) => this.onEmote(m, from));
    S.on('slap', (m, from) => { if (this.mp.isHost) this.hostSlap(from, m.to); });
    S.on('slapped', (m) => this.onSlapped(m));
    S.on('steal', (m, from) => { if (this.mp.isHost) this.hostSteal(from, m.to); });
    S.on('rob', (m) => this.onRob(m));
    S.on('robbed', (m, from) => { if (this.mp.isHost) this.hostRobbed(from, m); });
    S.on('loot', (m) => this.onLoot(m));
    S.on('stole', (m) => { const R = this.mp.avatar(m.by); R?.action('steal'); });
    S.on('rap', (m) => { this.sheet = m.sheet || {}; this.mp.ui?.refresh(); });
    S.on('feed', (m) => this.mp.ui?.log(m.x, 'sys'));
    if (this.hooked) return;
    this.hooked = true;
    // your slap landed on a friend: tell the host
    g.events.on('slap', (e) => {
      const R = e?.human?.netPlayer;
      if (!R || !this.mp.active) return;
      this.slapFx(R.h, null, true);
      this.s.toHost({ t: 'slap', to: R.id });
    });
  }

  // ------------------------------------------------------------------ chat
  say(text) {
    text = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 140);
    if (!text) return;
    if (text[0] === '/') { this.command(text.slice(1)); return; }
    this.mp.ui?.log(text, 'me', this.mp.me.name, this.mp.myColor);
    this.s.toHost({ t: 'chat', x: text });
  }
  command(c) {
    const [cmd, ...rest] = c.split(' ');
    const name = cmd.toLowerCase();
    const e = EMOTES.find((x) => x[0] === name || x[0] === 'pose_' + name || x[1].toLowerCase().replace(/\s/g, '') === name);
    if (e) { this.emote(e[0]); return; }
    if (name === 'pose' || name === 'e') { this.emote(rest[0] && EMOTE_IDS.has(rest[0]) ? rest[0] : BIZARRE[Math.floor(Math.random() * BIZARRE.length)]); return; }
    this.mp.ui?.log(`Emotes: ${EMOTES.map((x) => '/' + x[0].replace('pose_', '')).join(' ')}`, 'sys');
  }
  onChat(m, from) {
    if (this.mp.isHost) {
      // a guest said something: everyone else hears it
      const text = String(m.x || '').slice(0, 140);
      if (!text) return;
      if (from !== 'H') this.speak(from, text);
      this.s.broadcast({ t: 'chat', id: from, x: text }, from);
      return;
    }
    if (m.id && m.id !== this.s.myId) this.speak(m.id, m.x);
  }
  speak(id, text) {
    const p = this.s.players.get(id), R = this.mp.avatar(id);
    this.mp.ui?.log(text, 'them', p?.name || '?', this.mp.colorOf(id));
    if (R) this.game.bubbles?.say(R.h, text, { dur: Math.max(3, 1.5 + text.length * 0.07), style: 'say', onChar: talk(R.h, { vol: 0.8 }) });
    try { audio.play('uiHover', { vol: 0.25 }); } catch { /* */ }
  }

  // ------------------------------------------------------------------ emotes
  /** Strike the next pose in the list (B), or a named one. */
  emote(name = null) {
    if (!name) { name = EMOTES[this.emoteI % EMOTES.length][0]; this.emoteI++; }
    if (!EMOTE_IDS.has(name)) return;
    const label = EMOTES.find((e) => e[0] === name)[1];
    this.mp.ui?.toast(`You strike a pose: ${label}`);
    if (BIZARRE.includes(name)) menace({ kind: 'go', n: 3, dur: 2.2 });
    this.s.toHost({ t: 'emo', e: name });
  }
  onEmote(m, from) {
    const id = this.mp.isHost ? from : m.id;
    if (this.mp.isHost) this.s.broadcast({ t: 'emo', id: from, e: m.e }, from);
    if (id === this.s.myId) return;
    const R = this.mp.avatar(id);
    if (!R || !EMOTE_IDS.has(m.e)) return;
    R.emote(m.e);
    if (BIZARRE.includes(m.e)) this.menaceOver(R.h);
  }
  menaceOver(h) {
    const v = h.headTop(_v).project(this.game.camera);
    if (v.z > 1 || Math.abs(v.x) > 0.95 || Math.abs(v.y) > 0.95) return;
    if (h.root.getWorldPosition(_w).distanceTo(this.game.player.pos) > 9) return;
    menace({ kind: 'go', at: [(v.x * 0.5 + 0.5) * innerWidth + 34, (0.5 - v.y * 0.5) * innerHeight + 70], n: 3, dur: 2.4 });
  }

  // ------------------------------------------------------------------ slaps
  /** The pixel PAF on someone (and their flinch); mine: my own hand already did the sound. */
  slapFx(h, by, mine = false) {
    const g = this.game, p = h.headTop(_v).add(_w.set(0, -0.3, 0));
    if (!mine) {
      g.effects.emit({ sprite: 'paf', pos: p.clone(), life: 0.6, size: 0.26, seq: [0, 1, 1, 1, 1, 2, 2, 3], fade: 0.12 });
      try { audio.play('smack', { pos: p, vol: 0.9 }); } catch { /* */ }
      const r = h.root, from = by ? by.root.position : g.player.pos;
      const away = _w.subVectors(r.getWorldPosition(new THREE.Vector3()), from).setY(0).normalize();
      const R = (g.fp && (g.fp.recoils ||= [])) || null;
      if (R) { const i = R.findIndex((q) => q.root === r); if (i >= 0) R.splice(i, 1); R.push({ root: r, t: 0, x: r.rotation.x, z: r.rotation.z, ax: away.z, az: -away.x }); }
    }
    h.setExpression?.('surprised', 0.5);
    setTimeout(() => h.setExpression?.('angry', 3), 450);
    try { g.effects.mark({ sprite: 'anger', pos: h.headTop(new THREE.Vector3()), color: 0xe5383b, life: 1.6, size: 0.05 }); } catch { /* */ }
  }

  hostSlap(by, to) {
    if (!this.s.players.has(to) || by === to) return;
    const r = this.rapOf(by);
    r.slaps++;
    r.open.push({ kind: 'slap', victim: to, t: Date.now() });
    this.s.broadcast({ t: 'slapped', by, to });
    this.onSlapped({ by, to });
    // the victim of a pocket-picking caught the thief: they get it back
    const th = this.rapOf(to).thefts.find((x) => x.victim === by && !x.back && Date.now() - x.t < CHASE_WINDOW);
    if (th) { th.back = true; this.s.send(to, { t: 'rob', by, exact: th.amount, back: true }); }
    this.publish();
  }

  onSlapped({ by, to }) {
    const g = this.game, me = this.s.myId;
    const byName = this.s.players.get(by)?.name || 'Someone', toName = this.s.players.get(to)?.name || 'someone';
    if (by !== me) this.mp.avatar(by)?.action('slap');
    if (to === me) {
      // PAF! in the face: the screen shakes and you stagger back (and wake up, if you were asleep)
      if (this.mp.sleep?.asleep) this.mp.sleep.getUp();
      const B = this.mp.avatar(by), P = g.player;
      const dir = B ? _v.subVectors(P.pos, B.root.position).setY(0) : _v.set(Math.sin(P.yaw), 0, Math.cos(P.yaw));
      if (dir.lengthSq() < 1e-4) dir.set(Math.sin(P.yaw), 0, Math.cos(P.yaw));
      dir.normalize();
      P.vel.addScaledVector(dir, 5.5);
      P.shake = Math.max(P.shake || 0, 0.9);
      P.fovKick = (P.fovKick || 0) + 6;
      const cam = g.camera, p = cam.getWorldPosition(new THREE.Vector3()).add(cam.getWorldDirection(new THREE.Vector3()).multiplyScalar(0.45)).add(new THREE.Vector3(0.06, 0.02, 0));
      g.effects.emit({ sprite: 'paf', pos: p, life: 0.7, size: 0.2, seq: [0, 1, 1, 1, 1, 2, 2, 3], fade: 0.12 });
      try { audio.play('smack', { vol: 1 }); } catch { /* */ }
      g.fp?.flinch?.();
      this.mp.ui?.toast(`PAF! ${byName} slapped you!`, 'warn');
    } else if (by !== me) {
      const R = this.mp.avatar(to);
      if (R) this.slapFx(R.h, this.mp.avatar(by));
    }
    if (to !== me && by !== me) this.mp.ui?.log(`${byName} slapped ${toName}!`, 'sys');
  }

  // ------------------------------------------------------------------ picking pockets
  /** Am I behind this friend and close enough to reach their pocket? */
  canSteal(R) {
    if (!R?.state || this.game.held.item) return false;
    const P = this.game.player.pos, s = R.state;
    const dx = P.x - s[0], dz = P.z - s[2], d = Math.hypot(dx, dz);
    if ((s[5] | 0) & 1) return d < 1.8; // asleep: they won't notice a thing
    if (d > 1.35 || d < 0.05) return false;
    const fx = -Math.sin(s[3]), fz = -Math.cos(s[3]); // where they're looking
    return (fx * dx + fz * dz) / d < -0.3;
  }
  steal(R) {
    if (performance.now() - this.stealT < 1500) return;
    this.stealT = performance.now();
    try { audio.play('whoosh', { vol: 0.2, v: 0.1, dur: 0.15 }); } catch { /* */ }
    this.s.toHost({ t: 'steal', to: R.id });
  }
  hostSteal(by, to) {
    const ps = this.mp.stateOf(by), pv = this.mp.stateOf(to);
    if (!ps || !pv || !this.s.players.has(to)) return;
    const r = this.rapOf(by);
    if (Date.now() - (r.lastSteal || 0) < STEAL_COOLDOWN) { this.s.send(by, { t: 'feed', x: 'Your hands are still shaking from the last one... wait a bit.' }); return; }
    const dx = ps[0] - pv[0], dz = ps[2] - pv[2], d = Math.hypot(dx, dz);
    const asleep = (pv[5] | 0) & 1;
    const behind = asleep || (d > 0.01 && ((-Math.sin(pv[3])) * dx + (-Math.cos(pv[3])) * dz) / d < -0.1);
    if (d > (asleep ? 2.4 : 1.8) || !behind) { this.s.send(by, { t: 'feed', x: 'They noticed you! Get behind them first.' }); return; }
    r.lastSteal = Date.now();
    this.s.send(to, { t: 'rob', by, pct: 15 + Math.floor(Math.random() * 21) });
    this.s.broadcast({ t: 'stole', by }, by);
    if (by !== 'H') this.mp.avatar(by)?.action('steal');
  }

  /** Someone's hand is in my pocket (or the police / a chase makes me give it back). */
  onRob(m) {
    const g = this.game, W = g.wallet;
    const cash = W.s.cash;
    let amount = m.exact != null ? Math.min(cash, Math.round(m.exact)) : Math.min(cash, 5000, Math.max(100, Math.round(cash * (m.pct || 20) / 10000) * 100));
    amount = Math.max(0, Math.min(amount, cash));
    if (amount > 0) { W.s.cash -= amount; g.updateMoney(false, -amount); }
    const by = this.s.players.get(m.by)?.name || 'Someone';
    if (m.back) this.mp.ui?.toast(amount ? `${by} caught you and took back ${yen(amount)}!` : `${by} caught you, but your pockets are empty`, 'warn');
    else {
      this.mp.ui?.toast(amount ? `Your pocket feels lighter... ${by} took ${yen(amount)}! Slap them to get it back!` : `${by} tried to pick your pocket. It was empty. Ha!`, 'warn');
      try { audio.play('error', { vol: 0.5 }); } catch { /* */ }
      this.mp.ui?.mark(m.by, 60);
    }
    this.s.toHost({ t: 'robbed', by: m.by, amount, back: !!m.back });
  }
  hostRobbed(victim, m) {
    const thief = m.by;
    if (m.back) {
      // a thief giving it back: to the one they stole from
      if (m.amount > 0) this.s.send(thief, { t: 'loot', from: victim, amount: m.amount, back: true });
      this.publish();
      return;
    }
    if (thief === 'police') return;
    const r = this.rapOf(thief);
    if (m.amount > 0) {
      r.thefts.push({ victim, amount: m.amount, t: Date.now(), back: false });
      r.open.push({ kind: 'steal', victim, amount: m.amount, t: Date.now() });
      r.stolen += m.amount;
    }
    this.s.send(thief, { t: 'loot', from: victim, amount: m.amount });
    this.publish();
  }
  onLoot(m) {
    const g = this.game, W = g.wallet;
    const who = m.from === 'police' ? 'The police' : this.s.players.get(m.from)?.name || 'Someone';
    if (m.amount > 0) { this.mp.world.apply(() => { W.s.cash += m.amount; }); g.updateMoney(false, m.amount); try { audio.play(m.from === 'police' || m.back ? 'register' : 'pickpocket', { vol: 0.6 }); } catch { /* */ } }
    if (m.from === 'police') this.mp.ui?.toast(`The police returned ${yen(m.amount)} to you`);
    else if (m.back) this.mp.ui?.toast(`Got it back! ${yen(m.amount)} from ${who}`);
    else this.mp.ui?.toast(m.amount ? `You lifted ${yen(m.amount)} from ${who}'s pocket. Run!` : `${who}'s pockets were empty...`);
  }

  // ------------------------------------------------------------------ the rap sheet
  rapOf(id) { return (this.rap[id] ||= { slaps: 0, thefts: [], stolen: 0, fines: 0, calls: 0, open: [] }); }
  publish() {
    const sheet = {};
    for (const [id, r] of Object.entries(this.rap)) sheet[id] = { slaps: r.slaps, thefts: r.thefts.length, stolen: r.stolen, fines: r.fines, calls: r.calls, open: r.open.length };
    this.sheet = sheet;
    this.s.broadcast({ t: 'rap', sheet });
    this.mp.ui?.refresh();
  }
  /** A line in everyone's chat log (host). */
  feed(text) { this.s.broadcast({ t: 'feed', x: text }); this.mp.ui?.log(text, 'sys'); }

  // ------------------------------------------------------------------ per frame (the steal key)
  update() {
    const g = this.game, inp = g.input;
    if (!this.mp.active || !inp.locked || g.uiOpen || g.pc?.active || this.mp.ui?.typing) return;
    const hov = g.interaction.hover?.obj?.userData?.netPlayer;
    if (hov && inp.keyPressed('KeyE') && this.canSteal(hov)) this.steal(hov);
    if (inp.keyPressed('KeyB')) this.emote();
  }
}
