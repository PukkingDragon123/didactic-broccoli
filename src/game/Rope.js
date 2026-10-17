// Verlet rope tying the fake coin(s) to a machine. The end can be pinned (e.g. inside the coin slot).
import * as THREE from 'three';
import { pixMat } from '../gfx/geo.js';
import { makeCoin } from '../world/machineModels.js';

export class Rope {
  constructor(scene, anchor, length = 0.42, segments = 16) {
    this.scene = scene;
    this.anchor = anchor.clone();
    this.n = segments;
    this.seg = length / (segments - 1);
    this.pts = [];
    for (let i = 0; i < segments; i++) {
      const p = anchor.clone().add(new THREE.Vector3(0, -i * this.seg, 0.002 * i));
      this.pts.push({ p, o: p.clone() });
    }
    this.pin = null; // Vector3 target for the last point
    this.boxes = []; // world AABBs (THREE.Box3) to keep the rope outside
    this.floorY = 0;
    this.coins = [];
    this.coinsHidden = 0;
    this.sleep = 0;
    const mat = pixMat('rope', { roughness: 0.95, bump: 0 });
    this.mat = mat;
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.rebuild();
  }

  setCoins(n) {
    while (this.coins.length < n) { const c = makeCoin(); this.scene.add(c); this.coins.push(c); }
    while (this.coins.length > n) { const c = this.coins.pop(); this.scene.remove(c); }
    this.wake();
  }

  wake() { this.sleep = 0; }

  update(dt) {
    if (this.sleep > 2 && !this.pin) return;
    dt = Math.min(dt, 1 / 30);
    const g = -9.81 * dt * dt;
    let motion = 0;
    for (let i = 1; i < this.n; i++) {
      const pt = this.pts[i];
      const vx = (pt.p.x - pt.o.x) * 0.985, vy = (pt.p.y - pt.o.y) * 0.985, vz = (pt.p.z - pt.o.z) * 0.985;
      pt.o.copy(pt.p);
      pt.p.x += vx; pt.p.y += vy + g * (i === this.n - 1 ? 1.6 : 1); pt.p.z += vz;
      motion += Math.abs(vx) + Math.abs(vy) + Math.abs(vz);
    }
    for (let it = 0; it < 14; it++) {
      this.pts[0].p.copy(this.anchor);
      if (this.pin) this.pts[this.n - 1].p.copy(this.pin);
      for (let i = 0; i < this.n - 1; i++) {
        const a = this.pts[i].p, b = this.pts[i + 1].p;
        const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
        const diff = (d - this.seg) / d;
        const wa = i === 0 ? 0 : 0.5, wb = (this.pin && i + 1 === this.n - 1) ? 0 : 0.5;
        const s = wa + wb || 1;
        a.x += dx * diff * (wa / s); a.y += dy * diff * (wa / s); a.z += dz * diff * (wa / s);
        b.x -= dx * diff * (wb / s); b.y -= dy * diff * (wb / s); b.z -= dz * diff * (wb / s);
      }
      // collisions
      for (let i = 1; i < this.n; i++) {
        const p = this.pts[i].p;
        if (p.y < this.floorY + 0.006) p.y = this.floorY + 0.006;
        for (const b of this.boxes) {
          if (p.x > b.min.x && p.x < b.max.x && p.y > b.min.y && p.y < b.max.y && p.z > b.min.z && p.z < b.max.z) {
            const dl = [p.x - b.min.x, b.max.x - p.x, p.y - b.min.y, b.max.y - p.y, p.z - b.min.z, b.max.z - p.z];
            let m = 0; for (let k = 1; k < 6; k++) if (dl[k] < dl[m]) m = k;
            if (m === 0) p.x = b.min.x; else if (m === 1) p.x = b.max.x; else if (m === 2) p.y = b.min.y; else if (m === 3) p.y = b.max.y; else if (m === 4) p.z = b.min.z; else p.z = b.max.z;
          }
        }
      }
    }
    this.sleep = motion < 0.0004 ? this.sleep + dt : 0;
    this.rebuild();
  }

  rebuild() {
    const curve = new THREE.CatmullRomCurve3(this.pts.map((p) => p.p));
    this.mesh.geometry.dispose();
    this.mesh.geometry = new THREE.TubeGeometry(curve, this.n * 2, 0.0035, 5, false);
    // coins strung along the last part of the rope
    const n = this.coins.length;
    for (let i = 0; i < n; i++) {
      const c = this.coins[i];
      const t = 1 - i * 0.045;
      const p = curve.getPointAt(Math.max(0, t));
      const tan = curve.getTangentAt(Math.max(0, Math.min(1, t)));
      c.position.copy(p);
      // coin hangs with its face roughly perpendicular to the rope's sideways axis
      const up = Math.abs(tan.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
      const side = new THREE.Vector3().crossVectors(tan, up).normalize();
      const m = new THREE.Matrix4().makeBasis(side, tan, new THREE.Vector3().crossVectors(side, tan));
      c.quaternion.setFromRotationMatrix(m);
      c.rotateX(Math.PI / 2);
      c.rotateZ(i * 0.7);
      c.visible = i >= this.coinsHidden;
    }
  }

  get end() { return this.pts[this.n - 1].p; }

  dispose() {
    this.scene.remove(this.mesh);
    for (const c of this.coins) this.scene.remove(c);
  }
}
