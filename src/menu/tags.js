// The menu's paper tags: manila price tags cut with a stepped point, a punched hole with its reinforcement ring (the twine
// runs through it), a pixel icon, the label in Alagard (ink), and a price-style note pencilled in red on the right.
// Painted texel by texel (src/menu/pixel.js) in two states: plain, and "picked" (a red-pen tick after the label and a
// wobbly graphite underline). Hover feedback is never a glow: the tag swings, lifts a texel, gets the pencil marks.
//   paintTag({ label, note, icon, w, h, stock, seed, hot, ring }) -> art     tagMetrics(items) -> { w, h }
import { iconCanvas } from '../gfx/icons.js';
import { art, textMask, mask5, grain, rng, hex, shade } from './pixel.js';

export const STOCK = {
  manila: { base: [226, 200, 140], edge: [92, 64, 38], ring: [242, 224, 178] },
  note: { base: [246, 226, 132], edge: [96, 74, 30], ring: [252, 240, 186] },
  cream: { base: [238, 228, 202], edge: [80, 64, 52], ring: [250, 244, 226] },
  pink: { base: [240, 212, 208], edge: [120, 60, 58], ring: [250, 232, 228] },
};
const RED = hex(0xc8322c), INKC = hex(0x241a1e), GRAPHITE = [86, 84, 92];
export const HOLE = { x: 6, r: 2 }; // the punched hole's centre column (texels) and radius

// a few icons of our own (the game's set has no capsule this small, nor a shirt): '#' ink, letters from PAL
const PAL = { p: 0xff6f91, P: 0xc8406a, g: 0xcfeef4, G: 0x9cc8d4, Y: 0xd89a1c, r: 0xe5383b, R: 0xa8242a, w: 0xfffcf4, c: 0xf6eedc, C: 0xcabba0, b: 0x3f74c8, B: 0x27508e, s: 0xf2f0ea, y: 0xffd23f };
const OWN = {
  capsule: [
    '......#####......',
    '....##ggggw##....',
    '...#ggggggwwg#...',
    '..#ggggggggggw#..',
    '.#gggggggggggwg#.',
    '#GGGGGGGGGGGGGGG#',
    '#################',
    '#ppppppppppppppp#',
    '#pppppppppppppPP#',
    '.#pppppppppppPP#.',
    '.#ppppppppppPPP#.',
    '..##pppppppPP##..',
    '....###PPP###....',
    '.......###.......',
  ],
  shirt: [
    '...###..###...',
    '.##bbb##bbb##.',
    '#bbbbbbbbbbbb#',
    '#bbbbbbbbbbbb#',
    '#bbbbbbbbbbbb#',
    '.###bbbbbb###.',
    '...#ssssss#...',
    '...#bbbbbb#...',
    '...#bbbbbb#...',
    '...#bbbbbb#...',
    '...#BBBBBB#...',
    '...########...',
  ],
};
const iconCache = new Map();
function iconPixels(name) {
  if (iconCache.has(name)) return iconCache.get(name);
  let px = null;
  if (OWN[name]) {
    const rows = OWN[name], w = rows[0].length, h = rows.length, d = new Uint8ClampedArray(w * h * 4);
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '.') return;
      const c = ch === '#' ? 0x241a1e : PAL[ch], i = (y * w + x) * 4;
      d[i] = (c >> 16) & 255; d[i + 1] = (c >> 8) & 255; d[i + 2] = c & 255; d[i + 3] = 255;
    }));
    px = { w, h, d };
    iconCache.set(name, px);
    return px;
  }
  try {
    const c = iconCanvas(name, 1);
    const g = c.getContext('2d', { willReadFrequently: true });
    px = { w: c.width, h: c.height, d: g.getImageData(0, 0, c.width, c.height).data };
  } catch { px = null; }
  iconCache.set(name, px);
  return px;
}

/** Uniform tag size for a set of items (so the strand reads as one set). */
export function tagMetrics(items) {
  let lw = 0, nw = 0;
  for (const it of items) { lw = Math.max(lw, textMask(it.label).w); nw = Math.max(nw, it.note ? mask5(it.note).w : 0); }
  return { w: 33 + lw + 13 + nw + 7, h: 22, lw, nw };
}

