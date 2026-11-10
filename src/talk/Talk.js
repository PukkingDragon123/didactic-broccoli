// Cinematic chat: click a person and the camera eases into an over-the-shoulder two-shot (your own character in the
// foreground, them facing you; no letterbox, the HUD steps aside). Their lines float beside their head, you answer
// with 2-4 choices floating in the world next to you (keys 1-4, W/S + E/Space, the mouse, or a tap), some of them
// timed ("hurry and answer!"). Every choice you make is spoken by your character and remembered by theirs.
// Lines and choices are plain floating text with a hard ink outline (src/people/bubbles.css, talk.css): numbered
// lines, the one you're on underlined in red pencil, the timer a thin ink line. No paper behind any of it.
//
//   const result = await game.talk.start(npc, script, opts)       one conversation (resolves when it ends)
//   game.talk.active / game.talk.with                            is a chat running, and with whom
//   const i = await game.talk.quick(who, ['Yes', 'No'], { time: 5 })   a quick floating reply without the camera
//                                                                       move (customers asking you things); -1 = ignored
//
// who: an Npc (src/npc/Npc.js), a customer, a Human, or { name, id, h | anchor: Object3D | headTop(out), color,
//      tts: voice profile, onChar }. opts: { name, id, color, cast: { key: who } (other speakers), leave: false
//      (no early exit with Q) }.
//
// ---------------------------------------------------------------- the dialogue script format
// A script is an array of steps (one node), an object of named nodes ({ start: [steps], other: [steps] }, or
// { start: 'nodeName', nodes: { ... } }), or an async function (t) => value using the session API:
//   await t.say(text, { gesture, expr, style })   await t.me(text)   await t.as(castKey | 'mom', text)
//   const i = await t.choose(['A', 'B', { text: 'C', if: 'rel>=2' }], { time: 6 })   (-1 = ran out of time)
//   await t.wait(sec)   await t.effects({ rel, set, quest, give, pay, ... })   t.mem   t.vars   t.npc   t.game
// A step is a string (they say it) or an object; keys can combine and run in this order:
//   if: cond, then: [steps] | 'node', else: [steps] | 'node'   cond: fn(ctx) or a string: 'flagName', '!flag',
//        'rel>=2', 'talks>3', 'money>=500', 'hour<12', 'night', 'day>2', 'quest:id' (active), 'done:id', 'met'
//   once: 'key'                    run this step only the first time (per character)
//   do: fn(ctx)                    any effect (may return a Promise: the chat waits for it)
//   rel: +1 | -2                   relationship change          set: { flag: value }   (their memory flags)
//   remember: 'text'               a note in their memory        quest: 'id'   start a side quest   advance: 'id'
//   give: yen (they pay you)       pay: yen (you pay them; a step with pay ends the node when you can't)
//   gesture: 'wave'   expr: 'happy'   sound: 'doorbell'   wait: seconds
//   say: text | [texts] | fn(ctx)  they say it (who: 'me' | a cast key to switch speaker; style: 'shout' | 'think')
//   me: text                       you say it
//   choose: [{ text, go, end, value, if, rel, set, do, remember, silent }], time: seconds (a timed choice),
//          timeout: option index | 'node' (default: silence -> the step's `late` node or the chat ends)
//   pick: [steps]                  one of them at random
//   go: 'node'   end: true | value
// Text templates: {name} (theirs), {me} (yours), {money}, {time}; texts can also be arrays (one at random) or fns.
// Memory (game.state.npcs.people[id]): rel, flags, talks, last (stamp), said [{ t, text }], notes [...].
import * as THREE from 'three';
import './talk.css';
import { audio } from '../core/audio.js';
import { talk as blipVoice } from '../people/voice.js';
import { createAvatarHuman } from '../people/avatar.js';
import { profileOf } from './speech.js';
import { formatYen } from '../core/util.js';

const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _u = new THREE.Vector3(), _m = new THREE.Matrix4();
const UP = new THREE.Vector3(0, 1, 0);
const smooth = (k) => k * k * (3 - 2 * k);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const sfx = (n, v = 0.4) => { try { audio.play(n, { vol: v }); } catch { /* audio not ready */ } };

