// Chibi anime figures on the game's human base model (src/people). Any person spec (makeSpec(preset, seed) from
// src/people/presets.js, or one written by hand in the same format) becomes a crisp low-poly chibi PVC figure:
//   - the human's body plan (src/people/body.js): the same bones (hips, chest, neck, head, arm / fore / hand, thigh /
//     shin / foot), the same landmarks and the same build / sex / age / belly / bust differences, rescaled to a
//     2.5-head chibi: a big faceted head (a flat face plane and planar cheeks), a small body, small hands and feet;
//   - its segments (chamfered prisms between sections) as lofted octagon sections, limbs swept through the posed joints;
//   - its hair styles (src/people/hair.js: short, sidepart, buzz, messy, bob, long, ponytail, twintails, pigtails, bun,
//     perm, bald, pompadour, rohan, spiky; + anime: hime, sideponytail, wild) as a faceted cap and planar locks
//     (wedge and diamond sections: no round blob hair), and its hats (cap, flatcap, schoolhat, bucket, sunhat, hardhat,
//     headband);
//   - its garments (src/people/presets.js kinds: tee, polo, shirt, blouse, knit, cardigan, suit, blazer, jacket,
//     workjacket, gakuran, sailor, flannel, aloha; slacks, jeans, cargo, tobi, shorts, skirt cuts; socks, tights,
//     loose socks; oxford, loafer, sneaker, boots, sandal, platform, tabi, pumps; glasses; cane, bags, apron, pouch)
//     plus a few costume kinds (wrap, bodysuit, coat, hakama);
//   - its face language (src/people/face.js EXPRESSIONS: neutral, smile, happy, surprised, sad, angry, sleepy) as anime
//     face paint: big glossy eyes with highlights, a small mouth, blush; + wink, smug, determined, shout, calm, cry.
//
//   chibi(S, spec, { pose, expr, palette, props, parts, base, extra, head })   (S: a Sculpt, millimetres)
//     pose:    a POSES name or { bone: [x, y, z] radians, root: { at, rot }, hipsAt, hands: { L, R } }. Bones turn about
//              their human joints; right-side bones are given mirrored (the same numbers pose both sides alike).
//              x < 0 swings an arm / leg forward, z > 0 takes it out to the side; fore x < 0 bends the elbow, shin x > 0
//              the knee; head x > 0 looks down, y turns, z tilts.
//     props:   [{ hand: 'L' | 'R', build(S, ctx), at, rot }]  built in the fist (local +y points out of the fist)
//     parts:   { armL | armR | head | legL | legR: { name, axis, g, idle, min, max } }  that limb as a gimmick joint
//     extra(ctx): costume pieces (ctx.in(bone, fn), ctx.pt(bone, p), ctx.lock(...), ctx.sheet(...), ctx.P landmarks)
//   chibiSpec(preset, seed, over) -> makeSpec + overrides.   base(S, o) -> a display base below y = 0.
import * as THREE from 'three';
import { spline, V, QUAL } from './sculpt.js';
import { blade } from './anatomy.js';
import { fill, proj, vol, under, crown, tone, tint, mix, circle, ellipse, rbox, seg, arc, poly, star, or, and, cut, stroke, grow, pair, halfBelow, halfAbove, halfLeft, halfRight, below, above, band, label, repeatU, repeatV } from './paint.js';
import { makeSpec } from '../people/presets.js';
import { proportions } from '../people/body.js';
import { exprParams } from '../people/face.js';

// ------------------------------------------------------------------ small helpers
const cb = (v) => Math.max(0, Math.min(255, Math.round(v)));
/** A colour from the people kit ([r, g, b]) or a number, as a number. */
export const hexc = (c, d = null) => (c == null ? d : typeof c === 'number' ? c : (cb(c[0]) << 16) | (cb(c[1]) << 8) | cb(c[2]));
const T4 = (v) => new THREE.Matrix4().makeTranslation(v[0], v[1], v[2]);
const E4 = (e) => new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(e[0] || 0, e[1] || 0, e[2] || 0, 'XYZ'));
const _v = new THREE.Vector3();
const app = (m, p) => { _v.set(p[0], p[1], p[2]).applyMatrix4(m); return [_v.x, _v.y, _v.z]; };
const dirM = (m, d) => { _v.set(d[0], d[1], d[2]).transformDirection(m); return [_v.x, _v.y, _v.z]; };
const AX = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
const lerp = (a, b, t) => a + (b - a) * t;
const L3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const INK = 0x2a2030;
/** A sloped half-plane: the side of the line through (u0, v0) with slope k that is below it (v < v0 + k (u - u0)). */
const under_ = (u0, v0, k) => { const n = Math.hypot(1, k); return { d: (u, v) => (v - v0 - k * (u - u0)) / n, b: null }; };
const over_ = (u0, v0, k) => { const n = Math.hypot(1, k); return { d: (u, v) => (v0 + k * (u - u0) - v) / n, b: null }; };

/** A path cut between arc-length fractions f0..f1. */
function cutPath(path, f0, f1) {
  const acc = [0];
  for (let i = 1; i < path.length; i++) acc.push(acc[i - 1] + V.len(V.sub(path[i], path[i - 1])));
  const L = acc[acc.length - 1], at = (f) => { const d = f * L; let i = 1; while (i < path.length - 1 && acc[i] < d) i++; const t = (d - acc[i - 1]) / ((acc[i] - acc[i - 1]) || 1); return L3(path[i - 1], path[i], Math.max(0, Math.min(1, t))); };
  const out = [at(f0)];
  for (let i = 0; i < path.length; i++) if (acc[i] > f0 * L + 1e-6 && acc[i] < f1 * L - 1e-6) out.push(path[i]);
  out.push(at(f1));
  return out;
}

// ------------------------------------------------------------------ the body plan, chibi
const BASE_P = proportions({ H: 1, sex: 'm', age: 'adult', build: 1 });
/**
 * Chibi landmarks (mm, feet on y = 0, facing +z, +x = the figure's LEFT) from a human spec: the human's proportions
 * (src/people/body.js) give the relative widths (build, sex, age, belly, bust); heights are a chibi's, a little longer
 * for tall people and shorter for kids; the head is about 24 mm, the whole figure about 2.4 heads.
 */
export function chibiProportions(spec, o = {}) {
  const hp = proportions({ ...spec, H: 1, build: spec.build || 1 }), r = (k) => (BASE_P[k] ? hp[k] / BASE_P[k] : 1);
  const kid = spec.age === 'kid', teen = spec.age === 'teen', elder = spec.age === 'elder', f = spec.sex === 'f';
  const tall = o.tall ?? Math.max(0.9, Math.min(1.14, (spec.H || 1.68) / 1.68)) * (kid ? 0.86 : 1);
  const Lg = tall * (o.legs ?? 1), Tk = tall * (o.torso ?? 1);
  const P = { spec, f, kid, teen, elder, lift: 0 };
  P.ankleY = 2.4; P.kneeY = P.ankleY + 6.1 * Lg; P.hipY = P.kneeY + 6.3 * Lg;
  P.crotchY = P.hipY - 1.4; P.pelvisY = P.hipY + 1.9; P.waistY = P.hipY + 4.7 * Tk; P.bustY = P.hipY + 7.8 * Tk;
  P.shoulderY = P.hipY + 10.6 * Tk; P.neckBase = P.shoulderY + 1.1; P.chin = P.neckBase + 1.3;
  P.elbowY = P.shoulderY - 4.6 * Tk; P.wristY = P.shoulderY - 8.7 * Tk;
  // the head: half sizes; its centre; the face's landmarks
  P.hh = 12 * (o.head ?? 1); P.hw = 12.4 * (f ? 0.985 : 1) * (kid ? 1.02 : 1) * (o.head ?? 1); P.hf = 10.6 * (o.head ?? 1); P.hb = 11.4 * (o.head ?? 1);
  P.hc = [0, P.chin + P.hh, 0.6];
  P.eyeX = 4.75 * (o.head ?? 1); P.eyeY = P.hc[1] - 0.2 * P.hh; P.mouthY = P.hc[1] - 0.66 * P.hh;
  // widths (half, mm)
  P.shX = 5.4 * r('shX'); P.chestX = 4.7 * r('bustX'); P.chestZ = 3.4 * r('chestZ'); P.waistX = 4.0 * r('waistX'); P.waistZ = 3.0 * r('waistZ');
  P.hipsX = 4.5 * r('hipsX'); P.hipsZ = 3.3 * r('hipsZ'); P.bust = hp.bust > 0 ? 0.55 * (spec.bust ?? 1) : 0; P.belly = (spec.belly || 0) * 1.5;
  P.armR = 1.4 * r('armX'); P.thighR = 2.2 * r('thighX'); P.hipX = 2.3 * r('hipX'); P.footL = 6.6 * r('footL') * (f ? 0.96 : 1); P.footW = 2.5 * r('footX');
  P.neckR = 1.35;
  if (spec.shoes?.kind === 'platform') P.lift = 1.8;
  return P;
}
/** Rest-pose joint positions (the human's joints, chibi). */
export function chibiJoints(P) {
  const J = {
    hips: [0, P.hipY + 1, 0], chest: [0, P.waistY, -0.2], neck: [0, P.neckBase, -0.3], head: [0, P.chin + 1.2, -0.4], skirt: [0, P.waistY, 0], cape: [0, P.shoulderY + 0.6, -P.chestZ * 0.6],
    armL: [P.shX, P.shoulderY, -0.1], foreL: [P.shX + 0.9, P.elbowY, -0.1], handL: [P.shX + 1.45, P.wristY, 0.3],
    thighL: [P.hipX, P.hipY, 0], shinL: [P.hipX + 0.1, P.kneeY, 0.15], footL: [P.hipX + 0.2, P.ankleY, -0.3],
    tailL: [P.hw * 0.8, P.hc[1] + P.hh * 0.4, P.hc[2] - P.hb * 0.3],
  };
  for (const b of ['arm', 'fore', 'hand', 'thigh', 'shin', 'foot', 'tail']) { const p = J[b + 'L']; J[b + 'R'] = [-p[0], p[1], p[2]]; }
  return J;
}
const PARENT = { hips: 'root', chest: 'hips', neck: 'chest', head: 'neck', cape: 'chest', armL: 'chest', foreL: 'armL', handL: 'foreL', armR: 'chest', foreR: 'armR', handR: 'foreR', thighL: 'hips', shinL: 'thighL', footL: 'shinL', thighR: 'hips', shinR: 'thighR', footR: 'shinR', skirt: 'hips', tailL: 'head', tailR: 'head' };
/** Bone matrices (figure space) for a pose: each bone turns about its joint, children follow (forward kinematics). */
export function rig(P, J, pose = {}) {
  const M = {}, r = pose.root || {};
  M.root = T4([0, P.lift || 0, 0]).multiply(T4(r.at || [0, 0, 0])).multiply(E4(r.rot || [0, 0, 0]));
  for (const b of Object.keys(PARENT)) {
    const m = M[PARENT[b]].clone();
    if (b === 'hips' && pose.hipsAt) m.multiply(T4(pose.hipsAt));
    let e = pose[b];
    if (e) {
      if (/R$/.test(b)) e = [e[0] || 0, -(e[1] || 0), -(e[2] || 0)];
      const j = J[b];
      m.multiply(T4(j)).multiply(E4(e)).multiply(T4([-j[0], -j[1], -j[2]]));
    }
    M[b] = m;
  }
  return M;
}

// ------------------------------------------------------------------ poses (start points; the sets add their own)
export const POSES = {
  stand: { armL: [0.05, 0, 0.12], armR: [0.05, 0, 0.12], foreL: [-0.25, 0, 0], foreR: [-0.25, 0, 0], thighL: [0, 0, 0.04], thighR: [0, 0, 0.04], head: [0.06, 0, 0] },
  wave: { armL: [0.05, 0, 0.14], foreL: [-0.3, 0, 0], armR: [-0.2, 0, 2.3], foreR: [0, 0, 0.6], head: [0.04, 0.12, -0.1], thighL: [0, 0, 0.06], thighR: [-0.05, 0, 0.1], hands: { R: 'open' } },
  peace: { armL: [0.1, 0, 0.18], foreL: [-0.3, 0, 0], armR: [-0.4, 0.2, 1.2], foreR: [-1.9, 0, 0], head: [0.05, 0.1, 0.16], thighL: [0, 0, 0.05], thighR: [0, 0, 0.05], hands: { R: 'peace' } },
  hips: { armL: [0.1, 0.4, 0.75], foreL: [-1.6, 0.3, -0.6], armR: [0.1, 0.4, 0.75], foreR: [-1.6, 0.3, -0.6], thighL: [0, 0, 0.12], thighR: [0, 0, 0.12], head: [0, 0, 0.08] },
  behind: { armL: [0.4, 0, 0.12], foreL: [-0.2, 0.6, -0.6], armR: [0.4, 0, 0.12], foreR: [-0.2, 0.6, -0.6], chest: [0.1, 0, 0], head: [0.05, 0, 0.1] },
};
function resolvePose(p) {
  if (!p) return POSES.stand;
  if (typeof p === 'string') return POSES[p] || POSES.stand;
  if (p.from) { const b = POSES[p.from] || {}; return { ...b, ...p, hands: { ...(b.hands || {}), ...(p.hands || {}) } }; }
  return p;
}

