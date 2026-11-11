// Mikan the stray (and the dark tabby that prowls the lane at night): a real cat (catBody.js: one skinned mesh,
// one painted atlas) animated in code, with a painted face that changes expression.
//   const rig = new CatRig({ coat: 'calico' | 'tabby' });  scene.add(rig.root);  rig.setPose('sit');  rig.update(dt, speed);
// Poses: walk (stand / walk / trot / run by speed), sit, groom, sleep (loaf, or curled with her nose in her tail), held,
// drink, groove ({ bpm, phase, clock }), hide, stretch, knead, stalk. Blended pose parameters; a bending spine (hips and
// chest); legs solved by two-bone IK (elbows back, knees forward, hocks behind) whose paws stay flat on the floor while
// they carry weight and curl when lifted; a head that stays level and tracks lookAt (world point) or lookYaw; a springy
// five-joint tail (swish, curl, puffs up when scared); ear flicks; breathing; purring.
// Face: eyes open / wide / slit / half (looking left or right) / content / sleepy / squeeze / blink, mouths w, happy,
// open, blep, lap, yawn, hiss. mood: 'calm' | 'happy' (tail up) | 'scared' (ears flat, wide eyes, puffed tail).
// Petting: pet() (a stroke while held) or petAt(worldPoint, k) every frame while a hand strokes her: she leans into the
// hand, eyes squeezed shut, purrs, kneads; annoyed(k) flattens her ears and lashes the tail; say(eyes, mouth, dur)
// forces an expression for a moment; meow() opens the mouth; react('swat' | 'nibble'). onFx(kind, worldPos) is called
// for zz's while she sleeps.
import * as THREE from 'three';
import { catAssets, setFrame, CAT_BONES, TAIL_N, EYES, MOUTHS, EYE_F, MOUTH_F } from './catBody.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const TAU = Math.PI * 2;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const pk = (b, p = 1) => ((1 + Math.cos(TAU * b)) / 2) ** p; // 1 on the beat
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), _e = new THREE.Euler();
const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _inv = new THREE.Matrix4();
const X = new THREE.Vector3(1, 0, 0);

export const CAT_SCALE = 1;
const HEAD = 1.07; // a touch more head than the reference cat: Mikan's charm
const CLOSED = new Set(['sleepy', 'content', 'squeeze']);
const LOOKS = Object.fromEntries(['open', 'wide', 'slit', 'half'].map((e) => [e, { '': e, L: e + 'L', R: e + 'R' }]));
const POSES = ['walk', 'sit', 'groom', 'sleep', 'held', 'drink', 'groove', 'hide', 'stretch', 'knead', 'stalk'];
const KEYS = ['y', 'z', 'pitch', 'roll', 'yaw', 'cp', 'cy', 'squash', 'hp', 'hy', 'hr', 'stab', 'earB', 'earO', 'tailUp', 'tailCurl', 'tailSide', 'tailWrap', 'swish', 'swishF', 'puff',
  'fl', 'fr', 'bl', 'br', 'flUp', 'frUp', 'fold', 'hindFold', 'purr'];
const EXTRA = ['tailBeat', 'lap', 'lick', 'yawn', 'content', 'groomLick', 'dangle'];
function base(p) {
  for (const k of KEYS) p[k] = 0;
  for (const k of EXTRA) p[k] = 0;
  Object.assign(p, { stab: 1, tailUp: 0.35, tailCurl: 0.1, swish: 0.12, swishF: 0.5 });
  return p;
}
// the four legs: [hip / shoulder, elbow / knee, wrist / hock], front or hind, side (+1 her left)
const LEGS = [['legFL', 'armFL', 'pawFL', 0, 1], ['legFR', 'armFR', 'pawFR', 0, -1], ['legBL', 'shinBL', 'pawBL', 1, 1], ['legBR', 'shinBR', 'pawBR', 1, -1]];

