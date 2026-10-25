// Mikan the stray: a low-poly realistic calico (geometry + painted coat: catBody.js) animated entirely in code.
//   const rig = new CatRig();  scene.add(rig.root);  rig.setPose('sit');  rig.update(dt, speed);
// Poses: walk (stand / walk / trot / run by speed), sit, groom, sleep (loaf or curl), held, drink, groove
// ({ bpm, phase, clock }), hide, stretch, knead. Staged blends (the rear sits down first, the front stands up first),
// leg IK with planted paws and a diagonal gait, spine flex, a stabilised head that tracks lookAt (world point) or
// lookYaw, a spring-driven tail, ear twitches, blinks, slit pupils that open in the dark (dark 0..1), a lapping
// tongue and pet() (leans into the hand, eyes shut, purrs). mood: 'calm' | 'happy' (tail up) | 'scared' (ears flat).
import * as THREE from 'three';
import { catAssets, CAT_BONES, CAT_JOINT as J, FRONT_TOE, HIND_TOE, EYE, TAIL_N, LIFT } from './catBody.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const TAU = Math.PI * 2;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const pk = (b, p = 1) => ((1 + Math.cos(TAU * b)) / 2) ** p; // 1 on the beat
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _v4 = new THREE.Vector3(), _v5 = new THREE.Vector3();
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _m = new THREE.Matrix4(), _box = new THREE.Box3();

// blended pose parameters; the rear group follows the rear blend weights, the rest the front ones
const REAR = ['pelY', 'pelZ', 'pelPitch', 'pelRoll', 'pelYaw', 'hlx', 'hly', 'hlz', 'hlm', 'hrx', 'hry', 'hrz', 'hrm', 'tailPitch', 'tailCurl', 'tailYaw', 'tailHook', 'tailSwish', 'tailFreq'];
const FRONT = ['spFlex', 'spBend', 'chestPitch', 'chestRoll', 'chestYaw', 'neckPitch', 'neckYaw', 'headPitch', 'headYaw', 'headRoll', 'stab', 'jaw', 'earX', 'earZ', 'lid', 'pupil', 'tongue', 'flx', 'fly', 'flz', 'flp', 'frx', 'fry', 'frz', 'frp', 'purr'];
const POSES = ['walk', 'sit', 'groom', 'sleep', 'held', 'drink', 'groove', 'hide', 'stretch', 'knead'];
const LOW = new Set(['sit', 'groom', 'sleep', 'drink', 'groove', 'hide', 'knead']); // sit-type: the rear leads going down
const META0 = Math.atan2(J.metaL[1] - HIND_TOE[1], HIND_TOE[2] - J.metaL[2]); // rest metatarsus angle
const LM = Math.hypot(J.metaL[1] - HIND_TOE[1], HIND_TOE[2] - J.metaL[2]);
const PAWV = [0, FRONT_TOE[1] - J.pawL[1], FRONT_TOE[2] - J.pawL[2]]; // wrist -> pad (rest)
export const CAT_SCALE = 0.86; // a young cat: about the old voxel cat's footprint

function stand(p) {
  Object.assign(p, {
    pelY: 0.173, pelZ: -0.1, pelPitch: 0, pelRoll: 0, pelYaw: 0, spFlex: 0, spBend: 0, chestPitch: 0, chestRoll: 0, chestYaw: 0,
    neckPitch: 0, neckYaw: 0, headPitch: 0, headYaw: 0, headRoll: 0, stab: 1, jaw: 0, earX: 0.05, earZ: 0.1, lid: 0, pupil: 0, tongue: 0, purr: 0,
    tailPitch: -0.45, tailCurl: 0.12, tailYaw: 0, tailHook: 0, tailSwish: 0.08, tailFreq: 0.5,
    flx: FRONT_TOE[0], fly: 0, flz: FRONT_TOE[2], flp: 0, frx: -FRONT_TOE[0], fry: 0, frz: FRONT_TOE[2], frp: 0,
    hlx: HIND_TOE[0], hly: 0, hlz: HIND_TOE[2], hlm: META0, hrx: -HIND_TOE[0], hry: 0, hrz: HIND_TOE[2], hrm: META0,
  });
  return p;
}
function sit(p) {
  stand(p);
  Object.assign(p, {
    pelY: 0.064, pelZ: -0.1, pelPitch: -0.8, chestPitch: -0.12, spFlex: 0.14, neckPitch: -0.1,
    flx: 0.024, flz: 0.078, frx: -0.024, frz: 0.078,
    hlx: 0.052, hlz: -0.055, hlm: 0.07, hrx: -0.052, hrz: -0.055, hrm: 0.07,
    tailPitch: 0.85, tailCurl: 0.0, tailYaw: 0.42, tailSwish: 0.04, earX: 0.1, earZ: 0.05, lid: 0.12,
  });
  return p;
}

