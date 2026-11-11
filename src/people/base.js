// The people's body: a real, sculpted CC0 base mesh (src/people/base/data.js, made by tools/people-base.mjs from
// Quaternius' "Universal Base Characters") fitted to each person's proportions (src/people/body.js proportions()):
//   - the torso through a lattice of landmark levels (crotch, hips, waist, bust, shoulders, neck, chin): heights move
//     to the person's, widths and depths scale to theirs (build, sex, age, belly, bust);
//   - every limb bone by its own joint: moved to the person's joint, stretched to their bone length, thickened or
//     thinned about its axis;
//   - the head into the game's canonical head frame (chin, mouth, nose, eyes and crown at the person's levels, width
//     and depth from P.hw / P.hd), so hats, glasses and masks made for it (src/peoplekit, cosmetics) still fit.
// Each vertex blends those maps by its skin weights, so joints stay smooth. Two levels of detail share one UV layout.
import { BASE } from './base/data.js';

const dec = (s, T) => {
  const bin = atob(s), b = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
  return new T(b.buffer);
};

// bone indices (src/people/body.js BONES order)
const HIPS = 0, SPINE = 1, CHEST = 2, NECK = 3, HEAD = 4, ARM_L = 5, FORE_L = 6, HAND_L = 7, ARM_R = 8, FORE_R = 9, HAND_R = 10;
const THIGH_L = 11, SHIN_L = 12, FOOT_L = 13, THIGH_R = 14, SHIN_R = 15, FOOT_R = 16;
export const TORSO_BONES = new Set([HIPS, SPINE, CHEST, NECK]);

const CACHE = {};
/** The decoded base body for a sex ('m' / 'f') and level of detail ('near' / 'far'). */
export function baseBody(sex, lod = 'near') {
  const key = sex + lod;
  if (CACHE[key]) return CACHE[key];
  const B = BASE[sex === 'f' ? 'f' : 'm'], D = B.lods[lod];
  const q = dec(D.pos, Int16Array), pos = new Float32Array(D.nv * 3);
  for (let i = 0; i < D.nv; i++) for (let c = 0; c < 3; c++) pos[i * 3 + c] = D.mn[c] + ((q[i * 3 + c] + 32767) / 65534) * (D.mx[c] - D.mn[c]);
  const uv16 = dec(D.uv, Uint16Array), uv = new Float32Array(D.nv * 2);
  for (let i = 0; i < uv.length; i++) uv[i] = uv16[i] / 65535;
  const bw8 = dec(D.bw, Uint8Array), bw = new Float32Array(bw8.length);
  for (let i = 0; i < bw.length; i++) bw[i] = bw8[i] / 255;
  const m = { nv: D.nv, pos, uv, bi: dec(D.bi, Uint8Array), bw, weld: dec(D.weld, Uint16Array), flags: dec(D.flags, Uint8Array), src: dec(D.src, Uint8Array), idx: dec(D.idx, Uint16Array), J: B.J, L: B.L };
  m.nWeld = 0; for (let i = 0; i < m.nv; i++) m.nWeld = Math.max(m.nWeld, m.weld[i] + 1);
  m.S = sourceFrame(m);
  CACHE[key] = m;
  return m;
}

/** Landmark levels and limb radii of a base body (measured once). */
function sourceFrame(m) {
  const { J, L } = m;
  const T = L.torso, lvl = (y) => {
    // torso half-width / front / back at height y (interpolated table)
    let i = 0; while (i < T.length - 2 && T[i + 1][0] < y) i++;
    const a = T[i], b = T[i + 1], t = Math.max(0, Math.min(1, (y - a[0]) / (b[0] - a[0])));
    return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t];
  };
  const hip = J.thighL[1], shoulder = J.armL[1];
  let waist = hip + 0.1, wmin = 1e9;
  for (const r of T) if (r[0] > hip + 0.06 && r[0] < shoulder - 0.18 && r[1] < wmin) { wmin = r[1]; waist = r[0]; }
  let bust = (waist + shoulder) / 2, bmax = -1e9;
  for (const r of T) if (r[0] > waist + 0.05 && r[0] < shoulder - 0.03 && r[2] > bmax) { bmax = r[2]; bust = r[0]; }
  // limb radii: mean distance of each bone's own vertices from its (vertical) joint line, over the bone's middle
  const rad = {}, cnt = {};
  const seg = { [ARM_L]: ['armL', 'foreL'], [FORE_L]: ['foreL', 'handL'], [THIGH_L]: ['thighL', 'shinL'], [SHIN_L]: ['shinL', 'footL'] };
  for (let i = 0; i < m.nv; i++) {
    const b = m.bi[i * 4];
    if (m.bw[i * 4] < 0.85 || !seg[b]) continue;
    const [a, c] = seg[b], ya = J[a][1], yc = J[c][1], y = m.pos[i * 3 + 1], t = (ya - y) / (ya - yc);
    if (t < 0.3 || t > 0.7) continue;
    rad[b] = (rad[b] || 0) + Math.hypot(m.pos[i * 3] - J[a][0], m.pos[i * 3 + 2] - J[a][2]); cnt[b] = (cnt[b] || 0) + 1;
  }
  for (const b in rad) rad[b] /= cnt[b];
  // the foot: heel / toe and half-width
  let heel = 1e9, toe = -1e9, fw = 0;
  for (let i = 0; i < m.nv; i++) if (m.bi[i * 4] === FOOT_L && m.pos[i * 3 + 1] < J.footL[1]) { const z = m.pos[i * 3 + 2]; heel = Math.min(heel, z); toe = Math.max(toe, z); fw = Math.max(fw, Math.abs(m.pos[i * 3] - J.footL[0])); }
  return { lvl, hip, shoulder, waist, bust, pelvis: hip + (waist - hip) * 0.6, neck: J.neck[1], chin: L.chin, crotch: L.crotch, rad, heel, toe, fw };
}

