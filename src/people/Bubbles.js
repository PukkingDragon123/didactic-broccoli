// Floating pixel text near a speaker's head (no bubble shapes, no tails, no glows): a line of crisp Alagard text on a
// small dark backing strip, typed out letter by letter (onChar drives the 8-bit voice), fading in and out in steps.
// Several lines from one speaker stack upward (the older one drifts up and leaves sooner); lines from different
// speakers are kept apart (the nearer speaker keeps its place, the others slide up or aside). Speakers just off
// screen but close by keep talking at the screen edge with a little arrow. Positioned with transforms only (one
// layout read per line, when it is created).
//   const bubbles = new Bubbles(camera, document.body);
//   const line = bubbles.say(human, 'Hello!', { dur: 3, style: 'say' | 'think' | 'shout' | 'me', onChar: (ch) => blip() });
//   line.close() / line.finish() (type the rest at once) / line.done / line.typed
//   bubbles.isTalking(human)   bubbles.clear(human?)   bubbles.update(dt)   (every frame, after the speakers moved)
// opts: dur (seconds on screen, at least long enough to read), style, onChar(ch), cps (letters per second),
//       offset (m above an Object3D target), name + color (a speaker tag, shown in 'big' lines), big (cinematic chat:
//       wider, beside the head), side ('auto' | 'left' | 'right' | 'above'), hold (true: stay until closed).
// bubbles.onSay = (target, text, opts) => {}   a hook called for every new line (the real-voice layer uses it).
import * as THREE from 'three';
import './bubbles.css';

const MAX_DIST = 18; // metres: farther speakers are not shown
const EDGE_DIST = 7; // speakers this close but off screen talk from the screen edge
const _v = new THREE.Vector3(), _c = new THREE.Vector3(), _cs = new THREE.Vector3();
const STEPS_IN = 3, STEPS_OUT = 4; // stepped fades

export class Bubbles {
  constructor(camera, container = document.body) {
    this.camera = camera;
    this.layer = document.createElement('div');
    this.layer.className = 'ft-layer';
    container.appendChild(this.layer);
    this.container = container;
    this.list = [];
    this.vis = [];
    this.placed = [];
    this.onSay = null;
    this.resize();
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    // if some element other than our container goes fullscreen, follow it so lines stay visible
    this._onFs = () => {
      const fs = document.fullscreenElement;
      const host = fs && fs.tagName !== 'CANVAS' && !fs.contains(this.container) ? fs : this.container;
      if (this.layer.parentNode !== host) host.appendChild(this.layer);
      this.resize();
    };
    document.addEventListener('fullscreenchange', this._onFs);
  }

  resize() {
    const r = this.layer.getBoundingClientRect();
    this.W = r.width || innerWidth; this.H = r.height || innerHeight;
  }

  /** Show a line near `target` (a Human, anything with headTop(out), an Object3D, or a function returning a Vector3). */
  say(target, text, opts = {}) {
    text = String(text ?? '');
    const style = opts.style || 'say';
    // an older line from the same speaker moves up the stack and leaves sooner
    for (const o of this.list) if (o.target === target && !o.closing) { o.stack++; o.life = Math.min(o.life, o.t + (o.stack > 1 ? 0.6 : 2.2)); }
    const el = document.createElement('div');
    el.className = `ft ft-${style}${opts.big ? ' ft-big' : ''}`;
    el.style.visibility = 'hidden';
    const inner = document.createElement('div'); inner.className = 'ft-in';
    if (opts.big && opts.name) {
      const tag = document.createElement('div'); tag.className = 'ft-name'; tag.textContent = opts.name;
      if (opts.color) tag.style.color = opts.color;
      inner.appendChild(tag);
    }
    const txt = document.createElement('div'); txt.className = 'ft-txt';
    const chars = [];
    for (const w of text.split(/(\s+)/)) {
      if (!w) continue;
      if (/^\s+$/.test(w)) { txt.appendChild(document.createTextNode(' ')); chars.push({ ch: ' ', el: null }); continue; }
      const we = document.createElement('span'); we.className = 'ft-w';
      for (const ch of w) { const c = document.createElement('span'); c.className = 'ft-c'; c.textContent = ch; we.appendChild(c); chars.push({ ch, el: c }); }
      txt.appendChild(we);
    }
    inner.appendChild(txt);
    const arrow = document.createElement('div'); arrow.className = 'ft-arrow';
    el.append(inner, arrow);
    this.layer.appendChild(el);
    // one measurement per line, then everything is fixed size
    const w = Math.ceil(inner.offsetWidth), h = Math.ceil(inner.offsetHeight);
    // typewriter schedule with little pauses on punctuation
    const cps = opts.cps || (style === 'shout' ? 42 : 32);
    let t = 0.1;
    for (let i = 0; i < chars.length; i++) {
      chars[i].at = t;
      const ch = chars[i].ch, next = chars[i + 1]?.ch;
      t += 1 / cps;
      if (next && /[.!?]/.test(ch) && !/[.!?]/.test(next)) t += 0.2;
      else if (next && /[,;:]/.test(ch)) t += 0.09;
    }
    const reveal = t;
    const life = opts.hold ? Infinity : Math.max(opts.dur ?? 1.8 + text.length * 0.055, reveal + 1.2);
    const b = {
      target, el, inner, arrow, chars, next: 0, style, t: 0, reveal, life, closing: false, closeT: 0, closeDur: 0.28,
      onChar: opts.onChar, offset: opts.offset ?? 0.3, w, h, stack: 0, stackY: 0, side: opts.side || (opts.big ? 'auto' : 'above'),
      big: !!opts.big, x: 0, y: 0, vis: false, z: -1, dist: 0, op: '', lift: 0, dx: 0, edge: 0, tx: '', sideNow: 0,
    };
    b.handle = {
      close: () => this.close(b),
      finish: () => { b.t = Math.max(b.t, b.reveal); },
      get done() { return b.dead === true; },
      get typed() { return b.next >= b.chars.length; },
      get line() { return b; },
    };
    this.list.push(b);
    try { this.onSay?.(target, text, opts); } catch (e) { console.warn(e); }
    return b.handle;
  }

