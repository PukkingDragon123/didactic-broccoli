// A multiplayer session: who is in it, and messages between them. The host's game is the world (host-authoritative):
// guests only talk to the host, and the host relays what the others need to see. Up to MAX_PLAYERS (host included).
//
//   const s = await Session.host({ code, me });                 // me: { pid, name, avatar }
//   const s = await Session.join(code, { me, rejoin, probe });  // resolves with the host's welcome in s.welcome
//   s.role ('host' | 'guest'), s.myId ('H' for the host, 'g1'... for guests), s.players (Map id -> { id, name, avatar })
//   s.on(type, (msg, fromId) => ...)     s.send(id, msg)  s.broadcast(msg, exceptId)  s.toHost(msg)  s.close(why)
//   s.onWelcome = async (hello, id) => welcome payload (host: what a new guest gets: the snapshot and so on)
//   s.onPlayer = (kind 'join' | 'leave', player, why)     s.onEnd = (why)   (guests: the host went away)
// Messages are small JSON objects { t: type, ... }. Messages that arrive before the game is ready queue up until
// s.attach() is called.
import { openTransport, NetError, makeCode } from './transport.js';

export const MAX_PLAYERS = 4;
export const PROTO = 1;
// how long a silent player counts as still there (a dropped WebRTC link closes on its own much sooner; this catches the
// silent ones). A guest still building the world (a slow machine can hang for a while) gets longer. ?netwait=s: tests.
const WAIT = +(new URLSearchParams(location.search).get('netwait') || 0) * 1000;
const PING_EVERY = 2000, DROP_AFTER = WAIT || 45000, DROP_LOADING = Math.max(WAIT, 240000);

export class Session {
  constructor(role, transport) {
    this.role = role;
    this.tr = transport;
    this.kind = transport.kind;
    this.handlers = new Map();
    this.players = new Map();
    this.conns = new Map(); // host: guest id -> Conn
    this.conn = null; // guest: the link to the host
    this.queue = [];
    this.attached = false;
    this.closed = false;
    this.seq = 0;
    this.stats = { sent: 0, recv: 0, bytesOut: 0, bytesIn: 0 };
    this.onPlayer = null;
    this.onEnd = null;
    this.onWelcome = null;
  }

  get isHost() { return this.role === 'host'; }
  get isGuest() { return this.role === 'guest'; }
  get count() { return this.players.size; }
  others() { return [...this.players.values()].filter((p) => p.id !== this.myId); }

  // ------------------------------------------------------------------ hosting
  static async host({ code = makeCode(), me, tries = 4 } = {}) {
    const tr = await openTransport();
    let room = null, err = null;
    for (let i = 0; i < tries && !room; i++) {
      try { room = await tr.host(code); } catch (e) { err = e; if (e.code === 'taken') code = makeCode(); else break; }
    }
    if (!room) throw err || new NetError('unreachable', "Couldn't open the room.");
    const s = new Session('host', tr);
    s.code = code;
    s.room = room;
    s.myId = 'H';
    s.me = me;
    s.nextGuest = 1;
    s.players.set('H', { id: 'H', pid: me.pid, name: me.name, avatar: me.avatar, host: true });
    room.onConn = (c) => s.accept(c);
    s.pinger = setInterval(() => s.heartbeat(), PING_EVERY);
    return s;
  }

