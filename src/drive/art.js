// Pixel art for the drive (src/gfx/pix.js: hand-placed pixels, crisp DotGothic16 for kana / kanji, the 5x7 font for
// tiny Latin text): the country road's asphalt with its white edge lines, one atlas of hand-painted road signs and
// shop signs, the two-car local train, the konbini window, Grandpa's chalk marks in the lane. Everything is painted
// when the drive starts and disposed with it (the textures are not cached).
//   driveFontText()   every character the signs use (load DotGothic16 for them before painting)
//   roadTexture() -> Texture   signAtlas() -> { tex, uv(key) -> [u0, v0, u1, v1], size(key) -> [w, h] px }
//   trainTextures() -> { side, front }   chalkTexture() -> Texture
import * as THREE from 'three';
import { Pix, FONT_JP, FONT_EN } from '../gfx/pix.js';
import { hash2 } from '../core/util.js';

const JP = ['杜王町', '2km', '通行止め', 'この先', '行き止まり', 'ようこそ', '杜王町へ', 'ニコニコマート', 'ニコニコ', '田中前', '野菜', '100円', '止まれ', '踏切', '杜王米', 'バン', 'ゆっくり', '工事中', '徐行', '杜王バス', '24時間', 'おいしい'];
/** Every character the drive's signs draw (to make sure the font subsets are loaded before painting). */
export const driveFontText = () => JP.join('') + '←→↑0123456789';

function tex(pix, { repeat = false, mips = false } = {}) {
  pix.flush();
  const t = new THREE.CanvasTexture(pix.canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = mips ? THREE.NearestMipmapLinearFilter : THREE.NearestFilter;
  t.generateMipmaps = mips;
  t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// ------------------------------------------------------------------ the country road
/** Old country asphalt, 5.6 m across x 8 m along (96 x 128 px): aggregate, sealed cracks, patches, white edge lines. */
export function roadTexture() {
  const W = 96, H = 128, p = new Pix(W, H, 401);
  p.rect(0, 0, W, H, 0x4c4a47);
  for (let i = 0; i < 14; i++) p.blotch(Math.floor(hash2(i, 11) * W), Math.floor(hash2(i, 12) * H), 6 + Math.floor(hash2(i, 13) * 9), i % 2 ? 0x54514d : 0x454341, 0.35);
  p.speckle(0.18, [0x3c3a38, 0x5c5a56, 0x66625c, 0x524e4a]);
  p.speckle(0.03, [0x8a8680, 0x9e988e]);
  // tyre-polished bands where wheels run
  for (const cx of [26, 41, 56, 71]) for (let y = 0; y < H; y++) for (let x = cx - 3; x <= cx + 3; x++) if (hash2(x, y + 7) < 0.25) p.px(x, y, 0x5a5854);
  // a patch repair and tar-sealed cracks
  p.speckle(0.25, [0x44423f, 0x4e4c48], 255, 30, 70, 22, 18); for (let i = 30; i < 52; i++) if (hash2(i, 70) < 0.6) { p.px(i, 70, 0x3a3836); p.px(i, 87, 0x3a3836); }
  const crack = (x, y, n, s) => { for (let i = 0; i < n; i++) { p.px(x, y, 0x2a2826); x += hash2(i, s) < 0.5 ? 1 : -1; y = (y + (hash2(i, s + 1) < 0.75 ? 1 : 0)) % H; x = Math.max(6, Math.min(W - 7, x)); } };
  crack(20, 4, 60, 3); crack(64, 40, 50, 5); crack(48, 100, 40, 9);
  // white edge lines, worn: aggregate shows through, gaps where it has flaked
  for (const x0 of [5, W - 8]) for (let y = 0; y < H; y++) for (let x = x0; x < x0 + 3; x++) {
    const k = hash2(x * 3 + 1, y * 7 + 2);
    if (k < 0.08) continue;
    p.px(x, y, k < 0.2 ? 0xbcb8ac : k < 0.3 ? 0xd2cec2 : 0xe8e4d8);
  }
  // crumbly edges with grit and a few weeds poking through
  for (let y = 0; y < H; y++) for (const [x, dir] of [[0, 1], [W - 1, -1]]) {
    const n = 1 + Math.floor(hash2(y, x + 3) * 3);
    for (let k = 0; k < n; k++) p.px(x + dir * k, y, hash2(y, k + x) < 0.5 ? 0x7a7466 : 0x8a8270);
    if (hash2(y, x + 9) < 0.06) { p.px(x + dir * n, y, 0x5a7a3a); p.px(x + dir * n, y - 1, 0x6a8a42); }
  }
  return tex(p, { repeat: true, mips: true });
}

// ------------------------------------------------------------------ signs
const LAYOUT = {
  morio2km: [0, 0, 80, 28], morioLeft: [80, 0, 80, 40], closed: [160, 0, 64, 40], deadEnd: [224, 0, 32, 32],
  welcome: [0, 40, 160, 36], xingAhead: [160, 40, 32, 32], tomareSign: [192, 40, 32, 30], slow: [224, 40, 32, 32],
  konbini: [0, 80, 160, 22], konbiniPole: [160, 80, 40, 56], busPlate: [200, 80, 40, 18], yasai: [200, 100, 40, 20],
  konbiniWin: [0, 104, 96, 40], rice: [96, 104, 64, 32], works: [200, 120, 48, 32],
  barn: [0, 144, 64, 32], kanban: [64, 144, 64, 40],
};

/** Weathered wood: planks running across, grain, darker knots. */
function planks(p, x, y, w, h, base = 0x9a7a52, seed = 1) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const plank = Math.floor(j / 7), g = hash2(i + seed * 13, plank * 17 + seed) * 0.08 + (hash2(Math.floor(i / 5) + plank * 3, j + seed) < 0.12 ? -0.08 : 0);
    const k = (j % 7 === 6 ? 0.72 : 1) * (0.94 + g);
    const r = ((base >> 16) & 255) * k, gg = ((base >> 8) & 255) * k, b = (base & 255) * k;
    p.px(x + i, y + j, [Math.min(255, r) | 0, Math.min(255, gg) | 0, Math.min(255, b) | 0]);
  }
  p.frame(x, y, w, h, 0x4a3422);
}

