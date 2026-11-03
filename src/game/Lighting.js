// Drives the light rig: the time of day (sun / moon, sky, fog, ambient, the town's lamps and windows) from game.clock,
// plus the dramatic moments: flicker, blackout, glow-in-the-dark showcases.
//
// Cheap by design: the time-of-day look is recomputed 4 times a second (the clock moves about a minute a second), and
// only intensities, colours and uniforms change. No light is ever added, removed or hidden at runtime, so switching
// lamps never recompiles a shader. The per-frame part is just the dim / flicker multipliers.
//
// It also brings up the shop simulation (src/sim/: game.clock, calendar, bills, progress, sim) as soon as the world
// exists, so every later system can rely on it.
import * as THREE from 'three';
import { glowUniform } from '../voxel/materials.js';
import { skyLook } from '../sim/sky.js';
import { createSim } from '../sim/index.js';

const GOLDEN = new THREE.Vector3(-5.5, 5.2, 14).sub(new THREE.Vector3(0.5, 0, 0)).normalize(); // the original low sun
const _v = new THREE.Vector3(), _c = new THREE.Color();
const MOON = new THREE.Color(0x8ea8e8);

export class Lighting {
  constructor(game) {
    this.game = game;
    this.dimLevel = 0; // 0 = normal, 1 = blackout
    this.dimTarget = 0;
    this.flickerT = 0;
    this.glowBoost = 0;
    this.base = null;
    this.skyT = 0;
    this.look = null;
    this.state = { sunI: 3, moonI: 0, hemiI: 0.75, night: 0, day: 1, sunIn: 1, env: 0.85, exp: 1 };
    this.sunDir = GOLDEN.clone();
    this.moonDir = new THREE.Vector3(0.5, 0.6, -0.6).normalize();
    this.twinkle = 0;
    createSim(game);
  }

  capture() {
    const L = this.game.garage.lights;
    this.base = { sun: L.sun.intensity, hemi: L.hemi.intensity, desk: L.desk.intensity, bounce: 2.0 };
    this.target0 = L.sun.target.position.clone();
    // the garage's frosted side window glows with the sun behind it: find its (shared, baked) material once
    this.winGlass = null;
    this.game.garage.group.traverse((o) => {
      const m = o.material;
      if (!this.winGlass && m && !Array.isArray(m) && m.emissiveMap && m.emissive?.getHex() === 0xffc890) this.winGlass = { m, k: m.emissiveIntensity, col: m.emissive.clone() };
    });
  }

  flicker(dur = 0.6) { this.flickerT = Math.max(this.flickerT, dur); }
  dim(on, speed = 4) { this.dimTarget = on ? 1 : 0; this.dimSpeed = speed; }
  /** Recompute the time-of-day look on the next frame (after a time skip). */
  refresh() { this.skyT = 0; }

  /** The time-of-day look (4 Hz). */
  updateSky() {
    const g = this.game, c = g.clock;
    if (!c) return;
    const sun = c.sun();
    this.sunDir.copy(sun.dir);
    const morning = c.hours < 12;
    this.look = skyLook(sun.alt, morning, this.look);
    const L = this.look, S = this.state;
    // the moon rides opposite the sun, never too low
    this.moonDir.set(-sun.dir.x, Math.max(0.42, -sun.dir.y * 0.8 + 0.3), -sun.dir.z).normalize();
    S.night = L.night; S.day = L.day;
    S.sunI = L.si;
    S.moonI = 0.42 * Math.min(1, Math.max(0, (-sun.alt - 3) / 8));
    // how much the sun is shining in through the shutter (the lane side) and how close it is to the original golden shot
    S.sunIn = Math.max(0, sun.dir.z) * Math.min(1, Math.max(0, sun.alt / 6));
    S.golden = Math.pow(Math.max(0, this.sunDir.dot(GOLDEN)), 6) * Math.min(1, Math.max(0, sun.alt / 6));
    S.env = L.env; S.exp = L.exp;
    this.twinkle = Math.floor(g.time * 1.5);
    // garage tubes and lanterns have no power after a cut-off
    const power = g.bills?.powerOn !== false;
    g.garage.town?.applySky?.({ ...L, sunDir: this.sunDir, moonDir: this.moonDir, sunK: Math.min(1, S.sunI / 2.6), moonK: Math.min(1, L.night * 1.2), twinkle: this.twinkle, power });
    // fog, sky behind everything
    const fog = g.scene.fog;
    if (fog) { fog.color.copy(L.fog); fog.near = 25 - 7 * L.night; fog.far = 110 - 20 * L.night; }
    if (g.scene.background?.isColor) g.scene.background.copy(L.fog);
    // god rays from the sun only, in its colour
    const r = g.renderer;
    if (r.outline) {
      r.outline.uniforms.uShaftCol.value.copy(L.sun).lerp(_c.setRGB(1, 0.72, 0.42), 0.5);
      r.outline.uniforms.uShaft.value = 0.75 * Math.min(1, S.sunI / 2.6) * (S.sunI >= S.moonI * 4 ? 1 : 0);
    }
    if (r.grade) r.grade.uniforms.uWarm.value = L.warm;
    // garage window shafts and the warm pool under the shutter only exist while the low sun shines in
    const G = g.garage;
    if (G.shaftMat) G.shaftMat.uniforms.uStrength.value = 0.13 * S.golden;
    // the frosted window: warm daylight behind it by day, a faint moonlit blue at night
    const W = this.winGlass;
    if (W) { W.m.emissiveIntensity = W.k * (0.12 + 0.88 * S.day); W.m.emissive.copy(W.col).lerp(_c.setHex(0x51608a), S.night); }
    if (G.pool) G.pool.material.uniforms.uColor.value.setHex(0xffcf98).multiplyScalar(Math.max(0, G.shutterOpen) * Math.min(1, S.sunIn * 1.3 + 0.15 * S.day));
  }

