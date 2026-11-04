// Life on the lane: who walks by when, and what they do on the way (src/world/Pedestrians.js runs them).
// - The cast by time of day and calendar: a weekday morning commute toward the station (east), students in pairs
//   on their way to school and home again, the locals' shopping in the morning and before dinner, office workers at
//   lunch, the evening return from the station, a few night owls and a tipsy salaryman humming his way home late at
//   night; weekends and holidays are slower, later and more leisurely (no commute, more visitors and dog walkers).
//   Teens and adults only (no small kids on their own in the lane).
// - Each person gets a short plan of errands from a weighted menu that depends on who they are and the hour, with a
//   lane-wide memory of what was picked lately so the street doesn't loop (gacha machines out front, the notice board,
//   posters, a drink from a vending machine, a cigarette at Mikawa-ya's ashtray, a look at the pager or a call on the
//   flip phone, a sit on the shop bench, posting a letter, shopping inside Mikawa-ya), and the special walkers: dog
//   walkers, a jogger late for his train, a delivery cyclist ringing the bell.
// - Pairs walk side by side and chat; two neighbours who meet stop face to face for a natter.
// Places are claimed (a vending machine serves one at a time, the bench seats two...). Histogram of what was chosen:
// game.streetLife.hist.
//   streetDirector(game) -> D    D.unit() (the next person or pair to spawn)   D.plan(p)   D.ambientTarget()
//   ERRANDS[kind](P, p, poi) -> generator (run by Pedestrians' job runner)
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { canMesh, cigMesh, bagMesh, holdIn, free, pickDrink } from './streetProps.js';

const V = (x, z) => new THREE.Vector3(x, 0, z);
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const sfx = (n, o = {}) => { try { audio.play(n, o); } catch { /* audio not ready */ } };
const wpick = (w) => { let tot = 0; for (const k in w) tot += Math.max(0, w[k]); let x = Math.random() * tot; for (const k in w) { x -= Math.max(0, w[k]); if (x <= 0) return k; } return Object.keys(w)[0]; };

// ------------------------------------------------------------------ places on the lane
export const LANE_NEAR = 7.3, LANE_FAR = 11.2;
export const POIS = {
  gacha: [{ x: -2.55, slots: [[-2.88, 6.3], [-2.22, 6.3]], face: Math.PI, look: V3(-2.55, 0.95, 5.62), open: true }],
  board: [{ x: 17.45, slots: [[17.2, 6.2], [17.75, 6.22]], face: Math.PI, look: V3(17.45, 1.05, 5.53) }],
  poster: [
    { x: -9.05, slots: [[-9.05, 5.95]], face: Math.PI, look: V3(-9.05, 0.6, 5.3), what: 'festival' },
    { x: -7.75, slots: [[-7.75, 5.95]], face: Math.PI, look: V3(-7.75, 0.6, 5.3), what: 'event' },
    { x: 12.75, slots: [[12.75, 5.95]], face: Math.PI, look: V3(12.75, 0.65, 5.3), what: 'travel' },
    { x: 16.05, slots: [[16.05, 5.95]], face: Math.PI, look: V3(16.05, 0.72, 5.3), what: 'lost' },
    { x: -19.3, slots: [[-19.3, 6.0]], face: Math.PI, look: V3(-19.3, 1.0, 5.35), what: 'zoo' },
    { x: -1.95, slots: [[-1.95, 14.25]], face: 0, look: V3(-1.95, 0.75, 14.9), what: 'lost' },
    { x: 19.15, slots: [[19.15, 14.25]], face: 0, look: V3(19.15, 0.6, 14.9), what: 'zoo' },
    { x: -20.3, slots: [[-20.3, 14.25]], face: 0, look: V3(-20.3, 0.7, 14.9), what: 'travel' },
  ],
  vending: [
    { x: -0.62, slots: [[-0.62, 13.72]], face: 0, look: V3(-0.62, 1.25, 14.43), bin: V3(-1.5, 0.5, 13.95), hot: true },
    { x: 0.4, slots: [[0.4, 13.72]], face: 0, look: V3(0.4, 1.25, 14.43), bin: V3(-1.5, 0.5, 13.95) },
    { x: -17.0, slots: [[-17.0, 13.75]], face: 0, look: V3(-17.0, 1.25, 14.45) },
    { x: -16.05, slots: [[-16.05, 6.38]], face: Math.PI, look: V3(-16.05, 1.25, 5.68) },
  ],
  ashtray: [{ x: -13.7, slots: [[-14.2, 13.95], [-13.25, 13.92]], face: 0.0, look: V3(-13.7, 0.85, 14.5), tray: V3(-13.7, 0.9, 14.5) }],
  post: [{ x: 1.5, slots: [[1.5, 13.62]], face: 0, look: V3(1.5, 1.0, 14.3) }],
  bench: [{ x: 2.75, seats: [{ x: 2.53, z: 5.6, y: 0.46 }, { x: 2.98, z: 5.6, y: 0.42 }], face: 0, open: true }],
  // the park behind the near side, through the A2 passage (town.paths.park): two benches (not Rohan's)
  park: [{ x: 10.55, seats: [{ x: 12.2, z: -12.35, y: 0.42, face: Math.PI / 2, stand: [12.75, -12.35] }, { x: 12.2, z: -13.05, y: 0.42, face: Math.PI / 2, stand: [12.75, -13.05] },
    { x: 15.55, z: -16.77, y: 0.42, face: 0, stand: [15.55, -16.2] }, { x: 16.25, z: -16.77, y: 0.42, face: 0, stand: [16.25, -16.2] }] }],
  mikawaya: [{ x: -12.42, out: V(-12.42, 13.55), door: V(-12.42, 15.45), counter: V(-12.2, 16.72),
    browse: [[-13.2, 16.6, -Math.PI / 2], [-10.8, 16.15, Math.PI], [-10.5, 16.55, Math.PI / 2]] }],
};