/** Hand-painted (a brush, slightly uneven): paint text a second time 1 px off in places. */
function brushText(p, str, x, y, col, opts = {}) {
  p.text(str, x, y, { size: 16, color: col, align: 'center', ...opts });
}

export function signAtlas() {
  const W = 256, H = 192, p = new Pix(W, H, 402);
  const at = (k) => LAYOUT[k];
  // 杜王町 2km, straight on (a farmer's board, black brush on weathered wood)
  { const [x, y, w, h] = at('morio2km'); planks(p, x, y, w, h, 0xa8885a, 3); brushText(p, '杜王町', x + 30, y + 5, 0x1e1814); p.text('2km', x + 64, y + 8, { size: 9, color: 0x1e1814, align: 'center', font: FONT_EN }); for (let k = 0; k < 6; k++) { p.rect(x + 63 - k, y + 22 - k, 1 + 2 * k, 1, 0x8a2a1e); } }
  // ← 杜王町 / Morio-cho, the turn at the tower (red arrow)
  {
    const [x, y, w, h] = at('morioLeft'); planks(p, x, y, w, h, 0xb0905e, 5);
    brushText(p, '杜王町', x + 48, y + 3, 0x1e1814);
    p.tinyText('MORIO-CHO', x + 48, y + 24, { color: 0x2a2018, align: 'center' });
    for (let k = 0; k < 8; k++) p.rect(x + 6 + k, y + 13 - k, 1, 2 * k + 1, 0xb82a1e);
    p.rect(x + 13, y + 10, 10, 7, 0xb82a1e);
  }
  // 通行止め: white board, red border, black kanji
  { const [x, y, w, h] = at('closed'); p.rect(x, y, w, h, 0xf4f0e6); p.frame(x, y, w, h, 0xc8282a); p.frame(x + 1, y + 1, w - 2, h - 2, 0xc8282a); p.text('通行止め', x + w / 2, y + 6, { size: 14, color: 0x1a1a1a, align: 'center' }); p.tinyText('ROAD CLOSED', x + w / 2, y + 27, { color: 0xc8282a, align: 'center' }); }
  // この先 行き止まり (blue plate)
  { const [x, y, w, h] = at('deadEnd'); p.rect(x, y, w, h, 0x1e4a9a); p.frame(x + 1, y + 1, w - 2, h - 2, 0xf4f0e6); p.text('この先', x + w / 2, y + 2, { size: 10, color: 0xf4f0e6, align: 'center' }); p.text('行止', x + w / 2, y + 15, { size: 12, color: 0xf4f0e6, align: 'center' }); }
  // ようこそ杜王町へ / WELCOME TO MORIO-CHO: the town's welcome board, sunflower-yellow ground
  {
    const [x, y, w, h] = at('welcome'); p.rect(x, y, w, h, 0xf2d24a); p.frame(x, y, w, h, 0x2a6a3a); p.frame(x + 1, y + 1, w - 2, h - 2, 0x2a6a3a);
    p.text('ようこそ 杜王町へ', x + w / 2, y + 3, { size: 16, color: 0x2a2018, align: 'center' });
    p.tinyText('WELCOME TO MORIO-CHO', x + w / 2, y + 24, { color: 0xb82a1e, align: 'center' });
    for (const cx of [x + 8, x + w - 9]) { p.rect(cx - 2, y + 4, 5, 5, 0xe8902a); p.px(cx, y + 6, 0x5a3a1a); p.rect(cx, y + 9, 1, 8, 0x3a7a3a); }
  }
  // 踏切あり: yellow diamond with the old steam locomotive pictogram
  {
    const [x, y, w] = at('xingAhead'), c = w / 2 - 0.5;
    for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) { const d = Math.abs(i - c) + Math.abs(j - c); if (d <= c) p.px(x + i, y + j, d > c - 2 ? 0x1a1a1a : 0xf2c41a); }
    const loco = ['....##......', '....##..###.', '.#########..', '.##########.', '.###########', '.###########', '..#..#...#..'];
    loco.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') p.px(x + 10 + i, y + 12 + j, 0x1a1a1a); }));
  }
  // 止まれ: red inverted triangle
  {
    const [x, y, w, h] = at('tomareSign');
    for (let j = 0; j < h; j++) { const half = (w / 2) * (1 - j / h); for (let i = 0; i < w; i++) if (Math.abs(i - w / 2 + 0.5) <= half) p.px(x + i, y + j, Math.abs(i - w / 2 + 0.5) > half - 1.5 || j < 2 ? 0xf4f0e6 : 0xc8282a); }
    p.text('止まれ', x + w / 2, y + 3, { size: 9, color: 0xf4f0e6, align: 'center' });
  }
  // ゆっくり / 徐行 (slow): yellow board
  { const [x, y, w, h] = at('slow'); p.rect(x, y, w, h, 0xf2c41a); p.frame(x, y, w, h, 0x1a1a1a); p.text('徐行', x + w / 2, y + 3, { size: 12, color: 0x1a1a1a, align: 'center' }); p.tinyText('SLOW', x + w / 2, y + 21, { color: 0x1a1a1a, align: 'center' }); }
  // the konbini's band sign: green / orange / red stripes, the name
  {
    const [x, y, w, h] = at('konbini');
    p.rect(x, y, w, h, 0xf8f6f0);
    p.rect(x, y, w, 3, 0x2a9a4a); p.rect(x, y + 3, w, 2, 0xf09a2a); p.rect(x, y + h - 3, w, 3, 0xd8302a);
    p.text('ニコニコマート', x + w / 2 - 14, y + 4, { size: 14, color: 0x2a8a3a, align: 'center' });
    p.tinyText('24H', x + w - 16, y + 9, { color: 0xd8302a, align: 'center' });
  }
  // its pole sign by the road (lit from inside)
  {
    const [x, y, w, h] = at('konbiniPole'); p.rect(x, y, w, h, 0xf8f6f0); p.frame(x, y, w, h, 0x3a3a3a);
    p.rect(x + 2, y + 2, w - 4, 6, 0x2a9a4a); p.rect(x + 2, y + 8, w - 4, 3, 0xf09a2a);
    p.text('ニコ', x + w / 2, y + 12, { size: 14, color: 0x2a8a3a, align: 'center' }); p.text('ニコ', x + w / 2, y + 26, { size: 14, color: 0x2a8a3a, align: 'center' });
    p.rect(x + 2, y + h - 12, w - 4, 10, 0xd8302a); p.tinyText('24H', x + w / 2, y + h - 10, { color: 0xf8f6f0, align: 'center' });
  }
  // the bus stop's name plate: 杜王バス 田中前
  { const [x, y, w, h] = at('busPlate'); p.rect(x, y, w, h, 0xf4f0e6); p.frame(x, y, w, h, 0x1e4a9a); p.text('田中前', x + w / 2, y + 2, { size: 12, color: 0x1a1a1a, align: 'center' }); }
  // unmanned vegetable stand: 野菜 100円
  { const [x, y, w, h] = at('yasai'); planks(p, x, y, w, h, 0xc8a878, 7); p.text('野菜', x + 12, y + 2, { size: 12, color: 0x2a6a2a, align: 'center' }); p.text('100円', x + 30, y + 6, { size: 9, color: 0xb82a1e, align: 'center' }); }
  // the konbini window: lit shelves, magazines by the glass, the till, a poster or two
  {
    const [x, y, w, h] = at('konbiniWin');
    p.rect(x, y, w, h, 0xf6f2e2);
    for (let j = 6; j < h - 4; j += 8) { p.rect(x + 2, y + j, w - 4, 1, 0xb8b4a8); for (let i = 3; i < w - 3; i += 2) if (hash2(i, j) < 0.8) p.rect(x + i, y + j - 4, 1, 4, [0xd8402a, 0x2a7ad8, 0xf2c83a, 0x3aa85a, 0xf08ab0, 0xe8e2d0][Math.floor(hash2(i * 3, j) * 6)]); }
    p.rect(x, y + h - 9, w, 9, 0xe0dac8);
    for (let i = 2; i < 40; i += 5) p.rect(x + i, y + h - 8, 4, 6, [0xd84a3a, 0x3a6ad8, 0xf2d23a, 0x58b868][(i / 5) % 4 | 0]);
    p.rect(x + 66, y + h - 12, 20, 12, 0x8a8a8a); p.rect(x + 68, y + h - 15, 6, 4, 0x2a2a2a);
    for (let i = 0; i < w; i += 24) p.rect(x + i, y, 2, h, 0x8a8e92); // window mullions
    p.rect(x, y, w, 2, 0x8a8e92);
  }
  // 杜王米 rice ad: a rusted enamel plate on a barn
  {
    const [x, y, w, h] = at('rice'); p.rect(x, y, w, h, 0x1e4a8a); p.frame(x + 1, y + 1, w - 2, h - 2, 0xf4f0e6);
    p.text('杜王米', x + w / 2, y + 4, { size: 16, color: 0xf4f0e6, align: 'center' });
    p.tinyText('MORIO RICE', x + w / 2, y + 23, { color: 0xf2d23a, align: 'center' });
    for (let i = 0; i < 70; i++) { const rx = x + Math.floor(hash2(i, 41) * w), ry = y + Math.floor(hash2(i, 42) * h); if (hash2(i, 43) < 0.6 || rx < x + 3 || ry > y + h - 4) p.px(rx, ry, hash2(i, 44) < 0.5 ? 0x8a4a2a : 0x6a3a22); }
  }
  // 工事中 (road works) board at the start
  { const [x, y, w, h] = at('works'); p.rect(x, y, w, h, 0xf4f0e6); p.frame(x, y, w, h, 0x1a1a1a); p.text('工事中', x + w / 2, y + 3, { size: 14, color: 0xc8282a, align: 'center' }); p.tinyText('NO ENTRY', x + w / 2, y + 22, { color: 0x1a1a1a, align: 'center' }); }
  // barn doors (planks with a cross brace)
  { const [x, y, w, h] = at('barn'); planks(p, x, y, w, h, 0x6a5038, 9); p.line(x + 2, y + 2, x + w / 2 - 2, y + h - 3, 0x4a3422); p.line(x + w / 2 + 1, y + h - 3, x + w - 3, y + 2, 0x4a3422); p.rect(x + w / 2 - 1, y, 2, h, 0x3a2a1a); }
  // a shop's wooden kanban for the farmhouse stall
  { const [x, y, w, h] = at('kanban'); planks(p, x, y, w, h, 0x8a6a42, 11); p.text('杜王米', x + w / 2, y + 4, { size: 16, color: 0xf4ecd8, align: 'center' }); p.text('おいしい', x + w / 2, y + 22, { size: 12, color: 0xf2c83a, align: 'center' }); }
  const t = tex(p);
  return {
    tex: t, W, H,
    uv: (k) => { const [x, y, w, h] = LAYOUT[k]; return [x / W, 1 - (y + h) / H, (x + w) / W, 1 - y / H]; },
    size: (k) => LAYOUT[k].slice(2),
  };
}

