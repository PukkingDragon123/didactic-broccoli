// Pixel-art wall signage for the old Japanese shop (Shōwa 駄菓子屋): enamel tin signs (ホーロー看板),
// a hanging calendar, wooden price tags, a noren curtain, a kaiju poster and the big shop signboard.
// All brands are invented. Each entry: { w, h, paint(p) } — p is a Pix of w×h; every pixel is painted
// (opaque, including the rolled metal edge). Displayed on walls with nearest filtering at ~4–5 mm / px.
// Text uses the DotGothic16 pixel font via p.text (16px is the native grid; complex kanji need ≥20px).

// ------------------------------------------------------------------ helpers
const INK = 0x1a1612, WHITE = 0xf6f1e4, CREAM = 0xf2e8cc, RED = 0xc8281e, REDD = 0x8e1a14;
const NAVY = 0x1c2a58, GOLD = 0xe6b844, GOLDD = 0xa87a26, RIM = 0x1c2030;

/** Deterministic hash → [0,1). */
function H(a, b = 0, c = 0) {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul((c | 0) + 7, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const rgb = (c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
/** Mix two hex colours. */
function mixc(a, b, t) {
  const A = rgb(a), B = rgb(b);
  return (Math.round(A[0] + (B[0] - A[0]) * t) << 16) | (Math.round(A[1] + (B[1] - A[1]) * t) << 8) | Math.round(A[2] + (B[2] - A[2]) * t);
}
const shadeC = (c, f) => { const [r, g, b] = rgb(c); return (Math.min(255, Math.round(r * f)) << 16) | (Math.min(255, Math.round(g * f)) << 8) | Math.min(255, Math.round(b * f)); };

/** Filled rounded rectangle. */
function rrect(p, x, y, w, h, r, c) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const dx = Math.max(0, r - i - 0.5, i + 0.5 - (w - r)), dy = Math.max(0, r - j - 0.5, j + 0.5 - (h - r));
    if (dx * dx + dy * dy <= r * r) p.px(x + i, y + j, c);
  }
}
/** Ring (circle outline) of thickness t. */
function ring(p, cx, cy, r, t, c) {
  for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) {
    const d = Math.hypot(x, y);
    if (d <= r + 0.35 && d > r - t + 0.35) p.px(cx + x, cy + y, c);
  }
}
/** Horizontal text centred on cx. */
const ctext = (p, s, cx, y, size, color, o = {}) => p.text(s, cx, y, { size, color, align: 'center', ...o });

const SMALL = 'ャュョッァィゥェォゃゅょっ';
/** Vertical text (one glyph per line) centred on cx; small kana sit top-right as in real tategaki. */
function vtext(p, str, cx, y, size, color, o = {}) {
  const step = o.step ?? size;
  [...str].forEach((ch, i) => {
    const small = SMALL.includes(ch);
    p.text(ch, cx + (small ? Math.round(size * 0.14) : 0), y + i * step - (small ? Math.round(size * 0.24) : 0), { size, color, align: 'center', outline: o.outline, shadow: o.shadow });
  });
}

