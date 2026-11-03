// game.staff: employees. Post job ads on the Inspired site (unlocked by shop level: staff:1, staff:2, staff:3), read the
// applicants' CVs as they trickle in over the in-game days, invite them (Pichat, the site, or by phone), interview them
// when they turn up at the shop, hire or turn them down (they remember either way), then manage your team: they come
// in for their shifts, do the job you gave them with the real systems (tasks.js), make the mistakes their stats and
// quirks make, get paid every Friday from the bank, get happier or fed up, ask for things, and quit if it gets bad.
//
//   staff.unlocked() / slots() / canHire()                     the level gates (src/data/unlocks.js staff:<n>)
//   staff.postAd({ role, wage, hours, pitch }) -> { ok, msg, ad }   staff.closeAd(id)   staff.ads()
//   staff.applicants(filter?) / applicant(id)                 profiles (src/staff/applicants.js)
//   staff.inviteTimes(p) -> [{ label, at }]   staff.invite(id, at) -> { ok, msg }   staff.reject(id)
//   staff.hire(id, { wage, role, hours }) -> { ok, msg }       staff.fire(id)   staff.raise(id, yen)   staff.promote(id)
//   staff.setRole(id, role) / setHours(id, hours) / setDayOff(id, weekday)
//   staff.list() -> hired records   staff.worker(id) -> Worker (present on shift or null)   staff.wageBill() -> this week
//   staff.morale(rec, delta, why)   staff.mem(id) (game.state.npcs memory)
// Events: 'applicant' { id }, 'staffHired' { id }, 'staffFired' { id }, 'staffQuit' { id }, 'staffPaid' { total, ok },
//         'staffMistake' { id, text }.
// Save: game.state.staff (ensureState): { ads, applicants, staff, former, seen, payDay, ... }.
import * as THREE from 'three';
import { ensureState } from '../game/stateExt.js';
import { laneMemory } from '../npc/memory.js';
import { formatYen } from '../core/util.js';
import { Worker } from './worker.js';
import { findJob, JOBS, idle, abortJob, postOf } from './tasks.js';
import { interviewScript, staffChat } from './chats.js';
import { makeApplicant, skillFor } from './applicants.js';
import { portraitCached, portraitLater } from './looks.js';
import { node } from './nav.js';
import { showCV, hideCV, showCard, showSlip } from './paper.js';
import { ROLES, HOURS, QUIRKS, SPECIAL_IDS, ARCHETYPES, inShift, WAGE_STD, AD_FEE, PAYDAY, MSG, BYE_LINES, WORK_LINES, WEEKDAY, shiftText, weekdayOf } from './data.js';
import './poses.js';

export const INSPIRED = 'http://www.inspired.ne.jp/';
const V = (x, z) => new THREE.Vector3(x, 0, z);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const yen = formatYen;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const DEFAULTS = { v: 1, seq: 1, made: 0, ads: [], applicants: [], staff: [], former: [], seen: {}, payDay: 0, notified: 0, guarded: 0, nightDay: 0, msg: {} };

export class Staff {
  constructor(game) {
    this.game = game;
    this.s = ensureState(game, 'staff', DEFAULTS);
    for (const k of ['ads', 'applicants', 'staff', 'former']) if (!Array.isArray(this.s[k])) this.s[k] = [];
    this.lm = laneMemory(game);
    this.group = new THREE.Group();
    this.group.name = 'staff';
    game.scene.add(this.group);
    this.workers = new Map();
    this.visitors = new Map();
    this.t = 0; this.checkT = 0;
    this.lastStamp = game.clock?.stamp ?? 0;
    this.replyHooked = new Set();
    const ev = game.events;
    ev.on('newDay', (e) => this.onNewDay(e?.day ?? game.clock?.day ?? 1, !!e?.skipped));
    ev.on('levelUp', () => setTimeout(() => this.checkUnlock(), 2500));
    ev.on('slap', (e) => this.onSlap(e));
    game.calendar?.addSource((day) => this.calendarEntries(day));
    for (const r of this.s.staff) r.today ||= {};
  }

  // ------------------------------------------------------------------ small helpers
  mem(id) { return this.lm.person(id); }
  quirkFx(q) { return QUIRKS[q]?.fx || {}; }
  fx(r) { const o = {}; for (const q of r.quirks || []) Object.assign(o, this.quirkFx(q)); return o; }
  roleName(role) { return ROLES[role]?.name || 'helper'; }
  get stamp() { return this.game.clock?.stamp ?? 0; }
  get day() { return this.game.clock?.day ?? 1; }
  unlocked() { return !this.game.progress || this.game.progress.unlocked('staff:1'); }
  /** How many people the shop can employ at its level (staff:1, staff:2, staff:3 in src/data/unlocks.js). */
  slots() {
    const P = this.game.progress;
    if (!P) return 3;
    let n = 0;
    for (let i = 1; i <= 3; i++) if (P.unlocked(`staff:${i}`)) n = i; else break;
    return n;
  }
  canHire() { return this.unlocked() && this.s.staff.length < this.slots(); }
  list() { return this.s.staff; }
  rec(id) { return this.s.staff.find((r) => r.id === id) || null; }
  applicant(id) { return this.s.applicants.find((p) => p.id === id) || null; }
  applicants(filter = null) { return filter ? this.s.applicants.filter(filter) : this.s.applicants; }
  ads() { return this.s.ads; }
  adFor(p) { return this.s.ads.find((a) => a.id === p.ad) || null; }
  worker(id) { const w = this.workers.get(id); return w?.npc ? w : null; }
  /** Hours left in someone's shift today (0 when off). */
  shiftLeft(r) {
    const s = HOURS[r.hours] || HOURS.day, h = this.game.clock?.hours ?? 12;
    if (!inShift(r.hours, h)) return 0;
    return ((s.to - h) + 24) % 24;
  }
  /** Is it their shift right now (their day, not their day off, not sick, started)? */
  onShift(r, h = this.game.clock?.hours ?? 12) {
    const g = this.game;
    if (!g.story?.done && !g.state.story?.complete) return false;
    if ((r.start || 0) > this.day) return false;
    if (r.arriveAfter && this.stamp < r.arriveAfter) return false; // just hired: gone to get changed
    // a night shift that started yesterday still counts as yesterday's
    const s = HOURS[r.hours] || HOURS.day;
    const d = s.from > s.to && h < s.to ? this.day - 1 : this.day;
    const wd = weekdayOf(d);
    if (wd === r.dayOff || (r.offDays || []).includes(d)) return false;
    return inShift(r.hours, h);
  }

