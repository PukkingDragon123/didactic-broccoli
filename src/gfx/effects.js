// The game's particle effects, all 2D pixel-art sprites (src/gfx/pixfx.js, one draw call): sparkles that twinkle into
// four-point stars, confetti and sakura petals that tumble down and settle on the floor, spinning go-en coins that bounce,
// light bursts (pixel rays turning in steps) behind reveals, shockwave rings, dust puffs, hearts, splashes, sleepy z's,
// ambient dust motes. CPU-simulated. Flashes are short-lived point lights (lighting, not sprites).
import * as THREE from 'three';
import { PixFX } from './pixfx.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const _v = new THREE.Vector3(), _d = new THREE.Vector3();
const DUST = [0xb8a890, 0x9a8a78, 0xd0c4b0];

export class Effects {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.groundAt = opts.groundAt || (() => 0);
    this.fx = new PixFX(scene, { groundAt: this.groundAt });
    this.lights = [];
    this.fields = [];
    this.onCoinBounce = null;
  }

  /** Any sprite (see PixFX.emit). */
  emit(o) { return this.fx.emit(o); }

  /** Sparkles. opts: count, pos, color(s), speed, spread, size, life, gravity, drag, star (0..1: share of twinkling
   *  stars vs plain motes), dir, radius, up. Big starless ones (dust colours, size >= 0.025) come out as dust puffs. */
  sparks(o) {
    const colors = Array.isArray(o.colors) ? o.colors : [o.color ?? 0xffffff];
    const n = o.count || 20, sz = o.size ?? 0.012, r = o.radius || 0;
    const dusty = (o.star ?? 0.4) === 0 && sz >= 0.025;
    for (let k = 0; k < n; k++) {
      let vx = Math.random() * 2 - 1, vy = Math.random() * 2 - 1, vz = Math.random() * 2 - 1;
      const l = Math.hypot(vx, vy, vz) || 1; vx /= l; vy /= l; vz /= l;
      if (o.dir) { const s = o.spread ?? 0.5; vx = vx * s + o.dir.x; vy = vy * s + o.dir.y; vz = vz * s + o.dir.z; }
      const s = (o.speed ?? 0.6) * rnd(0.4, 1.2);
      const star = Math.random() < (o.star ?? 0.4);
      const life = (o.life ?? 0.9) * rnd(0.6, 1.3);
      this.fx.emit({
        sprite: dusty ? 'puff' : star ? 'spark' : 'dot',
        x: o.pos.x + (Math.random() - 0.5) * r, y: o.pos.y + (Math.random() - 0.5) * r, z: o.pos.z + (Math.random() - 0.5) * r,
        vx: vx * s, vy: vy * s + (o.up || 0), vz: vz * s,
        color: pick(colors), life,
        size: dusty ? sz * rnd(1.1, 1.8) : star ? sz * rnd(1.3, 2.1) : sz * rnd(0.45, 0.8),
        gravity: o.gravity ?? 0.6, drag: o.drag ?? 2.0,
        seq: star ? null : dusty ? null : [0, 0, 0, 1, 2], fade: star ? 0.15 : 0.45, flip: true,
      });
    }
  }

  /** Confetti (or sakura petals: petal true) that tumbles down, flutters and lies on the floor for a while. */
  confetti(o) {
    const colors = o.colors || [0xff6f91, 0xffd23f, 0x5cc4ff, 0x58c06c, 0xffffff, 0xd94fb0];
    const R = o.radius || 0.05;
    for (let k = 0; k < (o.count || 60); k++) {
      _d.set(Math.random() - 0.5, Math.random() * 0.8 + (o.upBias ?? 0.6), Math.random() - 0.5).normalize();
      if (o.dir) _d.lerp(o.dir, 0.6).normalize();
      _d.multiplyScalar((o.speed ?? 2.2) * rnd(0.5, 1.2));
      const petal = !!o.petal;
      this.fx.emit({
        sprite: petal ? 'petal' : 'confetti',
        x: o.pos.x + (Math.random() - 0.5) * R, y: o.pos.y + (Math.random() - 0.5) * R, z: o.pos.z + (Math.random() - 0.5) * R,
        vel: _d, color: petal ? 0xffffff : pick(colors),
        life: o.life ?? rnd(9, 12), size: petal ? 0.016 : 0.012,
        gravity: 3.2, drag: 2.6, flutter: petal ? 5 : 3.5, floor: true,
        anim: 'loop', fps: rnd(8, 16), frame: Math.floor(Math.random() * 4), landFrame: petal ? 0 : 4,
        fade: 0.12, flip: true,
      });
    }
  }

  /** Coins: a burst (or a rain from above the camera) of spinning go-en that bounce and lie on the floor. */
  coinBurst(o) {
    for (let k = 0; k < (o.count || 20); k++) {
      const sp = o.spread ?? 1.2;
      const p = _v.copy(o.pos);
      const v = _d.set((Math.random() - 0.5) * sp, (o.up ?? 2.2) * rnd(0.6, 1.2), (Math.random() - 0.5) * sp);
      if (o.rain) { p.add(new THREE.Vector3((Math.random() - 0.5) * 0.8, rnd(0.6, 1.1), (Math.random() - 0.5) * 0.8)); v.set(0, -Math.random(), 0); }
      this.fx.emit({
        sprite: 'coin', pos: p, vel: v, life: o.life ?? 4, size: 0.024,
        gravity: 9.81, floor: true, bounce: 0.35, anim: 'loop', fps: rnd(12, 20), frame: Math.floor(Math.random() * 6),
        landFrame: 0, fade: 0.15,
        onBounce: (q) => this.onCoinBounce?.(new THREE.Vector3(q.x, q.y, q.z)),
      });
    }
  }

  /** A light burst framing a reveal: pixel rays round a starburst, turning in steps, growing and dissolving.
   *  opts: pos, colors, length, dur, strength, spin, follow (Object3D), back (m pushed away from the viewer), face. */
  beamBurst(o) {
    const colors = o.colors || [o.color ?? 0xffe9a0];
    const back = new THREE.Vector3(0, 0, -(o.back || 0));
    if (o.face) back.applyQuaternion(o.face);
    const size = (o.length || 0.9) * 2.5, dur = o.dur || 2, fps = Math.max(2, Math.abs(o.spin ?? 0.6) * 9);
    colors.slice(0, 2).forEach((c, i) => {
      const base = o.follow ? back.clone() : o.pos.clone().add(back);
      this.fx.emit({
        sprite: 'burst', pos: base, follow: o.follow || null, color: c, life: dur * (i ? 0.85 : 1),
        size: size * (i ? 0.78 : 1), anim: 'loop', fps, frame: i * 3, flip: i === 1,
        grow: [0.6, 1.15], fadeIn: 0.08, fade: 0.5, alpha: o.strength ?? 0.8,
      });
    });
  }

  /** Shockwave: facing you (face given) a pixel ring that grows and breaks up; on the floor a ring of dust kicked out. */
  ring(o) {
    if (o.face) {
      this.fx.emit({ sprite: 'ring', pos: o.pos, color: o.color ?? 0xffffff, life: o.dur || 0.6, size: o.size || 0.6, fade: 0.25 });
      return;
    }
    const n = 18, R = (o.size || 0.6) * 0.5;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.2, sp = R * rnd(2.2, 3.2);
      this.fx.emit({
        sprite: 'puff', x: o.pos.x + Math.cos(a) * 0.06, y: o.pos.y + 0.03, z: o.pos.z + Math.sin(a) * 0.06,
        vx: Math.cos(a) * sp, vy: rnd(0.05, 0.25), vz: Math.sin(a) * sp, drag: 4.5, gravity: 0.2,
        color: pick(DUST), life: rnd(0.6, 0.9), size: rnd(0.07, 0.11), flip: true, fade: 0.35,
      });
    }
    this.sparks({ pos: _v.copy(o.pos).setY(o.pos.y + 0.1), count: 10, colors: [o.color ?? 0xffe9a0, 0xffffff], speed: 0.6, size: 0.014, star: 1, life: 0.7 });
  }

  /** A short point-light flash (lighting, not a sprite). */
  flash(o) {
    const l = new THREE.PointLight(o.color ?? 0xffffff, o.intensity ?? 6, o.distance ?? 3, 1.5);
    l.position.copy(o.pos);
    this.scene.add(l);
    this.lights.push({ l, t: 0, dur: o.dur || 0.5, base: o.intensity ?? 6 });
  }

  /** Dust / smoke puffs. opts: pos, count, color(s), size, speed, up, gravity (negative rises), life, radius. */
  puff(o) {
    const colors = o.colors || [o.color ?? DUST[0]];
    for (let k = 0; k < (o.count || 6); k++) {
      _d.set(Math.random() - 0.5, Math.random() * 0.5, Math.random() - 0.5).normalize().multiplyScalar((o.speed ?? 0.3) * rnd(0.5, 1.2));
      const r = o.radius || 0.03;
      this.fx.emit({
        sprite: 'puff', x: o.pos.x + (Math.random() - 0.5) * r, y: o.pos.y + (Math.random() - 0.5) * r, z: o.pos.z + (Math.random() - 0.5) * r,
        vx: _d.x, vy: _d.y + (o.up ?? 0.1), vz: _d.z, drag: o.drag ?? 2.5, gravity: o.gravity ?? -0.05,
        color: pick(colors), life: (o.life ?? 1) * rnd(0.7, 1.2), size: (o.size ?? 0.05) * rnd(0.8, 1.25), flip: true, fade: 0.3,
      });
    }
  }

  /** Little pixel hearts that pop up and drift upwards, swaying. */
  hearts(o) {
    for (let k = 0; k < (o.count || 3); k++) {
      const sway = rnd(0.5, 1) * (Math.random() < 0.5 ? -1 : 1), x0 = (Math.random() - 0.5) * (o.spread ?? 0.08);
      const z0 = (Math.random() - 0.5) * (o.spread ?? 0.08), base = o.pos.clone();
      const rise = o.rise ?? rnd(0.12, 0.2);
      this.fx.emit({
        sprite: 'heart', pos: base, life: (o.life ?? 1.4) * rnd(0.8, 1.2), size: (o.size ?? 0.035) * rnd(0.85, 1.15),
        seq: [0, 1, 1, 1, 2, 2, 3, 3], fade: 0.3, data: { t0: k * 0.12 },
        update: (p) => {
          const u = Math.max(0, p.age - p.data.t0);
          p.alpha = u > 0 ? 1 : 0;
          p.x = base.x + x0 + Math.sin(u * 4) * 0.015 * sway; p.y = base.y + u * rise; p.z = base.z + z0;
        },
      });
    }
  }

  /** A splash where liquid hits something: a crown, then droplets thrown up that fall back. */
  splash(o) {
    const c = o.color ?? 0xfffaf0, sz = o.size ?? 0.05;
    this.fx.emit({ sprite: 'splash', pos: o.pos, color: c, life: 0.32, size: sz, fade: 0.2, flip: true });
    for (let k = 0; k < (o.count ?? 4); k++) {
      const a = Math.random() * Math.PI * 2, sp = rnd(0.25, 0.7) * (o.speed ?? 1);
      this.fx.emit({
        sprite: 'bead', x: o.pos.x, y: o.pos.y + 0.005, z: o.pos.z, vx: Math.cos(a) * sp, vy: rnd(0.6, 1.3) * (o.speed ?? 1), vz: Math.sin(a) * sp,
        gravity: 9.81, floor: true, color: c, life: rnd(0.35, 0.6), size: sz * 0.12, seq: [0, 0, 1], fade: 0.2,
      });
    }
  }

  /** One floating mark over someone's head: 'zz', 'anger', 'bang', 'note', 'heart'. */
  mark(o) {
    const base = o.pos.clone(), dx = o.dx ?? 0.03;
    return this.fx.emit({
      sprite: o.sprite || 'zz', pos: base, color: o.color ?? 0xffffff, life: o.life ?? 1.6, size: o.size ?? 0.04,
      anim: o.anim || 'loop', fps: o.fps ?? 3, fade: 0.3, fadeIn: o.fadeIn ?? 0.1, follow: o.follow || null,
      update: o.follow ? null : (p) => { const u = p.age / p.life; p.x = base.x + Math.sin(u * 5) * dx * 0.3 + u * dx; p.y = base.y + u * (o.rise ?? 0.08); p.z = base.z; },
    });
  }

  /**
   * Ambient motes drifting in a box (dust in a sunbeam): opts { count, min, max (Vector3), colors, size, lit(x, y, z)
   * -> 0..1 brightness, visible() -> bool }. They live forever; returns the field ({ dispose() }).
   */
  motes(o) {
    const F = { list: [], o, on: true };
    const colors = o.colors || [0xfff0d0];
    const mn = o.min, mx = o.max;
    for (let i = 0; i < (o.count || 200); i++) {
      const home = new THREE.Vector3(rnd(mn.x, mx.x), rnd(mn.y, mx.y), rnd(mn.z, mx.z)), seed = Math.random() * 100;
      const c = new THREE.Color(pick(colors));
      const p = this.fx.emit({
        sprite: Math.random() < 0.35 ? 'dot' : 'mote', pos: home, life: 1e9, size: (o.size ?? 0.006) * rnd(0.7, 1.3), color: c, anim: 'hold',
        frame: Math.random() < 0.5 ? 0 : 1, fade: 0,
        update: (q, dt) => {
          const t = this.fx.t;
          q.x = home.x + Math.sin(t * 0.13 + seed) * 0.25; q.y = home.y + Math.sin(t * 0.09 + seed * 1.7) * 0.18; q.z = home.z + Math.cos(t * 0.11 + seed * 0.7) * 0.25;
          const lit = o.lit ? o.lit(q.x, q.y, q.z) : 1, tw = 0.5 + 0.5 * Math.sin(t * 0.8 + seed * 3);
          q.alpha = F.on ? Math.max(0, lit * (0.25 + 0.75 * tw)) : 0;
          void dt;
        },
      });
      if (p) F.list.push(p);
    }
    F.dispose = () => { for (const p of F.list) this.fx.kill(p); F.list = []; };
    this.fields.push(F);
    return F;
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

  update(dt) {
    for (const F of this.fields) F.on = F.o.visible ? F.o.visible() : true;
    this.fx.update(dt);
    this.updateLights(dt);
  }
}
