// Grandpa's walking grid: an occupancy grid over the garage and the lane in front of it, built from the same
// axis-aligned obstacles the player collides with (game.player.obstacles: walls, the shutter while it's down, the
// table, the desk, machines, the van...), grown by his radius, plus A* with line-of-sight smoothing. Rebuilt lazily
// whenever the set of enabled obstacles changes (the shutter rolling up opens the garage to him).
//   const nav = new Nav(game);  nav.path(from, to) -> [Vector3...] (ends exactly at `to` when it's reachable)
//   nav.free(x, z) -> bool   nav.nearestFree(p) -> Vector3 | null   nav.ascii() (debug map)
import * as THREE from 'three';

const CELL = 0.2;
// the area he ever walks in: the garage (x -4..4, z -5..5) and the lane out front up to the far kerb
const X0 = -9, X1 = 9, Z0 = -5.2, Z1 = 14.2;
const RADIUS = 0.24;

export class Nav {
  constructor(game) {
    this.game = game;
    this.w = Math.ceil((X1 - X0) / CELL);
    this.d = Math.ceil((Z1 - Z0) / CELL);
    this.occ = new Uint8Array(this.w * this.d);
    this.sig = '';
    this.extra = []; // { minX, maxX, minZ, maxZ } blocked by things that aren't player obstacles (his stool...)
  }

  /** A cheap signature of the obstacle set: rebuild when anything is switched on or off, added or removed. */
  signature() {
    const obs = this.game.player.obstacles;
    let s = obs.length + ':' + this.extra.length + ':';
    for (let i = 0; i < obs.length; i++) if (obs[i].enabled === false) s += i + ',';
    return s;
  }

