// Drives the garage/museum light rig for dramatic moments: flicker, blackout, glow-in-the-dark showcases.
import { glowUniform } from '../voxel/materials.js';

export class Lighting {
  constructor(game) {
    this.game = game;
    this.dimLevel = 0; // 0 = normal, 1 = blackout
    this.dimTarget = 0;
    this.flickerT = 0;
    this.glowBoost = 0;
    this.base = null;
  }

  capture() {
    const L = this.game.garage.lights;
    this.base = {
      sun: L.sun.intensity, hemi: L.hemi.intensity, desk: L.desk.intensity, bounce: L.bounce.intensity,
    };
  }

  flicker(dur = 0.6) { this.flickerT = Math.max(this.flickerT, dur); }
  dim(on, speed = 4) { this.dimTarget = on ? 1 : 0; this.dimSpeed = speed; }

  update(dt, t) {
    if (!this.base) this.capture();
    const g = this.game;
    const L = g.garage.lights;
    this.dimLevel += (this.dimTarget - this.dimLevel) * Math.min(1, dt * (this.dimSpeed || 4));
    let tubeK = g.garage.lightsOn ? 1 : 0;
    if (this.flickerT > 0) {
      this.flickerT -= dt;
      tubeK *= Math.random() < 0.45 ? 0.08 : 1;
    }
    const d = 1 - this.dimLevel * 0.93;
    for (const tb of L.tubes) {
      tb.light.intensity = tb.base * tubeK * d;
      tb.mat.color.setScalar(0.15 + 2.05 * tubeK * d);
    }
    const lightsOn = g.garage.lightsOn ? 1 : 0.45;
    L.sun.intensity = this.base.sun * (1 - this.dimLevel * 0.85) * (1 - (this.museumBlend || 0));
    L.hemi.intensity = this.base.hemi * (0.35 + 0.65 * lightsOn) * (1 - this.dimLevel * 0.8);
    L.desk.intensity = this.base.desk * (1 - this.dimLevel * 0.9);
    L.bounce.intensity = this.base.bounce * (1 - this.dimLevel * 0.8);
    if (g.renderer.grade) g.renderer.grade.uniforms.uExposure.value = 1 - this.dimLevel * 0.25;
    // glow-in-the-dark finish responds to darkness
    const darkness = Math.max(this.dimLevel, g.garage.lightsOn ? 0 : 0.7);
    this.glowBoost = Math.max(0, this.glowBoost - dt * 0.3);
    glowUniform.value = 0.6 + darkness * 2.4 + this.glowBoost + Math.sin(t * 2) * 0.05;
    g.museum?.updateLighting?.(this.dimLevel);
  }
}
