// Lightweight sphere physics: dynamic spheres vs. static oriented boxes + sphere/sphere contacts.
// Good enough for capsules rolling down chutes, bouncing on tables, confetti and dropped items.
import * as THREE from 'three';

const _v = new THREE.Vector3();
const _l = new THREE.Vector3();
const _c = new THREE.Vector3();
const _n = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _axis = new THREE.Vector3();

export class Collider {
  constructor({ center, half, quat = null, rotY = 0, friction = 0.45, restitution = 0.35, material = 'wood', tag = null }) {
    this.half = half.clone();
    this.center = center.clone();
    this.quat = quat ? quat.clone() : new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
    this.friction = friction;
    this.restitution = restitution;
    this.material = material;
    this.tag = tag;
    this.enabled = true;
    this.update();
  }
  update() {
    this.matrix = new THREE.Matrix4().compose(this.center, this.quat, new THREE.Vector3(1, 1, 1));
    this.inv = this.matrix.clone().invert();
    const r = this.half.length();
    this.min = this.center.clone().subScalar(r);
    this.max = this.center.clone().addScalar(r);
  }
}

export class Body {
  constructor(o) {
    this.radius = o.radius;
    this.pos = o.position.clone();
    this.vel = o.velocity ? o.velocity.clone() : new THREE.Vector3();
    this.angVel = new THREE.Vector3();
    this.mass = o.mass ?? 1;
    this.restitution = o.restitution ?? 0.38;
    this.friction = o.friction ?? 0.35;
    this.rollDamping = o.rollDamping ?? 1.6;
    this.linearDamping = o.linearDamping ?? 0.05;
    this.gravityScale = o.gravityScale ?? 1;
    this.object = o.object || null; // THREE.Object3D synced to body
    this.roll = o.roll ?? true;
    this.onImpact = o.onImpact || null;
    this.collideBodies = o.collideBodies ?? true;
    this.sleeping = false;
    this.sleepTimer = 0;
    this.contact = false;
    this.lastImpact = 0;
    this.userData = o.userData || {};
    this.group = o.group ?? 1;
  }
  wake() { this.sleeping = false; this.sleepTimer = 0; }
}

export class Physics {
  constructor() {
    this.bodies = [];
    this.colliders = [];
    this.gravity = new THREE.Vector3(0, -9.81, 0);
    this.time = 0;
  }
  addBox(o) { const c = new Collider(o); this.colliders.push(c); return c; }
  removeCollider(c) { const i = this.colliders.indexOf(c); if (i >= 0) this.colliders.splice(i, 1); }
  addBody(o) { const b = new Body(o); this.bodies.push(b); if (b.object) b.object.position.copy(b.pos); return b; }
  removeBody(b) { const i = this.bodies.indexOf(b); if (i >= 0) this.bodies.splice(i, 1); }

  step(dt) {
    dt = Math.min(dt, 1 / 20);
    const sub = Math.max(1, Math.ceil(dt / (1 / 150)));
    const h = dt / sub;
    for (let s = 0; s < sub; s++) this.substep(h);
    // sync visuals
    for (const b of this.bodies) {
      if (!b.object) continue;
      b.object.position.copy(b.pos);
      if (b.roll && !b.sleeping) {
        const w = b.angVel.length();
        if (w > 1e-4) {
          _axis.copy(b.angVel).divideScalar(w);
          _q.setFromAxisAngle(_axis, w * dt);
          b.object.quaternion.premultiply(_q);
        }
      }
    }
  }

