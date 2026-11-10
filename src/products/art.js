// Flavour illustrations for the label studio: what is in the can, drawn as small inked pixel pictures (fruit, coffee
// beans, tea leaves, a milk splash, bubbles, a bowl of oden...). Each function returns a trimmed Px with a hard outline;
// flat colours with one shade tone and a highlight, dithering only where a surface needs texture (a melon's net).
import { Px, dk, lt, chk } from './px.js';
import { INK } from './mascots.js';

const W = 0xfffaf0;
const S = (w, h, f, ink = INK) => { const p = new Px(w, h); f(p); return p.outline(ink).trim(); };
const ball = (p, cx, cy, rx, ry, c, sh = dk(c, 0.25), hi = null) => { p.ell(cx, cy, rx, ry, c); p.crescent(cx, cy, rx, ry, -Math.max(1, rx * 0.28), -Math.max(1, ry * 0.28), sh); if (hi !== false) { p.rect(Math.round(cx - rx * 0.55), Math.round(cy - ry * 0.6), Math.max(1, Math.round(rx * 0.3)), 1, hi ?? lt(c, 0.6)); p.rect(Math.round(cx - rx * 0.7), Math.round(cy - ry * 0.45), 1, Math.max(1, Math.round(ry * 0.3)), hi ?? lt(c, 0.6)); } };
const leaf = (p, x, y, w, h, c = 0x58a84a, flip = 1) => { p.shape(x - w, y - h, w * 2, h * 2, (px, py) => { const u = (px - x) * flip / w, v = (py - y) / h; return u * u + v * v <= 1 && Math.abs(v) < 1 - Math.abs(u) * 0.55 + 0.25; }, c); p.line(Math.round(x - w * 0.6 * flip), y, Math.round(x + w * 0.7 * flip), y, dk(c, 0.3), 1); };

