// First-person controller: mouse look, WASD walking with smoothed acceleration, circle-vs-AABB collisions,
// subtle head bob and footstep sounds.
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { clamp, damp } from '../core/util.js';

export class Player {
  constructor(camera, input) {
    this.camera = camera;
    this.input = input;
    this.pos = new THREE.Vector3(0, 0, 3);
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = -0.08;
    this.eye = 1.58;
    this.radius = 0.27;
    this.obstacles = []; // {minX,maxX,minZ,maxZ, enabled}
    this.frozen = false;
    this.bobT = 0;
    this.stepDist = 0;
    this.surfaceAt = () => 'concrete';
    this.lookOverride = null; // {pos, quat} camera override (PC zoom)
    this.camBlend = 0;
    this.shake = 0;
    this.fovKick = 0;
    this.baseFov = 72;
    this._euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this._v = new THREE.Vector3();
  }

  addObstacle(minX, maxX, minZ, maxZ, tag = null) {
    const o = { minX, maxX, minZ, maxZ, enabled: true, tag };
    this.obstacles.push(o);
    return o;
  }
  removeObstacle(o) { const i = this.obstacles.indexOf(o); if (i >= 0) this.obstacles.splice(i, 1); }

  update(dt) {
    const inp = this.input;
    if (!this.frozen && inp.locked) {
      const s = 0.0022 * inp.sensitivity;
      this.yaw -= inp.mouse.dx * s;
      this.pitch -= inp.mouse.dy * s * (inp.invertY ? -1 : 1);
      this.pitch = clamp(this.pitch, -1.45, 1.45);
    }
    // movement
    let fx = 0, fz = 0;
    if (!this.frozen && inp.locked) {
      if (inp.key('KeyW') || inp.key('ArrowUp')) fz -= 1;
      if (inp.key('KeyS') || inp.key('ArrowDown')) fz += 1;
      if (inp.key('KeyA') || inp.key('ArrowLeft')) fx -= 1;
      if (inp.key('KeyD') || inp.key('ArrowRight')) fx += 1;
    }
    const len = Math.hypot(fx, fz);
    const speed = (inp.key('ShiftLeft') || inp.key('ShiftRight')) ? 4.0 : 2.4;
    const target = this._v.set(0, 0, 0);
    if (len > 0) {
      fx /= len; fz /= len;
      const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
      target.set(fx * cos + fz * sin, 0, -fx * sin + fz * cos).multiplyScalar(speed);
    }
    const accel = len > 0 ? 12 : 14;
    this.vel.x = damp(this.vel.x, target.x, accel, dt);
    this.vel.z = damp(this.vel.z, target.z, accel, dt);
    const step = this.vel.clone().multiplyScalar(dt);
    // move separately on each axis for smooth wall sliding
    this.pos.x += step.x; this.collide();
    this.pos.z += step.z; this.collide();

    const hspeed = Math.hypot(this.vel.x, this.vel.z);
    if (hspeed > 0.2) {
      this.bobT += dt * hspeed * 3.2;
      this.stepDist += hspeed * dt;
      const stride = speed > 3 ? 0.78 : 0.68;
      if (this.stepDist > stride) {
        this.stepDist = 0;
        audio.play('footstep', { surface: this.surfaceAt(this.pos), vol: 0.55 });
      }
    } else {
      this.bobT = damp(this.bobT, Math.round(this.bobT / Math.PI) * Math.PI, 6, dt);
    }

    // camera
    const bobAmt = Math.min(1, hspeed / 2.4);
    const bobY = Math.sin(this.bobT * 2) * 0.022 * bobAmt;
    const bobX = Math.cos(this.bobT) * 0.012 * bobAmt;
    this.shake = Math.max(0, this.shake - dt * 2.5);
    const sh = this.shake * this.shake;
    const cam = this.camera;
    const basePos = new THREE.Vector3(this.pos.x, this.eye + bobY, this.pos.z);
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    basePos.x += cos * bobX; basePos.z -= sin * bobX;
    this._euler.set(this.pitch + (Math.random() - 0.5) * sh * 0.03, this.yaw + (Math.random() - 0.5) * sh * 0.03, Math.sin(this.bobT) * 0.004 * bobAmt);
    const baseQuat = new THREE.Quaternion().setFromEuler(this._euler);

    const want = this.lookOverride ? 1 : 0;
    this.camBlend = damp(this.camBlend, want, 7, dt);
    if (this.lookOverride && this.camBlend > 0.001) {
      cam.position.lerpVectors(basePos, this.lookOverride.pos, this.camBlend);
      cam.quaternion.slerpQuaternions(baseQuat, this.lookOverride.quat, this.camBlend);
    } else {
      cam.position.copy(basePos);
      cam.quaternion.copy(baseQuat);
    }
    this.fovKick = damp(this.fovKick, 0, 4, dt);
    const fov = this.baseFov + this.fovKick - (this.lookOverride ? (this.lookOverride.fovDelta || 0) * this.camBlend : 0);
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
  }

  collide() {
    const r = this.radius;
    for (const o of this.obstacles) {
      if (!o.enabled) continue;
      const cx = clamp(this.pos.x, o.minX, o.maxX);
      const cz = clamp(this.pos.z, o.minZ, o.maxZ);
      const dx = this.pos.x - cx, dz = this.pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          this.pos.x += (dx / d) * (r - d);
          this.pos.z += (dz / d) * (r - d);
        } else {
          // inside: push out along shortest axis
          const pl = this.pos.x - o.minX, pr = o.maxX - this.pos.x, pb = this.pos.z - o.minZ, pf = o.maxZ - this.pos.z;
          const m = Math.min(pl, pr, pb, pf);
          if (m === pl) this.pos.x = o.minX - r; else if (m === pr) this.pos.x = o.maxX + r;
          else if (m === pb) this.pos.z = o.minZ - r; else this.pos.z = o.maxZ + r;
        }
      }
    }
  }

  forward(out = new THREE.Vector3()) {
    return out.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
  }
}
