// Modelled hair: each style is one sculpted mass over the real skull (src/people/base.js) — meridians running from the
// whorl down to a cut hem, standing off the scalp by the style's volume, grooved into clumps whose tips make the hem —
// plus the separate pieces some styles need (tails on spring bones, a bun, spikes, flicks, a headband).
// The mass is textured from a small painted strand swatch in the atlas (paint.js 'hairSwatch'); hair ties and bands are
// vertex-coloured like the modelled gear. Everything is appended to the body mesh, so a person is still one draw call.
import { GEAR_HATS } from './gear.js';

// bone indices (src/people/body.js BONES; not imported: body.js imports this module)
const HEAD = 4, CHEST = 2, TAIL_L = 18, TAIL_R = 19;
const TAU = Math.PI * 2;
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const G = (x, s) => Math.exp(-(x * x) / (2 * s * s));
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/** The swatch's size in atlas px (strands run down it). */
export const SWATCH = { w: 112, h: 56 };

/** Where the hair starts: height (m) of the hairline at azimuth th (0 = the face, ±pi = the back of the head). */
export function hairlineFn(P, spec) {
  const hu = P.hu, m = spec.sex === 'm' && spec.age !== 'kid', old = spec.age === 'elder';
  const rec = m ? (old ? 0.05 : 0.025) * hu : 0;
  const K = [0, 0.42, 0.78, 1.02, 1.3, 1.85, 2.4, Math.PI];
  const Y = [P.hairY, P.hairY - (m ? -rec * 0.4 : 0.008 * hu), P.hairY - (m ? -rec : 0.04 * hu), m ? P.earTop + 0.03 * hu : P.earTop + 0.06 * hu,
    m ? P.earTop - 0.06 * hu : P.earTop + 0.03 * hu, P.earTop + 0.025 * hu, P.napeY + 0.02 * hu, P.napeY];
  return (th) => {
    const a = Math.min(Math.PI, Math.abs(th));
    let i = 0; while (i < K.length - 2 && a > K[i + 1]) i++;
    const t = (a - K[i]) / (K[i + 1] - K[i]), s = t * t * (3 - 2 * t);
    return Y[i] + (Y[i + 1] - Y[i]) * s;
  };
}

/** Is the scalp at (x, y, z) under hair (bald: only the band round the back)? For the painters. */
export function scalpHair(P, spec, hl = hairlineFn(P, spec)) {
  const st = spec.hair.style, hu = P.hu;
  if (st === 'none') return () => false;
  if (st === 'bald') return (x, y, z) => y > P.napeY && y < P.earTop + 0.12 * hu && Math.abs(Math.atan2(x, z - P.hcz)) > 1.25;
  return (x, y, z) => y > hl(Math.atan2(x, z - P.hcz));
}

/** Tail bones (ponytails / twin tails) placed for the style; call before the skeleton is made. */
export function hairJoints(spec, P, J) {
  const st = spec.hair.style, hu = P.hu, hat = spec.hat?.kind;
  if (hat && hat !== 'headband' && st !== 'ponytail') return;
  if (st === 'ponytail') J.tailL = [0, P.eyeY + (hat ? 0.0 : 0.12) * hu, P.hcz - P.hd - 0.03 * hu];
  else if (st === 'twintails') { J.tailL = [P.hw + 0.02 * hu, P.earTop + 0.1 * hu, P.hcz - 0.24 * hu]; J.tailR = [-J.tailL[0], J.tailL[1], J.tailL[2]]; }
  else if (st === 'pigtails') { J.tailL = [P.hw + 0.01 * hu, P.earBot + 0.0 * hu, P.hcz - 0.2 * hu]; J.tailR = [-J.tailL[0], J.tailL[1], J.tailL[2]]; }
}

