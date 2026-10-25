// Gesture library. Each gesture returns arm IK targets (wrist positions + elbow poles, in the chest bone's
// space, metres for a 1.72 m adult — scaled by height) and / or extra joint angles. t = seconds since start,
// k = 0..1 envelope (already blended by the caller), h = the Human (for proportions / look targets).
// Defaults: dur (one-shot length; Infinity = hold until clearGesture), expr (face while it plays),
// legs (full-body: also drives the hips and feet before the leg IK; see dancePose).

export const GESTURES = {
  wave: { dur: 2.4, expr: 'smile' },
  bow: { dur: 2.2, expr: 'smile' },
  point: { dur: 2.6 },
  cheer: { dur: 2.0, expr: 'happy' },
  think: { dur: 3.2 },
  photo: { dur: Infinity },
  talk: { dur: 2.6 },
  clap: { dur: 1.8, expr: 'happy' },
  shrug: { dur: 1.7, expr: 'surprised' },
  browse: { dur: Infinity },
  carry: { dur: Infinity },
  dance: { dur: Infinity, expr: 'happy', legs: true },
  // idle fidgets (played automatically by Human while standing around)
  _watch: { dur: 1.7 }, _neck: { dur: 1.9 }, _clasp: { dur: 3.2 }, _look: { dur: 2.2 },
};
export const FIDGETS = ['_watch', '_neck', '_clasp', '_look'];
/** More poses registered by other modules (name -> fn(t, h, g, opts)); see poses.js. */
export const EXTRA_POSES = {};

const S = (v, k) => v * k;
/**
 * Fill g (a pose record) for gesture `name` at time t.
 * g: { L: {t:[x,y,z], p:[x,y,z], hand:[x,y,z]} | null, R: ..., spine, chest, neck, head (euler x,y,z arrays, additive),
 *      hips: [dx, dy, dz] offset, prop, box (bools), shoulders: lift }
 */