  // ------------------------------------------------------------------ the job site side
  checkUnlock() {
    const g = this.game, os = g.os;
    const n = this.slots();
    if (!this.unlocked() || n <= (this.s.notified || 0)) return;
    const first = !this.s.notified;
    this.s.notified = n;
    const web = os?.st?.web;
    if (web?.bookmarks && !web.bookmarks.some(([, u]) => u.includes('inspired.ne.jp'))) web.bookmarks.push(['Inspired (jobs)', INSPIRED]);
    if (os?.power === 'on') os.renderIcons?.();
    if (first) {
      os?.mail?.send({
        from: 'Inspired', addr: 'hello@inspired.ne.jp', subject: 'Your shop can now hire staff!', kind: 'staff',
        body: `Dear shopkeeper,\n\nCongratulations: your shop has grown enough for an Inspired employer account (free!). Post a job ad, and applicants from Morio-cho (and further afield) will start sending you their CVs within hours.\n\n  ${INSPIRED}\n\nRestockers, cleaners, cashiers, coin collectors, courier runners, night guards: whoever you need. Interview them at your shop, hire the best, and let them do the work.\n\nInspired - the job site that inspires. (Mostly.)`,
      });
      this.inspiredThread()?.post({ text: `Hi! This is the Inspired job site. Your shop is now big enough to hire a part-timer. Post your first ad at ${INSPIRED}`, delay: 4 });
      g.news?.('You can hire staff now!', 'Inspired: the job site link is in your mail and on the PC desktop', 7000);
    } else {
      os?.mail?.send({ from: 'Inspired', addr: 'hello@inspired.ne.jp', subject: `Room for ${n} staff now`, kind: 'staff', body: `Your shop can now employ ${n} people at once. Post another ad on ${INSPIRED} whenever you're ready.\n\nInspired` });
    }
  }
  inspiredThread() {
    const M = this.game.os?.messenger;
    if (!M) return null;
    const t = M.thread({ id: 'inspired', name: 'Inspired Jobs', avatar: { bg: 0xffb84a, hair: 'short', hairCol: 0x2a2428, shirt: 0x1f6a6a, mouth: 'grin' }, kind: 'supplier', about: 'The job site that inspires. (Mostly.)' });
    if (!this.replyHooked.has('inspired')) {
      this.replyHooked.add('inspired');
      // the bot's buttons: "inv:<id>:<stamp>" invite them for that time, "no:<id>" turn them down
      t.onReply((v) => {
        const [k, id, n] = String(v).split(':');
        const p = this.applicant(id);
        if (!p) return;
        if (k === 'inv') { const at = +n; const r = at > this.stamp + 5 ? this.invite(id, at) : { msg: 'That time has passed: pick another one on the site.' }; t.post({ text: r.ok ? `Done! ${r.msg}` : r.msg, delay: 2 }); }
        if (k === 'no') { this.reject(id); t.post({ text: `${p.given} has been told, politely.`, delay: 2 }); }
      });
    }
    return t;
  }
  /** The Inspired bot tells you about a new CV on Pichat, with buttons to invite them or turn them down. */
  announce(p) {
    const t = this.inspiredThread();
    if (!t) return;
    const times = this.inviteTimes(p).slice(0, 2);
    t.post({ text: `New CV: ${p.name} (${p.age > 120 ? p.age + '?!' : p.age}) wants to be your ${ROLES[p.role]?.name}. Asks ${yen(p.want)}/h. "${p.blurb}" Full CV: ${INSPIRED}cv/${p.id}`, choices: [...times.map((x) => ({ label: `Invite: ${x.label}`, value: `inv:${p.id}:${Math.round(x.at)}` })), { label: 'Not interested', value: `no:${p.id}` }], sound: false });
  }
  /** Someone you turned down (or who waited in vain) applies again. They remember you. */
  reapply(p, ad) {
    p.status = 'new'; p.ad = ad.id; p.role = ad.role; p.applied = this.stamp; p.again = (p.again || 0) + 1;
    ad.n++;
    this.game.os?.notify?.({ app: 'browser', title: 'Inspired: they applied again', body: `${p.name} is giving it another try (${ROLES[ad.role].name})`, icon: 'os_inspired', news: true, onClick: () => this.game.os.browser?.open(`${INSPIRED}cv/${p.id}`) });
    this.announce(p);
  }

  postAd({ role = 'restock', wage = WAGE_STD, hours = 'day', pitch = '' } = {}) {
    const g = this.game;
    if (!this.unlocked()) return { ok: false, msg: `Employer accounts open at shop level ${g.progress?.levelFor('staff:1') ?? 10}` };
    if (!ROLES[role]) return { ok: false, msg: 'Pick a job' };
    if (this.s.ads.filter((a) => a.open).length >= 3) return { ok: false, msg: 'You already have 3 ads running' };
    const pay = g.sim?.payDigital ? g.sim.payDigital(AD_FEE, 'Inspired job ad') : g.spend(AD_FEE, 'Inspired job ad');
    if (!pay) return { ok: false, msg: `The listing fee is ${yen(AD_FEE)}: not enough in the bank` };
    wage = clamp(Math.round(wage / 10) * 10, 100, 3000);
    const now = this.stamp;
    const ad = { id: `ad${this.s.seq++}`, role, wage, hours: HOURS[hours] ? hours : 'day', pitch: String(pitch || '').slice(0, 140), posted: now, until: now + 5 * 1440, next: now + rnd(25, 70) / this.wageFactor(wage), n: 0, open: true };
    this.s.ads.unshift(ad);
    if (this.s.ads.length > 12) this.s.ads.length = 12;
    g.events.emit('staffAd', { ad });
    g.save?.();
    return { ok: true, msg: `Your ad for a ${ROLES[role].name} is live! Applicants usually reply within a few hours.`, ad };
  }
  closeAd(id) { const a = this.s.ads.find((x) => x.id === id); if (a) { a.open = false; this.game.save?.(); } return !!a; }
  wageFactor(w) { return clamp((w / WAGE_STD) ** 1.4, 0.45, 2.2); }

  /** New applicants arrive over time while an ad is open (more of them for a better wage). */
  tickAds() {
    const now = this.stamp, h = this.game.clock?.hours ?? 12;
    for (const ad of this.s.ads) {
      if (!ad.open) continue;
      if (now >= ad.until) { ad.open = false; this.game.os?.notify?.({ app: 'browser', title: 'Inspired: ad expired', body: `Your ${ROLES[ad.role]?.name} ad has ended (${ad.n} applicant${ad.n === 1 ? '' : 's'})`, icon: 'os_inspired' }); continue; }
      if (now < ad.next) continue;
      ad.next = now + rnd(70, 260) / this.wageFactor(ad.wage);
      const waiting = this.s.applicants.filter((p) => p.status === 'new' || p.status === 'invited').length;
      if (ad.n >= 12 || waiting >= 9) continue;
      // applicants write during waking hours (except the ghost, who writes at 2 a.m.)
      if (h < 7 || h >= 23) {
        const busy = this.s.applicants.some((p) => p.arch === 'ghost' && ['new', 'invited', 'hired'].includes(p.status)) || this.s.staff.some((r) => r.arch === 'ghost');
        if (!busy && Math.random() < 0.2) this.newApplicant(ad, 'ghost');
        continue;
      }
      // now and then someone you turned down (or stood up) tries again
      const again = this.s.applicants.find((p) => ['rejected', 'stoodup'].includes(p.status) && this.day - Math.floor((p.applied || 0) / 1440) >= 2 && p.role === ad.role);
      if (again && Math.random() < 0.15) { this.reapply(again, ad); continue; }
      this.newApplicant(ad);
    }
  }

