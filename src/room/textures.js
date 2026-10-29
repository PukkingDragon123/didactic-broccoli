// Pixel-art textures for your room (64 px per metre for the big surfaces): the 6-mat tatami floor, cloth
// wallpaper, wooden ceiling boards, fusuma, the inside of the steel door, posters, the calendar and the painted
// dusk view of the lane outside the window (three parallax layers).
import * as THREE from 'three';
import { Pix, FONT_EN, FONT_JP } from '../gfx/pix.js';
import { hash2 } from '../core/util.js';

const shade = (c, f) => {
  const r = Math.min(255, Math.max(0, Math.round(((c >> 16) & 255) * f))), g = Math.min(255, Math.max(0, Math.round(((c >> 8) & 255) * f))), b = Math.min(255, Math.max(0, Math.round((c & 255) * f)));
  return (r << 16) | (g << 8) | b;
};
const mix = (a, b, t) => {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255, br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
};

/** A texture from a Pix with optional repeat (nearest-neighbour, sRGB). */
export function texOf(p, repeat = null) {
  const t = p.texture({ repeat });
  t.anisotropy = 4;
  return t;
}

// ------------------------------------------------------------------ floor, walls, ceiling
/** The 6-mat floor (3.6 x 2.7 m) as one texture: the mats tiled without four corners ever meeting. */
export function tatamiFloor(ppm = 64) {
  const W = Math.round(3.6 * ppm), H = Math.round(2.7 * ppm), u = 0.9 * ppm;
  const p = new Pix(W, H, 31);
  // [x0, z0, x1, z1] in 0.9 m units; long axis decides the weave direction and where the heri borders run
  const mats = [[0, 0, 2, 1], [2, 0, 4, 1], [0, 1, 1, 3], [1, 1, 3, 2], [1, 2, 3, 3], [3, 1, 4, 3]];
  mats.forEach(([a, b, c, d], i) => {
    const x0 = Math.round(a * u), y0 = Math.round(b * u), x1 = Math.round(c * u), y1 = Math.round(d * u);
    const horiz = c - a > d - b;
    const base = mix(0xc8c27a, 0xd8c88a, hash2(i, 3)) ; // sun-faded igusa
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const along = horiz ? y : x; // weave lines run along the long axis
      const k = along % 3 === 0 ? 0.86 : along % 3 === 1 ? 1.0 : 0.95;
      const n = 0.95 + hash2(x * 7 + i, y * 3) * 0.08;
      const stitch = (horiz ? x : y) % 12 === 0 ? 0.93 : 1;
      p.px(x, y, shade(base, k * n * stitch));
    }
    // heri: dark fabric borders along the long edges, with a woven pattern
    const hb = Math.max(2, Math.round(0.035 * ppm));
    for (let t = 0; t < hb; t++) {
      if (horiz) for (let x = x0; x < x1; x++) { p.px(x, y0 + t, (x + t) % 4 === 0 ? 0x3a4a30 : 0x24301e); p.px(x, y1 - 1 - t, (x + t) % 4 === 0 ? 0x3a4a30 : 0x24301e); }
      else for (let y = y0; y < y1; y++) { p.px(x0 + t, y, (y + t) % 4 === 0 ? 0x3a4a30 : 0x24301e); p.px(x1 - 1 - t, y, (y + t) % 4 === 0 ? 0x3a4a30 : 0x24301e); }
    }
    // the short ends: a darker sewn edge
    if (horiz) for (let y = y0; y < y1; y++) { p.px(x0, y, 0x8a8450); p.px(x1 - 1, y, 0x8a8450); }
    else for (let x = x0; x < x1; x++) { p.px(x, y0, 0x8a8450); p.px(x, y1 - 1, 0x8a8450); }
  });
  // a few wear patches and a faint tea stain
  p.blotch(Math.round(W * 0.55), Math.round(H * 0.55), 14, 0xb0a868, 0.25);
  p.blotch(Math.round(W * 0.8), Math.round(H * 0.4), 6, 0x9a8a50, 0.3);
  return p;
}

