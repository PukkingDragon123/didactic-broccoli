// Machine-top display cases (POP toppers) in the voxel look, mixed with clean low poly where it reads better:
//   the plinth   moulded plastic in the machine's trim colour, 5 mm voxels like the machines, a cream lip and two
//                rails it sits on (built with VoxelModel, the machines' materials)
//   the stand    two or three cream tiers stepping up to the back, a printed name strip on each riser
//   the card     the series' display card printed full size on a board across the back
//   the acrylic  a clear case with bevelled edges (a low-poly rounded box), screw caps at the corners
//   the header   a printed strip along the top front of the case: the series in kana and 5x7 letters, a NEW burst
// Everything printed is pixel art (nearest filtered). Figures stand on the tiers at the slots returned:
//   buildDisplay(style, series, { w, d, trim }, thumbs) -> { group, slots: [{ x, y, z, maxH, cell, depth }], height, dispose() }
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { VoxelModel, gloss, metal } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { voxelMaterials } from '../voxel/materials.js';
import { Pix } from '../gfx/pix.js';
import { draw5, textW5 } from '../gfx/font5x7.js';
import { bannerTexture } from '../gfx/banner.js';
import { SERIES_BY_ID } from '../data/series/index.js';

export const STYLES = {
  tier: { name: 'Tiered display case', price: 1800, tiers: 2, per: 3, h: 0.15, desc: 'Clear acrylic, two tiers, the series card behind. 6 figures.' },
  grand: { name: 'Grand display case', price: 3600, tiers: 3, per: 3, h: 0.19, desc: 'A tall case with three tiers and a lit header. 9 figures.' },
};
export const STYLE_IDS = Object.keys(STYLES);

const VS = 0.005;
const hex = (c) => '#' + (c >>> 0).toString(16).padStart(6, '0');
const shade = (c, k) => { const r = Math.min(255, ((c >> 16) & 255) * k) | 0, g = Math.min(255, ((c >> 8) & 255) * k) | 0, b = Math.min(255, (c & 255) * k) | 0; return (r << 16) | (g << 8) | b; };

/** The plinth and the tiers, in voxels (x across, z front-to-back with z = 0 the front). */
function standModel(W, D, tiers, tierH, trim) {
  const v = new VoxelModel();
  v.jitter = 0.01;
  const cream = 0xf2ead8, creamD = 0xe0d4ba;
  // plinth: trim colour, a darker foot, a cream lip on top, two rails under it
  v.box(0, 0, 0, W - 1, 0, D - 1, gloss(shade(trim, 0.7)));
  v.box(0, 1, 0, W - 1, 4, D - 1, (x, y, z) => gloss(x === 0 || x === W - 1 || z === 0 ? shade(trim, 0.92) : trim));
  v.box(0, 5, 0, W - 1, 5, D - 1, gloss(cream));
  for (const x of [3, W - 4]) v.box(x, -1, 2, x + 1, -1, D - 3, metal(0x9aa0a6));
  // tiers stepping up to the back
  const step = Math.floor((D - 8) / tiers);
  for (let k = 0; k < tiers; k++) {
    const z0 = 2 + k * step, top = 6 + (k + 1) * tierH;
    v.box(2, 6, z0, W - 3, top - 1, D - 3, (x, y, z) => gloss(z === z0 ? (y === top - 1 ? cream : creamD) : cream));
  }
  return { v, step };
}

/** A riser's printed strip: the series name in 5x7, small. */
function riserStrip(series, k, w) {
  const p = new Pix(Math.max(16, Math.round(w / 0.0015)), 8, 3 + k);
  const S = SERIES_BY_ID[series] || {}, accent = S.color ? parseInt(String(S.color).replace('#', ''), 16) : 0xc8322c;
  p.fill(0xf6efdc);
  p.rect(0, 0, p.w, 1, accent); p.rect(0, p.h - 1, p.w, 1, shade(accent, 0.7));
  p.flush();
  const t = (k === 0 ? (S.name || 'GACHA') : k === 1 ? 'COLLECT THEM ALL' : 'SECRET INSIDE').toUpperCase();
  const tw = textW5(t);
  for (let x = 2; x < p.w; x += tw + 10) draw5(p.ctx, t, x, 1, { s: 1, col: '#3a2a20' });
  p.pull();
  return p.texture();
}

