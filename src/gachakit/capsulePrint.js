// Printed matter that travels with a capsule, as pixel art:
//  * seriesSheet(id): the mini-book folded into every capsule, laid out like a Japanese capsule-toy flyer (cover: the
//    maker's strip, the series logo, 1回 price burst, 全N種, a hero shot, 対象年齢 box; inside: ラインナップ grid with
//    numbered shots and a ひみつ silhouette, 誤飲注意, the 発売元 line), the tamper sticker that bridges the seam, and
//    the colour swatches the bagged parts are cast in;
//  * sealSheet(): what every capsule shares: the printed shrink band, the foil sticker, wax and hanko seals (whole
//    and cracked), the 当 sticker of a special finish, the glitter flecks' frames.
// Every mark is the game's own (GG / ガチャガレージ). Thumbnails of the figures are used when the game has them
// cached (setPrintThumbs): sheets drawn before that are redrawn by refreshPrints().
import * as THREE from 'three';
import { Pix } from '../gfx/pix.js';
import { SERIES_BY_ID } from '../data/series/index.js';

const hex = (s, d) => parseInt(String(s || d).replace('#', ''), 16);
const mixc = (a, b, t) => { const f = (s) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t); return (f(16) << 16) | (f(8) << 8) | f(0); };
export const PRINT_GLYPHS = 'ガチャガレージ全種回円対象年齢才以上ラインナップひみつ誤飲注意小さな部品があります発売元未開封はがすシークレットあり当封秘故障の際は係員までお知らせください返却コイン投入口とりだし見本';

let THUMBS = null;
export function setPrintThumbs(t) { THUMBS = t; }
function thumbOf(key) {
  if (!THUMBS) return null;
  for (const s of [96, 64, 48, 32]) { const c = THUMBS.cache.get(`${key}|normal|${s}|0`); if (c) return c; }
  return null;
}

const SW = 512, SH = 256;
export const SHEET = { cover: [0, 0, 192, 256], inside: [192, 0, 192, 256], sticker: [384, 0, 64, 96], sw: [[388, 108], [420, 108], [452, 108], [484, 108]] };
/** uv rectangle [u0, v0, u1, v1] (v up) of a pixel rectangle [x, y, w, h] in a sheet. */
export const uvRect = ([x, y, w, h], W = SW, H = SH) => [x / W, 1 - (y + h) / H, (x + w) / W, 1 - y / H];

const sheets = new Map();
export function seriesSheet(id) {
  if (sheets.has(id)) return sheets.get(id);
  const pix = new Pix(SW, SH, 11);
  const tex = pix.texture();
  tex.generateMipmaps = true;
  const sheet = { id, pix, tex, complete: false, mat: null };
  sheet.mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0, alphaTest: 0.5, side: THREE.DoubleSide, envMapIntensity: 0.6 });
  sheet.mat.name = 'capsule-print';
  drawSeries(sheet);
  sheets.set(id, sheet);
  try { document.fonts?.load('16px "DotGothic16"', PRINT_GLYPHS + (SERIES_BY_ID[id]?.jp || '')).then(() => drawSeries(sheet), () => {}); } catch { /* no font loading */ }
  return sheet;
}
/** Redraw the sheets that were drawn before their thumbnails existed (a few per call). */
export function refreshPrints() {
  for (const s of sheets.values()) if (!s.complete && SERIES_BY_ID[s.id]?.items.every((i) => i.rarity === 'secret' || thumbOf(i.key))) drawSeries(s);
}

function burst(p, cx, cy, r, c, c2) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    const a = Math.atan2(y, x), d = Math.hypot(x, y), R = r * (0.78 + 0.22 * (Math.cos(a * 10) > 0 ? 1 : 0));
    if (d <= R) p.px(cx + x, cy + y, d > R - 2 ? c2 : c);
  }
}
function roundRect(p, x, y, w, h, c, r = 3) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const ex = Math.max(0, r - i, i - (w - 1 - r)), ey = Math.max(0, r - j, j - (h - 1 - r));
    if (ex * ex + ey * ey <= r * r + 1) p.px(x + i, y + j, c);
  }
}
function gg(p, cx, cy, c, bg) { p.circle(cx, cy, 9, c); p.circle(cx, cy, 7, bg); p.tinyText('GG', cx - 5, cy - 4, { color: c }); }
function drawThumb(p, cv, x, y, s) {
  p.flush();
  p.ctx.imageSmoothingEnabled = false;
  p.ctx.drawImage(cv, x, y, s, s);
  p.pull();
}
/** Break a kana title into lines of at most n glyphs, never leaving one alone. */
function wrapJP(s, n) {
  const out = [];
  let t = [...s];
  while (t.length > n) { let k = n; if (t.length - k === 1) k--; out.push(t.slice(0, k).join('')); t = t.slice(k); }
  out.push(t.join(''));
  return out;
}