/** Off-white cloth wallpaper with a faint woven texture (1 m tile). */
export function wallpaper(ppm = 64) {
  const p = new Pix(ppm, ppm, 41);
  p.fill(0xeee6d4);
  for (let y = 0; y < ppm; y++) for (let x = 0; x < ppm; x++) {
    const w = ((x + y) % 4 === 0 ? 0.97 : 1) * ((x * 3 + y * 5) % 11 === 0 ? 0.96 : 1);
    p.px(x, y, shade(0xeee6d4, w * (0.975 + hash2(x, y + 9) * 0.04)));
  }
  p.speckle(0.01, [0xd8ceb8, 0xf6f0e2]);
  return p;
}

/** Light wooden ceiling boards with thin battens every 45 cm (0.9 m tile). */
export function ceilingBoards(ppm = 64) {
  const n = Math.round(0.9 * ppm);
  const p = new Pix(n, n, 51);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const board = Math.floor(x / (n / 2));
    const g = Math.sin((y * 0.12 + board * 3 + Math.sin(y * 0.05 + board) * 2) * 2.4) * 0.5 + 0.5;
    p.px(x, y, shade(board ? 0xd8b888 : 0xd0ae80, 0.92 + g * 0.08 + hash2(x, y) * 0.03));
  }
  for (const bx of [0, n / 2]) for (let y = 0; y < n; y++) { p.px(bx, y, 0x8a6a48); p.px(bx + 1, y, 0xa88660); }
  return p;
}

/** Light-oak flooring planks for the kitchen strip (1 m tile). */
export function flooring(ppm = 64) {
  const p = new Pix(ppm, ppm, 61);
  const pw = Math.round(0.12 * ppm);
  for (let x = 0; x < ppm; x++) {
    const plank = Math.floor(x / pw), off = Math.floor(hash2(plank, 1) * ppm);
    for (let y = 0; y < ppm; y++) {
      const yy = (y + off) % ppm;
      const g = Math.sin((yy * 0.2 + Math.sin(yy * 0.07 + plank) * 3) * 1.6) * 0.5 + 0.5;
      const base = mix(0xc89a68, 0xd8ac78, hash2(plank, 5));
      let c = shade(base, 0.9 + g * 0.1 + hash2(x, y) * 0.03);
      if (x % pw === 0) c = 0x7a5a3a;
      if (yy === 0) c = 0x8a6a48;
      p.px(x, y, c);
    }
  }
  return p;
}

/** Small grey genkan tiles (1 m tile). */
export function genkanTile(ppm = 64) {
  const p = new Pix(ppm, ppm, 71);
  const t = Math.round(ppm / 5);
  for (let y = 0; y < ppm; y++) for (let x = 0; x < ppm; x++) {
    const grout = x % t === 0 || y % t === 0;
    const k = hash2(Math.floor(x / t), Math.floor(y / t));
    p.px(x, y, grout ? 0x6a6660 : shade(mix(0x9a948a, 0xa8a094, k), 0.94 + hash2(x, y) * 0.08));
  }
  return p;
}

/** One fusuma door leaf (unit-mapped): pale paper with silver clouds, a dark frame and a round finger pull. */
export function fusuma(w = 58, h = 112, seed = 1) {
  const p = new Pix(w, h, 80 + seed);
  p.fill(0xf0e6cc);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) p.px(x, y, shade(0xf0e6cc, 0.97 + hash2(x + seed * 50, y) * 0.04));
  // drifting kumo (clouds) in pale gold
  for (let k = 0; k < 4; k++) {
    const cy = Math.round(h * (0.15 + k * 0.22 + hash2(k, seed) * 0.05)), cx = Math.round(w * (hash2(seed, k) * 0.6 + 0.2));
    for (let i = -12; i <= 12; i++) {
      const yy = cy + Math.round(Math.sin((i + k) * 0.5) * 1.5);
      p.px(cx + i, yy, 0xd8c08a); p.px(cx + i, yy + 1, 0xe2cc98);
      if (Math.abs(i) < 7) p.px(cx + i, yy - 2, 0xe2cc98);
    }
  }
  // a mountain silhouette along the bottom
  for (let x = 0; x < w; x++) {
    const m = Math.round(h * 0.86 - Math.max(0, 14 - Math.abs(x - w * (seed % 2 ? 0.7 : 0.3)) * 0.8) - Math.sin(x * 0.3) * 1.2);
    for (let y = m; y < h - 3; y++) p.px(x, y, shade(0x9ab0a0, 0.95 + hash2(x, y) * 0.05));
  }
  p.frame(0, 0, w, h, 0x2a2018); p.frame(1, 1, w - 2, h - 2, 0x3a2a1e);
  const hx = seed % 2 ? 6 : w - 9, hy = Math.round(h * 0.5);
  p.circle(hx + 1, hy, 2, 0x3a2a1a); p.circle(hx + 1, hy, 1, 0x7a6040);
  return p;
}

