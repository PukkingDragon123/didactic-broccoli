// Grandpa's body language, registered into the shared gesture library (gestures.js EXTRA_POSES, as src/npc/poses.js
// does). Two long-running poses that he switches between, each driven by a mutable opts object he owns (so a new
// arm action never restarts the body pose):
//   'gp_stand'  standing with his cane in the left hand (or both hands free when it leans somewhere)
//   'gp_sit'    sitting on his stool (a full-body pose: hips down, feet forward; opts.k 0..1 eases him down and up)
// opts: { k, act, at, prev, pt, from, target: Vector3 (point / look), walking, cane: 'hand' | 'free', fan }
//   act (the right arm; blended from the previous act over 0.3 s): wave, beckon, stop, point, thumbs, thump, knock,
//   give, pat, back, shake, cap, scratch, fan, nod, no, laugh, bow, hug, handset (a phone at the ear), shrug
import * as THREE from 'three';
import { GESTURES, EXTRA_POSES } from '../people/gestures.js';

Object.assign(GESTURES, {
  gp_stand: { dur: Infinity },
  gp_sit: { dur: Infinity, legs: true },
  gp_handset: { dur: Infinity },
});

const smooth = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
const arm = (x, y, z, px, py, pz, hx = 0, hy = 0, hz = 0) => ({ t: [x, y, z], p: [px, py, pz], hand: [hx, hy, hz] });
const mixArm = (a, b, u) => (!a ? b : !b ? a : { t: a.t.map((v, i) => lerp(v, b.t[i], u)), p: a.p.map((v, i) => lerp(v, b.p[i], u)), hand: a.hand.map((v, i) => lerp(v, b.hand[i], u)) });
const _v = new THREE.Vector3();

function frame(h) {
  const P = h.P, k = P.H / 1.72;
  return { P, k, sx: P.shX, sy: P.shoulderY - P.waistY, eye: P.eyeY - P.waistY, zf: P.zf, m: (v) => v * k };
}

