// The rooms for the renderer's room lighting (src/gfx/roomGI.js: bounce light from a probe volume, a box-projected
// reflection probe, real shadowed lamps): each interior's box, its lamps and what its light depends on (the key: a
// change rebakes it). The garage and Mikawa-ya are on the lane (picked when you're in or near them); the others are
// the interiors off the map (src/places, src/growth: picked while you're in them).
import * as THREE from 'three';
import { GARAGE } from '../world/Garage.js';
import { MK } from '../world/CornerShop.js';
import { ROOM } from '../room/build.js';
import { ORIGINS } from '../growth/data.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const box = (x0, y0, z0, x1, y1, z1) => new THREE.Box3(V(x0, y0, z0), V(x1, y1, z1));
// a ceiling lamp as a downward spot: full light in a cone under it, fading out toward the walls' tops
const LAMP_K = 3.6; // the old painted lamp term's intensity -> candela-ish (about the same light on the floor under it)
const lamp = (L, o = {}) => L && {
  p: [L.x + (o.dx ?? 0), L.y + (o.dy ?? 0), L.z + (o.dz ?? 0)], color: o.color ?? L.color ?? 0xffe8c8,
  i: (L.intensity ?? 1) * Math.max(0, L.k ?? 1) * LAMP_K * (o.s ?? 1), angle: o.angle ?? 1.32, pen: o.pen ?? 0.55, range: o.range ?? 7, soft: o.soft,
};

export function install(game) {
  const gi = game.renderer?.gi;
  if (!gi) return;
  const G = game.garage, Lg = game.lighting;
  const P = () => game.places;
  const def = (id) => P()?.list?.[id];
  const hour = (step = 0.5) => Math.round((game.clock?.hours ?? 12) / step);
  const night = () => Math.round((Lg?.state?.night ?? 0) * 4);

  // ---- the garage (its own lights: tubes, desk lamp, the sun through the shutter and window)
  gi.add({
    id: 'garage', box: box(GARAGE.minX, 0, GARAGE.minZ, GARAGE.maxX, GARAGE.height, GARAGE.maxZ), sky: true, global: true,
    at: V(0.2, 1.4, 0.5),
    // the two tube fixtures' shadowed share, as one wide spot under the ceiling between them (src/game/Lighting.js
    // turns the tubes' point lights down while it's on)
    lights: () => [{ p: [0, GARAGE.height - 0.25, -0.6], t: [0, 0, -0.4], color: 0xf2f4ff, i: 16 * (Lg?.tubeLight ?? 0), angle: 1.36, pen: 0.6, range: 9, soft: 3 }],
    key: () => [G.lightsOn, game.bills?.powerOn !== false, Math.round(Math.max(0, G.shutterOpen) * 4), Math.round(Lg?.dimLevel ?? 0), (G.lights?.tubes || []).map((t) => (t.dead ? 0 : 1)).join(''), night()].join(),
    minor: () => hour(1),
  });

  // ---- Mikawa-ya (on the lane): its fluorescent fixtures become a real shadowed light while you're in the shop
  const cs = G.town?.cornerShop;
  if (cs) {
    gi.add({
      id: 'mikawaya', box: box(MK.XI0, 0, MK.ZI0, MK.XI1, MK.H1, MK.ZI1), sky: true, k: 0.9,
      at: V(-12.4, 1.35, 16.9),
      lights: () => {
        if (game.places?.where) return [];
        const pw = game.bills?.powerOn !== false ? 1 : 0;
        return [lamp({ x: -12.5, y: MK.H1 - 0.2, z: 16.6, intensity: 2.6 * pw, color: 0xfff2e2 }, { angle: 1.38, pen: 0.6, range: 8 })];
      },
      key: () => [night(), game.bills?.powerOn !== false].join(),
      minor: () => hour(1),
    });
  }

  // ---- the interiors off the map: their lamps (def.lamp / lamp2) become the rig's key and fill
  const offMap = (id, b, o = {}) => gi.add({
    id, box: b, sky: false, k: o.k ?? 1, at: o.at,
    get group() { return def(id)?.group; },
    active: () => P()?.where === id,
    lights: () => {
      const d = def(id);
      if (!d) return [];
      return o.lights ? o.lights(d) : [lamp(d.lamp, o.key), lamp(d.lamp2, o.fill)];
    },
    key: () => { const d = def(id); return [d?.lamp?.k ?? 1, d?.lamp2?.k ?? 1, o.key2?.() ?? '', night()].join(); },
  });
  // your room (#102): the round ceiling lamp, and a small light over the kitchen strip on the same switch
  {
    const O = V(80, 0, -80), R = ROOM;
    offMap('room', box(O.x + R.x0, 0, O.z + R.z0, O.x + R.x1, R.H, O.z + R.z1), {
      at: V(O.x + 0.2, 1.3, O.z - 0.7),
      lights: (d) => [lamp(d.lamp, { dy: -0.05 }), d.lamp && lamp({ ...d.lamp, x: O.x - 0.4, z: O.z + 1.35, y: R.H - 0.06, intensity: d.lamp.intensity * 0.45 }, { range: 4.5, angle: 1.25 })],
    });
  }
  // Flat 103: the kitchen tube (key), the back room's round lamp (fill); the bathroom gets a pooled ceiling light
  {
    const O = ORIGINS.home103;
    offMap('home103', box(O.x - 2.5, -0.12, O.z - 2.8, O.x + 2.5, 2.4, O.z + 2.8), {
      at: V(O.x - 0.6, 1.3, O.z + 1.2),
      key: { angle: 1.4, pen: 0.65 }, fill: { angle: 1.35 },
    });
    const bathLight = () => {
      const z = game.places?.home103?.zone;
      if (!z || z.group.userData.bathLight) return;
      const pl = new THREE.PointLight(0xfff2e4, 2.2, 3.2, 2);
      pl.position.copy(z.L(1.65, 2.25, 1.5));
      z.group.add(pl);
      z.group.userData.bathLight = pl;
    };
    bathLight();
    game.events?.on?.('place', () => bathLight());
  }
  // Ramen Yamada: the pendant lamps over the counter (key) and the kitchen light (fill)
  {
    const O = V(120, 0, -80);
    offMap('ramen', box(O.x - 3, 0, O.z - 2.5, O.x + 3, 2.6, O.z + 2.5), {
      at: V(O.x + 0.4, 1.35, O.z + 0.9),
      key: { dy: -0.1, angle: 1.35 }, fill: { angle: 1.3 },
    });
  }
}