/** The inside face of the steel front door (unit-mapped). */
export function doorInside(w = 40, h = 88) {
  const p = new Pix(w, h, 91);
  p.fill(0xd8ccb0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) p.px(x, y, shade(0xd8ccb0, 0.97 + hash2(x, y) * 0.04));
  p.frame(0, 0, w, h, 0x8a8478); p.frame(1, 1, w - 2, h - 2, 0xe6dcc4);
  // lever handle + deadbolt thumb-turn + chain
  const hy = Math.round(h * 0.48);
  p.rect(3, hy, 8, 2, 0xd8dce2); p.rect(3, hy + 2, 8, 1, 0x8a8e94); p.rect(4, hy - 2, 3, 6, 0xb8bcc2);
  p.rect(4, hy - 9, 3, 4, 0xb8bcc2); p.rect(5, hy - 8, 1, 2, 0x5a5e64);
  for (let i = 0; i < 9; i++) p.px(5 + i, Math.round(h * 0.32 + Math.sin(i * 0.5) * 2 + i * 0.4), i % 2 ? 0xa8acb2 : 0xd8dce2);
  p.px(Math.round(w / 2), Math.round(h * 0.28), 0x2a2a2a); p.px(Math.round(w / 2) + 1, Math.round(h * 0.28), 0x5a5a5a);
  // newspaper slot flap, a reminder note
  p.rect(Math.round(w / 2) - 6, Math.round(h * 0.66), 12, 3, 0xb8ac94); p.rect(Math.round(w / 2) - 6, Math.round(h * 0.66) + 3, 12, 1, 0x8a8070);
  p.rect(w - 14, Math.round(h * 0.18), 10, 12, 0xfff6a8); p.rect(w - 13, Math.round(h * 0.18) + 2, 7, 1, 0x5a5a8a); p.rect(w - 13, Math.round(h * 0.18) + 5, 8, 1, 0x5a5a8a); p.rect(w - 13, Math.round(h * 0.18) + 8, 5, 1, 0xc83a3a);
  p.rect(w - 10, Math.round(h * 0.18) - 1, 2, 2, 0xe5383b);
  // scuffs near the bottom
  for (let y = h - 8; y < h - 1; y++) for (let x = 2; x < w - 2; x++) if (hash2(x, y) < 0.2) p.px(x, y, 0xb8ac94, 120);
  return p;
}

