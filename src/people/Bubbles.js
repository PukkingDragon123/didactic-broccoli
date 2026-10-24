// Floating 2D speech bubbles over 3D speakers. Each bubble is a pixel-art cloud (rendered once into a tiny
// canvas at 2 CSS px per art pixel, scaled with image-rendering: pixelated so it stays crisp on any DPI),
// with crisp pixel-font text that types itself in letter by letter. Pop-in with squash & stretch, gentle float,
// distance scaling, edge clamping (the tail keeps pointing at the speaker), quick cross-fade when a speaker
// says something new, fade + shrink out. Positioned with transforms only (no layout reads per frame).
//   const bubbles = new Bubbles(camera, document.body);
//   bubbles.say(human, 'Hello!', { dur: 3, style: 'say' | 'think' | 'shout', onChar: (ch) => blip() });
//   bubbles.update(dt);   // every frame, after the humans moved
import * as THREE from 'three';
import './bubbles.css';

const A = 2; // CSS px per art pixel
const INK = [44, 30, 42];
const FILL = { say: [255, 253, 248], think: [250, 249, 255], shout: [255, 250, 222] };
const SHADE = { say: [[212, 216, 232], [232, 234, 244]], think: [[214, 210, 236], [234, 232, 248]], shout: [[244, 214, 150], [252, 236, 186]] };
const TAIL_H = 9; // art px from the body's bottom edge to the speaker point
const MAX_DIST = 16;
const _v = new THREE.Vector3(), _c = new THREE.Vector3();

function hash(i, s) { let h = (i * 374761393 + s * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

/** Rasterise a shape test into an ImageData with a 1 art-px ink outline, puffy under-shading and a drop shadow. */
function rasterize(ctx, w, h, inside, style, topOpen = null) {
  const img = ctx.createImageData(w, h), d = img.data;
  const ins = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) ins[y * w + x] = inside(x + 0.5, y + 0.5) ? 1 : 0;
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : ins[y * w + x]);
  const fill = FILL[style], [s1, s2] = SHADE[style];
  const put = (x, y, c, a = 255) => { const p = (y * w + x) * 4; d[p] = c[0]; d[p + 1] = c[1]; d[p + 2] = c[2]; d[p + 3] = a; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (at(x, y)) {
      let c = fill;
      if (!at(x, y + 1)) c = s1; else if (!at(x, y + 2)) c = s2;
      else if (!at(x, y - 1) && style !== 'shout') c = [255, 255, 255];
      put(x, y, c);
      if (topOpen && topOpen(x, y)) put(x, y, fill);
    } else {
      let edge = 0;
      for (let j = -1; j <= 1 && !edge; j++) for (let i = -1; i <= 1; i++) if ((i || j) && at(x + i, y + j)) { edge = 1; break; }
      if (edge && !(topOpen && topOpen(x, y))) put(x, y, INK);
      else if (at(x - 1, y - 2) || at(x, y - 2)) { const p = (y * w + x) * 4; d[p] = 28; d[p + 1] = 16; d[p + 2] = 30; d[p + 3] = 70; }
    }
  }
  ctx.putImageData(img, 0, 0);
}

