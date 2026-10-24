// The main menu's street sign: a full-size roadside guide sign on a galvanised pole, standing on the
// shoulder by the road's edge line outside the shop. Three reflective plates (blue / green / brown,
// like general, route and tourist signs) with white borders, pictogram badges, English legends and
// arrows pointing at the garage. Raycast to pick.
import * as THREE from 'three';
import { Pix, FONT_EN, FONT_DISPLAY } from '../gfx/pix.js';
import { iconCanvas } from '../gfx/icons.js';

const SIGNS = [
  { id: 'play', label: 'PLAY', sub: 'OPEN THE GARAGE', bg: 0x1a4ea8, sheen: 0x2a62c4, icon: 'play' },
  { id: 'host', label: 'HOST SHOP', sub: 'SHARE YOUR SHOP CODE', bg: 0x16774a, sheen: 0x22905c, icon: 'host' },
  { id: 'join', label: 'JOIN FRIEND', sub: 'VISIT WITH A CODE', bg: 0x6e4220, sheen: 0x86542c, icon: 'join' },
];
// plate texture: 2 texels per pixel-font pixel (GG Display @ 56px, Grandstander @ 16px, icons @ 2x)
const TW = 420, TH = 112;
const PW = 1.9, PH = PW * TH / TW;
const GAP = 0.08;
const TOP = 2.95; // top edge of the first plate (m)
const POLE_X = -PW / 2 - 0.1;

/** Is (x, y) inside a w×h rounded rectangle at (0,0) with corner radius r? */
function inRound(x, y, w, h, r) {
  const cx = x < r ? r : x > w - 1 - r ? w - 1 - r : x;
  const cy = y < r ? r : y > h - 1 - r ? h - 1 - r : y;
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r + r * 0.5;
}

function roundRect(p, x, y, w, h, r, c, hole = 0) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if (!inRound(i, j, w, h, r)) continue;
    if (hole && inRound(i - hole, j - hole, w - hole * 2, h - hole * 2, Math.max(1, r - hole))) continue;
    p.px(x + i, y + j, c);
  }
}

/** Vertical extent of the glyphs of `str` when drawn with textBaseline 'top' at y = 0. */
function glyphBox(p, str, size, font) {
  const g = p.ctx;
  g.save();
  g.font = `${size}px ${font}`;
  g.textBaseline = 'top';
  const m = g.measureText(str);
  g.restore();
  return { top: -m.actualBoundingBoxAscent, bottom: m.actualBoundingBoxDescent, w: m.width };
}