export class CatRig {
  constructor() {
    const A = catAssets();
    this.root = new THREE.Group();
    this.root.name = 'cat';
    this.root.scale.setScalar(CAT_SCALE);
    this.mat = new THREE.MeshStandardMaterial({ map: A.map, roughness: 0.92, metalness: 0 });
    this.bones = [];
    for (const [name, parent, p] of CAT_BONES) {
      const bn = new THREE.Bone();
      bn.name = name;
      const pp = parent ? J[parent] : [0, 0, 0];
      bn.position.set(p[0] - pp[0], p[1] - pp[1], p[2] - pp[2]);
      if (parent) this.bones.find((x) => x.name === parent).add(bn);
      this.bones.push(bn);
    }
    const b = this.b = Object.fromEntries(this.bones.map((x) => [x.name, x]));
    this.geo = A.geometry.clone();
    this.mesh = new THREE.SkinnedMesh(this.geo, this.mat);
    this.mesh.add(this.bones[0]);
    this.mesh.updateMatrixWorld(true);
    this.mesh.bind(new THREE.Skeleton(this.bones));
    this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    this.mesh.boundingBox = new THREE.Box3(); this.mesh.boundingSphere = new THREE.Sphere();
    this.geo.boundingBox = new THREE.Box3();
    this.root.add(this.mesh);
    this.rest = Object.fromEntries(this.bones.map((x) => [x.name, x.position.clone()]));
    // bone directions to the child joint (rest, local == world-aligned)
    const dir = (a, bj) => new THREE.Vector3(bj[0] - J[a][0], bj[1] - J[a][1], bj[2] - J[a][2]).normalize();
    this.dirs = {};
    for (const s of ['L', 'R']) {
      this.dirs['arm' + s] = dir('arm' + s, J['fore' + s]); this.dirs['fore' + s] = dir('fore' + s, J['paw' + s]);
      this.dirs['paw' + s] = dir('paw' + s, [J['paw' + s][0], FRONT_TOE[1], FRONT_TOE[2]]);
      this.dirs['thigh' + s] = dir('thigh' + s, J['shin' + s]); this.dirs['shin' + s] = dir('shin' + s, J['meta' + s]);
      this.dirs['meta' + s] = dir('meta' + s, [J['meta' + s][0], HIND_TOE[1], HIND_TOE[2]]);
    }
    const len = (a, bj) => Math.hypot(bj[0] - J[a][0], bj[1] - J[a][1], bj[2] - J[a][2]);
    this.len = { arm: len('armL', J.foreL), fore: len('foreL', J.pawL), thigh: len('thighL', J.shinL), shin: len('shinL', J.metaL) };
    this.buildFace(A);
    // the hover highlight's rim shells aren't skinned (they'd show a ghost in the bind pose): no rims on the cat
    this.root.traverse((o) => { o.userData.noRim = true; });
    // state
    this.pose = 'sit';
    this.wF = Object.fromEntries(POSES.map((k) => [k, k === 'sit' ? 1 : 0]));
    this.wR = { ...this.wF };
    this.poseT = Object.fromEntries(POSES.map((k) => [k, 0]));
    this.P = stand({}); this.tmp = stand({});
    this.t = Math.random() * 10; this.started = false;
    this.lookYaw = 0; this.lookAt = null; this.mood = 'calm'; this.dark = 0.3;
    this.look = [0, 0]; this.lookV = [0, 0]; this.glance = [0, 0]; this.glanceT = 2;
    this.spd = 0; this.phase = 0; this.prevYaw = null; this.yawRate = 0;
    this.blinkT = 2; this.earT = [3, 5]; this.ear = [0, 0]; this.flickT = 4; this.flick = 0;
    this.tail = Array.from({ length: TAIL_N }, () => ({ p: 0, y: 0, vp: 0, vy: 0 }));
    this.petT = 0; this.petK = 0; this.pupilK = 0.3; this.curl = false; this.drop = [0, 0]; this.need = [0, 0];
    this.groove = { bpm: 120, phase: 0, clock: null }; this.grooveT = 0;
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
    if (!this.started) { for (const k of POSES) this.wF[k] = this.wR[k] = k === p ? 1 : 0; } // before the first frame: no transition
  }

  /** A stroke (while held): leans into the hand, eyes shut, purrs for a moment. */
  pet() { this.petT = 1.6; }