/** Enamel plate: flat colour, a 1px dark rolled rim with rounded corners, optional inner pinstripe. */
function plate(p, bg, { stripe = null, inset = 2 } = {}) {
  const { w, h } = p;
  p.fill(bg);
  p.frame(0, 0, w, h, RIM);
  for (const [x, y] of [[1, 1], [w - 2, 1], [1, h - 2], [w - 2, h - 2]]) p.px(x, y, RIM);
  for (const [x, y] of [[2, 1], [1, 2], [w - 3, 1], [w - 2, 2], [1, h - 3], [2, h - 2], [w - 2, h - 3], [w - 3, h - 2]]) p.px(x, y, mixc(bg, RIM, 0.5));
  if (stripe !== null) p.frame(inset + 1, inset + 1, w - 2 * (inset + 1), h - 2 * (inset + 1), stripe);
}
/** Screw hole punched through the enamel: dark core, lit lower-right lip. */
function screw(p, x, y, bg) {
  p.px(x, y, 0x0e0f14); p.px(x + 1, y, 0x262830); p.px(x, y + 1, 0x262830); p.px(x + 1, y + 1, 0x3c3e48);
  p.px(x - 1, y, mixc(bg, 0x000000, 0.25)); p.px(x, y - 1, mixc(bg, 0x000000, 0.25));
  p.px(x + 2, y + 1, mixc(bg, 0xffffff, 0.35)); p.px(x + 1, y + 2, mixc(bg, 0xffffff, 0.35));
}
function screws(p, bg, m = 3) {
  const { w, h } = p;
  for (const [x, y] of [[m, m], [w - m - 2, m], [m, h - m - 2], [w - m - 2, h - m - 2]]) screw(p, x, y, typeof bg === 'function' ? bg(x, y) : bg);
}
// deliberate enamel chips: K = bare iron, r = rust, o = rust halo (blended with the enamel)
const CHIPS = [
  ['.oo.', 'oKro', '.or.'],
  ['oo..', 'oKKo', '.orK', '..o.'],
  ['.o', 'oK', 'or'],
  ['.oo', 'oKr', '.o.'],
];
function chip(p, x, y, k = 0) {
  CHIPS[k % CHIPS.length].forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === 'K') p.px(x + i, y + j, 0x22242c);
    else if (ch === 'r') p.px(x + i, y + j, 0x7a3a1c);
    else if (ch === 'o') p.px(x + i, y + j, 0x9a5228, 120);
  }));
}
/** Rust run weeping down from a screw hole. */
function rustRun(p, x, y, len) {
  for (let k = 0; k < len; k++) p.px(x + (k > len * 0.6 ? 1 : 0), y + k, 0x8a4a24, Math.round(150 * (1 - k / len)));
}
/** Glossy enamel sheen: a soft diagonal band + a lit top edge. */
function sheen(p, x0 = 2, y0 = 2, w = p.w - 4, h = p.h - 4) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const d = (x - x0) * 0.9 + (y - y0) * 0.45 - Math.min(w, h) * 0.55;
    if (d > 0 && d < 3) p.px(x, y, 0xffffff, 34);
    else if (d >= 3 && d < 4.5) p.px(x, y, 0xffffff, 16);
  }
  for (let x = x0; x < x0 + w; x++) p.px(x, y0 - 1, 0xffffff, 40);
}
/** Wood board with long wavy grain bands (2–3 tones) + a few dark grain lines. */
function woodBoard(p, x0, y0, w, h, base, s = 1, vertical = false) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const a = vertical ? y : x, b = vertical ? x : y;
    const t = b + 1.8 * Math.sin(a * 0.05 + b * 0.21 + s) + 0.9 * Math.sin(a * 0.13 + s * 2.3);
    const band = Math.floor(t / 3.2), f = t / 3.2 - band;
    const k = H(band, s, 3);
    let c = k < 0.3 ? shadeC(base, 0.9) : k > 0.75 ? shadeC(base, 1.08) : base;
    if (f < 0.16 && k > 0.45) c = shadeC(base, 0.76);
    p.px(x, y, c);
  }
}
/** Knot in a wood board. */
function knot(p, cx, cy, rx, ry, base) {
  for (let y = -ry - 1; y <= ry + 1; y++) for (let x = -rx - 2; x <= rx + 2; x++) {
    const d = (x / (rx + 0.5)) ** 2 + (y / (ry + 0.5)) ** 2;
    if (d <= 0.35) p.px(cx + x, cy + y, shadeC(base, 0.6));
    else if (d <= 1) p.px(cx + x, cy + y, shadeC(base, 0.78));
    else if (d <= 1.6 && (x + y) % 2 === 0) p.px(cx + x, cy + y, shadeC(base, 0.86));
  }
}
const DIG = {
  0: ['###', '#.#', '#.#', '#.#', '###'], 1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['##.', '..#', '.#.', '#..', '###'],
  3: ['##.', '..#', '.#.', '..#', '##.'], 4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '##.', '..#', '##.'],
  6: ['.##', '#..', '###', '#.#', '###'], 7: ['###', '..#', '.#.', '.#.', '.#.'], 8: ['###', '#.#', '###', '#.#', '###'],
  9: ['###', '#.#', '###', '..#', '##.'],
};
/** Tiny 3×5 digits (for calendars and price tags). Returns width. */
function digits(p, str, x, y, c) {
  [...str].forEach((d, i) => p.sprite(DIG[d], { '#': c }, x + i * 4, y));
  return str.length * 4 - 1;
}

