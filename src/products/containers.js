// The drinks as things: low-poly cans (190 g, 250, 350 and 500 ml), 500 ml PET bottles, little brown tonic bottles, a
// glass cup of sake and the ramune bottle, turned on a lathe at their real sizes with the label wrapped round them
// (front towards +z, the seam at the side, the small print at the back), a lid or a cap on top and the dated base
// underneath. Every drink's art lives in one atlas (src/vehicles/atlas.js), so a whole machine of samples, the can
// in the tray and the one in your hand are a single material.
//   drinkGeometry(id) -> BufferGeometry (bottom-centre origin, metres)     drinkMesh(id) -> Mesh
//   drinksSheet() -> the atlas sheet { material(), lit(), ready (Promise), region(key) }
import * as THREE from 'three';
import { Atlas } from '../vehicles/atlas.js';
import { CONT, wrapSize, topSize } from './spec.js';
import { DRINKS, BRANDS } from './brands.js';
import { paintWrap } from './labels.js';
import { paintTop, topKey, paintBase } from './tops.js';
import { whenFontsReady } from './type.js';
import { NONE, dk, lt } from './px.js';
import { FOODS } from '../needs/foods.js';

const MM = 0.001;
export const R_PAINT = 0.38, R_PAPER = 0.82, R_METAL = 0.3, R_GLASS = 0.14, R_PET = 0.26, R_PLASTIC = 0.55;

// ------------------------------------------------------------------ an atlas whose regions are painted later
/** A kit atlas plus a list of painters: regions are reserved at once (so geometry can be built), painted when the
 *  label fonts are in, in slices so the game never stalls on it. */
export class Sheet {
  constructor(w, h, name = 'products') {
    this.A = new Atlas(w, h);
    this.name = name;
    this.jobs = [];
    this.views = new Map();
    this.done = false;
    this.ready = new Promise((res) => { this._res = res; });
  }
  /** Reserve w x h pixels painted by paint() -> Px; rough: the surface's roughness; hold: the colour until painted. */
  region(key, w, h, paint, rough = R_PAINT, hold = 0xd8d4cc) {
    if (this.views.has(key)) return this.views.get(key);
    const v = this.A.patch(key, w, h);
    this.A.ink(rough);
    v.box(0, 0, w, h, hold);
    this.views.set(key, v);
    this.jobs.push({ key, v, paint, rough, bg: hold });
    if (this.started) this.kick();
    return v;
  }
  swatch(c, rough = R_PAINT) { return this.A.swatch(c, rough); }
  write(job) {
    const { v, rough, bg } = job, A = this.A;
    let px;
    try { px = job.paint(); } catch (e) { console.warn('label paint failed', job.key, e); return; }
    A.ink(rough);
    const w = Math.min(v.W, px.w), h = Math.min(v.H, px.h), X = v.r.x, Y = v.r.y;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = px.d[y * px.w + x]; A.set(X + x, Y + y, c === NONE ? bg : c); }
  }
  /** Push the pixels to the GPU texture. */
  refresh() {
    const t = this.A.tex;
    if (!t) return;
    t.image.getContext('2d').putImageData(new ImageData(this.A.d, this.A.w, this.A.h), 0, 0);
    t.needsUpdate = true;
  }
  material() {
    if (this.mat) return this.mat;
    this.mat = new THREE.MeshStandardMaterial({ map: this.A.texture(), roughnessMap: this.A.roughTexture(), roughness: 1, metalness: 0 });
    this.mat.name = this.name;
    this.start();
    return this.mat;
  }
  /** A self-lit copy for things standing under a machine's own lamp (the samples in a vending window). */
  lit(k = 0.55) {
    if (this.litMat) return this.litMat;
    const m = this.material().clone();
    m.emissive = new THREE.Color(0xffffff); m.emissiveMap = m.map; m.emissiveIntensity = k;
    m.name = this.name + ':lit';
    return (this.litMat = m);
  }
  start() { if (this.started) return; this.started = true; this.kick(); }
  kick() {
    if (this.running) return;
    this.running = true;
    const run = async () => {
      await whenFontsReady(this.preload || '');
      const paintSome = (list) => new Promise((res) => {
        let i = 0;
        const step = () => {
          const t0 = performance.now();
          while (i < list.length && performance.now() - t0 < 14) this.write(list[i++]);
          if (i < list.length) setTimeout(step, 0); else res();
        };
        step();
      });
      let n = 0;
      while (n < this.jobs.length) { const batch = this.jobs.slice(n); n = this.jobs.length; await paintSome(batch); this.refresh(); }
      // a second pass if some glyphs only arrived after the first (web-font subsets load on demand)
      if (typeof document !== 'undefined' && document.fonts && !this.second) { this.second = true; await whenFontsReady(); await paintSome(this.jobs.slice()); this.refresh(); }
      this.running = false; this.done = true; this._res(true);
      if (n < this.jobs.length) this.kick();
    };
    run();
  }
}

