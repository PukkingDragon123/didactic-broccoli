// Body plan for the low-poly humans: proportions from height / age / sex and the rigid box segments of the
// body in the rest pose (metres, feet on y = 0, facing +z, +x = the character's LEFT). Limb segments are
// authored on the left side only; the mesher mirrors them onto the right bones and they share texture space.
import { hairSegments } from './hair.js';
import { accSegments } from './acc.js';

// [bone, parent]. Extra bones: skirt (skirts / aprons / coat tails), tailL/R (ponytails, spring-driven),
// bag (shoulder bag / camera on a strap, pendulum), prop (phone or camera in the right hand), box (carried box).
export const BONES = [
  ['hips', null], ['spine', 'hips'], ['chest', 'spine'], ['neck', 'chest'], ['head', 'neck'],
  ['armL', 'chest'], ['foreL', 'armL'], ['handL', 'foreL'], ['armR', 'chest'], ['foreR', 'armR'], ['handR', 'foreR'],
  ['thighL', 'hips'], ['shinL', 'thighL'], ['footL', 'shinL'], ['thighR', 'hips'], ['shinR', 'thighR'], ['footR', 'shinR'],
  ['skirt', 'hips'], ['tailL', 'head'], ['tailR', 'head'], ['bag', 'chest'], ['prop', 'handR'], ['box', 'chest'],
];
export const BONE_INDEX = Object.fromEntries(BONES.map(([b], i) => [b, i]));

/** Landmark heights / widths in metres for a spec ({ H, sex, age, build, belly }). */
export function proportions(s) {
  const H = s.H, f = s.sex === 'f';
  const a = s.age === 'kid' ? 0 : s.age === 'teen' ? 0.72 : 1; // adulthood
  const ht = s.age === 'kid' ? 5.9 : s.age === 'teen' ? 6.85 : s.age === 'elder' ? 6.95 : f ? 7.05 : 7.25;
  const hu = H / ht; // head height (crown to chin)
  const k = (kid, adult) => H * (kid + (adult - kid) * a);
  const w = s.build || 1;
  const P = {
    H, hu, f, a, w, kid: a < 0.5,
    crown: H, chin: H - hu,
    neckBase: k(0.805, 0.84), shoulderY: k(0.776, 0.806), bustY: k(0.7, 0.728), waistY: k(0.618, 0.632),
    pelvisY: k(0.572, 0.588), hipY: k(0.492, 0.52), crotchY: k(0.442, 0.468), kneeY: k(0.268, 0.285), ankleY: k(0.05, 0.046),
    elbowY: k(0.6, 0.625), wristY: k(0.462, 0.48), tipY: k(0.375, 0.374),
    shX: k(0.1, f ? 0.092 : 0.1) * (0.5 + 0.5 * w), hipX: k(0.052, f ? 0.056 : 0.052) * w,
    chestTopX: k(0.078, f ? 0.07 : 0.077) * w, bustX: k(0.088, f ? 0.086 : 0.092) * w, waistX: k(0.086, f ? 0.068 : 0.081) * w,
    hipsX: k(0.092, f ? 0.104 : 0.093) * w, hipsZ: k(0.06, f ? 0.066 : 0.059) * w,
    chestZ: k(0.06, f ? 0.06 : 0.06) * w, waistZ: k(0.06, f ? 0.052 : 0.054) * w,
    bust: f && a > 0.5 ? 0.012 * H * (s.bust ?? 1) : 0, belly: (s.belly || 0) * 0.035 * H,
    thighX: k(0.048, f ? 0.052 : 0.048) * w, armX: k(0.028, f ? 0.023 : 0.026) * (0.4 + 0.6 * w),
    footL: k(0.152, f ? 0.142 : 0.152), footX: k(0.031, f ? 0.027 : 0.03),
  };
  // head: width / depth from head height (kids slightly rounder), face landmarks measured from the chin
  P.hw = hu * (P.kid ? 0.35 : f ? 0.325 : 0.335);
  P.hd = hu * (P.kid ? 0.43 : 0.42);
  P.hcz = hu * 0.03;
  P.zf = P.hcz + P.hd; // face plane
  const fy = (kid, adult) => P.chin + hu * (kid + (adult - kid) * a);
  P.eyeY = fy(0.43, 0.5); P.browY = fy(0.53, 0.6); P.noseY = fy(0.26, 0.29); P.mouthY = fy(0.16, 0.18); P.hairY = fy(0.8, 0.86);
  P.earTop = P.browY + hu * 0.02; P.earBot = P.noseY + hu * 0.01; P.napeY = P.chin + hu * 0.12;
  return P;
}

