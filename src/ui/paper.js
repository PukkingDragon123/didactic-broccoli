// The paper look for the HUD and panels (src/ui/paper.css): hand-pixelled paper stocks, torn and zig-zag edges,
// masking tape and a square hanko stamp, painted once into data URLs and exposed as CSS custom properties.
// Everything is drawn at 1 texel = 1 CSS px and shown at 2x with pixelated scaling.
//   --pp-grain-{cream,note,receipt,kraft}   tileable 48x48 paper grain (background, 96px)
//   --pp-edge-{cream,note,receipt,kraft}    9-slice torn edge for border-image (slice 6, width 12px)
//   --pp-zig-receipt                        9-slice receipt edge, zig-zag top and bottom
//   --pp-tape                               a strip of masking tape (40x12 texels)
//   --pp-hanko                              a square red seal (16x16)
// Second pass (more stationery, all at 2x unless noted):
//   --pp-grain-{pink,manila,graph,bag}      carbon-copy pink, manila tag, graph paper (32x32, show at 64px), paper bag
//   --pp-edge-{pink,manila,bag}, --pp-zig-pink   torn / zig-zag 9-slices for those stocks (slice 6, width 12px)
//   --pp-dog-{cream,receipt,note}           a torn 9-slice (32x32, slice 8: use `8 / 16px` on a 12px border) with a
//                                           dog-eared bottom-right corner
//   --pp-edge-spiral, --pp-edge-spiral-note a page torn from a spiral pad: ring notches along the top (9-slice)
//   --pp-airmail                            airmail envelope rim, red / blue bars (9-slice)
//   --pp-clip (8x22) --pp-staple (12x4) --pp-pin, --pp-pin-blue, --pp-pin-yellow (10x12)   fasteners
//   --pp-hanko-{sumi,mi,en,in}              済 done, 未 not yet (blue), 円, 印: 20x20 seals inked from DotGothic16
//   --pp-coffee (28x28)                     a coffee-cup ring
//   --pp-pencil, --pp-pencil-red, --pp-pencil-blue (32x3, repeat-x)   a wobbly pencil / pen underline
//   --pp-scribble (24x8, repeat-x)          a pencil scribble that crosses words out
//   --pp-box, --pp-tick (12x12)             a hand-ruled checkbox, empty / ticked in red pen
//   --pp-x (12x12)                          a red-pen cross (close buttons)
//   --pp-ring (9-slice 24x16, slice 6)      a red marker loop drawn round a price

const STOCKS = {
  cream: [238, 228, 202],
  note: [246, 226, 132],
  receipt: [246, 243, 234],
  kraft: [201, 160, 104],
};

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));

/** One texel of paper: the base tone with a few quantised shades, darker fibres and the odd speckle. */
function shadeOf(base, r) {
  let k = [0.97, 1, 1, 1, 1.02][Math.floor(r() * 5)];
  if (r() < 0.025) k = 0.9; // a fibre fleck
  if (r() < 0.006) k = 0.82; // a speck of dirt
  return base.map((c) => clamp(c * k));
}

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function grain(base, seed) {
  const W = 48, c = canvas(W, W), g = c.getContext('2d'), img = g.createImageData(W, W), r = rng(seed);
  const put = (x, y, col, a = 255) => { const i = (((y + W) % W) * W + ((x + W) % W)) * 4; img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = a; };
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) put(x, y, shadeOf(base, r));
  // short pressed fibres running mostly sideways
  for (let i = 0; i < 26; i++) {
    const x0 = Math.floor(r() * W), y0 = Math.floor(r() * W), len = 2 + Math.floor(r() * 5), dy = r() < 0.3 ? 1 : 0;
    const col = base.map((c2) => clamp(c2 * (r() < 0.5 ? 0.94 : 1.03)));
    for (let k = 0; k < len; k++) put(x0 + k, y0 + (dy && k > len / 2 ? 1 : 0), col);
  }
  g.putImageData(img, 0, 0);
  return c.toDataURL();
}

/**
 * A 24x24 9-slice whose 6-texel rim is a torn edge: the outer texels nibbled away at random, a darker shade
 * along the cut, grain everywhere. zig: top and bottom become a regular receipt zig-zag instead.
 */
