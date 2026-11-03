// game.needs: your body. Energy drains with the hours you're awake, running about and work; food and drink refill it
// (and fill you up), sitting down restores it slowly, sleep restores it fully. Drinks carry buffs with pros and cons
// (caffeine, sugar and its crash, jitters, speed, focus that slows the clock, sleepiness...) and alcohol adds up to
// properly drunk: a swaying, doubled picture, stumbles, slurred lines, people noticing, and a hangover next morning.
//
// Almost no UI: a tiny pixel battery beside the clock (bright for a moment when it changes, a few 9 px glyphs for what
// is in your system) and a little "+12". The rest is felt: slower steps, yawns, a darker, duller edge and heavy
// eyelids when you're tired, your own murmurs (game.monologue).
//
//   needs.energy / needs.full / needs.drunk / needs.hangover / needs.max      0..100 (drunk, hangover 0..1)
//   needs.consume(foodId)          apply src/needs/foods.js FOODS[id] (energy, fullness, buffs, alcohol, cures)
//   needs.add(n, reason)           energy +/- (pops on the battery)       needs.feed(n)  fullness +/-
//   needs.work(n, reason)          tiring work (side jobs, shifts): energy down
//   needs.buff(id, minutes, k)     needs.has(id) -> strength 0..1        needs.clear(id)
//   needs.restAt(rate)             call every frame while you rest somewhere (benches, sofas, stools; decor seats count)
//   needs.slept(hours, { bed })    after sleeping (also detected from any long clock skip: "Call it a day")
//   needs.speedMul()               walking speed factor right now
// Events (game.events): 'ate' { id, energy, full }, 'needs' { energy, full, drunk }, 'yawn', 'exhausted', 'drunk'
// { level }, 'hangover' { level }. Listens to: 'eat' { item, energy } (gumballs...), 'jobDone', 'clockSkip', 'sit'/'stand'.
// Save: game.state.needs (ensureState).
import * as THREE from 'three';
import { Game } from '../game/Game.js';
import { ensureState } from '../game/stateExt.js';
import { audio } from '../core/audio.js';
import { iconHTML } from '../gfx/icons.js';
import { FOODS } from './foods.js';
import './needs.css';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ'), _v = new THREE.Vector3();

// per in-game hour
const DRAIN = 2.6, HUNGER = 6, SOBER = 0.09, HANGOVER_FADE = 0.13;
const BUFF_ICON = { caffeine: 'nb_caffeine', sugar: 'nb_sugar', jitters: 'nb_jitters', speed: 'nb_speed', sleepy: 'nb_sleepy', full: 'nb_full', focus: 'nb_focus', stinky: 'nb_stinky', calm: 'nb_calm', warm: 'nb_warm' };
const MYSTERY = ['speed', 'sleepy', 'jitters', 'focus', 'full', 'drunk', 'stinky', 'boost', 'drain', 'hiccups'];

export class Needs {
  constructor(game) {
    this.game = game;
    game.needs = this;
    this.s = ensureState(game, 'needs', { v: 1, energy: 82, full: 55, drunk: 0, peak: 0, hangover: 0, buffs: [], bonus: 0, caf: 0, last: null, ate: 0, drinks: 0 });
    this.resting = 0; // rest rate this frame (set by restAt)
    this.restT = 0;
    this.t = 0;
    this.yawnT = rnd(40, 80); this.yawn = null;
    this.blinkT = rnd(8, 14); this.blink = null;
    this.stumbleT = rnd(3, 6); this.stumble = null;
    this.hicT = rnd(4, 9);
    this.reactT = 2; this.reacted = new WeakMap();
    this.murmurT = 30; this.said = {};
    this.prev = new THREE.Vector3(); this.hasPrev = false;
    this.clockSet = false;
    this.fx = { tired: 0, lid: 0, double: 0, wobble: 0 };
    this.popAcc = 0; this.popT = 0;
    this.hud = null;
    this.lastShown = {};
    const ev = game.events;
    ev.on('eat', (e) => { if (e?.item && !FOODS[e.item]) { this.add(e.energy || 2, 'snack'); this.feed((e.kcal || 0) / 10); } });
    ev.on('jobDone', () => this.work(7, 'job'));
    ev.on('trashOut', () => this.work(1.5, 'trash'));
    ev.on('clockSkip', (e) => { if (e?.from != null && e.to - e.from >= 240) this.slept((e.to - e.from) / 60, { bed: this.inBed }); });
    Game.updaters.push((g, dt) => this.update(dt));
    // drunk: your own lines come out slurred (chats and murmurs)
    const B = game.bubbles;
    if (B && !B._slurred) {
      B._slurred = true;
      const say = B.say.bind(B);
      B.say = (target, text, opts = {}) => say(target, opts.style === 'me' && this.s.drunk > 0.4 ? slur(text) : text, opts);
    }
  }