/** Rest-pose joint positions (absolute, metres). */
export function joints(P) {
  const { H, hu } = P;
  return {
    hips: [0, (P.hipY + P.pelvisY) / 2, 0], spine: [0, P.pelvisY, 0], chest: [0, P.waistY, 0],
    neck: [0, P.neckBase - 0.012 * H, -0.004 * H], head: [0, P.chin + 0.2 * hu, P.hcz - 0.12 * hu],
    armL: [P.shX, P.shoulderY, 0], foreL: [P.shX, P.elbowY, 0], handL: [P.shX, P.wristY, 0.004 * H],
    armR: [-P.shX, P.shoulderY, 0], foreR: [-P.shX, P.elbowY, 0], handR: [-P.shX, P.wristY, 0.004 * H],
    thighL: [P.hipX, P.hipY, 0], shinL: [P.hipX, P.kneeY, 0], footL: [P.hipX, P.ankleY, 0],
    thighR: [-P.hipX, P.hipY, 0], shinR: [-P.hipX, P.kneeY, 0], footR: [-P.hipX, P.ankleY, 0],
    skirt: [0, P.pelvisY, 0], tailL: [P.hw * 0.8, P.hairY, P.hcz - P.hd * 0.5], tailR: [-P.hw * 0.8, P.hairY, P.hcz - P.hd * 0.5],
    bag: [P.chestTopX * 0.7, P.neckBase, 0], prop: [-P.shX, P.wristY - 0.07 * H, 0.03 * H], box: [0, P.waistY, P.chestZ + 0.12],
  };
}

/**
 * A segment: a prism between two horizontal cross-sections (rectangles with chamfered corners).
 * b / t: [cx, cz, hx, hz] at y0 / y1. ch: chamfer (fraction of the smaller half-size). mirror: also on the right.
 * mat: painter key; part: anatomical name the painters use; caps: which end caps to build.
 */
export const seg = (part, bone, mat, y0, y1, b, t, o = {}) => ({ part, bone, mat, y0, y1, b, t: t || b, ch: 0, caps: 'both', dens: 1, ...o });