const COUNTER = { x: -12.2, slots: [[-12.2, 16.72]] };
/** The errand -> its places (where the name differs). */
export const POI_OF = { smoke: 'ashtray' };

// ------------------------------------------------------------------ who
// presets weights, speed range, pair chance, errand weights (pass = no errand), flags
export const ARCH = {
  commuter: { presets: { salaryman: 3, office_lady: 2.2 }, speed: [1.32, 1.6], dir: 1, shop: false, n: [0, 1], errands: { pass: 7, phone: 1, vending: 0.8, smoke: 0.4 } },
  returning: { presets: { salaryman: 3, office_lady: 2.5 }, speed: [1.1, 1.35], dir: -1, shop: true, pair: 0.15, n: [0, 2], errands: { pass: 4, vending: 1, smoke: 0.9, gacha: 0.6, mikawaya: 0.6, phone: 0.7, post: 0.3 } },
  student: { presets: { schoolgirl: 1, schoolboy: 1 }, speed: [1.05, 1.3], shop: true, pair: 0.7, n: [0, 2], errands: { pass: 3, gacha: 1.8, vending: 1.2, mikawaya: 0.9, poster: 0.5, phone: 0.3, bench: 0.3, park: 0.4 } },
  local: { presets: { grandma: 2.2, grandpa: 2, mom: 1.4 }, speed: [0.62, 0.92], shop: true, n: [1, 2], errands: { pass: 2, board: 1.3, bench: 1.1, mikawaya: 1.5, post: 0.7, poster: 0.4, vending: 0.3, park: 0.6 } },
  worker: { presets: { delivery: 1.2, construction: 1 }, speed: [1.25, 1.5], shop: true, n: [0, 1], errands: { pass: 4, vending: 1.6, smoke: 1.3, phone: 0.4 } },
  visitor: { presets: { tourist: 1.4, otaku: 1.2, gyaru: 1 }, speed: [0.95, 1.2], shop: true, pair: 0.3, n: [1, 2], errands: { pass: 2, gacha: 2, poster: 1, vending: 0.8, phone: 1, bench: 0.4, board: 0.3, park: 0.4 } },
  office: { presets: { office_lady: 2, salaryman: 2 }, speed: [1.1, 1.35], shop: true, pair: 0.3, n: [0, 2], errands: { pass: 3, vending: 1, phone: 0.8, mikawaya: 0.6, smoke: 0.5, post: 0.5, gacha: 0.4 } },
  jogger: { presets: { salaryman: 1 }, speed: [2.5, 2.9], dir: 1, shop: false, jog: true, n: [0, 0], errands: { pass: 1 } },
  tipsy: { presets: { salaryman: 1 }, speed: [0.6, 0.8], shop: false, tipsy: true, n: [0, 1], errands: { pass: 3, vending: 0.8, smoke: 0.5, bench: 0.4 } },
  nightowl: { presets: { otaku: 1, gyaru: 0.6, office_lady: 0.5 }, speed: [1.05, 1.3], shop: true, n: [0, 1], errands: { pass: 3, vending: 1.3, phone: 1, smoke: 0.3 } },
  dogwalker: { presets: { grandpa: 1.5, mom: 1, office_lady: 0.8, grandma: 0.8 }, speed: [0.8, 1.0], shop: false, dog: true, n: [0, 0], errands: { pass: 1 } },
  cyclist: { presets: { delivery: 1.5, mom: 1, salaryman: 0.6, schoolboy: 0.6 }, speed: [3.0, 3.7], shop: false, bike: true, n: [0, 0], errands: { pass: 1 } },
};
// the day: [from, to, phase]
const PHASES = [[0, 5, 'night'], [5, 7, 'dawn'], [7, 9, 'commute'], [9, 12, 'morning'], [12, 13, 'lunch'], [13, 15, 'afternoon'], [15, 18, 'school'], [18, 20.5, 'evening'], [20.5, 24, 'late']];
const MIX = {
  night: { tipsy: 3, nightowl: 2, worker: 0.3 },
  dawn: { local: 2, dogwalker: 2, jogger: 0.5, worker: 0.6, cyclist: 0.4 },
  commute: { commuter: 5, student: 3, jogger: 1, dogwalker: 0.8, local: 0.6, cyclist: 0.9 },
  morning: { local: 3, visitor: 1.2, worker: 1.4, dogwalker: 0.6, office: 0.6, cyclist: 0.5 },
  lunch: { office: 3, worker: 1.5, local: 1, visitor: 1, cyclist: 0.4 },
  afternoon: { local: 2.4, visitor: 1.6, worker: 1.2, office: 0.6, cyclist: 0.5, dogwalker: 0.3 },
  school: { student: 4, local: 2, visitor: 1, worker: 0.6, dogwalker: 0.8, cyclist: 0.6 },
  evening: { returning: 4, local: 1.2, student: 1, visitor: 0.8, dogwalker: 0.8, cyclist: 0.4 },
  late: { returning: 1.5, nightowl: 1.2, tipsy: 1.2, dogwalker: 0.4 },
};
const WEEKEND = { commuter: 0.12, student: 0.45, jogger: 0, office: 0.2, returning: 0.3, worker: 0.5, visitor: 2, local: 1.2, dogwalker: 1.6, tipsy: 1.3 };
const SURNAMES = ['Sato', 'Suzuki', 'Takahashi', 'Tanabe', 'Watari', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato', 'Yoshida', 'Sasaki', 'Matsumoto', 'Inoue', 'Kimoto', 'Hayashi', 'Shimizu', 'Mori'];

// ------------------------------------------------------------------ what people say
export const TALK = {
  student: [
    [['a', 'Did you do the maths homework?'], ['b', '...What maths homework?']],
    [['a', 'Sensei was SO angry today.'], ['b', 'Because of you!'], ['a', 'Was not!']],
    [['a', 'Karaoke on Saturday?'], ['b', 'Only if you don\'t sing X JAPAN again.']],
    [['a', 'Did you see Music Station last night?'], ['b', 'Yes! Amazing!']],
    [['a', 'My pager went off in class.'], ['b', 'No way! Did sensei take it?']],
    [['a', 'Want to try the gacha place?'], ['b', 'With what money?']],
    [['a', 'Let\'s get purikura after!'], ['b', 'Again? ...Okay.']],
    [['a', 'Club practice ran SO late.'], ['b', 'I\'m starving.']],
    [['a', 'Have you finished your Tamagotchi?'], ['b', 'It died. Again.']],
  ],
  local: [
    [['a', 'The cherry blossoms were lovely this year.'], ['b', 'Yes, yes. Too short, as always.']],
    [['a', 'My knees today...'], ['b', 'Mine too, mine too.']],
    [['a', 'Mikawa-ya has daikon cheap today.'], ['b', 'Ara! I\'ll go and look.']],
    [['a', 'It looks like rain later.'], ['b', 'I brought my umbrella.']],
  ],
  office: [
    [['a', 'The boss was in a mood today.'], ['b', 'When isn\'t he?']],
    [['a', 'One beer on the way home?'], ['b', 'Just one. ...Just one.']],
    [['a', 'Did you finish the report?'], ['b', 'Don\'t ask.']],
    [['a', 'The 7:42 was packed again.'], ['b', 'Like sardines.']],
  ],
  visitor: [
    [['a', 'This lane is so retro.'], ['b', 'It\'s cute!']],
    [['a', 'Let\'s take a photo here!'], ['b', 'Again?']],
    [['a', 'Is the station this way?'], ['b', 'I think so...']],
  ],
};
// two neighbours who stop for a chat: [opening, reply, ...topic lines alternating, closing pair]
const MEET = {
  open: [['Ara, {b}-san! Konnichiwa.', 'Ara ara, konnichiwa!'], ['Oh, {b}-san. Good afternoon.', 'Good afternoon! Out shopping?'], ['{b}-san! Atsui desu ne~', 'Hontou ni ne~ So warm!']],
  open_m: [['Ohayou gozaimasu, {b}-san.', 'Ohayou gozaimasu! Early today.']],
  open_e: [['Konbanwa, {b}-san.', 'Konbanwa! Off home?']],
  topic: [
    ['They reopened the old gacha garage, did you see?', 'Grandpa\'s grandkid, isn\'t it? How nice.', 'The machines go gachan, gachan all day!', 'Ho ho! Like the old days.'],
    ['Did you hear? Someone put burnable trash out on a Tuesday!', 'No! Who would do such a thing?', 'I have my suspicions...', 'Mm, mm.'],
    ['My grandson passed his exams!', 'Omedetou! You must be so proud.', 'He gets that from me, of course.', 'Ho ho ho!'],
    ['Mrs. Ota raised the rent again.', 'Again?! That woman...', 'Shh! She hears everything.', '...'],
    ['The cicadas will be out soon.', 'Already? Where does the year go...', 'Faster every year.', 'Hontou ni.'],
    ['That Gonta rang my bell and ran again.', 'Kids these days!', 'In our day, we rang it TWICE.', 'Ha ha ha!'],
    ['Have you tried the new taiyaki stand by the station?', 'Too much bean paste.', 'There\'s no such thing!', 'Ha ha!'],
  ],
  close: [['Well then, take care.', 'Yes, yes, you too.'], ['Ja, mata ne.', 'Mata ne!'], ['I mustn\'t keep you.', 'Not at all! Take care!']],
};
const SAY = {
  gacha: ['Ooh, capsule toys!', 'Look at this one...', 'The cat series is so cute.', 'I had these when I was little.', 'Hmm, which one...'],
  gachaMate: ['Hey, look! Come here!', 'Look look! The tiny ones!', 'Come see this!'],
  gachaCall: ['Moshi moshi? They have capsule toys here!', 'Hey, it\'s me. Remember the old gacha place? It\'s open!'],
  board: ['Neighbourhood clean-up on Sunday...', 'Lost cat? Oh dear.', 'Ara, the festival is coming.', 'Garbage rules again...', 'Hmm hm.'],
  poster: { festival: ['The summer festival!', 'Bon odori already?'], event: ['A flea market? Hmm.', 'Oh, a concert.'], travel: ['Hokkaido... someday.', 'I want to go to Okinawa.'], lost: ['Poor thing. I hope they find it.', 'A lost cat... I\'ll keep an eye out.'], zoo: ['A panda! Cute.', 'The zoo... I haven\'t been in years.'] },
  vending: ['Something cold...', 'Hmm, coffee or tea...', 'Just one can.', 'Corn potage... no.'],
  drink: ['Ahh~ that\'s good.', 'Puhaa!', 'That hits the spot.'],
  smoke: ['Haa... finally.', 'Long day...', 'Just one.', '...'],
  smokeChat: [['Got a light?', 'Here.'], ['Busy day?', 'Don\'t ask.'], ['Nice evening.', 'Mm.']],
  phone: ['Moshi moshi?', 'Un, un... I\'m almost there.', 'Eh? Today?!', 'Hai, hai. Wakarimashita.', 'Sorry, the signal here is bad!'],
  pager: ['A message... "0840"? Hmm.', '"14106"... aww.', 'Who keeps paging me?'],
  bench: ['Haa... my feet.', 'Nice weather.', 'Just a little rest.', '...'],
  post: ['There.', 'Hope it arrives in time.'],
  mikawayaIn: ['Excuse me~', 'Gomen kudasai.'],
  mikawayaBuy: ['This, please.', 'Just these.', 'Is the tofu fresh today?'],
  keeper: ['Maido!', 'Arigatou!', 'Come again!', 'Thank you kindly.'],
  dog: ['Mou, {d}! Come on.', '{d}, not there!', 'Good boy, {d}.', 'Hurry up, {d}...', 'Sorry! He likes people.'],
  dogNames: ['Shiro', 'Hachi', 'Goma', 'Kuma', 'Momo', 'Taro', 'Chibi', 'Pochi'],
  jog: ['Late, late, late!', 'The 8:12! I\'ll miss the 8:12!', 'Sumimasen! Coming through!', 'Haa... haa...'],
  tipsy: ['~ hm hm hmmm ~', '~ la la laaa... ~', 'Just one more bar...', 'I love this lane. I LOVE it.', 'The boss... is an idiot. *hic*', '~ hm hmm ~'],
  tipsyPlayer: ['Oi! Gacha kid! You\'re a good kid! *hic*', 'Shhh! The moon is sleeping.', 'Which way is home? ...That way!'],
  bell: ['Sumimasen!', 'Coming through!', 'Excuse me!'],
};

// ------------------------------------------------------------------ the director
export function streetDirector(game) { return game.streetLife || (game.streetLife = new StreetDirector(game)); }

export class StreetDirector {
  constructor(game) {
    this.game = game;
    this.hist = {};
    this.recent = [];
    this.claims = new Map(); // poi -> [person per slot]
    this.meetT = 3;
    this.counts = { spawned: 0, pairs: 0, ambient: 0 };
    this.archs = {}; // who was cast (units prepared), by archetype
  }
  get hour() { return this.game.clock?.hours ?? 15; }
  get date() { try { return this.game.calendar?.dateOf(this.game.clock?.day ?? 1); } catch { return null; } }
  /** Saturday, Sunday or a national holiday: no commute, a slower, later street. */
  get weekend() { const d = this.date; if (!d) return false; return d.weekday === 0 || d.weekday === 6 || (d.specials || []).some((s) => s.kind === 'holiday'); }
  get friday() { return this.date?.weekday === 5; }
  get phase() { const h = this.hour % 24; for (const [a, b, n] of PHASES) if (h >= a && h < b) return n; return 'night'; }
  count(kind, n = 1) { this.hist[kind] = (this.hist[kind] || 0) + n; }

  /** Extra walkers wanted on top of the customer flow (the commute, the after-school and evening bumps). */
  ambientTarget() {
    const h = this.hour % 24, we = this.weekend;
    let n = 0;
    if (!we) {
      if (h >= 7.2 && h < 8.8) n = 6;
      else if (h >= 15.2 && h < 17.5) n = 3;
      else if (h >= 18 && h < 19.8) n = 4;
      else if (h >= 12 && h < 13) n = 1;
      else if (h >= 21.5 || h < 1) n = this.friday ? 2 : 1;
      else if (h >= 6 && h < 7.2) n = 1;
    } else {
      if (h >= 10 && h < 17.5) n = 2;
      else if (h >= 7 && h < 10) n = 1;
      else if (h >= 21.5 || h < 1.5) n = 2;
    }
    return n;
  }

  /** Who walks in next: { arch, members: [{ preset, seed }], dir }. Seeds from the caller. */
  unit(seedOf, force = null) {
    const ph = this.phase, we = this.weekend;
    const w = {};
    for (const [k, v] of Object.entries(MIX[ph])) w[k] = v * (we ? WEEKEND[k] ?? 1 : 1) * (k === 'tipsy' && (this.friday || this.date?.weekday === 6) ? 2 : 1);
    // the tipsy salaryman is a rare sight: not two at once
    if (this.recent.slice(-4).includes('arch:tipsy')) w.tipsy = (w.tipsy || 0) * 0.15;
    const arch = force && ARCH[force] ? force : wpick(w);
    this.recent.push('arch:' + arch); if (this.recent.length > 16) this.recent.shift();
    this.archs[arch] = (this.archs[arch] || 0) + 1;
    const A = ARCH[arch];
    const pair = A.pair && Math.random() < A.pair;
    const p0 = wpick(A.presets);
    const members = [{ preset: p0, seed: seedOf() }];
    if (pair) members.push({ preset: arch === 'student' && Math.random() < 0.7 ? p0 : wpick(A.presets), seed: seedOf() });
    let dir = A.dir ?? (Math.random() < 0.5 ? 1 : -1);
    if (arch === 'student') dir = ph === 'commute' ? -1 : ph === 'school' ? 1 : dir;
    if (A.dir && Math.random() < 0.12) dir = -dir; // not everyone goes the same way
    return { arch, members, dir };
  }

  /** A few errands along the way (ahead of them in their direction), chosen for variety. */
  plan(p) {
    const A = ARCH[p.arch] || ARCH.visitor, g = this.game, h = this.hour % 24;
    const out = [];
    if (!A.n || A.n[1] === 0) { if (!A.dog && !A.bike && !A.jog) this.count('pass'); return out; } // (the walk itself is counted when they're made)
    const n = Math.round(rnd(A.n[0], A.n[1] + 0.49));
    const used = new Set();
    for (let i = 0; i < n; i++) {
      const w = { ...A.errands };
      for (const k of Object.keys(w)) {
        if (k === 'pass') continue;
        if (used.has(k)) { w[k] = 0; continue; }
        // a lane-wide memory: what the last few people did is less likely now
        const lately = this.recent.slice(-6).filter((r) => r === k).length;
        w[k] *= Math.pow(0.45, lately);
      }
      if (h < 7 || h >= 21.5) { w.mikawaya = 0; w.board *= 0.3; w.bench *= 0.4; w.gacha *= 0.4; w.post = 0; }
      if (h < 8 || h >= 18.5 || !g.garage?.town?.paths?.park) w.park = 0;
      if (h >= 22.9 || h < 6.5) w.mikawaya = 0;
      if (h >= 17.5 || h < 9) w.smoke = (w.smoke || 0) * 1.4;
      if (g.places?.mikawaya?.cashier?.active) w.mikawaya = 0;
      if (!g.garage?.town?.shop?.open && !g.state.story?.complete) { w.gacha = 0; w.bench = 0; }
      if (p.sex === 'f' && w.smoke) w.smoke *= 0.35;
      const k = wpick(w);
      if (k === 'pass') break;
      const poi = this.choosePoi(k, p);
      if (!poi) continue;
      used.add(k);
      out.push({ kind: k, poi, x: poi.x });
      this.recent.push(k); if (this.recent.length > 16) this.recent.shift();
    }
    // in the order they'll pass them
    out.sort((a, b) => (a.x - b.x) * p.dir);
    if (!out.length) this.count('pass');
    return out;
  }

  choosePoi(kind, p) {
    const L = POIS[POI_OF[kind] || kind];
    if (!L) return kind === 'phone' ? { x: p.h.root.position.x + p.dir * rnd(10, 40) } : null;
    const x0 = p.h.root.position.x;
    const ahead = L.filter((q) => (q.x - x0) * p.dir > 3);
    return ahead.length ? pick(ahead) : null;
  }

  // ------------------------------------------------------------------ claims (one person per slot)
  claim(poi, p, n = poi.slots?.length || poi.seats?.length || 1) {
    // somebody (not on our books: a regular hanging about, Grandpa) standing on every slot: no
    const C = this.game.crowd;
    if (C && poi.slots && poi.slots.every((s) => C.occupied(s[0], s[1], 0.38, p.a))) return -1;
    let c = this.claims.get(poi);
    if (!c) this.claims.set(poi, (c = Array(n).fill(null)));
    const i0 = c.indexOf(p);
    if (i0 >= 0) return i0;
    const free = c.map((x, i) => (x ? -1 : i)).filter((i) => i >= 0);
    if (!free.length) return -1;
    const i = pick(free);
    c[i] = p;
    (p.claims ||= []).push(poi);
    return i;
  }
  release(poi, p) { const c = this.claims.get(poi); if (c) { const i = c.indexOf(p); if (i >= 0) c[i] = null; } if (p.claims) p.claims = p.claims.filter((q) => q !== poi); }
  releaseAll(p) { for (const poi of p.claims || []) { const c = this.claims.get(poi); if (c) { const i = c.indexOf(p); if (i >= 0) c[i] = null; } } p.claims = []; }
  others(poi, p) { return (this.claims.get(poi) || []).filter((x) => x && x !== p); }

  // ------------------------------------------------------------------ neighbours meeting in the street
  tick(P, dt) {
    if ((this.meetT -= dt) > 0) return;
    this.meetT = 1.2;
    const L = P.list.filter((p) => p.state === 'stroll' && !p.job && !p.mate && !p.wantsIn && !p.met && p.local && p.t > 4);
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const a = L[i], b = L[j];
      if (a.dir === b.dir) continue;
      const pa = a.h.root.position, pb = b.h.root.position;
      const dx = pb.x - pa.x;
      if (Math.abs(dx) > 4.5 || Math.abs(dx) < 1.2 || dx * a.dir < 0) continue;
      if (Math.abs(pa.x) > 23 || Math.abs(pa.x - 0.4) < 2.2) continue; // not in the tunnel mouths or the shop door
      a.met = b.met = true;
      if (Math.random() > 0.55) continue;
      P.startJob(a, ERRANDS.meet(P, a, b, true), 'meet');
      P.startJob(b, ERRANDS.meet(P, b, a, false), 'meet');
      this.count('meet', 2);
      return;
    }
  }
}