  update(dt, t) {
    if (!this.base) this.capture();
    const g = this.game;
    const L = g.garage.lights;
    this.skyT -= dt;
    if (this.skyT <= 0) { this.skyT = 0.25; this.updateSky(); }
    const S = this.state, look = this.look;
    const power = g.bills?.powerOn !== false;
    this.dimLevel += (this.dimTarget - this.dimLevel) * Math.min(1, dt * (this.dimSpeed || 4));
    let tubeK = g.garage.lightsOn && power ? 1 : 0;
    if (this.flickerT > 0) {
      this.flickerT -= dt;
      tubeK *= Math.random() < 0.45 ? 0.08 : 1;
    }
    const d = 1 - this.dimLevel * 0.93;
    for (const tb of L.tubes) {
      const k = tb.dead ? 0 : tubeK; // a dead tube stays dark until it's replaced
      tb.light.intensity = tb.base * k * d;
      tb.mat.color.setScalar(0.15 + 2.05 * k * d);
    }
    const lightsK = g.garage.lightsOn && power ? 1 : 0;
    // the sun by day, the moon by night (one shadow-casting light, so the renderer's god rays keep finding it)
    const sun = L.sun, useMoon = S.moonI > S.sunI;
    const dir = useMoon ? this.moonDir : this.sunDir;
    sun.position.copy(this.target0).addScaledVector(dir, 16);
    if (look) sun.color.copy(useMoon ? MOON : look.sun);
    const sunI = look ? (useMoon ? S.moonI : S.sunI) : this.base.sun;
    sun.intensity = sunI * (1 - this.dimLevel * 0.85) * (1 - (this.museumBlend || 0));
    if (look) { L.hemi.color.copy(look.hs); L.hemi.groundColor.copy(look.hg); }
    const hemiI = look ? look.hi : this.base.hemi;
    L.hemi.intensity = hemiI * (0.42 + 0.58 * lightsK) * (1 - this.dimLevel * 0.8);
    L.desk.intensity = this.base.desk * (power ? 1 : 0) * (1 - this.dimLevel * 0.9);
    // daylight bouncing in under the shutter only when it's rolled up (warm when the sun shines in, cool skylight else)
    const bounceK = look ? Math.min(1, S.sunIn * 1.2 + 0.3 * S.day) : 1;
    L.bounce.intensity = this.base.bounce * bounceK * (1 - this.dimLevel * 0.8) * Math.max(0, g.garage.shutterOpen);
    if (look) L.bounce.color.copy(look.sun).lerp(look.hs, 1 - Math.min(1, S.sunIn * 1.5));
    // ambient reflections (the baked garage probe): dimmer at night, a little help from the room lights
    g.scene.environmentIntensity = (look ? S.env + lightsK * 0.12 * S.night : 0.85) * (1 - this.dimLevel * 0.6);
    if (g.renderer.grade) g.renderer.grade.uniforms.uExposure.value = (look ? S.exp : 1) * (1 - this.dimLevel * 0.25);
    // glow-in-the-dark finish responds to darkness
    const darkness = Math.max(this.dimLevel, lightsK ? 0 : 0.45 + 0.25 * (S.night || 0));
    this.glowBoost = Math.max(0, this.glowBoost - dt * 0.3);
    glowUniform.value = 0.6 + darkness * 2.4 + this.glowBoost + Math.sin(t * 2) * 0.05;
    g.museum?.updateLighting?.(this.dimLevel);
  }
}
