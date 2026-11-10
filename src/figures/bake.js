// The painted atlas of a figure series and the baker that fills it. Every facet of a sculpt (src/figures/sculpt.js) is
// planar, so a painted facet gets its own rectangle of the atlas with an exact planar mapping: square texels, no
// stretching, the same density everywhere (PPMM texels per millimetre), and the paint layers are evaluated per texel at
// the point of the surface it covers, so a face or a stripe runs across facets without a seam. Facets that come out one
// flat colour (most of a figure) share a small swatch instead. One atlas per series: every figure of a series draws
// with the same materials, so a machine's sample figures merge into one mesh.
import * as THREE from 'three';
import { mix } from './paint.js';

export const PPMM = 5.6; // texels per millimetre: a 6 cm figure is about 340 texels tall
const MARGIN = 1; // texels of real paint beyond a facet's edge (bilinear filtering never leaves the patch)
const PAD = 2; // texels of repeated edge colour round every patch (mip levels stay clean)
const BASE = 0x9a9498;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
function newell(pts) {
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; x += (a[1] - b[1]) * (a[2] + b[2]); y += (a[2] - b[2]) * (a[0] + b[0]); z += (a[0] - b[0]) * (a[1] + b[1]); }
  return norm([x, y, z]);
}

/** The paint of one facet or grid cell: which layers can touch it (ctx), and their colour at a local point. */
function evaluator(layers, ctx) {
  let act = [];
  for (const L of layers) {
    const e = L.prep(ctx);
    if (e === null || e === undefined || e === false) continue;
    if (e === true && typeof L.color === 'number' && L.alpha >= 1) act = [];
    act.push({ L, sdf: e === true ? null : e, fn: typeof L.color === 'function' });
  }
  const px = ctx.px, E = { flat: act.every((x) => !x.sdf && !x.fn), col: BASE, rough: 158 };
  E.at = (x, y, z) => {
    let col = BASE, rough = 0.62;
    for (let q = 0; q < act.length; q++) {
      const { L, sdf, fn } = act[q];
      let cov = 1;
      if (sdf) { cov = 0.5 - sdf(x, y, z) / px; if (cov <= 0) continue; if (cov > 1 || L.hard) cov = 1; }
      cov *= L.alpha;
      const c2 = L.tone ? L.tone(col, x, y, z) : fn ? L.color(x, y, z) : L.color;
      if (c2 === null || c2 === undefined) continue;
      col = cov >= 1 ? c2 : mix(col, c2, cov);
      if (L.rough !== undefined && cov > 0.5) rough = L.rough;
    }
    E.col = col; E.rough = Math.round(rough * 255);
  };
  return E;
}

export class FigureAtlas {
  constructor(w = 2048, h = 1024, ppmm = PPMM) {
    this.w = w; this.h = h; this.ppmm = ppmm;
    this.d = new Uint8Array(w * h * 4);
    for (let i = 0; i < this.d.length; i += 4) { this.d[i] = 0x9a; this.d[i + 1] = 0x94; this.d[i + 2] = 0x98; this.d[i + 3] = 255; }
    this.rw = w >> 1; this.rh = h >> 1;
    this.r = new Uint8Array(this.rw * this.rh * 4).fill(160);
    this.sky = [{ x: 0, w, y: 0 }]; this.top = 0;
    this.sw = new Map(); this.swArea = null;
    this.scratch = { C: new Uint32Array(4096), R: new Uint8Array(4096) };
    this.tex = null; this.rtex = null;
    this.stats = { charts: 0, swatches: 0, texels: 0 };
  }

