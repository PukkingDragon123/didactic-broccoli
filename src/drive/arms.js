// Your arms on the steering wheel while you drive: blocky (chunky boxes, flat shaded), but connected and bending: an
// upper arm in your top's colour, the forearm (bare for a T-shirt or an aloha shirt, sleeved for a sweater / flannel),
// a fist round the rim with a thumb on top. The hands sit at ten-to-two and turn with the wheel (they hold their grip
// for about a quarter turn either way, then slide round the rim); the right one reaches for the horn pad. A two-bone
// IK puts the elbows down and out. Built in the van's body space, so they ride the suspension with you.
//   const a = new CabArms(van, avatar)   a.update(dt, { turn, horn })   a.visible = bool   a.dispose()
import * as THREE from 'three';
import { CAB, cabShade } from '../life/van.js';
import { LOOK } from '../people/avatar.js';

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4();
const Y = new THREE.Vector3(0, 1, 0);
const col = (list, id) => (list.find((o) => o.id === id) || list[0]).col;

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
      press: 0,
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
  }

  set visible(v) { this.group.visible = v; }
  get visible() { return this.group.visible; }

  /** turn: the steering wheel's turn (rad, > 0 clockwise); horn: the right hand on the horn pad (0..1). */
  update(dt, { turn = 0, horn = 0 } = {}) {
    const cab = this.van.cab;
    if (!cab || !this.group.visible) return;
    cab.wheel.updateMatrix();
    const R = CAB.wheelR - 0.004;
    for (const S of this.sides) {
      // where the hand holds the rim (wheel plane: x = your left, y = up), turning with the wheel up to a point
      const base = S.sd > 0 ? Math.PI / 2 + 1.0 : Math.PI / 2 - 1.0; // 10 and 2 o'clock
      const grip = base - Math.max(-0.8, Math.min(0.8, turn));
      S.press += ((S.sd < 0 ? horn : 0) - S.press) * Math.min(1, dt * 14);
      const r = R * (1 - S.press * 0.85);
      _a.set(Math.cos(grip) * r, Math.sin(grip) * r, -0.03 - S.press * 0.02).applyMatrix4(cab.wheel.matrix); // -> body space
      const hand = _a;
      const sh = S.shoulder;
      // two-bone IK: elbow down and out
      const L1 = this.upperLen, L2 = this.foreLen;
      _b.subVectors(hand, sh);
      let d = _b.length();
      d = Math.min(d, L1 + L2 - 0.005);
      _b.normalize();
      const a = (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d);
      const along = L1 * a, h = Math.sqrt(Math.max(0, L1 * L1 - along * along));
      _c.set(S.sd * 0.55, -1, -0.15).normalize(); // pole
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
      // the fist round the rim, its long side along the rim's tangent, the thumb on top
      S.fist.position.copy(tip);
      _m.lookAt(elbow, tip, Y);
      S.fist.quaternion.setFromRotationMatrix(_m);
      S.thumb.position.copy(tip).add(_b.set(0, 0.04, 0).applyQuaternion(S.fist.quaternion));
      S.thumb.quaternion.copy(S.fist.quaternion);
    }
    for (const im of this.meshes) {
      im.userData.slots.forEach((o, i) => { o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
      im.instanceMatrix.needsUpdate = true;
    }
  }

  /** Stretch a unit box from a to b. */
  limb(o, a, b) {
    const d = _b.subVectors(b, a), len = d.length() || 1e-3;
    o.position.copy(a).addScaledVector(d, 0.5);
    _m.lookAt(a, b, Y);
    o.quaternion.setFromRotationMatrix(_m);
    o.scale.z = len + 0.02;
    void _q;
  }

  dispose() {
    this.group.parent?.remove(this.group);
    for (const im of this.meshes) im.dispose();
    this.geo.dispose();
    for (const m of Object.values(this.mats)) m.dispose();
  }
}
