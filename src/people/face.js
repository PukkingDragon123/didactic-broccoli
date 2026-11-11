// Face painter. The head's front is one image (the 'face block', ~61 x 90 px). A small relief of the face
// (brow ridge, eye sockets, nose, cheeks, muzzle, lips, chin) is lit from above-front to bake realistic form
// shading; eyes (sclera, iris, pupil, catchlight, lids, lashes), brows, lips, hairline, stubble, wrinkles,
// make-up and glasses are drawn on top. Expressions move the features and the relief; only the region that
// changed is repainted (blinks touch the eye band, talking the mouth band).
import { clamp01, sstep, lerp, mixc, G, h2, shadeInto, over, hairPx } from './paintlib.js';

/** Expression parameters (all optional, 0 = neutral). Units: face pixels. */
export const EXPRESSIONS = {
  neutral: {},
  smile: { corner: 1.5, cheek: 0.6, lower: 0.3, mouthW: 1.05, brow: 0.3 },
  happy: { corner: 2.2, open: 2.4, teeth: 1, cheek: 1, lower: 0.7, brow: 0.7, mouthW: 1.1, upper: 0.85 },
  surprised: { brow: 2.6, upper: 1.35, open: 4.4, round: 0.9, mouthW: 0.7, lines: 1 },
  sad: { inner: 2.2, brow: -0.3, corner: -1.3, upper: 0.8, lookY: 1 },
  angry: { inner: -2.0, furrow: 1, brow: -0.6, upper: 0.85, corner: -0.8, mouthW: 0.9, sneer: 1 },
  sleepy: { upper: 0.4, brow: -0.2, open: 0.8, round: 0.4, mouthW: 0.85, lookY: 0.6 },
};
const KEYS = ['corner', 'cheek', 'lower', 'mouthW', 'brow', 'open', 'teeth', 'upper', 'round', 'lines', 'inner', 'furrow', 'sneer', 'lookY'];
const DEF = { mouthW: 1, upper: 1 };
export function exprParams(name, out = {}) {
  const e = EXPRESSIONS[name] || EXPRESSIONS.neutral;
  for (const k of KEYS) out[k] = e[k] ?? DEF[k] ?? 0;
  return out;
}

const LIGHT = (() => { const l = [0.12, 0.6, 0.79]; const n = Math.hypot(...l); return l.map((v) => v / n); })();
const INK = [26, 18, 18];

export class FacePainter {
  /** block: { x, y, w, h, x0, y1, dens } (atlas px), pix: the atlas Pix */
  constructor(spec, P, block, pix) {
    this.spec = spec; this.P = P; this.B = block; this.pix = pix;
    const d = block.dens, X = (x) => (x - block.x0) * d, Y = (y) => (block.y1 - y) * d;
    const F = spec.face, kid = P.kid, f = P.f;
    const s = (P.hw * d) / 30; // feature scale (tuned for a 30 px half face)
    this.s = s;
    const L = this.L = {
      cx: X(0), hw: P.hw * d, eyeY: Y(P.eyeY), browY: Y(P.browY), noseY: Y(P.noseY), mouthY: Y(P.mouthY), chinY: Y(P.chin), hairY: Y(P.hairY),
      earTopY: Y(P.earTop), earBotY: Y(P.earBot),
    };
    L.eyeX = L.hw * (kid ? 0.4 : 0.385);
    L.ew = L.hw * (kid ? 0.225 : 0.185) * (F.eyeW || 1);
    L.eh = s * (kid ? 2.7 : f ? 2.2 : 2.0) * (F.eyeH || 1) * (F.lid === 'mono' && !kid ? 0.9 : 1);
    L.tilt = s * (F.tilt ?? 0.7);
    L.ir = L.ew * (kid ? 0.5 : 0.44);
    L.browIn = L.hw * 0.15; L.browOut = L.hw * 0.66;
    L.browTh = s * (F.browW || 1) * (kid ? 1.35 : f ? 1.7 : 2.4);
    L.browArch = s * (F.browArch ?? (f || kid ? 1.6 : 0.9));
    L.noseW = s * (kid ? 4.2 : f ? 4.8 : 5.4);
    L.mouthW = s * (kid ? 6.6 : f ? 7.8 : 8.6);
    L.lipU = s * (kid ? 1.5 : f ? 2.0 : 1.7) * (F.lipFull || 1);
    L.lipL = s * (kid ? 2.2 : f ? 2.8 : 2.4) * (F.lipFull || 1);
    this.skin = spec.skin;
    this.lip = F.lipstick || mixc(mixc(spec.skin, [188, 86, 86], f ? 0.5 : 0.36), [120, 60, 60], 0.12);
    this.brow = F.browCol || mixc(mixc(spec.hair.col, [30, 22, 20], spec.hair.grey ? 0 : 0.25), spec.skin, spec.hair.grey ? 0.25 : kid ? 0.3 : 0.08);
    this.iris = F.iris || [72, 44, 30];
    this.age = spec.age === 'elder' ? 1 : spec.age === 'adult' ? 0.25 : 0;
    this.hair = spec.hair;
    this.hb = new Float32Array((block.w + 4) * (block.h + 4));
    this.o = new Float32Array(4);
  }