// ------------------------------------------------------------------ the look: a spec's colours and garments
const SKIN_PVC = 0xffe8dc;
function lookOf(spec, pal) {
  const F = spec.face || {}, top = spec.top || { kind: 'tee', col: [240, 240, 236] }, bot = spec.bottom || { kind: 'slacks', col: [60, 60, 70] };
  const skin0 = hexc(pal.skin ?? spec.skin, 0xf0d0b8);
  const hair = hexc(pal.hair ?? spec.hair?.col, 0x2a2428);
  const L = {
    skin: pal.skin ? skin0 : mix(skin0, SKIN_PVC, 0.22),
    hair, hairHi: hexc(pal.hairHi ?? spec.hair?.hi, tint(hair, 0.4)), hairStyle: pal.hairStyle || spec.hair?.style || 'short', part: spec.hair?.part ?? 1, vol: spec.hair?.volume ?? 1,
    iris: hexc(pal.iris ?? F.iris, 0x4a2c1c),
    top: { ...top, col: hexc(pal.top ?? top.col, 0xf0f0ec), col2: hexc(pal.top2 ?? top.col2, null), shirt: hexc(pal.shirt ?? top.shirt, null), tie: hexc(top.tie, null), scarf: hexc(top.scarf, null), collar: hexc(top.collar, null), stripe: hexc(top.stripe, 0xf2f2ee), vest: hexc(top.vest, null), band: hexc(top.band, null) },
    bottom: { ...bot, col: hexc(pal.bottom ?? bot.col, 0x3a3a44), belt: hexc(bot.belt, null), plaid: hexc(bot.plaid, null) },
    legs: spec.legs || 'skin', socks: hexc(pal.socks ?? spec.socks?.col, null), tights: hexc(spec.tights, null),
    shoes: { kind: 'sneaker', ...(spec.shoes || {}), col: hexc(pal.shoes ?? spec.shoes?.col, 0x3a3030), col2: hexc(spec.shoes?.col2, null) },
    hat: spec.hat ? { ...spec.hat, col: hexc(pal.hat ?? spec.hat.col, 0x5a5048), col2: hexc(spec.hat.col2, null) } : null,
    glasses: spec.glasses ? { ...spec.glasses, col: hexc(spec.glasses.col, 0x302a28) } : null,
    acc: (spec.acc || []).map((a) => ({ ...a, col: hexc(a.col, 0x5a4a3a), col2: hexc(a.col2, null) })),
    face: {
      eyeW: F.eyeW ?? 1, eyeH: F.eyeH ?? 1, tilt: F.tilt ?? 0.7, browW: F.browW ?? 1, browArch: F.browArch ?? 1, browCol: hexc(F.browCol, null), lid: F.lid,
      blush: F.blush ?? 0.25, makeup: F.makeup || null, lipstick: hexc(F.lipstick, null), mustache: !!F.mustache, stubble: F.stubble || 0, wrinkles: F.wrinkles || 0,
    },
  };
  if (pal.blush !== undefined) L.face.blush = pal.blush;
  return L;
}
/** A human spec from a preset (src/people/presets.js) with overrides merged in (one level deep). */
export function chibiSpec(preset, seed = 1, over = {}) {
  const s = makeSpec(preset, seed);
  for (const [k, v] of Object.entries(over)) s[k] = v && typeof v === 'object' && !Array.isArray(v) && s[k] && typeof s[k] === 'object' && !Array.isArray(s[k]) ? { ...s[k], ...v } : v;
  return s;
}

// ------------------------------------------------------------------ the head: a faceted chibi skull with a flat face plane
// stations up the head: [v (-1 chin .. 1 crown), half width, front, back] as fractions of hw, hf, hb
const HEAD_ST = [[-1, 0.12, 0.56, -0.3], [-0.84, 0.42, 0.77, 0.1], [-0.58, 0.73, 0.88, 0.6], [-0.26, 0.93, 0.93, 0.9], [0.08, 1, 0.93, 1], [0.42, 0.97, 0.84, 1.01], [0.7, 0.85, 0.66, 0.9], [0.9, 0.6, 0.4, 0.64], [1, 0.16, 0.1, 0.18]];
const TF = 1.05; // the angle where the face plane meets the cheeks
function headDims(v) {
  v = Math.max(-1, Math.min(1, v));
  let i = 1;
  while (i < HEAD_ST.length - 1 && HEAD_ST[i][0] < v) i++;
  const a = HEAD_ST[i - 1], b = HEAD_ST[i], t = (v - a[0]) / (b[0] - a[0]);
  return [lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3], b[3], t)];
}
const se = (c, p) => Math.sign(c) * Math.abs(c) ** (2 / p);
/** A point on the head (head-bone rest coords) at height v, angle a (pi / 2 = the front centre, 0 = the figure's left), grown by g mm. */
export function headPt(P, v, a, g = 0) {
  const [w, f, b] = headDims(v), W = w * P.hw + g, Fr = f * P.hf + g, Bk = b * P.hb + g, y = P.hc[1] + v * P.hh;
  a = Math.atan2(Math.sin(a), Math.cos(a));
  if (a > TF && a < Math.PI - TF) { // the flat face plane
    const t = (a - TF) / (Math.PI - 2 * TF), xc = W * se(Math.cos(TF), 2.8), zc = Fr * se(Math.sin(TF), 2.8);
    return [lerp(xc, -xc, t), y, P.hc[2] + zc];
  }
  const s = Math.sin(a), c = Math.cos(a);
  return [W * se(c, s > 0 ? 2.8 : 2.3), y, P.hc[2] + (s > 0 ? Fr * se(s, 2.8) : Bk * se(s, 2.3))];
}
/** The z of the face plane at height v (head rest coords). */
export const faceZ = (P, v, g = 0) => headPt(P, v, Math.PI / 2, g)[2];
function headAngles(m) { const out = [], span = Math.PI + 2 * TF; for (let i = 0; i < m; i++) out.push(TF - span * i / (m - 1)); return out; }

function buildHead(ctx) {
  const { S, P, look } = ctx, angs = ctx.headAngs;
  S.with({ dens: 1.7 }, () => {
    S.paint(fill(look.skin, { rough: 0.5 }), ...faceLayers(ctx), ...(typeof ctx.o.facePaint === 'function' ? ctx.o.facePaint(ctx) : ctx.o.facePaint || []), under(0.14, -0.5), crown(0.05));
    S.loft(HEAD_ST.map(([v]) => angs.map((a) => headPt(P, v, a))));
  });
  // a little nose: a three-sided point on the face plane
  const nv = -0.44, nz = faceZ(P, nv), ny = P.hc[1] + nv * P.hh;
  S.paint(fill(look.skin), under(0.25, -0.3));
  S.emit([[[0, ny - 0.5, nz + 0.55], [-0.45, ny - 0.6, nz], [0.45, ny - 0.6, nz]], [[0, ny - 0.5, nz + 0.55], [0.45, ny - 0.6, nz], [0, ny + 0.9, nz]], [[0, ny - 0.5, nz + 0.55], [0, ny + 0.9, nz], [-0.45, ny - 0.6, nz]]], (q) => V.sub(V.mul(V.add(V.add(q[0], q[1]), q[2]), 1 / 3), [0, ny, nz - 1]));
  // ears (covered by most hair)
  if (ctx.showEars) for (const s of [1, -1]) {
    const p = headPt(P, -0.22, s > 0 ? -0.08 : Math.PI + 0.08, -0.4);
    S.paint(fill(look.skin), proj('front', ellipse(0, 1.8, 0.6, 1.1), tone(look.skin, 0.18)));
    S.at(p, [0, s * 0.35, -s * 0.12], () => blade(S, 3.4, 2.6, 1, { shape: 'round', cup: 0.5, n: 6 }));
  }
}

// ------------------------------------------------------------------ the face language
/** Anime faces for the human expressions (src/people/face.js) and a few more. */
export const EXPR = {
  neutral: { eye: 'open', mouth: 'small', brow: 'calm' },
  smile: { eye: 'open', mouth: 'smile', brow: 'calm' },
  happy: { eye: 'happy', mouth: 'grin', brow: 'up', blush: 1 },
  surprised: { eye: 'round', mouth: 'o', brow: 'up' },
  sad: { eye: 'sad', mouth: 'frown', brow: 'worried', tear: true },
  angry: { eye: 'sharp', mouth: 'grit', brow: 'angry' },
  sleepy: { eye: 'half', mouth: 'o', brow: 'calm' },
  wink: { eye: 'open', eyeR: 'happy', mouth: 'tongue', brow: 'up', blush: 1 },
  smug: { eye: 'half', mouth: 'cat', brow: 'calm' },
  determined: { eye: 'sharp', mouth: 'flat', brow: 'angry' },
  shout: { eye: 'sharp', mouth: 'shout', brow: 'angry' },
  calm: { eye: 'closed', mouth: 'smile', brow: 'calm' },
  cheer: { eye: 'happy', mouth: 'shout', brow: 'up', blush: 1 },
  grin: { eye: 'open', mouth: 'grin', brow: 'up' },
};
const BASE_EXPR = { neutral: 'neutral', smile: 'smile', happy: 'happy', surprised: 'surprised', sad: 'sad', angry: 'angry', sleepy: 'sleepy', wink: 'happy', smug: 'smile', determined: 'angry', shout: 'angry', calm: 'smile', cheer: 'happy', grin: 'happy' };

function faceLayers(ctx) {
  const { P, look } = ctx, F = look.face, ex0 = P.eyeX, ey = P.eyeY, skin = look.skin, L = [];
  const E = typeof ctx.expr === 'object' ? { ...EXPR.smile, ...ctx.expr } : EXPR[ctx.expr] || EXPR.smile;
  const H = exprParams(BASE_EXPR[ctx.expr] || 'neutral'); // the human face's brow / mouth parameters
  const near = P.hc[2] + 1;
  const add = (shape, c, o = {}) => L.push(proj('front', shape, c, { near, facing: 0.08, ...o }));
  const ew = 2.2 * F.eyeW * (P.f ? 1.02 : 0.98), eh = 2.95 * F.eyeH * (P.f ? 1.04 : 0.9) * (P.elder ? 0.86 : 1);
  const lashC = mix(look.hair, 0x22161e, 0.7), white = 0xfdfaf5, iris = look.iris, pupil = mix(iris, 0x160c18, 0.78);
  const lineC = mix(skin, 0x5a2630, 0.7), heavy = (F.makeup?.lash ?? (P.f ? 0.5 : 0.15)), elder = P.elder;
  const tiltK = (F.tilt - 0.65) * 0.22;
  const [lx, ly] = E.look || [0, H.lookY ? -H.lookY * 0.25 : 0];
  for (const s of [1, -1]) {
    const ex = s * ex0, kind = (s > 0 ? E.eyeL : E.eyeR) || E.eye;
    const lw = (0.5 + heavy * 0.28) * (elder ? 0.8 : 1);
    if (kind === 'happy' || kind === 'closed' || kind === 'line') {
      const sh = kind === 'happy' ? arc(ex, ey - eh * 0.35, ew * 1.05, Math.PI * 0.12, Math.PI * 0.88, lw * 1.35)
        : kind === 'closed' ? arc(ex, ey + eh * 0.45, ew * 1.05, Math.PI * 1.12, Math.PI * 1.88, lw * 1.25) : seg(ex - ew, ey - eh * 0.1, ex + ew, ey - eh * 0.1, lw * 1.2);
      add(sh, lashC);
      if (heavy > 0.4 && kind === 'happy') add(seg(ex + s * ew * 0.95, ey - eh * 0.1, ex + s * ew * 1.45, ey + eh * 0.12, 0.38), lashC);
      if (elder) add(or(seg(ex + s * ew * 1.25, ey - eh * 0.05, ex + s * ew * 1.75, ey + eh * 0.12, 0.26), seg(ex + s * ew * 1.25, ey - eh * 0.3, ex + s * ew * 1.75, ey - eh * 0.42, 0.26)), tone(skin, 0.3));
      continue;
    }
    // the open eye: a top line (its tilt), the white, the iris (dark at the top, light at the bottom), the pupil, the
    // lash line, two highlights
    let top = 0.8, k = s * tiltK, ik = 1, pk = 1;
    if (kind === 'sharp') { top = 0.5; k = s * (tiltK + 0.42); ik = 0.94; }
    else if (kind === 'half') { top = 0.12; k = s * 0.04; }
    else if (kind === 'round') { top = 1.05; ik = 0.66; pk = 0.55; }
    else if (kind === 'sad') { top = 0.62; k = -s * 0.3; }
    const eyeS = and(ellipse(ex, ey, ew, eh), under_(ex, ey + eh * top, k));
    if (F.makeup?.shadow) add(and(ellipse(ex, ey + eh * 0.55, ew * 1.2, eh * 0.75), over_(ex, ey + eh * top, k)), hexc(F.makeup.shadow), { alpha: 0.7 });
    add(eyeS, white, { rough: 0.25 });
    const ic = [ex + s * 0.06 * ew + lx, ey - 0.06 * eh + ly], irisS = and(ellipse(ic[0], ic[1], ew * 0.8 * ik, eh * 0.84 * ik), eyeS);
    add(irisS, iris, { rough: 0.2 });
    add(and(irisS, halfAbove(ic[1] + eh * 0.16 * ik)), tone(iris, 0.42), { rough: 0.2 });
    add(and(irisS, ellipse(ic[0], ic[1] - eh * 0.5 * ik, ew * 0.58 * ik, eh * 0.3 * ik)), tint(iris, 0.5), { rough: 0.2 });
    add(and(ellipse(ic[0], ic[1] + eh * 0.02, ew * 0.34 * ik * pk, eh * 0.42 * ik * pk), eyeS), pupil, { rough: 0.15 });
    // the lash line: the top of the outline, heavier towards the outer corner, and a flick
    add(and(cut(grow(eyeS, lw), eyeS), over_(ex, ey + eh * (top - 0.75), k * 0.4)), lashC);
    const oc = [ex + s * ew * 0.92, ey + eh * Math.min(top, 0.55) * 0.9 + k * ew * 0.92 * s];
    add(seg(oc[0], oc[1], oc[0] + s * (0.7 + heavy * 0.5), oc[1] + 0.2 + heavy * 0.35, 0.36 + heavy * 0.2), lashC);
    if (heavy > 0.45) add(seg(oc[0] - s * 0.3, oc[1] + 0.3, oc[0] + s * 0.25, oc[1] + 0.95, 0.3), lashC);
    // the lower lash at the outer corner; a lid crease (double lids)
    add(and(stroke(ellipse(ex, ey, ew, eh), 0.32 + (F.makeup?.lower ? 0.18 : 0)), and(halfBelow(ey - eh * 0.45), s > 0 ? halfRight(ex + ew * 0.15) : halfLeft(ex - ew * 0.15))), F.makeup?.lower ? lashC : tone(skin, 0.42));
    if (F.lid === 'double' && kind !== 'half') add(arc(ex + s * 0.15, ey + eh * (top - 0.95), ew * 1.02, Math.PI * (s > 0 ? 0.28 : 0.3), Math.PI * (s > 0 ? 0.7 : 0.72), 0.22), tone(skin, 0.3));
    add(ellipse(ic[0] - ew * 0.32 * ik, ic[1] + eh * 0.3 * ik, ew * 0.27 * ik, eh * 0.2 * ik, -0.3), 0xffffff, { rough: 0.1 });
    add(circle(ic[0] + ew * 0.3 * ik, ic[1] - eh * 0.36 * ik, ew * 0.13), 0xffffff, { rough: 0.1 });
    if (elder) add(or(seg(ex + s * ew * 1.2, ey - eh * 0.1, ex + s * ew * 1.7, ey + eh * 0.05, 0.24), seg(ex + s * ew * 1.15, ey - eh * 0.4, ex + s * ew * 1.65, ey - eh * 0.55, 0.24)), tone(skin, 0.28));
    if (E.tear && s < 0) add(or(ellipse(ex + ew * 0.4, ey - eh * 1.25, 0.55, 0.85), poly([[ex + ew * 0.4 - 0.48, ey - eh * 1.1], [ex + ew * 0.4 + 0.48, ey - eh * 1.1], [ex + ew * 0.4, ey - eh * 0.75]])), 0xbfe6f6, { rough: 0.1 });
  }
  // brows (the human expression's brow lift and inner raise, the spec's brow weight and arch)
  const by = ey + eh + 1.25 + (H.brow || 0) * 0.28, bw = (0.34 + 0.2 * (F.browW - 1)) * (elder ? 1.7 : 1), bc = F.browCol ?? (elder ? mix(look.hair, 0xd8d0c8, 0.3) : tone(look.hair, 0.12));
  const BR = { calm: [0, -0.15], up: [0.5, 0.35], angry: [-0.75, 0.55], worried: [0.7, -0.45] }[E.brow || 'calm'];
  for (const s of [1, -1]) {
    const x0 = s * (ex0 - ew * 0.85), x1 = s * (ex0 + ew * 1.0), y0 = by + BR[0] + (H.inner || 0) * 0.15, y1 = by + BR[1];
    add(seg(x0, y0, x1, y1, bw * 2), bc);
    if (F.browArch > 1.2 && E.brow !== 'angry') add(seg(lerp(x0, x1, 0.55), lerp(y0, y1, 0.55) + 0.2, x1, y1, bw * 1.6), bc);
  }
  // the mouth
  const my = P.mouthY, mc = F.lipstick ? mix(F.lipstick, lineC, 0.25) : lineC, inside = 0x8e2c3c, tongue = 0xf0848e;
  const lw = 0.36, m = E.mouth;
  if (m === 'small') add(seg(-0.55, my, 0.55, my, lw), mc);
  else if (m === 'flat') add(seg(-0.95, my, 0.95, my - 0.05, lw), mc);
  else if (m === 'smile') add(arc(0, my + 1.15, 1.35, Math.PI * 1.3, Math.PI * 1.7, lw), mc);
  else if (m === 'frown') add(arc(0, my - 1.05, 1.2, Math.PI * 0.3, Math.PI * 0.7, lw), mc);
  else if (m === 'cat') { add(arc(-0.5, my + 0.25, 0.5, Math.PI * 1.05, Math.PI * 1.95, lw), mc); add(arc(0.5, my + 0.25, 0.5, Math.PI * 1.05, Math.PI * 1.95, lw), mc); }
  else if (m === 'o') { add(ellipse(0, my - 0.2, 0.62, 0.8), inside); add(stroke(ellipse(0, my - 0.2, 0.62, 0.8), 0.22), mc); }
  else if (m === 'grin' || m === 'tongue' || m === 'shout') {
    const big = m === 'shout' ? 1.3 : 1;
    const ms = m === 'tongue' ? and(ellipse(0, my + 0.4, 1.3, 1.1), halfBelow(my + 0.4)) : and(ellipse(0, my + 0.3 * big, 1.45 * big, 1.45 * big), halfBelow(my + 0.3 * big));
    add(ms, inside);
    add(and(ms, ellipse(0.1, my - 0.95 * big, 1.0 * big, 0.62 * big)), tongue);
    if (m === 'shout') add(and(ms, halfAbove(my + 0.0)), 0xffffff);
    add(stroke(ms, 0.2), mc);
  } else if (m === 'grit') { const g = rbox(0, my, 1.35, 0.55, 0.3); add(g, 0xffffff); add(stroke(g, 0.24), mc); add(seg(-1.2, my, 1.2, my, 0.18), mc); }
  // blush, with its hatching
  const bl = E.blush ?? F.blush * 2;
  if (bl >= 0.45) {
    const bc2 = mix(skin, 0xff5a78, 0.4);
    add(pair(ellipse(ex0 + 0.45, ey - eh - 0.75, 1.75, 0.72)), bc2, { alpha: 0.8 });
    for (const dx of [-0.75, 0, 0.75]) add(pair(seg(ex0 + 0.45 + dx - 0.3, ey - eh - 1.05, ex0 + 0.45 + dx + 0.3, ey - eh - 0.45, 0.2)), mix(skin, 0xe04060, 0.55));
  }
  // stubble, moustache shadow, an old man's smile lines
  if (F.stubble > 0.3) add(and(repeatU(repeatV(circle(0, 0, 0.14), 0.62), 0.62), and(ellipse(0, my - 0.4, 5.2, 3.2), halfBelow(my + 1.2))), mix(skin, 0x6a7088, 0.45));
  if (F.wrinkles > 0.5) for (const s of [1, -1]) add(arc(s * 2.2, my + 1.6, 1.4, s > 0 ? Math.PI * 1.65 : Math.PI * 1.05, s > 0 ? Math.PI * 1.95 : Math.PI * 1.35, 0.22), tone(skin, 0.24));
  if (E.sweat) add(or(ellipse(7.6, ey + 3.4, 0.8, 1.15), poly([[6.9, ey + 3.6], [8.3, ey + 3.6], [7.6, ey + 5.1]])), 0xbfe6f6, { rough: 0.1 });
  return L;
}