/** Cloud / spiky body around a text box of iw x ih art px. Returns { canvas, w, h, tx, ty, bottom(x) }. */
function makeBody(iw, ih, style, seed) {
  const padX = style === 'shout' ? 9 : 6, padY = style === 'shout' ? 7 : 4;
  const cw = iw + padX * 2, chh = ih + padY * 2;
  const r = Math.max(5, Math.min(9, Math.round(chh * 0.42)));
  const m = style === 'shout' ? 7 : Math.ceil(r * 0.75) + 2;
  const w = cw + m * 2, h = chh + m * 2 + 3;
  const x0 = m, y0 = m, x1 = m + cw, y1 = m + chh;
  let inside;
  if (style === 'shout') {
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = cw / 2 + 4, ry = chh / 2 + 3;
    const n = Math.max(12, Math.round((cw + chh) / 7));
    inside = (x, y) => {
      const dx = (x - cx) / rx, dy = (y - cy) / ry, a = Math.atan2(dy, dx);
      const f = (a / (Math.PI * 2) + 1) * n, q = (((f + hash(Math.floor(f), seed) * 0.2) % 1) + 1) % 1;
      const spike = 1 + 0.22 * (1 - Math.abs(q - 0.5) * 2) ** 1.6;
      return dx * dx + dy * dy < spike * spike * (1 - 0.06 * Math.abs(Math.sin(a * 2)));
    };
  } else {
    const puffs = [];
    const rr = style === 'think' ? r * 0.92 : r;
    const nTop = Math.max(2, Math.round(cw / (rr * 1.45))), nBot = Math.max(2, Math.round(cw / (rr * 1.7)));
    for (let i = 0; i < nTop; i++) puffs.push([x0 + rr * 0.55 + (cw - rr * 1.1) * (nTop === 1 ? 0.5 : i / (nTop - 1)), y0 + rr * 0.42 - hash(i, seed) * 1.2, rr * (0.92 + hash(i + 9, seed) * 0.2)]);
    for (let i = 0; i < nBot; i++) puffs.push([x0 + rr * 0.7 + (cw - rr * 1.4) * (nBot === 1 ? 0.5 : i / (nBot - 1)) + (hash(i + 3, seed) - 0.5) * 2, y1 - rr * 0.5 + hash(i + 5, seed), rr * (0.85 + hash(i + 7, seed) * 0.2)]);
    const nSide = Math.max(1, Math.round((chh - rr) / (rr * 1.3)));
    for (let i = 0; i < nSide; i++) { const yy = y0 + chh * (i + 0.5) / nSide; puffs.push([x0 + rr * 0.35, yy, rr * 0.95], [x1 - rr * 0.35, yy, rr * 0.95]); }
    inside = (x, y) => {
      if (x > x0 + 1 && x < x1 - 1 && y > y0 + 1 && y < y1 - 1) return true;
      for (const [px, py, pr] of puffs) { const dx = x - px, dy = y - py; if (dx * dx + dy * dy < pr * pr) return true; }
      return false;
    };
  }
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.className = 'hb-bg';
  canvas.style.width = w * A + 'px'; canvas.style.height = h * A + 'px';
  rasterize(canvas.getContext('2d'), w, h, inside, style);
  // lowest filled row per column (where the tail attaches)
  const low = (x) => { for (let y = h - 1; y >= 0; y--) if (inside(x + 0.5, y + 0.5)) return y; return y1; };
  return { canvas, w, h, tx: x0 + padX, ty: y0 + padY, low };
}

/** Tail canvas: tip at the bottom-centre column `cx`, top attached `lean` art px to the side. */
function drawTail(cv, style, lean, depth, seed, extra = 0) {
  const w = 30, h = TAIL_H + depth + extra;
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; cv.style.width = w * A + 'px'; cv.style.height = h * A + 'px'; }
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  const cx = 15, top = 0, tip = h - 1;
  let inside;
  if (style === 'think') {
    // three shrinking puffs down to the speaker
    const pts = extra > 6 ? [[0.25, 3.2], [0.5, 2.6], [0.74, 2], [0.94, 1.4]] : [[0.38, 3.2], [0.68, 2.3], [0.93, 1.5]];
    inside = (x, y) => pts.some(([t, r]) => { const py = depth + (tip - depth) * t, px = cx + lean * (1 - t) * 0.8; return (x - px) ** 2 + (y - py) ** 2 < r * r; });
    rasterize(ctx, w, h, inside, style);
    return;
  }
  if (style === 'shout') {
    inside = (x, y) => {
      if (y < top || y > tip) return false;
      const t = (y - top) / (tip - top), mid = cx + lean * (1 - t);
      const zig = (Math.floor(t * 3) % 2 ? 1.5 : -1.5) * (1 - t);
      return Math.abs(x - mid - zig) < 4.2 * (1 - t) + 0.4;
    };
  } else {
    inside = (x, y) => {
      if (y < top || y > tip + 0.5) return false;
      const t = (y - top) / (tip - top);
      const mid = cx + lean * (1 - t) * (1 - t * 0.4) + Math.sin(t * Math.PI) * 1.6;
      return Math.abs(x - mid) < 4.4 * (1 - t) ** 0.8 + 0.35;
    };
  }
  // the top rows sit inside the body: no outline there, so tail and cloud merge
  rasterize(ctx, w, h, inside, style, (x, y) => y < depth);
}