// ------------------------------------------------------------------ building: smooth round, creased along the profile
class Build {
  constructor() { this.p = []; this.n = []; this.t = []; }
  tri(a, b, c) {
    const ux = b.p[0] - a.p[0], uy = b.p[1] - a.p[1], uz = b.p[2] - a.p[2], vx = c.p[0] - a.p[0], vy = c.p[1] - a.p[1], vz = c.p[2] - a.p[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (nx * nx + ny * ny + nz * nz < 1e-18) return;
    const d = nx * (a.n[0] + b.n[0] + c.n[0]) + ny * (a.n[1] + b.n[1] + c.n[1]) + nz * (a.n[2] + b.n[2] + c.n[2]);
    for (const q of d < 0 ? [a, c, b] : [a, b, c]) { this.p.push(q.p[0], q.p[1], q.p[2]); this.n.push(q.n[0], q.n[1], q.n[2]); this.t.push(q.t[0], q.t[1]); }
  }
  quad(a, b, c, d) { this.tri(a, b, c); this.tri(a, c, d); }
  /** A box with one uv function per face group: sides(p, n), top(p, n). */
  box(x0, y0, z0, x1, y1, z1, uvSide, uvTop = uvSide) {
    const F = [
      [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1]], [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1]],
      [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0]], [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0]],
      [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0]], [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0]],
    ];
    for (const [a, b, c, d, n] of F) { const uv = n[1] > 0 ? uvTop : uvSide; this.quad(...[a, b, c, d].map((p) => ({ p, n, t: uv(p, n) }))); }
  }
  /**
   * A solid of revolution about y. prof: [[r, y], ...] going up the outside (metres); skins[k](pts, u0, u1) -> four uvs
   * for the band between prof[k] and prof[k + 1] (bottom u0, bottom u1, top u1, top u0); u = 0.25 faces +z.
   */
  lathe(prof, segs, skins) {
    const at = (u, r, y) => { const a = (u - 0.25) * Math.PI * 2; return [Math.sin(a) * r, y, Math.cos(a) * r]; };
    for (let k = 0; k + 1 < prof.length; k++) {
      const [r0, y0] = prof[k], [r1, y1] = prof[k + 1], skin = skins[k];
      if (!skin || (r0 < 1e-7 && r1 < 1e-7)) continue;
      const dr = r1 - r0, dy = y1 - y0, l = Math.hypot(dr, dy) || 1, nr = dy / l, ny = -dr / l;
      for (let s = 0; s < segs; s++) {
        const u0 = s / segs, u1 = (s + 1) / segs;
        const N = (u) => { const a = (u - 0.25) * Math.PI * 2; return [Math.sin(a) * nr, ny, Math.cos(a) * nr]; };
        const P = [at(u0, r0, y0), at(u1, r0, y0), at(u1, r1, y1), at(u0, r1, y1)];
        const T = skin(P, u0, u1);
        const um = (u0 + u1) / 2, flat = Math.abs(nr) < 0.2; // near-flat rings (lids, bases) are shaded as one plane
        this.quad({ p: P[0], n: flat ? N(um) : N(u0), t: T[0] }, { p: P[1], n: flat ? N(um) : N(u1), t: T[1] }, { p: P[2], n: flat ? N(um) : N(u1), t: T[2] }, { p: P[3], n: flat ? N(um) : N(u0), t: T[3] });
      }
    }
    return this;
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.p), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(this.n), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(this.t), 2));
    g.computeBoundingBox(); g.computeBoundingSphere();
    g.userData.size = g.boundingBox.getSize(new THREE.Vector3());
    return g;
  }
}
export { Build };
/** Skins: one colour; a wrap between t0 and t1 of a view; a picture seen from above / below. */
export const skin = {
  sw: (uv) => { const t = uv(); return () => [t, t, t, t]; },
  wrap: (v, t0 = 0, t1 = 1) => (P, u0, u1) => [v.st(u0, t0), v.st(u1, t0), v.st(u1, t1), v.st(u0, t1)],
  /** A strip of paint round the body (highlights that stay put): the view's width once round. */
  band: (v) => (P, u0, u1) => [v.st(u0, 0.5), v.st(u1, 0.5), v.st(u1, 0.5), v.st(u0, 0.5)],
  top: (v, R) => (P) => P.map((p) => v.st(Math.min(0.995, Math.max(0.005, 0.5 + p[0] / (2 * R))), Math.min(0.995, Math.max(0.005, 0.5 - p[2] / (2 * R))))),
  under: (v, R) => (P) => P.map((p) => v.st(Math.min(0.995, Math.max(0.005, 0.5 + p[0] / (2 * R))), Math.min(0.995, Math.max(0.005, 0.5 + p[2] / (2 * R))))),
};

