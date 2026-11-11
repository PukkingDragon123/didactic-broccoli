// The sketchbook on the PC desk (where you draw the shop's logo): a B5 spiral pad lying shut, its printed cover (a made-up
// stationer's, Kōban-dō), the chipboard back, the block of drawing paper with a few dog-eared sheets, the double wire
// loops through punched holes, and a sharpened HB pencil lying across it. The cover's name label carries the shop's
// logo once you have drawn one (repaint()).
//   const sb = buildSketchbook()  -> { group, repaint() }   (local: the pad's centre on its underside, spiral at -z)
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Pix, FONT_EN } from '../gfx/pix.js';
import { activeLogo, paintLogo } from './logo.js';

export const PAD = { w: 0.257, d: 0.182, h: 0.011 }; // B5, landscape

function coverArt() {
  const W = 256, H = 182, p = new Pix(W, H, 31);
  const paint = () => {
    const G = 0x2f6a52, G2 = 0x285c47, CR = 0xf2e6c8, OC = 0xd8a640, INK = 0x241a1e;
    p.fill(G);
    // the woven board's print: fine hatching in a darker green, placed in rows (the cover stock is embossed)
    for (let y = 22; y < H; y += 4) for (let x = (y >> 2) % 2 ? 0 : 2; x < W; x += 4) p.px(x, y, G2);
    // the spiral's strip: the punched holes, the board showing grey through them
    p.rect(0, 0, W, 20, 0x2a5a46);
    for (let x = 7; x < W - 4; x += 15) { p.rect(x, 7, 6, 7, 0x6a6a64); p.rect(x, 7, 6, 2, 0x4a4a46); }
    // an ochre band with the title, the kana under it
    p.rect(0, 30, W, 46, OC); p.rect(0, 30, W, 2, 0xf0c868); p.rect(0, 74, W, 2, 0x9a7428);
    p.text('SKETCH BOOK', 14, 36, { size: 32, color: INK, font: FONT_EN });
    p.text('スケッチブック', 16, 86, { size: 16, color: CR });
    p.tinyText('DRAWING PAPER  24 SHEETS', 16, 108, { color: CR });
    p.tinyText('B5  NO.3', 16, 118, { color: OC });
    // a little drawing of a capsule on the cover, in cream line
    const cx = 190, cy = 132;
    for (let j = -20; j <= 20; j++) for (let i = -20; i <= 20; i++) { const d = Math.hypot(i, j); if (d > 17.5 && d < 20) p.px(cx + i, cy + j, CR); }
    p.rect(cx - 18, cy - 1, 37, 3, CR); p.rect(cx - 11, cy - 12, 6, 3, CR);
    // the name label (なまえ) with the shop's mark stamped on it
    p.rect(14, 134, 120, 38, CR); p.frame(14, 134, 120, 38, INK); p.frame(16, 136, 116, 34, 0xb8a888);
    p.text('なまえ', 20, 137, { size: 16, color: INK });
    p.rect(20, 160, 70, 1, 0x9a8a70);
    paintLogo(p, 98, 138, 30, { L: activeLogo() });
    p.tinyText('KOBAN-DO', W - 8, H - 12, { color: CR, align: 'right' });
    p.flush();
  };
  paint();
  const tex = p.texture();
  tex.anisotropy = 4;
  try { document.fonts?.load('16px "DotGothic16"', 'スケッチブックなまえ').then(() => { paint(); tex.needsUpdate = true; }, () => {}); } catch { /* no font loading */ }
  return { tex, repaint: () => { paint(); tex.needsUpdate = true; } };
}

/** A box with its own uv rectangle on the top face only (the rest takes a flat corner of the map). */
function slab(w, h, d, x, y, z) { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; }