  accept(c) {
    // the first thing a guest says is hello; anything else first (or nothing for a while) closes the line
    const t = setTimeout(() => { if (!c.id2) c.close(); }, 15000);
    c.onData = async (str) => {
      let m; try { m = JSON.parse(str); } catch { return; }
      if (c.id2) { this.fromGuest(c.id2, m, str.length); return; }
      if (m.t !== 'hello') { c.close(); return; }
      clearTimeout(t);
      if (m.v !== PROTO) { c.send(JSON.stringify({ t: 'deny', why: 'version', msg: 'Your game is a different version from the host\'s. Reload both.' })); setTimeout(() => c.close(), 400); return; }
      // the same player coming back (a reload, a dropped line): replace the old link
      for (const [id, p] of this.players) if (p.pid && p.pid === m.pid && id !== 'H') this.dropGuest(id, 'rejoined');
      if (this.players.size >= MAX_PLAYERS) { c.send(JSON.stringify({ t: 'deny', why: 'full', msg: `The shop is full (${MAX_PLAYERS} players).` })); setTimeout(() => c.close(), 400); return; }
      if (m.probe) {
        c.send(JSON.stringify({ t: 'probe', host: this.me.name, n: this.players.size, max: MAX_PLAYERS }));
        setTimeout(() => c.close(), 1500);
        return;
      }
      const id = 'g' + this.nextGuest++;
      const p = { id, pid: m.pid, name: cleanName(m.name) || 'Friend', avatar: m.avatar || null, ping: 0, seen: Date.now() };
      let welcome = {};
      try { welcome = (await this.onWelcome?.(m, id, p)) || {}; } catch (e) { console.error('[net] welcome', e); c.send(JSON.stringify({ t: 'deny', why: 'error', msg: 'The host could not send the shop.' })); setTimeout(() => c.close(), 400); return; }
      if (this.closed || !c.open) return;
      c.id2 = id;
      this.conns.set(id, c);
      this.players.set(id, p);
      c.onClose = () => this.dropGuest(id, 'left');
      c.send(JSON.stringify({ t: 'welcome', id, code: this.code, players: [...this.players.values()].map(pub), ...welcome }));
      this.broadcast({ t: 'join', p: pub(p) }, id);
      this.onPlayer?.('join', p);
    };
  }

  dropGuest(id, why = 'left') {
    const c = this.conns.get(id), p = this.players.get(id);
    if (p) console.info(`[net] ${p.name} (${id}) left: ${why}`);
    this.conns.delete(id);
    if (c) { c.onClose = null; c.close(); }
    if (!p) return;
    this.players.delete(id);
    this.broadcast({ t: 'leave', id, why });
    this.onPlayer?.('leave', p, why);
  }

  fromGuest(id, m, size) {
    const p = this.players.get(id);
    if (!p) return;
    p.seen = Date.now();
    this.stats.recv++; this.stats.bytesIn += size;
    if (m.t === 'pong') { p.ping = Date.now() - (m.at || Date.now()); return; }
    if (m.t === 'ps') p.loaded = true;
    if (m.t === 'bye') { this.dropGuest(id, 'left'); return; }
    // a guest's message for one other guest: passed on, marked with who sent it
    if (m.relay) { const to = m.relay; delete m.relay; m.from = id; this.send(to, m); return; }
    this.dispatch(m, id);
  }

  heartbeat() {
    const now = Date.now();
    if (this.isHost) {
      for (const [id, p] of this.players) {
        if (id === 'H') continue;
        if (now - p.seen > (p.loaded ? DROP_AFTER : DROP_LOADING)) { this.dropGuest(id, 'timeout'); continue; }
        this.send(id, { t: 'ping', at: now, pings: [...this.players.values()].map((q) => [q.id, q.ping || 0]) });
      }
    } else if (this.conn && this.attached && now - this.lastHost > DROP_AFTER) this.end('lost');
  }

