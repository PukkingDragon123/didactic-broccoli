// Credits: a long till receipt that feeds up the screen, printed from CREDITS.md (every song, sound, photo and the font,
// with its author and licence as the "price"), headed with the shop's sign, totalled THANK YOU and stamped 済.
// It scrolls by itself; the wheel, a drag or the arrow keys take over for a moment. Esc / the red-pen X / a click
// beside it closes it.   openCredits() -> Promise (resolves on close)
import raw from '../../CREDITS.md?raw';
import { audio } from '../core/audio.js';
import { paintLogo } from './logo.js';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ESC[c]);
const sfx = (n, o = {}) => { try { audio.init(); audio.play(n, o); } catch { /* audio not ready */ } };

/** CREDITS.md -> [{ head, items: [{ title, author, lic }] }] */
function parse(md) {
  const out = [];
  let sec = null, item = null;
  for (const line of md.split('\n')) {
    const l = line.trim();
    if (l.startsWith('## ')) {
      const head = l.slice(3).replace(/\s*\(.*\)\s*$/, '');
      if (/^licen[cs]es$/i.test(head)) { sec = null; continue; }
      sec = { head, items: [] }; out.push(sec); item = null;
    } else if (l.startsWith('### ') && sec) {
      item = { title: l.slice(4), author: '', lic: '' }; sec.items.push(item);
    } else if (item && l.startsWith('- Author:')) item.author = l.slice(9).trim();
    else if (item && l.startsWith('- Licence:')) item.lic = l.slice(10).replace(/\s*\(.*$/, '').replace(/^listed by the author as /, '').trim();
  }
  return out.filter((s) => s.items.length);
}

const short = (lic) => (/free to use/i.test(lic) ? 'FREE' : lic.replace(/ 1\.0$/, '').replace(/^Public domain$/i, 'PD').toUpperCase());

export function openCredits() {
  return new Promise((resolve) => {
    const secs = parse(raw);
    const wrap = document.createElement('div');
    wrap.className = 'tm-credits';
    const rows = secs.map((s) => `<div class="rc-h">* ${esc(s.head.toUpperCase())} *</div>` + s.items.map((it) =>
      `<div class="rc-row"><b>${esc(it.title)}</b><i>${esc(short(it.lic))}</i>${it.author ? `<small>${esc(it.author)}</small>` : ''}</div>`).join('')).join('<div class="rc-rule"></div>');
    const n = secs.reduce((a, s) => a + s.items.length, 0);
    wrap.innerHTML = `<div class="tm-roll"><div class="tm-receipt">
      <div class="rc-logo"></div>
      <div class="rc-jp">ガチャガレージ・領収書</div>
      <div class="rc-c">No. 1999-0401 &nbsp; CASHIER: GRANDPA</div>
      <div class="rc-rule"></div>
      <div class="rc-c">THE PEOPLE WHO MADE<br>THE SOUNDS, SONGS, PHOTOS<br>AND LETTERS IN THIS GAME</div>
      <div class="rc-rule"></div>
      ${rows}
      <div class="rc-rule"></div>
      <div class="rc-h">* MADE WITH *</div>
      <div class="rc-row"><b>three.js</b><i>MIT</i></div>
      <div class="rc-row"><b>Vite</b><i>MIT</i></div>
      <div class="rc-row"><b>DotGothic16</b><i>OFL</i><small>Fontworks</small></div>
      <div class="rc-rule"></div>
      <div class="rc-c">ITEMS ${n}</div>
      <div class="rc-total"><span>TOTAL</span><span>THANK YOU!</span></div>
      <div class="rc-hanko"></div>
      <div class="rc-jp">またのご来店をお待ちしております</div>
      <div class="rc-bar"></div>
      <div class="rc-c">0 1 9 9 9 0 4 0 1 7</div>
    </div></div>
    <button class="tm-x" aria-label="Close"></button>`;
    document.body.appendChild(wrap);
    const logo = paintLogo().art.canvas(2);
    wrap.querySelector('.rc-logo').appendChild(logo);
    const roll = wrap.querySelector('.tm-roll'), rec = wrap.querySelector('.tm-receipt');
    sfx('paper', { vol: 0.6 });
    let y = innerHeight * 0.55, hold = 0.8, drag = null, last = performance.now(), raf = 0, closed = false;
    const maxY = () => -(rec.offsetHeight - innerHeight * 0.6);
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (hold > 0) hold -= dt; else if (!drag) y -= dt * 38;
      y = Math.max(maxY(), Math.min(innerHeight * 0.55, y));
      rec.style.transform = `translateY(${Math.round(y / 2) * 2}px)`;
    };
    raf = requestAnimationFrame(frame);
    const close = () => {
      if (closed) return; closed = true;
      cancelAnimationFrame(raf);
      removeEventListener('keydown', onKey, true);
      wrap.classList.add('out');
      sfx('paper', { vol: 0.5 });
      setTimeout(() => { wrap.remove(); resolve(); }, 220);
    };
    const onKey = (e) => {
      if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); e.stopPropagation(); close(); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'PageDown' || e.key === 'PageUp' || e.key === ' ') {
        e.preventDefault(); e.stopPropagation();
        y += (e.key === 'ArrowUp' || e.key === 'PageUp' ? 1 : -1) * (e.key.startsWith('Page') || e.key === ' ' ? innerHeight * 0.6 : 60); hold = 2;
      }
    };
    addEventListener('keydown', onKey, true);
    wrap.addEventListener('wheel', (e) => { e.preventDefault(); y -= e.deltaY; hold = 2; }, { passive: false });
    wrap.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (e.target.closest('.tm-receipt')) { drag = { y0: e.clientY, from: y }; roll.setPointerCapture?.(e.pointerId); } });
    wrap.addEventListener('pointermove', (e) => { if (drag) { y = drag.from + (e.clientY - drag.y0); hold = 2; } });
    wrap.addEventListener('pointerup', (e) => { e.stopPropagation(); const moved = drag && Math.abs(e.clientY - drag.y0) > 6; drag = null; if (!moved && !e.target.closest('.tm-receipt')) close(); });
    wrap.querySelector('.tm-x').addEventListener('click', (e) => { e.stopPropagation(); close(); });
    setTimeout(() => wrap.querySelector('.tm-x').focus({ preventScroll: true }), 50);
  });
}