export function buildSketchbook() {
  const { w, d } = PAD, group = new THREE.Group();
  const art = coverArt();
  const mat = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...o });
  // the chipboard back and the paper block (its edge pale, a few sheets proud of the rest)
  const back = slab(w, 0.0022, d, 0, 0.0011, 0.004);
  const block = slab(w - 0.004, 0.0072, d - 0.012, 0, 0.0058, 0.008);
  const sheets = [slab(w - 0.006, 0.0006, 0.05, 0.0022, 0.0097, d / 2 - 0.022), slab(0.06, 0.0005, d - 0.03, w / 2 - 0.034, 0.0099, 0.012)];
  const paper = new THREE.Mesh(mergeGeometries([block, ...sheets]), mat({ color: 0xf4eedc, roughness: 0.95 }));
  const board = new THREE.Mesh(back, mat({ color: 0x8a8274, roughness: 0.95 }));
  // the printed cover: the art on its top face
  const cg = new THREE.BoxGeometry(w, 0.0012, d);
  const uv = cg.attributes.uv;
  for (let i = 0; i < uv.count; i++) { const face = Math.floor(i / 4); if (face !== 2) uv.setXY(i, 0.5, 0.06); } // (sides: the plain green under the band)
  cg.translate(0, 0.0102, 0.004);
  const cover = new THREE.Mesh(cg, mat({ map: art.tex, roughness: 0.62 }));
  // the double wire loops through the holes along the top edge
  const loops = [];
  const zE = -d / 2 + 0.004 - 0.0005;
  for (let x = -w / 2 + 0.0075 + 0.003; x < w / 2 - 0.004; x += 0.015 * w / 0.256) {
    for (const dx of [-0.0012, 0.0012]) {
      const t = new THREE.TorusGeometry(0.0062, 0.00055, 6, 16, Math.PI * 1.55);
      t.rotateY(Math.PI / 2); t.rotateX(-Math.PI * 0.27);
      t.translate(x + dx, 0.0062, zE + 0.0035);
      loops.push(t);
    }
  }
  const wire = new THREE.Mesh(mergeGeometries(loops), new THREE.MeshStandardMaterial({ color: 0x9aa2a8, roughness: 0.3, metalness: 1 }));
  // an HB pencil lying across the cover: the six-sided body, the shaved wood and the lead, the ferrule and eraser
  const pen = new THREE.Group();
  const L = 0.15, R = 0.0036;
  const body = new THREE.CylinderGeometry(R, R, L, 6, 1); body.rotateZ(Math.PI / 2);
  const wood = new THREE.CylinderGeometry(R * 0.96, 0.0009, 0.019, 12, 1, true); wood.rotateZ(-Math.PI / 2); wood.translate(L / 2 + 0.0095, 0, 0);
  const lead = new THREE.ConeGeometry(0.0009, 0.004, 10); lead.rotateZ(-Math.PI / 2); lead.translate(L / 2 + 0.019 + 0.002, 0, 0);
  const ferrule = new THREE.CylinderGeometry(R * 1.02, R * 1.02, 0.009, 16); ferrule.rotateZ(Math.PI / 2); ferrule.translate(-L / 2 - 0.0045, 0, 0);
  const rub = new THREE.CylinderGeometry(R * 0.95, R * 0.95, 0.008, 16); rub.rotateZ(Math.PI / 2); rub.translate(-L / 2 - 0.013, 0, 0);
  pen.add(new THREE.Mesh(body, mat({ color: 0x2f6a52, roughness: 0.45 })));
  pen.add(new THREE.Mesh(wood, mat({ color: 0xe0b888, roughness: 0.85 })));
  pen.add(new THREE.Mesh(lead, mat({ color: 0x3a3a40, roughness: 0.5, metalness: 0.3 })));
  pen.add(new THREE.Mesh(ferrule, new THREE.MeshStandardMaterial({ color: 0xc8b070, roughness: 0.32, metalness: 1 })));
  pen.add(new THREE.Mesh(rub, mat({ color: 0xe88a8a, roughness: 0.9 })));
  pen.position.set(0.012, 0.0108 + R * 0.87, 0.03);
  pen.rotation.set(Math.PI / 6, 0.36, 0);
  for (const m of [paper, board, cover, wire]) { m.castShadow = true; m.receiveShadow = true; group.add(m); }
  pen.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  group.add(pen);
  return { group, repaint: art.repaint };
}
