// Talking to applicants and staff (game.talk cinematic chats, src/talk/Talk.js).
//   interviewScript(staff, w)   the interview: hello, opener, three rounds of questions you pick under a timer (with
//                               their procedural, in-character answers), a red-flag moment, the wage talk, the decision.
//                               Hired or rejected, they remember it (game.state.npcs.people[id]).
//   staffChat(staff, w)         chatting with someone at work: small talk that knows the day (sales, complaints,
//                               weather, rent day, gossip), their requests (a day off, a raise, a bucket of water for
//                               the kappa...), giving them a different job or hours, praise, a raise, a promotion, and
//                               letting them go (a sad scene).
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { formatYen } from '../core/util.js';
import { forecast } from '../os/apps/sites.js';
import { ROLES, HOURS, QUESTIONS, SPECIAL_Q, ANSWERS, LOCAL_ANSWERS, HELLO, HIRED, REJECTED, SMALL, WEEKDAY, PAYDAY, shiftText, weekdayOf } from './data.js';
import { skillFor } from './applicants.js';
import { leaves } from './tasks.js';
import './sfx.js';

const pick = (a) => (Array.isArray(a) ? a[Math.floor(Math.random() * a.length)] : a);
const yen = formatYen;
const sfx = (n, o = {}) => { try { audio.play(n, o); } catch { /* */ } };

/** Their answer to a question (by archetype, or by temperament for locals). */
function answerFor(r, qid) {
  const A = ANSWERS[r.arch];
  if (A) return pick(A[qid] ?? A._);
  const L = LOCAL_ANSWERS[qid];
  if (!L) return 'Hm. Good question.';
  const stat = { why: 'charm', exp: 'reliability', weak: 'reliability', money: 'honesty', rigged: 'honesty', cat: 'charm', weekend: 'reliability', gacha: 'charm' }[qid] || 'charm';
  return pick((r.stats?.[stat] ?? 3) >= 3 ? L.hi : L.lo);
}
/** How good an answer was (for the little rel / score tally): the stat behind the question, roughly. */
function answerScore(r, qid) {
  const stat = { why: 'charm', exp: 'reliability', weak: 'reliability', money: 'honesty', rigged: 'honesty', cat: 'charm', weekend: 'reliability', gacha: 'charm', special: 'charm' }[qid] || 'charm';
  return (r.stats?.[stat] ?? 3) - 3;
}

