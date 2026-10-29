// Shared bits for the PC mini-games: a crisp integer-scaled canvas in the window, keyboard/pointer/touch input,
// pixel text, high-score tables (Gramps left a record on every game) and the 'pcGame' hook.
import { draw5, textW5 } from '../../../gfx/font5x7.js';
import { sfx } from '../../sfx.js';

export const DEFAULT_HI = {
  drop: [['GRAMPS', 18800], ['MIKAN', 6200], ['SATO 101', 2400]],
  run: [['GRAMPS', 2950], ['MIKAN', 1400], ['KENJI 201', 640]],
  catch: [['GRAMPS', 4200], ['MIKAN', 1900], ['OTA-SAN', 800]],
};

/** Merged high-score table (yours + the defaults), best first. */
export function hiTable(room, id, n = 5) {
  const mine = (room.state.hi?.[id] || []).map((e) => [e.name || 'YOU', e.score, true]);
  return [...mine, ...(DEFAULT_HI[id] || []).map(([a, b]) => [a, b, false])].sort((a, b) => b[1] - a[1]).slice(0, n);
}
export function best(room, id) { return room.state.best?.[id] || 0; }

/** Record a finished game: returns { rank (1-based among all), record (new personal best) }. */
export function submitScore(room, id, score, extra = {}) {
  const st = room.state, g = room.game;
  st.hi = st.hi || {}; st.best = st.best || {}; st.plays = st.plays || {};
  st.plays[id] = (st.plays[id] || 0) + 1;
  const record = score > (st.best[id] || 0);
  if (record) st.best[id] = score;
  const list = st.hi[id] = st.hi[id] || [];
  list.push({ name: 'YOU', score, day: g.state.day || 1 });
  list.sort((a, b) => b.score - a.score);
  list.length = Math.min(list.length, 5);
  const rank = hiTable(room, id, 99).findIndex(([, s, me]) => me && s === score) + 1;
  try { g.events.emit('pcGame', { game: id, score, ...extra }); } catch (e) { console.warn(e); }
  g.save();
  return { rank, record };
}

/**
 * Put a pixel canvas (W x H logical px) in a window body, scaled by the largest integer that fits.
 * Returns { canvas, g, scale, keys, pressed, ptr, pad, frame(), dispose() }.
 */
export function gameCanvas(win, W, H, { pad = [] } = {}) {
  win.body.innerHTML = `<div class="cos-game"><canvas width="${W}" height="${H}"></canvas></div>${pad.length ? `<div class="cos-pad">${pad.map(([k, l]) => `<button data-k="${k}">${l}</button>`).join('')}</div>` : ''}`;
  const canvas = win.body.querySelector('canvas'), g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  const box = win.body.querySelector('.cos-game');
  const io = { canvas, g, scale: 1, keys: new Set(), pressed: new Set(), released: new Set(), ptr: { x: W / 2, y: H / 2, in: false, down: false, clicked: false, right: false, wheel: 0 } };
  const fit = () => {
    const r = box.getBoundingClientRect();
    const s = Math.max(1, Math.floor(Math.min((r.width - 4) / W, (r.height - 4) / H)));
    const sf = s >= 1 && (r.width - 4) / W >= 1 ? s : Math.max(0.5, Math.min((r.width - 4) / W, (r.height - 4) / H));
    io.scale = sf;
    canvas.style.width = `${Math.round(W * sf)}px`; canvas.style.height = `${Math.round(H * sf)}px`;
  };
  const ro = new ResizeObserver(fit); ro.observe(box); fit();
  const pos = (e) => { const r = canvas.getBoundingClientRect(); io.ptr.x = (e.clientX - r.left) / r.width * W; io.ptr.y = (e.clientY - r.top) / r.height * H; };
  canvas.addEventListener('pointermove', (e) => { pos(e); io.ptr.in = true; });
  canvas.addEventListener('pointerleave', () => { io.ptr.in = false; });
  canvas.addEventListener('pointerdown', (e) => { pos(e); io.ptr.down = true; if (e.button === 2) io.ptr.right = true; else io.ptr.clicked = true; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointerup', () => { io.ptr.down = false; });
  canvas.addEventListener('wheel', (e) => { io.ptr.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
  for (const b of win.body.querySelectorAll('.cos-pad button')) {
    const k = b.dataset.k;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); io.keys.add(k); io.pressed.add(k); });
    const up = () => { if (io.keys.delete(k)) io.released.add(k); };
    b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
  }
  io.key = (e, down) => {
    const k = e.code;
    if (down) { if (!e.repeat) { io.keys.add(k); io.pressed.add(k); } } else if (io.keys.delete(k)) io.released.add(k);
  };
  io.blur = () => { for (const k of io.keys) io.released.add(k); io.keys.clear(); io.ptr.down = false; };
  /** Call at the end of each tick. */
  io.frame = () => { io.pressed.clear(); io.released.clear(); io.ptr.clicked = false; io.ptr.right = false; io.ptr.wheel = 0; };
  io.dispose = () => ro.disconnect();
  io.any = (...codes) => codes.some((c) => io.keys.has(c));
  io.hit = (...codes) => codes.some((c) => io.pressed.has(c));
  return io;
}

/** 5x7 pixel text. o: { s (scale), col, align, shadow } */
export function txt(g, s, x, y, o = {}) {
  const sc = o.s || 1;
  if (o.shadow) draw5(g, s, x + sc, y + sc, { s: sc, col: o.shadow, align: o.align });
  draw5(g, s, x, y, { s: sc, col: o.col || '#fff', align: o.align });
}
export const tw = (s, sc = 1) => textW5(s, sc);

/** A centred panel with a title, lines and a blinking prompt (title / pause / game over screens). */
export function panel(g, W, H, t, { title, lines = [], prompt = 'PRESS SPACE', col = '#ffd23f', y = null, w = 170 } = {}) {
  const h = 34 + lines.length * 11 + (prompt ? 14 : 0), x0 = Math.round((W - w) / 2), y0 = y ?? Math.round((H - h) / 2);
  g.fillStyle = 'rgba(14,10,24,0.86)'; g.fillRect(x0, y0, w, h);
  g.fillStyle = col; g.fillRect(x0, y0, w, 2); g.fillRect(x0, y0 + h - 2, w, 2);
  txt(g, title, W / 2, y0 + 8, { s: 2, col, align: 'center', shadow: '#000' });
  lines.forEach((l, i) => txt(g, typeof l === 'string' ? l : l[0], W / 2, y0 + 30 + i * 11, { col: typeof l === 'string' ? '#e8e0d0' : l[1], align: 'center' }));
  if (prompt && Math.floor(t * 2.2) % 2 === 0) txt(g, prompt, W / 2, y0 + h - 13, { col: '#fff', align: 'center' });
}

/** A small high-score table: rank + name on the left, score on the right (yours in yellow). */
export function hiBox(g, room, id, x, y, w, n = 3, title = 'HI-SCORES') {
  g.fillStyle = 'rgba(14,10,24,0.8)'; g.fillRect(x, y, w, 14 + n * 10);
  txt(g, title, x + w / 2, y + 3, { col: '#ff9ab0', align: 'center' });
  hiTable(room, id, n).forEach(([name, sc, me], i) => {
    const col = me ? '#ffd23f' : '#c8c0b0', yy = y + 14 + i * 10;
    txt(g, `${i + 1} ${name}`, x + 4, yy, { col });
    txt(g, String(sc), x + w - 4, yy, { col, align: 'right' });
  });
}

export { sfx };