  /** Hairline y (face px) at horizontal distance ax from the centre; Infinity = no hair at that column. */
  hairline(ax) {
    const L = this.L, st = this.hair.style, s = this.s;
    if (st === 'none') return -1e9;
    if (st === 'bald') return ax > L.hw * 0.86 ? L.earTopY - 4 * s : -1e9;
    let y = L.hairY;
    if (this.spec.sex === 'm' && this.spec.age !== 'kid') y += 2.2 * s * G(ax - L.hw * 0.5, 0, 4 * s, 1) * (this.age > 0.5 ? 1.8 : 1);
    else y += (ax / L.hw) ** 2 * 2 * s;
    // temples / sideburns run down the sides of the face
    const side = sstep(L.hw * 0.68, L.hw * 0.9, ax);
    return lerp(y, L.earTopY + (this.spec.sex === 'm' ? 4 * s : 0), side);
  }

  /** Expression-independent relief (px) at face pixel (x, y). Cached once per human. */
  heightStatic(x, y) {
    const L = this.L, s = this.s, dx = x - L.cx, ax = Math.abs(dx), hw = L.hw, kid = this.P.kid;
    const low = sstep(L.eyeY, L.chinY, y);
    let h = -(dx * dx) / (hw * hw) * (13 + (kid ? 5 : 12) * low) * s;
    const top = clamp01((L.browY - y) / (L.browY - L.hairY + 6 * s));
    h -= top * top * 6 * s;
    h += 0.7 * s * G(dx, y - L.browY - 1.5 * s, 2.6 * s, 3 * s); // glabella
    h -= 3.6 * s * G(ax - L.eyeX + 0.8 * s, y - (L.eyeY - 0.8 * s), 6.2 * s, 4.2 * s); // eye sockets
    h += 1.5 * s * G(ax - L.eyeX, y - L.eyeY, L.ew * 0.95, L.eh * 1.9); // eyeballs
    // nose: bridge ridge widening to the tip, wings, tip ball, nostrils
    const tn = clamp01((y - (L.eyeY - 2 * s)) / (L.noseY - L.eyeY + 2 * s));
    if (y > L.browY && y < L.noseY + 2 * s) h += (1.6 + 2.6 * tn) * s * Math.exp(-(dx * dx) / (2 * (lerp(1.3, 2.6, tn) * s) ** 2)) * sstep(L.browY, L.eyeY, y);
    h += 2.6 * s * G(dx, y - (L.noseY - 2 * s), 2.4 * s, 2.1 * s);
    h += 1.8 * s * G(ax - L.noseW * 0.72, y - (L.noseY - 1.2 * s), 1.4 * s, 1.6 * s);
    h -= 1.6 * s * G(ax - L.noseW * 0.4, y - (L.noseY + 0.1 * s), 0.9 * s, 0.55 * s);
    if (!kid) h -= (1.1 + this.age * 0.6) * s * G(ax - hw * 0.66, y - (L.noseY + 2.5 * s), 2.6 * s, 4.5 * s); // under the cheekbones
    // philtrum, chin, temples
    h -= 0.6 * s * G(dx, y - (L.noseY + L.mouthY) / 2, 0.9 * s, 2.2 * s);
    h += 0.35 * s * G(ax - 1.5 * s, y - (L.noseY + L.mouthY) / 2, 0.6 * s, 2.2 * s);
    h += 2.4 * s * G(dx, y - (L.chinY - 4.5 * s), 5 * s, 3.4 * s);
    h -= 1.0 * s * G(ax - hw * 0.86, y - (L.browY - 2 * s), 3 * s, 5 * s);
    if (this.age > 0.5 && y > L.mouthY) h -= 0.7 * s * G(ax - L.mouthW - 1.4 * s, 0, 0.8 * s, 1) * sstep(L.mouthY, L.mouthY + 3 * s, y) * sstep(L.chinY - 2 * s, L.mouthY + 5 * s, y); // marionette lines
    return h;
  }