// ================================================================== the interview
export function interviewScript(staff, w) {
  const r = w.rec;
  return async (t) => {
    const g = t.game, mem = t.mem, npc = w.npc;
    const ended = () => t.session.ended;
    let score = 0;
    // they've been here before
    if (mem.flags.rejected) await t.say(pick(['We meet again. I have been practising since last time.', 'Hello again! I hope this time goes better.', 'Me again. Second chances, right?']), { gesture: 'wave' });
    else await t.say(pick(HELLO[r.arch] || HELLO.local), { gesture: r.arch === 'salaryman' || r.arch === 'kappa' ? 'bow' : 'wave' });
    if (r.arch === 'kappa') splash(g, w);
    if (r.arch === 'ninja') { w.puff(); }
    if (r.arch === 'ghost') { await t.wait(0.4); sfx('whoosh', { vol: 0.5 }); }
    if (ended()) return 'left';
    // opener
    const late = r.lateBy > 30;
    const op = await t.choose([
      'Thanks for coming. Tell me about yourself.',
      { text: late ? `You're ${Math.round(r.lateBy)} minutes late, you know.` : 'You found the place okay?' },
      { text: r.arch === 'local' ? 'So. Why gacha?' : r.arch === 'kappa' ? 'Do you need... a glass of water?' : r.arch === 'ghost' ? 'Is it me, or did it get cold in here?' : 'Interesting outfit.' },
    ], { time: 0 });
    if (op === 0) { await t.say(r.blurb); await t.say(`Before this: ${r.cv[0]}.`); }
    else if (op === 1) {
      if (late) { score += r.stats.reliability >= 3 ? 0 : -1; await t.say(r.arch === 'ghost' ? 'Time is... difficult for me.' : pick(['The train! It was the train. Mostly.', 'Sorry! I got lost. Then found. Then lost again.'])); }
      else await t.say(r.arch === 'ninja' ? 'I came over the roof. It was the fastest way.' : pick(['Yes! I used to come here as a kid.', 'I asked Mrs. Mikawa across the lane. She knew everything about you.']));
    } else {
      if (r.arch === 'kappa') { await t.say('Oh! You are kind. Yes please. Just... on the head.', { gesture: 'bow' }); splash(g, w); r.dish = 1; mem.flags.watered = true; score++; }
      else if (r.arch === 'ghost') await t.say('...Sorry. That happens. The cat hissed at me too.');
      else if (r.arch === 'local') await t.say(pick(['The little surprise every time. Like a present from the universe.', 'Honestly? I need the money. But also, they are SO cute.']));
      else await t.say(answerFor(r, 'special'));
    }
    if (ended()) return 'left';
    // three rounds of questions, under a timer
    const used = new Set();
    let special = !!SPECIAL_Q[r.arch];
    let flagShown = false;
    for (let round = 0; round < 3 && !ended(); round++) {
      const pool = QUESTIONS.filter((q) => !used.has(q.id));
      const opts = [];
      while (opts.length < 3 && pool.length) opts.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
      if (special && round === 1) { opts[2] = { id: 'special', text: SPECIAL_Q[r.arch] }; special = false; }
      const i = await t.choose(opts.map((q) => q.text), { time: 9, prompt: round === 0 ? 'Ask them something!' : '' });
      if (ended()) break;
      if (i < 0) { await t.say(pick(['...', 'Um. Should I just... keep talking?', 'Is this part of the test?'])); score -= 0.5; continue; }
      const q = opts[i];
      used.add(q.id);
      await t.say(answerFor(r, q.id), { gesture: q.id === 'special' && r.arch === 'salaryman' ? 'bow' : undefined });
      score += answerScore(r, q.id) * 0.5;
      if (q.id === 'special' && r.arch === 'tanuki') leaves(g, npc.pos, 5);
      // a red flag, halfway through
      if (!flagShown && round >= 1) { flagShown = true; await redFlag(t, w); if (ended()) break; }
      // your reaction
      const re = await t.choose(['Good answer.', 'Hmm.', 'Next question.'], { time: 5, timeout: 2 });
      if (re === 0) { t.effects({ rel: 1 }); await t.say(pick(['Thank you!', 'Phew.', 'Really? Great!']), { expr: 'happy' }); }
      else if (re === 1) await t.say(pick(['...Was that bad?', 'Hm? Hmmm.', 'I can explain.']), { expr: 'surprised' });
    }
    if (ended()) return 'left';
    // money
    const ad = staff.adFor(r);
    const offer = ad?.wage || r.want;
    let wage = offer;
    if (r.want > offer) {
      await t.say(`The ad said ${yen(offer)} an hour. I was hoping for ${yen(r.want)}...`);
      const mid = Math.round((offer + r.want) / 20) * 10;
      const wi = await t.choose([`${yen(offer)}. That's the offer.`, `Let's meet at ${yen(mid)}.`, `${yen(r.want)}. Deal.`], { time: 0 });
      wage = [offer, mid, r.want][wi < 0 ? 0 : wi];
      if (wi === 0) { await t.say(r.stats.charm >= 4 ? 'Hmm. Fine. For now!' : 'Okay. I understand.'); r.wageGrump = (r.want - offer) / r.want; }
      else await t.say(pick(['Deal!', 'Thank you!', 'That works.']), { expr: 'happy' });
    } else {
      await t.say(r.arch === 'ghost' ? `${yen(offer)}? For counting? That is more than Lord Aoyama ever paid. Which was nothing.` : `${yen(offer)} an hour is fine by me.`);
    }
    if (r.nightOnly) await t.say('Just so you know: nights only. Evenings at the earliest. The sun and I... do not get along.');
    // the decision
    const can = staff.canHire();
    const lv = g.progress?.levelFor?.(`staff:${staff.s.staff.length + 1}`);
    const d = await t.choose([
      can ? 'You\'re hired!' : `You're hired! (No room: shop level ${lv || '?'})`,
      'We\'ll let you know.',
      'Sorry, it\'s not a fit.',
    ], { time: 0 });
    if (ended()) return 'left';
    if (d === 0 && can) {
      await t.say(pick(HIRED[r.arch] || HIRED.local), { gesture: 'cheer', expr: 'happy' });
      if (r.arch === 'kappa') splash(g, w);
      if (r.arch === 'tanuki') leaves(g, npc.pos, 4);
      t.effects({ rel: 2, set: { hired: true }, remember: 'hired me at the gacha garage' });
      return { hire: true, wage };
    }
    if (d === 0) {
      await t.say('Oh! But... you don\'t have room for me yet? I\'ll wait. Call me when you do!', { expr: 'surprised' });
      t.effects({ set: { promised: true } });
      return { later: true, wage };
    }
    if (d === 1) { await t.say(pick(['Okay! I\'ll wait for your call.', 'Thank you for your time!', 'I\'ll keep my phone on. Always.']), { gesture: 'bow' }); return { later: true, wage }; }
    await t.say(pick(REJECTED[r.arch] || REJECTED.local), { expr: 'sad' });
    t.effects({ rel: -1, set: { rejected: true }, remember: 'turned me down for a job' });
    return { reject: true };
  };
}

