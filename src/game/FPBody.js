// Your own body in first person, built from your avatar (src/people/avatar.js) so the sleeves and skin match it.
//  - body: a full Human walking under the camera (legs, torso and feet when you look down). Its head and arms are only
//    drawn into shadow maps (bone matrices collapsed for the colour passes), so you also cast a complete shadow.
//  - arms: a viewmodel copy of the avatar's arms (rendered on top by the renderer's viewmodel pass, so they never poke
//    into walls) with articulated hands (3-bone fingers + thumb), IK'd to grips on whatever Held carries (one pose per
//    kind of thing: cradled capsule, figure on the palm, book by the spine, broom in both fists...), plus contextual
//    actions: coin, crank, twist, notebook pages, broom, wrench, lifting, pouring, flyers, petting, the shutter key,
//    taps on switches. Empty hands rest low in the corners and swing with your stride. Every change of what a hand
//    does is cross-faded; after cutscenes / the PC the hands rise back into view.
import * as THREE from 'three';
import { Game } from './Game.js';
import { BONES, BONE_INDEX } from '../people/body.js';
import { ATLAS } from '../people/mesh.js';
import { createAvatarHuman } from '../people/avatar.js';
import { audio } from '../core/audio.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const outCubic = (t) => 1 - (1 - t) ** 3;
const V = () => new THREE.Vector3();
const _v = V(), _v2 = V(), _v3 = V(), _v4 = V(), _v5 = V(), _v6 = V(), _c = V(), _up = V(), _ax = V();
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();
const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _box = new THREE.Box3(), _e = new THREE.Euler();
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const N = (x, y, z, out = V()) => out.set(x, y, z).normalize();

// the body's bones that stay out of the colour passes (the camera sits in the head; the viewmodel arms replace these)
const HIDE = ['neck', 'head', 'tailL', 'tailR', 'armL', 'foreL', 'handL', 'armR', 'foreR', 'handR', 'prop'].map((b) => BONE_INDEX[b]);
const ARM_BONES = new Set(['armL', 'foreL', 'armR', 'foreR'].map((b) => BONE_INDEX[b]));

// ---------------------------------------------------------------- hand model (left hand, hand-bone space, 1.72 m adult)
// rest frame = the Human's: fingers point -y, the palm faces -x (towards the body), the thumb is on +z
const FING = [ // knuckle [z, y], phalanx lengths, half width (z), half thickness (x)
  { k: [0.026, -0.08], len: [0.034, 0.022, 0.018], w: 0.0092, t: 0.0083 },
  { k: [0.0085, -0.083], len: [0.037, 0.025, 0.019], w: 0.0096, t: 0.0086 },
  { k: [-0.009, -0.081], len: [0.035, 0.023, 0.018], w: 0.009, t: 0.0081 },
  { k: [-0.0255, -0.075], len: [0.027, 0.017, 0.015], w: 0.0079, t: 0.0073 },
];
const THUMB = { base: [-0.005, -0.012, 0.019], len: [0.038, 0.03, 0.026], w: 0.0106, t: 0.0092 };
const T_RELAX = new THREE.Vector3(-0.3, -0.82, 0.5).normalize();
const T_OPPOSE = new THREE.Vector3(-0.62, -0.78, 0.06).normalize();
const T_TOWARD = new THREE.Vector3(-0.35, -0.1, -1).normalize(); // where the thumb curls to
const PALM_C = [-0.0135, -0.05, 0.003]; // palm surface centre (left hand)
const PINCH_C = [-0.022, -0.118, 0.022]; // between thumb and index tips
const FIST_C = [-0.028, -0.078, 0.004]; // inside a closed fist
const NBONES = BONES.length;
const fingBone = (h, f, j) => NBONES + h * 15 + f * 3 + j; // h: 0 left, 1 right; f: 0-3 fingers, 4 thumb

/** Low-poly segment: chamfered rings stacked along y, flat shaded, rigidly skinned to `bone`. rings: [y, hx, hz, cx?, cz?] */
function prism(G, rings, bone, mat, tint) {
  const pts = rings.map(([y, hx, hz, cx = 0, cz = 0]) => {
    const c = 0.38 * Math.min(hx, hz);
    return [[hx, hz - c], [hx - c, hz], [-hx + c, hz], [-hx, hz - c], [-hx, -hz + c], [-hx + c, -hz], [hx - c, -hz], [hx, -hz + c]]
      .map(([x, z]) => new THREE.Vector3(cx + x, y, cz + z).applyMatrix4(mat));
  });
  const axis = rings.map(([y, , , cx = 0, cz = 0]) => new THREE.Vector3(cx, y, cz).applyMatrix4(mat));
  const n = pts.length;
  for (let i = 0; i < n - 1; i++) {
    const A = pts[i], B = pts[i + 1], mid = axis[i].clone().add(axis[i + 1]).multiplyScalar(0.5);
    for (let k = 0; k < 8; k++) G.quad(A[k], A[(k + 1) % 8], B[(k + 1) % 8], B[k], mid, bone, tint, i === n - 2);
  }
  // end caps face away from the neighbouring ring
  for (let k = 0; k < 8; k++) G.tri(axis[0], pts[0][k], pts[0][(k + 1) % 8], axis[1], bone, tint, false);
  for (let k = 0; k < 8; k++) G.tri(axis[n - 1], pts[n - 1][k], pts[n - 1][(k + 1) % 8], axis[n - 2], bone, tint, true);
}