export class Bubbles {
  constructor(camera, container = document.body) {
    this.camera = camera;
    this.layer = document.createElement('div');
    this.layer.className = 'hb-layer';
    container.appendChild(this.layer);
    this.container = container;
    this.list = [];
    this.seed = 1;
    this.resize();
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    // if some element other than our container goes fullscreen, follow it so bubbles stay visible
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

  /**
   * Show a bubble over `target` (a Human, an Object3D, or a function returning a Vector3).
   * opts: { dur (total seconds, at least long enough to read), style: 'say' | 'think' | 'shout', onChar(ch), cps, offset (m, for Object3D) }.
   */
  say(target, text, opts = {}) {
    const style = opts.style || 'say';
    const old = this.list.find((b) => b.target === target && !b.closing);
    if (old) this.close(old, 0.12);
    text = String(text);
    const el = document.createElement('div');
    el.className = `hb ${style}`;
    el.style.opacity = '0';
    const inner = document.createElement('div'); inner.className = 'hb-in';
    const body = document.createElement('div'); body.className = 'hb-body';
    const txt = document.createElement('div'); txt.className = 'hb-txt';
    const chars = [];
    const words = text.split(/(\s+)/);
    for (const w of words) {
      if (!w) continue;
      if (/^\s+$/.test(w)) { txt.appendChild(document.createTextNode(' ')); chars.push({ ch: ' ', el: null }); continue; }
      const we = document.createElement('span'); we.className = 'hb-w';
      for (const ch of w) { const c = document.createElement('span'); c.className = 'hb-c'; c.textContent = ch; we.appendChild(c); chars.push({ ch, el: c }); }
      txt.appendChild(we);
    }
    body.appendChild(txt);
    const tail = document.createElement('canvas'); tail.className = 'hb-tail';
    inner.append(body, tail);
    el.appendChild(inner);
    el.style.visibility = 'hidden';
    this.layer.appendChild(el);
    // one measurement per bubble, then everything is fixed size
    const tw = Math.ceil(txt.offsetWidth), th = Math.ceil(txt.offsetHeight);
    const seed = this.seed++;
    const bg = makeBody(Math.ceil(tw / A), Math.ceil(th / A), style, seed);
    body.prepend(bg.canvas);
    body.style.width = bg.w * A + 'px'; body.style.height = bg.h * A + 'px'; body.style.left = -bg.w * A / 2 + 'px';
    txt.style.left = bg.tx * A + Math.round(((Math.ceil(tw / A) * A) - tw) / 2) + 'px';
    txt.style.top = bg.ty * A + 'px';
    txt.style.width = tw + 'px';
    // reveal schedule (typewriter with little pauses on punctuation)
    const cps = opts.cps || (style === 'shout' ? 40 : 30);
    let t = 0.12;
    for (let i = 0; i < chars.length; i++) {
      chars[i].at = t;
      const ch = chars[i].ch, next = chars[i + 1]?.ch;
      t += 1 / cps;
      if (next && /[.!?]/.test(ch) && !/[.!?]/.test(next)) t += 0.22;
      else if (next && /[,;:]/.test(ch)) t += 0.1;
    }
    const reveal = t;
    const life = Math.max(opts.dur ?? 1.6 + text.length * 0.055, reveal + 1.1);
    const b = {
      target, el, inner, body, tail, txt, chars, next: 0, style, bg, t: 0, reveal, life, closing: false, closeT: 0, closeDur: 0.24,
      onChar: opts.onChar, offset: opts.offset ?? 0.3, seed, lean: null, phase: Math.random() * 6, delay: old ? 0.07 : 0,
      x: 0, y: 0, ds: 1, vis: false, z: -1, bw: bg.w * A, leanPx: 0, liftS: 0, liftT: 0, extra: 0, dist: 0,
    };
    b.handle = { close: () => this.close(b), get done() { return b.dead === true; } };
    el.style.visibility = '';
    this.list.push(b);
    return b.handle;
  }

  /** Is the speaker's bubble still typing (drive the mouth with this)? */
  isTalking(target) {
    for (const b of this.list) if (b.target === target && !b.closing && b.t < b.reveal + 0.05) return true;
    return false;
  }
  /** Close the target's bubbles (or every bubble if no target). */
  clear(target) { for (const b of this.list) if (!target || b.target === target) this.close(b, 0.14); }

  close(b, dur = 0.24) { if (!b.closing) { b.closing = true; b.closeT = 0; b.closeDur = dur; } }

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
    const W = this.W, H = this.H, vis = this.vis || (this.vis = []);
    vis.length = 0;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const b = this.list[i];
      if (b.delay > 0) { b.delay -= dt; continue; }
      b.t += dt;
      // typewriter
      while (b.next < b.chars.length && b.chars[b.next].at <= b.t) {
        const c = b.chars[b.next++];
        if (c.el) c.el.classList.add('on');
        b.onChar?.(c.ch);
      }
      if (!b.closing && b.t > b.life) this.close(b);
      let k = 1, sx = 1, sy = 1, rise = 0;
      if (b.closing) {
        b.closeT += dt;
        const u = Math.min(1, b.closeT / b.closeDur);
        k = 1 - u * u; sx = sy = 1 - 0.35 * u; rise = -10 * u;
        if (u >= 1) { b.el.remove(); b.dead = true; this.list.splice(i, 1); continue; }
      } else {
        // pop: damped spring overshoot with squash & stretch
        const u = b.t, e = Math.exp(-u * 9);
        const base = 1 - e * Math.cos(u * 20), sq = 0.22 * e * Math.sin(u * 20);
        sx = base * (1 + sq); sy = base * (1 - sq);
        k = Math.min(1, u / 0.08);
      }
      b.k = k; b.sx = sx; b.sy = sy; b.rise = rise;
      // project
      this.anchor(b, _v);
      b.dist = _v.distanceTo(_c);
      _v.project(cam);
      const fade = 1 - Math.max(0, (b.dist - MAX_DIST + 2) / 2);
      if (_v.z > 1 || _v.z < -1 || fade <= 0) { if (b.vis) { b.el.style.visibility = 'hidden'; b.vis = false; } continue; }
      b.fade = Math.min(1, fade);
      b.ds = Math.max(0.62, Math.min(1.08, 5.5 / Math.max(0.5, b.dist)));
      b.x = (_v.x * 0.5 + 0.5) * W; b.y = (-_v.y * 0.5 + 0.5) * H;
      vis.push(b);
    }
    // nearer bubbles keep their place; farther ones that would overlap slide aside or float up (tails stretch)
    vis.sort((a, b) => a.dist - b.dist);
    const placed = this.placed || (this.placed = []);
    placed.length = 0;
    for (const b of vis) {
      const ds = b.ds, bw = b.bw * ds, bodyH = b.bg.h * A * ds;
      const cx = Math.max(8 + bw / 2, Math.min(W - 8 - bw / 2, b.x));
      const maxDx = Math.max(0, bw / 2 - 26 * ds);
      const rect = (dx, lift) => { const bot = b.y - (TAIL_H * A + lift) * ds; return [cx + dx - bw / 2, bot - bodyH, cx + dx + bw / 2, bot]; };
      const hit = (r) => { for (const o of placed) if (r[0] < o[2] + 4 && r[2] > o[0] - 4 && r[1] < o[3] + 4 && r[3] > o[1] - 4) return o; return null; };
      let best = [0, 0], bestCost = Infinity;
      const queue = [[0, 0, 0]];
      for (let n = 0; n < 24 && queue.length; n++) {
        const [dx, lift, depth] = queue.shift();
        const r = rect(dx, lift), o = hit(r);
        const cost = Math.abs(dx) + lift * 1.6;
        if (!o) { if (cost < bestCost) { bestCost = cost; best = [dx, lift]; } continue; }
        if (depth > 3 || cost >= bestCost) continue;
        const right = dx + (o[2] + 5 - r[0]), left = dx - (r[2] - (o[0] - 5));
        if (Math.abs(right) <= maxDx) queue.push([right, lift, depth + 1]);
        if (Math.abs(left) <= maxDx) queue.push([left, lift, depth + 1]);
        queue.push([dx, lift + (r[3] - (o[1] - 5)) / ds, depth + 1]);
      }
      if (bestCost === Infinity) best = [0, 0];
      b.dxT = best[0]; b.liftT = Math.min(best[1], 200);
      b.dxS = (b.dxS ?? b.dxT) + (b.dxT - (b.dxS ?? b.dxT)) * Math.min(1, dt * 8);
      b.liftS += (b.liftT - b.liftS) * Math.min(1, dt * 8);
      b.bx = cx + b.dxS;
      if (!b.closing) placed.push(rect(b.dxS, b.liftS));
    }
    for (const b of vis) {
      if (!b.vis) { b.el.style.visibility = ''; b.vis = true; }
      const ds = b.ds, bh = (b.bg.h + TAIL_H) * A * ds + b.liftS * ds;
      const y = Math.max(bh + 8, Math.min(H - 4, b.y));
      const leanPx = (b.bx - b.x) / ds;
      const lean = Math.max(-10, Math.min(10, Math.round(leanPx / A / 2) * 2));
      const extra = Math.round(b.liftS / A / 2) * 2;
      const col = Math.round(b.bg.w / 2 + lean - leanPx / A);
      if (lean !== b.lean || extra !== b.extra || col !== b.col) this.layoutTail(b, lean, extra, col);
      const bob = Math.sin(b.t * 2.3 + b.phase) * 1.6;
      b.el.style.transform = `translate3d(${b.x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${ds.toFixed(3)})`;
      b.inner.style.transform = `translate(0,${(bob + b.rise).toFixed(1)}px) scale(${b.sx.toFixed(3)},${b.sy.toFixed(3)})`;
      if (Math.abs(leanPx - b.leanPx) > 0.05) { b.body.style.transform = `translateX(${leanPx.toFixed(1)}px)`; b.leanPx = leanPx; }
      const op = (b.k * b.fade).toFixed(2);
      if (op !== b.op) { b.el.style.opacity = op; b.op = op; }
      const z = Math.round(1000 - b.dist * 20);
      if (z !== b.z) { b.el.style.zIndex = z; b.z = z; }
    }
  }

  layoutTail(b, lean, extra = 0, col = Math.round(b.bg.w / 2)) {
    b.lean = lean; b.extra = extra; b.col = col;
    const depth = 4;
    drawTail(b.tail, b.style, lean, depth, b.seed, extra);
    // tip at the anchor (0, 0); the tail's top rows tuck under the cloud's lowest row
    b.tail.style.left = -15.5 * A + 'px';
    b.tail.style.top = -(TAIL_H + depth + extra) * A + 'px';
    const low = b.bg.low(Math.max(2, Math.min(b.bg.w - 3, col)));
    b.body.style.top = (-TAIL_H - extra - 1 - low) * A + 'px';
  }

  dispose() {
    window.removeEventListener('resize', this._onResize);
    document.removeEventListener('fullscreenchange', this._onFs);
    this.layer.remove();
    this.list.length = 0;
  }
}