// ------------------------------------------------------------------ the drinks' sheet
let SHEET = null;
const LIQ = { vd_ocha: 0xa8b040, vd_mugi: 0x8a4a1a, vd_jasmine: 0xdcc468, vd_milktea: 0xc89a6a, vd_cclemon: 0xf4e468, vd_karupiko: 0xf2f2ea, vd_ponkari: 0xe2eaf0, vd_aquaria: 0xd4eaf6, vd_water: 0xdaeef8, vd_realbold: 0x6a3410, vd_lipovita: 0x5a2a10, vd_kurozu: 0x2a1410, vd_onecup: 0xe6f0f2, ramune: 0x9ee0d8 };
const CAP = { vd_ocha: 0x2a7a3a, vd_mugi: 0x8a5a2a, vd_jasmine: 0x4a8a5a, vd_milktea: 0x8a2a3a, vd_cclemon: 0x3aa04a, vd_karupiko: 0x2a5ad8, vd_ponkari: 0x1a5ad0, vd_aquaria: 0x1e6ae0, vd_water: 0x2a6ad8 };
/** A strip of body paint: base colour with two fixed highlights and a shaded flank (as a cartoon paints glass). */
function bodyStrip(c, glass) {
  return () => {
    const w = 64, p = { w, h: 4, d: new Int32Array(w * 4) };
    for (let x = 0; x < w; x++) { const u = x / w; let col = c; if (u > 0.14 && u < 0.19) col = lt(c, glass ? 0.55 : 0.4); else if (u > 0.21 && u < 0.225) col = lt(c, 0.3); else if (u > 0.34 && u < 0.48) col = dk(c, 0.14); else if (u > 0.64 && u < 0.68) col = lt(c, 0.25); else if (u > 0.84 && u < 0.98) col = dk(c, 0.18); for (let y = 0; y < 4; y++) p.d[y * w + x] = col; }
    return p;
  };
}
export function drinksSheet() {
  if (SHEET) return SHEET;
  const S = SHEET = new Sheet(2048, 2048, 'drinks');
  S.preload = Object.values(FOODS).map((f) => f.jp || '').join('') + Object.values(BRANDS).map((b) => b.jp + b.maker + b.addr).join('') + Object.values(DRINKS).map((d) => d.kind + d.ing + d.vol).join('');
  S.v = {};
  // tallest first packs best
  const ids = Object.keys(DRINKS).sort((a, b) => wrapSize(DRINKS[b].cont)[1] - wrapSize(DRINKS[a].cont)[1]);
  for (const id of ids) {
    const d = DRINKS[id], c = CONT[d.cont], [w, h] = wrapSize(d.cont);
    const V = S.v[id] = {};
    V.wrap = S.region('wrap:' + id, w, h, () => paintWrap(id), c.kind === 'can' ? R_PAINT : c.kind === 'pet' ? 0.5 : R_PAPER, BRANDS[d.brand].paper);
  }
  for (const id of ids) {
    const d = DRINKS[id], c = CONT[d.cont], D = topSize(d.cont), V = S.v[id];
    V.top = S.region(topKey(id), D, D, () => paintTop(id), c.kind === 'can' || c.kind === 'cup' ? R_METAL : R_PLASTIC, 0xc9ced4);
    if (c.kind === 'can') V.base = S.region('base:' + c.d, c.d * 2, c.d * 2, () => paintBase(c.d * 2), R_METAL, 0xc9ced4);
    if (LIQ[id] !== undefined) V.body = S.region('body:' + LIQ[id], 64, 4, bodyStrip(LIQ[id], c.kind !== 'pet'), c.kind === 'pet' ? R_PET : R_GLASS, LIQ[id]);
  }
  S.blank = S.region('wrap:blank', 416, 220, () => { const p = { w: 416, h: 220, d: new Int32Array(416 * 220).fill(0xd4d8dc) }; return p; }, R_METAL, 0xd4d8dc);
  return S;
}

