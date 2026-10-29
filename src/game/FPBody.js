// Your own body in first person, built from your avatar (src/people/avatar.js) so the sleeves and skin match it.
//  - body: a full Human walking under the camera (legs, torso and feet when you look down). Its head and arms are only
//    drawn into shadow maps (bone matrices collapsed for the colour passes), so you also cast a complete shadow.
//  - arms: a viewmodel rig of their own (rendered on top by the renderer's viewmodel pass, so they never poke into
//    walls): one continuous, smoothly skinned limb per side (shoulder, sleeve, elbow, forearm, wrist, palm, 3-bone
//    fingers and thumb) painted from the avatar's atlas (sleeves) and skin colour, so arm and hand are one piece. The
//    forearm twists along its length (two twist bones) and the IK picks the elbow that lines the forearm up with the
//    back of the hand, so wrists stay natural. Hands grip whatever Held carries (one pose per kind of thing: cradled
//    capsule, figure on the palm, broom in both fists...) and act out contextual actions: coin, crank, twist, notebook
//    pages, broom, wrench, lifting, pouring, flyers, petting, the shutter key, taps on switches. Empty hands rest low in
//    the corners, breathe and swing with your stride. Every change of what a hand does is an eased move along a slight
//    arc, fingers opening on the way to a grip; the whole viewmodel lags a touch behind the head's accelerations, so it
//    has weight. After cutscenes / the PC the hands rise back into view.
import * as THREE from 'three';
import { flyerTexture } from '../gfx/flyers.js';
import { Game } from './Game.js';
import { BONES, BONE_INDEX } from '../people/body.js';
import { ATLAS } from '../people/mesh.js';
import { createAvatarHuman } from '../people/avatar.js';
import { audio } from '../core/audio.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const smoother = (t) => { t = clamp(t, 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };
const outCubic = (t) => 1 - (1 - clamp(t, 0, 1)) ** 3;
const inOutCubic = (t) => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2; };
const outBack = (t, s = 1.6) => { t = clamp(t, 0, 1) - 1; return 1 + t * t * ((s + 1) * t + s); };
const bell = (t) => Math.sin(Math.PI * clamp(t, 0, 1));
/** 0 before a, eased to 1 at b. */
const win = (t, a, b) => smooth((t - a) / (b - a));
const V = () => new THREE.Vector3();
const _v = V(), _v2 = V(), _v3 = V(), _v4 = V(), _v5 = V(), _v6 = V(), _c = V(), _up = V();
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();
const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _box = new THREE.Box3(), _e = new THREE.Euler();
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const N = (x, y, z, out = V()) => out.set(x, y, z).normalize();
const finite = (v) => !!v && Number.isFinite(v.x + v.y + v.z);
const ONE = [1, 1, 1];

// the body's bones that stay out of the colour passes (the camera sits in the head; the viewmodel arms replace these)
const HIDE = ['neck', 'head', 'tailL', 'tailR', 'armL', 'foreL', 'handL', 'armR', 'foreR', 'handR', 'prop'].map((b) => BONE_INDEX[b]);

// ---------------------------------------------------------------- arm + hand model
// Rest frame (rig space, metres; a left arm hanging at the side): +x lateral / the back of the hand, -x towards the body /
// the palm, +z forward / the thumb side, the arm runs down -y. Hand space: origin at the wrist joint, same axes.
// Sizes are for a 1.72 m man and scale with the avatar (k: hand size, ar: arm girth).
const SIDES = 12, FSIDES = 8;
const FING = [ // knuckle [x, y, z], phalanx lengths, half width (z), half thickness (x)
  { k: [-0.001, -0.088, 0.0258], len: [0.04, 0.024, 0.0195], w: 0.0096, t: 0.0089 },
  { k: [-0.0005, -0.0915, 0.0087], len: [0.044, 0.027, 0.0205], w: 0.0099, t: 0.0092 },
  { k: [-0.001, -0.0885, -0.0085], len: [0.041, 0.026, 0.0195], w: 0.0094, t: 0.0087 },
  { k: [-0.0015, -0.0815, -0.0246], len: [0.032, 0.0205, 0.0175], w: 0.0084, t: 0.0079 },
];
const THUMB = { base: [-0.0075, -0.017, 0.0205], len: [0.043, 0.031, 0.026], w: 0.0108, t: 0.0096 };
// thumb orientations (left hand): where it points, which way its nail faces
const T_RELAX = [[-0.44, -0.76, 0.48], [0.4, 0.1, 1]];
const T_OPPOSE = [[-0.35, -0.936, 0.06], [0.936, -0.35, -0.04]]; // fitted: with F_PINCH the pads meet
const PALM_C = [-0.0172, -0.056, 0.002]; // palm surface centre (left hand, hand units)
const NBONES = BONES.length;
const FAR = /^(crank|coin|steady|wrench|lift|tap|give)/; // hand poses on things out in the world
const fingBone = (h, f, j) => NBONES + h * 15 + f * 3 + j; // h: 0 left, 1 right; f: 0-3 fingers, 4 thumb
const twistBone = (h, i) => NBONES + 30 + h * 2 + i; // forearm twist: i 0 half way, 1 full (the wrist end)
const NB = NBONES + 34;
// finger presets [curl, spread, thumb opposition, thumb curl, index pointing, cascade (little finger side curls more)]
const F_PINCH = [0.62, 0.05, 0.97, 0.15, 0, 0.5];
const F_FIST = [0.9, 0, 0.72, 0.5, 0, 0];
const F_TAP = [0.85, 0, 0.6, 0.4, 1, 0];
const KEY_REST = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, -0.45, 0.05)); // Held POSES.item

/** One skinned, smooth-shaded mesh built from tubes of superellipse rings. */
class SkinGeo {
  constructor() { this.pos = []; this.uv = []; this.col = []; this.si = []; this.sw = []; this.grp = []; this.idx = []; }
  get count() { return this.pos.length / 3; }
  vert(p, u, v, col, w, g) {
    this.pos.push(p.x, p.y, p.z); this.uv.push(u, v); this.col.push(col[0], col[1], col[2]); this.grp.push(g);
    let s = 0;
    for (const x of w) s += x[1];
    for (let i = 0; i < 4; i++) { const x = w[i]; this.si.push(x ? x[0] : 0); this.sw.push(x ? x[1] / (s || 1) : 0); }
    return this.count - 1;
  }
  /** A triangle facing away from `ref` (a point inside the solid). */
  tri(a, b, c, ref) {
    const P = this.pos, A = _v.fromArray(P, a * 3);
    const n = _v2.fromArray(P, b * 3).sub(A).cross(_v3.fromArray(P, c * 3).sub(A));
    if (n.lengthSq() < 1e-18) return;
    if (n.dot(_v4.copy(A).sub(ref)) < 0) this.idx.push(a, c, b); else this.idx.push(a, b, c);
  }
  /**
   * rings: [{ c, ex, ey, ez, rx, rz, pw, ox, oz, flat, w: [[bone, weight]...], v, tint(cos, sin), ref }] along -ey.
   * capA / capB: domed ends (height) at the first / last ring.
   */
  tube(rings, n, g, capA = 0, capB = 0) {
    const ids = rings.map((R) => {
      const row = [], q = 2 / (R.pw || 2);
      for (let k = 0; k <= n; k++) {
        const t = -Math.PI / 2 + (2 * Math.PI * k) / n, c = Math.cos(t), s = Math.sin(t);
        const x = R.rx * Math.sign(c) * Math.abs(c) ** q * (c < 0 ? R.flat || 1 : 1) + (R.ox || 0);
        const z = R.rz * Math.sign(s) * Math.abs(s) ** q + (R.oz || 0);
        const p = _v5.copy(R.c).addScaledVector(R.ex, x).addScaledVector(R.ez, z);
        row.push(this.vert(p, k / n, R.v, R.tint ? R.tint(c, s) : ONE, R.w, g));
      }
      return row;
    });
    for (let i = 0; i < rings.length - 1; i++) {
      const A = ids[i], B = ids[i + 1], ref = rings[i].ref || _v6.copy(rings[i].c).add(rings[i + 1].c).multiplyScalar(0.5);
      for (let k = 0; k < n; k++) { this.tri(A[k], A[k + 1], B[k], ref); this.tri(A[k + 1], B[k + 1], B[k], ref); }
    }
    const cap = (R, row, d) => {
      const tip = this.vert(_v5.copy(R.c).addScaledVector(R.ey, d).addScaledVector(R.ex, R.ox || 0).addScaledVector(R.ez, R.oz || 0), 0.5, R.v, R.tip || (R.tint ? R.tint(0, 0) : ONE), R.w, g);
      const ref = _v6.copy(R.c).addScaledVector(R.ey, -d * 0.5);
      for (let k = 0; k < n; k++) this.tri(row[k], row[k + 1], tip, ref);
    };
    if (capA) cap(rings[0], ids[0], capA);
    if (capB) cap(rings[rings.length - 1], ids[ids.length - 1], -capB);
  }
  /** Smooth normals: faces averaged over every vertex at the same spot of the same part (texture seams included). */
  normals() {
    const P = this.pos, I = this.idx, acc = new Map(), keys = [];
    for (let i = 0; i < this.count; i++) keys.push(`${this.grp[i]}|${Math.round(P[i * 3] * 2e4)}|${Math.round(P[i * 3 + 1] * 2e4)}|${Math.round(P[i * 3 + 2] * 2e4)}`);
    for (let t = 0; t < I.length; t += 3) {
      const A = _v.fromArray(P, I[t] * 3), n = _v2.fromArray(P, I[t + 1] * 3).sub(A).cross(_v3.fromArray(P, I[t + 2] * 3).sub(A));
      for (let j = 0; j < 3; j++) {
        const k = keys[I[t + j]];
        let s = acc.get(k);
        if (!s) acc.set(k, (s = [0, 0, 0]));
        s[0] += n.x; s[1] += n.y; s[2] += n.z;
      }
    }
    this.nrm = [];
    for (let i = 0; i < this.count; i++) { const s = acc.get(keys[i]) || [0, 1, 0], l = Math.hypot(s[0], s[1], s[2]) || 1; this.nrm.push(s[0] / l, s[1] / l, s[2] / l); }
  }
  /** Add the mirror image (x -> -x) with remapped bones. */
  mirror(boneMap) {
    const n = this.count, ni = this.idx.length;
    for (let i = 0; i < n; i++) {
      this.pos.push(-this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2]);
      this.nrm.push(-this.nrm[i * 3], this.nrm[i * 3 + 1], this.nrm[i * 3 + 2]);
      this.uv.push(this.uv[i * 2], this.uv[i * 2 + 1]);
      this.col.push(this.col[i * 3], this.col[i * 3 + 1], this.col[i * 3 + 2]);
      for (let j = 0; j < 4; j++) { this.si.push(boneMap(this.si[i * 4 + j])); this.sw.push(this.sw[i * 4 + j]); }
      this.grp.push(this.grp[i]);
    }
    for (let t = 0; t < ni; t += 3) this.idx.push(this.idx[t] + n, this.idx[t + 2] + n, this.idx[t + 1] + n);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.sw, 4));
    g.setIndex(this.idx);
    return g;
  }
}

/** Thumb bone orientation (left hand) from where it points and where its nail faces. */
function thumbBasis([d, n], out) {
  const y = _v.set(-d[0], -d[1], -d[2]).normalize();
  const x = _v2.set(n[0], n[1], n[2]); x.addScaledVector(y, -x.dot(y)).normalize();
  return out.setFromRotationMatrix(_m.makeBasis(x, y, _v3.crossVectors(x, y)));
}
const mirrorQ = (q) => new THREE.Quaternion(q.x, -q.y, -q.z, q.w);

// per-hand pose: wrist position (anchor space), hand orientation (rig space), fingers [curl, spread, thumb, thumbCurl,
// point, cascade], e: how far the wrist bends back (the forearm then comes from under the back of the hand: palm-up holds)
class Pose {
  constructor() { this.p = V(); this.q = new THREE.Quaternion(); this.f = [0.3, 0.2, 0.2, 0.2, 0, 0.3]; this.e = 0.25; }
  copy(o) { this.p.copy(o.p); this.q.copy(o.q); for (let i = 0; i < 6; i++) this.f[i] = o.f[i]; this.e = o.e; return this; }
}

export class FPBody {
  constructor(game) {
    this.game = game;
    this.enabled = game.state.settings.hands !== false;
    this.rig = new THREE.Group();
    this.rig.name = 'fp-arms';
    this.rig.rotation.y = Math.PI; // the avatar faces +z, the camera looks down -z
    this.rig.visible = false;
    game.held.anchor.add(this.rig);
    this.hands = [0, 1].map((h) => ({
      h, sd: h ? -1 : 1, src: '', k: 1, dur: 0.2, bump: 0, grab: 0, arc: 0, sb: 0, farT: 0, bend: 0,
      want: new Pose(), out: new Pose(), from: new Pose(), shoulder: V(), natural: new Pose(),
    }));
    this.t = 0;
    this.presence = 0; this.lookDown = 0; this.dt = 1 / 60;
    this.legYaw = 0;
    this.swing = [0, 0]; this.swingS = [0, 0];
    this.tgt = new Pose(); this.tgt2 = new Pose(); this.flyerK = 0;
    this._qa = new THREE.Quaternion(); this._qb = new THREE.Quaternion(); this._qc = new THREE.Quaternion();
    this.walkW = 0; this.runW = 0;
    this.act = null; // timed action { name, t, dur, ... }
    this.bounds = new WeakMap();
    this.stash = { k: 0, obj: null, base: V(), last: V() };
    this.crank = { m: null, flip: 0, n: 0 };
    this.lastUses = -1;
    this.anchorInv = new THREE.Matrix4();
    this.iner = { p: V(), v: V(), o: V(), ov: V(), on: false };
    this.tmp = Array.from({ length: 10 }, V);
    this._S = V(); this._T = V();
    this.IP = V(); this.IQ = new THREE.Quaternion(); this.IS = 1; this.B = new THREE.Box3();
    this.PINCH = [-0.03, -0.13, 0.03]; this.FIST = [-0.03, -0.085, 0.004]; this.TIP = [-0.003, -0.19, 0.026];
    this.props = this.buildProps();
    this.build();
    game.events.on('avatar', () => this.build());
    this.hookShutter();
  }

