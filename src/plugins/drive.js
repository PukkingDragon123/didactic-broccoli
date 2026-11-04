// The playable arrival in the lane (src/drive/): game.drive. The new-game flow calls game.drive.start(); see
// src/drive/Drive.js for the API and events. Test helpers on dbg.drive (with ?debug / ?autotest):
//   dbg.drive.start(opts)  .at('start' | 'mid' | 'garage' | x)  .auto(on)  .run(seconds, untilState)  .skip()  .leave()
//   .state()  .hold(key, on)  .cam([x, y, z], [x, y, z], fov) / .cam(null)  .stats()
import { Drive } from '../drive/Drive.js';
import { Game } from '../game/Game.js';

export function install(game) {
  if (game.drive) return;
  const drive = game.drive = new Drive(game);
  Game.updaters.push((g, dt) => drive.update(dt));
  const helpers = {
    start(opts = {}) { helpers.resolved = false; drive.start(opts).then(() => { helpers.resolved = true; }); return drive.state; },
    at(where, opts) { return drive.teleport(where, opts); },
    auto(on = true) { drive.auto = !!on; return drive.auto; },
    skip() { drive.skip(); return drive.state; },
    leave() { drive.leave(); return drive.state; },
    /** Hold (or release) a key, as if pressed: hold('KeyW', true). */
    hold(code, on = true) { if (on) { game.input.keys.add(code); game.input.pressed.add(code); } else game.input.keys.delete(code); return [...game.input.keys]; },
    /** Fast-forward without rendering (fixed 1/60 s steps); stops early once the drive reaches `until`. */
    run(sec, until = 'seated') {
      const n = Math.round(sec * 60);
      for (let i = 0; i < n; i++) { game.update(1 / 60); if (drive.state === until) break; }
      game.scene.updateMatrixWorld();
      return helpers.state();
    },
    /** A debug camera (world pos / look-at), or cam(null) to go back to the driver's eye. */
    cam(pos, look, fov) {
      const V = game.camera.position.constructor;
      drive.debugCam = pos ? { pos: new V(...pos), look: new V(...look), fov } : null;
      return !!drive.debugCam;
    },
    /** Draw calls and triangles of one frame. */
    stats() {
      const r = game.renderer.renderer;
      r.info.autoReset = false; r.info.reset(); game.renderer.render(0, game.time);
      const out = { calls: r.info.render.calls, tris: r.info.render.triangles, memory: { ...r.info.memory } };
      r.info.autoReset = true;
      return out;
    },
    state() {
      const P = drive.phys;
      return {
        state: drive.state, resolved: helpers.resolved, x: +P.x.toFixed(2), z: +P.z.toFixed(2), h: +P.h.toFixed(3), kmh: +P.kmh.toFixed(1), gear: P.gear, rpm: Math.round(P.rpm),
        fade: +(+document.getElementById('fade')?.style.opacity || 0).toFixed(2), van: drive.van?.root.position.toArray().map((v) => +v.toFixed(2)),
      };
    },
  };
  drive.debug = helpers;
  // the debug hub is installed right after the plugins run
  let tries = 0;
  const attach = () => { if (game.debug) { game.debug.drive = helpers; return; } if (++tries < 50) setTimeout(attach, 200); };
  setTimeout(attach, 0);
}
