// Small labels for stamps, stickers and tags in the dressing room (NOT YOURS YET, NEW, rarity, item names): set in
// Alagard, a high-resolution pixel font, at its crisp sizes (16 px, or 32 px for the big stamp), as live text with an
// optional hard 2 px drop (no font smoothing tricks, no glow). The old 5 x 7 bitmap images are gone: the owner wants
// only high-res pixel fonts in the UI, never a tiny bitmap face or blown-up chunky glyphs.
//   pixText(str, { col, shadow, s }) -> '<span ...>' HTML   (s >= 2: the 32 px size)
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ESC[c]);

export function pixText(str, { s = 2, cls = 'dr-px', col = '#241a1e', shadow = null } = {}) {
  const size = s >= 2 ? 32 : 16;
  const sh = shadow ? `;text-shadow:2px 2px 0 ${shadow}` : '';
  return `<span class="${cls} dr-pxt" style="font:${size}px/${size}px 'Alagard','Pixelify Sans','DotGothic16';color:${col};letter-spacing:${s >= 2 ? 2 : 1}px;white-space:nowrap${sh}">${esc(str)}</span>`;
}
