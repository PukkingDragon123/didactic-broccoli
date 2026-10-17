// Tiny immediate-mode UI kit for the retro web pages drawn on the CRT canvas (640×480).
export const W = 640, H = 480;
export const FJ = '"DotGothic16", monospace';
export const FE = '"Pixelify Sans", "DotGothic16", monospace';

export const COL = {
  bg: '#fffdf4', paper: '#ffffff', ink: '#2a2220', soft: '#7a6a60', line: '#d8ccb8',
  red: '#e5383b', pink: '#ff6f91', yellow: '#ffd23f', blue: '#2f6fd6', sky: '#cfe8ff', green: '#3cae5a', navy: '#233a72',
  orange: '#ff8c2e', gray: '#c9c2b4', gold: '#d4a83a', link: '#1a3fd6', visited: '#6a2a9a',
};

export class UI {
  constructor(ctx) {
    this.ctx = ctx;
    this.hits = [];
    this.mouse = { x: -1, y: -1 };
    this.hover = null;
    this.clip = null;
    this.cursor = 'arrow';
    this.t = 0;
  }

  begin(mouse, t) {
    this.hits = [];
    this.mouse = mouse;
    this.cursor = 'arrow';
    this.t = t;
  }

  /** Register a clickable region. Returns true if hovered. */
  hit(x, y, w, h, fn, opts = {}) {
    if (this.clip && (y + h < this.clip.y || y > this.clip.y + this.clip.h)) return false;
    const r = { x, y, w, h, fn, disabled: !!opts.disabled, clip: this.clip };
    this.hits.push(r);
    const m = this.mouse;
    const inClip = !this.clip || (m.y >= this.clip.y && m.y <= this.clip.y + this.clip.h && m.x >= this.clip.x && m.x <= this.clip.x + this.clip.w);
    const hov = inClip && m.x >= x && m.x < x + w && m.y >= y && m.y < y + h;
    if (hov && !r.disabled) this.cursor = 'hand';
    return hov;
  }

  click(mx, my) {
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const r = this.hits[i];
      if (r.clip && (my < r.clip.y || my > r.clip.y + r.clip.h)) continue;
      if (mx >= r.x && mx < r.x + r.w && my >= r.y && my < r.y + r.h) {
        if (r.disabled) return 'disabled';
        r.fn?.();
        return 'ok';
      }
    }
    return null;
  }

  // ------------------------------------------------------------------ primitives
  rect(x, y, w, h, c) { this.ctx.fillStyle = c; this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  frame(x, y, w, h, c, t = 1) {
    const g = this.ctx; g.fillStyle = c;
    g.fillRect(x, y, w, t); g.fillRect(x, y + h - t, w, t); g.fillRect(x, y, t, h); g.fillRect(x + w - t, y, t, h);
  }
  text(s, x, y, { size = 12, color = COL.ink, font = FJ, align = 'left', bold = false, shadow = null, outline = null, max = 0 } = {}) {
    const g = this.ctx;
    g.font = `${bold ? 'bold ' : ''}${size}px ${font}`;
    g.textAlign = align;
    g.textBaseline = 'top';
    let str = String(s);
    if (max > 0) while (g.measureText(str).width > max && str.length > 1) str = str.slice(0, -2) + '…';
    if (outline) { g.strokeStyle = outline; g.lineWidth = 3; g.lineJoin = 'round'; g.strokeText(str, x, y); }
    if (shadow) { g.fillStyle = shadow; g.fillText(str, x + 1, y + 1); }
    g.fillStyle = color;
    g.fillText(str, x, y);
    return g.measureText(str).width;
  }
  measure(s, size = 12, font = FJ) { this.ctx.font = `${size}px ${font}`; return this.ctx.measureText(s).width; }

  /** Win98-style bevel box */
  bevel(x, y, w, h, face = '#e8e2d4', inset = false) {
    this.rect(x, y, w, h, face);
    const lt = inset ? '#8a8070' : '#ffffff', dk = inset ? '#ffffff' : '#8a8070';
    this.rect(x, y, w, 1, lt); this.rect(x, y, 1, h, lt);
    this.rect(x, y + h - 1, w, 1, dk); this.rect(x + w - 1, y, 1, h, dk);
  }

  /** Button. Returns hovered. */
  button(label, x, y, w, h, fn, { color = COL.yellow, text = COL.ink, disabled = false, size = 12, font = FJ, sub = null } = {}) {
    const hov = this.hit(x, y, w, h, fn, { disabled });
    const face = disabled ? '#d8d2c4' : hov ? lighten(color) : color;
    this.rect(x + 2, y + 2, w, h, 'rgba(0,0,0,0.25)');
    this.rect(x, y, w, h, face);
    this.frame(x, y, w, h, disabled ? '#a8a090' : COL.ink);
    this.rect(x + 1, y + 1, w - 2, 1, 'rgba(255,255,255,0.6)');
    const ty = sub ? y + 2 : y + Math.round((h - size) / 2) - 1;
    this.text(label, x + w / 2, ty, { size, color: disabled ? '#8a8070' : text, align: 'center', font });
    if (sub) this.text(sub, x + w / 2, y + h - 11, { size: 9, color: disabled ? '#8a8070' : text, align: 'center', font: FE });
    return hov;
  }

  link(label, x, y, fn, { size = 12, color = COL.link } = {}) {
    const w = this.measure(label, size);
    const hov = this.hit(x, y, w, size + 2, fn);
    this.text(label, x, y, { size, color: hov ? COL.red : color });
    this.rect(x, y + size + 1, w, 1, hov ? COL.red : color);
    return hov;
  }

  /** Pixel sprite from rows/legend at integer scale */
  sprite(rows, legend, x, y, s = 2) {
    const g = this.ctx;
    for (let j = 0; j < rows.length; j++) {
      const row = rows[j];
      for (let i = 0; i < row.length; i++) {
        const c = legend[row[i]];
        if (!c) continue;
        g.fillStyle = c;
        g.fillRect(x + i * s, y + j * s, s, s);
      }
    }
  }

  image(img, x, y, w, h) {
    const g = this.ctx;
    g.imageSmoothingEnabled = false;
    g.drawImage(img, Math.round(x), Math.round(y), w ?? img.width, h ?? img.height);
  }

  stars(n, x, y, color = '#ffb000', max = 5) {
    for (let i = 0; i < max; i++) this.sprite(['..X..', '.XXX.', 'XXXXX', '.XXX.', '.X.X.'], { X: i < n ? color : '#d8d0c0' }, x + i * 7, y, 1);
  }

  setClip(x, y, w, h) {
    const g = this.ctx;
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    this.clip = { x, y, w, h };
  }
  endClip() { this.ctx.restore(); this.clip = null; }

  badge(label, x, y, color = COL.red, blink = false) {
    if (blink && Math.floor(this.t * 2.5) % 2) return;
    const w = this.measure(label, 9, FE) + 6;
    this.rect(x, y, w, 11, color);
    this.text(label, x + 3, y + 1, { size: 9, color: '#fff', font: FE });
  }
}

