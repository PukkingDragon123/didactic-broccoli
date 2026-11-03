// Pixel art for the life features: Grandpa's handwriting (the 5x7 bitmap capitals, slanted and wobbling like a ballpoint
// in an old hand), note paper, little ink doodles, the OPEN / CLOSED sign, the notice-board flyers, the van's faded shop
// decal, and "dissolve" grime textures (alpha holds a per-pixel threshold: lower the material's opacity and the dirt
// breaks up pixel by pixel under alphaTest, no blending, no soft fades).
import * as THREE from 'three';
import { Pix, FONT_EN, FONT_JP } from '../gfx/pix.js';
import { mask5, textW5 } from '../gfx/font5x7.js';
import { rng } from '../core/util.js';

export const INK = 0x26345e, INK_LIGHT = 0x4a5a8e, RED_INK = 0xb8322e, PENCIL = 0x6a6660;

// ------------------------------------------------------------------ handwriting
/** One line of Grandpa's hand: 5x7 capitals, slanted, each letter bobbing a pixel now and then. Returns its width. */
export function handText(p, str, x, y, { color = INK, seed = 1, slant = true, bold = false } = {}) {
  const r = rng(seed * 7919 + str.length * 31);
  let xx = x;
  for (const ch of String(str)) {
    if (ch === ' ') { xx += 3 + (r() < 0.3 ? 1 : 0); continue; }
    const m = mask5(ch), w = textW5(ch);
    const dy = r() < 0.18 ? (r() < 0.5 ? -1 : 1) : 0;
    for (const [i, j] of m) {
      const sx = slant ? Math.floor((6 - j) / 3) : 0; // the top of each letter leans forward
      const c = r() < 0.07 ? INK_LIGHT : color; // the ballpoint skips a little
      p.px(xx + i + sx, y + j + dy, c);
      if (bold) p.px(xx + i + sx + 1, y + j + dy, c);
    }
    xx += w + 1 + (bold ? 1 : 0);
  }
  return xx - x;
}
export const handW = (str, bold = false) => [...String(str)].reduce((a, ch) => a + (ch === ' ' ? 3 : textW5(ch) + 1 + (bold ? 1 : 0)), 0);

/** Word-wrap a string into lines that fit `max` pixels of handwriting. */
export function wrapHand(str, max) {
  const out = [];
  let line = '';
  for (const w of String(str).split(' ')) {
    const t = line ? line + ' ' + w : w;
    if (handW(t) > max && line) { out.push(line); line = w; } else line = t;
  }
  if (line) out.push(line);
  return out;
}

