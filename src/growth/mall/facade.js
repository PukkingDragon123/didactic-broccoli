// The Kaikan's front wall from inside, detailed (phase 10): an aluminium storefront on 1F (granite cill on the dark
// stallriser with a stainless kick plate, a perimeter frame, mullions with snap caps and black gaskets, a transom), the
// automatic doors' operator header with its sensor and the floor guide; upstairs a window wall with a window board on its
// apron, mullions, a transom with top-hung vents and their cam handles, a pelmet over the head; column casings with a
// skirting wrap and stainless corner guards. Drawn with the interior kit's frame F (src/places/ikit.js: merged per
// material) in the zone's local coordinates.
//   storefront(F, bays, o)        bays: [[x0, x1]...] glazed from o.y0 to o.y1 (o: n lights, transom, vents, zg glass line)
//   pilaster(F, x, w, tint)       a column casing on the front wall's room face
//   doorHeader(F, x0, x1, y)      the automatic doors' operator box and the threshold track
//   doorFrame(w, h) -> geometry   a sliding glass leaf's frame about its centre
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Z1, CH } from './layout.js';

const AL = 0xc8ccd2, CAP = 0xb4bac2, GASKET = 0x26282c;

/** A mullion (vertical, from a to b, at x = at) or a transom (o.h: from x a to b, at y = at): its core across the glass
 *  line zg, a rounded snap cap on the room side, black gaskets where the glass meets it. */
function bar(F, a, b, at, o) {
  const zg = o.zg, z0 = zg - 0.06, z1 = zg + 0.07;
  if (o.h) {
    F.box('satin', a, at - 0.025, z0, b, at + 0.025, z1, { tint: AL, bevel: 0.005 });
    F.box('satin', a, at - 0.033, z0 - 0.022, b, at + 0.033, z0, { tint: CAP, bevel: 0.009 });
    for (const s of [-1, 1]) F.box('gloss', a, at + s * 0.028 - 0.0035, zg - 0.006, b, at + s * 0.028 + 0.0035, zg + 0.006, { tint: GASKET });
  } else {
    F.box('satin', at - 0.025, a, z0, at + 0.025, b, z1, { tint: AL, bevel: 0.005 });
    F.box('satin', at - 0.033, a, z0 - 0.022, at + 0.033, b, z0, { tint: CAP, bevel: 0.009 });
    for (const s of [-1, 1]) F.box('gloss', at + s * 0.028 - 0.0035, a, zg - 0.006, at + s * 0.028 + 0.0035, b, zg + 0.006, { tint: GASKET });
  }
}

/** Glazed bays in the front wall (its room face at Z1, the room toward -z), each [x0, x1] from y0 to y1, n lights. */
export function storefront(F, bays, o) {
  const { y0, y1, n = 3, transom = null, vents = false, cill = 'stone' } = o, zg = o.zg ?? Z1 - 0.02, B = { zg }, H = { zg, h: true };
  for (const [x0, x1] of bays) {
    bar(F, y0, y1, x0 + 0.025, B); bar(F, y0, y1, x1 - 0.025, B);
    bar(F, x0, x1, y1 - 0.025, H); bar(F, x0, x1, y0 + 0.025, H);
    for (let k = 1; k < n; k++) bar(F, y0 + 0.05, y1 - 0.05, x0 + ((x1 - x0) * k) / n, B);
    if (transom) {
      bar(F, x0 + 0.05, x1 - 0.05, transom, H);
      if (vents) for (let k = 0; k < n; k += 2) { // a top-hung vent in every other light: its sash and a cam handle
        const a = x0 + ((x1 - x0) * k) / n + 0.06, b = x0 + ((x1 - x0) * (k + 1)) / n - 0.06, mid = (a + b) / 2, zv = zg - 0.09;
        F.box('satin', a, transom + 0.03, zv, b, transom + 0.065, zv + 0.03, { tint: AL, bevel: 0.004 });
        F.box('satin', a, y1 - 0.1, zv, b, y1 - 0.065, zv + 0.03, { tint: AL, bevel: 0.004 });
        for (const x of [a, b - 0.035]) F.box('satin', x, transom + 0.065, zv, x + 0.035, y1 - 0.1, zv + 0.03, { tint: AL, bevel: 0.004 });
        F.box('chrome', mid - 0.018, transom + 0.04, zv - 0.016, mid + 0.018, transom + 0.085, zv, { bevel: 0.005 });
        F.beam('chrome', [mid + 0.006, transom + 0.07, zv - 0.024], [mid + 0.03, transom - 0.005, zv - 0.024], 0.016, 0.012);
      }
    }
    if (cill === 'stone') { // a granite cill on the stallriser, a shallow bullnose (the doors slide past it); the kick plate
      F.box('gloss', x0 - 0.04, y0 - 0.03, Z1, x1 + 0.04, y0, Z1 + 0.1, { tint: 0x5e5a56, bevel: 0.004 });
      F.rod('gloss', [x0 - 0.04, y0 - 0.015, Z1], [x1 + 0.04, y0 - 0.015, Z1], 0.015, { tint: 0x5a5652 });
      F.box('chrome', x0, 0.0, Z1 - 0.004, x1, 0.14, Z1, {});
      for (const x of [x0 + 0.05, (x0 + x1) / 2, x1 - 0.05]) for (const y of [0.035, 0.105]) F.lathe('satin', x, y, Z1 - 0.004, [[0.005, 0], [0.004, -0.002], [0, -0.003]], 8, { axis: 'z' });
    } else { // a window board (melamine on chipboard, a bullnose into the room) on a painted apron
      F.box('gloss', x0 - 0.06, y0 - 0.032, Z1 - 0.15, x1 + 0.06, y0, Z1 + 0.02, { tint: 0xe6e2da, bevel: 0.004 });
      F.rod('gloss', [x0 - 0.06, y0 - 0.016, Z1 - 0.15], [x1 + 0.06, y0 - 0.016, Z1 - 0.15], 0.016, { tint: 0xe2ded6 });
      F.box('satin', x0 - 0.04, y0 - 0.1, Z1 - 0.03, x1 + 0.04, y0 - 0.032, Z1, { tint: 0xd8d4cc, bevel: 0.006 });
    }
  }
}

