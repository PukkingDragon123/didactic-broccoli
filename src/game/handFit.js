// Keeps the first-person thumb from passing through the fingers (src/game/FPBody.js): after a finger pose is set, the
// thumb's two outer segments and the four fingers are treated as capsules in hand space; wherever the thumb sinks into a
// finger, the whole thumb turns about its base (a small rotation that moves the deepest contact point straight out of
// the finger), a few times over, until they only touch. A pinch then meets pad to pad, a fist folds the thumb over the
// fingers instead of through them. Pure maths on the bones' local transforms (no world matrices needed).
//   separateThumb(fingers, thumb, opts) -> iterations used
//     fingers: [{ b: [b0, b1, b2], tip, r: [r0, r1, r2] }] x 4    thumb: { b: [b0, b1, b2], tip, r: [r0, r1, r2] }
//     b*: THREE.Object3D bones (b0 a child of the hand, b1 of b0, b2 of b1), tip: the last segment's length, r: radii
import * as THREE from 'three';

const _Q = new THREE.Quaternion(), _R = new THREE.Quaternion();
const T = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
const F = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
const _d1 = new THREE.Vector3(), _d2 = new THREE.Vector3(), _r = new THREE.Vector3(), _ca = new THREE.Vector3(), _cb = new THREE.Vector3();
const _bp = new THREE.Vector3(), _bn = new THREE.Vector3(), _arm = new THREE.Vector3(), _ax = new THREE.Vector3();
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** Joint points of a three-bone digit in hand space: out[0..2] the joints, out[3] the tip. */
export function digitPoints(b, tip, out) {
  out[0].copy(b[0].position); _Q.copy(b[0].quaternion);
  out[1].copy(b[1].position).applyQuaternion(_Q).add(out[0]); _Q.multiply(b[1].quaternion);
  out[2].copy(b[2].position).applyQuaternion(_Q).add(out[1]); _Q.multiply(b[2].quaternion);
  out[3].set(0, -tip, 0).applyQuaternion(_Q).add(out[2]);
  return out;
}
/** Closest points of segments p1-q1 and p2-q2 into ca / cb; returns their distance. */
export function segClosest(p1, q1, p2, q2, ca, cb) {
  _d1.subVectors(q1, p1); _d2.subVectors(q2, p2); _r.subVectors(p1, p2);
  const a = _d1.dot(_d1), e = _d2.dot(_d2), f = _d2.dot(_r), c = _d1.dot(_r), b = _d1.dot(_d2), den = a * e - b * b;
  let s = den > 1e-14 ? clamp((b * f - c * e) / den, 0, 1) : 0, t = e > 1e-14 ? (b * s + f) / e : 0;
  if (t < 0) { t = 0; s = a > 1e-14 ? clamp(-c / a, 0, 1) : 0; } else if (t > 1) { t = 1; s = a > 1e-14 ? clamp((b - c) / a, 0, 1) : 0; }
  ca.copy(p1).addScaledVector(_d1, s); cb.copy(p2).addScaledVector(_d2, t);
  return ca.distanceTo(cb);
}
export function separateThumb(fingers, thumb, { iters = 10, slack = 0.0002 } = {}) {
  for (let it = 0; it < iters; it++) {
    digitPoints(thumb.b, thumb.tip, T);
    let best = slack;
    let found = false;
    for (const fg of fingers) {
      digitPoints(fg.b, fg.tip, F);
      for (let i = 1; i < 3; i++) for (let j = 0; j < 3; j++) {
        const d = segClosest(T[i], T[i + 1], F[j], F[j + 1], _ca, _cb), pen = thumb.r[i] + fg.r[j] - d;
        if (pen <= best) continue;
        best = pen; found = true; _bp.copy(_ca);
        if (d > 1e-6) _bn.subVectors(_ca, _cb).divideScalar(d);
        else _bn.subVectors(T[i + 1], F[j + 1]).normalize(); // (axes crossing: push the thumb tip off the finger's tip)
      }
    }
    if (!found) return it;
    // turn the thumb about its base: the contact point moves along _bn by the depth (and a hair more)
    _arm.subVectors(_bp, T[0]);
    _ax.crossVectors(_arm, _bn);
    const L = _arm.length(), s = _ax.length();
    if (L < 1e-5 || s < 1e-7) return it;
    _R.setFromAxisAngle(_ax.divideScalar(s), Math.min(0.35, (best * 1.15) / s)); // (the point moves s per radian along _bn)
    thumb.b[0].quaternion.premultiply(_R);
  }
  return iters;
}
