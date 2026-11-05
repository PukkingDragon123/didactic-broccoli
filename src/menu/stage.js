// The title screen's set dressing: the lane at dusk with the garage lit up. Everything here is borrowed from the
// running game for as long as the menu is up and handed back exactly as it was (nothing is saved while borrowed):
//   * the time of day: the clock's sun is pinned just after sunset (a lilac sky, the street lamps coming on); the
//     clock's own state (state.clock) is never written, so a save made meanwhile keeps the real time
//   * the garage: the shutter half rolled, the tubes on (a dead tube lit for the shot), warm light spilling out under
//     the shutter (the existing bounce light, warmed), the noren, lanterns and the twin gacha out front
//   * the parked van, the lane's own cat (our Mikan sleeps on the bench instead) and Grandpa step out of the shot
// No light is added or removed (that would recompile every shader): only existing lights are re-tuned.
//   const st = stageDusk(game);  ...  st.restore()
import * as THREE from 'three';
import { sunDir } from '../sim/sky.js';

const DUSK_ALT = -1.9; // degrees: the sun just under the horizon (a lilac sky, the lamps just on)

export function stageDusk(game) {
  const g = game, G = g.garage, T = G.town, L = g.lighting, C = g.clock;
  const undo = [];
  const keep = (fn) => undo.push(fn);

  // ---- time of day: a fixed sun a little below the horizon toward the lane's west end
  if (C && L) {
    const yd = g.calendar?.yearDay?.(C.day) ?? 91;
    // find the hour after noon where the sun sits at DUSK_ALT (a few bisection steps)
    let lo = 12, hi = 21;
    for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; const d = sunDir(yd, m, new THREE.Vector3()); if (Math.asin(d.y) * 180 / Math.PI > DUSK_ALT) lo = m; else hi = m; }
    const hour = (lo + hi) / 2;
    const sun = { dir: sunDir(yd, hour, new THREE.Vector3()), alt: DUSK_ALT, rise: 6, set: hour - 0.3, key: 'menu' };
    const had = Object.prototype.hasOwnProperty.call(C, 'sun');
    C.sun = () => sun;
    Object.defineProperty(C, 'hours', { get: () => hour, configurable: true });
    keep(() => { if (had) return; delete C.sun; delete C.hours; });
    // a touch more exposure and sky fill than the real dusk (it is a poster, and it has to read on a phone)
    const updateSky = L.updateSky;
    L.updateSky = function () {
      updateSky.call(this);
      if (this.look) { this.state.exp = this.look.exp * 1.14; }
    };
    const update = L.update;
    const warm = new THREE.Color(0xffb46e);
    L.update = function (dt, t) {
      update.call(this, dt, t);
      const LL = G.lights;
      // the garage glows: warm light pooling out under the half-rolled shutter onto the apron and the lane
      if (LL.bounce) { LL.bounce.intensity = 6.5; LL.bounce.color.copy(warm); }
      if (LL.hemi) LL.hemi.intensity *= 1.12;
    };
    keep(() => { delete L.updateSky; delete L.update; L.refresh(); });
    L.refresh();
  }

  // ---- the garage front: half rolled, lit, open for business
  const shutter = G.shutterOpen;
  G.setShutter(0.56);
  keep(() => G.setShutter(Math.max(0, shutter), true));
  const lightsOn = G.lightsOn;
  const dead = G.lights.tubes.map((t) => t.dead);
  for (const t of G.lights.tubes) t.dead = false;
  G.setLights(true);
  keep(() => { G.lights.tubes.forEach((t, i) => { t.dead = dead[i]; }); G.setLights(lightsOn); });
  if (T?.setShopOpen) {
    const open = T.shopOpen;
    T.setShopOpen(true);
    keep(() => T.setShopOpen(open));
  }

  // ---- no soft halos round the bulbs and lanterns in the poster shot (pixel-crisp light only)
  // (a quality change in Settings builds a new bloom pass: tame that one too, and hand it back at its own strength)
  const tamed = new Map();
  const tame = () => { const b = g.renderer?.bloom; if (b && !tamed.has(b)) { tamed.set(b, b.strength); b.strength = Math.min(b.strength, 0.07); } };
  tame();
  keep(() => { for (const [b, k] of tamed) b.strength = k; });

  // ---- you (the first-person player) wait well out of the lane: the street's pigeons would keep taking off in front of
  // the camera from where you stand, and the garage's warm room fill follows you indoors
  // (anything that places you meanwhile, like the morning routine's first tick, is kept for when the menu hands back)
  const P = g.player?.pos, AWAY = 42, was = P?.clone();
  const away = () => { if (!P) return; if (P.z !== AWAY) { was.copy(P); P.set(0, 0, AWAY); } };
  away();
  if (P) keep(() => P.copy(was));

  // ---- out of the shot
  const hide = (o) => { if (!o) return; const v = o.visible; o.visible = false; keep(() => { o.visible = v; }); };
  hide(g.life?.van?.root);
  hide(g.street?.cat?.g);
  // Grandpa waits out front on a new game's first afternoon; the title is a later evening (the arrival brings him on)
  hide(g.grandpa?.gp?.h?.root);

  return {
    update() { tame(); away(); },
    restore() { while (undo.length) { try { undo.pop()(); } catch (e) { console.warn('menu stage restore', e); } } },
  };
}
