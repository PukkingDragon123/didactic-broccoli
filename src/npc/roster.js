// The cast of the lane: who they are, where they live, their day, what they say, their chats and their quests.
// Each entry is read by src/npc/Lane.js:
//   { id, name, role, color, look | build(), seed, voice (8-bit), tts (real voice), base (idle gesture), speed,
//     door: spot (their front door; they come out of it and go back in), spot: their usual place,
//     hours: [[from, to, 'spot' | 'wander' | 'home' | a custom act], ...] (a day by game.clock),
//     visit: chance to pop into your shop when idle, knock(lane, npc) -> a reason to come and knock on your shutter,
//     lines: { idle, near, visit, win, meh, home, slapped, slappedAgain, discover },
//     idle(lane, npc, dt) while at their spot, acts: { name: function* (npc) }, setup(lane, npc),
//     chat(lane, npc, { first }) -> a dialogue script (src/talk/Talk.js), quests: [SideQuests defs] }
// Original dialogue; a few affectionate nods to a certain bizarre adventure and a certain rubbery pirate.
import * as THREE from 'three';
import { BIZARRE } from '../people/bizarre.js';
import { audio } from '../core/audio.js';
import { GARAGE } from '../world/Garage.js';
import { SERIES_BY_ID, getItem } from '../data/series/index.js';
import { formatYen } from '../core/util.js';
import { MORE } from './roster2.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rnd = (a, b) => a + Math.random() * (b - a);
const V = (x, z) => new THREE.Vector3(x, 0, z);
const _v = new THREE.Vector3(), _w = new THREE.Vector3();

/** Places on the lane: [x, z, facing yaw]. Doors are the real front doors (behind the building line). */
export const SPOTS = {
  shutter: [0.4, 5.85, Math.PI],
  shopFront: [0.4, 7.0, Math.PI],
  rohanWall: [-5.45, 14.0, Math.PI + 0.25],
  rohanGate: [9.55, 6.05, 0.2],
  josuke: [1.6, 13.75, Math.PI - 0.55],
  okuyasu: [2.5, 13.55, Math.PI + 0.65],
  pigeons: [-19.6, 7.0, 0.25],
  pigeonFlock: [-19.2, 8.1],
  bush: [-20.6, 14.2, Math.PI],
  alleyA1: [-8.4, 14.0, Math.PI],
  pirate: [22.6, 14.15, Math.PI],
  garden: [21.8, 6.3, -0.4],
  kitsune: [10.55, -1.4, 0],
  kappa: [-24.2, 8.6, 1.2],
  tanuki: [22.05, 5.9, 0],
  kasa: [5.5, 9.6, 0],
  // front doors
  doorRohan: [10.55, -2.6, 0],
  doorJosuke: [1.5, 16.4, Math.PI],
  doorOkuyasu: [6.85, 15.8, Math.PI],
  doorHatoda: [-21.95, 2.2, 0],
  doorGonta: [19.95, 2.4, 0],
  doorKuro: [11.5, 18.2, Math.PI],
  doorGomu: [22.25, 15.4, Math.PI],
  doorYabuki: [-22.15, 16.1, Math.PI],
  doorKusaka: [23.0, 3.4, 0],
};