/** The header strip: 0.03 m tall across the front top. */
function headerStrip(series, w) {
  const W = Math.round(w / 0.0012), H = 26, p = new Pix(W, H, 11);
  const S = SERIES_BY_ID[series] || {}, accent = S.color ? parseInt(String(S.color).replace('#', ''), 16) : 0xc8322c;
  p.fill(0xc8322c);
  p.rect(0, 0, W, 2, 0x8a1a16); p.rect(0, H - 2, W, 2, 0x8a1a16);
  p.rect(0, 3, W, 1, 0xf2c830); p.rect(0, H - 4, W, 1, 0xf2c830);
  // a NEW burst at the left
  const cx = 14, cy = H / 2;
  for (let y = 0; y < H; y++) for (let x = 0; x < 30; x++) { const a = Math.atan2(y - cy, x - cx), r = Math.hypot(x - cx, y - cy); if (r < 9 + (Math.cos(a * 8) > 0 ? 2 : 0)) p.px(x, y, r > 8 ? 0x241a1e : 0xf2c830); }
  p.flush();
  draw5(p.ctx, 'NEW', cx - Math.floor(textW5('NEW') / 2), cy - 3, { s: 1, col: '#c8322c' });
  // the series in kana (DotGothic16, hard texels) and its name in 5x7
  const jp = S.jp || '';
  if (jp) {
    p.ctx.font = '16px "DotGothic16"'; p.ctx.textBaseline = 'top';
    const tw = Math.min(W - 120, p.ctx.measureText(jp).width);
    const t = document.createElement('canvas'); t.width = Math.ceil(tw) + 2; t.height = 18;
    const tg = t.getContext('2d', { willReadFrequently: true });
    tg.font = '16px "DotGothic16"'; tg.textBaseline = 'top'; tg.fillStyle = '#000'; tg.fillText(jp, 0, 0, tw);
    const d = tg.getImageData(0, 0, t.width, t.height).data;
    p.pull();
    const x0 = 34;
    for (let j = 0; j < 18; j++) for (let i = 0; i < t.width; i++) if (d[(j * t.width + i) * 4 + 3] > 110) { p.px(x0 + i + 1, 5 + j, 0x5a0a0a); p.px(x0 + i, 4 + j, 0xfff4d8); }
    p.flush();
  }
  const en = (S.name || '').toUpperCase(), ew = textW5(en);
  p.ctx.fillStyle = hex(accent);
  draw5(p.ctx, en, W - ew - 6, cy - 3, { s: 1, col: '#fff4d8' });
  p.pull();
  return p.texture();
}

const acrylicMat = () => new THREE.MeshPhysicalMaterial({ color: 0xf4fbff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.16, clearcoat: 1, clearcoatRoughness: 0.04, depthWrite: false });