// ------------------------------------------------------------------ doodles (x = ink, r = red pen, p = pencil)
export const DOODLES = {
  key: ['..xxx........', '.x...x.......', 'x..x..xxxxxxx', '.x...x...x.x.', '..xxx....x.x.'],
  shop: ['.xxxxxxxxxxxx.', 'xrrrrrrrrrrrrx', 'x.r.r.r.r.r.rx', 'xxxxxxxxxxxxxx', 'x.xxxxxxxxxx.x', 'x.x--------x.x', 'x.x--------x.x', 'x.x--------x.x', 'x.xxxxxxxxxx.x', 'xxxxxxxxxxxxxx'],
  breaker: ['xxxxxxxxx', 'x.......x', 'x...x...x', 'x..xxx..x', 'x...x...x', 'x..xxx..x', 'x..xxx..x', 'x.......x', 'xxxxxxxxx'],
  bulb: ['..xxx..', '.x...x.', 'x..r..x', 'x.r.r.x', '.x...x.', '..xxx..', '..xxx..', '...x...'],
  window: ['xxxxxxxxxxx', 'x....x....x', 'x....x....x', 'x....x....x', 'xxxxxxxxxxx', '..r.r.r....', '.r.r.r.....'],
  cat: ['x.......x', 'xx.....xx', 'x.xxxxx.x', 'x.......x', 'x.x...x.x', 'x...r...x', 'x..x.x..x', '.x.....x.', '..xxxxx..'],
  milk: ['..xxx..', '..x.x..', '.x...x.', 'x.....x', 'x.rrr.x', 'x.r.r.x', 'x.rrr.x', 'x.....x', 'xxxxxxx'],
  broom: ['.......x', '......x.', '.....x..', '....x...', '...x....', '.xxxx...', 'xxxxxx..', 'x.x.x.x.', '.x.x.x..'],
  bag: ['..x.x..', '...x...', '.xxxxx.', 'x.....x', 'x..r..x', 'x.....x', 'x.....x', '.xxxxx.'],
  tin: ['.xxxxxxx.', 'xrrrrrrrx', 'x.......x', 'x..yyy..x', 'x.......x', 'xxxxxxxxx'],
  coins: ['..xx.....', '.x..x.xx.', '.x..xx..x', '..xx.x..x', '......xx.'],
  box: ['xxxxxxxxx', 'x...x...x', 'xxxxxxxxx', 'x.......x', 'x..rrr..x', 'x.......x', 'xxxxxxxxx'],
  dog: ['xx.........', 'xxx........', 'x.xxxxxxx.x', 'x........x.', '.x.......x.', '.xx.xxx.xx.', '.x.x...x.x.'],
  car: ['...xxxxx....', '..x..x..x...', '.x...x...xxx', 'xxxxxxxxxxxx', 'x..........x', 'xx.xxxxxx.xx', '.xx......xx.'],
  sign: ['....x....', '...x.x...', '..x...x..', 'xxxxxxxxx', 'x.rrrrr.x', 'x.r...r.x', 'x.rrrrr.x', 'xxxxxxxxx'],
  capsule: ['..xxxx..', '.xrrrrx.', 'xrrrrrrx', 'xxxxxxxx', 'x......x', '.x....x.', '..xxxx..'],
  machine: ['.xxxxxx.', 'x......x', 'x.r..r.x', 'x..r...x', 'xxxxxxxx', 'x..xx..x', 'x..xx..x', 'x......x', 'xxxxxxxx'],
  plug: ['.x.x.', '.x.x.', 'xxxxx', 'xxxxx', '.xxx.', '..x..', '..x..', '..x..'],
  arrowR: ['....x..', 'xxxxxx.', '....x..'],
  arrowD: ['.x.', '.x.', '.x.', 'xxx', '.x.'],
  arrowU: ['.x.', 'xxx', '.x.', '.x.', '.x.'],
  heart: ['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..'],
  smile: ['.xxxx.', 'x....x', 'x.x.xx', 'x....x', 'x.xx.x', '.xxxx.'],
  star: ['..x..', 'x.x.x', '.xxx.', 'x.x.x', '..x..'],
  rag: ['xxxxxxx', 'x.....x', 'x.x.x.x', 'x.....x', '.x.x.x.'],
  tube: ['xxxxxxxxxxxxxx', 'x............x', 'xxxxxxxxxxxxxx'],
  pc: ['xxxxxxxxx', 'x.......x', 'x.r.r.r.x', 'x.......x', 'xxxxxxxxx', '...xxx...', '.xxxxxxx.'],
  truck: ['xxxxxx.....', 'x....xxxx..', 'x....x..xx.', 'xxxxxxxxxxx', '.xx....xx..'],
  board: ['xxxxxxxxx', 'x.r...x.x', 'x.r.x...x', 'x...x.r.x', 'xxxxxxxxx', '.x.....x.', '.x.....x.'],
};
const DCOL = { x: INK, r: RED_INK, p: PENCIL, y: 0xc8a030 };
export function doodle(p, name, x, y, scale = 1) {
  const rows = DOODLES[name];
  if (!rows) return 0;
  rows.forEach((row, j) => [...row].forEach((ch, i) => { const c = DCOL[ch]; if (c !== undefined) p.rect(x + i * scale, y + j * scale, scale, scale, c); }));
  return rows.length * scale;
}

