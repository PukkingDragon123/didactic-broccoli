// Pichat: the instant messenger (suppliers, neighbours, sellers, spam bots). Conversations persist in the save.
//   const t = game.os.messenger.thread({ id, name, avatar, kind: 'supplier'|'npc'|'seller'|'spam', status?, about? })
//       avatar: a portrait look object (see portraitURL in src/os/art.js) or a data URL. Calling thread() again with the
//       same id returns the same conversation (with its saved messages), so register handlers at start-up every time.
//   t.post({ from: 'them'|'me'|'system', text, choices?: [{ label, value }], delay? (s), qte?: { seconds, timeout } })
//       choices show as reply buttons; qte makes them a timed choice (os.qte) when you read it: the value
//       `timeout` is chosen if the bar runs out. Returns the message.
//   t.onReply(fn(value, { label, thread, msg }))   a reply button was picked (also game.events 'os:reply' { thread, value })
//   t.onText(fn(text, thread))                    free text typed in the box
//   t.choose(value), t.messages, t.unread, t.markRead(), t.setStatus('online'|'away'|'offline'), t.block(), t.pending()
//   game.os.messenger.open(id), .threads(), .unread()
import { h, esc, ic, btn } from './ui.js';
import { portraitURL } from '../art.js';
import { now, stampText } from '../time.js';
import { Game } from '../../game/Game.js';

