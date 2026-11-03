// Photo prints for clothes: the game's CC-BY photos (public/img/photos/**, credited in CREDITS.md) cropped and shrunk to
// a tiny pixel picture, then posterised to a handful of screen-print inks (median cut + a little saturation and
// contrast), so a tee reads like a cheap souvenir print instead of a photo. Never album covers or logos.
//   loadPrint(id) -> Promise<print | null>     print = { w, h, data: Uint8Array rgb } (cached per cosmetic id)
//   ensurePrints(ids) -> Promise                loads every id that has a photo print (unknown ids are skipped)
//   printOf(id) -> print | null                 once loaded
//   printURL(id, scale) -> data URL | ''        the print blown up with hard pixels (web shop, unlock cards)
//   registerPrint(id, { photo, w, h, inks, crop }) the catalogue's print settings (src/cosmetics/catalog.js)

const DEFS = new Map(); // id -> { photo, w, h, inks, crop: [x, y, size] (0..1 of the short side) }
const prints = new Map();
const loading = new Map();

export function registerPrint(id, def) { DEFS.set(id, { w: 16, h: 16, inks: 7, ...def }); }
export const hasPrint = (id) => DEFS.has(id);
export const printOf = (id) => prints.get(id) || null;

/** Median cut down to n colours over [r, g, b] samples. */
function medianCut(px, n) {
  let boxes = [px];
  while (boxes.length < n) {
    // split the box with the widest channel range
    let bi = -1, bc = 0, br = -1;
    boxes.forEach((b, i) => {
      if (b.length < 2) return;
      for (let c = 0; c < 3; c++) {
        let lo = 255, hi = 0;
        for (const p of b) { if (p[c] < lo) lo = p[c]; if (p[c] > hi) hi = p[c]; }
        if (hi - lo > br) { br = hi - lo; bi = i; bc = c; }
      }
    });
    if (bi < 0 || br < 12) break;
    const b = boxes[bi].sort((x, y) => x[bc] - y[bc]);
    const m = b.length >> 1;
    boxes.splice(bi, 1, b.slice(0, m), b.slice(m));
  }
  return boxes.map((b) => { const s = [0, 0, 0]; for (const p of b) for (let c = 0; c < 3; c++) s[c] += p[c]; return s.map((v) => Math.round(v / b.length)); });
}

function toPrint(img, d) {
  const { w, h } = d;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  // crop: a box in the photo (fractions), defaulting to the centre, at the print's aspect
  const short = Math.min(img.width, img.height);
  const [cx, cy, cs] = d.crop || [0.5, 0.5, 1];
  const sw = short * cs * Math.min(1, w / h), sh = short * cs * Math.min(1, h / w);
  const sx = Math.max(0, Math.min(img.width - sw, cx * img.width - sw / 2)), sy = Math.max(0, Math.min(img.height - sh, cy * img.height - sh / 2));
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  const src = g.getImageData(0, 0, w, h).data;
  // punch it up like an ink print: saturation + contrast around the mean
  const px = [];
  let mean = 0;
  for (let i = 0; i < w * h; i++) mean += (src[i * 4] + src[i * 4 + 1] + src[i * 4 + 2]) / 3;
  mean /= w * h;
  for (let i = 0; i < w * h; i++) {
    let r = src[i * 4], gg = src[i * 4 + 1], b = src[i * 4 + 2];
    const l = (r + gg + b) / 3;
    const sat = d.sat ?? 1.35, con = d.con ?? 1.2;
    r = l + (r - l) * sat; gg = l + (gg - l) * sat; b = l + (b - l) * sat;
    r = mean + (r - mean) * con; gg = mean + (gg - mean) * con; b = mean + (b - mean) * con;
    px.push([r, gg, b].map((v) => Math.max(0, Math.min(255, Math.round(v)))));
  }
  const pal = medianCut(px.map((p) => p.slice()), d.inks);
  const out = new Uint8Array(w * h * 3);
  px.forEach((p, i) => {
    let best = 0, bd = Infinity;
    pal.forEach((q, k) => { const e = (p[0] - q[0]) ** 2 * 0.3 + (p[1] - q[1]) ** 2 * 0.59 + (p[2] - q[2]) ** 2 * 0.11; if (e < bd) { bd = e; best = k; } });
    out[i * 3] = pal[best][0]; out[i * 3 + 1] = pal[best][1]; out[i * 3 + 2] = pal[best][2];
  });
  // a dark ink keyline around the picture (screen-printed tees have one)
  if (d.frame) {
    const ink = d.frame === true ? [34, 26, 30] : d.frame;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (x === 0 || y === 0 || x === w - 1 || y === h - 1) out.set(ink, (y * w + x) * 3);
  }
  return { w, h, data: out };
}

export function loadPrint(id) {
  const d = DEFS.get(id);
  if (!d) return Promise.resolve(null);
  if (prints.has(id)) return Promise.resolve(prints.get(id));
  if (!loading.has(id)) {
    loading.set(id, new Promise((res) => {
      const img = new Image();
      img.onload = () => { try { prints.set(id, toPrint(img, d)); } catch (e) { console.warn('print', id, e); } res(prints.get(id) || null); };
      img.onerror = () => res(null);
      img.src = `img/photos/${d.photo}.jpg`;
    }));
  }
  return loading.get(id);
}

export function ensurePrints(ids) {
  return Promise.all([...new Set(ids)].filter((id) => DEFS.has(id)).map(loadPrint));
}

const urls = new Map();
export function printURL(id, scale = 6) {
  const p = prints.get(id);
  if (!p) return '';
  const k = id + '@' + scale;
  if (urls.has(k)) return urls.get(k);
  const c = document.createElement('canvas');
  c.width = p.w * scale; c.height = p.h * scale;
  const g = c.getContext('2d');
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    const i = (y * p.w + x) * 3;
    g.fillStyle = `rgb(${p.data[i]},${p.data[i + 1]},${p.data[i + 2]})`;
    g.fillRect(x * scale, y * scale, scale, scale);
  }
  const u = c.toDataURL();
  urls.set(k, u);
  return u;
}