// ------------------------------------------------------------------ posters
/** Poster for the Mikan Run game on the PC (unit-mapped). */
export function posterMikanRun(w = 48, h = 68) {
  const p = new Pix(w, h, 101);
  p.gradient(0, 0, w, Math.round(h * 0.62), 0x5a4a9a, 0xff9a5a);
  p.circle(Math.round(w * 0.7), Math.round(h * 0.5), 7, 0xffd870);
  for (let x = 0; x < w; x++) { const r = Math.round(h * 0.55 - (hash2(Math.floor(x / 5), 3) * 8)); for (let y = r; y < h * 0.66; y++) p.px(x, y, 0x3a2a4a); }
  p.rect(0, Math.round(h * 0.66), w, h - Math.round(h * 0.66), 0x4a4048);
  p.rect(0, Math.round(h * 0.72), w, 1, 0xf4f0e6);
  // Mikan mid-leap
  const cat = ['...O.O....', '..OOOOO...', '.OWKWKO...', '.OWWWWOOOO', 'OOWWOOOOOW', '.WWOOOWOO.', '.W.W..W.W.'];
  p.sprite(cat, { O: 0xf08a3a, W: 0xfbf6ec, K: 0x2a2020 }, Math.round(w * 0.24), Math.round(h * 0.4), 2);
  p.rect(Math.round(w * 0.55), Math.round(h * 0.62), 4, 5, 0xff8c2e); p.rect(Math.round(w * 0.55) + 1, Math.round(h * 0.6), 2, 2, 0xff8c2e);
  p.text('MIKAN', w / 2, 2, { size: 16, font: FONT_EN, color: 0xffd23f, align: 'center', outline: 0x2a1a3a });
  p.text('RUN!', w / 2, 15, { size: 16, font: FONT_EN, color: 0xffffff, align: 'center', outline: 0x2a1a3a });
  p.tinyText('CAPSULE OS 98', w / 2, h - 9, { color: 0xffd8a0, align: 'center' });
  p.frame(0, 0, w, h, 0xf4f0e6);
  p.noise(0.03);
  return p;
}

/** A retro "kaiju vs. robot" film poster, original. */
export function posterKaiju(w = 48, h = 68) {
  const p = new Pix(w, h, 111);
  p.gradient(0, 0, w, h, 0x1a2a4a, 0x8a2a2a);
  for (let i = 0; i < 18; i++) p.px(Math.floor(hash2(i, 1) * w), Math.floor(hash2(i, 2) * h * 0.4), 0xfff4c8);
  // city skyline
  for (let x = 0; x < w; x++) { const t = Math.round(h * 0.7 - (hash2(Math.floor(x / 4), 9) * 12)); for (let y = t; y < h; y++) p.px(x, y, (x % 4 === 1 && y % 3 === 0 && hash2(x, y) < 0.5) ? 0xffd870 : 0x141420); }
  // the kaiju silhouette, green with a glowing back
  const kj = ['....GG......', '...GGGG.....', '...GWGG.....', '..GGGGG.....', '.GGGGGGG....', 'GGGGGGGGG...', '..GGGGGGGG..', '..GG.GGGGGG.', '..GG..GG..GG', '..GG..GG....'];
  p.sprite(kj, { G: 0x3a8a4a, W: 0xffff80 }, 6, Math.round(h * 0.38), 2);
  for (let i = 0; i < 5; i++) p.px(14 + i * 2, Math.round(h * 0.38) + 6 - i, 0x9affc8);
  p.text('KAIJU', w / 2, 2, { size: 16, font: FONT_EN, color: 0xff5a3a, align: 'center', outline: 0x1a0a0a });
  p.tinyText('VS. MECHA-TANUKI', w / 2, 18, { color: 0xffe0a0, align: 'center' });
  p.tinyText('NOW SHOWING', w / 2, h - 9, { color: 0xffffff, align: 'center' });
  p.frame(0, 0, w, h, 0xe8e0d0);
  p.noise(0.04);
  return p;
}

/** A pin-up of a (fictional) 80s idol singer, original. */
export function posterIdol(w = 48, h = 68) {
  const p = new Pix(w, h, 121);
  p.gradient(0, 0, w, h, 0xffd0e0, 0x9ad0ff);
  for (let i = 0; i < 30; i++) p.px(Math.floor(hash2(i, 5) * w), Math.floor(hash2(i, 6) * h), 0xffffff);
  const cx = Math.round(w / 2), cy = Math.round(h * 0.42);
  // hair, face, mic
  p.circle(cx, cy, 11, 0x3a2420); p.rect(cx - 11, cy, 22, 14, 0x3a2420);
  p.circle(cx, cy + 2, 7, 0xffd9bf);
  p.rect(cx - 7, cy - 6, 14, 4, 0x3a2420);
  p.px(cx - 3, cy + 2, 0x2a2020); p.px(cx + 3, cy + 2, 0x2a2020); p.px(cx - 4, cy + 4, 0xff9fae); p.px(cx + 4, cy + 4, 0xff9fae);
  p.rect(cx - 1, cy + 6, 3, 1, 0xd83a5a);
  p.rect(cx - 9, cy + 10, 18, 14, 0xff6f91); p.rect(cx - 9, cy + 10, 18, 2, 0xffffff);
  p.rect(cx + 7, cy + 4, 2, 7, 0x2a2a2a); p.circle(cx + 8, cy + 3, 2, 0xc8ccd2);
  p.circle(cx - 6, cy - 9, 2, 0xff3a6a);
  p.text('YUKI', w / 2, h - 30, { size: 16, font: FONT_EN, color: 0xffffff, align: 'center', outline: 0xd83a7a });
  p.tinyText('SUMMER LIVE', w / 2, h - 13, { color: 0x2a3a8a, align: 'center' });
  p.frame(0, 0, w, h, 0xffffff);
  p.noise(0.02);
  return p;
}

