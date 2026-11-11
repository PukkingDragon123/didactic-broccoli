// A photo printed as pixel art with a limited set of inks, the way the posters and flyers reduce their real photographs
// (Google Open Images, CC BY: see CREDITS.md): the inks are picked from the picture itself (median cut, the mean of
// each box), every pixel takes its nearest ink (no dithering, no noise), then orphan pixels (none of their four
// neighbours share their ink) take the ink most of their neighbours have, so the picture reads as clean clusters.
//   inkPrint(canvas, n = 16)   in place; transparent pixels are left alone
/** n inks for a set of pixels (flat r, g, b array). */
function inks(px, n) {
  let boxes = [Array.from({ length: px.length / 3 }, (_, i) => i)];
  const range = (b, k) => { let lo = 255, hi = 0; for (const i of b) { const v = px[i * 3 + k]; if (v < lo) lo = v; if (v > hi) hi = v; } return hi - lo; };
  while (boxes.length < n) {
    let bi = -1, bk = 0, br = -1;
    boxes.forEach((b, i) => { if (b.length < 2) return; for (let k = 0; k < 3; k++) { const r = range(b, k) * Math.sqrt(b.length); if (r > br) { br = r; bi = i; bk = k; } } });
    if (bi < 0) break;
    const b = boxes[bi].sort((p, q) => px[p * 3 + bk] - px[q * 3 + bk]), m = b.length >> 1;
    boxes.splice(bi, 1, b.slice(0, m), b.slice(m));
  }
  return boxes.filter((b) => b.length).map((b) => { let r = 0, g = 0, bl = 0; for (const i of b) { r += px[i * 3]; g += px[i * 3 + 1]; bl += px[i * 3 + 2]; } return [r / b.length, g / b.length, bl / b.length]; });
}

export function inkPrint(c, n = 16) {
  const g = c.getContext('2d', { willReadFrequently: true }), w = c.width, h = c.height;
  const im = g.getImageData(0, 0, w, h), d = im.data, solid = [];
  for (let i = 0; i < w * h; i++) if (d[i * 4 + 3] > 127) solid.push(i);
  if (!solid.length) return c;
  const px = new Float32Array(solid.length * 3);
  solid.forEach((i, k) => { px[k * 3] = d[i * 4]; px[k * 3 + 1] = d[i * 4 + 1]; px[k * 3 + 2] = d[i * 4 + 2]; });
  const pal = inks(px, n), lab = new Int16Array(w * h).fill(-1);
  for (const i of solid) {
    let best = 0, bd = Infinity;
    for (let k = 0; k < pal.length; k++) {
      const dr = d[i * 4] - pal[k][0], dg = d[i * 4 + 1] - pal[k][1], db = d[i * 4 + 2] - pal[k][2];
      const e = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
      if (e < bd) { bd = e; best = k; }
    }
    lab[i] = best;
  }
  // orphans take the ink of most of their eight neighbours
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : lab[y * w + x]);
  const out = lab.slice();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const l = lab[y * w + x];
    if (l < 0 || at(x - 1, y) === l || at(x + 1, y) === l || at(x, y - 1) === l || at(x, y + 1) === l) continue;
    const count = new Map();
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const v = at(x + i, y + j); if ((i || j) && v >= 0) count.set(v, (count.get(v) || 0) + 1); }
    let bv = l, bc = 0;
    for (const [v, k] of count) if (k > bc) { bc = k; bv = v; }
    if (bc >= 4) out[y * w + x] = bv;
  }
  for (const i of solid) { const p = pal[out[i]]; d[i * 4] = Math.round(p[0]); d[i * 4 + 1] = Math.round(p[1]); d[i * 4 + 2] = Math.round(p[2]); d[i * 4 + 3] = 255; }
  g.putImageData(im, 0, 0);
  return c;
}
