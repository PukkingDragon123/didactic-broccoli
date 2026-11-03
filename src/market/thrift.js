// Thrift tees from Off-Hobby, registered into the cosmetics catalogue at import time (so saves that own them restore
// cleanly). They're hidden from the closet shop until you own one. Prints are tiny pixelated versions of the game's
// CC-BY photos (public/img/photos, credited in CREDITS.md), or simple motifs; never album covers.
//   thriftPrint(id) -> { w, h, data } | null    the 12 x 12 print once its photo has loaded (loadPrints() starts that)
//   teeTexture(id) -> CanvasTexture            the folded tee's top (held item, listing photos)
import * as THREE from 'three';
import { COSMETICS, COSMETIC_BY_ID } from '../people/cosmetics.js';
import { hex } from '../people/paintlib.js';
import { Pix } from '../gfx/pix.js';
import { THRIFT, THRIFT_BY_ID } from './catalog.js';

const N = 12; // print size in pixels
const prints = new Map(); // id -> { w, h, data } (rgb)
const loading = new Map();

/** Posterize a photo to a 12 x 12 print with a 6-colour palette (median-ish bins). */
function toPrint(img) {
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d', { willReadFrequently: true });
  const s = Math.min(img.width, img.height);
  g.imageSmoothingEnabled = true;
  g.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, N, N);
  const d = g.getImageData(0, 0, N, N).data;
  const out = new Uint8Array(N * N * 3);
  for (let i = 0; i < N * N; i++) {
    // 3 levels per channel + a contrast bump: chunky screen-print colours
    for (let k = 0; k < 3; k++) { const v = d[i * 4 + k] / 255; const q = Math.round(Math.min(1, Math.max(0, (v - 0.5) * 1.25 + 0.5)) * 3) / 3; out[i * 3 + k] = Math.round(q * 255); }
  }
  return { w: N, h: N, data: out };
}

export function loadPrints(ids = THRIFT.filter((t) => t.photo).map((t) => t.id)) {
  const all = [];
  for (const id of ids) {
    const t = THRIFT_BY_ID[id];
    if (!t?.photo || prints.has(id)) continue;
    if (!loading.has(id)) {
      loading.set(id, new Promise((res) => {
        const img = new Image();
        img.onload = () => { try { prints.set(id, toPrint(img)); } catch { /* tainted / decode */ } res(true); };
        img.onerror = () => res(false);
        img.src = `img/photos/${t.photo}.jpg`;
      }));
    }
    all.push(loading.get(id));
  }
  return Promise.all(all);
}
export const thriftPrint = (id) => prints.get(id) || null;

// ------------------------------------------------------------------ cosmetics registration
for (const t of THRIFT) {
  if (COSMETIC_BY_ID[t.id]) continue;
  const c = {
    id: t.id, slot: 'outfit', name: t.name, price: t.price, thrift: true,
    desc: t.photo ? 'A thrift find with a photo print. One of a kind (probably).' : 'A thrift find. Soft from a thousand washes.',
    spec(spec) {
      const print = t.photo ? (prints.get(t.id) ? 'pix' : 'none') : t.print;
      spec.top = { kind: 'tee', col: hex(t.col), col2: hex(t.col2 ?? 0xf2f0ea), print, pix: prints.get(t.id) || null, sleeve: 'short' };
    },
  };
  COSMETICS.push(c);
  COSMETIC_BY_ID[t.id] = c;
}