const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
const MDAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
/** In-game calendar date for a day number: day 1 is the 1st of August (it's summer in the lane). */
export function dateOf(day) {
  let m = 7, d = Math.max(1, day | 0);
  while (d > MDAYS[m]) { d -= MDAYS[m]; m = (m + 1) % 12; }
  // weekday: August 1st is a Monday in this little world
  const wd = ((Math.max(1, day | 0) - 1) % 7);
  return { month: m, date: d, wd, monthName: MONTHS[m], wdName: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'][wd] };
}

/** Wall calendar (redrawn when the day changes): a scenic top half and the month grid with today circled. */
export function drawCalendar(p, day) {
  const { w, h } = p;
  const { month, date, monthName } = dateOf(day);
  // first weekday of the month
  const first = ((((day | 0) - date) % 7) + 7) % 7;
  p.fill(0xfbf8f0);
  // top half: a summer picture (sea, sky and a capsule-shaped sun)
  const ph = Math.round(h * 0.42);
  p.gradient(2, 2, w - 4, Math.round(ph * 0.6), 0x6ac0f0, 0xc8ecff);
  p.rect(2, 2 + Math.round(ph * 0.6), w - 4, ph - Math.round(ph * 0.6), 0x2a8ad8);
  for (let x = 2; x < w - 2; x += 3) p.px(x, 2 + Math.round(ph * 0.6) + 2 + (x % 2), 0xc8ecff);
  p.circle(w - 12, 9, 4, 0xfff4a0);
  p.rect(6, ph - 6, 12, 4, 0xe8d8a0);
  p.px(10, ph - 10, 0xe5383b); p.rect(9, ph - 9, 3, 3, 0xff6f91);
  // two spiral rings at the top
  for (const x of [Math.round(w * 0.3), Math.round(w * 0.7)]) { p.rect(x, 0, 2, 3, 0x8a8e94); }
  p.text(String(month + 1), 4, ph + 1, { size: 16, font: FONT_EN, color: 0xd83a3a });
  p.tinyText(monthName, 18, ph + 6, { color: 0x3a3a4a });
  const gy = ph + 17, cw = (w - 6) / 7, ch = Math.max(6, Math.floor((h - gy - 2) / 6));
  'MTWTFSS'.split('').forEach((c, i) => p.tinyText(c, Math.round(3 + i * cw + cw / 2), gy - 8, { color: i >= 5 ? 0xd83a3a : 0x6a6a7a, align: 'center' }));
  const n = MDAYS[month];
  for (let d = 1; d <= n; d++) {
    const idx = first + d - 1, cx = Math.round(3 + (idx % 7) * cw + cw / 2), cy = gy + Math.floor(idx / 7) * ch;
    const col = idx % 7 >= 5 ? 0xd83a3a : 0x3a3a4a;
    if (d < date) { p.line(cx - 3, cy, cx + 3, cy + 6, 0xe86a6a); p.line(cx + 3, cy, cx - 3, cy + 6, 0xe86a6a); continue; }
    p.tinyText(String(d), cx, cy, { color: col, align: 'center' });
    if (d === date) {
      for (let a = 0; a < 24; a++) { const t = (a / 24) * Math.PI * 2; p.px(Math.round(cx + Math.cos(t) * 6), Math.round(cy + 3 + Math.sin(t) * 5), 0xe5383b); }
    }
  }
  p.frame(0, 0, w, h, 0xc8c0b0);
  return p;
}

// ------------------------------------------------------------------ the view outside the window
/** Far layer: the dusk sky with a low sun, streaky clouds, the skyline and the railway embankment. */
export function viewSky(w = 320, h = 180) {
  const p = new Pix(w, h, 131);
  const bands = [[0, 0x3a3a7a], [0.22, 0x6a4a8a], [0.42, 0xc8608a], [0.6, 0xff9a6a], [0.78, 0xffc87a], [1, 0xffe6a8]];
  for (let y = 0; y < h; y++) {
    const t = y / (h - 1);
    let i = 0; while (i < bands.length - 2 && t > bands[i + 1][0]) i++;
    const k = (t - bands[i][0]) / (bands[i + 1][0] - bands[i][0]);
    for (let x = 0; x < w; x++) {
      const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5][(y % 4) * 4 + (x % 4)];
      const q = Math.min(1, Math.floor(k * 6 + (B + 0.5) / 16) / 6);
      p.px(x, y, mix(bands[i][1], bands[i + 1][1], q));
    }
  }
  // sun low over the rooftops with a halo
  const sx = Math.round(w * 0.62), sy = Math.round(h * 0.7);
  for (let r = 22; r > 9; r -= 3) p.circle(sx, sy, r, 0xffd890, 40);
  p.circle(sx, sy, 9, 0xfff0c0);
  // long glowing cloud streaks
  for (let k = 0; k < 9; k++) {
    const cy = Math.round(h * (0.12 + hash2(k, 1) * 0.5)), cx = Math.round(hash2(k, 2) * w), len = 30 + Math.round(hash2(k, 3) * 70);
    const lit = cy > h * 0.35 ? 0xffb07a : 0xd87a9a;
    for (let i = 0; i < len; i++) {
      const x = (cx + i) % w, th = i < 6 || i > len - 6 ? 1 : 2 + (hash2(k, i >> 3) < 0.4 ? 1 : 0);
      for (let t = 0; t < th; t++) p.px(x, cy + t, t === th - 1 ? shade(lit, 0.8) : lit);
    }
  }
  // birds
  for (let k = 0; k < 4; k++) { const x = Math.round(w * (0.2 + k * 0.07)), y = Math.round(h * (0.3 + hash2(k, 7) * 0.1)); p.px(x - 1, y, 0x2a2030); p.px(x, y + 1, 0x2a2030); p.px(x + 1, y, 0x2a2030); }
  // distant skyline (blue-grey, a few lit windows) and the railway embankment with a train
  for (let x = 0; x < w; x++) {
    const bw = 6 + Math.floor(hash2(Math.floor(x / 14), 4) * 10);
    const top = Math.round(h * 0.72 - hash2(Math.floor(x / bw), 5) * h * 0.14);
    for (let y = top; y < h; y++) p.px(x, y, (hash2(x >> 1, y >> 1) < 0.04 && y > top + 2) ? 0xffd890 : shade(0x5a4a6a, 0.95 + (y - top) * 0.002));
  }
  const ey = Math.round(h * 0.84);
  for (let x = 0; x < w; x++) for (let y = ey; y < h; y++) p.px(x, y, y === ey ? 0x6a5a5a : 0x4a3a44);
  for (let x = Math.round(w * 0.12); x < w * 0.48; x++) {
    for (let y = ey - 9; y < ey - 1; y++) p.px(x, y, y === ey - 9 ? 0x9aa0a8 : 0xc8ccd0);
    if ((x - Math.round(w * 0.12)) % 7 < 4) for (let y = ey - 7; y < ey - 4; y++) p.px(x, y, 0xffe2a0);
    p.px(x, ey - 3, 0x3aa86a);
  }
  return p;
}

