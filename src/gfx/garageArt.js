// The garage's surfaces and hand-made art (src/world/Garage.js, GarageDetail.js). Nothing here is generated:
//   * every real material is a photograph from the shared library (src/kit/photoTex.js: wood, plywood, zinc, concrete,
//     blocks, plaster, tiles, cloth ...), mapped at its real size (uvs are metres):  surface(name) -> THREE.Texture
//   * what is painted or stuck on top is drawn by hand and placed deliberately:
//       shutterInk()   the lettering stencilled across the roll shutter (出入口につき 駐車禁止), with alpha
//       marks()        floor and wall marks, each one an authored shape: cracks, the oil where the engine sat, tyre
//                      tracks, water and rust runs, scuffs, painted lines, a soft contact shadow  -> { tex, rect }
//       prints()       printed matter as detailed pixel art (nearest filtering): the sign board, the noren's crest and
//                      kana, the lanterns, the stickers and plates of a real Japanese garage (火の用心, 消火器, 分電盤,
//                      点検済, 安全第一 ...)  -> { tex, rect, px }
//       The sign, the noren and their kana carry the shop's own logo and name (src/logo/logo.js): refreshShopPrints()
//       repaints them after 'logo:changed'; signPreview(L) / norenPreview(L) paint them for the editor.
// Every name, mark and maker here is made up.
import * as THREE from 'three';
import { Pix, FONT_EN, FONT_JP } from './pix.js';
import { photoTex, PHOTO_TEX } from '../kit/photoTex.js';
import { activeLogo, paintLogo } from '../logo/logo.js';

const hx = (c) => '#' + c.toString(16).padStart(6, '0');
/** A tone of colour c: k < 1 darker (toward a cool plum shadow), k > 1 lighter (toward warm white). */
export function tone(c, k) {
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  const m = k <= 1 ? [r * k + 24 * (1 - k), g * k + 18 * (1 - k), b * k + 36 * (1 - k)] : [r + (255 - r) * (k - 1) * 2, g + (250 - g) * (k - 1) * 2, b + (234 - b) * (k - 1) * 2];
  return (Math.max(0, Math.min(255, Math.round(m[0]))) << 16) | (Math.max(0, Math.min(255, Math.round(m[1]))) << 8) | Math.max(0, Math.min(255, Math.round(m[2])));
}
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

/** A photo surface from the shared library at its real size (for uvs in metres); avg(name) = its mean colour. */
export function surface(name) { const m = PHOTO_TEX[name]?.metres || 1; return photoTex(name, { repeat: [1 / m, 1 / m] }); }
export const surfaceAvg = (name) => PHOTO_TEX[name]?.avg ?? 0x808080;

// ---------------------------------------------------------------------------------------------- the shutter's lettering
export const SHUTTER = { w: 6.08, h: 2.7, pitch: 0.075 };
let inkTex = null;
/** What is stencilled across the curtain (u across its 6.08 m, v up its 2.7 m), as on every garage door in Japan:
 *  出入口につき / 駐車禁止, the red gone thin where the slats rub. */
export function shutterInk() {
  if (inkTex) return inkTex;
  const W = 2048, H = 1024, c = canvas(W, H), x = c.getContext('2d'), sy = H / SHUTTER.h;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = 'rgba(190,58,48,0.86)'; x.font = '288px "DotGothic16", monospace'; x.fillText('駐車禁止', W / 2, H - 0.86 * sy);
  x.fillStyle = 'rgba(58,72,92,0.86)'; x.font = '112px "DotGothic16", monospace'; x.fillText('出入口につき', W / 2, H - 1.33 * sy);
  // worn through along three slat edges and where the pole's hook has scraped for thirty years
  x.globalCompositeOperation = 'destination-out';
  for (const v of [0.74, 0.965, 1.34]) x.fillRect(0, H - v * sy - 3, W, 6);
  x.lineWidth = 9; x.lineCap = 'round'; x.strokeStyle = '#000';
  for (const [u0, v0, u1, v1] of [[1.9, 0.66, 2.05, 1.02], [2.02, 0.7, 2.12, 0.98], [4.1, 0.72, 4.02, 1.0]]) { x.beginPath(); x.moveTo(u0 / SHUTTER.w * W, H - v0 * sy); x.lineTo(u1 / SHUTTER.w * W, H - v1 * sy); x.stroke(); }
  x.globalCompositeOperation = 'source-over';
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.name = 'garage:shutter-ink';
  return (inkTex = t);
}

// ---------------------------------------------------------------------------------------------- floor and wall marks
let marksOut = null;
/** Marks with alpha, drawn flat on the floor and the walls: { tex, rect(name) -> [u0, v0, u1, v1] }. Every shape is
 *  authored point by point. */