export function buildDisplay(style, series, { w, d, trim = 0xc8322c } = {}, thumbs = null) {
  const st = STYLES[style] || STYLES.tier;
  const group = new THREE.Group();
  const W = Math.max(24, Math.round(w / VS)), D = Math.max(20, Math.round(d / VS));
  const tierH = st.tiers === 3 ? 5 : 6;
  const { v, step } = standModel(W, D, st.tiers, tierH, trim);
  const geo = meshVoxels(v, { voxelSize: VS, origin: 'none' });
  const stand = new THREE.Mesh(geo, voxelMaterials('normal'));
  stand.rotation.y = Math.PI; // (the model's z = 0 is its front: turned so the front faces +z)
  stand.position.set(W * VS / 2, VS, D * VS / 2);
  stand.castShadow = true; stand.receiveShadow = true;
  group.add(stand);
  const disposables = [geo];
  const baseY = 7 * VS; // the plinth's top (y = 0 the rails)
  const H = st.h, iw = W * VS - 0.006, id = D * VS - 0.006;
  // the back card: the series' display card on a board against the back wall
  const cardH = Math.min(H - 0.04, (iw - 0.02) * 280 / 320), cardW = cardH * 320 / 280;
  let cardTex = null;
  try { cardTex = bannerTexture(series, thumbs); } catch { /* card not ready */ }
  const card = new THREE.Mesh(new THREE.PlaneGeometry(cardW, cardH), new THREE.MeshStandardMaterial({ map: cardTex, color: cardTex ? 0xffffff : 0xf2ead8, roughness: 0.7 }));
  card.position.set(0, baseY + st.tiers * tierH * VS + cardH / 2 + 0.004, -id / 2 + 0.006);
  if (card.position.y + cardH / 2 > baseY + H - 0.032) card.position.y = baseY + H - 0.032 - cardH / 2;
  const board = new THREE.Mesh(new THREE.BoxGeometry(cardW + 0.008, cardH + 0.008, 0.004), new THREE.MeshStandardMaterial({ color: shade(trim, 0.6), roughness: 0.6 }));
  board.position.copy(card.position).add(new THREE.Vector3(0, 0, -0.0025));
  group.add(board, card);
  disposables.push(card.geometry, board.geometry);
  // the risers' strips
  for (let k = 0; k < st.tiers; k++) {
    const z0 = 2 + k * step, top = 6 + (k + 1) * tierH;
    const tex = riserStrip(series, k, (W - 4) * VS);
    const strip = new THREE.Mesh(new THREE.PlaneGeometry((W - 6) * VS, (tierH - 2) * VS), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 }));
    strip.position.set(0, VS + (top - tierH / 2) * VS, D * VS / 2 - z0 * VS + 0.0006);
    group.add(strip);
    disposables.push(strip.geometry, tex);
  }
  // the acrylic case, its screw caps, and the header strip along its front top
  const caseGeo = new RoundedBoxGeometry(iw, H, id, 2, 0.006);
  const acrylic = new THREE.Mesh(caseGeo, acrylicMat());
  acrylic.position.set(0, baseY + H / 2, 0);
  acrylic.renderOrder = 4;
  acrylic.raycast = () => {};
  group.add(acrylic);
  const capM = new THREE.MeshStandardMaterial({ color: 0xd8dce0, roughness: 0.3, metalness: 0.8 });
  const capG = new THREE.CylinderGeometry(0.004, 0.004, 0.002, 8);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const c = new THREE.Mesh(capG, capM); c.position.set(sx * (iw / 2 - 0.01), baseY + H + 0.001, sz * (id / 2 - 0.01)); group.add(c); }
  const htex = headerStrip(series, iw);
  const header = new THREE.Mesh(new THREE.PlaneGeometry(iw - 0.008, 0.03), new THREE.MeshStandardMaterial({ map: htex, roughness: 0.5, emissive: st.tiers === 3 ? 0xffffff : 0x000000, emissiveMap: htex, emissiveIntensity: st.tiers === 3 ? 0.35 : 0 }));
  header.position.set(0, baseY + H - 0.019, id / 2 + 0.0008);
  group.add(header);
  disposables.push(caseGeo, capG, header.geometry, htex);
  // the slots: each tier's front strip, figures facing out
  const slots = [];
  for (let k = 0; k < st.tiers; k++) {
    const z0 = 2 + k * step, top = 6 + (k + 1) * tierH;
    const y = VS + top * VS, zf = D * VS / 2 - z0 * VS;
    const cell = (iw - 0.02) / st.per;
    for (let i = 0; i < st.per; i++) {
      slots.push({ x: -iw / 2 + 0.01 + cell * (i + 0.5), y, z: zf - step * VS * 0.5, maxH: Math.min(0.075, baseY + H - 0.034 - y), cell, depth: step * VS - 0.004, rot: (i - (st.per - 1) / 2) * -0.18 });
    }
  }
  return { group, slots, height: baseY + H, dispose() { for (const x of disposables) x.dispose?.(); } };
}