/** Middle layer (transparent sky): the houses across the lane, poles and wires, lit windows, the street lamp. */
export function viewLane(w = 320, h = 180) {
  const p = new Pix(w, h, 141);
  for (let i = 0; i < p.d.length; i += 4) p.d[i + 3] = 0;
  p.dirty = true;
  const roofs = [0x4a4a5a, 0x5a4a52, 0x3a4a5a, 0x5a5048];
  const walls = [0xb8a890, 0xa89a88, 0xc0b098, 0x9a948a];
  let x = 0, k = 0;
  while (x < w) {
    const bw = 44 + Math.floor(hash2(k, 1) * 40), top = Math.round(h * (0.38 + hash2(k, 2) * 0.12)), wall = walls[k % 4], roof = roofs[(k + 1) % 4];
    // gable roof
    const ridge = top - 10;
    for (let xx = x; xx < Math.min(w, x + bw); xx++) {
      const t = Math.abs(xx - (x + bw / 2)) / (bw / 2);
      const ry = Math.round(ridge + t * 12);
      for (let y = ry; y < top + 2; y++) p.px(xx, y, y === ry ? shade(roof, 1.4) : shade(roof, 0.9 + ((y - ry) % 3 === 0 ? 0.1 : 0)));
      for (let y = top + 2; y < h; y++) p.px(xx, y, shade(wall, 0.7 + 0.25 * (1 - (y - top) / h) + hash2(xx, y) * 0.04));
    }
    // windows: some lit warm, one with a TV glow
    const nWin = 2 + Math.floor(hash2(k, 3) * 2);
    for (let i = 0; i < nWin; i++) {
      const wx = x + 6 + Math.round(i * (bw - 18) / Math.max(1, nWin - 1)), wy = top + 10 + (i % 2) * 2, ww = 10, wh = 9;
      const lit = hash2(k, i + 7) < 0.65, tv = hash2(k, i + 9) < 0.15;
      p.rect(wx - 1, wy - 1, ww + 2, wh + 2, 0x3a3434);
      p.rect(wx, wy, ww, wh, lit ? (tv ? 0x8ab8ff : 0xffd890) : 0x4a5468);
      if (lit) { p.rect(wx, wy, ww, 2, tv ? 0xc8e0ff : 0xfff0c0); p.rect(wx + (ww >> 1), wy, 1, wh, 0x6a5a4a); }
    }
    // a little shop awning on one of them
    if (k === 2) { for (let xx = x + 4; xx < x + bw - 4; xx++) for (let y = top + 28; y < top + 33; y++) p.px(xx, y, ((xx >> 2) % 2) ? 0xe5383b : 0xf4f0e6); }
    x += bw + 2; k++;
  }
  // block wall along the far side of the lane, then the lane itself
  const wy = Math.round(h * 0.74);
  for (let xx = 0; xx < w; xx++) for (let y = wy; y < h; y++) {
    const row = Math.floor((y - wy) / 4), off = row % 2 ? 6 : 0;
    p.px(xx, y, ((xx + off) % 12 === 0 || (y - wy) % 4 === 0) ? 0x7a7470 : shade(0x9a948c, 0.92 + hash2(xx, y) * 0.08));
  }
  // utility poles with transformers and sagging wires
  const poles = [Math.round(w * 0.18), Math.round(w * 0.74)];
  for (const px of poles) {
    for (let y = Math.round(h * 0.06); y < h; y++) { p.px(px, y, 0x3a302c); p.px(px + 1, y, 0x5a4a40); p.px(px + 2, y, 0x3a302c); }
    for (let xx = px - 10; xx <= px + 12; xx++) { p.px(xx, Math.round(h * 0.12), 0x2a2420); p.px(xx, Math.round(h * 0.2), 0x2a2420); }
    p.rect(px + 3, Math.round(h * 0.24), 6, 9, 0x6a6a70); p.rect(px + 3, Math.round(h * 0.24), 6, 1, 0x9a9aa0);
    // stripes at the bottom (yellow/black safety cover)
    for (let y = Math.round(h * 0.82); y < h; y++) for (let xx = px - 1; xx < px + 4; xx++) p.px(xx, y, ((xx + y) % 6 < 3) ? 0xffd23f : 0x2a2a2a);
  }
  for (const [y0, sag] of [[0.12, 10], [0.2, 8], [0.16, 14]]) {
    const ya = Math.round(h * y0);
    for (let xx = -10; xx < w + 10; xx++) {
      const seg = xx < poles[0] ? [-60, poles[0]] : xx < poles[1] ? [poles[0], poles[1]] : [poles[1], w + 60];
      const t = (xx - seg[0]) / (seg[1] - seg[0]);
      p.px(xx, Math.round(ya + Math.sin(t * Math.PI) * sag), 0x241e24);
    }
  }
  // a street lamp glowing on the left pole, and a vending machine by the wall
  const lx = poles[0] + 3, ly = Math.round(h * 0.42);
  p.rect(lx, ly, 8, 2, 0x5a5a60); p.rect(lx + 2, ly + 2, 6, 2, 0xfff4d0);
  for (let r = 8; r > 2; r -= 2) p.circle(lx + 5, ly + 4, r, 0xffe8a0, 40);
  const vx = Math.round(w * 0.55), vy = Math.round(h * 0.62);
  p.rect(vx, vy, 14, 26, 0xe8e8f0); p.rect(vx + 2, vy + 3, 10, 9, 0xa8e0ff);
  for (let i = 0; i < 4; i++) p.rect(vx + 2 + i * 3, vy + 5, 2, 4, [0xe5383b, 0xffd23f, 0x3cae5a, 0x2f6fd6][i]);
  p.rect(vx + 2, vy + 14, 10, 2, 0x4a4a52);
  for (let r = 10; r > 3; r -= 3) p.circle(vx + 7, vy + 8, r, 0xd8f0ff, 25);
  return p;
}

