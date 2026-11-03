// Transports for multiplayer: how the host's game and its guests reach each other.
//   PeerJS (the real one): WebRTC data channels, peer to peer. The free public PeerJS broker only does the
//   signalling (the handshake); everything after that goes browser to browser. The host's peer id is
//   ROOM_PREFIX + the room code, so a guest only needs the five-letter code.
//   Loop (tests and offline play on one machine): every tab of the same browser on the same origin talks through a
//   BroadcastChannel. Pick it with ?net=loop (or localStorage 'gg-net-transport' = 'loop').
//
//   const tr = await openTransport();                 // 'peer' | 'loop' (from the URL / storage)
//   const room = await tr.host(code);                 // room.onConn = (conn) => ...;  room.close()
//   const conn = await tr.join(code);                 // conn.send(string), conn.onData, conn.onClose, conn.close()
// Errors are NetError { code: 'unreachable' | 'no-room' | 'taken' | 'timeout' | 'unsupported', message }.
// Big strings are cut into chunks (data channels drop huge messages) and glued back on the other side.

export const ROOM_PREFIX = 'gachagarage-room-';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CHUNK = 15000;

export class NetError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

/** A fresh five-character room code (no 0/O, 1/I lookalikes). */
export function makeCode() {
  let s = '';
  const r = crypto.getRandomValues(new Uint8Array(5));
  for (const b of r) s += CODE_CHARS[b % CODE_CHARS.length];
  return s;
}
/** Tidy what someone typed into a room code (or null when it can't be one). */
export function normCode(s) {
  const c = String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return c.length === 5 && [...c].every((ch) => CODE_CHARS.includes(ch)) ? c : null;
}

/** Which transport this page uses. */
export function transportKind() {
  try {
    const q = new URLSearchParams(location.search).get('net');
    if (q === 'loop' || q === 'peer') return q;
    const s = localStorage.getItem('gg-net-transport');
    if (s === 'loop' || s === 'peer') return s;
  } catch { /* storage blocked */ }
  return 'peer';
}

export async function openTransport(kind = transportKind()) {
  return kind === 'loop' ? new LoopTransport() : new PeerTransport();
}

// ------------------------------------------------------------------ chunking (shared)
let chunkSeq = 1;
function sendChunked(raw, str) {
  if (str.length <= CHUNK) { raw(str); return; }
  const id = (chunkSeq++).toString(36) + Math.random().toString(36).slice(2, 6), n = Math.ceil(str.length / CHUNK);
  for (let i = 0; i < n; i++) raw('\u0001' + JSON.stringify([id, i, n, str.slice(i * CHUNK, (i + 1) * CHUNK)]));
}
function unchunker(deliver) {
  const parts = new Map();
  return (s) => {
    if (typeof s !== 'string') return;
    if (s.charCodeAt(0) !== 1) { deliver(s); return; }
    let a; try { a = JSON.parse(s.slice(1)); } catch { return; }
    const [id, i, n, piece] = a;
    let p = parts.get(id);
    if (!p) { p = { n, got: 0, list: new Array(n) }; parts.set(id, p); }
    if (p.list[i] === undefined) { p.list[i] = piece; p.got++; }
    if (p.got === p.n) { parts.delete(id); deliver(p.list.join('')); }
  };
}

/** One link to another player. */
class Conn {
  constructor(id, raw, closeRaw) {
    this.id = id;
    this.open = true;
    this._onData = null;
    this._early = [];
    this.onClose = null;
    this._raw = raw;
    this._closeRaw = closeRaw;
    // messages that arrive before anyone listens wait for the listener
    this.feed = unchunker((s) => { if (!this._onData) { this._early.push(s); return; } try { this._onData(s); } catch (e) { console.error('[net] message handler', e); } });
  }
  get onData() { return this._onData; }
  set onData(fn) {
    this._onData = fn;
    while (fn && this._early.length && this._onData === fn) { const s = this._early.shift(); try { fn(s); } catch (e) { console.error('[net] message handler', e); } }
  }
  send(str) { if (!this.open) return; try { sendChunked(this._raw, str); } catch (e) { console.warn('[net] send failed', e); } }
  close() { if (!this.open) return; this.open = false; try { this._closeRaw?.(); } catch { /* already gone */ } }
  /** The other side went away. */
  closed() { if (!this.open && this._gone) return; this.open = false; this._gone = true; try { this.onClose?.(); } catch (e) { console.error(e); } }
}

// ------------------------------------------------------------------ PeerJS (WebRTC)
class PeerTransport {
  constructor() { this.kind = 'peer'; }

  async lib() {
    if (typeof RTCPeerConnection === 'undefined') throw new NetError('unsupported', 'This browser cannot do peer-to-peer connections.');
    try { return (await import('peerjs')).Peer; } catch (e) { throw new NetError('unsupported', 'The networking library failed to load.'); }
  }