// ------------------------------------------------------------------ the shapes
const SEGS = 16;
function canShape(B, S, V, c, o = {}) {
  const R = c.d / 2 * MM, h = c.h * MM, y0 = c.y0 * MM, y1 = (c.y0 + c.lh) * MM, steel = c.d < 60;
  const sil = skin.sw(S.swatch(o.gold ? 0xd8b860 : 0xc9ced4, R_METAL)), silD = skin.sw(S.swatch(0x9aa0a8, R_METAL)), silL = skin.sw(S.swatch(0xe6eaee, R_METAL));
  const lidY = h - 2.2 * MM, base = V.base ? skin.under(V.base, R) : sil, top = V.top ? skin.top(V.top, R) : sil;
  // up the outside: stand ring, chamfer, wall, shoulder, the rolled seam, then down into the lid
  const prof = [
    [0, 2.4 * MM], [R * 0.7, 2.4 * MM], [R * 0.8, 0], [R * 0.88, 0], [R, steel ? 2.5 * MM : y0], [R, y0], [R, y1],
    [R * (steel ? 0.985 : 0.9), h - 3.2 * MM], [R * (steel ? 1.0 : 0.92), h - 2.6 * MM], [R * (steel ? 1.0 : 0.92), h], [R * (steel ? 0.94 : 0.86), h], [R * (steel ? 0.92 : 0.84), lidY], [0, lidY],
  ];
  const skins = [base, base, silD, sil, steel ? skin.wrap(V.wrap, 0.002, 0.004) : sil, skin.wrap(V.wrap, 0, 1), steel ? skin.wrap(V.wrap, 0.996, 0.998) : sil, silL, silL, silD, top, top];
  if (o.sample) { skins[0] = null; skins[1] = null; }
  B.lathe(prof, o.segs ?? SEGS, skins);
  // the tab stands a little proud of the lid
  const tw = R * 0.18, t0 = -R * 0.5, t1 = R * 0.2;
  if (!o.sample) B.box(-tw, lidY, t0, tw, lidY + 0.9 * MM, t1, () => S.swatch(0x9aa0a8, R_METAL)(), (p) => V.top.st(0.5 + p[0] / (2 * R), 0.5 - p[2] / (2 * R)));
}
function petShape(B, S, V, c, id, o = {}) {
  const R = c.d / 2 * MM, h = c.h * MM, y0 = c.y0 * MM, y1 = (c.y0 + c.lh) * MM, m = MM;
  const body = V.body ? skin.band(V.body) : skin.sw(S.swatch(0xdcecf2, R_PET)), cap = skin.sw(S.swatch(CAP[id] ?? 0x2a6ad8, R_PLASTIC)), capD = skin.sw(S.swatch(dk(CAP[id] ?? 0x2a6ad8, 0.25), R_PLASTIC)), clear = skin.sw(S.swatch(0xe4f0f4, R_PET));
  const prof = [
    [0, 3 * m], [R * 0.55, 3 * m], [R * 0.82, 0], [R * 0.92, 1.5 * m], [R, 8 * m], [R, 40 * m], [R * 0.93, 44 * m], [R * 0.93, 50 * m], [R, 54 * m], [R, y0 - 2 * m], [R * 0.985, y0], [R * 0.985, y1], [R, y1 + 2 * m],
    [R * 0.97, y1 + 10 * m], [R * 0.8, y1 + 24 * m], [R * 0.5, y1 + 33 * m], [13.2 * m, y1 + 37 * m], [13.2 * m, h - 12 * m], [15.6 * m, h - 11.5 * m], [15.6 * m, h - 10 * m], [14.6 * m, h - 9.6 * m], [15 * m, h - 9 * m], [15 * m, h - 0.8 * m], [14.2 * m, h], [0, h],
  ];
  const top = V.top ? skin.top(V.top, 15 * m) : cap;
  const skins = [body, body, body, body, body, body, body, body, body, body, skin.wrap(V.wrap, 0, 1), body, body, body, body, body, clear, clear, clear, clear, capD, cap, cap, top];
  if (o.sample) { skins[0] = null; skins[1] = null; }
  B.lathe(prof, o.segs ?? SEGS, skins);
}
function bottleShape(B, S, V, c, o = {}) {
  const R = c.d / 2 * MM, h = c.h * MM, y0 = c.y0 * MM, y1 = (c.y0 + c.lh) * MM, m = MM;
  const body = skin.band(V.body), gold = skin.sw(S.swatch(0xe2bc50, R_METAL)), goldD = skin.sw(S.swatch(0xb08a30, R_METAL));
  const prof = [[0, 2 * m], [R * 0.7, 2 * m], [R * 0.86, 0], [R, 3 * m], [R, y0], [R, y1], [R, y1 + 8 * m], [R * 0.92, y1 + 14 * m], [R * 0.6, y1 + 24 * m], [9.5 * m, y1 + 30 * m], [9.5 * m, h - 13 * m], [11 * m, h - 12.5 * m], [11 * m, h - 11 * m], [10.2 * m, h - 10.6 * m], [10.6 * m, h - 10 * m], [10.6 * m, h - 1 * m], [9.8 * m, h], [0, h]];
  const skins = [body, body, body, body, skin.wrap(V.wrap, 0, 1), body, body, body, body, body, goldD, gold, goldD, goldD, gold, gold, skin.top(V.top, 10.6 * m)];
  if (o.sample) { skins[0] = null; skins[1] = null; }
  B.lathe(prof, o.segs ?? 12, skins);
}
function cupShape(B, S, V, c, o = {}) {
  const R = c.d / 2 * MM, h = c.h * MM, y0 = c.y0 * MM, y1 = (c.y0 + c.lh) * MM, m = MM;
  const body = skin.band(V.body), sil = skin.sw(S.swatch(0xc9ced4, R_METAL)), silL = skin.sw(S.swatch(0xe6eaee, R_METAL)), glass = skin.sw(S.swatch(0xd0e0e4, R_GLASS));
  const prof = [[0, 2 * m], [R * 0.7, 2 * m], [R * 0.84, 0], [R * 0.9, 2 * m], [R * 0.96, y0], [R * 0.985, y1], [R, h - 8 * m], [R * 1.03, h - 7 * m], [R * 1.03, h - 5 * m], [R * 1.0, h - 4.6 * m], [R * 1.02, h - 4 * m], [R * 1.02, h - 0.6 * m], [R * 0.97, h], [0, h]];
  const skins = [glass, glass, glass, body, skin.wrap(V.wrap, 0, 1), body, glass, glass, sil, silL, silL, silL, skin.top(V.top, R * 1.02)];
  if (o.sample) { skins[0] = null; skins[1] = null; }
  B.lathe(prof, o.segs ?? SEGS, skins);
}
function ramuneShape(B, S, V, c, o = {}) {
  const R = c.d / 2 * MM, h = c.h * MM, y0 = c.y0 * MM, y1 = (c.y0 + c.lh) * MM, m = MM;
  const body = skin.band(V.body), blue = skin.sw(S.swatch(0x2a7ae0, R_PLASTIC)), blueD = skin.sw(S.swatch(0x1e5ab0, R_PLASTIC));
  const prof = [[0, 3 * m], [R * 0.7, 3 * m], [R * 0.86, 0], [R, 4 * m], [R, y0], [R, y1], [R, 108 * m], [R * 0.9, 120 * m], [R * 0.6, 134 * m], [R * 0.5, 140 * m], [R * 0.62, 148 * m], [R * 0.62, 156 * m], [R * 0.46, 163 * m], [R * 0.5, 170 * m], [R * 0.56, 171 * m], [R * 0.56, 176 * m], [R * 0.5, 177 * m], [R * 0.5, h - 1 * m], [R * 0.44, h], [0, h]];
  const skins = [body, body, body, body, skin.wrap(V.wrap, 0, 1), body, body, body, body, body, body, body, body, blueD, blue, blueD, blue, blue, skin.top(V.top, R * 0.5)];
  if (o.sample) { skins[0] = null; skins[1] = null; }
  B.lathe(prof, o.segs ?? 12, skins);
}

