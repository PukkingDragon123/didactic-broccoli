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
export function printTexture(name, { mips = true, placeholder = '#e8e2d2' } = {}) {
  const s = sheet(name);
  if (!s.tex) {
    let image = s.img;
    if (!image) {
      image = document.createElement('canvas'); image.width = image.height = 4;
      const g = image.getContext('2d'); g.fillStyle = placeholder; g.fillRect(0, 0, 4, 4);
    }
    const t = new THREE.Texture(image);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    t.minFilter = mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
    t.generateMipmaps = mips;
    t.anisotropy = 4;
    t.needsUpdate = true;
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
export function printRegionTexture(name, key, opts) {
  const base = printTexture(name, opts), [u0, v0, u1, v1] = printUV(name, key, 0);
  const t = base.clone();
  t.repeat.set(u1 - u0, v1 - v0); t.offset.set(u0, v0);
  t.userData.print = name;
  // the clone must follow the sheet when it arrives
  if (!printImage(name)) whenPrint(name).then((img) => { if (img) { t.image = img; t.needsUpdate = true; } });
  return t;
}