  /** Make a peer and wait for the broker to say hello. */
  async peer(id, timeout = 10000) {
    const Peer = await this.lib();
    return new Promise((resolve, reject) => {
      let done = false;
      let p;
      try { p = id ? new Peer(id, { debug: 0 }) : new Peer({ debug: 0 }); } catch (e) { reject(new NetError('unreachable', String(e?.message || e))); return; }
      const fail = (err) => { if (done) return; done = true; try { p.destroy(); } catch { /* */ } reject(err); };
      const t = setTimeout(() => fail(new NetError('unreachable', "Couldn't reach the matchmaking server.")), timeout);
      p.on('open', () => { if (done) return; done = true; clearTimeout(t); resolve(p); });
      p.on('error', (e) => {
        clearTimeout(t);
        const type = e?.type || '';
        if (type === 'unavailable-id') fail(new NetError('taken', 'That room code is already in use.'));
        else if (type === 'browser-incompatible') fail(new NetError('unsupported', 'This browser cannot do peer-to-peer connections.'));
        else fail(new NetError('unreachable', "Couldn't reach the matchmaking server."));
      });
    });
  }

  async host(code) {
    const p = await this.peer(ROOM_PREFIX + code);
    const room = { code, onConn: null, onDrop: null, close: () => { try { p.destroy(); } catch { /* */ } } };
    p.on('connection', (dc) => {
      const c = new Conn(dc.peer, (s) => dc.send(s), () => dc.close());
      dc.on('data', (d) => c.feed(d));
      dc.on('close', () => c.closed());
      dc.on('error', () => c.closed());
      const ready = () => room.onConn?.(c);
      if (dc.open) ready(); else dc.on('open', ready);
    });
    // the broker link dropping doesn't end open games; new friends just can't find the room until it's back
    p.on('disconnected', () => { room.onDrop?.(); setTimeout(() => { try { if (!p.destroyed) p.reconnect(); } catch { /* */ } }, 3000); });
    p.on('error', (e) => { if (e?.type !== 'peer-unavailable') console.warn('[net] host peer error', e?.type || e); });
    return room;
  }

  async join(code, timeout = 15000) {
    const p = await this.peer(null);
    return new Promise((resolve, reject) => {
      let done = false;
      const fail = (err) => { if (done) return; done = true; try { p.destroy(); } catch { /* */ } reject(err); };
      const t = setTimeout(() => fail(new NetError('timeout', "The room didn't answer. Check the code, or the host's connection.")), timeout);
      p.on('error', (e) => {
        if (e?.type === 'peer-unavailable') fail(new NetError('no-room', 'No shop is open with that code.'));
        else if (!done) fail(new NetError('unreachable', "Couldn't reach the matchmaking server."));
      });
      const dc = p.connect(ROOM_PREFIX + code, { reliable: true, serialization: 'raw' });
      const c = new Conn('host', (s) => dc.send(s), () => { dc.close(); setTimeout(() => { try { p.destroy(); } catch { /* */ } }, 300); });
      dc.on('data', (d) => c.feed(d));
      dc.on('close', () => c.closed());
      dc.on('error', () => c.closed());
      dc.on('open', () => { if (done) return; done = true; clearTimeout(t); resolve(c); });
    });
  }
}

// ------------------------------------------------------------------ loopback (BroadcastChannel)
const LOOP_CH = 'gacha-garage-net-loop';
class LoopTransport {
  constructor() {
    this.kind = 'loop';
    if (typeof BroadcastChannel === 'undefined') throw new NetError('unsupported', 'No BroadcastChannel here.');
    this.me = 'p' + Math.random().toString(36).slice(2, 10);
    this.bc = new BroadcastChannel(LOOP_CH);
    this.conns = new Map(); // peer id -> Conn
    this.rooms = new Map(); // code -> room (we host it)
    this.waiting = new Map(); // code -> resolve (we're knocking)
    this.bc.onmessage = (e) => this.recv(e.data);
    addEventListener('pagehide', () => { for (const id of this.conns.keys()) this.post({ k: 'bye', to: id }); });
  }
  post(m) { this.bc.postMessage({ ...m, from: this.me }); }
  link(id) {
    const c = new Conn(id, (s) => this.post({ k: 'd', to: id, s }), () => { this.post({ k: 'bye', to: id }); this.conns.delete(id); });
    this.conns.set(id, c);
    return c;
  }
  recv(m) {
    if (!m || m.from === this.me) return;
    if (m.k === 'knock') {
      const room = this.rooms.get(m.code);
      if (!room) return;
      const c = this.link(m.from);
      this.post({ k: 'open', to: m.from, code: m.code });
      setTimeout(() => room.onConn?.(c), 0);
      return;
    }
    if (m.to !== this.me) return;
    if (m.k === 'open') { const w = this.waiting.get(m.code); if (w) { this.waiting.delete(m.code); w(m.from); } return; }
    const c = this.conns.get(m.from);
    if (!c) return;
    if (m.k === 'd') c.feed(m.s);
    else if (m.k === 'bye') { this.conns.delete(m.from); c.closed(); }
  }
  async host(code) {
    const room = { code, onConn: null, close: () => { this.rooms.delete(code); for (const [id, c] of this.conns) { this.post({ k: 'bye', to: id }); c.open = false; } this.conns.clear(); } };
    this.rooms.set(code, room);
    return room;
  }
  async join(code, timeout = 3000) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => { this.waiting.delete(code); reject(new NetError('no-room', 'No shop is open with that code.')); }, timeout);
      this.waiting.set(code, (hostId) => { clearTimeout(t); resolve(this.link(hostId)); });
      this.post({ k: 'knock', code });
    });
  }
}