// ------------------------------------------------------------------ the styles
// t0: volume off the scalp (x hu); top: extra on the crown; quiff: extra at the front top; ext: length past the hairline
// at the front / sides / back (x hu, along the surface); hang: { y (x hu above the chin, or 'bust'), flare }; n: clumps
// round the head; g: groove depth; tip: clump tip length (x hu); part: whorl to the side (x part); sweep: the fringe's
// slant; mess: randomness; curl: bumps along the strands; taper: the hem lies down onto the skin (short cuts)
const STYLES = {
  short: { t0: 0.04, top: 0.025, ext: [0.05, 0.0, 0.0], n: 18, g: 0.45, tip: 0.05, taper: 1, sweep: 0.25 },
  sidepart: { t0: 0.038, top: 0.02, ext: [0.03, 0.0, 0.0], n: 20, g: 0.35, tip: 0.04, taper: 1, part: 0.45, sweep: 0.75, partGroove: 1 },
  buzz: { t0: 0.012, top: 0.004, ext: [0, -0.01, -0.02], n: 0, g: 0, tip: 0, taper: 1 },
  messy: { t0: 0.06, top: 0.035, ext: [0.16, 0.05, 0.05], n: 20, g: 0.6, tip: 0.09, mess: 1, sweep: 0.15 },
  rohan: { t0: 0.06, top: 0.03, ext: [0.18, 0.08, 0.07], n: 18, g: 0.5, tip: 0.08, part: 0.35, sweep: 0.9, mess: 0.4, flick: 1 },
  spiky: { t0: 0.03, top: 0.01, ext: [0.02, -0.01, -0.01], n: 16, g: 0.4, tip: 0.03, taper: 1, spikes: 1 },
  pompadour: { t0: 0.04, top: 0.02, quiff: 0.32, ext: [0.0, 0.0, 0.0], n: 22, g: 0.3, tip: 0.03, taper: 1, sleek: 1 },
  perm: { t0: 0.09, top: 0.04, ext: [0.04, 0.06, 0.03], n: 26, g: 0.2, tip: 0.035, curl: 1 },
  mushroom: { t0: 0.07, top: 0.04, bowl: 1, flare: 0.06, n: 26, g: 0.35, tip: 0.035 },
  bowl: { t0: 0.05, top: 0.03, bowl: 1, flare: 0.02, n: 30, g: 0.25, tip: 0.02 },
  bob: { t0: 0.06, top: 0.03, ext: [0.2, 0, 0], hang: { y: 0.14, flare: 0.05, curl: 1 }, n: 26, g: 0.35, tip: 0.04, sweep: 0.2 },
  long: { t0: 0.05, top: 0.025, ext: [0.2, 0, 0], hang: { y: 'bust', flare: 0.03 }, n: 24, g: 0.4, tip: 0.07, sweep: 0.35 },
  ponytail: { t0: 0.03, top: 0.015, ext: [0.12, 0, -0.02], n: 22, g: 0.25, tip: 0.04, sleekBack: 1, sweep: 0.6, part: 0.35 },
  twintails: { t0: 0.032, top: 0.015, ext: [0.15, 0.02, 0.0], n: 22, g: 0.3, tip: 0.05, sweep: 0.1 },
  pigtails: { t0: 0.032, top: 0.015, ext: [0.14, 0.03, 0.0], n: 22, g: 0.3, tip: 0.05, sweep: 0.1 },
  bun: { t0: 0.03, top: 0.01, ext: [0.0, 0, -0.02], n: 22, g: 0.2, tip: 0.02, taper: 1, sleekBack: 1, part: 0.3, sweep: 0.5 },
  bald: { band: 1 },
};

/** A growable vertex list appended to the body (see src/people/mesh.js growBody). */
export class Mesh {
  constructor() { this.pos = []; this.apx = []; this.bi = []; this.bw = []; this.col = []; this.gear = []; this.idx = []; this.weld = []; }
  get n() { return this.pos.length / 3; }
  v(p, u, v, bones, col = null) {
    this.pos.push(p[0], p[1], p[2]); this.apx.push(u, v);
    const b = bones || [[HEAD, 1]];
    for (let k = 0; k < 4; k++) { this.bi.push(b[k] ? b[k][0] : 0); this.bw.push(b[k] ? b[k][1] : 0); }
    if (col) { this.col.push(col[0] / 255, col[1] / 255, col[2] / 255); this.gear.push(0.85, 0, 0.6); } else { this.col.push(1, 1, 1); this.gear.push(0, 0, 0); }
    return this.n - 1;
  }
  t(a, b, c) { this.idx.push(a, b, c); }
  q(a, b, c, d) { this.idx.push(a, b, c, a, c, d); }
}

/**
 * Build the hair onto the fitted body B (its head vertices give the skull). sw: the swatch rect (atlas px: x, y, w, h).
 * Returns a Mesh (or null).
 */
