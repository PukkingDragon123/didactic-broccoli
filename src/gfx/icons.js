// Hand-pixelled 2D icons for the HUD, the hotbar and the shop UIs (no emoji anywhere).
// Each icon is a grid of characters + a legend of colours; '.' is transparent. Icons get an automatic
// 1px dark outline and a soft drop shadow when rendered, so they read on any background.
//
//   iconCanvas(name, scale)  -> HTMLCanvasElement (cached)
//   iconURL(name, scale)     -> data: URL (cached), for <img> / CSS backgrounds
//   iconHTML(name, scale, cls) -> '<img class="px-icon ...">' string
//   hasIcon(name), ICON_NAMES
//
// Grids may be any size up to 32x32 (most are 16x16 for UI glyphs, 24x24 for items).

export const OUTLINE = '#1a1216';

// shared palette letters (an icon's own legend overrides these)
const BASE = {
  K: '#1a1216', // ink
  W: '#ffffff',
  w: '#e8e2d6',
  g: '#a8a29a',
  G: '#6a6660',
  R: '#e5383b', r: '#a8242a',
  Y: '#ffd23f', y: '#c8960c',
  O: '#ff8a3a',
  B: '#3f86e8', b: '#2a5aa8',
  C: '#7fd8ff',
  E: '#58c06c', e: '#2f7a40',
  P: '#ff6f91', p: '#c84a6a',
  T: '#c8a070', t: '#8a6440',
  N: '#6a4428', n: '#3e2614',
};

export const ICONS = {
  key: {
    rows: [
      '................',
      '....YYYY........',
      '...YyyyYY.......',
      '..Yy....yY......',
      '..Yy....yY......',
      '..Yy....yY......',
      '...YyyyYY.......',
      '....YYYYYyYYYYY.',
      '.........yyyyyy.',
      '............Y.Y.',
      '............Y.Y.',
      '................',
    ],
  },
  milk: {
    rows: [
      '.....wwww.....',
      '....wWWWWw....',
      '...wWWWWWWw...',
      '..BBBBBBBBBB..',
      '..BWWWWWWWWB..',
      '..BW.BBBB.WB..',
      '..BWBCCCCBWB..',
      '..BWBCWWCBWB..',
      '..BWBCCCCBWB..',
      '..BW.BBBB.WB..',
      '..BWWWWWWWWB..',
      '..BBBBBBBBBB..',
    ],
  },
};

const cache = new Map();

function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Rasterise an icon (with outline + shadow) at 1x into an ImageData-backed canvas. */
function raster(name) {
  const def = ICONS[name] || FALLBACK;
  const rows = def.rows;
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const legend = { ...BASE, ...(def.legend || {}) };
  const pad = 2; // room for outline + shadow
  const cw = w + pad * 2, ch = h + pad * 2;
  const solid = new Uint8Array(cw * ch);
  const col = new Array(cw * ch).fill(null);
  rows.forEach((r, y) => [...r].forEach((c, x) => {
    if (c === '.' || c === ' ') return;
    const hex = legend[c];
    if (!hex) return;
    const i = (y + pad) * cw + x + pad;
    solid[i] = 1;
    col[i] = hex;
  }));
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  const g = c.getContext('2d');
  const img = g.createImageData(cw, ch);
  const put = (i, rgb, a) => { img.data[i * 4] = rgb[0]; img.data[i * 4 + 1] = rgb[1]; img.data[i * 4 + 2] = rgb[2]; img.data[i * 4 + 3] = a; };
  const out = hexToRgb(def.outline || OUTLINE);
  // drop shadow (down-right), then outline, then the pixels
  if (def.shadow !== false) {
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const i = y * cw + x;
      if (solid[i]) continue;
      const sx = x - 1, sy = y - 1;
      if (sx >= 0 && sy >= 0 && (solid[sy * cw + sx] || (def.outline !== false && near(solid, cw, ch, sx, sy)))) put(i, [0, 0, 0], 70);
    }
  }
  if (def.outline !== false) {
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const i = y * cw + x;
      if (!solid[i] && near(solid, cw, ch, x, y)) put(i, out, 255);
    }
  }
  for (let i = 0; i < cw * ch; i++) if (solid[i]) put(i, hexToRgb(col[i]), 255);
  g.putImageData(img, 0, 0);
  return c;
}

function near(solid, cw, ch, x, y) {
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const xx = x + dx, yy = y + dy;
    if (xx >= 0 && yy >= 0 && xx < cw && yy < ch && solid[yy * cw + xx]) return true;
  }
  return false;
}

const FALLBACK = {
  rows: ['.KKKKKK.', 'KWWWWWWK', 'KWKKKKWK', 'KWWWWKWK', 'KWWWKWWK', 'KWWWWWWK', 'KWWWKWWK', '.KKKKKK.'],
};

export function hasIcon(name) { return !!ICONS[name]; }
export const ICON_NAMES = () => Object.keys(ICONS);

/** Icon scaled up with nearest-neighbour (scale = integer pixel size). */
export function iconCanvas(name, scale = 2) {
  const k = `${name}@${scale}`;
  if (cache.has(k)) return cache.get(k);
  const src = raster(name);
  const c = document.createElement('canvas');
  c.width = src.width * scale; c.height = src.height * scale;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0, c.width, c.height);
  cache.set(k, c);
  return c;
}

const urls = new Map();
export function iconURL(name, scale = 2) {
  const k = `${name}@${scale}`;
  if (!urls.has(k)) urls.set(k, iconCanvas(name, scale).toDataURL());
  return urls.get(k);
}

export function iconHTML(name, scale = 2, cls = '') {
  const c = iconCanvas(name, scale);
  return `<img class="px-icon ${cls}" src="${iconURL(name, scale)}" width="${c.width}" height="${c.height}" alt="" draggable="false">`;
}

/** Register extra icons at runtime (e.g. generated ones). */
export function defineIcon(name, def) { ICONS[name] = def; for (const k of [...cache.keys()]) if (k.startsWith(name + '@')) cache.delete(k); for (const k of [...urls.keys()]) if (k.startsWith(name + '@')) urls.delete(k); }
