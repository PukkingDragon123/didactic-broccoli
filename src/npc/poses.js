// Gestures and faces for the lane regulars, registered into the shared gesture library (see gestures.js
// EXTRA_POSES, poses.js, bizarre.js). Arm targets are wrist positions in chest space (+x = own left, +y up from the
// waist, +z forward, metres for a 1.72 m adult scaled by m()); pose.hands = [finger dir, palm normal] (cosmetics.js).
//   Rohan    hold_book (default carry), sketch, stare, flourish, study (an object held up to the eye)
//   Josuke   pockets, comb (fixing the quiff), dora (a punch rush)
//   Okuyasu  eat, scratch (dim), swipe (a big erasing swipe), shout
//   anyone   arms_crossed
import { GESTURES, EXTRA_POSES } from '../people/gestures.js';
import { EXPRESSIONS } from '../people/face.js';
import '../people/poses.js'; // 'grin', 'cool' faces

Object.assign(EXPRESSIONS, {
  furious: { inner: -2.8, furrow: 1.6, brow: -1.0, upper: 1.15, corner: -1.2, open: 2.6, teeth: 1, mouthW: 1.12, sneer: 1.3 },
  stare: { upper: 1.32, brow: -0.25, inner: -0.9, furrow: 0.5, corner: -0.15, mouthW: 0.9 },
  smug: { corner: 1.3, cheek: 0.5, upper: 0.78, brow: 0.5, mouthW: 1.02 },
  dumb: { open: 1.8, round: 0.7, brow: 1.4, upper: 0.92, mouthW: 0.9, corner: 0.4 },
});

Object.assign(GESTURES, {
  hold_book: { dur: Infinity },
  sketch: { dur: Infinity },
  stare: { dur: Infinity, expr: 'stare' },
  flourish: { dur: 2.8, expr: 'grin' },
  study: { dur: Infinity, expr: 'stare' },
  pockets: { dur: Infinity },
  comb: { dur: 2.4, expr: 'cool' },
  dora: { dur: 2.2, expr: 'furious' },
  eat: { dur: Infinity, expr: 'happy' },
  scratch: { dur: 2.6, expr: 'dumb' },
  swipe: { dur: 2.0, expr: 'furious' },
  shout: { dur: 2.0, expr: 'furious' },
  arms_crossed: { dur: Infinity },
});

const arm = (x, y, z, px, py, pz) => ({ t: [x, y, z], p: [px, py, pz], hand: [0, 0, 0] });
function frame(h) {
  const P = h.P, k = P.H / 1.72;
  return { P, sx: P.shX, sy: P.shoulderY - P.waistY, eye: P.eyeY - P.waistY, zf: P.zf, m: (v) => v * k };
}
const smooth = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
/** 0..1: a glance up from the page every few seconds (deterministic per gesture time). */
function glance(t) { const c = t % 4.6; return c < 3.2 ? 0 : smooth((c - 3.2) / 0.25) * (1 - smooth((c - 4.3) / 0.3)); }