function drawSeries(sheet) {
  const S = SERIES_BY_ID[sheet.id] || { name: sheet.id, jp: 'カプセルトイ', price: 100, items: [], card: {} };
  const p = sheet.pix, C = S.card || {};
  const bg = hex(C.bg, '#fff3e0'), ac = hex(C.accent, '#e5383b'), ac2 = hex(C.accent2, '#ffd23f'), ink = hex(C.text, '#3a2a30');
  const paper = mixc(bg, 0xffffff, 0.35), bgd = mixc(bg, ac, 0.16), white = 0xfffdf6, red = 0xd8262e;
  p.ctx.clearRect(0, 0, SW, SH); p.pull();
  const items = S.items || [], shown = items.filter((i) => i.rarity !== 'secret'), secret = items.some((i) => i.rarity === 'secret');
  let complete = !!THUMBS;

  // ---------------- cover
  {
    const [X, Y, W, H] = SHEET.cover;
    p.rect(X, Y, W, H, paper);
    for (let j = 0; j < H; j += 12) for (let i = (j / 12) % 2 ? 6 : 0; i < W; i += 12) p.rect(X + i, Y + j, 3, 3, bgd); // dot screen
    p.rect(X, Y, W, 24, ac); p.rect(X, Y + 24, W, 2, mixc(ac, 0x000000, 0.3));
    gg(p, X + 13, Y + 12, white, ac);
    p.text('ガチャガレージ', X + 28, Y + 3, { size: 16, color: white });
    p.tinyText('No.' + String(S.order || 1).padStart(2, '0'), X + W - 4, Y + 8, { color: ac2, align: 'right' });
    // the logo: big kana, white outline, a drop of the accent
    const lines = wrapJP(S.jp || S.name, 5).slice(0, 2);
    lines.forEach((l, k) => p.text(l, X + W / 2 + (k ? 6 : -6), Y + 30 + k * 34, { size: 32, color: ink, outline: white, shadow: ac, align: 'center' }));
    const y1 = Y + 30 + lines.length * 34 + 4;
    // hero shot on a sunburst panel
    const hero = items.find((i) => i.rarity === 'ultra') || items.find((i) => i.rarity === 'rare') || items[0];
    const hx = X + 14, hy = y1, hs = 92;
    roundRect(p, hx - 3, hy - 3, hs + 6, hs + 6, ink, 5); roundRect(p, hx - 1, hy - 1, hs + 2, hs + 2, white, 4);
    for (let j = 0; j < hs; j++) for (let i = 0; i < hs; i++) { const a = Math.atan2(j - hs / 2, i - hs / 2); p.px(hx + i, hy + j, Math.floor((a / Math.PI + 1) * 8) % 2 ? mixc(ac2, white, 0.55) : mixc(ac2, white, 0.25)); }
    const hc = hero && thumbOf(hero.key);
    if (hc) drawThumb(p, hc, hx + 2, hy + 2, hs - 4);
    else { complete = false; p.text('？', hx + hs / 2, hy + hs / 2 - 20, { size: 32, color: ink, outline: white, align: 'center' }); }
    // the price burst and the count
    burst(p, X + 150, hy + 26, 30, ac2, red);
    p.text('1回', X + 150, hy + 6, { size: 16, color: red, align: 'center' });
    { const s = `¥${S.price || 100}`, pw = Math.round(s.length * 6 * 2); let px = X + 150 - Math.round(pw / 2); for (const ch of s) { const m = new Pix(8, 9); m.tinyText(ch, 0, 0, { color: red }); for (let j = 0; j < 9; j++) for (let i = 0; i < 8; i++) if (m.d[(j * 8 + i) * 4 + 3]) p.rect(px + i * 2, hy + 26 + j * 2, 2, 2, red); px += 12; } }
    roundRect(p, X + 118, hy + 62, 66, 24, red, 5);
    p.text(`全${shown.length + (secret ? 1 : 0)}種`, X + 151, hy + 65, { size: 16, color: white, align: 'center' });
    if (secret) { roundRect(p, X + 6, hy + hs + 8, 138, 20, ink, 4); p.text('シークレットあり', X + 75, hy + hs + 9, { size: 16, color: ac2, align: 'center' }); }
    // the age box and the maker's line
    p.rect(X + 6, Y + H - 40, W - 12, 22, white); p.frame(X + 6, Y + H - 40, W - 12, 22, ink);
    p.text('対象年齢15才以上', X + W / 2, Y + H - 38, { size: 16, color: ink, align: 'center' });
    p.rect(X, Y + H - 14, W, 14, ink);
    p.tinyText('(C)GG CAPSULE CO.  1999', X + W / 2, Y + H - 11, { color: white, align: 'center' });
  }
  // ---------------- inside: the line-up
  {
    const [X, Y, W, H] = SHEET.inside;
    p.rect(X, Y, W, H, white);
    p.rect(X, Y, W, 22, ac);
    p.text('ラインナップ', X + 8, Y + 2, { size: 16, color: white });
    p.tinyText(`ALL ${shown.length + (secret ? 1 : 0)}`, X + W - 6, Y + 7, { color: ac2, align: 'right' });
    const cells = [...shown.slice(0, secret ? 8 : 9), ...(secret ? [null] : [])];
    const cols = 3, cw = 62, chh = cells.length > 6 ? 56 : 80;
    cells.forEach((it, n) => {
      const cx = X + 3 + (n % cols) * cw, cy = Y + 26 + Math.floor(n / cols) * chh, s = Math.min(cw - 6, chh - 18);
      const tx = cx + Math.round((cw - s) / 2);
      roundRect(p, tx - 1, cy - 1, s + 2, s + 2, it ? mixc(bg, white, 0.3) : ink, 4);
      if (it) {
        const cv = thumbOf(it.key);
        if (cv) drawThumb(p, cv, tx, cy, s);
        else { complete = false; p.rect(tx + 6, cy + 6, s - 12, s - 12, mixc(ac2, white, 0.3)); }
        const nm = it.name.toUpperCase().split(' ');
        let line = nm.shift() || '';
        while (nm.length && (line + ' ' + nm[0]).length <= 10) line += ' ' + nm.shift();
        p.tinyText(line.slice(0, 10), cx + cw / 2, cy + s + 2, { color: ink, align: 'center' });
        if (nm.length) p.tinyText(nm.join(' ').slice(0, 10), cx + cw / 2, cy + s + 10, { color: ink, align: 'center' });
      } else {
        p.text('？', tx + s / 2, cy + s / 2 - (s > 44 ? 20 : 10), { size: s > 44 ? 32 : 16, color: ac2, align: 'center' });
        p.tinyText('SECRET', cx + cw / 2, cy + s + 2, { color: red, align: 'center' });
      }
      p.circle(tx + 5, cy + 5, 5, it ? ac : red); p.tinyText(String(n + 1), tx + 3, cy + 1, { color: white });
    });
    // warnings and the maker
    const wy = Y + H - 60;
    p.rect(X + 4, wy, 70, 20, ac2); p.frame(X + 4, wy, 70, 20, ink);
    p.text('誤飲注意', X + 39, wy + 1, { size: 16, color: red, align: 'center' });
    p.tinyText('SMALL PARTS.', X + 80, wy + 2, { color: ink }); p.tinyText('NOT FOR UNDER 3', X + 80, wy + 11, { color: ink });
    p.text('小さな部品があります', X + W / 2, wy + 22, { size: 16, color: ink, align: 'center' });
    p.rect(X, Y + H - 20, W, 20, mixc(bg, ac, 0.3));
    p.text('発売元 ガチャガレージ', X + W / 2, Y + H - 19, { size: 16, color: ink, align: 'center' });
  }
  // ---------------- the tamper sticker over the seam (its teeth are cut where the halves part)
  {
    const [X, Y, W, H] = SHEET.sticker;
    roundRect(p, X, Y, W, H, ac, 7); roundRect(p, X + 3, Y + 3, W - 6, H - 6, white, 5);
    gg(p, X + W / 2, Y + 18, ac, white);
    p.rect(X + 3, Y + 34, W - 6, 28, ac);
    p.text('未開封', X + W / 2, Y + 40, { size: 16, color: white, align: 'center' });
    for (let i = 6; i < W - 6; i += 6) p.rect(X + i, Y + 68, 3, 3, ac2);
    p.tinyText('SEAL', X + W / 2, Y + 76, { color: ink, align: 'center' });
    p.tinyText(`¥${S.price || 100}`, X + W / 2, Y + 85, { color: red, align: 'center' });
  }
  [bg, ac, ac2, ink].forEach((c, k) => p.rect(SHEET.sw[k][0] - 4, SHEET.sw[k][1] - 4, 24, 24, k === 0 ? mixc(c, 0xffffff, 0.2) : c));
  p.flush();
  sheet.complete = complete;
  sheet.tex.needsUpdate = true;
}