function edge(base, seed, { zig = false, S = 24, B = 6, dog = false } = {}) {
  const c = canvas(S, S), g = c.getContext('2d'), img = g.createImageData(S, S), r = rng(seed);
  const cut = new Uint8Array(S * S);
  // how deep each edge is torn at every texel along it (0..2), corners rounded off a little
  const depth = () => (r() < 0.55 ? 0 : r() < 0.7 ? 1 : 2);
  for (let i = 0; i < S; i++) {
    const top = zig ? [0, 1, 2, 1][i % 4] : depth(), bot = zig ? [0, 1, 2, 1][i % 4] : depth();
    const lef = depth(), rig = depth();
    for (let d = 0; d < top; d++) cut[d * S + i] = 1;
    for (let d = 0; d < bot; d++) cut[(S - 1 - d) * S + i] = 1;
    for (let d = 0; d < lef; d++) cut[i * S + d] = 1;
    for (let d = 0; d < rig; d++) cut[i * S + (S - 1 - d)] = 1;
  }
  for (const [x, y] of [[0, 0], [S - 1, 0], [0, S - 1], [S - 1, S - 1], [1, 0], [0, 1], [S - 2, 0], [S - 1, 1], [0, S - 2], [1, S - 1], [S - 1, S - 2], [S - 2, S - 1]]) cut[y * S + x] = 1;
  const lo = base.map((v) => clamp(v * 0.82));
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4;
    if (cut[y * S + x]) { img.data[i + 3] = 0; continue; }
    // texels touching a cut get the darker edge shade (the torn fibres)
    const nearCut = (x > 0 && cut[y * S + x - 1]) || (x < S - 1 && cut[y * S + x + 1]) || (y > 0 && cut[(y - 1) * S + x]) || (y < S - 1 && cut[(y + 1) * S + x])
      || x === 0 || y === 0 || x === S - 1 || y === S - 1;
    const col = nearCut && (x < B || y < B || x >= S - B || y >= S - B) ? lo : shadeOf(base, r);
    img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
  }
  if (dog) dogEar(img, S, B, base);
  g.putImageData(img, 0, 0);
  return c.toDataURL();
}

/** Fold the bottom-right corner of a 9-slice back over the page (inside its B x B corner slice): the corner is gone,
 *  a dark crease, and the flap (the back of the sheet, a shade darker) lying on the page with its cut edges inked. */
function dogEar(img, S, B, base) {
  const put = (x, y, col, a = 255) => { const i = (y * S + x) * 4; img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = a; };
  const k = B >> 1, back = base.map((v) => clamp(v * 0.86)), line = base.map((v) => clamp(v * 0.58)), sh = base.map((v) => clamp(v * 0.74));
  for (let v = 0; v < B; v++) for (let u = 0; u < B; u++) {
    const x = S - B + u, y = S - B + v, dc = (B - 1 - u) + (B - 1 - v); // texels from the corner
    if (dc < k) put(x, y, base, 0); // folded away
    else if (dc === k) put(x, y, line); // the crease
    else if (u >= B - 1 - k && v >= B - 1 - k && dc <= 2 * k) put(x, y, u === B - 1 - k || v === B - 1 - k ? line : back); // the flap
    else if (u >= B - 2 - k && v >= B - 2 - k && dc <= 2 * k + 1 && (u === B - 2 - k || v === B - 2 - k)) put(x, y, sh); // its shadow
  }
}  g.putImageData(img, 0, 0);
  return c.toDataURL();
}

/** Masking tape: translucent beige with frayed ends and a faint crease. */
function tape() {
  const W = 40, H = 12, c = canvas(W, H), g = c.getContext('2d'), r = rng(31);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const frayL = x < 2 && r() < 0.5, frayR = x > W - 3 && r() < 0.5;
    if (frayL || frayR) continue;
    const k = y === 4 ? 0.95 : 1;
    g.fillStyle = `rgba(${clamp(232 * k)},${clamp(220 * k)},${clamp(176 * k)},${r() < 0.1 ? 0.62 : 0.74})`;
    g.fillRect(x, y, 1, 1);
  }
  return c.toDataURL();
}

