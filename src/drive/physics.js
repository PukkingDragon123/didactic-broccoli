// Arcade physics for Grandpa's kei van: a kinematic bicycle model pivoting on the rear axle, a little 4-speed
// gearbox that shifts by itself (the revs drive the engine sound), brakes, reverse, a handbrake, steering that gets
// lighter with speed, and the body on springs (pitch from braking / accelerating, roll from cornering, bumps).
//   const p = new VanPhysics();  p.reset(x, z, heading);  p.step(dt, { throttle, brake, steer, hand });
//   p.x / p.z / p.h (heading: forward = (sin h, cos h)) / p.v (m/s along the heading, < 0 reversing) / p.delta (wheel
//   angle, > 0 left) / p.rpm / p.gear (0 = reverse) / p.pitch / p.roll / p.bounce / p.ax / p.alat
export const WHEELBASE = 2.16;
export const VMAX = 15.4; // ~55 km/h, a gentle old kei van
const GEARS = [null, 857, 480, 309, 216]; // rpm per m/s in each gear
const PULL = [null, 2.5, 1.65, 1.08, 0.72]; // m/s² at full throttle and peak torque
const IDLE = 850, REDLINE = 6200;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** Torque curve (0..1) by rpm: soft low down, best round 3500, tailing off. */
const torque = (rpm) => clamp(0.62 + 0.38 * Math.sin(clamp((rpm - 900) / 5200, 0, 1) * Math.PI * 0.95), 0.55, 1);

export class VanPhysics {
  constructor() {
    this.reset(0, 0, 0);
  }

  reset(x, z, h, v = 0) {
    this.x = x; this.z = z; this.h = h; this.v = v;
    this.delta = 0; this.steerIn = 0;
    this.gear = 1; this.rpm = IDLE; this.shiftT = 0; this.revT = 0;
    this.pitch = 0; this.pitchV = 0; this.roll = 0; this.rollV = 0; this.bounce = 0; this.bounceV = 0;
    this.ax = 0; this.alat = 0; this.yawRate = 0;
    this.dist = 0; this.stopT = 0; this.reverse = false;
    this.shifted = 0; // +1 / -1 the frame a gear changes (sound)
    this.throttle = 0; this.braking = 0; this.hand = false;
  }

  /** Max front-wheel angle at a speed: full lock when crawling, a grip-limited one at speed. */
  maxDelta(v) {
    const a = Math.abs(v);
    return Math.min(0.62, Math.atan((WHEELBASE * 7.5) / Math.max(1, a * a)));
  }