  // ------------------------------------------------------------------ joining
  /** Connect to a room. probe: just check it's there (and has room); the hello carries who we are. */
  static async join(code, { me, rejoin = false, probe = false } = {}) {
    const tr = await openTransport();
    const conn = await tr.join(code);
    const s = new Session('guest', tr);
    s.code = code;
    s.conn = conn;
    s.me = me;
    s.lastHost = Date.now();
    const answer = await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new NetError('timeout', "The host didn't answer.")), probe ? 8000 : 45000);
      conn.onData = (str) => {
        let m; try { m = JSON.parse(str); } catch { return; }
        if (m.t === 'welcome' || m.t === 'probe' || m.t === 'deny') { clearTimeout(t); resolve(m); return; }
        s.queue.push(m); // early world deltas: kept for after the game exists
      };
      conn.onClose = () => { clearTimeout(t); reject(new NetError('no-room', 'The host closed the line.')); };
      conn.send(JSON.stringify({ t: 'hello', v: PROTO, pid: me.pid, name: me.name, avatar: me.avatar, rejoin, probe }));
    });
    if (answer.t === 'deny') { conn.close(); throw new NetError(answer.why || 'deny', answer.msg || "The host didn't let you in."); }
    if (probe) { conn.close(); return answer; }
    s.myId = answer.id;
    s.welcome = answer;
    for (const p of answer.players || []) s.players.set(p.id, { ...p });
    conn.onData = (str) => {
      let m; try { m = JSON.parse(str); } catch { return; }
      s.lastHost = Date.now();
      s.stats.recv++; s.stats.bytesIn += str.length;
      if (m.t === 'ping') { conn.send(JSON.stringify({ t: 'pong', at: m.at })); for (const [id, ms] of m.pings || []) { const p = s.players.get(id); if (p) p.ping = ms; } return; }
      if (m.t === 'join') { s.players.set(m.p.id, { ...m.p }); s.onPlayer?.('join', m.p); return; }
      if (m.t === 'leave') { const p = s.players.get(m.id); s.players.delete(m.id); if (p) s.onPlayer?.('leave', p, m.why); return; }
      if (m.t === 'end') { s.end(m.why || 'host-left'); return; }
      s.dispatch(m, 'H');
    };
    conn.onClose = () => s.end('host-left');
    s.pinger = setInterval(() => s.heartbeat(), PING_EVERY);
    return s;
  }

  // ------------------------------------------------------------------ messages
  on(type, fn) { if (!this.handlers.has(type)) this.handlers.set(type, []); this.handlers.get(type).push(fn); return () => { const a = this.handlers.get(type); const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); }; }

  dispatch(m, from) {
    if (!this.attached) { this.queue.push([m, from]); return; }
    const hs = this.handlers.get(m.t);
    if (!hs) return;
    for (const h of hs) { try { h(m, from); } catch (e) { console.error('[net] handler', m.t, e); } }
  }

  /** The game is ready for messages: play back what queued up meanwhile. */
  attach() {
    this.attached = true;
    this.lastHost = Date.now();
    const q = this.queue; this.queue = [];
    for (const it of q) { if (Array.isArray(it)) this.dispatch(it[0], it[1]); else this.dispatch(it, 'H'); }
  }

  /** To one player (the host may "send" to itself: it's handled at once). */
  send(id, m) {
    if (this.closed) return;
    if (id === this.myId) { this.dispatch(m, this.myId); return; }
    const c = this.isHost ? this.conns.get(id) : (id === 'H' ? this.conn : null);
    if (!c) { if (this.isGuest) this.toHost({ ...m, relay: id }); return; }
    const s = JSON.stringify(m);
    this.stats.sent++; this.stats.bytesOut += s.length;
    c.send(s);
  }
  /** Host: to every guest (except one). Guest: to the host, who passes it on. */
  broadcast(m, except = null) {
    if (this.closed) return;
    if (this.isGuest) { this.toHost(m); return; }
    const s = JSON.stringify(m);
    for (const [id, c] of this.conns) { if (id === except) continue; this.stats.sent++; this.stats.bytesOut += s.length; c.send(s); }
  }
  toHost(m) {
    if (this.closed) return;
    if (this.isHost) { this.dispatch(m, 'H'); return; }
    const s = JSON.stringify(m);
    this.stats.sent++; this.stats.bytesOut += s.length;
    this.conn?.send(s);
  }

  /** Leave (a guest) or close the room (the host: everyone is sent home). */
  close(why = 'closed') {
    if (this.closed) return;
    if (this.isHost) { for (const c of this.conns.values()) c.send(JSON.stringify({ t: 'end', why })); }
    else this.conn?.send(JSON.stringify({ t: 'bye' }));
    setTimeout(() => {
      for (const c of this.conns.values()) { c.onClose = null; c.close(); }
      if (this.conn) { this.conn.onClose = null; this.conn.close(); }
      this.room?.close();
    }, 250);
    this.closed = true;
    clearInterval(this.pinger);
  }

  end(why) {
    if (this.closed) return;
    console.info(`[net] session over: ${why}`);
    this.closed = true;
    clearInterval(this.pinger);
    try { this.conn?.close(); } catch { /* */ }
    this.onEnd?.(why);
  }
}

const pub = (p) => ({ id: p.id, name: p.name, avatar: p.avatar, host: !!p.host });
export function cleanName(s) { return String(s || '').replace(/[^\p{L}\p{N} ._\-!?'&]/gu, '').trim().slice(0, 16); }