  /** Someone applies to an ad. arch forces an archetype ('kappa', 'local'...). */
  newApplicant(ad, arch = null) {
    const g = this.game, S = this.s;
    if (!arch) {
      const pending = new Set(S.applicants.filter((p) => ['new', 'invited', 'hired'].includes(p.status)).map((p) => p.arch));
      for (const r of S.staff) pending.add(r.arch);
      if (!S.seen.kappa && S.made >= 1) arch = 'kappa'; // the second applicant ever is a kappa
      else if (Math.random() < 0.32) {
        const fresh = SPECIAL_IDS.filter((id) => !S.seen[id] && !pending.has(id));
        const any = SPECIAL_IDS.filter((id) => !pending.has(id));
        arch = pick(fresh.length ? fresh : any.length ? any : ['local']);
        if (arch === 'ghost' && !['evening', 'night'].includes(ad.hours) && Math.random() < 0.5) arch = 'local';
      } else arch = 'local';
    }
    const seed = (Math.random() * 1e9) >>> 0;
    const p = makeApplicant(seed, { arch: arch === 'local' ? null : arch, role: ad.role, wage: ad.wage });
    p.id = `st${S.seq++}`;
    p.status = 'new';
    p.ad = ad.id; p.role = ad.role; p.hours = p.nightOnly && !['evening', 'night'].includes(ad.hours) ? 'night' : ad.hours;
    p.applied = this.stamp;
    S.applicants.unshift(p);
    // keep the list tidy: old turned-down and gone applicants drop off
    const old = S.applicants.filter((x) => ['rejected', 'stoodup', 'withdrawn'].includes(x.status));
    if (S.applicants.length > 30 && old.length) S.applicants.splice(S.applicants.indexOf(old[old.length - 1]), 1);
    S.seen[p.arch] = true;
    S.made++;
    ad.n++;
    g.os?.notify?.({ app: 'browser', title: 'Inspired: new applicant', body: `${p.name}, ${p.arch === 'kappa' ? 'age ' + p.age + ' (!)' : p.age}: wants to be your ${ROLES[ad.role].name}`, icon: 'os_inspired', news: true, onClick: () => g.os.browser?.open(`${INSPIRED}cv/${p.id}`) });
    this.announce(p);
    g.events.emit('applicant', { id: p.id });
    g.save?.();
    return p;
  }

  /** When an applicant can come in: within the hour (if it's daytime), tomorrow morning / afternoon / evening. */
  inviteTimes(p) {
    const c = this.game.clock, now = this.stamp, day = c?.day ?? 1, h = c?.hours ?? 12;
    const at = (d, hh) => (d - 1) * 1440 + hh * 60;
    const out = [];
    if (p.nightOnly) {
      if (h < 20.5) out.push({ label: 'Tonight, 21:00', at: at(day, 21) });
      out.push({ label: 'Tomorrow night, 20:00', at: at(day + 1, 20) }, { label: 'Tomorrow night, 22:00', at: at(day + 1, 22) });
      return out;
    }
    if (h >= 8 && h < 18.5) out.push({ label: 'Today, in an hour', at: Math.ceil((now + 60) / 10) * 10 });
    if (h < 15) out.push({ label: 'Today, 16:00', at: at(day, 16) });
    out.push({ label: 'Tomorrow, 10:00', at: at(day + 1, 10) }, { label: 'Tomorrow, 15:00', at: at(day + 1, 15) });
    return out.slice(0, 3);
  }

  invite(id, at, via = 'site') {
    const p = this.applicant(id), g = this.game;
    if (!p) return { ok: false, msg: 'No such applicant' };
    if (!['new', 'interviewed', 'invited'].includes(p.status)) return { ok: false, msg: `${p.given} isn't looking any more` };
    p.status = 'invited';
    p.at = at;
    // the unreliable ones turn up late
    p.lateBy = (p.stats.reliability <= 2 && Math.random() < 0.7) ? rnd(20, 55) : p.quirks?.includes('punctual') || p.arch === 'salaryman' ? -20 : rnd(-10, 8);
    const when = this.when(at);
    const t = this.thread(p);
    if (t && via !== 'phone') {
      t.post({ from: 'me', text: `Hello ${p.given}! Thanks for applying. Could you come to Gacha Garage for an interview, ${when}?` });
      const yes = { kappa: `Yes! I will come ${when}. I will bring my own water.`, tanuki: `Ho ho! ${cap(when)}! I'll bring my best suit (it is the only suit).`, salaryman: `Thank you very much. I will be there ${when}. I will arrive 20 minutes early.`, gyaru: `omg yesss!! ${when} ok!! see u!!`, robokid: `YES!! ${when}! Can I see inside a machine?!`, student: `ok. ${when}. i will set three alarms`, ninja: `${cap(when)}. Understood. You will not see me arrive.`, ghost: `${cap(when)}... I will come... from the well... (I mean the bus.)` }[p.arch] || pick([`Thank you! I'll be there ${when}!`, `Great, see you ${when}!`, `Yes! ${cap(when)} works for me.`]);
      t.post({ text: yes, delay: rnd(4, 12) });
    }
    g.save?.();
    return { ok: true, msg: `${p.given} will come to the shop ${when}.` };
  }
  when(at) {
    const day = Math.floor(at / 1440) + 1, m = at % 1440, hh = String(Math.floor(m / 60)).padStart(2, '0'), mm = String(Math.floor(m % 60)).padStart(2, '0');
    const d = day - this.day;
    return `${d <= 0 ? 'today' : d === 1 ? 'tomorrow' : 'on ' + WEEKDAY[weekdayOf(day)]} at ${hh}:${mm}`;
  }

  /** Their Pichat conversation (created when you first contact them). */
  thread(p) {
    const M = this.game.os?.messenger;
    if (!M) return null;
    const id = 'staff:' + p.id;
    // the 3D portrait when it's ready (rendered a frame later, so a burst of messages never hitches)
    let avatar = portraitCached(p.look, { size: 32 });
    if (!avatar) portraitLater(this.game, p.look, (u) => { if (u) M.thread({ id, avatar: u }); }, { size: 32, bg: 0xe8dcc0 });
    const t = M.thread({ id, name: p.name, avatar: avatar || { bg: 0xe8dcc0, shirt: 0x3f86e8 }, kind: 'npc', about: p.status === 'hired' ? `${ROLES[p.role]?.name} at Gacha Garage` : `Applied on Inspired: ${ROLES[p.role]?.name}` });
    if (!this.replyHooked.has(id)) {
      this.replyHooked.add(id);
      t.onReply((v) => this.onReply(p.id, v));
    }
    return t;
  }
  /** Their number in the phone book: call them to invite them (or to check on them). */
  registerPhone(p) {
    const ph = this.game.os?.phone;
    if (!ph?.register || !p?.phone) return;
    const self = this;
    ph.register(p.phone, {
      name: p.name, listed: false, about: `Applicant (${ROLES[p.role]?.name})`,
      async onCall(call) {
        const cur = self.applicant(p.id) || self.rec(p.id);
        if (!cur) { await call.say('The number you have dialled is not in service.'); return; }
        if (cur.status === 'hired') { await call.say(`Hello? Oh, boss! ${cur.arch === 'gyaru' ? 'Omg is everything okay?!' : 'Is everything okay at the shop?'}`); await call.say('See you on my next shift!'); return; }
        if (!['new', 'interviewed', 'invited'].includes(cur.status)) { await call.say(pick(['Hello? ...Oh. It\'s you. I found another job, thanks.', '...(Click.)'])); return; }
        await call.say({ kappa: 'Moshi moshi... (gurgle) Kappa speaking.', ghost: '...Hello... (The line is very cold.)', ninja: '...', gyaru: 'Moshi moshiii?', tanuki: 'Ho ho! Ponpoko Trading, how may I help?' }[cur.arch] || `Hello, ${cur.family} speaking.`);
        const times = self.inviteTimes(cur);
        const v = await call.ask('Oh! The gacha shop! About the job? When should I come in?', [...times.map((t, i) => ({ label: t.label, value: i })), { label: 'Never mind, sorry.', value: -1 }]);
        if (v === null || v === -1 || v === undefined) { await call.say('Oh. Okay. Bye then!'); return; }
        const r = self.invite(cur.id, times[v].at, 'phone');
        await call.say(r.ok ? `Great! I'll be there ${self.when(times[v].at)}. Thank you!` : r.msg);
      },
    });
  }
  onReply(id, v) {
    const p = this.applicant(id) || this.rec(id);
    if (!p) return;
    const t = this.thread(p);
    if (v === 'hire_yes') { const r = this.hire(id); t?.post({ text: r.ok ? (p.arch === 'gyaru' ? 'YAAAY!! see u at work!!' : 'Thank you so much! See you on my first shift!') : r.msg, delay: 3 }); }
    if (v === 'hire_no') { this.reject(id); }
  }