export function gesturePose(name, t, h, g, opts) {
  const P = h.P, k = P.H / 1.72;
  const sy = P.shoulderY - P.waistY, sx = P.shX; // shoulder in chest space
  const chinY = P.chin - P.waistY, zf = P.zf;
  g.L = g.R = null; g.prop = null; g.box = false; g.lift = 0;
  g.spine[0] = g.spine[1] = g.spine[2] = 0; g.chest[0] = g.chest[1] = g.chest[2] = 0;
  g.neck[0] = g.neck[1] = g.neck[2] = 0; g.head[0] = g.head[1] = g.head[2] = 0; g.hips[0] = g.hips[1] = g.hips[2] = 0;
  g.eyes = null; g.hipsR[0] = g.hipsR[1] = g.hipsR[2] = 0;
  const arm = (x, y, z, px, py, pz, hx = 0, hy = 0, hz = 0) => ({ t: [x, y, z], p: [px, py, pz], hand: [hx, hy, hz] });
  switch (name) {
    case 'wave': {
      const w = Math.sin(t * 9);
      g.R = arm(-sx - S(0.16, k) - w * S(0.045, k), sy + S(0.27, k), S(0.06, k), -1, -1.1, -0.4, 0.15, -0.3, -0.25 + w * 0.4);
      g.head[2] = 0.08; g.chest[2] = 0.05; g.head[1] = -0.1;
      break;
    }
    case 'bow': {
      const env = t < 0.7 ? smooth(t / 0.7) : t < 1.4 ? 1 : 1 - smooth((t - 1.4) / 0.7);
      g.spine[0] = 0.38 * env; g.chest[0] = 0.22 * env; g.neck[0] = 0.08 * env; g.head[0] = 0.12 * env; g.hips[2] = -S(0.03, k) * env;
      if (h.spec.sex === 'f') { g.L = arm(S(0.035, k), -S(0.3, k), S(0.15, k), 1, 0, -1, 0.1, 0.6, 0); g.R = arm(-S(0.035, k), -S(0.31, k), S(0.15, k), -1, 0, -1, 0.1, -0.6, 0); }
      break;
    }
    case 'point': {
      const d = opts.dir || [-0.35, 0.15, 1];
      const n = Math.hypot(d[0], d[1], d[2]);
      const reach = (P.shoulderY - P.wristY) * 0.97;
      g.R = arm(-sx + d[0] / n * reach, sy + d[1] / n * reach, d[2] / n * reach, -0.6, -1, -0.2, 0, -0.3, 0);
      g.chest[1] = -0.12; g.head[1] = -0.2;
      g.eyes = [-1.2, 0];
      break;
    }
    case 'cheer': {
      const b = Math.abs(Math.sin(t * 7));
      g.L = arm(sx + S(0.08, k), sy + S(0.48, k) + b * S(0.03, k), S(0.06, k), 1, -0.2, -0.3, 0, 0.3, 0);
      g.R = arm(-sx - S(0.08, k), sy + S(0.48, k) + b * S(0.03, k), S(0.06, k), -1, -0.2, -0.3, 0, -0.3, 0);
      g.hips[1] = b * S(0.025, k); g.head[0] = -0.15; g.chest[0] = -0.05;
      break;
    }
    case 'think': {
      g.R = arm(-S(0.035, k), chinY - S(0.075, k), zf + S(0.07, k), -1, -1.2, 0.2, -0.6, 0, 0.4);
      g.L = arm(-S(0.06, k), sy - S(0.24, k), S(0.17, k), 1, -0.5, -0.4, 0, 0.9, 0);
      g.head[0] = -0.1; g.head[2] = -0.12; g.head[1] = 0.12;
      g.eyes = [1.5, -1.2];
      break;
    }
    case 'photo': {
      const y = P.eyeY - P.waistY - S(0.06, k), z = zf + S(0.25, k);
      g.R = arm(-S(0.06, k), y, z, -1, -1, -0.2, -0.25, -0.5, 0);
      g.L = arm(S(0.06, k), y, z, 1, -1, -0.2, -0.25, 0.5, 0);
      g.prop = [0, y + S(0.05, k), z + S(0.02, k)]; g.head[0] = 0.04;
      break;
    }
    case 'talk': {
      const a = Math.sin(t * 3.1), b = Math.sin(t * 2.3 + 1.5), beat = Math.max(0, Math.sin(t * 6.2)) * 0.3;
      g.R = arm(-sx * 0.7 - S(0.04, k) * a, -S(0.02, k) + S(0.07, k) * (a * 0.5 + beat), S(0.24, k), -1, -0.6, -0.6, 0, -0.9 + a * 0.3, 0.3);
      g.L = arm(sx * 0.75 + S(0.03, k) * b, -S(0.09, k) + S(0.05, k) * b, S(0.19, k), 1, -0.6, -0.6, 0, 0.9 - b * 0.3, -0.3);
      g.head[2] = 0.05 * a; g.head[0] = 0.04 * Math.sin(t * 4.3);
      break;
    }
    case 'clap': {
      const c = Math.max(0, Math.sin(t * 13)) ** 0.6;
      const y = sy - S(0.1, k), z = S(0.3, k);
      g.R = arm(-S(0.025, k) - c * S(0.07, k), y, z, -1, -1, -0.5, -0.5, -0.35, 0);
      g.L = arm(S(0.025, k) + c * S(0.07, k), y, z, 1, -1, -0.5, -0.5, 0.35, 0);
      g.head[0] = -0.05;
      break;
    }
    case 'shrug': {
      const env = t < 0.35 ? smooth(t / 0.35) : t < 1.2 ? 1 : 1 - smooth((t - 1.2) / 0.5);
      g.R = arm(-sx - S(0.12, k), -S(0.1, k), S(0.17, k), -1, -0.8, -0.6, 0, -1.6, 0.2);
      g.L = arm(sx + S(0.12, k), -S(0.1, k), S(0.17, k), 1, -0.8, -0.6, 0, 1.6, -0.2);
      g.lift = S(0.035, k) * env; g.head[2] = 0.14 * env; g.head[0] = -0.05 * env;
      break;
    }
    case 'browse': {
      g.spine[0] = 0.2; g.chest[0] = 0.08; g.neck[0] = 0.12; g.head[0] = 0.32 + Math.sin(t * 0.7) * 0.05; g.head[1] = Math.sin(t * 0.45) * 0.3;
      g.R = arm(-S(0.05, k), -S(0.16, k), -P.chestZ - S(0.1, k), -1, 0.2, 0.8, 0.3, 0, 0);
      g.L = arm(S(0.05, k), -S(0.16, k), -P.chestZ - S(0.1, k), 1, 0.2, 0.8, 0.3, 0, 0);
      g.eyes = [Math.sin(t * 0.45 + 0.6) * 1.5, 1.2];
      break;
    }
    case 'carry': {
      const C = h.boxPos;
      g.R = arm(-S(0.205, k), C[1] - S(0.04, k), C[2], -1, -1, -0.2, 0, -1.57, 0);
      g.L = arm(S(0.205, k), C[1] - S(0.04, k), C[2], 1, -1, -0.2, 0, 1.57, 0);
      g.box = true; g.spine[0] = -0.06;
      break;
    }
    case '_watch': {
      g.L = arm(S(0.03, k), sy - S(0.17, k), S(0.23, k), 1, -1, -0.3, -0.3, 1.4, 0);
      g.head[0] = 0.28; g.neck[0] = 0.06; g.eyes = [0.5, 1.5];
      break;
    }
    case '_neck': {
      const r = Math.sin(t * 7) * S(0.012, k);
      g.R = arm(-S(0.035, k) + r, P.neckBase - P.waistY + S(0.035, k), -P.chestZ * 0.6, -1, 0.6, 0.2, 0.4, 0, 0);
      g.head[0] = 0.12; g.head[2] = -0.06;
      break;
    }
    case '_clasp': {
      g.R = arm(-S(0.02, k), -S(0.3, k), S(0.13, k), -1, 0, -0.6, 0.2, -0.9, 0);
      g.L = arm(S(0.02, k), -S(0.3, k), S(0.14, k), 1, 0, -0.6, 0.2, 0.9, 0);
      break;
    }
    case '_look': { g.head[1] = Math.sin(t * 1.4) * 0.5; g.chest[1] = Math.sin(t * 1.4) * 0.12; g.eyes = [Math.sin(t * 1.4) * 1.5, 0]; break; }
    case 'dance': dancePose(t, h, g, opts); break;
    default: EXTRA_POSES[name]?.(t, h, g, opts); break;
  }
}

