// The menu's paper tags: manila price tags cut with a stepped point, a punched hole with its reinforcement ring (the twine
// runs through it), the label in Alagard ink and a price-style note pencilled in red on the right. No icons: the type
// carries it. Three weights, so the strand reads at a glance:
//   primary    (Continue; New Game on a fresh save) a tall cream ticket, the label at twice the size, a line of small
//              print under it (the note ringed in red pen, then a few words); as wide as its words need
//   secondary  the manila tags
//   tertiary   (Settings, Credits) short kraft tags
// Painted texel by texel (src/menu/pixel.js) in two states: plain, and "picked" (a red-pen tick after the label and a
// wobbly graphite underline). Hover feedback is never a glow: the tag swings, lifts a texel, gets the pencil marks.
//   tagSpec(item, { compact }) -> { w, h, k }     paintTag({ label, note, sub, k, w, h, stock, seed, hot, ring, dog }) -> art
import { art, textMask, mask5, grain, rng, hex, shade } from './pixel.js';

export const STOCK = {
  manila: { base: [226, 200, 140], edge: [92, 64, 38], ring: [242, 224, 178] },
  note: { base: [246, 226, 132], edge: [96, 74, 30], ring: [252, 240, 186] },
  cream: { base: [240, 231, 206], edge: [80, 64, 52], ring: [252, 247, 232] },
  pink: { base: [240, 212, 208], edge: [120, 60, 58], ring: [250, 232, 228] },
  kraft: { base: [203, 166, 112], edge: [74, 50, 30], ring: [228, 202, 156] },
};
const RED = hex(0xc8322c), INKC = hex(0x241a1e), INK2 = hex(0x5e5046), GRAPHITE = [86, 84, 92];
export const HOLE = { x: 6, r: 2 }; // the punched hole's centre column (texels) and radius
const LEFT = 17, RIGHT = 9; // where the label starts, the margin after it

/** A mask shown at k texels per font pixel (the primary tag's big label). */
function scaled(m, k) { return k === 1 ? m : { w: m.w * k, h: m.h * k, base: m.base * k, at: (x, y) => x >= 0 && y >= 0 && m.at(Math.floor(x / k), Math.floor(y / k)) }; }
/** The primary tag's small print: its note, then a few words. */
const small = (it) => [it.note, it.sub].filter(Boolean).join('  ');

/** A tag's own size for an item: { w, h (texels), k (label scale) }. compact: no notes, no big ticket (small screens). */
export function tagSpec(it, { compact = false } = {}) {
  const k = it.primary && !compact ? 2 : 1;
  const lw = textMask(it.label).w * k;
  if (k === 2) return { w: LEFT + Math.max(lw + 12, mask5(small(it)).w + 4) + RIGHT, h: 44, k };
  const nw = !compact && it.note ? mask5(it.note).w + 12 : 0;
  return { w: LEFT + lw + nw + RIGHT, h: 20, k };
}

export function paintTag(o) {
  const st = STOCK[o.stock || 'manila'];
  const w = o.w, h = o.h || 22, k = o.k || 1, cut = h > 30 ? 9 : 6;
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
  // the label, in ink (the big ticket's sits high, over its line of small print)
  const m = scaled(textMask(o.label), k);
  const lx = LEFT;
  const ly = k === 2 ? 4 : Math.round((h - m.base) / 2) - 1 + (m.h - m.base > 2 ? 0 : 1);
  a.mask(m, lx, ly, INKC);
  if (k === 2) {
    // the small print under it: the note in red pen (ringed), the rest in soft ink
    const y0 = h - 11, n = o.note ? mask5(o.note) : null;
    let x = lx + (n ? 2 : 0);
    if (n) {
      a.mask(n, x, y0, RED);
      for (let i = x - 2; i <= x + n.w + 1; i++) { if (r() < 0.92) a.px(i, y0 - 2, RED); if (r() < 0.92) a.px(i, y0 + 8, RED); }
      for (let j = y0 - 1; j <= y0 + 7; j++) { a.px(x - 3, j, RED); a.px(x + n.w + 2, j, RED); }
      x += n.w + 7;
    }
    if (o.sub) a.mask(mask5(o.sub), x, y0, INK2);
  } else if (o.note) {
    // the note, pencilled in red pen on the right like a price
    const n = mask5(o.note), nx = w - 6 - n.w, ny = Math.floor((h - 7) / 2);
    a.mask(n, nx, ny, RED);
  }
  // picked: a red-pen tick after the label and a graphite underline that wobbles
  if (o.hot) {
    const tx = lx + m.w + 2 + 2 * k, ty = ly + m.base - 7 * k;
    const tick = [[0, 3], [1, 4], [1, 3], [2, 5], [2, 4], [3, 4], [3, 3], [4, 2], [4, 1], [5, 0], [5, 1], [6, -1], [6, 0], [7, -2]];
    for (const [x, y] of tick) a.rect(tx + x * k, ty + (y + 2) * k, k, k, RED);
    let y = ly + m.base + 2;
    for (let x = lx - 1; x <= lx + m.w + 1; x++) {
      if (x > lx + 2 && r() < 0.16) y += r() < 0.5 && y > ly + m.base + 1 ? -1 : y < ly + m.base + 3 ? 1 : 0;
      if (r() < 0.07) continue;
      for (let j = 0; j < k; j++) a.px(x, Math.min(h - 2, y + j), GRAPHITE, r() < 0.3 ? 150 : 220);
    }
  }
  return a;
}

// ------------------------------------------------------------------ the itch.io tag
// A small pink tag hung off the Wardrobe tag: two lines in the 5x7 font, "FOLLOW ON ITCH.IO" in ink and "FREE DUCK HEAD"
// in red pen. Words only. Same texel scale as the strand (it's an aside, not a menu item).
export function paintItchTag({ hot = false, seed = 99 } = {}) {
  const l1 = mask5('FOLLOW ON ITCH.IO'), l2 = mask5('FREE DUCK HEAD');
  const w = 11 + Math.max(l1.w, l2.w) + 6, h = 22, st = STOCK.pink, cut = 5;
  const a = art(w, h);
  const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h && x >= cut - y && x >= cut - (h - 1 - y);
  grain(a, 0, 0, w, h, st.base, seed, inside);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!inside(x, y)) continue;
    if (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)) a.px(x, y, st.edge);
  }
  // the punched hole the thread goes through
  for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) { const d = Math.hypot(x, y); if (d <= 1.1) a.clear(4 + x, 3 + y); else if (d <= 2) a.px(4 + x, 3 + y, st.ring); }
  a.mask(l1, 11, 3, INKC);
  a.mask(l2, 11, 12, RED);
  if (hot) for (let x = 10; x < 11 + l2.w + 1; x++) a.px(x, 20, GRAPHITE, x % 5 ? 220 : 120);
  return a;
}
