// Physical-feeling particle effects: sparkles, confetti that lands on the floor, coin showers,
// sakura petals, light beams and shockwave rings. CPU-simulated, GPU-drawn in a few draw calls.
import * as THREE from 'three';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();

export class Effects {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.groundAt = opts.groundAt || (() => 0);
    this.buildSparks();
    this.buildConfetti();
    this.buildCoins();
    this.beams = [];
    this.rings = [];
    this.lights = [];
  }

  // ------------------------------------------------------------------ sparks (additive points)
  buildSparks() {
    const N = this.sparkMax = 2400;
    this.sp = { pos: new Float32Array(N * 3), vel: new Float32Array(N * 3), col: new Float32Array(N * 3), size: new Float32Array(N), life: new Float32Array(N), max: new Float32Array(N), drag: new Float32Array(N), grav: new Float32Array(N), kind: new Float32Array(N) };
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.sp.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.sp.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.spAlpha = new Float32Array(N);
    this.spSizeAttr = new Float32Array(N);
    g.setAttribute('alpha', new THREE.BufferAttribute(this.spAlpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('psize', new THREE.BufferAttribute(this.spSizeAttr, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('kind', new THREE.BufferAttribute(this.sp.kind, 1).setUsage(THREE.DynamicDrawUsage));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
      uniforms: { uPx: { value: window.innerHeight } },
      vertexShader: `attribute float alpha; attribute float psize; attribute float kind; varying vec3 vCol; varying float vA; varying float vK; uniform float uPx;
        void main(){ vCol = color; vA = alpha; vK = kind; vec4 mv = modelViewMatrix*vec4(position,1.0); gl_PointSize = psize * uPx / -mv.z; gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `varying vec3 vCol; varying float vA; varying float vK;
        void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c);
          float a;
          if (vK > 0.5) { // 4-point star twinkle
            float s = max(0.0, 1.0 - abs(c.x)*12.0) * max(0.0, 1.0 - abs(c.y)*2.2) + max(0.0, 1.0 - abs(c.y)*12.0) * max(0.0, 1.0 - abs(c.x)*2.2);
            a = s + smoothstep(0.18, 0.0, d);
          } else a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vCol * a * vA * 2.0, 1.0); }`,
    });
    this.sparkPts = new THREE.Points(g, m);
    this.sparkPts.frustumCulled = false;
    this.sparkPts.renderOrder = 10;
    this.scene.add(this.sparkPts);
    this.spNext = 0;
    window.addEventListener('resize', () => { m.uniforms.uPx.value = window.innerHeight; });
  }

  /** Emit sparkles. opts: count, pos, color(s), speed, spread, size, life, gravity, drag, star(0..1 chance), dir */
  sparks(o) {
    const sp = this.sp;
    const colors = (Array.isArray(o.colors) ? o.colors : [o.color ?? 0xffffff]).map((c) => new THREE.Color(c));
    for (let k = 0; k < (o.count || 20); k++) {
      const i = this.spNext; this.spNext = (this.spNext + 1) % this.sparkMax;
      const p = o.pos;
      const r = o.radius || 0;
      sp.pos[i * 3] = p.x + (Math.random() - 0.5) * r; sp.pos[i * 3 + 1] = p.y + (Math.random() - 0.5) * r; sp.pos[i * 3 + 2] = p.z + (Math.random() - 0.5) * r;
      // random direction (optionally biased)
      let vx = Math.random() * 2 - 1, vy = Math.random() * 2 - 1, vz = Math.random() * 2 - 1;
      const l = Math.hypot(vx, vy, vz) || 1; vx /= l; vy /= l; vz /= l;
      if (o.dir) { vx = vx * (o.spread ?? 0.5) + o.dir.x; vy = vy * (o.spread ?? 0.5) + o.dir.y; vz = vz * (o.spread ?? 0.5) + o.dir.z; }
      const s = (o.speed ?? 0.6) * (0.4 + Math.random() * 0.8);
      sp.vel[i * 3] = vx * s; sp.vel[i * 3 + 1] = vy * s + (o.up || 0); sp.vel[i * 3 + 2] = vz * s;
      const c = colors[Math.floor(Math.random() * colors.length)];
      sp.col[i * 3] = c.r; sp.col[i * 3 + 1] = c.g; sp.col[i * 3 + 2] = c.b;
      sp.size[i] = (o.size ?? 0.012) * (0.6 + Math.random() * 0.8);
      sp.max[i] = sp.life[i] = (o.life ?? 0.9) * (0.6 + Math.random() * 0.7);
      sp.drag[i] = o.drag ?? 2.0;
      sp.grav[i] = o.gravity ?? 0.6;
      sp.kind[i] = Math.random() < (o.star ?? 0.4) ? 1 : 0;
    }
  }

  updateSparks(dt) {
    const sp = this.sp;
    for (let i = 0; i < this.sparkMax; i++) {
      if (sp.life[i] <= 0) { this.spAlpha[i] = 0; this.spSizeAttr[i] = 0; continue; }
      sp.life[i] -= dt;
      const d = Math.max(0, 1 - sp.drag[i] * dt);
      sp.vel[i * 3] *= d; sp.vel[i * 3 + 1] = sp.vel[i * 3 + 1] * d - sp.grav[i] * dt; sp.vel[i * 3 + 2] *= d;
      sp.pos[i * 3] += sp.vel[i * 3] * dt; sp.pos[i * 3 + 1] += sp.vel[i * 3 + 1] * dt; sp.pos[i * 3 + 2] += sp.vel[i * 3 + 2] * dt;
      const t = sp.life[i] / sp.max[i];
      const tw = sp.kind[i] > 0.5 ? 0.6 + 0.4 * Math.sin((1 - t) * 40 + i) : 1;
      this.spAlpha[i] = Math.min(1, t * 2.5) * tw;
      this.spSizeAttr[i] = sp.size[i] * (0.5 + t * 0.5);
    }
    const g = this.sparkPts.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.color.needsUpdate = true;
    g.attributes.alpha.needsUpdate = true;
    g.attributes.psize.needsUpdate = true;
    g.attributes.kind.needsUpdate = true;
  }

  // ------------------------------------------------------------------ confetti & petals (instanced quads)
  buildConfetti() {
    const N = this.cfMax = 900;
    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.6, metalness: 0.1 });
    this.cfMesh = new THREE.InstancedMesh(geo, mat, N);
    this.cfMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.cfMesh.frustumCulled = false;
    this.cfMesh.castShadow = false;
    this.cfMesh.receiveShadow = true;
    const col = new THREE.Color();
    for (let i = 0; i < N; i++) { this.cfMesh.setColorAt(i, col.set(0xffffff)); _m.makeScale(0, 0, 0); this.cfMesh.setMatrixAt(i, _m); }
    this.scene.add(this.cfMesh);
    this.cf = [];
    for (let i = 0; i < N; i++) this.cf.push({ alive: false, p: new THREE.Vector3(), v: new THREE.Vector3(), rot: new THREE.Vector3(), spin: new THREE.Vector3(), w: 0.01, h: 0.006, life: 0, landed: false, petal: false });
    this.cfNext = 0;
  }

  confetti(o) {
    const colors = o.colors || [0xff6f91, 0xffd23f, 0x5cc4ff, 0x58c06c, 0xffffff, 0xd94fb0];
    const col = new THREE.Color();
    for (let k = 0; k < (o.count || 60); k++) {
      const i = this.cfNext; this.cfNext = (this.cfNext + 1) % this.cfMax;
      const c = this.cf[i];
      c.alive = true; c.landed = false; c.petal = !!o.petal;
      c.p.copy(o.pos).add(new THREE.Vector3((Math.random() - 0.5) * (o.radius || 0.05), (Math.random() - 0.5) * (o.radius || 0.05), (Math.random() - 0.5) * (o.radius || 0.05)));
      const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8 + (o.upBias ?? 0.6), Math.random() - 0.5).normalize();
      if (o.dir) dir.lerp(o.dir, 0.6).normalize();
      c.v.copy(dir).multiplyScalar((o.speed ?? 2.2) * (0.5 + Math.random() * 0.7));
      c.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      c.spin.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14);
      c.w = o.petal ? 0.014 : 0.012; c.h = o.petal ? 0.011 : 0.007;
      c.life = o.life ?? 9 + Math.random() * 3;
      this.cfMesh.setColorAt(i, col.set(o.petal ? (Math.random() < 0.5 ? 0xffc2d4 : 0xffe0ea) : colors[Math.floor(Math.random() * colors.length)]));
    }
    this.cfMesh.instanceColor.needsUpdate = true;
  }

  updateConfetti(dt, t) {
    let any = false;
    for (let i = 0; i < this.cfMax; i++) {
      const c = this.cf[i];
      if (!c.alive) continue;
      any = true;
      c.life -= dt;
      if (c.life <= 0) { c.alive = false; _m.makeScale(0, 0, 0); this.cfMesh.setMatrixAt(i, _m); continue; }
      if (!c.landed) {
        // air drag + flutter
        const drag = c.v.y < 0 ? 4.5 : 1.6;
        c.v.multiplyScalar(Math.max(0, 1 - drag * dt));
        c.v.y -= 9.81 * dt * (c.v.y < 0 ? 0.35 : 1);
        c.v.x += Math.sin(t * 6 + i) * dt * 0.5;
        c.v.z += Math.cos(t * 5 + i * 1.3) * dt * 0.5;
        c.p.addScaledVector(c.v, dt);
        c.rot.addScaledVector(c.spin, dt);
        const gy = this.groundAt(c.p.x, c.p.z, c.p.y) + 0.002;
        if (c.p.y <= gy) { c.p.y = gy; c.landed = true; c.rot.x = -Math.PI / 2; c.rot.y = 0; }
      }
      const fade = Math.min(1, c.life / 1.5);
      _q.setFromEuler(_e.set(c.rot.x, c.rot.y, c.rot.z));
      _s.set(c.w * fade, c.h * fade, 1);
      _m.compose(c.p, _q, _s);
      this.cfMesh.setMatrixAt(i, _m);
    }
    if (any) this.cfMesh.instanceMatrix.needsUpdate = true;
  }

  // ------------------------------------------------------------------ coins (instanced)
  buildCoins() {
    const N = this.coinMax = 260;
    const geo = new THREE.CylinderGeometry(0.0115, 0.0115, 0.0018, 16);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffcc44, metalness: 1, roughness: 0.25, envMapIntensity: 2 });
    this.coinMesh = new THREE.InstancedMesh(geo, mat, N);
    this.coinMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.coinMesh.frustumCulled = false;
    this.coinMesh.castShadow = true;
    for (let i = 0; i < N; i++) { _m.makeScale(0, 0, 0); this.coinMesh.setMatrixAt(i, _m); }
    this.scene.add(this.coinMesh);
    this.coins = [];
    for (let i = 0; i < N; i++) this.coins.push({ alive: false, p: new THREE.Vector3(), v: new THREE.Vector3(), rot: new THREE.Vector3(), spin: new THREE.Vector3(), life: 0, bounces: 0 });
    this.coinNext = 0;
    this.onCoinBounce = null;
  }

  coinBurst(o) {
    for (let k = 0; k < (o.count || 20); k++) {
      const i = this.coinNext; this.coinNext = (this.coinNext + 1) % this.coinMax;
      const c = this.coins[i];
      c.alive = true; c.bounces = 0;
      c.p.copy(o.pos);
      c.v.set((Math.random() - 0.5) * (o.spread ?? 1.2), (o.up ?? 2.2) * (0.6 + Math.random() * 0.6), (Math.random() - 0.5) * (o.spread ?? 1.2));
      if (o.rain) { c.p.add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.6 + Math.random() * 0.5, (Math.random() - 0.5) * 0.8)); c.v.set(0, -Math.random(), 0); }
      c.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      c.spin.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20);
      c.life = o.life ?? 4;
    }
  }

  updateCoins(dt) {
    let any = false;
    for (let i = 0; i < this.coinMax; i++) {
      const c = this.coins[i];
      if (!c.alive) continue;
      any = true;
      c.life -= dt;
      if (c.life <= 0) { c.alive = false; _m.makeScale(0, 0, 0); this.coinMesh.setMatrixAt(i, _m); continue; }
      c.v.y -= 9.81 * dt;
      c.p.addScaledVector(c.v, dt);
      c.rot.addScaledVector(c.spin, dt);
      const gy = this.groundAt(c.p.x, c.p.z, c.p.y) + 0.001;
      if (c.p.y < gy) {
        c.p.y = gy;
        if (c.v.y < -0.5 && c.bounces < 3) { c.v.y *= -0.35; c.v.x *= 0.6; c.v.z *= 0.6; c.spin.multiplyScalar(0.5); c.bounces++; this.onCoinBounce?.(c.p); }
        else { c.v.set(0, 0, 0); c.spin.set(0, 0, 0); c.rot.x = 0; c.rot.z = 0; }
      }
      const fade = Math.min(1, c.life / 0.6);
      _q.setFromEuler(_e.set(c.rot.x, c.rot.y, c.rot.z));
      _s.setScalar(fade);
      _m.compose(c.p, _q, _s);
      this.coinMesh.setMatrixAt(i, _m);
    }
    if (any) this.coinMesh.instanceMatrix.needsUpdate = true;
  }

  // ------------------------------------------------------------------ beams (god rays behind reveals)
  beamBurst(o) {
    const group = new THREE.Group();
    group.position.copy(o.pos);
    const n = o.count || 8;
    const colors = (o.colors || [o.color ?? 0xffe9a0]).map((c) => new THREE.Color(c));
    const mats = [];
    for (let i = 0; i < n; i++) {
      const len = (o.length || 0.9) * (0.7 + Math.random() * 0.5);
      const geo = new THREE.ConeGeometry(o.width || 0.06, len, 4, 1, true);
      geo.translate(0, -len / 2, 0);
      geo.rotateX(Math.PI);
      const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        uniforms: { uColor: { value: colors[i % colors.length] }, uA: { value: 0 } },
        vertexShader: 'varying float vY; void main(){ vY = position.y; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
        fragmentShader: `uniform vec3 uColor; uniform float uA; varying float vY; void main(){ float f = clamp(1.0 - vY / ${len.toFixed(3)}, 0.0, 1.0); gl_FragColor = vec4(uColor * f * f * uA, 1.0); }`,
      });
      mats.push(mat);
      const m = new THREE.Mesh(geo, mat);
      m.rotation.z = (i / n) * Math.PI * 2;
      m.rotation.x = (Math.random() - 0.5) * 0.6;
      group.add(m);
    }
    if (o.face) group.quaternion.copy(o.face);
    this.scene.add(group);
    this.beams.push({ group, mats, t: 0, dur: o.dur || 2, spin: o.spin ?? 0.6, strength: o.strength ?? 0.8, follow: o.follow || null });
  }

  updateBeams(dt) {
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i];
      b.t += dt;
      const k = b.t / b.dur;
      if (k >= 1) { this.scene.remove(b.group); b.group.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); }); this.beams.splice(i, 1); continue; }
      const a = Math.min(1, k * 5) * (1 - Math.pow(k, 2)) * b.strength;
      for (const m of b.mats) m.uniforms.uA.value = a;
      b.group.rotateZ(dt * b.spin);
      if (b.follow) b.group.position.copy(b.follow.getWorldPosition(new THREE.Vector3()));
      b.group.scale.setScalar(0.6 + k * 0.6);
    }
  }

  // ------------------------------------------------------------------ shockwave ring
  ring(o) {
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uColor: { value: new THREE.Color(o.color ?? 0xffffff) }, uT: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'uniform vec3 uColor; uniform float uT; varying vec2 vUv; void main(){ float d = length(vUv-0.5)*2.0; float r = uT; float a = smoothstep(0.12,0.0,abs(d-r)) * (1.0-uT); gl_FragColor = vec4(uColor*a*1.5,1.0); }',
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    m.position.copy(o.pos);
    if (o.face) m.quaternion.copy(o.face); else m.rotation.x = -Math.PI / 2;
    m.scale.setScalar(o.size || 0.6);
    this.scene.add(m);
    this.rings.push({ m, mat, t: 0, dur: o.dur || 0.6 });
  }

  updateRings(dt) {
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.t += dt;
      const k = r.t / r.dur;
      if (k >= 1) { this.scene.remove(r.m); r.m.geometry.dispose(); r.mat.dispose(); this.rings.splice(i, 1); continue; }
      r.mat.uniforms.uT.value = 1 - Math.pow(1 - k, 3);
    }
  }

  // ------------------------------------------------------------------ flash point lights
  flash(o) {
    const l = new THREE.PointLight(o.color ?? 0xffffff, o.intensity ?? 6, o.distance ?? 3, 1.5);
    l.position.copy(o.pos);
    this.scene.add(l);
    this.lights.push({ l, t: 0, dur: o.dur || 0.5, base: o.intensity ?? 6 });
  }

  updateLights(dt) {
    for (let i = this.lights.length - 1; i >= 0; i--) {
      const f = this.lights[i];
      f.t += dt;
      const k = f.t / f.dur;
      if (k >= 1) { this.scene.remove(f.l); f.l.dispose(); this.lights.splice(i, 1); continue; }
      f.l.intensity = f.base * Math.pow(1 - k, 2);
    }
  }

  update(dt, t) {
    this.updateSparks(dt);
    this.updateConfetti(dt, t);
    this.updateCoins(dt);
    this.updateBeams(dt);
    this.updateRings(dt);
    this.updateLights(dt);
  }
}