/** The moment in an interview where you see who they really are. */
async function redFlag(t, w) {
  const r = w.rec, g = t.game;
  switch (r.arch) {
    case 'kappa':
      await t.say('(A drop of water runs down his face. He holds his head very, very still.)');
      splash(g, w);
      await t.say('Sorry. Could we hurry a little? It is getting dry.');
      return;
    case 'tanuki':
      leaves(g, w.npc.pos, 6);
      await t.say('(A furry, striped tail slips out of his jacket. He sits on it.) Ho ho. Ahem.');
      return;
    case 'salaryman':
      w.npc.gesture('bow');
      await t.say('(He bows. Then bows again, a little deeper. Then once more, for good measure.)');
      return;
    case 'gyaru': {
      sfx('keitai', { vol: 0.6 });
      w.npc.gesture('texting');
      await t.say('Oh my god, sorry, one sec. Moshi moshi? ...I\'m in an INTERVIEW. ...No YOU hang up. ...Okay bye, love you!');
      w.npc.clearGesture();
      const i = await t.choose(['Was that important?', 'Phones off at work.'], { time: 5, timeout: 0 });
      await t.say(i === 1 ? 'Totally! Off! (It is not off.)' : 'Super important. My friend\'s boyfriend\'s cousin is SO dramatic.');
      return;
    }
    case 'robokid': {
      const i = await t.choose(['Why are you holding a screwdriver?', 'Don\'t touch the machines.'], { time: 5, timeout: 1 });
      await t.say(i === 0 ? 'I just want to see the ratchet! Just a peek! Okay, maybe I already peeked. Machine No.1 has a lovely spring.' : 'I would never! (He slowly puts a screwdriver back in his pocket.)');
      return;
    }
    case 'student': {
      w.npc.gesture('doze');
      try { g.effects.mark({ sprite: 'zz', pos: w.npc.h.headTop(new THREE.Vector3()), color: 0xffffff, life: 2.4, size: 0.04 }); } catch { /* */ }
      await t.say('...and that\'s why the self is just... (They are asleep.)');
      const i = await t.choose(['Wake them up.', 'Let them sleep.'], { time: 6, timeout: 1 });
      if (i === 1) await t.wait(2.2);
      w.npc.clearGesture();
      await t.say(i === 0 ? 'Ah! Present! I\'m present.' : '...Mm? Did I get the job? Was I hired in my sleep?');
      return;
    }
    case 'ninja': {
      w.puff();
      await t.say('(He drops a smoke pellet. When it clears, he is standing exactly where he was.) That was a sneeze.');
      return;
    }
    case 'ghost':
      await t.say('(The lights flicker. Somewhere in the garage, Mikan growls.) ...Sorry. That was me.');
      return;
    default: {
      const s = r.stats;
      if (s.honesty <= 2) await t.say('(Their wallet falls open: it\'s stuffed with gacha capsules. Not yours. Probably.) Ha ha! Collector!');
      else if (s.reliability <= 2) await t.say('Sorry, what time is it? I have another interview after this. Two, actually. And a dentist.');
      else if (s.charm >= 4) await t.say('Can I just say: this shop has such a good feeling. My grandma would have loved it.');
      else await t.say(pick(['(They nervously straighten their collar. Then do it again.)', '(Their stomach growls loudly. They pretend it didn\'t.)']));
    }
  }
}

function splash(g, w) {
  try { g.effects.splash({ pos: w.npc.h.headTop(new THREE.Vector3()), color: 0x8ac8f0, count: 5, size: 0.05 }); } catch { /* */ }
}

