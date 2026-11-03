// Multiplayer screens: the HOST SHOP / JOIN FRIEND panels on the main menu (the room code, big and copyable; your
// name; who's in), and in game the room badge with everyone in it (hold Tab for the rap sheet), the chat log, the chat
// line (T), and the "session over" card. Pixel style: Alagard, notched frames, no glows.
import './net.css';
import { iconHTML } from '../gfx/icons.js';
import { audio } from '../core/audio.js';
import { normCode } from './transport.js';
import { codeKind } from '../game/shareCode.js';
import { playerName, setPlayerName } from './boot.js';
import { MAX_PLAYERS } from './Session.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const sfx = (n, v = 0.5) => { try { audio.init(); audio.play(n, { vol: v }); } catch { /* */ } };
const yen = (n) => '¥' + Math.round(n).toLocaleString('en-US');

export class NetUI {
  constructor(mp) {
    this.mp = mp;
    this.game = mp.game;
    this.typing = false;
    this.lines = [];
    this.buildHud();
  }

  // ------------------------------------------------------------------ the main menu panels
  /** mode 'host' | 'join'. opts: { onPlay() (enter the game), fallback(mode) (the old read-only shop code) }. */
  menu(mode, opts = {}) {
    const share = $('share'), panel = share.querySelector('.panel');
    share.classList.remove('hidden');
    share.dataset.mode = 'net-' + mode;
    for (const c of panel.children) if (!c.classList.contains('x') && !c.classList.contains('mp-menu')) c.classList.add('mp-hide');
    panel.querySelector('.mp-menu')?.remove();
    const box = el('div', 'mp-menu');
    panel.appendChild(box);
    this.menuBox = box;
    this.menuOpts = opts;
    // the panel's own close button brings the old layout back for next time
    const x = panel.querySelector('.x');
    if (x && !x._mp) { x._mp = true; x.addEventListener('click', () => this.closeMenu()); }
    const nameRow = `<label class="mp-name"><span class="lbl">${iconHTML('people', 2)}Your name</span><input id="mp-name" maxlength="16" spellcheck="false" value="${esc(playerName())}"></label>`;
    if (mode === 'host') {
      box.innerHTML = `<div class="panel-title">${iconHTML('share', 2)}<span>Host your shop</span></div>${nameRow}
        <div class="mp-codebox"><small>Room code</small><div class="mp-code" id="mp-code">.....</div><button id="mp-copy">${iconHTML('copy', 2)}Copy</button></div>
        <div class="mp-list" id="mp-list"></div>
        <button class="big" id="mp-play">${iconHTML('play', 2)}Open the shop!</button>
        <div class="foot" id="mp-note">Opening the room...</div>
        <button class="mp-link" id="mp-alt">No internet? Share a visit code instead</button>`;
      $('mp-copy').addEventListener('click', () => this.copyCode());
      $('mp-play').addEventListener('click', () => { sfx('uiClick', 0.7); this.closeMenu(); opts.onPlay?.(); });
      $('mp-alt').addEventListener('click', () => { this.closeMenu(true); opts.fallback?.('host'); });
      this.bindName();
      this.hostRoom();
    } else {
      box.innerHTML = `<div class="panel-title">${iconHTML('share', 2)}<span>Join a friend</span></div>${nameRow}
        <label class="mp-codein"><small>Room code</small><input id="mp-join" maxlength="300" spellcheck="false" autocomplete="off" placeholder="ABCDE"></label>
        <button class="big" id="mp-go">${iconHTML('play', 2)}Join!</button>
        <div class="foot" id="mp-note">Ask your friend for the five-letter room code</div>
        <div class="mp-small">A long GG1... shop code works here too (a read-only visit)</div>`;
      const inp = $('mp-join');
      inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') this.join(); });
      $('mp-go').addEventListener('click', () => this.join());
      this.bindName();
      setTimeout(() => inp.focus(), 60);
    }
  }

  bindName() {
    const n = $('mp-name');
    n.addEventListener('keydown', (e) => e.stopPropagation());
    n.addEventListener('change', () => { const v = n.value.trim(); if (v) { setPlayerName(v); this.mp.me.name = v; this.mp.renameMe?.(v); } });
  }

  closeMenu(keepHidden = false) {
    const share = $('share'), panel = share.querySelector('.panel');
    this.menuBox?.remove();
    this.menuBox = null;
    for (const c of panel.querySelectorAll('.mp-hide')) c.classList.remove('mp-hide');
    if (!keepHidden) share.classList.add('hidden');
  }

  note(text, bad = false) { const n = $('mp-note'); if (n) { n.textContent = text; n.classList.toggle('bad', bad); } }

