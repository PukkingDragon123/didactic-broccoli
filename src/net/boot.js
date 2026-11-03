// Multiplayer before the game exists. A guest's tab reloads once it has found the room: on the way back up, main.js
// calls prepareNet() before building the Game, which connects to the host, downloads the host's world and puts it
// where loadState() picks up a visit (sessionStorage VISIT_KEY: the guest plays in the host's world, nothing of it is
// saved on their side). The open session is then handed to the net plugin (takePending()).
// Also: who you are online (a persistent player id, your name, your saved look).
import { Session } from './Session.js';
import { unpackJSON } from '../game/shareCode.js';
import { VISIT_KEY } from '../game/state.js';

const SESSION_KEY = 'gacha-garage-net';
const NAMES = ['Mika', 'Kenta', 'Yui', 'Taro', 'Hana', 'Sora', 'Riku', 'Nao', 'Kai', 'Emi', 'Jun', 'Aoi', 'Ren', 'Momo'];

let pending = null;

const ls = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { /* blocked */ } } };
const ss = { get(k) { try { return sessionStorage.getItem(k); } catch { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch { /* blocked */ } }, del(k) { try { sessionStorage.removeItem(k); } catch { /* */ } } };

/** This browser's player id (the host keeps a guest's wallet and pockets under it, so coming back finds them). */
export function playerId() {
  const q = new URLSearchParams(location.search).get('pid');
  if (q) return q.slice(0, 24);
  let id = ls.get('gg-net-pid');
  if (!id) { id = 'u' + Math.random().toString(36).slice(2, 12); ls.set('gg-net-pid', id); }
  return id;
}
export function playerName() {
  const q = new URLSearchParams(location.search).get('name');
  if (q) return q.slice(0, 16);
  let n = ls.get('gg-net-name');
  if (!n) { n = NAMES[Math.floor(Math.random() * NAMES.length)]; ls.set('gg-net-name', n); }
  return n;
}
export function setPlayerName(n) { if (n) ls.set('gg-net-name', String(n).slice(0, 16)); }

/** Your own saved look (a guest's game state is the host's world, so the look comes from your own save). */
export function ownAvatar(fallback = null) {
  try { const s = JSON.parse(ls.get('gacha-garage-save-v2') || 'null'); if (s?.avatar) return s.avatar; } catch { /* */ }
  return fallback;
}

export function me(avatar) { return { pid: playerId(), name: playerName(), avatar: avatar || ownAvatar() }; }

/** The session this tab is part of ({ role: 'guest', code } survives the reload into the host's world). */
export function readSession() { try { return JSON.parse(ss.get(SESSION_KEY) || 'null'); } catch { return null; } }
export function writeSession(s) { ss.set(SESSION_KEY, JSON.stringify(s)); }
export function clearSession() { ss.del(SESSION_KEY); ss.del(VISIT_KEY); }

/** Called by main.js before the Game is built. Returns null (not a guest), { session } or { error }. */
export async function prepareNet(status = () => {}) {
  const s = readSession();
  if (!s || s.role !== 'guest' || !s.code) return null;
  try {
    status(`Joining room ${s.code}...`);
    const sess = await Session.join(s.code, { me: me(), rejoin: true });
    status('Fetching the shop...');
    const snap = await unpackJSON(sess.welcome.snap);
    snap.__visit = true;
    snap.__net = { code: s.code, host: sess.welcome.hostName || 'Host' };
    ss.set(VISIT_KEY, JSON.stringify(snap));
    delete sess.welcome.snap;
    pending = { session: sess };
  } catch (e) {
    console.warn('[net] could not rejoin', e);
    clearSession();
    pending = { error: e };
  }
  return pending;
}

export function takePending() { const p = pending; pending = null; return p; }
