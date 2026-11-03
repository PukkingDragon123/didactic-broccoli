// game.mp: multiplayer. The host's game is the world (host-authoritative); friends join it over WebRTC (PeerJS) with
// a five-letter room code, load the host's world, and play in it as their own avatars. Up to 4 players.
//   mp.host()                 open a room (the menu's HOST SHOP); mp.s.code is the room code
//   mp.probe(code)            is that room there? (the menu's JOIN FRIEND)   mp.joinAndReload(code)  go in
//   mp.leave()                leave the room (a guest goes back to their own shop) / close it (the host)
//   mp.active  mp.isHost  mp.isGuest  mp.s (the Session)  mp.avatar(id)  mp.stateOf(id)  mp.colorOf(id)
// Parts: Session.js (who's in, messages), transport.js (PeerJS / loopback), world.js (machines, items, furniture,
// shared money, clock, orders), players.js (the avatars), social.js (chat, emotes, slaps, pockets, rap sheet),
// police.js (110 on a friend), sleep.js (cardboard beds, the night), ui.js (menus, badge, chat).
// Per tick (10 Hz, a timer: it keeps going in a background tab): your state out ('ps' -> host -> 'P' to all) and the
// world diffs. Per frame (Game.updaters): the avatars, the officer, the beds and keys.
import * as THREE from 'three';
import { Game } from '../game/Game.js';
import { ensureState } from '../game/stateExt.js';
import { packJSON } from '../game/shareCode.js';
import { audio } from '../core/audio.js';
import { Session } from './Session.js';
import { me as myIdentity, writeSession, clearSession, takePending, ownAvatar } from './boot.js';
import { RemotePlayer, localState, colorOf } from './players.js';
import { WorldSync } from './world.js';
import { Social } from './social.js';
import { Police } from './police.js';
import { Sleep } from './sleep.js';
import { NetUI } from './ui.js';
import './sfx.js';

const _v = new THREE.Vector3();

export class Multiplayer {
  constructor(game) {
    this.game = game;
    this.s = null;
    this.avatars = new Map();
    this.states = new Map();
    this.ledger = game.visiting ? { players: {} } : ensureState(game, 'net', { v: 1, players: {} });
    this.me = myIdentity(game.visiting ? ownAvatar(game.state.avatar) : game.state.avatar);
    this.world = new WorldSync(this);
    this.social = new Social(this);
    this.police = new Police(this);
    this.sleep = new Sleep(this);
    this.ui = new NetUI(this);
    this.n = 0;
    Game.updaters.push((g, dt) => this.update(dt));
    game.events.on('avatar', () => { this.me.avatar = game.state.avatar; if (this.active) this.s.toHost({ t: 'look', a: game.state.avatar }); });
  }

  get active() { return !!this.s && !this.s.closed; }
  get isHost() { return this.active && this.s.isHost; }
  get isGuest() { return this.active && this.s.isGuest; }
  get myColor() { return colorOf(this.s?.myId || 'H'); }
  colorOf(id) { return colorOf(id); }
  avatar(id) { return this.avatars.get(id) || null; }
  stateOf(id) { return id === this.s?.myId ? localState(this.game) : this.states.get(id) || null; }

  // ------------------------------------------------------------------ starting
  async host() {
    if (this.active) return this.s;
    this.me.avatar = this.game.state.avatar;
    const s = await Session.host({ me: this.me });
    this.start(s);
    return s;
  }
  probe(code) { return Session.join(code, { me: this.me, probe: true }); }
  joinAndReload(code) { writeSession({ role: 'guest', code, at: Date.now() }); location.reload(); }
  renameMe(name) { const p = this.s?.players.get(this.s.myId); if (p) p.name = name; this.ui.refresh(); }

