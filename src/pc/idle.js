// The garage PC's picture while nobody sits at it (a small pixel canvas on the 3D CRT): black when it's off,
// a miniature of the Capsule 98 desktop just after you stand up (with a blinking envelope when something came
// in), then the "Flying Capsules" screen saver. Only redrawn a few times a second, and only when you're nearby.
import { wallpaperImage, iconURL } from '../os/art.js';
import { draw5 } from '../gfx/font5x7.js';

export const IW = 320, IH = 240;
const CAPS = ['#ff6f91', '#5cc4ff', '#ffd23f', '#58c06c', '#d94fb0', '#ff8c2e'];
const imgs = new Map();
function img(src) { if (!imgs.has(src)) { const i = new Image(); i.src = src; imgs.set(src, i); } return imgs.get(src); }

export class IdleScreen {
  constructor(os) {
    this.os = os;
    this.canvas = document.createElement('canvas');
    this.canvas.width = IW; this.canvas.height = IH;
    this.g = this.canvas.getContext('2d');
    this.g.imageSmoothingEnabled = false;
    this.t = 0;
    this.away = 0; // seconds since you stood up
    this.caps = Array.from({ length: 14 }, (_, i) => ({ x: Math.random() * IW, y: Math.random() * IH, vx: 14 + Math.random() * 22, vy: 8 + Math.random() * 16, c: CAPS[i % CAPS.length], s: 1 + (i % 3) }));
  }

  draw(dt) {
    this.t += dt; this.away += dt;
    const g = this.g, os = this.os;
    g.fillStyle = '#030304'; g.fillRect(0, 0, IW, IH);
    if (os.power === 'off') return;
    if (os.power === 'boot') { draw5(g, 'CAPSULE BIOS V4.51PG', 8, 8, { col: '#a8a8a8' }); draw5(g, 'MEMORY TEST : 65536K OK', 8, 20, { col: '#a8a8a8' }); return; }
    if (os.power === 'halt') { g.fillStyle = '#14204a'; g.fillRect(0, 0, IW, IH); draw5(g, 'CAPSULE 98', IW / 2, IH / 2 - 4, { col: '#fbf6ea', align: 'center', s: 2 }); return; }
    if (this.away > 30 && os.st.saver !== 'none') { this.saver(dt); return; }
    this.desktop();
  }

  desktop() {
    const g = this.g, os = this.os, st = os.st;
    const bar = 12, dh = IH - bar;
    g.fillStyle = '#2b7d7a'; g.fillRect(0, 0, IW, dh);
    if (st.wallpaper !== 'plain') { const w = wallpaperImage(st.wallpaper); if (w.complete && w.naturalWidth) g.drawImage(w, 0, 0, IW, dh); }
    // icons (miniature, column-major like the real desktop)
    const ids = os.order.filter((id) => { const a = os.apps.get(id); return a.desktop && (!a.unlocked || a.unlocked()); });
    const rows = Math.max(1, Math.floor((dh - 4) / 30));
    ids.forEach((id, i) => {
      const a = os.apps.get(id), x = 4 + Math.floor(i / rows) * 30, y = 4 + (i % rows) * 30;
      const im = img(iconURL(a.icon, 1));
      if (im.complete && im.naturalWidth) g.drawImage(im, x + 5, y, 20, 20);
      g.fillStyle = '#fbf6ea'; g.fillRect(x + 6, y + 23, 18, 2);
    });
    // open windows
    const sx = IW / os.W, sy = dh / os.deskH;
    for (const w of [...os.wins].sort((a, b) => +a.el.style.zIndex - +b.el.style.zIndex)) {
      if (w.minimized) continue;
      const x = Math.round(w.x * sx), y = Math.round(w.y * sy), ww = Math.round(w.w * sx), hh = Math.round(w.h * sy);
      g.fillStyle = '#1a1416'; g.fillRect(x, y, ww, hh);
      g.fillStyle = '#d4ccbb'; g.fillRect(x + 1, y + 1, ww - 2, hh - 2);
      g.fillStyle = w === os.active ? '#1f3a7a' : '#8a8272'; g.fillRect(x + 2, y + 2, ww - 4, 6);
      g.fillStyle = '#fffdf6'; g.fillRect(x + 3, y + 10, ww - 6, hh - 13);
      g.fillStyle = '#c8c0b0'; for (let ly = y + 13; ly < y + hh - 5; ly += 5) g.fillRect(x + 6, ly, Math.max(4, (ww - 14) * (0.4 + ((ly * 7) % 5) / 9)), 2);
    }
    // taskbar
    g.fillStyle = '#d4ccbb'; g.fillRect(0, dh, IW, bar);
    g.fillStyle = '#fbf6ea'; g.fillRect(0, dh, IW, 1);
    g.fillStyle = '#e5383b'; g.fillRect(2, dh + 2, 24, 8);
    draw5(g, 'START', 4, dh + 3, { col: '#fbf6ea', s: 1, lh: 0 });
    const t = os._clock || '';
    draw5(g, t, IW - 4, dh + 3, { col: '#1a1416', align: 'right' });
    // something new? blink an envelope
    if (os.pending.length && Math.floor(this.t * 2) % 2 === 0) {
      const x = IW - 46, y = dh - 26;
      g.fillStyle = '#1a1416'; g.fillRect(x - 1, y - 1, 30, 22);
      g.fillStyle = '#fff4c0'; g.fillRect(x, y, 28, 20);
      g.fillStyle = '#1a1416'; for (let i = 0; i < 10; i++) { g.fillRect(x + 4 + i, y + 4 + Math.floor(i * 0.7), 1, 1); g.fillRect(x + 23 - i, y + 4 + Math.floor(i * 0.7), 1, 1); }
      g.strokeStyle = '#1a1416'; g.strokeRect(x + 4.5, y + 4.5, 19, 12);
    }
  }

  saver(dt) {
    const g = this.g;
    for (const c of this.caps) {
      c.x += c.vx * dt; c.y -= c.vy * dt;
      if (c.x > IW + 12) c.x = -12;
      if (c.y < -12) c.y = IH + 12;
      const s = c.s, x = Math.round(c.x), y = Math.round(c.y);
      g.fillStyle = '#f4fbff'; g.fillRect(x + s, y, 3 * s, s); g.fillRect(x, y + s, 5 * s, s);
      g.fillStyle = '#9a9aa8'; g.fillRect(x, y + 2 * s, 5 * s, s);
      g.fillStyle = c.c; g.fillRect(x, y + 3 * s, 5 * s, s); g.fillRect(x + s, y + 4 * s, 3 * s, s);
    }
    const bob = Math.round(Math.sin(this.t * 0.7) * 30);
    draw5(g, 'CAPSULE 98', IW / 2, IH / 2 - 7 + bob, { col: '#3a4a7a', align: 'center', s: 2 });
  }
}