  // ------------------------------------------------------------------ numbers
  get energy() { return this.s.energy; }
  get full() { return this.s.full; }
  get drunk() { return this.s.drunk; }
  get hangover() { return this.s.hangover; }
  /** Max energy: more after a good night or ramen with friends, less with a hangover. */
  get max() { return Math.round(100 + (this.s.bonus || 0) - this.s.hangover * 20); }
  get stamp() { return this.game.clock?.stamp ?? 0; }

  add(n, reason = '') {
    if (!n) return 0;
    const s = this.s, before = s.energy;
    s.energy = clamp(s.energy + n, 0, this.max);
    const d = s.energy - before;
    if (Math.abs(d) > 0.01) { this.popAcc += d; this.lit(); }
    if (before >= 15 && s.energy < 15) { this.game.events.emit('exhausted', { reason }); this.murmur('exhausted'); }
    else if (before >= 35 && s.energy < 35) this.murmur('tired');
    return d;
  }
  feed(n) { const s = this.s; s.full = clamp(s.full + n, 0, 100); }
  work(n, reason = '') { return this.add(-Math.abs(n) * (this.has('full') ? 0.8 : 1), reason); }

  // ------------------------------------------------------------------ buffs
  buff(id, minutes, k = 1) {
    const s = this.s, until = this.stamp + minutes;
    const b = s.buffs.find((x) => x.id === id);
    if (b) { b.until = Math.max(b.until, until); b.k = Math.max(b.k, k); } else s.buffs.push({ id, until, k, t0: this.stamp });
    this.lit();
  }
  has(id) { const b = this.s.buffs.find((x) => x.id === id); return b ? b.k : 0; }
  clear(id) { this.s.buffs = this.s.buffs.filter((b) => b.id !== id); }

  /** Eat or drink something from FOODS. Returns the entry (or null). */
  consume(id, { quiet = false } = {}) {
    const f = FOODS[id];
    if (!f) return null;
    const s = this.s, g = this.game;
    const stuffed = s.full > 88 && f.full > 8;
    this.feed(f.full || 0);
    const gain = this.add((f.energy || 0) * (stuffed ? 0.5 : 1), 'ate');
    for (const c of f.cures || []) this.cure(c);
    if (f.drunk) this.drink(f.drunk);
    for (const [b, min, k] of f.fx || []) {
      if (b === 'random') this.randomFx();
      else if (b === 'mystery') this.mystery();
      else if (b === 'crash') s.buffs.push({ id: 'crash', until: this.stamp + min, k, t0: this.stamp });
      else this.buff(b, min, k);
      if (b === 'caffeine') { s.caf = (s.caf || 0) + k; if (s.caf >= 2.5) { this.buff('jitters', 40, 1); this.murmur('jitters'); } }
    }
    if (id === 'ramune' || id === 'vd_ramunecan') this.buff('hiccups', 6, 1);
    s.ate++;
    if (!quiet) {
      if (stuffed) this.murmur('stuffed');
      else if (f.drunk > 0 && s.drunk > 0.45) this.murmur('drunk');
      else if (gain > 15) this.murmur('boost');
      else if (s.full > 40 && this.said.hungry) this.said.hungry = 0;
    }
    g.events.emit('ate', { id, energy: gain, full: f.full || 0 });
    g.events.emit('needs', this.snapshot());
    return f;
  }
  cure(what) {
    const s = this.s;
    if (what === 'hangover' && s.hangover > 0) { s.hangover = Math.max(0, s.hangover - 0.45); if (s.hangover < 0.05) s.hangover = 0; }
    if (what === 'jitters') this.clear('jitters');
    if (what === 'sleepy') this.clear('sleepy');
    if (what === 'drunk') s.drunk = Math.max(0, s.drunk - 0.08);
  }
  /** Alcohol: drunkenness adds up (and decays slowly); the peak of the day decides the hangover. */
  drink(v) {
    const s = this.s;
    s.drunk = clamp(s.drunk + v, 0, 1);
    s.peak = Math.max(s.peak || 0, s.drunk);
    s.drinks = (s.drinks || 0) + (v > 0 ? 1 : 0);
    if (v > 0) this.game.events.emit('drunk', { level: s.drunk });
  }
  randomFx() { const b = pick(['speed', 'sleepy', 'jitters', 'calm', 'focus']); this.buff(b, 30, 0.8); this.murmur('random_' + b, true); }
  mystery() {
    const m = pick(MYSTERY);
    if (m === 'drunk') this.drink(0.18);
    else if (m === 'boost') this.add(30, 'mystery');
    else if (m === 'drain') this.add(-12, 'mystery');
    else if (m === 'hiccups') this.buff('hiccups', 10, 1);
    else this.buff(m, 45, 1);
    this.murmur('mystery_' + m, true);
  }