  async hostRoom() {
    const mp = this.mp;
    if (mp.active && mp.isHost) { this.showCode(); return; }
    if (mp.active && mp.isGuest) { this.note("You're in a friend's room. Leave it first (settings).", true); $('mp-play').disabled = true; return; }
    const v = $('mp-name')?.value.trim();
    if (v) { setPlayerName(v); mp.me.name = v; }
    try {
      await mp.host();
      this.showCode();
      sfx('netJoin', 0.6);
    } catch (e) {
      this.note(`${e.message || 'Could not open a room.'} You can still play, or share a visit code below.`, true);
      $('mp-code').textContent = '-----';
      $('mp-code').classList.add('off');
    }
  }

  showCode() {
    const c = $('mp-code');
    if (!c) return;
    c.textContent = this.mp.s.code;
    c.classList.remove('off');
    this.note(this.mp.s.kind === 'loop' ? 'Local test room (this browser only)' : 'Friends click JOIN FRIEND and type this code');
    this.refreshList();
  }

  async copyCode() {
    const code = this.mp.s?.code;
    if (!code) return;
    try { await navigator.clipboard.writeText(code); this.note('Copied! Send it to your friends.'); }
    catch { const r = document.createRange(); r.selectNodeContents($('mp-code')); getSelection().removeAllRanges(); getSelection().addRange(r); this.note('Selected: copy it with Ctrl+C'); }
    sfx('uiClick', 0.6);
  }

  refreshList() {
    const L = $('mp-list');
    if (!L || !this.mp.s) return;
    const ps = [...this.mp.s.players.values()];
    L.innerHTML = `<small>In the shop (${ps.length}/${MAX_PLAYERS})</small>` + ps.map((p) => `<div class="mp-p"><i style="background:${this.mp.colorOf(p.id)}"></i>${esc(p.name)}${p.id === 'H' ? ' <em>(owner)</em>' : ''}</div>`).join('') + (ps.length < 2 ? '<div class="mp-p wait">Waiting for friends...</div>' : '');
  }

  async join() {
    const raw = $('mp-join').value.trim();
    const v = $('mp-name')?.value.trim();
    if (v) { setPlayerName(v); this.mp.me.name = v; }
    const kind = codeKind(raw);
    if (kind === 'shop') { this.closeMenu(true); this.menuOpts.fallback?.('join', raw); return; }
    const code = normCode(raw);
    if (!code) { this.note('A room code is five letters / numbers', true); sfx('error', 0.5); return; }
    this.note('Knocking on the shutter...');
    $('mp-go').disabled = true;
    try {
      const info = await this.mp.probe(code);
      this.note(`${info.host}'s shop is open! Coming in...`);
      sfx('purchase', 0.6);
      setTimeout(() => this.mp.joinAndReload(code), 500);
    } catch (e) {
      $('mp-go').disabled = false;
      this.note(e.code === 'unreachable' ? `${e.message} Online play needs an internet connection (it can't work inside some embedded pages). A GG1 shop code still works.` : e.message || 'That didn\'t work', true);
      sfx('error', 0.5);
    }
  }