  /**
   * Advance by dt. inp: throttle 0..1, brake 0..1 (also reverse once stopped), steer -1..1 (> 0 left; keyboard-style
   * values are smoothed here), hand (handbrake), analog (steer is already smooth, e.g. autopilot).
   */
  step(dt, inp) {
    if (dt <= 0) return;
    const thr = clamp(inp.throttle || 0, 0, 1), brk = clamp(inp.brake || 0, 0, 1), hand = !!inp.hand;
    this.throttle = thr; this.braking = brk; this.hand = hand;
    // ---- steering: keyboard steering eases in, springs back to the centre faster
    const want = clamp(inp.steer || 0, -1, 1);
    if (inp.analog) this.steerIn = want;
    else {
      const rate = want === 0 ? 3.6 : Math.sign(want) !== Math.sign(this.steerIn) && this.steerIn !== 0 ? 5 : 2.4;
      this.steerIn += clamp(want - this.steerIn, -rate * dt, rate * dt);
    }
    const dTarget = this.steerIn * this.maxDelta(this.v);
    this.delta += clamp(dTarget - this.delta, -2.2 * dt, 2.2 * dt);
    // ---- drive: forward gears or reverse
    const v0 = this.v;
    let a = 0;
    if (Math.abs(this.v) < 0.25 && brk > 0.5 && thr < 0.1) this.stopT += dt; else if (thr > 0.1 || Math.abs(this.v) > 0.6) this.stopT = 0;
    if (this.stopT > 0.35 && !this.reverse) this.reverse = true; // held the brake at a standstill: into reverse
    if (this.reverse && thr > 0.1 && this.v > -0.3) this.reverse = false; // throttle again: forward
    if (this.reverse) {
      this.gear = 0;
      if (brk > 0.1 && !hand) a -= brk * 2.2 * (this.v > -3.4 ? 1 : 0);
      if (thr > 0.1) a += thr * 7.0 * (this.v < 0 ? 1 : 0); // throttle brakes a reversing van
      this.rpm += ((IDLE + Math.abs(this.v) * 900 * (brk > 0.1 ? 1 : 0.4)) - this.rpm) * Math.min(1, dt * 6);
    } else {
      if (this.gear < 1) this.gear = 1;
      // automatic shifting (with a short gap in the pull)
      const rpmG = Math.max(0, this.v) * GEARS[this.gear];
      if (this.shiftT <= 0) {
        if (this.gear < 4 && rpmG > 5200 && thr > 0.2) { this.gear++; this.shiftT = 0.28; this.shifted = 1; }
        else if (this.gear > 1 && rpmG < 1900) { this.gear--; this.shiftT = 0.18; this.shifted = -1; }
      } else this.shiftT -= dt;
      const engaged = this.shiftT <= 0;
      const rpmT = Math.max(IDLE + thr * 1600 * (this.v < 2 ? 1 : 0), Math.max(0, this.v) * GEARS[this.gear]);
      this.rpm += (Math.min(REDLINE, rpmT) - this.rpm) * Math.min(1, dt * (engaged ? 9 : 4));
      if (engaged && thr > 0) {
        let pull = thr * PULL[this.gear] * torque(this.rpm);
        if (this.v > VMAX) pull *= clamp(1 - (this.v - VMAX) / 1.5, 0, 1); // the old governor
        a += pull;
      }
      if (engaged && thr < 0.05 && this.v > 1) a -= 0.35 * (5 - this.gear) / 4; // engine braking
      if (brk > 0 && this.v > 0) a -= brk * 7.2;
    }
    // drag, rolling resistance, handbrake
    a -= Math.sign(this.v) * (0.12 + 0.0042 * this.v * this.v);
    if (hand) a -= Math.sign(this.v) * 5.2;
    let v = this.v + a * dt;
    // brakes / drag never push the van backwards (or forwards) through zero
    if ((v0 > 0 && v < 0 && !(this.reverse && brk > 0)) || (v0 < 0 && v > 0 && !(thr > 0.1 && !this.reverse))) v = 0;
    if (Math.abs(v) < 0.02 && thr < 0.05 && !(this.reverse && brk > 0.1)) v = 0;
    this.v = v;
    this.ax = (this.v - v0) / dt;
    // ---- move: rear axle follows its heading, the nose swings round it
    const vm = (v0 + this.v) / 2;
    let yaw = (vm / WHEELBASE) * Math.tan(this.delta);
    if (hand && Math.abs(vm) > 3) yaw *= 1.45; // the tail steps out a little
    // a touch of understeer near the grip limit
    yaw /= 1 + Math.pow(Math.abs(vm * yaw) / 9, 2);
    this.yawRate = yaw;
    const hl = WHEELBASE / 2;
    let rx = this.x - Math.sin(this.h) * hl, rz = this.z - Math.cos(this.h) * hl;
    rx += Math.sin(this.h) * vm * dt; rz += Math.cos(this.h) * vm * dt;
    this.h += yaw * dt;
    this.x = rx + Math.sin(this.h) * hl; this.z = rz + Math.cos(this.h) * hl;
    this.dist += vm * dt;
    this.alat = vm * yaw; // + to the left
    this.suspension(dt);
  }

  /** The body on its springs. */
  suspension(dt) {
    const h = Math.min(dt, 1 / 30);
    const k = 70, c = 9;
    const tp = clamp(-this.ax * 0.0075, -0.035, 0.05), tr = clamp(this.alat * 0.0085, -0.06, 0.06);
    this.pitchV += ((tp - this.pitch) * k - this.pitchV * c) * h; this.pitch += this.pitchV * h;
    this.rollV += ((tr - this.roll) * k * 0.8 - this.rollV * c * 0.8) * h; this.roll += this.rollV * h;
    this.bounceV += ((0 - this.bounce) * 160 - this.bounceV * 11) * h; this.bounce += this.bounceV * h;
  }

  /** A jolt (bump in the road, a kerb): an upward kick and some pitch. */
  kick(up = 0.3, pitch = 0) { this.bounceV += up; this.pitchV += pitch; }

  get kmh() { return Math.abs(this.v) * 3.6; }
}
