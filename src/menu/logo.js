// The title: a Shōwa enamel shop sign (ホーロー看板) hanging over the lane on two wires. Deep red enamel with a navy
// rim and a cream pin-line, GACHA / GARAGE hand-lettered in Alagard (a 1-texel ink outline and a hard drop shade, the
// letters a hair uneven like a sign painter's), the katakana ガチャ・ガレージ under a rule, screw heads in the corners
// and chips where the enamel has knocked off down to rusty iron.
// All hand-placed texels; shown at a whole-number scale. paintLogo() -> { art, w, h, pivot: [x, y] (texels) }
import { art, textMask, kanaMask, maskOf, rng, hex, INK } from './pixel.js';

const RED = hex(0xb3262a), RED_LO = hex(0x8c1a20), RED_HI = hex(0xc8383a);
const NAVY = hex(0x1f2a52), NAVY_HI = hex(0x34457a);
const CREAM = hex(0xf6e8c8), CREAM_LO = hex(0xd9c49c);
const IRON = hex(0x2a2a34), RUST = hex(0x7e3e22), RUST2 = hex(0xa25a2c);
const STEEL = hex(0xa8aeb8), STEEL_LO = hex(0x6a707c);
const WIRE = hex(0x3a3640);

/** Per-letter masks of a word in Alagard, laid out with extra tracking and a little hand-lettered wobble. */
function lettered(word, track, seed) {
  const r = rng(seed);
  const glyphs = [...word].map((ch) => textMask(ch, 'Alagard', 16));
  // every capital sits on the same baseline: use each glyph's own baseline offset
  const base = Math.max(...glyphs.map((m) => m.base));
  const below = Math.max(...glyphs.map((m) => m.h - m.base));
  const H = base + below + 2;
  let W = glyphs.reduce((s, m) => s + m.w, 0) + track * (glyphs.length - 1);
  const lit = new Uint8Array(W * H);
  let x = 0;
  glyphs.forEach((m, i) => {
    // a painter's hand: the odd letter one texel high or low (never the first or last, which hold the line)
    const dy = i > 0 && i < glyphs.length - 1 && r() < 0.35 ? (r() < 0.5 ? -1 : 1) : 0;
    const y0 = base - m.base + 1 + dy;
    for (let j = 0; j < m.h; j++) for (let k = 0; k < m.w; k++) if (m.at(k, j) && y0 + j >= 0 && y0 + j < H) lit[(y0 + j) * W + x + k] = 1;
    x += m.w + track;
  });
  return maskOf(W, H, lit);
}

/** A round-cornered box test (stepped corners of radius r texels). */
function inBoard(x, y, w, h, r) {
  const cx = x < r ? r : x > w - 1 - r ? w - 1 - r : x, cy = y < r ? r : y > h - 1 - r ? h - 1 - r : y;
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.5;
}