// ------------------------------------------------------------------ sprites
const CRANE = [
  'KK....................',
  '.KWW..............KK..',
  '..WWW...........WWK...',
  '...WWWW.......WWWW....',
  '....WWWWW...WWWWW.....',
  '.....WWWWWWWWWWW....RK',
  '......WWWWWWWWW....WWY',
  '.......WWWWWWWWWWWWK..',
  '......KKWWWWWW........',
  '.....KK..WW...........',
  '...KK......W..........',
  '..K.........W.........',
];
const RAMUNE = [
  '...BBBB...',
  '...gGGg...',
  '...gWWg...',
  '...gWWg...',
  '..gGggGg..',
  '..GGggGG..',
  '.GGGGGGGG.',
  'GGGGGGGGGG',
  'GgWGGGGGGG',
  'GgWGGGGGGG',
  'GGGGGGGGGG',
  'GRRRRRRRRG',
  'GRWWWWWWRG',
  'GRRRRRRRRG',
  'GGGGGGGGGG',
  'GgGGGGGGGG',
  'GgGGGGGGGG',
  '.GGGGGGGG.',
];
const TONIC = [
  '...YYYY...',
  '...KKKK...',
  '...bbbb...',
  '...bbbb...',
  '..bbbbbb..',
  '.bbbbbbbb.',
  'bbbbbbbbbb',
  'bWWWWWWWWb',
  'bWRRRRRRWb',
  'bWRYRRRRWb',
  'bWRRYYRRWb',
  'bWRRRYRRWb',
  'bWRRRRYRWb',
  'bWWWWWWWWb',
  'bLbbbbbbbb',
  'bLbbbbbbbb',
  'bbbbbbbbbb',
  '.bbbbbbbb.',
];
const SWALLOW = [
  '.........KK...........',
  '........KKK...........',
  'K......KKKK...........',
  '.K....KKKK............',
  '..K..KKKK.......KK....',
  '...KKKKKKKKKKKKKKKK...',
  '....KKKKKKKKKKKKKRKKKK',
  '...KKKKKKKKKKKWWRRK...',
  '..K..KKKKKWWWWWW......',
  '.K......KKK...........',
  'K.......KKK...........',
  '.........KK...........',
];