// ================================================================== at work
/** What's going on today (for small talk). */
function dayContext(staff, w) {
  const g = staff.game, T = g.sim?.s?.today || {}, c = g.clock;
  const day = c?.day ?? 1;
  let weather = null;
  try { weather = forecast(g, day + 1)?.name || null; } catch { weather = null; }
  const empty = (g.machines || []).find((m) => !m.data.stock.length);
  return {
    customers: T.customers || 0, plays: T.plays || 0, complaints: T.complaints || 0, coins: T.coins || 0, hour: c?.hours ?? 12,
    rentSoon: (g.bills?.dueSoon?.(4) || []).some((b) => b.kind === 'rent'), weather,
    empty: empty ? (empty.data.slot || 0) + 1 : 0, dirty: (g.life?.dirt?.() || 0) > 0.2,
    payday: [PAYDAY - 1, PAYDAY].includes(weekdayOf(day)),
  };
}

/** Lane gossip they've heard (things you did that people talk about). */
function gossip(staff) {
  const G = staff.game.laneMemory?.state?.gossip || [];
  const e = G[G.length - 1 - Math.floor(Math.random() * Math.min(4, G.length))];
  if (!e) return null;
  const L = {
    slap: `People say you slapped ${e.who}. In the street. Is that... true?`, overpriced: 'A lady at the bus stop said our machines are getting pricey.',
    secret: 'Everyone\'s talking about the SECRET capsule you pulled!', sold: `${e.who} told everyone about the figure they bought here.`,
    prank: 'Gonta stuck a note on someone\'s back again. The kid is a menace.', yokai: `Someone saw a ${e.who} on the lane last night!`,
    complaint: 'A customer was grumbling outside earlier. Just so you know.', played: `${e.who} came in for a turn earlier. Regular now!`,
  };
  return L[e.kind] || null;
}

export function staffChat(staff, w) {
  const r = w.rec;
  return async (t) => {
    const g = t.game, mem = t.mem, day = g.clock?.day ?? 1;
    const ended = () => t.session.ended;
    const m = r.morale ?? 60;
    // hello, coloured by how they feel (and what they remember)
    if (mem.slaps > 0 && Math.random() < 0.5) await t.say(pick(['...You\'re not going to slap me again, are you?', '(They flinch a little.) Oh. It\'s you. Hi.']));
    else if (m < 25) await t.say(pick(['...What is it.', 'Yes, boss. (They don\'t look at you.)', 'Hi. Long day.']), { expr: 'sad' });
    else if (m > 75) await t.say(pick(['Boss! Hi!', 'Hey boss! Good to see you!', `Hi! I'm having a great ${g.clock?.hours < 12 ? 'morning' : 'day'}!`]), { expr: 'happy' });
    else await t.say(pick(['Hi boss.', 'Yes?', 'Need something?', 'Hello!']));
    if (w.rec.quirks?.includes('sleepy') && w.npc.h.currentGesture === 'doze') await t.say('...Huh?! I wasn\'t asleep! I was resting my eyes. Professionally.');
    for (let guard = 0; guard < 12 && !ended(); guard++) {
      const req = r.request;
      const opts = [
        { text: 'How\'s it going?', v: 'small' },
        req ? { text: 'You wanted to ask me something?', v: 'req' } : null,
        { text: 'About your job...', v: 'job' },
        r.praised !== day ? { text: 'Great work today!', v: 'praise' } : null,
        { text: 'About your pay...', v: 'pay' },
        r.quirks?.includes('dish') && (r.dish ?? 1) < 0.7 ? { text: 'Let me top up your dish.', v: 'dish' } : null,
        { text: 'We need to talk.', v: 'fire' },
        { text: 'That\'s all. Back to work!', v: 'bye' },
      ].filter(Boolean);
      const i = await t.choose(opts.map((o) => o.text), { time: 0 });
      if (i < 0 || ended()) break;
      const v = opts[i].v;
      if (v === 'bye') { await t.say(pick(['Okay!', 'Back to it!', 'Yes boss!', r.arch === 'salaryman' ? '(Bow.) Understood.' : 'On it!'])); break; }
      if (v === 'small') await smallTalk(t, staff, w);
      if (v === 'req') await request(t, staff, w);
      if (v === 'job') await jobTalk(t, staff, w);
      if (v === 'praise') {
        r.praised = day;
        staff.morale(r, 7, 'praised');
        mem.flags.praised = (mem.flags.praised || 0) + 1;
        await t.say(pick(r.arch === 'salaryman' ? ['(He bows very low.) In 38 years nobody said that to me.'] : r.arch === 'gyaru' ? ['I KNOW right?! I\'m amazing!'] : r.arch === 'kappa' ? ['Kyuu! (His dish wobbles happily.)'] : ['Thanks, boss!', 'Really? That means a lot.', 'Hehe. I try!']), { expr: 'happy', gesture: 'cheer' });
      }
      if (v === 'pay') { const out = await payTalk(t, staff, w); if (out === 'end') break; }
      if (v === 'dish') { r.dish = 1; w.h?.staffRig?.setDish?.(1); splash(g, w); staff.morale(r, 4, 'water'); await t.say(pick(['Ahh! Thank you! Full dish, full power!', 'Kyuu~! So refreshing!']), { expr: 'happy' }); }
      if (v === 'fire') { const out = await fireTalk(t, staff, w); if (out) return out; }
    }
    return null;
  };
}

