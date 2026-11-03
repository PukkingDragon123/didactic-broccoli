// Customers for the growth zones (the annex, every floor of the Kaikan): low-poly people (src/people) who come in,
// walk an A* path on the zone's grid to a machine, play it for real (its coin box fills, a capsule drops), react and
// leave. Cheap in volume: a pool of people reused trip after trip, and a level of detail by distance from the camera:
// close people animate every frame, further ones every 2nd / 4th frame (their dt piles up), the far ones are hidden.
// Nobody exists while you're not in the zone (the customers are simulated on the machines' records instead).
//
//   new NavGrid(x0, z0, x1, z1, cell)        zone-local walk grid: .block(x0, x1, z0, z1), .path(a, b) -> [{x, z}]
//   new Crowd(game, zone, { nav, max, door: [x, z, yaw], spots: () => [{ pos: {x, z}, yaw, machine?, fake? }], rate })
//     crowd.update(dt)   crowd.clear()   crowd.count
import * as THREE from 'three';
import { createHuman } from '../people/index.js';
import { talk } from '../people/voice.js';
import { walkStep, turnTo } from '../places/util.js';
import { pick, rnd } from './kit.js';

export class NavGrid {
  constructor(x0, z0, x1, z1, cell = 0.5) {
    this.x0 = x0; this.z0 = z0; this.cell = cell;
    this.w = Math.ceil((x1 - x0) / cell); this.h = Math.ceil((z1 - z0) / cell);
    this.solid = new Uint8Array(this.w * this.h);
  }
  ci(x, z) { return [Math.floor((x - this.x0) / this.cell), Math.floor((z - this.z0) / this.cell)]; }
  ok(i, j) { return i >= 0 && j >= 0 && i < this.w && j < this.h && !this.solid[j * this.w + i]; }
  block(x0, x1, z0, z1, pad = 0.25) {
    const [i0, j0] = this.ci(x0 - pad, z0 - pad), [i1, j1] = this.ci(x1 + pad - 1e-6, z1 + pad - 1e-6);
    for (let j = Math.max(0, j0); j <= Math.min(this.h - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(this.w - 1, i1); i++) this.solid[j * this.w + i] = 1;
  }
  open(x0, x1, z0, z1) {
    const [i0, j0] = this.ci(x0, z0), [i1, j1] = this.ci(x1, z1);
    for (let j = Math.max(0, j0); j <= Math.min(this.h - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(this.w - 1, i1); i++) this.solid[j * this.w + i] = 0;
  }
  center(i, j) { return { x: this.x0 + (i + 0.5) * this.cell, z: this.z0 + (j + 0.5) * this.cell }; }
  nearestOpen(i, j) {
    if (this.ok(i, j)) return [i, j];
    for (let r = 1; r < 6; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) if (this.ok(i + di, j + dj)) return [i + di, j + dj];
    return null;
  }
  /** Straight walk between two points without touching a solid cell? */
  clear(a, b) {
    const d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(d / (this.cell * 0.5));
    for (let k = 1; k < n; k++) { const t = k / n; const [i, j] = this.ci(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t); if (!this.ok(i, j)) return false; }
    return true;
  }
  /** A* with 8 neighbours, then string-pulled. Points are zone-local { x, z }. */
  path(a, b) {
    const s = this.nearestOpen(...this.ci(a.x, a.z)), e = this.nearestOpen(...this.ci(b.x, b.z));
    if (!s || !e) return [b];
    const W = this.w, N = W * this.h, start = s[1] * W + s[0], goal = e[1] * W + e[0];
    const g = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const open = [start];
    g[start] = 0;
    const hf = (k) => { const i = k % W, j = (k / W) | 0; return Math.hypot(i - e[0], j - e[1]); };
    let iter = 0;
    while (open.length && iter++ < 4000) {
      let bi = 0, bf = Infinity;
      for (let q = 0; q < open.length; q++) { const f = g[open[q]] + hf(open[q]); if (f < bf) { bf = f; bi = q; } }
      const cur = open.splice(bi, 1)[0];
      if (cur === goal) break;
      closed[cur] = 1;
      const ci = cur % W, cj = (cur / W) | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = ci + di, nj = cj + dj;
        if (!this.ok(ni, nj)) continue;
        if (di && dj && (!this.ok(ci + di, cj) || !this.ok(ci, cj + dj))) continue; // no corner cutting
        const nk = nj * W + ni;
        if (closed[nk]) continue;
        const ng = g[cur] + (di && dj ? 1.414 : 1);
        if (ng < g[nk]) { g[nk] = ng; from[nk] = cur; if (!open.includes(nk)) open.push(nk); }
      }
    }
    if (from[goal] < 0 && goal !== start) return [b];
    const cells = [];
    for (let k = goal; k !== -1 && k !== start; k = from[k]) cells.push(k);
    cells.reverse();
    const pts = cells.map((k) => this.center(k % W, (k / W) | 0));
    pts.push({ x: b.x, z: b.z });
    // string pulling: skip points we can walk straight past
    const out = [];
    let anchor = { x: a.x, z: a.z };
    for (let q = 0; q < pts.length; q++) {
      const nxt = pts[q + 1];
      if (nxt && this.clear(anchor, nxt)) continue;
      out.push(pts[q]); anchor = pts[q];
    }
    return out;
  }
}

const PRESETS = ['salaryman', 'schoolboy', 'gyaru', 'mom', 'kid', 'grandpa', 'otaku', 'schoolgirl', 'office_lady', 'tourist', 'grandma', 'otaku', 'kid', 'construction'];
const LINES = {
  win: ['Yes! Got it!', 'The rare one!', 'So cute!', 'Finally!', 'No way!'],
  meh: ['A double...', 'Again?!', 'One more...', 'Hmm.'],
  look: ['So many...', 'Which one...', 'Ooh, new series!', 'Is the secret in there?'],
};

let seedN = 101;
export class Crowd {
  constructor(game, zone, o) {
    this.game = game;
    this.zone = zone;
    this.nav = o.nav;
    this.max = o.max || 4;
    this.door = o.door;
    this.spots = o.spots;
    this.rate = o.rate || (() => 0.2); // people per second (when open)
    this.say = o.say || null;
    this.people = [];
    this.pool = o.pool || []; // people waiting off stage (a pool shared by zones lit the same way, e.g. the Kaikan's floors)
    this.spawnT = 1;
    this.frame = 0;
    this.served = 0;
    this._v = new THREE.Vector3();
  }
  get count() { return this.people.length; }