// ------------------------------------------------------------------ errands (coroutines; this = nothing, P = Pedestrians)
const turnTo = (p, yaw) => { p.face = yaw; };
const lineFor = (p, L) => (Array.isArray(L) ? pick(L) : L);

export const ERRANDS = {
  /** The twin capsule machines out front: look at the display cards, maybe call a friend over, maybe go in. */
  *gacha(P, p, poi) {
    const D = P.director, i = D.claim(poi, p);
    if (i < 0) return;
    D.count('gacha');
    const s = poi.slots[i];
    yield P.go(p, [V(s[0], s[1])]);
    turnTo(p, poi.face); p.lookAt = poi.look; p.focus = true;
    yield P.wait(0.4);
    p.h.gesture('browse');
    if (Math.random() < 0.6) P.sayNear(p, lineFor(p, SAY.gacha));
    yield P.wait(rnd(2.5, 4.5));
    const m = p.mate;
    if (m && P.list.includes(m) && Math.random() < 0.8) {
      p.h.clearGesture(); p.lookAt = null; p.face = null; P.faceTo(p, m.h.root.position);
      p.h.gesture('beckon'); P.sayNear(p, lineFor(p, SAY.gachaMate));
      yield P.wait(1.6);
      turnTo(p, poi.face); p.lookAt = poi.look; p.h.gesture('browse');
      yield P.wait(rnd(2, 4));
      P.sayNear(m, pick(['Cute!', 'Whoa, tiny!', 'I want that one.', 'Let\'s get one!']));
    } else if (!m && (p.arch === 'student' || p.arch === 'visitor') && Math.random() < 0.3) {
      p.h.clearGesture(); p.h.gesture('phone_call'); D.count('call');
      P.sayNear(p, lineFor(p, SAY.gachaCall));
      yield P.wait(rnd(4, 6));
    }
    p.h.clearGesture(); p.lookAt = null; p.focus = false;
    D.release(poi, p);
    if (P.shopOpen() && !p.visited && ARCH[p.arch]?.shop !== false && Math.random() < 0.4) { p.wantsIn = true; P.enterShop(p); }
  },

  /** Read the neighbourhood notice board (hands behind the back). */
  *board(P, p, poi) {
    const D = P.director, i = D.claim(poi, p);
    if (i < 0) return;
    D.count('board');
    const s = poi.slots[i];
    yield P.go(p, [V(s[0], s[1])]);
    turnTo(p, poi.face); p.lookAt = poi.look; p.focus = true;
    p.h.gesture('read_board');
    yield P.wait(rnd(2, 3));
    if (Math.random() < 0.5) P.sayNear(p, pick(SAY.board), 'think');
    yield P.wait(rnd(3, 6));
    p.h.clearGesture(); p.lookAt = null; p.focus = false;
    D.release(poi, p);
  },

  /** Stop at a poster for a moment. */
  *poster(P, p, poi) {
    const D = P.director, i = D.claim(poi, p);
    if (i < 0) return;
    D.count('poster');
    const s = poi.slots[i];
    yield P.go(p, [V(s[0], s[1])]);
    turnTo(p, poi.face); p.lookAt = poi.look;
    yield P.wait(rnd(1.5, 2.5));
    if (Math.random() < 0.55) P.sayNear(p, pick(SAY.poster[poi.what] || SAY.board), 'think');
    if (Math.random() < 0.3) p.h.gesture('point', { dir: [0, -0.2, 1] });
    yield P.wait(rnd(1.5, 3));
    p.lookAt = null;
    D.release(poi, p);
  },

  /** A drink from a vending machine: coins, the clunk, bend down for it, open it, drink, bin the can (or carry it). */
  *vending(P, p, poi) {
    const D = P.director, g = P.game;
    let i = D.claim(poi, p), waited = 0;
    if (i < 0) {
      // someone's buying: wait a step behind them for a bit
      const s = poi.slots[0], back = V(s[0], s[1] + (poi.face === 0 ? -0.95 : 0.95));
      yield P.go(p, [back]);
      turnTo(p, poi.face); p.lookAt = poi.look;
      while ((i = D.claim(poi, p)) < 0 && waited < 9) { yield P.wait(0.5); waited += 0.5; }
      if (i < 0) { p.lookAt = null; return; }
    }
    D.count('vending');
    const s = poi.slots[i], front = V(s[0], s[1]);
    yield P.go(p, [front]);
    turnTo(p, poi.face); p.lookAt = poi.look; p.focus = true;
    p.h.gesture('browse');
    if (Math.random() < 0.35) P.sayNear(p, pick(SAY.vending), 'think');
    yield P.wait(rnd(1.6, 3));
    p.h.gesture('insert');
    const slot = poi.look.clone().setY(1.05);
    for (let k = 0; k < 2; k++) { sfx('coinInsert', { pos: slot, vol: 0.4, delay: k * 0.28 }); }
    yield P.wait(0.9);
    sfx('vendBeep', { pos: slot, vol: 0.3 });
    yield P.wait(0.35);
    sfx('vendDrop', { pos: slot.clone().setY(0.2), vol: 0.55 });
    p.h.gesture('reach_low');
    yield P.wait(0.75);
    const id = pickDrink(!!poi.hot && (P.director.hour < 10 || P.director.hour > 18) && Math.random() < 0.6);
    const can = holdIn(p.h, canMesh(id), 'R', [0, -0.07, 0.03]);
    p.props.push(can);
    yield P.wait(0.5);
    p.h.clearGesture(); p.focus = false;
    D.release(poi, p);
    // step out of the way of the machine, open it
    yield P.go(p, [V(front.x + (Math.random() < 0.5 ? 0.9 : -0.9), front.z + (poi.face === 0 ? -0.7 : 0.7))]);
    p.lookAt = null; p.face = null;
    sfx('canOpen', { pos: p.h.root.position.clone().setY(1.1), vol: 0.35 });
    p.h.gesture('drink');
    p.sipT = 4.4;
    yield P.wait(rnd(5.5, 9));
    if (Math.random() < 0.5) P.sayNear(p, pick(SAY.drink));
    if (poi.bin && Math.random() < 0.8) {
      // finished: into the can bin
      p.h.clearGesture();
      yield P.go(p, [V(poi.bin.x + (p.h.root.position.x > poi.bin.x ? 0.55 : -0.55), poi.bin.z - 0.45)]);
      P.faceTo(p, poi.bin);
      p.h.gesture('post');
      yield P.wait(0.55);
      free(can); p.props = p.props.filter((x) => x !== can);
      sfx('capsuleHit', { pos: poi.bin, mat: 'metal', speed: 1, vol: 0.45 });
      yield P.wait(0.6);
      p.h.clearGesture();
    } else { p.h.clearGesture(); p.h.gesture('hold_can'); p.carry = 'can'; }
    void g;
  },

  /** A cigarette at the standing ashtray by Mikawa-ya (another smoker there: a word or two). */
  *smoke(P, p, poi) {
    const D = P.director, g = P.game, i = D.claim(poi, p);
    if (i < 0) return;
    D.count('smoke');
    const s = poi.slots[i];
    yield P.go(p, [V(s[0], s[1])]);
    P.faceTo(p, poi.tray);
    yield P.wait(0.3);
    const cig = holdIn(p.h, cigMesh(), 'R', [0.0, -0.075, 0.025]);
    cig.rotation.x = 0.3;
    p.props.push(cig);
    p.h.gesture('smoke');
    p.smoking = cig;
    sfx('lighter', { pos: p.h.root.position.clone().setY(1.5), vol: 0.4 });
    try { g.effects.sparks({ pos: p.h.headTop(new THREE.Vector3()).add(V3(0, -0.3, 0)), count: 3, color: 0xffb040, speed: 0.2, size: 0.01, life: 0.4, star: 0 }); } catch { /* */ }
    yield P.wait(rnd(2, 4));
    if (Math.random() < 0.45) P.sayNear(p, pick(SAY.smoke), 'think');
    const other = D.others(poi, p)[0];
    if (other && other.smoking && Math.random() < 0.6) {
      const [l1, l2] = pick(SAY.smokeChat);
      P.faceTo(p, other.h.root.position); P.sayNear(p, l1);
      yield P.wait(1.8);
      if (P.list.includes(other)) { P.faceTo(other, p.h.root.position); P.sayNear(other, l2); other.h.nod(0.5); }
      yield P.wait(2);
      P.faceTo(p, poi.tray);
    }
    yield P.wait(rnd(12, 26));
    // stub it out
    p.h.clearGesture(); p.h.gesture('post');
    yield P.wait(0.6);
    p.smoking = null; free(cig); p.props = p.props.filter((x) => x !== cig);
    yield P.wait(0.5);
    p.h.clearGesture();
    D.release(poi, p);
  },

  /** Stop at the side to check the pager, or take a call on the flip phone. */
  *phone(P, p) {
    const D = P.director;
    D.count('phone');
    const r = p.h.root.position;
    // step to the edge on their own side (keep left) so they're out of the way
    const edge = p.dir > 0 ? 6.25 : 13.9;
    yield P.go(p, [V(r.x + p.dir * 1.2, edge + rnd(-0.15, 0.15))]);
    p.face = p.dir > 0 ? Math.PI * 0.5 + 0.6 : -Math.PI * 0.5 + 0.6;
    if (Math.random() < 0.55) {
      p.h.gesture('phone_idle');
      yield P.wait(rnd(1.5, 2.5));
      if (Math.random() < 0.6) P.sayNear(p, pick(SAY.pager), 'think');
      yield P.wait(rnd(2.5, 5));
    } else {
      p.h.gesture('phone_call');
      yield P.wait(0.8);
      P.sayNear(p, 'Moshi moshi?');
      yield P.wait(rnd(2.5, 3.5));
      P.sayNear(p, pick(SAY.phone));
      yield P.wait(rnd(3, 5));
      if (Math.random() < 0.5) { P.sayNear(p, pick(['Hai. Ja, mata.', 'Okay, okay. Bye.', 'See you there!'])); yield P.wait(1.5); }
      p.h.nod(0.4);
    }
    p.h.clearGesture(); p.face = null;
  },

  /** Sit on the shop's bench for a while (watch the street, check the phone, finish a drink). */
  *bench(P, p, poi) {
    const D = P.director, i = D.claim(poi, p, poi.seats.length);
    if (i < 0) return;
    const s = poi.seats[i];
    if (P.steer.occupied(s.x, s.z + 0.1, 0.42, p.a)) { D.release(poi, p); return; } // somebody's already sitting there
    D.count('bench');
    yield P.go(p, [V(s.x, s.z + 0.55)]);
    turnTo(p, poi.face);
    yield P.wait(1.1);
    if (P.steer.occupied(s.x, s.z + 0.1, 0.42, p.a)) { p.face = null; D.release(poi, p); return; }
    p.sit = s;
    p.a.mobile = false;
    p.h.sit(s.y);
    yield P.slide(p, V(s.x, s.z + 0.08), 0.6);
    if (Math.random() < 0.4) P.sayNear(p, pick(SAY.bench), 'think');
    const T = rnd(14, 34);
    let t = 0;
    while (t < T) {
      const r = Math.random();
      if (p.carry === 'can') { p.h.gesture('drink'); yield P.wait(rnd(6, 9)); p.h.clearGesture(); p.h.gesture('hold_can'); t += 7; continue; }
      if (r < 0.3) { p.h.gesture('phone_idle'); yield P.wait(rnd(4, 7)); p.h.clearGesture(); t += 5; }
      else { p.lookAt = null; yield P.wait(rnd(4, 7)); t += 5; }
    }
    p.h.clearGesture();
    if (p.carry === 'can') p.h.gesture('hold_can');
    p.h.sit(0);
    yield P.slide(p, V(s.x, s.z + 0.55), 0.6);
    p.sit = null; p.a.mobile = true; p.face = null;
    D.release(poi, p);
  },

  /** Down the A2 passage to the park for a sit on a bench, then back to the lane and on their way. */
  *park(P, p, poi) {
    const D = P.director, path = P.game.garage?.town?.paths?.park;
    if (!path) return;
    const free = poi.seats.map((s, i) => i).filter((i) => !(D.claims.get(poi) || [])[i] && !P.steer.occupied(poi.seats[i].x, poi.seats[i].z, 0.42, p.a));
    if (!free.length) return;
    const i = free[Math.floor(Math.random() * free.length)];
    (D.claims.get(poi) || (D.claims.set(poi, Array(poi.seats.length).fill(null)), D.claims.get(poi)))[i] = p;
    (p.claims ||= []).push(poi);
    D.count('park');
    const s = poi.seats[i];
    yield P.go(p, [...path, V(s.stand[0], s.stand[1])]);
    p.face = s.face;
    yield P.wait(1.1);
    p.sit = s; p.h.sit(s.y);
    yield P.slide(p, V(s.x + Math.sin(s.face) * 0.08, s.z + Math.cos(s.face) * 0.08), 0.6);
    const T = rnd(20, 45);
    for (let t = 0; t < T; t += 6) {
      if (p.carry === 'can') p.h.gesture('drink'); else if (Math.random() < 0.35) p.h.gesture('phone_idle'); else p.h.clearGesture();
      yield P.wait(6);
    }
    p.h.clearGesture(); if (p.carry === 'can') p.h.gesture('hold_can');
    p.h.sit(0);
    yield P.slide(p, V(s.stand[0], s.stand[1]), 0.6);
    p.sit = null; p.face = null;
    D.release(poi, p);
    yield P.go(p, [...path].reverse());
  },

  /** Post a letter. */
  *post(P, p, poi) {
    const D = P.director, i = D.claim(poi, p);
    if (i < 0) return;
    D.count('post');
    const s = poi.slots[i];
    yield P.go(p, [V(s[0], s[1])]);
    turnTo(p, poi.face); p.lookAt = poi.look;
    yield P.wait(0.5);
    p.h.gesture('post');
    yield P.wait(0.7);
    sfx('paper', { pos: poi.look, vol: 0.4 });
    yield P.wait(0.8);
    if (Math.random() < 0.4) P.sayNear(p, pick(SAY.post), 'think');
    p.lookAt = null;
    D.release(poi, p);
  },

  /** Into Mikawa-ya: browse the shelves, pay at the counter, out with a bag. */
  *mikawaya(P, p, poi) {
    const D = P.director, g = P.game;
    const mk = g.places?.mikawaya;
    if (mk?.cashier?.active) return;
    const ci = D.claim(poi, p, 3);
    if (ci < 0) return;
    D.count('mikawaya');
    // a shopping cart waits by the door
    if (p.cart) {
      yield P.go(p, [poi.out.clone().add(V(0.75, 0.2))]);
      p.cartParked = true; p.h.clearGesture();
      yield P.wait(0.6);
    }
    yield P.go(p, [poi.out, poi.door]);
    if (Math.random() < 0.6) P.sayNear(p, pick(SAY.mikawayaIn));
    const spots = [...poi.browse].sort(() => Math.random() - 0.5).slice(0, Math.random() < 0.5 ? 1 : 2);
    for (const b of spots) {
      if (P.steer.occupied(b[0], b[1], 0.45, p.a)) continue;
      yield P.go(p, [V(b[0], b[1])]);
      turnTo(p, b[2]);
      p.h.gesture('browse');
      yield P.wait(rnd(3, 7));
      p.h.clearGesture();
    }
    // the counter (one at a time)
    let waited = 0;
    while (D.claim(COUNTER, p) < 0 && waited < 12) { yield P.wait(0.5); waited += 0.5; }
    yield P.go(p, [poi.counter]);
    turnTo(p, 0);
    const keeper = mk?.oldman?.h || P.keeper?.h;
    p.lookAt = keeper ? keeper.root.position.clone().setY(1.0) : null;
    P.sayNear(p, pick(SAY.mikawayaBuy));
    yield P.wait(1.6);
    sfx('coinDrop', { pos: poi.counter.clone().setY(0.95), vol: 0.35 });
    yield P.wait(0.8);
    if (keeper && !(mk?.napping?.())) { P.bubbles.say(keeper, pick(SAY.keeper), { dur: 2.2, onChar: P.voiceOf?.(keeper) }); keeper.nod?.(0.6); }
    p.h.nod(0.8);
    yield P.wait(0.8);
    const bag = holdIn(p.h, bagMesh(), 'L', [0.0, -0.12, 0.0]);
    p.props.push(bag);
    D.release(COUNTER, p);
    p.lookAt = null;
    yield P.go(p, [poi.door, poi.out]);
    if (p.cart) {
      yield P.go(p, [poi.out.clone().add(V(0.55, 0.1))]);
      p.cartParked = false; p.h.gesture('pull_cart');
    }
    D.release(poi, p);
  },

  /** Two neighbours stop face to face for a natter (the host does the talking turns). */
  *meet(P, p, q, host) {
    const D = P.director;
    p.mtg = { with: q, done: false };
    // step toward the house fronts on their own side, then face each other
    const r = p.h.root.position, side = p.dir > 0 ? -0.5 : 0.5;
    yield P.go(p, [V(r.x + p.dir * 0.4, r.z + side)]);
    p.a.mobile = false;
    p.lookAt = null;
    for (let t = 0; t < 3 && P.list.includes(q) && q.h.root.position.distanceTo(r) > 1.6; t += 0.25) { P.faceTo(p, q.h.root.position); yield P.wait(0.25); }
    if (!P.list.includes(q)) { p.mtg = null; p.a.mobile = true; return; }
    P.faceTo(p, q.h.root.position);
    p.talkTo = q;
    if (host) {
      const h = D.hour;
      const open = pick(h < 10.5 ? MEET.open_m : h >= 17.5 ? MEET.open_e : MEET.open);
      const topic = pick(MEET.topic), close = pick(MEET.close);
      const name = (o) => o.surname;
      const lines = [[p, open[0]], [q, open[1]], ...topic.map((t, k) => [k % 2 ? q : p, t]), [p, close[0]], [q, close[1]]];
      p.h.nod(0.9); yield P.wait(0.3); q.h.nod(0.9);
      for (const [who, text] of lines) {
        if (!P.list.includes(q) || !P.list.includes(p) || q.state !== 'meet') break;
        const other = who === p ? q : p;
        P.sayNear(who, text.replace('{b}', name(other)), 'say', 3, true);
        who.h.setExpression?.(/!|Ho ho|Ha ha/.test(text) ? 'happy' : 'smile', 2.5);
        const r2 = Math.random();
        if (/Ho ho|Ha ha|ha!/i.test(text)) who.h.gesture('laugh');
        else if (r2 < 0.35) who.h.gesture('talk');
        else if (r2 < 0.5) who.h.gesture('explain');
        if (Math.random() < 0.4) other.h.nod(0.45);
        yield P.wait(1.6 + text.length * 0.05);
      }
      p.h.nod(1); q.h.nod(1);
      yield P.wait(0.8);
      q.mtg && (q.mtg.done = true);
    } else {
      for (let t = 0; t < 40 && P.list.includes(q) && q.state === 'meet' && !p.mtg.done; t += 0.5) { if (P.list.includes(q)) P.faceTo(p, q.h.root.position); yield P.wait(0.5); }
      yield P.wait(0.4);
    }
    p.talkTo = null; p.mtg = null; p.a.mobile = true; p.face = null;
    p.h.clearGesture();
  },
};
export { SAY, MEET, SURNAMES, wpick };
