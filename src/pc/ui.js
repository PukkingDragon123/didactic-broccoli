// Tiny canvas kit for the picture on the garage PC's CRT (640x480 logical) + shared shop colours / yen format.
export const W = 640, H = 480;
export const FONT_HEAD = '"GG Display", "Grandstander", monospace';
export const FONT_BODY = '"Grandstander", "Pixelify Sans", monospace';

export const COL = {
  bg: '#fffdf4', paper: '#ffffff', ink: '#2a2220', soft: '#7a6a60', line: '#d8ccb8',
  red: '#e5383b', pink: '#ff6f91', yellow: '#ffd23f', blue: '#2f6fd6', sky: '#cfe8ff', green: '#3cae5a', navy: '#233a72',
  orange: '#ff8c2e', gray: '#c9c2b4', gold: '#d4a83a', link: '#1a3fd6', visited: '#6a2a9a',
};

export function yen(n) { return '¥' + Math.floor(n).toLocaleString('en-US'); }

export function rect(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }

export function text(g, s, x, y, { size = 16, color = COL.ink, font = FONT_BODY, align = 'left', outline = null, shadow = null } = {}) {
  g.font = `${size}px ${font}`;
  g.textAlign = align;
  g.textBaseline = 'top';
  if (outline) { g.strokeStyle = outline; g.lineWidth = 4; g.lineJoin = 'round'; g.strokeText(s, x, y); }
  if (shadow) { g.fillStyle = shadow; g.fillText(s, x + 2, y + 2); }
  g.fillStyle = color;
  g.fillText(s, x, y);
}

/** Pixel sprite from rows + legend at integer scale. */
export function sprite(g, rows, legend, x, y, s = 2) {
  for (let j = 0; j < rows.length; j++) {
    for (let i = 0; i < rows[j].length; i++) {
      const c = legend[rows[j][i]];
      if (!c) continue;
      g.fillStyle = c;
      g.fillRect(Math.round(x + i * s), Math.round(y + j * s), s, s);
    }
  }
}

export const SPR = {
  mascot: [ // the capsule mascot
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
  capsule: ['..WWW..', '.WWWWW.', 'WWWWWWW', 'RRRRRRR', 'PPPPPPP', '.PPPPP.', '..PPP..'],
};
