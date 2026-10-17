// Display cards (台紙 daishi) for machines: series title, price, lineup thumbnails and a secret silhouette.
import * as THREE from 'three';
import { Pix, FONT_EN } from '../gfx/pix.js';
import { SERIES_BY_ID } from '../data/series/index.js';

const hex = (s) => parseInt(String(s).replace('#', ''), 16);

export function drawPattern(p, x, y, w, h, pattern, bg, fg) {
  p.rect(x, y, w, h, bg);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const X = x + i, Y = y + j;
    let on = false;
    switch (pattern) {
      case 'dots': on = (i % 8 === 2 && j % 8 === 2) || (i % 8 === 6 && j % 8 === 6) || ((i % 8 === 3 || i % 8 === 1) && j % 8 === 2) || (i % 8 === 2 && (j % 8 === 1 || j % 8 === 3)); break;
      case 'stripes': on = ((i + j) % 12) < 3; break;
      case 'checker': on = ((Math.floor(i / 6) + Math.floor(j / 6)) % 2) === 0; break;
      case 'waves': on = Math.abs(((j + Math.round(Math.sin(i / 3) * 2)) % 10) - 5) < 1; break;
      case 'stars': on = (i % 16 === 8 && j % 14 >= 5 && j % 14 <= 9) || (j % 14 === 7 && i % 16 >= 6 && i % 16 <= 10); break;
      case 'sakura': { const a = i % 18, b = j % 18; on = (a === 9 && b >= 6 && b <= 12) || (b === 9 && a >= 6 && a <= 12) || (Math.abs(a - 9) === Math.abs(b - 9) && Math.abs(a - 9) < 3); break; }
      case 'grid': on = i % 10 === 0 || j % 10 === 0; break;
      default: on = false;
    }
    if (on) p.px(X, Y, fg, 70);
  }
}

/** Full display card for modern machines (CanvasTexture). */
export function makeCard(seriesId, thumbs) {
  const s = SERIES_BY_ID[seriesId];
  const W = 264, H = 132;
  const p = new Pix(W, H, 5);
  const bg = hex(s.card.bg), ac = hex(s.card.accent), tx = hex(s.card.text), ac2 = hex(s.card.accent2 || s.card.accent);
  drawPattern(p, 0, 0, W, H, s.card.pattern, bg, ac);
  // title banner
  p.rect(0, 0, W, 34, ac);
  p.rect(0, 34, W, 2, ac2);
  p.text(s.jp, 8, 4, { size: 20, color: 0xffffff, outline: tx });
  p.text(s.name, W - 8, 20, { size: 10, color: 0xffffff, align: 'right', font: FONT_EN });
  // lineup
  const n = s.items.length;
  const cell = Math.min(31, Math.floor((W - 16) / n));
  const ox = Math.round((W - cell * n) / 2);
  s.items.forEach((it, i) => {
    const cx = ox + i * cell;
    p.rect(cx + 1, 42, cell - 2, cell + 8, 0xffffff);
    p.frame(cx + 1, 42, cell - 2, cell + 8, it.rarity === 'secret' ? 0xffd23f : tx);
    p.flush();
    if (thumbs) {
      const c = thumbs.item(it.key, { size: 32, silhouette: it.rarity === 'secret' });
      p.ctx.drawImage(c, cx + 1, 43, cell - 2, cell - 2);
      p.pull();
    }
    if (it.rarity === 'secret') p.text('?', cx + cell / 2, 48, { size: 16, color: 0xffd23f, outline: 0x2a2220, align: 'center' });
    p.text(String(i + 1), cx + cell / 2, 42 + cell - 1, { size: 8, color: tx, align: 'center', font: FONT_EN });
  });
  // footer: kinds, secret badge, price
  p.text(`全${n}種`, 8, H - 22, { size: 16, color: tx, outline: 0xffffff });
  p.rect(64, H - 20, 92, 14, 0x2a2220);
  p.text('シークレットあり!', 110, H - 20, { size: 10, color: 0xffd23f, align: 'center' });
  p.circle(W - 34, H - 22, 18, 0xe5383b);
  p.circle(W - 34, H - 22, 16, 0xffffff);
  p.circle(W - 34, H - 22, 15, 0xe5383b);
  p.text('1回', W - 34, H - 36, { size: 9, color: 0xffffff, align: 'center' });
  p.text(`${s.price}円`, W - 34, H - 26, { size: 12, color: 0xffffff, align: 'center' });
  p.text('対象年齢15才以上', 8, H - 6 - 2, { size: 8, color: tx });
  const t = p.texture();
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

/** Small painted header strip for the old retro machine. */
export function makeHeader(seriesId, thumbs) {
  const s = SERIES_BY_ID[seriesId];
  const W = 152, H = 40;
  const p = new Pix(W, H, 6);
  p.fill(0xf2e6c8);
  p.rect(0, 0, W, 3, 0xc8352a); p.rect(0, H - 3, W, 3, 0xc8352a);
  p.text('ガチャ', 4, 6, { size: 14, color: 0xc8352a });
  p.text(s.jp, 4, 22, { size: 10, color: 0x3a2410 });
  p.circle(W - 18, 20, 14, 0xc8352a);
  p.text('100', W - 18, 10, { size: 12, color: 0xffffff, align: 'center', font: FONT_EN });
  p.text('円', W - 18, 22, { size: 9, color: 0xffffff, align: 'center' });
  if (thumbs) {
    p.flush();
    s.items.slice(0, 3).forEach((it, i) => {
      const c = thumbs.item(it.key, { size: 32 });
      p.ctx.drawImage(c, 60 + i * 20, 8, 22, 22);
    });
    p.pull();
  }
  // faded paint
  p.noise(0.05);
  p.speckle(0.02, [0xd8ccb0]);
  return p.texture();
}