// ----------------------------------------------------------------------------- the shared seal sheet
export const SEALS = {
  band: [0, 0, 256, 32], foil: [0, 40, 64, 96], wax: [72, 40, 64, 64], waxCracked: [144, 40, 64, 64], hanko: [216, 40, 64, 64], hankoCracked: [288, 40, 64, 64],
  atari: [72, 112, 32, 32], glitter: [112, 112, 32, 32], band2: [256, 0, 256, 32], washi: [360, 40, 64, 160],
};
let seal = null;
export function sealSheet() {
  if (seal) return seal;
  const pix = new Pix(SW, SH, 5), tex = pix.texture();
  seal = { pix, tex };
  // print: cut out, matte; film: the band's see-through base
  seal.mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0, alphaTest: 0.5, side: THREE.DoubleSide, envMapIntensity: 0.6 });
  seal.mat.name = 'capsule-seal';
  drawSeals();
  try { document.fonts?.load('16px "DotGothic16"', PRINT_GLYPHS).then(drawSeals, () => {}); } catch { /* no font loading */ }
  return seal;
}
const bandMats = new Map();
/** The shrink band's material, tinted (the film is translucent, the print solid). */
export function bandMaterial(color) {
  if (bandMats.has(color)) return bandMats.get(color);
  const m = new THREE.MeshStandardMaterial({ map: sealSheet().tex, color, roughness: 0.35, metalness: 0, transparent: true, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 0.6 });
  m.name = 'capsule-band';
  bandMats.set(color, m);
  return m;
}

