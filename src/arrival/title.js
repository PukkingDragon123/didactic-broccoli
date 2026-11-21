// The opening's title: the game's own 3D title (the chunky hand-painted GACHA GARAGE blocks rendered for the title
// screen, public/img/menu/title*.png from tools/menulogo.py) hanging over the lane, shown at a whole-number scale so
// its pixels stay crisp, with "Morio-chō · spring 1999" under it in the 5x7 bitmap font (drawn pixel by pixel, the
// macron put on by hand, a hard ink outline) and a red 杜王 name seal stamped beside it (DotGothic16). No paper card:
// titles are 3D now. If the logo can't load, GACHA GARAGE is set in Alagard instead. It drops in and leaves in steps,
// never fades smoothly. Lives in the cutscene layer (#cutscene), above the letterbox.
//   const t = new TitleCard(parentEl)   t.show()   t.hide()   t.dispose()
import { draw5, textW5 } from '../gfx/font5x7.js';
import './arrival.css';

const INK2 = '#fff2dc', RED = [200, 50, 44];
const LOGO = (import.meta.env?.BASE_URL || '/') + 'img/menu/';

/** "MORIO-CHŌ · SPRING 1999" in the 5x7 font as a data URL (1 texel = 1 px; shown at 3x). */
function placeLine() {
  const word = 'MORIO-CH', line = `${word}O  ·  SPRING 1999`;
  const W = textW5(line) + 2, H = 10;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  draw5(g, line, 1, 3, { col: INK2 });
  g.fillStyle = INK2;
  g.fillRect(1 + textW5(word) + 1 + 1, 1, 3, 1); // the ō's macron, over the O's three middle columns
  // a hard one-texel ink outline round every lit texel (no blur, no glow)
  const src = g.getImageData(0, 0, W, H), out = g.createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (src.data[i + 3] > 127) { out.data.set(src.data.subarray(i, i + 4), i); continue; }
    let n = false;
    for (let dy = -1; dy <= 1 && !n; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < W && yy < H && src.data[(yy * W + xx) * 4 + 3] > 127) { n = true; break; }
    }
    if (n) { out.data[i] = 26; out.data[i + 1] = 15; out.data[i + 2] = 20; out.data[i + 3] = 255; }
  }
  g.putImageData(out, 0, 0);
  return { url: c.toDataURL(), w: W, h: H };
}

/** A vertical red name seal, 杜王 (Morio), inked from DotGothic16 with the odd texel missing (an uneven stamp). */
function seal() {
  const W = 20, H = 36, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.font = '16px "DotGothic16"'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = '#000';
  g.fillText('杜', W / 2, 17); g.fillText('王', W / 2, 33);
  const src = g.getImageData(0, 0, W, H), out = g.createImageData(W, H);
  let s = 77;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const frame = x === 0 || y === 0 || x === W - 1 || y === H - 1;
    const lit = frame || src.data[(y * W + x) * 4 + 3] > 110;
    if (!lit || r() < 0.09 || ((x === 0 || x === W - 1) && (y === 0 || y === H - 1))) continue;
    const k = r() < 0.25 ? 0.84 : 1, i = (y * W + x) * 4;
    out.data[i] = RED[0] * k; out.data[i + 1] = RED[1] * k; out.data[i + 2] = RED[2] * k; out.data[i + 3] = 255;
  }
  g.putImageData(out, 0, 0);
  return c.toDataURL();
}

export class TitleCard {
  constructor(parent = document.body) {
    const el = this.el = document.createElement('div');
    el.id = 'arrival-title';
    const L = placeLine();
    el.innerHTML = '<div class="logo"><div class="t">GACHA GARAGE</div></div>'
      + `<div class="row"><div class="s" style="--w:${L.w}px;--h:${L.h}px;background-image:url(${L.url})"></div><i class="seal"></i></div>`;
    parent.appendChild(el);
    this.fitLogo();
    const paint = () => { const s = el.querySelector('.seal'); if (s) s.style.backgroundImage = `url(${seal()})`; };
    paint();
    try { document.fonts?.load('16px "DotGothic16"', '杜王').then(paint, () => {}); } catch { /* no font loading API */ }
  }

  /** The 3D title at the biggest whole-number scale that fits ~42% of the screen's width (crisp texels). */
  fitLogo() {
    fetch(LOGO + 'title.json').then((r) => r.json()).then((m) => {
      const maxW = Math.max(240, innerWidth * 0.42), maxH = Math.max(110, innerHeight * 0.3);
      let best = null;
      for (const sz of m.sizes || []) for (let k = 1; k <= 4; k++) {
        const w = sz.w * k, h = sz.h * k;
        if (w > maxW || h > maxH) continue;
        const score = w - 120 * (k - 1); // (prefer the finer render over a bigger texel)
        if (!best || score > best.score) best = { sz, k, score };
      }
      if (!best) return;
      const img = new Image();
      img.onload = () => {
        const box = this.el.querySelector('.logo');
        if (!box) return;
        img.width = best.sz.w * best.k; img.height = best.sz.h * best.k;
        box.replaceChildren(img);
        this.el.classList.add('has-logo');
      };
      img.alt = 'GACHA GARAGE';
      img.src = LOGO + best.sz.src;
    }).catch(() => { /* the Alagard fallback stays */ });
  }

  show() { this.el.classList.remove('out'); this.el.classList.add('on'); }
  hide() { this.el.classList.add('out'); this.el.classList.remove('on'); }
  dispose() { this.el.remove(); }
}
