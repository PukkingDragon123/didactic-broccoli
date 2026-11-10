// The Kaikan's front wall from inside, detailed (phase 10): an aluminium storefront on 1F (stone cill on a dark
// stallriser with a stainless kick plate, a perimeter frame, mullions with snap caps and black gaskets, a transom), the
// automatic doors' operator header with its sensor and the floor guide; upstairs a window wall with a marble-look
// window board on its apron, mullions, a transom with top-hung vents and their cam handles, a pelmet over the head;
// column casings with a skirting wrap and stainless corner guards between the bays. Drawn into the zone batch (merged
// per material) with the materials Mall.front() already uses.
//   storefront(B, paint, metal, bays, o)    bays: [[x0, x1]...] glazed from y0 to y1 (o: { y0, y1, transom, vents })
//   pilaster(B, paint, metal, x, w, wallTint)   a column casing on the front wall's room face
//   doorHeader(B, paint, metal, x0, x1, y)      the automatic doors' operator box and the threshold track
//   doorFrame(mat) -> geometry                   a sliding glass leaf's frame (1.0 x 2.5), about its centre
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Z1, CH } from './layout.js';

const AL = 0xc8ccd2, CAP = 0xb4bac2, GASKET = 0x26282c, ZG = Z1 - 0.02; // the glass line (just inside the wall face)

/** A mullion (vertical) or a transom (o.h: horizontal), its core across the glass line, a snap cap on the room side. */
function bar(B, metal, paint, a, b, at, o = {}) {
  const d = 0.13, zc = ZG + 0.035, horiz = !!o.h, len = b - a, mid = (a + b) / 2;
  if (horiz) {
    B.box(metal, len, 0.05, d, mid, at - 0.025, zc, { tint: AL, bevel: 0.005 });
    B.box(metal, len, 0.066, 0.022, mid, at - 0.033, zc - d / 2 - 0.01, { tint: CAP, bevel: 0.008 });
    for (const s of [-1, 1]) B.box(paint, len, 0.007, 0.012, mid, at + s * 0.028 - 0.0035, ZG - 0.008, { tint: GASKET });
  } else {
    B.box(metal, 0.05, len, d, at, a, zc, { tint: AL, bevel: 0.005 });
    B.box(metal, 0.066, len, 0.022, at, a, zc - d / 2 - 0.01, { tint: CAP, bevel: 0.008 });
    for (const s of [-1, 1]) B.box(paint, 0.007, len, 0.012, at + s * 0.028, a, ZG - 0.008, { tint: GASKET });
  }
}

/** Glazed bays in the front wall, each [x0, x1] from y0 to y1, split into n lights by mullions. */
export function storefront(B, paint, metal, bays, o) {
  const { y0, y1, n = 3, transom = null, vents = false, cill = 'stone' } = o;
  for (const [x0, x1] of bays) {
    // the perimeter frame: jambs, head and sill as the same sections, butted
    bar(B, metal, paint, y0, y1, x0 + 0.025); bar(B, metal, paint, y0, y1, x1 - 0.025);
    bar(B, metal, paint, x0, x1, y1 - 0.025, { h: true }); bar(B, metal, paint, x0, x1, y0 + 0.025, { h: true });
    for (let k = 1; k < n; k++) bar(B, metal, paint, y0 + 0.05, y1 - 0.05, x0 + ((x1 - x0) * k) / n);
    if (transom) {
      bar(B, metal, paint, x0 + 0.05, x1 - 0.05, transom, { h: true });
      if (vents) for (let k = 0; k < n; k++) { // a top-hung vent in every other light: its sash and a cam handle
        if (k % 2) continue;
        const a = x0 + ((x1 - x0) * k) / n + 0.05, b = x0 + ((x1 - x0) * (k + 1)) / n - 0.05, mid = (a + b) / 2;
        for (const yy of [transom + 0.03, y1 - 0.09]) B.box(metal, b - a - 0.04, 0.035, 0.03, mid, yy, ZG - 0.02, { tint: AL, bevel: 0.004 });
        for (const xx of [a + 0.035, b - 0.035]) B.box(metal, 0.035, y1 - 0.09 - transom - 0.03, 0.03, xx, transom + 0.03, ZG - 0.02, { tint: AL, bevel: 0.004 });
        B.box(metal, 0.03, 0.05, 0.018, mid, transom + 0.04, ZG - 0.045, { tint: 0x9aa0a8, bevel: 0.005 });
        B.box(metal, 0.016, 0.075, 0.016, mid + 0.012, transom + 0.0, ZG - 0.06, { tint: 0x9aa0a8, bevel: 0.005, rz: 0.25 });
      }
    }
    if (cill === 'stone') { // a granite-look cill on the stallriser, its rounded nose into the room; the kick plate
      const pts = [[ZG - 0.11, -0.03], [Z1 + 0.02, -0.03], [Z1 + 0.02, 0], [ZG - 0.11, 0], [ZG - 0.122, -0.006], [ZG - 0.126, -0.015], [ZG - 0.122, -0.024]];
      B.extrude(paint, pts.map(([z, y]) => [z, y + y0]), x0 - 0.04, x1 + 0.04, { along: 'x', tint: 0x6a6660 });
      B.box(metal, x1 - x0, 0.14, 0.006, (x0 + x1) / 2, 0.0, Z1 - 0.003, { tint: 0xd4d8dc });
      for (const x of [x0 + 0.05, (x0 + x1) / 2, x1 - 0.05]) for (const y of [0.035, 0.105]) B.lathe(metal, [[0.005, 0], [0.004, 0.002], [0, 0.003]], x, y, Z1 - 0.006, { rx: -Math.PI / 2, tint: 0xa8acb0, sides: 6 });
    } else { // a window board: artificial marble, a rounded nose, on its apron
      const pts = [[ZG - 0.13, -0.032], [Z1 + 0.02, -0.032], [Z1 + 0.02, 0], [ZG - 0.13, 0], [ZG - 0.143, -0.006], [ZG - 0.148, -0.016], [ZG - 0.143, -0.026]];
      B.extrude(paint, pts.map(([z, y]) => [z, y + y0]), x0 - 0.06, x1 + 0.06, { along: 'x', tint: 0xe6e2da });
      B.box(paint, x1 - x0 + 0.08, 0.07, 0.02, (x0 + x1) / 2, y0 - 0.102, Z1 - 0.01, { tint: 0xd8d4cc, bevel: 0.006 });
    }
  }
}