// ------------------------------------------------------------------ hair: a faceted cap and planar locks
/**
 * A lock of hair swept through control points: a wedge section (flat side towards `c`, a ridge outwards) or a
 * diamond (free-hanging locks), w wide and th thick at its root, coming to a point. o: c (the centre it lies against)
 * or out ([x, y, z] | (p, t) -> dir), prof ('wedge' | 'diamond'), steps, taper ((t) -> 0..1).
 */
export function lock(S, ctrl, w, th, o = {}) {
  const path = spline(ctrl, o.steps ?? 2), n = path.length, prof = o.prof || 'wedge';
  const taper = o.taper || ((t) => Math.min(1, 0.72 + 1.4 * t) * (1 - t ** 1.7));
  const rings = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), p = path[i], tg = V.norm(V.sub(path[Math.min(n - 1, i + 1)], path[Math.max(0, i - 1)]));
    let ref = o.out ? (typeof o.out === 'function' ? o.out(p, t) : o.out) : V.sub(p, o.c || [0, 0, 0]);
    let side = V.cross(tg, ref);
    if (V.len(side) < 1e-5) side = V.cross(tg, [0, 0, 1]);
    side = V.norm(side);
    const up = V.norm(V.cross(side, tg)), k = Math.max(0, taper(t)), ww = w * k / 2, tt = th * k;
    const P2 = (a, b) => V.add(p, V.add(V.mul(side, a), V.mul(up, b)));
    rings.push(prof === 'diamond' ? [P2(ww, 0), P2(0, tt / 2), P2(-ww, 0), P2(0, -tt / 2)] : prof === 'hex' ? [P2(ww, 0), P2(ww * 0.6, tt / 2), P2(-ww * 0.6, tt / 2), P2(-ww, 0), P2(-ww * 0.6, -tt / 2), P2(ww * 0.6, -tt / 2)] : [P2(-ww, -tt * 0.2), P2(ww, -tt * 0.2), P2(0, tt * 0.8)]);
  }
  return S.loft(rings, { caps: 'start' });
}

/** The hairline (v) at angle a for a cap: front, side, back. */
const hairline = (a, h) => { const s = Math.sin(a); return s >= 0 ? lerp(h[1], h[0], s ** 1.4) : lerp(h[1], h[2], (-s) ** 0.8); };
/** A cap of hair over the skull from the hairline h = [front, side, back] up, th thick (flush with the skin at its edge). */
function hairCap(ctx, h, th, o = {}) {
  const { S, P } = ctx, angs = ctx.headAngs, vs = [...new Set([Math.min(h[0], h[1], h[2]), ...HEAD_ST.map((s) => s[0])])].filter((v) => v >= Math.min(h[0], h[1], h[2]) - 1e-6).sort((a, b) => a - b);
  const top = o.top ?? 1;
  const rings = vs.filter((v) => v <= top + 1e-6).map((v) => angs.map((a) => {
    const hl = hairline(a, h), vv = Math.max(v, hl), g = th * Math.min(1, (vv - hl) / 0.16) * (o.puff ? 1 + o.puff * Math.sin(Math.max(0, (vv + 1) / 2) * Math.PI) : 1);
    return headPt(P, Math.min(vv, top), a, g + 0.02);
  }));
  S.loft(rings, { caps: top < 1 ? 'none' : 'end' });
}
/** A root point on the head (v, a), grown g, as a lock's first control point. */
const R_ = (ctx, v, a, g = 0) => headPt(ctx.P, v, a, g);
const DEG = Math.PI / 180;

function hairPaint(ctx) {
  const { look, P } = ctx, c = look.hair, hi = mix(c, look.hairHi, 0.55), yc = P.hc[1] + P.hh * 0.52;
  // the "angel ring": a zig-zag band of shine round the crown
  const zig = (x, y, z) => { const a = Math.atan2(x, z - P.hc[2]); const k = Math.abs(((a * 7 / Math.PI) % 2 + 2) % 2 - 1); return Math.abs(y - (yc + (k - 0.5) * 1.6)) - 0.6; };
  zig.box = [-40, yc - 2.5, -40, 40, yc + 2.5, 40];
  return [fill(c, { rough: 0.38 }), vol(zig, hi, { rough: 0.3 }), under(0.2, -0.35), crown(0.1, 0.6)];
}
const lockPaint = (ctx) => [fill(ctx.look.hair, { rough: 0.38 }), crown(0.12, 0.45), under(0.22, -0.3)];