function smooth(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

// ------------------------------------------------------------------ dance
// A looping full-body dance on the beat: h.gesture('dance', { bpm = 120, phase = 0 (beats), style, mirror, amp = 1,
// clock }). style: one of DANCES (picked from the seed when omitted; elders get the gentle ones), mirror: left/right
// swapped (seed when omitted), clock: () => seconds, a shared song time that keeps late joiners on the beat (default:
// time since the gesture started). Every cycle divides 8 beats (2 bars), so 8 beats loop seamlessly.
// Output (besides arms / spine...): g.feet [L, R] = [dx, dz, lift, pitch (+ heel up)] off the idle stance,
// g.hips [dx, dy, dz] + g.hipsR [pitch, yaw, roll], g.home = both feet back at rest (feet only join / leave there).
export const DANCES = ['bounce', 'disco', 'step', 'wave', 'bon', 'twist', 'robot'];
const GENTLE = ['bon', 'bounce', 'wave', 'step'];
const TAU = Math.PI * 2;
const fr = (x) => x - Math.floor(x);
const lerp = (a, b, u) => a + (b - a) * u;
const pk = (b, p = 1) => ((1 + Math.cos(TAU * b)) / 2) ** p; // 1 on the beat, 0 on the off-beat
const snap = (b, s) => smooth((fr(b) - 1 + s) / s); // hold, then ease into the next beat's pose over its last s
function hashStr(s) { let x = 2166136261; for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 16777619); return x >>> 0; }
export function danceStyle(h, style) {
  if (DANCES.includes(style)) return style;
  const r = (hashStr(h.preset) ^ Math.imul(h.spec.seed || 1, 2654435761)) >>> 0;
  const list = h.spec.age === 'elder' ? GENTLE : DANCES;
  return list[(r >>> 3) % list.length];
}
// One foot over a cycle of n beats. keys: [[beat, dx, dz, pitch, weight]] sorted by beat; the foot swings into each key
// during the sw beats before it (on a lift arc), otherwise stays planted. Returns the weight it carries.
function track(keys, n, b, sw, lift, out) {
  const c = b - Math.floor(b / n) * n;
  let j = 0;
  while (j < keys.length && keys[j][0] <= c) j++;
  const nx = keys[j % keys.length], pv = keys[(j + keys.length - 1) % keys.length];
  const tn = nx[0] + (j === keys.length ? n : 0);
  const u = keys.length < 2 ? 0 : Math.max(0, 1 - (tn - c) / sw), e = smooth(u), a = Math.sin(Math.PI * u);
  out[0] = lerp(pv[1], nx[1], e); out[1] = lerp(pv[2], nx[2], e); out[2] = a * lift;
  out[3] = lerp(pv[3] || 0, nx[3] || 0, e) + a * 0.3;
  return lerp(pv[4] ?? 1, nx[4] ?? 1, e) * (1 - a);
}
// blend two arm targets
function mixArm(a, b, u, o) {
  for (const k of ['t', 'p', 'hand']) for (let i = 0; i < 3; i++) o[k][i] = lerp(a[k][i], b[k][i], u);
  return o;
}
// keyframed upper body: list[i] = pose at beat i ({ L, R, head, chest, spine, dip }), eased in between
function keyed(list, b, ease, out) {
  const n = list.length, i = ((Math.floor(b) % n) + n) % n, j = (i + 1) % n;
  const A = list[i], B = list[j], u = ease;
  mixArm(A.L, B.L, u, out.L); mixArm(A.R, B.R, u, out.R);
  for (const k of ['head', 'chest', 'spine']) for (let q = 0; q < 3; q++) out[k][q] = lerp(A[k]?.[q] || 0, B[k]?.[q] || 0, u);
  out.dip = lerp(A.dip || 0, B.dip || 0, u);
  return out;
}
const KEY = () => ({ L: { t: [0, 0, 0], p: [0, 0, 0], hand: [0, 0, 0] }, R: { t: [0, 0, 0], p: [0, 0, 0], hand: [0, 0, 0] }, head: [0, 0, 0], chest: [0, 0, 0], spine: [0, 0, 0], dip: 0 });
const _f = [[0, 0, 0, 0], [0, 0, 0, 0]];

