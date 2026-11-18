// The baked print atlases: every printed thing in the world (posters, notices, packs, menus, display cards...) is laid
// out offline from real photographs and set in the game's pixel type (tools/bake-print.py, tools/bake-cards.py,
// tools/printkit.py), then shipped as one WebP sheet per area in public/img/print/<name>.webp. The sheet's regions
// live next to this file (src/gfx/print/<name>.json, written by the bake) and are imported at build time, so UVs are
// known synchronously while the sheet itself streams in (paper colour until then). One texture per sheet, shared.
//   printRegions(name) -> { key: [x, y, w, h], _size: [W, H] }      printHas(name, key)
//   printTexture(name, { mips, placeholder }) -> THREE.Texture (nearest magnification: the type stays crisp)
//   printUV(name, key, inset = 0.5) -> [u0, v0, u1, v1]               printKeys(name, prefix) -> [key...]
//   whenPrint(name) -> Promise<HTMLImageElement | null>               printImage(name) -> image | null once loaded
import * as THREE from 'three';

const REG = import.meta.glob('./print/*.json', { eager: true, import: 'default' });
const BASE = (import.meta.env?.BASE_URL ?? '/') + 'img/print/';
const sheets = new Map(); // name -> { tex, img, promise }

export function printRegions(name) { return REG[`./print/${name}.json`] || { _size: [1, 1] }; }
export function printHas(name, key) { return !!printRegions(name)[key]; }
export function printKeys(name, prefix = '') { return Object.keys(printRegions(name)).filter((k) => k !== '_size' && k.startsWith(prefix)); }

function sheet(name) {
  let s = sheets.get(name);
  if (!s) {
    s = { tex: null, img: null, promise: null };
    s.promise = typeof Image === 'undefined' ? Promise.resolve(null) : new Promise((res) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => { s.img = img; if (s.tex) { s.tex.image = img; s.tex.needsUpdate = true; } res(img); };
      img.onerror = () => { console.warn('print sheet missing', name); res(null); };
      img.src = BASE + name + '.webp';
    });
    sheets.set(name, s);
  }
  return s;
}

export const whenPrint = (name) => sheet(name).promise;
export const printImage = (name) => sheet(name).img;

/** The sheet's texture (one per sheet). mips: false for things only ever seen up close (saves a third). */
export function printTexture(name, { mips = true } = {}) {
  const s = sheet(name);
  if (!s.tex) {
    // no stand-in image: a texture's storage can't change size once uploaded, so it stays un-uploaded (version 0,
    // drawn as the empty texture) until the sheet itself arrives
    const t = new THREE.Texture(s.img || undefined);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    t.minFilter = mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
    t.generateMipmaps = mips;
    t.anisotropy = 4;
    if (s.img) t.needsUpdate = true;
    t.userData.print = name;
    s.tex = t;
  }
  return s.tex;
}

/** [u0, v0, u1, v1] of a region (inset in texels keeps neighbours from bleeding in). */
export function printUV(name, key, inset = 0.5) {
  const R = printRegions(name), r = R[key];
  if (!r) return [0, 0, 1, 1];
  const [W, H] = R._size, [x, y, w, h] = r;
  return [(x + inset) / W, 1 - (y + h - inset) / H, (x + w - inset) / W, 1 - (y + inset) / H];
}

/** A texture clone showing just one region (for a plain PlaneGeometry; clones share the one upload). */
export function printRegionTexture(name, key, { mips = true } = {}) {
  const [u0, v0, u1, v1] = printUV(name, key, 0);
  // its own texture object (no clone: a clone of a sheet that hasn't arrived would be flagged for upload with no image)
  const t = new THREE.Texture();
  t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
  t.minFilter = mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter; t.generateMipmaps = mips; t.anisotropy = 4;
  t.repeat.set(u1 - u0, v1 - v0); t.offset.set(u0, v0);
  t.userData.print = name;
  const set = (img) => { if (img) { t.source = printTexture(name, { mips }).source; t.needsUpdate = true; } };
  if (printImage(name)) set(printImage(name)); else whenPrint(name).then(set);
  return t;
}

/** Copy a baked region into a canvas context at (x, y, w, h) (the sheet must have loaded: main.js waits for 'misc'
 * and 'promo' before the world builds). Returns false when it isn't there, so the caller can fall back. */
export function drawPrint(ctx, name, key, x = 0, y = 0, w = null, h = null) {
  const img = printImage(name), r = printRegions(name)[key];
  if (!img || !r) return false;
  const dw = w ?? ctx.canvas.width, dh = h ?? ctx.canvas.height;
  // 1:1 (or a whole-number enlargement) copies pixel type as it is; only a true resize is smoothed
  const exact = dw % r[2] === 0 && dh % r[3] === 0;
  ctx.imageSmoothingEnabled = !exact; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, r[0], r[1], r[2], r[3], x, y, dw, dh);
  return true;
}
/** The same into a Pix (src/gfx/pix.js): drawn on its canvas, then pulled back into its pixel buffer. */
export function pixPrint(p, name, key) {
  p.flush?.();
  if (!drawPrint(p.ctx, name, key, 0, 0, p.w, p.h)) return false;
  p.pull?.();
  return true;
}