export function buildHair(spec, P, J, B, sw, lod) {
  const st = spec.hair.style;
  const S = STYLES[st] || (st === 'none' ? null : STYLES.short);
  if (!S) return null;
  const hu = P.hu, far = lod === 'far', vol = spec.hair.volume || 1;
  const hat = spec.hat?.kind, gearHat = hat && GEAR_HATS.has(hat), band = hat === 'headband';
  const seed = (spec.seed || 1) * 7.3 + st.length;
  const M = new Mesh();
  // ---- the skull as a radius map round C (from the fitted head's own vertices, ears and face left out)
  const C = [0, P.browY - 0.06 * hu, P.hcz];
  const NT = 36, NP = 18, R = new Float32Array(NT * NP), cnt = new Uint8Array(NT * NP);
  const cell = (th, ph) => { const i = Math.floor(((th + Math.PI) / TAU) * NT) % NT, j = Math.max(0, Math.min(NP - 1, Math.floor(((ph + 1.2) / (1.2 + Math.PI / 2)) * NP))); return j * NT + i; };
  for (let i = 0; i < B.n0; i++) {
    if (B.bi[i * 4] !== HEAD || B.bw[i * 4] < 0.6 || (B.flags[i] & 2)) continue;
    const x = B.pos[i * 3], y = B.pos[i * 3 + 1], z = B.pos[i * 3 + 2];
    if (Math.abs(x) > P.hw * 0.9 && y < P.earTop + 0.02 * hu && y > P.earBot - 0.02 * hu) continue; // ears
    const dx = x - C[0], dy = y - C[1], dz = z - C[2], r = Math.hypot(dx, dy, dz);
    const th = Math.atan2(dx, dz), ph = Math.asin(dy / r);
    if (ph < -0.2 && Math.abs(th) < 1.2) continue; // the face
    const k = cell(th, ph);
    R[k] = Math.max(R[k], r); cnt[k] = 1;
  }
  for (let it = 0; it < 12; it++) { // fill the gaps
    let empty = 0;
    for (let j = 0; j < NP; j++) for (let i = 0; i < NT; i++) {
      const k = j * NT + i; if (cnt[k]) continue;
      let s = 0, n = 0;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const jj = j + dj; if (jj < 0 || jj >= NP) continue; const kk = jj * NT + (i + di + NT) % NT; if (cnt[kk]) { s += R[kk]; n++; } }
      if (n) { R[k] = s / n; cnt[k] = 2; } else empty++;
    }
    if (!empty) break;
  }
  const rad = (th, ph) => {
    const fi = ((th + Math.PI) / TAU) * NT - 0.5, fj = ((ph + 1.2) / (1.2 + Math.PI / 2)) * NP - 0.5;
    const i0 = Math.floor(fi), j0 = Math.max(0, Math.min(NP - 2, Math.floor(fj))), ti = fi - i0, tj = clamp01(fj - j0);
    const a = (i, j) => R[j * NT + ((i % NT) + NT) % NT];
    return lerp(lerp(a(i0, j0), a(i0 + 1, j0), ti), lerp(a(i0, j0 + 1), a(i0 + 1, j0 + 1), ti), tj);
  };
  const surf = (d, lift, out) => {
    const th = Math.atan2(d[0], d[2]), ph = Math.asin(Math.max(-1, Math.min(1, d[1])));
    const r = rad(th, ph) + lift;
    out[0] = C[0] + d[0] * r; out[1] = C[1] + d[1] * r; out[2] = C[2] + d[2] * r;
    return out;
  };
  const hl = hairlineFn(P, spec);
  const uvAt = (u, v) => [sw.x + 1 + clamp01(u) * (sw.w - 2), sw.y + 1 + clamp01(v) * (sw.h - 2)];
  if (S.band) { bandRing(M, P, surf, uvAt, far); return M; }
  // ---- the whorl and its meridians
  const part = (spec.hair.part || 1) * (S.part || 0);
  const A = norm3([part * 0.45, 1, -0.32]);
  const E1 = norm3(cross3([0, 0, 1], A)), E2 = cross3(A, E1); // E2 points roughly forwards
  const dirAt = (th, psi) => { const c = Math.cos(th), s = Math.sin(th), sp = Math.sin(psi), cp = Math.cos(psi); return norm3([A[0] * cp + (E2[0] * c + E1[0] * s) * sp, A[1] * cp + (E2[1] * c + E1[1] * s) * sp, A[2] * cp + (E2[2] * c + E1[2] * s) * sp]); };
  const NC = far ? 14 : S.n ? Math.min(57, Math.max(36, S.n * 3)) : 28, NR = far ? 5 : 9, NH = far ? 3 : 7;
  const yHat = gearHat ? P.browY + (hat === 'schoolhat' || hat === 'bucket' || hat === 'sunhat' ? 0.13 : 0.18) * hu : Infinity;
  const hangY = S.hang ? (S.hang.y === 'bust' ? P.bustY - (spec.age === 'kid' ? 0.0 : 0.02) * P.H : P.chin + S.hang.y * hu) : null;
  const bowlY = S.bowl ? P.browY + 0.02 * hu : null;
  const cols = [];
  const tmp = [0, 0, 0];
  for (let ci = 0; ci <= NC; ci++) {
    const th = (ci / NC) * TAU - Math.PI; // round the whorl
    // clump profile: 1 at a clump's middle, 0 in the groove between two
    const cu = S.n ? (ci / NC) * S.n : 0, ck = Math.floor(cu);
    const rnd = (k) => hash(seed + ck * 13.1 + k * 7.7);
    // rounded clumps of uneven length (a hand-cut hem, not a saw)
    const cl = S.n ? Math.abs(Math.sin(Math.PI * cu)) ** 1.6 * (0.55 + 0.6 * hash(seed + ck * 3.3)) : 1;
    // march down the meridian on the skull: arc length, hairline crossing, where it starts hanging
    const pts = [], dirs = [];
    let L = 0, sHL = -1, sHang = -1, prev = null, hMax = 0, sHat = gearHat ? -1 : 0;
    for (let psi = 0; psi < 2.6; psi += 0.03) {
      const d = dirAt(th, psi), p = surf(d, 0, [0, 0, 0]);
      if (prev) L += Math.hypot(p[0] - prev[0], p[1] - prev[1], p[2] - prev[2]);
      const thw = Math.atan2(p[0], p[2] - P.hcz);
      if (sHat < 0 && p[1] < yHat - 0.01 * hu) sHat = L;
      if (sHL < 0 && p[1] < hl(thw)) sHL = L;
      const hr = Math.hypot(p[0], (p[2] - P.hcz) * 0.8);
      if (sHang < 0 && psi > 0.6 && hr < hMax - 0.002 && p[1] < P.eyeY + 0.12 * hu) sHang = L;
      hMax = Math.max(hMax, hr);
      pts.push([L, p, d, thw]);
      prev = p;
      if (p[1] < P.chin - 0.02 * hu) break;
    }
    if (sHL < 0) sHL = L;
    if (sHang < 0) sHang = L;
    const thw0 = pts[Math.min(pts.length - 1, Math.floor(pts.length * 0.5))][3];
    const fr = G(thw0, 0.75), back = sstep(1.7, 2.6, Math.abs(thw0)), side = 1 - fr - back * (1 - fr);
    // the length: to the hairline, past it, the clump's tip
    let ext = S.ext ? (S.ext[0] * fr + S.ext[1] * side + S.ext[2] * back) * hu : 0;
    if (S.sleekBack && back > 0.3) ext = Math.min(ext, 0);
    let end = sHL + ext + (S.tip || 0) * hu * cl * (S.mess ? 0.5 + rnd(1) : 1);
    let hangLen = 0;
    if (bowlY !== null && Math.abs(thw0) < 2.1) { // a bowl cut: a level hem all round the front and sides
      let s = sHL; for (const q of pts) if (q[1][1] >= bowlY) s = q[0];
      end = s + (S.tip || 0) * hu * cl;
    }
    if (hangY !== null && fr < 0.6) { // hanging hair: from where the skull turns in, down to the hem
      end = Math.max(end, sHang);
      hangLen = Math.max(0, pts.find((q) => q[0] >= sHang)?.[1][1] - hangY) * (1 - fr) + (S.tip || 0) * hu * cl;
      if (back < 0.5 && S.hang.y === 'bust') hangLen *= 0.9;
    }
    end = Math.min(end, sHang + (hangY !== null ? 0 : 0.03 * hu));
    const s0 = Math.max(0, sHat > 0 ? sHat : 0);
    if (end <= s0 + 0.004) { cols.push(null); continue; }
    // resample: rows on the skull, then hanging rows
    const at = (s) => { let i = 1; while (i < pts.length - 1 && pts[i][0] < s) i++; const a = pts[i - 1], b = pts[i], t = clamp01((s - a[0]) / Math.max(1e-6, b[0] - a[0])); return { d: norm3([lerp(a[2][0], b[2][0], t), lerp(a[2][1], b[2][1], t), lerp(a[2][2], b[2][2], t)]), thw: lerp(a[3], b[3], t) }; };
    const col = [];
    const total = end - s0 + hangLen;
    for (let r = 0; r <= NR; r++) {
      const s = s0 + (end - s0) * (r / NR) ** (sHat > 0 ? 1 : 0.8);
      const { d, thw } = at(s);
      const f = (s - s0) / Math.max(1e-6, end - s0);
      // volume: base, crown, quiff, clumps, taper at an exposed hairline, a flare out at the hem
      let lift = S.t0 * hu * vol * (1 + (S.top || 0) / S.t0 * G(s / Math.max(0.01, sHL), 0.35));
      if (S.quiff) lift += S.quiff * hu * G(thw, 0.55) * G((s - sHL * 0.85) / Math.max(0.01, sHL), 0.25);
      if (S.flare) lift += S.flare * hu * sstep(0.55, 1, f) * (1 - back * 0.5);
      if (S.taper) lift *= lerp(1, 0.18, sstep(sHL - 0.035 * hu, sHL + 0.02 * hu, s));
      if (S.sleekBack) lift *= lerp(1, 0.6, back);
      lift *= 1 - (S.g || 0) * (1 - cl) * sstep(0, 0.3, f);
      if (S.mess) lift *= 1 + S.mess * 0.35 * (rnd(2) - 0.5) * sstep(0.2, 1, f);
      if (S.curl) lift += 0.03 * hu * (0.5 + 0.5 * Math.sin(s / (0.042 * hu) + ck * 1.7)) * (0.55 + 0.45 * Math.sin(th * S.n * 0.5 + s / (0.05 * hu)));
      if (S.partGroove && part) lift *= 1 - 0.85 * G(th, 0.09) * (1 - sstep(0.6, 1, f));
      // the fringe sweeps across the brow
      let dd = d;
      if (S.sweep && fr > 0.2 && s > sHL * 0.6) { const k = S.sweep * (spec.hair.part || 1) * fr * sstep(sHL * 0.6, end, s) * 0.35; dd = norm3([d[0] + k * Math.cos(thw), d[1], d[2] - k * Math.sin(thw) * 0.3]); }
      const p = surf(dd, lift, [0, 0, 0]);
      col.push({ p, s, lift, v: (s - s0) / total, hang: false });
    }
    if (hangLen > 0.005) { // fall from the last skull row, flaring out a little, curling in at the end (bob)
      const last = col[col.length - 1].p, out = norm3([last[0], 0, (last[2] - P.hcz)]);
      const flare = (S.hang.flare || 0) * hu, longHair = S.hang.y === 'bust';
      for (let r = 1; r <= NH; r++) {
        const t = r / NH, y = last[1] - hangLen * t;
        let o = flare * Math.sin(t * Math.PI * 0.8) + (S.hang.curl ? -0.04 * hu * sstep(0.7, 1, t) : 0);
        const p = [last[0] + out[0] * o, y, last[2] + out[2] * o];
        if (longHair) { // fall behind the shoulders
          const k = sstep(0, 0.5, t);
          const shoulder = Math.abs(p[0]) < P.shX + 0.05 && y < P.neckBase + 0.02;
          if (shoulder) p[2] = Math.min(p[2], lerp(p[2], -P.chestZ * 0.8 - 0.012 * P.H, k));
          p[0] *= lerp(1, 0.86, k);
        }
        col.push({ p, s: end + hangLen * t, lift: col[col.length - 1].lift, v: (end - s0 + hangLen * t) / total, hang: true });
      }
    }
    cols.push({ th, col, cl, end, sHL, s0 });
  }
  // ---- stitch the columns (rows may differ: every column has NR (+ NH) rows; hangless ones are padded)
  const rowsOf = (c) => (c ? c.col.length : 0);
  const maxRows = Math.max(...cols.map(rowsOf));
  for (const c of cols) if (c) while (c.col.length < maxRows) c.col.push({ ...c.col[c.col.length - 1] });
  const ids = cols.map((c, ci) => (c ? c.col.map((q) => {
    const bones = q.p[1] < P.napeY - 0.03 * hu ? [[CHEST, sstep(P.napeY - 0.03 * hu, P.napeY - 0.25 * hu, q.p[1])], [HEAD, 1 - sstep(P.napeY - 0.03 * hu, P.napeY - 0.25 * hu, q.p[1])]].sort((a, b) => b[1] - a[1]) : null;
    return M.v(q.p, ...uvAt(ci / NC, q.v), bones);
  }) : null));
  for (let ci = 0; ci < NC; ci++) {
    const a = ids[ci], b = ids[ci + 1];
    if (!a || !b) continue;
    for (let r = 0; r < maxRows - 1; r++) M.q(a[r], b[r], b[r + 1], a[r + 1]);
  }
  // an inner layer under what stands off the skin (fringe, hanging hair) so hems have a thickness
  if (!far) {
    const th = 0.008 * hu + 0.002;
    const inner = cols.map((c, ci) => (c ? c.col.map((q, r) => {
      const beyond = q.s > c.sHL + 0.01 * hu || q.hang;
      if (!beyond) return -1;
      const d = norm3([q.p[0] - C[0], (q.p[1] - C[1]) * (q.hang ? 0 : 1), q.p[2] - C[2]]);
      const k = Math.min(th, q.lift * 0.7 + (q.hang ? th : 0));
      return M.v([q.p[0] - d[0] * k, q.p[1] + (q.hang ? 0 : -0.002), q.p[2] - d[2] * k], ...uvAt(ci / NC, Math.max(0, q.v - 0.03)), ids[ci] && q.p[1] < P.napeY - 0.03 * hu ? [[CHEST, 0.5], [HEAD, 0.5]] : null);
    }) : null));
    for (let ci = 0; ci < NC; ci++) {
      const a = inner[ci], b = inner[ci + 1], oa = ids[ci], ob = ids[ci + 1];
      if (!a || !b) continue;
      for (let r = 0; r < maxRows - 1; r++) if (a[r] >= 0 && a[r + 1] >= 0 && b[r] >= 0 && b[r + 1] >= 0) M.q(a[r], a[r + 1], b[r + 1], b[r]);
      const r = maxRows - 1; // the hem's rim
      if (a[r] >= 0 && b[r] >= 0) M.q(oa[r], ob[r], b[r], a[r]);
    }
  }
  // ---- extra pieces
  const tie = spec.hair.tie || [200, 60, 70];
  if (st === 'ponytail' && J.tailL) tailPiece(M, J.tailL, TAIL_L, (spec.age === 'kid' ? 0.11 : 0.16) * P.H * vol, 0.045 * hu * 1.6 * Math.sqrt(vol), [0, -1, -0.25], uvAt, far, tie, seed);
  if ((st === 'twintails' || st === 'pigtails') && J.tailL) for (const [jt, b, sx] of [[J.tailL, TAIL_L, 1], [J.tailR, TAIL_R, -1]]) {
    const pig = st === 'pigtails';
    tailPiece(M, jt, b, P.H * (pig ? 0.08 : 0.15) * vol, (pig ? 0.05 : 0.06) * hu * Math.sqrt(vol), [sx * 0.25, -1, -0.15], uvAt, far, tie, seed + sx, pig);
  }
  if (st === 'bun' && !gearHat) bunPiece(M, [0, P.crown - 0.2 * hu, P.hcz - P.hd - 0.02 * hu], 0.13 * hu, uvAt, far, seed);
  if (S.spikes && !gearHat) spikes(M, P, surf, uvAt, far, seed, vol);
  if (S.flick && !far) for (const sx of [1, -1]) flick(M, P, surf, uvAt, sx);
  if (band) bandPiece(M, P, surf, spec.hat.col || [230, 230, 236], far);
  return M;
}