export function installMessenger(game, os) {
  const st = os.st.msgr ||= { threads: {}, seq: 1 };
  const live = new Map();
  const play = () => game.state.playTime || 0;
  let views = new Set(); // open messenger windows (re-render on change)

  class Thread {
    constructor(d) { this.d = d; this.replyFns = []; this.textFns = []; }
    get id() { return this.d.id; }
    get name() { return this.d.name; }
    get kind() { return this.d.kind; }
    get messages() { const t = play(); return this.d.msgs.filter((m) => !m.at || m.at <= t); }
    get unread() { return this.d.unread || 0; }
    pending() { const t = play(); return this.d.msgs.filter((m) => m.at && m.at > t); }
    post({ from = 'them', text = '', choices = null, delay = 0, qte = null, sound = true } = {}) {
      const at = delay > 0 ? play() + delay : 0;
      // queued messages keep their order: a later post never shows before an earlier pending one
      const last = this.d.msgs[this.d.msgs.length - 1];
      const at2 = at && last?.at > at ? last.at + 0.6 : at;
      const m = { id: st.seq++, from, text: String(text), t: now(game).stamp, at: at2 || 0, choices: choices?.length ? choices.map((c) => ({ label: String(c.label), value: c.value ?? c.label })) : null, qte: qte || null, shown: !at2 };
      this.d.msgs.push(m);
      if (this.d.msgs.length > 120) this.d.msgs.splice(0, this.d.msgs.length - 120);
      if (!at2) arrive(this, m, sound);
      else pendingN++;
      redraw(this);
      return m;
    }
    onReply(fn) { this.replyFns.push(fn); return this; }
    onText(fn) { this.textFns.push(fn); return this; }
    openChoice() { const v = this.messages; for (let i = v.length - 1; i >= 0; i--) { const m = v[i]; if (m.from === 'me') return null; if (m.choices && m.picked === undefined) return m; } return null; }
    choose(value, { silent = false } = {}) {
      const m = this.openChoice();
      if (!m) return false;
      const c = m.choices.find((x) => x.value === value) || { label: String(value), value };
      m.picked = c.value;
      if (!silent && c.label) this.post({ from: 'me', text: c.label });
      for (const fn of this.replyFns) { try { fn(c.value, { label: c.label, thread: this, msg: m }); } catch (e) { console.error(e); } }
      game.events.emit('os:reply', { thread: this.id, value: c.value });
      redraw(this);
      return true;
    }
    text(s) {
      this.post({ from: 'me', text: s });
      for (const fn of this.textFns) { try { fn(s, this); } catch (e) { console.error(e); } }
      if (!this.textFns.length && this.kind !== 'spam') {
        const r = this.d.away || (this.d.status === 'offline' ? null : ['Haha', 'ok!', 'Sorry, busy right now. Talk later!', ':)', 'mm'][Math.floor(Math.random() * 5)]);
        if (r) this.post({ from: 'them', text: r, delay: 2 + Math.random() * 3 });
      }
    }
    markRead() { if (this.d.unread) { this.d.unread = 0; os.updateBadges(); } }
    setStatus(s) { this.d.status = s; redraw(this); }
    block() { this.d.blocked = true; this.d.unread = 0; redraw(this); os.updateBadges(); }
  }

  let pendingN = 0;
  function arrive(t, m, sound = true) {
    m.shown = true;
    t.d.last = m.t;
    if (m.from !== 'them' || t.d.blocked) return;
    const open = [...views].some((v) => v.cur === t.id && v.win === os.active && !v.win.minimized);
    if (!open) t.d.unread = (t.d.unread || 0) + 1;
    if (sound && os.seated) os.sound('osMsg');
    if (!open) os.notify({ app: 'messenger', title: t.name, body: m.text.length > 90 ? m.text.slice(0, 88) + '...' : m.text, icon: 'os_chat', sound: null, news: t.kind !== 'spam', onClick: () => api.open(t.id) });
    for (const v of views) v.win.flash();
    os.updateBadges();
  }
  // queued replies appear in their own time (only checked while something is queued)
  Game.updaters.push(() => {
    if (!pendingN) return;
    const t = play();
    let left = 0;
    for (const id of Object.keys(st.threads)) {
      const th = get(id);
      for (const m of th.d.msgs) {
        if (m.shown) continue;
        if (m.at <= t) { arrive(th, m); redraw(th); } else left++;
      }
    }
    pendingN = left;
    if (left) for (const v of views) v.typing?.();
  });

  function get(id) {
    let t = live.get(id);
    if (!t) { t = new Thread(st.threads[id]); live.set(id, t); }
    return t;
  }
  function redraw(t) { for (const v of views) v.refresh(t?.id); }
  os.on('seat', (on) => { if (on) setTimeout(() => { for (const v of views) v.refresh(); }, 600); }); // a timed choice waits for you

  const api = os.messenger = {
    thread({ id, name, avatar = null, kind = 'npc', status = 'online', about = '', away = null } = {}) {
      if (!id) throw new Error('messenger.thread: id required');
      if (!st.threads[id]) st.threads[id] = { id, name: name || id, avatar, kind, status, about, away, msgs: [], unread: 0, blocked: false, since: now(game).stamp };
      const d = st.threads[id];
      if (name) d.name = name;
      if (avatar) d.avatar = avatar;
      if (kind) d.kind = kind;
      if (about) d.about = about;
      return get(id);
    },
    get: (id) => (st.threads[id] ? get(id) : null),
    threads: () => Object.keys(st.threads).map(get),
    unread: () => Object.values(st.threads).reduce((a, d) => a + (d.blocked ? 0 : d.unread || 0), 0),
    open: (id) => os.open('messenger', { thread: id }),
  };
  // count what was still queued in the save
  for (const d of Object.values(st.threads)) for (const m of d.msgs) if (!m.shown) pendingN++;

  const avaURL = (a) => (typeof a === 'string' ? a : portraitURL(a || {}));
  const STATUS = { online: 'Online', away: 'Away', offline: 'Offline' };

  os.registerApp({
    id: 'messenger', name: 'Pichat Messenger', label: 'Pichat', icon: 'os_chat', group: 'Internet', w: 640, h: 450, minW: 460, minH: 320,
    about: 'Pichat 99b - "Pichi pichi!" Instant messages for everyone.',
    badge: () => api.unread(), tray: () => api.unread(), trayIcon: 'os_chat',
    open(win, args) {
      win.body.classList.add('pi');
      const v = { win, cur: args.thread || null };
      views.add(v);
      win.onClose(() => views.delete(v));
      win.menubar([
        { label: 'Pichat', items: [{ label: 'My Status: Online', checked: true }, { label: 'Add Contact...', action: () => os.alert('Contacts can only be added by invitation in this version of Pichat.', 'Add Contact') }, { sep: true }, { label: 'Close', action: () => win.close() }] },
        { label: 'Contact', items: () => { const t = v.cur && get(v.cur); return [{ label: 'View Profile', disabled: !t, action: () => profile(t) }, { label: 'Block', disabled: !t || t.d.blocked, action: () => block(t) }, { label: 'Clear History', disabled: !t, action: () => { t.d.msgs = t.d.msgs.filter((m) => m.choices && m.picked === undefined); redraw(t); } }]; } },
        { label: 'Help', items: [{ label: 'About Pichat', action: () => os.alert('Pichat 99b\nPichi pichi! (C) 1999 Pichat Japan K.K.', 'About Pichat', 'os_chat') }] },
      ]);
      const list = h('div', { class: 'pi-list c98-list' });
      const chat = h('div', { class: 'pi-chat' });
      win.body.append(h('div', { class: 'c98-split' }, list, chat));
      const meStatus = () => win.status(`${ic('os_chat', 1)} Online - ${Object.keys(st.threads).length} contacts`);
      meStatus();

      v.refresh = (id) => {
        drawList();
        if (!id || id === v.cur) drawChat();
      };
      v.typing = () => { const el = chat.querySelector('.pi-typing'); if (!el || !v.cur) return; const t = get(v.cur); const p = t.pending().find((m) => m.from === 'them'); const show = p && p.at - play() < 3; el.textContent = show ? `${t.name} is typing...` : ''; };
      const drawList = () => {
        list.textContent = '';
        const said = (d) => d.msgs.some((m) => m.shown);
        const groups = [['Contacts', (d) => !d.blocked && d.kind !== 'spam'], ['Not in list', (d) => !d.blocked && d.kind === 'spam' && said(d)], ['Blocked', (d) => d.blocked && said(d)]];
        const all = Object.values(st.threads).sort((a, b) => (b.last || 0) - (a.last || 0));
        for (const [g, f] of groups) {
          const items = all.filter(f);
          if (!items.length) continue;
          list.append(h('div', { class: 'pi-g', text: `${g} (${items.length})` }));
          for (const d of items) {
            const row = h('div', { class: `pi-c${d.id === v.cur ? ' sel' : ''}${d.unread ? ' new' : ''}` },
              h('i', { class: `pi-dot ${d.status || 'online'}` }), h('img', { class: 'c98-ava', src: avaURL(d.avatar), width: 24, height: 24 }),
              h('span', { class: 'pi-n', text: d.name }), d.unread ? h('b', { class: 'pi-u', text: d.unread }) : null);
            row.addEventListener('click', () => select(d.id));
            row.addEventListener('contextmenu', (e) => { e.preventDefault(); const t = get(d.id); os.menu([{ label: 'Send Message', bold: true, action: () => select(d.id) }, { label: 'View Profile', action: () => profile(t) }, { sep: true }, { label: d.blocked ? 'Unblock' : 'Block', action: () => { if (d.blocked) { d.blocked = false; redraw(t); } else block(t); } }], os.local(e)); });
            list.append(row);
          }
        }
      };
      let qteBusy = false;
      const select = (id) => { v.cur = id; if (id && st.threads[id]) get(id).markRead(); drawList(); drawChat(); };
      const drawChat = () => {
        chat.textContent = '';
        if (!v.cur || !st.threads[v.cur]) { chat.append(h('div', { class: 'pi-empty', html: `${ic('os_chat', 3)}<p>Select a contact to start chatting.</p>` })); return; }
        const t = get(v.cur), d = t.d;
        t.markRead();
        win.setTitle(`${d.name} - Pichat`);
        const head = h('div', { class: 'pi-head' }, h('img', { class: 'c98-ava', src: avaURL(d.avatar), width: 48, height: 48 }),
          h('div', { class: 'pi-hn', html: `<b>${esc(d.name)}</b><small><i class="pi-dot ${d.status}"></i>${esc(STATUS[d.status] || 'Online')}${d.kind === 'spam' ? ' - not in your contact list' : ''}</small>` }),
          d.blocked ? null : btn('Block', () => block(t), { cls: 'small' }));
        const log = h('div', { class: 'pi-log c98-list' });
        const tNow = now(game);
        for (const m of t.messages) {
          if (m.from === 'system') { log.append(h('div', { class: 'pi-sys', text: m.text })); continue; }
          const who = m.from === 'me' ? 'You' : d.name;
          log.append(h('div', { class: `pi-m ${m.from}` }, h('div', { class: 'pi-mh', text: `${who} (${stampText(game, m.t, tNow)}):` }), h('div', { class: 'pi-mt', text: m.text })));
        }
        const typing = h('div', { class: 'pi-typing' });
        chat.append(head, log, typing);
        const oc = d.blocked ? null : t.openChoice();
        if (oc) {
          const row = h('div', { class: 'pi-choices' });
          const hurry = oc.qte && (qteBusy || !oc.qteDone);
          if (hurry) row.append(h('div', { class: 'pi-hurry', html: `${ic('os_warn', 1)} ${esc(d.name)} wants an answer now!` }));
          else for (const c of oc.choices) row.append(btn(c.label, () => t.choose(c.value)));
          chat.append(row);
          if (oc.qte && !oc.qteDone && !qteBusy && os.seated) {
            qteBusy = true;
            oc.qteDone = true;
            setTimeout(() => os.qte({ title: `${d.name} is waiting...`, prompt: oc.text, choices: oc.choices, seconds: oc.qte.seconds || 8 }).then((val) => {
              qteBusy = false;
              t.choose(val === null ? (oc.qte.timeout ?? oc.choices[oc.choices.length - 1].value) : val, { silent: val === null });
              if (val === null) t.post({ from: 'system', text: '(You took too long to answer.)' });
            }), 350);
          }
        } else if (!d.blocked) {
          const inp = h('textarea', { class: 'c98-field pi-in', rows: 2, spellcheck: 'false' });
          const send = () => { const s = inp.value.trim(); if (!s) return; inp.value = ''; os.sound('osSend'); t.text(s); };
          inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
          chat.append(h('div', { class: 'pi-send' }, inp, btn('Send', send, { cls: 'def' })));
          if (d.kind === 'spam' || d.status === 'offline') inp.placeholder = d.status === 'offline' ? `${d.name} is offline. Messages will be delivered later.` : '';
        } else chat.append(h('div', { class: 'pi-sys', text: 'You have blocked this contact.' }));
        log.scrollTop = log.scrollHeight;
        v.typing();
      };
      const profile = (t) => os.dialog({ title: `${t.name} - Profile`, icon: 'os_user', html: `<p><img class="c98-ava" src="${avaURL(t.d.avatar)}" width="72" height="72" style="float:right;margin-left:10px"><b>${esc(t.name)}</b></p><p>${esc(t.d.about || 'No profile information.')}</p><p class="c98-dim">Pichat ID: ${esc(t.id)}<br>In your list since ${esc(stampText(game, t.d.since || 0))}</p>` });
      const block = async (t) => { if (await os.confirm(`Block ${t.name}? You will no longer receive messages from them.`, 'Block contact')) { t.block(); if (t.kind === 'spam') os.achievements?.unlock('os_spam_spotter'); } };
      win.onArgs = (a) => { if (a?.thread) select(a.thread); };
      if (!v.cur) v.cur = Object.values(st.threads).sort((a, b) => (b.unread || 0) - (a.unread || 0) || (b.last || 0) - (a.last || 0))[0]?.id || null;
      select(v.cur);
      win.onTick = () => { v.typing(); meStatus(); };
    },
  });
}
