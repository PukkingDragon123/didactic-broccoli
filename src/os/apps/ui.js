// Small building blocks shared by the Capsule 98 programs (all plain DOM, styled by os.css / apps.css).
import { h, esc } from '../OS.js';
import { ic } from '../art.js';

export { h, esc, ic };

/** A push button. */
export function btn(label, onClick, { cls = '', icon = null, disabled = false, title = null } = {}) {
  const b = h('button', { class: `c98-btn ${cls}`, title, disabled, html: `${icon ? ic(icon, 1) + ' ' : ''}${esc(label)}` });
  b.addEventListener('click', (e) => { if (!b.disabled) onClick?.(e); });
  return b;
}

/** Property-sheet tabs: tabs(host, [{ id, label, render(panel) }], current) -> { show(id), panel } */
export function tabs(host, defs, current = defs[0].id, onShow = null) {
  const bar = h('div', { class: 'c98-tabs' });
  const panel = h('div', { class: 'c98-tabpanel' });
  host.append(bar, panel);
  const api = { panel, cur: null };
  api.show = (id) => {
    const d = defs.find((x) => x.id === id) || defs[0];
    api.cur = d.id;
    for (const b of bar.children) b.classList.toggle('on', b.dataset.id === d.id);
    panel.textContent = '';
    panel.scrollTop = 0;
    try { d.render(panel); } catch (e) { console.error(e); panel.textContent = 'This page could not be displayed.'; }
    onShow?.(d.id);
  };
  for (const d of defs) {
    const b = h('button', { class: 'c98-tab', 'data-id': d.id, text: d.label });
    b.addEventListener('click', () => api.show(d.id));
    bar.append(b);
  }
  api.show(current);
  return api;
}

/** A sunken report table: table([{ label, cls }], rows: [[cells...]] | [{ cells, cls, onClick, onDbl }]) */
export function table(cols, rows, { cls = '', empty = 'No items.' } = {}) {
  const wrap = h('div', { class: `c98-list ${cls}` });
  const t = h('table', { class: 'c98-table' });
  t.append(h('thead', null, h('tr', null, ...cols.map((c) => h('th', { class: c.cls || '', text: c.label })))));
  const tb = h('tbody');
  for (const r of rows) {
    const row = Array.isArray(r) ? { cells: r } : r;
    const tr = h('tr', { class: row.cls || '' });
    row.cells.forEach((c, i) => {
      const td = h('td', { class: cols[i]?.cls || '' });
      if (c instanceof Node) td.append(c); else td.innerHTML = c ?? '';
      tr.append(td);
    });
    if (row.onClick) tr.addEventListener('click', () => { for (const x of tb.children) x.classList.remove('sel'); tr.classList.add('sel'); row.onClick(); });
    if (row.onDbl) tr.addEventListener('dblclick', row.onDbl);
    tb.append(tr);
  }
  t.append(tb);
  wrap.append(t);
  if (!rows.length) wrap.append(h('div', { class: 'c98-empty', text: empty }));
  return wrap;
}

/** Etched group box with a caption. */
export function group(title, ...kids) {
  return h('div', { class: 'c98-group' }, h('span', { class: 'lg', text: title }), ...kids);
}

/** A fake "connecting..." wait inside a window body, then build(). */
export function loading(win, text, ms, build) {
  win.busy(true);
  const box = h('div', { class: 'c98-loading' }, h('div', { html: `${ic('os_globe', 2)}` }), h('p', { text }), h('div', { class: 'c98-prog' }, h('i')));
  win.body.textContent = '';
  win.body.append(box);
  const bar = box.querySelector('i'), t0 = performance.now();
  const step = () => {
    if (!box.isConnected) return;
    const k = Math.min(1, (performance.now() - t0) / ms);
    bar.style.width = `${Math.ceil(k * 20) * 5}%`;
    if (k < 1) requestAnimationFrame(step);
    else { win.busy(false); win.body.textContent = ''; build(); }
  };
  requestAnimationFrame(step);
}