export function marks() {
  if (marksOut) return marksOut;
  const W = 1024, H = 1024, c = canvas(W, H), x = c.getContext('2d'), rects = {};
  const at = (name, x0, y0, w, h, fn) => { rects[name] = [x0 / W, 1 - (y0 + h) / H, (x0 + w) / W, 1 - y0 / H]; x.save(); x.beginPath(); x.rect(x0, y0, w, h); x.clip(); x.translate(x0, y0); fn(w, h); x.restore(); };
  const poly = (w, h, pts) => { x.beginPath(); pts.forEach(([u, v], i) => x[i ? 'lineTo' : 'moveTo'](u * w, v * h)); x.closePath(); x.fill(); };
  const ink = 'rgb(58,50,64)';
  // cracks: a dark line with a light lip, branching (three of them)
  const crack = (pts, br) => (w, h) => {
    for (const [col, off, lw] of [['rgba(255,250,236,0.55)', 2.5, 2.5], [ink, 0, 3.5]]) {
      x.strokeStyle = col; x.lineWidth = lw; x.lineJoin = 'round'; x.beginPath();
      pts.forEach(([u, v], i) => x[i ? 'lineTo' : 'moveTo'](u * w + off, v * h + off)); x.stroke();
      x.lineWidth = lw * 0.6; for (const b of br) { x.beginPath(); b.forEach(([u, v], i) => x[i ? 'lineTo' : 'moveTo'](u * w + off, v * h + off)); x.stroke(); }
    }
  };
  at('crackA', 0, 0, 400, 200, crack([[0.02, 0.2], [0.16, 0.32], [0.3, 0.26], [0.46, 0.5], [0.62, 0.46], [0.8, 0.7], [0.98, 0.78]], [[[0.3, 0.26], [0.36, 0.08], [0.44, 0.04]], [[0.62, 0.46], [0.7, 0.3]]]));
  at('crackB', 400, 0, 300, 200, crack([[0.04, 0.9], [0.2, 0.62], [0.34, 0.66], [0.5, 0.36], [0.72, 0.3], [0.96, 0.06]], [[[0.5, 0.36], [0.56, 0.6], [0.66, 0.74]]]));
  at('crackC', 700, 0, 320, 200, crack([[0.02, 0.5], [0.22, 0.42], [0.4, 0.58], [0.6, 0.5], [0.98, 0.56]], [[[0.4, 0.58], [0.44, 0.84]]]));
  // oil where the engine sat: the stain's outline, its darker heart, three drips toward the drain
  at('oilA', 0, 200, 300, 230, (w, h) => {
    x.fillStyle = 'rgba(64,56,62,0.4)'; poly(w, h, [[0.1, 0.42], [0.2, 0.2], [0.42, 0.1], [0.62, 0.16], [0.84, 0.12], [0.93, 0.36], [0.86, 0.6], [0.92, 0.8], [0.7, 0.9], [0.5, 0.82], [0.3, 0.9], [0.12, 0.74]]);
    x.fillStyle = 'rgba(44,38,50,0.46)'; poly(w, h, [[0.3, 0.44], [0.44, 0.3], [0.62, 0.36], [0.7, 0.52], [0.6, 0.68], [0.4, 0.66]]);
    x.fillStyle = 'rgba(52,46,56,0.46)'; poly(w, h, [[0.04, 0.9], [0.09, 0.86], [0.12, 0.93], [0.07, 0.97]]); poly(w, h, [[0.9, 0.9], [0.95, 0.88], [0.97, 0.95], [0.92, 0.97]]); poly(w, h, [[0.52, 0.93], [0.57, 0.92], [0.58, 0.98], [0.53, 0.99]]);
  });
  at('oilB', 300, 200, 200, 160, (w, h) => {
    x.fillStyle = 'rgba(64,56,62,0.38)'; poly(w, h, [[0.12, 0.5], [0.26, 0.2], [0.5, 0.14], [0.78, 0.24], [0.9, 0.5], [0.8, 0.78], [0.54, 0.88], [0.28, 0.8]]);
    x.fillStyle = 'rgba(44,38,50,0.44)'; poly(w, h, [[0.38, 0.44], [0.54, 0.34], [0.68, 0.48], [0.58, 0.64], [0.42, 0.6]]);
  });
  // tyre tracks: a faint band, three ribs, gone where the floor has been swept
  at('tyre', 500, 200, 60, 500, (w, h) => {
    x.fillStyle = 'rgba(60,54,66,0.13)'; x.fillRect(8, 0, w - 16, h);
    x.fillStyle = 'rgba(52,46,60,0.14)'; for (const u of [14, 27, 40]) x.fillRect(u, 0, 5, h);
    for (const [y, hh] of [[40, 30], [150, 60], [300, 24], [380, 50], [470, 30]]) x.clearRect(0, y, w, hh);
  });
  // water down a wall from a leak, rust from a bolt, a scuff
  at('water', 580, 200, 150, 300, (w, h) => {
    x.fillStyle = 'rgba(70,74,88,0.2)'; poly(w, h, [[0.3, 0], [0.7, 0], [0.84, 0.5], [0.66, 1], [0.5, 0.82], [0.34, 0.94], [0.16, 0.46]]);
    poly(w, h, [[0.42, 0], [0.58, 0], [0.62, 0.7], [0.46, 0.76]]);
  });
  at('rust', 740, 200, 60, 300, (w, h) => {
    x.fillStyle = 'rgba(168,94,52,0.6)'; poly(w, h, [[0.2, 0], [0.8, 0], [0.6, 0.55], [0.52, 1], [0.42, 0.62]]);
    x.fillStyle = 'rgba(128,66,38,0.7)'; x.fillRect(w * 0.36, 0, w * 0.28, h * 0.2);
  });
  at('scuff', 0, 600, 300, 120, (w, h) => {
    x.strokeStyle = 'rgba(54,48,60,0.34)'; x.lineWidth = 5; x.lineCap = 'round';
    for (const [a, b, cc, d] of [[0.06, 0.3, 0.5, 0.2], [0.2, 0.55, 0.9, 0.42], [0.1, 0.8, 0.62, 0.7], [0.55, 0.86, 0.94, 0.8]]) { x.beginPath(); x.moveTo(a * w, b * h); x.lineTo(cc * w, d * h); x.stroke(); }
  });
  // a painted line (bay markings, the keep-clear box): solid, chipped where feet and wheels cross it
  at('line', 0, 730, 512, 40, (w, h) => {
    x.fillStyle = '#fff'; x.fillRect(0, 4, w, h - 8);
    for (const [u, top, ww, hh] of [[22, 1, 30, 6], [80, 0, 18, 8], [96, 1, 30, 9], [150, 0, 40, 5], [214, 1, 14, 9], [262, 0, 26, 7], [300, 1, 44, 10], [352, 0, 20, 6], [404, 1, 18, 14], [446, 0, 34, 6], [478, 1, 22, 8]]) x.clearRect(u, top ? 4 : h - 4 - hh, ww, hh);
  });
  // the soft contact shadow under furniture (it stands in for ambient occlusion on the presets without it)
  at('shade', 320, 600, 200, 120, (w, h) => { x.shadowColor = 'rgba(52,44,70,0.34)'; x.shadowBlur = 22; x.shadowOffsetX = 1000; x.fillStyle = '#000'; x.fillRect(34 - 1000, 30, w - 68, h - 60); x.shadowColor = 'transparent'; x.shadowBlur = 0; x.shadowOffsetX = 0; });
  // spilt paint: the pool, the splash's three drops, the skin's lighter middle
  at('spill', 660, 520, 180, 180, (w, h) => {
    x.fillStyle = 'rgba(88,128,178,0.85)'; poly(w, h, [[0.2, 0.46], [0.3, 0.26], [0.52, 0.2], [0.74, 0.3], [0.82, 0.52], [0.68, 0.74], [0.44, 0.8], [0.26, 0.66]]);
    poly(w, h, [[0.08, 0.2], [0.14, 0.16], [0.17, 0.24], [0.1, 0.27]]); poly(w, h, [[0.86, 0.14], [0.92, 0.12], [0.93, 0.2], [0.87, 0.21]]); poly(w, h, [[0.78, 0.86], [0.85, 0.84], [0.87, 0.92], [0.8, 0.93]]);
    x.fillStyle = 'rgba(150,184,220,0.9)'; poly(w, h, [[0.36, 0.42], [0.5, 0.34], [0.6, 0.44], [0.5, 0.54], [0.4, 0.52]]);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.name = 'garage:marks';
  return (marksOut = { tex, rect: (n) => rects[n] });
}

// ---------------------------------------------------------------------------------------------- printed matter
const RED = 0xc8322c, INK = 0x2a2230, CREAM = 0xf4ecd6, INDIGO = 0x25355c, WHITE = 0xf8f6ee;
/** The shop's crest (丸に割り菱カプセル): a ring, a capsule split by its seam, a small lozenge in the upper half. */
function crest(p, cx, cy, r, fg, bg = null) {
  const r1 = Math.round(r * 0.84), r2 = Math.round(r * 0.66), t = Math.max(2, Math.round(r * 0.09)), d = Math.round(r * 0.26), my = -Math.round(r * 0.36), d2 = Math.round(d * 0.45);
  for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
    const q = i * i + j * j;
    if (q > r * r + r * 0.6) continue;
    let on = q > r1 * r1 + r1 * 0.6; // the ring
    if (!on && q <= r2 * r2 + r2 * 0.6) { on = Math.abs(j) > t; const a = Math.abs(i) / 1.5 + Math.abs(j - my); if (a <= d) on = a <= d2; } // the capsule, its seam, the lozenge
    if (on) p.px(cx + i, cy + j, fg); else if (bg !== null) p.px(cx + i, cy + j, bg);
  }
}
/** Kana / kanji set upright one under the other (the long vowel mark turned upright, as in vertical writing). */
function vtext(p, str, cx, y, size, color, gap = 0) {
  [...str].forEach((ch, i) => {
    const yy = y + i * (size + gap);
    if (ch === 'ー') p.rect(cx - Math.round(size * 0.06), yy + Math.round(size * 0.1), Math.max(2, Math.round(size * 0.12)), Math.round(size * 0.8), color);
    else p.text(ch, cx, yy, { size, color, align: 'center' });
  });
}
const screws = (p, x, y, w, h, c = 0x8a8e90) => { for (const [i, j] of [[4, 4], [w - 6, 4], [4, h - 6], [w - 6, h - 6]]) { p.rect(x + i, y + j, 3, 3, c); p.px(x + i, y + j, 0xdfe2e0); } };

// name: [w, h, painter(p, x, y, w, h)] in pixels; the sheet is 512 px per metre for plates read close up, 256 for boards
const PRINTS = {
  // the sign board on the false front: enamelled tin, 4.0 x 0.8 m (256 px/m)
  signBoard: [1020, 205, (p, x, y, w, h) => {
    const L = logoNow();
    p.rect(x, y, w, h, CREAM); p.rect(x, y, w, 6, tone(CREAM, 1.06)); p.rect(x, y + h - 8, w, 8, tone(CREAM, 0.86));
    p.frame(x + 8, y + 8, w - 16, h - 16, RED); p.frame(x + 9, y + 9, w - 18, h - 18, RED); p.frame(x + 14, y + 14, w - 28, h - 28, tone(RED, 0.7));
    if (L.custom) paintLogo(p, x + 40, y + 36, 128, { L }); else crest(p, x + 104, y + 100, 70, RED, CREAM);
    if (!L.named) {
      p.text('ガチャガレージ', x + 198 + 3, y + 22 + 3, { size: 112, color: tone(RED, 0.55) });
      p.text('ガチャガレージ', x + 198, y + 22, { size: 112, color: RED });
      p.rect(x + 200, y + 146, 780, 3, INK);
      p.text('カプセルトイ・だがし・おもちゃ', x + 204, y + 156, { size: 32, color: INK });
      p.text('☎22-5871', x + 716, y + 156, { size: 32, color: INK });
    } else {
      // the player's name, as big as fits; the English name, the trade and the number on the line under it
      let size = 112;
      while (size > 32 && p.measure(L.jp, size, FONT_JP) > 776) size -= 16;
      const ty = y + 22 + Math.round((112 - size) * 0.5);
      p.text(L.jp, x + 198 + 3, ty + 3, { size, color: tone(RED, 0.55) });
      p.text(L.jp, x + 198, ty, { size, color: RED });
      p.rect(x + 200, y + 146, 780, 3, INK);
      const tel = '☎22-5871', telW = p.measure(tel, 32, FONT_JP), ew = p.measure(L.en, 32, FONT_EN);
      p.text(L.en, x + 204, y + 158, { size: 32, color: RED, font: FONT_EN });
      const room = 776 - ew - telW - 40;
      const trade = ['カプセルトイ・だがし', 'カプセルトイ', 'ガチャ'].find((t) => p.measure(t, 32, FONT_JP) <= room);
      if (trade) p.text(trade, x + 204 + ew + 20, y + 156, { size: 32, color: INK });
      p.text(tel, x + 980 - telW, y + 156, { size: 32, color: INK });
    }
    // enamel chipped at the bolts and along the lower edge, rust showing
    for (const [i, j] of [[26, 26], [w - 30, 26], [26, h - 30], [w - 30, h - 30], [w / 2, 22], [w / 2, h - 28]]) { p.circle(x + i, y + j, 9, 0x9a5a36); p.circle(x + i, y + j, 5, 0x5a3a2a); p.rect(x + i - 2, y + j + 8, 4, 22, 0xb07848, 150); }
    for (const [i, ww] of [[330, 40], [640, 26], [870, 54]]) { p.rect(x + i, y + h - 12, ww, 12, 0x9a5a36); p.rect(x + i + 4, y + h - 16, ww - 12, 5, 0xb07848); }
  }],
  // noren: what is resist-dyed white on the three indigo panels (256 px/m, 0.66 x 0.72 m each)
  norenL: [169, 184, (p, x, y, w, h) => { noren(p, x, y, w, h); norenName(p, x, y, w, 0); }],
  norenC: [169, 184, (p, x, y, w, h) => {
    noren(p, x, y, w, h);
    const L = logoNow(), s = L.custom ? (L.size >= 64 ? 128 : 96) : 0;
    if (!s) { crest(p, x + (w >> 1), y + 98, 60, WHITE); return; }
    // one ink: resist-dyed white like the crest; several: printed in its own inks on a dyed white patch
    const x0 = x + ((w - s) >> 1), y0 = y + 98 - (s >> 1), inks = new Set(L.px.filter((v) => v));
    if (inks.size <= 1) { paintLogo(p, x0, y0, s, { L, mono: WHITE }); return; }
    for (let j = -6; j < s + 6; j++) for (let i = -6; i < s + 6; i++) { const ex = Math.max(0, -i, i - s + 1), ey = Math.max(0, -j, j - s + 1); if (ex * ex + ey * ey <= 36) p.px(x0 + i, y0 + j, WHITE); }
    paintLogo(p, x0, y0, s, { L });
  }],
  norenR: [169, 184, (p, x, y, w, h) => { noren(p, x, y, w, h); norenName(p, x, y, w, 1); }],
  // a paper lantern's skin, wrapped round (u) the body: red paper, bamboo ribs, the shop's kana front and back
  lantern: [256, 128, (p, x, y, w, h) => {
    p.rect(x, y, w, h, 0xd6382e);
    for (let j = 6; j < h; j += 12) { p.rect(x, y + j, w, 2, 0xb02a26); p.rect(x, y + j + 2, w, 1, 0xe85a48); }
    p.rect(x, y, w, 10, 0x2a2026); p.rect(x, y + h - 10, w, 10, 0x2a2026);
    for (const cx of [64, 192]) { p.rect(x + cx - 30, y + 18, 60, 92, 0xf4ead8); for (let j = 18; j < 110; j += 12) p.rect(x + cx - 30, y + j, 60, 1, 0xd8cdb8); vtext(p, cx === 64 ? 'ガチャ' : 'まつり', x + cx, y + 24, 16, INK, 12); }
  }],
  // the lit GACHA CORNER box over the machine row (1.6 x 0.4 m at 256)
  gachaSign: [410, 102, (p, x, y, w, h) => {
    p.rect(x, y, w, h, 0xfff4e0); p.rect(x, y, w, 9, RED); p.rect(x, y + h - 9, w, 9, RED);
    p.text('ガチャガチャ', x + (w >> 1), y + 13, { size: 64, color: RED, align: 'center' });
    p.tinyText('GACHA  CORNER', x + (w >> 1), y + 81, { color: INK, align: 'center' });
    for (const cx of [26, w - 27]) crest(p, x + cx, y + 46, 15, RED, 0xfff4e0);
  }],
  // 安全第一 with the green cross (0.6 x 0.45 m at 256)
  anzen: [154, 116, (p, x, y, w, h) => {
    p.rect(x, y, w, h, WHITE); p.frame(x, y, w, h, 0x2f8a4e); p.frame(x + 1, y + 1, w - 2, h - 2, 0x2f8a4e);
    p.rect(x + 66, y + 12, 22, 50, 0x2f8a4e); p.rect(x + 52, y + 26, 50, 22, 0x2f8a4e);
    p.text('安全第一', x + (w >> 1), y + 72, { size: 32, color: 0x2f8a4e, align: 'center' });
  }],
  // everything below is 512 px per metre
  hinoyojin: [56, 168, (p, x, y, w, h) => {
    p.rect(x, y, w, h, WHITE); for (let k = 0; k < 3; k++) p.frame(x + k, y + k, w - 2 * k, h - 2 * k, RED);
    vtext(p, '火の用心', x + (w >> 1), y + 12, 32, RED, 4);
    p.rect(x + 8, y + h - 12, w - 16, 2, RED);
  }],
  shokaki: [64, 190, (p, x, y, w, h) => {
    p.rect(x, y, w, h, RED); p.frame(x + 3, y + 3, w - 6, h - 6, WHITE);
    vtext(p, '消火器', x + (w >> 1), y + 14, 32, WHITE, 8);
    for (let j = 0; j < 16; j++) p.rect(x + (w >> 1) - (16 - j), y + h - 46 + j, 2 * (16 - j), 1, WHITE);
    p.rect(x + (w >> 1) - 5, y + h - 58, 10, 14, WHITE);
  }],
  // the distribution board's face (0.3 x 0.42 m): the knife switch's slot stays clear in the middle for the lever
  breaker: [154, 216, (p, x, y, w, h) => {
    const c = 0xc9c6b8;
    p.rect(x, y, w, h, c); p.rect(x, y, w, 3, tone(c, 1.1)); p.rect(x, y + h - 4, w, 4, tone(c, 0.8)); p.frame(x, y, w, h, tone(c, 0.62));
    screws(p, x, y, w, h);
    p.rect(x + 40, y + 10, 74, 22, 0xd8dadc); p.frame(x + 40, y + 10, 74, 22, 0x6a6e72); p.text('分電盤', x + 77, y + 13, { size: 16, color: INK, align: 'center' });
    p.rect(x + 61, y + 44, 32, 100, 0x26222c); p.frame(x + 59, y + 42, 36, 104, tone(c, 0.66));
    p.text('入', x + 108, y + 48, { size: 16, color: RED }); p.text('切', x + 108, y + 122, { size: 16, color: INK });
    p.tinyText('MAIN', x + 16, y + 52, { color: INK }); p.text('主幹', x + 12, y + 64, { size: 16, color: INK }); p.tinyText('30A', x + 20, y + 86, { color: RED });
    for (let k = 0; k < 3; k++) { const cx = x + 36 + k * 41, cy = y + 172; p.circle(cx, cy, 13, 0x74706a); p.circle(cx, cy, 11, 0xf0ece0); p.rect(cx - 7, cy - 1, 14, 3, 0x8a8478); p.tinyText(String(k + 1), cx - 2, cy + 16, { color: INK }); }
    p.rect(x + 8, y + 104, 46, 30, 0xf2d648); p.frame(x + 8, y + 104, 46, 30, 0x8a7420); p.text('点検済', x + 31, y + 106, { size: 16, color: INK, align: 'center' }); p.tinyText('H10.4', x + 31, y + 123, { color: INK, align: 'center' });
    p.rect(x + 102, y + 146, 44, 14, 0x3a6ab0); p.tinyText('HOAN', x + 124, y + 149, { color: WHITE, align: 'center' });
  }],
  // the watt-hour meter's face under its glass (0.2 m across)
  meter: [104, 104, (p, x, y, w, h) => {
    p.circle(x + 52, y + 52, 51, 0x5a5e62); p.circle(x + 52, y + 52, 48, 0xe8e6da);
    p.rect(x + 22, y + 26, 60, 18, 0x1e1c24); for (let k = 0; k < 5; k++) { p.rect(x + 24 + k * 12, y + 28, 10, 14, k === 4 ? RED : 0x2e2c36); p.tinyText('04127'[k], x + 26 + k * 12, y + 31, { color: WHITE }); }
    p.tinyText('kWh', x + 52, y + 48, { color: INK, align: 'center' });
    p.rect(x + 14, y + 62, 76, 5, 0x9a9ea0); p.rect(x + 14, y + 62, 76, 1, 0xdfe2e0); p.rect(x + 58, y + 62, 8, 5, RED);
    p.tinyText('100V 30A 50Hz', x + 52, y + 72, { color: INK, align: 'center' }); p.tinyText('No.582714', x + 52, y + 82, { color: 0x6a6660, align: 'center' });
  }],
  kentei: [64, 40, (p, x, y, w, h) => { p.rect(x, y, w, h, 0x4a9a5c); p.frame(x, y, w, h, 0x2a6a3a); p.text('検定', x + (w >> 1), y + 3, { size: 16, color: WHITE, align: 'center' }); p.tinyText('H16.3', x + (w >> 1), y + 24, { color: WHITE, align: 'center' }); }],
  keiyaku: [64, 32, (p, x, y, w, h) => { p.rect(x, y, w, h, WHITE); p.frame(x, y, w, h, RED); p.text('契約', x + 4, y + 6, { size: 16, color: RED }); p.tinyText('30A', x + 40, y + 12, { color: RED }); }],
  maker: [150, 36, (p, x, y, w, h) => { p.rect(x, y, w, h, 0xcfd3d4); p.frame(x, y, w, h, 0x6a6e72); p.text('ミカサシヤッター', x + (w >> 1), y + 4, { size: 16, color: 0x24406a, align: 'center' }); p.tinyText('MIKASA  NO.3  1971', x + (w >> 1), y + 24, { color: 0x24406a, align: 'center' }); }],
  dento: [44, 24, (p, x, y, w, h) => { p.rect(x, y, w, h, WHITE); p.frame(x, y, w, h, 0x8a8478); p.text('電灯', x + (w >> 1), y + 4, { size: 16, color: INK, align: 'center' }); }],
  sessui: [44, 44, (p, x, y, w, h) => { p.circle(x + 22, y + 22, 21, 0x3a7ac0); p.circle(x + 22, y + 22, 18, WHITE); p.text('節水', x + 22, y + 13, { size: 16, color: 0x3a7ac0, align: 'center' }); }],
  chui: [150, 44, (p, x, y, w, h) => { p.rect(x, y, w, h, 0xf2cc30); p.frame(x, y, w, h, INK); p.frame(x + 1, y + 1, w - 2, h - 2, INK); p.text('頭上注意', x + (w >> 1), y + 6, { size: 32, color: INK, align: 'center' }); }],
  seiton: [150, 44, (p, x, y, w, h) => { p.rect(x, y, w, h, 0x2f5fa8); p.frame(x + 2, y + 2, w - 4, h - 4, WHITE); p.text('整理整頓', x + (w >> 1), y + 6, { size: 32, color: WHITE, align: 'center' }); }],
  hazard: [64, 32, (p, x, y, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) p.px(x + i, y + j, ((i + j) >> 3) % 2 ? 0x2a2630 : 0xf2c830); }],
  // the cutting mat on the counter (0.8 x 0.5 m at 256)
  mat: [205, 128, (p, x, y, w, h) => {
    p.rect(x, y, w, h, 0x2f6a4c);
    for (let i = 6; i < w; i += 13) p.rect(x + i, y + 4, 1, h - 8, (i - 6) % 65 ? 0x3d7c5c : 0x7ab592);
    for (let j = 4; j < h; j += 13) p.rect(x + 4, y + j, w - 8, 1, (j - 4) % 65 ? 0x3d7c5c : 0x7ab592);
    p.frame(x + 3, y + 3, w - 6, h - 6, 0x7ab592); p.tinyText('A2  CUTTING MAT', x + 10, y + h - 12, { color: 0x7ab592 });
    p.line(x + 60, y + 30, x + 150, y + 74, 0x26583e); p.line(x + 90, y + 96, x + 180, y + 40, 0x26583e);
  }],
  // notices and papers (0.2 to 0.3 m)
  rules: [128, 144, (p, x, y, w, h) => {
    p.rect(x, y, w, h, 0xfbf3d8); p.frame(x, y, w, h, 0xb8a888); p.rect(x, y, w, 26, RED); p.text('おやくそく', x + (w >> 1), y + 5, { size: 16, color: WHITE, align: 'center' });
    ['ならんでね', 'たたかない', 'ゴミはかごへ'].forEach((s, i) => { p.circle(x + 12, y + 46 + i * 30, 5, RED); p.text(s, x + 22, y + 38 + i * 30, { size: 16, color: INK }); });
    p.rect(x + 44, y - 0, 40, 8, 0xe8dcae, 200);
  }],
  kaishu: [104, 64, (p, x, y, w, h) => { p.rect(x, y, w, h, WHITE); p.frame(x, y, w, h, 0x3a7ac0); p.frame(x + 1, y + 1, w - 2, h - 2, 0x3a7ac0); p.text('カプセル', x + (w >> 1), y + 8, { size: 16, color: 0x3a7ac0, align: 'center' }); p.text('回収箱↓', x + (w >> 1), y + 34, { size: 16, color: INK, align: 'center' }); }],
  ryogae: [104, 64, (p, x, y, w, h) => { p.rect(x, y, w, h, 0xf2d648); p.frame(x, y, w, h, INK); p.text('両替', x + (w >> 1), y + 4, { size: 32, color: INK, align: 'center' }); p.tinyText('1000 > 100x10', x + (w >> 1), y + 46, { color: INK, align: 'center' }); }],
  memo: [72, 72, (p, x, y, w, h) => { p.rect(x, y, w, h, 0xf8e878); p.rect(x, y + h - 8, w, 8, 0xe0cc58); for (let j = 0; j < 4; j++) p.rect(x + 8, y + 14 + j * 12, [50, 40, 54, 26][j], 2, 0x5a5670); p.circle(x + (w >> 1), y + 5, 4, RED); }],
  photo: [64, 78, (p, x, y, w, h) => { p.rect(x, y, w, h, WHITE); p.frame(x, y, w, h, 0xc8c2b4); p.rect(x + 5, y + 5, w - 10, 52, 0x8ab4d8); p.rect(x + 5, y + 38, w - 10, 19, 0x6a9a5a); p.rect(x + 16, y + 26, 30, 20, 0xe6e9e8); p.rect(x + 16, y + 26, 30, 5, 0xb0483a); p.rect(x + 26, y + 34, 12, 12, 0x5a626a); p.tinyText('S46', x + (w >> 1), y + 64, { color: 0x6a6660, align: 'center' }); }],
  // the block's enamel address plate (町名看板)
  chome: [64, 216, (p, x, y, w, h) => { p.rect(x, y, w, h, 0x2f5fa8); p.frame(x + 2, y + 2, w - 4, h - 4, WHITE); vtext(p, '昭和町二丁目', x + (w >> 1), y + 10, 32, WHITE, 1); p.circle(x + (w >> 1), y + 6, 2, 0xc8ccd0); p.circle(x + (w >> 1), y + h - 6, 2, 0xc8ccd0); }],
  // the fluorescent fitting's rating label and the pull-cord tag
  tag: [28, 44, (p, x, y, w, h) => { p.rect(x, y, w, h, 0xf2e8c8); p.frame(x, y, w, h, 0x9a8a60); p.circle(x + (w >> 1), y + 6, 3, 0x5a5040); vtext(p, '点灯', x + (w >> 1), y + 12, 16, INK, 0); }],
};
/** Half the shop's name set upright on a side panel of the noren (ガチャ | ガレージ by default). */
function norenName(p, x, y, w, side) {
  const L = logoNow();
  if (!L.named) { if (side) vtext(p, 'ガレージ', x + w / 2, y + 26, 32, WHITE, 6); else vtext(p, 'ガチャ', x + w / 2, y + 22, 48, WHITE, 2); return; }
  const ch = [...L.jp], k = Math.ceil(ch.length / 2), part = (side ? ch.slice(k) : ch.slice(0, k)).join('');
  const n = [...part].length;
  if (!n) return;
  const size = n <= 3 ? 48 : 32, gap = n <= 3 ? 2 : n <= 4 ? 6 : 0, tall = n * size + (n - 1) * gap;
  vtext(p, part, x + w / 2, y + 14 + Math.max(0, Math.round((164 - tall) / 2)), size, WHITE, gap);
}
/** A noren panel's dye-resist marks only (the indigo cloth itself is a photo): the pale band of its hanging loops. */
function noren(p, x, y, w, h) { for (let i = 10; i < w; i += 40) p.rect(x + i, y, 14, 10, 0x8a9cc0); void h; }