// ------------------------------------------------------------------ the art
export const SHOP_ART = {
  // ============================================================ vertical enamel signs (40×120)
  tin_neko_shoyu: {
    w: 40, h: 120,
    paint(p) {
      plate(p, WHITE);
      // red crown band with the hexagon emblem
      p.rect(2, 2, 36, 27, RED);
      p.rect(2, 29, 36, 1, REDD);
      p.circle(20, 15, 11, WHITE);
      ring(p, 20, 15, 11, 1, INK);
      // the brand mark: a tortoise-shell hexagon with 上 inside
      const hx = (r) => [0, 1, 2, 3, 4, 5].map((i) => [20 + Math.cos(i * Math.PI / 3) * r, 15 + Math.sin(i * Math.PI / 3) * r]);
      for (const r of [8, 7]) { const h = hx(r); h.forEach((q, i) => { const n = h[(i + 1) % 6]; p.line(Math.round(q[0]), Math.round(q[1]), Math.round(n[0]), Math.round(n[1]), INK); }); }
      ctext(p, '上', 20, 9, 12, INK);
      ctext(p, '亀甲印', 20, 31, 12, RED);
      // big vertical 醤油
      vtext(p, '醤油', 20, 46, 26, INK, { step: 27 });
      // bottom band: 特級 grade mark
      p.rect(2, 101, 36, 17, RED);
      p.rect(2, 100, 36, 1, REDD);
      ctext(p, '特級', 20, 101, 16, WHITE);
      sheen(p);
      screws(p, (x, y) => (y < 29 || y > 100 ? RED : WHITE));
      chip(p, 33, 60, 0); chip(p, 3, 96, 2); chip(p, 30, 113, 3);
      rustRun(p, 36, 116, 3); rustRun(p, 4, 7, 6);
    },
  },

  tin_gacha_ramune: {
    w: 40, h: 120,
    paint(p) {
      const sky = 0x8ad0f0;
      plate(p, sky, { stripe: WHITE, inset: 2 });
      // red band with white "ガチャ"
      p.rect(3, 3, 34, 16, RED);
      ctext(p, 'ガチャ', 20, 5, 11, WHITE);
      // big ラムネ in deep blue with a white outline
      vtext(p, 'ラムネ', 20, 22, 23, 0x1e4aa0, { outline: WHITE, step: 24 });
      // fizz bubbles down the sides
      for (const [x, y, r] of [[7, 30, 1], [9, 41, 2], [6, 55, 1], [33, 34, 2], [31, 48, 1], [34, 62, 1], [8, 70, 2], [32, 76, 2], [6, 86, 1]]) {
        ring(p, x, y, r, 1, WHITE);
      }
      // bottle + marbles
      p.sprite(RAMUNE, { B: 0x2a6ad8, G: 0x6cc8c0, g: 0x4aa8a4, W: 0xf4fcfc, R: RED }, 15, 96);
      p.circle(8, 110, 2, 0xd8f4f4); p.px(7, 109, WHITE);
      p.circle(32, 108, 2, 0xd8f4f4); p.px(31, 107, WHITE);
      sheen(p, 4, 4, 32, 112);
      screws(p, (x, y) => (y < 20 ? RED : sky), 4);
      chip(p, 2, 50, 2); chip(p, 33, 92, 0); rustRun(p, 35, 117, 2);
    },
  },

  tin_kinzuru_senbei: {
    w: 40, h: 120,
    paint(p) {
      plate(p, NAVY, { stripe: GOLDD, inset: 2 });
      // gold disc with a red-crowned crane
      p.circle(20, 16, 12, GOLD);
      ring(p, 20, 16, 12, 1, GOLDD);
      p.sprite(CRANE, { W: WHITE, K: INK, R: RED, Y: 0xf2d888 }, 9, 10);
      vtext(p, '金鶴', 20, 31, 26, GOLD, { outline: 0x0c1430, step: 27 });
      // white band: せんべい in two rows
      p.rect(5, 89, 30, 26, WHITE);
      p.frame(5, 89, 30, 26, RED);
      ctext(p, 'せん', 20, 90, 12, RED);
      ctext(p, 'べい', 20, 102, 12, RED);
      sheen(p, 4, 4, 32, 112);
      screws(p, NAVY, 4);
      chip(p, 32, 40, 1); chip(p, 4, 76, 3); rustRun(p, 35, 117, 2); rustRun(p, 5, 9, 5);
    },
  },

  tin_genkin: {
    w: 40, h: 120,
    paint(p) {
      const yel = 0xf4c82a;
      plate(p, yel);
      // red side strip with the tagline
      p.rect(28, 2, 10, 116, RED);
      p.rect(27, 2, 1, 116, REDD);
      vtext(p, '元気ドリンク', 33, 6, 10, WHITE, { step: 11 });
      // sunburst rays behind the name
      for (let y = 3; y < 92; y++) for (let x = 2; x < 27; x++) {
        const a = Math.atan2(y - 48, x - 14);
        if (Math.floor((a / Math.PI) * 9 + 9) % 2 === 0) p.px(x, y, 0xf8d860);
      }
      vtext(p, 'ゲンキン', 14, 5, 21, RED, { outline: INK, step: 22 });
      // brown tonic bottle with a lightning label
      p.sprite(TONIC, { Y: 0xf2c230, K: INK, b: 0x5a2a12, W: WHITE, R: RED, L: 0x8a4a24 }, 9, 96);
      p.line(4, 100, 6, 104, INK); p.line(22, 100, 20, 104, INK); // zing lines
      sheen(p, 2, 2, 25, 116);
      screws(p, (x) => (x > 26 ? RED : yel));
      chip(p, 3, 60, 0); chip(p, 30, 98, 2); rustRun(p, 4, 7, 4);
    },
  },

  tin_tsubame: {
    w: 40, h: 120,
    paint(p) {
      const nv = 0x22305e;
      plate(p, nv, { stripe: WHITE, inset: 2 });
      p.circle(20, 15, 11, WHITE);
      ring(p, 20, 15, 11, 1, 0xc8d0e0);
      p.sprite(SWALLOW, { K: nv, R: RED, W: 0xd8dce8 }, 9, 9);
      vtext(p, 'ツバメ', 20, 29, 20, WHITE, { step: 21 });
      p.rect(3, 94, 34, 18, RED);
      p.rect(3, 94, 34, 1, 0xe85a4a);
      ctext(p, '学生服', 20, 97, 11, WHITE);
      sheen(p, 4, 4, 32, 112);
      screws(p, nv, 4);
      chip(p, 31, 54, 3); chip(p, 4, 84, 1); rustRun(p, 35, 117, 2);
    },
  },

  tin_fuji_match: {
    w: 40, h: 120,
    paint(p) {
      plate(p, RED, { stripe: 0xf2d8a0, inset: 2 });
      // white medallion with Mt Fuji
      p.circle(20, 16, 11, 0xcfe8f8);
      for (let y = 18; y <= 27; y++) for (let x = 9; x <= 31; x++) if ((x - 20) ** 2 + (y - 16) ** 2 <= 128) p.px(x, y, 0x9acbe8);
      for (let y = 0; y < 14; y++) {
        const half = 2.5 + y * 0.95;
        for (let x = Math.round(20 - half); x <= Math.round(20 + half); x++) {
          const drip = [0, 2, 1, 3, 0, 2, 1][((x % 7) + 7) % 7];
          const snow = y < 3 + drip;
          if ((x - 20) ** 2 + (9 + y - 16) ** 2 > 121) continue;
          p.px(x, 9 + y, snow ? WHITE : x < 20 - half * 0.3 ? 0x2a4a9a : 0x3a62b8);
        }
      }
      p.circle(27, 10, 2, RED);
      ring(p, 20, 16, 11, 1, INK);
      ctext(p, 'ふじ印', 20, 30, 11, 0xf6e6a8);
      vtext(p, 'マッチ', 20, 46, 22, WHITE, { outline: REDD, step: 23 });
      // tiny match sticks at the bottom
      for (let i = 0; i < 5; i++) { p.rect(9 + i * 5, 111, 1, 5, 0xe8c890); p.rect(9 + i * 5, 109, 1, 2, REDD); p.px(9 + i * 5, 109, INK); }
      sheen(p, 4, 4, 32, 112);
      screws(p, RED, 4);
      chip(p, 32, 70, 0); chip(p, 3, 40, 2); rustRun(p, 4, 7, 5);
    },
  },

  // ============================================================ horizontal enamel signs (120×40)
  tin_tanuki_katori: {
    w: 120, h: 40,
    paint(p) {
      const grn = 0x1e7a46;
      plate(p, grn);
      p.rect(2, 2, 116, 1, 0x2e9a5a); p.rect(2, 37, 116, 1, 0x125a32);
      // cream medallion with a tanuki face, coil swirl behind
      p.circle(19, 20, 14, CREAM);
      for (let a = 0; a < 17; a += 0.08) { const r = 2 + a * 0.7; p.px(Math.round(19 + Math.cos(a) * r), Math.round(20 + Math.sin(a) * r), 0x8ab890); }
      ring(p, 19, 20, 14, 1, INK);
      const fur = 0x8a5a34, dark = 0x3a2416;
      p.circle(12, 10, 3, fur); p.circle(26, 10, 3, fur); p.circle(12, 10, 1, dark); p.circle(26, 10, 1, dark);
      p.circle(19, 20, 9, fur);
      for (const s of [-1, 1]) { p.circle(19 + s * 4, 19, 3, dark); p.circle(19 + s * 4, 18, 1, WHITE); p.px(19 + s * 4, 18, INK); }
      p.circle(19, 24, 3, 0xf0dcb4); p.rect(18, 22, 3, 2, INK);
      p.line(17, 26, 21, 26, dark);
      ctext(p, 'たぬき印', 75, 4, 12, 0xf6e6a8);
      ctext(p, '蚊取線香', 75, 17, 20, WHITE, { outline: 0x0e3a20 });
      sheen(p, 4, 4, 112, 32);
      screws(p, grn, 4);
      chip(p, 112, 22, 0); chip(p, 40, 33, 3); rustRun(p, 115, 37, 2); rustRun(p, 5, 7, 5);
    },
  },

  tin_milk_caramel: {
    w: 120, h: 40,
    paint(p) {
      const yel = 0xf6d860;
      plate(p, yel, { stripe: RED, inset: 2 });
      // cow face badge
      rrect(p, 5, 5, 27, 30, 5, WHITE);
      const cow = 0xfbf8f0;
      p.circle(18, 18, 9, cow);
      p.circle(13, 14, 3, INK); p.circle(24, 22, 2, INK);
      p.rect(8, 9, 3, 2, 0xd8c8a0); p.rect(26, 9, 3, 2, 0xd8c8a0); // horns
      p.px(8, 8, 0xd8c8a0); p.px(28, 8, 0xd8c8a0);
      for (const s of [-1, 1]) { p.px(18 + s * 4, 16, INK); p.px(18 + s * 4, 15, INK); }
      rrect(p, 12, 21, 13, 8, 3, 0xf4a8b0);
      p.px(15, 24, 0xa04a5a); p.px(21, 24, 0xa04a5a);
      p.frame(5, 5, 27, 30, 0xd8c8a0);
      ctext(p, 'ミルク', 75, 4, 12, RED);
      ctext(p, 'キャラメル', 75, 18, 16, 0x6a3418, { outline: WHITE });
      sheen(p, 4, 4, 112, 32);
      screws(p, yel, 4);
      chip(p, 112, 12, 2); chip(p, 70, 34, 1); rustRun(p, 115, 37, 2);
    },
  },

  // ============================================================ calendar (64×96)
  calendar: {
    w: 64, h: 96,
    paint(p) {
      p.fill(0xf8f4ea);
      // tin hanging strip with a hole
      p.rect(0, 0, 64, 4, 0xb8bcc4); p.rect(0, 0, 64, 1, 0xdfe2e8); p.rect(0, 3, 64, 1, 0x8a8e96);
      p.rect(31, 1, 2, 2, 0x2a2a30);
      // picture: Mt Fuji over a lake in summer
      const X0 = 3, Y0 = 6, W = 58, Hh = 33;
      p.gradient(X0, Y0, W, 18, 0x5aa8e8, 0xc8ecff);
      for (const [cx, cy, r] of [[12, 11, 2], [15, 10, 3], [19, 11, 2], [47, 9, 2], [50, 8, 2], [53, 9, 2]]) p.circle(cx, cy, r, 0xfbfdff);
      for (let y = 0; y < 13; y++) {
        const half = 3 + y * 1.8;
        for (let x = Math.round(36 - half); x <= Math.round(36 + half); x++) {
          const snow = y < 4 + ((x * 5) % 4 === 0 ? 2 : (x * 3) % 5 === 0 ? 1 : 0);
          p.px(x, 11 + y, snow ? 0xfbfdff : x < 36 - half * 0.35 ? 0x4a5a98 : 0x5a6cb0);
        }
      }
      p.rect(X0, Y0 + 18, W, 4, 0x4a9a4a); // far shore
      for (let x = X0; x < X0 + W; x += 3) p.px(x, Y0 + 18, 0x3a8a3a);
      p.gradient(X0, Y0 + 22, W, Hh - 22, 0x3a7ac8, 0x2a5aa0); // lake
      for (const [x, y, l] of [[30, 30, 10], [34, 32, 6], [26, 34, 8], [38, 36, 4]]) p.rect(x, y, l, 1, 0x9ad0f0);
      // pine on the left shore
      p.rect(9, 25, 2, 13, 0x5a3a22);
      for (const [x, y, w] of [[6, 13, 7], [5, 17, 10], [3, 21, 13], [2, 25, 15]]) p.rect(x, y, w, 3, 0x1e5a32);
      for (const [x, y] of [[7, 13], [10, 17], [4, 21], [8, 25]]) p.rect(x, y, 3, 1, 0x2e7a42);
      p.frame(X0 - 1, Y0 - 1, W + 2, Hh + 2, 0xd8d0bc);
      // month header
      p.text('8', 4, 40, { size: 16, color: RED });
      p.text('月', 14, 44, { size: 12, color: INK });
      digits(p, '1986', 45, 49, 0x8a8478);
      p.rect(1, 56, 62, 1, 0xd8d0bc);
      // weekday colour keys + date grid (August 1986 begins on a Friday)
      for (let c = 0; c < 7; c++) p.rect(1 + c * 9 + 1, 58, 5, 1, c === 0 ? RED : c === 6 ? 0x2a5ab8 : 0x8a8478);
      for (let d = 1; d <= 31; d++) {
        const i = d + 4, c = i % 7, r = Math.floor(i / 7);
        const str = String(d), col = c === 0 ? RED : c === 6 ? 0x2a5ab8 : INK;
        digits(p, str, 1 + c * 9 + (str.length === 1 ? 2 : 0), 60 + r * 6, col);
      }
      ring(p, 1 + 5 * 9 + 3, 60 + 2 * 6 + 2, 5, 1, RED); // Obon, circled in red pen
      digits(p, '15', 1 + 5 * 9, 60 + 2 * 6, INK);
      p.rect(0, 95, 64, 1, 0xe2dccc);
    },
  },

  // ============================================================ wooden price tags (120×48)
  menu_tags: {
    w: 120, h: 48,
    paint(p) {
      woodBoard(p, 0, 0, 120, 48, 0x3a2414, 5);
      p.frame(0, 0, 120, 48, 0x24160c);
      const items = [['くじ', '20'], ['ラムネ', '50'], ['ガム', '10'], ['ガチャ', '100']];
      const YEN = ['#####', '#.#.#', '#####', '#...#', '#..##'];
      items.forEach(([name, price], i) => {
        const x = 3 + i * 29, y = 2, w = 26, h = 45;
        woodBoard(p, x, y + 1, w, h - 1, 0xe6cc98, 11 + i, true);
        p.rect(x, y + 1, w, 1, 0xf6e6c0); p.rect(x, y + 1, 1, h - 1, 0xf2dcb0);
        p.rect(x, y + h - 1, w, 1, 0xa88a58); p.rect(x + w - 1, y + 1, 1, h - 1, 0xb8986a);
        // name in brush-black, price in red under it
        vtext(p, name, x + 13, y + 2, 12, INK, { step: 12 });
        const pw = price.length * 4 - 1 + 6;
        const px0 = x + Math.round((w - pw) / 2);
        digits(p, price, px0, y + 39, RED);
        p.sprite(YEN, { '#': RED }, px0 + price.length * 4 + 1, y + 39);
      });
      // bamboo rail the tags are nailed to
      p.rect(1, 1, 118, 3, 0xc8b878); p.rect(1, 1, 118, 1, 0xe2d498); p.rect(1, 3, 118, 1, 0x9a8a50);
      for (const x of [22, 58, 96]) p.rect(x, 1, 1, 3, 0x8a7a44);
      for (let i = 0; i < 4; i++) { p.px(3 + i * 29 + 13, 2, 0x4a4844); p.px(3 + i * 29 + 13, 4, 0x6a5a3a); } // nails
    },
  },

  // ============================================================ noren curtain (96×80)
  noren: {
    w: 96, h: 80,
    paint(p) {
      const ind = 0x1e2e5a, indL = 0x2a3c6e, indD = 0x16224a;
      p.fill(0x120e0c); // dark doorway behind
      // wooden pole
      p.rect(0, 0, 96, 4, 0x6a4426); p.rect(0, 1, 96, 1, 0x9a6a3e); p.rect(0, 3, 96, 1, 0x3a2414);
      // hanging loops
      for (let x = 2; x < 94; x += 12) p.rect(x, 4, 8, 4, indL);
      // two cloth panels with soft fold shading
      for (let y = 8; y < 80; y++) for (let x = 0; x < 96; x++) {
        if (y >= 44 && (x === 47 || x === 48)) continue; // the slit between panels
        const lx = x < 48 ? x : x - 48;
        const fold = Math.sin((lx / 47) * Math.PI * 3 + 0.4);
        let c = ind;
        if (fold > 0.82) c = indL;
        else if (fold < -0.86) c = indD;
        else if (fold > 0.7 && (x + y) % 2 === 0) c = indL;
        else if (fold < -0.74 && (x + y) % 2 === 0) c = indD;
        p.px(x, y, c);
      }
      // seam edges at the slit
      for (let y = 44; y < 80; y++) { p.px(46, y, indD); p.px(49, y, indL); }
      // white crest: a gacha capsule in a ring
      ring(p, 48, 26, 13, 2, WHITE);
      for (let y = -8; y <= 8; y++) for (let x = -8; x <= 8; x++) {
        const d = Math.hypot(x, y);
        if (d <= 8.3 && (y < 0 || d > 6.9)) p.px(48 + x, 26 + y, WHITE);
      }
      p.rect(40, 26, 17, 1, WHITE);
      p.px(45, 22, ind); p.px(44, 23, ind); // capsule highlight cut
      // text across both panels + hem
      ctext(p, 'ガチャ', 48, 52, 16, WHITE);
      p.rect(0, 74, 47, 1, 0x8a9ac8); p.rect(49, 74, 47, 1, 0x8a9ac8);
      p.rect(0, 77, 47, 3, indD); p.rect(49, 77, 47, 3, indD);
    },
  },

  // ============================================================ retro kaiju poster (72×100)
  poster_showa: {
    w: 72, h: 100,
    paint(p) {
      p.fill(0xf0e4c4);
      const X0 = 3, Y0 = 3, W = 66, Hh = 82;
      p.gradient(X0, Y0, W, 50, 0x3a1430, 0xd8541e);
      p.gradient(X0, Y0 + 50, W, 20, 0xd8541e, 0xf2a03a);
      p.circle(13, 47, 6, 0xfbe8b0); p.circle(15, 45, 1, 0xf2d898); p.circle(11, 49, 1, 0xf2d898);
      // searchlight beams
      for (let k = 0; k < 44; k++) { p.px(8 + k * 0.3, 84 - k * 1.1, 0xffe8a0, 60); p.px(9 + k * 0.3, 84 - k * 1.1, 0xffe8a0, 60); p.px(66 - k * 0.45, 84 - k * 1.0, 0xffe8a0, 50); }
      // the kaiju: dark hulk with a gacha-capsule head, roaring at the city
      const K = 0x1e2620, KL = 0x3e5034;
      for (let y = 54; y < 85; y++) {
        const half = 8 + (y - 54) * 0.36;
        for (let x = Math.round(31 - half); x <= Math.round(31 + half); x++) p.px(x, y, x > 31 + half - 2 ? KL : K);
      }
      for (let k = 0; k < 16; k++) p.circle(44 + k * 1.1, 82 - k * 0.5, 3.2 - k * 0.15, K); // tail
      for (const [x, y] of [[24, 56], [22, 62], [21, 68], [19, 74]]) { p.rect(x - 3, y, 3, 2, KL); p.px(x - 4, y + 1, KL); p.px(x - 2, y - 1, KL); } // back plates
      p.line(38, 62, 46, 57, K); p.line(38, 63, 46, 58, K); p.line(46, 57, 48, 54, K); p.line(47, 57, 49, 54, K); // raised arm
      p.px(49, 53, KL); p.px(47, 53, KL); // claws
      p.line(24, 64, 20, 70, K); p.line(25, 65, 21, 71, K);
      // capsule head: red dome over white
      for (let y = -8; y <= 8; y++) for (let x = -8; x <= 8; x++) {
        if (x * x + y * y > 66) continue;
        p.px(30 + x, 48 + y, y < 0 ? (x < -3 && y < -3 ? 0xf05040 : 0xd02a20) : y === 0 ? INK : 0xf4efe6);
      }
      p.rect(25, 45, 3, 2, 0xffe04a); p.rect(32, 45, 3, 2, 0xffe04a); // glowing eyes
      p.rect(26, 51, 10, 3, INK); for (let x = 26; x < 36; x += 2) { p.px(x, 51, WHITE); p.px(x + 1, 53, WHITE); } // jagged roar
      // atomic breath
      for (let k = 0; k < 18; k++) p.circle(38 + k * 1.5, 50 - k * 0.8, 1 + k * 0.13, k % 3 ? 0x8af0ff : 0xffffff);
      // city silhouette with lit windows
      const bld = [[3, 72, 8], [11, 66, 6], [17, 74, 7], [24, 70, 5], [46, 68, 7], [53, 73, 6], [59, 64, 6], [65, 71, 4]];
      for (const [x, top, w] of bld) {
        p.rect(x, top, w, 85 - top, 0x140c14);
        for (let yy = top + 2; yy < 83; yy += 3) for (let xx = x + 1; xx < x + w - 1; xx += 2) if (H(xx, yy, 4) < 0.45) p.px(xx, yy, 0xffd060);
      }
      p.rect(X0, 83, W, 2, 0x140c14);
      // title
      ctext(p, '大怪獣', 36, 4, 16, 0xffe04a, { outline: 0x5a0a0a });
      ctext(p, 'ガチャラ', 36, 21, 16, WHITE, { outline: 0xb01a14 });
      // credits band
      p.rect(X0, 86, W, 11, INK);
      ctext(p, '近日公開', 36, 86, 12, 0xffe04a);
      p.frame(X0 - 1, Y0 - 1, W + 2, 96, 0xd8c8a0);
      // tape on the corners
      for (const [x, y] of [[0, 0], [64, 0]]) p.rect(x, y, 8, 4, 0xe8dcb0);
    },
  },

  // ============================================================ big shop signboard (200×44)
  shop_sign: {
    w: 200, h: 44,
    paint(p) {
      const base = 0x4a2a16;
      woodBoard(p, 0, 0, 200, 44, base, 2);
      knot(p, 150, 9, 3, 1, base); knot(p, 66, 36, 2, 1, base);
      // carved bevel frame
      p.frame(0, 0, 200, 44, 0x24140a);
      p.frame(1, 1, 198, 42, 0x6e4426);
      p.frame(2, 2, 196, 40, 0x2e1a0c);
      // red lacquer seal block: ガチ / ャ屋
      rrect(p, 4, 4, 36, 36, 3, 0xa82418);
      p.frame(5, 5, 34, 34, GOLDD);
      for (const [ch, x, y] of [['ガ', 13, 6], ['チ', 30, 6], ['ャ', 13, 22], ['屋', 30, 22]]) p.text(ch, x, y, { size: 16, color: GOLD, align: 'center', shadow: 0x5a0a06 });
      // carved gold letters: dark cut shadow, lit lower edge
      const s = 'ガレージ堂', cx = 120, ty = 6;
      p.text(s, cx, ty - 1, { size: 30, color: 0x1a0c04, align: 'center' });
      p.text(s, cx + 1, ty + 1, { size: 30, color: 0x8a5a2a, align: 'center' });
      p.text(s, cx, ty, { size: 30, color: GOLD, align: 'center' });
      // gold-leaf glint on the upper strokes
      p.flush();
      for (let y = ty; y < ty + 12; y++) for (let x = 44; x < 196; x++) {
        const [r, g] = p.get(x, y);
        if (r > 200 && g > 160 && (x + y) % 7 === 0) p.px(x, y, 0xfff0b0);
      }
      // corner nails
      for (const [x, y] of [[44, 4], [194, 4], [44, 38], [194, 38]]) { p.px(x, y, 0x9a9890); p.px(x + 1, y + 1, 0x4a4844); }
    },
  },
};

/** Every glyph drawn by the painters with p.text (preload with document.fonts.load). */
export const SHOP_TEXT = 'ねこ印醤油特級ガチャラムネ金鶴せんべい元気ドリンクゲンキン学生服ツバメふじマッチたぬき蚊取線香ミルクキャラメル8月1986円くじガム0123456789だがし大怪獣近日公開屋レージ堂';