/** A square red hanko seal with a pixel 祝 (celebrate). */
function hanko() {
  const rows = [
    '################',
    '#..............#',
    '#.###...######.#',
    '#..#....#....#.#',
    '#.####..#....#.#',
    '#..#.#..######.#',
    '#..#.#...#..#..#',
    '#.##.#...#..#..#',
    '#..#.#..#...#..#',
    '#..#...##...##.#',
    '#..#...........#',
    '#..............#',
    '#.#.#.#.#.#.#..#',
    '#..............#',
    '#..............#',
    '################',
  ];
  const c = canvas(16, 16), g = c.getContext('2d'), r = rng(5);
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch !== '#' || r() < 0.12) return; // a slightly uneven stamp
    g.fillStyle = r() < 0.2 ? '#a82a26' : '#c8322c';
    g.fillRect(x, y, 1, 1);
  }));
  return c.toDataURL();
}

// ------------------------------------------------------------------ more stationery (second pass)
// All painted texel by texel; colours are a handful of flat inks, alpha is either 0 or a flat translucency.

/** A blank canvas with a put(x, y, [r,g,b], a) helper (a: 0..1). */
function sheet(w, h) {
  const c = canvas(w, h), g = c.getContext('2d'), img = g.createImageData(w, h);
  const put = (x, y, col, a = 1) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 4;
    img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = Math.round(a * 255);
  };
  const get = (x, y) => img.data[(y * w + x) * 4 + 3];
  const out = () => { g.putImageData(img, 0, 0); return c.toDataURL(); };
  return { put, get, out, img };
}
const hex = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const BLUE_LINE = [150, 172, 206];

/** Graph paper (方眼紙): cream grain with a pale blue grid every 8 texels, a darker line every 4 squares. */
function graph(seed) {
  const W = 32, s = sheet(W, W), r = rng(seed), base = [242, 236, 216];
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    let col = shadeOf(base, r);
    if (x % 8 === 0 || y % 8 === 0) col = (x % 32 === 0 || y % 32 === 0) ? [146, 172, 204] : (r() < 0.12 ? [196, 208, 222] : [184, 200, 220]);
    s.put(x, y, col);
  }
  return s.out();
}

/** Brown paper bag: kraft with long crinkle lines (a lighter ridge over a darker fold) running at a slant. */
function bag(seed) {
  const W = 48, s = sheet(W, W), r = rng(seed), base = [184, 140, 92];
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) s.put(x, y, shadeOf(base, r));
  for (let i = 0; i < 7; i++) {
    let x = Math.floor(r() * W), y = Math.floor(r() * W);
    const len = 8 + Math.floor(r() * 14), dx = r() < 0.5 ? 1 : -1;
    for (let k = 0; k < len; k++) {
      s.put((x + W) % W, (y + W) % W, base.map((c) => clamp(c * 1.08)));
      s.put((x + W) % W, (y + 1 + W) % W, base.map((c) => clamp(c * 0.86)));
      x += k % 3 === 2 ? dx : 0; y += 1;
    }
  }
  return s.out();
}

/** Airmail envelope edge (9-slice, 24x24, rim 6): red / cream / blue / cream diagonal bars, then cream grain inside. */
function airmail(seed) {
  const S = 24, B = 6, s = sheet(S, S), r = rng(seed), base = STOCKS.receipt;
  const red = [200, 50, 44], blue = [47, 90, 154], lo = base.map((c) => clamp(c * 0.82));
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const d = Math.min(x, y, S - 1 - x, S - 1 - y);
    let col = shadeOf(base, r);
    if (d === 0) col = lo;
    else if (d >= 1 && d <= 4) { const k = (x + y) % 12; col = k < 3 ? red : k < 6 ? col : k < 9 ? blue : col; }
    s.put(x, y, col);
  }
  for (const [x, y] of [[0, 0], [S - 1, 0], [0, S - 1], [S - 1, S - 1]]) s.put(x, y, base, 0);
  void B;
  return s.out();
}

/** A page torn out of a spiral notebook (9-slice, 24x24, rim 6): the top edge has a torn notch where each ring was,
 *  the other edges are clean guillotine cuts with a 1-texel darker line. */
