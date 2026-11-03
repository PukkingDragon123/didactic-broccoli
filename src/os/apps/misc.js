// The little programs: Notepad (documents saved with the game), the Recycle Bin, and the Control Panel
// (wallpaper, screen saver, CRT look, sounds, clock, about).
import { h, esc, ic, btn, tabs, group } from './ui.js';
import { WALLPAPERS, wallpaperURL } from '../art.js';

export function installMisc(game, os) {
  // ================================================================== Notepad
  const nst = os.st.notes ||= { docs: null, nextId: 1 };
  nst.docs ||= [
    { id: nst.nextId++, name: 'README.TXT', text: "Kiddo,\r\n\r\nIf you're reading this, you found the computer. Good. It's older than you, so be gentle with it.\r\n\r\nThe store for capsules and machines is on the Internet now. Double-click Navigator and go to GACHA-MART. The bank is in Shinkin Online. Mr. Daikoku sends deals on Pichat - always ask for a better price, he expects it.\r\n\r\nPay the rent on time. Mrs. Ota is kind, but she remembers everything.\r\n\r\nFeed the cat. Officially I never fed the cat.\r\n\r\n- Grandpa\r\n" },
    { id: nst.nextId++, name: 'todo.txt', text: '- clean the garage\r\n- fix the shutter\r\n- order capsules\r\n- \r\n' },
  ];
  os.registerApp({
    id: 'notepad', name: 'Notepad', icon: 'os_note', group: 'Accessories', w: 520, h: 380, multi: true,
    about: 'Notepad, a simple text editor.',
    open(win, args) {
      win.body.classList.add('np');
      let doc = args.doc ? nst.docs.find((d) => d.id === args.doc) : args.new || args.text != null ? null : nst.docs[0];
      let name = doc?.name || args.name || 'Untitled', dirty = false;
      const ro = !!args.readOnly;
      const ta = h('textarea', { class: 'c98-field np-t', spellcheck: 'false', wrap: 'soft' });
      ta.value = (doc?.text ?? args.text ?? '').replace(/\r\n/g, '\n');
      ta.readOnly = ro;
      ta.addEventListener('input', () => { if (!dirty) { dirty = true; title(); } });
      win.body.append(ta);
      const title = () => win.setTitle(`${name}${dirty ? ' *' : ''} - Notepad`);
      const save = async (as = false) => {
        if (!doc || as) {
          const r = await os.dialog({ title: 'Save As', icon: 'os_disk', text: 'File name:', input: { value: name === 'Untitled' ? 'Untitled.txt' : name }, buttons: [{ label: 'Save', value: 'ok', default: true }, { label: 'Cancel', value: null, cancel: true }] });
          if (!r || r.value !== 'ok' || !r.input.trim()) return false;
          name = r.input.trim().slice(0, 40);
          const ex = nst.docs.find((d) => d.name.toLowerCase() === name.toLowerCase());
          if (ex && ex !== doc && !(await os.confirm(`${name} already exists.\nDo you want to replace it?`, 'Save As', 'warn'))) return false;
          doc = ex || { id: nst.nextId++, name, text: '' };
          if (!ex) nst.docs.push(doc);
        }
        doc.text = ta.value; doc.name = name;
        dirty = false; title();
        os.sound('osMenu');
        return true;
      };
      const openDoc = () => {
        const list = nst.docs.map((d) => `<div class="np-o" data-id="${d.id}">${ic('os_txt', 1)} ${esc(d.name)}</div>`).join('') || '<p>No documents.</p>';
        const p = os.dialog({ title: 'Open', icon: 'os_folder', html: `<p>Look in: C:\\My Documents</p><div class="c98-list np-ol">${list}</div>`, buttons: [{ label: 'Cancel', value: null, cancel: true }], sound: false });
        for (const el of os.modalEl.querySelectorAll('.np-o')) el.addEventListener('dblclick', () => { os.dialogs[os.dialogs.length - 1]._resolve(null); os.open('notepad', { doc: +el.dataset.id }); });
        return p;
      };
      win.menubar([
        { label: 'File', items: [
          { label: 'New', key: 'Ctrl+N', action: () => os.open('notepad', { new: true }) }, { label: 'Open...', key: 'Ctrl+O', action: openDoc },
          { label: 'Save', key: 'Ctrl+S', disabled: ro, action: () => save() }, { label: 'Save As...', action: () => save(true) },
          { sep: true }, { label: 'Delete', disabled: !doc, action: async () => { if (doc && await os.confirm(`Are you sure you want to send '${doc.name}' to the Recycle Bin?`, 'Confirm File Delete')) { bin.items.unshift({ name: doc.name, from: 'C:\\My Documents', text: doc.text }); nst.docs.splice(nst.docs.indexOf(doc), 1); dirty = false; win.close(); os.sound('osTrash'); } } },
          { sep: true }, { label: 'Exit', action: () => win.close() }] },
        { label: 'Edit', items: [{ label: 'Select All', key: 'Ctrl+A', action: () => ta.select() }, { label: 'Time/Date', key: 'F5', disabled: ro, action: () => { ta.setRangeText(`${game.clock?.time || ''} ${game.calendar?.format?.() || ''}`, ta.selectionStart, ta.selectionEnd, 'end'); dirty = true; title(); } }] },
        { label: 'Search', items: [{ label: 'Find...', action: () => os.alert('Find is not available in this version of Notepad.', 'Notepad') }] },
        { label: 'Help', items: [{ label: 'About Notepad', action: () => os.alert('Notepad\nCapsule 98 Second Edition', 'About Notepad', 'os_note') }] },
      ]);
      // closing with unsaved changes asks first
      const close0 = win.close.bind(win);
      win.close = async () => {
        if (dirty && !ro) {
          const v = await os.dialog({ title: 'Notepad', icon: 'warn', text: `The text in the ${name} file has changed.\n\nDo you want to save the changes?`, buttons: [{ label: 'Yes', value: 'y', default: true }, { label: 'No', value: 'n' }, { label: 'Cancel', value: null, cancel: true }] });
          if (v === null) return;
          if (v === 'y' && !(await save())) return;
        }
        close0();
      };
      win.onKey = (e) => { if (e.ctrlKey && e.code === 'KeyS') { save(); return true; } return false; };
      ta.addEventListener('keydown', (e) => { if (e.ctrlKey && e.code === 'KeyS') { e.preventDefault(); save(); } });
      title();
      setTimeout(() => ta.focus(), 40);
    },
  });

  // ================================================================== Recycle Bin
  const bin = os.st.bin ||= { items: null };
  bin.items ||= [
    { name: 'taxes_1987.txt', from: 'C:\\GRANDPA', text: 'Income: some coins.\nExpenses: more coins.\n' },
    { name: 'my_poems.txt', from: 'C:\\GRANDPA\\SECRET', text: 'Little capsule, round and bright,\nwhat is in you? Not in sight.\nTurn the handle, hear the clack,\nno, I will not give you back.\n' },
    { name: 'machine_manual_chewed.doc', from: 'C:\\GRANDPA', text: '[most of this page has been chewed by a cat]' },
    { name: 'DO_NOT_DELETE.TXT', from: 'C:\\', text: 'do not delete', sticky: true },
  ];
  os.registerApp({
    id: 'recycle', name: 'Recycle Bin', icon: 'os_bin', deskIcon: () => (bin.items.length ? 'os_bin_full' : 'os_bin'), group: 'Accessories', w: 520, h: 330, hidden: true,
    about: 'Contains files you have deleted.',
    iconMenu: () => [{ label: 'Empty Recycle Bin', disabled: !bin.items.length, action: () => empty() }],
    open(win) {
      win.body.classList.add('rb');
      const tools = h('div', { class: 'c98-toolbar' });
      const listEl = h('div', { class: 'c98-list rb-l' });
      win.body.append(tools, listEl);
      let sel = null;
      const draw = () => {
        tools.textContent = '';
        tools.append(btn('Empty Recycle Bin', () => empty(draw), { cls: 'small', disabled: !bin.items.length }), btn('Restore', () => restore(), { cls: 'small', disabled: sel === null }));
        listEl.textContent = '';
        const t = h('table', { class: 'c98-table' }, h('thead', null, h('tr', null, h('th', { text: 'Name' }), h('th', { text: 'Original Location' }), h('th', { text: 'Type' }))));
        const tb = h('tbody');
        bin.items.forEach((f, i) => {
          const tr = h('tr', { class: i === sel ? 'sel' : '' }, h('td', { html: `${ic('os_txt', 1)} ${esc(f.name)}` }), h('td', { text: f.from }), h('td', { text: /\.doc$/i.test(f.name) ? 'Document' : 'Text Document' }));
          tr.addEventListener('click', () => { sel = i; draw(); });
          tr.addEventListener('dblclick', () => os.alert('This file is in the Recycle Bin.\n\nTo view it, you must first restore it.', f.name, 'warn'));
          tb.append(tr);
        });
        t.append(tb);
        listEl.append(t);
        win.status(`${bin.items.length} object(s)`);
        os.renderIcons();
      };
      const restore = () => {
        const f = bin.items[sel];
        if (!f) return;
        bin.items.splice(sel, 1);
        sel = null;
        nst.docs.push({ id: nst.nextId++, name: f.name, text: f.text || '' });
        os.notify({ title: 'File restored', body: `${f.name} is back in My Documents (open it from Start > Documents).`, icon: 'os_txt' });
        draw();
      };
      win.onTick = null;
      draw();
    },
  });
  async function empty(redraw = null) {
    if (!bin.items.length) return;
    if (!(await os.confirm(`Are you sure you want to delete these ${bin.items.length} items?`, 'Confirm Multiple File Delete', 'warn'))) return;
    const keep = bin.items.filter((f) => f.sticky);
    bin.items = keep;
    os.sound('osTrash');
    if (keep.length) setTimeout(() => os.alert(`Cannot delete ${keep[0].name}: It is being used by another person or program.\n\nClose any programs that might be using the file and try again. (Grandpa?)`, 'Error Deleting File', 'error'), 500);
    redraw?.();
    os.renderIcons();
  }

  // ================================================================== Control Panel (display properties style)
  const st = os.st;
  os.registerApp({
    id: 'settings', name: 'Control Panel', icon: 'gear', group: 'Programs', w: 430, h: 470, resizable: false, label: 'Control Panel',
    about: 'Change the look and sound of Capsule 98.',
    open(win, args) {
      win.body.classList.add('cp');
      const draft = { wallpaper: st.wallpaper, saver: st.saver, scanlines: st.scanlines, sounds: st.sounds, volume: st.volume, h24: st.h24, keyclicks: st.keyclicks };
      const apply = () => {
        Object.assign(st, draft);
        os.applyWallpaper();
        os.root.classList.toggle('no-scan', !st.scanlines);
        os.renderTray();
        os.tickClock(); os._clock = null; os.tickClock();
      };
      const preview = (id) => `<div class="cp-mon"><div class="cp-scr" style="background-image:${id === 'plain' ? 'none' : `url(${wallpaperURL(id)})`}"></div></div>`;
      const t = tabs(win.body, [
        { id: 'display', label: 'Background', render: (p) => {
          const pv = h('div', { class: 'cp-pv', html: preview(draft.wallpaper) });
          const list = h('div', { class: 'c98-list cp-wl' });
          for (const w of WALLPAPERS) {
            const r = h('div', { class: `cp-w${w.id === draft.wallpaper ? ' sel' : ''}`, text: w.name });
            r.addEventListener('click', () => { draft.wallpaper = w.id; pv.innerHTML = preview(w.id); for (const x of list.children) x.classList.toggle('sel', x === r); });
            list.append(r);
          }
          p.append(pv, h('p', { text: 'Wallpaper:' }), list);
        } },
        { id: 'saver', label: 'Screen Saver', render: (p) => {
          const sel = h('select', { class: 'c98-field' }, h('option', { value: 'capsules', text: 'Flying Capsules' }), h('option', { value: 'none', text: '(None)' }));
          sel.value = draft.saver;
          sel.addEventListener('change', () => { draft.saver = sel.value; });
          p.append(h('div', { class: 'cp-pv', html: '<div class="cp-mon"><div class="cp-scr saver"></div></div>' }), group('Screen Saver', h('div', { class: 'bk-row' }, sel), h('p', { class: 'c98-dim', text: 'Starts when nobody has sat at the computer for 30 seconds.' })));
        } },
        { id: 'look', label: 'Appearance', render: (p) => {
          const chk = (label, key) => { const i = h('input', { type: 'checkbox' }); i.checked = !!draft[key]; i.addEventListener('change', () => { draft[key] = i.checked; }); return h('label', { class: 'c98-check' }, i, h('span', { text: label })); };
          p.append(group('Monitor', chk('CRT scan lines', 'scanlines')), group('Clock', chk('24-hour clock', 'h24')));
        } },
        { id: 'sound', label: 'Sounds', render: (p) => {
          const chk = (label, key) => { const i = h('input', { type: 'checkbox' }); i.checked = !!draft[key]; i.addEventListener('change', () => { draft[key] = i.checked; }); return h('label', { class: 'c98-check' }, i, h('span', { text: label })); };
          const vol = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: draft.volume, class: 'cp-r' });
          vol.addEventListener('input', () => { draft.volume = +vol.value; });
          vol.addEventListener('change', () => os.sound('osDing', { vol: +vol.value / (st.volume || 1) }));
          p.append(group('System sounds', chk('Play Capsule 98 sounds', 'sounds'), h('div', { class: 'bk-row' }, h('span', { text: 'Volume:' }), vol)), group('Keyboard', chk('Key clicks', 'keyclicks')));
        } },
        { id: 'about', label: 'About', render: (p) => {
          p.append(h('div', { class: 'cp-about', html: `${ic('os_logo', 4)}<div><p><b>Capsule 98</b><br>Second Edition<br>4.10.2222 A</p><p>Registered to:<br>GACHA GARAGE<br>26814-OEM-0019981-04271</p><p>Computer:<br>Capsule 486DX4<br>65,536 KB RAM</p></div>` }));
        } },
      ], args.tab || 'display');
      const row = h('div', { class: 'cp-b' }, btn('OK', () => { apply(); win.close(); }, { cls: 'def' }), btn('Cancel', () => win.close()), btn('Apply', () => apply()));
      win.body.append(row);
      win.onArgs = (a) => { if (a?.tab) t.show(a.tab); };
    },
  });
  os.root.classList.toggle('no-scan', !st.scanlines);
}