/** A column casing on the front wall's room face: w wide, 0.12 proud, full height; skirting wrap, corner guards. */
export function pilaster(F, x, w, tint) {
  const d = 0.12, x0 = x - w / 2, x1 = x + w / 2;
  F.box('wallpaper', x0, 0, Z1 - d, x1, CH, Z1, { tint, k: 0.97, bevel: 0.01 });
  F.box('gloss', x0 - 0.012, 0, Z1 - d - 0.012, x1 + 0.012, 0.12, Z1, { tint: 0x3a3a40, bevel: 0.008 });
  F.box('wallpaper', x0 - 0.015, CH - 0.05, Z1 - d - 0.015, x1 + 0.015, CH, Z1, { tint, k: 1.04, bevel: 0.008 });
  for (const s of [-1, 1]) { // stainless angle guards on both outer corners, screwed on
    const cx = s > 0 ? x1 : x0, cz = Z1 - d;
    F.box('chrome', cx - 0.002, 0.12, cz - 0.004, cx + 0.002, 1.42, cz + 0.035, {});
    F.box('chrome', s > 0 ? cx - 0.035 : cx - 0.002, 0.12, cz - 0.004, s > 0 ? cx + 0.002 : cx + 0.035, 1.42, cz, {});
    for (const y of [0.3, 0.8, 1.3]) F.lathe('satin', cx - s * 0.018, y, cz - 0.004, [[0.004, 0], [0, -0.002]], 8, { axis: 'z' });
  }
}

/** The automatic doors' operator box across the head (x0..x1, its underside at y), the sensor, the threshold track. */
export function doorHeader(F, x0, x1, y) {
  F.box('satin', x0 - 0.1, y, Z1 - 0.22, x1 + 0.1, y + 0.24, Z1, { tint: 0xc4c8ce, bevel: 0.012 });
  F.box('satin', x0 - 0.11, y + 0.11, Z1 - 0.225, x1 + 0.11, y + 0.122, Z1, { tint: 0x9aa0a8 }); // the cover's split line
  for (const x of [x0 - 0.1, x1 + 0.1]) F.box('satin', x - 0.006, y - 0.005, Z1 - 0.226, x + 0.006, y + 0.245, Z1, { tint: 0x9aa0a8, bevel: 0.004 });
  // the microwave sensor: a dark lens box under the header, a little green LED
  const mid = (x0 + x1) / 2;
  F.box('gloss', mid - 0.1, y - 0.05, Z1 - 0.2, mid + 0.1, y, Z1 - 0.12, { tint: 0x2a2c30, bevel: 0.012 });
  F.box('gloss', mid - 0.06, y - 0.062, Z1 - 0.185, mid + 0.06, y - 0.05, Z1 - 0.135, { tint: 0x3e4a52, bevel: 0.004 });
  F.box('glow', mid + 0.07, y - 0.056, Z1 - 0.205, mid + 0.082, y - 0.046, Z1 - 0.199, { tint: 0x6ad06a });
  // the floor guide track and the stainless threshold
  F.box('chrome', x0 - 0.05, 0, Z1 - 0.12, x1 + 0.05, 0.006, Z1, {});
  F.box('gloss', x0 - 0.05, 0.006, Z1 - 0.066, x1 + 0.05, 0.007, Z1 - 0.054, { tint: 0x2a2a2e });
}

/** One sliding glass leaf's frame (w x h about its centre): stiles, top and bottom rails, guard bars on both faces. */
export function doorFrame(w = 1.0, h = 2.5) {
  const parts = [], box = (bw, bh, bd, x, y, z) => { const g = new THREE.BoxGeometry(bw, bh, bd); g.translate(x, y, z); parts.push(g); };
  for (const s of [-1, 1]) box(0.05, h, 0.06, s * (w / 2 - 0.025), 0, 0);
  box(w - 0.1, 0.07, 0.06, 0, h / 2 - 0.035, 0);
  box(w - 0.1, 0.13, 0.06, 0, -h / 2 + 0.065, 0);
  // (the outer face's bar stays inside the leaf's 6 cm, so it slides past the jambs)
  const bar = new THREE.CylinderGeometry(0.014, 0.014, w - 0.24, 12); bar.rotateZ(Math.PI / 2); bar.translate(0, -h / 2 + 0.95, -0.065); parts.push(bar);
  for (const s of [-1, 1]) { const st = new THREE.CylinderGeometry(0.008, 0.008, 0.045, 8); st.rotateX(Math.PI / 2); st.translate(s * (w / 2 - 0.14), -h / 2 + 0.95, -0.042); parts.push(st); }
  const g = mergeGeometries(parts.map((p) => p.toNonIndexed()));
  parts.forEach((p) => p.dispose());
  return g;
}