  get active() { return this.enabled && !!this.human; }
  /** Whether the hands are on screen right now (actions may take over held items only then). */
  get live() { return this.active && this.game.held.anchor.visible && this.rig.visible; }

  setEnabled(on) {
    this.enabled = on;
    if (!on) { this.rig.visible = false; if (this.human) this.human.root.visible = false; this.unstash(); }
  }

  // ------------------------------------------------------------------ construction
  build() {
    const g = this.game;
    this.dispose();
    const h = createAvatarHuman(g.state.avatar);
    h.finishPaint?.();
    this.human = h;
    const P = this.P = h.P;
    // no idle fidgets, glances or face repaints: we only ever see this body from the inside
    h.fidgetT = Infinity; h.glanceT = Infinity; h.updateFace = () => {};
    h.root.name = 'fp-body';
    h.root.visible = false;
    h.mesh.frustumCulled = false;
    g.scene.add(h.root);
    // head + arms only in shadow maps
    const sk = h.mesh.skeleton;
    h.mesh.onBeforeRender = () => { sk.update(); const m = sk.boneMatrices; for (const i of HIDE) m.fill(0, i * 16, i * 16 + 16); };
    h.mesh.onBeforeShadow = () => sk.update();
    // extra meshes riding on hidden bones (hats, hair pieces from cosmetics) would sit in front of the camera
    for (const i of HIDE) h.bones[i].traverse((o) => { if (o.isMesh && o !== h.mesh) o.visible = false; });
    this.bs = clamp(g.player.eye / P.eyeY, 0.8, 1.3);
    h.root.scale.setScalar(this.bs);
    this.la = P.shoulderY - P.elbowY; this.lc = P.elbowY - P.wristY;
    this.k = P.H / 1.72 * (P.f ? 0.93 : 1); // hand size
    this.ar = clamp(P.armX / 0.0447, 0.7, 1.3); // arm girth
    this.buildArms(h);
  }

  buildArms(h) {
    const P = this.P, k = this.k;
    // skeleton: the Human's bone order (arm / fore / hand indices) + 15 finger bones per hand + 2 twist bones per forearm
    const bones = [];
    for (let i = 0; i < NB; i++) bones.push(new THREE.Bone());
    this.thumbQ = [0, 1].map((hi) => {
      const relax = thumbBasis(T_RELAX, new THREE.Quaternion()), oppose = thumbBasis(T_OPPOSE, new THREE.Quaternion());
      return hi ? { relax: mirrorQ(relax), oppose: mirrorQ(oppose) } : { relax, oppose };
    });
    const root = new THREE.Group();
    for (const s of ['L', 'R']) {
      const sx = s === 'L' ? 1 : -1, hi = s === 'L' ? 0 : 1;
      const a = bones[BONE_INDEX['arm' + s]], f = bones[BONE_INDEX['fore' + s]], hd = bones[BONE_INDEX['hand' + s]];
      const tA = bones[twistBone(hi, 0)], tB = bones[twistBone(hi, 1)];
      a.position.set(sx * P.shX, P.shoulderY, 0);
      f.position.set(0, P.elbowY - P.shoulderY, 0);
      hd.position.set(0, P.wristY - P.elbowY, 0);
      root.add(a); a.add(f); f.add(tA, tB); tB.add(hd);
      FING.forEach((F, fi) => {
        let parent = hd;
        F.len.forEach((len, j) => {
          const b = bones[fingBone(hi, fi, j)];
          if (j === 0) b.position.set(sx * F.k[0] * k, F.k[1] * k, F.k[2] * k); else b.position.set(0, -F.len[j - 1] * k, 0);
          parent.add(b); parent = b;
        });
      });
      const t0 = bones[fingBone(hi, 4, 0)], t1 = bones[fingBone(hi, 4, 1)], t2 = bones[fingBone(hi, 4, 2)];
      t0.position.set(sx * THUMB.base[0] * k, THUMB.base[1] * k, THUMB.base[2] * k);
      t0.quaternion.copy(this.thumbQ[hi].relax);
      t1.position.set(0, -THUMB.len[0] * k, 0); t2.position.set(0, -THUMB.len[1] * k, 0);
      hd.add(t0); t0.add(t1); t1.add(t2);
    }
    for (const b of bones) if (!b.parent) root.add(b);
    const tex = this.armTexture(h);
    this.tex = tex;
    const geo = this.limbGeometry();
    // a little fill light of their own (emissive) so your hands always read, even in the dark garage
    const mat = new THREE.MeshStandardMaterial({ map: tex.map, vertexColors: true, roughness: 0.78, metalness: 0, emissive: 0xffffff, emissiveMap: tex.map, emissiveIntensity: 0.13 });
    const arms = new THREE.SkinnedMesh(geo, mat);
    arms.add(root);
    arms.updateMatrixWorld(true);
    arms.bind(new THREE.Skeleton(bones));
    Object.assign(h.mat, { emissive: new THREE.Color(0xffffff), emissiveMap: h.tex, emissiveIntensity: 0.12 });
    arms.frustumCulled = false; arms.castShadow = false; arms.receiveShadow = false;
    this.rig.add(arms);
    this.rig.scale.setScalar(this.bs);
    this.arms = arms; this.bones = bones;
    this.hb = ['L', 'R'].map((s, hi) => ({ arm: bones[BONE_INDEX['arm' + s]], fore: bones[BONE_INDEX['fore' + s]], hand: bones[BONE_INDEX['hand' + s]], tA: bones[twistBone(hi, 0)], tB: bones[twistBone(hi, 1)] }));
    this.calibrate();
    // the little props a hand can carry: the wrench rides in the right fist for repairs; the flyer being handed out is
    // placed at the pinch every frame (placeFlyer)
    this.props.wrench.position.set(-this.FIST[0] * k, this.FIST[1] * k, this.FIST[2] * k);
    this.hb[1].hand.add(this.props.wrench);
    this.game.held.anchor.add(this.props.flyer);
  }

  /** Contact points (hand units, left hand) measured on the posed fingers: pinch, fist, fingertip. */
  calibrate() {
    const b = this.bones, hand = this.hb[0].hand, k = this.k;
    const inv = new THREE.Matrix4();
    const pt = (bone, y) => { hand.updateWorldMatrix(true, true); inv.copy(hand.matrixWorld).invert(); return _v.set(0, y, 0).applyMatrix4(bone.matrixWorld).applyMatrix4(inv).divideScalar(k).toArray(); };
    this.fingers(0, F_PINCH);
    const it = pt(b[fingBone(0, 0, 2)], -FING[0].len[2] * k * 0.7), tt = pt(b[fingBone(0, 4, 2)], -THUMB.len[2] * k * 0.7);
    this.PINCH = it.map((x, i) => (x + tt[i]) / 2);
    this.fingers(0, F_FIST);
    const mid = pt(b[fingBone(0, 1, 1)], -FING[1].len[1] * k * 0.5);
    this.FIST = [(mid[0] + PALM_C[0]) / 2, (mid[1] - 0.075) / 2, 0.004];
    this.fingers(0, F_TAP);
    this.TIP = pt(b[fingBone(0, 0, 2)], -FING[0].len[2] * k * 0.85);
    this.TIP[0] -= 0.006;
    this.fingers(0, [0.3, 0.2, 0.2, 0.2, 0, 0.3]);
  }