// ------------------------------------------------------------------ paper
const PAPERS = {
  letter: { bg: 0xf1e8d2, line: 0xc8d4e4, margin: 0xe0a0a0, edge: 0xd8c8a8 },
  memo: { bg: 0xf6f0dc, line: 0xd0dae6, margin: null, edge: 0xdcd0b4 },
  yellow: { bg: 0xf6e7a0, line: null, margin: null, edge: 0xd8c47a },
  card: { bg: 0xe8ddc4, line: null, margin: null, edge: 0xc4b494 },
};
function paper(p, kind, seed) {
  const P = PAPERS[kind] || PAPERS.memo, r = rng(seed);
  p.fill(P.bg);
  p.noise(0.025);
  // age spots and a coffee ring now and then
  for (let i = 0; i < 4; i++) p.blotch(Math.floor(r() * p.w), Math.floor(r() * p.h), 4 + Math.floor(r() * 6), 0xc8a870, 0.12);
  if (P.line) for (let y = 22; y < p.h - 6; y += 11) for (let x = 4; x < p.w - 4; x++) if ((x + y) % 7) p.px(x, y, P.line);
  if (P.margin) for (let y = 2; y < p.h - 2; y++) p.px(14, y, P.margin);
  p.frame(0, 0, p.w, p.h, P.edge);
  // a torn top edge on memo sheets
  if (kind === 'memo' || kind === 'yellow') for (let x = 0; x < p.w; x++) { const d = Math.floor(r() * 2.2); for (let y = 0; y < d; y++) p.d[(y * p.w + x) * 4 + 3] = 0; }
  // the ring his cup left on some of them: a stepped, broken loop of weak coffee (its own dice, so the sheets above
  // keep their old tears)
  const rc = rng(seed * 7 + 3);
  if (rc() < 0.2) {
    const rad = 8 + Math.floor(rc() * 4), cx = Math.floor(p.w * (0.5 + rc() * 0.3)), cy = Math.floor(p.h * (0.55 + rc() * 0.3)), ph = rc() * 6;
    for (let y = cy - rad - 1; y <= cy + rad + 1; y++) for (let x = cx - rad - 1; x <= cx + rad + 1; x++) {
      const d = Math.hypot(x - cx, y - cy), a = Math.atan2(y - cy, x - cx);
      if (d < rad - 0.5 || d >= rad + 0.7 || Math.sin(a * 2 + ph) > 0.7) continue;
      p.px(x, y, 0x8a5a2e, Math.sin(a + ph) > 0 ? 92 : 60);
    }
  }
  p.dirty = true;
}

/** A dog-eared bottom-right corner: the corner folded back over the page, showing the plain back of the sheet. */
function dogEar(p, kind, F = 6) {
  const P = PAPERS[kind] || PAPERS.memo, W = p.w, H = p.h;
  for (let dy = 0; dy <= F; dy++) for (let dx = 0; dx <= F; dx++) {
    const x = W - 1 - dx, y = H - 1 - dy, s = dx + dy;
    if (s < F) { p.d[(y * W + x) * 4 + 3] = 0; continue; } // the corner itself, folded away
    if (s === F || dx === F || dy === F) p.px(x, y, P.edge); // the crease and the flap's cut edges
    else { p.px(x, y, P.bg); p.px(x, y, 0x5a4a3a, 22); } // the back of the sheet, a touch shaded
  }
  p.dirty = true;
}

/**
 * A note page. def: { paper, w, h, seed, rows: [string | { task, text } | { doodle, x?, scale? } | { gap } | { sign } |
 * { big } | { red }] }.  done(taskId) -> bool ticks a box and strikes the line through.
 */