// ------------------------------------------------------------------ the local train
/** A two-car diesel in cream with a vermilion band (20 m x 3 m sides, 256 x 40 px; front 48 x 40). */
export function trainTextures() {
  const side = new Pix(256, 40, 403);
  side.rect(0, 0, 256, 40, 0xece2c6);
  side.speckle(0.05, [0xe0d6b8, 0xf4ecd4]);
  side.rect(0, 25, 256, 4, 0xc8442a); side.rect(0, 29, 256, 1, 0x9a3020);
  side.rect(0, 0, 256, 2, 0x9aa0a6); side.rect(0, 38, 256, 2, 0x5a5a5a);
  const win = (x, w) => { side.rect(x, 9, w, 11, 0x2a3440); side.rect(x, 9, w, 2, 0x5a6a7a); side.rect(x + 1, 11, w - 2, 1, 0xb8c8d4); side.frame(x - 1, 8, w + 2, 13, 0xb8b2a0); };
  for (let i = 0; i < 9; i++) win(36 + i * 20, 14);
  const door = (x) => { side.rect(x, 6, 14, 32, 0xd8ceb0); side.frame(x, 6, 14, 32, 0x8a8478); side.rect(x + 3, 9, 8, 11, 0x2a3440); side.rect(x + 3, 9, 8, 2, 0x5a6a7a); };
  door(14); door(228);
  win(4, 7); win(245, 7);
  for (let i = 0; i < 256; i += 3) if (hash2(i, 4) < 0.4) side.px(i, 37, 0x7a6a5a); // grime at the skirt
  const front = new Pix(48, 40, 404);
  front.rect(0, 0, 48, 40, 0xece2c6);
  front.rect(0, 25, 48, 4, 0xc8442a);
  front.rect(4, 8, 17, 12, 0x2a3440); front.rect(27, 8, 17, 12, 0x2a3440); front.rect(4, 8, 17, 2, 0x5a6a7a); front.rect(27, 8, 17, 2, 0x5a6a7a);
  front.rect(21, 6, 6, 16, 0xd8ceb0); front.rect(22, 9, 4, 8, 0x2a3440);
  front.rect(9, 0, 30, 6, 0x1a1a1a); front.tinyText('MORIO', 24, -1, { color: 0xf4f0e6, align: 'center' });
  for (const hx of [8, 40]) { front.rect(hx - 3, 31, 6, 4, 0xfff4c8); front.frame(hx - 4, 30, 8, 6, 0x5a5a5a); }
  front.rect(0, 38, 48, 2, 0x4a4a4a);
  return { side: tex(side), front: tex(front) };
}

