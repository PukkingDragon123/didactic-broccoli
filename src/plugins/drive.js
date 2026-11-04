// The playable drive into town (src/drive/): game.drive. The new-game flow calls game.drive.start(); see
// src/drive/Drive.js for the API and events. Test helpers on dbg.drive (with ?debug / ?autotest):
//   dbg.drive.start(opts)  .at('crossing' | metres)  .auto(on)  .run(seconds)  .skip()  .leave()  .state()  .hold(key, on)
import { Drive } from '../drive/Drive.js';
import { Game } from '../game/Game.js';

export function install(game) {
  if (game.drive) return;
  const drive = game.drive = new Drive(game);
  Game.updaters.push((g, dt) => drive.update(dt));
  const helpers = {
    start(opts = {}) { drive.start(opts).then(() => { helpers.resolved = true; }); helpers.resolved = false; return drive.state; },
    at(where, opts) { return drive.teleport(where, opts); },
    auto(on = true) { drive.auto = !!on; return drive.auto; },
    skip() { drive.skip(); return drive.state; },
    leave() { drive.leave(); return drive.state; },
    /** Hold (or release) a key, as if pressed: hold('KeyW', true). */
    /** A debug camera (world pos / look-at), or cam(null) to go back to the driver's eye. */
    cam(pos, look, fov) { drive.debugCam = pos ? { pos: { x: pos[0], y: pos[1], z: pos[2] }, look: { x: look[0], y: look[1], z: look[2] }, fov } : null; if (drive.debugCam) { const V = drive.game.camera.position.constructor; drive.debugCam.pos = new V(...pos); drive.debugCam.look = new V(...look); } return !!drive.debugCam; },
    /** Triangles and draw calls: the zone's meshes (largest first) and the whole frame. */
    stats() {
      const g = drive.game, r = g.renderer.renderer, out = [];
      drive.country?.group.traverse((o) => {
        if (!o.isMesh && !o.isLine) return;
        const geo = o.geometry, tris = (geo.index ? geo.index.count : geo.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
        out.push([o.name || o.parent?.name || o.type, Math.round(tris), Array.isArray(o.material) ? o.material.length : 1]);
      });
      out.sort((a, b) => b[1] - a[1]);
      r.info.autoReset = false; r.info.reset(); g.renderer.render(0, g.time);
      const all = { calls: r.info.render.calls, tris: r.info.render.triangles };
      if (drive.country) { drive.country.group.visible = false; r.info.reset(); g.renderer.render(0, g.time); all.without = { calls: r.info.render.calls, tris: r.info.render.triangles }; drive.country.group.visible = true; }
      r.info.autoReset = true;
      return { all, top: out.slice(0, 14), n: out.length };
    },
    hold(code, on = true) { if (on) { game.input.keys.add(code); game.input.pressed.add(code); } else game.input.keys.delete(code); return [...game.input.keys]; },
    /** Fast-forward without rendering (fixed 1/60 s steps); stops early once parked. */
    run(sec, until = 'seated') {
      const n = Math.round(sec * 60);
      for (let i = 0; i < n; i++) { game.update(1 / 60); if (drive.state === until) break; }
      game.scene.updateMatrixWorld();
      return helpers.state();
    },
    state() {
      const P = drive.phys, C = drive.country, X = C?.crossing;
      const q = C ? C.main.nearest(P.x, P.z, {}) : null;
      return {
        state: drive.state, resolved: helpers.resolved, x: +P.x.toFixed(2), z: +P.z.toFixed(2), h: +P.h.toFixed(3), kmh: +P.kmh.toFixed(1), gear: P.gear,
        s: q ? +q.s.toFixed(1) : null, d: q ? +q.d.toFixed(2) : null, crossing: X?.state, train: C?.train?.state, trucks: C?.trucks?.length ?? 0,
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