/** Normalise anything that can talk into { id, name, color, h, target, headPos(out), onChar, tts, ref }. */
export function speaker(who, opts = {}) {
  if (!who) return null;
  if (who.__spk) return who.__spk;
  const h = who.h?.isHuman || who.h?.mesh ? who.h : who.mesh && who.headTop ? who : null;
  const s = {
    ref: who,
    id: opts.id || who.id || who.memId || null,
    name: opts.name || who.name || h?.spec?.name || '???',
    color: opts.color || who.color || '#ffd23f',
    h,
    target: h || who.anchor || (who.headTop ? who : null) || who,
    tts: who.tts || (h ? profileOf(h) : { gender: 'x', pitch: 1, seed: 1 }),
    onChar: who.voice && typeof who.voice === 'function' ? who.voice : blipVoice(h || null, who.blip || {}),
  };
  s.headPos = (out) => {
    if (who.headPos) return who.headPos(out);
    if (h) { h.headTop(out); out.y -= 0.32; return out; }
    if (who.headTop) { who.headTop(out); out.y -= 0.25; return out; }
    if (who.isObject3D || who.anchor) { (who.anchor || who).getWorldPosition(out); out.y += who.headY ?? 1.4; return out; }
    return out.set(0, 1.5, 0);
  };
  s.feet = (out) => {
    if (h) return out.copy(h.root.position);
    if (who.pos) return out.copy(who.pos).setY(0);
    if (who.isObject3D || who.anchor) return (who.anchor || who).getWorldPosition(out).setY(0);
    return out.set(0, 0, 0);
  };
  return s;
}

// ------------------------------------------------------------------ floating choices
/**
 * The pencil stroke under the choice you're on (CSS --tk-mark): a wobbly red line with an ink rim so it shows on any
 * background, 32 x 4 texels, tiling sideways, shown at 2x (4x with the big text). Painted once.
 */
let markDone = false;
function paintMark() {
  if (markDone) return;
  markDone = true;
  const W = 32, H = 4, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d'), img = g.createImageData(W, H);
  let s = 5;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const ys = [];
  for (let x = 0, y = 1; x < W; x++) { if (x > 2 && r() < 0.2) y = 3 - y; if (x > W - 4) y = 1; ys.push(y); } // (ends where it starts: it tiles)
  const put = (x, y, c3) => { if (y < 0 || y >= H) return; const i = (y * W + ((x + W) % W)) * 4; img.data[i] = c3[0]; img.data[i + 1] = c3[1]; img.data[i + 2] = c3[2]; img.data[i + 3] = 255; };
  for (let x = 0; x < W; x++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) put(x + dx, ys[x] + dy, [26, 18, 22]);
  for (let x = 0; x < W; x++) put(x, ys[x], r() < 0.25 ? [214, 62, 54] : [240, 85, 74]); // the pencil pressing harder here and there
  g.putImageData(img, 0, 0);
  document.documentElement.style.setProperty('--tk-mark', `url(${c.toDataURL()})`);
}