let printsOut = null;
let PAINT_L = null; // the logo the painters draw (a preview's); null: the active one
const logoNow = () => PAINT_L || activeLogo();
/** The print sheet: { tex, rect(name) -> [u0, v0, u1, v1], px(name) -> [w, h] } (pixel art, nearest). */
export function prints() {
  if (printsOut) return printsOut;
  const W = 1024, H = 1024, p = new Pix(W, H, 7), rects = {}, sizes = {}, at = {};
  let sx = 0, sy = 0, sh = 0;
  for (const [name, [w, h, paint]] of Object.entries(PRINTS)) {
    if (sx + w + 4 > W) { sx = 0; sy += sh; sh = 0; }
    paint(p, sx + 2, sy + 2, w, h);
    rects[name] = [(sx + 2) / W, 1 - (sy + 2 + h) / H, (sx + 2 + w) / W, 1 - (sy + 2) / H]; sizes[name] = [w, h]; at[name] = [sx + 2, sy + 2];
    sx += w + 4; sh = Math.max(sh, h + 4);
  }
  if (sy + sh > H) console.warn('garage print sheet is full');
  const tex = p.texture();
  tex.name = 'garage:prints';
  return (printsOut = { tex, rect: (n) => rects[n], px: (n) => sizes[n], pix: p, at });
}

