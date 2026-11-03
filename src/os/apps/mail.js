// Mailbox: e-mail with Inbox / Spam / Sent / Trash, a preview pane, attachments and a compose window.
//   game.os.mail.send({ from, addr?, subject, body, html?, spam?, kind?, attachments?: [{ name, icon?, kind, data }] })
//       attachments: kind 'coupon' (data: { yen }) can be redeemed once; kind 'note' (data: text) opens in Notepad;
//       anything else is handed to game.events 'os:attachment' { mail, attachment } when opened.
//   game.os.mail.list(folder), .unread(), .open(id)
import { h, esc, ic, btn } from './ui.js';
import { yen } from '../OS.js';
import { now, stampText, stampDate } from '../time.js';

const FOLDERS = [['inbox', 'Inbox', 'os_mail'], ['spam', 'Spam', 'os_spam'], ['sent', 'Sent Items', 'os_folder'], ['trash', 'Deleted Items', 'os_bin']];

export function installMail(game, os) {
  const st = os.st.mail ||= { list: [], nextId: 1 };
  const views = new Set();
  const addrOf = (from) => String(from || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '') + '@' + (/bank|credit/i.test(from) ? 'shinkin.or.jp' : /electric|power/i.test(from) ? 'kanto-denryoku.co.jp' : /water/i.test(from) ? 'city.morio.jp' : 'capsule.ne.jp');
  const api = os.mail = {
    send({ from = 'Unknown', addr = null, subject = '(no subject)', body = '', html = false, spam = false, kind = null, attachments = null, quiet = false } = {}) {
      const m = { id: st.nextId++, from: String(from), addr: addr || addrOf(from), subject: String(subject), body: String(body), html: !!html, kind, t: now(game).stamp, read: false, folder: spam ? 'spam' : 'inbox', attachments: (attachments || []).map((a) => ({ name: a.name || 'attachment.dat', icon: a.icon || null, kind: a.kind || 'file', data: a.data ?? null, claimed: false })) };
      st.list.push(m);
      if (st.list.length > 150) st.list.splice(0, st.list.length - 150);
      if (!spam && !quiet) {
        os.notify({ app: 'mail', title: 'You have new mail', body: `${m.from}: ${m.subject}`, icon: 'os_mail', sound: 'osMail', news: true, onClick: () => api.open(m.id) });
      }
      for (const v of views) v.refresh();
      os.updateBadges();
      return m;
    },
    list: (folder = 'inbox') => st.list.filter((m) => m.folder === folder),
    unread: () => st.list.filter((m) => m.folder === 'inbox' && !m.read).length,
    open: (id) => os.open('mail', { id }),
  };

  os.registerApp({
    id: 'mail', name: 'Mailbox', icon: 'os_mail', group: 'Internet', w: 680, h: 480, minW: 480, minH: 320,
    about: 'Mailbox 5.0 for Capsule 98. Your mail, delivered.',
    badge: () => api.unread(), tray: () => api.unread(), trayIcon: 'os_mail',
    open(win, args) {
      win.body.classList.add('ml');
      const v = { folder: 'inbox', sel: args.id || null };
      views.add(v);
      win.onClose(() => views.delete(v));
      const cur = () => st.list.find((m) => m.id === v.sel);
      const move = (m, folder) => { if (!m) return; m.folder = folder; v.sel = null; refresh(); os.updateBadges(); };
      const del = () => { const m = cur(); if (!m) return; if (m.folder === 'trash') { st.list.splice(st.list.indexOf(m), 1); v.sel = null; refresh(); } else move(m, 'trash'); os.sound('osTrash'); };
      const spam = () => { const m = cur(); if (!m) return; if (m.folder === 'spam') move(m, 'inbox'); else { move(m, 'spam'); if (m.kind === 'spam') os.achievements?.unlock('os_spam_spotter'); } };
      win.menubar([
        { label: 'File', items: [{ label: 'New Message', key: 'Ctrl+N', action: () => compose() }, { sep: true }, { label: 'Close', action: () => win.close() }] },
        { label: 'Edit', items: () => [{ label: 'Delete', key: 'Del', disabled: !cur(), action: del }, { label: cur()?.folder === 'spam' ? 'Not Spam' : 'Mark as Spam', disabled: !cur(), action: spam }, { label: 'Mark All as Read', action: () => { for (const m of api.list(v.folder)) m.read = true; refresh(); os.updateBadges(); } }] },
        { label: 'Tools', items: [{ label: 'Send and Receive', key: 'F5', action: () => sendRecv() }, { label: 'Empty Deleted Items', action: () => { st.list = st.list.filter((m) => m.folder !== 'trash'); os.sound('osTrash'); refresh(); } }] },
        { label: 'Help', items: [{ label: 'About Mailbox', action: () => os.alert('Mailbox 5.0 for Capsule 98\n(C) 1998 Capsule Systems Inc.', 'About Mailbox', 'os_mail') }] },
      ]);
      const tb = (icon, label, fn) => { const b = h('button', { class: 'c98-tbtn', html: `${ic(icon, 1)}<span>${label}</span>` }); b.addEventListener('click', fn); return b; };
      const tools = h('div', { class: 'c98-toolbar' }, tb('os_doc', 'New', () => compose()), tb('os_mail', 'Reply', () => { const m = cur(); if (m) compose({ to: m.addr, subject: `Re: ${m.subject}`, body: `\n\n----- Original Message -----\nFrom: ${m.from}\n\n${m.body}` }); }),
        h('i', { class: 'sep' }), tb('os_bin', 'Delete', del), tb('os_spam', 'Spam', spam), h('i', { class: 'sep' }), tb('os_globe', 'Send/Recv', () => sendRecv()));
      const tree = h('div', { class: 'ml-tree c98-list' });
      const list = h('div', { class: 'ml-list c98-list' });
      const prev = h('div', { class: 'ml-prev c98-list' });
      win.body.append(tools, h('div', { class: 'c98-split' }, tree, h('div', { class: 'ml-right' }, list, prev)));
      const sendRecv = () => {
        win.busy(true); win.status('Checking for new messages on mail.capsule.ne.jp...');
        setTimeout(() => { win.busy(false); refresh(); }, 700);
      };
      const refresh = v.refresh = () => {
        tree.textContent = '';
        for (const [id, label, icon] of FOLDERS) {
          const n = st.list.filter((m) => m.folder === id && !m.read).length;
          const row = h('div', { class: `ml-f${v.folder === id ? ' sel' : ''}`, html: `${ic(icon, 1)} <span>${label}${n ? ` <b>(${n})</b>` : ''}</span>` });
          row.addEventListener('click', () => { v.folder = id; v.sel = null; refresh(); });
          tree.append(row);
        }
        const items = api.list(v.folder).slice().reverse();
        list.textContent = '';
        const t = h('table', { class: 'c98-table' });
        t.append(h('thead', null, h('tr', null, h('th', { text: '' }), h('th', { text: v.folder === 'sent' ? 'To' : 'From' }), h('th', { text: 'Subject' }), h('th', { text: v.folder === 'sent' ? 'Sent' : 'Received' }))));
        const body = h('tbody');
        const tNow = now(game);
        for (const m of items) {
          const tr = h('tr', { class: `${m.id === v.sel ? 'sel' : ''}${m.read ? '' : ' unread'}` },
            h('td', { html: m.attachments.length ? ic('os_disk', 1) : m.read ? '' : ic('os_mail', 1) }), h('td', { text: m.from }), h('td', { text: m.subject }), h('td', { text: stampText(game, m.t, tNow) }));
          tr.addEventListener('click', () => { v.sel = m.id; if (!m.read) { m.read = true; os.updateBadges(); if (!api.unread() && api.list('inbox').length >= 4) os.achievements?.unlock('os_mail_all'); } refresh(); });
          tr.addEventListener('contextmenu', (e) => { e.preventDefault(); v.sel = m.id; refresh(); os.menu([{ label: 'Reply', action: () => compose({ to: m.addr, subject: `Re: ${m.subject}` }) }, { label: m.folder === 'spam' ? 'Not Spam' : 'Mark as Spam', action: spam }, { sep: true }, { label: 'Delete', action: del }], os.local(e)); });
          body.append(tr);
        }
        t.append(body);
        list.append(t);
        if (!items.length) list.append(h('div', { class: 'c98-empty', text: 'There are no items in this view.' }));
        drawPreview();
        const unread = api.unread();
        win.status(`${items.length} message(s), ${items.filter((m) => !m.read).length} unread`, unread ? `${ic('os_mail', 1)} ${unread} new` : 'Working Online');
      };
      const drawPreview = () => {
        prev.textContent = '';
        const m = cur();
        if (!m) { prev.append(h('div', { class: 'c98-empty', text: 'Select a message to read it.' })); return; }
        prev.append(h('div', { class: 'ml-hd', html: `<div><b>From:</b> ${esc(m.from)} &lt;${esc(m.addr)}&gt;</div><div><b>Date:</b> ${esc(stampDate(game, m.t))}</div><div><b>To:</b> gacha.garage@capsule.ne.jp</div><div><b>Subject:</b> ${esc(m.subject)}</div>` }));
        if (m.attachments.length) {
          const at = h('div', { class: 'ml-at' }, h('b', { text: 'Attachments: ' }));
          for (const a of m.attachments) {
            const b = h('button', { class: 'c98-btn flat small', html: `${ic(a.icon || (a.kind === 'coupon' ? 'ticket' : 'os_disk'), 1)} ${esc(a.name)}${a.kind === 'coupon' ? (a.claimed ? ' (redeemed)' : ` - ${yen(a.data?.yen || 0)}`) : ''}` });
            b.addEventListener('click', () => openAttachment(m, a));
            at.append(b);
          }
          prev.append(at);
        }
        const body = h('div', { class: 'ml-body' });
        if (m.html) body.innerHTML = m.body; else body.textContent = m.body;
        prev.append(body);
        if (m.folder === 'spam' && m.kind !== 'spam') prev.prepend(h('div', { class: 'ml-warn', html: `${ic('os_warn', 1)} This message was moved to Spam.` }));
      };
      const openAttachment = async (m, a) => {
        if (a.kind === 'coupon') {
          if (a.claimed) { os.alert('This coupon has already been redeemed.', a.name); return; }
          if (!(await os.confirm(`Redeem ${a.name} for ${yen(a.data?.yen || 0)}? The money is paid into your bank account.`, 'Redeem coupon'))) return;
          a.claimed = true;
          game.addMoney(a.data?.yen || 0, false, `Coupon: ${m.from}`);
          os.sound('osCoin');
          drawPreview();
          return;
        }
        if (a.kind === 'note') { os.open('notepad', { text: String(a.data || ''), name: a.name, readOnly: true }); return; }
        if (a.kind === 'virus') { os.alert(`${a.name} is not a valid Capsule 98 application.`, a.name, 'error'); return; }
        game.events.emit('os:attachment', { mail: m, attachment: a });
      };
      win.onArgs = (a) => { if (a?.id) { const m = st.list.find((x) => x.id === a.id); if (m) { v.folder = m.folder; v.sel = m.id; m.read = true; os.updateBadges(); } refresh(); } };
      win.onKey = (e) => { if (e.code === 'Delete') { del(); return true; } if (e.code === 'F5') { sendRecv(); return true; } return false; };
      if (v.sel) win.onArgs({ id: v.sel }); else refresh();
    },
  });

  // compose (a separate window per message)
  function compose({ to = '', subject = '', body = '' } = {}) { os.open('compose', { to, subject, body }); }
  os.registerApp({
    id: 'compose', name: 'New Message', icon: 'os_doc', desktop: false, hidden: true, multi: true, w: 520, h: 380,
    open(win, a) {
      win.body.classList.add('ml-c');
      const to = h('input', { class: 'c98-field', value: a.to || '', spellcheck: 'false' });
      const subj = h('input', { class: 'c98-field', value: a.subject || '', spellcheck: 'false' });
      const text = h('textarea', { class: 'c98-field', spellcheck: 'false' });
      text.value = a.body || '';
      const send = () => {
        const addr = to.value.trim(), s = subj.value.trim() || '(no subject)';
        if (!addr) { os.alert('Please enter at least one recipient in the To box.', 'New Message', 'warn'); return; }
        st.list.push({ id: st.nextId++, from: addr, addr, subject: s, body: text.value, t: now(game).stamp, read: true, folder: 'sent', attachments: [] });
        os.sound('osSend');
        win.close();
        const known = /daikoku/i.test(addr);
        setTimeout(() => {
          if (known) api.send({ from: 'Daikoku Toy Wholesale', addr: 'sales@daikoku-toys.co.jp', subject: `Re: ${s}`, body: 'Thank you for your mail!\n\nFor orders and deals, please message Mr. Daikoku on Pichat (ID: daikoku_toys). He reads his messages much faster than his mail.\n\nDaikoku Toy Wholesale' });
          else api.send({ from: 'Mail Delivery Subsystem', addr: 'MAILER-DAEMON@capsule.ne.jp', subject: 'Returned mail: User unknown', body: `The original message was received at ${stampDate(game, now(game).stamp)}\n\n   ----- The following addresses had permanent fatal errors -----\n<${addr}>\n\n   ----- Transcript of session follows -----\n550 <${addr}>... User unknown\n\n   ----- Original message follows -----\nSubject: ${s}` });
        }, known ? 9000 : 2500);
      };
      win.menubar([{ label: 'File', items: [{ label: 'Send', action: send }, { sep: true }, { label: 'Close', action: () => win.close() }] }]);
      win.body.append(h('div', { class: 'c98-toolbar' }, (() => { const b = h('button', { class: 'c98-tbtn', html: `${ic('os_mail', 1)}<span>Send</span>` }); b.addEventListener('click', send); return b; })()),
        h('div', { class: 'ml-cf' }, h('label', { text: 'To:' }), to, h('label', { text: 'Subject:' }), subj), text);
      setTimeout(() => (a.to ? text : to).focus(), 40);
    },
  });
}
