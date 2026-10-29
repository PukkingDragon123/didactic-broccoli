// MIKAWA-YA, the corner store across the lane (x∈[-15.45,-9.4], z∈[14.9,19.95]): shell, shopfront, signboard, the
// dwelling upstairs and the interior. Built with the town's batcher and materials (t = the Town).
//   buildCornerShop(town)  sets town.cornerShop = { counter, keeper: { pos, rotY }, inside: { minX, maxX, minZ, maxZ }, door }
import * as THREE from 'three';

const ZF = 14.9; // the far building line (Town.js)

export function buildCornerShop(t) {
  const B = t.B, m = t.m;
  const x0 = -15.45, x1 = -9.4, z0 = ZF, z1 = 19.95, cx = (x0 + x1) / 2, H1 = 2.85;
  const dx0 = -13.3, dx1 = -11.55; // door opening
  // floor + threshold
  const I = (k) => t.indoor(k);
  B.box(I(m.tile), x1 - x0 - 0.5, 0.06, z1 - z0 - 0.25, cx, -0.048, (z0 + z1) / 2 + 0.02, { k: 0.9 });
  B.box(m.metal, dx1 - dx0 + 0.2, 0.025, 0.12, (dx0 + dx1) / 2, 0, z0 + 0.02, { tint: 0xb8bcc0 });
  // shell: side walls (both floors), back wall, ceiling / 2F floor
  for (const [xa, xb] of [[x0, x0 + 0.25], [x1 - 0.25, x1]]) {
    B.box(m.mortar, 0.25, H1 + 0.1, z1 - z0, (xa + xb) / 2, 0, (z0 + z1) / 2, { uv: [0, 0], ao: 0.15 });
  }
  B.box(m.mortar, x1 - x0, H1 + 0.1, 0.25, cx, 0, z1 - 0.125, { ao: 0.15 });
  // interior finishes: wainscot + plaster on the inner faces
  for (const sx of [-1, 1]) {
    const wx = sx < 0 ? x0 + 0.26 : x1 - 0.26;
    B.box(I(m.koshi), 0.02, 0.9, z1 - z0 - 0.3, wx, 0, (z0 + z1) / 2, { k: 0.9 });
    B.box(I(m.shikkui), 0.02, H1 - 0.9, z1 - z0 - 0.3, wx, 0.9, (z0 + z1) / 2, { k: 0.9 });
  }
  B.box(I(m.koshi), x1 - x0 - 0.5, 0.9, 0.02, cx, 0, z1 - 0.26, { k: 0.9 });
  B.box(I(m.shikkui), x1 - x0 - 0.5, H1 - 0.9, 0.02, cx, 0.9, z1 - 0.26, { k: 0.9 });
  B.box(I(m.ceil), x1 - x0 - 0.5, 0.06, z1 - z0 - 0.3, cx, H1 - 0.06, (z0 + z1) / 2 + 0.02, { k: 0.9 });
  B.box(I(m.wood), x1 - x0 - 0.6, 0.02, 0.2, cx, 2.3, z0 + 0.21, { k: 0.8 });
  B.box(m.wood, x1 - x0 - 0.5, 0.22, z1 - z0, cx, H1, (z0 + z1) / 2, { k: 0.8 });
  // shopfront: piers, kick panels, display windows, transom, door frame, open sliding doors
  for (const [a, b] of [[x0, x0 + 0.3], [x1 - 0.3, x1]]) B.box(m.mortar, b - a, H1 + 0.1, 0.28, (a + b) / 2, 0, z0 + 0.14, { ao: 0.2 });
  for (const [a, b] of [[x0 + 0.3, dx0], [dx1, x1 - 0.3]]) {
    B.box(m.pv, b - a, 0.6, 0.2, (a + b) / 2, 0, z0 + 0.1, { tint: 0x8a6a4a });
    B.box(m.metal, b - a, 0.05, 0.24, (a + b) / 2, 0.6, z0 + 0.1, { tint: 0xb8bcc0 });
    B.box(m.metal, 0.05, 1.6, 0.06, (a + b) / 2, 0.65, z0 + 0.1, { tint: 0xb8bcc0 });
    for (const sx of [a + 0.025, b - 0.025]) B.box(m.metal, 0.05, 1.6, 0.08, sx, 0.65, z0 + 0.1, { tint: 0xb8bcc0 });
    t.add(t.glassPane(b - a, 1.6, (a + b) / 2, 0.65 + 0.8, z0 + 0.1));
  }
  B.box(m.metal, x1 - x0 - 0.6, 0.06, 0.24, cx, 2.25, z0 + 0.1, { tint: 0xb8bcc0 });
  B.box(m.wood, x1 - x0 - 0.6, 0.6, 0.2, cx, 2.31, z0 + 0.1);
  for (const sx of [dx0, dx1]) B.box(m.metal, 0.06, 2.25, 0.12, sx, 0, z0 + 0.06, { tint: 0xa8acb0 });
  // the two door leaves, slid open in front of the windows
  for (const [a, b] of [[dx0 - 0.85, dx0 - 0.02], [dx1 + 0.02, dx1 + 0.85]]) {
    for (const sx of [a, b]) B.box(m.pv, 0.05, 2.18, 0.05, sx, 0.03, z0 - 0.04, { tint: 0xa8acb0 });
    for (const y of [0.03, 2.16]) B.box(m.pv, b - a, 0.05, 0.05, (a + b) / 2, y, z0 - 0.04, { tint: 0xa8acb0 });
    B.box(m.pv, b - a, 0.04, 0.05, (a + b) / 2, 0.95, z0 - 0.04, { tint: 0xa8acb0 });
    t.add(t.glassPane(b - a - 0.05, 2.1, (a + b) / 2, 1.08, z0 - 0.04));
  }
  // posters in the windows
  const poster = (key, w, h, x, y) => B.quad(t.T2(key), w, h, x, y, z0 + 0.13, { ry: Math.PI });
  poster('matsuri', 0.42, 0.64, -14.6, 1.0); poster('idol', 0.42, 0.64, -10.4, 1.0);
  // signboard, awning and the dwelling upstairs
  const sign = t.vmesh(new THREE.BoxGeometry(x1 - x0 + 0.1, 0.78, 0.12), [t.P(0.5), t.P(0.5), t.P(0.5), t.P(0.5), t.T('mikawaya', 240, 36, { glow: 0.55, rough: 0.4 }), t.P(0.5)]);
  sign.position.set(cx, H1 + 0.6, z0 - 0.16); sign.rotation.y = Math.PI;
  t.add(sign);
  B.box(m.metal, x1 - x0 + 0.2, 0.06, 0.16, cx, H1 + 0.98, z0 - 0.16, { tint: 0x3a3c40 });
  const aw = t.awningMat();
  for (let j = 0; j < 3; j++) B.box(aw, x1 - x0 - 0.3, 0.07, 0.9 - j * 0.28, cx, 2.3 + j * 0.07, z0 - (0.9 - j * 0.28) / 2, { uv: [0.2, 0] });
  B.box(aw, x1 - x0 - 0.3, 0.22, 0.03, cx, 2.1, z0 - 0.9, { uv: [0.2, 0] });
  t.house({ x: cx, z: z0, w: x1 - x0, d: z1 - z0, side: -1, y0: H1 + 0.22, floors: 1, h1: 2.5, wallA: m.wallCream, roofM: m.roofGrey, antenna: 1.6,
    win: [[0, -1.4, 1.6, 1.1, 'lit', { tobukuro: -1, sill: 0.8 }], [0, 1.5, 1.4, 1.0, 'lit2', { sill: 0.8 }], [0, 2.5, 1.2, 1.0, 'lit3', { face: 'l', sill: 0.8, clean: true }], [0, 2.5, 1.0, 1.0, 'dark', { face: 'r', sill: 0.8 }]] });
  // side (alley) wall details: a frosted window, an AC unit, the back door lamp
  B.box(t.win.frost, 0.8, 0.6, 0.1, x1, 1.6, 18.4, { unit: true, ry: Math.PI / 2 });
  t.prop('propane', x1 + 0.22, 0, 17.4, Math.PI / 2);
  t.prop('beercrate', -9.95, 0, 14.4, 0.15);
  t.prop('beercrate', -9.95, 0.28, 14.4, -0.1);
  t.prop('sign_stand', -11.15, 0, 14.5, Math.PI + 0.25, { block: true });
  // ---- interior
  const P = t.game.player;
  const IN = { indoor: true };
  t.prop('goods_shelf', x0 + 0.48, 0, 16.0, Math.PI / 2, IN);
  t.prop('goods_shelf2', x0 + 0.48, 0, 17.25, Math.PI / 2, IN);
  t.prop('goods_shelf', -12.71, 0, 16.6, Math.PI / 2, IN);
  t.prop('goods_shelf2', -13.15, 0, 16.6, -Math.PI / 2, IN);
  t.prop('milk_fridge', x1 - 0.6, 0, 18.55, -Math.PI / 2, IN);
  t.prop('dagashi_rack', x1 - 0.5, 0, 16.4, -Math.PI / 2, IN);
  t.prop('ramune_cooler', -10.85, 0, 15.4, Math.PI, IN);
  t.prop('wall_shelf_jars', -12.7, 1.35, z1 - 0.38, Math.PI, IN);
  t.prop('pendulum_clock', -14.4, 1.65, z1 - 0.3, Math.PI, IN);
  for (const x of [-13.9, -11.4]) t.prop('shop_lamp', x, H1 - 0.72, 17.2, 0, IN);
  // stacked crates of bottles in the back corner
  for (const [x, y, z, t] of [[-14.95, 0, 19.25, 0xc83a2a], [-14.95, 0.3, 19.25, 0xe8b830], [-14.45, 0, 19.3, 0xc83a2a]]) {
    B.box(I(m.pv), 0.45, 0.28, 0.36, x, y, z, { tint: t });
    for (let i = 0; i < 4; i++) B.box(I(m.gloss), 0.07, 0.1, 0.07, x - 0.15 + i * 0.1, y + 0.28, z, { tint: 0x5a3a1a });
  }
  // the counter (click target): glass showcase + old register + bell + lucky cat
  const counter = new THREE.Group();
  counter.name = 'cornerShopCounter';
  counter.position.set(-12.6, 0.45, 18.75); // origin 0.5 m under the counter top (things bought land on it)
  t.single('shop_counter', 0, -0.45, 0, Math.PI, IN, counter);
  t.single('cash_register', -0.45, 0.51, 0.1, 0, IN, counter);
  t.single('call_bell', 0.45, 0.51, -0.15, 0.3, IN, counter);
  t.single('manekineko', 0.65, 0.51, 0.15, Math.PI + 0.3, IN, counter);
  t.single('abacus', 0.05, 0.51, 0.1, Math.PI + 0.1, IN, counter);
  t.add(counter);
  t.game.physics.addBox({ center: new THREE.Vector3(-12.6, 0.48, 18.75), half: new THREE.Vector3(0.8, 0.48, 0.28), material: 'wood' });
  // fluorescent fixtures + the shop's light
  for (const x of [-14.0, -11.0]) {
    B.box(m.pv, 0.2, 0.06, 1.5, x, H1 - 0.13, 17.0, { tint: 0xe8e8e2 });
    B.box(t.G, 0.05, 0.04, 1.4, x - 0.05, H1 - 0.17, 17.0, { tint: 0xfff6e8 });
    B.box(t.G, 0.05, 0.04, 1.4, x + 0.05, H1 - 0.17, 17.0, { tint: 0xfff6e8 });
  }
  const L = new THREE.PointLight(0xfff0d8, 7, 8, 1.5);
  L.position.set(-12.4, 2.35, 17.3);
  t.add(L);
  t.cornerShop = {
    counter,
    keeper: { pos: new THREE.Vector3(-12.6, 0, 19.38), rotY: Math.PI },
    inside: { minX: x0 + 0.25, maxX: x1 - 0.25, minZ: z0, maxZ: z1 - 0.25 },
    door: { x0: dx0, x1: dx1, z: z0 },
  };
  // collisions: front piers + windows, walls, shelves, counter strip, fridge, rack, cooler
  const o = (a, b, c, d) => P.addObstacle(a, b, c, d);
  o(x0, dx0, z0 - 0.08, z0 + 0.24); o(dx1, x1, z0 - 0.08, z0 + 0.24);
  o(x0, x0 + 0.27, z0, z1); o(x1 - 0.27, x1, z0, z1); o(x0, x1, z1 - 0.28, z1);
  o(x0 + 0.25, x0 + 0.72, 15.35, 17.9);
  o(-13.4, -12.47, 15.98, 17.22);
  o(x0 + 0.25, -11.75, 18.45, z1); o(-11.8, x1 - 0.25, 18.95, z1);
  o(x1 - 0.95, x1 - 0.25, 18.1, 19.0); o(x1 - 0.78, x1 - 0.25, 15.88, 16.92);
  o(-11.35, -10.35, 15.12, 15.66);
  const ph = t.game.physics;
  for (const [cxx, czz, hx, hz] of [[x0 + 0.125, (z0 + z1) / 2, 0.125, (z1 - z0) / 2], [x1 - 0.125, (z0 + z1) / 2, 0.125, (z1 - z0) / 2], [cx, z1 - 0.125, (x1 - x0) / 2, 0.125]]) {
    ph.addBox({ center: new THREE.Vector3(cxx, 1.5, czz), half: new THREE.Vector3(hx, 1.5, hz), material: 'concrete' });
  }

}