function plateTexture(s) {
  const p = new Pix(TW, TH, 5 + s.label.length);
  p.fill(s.bg);
  // retroreflective sheeting: faint diagonal micro-prisms, a soft top sheen and a little grime at the bottom
  for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
    if ((x + y * 2) % 7 === 0) p.px(x, y, 0xffffff, 9);
    if (y < 40 && (x * 3 + y * 5) % 11 === 0) p.px(x, y, s.sheen, 70);
  }
  for (let i = 0; i < 26; i++) { const x = Math.floor(p.r() * TW); for (let y = 76 + Math.floor(p.r() * 26); y < TH - 4; y++) p.px(x, y, 0x000000, 22); }
  // white border (inset, rounded)
  roundRect(p, 6, 6, TW - 12, TH - 12, 10, 0xffffff, 4);
  // pictogram badge: white rounded square holding the pixel icon
  const ic = iconCanvas(s.icon, 2);
  const bs = Math.max(56, ic.width + 12, ic.height + 12);
  const bx = 24, by = Math.round((TH - bs) / 2);
  roundRect(p, bx, by, bs, bs, 6, 0xffffff);
  roundRect(p, bx + 3, by + 3, bs - 6, bs - 6, 4, 0xf2f2ee);
  p.flush();
  p.ctx.drawImage(ic, bx + Math.floor((bs - ic.width) / 2), by + Math.floor((bs - ic.height) / 2));
  p.pull();
  // legend: big label + small route line, centred as a block
  const tx = bx + bs + 20;
  const maxW = TW - tx - 76;
  let size = 56;
  while (size > 28 && glyphBox(p, s.label, size, FONT_DISPLAY).w > maxW) size -= 14;
  const a = glyphBox(p, s.label, size, FONT_DISPLAY), b = glyphBox(p, s.sub, 16, FONT_EN);
  const gap = 12, h = (a.bottom - a.top) + gap + (b.bottom - b.top);
  const y0 = Math.round((TH - h) / 2);
  p.text(s.label, tx, Math.round(y0 - a.top), { size, font: FONT_DISPLAY, color: 0xffffff });
  p.text(s.sub, tx + 2, Math.round(y0 + (a.bottom - a.top) + gap - b.top), { size: 16, font: FONT_EN, color: 0xe4ecf4 });
  // chunky arrow pointing at the garage
  const ax = TW - 62, ay = TH / 2;
  p.rect(ax, ay - 7, 22, 14, 0xffffff);
  for (let x = 0; x <= 22; x++) { const hh = 22 - x; p.rect(ax + 20 + x, ay - hh, 1, hh * 2, 0xffffff); }
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
  /** Defaults: pole on the road shoulder by the edge line, plates angled at the menu camera. */
  constructor(scene, pos = new THREE.Vector3(-1.15, 0, 8.05), rotY = 0.55) {
    this.root = new THREE.Group();
    this.root.position.copy(pos);
    this.root.rotation.y = rotY;
    this.root.userData.menuSigns = this;
    scene.add(this.root);
    const galv = new THREE.MeshStandardMaterial({ color: 0xa8aeb2, metalness: 0.75, roughness: 0.42 });
    const backM = new THREE.MeshStandardMaterial({ color: 0x8e9498, metalness: 0.6, roughness: 0.5 });
    const H = TOP + 0.14;
    // concrete footing (the asphalt sits a little lower than the kerb line)
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.34), new THREE.MeshStandardMaterial({ color: 0x8a8680, roughness: 0.95 }));
    foot.position.set(POLE_X, -0.04, -0.06); foot.receiveShadow = true; this.root.add(foot);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.052, H, 16), galv);
    pole.position.set(POLE_X, H / 2, -0.06); pole.castShadow = true; this.root.add(pole);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), galv); cap.position.set(POLE_X, H, -0.06); this.root.add(cap);
    const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.03, 16), backM); flange.position.set(POLE_X, 0.045, -0.06); this.root.add(flange);
    // reflective collar band low on the pole (yellow / black)
    const band = new Pix(4, 16, 3);
    for (let y = 0; y < 16; y++) band.rect(0, y, 4, 1, Math.floor(y / 4) % 2 ? 0x1a1a1a : 0xf2c21a);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.053, 0.053, 0.32, 16, 1, true), new THREE.MeshStandardMaterial({ map: band.texture(), roughness: 0.4 }));
    collar.position.set(POLE_X, 0.42, -0.06); this.root.add(collar);
    this.items = [];
    SIGNS.forEach((s, i) => {
      const pivot = new THREE.Group();
      pivot.position.set(0, TOP - PH / 2 - i * (PH + GAP), 0);
      this.root.add(pivot);
      const tex = plateTexture(s);
      tex.anisotropy = 8;
      const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.36, metalness: 0.05, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.1 });
      const plate = new THREE.Mesh(roundedPlate(PW, PH, 0.035, 0.014), [face, backM]);
      plate.castShadow = false; // no big shadow across the shutter in the menu shot
      plate.userData.signId = s.id;
      pivot.add(plate);
      // stiffener rails + U-bolt clamps on the back
      for (const y of [PH * 0.26, -PH * 0.26]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(PW + 0.16, 0.04, 0.03), backM); rail.position.set(-0.08, y, -0.03); pivot.add(rail);
        const clamp = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.007, 6, 12, Math.PI), galv); clamp.rotation.set(Math.PI / 2, 0, 0); clamp.position.set(POLE_X, y, -0.06); pivot.add(clamp);
      }
      this.items.push({ id: s.id, pivot, plate, face, hover: 0, t: i * 0.25 });
    });
    this.ray = new THREE.Raycaster();
    this.hoverId = null;
    this.enabled = false;
  }

  pick(camera, ndcX, ndcY) {
    if (!this.root.parent) return null;
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
      it.pivot.position.z = it.hover * 0.05;
      it.pivot.rotation.y = it.hover * 0.12 + Math.sin(time * 0.8 + it.t) * 0.004;
      it.face.emissiveIntensity = 0.1 + it.hover * 0.45;
    }
  }

  dispose() { this.root.parent?.remove(this.root); }
}