  make() {
    const p = this.pool.pop();
    if (p) return p;
    const preset = PRESETS[seedN % PRESETS.length];
    let h;
    try { h = createHuman({ preset, seed: (seedN++ * 7919) % 100000 }); } catch { h = createHuman({ seed: seedN++ }); }
    this.zone.convert(h.root);
    return { h, root: h.root };
  }

  spawn(atDoor = true) {
    const z = this.zone, p = this.make();
    p.state = 'in'; p.t = 0; p.acc = 0; p.target = null; p.path = []; p.played = false;
    p.speed = rnd(0.9, 1.25) * (p.h.preset === 'grandpa' || p.h.preset === 'grandma' ? 0.7 : 1);
    const d = this.door;
    const start = atDoor ? { x: d[0], z: d[1] } : this.randomOpen();
    p.root.position.copy(z.L(start.x, 0, start.z));
    p.root.rotation.y = d[2] ?? Math.PI;
    p.root.visible = true;
    z.group.add(p.root);
    this.people.push(p);
    this.route(p);
    return p;
  }
  randomOpen() {
    const N = this.nav, me = this.zone.local(this.game.player.pos);
    for (let k = 0; k < 60; k++) {
      const i = Math.floor(Math.random() * N.w), j = Math.floor(Math.random() * N.h);
      if (!N.ok(i, j)) continue;
      const c = N.center(i, j);
      if (Math.hypot(c.x - me.x, c.z - me.z) > 3.2 || k > 50) return c;
    }
    return { x: this.door[0], z: this.door[1] };
  }
  /** Pick a free spot (a machine nobody is using, or a place to look at things) and walk there. */
  route(p) {
    const taken = new Set(this.people.filter((q) => q !== p && q.target).map((q) => q.target.key));
    const list = this.spots().filter((s) => !taken.has(s.key));
    const s = list.length ? (Math.random() < 0.75 && list.some((x) => x.machine) ? pick(list.filter((x) => x.machine)) : pick(list)) : null;
    if (!s) { this.leave(p); return; }
    p.target = s;
    this.walkTo(p, s.pos);
    p.state = 'in';
  }
  walkTo(p, to) {
    const here = this.zone.local(p.root.position);
    p.path = this.nav.path({ x: here.x, z: here.z }, to).map((q) => this.zone.L(q.x, 0, q.z));
  }
  leave(p) {
    p.state = 'out'; p.target = null;
    this.walkTo(p, { x: this.door[0], z: this.door[1] });
  }
  despawn(p) {
    const i = this.people.indexOf(p);
    if (i >= 0) this.people.splice(i, 1);
    p.root.visible = false;
    p.h.clearGesture?.();
    this.zone.group.remove(p.root);
    this.pool.push(p);
  }
  clear() { for (const p of [...this.people]) this.despawn(p); }