export function paintNote(def, done = () => false) {
  const W = def.w || 128, H = def.h || 160;
  const p = new Pix(W, H, def.seed || 3);
  paper(p, def.paper || 'memo', def.seed || 3);
  const L = def.paper === 'letter' ? 18 : 7, R = W - 6;
  let y = def.paper === 'letter' ? 12 : 9;
  let n = 0;
  for (const row of def.rows) {
    n++;
    const seed = (def.seed || 1) * 100 + n;
    if (typeof row === 'string') {
      for (const l of wrapHand(row, R - L)) { handText(p, l, L, y, { seed }); y += 11; }
    } else if (row.big) {
      handText(p, row.big, L, y, { seed, bold: true, color: row.color ?? INK });
      y += 12;
    } else if (row.red) {
      for (const l of wrapHand(row.red, R - L)) { handText(p, l, L, y, { seed, color: RED_INK }); y += 11; }
    } else if (row.task) {
      const ok = done(row.task);
      // the box, a tick in red pen once it's done, the line struck through
      p.frame(L, y, 7, 7, INK);
      if (ok) for (const [dx, dy] of [[1, 3], [2, 4], [3, 5], [4, 4], [5, 3], [6, 2], [7, 1], [8, 0]]) { p.px(L + dx, y + dy, RED_INK); p.px(L + dx, y + dy + 1, RED_INK); }
      const lines = wrapHand(row.text, R - L - 11);
      lines.forEach((l, i) => {
        const w = handText(p, l, L + 11, y + i * 10, { seed: seed + i });
        if (ok) for (let x = L + 10; x < L + 13 + w; x++) p.px(x, y + i * 10 + 3 + (x % 9 === 0 ? 1 : 0), INK);
      });
      y += Math.max(1, lines.length) * 10 + 2;
    } else if (row.doodle) {
      const s = row.scale || 2;
      const w = (DOODLES[row.doodle]?.[0]?.length || 0) * s;
      const x = row.x !== undefined ? row.x : row.right ? R - w - 2 : L + 2;
      const h = doodle(p, row.doodle, x, y + 1, s);
      if (row.label) handText(p, row.label, x + w + 4, y + Math.max(0, h / 2 - 4), { seed });
      if (!row.inline) y += h + 4;
    } else if (row.gap) y += row.gap;
    else if (row.sign) {
      const w = handW(row.sign);
      handText(p, row.sign, R - w - 2, y + 2, { seed });
      // his little capsule mark after the name
      doodle(p, 'capsule', R - w - 14, y, 1);
      y += 12;
    }
  }
  // some sheets have been in his pocket: a dog-eared corner
  if (def.paper !== 'card' && rng((def.seed || 3) * 13 + 5)() < 0.3) dogEar(p, def.paper || 'memo');
  // a strip of yellowed tape across the top
  if (def.tape !== false) {
    const tw = 22, tx = (W - tw) >> 1;
    for (let x = tx; x < tx + tw; x++) for (let yy = 0; yy < 7; yy++) p.px(x, yy, 0xe8dcae, 170);
  }
  return p;
}

/** The envelope taped to the shutter: kraft paper, "KIDDO" across it, the flap and a strip of tape. */
export function envelopePix() {
  const p = new Pix(64, 40, 21);
  p.fill(0xe8dcc0); p.noise(0.03);
  p.blotch(48, 30, 6, 0xb89868, 0.15);
  for (let x = 0; x < 64; x++) { const y = Math.round(Math.abs(x - 32) * 0.55); p.px(x, 20 - y, 0xc8b898); }
  p.frame(0, 0, 64, 40, 0xb8a888);
  handText(p, 'KIDDO', 18, 24, { bold: true, seed: 5 });
  doodle(p, 'capsule', 52, 28, 1);
  for (let x = 24; x < 40; x++) for (let y = 0; y < 6; y++) p.px(x, y, 0xf0e8c0, 190);
  return p;
}