/** The right arm (and the bits of body that go with it) for one act at time t. */
function rightArm(act, t, h, g, o, F, sitting) {
  const { sx, sy, eye, zf, m } = F;
  switch (act) {
    case 'wave': {
      const w = Math.sin(t * 8);
      g.head[2] += 0.06; g.head[1] -= 0.08;
      return arm(-sx - m(0.14) - w * m(0.05), sy + m(0.26), m(0.08), -1, -1.1, -0.4, 0.15, -0.3, -0.25 + w * 0.4);
    }
    case 'beckon': { // oide-oide: arm out, palm down, the hand flapping toward himself
      const f = Math.sin(t * 9);
      return arm(-sx * 0.7, sy - m(0.06), m(0.44), -1, -0.4, -0.3, 0.7 + f * 0.65, 0, 0);
    }
    case 'stop':
      g.chest[0] -= 0.04;
      return arm(-sx * 0.75, sy + m(0.04), m(0.48), -1, -0.6, -0.3, -1.25, 0, 0);
    case 'point': {
      // the arm stretched toward a point in the world, through the chest's frame
      let d = [-0.35, 0.1, 1];
      if (o.target) {
        h.b.chest.updateWorldMatrix(true, false);
        _v.copy(o.target);
        h.b.chest.worldToLocal(_v);
        d = [_v.x + sx, _v.y - sy, Math.max(0.15, _v.z)];
      }
      const n = Math.hypot(d[0], d[1], d[2]) || 1, reach = (h.P.shoulderY - h.P.wristY) * 0.95;
      g.head[1] -= 0.1;
      return arm(-sx + d[0] / n * reach, sy + d[1] / n * reach, d[2] / n * reach, -0.6, -1, -0.2, 0, -0.3, 0);
    }
    case 'thumbs': {
      const b = Math.abs(Math.sin(t * 5)) * m(0.015);
      g.head[0] -= 0.05;
      return arm(-m(0.1), sy - m(0.17) + b, m(0.3), -1, -1, -0.3, -0.6, -0.2, 0);
    }
    case 'thump': { // raise the fist, bring it down on something in front, twice
      const c = (t % 0.9) / 0.9, up = c < 0.6 ? smooth(c / 0.6) : 1 - smooth((c - 0.6) / 0.12);
      g.chest[0] += 0.04 * (1 - up) - 0.05; g.head[0] -= 0.22; // (the box is up on the wall)
      return arm(-sx * 0.45, sy + m(0.12) + up * m(0.14), m(0.38) - up * m(0.08), -1, -0.8, -0.4, -0.4, 0, 0);
    }
    case 'knock': {
      const r = Math.max(0, Math.sin(t * 15)) * (t % 2.2 < 1.0 ? 1 : 0);
      return arm(-m(0.12), eye - m(0.16), zf + m(0.36) - r * m(0.06), -1, -0.8, -0.2, -0.3, 0, 0);
    }
    case 'give':
      g.chest[0] += 0.05; g.head[0] += 0.08;
      return arm(-m(0.08), sy - m(0.26), m(0.4), -1, -0.8, -0.3, 0.2, 0, -1.4);
    case 'pat': {
      const p = Math.max(0, Math.sin(t * 6)) * m(0.04);
      return arm(-m(0.12), sy - m(0.1) + p, m(0.46), -1, -0.6, -0.3, -1.1, 0, 0);
    }
    case 'back': // a hand to the small of his back: "oof"
      g.spine[0] -= 0.1; g.chest[0] -= 0.06; g.head[0] -= 0.08;
      return arm(-sx * 0.55, -m(0.04), -m(0.17), -1, 0.6, 0.6, 0, 0, 0);
    case 'shake': {
      const s = Math.sin(t * 16) * m(0.03);
      g.chest[0] += 0.05; g.head[0] -= 0.1;
      return arm(-sx - m(0.02), sy + m(0.12) + s, m(0.22), -1, -0.6, -0.3);
    }
    case 'cap': // a finger to the brim of the flat cap
      return arm(-m(0.06), eye + m(0.08), zf + m(0.1), -1, -1.2, 0.2, -0.4, 0, 0);
    case 'scratch': {
      const s = Math.sin(t * 11) * m(0.015);
      g.head[0] += 0.08; g.head[2] -= 0.12;
      return arm(-m(0.06) + s, eye + m(0.12), -m(0.03), -1, 0.4, 0.4);
    }
    case 'fan': { // the uchiwa at his right cheek, flicked from the wrist
      const f = Math.sin(t * 11);
      g.head[2] -= 0.04;
      return arm(-m(0.13), eye - m(0.2), zf + m(0.2), -1, -1, -0.3, 0.1, 0.45 + f * 0.45, -0.25);
    }
    case 'handset': // a phone at the right ear
      g.head[2] -= 0.12;
      return arm(-m(0.1), eye - m(0.04), zf - m(0.02), -1, -1.1, 0.1, -0.5, 0.3, 0);
    case 'shrug':
      g.head[2] += 0.1;
      return arm(-sx - m(0.12), -m(0.02) + Math.sin(Math.min(1, t * 3) * Math.PI) * m(0.06), m(0.18), -1, -0.2, -0.6, 0, 0, -0.9);
    case 'nod': g.head[0] += Math.max(0, Math.sin(t * 7)) * 0.2 * (t < 1.4 ? 1 : 0); return null;
    case 'no': g.head[1] += Math.sin(t * 9) * 0.28 * (t < 1.3 ? 1 : 0); return null;
    case 'laugh': {
      const b = Math.abs(Math.sin(t * 11));
      g.spine[0] += 0.12 + b * 0.04; g.head[0] -= 0.2 - b * 0.08;
      return arm(-m(0.08), m(0.02), m(0.2), -1, -0.5, -0.6);
    }
    case 'bow': {
      const env = t < 0.8 ? smooth(t / 0.8) : t < 1.6 ? 1 : 1 - smooth((t - 1.6) / 0.8);
      g.spine[0] += 0.34 * env; g.chest[0] += 0.18 * env; g.head[0] += 0.12 * env;
      return null;
    }
    case 'hug': {
      const p = Math.max(0, Math.sin(t * 5)) * m(0.03) * (t > 1.2 ? 1 : 0);
      g.chest[0] += 0.1; g.head[0] += 0.12; g.head[2] += 0.1;
      return arm(m(0.16), sy - m(0.06) + p, m(0.3), -1, -0.2, 0.4, 0, 0.3, 0);
    }
    default: return sitting ? arm(-sx * 0.55, -m(0.18), m(0.3), -1, -0.3, -0.6, 0, 0, -0.4) : null;
  }
}

