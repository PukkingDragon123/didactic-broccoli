// What people on the lane notice (game.aware): heads turn to you for a moment when you come close (a glance, not a
// stare), and to noises and goings-on nearby (a capsule popping open in your hands, a machine's gachan, the shutter
// rolling, the garbage truck, a train on the bridge, a doorbell, a dog): a slap makes everyone around gasp and stare.
// People greet you by the time of day with a nod or an ohayou / konnichiwa / konbanwa; the regulars who've met you
// use your name; neighbours nod to each other in passing.
//   const A = awareOf(game)
//   const rec = A.add({ h, pos, yaw(), busy(), say(text, style), canGesture(), local, young, polite, greet(word, name,
//                       met) -> line | null, met() -> bool, npc, onReact(kind, noise) })
//   A.glance(rec) -> Vector3 | null   (where their head should turn now; the owner blends it into its look-at)
//   A.noise(pos, kind, { r, dur: [a, b], chance, victim, lines })   A.remove(rec)   A.update(dt)   A.stats
// Cheap: each person is looked at ~3 times a second (staggered); noises are a short list that expires.
import * as THREE from 'three';
import { playerName } from '../net/boot.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const _v = new THREE.Vector3();

const GASP = ['Did you see that?!', 'Ara ara!', 'Eh?! Did they just...', 'Hidoi...', 'In broad daylight!', 'Should I call someone?', 'Yabai...', 'What was THAT for?'];

export function awareOf(game) { return game.aware || (game.aware = new Awareness(game)); }

export class Awareness {
  constructor(game) {
    this.game = game;
    this.recs = [];
    this.noises = [];
    this.nid = 0;
    this.t = 0;
    this.pairs = new Map(); // "a|b" -> time they last nodded to each other
    this.stats = { glances: 0, greetings: 0, greetLines: 0, nods: 0, gasps: 0, noises: {}, byWord: {} };
    this.name = null;
    this.lines = []; this.lastLine = -9;
  }

  add(o) {
    const rec = { glT: 0, gl: new THREE.Vector3(), glPlayer: false, glPri: 0, cool: rnd(1, 5), chkT: Math.random() * 0.35, greeted: -1e9, seen: this.nid, pending: [], uid: this.recs.length + Math.random(), ...o };
    this.recs.push(rec);
    return rec;
  }
  remove(rec) { const i = this.recs.indexOf(rec); if (i >= 0) this.recs.splice(i, 1); }

  /** Something happened at pos: people within r turn to look (after a beat that grows with the distance). */
  noise(pos, kind, o = {}) {
    const n = { id: ++this.nid, pos: pos.clone(), kind, r: o.r ?? 8, dur: o.dur || [1, 2.2], chance: o.chance ?? 1, victim: o.victim || null, t: this.t, lines: o.lines || null, lineChance: o.lineChance ?? 0 };
    this.noises.push(n);
    this.stats.noises[kind] = (this.stats.noises[kind] || 0) + 1;
    // a slap is seen at once by everybody around (not on their next check)
    if (kind === 'slap') for (const rec of this.recs) this.hear(rec, n);
    return n;
  }

  /** Where this person is looking because of us right now (null: nothing). */
  glance(rec) {
    if (rec.glT <= 0) return null;
    if (rec.glPlayer) return this.game.camera.position;
    return rec.gl;
  }
  /** Look at a point for a while (priority: 0 glance, 1 noise, 2 a shock). */
  look(rec, at, dur, pri = 0, player = false) {
    if (rec.glT > 0 && rec.glPri > pri) return;
    rec.glT = dur; rec.glPri = pri; rec.glPlayer = player;
    if (!player && at) rec.gl.copy(at);
  }

  /** A shared budget for ambient lines (greetings, gasps, chatter): never a wall of floating text. */
  speakOk(max = 3) {
    const t = this.t;
    if (this.lines.length) this.lines = this.lines.filter((e) => e > t);
    return this.lines.length < max && t - this.lastLine > 0.55;
  }
  spoke(dur = 2.5) { this.lines.push(this.t + dur); this.lastLine = this.t; }

  playerName() { if (!this.name) { try { this.name = playerName(); } catch { this.name = 'Mika'; } } return this.name; }
  /** The greeting for the hour (polite / casual). */
  word(rec) {
    const h = this.game.clock?.hours ?? 15;
    const morning = h >= 4.5 && h < 10.5, evening = h >= 17.5 || h < 4.5;
    if (rec.young) return morning ? pick(['Ohayo!', 'Ohayo~']) : evening ? pick(['Konbanwa!', 'Ossu.']) : pick(['Konnichiwa!', 'Ossu.', 'Hi!']);
    return morning ? pick(['Ohayou gozaimasu.', 'Ohayou.']) : evening ? 'Konbanwa.' : 'Konnichiwa.';
  }

  update(dt) {
    this.t += dt;
    const g = this.game;
    if (this.noises.length && this.t - this.noises[0].t > 6) this.noises = this.noises.filter((n) => this.t - n.t < 6);
    for (const rec of this.recs) {
      if (rec.glT > 0) { rec.glT -= dt; if (rec.glT <= 0) rec.glPri = 0; }
      rec.cool -= dt;
      for (let i = rec.pending.length - 1; i >= 0; i--) {
        const q = rec.pending[i];
        q.t -= dt;
        if (q.t > 0) continue;
        rec.pending.splice(i, 1);
        this.react(rec, q.n);
      }
      if ((rec.chkT -= dt) > 0) continue;
      rec.chkT = rnd(0.28, 0.42);
      if (rec.busy?.()) continue;
      this.check(rec);
    }
    void g;
  }

