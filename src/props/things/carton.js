// Sealed shipping cartons (deliveries, market listing photos): the Poly Haven "Cardboard Box 01" (CC0, a real
// creased box with taped seams; public/models/cardboard_box_01.glb) stretched to the carton's size, with a printed
// shipping label (pixel art: the courier's band and mascot, the address, the item, a barcode) and a care sticker.
//   sealedBox([w, h, d], { title, sub, from, kind: 'decor' | 'single' | 'used' }) -> Group
//   origin at the bottom centre, label on the +z face; userData.size = [w, h, d]
import * as THREE from 'three';
import { assetSlot, preloadAssets } from '../../kit/assets.js';
import { Pix, FONT_JP } from '../../gfx/pix.js';
import { textW5 } from '../../gfx/font5x7.js';
import { activeLogo } from '../../logo/logo.js';

preloadAssets(['cardboard_box_01']); // listing photos are taken as soon as a page shows

const INK = 0x2a2420, PAPER = 0xf1ead8, PAPER_D = 0xd9cfb6;
const COURIERS = {
  decor: { band: 0x2c4c86, name: 'HOSHI EXPRESS', jp: 'ほし便' },
  single: { band: 0xb8343a, name: 'DAIKOKU TOYS', jp: '大黒玩具' },
  used: { band: 0x3c6a46, name: 'OFF-HOBBY', jp: 'オフホビー' },
};
// the courier's mascot: a little five-point star with a face (12 x 11)
const STAR = ['.....y......', '....yyy.....', '....yyy.....', 'yyyyyyyyyyy.', '.yyykyyky...', '..yyyyyyy...', '..yyyrryy...', '.yyyyyyyyy..', '.yyy...yyy..', 'yy.......yy.', '............'];

function hash(s) { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
/** Fit a line of the 5x7 font into width w (shortened with '.'). */
function fit5(s, w) { let t = s; while (t.length > 1 && textW5(t) > w) t = t.slice(0, -1); return t === s ? s : t.slice(0, -1) + '.'; }

const labels = new Map();
/** The shipping label: 128 x 88 px paper. */
export function shippingLabel({ title = '', sub = '', from = null, kind = 'decor' } = {}) {
  const shop = activeLogo().en; // (the shop's own name, src/logo/)
  const key = [title, sub, from, kind, shop].join('|');
  if (labels.has(key)) return labels.get(key);
  const C = COURIERS[kind] || COURIERS.decor, W = 128, H = 88, p = new Pix(W, H, hash(key));
  p.fill(PAPER);
  p.frame(0, 0, W, H, PAPER_D);
  // the courier band with its mascot and name
  p.rect(1, 1, W - 2, 15, C.band);
  p.sprite(STAR, { y: 0xf2c84a, k: 0x3a2a1a, r: 0xe0706a }, 3, 3);
  p.tinyText(from ? fit5(from.toUpperCase(), 92) : C.name, 18, 4, { color: 0xf4eedc });
  if (18 + textW5(from ? from.toUpperCase() : C.name) + 42 < W) p.text(C.jp, W - 4, 0, { font: FONT_JP, size: 12, color: 0xf4eedc, align: 'right' });
  // to: the shop
  p.text('お届け先', 4, 16, { font: FONT_JP, size: 12, color: INK });
  p.tinyText(fit5(shop, W - 56), 52, 19, { color: INK });
  p.tinyText('3-CHOME BACK LANE', 4, 30, { color: 0x5a5048 });
  p.rect(4, 39, W - 8, 1, PAPER_D);
  // the item, in two lines
  const words = String(title).toUpperCase().split(/\s+/).filter(Boolean), lines = [];
  let cur = '';
  for (const w of words) { const n = cur ? cur + ' ' + w : w; if (textW5(n) <= W - 10) cur = n; else { if (cur) lines.push(cur); cur = w; } }
  if (cur) lines.push(cur);
  lines.slice(0, 2).forEach((l, i) => p.tinyText(fit5(l, W - 10), 5, 42 + i * 9, { color: 0x1e2a6a }));
  if (sub) p.tinyText(fit5(String(sub).toUpperCase(), 60), 5, 61, { color: 0xb8343a });
  // a barcode with its number (from the item name, so the same box always prints the same code)
  let h = hash(title + kind);
  const bx0 = 66, bx1 = W - 5;
  for (let x = bx0; x < bx1;) { const wbar = 1 + (h & 1) + ((h >> 1) & 1 && !(h & 4) ? 1 : 0); p.rect(x, 60, wbar, 16, INK); x += wbar + 1 + ((h >> 3) & 1); h = Math.imul(h ^ (h >>> 13), 2654435761) >>> 0; }
  p.tinyText(String(hash(title) % 1e9).padStart(9, '0'), (bx0 + bx1) / 2, 77, { color: INK, align: 'center' });
  // the red care stamp: 取扱注意
  p.frame(5, 70, 50, 14, 0xc8302a); p.frame(6, 71, 48, 12, 0xc8302a);
  p.text('取扱注意', 30, 69, { font: FONT_JP, size: 12, color: 0xc8302a, align: 'center' });
  const t = p.texture();
  labels.set(key, t);
  return t;
}

const labelMats = new Map();
function labelMat(o) {
  const t = shippingLabel(o), k = t.uuid;
  if (!labelMats.has(k)) labelMats.set(k, new THREE.MeshStandardMaterial({ map: t, roughness: 0.88, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  return labelMats.get(k);
}

/** A sealed carton of size [w, h, d] (m) with its label. */
export function sealedBox(size, o = {}) {
  const [w, h, d] = size;
  const g = new THREE.Group();
  g.add(assetSlot('cardboard_box_01', { size: [w, h, d], fit: 'stretch' }));
  // the label sits on the front panel, under the tape band; the creased board bulges a little, so it stands proud
  const lw = Math.min(w * 0.62, 0.2), lh = lw * 88 / 128;
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(lw, lh), labelMat(o));
  lab.position.set(-w * 0.12, Math.min(h * 0.38, h - lh / 2 - 0.02), d / 2 + 0.006);
  lab.userData.noRim = true; lab.userData.noDecal = true;
  lab.receiveShadow = true;
  g.add(lab);
  g.userData.size = size;
  return g;
}
