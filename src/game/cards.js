// Card patterns shared by the machine banners (src/gfx/banner.js) and the refill boxes.
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