  substep(h) {
    this.time += h;
    const bodies = this.bodies;
    for (const b of bodies) {
      if (b.sleeping) continue;
      b.vel.addScaledVector(this.gravity, h * b.gravityScale);
      b.vel.multiplyScalar(1 - b.linearDamping * h);
      b.pos.addScaledVector(b.vel, h);
      b.contact = false;
    }
    // static colliders
    for (const b of bodies) {
      if (b.sleeping) continue;
      for (const c of this.colliders) {
        if (!c.enabled) continue;
        if (b.pos.x + b.radius < c.min.x || b.pos.x - b.radius > c.max.x ||
            b.pos.y + b.radius < c.min.y || b.pos.y - b.radius > c.max.y ||
            b.pos.z + b.radius < c.min.z || b.pos.z - b.radius > c.max.z) continue;
        this.sphereBox(b, c, h);
      }
    }
    // sphere-sphere
    for (let i = 0; i < bodies.length; i++) {
      const a = bodies[i];
      if (!a.collideBodies) continue;
      for (let j = i + 1; j < bodies.length; j++) {
        const b = bodies[j];
        if (!b.collideBodies || (a.sleeping && b.sleeping) || !(a.group & b.group)) continue;
        _v.subVectors(b.pos, a.pos);
        const rr = a.radius + b.radius;
        const d2 = _v.lengthSq();
        if (d2 >= rr * rr || d2 < 1e-12) continue;
        const d = Math.sqrt(d2);
        _n.copy(_v).divideScalar(d);
        const pen = rr - d;
        const im1 = a.sleeping ? 0 : 1 / a.mass, im2 = b.sleeping ? 0 : 1 / b.mass;
        const ims = im1 + im2 || 1;
        a.pos.addScaledVector(_n, -pen * (im1 / ims));
        b.pos.addScaledVector(_n, pen * (im2 / ims));
        const rv = _v.subVectors(b.vel, a.vel).dot(_n);
        if (rv < 0) {
          const e = Math.min(a.restitution, b.restitution);
          const j = (-(1 + e) * rv) / ims;
          a.vel.addScaledVector(_n, -j * im1);
          b.vel.addScaledVector(_n, j * im2);
          if (-rv > 0.6) { a.wake(); b.wake(); }
          if (-rv > 0.25 && this.time - a.lastImpact > 0.06) {
            a.lastImpact = this.time;
            a.onImpact?.(-rv, 'capsule', b);
          }
        }
      }
    }
    // sleep + rolling resistance
    for (const b of bodies) {
      if (b.sleeping) continue;
      if (b.contact) {
        b.vel.multiplyScalar(Math.max(0, 1 - b.rollDamping * h));
      }
      const sp = b.vel.lengthSq();
      if (b.contact && sp < 0.0016) {
        b.sleepTimer += h;
        if (b.sleepTimer > 0.6) { b.sleeping = true; b.vel.set(0, 0, 0); b.angVel.multiplyScalar(0); }
      } else b.sleepTimer = 0;
      if (b.pos.y < -20) { b.pos.set(0, 2, 0); b.vel.set(0, 0, 0); }
    }
  }

  sphereBox(b, c, h) {
    _l.copy(b.pos).applyMatrix4(c.inv);
    const hx = c.half.x, hy = c.half.y, hz = c.half.z;
    _c.set(Math.max(-hx, Math.min(hx, _l.x)), Math.max(-hy, Math.min(hy, _l.y)), Math.max(-hz, Math.min(hz, _l.z)));
    _v.subVectors(_l, _c);
    let d = _v.length();
    let pen;
    if (d > 1e-6) {
      if (d >= b.radius) return;
      _n.copy(_v).divideScalar(d);
      pen = b.radius - d;
    } else {
      // centre inside box: push out along the axis of least penetration
      const px = hx - Math.abs(_l.x), py = hy - Math.abs(_l.y), pz = hz - Math.abs(_l.z);
      if (px < py && px < pz) { _n.set(Math.sign(_l.x) || 1, 0, 0); pen = px + b.radius; }
      else if (py < pz) { _n.set(0, Math.sign(_l.y) || 1, 0); pen = py + b.radius; }
      else { _n.set(0, 0, Math.sign(_l.z) || 1); pen = pz + b.radius; }
    }
    _n.applyQuaternion(c.quat);
    b.pos.addScaledVector(_n, pen);
    const vn = b.vel.dot(_n);
    if (_n.y > 0.5) b.contact = true;
    if (vn < 0) {
      const e = vn < -0.5 ? Math.min(b.restitution, c.restitution) * 1.6 : 0;
      b.vel.addScaledVector(_n, -(1 + e) * vn);
      // Coulomb friction on the tangential velocity
      _v.copy(b.vel).addScaledVector(_n, -b.vel.dot(_n));
      const vt = _v.length();
      if (vt > 1e-5) {
        const mu = (b.friction + c.friction) * 0.5;
        const drop = Math.min(vt, mu * -vn * (1 + e) * 0.35);
        b.vel.addScaledVector(_v, -drop / vt);
      }
      if (-vn > 0.22 && this.time - b.lastImpact > 0.05) {
        b.lastImpact = this.time;
        b.onImpact?.(-vn, c.material, c);
      }
    }
    // rolling: angular velocity from tangential motion
    if (b.roll && _n.y > 0.3) {
      _v.crossVectors(_n, b.vel).divideScalar(b.radius);
      b.angVel.lerp(_v, Math.min(1, h * 30));
    }
  }
}