export class CatRig {
  constructor(opts = {}) {
    const A = catAssets(opts.coat || 'calico', opts.lod || 0);
    this.root = new THREE.Group();
    this.root.name = 'cat';
    this.mat = new THREE.MeshStandardMaterial({ map: A.map, alphaTest: 0.5, roughness: 0.9, metalness: 0 });
    // per-cat UVs (the face frames differ per cat); everything else is shared
    this.geo = new THREE.BufferGeometry();
    for (const k of ['position', 'normal', 'skinIndex', 'skinWeight']) this.geo.setAttribute(k, A.geometry.attributes[k]);
    this.geo.setAttribute('uv', A.geometry.attributes.uv.clone());
    this.geo.setIndex(A.geometry.index);
    this.geo.boundingBox = A.geometry.boundingBox.clone(); this.geo.boundingSphere = A.geometry.boundingSphere.clone();
    this.uv = this.geo.attributes.uv;
    this.uv.setUsage(THREE.DynamicDrawUsage);
    this.A = A;
    this.bones = [];
    const J = Object.fromEntries(CAT_BONES.map(([n, , p]) => [n, p]));
    for (const [name, parent, p] of CAT_BONES) {
      const bn = new THREE.Bone();
      bn.name = name;
      const pp = parent ? J[parent] : [0, 0, 0];
      bn.position.set(p[0] - pp[0], p[1] - pp[1], p[2] - pp[2]);
      if (parent) this.bones.find((x) => x.name === parent).add(bn);
      this.bones.push(bn);
    }
    const b = this.b = Object.fromEntries(this.bones.map((x) => [x.name, x]));
    this.rest = Object.fromEntries(this.bones.map((x) => [x.name, x.position.clone()]));
    this.J = J;
    // leg chains: segment lengths and rest directions (root space; every rest rotation is identity)
    this.legs = LEGS.map(([a, m, p, hind, side]) => {
      const A0 = new THREE.Vector3(...J[a]), M0 = new THREE.Vector3(...J[m]), P0 = new THREE.Vector3(...J[p]);
      const foot = hind ? new THREE.Vector3(side * 0.037, 0, -0.145) : new THREE.Vector3(side * 0.03, 0, 0.128);
      return { a, m, p, hind, side, la: A0.distanceTo(M0), lb: M0.distanceTo(P0), d1: M0.clone().sub(A0).normalize(), d2: P0.clone().sub(M0).normalize(), d3: foot.clone().sub(P0).normalize(), off: P0.clone().sub(foot), L: A0.y, lift: 0, prev: new THREE.Vector3() };
    });
    this.mesh = new THREE.SkinnedMesh(this.geo, this.mat);
    this.mesh.add(this.bones[0]);
    this.mesh.updateMatrixWorld(true);
    this.mesh.bind(new THREE.Skeleton(this.bones));
    this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    this.mesh.raycast = () => {}; // clicks hit the simple proxies below
    this.root.add(this.mesh);
    // invisible hit boxes riding the body and the head (cheap raycasts, and grips for the first-person hands)
    const hitM = new THREE.MeshBasicMaterial({ visible: false });
    this.hitBody = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.16, 0.4), hitM);
    this.hitBody.position.set(0, 0.0, 0.04);
    this.hitHead = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), hitM);
    this.hitHead.position.set(0, 0.022, 0.035);
    b.body.add(this.hitBody); b.head.add(this.hitHead);
    this.root.userData.catRig = this;
    // state
    this.pose = 'sit';
    this.w = Object.fromEntries(POSES.map((k) => [k, k === 'sit' ? 1 : 0]));
    this.poseT = Object.fromEntries(POSES.map((k) => [k, 0]));
    this.P = base({}); this.tmp = base({});
    this.t = Math.random() * 10; this.started = false;
    this.lookYaw = 0; this.lookAt = null; this.mood = 'calm'; this.dark = 0.3;
    this.look = [0, 0]; this.lookV = [0, 0]; this.glance = [0, 0]; this.glanceT = 2;
    this.spd = 0; this.phase = 0; this.prevYaw = null; this.yawRate = 0; this.lift = [0, 0];
    this.blinkT = 2; this.blink = 0; this.earT = [3, 5]; this.ear = [0, 0];
    this.tail = Array.from({ length: TAIL_N }, () => ({ p: 0, y: 0, vp: 0, vy: 0 }));
    this.petT = 0; this.petK = 0; this.petPt = null; this.petSide = 0; this.annoyK = 0; this.annoyT = 0;
    this.curl = false;
    this.groove = { bpm: 120, phase: 0, clock: null }; this.grooveT = 0;
    this.forced = null; this.meowT = 0; this.zT = 2; this.onFx = null;
    this.face = { eyes: '', mouth: '' };
    this.setFace('open', 'w');
    this.update(1 / 60, 0);
    this.started = false; // the first setPose() snaps straight to its pose
  }

  /** opts (groove): { bpm = 120, phase = 0 (beats), clock: () => seconds shared with the music / dancers }. */
  setPose(p, opts) {
    if (!POSES.includes(p)) p = 'sit';
    if (p === 'groove' && this.pose !== 'groove') this.grooveT = 0;
    if (opts) Object.assign(this.groove, opts);
    if (p !== this.pose) this.poseT[p] = 0;
    if (p === 'sleep' && this.pose !== 'sleep') this.curl = Math.random() < 0.5;
    this.pose = p;
    if (!this.started) for (const k of POSES) this.w[k] = k === p ? 1 : 0;
  }

  /** A stroke while she's held: leans into the hand, eyes shut, purrs for a moment. */
  pet() { this.petT = 1.6; this.petPt = null; }
  /** Being stroked right now at `pt` (world), k 0..1 how settled into it she is. */
  petAt(pt, k = 1) { this.petT = Math.max(this.petT, 0.25); this.petPt = (this.petPt || new THREE.Vector3()).copy(pt); this.petGoal = k; }
  /** 0..1: ears back, tail lashing, a flat stare. */
  annoyed(k) { this.annoyT = k; }
  /** Force an expression for `dur` seconds (eyes / mouth names; null keeps what the pose wants). */
  say(eyes, mouth, dur = 0.6) { this.forced = { eyes, mouth, t: dur }; }
  meow() { this.meowT = 0.45; }
  /** A quick reaction: 'swat' (a front paw lashes out at the hand) or 'nibble' (a lunge with an open mouth). */
  react(kind) { this.reactK = kind; this.reactT = 0; }

  setFace(eyes, mouth) {
    const F = this.face, A = this.A;
    if (eyes && eyes !== F.eyes && EYES[eyes]) { setFrame(this.uv, A.eyes, EYES[eyes], EYE_F.w, EYE_F.h); F.eyes = eyes; this.uv.needsUpdate = true; }
    if (mouth && mouth !== F.mouth && MOUTHS[mouth]) { setFrame(this.uv, A.mouth, MOUTHS[mouth], MOUTH_F.w, MOUTH_F.h); F.mouth = mouth; this.uv.needsUpdate = true; }
  }

  // ------------------------------------------------------------------ poses
  poseParams(name, p, k) {
    const t = this.t;
    base(p);
    switch (name) {
      case 'walk':
        p.tailUp = 0.45; p.hp = -0.05;
        if (this.mood === 'happy') Object.assign(p, { tailUp: 1.3, tailCurl: 0.14, swish: 0.08 });
        if (this.mood === 'scared') Object.assign(p, { y: -0.035, pitch: 0.04, earB: 1, tailUp: -0.25, tailCurl: 0.02, puff: 1, swish: 0.04, fold: 0.2, hindFold: 0.15 });
        return p;
      case 'sit':
        return Object.assign(p, { y: -0.062, z: -0.006, pitch: -0.52, cp: -0.32, hp: 0.05, hindFold: 1, tailUp: -0.6, tailSide: 0.7, tailWrap: 0.22, tailCurl: -0.04, swish: 0.06, swishF: 0.3 });
      case 'hide':
        // crouched low, ready to bolt: ears flat, wide eyes, tail tucked along her side
        return Object.assign(p, { y: -0.075, squash: 0.06, pitch: 0.04, hp: 0.1, earB: 1, tailUp: -0.45, tailSide: 0.6, tailCurl: 0.03, puff: 0.6, swish: 0.03, fold: 0.75, hindFold: 0.55 });
      case 'stalk': {
        // hunting: belly low, shoulders up, ears forward, eyes locked on, the tail low with a twitching tip;
        // wiggle (0..1, set by Street.js just before a pounce) shakes the hindquarters side to side
        const wg = this.wiggle || 0, w = Math.sin(t * 17);
        Object.assign(p, { y: -0.06, squash: 0.04, pitch: 0.05, cp: -0.06, hp: -0.12, earO: 0.6, tailUp: -0.3, tailSide: 0.05, tailCurl: 0.06, swish: 0.25, swishF: 2.4, fold: 0.5, hindFold: 0.55 });
        p.roll = w * 0.06 * wg; p.z = w * 0.004 * wg; p.hindFold += 0.25 * wg;
        return p;
      }
      case 'groove': {
        Object.assign(p, this.poseParams('sit', this.tmp2 || (this.tmp2 = {}), 0));
        const gr = this.groove, beat = (gr.clock ? gr.clock() : this.grooveT) * (gr.bpm || 120) / 60 + (gr.phase || 0);
        const nod = pk(beat - 0.08, 1.5), sway = Math.sin(Math.PI * beat / 2), tap = Math.sin(Math.PI * beat);
        p.roll = 0.07 * sway; p.cy = 0.1 * sway; p.hp = 0.18 * nod - 0.04; p.hr = -0.22 * sway; p.hy = 0.12 * sway;
        p.flUp = 0.5 * Math.max(0, -tap) ** 2; p.frUp = 0.5 * Math.max(0, tap) ** 2;
        p.swish = 0.4; p.swishF = -1; p.tailBeat = beat;
        return p;
      }
      case 'groom': {
        // sitting: lick a front paw, then wash the face with it (a 6 s cycle)
        Object.assign(p, this.poseParams('sit', this.tmp2 || (this.tmp2 = {}), 0));
        const c = k % 6, lick = c < 2.6, up = smooth(Math.min(c, 6 - c) / 0.5);
        if (lick) { p.frUp = 1.3 * up; p.hp = 0.6 * up; p.hr = -0.15 * up; p.hy = -0.25 * up; p.cy = -0.08 * up; }
        else { const a = (c - 2.6) / 3.4 * TAU * 3; p.frUp = (1.55 + Math.sin(a) * 0.2) * up; p.hp = (0.3 + Math.cos(a) * 0.15) * up; p.hr = -0.45 * up; p.hy = -0.35 * up; }
        p.groomLick = lick ? up : 0;
        return p;
      }
      case 'sleep': {
        const br = Math.sin(t * 1.4);
        Object.assign(p, { y: -0.114, squash: 0.05 + br * 0.012, pitch: -0.05, fold: 1, hindFold: 1, hp: 0.22, stab: 0.6, earB: 0.3, tailUp: -0.3, tailSide: 1.25, tailWrap: 0.42, tailCurl: -0.06, swish: 0.02, swishF: 0.25 });
        if (this.curl) Object.assign(p, { roll: 0.16, cy: 0.55, yaw: -0.25, hy: 1.0, hr: 0.4, hp: 0.5, tailSide: 1.5, tailWrap: 0.5 });
        return p;
      }
      case 'drink': {
        // crouched at the bowl, head down, lapping; every few seconds a look up and a lick of the lips
        const cyc = k % 6.5, up = smooth((cyc - 4.8) / 0.3) * (1 - smooth((cyc - 6.1) / 0.3));
        Object.assign(p, { y: -0.05, z: 0.004, pitch: 0.12, cp: 0.12, hp: 0.8 - up * 0.85, stab: 0.3, fold: 0.25, hindFold: 0.75, tailUp: 0.1, tailSide: 0.3, swish: 0.05 });
        p.lap = 1 - up; p.lick = up;
        return p;
      }
      case 'stretch': {
        // the long front stretch with a yawn, then a shake of the back legs
        const a = smooth(k / 0.6) * (1 - smooth((k - 1.8) / 0.5));
        Object.assign(p, { pitch: 0.32 * a, cp: 0.18 * a, z: 0.03 * a, y: -0.02 * a, fl: 1.1 * a, fr: 1.05 * a, hp: -0.65 * a, stab: 1 - 0.6 * a, tailUp: lerp(0.35, 1.0, a) });
        p.yawn = smooth((k - 0.55) / 0.3) * (1 - smooth((k - 1.5) / 0.3));
        p.bl = -0.4 * smooth((k - 2.0) / 0.3) * (1 - smooth((k - 2.8) / 0.3));
        return p;
      }
      case 'knead': {
        // half-sitting, front paws pressing in turn, eyes squeezed shut, purring
        Object.assign(p, this.poseParams('sit', this.tmp2 || (this.tmp2 = {}), 0));
        const a = Math.sin(k * TAU * 1.3);
        Object.assign(p, { pitch: -0.4, cp: -0.2, y: -0.055, tailUp: 0.2, tailSide: 0.1, purr: 1 });
        p.flUp = 0.4 * Math.max(0, a); p.frUp = 0.4 * Math.max(0, -a); p.roll = 0.03 * a; p.hr = -0.05 * a;
        p.content = 1;
        return p;
      }
      case 'held':
        // hanging under her front legs: back straight up, hind legs and tail dangling
        return Object.assign(p, { pitch: -1.25, cp: 0.22, y: -0.02, stab: 1, fl: 0.6, fr: 0.6, bl: 0.55, br: 0.45, tailUp: -0.9, tailWrap: 0.15, tailCurl: 0.05, swish: 0.3, swishF: 0.7, dangle: 1 });
    }
    return p;
  }

  update(dt, speed = 0) {
    dt = Math.min(dt, 0.1);
    if (!(dt > 0)) return;
    this.started = true;
    this.t += dt; this.grooveT += dt;
    for (const k of POSES) this.poseT[k] += dt;
    const P = this.P, T = this.tmp;
    // --- pose weights (quick into and out of 'held')
    const rate = this.pose === 'held' || this.w.held > 0.05 ? 9 : 4;
    let sum = 0;
    for (const k of POSES) { this.w[k] += ((k === this.pose ? 1 : 0) - this.w[k]) * Math.min(1, dt * rate); sum += this.w[k]; }
    for (const k of KEYS) P[k] = 0;
    for (const k of EXTRA) P[k] = 0;
    for (const k of POSES) {
      const w = this.w[k] / sum;
      if (w < 0.002) continue;
      this.poseParams(k, T, this.poseT[k]);
      for (const key of KEYS) P[key] += T[key] * w;
      for (const key of EXTRA) if (key !== 'tailBeat') P[key] += T[key] * w;
      if (k === 'groove') P.tailBeat = T.tailBeat;
    }
    const wWalk = (this.w.walk + (this.w.stalk || 0) * 0.8) / sum; // (a creeping stalk keeps the gait, low)
    // --- turning: the tail swings out, the spine bends into the turn
    const yaw = this.root.rotation.y;
    if (this.prevYaw === null) this.prevYaw = yaw;
    this.yawRate = lerp(this.yawRate, clamp(wrap(yaw - this.prevYaw) / dt, -12, 12), 1 - Math.exp(-dt * 8)); this.prevYaw = yaw;
    if (!isFinite(this.yawRate)) this.yawRate = 0;
    P.cy += clamp(this.yawRate * 0.06, -0.3, 0.3) * wWalk;
    // --- gait: a walk is a lateral sequence (hind, fore on the same side), a trot / run diagonal pairs
    this.spd = lerp(this.spd, Math.max(0, speed), 1 - Math.exp(-dt * 6));
    const v = this.spd, mov = smooth(v / 0.08) * wWalk;
    this.phase = (this.phase + dt * (1.5 + v * 4.2)) % 1;
    this.gait = [0, 0, 0, 0];
    if (mov > 0.001) {
      const lat = 1 - smooth((v - 0.5) / 0.4), off = [0, 0.5, lerp(0.5, 0.75, lat), lerp(0, 0.25, lat)]; // FL FR BL BR
      const amp = (0.32 + Math.min(0.32, v * 0.28)) * mov, ph = this.phase * TAU;
      for (let i = 0; i < 4; i++) {
        const a = (this.phase + off[i]) * TAU;
        // stance: the foot sweeps back slowly; swing: it lifts and comes forward quickly
        const s = Math.sin(a);
        this.gait[i] = s * amp;
        this.legs[i].lift = Math.max(0, Math.cos(a)) * mov;
      }
      P.fl += this.gait[0]; P.fr += this.gait[1]; P.bl += this.gait[2]; P.br += this.gait[3];
      P.y += (Math.abs(Math.sin(ph * 2)) - 0.5) * 0.004 * mov; P.roll += Math.sin(ph) * 0.025 * mov; P.hp += Math.sin(ph * 2) * 0.03 * mov;
      P.cy += Math.sin(ph) * 0.05 * mov;
      if (v > 1) { P.pitch += Math.sin(ph) * 0.07 * mov; P.cp += Math.sin(ph + 1) * 0.12 * mov; P.squash += Math.sin(ph * 2) * 0.03 * mov; }
    } else for (const L of this.legs) L.lift = 0;
    // --- petting: lean into the hand, eyes squeezed, ears out a little, purr, knead a bit; annoyed: ears flat, lashing tail
    this.petT = Math.max(0, this.petT - dt);
    this.petK = lerp(this.petK, this.petT > 0 ? 1 : 0, 1 - Math.exp(-dt * (this.petT > 0 ? 5 : 2.5)));
    this.annoyK = lerp(this.annoyK, this.annoyT, 1 - Math.exp(-dt * 6));
    const pk2 = this.petK * (1 - this.annoyK);
    if (pk2 > 0.01) {
      let side = 0, up = 0;
      if (this.petPt) {
        this.b.head.getWorldPosition(_v); _v2.copy(this.petPt).sub(_v);
        this.root.updateWorldMatrix(true, false);
        _q.copy(this.root.quaternion).invert(); _v2.applyQuaternion(_q);
        side = clamp(_v2.x / 0.06, -1, 1); up = clamp(_v2.y / 0.08, -1, 1);
      }
      this.petSide = lerp(this.petSide, side, 1 - Math.exp(-dt * 4));
      P.hp -= 0.32 * pk2 * (0.5 + 0.5 * Math.max(0, up)); P.hr += (0.35 * this.petSide + 0.12 * Math.sin(this.t * 1.6)) * pk2; P.hy += 0.15 * this.petSide * pk2;
      P.roll += 0.05 * this.petSide * pk2; P.earO += 0.5 * pk2; P.purr = Math.max(P.purr, pk2);
      P.tailUp += 0.5 * pk2; P.swish *= 1 - 0.6 * pk2; P.swishF *= 1 - 0.5 * pk2;
      if (this.w.held < 0.5) { const a = Math.sin(this.t * TAU * 1.2); P.flUp += 0.3 * pk2 * Math.max(0, a); P.frUp += 0.3 * pk2 * Math.max(0, -a); }
    }
    if (this.reactK) {
      this.reactT += dt;
      const u = this.reactT / 0.55, hit = Math.sin(Math.PI * clamp(u, 0, 1));
      if (this.reactK === 'swat') { P.frUp += 1.7 * hit; P.hr -= 0.15 * hit; P.roll -= 0.08 * hit; }
      else { P.hp += 0.35 * hit; P.z += 0.02 * hit; }
      if (u >= 1) this.reactK = null;
    }
    if (this.annoyK > 0.01) { P.earB = Math.max(P.earB, this.annoyK); P.swish = lerp(P.swish, 0.45, this.annoyK); P.swishF = lerp(P.swishF, 2.2, this.annoyK); P.tailCurl += 0.05 * this.annoyK; }
    this.updateLook(dt);
    this.applyPose(dt, P);
    this.updateFace(dt, P);
  }

  /** Head / eye targets: lookAt (world point) > lookYaw (from Street) > idle glances. */
  updateLook(dt) {
    this.glanceT -= dt;
    if (this.glanceT < 0) { this.glanceT = 1.5 + Math.random() * 4; const a = Math.random() < 0.55; this.glance = [a ? (Math.random() * 2 - 1) * 0.7 : 0, a ? (Math.random() - 0.5) * 0.3 : 0]; }
    let ty = this.glance[0] * 0.6 + this.lookYaw, tp = this.glance[1] * 0.6;
    const engaged = this.w.sleep < 0.5 && this.w.groom < 0.5 && this.w.drink < 0.5 && this.w.stretch < 0.5 && this.petK < 0.5;
    if (this.lookAt && engaged) {
      this.b.head.getWorldPosition(_v);
      this.root.updateWorldMatrix(true, false);
      _v2.copy(this.lookAt); this.root.worldToLocal(_v2); this.root.worldToLocal(_v);
      _v2.sub(_v);
      let y0 = Math.atan2(_v2.x, _v2.z);
      const p0 = -Math.atan2(_v2.y, Math.hypot(_v2.x, _v2.z));
      if (this.w.held > 0.5) {
        if (Math.abs(y0) > 2.6) y0 = (this.lookSide || 1) * 2.6;
        this.lookSide = Math.sign(y0) || 1;
        ty = clamp(y0, -1.4, 1.4); tp = clamp(p0, -0.5, 0.5);
      } else if (Math.abs(y0) < 2) { ty = clamp(y0, -1.1, 1.1); tp = clamp(p0, -0.6, 0.45); }
    }
    if (!engaged) { ty *= 0.15; tp *= 0.15; }
    for (let i = 0; i < 2; i++) { this.lookV[i] += (((i ? tp : ty) - this.look[i]) * 40 - this.lookV[i] * 11) * dt; this.look[i] += this.lookV[i] * dt; }
    this.eyeLead = clamp((ty - this.look[0]) * 3, -1, 1);
  }

  applyPose(dt, P) {
    const b = this.b, R = this.rest;
    // trunk: breathing, purr shiver; the chest bends off the hips
    const br = Math.sin(this.t * 2.3) * (1 - 0.5 * this.w.sleep);
    const purr = P.purr > 0.01 ? Math.sin(this.t * 140) * 0.0006 * P.purr : 0;
    const sq = 1 - P.squash + br * 0.012;
    b.body.position.set(R.body.x, R.body.y + P.y + purr, R.body.z + P.z);
    b.body.quaternion.setFromEuler(_e.set(P.pitch, P.yaw, P.roll, 'YXZ'));
    b.body.scale.set(1 + (1 - sq) * 0.45, sq, 1 + (1 - sq) * 0.2);
    b.chest.quaternion.setFromEuler(_e.set(P.cp, P.cy, -P.roll * 0.3, 'YXZ'));
    b.chest.scale.set(1, 1 + br * 0.008, 1);
    const trunkQ = _q3.copy(b.body.quaternion).multiply(b.chest.quaternion), inv = _q.copy(trunkQ).invert();
    // head: kept level against the trunk (stab), turned to the look target
    const hq = _q2.setFromEuler(_e.set(P.hp + this.look[1], P.hy + this.look[0] * 0.8, P.hr, 'YXZ'));
    b.head.quaternion.copy(inv).multiply(hq).slerp(hq, 1 - P.stab);
    b.head.scale.set(HEAD / b.body.scale.x, HEAD / (sq * b.chest.scale.y), HEAD / b.body.scale.z);
    // ears: up, back (flat), out; plus a quick flick now and then
    for (let i = 0; i < 2; i++) {
      this.earT[i] -= dt;
      if (this.earT[i] < 0) { this.earT[i] = 2 + Math.random() * 6; this.ear[i] = 1; }
      this.ear[i] = Math.max(0, this.ear[i] - dt * 6);
      const fl = Math.sin(this.ear[i] * Math.PI) * 0.6, sd = i === 0 ? 1 : -1;
      (i === 0 ? b.earL : b.earR).quaternion.setFromEuler(_e.set(-P.earB * 0.8 - fl * 0.3, sd * (P.earB * 0.35 + fl * 0.4), -sd * (P.earB * 0.75 + P.earO * 0.3), 'YXZ'));
    }
    this.applyTail(dt, P);
    this.applyLegs(dt, P);
  }

  /** Two-bone IK for each leg, toward a foot target the pose describes as an angle from the hip and a reach. */
  applyLegs(dt, P) {
    const b = this.b;
    this.root.updateMatrixWorld(true);
    _inv.copy(this.root.matrixWorld).invert();
    const bodyQ = b.body.quaternion, chestQ = _q3.copy(bodyQ).multiply(b.chest.quaternion);
    const fwdBody = _v3.set(0, 0, 1).applyQuaternion(bodyQ);
    for (let i = 0; i < 4; i++) {
      const L = this.legs[i], hind = L.hind, A = b[L.a], M = b[L.m], Pw = b[L.p];
      const parentQ = hind ? bodyQ : chestQ;
      // the hip / shoulder in root space
      const piv = A.parent.localToWorld(_v.copy(A.position)).applyMatrix4(_inv);
      const raise = i === 0 ? P.flUp : i === 1 ? P.frUp : 0;
      const ang = i === 0 ? P.fl + P.flUp * 1.25 - P.fold * 0.75 : i === 1 ? P.fr + P.frUp * 1.25 - P.fold * 0.75 : (i === 2 ? P.bl : P.br) + P.hindFold * 1.2;
      const lf = L.lift;
      const reach = Math.max(0.01, piv.y) / Math.max(0.35, Math.cos(clamp(ang, -1.2, 1.2)));
      let s = clamp(reach / L.L, 0.3, 1.6);
      if (hind) s = lerp(s, 0.62, clamp(P.hindFold, 0, 1));
      s = lerp(s, 0.42, hind ? P.fold * 0.8 : P.fold) * (1 - 0.16 * lf) * (1 - 0.4 * clamp(raise, 0, 1));
      if (P.dangle > 0.5) s = lerp(s, 1.2, P.dangle);
      // foot contact point, then the wrist / hock above it (the metatarsus lies flat when she sits on her hocks)
      const foot = _v2.copy(_e2v(piv, ang, s * L.L));
      if (hind && P.dangle > 0) foot.x += L.side * 0.022 * P.dangle; // the hind legs hang a little apart
      const contact = clamp(1 - Math.max(raise * 1.6, lf * 1.2, P.dangle, P.fold * (hind ? 0.2 : 0.6)), 0, 1);
      foot.y = lerp(foot.y, 0, contact);
      const sitHock = hind ? clamp(P.hindFold, 0, 1) : 0;
      const end = _w.copy(foot);
      if (hind) end.add(_w2.set(0, lerp(L.off.y, 0.014, sitHock), lerp(L.off.z, -0.058, sitHock)));
      else end.add(_w2.copy(L.off).multiplyScalar(lerp(1, 0.6, 1 - contact)));
      // the bend plane: elbows point back, knees forward (in the trunk's frame)
      const pole = _w3.copy(fwdBody).multiplyScalar(hind ? 1 : -1).add(_w4.set(0, hind ? 0.15 : -0.1, 0));
      const d = _w4.subVectors(end, piv), dist = clamp(d.length(), Math.abs(L.la - L.lb) + 0.004, L.la + L.lb - 0.0015);
      d.normalize();
      const pv = pole.addScaledVector(d, -pole.dot(d)).normalize();
      const ca = clamp((L.la * L.la + dist * dist - L.lb * L.lb) / (2 * L.la * dist), -1, 1), sa = Math.sqrt(1 - ca * ca);
      const elbow = _w5.copy(piv).addScaledVector(d, L.la * ca).addScaledVector(pv, L.la * sa);
      const wrist = _w6.copy(piv).addScaledVector(d, dist);
      // upper bone: rest direction -> piv->elbow, in its parent's frame
      const u1 = _w7.subVectors(elbow, piv).normalize(), u2 = _w8.subVectors(wrist, elbow).normalize();
      const side = hind ? _w9.crossVectors(pv, d) : _w9.crossVectors(d, pv);
      const r1 = aim(L.d1, u1, side, _qa);
      A.quaternion.copy(_qb.copy(parentQ).invert()).multiply(r1);
      const r2 = aim(L.d2, u2, side, _qc); M.quaternion.copy(_qb.copy(r1).invert()).multiply(r2);
      // paw: flat on the floor while it bears weight, curled along the forearm when lifted
      const flex = hind ? -0.3 * (1 - contact) : 0.5 * clamp(raise, 0, 1) + 0.45 * P.dangle + 1.1 * P.fold;
      const free = _qd.copy(r2).multiply(_qe.setFromAxisAngle(X, flex));
      let planted;
      if (hind) {
        const dm = _w7.subVectors(foot, wrist).normalize();
        planted = _qe.setFromUnitVectors(L.d3, dm);
      } else planted = _qe.identity();
      const r3 = _qf.copy(free).slerp(planted, contact);
      Pw.quaternion.copy(_qb.copy(r2).invert()).multiply(r3);
      // undo the trunk's squash on the legs
      const sx = 1 / b.body.scale.x, sy = 1 / b.body.scale.y, sz = 1 / b.body.scale.z;
      A.scale.set(sx, sy, sz);
    }
  }

  applyTail(dt, P) {
    const beatSwish = P.swishF < 0;
    for (let i = 0; i < TAIL_N; i++) {
      const s = this.tail[i], u = i / (TAIL_N - 1);
      const tp = i === 0 ? P.tailUp : P.tailCurl * (1 + u);
      const ph = beatSwish ? Math.PI * P.tailBeat - i * 0.45 : this.t * TAU * Math.max(0.15, P.swishF) - i * 0.7;
      const ty = (i ? P.tailSide * 0.3 + P.tailWrap : P.tailSide * 0.5) + Math.sin(ph) * P.swish * (0.4 + u);
      const k = 150 - i * 15, d = 2 * Math.sqrt(k) * 0.55;
      s.vp += ((tp - s.p) * k - s.vp * d) * dt; s.vy += ((ty - s.y) * k - s.vy * d - this.yawRate * 5 * (0.3 + u)) * dt;
      s.p += s.vp * dt; s.y += s.vy * dt;
      if (Math.abs(s.p - tp) > 1.5) { s.p = tp; s.vp = 0; }
      const bn = this.b['tail' + i];
      bn.quaternion.setFromEuler(_e.set(s.p, s.y, 0, 'YXZ'));
      // (scales compound down the chain: only the root puffs, the rest follow)
      const puff = i === 0 ? 1 + P.puff * 0.45 : 1;
      bn.scale.set(puff, puff, 1);
    }
  }

  updateFace(dt, P) {
    // blinks (a slow, contented one when she's petted or kneading)
    this.blinkT -= dt;
    if (this.blinkT < 0) { this.blink = P.content > 0.5 || this.petK > 0.5 ? 0.5 : 0.13; this.blinkT = 2.2 + Math.random() * 4.5; }
    this.blink = Math.max(0, this.blink - dt);
    this.meowT = Math.max(0, this.meowT - dt);
    if (this.forced) { this.forced.t -= dt; if (this.forced.t <= 0) this.forced = null; }
    const w = this.w, look = this.eyeLead + (this.lookAt ? clamp(this.look[0] * 0.8, -1, 1) : 0);
    const lk = look > 0.45 ? 'L' : look < -0.45 ? 'R' : '';
    let eyes = LOOKS.open[lk], mouth = 'w';
    const scared = this.mood === 'scared' || w.hide > 0.5;
    if (scared) eyes = LOOKS.wide[lk];
    else if (this.dark < 0.15 && w.held < 0.5) eyes = LOOKS.slit[lk];
    if (w.sleep > 0.5) { eyes = 'sleepy'; mouth = 'w'; }
    if (P.content > 0.5) eyes = 'content';
    if (w.groom > 0.5) { eyes = P.groomLick > 0.3 ? 'content' : 'sleepy'; mouth = P.groomLick > 0.3 && Math.sin(this.t * 20) > 0 ? 'blep' : 'w'; }
    if (w.drink > 0.5) { eyes = P.lick > 0.4 ? 'open' : 'content'; mouth = P.lap > 0.5 ? (Math.sin(this.t * TAU * 3.6) > 0 ? 'lap' : 'w') : P.lick > 0.4 && Math.sin(this.t * 14) > 0 ? 'blep' : 'w'; }
    if (P.yawn > 0.3) { eyes = 'squeeze'; mouth = 'yawn'; }
    if (w.groove > 0.5) { eyes = (Math.floor((this.groove.clock ? this.groove.clock() : this.grooveT) * 2) % 8 === 7) ? 'content' : LOOKS.open[lk]; mouth = 'happy'; }
    if (this.petK > 0.35 && this.annoyK < 0.4) { eyes = 'content'; mouth = 'happy'; }
    if (this.annoyK > 0.4) { eyes = LOOKS.half[lk]; mouth = 'w'; }
    if (this.blink > 0 && !CLOSED.has(eyes)) eyes = this.blink > 0.2 ? 'sleepy' : 'blink';
    if (this.meowT > 0) mouth = 'open';
    if (this.reactK) { eyes = 'squeeze'; mouth = 'hiss'; }
    if (this.forced) { eyes = this.forced.eyes || eyes; mouth = this.forced.mouth || mouth; }
    this.setFace(eyes, mouth);
    // sleepy z's float up now and then
    if (w.sleep > 0.8 && this.onFx) {
      this.zT -= dt;
      if (this.zT < 0) { this.zT = 1.6 + Math.random() * 1.2; this.onFx('zz', this.b.head.localToWorld(_v.set(0.02, 0.06, 0.05))); }
    }
  }

  /** World points for the first-person hands: either side of her chest (sd +1 her left; heldFlip -1 while she faces
   *  the one holding her, so each hand keeps its own side), and her back for strokes. */
  chestSide(sd, out) { return this.b.chest.localToWorld(out.set(sd * (this.heldFlip || 1) * 0.056, -0.012, 0.045)); }
  headTop(out) { return this.b.head.localToWorld(out.set(0, 0.056, 0.024)); }
  backTop(u, out) { return this.b.body.localToWorld(out.set(0, 0.066, lerp(0.16, -0.11, u))); }
}