function spiralEdge(base, seed) {
  const S = 24, s = sheet(S, S), r = rng(seed), lo = base.map((c) => clamp(c * 0.82));
  const cut = new Uint8Array(S * S);
  for (let x = 0; x < S; x++) {
    const m = (x - 6 + 12) % 12; // the middle slice (x 6..17) is one ring pitch
    let d = r() < 0.5 ? 0 : 1;
    if (m >= 4 && m <= 7) d = m === 4 || m === 7 ? 3 : 4; // the torn ring hole
    if (m === 3 || m === 8) d = Math.max(d, 2);
    for (let k = 0; k < d; k++) cut[k * S + x] = 1;
  }
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (cut[y * S + x]) { s.put(x, y, base, 0); continue; }
    const near = (y > 0 && cut[(y - 1) * S + x]) || (x > 0 && cut[y * S + x - 1]) || (x < S - 1 && cut[y * S + x + 1]) || y === 0;
    const rim = x === 0 || x === S - 1 || y === S - 1;
    s.put(x, y, (near && y < 6) || rim ? lo : shadeOf(base, r));
  }
  return s.out();
}

/** A steel paper clip, 8x22: one wire of two shades with a bright glint, loops at both ends. */
function clip() {
  const rows = [
    '..####..',
    '.#....#.',
    '#..##..#',
    '#.#..#.#',
    '#.#..#.#',
    '#.#..#.#',
    '#.#..#.#',
    '#.#..#.#',
    '#.#..#.#',
    '#.#..#.#',
    '#.#..#.#',
    '#.#..#.#',
    '#.#..#.#',
    '#.#..#.#',
    '#.#....#',
    '#.#....#',
    '#.#....#',
    '#.#....#',
    '#..#..#.',
    '#...##..',
    '.#....#.',
    '..####..',
  ];
  const s = sheet(8, 22);
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch !== '#') return;
    s.put(x, y, x < 2 || y < 2 ? [196, 204, 214] : x > 5 ? [94, 104, 118] : [142, 152, 166]);
  }));
  s.put(1, 6, [236, 240, 244]); s.put(1, 7, [236, 240, 244]); // glint
  return s.out();
}

/** A staple seen from the front, 12x4: the crown and the two bent legs, with a shadow under it. */
function staple() {
  const s = sheet(12, 4), steel = [104, 112, 126], hi = [178, 186, 198], dark = [62, 68, 80], sh = [26, 18, 22];
  for (let x = 1; x < 11; x++) { s.put(x, 1, x < 4 ? hi : steel); s.put(x, 2, sh, 0.4); }
  for (const x of [0, 11]) { s.put(x, 1, dark); s.put(x, 2, dark); }
  return s.out();
}

/** A push pin, 10x12: a stepped red plastic head with a glint and its rim, a steel needle, a hard shadow. */
function pin(col = [200, 50, 44]) {
  const rows = [
    '..####....',
    '.#hhoo#...',
    '#hoooood..',
    '#ooooood..',
    '#oooooddS.',
    '.#ooodd#S.',
    '..####dSS.',
    '...rrr.SS.',
    '....n...S.',
    '....n.....',
    '....n.....',
    '..........',
  ];
  const s = sheet(10, 12), dark = col.map((v) => clamp(v * 0.62)), hi = col.map((v) => clamp(v * 1.25 + 30));
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const c = { '#': dark, o: col, h: hi, d: dark, r: col.map((v) => clamp(v * 0.8)), n: [150, 158, 170], S: [26, 18, 22] }[ch];
    if (c) s.put(x, y, c, ch === 'S' ? 0.35 : 1);
  }));
  return s.out();
}

/** A coffee-cup ring, 28x28: a stepped, broken ring of two browns, translucent, a drip outside it. */
function coffee(seed) {
  const W = 28, s = sheet(W, W), r = rng(seed), c0 = [120, 76, 40], c1 = [150, 104, 60];
  const cx = 13.5, cy = 13.5;
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot(x - cx, y - cy), a = Math.atan2(y - cy, x - cx);
    const gap = Math.sin(a * 3 + 1.3) > 0.82; // where the ring is faint
    if (d >= 11.2 && d < 12.4 && !gap) s.put(x, y, c0, r() < 0.2 ? 0.22 : 0.42);
    else if (d >= 10.2 && d < 11.2 && !gap && r() < 0.6) s.put(x, y, c1, 0.18);
  }
  for (const [x, y] of [[24, 22], [25, 22], [25, 23], [24, 23], [26, 24]]) s.put(x, y, c0, 0.3);
  return s.out();
}