  /**
   * The arms' own little texture: v runs down the arm (shoulder to fingertips), u around it. Above the cuff it is
   * sampled from the avatar's atlas (whatever sleeve it wears: knit, flannel checks, prints, a suit's shirt cuff...),
   * below it is skin in the hands' colour, so forearm and hand always match.
   */
  armTexture(h) {
    const P = h.P, H = P.H, T = h.spec.top || {};
    const sleeve = T.sleeve || (['tee', 'aloha', 'polo'].includes(T.kind) ? 'short' : 'long');
    const cuffY = sleeve === 'short' ? P.elbowY + (T.kind === 'tee' && T.fitted ? 0.085 : 0.065) * H : sleeve === 'mid' ? P.elbowY - 0.055 * H : P.wristY + 0.008 * H;
    const yTop = P.shoulderY + 0.02 * H, yBot = P.wristY - 0.15 * H, W = 64, HT = 256;
    // the avatar's left arm (rest pose) with its atlas UVs
    const g = h.mesh.geometry, pa = g.attributes.position, ua = g.attributes.uv, sa = g.attributes.skinIndex, ix = g.index.array;
    const tris = [];
    for (let i = 0; i < ix.length; i += 3) {
      const bi = sa.getX(ix[i]);
      if ((bi !== BONE_INDEX.armL && bi !== BONE_INDEX.foreL) || sa.getX(ix[i + 1]) !== bi || sa.getX(ix[i + 2]) !== bi) continue;
      tris.push([ix[i], ix[i + 1], ix[i + 2]].map((j) => [pa.getX(j), pa.getY(j), pa.getZ(j), ua.getX(j), ua.getY(j)]));
    }
    const d = h.pix.d, skin = this.handColor(h);
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = HT;
    const ctx = cv.getContext('2d'), img = ctx.createImageData(W, HT), o = img.data;
    const hash = (a, b) => { let x = Math.imul(a * 374761393 + b * 668265263, 1274126177); x ^= x >>> 13; return ((Math.imul(x, 1103515245) >>> 0) % 1000) / 1000; };
    const hit = (y, dx, dz) => {
      let best = Infinity, bu = 0, bv = 0;
      const ox = P.shX, oy = y, oz = 0;
      for (const [A, B, C] of tris) {
        const e1x = B[0] - A[0], e1y = B[1] - A[1], e1z = B[2] - A[2], e2x = C[0] - A[0], e2y = C[1] - A[1], e2z = C[2] - A[2];
        const px = -dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y; // d x e2 (d.y = 0)
        const det = e1x * px + e1y * py + e1z * pz;
        if (Math.abs(det) < 1e-12) continue;
        const inv = 1 / det, tx = ox - A[0], ty = oy - A[1], tz = oz - A[2];
        const u = (tx * px + ty * py + tz * pz) * inv;
        if (u < 0 || u > 1) continue;
        const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
        const w = (dx * qx + dz * qz) * inv;
        if (w < 0 || u + w > 1) continue;
        const t = (e2x * qx + e2y * qy + e2z * qz) * inv;
        if (t > 0 && t < best) { best = t; bu = A[3] * (1 - u - w) + B[3] * u + C[3] * w; bv = A[4] * (1 - u - w) + B[4] * u + C[4] * w; }
      }
      return best < Infinity ? [bu, bv] : null;
    };
    for (let r = 0; r < HT; r++) {
      const y = yBot + (1 - (r + 0.5) / HT) * (yTop - yBot);
      for (let i = 0; i < W; i++) {
        const t = -Math.PI / 2 + (2 * Math.PI * (i + 0.5)) / W, c = Math.cos(t), s = Math.sin(t), q = (r * W + i) * 4;
        const uv = y > cuffY + 0.001 ? hit(y, c, s) : null;
        if (uv) {
          const a = (clamp(Math.floor((1 - uv[1]) * ATLAS), 0, ATLAS - 1) * ATLAS + clamp(Math.floor(uv[0] * ATLAS), 0, ATLAS - 1)) * 4;
          o[q] = d[a]; o[q + 1] = d[a + 1]; o[q + 2] = d[a + 2];
        } else if (y > cuffY + 0.001 && r > 0) {
          o[q] = o[q - W * 4]; o[q + 1] = o[q - W * 4 + 1]; o[q + 2] = o[q - W * 4 + 2];
        } else {
          // skin: the outer forearm a touch lighter, the inner side and the back of the elbow a touch darker
          let kk = 1 + 0.035 * Math.max(0, c) - 0.03 * Math.max(0, -c) + (hash(i, r) - 0.5) * 0.035;
          if (Math.abs(y - P.elbowY) < 0.02 * H && s < -0.55) kk *= 0.94;
          const pink = c < -0.3 && y < P.wristY + 0.05 * H && y > P.wristY - 0.01 * H ? 0.04 : 0;
          o[q] = clamp(skin[0] * kk * (1 + pink), 0, 255); o[q + 1] = clamp(skin[1] * kk * (1 - pink * 0.6), 0, 255); o[q + 2] = clamp(skin[2] * kk * (1 - pink), 0, 255);
        }
        o[q + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const map = new THREE.CanvasTexture(cv);
    map.colorSpace = THREE.SRGBColorSpace;
    map.magFilter = THREE.NearestFilter; map.minFilter = THREE.LinearMipmapLinearFilter;
    map.wrapS = THREE.RepeatWrapping;
    map.anisotropy = 4;
    return { map, cuffY, sleeve, v: (y) => clamp((y - yBot) / (yTop - yBot), 0.002, 0.998) };
  }

  /** The hands' colour (sRGB bytes): median of the avatar's painted hand texels. */
  handColor(h) {
    const src = h.mesh.geometry, si = src.attributes.skinIndex, uv = src.attributes.uv, idx = src.index.array, d = h.pix.d;
    const hl = BONE_INDEX.handL, hr = BONE_INDEX.handR, cols = [];
    for (let i = 0; i < idx.length; i += 3) {
      const b = si.getX(idx[i]);
      if (b !== hl && b !== hr) continue;
      const u = (uv.getX(idx[i]) + uv.getX(idx[i + 1]) + uv.getX(idx[i + 2])) / 3, v = (uv.getY(idx[i]) + uv.getY(idx[i + 1]) + uv.getY(idx[i + 2])) / 3;
      const o = (clamp(Math.floor((1 - v) * ATLAS), 0, ATLAS - 1) * ATLAS + clamp(Math.floor(u * ATLAS), 0, ATLAS - 1)) * 4;
      cols.push([d[o], d[o + 1], d[o + 2]]);
    }
    if (!cols.length) { const c = h.spec.skin || [224, 180, 142]; return [c[0], c[1], c[2]]; }
    cols.sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
    return cols[Math.floor(cols.length * 0.6)];
  }

  /** Left arm (sleeve, skin from the upper arm to the knuckles, fingers, thumb) in the rest pose, then mirrored. */
  limbGeometry() {
    const P = this.P, G = new SkinGeo(), k = this.k, ar = this.ar, T = this.tex;
    const { shX, shoulderY: sh, elbowY: el, wristY: wr } = P;
    const Lu = sh - el, Lf = el - wr;
    const ARM = BONE_INDEX.armL, FORE = BONE_INDEX.foreL, HAND = BONE_INDEX.handL, TA = twistBone(0, 0), TB = twistBone(0, 1);
    // skin weights along the arm (rest height): upper arm | elbow | forearm twisting progressively | wrist | hand
    const armW = (y) => {
      const e = smooth((el + 0.03 - y) / 0.06), s = clamp((el - 0.02 - y) / (Lf - 0.04), 0, 1), hw = smooth((wr + 0.024 - y) / 0.044);
      const f = e * (1 - hw), w = [[ARM, 1 - e], [HAND, hw]];
      if (s < 0.5) w.push([FORE, f * (1 - 2 * s)], [TA, f * 2 * s]); else w.push([TA, f * (2 - 2 * s)], [TB, f * (2 * s - 1)]);
      return w.filter((x) => x[1] > 1e-4);
    };
    // skin profile [y, rx (lateral), rz (front-back), oz]: deltoid, biceps, elbow, forearm muscles, a flat wrist
    const prof = [
      [sh + 0.012, 0.03, 0.035, -0.004], [sh - 0.006, 0.041, 0.045, 0], [sh - 0.22 * Lu, 0.0445, 0.046, 0], [sh - 0.55 * Lu, 0.0395, 0.042, 0.002],
      [el + 0.2 * Lu, 0.0355, 0.038, 0.001], [el + 0.035, 0.035, 0.036, -0.001], [el + 0.012, 0.036, 0.0355, -0.003], [el - 0.012, 0.0375, 0.037, -0.002],
      [el - 0.04, 0.0392, 0.0395, 0], [el - 0.3 * Lf, 0.0362, 0.0378, 0], [el - 0.55 * Lf, 0.0305, 0.0348, 0], [el - 0.8 * Lf, 0.0242, 0.0316, 0],
      [wr + 0.012, 0.0198, 0.0293, 0],
    ].map(([y, rx, rz, oz]) => [y, rx * ar, rz * ar, oz * ar]);
    const profAt = (y) => {
      for (let i = 0; i < prof.length - 1; i++) {
        const A = prof[i], B = prof[i + 1];
        if (y <= A[0] && y >= B[0]) { const t = (A[0] - y) / (A[0] - B[0]); return [y, lerp(A[1], B[1], t), lerp(A[2], B[2], t), lerp(A[3], B[3], t)]; }
      }
      return y > prof[0][0] ? prof[0].slice() : [y, ...prof[prof.length - 1].slice(1)];
    };
    const ring = (y, rx, rz, oz, extra) => ({ c: new THREE.Vector3(shX, y, 0), ex: X, ey: Y, ez: Z, rx, rz, oz, pw: 2, w: armW(y), v: T.v(y), ...extra });
    // --- sleeve: a little looser than the arm, a snug cuff on long sleeves, an open hem with a lip on short ones
    const cuff = T.cuffY, long = T.sleeve === 'long';
    const sl = [];
    const ys = [...prof.map((p) => p[0]).filter((y) => y > cuff + 0.006), cuff + 0.03, cuff + 0.012].sort((a, b) => b - a);
    for (const y of ys) {
      if (sl.length && Math.abs(sl[sl.length - 1].c.y - y) < 0.004) continue;
      const [, rx, rz, oz] = profAt(y), near = smooth(1 - (y - cuff) / 0.035);
      const off = (0.0062 + (long ? -0.0014 : 0.0045) * near) * ar;
      sl.push(ring(y, rx + off, rz + off, oz));
    }
    {
      const [, rx, rz, oz] = profAt(cuff), off = (long ? 0.0048 : 0.0105) * ar;
      sl.push(ring(cuff, rx + off, rz + off, oz, { v: T.v(cuff + 0.003), ref: new THREE.Vector3(shX, cuff + 0.05, 0) }));
      // the hem folds in to the skin: the inside of the sleeve, in shadow
      sl.push(ring(cuff + 0.004, rx + 0.0014, rz + 0.0014, oz, { v: T.v(cuff + 0.004), tint: () => [0.42, 0.42, 0.46] }));
    }
    G.tube(sl, SIDES, 'sleeve', 0.02 * ar, 0);
    // --- skin: from inside the sleeve, down the arm, through the wrist and the palm to the knuckles
    const sk = [];
    const top = Math.min(cuff + 0.03, sh + 0.006);
    sk.push(ring(top, ...profAt(top).slice(1)));
    for (const p of prof) if (p[0] < top - 0.006) sk.push(ring(p[0], p[1], p[2], p[3]));
    const palmTint = (c) => { const p = smooth((-c - 0.15) / 0.5); return [1 + 0.035 * p, 1 - 0.045 * p, 1 - 0.06 * p]; };
    const PALM = [ // [y, rx, rz, ox, oz, pw] hand space
      [0, 0.0184, 0.0289, -0.0003, 0, 2.2], [-0.014, 0.0174, 0.0306, -0.0012, 0.0008, 2.5], [-0.034, 0.0161, 0.0352, -0.0018, 0.0012, 2.9],
      [-0.057, 0.0151, 0.0382, -0.0012, 0.0002, 3.2], [-0.077, 0.0141, 0.039, -0.0006, -0.0005, 3.3], [-0.0875, 0.0123, 0.0377, 0.0004, -0.001, 3.1],
      [-0.0945, 0.0086, 0.0335, 0.0009, -0.0012, 2.7],
    ];
    for (const [y, rx, rz, ox, oz, pw] of PALM) {
      const yy = wr + y * k;
      sk.push({ c: new THREE.Vector3(shX, yy, 0), ex: X, ey: Y, ez: Z, rx: rx * k, rz: rz * k, ox: ox * k, oz: oz * k, pw, w: armW(yy), v: T.v(yy), tint: palmTint });
    }
    G.tube(sk, SIDES, 'skin', 0.012, 0.0035 * k);
    // --- fingers: one tube each from inside the palm to the tip, skin blended across every joint
    const fingTint = (nail) => (c, s) => {
      const p = palmTint(c);
      if (nail && c > 0.45) return [1.12, 1.05, 1.04];
      if (Math.abs(s) > 0.75 && !nail) return [p[0] * 0.95, p[1] * 0.93, p[2] * 0.93];
      return p;
    };
    const tubeAlong = (base, ex, ey, ez, wv, tv, b0, L, g, thumb) => {
      const L01 = L[0] + L[1], L012 = L01 + L[2], b1 = b0 + 1, b2 = b0 + 2;
      const R = (y, sx, sz, w, nail = false, ox = 0) => ({ c: base.clone().addScaledVector(ey, y), ex, ey, ez, rx: tv * sx, rz: wv * sz, ox: ox * tv, pw: 2.3, flat: 0.92, w, v: T.v(base.y + y * ey.y), tint: fingTint(nail), tip: nail ? [1.06, 1, 1] : null });
      const rings = thumb ? [
        R(0.016 * k, 1.15, 1.25, [[HAND, 1]]), R(0.005 * k, 1.42, 1.38, [[HAND, 0.8], [b0, 0.2]]), R(-0.008 * k, 1.38, 1.3, [[HAND, 0.45], [b0, 0.55]]),
        R(-L[0] * 0.55, 1.12, 1.08, [[HAND, 0.1], [b0, 0.9]]),
      ] : [
        R(0.013 * k, 0.8, 0.86, [[HAND, 1]]), R(0.004 * k, 1.0, 1.0, [[HAND, 0.7], [b0, 0.3]]), R(-0.006 * k, 1.0, 1.0, [[HAND, 0.22], [b0, 0.78]]),
        R(-L[0] * 0.5, 0.92, 0.93, [[b0, 1]]),
      ];
      const j = thumb ? 1.06 : 1;
      rings.push(
        R(-L[0] + 0.0045 * k, 0.9 * j, 0.9 * j, [[b0, 0.82], [b1, 0.18]]), R(-L[0], 0.93 * j, 0.91 * j, [[b0, 0.5], [b1, 0.5]], false, 0.06), R(-L[0] - 0.0045 * k, 0.89 * j, 0.88 * j, [[b0, 0.18], [b1, 0.82]]),
        R(-L[0] - L[1] * 0.5, 0.86 * j, 0.86 * j, [[b1, 1]]),
        R(-L01 + 0.0035 * k, 0.84 * j, 0.84 * j, [[b1, 0.85], [b2, 0.15]]), R(-L01, 0.85 * j, 0.84 * j, [[b1, 0.5], [b2, 0.5]], false, 0.05), R(-L01 - 0.0035 * k, 0.82 * j, 0.82 * j, [[b1, 0.15], [b2, 0.85]]),
        R(-L01 - L[2] * 0.5, 0.8 * j, 0.83 * j, [[b2, 1]], true), R(-L012 + 0.002 * k, 0.7 * j, 0.76 * j, [[b2, 1]], true),
      );
      G.tube(rings, FSIDES, g, 0, wv * 0.62);
    };
    FING.forEach((F, fi) => tubeAlong(new THREE.Vector3(shX + F.k[0] * k, wr + F.k[1] * k, F.k[2] * k), X, Y, Z, F.w * k, F.t * k, fingBone(0, fi, 0), F.len.map((x) => x * k), 'f' + fi, false));
    const tq = this.thumbQ[0].relax;
    tubeAlong(new THREE.Vector3(shX + THUMB.base[0] * k, wr + THUMB.base[1] * k, THUMB.base[2] * k), X.clone().applyQuaternion(tq), Y.clone().applyQuaternion(tq), Z.clone().applyQuaternion(tq),
      THUMB.w * k, THUMB.t * k, fingBone(0, 4, 0), THUMB.len.map((x) => x * k), 'thumb', true);
    G.normals();
    const L2R = (b) => (b === ARM ? BONE_INDEX.armR : b === FORE ? BONE_INDEX.foreR : b === HAND ? BONE_INDEX.handR : b >= NBONES + 30 ? b + 2 : b >= NBONES ? b + 15 : b);
    G.mirror(L2R);
    return G.geometry();
  }

  buildProps() {
    const steel = new THREE.MeshStandardMaterial({ color: 0xb8bec6, metalness: 0.85, roughness: 0.3 });
    const wrench = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.005, 0.13), steel);
    shaft.position.z = 0.03;
    const jaw = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0045, 6, 12, Math.PI * 1.35), steel);
    jaw.rotation.set(Math.PI / 2, 0, Math.PI * 0.82);
    jaw.position.z = 0.104;
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.009, 0.064), new THREE.MeshStandardMaterial({ color: 0xd8352a, roughness: 0.5 }));
    grip.position.z = -0.002;
    wrench.add(shaft, jaw, grip);
    wrench.visible = false;
    // the sheet in your hand as you give it away: the design on both faces, plain paper edges
    const paper = new THREE.MeshStandardMaterial({ color: 0xfff4dc, roughness: 0.8 }), art = new THREE.MeshStandardMaterial({ roughness: 0.8 });
    const flyer = new THREE.Mesh(new THREE.BoxGeometry(0.0015, 0.1, 0.0707), [art, art, paper, paper, paper, paper]);
    flyer.rotation.set(0, 0, 0.5);
    flyer.visible = false;
    return { wrench, flyer };
  }

  dispose() {
    const h = this.human;
    if (!h) return;
    this.rig.remove(this.arms);
    this.arms.geometry.dispose(); this.arms.material.dispose(); this.tex?.map.dispose();
    this.arms.skeleton.dispose();
    h.dispose();
    this.human = null;
  }

  // ------------------------------------------------------------------ hooks into the game
  hookShutter() {
    // the key turns in the lock before the shutter cutscene takes the camera
    const S = this.game.story;
    if (!S?.useShutter) return;
    const orig = S.useShutter.bind(S);
    S.useShutter = () => {
      const g = this.game;
      if (this.live && !S.flags.shutter && g.held.holding('key') && !g.cutscene.active) {
        if (this.act?.name !== 'key') this.play('key', 1.15, { obj: g.held.item.obj, done: () => orig() });
        return false;
      }
      return orig();
    };
  }

  /** Held.consume: animate the item being used up (pour the milk, hand out the last flyer...). true = we own obj now. */
  consumed(it) {
    if (!this.live || it.kind !== 'tool') return false;
    const id = it.data.id, obj = it.obj, hp = this.game.interaction.hover?.hit?.point, hit = finite(hp) ? hp : null;
    if (id === 'flyers') { this.give(hit); return false; }
    this.play(id === 'milk' ? 'pour' : 'use', id === 'milk' ? 1.7 : 0.62, { obj, it, own: true, at: hit ? this.toAnchor(hit, V()) : null, from: obj.position.clone(), fromQ: obj.quaternion.clone(), fromS: obj.scale.x });
    return true;
  }

  give(hitWorld) {
    const id = this.game.pedestrians?.lastFlyer, art = this.props.flyer.material[0];
    if (id && art.userData.flyer !== id) { art.map = flyerTexture(id); art.userData.flyer = id; art.needsUpdate = true; }
    let at = finite(hitWorld) ? this.toAnchor(hitWorld, V()) : null;
    if (!at || at.z > -0.25) at = V().set(0.05, -0.05, -0.8); // someone beside / behind you: just hold it out
    at.y = Math.max(at.y, -0.18);
    this.play('give', 1.0, { at, hand: this.freeHand() });
  }

  play(name, dur, data = {}) {
    if (this.act?.done && this.act.name !== name) this.act.done();
    if (this.act?.obj && this.act.own) this.act.obj.parent?.remove(this.act.obj);
    this.act = { name, t: 0, dur, ...data };
  }

  freeHand() { const it = this.game.held.item; return it && it.obj.visible && !this.game.held.reading ? 0 : 1; }

  toAnchor(world, out) { return out.copy(world).applyMatrix4(this.anchorInv); }
  dirToAnchor(world, out) { return out.copy(world).transformDirection(this.anchorInv); }

  // ------------------------------------------------------------------ per frame
  update(dt) {
    const g = this.game;
    if (!this.active) return;
    dt = Math.min(dt, 0.05);
    this.t += dt; this.dt = dt;
    const anchor = g.held.anchor, cam = g.camera, P = g.player;
    // hands + body only while you're in control of your own eyes: not in the menu, fly-ins, cutscenes or at the PC;
    // coming back, the hands (and what they hold) rise into view
    const show = anchor.visible && !g.cutscene.active && !g.pc?.active && !g.uiCine;
    this.presence = show ? Math.min(1, this.presence + dt / 0.55) : 0;
    if (show && this.presence < 1) {
      const e = 1 - outBack(this.presence, 0.9);
      anchor.position.y -= e * 0.3; anchor.rotation.x -= e * 0.4;
    }
    const eye = _v.set(P.pos.x, P.eye, P.pos.z);
    const near = cam.position.distanceTo(eye) < 0.16 && P.camBlend < 0.05;
    this.leanIn(dt, show && near);
    this.inertia(dt, show && this.presence > 0.3);
    anchor.updateWorldMatrix(true, false);
    this.anchorInv.copy(anchor.matrixWorld).invert();
    this.rig.updateMatrixWorld(true);
    this.updateBody(dt);
    this.human.root.visible = show && near;
    this.rig.visible = show;
    this.updateFlags(dt);
    if (!this.rig.visible) { this.unstash(); if (this.act) this.endAct(); return; }
    this.props.wrench.visible = this.props.flyer.visible = false;
    this.flyerK = 0;
    for (const H of this.hands) this.pose(H);
    this.applyStash(dt);
    for (const H of this.hands) this.blend(H, dt);
    for (const H of this.hands) this.solve(H);
    this.placeFlyer();
    // looking down with empty hands, the arms are drawn with the world (depth-tested against your body) rather than
    // on top of it
    this.rig.userData.mainPass = this.lookDown > 0.6 && this.hands.every((H) => H.src === 'free');
    this.armsToBody();
  }

  /**
   * Leaning in: working a machine's handle or coin slot (or lifting / repairing one) you bend at the waist, and your
   * view dips towards it with you, so the arm can really get there. Eased in and out; the player's own camera is
   * restored by Player.update every frame, so this never drifts.
   */
  leanIn(dt, on) {
    const g = this.game, ho = g.interaction.holding;
    const cover = ho && g.story?.covers ? [...g.story.covers.entries()].find(([, c]) => c.box === ho.obj) : null;
    const want = on && this.enabled && (!!this.coinMachine() || !!cover || (!!ho && g.machines.some((m) => m.root === ho.obj)));
    // lifting a machine off the floor: a proper crouch
    if (want) this.leanD = cover?.[0].data.fallen ? 0.3 : 0.12;
    this.leanK = (this.leanK || 0) + ((want ? 1 : 0) - (this.leanK || 0)) * (1 - Math.exp(-dt * (want ? 5 : 4)));
    if (this.leanK < 1e-3 || !on) return;
    const k = smoother(this.leanK), cam = g.camera, yaw = g.player.yaw, dn = this.leanD || 0.12, fw = Math.min(dn, 0.16);
    cam.position.x -= Math.sin(yaw) * fw * k; cam.position.z -= Math.cos(yaw) * fw * k; cam.position.y -= dn * k;
    cam.updateMatrixWorld();
  }

  /**
   * Weight: the viewmodel (hands and whatever they hold) lags behind the head's accelerations - starting, stopping,
   * each footfall of the bob - on a damped spring, and settles back with a little overshoot.
   */
  inertia(dt, on) {
    const I = this.iner, cam = this.game.camera, anchor = this.game.held.anchor;
    cam.getWorldPosition(_v);
    const vel = _v2.subVectors(_v, I.p).divideScalar(Math.max(dt, 1e-4));
    I.p.copy(_v);
    if (!on || !I.on || vel.lengthSq() > 64) { I.v.copy(vel); I.on = on; if (!on) { I.o.set(0, 0, 0); I.ov.set(0, 0, 0); } return; }
    const acc = _v3.subVectors(vel, I.v).divideScalar(Math.max(dt, 1e-4)).clampLength(0, 22);
    I.v.copy(vel);
    acc.applyQuaternion(cam.getWorldQuaternion(_q).invert());
    const K = 240, C = 21, G = 0.42;
    I.ov.addScaledVector(I.o, -K * dt).addScaledVector(I.ov, -C * dt).addScaledVector(acc, -G * dt);
    I.o.addScaledVector(I.ov, dt).clampLength(0, 0.03);
    anchor.position.add(I.o);
    anchor.rotation.x += I.o.y * 1.1;
    anchor.rotation.z -= I.o.x * 0.9;
  }

  // --- the walking body under the camera
  updateBody(dt) {
    const h = this.human, P = this.game.player, b = h.b;
    const v = P.vel, spd = Math.hypot(v.x, v.z);
    const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
    const fwd = -(v.x * sy + v.z * cy), side = v.x * cy - v.z * sy;
    const back = spd > 0.3 && fwd < -0.25 * spd;
    const off = spd > 0.3 ? clamp((back ? 1 : -1) * Math.atan2(side, Math.abs(fwd)), -1.05, 1.05) : 0;
    this.legYaw += (off - this.legYaw) * (1 - Math.exp(-dt * 7));
    // the eyes sit just behind the face
    const down = Math.max(0, -P.pitch);
    const zb = (this.P.zf - 0.012) * this.bs + smooth(down / 1.3) * 0.08;
    h.root.position.set(P.pos.x + sy * zb, 0, P.pos.z + cy * zb);
    h.root.rotation.y = P.yaw + Math.PI + this.legYaw;
    const ph = h.phase;
    h.update(dt, { speed: spd / this.bs });
    if (back) h.phase = (((2 * ph - h.phase) % 1) + 1) % 1; // walk backwards: run the gait in reverse
    // the upper body keeps facing the view, and arches back when you look down so your belly, legs and feet show
    // rather than a wall of chest
    const lean = smoother(this.leanK || 0) * ((this.leanD || 0.12) > 0.2 ? 1.4 : 1), arch = smooth(down / 1.2) * (1 - Math.min(1, lean));
    b.spine.quaternion.premultiply(_q.setFromAxisAngle(Y, -this.legYaw * 0.45)).multiply(_q.setFromAxisAngle(X, -arch * 0.3 + lean * 0.42));
    b.chest.quaternion.premultiply(_q.setFromAxisAngle(Y, -this.legYaw * 0.55)).multiply(_q.setFromAxisAngle(X, -arch * 0.22));
    b.neck.quaternion.setFromEuler(_e.set(-P.pitch * 0.3, 0, 0));
    b.head.quaternion.setFromEuler(_e.set(-P.pitch * 0.6, 0, 0));
    h.root.updateMatrixWorld(true);
    // arm swing for the empty-hand pose follows the legs (left arm with the right foot)
    const F = h.feet;
    this.swing[0] = clamp((F[1].z - F[0].z) / 0.42, -1, 1);
    this.swing[1] = -this.swing[0];
    for (let i = 0; i < 2; i++) this.swingS[i] += (this.swing[i] - this.swingS[i]) * Math.min(1, dt * 9);
    this.walkW += (clamp(spd / 2.2, 0, 1) - this.walkW) * (1 - Math.exp(-dt * 6));
    this.runW += ((spd > 3.1 ? 1 : 0) - this.runW) * (1 - Math.exp(-dt * 5));
    // natural hanging hands (anchor-space wrist, rig-space orientation) + real shoulders, before we override the arms
    this.rig.getWorldQuaternion(_q2).invert();
    for (const H of this.hands) {
      const s = H.h ? 'R' : 'L';
      b['hand' + s].getWorldPosition(_v2); this.toAnchor(_v2, H.natural.p);
      b['hand' + s].getWorldQuaternion(_q); H.natural.q.copy(_q2).multiply(_q);
      b['arm' + s].getWorldPosition(_v2); this.toAnchor(_v2, H.shoulder);
    }
  }

  /** Watch the game for things the hands should react to. */
  updateFlags(dt) {
    const g = this.game, held = g.held, inp = g.input, it = held.item;
    // flyers handed out (the stack shrinks)
    const uses = it?.kind === 'tool' && it.data.id === 'flyers' ? it.data.uses : -1;
    if (uses >= 0 && this.lastUses > uses && this.rig.visible) this.give(g.interaction.hover?.hit?.point || this.lastHover);
    this.lastUses = uses;
    if (finite(g.interaction.hover?.hit?.point)) this.lastHover = (this.lastHover || V()).copy(g.interaction.hover.hit.point);
    // capsule tossed away with Q
    if (held.tossed && held.tossed !== this.tossSeen) { this.tossSeen = held.tossed; if (this.rig.visible && !this.act) this.play('toss', 0.55); }
    // clicks on things with a free hand: reach out and press (decided a frame later, once the click has done its thing)
    if (this.tap) {
      const T = this.tap; this.tap = null;
      const busy = this.act || g.interaction.holding || held.flight || this.coinMachine() || held.item !== T.item || held.trans?.delay > 0 || g.cutscene.active || g.uiOpen || g.pc?.active;
      if (!busy && this.rig.visible) this.play('tap', 0.5, { at: this.toAnchor(T.p, V()), hand: this.freeHand() });
    }
    if (inp.buttonDown(0) && finite(g.interaction.hover?.hit?.point) && !g.interaction.holding && !held.reading) this.tap = { p: g.interaction.hover.hit.point.clone(), item: held.item };
    if (this.act) { this.act.t += dt; if (this.act.t >= this.act.dur) this.endAct(); }
    if (held.flight) { held.flight.t = (held.flight.t || 0) + dt; if (!held.flight.obj?.parent || held.flight.t > held.flight.dur) held.flight = null; }
  }

  endAct() {
    const a = this.act;
    this.act = null;
    this.props.wrench.visible = false; this.props.flyer.visible = false;
    if (a.own) a.obj.parent?.remove(a.obj);
    if ((a.name === 'key') && this.game.held.item?.obj === a.obj) this.game.held.startTrans(this.game.held.pose, 0.35);
    a.done?.();
  }

  coinMachine() {
    const g = this.game, pp = g.player.pos;
    for (const m of g.machines) if (m.state === 'inserting' && m.rope?.pin && Math.hypot(m.root.position.x - pp.x, m.root.position.z - pp.z) < 2.6) return m;
    return null;
  }

  // ------------------------------------------------------------------ what each hand wants this frame
  pose(H) {
    const W = H.want;
    let src = this.choose(H, W);
    H.bend = 0;
    if (FAR.test(src)) src = this.reachCap(H, W, src); else H.farT = 0;
    if (src !== H.src) {
      // a new move, from wherever the hand is now: quick re-grips, longer for bigger moves, a beat slower letting go
      const a = H.src, d = H.out.p.distanceTo(W.p);
      H.from.copy(H.out);
      H.k = 0;
      let dur = clamp(0.16 + d * 0.62, 0.17, 0.46);
      if (/^(tap|give|toss)/.test(src) || /^(tap|give|toss)/.test(a)) dur = 0.07;
      else if (src.startsWith('grip') && a.startsWith('ready')) dur = 0.15;
      else if (src.startsWith('crank') && a.startsWith('crank')) dur = 0.13;
      else if (src.startsWith('free') && a.startsWith('grip')) dur = Math.max(dur, 0.32);
      H.dur = dur;
      H.bump = src.startsWith('crank') && a.startsWith('crank') ? 1 : 0;
      // reaching for something to hold: the hand opens on the way and closes on it
      H.grab = !H.bump && dur > 0.1 && W.f[0] > H.out.f[0] + 0.15 && !src.startsWith('free') ? 1 : 0;
      H.arc = clamp((d - 0.03) / 0.15, 0, 1) * (dur < 0.1 ? 0 : 1);
      if (!a) H.k = 1;
      H.src = src;
    }
  }

  /**
   * Things in the world out of arm's reach (a handle you click from across the room, a passer-by...): the hand reaches
   * out towards it only as far as the arm goes, open as if grabbing, then comes back - never a stretched pole.
   */
  reachCap(H, W, src) {
    const S = H.shoulder, arm = (this.la + this.lc) * this.bs, reach = arm * 0.88;
    // things below you (a machine's handle, its coin slot): you bend at the waist to reach them
    const lean = this.leanFor(S, W.p, this.leanDir(_v3), arm * 0.97);
    if (lean <= 0.55) { H.farT = 0; H.bend = lean; return src; }
    H.farT += this.dt;
    if (H.farT > 0.5) return this.freePose(H, W);
    const d = _v2.subVectors(W.p, S), L = d.length();
    d.multiplyScalar(1 / L);
    W.p.copy(S).addScaledVector(d, reach);
    this.handQ(H.sd, N(H.sd * 0.45, -1, 0.1, _v3), d, W.q);
    W.f[0] = 0.28; W.f[1] = 0.45; W.f[2] = 0.3; W.f[3] = 0.2; W.f[4] = 0; W.f[5] = 0.2; W.e = 0.25;
    return 'reach';
  }

  /** Which way your shoulders go when you bend at the waist (anchor space): down and forward. */
  leanDir(out) {
    const cam = this.game.camera;
    cam.getWorldDirection(out); out.y = 0;
    if (out.lengthSq() < 1e-6) out.set(0, 0, -1);
    out.normalize().multiplyScalar(0.3).add(_v6.set(0, -0.95, 0)); // mostly down, so the shoulder stays off screen
    return this.dirToAnchor(out, out);
  }

  /** How far the shoulder S must lean along u to bring T within r (Infinity: never). */
  leanFor(S, T, u, r) {
    const D = _v5.subVectors(T, S), b = D.dot(u), c = D.lengthSq() - r * r;
    if (c <= 0) return 0;
    const disc = b * b - c;
    return disc < 0 || b <= 0 ? Infinity : b - Math.sqrt(disc);
  }

  /** Fill W for hand H; returns a key naming what the hand is doing (a change starts a cross-fade). */
  choose(H, W) {
    const g = this.game, held = g.held, it = held.item, nb = g.notebook, a = this.act, R = H.h === 1;
    // timed actions first
    if (a) {
      const r = this.actPose(a, H, W);
      if (r) return r;
    }
    // holds on world things
    const ho = g.interaction.holding;
    if (ho) {
      const m = g.machines.find((x) => x.root === ho.obj);
      if (m && m.state === 'cranking') return this.crankPose(m, H, W);
      const st = g.story?.covers && [...g.story.covers.entries()].find(([, s]) => s.box === ho.obj);
      if (st) return st[0].data.fallen ? this.liftPose(st[0], st[1], H, W) : this.repairPose(st[0], H, W);
    }
    const cm = this.coinMachine();
    if (cm && R) return this.coinPose(cm, H, W);
    // the notebook, open (or closing)
    if (nb?.book?.parent === held.anchor) return this.readPose(nb, H, W);
    // something flying out of the hands (put on a shelf, into the sell box, thrown...)
    const fl = held.flight;
    if (fl && fl.t < fl.dur * 0.42) { const r = this.gripPose(fl.obj, fl.kind, fl.data, fl.pose, H, W); if (r) return 'grip-fly:' + r; }
    // the old item dipping out of view while switching slots
    const lo = held.lowering;
    if (lo?.obj?.visible) { const r = this.gripPose(lo.obj, lo.it.kind, lo.it.data, lo.pose, H, W); if (r) return 'grip-lo:' + r + lo.obj.id; }
    if (it && it.obj.visible) {
      const r = this.gripPose(it.obj, it.kind, it.data, held.pose, H, W);
      if (r) return 'grip:' + r + it.obj.id;
    }
    return this.freePose(H, W);
  }

  // --- item frame helpers (anchor space)
  frame(obj) {
    const anchor = this.game.held.anchor;
    if (obj.parent === anchor) { this.IP.copy(obj.position); this.IQ.copy(obj.quaternion); this.IS = obj.scale.x; }
    else { obj.updateWorldMatrix(true, false); _m.copy(this.anchorInv).multiply(obj.matrixWorld).decompose(this.IP, this.IQ, _v); this.IS = _v.x; }
    let b = this.bounds.get(obj);
    if (!b || this.t - b.t > 0.6) {
      if (!b) { b = { box: new THREE.Box3(), t: 0 }; this.bounds.set(obj, b); }
      b.t = this.t;
      obj.updateWorldMatrix(true, true);
      _m2.copy(obj.matrixWorld).invert();
      b.box.makeEmpty();
      obj.traverse((m) => {
        if (!m.isMesh || m.userData.isRim || m === this.arms) return;
        if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
        _box.copy(m.geometry.boundingBox).applyMatrix4(_m.multiplyMatrices(_m2, m.matrixWorld));
        b.box.union(_box);
      });
      if (b.box.isEmpty()) b.box.set(_v.set(-0.03, -0.03, -0.03), _v2.set(0.03, 0.03, 0.03));
    }
    this.B = b.box;
  }
  ip(u, v, w, out) {
    const B = this.B;
    return out.set(lerp(B.min.x, B.max.x, u), lerp(B.min.y, B.max.y, v), lerp(B.min.z, B.max.z, w)).multiplyScalar(this.IS).applyQuaternion(this.IQ).add(this.IP);
  }
  idir(x, y, z, out) { return out.set(x, y, z).applyQuaternion(this.IQ).normalize(); }
  size(axis) { const B = this.B; return (axis === 0 ? B.max.x - B.min.x : axis === 1 ? B.max.y - B.min.y : B.max.z - B.min.z) * this.IS; }

  /** Hand basis from anchor-space palm normal + finger direction (or + thumb-side axis for fist grips). */
  handQ(sd, palm, dir, out, thumbAxis = false) {
    const x = _v4.set(palm.x * sd, -palm.y * sd, palm.z * sd); // rig space = anchor rotated 180° about y, X = -sd * palm
    if (thumbAxis) {
      const z = _v5.set(-dir.x, dir.y, -dir.z);
      z.addScaledVector(x, -z.dot(x)).normalize();
      const y = _v6.crossVectors(z, x);
      return out.setFromRotationMatrix(_m.makeBasis(x, y, z));
    }
    const y = _v5.set(dir.x, -dir.y, dir.z); // -fingers, in rig space
    y.addScaledVector(x, -y.dot(x)).normalize();
    const z = _v6.crossVectors(x, y);
    return out.setFromRotationMatrix(_m.makeBasis(x, y, z));
  }

  /** Wrist position that puts the hand point `local` (hand space, left-hand coords) on `contact` (anchor space). */
  wrist(H, contact, q, local, out) {
    const k = this.k * this.bs;
    _v.set(local[0] * H.sd * k, local[1] * k, local[2] * k).applyQuaternion(q);
    return out.set(contact.x + _v.x, contact.y - _v.y, contact.z + _v.z);
  }

  setGrip(H, W, contact, palm, dir, f, opts = {}) {
    this.handQ(H.sd, palm, dir, W.q, opts.axis);
    this.wrist(H, contact, W.q, opts.at || PALM_C, W.p);
    for (let i = 0; i < 6; i++) W.f[i] = f[i] ?? 0;
    W.e = opts.ext ?? 0.25;
  }

  // ------------------------------------------------------------------ grips on things you carry
  gripPose(obj, kind, data, pose, H, W) {
    const R = H.h === 1, sd = H.sd, a = _v, c = _c, up = _up;
    this.frame(obj);
    const tool = kind === 'tool' ? data?.id : null;
    const held = this.game.held;
    if (pose === 'reveal') {
      this.ip(0.5, 0, 0.5, c);
      c.x += -sd * 0.03 * this.bs; c.y -= 0.006; c.z += 0.012;
      this.setGrip(H, W, c, N(sd * 0.45, 1, 0.25, a), N(sd * 0.5, 0.15, -1, _v2), [0.42, 0.25, 0.3, 0.2, 0, 0.3], { ext: 0.6 });
      return 'cup';
    }
    if (kind === 'capsule') {
      const r = this.size(1) / 2;
      this.ip(0.5, 0.5, 0.5, c);
      if (pose === 'twist' || held.twisting || held.twist > 0.02) {
        // one hand holds the bottom half from the lower left, the other grips the top from the upper right and turns
        const k = Math.min(1, held.twist);
        this.idir(0, 1, 0, up);
        const side = _v3.set(1, 0, 0).addScaledVector(up, -up.x).normalize();
        const o = _v2.copy(side).multiplyScalar(R ? 0.95 : -0.95).addScaledVector(up, R ? 0.3 : -0.32);
        if (R) o.applyAxisAngle(up, k * 1.4);
        c.addScaledVector(o, r);
        const palm = _v4.copy(o).negate().normalize();
        const fw = N(0, R ? 0.35 : 0.1, -1, _v5).applyAxisAngle(up, R ? k * 1.4 : 0);
        this.setGrip(H, W, c, palm.clone(), fw.clone(), R ? [0.6, 0.3, 0.55, 0.3, 0, 0.3] : [0.62, 0.25, 0.6, 0.35, 0, 0.3]);
        return 'twist';
      }
      if (!R) return null;
      const palm = N(0.35, 1, 0.3, a);
      c.addScaledVector(palm, -r * 0.98);
      this.setGrip(H, W, c, palm, N(-0.6, 0.1, -1, _v2), [0.62, 0.12, 0.55, 0.35, 0, 0.35], { ext: 0.7 });
      return 'capsule';
    }
    if (kind === 'toy') {
      if (!R) return null;
      this.ip(0.5, 0, 0.5, c);
      if (pose === 'inspect' || held.inspecting) {
        // held up on the palm close to your eyes, like a phone: fingers under the base pointing ahead, thumb over its
        // edge, the wrist bent back so the forearm comes up from below
        this.idir(0, 1, 0, up);
        const rt = _v3.set(1, -0.25, 0.35).addScaledVector(up, -_v3.dot(up)).normalize();
        c.addScaledVector(up, -0.005).addScaledVector(rt, 0.026 * this.bs);
        const palm = _v4.copy(up).addScaledVector(rt, -0.3).normalize();
        const dir = _v5.set(-0.45, 0, -1).addScaledVector(up, -_v5.dot(up)).normalize();
        this.setGrip(H, W, c, palm.clone(), dir.clone(), [0.4, 0.2, 0.7, 0.35, 0, 0.35], { ext: 1.0 });
        return 'inspect';
      }
      c.y -= 0.004;
      this.setGrip(H, W, c, N(0.1, 1, 0.25, a), N(-0.55, 0.05, -1, _v2), [0.24, 0.35, 0.15, 0.1, 0, 0.35], { ext: 0.7 });
      return 'toy';
    }
    if (kind === 'cat') {
      // held up under her front legs, a hand either side of her chest (points from her bounding box, so any cat model
      // works); petting, the near hand strokes down her side
      const petting = this.game.time - (held.petT ?? -9) < 1.4;
      if (!R && petting) {
        const ph = (this.t * 1.6) % 1, down = ph < 0.62, k = down ? smooth(ph / 0.62) : 1 - smooth((ph - 0.62) / 0.38);
        this.ip(0.5, 0.5, 0.5, c);
        c.x -= 0.074 * this.IS + (down ? 0 : 0.012 * bell((ph - 0.62) / 0.38)); c.y += 0.045 - k * 0.09; c.z += (down ? 0 : -0.01);
        this.setGrip(H, W, c, N(1, -0.25, -0.15, a), N(0.1, 0.85 - k * 0.3, -0.55, _v2), [0.12 + (down ? 0 : 0.2), 0.3, 0.2, 0.1, 0, 0.2]);
        return 'pet';
      }
      this.ip(0.5, 0.66, 0.5, c);
      c.x += (R ? 1 : -1) * 0.068 * this.IS;
      this.setGrip(H, W, c, N(R ? -1 : 1, 0.2, 0, a), N(R ? -0.15 : 0.15, 0.75, -0.55, _v2), [0.38, 0.3, 0.35, 0.2, 0, 0.3]);
      return 'cat';
    }
    if (kind === 'box' && tool !== 'trash_bag' || pose === 'box' && !tool) {
      // flat hands on the sides, near the front corners
      this.ip(R ? 1 : 0, 0.32, 0.86, c);
      const palm = this.idir(R ? -1 : 1, 0, 0, a);
      c.addScaledVector(palm, -0.004);
      this.setGrip(H, W, c, palm, this.idir(0, -0.45, -1, _v2), [0.2, 0.3, 0.12, 0.1, 0, 0.2]);
      return 'box';
    }
    if (tool === 'broom' || pose === 'broom') return this.stickPose(H, W, R ? 0.6 : 0.9, 'broom');
    if (tool === 'tube' || pose === 'long') {
      const ax = this.longAxis();
      const u = [0.5, 0.5, 0.5]; u[ax] = 0.22;
      const e0 = this.ip(u[0], u[1], u[2], _v3).x; u[ax] = 0.78;
      const e1 = this.ip(u[0], u[1], u[2], _v3).x;
      u[ax] = (R === e1 > e0) ? 0.78 : 0.22;
      u[1] = ax === 1 ? u[1] : 0;
      this.ip(u[0], u[1], u[2], c);
      c.y -= 0.004;
      this.setGrip(H, W, c, N(0, 1, 0.1, a), N(R ? -0.3 : 0.3, 0, -1, _v2), [0.55, 0.12, 0.45, 0.3, 0, 0.3]);
      return 'long';
    }
    if (!R) return null;
    if (tool === 'trash_bag') {
      this.ip(0.5, 0.9, 0.5, c);
      this.barGrip(H, W, c, this.idir(1, 0, 0, _v2), [0.9, 0, 0.75, 0.5, 0, 0]);
      return 'knot';
    }
    if (tool === 'toolkit') {
      this.idir(0, 1, 0, up);
      const sx = this.size(0), sz = this.size(2);
      this.ip(0.5, 1, 0.5, c).addScaledVector(up, 0.004);
      this.barGrip(H, W, c, this.idir(sx > sz ? 1 : 0, 0, sx > sz ? 0 : 1, _v2), [0.86, 0, 0.7, 0.5, 0, 0]);
      return 'handle';
    }
    if (tool === 'key') {
      // pinched by the bow; the grip turns with the key (in the lock, the wrist turns it)
      this.ip(0.5, 0.5, 0.5, c);
      _q.copy(KEY_REST).invert();
      const palm = this.idir(...N(-0.45, 0.6, 0.45, _v4).applyQuaternion(_q).toArray(), a).clone(), dir = this.idir(...N(-0.6, 0.35, -0.8, _v4).applyQuaternion(_q).toArray(), _v2).clone();
      this.setGrip(H, W, c, palm, dir, F_PINCH, { at: this.PINCH });
      return 'pinch';
    }
    if (tool === 'milk') {
      // wrapped round the carton's lower half from the right, fingers round the back, thumb on the front corner
      this.ip(1, 0.34, 0.42, c);
      const palm = this.idir(-1, 0, 0, a);
      c.addScaledVector(palm, -0.004);
      this.setGrip(H, W, c, palm, this.idir(0, 0.15, -1, _v2), [0.6, 0.12, 0.55, 0.35, 0, 0.25]);
      return 'wrap';
    }
    if (tool === 'notebook') {
      // held up from behind: fingers spread on the back cover, thumb over the spine onto the front
      this.ip(0.2, 0, 0.3, c);
      const palm = this.idir(0, 1, 0, a);
      c.addScaledVector(palm, -0.006);
      this.setGrip(H, W, c, palm, this.idir(0.3, 0, 1, _v2), [0.12, 0.3, 0.85, 0.35, 0, 0.1]);
      return 'book';
    }
    if (tool === 'flyers') {
      // the stack's right edge in the web of the hand: fingers curled under it, thumb on the top sheet
      const xs = this.idir(1, 0, 0, _v3), ys = this.idir(0, 1, 0, up), zs = this.idir(0, 0, 1, _v4);
      this.ip(1, 0.5, 0.74, c);
      const palm = _v5.copy(xs).multiplyScalar(-1).addScaledVector(ys, -0.35).normalize();
      const dir = _v6.copy(zs).multiplyScalar(-0.85).addScaledVector(xs, -0.4).normalize();
      this.setGrip(H, W, c, palm.clone(), dir.clone(), [0.42, 0.08, 0.5, 0.2, 0, 0.3], { at: [-0.012, -0.072, 0.024] });
      return 'card';
    }
    if (tool === 'batteries') {
      // a blister card held upright at its lower right corner: fingers behind, thumb on the front
      const n = this.idir(0, 0, 1, a);
      this.ip(0.88, 0.22, 0, c).addScaledVector(n, -0.006);
      this.setGrip(H, W, c, n, this.idir(-0.35, 1, 0, _v2), [0.2, 0.1, 0.9, 0.45, 0, 0.3], { at: [-0.013, -0.095, 0.014] });
      return 'card';
    }
    // anything else: cradled on the palm
    this.ip(0.5, 0, 0.5, c);
    c.y -= 0.003;
    this.setGrip(H, W, c, N(0.25, 1, 0.25, a), N(-0.6, 0.1, -1, _v2), [0.45, 0.15, 0.4, 0.3, 0, 0.3], { ext: 0.7 });
    return 'cradle';
  }

  longAxis() { const s = [this.size(0), this.size(1), this.size(2)]; return s[0] > s[1] && s[0] > s[2] ? 0 : s[1] > s[2] ? 1 : 2; }

  /** Fist on a stick (broom handle) at fraction u along its long axis (1 = the end away from the bristles). */
  stickPose(H, W, u, key) {
    const ax = this.longAxis(), c = _c;
    const uu = [0.5, 0.5, 0.5]; uu[ax] = u;
    this.ip(uu[0], uu[1], uu[2], c);
    this.barGrip(H, W, c, this.idir(ax === 0 ? 1 : 0, ax === 1 ? 1 : 0, ax === 2 ? 1 : 0, _v2), [0.86, 0, 0.6, 0.45, 0, 0]);
    return key;
  }

  /** Where this hand's elbow will roughly be (anchor space) with the hand at `p`: the out-and-down pole of solve(). */
  elbowGuess(H, p, out) {
    const bs = this.bs, a = this.la * bs, c = this.lc * bs, sd = H.sd;
    const S = _v4.set(-sd * 0.2 * bs, -0.37 * bs, 0.02).lerp(H.shoulder, H.sb);
    const d = _v5.subVectors(p, S), l = clamp(d.length(), (a + c) * 0.3, (a + c) * 0.999), dn = d.normalize();
    const cosA = clamp((a * a + l * l - c * c) / (2 * a * l), -1, 1);
    this.rig.getWorldQuaternion(_q3).invert();
    const pd = _v6.set(sd * 0.55, -1, -0.35).applyQuaternion(_q3.multiply(this.human.root.quaternion));
    pd.set(-pd.x, pd.y, -pd.z);
    pd.addScaledVector(dn, -pd.dot(dn));
    if (pd.lengthSq() < 1e-8) pd.set(-sd, -1, 0);
    pd.normalize();
    return out.copy(S).addScaledVector(dn, a * cosA).addScaledVector(pd, a * Math.sqrt(1 - cosA * cosA));
  }

  /**
   * A fist round a bar (handle, stick, knot) at `contact`, `bar` along it (anchor space): the hand turns round the bar
   * so the forearm comes straight from where the elbow will be - no broken wrists - knuckles up and out.
   */
  barGrip(H, W, contact, bar, f) {
    const sd = H.sd, z = this.tmp[1].set(-bar.x, bar.y, -bar.z).normalize(); // rig space: anchor rotated 180° about y
    const y = this.tmp[2], x = this.tmp[3], at = this.tmp[4].copy(contact);
    for (let i = 0; i < 3; i++) {
      // the elbow depends on where the wrist ends up, which depends on how the hand turns: a few rounds settle it
      const el = this.elbowGuess(H, at, this.tmp[0]);
      y.set(-(el.x - at.x), el.y - at.y, -(el.z - at.z));
      y.addScaledVector(z, -y.dot(z));
      if (y.lengthSq() < 1e-8) y.set(0, 1, 0);
      y.normalize();
      x.crossVectors(y, z);
      // two ways round the bar: the back of the hand (sd * x) up and outwards
      if (sd * x.y * 0.6 + x.x * 0.8 < 0) { z.negate(); x.negate(); }
      W.q.setFromRotationMatrix(_m.makeBasis(x, y, z));
      this.wrist(H, contact, W.q, this.FIST, at);
    }
    W.p.copy(at);
    for (let i = 0; i < 6; i++) W.f[i] = f[i] ?? 0;
    W.e = 0.05;
  }

  readPose(nb, H, W) {
    const R = H.h === 1, sd = H.sd, book = nb.book, c = _c;
    const half = R ? nb.right : nb.left;
    const fl = nb.flip;
    const flipping = fl && (fl.dir > 0) === R && fl.t < 0.8;
    if (flipping) {
      // pinch the turning page's free corner and carry it over
      const page = nb.flipPage;
      page.updateWorldMatrix(true, false);
      const out = fl.t > 0.82;
      this.toAnchor(_v.set(nb.w * 0.93, -nb.h * 0.32, 0.004).applyMatrix4(page.matrixWorld), c);
      const nrm = this.dirToAnchor(_v.set(0, 0, 1).applyQuaternion(page.getWorldQuaternion(_q)), _v3);
      const toReader = nrm.z > 0 ? nrm : nrm.negate();
      this.setGrip(H, W, c, toReader.clone().negate(), this.dirToAnchor(_v.set(0, 1, 0).applyQuaternion(_q), _v2), [0.42, 0.1, 0.9, 0.5, 0.2, 0.4], { at: this.PINCH });
      if (out) W.p.z += 0.02;
      return 'flip' + fl.dir;
    }
    book.updateWorldMatrix(true, true);
    this.toAnchor(_v.set(sd * -(nb.w * 0.86), -nb.h * 0.36, -0.01).applyMatrix4(half.matrixWorld), c);
    const fwd = this.dirToAnchor(_v.set(0, 0, 1).applyQuaternion(half.getWorldQuaternion(_q)), _v3);
    const upB = this.dirToAnchor(_v.set(-sd * 0.35, 1, 0).applyQuaternion(_q), _v2);
    this.setGrip(H, W, c, fwd, upB, [0.28, 0.08, 0.85, 0.35, 0, 0.2]);
    return 'read';
  }

  // ------------------------------------------------------------------ world interactions
  crankPose(m, H, W) {
    const R = H.h === 1, c = _c;
    const fN = this.dirToAnchor(_v.set(0, 0, 1).applyQuaternion(m.root.getWorldQuaternion(_q)), _v3);
    if (!R) {
      // the other hand steadies the machine (when you stand close enough)
      this.toAnchor(m.local(-m.L.w * 0.3, m.L.handle.y + 0.11, m.L.front + 0.012), c);
      if (c.length() > 0.62) return this.freePose(H, W);
      this.setGrip(H, W, c, fN.clone().negate(), this.dirToAnchor(_v.set(0, 1, 0).applyQuaternion(_q), _v2), [0.12, 0.45, 0.25, 0.1, 0, 0.1]);
      return 'steady';
    }
    // fist on the knob bar; the wrist turns with it and re-grips the other way round (the bar is symmetric) every half turn
    const C = this.crank;
    if (C.m !== m) { C.m = m; C.flip = 0; C.n++; }
    const roll = Math.atan2(Math.sin(m.angle + C.flip * Math.PI - 0.4), Math.cos(m.angle + C.flip * Math.PI - 0.4));
    if (roll > 1.5) { C.flip ^= 1; C.n++; }
    m.handleGroup.updateWorldMatrix(true, false);
    this.toAnchor(_v.setFromMatrixPosition(m.handleGroup.matrixWorld), c).addScaledVector(fN, 0.022);
    const bar = this.dirToAnchor(_v.set(0, 1, 0).applyQuaternion(_q), _v2).applyAxisAngle(fN, -(m.angle + C.flip * Math.PI));
    this.setGrip(H, W, c, fN.clone().negate(), bar, [0.84, 0, 0.7, 0.5, 0, 0], { axis: true, at: this.FIST });
    return 'crank' + C.n;
  }

  coinPose(m, H, W) {
    const c = this.toAnchor(m.rope.pin, _c);
    const fN = this.dirToAnchor(_v.set(0, 0, 1).applyQuaternion(m.root.getWorldQuaternion(_q)), _v3);
    this.setGrip(H, W, c, fN.clone().negate().add(_v2.set(-0.3, 0.2, 0)), N(-0.2, 1, -0.6, _v2), F_PINCH, { at: this.PINCH });
    return 'coin';
  }

  liftPose(m, st, H, W) {
    const R = H.h === 1, box = st.box, gp = box.geometry.parameters, c = _c;
    const pl = this.game.player.pos;
    const to = _v2.set(pl.x - box.position.x, 0, pl.z - box.position.z);
    const ex = Math.abs(to.x) / (gp.width / 2 + 1e-3) > Math.abs(to.z) / (gp.depth / 2 + 1e-3);
    to.set(ex ? Math.sign(to.x) : 0, 0, ex ? 0 : Math.sign(to.z));
    const tan = _v3.crossVectors(Y, to);
    const k = st.k || 0, shake = Math.sin(this.t * 31) * 0.004 * k;
    _v.copy(box.position).addScaledVector(to, (ex ? gp.width : gp.depth) / 2 - 0.02).addScaledVector(Y, gp.height / 2 + 0.012 + k * 0.07 + shake);
    // each hand takes the end of the edge on its own side of the view (never crossed arms)
    this.toAnchor(_v6.copy(_v).add(tan), _v5);
    this.toAnchor(_v, c);
    _v.addScaledVector(tan, ((_v5.x > c.x) === R ? 1 : -1) * 0.17);
    this.toAnchor(_v, c);
    const down = this.dirToAnchor(_v.set(0, -1, 0), V());
    this.setGrip(H, W, c, down, this.dirToAnchor(_v.copy(to).negate(), _v2), [0.62 + k * 0.2, 0.2, 0.4, 0.3, 0, 0.1]);
    return 'lift';
  }

  repairPose(m, H, W) {
    const R = H.h === 1, c = _c;
    const fN = this.dirToAnchor(_v.set(0, 0, 1).applyQuaternion(m.root.getWorldQuaternion(_q)), _v3);
    const upA = this.dirToAnchor(_v.set(0, 1, 0).applyQuaternion(_q), V());
    if (!R) {
      this.toAnchor(m.local(-m.L.w * 0.32, m.L.slot.y + 0.06, m.L.front + 0.012), c);
      if (c.length() > 0.62) return this.freePose(H, W);
      this.setGrip(H, W, c, fN.clone().negate(), upA, [0.15, 0.4, 0.25, 0.1, 0, 0.1]);
      return 'steady';
    }
    // ratchet a bolt on the front panel, where you're aiming: a firm pull, an easy swing back
    this.props.wrench.visible = true;
    const hit = this.game.interaction.holding?.hit?.point;
    const bolt = this.toAnchor(finite(hit) ? hit : m.local(0.02, m.L.slot.y - 0.07, m.L.front + 0.012), V());
    const ph = (this.t * 1.55) % 1, th = ph < 0.4 ? -0.35 + 0.95 * inOutCubic(ph / 0.4) : 0.6 - 0.95 * smooth((ph - 0.4) / 0.6);
    const arm = upA.clone().applyAxisAngle(fN, -1.2 + th).multiplyScalar(0.085 * this.bs);
    c.copy(bolt).add(arm).addScaledVector(fN, 0.012);
    const toward = _v2.copy(bolt).sub(c).normalize();
    const palm = _v4.crossVectors(fN, toward).normalize();
    this.setGrip(H, W, c, palm, toward, [0.9, 0, 0.72, 0.5, 0, 0], { axis: true, at: this.FIST });
    return 'wrench';
  }

  /** Timed actions. Returns a key while it drives hand H, null to let it do its usual thing. */
  actPose(a, H, W) {
    const g = this.game, R = H.h === 1, c = _c, k = a.t / a.dur;
    switch (a.name) {
      case 'tap': {
        if (H.h !== a.hand) return null;
        // a small draw-back, a quick reach, the fingertip presses in and holds a beat, then the hand eases back to
        // whatever it was doing
        const B = this.basePose(H), T = this.tgt;
        const at = _v3.copy(a.at);
        const d = at.length(), max = 0.55 * this.bs;
        if (d > max) at.multiplyScalar(max / d);
        const dir = _v2.copy(at).sub(_v.set(H.sd * -0.17, -0.3, 0)).normalize();
        this.setGrip(H, T, at, N(H.sd * 0.6, -0.4, 0.1, _v4), dir, F_TAP, { at: this.TIP });
        const r = k < 0.08 ? 0 : k < 0.4 ? outCubic((k - 0.08) / 0.32) : k < 0.58 ? 1 : 1 - inOutCubic((k - 0.58) / 0.42);
        T.p.addScaledVector(dir, 0.012 * bell((k - 0.36) / 0.2)); // the press
        B.p.addScaledVector(dir, -0.018 * bell(k / 0.16)); // wind-up
        this.mixPose(W, B, T, r * 0.96, smooth(r * 1.4), win(k, 0, 0.22) * (1 - win(k, 0.7, 0.95)));
        return 'tap';
      }
      case 'give': {
        if (H.h !== a.hand) return null;
        // the free hand peels a sheet off the stack, holds it out to them, lets go and comes back
        const B = this.basePose(H), T = this.tgt, P = this.tgt2;
        const it = g.held.item, stack = it?.kind === 'tool' && it.data.id === 'flyers' && it.obj.visible ? it.obj : null;
        const at = _v3.copy(a.at);
        const d = at.length(), max = 0.58 * this.bs;
        if (d > max) at.multiplyScalar(max / d);
        // the sheet's corner from the top of the stack (when the other hand holds it)
        if (stack && H.h === 0) {
          this.frame(stack);
          this.ip(0.12, 1, 0.28, c);
          this.setGrip(H, P, c, this.idir(0, -1, 0, _v4).clone(), this.idir(0.4, 0, -1, _v2).clone(), F_PINCH, { at: this.PINCH });
          P.p.y += 0.016 * win(k, 0.2, 0.3);
        } else P.copy(B);
        this.setGrip(H, T, at, N(H.sd * 0.25, 0.2, 0.9, _v4), _v2.copy(at).normalize().clone(), F_PINCH, { at: this.PINCH });
        T.p.addScaledVector(_v2, 0.02 * win(k, 0.5, 0.62));
        const w1 = inOutCubic(k / 0.22), w2 = inOutCubic((k - 0.3) / 0.28), w3 = inOutCubic((k - 0.66) / 0.34);
        this.mixPose(W, B, P, w1, smooth(w1 * 1.3), w1);
        this.mixPose(W, W, T, w2, smooth(w2 * 1.25), 0);
        this.mixPose(W, W, B, w3, w3, w3);
        // let go: the fingers open as they take it
        const open = win(k, 0.58, 0.66) * (1 - w3);
        W.f[0] -= open * 0.35; W.f[1] += open * 0.3; W.f[2] -= open * 0.45;
        this.flyerK = k > 0.24 && k < 0.64 ? 1 - win(k, 0.58, 0.64) : 0;
        return 'give';
      }
      case 'toss': {
        if (!R) return null;
        // a flick: forward and up with the fingers springing open, a little follow-through, then it settles back
        const B = this.basePose(H), T = this.tgt;
        T.copy(B);
        const f = bell(k / 0.75) * (1 - 0.25 * win(k, 0.2, 0.5));
        T.p.add(_v.set(-0.03, 0.09, -0.15));
        this.handQ(H.sd, N(-0.1, 0.55, 0.5, _v4), N(-0.25, 0.75, -1, _v2), T.q);
        T.f[0] = 0.08; T.f[1] = 0.45; T.f[2] = 0.15; T.f[3] = 0.1; T.f[4] = 0; T.f[5] = 0.3;
        this.mixPose(W, B, T, outCubic(Math.min(1, k / 0.22)) * f, smooth(Math.min(1, k / 0.2)) * f, f);
        return 'toss';
      }
      case 'key': {
        if (!R || !a.obj.parent) return null;
        // bring the key to the lock, push it in, turn it a quarter (the hand turns with it), a beat, then let go
        const o = a.obj;
        if (!a.from) { a.from = o.position.clone(); a.fromQ = o.quaternion.clone(); }
        const reach = inOutCubic(k / 0.32), push = win(k, 0.3, 0.4), turn = smoother((k - 0.42) / 0.22), back = win(k, 0.86, 1);
        o.position.copy(a.from).lerp(_v.set(0.07, -0.19, -0.48 - push * 0.025), reach);
        o.position.z += back * 0.015;
        // blade forward into the lock, then a quarter turn about it
        o.quaternion.copy(a.fromQ).slerp(_q.setFromEuler(_e.set(0.2, 1.45, 0)), reach).premultiply(_q2.setFromAxisAngle(Z, -turn * Math.PI / 2));
        if (turn > 0.3 && !a.clicked) { a.clicked = true; audio.play('keyTurn', { vol: 0.45 }); }
        return null; // the pinch grip on the key does the rest
      }
      case 'pour':
      case 'use': {
        const o = a.obj;
        if (!o.parent) return null;
        if (a.name === 'pour') {
          // lift the carton over the bowl, tip it (a stream of milk), tip it back, lower it away
          const lift = inOutCubic(k / 0.28), tilt = smooth((k - 0.2) / 0.22) * (1 - smooth((k - 0.72) / 0.14)), away = inOutCubic((k - 0.84) / 0.16);
          o.position.copy(a.from).lerp(_v.set(0.05, -0.08, -0.42), lift);
          o.position.y += Math.sin(this.t * 13) * 0.0015 * tilt - away * 0.35;
          o.quaternion.copy(a.fromQ).premultiply(_q.setFromAxisAngle(Z, tilt * 1.85 + lift * 0.08));
          if (tilt > 0.75 && Math.random() < 0.7) {
            this.frame(o);
            const top = this.ip(0.5, 1, 0.5, _v3);
            _v.copy(top).applyMatrix4(this.game.held.anchor.matrixWorld);
            g.effects.sparks({ pos: _v, count: 2, colors: [0xffffff, 0xf4f0e8], speed: 0.15, size: 0.012, gravity: 2.5, life: 0.5, star: 0, radius: 0.005 });
          }
        } else {
          const at = a.at || _v3.set(0.05, -0.1, -0.6);
          const d = at.length(), max = 0.5 * this.bs;
          _v3.copy(at); if (d > max) _v3.multiplyScalar(max / d);
          o.position.copy(a.from).lerp(_v3, inOutCubic(k / 0.62));
          o.scale.setScalar(a.fromS * (1 - smooth((k - 0.58) / 0.42)));
        }
        if (!R) return null;
        const r = this.gripPose(o, 'tool', a.it.data, 'item', H, W);
        return r ? 'act-' + a.name : null;
      }
      default: return null;
    }
  }

  /** What hand H would be doing without the current action (actions blend out of it and back into it). */
  basePose(H) {
    const a = this.act, B = H.base || (H.base = new Pose());
    this.act = null;
    this.choose(H, B);
    this.act = a;
    return B;
  }

  /** out = a blended towards b: position by wp, rotation by wq, fingers by wf. */
  mixPose(out, a, b, wp, wq, wf) {
    out.p.copy(a.p).lerp(b.p, wp);
    out.q.copy(a.q).slerp(b.q, clamp(wq, 0, 1));
    for (let i = 0; i < 6; i++) out.f[i] = lerp(a.f[i], b.f[i], wf);
    out.e = lerp(a.e, b.e, wp);
    return out;
  }

  // --- empty hands: relaxed and low in the bottom corners, breathing; they swing with your legs when you walk and
  // pump as fists when you run; looking down they hang at your sides; the free hand rises and opens a little when you
  // aim at something to take or press
  freePose(H, W) {
    const g = this.game, P = g.player, sd = H.sd, s = this.swingS[H.h], wk = this.walkW, run = this.runW;
    const br = Math.sin(this.t * 1.7 + H.h * 0.7), step = Math.abs(Math.sin(this.human.phase * Math.PI * 2));
    // walking: lower and looser, a pendulum swing (the forward hand a touch higher, the back one out of view) with a
    // dip on every footfall
    const fw = s * wk * (1 - run);
    let x = -sd * (0.272 - 0.01 * fw), y = -0.238 + br * 0.004 - wk * 0.018 + 0.014 * fw + 0.012 * fw * fw - step * 0.007 * wk, z = -0.325 - fw * 0.05;
    // running: loose fists pumping forward and up
    if (run > 0) { x = lerp(x, -sd * (0.245 - 0.025 * Math.max(0, s)), run); y = lerp(y, -0.262 + Math.max(0, s) * 0.06 - step * 0.012, run); z = lerp(z, -0.3 - s * 0.11, run); }
    if (g.held.inspecting) y -= 0.2; // out of the way while you admire a figure
    y -= smooth((-0.2 - P.pitch) / 0.5) * 0.22; // looking down they drop out of view, then hang at your sides
    const ready = this.readyTarget(H);
    let key = 'free';
    if (ready) { x = ready.x; y = ready.y; z = ready.z; key = 'ready'; }
    W.p.set(x, y, z);
    const lift = fw * 0.16 + run * (0.3 + Math.max(0, s) * 0.3);
    this.handQ(sd, N(sd, ready ? -0.15 : -0.2, ready ? 0.15 : 0.05, _v2), N(sd * 0.22, (ready ? 0.15 : 0.1) + lift, -1, _v3), W.q);
    W.f[0] = ready ? 0.12 : lerp(0.28 + br * 0.03, 0.9, run); W.f[1] = ready ? 0.5 : 0.15; W.f[2] = ready ? 0.2 : lerp(0.3, 0.65, run); W.f[3] = lerp(0.3, 0.6, run); W.f[4] = 0; W.f[5] = ready ? 0.1 : 0.45; W.e = 0.2;
    // looking down: your arms just hang at your sides
    const kd = this.lookDown = smooth((-0.3 - P.pitch) / 0.5) * (ready ? 0 : 1);
    if (kd > 0) { W.p.lerp(H.natural.p, kd); W.q.slerp(H.natural.q, kd); W.f[0] = lerp(W.f[0], 0.3, kd); }
    return key;
  }

  readyTarget(H) {
    const g = this.game, hv = g.interaction.hover, it = g.held.item;
    if (!hv || g.held.reading || !finite(hv.hit?.point)) return null;
    const free = this.freeHand();
    if (H.h !== free || (it && it.obj.visible && free === 1)) return null;
    const o = hv.obj, m = g.machines.find((x) => x.root === o);
    let takeable = o === g.street?.cat?.g || (m && (m.state === 'idle' || m.state === 'ready'));
    if (!takeable) for (const e of g.items.list) if (e.obj === o) { takeable = true; break; }
    if (!takeable) return null;
    this.toAnchor(hv.hit.point, _v);
    const d = _v.length();
    return { x: -H.sd * 0.2 + _v.x / d * 0.05, y: -0.2 + _v.y / d * 0.03, z: -0.36 };
  }

  // ------------------------------------------------------------------ blending + IK
  blend(H, dt) {
    const O = H.out, W = H.want;
    if (!finite(W.p) || !Number.isFinite(W.q.w)) W.copy(O);
    if (!finite(O.p)) { O.copy(W); H.from.copy(W); }
    H.k = Math.min(1, H.k + dt / H.dur);
    if (H.k >= 1) { O.copy(W); return; }
    const k = H.k, e = smoother(k), F = H.from;
    // position eases in and out along a slight arc (hands drop and draw in a touch mid-move), the wrist turns a little
    // ahead of the arm, the fingers settle last
    O.p.copy(F.p).lerp(W.p, e);
    const arc = bell(e) * H.arc;
    O.p.y -= arc * 0.03; O.p.z += arc * 0.012;
    O.q.copy(F.q).slerp(W.q, smoother(k * 1.2));
    const ef = smooth((k - 0.25) / 0.75);
    for (let i = 0; i < 6; i++) O.f[i] = lerp(F.f[i], W.f[i], ef);
    O.e = lerp(F.e, W.e, e);
    // reaching to hold something: the hand opens on the way and closes on it
    if (H.grab) { const o = bell(Math.min(1, k * 1.15)); O.f[0] -= o * 0.42; O.f[1] += o * 0.25; O.f[2] -= o * 0.3; O.f[5] -= o * 0.3; }
    // re-grips open the hand on the way
    if (H.bump) { const b = bell(e); O.f[0] -= b * 0.55; O.f[2] -= b * 0.4; O.p.z += b * 0.015; }
    for (let i = 0; i < 6; i++) O.f[i] = clamp(O.f[i], -0.1, 1);
  }

  solve(H) {
    const bs = this.bs, a = this.la, c = this.lc, B = this.hb[H.h], O = H.out, sd = H.sd, t = this.tmp;
    // rig space: anchor rotated 180° about y and scaled by the body
    // viewmodel shoulders sit low under the view (forearms rise from the bottom edge instead of looming over it);
    // reaching out into the world, or hanging at your sides when you look down, the arms move from your real shoulders
    const real = FAR.test(H.src) || H.src === 'reach' ? 1 : H.src === 'free' ? this.lookDown : 0;
    H.sb += (real - H.sb) * Math.min(1, this.dt * 6);
    const sh = t[0].set(-sd * 0.2 * bs, -0.37 * bs, 0.02).lerp(H.shoulder, H.sb);
    H.bendS = (H.bendS || 0) + (H.bend * H.sb - (H.bendS || 0)) * Math.min(1, this.dt * 8);
    if (H.bendS > 1e-4) sh.addScaledVector(this.leanDir(t[1]), H.bendS); // bent at the waist: shoulders down and forward
    const S = this._S.set(-sh.x, sh.y, -sh.z).divideScalar(bs);
    const T = this._T.set(-O.p.x, O.p.y, -O.p.z).divideScalar(bs);
    // lean in a touch for things just out of reach (bones never stretch: anything farther is capped in reachCap)
    const d = t[1].subVectors(T, S), L0 = d.length(), reach = (a + c) * 0.97;
    if (L0 > reach) { S.addScaledVector(d, Math.min(0.05 / bs, L0 - reach) / L0); d.subVectors(T, S); }
    const l = clamp(d.length(), (a + c) * 0.3, (a + c) * 0.999), dn = d.normalize();
    const cosA = clamp((a * a + l * l - c * c) / (2 * a * l), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
    // the elbow can sit anywhere on a circle around the shoulder-wrist line: take the spot that lines the forearm up
    // with the back of the hand (a relaxed wrist, slightly extended), leaning towards "out and down"
    this.rig.getWorldQuaternion(_q3).invert();
    const bodyQ = _q.copy(_q3).multiply(this.human.root.quaternion);
    const pd = t[2].set(sd * 0.55, -1, -0.35).applyQuaternion(bodyQ);
    pd.addScaledVector(dn, -pd.dot(dn));
    if (pd.lengthSq() < 1e-6) pd.set(sd, 0, 0);
    pd.normalize();
    const C = t[3].copy(S).addScaledVector(dn, a * cosA);
    const fI = t[4].set(0, 1, 0).applyQuaternion(O.q).multiplyScalar(Math.cos(O.e)).addScaledVector(t[5].set(sd, 0, 0).applyQuaternion(O.q), Math.sin(O.e)).normalize();
    const pI = t[5].copy(T).addScaledVector(fI, c).sub(C);
    pI.addScaledVector(dn, -pI.dot(dn));
    const bu = t[6].set(0, 1, 0).applyQuaternion(bodyQ);
    let wI = 0;
    if (pI.lengthSq() > 1e-8) {
      pI.normalize();
      // never an elbow flung up above the arm or tucked across the body
      wI = 0.88 * (1 - smooth((pI.dot(bu) - 0.25) / 0.5)) * (1 - smooth((-pI.dot(t[7].set(sd, 0, 0).applyQuaternion(bodyQ)) - 0.35) / 0.5));
    }
    const pole = t[7].copy(pd).multiplyScalar(1 - wI).addScaledVector(pI, wI);
    if (pole.lengthSq() < 1e-6) pole.copy(pd);
    pole.normalize();
    H.pole = H.pole || V();
    if (H.pole.lengthSq() < 0.5) H.pole.copy(pole); else H.pole.lerp(pole, Math.min(1, this.dt * 14)).normalize();
    const elbow = t[8].copy(C).addScaledVector(H.pole, a * sinA);
    const u1 = t[2].subVectors(elbow, S).normalize(), u2 = t[3].subVectors(T, elbow);
    if (u2.lengthSq() < 1e-8) u2.copy(dn); else u2.normalize();
    // upper arm: bone y back up the arm, the forearm bending towards its +z
    const fwd = t[4].copy(u2).addScaledVector(u1, -u2.dot(u1));
    if (fwd.lengthSq() < 1e-8) fwd.copy(H.pole).negate(); else fwd.normalize();
    const by = t[5].copy(u1).negate(), bx = t[6].crossVectors(by, fwd);
    const Qu = _q.setFromRotationMatrix(_m.makeBasis(bx, by, fwd));
    const ang = Math.acos(clamp(u1.dot(u2), -1, 1));
    const Qf = _q2.copy(Qu).multiply(_q3.setFromAxisAngle(X, -ang));
    // forearm twist: the hand's roll about the forearm, spread along it (half way bone + wrist bone)
    const zF = t[7].set(0, 0, 1).applyQuaternion(Qf), zH = t[8].set(0, 0, 1).applyQuaternion(O.q);
    zH.addScaledVector(u2, -zH.dot(u2));
    let tw = H.tw || 0;
    if (zH.lengthSq() > 1e-6) {
      // unwrapped against last frame, so a roll past half a turn stops at the limit instead of flipping to the other one
      const raw = Math.atan2(t[9].crossVectors(zF, zH).dot(u2), zF.dot(zH));
      tw = clamp(raw + Math.round((tw - raw) / (Math.PI * 2)) * Math.PI * 2, -1.9, 1.9);
    }
    H.tw = tw;
    B.arm.position.copy(S);
    B.arm.quaternion.copy(Qu);
    B.fore.quaternion.copy(Qu).invert().multiply(Qf);
    B.tA.quaternion.setFromAxisAngle(t[9].set(0, -1, 0), tw * 0.5);
    B.tB.quaternion.setFromAxisAngle(t[9], tw);
    B.hand.quaternion.copy(Qf).multiply(B.tB.quaternion).invert().multiply(O.q);
    this.fingers(H.h, O.f);
  }

  fingers(h, f) {
    const [curl, spread, thumb, tcurl, point, casc = 0] = f, sd = h ? -1 : 1, bones = this.bones;
    for (let fi = 0; fi < 4; fi++) {
      let c = clamp(curl + fi * (0.02 + casc * 0.12), 0, 1);
      if (fi === 0) c = lerp(c, 0.02, point); else if (point > 0) c = lerp(c, Math.max(c, 0.9), point);
      // fingers fan out when open, draw together as they close
      const ab = [-0.14, -0.04, 0.06, 0.17][fi] * (0.25 + spread) * (1 - c * 0.55) + (fi === 3 ? 0.03 : 0);
      // the knuckles lead, the middle and end joints follow (a relaxed hand curls softly, never a hooked claw)
      const a0 = 0.06 + c * 1.42, a1 = 0.08 + 1.67 * c ** 1.3, a2 = 0.04 + 1.15 * c ** 1.4;
      const q = bones[fingBone(h, fi, 0)].quaternion;
      q.setFromAxisAngle(Z, -sd * a0).premultiply(_q.setFromAxisAngle(X, ab));
      bones[fingBone(h, fi, 1)].quaternion.setFromAxisAngle(Z, -sd * a1);
      bones[fingBone(h, fi, 2)].quaternion.setFromAxisAngle(Z, -sd * a2);
    }
    const T = this.thumbQ[h];
    bones[fingBone(h, 4, 0)].quaternion.slerpQuaternions(T.relax, T.oppose, clamp(thumb, 0, 1));
    bones[fingBone(h, 4, 1)].quaternion.setFromAxisAngle(Z, -sd * (0.12 + tcurl * 0.62));
    bones[fingBone(h, 4, 2)].quaternion.setFromAxisAngle(Z, -sd * (0.14 + tcurl * 0.9));
  }

  /** The sheet being handed out: pinched at its lower corner, standing up and facing them (you see its back). */
  placeFlyer() {
    const F = this.props.flyer, a = this.act;
    F.visible = this.flyerK > 0.02 && a?.name === 'give';
    if (!F.visible) return;
    const H = this.hands[a.hand], hb = this.hb[H.h].hand, k = this.k;
    hb.updateWorldMatrix(true, false);
    const pin = _v.set(this.PINCH[0] * k * H.sd, this.PINCH[1] * k, this.PINCH[2] * k).applyMatrix4(hb.matrixWorld).applyMatrix4(this.anchorInv);
    const n = N(H.sd * 0.15, 0.2, 1, _v2), up = _v3.set(-H.sd * 0.3, 1, 0);
    up.addScaledVector(n, -up.dot(n)).normalize();
    F.quaternion.setFromRotationMatrix(_m.makeBasis(n, up, _v4.crossVectors(n, up)));
    const side = _v4.crossVectors(up, n).multiplyScalar(-H.sd); // towards the middle of the view
    F.position.copy(pin).addScaledVector(up, 0.042).addScaledVector(side, 0.026).addScaledVector(n, 0.004);
    F.scale.setScalar(this.flyerK);
  }

  /**
   * Your shadow holds what you hold: the walking body's arms reach from its real shoulders to where the viewmodel hands
   * are (2-bone IK in world space), hands turned the same way. Empty hands keep the body's own walking swing.
   */
  armsToBody() {
    const h = this.human, b = h.b, t = this.tmp, dt = this.dt;
    if (!this.rig.visible) return; // keep the natural swing
    h.root.updateMatrixWorld(true);
    const a = this.la * this.bs, c = this.lc * this.bs;
    b.chest.getWorldQuaternion(_q3);
    for (let i = 0; i < 2; i++) {
      const H = this.hands[i], s = i ? 'R' : 'L', B = this.hb[i], sd = H.sd;
      H.bw = (H.bw ?? 0) + ((/^(free|ready)/.test(H.src) ? 0 : 1) - (H.bw ?? 0)) * Math.min(1, dt * 6);
      if (H.bw < 0.01) continue;
      const S = b['arm' + s].getWorldPosition(t[0]), T = B.hand.getWorldPosition(t[1]);
      const d = t[2].subVectors(T, S), l = clamp(d.length(), (a + c) * 0.3, (a + c) * 0.999), dn = d.normalize();
      const cosA = clamp((a * a + l * l - c * c) / (2 * a * l), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
      const pole = t[3].set(sd * 0.6, -1, -0.45).applyQuaternion(_q3);
      pole.addScaledVector(dn, -pole.dot(dn));
      if (pole.lengthSq() < 1e-8) pole.set(0, -1, 0);
      pole.normalize();
      const elbow = t[4].copy(S).addScaledVector(dn, a * cosA).addScaledVector(pole, a * sinA);
      const u1 = t[5].subVectors(elbow, S).normalize(), u2 = t[6].subVectors(T, elbow).normalize();
      const fwd = t[7].copy(u2).addScaledVector(u1, -u2.dot(u1));
      if (fwd.lengthSq() < 1e-8) fwd.copy(pole).negate(); else fwd.normalize();
      const by = t[8].copy(u1).negate(), bx = t[9].crossVectors(by, fwd);
      const Qu = _q.setFromRotationMatrix(_m.makeBasis(bx, by, fwd));
      const Qf = _q2.copy(Qu).multiply(this._qa.setFromAxisAngle(X, -Math.acos(clamp(u1.dot(u2), -1, 1))));
      const w = smooth(H.bw);
      b['arm' + s].quaternion.slerp(this._qb.copy(_q3).invert().multiply(Qu), w);
      b['fore' + s].quaternion.slerp(this._qb.copy(Qu).invert().multiply(Qf), w);
      b['hand' + s].quaternion.slerp(this._qb.copy(Qf).invert().multiply(B.hand.getWorldQuaternion(this._qc)), w);
    }
  }

  // ------------------------------------------------------------------ held item out of the way during one-hand actions
  applyStash(dt) {
    const g = this.game, it = g.held.item, S = this.stash, a = this.act, ho = g.interaction.holding;
    // the right hand is needed elsewhere: crank, coin, repairs (and taps / flyers it does for you)
    const onWorld = ho && (g.machines.some((m) => m.root === ho.obj) || (g.story?.covers && [...g.story.covers.values()].some((c) => c.box === ho.obj)));
    const on = !!it && it.obj.visible && it.obj.parent === g.held.anchor && !g.held.reading && !g.held.busy
      && (onWorld || !!this.coinMachine() || (a && (a.name === 'tap' || a.name === 'give') && a.hand === 1));
    if (S.obj && S.obj !== it?.obj) this.unstash();
    S.k = clamp(S.k + (on ? dt / 0.22 : -dt / 0.3), 0, 1);
    if (!it || S.k <= 0) { this.unstash(); return; }
    const o = it.obj;
    if (S.obj !== o || !o.position.equals(S.last)) { S.obj = o; S.base.copy(o.position); }
    const e = smoother(S.k);
    o.position.copy(S.base).add(_v.set(0.06 * e, -0.3 * e, 0.06 * e));
    S.last.copy(o.position);
  }

  unstash() {
    const S = this.stash;
    if (S.obj && S.obj.position.equals(S.last)) S.obj.position.copy(S.base);
    S.obj = null; S.k = 0;
  }
}

export function installFP(game) {
  const fp = new FPBody(game);
  game.fp = fp;
  Game.updaters.push((g, dt) => fp.update(dt));
}
