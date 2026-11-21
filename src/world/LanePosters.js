// Posters and neighbourhood notices pasted up around the lane, on walls, poles, a shutter, the underpass piers, the
// community board and the park: travel campaign posters, a sumo tour, the zoo and the aquarium, kakigori, the summer
// festival, lost cats and a lost dog with tear-off phone tabs (some already taken), a flat for rent, photo calendar
// pages. Every picture on them is a real photograph (Google Open Images, CC BY 2.0: CREDITS.md), laid out offline in
// the game's pixel type and aged like paper on a wall (tools/bake-print.py 'lane' -> public/img/print/lane.webp;
// regions in src/gfx/print/lane.json). Each spot picks one of the baked variants of its design at random per visit.
//
// All the posters share the one sheet and merge into the town's batch: one draw call for the lot.
//   buildLanePosters(town) -> { list, material }
import * as THREE from 'three';
import { printTexture, printUV, printKeys } from '../gfx/printAtlas.js';

const ZB = 5.3, ZF = 14.9, XT = 26;
// the baked variants of each design (and the photo pool a spot asks for)
const POOL = {
  travel: () => printKeys('lane', 'lane:travel:'),
  zoo: () => printKeys('lane', 'lane:zoo:'),
  cats: () => printKeys('lane', 'lane:lost:cat'),
  dogs: () => printKeys('lane', 'lane:lost:dog'),
  fest: () => printKeys('lane', 'lane:festival:'),
  event: () => printKeys('lane', 'lane:event:'),
  ice: () => printKeys('lane', 'lane:kakigori:'),
  any: () => printKeys('lane', 'lane:print:'),
  rent: () => printKeys('lane', 'lane:rent:'),
};

// [design, photo pool, px w, px h, metres wide, world x, y (bottom), z, ry, tilt]
function spots() {
  const nF = ZF - 0.014, nB = ZB + 0.014;
  return [
    // near side walls
    ['travel', 'travel', 184, 260, 0.36, 12.75, 0.62, nB, 0, 0.02],
    ['lost', 'cats', 180, 255, 0.26, 16.05, 0.72, nB, 0, -0.03],
    ['festival', 'fest', 184, 260, 0.36, -9.05, 0.6, nB, 0, -0.015],
    ['event', 'event', 184, 260, 0.36, -7.75, 0.58, nB, 0, 0.02],
    ['print', 'any', 56, 44, 0.4, -24.6, 0.72, nB, 0, 0.01],
    // posters on the tobacco shop's shutter (it's been closed for years)
    ['zoo', 'zoo', 184, 260, 0.4, -19.6, 1.0, ZB + 0.048, 0, 0.03],
    ['travel', 'travel', 184, 260, 0.4, -19.05, 0.98, ZB + 0.049, 0, -0.02],
    // far side walls and fences
    ['kakigori', 'ice', 164, 232, 0.3, -24.4, 0.85, ZF + 0.012, Math.PI, 0.02],
    ['travel', 'travel', 184, 260, 0.36, -20.3, 0.7, nF, Math.PI, -0.02],
    ['lost', 'dogs', 180, 255, 0.26, -1.95, 0.75, nF, Math.PI, 0.03],
    ['print', 'any', 56, 44, 0.38, 2.25, 0.85, nF, Math.PI, -0.01],
    ['rent', null, 164, 232, 0.26, 18.45, 0.72, nF, Math.PI, 0.02],
    ['zoo', 'zoo', 184, 260, 0.36, 19.15, 0.6, nF, Math.PI, -0.02],
    // utility poles (notices tied at eye height, facing the lane)
    ['lost', 'cats', 180, 255, 0.22, -22.4, 1.25, 14.32 - 0.24, Math.PI, 0.0],
    ['festival', 'fest', 164, 232, 0.24, 10.0, 1.2, 14.32 - 0.24, Math.PI, 0.0],
    ['lost', 'cats', 180, 255, 0.22, -16.3, 1.3, 14.32 - 0.24, Math.PI, 0.0],
    ['rent', null, 164, 232, 0.22, 17.6, 1.25, 14.32 - 0.24, Math.PI, 0.0],
    // the underpass piers (guerrilla posters on the brick, facing the lane)
    ['event', 'event', 184, 260, 0.38, -(XT - 0.4), 1.15, 13.25, Math.PI / 2, 0.02],
    ['travel', 'travel', 184, 260, 0.38, XT - 0.4, 1.12, 13.3, -Math.PI / 2, -0.02],
    ['print', 'any', 56, 44, 0.38, -(XT - 0.4), 0.62, 5.45, Math.PI / 2, -0.01],
    // the community notice board by Sakura Heights
    ['lost', 'cats', 180, 255, 0.2, 17.2, 1.02, 5.536, 0, 0.03],
    ['festival', 'fest', 164, 232, 0.22, 17.66, 1.03, 5.536, 0, -0.02],
    // the passage and the park (warehouse wall by the entrance)
    ['travel', 'travel', 184, 260, 0.34, 9.812, 0.55, 3.0, Math.PI / 2, 0.02],
    ['zoo', 'zoo', 184, 260, 0.38, 11.462, 1.15, -8.4, Math.PI / 2, -0.02],
    ['lost', 'dogs', 180, 255, 0.24, 11.462, 1.2, -9.2, Math.PI / 2, 0.03],
  ];
}

export function buildLanePosters(t) {
  const tex = printTexture('lane');
  const mat = new THREE.MeshStandardMaterial({ map: tex, vertexColors: true, roughness: 0.92, alphaTest: 0.5 });
  mat.polygonOffset = true; mat.polygonOffsetFactor = -2; mat.polygonOffsetUnits = -4;
  const list = [];
  const rnd = Math.random;
  const used = new Set();
  spots().forEach(([design, pool, pw, ph, mw, x, y, z, ry, tilt]) => {
    const keys = (POOL[pool || design] || POOL.any)();
    if (!keys.length) return;
    // prefer a variant not yet on the lane
    const fresh = keys.filter((k) => !used.has(k));
    const key = (fresh.length ? fresh : keys)[Math.floor(rnd() * (fresh.length || keys.length))];
    used.add(key);
    const mh = mw * ph / pw;
    const age = 0.8 + rnd() * 0.25; // sun and rain: older posters are a little darker and greyer
    t.quadUV(mat, mw, mh, x, y, z, printUV('lane', key), { ry, rz: tilt, tint: new THREE.Color(age, age, age * 0.97).getHex() });
    list.push({ design, pool, key });
  });
  t.lanePosters = { list, material: mat };
  return t.lanePosters;
}