export function lighten(c) {
  const n = parseInt(c.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) + 30), g = Math.min(255, ((n >> 8) & 255) + 30), b = Math.min(255, (n & 255) + 30);
  return `rgb(${r},${g},${b})`;
}

export function yen(n) { return '¥' + Math.floor(n).toLocaleString('ja-JP'); }

// ---------------------------------------------------------------- pixel sprites
export const SPR = {
  mascot: [ // カプたん, the capsule mascot
    '....KKKKKK....',
    '..KKWWWWWWKK..',
    '.KWWWWWWWWWWK.',
    '.KWWWWWWWWWWK.',
    'KWWKKWWWWKKWWK',
    'KWWKKWWWWKKWWK',
    'KRRRRRRRRRRRRK',
    'KPPPPPPPPPPPPK',
    'KPBBPPKKPPBBPK',
    '.KPPPPKKPPPPK.',
    '.KPPPPPPPPPPK.',
    '..KKPPPPPPKK..',
    '....KKKKKK....',
  ],
  mascotLegend: { K: '#2a2220', W: '#ffffff', R: '#c8352a', P: '#ff6f91', B: '#ff9fae' },
  cart: ['.X.......', 'XXXXXXXXX', '.X.....X.', '.XXXXXXX.', '..X...X..'],
  coin: ['.YYY.', 'YYKYY', 'YKKKY', 'YYKYY', '.YYY.'],
  capsule: ['..WWW..', '.WWWWW.', 'WWWWWWW', 'RRRRRRR', 'PPPPPPP', '.PPPPP.', '..PPP..'],
  arrow: [
    'K.........', 'KK........', 'KWK.......', 'KWWK......', 'KWWWK.....', 'KWWWWK....', 'KWWWWWK...', 'KWWWWWWK..', 'KWWWWWWWK.',
    'KWWWWWKKKK', 'KWWKWWK...', 'KWK.KWWK..', 'KK..KWWK..', 'K....KWWK.', '.....KWWK.', '......KK..',
  ],
  hand: [
    '....KK......', '...KWWK.....', '...KWWK.....', '...KWWK.....', '...KWWKKK...', '...KWWKWWKK.', 'KK.KWWKWWKWK', 'KWKKWWWWWKWK',
    'KWWKWWWWWWWK', '.KWWWWWWWWWK', '..KWWWWWWWWK', '..KWWWWWWWK.', '...KWWWWWWK.', '...KWWWWWK..', '....KKKKKK..',
  ],
  cursorLegend: { K: '#000000', W: '#ffffff' },
  star: ['..X..', '..X..', 'XXXXX', '.XXX.', 'X...X'],
  new: [],
};
