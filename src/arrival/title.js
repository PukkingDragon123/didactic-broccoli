// The opening's title card, in the paper UI kit (src/ui/paper.css): a torn scrap of cream paper taped to the screen,
// GACHA GARAGE in Alagard ink with a red-pencil underline, the kana ガチャ・ガレージ and 杜王町 平成十一年 春 under it
// (DotGothic16), "Morio-chō · spring 1999" in the 5x7 bitmap font (drawn pixel by pixel, the macron put on by hand),
// and a red 杜王 name seal stamped in the corner. It drops in and leaves in steps, never fades smoothly. Lives in the
// cutscene layer (#cutscene), above the letterbox, over the van rolling down the lane.
//   const t = new TitleCard(parentEl)   t.show()   t.hide()   t.dispose()
import { draw5, textW5 } from '../gfx/font5x7.js';
import './arrival.css';

const INK2 = '#5e5046', RED = [200, 50, 44];
const KANA = 'ガチャ・ガレージ', PLACE = '平成十一年・春'; // (Heisei 11 = 1999)

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
    el.innerHTML = '<div class="card"><i class="tape l"></i><i class="tape r"></i><div class="t">GACHA GARAGE</div>'
      + `<div class="k">${KANA}<span>${PLACE}</span></div><div class="s" style="--w:${L.w}px;--h:${L.h}px;background-image:url(${L.url})"></div><i class="seal"></i></div>`;
    parent.appendChild(el);
    const paint = () => { const s = el.querySelector('.seal'); if (s) s.style.backgroundImage = `url(${seal()})`; };
    paint();
    try { document.fonts?.load('16px "DotGothic16"', '杜王' + KANA + PLACE).then(paint, () => {}); } catch { /* no font loading API */ }
  }

  show() { this.el.classList.remove('out'); this.el.classList.add('on'); }
  hide() { this.el.classList.add('out'); this.el.classList.remove('on'); }
  dispose() { this.el.remove(); }
}
