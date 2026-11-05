// Cosmetics you earn instead of buy:
//  - achievements with reward.cosmetic (game.os.achievements, src/style/achievements.js), and catalogue entries that
//    name an achievement (ach: 'id'): granted on 'achievement'
//  - the lane's side quests: catalogue entries with quest: 'id' are that quest's reward (its banner says so)
//  - capsule bonuses: some gacha series hide a rare piece of clothing in their capsules (catalogue capsule: 'series');
//    when you open one there's a small chance it's tucked in with the figure
// Older saves get what they already earned (quietly, with one note) the first time this runs.
//   installRewards(game) -> { rollCapsule(series) }       (game.cosmeticsDebug.capsule(series) forces one)
import { COSMETICS, COSMETIC_BY_ID } from '../people/cosmetics.js';
import { SERIES_BY_ID } from '../data/series/index.js';

export const CAPSULE_ODDS = 1 / 28; // per capsule opened from a series that has an unowned piece

export function installRewards(game) {
  const g = game;
  const C = () => g.cosmetics;
  // (a quest or an achievement can hand over more than one piece)
  const group = (key) => { const m = new Map(); for (const c of COSMETICS) if (c[key]) { if (!m.has(c[key])) m.set(c[key], []); m.get(c[key]).push(c); } return m; };
  const byQuest = group('quest'), byAch = group('ach');

  // ---- achievements
  const fromAch = (id, name, reward) => {
    const cid = reward?.cosmetic;
    if (cid && COSMETIC_BY_ID[cid]) C()?.grant(cid, { from: name || id, kind: 'ach' });
    for (const c of byAch.get(id) || []) if (c.id !== cid) C()?.grant(c.id, { from: name || id, kind: 'ach' }); // catalogue entries that name it
  };
  g.events.on('achievement', ({ id, name, reward }) => fromAch(id, name, reward));

  // ---- side quests: the reward text names the piece, completing it hands it over
  const tagQuests = () => {
    const SQ = g.sideQuests;
    if (!SQ) return;
    for (const [qid, list] of byQuest) {
      const d = SQ.get(qid);
      if (!d || d._cx) continue;
      d._cx = true;
      d.reward = { ...(d.reward || {}) };
      d.reward.text = [d.reward.text, `New in your closet: ${list.map((c) => c.name).join(', ')}`].filter(Boolean).join('  ·  ');
    }
  };
  tagQuests();
  g.events.on('sideQuest', ({ id, state }) => {
    if (state !== 'done') return;
    for (const c of byQuest.get(id) || []) C()?.grant(c.id, { from: g.sideQuests?.get(id)?.title || id, kind: 'quest' });
  });

  // ---- catch-up for saves that earned things before these rewards existed
  const catchUp = () => {
    const got = [];
    for (const [qid, list] of byQuest) if (g.sideQuests?.isDone?.(qid)) for (const c of list) if (C()?.grant(c.id, { kind: 'quest', quiet: true })) got.push(c.name);
    for (const a of g.os?.achievements?.list?.() || []) {
      if (a.got == null) continue;
      if (a.reward?.cosmetic && C()?.grant(a.reward.cosmetic, { kind: 'ach', quiet: true })) got.push(COSMETIC_BY_ID[a.reward.cosmetic].name);
      for (const c of byAch.get(a.id) || []) if (C()?.grant(c.id, { kind: 'ach', quiet: true })) got.push(c.name);
    }
    if (got.length) g.news?.('Your closet has something new', got.slice(0, 3).join(', ') + (got.length > 3 ? ` and ${got.length - 3} more` : ''), 6500);
  };
  let t = 3, rounds = 0;
  g.constructor.updaters.push((gg, dt) => {
    if (rounds > 3 || (t -= dt) > 0) return;
    t = 4; rounds++;
    tagQuests();
    if (!g.visiting && g.cosmetics) catchUp();
  });

  // ---- capsule bonuses
  const unownedFor = (series) => COSMETICS.filter((c) => c.capsule === series && !C()?.owns(c.id));
  const api = {
    rollCapsule(series, force = false) {
      const pool = unownedFor(series);
      if (!pool.length || g.visiting) return null;
      if (!force && Math.random() > CAPSULE_ODDS) return null;
      return pool[Math.floor(Math.random() * pool.length)];
    },
  };
  const R = g.reveal;
  if (R?.pop) {
    const pop0 = R.pop.bind(R);
    R.pop = (item, cap) => {
      const series = item?.data?.series;
      const bonus = series ? api.rollCapsule(series, api.force === series) : null;
      api.force = null;
      pop0(item, cap);
      if (bonus) {
        // the figure's reveal first, then the folded surprise
        const rar = item.data?.rarity;
        const wait = { rare: 2.2, ultra: 3.2, secret: 5 }[rar] || 1.6;
        g.tweens.wait(wait, () => {
          C()?.grant(bonus.id, { from: SERIES_BY_ID[series]?.name || series, kind: 'capsule' });
          g.news?.('Something else in the capsule!', `A folded ${bonus.name}, tucked under the paper.`, 5200);
        });
      }
    };
  }
  g.cosmeticsDebug = { ...(g.cosmeticsDebug || {}), capsule: (series) => { api.force = series; return unownedFor(series).map((c) => c.id); } };
  return api;
}