  // ------------------------------------------------------------------ rest and sleep
  restAt(rate = 1) { this.resting = Math.max(this.resting, rate); }
  /** After sleeping `hours` (a long clock skip): energy back up, hungrier, the drink of last night becomes a hangover. */
  slept(hours, { bed = false } = {}) {
    const s = this.s;
    const k = clamp(hours / 7, 0.3, 1);
    s.hangover = s.peak >= 0.4 ? clamp((s.peak - 0.25) * 1.5, 0, 1) : s.hangover * 0.3;
    s.peak = 0; s.drunk = 0; s.caf = 0; s.drinks = 0;
    s.bonus = bed ? 6 : 0; // a proper night in your own bed: a little extra
    s.buffs = s.buffs.filter((b) => b.id === 'stinky' ? false : b.until > this.stamp && !['sleepy', 'jitters', 'crash', 'sugar', 'caffeine', 'focus', 'placebo', 'hiccups'].includes(b.id));
    s.energy = Math.max(s.energy, this.max * (0.55 + 0.45 * k) * (this.has('sleepy') ? 1.08 : 1));
    s.energy = Math.min(s.energy, this.max);
    s.full = Math.max(0, s.full - 22 * k);
    this.inBed = false;
    if (s.hangover > 0.05) { this.game.events.emit('hangover', { level: s.hangover }); this.game.tweens.wait(4, () => this.murmur('hangover', true)); }
    this.lit();
  }

  /** Walking speed factor (tired, buffs, drunk, hangover). */
  speedMul() {
    const s = this.s, e = s.energy;
    let m = e >= 35 ? 1 : e >= 15 ? 0.85 + (e - 15) / 20 * 0.15 : 0.62 + e / 15 * 0.23;
    m *= 1 + 0.18 * this.has('speed') + 0.1 * this.has('jitters') + 0.05 * this.has('caffeine');
    if (this.has('full') && s.full > 85) m *= 0.95;
    m *= 1 - 0.18 * s.drunk;
    m *= 1 - 0.08 * s.hangover;
    return m;
  }

  snapshot() { const s = this.s; return { energy: Math.round(s.energy), full: Math.round(s.full), drunk: +s.drunk.toFixed(2), hangover: +s.hangover.toFixed(2), max: this.max, buffs: s.buffs.map((b) => b.id) }; }

