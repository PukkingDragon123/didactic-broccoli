// The main menu's street signs: a real-looking Japanese roadside guide sign (案内標識) on a galvanised
// pole on the pavement outside the shop. Three plates (blue / green / brown, like general, expressway
// and tourist signs) with reflective sheeting, white borders, pictograms and arrows. Raycast to pick.
import * as THREE from 'three';
import { Pix, FONT_EN } from '../gfx/pix.js';

const SIGNS = [
  { id: 'play', jp: 'あそぶ', en: 'Play', bg: 0x1a4ea8, icon: 'capsule' },
  { id: 'host', jp: 'みせをひらく', en: 'Host your shop', bg: 0x16774a, icon: 'shop' },
  { id: 'join', jp: 'あそびにいく', en: 'Visit a friend', bg: 0x6e4220, icon: 'walk' },
];
const PW = 1.25, PH = 0.4;

function icon(p, kind, x, y) {
  const W = 0xffffff;
  if (kind === 'capsule') {
    for (let j = -14; j <= 14; j++) for (let i = -14; i <= 14; i++) { const d = i * i + j * j; if (d <= 196) p.px(x + i, y + j, d > 150 ? W : j < 0 ? 0xffffff : 0xffd23f); }
    for (let i = -14; i <= 14; i++) p.px(x + i, y, 0x2a2a2a);
    for (let j = -14; j <= 14; j++) for (let i = -14; i <= 14; i++) if (i * i + j * j <= 196 && i * i + j * j > 150) p.px(x + i, y + j, W);
  } else if (kind === 'shop') {
    p.rect(x - 14, y - 2, 28, 16, W);
    for (let i = 0; i < 7; i++) p.rect(x - 16 + i * 4.6, y - 10, 4, 7, i % 2 ? W : 0xe5383b);
    p.rect(x - 16, y - 12, 32, 2, W);
    p.rect(x - 4, y + 4, 8, 10, 0x16774a);
  } else {
    // walking person pictogram
    p.circle(x + 2, y - 11, 3, W);
    p.rect(x - 1, y - 7, 5, 11, W);
    for (let k = 0; k < 9; k++) { p.rect(x - 2 - Math.floor(k / 2), y + 4 + k, 3, 1, W); p.rect(x + 3 + Math.floor(k / 3), y + 4 + k, 3, 1, W); }
    for (let k = 0; k < 6; k++) { p.rect(x - 2 - k, y - 5 + k, 2, 2, W); p.rect(x + 4 + k, y - 5 + Math.floor(k / 2), 2, 2, W); }
  }
}

function plateTexture(s) {
  const p = new Pix(320, 102, 5);
  p.fill(s.bg);
  // retroreflective sheeting: faint diagonal micro-pattern + a little weathering at the bottom
  for (let y = 0; y < 102; y++) for (let x = 0; x < 320; x++) if ((x + y * 2) % 9 === 0) p.px(x, y, 0xffffff, 10);
  for (let i = 0; i < 14; i++) { const x = Math.floor(p.r() * 320); for (let y = 70 + Math.floor(p.r() * 20); y < 100; y++) p.px(x, y, 0x000000, 26); }
  // white border with rounded corners
  for (let k = 5; k <= 7; k++) p.frame(k, k, 320 - k * 2, 102 - k * 2, 0xffffff);
  icon(p, s.icon, 42, 51);
  p.text(s.jp, 78, 18, { size: s.jp.length > 4 ? 26 : 32, color: 0xffffff });
  p.text(s.en, 80, 64, { size: 15, color: 0xffffff, font: FONT_EN });
  // arrow
  for (let y = -16; y <= 16; y++) for (let x = 0; x <= 16 - Math.abs(y); x++) p.px(284 + x, 51 + y, 0xffffff);
  p.rect(256, 45, 28, 13, 0xffffff);
  return p.texture();
}

function roundedPlate(w, h, r, depth) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 4 });
  g.translate(0, 0, -depth / 2);
  // front cap UVs: map x/y across the plate
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
  return g;
}

export class MenuSigns {
  constructor(scene, pos = new THREE.Vector3(-0.35, 0, 8.25), rotY = 0.5) {
    this.root = new THREE.Group();
    this.root.position.copy(pos);
    this.root.rotation.y = rotY;
    scene.add(this.root);
    const galv = new THREE.MeshStandardMaterial({ color: 0xa8aeb2, metalness: 0.75, roughness: 0.42 });
    const backM = new THREE.MeshStandardMaterial({ color: 0x8e9498, metalness: 0.6, roughness: 0.5 });
    const H = 3.1;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.042, H, 16), galv);
    pole.position.set(-PW / 2 - 0.08, H / 2, -0.06); pole.castShadow = true; this.root.add(pole);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.044, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), galv); cap.position.set(-PW / 2 - 0.08, H, -0.06); this.root.add(cap);
    const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.03, 16), backM); flange.position.set(-PW / 2 - 0.08, 0.015, -0.06); this.root.add(flange);
    this.items = [];
    SIGNS.forEach((s, i) => {
      const pivot = new THREE.Group();
      pivot.position.set(0, 2.55 - i * (PH + 0.06), 0);
      this.root.add(pivot);
      const tex = plateTexture(s);
      const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.38, metalness: 0.05, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.06 });
      const plate = new THREE.Mesh(roundedPlate(PW, PH, 0.03, 0.012), [face, backM]);
      plate.castShadow = true;
      plate.userData.signId = s.id;
      pivot.add(plate);
      // stiffener rails + U-bolt clamps on the back
      for (const y of [0.1, -0.1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(PW + 0.14, 0.035, 0.03), backM); rail.position.set(-0.07, y, -0.03); pivot.add(rail);
        const clamp = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.006, 6, 12, Math.PI), galv); clamp.rotation.set(Math.PI / 2, 0, 0); clamp.position.set(-PW / 2 - 0.08, y, -0.06); pivot.add(clamp);
      }
      this.items.push({ id: s.id, pivot, plate, face, hover: 0, t: i * 0.25 });
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
      // a hovered plate catches the light and leans out a touch on its clamps
      it.pivot.position.z = it.hover * 0.04;
      it.pivot.rotation.y = it.hover * 0.12 + Math.sin(time * 0.8 + it.t) * 0.004;
      it.face.emissiveIntensity = 0.06 + it.hover * 0.4;
    }
  }

  dispose() { this.root.parent?.remove(this.root); }
}