  reject(id) {
    const p = this.applicant(id), g = this.game;
    if (!p) return false;
    const was = p.status;
    p.status = 'rejected';
    const m = this.mem(p.id);
    m.flags.rejected = true;
    m.rel = clamp((m.rel || 0) - 1, -10, 10);
    if (was === 'invited' || was === 'interviewed' || g.os?.st?.msgr?.threads?.['staff:' + p.id]) {
      const t = this.thread(p);
      t?.post({ from: 'me', text: `Sorry ${p.given}, we've decided to go with someone else. Thank you for applying.` });
      t?.post({ text: { kappa: 'I understand. I will go and sit in the river for a while.', tanuki: 'Ho ho! No hard feelings! (There are some hard feelings.)', gyaru: 'ugh whatever. ur loss', salaryman: 'Thank you for considering me. I will continue to apply elsewhere. (Bow.)', ghost: '...always one short...' }[p.arch] || pick(['Okay. Thanks for letting me know.', 'That\'s a shame. Good luck!', 'Oh well. Thanks anyway.']), delay: rnd(5, 15) });
    }
    const v = this.visitors.get(id);
    if (v) this.sendHome(v);
    g.save?.();
    return true;
  }

  // ------------------------------------------------------------------ hiring and managing
  hire(id, { wage, role, hours } = {}) {
    const g = this.game, p = this.applicant(id);
    if (!p) return { ok: false, msg: 'No such applicant' };
    if (p.status === 'hired') return { ok: false, msg: 'Already on the team' };
    if (!this.canHire()) return { ok: false, msg: this.unlocked() ? `No room for more staff yet (shop level ${g.progress?.levelFor(`staff:${this.s.staff.length + 1}`) ?? '?'})` : 'Not unlocked yet' };
    const ad = this.adFor(p);
    p.status = 'hired';
    const h = g.clock?.hours ?? 12;
    const r = {
      ...structuredClone(p), status: 'hired',
      role: ROLES[role] ? role : p.role || p.fav || 'restock',
      wage: Math.round(wage || ad?.wage || p.want || WAGE_STD),
      hours: HOURS[hours] ? hours : p.hours || 'day',
      hired: this.day, morale: clamp(62 + (p.stats.charm - 3) * 3 - (p.wageGrump || 0) * 60, 30, 85),
      hoursWeek: 0, owed: 0, title: null, done: {}, today: {}, log: [], dish: 1, offDays: [], request: null, praised: 0,
    };
    if (r.nightOnly && !['evening', 'night'].includes(r.hours)) r.hours = 'night';
    // starts now if there's enough of today's shift left, else tomorrow
    const s = HOURS[r.hours];
    const left = inShift(r.hours, h) ? ((s.to - h) + 24) % 24 : 0;
    r.start = left >= 1.5 || (!inShift(r.hours, h) && h < s.from) ? this.day : this.day + 1;
    if (r.start === this.day && this.visitors.get(id)) r.arriveAfter = this.stamp + 45;
    this.s.staff.push(r);
    const m = this.mem(r.id);
    m.flags.hired = true;
    this.lm.meet(r.id);
    if (ad && this.s.staff.length >= this.slots()) ad.open = false;
    // the visitor goes to "get changed" (and comes back in the shop's apron at shift time)
    const v = this.visitors.get(id);
    if (v) this.sendHome(v, r.start === this.day ? 'I\'ll go get my things! Back in a bit!' : null);
    const t = this.thread(r);
    t?.post({ text: r.start === this.day ? `I'm on my way to get changed. Back soon for my first shift!` : `Thank you! See you tomorrow for my first shift (${shiftText(r.hours)})!`, delay: rnd(6, 14) });
    this.codex(r);
    g.events.emit('staffHired', { id: r.id });
    const A = g.os?.achievements;
    A?.unlock?.('staff_first');
    if (r.arch === 'kappa') A?.unlock?.('staff_kappa');
    if (r.arch !== 'local' && this.s.staff.filter((x) => x.arch !== 'local').length >= 2) A?.unlock?.('staff_weird');
    this.card(r, 'Welcome to the team!');
    g.news?.(`${r.given} joins the team!`, `${ROLES[r.role].name} · ${shiftText(r.hours)} · ${yen(r.wage)}/h${r.start > this.day ? ' · starts tomorrow' : ''}`, 6000);
    g.save?.();
    return { ok: true, msg: `${r.name} is hired as your ${ROLES[r.role].name}.` };
  }

  setRole(id, role) { const r = this.rec(id); if (!r || !ROLES[role]) return false; const before = skillFor(r, r.role); r.role = role; const after = skillFor(r, role); this.morale(r, Math.round((after - before) * 12), 'role'); const w = this.workers.get(id); if (w?.npc) { abortJob(w); } this.card(r, 'New assignment'); this.game.save?.(); return true; }
  setHours(id, hours) { const r = this.rec(id); if (!r || !HOURS[hours]) return false; if (r.nightOnly && !['evening', 'night'].includes(hours)) return false; r.hours = hours; if (!r.hoursOK?.includes(hours)) this.morale(r, -6, 'hours'); this.card(r, 'New hours'); this.game.save?.(); return true; }
  /** The kraft staff card (in the world; at the PC the rota shows it instead). */
  card(r, head) { const g = this.game; if (g.pc?.active) return; const show = () => { if (g.talk?.active) { setTimeout(show, 500); return; } showCard(g, r, head); }; setTimeout(show, 300); }
  setDayOff(id, wd) { const r = this.rec(id); if (!r) return false; r.dayOff = clamp(wd | 0, 0, 6); this.game.save?.(); return true; }
  raise(id, n) { const r = this.rec(id); if (!r) return false; r.wage += n; this.morale(r, n >= 100 ? 18 : 10, 'raise'); r.log.push({ t: this.stamp, text: `Raise: now ${yen(r.wage)}/h` }); this.game.save?.(); return true; }
  promote(id) {
    const r = this.rec(id);
    if (!r || r.title) return false;
    r.title = r.arch === 'salaryman' ? 'Deputy Section Chief' : 'Shift leader';
    r.wage += 100;
    r.stats.reliability = clamp(r.stats.reliability + 1, 1, 5);
    this.morale(r, 20, 'promoted');
    this.game.os?.achievements?.unlock?.('staff_promote');
    this.codex(r);
    this.game.save?.();
    return true;
  }
  /** Mood 0..100: up with praise, raises and pay on time; down with unpaid wages, slaps and jobs they hate. */
  morale(r, d, why = '') {
    if (!r) return;
    r.morale = clamp((r.morale ?? 60) + d, 0, 100);
    if (why && Math.abs(d) >= 5) (r.moodLog ||= []).push({ t: this.stamp, d, why }), r.moodLog.length > 12 && r.moodLog.shift();
  }

