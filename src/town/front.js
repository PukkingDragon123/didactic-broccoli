// The garage's lane front as far as the town is concerned: the things that stand out front while the shop is open
// (the twin gacha, the bench, the kakigōri flag, a sign stand, the painted OPEN plate) or closed (weeds, a taped
// notice), the tanuki by the pier, and the switches other systems use (town.shop: openG / closedG / lanternM / glow).
// When the garage builds its own street front (garage.ownsFront) nothing of the facade is drawn here; otherwise a
// plain totan false front, eave, lanterns and noren are.
import * as THREE from 'three';
import { hash2 } from '../core/util.js';
import { GARAGE } from '../world/Garage.js';

export function buildFront(t) {
  const H = GARAGE.height, B = t.B, m = t.m, own = !!t.garage?.ownsFront;
  const S = t.shop = { openG: new THREE.Group(), closedG: new THREE.Group() };
  S.openG.name = 'town:shopOpen'; S.closedG.name = 'town:shopClosed';
  t.add(S.openG); t.add(S.closedG);
  const O = S.openG, C = S.closedG;
  // the lantern material and light other systems switch (the garage's own lanterns follow town.lanternsOn)
  S.lanternM = new THREE.MeshStandardMaterial({ color: 0xd83a2a, emissive: 0xff5a30, emissiveIntensity: 1.3, roughness: 0.8 });
  S.glow = new THREE.PointLight(0xff9a60, 2.4, 6.5, 1.6);
  S.glow.position.set(0, H - 0.5, 6.4);
  if (!own) {
    t.add(S.glow);
    const teal = 0x7fa8a0, PH = 1.15;
    for (const sx of [-1, 1]) B.box(m.totan, 1.3, H + 0.05, 0.05, sx * 3.65, 0, 5.235, { uv: [sx, 0], ao: 0.15, tint: teal });
    B.box(m.totan, 8.7, PH, 0.26, 0, H, 5.08, { uv: [0.4, 0.3], tint: teal });
    for (const sx of [-1, 1]) { B.box(m.totan, 0.22, PH, 1.6, sx * 4.24, H, 4.3, { uv: [0.2, 0.3], tint: teal }); B.box(m.pv, 0.3, PH + 0.02, 0.34, sx * 4.25, H, 5.12, { tint: 0x5a5a52 }); }
    B.box(m.pv, 9.0, 0.12, 0.46, 0, H + PH, 5.1, { tint: 0x5a5650 });
    B.box(m.totan, 8.7, 0.12, 10.6, 0, H + 0.14, -0.1, { k: 0.8, tint: 0xb4bcb8 });
    B.box(m.totan, 0.06, H + 0.25, 10.4, 4.24, 0, -0.05, { uv: [0, 0.2], ao: 0.2, tint: 0xb4bcb8 });
    B.box(m.wood, 8.4, 0.24, 0.08, 0, H - 0.02, 5.25, { tint: 0x8a6a4a });
    B.face(m.tinroof, [-4.1, H - 0.02, 6.18], [4.1, H - 0.02, 6.18], [4.1, H + 0.12, 5.22], [-4.1, H + 0.12, 5.22], { tint: 0xb07a66, both: true });
    // lanterns under the eave, the noren
    const geos = [];
    for (const x of [-3.2, -1.6, 1.6, 3.2]) {
      const g = new THREE.CylinderGeometry(0.11, 0.11, 0.36, 8); g.scale(1.3, 1, 1.3); g.translate(x, H - 0.55, 6.02); geos.push(g);
      B.cyl(m.pv, 0.09, 0.09, 0.05, x, H - 0.37, 6.02, { tint: 0x1a1414 }); B.cyl(m.pv, 0.09, 0.09, 0.05, x, H - 0.78, 6.02, { tint: 0x1a1414 });
    }
    for (const g of geos) { const mesh = new THREE.Mesh(g, S.lanternM); t.add(mesh); }
    for (let i = -1; i <= 1; i++) { const panel = t.vmesh(new THREE.BoxGeometry(0.66, 0.72, 0.015), t.P(0.95)); panel.geometry.attributes.color.array.forEach((v, k, a) => { a[k] = [0.05, 0.09, 0.22][k % 3]; }); panel.position.set(i * 0.69, H - 0.48, 6.06); O.add(panel); }
  }
  // out front: dagashiya-style things (open) / weeds and a taped notice (closed)
  t.single('gacha_twin', -2.55, 0, 5.62, 0, {}, O);
  t.single('shop_bench', 2.75, 0, 5.52, 0, {}, O);
  S.obs = [t.game.player.addObstacle(-3.02, -2.08, 5.4, 5.84), t.game.player.addObstacle(2.27, 3.23, 5.34, 5.7)];
  t.single('kakigori_flag', 3.95, 0, 5.48, -0.25, {}, O);
  t.single('sign_stand', -3.55, 0, 5.62, 0.35, {}, O);
  t.prop('tanuki_statue', -4.05, 0, 5.5, 0.3);
  // the OPEN plate hanging on the right pier (src/life/sign.js hides it when its own sign hangs there)
  const A = t.atlas.trim, pc = document.createElement('canvas'); pc.width = 96; pc.height = 40;
  const px = pc.getContext('2d'); px.fillStyle = '#f1ecd9'; px.fillRect(0, 0, 96, 40); px.strokeStyle = '#2f6a4a'; px.lineWidth = 4; px.strokeRect(3, 3, 90, 34); px.fillStyle = '#2f6a4a'; px.font = 'bold 22px "Alagard", serif'; px.textAlign = 'center'; px.fillText('OPEN', 48, 28);
  const ptex = new THREE.CanvasTexture(pc); ptex.colorSpace = THREE.SRGBColorSpace; ptex.magFilter = THREE.NearestFilter;
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.02), new THREE.MeshStandardMaterial({ map: ptex, roughness: 0.7 }));
  plate.position.set(3.62, 1.95, 5.28); plate.name = 'openPlate';
  O.add(plate);
  t.openPlate = plate;
  const cord = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.01, 0.01), new THREE.MeshStandardMaterial({ color: 0x3a3430, roughness: 0.9 })); cord.position.set(3.62, 2.12, 5.28); O.add(cord);
  for (const [x, z] of [[-4.2, 5.45], [4.25, 5.4], [-1.2, 5.32]]) t.single('weeds', x, 0, z, hash2(x, z) * 3, { scale: 0.9 }, C);
  const nb = new Batch2(t);
  nb.sign('closedNote', -3.5, 1.24, 5.27, 0.04);
  nb.into(C);
  void A;
}

/** A tiny one-off batch for things that toggle with a group. */
class Batch2 {
  constructor(t) { this.t = t; this.B = t.batch(); }
  sign(key, x, y, z, rz = 0) { this.t.signInto(this.B, key, x, y, z, { rz }); }
  into(parent) { this.B.build(parent, { name: 'front' }); }
}
