// What the lane remembers (game.state.npcs, one save key): who you've met, how they feel about you, what you said,
// what you gave them, and the gossip going round (things you did that people talk about).
//   const M = laneMemory(game)
//   M.person(id)            -> { rel, flags, talks, last, seen, said: [{ t, text }], notes: [...], gifts: [...], slaps }
//   M.meet(id)              mark someone as met (the Codex People page reads met[id])
//   M.rel(id, delta)        relationship -10..10 (game.events 'npcRel')
//   M.gossip(kind, data)    something happened on the lane: 'slap' { who }, 'overpriced' { machine }, 'secret' { key },
//                           'sold' { who, key, price }, 'haggle', 'complaint', 'prank', 'yokai' ... (kept 30 entries)
//   M.recent(kind, days)    latest gossip of that kind within `days` (or null)
//   M.sawYokai(id)          a yokai sighting (game.state.npcs.yokai[id] = { first, n }; the Codex records it too)
// Old saves: the earlier { v: 1, met, days, ... } layout is kept and filled in.
import { ensureState } from '../game/stateExt.js';

const CODEX_ID = { kasa: 'karakasa' }; // the Codex's own yokai ids

export function laneMemory(game) {
  if (game.laneMemory) return game.laneMemory;
  const S = ensureState(game, 'npcs', { v: 2, met: {}, people: {}, gossip: [], yokai: {}, days: 1 });
  for (const k of ['met', 'people', 'yokai']) if (!S[k] || typeof S[k] !== 'object' || Array.isArray(S[k])) S[k] = {};
  if (!Array.isArray(S.gossip)) S.gossip = [];
  S.v = Math.max(2, S.v || 0);
  const stamp = () => game.clock?.stamp ?? 0;
  const day = () => game.clock?.day ?? 1;
  const M = {
    state: S,
    person(id) {
      let p = S.people[id];
      if (!p) p = S.people[id] = { rel: 0, flags: {}, talks: 0, last: 0, seen: 0, said: [], notes: [], gifts: [], slaps: 0 };
      for (const [k, v] of [['flags', {}], ['said', []], ['notes', []], ['gifts', []]]) if (!p[k] || typeof p[k] !== 'object') p[k] = v;
      return p;
    },
    met(id) { return !!S.met[id]; },
    meet(id) {
      if (S.met[id]) return false;
      S.met[id] = day();
      game.events.emit('npcMet', { id });
      return true;
    },
    rel(id, d = 0) {
      const p = M.person(id);
      if (d) { p.rel = Math.max(-10, Math.min(10, (p.rel || 0) + d)); game.events.emit('npcRel', { id, rel: p.rel, delta: d }); }
      return p.rel;
    },
    note(id, text) { const p = M.person(id); p.notes.push({ t: stamp(), text }); if (p.notes.length > 20) p.notes.shift(); },
    gift(id, what) { const p = M.person(id); p.gifts.push({ t: stamp(), what }); if (p.gifts.length > 20) p.gifts.shift(); },
    gossip(kind, data = {}) {
      S.gossip.push({ kind, day: day(), t: stamp(), ...data });
      if (S.gossip.length > 30) S.gossip.splice(0, S.gossip.length - 30);
      game.events.emit('gossip', { kind, ...data });
    },
    recent(kind, days = 2) {
      const d = day();
      for (let i = S.gossip.length - 1; i >= 0; i--) { const e = S.gossip[i]; if (e.kind === kind && d - e.day <= days) return e; }
      return null;
    },
    sawYokai(id) {
      const y = S.yokai[id] || (S.yokai[id] = { first: stamp(), n: 0 });
      y.n++;
      try { game.os?.codex?.see(CODEX_ID[id] || id); } catch { /* no PC yet */ }
      if (y.n === 1) { M.gossip('yokai', { who: id }); game.events.emit('yokaiSeen', { id }); }
      return y;
    },
  };
  game.laneMemory = M;
  return M;
}