  start(s) {
    const g = this.game;
    this.s = s;
    s.onPlayer = (kind, p, why) => this.onPlayer(kind, p, why);
    s.onEnd = (why) => this.onEnd(why);
    if (s.isHost) {
      s.onWelcome = async (hello, id, p) => {
        const L = (this.ledger.players[hello.pid] ||= { name: p.name, cash: 2000, bank: 0, inv: null, pin: null });
        L.name = p.name;
        p.cash = L.cash;
        const snap = await packJSON(this.world.snapshot(hello, id));
        this.world.resync();
        return { snap, hostName: this.me.name };
      };
      s.on('ps', (m, from) => this.onState(from, m.s));
    } else {
      s.on('P', (m) => { for (const row of m.l || []) if (row[0] !== s.myId) this.onState(row[0], row.slice(1)); });
    }
    s.on('look', (m, from) => this.onLook(m, from));
    this.world.install();
    this.social.install();
    this.police.install();
    this.sleep.install();
    for (const p of s.players.values()) if (p.id !== s.myId) this.addAvatar(p);
    s.attach();
    this.ui.show(true);
    clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), 100);
    addEventListener('pagehide', () => { if (this.active) this.s.close(this.isHost ? 'host-left' : 'left'); });
    if (s.isGuest) setTimeout(() => this.ui.log(`Joined ${s.welcome?.hostName || 'your friend'}'s shop (room ${s.code}). T to chat.`, 'sys'), 500);
    g.events.emit('mp', { type: 'start', role: s.role, code: s.code });
  }

  // ------------------------------------------------------------------ players
  addAvatar(p) {
    if (this.avatars.has(p.id) || p.id === this.s.myId) return;
    const R = new RemotePlayer(this, p);
    R.root.position.y = -50; // out of sight until the first state arrives
    this.avatars.set(p.id, R);
    const social = this.social;
    this.game.interaction.add(R.hit, {
      reach: 1.8,
      hint: (held) => {
        if (R.asleep) return { key: held ? '' : 'E', text: `${R.name} is asleep`, sub: held ? '' : social.canSteal(R) ? 'E: pick their pocket while they snore' : 'Shh...' };
        if (held) return { key: '', text: R.name };
        if (social.canSteal(R)) return { key: 'E', text: `Pick ${R.name}'s pocket`, sub: 'Sneaky... · LMB slap' };
        return { key: '', text: R.name, sub: 'LMB slap · sneak up behind them to pick their pocket' };
      },
      use: (held) => { if (!held) this.game.fp?.slap?.(); return false; },
    });
  }
  removeAvatar(id) {
    const R = this.avatars.get(id);
    if (!R) return;
    this.game.interaction.remove(R.hit);
    R.dispose();
    this.avatars.delete(id);
    this.states.delete(id);
  }

  onState(id, s) {
    if (!Array.isArray(s)) return;
    this.states.set(id, s);
    this.avatar(id)?.push(s);
  }

  onLook(m, from) {
    const id = this.isHost ? from : m.id || from;
    if (this.isHost) { const p = this.s.players.get(from); if (p) p.avatar = m.a; this.s.broadcast({ t: 'look', id: from, a: m.a }, from); }
    if (id === this.s.myId) return;
    this.avatar(id)?.build(m.a);
  }

  onPlayer(kind, p, why) {
    if (kind === 'join') {
      this.addAvatar(p);
      this.ui.toast(`${p.name} ${p.id === 'H' ? 'is here' : 'came in!'}`);
      try { audio.play('netJoin', { vol: 0.7 }); audio.play('doorbell', { vol: 0.5 }); } catch { /* */ }
    } else {
      this.removeAvatar(p.id);
      this.ui.toast(`${p.name} ${why === 'timeout' ? 'lost the connection' : 'went home'}`);
      try { audio.play('netLeave', { vol: 0.6 }); } catch { /* */ }
    }
    this.sleep.refresh();
    this.ui.refresh();
  }

  onEnd(why) {
    clearSession();
    clearInterval(this.timer);
    for (const id of [...this.avatars.keys()]) this.removeAvatar(id);
    this.ui.show(false);
    this.police.dispose();
    this.sleep.dispose();
    const host = this.s?.welcome?.hostName || 'The host';
    const text = why === 'host-left' || why === 'host-closed' ? `${host} closed the shop for the night.` : why === 'lost' ? `Lost the connection to ${host}'s shop.` : 'The session ended.';
    this.ui.ended(text, 'Back to your own shop...');
  }

  /** Leave (a guest: back to your own shop) or close the room (the host: everyone is sent home). */
  leave() {
    if (!this.active) return;
    if (this.isGuest) { this.s.close('left'); clearSession(); setTimeout(() => location.reload(), 300); return; }
    this.s.close('host-closed');
    clearInterval(this.timer);
    for (const id of [...this.avatars.keys()]) this.removeAvatar(id);
    this.police.dispose();
    this.sleep.dispose();
    this.ui.show(false);
    this.game.news('The shop is closed to friends', '', 3500);
  }

  // ------------------------------------------------------------------ the network tick (10 Hz)
  tick() {
    if (!this.active) return;
    const n = this.n++;
    const s = this.s;
    const mine = localState(this.game);
    if (s.isHost) {
      // everyone's latest state in one message
      const l = [['H', ...mine]];
      for (const [id, st] of this.states) if (s.players.has(id)) l.push([id, ...st]);
      if (s.count > 1) s.broadcast({ t: 'P', l });
    } else s.toHost({ t: 'ps', s: mine });
    try { this.world.tick(n); } catch (e) { console.error('[net] world tick', e); }
    if (n % 10 === 0) this.ui.refresh();
  }

  // ------------------------------------------------------------------ per frame
  update(dt) {
    if (!this.active) return;
    const g = this.game, P = g.player;
    for (const R of this.avatars.values()) {
      R.update(dt);
      // friends are solid: a gentle push apart
      if (!R.asleep && R.root.visible && !this.sleep.asleep) {
        const dx = P.pos.x - R.root.position.x, dz = P.pos.z - R.root.position.z, d = Math.hypot(dx, dz);
        if (d < 0.5 && d > 1e-3 && Math.abs(P.pos.y - R.root.position.y) < 1) { const k = (0.5 - d) * Math.min(1, dt * 12); P.pos.x += (dx / d) * k; P.pos.z += (dz / d) * k; }
      }
      // the pickpocket you're after: a pixel "!" over their head
      if (R.marked && performance.now() < R.marked) {
        R.markT = (R.markT || 0) - dt;
        if (R.markT <= 0) { R.markT = 0.9; g.effects?.mark?.({ sprite: 'bang', color: 0xff5a4a, pos: R.h.headTop(_v).clone().add(new THREE.Vector3(0, 0.22, 0)), size: 0.1, life: 0.9, rise: 0.05, anim: 'loop', fps: 6 }); }
      }
    }
    this.police.update(dt);
    this.sleep.update(dt);
    this.social.update(dt);
  }
}

/** The net plugin calls this: a guest's session opened at boot carries on here. */
export function installMultiplayer(game) {
  const mp = new Multiplayer(game);
  game.mp = mp;
  const p = takePending();
  if (p?.session) mp.start(p.session);
  else if (p?.error) mp.bootError = p.error;
  return mp;
}