function norm3(a) { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }

/** A lofted, grooved hair tail hanging from a tail bone's joint along dir; a tie at the top. */
function tailPiece(M, j, bone, len, r0, dir, uvAt, far, tie, seed, braid = false) {
  const n = far ? 6 : 10, rows = far ? 4 : braid ? 12 : 9, d = norm3(dir);
  const side = norm3(cross3(d, [0, 0, 1])), fwd = cross3(side, d);
  const bones = [[bone, 1]];
  const rings = [];
  for (let r = 0; r <= rows; r++) {
    const t = r / rows;
    let rr = r0 * (t < 0.15 ? lerp(0.55, 1, t / 0.15) : lerp(1, 0.08, ((t - 0.15) / 0.85) ** 1.4));
    if (braid) rr *= 0.85 + 0.25 * Math.abs(Math.sin(t * rows * Math.PI * 0.5));
    const c = [j[0] + d[0] * len * t, j[1] + d[1] * len * t + 0.15 * len * t * t * 0, j[2] + d[2] * len * t];
    c[2] -= 0.12 * len * Math.sin(t * Math.PI) * 0.5; // a gentle S
    const ring = [];
    for (let k = 0; k <= n; k++) {
      const a = (k / n) * TAU, lobe = 1 - 0.22 * (1 - Math.abs(Math.sin(a * 2.5 + seed))) * (far ? 0 : 1);
      const x = Math.cos(a) * rr * lobe, y = Math.sin(a) * rr * lobe;
      ring.push(M.v([c[0] + side[0] * x + fwd[0] * y, c[1] + side[1] * x + fwd[1] * y, c[2] + side[2] * x + fwd[2] * y], ...uvAt(k / n, 0.15 + 0.85 * t), bones));
    }
    rings.push(ring);
  }
  for (let r = 0; r < rows; r++) for (let k = 0; k < n; k++) M.q(rings[r][k], rings[r + 1][k], rings[r + 1][k + 1], rings[r][k + 1]);
  // the tie: a ring round the top
  const tr = r0 * 0.62, ty = [j[0] + d[0] * len * 0.07, j[1] + d[1] * len * 0.07, j[2] + d[2] * len * 0.07], h = len * 0.035;
  const tk = [];
  for (let s = 0; s < 2; s++) {
    const ring = [];
    for (let k = 0; k <= 8; k++) {
      const a = (k / 8) * TAU, x = Math.cos(a) * tr * 1.12, y = Math.sin(a) * tr * 1.12, o = (s - 0.5) * h;
      ring.push(M.v([ty[0] + side[0] * x + fwd[0] * y + d[0] * o, ty[1] + side[1] * x + fwd[1] * y + d[1] * o, ty[2] + side[2] * x + fwd[2] * y + d[2] * o], 0, 0, bones, tie));
    }
    tk.push(ring);
  }
  for (let k = 0; k < 8; k++) M.q(tk[0][k], tk[1][k], tk[1][k + 1], tk[0][k + 1]);
}