  fire(id, { scene = true } = {}) {
    const g = this.game, r = this.rec(id);
    if (!r) return false;
    this.s.staff.splice(this.s.staff.indexOf(r), 1);
    this.s.former.unshift({ id: r.id, name: r.name, arch: r.arch, role: r.role, left: this.day, why: 'fired', days: this.day - r.hired });
    if (this.s.former.length > 20) this.s.former.length = 20;
    const p = this.applicant(id);
    if (p) p.status = 'former';
    const m = this.mem(id);
    m.flags.fired = true;
    // wages still owed are paid on the way out
    this.settle(r);
    const w = this.workers.get(id);
    if (w?.npc && scene) { abortJob(w); this.sadExit(w); } // (sadExit drops them from this.workers at the lane's end)
    else { if (w?.npc) { abortJob(w); w.despawn(); } this.workers.delete(id); }
    const t = this.thread(r);
    t?.post({ text: { kappa: 'Thank you for everything. If you ever need a cucumber, come to the river.', tanuki: 'Ho ho... Take care, boss. Business is business. Here\'s a parting gift. (It\'s a leaf.)', salaryman: 'Thank you for having me. It was an honour. (Bow.)', gyaru: 'whatever. it was fun tho. bye', ghost: '...I will still count your capsules. From afar.', ninja: '...', robokid: 'Bye boss. Say bye to machine No.1 for me.', student: 'thanks for the job. going to sleep for a week now' }[r.arch] || 'Thank you for the job. Take care.', delay: rnd(40, 90) });
    g.events.emit('staffFired', { id });
    g.os?.achievements?.unlock?.('staff_fired');
    g.save?.();
    return true;
  }