export function paintLogo() {
  const L1 = lettered('GACHA', 2, 7), L2 = lettered('GARAGE', 2, 11);
  const kana = kanaMask('ガチャ・ガレージ');
  const textW = Math.max(L1.w, L2.w, kana.w);
  const PADX = 9, RIM = 3;
  const BW = textW + PADX * 2 + RIM * 2;
  const gap = 2;
  const BH = RIM + 5 + L1.h + gap + L2.h + 4 + 1 + 3 + kana.h + 5 + RIM;
  const WIRE_H = 9; // wires above the board (they run off the top of the picture)
  const W = BW + 4, H = WIRE_H + BH + 4;
  const a = art(W, H);
  const r = rng(1999);
  const bx = 0, by = WIRE_H;

  // ---- the hanging wires and their eyelets
  const eyes = [Math.round(BW * 0.18), Math.round(BW * 0.82)];
  for (const ex of eyes) {
    for (let y = 0; y < WIRE_H + 2; y++) a.px(bx + ex + (y < 3 ? 0 : 0), y, WIRE);
  }

  // ---- the board: ink edge, navy rim, cream pin-line, red field (stepped round corners)
  const R = 4;
  const hard = (x, y) => inBoard(x, y, BW, BH, R);
  // hard shadow of the board (drawn first, offset down-right)
  for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) if (hard(x, y)) a.px(bx + x + 3, by + y + 3, INK, 90);
  for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) {
    if (!hard(x, y)) continue;
    const edge = !hard(x - 1, y) || !hard(x + 1, y) || !hard(x, y - 1) || !hard(x, y + 1);
    const d = Math.min(x, y, BW - 1 - x, BH - 1 - y);
    let c;
    if (edge) c = INK;
    else if (d < RIM) c = d === 1 && (x + y) % 7 === 0 ? NAVY_HI : NAVY;
    else if (d === RIM) c = CREAM;
    else c = RED;
    a.px(bx + x, by + y, c);
  }
  // a faint enamel sheen: one lighter streak low across the field, broken up (pixel, not a gradient)
  for (let x = RIM + 4; x < BW - RIM - 4; x++) if ((x * 7) % 11 < 6) a.px(bx + x, by + RIM + 2, RED_HI);
  // the field's lower edge is a shade darker where years of rain ran down
  for (let x = RIM + 1; x < BW - RIM - 1; x++) if (r() < 0.6) a.px(bx + x, by + BH - RIM - 2, RED_LO);

  // ---- lettering: drop shade, ink outline, cream face
  const t1x = bx + Math.round((BW - L1.w) / 2), t1y = by + RIM + 5;
  const t2x = bx + Math.round((BW - L2.w) / 2), t2y = t1y + L1.h + gap;
  for (const [m, x, y] of [[L1, t1x, t1y], [L2, t2x, t2y]]) {
    // the drop shade: the letter shape pushed down-right 2 texels, in dark red with its own ink rim
    const sh = { ...m, at: (i, j) => m.at(i - 1, j - 2) || m.at(i - 2, j - 2) || m.at(i - 1, j - 1) };
    a.outline(sh, x, y, INK);
    a.mask(sh, x, y, RED_LO);
    a.outline(m, x, y, INK);
    a.mask(m, x, y, CREAM);
    // a single light texel on the top of each stroke where the brush started (sign-writer's flick)
    for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) if (m.at(i, j) && !m.at(i, j - 1) && !m.at(i - 1, j) && r() < 0.5) a.px(x + i, y + j, hex(0xfff8e6));
    // and a texel of shade along the bottoms of strokes
    for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) if (m.at(i, j) && !m.at(i, j + 1) && r() < 0.35) a.px(x + i, y + j, CREAM_LO);
  }

  // ---- a cream rule, then the katakana
  const ry = t2y + L2.h + 4;
  const rx0 = bx + RIM + PADX - 2, rx1 = bx + BW - RIM - PADX + 2;
  for (let x = rx0; x <= rx1; x++) a.px(x, ry, (x - rx0) % 5 === 4 ? RED_LO : CREAM_LO);
  const kx = bx + Math.round((BW - kana.w) / 2), ky = ry + 3;
  a.mask({ ...kana, at: (i, j) => kana.at(i - 1, j - 1) }, kx, ky, RED_LO);
  a.mask(kana, kx, ky, CREAM);

  // ---- chips: the enamel knocked off at the rim down to iron, a little rust bleeding out
  const chips = [[0.07, 0], [0.55, 0], [0.93, 0.3], [0.02, 0.7], [0.4, 1], [0.86, 1], [0.97, 0.75]];
  for (const [u, v] of chips) {
    const cx = Math.round(u * (BW - 1)), cy = Math.round(v * (BH - 1));
    const n = 2 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const x = Math.max(1, Math.min(BW - 2, cx + Math.floor(r() * 4) - 1)), y = Math.max(1, Math.min(BH - 2, cy + Math.floor(r() * 3) - 1));
      if (!hard(x, y) || Math.min(x, y, BW - 1 - x, BH - 1 - y) > RIM) continue;
      a.px(bx + x, by + y, k === 0 ? IRON : r() < 0.5 ? RUST : IRON);
      if (r() < 0.5 && hard(x, y + 1)) a.px(bx + x, by + y + 1, RUST2);
    }
  }

  // ---- screw heads in the rim and the eyelets for the wires
  const screw = (x, y) => { a.px(x, y, STEEL); a.px(x + 1, y, STEEL_LO); a.px(x, y + 1, STEEL_LO); a.px(x + 1, y + 1, INK); };
  for (const [x, y] of [[RIM - 1, RIM - 1], [BW - RIM - 1, RIM - 1], [RIM - 1, BH - RIM - 1], [BW - RIM - 1, BH - RIM - 1]]) screw(bx + x, by + y);
  for (const ex of eyes) {
    a.px(bx + ex - 1, by - 1, STEEL); a.px(bx + ex + 1, by - 1, STEEL); a.px(bx + ex, by - 2, STEEL); a.px(bx + ex, by, INK);
    a.px(bx + ex - 1, by, STEEL_LO); a.px(bx + ex + 1, by, STEEL_LO);
  }

  return { art: a, w: W, h: H, board: { x: bx, y: by, w: BW, h: BH }, pivot: [Math.round(BW / 2), 0] };
}
