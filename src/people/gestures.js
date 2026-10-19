// Gesture library. Each gesture returns arm IK targets (wrist positions + elbow poles, in the chest bone's
// space, metres for a 1.72 m adult — scaled by height) and / or extra joint angles. t = seconds since start,
// k = 0..1 envelope (already blended by the caller), h = the Human (for proportions / look targets).
// Defaults: dur (one-shot length; Infinity = hold until clearGesture), expr (face while it plays).

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
};

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
  g.L = g.R = null; g.prop = false; g.box = false; g.lift = 0;
  g.spine[0] = g.spine[1] = g.spine[2] = 0; g.chest[0] = g.chest[1] = g.chest[2] = 0;
  g.neck[0] = g.neck[1] = g.neck[2] = 0; g.head[0] = g.head[1] = g.head[2] = 0; g.hips[0] = g.hips[1] = g.hips[2] = 0;
  g.eyes = null;
  const arm = (x, y, z, px, py, pz, hx = 0, hy = 0, hz = 0) => ({ t: [x, y, z], p: [px, py, pz], hand: [hx, hy, hz] });
  switch (name) {
    case 'wave': {
      const w = Math.sin(t * 9.5);
      g.R = arm(-sx - S(0.13, k) - w * S(0.05, k), sy + S(0.2, k) + Math.abs(w) * S(0.012, k), S(0.1, k), -1, -0.9, -0.3, 0, -1.4, w * 0.35);
      g.head[2] = 0.06; g.chest[2] = 0.05;
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
      const y = P.eyeY - P.waistY - S(0.035, k), z = zf + S(0.27, k);
      g.R = arm(-S(0.045, k), y, z, -1, -0.8, -0.3, -0.2, 0, 1.55);
      g.L = arm(S(0.045, k), y, z, 1, -0.8, -0.3, -0.2, 0, -1.55);
      g.prop = true; g.head[0] = 0.05;
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
      g.R = arm(-S(0.012, k) - c * S(0.075, k), sy - S(0.13, k), S(0.27, k), -1, -0.8, -0.4, 0, -1.3, 0);
      g.L = arm(S(0.012, k) + c * S(0.075, k), sy - S(0.13, k), S(0.27, k), 1, -0.8, -0.4, 0, 1.3, 0);
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
    default: break;
  }
}

function smooth(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
