// Small shared utilities: easing, tweens, event bus, seeded RNG, maths helpers.
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

export const ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inCubic: (t) => t * t * t,
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outElastic: (t) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
  outBounce: (t) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

/** Minimal tween/timer manager. tweens.add({dur, ease, update(t), done()}) */
export class Tweens {
  constructor() { this.list = []; }
  add(opts) {
    const t = { time: 0, delay: opts.delay || 0, dur: opts.dur ?? 0.3, ease: opts.ease || ease.outCubic, update: opts.update, done: opts.done, dead: false };
    this.list.push(t);
    return t;
  }
  wait(sec, fn) { return this.add({ dur: 0, delay: sec, done: fn }); }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const t = this.list[i];
      if (t.dead) { this.list.splice(i, 1); continue; }
      if (t.delay > 0) { t.delay -= dt; if (t.delay > 0) continue; }
      t.time += dt;
      const k = t.dur > 0 ? Math.min(1, t.time / t.dur) : 1;
      t.update?.(t.ease(k), k);
      if (k >= 1) { t.dead = true; this.list.splice(i, 1); t.done?.(); }
    }
  }
}

export class Emitter {
  constructor() { this.h = new Map(); }
  on(ev, fn) { if (!this.h.has(ev)) this.h.set(ev, new Set()); this.h.get(ev).add(fn); return () => this.h.get(ev).delete(fn); }
  emit(ev, ...a) { const s = this.h.get(ev); if (s) for (const fn of [...s]) fn(...a); }
}

/** Mulberry32 seeded RNG. */
export function rng(seed = Date.now()) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

export const pick = (arr, r = Math.random) => arr[Math.floor(r() * arr.length)];

export function formatYen(n) {
  return '¥' + Math.floor(n).toLocaleString('ja-JP');
}
