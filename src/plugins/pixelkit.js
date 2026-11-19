// The pixel-art kit in the HUD and money UIs (src/ui/pixelkit.js): the wallet counter's spinning 100-yen coin, coin
// bursts when cash comes in or goes out (real denominations, spinning sprites), notes fluttering at the ATM, the
// piggy bank's shake when you drop money in or shake it out, and a coin tray strip for the vending machine and the
// Mikawa-ya till (events 'pk:coins' { coins: [100, 10...], label }). Also swaps the old 'coin' UI icon for the kit's.
import { loadPixelKit, pkEl, pkCanvas, coinFor, coinSplit, noteFor } from '../ui/pixelkit.js';
import { defineIcon } from '../gfx/icons.js';
import { setIcon } from '../ui/staticIcons.js';
import '../ui/pixelkit.css';

export async function install(game) {
  const g = game;
  if (!(await loadPixelKit())) return;
  // the old hand-drawn 'coin' icon -> the kit's 100-yen coin, everywhere icons are drawn
  defineIcon('coin', { canvas: pkCanvas('coin100', 0, 1) });
  for (const el of document.querySelectorAll('[data-icon="coin"]')) { el._icon = null; setIcon(el); }

  // HUD: the wallet counter's coin
  const slot = document.querySelector('#money .coin');
  let hudCoin = null;
  if (slot) {
    hudCoin = pkEl('coin100', { scale: 2, cls: 'pk-hudcoin' });
    slot.replaceChildren(hudCoin);
  }
  const layer = document.createElement('div');
  layer.id = 'pk-layer';
  document.body.appendChild(layer);
  const anchor = () => (slot || document.getElementById('money'))?.getBoundingClientRect();

  /** One sprite flying a little stepped arc (4-px steps, no easing blur), then gone. */
  function fly(name, { x, y, dx, dy, up = 60, dur = 700, delay = 0, scale = 2, spin = true }) {
    const el = pkEl(name, { scale, cls: 'pk-fly' });
    el.style.left = `${x}px`; el.style.top = `${y}px`;
    setTimeout(() => {
      layer.appendChild(el);
      if (spin) el.play({ loop: true });
      const t0 = performance.now();
      const step = (now) => {
        const k = Math.min(1, (now - t0) / dur);
        const px = Math.round((dx * k) / 2) * 2, py = Math.round((dy * k - up * 4 * k * (1 - k)) / 2) * 2;
        el.style.transform = `translate(${px}px, ${py}px)`;
        if (k < 1) requestAnimationFrame(step); else el.remove();
      };
      requestAnimationFrame(step);
    }, delay);
  }

  function burst(delta) {
    const r = anchor();
    if (!r) return;
    const v = Math.abs(delta);
    const notes = Math.min(4, Math.floor(v / 1000));
    const coins = coinSplit(v % 1000 || (notes ? 0 : v), 6);
    const pieces = [...Array(notes).fill(noteFor(v)), ...coins.map(coinFor)];
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    pieces.forEach((name, i) => {
      const note = name.startsWith('note');
      const sp = (i - (pieces.length - 1) / 2) * 18;
      if (delta > 0) fly(note ? name + (i % 2 ? '_crumpled' : '') : name, { x: cx - 24 + sp * 2, y: cy - 150, dx: -sp * 2, dy: 140, up: 30, delay: i * 90, spin: !note, scale: note ? 1 : 2 });
      else fly(note ? name + '_crumpled' : name, { x: cx - 20, y: cy - 20, dx: sp * 3 + 40, dy: 110, up: 70, delay: i * 80, spin: !note, scale: note ? 1 : 2 });
    });
    hudCoin?.play({ cycles: 2, end: 0 });
  }

  g.events.on('wallet', ({ kind, delta }) => {
    if (!delta) return;
    if (kind === 'cash' || kind === 'withdraw') burst(kind === 'withdraw' ? Math.abs(delta) : delta);
    else if (kind === 'deposit') burst(-Math.abs(delta));
    else if (kind === 'piggy') piggyPop(delta);
  });

  // the piggy bank: a little card by the counter, the pig shaking (coins out) or a coin dropping in
  let pigCard = null;
  function piggyPop(delta) {
    pigCard?.remove();
    const card = pigCard = document.createElement('div');
    card.className = 'pk-piggy';
    const pig = pkEl('piggy', { scale: 2 });
    card.appendChild(pig);
    if (delta > 0) {
      const c = pkEl('coin100', { scale: 2, cls: 'pk-drop' });
      card.appendChild(c); c.play({ loop: true });
    }
    document.body.appendChild(card);
    requestAnimationFrame(() => card.classList.add('show'));
    pig.play({ loop: false, done: () => { if (delta < 0) pig.play({ loop: false }); } });
    setTimeout(() => { card.classList.remove('show'); setTimeout(() => card.remove(), 300); }, 2200);
  }

  // coin tray strip: coins dropped into the vending machine slot / counted out of the Mikawa-ya till
  let tray = null, trayT = 0;
  g.events.on('pk:coins', ({ coins = [], label = '' } = {}) => {
    if (!tray) {
      tray = document.createElement('div');
      tray.className = 'pk-tray';
      tray.innerHTML = '<div class="pk-tray-row"></div><div class="pk-tray-lbl"></div>';
      document.body.appendChild(tray);
    }
    const row = tray.querySelector('.pk-tray-row');
    if (label !== tray.dataset.label) { row.replaceChildren(); tray.dataset.label = label; }
    tray.querySelector('.pk-tray-lbl').textContent = label;
    for (const v of coins.slice(0, 10)) {
      const el = v >= 1000 ? pkEl(noteFor(v), { scale: 1 }) : pkEl(coinFor(v), { scale: 2 });
      row.appendChild(el);
      while (row.children.length > 12) row.firstChild.remove();
      if (v < 1000) el.play({ cycles: 1, end: 0 });
    }
    tray.classList.add('show');
    clearTimeout(trayT);
    trayT = setTimeout(() => { tray.classList.remove('show'); setTimeout(() => { tray?.remove(); tray = null; }, 300); }, 2600);
  });
}
