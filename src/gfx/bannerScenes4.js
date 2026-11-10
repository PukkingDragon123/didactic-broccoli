// Backgrounds for the flyer-style display cards (src/figures/flyer.js), 640 px wide: a themed place painted flat and
// graphic, the way a capsule-toy flyer sets its product photo. Painters take (p, K, s, h): the Pix, banner.js's pixel
// helpers, the series and the height of the scene area.
import { FLYER_TEXT } from '../figures/flyer.js';

// text the sculpted figures print on themselves (src/figures/sets) and the flyers draw: preloaded with the banner glyphs
export const SCENE_TEXT = `${FLYER_TEXT}安全第一げすい注意一九六四三分ほたる印牛乳まきばあけぐちふわふわたまごながいぬビスケットめん`;

const W = 640, HX = 392; // (HX: where the hero stands)
/** Rays from (cx, cy): every other wedge lightened (alpha a). */
function rays(p, cx, cy, y0, y1, n, c, a) {
  for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) {
    const k = Math.floor(((Math.atan2(y - cy, x - cx) + Math.PI) / (Math.PI * 2)) * n * 2);
    if (k % 2 === 0) p.px(x, y, c, a);
  }
}
/** Halftone dots thinning out from a corner. */
function halftone(p, cx, cy, r, c) {
  for (let y = Math.max(0, cy - r); y < cy + r; y += 6) for (let x = Math.max(0, cx - r); x < Math.min(W, cx + r); x += 6) {
    const d = Math.hypot(x - cx, y - cy) / r;
    if (d >= 1) continue;
    const s = d < 0.35 ? 2 : d < 0.7 ? 1 : 0, ox = (Math.round(y / 6) % 2) * 3;
    p.rect(x + ox, y, s + 1, s + 1, c);
  }
}