  // ------------------------------------------------------------------ per frame
  update(dt) {
    const g = this.game, s = this.s, P = g.player;
    if (!(dt > 0) || g.visiting) return;
    this.t += dt;
    // in-game minutes since last frame (the clock pauses in menus and cutscenes; long skips are handled as sleep)
    const now = this.stamp;
    if (s.last === null || now < s.last) s.last = now;
    let dm = now - s.last;
    s.last = now;
    if (dm > 120) dm = 0;
    const playing = g.input.locked && !g.cutscene?.active;
    if (dm > 0) this.tick(dm);
    // running about (real time): sprinting costs, walking a little
    const sp = Math.hypot(P.vel.x, P.vel.z);
    if (playing && sp > 0.3) this.add(-(sp > 3 ? 0.03 : 0.004) * dt * (this.has('full') ? 0.8 : 1), 'walk');
    // resting
    const decorSit = !!g.decor?.sitting;
    const rate = Math.max(this.resting, decorSit ? 1 : 0);
    if (rate > 0 && playing) {
      this.restT += dt;
      if (this.restT > 1.2) this.add(0.07 * rate * dt * (s.energy < this.max * 0.85 ? 1 : 0.4), 'rest');
      if (this.restT > 1.2 && this.restT - dt <= 1.2 && s.energy < 60) audio.play('sigh', { vol: 0.5 });
    } else this.restT = 0;
    this.resting = 0;
    this.feel(dt, playing);
    this.adjustSpeed(playing);
    this.focusClock();
    this.updateHud(dt);
  }

  /** Clock minutes passing: drain, hunger, buffs running out, alcohol wearing off. */
  tick(dm) {
    const s = this.s, h = dm / 60;
    const hungry = s.full < 15;
    let drain = DRAIN * h * (hungry ? 1.6 : 1) * (this.has('full') ? 0.65 : 1) * (1 + this.has('sleepy') * 1.2) * (this.has('tidy') ? 0.9 : 1);
    if (this.game.decor?.sitting || this.resting) drain *= 0.3;
    this.add(-drain, 'time');
    this.feed(-HUNGER * h * (this.has('full') ? 0.5 : 1));
    if (hungry && !this.said.hungry) { this.said.hungry = 1; this.murmur('hungry'); }
    if (s.drunk > 0) s.drunk = Math.max(0, s.drunk - SOBER * h);
    if (s.hangover > 0) { s.hangover = Math.max(0, s.hangover - HANGOVER_FADE * h); }
    if (s.caf > 0) s.caf = Math.max(0, s.caf - 0.35 * h);
    // buffs that ran out (some leave a crash behind)
    const now = this.stamp;
    if (s.buffs.some((b) => b.until <= now)) {
      const keep = [];
      for (const b of s.buffs) {
        if (b.until > now) { keep.push(b); continue; }
        if (b.id === 'crash') { this.add(-b.k, 'crash'); this.murmur('crash'); this.yawnT = Math.min(this.yawnT, 1); }
        else if (b.id === 'sugar') { this.add(-7 * b.k, 'crash'); if (b.k > 0.6) this.murmur('crash'); }
        else if (b.id === 'jitters') this.add(-5 * b.k, 'crash');
      }
      s.buffs = keep;
    }
  }