export function paintTag(o) {
  const st = STOCK[o.stock || 'manila'];
  const w = o.w, h = o.h || 22, cut = 6;
  const a = art(w, h);
  const r = rng(o.seed || 7);
  const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h && x >= cut - y && x >= cut - (h - 1 - y) && !((x === w - 1) && (y === 0 || y === h - 1));
  grain(a, 0, 0, w, h, st.base, o.seed || 7, inside);
  // the cut edge in a darker shade of the stock (scissor-cut fibres), then the ink rim
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!inside(x, y)) continue;
    const rim = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
    if (rim) a.px(x, y, st.edge);
    else if (!inside(x - 1, y - 1) || !inside(x + 1, y + 1) || !inside(x + 1, y - 1) || !inside(x - 1, y + 1)) a.px(x, y, shade(st.base, 0.88));
  }
  // the card's thickness: a lighter texel row under the top edge, a darker one over the bottom edge
  for (let x = 0; x < w; x++) {
    let top = -1, bot = -1;
    for (let y = 0; y < h; y++) if (inside(x, y)) { if (top < 0) top = y; bot = y; }
    if (top >= 0 && inside(x - 1, top + 1) && inside(x + 1, top + 1)) a.px(x, top + 1, shade(st.base, 1.06));
    if (bot >= 0 && inside(x - 1, bot - 1) && inside(x + 1, bot - 1)) a.px(x, bot - 1, shade(st.base, 0.86));
  }
  // a bent corner on the right end, and a crease across the tag near the hole
  if (o.dog) { a.px(w - 2, h - 2, shade(st.base, 0.75)); a.px(w - 3, h - 2, shade(st.base, 0.82)); a.px(w - 2, h - 3, shade(st.base, 0.82)); }
  for (let y = 2; y < h - 2; y++) if (r() < 0.55) a.px(13, y, shade(st.base, 0.93));
  // the punched hole: a round hole (see-through) with its paper reinforcement ring
  const hx = HOLE.x, hy = Math.floor(h / 2);
  for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) {
    const d = Math.hypot(x, y);
    if (d <= 1.6) a.clear(hx + x, hy + y);
    else if (d <= 2.4) a.px(hx + x, hy + y, x + y > 0 ? shade(st.edge, 1.3) : st.edge);
    else if (d <= 3.7) a.px(hx + x, hy + y, d > 3.2 && x + y > 1 ? shade(st.ring, 0.9) : st.ring);
  }
  // the icon (the game's own pixel icons), sitting on the paper
  const ic = o.icon && iconPixels(o.icon);
  if (ic) {
    const ix = 15 + Math.floor((16 - ic.w) / 2), iy = Math.floor((h - ic.h) / 2);
    for (let y = 0; y < ic.h; y++) for (let x = 0; x < ic.w; x++) { const i = (y * ic.w + x) * 4; if (ic.d[i + 3] > 128) a.px(ix + x, iy + y, [ic.d[i], ic.d[i + 1], ic.d[i + 2]]); }
  }
  // the label, in ink
  const m = textMask(o.label);
  const lx = 35, ly = Math.round((h - m.base) / 2) - 1 + (m.h - m.base > 2 ? 0 : 1);
  a.mask(m, lx, ly, INKC);
  // the note, pencilled in red pen on the right like a price (a red loop round it on the first tag)
  if (o.note) {
    const n = mask5(o.note), nx = w - 6 - n.w, ny = Math.floor((h - 7) / 2);
    a.mask(n, nx, ny, RED);
    if (o.ring) {
      for (let x = nx - 2; x <= nx + n.w + 1; x++) { if (r() < 0.92) a.px(x, ny - 3, RED); if (r() < 0.92) a.px(x, ny + 9, RED); }
      for (let y = ny - 2; y <= ny + 8; y++) { a.px(nx - 3, y, RED); if (y > ny - 2) a.px(nx + n.w + 2, y, RED); }
      a.px(nx + n.w + 2, ny - 3, RED); a.px(nx + n.w + 3, ny - 4, RED); // the pen overshoots where it closed the loop
    }
  }
  // picked: a red-pen tick after the label and a graphite underline that wobbles
  if (o.hot) {
    const tx = lx + m.w + 4, ty = ly + m.base - 7;
    const tick = [[0, 3], [1, 4], [1, 3], [2, 5], [2, 4], [3, 4], [3, 3], [4, 2], [4, 1], [5, 0], [5, 1], [6, -1], [6, 0], [7, -2]];
    for (const [x, y] of tick) a.px(tx + x, ty + y + 2, RED);
    let y = ly + m.base + 2;
    for (let x = lx - 1; x <= lx + m.w + 1; x++) {
      if (x > lx + 2 && r() < 0.16) y += r() < 0.5 && y > ly + m.base + 1 ? -1 : y < ly + m.base + 3 ? 1 : 0;
      if (r() < 0.07) continue;
      a.px(x, Math.min(h - 2, y), GRAPHITE, r() < 0.3 ? 150 : 220);
    }
  }
  return a;
}