  /** Is the speaker's line still typing (drive the mouth with this)? */
  isTalking(target) {
    for (const b of this.list) if (b.target === target && !b.closing && b.t < b.reveal + 0.05) return true;
    return false;
  }
  /** Close the target's lines (or every line if no target). */
  clear(target) { for (const b of this.list) if (!target || b.target === target) this.close(b, 0.16); }

  close(b, dur = 0.28) { if (!b.closing) { b.closing = true; b.closeT = 0; b.closeDur = dur; } }

  anchor(b, out) {
    const tg = b.target;
    if (typeof tg === 'function') return out.copy(tg());
    if (tg.headTop) return tg.headTop(out);
    tg.getWorldPosition(out); out.y += b.offset; return out;
  }

  update(dt) {
    const cam = this.camera;
    cam.updateMatrixWorld();
    cam.getWorldPosition(_c);
    const W = this.W, H = this.H, vis = this.vis;
    vis.length = 0;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const b = this.list[i];
      b.t += dt;
      // typewriter
      while (b.next < b.chars.length && b.chars[b.next].at <= b.t) {
        const c = b.chars[b.next++];
        if (c.el) c.el.classList.add('on');
        b.onChar?.(c.ch);
      }
      if (!b.closing && b.t > b.life) this.close(b);
      let k;
      if (b.closing) {
        b.closeT += dt;
        const u = Math.min(1, b.closeT / b.closeDur);
        if (u >= 1) { b.el.remove(); b.dead = true; this.list.splice(i, 1); continue; }
        k = 1 - Math.floor(u * STEPS_OUT) / STEPS_OUT;
      } else k = Math.min(1, Math.ceil((b.t / 0.16) * STEPS_IN) / STEPS_IN);
      b.k = k;
      // project (camera space first: lines from just behind you go to the screen edge)
      this.anchor(b, _v);
      b.dist = _v.distanceTo(_c);
      _cs.copy(_v).applyMatrix4(cam.matrixWorldInverse);
      const fade = b.dist > MAX_DIST ? 0 : 1;
      if (fade <= 0) { this.hide(b); continue; }
      _v.project(cam);
      const onScreen = _cs.z < -0.05 && Math.abs(_v.x) < 1.02 && Math.abs(_v.y) < 1.05;
      if (onScreen) {
        b.edge = 0;
        b.x = (_v.x * 0.5 + 0.5) * W; b.y = (-_v.y * 0.5 + 0.5) * H;
      } else if (b.dist < EDGE_DIST && !b.big) {
        // off screen but close: talk from the left / right edge, at a third of the height
        const sx = _cs.z < -0.05 ? Math.sign(_v.x) || 1 : Math.sign(_cs.x) || 1;
        b.edge = sx;
        b.x = sx > 0 ? W - 14 - b.w / 2 : 14 + b.w / 2;
        b.y = H * 0.42;
      } else { this.hide(b); continue; }
      vis.push(b);
    }
    // nearer speakers keep their place; farther ones that would overlap slide aside or float up
    vis.sort((a, b) => a.dist - b.dist);
    // at most two people talk from the screen edges at once (the nearest)
    let edges = 0;
    for (let i = 0; i < vis.length; i++) if (vis[i].edge && ++edges > 2) { this.hide(vis[i]); vis.splice(i--, 1); }
    const placed = this.placed;
    placed.length = 0;
    for (const b of vis) {
      const bw = b.w, bh = b.h;
      // base box: above the head (or beside it for cinematic lines), stacked lines above the newer ones
      let cx = b.x, bot = b.y - 6;
      if (b.edge) bot = b.y + bh / 2;
      else if (b.side !== 'above') {
        const right = b.side === 'right' || (b.side === 'auto' && b.x < W * 0.5);
        if (b.sideNow === 0) b.sideNow = right ? 1 : -1;
        cx = b.x + b.sideNow * (bw / 2 + 34);
        bot = b.y + bh * 0.6;
      }
      cx = Math.max(8 + bw / 2, Math.min(W - 8 - bw / 2, cx));
      const stackT = this.stackOffset(b);
      b.stackY += (stackT - b.stackY) * Math.min(1, dt * 12);
      bot -= b.stackY;
      const rect = (dx, lift) => [cx + dx - bw / 2, bot - lift - bh, cx + dx + bw / 2, bot - lift];
      const hit = (r) => { for (const o of placed) if (o.t !== b.target && r[0] < o.r[2] + 4 && r[2] > o.r[0] - 4 && r[1] < o.r[3] + 3 && r[3] > o.r[1] - 3) return o.r; return null; };
      let best = [0, 0], bestCost = Infinity;
      const queue = [[0, 0, 0]];
      for (let n = 0; n < 20 && queue.length; n++) {
        const [dx, lift, depth] = queue.shift();
        const r = rect(dx, lift), o = hit(r);
        const cost = Math.abs(dx) + lift * 1.5;
        if (!o) { if (cost < bestCost) { bestCost = cost; best = [dx, lift]; } continue; }
        if (depth > 3 || cost >= bestCost) continue;
        const right = dx + (o[2] + 5 - r[0]), left = dx - (r[2] - (o[0] - 5));
        if (Math.abs(right) < bw * 0.6) queue.push([right, lift, depth + 1]);
        if (Math.abs(left) < bw * 0.6) queue.push([left, lift, depth + 1]);
        queue.push([dx, lift + (r[3] - (o[1] - 4)), depth + 1]);
      }
      if (bestCost === Infinity) best = [0, 0];
      b.dx += (best[0] - b.dx) * Math.min(1, dt * 10);
      b.lift += (Math.min(best[1], 240) - b.lift) * Math.min(1, dt * 10);
      b.bx = cx + b.dx; b.by = bot - b.lift;
      if (!b.closing) placed.push({ r: rect(b.dx, b.lift), t: b.target });
    }
    for (const b of vis) {
      if (!b.vis) { b.el.style.visibility = ''; b.vis = true; }
      const x = Math.round(b.bx - b.w / 2), y = Math.round(Math.max(4, Math.min(H - b.h - 4, b.by - b.h)));
      const tx = `translate3d(${x}px,${y}px,0)`;
      if (tx !== b.tx) { b.el.style.transform = tx; b.tx = tx; }
      const op = b.k.toFixed(2);
      if (op !== b.op) { b.el.style.opacity = op; b.op = op; }
      const ed = b.edge > 0 ? 'r' : b.edge < 0 ? 'l' : '';
      if (ed !== b.ed) { b.el.dataset.edge = ed; b.ed = ed; }
      const z = Math.round(1000 - b.dist * 20) + (b.big ? 500 : 0);
      if (z !== b.z) { b.el.style.zIndex = z; b.z = z; }
    }
  }

  /** How far up a line sits in its speaker's stack (newer lines below older ones). */
  stackOffset(b) {
    if (!b.stack) return 0;
    let y = 0;
    for (const o of this.list) if (o !== b && o.target === b.target && o.stack < b.stack && !o.dead) y += o.h + 4;
    return y;
  }

  hide(b) { if (b.vis) { b.el.style.visibility = 'hidden'; b.vis = false; } }

  dispose() {
    window.removeEventListener('resize', this._onResize);
    document.removeEventListener('fullscreenchange', this._onFs);
    this.layer.remove();
    this.list.length = 0;
  }
}