/** The left arm: the cane hand (planted beside him), or the other half of a hug. */
function leftArm(act, t, h, g, o, F, sitting) {
  const { sx, sy, m } = F;
  if (act === 'hug') return arm(-m(0.12), sy - m(0.14), m(0.32), 1, -0.2, 0.4, 0, -0.3, 0);
  if (o.cane === 'free' && !sitting) return null;
  if (sitting) return arm(sx * 0.25, m(0.1), m(0.3), 1, -0.6, -0.5, 0, 0, 0.5);
  if (o.walking) return null;
  return arm(sx + m(0.05), -m(0.32), m(0.14), 1, -0.1, -0.7, 0.1, 0, 0.2);
}

function bodyPose(t, h, g, o, sitting) {
  const F = frame(h);
  o.at = (o.at || 0);
  const u = smooth(o.at / 0.32);
  const cur = rightArm(o.act, o.at, h, g, o, F, sitting);
  if (u < 1 && o.prev !== undefined && o.prev !== o.act) {
    // blend from the previous act's pose (body offsets of the old act are dropped: they're small)
    const before = rightArm(o.prev, o.pt || 0, h, { spine: [0, 0, 0], chest: [0, 0, 0], head: [0, 0, 0], neck: [0, 0, 0] }, o, F, sitting);
    const rest = rightArm(null, 0, h, g, o, F, sitting) || arm(-F.sx - F.m(0.03), -F.m(0.36), F.m(0.06), -1, 0, -0.6);
    g.R = mixArm(before || rest, cur || rest, u);
    if (!cur && !before) g.R = null;
  } else g.R = cur;
  const Lw = leftArm(o.act, o.at, h, g, o, F, sitting);
  g.L = Lw;
  if (o.fan && o.act !== 'fan' && !o.walking && sitting && !o.act) {
    // fanning while he sits: the default when idle and the fan is out
    g.R = rightArm('fan', t, h, g, o, F, sitting);
  }
}

Object.assign(EXTRA_POSES, {
  gp_stand(t, h, g, o) { bodyPose(t, h, g, o, false); },
  gp_sit(t, h, g, o) {
    const P = h.P, k = smooth(o.k ?? 0);
    const drop = Math.max(0, P.hipY - (o.seat ?? 0.45) - 0.07);
    g.hips[0] = 0; g.hips[1] = -drop * k; g.hips[2] = -0.05 * k;
    g.hipsR[0] = -0.08 * k; g.hipsR[1] = 0; g.hipsR[2] = 0;
    const fz = 0.2 * k, fx = 0.03 * k;
    g.feet[0][0] = fx; g.feet[0][1] = fz; g.feet[0][2] = 0; g.feet[0][3] = 0;
    g.feet[1][0] = -fx; g.feet[1][1] = fz - 0.03 * k; g.feet[1][2] = 0; g.feet[1][3] = 0;
    g.home = k < 0.02;
    g.spine[0] = 0.1 * k; g.chest[0] = 0.08 * k;
    if (k > 0.5) bodyPose(t, h, g, o, true);
    else bodyPose(t, h, g, o, false);
  },
  // anyone (your character on the phone): a handset held to the right ear, the other hand on the hip
  gp_handset(t, h, g) {
    const F = frame(h), { sx, eye, zf, m } = F;
    g.R = arm(-m(0.09), eye - m(0.05), zf - m(0.01), -1, -1.2, 0.1, -0.4, 0.4, 0.2);
    g.L = arm(sx + m(0.1), -m(0.02), m(0.02), 1, 0.4, -0.4);
    g.prop = [-m(0.1), eye - m(0.02), zf + m(0.02)];
    g.propRot = [0, 0, 0];
    g.head[2] = -0.14; g.head[0] = 0.05;
  },
});
