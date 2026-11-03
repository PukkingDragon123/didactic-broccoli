// The paper look for the HUD and panels (src/ui/paper.css): hand-pixelled paper stocks, torn and zig-zag edges,
// masking tape and a square hanko stamp, painted once into data URLs and exposed as CSS custom properties.
// Everything is drawn at 1 texel = 1 CSS px and shown at 2x with pixelated scaling.
//   --pp-grain-{cream,note,receipt,kraft}   tileable 48x48 paper grain (background, 96px)
//   --pp-edge-{cream,note,receipt,kraft}    9-slice torn edge for border-image (slice 6, width 12px)
//   --pp-zig-receipt                        9-slice receipt edge, zig-zag top and bottom
//   --pp-tape                               a strip of masking tape (40x12 texels)
//   --pp-hanko                              a square red seal (16x16)

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
function edge(base, seed, { zig = false } = {}) {
  const S = 24, B = 6, c = canvas(S, S), g = c.getContext('2d'), img = g.createImageData(S, S), r = rng(seed);
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
  g.putImageData(img, 0, 0);
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

let done = false;
export function installPaper() {
  if (done) return;
  done = true;
  const root = document.documentElement.style;
  let seed = 101;
  for (const [k, base] of Object.entries(STOCKS)) {
    root.setProperty(`--pp-grain-${k}`, `url(${grain(base, seed++)})`);
    root.setProperty(`--pp-edge-${k}`, `url(${edge(base, seed++)})`);
  }
  root.setProperty('--pp-zig-receipt', `url(${edge(STOCKS.receipt, 77, { zig: true })})`);
  root.setProperty('--pp-tape', `url(${tape()})`);
  root.setProperty('--pp-hanko', `url(${hanko()})`);
  document.body.classList.add('paper-ui');
}