/** A column casing on the front wall's room face: w wide, 0.12 proud, full height; skirting wrap, corner guards. */
export function pilaster(B, paint, metal, x, w, tint) {
  const d = 0.12, z = Z1 - d / 2;
  B.box(paint, w, CH, d, x, 0, z, { tint, k: 0.97, bevel: 0.01 });
  B.box(paint, w + 0.024, 0.12, d + 0.012, x, 0, z - 0.006, { tint: 0x3a3a40, bevel: 0.008 });
  B.box(paint, w + 0.03, 0.04, d + 0.015, x, CH - 0.04, z - 0.007, { tint, k: 1.04, bevel: 0.008 });
  for (const s of [-1, 1]) { // stainless angle guards on both outer corners, screwed on
    const cx = x + s * (w / 2 + 0.002), cz = Z1 - d - 0.002;
    B.box(metal, 0.004, 1.3, 0.035, cx, 0.12, cz + 0.0175, { tint: 0xd8dce0 });
    B.box(metal, 0.035, 1.3, 0.004, cx - s * 0.0175, 0.12, cz, { tint: 0xd8dce0 });
    for (const y of [0.3, 0.8, 1.3]) B.lathe(metal, [[0.004, 0], [0, 0.002]], cx - s * 0.018, y, cz - 0.002, { rx: -Math.PI / 2, tint: 0xa8acb0, sides: 6 });
  }
}

/** The automatic doors' operator box across the head (x0..x1, its underside at y), the sensor, the threshold track. */
export function doorHeader(B, paint, metal, x0, x1, y) {
  const mid = (x0 + x1) / 2, w = x1 - x0;
  B.box(metal, w + 0.2, 0.24, 0.2, mid, y, Z1 - 0.12, { tint: 0xc4c8ce, bevel: 0.012 });
  B.box(metal, w + 0.22, 0.012, 0.212, mid, y + 0.115, Z1 - 0.12, { tint: 0x9aa0a8 }); // the cover's split line
  for (const x of [x0 - 0.1, x1 + 0.1]) B.box(metal, 0.012, 0.25, 0.21, x, y - 0.005, Z1 - 0.12, { tint: 0x9aa0a8, bevel: 0.004 });
  // the microwave sensor: a dark lens box under the header, a little green LED
  B.box(paint, 0.2, 0.05, 0.08, mid, y - 0.05, Z1 - 0.16, { tint: 0x2a2c30, bevel: 0.012 });
  B.box(paint, 0.12, 0.012, 0.05, mid, y - 0.062, Z1 - 0.16, { tint: 0x3e4a52, bevel: 0.004 });
  B.box(paint, 0.012, 0.01, 0.01, mid + 0.075, y - 0.058, Z1 - 0.2, { tint: 0x6ad06a });
  // the floor guide track and the stainless threshold
  B.box(metal, w + 0.1, 0.006, 0.12, mid, 0, Z1 - 0.06, { tint: 0xd0d4d8 });
  B.box(paint, w + 0.1, 0.007, 0.012, mid, 0, Z1 - 0.06, { tint: 0x2a2a2e });
}

/** One sliding glass leaf's frame (w x h about its centre): stiles, top and bottom rails, guard bars both faces. */
export function doorFrame(w = 1.0, h = 2.5) {
  const parts = [], box = (bw, bh, bd, x, y, z) => { const g = new THREE.BoxGeometry(bw, bh, bd); g.translate(x, y, z); parts.push(g); };
  for (const s of [-1, 1]) box(0.05, h, 0.06, s * (w / 2 - 0.025), 0, 0);
  box(w - 0.1, 0.07, 0.06, 0, h / 2 - 0.035, 0);
  box(w - 0.1, 0.13, 0.06, 0, -h / 2 + 0.065, 0);
  for (const zs of [-1, 1]) {
    const bar = new THREE.CylinderGeometry(0.014, 0.014, w - 0.24, 12); bar.rotateZ(Math.PI / 2); bar.translate(0, -h / 2 + 0.95, zs * 0.065); parts.push(bar);
    for (const s of [-1, 1]) { const st = new THREE.CylinderGeometry(0.008, 0.008, 0.045, 8); st.rotateX(Math.PI / 2); st.translate(s * (w / 2 - 0.14), -h / 2 + 0.95, zs * 0.042); parts.push(st); }
  }
  const g = mergeGeometries(parts.map((p) => p.toNonIndexed()));
  parts.forEach((p) => p.dispose());
  return g;
}
