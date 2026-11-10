// Your room, built for real: a 1K at SAKURA HEIGHTS #102 (spring 1999) in local coordinates (origin = the middle of the
// floor, +z = the front door / kitchen strip, -z = the window). The six-mat washitsu is laid tatami by tatami (no four
// corners meet), with juraku sand plaster, light hinoki-coloured posts, habaki skirting, a nageshi over the window head
// and the mawaribuchi round a sao-buchi board ceiling; the oshiire in the west wall has a pair of painted fusuma (one
// slid open on the spare futon and the clear drawer bins); an aluminium sash with the right pane slid open, a wide
// madoita sill and mint curtains; the partition's opening has a kumiko ranma over it. The kitchen strip has wood-look
// flooring, vinyl wallpaper, the steel front door with its lever, scope and guard, a stepped-down genkan in grey
// tiles, a wall cupboard, the frosted kitchen window glowing with the evening, and the old folding bath door. Outside:
// the balcony (railing, partitions, the laundry pole) and the painted lane at dusk. The square washi pendant hangs over
// the chabudai. Surfaces are the shared photo library (src/places/ikit.js); props come from propMesh.
//   buildRoomDetailed(game, group, places) -> the same record as src/room/build.js buildRoom (lamp, view, figSlots, targets,
//   obstacles, props, futonAt, sofaAt, curtMat, calendar ...); lamp = { mesh, on, off } (swap mesh.material)
import * as THREE from 'three';
import { propMesh } from '../../world/props.js';
import { flyerTexture } from '../../gfx/flyers.js';
import { Pix } from '../../gfx/pix.js';
import { ROOM } from '../../room/build.js';
import * as T from '../../room/textures.js';
import { buildPC } from '../../room/pcModel.js';
import { PHOTO_TEX } from '../../kit/photoTex.js';
import { IKit, imats, surf, convertAll } from '../ikit.js';

export { ROOM };

