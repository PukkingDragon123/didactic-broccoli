// The main menu's 3D street signpost: three guide signs on a pole standing in the street outside the shop.
// Hover tilts a sign and lights it; click runs its action. Raycast from the mouse (or a tap).
import * as THREE from 'three';
import { Pix, FONT_EN } from '../gfx/pix.js';

const SIGNS = [
  { id: 'play', jp: 'あそぶ', en: 'PLAY', bg: 0x1d4fae, edge: 0x123a86 },
  { id: 'host', jp: 'みせをひらく', en: 'HOST', bg: 0x1f7a4a, edge: 0x145a34 },
  { id: 'join', jp: 'あそびにいく', en: 'JOIN', bg: 0x7a4a22, edge: 0x5a3416 },
];

function signTexture(s) {
  const p = new Pix(224, 64, 5);
  p.fill(s.bg);
  // weathering: faint streaks and a few chips, like an old enamel road sign
  for (let i = 0; i < 18; i++) { const x = Math.floor(p.r() * 224); for (let y = 6; y < 30 + p.r() * 30; y++) p.px(x, y, 0x000000, 22); }
  for (let i = 0; i < 6; i++) p.px(6 + Math.floor(p.r() * 212), 6 + Math.floor(p.r() * 52), 0xe8e8e8);
  p.frame(3, 3, 218, 58, 0xffffff); p.frame(4, 4, 216, 56, 0xffffff);
  p.text(s.jp, 16, 8, { size: 24, color: 0xffffff });
  p.text(s.en, 18, 40, { size: 12, color: 0xd8e4ff, font: FONT_EN });
  // arrow
  for (let y = -10; y <= 10; y++) for (let x = 0; x <= 10 - Math.abs(y); x++) p.px(196 + x, 32 + y, 0xffffff);
  p.rect(178, 28, 18, 9, 0xffffff);
  // screws
  for (const [x, y] of [[10, 32], [212, 10], [212, 54]]) { p.px(x, y, 0xbfc4c8); p.px(x + 1, y, 0x8a9096); }
  return p.texture();
}

export class MenuSigns {
  constructor(scene, pos = new THREE.Vector3(0.62, 0, 8.9), rotY = 0.75) {
    this.root = new THREE.Group();
    this.root.position.copy(pos);
    this.root.rotation.y = rotY;
    scene.add(this.root);
    const metal = new THREE.MeshStandardMaterial({ color: 0xb8bec4, metalness: 0.7, roughness: 0.4 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 2.3, 16), metal);
    pole.position.y = 1.15;
    pole.scale.y = 0.85; pole.position.y = 0.98; pole.castShadow = true; this.root.add(pole);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), metal); cap.position.y = 1.96; this.root.add(cap);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.06, 16), new THREE.MeshStandardMaterial({ color: 0x7a7a76, roughness: 0.9 }));
    base.position.y = 0.03; this.root.add(base);
    this.items = [];
    SIGNS.forEach((s, i) => {
      const pivot = new THREE.Group();
      pivot.position.set(0.04, 1.62 - i * 0.34, 0);
      this.root.add(pivot);
      const tex = signTexture(s);
      const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45, metalness: 0.1, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.05 });
      const edge = new THREE.MeshStandardMaterial({ color: s.edge, roughness: 0.5, metalness: 0.3 });
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.28, 0.025), [edge, edge, edge, edge, face, edge]);
      plate.position.x = 0.53;
      plate.castShadow = true;
      plate.userData.signId = s.id;
      pivot.add(plate);
      for (const y of [0.08, -0.08]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.05), metal); b.position.set(0.02, y, -0.02); pivot.add(b); }
      pivot.rotation.y = -0.1 - i * 0.07;
      this.items.push({ id: s.id, pivot, plate, face, hover: 0, base: pivot.rotation.y, t: i * 0.3 });
    });
    this.ray = new THREE.Raycaster();
    this.hoverId = null;
    this.enabled = false;
  }

  pick(camera, ndcX, ndcY) {
    this.ray.setFromCamera({ x: ndcX, y: ndcY }, camera);
    const hit = this.ray.intersectObjects(this.items.map((i) => i.plate), false)[0];
    return hit ? hit.object.userData.signId : null;
  }

  update(dt, time) {
    for (const it of this.items) {
      it.t += dt;
      const want = this.enabled && this.hoverId === it.id ? 1 : 0;
      it.hover += (want - it.hover) * Math.min(1, dt * 10);
      // swing in on open, then a gentle sway; hovered signs turn toward you
      const intro = Math.max(0, 1 - it.t * 1.4);
      it.pivot.rotation.y = it.base + it.hover * 0.42 + Math.sin(time * 1.3 + it.t) * 0.015 - intro * 1.4;
      it.pivot.rotation.z = Math.sin(time * 0.9 + it.base * 5) * 0.01 - it.hover * 0.03;
      it.face.emissiveIntensity = 0.05 + it.hover * 0.35;
    }
  }

  dispose() { this.root.parent?.remove(this.root); }
}