/** A pencil line, 32x3, tileable sideways: graphite that wobbles a texel and skips now and then. */
function pencil(seed, col = [86, 84, 92]) {
  const W = 32, s = sheet(W, 3), r = rng(seed);
  let y = 1;
  for (let x = 0; x < W; x++) {
    if (x > 2 && x < W - 3 && r() < 0.18) y = Math.max(0, Math.min(2, y + (r() < 0.5 ? -1 : 1)));
    if (x === W - 2) y = 1; // meet the next tile
    if (r() < 0.06) continue;
    s.put(x, y, col, r() < 0.3 ? 0.55 : 0.85);
  }
  return s.out();
}

/** A pencil scribble that crosses words out, 24x8, tileable sideways: tight back-and-forth loops. */
function scribble(seed, col = [86, 84, 92]) {
  const W = 24, s = sheet(W, 8), r = rng(seed);
  for (let x = 0; x < W; x++) {
    const ph = (x % 6) / 6, y = Math.round(1 + 5 * Math.abs(Math.sin(ph * Math.PI)) + (r() < 0.2 ? 1 : 0));
    for (let k = 0; k < 2; k++) s.put(x, Math.min(7, y + k), col, 0.8);
    if (x % 6 === 3) for (let yy = 2; yy < 6; yy++) s.put(x, yy, col, 0.6);
  }
  return s.out();
}

/** A hand-ruled checkbox, 12x12 (a slightly crooked ink square); ticked: a red-pen tick that overshoots the box. */
function checkbox(ticked) {
  const s = sheet(12, 12), ink = [36, 26, 30], red = [200, 50, 44];
  const box = [[2, 3], [3, 3], [4, 3], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2]];
  for (const [x, y] of box) s.put(x, y, ink); // top, a little uphill
  for (let x = 2; x <= 9; x++) s.put(x, 10, ink); // bottom
  for (let y = 3; y <= 10; y++) s.put(2, y, ink); // left
  for (let y = 2; y <= 10; y++) s.put(9, y, ink); // right
  if (ticked) {
    const tick = [[3, 6], [4, 7], [4, 6], [5, 8], [5, 7], [6, 7], [6, 6], [7, 5], [7, 4], [8, 3], [8, 4], [9, 1], [9, 2], [10, 0], [10, 1], [11, 0]];
    for (const [x, y] of tick) s.put(x, y, red);
  }
  return s.out();
}

/** A red-pen cross, 12x12: two strokes that don't quite meet in the middle (close buttons). */
function cross() {
  const s = sheet(12, 12), red = [200, 50, 44];
  for (let i = 0; i < 10; i++) { s.put(1 + i, 1 + i, red); s.put(2 + i, 1 + i, red); }
  for (let i = 0; i < 10; i++) { s.put(10 - i, 1 + i + (i > 5 ? 1 : 0), red); s.put(11 - i, 1 + i + (i > 5 ? 1 : 0), red); }
  return s.out();
}

/** A red marker loop around a price (9-slice, 24x16, rim 6): stepped round ends, a 2-texel line that wobbles. */
function ring(seed) {
  const W = 24, H = 16, s = sheet(W, H), r = rng(seed), red = [200, 50, 44], dark = [168, 36, 34];
  const ins = (x, y) => { const ex = Math.max(0, Math.abs(x + 0.5 - W / 2) - (W / 2 - 7)), ey = Math.max(0, Math.abs(y + 0.5 - H / 2) - (H / 2 - 7)); return Math.hypot(ex, ey); };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = ins(x, y);
    if (d >= 4.6 && d < 6.6) s.put(x, y, r() < 0.15 ? dark : red, r() < 0.08 ? 0.6 : 1);
  }
  return s.out();
}

/** A square hanko with one character, 20x20: painted with DotGothic16 once the font is in, then thresholded to hard
 *  texels and inked unevenly. Falls back to an empty seal until then. */