// ------------------------------------------------------------------ shared bits of conversation
const GOSSIP = {
  slap: (e) => [`I heard you slapped ${e.who}. Just... out of nowhere?`, `Is it true you go around slapping people? ${e.who} told everyone.`],
  overpriced: () => ['People say your machines are a bit pricey lately.', 'Word on the lane: the gacha garage got expensive.'],
  secret: () => ['Is it true? You pulled a SECRET one?!', 'Everybody\'s talking about your secret pull!'],
  sold: (e) => [`${e.who} says you drive a hard bargain.`, 'I hear you sell figures now. Fancy.'],
  prank: () => ['Gonta got you too, huh? That kid...', 'Did you really fall for the "kick me" note? Ha!'],
  yokai: (e) => [`You saw a ${e.who}? At night? ...You're joking, right?`, `A ${e.who}?! Don't say that so loud.`],
  complaint: () => ['A customer was grumbling about your shop on the way past.'],
};
/** One line about something you did that's going round the lane (each piece of gossip is told once per person). */
export function gossipLine(L, n) {
  const G = L.mem.state.gossip, d = L.game.clock?.day ?? 1;
  for (let i = G.length - 1; i >= 0; i--) {
    const e = G[i];
    if (d - e.day > 3 || e.id === n.id || !GOSSIP[e.kind]) continue;
    const k = 'g_' + e.t + e.kind;
    if (n.mem.flags[k]) continue;
    n.mem.flags[k] = true;
    if (e.kind === 'played' || (e.kind === 'yokai' && Math.random() < 0.3)) continue;
    return pick(GOSSIP[e.kind](e));
  }
  return null;
}
/** The first lines of any chat: hello (first time / again / after a slap) and a bit of gossip. */
export function opener(L, n, { first, hello, firstHello, slapped, night } = {}) {
  const m = n.mem, out = [];
  const d = n.def;
  if (first) out.push(...(firstHello || [`Oh? I don't think we've met. I'm ${n.name}.`]));
  else if (m.slaps && !m.flags.slapForgiven) {
    out.push(pick(slapped || d.lines?.remember || ["You slapped me, remember? I haven't forgotten."]));
    out.push({ choose: [{ text: "I'm sorry. Really.", rel: 1, set: { slapForgiven: true }, then: [pick(['...Fine. Apology accepted.', 'Hmph. Just don\'t do it again.'])] }, { text: 'You had it coming.', rel: -1, then: ['Unbelievable.'] }], time: 8, timeout: 1 });
  } else if (night && L.night) out.push(pick(night));
  else out.push(pick(hello || ['Hey.', 'Oh, hello.']));
  const gs = gossipLine(L, n);
  if (gs) out.push(gs);
  return out;
}
/** A generic chat for anyone without their own. */
export function greetingFor(L, n) { return { start: [...opener(L, n, {}), pick(n.def.lines?.idle || ['Nice day.']), { choose: [{ text: 'See you.' }] }] }; }

/** Is the player holding a figure of a series (or any of a list)? -> the held item or null */
export function heldFigure(g, series) {
  const it = g.held.item;
  if (!it || (it.kind !== 'toy' && it.kind !== 'packaged')) return null;
  const s = getItem(it.data.key)?.series;
  if (series && !(Array.isArray(series) ? series.includes(s) : s === series)) return null;
  return it;
}
/** Hand the held item over (it leaves your hands). */
export function giveHeld(g) { const it = g.held.item; if (!it) return null; g.held.consume?.(); try { audio.play('pickup', { vol: 0.6 }); } catch { /* */ } return it; }

// ------------------------------------------------------------------ Josuke & Okuyasu banter (from the earlier work)
const BANTER = [
  [['o', "Josuke! I'm starving!"], ['j', 'You just ate, Okuyasu.'], ['o', 'That was TEN MINUTES ago!']],
  [['o', "Hey, why's that guy always drawing?"], ['j', "Don't look at him. He'll put you in his manga."]],
  [['j', 'Heard the gacha garage is open again.'], ['o', 'Gacha? Is that a kind of bread?']],
  [['o', 'What if the capsules had food inside?'], ['j', "...They don't."], ['o', 'But what IF.']],
  [['j', 'That alley by Mikawa-ya gives me the creeps.'], ['o', 'Never look back, man. NEVER.']],
  [['o', 'Josuke, your hair looks extra great today!'], ['j', 'Heh. I know.']],
  [['o', "I'd buy every capsule if I had the money!"], ['j', 'You have thirty yen.'], ['o', 'Exactly! THIRTY yen!']],
  [['o', 'I had a dream I was a vending machine.'], ['j', '...Did you have any drinks?'], ['o', 'Only corn soup.']],
  [['j', 'That pirate guy ate my melon bread.'], ['o', 'He ate MY melon bread too! ...Wait, was it the same bread?']],
  [['o', 'The bush guy waved at me.'], ['j', 'Don\'t wave back. It encourages him.']],
];