export function buildRoomDetailed(game, group, places) {
  const conv = places._ikConv ||= (m) => places.mat(m);
  const M = imats(conv);
  const K = new IKit(M), F = K.root;
  const R = ROOM, { x0, x1, z0, z1, H, zPart } = R;
  const out = { targets: {}, obstacles: [], figSlots: [], props: {}, mats: M };
  const t = 0.12, ZP = zPart - 0.1; // the partition's tatami-side face
  const FW = K.at(x0, 0, 0, Math.PI / 2);   // west wall: local +z = into the room (+x), local x = -world z
  const FF = K.at(0, 0, z1, Math.PI);       // front wall: local +z = -z, local x = -world x
  const FE = K.at(x1, 0, 0, -Math.PI / 2);  // east wall: local +z = -x, local x = world z
  const JUR = 0xd2c19a, PAPER = 0xece6d8, HINOKI = 0xc79a6a, HABAKI = 0x6e4a32;

  // ---------------------------------------------------------------- floors
  F.box('flat', x0, -0.08, z0, x1, -0.056, zPart, { tint: 0x2e2622 }); // under the mats (the seams read dark)
  const rows = [z0, -1.38, -0.51, ZP];
  const mats = [[x0, rows[0], -0.9, rows[2]], [-0.9, rows[0], 0.9, rows[1]], [0.9, rows[0], x1, rows[2]], [-0.9, rows[1], 0.9, rows[2]], [x0, rows[2], 0, rows[3]], [0, rows[2], x1, rows[3]]];
  mats.forEach(([a, b, c, d], i) => F.tatami(a, b, c, d, { tint: [0xc4b984, 0xc0b47c, 0xc6bb88, 0xbeb27a, 0xc2b680, 0xc0b57e][i] }));
  // the shikii in the opening and under the partition
  F.box('wood', x0, -0.06, ZP, x1, 0.004, zPart + 0.01, { tint: 0xb48a5c, grain: 'x', bevel: 0.004 });
  const gk = { x1: -0.8, z0: 1.38 }, dy = R.door.y;
  F.box('wood', gk.x1, -0.05, zPart + 0.01, x1, 0, z1, { tint: 0xb98a5a, grain: 'z' });
  F.box('wood', x0, -0.05, zPart + 0.01, gk.x1, 0, gk.z0, { tint: 0xb98a5a, grain: 'z' });
  // the genkan a step down: 30 cm grey tiles, the agari-kamachi, a tiled riser on the side
  F.box('ftile', x0, dy - 0.04, gk.z0, gk.x1, dy, z1, { tint: 0x9a958c });
  F.box('timber', x0, dy, gk.z0 - 0.005, gk.x1 + 0.01, 0.006, gk.z0 + 0.09, { tint: 0x8a5a36, grain: 'x', bevel: 0.008 });
  F.box('ftile', gk.x1, dy, gk.z0 + 0.09, gk.x1 + 0.02, 0, z1, { tint: 0x8e8980 });

  // ---------------------------------------------------------------- walls (shells behind the faces)
  for (const [xa, xb] of [[x0 - t, x0], [x1, x1 + t]]) {
    F.box('juraku', xa, 0, z0 - t, xb, H, ZP, { tint: JUR });
    F.box('wallpaper', xa, dy, zPart, xb, H, z1 + t, { tint: PAPER });
  }
  const w = R.win;
  F.box('juraku', x0 - t, 0, z0 - t, x1 + t, w.y0, z0, { tint: JUR });
  F.box('juraku', x0 - t, w.y1, z0 - t, x1 + t, H, z0, { tint: JUR });
  F.box('juraku', x0 - t, w.y0, z0 - t, w.x0, w.y1, z0, { tint: JUR });
  F.box('juraku', w.x1, w.y0, z0 - t, x1 + t, w.y1, z0, { tint: JUR });
  const d = R.door, dx0 = d.x - d.w / 2, dx1 = d.x + d.w / 2;
  F.box('wallpaper', x0 - t, dy, z1, dx0 - 0.04, H, z1 + t, { tint: PAPER });
  F.box('wallpaper', dx1 + 0.04, dy, z1, x1 + t, H, z1 + t, { tint: PAPER });
  F.box('wallpaper', dx0 - 0.04, d.y + d.h + 0.05, z1, dx1 + 0.04, H, z1 + t, { tint: PAPER });
  // the partition: juraku on the tatami side, wallpaper on the kitchen side, an opening x -0.7..0.7
  const op = [-0.7, 0.7], ph = 1.85;
  for (const [a, b] of [[x0, op[0]], [op[1], x1]]) { F.box('juraku', a, 0, ZP, b, H, ZP + 0.05, { tint: JUR }); F.box('wallpaper', a, 0, ZP + 0.05, b, H, zPart, { tint: PAPER }); }
  F.box('juraku', op[0], 2.32, ZP, op[1], H, ZP + 0.05, { tint: JUR }); F.box('wallpaper', op[0], 2.32, ZP + 0.05, op[1], H, zPart, { tint: PAPER });
  // its posts, kamoi and the kumiko ranma between the kamoi and the ceiling
  for (const x of op) F.box('wood', x - 0.052, 0, ZP - 0.012, x + 0.052, H, zPart + 0.012, { tint: HINOKI, grain: 'y', bevel: 0.004 });
  F.box('wood', op[0] + 0.05, ph, ZP - 0.008, op[1] - 0.05, ph + 0.06, zPart + 0.008, { tint: HINOKI, grain: 'x', bevel: 0.003 });
  F.box('wood', op[0] + 0.05, 2.3, ZP - 0.008, op[1] - 0.05, 2.33, zPart + 0.008, { tint: HINOKI, grain: 'x', bevel: 0.003 });
  const ry0 = ph + 0.06, ry1 = 2.3, rx0 = op[0] + 0.05, rx1 = op[1] - 0.05, zc = (ZP + zPart) / 2;
  for (let i = 1; i < 12; i++) { const x = rx0 + (rx1 - rx0) * i / 12; F.box('wood', x - 0.006, ry0, zc - 0.012, x + 0.006, ry1, zc + 0.012, { tint: 0xb98c5c, grain: 'y' }); }
  for (const y of [ry0 + (ry1 - ry0) / 3, ry0 + 2 * (ry1 - ry0) / 3]) F.box('wood', rx0, y - 0.006, zc - 0.013, rx1, y + 0.006, zc + 0.013, { tint: 0xb98c5c, grain: 'x' });

  // ---------------------------------------------------------------- the washitsu's woodwork and ceiling
  for (const [x, z] of [[x0, z0], [x1 - 0.1, z0], [x0, ZP - 0.1], [x1 - 0.1, ZP - 0.1]]) F.box('wood', x, 0, z, x + 0.1, H, z + 0.1, { tint: HINOKI, grain: 'y', bevel: 0.004 });
  const runs = [[[x0 + 0.1, z0], [x1 - 0.1, z0], [0, 1]], [[x0, z0 + 0.1], [x0, ZP - 0.1], [1, 0]], [[x1, z0 + 0.1], [x1, ZP - 0.1], [-1, 0]], [[x0 + 0.1, ZP], [op[0] - 0.05, ZP], [0, -1]], [[op[1] + 0.05, ZP], [x1 - 0.1, ZP], [0, -1]]];
  const trim = (a, b, n, y0, y1, depth, tint, skipClosed = false) => {
    const [ax, az] = a, [bx, bz] = b;
    if (skipClosed && ax === x0 && bx === x0) {
      // the west wall: the nageshi runs over the closet, the skirting stops at it
      F.box('wood', x0, y0, z0 + 0.1, x0 + depth, y1, -2.06, { tint, grain: 'z', bevel: 0.003 });
      F.box('wood', x0, y0, -0.44, x0 + depth, y1, ZP - 0.1, { tint, grain: 'z', bevel: 0.003 });
      return;
    }
    const xa = Math.min(ax, bx, ax + n[0] * depth), xb = Math.max(ax, bx, ax + n[0] * depth), za = Math.min(az, bz, az + n[1] * depth), zb = Math.max(az, bz, az + n[1] * depth);
    F.box('wood', xa, y0, za, xb, y1, zb, { tint, grain: ax === bx ? 'z' : 'x', bevel: 0.003 });
  };
  for (const [a, b, n] of runs) {
    trim(a, b, n, 0, 0.055, 0.014, HABAKI, true);
    trim(a, b, n, 1.95, 2.04, 0.032, HINOKI);
    trim(a, b, n, H - 0.06, H, 0.028, HINOKI);
  }
  // sao-buchi ceiling: boards along x, battens across them every 45 cm
  F.box('ply', x0, H, z0, x1, H + 0.02, ZP, { tint: 0xc8a57a });
  for (let x = x0 + 0.45; x < x1 - 0.1; x += 0.45) F.box('wood', x - 0.015, H - 0.03, z0, x + 0.015, H, ZP, { tint: 0xa77a4e, grain: 'z' });
  for (let z = z0 + 0.3; z < ZP; z += 0.3) F.box('flat', x0, H - 0.0025, z - 0.0015, x1, H, z + 0.0015, { tint: 0x8e6a48 });
  F.box('wallpaper', x0, H, zPart, x1, H + 0.02, z1, { tint: 0xf1eee6 });
  // kitchen skirting (vinyl) and a ceiling cornice strip
  for (const [a, b, zz] of [[x0, dx0 - 0.04, z1 - 0.012], [dx1 + 0.04, x1, z1 - 0.012]]) F.box('satin', a, a < -1 ? dy : 0, zz, b, (a < -1 ? dy : 0) + 0.06, z1, { tint: 0x8a7a6a });
  F.box('satin', x0, 0, zPart + 0.01, x0 + 0.012, 0.06, gk.z0, { tint: 0x8a7a6a }); F.box('satin', x1 - 0.012, 0, zPart + 0.01, x1, 0.06, z1 - 0.62, { tint: 0x8a7a6a });

  // ---------------------------------------------------------------- the window: sash, madoita, curtains
  const wx = (w.x0 + w.x1) / 2, ww = w.x1 - w.x0;
  F.sash(w.x0, w.x1, w.y0, w.y1, z0, { open: 0.3, depth: 0.12 });
  F.box('wood', w.x0 - 0.08, 0.735, z0 - 0.04, w.x1 + 0.08, 0.765, z0 + 0.12, { tint: 0xc9a172, grain: 'x', bevel: 0.006 });
  F.box('wood', w.x0 - 0.06, 1.93, z0, w.x1 + 0.06, 1.95, z0 + 0.03, { tint: HINOKI, grain: 'x' });
  // curtain rail on two brackets, the gliders, two curtains in soft folds
  const ry = w.y1 + 0.13, rz = z0 + 0.12;
  F.rod('chrome', [w.x0 - 0.4, ry, rz], [w.x1 + 0.4, ry, rz], 0.009, { sides: 12 });
  for (const x of [w.x0 - 0.3, w.x1 + 0.3]) F.box('chrome', x - 0.012, ry - 0.012, z0, x + 0.012, ry + 0.012, rz, { bevel: 0.004 });
  const curtMat = conv(new THREE.MeshStandardMaterial({ map: surf('canvas_cloth'), color: 0x9fd2c0, roughness: 0.96, side: THREE.DoubleSide, emissive: 0xff9a50, emissiveIntensity: 0.12 }));
  const curtain = (xa, xb, folds) => {
    const n = folds * 6, y0 = w.y0 - 0.25, y1 = ry - 0.02, pos = [], uv = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const s = i / n, x = xa + (xb - xa) * s, zz = rz + 0.035 + 0.035 * Math.sin(s * folds * Math.PI * 2);
      for (const [y, k] of [[y0, 0], [y0 + 0.5, 0.4], [y1, 1]]) { pos.push(x, y, zz + (1 - k) * 0.01 * Math.sin(s * 9)); uv.push(x * 2.5, y * 2.5); }
      if (i < n) { const a = i * 3; idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, curtMat); m.receiveShadow = true; group.add(m);
    return m;
  };
  out.curtains = [curtain(w.x0 - 0.36, w.x0 + 0.08, 3), curtain(w.x1 - 0.1, w.x1 + 0.36, 3)];
  out.curtMat = curtMat;
  for (const x of [w.x0 - 0.36, w.x1 + 0.36]) F.lathe('gloss', x, ry - 0.005, rz + 0.04, [[0, -0.012], [0.012, -0.01], [0.014, 0], [0.012, 0.01], [0, 0.012]], 10, { tint: 0xe4e0d6, axis: 'z' });

  // ---------------------------------------------------------------- outside: the balcony and the lane at dusk
  const bmat = (name) => { const m = new THREE.MeshBasicMaterial({ map: name ? surf(name) : null, vertexColors: true, fog: false }); if (name) m.userData.avg = PHOTO_TEX[name].avg; return m; };
  const OM = { conc: bmat('concrete'), paint: bmat('steel_painted'), cloth: bmat('canvas_cloth'), flat: bmat(null), frost: bmat('frosted_glass') };
  const KO = new IKit(OM), O = KO.root;
  const bz0 = z0 - t, bz1 = bz0 - 1.05, by = 0;
  O.box('conc', wx - 1.9, by - 0.12, bz1, wx + 1.9, by - 0.02, bz0, { tint: 0x9c9488 });
  for (const x of [wx - 1.9, wx + 1.86]) O.box('paint', x, by - 0.02, bz1, x + 0.04, by + 1.9, bz0, { tint: 0xd6ccbc, bevel: 0.006 });
  O.box('frost', wx - 1.86, by + 0.1, bz1 - 0.01, wx + 1.86, by + 0.9, bz1 + 0.005, { tint: 0x9aa2a6 });
  O.box('paint', wx - 1.88, by + 0.9, bz1 - 0.035, wx + 1.88, by + 0.96, bz1 + 0.035, { tint: 0xd8dce2, bevel: 0.01 });
  for (let i = 0; i <= 12; i++) O.box('paint', wx - 1.85 + i * (3.7 / 12) - 0.012, by, bz1 + 0.02, wx - 1.85 + i * (3.7 / 12) + 0.012, by + 0.92, bz1 + 0.044, { tint: 0xa8acb2 });
  O.box('conc', wx - 1.9, by + 2.38, bz1 - 0.05, wx + 1.9, by + 2.52, bz0, { tint: 0x8a8278 });
  const lp = (bz0 + bz1) / 2 + 0.1;
  O.rod('paint', [wx - 1.8, by + 1.95, lp], [wx + 1.8, by + 1.95, lp], 0.016, { tint: 0x7ab0d8, sides: 10 });
  for (const [x, wd, h, c, r] of [[wx - 0.6, 0.38, 0.52, 0xf2eee4, 0.12], [wx + 0.25, 0.32, 0.44, 0xf4a8b8, -0.08], [wx + 0.72, 0.09, 0.22, 0xf2eee4, 0], [wx + 0.84, 0.09, 0.22, 0xf2eee4, 0]]) {
    const G2 = KO.at(x, 0, lp, r);
    G2.box('cloth', -wd / 2, by + 1.94 - h, -0.004, wd / 2, by + 1.94, 0.004, { tint: c });
  }
  O.box('paint', wx + 1.3, by, bz0 - 0.4, wx + 1.72, by + 0.32, bz0 - 0.06, { tint: 0xc8c4ba, bevel: 0.015 });
  KO.done(group, 'room102:out');
  const lay = (pix, wM, hM, x, y, z, alpha) => {
    const map = T.texOf(pix); map.minFilter = THREE.NearestFilter; map.generateMipmaps = false;
    const m = new THREE.MeshBasicMaterial({ map, fog: false, alphaTest: alpha ? 0.5 : 0 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(wM, hM), m); mesh.position.set(x, y, z); group.add(mesh);
    return mesh;
  };
  const sky = lay(T.viewSky(640, 320), 16, 8, wx, 3.4, bz1 - 6.5, false);
  const lane = lay(T.viewLane(640, 300), 11, 5.2, wx, 2.0, bz1 - 3.0, true);
  out.view = { sky, lane, mats: [sky.material, lane.material, ...Object.values(OM)] };

  // ---------------------------------------------------------------- the oshiire in the west wall
  const cz0 = -2.05, cz1 = -0.45, cx0 = x0 - 0.85;
  F.box('ply', cx0, -0.02, cz0, x0, 0.0, cz1, { tint: 0xc9b08a });
  F.box('ply', cx0, 0.8, cz0, x0 - 0.02, 0.83, cz1, { tint: 0xcdb48c, bevel: 0.004 });
  F.box('ply', cx0 - 0.02, 0, cz0, cx0, 1.8, cz1, { tint: 0xc0a47e });
  F.box('ply', cx0, 0, cz0 - 0.02, x0, 1.8, cz0, { tint: 0xc0a47e });
  F.box('ply', cx0, 0, cz1, x0, 1.8, cz1 + 0.02, { tint: 0xc0a47e });
  F.box('ply', cx0, 1.78, cz0, x0, 1.8, cz1, { tint: 0xc0a47e });
  F.box('juraku', x0 - t, 1.8, cz0, x0, H, cz1, { tint: JUR });
  F.box('wood', x0 - 0.02, 1.76, cz0 - 0.02, x0 + 0.012, 1.82, cz1 + 0.02, { tint: HINOKI, grain: 'z', bevel: 0.003 });
  F.box('wood', x0 - 0.06, -0.01, cz0, x0 + 0.01, 0.012, cz1, { tint: 0xb08860, grain: 'z', bevel: 0.002 });
  // fusuma: the right leaf closed in front, the left one slid behind it (local x = -z)
  FW.fusuma(-cz1 + 0.78, -cz0, 0.012, 1.76, -0.008, { art: 'right', pull: 'right' });
  FW.fusuma(-cz1 + 0.66, -cz0 - 0.12, 0.012, 1.76, -0.036, { art: 'left', pull: 'left' });
  // inside: the spare futon folded on the shelf, two clear drawer bins below, a box from Grandpa, a bag of capsules
  for (const [y, h, c, inset] of [[0.83, 0.13, 0xece2cc, 0], [0.96, 0.11, 0x8fb3d6, 0.02], [1.07, 0.13, 0xf2d6b8, 0.01]]) F.box('cloth', x0 - 0.8 + inset, y, cz1 - 0.78 + inset, x0 - 0.08 - inset, y + h, cz1 - 0.04, { tint: c, bevel: 0.04 });
  for (let j = 0; j < 3; j++) {
    const y = 0.01 + j * 0.25, za = cz1 - 0.42, zb = cz1 - 0.04;
    F.box('gloss', x0 - 0.62, y, za, x0 - 0.06, y + 0.24, zb, { tint: 0xe6eaee, bevel: 0.012 });
    F.box('cloth', x0 - 0.55, y + 0.04, za + 0.04, x0 - 0.09, y + 0.2, zb - 0.04, { tint: [0x3a5288, 0xd8463a, 0x6a8a5a][j] });
    F.box('satin', x0 - 0.075, y + 0.16, (za + zb) / 2 - 0.06, x0 - 0.062, y + 0.18, (za + zb) / 2 + 0.06, { tint: 0xd8dce0 });
  }
  F.box('card', x0 - 0.66, 1.21, cz1 - 0.74, x0 - 0.18, 1.5, cz1 - 0.36, { tint: 0xb8946a });
  F.box('flat', x0 - 0.181, 1.3, cz1 - 0.66, x0 - 0.178, 1.42, cz1 - 0.44, { tint: 0xf2eee4 });

  // ---------------------------------------------------------------- the front door (inside) and the genkan wall
  const door = K.mesh('satin', (g) => {
    g.tint(0xcfc6b2);
    g.box(dx0 + 0.002, d.y + 0.002, z1 - 0.045, dx1 - 0.002, d.y + d.h - 0.002, z1 - 0.005, { bevel: 0.008 });
    g.tint(0xc4bba6);
    g.box(dx0 + 0.07, d.y + 0.1, z1 - 0.05, dx1 - 0.07, d.y + d.h - 0.1, z1 - 0.045);
  }, { cast: false });
  door.name = 'room102:door';
  group.add(door);
  out.doorLeaf = door; out.targets.door = door;
  for (const [a, b] of [[dx0 - 0.045, dx0], [dx1, dx1 + 0.045]]) F.box('paint', a, dy, z1 - 0.07, b, d.y + d.h + 0.045, z1 + 0.01, { tint: 0x8e887e, bevel: 0.006 });
  F.box('paint', dx0 - 0.045, d.y + d.h, z1 - 0.07, dx1 + 0.045, d.y + d.h + 0.05, z1 + 0.01, { tint: 0x8e887e, bevel: 0.006 });
  // lever handle with its rose, the key cylinder, the scope, the door guard, the mail slot, a door closer
  const hx = dx1 - 0.08, hy = 0.9;
  FF.lathe('chrome', -hx, hy, 0.045, [[0, 0], [0.032, 0], [0.034, 0.006], [0.028, 0.012], [0.012, 0.016], [0, 0.016]], 16, { axis: 'z' });
  FF.rod('chrome', [-hx, hy, 0.055], [-hx, hy, 0.105], 0.009, { sides: 12 });
  FF.rod('chrome', [-hx, hy, 0.105], [-hx + 0.12, hy - 0.005, 0.11], 0.009, { sides: 12 });
  FF.lathe('chrome', -hx, hy + 0.12, 0.045, [[0, 0], [0.018, 0], [0.018, 0.008], [0.006, 0.01], [0, 0.01]], 14, { axis: 'z' });
  FF.lathe('chrome', -d.x, 1.5, 0.045, [[0, 0], [0.012, 0], [0.012, 0.008], [0.005, 0.01], [0, 0.009]], 12, { axis: 'z' });
  FF.box('chrome', -hx - 0.03, 1.36, 0.045, -hx + 0.01, 1.4, 0.06, { bevel: 0.004 });
  FF.rod('chrome', [-hx - 0.02, 1.38, 0.055], [-hx - 0.17, 1.37, 0.06], 0.006, { sides: 8 });
  FF.box('satin', -d.x - 0.17, 0.62, 0.045, -d.x + 0.17, 0.7, 0.062, { tint: 0xb4ae9e, bevel: 0.006 });
  FF.box('satin', -dx0 - 0.3, d.y + d.h - 0.09, 0.045, -dx0 - 0.04, d.y + d.h - 0.03, 0.1, { tint: 0x9a968e, bevel: 0.01 });
  // the switch plate, the intercom handset, a coat hook with the tote bag
  FF.switchPlate(0.62, 1.15, 0);
  FF.box('gloss', 0.56, 1.29, 0, 0.68, 1.47, 0.02, { tint: 0xe8e4da, bevel: 0.008 });
  FF.box('gloss', 0.575, 1.31, 0.02, 0.665, 1.45, 0.05, { tint: 0xeeebe2, bevel: 0.012 });
  FF.box('flat', 0.6, 1.33, 0.05, 0.64, 1.36, 0.0505, { tint: 0x9a968e });
  FF.box('glow', 0.595, 1.495, 0.004, 0.605, 1.505, 0.012, { tint: 0x60e080 });
  FF.rod('chrome', [0.35, 1.62, 0], [0.35, 1.6, 0.06], 0.006, { sides: 8 });
  FF.box('cloth', 0.2, 1.18, 0.03, 0.5, 1.54, 0.09, { tint: 0xe2d2a8, bevel: 0.02 });
  FF.box('cloth', 0.24, 1.38, 0.09, 0.46, 1.48, 0.094, { tint: 0x2f6fd6 });
  for (const sx of [0.26, 0.44]) FF.rod('cloth', [sx, 1.54, 0.06], [0.35, 1.61, 0.05], 0.008, { tint: 0xe2d2a8, sides: 6 });

  // ---------------------------------------------------------------- kitchen: wall cupboard, frosted window, bath door
  F.box('ply', 0.0, 1.62, z1 - 0.34, 1.2, 2.17, z1, { tint: 0xeee4cc, bevel: 0.006 });
  for (const x of [0.3, 0.9]) {
    F.box('ply', x - 0.285, 1.64, z1 - 0.36, x + 0.285, 2.15, z1 - 0.34, { tint: 0xf4ecd8, bevel: 0.004 });
    const hxx = x + (x < 0.5 ? 0.22 : -0.22);
    F.box('chrome', hxx - 0.008, 1.66, z1 - 0.385, hxx + 0.008, 1.76, z1 - 0.37, { bevel: 0.004 });
  }
  const kwx = -0.42, kwy0 = 1.12, kwy1 = 1.52;
  FF.box('glow', kwx - 0.27, kwy0, 0.001, kwx + 0.27, kwy1, 0.004, { tint: 0xffc890 });
  const kwm = new THREE.MeshBasicMaterial({ map: surf('frosted_glass'), color: new THREE.Color(1.15, 0.86, 0.6) });
  const kwg = FF.glass(0.54, 0.4, kwx, (kwy0 + kwy1) / 2, 0.012, { mat: kwm }); kwg.renderOrder = 0;
  FF.sash(kwx - 0.28, kwx + 0.28, kwy0, kwy1, 0.04, { depth: 0.06, noGlass: true });
  // the folding bath door in the east wall (Flat 103's door covers it once you rent 103)
  FE.box('satin', 0.6, 0, -0.01, 1.3, 1.92, 0.012, { tint: 0xb8bcc2, bevel: 0.005 });
  for (const [a, b] of [[0.62, 0.95], [0.95, 1.28]]) {
    FE.box('gloss', a + 0.004, 0.02, 0.0, b - 0.004, 1.86, 0.03, { tint: 0xe6e6ea, bevel: 0.006 });
    FE.box('frost', a + 0.04, 0.95, 0.03, b - 0.04, 1.7, 0.032, { tint: 0xc8d6de });
    for (let y = 0.98; y < 1.7; y += 0.07) FE.box('gloss', a + 0.04, y, 0.032, b - 0.04, y + 0.012, 0.036, { tint: 0xeef0f2 });
  }
  FE.box('satin', 1.22, 0.9, 0.03, 1.25, 1.04, 0.05, { tint: 0x8a8e94, bevel: 0.006 });
  // a small frosted ceiling light over the kitchen floor
  F.lathe('frost', 0.35, H - 0.1, 1.35, [[0, 0], [0.13, 0.01], [0.16, 0.05], [0.16, 0.09], [0.15, 0.1]], 24, { tint: 0xf4f2ec });

  // ---------------------------------------------------------------- the pendant lamp
  const lampMesh = F.washiLamp(R.lamp.x, H, R.lamp.z, { drop: 0.18 });
  out.lamp = { mesh: lampMesh, on: M.washiOn, off: M.washiOff };

  // ---------------------------------------------------------------- props (propMesh, converted to the room's light)
  const prop = (id, x, y, z, ry = 0, s = 1, name = null) => {
    const m = propMesh(id, { castShadow: false });
    if (!m) return null;
    m.position.set(x, y, z); m.rotation.y = ry; if (s !== 1) m.scale.setScalar(s);
    m.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
    group.add(m);
    if (name) out.props[name] = m;
    return m;
  };
  const block = (xa, xb, za, zb) => out.obstacles.push([xa, xb, za, zb]);
  out.futonAt = { x: R.futon.x, z: R.futon.z };
  block(R.futon.x - 0.5, R.futon.x + 0.5, R.futon.z - 1.0, R.futon.z + 1.0);
  prop('room_plush', R.futon.x + 0.28, 0.08, R.futon.z - 0.72, 0.5, 1, 'plush');
  prop('room_laundry', -0.42, 0, 0.18 - 0.1, 0.4);
  const dk = R.desk;
  prop('room_desk', dk.x, 0, dk.z, -Math.PI / 2, 1, 'desk');
  block(dk.x - 0.29, x1, dk.z - 0.56, dk.z + 0.56);
  const pc = buildPC();
  pc.root.position.set(dk.x + 0.04, 0.72, dk.z + 0.05); pc.root.rotation.y = -Math.PI / 2;
  group.add(pc.root);
  out.pc = pc; out.targets.pc = pc.root;
  const dl = prop('desk_lamp', dk.x + 0.1, 0.72, dk.z + 0.46, -Math.PI / 2 - 0.5, 0.85, 'deskLamp');
  if (dl) out.deskLamp = dl;
  prop('room_mug', dk.x - 0.2, 0.72, dk.z - 0.32, 0.4);
  prop('room_chair', dk.x - 0.62, 0, dk.z + 0.08, Math.PI / 2 + 0.35, 1, 'chair');
  block(dk.x - 0.86, dk.x - 0.38, dk.z - 0.18, dk.z + 0.32);
  prop('room_bookshelf', x0 + 0.48, 0, zPart - 0.26 - 0.06, Math.PI, 1, 'bookshelf');
  block(x0 + 0.24, x0 + 0.72, zPart - 0.42, zPart);
  prop('daruma', x0 + 0.38, 0.91, zPart - 0.32, Math.PI + 0.3, 0.7);
  prop('manga_stack', x0 + 0.95, 0, zPart - 0.3, 0.3, 0.9);
  const sofaAt = { x: x1 - 0.27, z: -0.32 };
  prop('sofa_retro', sofaAt.x, 0, sofaAt.z, -Math.PI / 2, 0.8, 'sofa');
  block(sofaAt.x - 0.24, x1, sofaAt.z - 0.42, sofaAt.z + 0.42);
  out.sofaAt = sofaAt;
  out.targets.figShelf = prop('room_figshelf', x1 - 0.1, 1.18, dk.z, -Math.PI / 2, 1, 'figShelf');
  for (const ly of [1.2, 1.44, 1.68]) for (let i = 0; i < 6; i++) out.figSlots.push(new THREE.Vector3(x1 - 0.1, ly + 0.003, dk.z - 0.28 + i * 0.112));
  prop('room_tvrack', 0.86, 0, z0 + 0.2, 0, 1, 'tvrack');
  block(0.48, 1.24, z0, z0 + 0.4);
  prop('crt_tv', 0.86, 0.39, z0 + 0.2, -0.12, 0.85, 'tv');
  prop('room_console', 0.55, 0, z0 + 0.62, 0.3, 1, 'console');
  out.targets.tv = out.props.tv;
  prop('fan', -0.1, 0, z0 + 0.32, 0.5, 0.75);
  prop('room_table', 0.15, 0, -0.75, 0.2, 1, 'table');
  block(-0.22, 0.52, -1.12, -0.38);
  prop('room_cupnoodle', 0.05, 0.33, -0.72, 0.6);
  prop('room_mug', 0.33, 0.33, -0.9, -0.5);
  prop('room_zabuton', 0.2, 0, -0.08 - 0.06, 0.1);
  prop('room_phone', -0.06, 0.33, -1.0, 0.3);
  prop('room_trash', -0.52, 0, z0 + 0.22, 0);
  block(-0.64, -0.4, z0, z0 + 0.34);
  prop('room_clock', -0.95, 1.55, ZP - 0.005, Math.PI);
  prop('room_ac', 1.15, 2.04, ZP - 0.11, Math.PI);
  prop('room_hanger', x0 + 0.04, 1.08, -0.05 - 0.15, Math.PI / 2, 1);
  prop('room_kitchen', 0.6, 0, z1 - 0.3, Math.PI, 1, 'kitchen');
  prop('fridge', 1.52, 0, z1 - 0.28, Math.PI, 0.95, 'fridge');
  block(-0.02, x1, z1 - 0.62, z1);
  prop('room_shoes', -1.48, dy, z1 - 0.38, 0.2);
  prop('sandals', -1.05, dy, z1 - 0.3, -0.3, 0.9);
  prop('umbrella_stand', -0.95, 0, gk.z0 - 0.12, 0, 0.8);
  block(x0, gk.x1, gk.z0 + 0.04, z1);
  block(-0.98 - 0.12, -0.98 + 0.12, gk.z0 - 0.24, gk.z0 + 0.0);
  block(x0 - 0.5, x0, z0 - 0.5, z1 + 0.5); block(x1, x1 + 0.5, z0 - 0.5, z1 + 0.5);
  block(x0 - 0.5, x1 + 0.5, z0 - 0.5, z0); block(x0 - 0.5, x1 + 0.5, z1, z1 + 0.5);
  block(x0, op[0], zPart - 0.1, zPart + 0.01); block(op[1], x1, zPart - 0.1, zPart + 0.01);
  out.blockers = [];
  const bl = (wM, hM, dM, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(wM, hM, dM), new THREE.MeshBasicMaterial({ visible: false })); m.position.set(x, y, z); group.add(m); out.blockers.push(m); };
  bl(op[0] - x0, H, 0.1, (x0 + op[0]) / 2, H / 2, zPart - 0.05);
  bl(x1 - op[1], H, 0.1, (op[1] + x1) / 2, H / 2, zPart - 0.05);
  bl(op[1] - op[0], H - ph, 0.1, 0, (ph + H) / 2, zPart - 0.05);

  // ---------------------------------------------------------------- posters and the calendar (pixel-art prints)
  const poster = (tex, wM, hM, x, y, z, ryy, tilt = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(wM, hM), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 }));
    m.position.set(x, y, z); m.rotation.y = ryy; m.rotation.z = tilt;
    group.add(m);
    return m;
  };
  poster(T.texOf(T.posterMikanRun()), 0.42, 0.6, 0.97, 1.3, z0 + 0.004, 0, 0.01);
  poster(T.texOf(T.posterKaiju()), 0.42, 0.6, 1.2, 1.2, ZP - 0.004, Math.PI, -0.012);
  poster(flyerTexture('space'), 0.36, 0.51, -1.42, 1.2, ZP - 0.004, Math.PI, 0.008);
  poster(T.texOf(T.posterIdol()), 0.38, 0.54, x1 - 0.004, 1.4, -0.1, -Math.PI / 2, -0.006);
  poster(flyerTexture('brain'), 0.3, 0.42, 1.25, 1.45, zPart + 0.004, 0, 0.01);
  const calPix = new Pix(40, 64, 7);
  T.drawCalendar(calPix, game.state.day || 1);
  const calTex = T.texOf(calPix);
  const cal = poster(calTex, 0.3, 0.48, x1 - 0.004, 1.42, 0.25, -Math.PI / 2);
  out.calendar = { pix: calPix, tex: calTex, mesh: cal };
  out.targets.calendar = cal;
  const winT = new THREE.Mesh(new THREE.PlaneGeometry(ww, w.y1 - w.y0), new THREE.MeshBasicMaterial({ visible: false }));
  winT.position.set(wx, (w.y0 + w.y1) / 2, z0 + 0.02);
  group.add(winT);
  out.targets.window = winT;

  K.done(group, 'room102');
  convertAll(group, conv);
  return out;
}