  /** Fill the place up a bit when you walk in (people were already there). */
  prefill(n) { for (let i = 0; i < n && this.people.length < this.max; i++) this.spawn(false); }

  update(dt, open = true) {
    this.frame++;
    const cam = this.game.camera.position;
    // arrivals
    this.spawnT -= dt;
    if (open && this.spawnT <= 0) {
      const r = this.rate();
      this.spawnT = r > 0 ? rnd(0.6, 1.4) / r : 3;
      if (r > 0 && this.people.length < this.max) this.spawn(true);
    }
    for (const p of [...this.people]) {
      const d2 = p.root.position.distanceToSquared(cam);
      const step = d2 < 81 ? 1 : d2 < 324 ? 2 : 4;
      p.root.visible = d2 < 900;
      p.acc += dt;
      if ((this.frame + (p.h.spec?.seed || 0)) % step) continue;
      const pdt = Math.min(0.25, p.acc);
      p.acc = 0;
      this.think(p, pdt, open);
    }
  }

  think(p, dt, open) {
    const g = this.game, h = p.h;
    p.t += dt;
    if (p.state === 'in') {
      if (walkStep(h, p.path, dt, p.speed)) { p.state = 'play'; p.t = 0; h.gesture?.('browse'); if (Math.random() < 0.3) this.line(p, pick(LINES.look)); }
      return;
    }
    if (p.state === 'play') {
      turnTo(h, p.target?.yaw ?? h.root.rotation.y, dt);
      h.update(dt, { speed: 0 });
      const m = p.target?.machine;
      if (!p.played && p.t > 1.2) {
        p.played = true;
        if (m) {
          const chance = g.sim?.playChance ? g.sim.playChance(m) : 0.7;
          const r = Math.random() < chance ? m.customerPlay() : null;
          if (r) {
            g.state.stats.customers = (g.state.stats.customers || 0) + 1;
            this.served++;
            this.onServe?.(p, m);
            const lucky = Math.random() < 0.3;
            g.tweens.wait(2.2, () => { if (!this.people.includes(p)) return; h.setExpression?.(lucky ? 'happy' : 'smile', 2.5); h.clearGesture?.(); h.gesture?.(lucky ? 'cheer' : 'shrug'); if (Math.random() < 0.45) this.line(p, pick(lucky ? LINES.win : LINES.meh)); });
          } else if (g.sim?.complaint && Math.random() < 0.5) { const c = g.sim.complaint(m, { count: true }); if (c) this.line(p, c); }
        } else if (p.target?.fake && this.fakePlay) {
          this.fakePlay(p);
          if (Math.random() < 0.25) g.tweens.wait(2.0, () => { if (this.people.includes(p)) { h.setExpression?.('happy', 2); h.clearGesture?.(); h.gesture?.(Math.random() < 0.5 ? 'cheer' : 'shrug'); } });
        }
      }
      if (p.t > (m ? 5.5 : 4)) {
        h.clearGesture?.();
        if (open && Math.random() < 0.45) this.route(p); else this.leave(p);
      }
      return;
    }
    if (p.state === 'out') {
      if (walkStep(h, p.path, dt, p.speed)) this.despawn(p);
    }
  }

  line(p, text) {
    try { this.game.bubbles?.say(p.h, text, { onChar: talk(p.h, { vol: 0.6 }) }); } catch { /* */ }
  }
}