  // ------------------------------------------------------------------ in game
  buildHud() {
    const hud = $('hud') || document.body;
    this.roster = el('div', 'mp-roster hidden');
    hud.appendChild(this.roster);
    this.logEl = el('div', 'mp-log hidden');
    hud.appendChild(this.logEl);
    const bar = el('div', 'mp-chat hidden', `<span class="k">T</span><input id="mp-say" maxlength="140" spellcheck="false" autocomplete="off" placeholder="Say something... (Enter to send, Esc to cancel)">`);
    document.body.appendChild(bar);
    this.chatBar = bar;
    this.chatIn = bar.querySelector('input');
    this.chatIn.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { const t = this.chatIn.value; this.closeChat(); this.mp.social.say(t); }
      else if (e.key === 'Escape') this.closeChat();
    });
    this.chatIn.addEventListener('keyup', (e) => e.stopPropagation());
    this.chatIn.addEventListener('blur', () => { if (this.typing) setTimeout(() => this.closeChat(), 0); });
    addEventListener('keydown', (e) => {
      if (!this.mp.active || this.typing) return;
      const g = this.game;
      if (e.code === 'KeyT' && g.input.locked && !g.uiOpen && !g.pc?.active && !g.talk?.active && !g.cutscene?.active && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        // (T on a cardboard box you're looking at labels it)
        if (g.interaction.hover?.obj?.userData?.piece?.def?.feature === 'storage') return;
        e.preventDefault();
        this.openChat();
      }
      if (e.code === 'Tab') this.roster.classList.add('full');
    }, true);
    addEventListener('keyup', (e) => { if (e.code === 'Tab') this.roster.classList.remove('full'); });
  }

  show(on) {
    for (const e of [this.roster, this.logEl]) e.classList.toggle('hidden', !on);
    if (on) this.refresh();
  }

  openChat() {
    this.typing = true;
    this.chatBar.classList.remove('hidden');
    this.chatIn.value = '';
    this.game.player.frozen = true;
    this.logEl.classList.add('open');
    setTimeout(() => this.chatIn.focus(), 0);
  }
  closeChat() {
    if (!this.typing) return;
    this.typing = false;
    this.chatBar.classList.add('hidden');
    this.chatIn.blur();
    if (!this.mp.sleep?.asleep) this.game.player.frozen = false;
    this.logEl.classList.remove('open');
  }

  /** A line in the chat log. kind: 'me' | 'them' | 'sys'. */
  log(text, kind = 'sys', name = '', color = '') { this.log2(text, kind, name, color); }
  log2(text, kind, name, color) {
    const line = el('div', `mp-l ${kind}`, name ? `<b style="color:${color}">${esc(name)}</b> ${esc(text)}` : esc(text));
    this.logEl.appendChild(line);
    while (this.logEl.children.length > 8) this.logEl.firstChild.remove();
    line._t = performance.now();
    setTimeout(() => line.classList.add('old'), 14000);
    if (kind === 'them') sfx('netChat', 0.5);
  }

  toast(text, kind = '') { this.game.news(text, '', kind === 'warn' ? 5200 : 4200); this.log2(text, 'sys', '', ''); }

  /** A police fine: a stamped ticket that drops in for a few seconds (and a line in the log). */
  ticket(amount, why, sub = '') {
    this.ticketEl?.remove();
    const t = el('div', 'mp-ticket', `<div class="tk-h"><b>MORIO POLICE</b><span>FINE</span></div><div class="tk-amt">${yen(amount)}</div><div class="tk-why">For ${esc(why)}${sub ? `<br>${esc(sub)}` : ''}</div><span class="tk-stamp"></span>`);
    document.body.appendChild(t);
    this.ticketEl = t;
    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 500); }, 6500);
    this.log2(`Police fine: ${yen(amount)} for ${why}`, 'sys', '', '');
  }

  /** A pixel "!" over someone for a while (the one who just picked your pocket). */
  mark(id, sec = 30) {
    const R = this.mp.avatar(id);
    if (!R) return;
    R.marked = performance.now() + sec * 1000;
  }

  refresh() {
    const mp = this.mp, s = mp.s;
    if (!s || !mp.active) return;
    const sheet = mp.social?.sheet || {};
    const rows = [...s.players.values()].map((p) => {
      const r = sheet[p.id] || {};
      const st = mp.stateOf(p.id);
      const asleep = p.id === s.myId ? mp.sleep?.asleep : (st?.[5] | 0) & 1;
      const bits = [];
      if (r.slaps) bits.push(`${r.slaps} slap${r.slaps > 1 ? 's' : ''}`);
      if (r.thefts) bits.push(`${r.thefts} theft${r.thefts > 1 ? 's' : ''} (${yen(r.stolen || 0)})`);
      if (r.fines) bits.push(`fined ${yen(r.fines)}`);
      if (r.calls) bits.push(`${r.calls} call${r.calls > 1 ? 's' : ''} to 110`);
      return `<div class="mp-r${p.id === s.myId ? ' me' : ''}"><i style="background:${mp.colorOf(p.id)}"></i><span class="n">${esc(p.name)}${p.id === 'H' ? ' <em>owner</em>' : ''}${asleep ? ' <em>zzz</em>' : ''}</span><span class="pg">${p.id === s.myId ? 'you' : p.ping ? p.ping + 'ms' : ''}</span><div class="rap${r.open ? ' bad' : ''}">${bits.length ? esc(bits.join(' · ')) : 'clean record'}</div>${r.fines ? '<span class="stamp"></span>' : ''}</div>`;
    });
    this.roster.innerHTML = `<div class="mp-h">${iconHTML('share', 2)}<span>Room ${esc(s.code)}</span><small>hold Tab</small></div>${rows.join('')}<div class="mp-keys">T chat · B pose · E behind a friend: pick their pocket · LMB slap${mp.isHost ? ' · N call it a day' : ''}</div>`;
    this.refreshList();
  }

  /** The session is over (the host left...): a card, then back to the menu. */
  ended(text, sub = '') {
    const card = el('div', 'mp-end', `<div class="panel"><div class="panel-title">${iconHTML('home', 2)}<span>Session over</span></div><div class="mp-endt">${esc(text)}</div><div class="foot">${esc(sub)}</div><button class="big" id="mp-endok">${iconHTML('play', 2)}Back to the menu</button></div>`);
    document.body.appendChild(card);
    this.game.input.unlock?.();
    this.game.uiOpen = true;
    card.querySelector('#mp-endok').addEventListener('click', () => location.reload());
    setTimeout(() => location.reload(), 9000);
  }
}
