// The title screen's camera: a composed shot of the shop at dusk that holds still but for a very slow drift (a breath of
// sway and rise, never enough to notice as movement), reframed for portrait / narrow screens, plus keyframed moves
// (into the machine, under the shutter, up the lane, toward you for the wardrobe) that blend from wherever the camera is.
//   const shot = new MenuShot(game);  shot.update(dt)  shot.move(keys, dur) -> Promise  shot.speed (fast-forward)
import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
// the composed frame for a wide screen, and for a tall one (the shop pulled into the middle, below the sign)
const WIDE = { pos: V(5.85, 1.18, 11.05), look: V(-2.3, 2.0, 5.45), fov: 44 };
const TALL = { pos: V(4.7, 1.25, 13.0), look: V(1.45, 0.5, 6.0), fov: 54 };
const smooth = (k) => k * k * (3 - 2 * k);
const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

export class MenuShot {
  constructor(game) {
    this.game = game;
    this.t = 0;
    this.speed = 1;
    this.job = null;
    this.cur = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 45 };
    this.base(this.cur);
  }

  /** The resting frame for this aspect (with the drift). */
  base(out = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 45 }) {
    const a = innerWidth / innerHeight;
    const k = smooth(Math.min(1, Math.max(0, (1.45 - a) / (1.45 - 0.62)))); // 0 wide .. 1 tall
    out.pos.lerpVectors(WIDE.pos, TALL.pos, k);
    out.look.lerpVectors(WIDE.look, TALL.look, k);
    out.fov = WIDE.fov + (TALL.fov - WIDE.fov) * k;
    const t = this.t;
    out.pos.x += Math.sin(t * 0.045) * 0.16;
    out.pos.z += Math.sin(t * 0.031 + 1) * 0.1;
    out.pos.y += Math.sin(t * 0.11) * 0.025;
    out.look.x += Math.sin(t * 0.06 + 0.5) * 0.08;
    out.look.y += Math.sin(t * 0.083) * 0.02;
    return out;
  }

  /** Blend through keyframes [{ pos, look, fov, at (0..1) }] over dur seconds, from the current view. `hold`: stay on
   *  the last key afterwards (until home()). */
  move(keys, dur, { hold = true, ease = easeInOut } = {}) {
    return new Promise((res) => {
      const from = { pos: this.cur.pos.clone(), look: this.cur.look.clone(), fov: this.cur.fov, at: 0 };
      this.job = { keys: [from, ...keys.map((k, i) => ({ ...k, fov: k.fov ?? from.fov, at: k.at ?? (i + 1) / keys.length }))], t: 0, dur, res, hold, ease };
    });
  }

  /** Back to the resting frame. */
  home(dur = 0.8) {
    const self = this;
    return this.move([{ get pos() { return self.base().pos; }, get look() { return self.base().look; }, get fov() { return self.base().fov; }, at: 1 }], dur, { hold: false });
  }

  update(dt) {
    this.t += dt;
    const cam = this.game.camera;
    const j = this.job;
    if (j) {
      j.t += dt * this.speed;
      const u = j.ease(Math.min(1, j.t / j.dur));
      const K = j.keys;
      let i = 1;
      while (i < K.length - 1 && u > K[i].at) i++;
      const a = K[i - 1], b = K[i], s = Math.min(1, Math.max(0, (u - a.at) / Math.max(1e-6, b.at - a.at)));
      // Catmull-Rom through the keys for a smooth path, linear for the aim
      const p0 = (K[i - 2] || a).pos, p1 = a.pos, p2 = b.pos, p3 = (K[i + 1] || b).pos;
      catmull(p0, p1, p2, p3, s, this.cur.pos);
      this.cur.look.lerpVectors(a.look, b.look, smooth(s));
      this.cur.fov = a.fov + (b.fov - a.fov) * smooth(s);
      if (j.t >= j.dur) {
        this.job = j.hold ? { ...j, t: j.dur, res: null, done: true } : null;
        if (!j.hold) this.base(this.cur);
        j.res?.();
        if (this.job?.done) this.job.res = null;
      }
    } else this.base(this.cur);
    cam.position.copy(this.cur.pos);
    cam.lookAt(this.cur.look);
    if (Math.abs(cam.fov - this.cur.fov) > 1e-3) { cam.fov = this.cur.fov; cam.updateProjectionMatrix(); }
    cam.updateMatrixWorld();
  }
}

function catmull(p0, p1, p2, p3, t, out) {
  const t2 = t * t, t3 = t2 * t;
  for (const c of ['x', 'y', 'z']) {
    out[c] = 0.5 * ((2 * p1[c]) + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3);
  }
  return out;
}