async function smallTalk(t, staff, w) {
  const r = w.rec;
  const c = dayContext(staff, w);
  const lines = [];
  for (const fn of Object.values(SMALL)) { const l = fn(c); if (l) lines.push(pick(l)); }
  const gs = gossip(staff);
  if (gs) lines.push(gs);
  const today = r.today || {};
  if (today.restock) lines.push(`I put ${today.restock} capsules in the machines today. Click, click, click.`);
  if (today.swept) lines.push(`I swept up ${today.swept} empty capsules today. People just drop them!`);
  if (today.coins) lines.push(`I've emptied ${yen(today.coins)} out of the coin boxes so far.`);
  if (today.sold) lines.push(`Sold ${today.sold} figure${today.sold > 1 ? 's' : ''} today!`);
  if (today.greeted) lines.push(`I've said "irasshaimase" ${today.greeted} times today. My voice is going.`);
  if (today.packed) lines.push(`Packed ${today.packed} parcel${today.packed > 1 ? 's' : ''} for Gen-san today.`);
  // co-workers
  const other = staff.s.staff.find((o) => o.id !== r.id);
  if (other) lines.push(pick([`${other.given} is ${other.arch === 'kappa' ? 'asking for cucumbers again' : other.arch === 'tanuki' ? 'drumming on his belly again. It\'s catchy, though' : other.arch === 'gyaru' ? 'on the phone again' : 'nice. A bit weird. Nice, though'}.`, `Do you think ${other.given} likes me? Just wondering.`]));
  // their own life
  const own = { kappa: ['The river is low this week. I worry about my cousins.', 'I bowed to a pigeon this morning. It did not bow back. Rude.'], tanuki: ['Business is good! Ho ho! Your business, I mean. Mine too.', 'I saw a ¥10,000 note in the street! It was a leaf. One of mine, actually.'], gyaru: ['My friends think this job is SO cute. They want to come visit!', 'I got 99 points at karaoke last night!! Okay, 89.'], salaryman: ['My wife asked how my day was. Nobody has asked me that in 38 years.', 'I wore my good tie today. Did you notice? (Bow.)'], robokid: ['I\'m designing a robot that refills machines. It\'s called the Capsulator 3000!', 'My robot fell down the stairs again. He\'s okay. Mostly.'], student: ['I\'m writing an essay about the gacha machine. "Fate in a capsule." Deep, right?', 'I had a dream about this shop. I was working. Then I woke up and I was working.'], ninja: ['I saw a man in a bush with binoculars. We nodded to each other. Professional respect.', 'The rooftops of this lane are very good. I mean. I assume.'], ghost: ['The moon is lovely tonight. I counted the stars. Nine. Always nine.', 'A customer asked if I was cold. I am always cold.'] }[r.arch];
  if (own) lines.push(pick(own));
  else lines.push(pick([`Have you tried the ramen place? ${r.given}'s pick: the miso.`, `My ${pick(['mum', 'sister', 'neighbour', 'landlord'])} says hi. Well, she doesn't know you. But hi.`, `${r.hobby}. That's what I do on my day off. Just so you know.`]));
  // the neighbours (the lane's regulars, if you've met them)
  const met = (id) => !!staff.game.state.npcs?.met?.[id];
  const nb = [
    met('hatoda') && 'Mr. Hatoda introduced me to his pigeons. All six. By name. It took a while.',
    met('gonta') && 'That Gonta kid tried to sell me a rubber snake. Then he put it in my bag anyway.',
    met('yabuki') && 'There\'s a man in the bush across the lane. He waved at me. With binoculars.',
    met('josuke') && 'A tall guy with amazing hair came in. I said nothing about the hair. I think I survived.',
    met('rohan') && 'The manga artist sketched me while I worked. He said I had "an interesting face". Should I worry?',
    met('ota') && 'Mrs. Ota walked past and looked at the shutter like she was counting it.',
    met('kusaka') && 'Dr. Kusaka says our shop plant is "surviving". I think that was a compliment.',
    met('gomuzo') && 'A pirate in a straw hat asked if we sell meat. I said capsules. He looked so sad.',
  ].filter(Boolean);
  if (nb.length) lines.push(pick(nb));
  const mem = t.mem;
  if (mem.flags.deniedReq && Math.random() < 0.4) lines.push(pick(['I\'m still a bit sore about that day off, you know.', 'You know, I asked you for something once. Just saying.']));
  if ((r.morale ?? 60) < 30) lines.push(pick(['Honestly? I\'m not sure this job is for me.', 'Some days I wonder why I\'m here.']));
  const said = new Set();
  for (let k = 0; k < 2 && lines.length; k++) {
    const l = lines.splice(Math.floor(Math.random() * lines.length), 1)[0];
    if (said.has(l)) continue;
    said.add(l);
    await t.say(l);
  }
}

