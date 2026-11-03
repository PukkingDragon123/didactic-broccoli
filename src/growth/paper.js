// Property paperwork, on the game's paper kit (src/ui/paper.js + paper.css): contracts you seal with your own hanko,
// and the little order slips (a machine for an empty spot, a carton for the stock room).
//   await contract(game, { kind, title, jp, party, property, rows: [[label, value]], total, clauses, note }) -> true | false
//       the lease / sales / works contract: the other party's seal is already on it; "Stamp your hanko" (key 1) seals
//       it, "Not now" (Esc) puts it away. opts.check() -> error text | null is asked before the stamp lands.
//   await slip(game, { title, jp, options: [{ label, sub, price, disabled, value }] }) -> value | null
import { audio } from '../core/audio.js';
import { yen } from './data.js';
import './paper.css';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sfx = (n, v = 0.6) => { try { audio.play(n, { vol: v }); } catch { /* audio not ready */ } };

let sealURL = null;
/** Your personal seal: a round red hanko, hand-pixelled (a double ring, the character 印 inside). */
function seal(name = '') {
  if (sealURL) return sealURL;
  const c = document.createElement('canvas'); c.width = 28; c.height = 28;
  const x = c.getContext('2d');
  const red = '#c8322c';
  x.fillStyle = red;
  for (let py = 0; py < 28; py++) for (let px = 0; px < 28; px++) {
    const d = Math.hypot(px - 13.5, py - 13.5);
    if ((d > 11.6 && d < 13.6) || (d > 9.2 && d < 10.2 && (px + py) % 7 !== 0)) x.fillRect(px, py, 1, 1);
  }
  x.font = '14px "DotGothic16"'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText((name || '印').slice(0, 1), 14, 14);
  // worn ink: a few gaps
  x.clearRect(5, 9, 1, 2); x.clearRect(21, 18, 1, 1); x.clearRect(13, 2, 2, 1);
  sealURL = c.toDataURL();
  return sealURL;
}

let current = null; // the paper that's up (a new one puts it away first)
function layer() {
  let el = document.getElementById('growth-paper');
  if (!el) { el = document.createElement('div'); el.id = 'growth-paper'; document.body.appendChild(el); }
  return el;
}

/** Free the mouse for the paper (unless the computer already has it), and take it back afterwards. */
function grab(game) {
  const atPC = !!(game.pc?.active || game.os?.isOpen);
  const prev = game.uiOpen;
  game.uiOpen = true;
  if (!atPC) game.input.unlock?.();
  return () => { game.uiOpen = prev; if (!atPC && !game.input.locked) game.input.lock?.(); };
}