/** A bun: a lumpy coil at the back of the head. */
function bunPiece(M, c, r, uvAt, far, seed) {
  const nt = far ? 8 : 14, np = far ? 5 : 9, rings = [];
  for (let j = 0; j <= np; j++) {
    const ph = -Math.PI / 2 + (j / np) * Math.PI, ring = [];
    for (let i = 0; i <= nt; i++) {
      const th = (i / nt) * TAU, coil = 1 + 0.12 * Math.sin(th * 3 + ph * 4 + seed) * Math.cos(ph);
      const rr = r * coil, x = Math.cos(ph) * Math.sin(th) * rr, y = Math.sin(ph) * rr * 0.8, z = Math.cos(ph) * Math.cos(th) * rr * 0.75;
      ring.push(M.v([c[0] + x, c[1] + y, c[2] - Math.abs(z) * 0.2 + z * 0.8 - r * 0.25], ...uvAt(i / nt, j / np)));
    }
    rings.push(ring);
  }
  for (let j = 0; j < np; j++) for (let i = 0; i < nt; i++) M.q(rings[j][i], rings[j][i + 1], rings[j + 1][i + 1], rings[j + 1][i]);
}

/** Spikes: tapered five-sided horns standing out of the crown. */
function spikes(M, P, surf, uvAt, far, seed, vol) {
  const hu = P.hu, n = far ? 6 : 15;
  for (let k = 0; k < n; k++) {
    const a = k * 2.399 + seed, rr = Math.sqrt((k + 0.5) / n) * 0.95;
    const d = norm3([Math.sin(a) * rr * 0.9, 1 - rr * 0.45, Math.cos(a) * rr * 0.9 - 0.15]);
    const base = surf(d, 0.01 * hu, [0, 0, 0]), len = (0.17 + 0.1 * hash(seed + k)) * hu * vol, w = 0.05 * hu;
    const up = norm3([d[0] * 1.2, d[1] + 0.3, d[2] * 1.2]), side = norm3(cross3(up, [0, 0, 1])), fwd = cross3(side, up);
    const ring = [];
    for (let i = 0; i <= 5; i++) { const t = (i / 5) * TAU; ring.push(M.v([base[0] + (side[0] * Math.cos(t) + fwd[0] * Math.sin(t)) * w, base[1] + (side[1] * Math.cos(t) + fwd[1] * Math.sin(t)) * w, base[2] + (side[2] * Math.cos(t) + fwd[2] * Math.sin(t)) * w], ...uvAt(i / 5, 0.3))); }
    const tip = M.v([base[0] + up[0] * len, base[1] + up[1] * len, base[2] + up[2] * len], ...uvAt(0.5, 1));
    for (let i = 0; i < 5; i++) M.t(ring[i], ring[i + 1], tip);
  }
}

