// Shared vehicle parts, all low-poly with atlas uvs: wheels (tyre with tread and sidewall, steel rim, hubcap), door
// mirrors on stalks, wiper arms, rods along a path (drip rails, roof racks, ladders), and the materials every vehicle
// uses (one atlas material for the body, one for its glass, an unlit one for lamps that are switched on).
import * as THREE from 'three';
import { Geo, norm } from './geom.js';
import { tread, wheelFace } from './paint.js';

/**
 * Paint the two wheel patches (side face, tread strip) into an atlas: returns { face, tread } views.
 * o: { px (face size in pixels), steel, tyre, text, holes, nuts, cap }
 */
export function wheelPatches(A, o = {}) {
  const face = A.patch(o.name ? o.name + ':face' : 'wheel:face', o.px ?? 56, o.px ?? 56);
  wheelFace(face, o);
  const tr = A.patch(o.name ? o.name + ':tread' : 'wheel:tread', 64, 12);
  tread(tr, o);
  return { face, tread: tr };
}

/**
 * A wheel about the x axis, centred at the origin, its outer face towards +x (side = 1) or -x (side = -1).
 * r tyre radius, w width, rim radius; P = wheelPatches(...). Returns a BufferGeometry (one group).
 */
export function wheelGeometry(P, { r = 0.265, w = 0.145, rim = 0.152, side = 1, segs = 16 } = {}) {
  const G = new Geo(1), hw = w / 2;
  const prof = [
    [0, -hw * 0.55], [rim * 0.88, -hw * 0.55], [rim * 1.02, -hw * 0.98], [r * 0.94, -hw], [r, -hw * 0.66],
    [r, hw * 0.66], [r * 0.94, hw], [rim * 1.04, hw * 0.98], [rim * 0.97, hw * 0.86], [rim * 0.86, hw * 0.4],
    [rim * 0.4, hw * 0.4], [rim * 0.36, hw * 0.62], [0, hw * 0.66],
  ];
  const faceUV = (p) => P.face.st(0.5 - (side * p[2]) / (2 * r), 0.5 + p[1] / (2 * r)); // read from outside: -z to the right on the +x side
  const m = new THREE.Matrix4().makeScale(side, 1, 1);
  G.push(m);
  G.lathe(prof, segs, {
    a0: Math.PI / segs,
    uvBand: (k, s, n, pts) => {
      if (k === 4 || k === 3 || k === 5) {
        // the tread (and the shoulders): wrapped round the strip
        const t0 = (prof[k][1] + hw) / w, t1 = (prof[k + 1][1] + hw) / w;
        const s0 = s / n, s1 = (s + 1) / n;
        const clamp = (v) => Math.min(0.995, Math.max(0.005, v));
        return [P.tread.st(clamp(s0), clamp(t0)), P.tread.st(clamp(s1), clamp(t0)), P.tread.st(clamp(s1), clamp(t1)), P.tread.st(clamp(s0), clamp(t1))];
      }
      return pts.map(faceUV);
    },
  });
  G.pop();
  return G.build();
}

/** A rod (round, `round` sides; or square) through a list of points. */
export function rods(G, pts, rad, round = 4) {
  for (let k = 0; k + 1 < pts.length; k++) G.strut(pts[k], pts[k + 1], rad, { round });
}

/**
 * A door mirror on a stalk: base at `base` on the body, the head's centre at `head`; the glass faces -z (backwards).
 * uvBody (housing), uvGlass (the mirror). Built into G.
 */
export function doorMirror(G, base, head, { w = 0.1, h = 0.14, d = 0.045, uvBody, uvGlass, uvStalk } = {}) {
  G.with(uvStalk || uvBody, null, () => {
    G.strut(base, [head[0], head[1] - h * 0.3, head[2] + d * 0.2], 0.009, { round: 4 });
    G.box(base[0] - 0.012, base[1] - 0.03, base[2] - 0.035, base[0] + 0.012, base[1] + 0.03, base[2] + 0.035, { bevel: 0.006 });
  });
  G.with(uvBody, null, () => G.box(head[0] - w / 2, head[1] - h / 2, head[2] - d / 2 + 0.004, head[0] + w / 2, head[1] + h / 2, head[2] + d / 2, { bevel: 0.012 }));
  G.with(uvGlass, null, () => G.quad([head[0] - w / 2 + 0.008, head[1] - h / 2 + 0.008, head[2] - d / 2 + 0.002], [head[0] + w / 2 - 0.008, head[1] - h / 2 + 0.008, head[2] - d / 2 + 0.002], [head[0] + w / 2 - 0.008, head[1] + h / 2 - 0.008, head[2] - d / 2 + 0.002], [head[0] - w / 2 + 0.008, head[1] + h / 2 - 0.008, head[2] - d / 2 + 0.002], [0, 0, -1]));
}

/** A wiper: arm from the pivot along `dir` (unit, in the glass plane) of length L, blade of length B, lying on the glass. */
export function wiper(G, pivot, dir, L, B, n, uv) {
  const up = norm(n);
  G.with(uv, null, () => {
    G.cyl('x', [pivot[0] - 0.01, pivot[1], pivot[2]], 0.012, 0.02, 6);
    const tip = [pivot[0] + dir[0] * L, pivot[1] + dir[1] * L, pivot[2] + dir[2] * L];
    G.strut(pivot, tip, 0.006, { round: 4 });
    // the blade: a thin strip lying along the arm's tip, 1 cm off the glass
    const b0 = [tip[0] - dir[0] * B * 0.5 + up[0] * 0.006, tip[1] - dir[1] * B * 0.5 + up[1] * 0.006, tip[2] - dir[2] * B * 0.5 + up[2] * 0.006];
    const b1 = [tip[0] + dir[0] * B * 0.5 + up[0] * 0.006, tip[1] + dir[1] * B * 0.5 + up[1] * 0.006, tip[2] + dir[2] * B * 0.5 + up[2] * 0.006];
    G.strut(b0, b1, 0.007);
  });
}

/** Body / glass / lamp materials over one atlas. */
export function vehicleMaterials(A, o = {}) {
  const map = A.texture(), roughnessMap = A.roughTexture();
  const body = new THREE.MeshStandardMaterial({ map, roughnessMap, roughness: 1, metalness: 0, envMapIntensity: o.env ?? 0.8 });
  body.name = 'vehicle-body';
  const glass = new THREE.MeshStandardMaterial({ map, roughnessMap, roughness: 1, metalness: 0, transparent: true, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.0 });
  glass.name = 'vehicle-glass';
  const lit = new THREE.MeshBasicMaterial({ map, toneMapped: true });
  lit.name = 'vehicle-lamp';
  return { body, glass, lit, map, roughnessMap };
}
