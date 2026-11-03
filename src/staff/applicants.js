// The applicant generator: a whole person from a seed. Mostly ordinary locals (a high-schooler saving for a scooter, a
// retired carpenter, a mum free while the kids are at school...) and now and then one of the funny ones (a kappa who
// needs his dish kept wet, a tanuki who pays change in leaves, a retired salaryman who bows at everything, a gyaru
// glued to her phone, a robot-obsessed kid, a sleepy philosophy student, a man who is definitely not a ninja, a ghost
// who only works nights). Deterministic: the same seed is always the same person (the save keeps only the result).
//
//   makeApplicant(seed, { arch, role, wage, hours, n }) -> profile (plain JSON, saved in game.state.staff)
//   profile: { id, seed, arch, name, given, family, sex, age, look: { base, seed, kind, o }, stats: { speed, honesty,
//              charm, reliability } (1..5), quirks: [], fav (role they are good at), cv: [], hobby, flags: [], blurb,
//              phone, want (yen / h), nightOnly, color, voice, tts, from (where they're from) }
//   skillFor(p, role) -> 0..1      how good someone is at a role (stats + favourite role + quirks)
import { rng } from '../core/util.js';
import { ARCHETYPES, LOCALS, LOCAL_CV, HOBBIES, COMMON_QUIRKS, FAMILY, GIVEN_M, GIVEN_F, FOREIGN, ROLES, WAGE_STD, QUIRKS } from './data.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const STAT_KEYS = ['speed', 'honesty', 'charm', 'reliability'];

/** Weighted pick of an ordinary local. */
function pickLocal(r) {
  const tot = LOCALS.reduce((a, l) => a + l.w, 0);
  let x = r() * tot;
  for (const l of LOCALS) { if (x < l.w) return l; x -= l.w; }
  return LOCALS[0];
}

export function makeApplicant(seed, opts = {}) {
  const r = rng((seed * 2654435761) >>> 0);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const ri = (a, b) => a + Math.floor(r() * (b - a + 1));
  const A = opts.arch && ARCHETYPES[opts.arch] ? ARCHETYPES[opts.arch] : null;
  const p = { seed, arch: A ? A.id : 'local', applied: opts.role || null };
  if (A) {
    const [given, family] = pick(A.names);
    p.given = given; p.family = family; p.sex = A.sex;
    p.age = ri(A.ages[0], A.ages[1]);
    p.look = { base: A.base, seed: seed % 9973, kind: A.kind, o: {} };
    if (A.id === 'salaryman') p.look.o = { age: 'elder', hair: { style: 'sidepart', col: [176, 172, 166], grey: 1 }, face: { wrinkles: 1, spots: 0.6, stubble: 0.1 }, glasses: { kind: 'rect', col: [120, 110, 100], thick: 1 } };
    if (A.id === 'robokid') p.look.o = { H: 1.6, hair: { style: 'messy', col: [42, 36, 40] }, glasses: { kind: 'round', col: [40, 40, 44], thick: 1.4 }, top: { kind: 'tee', col: [90, 140, 210], print: 'star', col2: [240, 200, 60] } };
    if (A.id === 'student') {
      const f = r() < 0.5;
      p.sex = f ? 'f' : 'm';
      p.look.o = f
        ? { sex: 'f', bust: 0.7, hair: { style: 'bob', col: [60, 44, 52] }, top: { kind: 'knit', col: [150, 140, 190], sleeve: 'long' }, bottom: { kind: 'jeans', col: [70, 80, 110] }, hat: { kind: 'hood' }, face: { browW: 0.8 } }
        : { hair: { style: 'messy', col: [52, 44, 50] }, top: { kind: 'knit', col: [120, 130, 170], sleeve: 'long' }, hat: { kind: 'hood' } };
    }
    p.cv = A.cv.slice();
    p.hobby = A.hobby;
    p.blurb = A.blurb;
    p.flags = [A.flag];
    p.quirks = [A.quirk];
    p.fav = A.fav;
    p.color = A.color;
    p.voice = A.voice; p.tts = A.tts;
    p.nightOnly = !!A.nightOnly;
    p.stats = {};
    STAT_KEYS.forEach((k, i) => { p.stats[k] = clamp(A.stats[i] + (r() < 0.25 ? (r() < 0.5 ? -1 : 1) : 0), 1, 5); });
    p.from = A.id === 'kappa' ? 'The Morio river (under the bridge)' : A.id === 'tanuki' ? 'The hills behind the shrine' : A.id === 'ghost' ? 'An old well, Himeji' : A.id === 'ninja' ? '(classified)' : 'Morio-cho';
    p.want = Math.round((opts.wage || WAGE_STD) * A.wage / 10) * 10;
  } else {
    const L = pickLocal(r);
    p.look = { base: L.base, seed: seed % 9973, kind: null, o: {} };
    if (L.foreign) {
      const [given, family, sex, country] = pick(FOREIGN);
      p.given = given; p.family = family; p.sex = sex; p.from = country;
    } else {
      // the preset decides the sex for most bases; a few can be either
      const fixed = { schoolgirl: 'f', office_lady: 'f', mom: 'f', grandma: 'f', schoolboy: 'm', salaryman: 'm', grandpa: 'm', otaku: 'm', delivery: 'm', construction: 'm' };
      p.sex = fixed[L.base] || (r() < 0.5 ? 'f' : 'm');
      p.given = pick(p.sex === 'f' ? GIVEN_F : GIVEN_M);
      p.family = pick(FAMILY);
      p.from = pick(['Morio-cho', 'Morio-cho', 'Ekimae', 'Sakura Heights', 'Kita-Morio', 'the next town over']);
    }
    p.age = ri(L.ages[0], L.ages[1]);
    if (L.base === 'tourist') p.look.o = {};
    p.cv = [pick(L.job)];
    const pool = LOCAL_CV.slice();
    for (let i = 0, n = ri(1, 3); i < n; i++) p.cv.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
    p.hobby = pick(HOBBIES);
    p.stats = {};
    for (const k of STAT_KEYS) p.stats[k] = clamp(ri(1, 5) + (r() < 0.4 ? 1 : 0) - (r() < 0.2 ? 1 : 0), 1, 5);
    // a little bias so the role they like is the one they're good at
    const fs = ROLES[L.fav]?.stat;
    if (fs) p.stats[fs] = clamp(p.stats[fs] + 1, 1, 5);
    p.fav = r() < 0.75 ? L.fav : pick(Object.keys(ROLES).filter((x) => x !== 'guard'));
    if (L.base === 'grandpa' && r() < 0.5) p.fav = 'guard';
    p.quirks = r() < 0.75 ? [pick(COMMON_QUIRKS)] : [];
    if (p.quirks[0] === 'punctual') p.stats.reliability = clamp(p.stats.reliability + 1, 1, 5);
    if (p.quirks[0] === 'late') p.stats.reliability = clamp(p.stats.reliability - 1, 1, 5);
    p.flags = localFlags(p, pick);
    p.blurb = localBlurb(p, L, pick);
    p.color = pick(['#ffd23f', '#ff9a8c', '#a8e2ff', '#b6ee8c', '#ffc17e', '#d6bcff', '#ffc8d6']);
    p.nightOnly = false;
    const avg = (p.stats.speed + p.stats.reliability + p.stats.charm) / 3;
    p.want = Math.round(((opts.wage || WAGE_STD) * (0.8 + avg * 0.08) + (r() - 0.5) * 80) / 10) * 10;
  }
  p.name = `${p.given} ${p.family}`;
  p.phone = `0${pick(['90', '80', '3'])}-${ri(1000, 9999)}-${ri(1000, 9999)}`;
  p.want = clamp(p.want, 100, 2000);
  p.hoursOK = p.nightOnly ? ['evening', 'night'] : ['morning', 'afternoon', 'day', 'evening', 'night'].filter(() => r() < 0.85);
  if (!p.hoursOK.length) p.hoursOK = ['day'];
  if (p.arch === 'student' && !p.hoursOK.includes('night')) p.hoursOK.push('night');
  p.dayOff = ri(0, 6);
  return p;
}