export function contract(game, o) {
  current?.(false);
  const L = layer();
  const release = grab(game);
  const name = game.state.avatar?.name || 'You';
  const kindTitle = { lease: ['LEASE', '賃貸借契約書'], buy: ['SALE', '売買契約書'], renovate: ['WORKS', '工事請負契約書'], fitout: ['WORKS', '工事請負契約書'] }[o.kind] || ['CONTRACT', '契約書'];
  const date = game.calendar?.format?.(undefined, true) || `Day ${game.clock?.day ?? 1}`;
  const rows = (o.rows || []).map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('');
  L.innerHTML = `<div class="gp-dim"></div><div class="gp-doc"><i class="gp-tape"></i>
    <div class="gp-head"><b>${kindTitle[0]}</b><span>${kindTitle[1]}</span><small>${esc(date)}</small></div>
    <div class="gp-parties"><i>Between</i><span>${esc(o.party || 'Ota Real Estate')}</span><i>and</i><span>${esc(name)}, GACHA GARAGE</span></div>
    <div class="gp-prop"><b>${esc(o.title)}</b><small>${esc(o.jp || '')}</small>${o.note ? `<br>${esc(o.note)}` : ''}</div>
    <table>${rows}${o.total != null ? `<tr class="total"><td>Paid today (bank transfer)</td><td>${yen(o.total)}</td></tr>` : ''}</table>
    <ol>${(o.clauses || []).map((c) => `<li>${esc(c)}</li>`).join('')}</ol>
    <div class="gp-seals">
      <div class="gp-seal"><div class="gp-box"><i class="gp-theirs"></i></div><small>${esc(o.party || 'Ota Real Estate')}</small></div>
      <div class="gp-seal"><div class="gp-box empty" data-mine></div><span class="gp-sign">${esc(name)}</span><small>Your seal</small></div>
    </div>
    <div class="gp-msg"></div>
    <div class="gp-btns"><button data-v="ok">Stamp your hanko<kbd>1</kbd></button><button data-v="no">Not now<kbd>Esc</kbd></button></div>
  </div>`;
  L.classList.add('on');
  sfx('paper', 0.5);
  const doc = L.querySelector('.gp-doc'), msg = L.querySelector('.gp-msg'), box = L.querySelector('[data-mine]');
  return new Promise((resolve) => {
    let done = false;
    const close = (v) => {
      if (done) return;
      done = true;
      if (current === close) current = null;
      window.removeEventListener('keydown', onKey, true);
      doc.classList.add('out');
      release(); // (the mouse goes back to the game while the click still counts as a user gesture)
      setTimeout(() => { if (!current) { L.classList.remove('on'); L.innerHTML = ''; } resolve(v); }, v ? 520 : 280);
    };
    current = close;
    const stamp = () => {
      if (done) return;
      const why = o.check?.();
      if (why) { msg.textContent = why; sfx('error', 0.4); return; }
      box.classList.remove('empty');
      box.innerHTML = `<img src="${seal(name)}" alt="">`;
      for (const b of L.querySelectorAll('button')) b.disabled = true;
      sfx('stampThunk', 0.8);
      setTimeout(() => close(true), 650);
    };
    L.querySelectorAll('button').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); if (b.dataset.v === 'ok') stamp(); else close(false); }));
    L.querySelector('.gp-dim').addEventListener('click', () => close(false));
    const onKey = (e) => {
      if (e.code === 'Digit1' || e.code === 'Enter') { e.preventDefault(); e.stopPropagation(); stamp(); }
      if (e.code === 'Escape' || e.code === 'Digit2') { e.preventDefault(); e.stopPropagation(); close(false); }
    };
    window.addEventListener('keydown', onKey, true);
  });
}

/** A receipt-paper order slip: pick one line. Resolves with its value (or null). */
export function slip(game, o) {
  current?.(null);
  const L = layer();
  const release = grab(game);
  const opts = o.options || [];
  L.innerHTML = `<div class="gp-dim"></div><div class="gp-doc gp-slip">
    <div class="gp-head"><b>${esc(o.title)}</b><span>${esc(o.jp || '')}</span></div>
    ${o.note ? `<p>${esc(o.note)}</p>` : ''}
    ${opts.map((p, i) => `<button class="gp-opt" data-i="${i}" ${p.disabled ? 'disabled' : ''}><i></i><b>${esc(p.label)}${p.sub ? `<br><small>${esc(p.sub)}</small>` : ''}</b>${p.price != null ? `<span>${yen(p.price)}</span>` : ''}</button>`).join('')}
    <div class="gp-btns"><button data-v="no">Never mind<kbd>Esc</kbd></button></div></div>`;
  L.classList.add('on');
  sfx('paper', 0.4);
  const doc = L.querySelector('.gp-doc');
  return new Promise((resolve) => {
    let done = false;
    const close = (v) => {
      if (done) return;
      done = true;
      if (current === close) current = null;
      window.removeEventListener('keydown', onKey, true);
      doc.classList.add('out');
      release();
      setTimeout(() => { if (!current) { L.classList.remove('on'); L.innerHTML = ''; } resolve(v); }, 260);
    };
    current = close;
    L.querySelectorAll('.gp-opt').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); const p = opts[+b.dataset.i]; if (p && !p.disabled) { sfx('uiClick', 0.5); close(p.value ?? +b.dataset.i); } }));
    L.querySelector('[data-v="no"]').addEventListener('click', (e) => { e.stopPropagation(); close(null); });
    L.querySelector('.gp-dim').addEventListener('click', () => close(null));
    const onKey = (e) => {
      const n = /^Digit([1-9])$/.exec(e.code);
      if (n) { const p = opts[+n[1] - 1]; if (p && !p.disabled) { e.preventDefault(); e.stopPropagation(); close(p.value ?? +n[1] - 1); } }
      if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); close(null); }
    };
    window.addEventListener('keydown', onKey, true);
  });
}

/** Close whatever paper is up (tests, a cutscene starting). */
export function closePaper() {
  const L = document.getElementById('growth-paper');
  L?.querySelector('[data-v="no"]')?.click();
}