/** A stack of numbered options floating at a screen point (projected from the world each frame). */
class ChoiceList {
  constructor(talk, options, { time = 0, at, prompt = '', quick = false, beside = false } = {}) {
    this.beside = beside; // left edge just right of the anchor (quick replies float beside the person asking)
    this.talk = talk;
    this.options = options;
    this.time = time; this.left = time;
    this.at = at; // (out Vector3) -> world point, or null: bottom centre
    this.sel = 0;
    this.result = null;
    this.quick = quick;
    this.acc = 0;
    paintMark();
    const el = this.el = document.createElement('div');
    el.className = `tk-choices${quick ? ' quick' : ''}${time ? ' timed' : ''}`;
    if (prompt) el.appendChild(Object.assign(document.createElement('div'), { className: 'tk-prompt', textContent: prompt }));
    this.btns = options.map((o, i) => {
      const b = document.createElement('button');
      b.className = 'tk-opt';
      b.innerHTML = `<span class="n">${i + 1}</span><span class="t"><span class="u"></span></span>`;
      b.querySelector('.u').textContent = o;
      b.addEventListener('pointerenter', () => { this.sel = i; this.paint(); });
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        this.pick(i);
        const inp = talk.game.input;
        if (!quick && !inp.locked && !inp.touch) inp.lock?.(); // a click is a gesture: take the pointer back
      });
      el.appendChild(b);
      return b;
    });
    if (time) {
      this.bar = document.createElement('div');
      this.bar.className = 'tk-timer';
      this.segs = [];
      for (let i = 0; i < 12; i++) { const s = document.createElement('i'); this.bar.appendChild(s); this.segs.push(s); }
      el.appendChild(this.bar);
    }
    document.body.appendChild(el);
    this.w = el.offsetWidth; this.h = el.offsetHeight;
    this.paint();
    this.t = 0;
    sfx(time ? 'uiBeep' : 'uiHover', 0.35);
    // keys: captured before the game's own input sees them (so 1-4 never switch inventory slots meanwhile)
    this.onKey = (e) => {
      if (this.result !== null) return;
      const n = /^(?:Digit|Numpad)(\d)$/.exec(e.code);
      const eat = () => { e.preventDefault(); e.stopPropagation(); };
      if (n) { const k = +n[1]; if (k >= 1 && k <= this.options.length) { eat(); this.pick(k - 1); } return; }
      if (quick) return; // quick replies only take the number keys (you keep walking with WASD)
      if (e.code === 'KeyW' || e.code === 'ArrowUp') { eat(); this.move(-1); }
      else if (e.code === 'KeyS' || e.code === 'ArrowDown') { eat(); this.move(1); }
      else if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') { eat(); this.pick(this.sel); }
    };
    window.addEventListener('keydown', this.onKey, true);
  }
  move(d) { this.sel = (this.sel + this.options.length + d) % this.options.length; this.paint(); sfx('uiHover', 0.25); }
  paint() { if (!this.quick) this.btns.forEach((b, i) => b.classList.toggle('sel', i === this.sel)); }
  pick(i) {
    if (this.result !== null) return;
    this.result = i;
    if (i >= 0) { this.btns[i]?.classList.add('picked'); sfx('uiClick', 0.5); }
    this.closeT = 0;
  }
  update(dt) {
    const g = this.talk.game, inp = g.input;
    this.t += dt;
    if (this.result === null) {
      // the mouse (pointer locked): vertical motion moves the highlight, a click picks it
      if (!this.quick && inp.locked && !inp.free && !inp.touch) {
        this.acc += inp.mouse.dy || 0;
        if (Math.abs(this.acc) > 46) { this.move(Math.sign(this.acc)); this.acc = 0; }
        if (inp.mouse.wheel) { this.move(Math.sign(inp.mouse.wheel)); inp.mouse.wheel = 0; }
        if (this.t > 0.25 && inp.buttonDown(0)) this.pick(this.sel);
      }
      if (this.time) {
        this.left -= dt;
        const n = Math.ceil(Math.max(0, this.left / this.time) * this.segs.length);
        if (n !== this.segN) {
          this.segN = n;
          this.segs.forEach((s, i) => s.classList.toggle('on', i < n));
          this.bar.classList.toggle('low', n <= 3);
          if (n <= 3 && n > 0) sfx('clockTick', 0.3);
        }
        if (this.left <= 0) this.pick(-1);
      }
    }
    // position: beside the world anchor (your shoulder) or at the bottom centre
    const W = innerWidth, H = innerHeight;
    let x = W / 2 - this.w / 2, y = H - this.h - Math.max(110, H * 0.2);
    if (this.at) {
      const p = this.at(_u).project(g.camera);
      if (p.z < 1) {
        x = (p.x * 0.5 + 0.5) * W - (this.beside ? -36 : this.w / 2);
        y = (-p.y * 0.5 + 0.5) * H - this.h / 2;
        if (this.beside && x + this.w > W - 12) x = (p.x * 0.5 + 0.5) * W - 36 - this.w; // no room on the right: the left side
      }
    }
    x = Math.round(Math.max(12, Math.min(W - this.w - 12, x)));
    y = Math.round(Math.max(12, Math.min(H - this.h - 12, y)));
    const tx = `translate3d(${x}px,${y}px,0)`;
    if (tx !== this.tx) { this.el.style.transform = tx; this.tx = tx; }
    // stepped fade in / out
    let op = Math.min(1, Math.ceil((this.t / 0.15) * 3) / 3);
    if (this.result !== null) { this.closeT += dt; op = Math.max(0, 1 - Math.floor((this.closeT / 0.3) * 4) / 4); }
    const o = op.toFixed(2);
    if (o !== this.op) { this.el.style.opacity = o; this.op = o; }
    return this.result !== null && this.closeT >= 0.3;
  }
  dispose() { window.removeEventListener('keydown', this.onKey, true); this.el.remove(); }
}