/** Rohan's flicked-out ends behind the ears. */
function flick(M, P, surf, uvAt, sx) {
  const hu = P.hu;
  for (let k = 0; k < 3; k++) {
    const d = norm3([sx * 0.9, -0.15 - k * 0.12, -0.55 - k * 0.1]);
    const base = surf(d, 0.04 * hu, [0, 0, 0]), len = 0.12 * hu, w = 0.035 * hu;
    const dir = norm3([sx * 0.8, 0.5, -0.4]), side = norm3(cross3(dir, [0, 1, 0])), up = cross3(side, dir);
    const a = M.v([base[0] - side[0] * w, base[1] - side[1] * w, base[2] - side[2] * w], ...uvAt(0, 0.6));
    const b = M.v([base[0] + up[0] * w * 0.5, base[1] + up[1] * w * 0.5, base[2] + up[2] * w * 0.5], ...uvAt(0.5, 0.6));
    const c = M.v([base[0] + side[0] * w, base[1] + side[1] * w, base[2] + side[2] * w], ...uvAt(1, 0.6));
    const t = M.v([base[0] + dir[0] * len, base[1] + dir[1] * len, base[2] + dir[2] * len], ...uvAt(0.5, 1));
    M.t(a, b, t); M.t(b, c, t); M.t(c, a, t);
  }
}