const lerp = (a, b, t) => a + (b - a) * t;
const G = (x, s) => Math.exp(-(x * x) / (2 * s * s));
/** Piecewise-linear map through matching knots (xs ascending); extrapolates with the end slopes. */
function pw(xs, ys) {
  return (x) => {
    let i = 0; const n = xs.length;
    while (i < n - 2 && x > xs[i + 1]) i++;
    return ys[i] + ((x - xs[i]) / (xs[i + 1] - xs[i])) * (ys[i + 1] - ys[i]);
  };
}

/**
 * The fitting for one person. Returns { map(i, out): the fitted rest position of base vertex i, P overrides } and
 * fills P with the levels it derived (crotch) and the face features as modelled (P.face: eye centre, radius...).
 */
export function fitter(m, P, J) {
  const { S, L } = m, Js = m.J, H = P.H, hu = P.hu;
  // ---- legs first: the crotch follows the thighs (so the inner thighs and the seat agree)
  const kThigh = (P.hipY - P.kneeY) / (Js.thighL[1] - Js.shinL[1]);
  P.crotchY = P.hipY - (S.hip - S.crotch) * kThigh;
  // ---- torso lattice: knots (source y -> target y) and the width / depth ratios at each
  const ys = [S.crotch, S.hip, S.pelvis, S.waist, S.bust, S.shoulder, S.neck, S.chin];
  const yt = [P.crotchY, P.hipY, P.pelvisY, P.waistY, P.bustY, P.shoulderY, P.neckBase, P.chin];
  const tw = [P.hipsX * 0.92, P.hipsX, (P.hipsX + P.waistX) / 2, P.waistX, P.bustX, 0, hu * (P.f ? 0.2 : 0.225), hu * (P.f ? 0.19 : 0.215)];
  const td = [P.hipsZ * 0.95, P.hipsZ, (P.hipsZ + P.waistZ) / 2, P.waistZ, P.chestZ, P.chestZ * 0.82, hu * 0.22, hu * 0.21];
  const rx = [], rzf = [], rzb = [], zc = [];
  for (let k = 0; k < ys.length; k++) {
    const [sx, sf, sb] = S.lvl(ys[k]);
    zc.push((sf + sb) / 2);
    rx.push(k === 5 ? P.shX / Js.armL[0] : sx > 0.02 ? tw[k] / sx : 0);
    const d = sf - sb > 0.02 ? td[k] / ((sf - sb) / 2) : 0;
    rzb.push(d);
    rzf.push(d);
  }
  // the neck keeps one ratio up to the chin (the chin level's section is the jaw's)
  rx[7] = rx[6]; rzf[7] = rzf[6]; rzb[7] = rzb[6];
  // levels with no section (under the crotch) take their neighbour's ratios
  for (let k = 0; k < ys.length; k++) for (const a of [rx, rzf, rzb]) if (!a[k]) a[k] = a[k + 1] || a[k - 1] || 1;
  // belly and bust push the front out
  rzf[3] *= 1 + P.belly / P.waistZ * 0.8; rzf[2] *= 1 + P.belly / P.waistZ * 0.45; rzf[4] *= 1 + P.belly / P.chestZ * 0.25;
  if (P.f) rzf[4] *= 1 + (P.bust - 0.012 * H) / P.chestZ;
  // target centre line (front / back balance) at each level, as the gear and painters expect it (P.chestZ + P.bust in front...)
  const zcT = [-0.004 * H, -0.003 * H, -0.001 * H, 0.002 * H + P.belly / 3, 0.006 * H + P.bust / 2, -0.004 * H, -0.012 * H, -0.008 * H];
  const yMap = pw(ys, yt), rxMap = pw(ys, rx), rzfMap = pw(ys, rzf), rzbMap = pw(ys, rzb), zcMap = pw(ys, zc);
  const zShift = pw(ys, zcT.map((z, k) => z - zc[k]));
  const clampMap = (f, a, b) => (y) => f(Math.max(a, Math.min(b, y)));
  const rxC = clampMap(rxMap, ys[0], ys[ys.length - 1]), rzfC = clampMap(rzfMap, ys[0], ys[ys.length - 1]), rzbC = clampMap(rzbMap, ys[0], ys[ys.length - 1]), zcC = clampMap(zcMap, ys[0], ys[ys.length - 1]), zsC = clampMap(zShift, ys[0], ys[ys.length - 1]);
  const torso = (x, y, z, o) => {
    const c = zcC(y), dz = z - c;
    o[0] = x * rxC(y); o[1] = yMap(y); o[2] = c + zsC(y) + dz * (dz > 0 ? rzfC(y) : rzbC(y));
    if (P.belly && dz > 0) { // a rounder belly, low and to the front
      const t = G((y - lerp(S.pelvis, S.waist, 0.4)) / (S.waist - S.hip), 0.45) * G(x / (P.waistX * 1.2), 0.6);
      o[2] += P.belly * 0.5 * t * Math.min(1, dz / 0.05);
    }
  };
  // ---- limbs: per bone (joint moved, length stretched, thickness about the joint's vertical)
  const limb = {};
  const radT = { arm: P.armX * 1.04, fore: P.armX * 0.86, thigh: P.thighX * 1.04, shin: P.thighX * 0.7 };
  const mk = (bone, a, c, aT, cT, rad, srcRad) => {
    const k = (aT[1] - cT[1]) / (Js[a][1] - Js[c][1]), r = rad / srcRad;
    limb[bone] = (x, y, z, o) => { o[0] = aT[0] + (x - Js[a][0]) * r; o[1] = aT[1] + (y - Js[a][1]) * k; o[2] = aT[2] + (z - Js[a][2]) * r; };
  };
  for (const s of ['L', 'R']) {
    const sb = s === 'L' ? 0 : 3, lb = s === 'L' ? 0 : 3;
    mk(ARM_L + sb, 'arm' + s, 'fore' + s, J['arm' + s], J['fore' + s], radT.arm, S.rad[ARM_L]);
    mk(FORE_L + sb, 'fore' + s, 'hand' + s, J['fore' + s], J['hand' + s], radT.fore, S.rad[FORE_L]);
    mk(THIGH_L + lb, 'thigh' + s, 'shin' + s, J['thigh' + s], J['shin' + s], radT.thigh, S.rad[THIGH_L]);
    mk(SHIN_L + lb, 'shin' + s, 'foot' + s, J['shin' + s], J['foot' + s], radT.shin, S.rad[SHIN_L]);
    // hand: uniform, by hand length (wrist to fingertip)
    const hk = (P.wristY - P.tipY) / (Js['hand' + s][1] - Js['tip' + s][1]) * (P.f ? 0.98 : 1), ha = Js['hand' + s], hT = J['hand' + s];
    limb[HAND_L + sb] = (x, y, z, o) => { o[0] = hT[0] + (x - ha[0]) * hk; o[1] = hT[1] + (y - ha[1]) * hk; o[2] = hT[2] + (z - ha[2]) * hk; };
    // foot: length, width and ankle height
    const fa = Js['foot' + s], fT = J['foot' + s], fy = P.ankleY / fa[1], fz = (P.footL * 1.0) / (S.toe - S.heel), fx = P.footX / S.fw;
    limb[FOOT_L + lb] = (x, y, z, o) => { o[0] = fT[0] + (x - fa[0]) * fx; o[1] = y * fy; o[2] = fT[2] + (z - fa[2]) * fz; };
  }
  // ---- head: the canonical head frame (src/people/body.js P: chin, mouth, nose, eyes, crown; hw, hd, zf)
  const headY = pw([L.chin, L.mouth, L.noseBase, L.eyeY, L.crown], [P.chin, P.mouthY, P.noseY, P.eyeY, P.crown]);
  const kx = P.hw / L.temple * (P.kid ? 1.02 : 1);
  const eyeFront = L.eyeZ + L.eyeR * 0.7, back = P.hcz - P.hd, kz = (P.zf - back) / (eyeFront - L.back);
  const head = (x, y, z, o) => { o[0] = x * kx; o[1] = headY(y); o[2] = back + (z - L.back) * kz; };
  // the modelled face features, where they ended up (the face painter draws on them)
  P.face = {
    eyeX: L.eyeX * kx, eyeY: headY(L.eyeY), eyeZ: back + (L.eyeZ - L.back) * kz, eyeR: L.eyeR * Math.min(kx, kz),
    mouthY: headY(L.mouth), noseTip: back + (L.noseZ - L.back) * kz, noseY: headY(L.nose),
  };
  const maps = [];
  maps[HIPS] = maps[SPINE] = maps[CHEST] = maps[NECK] = torso;
  maps[HEAD] = head;
  for (const b in limb) maps[b] = limb[b];
  const tmp = [0, 0, 0];
  return {
    map(i, o) {
      const x = m.pos[i * 3], y = m.pos[i * 3 + 1], z = m.pos[i * 3 + 2];
      o[0] = o[1] = o[2] = 0;
      for (let k = 0; k < 4; k++) {
        const w = m.bw[i * 4 + k]; if (!w) continue;
        const f = maps[m.bi[i * 4 + k]] || torso;
        f(x, y, z, tmp);
        o[0] += tmp[0] * w; o[1] += tmp[1] * w; o[2] += tmp[2] * w;
      }
      return o;
    },
  };
}