// ------------------------------------------------------------------ the chat system
export class Talk {
  constructor(game) {
    this.game = game;
    this.session = null;
    this.waiters = [];
    this.quickList = [];
    this.memory = null; // set by the people plugin: (id) -> memory record
    this.speech = null; // set by the people plugin (src/talk/speech.js)
    this.me = null; // your own character, shown in the two-shot
    game.events.on('avatar', () => { this.me?.dispose(); this.me = null; });
  }

  get active() { return !!this.session; }
  get with() { return this.session?.spk?.ref || null; }

  /** A frame-driven wait: resolves once fn(dt) returns true. */
  until(fn) { return new Promise((res) => this.waiters.push({ fn, res })); }
  wait(sec) { let t = 0; return this.until((dt) => (t += dt) >= sec); }

  /** A quick floating reply (no camera move): resolves with the option index, -1 when ignored. */
  quick(who, options, { time = 6, prompt = '' } = {}) {
    if (this.session) return Promise.resolve(-1);
    for (const q of this.quickList) q.list.pick(-1);
    const spk = speaker(who);
    const at = spk ? (out) => { spk.headPos(out); out.y -= 0.3; return out; } : null;
    const list = new ChoiceList(this, options, { time, prompt, quick: true, at, beside: true });
    return new Promise((res) => this.quickList.push({ list, res, who, spk }));
  }

  /** Start a conversation. Resolves with the script's end value (or null if it couldn't start). */
  start(who, script, opts = {}) {
    if (this.session || this.game.cutscene?.active || this.game.pc?.active) return Promise.resolve(null);
    const spk = speaker(who, opts);
    if (!spk) return Promise.resolve(null);
    const s = new Session(this, spk, script, opts);
    this.session = s;
    return s.run().finally(() => { this.session = null; });
  }

  /** Your character for the two-shot (built once, rebuilt when your look changes). */
  avatar() {
    if (!this.me) {
      const h = createAvatarHuman(this.game.state.avatar);
      h.finishPaint?.();
      h.root.visible = false;
      h.root.name = 'talk-me';
      this.game.scene.add(h.root);
      const s = Math.max(0.85, Math.min(1.25, this.game.player.eye / (h.P.eyeY || 1.58)));
      h.root.scale.setScalar(s);
      h.tts = profileOf(h, { rate: 1.06 });
      this.me = h;
    }
    return this.me;
  }

  update(dt) {
    for (let i = this.waiters.length - 1; i >= 0; i--) { const w = this.waiters[i]; if (w.fn(dt)) { this.waiters.splice(i, 1); w.res(); } }
    for (let i = this.quickList.length - 1; i >= 0; i--) {
      const q = this.quickList[i];
      // walked away from whoever asked: the question goes unanswered
      if (q.list.result === null && q.spk) { q.spk.feet(_v); if (Math.hypot(_v.x - this.game.player.pos.x, _v.z - this.game.player.pos.z) > 7) q.list.pick(-1); }
      if (q.list.update(dt)) { q.list.dispose(); this.quickList.splice(i, 1); q.res(q.list.result); }
    }
    this.session?.update(dt);
  }
}