  /** They take their things and walk out, slowly (a cardboard box in their arms). */
  sadExit(w) {
    const n = w.npc;
    n.expr('sad', 8);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.26), new THREE.MeshStandardMaterial({ color: 0xc89a5f, roughness: 0.95 }));
    box.geometry.translate(0, 0.1, 0);
    w.carry(box);
    w.state = 'leaving';
    const side = (w.rec.seed || 1) % 2 ? 1 : -1;
    const self = this;
    w.run((function* () {
      yield w.wait(1.2);
      const exit = V(side * 14, 6.6);
      const sp = w.speed;
      w.npc.speed = sp * 0.55;
      const pts = w.goTo(exit);
      w.npc.walkSpeed = sp * 0.55;
      yield pts;
      w.despawn();
      self.workers.delete(w.id);
    })());
  }

  /** Pay what's owed now (leaving the job). */
  settle(r) {
    const amt = Math.round(((r.hoursWeek || 0) * r.wage + (r.owed || 0)) / 10) * 10;
    if (amt <= 0) return;
    const g = this.game;
    const ok = g.sim?.payDigital ? g.sim.payDigital(amt, `Wages: ${r.name} (final)`) : g.spend(amt);
    if (ok) { r.hoursWeek = 0; r.owed = 0; }
  }

  /** What this week's wages come to so far (and the next payday). */
  wageBill() {
    let total = 0;
    for (const r of this.s.staff) total += (r.hoursWeek || 0) * r.wage + (r.owed || 0);
    const day = this.day, wd = weekdayOf(day);
    const until = (PAYDAY - wd + 7) % 7 || 7;
    return { total: Math.round(total / 10) * 10, payday: day + until, inDays: until };
  }

  // ------------------------------------------------------------------ the day / night
  onNewDay(day, skipped) {
    if (!this.s.staff.length) { this.nightCheck(day); return; }
    // Friday: wages from the bank
    const wd = weekdayOf(day);
    if (wd === PAYDAY && this.s.payDay !== day) this.payday(day);
    for (const r of [...this.s.staff]) {
      r.today = {};
      r.offDays = (r.offDays || []).filter((d) => d >= day - 1);
      // drift toward how they feel about the job: the pay, the work, the boss
      const skill = skillFor(r, r.role);
      const target = clamp(55 + (r.wage / Math.max(100, r.want) - 1) * 90 + (skill - 0.5) * 30 + (r.title ? 8 : 0) - (r.owed > 0 ? 30 : 0) - (r.request?.denied ? 6 : 0), 5, 95);
      r.morale = clamp((r.morale ?? 60) + (target - (r.morale ?? 60)) * 0.18 + rnd(-3, 3), 0, 100);
      // asking for something now and then
      if (!r.request && Math.random() < 0.16) r.request = this.makeRequest(r);
      // sick days, lateness messages
      const sick = Math.random() < (r.stats.reliability <= 2 ? 0.06 : 0.025);
      if (sick && !skipped) { r.offDays.push(day); this.thread(r)?.post({ text: { kappa: 'My dish dried out overnight. I am too weak to come in today. Sorry.', tanuki: 'Ho... ho... Ate too much. Taking today off. Sorry!', gyaru: 'sooo sick today... cant come in sry!!', student: 'cant come. slept through yesterday AND today somehow', ghost: 'The moon is wrong tonight. I cannot come. Sorry.' }[r.arch] || pick(['Sorry boss, I have a fever. Can\'t come in today.', 'Family emergency, I can\'t make it today. Sorry!']), delay: rnd(10, 40) }); }
      // fed up: they quit
      if (r.morale < 12 || (r.morale < 22 && Math.random() < 0.35)) this.quit(r);
    }
    this.nightCheck(day);
  }

  payday(day) {
    const g = this.game;
    this.s.payDay = day;
    let total = 0, short = 0;
    const rows = [];
    for (const r of this.s.staff) {
      const due = Math.round(((r.hoursWeek || 0) * r.wage + (r.owed || 0)) / 10) * 10;
      if (due <= 0) continue;
      const ok = g.sim?.payDigital ? g.sim.payDigital(due, `Wages: ${r.name}`) : g.spend(due);
      rows.push({ name: r.name, hours: r.hoursWeek || 0, wage: r.wage, amount: due, paid: ok });
      if (ok) { total += due; r.owed = 0; r.hoursWeek = 0; this.morale(r, 6, 'paid'); r.log.push({ t: this.stamp, text: `Paid ${yen(due)}` }); }
      else { short += due; r.owed = due; r.hoursWeek = 0; this.morale(r, -22, 'unpaid'); this.thread(r)?.post({ text: pick(['Um, boss? My wages didn\'t come through this week...', 'Payday was today... and nothing arrived. Is everything okay?']), delay: rnd(30, 90) }); }
    }
    if (total || short) {
      g.os?.mail?.send({ from: 'Gacha Garage payroll', addr: 'payroll@capsule.ne.jp', subject: short ? 'Wages: NOT all paid!' : `Wages paid: ${yen(total)}`, kind: 'staff', body: short ? `Payday: ${yen(total)} paid, ${yen(short)} could not be paid (not enough in the bank). It will be tried again every morning. Unpaid staff are unhappy staff.` : `This week's wages, ${yen(total)}, were paid from your bank account.\n\n${this.s.staff.map((r) => `${r.name}: ${yen(r.wage)}/h`).join('\n')}` });
      g.events.emit('staffPaid', { total, short, ok: !short });
      // the wage slip (once you're not in a cutscene / asleep)
      const date = g.calendar?.format?.(day) || `Day ${day}`;
      let tries = 0;
      const slip = () => { if (g.cutscene?.active || g.pc?.active || g.talk?.active) { if (tries++ < 120) setTimeout(slip, 1000); return; } showSlip(g, rows, { total, short, date }); };
      setTimeout(slip, 1500);
    }
  }

  quit(r) {
    const g = this.game;
    const w = this.workers.get(r.id);
    this.s.staff.splice(this.s.staff.indexOf(r), 1);
    this.s.former.unshift({ id: r.id, name: r.name, arch: r.arch, role: r.role, left: this.day, why: 'quit', days: this.day - r.hired });
    const p = this.applicant(r.id);
    if (p) p.status = 'former';
    this.mem(r.id).flags.quit = true;
    this.settle(r);
    if (w?.npc) { abortJob(w); this.sadExit(w); } else this.workers.delete(r.id);
    const why = r.owed > 0 ? 'You didn\'t pay me.' : r.morale < 15 ? 'I\'m just not happy here.' : 'It\'s time for something new.';
    g.os?.mail?.send({ from: r.name, addr: `${r.given.toLowerCase()}@capsule.ne.jp`, subject: 'My resignation', kind: 'staff', body: `Dear boss,\n\nI'm sorry, but I am quitting, effective today. ${why}\n\n${r.arch === 'kappa' ? 'The river is calling.' : r.arch === 'tanuki' ? 'Business is business. Ho ho.' : 'Thank you for the chance.'}\n\n${r.name}` });
    g.news?.(`${r.given} quit`, why, 6500);
    g.events.emit('staffQuit', { id: r.id });
    g.save?.();
  }

  /** A night without a guard: sometimes someone shakes a machine (a capsule goes missing) or scribbles on the shutter. */
  nightCheck(day) {
    const g = this.game, S = this.s;
    if (S.nightDay === day) return;
    S.nightDay = day;
    if (!this.unlocked() || !g.story?.done) return;
    const guard = S.staff.find((r) => r.role === 'guard' && ['night', 'evening'].includes(r.hours));
    if (guard && S.guarded >= day - 1) {
      this.thread(guard)?.post({ text: pick(MSG.report), delay: rnd(30, 120) });
      return;
    }
    if (Math.random() > 0.08) return;
    const ms = (g.machines || []).filter((m) => m.data.stock.length > 2);
    if (!ms.length) return;
    const m = pick(ms);
    m.takeCapsule?.();
    m.updateSoldOut?.();
    g.tweens?.wait(8, () => g.news?.(`Someone shook machine No.${(m.data.slot || 0) + 1} last night`, 'A capsule is missing. A night guard would keep an eye on the shop', 7000));
  }

  makeRequest(r) {
    const A = {
      kappa: { kind: 'bucket', ask: 'Could we keep a bucket of water by the machines? For... emergencies. Dish emergencies.', yes: 'Kyuu! Thank you! Emergency water!', no: 'I see. I will just... dry, then.' },
      tanuki: { kind: 'sake', cost: 1200, ask: 'Boss, a little bottle of sake on the shelf brings luck! Business luck! Shall I buy one? (¥1,200)', yes: 'Ho ho! Fortune smiles on us!', no: 'Ho... no luck for us then.' },
      gyaru: { kind: 'charger', ask: 'Can I charge my phone in the back? It\'s, like, totally for work.', yes: 'Yay! Best boss!', no: 'Ugh. Fine. 12 percent battery. I\'ll suffer.' },
      student: { kind: 'nap', ask: 'Could I have a 20-minute nap break? Science says naps make you better at work.', yes: 'Science thanks you. Goodnight.', no: '...Okay. (Yawn.) Okay.' },
      ninja: { kind: 'roof', ask: 'May I have a key to the roof? For... normal reasons. Normal man reasons.', yes: 'Excellent. You will not regret this. You will not even notice.', no: 'Understood. I will use the drainpipe.' },
      ghost: { kind: 'incense', cost: 300, ask: 'Could you light a little incense for me now and then? It helps me... stay. (¥300)', yes: 'Thank you... it smells like home. Like a temple. Like a well.', no: '...I see. I will fade a little, then.' },
      salaryman: { kind: 'title', ask: 'Might I have a title on my name tag? Something like "Deputy Section Chief"? Only if it is no trouble.', yes: '(He bows nine times.) I will wear it with honour.', no: 'Of course. I overstepped. (Bow.)' },
      robokid: { kind: 'robot', ask: 'Can I bring my robot to work? He can greet customers! He can say "WELCOME"! Mostly "WELC".', yes: 'YES! He\'ll be so happy! He can\'t be happy. But still!', no: 'Aww. Okay. He\'ll stay home and charge.' },
    };
    const local = [
      { kind: 'dayoff', ask: `Could I have tomorrow off? My ${pick(['cousin\'s wedding', 'grandma\'s birthday', 'dentist appointment', 'little brother\'s sports day'])}.`, yes: 'Thank you so much!', no: 'Oh. Okay. I\'ll... figure something out.' },
      r.wage < r.want + 100 ? { kind: 'raise', amount: 50, ask: `I\'ve been working hard... could I get a raise? Just ${yen(50)} an hour more?`, yes: 'Really? Thank you!', no: 'Oh. Okay. I understand.' } : null,
      { kind: 'radio', ask: 'Could we have the radio on while we work? Enka hour is on.', yes: 'Yay! Enka!', no: 'Silence it is, then.' },
    ].filter(Boolean);
    const q = A[r.arch] && Math.random() < 0.6 ? A[r.arch] : pick(local);
    return { ...q, day: this.day };
  }
  grant(r, req) {
    r.request = null;
    this.morale(r, req.kind === 'raise' ? 12 : 9, 'request granted');
    if (req.kind === 'dayoff') r.offDays.push(this.day + 1);
    if (req.kind === 'raise') r.wage += req.amount || 50;
    if (req.kind === 'title') r.title = 'Deputy Section Chief';
    (r.perks ||= []).push(req.kind);
    this.mem(r.id).notes.push({ t: this.stamp, text: `you said yes: ${req.kind}` });
    this.game.save?.();
  }
  deny(r, req) { r.request = null; this.morale(r, -7, 'request denied'); this.mem(r.id).notes.push({ t: this.stamp, text: `you said no: ${req.kind}` }); this.game.save?.(); }

  /** A mistake someone made (shown as a toast, kept in their log). */
  mistake(w, text, sub = '') {
    const r = w.rec;
    r.mistakes = (r.mistakes || 0) + 1;
    w.log(`Oops: ${text}`);
    this.game.news?.(`${r.given}: ${text}`, sub, 6000);
    this.game.events.emit('staffMistake', { id: r.id, text });
    if (r.quirks?.includes('leaves') && /leaves/.test(text)) this.game.os?.achievements?.unlock?.('staff_leaves');
  }
  notifyOnce(w, key, title, body) {
    const k = `${w.id}:${key}:${this.day}`;
    if (this.s.msg[k]) return;
    this.s.msg[k] = 1;
    this.game.news?.(title, body, 6000);
  }

  calendarEntries(day) {
    const out = [];
    if (this.s.staff.length && weekdayOf(day) === PAYDAY) out.push({ id: 'payday', name: 'Payday (staff wages)', kind: 'bill', note: `about ${yen(this.wageBill().total)}`, quiet: true });
    for (const p of this.s.applicants) if (p.status === 'invited' && Math.floor(p.at / 1440) + 1 === day) out.push({ id: 'iv:' + p.id, name: `Interview: ${p.name}`, kind: 'event', note: this.when(p.at).replace(/^.* at /, '') });
    return out;
  }

  codex(r) {
    const C = this.game.os?.codex;
    if (!C) return;
    const look2d = { bg: 0xf0d8c0, hair: r.arch === 'ghost' || r.sex === 'f' ? 'long' : r.arch === 'tanuki' ? 'short' : 'short', hairCol: r.arch === 'kappa' ? 0x2a4a2a : r.arch === 'gyaru' ? 0xd8b878 : r.arch === 'salaryman' ? 0xb0aca6 : 0x2a2428, shirt: 0xb02c34, skin: r.arch === 'gyaru' || r.arch === 'tanuki' ? 'tan' : 'fair', mouth: 'grin', glasses: r.look?.o?.glasses ? 0x2a2428 : null, cap: r.arch === 'tanuki', capCol: 0xd6b470 };
    C.person({ id: r.id, name: r.name, role: `${r.title ? r.title + ', ' : ''}${ROLES[r.role]?.name} (staff)`, look: look2d, desc: `${r.blurb} Hired on day ${r.hired}. ${QUIRKS[r.quirks?.[0]]?.desc || ''}`, met: () => true });
  }

  // ------------------------------------------------------------------ interviews: the applicant comes to the shop
  tickVisits() {
    const now = this.stamp;
    for (const p of this.s.applicants) {
      if (p.status !== 'invited' || !p.at) continue;
      const v = this.visitors.get(p.id);
      const arrive = p.at + (p.lateBy || 0) - 18;
      if (!v && now >= arrive && now < p.at + 150) this.comeIn(p);
      else if (!v && now >= p.at + 150) this.stoodUp(p);
      else if (v && now >= p.at + 150 && !v.npc?.talkLock) this.stoodUp(p);
    }
  }
  comeIn(p) {
    const g = this.game;
    const w = new Worker(this, p, { visitor: true });
    const side = p.seed % 2 ? 1 : -1;
    w.spawn(V(side * 13, 6.6), side > 0 ? -Math.PI / 2 : Math.PI / 2);
    w.state = 'coming';
    this.visitors.set(p.id, w);
    const inside = (g.garage?.shutterOpen ?? 1) > 0.5;
    const wait = inside ? V(1.25, 2.9) : V(0.9, 6.9);
    w.run((function* () {
      yield w.goTo(wait, inside ? Math.PI * 0.9 : Math.PI);
      w.state = 'waiting';
      w.npc.look = 'player';
      g.news?.(`${p.given} is here for the interview`, `${inside ? 'Waiting in the shop' : 'Waiting at your shutter'} · click them to start`, 7000);
      for (;;) {
        yield w.wait(rnd(9, 16));
        if (w.npc.playerDist < 9 && Math.random() < 0.5) w.say(pick({ kappa: ['(Drip.)', 'Is there a tap nearby?'], tanuki: ['Ho ho. Nice place.', 'Pon.'], gyaru: ['Hellooo?', '(Texting.)'], student: ['(Yawn.)'], ninja: ['...'], ghost: ['...one... two...'] }[p.arch] || ['Hello?', 'I\'m here for the interview!', 'Um, excuse me?']), { dur: 2.2 });
      }
    })());
  }
  stoodUp(p) {
    if (p.status !== 'invited') return;
    p.status = 'stoodup';
    const m = this.mem(p.id);
    m.flags.stoodUp = true;
    m.rel = clamp((m.rel || 0) - 2, -10, 10);
    this.thread(p)?.post({ text: { kappa: 'I waited. My dish dried out. Nobody came.', tanuki: 'Ho... ho. I waited two hours. My time is money, you know. Real money!', gyaru: 'umm hello?? i waited forever??', salaryman: 'I waited for two hours. Perhaps I had the wrong day. My apologies. (Bow.)', ghost: '...I waited. I am good at waiting. Still. It hurt.' }[p.arch] || pick(['I waited, but nobody came to interview me...', 'I came at the time you said. Nobody was there?']), delay: rnd(10, 30) });
    const v = this.visitors.get(p.id);
    if (v) this.sendHome(v, pick(['I guess nobody\'s coming...', 'Well. I tried.']));
    this.game.save?.();
  }
  /** A visitor leaves (after the interview, or after waiting too long). */
  sendHome(v, line = null) {
    if (!v.npc) { this.visitors.delete(v.id); return; }
    const side = (v.rec.seed || 1) % 2 ? 1 : -1;
    const self = this;
    v.state = 'leaving';
    v.npc.look = null;
    v.run((function* () {
      yield v.wait(0.8);
      if (line) v.say(line, { dur: 3 });
      if (v.rec.arch === 'ninja') { v.puff(); v.despawn(); self.visitors.delete(v.id); return; }
      yield v.goTo(V(side * 14, 6.6));
      v.despawn();
      self.visitors.delete(v.id);
    })());
  }

  async clicked(w) {
    const g = this.game;
    if (!g.talk || g.talk.active || w.npc?.busy) return;
    if (w.visitor) {
      if (w.state !== 'waiting' && w.state !== 'coming') return;
      const p = w.rec;
      w.stopJob();
      this.lm.meet(p.id);
      showCV(g, p);
      let res = null;
      try { res = await g.talk.start(w.npc, interviewScript(this, w), { id: p.id, name: p.name, color: p.color }); } finally { hideCV(); }
      if (!this.applicant(p.id)) return;
      if (res?.hire) { p.status = 'interviewed'; this.hire(p.id, { wage: res.wage }); const r = this.rec(p.id); if (r) this.morale(r, Math.round((res.score || 0) * 3), 'a good interview'); }
      else if (res?.reject) this.reject(p.id);
      else {
        p.status = 'interviewed';
        p.wageOffered = res?.wage || null;
        this.sendHome(w, res === 'left' ? 'Oh. Okay. Bye then?' : null);
        // you can decide later on the site or on Pichat
        this.thread(p)?.post({ text: res?.later ? 'Thanks for the interview! Let me know what you decide.' : 'Um. Did the interview go okay?', delay: rnd(20, 60), choices: [{ label: 'You\'re hired!', value: 'hire_yes' }, { label: 'Sorry, not this time.', value: 'hire_no' }] });
      }
      g.save?.();
      return;
    }
    const r = this.rec(w.id);
    if (!r) return;
    const res = await g.talk.start(w.npc, staffChat(this, w), { id: r.id, name: r.name, color: r.color });
    if (res?.fire) this.fire(r.id);
    g.save?.();
  }

  onSlap({ human }) {
    if (!human) return;
    for (const [id, w] of [...this.workers, ...this.visitors]) {
      if (w.h !== human) continue;
      const g = this.game, n = w.npc;
      n.gesture('cower'); n.expr('angry', 3);
      try { g.effects.mark({ sprite: 'anger', pos: n.h.headTop(new THREE.Vector3()), color: 0xe5383b, life: 1.6, size: 0.05 }); } catch { /* */ }
      const m = this.mem(id);
      m.slaps = (m.slaps || 0) + 1;
      m.rel = clamp((m.rel || 0) - 3, -10, 10);
      this.lm.gossip('slap', { who: w.rec.name, id });
      if (w.visitor) {
        setTimeout(() => w.say(pick(['You SLAPPED me?! In an INTERVIEW?!', 'I\'m reporting this to Inspired!']), { dur: 3, style: 'shout', always: true }), 150);
        const p = this.applicant(id);
        if (p) { p.status = 'withdrawn'; this.sendHome(w); }
      } else {
        const r = this.rec(id);
        this.morale(r, -28, 'slapped');
        setTimeout(() => w.say(pick({ kappa: ['KYUU! My dish!'], tanuki: ['OW! Ho... ho...?'], salaryman: ['...I apologise. (Why is HE apologising?)'], gyaru: ['EXCUSE ME?! I\'m calling the labour office!'], ninja: ['(He caught your hand. Then let it go. Then pretended he didn\'t.)'], ghost: ['...Your hand went through me. Please don\'t.'] }[r?.arch] || ['OW! Boss?!', 'What was THAT for?!', 'Hey! I\'m working here!']), { dur: 3, style: 'shout', always: true }), 150);
        if (r && r.arch === 'kappa') { r.dish = Math.max(0, (r.dish ?? 1) - 0.5); w.h?.staffRig?.setDish?.(r.dish); }
      }
      return;
    }
  }

  // ------------------------------------------------------------------ per frame
  update(dt) {
    const g = this.game;
    this.t += dt;
    for (const w of this.workers.values()) w.update(dt);
    for (const v of this.visitors.values()) v.update(dt);
    if ((this.checkT -= dt) > 0) return;
    this.checkT = 0.5;
    const now = this.stamp, dm = Math.max(0, Math.min(120, now - this.lastStamp));
    this.lastStamp = now;
    if (!this.s.notified && this.unlocked()) this.checkUnlock();
    this.tickAds();
    this.tickVisits();
    const frozen = g.cutscene?.active || g.timeStop?.frozen;
    for (const r of this.s.staff) {
      let w = this.workers.get(r.id);
      if (!w) { w = new Worker(this, r); this.workers.set(r.id, w); }
      w.rec = r;
      const should = this.onShift(r);
      if (should && w.state === 'off' && !frozen) this.startShift(w);
      else if (!should && (w.state === 'working' || w.state === 'coming')) this.endShift(w);
      if (!w.npc) continue;
      // paid hours (the clock only runs while you're playing)
      if (w.state === 'working' || w.state === 'coming') r.hoursWeek = (r.hoursWeek || 0) + dm / 60;
      // the kappa's dish dries while he works (slower with a bucket by the machines)
      if (r.quirks?.includes('dish')) {
        r.dish = clamp((r.dish ?? 1) - dm / ((r.perks || []).includes('bucket') ? 300 : 170), 0, 1);
        w.h?.staffRig?.setDish?.(r.dish);
        if (r.dish < 0.3 && !w.saidDry && w.npc.playerDist < 10) { w.saidDry = true; w.say(pick(['My dish... it\'s drying... so weak...', 'Kyuu... need... water...']), { dur: 3 }); }
        if (r.dish > 0.5) w.saidDry = false;
      }
      if (w.state === 'working' && !w.gen && !frozen && !w.npc.busy) this.nextJob(w);
      // a grumpy face for a grumpy worker
      if (w.state === 'working' && r.morale < 25 && Math.random() < 0.02) w.npc.expr('sad', 4);
    }
    // workers of people no longer on the team
    for (const [id, w] of this.workers) if (!this.rec(id) && w.state !== 'leaving') { w.despawn(); this.workers.delete(id); }
  }

  startShift(w) {
    const r = w.rec;
    // the late ones turn up late (and say so)
    if (this.fx(r).late && !w.lateRolled) { w.lateRolled = true; w.lateUntil = this.stamp + rnd(10, 35); }
    if (w.lateUntil && this.stamp < w.lateUntil) return;
    w.lateRolled = false; w.lateUntil = 0;
    const side = (r.seed || 1) % 2 ? 1 : -1;
    w.spawn(V(side * 13, 6.6), side > 0 ? -Math.PI / 2 : Math.PI / 2);
    w.npc.speed = w.speed;
    if (r.arch === 'ninja') { const [post, yaw] = postOf(r.role); w.blinkTo(post, yaw); }
    w.state = 'coming';
    const [post, yaw] = postOf(r.role);
    const g = this.game, self = this;
    w.run((function* () {
      const closed = !self.shutterOpen() && !r.quirks?.includes('ghost') && r.role !== 'guard';
      yield closed ? w.goTo(V(0.4 + ((r.seed || 1) % 3 - 1) * 0.7, 6.9), Math.PI) : w.goTo(post, yaw);
      w.state = 'working';
      if (w.npc.playerDist < 10) w.say(pick(r.arch === 'salaryman' ? ['Good morning. (Bow.) Reporting for duty.'] : r.arch === 'ghost' ? ['Good evening... I am here...'] : r.arch === 'gyaru' ? ['Morning!! Ugh, so early!!'] : ['Morning, boss!', 'Hi! Starting my shift!', 'Hello! What\'s first?', 'Good morning!']), { dur: 2.6 });
      w.log(`Started a shift (${shiftText(r.hours)})`);
      self.game.events.emit('staffShift', { id: r.id, on: true });
      void g;
    })());
  }

  endShift(w) {
    const r = w.rec, self = this;
    abortJob(w);
    w.state = 'leaving';
    const side = (r.seed || 1) % 2 ? 1 : -1;
    w.run((function* () {
      yield w.wait(0.5);
      if (w.npc.playerDist < 12) w.say(pick(BYE_LINES[r.arch] || BYE_LINES.local), { dur: 2.6 });
      if (r.arch === 'ninja') { w.puff(); w.despawn(); return; }
      // shutter already down: out through the gap at the side door (they're simply gone at the door)
      if (w.inside && !self.shutterOpen() && !r.quirks?.includes('ghost')) { yield w.goTo(node('door')); w.log('Went home'); w.despawn(); return; }
      yield w.goTo(V(side * 13, 6.6));
      w.log('Went home');
      w.despawn();
      self.game.events.emit('staffShift', { id: r.id, on: false });
    })());
  }

  shutterOpen() { return (this.game.garage?.shutterOpen ?? 1) > 0.5; }

  nextJob(w) {
    const r = w.rec, st = r.stats || {};
    // a slacker takes long breaks; anyone fed up drags their feet
    if ((w.nextAt || 0) > w.time) return;
    // the shutter's still down: wait at the shop front (a ghost just drifts through; the guard patrols outside)
    if (!this.shutterOpen() && !w.inside && !r.quirks?.includes('ghost') && r.role !== 'guard') {
      const front = V(0.4 + ((r.seed || 1) % 3 - 1) * 0.7, 6.9);
      w.job = null;
      w.mood = { label: 'waiting for the shutter' };
      w.run((function* () {
        if (w.npc.distTo(front) > 0.4) yield w.goTo(front, Math.PI);
        if (w.npc.playerDist < 14 && Math.random() < 0.5) w.say(pick(['Boss? The shutter\'s still down!', 'Hellooo? Can I come in?', '(Knock knock.)']), { dur: 2.6 });
        yield w.wait(rnd(10, 18));
        w.mood = null;
      })());
      w.nextAt = w.time + 1;
      return;
    }
    const job = r.role === 'guard' ? (inShift('night', this.game.clock?.hours ?? 12) || inShift('evening', this.game.clock?.hours ?? 12) ? { kind: 'patrol', label: 'on patrol' } : findJob({ ...w, rec: { ...r, role: 'clean' }, staff: this, game: this.game, pos: w.pos, toldNoCartons: true })) : findJob(w);
    if (job && JOBS[job.kind]) {
      w.job = job;
      w.run(JOBS[job.kind](w, job));
      w.nextAt = w.time + (st.reliability <= 2 && Math.random() < 0.25 ? rnd(8, 20) : rnd(0.5, 2)) * (r.morale < 25 ? 2 : 1);
    } else {
      w.job = null;
      w.run(idle(w));
      if (Math.random() < 0.05) w.toldNoCartons = false;
      w.nextAt = w.time + rnd(0.5, 1.5);
    }
  }
}

const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
void ARCHETYPES; void WORK_LINES;