  hear(rec, n) {
    if (n.id <= (rec.heard ?? rec.seen)) return;
    rec.heard = n.id;
    if (rec.h === n.victim || rec.busy?.()) return;
    const d = Math.hypot(rec.pos.x - n.pos.x, rec.pos.z - n.pos.z);
    if (d > n.r || Math.random() > n.chance) return;
    rec.pending.push({ t: n.kind === 'slap' ? 0.08 + d * 0.025 + Math.random() * 0.15 : 0.15 + d * 0.04 + Math.random() * 0.4, n });
  }

  check(rec) {
    const g = this.game, P = g.player.pos;
    // noises since the last check
    if (rec.seen < this.nid) { for (const n of this.noises) this.hear(rec, n); rec.seen = this.nid; }
    const dx = P.x - rec.pos.x, dz = P.z - rec.pos.z, d = Math.hypot(dx, dz);
    if (d > 6 || g.cutscene?.active) return;
    const yaw = rec.yaw ? rec.yaw() : 0;
    const off = Math.abs(wrap(Math.atan2(dx, dz) - yaw));
    const inView = off < 1.9;
    // a glance at you when you're close (not a stare: a second or two, then not again for a while)
    if (inView && rec.cool <= 0 && rec.glT <= 0 && Math.random() < (d < 2.6 ? 0.55 : 0.28)) {
      this.look(rec, null, rnd(0.9, 2.1), 0, true);
      rec.cool = rnd(8, 16);
      this.stats.glances++;
    }
    // a greeting (once per encounter: passers-by once, the people you know again after a while)
    if (inView && d < 3.6 && this.t - rec.greeted > (rec.npc ? 300 : 1e9) && off < 1.4) {
      rec.greeted = this.t;
      const met = !!rec.met?.();
      if (Math.random() < (rec.greetChance ?? (met ? 0.85 : rec.local ? 0.55 : 0.3))) {
        const w = this.word(rec);
        const line = rec.greet ? rec.greet(w, this.playerName(), met) : (Math.random() < 0.5 ? w : null);
        rec.h?.nod?.(rec.polite ? 0.95 : 0.55);
        this.look(rec, null, rnd(1.2, 2), 1, true);
        if (line && d < 5 && this.speakOk()) { rec.say?.(line, 'say'); this.spoke(2); this.stats.greetLines++; this.stats.byWord[w] = (this.stats.byWord[w] || 0) + 1; }
        this.stats.greetings++;
        rec.cool = Math.max(rec.cool, rnd(6, 12));
      }
    }
    // neighbours nod to each other in passing
    if (rec.local) for (const o of this.recs) {
      if (o === rec || !o.local || o.busy?.()) continue;
      const ox = o.pos.x - rec.pos.x, oz = o.pos.z - rec.pos.z, od = Math.hypot(ox, oz);
      if (od > 2.4 || od < 0.3) continue;
      const key = rec.uid < o.uid ? rec.uid + '|' + o.uid : o.uid + '|' + rec.uid;
      if (this.t - (this.pairs.get(key) ?? -1e9) < 120) continue;
      if (Math.abs(wrap(Math.atan2(ox, oz) - (rec.yaw ? rec.yaw() : 0))) > 1.3) continue;
      this.pairs.set(key, this.t);
      if (Math.random() > 0.7) continue;
      rec.h?.nod?.(0.6); this.look(rec, o.pos.clone().setY(1.5), 1.2, 0);
      setTimeout(() => { o.h?.nod?.(0.6); this.look(o, rec.pos.clone().setY(1.5), 1.1, 0); }, 250);
      this.stats.nods++;
      if (d < 9 && Math.random() < 0.35 && this.speakOk(2)) {
        const w = this.word(rec);
        this.spoke(3);
        rec.say?.(w, 'say');
        setTimeout(() => o.say?.(pick(['Aa, ' + w.toLowerCase(), w, 'Doumo.']), 'say'), 900);
      }
      break;
    }
  }

  react(rec, n) {
    const h = rec.h;
    if (n.kind === 'slap') {
      const at = n.victim?.headTop ? n.victim.headTop(_v) : n.pos;
      this.look(rec, at, rnd(n.dur[0], n.dur[1]), 2);
      h?.flinch?.(1);
      h?.setExpression?.('surprised', 3);
      if (rec.canGesture?.() !== false) h?.gesture?.('gasp');
      try { if (Math.random() < 0.45 && h?.headTop) this.game.effects.mark({ sprite: 'bang', pos: h.headTop(new THREE.Vector3()), life: 1.2, size: 0.045 }); } catch { /* */ }
      // a couple of people say something (not everyone at once)
      if ((n.said || 0) < 2 && Math.random() < 0.6 && this.speakOk(4)) { n.said = (n.said || 0) + 1; this.spoke(2.5); setTimeout(() => rec.say?.(pick(n.lines || GASP), 'say'), 700 + Math.random() * 900); }
      this.stats.gasps++;
      rec.onReact?.('slap', n);
      return;
    }
    const at = n.kind === 'train' ? _v.copy(n.pos).setY(5) : n.pos;
    this.look(rec, at, rnd(n.dur[0], n.dur[1]), 1);
    if (n.lines && !n.said && Math.random() < n.lineChance && this.speakOk(2)) { n.said = 1; this.spoke(2.5); setTimeout(() => rec.say?.(pick(n.lines), 'say'), 400 + Math.random() * 500); }
    rec.onReact?.(n.kind, n);
  }
}