const SHOP_PRINTS = ['signBoard', 'norenL', 'norenC', 'norenR'];
/** Repaint the prints that carry the shop's logo and name (after 'logo:changed'). */
export function refreshShopPrints() {
  if (!printsOut) return;
  const P = printsOut, p = P.pix;
  p.flush();
  for (const n of SHOP_PRINTS) { const [x, y] = P.at[n], [w, h] = P.px(n); p.ctx.clearRect(x - 1, y - 1, w + 2, h + 2); }
  p.pull();
  for (const n of SHOP_PRINTS) { const [x, y] = P.at[n], [w, h] = P.px(n); PRINTS[n][2](p, x, y, w, h); }
  p.flush();
  P.tex.needsUpdate = true;
}
/** One shop print painted on its own canvas with logo L (the editor's live preview). */
function previewOf(names, L, gap = 0, bg = null) {
  const sz = names.map((n) => PRINTS[n]), W = sz.reduce((a, s) => a + s[0], 0) + gap * (names.length - 1), H = Math.max(...sz.map((s) => s[1]));
  const p = new Pix(W, H, 7);
  if (bg !== null) p.fill(bg);
  PAINT_L = L;
  try { let x = 0; for (const [w, h, paint] of sz) { paint(p, x, 0, w, h); x += w + gap; } } finally { PAINT_L = null; }
  p.flush();
  return p.canvas;
}
export const signPreview = (L) => previewOf(['signBoard'], L);
export const norenPreview = (L) => previewOf(['norenL', 'norenC', 'norenR'], L, 6, INDIGO);