function drawSeals() {
  const p = seal.pix, W = 0xffffff, ink = 0x2a2026, red = 0xc8262c;
  p.ctx.clearRect(0, 0, SW, SH); p.pull();
  // the shrink band: clear film, a solid edge stripe top and bottom, the print between (white: the tint colours it)
  const band = ([X, Y, w, h], word, dark) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const o = ((Y + j) * SW + X + i) * 4; p.d[o] = p.d[o + 1] = p.d[o + 2] = 255; p.d[o + 3] = 78; }
    p.dirty = true;
    p.rect(X, Y, w, 3, W); p.rect(X, Y + h - 3, w, 3, W);
    for (let i = 0; i < w; i += 128) {
      p.rect(X + i + 2, Y + 6, 60, 20, dark ? 0x3a3038 : W);
      p.text(word, X + i + 32, Y + 8, { size: 16, color: dark ? 0xf2d27a : 0x4a4048, align: 'center' });
      p.tinyText('GG', X + i + 70, Y + 8, { color: W }); p.tinyText('SEAL', X + i + 66, Y + 17, { color: W });
      for (let k = 0; k < 3; k++) p.sprite(['#..', '##.', '###', '##.', '#..'], { '#': W }, X + i + 98 + k * 8, Y + 12, 1); // peel this way
    }
    for (let i = 0; i < w; i += 4) p.px(X + i, Y + Math.round(h / 2), W, 200); // the perforation
  };
  band(SEALS.band, '未開封', false);
  band(SEALS.band2, '封印', true);
  // the foil sticker: hard diagonal bands of silver, a star, the maker's mark
  {
    const [X, Y, w, h] = SEALS.foil;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const ex = Math.max(0, 8 - i, i - (w - 9)), ey = Math.max(0, 8 - j, j - (h - 9));
      if (ex * ex + ey * ey > 66) continue;
      const d = (i + j * 1.2) % 40;
      p.px(X + i, Y + j, d < 8 ? 0xffffff : d < 20 ? 0xd6dce6 : d < 26 ? 0x9aa4b6 : 0xbcc4d2);
    }
    p.frame(X + 4, Y + 4, w - 8, h - 8, 0x6a7488);
    const star = (cx, cy, r, c) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const a = Math.atan2(y, x) + Math.PI / 2, d = Math.hypot(x, y), R = r * (0.45 + 0.55 * Math.pow(Math.abs(Math.cos(a * 2.5)), 1.6)); if (d <= R) p.px(cx + x, cy + y, c); } };
    star(X + 32, Y + 24, 15, 0x4a5468); star(X + 32, Y + 24, 12, 0xfff2a8);
    p.rect(X + 6, Y + 42, w - 12, 12, 0x4a5468); p.tinyText('GENUINE', X + 32, Y + 44, { color: W, align: 'center' });
    p.text('未開封', X + 32, Y + 58, { size: 16, color: 0x3a4458, align: 'center' });
    p.tinyText('GG', X + 32, Y + 80, { color: 0x3a4458, align: 'center' });
  }
  // wax seals from above: a blob with a pressed ring and a stamped mark; the cracked ones split on the seam line
  const wax = ([X, Y, w], base, mark, cracked, gold) => {
    const c = w / 2, lite = mixc(base, 0xffffff, 0.35), dark = mixc(base, 0x100008, 0.45);
    for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) {
      const a = Math.atan2(j - c, i - c), d = Math.hypot(i - c, j - c), R = 29 + Math.sin(a * 3 + 1) * 1.6 + Math.sin(a * 7) * 1.1;
      if (d > R) continue;
      const side = (-(i - c) - (j - c)) / (d + 1); // > 0: upper left
      let col = d > R - 3 ? (side > 0.2 ? lite : dark) : d > 21 ? base : d > 19 ? (side > 0 ? dark : lite) : mixc(base, 0x000000, 0.12);
      if (cracked && Math.abs(j - c + Math.round(Math.sin(i * 0.9) * 2.2 + Math.sin(i * 0.37) * 2)) < 1.2) col = 0x1a0a0c;
      p.px(X + i, Y + j, col);
    }
    const g = gold ? 0xf2d27a : lite;
    if (mark === 'GG') { p.tinyText('GG', X + c - 5, Y + c - 12, { color: g }); p.circle(X + c, Y + c + 5, 4, g); p.circle(X + c, Y + c + 5, 2, mixc(base, 0x000000, 0.12)); } else p.text(mark, X + c, Y + c - 17, { size: 32, color: g, align: 'center' });
    if (cracked) {
      // the same split again over the mark, and two side cracks
      for (let i = 4; i < w - 4; i++) p.px(X + i, Y + c - Math.round(Math.sin(i * 0.9) * 2.2 + Math.sin(i * 0.37) * 2), 0x1a0a0c);
      p.line(X + 20, Y + c, X + 13, Y + 14, 0x1a0a0c); p.line(X + 44, Y + c, X + 50, Y + 50, 0x1a0a0c);
    }
  };
  wax(SEALS.wax, 0xb8242c, 'GG', false, false); wax(SEALS.waxCracked, 0xb8242c, 'GG', true, false);
  wax(SEALS.hanko, 0xd0401c, '封', false, true); wax(SEALS.hankoCracked, 0xd0401c, '封', true, true);
  // 当: the little round sticker of a special finish
  { const [X, Y] = SEALS.atari; p.circle(X + 16, Y + 16, 15, 0xffe27a); p.circle(X + 16, Y + 16, 13, red); p.text('当', X + 16, Y + 7, { size: 16, color: 0xfff6d8, align: 'center' }); }
  // glitter flecks: 4 columns (each a phase) x 4 frames: a four-point star, a small one, a dot, nothing
  {
    const [X, Y] = SEALS.glitter;
    const F = [['...#....', '...#....', '..###...', '#######.', '..###...', '...#....', '...#....', '........'], ['........', '...#....', '...#....', '.#####..', '...#....', '...#....', '........', '........'], ['........', '........', '...#....', '..###...', '...#....', '........', '........', '........'], ['........', '........', '........', '...#....', '........', '........', '........', '........']];
    for (let col = 0; col < 4; col++) for (let f = 0; f < 4; f++) p.sprite(F[(f + col) % 4], { '#': col % 2 ? 0xfff6c8 : W }, X + col * 8, Y + f * 8, 1);
  }
  // a strip of washi with brushed characters (the secret capsule's paper charm)
  {
    const [X, Y, w, h] = SEALS.washi;
    p.rect(X + 8, Y, w - 16, h, 0xf4ead2);
    for (let j = 5; j < h; j += 9) p.px(X + 12 + ((j * 7) % (w - 26)), Y + j, 0xd8c8a0);
    p.frame(X + 11, Y + 3, w - 22, h - 6, red);
    p.text('秘', X + w / 2, Y + 14, { size: 32, color: ink, align: 'center' });
    p.text('封', X + w / 2, Y + 110, { size: 32, color: ink, align: 'center' });
    p.rect(X + 18, Y + 62, 28, 28, red); p.rect(X + 21, Y + 65, 22, 22, 0xf4ead2); p.text('印', X + w / 2, Y + 68, { size: 16, color: red, align: 'center' });
  }
  p.flush();
  seal.tex.needsUpdate = true;
}