  /** Expression-dependent relief; every term is skipped outside its region. */
  heightDyn(x, y, E) {
    const L = this.L, s = this.s, dx = x - L.cx, ax = Math.abs(dx), hw = L.hw, kid = this.P.kid;
    let h = 0;
    if (Math.abs(y - L.browY) < 9 * s) h += 1.5 * s * G(ax - L.eyeX * 0.95, y - (L.browY + 1.2 * s - (E.brow || 0) * 0.5), 7 * s, 2.2 * s); // brow ridge
    const ly = L.eyeY + L.eh + 1.8 * s - (E.lower || 0) * 0.8 * s;
    if (Math.abs(y - ly) < 4 * s) h += (0.5 + this.age * 0.6) * s * G(ax - L.eyeX + 0.5 * s, y - ly, L.ew * 0.8, 1.1 * s); // lower lid / bags
    if (E.sneer && Math.abs(y - L.eyeY - 2 * s) < 5 * s) h -= E.sneer * 0.8 * s * G(dx, y - (L.eyeY + 2 * s), 3 * s, 1.5 * s);
    const ch = E.cheek || 0, cy = L.eyeY + 7.5 * s - ch * 2 * s;
    if (Math.abs(y - cy) < 20 * s) h += (2.2 + ch * 0.8 + (kid ? 1.4 : 0)) * s * G(ax - hw * 0.56, y - cy, (kid ? 7.5 : 6) * s, (kid ? 6.5 : 5) * s);
    const mw = L.mouthW * (E.mouthW || 1);
    if (y > L.noseY - 8 * s) {
      h += 2.2 * s * G(dx, y - (L.mouthY - 1.5 * s), mw * 1.3, 6.5 * s); // muzzle
      const lipB = L.mouthY + (E.open || 0) * 0.7 + L.lipL;
      if (Math.abs(y - lipB - 1.6 * s) < 4 * s) h -= 1.3 * s * G(dx, y - (lipB + 1.6 * s), mw * 0.7, 1.2 * s); // mentolabial sulcus
      const nl = (0.35 + this.age * 1.4 + ch * 1.3) * s;
      if (y > L.noseY - 3 * s && y < L.mouthY + 5 * s) {
        const ty = clamp01((y - (L.noseY - 2 * s)) / (L.mouthY + 4 * s - L.noseY));
        h -= nl * G(ax - lerp(L.noseW + 1.2 * s, mw + 2.4 * s + ch * s, ty), 0, 1.0 * s, 1); // nasolabial folds
      }
    }
    const lines = (E.lines || 0) + this.age * 0.8;
    if (lines > 0 && y < L.browY - 3.5 * s && y > L.browY - 13 * s) {
      const wob = (y - L.browY) * 1.9 / s + Math.sin(dx * 0.35 / s) * 0.8 + (dx * dx) / (hw * hw) * 2.2;
      h -= lines * 0.5 * s * Math.max(0, Math.sin(wob)) ** 2 * G(dx, 0, 10 * s, 1) * (0.6 + 0.4 * Math.sin(dx * 0.7 / s + 1));
    }
    if (E.furrow && Math.abs(y - L.browY) < 6 * s) h -= E.furrow * 0.8 * s * G(ax - 1.4 * s, y - (L.browY + 0.5 * s), 0.6 * s, 2 * s);
    return h;
  }