// ------------------------------------------------------------------ the regulars
const ROHAN = {
  id: 'rohan', name: 'Rohan', role: 'Manga artist', stranger: 'the man with the sketchbook', color: '#4fd0a8',
  voice: { base: 236, duty: 0.125 }, tts: { pitch: 0.95, rate: 1.08 }, base: 'hold_book', speed: 1.2,
  door: 'doorRohan', spot: 'rohanWall',
  hours: [[10, 13, 'spot'], [13, 14.5, 'wander'], [14.5, 18, 'spot'], [18, 20.5, 'gate'], [20.5, 10, 'home']],
  visit: 0.18,
  lines: {
    idle: ['Hmm. The light on that roof is... acceptable.', 'No. No, no, no. Again.', 'That passer-by has a fascinating nose.', 'Reality is the best reference.', 'Deadline? What deadline.'],
    near: ["You're blocking my light.", "Don't move. Your silhouette is interesting.", '...What?', "Don't talk to me while I work."],
    visit: ['Let me see how these machines feel. For research.', 'Research. Not fun. Research.'],
    win: ['Hm! The paint on this one is actually good.', 'Interesting. VERY interesting.'],
    meh: ['A duplicate. How dull.', 'Tch.'],
    home: ['Back to the desk. Twenty pages by morning.', 'My ink is calling.'],
    slapped: ['...Did you just. SLAP. Kishibe Rohan?!', 'That expression! The sting! ...I need to draw this.'],
    slappedAgain: ['AGAIN?! I will put you in my manga as a VILLAIN.'],
    remember: ['You slapped me. I drew it. You look terrible in chapter 12.'],
    discover: ['Wait. Show me that.', 'That pose is anatomically impossible. I love it.', 'Hm. The paint on that one is lazy.'],
  },
  setup(L, n) { n.popT = rnd(80, 140); n.muttT = rnd(8, 16); n.nearT = 0; },
  idle(L, n, dt) {
    const g = L.game, pd = n.playerDist;
    if (n.h.currentGesture !== 'sketch' && !n.h.currentGesture?.startsWith('pose') && n.h.currentGesture !== 'flourish') n.gesture('sketch');
    n.look = pd < 9 ? 'player' : subjectFor(L, n);
    if ((n.muttT -= dt) <= 0) { n.muttT = rnd(16, 30); if (pd < 14) n.say(pick(n.def.lines.idle), { style: 'think' }); }
    if ((n.nearT -= dt) <= 0 && pd < 3) { n.nearT = 35; n.say(pick(n.def.lines.near)); }
    if (Math.random() < dt / 90 && pd < 12) { n.gesture(Math.random() < 0.5 ? 'flourish' : pick(BIZARRE)); if (pd < 8) L.menaceOver(n, 'go'); }
    if ((n.popT -= dt) <= 0) { n.popT = rnd(120, 220); if (canPop(L, n)) L.run(n, popup.call(L, n)); }
    void g;
  },
  acts: {
    *gate(n) {
      L_appear(this, n);
      yield this.goTo(n, 'rohanGate');
      n.gesture('arms_crossed');
      n.look = null;
    },
  },
  knock(L, n) {
    const q = L.game.sideQuests;
    if (!q || q.isActive('rohan_ref') || q.isDone('rohan_ref') || !L.mem.met('rohan') || L.mem.rel('rohan') < 0) return null;
    return { id: 'ref', call: 'You. Gacha person. Come out here.', sub: 'Rohan wants something', leave: 'Hmph. Busy, are we.', script: rohanQuestScript };
  },
  chat(L, n, { first }) {
    const q = L.game.sideQuests;
    if (n.knocking?.id === 'ref' || (!q?.isActive('rohan_ref') && !q?.isDone('rohan_ref') && (n.mem.talks || 0) >= 1 && Math.random() < 0.5)) return rohanQuestScript;
    if (q?.isActive('yokai_hunt') && q.stepIndex('yokai_hunt') === 1) return { start: ['Well? You saw them? Describe them. Every detail. The eyes. The smell.', { choose: [{ text: 'A kappa. It bowed to me.', then: ['It BOWED? Kappa etiquette... fascinating. FASCINATING.'] }, { text: 'An umbrella licked me.', then: ['...I am so jealous I could scream.'] }, { text: 'A fox asked me riddles.', then: ['Of course it did. Foxes are insufferable. Like editors.'] }], time: 8, timeout: 0 }, { advance: 'yokai_hunt', rel: 2, gesture: 'flourish' }, 'This is going in the manga. All of it.'] };
    if (q?.isActive('rohan_ref')) return { start: [{ if: () => rareOnDisplay(L.game), then: 'show', else: ['Well? Where is it? Something RARE. On a shelf. Where I can see it.', { choose: [{ text: 'Working on it!' }] }] }],
      show: [{ say: '...So this is your best one.', gesture: 'study' }, { wait: 1.2 }, '...', 'Hmph. It will do. The light catches the paint just so.', { advance: 'rohan_ref', rel: 2 }, 'Your shop will appear in chapter 14. Try not to be boring.'] };
    return { start: [
      ...opener(L, n, { first, firstHello: ['...Kishibe Rohan. Manga artist. You run the gacha garage.', "Don't introduce yourself. I already know your face. I've drawn it twice."], hello: ['Ah. The gacha person.', 'You again.', 'Hm. Your expression today is... average.'] }),
      { say: 'Answer me quickly. No thinking. The most frightening thing about running a capsule toy shop?', gesture: 'sketch' },
      { choose: [{ text: 'An empty machine.', set: { fear: 'empty' }, then: ['Hm. Practical. Boring, but true.'] }, { text: 'Kids with sticky hands.', set: { fear: 'sticky' }, rel: 1, then: ['HA! Now THAT is real. Good.'] }, { text: 'The secret figure never coming out.', set: { fear: 'secret' }, rel: 1, then: ['Hope and despair in a plastic egg. Yes... YES.'] }], time: 5, timeout: 'slow' },
      { choose: [{ text: 'Can I see your sketchbook?', then: [{ if: 'rel>=3', then: ['...Fine. One page.', { gesture: 'flourish' }, 'That is you. Yes, the nose is accurate.'], else: ['Absolutely not.'] }] }, { text: 'Why do you stare at people?', then: ['Reality is the best reference. Everything else is a copy of a copy.'] }, { text: 'Bye, Rohan.', then: ['Hmph.'] }] },
    ], slow: ['Too slow. You THOUGHT about it. Useless.', { rel: -1 }] };
  },
  quests: [{
    id: 'rohan_ref', title: 'Reference material', giver: 'rohan', giverName: 'Rohan', color: '#4fd0a8',
    steps: [
      { text: 'Display a rare (or better) figure', sub: 'On a shelf or an acrylic stand', check: (g) => rareOnDisplay(g) },
      { text: 'Show it to Rohan', sub: 'He sketches by the block wall across the lane', talk: 'rohan' },
    ],
    reward: { money: 3000, text: 'Your shop in his manga' },
  }, {
    id: 'yokai_hunt', title: 'Things that go bump', giver: 'rohan', giverName: 'Rohan', color: '#4fd0a8',
    steps: [
      { text: 'See two different yokai on the lane at night', sub: (g) => `${Object.keys(g.state.npcs?.yokai || {}).length}/2 · they come out after dark`, check: (g) => Object.keys(g.state.npcs?.yokai || {}).length >= 2 },
      { text: 'Tell Rohan everything', sub: 'He sketches by the block wall in the day', talk: 'rohan' },
    ],
    reward: { money: 4000, text: 'Reference material, paid in full' },
  }],
};
const rohanQuestScript = { start: [
  'I need reference. Real reference. A capsule figure, rare, the kind people would kill for.',
  'Put one on display in that garage of yours. Then show me. I will pay.',
  { choose: [{ text: 'Deal.', quest: 'rohan_ref', rel: 1, then: ['Good. Do not keep me waiting.'] }, { text: 'What do I get?', then: ['Money. And immortality in a weekly magazine. Obviously.', { quest: 'rohan_ref' }] }, { text: 'No.', rel: -1, then: ['...You will regret that. Probably in chapter 9.'] }] },
] };
function rareOnDisplay(g) {
  for (const d of g.allDisplays?.() || []) for (const it of d.items) if (it && ['rare', 'ultra', 'secret', 'epic', 'legendary'].includes(getItem(it.k)?.rarity)) return true;
  for (const s of g.packing?.stands || []) { const it = s.display.items[0]; if (it && ['rare', 'ultra', 'secret', 'epic', 'legendary'].includes(getItem(it.k)?.rarity)) return true; }
  return false;
}
function L_appear(L, n) { L.appear(n); }
function subjectFor(L, n) {
  let best = null, bd = 12;
  for (const o of L.list) { if (o === n || !o.present || !o.isHuman) continue; const d = n.distTo(o.pos); if (d < bd) { bd = d; best = o; } }
  for (const p of L.game.pedestrians?.list || []) { const d = n.distTo(p.h.root.position); if (d < bd) { bd = d; best = { h: p.h, pos: p.h.root.position }; } }
  return best;
}
function canPop(L, n) {
  const g = L.game;
  if (!L.mem.met('rohan') || g.cutscene?.active || g.uiOpen || g.pc?.active || g.held.reading || g.talk?.active) return false;
  const p = g.player.pos;
  if (!(p.z > 5.9 && p.z < 13.5)) return false;
  return !L.onScreen(n.pos.clone().setY(1.2)) || n.playerDist > 25;
}
/** Rohan pops up right behind you to stare (turn around and... ゴゴゴ). */
function* popup(n) {
  const L = this, g = L.game, P = g.player;
  g.camera.getWorldDirection(_w).setY(0).normalize();
  let at = null;
  for (const side of [0, 0.6, -0.6, 1.1, -1.1]) {
    const c = P.pos.clone().addScaledVector(_w, -1.45).add(V(-_w.z * side, _w.x * side));
    if (c.z > 6 && c.z < 13.4 && Math.abs(c.x) < 24 && !L.onScreen(c.clone().setY(1.2), 1.1) && L.list.every((o) => o === n || !o.present || o.distTo(c) > 1)) { at = c; break; }
  }
  if (!at) return;
  const home = n.pos.clone(), yaw = n.yaw;
  n.place(at, Math.atan2(P.pos.x - at.x, P.pos.z - at.z));
  n.gesture('stare'); n.look = 'player';
  let seen = false;
  const t0 = L.time;
  yield () => (seen = L.onScreen(n.pos.clone().setY(n.h.height * 0.8), 0.7) && n.playerDist < 4.5) || L.time - t0 > 13 || n.playerDist > 9;
  if (seen) {
    L.menaceOver(n, 'go');
    try { audio.play('menace', { kind: 'go' }); } catch { /* */ }
    n.expr('stare', 2);
    yield L.wait(0.7);
    n.say(pick(["...Don't mind me. That expression just now. Perfect.", 'Hold that face. HOLD IT.', 'Oh? You noticed me. Your reaction time is... average.']));
    n.gesture('sketch');
    yield L.wait(4.2);
    n.say('Hmph. Carry on.');
    yield L.wait(1.2);
  } else { if (n.playerDist < 9) n.say(pick(['...Turn around, would you? I need the front.', 'Hmph. Not even a glance. Rude.'])); yield L.wait(2); }
  n.clearGesture();
  if (n.distTo(home) > 0.5) yield L.goTo(n, home, { face: yaw });
}

