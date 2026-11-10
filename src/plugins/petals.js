// Falling cherry petals: while the somei-yoshino in the park are in bloom, single petals let go of the crowns and
// tumble down, drifting with the breeze, and settle on the ground. Each petal is the pixel-art petal sprite of the
// particle atlas (src/gfx/pixfx.js: four hand-pixelled frames, stepped), so nothing here is a soft particle.
// Only the trees within ~22 m of the camera shed; by daylight more than at dusk, none at night.
import { Game } from '../game/Game.js';
import { SAKURA_SPOTS } from '../town/foliage.js';

export function install(game) {
  let acc = 0, wind = 0, t = 0;
  Game.updaters.push((g, dt) => {
    if (!g.effects || !SAKURA_SPOTS.length || !g.camera) return;
    t += dt;
    const light = g.clock?.daylight?.() ?? 1;
    if (light < 0.15) return;
    // a slow breeze that swells and drops; gusts shake more petals loose
    wind = 0.25 + 0.2 * Math.sin(t * 0.21) + 0.12 * Math.sin(t * 0.83 + 1.3);
    const cam = g.camera.position;
    for (const T of SAKURA_SPOTS) {
      const d = Math.hypot(T.x - cam.x, T.z - cam.z);
      if (d > 22) continue;
      acc += dt * (1.6 + 2.4 * wind) * light * (T.r / 2.6);
      while (acc >= 1) {
        acc -= 1;
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * T.r;
        g.effects.emit({
          sprite: 'petal', x: T.x + Math.cos(a) * r, y: T.y0 + Math.random() * (T.y1 - T.y0), z: T.z + Math.sin(a) * r,
          vx: wind * (0.6 + Math.random() * 0.5), vy: -0.15, vz: wind * 0.35 * (Math.random() - 0.3),
          gravity: 0.35, drag: 1.4, flutter: 0.9, floor: true, life: 7 + Math.random() * 3, size: 0.032,
          anim: 'loop', fps: 5 + Math.random() * 3, landFrame: 2, fade: 0.25, flip: true,
        });
      }
    }
  });
}