export const FLYER_SCENES = {
  plain(p, K, s, h) {
    const bg = K.hex(s.card.bg), ac = K.hex(s.card.accent);
    p.gradient(0, 0, W, h, K.mixC(bg, 0xffffff, 0.4), K.mixC(bg, ac, 0.2));
    rays(p, HX, h - 80, 0, h, 14, 0xffffff, 70);
    p.rect(0, h - 60, W, 60, K.mixC(bg, 0x5a4a3a, 0.3));
  },

  /** A back lane on a clear afternoon: block wall, poles and wires, the road with its white line. */
  lane(p, K, s, h) {
    const SKY = 0xbfe2f0, HAZE = 0xfbeccc, WALL = 0xcbc6ba, ROAD = 0x79757f, POLE = 0x5a6478;
    p.gradient(0, 0, W, 200, SKY, HAZE);
    rays(p, HX, 250, 0, 200, 16, 0xffffff, 64);
    halftone(p, 0, 150, 120, K.mixC(SKY, 0xffffff, 0.5));
    // roofs behind the wall, by rule: a run of houses of stepping heights
    let x = -10;
    for (let k = 0; x < W; k++) {
      const w = 54 + (k * 37) % 46, top = 150 + (k * 53) % 34, c = k % 2 ? 0xa9c2d0 : 0x9fb6c8;
      for (let j = 0; j < 14; j++) p.rect(x - 4 + j, top - 14 + j, w + 8 - j * 2 < 0 ? 0 : w + 8 - j * 2, 1, K.shadeC(c, 0.9));
      p.rect(x, top, w, 60, c);
      for (let i = 8; i < w - 12; i += 18) { p.rect(x + i, top + 10, 9, 8, K.mixC(c, 0xffffff, 0.45)); p.rect(x + i + 4, top + 10, 1, 8, c); }
      x += w + 6;
    }
    // poles and their wires
    const pole = (px, top) => {
      p.rect(px, top, 5, 210 - top, POLE); p.rect(px + 4, top, 1, 210 - top, K.shadeC(POLE, 0.8));
      p.rect(px - 16, top + 10, 37, 3, POLE); p.rect(px - 12, top + 22, 29, 3, POLE);
      for (const dx of [-14, -4, 12, 18]) p.rect(px + dx, top + 6, 2, 4, 0xf2efe6);
      p.rect(px + 7, top + 34, 9, 14, K.shadeC(POLE, 1.25)); p.rect(px + 7, top + 34, 9, 2, POLE);
    };
    pole(566, 34); pole(28, 70);
    for (const [y0, y1, sag] of [[44, 80, 22], [56, 92, 26], [40, 76, 18]]) for (let i = 0; i <= 538; i++) { const t = i / 538; p.px(566 - i, Math.round(y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag), POLE); }
    // the block wall
    p.rect(0, 196, W, 70, WALL); p.rect(0, 192, W, 5, K.mixC(WALL, 0xffffff, 0.35)); p.rect(0, 197, W, 1, K.shadeC(WALL, 0.8));
    for (let j = 0; j < 4; j++) { p.rect(0, 212 + j * 16, W, 1, K.shadeC(WALL, 0.86)); for (let i = (j % 2) * 20; i < W; i += 40) p.rect(i, 198 + j * 16, 1, 15, K.shadeC(WALL, 0.86)); }
    for (let i = 0; i < W; i += 3) { const m = (i * 7) % 11; if (m < 5) p.rect(i, 264 - m, 2, m + 1, 0x86a062); }
    // a cat on the wall, minding its own business
    const cx = 250, cy = 178;
    p.rect(cx, cy, 16, 14, 0x4a4450); p.rect(cx + 2, cy - 8, 11, 9, 0x4a4450); p.rect(cx + 2, cy - 11, 3, 4, 0x4a4450); p.rect(cx + 10, cy - 11, 3, 4, 0x4a4450);
    p.rect(cx + 16, cy + 8, 9, 3, 0x4a4450); p.rect(cx + 23, cy + 2, 3, 8, 0x4a4450); p.rect(cx + 5, cy - 5, 1, 1, 0xf2e14a); p.rect(cx + 9, cy - 5, 1, 1, 0xf2e14a);
    // the road
    p.gradient(0, 266, W, h - 266, K.mixC(ROAD, 0xffffff, 0.08), K.shadeC(ROAD, 0.92));
    p.rect(0, 266, W, 2, K.shadeC(ROAD, 0.7));
    for (let j = 270; j < h; j += 3) for (let i = (j * 5) % 17; i < W; i += 17) p.px(i, j, K.mixC(ROAD, 0xffffff, 0.18));
    p.rect(0, 284, W, 3, 0xe9e5da);
    for (let i = 0; i < W; i += 9) if ((i * 3) % 7 < 2) p.rect(i, 284, 4, 1, ROAD);
    for (let y = -9; y <= 9; y++) for (let xx = -30; xx <= 30; xx++) { const d = (xx * xx) / 900 + (y * y) / 81; if (d <= 1) p.px(590 + xx, 318 + y, d > 0.74 ? 0x4e4a54 : (xx + y * 3) % 6 === 0 ? 0x6a6672 : 0x5a5660); }
  },

  /** A noodle counter: tiled wall, the split curtain, the worn wooden top. */
  counter(p, K, s, h) {
    const TILE = 0xf7ead0, WOOD = 0xc99058, NAVY = 0x2e426a;
    p.rect(0, 0, W, 256, TILE);
    for (let y = 0; y < 256; y += 20) p.rect(0, y, W, 1, K.shadeC(TILE, 0.9));
    for (let y = 0; y < 256; y += 20) for (let x = (Math.round(y / 20) % 2) * 20; x < W; x += 40) { p.rect(x, y, 1, 20, K.shadeC(TILE, 0.9)); p.rect(x + 1, y + 1, 18, 1, K.mixC(TILE, 0xffffff, 0.5)); }
    rays(p, HX, 262, 40, 256, 12, 0xfff6dc, 110);
    // steam off the hero
    for (const [sx, sy, r] of [[300, 150, 16], [470, 110, 20], [500, 180, 14], [262, 96, 12]]) for (let a = 0; a < 5.4; a += 0.05) { const rr = r * (1 - a / 9); p.rect(Math.round(sx + Math.cos(a) * rr), Math.round(sy - a * 5 + Math.sin(a) * rr * 0.6), 2, 2, 0xffffff, 190); }
    // the curtain
    for (let k = 0; k < 6; k++) {
      const x0 = k * 107 - 1;
      p.rect(x0, 0, 104, 30, NAVY); p.rect(x0, 30, 104, 2, K.shadeC(NAVY, 0.7));
      for (let i = 8; i < 100; i += 22) for (let a = 0; a < Math.PI; a += 0.12) p.px(x0 + i + 8 + Math.round(Math.cos(a) * 8), 24 - Math.round(Math.sin(a) * 7), 0xf3ecdc);
    }
    p.rect(0, 0, W, 4, 0x6a4a34);
    // the counter
    p.rect(0, 256, W, h - 256, WOOD); p.rect(0, 256, W, 3, K.mixC(WOOD, 0xffffff, 0.4)); p.rect(0, 259, W, 1, K.shadeC(WOOD, 0.75));
    for (let y = 266; y < h; y += 9) for (let x = (y * 13) % 61; x < W; x += 61) p.rect(x, y, 26 + (x % 17), 1, K.shadeC(WOOD, 0.86));
    for (const y of [286, 312]) p.rect(0, y, W, 1, K.shadeC(WOOD, 0.7));
    // chopsticks in a pot, a shaker
    p.rect(586, 224, 26, 40, 0x7a3a2c); p.rect(586, 224, 26, 3, 0x9a5240); p.rect(608, 227, 4, 37, 0x5f2a20);
    for (const [dx, t] of [[3, 196], [8, 190], [14, 200], [19, 193]]) { p.rect(586 + dx, t, 2, 228 - t, 0xe9d6a4); p.rect(586 + dx, t, 2, 3, 0xb93a2c); }
    p.rect(548, 240, 14, 24, 0xf3ecdc); p.rect(550, 234, 10, 6, 0xd8382c); p.rect(548, 250, 14, 6, 0xd8382c); p.rect(559, 240, 3, 24, 0xd9cfbc);
  },

  /** A sideboard at home: striped paper, a lace mat, a checked cloth. */
  shelf(p, K, s, h) {
    const PA = 0xfdf3de, PB = 0xdfeedd, CLOTH = 0x5f9fd8;
    for (let x = 0; x < W; x++) p.rect(x, 0, 1, 262, Math.floor(x / 20) % 2 ? PA : PB);
    for (let y = 14; y < 262; y += 28) for (let x = 10 + (Math.round(y / 28) % 2) * 20; x < W; x += 40) { p.rect(x - 1, y, 3, 1, 0xf2a4b4); p.rect(x, y - 1, 1, 3, 0xf2a4b4); }
    // the lace mat behind the hero
    for (let y = -128; y <= 128; y++) for (let x = -128; x <= 128; x++) {
      const d = Math.hypot(x, y), a = Math.atan2(y, x), edge = 116 + Math.round(Math.abs(Math.sin(a * 12)) * 10);
      if (d > edge) continue;
      const hole = d > 84 && d < 108 && Math.abs(Math.sin(a * 24)) > 0.55 && Math.abs(d - 96) < 8;
      if (!hole && 200 + y < 262) p.px(HX + x, 200 + y, d > edge - 3 ? 0xe8e2d2 : 0xfffdf6);
    }
    rays(p, HX, 200, 100, 262, 18, 0xfff4c8, 90);
    // twinkles
    for (const [x, y, k] of [[262, 130, 3], [520, 216, 2], [540, 250, 3], [26, 216, 2], [236, 244, 2]]) K.twinkle(p, x, y, k);
    // the cloth
    p.rect(0, 262, W, h - 262, 0xfdfbf4);
    for (let y = 262; y < h; y++) for (let x = 0; x < W; x++) { const a = Math.floor(x / 19) % 2, b = Math.floor((y - 262) / 19) % 2; if (a && b) p.px(x, y, CLOTH); else if (a || b) p.px(x, y, K.mixC(CLOTH, 0xffffff, 0.55)); }
    p.rect(0, 262, W, 2, K.shadeC(CLOTH, 0.7)); p.rect(0, 264, W, 2, 0xffffff, 120);
  },
};