async function request(t, staff, w) {
  const r = w.rec, req = r.request, g = t.game;
  if (!req) return;
  await t.say(req.ask);
  const cost = req.cost || 0;
  const i = await t.choose([cost ? `Sure. (${yen(cost)})` : 'Sure, go ahead.', 'Sorry, no.'], { time: 0 });
  if (i === 0) {
    if (cost && !g.spend(cost, req.kind)) { await t.me('Ah... I\'m a bit short on cash right now.'); await t.say('Oh. That\'s okay. Maybe later.'); return; }
    staff.grant(r, req);
    await t.say(req.yes || 'Thank you so much!', { expr: 'happy', gesture: 'cheer' });
  } else {
    staff.deny(r, req);
    t.mem.flags.deniedReq = (t.mem.flags.deniedReq || 0) + 1;
    await t.say(req.no || 'Oh. Okay.', { expr: 'sad' });
  }
}

async function jobTalk(t, staff, w) {
  const r = w.rec;
  const i = await t.choose(['I want you on a different job.', 'Let\'s change your hours.', 'About your day off...', 'Never mind.'], { time: 0 });
  if (i === 0) {
    const ids = Object.keys(ROLES).filter((id) => id !== r.role);
    const k = await t.choose(ids.map((id) => ROLES[id].name), { time: 0 });
    if (k < 0) return;
    const role = ids[k];
    const sk = skillFor(r, role);
    staff.setRole(r.id, role);
    await t.say(sk > 0.7 ? pick([`${ROLES[role].name}? I'd love that!`, 'Ooh, that\'s my favourite!']) : sk < 0.35 ? pick([`${ROLES[role].name}...? I\'m not very good at that. But okay.`, 'Hmm. I\'ll try my best. No promises.']) : pick(['Okay, got it!', 'Sure thing.']), { expr: sk > 0.7 ? 'happy' : sk < 0.35 ? 'sad' : 'smile' });
    if (role === 'guard' && r.hours !== 'night' && r.hours !== 'evening') await t.say('Night guard... in the daytime? Shouldn\'t I work nights for that?');
  } else if (i === 1) {
    const ids = Object.keys(HOURS).filter((id) => id !== r.hours);
    const k = await t.choose(ids.map((id) => `${HOURS[id].name} (${shiftText(id)})`), { time: 0 });
    if (k < 0) return;
    const hid = ids[k];
    if (r.nightOnly && !['evening', 'night'].includes(hid)) { await t.say('I... cannot. The sun. We talked about this.'); return; }
    staff.setHours(r.id, hid);
    await t.say(r.hoursOK?.includes(hid) ? pick(['That works for me!', 'Okay!']) : pick(['Ugh, that\'s early for me... but okay.', 'That\'s going to be hard. I\'ll manage.']), { expr: r.hoursOK?.includes(hid) ? 'smile' : 'sad' });
  } else if (i === 2) {
    const k = await t.choose(WEEKDAY.map((d) => d), { time: 0 });
    if (k < 0) return;
    staff.setDayOff(r.id, k);
    await t.say(`${WEEKDAY[k]}s off. Got it!`);
  }
}

