// Builds your room (a 1K at SAKURA HEIGHTS #102) in local coordinates: origin = middle of the floor, +z = the
// front door / kitchen side, -z = the window. Six tatami mats (3.6 x 2.7 m), a kitchen strip with the genkan,
// sand-plaster walls, wooden ceiling, oshiire closet with one fusuma slid open, a balcony outside the window and
// a painted lane at dusk beyond it, plus all the furniture and clutter (src/data/props/room.js).
//   buildRoom(game, group) -> { lamp, deskLamp, view, calendar, figSlots, targets, obstacles, colliders, pc, ... }
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { worldBox, pixMat } from '../gfx/geo.js';
import { propGeometry, propSize } from '../world/props.js';
import { voxelMaterials } from '../voxel/materials.js';
import { flyerTexture } from '../gfx/flyers.js';
import { Pix } from '../gfx/pix.js';
import { hash2 } from '../core/util.js';
import * as T from './textures.js';
import { buildPC } from './pcModel.js';

// ------------------------------------------------------------------ layout (metres, room-local)
export const ROOM = {
  x0: -1.8, x1: 1.8, z0: -2.25, z1: 2.25, H: 2.4,
  zPart: 0.45, // partition between the tatami room and the kitchen strip
  door: { x: -1.3, w: 0.85, h: 1.95, y: -0.12 }, // front door in the +z wall
  win: { x0: -0.95, x1: 0.35, y0: 0.78, y1: 1.92 }, // window in the -z wall
  futon: { x: -1.25, z: -1.12 },
  desk: { x: 1.52, z: -1.55 },
  lamp: { x: 0.0, z: -0.85 },
};

const _c = new THREE.Color();
class Batch {
  constructor() { this.lists = new Map(); }
  add(mat, g, tint = 0xffffff, k = 1) {
    const n = g.attributes.position.count, col = new Float32Array(n * 3);
    _c.set(tint);
    for (let i = 0; i < n; i++) { col[i * 3] = _c.r * k; col[i * 3 + 1] = _c.g * k; col[i * 3 + 2] = _c.b * k; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (g.index) g = g.toNonIndexed();
    if (!this.lists.has(mat)) this.lists.set(mat, []);
    this.lists.get(mat).push(g);
    return g;
  }
  /** Box with its bottom at y. o: tint, k, ry, unit (0..1 UVs per face), uv offset. */
  box(mat, w, h, d, x, y, z, o = {}) {
    const g = o.unit ? new THREE.BoxGeometry(w, h, d) : worldBox(w, h, d);
    if (o.uv) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) + o.uv[0], uv.getY(i) + o.uv[1]); }
    if (o.rx) g.rotateX(o.rx);
    if (o.rz) g.rotateZ(o.rz);
    if (o.ry) g.rotateY(o.ry);
    g.translate(x, y + h / 2, z);
    return this.add(mat, g, o.tint, o.k);
  }
  /** Vertical quad facing +z (turn with o.ry), bottom at y; unit UVs unless o.world. */
  quad(mat, w, h, x, y, z, o = {}) {
    const g = new THREE.PlaneGeometry(w, h);
    if (o.world) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w + (o.uv?.[0] || 0), uv.getY(i) * h + (o.uv?.[1] || 0)); }
    if (o.ry) g.rotateY(o.ry);
    g.translate(x, y + h / 2, z);
    return this.add(mat, g, o.tint, o.k);
  }
  /** Upward-facing plane at height y (world UVs unless o.unit). */
  plane(mat, w, d, x, y, z, o = {}) {
    const g = new THREE.PlaneGeometry(w, d);
    if (!o.unit) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w + (o.uv?.[0] || 0), uv.getY(i) * d + (o.uv?.[1] || 0)); }
    g.rotateX(-Math.PI / 2);
    if (o.down) g.rotateX(Math.PI);
    g.translate(x, y, z);
    return this.add(mat, g, o.tint, o.k);
  }
  build(parent) {
    for (const [mat, list] of this.lists) {
      const g = mergeGeometries(list, false);
      for (const x of list) x.dispose();
      if (!g) continue;
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, mat);
      m.matrixAutoUpdate = false;
      m.updateMatrix();
      m.receiveShadow = true;
      parent.add(m);
    }
    this.lists.clear();
  }
}

const std = (o) => new THREE.MeshStandardMaterial({ vertexColors: true, ...o });
function texMat(pix, { repeat = 1, rough = 0.85, ...o } = {}) {
  const map = T.texOf(pix);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(1 / repeat, 1 / repeat);
  return new THREE.MeshStandardMaterial({ map, vertexColors: true, roughness: rough, ...o });
}
function unitMat(pix, o = {}) {
  return new THREE.MeshStandardMaterial({ map: T.texOf(pix), vertexColors: true, roughness: 0.8, ...o });
}