  /** One-off caches: static relief, per-pixel tint (o = o * A + B), hairline hair and glasses layers. */
  bake() { const it = this.bakeJob(); while (!it.next().done); }
  *bakeJob() {
    if (this.hs) return;
    const B = this.B, L = this.L, s = this.s, F = this.spec.face, W2 = B.w + 2, n = W2 * (B.h + 2);
    const hs = new Float32Array(n);
    for (let j = -1; j <= B.h; j++) {
      for (let i = -1; i <= B.w; i++) hs[(j + 1) * W2 + i + 1] = this.heightStatic(i + 0.5, j + 0.5);
      if ((j & 7) === 7) yield;
    }
    const N = B.w * B.h;
    this.kk = new Float32Array(N); this.tA = new Float32Array(N); this.tB = new Float32Array(N * 3);
    this.lay = new Float32Array(N * 4); // hair + glasses over everything: rgb + alpha
    const o = new Float32Array(4), c = new Float32Array(4);
    const hl = new Float32Array(B.w);
    for (let i = 0; i < B.w; i++) hl[i] = this.hairline(Math.abs(i + 0.5 - L.cx));
    for (let j = 0; j < B.h; j++) for (let i = 0; i < B.w; i++) {
      if (i === 0 && (j & 7) === 7) yield;
      const x = i + 0.5, y = j + 0.5, dx = x - L.cx, ax = Math.abs(dx), q = j * B.w + i;
      let k = 1 - 0.16 * sstep(L.chinY - 3 * s, L.chinY + 0.5, y) * (0.6 + 0.4 * ax / L.hw);
      k *= 1 + (h2(i, j, 31) - 0.5) * (F.makeup ? 0.02 : 0.045);
      // soft shadow of the hair mass on the forehead
      const hy = hl[i];
      if (y > hy + 2.5 * s && y < hy + 5 * s) k *= 1 - 0.13 * (1 - (y - hy - 2.5 * s) / (2.5 * s));
      this.kk[q] = k;
      // tints as one affine map: start from 'identity' (A = 1, B = 0) and fold each over() into it
      let A = 1; const Bc = [0, 0, 0];
      const tint = (col, t) => { if (t <= 0.001) return; t = Math.min(1, t); A *= 1 - t; for (let m = 0; m < 3; m++) Bc[m] = Bc[m] * (1 - t) + col[m] * t; };
      tint([214, 104, 98], (F.blush ?? 0.25) * 0.22 * G(ax - L.hw * 0.56, y - (L.eyeY + 7 * s), 5 * s, 4 * s) + 0.07 * G(dx, y - L.noseY + 2 * s, 3 * s, 2.5 * s));
      tint([96, 66, 80], 0.1 * G(ax - L.eyeX + 1.2 * s, y - L.eyeY + 0.5 * s, 6 * s, 3.6 * s) * (0.7 + this.age));
      if (F.stubble) {
        const z = G(dx, y - (L.mouthY + 2 * s), L.mouthW * 1.5, 7 * s) * sstep(L.noseY + 0.5 * s, L.noseY + 2.2 * s, y) + 0.8 * sstep(L.hw * 0.62, L.hw * 0.86, ax) * sstep(L.noseY, L.mouthY, y);
        if (z > 0.05) tint([70, 72, 84], F.stubble * clamp01(z) * (0.18 + h2(i, j, 77) * 0.22));
      }
      if (F.spots && this.age > 0.5 && h2(i, j, 91) > 0.988 && (y < L.browY - 2 * s || ax > L.hw * 0.5)) tint([150, 100, 72], 0.28);
      if (F.freckles && y > L.eyeY + 2 * s && y < L.noseY + 2 * s && ax < L.hw * 0.7 && h2(i, j, 92) > 0.93) tint([168, 102, 70], 0.4 * F.freckles);
      const mk = F.makeup;
      if (mk?.blush) tint(mk.blush, 0.22 * G(ax - L.hw * 0.55, y - (L.eyeY + 6 * s), 5 * s, 3.5 * s));
      if (mk?.highlight) tint([255, 246, 236], mk.highlight * (0.5 * G(dx, y - (L.eyeY + 1 * s), 1.2 * s, 5 * s) + 0.6 * G(ax - L.eyeX, y - (L.eyeY + L.eh + 2.2 * s), L.ew * 0.7, 1 * s)));
      this.tA[q] = A; this.tB[q * 3] = Bc[0]; this.tB[q * 3 + 1] = Bc[1]; this.tB[q * 3 + 2] = Bc[2];
      // hair + glasses layer (premultiplied by painting over transparent black, alpha tracked separately)
      o[0] = o[1] = o[2] = 0; let a = 0;
      if (this.hair.style !== 'none' && y < hy + 2.5 * s) {
        const edge = (hy - y) / (2.5 * s) + 0.5 + (h2(i, j, 13) - 0.5) * 0.9;
        if (edge >= 0.35) {
          a = clamp01((edge - 0.35) * 2.2);
          hairPx(c, this.hair, i + Math.round(dx * 0.15 * (y - hy) / s), j, 0.95, 0.15 * G(dx, y - L.hairY + 10 * s, 14 * s, 6 * s));
          o[0] = c[0]; o[1] = c[1]; o[2] = c[2];
        }
      }
      if (F.mustache) {
        const mw = L.mouthW + 1.5 * s, u = dx / mw;
        if (Math.abs(u) < 1.05 && y > L.noseY + 1.2 * s && y < L.mouthY - 0.4 * s + Math.abs(u) * 1.5 * s) {
          hairPx(c, this.hair, i, j, 0.85, 0.1);
          const t = 0.85 * sstep(1.05, 0.8, Math.abs(u)) * (h2(i, j, 61) > 0.15 ? 1 : 0.4);
          o[0] = o[0] * (1 - t) + c[0] * t; o[1] = o[1] * (1 - t) + c[1] * t; o[2] = o[2] * (1 - t) + c[2] * t; a = a + (1 - a) * t;
        }
      }
      if (this.spec.glasses) {
        c[0] = o[0]; c[1] = o[1]; c[2] = o[2]; c[3] = a;
        const ga = this.glassesPx(c, x, y);
        if (ga > 0) { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; a = ga; }
      }
      this.lay[q * 4] = o[0]; this.lay[q * 4 + 1] = o[1]; this.lay[q * 4 + 2] = o[2]; this.lay[q * 4 + 3] = a;
    }
    this.hs = hs;
  }