async function payTalk(t, staff, w) {
  const r = w.rec;
  const canPromote = !r.title && (staff.game.clock?.day ?? 1) - (r.hired || 1) >= 5;
  const opts = [`A raise: +${yen(50)} an hour.`, `A big raise: +${yen(100)} an hour.`, canPromote ? 'I\'m promoting you to shift leader.' : null, 'Never mind.'].filter(Boolean);
  const i = await t.choose(opts, { time: 0 });
  if (i < 0) return null;
  const o = opts[i];
  if (o.startsWith('A raise')) { staff.raise(r.id, 50); await t.say(pick(['Really?! Thank you!', 'Oh! Wow, thanks boss!']), { expr: 'happy', gesture: 'cheer' }); t.effects({ rel: 1, remember: 'gave me a raise' }); }
  else if (o.startsWith('A big')) { staff.raise(r.id, 100); await t.say(r.arch === 'tanuki' ? 'HO HO! Real money! Not leaves! ...I mean, wonderful!' : pick(['A BIG raise?! I... I don\'t know what to say!', 'You\'re the best boss ever!']), { expr: 'happy', gesture: 'cheer' }); t.effects({ rel: 2, remember: 'gave me a big raise' }); }
  else if (o.startsWith('I\'m promoting')) {
    staff.promote(r.id);
    await t.say(r.arch === 'salaryman' ? '(He bows so deeply his forehead touches the floor.) Shift leader. Shift. Leader. I must call my wife.' : r.arch === 'gyaru' ? 'LEADER?! I\'m texting EVERYONE.' : pick(['Shift leader? Me? I won\'t let you down!', 'Wow. A title! Can I get it on my name tag?']), { expr: 'happy', gesture: r.arch === 'salaryman' ? 'bow' : 'cheer' });
    t.effects({ rel: 2, remember: 'promoted me to shift leader' });
  }
  return null;
}

async function fireTalk(t, staff, w) {
  const r = w.rec;
  await t.say(pick(['...Is something wrong?', 'Uh oh. That sounds serious.', 'Is this about the thing? I can explain the thing.']), { expr: 'surprised' });
  const i = await t.choose(['I\'m sorry. I have to let you go.', 'Your work has been slipping. Do better.', 'Never mind. Keep it up.'], { time: 0 });
  if (i === 2 || i < 0) { await t.say('Phew. Okay.'); return null; }
  if (i === 1) { staff.morale(r, -10, 'warned'); r.warned = (r.warned || 0) + 1; await t.say(pick(['...I understand. I\'ll try harder.', 'Sorry, boss. It won\'t happen again.']), { expr: 'sad' }); t.effects({ rel: -1, remember: 'warned me about my work' }); return null; }
  // the sad scene
  const sad = {
    kappa: ['...I see. (He looks down. A single drop of water rolls off his dish.)', 'I will go back to the river. The river never fires anyone.'],
    tanuki: ['Ho... ho. Well. Every business has its seasons.', '(He takes off the apron and folds it very neatly. A leaf falls out of the pocket.)'],
    salaryman: ['...I understand. (He bows. He stays down for a long time.)', 'Thirty-eight years, and then this little garage. It was the best part. Thank you.'],
    gyaru: ['Wait, seriously? ...Okay. Whatever. It\'s fine. (It is not fine.)', '(She puts her phone away. For once.) ...I liked it here, you know.'],
    robokid: ['Oh. Okay. (His antenna droops.)', 'Can I... can I at least say goodbye to machine No.1?'],
    student: ['...Oh. Okay. I\'m awake now. Very awake.', 'I\'ll write an essay about this. "On endings."'],
    ninja: ['...Understood.', '(For the first time, he leaves through the door. Slowly. Like a normal man.)'],
    ghost: ['...Like the plates. Always one short. Always me.', '(The air gets very cold.) Goodbye... I will count you... in my thoughts...'],
  }[r.arch] || ['Oh. I... okay.', 'I really liked working here. Thanks for the chance, I guess.'];
  for (const l of sad) await t.say(l, { expr: 'sad' });
  const k = await t.choose(['I\'m sorry. Take care.', 'Thanks for everything.'], { time: 0 });
  await t.me(k === 1 ? 'Thank you for everything. Really.' : 'I\'m sorry. Take care of yourself.');
  t.effects({ rel: -3, set: { fired: true }, remember: 'let me go from the gacha garage' });
  return { fire: true };
}