/** The fringe of hair round the back of a bald head. */
function bandRing(M, P, surf, uvAt, far) {
  const hu = P.hu, n = far ? 10 : 24, C = [0, P.browY - 0.06 * hu, P.hcz];
  const rows = [P.earTop + 0.11 * hu, P.earTop + 0.05 * hu, P.earBot + 0.02 * hu, P.napeY];
  const lifts = [0.002, 0.012, 0.012, 0.004];
  const grid = rows.map((y, r) => {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const th = lerp(1.3, TAU - 1.3, i / n), d0 = [Math.sin(th), 0, Math.cos(th)];
      // find the direction at this height (two steps of a fixed point on the elevation)
      let d = d0, p = [0, 0, 0];
      for (let it = 0; it < 4; it++) { surf(d, 0, p); const ph = Math.atan2(y - C[1], Math.hypot(p[0] - C[0], p[2] - C[2])); d = norm3([Math.sin(th) * Math.cos(ph), Math.sin(ph), Math.cos(th) * Math.cos(ph)]); }
      out.push(M.v(surf(d, lifts[r] * hu * (1 + 0.4 * Math.abs(Math.sin(i * 1.7))), [0, 0, 0]), ...uvAt(i / n, r / (rows.length - 1))));
    }
    return out;
  });
  for (let r = 0; r < rows.length - 1; r++) for (let i = 0; i < n; i++) M.q(grid[r][i], grid[r + 1][i], grid[r + 1][i + 1], grid[r][i + 1]);
}

/** A tenugui headband round the brow, vertex-coloured. */
function bandPiece(M, P, surf, col, far) {
  const hu = P.hu, n = far ? 12 : 28, C = [0, P.browY - 0.06 * hu, P.hcz];
  const ys = [P.browY + 0.1 * hu, P.browY + 0.2 * hu];
  const grid = ys.map((y) => {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const th = (i / n) * TAU, p = [0, 0, 0];
      let d = [Math.sin(th), 0, Math.cos(th)];
      for (let it = 0; it < 4; it++) { surf(d, 0, p); const ph = Math.atan2(y - C[1], Math.hypot(p[0] - C[0], p[2] - C[2])); d = norm3([Math.sin(th) * Math.cos(ph), Math.sin(ph), Math.cos(th) * Math.cos(ph)]); }
      out.push(M.v(surf(d, 0.06 * hu, p), 0, 0, null, col));
    }
    return out;
  });
  for (let i = 0; i < n; i++) M.q(grid[0][i], grid[1][i], grid[1][i + 1], grid[0][i + 1]);
}