  // ------------------------------------------------------------------ face parts (eyes, lids, whiskers, tongue)
  buildFace(A) {
    const b = this.b, E = EYE, hd = J.head;
    const almond = (hw, hh, top = false) => {
      const s = new THREE.Shape();
      const pts = [[-1, 0.05], [-0.62, 0.62], [0, 0.95], [0.6, 0.7], [1, 0.12], [0.55, -0.62], [0, -0.92], [-0.6, -0.6]];
      pts.forEach(([x, y], i) => (i ? s.lineTo : s.moveTo).call(s, x * hw, (y - (top ? 0.95 : 0)) * hh));
      const g = new THREE.ShapeGeometry(s);
      const uv = g.attributes.uv, pos = g.attributes.position;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / (2 * hw) + 0.5, (pos.getY(i) + (top ? 0.95 * hh : 0)) / (2 * hh) + 0.5);
      return g;
    };
    const irisTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 32;
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(16, 16, 2, 16, 16, 16);
      gr.addColorStop(0, '#d8d060'); gr.addColorStop(0.45, '#a8b848'); gr.addColorStop(0.8, '#6f8a3a'); gr.addColorStop(1, '#2c3418');
      g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
      for (let i = 0; i < 40; i++) { const a = Math.random() * TAU, r = 5 + Math.random() * 9; g.fillStyle = `rgba(${Math.random() < 0.5 ? '240,220,120' : '60,80,30'},0.35)`; g.fillRect(16 + Math.cos(a) * r, 16 + Math.sin(a) * r, 1, 1); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    this.irisMat = new THREE.MeshStandardMaterial({ map: irisTex, roughness: 0.25, metalness: 0, emissive: new THREE.Color(0x5a7a20), emissiveIntensity: 0, side: THREE.DoubleSide });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x080606, side: THREE.DoubleSide });
    const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const lidMats = [new THREE.MeshStandardMaterial({ color: 0xc87a3a, roughness: 0.95, side: THREE.DoubleSide }), new THREE.MeshStandardMaterial({ color: 0x2e2622, roughness: 0.95, side: THREE.DoubleSide })];
    const eyeGeo = almond(E.hw, E.hh), lidGeo = almond(E.hw * 1.12, E.hh * 1.15, true);
    const pupilGeo = new THREE.CircleGeometry(1, 14);
    this.eyes = [];
    for (const sd of [1, -1]) {
      const z = A.surfaceZ(sd * E.x, E.y);
      const g = new THREE.Group();
      g.position.set(sd * E.x - hd[0], E.y + LIFT - hd[1], (isFinite(z) ? z : 0.197) + 0.0011 - hd[2]);
      g.rotation.set(-0.12, sd * 0.42, 0, 'YXZ');
      const inner = new THREE.Group(); inner.rotation.z = sd * E.tilt; inner.scale.x = sd; g.add(inner);
      const iris = new THREE.Mesh(eyeGeo, this.irisMat);
      const pupil = new THREE.Mesh(pupilGeo, pupilMat); pupil.position.z = 0.0003; pupil.scale.set(0.0042, E.hh * 0.86, 1);
      const glint = new THREE.Mesh(pupilGeo, glintMat); glint.position.set(0.0022, 0.0026, 0.0006); glint.scale.setScalar(0.0011);
      const lid = new THREE.Mesh(lidGeo, lidMats[sd > 0 ? 0 : 1]); lid.position.set(0, E.hh * 1.0, 0.0009);
      inner.add(iris, pupil, glint, lid);
      b.head.add(g);
      this.eyes.push({ g, pupil, lid, glint, sd });
    }
    // whiskers: thin pale strands fanning from the pads (plus two above each eye)
    const wp = [];
    for (const sd of [1, -1]) {
      for (let i = 0; i < 4; i++) {
        const x0 = sd * (0.0075 + i * 0.0006), y0 = 0.2115 - i * 0.0016, z0 = (A.surfaceZ(x0, y0) || 0.21) + 0.0004;
        const L = 0.05 - i * 0.004, dy = 0.12 - i * 0.12;
        const mid = [x0 + sd * L * 0.5, y0 + dy * L * 0.5 + 0.002, z0 + L * 0.12], end = [x0 + sd * L, y0 + dy * L - 0.002, z0 + L * 0.1];
        wp.push(x0, y0, z0, ...mid, ...mid, ...end);
      }
      for (let i = 0; i < 2; i++) {
        const x0 = sd * (0.012 + i * 0.004), y0 = 0.2425, z0 = (A.surfaceZ(x0, y0) || 0.19) + 0.0004;
        wp.push(x0, y0, z0, x0 + sd * 0.008, y0 + 0.011, z0 + 0.005);
      }
    }
    for (let i = 0; i < wp.length; i += 3) { wp[i] -= hd[0]; wp[i + 1] += LIFT - hd[1]; wp[i + 2] -= hd[2]; }
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
    this.whiskers = new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: 0xf2ece2, transparent: true, opacity: 0.8 }));
    b.head.add(this.whiskers);
    // mouth: a dark inside (seen when the jaw drops) and the tongue on the jaw
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.006, 0.02), new THREE.MeshStandardMaterial({ color: 0x5a2228, roughness: 0.6 }));
    mouth.position.set(0, 0.2045 + LIFT - hd[1], 0.2 - hd[2]);
    b.head.add(mouth);
    this.tongue = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.0018, 0.016), new THREE.MeshStandardMaterial({ color: 0xe0848e, roughness: 0.45 }));
    this.tongue.geometry.translate(0, 0, 0.008);
    this.tongueBase = new THREE.Vector3(0, 0.2065 + LIFT - J.jaw[1], 0.192 - J.jaw[2]);
    this.tongue.position.copy(this.tongueBase);
    b.jaw.add(this.tongue);
  }

  // ------------------------------------------------------------------ poses
  poseParams(name, p, k) {
    const t = this.t;
    switch (name) {
      case 'walk': {
        stand(p);
        // standing about: weight shifts, breathing, an idle look around; mood sets ears / tail
        p.pelRoll = Math.sin(t * 0.7) * 0.02; p.chestRoll = -p.pelRoll * 0.6;
        if (this.mood === 'happy') Object.assign(p, { tailPitch: 1.35, tailCurl: 0.03, tailHook: 0.55, tailSwish: 0.05, earX: 0.18 });
        if (this.mood === 'scared') Object.assign(p, { pelY: 0.145, earZ: 0.9, earX: -0.35, pupil: 0.6, tailPitch: -0.8, tailCurl: 0.02 });
        return p;
      }
      case 'sit': return sit(p);
      case 'hide': {
        // crouched low, ready to bolt: ears flat, wide eyes, tail tucked along the side
        stand(p);
        return Object.assign(p, {
          pelY: 0.085, pelZ: -0.09, pelPitch: 0.04, spFlex: 0.14, chestPitch: 0.05, neckPitch: -0.12, headPitch: 0.05,
          flz: 0.12, hlz: -0.085, hrz: -0.085, hlm: 0.18, hrm: 0.18, hlx: 0.05, hrx: -0.05,
          earZ: 0.95, earX: -0.45, pupil: 0.65, tailPitch: 0.25, tailCurl: -0.02, tailYaw: 0.22, tailSwish: 0.03,
        });
      }
      case 'groove': {
        // sitting, bobbing along: a nod on every beat, a sway over each bar, paws tapping in turn, tail in time
        sit(p);
        const gr = this.groove, beat = (gr.clock ? gr.clock() : this.grooveT) * (gr.bpm || 120) / 60 + (gr.phase || 0);
        const nod = pk(beat - 0.08, 1.5), sway = Math.sin(Math.PI * beat / 2), tap = Math.sin(Math.PI * beat);
        p.pelRoll = 0.07 * sway; p.chestRoll = -0.03 * sway; p.pelY -= 0.004 * nod;
        p.headPitch = 0.14 * nod - 0.08; p.headRoll = -0.24 * sway; p.headYaw = 0.12 * sway; p.neckPitch = -0.1 + 0.05 * nod;
        p.fly = 0.028 * Math.max(0, -tap) ** 2; p.flp = 0.6 * Math.max(0, -tap) ** 2; p.flz += 0.012 * Math.max(0, -tap) ** 2;
        p.fry = 0.028 * Math.max(0, tap) ** 2; p.frp = 0.6 * Math.max(0, tap) ** 2; p.frz += 0.012 * Math.max(0, tap) ** 2;
        p.tailYaw = 0.16; p.tailSwish = 0.3; p.tailFreq = -1; // -1: swish locked to the beat (see tail)
        p.tailBeat = beat; p.earX = 0.2; p.pupil = 0.25;
        p.lid = beat - Math.floor(beat / 8) * 8 > 7.6 ? 1 : 0.15; // a slow, contented blink every two bars
        return p;
      }
      case 'groom': {
        // lick a front paw, then wash the face with it (a 6 s cycle), sitting
        sit(p);
        const c = (k % 6), lick = c < 2.6, u = lick ? c / 2.6 : (c - 2.6) / 3.4;
        const up = smooth(Math.min(c, 6 - c) / 0.5);
        if (lick) {
          p.frx = lerp(p.frx, -0.012, up); p.fry = lerp(0, 0.14, up); p.frz = lerp(p.frz, 0.12, up); p.frp = lerp(0, 1.3, up);
          p.neckPitch = lerp(-0.1, 0.45, up); p.headPitch = lerp(0, 0.6, up); p.headYaw = -0.15 * up; p.headRoll = -0.2 * up;
          p.tongue = up * Math.max(0, Math.sin(t * TAU * 3.2)); p.jaw = p.tongue * 0.25; p.lid = 0.55 * up;
        } else {
          const a = u * TAU * 3; // three wipes over the cheek and ear
          p.frx = lerp(p.frx, -0.022 + Math.sin(a) * 0.01, up); p.fry = lerp(0, 0.205 + Math.cos(a) * 0.022, up); p.frz = lerp(p.frz, 0.105 + Math.sin(a) * 0.008, up); p.frp = lerp(0, 1.6, up);
          p.neckPitch = lerp(-0.1, 0.25, up); p.headPitch = lerp(0, 0.45 + Math.cos(a) * 0.12, up); p.headRoll = lerp(0, -0.45, up); p.headYaw = lerp(0, -0.35, up);
          p.lid = 0.9 * up; p.earZ = 0.4 * up;
        }
        p.flx = 0.012; p.tailSwish = 0.03;
        return p;
      }
      case 'sleep': {
        stand(p);
        const br = Math.sin(t * 1.5);
        Object.assign(p, {
          pelY: 0.056, pelZ: -0.1, spFlex: 0.06, chestPitch: -0.02, neckPitch: 0.05, headPitch: 0.16, stab: 0.85, lid: 1, earZ: 0.3, earX: -0.05,
          flx: 0.02, fly: 0.04, flz: 0.085, flp: -2.6, frx: -0.02, fry: 0.04, frz: 0.085, frp: -2.6,
          hlx: 0.045, hly: 0.004, hlz: -0.045, hlm: 0.02, hrx: -0.045, hry: 0.004, hrz: -0.045, hrm: 0.02,
          tailPitch: 0.25, tailCurl: 0.0, tailYaw: 0.4, tailSwish: 0.0,
        });
        p.chestPitch += br * 0.012; p.pelY += br * 0.0012;
        if (this.curl) {
          // curled in a ring, nose tucked into the tail
          Object.assign(p, { pelYaw: -0.45, pelRoll: 0.12, spBend: 1.3, chestYaw: 0.35, neckYaw: 0.75, headYaw: 0.55, headRoll: 0.3, neckPitch: 0.4, headPitch: 0.35, stab: 0.3, tailYaw: 0.5, tailPitch: 0.3 });
          p.flz = 0.05; p.frz = 0.06; p.flx = 0.045; p.frx = 0.0;
        }
        return p;
      }
      case 'drink': {
        // crouched at the bowl, head down, lapping (~4 laps a second, little head bobs); every few seconds a look up and a lick of the lips
        stand(p);
        const lap = Math.max(0, Math.sin(t * TAU * 3.8)), cyc = k % 6.5, up = smooth((cyc - 4.8) / 0.3) * (1 - smooth((cyc - 6.1) / 0.3));
        Object.assign(p, {
          pelY: 0.112, pelZ: -0.075, pelPitch: 0.16, spFlex: 0.12, chestPitch: 0.2, neckPitch: 0.72, headPitch: 0.92, stab: 0.55,
          flx: 0.042, flz: 0.165, frx: -0.042, frz: 0.165, hlx: 0.048, hlz: -0.082, hrx: -0.048, hrz: -0.082, hlm: 0.3, hrm: 0.3,
          tailPitch: 0.1, tailCurl: 0.05, tailYaw: 0.14, tailSwish: 0.05, earX: 0.12, lid: 0.35,
        });
        p.neckPitch -= up * 0.9; p.headPitch -= up * 1.05; p.lid = lerp(p.lid, 0.15, up);
        p.tongue = lap * (1 - up) + up * Math.max(0, Math.sin((cyc - 5) * TAU * 1.6)) * 0.7; p.jaw = p.tongue * 0.18;
        p.headPitch += lap * 0.04 * (1 - up);
        return p;
      }
      case 'stretch': {
        // the long front stretch with a yawn, then one hind leg pushed out behind
        stand(p);
        const a = smooth(k / 0.6) * (1 - smooth((k - 1.6) / 0.5)), h = smooth((k - 1.9) / 0.4) * (1 - smooth((k - 2.8) / 0.4));
        p.pelY = lerp(0.173, 0.18, a); p.pelZ = lerp(-0.1, -0.075, a); p.pelPitch = 0.32 * a; p.spFlex = -0.2 * a; p.chestPitch = 0.12 * a;
        p.flz = lerp(p.flz, 0.235, a); p.frz = lerp(p.frz, 0.225, a); p.flp = -0.25 * a; p.frp = -0.25 * a;
        p.neckPitch = -0.55 * a; p.headPitch = -0.25 * a; p.stab = 1 - 0.5 * a;
        const yawn = smooth((k - 0.6) / 0.35) * (1 - smooth((k - 1.45) / 0.3));
        p.jaw = 0.62 * yawn; p.lid = 0.85 * yawn; p.earZ = 0.1 + 0.5 * yawn; p.tongue = 0.25 * yawn;
        p.tailPitch = lerp(-0.45, 0.45, a); p.tailCurl = 0.08;
        p.pelZ += 0.03 * h; p.hlz = lerp(p.hlz, -0.25, h); p.hly = 0.02 * h; p.hlm = lerp(META0, 0.1, h); p.chestPitch += 0.05 * h;
        return p;
      }
      case 'knead': {
        // half-sitting, front paws pressing in turn, eyes half shut, purring
        sit(p);
        const a = Math.sin(k * TAU * 1.3), L = Math.max(0, a), R = Math.max(0, -a);
        Object.assign(p, { pelY: 0.08, pelPitch: -0.5, flz: 0.11, frz: 0.11, lid: 0.6, earX: 0.1, tailPitch: 0.9, tailCurl: 0.05, tailHook: 0.3, purr: 1 });
        p.fly = 0.022 * L; p.flp = 0.8 * L; p.fry = 0.022 * R; p.frp = 0.8 * R;
        p.chestRoll = 0.04 * a; p.headRoll = -0.05 * a;
        return p;
      }
      case 'held': {
        // hanging under her front legs: back straight up, hind legs dangling, tail swishing, looking at you
        stand(p);
        const sw = Math.sin(t * 1.3);
        Object.assign(p, {
          pelY: 0.02, pelZ: 0.02, pelPitch: -1.38, spFlex: -0.06, chestPitch: -0.02, neckPitch: 0.4, headPitch: -0.05, stab: 1,
          flx: 0.028, fly: 0.07, flz: 0.1, flp: 0.7, frx: -0.028, fry: 0.07, frz: 0.1, frp: 0.7,
          hlx: 0.045, hly: -0.17 + sw * 0.004, hlz: 0.035, hlm: 1.45, hrx: -0.045, hry: -0.17 - sw * 0.004, hrz: 0.035, hrm: 1.45,
          tailPitch: 0.12, tailCurl: 0.06, tailYaw: 0, tailSwish: 0.3, tailFreq: 0.75, earX: 0.15, pupil: 0.35,
        });
        return p;
      }
    }
    return stand(p);
  }

  update(dt, speed = 0) {
    dt = Math.min(dt, 0.1);
    if (!(dt > 0)) return;
    this.started = true;
    this.t += dt; this.grooveT += dt;
    for (const k of POSES) this.poseT[k] += dt;
    const P = this.P, T = this.tmp;
    // --- pose weights: going down (sit-type poses) the rear leads, getting up the front leads
    let sF = 0, sR = 0;
    const low = LOW.has(this.pose), fast = this.pose === 'held' || this.wF.held > 0.05 ? 9 : 4;
    const rF = fast * (low ? 0.6 : 1.5), rR = fast * (low ? 1.5 : 0.6);
    for (const k of POSES) {
      const on = k === this.pose;
      this.wF[k] += ((on ? 1 : 0) - this.wF[k]) * Math.min(1, dt * rF);
      this.wR[k] += ((on ? 1 : 0) - this.wR[k]) * Math.min(1, dt * rR);
      sF += this.wF[k]; sR += this.wR[k];
    }
    for (const key of REAR) P[key] = 0;
    for (const key of FRONT) P[key] = 0;
    P.tailBeat = 0;
    for (const k of POSES) {
      const wf = this.wF[k] / sF, wr = this.wR[k] / sR;
      if (wf < 0.002 && wr < 0.002) continue;
      this.poseParams(k, T, this.poseT[k]);
      for (const key of REAR) P[key] += T[key] * wr;
      for (const key of FRONT) P[key] += T[key] * wf;
      if (k === 'groove') P.tailBeat = T.tailBeat;
    }
    const wWalk = (this.wF.walk / sF + this.wR.walk / sR) / 2;
    // --- turning (spine bends into the turn, the tail swings out)
    const yaw = this.root.rotation.y;
    if (this.prevYaw === null) this.prevYaw = yaw;
    this.yawRate = lerp(this.yawRate, clamp(wrap(yaw - this.prevYaw) / dt, -12, 12), 1 - Math.exp(-dt * 8)); this.prevYaw = yaw;
    if (!isFinite(this.yawRate)) this.yawRate = 0;
    // --- gait: walk (lateral sequence) -> trot (diagonal pairs) -> run (rotary gallop)
    // (speed is in world m/s; strides are in the rig's own, unscaled units)
    this.spd = lerp(this.spd, Math.max(0, speed), 1 - Math.exp(-dt * 6));
    const v = this.spd, vl = v / CAT_SCALE, mov = smooth(v / 0.08) * wWalk;
    const trot = smooth((v - 0.55) / 0.25), run = smooth((v - 1.05) / 0.3);
    const L = clamp(0.12 + 0.2 * vl, 0.12, 0.5);
    this.phase = (this.phase + vl * dt / L) % 1;
    const duty = lerp(lerp(0.62, 0.5, trot), 0.38, run), lift = 0.022 + 0.014 * Math.min(1.5, vl);
    const OFF = [[0, 0.25, 0.5, 0.75], [0, 0.5, 0.5, 1], [0, 0.58, 0.12, 0.7]]; // LH, LF, RH, RF
    const legs = [['hl', 0], ['fl', 1], ['hr', 2], ['fr', 3]];
    if (mov > 0.001) {
      for (const [key, i] of legs) {
        const off = lerp(lerp(OFF[0][i], OFF[1][i], trot), OFF[2][i], run);
        const q = (this.phase + off) % 1;
        let dz, ly = 0, sw = 0;
        if (q < duty) dz = duty * L * (0.5 - q / duty);
        else { const u = (q - duty) / (1 - duty); dz = lerp(-duty * L / 2, duty * L / 2, smooth(u)); ly = Math.sin(Math.PI * u) * lift; sw = Math.sin(Math.PI * u); }
        P[key + 'z'] += dz * mov; P[key + 'y'] += ly * mov;
        if (key[0] === 'f') P[key + 'p'] += sw * 1.1 * mov; else P[key + 'm'] += sw * 0.45 * mov;
      }
      const ph = this.phase * TAU;
      P.pelY += (-0.004 * Math.cos(2 * ph) * (1 - run) - 0.018 * run) * mov;
      P.pelRoll += 0.035 * Math.sin(ph) * (1 - trot) * mov; P.chestRoll -= 0.03 * Math.sin(ph) * mov;
      P.spBend += 0.05 * Math.sin(ph) * (1 - run) * mov;
      P.spFlex += 0.3 * Math.sin(ph - 0.9) * run * mov; P.pelPitch += 0.1 * Math.sin(ph - 0.4) * run * mov;
      P.tailPitch = lerp(P.tailPitch, this.mood === 'scared' ? -0.15 : this.mood === 'happy' ? 1.35 : 0.05, smooth(v / 0.5) * wWalk * 0.8);
      if (this.mood === 'scared') { P.earZ = Math.max(P.earZ, 0.85 * mov); P.earX -= 0.3 * mov; }
    }
    P.spBend += clamp(this.yawRate * 0.12, -0.35, 0.35) * wWalk;
    // --- petting: lean into the hand, eyes shut, ears back a little, purr
    this.petT = Math.max(0, this.petT - dt);
    this.petK = lerp(this.petK, this.petT > 0 ? 1 : 0, 1 - Math.exp(-dt * (this.petT > 0 ? 6 : 2.5)));
    const pkk = this.petK;
    P.headPitch -= 0.38 * pkk; P.headRoll += 0.3 * pkk * Math.sin(this.t * 1.7); P.lid = lerp(P.lid, 0.92, pkk); P.earZ += 0.3 * pkk; P.purr = Math.max(P.purr, pkk);
    P.tailCurl += 0.06 * pkk; P.tailSwish *= 1 - 0.7 * pkk;
    // planted paws must reach: sink the trunk by what the most stretched leg lacked last frame (see reach())
    // (rear legs short: lower the pelvis; front legs short: tip the trunk nose-down so the shoulders come down)
    P.pelY -= this.drop[1]; P.pelPitch += this.drop[0] / 0.2;
    this.updateLook(dt, P);
    this.applyPose(dt, P);
    for (let i = 0; i < 2; i++) this.drop[i] = lerp(this.drop[i], clamp(this.drop[i] + this.need[i], 0, 0.05) * (1 - this.wF.held), 1 - Math.exp(-dt * 18));
    this.updateFace(dt, P);
    this.updateBounds();
  }

  /** Head / eye targets: lookAt (world point) > lookYaw (from Street) > idle glances. */
  updateLook(dt, P) {
    this.glanceT -= dt;
    if (this.glanceT < 0) { this.glanceT = 1.5 + Math.random() * 4; const a = Math.random() < 0.55; this.glance = [a ? (Math.random() * 2 - 1) * 0.7 : 0, a ? (Math.random() - 0.5) * 0.3 : 0]; }
    let ty = this.glance[0] * 0.6 + this.lookYaw, tp = this.glance[1] * 0.6;
    const engaged = this.wF.sleep < 0.5 && this.wF.groom < 0.5 && this.wF.drink < 0.5 && this.wF.stretch < 0.5;
    if (this.lookAt && engaged) {
      this.b.head.getWorldPosition(_v);
      this.root.updateWorldMatrix(true, false);
      _v2.copy(this.lookAt); this.root.worldToLocal(_v2); this.root.worldToLocal(_v);
      _v2.sub(_v);
      let y0 = Math.atan2(_v2.x, _v2.z);
      const p0 = -Math.atan2(_v2.y, Math.hypot(_v2.x, _v2.z));
      if (this.wF.held > 0.5) {
        // held facing away: she twists round over a shoulder to look back at you (keeps the side she picked)
        if (Math.abs(y0) > 2.7) y0 = (this.lookSide || 1) * 2.7;
        this.lookSide = Math.sign(y0) || 1;
        ty = clamp(y0, -1.5, 1.5); tp = clamp(p0, -0.5, 0.5);
      } else if (Math.abs(y0) < 2) { ty = clamp(y0, -1.2, 1.2); tp = clamp(p0, -0.7, 0.5); }
    }
    if (!engaged) { ty *= 0.15; tp *= 0.15; }
    for (let i = 0; i < 2; i++) { this.lookV[i] += (((i ? tp : ty) - this.look[i]) * 40 - this.lookV[i] * 11) * dt; this.look[i] += this.lookV[i] * dt; }
    this.eyeLead = [clamp((ty - this.look[0]) * 3, -1, 1), clamp((tp - this.look[1]) * 3, -1, 1)];
  }

  applyPose(dt, P) {
    const b = this.b;
    const setQ = (bone, x, y, z) => bone.quaternion.setFromEuler(_e.set(x, y, z, 'YXZ'));
    // trunk
    const br = Math.sin(this.t * 2.2) * 0.008 * (1 - this.wF.sleep);
    const purr = P.purr > 0.01 ? Math.sin(this.t * 150) * 0.0006 * P.purr : 0;
    b.hips.position.set(0, P.pelY + purr, P.pelZ);
    setQ(b.hips, P.pelPitch, P.pelYaw, P.pelRoll);
    setQ(b.spine, P.spFlex * 0.5 + br * 0.5, P.spBend * 0.5, 0);
    setQ(b.chest, P.spFlex * 0.5 + P.chestPitch - br, P.spBend * 0.5 + P.chestYaw, P.chestRoll);
    // head: stabilised against the trunk's pitch, turned toward the look target
    const accP = P.pelPitch + P.spFlex + P.chestPitch, accY = P.pelYaw + P.spBend + P.chestYaw;
    const ly = this.look[0], lp = this.look[1];
    const nL = P.neckPitch + lp * 0.35 - accP * P.stab * 0.45, nY = P.neckYaw + ly * 0.4 - accY * 0.3 * P.stab;
    setQ(b.neck, nL, nY, -P.chestRoll * 0.5);
    setQ(b.head, P.headPitch + lp - P.stab * (accP + nL), P.headYaw + ly * 0.6 - accY * 0.4 * P.stab, P.headRoll - P.pelRoll * 0.6);
    setQ(b.jaw, P.jaw, 0, 0);
    // ears: forward / flat, plus a quick twitch now and then
    for (let i = 0; i < 2; i++) {
      this.earT[i] -= dt;
      if (this.earT[i] < 0) { this.earT[i] = 2 + Math.random() * 7; this.ear[i] = 1; }
      this.ear[i] = Math.max(0, this.ear[i] - dt * 5);
      const tw = Math.sin(this.ear[i] * Math.PI) * 0.5, sd = i === 0 ? 1 : -1;
      setQ(i === 0 ? b.earL : b.earR, P.earX - tw * 0.3, sd * (P.earZ * 0.5 + tw), -sd * (P.earZ * 0.55 + tw * 0.4));
    }
    this.applyTail(dt, P);
    // legs (IK) once the trunk is placed; the shoulder blades slide with the front legs
    b.armL.position.z = this.rest.armL.z + clamp((P.flz - FRONT_TOE[2]) * 0.3, -0.022, 0.03);
    b.armR.position.z = this.rest.armR.z + clamp((P.frz - FRONT_TOE[2]) * 0.3, -0.022, 0.03);
    this.need[0] = this.need[1] = -1;
    this.root.updateMatrixWorld(true);
    this.ws = this.root.getWorldScale(_v).x; // the IK works in world units
    this.frontLeg('L', P.flx, P.fly, P.flz, P.flp);
    this.frontLeg('R', P.frx, P.fry, P.frz, P.frp);
    this.hindLeg('L', P.hlx, P.hly, P.hlz, P.hlm);
    this.hindLeg('R', P.hrx, P.hry, P.hrz, P.hrm);
  }

  applyTail(dt, P) {
    // springy chain: targets from the pose (base lift, curl, wrap, hook at the tip, swish wave), driven by turning
    this.flickT -= dt;
    if (this.flickT < 0) { this.flickT = 3 + Math.random() * 6; this.flick = 1; }
    this.flick = Math.max(0, this.flick - dt * 3.5);
    const fl = Math.sin(this.flick * Math.PI) * 0.6;
    const beatSwish = P.tailFreq < 0;
    for (let i = 0; i < TAIL_N; i++) {
      const s = this.tail[i], u = i / (TAIL_N - 1);
      const tp = (i === 0 ? P.tailPitch : P.tailCurl) + (i >= TAIL_N - 3 ? P.tailHook : 0);
      const ph = beatSwish ? Math.PI * P.tailBeat - i * 0.45 : this.t * TAU * Math.max(0.2, P.tailFreq) - i * 0.6;
      const ty = (i > 0 ? P.tailYaw : P.tailYaw * 0.5) + Math.sin(ph) * P.tailSwish * (0.4 + u) + (i >= TAIL_N - 3 ? fl * Math.sin(this.t * 13) : 0);
      const k = 160 - i * 14, d = 2 * Math.sqrt(k) * 0.55;
      s.vp += ((tp - s.p) * k - s.vp * d) * dt; s.vy += ((ty - s.y) * k - s.vy * d - this.yawRate * 6 * (0.3 + u)) * dt;
      s.p += s.vp * dt; s.y += s.vy * dt;
      if (Math.abs(s.p - tp) > 1.2) { s.p = tp; s.vp = 0; }
      this.b['tail' + i].quaternion.setFromEuler(_e.set(s.p, s.y, 0, 'YXZ'));
    }
  }

  /** How far (rig units, up) joint `a` sits above where a leg of length `len` can still reach `t` (planted paws). */
  reach(i, a, t, len) {
    const R = this.root;
    const A = R.worldToLocal(_v3.copy(a)), Tt = R.worldToLocal(_v4.copy(t));
    const lm = len * 0.985, h = Math.hypot(A.x - Tt.x, A.z - Tt.z);
    const top = Tt.y + Math.sqrt(Math.max(0, lm * lm - h * h));
    this.need[i] = Math.max(this.need[i], A.y - top);
  }

  // aim a bone (rest direction `rest`, local) along a world direction
  aim(bone, rest, worldDir) {
    bone.parent.getWorldQuaternion(_q).invert();
    _v5.copy(worldDir).applyQuaternion(_q).normalize();
    bone.quaternion.setFromUnitVectors(rest, _v5);
    bone.updateMatrixWorld(true);
  }

  /** Two-bone IK from the joint `a` (world) to `t` (world), bending toward `pole` (world dir). Returns the knee. */
  twoBone(a, t, l1, l2, pole, out) {
    const d = _v3.subVectors(t, a), l = clamp(d.length(), Math.abs(l1 - l2) + 1e-4, (l1 + l2) * 0.999);
    d.normalize();
    const ca = clamp((l1 * l1 + l * l - l2 * l2) / (2 * l1 * l), -1, 1), sa = Math.sqrt(1 - ca * ca);
    const pn = _v4.copy(pole).addScaledVector(d, -pole.dot(d)).normalize();
    t.copy(a).addScaledVector(d, l);
    return out.copy(a).addScaledVector(d, l1 * ca).addScaledVector(pn, l1 * sa);
  }

  frontLeg(s, x, y, z, pitch) {
    const b = this.b, arm = b['arm' + s], fore = b['fore' + s], paw = b['paw' + s];
    const R = this.root, sd = s === 'L' ? 1 : -1;
    // wrist = pad target minus the paw (rotated by its pitch), in root space
    const c = Math.cos(pitch), sn = Math.sin(pitch);
    const py = PAWV[1] * c - PAWV[2] * sn, pz = PAWV[1] * sn + PAWV[2] * c;
    const pad = R.localToWorld(_v.set(x, y, z));
    const wrist = R.localToWorld(_v2.set(x, y - py, z - pz));
    const sh = arm.getWorldPosition(new THREE.Vector3());
    if (y < 0.012) this.reach(0, sh, wrist, this.len.arm + this.len.fore);
    const pole = _v4.set(sd * 0.25, -0.1, -1).transformDirection(R.matrixWorld);
    const elbow = this.twoBone(sh, wrist, this.len.arm * this.ws, this.len.fore * this.ws, pole.clone(), new THREE.Vector3());
    this.aim(arm, this.dirs['arm' + s], elbow.clone().sub(sh));
    this.aim(fore, this.dirs['fore' + s], wrist.clone().sub(elbow));
    this.aim(paw, this.dirs['paw' + s], pad.sub(wrist));
  }

  hindLeg(s, x, y, z, meta) {
    const b = this.b, th = b['thigh' + s], sh = b['shin' + s], mt = b['meta' + s];
    const R = this.root, sd = s === 'L' ? 1 : -1;
    const toe = R.localToWorld(_v.set(x, y, z));
    const hock = R.localToWorld(_v2.set(x, y + Math.sin(meta) * LM, z - Math.cos(meta) * LM));
    const hip = th.getWorldPosition(new THREE.Vector3());
    if (y < 0.012) this.reach(1, hip, hock, this.len.thigh + this.len.shin);
    const pole = _v4.set(sd * 0.15, 0.1, 1).transformDirection(R.matrixWorld);
    const knee = this.twoBone(hip, hock, this.len.thigh * this.ws, this.len.shin * this.ws, pole.clone(), new THREE.Vector3());
    this.aim(th, this.dirs['thigh' + s], knee.clone().sub(hip));
    this.aim(sh, this.dirs['shin' + s], hock.clone().sub(knee));
    this.aim(mt, this.dirs['meta' + s], toe.sub(hock));
  }

  updateFace(dt, P) {
    // blinks; lids also follow the pose (sleepy, content)
    this.blinkT -= dt;
    let blink = 0;
    if (this.blinkT < 0) { const u = -this.blinkT / 0.18; blink = u < 0.4 ? u / 0.4 : u < 1 ? 1 - (u - 0.4) / 0.6 : 0; if (u >= 1) this.blinkT = 2.5 + Math.random() * 5; }
    const lid = clamp(Math.max(P.lid, blink), 0.001, 1);
    // pupils: slits in bright light, round in the dark / when excited or scared
    const want = clamp(0.12 + this.dark * 0.8 + P.pupil + (this.mood === 'scared' ? 0.35 : 0), 0.1, 1);
    this.pupilK = lerp(this.pupilK, want, 1 - Math.exp(-dt * 2.5));
    this.irisMat.emissiveIntensity = this.dark * 0.25;
    for (const e of this.eyes) {
      e.lid.scale.y = lid;
      e.pupil.scale.x = lerp(0.0007, 0.0047, this.pupilK);
      e.pupil.position.x = (this.eyeLead?.[0] || 0) * 0.0012 * e.sd;
      e.pupil.position.y = -(this.eyeLead?.[1] || 0) * 0.001;
      e.glint.visible = lid < 0.6;
    }
    // tongue: out and down while lapping / licking
    const tg = clamp(P.tongue, 0, 1);
    this.tongue.visible = tg > 0.02;
    this.tongue.position.set(this.tongueBase.x, this.tongueBase.y - tg * 0.004, this.tongueBase.z + tg * 0.012);
    this.tongue.rotation.x = tg * 0.6;
    this.tongue.scale.set(1, 1, 0.4 + tg * 0.8);
  }

  /** Posed bounds (for culling, raycasts, thumbnails and the first-person hands' grips). */
  updateBounds() {
    const R = this.root;
    R.updateWorldMatrix(true, true);
    _m.copy(this.mesh.matrixWorld).invert();
    _box.makeEmpty();
    for (const bn of this.bones) { bn.getWorldPosition(_v).applyMatrix4(_m); _box.expandByPoint(_v); }
    // the toes and the ear tips / nose reach past their joints
    for (const s of ['L', 'R']) { this.b['paw' + s].localToWorld(_v.set(0, -0.022, 0.017)).applyMatrix4(_m); _box.expandByPoint(_v); this.b['meta' + s].localToWorld(_v.set(0, -0.043, 0.04)).applyMatrix4(_m); _box.expandByPoint(_v); }
    this.b.head.localToWorld(_v.set(0, 0.06, 0.07)).applyMatrix4(_m); _box.expandByPoint(_v);
    this.b.head.localToWorld(_v.set(0, -0.02, 0.07)).applyMatrix4(_m); _box.expandByPoint(_v);
    _box.expandByScalar(0.03);
    if (!isFinite(_box.min.x + _box.max.y)) _box.set(_v.set(-0.25, 0, -0.45), _v2.set(0.25, 0.4, 0.35)); // never cull her by accident
    this.mesh.boundingBox.copy(_box); this.geo.boundingBox.copy(_box);
    _box.getBoundingSphere(this.mesh.boundingSphere);
  }
}