function localFlags(p, pick) {
  const out = [];
  if (p.stats.honesty <= 1) out.push(pick(['Left the last job "by mutual misunderstanding".', 'Lists "finding money" as a skill.']));
  else if (p.stats.honesty <= 2) out.push(pick(['References: "my mum".', 'Says the last shop\'s till "was always short anyway".']));
  if (p.stats.reliability <= 2) out.push(pick(['Missed the first interview slot. And the second.', 'Availability: "vibes".']));
  if (p.stats.charm <= 1) out.push('Profile photo is of a wall.');
  if (!out.length && p.stats.speed >= 5) out.push('Typed the whole application in 40 seconds. Impressive. Suspicious?');
  if (!out.length) out.push(pick(['No red flags. Inspired is as surprised as you are.', 'Nothing unusual. Almost suspiciously normal.', 'Clean record. Likes cats.']));
  return out;
}

function localBlurb(p, L, pick) {
  const best = Object.entries(p.stats).sort((a, b) => b[1] - a[1])[0][0];
  const adj = { speed: ['Quick on my feet!', 'Fast learner, fast walker.'], honesty: ['Honest and careful with money.', 'Never lost a yen in my life.'], charm: ['People person! Love chatting.', 'Customers love me (my mum says).'], reliability: ['Always on time, never sick.', 'Reliable as the 6:40 train (on a good day).'] }[best];
  const intro = L.foreign ? `Hi from ${p.from}! Learning Japanese, loving capsule toys.` : p.age >= 60 ? 'Retired, healthy, bored. Ready to work.' : p.age <= 18 ? 'Student looking for a part-time job after school.' : 'Looking for a friendly local job.';
  return `${intro} ${pick(adj)}`;
}

/** How good someone is at a role: 0..1 (their stat for it, +1 for the role they like, quirks). */
export function skillFor(p, role) {
  const R = ROLES[role];
  if (!R) return 0.5;
  let s = (p.stats?.[R.stat] ?? 3) + (p.fav === role ? 1 : 0);
  if (role === 'greet') s += (p.stats.charm - 3) * 0.3 + (p.quirks?.includes('phone') ? 1 : 0);
  if (role === 'clean' && p.quirks?.includes('neat')) s += 1;
  if (role === 'clean' && p.quirks?.includes('dish')) s += 1;
  if (role === 'guard' && p.nightOnly) s += 1.5;
  if (role === 'coins' && p.quirks?.includes('leaves')) s -= 1;
  return clamp((s - 1) / 5, 0, 1);
}

/** 0..5 stars (halves) for a role (shown on the site and the rota). */
export const starsFor = (p, role) => Math.round(skillFor(p, role) * 10) / 2;

/** One-line summary of someone's quirks. */
export const quirkText = (p) => (p.quirks || []).map((q) => QUIRKS[q]?.name).filter(Boolean).join(', ') || 'None';