  // ------------------------------------------------------------------ how it feels
  feel(dt, playing) {
    const g = this.game, s = this.s, P = g.player, R = g.renderer;
    const e = s.energy;
    const tired = e < 40 ? (40 - e) / 40 : 0;
    const fx = this.fx;
    const placebo = this.has('placebo');
    const drunk = Math.max(s.drunk, placebo * 0.28);
    fx.tired = Math.min(1, tired * 1.1 + s.hangover * 0.3 + this.has('sleepy') * 0.15);
    fx.double = drunk > 0.32 ? Math.min(1, (drunk - 0.32) * 1.8) : 0;
    fx.wobble = Math.min(1.2, drunk * 1.4);
    // eyelids: a slow blink when exhausted, half-closed while yawning, shut while blacking out
    let lid = 0;
    if (playing) {
      if (e < 18 || this.has('sleepy') > 0.5) {
        this.blinkT -= dt;
        if (this.blinkT <= 0 && !this.blink) { this.blink = { t: 0, dur: e < 6 ? 1.8 : 1.1 }; this.blinkT = e < 6 ? rnd(6, 11) : rnd(10, 20); }
      }
      if (this.blink) {
        const b = this.blink; b.t += dt;
        const u = b.t / b.dur;
        lid = Math.max(lid, u < 0.35 ? u / 0.35 * 0.92 : u < 0.6 ? 0.92 : Math.max(0, 1 - (u - 0.6) / 0.4) * 0.92);
        if (u >= 1) this.blink = null;
      }
      // yawns
      if (tired > 0.25 || this.has('sleepy') > 0.3 || s.hangover > 0.4) {
        this.yawnT -= dt;
        if (this.yawnT <= 0 && !this.yawn && !g.talk?.active) this.startYawn();
      }
      if (this.yawn) {
        const y = this.yawn; y.t += dt;
        const u = y.t / 1.6;
        lid = Math.max(lid, Math.sin(Math.PI * Math.min(1, u)) * 0.45);
        if (u >= 1) this.yawn = null;
      }
    }
    fx.lid = lid;
    Object.assign(R.fx, fx);
    if (!playing || g.pc?.active || g.talk?.active || P.lookOverride || this.camHold) return;
    // the camera: tired sway, drunk sway and stagger, jitters, a yawn tipping your head back
    const t = this.t;
    let roll = Math.sin(t * 0.55) * 0.012 * tired;
    let pitch = Math.sin(t * 0.4 + 1) * 0.008 * tired, yaw = 0;
    if (drunk > 0.05) {
      roll += Math.sin(t * 0.83) * 0.06 * drunk + Math.sin(t * 2.1) * 0.012 * drunk;
      pitch += Math.sin(t * 0.61 + 2) * 0.025 * drunk;
      yaw += Math.sin(t * 0.37) * 0.035 * drunk;
    }
    if (this.yawn) { const u = this.yawn.t / 1.6; pitch += Math.sin(Math.PI * Math.min(1, u)) * 0.13; }
    const jit = this.has('jitters');
    if (jit) P.shake = Math.max(P.shake, 0.18 * jit);
    if (roll || pitch || yaw) {
      _q.setFromEuler(_e.set(pitch, yaw, roll));
      g.camera.quaternion.multiply(_q);
      g.camera.updateMatrixWorld();
    }
    // stumbles and hiccups
    const moving = Math.hypot(P.vel.x, P.vel.z) > 0.5;
    if (s.drunk > 0.42 && moving) {
      this.stumbleT -= dt * (0.6 + s.drunk);
      if (this.stumbleT <= 0 && !this.stumble) {
        const side = Math.random() < 0.5 ? -1 : 1;
        this.stumble = { t: 0, dx: Math.cos(P.yaw) * side, dz: -Math.sin(P.yaw) * side, k: 0.5 + s.drunk };
        this.stumbleT = rnd(3, 7) / (0.5 + s.drunk);
        audio.play('stumble', { vol: 0.7 });
        P.shake = Math.max(P.shake, 0.4);
        if (Math.random() < 0.35) this.murmur('stumble', true);
      }
    }
    if (this.stumble) {
      const st = this.stumble; st.t += dt;
      const v = Math.sin(Math.PI * Math.min(1, st.t / 0.45)) * 1.4 * st.k * dt;
      P.pos.x += st.dx * v; P.pos.z += st.dz * v; P.collide();
      if (st.t > 0.45) this.stumble = null;
    }
    if (this.has('hiccups') || s.drunk > 0.5) {
      this.hicT -= dt;
      if (this.hicT <= 0) {
        this.hicT = rnd(3, 8);
        audio.play('hiccup', { vol: 0.6 });
        P.shake = Math.max(P.shake, 0.12);
        if (Math.random() < 0.4) g.monologue?.say('*hic*', { force: true });
      }
    }
    this.reactions(dt);
  }

  startYawn() {
    const g = this.game;
    this.yawn = { t: 0 };
    this.yawnT = this.s.energy < 15 ? rnd(25, 45) : rnd(50, 110);
    audio.play('yawn', { vol: 0.55 });
    g.player.fovKick = -5;
    g.events.emit('yawn', {});
    if (Math.random() < 0.45) this.murmur('yawn', true);
  }