// ------------------------------------------------------------------ the folded tee's texture
const texes = new Map();
export function teeTexture(id) {
  const key = id + (prints.has(id) ? '+p' : '');
  if (texes.has(key)) return texes.get(key);
  const t = THRIFT_BY_ID[id];
  const p = new Pix(32, 26, 5);
  const col = t?.col ?? colourOf(id), col2 = t?.col2 ?? 0xf2f0ea;
  p.fill(col);
  if (t?.print === 'border' || t?.print === 'stripes') for (let y = 0; y < 26; y += t.print === 'border' ? 3 : 4) p.rect(0, y, 32, t.print === 'border' ? 1 : 2, col2);
  // folded edges and the collar
  p.rect(0, 0, 32, 1, shade(col, 0.8)); p.rect(0, 25, 32, 1, shade(col, 0.7)); p.rect(0, 0, 1, 26, shade(col, 0.8)); p.rect(31, 0, 1, 26, shade(col, 0.7));
  for (let x = 11; x <= 20; x++) p.px(x, Math.round(2 + Math.sin((x - 11) / 9 * Math.PI) * 3), shade(col, 0.65));
  const pr = prints.get(id);
  if (pr) { for (let y = 0; y < pr.h; y++) for (let x = 0; x < pr.w; x++) { const i = (y * pr.w + x) * 3; p.px(10 + x, 8 + y, [pr.data[i], pr.data[i + 1], pr.data[i + 2]]); } }
  else if (t?.print === 'circle') p.circle(16, 14, 5, col2);
  else if (t?.print === 'heart') { for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) { const X = (x - 5.5) / 5.5, Y = -(y - 5.5) / 5.5 + 0.2; if ((X * X + Y * Y - 0.5) ** 3 - X * X * Y * Y * Y < 0) p.px(10 + x, 8 + y, col2); } }
  else if (t?.print === 'star') { for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) { const a = Math.atan2(y - 6, x - 6) + Math.PI / 2, d = Math.hypot(x - 6, y - 6); const k = ((a / (Math.PI * 2 / 5)) % 1 + 1) % 1; if (d <= 2.6 + 3.4 * Math.abs(k - 0.5) * 2) p.px(10 + x, 8 + y, col2); } }
  else if (!t) { p.tinyText((COSMETIC_BY_ID[id]?.name || '').split(' ')[0].toUpperCase().slice(0, 6), 16, 10, { color: 0x2a2220, align: 'center' }); }
  const tex = p.texture();
  tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
  texes.set(key, tex);
  return tex;
}
function colourOf(id) { return { dino: 0x5fb64a, banana: 0xf6d43c, happi: 0x2a3f78, box: 0xc89a5f }[id] ?? 0xd8c8b0; }
function shade(c, k) { const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255; return ((Math.round(r * k) << 16) | (Math.round(g * k) << 8) | Math.round(b * k)) >>> 0; }

/** A folded garment (outfits, tees) or a paper bag (hats, face items) for the hands and photos. */
export function garmentMesh(id) {
  const c = COSMETIC_BY_ID[id];
  const g = new THREE.Group();
  if (c && c.slot !== 'outfit') {
    // a little paper shop bag with the item's name
    const p = new Pix(24, 28, 3);
    p.fill(0xd8b888); p.noise(0.05); p.rect(0, 0, 24, 3, 0xc8a070);
    p.tinyText((c.name.split(' ').pop() || '').toUpperCase().slice(0, 5), 12, 12, { color: 0x6a3a2a, align: 'center' });
    const t = p.texture(); t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    const side = new THREE.MeshStandardMaterial({ color: 0xc8a878, roughness: 0.9 }), face = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.19, 0.07), [side, side, side, side, face, face]);
    bag.position.y = 0.095; bag.castShadow = true;
    g.add(bag);
    for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.004, 4, 10, Math.PI), new THREE.MeshStandardMaterial({ color: 0x8a5a3a })); h.position.set(s * 0.04, 0.19, 0); g.add(h); }
    return g;
  }
  const top = new THREE.MeshStandardMaterial({ map: teeTexture(id), roughness: 0.95 });
  const sideM = new THREE.MeshStandardMaterial({ color: THRIFT_BY_ID[id]?.col ?? colourOf(id), roughness: 0.95 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.035, 0.21), [sideM, sideM, top, sideM, sideM, sideM]);
  m.position.y = 0.0175; m.castShadow = true; m.receiveShadow = true;
  g.add(m);
  return g;
}
