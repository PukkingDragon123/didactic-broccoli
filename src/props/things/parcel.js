// The marketplace's shipping cartons (src/market/models.js): a corrugated box, open at the top, and its four flaps.
// Frames are the old voxel ones (1 cm voxels), so the flaps hang on the same pivots and fold the same way:
//   parcelShellGeometry(W, H, D)    x -W/2..W/2, y 0..H, z -D/2..D/2 (metres), open top, 4 mm walls
//   parcelFlapGeometry(W, D, long)  short flap: x 0..W/2, z -D/2..D/2; long flap: x -W/2..W/2, z 0..D/2 (lying flat, y 0)
import { thingGeometry } from './make.js';
import { matte, flat, darken, lighten } from '../kit/kit.js';
import { photoInto } from '../kit/prints.js';

const CB = 0xc89a5f;
function sheet(K) {
  return K.patch('board', 48, 48, (V) => {
    V.fill(CB);
    photoInto(K, V, 'cardboard', CB, (V) => { for (let i = 0; i < 48; i++) { V.px(i, 47, darken(CB, 0.12)); V.px(i, 0, darken(CB, 0.12)); } });
  }, { rough: 0.9, shared: true });
}
/** A board face filling a rectangle of a face (the photo cardboard). */
function board(K, V, facing, a0, b0, a1, b1, w) { K.face(V, facing, a0, b0, a1, b1, w); }

export function parcelShellGeometry(W, H, D) {
  return thingGeometry('parcel', `shell:${W}:${H}:${D}`, [-W / 2, 0, -D / 2, W / 2, H, D / 2], (K) => {
    const V = sheet(K), t = 0.004, x0 = -W / 2, x1 = W / 2, z0 = -D / 2, z1 = D / 2, inner = matte(lighten(CB, 0.08), 0);
    // outside faces in printed cardboard, the cut edges along the top, the inside a paler kraft
    board(K, V, '+z', x0, 0, x1, H, z1); board(K, V, '-z', x0, 0, x1, H, z0);
    board(K, V, '+x', z0, 0, z1, H, x1); board(K, V, '-x', z0, 0, z1, H, x0);
    board(K, V, '-y', x0, z0, x1, z1, 0);
    K.use(inner, (G) => G.box(x0 + t, t, z0 + t, x1 - t, H, z1 - t, { inward: true, skip: ['py'] }));
    const edge = flat(lighten(CB, 0.18), 0.9);
    for (const [a, b, c, d] of [[x0, z0, x1, z0 + t], [x0, z1 - t, x1, z1], [x0, z0 + t, x0 + t, z1 - t], [x1 - t, z0 + t, x1, z1 - t]]) K.box(edge, a, H - 0.0004, b, c, H, d, { bevel: 0 });
    // the manufacturer's joint down one corner, a printed "this side up"
    K.box(flat(darken(CB, 0.15), 0.9), x1 - 0.0004, 0.003, z1 - 0.03, x1 + 0.0006, H - 0.003, z1 - 0.002, { bevel: 0 });
    const up = K.patch('up', 16, 16, (V) => { V.fill(CB); for (const x of [4, 11]) { V.box(x, 3, x + 2, 11, 0x5a3a20); V.box(x - 2, 9, x + 4, 11, 0x5a3a20); V.box(x - 1, 11, x + 3, 12, 0x5a3a20); V.px(x, 12, 0x5a3a20); V.px(x + 1, 12, 0x5a3a20); } V.box(2, 1, 14, 2, 0x5a3a20); }, { rough: 0.9, shared: true });
    K.face(up, '-x', z0 + 0.02, H * 0.55, z0 + 0.02 + Math.min(0.05, D * 0.3), H * 0.55 + Math.min(0.05, D * 0.3), x0 - 0.0006);
  });
}
export function parcelFlapGeometry(W, D, long) {
  const box = long ? [-W / 2, -0.006, 0, W / 2, -0.002, D / 2] : [0, 0, -D / 2, W / 2, 0.004, D / 2];
  return thingGeometry('parcel', `flap:${W}:${D}:${long ? 'L' : 'S'}`, box, (K, B) => {
    const V = sheet(K), inner = matte(lighten(CB, 0.08), 0), g = 0.0015;
    const xa = B.x0 + (long ? g : 0.002), xb = B.x1 - (long ? g : 0.002), za = B.z0 + (long ? 0 : g), zb = B.z1 - (long ? 0.002 : g);
    board(K, V, '+y', xa, za, xb, zb, B.y1); K.use(inner, (G) => G.quad([xa, B.y0, za], [xb, B.y0, za], [xb, B.y0, zb], [xa, B.y0, zb], [0, -1, 0]));
    const e = flat(lighten(CB, 0.18), 0.9);
    K.box(e, xa, B.y0, za, xb, B.y1, za + 0.0005, { bevel: 0 }); K.box(e, xa, B.y0, zb - 0.0005, xb, B.y1, zb, { bevel: 0 });
    K.box(e, xa, B.y0, za, xa + 0.0005, B.y1, zb, { bevel: 0 }); K.box(e, xb - 0.0005, B.y0, za, xb, B.y1, zb, { bevel: 0 });
  });
}