  /** People nearby notice when you reek of drink (or natto cola). */
  reactions(dt) {
    const g = this.game, s = this.s;
    if ((this.reactT -= dt) > 0) return;
    this.reactT = 2.5;
    const stinky = this.has('stinky'), drunk = s.drunk > 0.45;
    if (!stinky && !drunk) return;
    const P = g.player.pos;
    const lines = stinky ? ['What IS that smell?', 'Natto? ...Natto.', 'Ugh. Did something die?', '*holds nose*'] : ['Are you... okay?', 'Someone\'s had a few.', 'Go home, kid.', 'Drink some water, dear.', 'Ha! Rough night?'];
    const who = [];
    for (const n of g.lane?.list || []) if (n.present && !n.busy && n.playerDist < 3.2) who.push({ ref: n, say: (t) => n.say(t) });
    for (const p of g.pedestrians?.list || []) if (p.h?.root && Math.hypot(p.h.root.position.x - P.x, p.h.root.position.z - P.z) < 3) who.push({ ref: p, say: (t) => g.pedestrians.say(p.h, t) });
    for (const w of who) {
      const last = this.reacted.get(w.ref) || -99;
      if (this.t - last < 45) continue;
      this.reacted.set(w.ref, this.t);
      w.say(pick(lines));
      w.ref.h?.setExpression?.(stinky ? 'angry' : 'surprised', 2);
      break;
    }
  }

  /** Walking speed: the player controller knows nothing about this, so scale the step it just took. */
  adjustSpeed(playing) {
    const g = this.game, P = g.player;
    const ok = playing && !P.frozen && !P.lookOverride && !g.decor?.sitting;
    if (ok && this.hasPrev) {
      const m = this.speedMul();
      const dx = P.pos.x - this.prev.x, dz = P.pos.z - this.prev.z;
      if (Math.abs(m - 1) > 0.01 && dx * dx + dz * dz < 0.25 && dx * dx + dz * dz > 1e-8) {
        const ux = P.pos.x, uz = P.pos.z;
        P.pos.x = this.prev.x + dx * m; P.pos.z = this.prev.z + dz * m;
        P.collide();
        g.camera.position.x += P.pos.x - ux; g.camera.position.z += P.pos.z - uz;
        g.camera.updateMatrixWorld();
      }
    }
    this.prev.copy(P.pos);
    this.hasPrev = true;
  }

  /** Focus (vinegar, tonics) and strong caffeine slow the clock down a little: more done in a day. */
  focusClock() {
    const c = this.game.clock;
    if (!c) return;
    const f = this.has('focus');
    const want = f ? 1 - 0.3 * f : 1;
    if (want !== 1) { if (c.speed !== want) { c.speed = want; this.clockSet = true; } }
    else if (this.clockSet) { c.speed = 1; this.clockSet = false; }
  }

  // ------------------------------------------------------------------ murmurs (game.monologue)
  murmur(kind, force = false) {
    const g = this.game, M = g.monologue;
    if (!M) return;
    const now = this.t;
    if (!force && now - (this.said[kind + 'T'] ?? -999) < 90) return;
    this.said[kind + 'T'] = now;
    const L = {
      tired: ['I\'m getting tired...', 'Running on fumes here.', 'Need to sit down for a bit.'],
      exhausted: ['I can barely keep my eyes open. Bed.', 'So... sleepy...', 'I need to sleep. Or eat. Or both.'],
      hungry: ['My stomach is growling.', 'I should eat something. Onigiri, maybe.', 'Hungry...'],
      stuffed: ['I\'m stuffed.', 'Can\'t... eat... another bite.'],
      boost: ['That hit the spot!', 'Okay! Back to work.', 'I feel alive again.'],
      crash: ['And there\'s the crash...', 'Ugh. The sugar wore off.', 'Why do I feel so heavy now?'],
      jitters: ['My hands won\'t stop shaking.', 'Too. Much. Coffee.'],
      drunk: ['I\'m *hic* totally fine.', 'Who moved the lane?', 'Thish is... a beautiful street.', 'One more? ...No. No.'],
      stumble: ['Whoa—', 'Who put that there?', 'Steady...'],
      hangover: ['My head... why did I drink that...', 'Never again. Never.', 'Water. I need water. Or that blue sports drink.'],
      yawn: ['*yaaawn*', 'Hnnngh... *yawn*'],
      mystery_speed: ['Huh. My legs feel weird. Fast weird.'], mystery_sleepy: ['That tasted like... a nap.'], mystery_jitters: ['WHAT WAS IN THAT.'],
      mystery_focus: ['Everything is very... clear.'], mystery_full: ['How is a drink this filling?'], mystery_drunk: ['Was that... alcohol?!'],
      mystery_stinky: ['...Why do I smell like a fish market?'], mystery_boost: ['WOW. I could run to Tokyo.'], mystery_drain: ['I feel drained. Literally.'], mystery_hiccups: ['*hic* Oh no. *hic*'],
      random_speed: ['Cherry medicine. And now I\'m fast?'], random_sleepy: ['Mr. Peppo... why...'], random_jitters: ['Twenty-three flavours of WHOA.'], random_calm: ['Oddly soothing.'], random_focus: ['Strangely focused. Thanks, Mr. Peppo.'],
    }[kind];
    if (!L) return;
    let text = pick(L);
    if (this.s.drunk > 0.4 && kind !== 'drunk') text = slur(text);
    M.say(text, { force });
  }