  /** Reserve w x h texels: skyline packing (lowest place that fits, leftmost on a tie), kept across figures. */
  alloc(w, h) {
    const sky = this.sky;
    let best = -1, by = Infinity, bx = 0;
    for (let i = 0; i < sky.length; i++) {
      const x = sky[i].x;
      if (x + w > this.w) break;
      let y = 0, j = i, right = x + w;
      while (j < sky.length && sky[j].x < right) { if (sky[j].y > y) y = sky[j].y; if (y >= by) break; j++; }
      if (y < by) { by = y; best = i; bx = x; }
    }
    if (best < 0 || by + h > this.h) throw new Error(`figure atlas full (${w}x${h})`);
    // raise the skyline over [bx, bx + w)
    const right = bx + w, out = [];
    for (const s of sky) {
      const s1 = s.x + s.w;
      if (s1 <= bx || s.x >= right) { out.push(s); continue; }
      if (s.x < bx) out.push({ x: s.x, w: bx - s.x, y: s.y });
      if (s1 > right) out.push({ x: right, w: s1 - right, y: s.y });
    }
    out.push({ x: bx, w, y: by + h });
    out.sort((a, b) => a.x - b.x);
    this.sky = out;
    this.top = Math.max(this.top, by + h);
    return { x: bx, y: by };
  }
  put(x, y, c, rough) {
    const i = (y * this.w + x) * 4;
    this.d[i] = (c >> 16) & 255; this.d[i + 1] = (c >> 8) & 255; this.d[i + 2] = c & 255;
    const j = ((y >> 1) * this.rw + (x >> 1)) * 4;
    this.r[j] = this.r[j + 1] = this.r[j + 2] = rough;
  }
  /** uv of a 4 x 4 block of one colour. */
  swatch(c, rough) {
    const k = c * 256 + rough;
    let uv = this.sw.get(k);
    if (uv) return uv;
    if (!this.swArea || this.swArea.n >= this.swArea.max) { const r = this.alloc(128, 16); this.swArea = { r, n: 0, max: 32 * 4 }; }
    const A = this.swArea, x = A.r.x + (A.n % 32) * 4, y = A.r.y + Math.floor(A.n / 32) * 4;
    A.n++;
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) this.put(x + i, y + j, c, rough);
    uv = [(x + 2) / this.w, (y + 2) / this.h];
    this.sw.set(k, uv);
    this.stats.swatches++;
    return uv;
  }
  touch() { if (this.tex) this.tex.needsUpdate = true; if (this.rtex) this.rtex.needsUpdate = true; }
  texture() {
    if (this.tex) return this.tex;
    const t = new THREE.DataTexture(this.d, this.w, this.h, THREE.RGBAFormat);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
    t.anisotropy = 4;
    t.needsUpdate = true;
    return (this.tex = t);
  }
  roughTexture() {
    if (this.rtex) return this.rtex;
    const t = new THREE.DataTexture(this.r, this.rw, this.rh, THREE.RGBAFormat);
    t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
    t.needsUpdate = true;
    return (this.rtex = t);
  }
  /** Share of the atlas rows in use (0..1). */
  get fill() { return this.top / this.h; }

  /**
   * Paint a sculpt's facets into the atlas. Returns the triangles, bucketed by moving part and draw slot:
   *   { buckets: Map('part|slot' -> { part, slot, pos[], nrm[], uv[] }), tris }   (positions in the sculpt's millimetres)
   */
  bake(sculpt) { const g = this.bakeGen(sculpt); let r; while (!(r = g.next()).done); return r.value; }
  /** The same as a generator that yields every few milliseconds (for src/core/idle.js: no frame pays for a bake). */
  * bakeGen(sculpt) {
    let tY = performance.now();
    const charts = [], out = new Map();
    const bucket = (f) => { const k = `${f.part || ''}|${f.slot}`; let b = out.get(k); if (!b) out.set(k, b = { part: f.part || null, slot: f.slot, pos: [], nrm: [], uv: [] }); return b; };
    let tris = 0;
    for (const f of sculpt.facets) {
      if (performance.now() - tY > 3) { yield; tY = performance.now(); }
      const N = f.p.length, D = this.ppmm * (f.dens || 1) * (sculpt.texel || 1);
      const n = newell(f.p);
      const U = Math.abs(n[1]) < 0.95 ? norm(cross([0, 1, 0], n)) : norm(cross(n, [0, 0, 1])), Vv = cross(n, U);
      const o = f.p[0], A = [], B = [];
      let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
      for (const p of f.p) { const d = sub(p, o), a = dot(d, U), b = dot(d, Vv); A.push(a); B.push(b); a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b); }
      // the local point as an affine function of the patch coordinates (a, b): from vertex 0 and the two that span most area
      let i1 = 1, i2 = 2, best = 0;
      for (let i = 1; i < N; i++) for (let j = i + 1; j < N; j++) { const ar = Math.abs(A[i] * B[j] - A[j] * B[i]); if (ar > best) { best = ar; i1 = i; i2 = j; } }
      const det = A[i1] * B[i2] - A[i2] * B[i1] || 1e-9, e1 = sub(f.lp[i1], f.lp[0]), e2 = sub(f.lp[i2], f.lp[0]);
      const LA = [0, 1, 2].map((k) => (e1[k] * B[i2] - e2[k] * B[i1]) / det), LB = [0, 1, 2].map((k) => (e2[k] * A[i1] - e1[k] * A[i2]) / det), L0 = f.lp[0];
      // which layers can touch this facet
      const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
      for (const p of f.lp) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[k]); mx[k] = Math.max(mx[k], p[k]); }
      const px = Math.hypot(LA[0], LA[1], LA[2]) / D;
      const ctx = { n: f.ln, pts: f.lp, min: mn, max: mx, px };
      const E = evaluator(f.layers, ctx);
      const flat = E.flat, evalAt = E.at;
      let uvs = null;
      if (flat) {
        const cc = [0, 0, 0];
        for (const q of f.lp) { cc[0] += q[0] / N; cc[1] += q[1] / N; cc[2] += q[2] / N; }
        evalAt(cc[0], cc[1], cc[2]);
        const t = this.swatch(E.col, E.rough);
        uvs = f.p.map(() => t);
      } else {
        const w = Math.max(1, Math.ceil((a1 - a0) * D)) + MARGIN * 2, h = Math.max(1, Math.ceil((b1 - b0) * D)) + MARGIN * 2;
        if (w * h > this.scratch.C.length) this.scratch = { C: new Uint32Array(w * h * 2), R: new Uint8Array(w * h * 2) };
        let C = this.scratch.C, R = this.scratch.R; // (reused: most patches turn out plain and are dropped again)
        let uni = true, c00 = -1, r00 = -1;
        for (let j = 0; j < h; j++) {
          const b = b0 + (j - MARGIN + 0.5) / D;
          for (let i = 0; i < w; i++) {
            const a = a0 + (i - MARGIN + 0.5) / D;
            evalAt(L0[0] + LA[0] * a + LB[0] * b, L0[1] + LA[1] * a + LB[1] * b, L0[2] + LA[2] * a + LB[2] * b);
            const c = E.col, r = E.rough;
            C[j * w + i] = c; R[j * w + i] = r;
            if (c00 < 0) { c00 = c; r00 = r; } else if (c !== c00 || r !== r00) uni = false;
          }
        }
        if (uni) { const t = this.swatch(c00, r00); uvs = f.p.map(() => t); } else {
          C = C.slice(0, w * h); R = R.slice(0, w * h);
          const ch = { w, h, C, R, uv: f.p.map((_, k) => [MARGIN + (A[k] - a0) * D, MARGIN + (B[k] - b0) * D]) };
          charts.push(ch);
          uvs = ch.uv; // patch pixels for now; atlas uvs once it is placed
        }
      }
      // triangles
      let idx;
      if (N === 3) idx = [0, 1, 2];
      else if (N === 4) idx = [0, 1, 2, 0, 2, 3];
      else {
        idx = THREE.ShapeUtils.triangulateShape(A.map((a, k) => new THREE.Vector2(a, B[k])), []).flat();
        for (let k = 0; k < idx.length; k += 3) { const [i, j, l] = [idx[k], idx[k + 1], idx[k + 2]]; if ((A[j] - A[i]) * (B[l] - B[i]) - (A[l] - A[i]) * (B[j] - B[i]) < 0) { idx[k + 1] = l; idx[k + 2] = j; } }
      }
      const bk = bucket(f);
      for (const k of idx) { bk.pos.push(f.p[k]); bk.nrm.push(f.vn[k]); bk.uv.push(uvs[k]); }
      tris += idx.length / 3;
    }
    // ---- smooth surfaces: a grid of cells shares one patch (or a few strips of it: only the rows that carry paint)
    for (const G of sculpt.patches) {
      const { nu, nv, cells } = G, D = this.ppmm * (G.dens || 1) * (sculpt.texel || 1);
      const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      // cell sizes per row (a head's rings near the crown are a fraction of its widest): rows of similar width share one
      // cell width (so a strip of them stays a rectangle), each row has its own cell height
      const wRow = new Float32Array(nv), hRow = new Float32Array(nv);
      for (const c of cells) { if (c.dead) continue; wRow[c.j] = Math.max(wRow[c.j], dist(c.p[0], c.p[1]), dist(c.p[3], c.p[2])); hRow[c.j] = Math.max(hRow[c.j], dist(c.p[0], c.p[3]), dist(c.p[1], c.p[2])); }
      const T2 = (mm) => Math.max(2, Math.min(64, Math.round(mm * D))), gid = new Int32Array(nv), gW = [];
      for (let j = 0, gw = -1; j < nv; j++) {
        if (gw < 0 || wRow[j] > gw * 1.5 || wRow[j] < gw / 1.5) { gW.push(wRow[j]); gw = wRow[j]; } else gW[gW.length - 1] = Math.max(gW[gW.length - 1], wRow[j]);
        gid[j] = gW.length - 1;
      }
      const cwRow = Array.from({ length: nv }, (_, j) => T2(gW[gid[j]])), chRow = Array.from({ length: nv }, (_, j) => T2(hRow[j]));
      // each cell: plain (one colour) or painted (cw x ch texels)
      const tex = new Array(cells.length).fill(null), flatC = new Int32Array(cells.length), flatR = new Uint8Array(cells.length);
      for (let k = 0; k < cells.length; k++) {
        if ((k & 15) === 0 && performance.now() - tY > 3) { yield; tY = performance.now(); }
        const c = cells[k];
        if (c.dead) { flatC[k] = -1; continue; }
        const cw = cwRow[c.j], ch = chRow[c.j];
        const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
        for (const q of c.lp) for (let d = 0; d < 3; d++) { mn[d] = Math.min(mn[d], q[d]); mx[d] = Math.max(mx[d], q[d]); }
        const px = Math.max(dist(c.lp[0], c.lp[1]) / cw, dist(c.lp[0], c.lp[3]) / ch, 1e-4);
        const E = evaluator(G.layers, { n: c.ln, pts: c.lp, min: mn, max: mx, px });
        const [A, B, Cc, Dd] = c.lp;
        if (E.flat) { E.at((A[0] + B[0] + Cc[0] + Dd[0]) / 4, (A[1] + B[1] + Cc[1] + Dd[1]) / 4, (A[2] + B[2] + Cc[2] + Dd[2]) / 4); flatC[k] = E.col; flatR[k] = E.rough; continue; }
        const T = new Uint32Array(cw * ch), R = new Uint8Array(cw * ch);
        let uni = true;
        for (let y = 0; y < ch; y++) {
          const t = (y + 0.5) / ch;
          for (let x = 0; x < cw; x++) {
            const u = (x + 0.5) / cw, w0 = (1 - u) * (1 - t), w1 = u * (1 - t), w2 = u * t, w3 = (1 - u) * t;
            E.at(A[0] * w0 + B[0] * w1 + Cc[0] * w2 + Dd[0] * w3, A[1] * w0 + B[1] * w1 + Cc[1] * w2 + Dd[1] * w3, A[2] * w0 + B[2] * w1 + Cc[2] * w2 + Dd[2] * w3);
            T[y * cw + x] = E.col; R[y * cw + x] = E.rough;
            if (E.col !== T[0] || E.rough !== R[0]) uni = false;
          }
        }
        if (uni) { flatC[k] = T[0]; flatR[k] = R[0]; } else tex[k] = { T, R };
      }
      // strips: runs of rows with painted cells; across, from the first painted column to the last (the long way
      // round is skipped on a closed grid: the strip starts after the widest plain gap)
      const uvOf = new Array(cells.length).fill(null);
      for (let j0 = 0; j0 < nv;) {
        const rowHas = (j) => { for (let i = 0; i < nu; i++) if (tex[j * nu + i]) return true; return false; };
        if (!rowHas(j0)) { j0++; continue; }
        let j1 = j0 + 1;
        while (j1 < nv && rowHas(j1) && gid[j1] === gid[j0]) j1++;
        const cw = cwRow[j0], offY = [0];
        for (let j = j0; j < j1; j++) offY.push(offY[offY.length - 1] + chRow[j]);
        const col = new Uint8Array(nu);
        for (let j = j0; j < j1; j++) for (let i = 0; i < nu; i++) if (tex[j * nu + i]) col[i] = 1;
        let i0 = col.indexOf(1), ni = col.lastIndexOf(1) - i0 + 1;
        if (G.closed) {
          let bestGap = -1, bestStart = 0;
          for (let i = 0; i < nu; i++) { if (!col[i]) continue; let g = 0; while (g < nu && !col[(i + 1 + g) % nu]) g++; if (g > bestGap) { bestGap = g; bestStart = (i + 1 + g) % nu; } }
          i0 = bestStart; ni = nu - bestGap;
        }
        const SH = offY[j1 - j0], W = ni * cw + PAD * 2, H = SH + PAD * 2;
        if (W > 1400) console.warn(`figure atlas: a smooth patch ${W} px wide (${ni} cells of ${cw}): space its ring points evenly (ring(..., { even: true }))`);
        const r = this.alloc(W, H);
        for (let y = 0, jr = 0; y < H; y++) {
          const yy = Math.max(0, Math.min(SH - 1, y - PAD));
          while (jr < j1 - j0 - 1 && yy >= offY[jr + 1]) jr++;
          while (jr > 0 && yy < offY[jr]) jr--;
          const j = j0 + jr, ty = yy - offY[jr];
          for (let x = 0; x < W; x++) {
            const xx = Math.max(0, Math.min(ni * cw - 1, x - PAD)), k = j * nu + (i0 + Math.floor(xx / cw)) % nu, t = tex[k];
            if (t) this.put(r.x + x, r.y + y, t.T[ty * cw + (xx % cw)], t.R[ty * cw + (xx % cw)]);
            else this.put(r.x + x, r.y + y, flatC[k] < 0 ? BASE : flatC[k], flatR[k]);
          }
        }
        for (let j = j0; j < j1; j++) for (let ii = 0; ii < ni; ii++) {
          const ch = chRow[j], x0 = r.x + PAD + ii * cw, y0 = r.y + PAD + offY[j - j0];
          uvOf[j * nu + (i0 + ii) % nu] = [[x0 / this.w, y0 / this.h], [(x0 + cw) / this.w, y0 / this.h], [(x0 + cw) / this.w, (y0 + ch) / this.h], [x0 / this.w, (y0 + ch) / this.h]];
        }
        this.stats.charts++; this.stats.texels += W * H;
        j0 = j1;
      }
      // triangles
      const bk = bucket(G);
      for (let k = 0; k < cells.length; k++) {
        const c = cells[k];
        if (c.dead) continue;
        let uv = uvOf[k];
        if (!uv) { const t = this.swatch(flatC[k], flatR[k]); uv = [t, t, t, t]; }
        const wn = newell(c.p);
        for (const tri of [[0, 1, 2], [0, 2, 3]]) {
          const [a, b, d] = tri, e1 = sub(c.p[b], c.p[a]), e2 = sub(c.p[d], c.p[a]), tn = cross(e1, e2);
          if (tn[0] * tn[0] + tn[1] * tn[1] + tn[2] * tn[2] < 1e-14) continue;
          // wind it to face the way the cell's normals point
          const out = dot(tn, c.vn[a]) + dot(tn, c.vn[b]) + dot(tn, c.vn[d]) >= 0 ? [a, b, d] : [a, d, b];
          for (const q of out) { bk.pos.push(c.p[q]); bk.nrm.push(c.vn[q]); bk.uv.push(uv[q]); }
          tris++;
        }
        void wn;
      }
    }
    // place the patches (tallest first on the shelves) and copy them in, with their edges repeated into the padding
    charts.sort((p, q) => q.h - p.h || q.w - p.w);
    for (const c of charts) {
      const W = c.w + PAD * 2, H = c.h + PAD * 2, r = this.alloc(W, H);
      for (let j = 0; j < H; j++) {
        const sj = Math.max(0, Math.min(c.h - 1, j - PAD));
        for (let i = 0; i < W; i++) { const si = Math.max(0, Math.min(c.w - 1, i - PAD)); this.put(r.x + i, r.y + j, c.C[sj * c.w + si], c.R[sj * c.w + si]); }
      }
      for (const t of c.uv) { t[0] = (r.x + PAD + t[0]) / this.w; t[1] = (r.y + PAD + t[1]) / this.h; }
      this.stats.charts++; this.stats.texels += W * H;
    }
    this.touch();
    return { buckets: out, tris };
  }
}