// ------------------------------------------------------------------ the OPEN / CLOSED sign (64 x 32 per face)
export function signPix(open) {
  const p = new Pix(64, 32, open ? 41 : 42);
  // planks of old cedar with a darker frame
  p.fill(0xc89a5f);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 64; x++) { const g = Math.sin(x * 0.35 + Math.sin(y * 0.7) * 1.8 + y * 0.12); if (g > 0.86) p.px(x, y, 0xa87a46); }
  p.rect(0, 15, 64, 1, 0x9a6a3a);
  p.noise(0.04);
  p.frame(0, 0, 64, 32, 0x6a4424); p.frame(1, 1, 62, 30, 0x8a5a30);
  // cord holes
  p.rect(8, 3, 2, 2, 0x3a2414); p.rect(54, 3, 2, 2, 0x3a2414);
  if (open) {
    p.rect(4, 7, 56, 21, 0xf4ecd8);
    p.frame(4, 7, 56, 21, 0xd8282a);
    p.text('営業中', 32, 8, { font: FONT_JP, size: 16, color: 0xd8282a, align: 'center' });
    p.tinyText('OPEN', 32, 20, { color: 0x2a2018, align: 'center' });
  } else {
    p.rect(4, 7, 56, 21, 0x2e3a4a);
    p.text('準備中', 32, 8, { font: FONT_JP, size: 16, color: 0xf4ecd8, align: 'center' });
    p.tinyText('CLOSED', 32, 20, { color: 0xf2c84a, align: 'center' });
  }
  // chipped paint
  const r = rng(open ? 7 : 8);
  for (let i = 0; i < 14; i++) p.px(4 + Math.floor(r() * 56), 7 + Math.floor(r() * 21), 0xc89a5f);
  return p;
}

// ------------------------------------------------------------------ notice board flyers (32 x 40)
const JOB_ART = {
  dog: { band: 0xe8a25a, doodle: 'dog' },
  car: { band: 0x5cc4ff, doodle: 'car' },
  windows: { band: 0x58c06c, doodle: 'window' },
  street: { band: 0xd8b84a, doodle: 'broom' },
};
export function jobFlyerPix(kind, title, pay) {
  const A = JOB_ART[kind] || JOB_ART.street;
  const p = new Pix(32, 40, kind.length * 11);
  p.fill(0xf4efe2); p.noise(0.03);
  p.rect(0, 0, 32, 9, A.band);
  p.tinyText(title, 16, 1, { color: 0x1a1216, align: 'center' });
  doodle(p, A.doodle, 16 - ((DOODLES[A.doodle][0].length * 2) >> 1), 12, 2);
  p.tinyText(pay, 16, 26, { color: 0xd8282a, align: 'center' });
  // tear-off phone tabs along the bottom
  for (let x = 1; x < 32; x += 5) { p.rect(x, 35, 4, 5, 0xece6d6); p.rect(x + 1, 36, 1, 3, 0x6a6a6a); }
  p.frame(0, 0, 32, 40, 0xcfc6b0);
  return p;
}

/** Cork for the board, with the association's header strip. */
export function boardPix() {
  const p = new Pix(96, 64, 61);
  p.fill(0xb8875a); p.noise(0.12);
  p.speckle(0.08, [0x8a5e3a, 0xd0a070, 0x9a6a40]);
  p.rect(0, 0, 96, 11, 0x2a5a3a);
  p.text('町内会', 4, -1, { font: FONT_JP, size: 16, color: 0xf4ecd8 });
  p.tinyText('NOTICES', 92, 2, { color: 0xf2d23a, align: 'right' });
  // an old festival notice and a lost-cat poster that never come down
  p.rect(60, 16, 30, 40, 0xece2c8); p.rect(62, 18, 26, 10, 0xd8282a); p.tinyText('MATSURI', 75, 19, { color: 0xffffff, align: 'center' });
  doodle(p, 'cat', 70, 33, 1); p.tinyText('LOST?', 75, 46, { color: 0x2a2020, align: 'center' });
  p.frame(0, 0, 96, 64, 0x5a3a1e);
  return p;
}