  // ------------------------------------------------------------------ the battery by the clock
  buildHud() {
    if (this.hud) return;
    const host = document.querySelector('#simclock .sc-row') || document.getElementById('hud');
    if (!host) return;
    const el = document.createElement('span');
    el.className = 'nd-stat';
    el.innerHTML = '<span class="nd-bat"><i></i><i></i><i></i><i></i><i></i></span><span class="nd-buffs"></span><span class="nd-pop"></span>';
    const time = host.querySelector('.sc-time');
    if (time) time.after(el); else host.appendChild(el);
    this.hud = { el, bat: el.querySelector('.nd-bat'), segs: [...el.querySelectorAll('.nd-bat i')], buffs: el.querySelector('.nd-buffs'), pop: el.querySelector('.nd-pop') };
  }
  lit() { this.litT = 4; }
  updateHud(dt) {
    if (!this.hud) { if (Math.floor(this.t) % 2 === 0) this.buildHud(); if (!this.hud) return; }
    const H = this.hud, s = this.s;
    this.litT = (this.litT || 0) - dt;
    this.popT -= dt;
    if (Math.abs(this.popAcc) >= 3 && this.popT <= 0) {
      const n = Math.round(this.popAcc);
      H.pop.textContent = (n > 0 ? '+' : '') + n;
      H.pop.className = 'nd-pop show ' + (n > 0 ? 'up' : 'down');
      void H.pop.offsetWidth;
      this.popAcc = 0; this.popT = 1.6;
    }
    if ((this.hudT = (this.hudT || 0) - dt) > 0) return;
    this.hudT = 0.25;
    const L = this.lastShown;
    const frac = s.energy / 100, n = Math.ceil(frac * 5 - 0.001);
    const level = frac >= 0.6 ? 'hi' : frac >= 0.3 ? 'mid' : frac >= 0.15 ? 'lo' : 'crit';
    const key = n + level + (this.litT > 0 ? 'L' : '');
    if (L.bat !== key) {
      L.bat = key;
      H.segs.forEach((seg, i) => { seg.className = i < n ? 'on' : ''; });
      H.bat.className = 'nd-bat ' + level;
      H.el.classList.toggle('lit', this.litT > 0 || level === 'crit');
    }
    // what's in your system: a few 9 px glyphs
    const list = [];
    if (s.full < 15) list.push('nb_hungry');
    if (s.drunk > 0.15) list.push('nb_drunk');
    if (s.hangover > 0.05) list.push('nb_hangover');
    if ((s.bonus || 0) >= 15) list.push('nb_friends');
    for (const b of s.buffs) if (BUFF_ICON[b.id] && !list.includes(BUFF_ICON[b.id])) list.push(BUFF_ICON[b.id]);
    const bk = list.slice(0, 5).join(',');
    if (L.buffs !== bk) { L.buffs = bk; H.buffs.innerHTML = list.slice(0, 5).map((i) => iconHTML(i, 2)).join(''); }
  }
}

/** Drunk speech: stretched esses, a hic in the middle, some letters doubled. */
export function slur(text) {
  let t = String(text).replace(/s(?=[aeiou ])/g, 'sh').replace(/([aeiou])/g, (m) => (Math.random() < 0.12 ? m + m : m));
  const w = t.split(' ');
  if (w.length > 2) w.splice(1 + Math.floor(Math.random() * (w.length - 1)), 0, '*hic*');
  return w.join(' ');
}
