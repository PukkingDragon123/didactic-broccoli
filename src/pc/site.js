// The picture on the garage PC's CRT: a capsule screensaver while idle, and the GACHA-MART home page while
// you use the PC (the real, clickable store is the DOM overlay in src/ui/ShopUI.js).
import { W, H, COL, SPR, FONT_HEAD, FONT_BODY, rect, text, sprite, yen } from './ui.js';

const CAPS = ['#ff6f91', '#5cc4ff', '#ffd23f', '#58c06c', '#d94fb0', '#ff8c2e'];

export class Screen {
  constructor(game, canvas) {
    this.game = game;
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    this.t = 0;
    this.on = 0; // seconds since the store was opened
    this.saver = Array.from({ length: 16 }, (_, i) => ({
      x: Math.random() * W, y: Math.random() * H, vx: 24 + Math.random() * 40, vy: 18 + Math.random() * 30, c: CAPS[i % CAPS.length], s: 3 + (i % 3),
    }));
  }

  draw(dt, active) {
    this.t += dt;
    this.on = active ? this.on + dt : 0;
    const g = this.g;
    g.setTransform(this.canvas.width / W, 0, 0, this.canvas.height / H, 0, 0);
    g.imageSmoothingEnabled = false;
    if (active) this.drawSite(); else this.drawSaver(dt);
  }

  drawSaver(dt) {
    const g = this.g, t = this.t;
    rect(g, 0, 0, W, H, '#05060f');
    for (const c of this.saver) {
      c.x += c.vx * dt; c.y -= c.vy * dt;
      if (c.x > W + 30) c.x = -30;
      if (c.y < -30) c.y = H + 30;
      sprite(g, SPR.capsule, { W: '#f4fbff', R: '#9a9aa8', P: c.c }, c.x, c.y, c.s);
    }
    const bob = Math.sin(t * 0.8) * 18;
    sprite(g, SPR.mascot, SPR.mascotLegend, W / 2 - 28, H / 2 - 96 + bob, 4);
    text(g, 'GACHA-MART', W / 2, H / 2 - 30 + bob, { size: 60, font: FONT_HEAD, color: '#ff6f91', align: 'center', outline: '#3a0a1a' });
    const d = new Date();
    text(g, `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`, W / 2, H / 2 + 34 + bob, { size: 32, font: FONT_BODY, color: '#9fd9ff', align: 'center' });
    if (Math.floor(t * 1.2) % 2) text(g, 'CLICK TO SHOP', W / 2, H - 46, { size: 16, font: FONT_BODY, color: '#8a8aa0', align: 'center' });
  }

  /** A low-res rendition of the store's home page, seen while the camera glides in and out. */
  drawSite() {
    const g = this.g, t = this.t, s = this.game.state;
    rect(g, 0, 0, W, H, '#e6dfcf');
    // title bar
    const grd = g.createLinearGradient(0, 0, W, 0);
    grd.addColorStop(0, '#1b2f62'); grd.addColorStop(0.55, '#2f6fd6'); grd.addColorStop(1, '#79aef6');
    g.fillStyle = grd; g.fillRect(4, 4, W - 8, 26);
    text(g, 'GACHA-MART - Capsule Toy Web Store', 12, 9, { size: 16, color: '#fff' });
    rect(g, W - 36, 7, 28, 20, '#e6dfcf'); text(g, 'X', W - 22, 9, { size: 16, align: 'center' });
    // brand strip
    for (let x = 4; x < W - 4; x += 28) { rect(g, x, 34, 14, 56, '#ff6f91'); rect(g, x + 14, 34, 14, 56, '#ff7f9d'); }
    sprite(g, SPR.mascot, SPR.mascotLegend, 16, 42 + Math.round(Math.sin(t * 4)), 3);
    text(g, 'GACHA-MART', 64, 42, { size: 50, font: FONT_HEAD, color: '#fff', outline: '#c8352a' });
    rect(g, 4, 90, W - 8, 18, COL.navy);
    const msg = 'Welcome to GACHA-MART!   Capsules, machines & more - delivered to your garage!   ';
    g.save(); g.beginPath(); g.rect(4, 90, W - 8, 18); g.clip();
    const off = (t * 70) % 760;
    text(g, msg, W - off, 92, { size: 16, color: COL.yellow });
    g.restore();
    // sidebar + page
    rect(g, 4, 108, 140, H - 112, '#f4ecdc');
    ['Home', 'Machines', 'Capsules', 'Upgrades', 'Goods', 'Museum', 'Used', 'Sell', 'Book'].forEach((l, i) => {
      if (i === 0) { rect(g, 8, 114, 132, 30, '#fff'); rect(g, 8, 114, 132, 2, COL.ink); }
      rect(g, 14, 120 + i * 34, 18, 18, CAPS[i % CAPS.length]);
      text(g, l, 40, 121 + i * 34, { size: 16, color: i === 0 ? '#c8202a' : COL.ink });
    });
    rect(g, 144, 108, W - 148, H - 112, COL.bg);
    text(g, 'Welcome!', 160, 116, { size: 40, font: FONT_HEAD, color: COL.ink });
    rect(g, 160, 156, 200, 150, '#ffe6ee'); rect(g, 160, 156, 200, 2, COL.ink);
    for (let i = 0; i < 4; i++) sprite(g, SPR.capsule, { W: '#fff', R: '#9a9aa8', P: CAPS[(i + Math.floor(t)) % CAPS.length] }, 176 + i * 44, 210 + Math.round(Math.sin(t * 3 + i) * 3), 4);
    text(g, 'NEW ARRIVAL', 376, 160, { size: 16, color: '#fff', shadow: '#c8202a' });
    text(g, `${Object.keys(s.discovered).length} figures found`, 376, 188, { size: 16, color: COL.soft });
    text(g, yen(s.money), 376, 212, { size: 40, font: FONT_HEAD, color: '#c8202a' });
    for (let i = 0; i < 3; i++) { rect(g, 160 + i * 156, 320, 144, 140, '#fff'); rect(g, 160 + i * 156, 320, 144, 2, COL.ink); rect(g, 170 + i * 156, 420, 124, 28, COL.yellow); }
    // loading bar while "connecting"
    if (this.on < 1.2) {
      rect(g, W / 2 - 150, H / 2 - 24, 300, 48, '#e6dfcf'); rect(g, W / 2 - 150, H / 2 - 24, 300, 2, '#fff');
      text(g, 'Connecting...', W / 2, H / 2 - 18, { size: 16, align: 'center' });
      rect(g, W / 2 - 136, H / 2 + 4, 272, 12, '#fff');
      rect(g, W / 2 - 134, H / 2 + 6, 268 * Math.min(1, this.on / 1.0), 8, COL.blue);
    }
  }
}
