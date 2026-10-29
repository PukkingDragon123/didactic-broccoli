// Kishibe Rohan's poster for the garage (the "Reference Material" reward): a manga-style one-sheet in pixel art,
// taped up where passers-by see it. While it hangs, extra customers find their way in (Story.update).
import * as THREE from 'three';

const TAPE = new THREE.MeshStandardMaterial({ color: 0xf2ead2, roughness: 0.55, transparent: true, opacity: 0.8, depthWrite: false });

function draw(cv) {
  const W = cv.width, H = cv.height, g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  // speed-line sunburst on deep purple
  g.fillStyle = '#2a1238'; g.fillRect(0, 0, W, H);
  const cx = W * 0.56, cy = H * 0.42;
  for (let i = 0; i < 44; i++) {
    const a0 = (i / 44) * Math.PI * 2, a1 = a0 + Math.PI / 70;
    g.fillStyle = i % 2 ? '#3e1a56' : '#53206e';
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a0) * W * 2, cy + Math.sin(a0) * W * 2); g.lineTo(cx + Math.cos(a1) * W * 2, cy + Math.sin(a1) * W * 2); g.fill();
  }
  // a figure striking the pose: pointing straight out of the page, the other hand over the brow
  const ink = '#120a16', hi = '#f4e6c8';
  const px = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const s = W / 96;
  // legs + coat
  px(42 * s, 92 * s, 8 * s, 30 * s, ink); px(54 * s, 90 * s, 8 * s, 32 * s, ink);
  px(38 * s, 58 * s, 28 * s, 38 * s, ink);
  px(36 * s, 92 * s, 10 * s, 14 * s, ink); px(60 * s, 92 * s, 10 * s, 12 * s, ink);
  // pointing arm toward the viewer's left
  px(12 * s, 62 * s, 28 * s, 6 * s, ink); px(6 * s, 62 * s, 8 * s, 4 * s, ink);
  // arm up over the brow
  px(62 * s, 46 * s, 6 * s, 16 * s, ink); px(52 * s, 40 * s, 16 * s, 5 * s, ink);
  // head with a headband (zig-zag)
  px(44 * s, 36 * s, 16 * s, 18 * s, ink);
  for (let i = 0; i < 8; i++) px((44 + i * 2) * s, (40 + (i % 2) * 2) * s, 2 * s, 2 * s, '#d8b45a');
  // highlights
  px(40 * s, 60 * s, 2 * s, 30 * s, '#6a3a8a'); px(45 * s, 44 * s, 2 * s, 6 * s, '#6a3a8a');
  px(56 * s, 46 * s, 2 * s, 2 * s, hi);
  // ゴゴゴ
  g.font = `${Math.round(14 * s)}px "DotGothic16", monospace`; g.textBaseline = 'top';
  for (let i = 0; i < 4; i++) { g.fillStyle = '#120a16'; g.fillText('ゴ', (70 + (i % 2) * 6) * s + 1, (20 + i * 15) * s + 1); g.fillStyle = '#ff4f9a'; g.fillText('ゴ', (70 + (i % 2) * 6) * s, (20 + i * 15) * s); }
  // title band
  px(0, H - 34 * s, W, 34 * s, '#f4e6c8');
  px(0, H - 35 * s, W, 2 * s, ink);
  g.fillStyle = '#c0242e'; g.font = `${Math.round(13 * s)}px "Alagard", "GG Display", monospace`; g.textAlign = 'center';
  g.fillText('GACHA GARAGE', W / 2, H - 31 * s);
  g.fillStyle = '#2a1238'; g.font = `${Math.round(8 * s)}px "Alagard", monospace`;
  g.fillText('A BIZARRE CAPSULE ADVENTURE', W / 2, H - 17 * s);
  g.fillStyle = '#6a5a52'; g.font = `${Math.round(7 * s)}px "Alagard", monospace`;
  g.fillText('art: Kishibe Rohan', W / 2, H - 8 * s);
  // top banner
  g.fillStyle = '#ffd23f'; g.font = `${Math.round(9 * s)}px "Alagard", monospace`; g.textAlign = 'left';
  g.fillText('NOW OPEN!', 4 * s, 4 * s);
  g.fillStyle = '#f4e6c8'; g.font = `${Math.round(7 * s)}px "Alagard", monospace`;
  g.fillText('Vol. 1', 4 * s, 15 * s);
}

/** The poster as a group (w metres wide, facing +z from its centre). */
export function rohanPoster(w = 0.46) {
  const cv = document.createElement('canvas');
  cv.width = 192; cv.height = 272;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearFilter;
  const redraw = () => { draw(cv); tex.needsUpdate = true; };
  redraw();
  document.fonts?.ready?.then(redraw).catch(() => {});
  const h = w * cv.height / cv.width;
  const grp = new THREE.Group();
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, emissive: 0x2a2026, emissiveMap: tex }));
  sheet.receiveShadow = true;
  grp.add(sheet);
  for (const sx of [-1, 1]) {
    const t = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.2, w * 0.06), TAPE);
    t.position.set(sx * w * 0.42, h / 2 - w * 0.01, 0.0015);
    t.rotation.z = sx * -0.6;
    t.userData.noRim = true;
    grp.add(t);
  }
  grp.userData.poster = 'rohan';
  return grp;
}