export function bodySegments(s, P) {
  const { H, hu } = P;
  const S = [];
  const add = (...a) => { const x = seg(...a); S.push(x); return x; };
  const h = H;
  // --- pelvis, abdomen, chest (two pieces each for a waist / bust / hip curve)
  add('hipsLo', 'hips', 'body', P.crotchY - 0.012 * h, P.hipY + 0.012 * h, [0, -0.004 * h, P.hipsX * 0.9, P.hipsZ * 0.92], [0, -0.003 * h, P.hipsX, P.hipsZ], { ch: 0.3 });
  add('hipsUp', 'hips', 'body', P.hipY + 0.012 * h, P.pelvisY + 0.012 * h, [0, -0.003 * h, P.hipsX, P.hipsZ], [0, -0.001 * h, (P.hipsX + P.waistX) / 2 * 1.01, P.waistZ * 1.03], { ch: 0.32, caps: 'top' });
  add('spine', 'spine', 'body', P.pelvisY - 0.008 * h, P.waistY + 0.01 * h, [0, 0.003 * h + P.belly / 2, (P.hipsX + P.waistX) / 2, P.waistZ + P.belly / 2], [0, 0.002 * h + P.belly / 3, P.waistX, P.waistZ + P.belly / 3], { ch: 0.38, caps: 'none' });
  add('chestLo', 'chest', 'body', P.waistY - 0.004 * h, P.bustY, [0, 0.002 * h + P.belly / 3, P.waistX, P.waistZ + P.belly / 3], [0, 0.006 * h + P.bust / 2, P.bustX, P.chestZ + P.bust / 2], { ch: 0.36, caps: 'none' });
  add('chestHi', 'chest', 'body', P.bustY, P.shoulderY + 0.004 * h, [0, 0.006 * h + P.bust / 2, P.bustX, P.chestZ + P.bust / 2], [0, -0.004 * h, P.chestTopX, P.chestZ * 0.8], { ch: 0.42, caps: 'none' });
  // trapezius wedge: slopes from the shoulders up to the neck
  add('traps', 'chest', 'body', P.shoulderY - 0.004 * h, P.neckBase + 0.006 * h, [0, -0.004 * h, P.chestTopX * 1.04, P.chestZ * 0.8], [0, -0.009 * h, hu * 0.3, P.chestZ * 0.55], { ch: 0.45, caps: 'top' });
  // --- neck + head (cranium / jaw / nose / ears)
  add('neck', 'neck', 'skin', P.neckBase - 0.03 * h, P.chin + 0.16 * hu, [0, -0.012 * h, hu * (P.f ? 0.2 : 0.225), hu * 0.22], [0, -0.008 * h, hu * (P.f ? 0.19 : 0.215), hu * 0.21], { ch: 0.38, caps: 'none' });
  const sl = 0.06 * hu; // forehead slope
  add('cranium', 'head', 'head', P.noseY, P.crown, [0, P.hcz, P.hw, P.hd], [0, P.hcz - sl * 0.6, P.hw * 0.9, P.hd - sl * 0.4], { ch: 0.3, block: 'face' });
  const jawTop = P.hw * (P.f ? 0.92 : 0.95), chinW = hu * (P.kid ? 0.23 : P.f ? 0.165 : 0.2);
  add('jaw', 'head', 'head', P.chin, P.noseY + 0.02 * hu, [0, P.zf - 0.02 * hu - 0.15 * hu, chinW, 0.15 * hu], [0, P.zf - 0.33 * hu, jawTop, 0.33 * hu], { ch: 0.36, caps: 'bot', block: 'face' });
  const nz = P.kid ? 0.72 : P.f ? 0.84 : 1;
  add('nose', 'head', 'nose', P.noseY - 0.012 * hu, P.eyeY - 0.035 * hu, [0, P.zf + 0.042 * hu * nz, 0.062 * hu * nz, 0.046 * hu * nz], [0, P.zf + 0.004 * hu, 0.03 * hu, 0.02 * hu], { ch: 0.45, caps: 'bot', block: 'face' });
  add('ear', 'head', 'ear', P.earBot, P.earTop, [P.hw + 0.012 * hu, P.hcz - 0.1 * hu, 0.04 * hu, 0.07 * hu], [P.hw + 0.02 * hu, P.hcz - 0.12 * hu, 0.045 * hu, 0.08 * hu], { ch: 0.4, mirror: true, dens: 1.3 });
  // --- arms (left; mirrored)
  const ax = P.shX, aw = P.armX;
  add('uarm', 'armL', 'body', P.elbowY - 0.01 * h, P.shoulderY - 0.012 * h, [ax, 0, aw * 0.76, aw * 0.8], [ax, -0.001 * h, aw * 0.98, aw * 1.04], { ch: 0.34, mirror: true, caps: 'bot' });
  // rounded deltoid cap over the shoulder joint
  add('uarm', 'armL', 'body', P.shoulderY - 0.034 * h, P.shoulderY + 0.009 * h, [ax, -0.001 * h, aw * 1.0, aw * 1.06], [ax - aw * 0.2, -0.002 * h, aw * 0.62, aw * 0.72], { ch: 0.45, mirror: true, caps: 'top' });
  add('farm', 'foreL', 'body', P.wristY, P.elbowY + 0.01 * h, [ax, 0.004 * h, aw * 0.5, aw * 0.62], [ax, 0.001 * h, aw * 0.72, aw * 0.78], { ch: 0.34, mirror: true });
  const hz = 0.004 * h, hs = P.f ? 0.92 : 1;
  add('palm', 'handL', 'hand', P.wristY - 0.054 * h * hs, P.wristY + 0.004 * h, [ax - 0.001 * h, hz, 0.0085 * h, 0.0255 * h * hs], [ax, hz, 0.0085 * h, 0.021 * h * hs], { ch: 0.25, mirror: true, dens: 1.25 });
  add('fingers', 'handL', 'hand', P.tipY + 0.004 * h, P.wristY - 0.05 * h * hs, [ax - 0.004 * h, hz + 0.004 * h, 0.0062 * h, 0.021 * h * hs], [ax - 0.002 * h, hz + 0.002 * h, 0.0074 * h, 0.0245 * h * hs], { ch: 0.25, mirror: true, dens: 1.25, caps: 'bot' });
  add('thumb', 'handL', 'hand', P.wristY - 0.042 * h * hs, P.wristY - 0.004 * h, [ax - 0.006 * h, hz + 0.024 * h * hs, 0.0052 * h, 0.0058 * h], [ax - 0.003 * h, hz + 0.018 * h * hs, 0.0062 * h, 0.0072 * h], { ch: 0.3, mirror: true, dens: 1.25, rot: { p: [ax, P.wristY, hz + 0.02 * h], e: [-0.25, 0, 0.12] } });
  // --- legs (left; mirrored)
  const lx = P.hipX, tw = P.thighX, mid = P.kneeY - 0.1 * h;
  add('thigh', 'thighL', 'body', P.kneeY - 0.012 * h, P.hipY + 0.03 * h, [lx, 0.002 * h, tw * 0.64, tw * 0.68], [lx + 0.004 * h, -0.002 * h, tw, tw * 1.02], { ch: 0.34, mirror: true, caps: 'bot' });
  add('calf', 'shinL', 'body', mid, P.kneeY + 0.01 * h, [lx, -0.005 * h, tw * 0.64, tw * 0.7], [lx, 0.001 * h, tw * 0.6, tw * 0.64], { ch: 0.36, mirror: true, caps: 'none' });
  add('shin', 'shinL', 'body', P.ankleY - 0.006 * h, mid, [lx, 0, tw * 0.37, tw * 0.42], [lx, -0.005 * h, tw * 0.64, tw * 0.7], { ch: 0.34, mirror: true, caps: 'none' });
  const fl = P.footL, fx = P.footX, fz0 = -0.24 * fl;
  add('foot', 'footL', 'shoe', 0, P.ankleY + 0.012 * h, [lx + 0.003 * h, fz0 + 0.36 * fl, fx, 0.36 * fl], [lx + 0.002 * h, fz0 + 0.2 * fl, fx * 0.72, 0.18 * fl], { ch: 0.3, mirror: true });
  add('toe', 'footL', 'shoe', 0, 0.026 * h, [lx + 0.004 * h, fz0 + 0.84 * fl, fx * 1.02, 0.16 * fl], [lx + 0.004 * h, fz0 + 0.8 * fl, fx * 0.92, 0.15 * fl], { ch: 0.45, mirror: true });
  return S;
}

/** Everything: body + hair + hat + accessories. */
export function buildPlan(spec) {
  const P = proportions(spec);
  const J = joints(P);
  const segs = [...bodySegments(spec, P), ...hairSegments(spec, P, J), ...accSegments(spec, P, J)];
  return { P, J, segs };
}