/** Sand-coloured juraku plaster (1 m tile). */
function juraku(ppm = 64) {
  const p = new Pix(ppm, ppm, 17);
  for (let y = 0; y < ppm; y++) for (let x = 0; x < ppm; x++) {
    const k = 0.95 + hash2(x, y) * 0.07;
    p.px(x, y, (hash2(x * 3, y * 5) < 0.04) ? 0xb8a478 : ((Math.round(0xd8 * k) << 16) | (Math.round(0xc8 * k) << 8) | Math.round(0xa4 * k)));
  }
  p.speckle(0.02, [0xc4b088, 0xe6d8b8, 0xa89468]);
  return p;
}

export function buildRoom(game, group) {
  const R = ROOM, B = new Batch(), O = new Batch(); // O: unlit things outside the window
  const out = { targets: {}, obstacles: [], figSlots: [], props: {}, swaps: [] };
  const M = {
    juraku: texMat(juraku(), { rough: 0.95 }),
    paper: texMat(T.wallpaper(), { rough: 0.9 }),
    ceil: texMat(T.ceilingBoards(), { repeat: 0.9, rough: 0.8 }),
    floor: texMat(T.flooring(), { rough: 0.55 }),
    genkan: texMat(T.genkanTile(), { rough: 0.7 }),
    tatami: unitMat(T.tatamiFloor(), { roughness: 0.9 }),
    wood: pixMat('woodDark', { roughness: 0.6, bump: 0.3 }).clone(),
    woodL: pixMat('woodLight', { roughness: 0.6, bump: 0.3 }).clone(),
    paint: std({ roughness: 0.7 }),
    edge: new THREE.MeshStandardMaterial({ color: 0x6a5446, roughness: 0.7 }),
    metal: std({ roughness: 0.35, metalness: 0.6 }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true }),
    out: new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xeaf2f8, transparent: true, opacity: 0.12, roughness: 0.05, clearcoat: 1, depthWrite: false }),
  };
  M.wood.vertexColors = true; M.woodL.vertexColors = true;
  out.mats = M;
  const { x0, x1, z0, z1, H, zPart } = R;
  const W = x1 - x0, t = 0.12;

  // ---------------------------------------------------------------- floors
  // tatami (one unit-mapped texture), the kitchen flooring and the sunken genkan
  B.plane(M.tatami, W, zPart - z0, 0, 0, (z0 + zPart) / 2, { unit: true });
  B.box(M.wood, W, 0.04, 0.05, 0, -0.035, zPart, { tint: 0xa8784a }); // shikii sill between the rooms
  const gk = { x0: x0, x1: -0.8, z0: 1.38 };
  B.plane(M.floor, x1 - gk.x1, z1 - zPart, (gk.x1 + x1) / 2, 0, (zPart + z1) / 2);
  B.plane(M.floor, gk.x1 - x0, gk.z0 - zPart, (x0 + gk.x1) / 2, 0, (zPart + gk.z0) / 2);
  B.plane(M.genkan, gk.x1 - x0, z1 - gk.z0, (x0 + gk.x1) / 2, R.door.y, (gk.z0 + z1) / 2);
  B.box(M.woodL, gk.x1 - x0, 0.14, 0.09, (x0 + gk.x1) / 2, R.door.y, gk.z0 + 0.03, { tint: 0xc8a070 }); // agari-kamachi step
  B.box(M.genkan, 0.02, 0.12, z1 - gk.z0, gk.x1 + 0.01, R.door.y, (gk.z0 + z1) / 2);
  // ---------------------------------------------------------------- walls (shell boxes outside the interior)
  // west + east walls: tatami part (plaster) and kitchen part (wallpaper)
  for (const [xa, side] of [[x0 - t / 2, -1], [x1 + t / 2, 1]]) {
    B.box(M.juraku, t, H, zPart - z0, xa, 0, (z0 + zPart) / 2);
    B.box(M.paper, t, H - R.door.y, z1 - zPart, xa, R.door.y, (zPart + z1) / 2);
  }
  // back wall with the window opening
  const w = R.win;
  B.box(M.juraku, W + 2 * t, w.y0, t, 0, 0, z0 - t / 2);
  B.box(M.juraku, W + 2 * t, H - w.y1, t, 0, w.y1, z0 - t / 2);
  B.box(M.juraku, w.x0 - x0 + t, w.y1 - w.y0, t, (x0 - t + w.x0) / 2, w.y0, z0 - t / 2);
  B.box(M.juraku, x1 + t - w.x1, w.y1 - w.y0, t, (w.x1 + x1 + t) / 2, w.y0, z0 - t / 2);
  // front wall with the door
  const d = R.door, dx0 = d.x - d.w / 2, dx1 = d.x + d.w / 2;
  B.box(M.paper, dx0 - x0 + t, H - d.y, t, (x0 - t + dx0) / 2, d.y, z1 + t / 2);
  B.box(M.paper, x1 + t - dx1, H - d.y, t, (dx1 + x1 + t) / 2, d.y, z1 + t / 2);
  B.box(M.paper, d.w, H - d.y - d.h, t, d.x, d.y + d.h, z1 + t / 2);
  // partition between kitchen and tatami room, opening x ∈ [-0.7, 0.7], transom above 1.85
  const op = [-0.7, 0.7], ph = 1.85;
  B.box(M.juraku, op[0] - x0, H, 0.1, (x0 + op[0]) / 2, 0, zPart - 0.05);
  B.box(M.juraku, x1 - op[1], H, 0.1, (op[1] + x1) / 2, 0, zPart - 0.05);
  B.box(M.paper, op[0] - x0, H, 0.01, (x0 + op[0]) / 2, 0, zPart + 0.005);
  B.box(M.paper, x1 - op[1], H, 0.01, (op[1] + x1) / 2, 0, zPart + 0.005);
  B.box(M.juraku, op[1] - op[0], H - ph, 0.1, 0, ph, zPart - 0.05);
  // door frame of the opening (posts + kamoi lintel) and a little lattice transom (ranma)
  for (const x of op) B.box(M.wood, 0.07, ph, 0.13, x, 0, zPart - 0.05, { tint: 0xc89868 });
  B.box(M.wood, op[1] - op[0] + 0.14, 0.07, 0.13, 0, ph, zPart - 0.05, { tint: 0xc89868 });
  for (let i = 1; i < 9; i++) B.box(M.wood, 0.015, H - ph - 0.12, 0.02, op[0] + i * (op[1] - op[0]) / 9, ph + 0.08, zPart - 0.05, { tint: 0xb08050 });
  B.box(M.wood, op[1] - op[0], 0.02, 0.02, 0, (ph + H) / 2, zPart - 0.05, { tint: 0xb08050 });
  // ---------------------------------------------------------------- ceilings, posts, mouldings
  B.plane(M.ceil, W, zPart - z0, 0, H, (z0 + zPart) / 2, { down: true });
  B.plane(M.paper, W, z1 - zPart, 0, H, (zPart + z1) / 2, { down: true, tint: 0xf4f0e8 });
  for (const [xa, za, xb, zb] of [[x0, z0, x1, z0], [x0, z0, x0, zPart], [x1, z0, x1, zPart], [x0, zPart, x1, zPart]]) {
    const len = Math.hypot(xb - xa, zb - za), cx = (xa + xb) / 2, cz = (za + zb) / 2, ry = za === zb ? 0 : Math.PI / 2;
    const inX = xa === xb ? (xa < 0 ? 0.02 : -0.02) : 0, inZ = za === zb ? (za < 0 ? 0.02 : -0.02) : 0;
    B.box(M.wood, len, 0.07, 0.03, cx + inX, H - 0.07, cz + inZ, { ry, tint: 0xc89868 }); // mawaribuchi
    B.box(M.wood, len, 0.06, 0.02, cx + inX * 0.6, 0, cz + inZ * 0.6, { ry, tint: 0x8a6040 }); // habaki skirting
    B.box(M.wood, len, 0.09, 0.035, cx + inX, 1.78, cz + inZ, { ry, tint: 0xc89868 }); // nageshi
  }
  for (const [x, z] of [[x0 + 0.05, z0 + 0.05], [x1 - 0.05, z0 + 0.05], [x0 + 0.05, zPart - 0.15], [x1 - 0.05, zPart - 0.15]]) B.box(M.wood, 0.1, H, 0.1, x, 0, z, { tint: 0xc89868 });
  // kitchen skirting
  for (const [xa, xb, z] of [[x0, dx0, z1 - 0.01], [dx1, x1, z1 - 0.01]]) B.box(M.wood, xb - xa, 0.06, 0.02, (xa + xb) / 2, d.y + (xa < -1 ? 0 : 0.12), z, { tint: 0x8a6040 });

  // ---------------------------------------------------------------- the window: sashes, sill, curtains
  const wx = (w.x0 + w.x1) / 2, ww = w.x1 - w.x0, wh = w.y1 - w.y0;
  const al = 0xc8ccd2;
  B.box(M.metal, ww + 0.06, 0.05, 0.12, wx, w.y0 - 0.03, z0 - 0.06, { tint: al });
  B.box(M.metal, ww + 0.06, 0.05, 0.12, wx, w.y1 - 0.02, z0 - 0.06, { tint: al });
  for (const x of [w.x0, w.x1]) B.box(M.metal, 0.04, wh, 0.12, x, w.y0, z0 - 0.06, { tint: al });
  // two sliding sashes: the right one pushed open behind the left
  const sash = (xa, xb, z) => {
    for (const x of [xa + 0.015, xb - 0.015]) B.box(M.metal, 0.03, wh - 0.02, 0.03, x, w.y0 + 0.01, z, { tint: 0xb8bcc2 });
    for (const y of [w.y0 + 0.01, w.y1 - 0.04]) B.box(M.metal, xb - xa, 0.03, 0.03, (xa + xb) / 2, y, z, { tint: 0xb8bcc2 });
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(xb - xa - 0.03, wh - 0.06), M.glass);
    gl.position.set((xa + xb) / 2, (w.y0 + w.y1) / 2, z); gl.userData.noRim = true;
    group.add(gl);
  };
  sash(w.x0 + 0.02, wx + 0.12, z0 - 0.04);
  sash(wx - 0.3, w.x1 - 0.32, z0 - 0.08);
  B.box(M.woodL, ww + 0.16, 0.03, 0.16, wx, w.y0 - 0.06, z0 + 0.05, { tint: 0xd8b888 }); // inner sill board
  // curtain rail + two curtain panels (folded zig-zag, faintly backlit by the sunset)
  B.box(M.metal, ww + 0.7, 0.03, 0.04, wx, w.y1 + 0.12, z0 + 0.12, { tint: 0xe8e8ec });
  const curtainPix = new Pix(32, 64, 9);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 32; x++) curtainPix.px(x, y, ((x >> 2) + (y >> 3)) % 4 === 0 && (y % 8 === 3) ? 0xfff6e0 : (((x * 7 + y * 3) % 23 === 0) ? 0xa8d8c8 : 0x8ac8b4));
  const curtMat = new THREE.MeshStandardMaterial({ map: T.texOf(curtainPix), roughness: 0.95, side: THREE.DoubleSide, emissive: 0xff9a50, emissiveIntensity: 0.12 });
  const curtain = (xa, xb, folds) => {
    const n = folds * 2, cw = (xb - xa) / n, ch = w.y1 + 0.1 - (w.y0 - 0.25);
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const zz = z0 + 0.1 + (i % 2 ? 0.06 : 0);
      pos.push(xa + i * cw, w.y0 - 0.25, zz, xa + i * cw, w.y0 - 0.25 + ch, zz);
      uv.push(i / n * 2, 0, i / n * 2, 1);
      if (i < n) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, curtMat); m.receiveShadow = true;
    group.add(m);
    return m;
  };
  out.curtains = [curtain(w.x0 - 0.32, w.x0 + 0.1, 3), curtain(w.x1 - 0.12, w.x1 + 0.32, 3)];
  out.curtMat = curtMat;

  // ---------------------------------------------------------------- outside: balcony + the painted lane at dusk
  const bz0 = z0 - t, bz1 = bz0 - 1.05, by = 0.42 - 0.4; // balcony floor ~ same level (ground floor raised 0.4 m)
  O.plane(M.out, 3.8, 1.05, wx, by - 0.02, (bz0 + bz1) / 2, { tint: 0x9a8a7a });
  for (const x of [wx - 1.85, wx + 1.85]) O.box(M.out, 0.04, 1.9, 1.05, x, by, (bz0 + bz1) / 2, { tint: 0xd8ccbc }); // partition panels
  O.quad(M.out, 3.7, 0.95, wx, by, bz1, { tint: 0x7a7a80 }); // railing panel (frosted)
  O.box(M.out, 3.75, 0.04, 0.07, wx, by + 0.95, bz1, { tint: 0xd8dce2 });
  for (let i = 0; i <= 18; i++) O.box(M.out, 0.025, 0.9, 0.025, wx - 1.85 + i * (3.7 / 18), by + 0.05, bz1 + 0.04, { tint: 0xa8acb2 });
  O.box(M.out, 3.6, 0.025, 0.025, wx, by + 1.95, (bz0 + bz1) / 2 + 0.1, { tint: 0x7ab0d8 }); // laundry pole
  O.box(M.out, 0.36, 0.5, 0.01, wx - 0.6, by + 1.45, (bz0 + bz1) / 2 + 0.1, { tint: 0xf4f0e6, ry: 0.15 });
  O.box(M.out, 0.3, 0.42, 0.01, wx + 0.3, by + 1.52, (bz0 + bz1) / 2 + 0.1, { tint: 0xffa0b8, ry: -0.1 });
  O.box(M.out, 0.08, 0.2, 0.01, wx + 0.75, by + 1.73, (bz0 + bz1) / 2 + 0.1, { tint: 0xf4f0e6 });
  O.box(M.out, 0.08, 0.2, 0.01, wx + 0.86, by + 1.73, (bz0 + bz1) / 2 + 0.1, { tint: 0xf4f0e6 });
  O.box(M.out, 3.8, 0.12, 1.1, wx, by + 2.45, (bz0 + bz1) / 2, { tint: 0x8a8278 }); // 2F balcony slab above
  O.box(M.out, 0.4, 0.3, 0.3, wx + 1.5, by, bz0 - 0.25, { tint: 0xb8b4aa }); // AC outdoor unit
  // three painted layers (lane + houses, skyline + sky) with parallax
  const lay = (pix, wM, hM, x, y, z, alpha) => {
    const map = T.texOf(pix);
    map.minFilter = THREE.NearestFilter; map.generateMipmaps = false;
    const m = new THREE.MeshBasicMaterial({ map, fog: false, transparent: false, alphaTest: alpha ? 0.5 : 0, toneMapped: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(wM, hM), m);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  const sky = lay(T.viewSky(640, 320), 16, 8, wx, 3.4, bz1 - 6.5, false);
  const lane = lay(T.viewLane(640, 300), 11, 5.2, wx, 2.0, bz1 - 3.0, true);
  out.view = { sky, lane, mats: [sky.material, lane.material] };

  // ---------------------------------------------------------------- the oshiire closet in the west wall
  const cz0 = -2.05, cz1 = -0.45, cx0 = x0 - 0.85;
  B.box(M.paper, 0.85, 0.02, cz1 - cz0, x0 - 0.42, 0.0, (cz0 + cz1) / 2, { tint: 0xe8dcc0 });
  B.box(M.woodL, 0.85, 0.03, cz1 - cz0, x0 - 0.42, 0.82, (cz0 + cz1) / 2, { tint: 0xd8b888 }); // nakadana shelf
  B.box(M.paper, 0.02, H, cz1 - cz0, cx0, 0, (cz0 + cz1) / 2, { tint: 0xd8ccb0 });
  B.box(M.paper, 0.85, H, 0.02, x0 - 0.42, 0, cz0 - 0.01, { tint: 0xd8ccb0 });
  B.box(M.paper, 0.85, H, 0.02, x0 - 0.42, 0, cz1 + 0.01, { tint: 0xd8ccb0 });
  B.plane(M.paper, 0.85, cz1 - cz0, x0 - 0.42, 1.78, (cz0 + cz1) / 2, { down: true, tint: 0xd8ccb0 });
  // the wall above the closet + frame (kamoi / shikii)
  B.box(M.juraku, t, H - 1.78, cz1 - cz0, x0 - t / 2, 1.78, (cz0 + cz1) / 2);
  B.box(M.wood, 0.06, 0.06, cz1 - cz0 + 0.06, x0 + 0.01, 1.74, (cz0 + cz1) / 2, { tint: 0xc89868 });
  B.box(M.wood, 0.06, 0.03, cz1 - cz0, x0 + 0.01, 0, (cz0 + cz1) / 2, { tint: 0xa87850 });
  // fusuma: the left leaf closed, the right one slid behind it (so half the closet shows)
  const fus = [unitMat(T.fusuma(58, 112, 1)), unitMat(T.fusuma(58, 112, 2))];
  const fw = (cz1 - cz0) / 2;
  const leaf = (m, z, dx) => { const g = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.74, fw), [m, m, M.edge, M.edge, M.edge, M.edge]); g.position.set(x0 + dx, 0.87, z); group.add(g); return g; };
  leaf(fus[0], cz0 + fw / 2, -0.015);
  leaf(fus[1], cz0 + fw / 2 + 0.12, -0.05);
  // what's inside: a folded spare futon, clear drawer bins, a box from Grandpa and a paper bag of capsules
  for (const [y, h, c] of [[0.85, 0.14, 0xf0e6d0], [0.99, 0.12, 0x8ab0d8], [1.11, 0.13, 0xf4d8b8]]) B.box(M.paint, 0.7, h, 0.75, x0 - 0.45, y, cz1 - 0.42, { tint: c });
  for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) {
    B.box(M.paint, 0.38, 0.24, 0.36, x0 - 0.4, 0.02 + j * 0.26, cz1 - 0.22 - i * 0.39, { tint: 0xe8ecf0 });
    B.box(M.paint, 0.3, 0.16, 0.01, x0 - 0.2, 0.06 + j * 0.26, cz1 - 0.22 - i * 0.39, { tint: [0xd8463a, 0x3a5288, 0xf4f0e6, 0x6a8a5a, 0xffd23f, 0x8a5bd6][i * 3 + j], ry: Math.PI / 2 });
  }
  B.box(M.paint, 0.5, 0.3, 0.42, x0 - 0.45, 1.25, cz1 - 0.38, { tint: 0xc8a070 });
  B.box(M.paint, 0.3, 0.06, 0.005, x0 - 0.2, 1.42, cz1 - 0.38, { tint: 0x2a2a3a, ry: Math.PI / 2 });

  // ---------------------------------------------------------------- the front door (inside face) + genkan bits
  const doorMat = unitMat(T.doorInside(40, 88), { roughness: 0.5, metalness: 0.2 });
  const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(d.w, d.h, 0.05), [M.edge, M.edge, M.edge, M.edge, M.edge, doorMat]);
  doorLeaf.geometry.translate(d.w / 2, 0, 0); // hinge on the left edge
  doorLeaf.position.set(dx0, d.y + d.h / 2, z1 - 0.03);
  doorLeaf.rotation.y = 0;
  group.add(doorLeaf);
  out.doorLeaf = doorLeaf;
  for (const x of [dx0 - 0.03, dx1 + 0.03]) B.box(M.metal, 0.06, d.h + 0.03, 0.08, x, d.y, z1 - 0.02, { tint: 0x9a9488 });
  B.box(M.metal, d.w + 0.12, 0.06, 0.08, d.x, d.y + d.h, z1 - 0.02, { tint: 0x9a9488 });
  out.targets.door = doorLeaf;
  // light switch + intercom by the door, a coat hook with a tote bag
  B.box(M.paint, 0.08, 0.12, 0.015, -0.62, 1.15, z1 - 0.008, { tint: 0xf4f0e8 });
  B.box(M.paint, 0.03, 0.05, 0.01, -0.62, 1.18, z1 - 0.018, { tint: 0xe0dcd0 });
  B.box(M.paint, 0.12, 0.17, 0.03, -0.62, 1.38, z1 - 0.015, { tint: 0xe8e4da });
  B.box(M.glow, 0.02, 0.01, 0.005, -0.6, 1.5, z1 - 0.032, { tint: 0x60ff80 });
  B.box(M.metal, 0.02, 0.02, 0.08, -0.35, 1.62, z1 - 0.04, { tint: 0xc8ccd2 });
  B.box(M.paint, 0.3, 0.38, 0.06, -0.35, 1.2, z1 - 0.06, { tint: 0xe8d8b0 });
  B.box(M.paint, 0.26, 0.1, 0.005, -0.35, 1.36, z1 - 0.092, { tint: 0x2f6fd6 });

  // ---------------------------------------------------------------- kitchen: upper cupboard, frosted window, bath door
  B.box(M.paint, 1.2, 0.55, 0.34, 0.6, 1.62, z1 - 0.17, { tint: 0xf0e6cc });
  for (const x of [0.3, 0.9]) { B.box(M.paint, 0.56, 0.5, 0.01, x, 1.645, z1 - 0.345, { tint: 0xf6eedc }); B.box(M.metal, 0.08, 0.015, 0.02, x + (x < 0.5 ? 0.2 : -0.2), 1.69, z1 - 0.355, { tint: 0xc8ccd2 }); }
  const kw = new Pix(16, 12, 3); kw.gradient(0, 0, 16, 12, 0xffd0a0, 0xff9a60); for (let x = 0; x < 16; x += 3) for (let y = 0; y < 12; y++) if ((x + y) % 2) kw.px(x, y, 0xffe0b8);
  kw.frame(0, 0, 16, 12, 0xb8bcc2);
  B.quad(new THREE.MeshBasicMaterial({ map: T.texOf(kw), vertexColors: true }), 0.55, 0.4, 0.42, 1.12, z1 - 0.005, { ry: Math.PI, tint: 0xffffff, k: 0.9 });
  // folding bath door in the east wall of the kitchen
  const bd = new Pix(24, 64, 5); bd.fill(0xe8e8ec); bd.frame(0, 0, 24, 64, 0x9a9ea4); bd.rect(3, 6, 18, 30, 0xc8d8e0); for (let y = 6; y < 36; y += 2) bd.rect(3, y, 18, 1, 0xd8e4ea); bd.rect(11, 0, 1, 64, 0xb8bcc2); bd.rect(17, 38, 3, 6, 0x8a8e94);
  B.quad(unitMat(bd, { roughness: 0.4 }), 0.68, 1.85, x1 - 0.005, 0, 0.95, { ry: -Math.PI / 2 });
  B.box(M.paint, 0.03, 0.06, 0.74, x1 - 0.015, 1.85, 0.95, { tint: 0xb8bcc2 });

  // ---------------------------------------------------------------- lamp
  const lampSize = propSize('room_lamp');
  const voxMats = voxelMaterials('normal');
  const offMats = voxMats.slice(); offMats[3] = new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(0.32, 0.31, 0.3) });
  const lamp = new THREE.Mesh(propGeometry('room_lamp'), voxMats);
  lamp.position.set(R.lamp.x, H - lampSize.y + 0.005, R.lamp.z);
  group.add(lamp);
  out.lamp = { mesh: lamp, on: voxMats, off: offMats };

  // ---------------------------------------------------------------- props
  const prop = (id, x, y, z, ry = 0, s = 1, name = null) => {
    const g = propGeometry(id);
    if (!g) return null;
    const m = new THREE.Mesh(g, voxMats);
    m.position.set(x, y, z); m.rotation.y = ry; m.scale.setScalar(s);
    m.receiveShadow = true;
    group.add(m);
    if (name) out.props[name] = m;
    return m;
  };
  const block = (xa, xb, za, zb) => out.obstacles.push([xa, xb, za, zb]);
  // bedding
  const fu = prop('room_futon', R.futon.x, 0, R.futon.z, 0, 1, 'futon');
  out.targets.futon = fu;
  block(R.futon.x - 0.5, R.futon.x + 0.5, R.futon.z - 1.0, R.futon.z + 1.0);
  prop('room_plush', R.futon.x + 0.28, 0.08, R.futon.z - 0.72, 0.5, 1, 'plush');
  prop('room_laundry', -0.35, 0, 0.12, 0.4);
  prop('room_boxes', x0 + 0.27, 0, zPart - 0.3, 0.15);
  block(x0, x0 + 0.52, zPart - 0.55, zPart);
  // desk + PC + chair against the east wall (desk front faces -x)
  const dk = R.desk;
  prop('room_desk', dk.x, 0, dk.z, -Math.PI / 2, 1, 'desk');
  block(dk.x - 0.29, x1, dk.z - 0.56, dk.z + 0.56);
  const pc = buildPC();
  pc.root.position.set(dk.x + 0.04, 0.72, dk.z + 0.05);
  pc.root.rotation.y = -Math.PI / 2;
  group.add(pc.root);
  out.pc = pc;
  out.targets.pc = pc.root;
  const dl = prop('desk_lamp', dk.x + 0.1, 0.72, dk.z + 0.46, -Math.PI / 2 - 0.5, 0.85, 'deskLamp');
  if (dl) out.deskLamp = dl;
  prop('room_mug', dk.x - 0.2, 0.72, dk.z - 0.32, 0.4);
  prop('room_chair', dk.x - 0.62, 0, dk.z + 0.08, Math.PI / 2 + 0.35, 1, 'chair');
  block(dk.x - 0.86, dk.x - 0.38, dk.z - 0.18, dk.z + 0.32);
  // bookshelf + figure display shelf + calendar on the east wall
  prop('room_bookshelf', x1 - 0.16, 0, -0.55, -Math.PI / 2, 1, 'bookshelf');
  block(x1 - 0.32, x1, -0.78, -0.32);
  prop('daruma', x1 - 0.16, 0.91, -0.66, -Math.PI / 2 - 0.3, 0.7);
  prop('manga_stack', x1 - 0.3, 0, 0.12, 0.3, 0.9);
  const fs = prop('room_figshelf', x1 - 0.1, 1.18, dk.z, -Math.PI / 2, 1, 'figShelf');
  out.targets.figShelf = fs;
  // figure slots on the three ledges (room-local positions; figures face -x into the room)
  for (const [ly, n] of [[1.2, 6], [1.44, 6], [1.68, 6]]) for (let i = 0; i < n; i++) out.figSlots.push(new THREE.Vector3(x1 - 0.1, ly + 0.003, dk.z - 0.28 + i * 0.112));
  // TV corner under the right side of the window
  prop('room_tvrack', 0.86, 0, z0 + 0.2, 0, 1, 'tvrack');
  block(0.48, 1.24, z0, z0 + 0.4);
  prop('crt_tv', 0.86, 0.39, z0 + 0.2, -0.12, 0.85, 'tv');
  prop('room_console', 0.55, 0, z0 + 0.62, 0.3, 1, 'console');
  out.targets.tv = out.props.tv;
  prop('fan', -0.1, 0, z0 + 0.32, 0.5, 0.75);
  // chabudai with dinner leftovers
  prop('room_table', 0.15, 0, -0.75, 0.2, 1, 'table');
  block(-0.22, 0.52, -1.12, -0.38);
  prop('room_cupnoodle', 0.05, 0.33, -0.72, 0.6);
  prop('room_mug', 0.33, 0.33, -0.9, -0.5);
  prop('room_zabuton', 0.2, 0, -0.08, 0.1);
  prop('room_phone', -0.06, 0.33, -1.0, 0.3);
  // trash bin, clock, AC
  prop('room_trash', 1.0, 0, -0.55, 0);
  block(0.88, 1.12, -0.67, -0.43);
  prop('room_clock', -0.95, 1.55, zPart - 0.105, Math.PI);
  prop('room_ac', 1.15, 2.04, zPart - 0.21, Math.PI);
  prop('room_hanger', x0 + 0.04, 1.08, -0.05, Math.PI / 2, 1);
  // kitchen
  prop('room_kitchen', 0.6, 0, z1 - 0.3, Math.PI, 1, 'kitchen');
  prop('fridge', 1.52, 0, z1 - 0.28, Math.PI, 0.95, 'fridge');
  block(-0.02, x1, z1 - 0.62, z1);
  prop('room_shoes', -1.48, d.y, z1 - 0.38, 0.2);
  prop('sandals', -1.05, d.y, z1 - 0.3, -0.3, 0.9);
  prop('umbrella_stand', -0.95, 0, gk.z0 - 0.12, 0, 0.8);
  // the genkan is a step down: you stay on the wooden floor
  block(x0, gk.x1, gk.z0 + 0.04, z1);
  block(-0.98 - 0.12, -0.98 + 0.12, gk.z0 - 0.24, gk.z0 + 0.0);
  // walls
  block(x0 - 0.5, x0, z0 - 0.5, z1 + 0.5); block(x1, x1 + 0.5, z0 - 0.5, z1 + 0.5);
  block(x0 - 0.5, x1 + 0.5, z0 - 0.5, z0); block(x0 - 0.5, x1 + 0.5, z1, z1 + 0.5);
  block(x0, op[0], zPart - 0.1, zPart + 0.01); block(op[1], x1, zPart - 0.1, zPart + 0.01);
  // invisible ray blockers so you can't click through the partition / walls
  out.blockers = [];
  const bl = (wM, hM, dM, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(wM, hM, dM), new THREE.MeshBasicMaterial({ visible: false })); m.position.set(x, y, z); group.add(m); out.blockers.push(m); };
  bl(op[0] - x0, H, 0.1, (x0 + op[0]) / 2, H / 2, zPart - 0.05);
  bl(x1 - op[1], H, 0.1, (op[1] + x1) / 2, H / 2, zPart - 0.05);
  bl(op[1] - op[0], H - ph, 0.1, 0, (ph + H) / 2, zPart - 0.05);

  // ---------------------------------------------------------------- posters + calendar
  const poster = (tex, wM, hM, x, y, z, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(wM, hM), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 }));
    m.position.set(x, y, z); m.rotation.y = ry; m.rotation.z = (hash2(x * 10, z * 10) - 0.5) * 0.03;
    group.add(m);
    return m;
  };
  poster(T.texOf(T.posterMikanRun()), 0.42, 0.6, 0.97, 1.3, z0 + 0.006, 0);
  poster(T.texOf(T.posterKaiju()), 0.42, 0.6, 1.2, 1.2, zPart - 0.106, Math.PI);
  poster(flyerTexture('space'), 0.36, 0.51, -1.42, 1.2, zPart - 0.106, Math.PI);
  poster(T.texOf(T.posterIdol()), 0.38, 0.54, x1 - 0.006, 1.4, -0.1, -Math.PI / 2);
  poster(flyerTexture('brain'), 0.3, 0.42, 1.25, 1.45, zPart + 0.016, 0);
  const calPix = new Pix(40, 64, 7);
  T.drawCalendar(calPix, game.state.day || 1);
  const calTex = T.texOf(calPix);
  const cal = poster(calTex, 0.3, 0.48, x1 - 0.006, 1.42, 0.25, -Math.PI / 2);
  out.calendar = { pix: calPix, tex: calTex, mesh: cal };
  out.targets.calendar = cal;
  // window as a target ("look outside")
  const winT = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), new THREE.MeshBasicMaterial({ visible: false }));
  winT.position.set(wx, (w.y0 + w.y1) / 2, z0 + 0.02);
  group.add(winT);
  out.targets.window = winT;

  B.build(group);
  O.build(group);
  return out;
}
