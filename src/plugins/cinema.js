// Cinematic presentation (src/cinema): letterboxed moves for the moments that matter (the first machine, level-ups,
// the first secret pull's showcase), music stings, subtitle pacing, a dutch angle for every cutscene, and photo mode
// (P). Everything is skippable; "Cinematic moments" in the pause menu turns the optional ones off.
// dbg.cinema: machine(), level(n), secret(), beat(), card(t, s, stamp), photo(filter), snap(), sting(kind).
import { Game } from '../game/Game.js';
import { Cinema } from '../cinema/index.js';
import { SERIES } from '../data/series/index.js';

export function install(game) {
  const g = game;
  const cine = g.cinema = new Cinema(g);
  Game.updaters.push((game, dt) => cine.update(dt));
  setTimeout(() => {
    if (!g.debug) return;
    const M = cine.moments;
    g.debug.cinema = {
      machine(i = 0) { const m = g.machines[i]; if (!m) return 'no machine'; g.cutscene.play((c) => M.machineScene(c, m), { skippable: true }); return true; },
      level(n = 5) { g.cutscene.play((c) => M.levelScene(c, n), { skippable: true }); return n; },
      beat() { M.beat('rise'); },
      card(t = 'Level 5', s = 'The shop levels up', stamp = '昇') { const w = M.card(t, s, stamp, 4); let k = 0; const tick = () => { if (!w.update(1 / 30) && k++ < 200) setTimeout(tick, 33); }; tick(); },
      /** The first-secret showcase on whatever figure is in your hand (or a fresh capsule's). */
      secret(series = null) {
        delete cine.s.firsts.secret;
        const sid = series || SERIES.find((s) => s.items.some((it) => it.rarity === 'secret'))?.id;
        const d = g.debug.capsule(sid, 'secret'); g.debug.open(); return d;
      },
      photo(filter = null) { if (!cine.photo.active) cine.photo.enter(); if (filter !== null) { const i = ['', 'gekiga', 'impact', 'pocket', 'sepia', 'pixel', 'neon', 'negative'].indexOf(filter); cine.photo.fi = Math.max(0, i); g.jojo?.impact.filter(filter || null); cine.photo.render(); } return cine.photo.active; },
      photoPose(name) { cine.photo.S?.h.gesture(name, { hold: true }); cine.photo.pose = name; cine.photo.render(); },
      photoCam(x, y, z, yaw, pitch, fov = 50) { const P = cine.photo; P.cam.pos.set(x, y, z); P.yaw = yaw; P.pitch = pitch; P.fov = fov; P.apply(); },
      snap(stay = false) { cine.photo.snap(stay); },
      exitPhoto() { cine.photo.exit(); },
      sting(kind) { cine.sting(kind); },
    };
  }, 0);
}