function dancePose(t, h, g, o) {
  const P = h.P, k = P.H / 1.72, sp = h.spec, m = (v) => v * k;
  const style = g.style || (g.style = danceStyle(h, o.style));
  const mir = g.mirror ?? (g.mirror = o.mirror ?? !!((sp.seed || 1) & 2));
  const b = (o.clock ? o.clock() : t) * (o.bpm || 120) / 60 + (o.phase || 0);
  const age = sp.age, amp = o.amp ?? 1;
  const B = amp * (age === 'elder' ? 0.5 : age === 'kid' ? 1.2 : age === 'teen' ? 1.1 : 1); // bounce
  const A = amp * (age === 'elder' ? 0.65 : 1); // swing sizes
  const sx = P.shX, sy = P.shoulderY - P.waistY, reach = (P.shoulderY - P.wristY) * 0.97;
  const a0 = P.hipX * 1.05; // idle half-stance
  const up = P.shoulderY - P.elbowY, fore = P.elbowY - P.wristY;
  // arm on side sd (+1 = left): x measured outward from the midline; pole / hand mirrored
  const side = (sd, x, y, z, px, py, pz, hx = 0, hy = 0, hz = 0) => ({ t: [sd * x, y, z], p: [sd * px, py, pz], hand: [hx, sd * hy, sd * hz] });
  // straight-ish arm from the shoulder along (x outward, y, z), f = fraction of full reach
  const aim = (sd, x, y, z, f = 1) => { const n = Math.hypot(x, y, z), r = reach * f / n; return [sx + x * r, sy + y * r, z * r]; };
  const hip = (sd) => side(sd, sx * 0.92 + m(0.03), m(-0.01), m(-0.03), 1, 0.2, -0.7, 0.2, 0.6, 1.3); // hand on hip
  const feet = g.feet;
  for (const f of feet) f[0] = f[1] = f[2] = f[3] = 0;
  let wL = 1, wR = 1, dip = 0, sway = 0, roll = 0, yaw = 0;
  const K = g.key || (g.key = KEY());
  switch (style) {
    case 'bounce': {
      // rock side to side over a bar, clapping on 2 and 4, a knee bounce on every beat
      const sw = Math.sin(Math.PI * b / 2), c = pk((b - 1) / 2, 4), op = 1 - c, hi = 0.5 - 0.5 * Math.cos(Math.PI * (b - 1) / 2);
      dip = m(0.015 + 0.065 * pk(b - 0.05, 1.6)) * B;
      sway = m(0.045) * sw * B;
      feet[1][3] = 0.32 * Math.max(0, sw) ** 2; feet[0][3] = 0.32 * Math.max(0, -sw) ** 2; // heel up off the weighted leg
      // low claps in front of the chest, high ones above the head (never in front of the face)
      const cx = m(0.07) * sw, y = sy - m(0.2) + m(0.12) * c + m(0.52) * hi, z = m(0.3) - m(0.05) * op - m(0.16) * hi;
      g.L = { t: [cx + m(0.035) + m(0.2) * op * A, y, z], p: [1, -1, -0.4], hand: [-0.5 + 0.3 * op, 0.35 - 0.5 * op, 0] };
      g.R = { t: [cx - m(0.035) - m(0.2) * op * A, y, z], p: [-1, -1, -0.4], hand: [-0.5 + 0.3 * op, -0.35 + 0.5 * op, 0] };
      g.lift = m(0.018) * c;
      g.chest[1] = 0.16 * sw * A; g.chest[2] = -0.05 * sw;
      g.head[0] = 0.13 * pk(b - 0.12, 2) - 0.03; g.head[1] = 0.12 * sw; g.head[2] = -0.07 * sw;
      break;
    }
    case 'disco': {
      // Saturday-night point: up across, down and out, four beats a side; the same-side foot taps out on the downs
      const upP = (sd) => side(sd, ...aim(sd, -0.32, 0.88, 0.32), 1, -0.3, -0.3, -0.2, 0, 0.3);
      const dnP = (sd) => side(sd, ...aim(sd, 0.72, -0.5, 0.42, 0.98), 1, 0.2, 0.3, 0.1, 0, 0.2);
      if (!g.disco) {
        const pose = (sd, isUp) => { const q = KEY(); const act = isUp ? upP(sd) : dnP(sd), rest = hip(-sd); if (sd > 0) { q.L = act; q.R = rest; } else { q.R = act; q.L = rest; } q.head = isUp ? [-0.3, sd * 0.35, -sd * 0.08] : [0.18, -sd * 0.4, sd * 0.05]; q.chest = isUp ? [-0.04, sd * 0.1, -sd * 0.06] : [0.05, -sd * 0.18, sd * 0.08]; return q; };
        g.disco = [pose(-1, true), pose(-1, false), pose(-1, true), pose(-1, false), pose(1, true), pose(1, false), pose(1, true), pose(1, false)];
      }
      const q = keyed(g.disco, b, snap(b, 0.42), K);
      g.L = q.L; g.R = q.R;
      for (let i = 0; i < 3; i++) { g.head[i] = q.head[i]; g.chest[i] = q.chest[i]; }
      const tap = m(0.15), tz = m(0.05);
      wR = track([[1, -tap, tz, 0.5, 0.2], [2, 0, 0, 0, 1], [3, -tap, tz, 0.5, 0.2], [4, 0, 0, 0, 1]], 8, b, 0.4, m(0.05), feet[1]);
      wL = track([[0, 0, 0, 0, 1], [5, tap, tz, 0.5, 0.2], [6, 0, 0, 0, 1], [7, tap, tz, 0.5, 0.2]], 8, b, 0.4, m(0.05), feet[0]);
      dip = m(0.015 + 0.035 * pk(b, 1.5)) * B;
      break;
    }
    case 'step': {
      // step-touch: out to the right, close, back, home; then the same to the left. Arms sweep, clap on the touch.
      const st = m(0.22) * Math.min(1, B), gap = m(0.17), lift = m(0.07) * Math.min(1.2, B);
      wR = track([[1, -st, 0, 0, 1], [4, 0, 0, 0, 1], [6, 2 * a0 + st - gap, 0, 0.45, 0.25], [7, 0, 0, 0, 1]], 8, b, 0.45, lift, feet[1]);
      wL = track([[0, 0, 0, 0, 1], [2, -2 * a0 - st + gap, 0, 0.45, 0.25], [3, 0, 0, 0, 1], [5, st, 0, 0, 1]], 8, b, 0.45, lift, feet[0]);
      if (!g.steps) {
        const low = () => { const q = KEY(); q.L = side(1, sx + m(0.02), m(-0.2), m(0.16), 1, 0, -0.6, 0.1, 0.5, 0.2); q.R = side(-1, sx + m(0.02), m(-0.2), m(0.16), 1, 0, -0.6, 0.1, 0.5, 0.2); return q; };
        const out = (sd) => { const q = KEY(); const o = side(sd, ...aim(sd, 1, 0.12, 0.35), 1, -0.4, -0.4, 0, 0, -0.2), c = side(-sd, -m(0.04), sy - m(0.06), m(0.26), 1, -0.6, -0.4, -0.3, 0.6, 0); if (sd > 0) { q.L = o; q.R = c; } else { q.R = o; q.L = c; } q.head = [-0.05, sd * 0.3, 0]; q.chest = [0, sd * 0.18, 0]; return q; };
        const clap = (sd) => { const q = KEY(); const x = sd * m(0.17); q.L = { t: [x + m(0.03), sy - m(0.04), m(0.3)], p: [1, -1, -0.4], hand: [-0.5, 0.35, 0] }; q.R = { t: [x - m(0.03), sy - m(0.04), m(0.3)], p: [-1, -1, -0.4], hand: [-0.5, -0.35, 0] }; q.head = [0.1, sd * 0.25, -sd * 0.1]; q.chest = [0, sd * 0.22, -sd * 0.05]; return q; };
        g.steps = [low(), out(-1), clap(-1), low(), low(), out(1), clap(1), low()];
      }
      const u = smooth(Math.min(1, fr(b) / 0.85));
      const q = keyed(g.steps, b, u, K);
      g.L = q.L; g.R = q.R;
      for (let i = 0; i < 3; i++) { g.head[i] = q.head[i]; g.chest[i] = q.chest[i]; }
      dip = m(0.015 + 0.04 * pk(b - 0.05, 1.5)) * B;
      break;
    }
    case 'wave': {
      // both arms up, swaying side to side over a bar; the body sways along
      const sw = Math.sin(Math.PI * b / 2);
      for (const sd of [1, -1]) {
        const al = 0.42 + sd * sw * 0.42 * A; // tilt out from vertical
        const a = side(sd, ...aim(sd, Math.sin(al), Math.cos(al), 0.16, 0.97), 1, -0.2, -0.4, 0.2, 0, 0.25);
        a.hand[2] -= sw * 0.4;
        if (sd > 0) g.L = a; else g.R = a;
      }
      sway = m(0.03) * sw * B;
      feet[1][3] = 0.25 * Math.max(0, sw) ** 2; feet[0][3] = 0.25 * Math.max(0, -sw) ** 2;
      dip = m(0.012 + 0.032 * pk(b - 0.05, 1.4)) * B;
      g.chest[2] = -0.09 * sw * A; g.spine[2] = -0.04 * sw;
      g.head[0] = -0.1 + 0.08 * pk(b - 0.1, 2); g.head[2] = -0.12 * sw;
      break;
    }
    case 'bon': {
      // Bon Odori (the coal miners' dance): dig, shoulder the load, throw it back, shade your eyes at the moon,
      // push the cart, clap-clap. Soft knees, every move flows into the next.
      if (!g.bon) {
        const q = () => KEY();
        const k0 = q(); k0.L = side(1, sx + m(0.12), sy + m(0.12), m(0.08), 1, -0.6, -0.3, -0.3, 0.6, 0); k0.R = side(-1, -m(0.12), sy - m(0.08), m(0.24), 1, -0.6, -0.4, -0.3, 0.5, 0); k0.head = [-0.05, 0.2, 0]; k0.chest = [0, 0.15, 0];
        const k1 = q(); k1.L = side(1, -m(0.14), m(-0.06), m(0.34), 1, -0.3, -0.5, 0.6, 0.3, 0); k1.R = side(-1, sx + m(0.14), m(-0.16), m(0.36), 1, -0.2, -0.5, 0.6, 0.3, 0); k1.head = [0.3, -0.3, 0]; k1.chest = [0.12, -0.25, 0]; k1.spine = [0.1, 0, 0]; k1.dip = 1;
        const k2 = q(); k2.L = side(1, -m(0.08), sy - m(0.04), m(0.17), 1, -0.6, -0.2, -0.6, 0.5, 0); k2.R = side(-1, sx + m(0.06), sy + m(0.12), m(0.04), 1, -0.8, -0.3, -0.6, 0.3, 0); k2.head = [0, -0.25, 0]; k2.chest = [0, -0.18, 0.04];
        const k3 = q(); k3.L = side(1, -m(0.16), sy - m(0.02), m(0.12), 1, -0.4, -0.2, -0.8, 0.5, 0); k3.R = side(-1, sx + m(0.08), sy + m(0.24), m(-0.1), 1, -0.4, -0.3, -0.8, 0.3, 0); k3.head = [-0.15, -0.35, 0]; k3.chest = [-0.05, -0.25, 0.04];
        const moon = (hy) => { const o = q(); o.R = side(-1, sx * 0.6, P.browY - P.waistY + m(0.15), P.zf + m(0.14), 1, -0.2, -0.3, 1.4, -0.2, 0); o.L = side(1, sx + m(0.2), m(-0.16), m(-0.12), 1, 0, 0.2, 0.2, 0.4, 0); o.head = [-0.32, hy, 0.06]; o.chest = [-0.06, -0.15, 0.03]; return o; };
        const k4 = moon(-0.35), k5 = moon(-0.15);
        const k6 = q(); k6.L = side(1, m(0.1), sy - m(0.06), m(0.42), 1, -0.6, -0.3, 0.1, -1.2, 0); k6.R = side(-1, m(0.1), sy - m(0.06), m(0.42), 1, -0.6, -0.3, 0.1, -1.2, 0); k6.head = [0.05, 0, 0]; k6.chest = [0.06, 0, 0]; k6.spine = [0.06, 0, 0]; k6.dip = 0.6;
        const k7 = q(); k7.L = { t: [m(0.03), sy - m(0.02), m(0.28)], p: [1, -1, -0.4], hand: [-0.5, 0.35, 0] }; k7.R = { t: [-m(0.03), sy - m(0.02), m(0.28)], p: [-1, -1, -0.4], hand: [-0.5, -0.35, 0] }; k7.head = [0.1, 0, 0];
        g.bon = [k0, k1, k2, k3, k4, k5, k6, k7];
      }
      // clap-clap on 7 and its "and", then flow back into the dig
      const c7 = fr(b / 8) * 8 >= 7, f = fr(b);
      const q = keyed(g.bon, b, c7 ? smooth((f - 0.5) / 0.5) : smooth(Math.min(1, f / 0.8)), K);
      g.L = q.L; g.R = q.R;
      for (let i = 0; i < 3; i++) { g.head[i] = q.head[i]; g.chest[i] = q.chest[i]; g.spine[i] = q.spine[i]; }
      if (c7 && f < 0.5) { const o = Math.sin(Math.PI * f / 0.5) * m(0.08); g.L.t[0] += o; g.R.t[0] -= o; }
      const fwd = m(0.17) * Math.min(1, A * 1.3);
      wR = track([[1, 0, fwd, 0, 1], [3, 0, 0, 0, 1], [5, 0, -fwd * 0.8, 0, 1], [7, 0, 0, 0, 1]], 8, b, 0.6, m(0.05), feet[1]);
      dip = m(0.03 + 0.025 * pk(b - 0.1, 1.2) + 0.025 * q.dip) * B / Math.max(0.6, B);
      break;
    }
    case 'twist': {
      // the twist: hips swivel every beat (feet pivot with them), arms swing the other way, down low and back up
      const tw = Math.cos(Math.PI * b);
      yaw = 0.5 * tw * A;
      dip = m(0.03 + 0.06 * (1 - Math.cos(Math.PI * b / 4)) / 2) * B;
      const z = m(0.25), y = m(0.0) + m(0.03) * pk(b), dx = m(0.12) * tw * A;
      g.L = side(1, sx * 0.85 - dx, y, z - m(0.06) * tw, 1, -0.5, -0.8, -0.1, 0.5, 0);
      g.R = side(-1, sx * 0.85 + dx, y, z + m(0.06) * tw, 1, -0.5, -0.8, -0.1, 0.5, 0);
      g.chest[1] = -0.12 * tw * A; g.chest[2] = 0.04 * tw;
      g.head[0] = 0.08 * pk(b * 2 - 0.1, 2) - 0.04; g.head[2] = 0.08 * tw;
      break;
    }
    case 'robot': {
      // stiff 90-degree arms snapping to a new shape on every beat, head ticks
      if (!g.robot) {
        // upper arm out level, forearm up / down; straight out; elbow at the side, forearm across the belly
        const U = (sd) => side(sd, sx + up, sy + fore, m(0.03), 1, -1, -0.1, 0, 0, 0), D = (sd) => side(sd, sx + up, sy - fore, m(0.03), 1, 1, -0.1, 0, 0, 0);
        const O = (sd) => side(sd, sx + (up + fore) * 0.97, sy, m(0.03), 0, -1, -0.2, 0, 0, 0), X = (sd) => side(sd, sx - fore * 0.75, sy - up, m(0.2), 1, 0, -1, 0, 0, 0);
        const pose = (L, R, hy, cy) => { const q = KEY(); q.L = L; q.R = R; q.head = [0, hy, 0]; q.chest = [0, cy, 0]; return q; };
        g.robot = [pose(U(1), U(-1), 0, 0), pose(U(1), D(-1), 0.4, 0.1), pose(D(1), D(-1), 0, 0), pose(D(1), U(-1), -0.4, -0.1),
          pose(O(1), O(-1), 0, 0), pose(O(1), X(-1), 0.35, 0.12), pose(X(1), O(-1), -0.35, -0.12), pose(X(1), X(-1), 0, 0)];
      }
      const q = keyed(g.robot, b, snap(b, 0.2), K);
      g.L = q.L; g.R = q.R;
      for (let i = 0; i < 3; i++) { g.head[i] = q.head[i]; g.chest[i] = q.chest[i]; }
      dip = m(0.015 + 0.03 * pk(b - 0.08, 6)) * B;
      break;
    }
  }
  // the hips ride over whichever foot carries the weight (lifted / touching feet carry little)
  if (style === 'disco' || style === 'step' || style === 'bon') {
    const xl = a0 + feet[0][0], xr = -a0 + feet[1][0];
    sway += (xl * wL + xr * wR) / Math.max(0.2, wL + wR) * 0.85;
    g.hips[2] += ((feet[0][1] * wL + feet[1][1] * wR) / Math.max(0.2, wL + wR)) * 0.6;
  }
  roll += sway / Math.max(0.05, k) * 1.4;
  // knees: hips sink and go back a little, the trunk leans forward to balance, the head keeps level
  g.hips[0] += sway; g.hips[1] = -dip; g.hips[2] -= dip * 0.35;
  g.hipsR[0] = -dip * 0.6; g.hipsR[1] += yaw; g.hipsR[2] += roll;
  g.spine[0] += dip * 1.5; g.head[0] -= dip * 1.1;
  g.eyes = null;
  if (mir) {
    // swap sides: arms, feet; negate x offsets, yaw and roll
    const L = g.L, R = g.R;
    g.L = R && { t: [-R.t[0], R.t[1], R.t[2]], p: [-R.p[0], R.p[1], R.p[2]], hand: [R.hand[0], -R.hand[1], -R.hand[2]] };
    g.R = L && { t: [-L.t[0], L.t[1], L.t[2]], p: [-L.p[0], L.p[1], L.p[2]], hand: [L.hand[0], -L.hand[1], -L.hand[2]] };
    for (let i = 0; i < 4; i++) { _f[0][i] = feet[1][i]; _f[1][i] = feet[0][i]; }
    for (let s = 0; s < 2; s++) for (let i = 0; i < 4; i++) feet[s][i] = i === 0 ? -_f[s][i] : _f[s][i];
    g.hips[0] = -g.hips[0];
    for (const e of [g.spine, g.chest, g.neck, g.head, g.hipsR]) { e[1] = -e[1]; e[2] = -e[2]; }
  }
  // a bag in the left hand swings along at the side; a cane stays planted (no left-arm dancing)
  if (h.holdL === 'case') { const q = Math.sin(Math.PI * b), d = [0.3 + 0.1 * pk(b), -1, 0.4 * q], n = Math.hypot(...d); g.L = { t: [sx + d[0] / n * reach, sy + d[1] / n * reach, d[2] / n * reach], p: [0.3, 0, -1], hand: [-0.1 * q, 0, 0] }; }
  else if (h.holdL) g.L = null;
  g.home = feet.every((f) => Math.abs(f[0]) < 0.003 && Math.abs(f[1]) < 0.003 && f[2] < 0.003 && Math.abs(f[3]) < 0.03);
}