  /** Paint the face (or a sub-rect in face px) for expression params E (+ blink, lookX, lookY). */
  paint(E, r = null) {
    if (!this.hs) this.bake();
    const B = this.B, d = this.pix.d, W = this.pix.w, W2 = B.w + 2;
    const x0 = r ? Math.max(0, r[0] | 0) : 0, y0 = r ? Math.max(0, r[1] | 0) : 0;
    const x1 = r ? Math.min(B.w, Math.ceil(r[2])) : B.w, y1 = r ? Math.min(B.h, Math.ceil(r[3])) : B.h;
    const hb = this.hb, hw = x1 - x0 + 2, hs = this.hs;
    for (let j = y0 - 1; j <= y1; j++) for (let i = x0 - 1; i <= x1; i++) hb[(j - y0 + 1) * hw + (i - x0 + 1)] = hs[(j + 1) * W2 + i + 1] + this.heightDyn(i + 0.5, j + 0.5, E);
    const o = this.o, skin = this.skin, kk = this.kk, tA = this.tA, tB = this.tB, lay = this.lay;
    for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) {
      const x = i + 0.5, y = j + 0.5, q = j * B.w + i;
      const k0 = (j - y0 + 1) * hw + (i - x0 + 1);
      const gx = (hb[k0 + 1] - hb[k0 - 1]) * 0.5, gy = (hb[k0 + hw] - hb[k0 - hw]) * 0.5;
      const nl = 1 / Math.sqrt(gx * gx + gy * gy + 1);
      const dif = Math.max(0, (-gx * LIGHT[0] + gy * LIGHT[1] + LIGHT[2]) * nl);
      const cav = (hb[k0 - 1] + hb[k0 + 1] + hb[k0 - hw] + hb[k0 + hw]) * 0.25 - hb[k0];
      shadeInto(o, skin, (0.54 + 0.5 * dif - Math.max(0, cav) * 0.05) * kk[q], 0.26);
      o[3] = 255;
      const A = tA[q];
      if (A < 0.999) { o[0] = o[0] * A + tB[q * 3]; o[1] = o[1] * A + tB[q * 3 + 1]; o[2] = o[2] * A + tB[q * 3 + 2]; }
      this.mouth(o, x, y, E);
      this.brows(o, x, y, i, j, E);
      this.eye(o, x, y, 1, E); this.eye(o, x, y, -1, E);
      const a = lay[q * 4 + 3];
      if (a > 0) { o[0] += (lay[q * 4] - o[0]) * a; o[1] += (lay[q * 4 + 1] - o[1]) * a; o[2] += (lay[q * 4 + 2] - o[2]) * a; }
      const p = ((B.y + j) * W + B.x + i) * 4;
      d[p] = o[0] < 0 ? 0 : o[0] > 255 ? 255 : o[0]; d[p + 1] = o[1] < 0 ? 0 : o[1] > 255 ? 255 : o[1]; d[p + 2] = o[2] < 0 ? 0 : o[2] > 255 ? 255 : o[2]; d[p + 3] = 255;
    }
    // the 1px gutter around the block repeats the edge
    if (!r || x0 === 0 || y0 === 0 || x1 === B.w || y1 === B.h) this.gutter();
    this.pix.dirty = true;
    return [B.x + x0 - 1, B.y + y0 - 1, x1 - x0 + 2, y1 - y0 + 2];
  }

  gutter() {
    const B = this.B, d = this.pix.d, W = this.pix.w;
    const cp = (sx, sy, dx, dy) => { const a = ((B.y + sy) * W + B.x + sx) * 4, b = ((B.y + dy) * W + B.x + dx) * 4; d[b] = d[a]; d[b + 1] = d[a + 1]; d[b + 2] = d[a + 2]; d[b + 3] = d[a + 3]; };
    for (let i = -1; i <= B.w; i++) { const c = Math.max(0, Math.min(B.w - 1, i)); cp(c, 0, i, -1); cp(c, B.h - 1, i, B.h); }
    for (let j = 0; j < B.h; j++) { cp(0, j, -1, j); cp(B.w - 1, j, B.w, j); }
  }

  brows(o, x, y, i, j, E) {
    const L = this.L, s = this.s;
    if (y < L.browY - 7 * s || y > L.browY + 5 * s) return;
    const side = x >= L.cx ? 1 : -1, u = (x - L.cx) * side;
    const u0 = L.browIn - (E.furrow || 0) * 1.2 * s, u1 = L.browOut;
    const t = (u - u0) / (u1 - u0);
    if (t < -0.08 || t > 1.08) return;
    const br = (E.brow || 0) * s, inn = (E.inner || 0) * s;
    const yIn = L.browY + 0.8 * s - br * 0.85 - inn + (E.furrow || 0) * 0.8 * s;
    const yPk = L.browY - L.browArch - br, yOut = L.browY + 1.4 * s - br * 0.7 - inn * 0.25;
    const tc = Math.max(0, Math.min(1, t));
    const yc = tc < 0.62 ? lerp(yIn, yPk, Math.sin(tc / 0.62 * Math.PI / 2)) : lerp(yPk, yOut, ((tc - 0.62) / 0.38) ** 1.4);
    const th = L.browTh * (1.18 - 0.72 * tc);
    const dist = Math.abs(y - yc + (tc < 0.25 ? (0.25 - tc) * 1.5 * s : 0));
    let a = sstep(th / 2 + 0.7, th / 2 - 0.3, dist) * sstep(-0.08, 0.14, t) * sstep(1.08, 0.86, t);
    if (a <= 0) return;
    a *= 0.62 + h2(i, j, 41) * 0.5 - (tc < 0.15 ? 0.25 : 0);
    const k = 0.75 + h2(i, j + 3, 42) * 0.4;
    const c = this.brow, bc = this.bc || (this.bc = [0, 0, 0]);
    bc[0] = c[0] * k; bc[1] = c[1] * k; bc[2] = c[2] * k;
    over(o, bc, Math.min(1, a));
  }

  eye(o, x, y, side, E) {
    const L = this.L, s = this.s, F = this.spec.face;
    const ecx = L.cx + side * L.eyeX, ecy = L.eyeY;
    const u = (x - ecx) * side, t = u / L.ew;
    if (t < -1.25 || t > 1.45 || Math.abs(y - ecy) > L.eh * 2.8 + 2) return;
    const open = Math.max(0, (E.upper ?? 1) * (1 - (E.blink || 0)));
    const tc = Math.max(-1, Math.min(1, t));
    const sh = Math.max(0, 1 - tc * tc);
    const yC = ecy + L.tilt * 0.5 * (-tc); // corner line: outer corner higher
    const yClosed = yC + L.eh * 0.5 * Math.pow(sh, 0.8);
    const yTopOpen = yC - L.eh * Math.pow(sh, 0.5) * (1 + 0.12 * (0.2 - tc));
    const top = yClosed + (yTopOpen - yClosed) * Math.min(open, 1.6);
    const bot = Math.max(top, yC + L.eh * 0.55 * Math.pow(sh, 0.85) * (1 - (E.lower || 0) * 0.55));
    const mk = F.makeup || {};
    const liner = (mk.liner || 0) * s, lash = mk.lash || 0;
    const inside = t > -1 && t < 1 && y > top && y < bot + 0.15;
    if (inside && open > 0.08) {
      const ix = ecx + (E.lookX || 0), iy = ecy + (E.lookY || 0) * 0.7 * s - 0.15 * L.eh;
      const dxi = x - ix, dyi = y - iy, di = Math.sqrt(dxi * dxi + dyi * dyi), ir = L.ir;
      if (di < ir + 0.25) {
        const ring = sstep(ir * 0.55, ir + 0.2, di);
        const ic = this.iris;
        const lowerLight = 0.85 + 0.35 * clamp01((dyi + ir) / (2 * ir));
        o[0] = ic[0] * (1 - ring * 0.55) * lowerLight; o[1] = ic[1] * (1 - ring * 0.55) * lowerLight; o[2] = ic[2] * (1 - ring * 0.55) * lowerLight;
        if (di < ir * 0.42) { o[0] = 16; o[1] = 12; o[2] = 12; }
        // catchlight (upper left, same for both eyes)
        if (Math.abs(x - (ix - ir * 0.42)) < 0.62 && Math.abs(y - (iy - ir * 0.42)) < 0.62) { o[0] = 250; o[1] = 246; o[2] = 236; }
      } else {
        const corner = Math.pow(Math.abs(tc), 3);
        const k = (0.93 - corner * 0.3) * (1 - 0.35 * Math.exp(-(y - top) / 0.9));
        o[0] = 236 * k; o[1] = 228 * k; o[2] = 220 * k;
        if (t < -0.82) { o[0] = 212; o[1] = 150; o[2] = 142; } // caruncle
      }
      // upper lid shadow over the eyeball
      if (y - top < 1) { o[0] *= 0.75; o[1] *= 0.72; o[2] *= 0.72; }
    }
    // upper lash line (thicker at the outer half), closed-lid line
    const lw = (open < 0.08 ? 1.1 : 0.9 + 0.7 * sstep(-0.3, 0.8, t)) * s + liner;
    if (t > -1.02 && t < 1.04 && y <= top + 0.45 && y > top - lw) over(o, INK, t < -0.75 ? 0.6 : 0.95);
    // winged liner / lashes beyond the outer corner
    if ((lash > 0 || liner > 0) && t >= 0.85 && t < 1.15 + lash * 0.35) {
      const yw = yC - L.eh * 0.1 - (t - 0.85) * (1.2 + lash) * s;
      if (Math.abs(y - yw) < 0.55 + liner * 0.3) over(o, INK, 0.9);
    }
    if (lash > 0 && t > 0.1 && t < 0.95 && y < top - lw + 0.2 && y > top - lw - 1.0 * s && h2(Math.floor(x), Math.floor(y), 55) < lash * 0.6) over(o, INK, 0.8);
    // lower lid: soft lash line + light rim below
    if (t > -0.85 && t < 1 && open > 0.08) {
      if (y > bot && y < bot + 1) over(o, mk.lower ? INK : [96, 58, 54], mk.lower ? 0.85 : 0.22 + 0.18 * sstep(0, 1, t));
      if (y >= bot + 1 && y < bot + 2) over(o, [250, 230, 220], 0.07);
    }
    // upper lid skin + crease (double lid) + eyeshadow
    if (t > -0.9 && t < 1.1 && y < top - lw && y > top - lw - 3.4 * s) {
      const gap = top - lw - y;
      if (mk.shadow) over(o, mk.shadow, 0.4 * (1 - gap / (3.4 * s)));
      if (F.lid !== 'mono' && open > 0.3 && Math.abs(gap - 1.7 * s * Math.min(1, open)) < 0.55 && t > -0.55) over(o, [92, 56, 50], 0.4);
    }
    // crow's feet
    if (this.age > 0.5 && t > 1.12 && t < 1.65) {
      const r = (t - 1.1) * L.ew;
      for (const a of [-0.5, 0, 0.45]) if (Math.abs(y - (ecy - 0.5 * s + a * r)) < 0.4) over(o, [120, 74, 62], 0.22);
    }
  }

  mouth(o, x, y, E) {
    const L = this.L, s = this.s;
    const mw = L.mouthW * (E.mouthW || 1);
    const u = (x - L.cx) / mw;
    if (u < -1.35 || u > 1.35 || y < L.mouthY - 6 * s || y > L.mouthY + 9 * s) return;
    const uc = Math.max(-1, Math.min(1, u)), sh = Math.max(0, 1 - uc * uc);
    const corner = (E.corner || 0) * s;
    const yLine = L.mouthY - corner * uc * uc + 0.25 * s * (E.sneer || 0) * (1 - sh);
    const open = (E.open || 0) * s * Math.pow(sh, 0.5 + (E.round || 0) * 0.35);
    const yT = yLine - open * 0.32, yB = yLine + open * 0.68;
    const upTh = L.lipU * Math.pow(sh, 0.4) * (1 - 0.28 * G(u, 0, 0.13, 1)) * (1 - (E.corner > 1 ? 0.15 : 0));
    const loTh = L.lipL * Math.pow(sh, 0.55) * (1 - 0.2 * (E.round || 0) * 0);
    const lip = this.lip;
    if (y > yT - upTh - 0.5 && y < yT + 0.2 && Math.abs(u) < 1.02) {
      // upper lip: faces down, darker; a soft cupid's-bow edge
      const a = sstep(yT - upTh - 0.5, yT - upTh + 0.5, y);
      over(o, [lip[0] * 0.8, lip[1] * 0.72, lip[2] * 0.74], a * 0.92);
      if (y < yT - upTh + 0.5) over(o, [255, 232, 220], 0.1 * sh);
    }
    if (y > yB - 0.2 && y < yB + loTh + 0.5 && Math.abs(u) < 0.98) {
      // lower lip: catches the light, a highlight in the middle
      const a = sstep(yB + loTh + 0.5, yB + loTh - 0.5, y);
      const hi = G(u, y - (yB + loTh * 0.42), 0.32, 0.7);
      over(o, [lip[0] * (1.02 + hi * 0.22), lip[1] * (1 + hi * 0.2), lip[2] * (1 + hi * 0.2)], a * 0.88);
    }
    if (open > 0.6 && y > yT - 0.2 && y < yB + 0.2 && Math.abs(u) < 0.98) {
      // inside of the mouth: teeth, tongue, dark
      const depth = clamp01((y - yT) / Math.max(1, yB - yT));
      o[0] = 50; o[1] = 18; o[2] = 22;
      if (E.teeth && y < yT + 1.6 * s && Math.abs(u) < 0.8) { const k = 0.94 - Math.abs(u) * 0.28; o[0] = 238 * k; o[1] = 230 * k; o[2] = 216 * k; }
      else if (open > 3 * s && depth > 0.6) { o[0] = 156; o[1] = 64; o[2] = 68; }
      if (y < yT + 0.6) { o[0] *= 0.8; o[1] *= 0.8; o[2] *= 0.8; }
    } else if (Math.abs(y - yLine - 0.2) < 0.62 && Math.abs(u) < 1.02) {
      // closed: the dark line between the lips, darkest in the middle and the corners
      over(o, [62, 26, 28], 0.62 + 0.25 * (1 - sh) + 0.1 * G(u, 0, 0.3, 1));
    }
    if (Math.abs(u) > 0.95 && Math.abs(u) < 1.15 && Math.abs(y - yLine) < 0.9) over(o, [96, 50, 46], 0.4);
  }

  /** Glasses into the layer colour c (alpha c[3]); returns the new alpha. */
  glassesPx(c, x, y) {
    const g = this.spec.glasses, L = this.L, s = this.s;
    const side = x >= L.cx ? 1 : -1;
    const gx = L.cx + side * L.eyeX, gy = L.eyeY + 0.6 * s;
    const hwG = L.ew + 2.8 * s, hhG = L.eh + (g.kind === 'round' ? 3.6 : 2.8) * s;
    const dx = (x - gx) / hwG, dy = (y - gy) / hhG;
    const r = g.kind === 'round' ? Math.sqrt(dx * dx + dy * dy) : Math.pow(Math.pow(Math.abs(dx), 4) + Math.pow(Math.abs(dy), 4), 0.25);
    const th = (g.thick || 1) / Math.min(hwG, hhG), fc = g.col;
    const put = (col, t) => { c[0] += (col[0] - c[0]) * t; c[1] += (col[1] - c[1]) * t; c[2] += (col[2] - c[2]) * t; c[3] = c[3] + (1 - c[3]) * t; };
    if (r < 1 - th) {
      if (g.kind === 'sun') { put([26, 24, 30], 0.86); put([120, 110, 140], 0.25 * clamp01(1 - (y - gy + hhG) / (hhG * 1.2))); }
      else { put([190, 215, 230], 0.08); if (Math.abs((x - gx) + (y - gy) * 0.9 + hwG * 0.3) < 0.7 && dy < 0.2) put([255, 255, 255], 0.22); }
    } else if (r < 1 + th * 0.4) put(fc, 0.95);
    if (Math.abs(y - (gy - hhG * 0.45)) < 0.6 && Math.abs(x - L.cx) < L.eyeX - hwG + 0.5) put(fc, 0.9);
    if (Math.abs(y - (gy - hhG * 0.55)) < 0.6 && Math.abs(x - L.cx) > L.eyeX + hwG - 0.3) put(fc, 0.9);
    return c[3];
  }

  /** Quick placeholder: plain skin with dark eye / brow / mouth hints (no relief), shown until the real paint runs. */
  paintFlat() {
    const B = this.B, L = this.L, d = this.pix.d, W = this.pix.w, sk = this.skin, hc = this.hair.col;
    for (let j = -1; j <= B.h; j++) for (let i = -1; i <= B.w; i++) {
      const x = i + 0.5, y = j + 0.5, ax = Math.abs(x - L.cx);
      let c = sk;
      if (this.hair.style !== 'none' && this.hair.style !== 'bald' && y < this.hairline(ax)) c = hc;
      else if (Math.abs(y - L.eyeY) < L.eh * 0.7 && Math.abs(ax - L.eyeX) < L.ew * 0.7) c = [40, 30, 30];
      else if (Math.abs(y - L.mouthY) < 0.8 && ax < L.mouthW * 0.8) c = this.lip;
      const p = ((B.y + j) * W + B.x + i) * 4;
      d[p] = c[0]; d[p + 1] = c[1]; d[p + 2] = c[2]; d[p + 3] = 255;
    }
    this.pix.dirty = true;
  }

  /** Face-pixel rects for partial repaints. */
  eyeRect() { const L = this.L, s = this.s; return [L.cx - L.eyeX - L.ew * 1.8, L.browY - 7 * s, L.cx + L.eyeX + L.ew * 1.8, L.eyeY + L.eh * 2.5 + 3 * s]; }
  mouthRect() { const L = this.L, s = this.s; return [L.cx - L.mouthW * 1.6, L.noseY - 1 * s, L.cx + L.mouthW * 1.6, L.mouthY + 10 * s]; }
}