class HandGeo {
  constructor() { this.pos = []; this.nrm = []; this.col = []; this.si = []; }
  tri(a, b, c, ref, bone, tint, tip) {
    const n = _v2.subVectors(b, a).cross(_v3.subVectors(c, a));
    if (n.lengthSq() < 1e-14) return;
    n.normalize();
    // outward = away from `ref`, a point inside the segment
    if (n.dot(_v4.subVectors(a, ref)) < 0) { n.negate(); [b, c] = [c, b]; }
    const col = tint(n, tip);
    for (const p of [a, b, c]) { this.pos.push(p.x, p.y, p.z); this.nrm.push(n.x, n.y, n.z); this.col.push(col[0], col[1], col[2]); this.si.push(bone, 0, 0, 0); }
  }
  quad(a, b, c, d, ref, bone, tint, tip) { this.tri(a, b, c, ref, bone, tint, tip); this.tri(a, c, d, ref, bone, tint, tip); }
  /** Mirror everything onto the right hand (x -> -x, bones remapped). */
  mirror(boneMap) {
    const n = this.pos.length / 9;
    for (let t = 0; t < n; t++) {
      const o = t * 9;
      for (const k of [0, 2, 1]) {
        const i = o + k * 3;
        this.pos.push(-this.pos[i], this.pos[i + 1], this.pos[i + 2]);
        this.nrm.push(-this.nrm[i], this.nrm[i + 1], this.nrm[i + 2]);
        this.col.push(this.col[i], this.col[i + 1], this.col[i + 2]);
        this.si.push(boneMap(this.si[(o / 3 + k) * 4]), 0, 0, 0);
      }
    }
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    const n = this.pos.length / 3;
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(new Float32Array(n * 4).map((_, i) => (i % 4 ? 0 : 1)), 4));
    return g;
  }
}