// scratch for the leg solver
const _w = new THREE.Vector3(), _w2 = new THREE.Vector3(), _w3 = new THREE.Vector3(), _w4 = new THREE.Vector3(), _w5 = new THREE.Vector3(), _w6 = new THREE.Vector3(), _w7 = new THREE.Vector3(), _w8 = new THREE.Vector3(), _w9 = new THREE.Vector3(), _w10 = new THREE.Vector3();
const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _qc = new THREE.Quaternion(), _qd = new THREE.Quaternion(), _qe = new THREE.Quaternion(), _qf = new THREE.Quaternion();
const _ma = new THREE.Matrix4(), _mb = new THREE.Matrix4(), _x1 = new THREE.Vector3(), _x2 = new THREE.Vector3(), _x3 = new THREE.Vector3();
/** The pivot plus a leg of length len at angle ang (0 straight down, + forward) in root space. */
function _e2v(piv, ang, len) { return _w10.set(piv.x, piv.y - Math.cos(ang) * len, piv.z + Math.sin(ang) * len); }
/** Rotation taking a bone's rest direction (rest side = +x) to `dir`, with its side axis on `side`. */
function aim(restDir, dir, side, out) {
  // rest frame: (x0, restDir, z0); target frame: (side', dir, z') with side' = side made perpendicular to dir
  _x1.set(1, 0, 0).addScaledVector(restDir, -restDir.x).normalize();
  _x2.crossVectors(_x1, restDir);
  _ma.makeBasis(_x1, restDir, _x2);
  _x3.copy(side).addScaledVector(dir, -side.dot(dir)).normalize();
  _x2.crossVectors(_x3, dir);
  _mb.makeBasis(_x3, dir, _x2);
  _mb.multiply(_ma.transpose());
  return out.setFromRotationMatrix(_mb);
}