Object.assign(EXTRA_POSES, {
  // the sketchbook hugged against the stomach, the other arm loose (Rohan's default carry)
  hold_book(t, h, g) {
    const { sx, m } = frame(h);
    g.hands = { L: null, R: null };
    g.L = arm(sx * 0.25, -m(0.06), m(0.16), 1, -0.4, -0.6);
    g.hands.L = [-1, 0.15, 0.05, 0, 0.05, -1];
  },
  // the book up in front of the chest, the pen scratching away; a sharp glance up at the subject now and then
  sketch(t, h, g) {
    const { sy, m } = frame(h);
    g.hands = { L: null, R: null };
    g.L = arm(m(0.07), sy - m(0.22), m(0.25), 1, -1, -0.4);
    g.hands.L = [-0.85, 0.25, 0.35, 0.05, 0.72, -0.68];
    const up = glance(t), sc = Math.sin(t * 13) * m(0.014) * (1 - up), sc2 = Math.sin(t * 7.3 + 1) * m(0.01) * (1 - up);
    g.R = arm(-m(0.03) + sc, sy - m(0.15) + sc2 + up * m(0.03), m(0.31), -1, -0.8, -0.3);
    g.hands.R = [0.25, -0.8, 0.5, -0.9, 0, 0.3];
    g.chest[0] = 0.05;
    g.neck[0] = 0.12 * (1 - up);
    g.head[0] = 0.36 * (1 - up) - 0.06 * up; g.head[2] = 0.05;
    g.eyes = [0, 1.6 * (1 - up)];
  },
  // leaning in, hands (and book) behind the back, eyes wide: studying you up close
  stare(t, h, g) {
    const { m } = frame(h);
    g.hands = { L: null, R: null };
    g.L = arm(m(0.05), -m(0.2), -m(0.12), 1, 0.2, 0.9);
    g.R = arm(-m(0.05), -m(0.21), -m(0.12), -1, 0.2, 0.9);
    g.spine[0] = 0.18; g.chest[0] = 0.14 + Math.sin(t * 0.9) * 0.02;
    g.head[0] = -0.26; g.head[2] = Math.sin(t * 0.6) * 0.12;
    g.eyes = [Math.sin(t * 2.3) * 0.6, 0];
  },
  // the pen flicks up and slashes a line through the air, the book flung out to the side: then a dramatic hold
  flourish(t, h, g) {
    const { sx, sy, eye, zf, m } = frame(h);
    g.hands = { L: null, R: null };
    const k = smooth(t / 0.55);
    const a = [-sx - m(0.2), sy + m(0.42), m(0.08)], b = [m(0.12), sy - m(0.02), m(0.48)];
    g.R = arm(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, -1, -0.5, -0.4);
    g.hands.R = [0.4 * k - 0.2, 0.6 - k, 0.6 * k + 0.2, -0.6, 0, 0.4];
    g.L = arm(sx + m(0.36), sy - m(0.06), m(0.12), 1, -0.3, -0.4);
    g.hands.L = [1, 0.1, 0.1, 0, 0, 1];
    g.chest[1] = 0.32 * k - 0.15; g.spine[2] = -0.06 * k; g.hipsR[1] = -0.18 * k;
    g.head[1] = -0.2 * k; g.head[0] = -0.1;
    g.eyes = [-1 * k, 0];
    void eye; void zf;
  },
  // something held up close to the eye in the right hand and turned slowly (a figure under the loupe)
  study(t, h, g) {
    const { eye, zf, m } = frame(h);
    g.hands = { L: null, R: null };
    const turn = Math.sin(t * 0.9) * 0.5;
    g.R = arm(-m(0.05), eye - m(0.1), zf + m(0.22), -1, -1, -0.2);
    g.hands.R = [0.25 * turn, 1, 0.3, -0.2 + turn * 0.5, 0, -1];
    g.L = arm(m(0.02), -m(0.04), m(0.16), 1, -0.4, -0.6);
    g.hands.L = [-1, 0.15, 0.05, 0, 0.05, -1];
    g.head[0] = 0.12; g.head[2] = -0.08 + turn * 0.06; g.chest[0] = 0.06;
    g.eyes = [0, 0.5];
  },
  // hands in the front pockets, weight back, chin up
  pockets(t, h, g) {
    const { m } = frame(h);
    g.hands = { L: null, R: null };
    g.L = arm(m(0.135), -m(0.11), m(0.06), 1, 0.15, -0.8);
    g.hands.L = [0.1, -0.7, 0.7, -1, 0, 0];
    g.R = arm(-m(0.135), -m(0.11), m(0.06), -1, 0.15, -0.8);
    g.hands.R = [-0.1, -0.7, 0.7, 1, 0, 0];
    g.chest[0] = -0.05; g.head[0] = -0.06 + Math.sin(t * 0.7) * 0.02; g.head[2] = 0.04;
  },
  // a comb run back along the side of the quiff, the other hand cupping it
  comb(t, h, g) {
    const { eye, zf, m } = frame(h);
    g.hands = { L: null, R: null };
    const s = Math.sin(t * 5.5) * 0.5 + 0.5;
    g.R = arm(-m(0.11), eye + m(0.08), zf - m(0.02) - s * m(0.12), -1, 0.2, 0.3);
    g.hands.R = [0.2, 0.3, -1, 1, 0, 0];
    g.L = arm(m(0.1), eye + m(0.1), zf + m(0.05), 1, 0.2, 0.2);
    g.hands.L = [-0.3, 0.6, 0.7, -0.8, 0, 0.4];
    g.head[0] = -0.12; g.head[1] = 0.1; g.head[2] = -0.06;
    g.eyes = [-1, -0.6];
  },
  // a blur of fists: alternating straight punches at the camera
  dora(t, h, g) {
    const { sx, sy, m } = frame(h);
    g.hands = { L: null, R: null };
    const ph = t * 16, l = Math.max(0, Math.sin(ph)), r = Math.max(0, Math.sin(ph + Math.PI));
    const jx = Math.sin(t * 23) * m(0.06), jy = Math.cos(t * 19) * m(0.05);
    g.L = arm(sx * 0.4 - l * m(0.1) + jx, sy - m(0.1) + jy * l, m(0.16) + l * m(0.38), 1, -0.6, -0.5);
    g.R = arm(-sx * 0.4 + r * m(0.1) - jx, sy - m(0.1) - jy * r, m(0.16) + r * m(0.38), -1, -0.6, -0.5);
    g.hands.L = [0, 0.1, 1, 0.3, -1, 0]; g.hands.R = [0, 0.1, 1, -0.3, -1, 0];
    g.chest[1] = (l - r) * 0.28; g.spine[0] = 0.08; g.head[0] = -0.08;
    g.hips[1] = -m(0.02);
  },
  // munching something held in both hands
  eat(t, h, g) {
    const { eye, zf, m } = frame(h);
    g.hands = { L: null, R: null };
    const chew = Math.max(0, Math.sin(t * 9)) * m(0.012);
    g.R = arm(-m(0.03), eye - m(0.17) + chew, zf + m(0.08), -1, -1, -0.2);
    g.L = arm(m(0.03), eye - m(0.18) + chew, zf + m(0.08), 1, -1, -0.2);
    g.hands.R = [0.4, 0.8, 0.3, 0.6, 0, -0.8]; g.hands.L = [-0.4, 0.8, 0.3, -0.6, 0, -0.8];
    g.head[0] = 0.08 + Math.sin(t * 9) * 0.04; g.chest[0] = 0.04;
  },
  // a slow scratch at the back of the head: thinking hurts
  scratch(t, h, g) {
    const { eye, m } = frame(h);
    g.hands = { L: null, R: null };
    const s = Math.sin(t * 11) * m(0.015);
    g.R = arm(-m(0.06) + s, eye + m(0.12), -m(0.04), -1, 0.4, 0.4);
    g.hands.R = [0.3, 0.2, -1, 1, 0, 0];
    g.head[0] = 0.1; g.head[2] = -0.16; g.head[1] = 0.1;
    g.eyes = [1.5, -1.2];
  },
  // wind up high, then one huge swipe down across the body (erasing whatever's in front)
  swipe(t, h, g) {
    const { sx, sy, m } = frame(h);
    g.hands = { L: null, R: null };
    const k = smooth((t - 0.45) / 0.18);
    const a = [sx * 0.4, sy + m(0.38), m(0.18)], b = [-sx - m(0.28), -m(0.06), m(0.36)];
    g.R = arm(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, -1, -0.2, -0.4);
    g.hands.R = [-0.2 - 0.5 * k, 1 - 1.6 * k, 0.4, 0, 0, 1];
    g.L = arm(sx + m(0.1), -m(0.05), m(0.12), 1, -0.4, -0.6);
    g.chest[1] = 0.3 - 0.6 * k; g.spine[0] = 0.12 * k; g.head[0] = -0.05;
  },
  // fists up by the shoulders, leaning in to yell
  shout(t, h, g) {
    const { sx, sy, m } = frame(h);
    g.hands = { L: null, R: null };
    const b = Math.abs(Math.sin(t * 9)) * m(0.02);
    g.L = arm(sx + m(0.06), sy + m(0.02) + b, m(0.14), 1, -1, -0.5);
    g.R = arm(-sx - m(0.06), sy + m(0.02) + b, m(0.14), -1, -1, -0.5);
    g.hands.L = [0, 1, 0.2, 0, 0, 1]; g.hands.R = [0, 1, 0.2, 0, 0, 1];
    g.spine[0] = 0.12; g.chest[0] = 0.06; g.head[0] = -0.2;
  },
  arms_crossed(t, h, g) {
    const { sy, m } = frame(h);
    g.hands = { L: null, R: null };
    g.L = arm(-m(0.07), sy - m(0.21), m(0.19), 1, -1, -0.6);
    g.R = arm(m(0.07), sy - m(0.23), m(0.2), -1, -1, -0.6);
    g.hands.L = [-1, 0.1, 0.2, 0, 1, 0]; g.hands.R = [1, 0.1, 0.2, 0, 1, 0];
    g.chest[0] = -0.04; g.head[0] = -0.05 + Math.sin(t * 0.8) * 0.02;
  },
});
