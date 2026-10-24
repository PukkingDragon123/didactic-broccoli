// A low-poly human: one rigidly skinned mesh + one painted atlas (1 draw call) and fluid procedural
// animation: speed-driven walk with IK-planted feet, idle breathing / weight shifts / glances, look-at,
// blended gestures (arm IK), painted expressions with blinks, eye darts and talking mouths, and spring-driven
// ponytails, bags and skirts.
import * as THREE from 'three';
import { BONES, BONE_INDEX, buildPlan } from './body.js';
import { buildMesh, ATLAS } from './mesh.js';
import { Pix } from '../gfx/pix.js';
import { FacePainter, exprParams, EXPRESSIONS } from './face.js';
import { paintAtlas, paintAtlasJob, paintAtlasFlat } from './paint.js';
import { GESTURES, FIDGETS, gesturePose } from './gestures.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const ALIAS = { wow: 'surprised', love: 'happy', annoyed: 'angry', mad: 'angry', joy: 'happy', shock: 'surprised', tired: 'sleepy' };
// gait styles: step length, bounce, arm swing, knee bend, forward lean, hunch, arm spread
const STYLE = {
  normal: { step: 1, bounce: 1, swing: 1, knee: 0.01, lean: 0.03, hunch: 0, spread: 0.07 },
  brisk: { step: 1.06, bounce: 0.9, swing: 0.9, knee: 0.008, lean: 0.05, hunch: 0, spread: 0.06 },
  dainty: { step: 0.82, bounce: 0.8, swing: 0.6, knee: 0.006, lean: 0.02, hunch: 0, spread: 0.045 },
  young: { step: 1.02, bounce: 1.2, swing: 1.1, knee: 0.008, lean: 0.02, hunch: 0, spread: 0.07 },
  kid: { step: 0.95, bounce: 2.2, swing: 1.5, knee: 0.012, lean: 0.01, hunch: 0, spread: 0.1 },
  elder: { step: 0.7, bounce: 0.5, swing: 0.45, knee: 0.03, lean: 0.06, hunch: 0.2, spread: 0.1 },
  slouch: { step: 0.92, bounce: 0.8, swing: 0.6, knee: 0.014, lean: 0.03, hunch: 0.1, spread: 0.09 },
  heavy: { step: 1, bounce: 0.9, swing: 0.85, knee: 0.016, lean: 0.03, hunch: 0.03, spread: 0.12 },
};

// body language per expression: head pitch, chest pitch, bounce
const MOOD = { neutral: [0, 0, 0], smile: [0, 0, 0], sad: [0.16, 0.06, 0], sleepy: [0.12, 0.04, 0], surprised: [-0.1, -0.05, 0], angry: [0.06, 0.03, 0], happy: [-0.06, -0.03, 1] };

// time-sliced texture painting shared by all humans: ~3 ms of painting per frame in total
const JOBS = new Set();
let pumpAt = -1;
function pump(budget = 3) {
  const now = performance.now();
  if (now - pumpAt < 6) return; // already pumped this frame
  pumpAt = now;
  for (const h of JOBS) {
    while (performance.now() - now < budget) if (h.stepPaint()) break;
    if (performance.now() - now >= budget) break;
  }
}

// scratch objects (no per-frame allocation)
const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _m = new THREE.Matrix4();
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _v4 = new THREE.Vector3(), _v5 = new THREE.Vector3();
const _bx = new THREE.Vector3(), _by = new THREE.Vector3(), _bz = new THREE.Vector3();

