// The new game's opening (src/arrival/): game.arrival, played by Story.newGame before Grandpa's window tap. Its cab
// look (glass, shade, your arms) follows the camera every frame until you're out of the van.
// Debug (with ?debug / ?autotest): dbg.arrival.*
//   dbg.arrival.shots                 the shot list [{ id, at, dur, what }] (seconds from the start)
//   dbg.arrival.newGame(auto)         the whole flow: story.newGame() (opening, tap, meeting, story; auto picks choices)
//   dbg.arrival.play()                the opening alone, as its own cutscene
//   dbg.arrival.hold(on)              freeze the live loop (no updates, no renders) for repeatable snapshots
//   dbg.arrival.step(sec)             advance the game in 1/30 s steps (works while held)
//   dbg.arrival.at(t)                 start the whole flow if it isn't running, step to t seconds into the opening
//   dbg.arrival.shot(id, k)           the same, to fraction k (0..1, default 0.5) of shot `id`
//   dbg.arrival.skip()                hold to skip, as the player would
//   dbg.arrival.state()               { active, seated, shot, t, cine, fade, grandpa, step }
import { Game } from '../game/Game.js';
import { Arrival, SHOTS, LENGTH } from '../arrival/Arrival.js';

export function install(game) {
  if (game.arrival) return;
  const arrival = game.arrival = new Arrival(game);
  Game.updaters.push((g, dt) => arrival.update(dt));
  const update = Game.prototype.update;
  const helpers = {
    shots: SHOTS,
    length: LENGTH,
    newGame(auto = true) {
      helpers.done = false; helpers.started = true;
      game.story.newGame().then(() => { helpers.done = true; });
      if (auto) game.debug?.grandpa?.autoPick(true);
      return true;
    },
    play() { helpers.done = false; helpers.started = true; arrival.play().then(() => { helpers.done = true; }); return true; },
    hold(on = true) {
      if (on) { game.update = () => {}; game.render = () => {}; } else { delete game.update; delete game.render; }
      return on;
    },
    step(sec, dt = 1 / 30) {
      const n = Math.round(sec / dt);
      for (let i = 0; i < n; i++) update.call(game, dt);
      game.scene.updateMatrixWorld();
      return helpers.state();
    },
    at(t, dt = 1 / 30) {
      if (!helpers.started) helpers.newGame(true);
      for (let i = 0; i < 20000; i++) {
        if (arrival.active ? arrival.t >= t : arrival.runs > 0) break; // there, or the opening is over
        update.call(game, dt);
      }
      game.scene.updateMatrixWorld();
      return helpers.state();
    },
    shot(id, k = 0.5) { const S = SHOTS.find((s) => s.id === id); return S ? helpers.at(S.at + S.dur * k) : SHOTS.map((s) => s.id); },
    skip() { game.cutscene.skipping = true; return true; },
    state() {
      const gp = game.grandpa;
      return {
        active: arrival.active, seated: arrival.seated, shot: arrival.shot?.id || null, t: +arrival.t.toFixed(2),
        cine: game.cutscene.active, fade: +(+document.getElementById('fade')?.style.opacity || 0).toFixed(2),
        grandpa: gp ? { mode: gp.mode, met: gp.s.met, pos: gp.gp ? [+gp.gp.pos.x.toFixed(2), +gp.gp.pos.z.toFixed(2)] : null } : null,
        step: game.story.step?.(), talk: !!game.talk?.active, done: !!helpers.done,
      };
    },
  };
  arrival.debug = helpers;
  // the debug hub is installed right after the plugins run
  let tries = 0;
  const attach = () => { if (game.debug) { game.debug.arrival = helpers; return; } if (++tries < 50) setTimeout(attach, 200); };
  setTimeout(attach, 0);
}