// per-hand pose: wrist position (anchor space), hand orientation (rig space), fingers [curl, spread, thumb, thumbCurl, point]
class Pose {
  constructor() { this.p = V(); this.q = new THREE.Quaternion(); this.f = [0.3, 0.2, 0.2, 0.2, 0]; }
  copy(o) { this.p.copy(o.p); this.q.copy(o.q); for (let i = 0; i < 5; i++) this.f[i] = o.f[i]; return this; }
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
      h, sd: h ? -1 : 1, src: '', k: 1, dur: 0.2, bump: 0, sb: 0,
      want: new Pose(), out: new Pose(), from: new Pose(), shoulder: V(), natural: new Pose(),
    }));
    this.t = 0;
    this.presence = 0; this.lookDown = 0; this.dt = 1 / 60;
    this.legYaw = 0;
    this.swing = [0, 0];
    this.walkW = 0; this.runW = 0;
    this.act = null; // timed action { name, t, dur, ... }
    this.bounds = new WeakMap();
    this.stash = { k: 0, obj: null, base: V(), last: V() };
    this.crank = { m: null, flip: 0, n: 0 };
    this.lastUses = -1;
    this.anchorInv = new THREE.Matrix4();
    this._S = V(); this._T = V();
    this.IP = V(); this.IQ = new THREE.Quaternion(); this.IS = 1; this.B = new THREE.Box3();
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
    this.k = P.H / 1.72 * 0.93; // hand size
    this.buildArms(h);
  }

  buildArms(h) {
    const P = this.P, J = h.J, k = this.k;
    // skeleton: the Human's bone order (so its skin indices work) + 15 finger bones per hand
    const bones = [];
    for (let i = 0; i < NBONES + 30; i++) bones.push(new THREE.Bone());
    const arms = new THREE.SkinnedMesh(this.armGeometry(h), h.mat);
    for (const s of ['L', 'R']) {
      const sx = s === 'L' ? 1 : -1;
      const a = bones[BONE_INDEX['arm' + s]], f = bones[BONE_INDEX['fore' + s]], hd = bones[BONE_INDEX['hand' + s]];
      a.position.set(J['arm' + s][0], J['arm' + s][1], J['arm' + s][2]);
      f.position.set(J['fore' + s][0] - J['arm' + s][0], P.elbowY - P.shoulderY, 0);
      hd.position.set(0, P.wristY - P.elbowY, 0);
      arms.add(a); a.add(f); f.add(hd);
      const hi = s === 'L' ? 0 : 1;
      FING.forEach((F, fi) => {
        let parent = hd;
        F.len.forEach((len, j) => {
          const b = bones[fingBone(hi, fi, j)];
          if (j === 0) b.position.set(sx * -0.001 * k, F.k[1] * k, F.k[0] * k); else b.position.set(0, -F.len[j - 1] * k, 0);
          parent.add(b); parent = b;
        });
      });
      const tr = T_RELAX.clone(); tr.x *= sx;
      const t0 = bones[fingBone(hi, 4, 0)], t1 = bones[fingBone(hi, 4, 1)], t2 = bones[fingBone(hi, 4, 2)];
      t0.position.set(sx * THUMB.base[0] * k, THUMB.base[1] * k, THUMB.base[2] * k);
      t0.quaternion.setFromUnitVectors(_v.set(0, -1, 0), tr);
      t1.position.set(0, -THUMB.len[0] * k, 0); t2.position.set(0, -THUMB.len[1] * k, 0);
      hd.add(t0); t0.add(t1); t1.add(t2);
    }
    for (const b of bones) if (!b.parent) arms.add(b);
    arms.updateMatrixWorld(true);
    const skel = new THREE.Skeleton(bones);
    arms.bind(skel);
    // thumb rest / opposed orientations per hand (bone-local)
    this.thumbQ = [1, -1].map((sx) => {
      const r = T_RELAX.clone(), o = T_OPPOSE.clone(), tw = T_TOWARD.clone(); r.x *= sx; o.x *= sx; tw.x *= sx;
      return { relax: new THREE.Quaternion().setFromUnitVectors(_v.set(0, -1, 0), r), oppose: new THREE.Quaternion().setFromUnitVectors(_v.set(0, -1, 0), o), toward: tw };
    });
    // a little fill light of their own so your hands always read, even in the dark garage
    const hc = this.handColor(h);
    const hands = new THREE.SkinnedMesh(this.handGeometry(bones), new THREE.MeshStandardMaterial({ color: hc, roughness: 0.72, vertexColors: true, emissive: hc.clone().multiplyScalar(0.13) }));
    hands.bind(skel, arms.matrixWorld);
    arms.material = h.mat.clone();
    Object.assign(arms.material, { emissive: new THREE.Color(0xffffff), emissiveMap: h.tex, emissiveIntensity: 0.13 });
    Object.assign(h.mat, { emissive: new THREE.Color(0xffffff), emissiveMap: h.tex, emissiveIntensity: 0.12 });
    for (const m of [arms, hands]) { m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; }
    this.rig.add(arms, hands);
    this.rig.scale.setScalar(this.bs);
    this.arms = arms; this.handsMesh = hands; this.bones = bones;
    this.hb = ['L', 'R'].map((s) => ({ arm: bones[BONE_INDEX['arm' + s]], fore: bones[BONE_INDEX['fore' + s]], hand: bones[BONE_INDEX['hand' + s]] }));
    // the little props a hand can carry (wrench for repairs, a flyer to hand out)
    const R = this.hb[1].hand, L = this.hb[0].hand;
    this.props.wrench.position.set(0.028 * k, -0.078 * k, 0.03 * k);
    R.add(this.props.wrench);
    L.add(this.props.flyer); this.props.flyer.position.set(-0.03 * k, -0.125 * k, 0.03 * k);
  }

  /** The avatar's sleeves: its arm triangles (shared attributes, own index), hands left out (we build better ones). */
  armGeometry(h) {
    const src = h.mesh.geometry, si = src.attributes.skinIndex, idx = src.index.array, keep = [];
    for (let i = 0; i < idx.length; i += 3) if (ARM_BONES.has(si.getX(idx[i])) && ARM_BONES.has(si.getX(idx[i + 1])) && ARM_BONES.has(si.getX(idx[i + 2]))) keep.push(idx[i], idx[i + 1], idx[i + 2]);
    const g = new THREE.BufferGeometry();
    for (const n of ['position', 'normal', 'uv', 'skinIndex', 'skinWeight']) g.setAttribute(n, src.attributes[n]);
    g.setIndex(keep);
    return g;
  }

  /** The hands' colour: median of the avatar's painted hand texels (skin, or gloves / mittens from an outfit). */
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
    const c = new THREE.Color(h.spec.skin ?? 0xe0b48e);
    if (!cols.length) return c;
    cols.sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
    const m = cols[cols.length >> 1];
    return c.setRGB(m[0] / 255, m[1] / 255, m[2] / 255, THREE.SRGBColorSpace);
  }

  handGeometry(bones) {
    const G = new HandGeo(), k = this.k, P = this.P;
    const hb = BONE_INDEX.handL;
    const rest = (b) => { b.updateWorldMatrix(true, false); return _m.copy(bones[hb].matrixWorld).invert().multiply(b.matrixWorld); };
    const toMesh = (m) => _m2.makeTranslation(P.shX, P.wristY, 0).multiply(m);
    const S = (x) => x * k;
    // tints: palm side a little pinker, nails lighter
    const tint = (palm) => (n, tip) => (n.x < -0.55 ? [1.05, 0.96, 0.94] : tip && palm === 'nail' && n.x > 0.55 ? [1.16, 1.07, 1.06] : [1, 1, 1]);
    // palm
    const pm = toMesh(new THREE.Matrix4());
    prism(G, [[S(0.016), S(0.0098), S(0.019), S(0.001)], [0, S(0.0118), S(0.0225)], [S(-0.03), S(0.0135), S(0.031), S(-0.0008)], [S(-0.06), S(0.0132), S(0.0365), S(-0.001)],
      [S(-0.081), S(0.0112), S(0.0375), S(-0.001)], [S(-0.089), S(0.0078), S(0.031), S(-0.0005)]], hb, pm.clone(), tint('palm'));
    // fingers
    FING.forEach((F, fi) => F.len.forEach((len, j) => {
      const m = toMesh(rest(bones[fingBone(0, fi, j)]).clone()).clone();
      const tp = j === 2 ? 0.86 : 0.93, w = S(F.w * (1 - j * 0.07)), t = S(F.t * (1 - j * 0.08)), L = S(len);
      const rings = [[w * 0.55, t * 0.72, w * 0.7], [0, t, w], [-L, t * tp, w * tp]];
      rings.push(j === 2 ? [-L - w * 0.55, t * 0.55, w * 0.58] : [-L - w * 0.45, t * 0.78, w * 0.76]);
      prism(G, rings, fingBone(0, fi, j), m, tint(j === 2 ? 'nail' : ''));
    }));
    // thumb (its base pad blends into the palm)
    THUMB.len.forEach((len, j) => {
      const m = toMesh(rest(bones[fingBone(0, 4, j)]).clone()).clone();
      const w = S(THUMB.w * (1 - j * 0.06)), t = S(THUMB.t * (1 - j * 0.06)), L = S(len);
      const rings = j === 0 ? [[S(0.012), t * 0.9, w * 0.9], [0, t * 1.25, w * 1.2], [-L, t, w], [-L - w * 0.4, t * 0.8, w * 0.8]]
        : [[w * 0.5, t * 0.75, w * 0.75], [0, t, w], [-L, t * 0.88, w * 0.88], [-L - w * (j === 2 ? 0.55 : 0.4), t * 0.6, w * 0.62]];
      prism(G, rings, fingBone(0, 4, j), m, tint(j === 2 ? 'nail' : ''));
    });
    const L2R = (b) => (b === hb ? BONE_INDEX.handR : b >= NBONES ? b + 15 : b);
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
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.008, 0.06), new THREE.MeshStandardMaterial({ color: 0xd8352a, roughness: 0.5 }));
    grip.position.z = -0.005;
    wrench.add(shaft, jaw, grip);
    wrench.visible = false;
    const flyer = new THREE.Mesh(new THREE.BoxGeometry(0.0015, 0.1, 0.072), new THREE.MeshStandardMaterial({ color: 0xfff4dc, roughness: 0.8 }));
    flyer.rotation.set(0, 0, 0.5);
    flyer.visible = false;
    return { wrench, flyer };
  }

  dispose() {
    const h = this.human;
    if (!h) return;
    this.rig.remove(this.arms, this.handsMesh);
    this.arms.geometry.dispose(); this.arms.material.dispose(); this.handsMesh.geometry.dispose(); this.handsMesh.material.dispose();
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
        if (this.act?.name !== 'key') this.play('key', 0.85, { obj: g.held.item.obj, done: () => orig() });
        return false;
      }
      return orig();
    };
  }

  /** Held.consume: animate the item being used up (pour the milk, hand out the last flyer...). true = we own obj now. */
  consumed(it) {
    if (!this.live || it.kind !== 'tool') return false;
    const id = it.data.id, obj = it.obj, hit = this.game.interaction.hover?.hit?.point;
    if (id === 'flyers') { this.give(hit); return false; }
    this.play(id === 'milk' ? 'pour' : 'use', id === 'milk' ? 1.35 : 0.5, { obj, it, own: true, at: hit ? this.toAnchor(hit, V()) : null, from: obj.position.clone(), fromQ: obj.quaternion.clone(), fromS: obj.scale.x });
    return true;
  }

  give(hitWorld) {
    let at = hitWorld ? this.toAnchor(hitWorld, V()) : null;
    if (!at || at.z > -0.25) at = V().set(0.05, -0.05, -0.8); // someone beside / behind you: just hold it out
    at.y = Math.max(at.y, -0.18);
    this.play('give', 0.85, { at, hand: this.freeHand() });
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
    this.presence = show ? Math.min(1, this.presence + dt / 0.5) : 0;
    if (show && this.presence < 1) {
      const e = 1 - outCubic(this.presence);
      anchor.position.y -= e * 0.3; anchor.rotation.x -= e * 0.4;
    }
    anchor.updateWorldMatrix(true, false);
    this.anchorInv.copy(anchor.matrixWorld).invert();
    this.rig.updateMatrixWorld(true);
    const eye = _v.set(P.pos.x, P.eye, P.pos.z);
    const near = cam.position.distanceTo(eye) < 0.16 && P.camBlend < 0.05;
    this.updateBody(dt);
    this.human.root.visible = show && near;
    this.rig.visible = show;
    this.updateFlags(dt);
    if (!this.rig.visible) { this.unstash(); if (this.act) this.endAct(); return; }
    this.props.wrench.visible = this.props.flyer.visible = false;
    for (const H of this.hands) this.pose(H);
    this.applyStash(dt);
    for (const H of this.hands) this.blend(H, dt);
    for (const H of this.hands) this.solve(H);
    // looking down with empty hands, the arms are drawn with the world (depth-tested against your body) rather than
    // on top of it
    this.rig.userData.mainPass = this.lookDown > 0.6 && this.hands.every((H) => H.src === 'free');
    this.armsToBody();
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
    const arch = smooth(down / 1.2);
    b.spine.quaternion.premultiply(_q.setFromAxisAngle(Y, -this.legYaw * 0.45)).multiply(_q.setFromAxisAngle(X, -arch * 0.3));
    b.chest.quaternion.premultiply(_q.setFromAxisAngle(Y, -this.legYaw * 0.55)).multiply(_q.setFromAxisAngle(X, -arch * 0.22));
    b.neck.quaternion.setFromEuler(_e.set(-P.pitch * 0.3, 0, 0));
    b.head.quaternion.setFromEuler(_e.set(-P.pitch * 0.6, 0, 0));
    h.root.updateMatrixWorld(true);
    // arm swing for the empty-hand pose follows the legs (left arm with the right foot)
    const F = h.feet;
    this.swing[0] = clamp((F[1].z - F[0].z) / 0.42, -1, 1);
    this.swing[1] = -this.swing[0];
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
    if (g.interaction.hover?.hit) this.lastHover = (this.lastHover || V()).copy(g.interaction.hover.hit.point);
    // capsule tossed away with Q
    if (held.tossed && held.tossed !== this.tossSeen) { this.tossSeen = held.tossed; if (this.rig.visible && !this.act) this.play('toss', 0.4); }
    // clicks on things with a free hand: reach out and press (decided a frame later, once the click has done its thing)
    if (this.tap) {
      const T = this.tap; this.tap = null;
      const busy = this.act || g.interaction.holding || held.flight || this.coinMachine() || held.item !== T.item || held.trans?.delay > 0 || g.cutscene.active || g.uiOpen || g.pc?.active;
      if (!busy && this.rig.visible) this.play('tap', 0.42, { at: this.toAnchor(T.p, V()), hand: this.freeHand() });
    }
    if (inp.buttonDown(0) && g.interaction.hover && !g.interaction.holding && !held.reading) this.tap = { p: g.interaction.hover.hit.point.clone(), item: held.item };
    if (this.act) { this.act.t += dt; if (this.act.t >= this.act.dur) this.endAct(); }
    if (held.flight) { held.flight.t = (held.flight.t || 0) + dt; if (!held.flight.obj?.parent || held.flight.t > held.flight.dur) held.flight = null; }
  }

  endAct() {
    const a = this.act;
    this.act = null;
    this.props.wrench.visible = false; this.props.flyer.visible = false;
    if (a.own) a.obj.parent?.remove(a.obj);
    if ((a.name === 'key') && this.game.held.item?.obj === a.obj) this.game.held.startTrans(this.game.held.pose, 0.3);
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
    const src = this.choose(H, W);
    if (src !== H.src) {
      // cross-fade from wherever the hand is now
      H.from.copy(H.out);
      H.k = 0;
      H.dur = src.startsWith('grip') && H.src.startsWith('ready') ? 0.13 : src.startsWith('free') && H.src.startsWith('grip') ? 0.32 : src.startsWith('crank') && H.src.startsWith('crank') ? 0.12 : 0.22;
      H.bump = src.startsWith('crank') && H.src.startsWith('crank') ? 1 : 0;
      if (!H.src) H.k = 1;
      H.src = src;
    }
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
        if (!m.isMesh || m.userData.isRim || m.isSkinnedMesh && m.parent === this.arms) return;
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
    // out of reach (a handle across the room, an item still flying in): slide it along the eye ray, so the hand
    // still covers it on screen
    const d = contact.length(), max = 0.52 * this.bs;
    if (d > max) contact.multiplyScalar(max / d);
    this.handQ(H.sd, palm, dir, W.q, opts.axis);
    this.wrist(H, contact, W.q, opts.at || PALM_C, W.p);
    for (let i = 0; i < 5; i++) W.f[i] = f[i] ?? 0;
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
      this.setGrip(H, W, c, N(sd * 0.45, 1, 0.25, a), N(sd * 0.5, 0.15, -1, _v2), [0.42, 0.25, 0.3, 0.2]);
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
        this.setGrip(H, W, c, palm.clone(), fw.clone(), R ? [0.6, 0.3, 0.55, 0.3] : [0.62, 0.25, 0.6, 0.35]);
        return 'twist';
      }
      if (!R) return null;
      const palm = N(0.35, 1, 0.3, a);
      c.addScaledVector(palm, -r * 0.98);
      this.setGrip(H, W, c, palm, N(-0.6, 0.1, -1, _v2), [0.62, 0.12, 0.55, 0.35]);
      return 'capsule';
    }
    if (kind === 'toy') {
      if (!R) return null;
      this.ip(0.5, 0, 0.5, c);
      if (pose === 'inspect' || held.inspecting) {
        this.idir(0, 1, 0, up);
        c.addScaledVector(up, -0.004);
        this.setGrip(H, W, c, up, N(-0.35, 0, -1, _v2), [0.55, 0.12, 0.8, 0.45]);
        return 'inspect';
      }
      c.y -= 0.004;
      this.setGrip(H, W, c, N(0.1, 1, 0.25, a), N(-0.55, 0.05, -1, _v2), [0.24, 0.35, 0.15, 0.1]);
      return 'toy';
    }
    if (kind === 'cat') {
      // held up under her front legs, a hand either side of her chest; petting, the free hand strokes her head
      const petting = this.game.time - (held.petT ?? -9) < 1.3;
      if (!R && petting) {
        const st = Math.sin(this.t * 7.5);
        this.ip(0.5, 0.96, 0.55, c);
        c.z += st * 0.03; c.y += 0.012 + 0.008 * (1 - Math.cos(this.t * 7.5));
        this.setGrip(H, W, c, N(0.2, -1, 0.1, a), N(0.25, 0.1, -1, _v2), [0.2, 0.35, 0.2, 0.1]);
        return 'pet';
      }
      this.ip(0.5, 0.66, 0.5, c);
      c.x += (R ? 1 : -1) * 0.068 * this.IS;
      this.setGrip(H, W, c, N(R ? -1 : 1, 0.2, 0, a), N(R ? -0.15 : 0.15, 0.75, -0.55, _v2), [0.38, 0.3, 0.35, 0.2]);
      return 'cat';
    }
    if (kind === 'box' && tool !== 'trash_bag' || pose === 'box' && !tool) {
      // flat hands on the sides, near the front corners
      this.ip(R ? 1 : 0, 0.32, 0.86, c);
      const palm = this.idir(R ? -1 : 1, 0, 0, a);
      c.addScaledVector(palm, -0.004);
      this.setGrip(H, W, c, palm, this.idir(0, -0.45, -1, _v2), [0.2, 0.3, 0.12, 0.1]);
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
      this.setGrip(H, W, c, N(0, 1, 0.1, a), N(R ? -0.3 : 0.3, 0, -1, _v2), [0.55, 0.12, 0.45, 0.3]);
      return 'long';
    }
    if (!R) return null;
    if (tool === 'trash_bag') {
      this.ip(0.5, 0.9, 0.5, c);
      this.setGrip(H, W, c, N(-1, 0.1, 0.2, a), N(0, 1, 0, _v2), [0.88, 0, 0.75, 0.5], { axis: true, at: FIST_C });
      return 'knot';
    }
    if (tool === 'toolkit') {
      this.idir(0, 1, 0, up);
      this.ip(0.5, 1, 0.5, c).addScaledVector(up, 0.006);
      const sx = this.size(0), sz = this.size(2);
      this.setGrip(H, W, c, up.clone().negate(), this.idir(sx > sz ? -1 : 0, 0, sx > sz ? 0 : -1, _v2), [0.85, 0, 0.7, 0.5], { axis: true, at: FIST_C });
      return 'handle';
    }
    if (tool === 'key') {
      this.ip(0.5, 0.5, 0.5, c);
      this.setGrip(H, W, c, N(-0.45, 0.6, 0.45, a), N(-0.6, 0.35, -0.8, _v2), [0.5, 0.1, 0.95, 0.5], { at: PINCH_C });
      return 'pinch';
    }
    if (tool === 'milk') {
      // wrapped round the carton's lower half from the right, fingers round the back, thumb on the front corner
      this.ip(1, 0.34, 0.42, c);
      const palm = this.idir(-1, 0, 0, a);
      c.addScaledVector(palm, -0.004);
      this.setGrip(H, W, c, palm, this.idir(0, 0.15, -1, _v2), [0.6, 0.12, 0.55, 0.35]);
      return 'wrap';
    }
    if (tool === 'notebook') {
      // held up from behind: fingers spread on the back cover, thumb over the spine onto the front
      this.ip(0.2, 0, 0.3, c);
      const palm = this.idir(0, 1, 0, a);
      c.addScaledVector(palm, -0.006);
      this.setGrip(H, W, c, palm, this.idir(0.3, 0, 1, _v2), [0.12, 0.3, 0.85, 0.35]);
      return 'book';
    }
    if (tool === 'flyers' || tool === 'batteries') {
      // a flat thing held at its lower right corner: fingers behind, thumb on the front
      const flat = tool === 'flyers';
      const n = this.idir(0, flat ? 1 : 0, flat ? 0 : 1, a);
      this.ip(0.88, flat ? 0 : 0.22, flat ? 0.82 : 0, c).addScaledVector(n, -0.006);
      this.setGrip(H, W, c, n, this.idir(flat ? -0.55 : -0.35, flat ? 0 : 1, flat ? -1 : 0, _v2), [0.38, 0.1, 0.9, 0.45], { at: [-0.012, -0.075, 0.012] });
      return 'card';
    }
    // anything else: cradled on the palm
    this.ip(0.5, 0, 0.5, c);
    c.y -= 0.003;
    this.setGrip(H, W, c, N(0.25, 1, 0.25, a), N(-0.6, 0.1, -1, _v2), [0.45, 0.15, 0.4, 0.3]);
    return 'cradle';
  }

  longAxis() { const s = [this.size(0), this.size(1), this.size(2)]; return s[0] > s[1] && s[0] > s[2] ? 0 : s[1] > s[2] ? 1 : 2; }

  /** Fist on a stick (broom handle) at fraction u along its long axis (1 = the end away from the bristles). */
  stickPose(H, W, u, key) {
    const ax = this.longAxis(), c = _c, R = H.h === 1;
    const uu = [0.5, 0.5, 0.5]; uu[ax] = u;
    this.ip(uu[0], uu[1], uu[2], c);
    const dir = this.idir(ax === 0 ? 1 : 0, ax === 1 ? 1 : 0, ax === 2 ? 1 : 0, _v2);
    const palm = R ? N(-0.4, 1, 0.2, _v) : N(1, 0.1, 0.25, _v);
    palm.addScaledVector(dir, -palm.dot(dir)).normalize();
    c.addScaledVector(palm, -0.004);
    this.setGrip(H, W, c, palm, dir, [0.86, 0, 0.6, 0.45], { axis: true, at: FIST_C });
    return key;
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
      this.setGrip(H, W, c, toReader.clone().negate(), this.dirToAnchor(_v.set(0, 1, 0).applyQuaternion(_q), _v2), [0.42, 0.1, 0.9, 0.5, 0.2], { at: PINCH_C });
      if (out) W.p.z += 0.02;
      return 'flip' + fl.dir;
    }
    book.updateWorldMatrix(true, true);
    this.toAnchor(_v.set(sd * -(nb.w * 0.86), -nb.h * 0.36, -0.01).applyMatrix4(half.matrixWorld), c);
    const fwd = this.dirToAnchor(_v.set(0, 0, 1).applyQuaternion(half.getWorldQuaternion(_q)), _v3);
    const upB = this.dirToAnchor(_v.set(-sd * 0.35, 1, 0).applyQuaternion(_q), _v2);
    this.setGrip(H, W, c, fwd, upB, [0.28, 0.08, 0.85, 0.35]);
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
      this.setGrip(H, W, c, fN.clone().negate(), this.dirToAnchor(_v.set(0, 1, 0).applyQuaternion(_q), _v2), [0.12, 0.45, 0.25, 0.1]);
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
    this.setGrip(H, W, c, fN.clone().negate(), bar, [0.84, 0, 0.7, 0.5], { axis: true, at: FIST_C });
    return 'crank' + C.n;
  }

  coinPose(m, H, W) {
    const c = this.toAnchor(m.rope.pin, _c);
    const fN = this.dirToAnchor(_v.set(0, 0, 1).applyQuaternion(m.root.getWorldQuaternion(_q)), _v3);
    this.setGrip(H, W, c, fN.clone().negate().add(_v2.set(-0.3, 0.2, 0)), N(-0.2, 1, -0.6, _v2), [0.55, 0.05, 0.95, 0.5], { at: PINCH_C });
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
    _v.addScaledVector(tan, (R ? -1 : 1) * 0.17);
    this.toAnchor(_v, c);
    const down = this.dirToAnchor(_v.set(0, -1, 0), V());
    this.setGrip(H, W, c, down, this.dirToAnchor(_v.copy(to).negate(), _v2), [0.62 + k * 0.2, 0.2, 0.4, 0.3]);
    return 'lift';
  }

  repairPose(m, H, W) {
    const R = H.h === 1, c = _c;
    const fN = this.dirToAnchor(_v.set(0, 0, 1).applyQuaternion(m.root.getWorldQuaternion(_q)), _v3);
    const upA = this.dirToAnchor(_v.set(0, 1, 0).applyQuaternion(_q), V());
    if (!R) {
      this.toAnchor(m.local(-m.L.w * 0.32, m.L.slot.y + 0.06, m.L.front + 0.012), c);
      if (c.length() > 0.62) return this.freePose(H, W);
      this.setGrip(H, W, c, fN.clone().negate(), upA, [0.15, 0.4, 0.25, 0.1]);
      return 'steady';
    }
    // ratchet a bolt on the front panel, where you're aiming
    this.props.wrench.visible = true;
    const hit = this.game.interaction.holding?.hit?.point;
    const bolt = this.toAnchor(hit || m.local(0.02, m.L.slot.y - 0.07, m.L.front + 0.012), V());
    const th = 0.15 + Math.sin(this.t * 9) * 0.45;
    const arm = upA.clone().applyAxisAngle(fN, -1.2 + th).multiplyScalar(0.085 * this.bs);
    c.copy(bolt).add(arm).addScaledVector(fN, 0.012);
    const toward = _v2.copy(bolt).sub(c).normalize();
    const palm = _v4.crossVectors(fN, toward).normalize();
    this.setGrip(H, W, c, palm, toward, [0.9, 0, 0.72, 0.5], { axis: true, at: FIST_C });
    return 'wrench';
  }

  /** Timed actions. Returns a key while it drives hand H, null to let it do its usual thing. */
  actPose(a, H, W) {
    const g = this.game, R = H.h === 1, c = _c, k = a.t / a.dur;
    switch (a.name) {
      case 'tap': {
        if (H.h !== a.hand) return null;
        const reach = k < 0.45 ? outCubic(k / 0.45) : 1 - smooth((k - 0.6) / 0.4);
        const at = _v3.copy(a.at);
        const d = at.length(), max = 0.55 * this.bs;
        if (d > max) at.multiplyScalar(max / d);
        c.set(H.sd * -0.17, -0.33, -0.22).lerp(at, reach * 0.92);
        const dir = _v2.copy(at).sub(_v.set(H.sd * -0.17, -0.3, 0)).normalize();
        this.setGrip(H, W, c, N(H.sd * 0.6, -0.4, 0.1, _v4), dir, [0.85, 0, 0.6, 0.4, 1], { at: [-0.002, -0.17, 0.026] });
        return 'tap';
      }
      case 'give': {
        if (H.h !== a.hand) return null;
        const reach = k < 0.38 ? outCubic(k / 0.38) : k < 0.55 ? 1 : 1 - smooth((k - 0.55) / 0.45);
        this.props.flyer.visible = H.h === 0 && k < 0.5;
        if (H.h === 1) this.props.flyer.visible = false;
        const at = _v3.copy(a.at);
        const d = at.length(), max = 0.6 * this.bs;
        if (d > max) at.multiplyScalar(max / d);
        c.set(H.sd * -0.15, -0.36, -0.2).lerp(at, reach * 0.95);
        this.setGrip(H, W, c, N(H.sd * 0.3, 0.75, 0.2, _v4), _v2.copy(at).normalize(), [0.4, 0.1, 0.9, 0.5], { at: PINCH_C });
        return 'give';
      }
      case 'toss': {
        if (!R) return null;
        const e = Math.sin(Math.PI * Math.min(1, k * 1.2));
        c.set(0.17 - e * 0.04, -0.27 + e * 0.1, -0.3 - e * 0.18);
        this.setGrip(H, W, c, N(-0.2, 0.7 - e, 0.4, _v4), N(-0.3, 0.3 + e * 0.6, -1, _v2), [0.3 - e * 0.2, 0.4, 0.2, 0.1]);
        return 'toss';
      }
      case 'key': {
        if (!R || !a.obj.parent) return null;
        // push the key into the lock below the shutter, then turn it a quarter
        const o = a.obj;
        if (!a.from) { a.from = o.position.clone(); a.fromQ = o.quaternion.clone(); }
        const reach = outCubic(Math.min(1, k / 0.35)), turn = smooth((k - 0.42) / 0.25);
        o.position.copy(a.from).lerp(_v.set(0.05, -0.13, -0.42), reach);
        o.quaternion.copy(a.fromQ).slerp(_q.setFromEuler(_e.set(0.4, -0.2, 0)), reach).premultiply(_q2.setFromAxisAngle(Z, -turn * Math.PI / 2));
        if (turn > 0.3 && !a.clicked) { a.clicked = true; audio.play('keyTurn', { vol: 0.45 }); }
        return null; // the pinch grip on the key does the rest
      }
      case 'pour':
      case 'use': {
        const o = a.obj;
        if (!o.parent) return null;
        if (a.name === 'pour') {
          // tip the carton over the bowl, a stream of milk, then away
          const tilt = smooth(k / 0.3) * (1 - smooth((k - 0.72) / 0.2));
          const away = smooth((k - 0.8) / 0.2);
          o.position.copy(a.from).lerp(_v.set(0.05, -0.1, -0.42), smooth(k / 0.3)).y -= away * 0.35;
          o.quaternion.copy(a.fromQ).premultiply(_q.setFromAxisAngle(Z, tilt * 1.9));
          if (tilt > 0.75 && Math.random() < 0.7) {
            const top = this.ip(0.5, 1, 0.5, _v3);
            _v.copy(top).applyMatrix4(this.game.held.anchor.matrixWorld);
            g.effects.sparks({ pos: _v, count: 2, colors: [0xffffff, 0xf4f0e8], speed: 0.15, size: 0.012, gravity: 2.5, life: 0.5, star: 0, radius: 0.005 });
          }
        } else {
          const at = a.at || _v3.set(0.05, -0.1, -0.6);
          const d = at.length(), max = 0.5 * this.bs;
          _v3.copy(at); if (d > max) _v3.multiplyScalar(max / d);
          o.position.copy(a.from).lerp(_v3, outCubic(Math.min(1, k / 0.6)));
          o.scale.setScalar(a.fromS * (1 - smooth((k - 0.55) / 0.45)));
        }
        if (!R) return null;
        const r = this.gripPose(o, 'tool', a.it.data, 'item', H, W);
        return r ? 'act-' + a.name : null;
      }
      default: return null;
    }
  }

  // --- empty hands: relaxed and low in the bottom corners, breathing; they swing with your legs when you walk and
  // pump as fists when you run; looking down they hang at your sides; the free hand rises and opens a little when you
  // aim at something to take or press
  freePose(H, W) {
    const g = this.game, P = g.player, sd = H.sd, s = this.swing[H.h], wk = this.walkW, run = this.runW;
    const br = Math.sin(this.t * 1.7 + H.h * 0.7), fw = s * wk, step = Math.abs(Math.sin(this.human.phase * Math.PI * 2));
    let x = -sd * (0.28 - Math.max(0, fw) * 0.02), y = -0.224 + br * 0.004 + fw * 0.03 - step * 0.008 * wk, z = -0.32 - fw * 0.075;
    x = lerp(x, -sd * 0.24, run); y = lerp(y, -0.24 + Math.max(0, s) * 0.07 - step * 0.01, run); z = lerp(z, -0.3 - s * 0.14, run);
    if (g.held.inspecting) y -= 0.2; // out of the way while you admire a figure
    const ready = this.readyTarget(H);
    let key = 'free';
    if (ready) { x = ready.x; y = ready.y; z = ready.z; key = 'ready'; }
    W.p.set(x, y, z);
    const lift = fw * 0.25 + run * (0.3 + Math.max(0, s) * 0.3);
    this.handQ(sd, N(sd, ready ? -0.15 : -0.3, ready ? 0.15 : 0.05, _v2), N(sd * 0.22, (ready ? 0.15 : -0.08) + lift, -1, _v3), W.q);
    W.f[0] = ready ? 0.12 : lerp(0.46 + br * 0.03, 0.88, run); W.f[1] = ready ? 0.5 : 0.06; W.f[2] = ready ? 0.2 : lerp(0.3, 0.65, run); W.f[3] = lerp(0.3, 0.6, run); W.f[4] = 0;
    // looking down: your arms just hang at your sides
    const kd = this.lookDown = smooth((-0.35 - P.pitch) / 0.6) * (ready ? 0 : 1);
    if (kd > 0) { W.p.lerp(H.natural.p, kd); W.q.slerp(H.natural.q, kd); W.f[0] = lerp(W.f[0], 0.3, kd); }
    return key;
  }

  readyTarget(H) {
    const g = this.game, hv = g.interaction.hover, it = g.held.item;
    if (!hv || g.held.reading) return null;
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
    H.k = Math.min(1, H.k + dt / H.dur);
    const e = smooth(H.k);
    if (e >= 1) O.copy(W);
    else {
      O.p.copy(H.from.p).lerp(W.p, e);
      O.q.copy(H.from.q).slerp(W.q, e);
      for (let i = 0; i < 5; i++) O.f[i] = lerp(H.from.f[i], W.f[i], e);
      // re-grips open the hand on the way
      if (H.bump) { const b = Math.sin(Math.PI * e); O.f[0] -= b * 0.55; O.f[2] -= b * 0.4; O.p.z += b * 0.015; }
    }
  }

  solve(H) {
    const bs = this.bs, a = this.la, c = this.lc, B = this.hb[H.h], O = H.out;
    // rig space: anchor rotated 180° about y and scaled by the body
    // viewmodel shoulders sit low under the view (forearms rise from the bottom edge instead of looming over it);
    // when you look down with empty hands the arms hang from your body's real shoulders
    H.sb += ((H.src === 'free' ? this.lookDown : 0) - H.sb) * Math.min(1, this.dt * 6);
    const sh = _v.set(-H.sd * 0.2 * bs, -0.37 * bs, 0.02).lerp(H.shoulder, H.sb);
    const S = this._S.set(-sh.x, sh.y, -sh.z).divideScalar(bs);
    const T = this._T.set(-O.p.x, O.p.y, -O.p.z).divideScalar(bs);
    // lean in (the shoulder follows) for things a little out of reach
    const d = _v3.subVectors(T, S), L0 = d.length(), reach = (a + c) * 0.985;
    if (L0 > reach) { S.addScaledVector(d, Math.min(0.2, L0 - reach) / L0); d.subVectors(T, S); }
    const l = clamp(d.length(), (a + c) * 0.3, (a + c) * 0.999), dn = d.normalize();
    const cosA = clamp((a * a + l * l - c * c) / (2 * a * l), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
    // elbows out and down (body frame)
    this.rig.getWorldQuaternion(_q3).invert();
    const pole = _v4.set(H.sd * 0.55, -1, -0.35).applyQuaternion(_q.copy(_q3).multiply(this.human.root.quaternion));
    pole.addScaledVector(dn, -pole.dot(dn));
    if (pole.lengthSq() < 1e-6) pole.set(H.sd, 0, 0);
    pole.normalize();
    const u1 = _v5.copy(dn).multiplyScalar(cosA).addScaledVector(pole, sinA).normalize();
    const u2 = _v6.copy(dn).multiplyScalar(l).addScaledVector(u1, -a).normalize();
    const fwd = _ax.copy(u2).addScaledVector(u1, -u2.dot(u1));
    if (fwd.lengthSq() < 1e-8) fwd.copy(pole).negate(); else fwd.normalize();
    const by = _v.copy(u1).negate(), bx = _up.crossVectors(by, fwd);
    const Qu = _q.setFromRotationMatrix(_m.makeBasis(bx, by, fwd));
    // forearm: hinge, then roll most of the way towards the hand's roll (no candy-wrapper wrist)
    const ang = Math.acos(clamp(u1.dot(u2), -1, 1));
    const Qf = _q2.copy(Qu).multiply(_q3.setFromAxisAngle(X, -ang));
    const fx = _v2.set(1, 0, 0).applyQuaternion(Qf), hx = _v3.set(1, 0, 0).applyQuaternion(O.q);
    hx.addScaledVector(u2, -hx.dot(u2));
    if (hx.lengthSq() > 1e-6) {
      hx.normalize();
      const tw = Math.atan2(_c.crossVectors(fx, hx).dot(u2), fx.dot(hx));
      Qf.premultiply(_q3.setFromAxisAngle(u2, clamp(tw * 0.7, -1.3, 1.3)));
    }
    B.arm.position.copy(S);
    B.arm.quaternion.copy(Qu);
    B.fore.quaternion.copy(Qu).invert().multiply(Qf);
    B.hand.quaternion.copy(Qf).invert().multiply(O.q);
    this.fingers(H.h, O.f);
  }

  fingers(h, f) {
    const [curl, spread, thumb, tcurl, point] = f, sd = h ? -1 : 1, bones = this.bones;
    for (let fi = 0; fi < 4; fi++) {
      let c = clamp(curl + fi * 0.035, 0, 1);
      if (fi === 0) c = lerp(c, 0.04, point);
      const ab = [-0.16, -0.04, 0.08, 0.2][fi] * spread + (fi === 3 ? 0.04 : 0);
      const ang = [1.38, 1.62, 1.05];
      for (let j = 0; j < 3; j++) {
        const q = bones[fingBone(h, fi, j)].quaternion;
        q.setFromAxisAngle(Z, -sd * (0.08 + c * ang[j]));
        if (j === 0) q.premultiply(_q.setFromAxisAngle(X, ab));
      }
    }
    const T = this.thumbQ[h];
    bones[fingBone(h, 4, 0)].quaternion.copy(T.relax).slerp(T.oppose, clamp(thumb, 0, 1));
    // thumb curls towards the fingers
    const q0 = bones[fingBone(h, 4, 0)].quaternion;
    const dir = _v.set(0, -1, 0).applyQuaternion(q0);
    const ax = _v2.crossVectors(dir, T.toward).normalize().applyQuaternion(_q.copy(q0).invert());
    bones[fingBone(h, 4, 1)].quaternion.setFromAxisAngle(ax, 0.1 + tcurl * 0.65);
    bones[fingBone(h, 4, 2)].quaternion.setFromAxisAngle(ax, 0.12 + tcurl * 0.85);
  }

  /** The body's arms copy the viewmodel ones, so your shadow holds what you hold. */
  armsToBody() {
    const h = this.human, b = h.b;
    if (!this.rig.visible) return; // keep the natural swing
    b.chest.updateWorldMatrix(true, false);
    b.chest.getWorldQuaternion(_q2).invert();
    this.rig.getWorldQuaternion(_q3);
    for (let i = 0; i < 2; i++) {
      const s = i ? 'R' : 'L', B = this.hb[i];
      b['arm' + s].quaternion.copy(_q2).multiply(_q.copy(_q3).multiply(B.arm.quaternion));
      b['fore' + s].quaternion.copy(B.fore.quaternion);
      b['hand' + s].quaternion.copy(B.hand.quaternion);
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
    S.k = clamp(S.k + (on ? dt / 0.18 : -dt / 0.25), 0, 1);
    if (!it || S.k <= 0) { this.unstash(); return; }
    const o = it.obj;
    if (S.obj !== o || !o.position.equals(S.last)) { S.obj = o; S.base.copy(o.position); }
    const e = smooth(S.k);
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