export class Human {
  constructor(spec, opts = {}) {
    this.spec = spec;
    this.preset = spec.id;
    this.height = spec.H;
    const plan = buildPlan(spec);
    this.P = plan.P; this.J = plan.J;
    const m = buildMesh(plan);
    this.tris = m.tris;
    this.pix = new Pix(ATLAS, ATLAS, spec.seed || 1);
    this.face = new FacePainter(spec, this.P, m.block, this.pix);
    this.E = exprParams('neutral');
    this.tex = this.pix.texture();
    if (opts.lazy === false) { paintAtlas(spec, this.P, m.faces, this.pix); this.face.paint(this.E); this.pix.flush(); }
    else {
      // instant flat-coloured placeholder; the detailed atlas is painted over the next frames (time-sliced)
      paintAtlasFlat(spec, this.P, m.faces, this.pix);
      this.face.paintFlat();
      this.pix.flush();
      this.job = (function* (h) { yield* paintAtlasJob(spec, h.P, m.faces, h.pix); yield* h.face.bakeJob(); })(this);
      JOBS.add(this);
    }
    this.mat = new THREE.MeshStandardMaterial({ map: this.tex, roughness: 0.85, metalness: 0, alphaTest: 0.5 });
    // skeleton (rest pose = the modelled pose; all bones axis-aligned)
    this.bones = [];
    for (const [name, parent] of BONES) {
      const bn = new THREE.Bone();
      bn.name = name;
      const p = this.J[name], pp = parent ? this.J[parent] : [0, 0, 0];
      bn.position.set(p[0] - pp[0], p[1] - pp[1], p[2] - pp[2]);
      if (parent) this.bones[BONE_INDEX[parent]].add(bn);
      this.bones.push(bn);
    }
    const b = this.b = Object.fromEntries(this.bones.map((bn) => [bn.name, bn]));
    this.mesh = new THREE.SkinnedMesh(m.geometry, this.mat);
    this.mesh.add(this.bones[0]);
    this.mesh.updateMatrixWorld(true);
    this.mesh.bind(new THREE.Skeleton(this.bones));
    this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    this.mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, spec.H * 0.5, 0), spec.H * 0.8);
    this.mesh.userData.human = this;
    this.root = new THREE.Group();
    this.root.name = 'human:' + spec.id;
    this.root.add(this.mesh);
    this.rest = Object.fromEntries(this.bones.map((bn) => [bn.name, bn.position.clone()]));
    b.prop.scale.setScalar(0); b.box.scale.setScalar(0);
    this.boxPos = [0, 0.07 * spec.H, this.P.chestZ + 0.2];
    this.hasCam = spec.acc.some((a) => a.kind === 'camera');
    this.initAnim();
  }

  // ------------------------------------------------------------------ public API
  /** Show an expression ('neutral', 'smile', 'happy', 'surprised', 'sad', 'angry', 'sleepy'; aliases wow/love/annoyed). hold 0 = until changed. */
  setExpression(name, hold = 0) {
    if (name === 'blink') { this.blinkT = 0; return; }
    if (name === 'talk') { this.talkHold = Math.max(this.talkHold, hold || 1.5); return; }
    name = ALIAS[name] || name;
    if (!EXPRESSIONS[name]) name = 'neutral';
    if (name !== this.expr) { this.exprPrev = this.expr; this.expr = name; this.exprK = 0; }
    this.exprHold = hold;
  }
  /** Start a gesture (see GESTURES). opts: { dur, hold, at: Vector3 (for 'point') }. */
  gesture(name, opts = {}) {
    const G = GESTURES[name];
    if (!G) return;
    for (const g of this.gestures) g.out = true;
    const dur = opts.hold ? Infinity : opts.dur ?? G.dur;
    this.gestures.push({ name, t: 0, w: 0, v: 0, dur, out: false, opts, pose: newPose() });
    if (G.expr && this.expr === 'neutral') this.setExpression(G.expr, Math.min(dur, 2.5));
  }
  clearGesture() { for (const g of this.gestures) g.out = true; }
  get currentGesture() { const g = this.gestures.find((x) => !x.out && x.name[0] !== '_'); return g ? g.name : null; }
  /** World position ~0.25 m above the head (speech bubbles). */
  headTop(out = new THREE.Vector3()) {
    this.b.head.updateWorldMatrix(true, false);
    out.set(0, this.P.crown - this.J.head[1] + 0.05, this.P.hcz - this.J.head[2]).applyMatrix4(this.b.head.matrixWorld);
    out.y += 0.22;
    return out;
  }
  /** Advance the detailed paint job a little; returns true when finished. */
  stepPaint() {
    if (!this.job) return true;
    if (!this.job.next().done) return false;
    this.job = null;
    JOBS.delete(this);
    this.face.paint(this.E);
    this.pix.flush();
    this.tex.needsUpdate = true;
    this.faceExprKey = null;
    return true;
  }
  /** Finish painting the detailed atlas now (e.g. for a close-up right after creation). */
  finishPaint() { while (this.job) this.stepPaint(); return this; }

  dispose() {
    JOBS.delete(this); this.job = null;
    this.root.removeFromParent();
    this.mesh.geometry.dispose(); this.tex.dispose(); this.mat.dispose();
    this.mesh.skeleton.dispose();
  }

  // ------------------------------------------------------------------ animation
  initAnim() {
    const P = this.P, sp = this.spec;
    this.style = { ...STYLE.normal, ...(STYLE[sp.walk?.style] || {}) };
    if (sp.walk?.hunch) this.style.hunch += sp.walk.hunch * 0.15;
    this.t = Math.random() * 100;
    this.phase = 0.05;
    this.spd = 0; this.walkW = 0; this.walkV = 0;
    this.thighLen = P.hipY - P.kneeY; this.shinLen = P.kneeY - P.ankleY;
    this.hipOff = this.J.hips[1] - P.hipY; // hips bone above the hip joints
    this.hipsY = this.J.hips[1] - this.style.knee * P.H; this.hipsYV = 0;
    this.prevYaw = null; this.yawRate = 0;
    this.prevPos = new THREE.Vector3(); this.vel = new THREE.Vector3(); this.acc = new THREE.Vector3(); this.hasPrev = false;
    // idle
    this.shiftT = 2 + Math.random() * 4; this.shift = 0; this.shiftTarget = Math.random() < 0.5 ? -0.6 : 0.6; this.shiftV = 0;
    this.glanceT = 1 + Math.random() * 3; this.glance = [0, 0]; this.glanceTarget = [0, 0];
    this.fidgetT = 5 + Math.random() * 12;
    // look
    this.look = [0, 0]; this.lookV = [0, 0]; this.eyes = [0, 0];
    this.saccT = 1; this.sacc = [0, 0];
    // face
    this.expr = 'neutral'; this.exprPrev = 'neutral'; this.exprK = 1; this.exprHold = 0;
    this.blinkT = 1 + Math.random() * 3;
    this.talkHold = 0; this.mouthT = 0; this.mouth = [0, 0, 1]; this.talkAmt = 0;
    this.Ea = exprParams('neutral'); this.Eb = exprParams('neutral'); this.Ef = exprParams('neutral');
    this.gestures = [];
    this.mood = [0, 0, 0]; // head pitch, chest pitch, bounce (expression body language)
    // secondary motion
    this.tails = [{ x: 0, z: 0, vx: 0, vz: 0 }, { x: 0, z: 0, vx: 0, vz: 0 }];
    this.bagS = { x: 0, z: 0, vx: 0, vz: 0 };
    this.skirtS = { x: 0, s: 1, v: 0 };
    this.feet = [{ x: 0, y: 0, z: 0, p: 0 }, { x: 0, y: 0, z: 0, p: 0 }];
    this.thighFwd = [0, 0];
  }

  update(dt, { speed = 0, lookAt = null, talking = false } = {}) {
    dt = Math.min(dt, 0.1);
    if (dt <= 0) return;
    if (JOBS.size) pump();
    this.t += dt;
    const P = this.P, b = this.b, st = this.style, H = P.H, R = this.rest;
    // --- root motion tracking (turn rate, acceleration for the dangly bits)
    const yaw = this.root.rotation.y;
    if (this.prevYaw === null) this.prevYaw = yaw;
    const yr = wrap(yaw - this.prevYaw) / dt; this.prevYaw = yaw;
    this.yawRate = lerp(this.yawRate, yr, 1 - Math.exp(-dt * 8));
    const pos = this.root.position;
    if (this.hasPrev) {
      _v.subVectors(pos, this.prevPos).divideScalar(dt);
      this.acc.subVectors(_v, this.vel).divideScalar(dt).clampLength(0, 30);
      this.vel.lerp(_v, 1 - Math.exp(-dt * 20));
    }
    this.prevPos.copy(pos); this.hasPrev = true;
    // --- locomotion: the gait phase advances with the distance travelled
    const turnStep = Math.min(0.32, Math.abs(this.yawRate) * 0.14) * (1 - smooth(speed / 0.4));
    const spd = Math.max(0, speed) + turnStep;
    this.spd = lerp(this.spd, spd, 1 - Math.exp(-dt * 9));
    const wT = smooth((this.spd - 0.04) / 0.3);
    this.walkV += ((wT - this.walkW) * 90 - this.walkV * 19) * dt; this.walkW = clamp(this.walkW + this.walkV * dt, 0, 1);
    const W = this.walkW;
    const legLen = this.thighLen + this.shinLen;
    const inPlace = turnStep > 0.05 && speed < 0.2;
    const stepLen = clamp(legLen * (0.3 + 0.42 * this.spd), 0.16, legLen * 1.15) * st.step * (inPlace ? 0.3 : 1);
    if (this.spd > 0.01) this.phase = (this.phase + this.spd * dt / (2 * stepLen * (inPlace ? 3.3 : 1))) % 1;
    else if (W < 0.02) this.phase = 0.05; // ready to step off with the left foot
    const SS = 0.6, half = SS * stepLen;
    const fl = P.footL, ah = P.ankleY, heel = 0.22 * fl, ball = 0.56 * fl;
    const liftH = (0.04 + 0.03 * this.spd) * (H / 1.7) * (st.bounce > 1.5 ? 1.3 : 1) * (st.hunch > 0.15 ? 0.7 : 1);
    // idle weight shift (pelvis moves over one leg; the feet stay planted thanks to the IK)
    this.shiftT -= dt;
    if (this.shiftT < 0) { this.shiftT = 3 + Math.random() * 6; this.shiftTarget = Math.random() < 0.25 ? 0 : (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 0.4); }
    this.shiftV += ((this.shiftTarget - this.shift) * 5 - this.shiftV * 4.2) * dt; this.shift += this.shiftV * dt;
    const idleW = 1 - W, sh = this.shift * idleW;
    for (let s = 0; s < 2; s++) {
      const sd = s === 0 ? 1 : -1;
      const q = (this.phase + (s === 0 ? 0 : 0.5)) % 1;
      let fz, pitch = 0, lift = 0;
      if (q < SS) {
        const u = q / SS;
        fz = half * (1 - 2 * u);
        pitch = u < 0.14 ? -0.24 * (1 - smooth(u / 0.14)) : u > 0.6 ? 0.6 * smooth((u - 0.6) / 0.4) : 0;
      } else {
        const u = (q - SS) / (1 - SS);
        fz = lerp(-half, half, smooth(u));
        lift = liftH * Math.sin(Math.PI * Math.pow(u, 0.8));
        pitch = u < 0.4 ? lerp(0.6, 0.12, smooth(u / 0.4)) : lerp(0.12, -0.24, smooth((u - 0.4) / 0.6));
      }
      // ankle from the contact pivot (heel while toe-up, ball of the foot while heel-up): no foot sliding
      let ay = ah, az = fz;
      const cp = Math.cos(pitch), sp = Math.sin(pitch);
      if (pitch < 0) { ay = ah * cp - heel * sp; az = fz - heel + heel * cp + ah * sp; }
      else if (pitch > 0) { ay = ah * cp + ball * sp; az = fz + ball - ball * cp + ah * sp; }
      ay += lift;
      // idle stance: feet slightly apart and turned out, one a touch forward
      const ix = sd * P.hipX * 1.05, iz = (sd > 0 ? 0.03 : -0.012) * (H / 1.7);
      const F = this.feet[s];
      F.x = lerp(ix, sd * P.hipX * 0.9, W); F.y = lerp(ah, ay, W); F.z = lerp(iz, az, W); F.p = pitch * W;
    }
    // pelvis: sway over the stance leg, rotate with the stride, roll with the swing leg
    const sway = Math.cos(Math.PI * 2 * (this.phase - 0.3)) * W;
    const fwdL = (this.feet[0].z - this.feet[1].z) / Math.max(0.05, 2 * half);
    const hipsYaw = -0.12 * fwdL * W * Math.min(1, 0.3 + this.spd);
    const hipsRoll = 0.035 * sway + sh * 0.04;
    const hipsX = (0.014 * sway + sh * 0.024) * (H / 1.7);
    const hunch = st.hunch;
    // hip height: the highest that keeps both legs reachable (gives the natural bob) + a style bounce
    let hy = this.J.hips[1] - st.knee * H - hunch * 0.03 * H;
    const Lmax = legLen * 0.992;
    for (let s = 0; s < 2; s++) {
      const F = this.feet[s], sd = s === 0 ? 1 : -1;
      const dx = F.x - (hipsX + sd * P.hipX), dz = F.z;
      hy = Math.min(hy, F.y + Math.sqrt(Math.max(0, Lmax * Lmax - dx * dx - dz * dz)) + this.hipOff);
    }
    if (st.bounce > 1.5) hy += W * 0.01 * H * Math.abs(Math.sin(this.phase * Math.PI * 2)) * (st.bounce - 1);
    hy -= Math.abs(sh) * 0.006 * H;
    this.hipsYV += ((hy - this.hipsY) * 1200 - this.hipsYV * 60) * dt; this.hipsY += this.hipsYV * dt;
    if (Math.abs(this.hipsY - hy) > 0.04) { this.hipsY = hy; this.hipsYV = 0; }
    // --- breathing, idle glances, turning
    const breath = Math.sin(this.t * 1.6) * (1 - W * 0.5);
    this.glanceT -= dt;
    if (this.glanceT < 0) {
      this.glanceT = 1.5 + Math.random() * 4;
      const away = Math.random() < 0.5 * idleW + 0.12;
      this.glanceTarget[0] = away ? (Math.random() * 2 - 1) * (0.7 - W * 0.45) : 0;
      this.glanceTarget[1] = away ? (Math.random() * 2 - 1) * 0.14 - 0.03 : 0;
    }
    this.glance[0] = lerp(this.glance[0], this.glanceTarget[0], 1 - Math.exp(-dt * 2.5));
    this.glance[1] = lerp(this.glance[1], this.glanceTarget[1], 1 - Math.exp(-dt * 2.5));
    // --- look-at (yaw / pitch relative to the body)
    let ly = this.glance[0] + clamp(this.yawRate * 0.2, -0.55, 0.55), lp = this.glance[1];
    if (lookAt) {
      this.root.updateWorldMatrix(true, false);
      _v.copy(lookAt);
      this.root.worldToLocal(_v);
      const yaw0 = Math.atan2(_v.x, _v.z), pitch0 = Math.atan2(_v.y - P.eyeY, Math.hypot(_v.x, _v.z));
      if (Math.abs(yaw0) < 2.1) { ly = clamp(yaw0, -1.3, 1.3); lp = clamp(pitch0, -0.6, 0.45); }
    }
    for (let i = 0; i < 2; i++) { this.lookV[i] += (((i ? lp : ly) - this.look[i]) * 42 - this.lookV[i] * 12) * dt; this.look[i] += this.lookV[i] * dt; }
    const lookYaw = this.look[0], lookPitch = this.look[1];
    // --- idle fidgets: only while standing around with nothing else to do
    const busy = this.gestures.some((g) => !g.out && g.name[0] !== '_');
    if (this.spd < 0.05 && !busy && !talking && !lookAt) {
      this.fidgetT -= dt;
      if (this.fidgetT < 0) {
        this.fidgetT = 7 + Math.random() * 14;
        const f = FIDGETS[Math.floor(Math.random() * FIDGETS.length)];
        if (!(f === '_watch' && this.holdL)) { for (const g of this.gestures) g.out = true; this.gestures.push({ name: f, t: 0, w: 0, v: 0, dur: GESTURES[f].dur, out: false, opts: {}, pose: newPose() }); }
      }
    } else if (this.spd > 0.12 || busy) for (const g of this.gestures) if (g.name[0] === '_') g.out = true;
    // --- gestures (spring weights; finished ones fade out)
    let gW = 0;
    for (let i = this.gestures.length - 1; i >= 0; i--) {
      const g = this.gestures[i];
      g.t += dt;
      if (g.t > g.dur) g.out = true;
      g.v += (((g.out ? 0 : 1) - g.w) * 110 - g.v * 21) * dt; g.w = clamp(g.w + g.v * dt, 0, 1);
      if (g.out && g.w < 0.01 && g.v <= 0.05) { this.gestures.splice(i, 1); continue; }
      gesturePose(g.name, g.t, this, g.pose, g.opts);
      gW = Math.max(gW, g.w);
    }
    // --- expression timing + body language
    if (this.exprHold > 0) { this.exprHold -= dt; if (this.exprHold <= 0) { this.exprPrev = this.expr; this.expr = 'neutral'; this.exprK = 0; } }
    this.exprK = Math.min(1, this.exprK + dt / 0.16);
    const ex = this.expr;
    const mt = MOOD[ex] || MOOD.neutral, mk = 1 - Math.exp(-dt * 6);
    for (let i = 0; i < 3; i++) this.mood[i] = lerp(this.mood[i], mt[i] + (ex === 'sleepy' && i === 0 ? Math.sin(this.t * 0.8) * 0.05 : 0), mk);
    const talkNow = !!talking || this.talkHold > 0;
    this.talkHold = Math.max(0, this.talkHold - dt);
    this.talkAmt = lerp(this.talkAmt, talkNow ? 1 : 0, 1 - Math.exp(-dt * 8));
    // ================================================================ pose the bones
    b.hips.position.set(R.hips.x + hipsX, this.hipsY + this.mood[2] * Math.abs(Math.sin(this.t * 9)) * 0.008 * H, R.hips.z - hunch * 0.02 * H);
    const hipsPitch = 0.03 * this.spd * W - hunch * 0.1;
    setQ(b.hips, hipsPitch, hipsYaw, hipsRoll);
    const lean = st.lean * Math.min(1.5, this.spd) * W;
    const talkNod = this.talkAmt * Math.sin(this.t * 5.3) * 0.025;
    // big turns are shared with the chest
    const chestYawN = lookYaw * 0.08 + (lookYaw > 0.8 ? lookYaw - 0.8 : lookYaw < -0.8 ? lookYaw + 0.8 : 0) * 0.7;
    setQ(b.spine, 0.02 + lean + hunch * 0.5 + breath * 0.008 + 0.0, -hipsYaw * 0.4 + lookYaw * 0.04, -hipsRoll * 0.55);
    setQ(b.chest, 0.01 + hunch * 0.55 + this.mood[1] - breath * 0.012, -hipsYaw * 1.15 + chestYawN, -hipsRoll * 0.4 - this.yawRate * this.spd * 0.03);
    // head stabilised against the torso, then turned toward the look target
    const torsoYaw = hipsYaw * (1 - 0.4 - 1.15) + lookYaw * 0.04 + chestYawN;
    const headYaw = clamp(lookYaw - torsoYaw, -1.0, 1.0);
    const torsoPitch = hipsPitch + 0.03 + lean + hunch * 1.05 + this.mood[1];
    const bob = W * Math.sin(this.phase * Math.PI * 4 + 0.6) * 0.015 * st.bounce;
    setQ(b.neck, -torsoPitch * 0.4 + this.mood[0] * 0.4, headYaw * 0.35, hipsRoll * 0.3);
    setQ(b.head, -torsoPitch * 0.5 - lookPitch * 0.85 + this.mood[0] * 0.6 + bob + talkNod, headYaw * 0.65, hipsRoll * 0.3 + Math.sin(this.t * 0.37) * 0.02 * idleW);
    this.eyeLead = clamp((ly - lookYaw) * 4 + (lookYaw - torsoYaw - headYaw) * 3, -2.2, 2.2);
    this.eyeLeadY = clamp((lp - lookPitch) * 4 - lookPitch * 1.5, -1, 1.5);
    // --- legs: IK to the planted feet
    for (let s = 0; s < 2; s++) this.legIK(s, hipsPitch);
    // --- arms: swing with the opposite leg (base pose), then gestures blend over
    for (let s = 0; s < 2; s++) {
      const sd = s === 0 ? 1 : -1, side = s === 0 ? 'L' : 'R';
      const otherFwd = (this.feet[1 - s].z - this.feet[s].z) / Math.max(0.05, 2 * half);
      let swing = st.swing * (0.26 + 0.24 * Math.min(1.6, this.spd)) * W;
      const hold = side === 'L' ? this.holdL : null;
      if (hold === 'case') swing *= 0.5;
      const fw = otherFwd * swing;
      const abd = st.spread + (hold === 'case' ? 0.1 : 0) + breath * 0.008 + (P.belly ? P.belly * 2 : 0) - sh * sd * 0.03;
      const elbow = 0.14 + hunch * 0.5 + Math.max(0, fw) * 0.85 + Math.max(0, -fw) * 0.1 + (hold === 'case' ? -0.1 : 0);
      setQ(b['arm' + side], -(fw + 0.03 + hunch * 0.3), sd * -0.1 * (1 - W * 0.5), sd * abd, 'ZXY');
      b['arm' + side].position.copy(R['arm' + side]); b['arm' + side].position.y += breath * 0.0015 * H;
      setQ(b['fore' + side], -Math.max(0.02, elbow), sd * 0.3, 0);
      setQ(b['hand' + side], 0.08, sd * 0.12, sd * 0.06);
    }
    // gestures (slerp toward the gesture pose)
    b.prop.scale.setScalar(0); b.box.scale.setScalar(0);
    let lift = 0;
    for (const g of this.gestures) {
      const w = smooth(g.w), G = g.pose;
      if (w <= 0.001) continue;
      if (G.L && (!this.holdL || g.name === 'carry')) this.armIK('L', G.L, w);
      if (G.R) this.armIK('R', G.R, w);
      addQ(b.spine, G.spine, w); addQ(b.chest, G.chest, w); addQ(b.neck, G.neck, w); addQ(b.head, G.head, w);
      b.hips.position.y += G.hips[1] * w; b.hips.position.z += G.hips[2] * w;
      lift += G.lift * w;
      if (G.prop && w > 0.55) { b.prop.scale.setScalar(1); this.propAt = G.prop; }
      if (G.box && w > 0.25) b.box.scale.setScalar(1);
      if (G.eyes) { this.eyes[0] = lerp(this.eyes[0], G.eyes[0], w); this.eyes[1] = lerp(this.eyes[1], G.eyes[1], w); }
    }
    if (lift) { b.armL.position.y += lift; b.armR.position.y += lift; }
    if (b.box.scale.x) { b.box.position.set(this.boxPos[0], this.boxPos[1], this.boxPos[2]); b.box.quaternion.identity(); }
    if (b.prop.scale.x) this.placeProp();
    // the camera on the neck strap is the one in the hands while photographing
    if (this.hasCam) b.bag.scale.setScalar(b.prop.scale.x ? 0 : 1);
    // --- secondary motion: tails, bag, skirt
    this.secondary(dt);
    // --- face
    this.updateFace(dt, talkNow, headYaw, lookYaw, lookPitch, gW);
  }

  /** Put the phone / camera at a chest-space point (upright, screen toward the face) though it hangs off the right hand. */
  placeProp() {
    const b = this.b, p = this.propAt;
    b.hips.updateMatrixWorld(true);
    // chest-space target -> hand-local transform
    _m.copy(b.handR.matrixWorld).invert().multiply(b.chest.matrixWorld);
    _v.set(p[0], p[1], p[2]).applyMatrix4(_m);
    _q.setFromRotationMatrix(_m);
    b.prop.position.copy(_v); b.prop.quaternion.copy(_q);
    b.prop.updateMatrixWorld(true);
  }

  get holdL() {
    if (this._holdL === undefined) this._holdL = this.spec.acc.some((a) => ['briefcase', 'handbag', 'ecobag'].includes(a.kind)) ? 'case' : this.spec.acc.some((a) => a.kind === 'cane') ? 'cane' : null;
    return this._holdL;
  }

  /** Two-bone leg IK (in the pelvis frame) + ankle pitch so the foot keeps its planned angle. */
  legIK(s, hipsPitch) {
    const b = this.b, side = s === 0 ? 'L' : 'R', sd = s === 0 ? 1 : -1;
    const F = this.feet[s], hips = b.hips;
    _v.copy(this.rest['thigh' + side]).applyQuaternion(hips.quaternion).add(hips.position); // hip joint
    _v2.set(F.x, F.y, F.z).sub(_v);
    _q.copy(hips.quaternion).invert();
    _v2.applyQuaternion(_q); // hip -> ankle in the pelvis frame
    const a = this.thighLen, c = this.shinLen;
    const l = clamp(_v2.length(), (a + c) * 0.35, (a + c) * 0.9995);
    const abd = Math.atan2(_v2.x, -_v2.y);
    const fwd = Math.atan2(_v2.z, Math.hypot(_v2.y, _v2.x));
    const cosA = clamp((a * a + l * l - c * c) / (2 * a * l), -1, 1);
    const cosK = clamp((a * a + c * c - l * l) / (2 * a * c), -1, 1);
    const thighFwd = fwd + Math.acos(cosA), knee = Math.PI - Math.acos(cosK);
    setQ(b['thigh' + side], -thighFwd, sd * 0.03, abd, 'ZXY');
    setQ(b['shin' + side], knee, 0, 0);
    setQ(b['foot' + side], F.p + thighFwd - knee - hipsPitch, sd * 0.1, -abd * 0.6);
    this.thighFwd[s] = thighFwd;
  }

  /** Two-bone arm IK in chest space. A: { t: wrist target, p: elbow pole, hand: euler }, w: blend weight. */
  armIK(side, A, w) {
    const b = this.b, P = this.P;
    const up = b['arm' + side], fore = b['fore' + side], hand = b['hand' + side];
    const a = P.shoulderY - P.elbowY, c = P.elbowY - P.wristY;
    _v.set(A.t[0], A.t[1], A.t[2]).sub(up.position); // shoulder -> wrist
    const dn = _v2.copy(_v).normalize();
    const l = clamp(_v.length(), (a + c) * 0.25, (a + c) * 0.999);
    const cosA = clamp((a * a + l * l - c * c) / (2 * a * l), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
    const pn = _v3.set(A.p[0], A.p[1], A.p[2]);
    pn.addScaledVector(dn, -pn.dot(dn)).normalize();
    const u1 = _v4.copy(dn).multiplyScalar(cosA).addScaledVector(pn, sinA).normalize(); // upper arm direction
    const u2 = _v.copy(dn).multiplyScalar(l).sub(_v5.copy(u1).multiplyScalar(a)).normalize(); // forearm direction
    const fwd = _bz.copy(u2).addScaledVector(u1, -u2.dot(u1));
    if (fwd.lengthSq() < 1e-6) fwd.copy(pn).negate(); else fwd.normalize();
    _by.copy(u1).negate(); _bx.crossVectors(_by, fwd);
    _m.makeBasis(_bx, _by, fwd);
    _q.setFromRotationMatrix(_m);
    up.quaternion.slerp(_q, w);
    _q2.setFromEuler(_e.set(-Math.acos(clamp(u1.dot(u2), -1, 1)), 0, 0, 'YXZ'));
    fore.quaternion.slerp(_q2, w);
    _q2.setFromEuler(_e.set(A.hand[0], A.hand[1], A.hand[2], 'YXZ'));
    hand.quaternion.slerp(_q2, w);
  }

  secondary(dt) {
    const b = this.b;
    // body-frame acceleration of the root + gait bounce drive damped springs
    const yaw = this.root.rotation.y, c = Math.cos(yaw), s = Math.sin(yaw);
    const ax = this.acc.x * c - this.acc.z * s, az = this.acc.x * s + this.acc.z * c;
    const W = this.walkW, bounce = W * Math.sin(this.phase * Math.PI * 4) * (0.5 + this.spd);
    const sway = W * Math.cos(Math.PI * 2 * (this.phase - 0.3)) * this.spd;
    const spring = (S, fx, fz, k, d) => {
      S.vx += (-S.x * k - S.vx * d + fx) * dt; S.vz += (-S.z * k - S.vz * d + fz) * dt;
      S.x = clamp(S.x + S.vx * dt, -0.9, 0.9); S.z = clamp(S.z + S.vz * dt, -0.7, 0.7);
    };
    const turn = this.yawRate;
    for (let i = 0; i < 2; i++) {
      const T = this.tails[i];
      spring(T, az * 0.9 + bounce * 2.5, -ax * 0.8 + sway * 5 + turn * 1.5, 40, 5);
      setQ(i === 0 ? b.tailL : b.tailR, T.x * 0.6 + W * this.spd * 0.18, 0, T.z * 0.6);
    }
    spring(this.bagS, az * 0.6 + bounce * 1.6, -ax * 0.6 + sway * 3 + turn, 30, 4.5);
    setQ(b.bag, this.bagS.x * 0.3, 0, this.bagS.z * 0.3);
    // skirt follows the thighs and widens when the legs spread
    const tl = this.thighFwd[0], tr = this.thighFwd[1];
    const S = this.skirtS;
    S.v += (((tl + tr) * 0.25 - S.x) * 120 - S.v * 16) * dt; S.x += S.v * dt;
    S.s = lerp(S.s, 1 + Math.abs(tl - tr) * 0.7, 1 - Math.exp(-dt * 14));
    setQ(b.skirt, -S.x, 0, 0);
    b.skirt.scale.set(1 + Math.abs(tl - tr) * 0.08, 1, S.s);
  }

  updateFace(dt, talking, headYaw, lookYaw, lookPitch, gW) {
    const f = this.face;
    // blink: ~0.16 s, every 2-6.5 s (sometimes a double blink)
    this.blinkT -= dt;
    let blink = 0;
    if (this.blinkT < 0) {
      const u = -this.blinkT / 0.16;
      blink = u < 0.4 ? u / 0.4 : u < 1 ? 1 - (u - 0.4) / 0.6 : 0;
      if (u >= 1) this.blinkT = Math.random() < 0.15 ? 0.22 : 2 + Math.random() * 4.5;
    }
    // eyes lead the head (the part of the look the head hasn't covered yet) + small saccades
    this.saccT -= dt;
    if (this.saccT < 0) { this.saccT = 0.7 + Math.random() * 2.4; this.sacc[0] = Math.random() < 0.55 ? 0 : Math.random() < 0.5 ? -1 : 1; this.sacc[1] = Math.random() < 0.85 ? 0 : 0.5; }
    let ex = clamp(this.eyeLead + this.sacc[0], -2.2, 2.2);
    let ey = this.eyeLeadY + this.sacc[1];
    if (gW > 0.3) { ex = this.eyes[0]; ey = this.eyes[1]; }
    this.eyes[0] = lerp(this.eyes[0], 0, 1 - Math.exp(-dt * 4)); this.eyes[1] = lerp(this.eyes[1], 0, 1 - Math.exp(-dt * 4));
    // talking: syllable mouth shapes with little pauses
    let mo = 0, mr = 0, mw = 1;
    if (talking) {
      this.mouthT -= dt;
      if (this.mouthT < 0) {
        this.mouthT = 0.065 + Math.random() * 0.07;
        const r = Math.random();
        this.mouth = r < 0.16 ? [0, 0, 1] : r < 0.42 ? [1.3, 0, 1] : r < 0.68 ? [2.5, 0.1, 1.04] : r < 0.84 ? [2.1, 0.9, 0.8] : [3.1, 0.3, 1];
        if (Math.random() < 0.07) { this.mouth = [0, 0, 1]; this.mouthT += 0.22; }
      }
      [mo, mr, mw] = this.mouth;
    }
    // previous -> current expression (one in-between frame)
    exprParams(this.exprPrev, this.Ea); exprParams(this.expr, this.Eb);
    const k = this.exprK < 0.5 ? 0.5 : 1;
    const E = this.Ef;
    for (const key in this.Eb) E[key] = lerp(this.Ea[key], this.Eb[key], k);
    if (talking) { E.open = Math.max(E.open * 0.4, mo); E.round = Math.max(E.round * 0.5, mr); E.mouthW *= mw; E.teeth = mo > 2.2 ? 1 : E.teeth; }
    E.blink = blink > 0.7 ? 1 : blink > 0.2 ? 0.55 : 0;
    E.lookX = Math.round(ex);
    E.lookY = Math.round(clamp(ey + (E.lookY || 0), -1, 2) * 2) / 2;
    // repaint only what changed
    const exprKey = this.exprPrev + '>' + this.expr + k;
    const eyeKey = E.blink * 100 + E.lookX * 10 + E.lookY;
    const mouthKey = E.open * 1e4 + E.round * 100 + E.mouthW + E.teeth * 1e6;
    if (this.job) return;
    if (exprKey !== this.faceExprKey) { this.faceExprKey = exprKey; this.faceEyeKey = eyeKey; this.faceMouthKey = mouthKey; f.paint(E); this.flushFace(null); return; }
    if (eyeKey !== this.faceEyeKey) { this.faceEyeKey = eyeKey; this.flushFace(f.paint(E, f.eyeRect())); }
    if (mouthKey !== this.faceMouthKey) { this.faceMouthKey = mouthKey; this.flushFace(f.paint(E, f.mouthRect())); }
  }

  flushFace(r) {
    const B = this.face.B;
    const [x, y, w, h] = r || [B.x - 1, B.y - 1, B.w + 2, B.h + 2];
    this.pix.ctx.putImageData(this.pix.img, 0, 0, x, y, w, h);
    this.pix.dirty = false;
    this.tex.needsUpdate = true;
  }
}

function setQ(bone, x, y, z, order = 'YXZ') { bone.quaternion.setFromEuler(_e.set(x, y, z, order)); }
function addQ(bone, a, w) {
  if (!a[0] && !a[1] && !a[2]) return;
  _q.setFromEuler(_e.set(a[0] * w, a[1] * w, a[2] * w, 'YXZ'));
  bone.quaternion.multiply(_q);
}
function newPose() { return { L: null, R: null, spine: [0, 0, 0], chest: [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0], hips: [0, 0, 0], lift: 0, prop: false, box: false, eyes: null }; }