/** Near layer: the apartment's own balcony railing, the laundry pole and a hanging towel (transparent). */
export function viewNear(w = 200, h = 140) {
  const p = new Pix(w, h, 151);
  for (let i = 0; i < p.d.length; i += 4) p.d[i + 3] = 0;
  p.dirty = true;
  const ry = Math.round(h * 0.6);
  // aluminium railing
  p.rect(0, ry, w, 3, 0xb8bcc2); p.rect(0, ry + 3, w, 1, 0x7a7e84);
  for (let x = 2; x < w; x += 7) for (let y = ry + 4; y < h; y++) p.px(x, y, (y % 9 === 0) ? 0x9aa0a6 : 0xa8acb2);
  p.rect(0, h - 4, w, 4, 0x8a8e94);
  // a potted asagao (morning glory) climbing the rail, a pair of sandals
  p.rect(Math.round(w * 0.78), ry + 18, 14, 12, 0xc8643a); p.rect(Math.round(w * 0.78), ry + 18, 14, 2, 0xe0804a);
  for (let i = 0; i < 26; i++) { const xx = Math.round(w * 0.8 + Math.sin(i * 0.6) * 3), yy = ry + 18 - i; p.px(xx, yy, 0x3a8a3a); if (i % 5 === 0) { p.px(xx + 2, yy, 0x58b058); p.px(xx + 3, yy - 1, 0x58b058); } }
  for (const [xx, yy, c] of [[w * 0.8 - 4, ry - 6, 0x6a5aff], [w * 0.8 + 3, ry - 2, 0xd85ab8], [w * 0.8 - 2, ry + 6, 0x6a8aff]]) { p.circle(Math.round(xx), Math.round(yy), 2, c); p.px(Math.round(xx), Math.round(yy), 0xffffff); }
  // laundry pole with a towel and socks drying
  const py = Math.round(h * 0.1);
  p.rect(0, py, w, 2, 0x6aa0c8);
  p.rect(Math.round(w * 0.2), py + 2, 16, 26, 0xf4f0e6); for (let y = py + 4; y < py + 28; y += 4) p.rect(Math.round(w * 0.2), y, 16, 1, 0x8ad0c8);
  for (const xx of [Math.round(w * 0.45), Math.round(w * 0.5)]) { p.rect(xx, py + 2, 3, 10, 0xf4f0e6); p.rect(xx, py + 10, 5, 3, 0xf4f0e6); p.rect(xx, py + 2, 3, 2, 0xd83a3a); }
  p.rect(Math.round(w * 0.45) - 1, py - 1, 9, 2, 0xff8fb0);
  return p;
}