// Josuke and Okuyasu share a routine; the banter runs from Josuke's idle
const JOSUKE = {
  id: 'josuke', name: 'Josuke', role: 'Regular, great hair', stranger: 'the guy with the pompadour', color: '#ff6fb0',
  voice: { base: 168, duty: 0.25 }, tts: { pitch: 0.9, rate: 1.02 }, speed: 1.15,
  door: 'doorJosuke', spot: 'josuke', base: 'pockets',
  hours: [[8, 8.6, 'wander'], [15, 19.5, 'spot'], [19.5, 8, 'home']],
  weekend: [[11, 19.5, 'spot']],
  visit: 0.3,
  lines: {
    idle: ['Yo.', 'Nice weather.', 'Huh.'],
    visit: ['Let\'s see what you got.', 'One turn. Just one.'],
    win: ['GREAT!', 'This must be the work of fate!', 'Heh. Not bad at all.'],
    meh: ['Yare yare... a duplicate.', 'Aw, man.'],
    home: ['Later.', 'Mom\'s making curry. See ya.'],
    slapped: ['...WHAT was that for?!', 'Oi oi oi. You want a fight?'],
    slappedAgain: ['THAT\'S IT. DORA DORA DORA!'],
    remember: ['You slapped me last time. I\'m a nice guy, but... don\'t.'],
    discover: ['Whoa, nice pull!', 'That one\'s cool.'],
  },
  setup(L, n) { n.banterT = rnd(6, 10); n.greetT = 0; n.near = false; },
  idle(L, n, dt) {
    const O = L.npc('okuyasu'), pd = n.playerDist;
    n.look = pd < 6 ? 'player' : O?.present ? O : null;
    if (!n.h.currentGesture && Math.random() < dt * 0.05) n.gesture(pick(['pockets', 'pockets', 'arms_crossed', 'comb']));
    const near = pd < 4.2;
    n.greetT -= dt;
    if (near && !n.near && n.greetT <= 0) {
      n.greetT = 45;
      if (!n.mem.flags.posed && O?.present) { n.mem.flags.posed = true; n.gesture('pose_point'); O.gesture('pose_cross'); L.menaceOver(n); setTimeout(() => n.say(L.mem.met('josuke') ? 'Yo.' : 'Huh? Who are you supposed to be?'), 600); }
      else (Math.random() < 0.5 || !O?.present ? n : O).say(pick(['Yo.', 'Hey, it\'s the gacha kid.', 'Oi! Got any snacks?']));
    }
    n.near = near;
    if ((n.banterT -= dt) <= 0 && O?.present && !O.busy && O.activity === 'spot') {
      n.banterT = rnd(16, 28);
      if (pd < 18 && !n.talking && !O.talking) L.run(n, banter.call(L, n, O, pick(BANTER)));
    }
    hairHits(L, n);
  },
  knock(L, n) {
    const g = L.game, broken = g.machines.find((m) => m.data.broken);
    const now = g.clock?.stamp ?? 0;
    if (broken && L.mem.met('josuke') && L.mem.rel('josuke') >= 0 && now - (n.mem.flags.fixT ?? -1e9) > 600) return { id: 'fix' + (g.clock?.day || 1), call: 'Yo! Heard something broke in there?', sub: 'Josuke can fix things. Somehow.', script: fixScript(L) };
    return null;
  },
  chat(L, n, { first }) {
    const g = L.game, q = g.sideQuests;
    if (n.knocking?.script) return n.knocking.script;
    const broken = g.machines.find((m) => m.data.broken);
    return { start: [
      ...opener(L, n, { first, firstHello: ['Yo. Josuke. I live right over there.', "You're Grandpa's grandkid, right? He used to give me free turns."], hello: ['Yo.', 'Hey. What\'s up?', 'Oh, it\'s you.'] }),
      { if: () => q?.isActive('crew') && q.step('crew')?.talk === 'josuke', then: 'crew' },
      { if: () => q?.isActive('bizarre_hero') && heldFigure(g, 'bizarre'), then: 'hero' },
      { choose: [
        { text: 'Your hair looks amazing.', rel: 1, then: [{ gesture: 'comb', say: 'Heh. Finally, someone with taste.' }] },
        { text: 'What is with your hair?', then: [{ do: (c) => rage(L, c.npc, 'say'), say: 'WHAT DID YOU SAY ABOUT MY HAIR?!', style: 'shout' }, { rel: -2, set: { hairInsult: true } }, '...Hah... hah... NOBODY insults this hair.'] },
        { text: 'Can you fix a machine?', if: () => !!broken, then: fixScript(L).start },
        { text: 'Want a quest... I mean, a favour?', if: () => !q?.isActive('bizarre_hero') && !q?.isDone('bizarre_hero'), then: ['A favour? Hm. Actually...', 'There\'s a capsule series with those cool heroes. Bizarre ones. Pull me one and I\'ll make it worth your while.', { quest: 'bizarre_hero' }] },
        { text: 'See you.', then: ['Later.'] },
      ], time: 9, timeout: 4 },
    ],
    hero: ['Wait. Is that... from the Bizarre series?', { choose: [{ text: 'It\'s yours.', do: () => giveHeld(g), advance: 'bizarre_hero', rel: 2, then: [{ gesture: 'pose_point', say: 'GREAT! This must be the work of fate!' }] }, { text: 'Just showing off.', then: ['...Mean.'] }] }],
    crew: ['Join a PIRATE crew? That straw hat guy?', { choose: [{ text: 'He says you get free meat.', then: ['...Tempting. But no. Tell him I said "maybe".', { advance: 'crew' }] }, { text: 'Think about it.', then: ['I thought about it. No. ...Maybe.', { advance: 'crew' }] }] }],
    };
  },
  quests: [{
    id: 'bizarre_hero', title: 'A bizarre hero', giver: 'josuke', giverName: 'Josuke', color: '#ff6fb0',
    steps: [
      { text: 'Pull a figure from the Bizarre series', sub: 'Stock a machine with it, or order capsules', check: (g) => SERIES_BY_ID.bizarre?.items.some((it) => g.state.discovered[it.key]) },
      { text: 'Bring it to Josuke', sub: 'Hold it in your hands and talk to him', talk: 'josuke' },
    ],
    reward: { money: 2500, text: 'Josuke owes you one' },
  }],
};
const fixScript = (L) => ({ start: [
  'Lemme see it.', { wait: 0.6 }, { say: 'DORA!', style: 'shout', do: (c) => { c.npc.gesture('dora'); } }, { wait: 1.2 },
  { do: () => { const m = L.game.machines.find((x) => x.data.broken); if (m) { m.data.broken = false; m.repair?.(); L.game.save(); } c_fixed(L); } },
  'There. Good as new. Don\'t ask how.', { rel: 1 },
] });
function c_fixed(L) { const n = L.npc('josuke'); if (n) n.mem.flags.fixT = L.game.clock?.stamp ?? 0; L.game.news('Josuke fixed your machine', 'No tools. No questions.'); }