const geoCache = new Map();
/** A drink's geometry. o.sample: the lighter one for a vending window (no base, fewer sides). */
export function drinkGeometry(id, o = {}) {
  const key = id + (o.sample ? ':s' : '');
  if (geoCache.has(key)) return geoCache.get(key);
  const S = drinksSheet(), d = DRINKS[id];
  const B = new Build();
  if (!d) canShape(B, S, { wrap: S.blank }, CONT.can350, o);
  else {
    const c = CONT[d.cont], V = S.v[id], oo = { ...o, segs: o.sample ? 10 : undefined, gold: d.brand === 'hoho' && d.alc > 0 && id !== 'vd_dryy' };
    if (c.kind === 'can') canShape(B, S, V, c, oo);
    else if (c.kind === 'pet') petShape(B, S, V, c, id, oo);
    else if (c.kind === 'bottle') bottleShape(B, S, V, c, oo);
    else if (c.kind === 'cup') cupShape(B, S, V, c, oo);
    else ramuneShape(B, S, V, c, oo);
  }
  const g = B.geometry();
  geoCache.set(key, g);
  return g;
}
/** A drink as a mesh (its own material instance is the shared atlas material). */
export function drinkMesh(id, opts = {}) {
  const m = new THREE.Mesh(drinkGeometry(id), drinksSheet().material());
  m.castShadow = opts.castShadow ?? true; m.receiveShadow = opts.receiveShadow ?? true;
  m.name = 'drink:' + id;
  return m;
}
export const isDrink = (id) => !!DRINKS[id];