  build() {
    const sig = this.signature();
    if (sig === this.sig) return;
    this.sig = sig;
    const occ = this.occ.fill(0), r = RADIUS;
    const mark = (o) => {
      if (o.maxX < X0 || o.minX > X1 || o.maxZ < Z0 || o.minZ > Z1) return;
      const i0 = Math.max(0, Math.floor((o.minX - r - X0) / CELL)), i1 = Math.min(this.w - 1, Math.floor((o.maxX + r - X0) / CELL));
      const j0 = Math.max(0, Math.floor((o.minZ - r - Z0) / CELL)), j1 = Math.min(this.d - 1, Math.floor((o.maxZ + r - Z0) / CELL));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const cx = X0 + (i + 0.5) * CELL, cz = Z0 + (j + 0.5) * CELL;
        // a cell is blocked when its centre is within the radius of the box
        const dx = Math.max(o.minX - cx, 0, cx - o.maxX), dz = Math.max(o.minZ - cz, 0, cz - o.maxZ);
        if (dx * dx + dz * dz < r * r) occ[j * this.w + i] = 1;
      }
    };
    for (const o of this.game.player.obstacles) if (o.enabled !== false && !o.grandpa) mark(o);
    for (const o of this.extra) mark(o);
    // the garage's side walls and back wall (the player is held in by them too)
    for (let j = 0; j < this.d; j++) for (let i = 0; i < this.w; i++) {
      const x = X0 + (i + 0.5) * CELL, z = Z0 + (j + 0.5) * CELL;
      if (z < 4.95 && (Math.abs(x) > 3.78 || z < -4.8)) occ[j * this.w + i] = 1;
      if (z > 13.6) occ[j * this.w + i] = 1;
    }
  }

  cell(x, z) { return [Math.floor((x - X0) / CELL), Math.floor((z - Z0) / CELL)]; }
  centre(i, j, out = new THREE.Vector3()) { return out.set(X0 + (i + 0.5) * CELL, 0, Z0 + (j + 0.5) * CELL); }
  ok(i, j) { return i >= 0 && j >= 0 && i < this.w && j < this.d && !this.occ[j * this.w + i]; }
  free(x, z) { this.build(); const [i, j] = this.cell(x, z); return this.ok(i, j); }

  nearestCell(p) {
    const [ci, cj] = this.cell(p.x, p.z);
    if (this.ok(ci, cj)) return [ci, cj];
    for (let r = 1; r < 14; r++) {
      let best = null, bd = Infinity;
      for (let j = cj - r; j <= cj + r; j++) for (let i = ci - r; i <= ci + r; i++) {
        if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== r || !this.ok(i, j)) continue;
        const c = this.centre(i, j), d = (c.x - p.x) ** 2 + (c.z - p.z) ** 2;
        if (d < bd) { bd = d; best = [i, j]; }
      }
      if (best) return best;
    }
    return null;
  }

  nearestFree(p) { this.build(); const c = this.nearestCell(p); return c ? this.centre(c[0], c[1]) : null; }

  /** Waypoints from `from` to `to` (Vector3s on the ground). Straight there when nothing's in the way. */
  path(from, to) {
    this.build();
    const s = this.nearestCell(from), g = this.nearestCell(to);
    if (!s || !g) return [to.clone().setY(0)];
    const goalFree = this.free(to.x, to.z);
    const end = goalFree ? to.clone().setY(0) : this.centre(g[0], g[1]);
    if (this.los(s, g)) return [end];
    const W = this.w, key = (i, j) => j * W + i;
    const gS = new Float32Array(W * this.d).fill(Infinity), came = new Int32Array(W * this.d).fill(-1), closed = new Uint8Array(W * this.d);
    const h = (i, j) => { const dx = Math.abs(i - g[0]), dz = Math.abs(j - g[1]); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
    // a small binary heap of [f, key]
    const heap = [];
    const push = (f, k) => { heap.push([f, k]); let n = heap.length - 1; while (n > 0) { const p = (n - 1) >> 1; if (heap[p][0] <= heap[n][0]) break; [heap[p], heap[n]] = [heap[n], heap[p]]; n = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let n = 0; for (;;) { const l = n * 2 + 1, r = l + 1; let m = n; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === n) break; [heap[m], heap[n]] = [heap[n], heap[m]]; n = m; } } return top; };
    const sk = key(s[0], s[1]), gk = key(g[0], g[1]);
    gS[sk] = 0; push(h(s[0], s[1]), sk);
    let found = false, iter = 0;
    while (heap.length && iter++ < 20000) {
      const [, k] = pop();
      if (closed[k]) continue;
      closed[k] = 1;
      if (k === gk) { found = true; break; }
      const ci = k % W, cj = (k / W) | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = ci + di, nj = cj + dj;
        if (!this.ok(ni, nj)) continue;
        if (di && dj && (!this.ok(ci + di, cj) || !this.ok(ci, cj + dj))) continue;
        const nk = key(ni, nj), ng = gS[k] + (di && dj ? 1.414 : 1);
        if (ng < gS[nk]) { gS[nk] = ng; came[nk] = k; push(ng + h(ni, nj), nk); }
      }
    }
    if (!found) return [end];
    const cells = [];
    for (let k = gk; k >= 0; k = came[k]) { cells.unshift([k % W, (k / W) | 0]); if (k === sk) break; }
    // line-of-sight smoothing: keep only the corners
    const pts = [];
    let a = 0;
    for (let k = 2; k < cells.length; k++) if (!this.los(cells[a], cells[k])) { pts.push(this.centre(...cells[k - 1])); a = k - 1; }
    pts.push(end);
    return pts;
  }

  los(a, b) {
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) * 2;
    if (!n) return this.ok(a[0], a[1]);
    for (let k = 0; k <= n; k++) {
      const u = k / n, x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u;
      // the cells either side of the line too (he's not a point)
      if (!this.ok(Math.round(x), Math.round(y)) || !this.ok(Math.floor(x + 0.5), Math.floor(y + 0.5))) return false;
    }
    return true;
  }

  /** Debug: the grid as text ('#' blocked), with optional marks [[x, z, ch]]. */
  ascii(marks = [], x0 = X0, x1 = X1, z0 = Z0, z1 = Z1) {
    this.build();
    const rows = [];
    for (let j = this.d - 1; j >= 0; j--) {
      const z = Z0 + (j + 0.5) * CELL;
      if (z < z0 || z > z1) continue;
      let row = '';
      for (let i = 0; i < this.w; i++) {
        const x = X0 + (i + 0.5) * CELL;
        if (x < x0 || x > x1) continue;
        const m = marks.find(([mx, mz]) => Math.abs(mx - x) < CELL / 2 && Math.abs(mz - z) < CELL / 2);
        row += m ? m[2] : this.occ[j * this.w + i] ? '#' : '.';
      }
      rows.push(row);
    }
    return rows.join('\n');
  }
}