// bangs across the forehead: n locks; len: how far down (v of the tips); sweep: tips swept to the side (radians)
function bangs(ctx, o = {}) {
  o = { ...o, ...(ctx.o.bangs || {}) };
  const { S, P } = ctx, n = o.n ?? 6, span = o.span ?? 78 * DEG, th = o.th ?? 1.3, c = [P.hc[0], P.hc[1] + 2, P.hc[2] - 3];
  const tips = o.tips || [0.22, 0.08, 0.16, 0.04, 0.14, 0.24, 0.1, 0.2];
  S.paint(...lockPaint(ctx));
  for (let i = 0; i < n; i++) {
    const u = n > 1 ? i / (n - 1) - 0.5 : 0, a = Math.PI / 2 + u * span, sw = (o.sweep ?? 0) + u * (o.fan ?? 0.25) + (o.split && Math.abs(u) > 0.01 ? Math.sign(u) * o.split : 0);
    const tv = (o.len ?? 0.14) + (tips[(i + (o.seed || 0)) % tips.length] - 0.14) * (o.ragged ?? 1) + Math.abs(u) * (o.sideDrop ?? -0.25);
    const w = (span * P.hw * 1.5 / n) * (o.wide ?? 1.25) * (1 + (o.vary ?? 0.28) * Math.sin(i * 2.3 + (o.seed || 0) * 1.7));
    lock(S, [R_(ctx, 0.66, a, -0.6), R_(ctx, 0.52, a + sw * 0.3, th * 1.25), R_(ctx, (0.52 + tv) / 2, a + sw * 0.72, th * 0.95), R_(ctx, tv, a + sw, 0.3)], w, th, { c, steps: 2 });
  }
}
// locks hanging down the sides in front of the ears; len: v of the tips (below -1: past the chin)
function sideLocks(ctx, o = {}) {
  const { S, P } = ctx, th = o.th ?? 1.2;
  S.paint(...lockPaint(ctx));
  for (const s of [1, -1]) for (let k = 0; k < (o.n ?? 1); k++) {
    const a = (s > 0 ? (o.a ?? 30) : 180 - (o.a ?? 30)) * DEG - s * k * 14 * DEG, vt = (o.len ?? -0.7) - k * 0.12;
    const tip = vt >= -1 ? R_(ctx, vt, a + s * 0.05, 0.6) : (() => { const p = R_(ctx, -0.9, a, 0.6); return [p[0] + s * (o.flare ?? 0.6), p[1] + (vt + 0.9) * P.hh, p[2] + (o.fwd ?? 0.6)]; })();
    lock(S, [R_(ctx, 0.5, a, -0.4), R_(ctx, 0.1, a, th * 0.9), R_(ctx, Math.max(-0.8, (0.1 + vt) / 2), a + s * 0.04, th * 0.8), tip], (o.w ?? 3.6) - k * 0.5, th, { c: [P.hc[0], P.hc[1], P.hc[2] - 2], steps: 2 });
  }
}
// locks round the back of the head, from the crown down to len (v; below -1: down the back)
function backLocks(ctx, o = {}) {
  const { S, P } = ctx, n = o.n ?? 7, th = o.th ?? 1.5, a0 = o.a0 ?? -10 * DEG, a1 = o.a1 ?? -170 * DEG;
  S.paint(...lockPaint(ctx));
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0.5, a = lerp(a0, a1, t), side = Math.cos(a), back = -Math.sin(a);
    const vt = (o.len ?? -0.75) - back * (o.longBack ?? 0) - ((i % 2) * (o.ragged ?? 0.08));
    const flick = o.flick ?? 0.8, g = th * 0.9;
    const pts = [R_(ctx, 0.7, a, -0.5), R_(ctx, 0.25, a, g)];
    if (vt >= -0.95) pts.push(R_(ctx, (0.25 + vt) / 2, a, g * 1.1), (() => { const p = R_(ctx, vt, a, g + flick); return [p[0] + side * flick, p[1], p[2] - back * flick * 0.5]; })());
    else { const p = R_(ctx, -0.55, a, g * 1.2), d = (vt + 0.55) * P.hh; pts.push(p, [p[0] * (o.narrow ?? 0.8) + side * flick, p[1] + d * 0.55, p[2] - back * 0.6 + Math.abs(side) * -1.5], [p[0] * (o.narrow ?? 0.8) * 0.85 + side * flick * 1.4, p[1] + d, p[2] - back * (0.4 + flick) - Math.abs(side) * 3]); }
    lock(S, pts, (o.w ?? 5.2) * (1 - Math.abs(side) * 0.15), th, { c: [P.hc[0], P.hc[1] + 3, P.hc[2]], steps: 2 });
  }
}
// spikes standing out of the crown
function spikes(ctx, o = {}) {
  const { S, P } = ctx, th = o.th ?? 1.8, list = o.list || [[90, 0.85, 1], [55, 0.8, 1], [125, 0.8, 1], [20, 0.7, 0.9], [160, 0.7, 0.9], [-30, 0.72, 1], [-150, 0.72, 1], [-90, 0.8, 1.1], [-60, 0.9, 1], [-120, 0.9, 1], [0, 0.4, 0.8], [180, 0.4, 0.8], [-90, 0.35, 0.9]];
  S.paint(...lockPaint(ctx));
  for (const [deg, v, k] of list) {
    const a = deg * DEG, r0 = R_(ctx, v - 0.1, a, -0.4), n = V.norm(V.sub(R_(ctx, v, a, 1), R_(ctx, v, a, 0))), up = o.up ?? 0.6;
    const d = V.norm(V.add(n, [0, up, 0])), L = (o.len ?? 6) * k;
    lock(S, [r0, V.add(r0, V.mul(d, L * 0.4)), V.add(V.add(r0, V.mul(d, L)), [Math.cos(a) * (o.curl ?? 0.6), -(o.droop ?? 0.4) * L * 0.1, 0])], (o.w ?? 5) * k, th * k, { c: P.hc, steps: 2 });
  }
}
// a bundle of locks hanging from a tie (ponytail, twin tails): at, the first direction, length, spread
function tail(ctx, at, dir, len, o = {}) {
  const { S, P } = ctx, n = o.n ?? 4, w = o.w ?? 3.6, th = o.th ?? 2.6, sw = o.swing ?? [0, 0, 0];
  S.paint(...lockPaint(ctx));
  for (let i = 0; i < n; i++) {
    const u = n > 1 ? i / (n - 1) - 0.5 : 0, spread = o.spread ?? 1.6, sd = o.side || [1, 0, 0];
    const p1 = V.add(at, V.mul(dir, 2.2)), off = V.mul(sd, u * spread);
    const p2 = V.add(V.add(at, V.mul(dir, 4.5)), V.add([0, -len * 0.35, 0], V.mul(off, 1.6)));
    const p3 = V.add(V.add(at, V.mul(dir, 3.2 + (o.curl ?? 0))), V.add([sw[0] * 0.5, -len * 0.72, sw[2] * 0.5], V.mul(off, 2.2)));
    const p4 = V.add(V.add(at, V.mul(dir, 2.6 - (o.curl ?? 0) * 0.6)), V.add([sw[0], -len * (0.96 - Math.abs(u) * 0.18), sw[2]], V.mul(off, 1.2 + (o.fan ?? 0))));
    lock(S, [V.add(at, V.mul(off, 0.3)), p1, p2, p3, p4], w * (1 - Math.abs(u) * 0.3), th, { prof: 'diamond', out: o.out || V.norm(V.cross(dir, sd)), steps: 2, taper: (t) => Math.min(1, 0.55 + 2.2 * t) * (1 - t ** 1.5) });
  }
  if (o.tie !== false) { S.paint(fill(o.tieCol ?? 0xd83a4a, { rough: 0.4 }), under(0.2)); S.at(at, null, () => tieKnot(S, dir, o.tieR ?? 1.5)); }
}
/** A hair tie: a short faceted band around the start of a tail. */
function tieKnot(S, dir, r) {
  const t = V.norm(dir), u = V.norm(V.cross(t, Math.abs(t[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), w = V.cross(t, u), ring2 = (d, rr) => Array.from({ length: 6 }, (_, k) => { const a = k / 6 * Math.PI * 2; return V.add(V.mul(t, d), V.add(V.mul(u, Math.cos(a) * rr), V.mul(w, Math.sin(a) * rr))); });
  S.loft([ring2(-0.3, r * 0.8), ring2(0, r), ring2(0.9, r), ring2(1.2, r * 0.8)]);
}

/** The hair of a spec's style (src/people/hair.js styles + anime ones), with a hat's band cutting it where there is one. */
function buildHair(ctx) {
  const { S, P, look } = ctx, st = look.hairStyle, pt = look.part || 1, hv = look.vol, hat = look.hat?.kind, hatOn = hat && hat !== 'headband';
  const capH = hatOn ? 0.36 : 1; // under a hat only what shows below the band is built
  const cap = (h, th, o = {}) => { ctx.hairTh = th * (1 + (o.puff || 0)); S.paint(...hairPaint(ctx)); hairCap(ctx, h, th, { top: hatOn ? capH : 1, ...o }); };
  ctx.showEars = ['buzz', 'bald', 'spiky', 'pompadour', 'short', 'sidepart'].includes(st);
  if (st === 'bald') { cap([-0.1, -0.12, -0.6], 0.6, { top: 0.15 }); return; }
  if (st === 'buzz') { cap([0.55, 0.05, -0.55], 0.55); if (!hatOn) spikes(ctx, { len: 1.6, w: 3, th: 0.9, up: 0.2, droop: 0, list: [[90, 0.8, 1], [60, 0.85, 1], [120, 0.85, 1], [30, 0.75, 1], [150, 0.75, 1], [-60, 0.85, 1], [-120, 0.85, 1], [-90, 0.7, 1], [0, 0.95, 1]] }); return; }
  if (st === 'spiky') {
    cap([0.5, 0.0, -0.55], 0.7);
    if (!hatOn) spikes(ctx, { len: 5.5 * hv, w: 4.6, th: 1.9, up: 0.9, curl: 0.3, droop: 0.2 });
    bangs(ctx, { n: 5, len: 0.32, span: 64 * DEG, th: 1.2, ragged: 0.8, wide: 1.1 });
    return;
  }
  if (st === 'pompadour') {
    cap([0.55, 0.0, -0.55], 0.9);
    if (hatOn) return;
    // the quiff: a broad prow swept up from the hairline and out over the brow, grooved, two side rolls beside it
    const yc = P.hc[1], hh = P.hh, fz = faceZ(P, 0.5);
    const grooves = (x, y, z) => Math.abs(((x * 1.1) % 2.2 + 2.2) % 2.2 - 1.1) - 0.18;
    grooves.box = [-20, yc, -30, 20, yc + 40, 40];
    S.paint(fill(look.hair, { rough: 0.35 }), vol(grooves, tone(look.hair, 0.22)), crown(0.14, 0.4), under(0.25, -0.3));
    const prow = [[0, yc + 0.3 * hh, fz - 7], [0, yc + 0.78 * hh + 0.6 * hv, fz - 1.6], [0, yc + 0.86 * hh + 1.4 * hv, fz + 2.8 * hv], [0, yc + 0.74 * hh + 1.0 * hv, fz + 6.4 * hv], [0, yc + 0.56 * hh, fz + 7.6 * hv]];
    lock(S, prow, 15.5, 9.4, { prof: 'hex', out: [0, 1, 0.2], steps: 2, taper: (t) => (t < 0.7 ? 1 - t * 0.2 : 0.86 * Math.sqrt(Math.max(0, (1 - t) / 0.3))) });
    for (const k of [1, -1]) lock(S, [[k * 5.6, yc + 0.35 * hh, fz - 6], [k * 6.6, yc + 0.72 * hh, fz - 3], [k * 5.2, yc + 0.86 * hh + 1, fz + 1.4], [k * 3.2, yc + 0.8 * hh + 1, fz + 4]], 6, 4.6, { prof: 'hex', out: [k * 0.8, 1, 0], steps: 2, taper: (t) => Math.min(1, 0.8 + t) * (1 - t ** 2.2) });
    backLocks(ctx, { n: 5, len: -0.62, th: 1.1, w: 6, flick: 0.2, ragged: 0.03 });
    return;
  }
  if (st === 'rohan') {
    cap([0.55, -0.05, -0.62], 1.2, { puff: 0.15 });
    bangs(ctx, { n: 5, len: 0.2, sweep: -pt * 0.42, fan: 0.12, span: 70 * DEG, th: 1.4, wide: 1.3, sideDrop: -0.2 });
    sideLocks(ctx, { len: -0.45, w: 3.4, a: 24 });
    backLocks(ctx, { n: 7, len: -0.6, th: 1.4, flick: 1.6, w: 5.4 });
    return;
  }
  if (st === 'perm') {
    cap([0.5, -0.2, -0.55], 2.0, { puff: 0.3 });
    spikes(ctx, { len: 2.6, w: 4.4, th: 2.2, up: 0.1, curl: 1.2, droop: 0.6, list: [[90, 0.6, 1], [50, 0.6, 1], [130, 0.6, 1], [10, 0.3, 1], [170, 0.3, 1], [-30, 0.3, 1], [-150, 0.3, 1], [-90, 0.2, 1], [-60, 0.6, 1], [-120, 0.6, 1], [0, 0.0, 0.9], [180, 0.0, 0.9], [-90, -0.3, 0.9]] });
    return;
  }
  if (st === 'messy' || st === 'wild') {
    cap([0.5, -0.05, -0.6], 1.0);
    bangs(ctx, { n: 6, len: 0.22, span: 84 * DEG, th: 1.5, ragged: 1.4, fan: 0.5, wide: 1.2 });
    if (!hatOn) spikes(ctx, { len: st === 'wild' ? 6.5 : 3.6, w: 5, th: 1.8, up: 0.2, curl: 0.9, droop: 0.6, list: [[60, 0.88, 1], [120, 0.88, 1], [20, 0.62, 1], [160, 0.62, 1], [-20, 0.55, 1], [-160, 0.55, 1], [-60, 0.75, 1], [-120, 0.75, 1], [-90, 0.5, 1.1], [-90, 0.9, 1]] });
    sideLocks(ctx, { len: -0.5, w: 3.2, a: 26 });
    backLocks(ctx, { n: 7, len: st === 'wild' ? -1.05 : -0.7, th: st === 'wild' ? 2.2 : 1.6, flick: st === 'wild' ? 2.8 : 1.4, ragged: st === 'wild' ? 0.3 : 0.2, w: st === 'wild' ? 6 : 5 });
    if (st === 'wild' && hatOn) spikes(ctx, { len: 4.5, w: 4.6, th: 1.8, up: -0.2, curl: 1.4, droop: 0.4, list: [[10, 0.2, 1], [170, 0.2, 1], [-20, 0.1, 1], [-160, 0.1, 1], [-60, 0.2, 1.1], [-120, 0.2, 1.1], [-90, 0.0, 1]] });
    return;
  }
  // the rest: a cap, bangs, side locks and the back, by length; tails, a bun, a side ponytail
  const long = st === 'long' || st === 'hime', bob = st === 'bob' || st === 'mushroom' || st === 'bowl';
  const tight = st === 'ponytail' || st === 'twintails' || st === 'pigtails' || st === 'bun' || st === 'sideponytail';
  cap([0.52, -0.02, -0.6], tight ? 0.8 : 1.1 * hv, { puff: bob ? 0.1 : 0 });
  if (st === 'short' || st === 'sidepart') {
    bangs(ctx, { n: 5, len: st === 'sidepart' ? 0.3 : 0.22, sweep: st === 'sidepart' ? pt * 0.4 : pt * 0.12, span: 72 * DEG, th: 1.3, wide: 1.25, ragged: 0.7 });
    sideLocks(ctx, { len: -0.32, w: 3, a: 22, th: 1 });
    backLocks(ctx, { n: 6, len: -0.62, th: 1.2, flick: 0.4, w: 5.4 });
    return;
  }
  const hime = st === 'hime';
  bangs(ctx, hime ? { n: 7, len: 0.1, span: 86 * DEG, th: 1.3, ragged: 0.15, fan: 0, wide: 1.2 } : { n: 6, len: 0.12, span: 82 * DEG, th: 1.35, sweep: (long ? pt * 0.1 : 0), wide: 1.25 });
  if (long) {
    // a solid curtain of hair down the back (grooved, with a pointed hem), locks over the head and at the sides
    const hc = P.hc, hw = P.hw, hb = P.hb, L = (ctx.o.hairLen ?? 15) * hv;
    const grooves = (x, y, z) => { const a = Math.atan2(x, z - hc[2]) * 5.2; return Math.abs(a - Math.round(a)) * 2.6 - 0.22; };
    grooves.box = [-40, -40, -40, 40, hc[1] - 3, 40];
    shell(S, [[hc[1] + 0.05 * P.hh, hw * 1.04, hb * 1.0, hc[2] - 0.6], [P.chin, hw * 0.98, hb * 0.9, hc[2] - 1.6], [P.chin - L * 0.55, hw * 0.88, hb * 0.74, hc[2] - 3], [P.chin - L, hw * 0.78, hb * 0.6, hc[2] - 3.6]], { gap: 1.05, n: 13, th: 1.2, jag: 1.6, col: look.hair, paint: [fill(look.hair, { rough: 0.4 }), vol(grooves, tone(look.hair, 0.16))], lining: tone(look.hair, 0.3) });
    sideLocks(ctx, { n: 1, len: hime ? -1.3 : -1.25, w: 5, th: 1.8, a: 30, flare: hime ? 0.2 : 0.6, fwd: 1.2 });
    backLocks(ctx, { n: 9, len: -0.85, th: 1.8, flick: 0.4, w: 7.4, a0: 6 * DEG, a1: -186 * DEG });
  } else if (bob) {
    sideLocks(ctx, { len: -0.95, w: 4, a: 30, flare: 0.3 });
    backLocks(ctx, { n: 8, len: -0.92, th: 1.6, flick: -0.6, w: 5.6, a0: 0, a1: -180 * DEG });
  } else {
    sideLocks(ctx, { len: st === 'sideponytail' ? -0.8 : -0.75, w: 3.2, a: 28 });
    backLocks(ctx, { n: 6, len: -0.62, th: 1.2, flick: 0.2, w: 5.4 });
    const tie = look.tieCol ?? 0xd83a4a;
    if (st === 'ponytail') tail(ctx, R_(ctx, 0.5, -90 * DEG, 0.8), [0, 0.35, -1], 20 * hv, { n: 5, w: 6, th: 3.8, spread: 2.4, side: [1, 0, 0], swing: ctx.o.swing || [0, 0, -3], tieCol: tie });
    else if (st === 'sideponytail') tail(ctx, R_(ctx, 0.45, pt > 0 ? -20 * DEG : 200 * DEG, 0.6), V.norm([pt * 0.9, 0.4, -0.3]), 18 * hv, { n: 5, w: 6, th: 3.8, spread: 2.4, side: [0, 0, 1], swing: ctx.o.swing || [pt * 4, 0, 0], tieCol: tie });
    else if (st === 'twintails' || st === 'pigtails') for (const s of [1, -1]) tail(ctx, R_(ctx, 0.42, s > 0 ? -6 * DEG : 186 * DEG, 0.7), V.norm([s * 1, 0.45, -0.2]), (st === 'pigtails' ? 9 : 22) * hv, { n: 4, w: 5.4, th: 3.4, spread: 2, side: [0, 0, 1], swing: ctx.o.swing ? [s * ctx.o.swing[0], 0, ctx.o.swing[2]] : [s * 3, 0, -1.5], tieCol: tie });
    else if (st === 'bun') {
      const at = R_(ctx, 0.62, -90 * DEG, 0.6);
      S.paint(...hairPaint(ctx));
      S.lathe([[0, -0.4], [3.4, 0.4], [4.4, 2.6], [3.6, 4.8], [0, 5.6]].map(([r, y]) => [r, y]), { segs: 6, at: [at[0], at[1] - 1.6, at[2] - 2] });
    }
  }
}

// ------------------------------------------------------------------ hats and glasses (src/people/hair.js hats)
function buildHat(ctx) {
  const { S, P, look } = ctx, H = look.hat;
  if (!H) return;
  const angs = ctx.headAngs, c = H.col, c2 = H.col2 ?? tone(c, 0.2);
  const band = (v0, v1, g0, g1, slant = 0) => [v0, v1].map((v, k) => angs.map((a) => { const s = Math.sin(a); return headPt(P, v + slant * s, a, k ? g1 : g0); }));
  if (H.kind === 'headband') {
    S.paint(fill(c, { rough: 0.5 }), ...(typeof ctx.o.bandPaint === 'function' ? ctx.o.bandPaint(ctx) : ctx.o.bandPaint || []), under(0.2));
    const hg = ctx.hairTh ?? 1.2;
    S.loft(band(0.34, 0.52, hg + 0.7, hg + 0.75, 0.06), { caps: 'none' });
    return;
  }
  if (H.kind === 'flatcap' || H.kind === 'cap' || H.kind === 'hardhat') {
    // the crown: lofted over the skull, a little forward and flatter for a flat cap; then the visor
    const flat = H.kind === 'flatcap', hard = H.kind === 'hardhat';
    const rows = [[0.28, 1.4, 0], [0.5, 2.0, 0.5], [0.72, 2.0, flat ? 1.6 : 0.6], [0.88, flat ? 1.1 : 1.7, flat ? 2.3 : 0.4], [0.97, flat ? 0.2 : 1.0, flat ? 2.4 : 0.2], [1, -2, 1.4]];
    S.paint(fill(c, { rough: hard ? 0.3 : 0.7 }), ...(flat ? [proj('top', or(...[-4, 0, 4].map((x) => seg(x, -8, x * 0.6, 8, 0.25))), tone(c, 0.1))] : [proj('top', seg(0, -12, 0, 12, 0.35), tone(c, 0.18))]), proj('front', rbox(0, P.hc[1] + P.hh * 0.62, 2.4, 1.5, 0.5), H.kind === 'cap' && H.col2 ? H.col2 : c), under(0.18), crown(0.06));
    S.loft(rows.map(([v, g, dz]) => angs.map((a) => { const p = headPt(P, Math.min(v, 1), a, g + (hard ? 0.6 : 0)); const s = Math.max(0, Math.sin(a)); return [p[0] * (v > 0.95 ? 0.85 : 1), p[1] + (v > 0.95 ? 1.2 : 0) - (flat ? s * (v - 0.28) * 1.6 : 0), p[2] + dz * (0.4 + 0.6 * s)]; })), { caps: 'both' });
    // the visor: a curved plate out of the front of the band
    S.paint(fill(c2, { rough: 0.6 }), under(0.3));
    const vy = P.hc[1] + P.hh * 0.3, vz = faceZ(P, 0.3, 1.2), L = flat ? 3.6 : hard ? 3 : 7, W = flat ? 9.4 : 9;
    const rowsV = [0, 0.5, 1].map((t) => [-1, -0.6, 0, 0.6, 1].map((u) => [u * W * (1 - t * 0.12) * (1 - (t * u * u) * 0.25), vy - t * L * (flat ? 0.5 : 0.28) - u * u * 0.8, vz + t * L - u * u * 2.2 * (1 - t * 0.5)]));
    for (const [d, f] of [[0, 1], [-0.6, -1]]) S.grid(rowsV.map((r) => r.map((p) => [p[0], p[1] + d, p[2]])), { hint: [0, f, 0] });
    if (hard) { S.paint(fill(c, { rough: 0.3 }), under(0.2)); S.loft([0.2, 0.26].map((v, k) => angs.map((a) => headPt(P, v, a, 2.6 - k * 0.4))), { caps: 'both' }); }
    return;
  }
  if (H.kind === 'schoolhat' || H.kind === 'bucket' || H.kind === 'sunhat') {
    const brim = H.kind === 'sunhat' ? 7 : H.kind === 'schoolhat' ? 4.6 : 3.6;
    S.paint(fill(c, { rough: 0.7 }), vol(band(P.hc[1] + P.hh * 0.38, P.hc[1] + P.hh * 0.56), c2), under(0.18));
    S.loft([[0.3, 1.4], [0.6, 1.9], [0.86, 1.6], [0.98, 0.6], [1, -3]].map(([v, g]) => angs.map((a) => { const p = headPt(P, Math.min(v, 1), a, g); return [p[0], p[1] + (v > 0.97 ? 1.6 : 0), p[2]]; })), { caps: 'both' });
    S.paint(fill(c, { rough: 0.7 }), under(0.25));
    const r0 = angs.map((a) => headPt(P, 0.3, a, 1.2)), r1 = r0.map((p) => { const d = V.norm([p[0], 0, p[2] - P.hc[2]]); return [p[0] + d[0] * brim, p[1] - brim * 0.18, p[2] + d[2] * brim]; });
    S.loft([r0.map((p) => [p[0], p[1] + 0.5, p[2]]), r1.map((p) => [p[0], p[1] + 0.4, p[2]]), r1, r0], { caps: 'none' });
  }
}
function buildGlasses(ctx) {
  const { S, P, look } = ctx, G = look.glasses;
  if (!G) return;
  const ey = P.eyeY, z = faceZ(P, (ey - P.hc[1]) / P.hh) + 0.8, th = 0.3 * (G.thick || 1), rr = G.kind === 'round' ? 3.3 : 3.1;
  S.paint(fill(G.col, { rough: 0.35 }), under(0.2));
  for (const s of [1, -1]) {
    const cx = s * P.eyeX;
    const path = Array.from({ length: 13 }, (_, k) => { const a = k / 12 * Math.PI * 2; return G.kind === 'round' ? [cx + Math.cos(a) * rr, ey + Math.sin(a) * rr * 0.96, z] : [cx + se(Math.cos(a), 5) * rr * 1.05, ey + se(Math.sin(a), 5) * rr * 0.8, z]; });
    S.tube(path, th, { sides: 4, caps: false });
    S.tube([[cx + s * rr, ey + 0.4, z], [cx + s * (rr + 1.6), ey + 0.8, z - 3], [s * P.hw * 0.86, ey + 1.2, P.hc[2] - 2]], th * 0.8, { sides: 4 });
  }
  S.tube([[P.eyeX - rr, ey + 0.5, z], [0, ey + 1.0, z + 0.3], [-P.eyeX + rr, ey + 0.5, z]], th * 0.8, { sides: 4 });
  if (G.kind === 'sun') { S.paint(fill(0x2a2a34, { rough: 0.15 })); for (const s of [1, -1]) S.at([s * P.eyeX, ey, z - 0.1], [Math.PI / 2, 0, 0], () => S.cyl([0, -0.15, 0], rr - th, 0.3, { segs: 10 })); }
}

// ------------------------------------------------------------------ the body: torso, pelvis, skirt, limbs, hands, shoes
const sec = (y, hx, hz, cz = 0, n = 8, pow = 2.6) => {
  n = Math.max(6, Math.round(n * QUAL.k));
  const out = [], e = 2 / pow, off = Math.PI / 2 - Math.PI / n;
  for (let i = 0; i < n; i++) { const a = off + (i / n) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); out.push([Math.sign(c) * Math.abs(c) ** e * hx, y, cz + Math.sign(s) * Math.abs(s) ** e * hz]); }
  return out;
};
/** What the top covers and how: sleeves, hem, colours (the people kit's garment kinds). */
function topInfo(look) {
  const t = look.top, k = t.kind;
  const sl = t.sleeve || ({ tee: 'short', aloha: 'short', polo: 'short', bodysuit: 'long' }[k] || 'long');
  const tucked = t.tuck ?? ['blouse', 'shirt', 'polo', 'suit', 'bodysuit'].includes(k);
  const long = ['suit', 'blazer', 'jacket', 'gakuran', 'cardigan', 'workjacket', 'coat', 'wrap'].includes(k);
  return { kind: k, col: t.col, sleeve: t.crop ? 'short' : sl, tucked: tucked && !long, long, crop: !!t.crop, open: !!t.open };
}
function torsoLayers(ctx, ti) {
  const { P, look } = ctx, t = look.top, c = t.col, k = ti.kind, L = [fill(c, { rough: 0.62 })], y0 = P.neckBase, yb = P.bustY, zf = P.chestZ + 2;
  const fr = (shape, col, o) => L.push(proj('front', shape, col, { near: 0, ...o }));
  const shirt = t.shirt ?? 0xf2f0ea;
  const V_ = (w, bot) => poly([[-w, y0 + 0.6], [w, y0 + 0.6], [0, bot]]);
  if (k === 'suit' || k === 'blazer' || k === 'jacket' || k === 'coat') {
    fr(V_(2.2, yb - 1.4), shirt);
    if (t.tie) { fr(poly([[-0.5, y0 - 0.2], [0.5, y0 - 0.2], [0.75, yb - 2.2], [0, yb - 3.2], [-0.75, yb - 2.2]]), t.tie); fr(rbox(0, y0 - 0.2, 0.6, 0.45, 0.2), tone(t.tie, 0.15)); }
    fr(or(seg(-2.2, y0 + 0.6, 0, yb - 1.4, 0.35), seg(2.2, y0 + 0.6, 0, yb - 1.4, 0.35)), tone(c, 0.3));
    fr(seg(0, yb - 1.4, 0, P.pelvisY - 1, 0.25), tone(c, 0.25));
    fr(or(circle(0.6, yb - 2.6, 0.3), circle(0.6, P.waistY, 0.3)), tone(c, 0.4));
  } else if (k === 'cardigan') {
    fr(V_(1.8, yb - 1.8), shirt);
    fr(or(seg(-1.8, y0 + 0.6, 0, yb - 1.8, 0.3), seg(1.8, y0 + 0.6, 0, yb - 1.8, 0.3), seg(0, yb - 1.8, 0, P.pelvisY - 1, 0.3)), tint(c, 0.12));
    fr(or(...[0, 1, 2].map((i) => circle(0.5, yb - 2.8 - i * 1.6, 0.32))), 0xe8dcc0);
    L.push(vol(below(P.pelvisY - 0.2), tone(c, 0.1)));
    if (t.pattern === 'floral') fr(and(repeatU(repeatV(circle(0, 0, 0.35), 2.4), 2.4), halfBelow(yb - 0.5)), tint(c, 0.35));
  } else if (k === 'gakuran') {
    if (ti.open) { fr(rbox(0, (yb + P.waistY) / 2, 2.6, 6, 0.3), t.inner ?? 0xd8a838); fr(or(seg(-2.6, y0, -2.6, P.pelvisY - 1, 0.3), seg(2.6, y0, 2.6, P.pelvisY - 1, 0.3)), tone(c, 0.35)); }
    else { fr(seg(0, y0, 0, P.pelvisY - 1, 0.22), tone(c, 0.4)); }
    L.push(vol(below(P.pelvisY - 0.3), tone(c, 0.12)));
  } else if (k === 'sailor') {
    const col = t.collar ?? 0x22283e;
    fr(poly([[-3.6, y0 + 0.8], [3.6, y0 + 0.8], [0, yb - 2.2]]), col);
    fr(and(stroke(poly([[-3.6, y0 + 0.8], [3.6, y0 + 0.8], [0, yb - 2.2]]), 0.3, 0.45), halfBelow(y0 + 0.4)), t.stripe);
    fr(poly([[-1.6, y0 + 0.8], [1.6, y0 + 0.8], [0, yb - 0.6]]), c);
  } else if (k === 'polo' || k === 'shirt' || k === 'blouse' || k === 'workjacket' || k === 'aloha') {
    fr(seg(0, y0, 0, yb - (k === 'polo' ? 1 : -1 + P.bustY - P.pelvisY), 0.24), tone(c, 0.22));
    fr(or(...[0, 1, 2].map((i) => circle(0.45, y0 - 0.8 - i * 1.5, 0.22))), k === 'workjacket' ? tone(c, 0.35) : tint(c, 0.5));
    if (t.band) L.push(vol(band(P.bustY - 0.6, P.bustY + 0.6), t.band));
    if (k === 'workjacket') fr(pair(rbox(2.3, yb - 0.2, 1.3, 1.1, 0.2)), tone(c, 0.12));
    if (k === 'aloha') fr(or(...[[-2.6, yb], [2, yb + 2], [-1, P.waistY + 1], [2.8, P.waistY - 1], [0.5, yb - 3]].map(([x, y]) => or(...[0, 1, 2, 3, 4].map((q) => circle(x + Math.cos(q * 1.257) * 0.7, y + Math.sin(q * 1.257) * 0.7, 0.55))))), t.col2 ?? 0xf0f0e8);
    if (t.vest) L.push(vol(band(P.waistY - 2, P.shoulderY - 0.4), t.vest, {}));
    if (t.open) { fr(rbox(0, (yb + P.waistY) / 2, 1.8, 6, 0.3), t.inner ?? 0xf0f0ea); }
  } else if (k === 'flannel') {
    const c2 = t.col2 ?? 0x1e1e22;
    L.push(proj('front', or(repeatU(rbox(0, 0, 0.35, 50, 0), 2.2), repeatV(rbox(0, 0, 50, 0.35, 0), 2.2)), c2, { alpha: 0.75 }), proj('back', or(repeatU(rbox(0, 0, 0.35, 50, 0), 2.2), repeatV(rbox(0, 0, 50, 0.35, 0), 2.2)), c2, { alpha: 0.75 }));
  } else if (k === 'tee' || k === 'knit') {
    const p2 = t.col2 ?? 0xf0f0ec, py = (yb + P.waistY) / 2 + 0.4;
    if (t.print === 'star') fr(star(0, py, 2.4, 5, 0.45), p2);
    else if (t.print === 'heart') fr(or(circle(-0.8, py + 0.5, 1.05), circle(0.8, py + 0.5, 1.05), poly([[-1.8, py + 0.2], [1.8, py + 0.2], [0, py - 1.9]])), p2);
    else if (t.print === 'circle') fr(circle(0, py, 1.9), p2);
    else if (t.print === 'stripes' || t.print === 'border') L.push(vol((x, y) => Math.abs(((y % 1.6) + 1.6) % 1.6 - 0.8) - 0.35, p2));
    if (k === 'knit') L.push(proj('front', and(repeatU(rbox(0, 0, 0.14, 40, 0), 0.9), halfAbove(-100)), tone(c, 0.08)));
    fr(arc(0, y0 + 0.4, 1.7, Math.PI * 1.1, Math.PI * 1.9, 0.4), tone(c, 0.18));
  } else if (k === 'wrap') {
    const c2 = t.col2 ?? tone(c, 0.3);
    fr(or(poly([[-1.6, y0 + 0.8], [-0.2, y0 + 0.8], [2.6, P.waistY - 0.5], [1.4, P.waistY - 0.5]]), seg(-1.8, y0 + 0.8, 2.4, P.waistY - 0.6, 0.3)), c2);
    fr(seg(1.8, y0 + 0.8, 0, yb - 1.6, 0.4), c2);
  } else if (k === 'bodysuit') {
    const c2 = t.col2 ?? 0x2a2a34, c3 = t.col3 ?? tint(c, 0.3);
    fr(or(poly([[-4.6, yb - 0.6], [-1.4, yb - 2.6], [1.4, yb - 2.6], [4.6, yb - 0.6], [4.6, yb - 1.6], [1.6, P.waistY - 1.6], [-1.6, P.waistY - 1.6], [-4.6, yb - 1.6]])), c2);
    fr(rbox(0, yb + 0.6, 1.1, 0.8, 0.3), c3);
    L.push(proj('back', rbox(0, yb, 2.6, 3.4, 0.6), c2));
  }
  return L;
}
function buildTorso(ctx) {
  const { S, P, look } = ctx, ti = ctx.ti, b = P.belly, bu = P.bust;
  const yLow = ti.crop ? P.bustY - 1.4 : ti.tucked ? P.waistY - 0.6 : P.pelvisY - 0.2 - (ti.long ? 1.4 : 0);
  const hemX = ti.tucked ? P.waistX * 0.98 : P.hipsX * 1.1 + 0.2, hemZ = ti.tucked ? P.waistZ * 0.98 : P.hipsZ * 1.1 + 0.2 + b * 0.4;
  const rows = [
    sec(yLow, hemX, hemZ, b * 0.2),
    sec(Math.max(yLow + 0.8, P.waistY + 0.4), Math.max(P.waistX, ti.tucked ? 0 : hemX * 0.94), Math.max(P.waistZ + b * 0.6, ti.tucked ? 0 : hemZ * 0.95), b * 0.4),
    sec(P.bustY - 0.6, P.chestX * 0.98, P.chestZ + bu * 0.7 + b * 0.3, bu * 0.4 + b * 0.2),
    sec(P.bustY + 0.9, P.chestX, P.chestZ * 0.98 + bu * 0.4, bu * 0.2),
    sec(P.shoulderY - 0.4, P.chestX * 0.98, P.chestZ * 0.9),
    sec(P.shoulderY + 0.55, P.chestX * 0.74, P.chestZ * 0.76, -0.1),
    sec(P.neckBase + 0.1, P.neckR * 1.45, P.chestZ * 0.48, -0.25),
  ].filter((r) => r[0][1] >= yLow - 1e-6).sort((a, c) => a[0][1] - c[0][1]);
  if (ti.crop) rows.splice(1, 1);
  S.paint(...torsoLayers(ctx, ti), ...(typeof ctx.o.torsoPaint === 'function' ? ctx.o.torsoPaint(ctx) : ctx.o.torsoPaint || []), under(0.16, -0.45), crown(0.05));
  S.loft(rows);
  if (ti.crop) { // the bare midriff under a cropped top
    S.paint(fill(look.skin, { rough: 0.5 }), proj('front', seg(0, P.waistY - 0.4, 0, P.waistY + 0.4, 0.25), tone(look.skin, 0.2)), under(0.12));
    S.loft([sec(P.waistY - 0.8, P.waistX * 0.97, P.waistZ * 0.97), sec(P.bustY - 1.2, P.chestX * 0.95, P.chestZ * 0.95)]);
  }
  // collars
  const t = look.top, c = t.col, k = ti.kind;
  if (k === 'gakuran' || k === 'bodysuit' || t.highCollar) { // a standing collar
    S.paint(fill(k === 'bodysuit' ? (t.col2 ?? c) : c, { rough: 0.55 }), under(0.2), crown(0.1));
    S.loft([sec(P.neckBase - 0.4, P.neckR * 1.55, P.neckR * 1.5, -0.25), sec(P.neckBase + 1.3, P.neckR * 1.5, P.neckR * 1.42, -0.2)]);
    if (k === 'gakuran' && !ti.open) { S.paint(fill(0xe8c050, { rough: 0.25 })); for (let i = 0; i < 4; i++) { const y = P.neckBase - 1.4 - i * ((P.neckBase - P.pelvisY) / 4.2); const z = (y > P.bustY ? P.chestZ * 0.95 : P.waistZ + P.belly * 0.5) + 0.05; S.at([0, y, z], [Math.PI / 2, 0, 0], () => S.cyl([0, 0, 0], 0.42, 0.35, { segs: 6, bevel: 0.1 })); } }
  } else if (k === 'shirt' || k === 'polo' || k === 'blouse' || k === 'workjacket' || k === 'aloha' || k === 'suit' || k === 'blazer' || k === 'jacket' || k === 'coat' || (k === 'cardigan' && t.shirt)) {
    // collar points either side of the neck
    const cc = ['suit', 'blazer', 'jacket', 'cardigan'].includes(k) ? (t.shirt ?? 0xf2f0ea) : c;
    S.paint(fill(cc, { rough: 0.55 }), under(0.2));
    for (const s of [1, -1]) S.emit([[[s * 0.3, P.neckBase + 0.5, P.chestZ * 0.62], [s * 1.9, P.neckBase + 0.3, P.chestZ * 0.48], [s * 1.2, P.neckBase - 1.4, P.chestZ * 0.9 + 0.3]], [[s * 1.9, P.neckBase + 0.3, P.chestZ * 0.48], [s * 1.2, P.neckBase - 1.4, P.chestZ * 0.9 + 0.3], [s * 2.4, P.neckBase - 0.4, P.chestZ * 0.6]]], [0, 0.3, 1]);
  } else if (k === 'sailor') { // the square flap of a sailor collar on the back
    const col = t.collar ?? 0x22283e;
    S.paint(fill(col, { rough: 0.6 }), proj('back', stroke(rbox(0, P.shoulderY - 2.3, 4.6, 2.8, 0.2), 0.3, 0.55), t.stripe), under(0.2));
    S.at([0, P.shoulderY + 0.6, -P.chestZ * 0.7], [-0.14, 0, 0], () => S.box(-4.9, -5.6, -0.5, 4.9, 0.4, 0, { bevel: 0.15 }));
    // the scarf, tied in a bow at the V
    if (t.scarf) { S.paint(fill(t.scarf, { rough: 0.45 }), under(0.2)); bow(S, [0, P.bustY - 1.6, P.chestZ + P.bust * 0.7 + 0.3], 1.6); }
  } else if (k === 'wrap') {
    S.paint(fill(t.col2 ?? tone(c, 0.3), { rough: 0.55 }), under(0.2));
    S.loft([sec(P.neckBase - 0.6, P.neckR * 1.8, P.neckR * 1.7, 0), sec(P.neckBase + 0.4, P.neckR * 1.6, P.neckR * 1.55, -0.1)]);
  }
}
/** A ribbon bow at c facing +z, r wide: two flattened loops, two tails and a knot. */
export function bow(S, c, r, o = {}) {
  S.at(c, o.rot || null, () => {
    for (const s of [1, -1]) {
      lock(S, [[0, 0, 0.2], [s * r * 0.6, r * 0.55, 0], [s * r * 1.15, r * 0.25, -0.2], [s * r * 1.05, -r * 0.35, -0.1]], r * 1.05, r * 0.55, { prof: 'diamond', out: [0, 0, 1], steps: 2, taper: (t) => Math.min(1, 0.4 + 2 * t) * (1 - t ** 3) });
      lock(S, [[s * 0.1, -0.2, 0.1], [s * r * 0.35, -r * 0.8, 0.2], [s * r * 0.7, -r * (o.tails ?? 1.5), 0]], r * 0.7, r * 0.35, { prof: 'diamond', out: [0, 0, 1], steps: 2 });
    }
    S.box(-r * 0.28, -r * 0.3, -0.25, r * 0.28, r * 0.3, 0.45, { bevel: 0.12 });
  });
}
function buildPelvis(ctx) {
  const { S, P, look } = ctx, B = look.bottom, c = B.col, b = P.belly;
  const L = [fill(c, { rough: 0.62 })];
  if (B.belt) { L.push(vol(band(P.waistY - 0.25, P.waistY + 0.75), B.belt)); L.push(proj('front', rbox(0, P.waistY + 0.25, 0.75, 0.55, 0.15), 0xc8b070, { near: 0 })); }
  if (B.kind === 'jeans' || B.kind === 'cargo') L.push(proj('front', or(arc(-P.hipsX * 0.9, P.waistY + 0.2, 1.8, Math.PI * 1.55, Math.PI * 1.98, 0.22), arc(P.hipsX * 0.9, P.waistY + 0.2, 1.8, Math.PI * 1.02, Math.PI * 1.45, 0.22)), tone(c, 0.25), { near: 0 }));
  L.push(proj('front', seg(0, P.waistY - 0.4, 0, P.crotchY + 0.4, 0.2), tone(c, 0.22), { near: 0 }));
  S.paint(...L, ...(typeof ctx.o.pelvisPaint === 'function' ? ctx.o.pelvisPaint(ctx) : ctx.o.pelvisPaint || []), under(0.2, -0.4));
  S.loft([sec(P.crotchY - 0.4, P.hipsX * 0.42, P.hipsZ * 0.55), sec(P.crotchY + 0.5, P.hipsX * 0.86, P.hipsZ * 0.92), sec(P.hipY + 0.3, P.hipsX, P.hipsZ + b * 0.3), sec(P.pelvisY, P.hipsX * 0.97, P.hipsZ * 0.97 + b * 0.5, b * 0.3), sec(P.waistY + 0.8, P.waistX * 1.04, P.waistZ * 1.04 + b * 0.6, b * 0.4)]);
}
/** A skirt (pleated: crisp zig-zag pleats), from the waist to the hem; long: to mid-calf. */
function buildSkirt(ctx) {
  const { S, P, look } = ctx, B = look.bottom, cutK = B.cut || 'pleated', c = B.col;
  const hemY = cutK === 'mini' ? P.hipY - 2.2 : cutK === 'long' ? P.kneeY - 3.6 : cutK === 'hakama' ? P.ankleY + 0.6 : cutK === 'pencil' ? P.kneeY + 0.8 : P.kneeY + 2.2;
  const flare = cutK === 'pencil' ? 1.05 : cutK === 'long' ? 1.25 : cutK === 'hakama' ? 1.45 : 1.55, pleats = cutK === 'pencil' ? 0 : cutK === 'long' ? 6 : 9;
  const n = pleats ? pleats * 2 : 10, pr = (y, rx, rz, depth) => Array.from({ length: n }, (_, i) => { const a = Math.PI / 2 - Math.PI / n + (i / n) * Math.PI * 2, k = pleats && i % 2 ? 1 - depth : 1; return [Math.cos(a) * rx * k, y, Math.sin(a) * rz * k]; });
  const L = [fill(c, { rough: 0.62 }), under(0.2, -0.3)];
  if (B.plaid) L.push(vol((x, y, z) => Math.min(Math.abs(((y % 1.8) + 1.8) % 1.8 - 0.9) - 0.12, Math.abs(((x + z + 40) % 1.8) - 0.9) - 0.12), B.plaid));
  if (B.hem) L.push(vol(below(hemY + 0.7), B.hem));
  S.paint(...L, ...(typeof ctx.o.skirtPaint === 'function' ? ctx.o.skirtPaint(ctx) : ctx.o.skirtPaint || []));
  const top = P.waistY + 0.9, rows = [pr(top, P.waistX * 1.08, P.waistZ * 1.1, 0), pr(P.hipY + 0.4, P.hipsX * 1.12, P.hipsZ * 1.16, 0.06), pr(hemY + (top - hemY) * 0.25, P.hipsX * flare * 0.96, P.hipsZ * flare * 1.0, 0.12), pr(hemY, P.hipsX * flare, P.hipsZ * flare * 1.04, 0.14)];
  S.loft(rows, { caps: 'start' });
  // the inside of the hem (so the skirt has a thickness to it)
  S.paint(fill(tone(c, 0.35), { rough: 0.7 }));
  const inner = (r) => r.map((p) => [p[0] * 0.9, p[1], p[2] * 0.9]);
  S.grid([rows[3], inner(rows[3]), inner(rows[2])], { closedU: true, hint: [0, -1, 0] });
  return hemY;
}
/**
 * An open-fronted shell of cloth round the body (coat tails, a cape over the shoulders): rows [y, rx, rz, cz, back]
 * (back: how far that row swings out behind, mm), split at the front by `gap` radians either side; an outer face, a
 * lining (o.lining) and its edges. Built in the frame you are in.
 */
export function shell(S, rows, o = {}) {
  const n = Math.max(8, Math.round((o.n ?? 12) * QUAL.k)), gap = o.gap ?? 0.25, th = o.th ?? 0.45;
  const ring = ([y, rx, rz, cz = 0, back = 0], d = 0) => Array.from({ length: n + 1 }, (_, i) => {
    const a = Math.PI / 2 + gap + (i / n) * (Math.PI * 2 - 2 * gap), c = Math.cos(a), sn = Math.sin(a);
    return [c * (rx - d), y, cz + sn * (rz - d) - Math.max(0, -sn) * back];
  });
  const jag = (rs) => { if (o.jag) rs[rs.length - 1] = rs[rs.length - 1].map((p, i) => [p[0], p[1] + (i % 2 ? o.jag : -o.jag), p[2]]); return rs; };
  const out = jag(rows.map((r) => ring(r))), inn = jag(rows.map((r) => ring(r, th)));
  const ctr = (q) => q.reduce((a, p) => [a[0] + p[0] / q.length, a[1], a[2] + p[2] / q.length], [0, 0, 0]);
  S.paint(...[o.paint || fill(o.col ?? 0x3a3a44, { rough: 0.6 })].flat(), under(0.2, -0.3), crown(0.05));
  S.grid(out, { hint: (q) => { const c = ctr(q); return [c[0], 0, c[2] - (rows[0][3] || 0)]; } });
  S.paint(fill(o.lining ?? tone(o.col ?? 0x3a3a44, 0.35), { rough: 0.7 }));
  S.grid(inn, { hint: (q) => { const c = ctr(q); return [-c[0], 0, -(c[2] - (rows[0][3] || 0))]; } });
  const edges = [];
  for (let j = 0; j + 1 < rows.length; j++) for (const i of [0, n]) edges.push({ pts: [out[j][i], out[j + 1][i], inn[j + 1][i], inn[j][i]], hint: i ? [1, 0, 0.3] : [-1, 0, 0.3] });
  const last = rows.length - 1;
  for (let i = 0; i < n; i++) edges.push({ pts: [out[last][i], out[last][i + 1], inn[last][i + 1], inn[last][i]], hint: [0, -1, 0] });
  S.paint(fill(o.edge ?? tone(o.col ?? 0x3a3a44, 0.2), { rough: 0.6 }));
  S.emit(edges);
}
/** The long skirts of a coat from the waist (a delinquent's chōran, a trench coat): len 0..1 of the way to the knee. */
export function coatTails(ctx, o = {}) {
  const { S, P, look } = ctx, hem = lerp(P.hipY, P.kneeY, o.len ?? 0.8) - (o.extra ?? 0), k = o.flare ?? 1.3, b = o.back ?? 0;
  ctx.in('hips', () => shell(S, [[P.waistY + 0.6, P.waistX * 1.12 + 0.3, P.waistZ * 1.14 + 0.3], [P.hipY + 0.2, P.hipsX * 1.14 + 0.3, P.hipsZ * 1.2 + 0.3, 0, b * 0.15], [lerp(P.hipY, hem, 0.55), P.hipsX * (1 + (k - 1) * 0.6) + 0.4, P.hipsZ * (1 + (k - 1) * 0.6) + 0.5, 0, b * 0.55], [hem, P.hipsX * k + 0.5, P.hipsZ * k + 0.6, 0, b]], { col: o.col ?? look.top.col, lining: o.lining, gap: o.gap ?? 0.2, paint: o.paint }));
}
/** A limb swept through posed joints: points (figure space), radii (along it), sides. */
const limb = (S, pts, radii, sides = 7, caps = true) => S.tube(spline(pts, 3), radii, { sides, caps });
function buildArm(ctx, s) {
  const { S, P, J, M, look } = ctx, A = s > 0 ? 'L' : 'R', ja = J['arm' + A], je = J['fore' + A], jw = J['hand' + A], ma = M['arm' + A], mf = M['fore' + A];
  const pts = [app(ma, [ja[0] - s * 1.3, ja[1] + 0.5, ja[2]]), app(ma, [ja[0] + s * 0.1, ja[1] - 0.6, ja[2]]), app(ma, je), app(mf, L3(je, jw, 0.5)), app(mf, jw)];
  const path = spline(pts, 3), R = P.armR, ti = ctx.ti, sk = look.skin, t = look.top;
  const slv = ctx.o.sleeve || ti.sleeve, sc = ctx.o.sleeveCol ?? (t.kind === 'sailor' ? t.col : t.col);
  const f = slv === 'none' ? 0 : slv === 'short' ? 0.3 : slv === 'elbow' ? 0.52 : 0.93;
  if (f < 0.93) { S.paint(fill(sk, { rough: 0.5 }), under(0.12)); S.tube(cutPath(path, Math.max(0, f - 0.08), 1), [R * 0.98, R * 0.9, R * 0.8], { sides: 7 }); }
  if (f > 0) {
    const wide = slv === 'wide', cuffC = ctx.o.cuffCol ?? (t.kind === 'sailor' ? (t.collar ?? 0x22283e) : null);
    S.paint(fill(sc, { rough: 0.62 }), under(0.2, -0.3), crown(0.05));
    const sp = cutPath(path, 0, f), r0 = R + 0.45, r1 = wide ? R + 2.4 : slv === 'short' ? R + 0.75 : R + 0.35;
    S.tube(sp, wide ? [R + 0.5, R + 0.9, r1] : [r0 + 0.25, r0, r1], { sides: 7 });
    if (cuffC || slv === 'long') { const cp = cutPath(path, f - 0.07, f + 0.005); S.paint(fill(cuffC ?? tone(sc, 0.08), { rough: 0.6 }), under(0.2)); S.tube(cp, r1 + 0.12, { sides: 7 }); }
    if (wide) { // the hanging pocket of a kimono sleeve
      const e = path[path.length - 1];
      S.paint(fill(sc, { rough: 0.6 }), under(0.2));
      S.tube([L3(cutPath(path, 0.55, 0.56)[0], e, 0), V.add(L3(cutPath(path, 0.55, 0.56)[0], e, 0.6), [0, -3.4, -0.6]), V.add(e, [0, -2.6, -0.4])], 1.9, { sides: 6, flat: [0.45, 1] });
    }
  }
  if (slv === 'long' && ctx.o.cuffShirt !== false && ['suit', 'blazer', 'jacket', 'coat'].includes(ti.kind)) { S.paint(fill(t.shirt ?? 0xf2f0ea)); S.tube(cutPath(path, 0.93, 0.99), R * 0.95, { sides: 7 }); }
}
// hands, in the hand bone's frame (left; the right is built mirrored): fingers down -y, the back of the hand +x, the thumb +z
const HAND = {
  fist(S) { S.box(-0.8, -2.0, -1.15, 0.75, 0.3, 1.15, { bevel: 0.4 }); S.box(-1.25, -2.9, -1.2, 0.55, -1.25, 1.2, { bevel: 0.5 }); S.at([-0.35, -1.5, 1.05], [0.3, 0, 0.2], () => S.box(-0.45, -0.9, -0.3, 0.35, 0.6, 0.45, { bevel: 0.2 })); },
  open(S) { S.box(-0.55, -2.0, -1.2, 0.55, 0.3, 1.2, { bevel: 0.3 }); S.box(-0.5, -3.7, -1.15, 0.45, -1.8, 1.1, { bevel: 0.3 }); S.at([0, -1.4, 1.1], [0.7, 0, 0], () => S.box(-0.4, -1.6, -0.35, 0.35, 0.2, 0.35, { bevel: 0.15 })); },
  point(S) { HAND.fist(S); S.box(-0.6, -4.3, 0.45, 0.2, -2.4, 1.15, { bevel: 0.25 }); },
  peace(S) { HAND.fist(S); S.at([-0.2, -2.4, 0.75], [0.25, 0, 0], () => S.box(-0.38, -2.0, -0.35, 0.38, 0.2, 0.32, { bevel: 0.2 })); S.at([-0.2, -2.4, 0.0], [-0.25, 0, 0], () => S.box(-0.38, -2.0, -0.35, 0.38, 0.2, 0.32, { bevel: 0.2 })); },
  grip(S) { HAND.fist(S); },
  flat(S) { HAND.open(S); },
};
function buildHand(ctx, s) {
  const { S, P, J, M, look, pose } = ctx, A = s > 0 ? 'L' : 'R', jw = J['hand' + A], jf = J['fore' + A];
  const d = V.sub(jw, jf), a = Math.atan2(d[0], -d[1]), kind = pose.hands?.[A] || (ctx.o.props || []).some((p) => p.hand === A) && 'grip' || 'fist';
  if (kind === 'none') return;
  const glove = ctx.o.gloves;
  S.paint(fill(glove ?? look.skin, { rough: 0.5 }), under(0.15));
  S.push(M['hand' + A]);
  S.at(jw, [0, 0, a], () => { S.push(new THREE.Matrix4().makeScale(s, 1, 1)); try { (HAND[kind] || HAND.fist)(S); } finally { S.pop(); } }, 0.9);
  S.pop();
}
/** Build fn in the fist of hand 'L' | 'R' (the grip's origin; local +y points out of the fist, +x out of the back of the hand). */
function hold(ctx, side, fn, o = {}) {
  const { S, J, M } = ctx, s = side === 'L' ? 1 : -1, jw = J['hand' + side], jf = J['fore' + side], d = V.sub(jw, jf), a = Math.atan2(d[0], -d[1]);
  S.push(M['hand' + side]);
  try { S.at(jw, [0, 0, a], () => S.at([-s * 0.25, -1.65, 0.1], [Math.PI / 2, 0, 0], () => S.at(o.at || [0, 0, 0], o.rot || null, () => fn(S, ctx)))); } finally { S.pop(); }
}
function buildLeg(ctx, s) {
  const { S, P, J, M, look } = ctx, A = s > 0 ? 'L' : 'R', jt = J['thigh' + A], jk = J['shin' + A], ja = J['foot' + A], mt = M['thigh' + A], ms = M['shin' + A];
  const pts = [app(mt, [jt[0] * 0.7, jt[1] + 1.8, jt[2]]), app(mt, jt), app(mt, jk), app(ms, L3(jk, ja, 0.5)), app(ms, ja), app(M['foot' + A], [ja[0], ja[1] - 0.8, ja[2] + 0.2])];
  const path = spline(pts, 3), R = P.thighR, B = look.bottom, k = B.kind, lg = look.legs, sk = look.skin;
  const radii = [R * 0.95, R, R * 0.9, R * 0.78, R * 0.8, R * 0.62, R * 0.58];
  const trousers = ['slacks', 'jeans', 'cargo', 'tobi', 'bodysuit', 'hakama'].includes(k) && !ctx.o.bareLegs;
  const shorts = k === 'shorts' ? 0.36 : 0;
  if (!trousers) {
    const legC = lg === 'tights' ? (look.tights ?? 0x3a3236) : sk;
    S.paint(fill(legC, { rough: lg === 'tights' ? 0.4 : 0.5 }), under(0.14));
    S.tube(path, radii, { sides: 7 });
    if (shorts) { S.paint(fill(B.col, { rough: 0.62 }), under(0.2)); S.tube(cutPath(path, 0, shorts), [R + 0.5, R + 0.6, R + 0.9], { sides: 7 }); }
    if (lg === 'kneesocks' || lg === 'socks' || lg === 'loosesocks' || ctx.o.socks) {
      const sc = look.socks ?? 0xf6f6f2, f0 = lg === 'kneesocks' ? 0.5 : lg === 'loosesocks' ? 0.66 : 0.85;
      S.paint(fill(sc, { rough: 0.7 }), under(0.15));
      if (lg === 'loosesocks') { // bunched rings of a loose sock
        for (let q = 0; q < 4; q++) S.tube(cutPath(path, f0 + q * 0.07, f0 + q * 0.07 + 0.075), R * (0.95 + 0.12 * (q % 2) + q * 0.05), { sides: 8 });
      } else S.tube(cutPath(path, f0, 1), R * 0.7, { sides: 7 });
    }
  } else {
    const tobi = k === 'tobi', wide = B.wide || k === 'hakama';
    S.paint(fill(B.col, { rough: 0.62 }), under(0.18, -0.3), crown(0.04));
    S.tube(cutPath(path, 0, 0.9), tobi ? [R + 0.5, R + 1.6, R + 2.0, R + 0.8, R * 0.7] : wide ? [R + 0.4, R + 0.5, R + 0.8, R + 1.0] : [R + 0.3, R + 0.3, R * 0.85 + 0.3, R * 0.8 + 0.35], { sides: 7 });
    if (k === 'cargo') { const p = cutPath(path, 0.3, 0.42); S.paint(fill(tone(B.col, 0.1), { rough: 0.6 }), under(0.2)); S.tube(p.map((q) => V.add(q, [s * (R + 0.2), 0, 0])), 0.9, { sides: 5 }); }
  }
}
function buildShoe(ctx, s) {
  const { S, P, J, M, look } = ctx, A = s > 0 ? 'L' : 'R', ja = J.footL, sh = look.shoes, k = sh.kind || 'sneaker', c = sh.col;
  const W = P.footW, Lf = P.footL / 6.6, lift = P.lift;
  const sole = k === 'sneaker' ? (sh.col2 && k !== 'sneaker' ? sh.col2 : 0xf4f2ec) : k === 'platform' ? tint(c, 0.2) : k === 'boots' || k === 'oxford' || k === 'loafer' || k === 'pumps' ? tone(c, 0.35) : k === 'sandal' ? 0x8a6a48 : tone(c, 0.2);
  const L = [fill(c, { rough: k === 'oxford' || k === 'loafer' || k === 'pumps' ? 0.3 : 0.6 }), vol(below(lift > 0 ? 0 : 0.55), sole, { rough: 0.7 }), under(0.2), crown(0.08)];
  if (k === 'sneaker' && sh.col2) L.push(proj('left', seg(-2.8, 1.2, 1.8, 1.9, 0.45), sh.col2), proj('right', seg(-1.8, 1.9, 2.8, 1.2, 0.45), sh.col2));
  if (k === 'tabi') L.push(proj('top', seg(ja[0] + 0.35, ja[2] + 3.4, ja[0] + 0.35, ja[2] + 5.6, 0.3), tone(c, 0.4)));
  S.push(M['foot' + A]);
  S.push(new THREE.Matrix4().makeScale(s, 1, 1));
  try {
    const x = ja[0], z0 = ja[2];
    if (k === 'sandal') { // a flat setta and its thong; the sock or skin foot in it
      S.paint(fill(sole, { rough: 0.7 }), under(0.2));
      S.box(x - W * 1.05, -lift, z0 - 2.2 * Lf, x + W * 1.05, 0.7, z0 + 5.4 * Lf, { bevel: 0.35 });
      S.paint(fill(look.socks ?? look.skin, { rough: 0.6 }), under(0.15));
      S.loft([[-1.6, 0.8, 2.2], [0, 0.95, 2.6], [2.6, 0.9, 2], [4.4, 0.8, 1.3], [5, 0.7, 0.6]].map(([z, w, h]) => ring2(x, 0.7, z0 + z * Lf, W * w, h)));
      S.paint(fill(c, { rough: 0.5 }));
      S.tube([[x - W * 0.9, 0.8, z0 + 0.6], [x, 1.9, z0 + 3.2 * Lf], [x + W * 0.9, 0.8, z0 + 0.6]], 0.32, { sides: 4 });
    } else {
      S.paint(...L);
      const st = [[-2.0, 0.78, 2.3], [-1.2, 0.96, 2.8], [0.8, 1, 2.7], [2.8, 1.02, 2.1], [4.2, 0.92, 1.7], [5.0, 0.62, 1.25], [5.3, 0.22, 0.75]];
      S.loft(st.map(([z, w, h]) => ring2(x, -lift, z0 + z * Lf, W * w * (k === 'pumps' ? 0.85 : 1), h + lift)));
      if (k === 'boots') { S.loft([ring2(x, 1.5, z0 + 0.3, W * 0.95, 0.1, true), ring2(x, 5.6, z0 + 0.1, W * 0.88, 0.1, true)].map((r) => r), { caps: 'end' }); }
      if (k === 'loafer' || k === 'oxford') { S.paint(fill(tone(c, 0.2), { rough: 0.3 })); S.box(x - W * 0.55, 1.6, z0 + 1.6 * Lf, x + W * 0.55, 2.0, z0 + 2.4 * Lf, { bevel: 0.15 }); }
    }
  } finally { S.pop(); S.pop(); }
}
/** A shoe section across x at depth z: flat sole at y0, h tall, half width w (8 points, a flat bottom); tube: a round section. */
function ring2(x, y0, z, w, h, round = false) {
  const n = Math.max(7, Math.round(8 * QUAL.k)), out = [];
  for (let i = 0; i < n; i++) { const a = Math.PI / 2 + (i / n) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); out.push(round ? [x + c * w, y0 + h, z + s * w] : [x + se(c, 2.6) * w, y0 + Math.max(0, se(s, 2.4) * 0.62 + 0.38) * h, z]); }
  return round ? out : out.map((p) => [p[0], Math.max(y0, p[1]), p[2]]);
}
function buildAcc(ctx) {
  const { S, P, look } = ctx;
  for (const a of look.acc) {
    if (a.kind === 'apron') {
      S.paint(fill(a.col, { rough: 0.6 }), proj('front', stroke(rbox(0, P.waistY - 3, 3.6, 4.6, 0.3), 0.25, 0.5), a.col2 ?? tint(a.col, 0.4), { near: 0 }), under(0.2));
      ctx.in('hips', () => S.extrude([[-P.hipsX * 1.02, P.waistY + 0.8], [P.hipsX * 1.02, P.waistY + 0.8], [P.hipsX * 1.06, P.kneeY + 1.4], [-P.hipsX * 1.06, P.kneeY + 1.4]], P.hipsZ + 0.4, P.hipsZ + 0.8, { bevel: 0.1 }));
    } else if (a.kind === 'shoulderbag' || a.kind === 'pouch' || a.kind === 'ecobag' || a.kind === 'tote') {
      const side = a.side ?? 1, pouch = a.kind === 'pouch';
      S.paint(fill(a.col, { rough: 0.5 }), under(0.2), crown(0.08));
      ctx.in('hips', () => S.at([side * (P.hipsX + (pouch ? 0.4 : 0.9)), P.hipY + (pouch ? 1.2 : 0.2), pouch ? 1.2 : 0.4], [0, side * 0.2, 0], () => S.box(-0.9, -2.2, -2.4, 0.9, 2.0, 2.4, { bevel: 0.5 })));
      if (!pouch) ctx.in('chest', () => S.tube([[side * (P.hipsX + 0.9), P.hipY + 2, 1], [side * P.chestX * 0.3, P.bustY, P.chestZ + P.bust + 0.35], [-side * P.chestX * 0.8, P.shoulderY + 0.6, 0.4], [-side * P.chestX * 0.2, P.shoulderY + 0.5, -P.chestZ - 0.3], [side * (P.hipsX + 0.9), P.hipY + 2, -0.6]], 0.3, { sides: 4, caps: false }));
    } else if (a.kind === 'backpack' || a.kind === 'randoseru') {
      S.paint(fill(a.col, { rough: 0.45 }), under(0.2), crown(0.08));
      ctx.in('chest', () => S.box(-3.8, P.waistY - 1, -P.chestZ - 4.2, 3.8, P.shoulderY + 0.6, -P.chestZ + 0.2, { bevel: 0.8 }));
    } else if (a.kind === 'towel') {
      S.paint(fill(a.col, { rough: 0.8 }), under(0.2));
      ctx.in('chest', () => S.loft([sec(P.neckBase - 0.4, P.neckR * 2.2, P.neckR * 2.1, -0.2), sec(P.neckBase + 0.5, P.neckR * 1.8, P.neckR * 1.8, -0.2)]));
    }
  }
}

// ------------------------------------------------------------------ the figure
/** A chibi figure of a person spec in S (see the head of this file for o). Returns the context (for further building). */
export function chibi(S, spec, o = {}) {
  const P = chibiProportions(spec, o.body || {}), J = chibiJoints(P), look = lookOf(spec, o.palette || {}), pose = resolvePose(o.pose), M = rig(P, J, pose);
  if (o.hairStyle) look.hairStyle = o.hairStyle;
  if (o.tieCol !== undefined) look.tieCol = o.tieCol;
  const ctx = { S, P, J, M, look, spec, pose, o, expr: o.expr || 'smile', ti: topInfo(look), showEars: false, headAngs: headAngles(Math.max(8, Math.round(10 * QUAL.k))) };
  ctx.in = (bone, fn) => { S.push(M[bone]); try { fn(S, ctx); } finally { S.pop(); } };
  ctx.pt = (bone, p) => app(M[bone], p);
  ctx.dir = (bone, d) => dirM(M[bone], d);
  ctx.hold = (side, fn, ho) => hold(ctx, side, fn, ho);
  ctx.lock = (...a) => lock(S, ...a);
  ctx.headPt = (v, a, g) => headPt(P, v, a, g);
  ctx.faceZ = (v, g) => faceZ(P, v, g);
  const part = (key, bone, fn) => {
    const g = o.parts?.[key];
    if (!g) return fn();
    const ax = typeof g.axis === 'string' ? AX[g.axis] : g.axis || AX.x;
    return S.joint(g.name || key, { pivot: g.pivot ? app(M[bone], g.pivot) : app(M[bone], J[bone]), axis: g.world ? ax : dirM(M[bone], ax), min: g.min ?? -3.2, max: g.max ?? 3.2, rest: g.rest ?? 0, g: g.g || [0, 0.6], idle: g.idle }, fn);
  };
  if (o.base !== false) base(S, o.base || {});
  const skirt = look.bottom.kind === 'skirt' || look.bottom.kind === 'hakama';
  if (skirt && look.bottom.kind === 'hakama') look.bottom.cut = 'hakama';
  // legs and shoes
  for (const s of [1, -1]) part(s > 0 ? 'legL' : 'legR', s > 0 ? 'thighL' : 'thighR', () => { buildLeg(ctx, s); buildShoe(ctx, s); });
  ctx.in('hips', () => { buildPelvis(ctx); if (skirt) ctx.hemY = buildSkirt(ctx); });
  ctx.in('chest', () => buildTorso(ctx));
  if (spec.garb?.coat && o.coat !== false) coatTails(ctx, { len: spec.garb.coat.len ?? 0.8, ...(o.coat || {}) });
  ctx.in('neck', () => { S.paint(fill(look.skin, { rough: 0.5 }), under(0.3)); S.loft([sec(P.neckBase - 0.8, P.neckR, P.neckR, -0.3, 6), sec(P.chin + 2.2, P.neckR * 0.95, P.neckR * 0.95, -0.4, 6)]); });
  buildAcc(ctx);
  // arms, hands and what they hold
  for (const s of [1, -1]) {
    const A = s > 0 ? 'L' : 'R';
    part('arm' + A, 'arm' + A, () => {
      buildArm(ctx, s);
      buildHand(ctx, s);
      for (const p of (o.props || []).filter((q) => q.hand === A)) hold(ctx, A, (S2) => p.build(S2, ctx), p);
      o.armExtra?.(ctx, A);
    });
  }
  // the head: skull and face, hair, hat, glasses
  part('head', 'head', () => ctx.in('head', () => {
    buildHair(ctx);
    buildHead(ctx);
    buildHat(ctx);
    buildGlasses(ctx);
    if (look.face.mustache) { S.paint(fill(look.hair, { rough: 0.5 }), under(0.2)); const my = P.mouthY + 1.4, z = faceZ(P, (my - P.hc[1]) / P.hh) + 0.2; for (const s of [1, -1]) lock(S, [[s * 0.2, my + 0.4, z], [s * 1.6, my, z + 0.5], [s * 2.8, my - 1.1, z]], 1.6, 0.9, { out: [0, 0, 1], steps: 2 }); }
    o.head?.(ctx);
  }));
  o.extra?.(ctx);
  return ctx;
}

/**
 * A cape (or a coat worn over the shoulders) hanging from the shoulders round the back, open at the front: len (mm
 * down from the shoulders), flare, back (how far its hem flies out behind), gap. Built on the chest; o.part: a gimmick
 * joint def ({ name, g }) that flips it about the shoulders.
 */
export function cape(ctx, o = {}) {
  const { S, P } = ctx, len = o.len ?? (P.shoulderY - P.kneeY), b = o.back ?? 2, fl = o.flare ?? 1;
  const rows = [[P.neckBase + 0.6, P.neckR * 2.1, P.neckR * 1.9, -0.5, 0], [P.shoulderY - 0.2, P.shX + P.armR + 0.6, P.chestZ + 1.4, -0.4, 0.3], [P.shoulderY - len * 0.5, (P.shX + P.armR + 1.4) * fl, (P.chestZ + 2) * fl, -0.8, b * 0.45], [P.shoulderY - len, (P.shX + P.armR + 2.6) * fl, (P.chestZ + 2.6) * fl, -1.2, b]];
  const build = () => ctx.in('chest', () => shell(S, rows, { gap: o.gap ?? 0.75, n: o.n ?? 12, th: 0.5, col: o.col, lining: o.lining, paint: o.paint, jag: o.jag }));
  if (!o.part) return build();
  return S.joint(o.part.name || 'cape', { pivot: ctx.pt('chest', [0, P.shoulderY, -P.chestZ - 0.5]), axis: ctx.dir('chest', [1, 0, 0]), min: -1.5, max: 0.5, rest: 0, g: o.part.g || [0, -0.7], idle: o.part.idle ?? 0.05 }, build);
}
/** A five-pointed star plate, r across its points, th thick, facing +z (wands, sparkles, badges). */
export function star3d(S, r, th, o = {}) {
  const n = o.n ?? 5, k = o.k ?? 0.48, out = [];
  for (let i = 0; i < n * 2; i++) { const a = Math.PI / 2 + (i / (n * 2)) * Math.PI * 2, rr = i % 2 ? r * k : r; out.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
  return S.extrude(out, -th / 2, th / 2, { bevel: o.bevel ?? th * 0.3 });
}

// ------------------------------------------------------------------ display bases
/**
 * A display base under the figure (below y = 0): shape 'hex' | 'oct' | 'round' | 'square', r (mm), h, col (top), rim,
 * text (5 x 7 label pad-printed on the front face), mark ('star' | 'ring' | null), maker (stamped underneath).
 */
export function base(S, o = {}) {
  const n = { hex: 6, oct: 8, round: 14, square: 4 }[o.shape || 'hex'], r = o.r ?? 15, h = o.h ?? 3.4, col = o.col ?? 0x2a3050, rim = o.rim ?? tone(col, 0.3);
  const exact = (y, rr) => Array.from({ length: n }, (_, i) => { const a = Math.PI / 2 - Math.PI / n + (i / n) * Math.PI * 2 + (n === 4 ? 0 : 0); return [Math.cos(a) * rr, y, Math.sin(a) * rr * (o.sz ?? 1)]; });
  const L = [fill(rim, { rough: 0.6 }), vol(above(-0.9), col, { rough: 0.62 }), proj('top', stroke(circle(0, 0, r * 0.84), 0.5), tint(col, 0.25), { near: -1 }), ...(o.top || [])];
  if (o.mark === 'star') L.push(proj('top', star(0, 0, r * 0.7, 5, 0.42), tint(col, 0.18), { near: -1 }));
  if (o.text) L.push(proj('front', label(o.text, 0, -h * 0.55 - 0.2, o.px ?? 0.34), o.textCol ?? 0xf6f0dc, { hard: true, near: r * 0.5 }));
  if (o.maker) L.push(...stampOf(o.maker));
  S.paint(...L, under(0.25, -0.5));
  S.loft([exact(-h, r * 0.97), exact(-h + 0.4, r), exact(-1.2, r), exact(-0.3, r - 0.9)], { caps: 'both' });
  S.loft([exact(-0.4, r - 1.2), exact(0, r - 1.4)], { caps: 'end' });
}
const stampOf = (maker) => [proj('bottom', label('(C)1999', 0, 2.2, 0.44), 0xb0aab4, { hard: true }), proj('bottom', label(maker, 0, -2.2, 0.44), 0xb0aab4, { hard: true })];