// ------------------------------------------------------------------ the lane
/** Grandpa's chalk marks on the road (a van-sized box, corner ticks, an arrow and バン), white on transparent. */
export function chalkTexture() {
  const W = 40, H = 80, p = new Pix(W, H, 405);
  const c = (x, y) => { if (hash2(x * 7, y * 3) < 0.82) p.px(x, y, hash2(x, y) < 0.3 ? 0xd8d4c8 : 0xf4f2ea); };
  for (let x = 2; x < W - 2; x++) { c(x, 2); c(x, 3); c(x, H - 3); c(x, H - 4); }
  for (let y = 2; y < H - 2; y++) { c(2, y); c(3, y); c(W - 3, y); c(W - 4, y); }
  // an arrow pointing the way in (towards the top of the texture)
  for (let y = 22; y < 48; y++) { c(19, y); c(20, y); }
  for (let k = 0; k < 7; k++) { c(19 - k, 22 + k); c(20 + k, 22 + k); }
  p.text('バン', W / 2, 52, { size: 12, color: 0xf0eee6, align: 'center' });
  for (let i = 0; i < 40; i++) { const x = Math.floor(hash2(i, 9) * W), y = Math.floor(hash2(i, 10) * H); if (p.d[(y * W + x) * 4 + 3] > 0 && hash2(i, 11) < 0.5) p.px(x, y, 0xb8b4a8); }
  const t = tex(p);
  return t;
}