// ------------------------------------------------------------------ one conversation
class Session {
  constructor(talk, spk, script, opts) {
    this.talk = talk;
    this.game = talk.game;
    this.spk = spk;
    this.script = script;
    this.opts = opts;
    this.cast = {};
    for (const [k, w] of Object.entries(opts.cast || {})) this.cast[k] = speaker(w);
    this.mem = spk.id && talk.memory ? talk.memory(spk.id) : { rel: 0, flags: {}, said: [], notes: [], talks: 0 };
    this.vars = {};
    this.ended = false;
    this.cam = { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), fovDelta: 0 };
    this.camLook = new THREE.Vector3();
    this.camPos = new THREE.Vector3();
    this.line = null; // the current floating line handle
    this.choice = null;
    this.t = 0;
    this.leave = opts.leave !== false;
  }

  // ---- what scripts get
  get api() {
    const s = this;
    return {
      game: s.game, mem: s.mem, vars: s.vars, session: s,
      get npc() { return s.spk.ref; },
      say: async (text, o = {}) => { await s.effects({ gesture: o.gesture, expr: o.expr, sound: o.sound }); return s.say(s.spk, text, o); },
      me: (text, o) => s.say(s.me, text, o),
      as: (key, text, o) => s.say(s.who(key), text, o),
      effects: (o) => s.effects(o),
      choose: (opts, o) => s.choose(opts.map((x) => (typeof x === 'string' ? { text: x } : x)), o).then((r) => r.index),
      wait: (sec) => s.talk.wait(sec),
      run: (steps) => s.runSteps(Array.isArray(steps) ? steps : [steps]),
      end: () => { s.ended = true; },
    };
  }

  async run() {
    const g = this.game;
    this.enter();
    let result = null;
    try {
      await this.talk.wait(0.35);
      const sc = this.script;
      if (typeof sc === 'function') result = await sc(this.api);
      else result = await this.exec(sc);
    } catch (e) { console.error('talk script', e); }
    await this.exit();
    g.events.emit('talkEnd', { id: this.spk.id, result });
    return result;
  }

  async exec(script) {
    const nodes = Array.isArray(script) ? { start: script } : script.nodes || script;
    let name = typeof script.start === 'string' ? script.start : nodes.start ? 'start' : Object.keys(nodes)[0];
    for (let guard = 0; guard < 120 && name && !this.ended; guard++) {
      const steps = nodes[name];
      if (!steps) break;
      const r = await this.runSteps(Array.isArray(steps) ? steps : [steps]);
      if (r?.go) { name = r.go; continue; }
      return r?.end ?? null;
    }
    return null;
  }

  async runSteps(steps) {
    for (const st of steps) {
      if (this.ended) return { end: null };
      const r = await this.step(st);
      if (r) return r;
    }
    return null;
  }

  ctx() { return { game: this.game, npc: this.spk.ref, mem: this.mem, vars: this.vars, session: this, talk: this.talk }; }

  /** Evaluate a condition (see the header). */
  test(c) {
    if (c === undefined) return true;
    if (typeof c === 'function') return !!c(this.ctx());
    if (Array.isArray(c)) return c.every((x) => this.test(x));
    const g = this.game, m = this.mem;
    const str = String(c).trim();
    if (str.startsWith('quest:')) return !!g.sideQuests?.isActive(str.slice(6));
    if (str.startsWith('done:')) return !!g.sideQuests?.isDone(str.slice(5));
    const mm = /^(!)?([\w.]+)(?:\s*(>=|<=|>|<|==|!=)\s*(-?\d+(?:\.\d+)?))?$/.exec(str);
    if (!mm) return false;
    const [, not, key, op, num] = mm;
    const vars = { rel: m.rel || 0, talks: m.talks || 0, money: g.state.money, hour: g.clock?.hours ?? 12, day: g.clock?.day ?? 1, night: g.clock ? (g.clock.hours >= 19 || g.clock.hours < 5) : false, met: (m.talks || 0) > 0, open: !!g.sim?.isOpen?.() };
    let v = key in vars ? vars[key] : key in this.vars ? this.vars[key] : m.flags?.[key];
    let r;
    if (op) { const n = +num; v = +v || 0; r = op === '>=' ? v >= n : op === '<=' ? v <= n : op === '>' ? v > n : op === '<' ? v < n : op === '==' ? v === n : v !== n; } else r = !!v;
    return not ? !r : r;
  }

  fmt(t) {
    if (typeof t === 'function') t = t(this.ctx());
    if (Array.isArray(t)) t = pick(t);
    const g = this.game;
    return String(t ?? '')
      .replace(/\{name\}/g, this.spk.name)
      .replace(/\{me\}/g, g.state.avatar?.name || 'kiddo')
      .replace(/\{money\}/g, formatYen(g.state.money))
      .replace(/\{time\}/g, g.clock?.time || '');
  }

  async step(st) {
    const g = this.game, npc = this.spk.ref;
    if (typeof st === 'string' || Array.isArray(st) || typeof st === 'function') { await this.say(this.spk, st); return null; }
    if (!st || typeof st !== 'object') return null;
    if ('if' in st) {
      const ok = this.test(st.if);
      const br = ok ? st.then : st.else;
      if (br === undefined) { if (!ok) return null; }
      else if (typeof br === 'string') return { go: br };
      else { const r = await this.runSteps(Array.isArray(br) ? br : [br]); if (r) return r; }
    }
    if (st.once) { const k = 'once_' + st.once; if (this.mem.flags[k]) return null; this.mem.flags[k] = true; }
    if (st.pick) { const r = await this.step(pick(st.pick)); if (r) return r; }
    const fx = await this.effects(st);
    if (fx) return fx;
    if (st.say !== undefined) await this.say(this.who(st.who), st.say, { style: st.style });
    if (st.me !== undefined) await this.say(this.me, st.me, { style: st.style });
    if (st.wait) await this.talk.wait(st.wait);
    if (st.choose) {
      const r = await this.choose(st.choose, st);
      if (r.go || r.end !== undefined) return r;
    }
    if (st.go) return { go: st.go };
    if ('end' in st) return { end: st.end };
    return null;
  }

  /** The side effects a step or a chosen option can carry (see the header). */
  async effects(st) {
    const g = this.game, npc = this.spk.ref;
    if (st.do) await st.do(this.ctx());
    if (st.rel) this.rel(st.rel);
    if (st.set) Object.assign(this.mem.flags, st.set);
    if (st.remember) this.note(this.fmt(st.remember));
    if (st.quest) g.sideQuests?.start(st.quest);
    if (st.advance) g.sideQuests?.advance(st.advance);
    if (st.give) { g.addMoney(st.give); this.note(`gave you ${formatYen(st.give)}`); }
    if (st.pay) { if (!g.spend(st.pay)) { await this.say(this.me, pick(["I... don't have that much.", 'My wallet is empty...'])); return { end: 'broke' }; } }
    if (st.gesture) (npc?.gesture ? npc.gesture(st.gesture) : this.spk.h?.gesture?.(st.gesture));
    if (st.expr) (npc?.expr ? npc.expr(st.expr, 3) : this.spk.h?.setExpression?.(st.expr, 3));
    if (st.sound) sfx(st.sound, 0.6);
    return null;
  }

  /** A speaker named in a step's `who`: a cast member, you, or an off-screen voice (someone calling from a house). */
  who(key) {
    if (!key) return this.spk;
    if (key === 'me') return this.me;
    if (this.cast[key]) return this.cast[key];
    const base = this.spk;
    const off = { name: key.toUpperCase(), color: '#e8a0c0', tts: { gender: 'f', pitch: 1.2, seed: key.length }, onChar: blipVoice(null, { base: 280, duty: 0.25, vol: 0.6 }) };
    off.target = () => base.headPos(new THREE.Vector3()).add(new THREE.Vector3(0, 0.75, 0)).addScaledVector(this.right || UP, -0.6);
    this.cast[key] = off;
    return off;
  }

  rel(n) {
    const m = this.mem;
    m.rel = Math.max(-10, Math.min(10, (m.rel || 0) + n));
    this.game.events.emit('npcRel', { id: this.spk.id, rel: m.rel, delta: n });
  }
  note(text) { const m = this.mem; (m.notes ||= []).push({ t: this.game.clock?.stamp ?? 0, text }); if (m.notes.length > 20) m.notes.shift(); }

  // ---- lines
  /** One floating line; waits until typed + read (a click / Space / E skips ahead). */
  async say(who, text, o = {}) {
    if (!who) return;
    text = this.fmt(text);
    if (!text) return;
    const g = this.game, isMe = who === this.me;
    const B = g.bubbles;
    const style = o.style || (isMe ? 'me' : 'say');
    this.line = B.say(who.target, text, { big: true, name: isMe ? 'You' : who.name, color: isMe ? '#bfe8ff' : who.color, style, hold: true, onChar: who.onChar, cps: 34 });
    this.talk.speech?.speak(text, who.tts, { priority: 'talk' });
    const read = Math.min(3.4, 0.9 + text.length * 0.03);
    let after = 0, armed = false;
    await this.talk.until((dt) => {
      const inp = g.input;
      const adv = (inp.buttonDown(0) && armed) || inp.keyPressed?.('Space') || inp.keyPressed?.('KeyE') || inp.keyPressed?.('Enter');
      if (!inp.button(0)) armed = true;
      if (!this.line.typed) { if (adv) this.line.finish(); return false; }
      after += dt;
      return adv || after > read || this.ended;
    });
    this.line.close();
    this.line = null;
  }

  /** Floating options next to you; resolves { index, go, end }. */
  async choose(options, st = {}) {
    const shown = options.filter((o) => this.test(o.if));
    if (!shown.length) return { index: -1 };
    const texts = shown.map((o) => this.fmt(o.text));
    const at = (out) => { this.mePos(out); return out; };
    const list = new ChoiceList(this.talk, texts, { time: st.time || 0, at, prompt: st.prompt ? this.fmt(st.prompt) : '' });
    this.choice = list;
    await this.talk.until((dt) => list.update(dt));
    list.dispose();
    this.choice = null;
    let i = list.result;
    if (i < 0) {
      // ran out of time (or left): the timeout option, the `late` node, or the chat just ends
      if (typeof st.timeout === 'number' && shown[st.timeout]) i = st.timeout;
      else if (typeof st.timeout === 'string') return { index: -1, go: st.timeout };
      else return st.late ? { index: -1, go: st.late } : { index: -1, end: 'timeout' };
      if (st.timeout !== undefined && shown[i]) await this.say(this.me, '...!', { style: 'me' });
    }
    const o = shown[i];
    this.mem.said = this.mem.said || [];
    if (o.remember !== false) { this.mem.said.push({ t: this.game.clock?.stamp ?? 0, text: texts[i] }); if (this.mem.said.length > 16) this.mem.said.shift(); }
    if (!o.silent && list.result >= 0) await this.say(this.me, o.say ?? texts[i]);
    const fx = await this.effects(o);
    if (fx) return { index: i, ...fx };
    if (o.then) { const r = await this.runSteps(Array.isArray(o.then) ? o.then : [o.then]); if (r) return { index: i, ...r }; }
    if (o.go) return { index: i, go: o.go };
    if ('end' in o) return { index: i, end: o.end };
    this.vars.choice = o.value ?? i;
    return { index: i };
  }

  // ---- staging
  get me() {
    if (!this._me) {
      const h = this.talk.avatar();
      this._me = { h, name: 'You', color: '#bfe8ff', target: h, tts: h.tts, onChar: blipVoice(null, { base: 245, duty: 0.25, vol: 0.9 }), ref: null, headPos: (out) => { h.headTop(out); out.y -= 0.32; return out; } };
    }
    return this._me;
  }
  /** Where your choices float: beside your shoulder, toward the camera's side. */
  mePos(out) {
    const P = this.game.player;
    out.set(P.pos.x, P.eye - 0.12, P.pos.z);
    _w.copy(this.dir);
    // to your left (screen left in the over-the-shoulder shot), a little forward
    out.x += -this.right.x * 0.5 + _w.x * 0.15; out.z += -this.right.z * 0.5 + _w.z * 0.15;
    return out;
  }

  enter() {
    const g = this.game, P = g.player, spk = this.spk;
    this.prev = { frozen: P.frozen, uiOpen: g.uiOpen, interaction: g.interaction.enabled, anchor: g.held.anchor.visible };
    P.frozen = true;
    g.uiCine = true;
    g.uiOpen = true; // the hotbar keys, Q-drop and the pause-on-unlock wait while you talk
    g.interaction.enabled = false;
    g.interaction.setHint?.(null);
    g.held.anchor.visible = false;
    g.clock?.hold('talk');
    document.body.classList.add('cine', 'talking');
    // stand at a comfortable distance, facing each other
    spk.headPos(_v);
    const feet = spk.feet(_u);
    this.dir = new THREE.Vector3(feet.x - P.pos.x, 0, feet.z - P.pos.z);
    let d = this.dir.length();
    if (d < 0.01) { this.dir.set(0, 0, -1); d = 1; }
    this.dir.divideScalar(d);
    const want = Math.max(1.15, Math.min(1.8, d));
    if (Math.abs(want - d) > 0.05) {
      const ox = P.pos.x, oz = P.pos.z;
      P.pos.x = feet.x - this.dir.x * want; P.pos.z = feet.z - this.dir.z * want;
      P.collide?.();
      if (Math.hypot(P.pos.x - ox, P.pos.z - oz) > 1) { P.pos.x = ox; P.pos.z = oz; }
    }
    this.right = new THREE.Vector3(-this.dir.z, 0, this.dir.x);
    // they turn to you
    const ref = spk.ref;
    ref.talkLock = true;
    if (ref.stop && ref.walk) ref.stop();
    if (ref.faceTo) ref.faceTo(P.pos);
    else if (spk.h && !ref.noTurn) this.turnH = true;
    // your character steps into the shot
    const me = this.me.h;
    me.root.visible = true;
    me.root.position.set(P.pos.x, 0, P.pos.z);
    me.root.rotation.set(0, Math.atan2(this.dir.x, this.dir.z), 0);
    me.hasPrev = false;
    this.pickShot();
    P.lookOverride = this.cam;
    this.track(1);
    sfx('whoosh', 0.18);
  }

  /** Choose the over-the-shoulder side the walls allow (right shoulder, left shoulder, a closer side-on view). */
  pickShot() {
    const g = this.game, P = g.player;
    const obs = P.obstacles || [];
    const blocked = (x, z) => obs.some((o) => o.enabled !== false && x > o.minX - 0.12 && x < o.maxX + 0.12 && z > o.minZ - 0.12 && z < o.maxZ + 0.12);
    const shots = [[0.95, 0.52], [0.95, -0.52], [0.5, 0.62], [0.5, -0.62], [0.15, 0.9], [0.15, -0.9]];
    for (const [back, side] of shots) {
      const x = P.pos.x - this.dir.x * back + this.right.x * side, z = P.pos.z - this.dir.z * back + this.right.z * side;
      if (!blocked(x, z)) { this.shot = { back, side }; break; }
    }
    if (!this.shot) this.shot = { back: 0.2, side: 0.3 };
    if (this.shot.side < 0) this.right.negate(); // keep "right" = the camera's side (choices float on the other side)
    this.shot.side = Math.abs(this.shot.side);
  }

  /** Frame both of you (k: 1 = snap). */
  track(k) {
    const g = this.game, P = g.player;
    const eye = _w.set(P.pos.x, P.eye, P.pos.z);
    this.spk.headPos(_v);
    const { back, side } = this.shot;
    const pos = _u.copy(eye).addScaledVector(this.dir, -back).addScaledVector(this.right, side);
    pos.y = eye.y + 0.12;
    const look = _v.lerp(eye, 0.28);
    look.addScaledVector(this.right, -0.1);
    look.y -= 0.06;
    // a slow handheld drift
    const t = this.t;
    pos.x += Math.sin(t * 0.7) * 0.008; pos.y += Math.sin(t * 0.9 + 1) * 0.006;
    if (k >= 1) { this.camPos.copy(pos); this.camLook.copy(look); } else { this.camPos.lerp(pos, k); this.camLook.lerp(look, k); }
    this.cam.pos.copy(this.camPos);
    this.cam.quat.setFromRotationMatrix(_m.lookAt(this.camPos, this.camLook, UP));
    this.cam.fovDelta = Math.max(0, P.baseFov - 52);
  }

  update(dt) {
    const g = this.game;
    this.t += dt;
    if (this.exiting) return;
    this.track(Math.min(1, dt * 4));
    // both of you keep animating: they look at you, you look at them
    const me = this.me.h;
    this.spk.headPos(_v);
    me.update(dt, { speed: 0, lookAt: _v, talking: g.bubbles.isTalking(me) });
    if (this.turnH && this.spk.h) {
      const r = this.spk.h.root, want = Math.atan2(g.player.pos.x - r.position.x, g.player.pos.z - r.position.z);
      r.rotation.y += Math.atan2(Math.sin(want - r.rotation.y), Math.cos(want - r.rotation.y)) * Math.min(1, dt * 5);
    }
    // Q leaves early
    if (this.leave && g.input.keyPressed?.('KeyQ')) this.ended = true;
  }

  async exit() {
    const g = this.game, P = g.player;
    this.exiting = true;
    g.bubbles.clear(this.me.target);
    g.bubbles.clear(this.spk.target);
    this.talk.speech?.stop();
    P.lookOverride = null;
    await this.talk.until(() => P.camBlend < 0.35);
    this.me.h.root.visible = false;
    await this.talk.until(() => P.camBlend < 0.06);
    P.frozen = this.prev.frozen;
    g.uiCine = false;
    g.uiOpen = this.prev.uiOpen || false;
    g.interaction.enabled = this.prev.interaction !== false;
    g.held.anchor.visible = true;
    g.clock?.release('talk');
    document.body.classList.remove('cine', 'talking');
    // the pointer came loose during the chat (Esc): now show the pause menu the game would have shown
    if (!g.input.locked && !g.input.touch && !/autotest/.test(location.search)) g.input.onLockChange?.(false);
    const ref = this.spk.ref;
    ref.talkLock = false;
    // remember the chat
    this.mem.talks = (this.mem.talks || 0) + 1;
    this.mem.last = g.clock?.stamp ?? 0;
    g.save?.();
  }
}