function* banter(n, O, lines) {
  for (const [w, text] of lines) {
    const s = w === 'j' ? n : O;
    if (s.busy || !s.present) return;
    s.say(text);
    s.expr(/!|\?!/.test(text) ? 'surprised' : 'smile', 2);
    yield this.wait(1.2 + text.length * 0.055);
  }
}

/** Josuke loses it (someone insulted / hit the hair): a shout, a punch rush, a shaky view. */
function rage(L, n, why = 'say') {
  const g = L.game, O = L.npc('okuyasu');
  n.mem.flags.hairInsults = (n.mem.flags.hairInsults || 0) + 1;
  n.gesture('dora'); n.expr('furious', 4);
  if (why === 'hit') n.say('DID YOU JUST THROW SOMETHING AT MY HAIR?!', { style: 'shout', dur: 3.2 });
  L.menaceOver(n, 'do');
  try { audio.play('menace', { kind: 'do' }); } catch { /* */ }
  g.player.shake = Math.max(g.player.shake || 0, 0.5);
  if (O?.present && !O.busy) setTimeout(() => { O.say('Uh-oh. You did it now...'); O.expr('surprised', 2); }, 1600);
  L.mem.gossip('hair', { who: 'Josuke', id: 'josuke' });
}
const _hv = new THREE.Vector3(), _hw = new THREE.Vector3();
function hairHits(L, n) {
  const g = L.game;
  if (g.time - (g.held.tossed ?? -99) > 2.5) return;
  n.h.b.head.getWorldPosition(_hv);
  _hv.y += n.h.P.hu * 0.45;
  _hw.set(Math.sin(n.yaw), 0, Math.cos(n.yaw));
  _hv.addScaledVector(_hw, n.h.P.hu * 0.25);
  for (const e of g.items.list) {
    if (e.kind !== 'capsule' || !e.body || e.hitHair) continue;
    if (e.body.pos.distanceTo(_hv) < 0.4 && e.body.vel.length() > 0.4) {
      e.hitHair = true;
      e.body.vel.set(-e.body.vel.x * 0.5 + _hw.x * 1.2, 1.4, -e.body.vel.z * 0.5 + _hw.z * 1.2);
      try { audio.play('pop', { pos: _hv, vol: 0.8 }); } catch { /* */ }
      L.mem.rel('josuke', -3);
      rage(L, n, 'hit');
      g.events.emit('hairHit');
      break;
    }
  }
}

