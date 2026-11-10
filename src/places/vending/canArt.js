// Lettering for the machines' own pixel panels (the vending strips and POP card, the ramen shop's ticket machine):
// kana / kanji as whole pixels on a 2D canvas, through the label studio's faces (src/products/type.js). The drinks'
// labels themselves are painted by src/products/labels.js and wrapped on real containers (src/products/containers.js).
//   kanji(ctx, text, x, y, size, col, { vert, align, shadow })     loadLabelFonts(foods) -> Promise
//   drawLabel(ctx, food, x, y, s)   a drink's front label, flat, at s screen pixels per label pixel
import { mk, whenFontsReady } from '../../products/type.js';
import { paintFront } from '../../products/labels.js';
import { DRINKS } from '../../products/brands.js';

const css = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0');
export function kanji(ctx, text, x, y, size, col, { vert = false, align = 'left', shadow = null } = {}) {
  const m = mk(String(text), size, { vert });
  const ox = Math.round(align === 'center' ? x - m.w / 2 : align === 'right' ? x - m.w : x), oy = Math.round(y);
  const run = (dx, dy, c) => {
    ctx.fillStyle = css(c);
    for (let j = 0; j < m.h; j++) { let i = 0; while (i < m.w) { if (!m.b[j * m.w + i]) { i++; continue; } let n = 1; while (i + n < m.w && m.b[j * m.w + i + n]) n++; ctx.fillRect(ox + i + dx, oy + j + dy, n, 1); i += n; } }
  };
  if (shadow != null) run(1, 1, shadow);
  run(0, 0, col);
  return m;
}
/** Make sure every glyph we draw is loaded (DotGothic16 subsets load lazily). */
export function loadLabelFonts(foods = []) {
  return whenFontsReady(foods.map((f) => (f.jp || '')).join('') + '準備中円売切あったか〜いつめた税別夕方時から年齢確認お酒は歳になってはい');
}
/** A drink's front label drawn flat. */
export function drawLabel(ctx, f, x, y, s = 1) { if (DRINKS[f.id]) paintFront(f.id).draw(ctx, x, y, s); }