function hankoChar(ch, col = [200, 50, 44]) {
  const S = 20, c = canvas(S, S), g = c.getContext('2d', { willReadFrequently: true });
  g.font = '16px "DotGothic16"'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = '#000';
  g.fillText(ch, 10, 16);
  const src = g.getImageData(0, 0, S, S), s = sheet(S, S), r = rng(ch.charCodeAt(0)), dark = col.map((v) => clamp(v * 0.84));
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const frame = x === 0 || y === 0 || x === S - 1 || y === S - 1 || ((x === 1 || x === S - 2) && (y === 1 || y === S - 2));
    const lit = frame || src.data[(y * S + x) * 4 + 3] > 110;
    if (lit && r() > 0.1) s.put(x, y, r() < 0.25 ? dark : col);
  }
  for (const [x, y] of [[0, 0], [S - 1, 0], [0, S - 1], [S - 1, S - 1]]) s.put(x, y, col, 0);
  return s.out();
}

let done = false;
export function installPaper() {
  if (done) return;
  done = true;
  const root = document.documentElement.style;
  const set = (k, url) => root.setProperty(k, `url(${url})`);
  let seed = 101;
  for (const [k, base] of Object.entries(STOCKS)) {
    set(`--pp-grain-${k}`, grain(base, seed++));
    set(`--pp-edge-${k}`, edge(base, seed++));
  }
  set('--pp-zig-receipt', edge(STOCKS.receipt, 77, { zig: true }));
  set('--pp-tape', tape());
  set('--pp-hanko', hanko());
  // second pass: more stocks, fasteners, stamps and wear
  const PINK = [240, 212, 208], MANILA = [226, 200, 140];
  set('--pp-grain-pink', grain(PINK, 131)); set('--pp-edge-pink', edge(PINK, 132)); set('--pp-zig-pink', edge(PINK, 133, { zig: true }));
  set('--pp-grain-manila', grain(MANILA, 134)); set('--pp-edge-manila', edge(MANILA, 135));
  set('--pp-grain-graph', graph(136));
  set('--pp-grain-bag', bag(137)); set('--pp-edge-bag', edge([184, 140, 92], 138));
  set('--pp-airmail', airmail(139));
  set('--pp-edge-spiral', spiralEdge(STOCKS.cream, 140));
  set('--pp-edge-spiral-note', spiralEdge(STOCKS.note, 141));
  set('--pp-clip', clip());
  set('--pp-staple', staple());
  set('--pp-pin', pin()); set('--pp-pin-blue', pin([47, 90, 154])); set('--pp-pin-yellow', pin([224, 176, 40]));
  set('--pp-coffee', coffee(142));
  set('--pp-pencil', pencil(143)); set('--pp-pencil-red', pencil(144, [200, 50, 44])); set('--pp-pencil-blue', pencil(145, [47, 90, 154]));
  set('--pp-scribble', scribble(146));
  set('--pp-box', checkbox(false)); set('--pp-tick', checkbox(true));
  set('--pp-x', cross());
  set('--pp-ring', ring(147));
  // dog-eared corners (a bigger 9-slice: slice 8, shown at border-image-width 16px over a 12px border)
  set('--pp-dog-cream', edge(STOCKS.cream, 150, { S: 32, B: 8, dog: true }));
  set('--pp-dog-receipt', edge(STOCKS.receipt, 151, { S: 32, B: 8, dog: true }));
  set('--pp-dog-note', edge(STOCKS.note, 152, { S: 32, B: 8, dog: true }));
  // hanko with real characters: 済 done, 未 not yet, 円 yen, 印 seal (DotGothic16, once it has loaded)
  const SEALS = { sumi: '済', mi: '未', en: '円', in: '印' };
  const seals = () => { for (const [k, ch] of Object.entries(SEALS)) set(`--pp-hanko-${k}`, hankoChar(ch, k === 'mi' ? [47, 90, 154] : [200, 50, 44])); };
  seals();
  try { document.fonts?.load('16px "DotGothic16"', Object.values(SEALS).join('')).then(seals, () => {}); } catch { /* no font loading API */ }
  document.body.classList.add('paper-ui');
}