// ------------------------------------------------------------------ the van's faded shop decal (160 x 44)
export function vanDecalPix() {
  const p = new Pix(160, 44, 77); // starts transparent: only the painted letters and logo show
  // the capsule logo: red top, cream bottom, a dark seam and a highlight
  for (let y = 7; y <= 37; y++) for (let x = 5; x <= 35; x++) {
    const d = (x - 20) ** 2 + (y - 22) ** 2;
    if (d > 15 * 15 + 9) continue;
    p.px(x, y, d > 13 * 13 + 9 ? 0x3a2a24 : y < 22 ? 0xc8302a : y === 22 ? 0x3a2a24 : 0xf2ead8);
  }
  p.circle(14, 15, 2, 0xf4a8a0);
  p.text('ガチャガレージ', 42, 2, { font: FONT_JP, size: 16, color: 0xc8302a });
  p.text('Gacha Garage', 43, 20, { font: FONT_EN, size: 16, color: 0x2a4a7a });
  p.tinyText('CAPSULE TOYS SINCE 1971  TEL 03-3814-0271', 42, 36, { color: 0x2a4a7a });
  // weathered: chips and sun fade
  const r = rng(9);
  for (let i = 0; i < p.d.length; i += 4) {
    if (p.d[i + 3] === 0) continue;
    if (r() < 0.07) p.d[i + 3] = 0;
    else { p.d[i] = Math.min(255, p.d[i] * 0.86 + 30); p.d[i + 1] = Math.min(255, p.d[i + 1] * 0.86 + 28); p.d[i + 2] = Math.min(255, p.d[i + 2] * 0.86 + 26); }
  }
  p.dirty = true;
  return p;
}

// ------------------------------------------------------------------ dissolve grime
/**
 * A dirt texture for a dissolve: paint(p, r) draws the dirt in colour; every drawn pixel then gets a random alpha in
 * [0.52, 1]. Use with alphaTest 0.5: opacity 1 shows it all, lowering it to 0.5 breaks it up pixel by pixel.
 */
export function dissolvePix(w, h, seed, paint) {
  const p = new Pix(w, h, seed);
  for (let i = 0; i < p.d.length; i += 4) p.d[i + 3] = 0;
  p.dirty = true;
  const r = rng(seed + 1);
  paint(p, r);
  p.flush(); p.pull();
  for (let i = 0; i < p.d.length; i += 4) if (p.d[i + 3] > 0) p.d[i + 3] = Math.round((0.52 + r() * 0.48) * 255);
  p.dirty = true;
  return p;
}

/** A material for a dissolve texture (no blending, no shadows' business). */
export function dissolveMat(tex, opts = {}) {
  return new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, roughness: opts.roughness ?? 0.95, polygonOffset: true, polygonOffsetFactor: -2, side: opts.side ?? THREE.FrontSide, ...opts.extra });
}

/** Dust / grease patch for the counter (wiped with the rag). */
export function dustPatch(seed) {
  return dissolvePix(24, 24, seed, (p, r) => {
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
      const d = Math.hypot(x - 12, y - 12) / 12 + (r() - 0.5) * 0.35;
      if (d < 0.95) p.px(x, y, [0x9a8c76, 0x8a7c66, 0xae9e86, 0x786a58][Math.floor(r() * 4)]);
    }
    for (let i = 0; i < 3; i++) { const cx = 4 + r() * 16, cy = 4 + r() * 16; p.circle(Math.round(cx), Math.round(cy), 2, 0x6a5a44); } // ring stains
  });
}

/** Road grime and bird mess for a car panel. */
export function carDirt(seed, w = 32, h = 16) {
  return dissolvePix(w, h, seed, (p, r) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const low = y / h; // more mud low down (texture y grows downwards)
      if (r() < 0.18 + low * 0.5) p.px(x, y, [0xb0a084, 0x988a70, 0xc4b496, 0x84765e][Math.floor(r() * 4)]);
    }
    for (let i = 0; i < 2; i++) { const cx = Math.floor(r() * w), cy = Math.floor(r() * h * 0.5); p.rect(cx, cy, 2, 2, 0xf4f0e6); p.px(cx + 1, cy + 2, 0xe8e4da); }
  });
}