export const ART = {
  /** Three roasted coffee beans. */
  beans() {
    return S(40, 26, (p) => {
      const bean = (x, y, rx, ry, tilt) => { ball(p, x, y, rx, ry, 0x8a4e2a, 0x5e3018, 0xb87a48); p.line(Math.round(x - rx * 0.5), Math.round(y + tilt), Math.round(x + rx * 0.5), Math.round(y - tilt), 0x3e1e0c, 1); };
      bean(9, 14, 7, 5, 2); bean(24, 9, 7, 5, -2); bean(28, 19, 7, 5, 1);
    });
  },
  /** A cup and saucer: liq = what's in it, band = the cup's stripe. o.steam */
  cup(liq = 0x4a2a14, band = 0xe0443a, o = {}) {
    const s = S(44, 34, (p) => {
      p.ell(20, 29, 17, 3.5, W); p.rect(8, 30, 24, 1, 0xd8d4e0);
      p.rect(33, 13, 6, 9, W); p.rect(34, 15, 3, 5, -1); p.cut(34, 15, 3, 5);
      p.shape(6, 9, 28, 20, (x, y) => y >= 10 && y <= 28 && Math.abs(x - 20) <= 13 - Math.max(0, y - 20) * 0.9, W);
      p.shape(6, 9, 28, 20, (x, y) => y >= 10 && y <= 28 && Math.abs(x - 20) <= 13 - Math.max(0, y - 20) * 0.9 && x > 28 - Math.max(0, y - 20), 0xd8d4e0);
      p.rect(8, 16, 25, 3, band);
      p.ell(20, 10.5, 13, 3, W); p.ell(20, 10.5, 11, 2, liq); p.rect(13, 10, 5, 1, lt(liq, 0.4));
      if (o.milk) { p.rect(18, 10, 6, 1, W); p.rect(21, 11, 4, 1, W); p.set(17, 11, W); }
    });
    if (!o.steam) return s;
    const q = new Px(s.w, s.h + 10); q.blit(s, 0, 10);
    for (const [x, ph] of [[14, 0], [21, 2]]) for (let i = 0; i < 9; i++) { const dx = Math.round(Math.sin((i + ph) * 0.9) * 1.4); q.rect(x + dx, 10 - i, 2, 1, o.steam === true ? W : o.steam); }
    return q;
  },
  /** A crown of splashing milk. */
  splash(c = W) {
    return S(52, 30, (p) => {
      const sh = 0xd4d8ea;
      p.ell(26, 24, 22, 5, c); p.rect(12, 26, 28, 1, sh);
      for (const [x, h, lean] of [[8, 12, -4], [16, 17, -2], [26, 20, 0], [36, 17, 2], [44, 12, 4]]) {
        p.poly([[x - 4, 23], [x + lean - 1, 23 - h], [x + lean + 2, 23 - h], [x + 4, 23]], c);
        p.ell(x + lean + 0.5, 21 - h, 2.5, 2.5, c);
        p.line(x + 2, 22, x + lean + 1, 25 - h, sh, 1);
      }
      for (const [x, y] of [[3, 6], [49, 5], [21, 0], [32, 1]]) p.ell(x + 0.5, y + 1.5, 1.5, 2, c);
    });
  },
  /** A sprig of young tea leaves. */
  leaves(c = 0x58a84a) {
    return S(44, 36, (p) => {
      p.line(22, 34, 22, 14, 0x6a7a2a, 2);
      leaf(p, 12, 22, 9, 5, c, -1); leaf(p, 32, 18, 9, 5, c, 1); leaf(p, 13, 11, 8, 4, lt(c, 0.25), -1);
      p.shape(18, 0, 10, 14, (x, y) => Math.abs(x - 22.5) < (13 - y) * 0.32 && y > 1, lt(c, 0.35)); p.line(22, 4, 22, 12, c, 1);
    });
  },
  /** Two ears of barley, crossed. */
  barley(c = 0xe8b840) {
    return S(46, 44, (p) => {
      const ear = (x0, y0, x1, y1) => {
        p.line(x0, y0, x1, y1, 0xb8862a, 1);
        const n = 7, dx = (x1 - x0) / 14, dy = (y1 - y0) / 14;
        for (let k = 0; k < n; k++) {
          const x = x1 - dx * k * 1.25, y = y1 - dy * k * 1.25, nx = -dy / Math.hypot(dx, dy), ny = dx / Math.hypot(dx, dy);
          for (const s of [-1, 1]) { p.ell(x + nx * s * 2.5, y + ny * s * 2.5, 2.4, 2.4, c); p.line(Math.round(x + nx * s * 4), Math.round(y + ny * s * 4), Math.round(x + nx * s * 7 + dx * 3), Math.round(y + ny * s * 7 + dy * 3), 0xb8862a, 1); }
        }
        p.ell(x1 + dx, y1 + dy, 2, 2, c);
      };
      ear(8, 42, 30, 8); ear(38, 42, 16, 8);
    });
  },
  /** Jasmine: white five-petal flowers, a bud, leaves. */
  jasmine() {
    return S(46, 36, (p) => {
      leaf(p, 9, 26, 8, 4, 0x4a9a5a, -1); leaf(p, 37, 28, 8, 4, 0x4a9a5a, 1);
      const fl = (x, y, r) => { for (let k = 0; k < 5; k++) { const a = k * Math.PI * 0.4 - 1.57; p.ell(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.72, r * 0.72, W); } p.ell(x, y, r * 0.42, r * 0.42, 0xffd23f); };
      fl(17.5, 13.5, 6); fl(31.5, 19.5, 5);
      p.ell(27.5, 6, 2.2, 3.2, W); p.rect(27, 9, 1, 3, 0x4a9a5a);
    });
  },
  /** An elegant tea cup with a slice of lemon on the saucer. */
  teacup() {
    return S(48, 32, (p) => {
      p.ell(22, 27, 19, 3.8, W); p.rect(8, 28, 28, 1, 0xd8d4e0); p.rect(6, 26, 32, 1, 0xd8b060);
      p.ring(36, 14, 5, 5, 2, W);
      p.shape(8, 6, 28, 20, (x, y) => y >= 7 && y <= 25 && ((x - 22) / 13.5) ** 2 + ((y - 7) / 18.5) ** 2 <= 1, W);
      p.shape(8, 6, 28, 20, (x, y) => y >= 7 && y <= 25 && ((x - 22) / 13.5) ** 2 + ((y - 7) / 18.5) ** 2 <= 1 && x > 29, 0xd8d4e0);
      p.rect(9, 10, 26, 1, 0xd8b060); p.rect(12, 14, 3, 3, 0x8a2a3a); p.rect(19, 15, 3, 3, 0x8a2a3a); p.rect(26, 14, 3, 3, 0x8a2a3a);
      p.ell(22, 7.5, 13, 3, W); p.ell(22, 7.5, 11, 2, 0xc8642a); p.rect(15, 7, 5, 1, 0xe89a5a);
      p.ell(41.5, 27, 4.5, 2.5, 0xf8e040); p.ell(41.5, 27, 3, 1.4, 0xfff4a0);
    });
  },
  /** A wedge of melon in front of the whole fruit. */
  melon() {
    return S(54, 40, (p) => {
      const G = 0x7ab84a;
      p.ell(34, 20, 16, 15, G);
      p.shape(18, 5, 32, 30, (x, y) => ((x - 34) / 16) ** 2 + ((y - 20) / 15) ** 2 <= 1 && ((Math.round(x + y * 0.6) % 6 === 0) || (Math.round(x - y * 0.6 + 60) % 6 === 0)), 0xd8eaa0);
      p.crescent(34, 20, 16, 15, -4, -4, dk(G, 0.25));
      p.rect(32, 1, 3, 5, 0x8a6a2a); p.rect(28, 1, 10, 2, 0x8a6a2a);
      // the wedge
      p.shape(0, 14, 34, 26, (x, y) => ((x - 16) / 16) ** 2 + ((y - 18) / 20) ** 2 <= 1 && y >= 18, 0x5a9a3a);
      p.shape(0, 14, 34, 26, (x, y) => ((x - 16) / 14) ** 2 + ((y - 18) / 17.5) ** 2 <= 1 && y >= 18, 0xcfee8a);
      p.shape(0, 14, 34, 26, (x, y) => ((x - 16) / 11) ** 2 + ((y - 18) / 13) ** 2 <= 1 && y >= 18, 0xa8dc6a);
      p.shape(0, 14, 34, 26, (x, y) => ((x - 16) / 6) ** 2 + ((y - 18) / 5) ** 2 <= 1 && y >= 18, 0xf4e8a0);
      for (const x of [12, 15, 18, 21]) p.rect(x, 20, 1, 2, 0xd8b050);
    });
  },
  /** A bunch of grapes with a leaf. */
  grapes(c = 0x7a3aa8) {
    return S(40, 46, (p) => {
      p.rect(19, 0, 2, 7, 0x6a4a2a);
      leaf(p, 29, 8, 8, 5, 0x58a84a, 1);
      const rows = [[4, 11], [5, 17], [4, 23], [3, 29], [2, 35], [1, 40]];
      for (const [n, y] of rows) for (let k = 0; k < n; k++) { const x = 20 - (n - 1) * 3.5 + k * 7; ball(p, x, y, 4, 4, c, dk(c, 0.3), lt(c, 0.55)); }
    });
  },
  /** A whole lemon and a cut slice. */
  lemon(c = 0xf8dc30) {
    return S(54, 34, (p) => {
      p.shape(0, 4, 34, 28, (x, y) => ((x - 17) / 14) ** 2 + ((y - 18) / 11) ** 2 <= 1 || (Math.abs(y - 18) < 3.5 && x > 1 && x < 33), c);
      p.shape(0, 4, 34, 28, (x, y) => ((x - 17) / 14) ** 2 + ((y - 18) / 11) ** 2 <= 1 && ((x - 13) / 14) ** 2 + ((y - 14) / 11) ** 2 > 1, dk(c, 0.22));
      p.rect(9, 11, 5, 1, lt(c, 0.6)); p.rect(8, 12, 1, 3, lt(c, 0.6));
      leaf(p, 26, 6, 7, 3.5, 0x58a84a, 1);
      // the slice
      p.ell(41, 21, 11.5, 11.5, c); p.ell(41, 21, 9.5, 9.5, 0xfff8c8); p.ell(41, 21, 8.5, 8.5, 0xfbe860);
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; p.line(41, 21, Math.round(41 + Math.cos(a) * 8), Math.round(21 + Math.sin(a) * 8), 0xfff8c8, 1); }
      p.rect(40, 20, 2, 2, 0xfff8c8);
    });
  },
  /** A tall glass of something fizzy with ice and a straw. */
  glass(liq = 0x4a1e14, o = {}) {
    return S(34, 50, (p) => {
      const in1 = (x, y) => y >= 8 && y <= 47 && Math.abs(x - 16) <= 11 - (y - 8) * 0.06;
      p.shape(3, 7, 28, 42, in1, 0xe4f2f8);
      p.shape(3, 7, 28, 42, (x, y) => in1(x, y) && y >= 13 && Math.abs(x - 16) <= 9.5 - (y - 8) * 0.06 && y <= 45, liq);
      for (const [x, y] of [[9, 15], [17, 13], [13, 22]]) { p.rect(x, y, 6, 6, o.ice ?? 0xd8f0fa); p.rect(x, y, 6, 1, W); p.rect(x, y, 1, 6, W); }
      for (const [x, y] of [[10, 34], [20, 30], [15, 40], [21, 39], [11, 28]]) p.rect(x, y, 1, 2, lt(liq, 0.55));
      p.rect(6, 12, 1, 30, W); p.rect(24, 16, 1, 26, 0xc8dce8);
      p.line(21, 12, 26, 0, o.straw ?? 0xe0443a, 2); p.set(23, 6, W); p.set(25, 2, W);
      if (o.foam) { p.rect(6, 9, 21, 5, W); p.ell(10, 9, 4, 3, W); p.ell(17, 8, 4, 3, W); p.ell(23, 9, 4, 3, W); }
    });
  },
  /** A glass marble among bubbles (ramune). */
  marble(c = 0x58c8d8) {
    return S(40, 40, (p) => {
      ball(p, 18, 22, 12, 12, c, dk(c, 0.3), W);
      p.shape(8, 12, 20, 20, (x, y) => ((x - 18) / 12) ** 2 + ((y - 22) / 12) ** 2 <= 0.7 && Math.abs(Math.sin((x + y) * 0.32) * 5 - (x - y + 4) * 0.5) < 2, 0xf8f8ff);
      for (const [x, y, r] of [[33, 9, 3.5], [36, 20, 2.5], [28, 3, 2]]) { p.ring(x, y, r, r, 1, 0x8ad8f0); p.set(Math.round(x - 1), Math.round(y - 1), W); }
    });
  },
  /** Bubbles: n rings rising. */
  bubbles(n = 3, c = 0x8ad8f0) {
    return S(40, 40, (p) => {
      const B = [[12, 26, 10], [28, 14, 8], [29, 32, 5], [10, 8, 4], [20, 3, 2.5]];
      for (const [x, y, r] of B.slice(0, n)) { p.ell(x, y, r, r, 0xe8f8ff); p.ring(x, y, r, r, 1.2, c); p.rect(Math.round(x - r * 0.5), Math.round(y - r * 0.6), Math.max(1, Math.round(r * 0.35)), 1, W); p.rect(Math.round(x - r * 0.65), Math.round(y - r * 0.45), 1, Math.max(1, Math.round(r * 0.35)), W); }
    }, dk(c, 0.45));
  },
  /** Plum blossom on a twig, two green plums. */
  plum() {
    return S(52, 40, (p) => {
      p.path([[2, 36], [16, 26], [30, 22], [48, 10]], 0x6a4a3a, 2); p.path([[30, 22], [36, 30]], 0x6a4a3a, 1);
      const fl = (x, y, r, c) => { for (let k = 0; k < 5; k++) { const a = k * Math.PI * 0.4 - 1.57; p.ell(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.75, r * 0.75, c); } p.ell(x, y, r * 0.5, r * 0.5, 0xffe070); p.set(Math.round(x), Math.round(y), 0xd8463a); };
      fl(17.5, 15.5, 6, 0xf8a8c0); fl(40.5, 9.5, 5, W); fl(31.5, 12.5, 3.5, 0xf8a8c0);
      ball(p, 12, 33, 5.5, 5.5, 0x9ac848); ball(p, 41, 30, 6, 6, 0xa8d050); p.line(41, 25, 41, 34, 0x7aa838, 1);
    });
  },
  /** A cob of corn in its husk. */
  corn() {
    return S(40, 50, (p) => {
      p.shape(8, 2, 24, 40, (x, y) => ((x - 20) / 9.5) ** 2 + ((y - 20) / 19) ** 2 <= 1, (x, y) => ((Math.floor(x / 3) + Math.floor((y + (Math.floor(x / 3) % 2) * 2) / 4)) % 5 === 0 ? 0xfff0a0 : (x % 3 === 0 || (y + (Math.floor(x / 3) % 2) * 2) % 4 === 0) ? 0xe0a820 : 0xf8d030));
      p.poly([[20, 48], [4, 40], [3, 20], [12, 34], [20, 40]], 0x6ab04a); p.poly([[20, 48], [36, 40], [37, 20], [28, 34], [20, 40]], 0x58a03c);
      p.line(8, 26, 15, 40, 0x4a8a34, 1); p.line(32, 26, 25, 40, 0x3a7a2a, 1);
      p.rect(18, 45, 4, 4, 0x8ab85a);
    });
  },
  /** A lacquer bowl of sweet red-bean soup with two rice dumplings. */
  shiruko() {
    return S(48, 34, (p) => {
      p.shape(3, 10, 42, 22, (x, y) => y >= 12 && ((x - 24) / 20) ** 2 + ((y - 12) / 18) ** 2 <= 1, 0x2a1c22);
      p.shape(3, 10, 42, 22, (x, y) => y >= 12 && ((x - 24) / 20) ** 2 + ((y - 12) / 18) ** 2 <= 1 && y > 24 && Math.abs(x - 24) < 9, 0xb8283a);
      p.rect(8, 16, 2, 6, 0x5a4a58); p.rect(17, 29, 14, 3, 0x2a1c22);
      p.ell(24, 12, 20, 5, 0xc8283a); p.ell(24, 12, 18, 3.6, 0x6a2030);
      for (const [x, y] of [[12, 12], [34, 11], [22, 14], [29, 13], [17, 10]]) p.rect(x, y, 2, 1, 0x8a3040);
      ball(p, 19, 10, 5, 4, W, 0xd8d4e0, false); ball(p, 30, 11, 5, 4, W, 0xd8d4e0, false);
    });
  },
  /** Oden on a skewer: konnyaku triangle, an egg, a tube of chikuwa, with a bowl of broth. */
  oden() {
    return S(40, 56, (p) => {
      p.rect(19, 0, 2, 56, 0xd8b070);
      p.poly([[20, 3], [7, 20], [33, 20]], 0x9a94a4); for (const [x, y] of [[16, 13], [22, 16], [19, 9], [26, 17], [12, 18]]) p.set(x, y, 0x5a5466);
      p.poly([[20, 3], [7, 20], [11, 20]], 0x7a7488);
      ball(p, 20, 30, 9.5, 8, 0xf4e2b8, 0xd8b888, W);
      p.rrect(8, 40, 24, 11, 3, 0xe8c890); p.rect(8, 42, 24, 2, 0xb07a40); p.rect(8, 47, 24, 2, 0xb07a40); p.rect(9, 40, 3, 11, 0xf8e8c0);
    });
  },
  /** A mug of cocoa under whipped cream. */
  cocoa() {
    return S(40, 40, (p) => {
      p.ring(31, 24, 6, 7, 2.5, 0xe0443a);
      p.rrect(5, 12, 24, 25, 3, 0xe0443a); p.rect(24, 13, 4, 23, dk(0xe0443a, 0.25)); p.rect(7, 15, 2, 14, lt(0xe0443a, 0.5));
      p.rect(9, 22, 12, 6, W); p.rect(11, 24, 3, 2, 0x6a3a1e); p.rect(16, 24, 3, 2, 0x6a3a1e);
      p.ell(17, 12, 12, 3.5, 0x6a3a1e);
      p.ell(13, 10, 5, 3.5, W); p.ell(20, 9, 5, 4, W); p.ell(17, 5.5, 4, 3.5, W); p.ell(18, 2.5, 2, 2, W);
      p.rect(12, 9, 2, 1, 0xd8d4e0); p.rect(19, 7, 3, 1, 0xd8d4e0); p.rect(16, 11, 4, 1, 0xd8d4e0);
      p.rect(22, 3, 1, 3, 0x8a4e2a); p.rect(11, 6, 2, 1, 0x8a4e2a);
    });
  },
  /** A snow-capped mountain over a pine wood. */
  mountain(c = 0x3a6ac8) {
    return S(72, 40, (p) => {
      p.poly([[36, 2], [4, 38], [68, 38]], c);
      p.poly([[36, 2], [25, 14], [29, 13], [32, 17], [36, 12], [40, 18], [43, 13], [47, 15]], W);
      p.poly([[36, 2], [47, 15], [68, 38], [52, 38]], dk(c, 0.25));
      p.poly([[40, 18], [43, 13], [47, 15], [36, 2]], 0xd4dcf0);
      for (const x of [8, 16, 24, 50, 58, 64]) { p.poly([[x, 28], [x - 4, 38], [x + 4, 38]], 0x2a7a4a); p.poly([[x, 24], [x - 3, 31], [x + 3, 31]], 0x3a9a5a); }
      p.rect(2, 38, 68, 2, 0x2a7a4a);
    });
  },
  /** A curling wave with spray. */
  wave(c = 0x2a6ad8) {
    return S(64, 36, (p) => {
      const top = (x) => 20 - Math.sin(x * 0.11) * 9 - (x > 34 ? (x - 34) * 0.35 : 0);
      p.shape(0, 0, 64, 36, (x, y) => y > top(x) && y < 35, c);
      p.shape(0, 0, 64, 36, (x, y) => y > top(x) && y < top(x) + 3.5, W);
      p.shape(0, 0, 64, 36, (x, y) => y > top(x) + 9 && y < top(x) + 11 && Math.round(x) % 9 < 6, lt(c, 0.4));
      p.shape(0, 0, 64, 36, (x, y) => y > 28 + Math.sin(x * 0.4) * 1.5, dk(c, 0.25));
      p.ell(15, 9, 6, 5, W); p.ell(9, 13, 4, 3, W); p.ell(21, 12, 3, 3, W);
      for (const [x, y] of [[4, 4], [26, 3], [14, 0], [30, 9]]) p.rect(x, y, 2, 2, W);
    });
  },
  /** A drop falling into a ring of ripples. */
  drop(c = 0x3aa0f0) {
    return S(40, 46, (p) => {
      p.ring(20, 38, 18, 5, 1.6, lt(c, 0.3)); p.ring(20, 38, 11, 3, 1.4, c);
      p.shape(8, 0, 24, 32, (x, y) => ((x - 20) / 9) ** 2 + ((y - 20) / 9) ** 2 <= 1 || (y < 16 && y > 1 && Math.abs(x - 20) < (y - 1) * 0.55), c);
      p.shape(8, 0, 24, 32, (x, y) => ((x - 20) / 9) ** 2 + ((y - 20) / 9) ** 2 <= 1 && ((x - 17) / 9) ** 2 + ((y - 17) / 9) ** 2 > 1, dk(c, 0.25));
      p.ell(16, 18, 1.6, 3, W); p.rect(17, 13, 1, 2, W);
    });
  },
  /** Half a grapefruit. */
  citrus(rind = 0xf8c040, flesh = 0xf88a6a) {
    return S(40, 40, (p) => {
      p.ell(20, 20, 18, 18, rind); p.ell(20, 20, 15.5, 15.5, 0xfff4d0); p.ell(20, 20, 14, 14, flesh);
      for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5; p.line(20, 20, Math.round(20 + Math.cos(a) * 14), Math.round(20 + Math.sin(a) * 14), 0xfff4d0, 1); }
      p.ell(20, 20, 2, 2, 0xfff4d0);
      for (const [x, y] of [[13, 12], [26, 14], [14, 26], [27, 27]]) p.rect(x, y, 2, 1, lt(flesh, 0.5));
    });
  },
  /** A bolt of lightning. */
  bolt(c = 0xffd23f) {
    return S(30, 46, (p) => { p.poly([[18, 0], [4, 24], [13, 24], [8, 46], [26, 18], [16, 18], [24, 0]], c); p.poly([[21, 0], [24, 0], [16, 18], [13, 18]], lt(c, 0.6)); });
  },
  /** An old black vinegar crock with a rope round its neck. */
  crock() {
    return S(40, 46, (p) => {
      ball(p, 20, 27, 16, 17, 0x2a2228, 0x161016, 0x6a6278);
      p.rect(11, 6, 18, 6, 0x3a3038); p.rect(10, 4, 20, 3, 0x8a6a4a); p.rect(13, 2, 14, 2, 0xa8865a);
      p.rect(10, 11, 20, 2, 0xd8b878); p.rect(26, 13, 2, 6, 0xd8b878); p.rect(25, 19, 4, 3, 0xd8b878);
      p.rect(13, 22, 14, 14, 0xf4e8c8); p.frame(13, 22, 14, 14, 0xc8302a);
    });
  },
  /** A hop cone and an ear of barley. */
  hops() {
    return S(48, 44, (p) => {
      const b = ART.barley(0xe8b840); p.blit(b, 10, 0);
      for (let r = 0; r < 5; r++) for (let k = 0; k <= r % 2 + (r < 4 ? 1 : 0); k++) { const x = 9 - (r % 2 + (r < 4 ? 1 : 0)) * 3.2 + k * 6.4 + 3, y = 22 + r * 4.4; p.ell(x, y, 3.6, 3.2, r % 2 ? 0x8ac04a : 0x6aaa3c); p.rect(Math.round(x - 1), Math.round(y - 2), 2, 1, 0xb8e070); }
      p.rect(11, 14, 2, 6, 0x4a8a34); leaf(p, 18, 15, 6, 3, 0x58a84a, 1);
    });
  },
  /** A whisky tumbler: amber, ice, fine bubbles. */
  tumbler(liq = 0xe89a30) {
    return S(40, 40, (p) => {
      p.shape(4, 4, 32, 34, (x, y) => y >= 5 && y <= 37 && Math.abs(x - 20) <= 14 - (y - 5) * 0.08, 0xe4f2f8);
      p.shape(4, 4, 32, 34, (x, y) => y >= 12 && y <= 34 && Math.abs(x - 20) <= 12 - (y - 5) * 0.08, liq);
      p.rect(8, 35, 24, 2, 0xc8dce8);
      for (const [x, y, s] of [[10, 14, 9], [21, 11, 8], [17, 22, 8]]) { p.rect(x, y, s, s, 0xfbe6b0); p.rect(x, y, s, 1, W); p.rect(x, y, 1, s, W); p.rect(x + s - 1, y + 1, 1, s - 1, 0xe8b860); }
      for (const [x, y] of [[11, 29], [15, 32], [27, 27], [29, 31], [24, 33]]) p.set(x, y, 0xfff0c0);
      p.rect(7, 8, 1, 24, W);
    });
  },
  /** A sake cup with the snake's-eye rings, cherry petals drifting. */
  sake() {
    return S(46, 34, (p) => {
      p.shape(8, 8, 30, 24, (x, y) => y >= 10 && y <= 30 && Math.abs(x - 23) <= 14 - (y - 10) * 0.42, W);
      p.shape(8, 8, 30, 24, (x, y) => y >= 10 && y <= 30 && Math.abs(x - 23) <= 14 - (y - 10) * 0.42 && x > 28, 0xd8d4e0);
      p.rect(17, 30, 12, 2, W);
      p.ell(23, 10, 14, 4.5, W); p.ell(23, 10, 12, 3.2, 0xe8f4fa); p.ring(23, 10, 8, 2.2, 1, 0x2a5ad8); p.ell(23, 10, 2.5, 0.9, 0x2a5ad8);
      for (const [x, y] of [[3, 5], [41, 3], [39, 22], [4, 20]]) { p.ell(x + 1, y + 1, 2, 1.5, 0xf8a8c0); p.set(x, y, 0xfbd0dc); }
    });
  },
  /** Natto: sticky beans lifted on chopsticks. */
  natto() {
    return S(46, 46, (p) => {
      p.line(40, 0, 20, 22, 0xd8b070, 2); p.line(45, 3, 24, 24, 0xc8a060, 2);
      for (const x of [16, 22, 28]) p.line(x, 24, x - 2, 38, 0xf4ecc8, 1);
      p.line(19, 27, 19, 34, 0xf4ecc8, 1); p.line(25, 26, 26, 36, 0xf4ecc8, 1);
      const B = [[18, 22], [25, 21], [22, 26]], T = [[8, 38], [16, 40], [24, 39], [32, 40], [12, 34], [20, 35], [28, 35], [36, 37]];
      for (const [x, y] of [...T, ...B]) ball(p, x, y, 4.2, 3.2, 0xc8964a, 0x9a6a2a, 0xf0d090);
      p.rect(2, 41, 40, 4, 0xf4f0e4); p.rect(2, 44, 40, 1, 0xd0ccc0);
    });
  },
  /** A crescent moon and stars. */
  moon(c = 0xffe070) {
    return S(40, 40, (p) => {
      p.crescent(18, 20, 14, 14, 7, -3, c);
      for (const [x, y, s] of [[31, 8, 2], [35, 22, 1], [26, 32, 1]]) { p.rect(x - s, y, s * 2 + 1, 1, c); p.rect(x, y - s, 1, s * 2 + 1, c); }
    }, dk(c, 0.5));
  },
  /** A milk bottle with a paper cap. */
  bottle(liq = W, cap = 0x3a8ae0) {
    return S(22, 48, (p) => {
      p.shape(1, 2, 20, 46, (x, y) => y >= 3 && y <= 46 && Math.abs(x - 11) <= (y < 12 ? 5.5 : y < 18 ? 5.5 + (y - 12) * 0.6 : 9.2), 0xe4f2f8);
      p.shape(1, 2, 20, 46, (x, y) => y >= 9 && y <= 44 && Math.abs(x - 11) <= (y < 12 ? 4 : y < 18 ? 4 + (y - 12) * 0.6 : 7.6), liq);
      p.rect(5, 3, 12, 4, cap); p.rect(5, 6, 12, 1, dk(cap, 0.3));
      p.rect(4, 22, 14, 10, cap); p.rect(6, 24, 10, 1, W); p.rect(6, 27, 10, 1, W); p.rect(6, 29, 6, 1, W);
      p.rect(3, 14, 1, 28, W);
    });
  },
  /** An onigiri (plain, for labels), a bowl of ramen, a pudding. */
  ramen() {
    return S(52, 38, (p) => {
      p.shape(3, 12, 46, 24, (x, y) => y >= 14 && ((x - 26) / 22) ** 2 + ((y - 14) / 20) ** 2 <= 1, W);
      p.shape(3, 12, 46, 24, (x, y) => y >= 14 && ((x - 26) / 22) ** 2 + ((y - 14) / 20) ** 2 <= 1 && y > 18 && y < 22 && Math.round(x) % 6 < 3, 0xe0443a);
      p.rect(18, 33, 16, 3, W); p.rect(18, 35, 16, 1, 0xd8d4e0);
      p.ell(26, 14, 22, 6, W); p.ell(26, 14, 20, 4.6, 0xd89a48);
      for (let x = 10; x < 42; x += 3) p.rect(x, 13 + ((x / 3) % 2), 2, 1, 0xf8e098);
      p.ell(15, 13, 4, 2.2, 0xf0b8a0); p.ring(15, 13, 4, 2.2, 1, 0xe8a0a0); p.set(15, 13, 0xe86a8a);
      p.rect(29, 9, 9, 6, 0x26342a); p.ell(24, 15, 3, 1.6, W); p.ell(24, 15, 1.4, 0.8, 0xf8c040);
      for (const [x, ph] of [[20, 0], [30, 2]]) for (let i = 0; i < 8; i++) p.rect(x + Math.round(Math.sin((i + ph) * 0.9) * 1.4), 7 - i, 2, 1, W);
    });
  },
  pudding() {
    return S(36, 30, (p) => {
      p.ell(18, 26, 16, 3.5, W); p.rect(6, 27, 24, 1, 0xd8d4e0);
      p.shape(5, 5, 26, 22, (x, y) => y >= 7 && y <= 25 && Math.abs(x - 18) <= 8 + (y - 7) * 0.25, 0xf8dc80);
      p.shape(5, 5, 26, 22, (x, y) => y >= 7 && y <= 25 && Math.abs(x - 18) <= 8 + (y - 7) * 0.25 && x > 22, 0xe8bc58);
      p.shape(5, 5, 26, 8, (x, y) => y >= 6 && y <= 11 && Math.abs(x - 18) <= 8 + (y - 7) * 0.25, 0x7a3a14); p.rect(11, 11, 3, 3, 0x7a3a14); p.rect(21, 11, 2, 2, 0x7a3a14);
      p.rect(13, 7, 5, 1, 0xb86a2a);
    });
  },
  /** A morning glory in flower (seed packets). */
  asagao(c = 0x5a5ae0) {
    return S(46, 46, (p) => {
      p.path([[23, 46], [22, 30], [26, 18]], 0x4a8a34, 2);
      leaf(p, 12, 34, 8, 5, 0x58a84a, -1); leaf(p, 34, 38, 8, 5, 0x58a84a, 1);
      p.ell(23, 16, 15, 14, c);
      for (let k = 0; k < 5; k++) { const a = k * Math.PI * 0.4 - 1.57; p.line(23, 16, Math.round(23 + Math.cos(a) * 14), Math.round(16 + Math.sin(a) * 13), lt(c, 0.45), 2); }
      p.ell(23, 16, 5, 4.5, W); p.ell(23, 16, 2, 2, 0xf8e070);
    });
  },
  /** A fish (cat food), a sweet potato chip / rice cracker, a wrapped candy. */
  fish(c = 0x6a9ad8) {
    return S(44, 26, (p) => {
      p.poly([[34, 13], [43, 4], [41, 13], [43, 22]], c);
      p.ell(19, 13, 16, 9, c); p.shape(3, 13, 32, 10, (x, y) => ((x - 19) / 16) ** 2 + ((y - 13) / 9) ** 2 <= 1 && y > 15, W);
      p.rect(8, 9, 3, 3, W); p.rect(9, 10, 2, 2, INK); p.line(14, 8, 14, 18, dk(c, 0.3), 1);
      for (const [x, y] of [[19, 10], [24, 12], [20, 14], [27, 9]]) p.rect(x, y, 2, 1, dk(c, 0.25));
    });
  },
  candy(c = 0xe0443a) {
    return S(40, 20, (p) => {
      p.poly([[12, 10], [2, 3], [4, 10], [2, 17]], lt(c, 0.5)); p.poly([[28, 10], [38, 3], [36, 10], [38, 17]], lt(c, 0.5));
      p.ell(20, 10, 9.5, 8, c); for (let x = 12; x < 29; x += 5) p.shape(10, 2, 20, 16, (px, py) => ((px - 20) / 9.5) ** 2 + ((py - 10) / 8) ** 2 <= 1 && Math.abs(px - x - (py - 10) * 0.4) < 1.1, W);
    });
  },
  senbei() {
    return S(34, 34, (p) => { ball(p, 17, 17, 15, 15, 0xd89a48, 0xb07a30, 0xf0c070); p.rect(8, 11, 18, 12, 0x26342a); p.rect(10, 13, 4, 1, 0x3e5244); for (const [x, y] of [[6, 22], [24, 6], [27, 22], [14, 27]]) p.rect(x, y, 2, 2, 0xb07a30); });
  },
};
export { chk };
