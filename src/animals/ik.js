// Leg solving for the animal rigs: a two-bone IK (upper leg, lower leg) to a wrist / hock target, elbows bending back and
// knees forward in the trunk's frame, and a paw that lies flat on the floor while it bears weight.
//   const L = legChain(J, ['legFL', 'armFL', 'pawFL'], footRest, hind, side)    (J: rest joints, root space)
//   solveLeg(bones, L, { piv, end, foot, fwd, parentQ, contact, flex })      (all root space; sets the three bones)
import * as THREE from 'three';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const X = new THREE.Vector3(1, 0, 0);
const _w3 = new THREE.Vector3(), _w4 = new THREE.Vector3(), _w5 = new THREE.Vector3(), _w6 = new THREE.Vector3(), _w7 = new THREE.Vector3(), _w8 = new THREE.Vector3(), _w9 = new THREE.Vector3();
const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _qc = new THREE.Quaternion(), _qd = new THREE.Quaternion(), _qe = new THREE.Quaternion(), _qf = new THREE.Quaternion();
const _ma = new THREE.Matrix4(), _mb = new THREE.Matrix4(), _x1 = new THREE.Vector3(), _x2 = new THREE.Vector3(), _x3 = new THREE.Vector3();

/** Rotation taking a bone's rest direction (rest side = +x) to `dir`, with its side axis on `side`. */
export function aim(restDir, dir, side, out) {
  _x1.set(1, 0, 0).addScaledVector(restDir, -restDir.x).normalize();
  _x2.crossVectors(_x1, restDir);
  _ma.makeBasis(_x1, restDir, _x2);
  _x3.copy(side).addScaledVector(dir, -side.dot(dir)).normalize();
  _x2.crossVectors(_x3, dir);
  _mb.makeBasis(_x3, dir, _x2);
  _mb.multiply(_ma.transpose());
  return out.setFromRotationMatrix(_mb);
}

export function legChain(J, [a, m, p], foot, hind, side) {
  const A0 = new THREE.Vector3(...J[a]), M0 = new THREE.Vector3(...J[m]), P0 = new THREE.Vector3(...J[p]), F0 = new THREE.Vector3(...foot);
  return { a, m, p, hind, side, la: A0.distanceTo(M0), lb: M0.distanceTo(P0), d1: M0.clone().sub(A0).normalize(), d2: P0.clone().sub(M0).normalize(), d3: F0.clone().sub(P0).normalize(), off: P0.clone().sub(F0), L: A0.y, lift: 0 };
}

/** Pose one leg: piv (hip / shoulder), end (wrist / hock target), foot (contact point), fwd (trunk forward). */
export function solveLeg(b, L, o) {
  const A = b[L.a], M = b[L.m], Pw = b[L.p], hind = L.hind, piv = o.piv;
  const pole = _w3.copy(o.fwd).multiplyScalar(hind ? 1 : -1).add(_w4.set(0, hind ? 0.15 : -0.1, 0));
  const d = _w4.subVectors(o.end, piv), dist = clamp(d.length(), Math.abs(L.la - L.lb) + L.la * 0.06, L.la + L.lb - L.la * 0.02);
  d.normalize();
  const pv = pole.addScaledVector(d, -pole.dot(d)).normalize();
  const ca = clamp((L.la * L.la + dist * dist - L.lb * L.lb) / (2 * L.la * dist), -1, 1), sa = Math.sqrt(1 - ca * ca);
  const elbow = _w5.copy(piv).addScaledVector(d, L.la * ca).addScaledVector(pv, L.la * sa);
  const wrist = _w6.copy(piv).addScaledVector(d, dist);
  const u1 = _w7.subVectors(elbow, piv).normalize(), u2 = _w8.subVectors(wrist, elbow).normalize();
  const side = hind ? _w9.crossVectors(pv, d) : _w9.crossVectors(d, pv);
  const r1 = aim(L.d1, u1, side, _qa);
  A.quaternion.copy(_qb.copy(o.parentQ).invert()).multiply(r1);
  const r2 = aim(L.d2, u2, side, _qc);
  M.quaternion.copy(_qb.copy(r1).invert()).multiply(r2);
  const free = _qd.copy(r2).multiply(_qe.setFromAxisAngle(X, o.flex || 0));
  const planted = hind ? _qe.setFromUnitVectors(L.d3, _w7.subVectors(o.foot, wrist).normalize()) : _qe.identity();
  const r3 = _qf.copy(free).slerp(planted, o.contact);
  Pw.quaternion.copy(_qb.copy(r2).invert()).multiply(r3);
}