const OKUYASU = {
  id: 'okuyasu', name: 'Okuyasu', role: 'Regular, always hungry', stranger: 'the guy with the scar', color: '#ff9a4a',
  voice: { base: 132, duty: 0.5, vol: 1.15 }, tts: { pitch: 0.75, rate: 0.98 }, speed: 1.15,
  door: 'doorOkuyasu', spot: 'okuyasu',
  hours: [[8, 8.6, 'wander'], [15, 19.5, 'spot'], [19.5, 8, 'home']],
  visit: 0.35,
  lines: {
    idle: ['I\'m hungry.', 'Josuke... is it snack time?', 'Huh?'],
    visit: ['Gacha! Is there food in these?', 'One more! I mean one!'],
    win: ['WHOA! LOOK AT THIS!', 'Is it edible?! ...No? Still cool!'],
    meh: ['It\'s not even edible.', 'Aw...'],
    home: ['Dinner time! See ya!'],
    slapped: ['OW! Why?! What did I do?!', 'Huh?! ...Huh??'],
    slappedAgain: ['Josuke! They keep hitting me!'],
    remember: ['You slapped me... I thought we were friends...'],
    discover: ['Whoa! Can you eat it?', 'Lucky! Do me next!', 'OOOH!'],
  },
  idle(L, n, dt) {
    const J = L.npc('josuke');
    n.look = n.playerDist < 6 ? 'player' : J?.present ? J : null;
    if (!n.h.currentGesture && Math.random() < dt * 0.03) n.gesture(pick(['scratch', 'arms_crossed', 'shrug']));
  },
  knock(L, n) {
    const q = L.game.sideQuests;
    if (!q || q.isActive('snacks') || q.isDone('snacks') || !L.mem.met('okuyasu')) return null;
    return { id: 'snacks', call: 'OI! GACHA PERSON! I have an IDEA!', sub: 'Okuyasu has an idea', script: snackScript };
  },
  chat(L, n, { first }) {
    const q = L.game.sideQuests;
    if (n.knocking?.script) return n.knocking.script;
    return { start: [
      ...opener(L, n, { first, firstHello: ['Heyyy! I\'m Okuyasu! You run the gacha place, right? Do you sell bread?'], hello: ['Heyyy!', 'Oh! It\'s you! Got snacks?', 'Yo yo yo!'] }),
      { if: () => q?.isActive('crew') && q.step('crew')?.talk === 'okuyasu', then: 'crew' },
      { if: () => q?.isActive('snacks') && q.stepIndex('snacks') === 1, then: 'snackDone' },
      { if: () => !q?.isActive('snacks') && !q?.isDone('snacks'), then: snackScript.start },
      { choose: [{ text: 'Are you hungry?', then: ['Always. Why? Do you have food? Do you?', { me: 'No.' }, '...Why would you ask then...'] }, { text: 'What\'s Josuke like?', then: ['Josuke? He\'s the best! Don\'t talk about his hair though. Seriously.'] }, { text: 'Bye!', then: ['Byeee!'] }], time: 10, timeout: 2 },
    ],
    snackDone: ['You did it?! The FOOD capsules?!', { advance: 'snacks', rel: 2 }, 'I\'m gonna play them ALL. ...Tomorrow. When I have money.'],
    crew: ['A pirate? With a hat? ...Is there food on the ship?', { choose: [{ text: 'So much meat.', then: ['I\'M IN! ...Wait, Josuke has to come too.', { advance: 'crew' }] }, { text: 'Probably not.', then: ['Then NO. ...Okay maybe.', { advance: 'crew' }] }] }],
    };
  },
  quests: [{
    id: 'snacks', title: 'Snack attack', giver: 'okuyasu', giverName: 'Okuyasu', color: '#ff9a4a',
    steps: [
      { text: 'Stock a machine with food capsules', sub: 'The Shokudo (diner) series', check: (g) => g.machines.some((m) => m.data.series === 'shokudo' || m.data.stock?.includes?.('shokudo')) },
      { text: 'Tell Okuyasu', sub: 'He hangs out by the vending machines after school', talk: 'okuyasu' },
    ],
    reward: { money: 1500, text: 'Okuyasu is your biggest fan' },
  }],
};
const snackScript = { start: [
  'Okay okay okay. Listen. What if... your machines had FOOD capsules?',
  { choose: [{ text: 'There is a diner series...', quest: 'snacks', rel: 1, then: ['THERE IS?! PUT IT IN A MACHINE! PLEASE!'] }, { text: 'Capsules aren\'t food.', then: ['...They could be.', { quest: 'snacks' }] }], time: 8, timeout: 0 },
] };

export const ROSTER = [ROHAN, JOSUKE, OKUYASU, ...MORE];
