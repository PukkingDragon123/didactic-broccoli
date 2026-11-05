// Your arms in the driver's seat for the opening's cab shots: blocky (chunky boxes, flat shaded) but connected and
// bending: an upper arm in your top's colour, the forearm (bare for a T-shirt or an aloha shirt, sleeved for a
// sweater / flannel), a fist with a thumb on top. Each hand either holds the wheel's rim (the left at ten to two, the
// right at ten past) or reaches for a point in the van's body space (the right one takes the key out of the ignition);
// moves between the two are eased along a slight arc. A two-bone IK puts the elbows down and out. Built in the van's
// body space, so they ride the body's shudder with you.
//   const a = new CabArms(van, avatar, skinRGB)   a.reach(side, point | null, dur, pole)   a.update(dt)   a.fist(side) ->
//   body point of the fist   a.visible = bool   a.dispose()
// pole: where the elbow points while the hand is away from the wheel (body-space direction; default down and out).
import * as THREE from 'three';
import { CAB, cabShade } from '../life/van.js';
import { LOOK } from '../people/avatar.js';

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3(), _m = new THREE.Matrix4();
const Y = new THREE.Vector3(0, 1, 0);
const col = (list, id) => (list.find((o) => o.id === id) || list[0]).col;
const smooth = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };

export class CabArms {
  constructor(van, avatar = {}, skinRGB = null) {
    this.van = van;
    const skin = (skinRGB ? new THREE.Color(skinRGB[0] / 255, skinRGB[1] / 255, skinRGB[2] / 255) : new THREE.Color(col(LOOK.skin, avatar.skin))).multiplyScalar(0.72);
    const top = new THREE.Color(col(LOOK.topCol, avatar.topCol));
    const longSleeve = avatar.top === 'knit' || avatar.top === 'flannel';
    const mat = (c) => cabShade(new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true }), 0.4);
    this.mats = { skin: mat(skin), top: mat(top), cuff: mat(top.clone().multiplyScalar(0.8)) };
    this.geo = new THREE.BoxGeometry(1, 1, 1);
    this.group = new THREE.Group();
    this.group.name = 'cab-arms';
    // every block is an instance of one unit box: one instanced mesh per material (skin, top, cuff)
    this.slots = { skin: [], top: [], cuff: [] };
    const part = (m, sx, sy, sz) => { const key = m === this.mats.skin ? 'skin' : m === this.mats.top ? 'top' : 'cuff'; const o = new THREE.Object3D(); o.scale.set(sx, sy, sz); o.material = m; this.slots[key].push(o); return o; };
    this.sides = [1, -1].map((sd) => ({
      sd, // +1: your left arm (the van's +x), -1: your right
      upper: part(this.mats.top, 0.105, 0.105, 1),
      fore: part(longSleeve ? this.mats.top : this.mats.skin, 0.068, 0.064, 1),
      cuff: part(longSleeve ? this.mats.cuff : this.mats.top, 0.112, 0.112, 0.08),
      elbow: part(longSleeve ? this.mats.top : this.mats.skin, 0.095, 0.095, 0.095),
      fist: part(this.mats.skin, 0.075, 0.065, 0.09),
      thumb: part(this.mats.skin, 0.03, 0.03, 0.05),
      shoulder: new THREE.Vector3(-0.34 + sd * 0.24, 1.14, 0.9),
      hand: new THREE.Vector3(), // where the fist is now (body space)
      move: null, // { from, t, dur }
      at: null, // the point it holds when it isn't on the wheel
      pole: new THREE.Vector3(sd * 0.55, -1, -0.15).normalize(), // the elbow: down and out
      poleTo: new THREE.Vector3(sd * 0.55, -1, -0.15).normalize(),
    }));
    this.meshes = Object.entries(this.slots).filter(([, l]) => l.length).map(([k, l]) => {
      const im = new THREE.InstancedMesh(this.geo, this.mats[k], l.length);
      im.frustumCulled = false; im.castShadow = false;
      im.userData.slots = l;
      this.group.add(im);
      return im;
    });
    van.body.add(this.group);
    this.upperLen = 0.27; this.foreLen = 0.25;
    for (const S of this.sides) S.hand.copy(this.grip(S));
  }

  set visible(v) { this.group.visible = v; }
  get visible() { return this.group.visible; }

  /** Where a hand holds the wheel's rim (body space): ten to two. */
  grip(S, out = new THREE.Vector3()) {
    const cab = this.van.cab;
    cab.wheel.updateMatrix(); cab.spin.updateMatrix();
    const a = S.sd > 0 ? Math.PI / 2 - 1.0 : Math.PI / 2 + 1.0, R = CAB.wheelR - 0.004; // (the wheel's +x is your left)
    return out.set(Math.cos(a) * R, Math.sin(a) * R, -0.03).applyMatrix4(cab.wheel.matrix);
  }

  /** Move a hand ('left' / 'right') to a body-space point over `dur` seconds, or back onto the wheel (point null). */
  reach(side, point, dur = 0.6, pole = null) {
    const S = this.sides[side === 'left' ? 0 : 1];
    S.move = { from: S.hand.clone(), t: 0, dur: Math.max(0.01, dur) };
    S.at = point ? point.clone() : null;
    if (pole) S.poleTo.copy(pole).normalize(); else S.poleTo.set(S.sd * 0.55, -1, -0.15).normalize();
    if (dur <= 0.01) S.pole.copy(S.poleTo);
  }

  /** The fist's centre (body space). */
  fist(side, out = new THREE.Vector3()) { return out.copy(this.sides[side === 'left' ? 0 : 1].hand); }

  update(dt) {
    if (!this.van.cab || !this.group.visible) return;
    for (const S of this.sides) {
      const goal = S.at ? _a.copy(S.at) : this.grip(S, _a);
      if (S.move) {
        // eased along a slight arc (lifted off the rim, set down on the target)
        const M = S.move;
        M.t = Math.min(M.dur, M.t + dt);
        const k = smooth(M.t / M.dur);
        S.hand.lerpVectors(M.from, goal, k);
        S.hand.y += Math.sin(k * Math.PI) * 0.035;
        if (M.t >= M.dur) S.move = null;
      } else S.hand.copy(goal);
      S.pole.lerp(S.poleTo, Math.min(1, dt * 5)).normalize();
      this.solve(S);
    }
    for (const im of this.meshes) {
      im.userData.slots.forEach((o, i) => { o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
      im.instanceMatrix.needsUpdate = true;
    }
  }

  /** Two-bone IK from the shoulder to the hand: the elbow down and out; the fist along the forearm, thumb on top. */
  solve(S) {
    const hand = S.hand, sh = S.shoulder, L1 = this.upperLen, L2 = this.foreLen;
    _b.subVectors(hand, sh);
    let d = _b.length();
    d = Math.min(d, L1 + L2 - 0.005);
    _b.normalize();
    const a = (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d);
    const along = L1 * a, h = Math.sqrt(Math.max(0, L1 * L1 - along * along));
    _c.copy(S.pole); // pole
    _c.addScaledVector(_b, -_c.dot(_b)).normalize();
    const elbow = _d.copy(sh).addScaledVector(_b, along).addScaledVector(_c, h);
    const tip = _c.copy(sh).addScaledVector(_b, d);
    this.limb(S.upper, sh, elbow);
    this.limb(S.fore, elbow, tip);
    S.elbow.position.copy(elbow);
    S.elbow.quaternion.copy(S.upper.quaternion);
    // sleeve cuff at the elbow (short sleeves) or the wrist (long)
    S.cuff.position.copy(S.fore.material === this.mats.skin ? elbow : tip);
    S.cuff.quaternion.copy(S.fore.quaternion);
    S.fist.position.copy(tip);
    _m.lookAt(elbow, tip, Y);
    S.fist.quaternion.setFromRotationMatrix(_m);
    S.thumb.position.copy(tip).add(_b.set(0, 0.04, 0).applyQuaternion(S.fist.quaternion));
    S.thumb.quaternion.copy(S.fist.quaternion);
  }

  /** Stretch a unit box from a to b. */
  limb(o, a, b) {
    const d = _b.subVectors(b, a), len = d.length() || 1e-3;
    o.position.copy(a).addScaledVector(d, 0.5);
    _m.lookAt(a, b, Y);
    o.quaternion.setFromRotationMatrix(_m);
    o.scale.z = len + 0.02;
  }

  dispose() {
    this.group.parent?.remove(this.group);
    for (const im of this.meshes) im.dispose();
    this.geo.dispose();
    for (const m of Object.values(this.mats)) m.dispose();
  }
}
