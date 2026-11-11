// More of the cast (see roster.js for the format): the pigeon man, the prankster, the sorcerer, the rubber pirate, the
// guy in the bush, the biologist, and the yokai who come out after dark.
import * as THREE from 'three';
import { Flock, bushCamp, planter, Creature } from './props.js';
import { audio } from '../core/audio.js';
import { getItem } from '../data/series/index.js';
import { opener, heldFigure, giveHeld, SPOTS } from './roster.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
/** Things you can hand to the hungry ones (Mikawa-ya's snacks, milk, Gen-san's candy). */
export const FOODS = ['milk', 'ramune', 'puffstick', 'candy', 'gumball', 'gen_candy'];
const rnd = (a, b) => a + Math.random() * (b - a);
const V = (x, z) => new THREE.Vector3(x, 0, z);
const sp = (name) => { const s = SPOTS[name]; return V(s[0], s[1]); };
const sfx = (n, o = {}) => { try { audio.play(n, o); } catch { /* audio not ready */ } };
const _v = new THREE.Vector3();
/** A day-seeded coin flip (the same answer all night). */
const tonight = (L, salt, p) => { const d = L.game.clock?.day ?? 1; const h = Math.sin((d + (L.hour < 12 ? -1 : 0)) * 12.9898 + salt * 78.233) * 43758.5453; return h - Math.floor(h) < p; };

// ------------------------------------------------------------------ the pigeon man
const HATODA = {
  id: 'hatoda', name: 'Mr. Hatoda', role: 'Pigeon enthusiast', stranger: 'the old man with the pigeons', color: '#a8b0c8',
  look: 'hatoda', voice: { base: 150, duty: 0.5 }, tts: { pitch: 0.8, rate: 0.88 }, speed: 0.75,
  door: 'doorHatoda', spot: 'pigeons',
  hours: [[7, 11, 'spot'], [11, 12.5, 'home'], [12.5, 17.5, 'spot'], [17.5, 19, 'wander'], [19, 7, 'home']],
  visit: 0.12,
  lines: {
    idle: ['There you go, General. Slowly now.', 'Kurumi, share with your brother.', 'Poppo, don\'t be greedy.', 'Who\'s a good bird? You are. And you. Not you, Admiral.', 'Coo coo. That means "good morning" in pigeon.', 'Fine weather for flying, eh?'],
    visit: ['I hear there\'s a bird series in these machines.', 'Just one turn for an old man.'],
    win: ['Oh ho! Lovely!', 'My grandson will be so jealous.'], meh: ['Ah well.', 'Next time, next time.'],
    home: ['Time for my tea.', 'Goodnight, my feathered friends.'],
    slapped: ['Oh! My glasses! Young people today...', 'Gah! You startled the General!'],
    remember: ['You struck an old man. The pigeons saw it. They remember too.'],
    discover: ['Oh my, what a find!'],
  },
  setup(L, n) {
    const f = n.flock = new Flock(L.game, 6, sp('pigeonFlock'));
    n.feedT = rnd(4, 9);
    L.extras.push((dt) => {
      const h = L.hour, on = h >= 6 && h < 19.5;
      if (on !== f.visible) f.setVisible(on);
      if (!on) return;
      const before = f.birds.filter((b) => b.fly).length;
      f.update(dt);
      const after = f.birds.filter((b) => b.fly).length;
      if (after > before && n.present && n.activity === 'spot' && !n.busy && L.time - (n.scoldT || -99) > 30) { n.scoldT = L.time; n.say('Hey! Don\'t run at them!', { style: 'shout' }); L.mem.rel('hatoda', -1); }
    });
  },
  idle(L, n, dt) {
    n.look = n.playerDist < 4 ? 'player' : (n.flockLook ||= sp('pigeonFlock').setY(0.2));
    if ((n.feedT -= dt) <= 0) {
      n.feedT = rnd(8, 15);
      n.gesture('feed');
      setTimeout(() => n.flock.feed(sp('pigeonFlock')), 700);
      if (n.playerDist < 14) n.say(pick(n.def.lines.idle));
      sfx('coo', { pos: sp('pigeonFlock').setY(0.3), vol: 0.6 });
    }
  },
  knock(L, n) {
    const q = L.game.sideQuests;
    if (!q || q.isActive('poppo') || q.isDone('poppo') || !L.mem.met('hatoda') || L.mem.rel('hatoda') < 0) return null;
    return { id: 'poppo', call: 'Excuse me! Is anyone there? Oh dear, oh dear...', sub: 'Mr. Hatoda looks worried', leave: 'Oh dear...', script: poppoScript };
  },
  chat(L, n, { first }) {
    const q = L.game.sideQuests;
    if (n.knocking?.script) return n.knocking.script;
    return { start: [
      ...opener(L, n, { first, firstHello: ['Oh, hello there! I\'m Hatoda. And these are my friends.', { gesture: 'feed' }, 'The General, Kurumi, Admiral, Mame, Poppo and Chibi.'], hello: ['Ah, the young shopkeeper!', 'Hello, hello!', 'Coo! ...Sorry. Habit.'] }),
      { if: () => q?.isActive('poppo') && q.stepIndex('poppo') === 1, then: 'found' },
      { if: () => !q?.isActive('poppo') && !q?.isDone('poppo') && (n.mem.talks || 0) >= 1, then: poppoScript.start },
      { choose: [
        { text: 'Can I feed them too?', then: [{ if: 'rel>=1', then: ['Of course! Here, take a pinch of crusts.', { do: () => n.flock.feed(L.game.player.pos.clone().add(V(0, 0))) }, 'Gently, gently. Look at them go!', { rel: 1 }], else: ['Hmm. Maybe when they know you better.'] }] },
        { text: 'How do you tell them apart?', then: ['The General has a scar on his beak. Kurumi has a crooked toe. Poppo has one white feather.', 'The rest... I just know.'] },
        { text: 'Pigeons are rats with wings.', rel: -2, then: [{ expr: 'sad', say: '...' }, 'I will pretend the birds didn\'t hear that.'] },
        { text: 'Goodbye, Mr. Hatoda.', then: ['Take care! Coo!'] },
      ] },
    ],
    found: ['Poppo! He came back! Oh, thank you, thank you!', { advance: 'poppo', rel: 3 }, 'He says thank you too. Coo.'] };
  },
  quests: [{
    id: 'poppo', title: 'Where is Poppo?', giver: 'hatoda', giverName: 'Mr. Hatoda', color: '#a8b0c8',
    steps: [
      { text: 'Find Poppo, the pigeon with a white feather', sub: 'Somewhere on the lane. Shoo him home gently', check: (g, q) => !!q.data.found },
      { text: 'Tell Mr. Hatoda', sub: 'He feeds his pigeons on the west side of the lane', talk: 'hatoda' },
    ],
    reward: { money: 1500, text: 'The pigeons like you now' },
    onStart: (g) => g.lane && lostPigeon(g.lane),
  }],
};
const poppoScript = { start: [
  'Oh, it\'s terrible! Poppo didn\'t come for breakfast. He ALWAYS comes for breakfast.',
  'Could you keep an eye out? A pigeon with one white feather. He likes high places. And snacks.',
  { choose: [{ text: 'I\'ll find him.', quest: 'poppo', rel: 1, then: ['Bless you! Coo!'] }, { text: 'It\'s just a pigeon...', rel: -1, then: ['Just a pigeon?! ...Well. Maybe you\'ll change your mind.'] }] },
] };
/** Poppo, lost somewhere on the lane: click him to shoo him back to the flock. */
export function lostPigeon(L) {
  const g = L.game, q = g.sideQuests;
  if (!q?.isActive('poppo') || L.poppo || q.data('poppo')?.found) return;
  const spots = [[2.6, 5.75], [-16.4, 14.2], [10.4, 1.0], [-8.4, 18.6], [16.0, 6.0]];
  const s = q.data('poppo').spot ?? Math.floor(Math.random() * spots.length);
  q.data('poppo').spot = s;
  const f = new Flock(g, 1, V(spots[s][0], spots[s][1]));
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.5), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.copy(f.birds[0].b.position).setY(0.2);
  g.scene.add(hit);
  L.poppo = f;
  L.extras.push((dt) => { if (L.poppo === f) { f.update(dt); hit.position.copy(f.birds[0].b.position).setY(0.2); } });
  g.interaction.add(hit, {
    hint: () => ({ key: 'LMB', text: 'Poppo! Shoo him home', sub: 'A pigeon with one white feather' }),
    use: () => {
      g.interaction.remove(hit); hit.removeFromParent();
      f.scatter();
      q.data('poppo').found = true;
      q.poll?.('poppo');
      g.monologue?.say(pick(['Go on, Poppo. Home you go.', 'Shoo! Mr. Hatoda misses you.']));
      setTimeout(() => { f.dispose(); if (L.poppo === f) L.poppo = null; }, 6000);
      return false;
    },
  });
}

// ------------------------------------------------------------------ the prankster
const GONTA = {
  id: 'gonta', name: 'Gonta', role: 'Prankster', stranger: 'the kid in the cap', color: '#f0c040',
  look: 'gonta', voice: { base: 300, duty: 0.25 }, tts: { pitch: 1.45, rate: 1.15 }, speed: 1.5,
  door: 'doorGonta', spot: 'shopFront',
  hours: [[10, 12, 'prank'], [15, 19.5, 'prank'], [19.5, 10, 'home']],
  lines: {
    idle: ['Hehehe...', 'Nothing to see here!', 'I\'m not doing anything!'],
    home: ['Mom\'s gonna kill me if I\'m late. Bye!'],
    slapped: ['WAAAH! I\'m telling my mom!', 'OW! Okay, okay, I deserved that one.'],
    remember: ['You slapped me! ...Respect, though.'],
  },
  acts: {
    *prank(n) {
      const L = this, g = L.game;
      L.appear(n);
      const kinds = ['wander', 'boo', 'note', 'dash'];
      for (let round = 0; round < 3; round++) {
        const k = pick(kinds);
        if (k === 'dash' && g.player.pos.z < 4.6 && L.game.garage.shutterOpen > 0.5) {
          // knock on your shutter and run
          yield L.goTo(n, 'shutter', { speed: 1.6 });
          n.faceYaw = Math.PI; n.gesture('knock');
          for (let i = 0; i < 4; i++) { sfx('thud', { pos: V(0.4, 5.2).setY(1.3), vol: 0.6 }); yield L.wait(0.18); }
          n.say('Delivery for... NOBODY! Hahaha!', { style: 'shout' });
          L.mem.gossip('prank', { who: 'Gonta', id: 'gonta', what: 'dash' });
          yield L.goTo(n, V(rnd(-14, 14), rnd(7, 12)), { speed: 3.2 });
          n.gesture('laugh');
          yield L.wait(2);
        } else if (k === 'boo') {
          const p = (g.pedestrians?.list || []).find((x) => x.state === 'stroll' && Math.hypot(x.h.root.position.x - n.pos.x, x.h.root.position.z - n.pos.z) < 22);
          if (!p) continue;
          for (let i = 0; i < 40 && Math.hypot(p.h.root.position.x - n.pos.x, p.h.root.position.z - n.pos.z) > 0.9; i++) {
            const t = p.h.root.position, yaw = p.h.root.rotation.y;
            n.walk([V(t.x - Math.sin(yaw) * 0.7, t.z - Math.cos(yaw) * 0.7)], { speed: 1.9 });
            yield L.wait(0.25);
          }
          n.stop();
          n.say('BOO!', { style: 'shout' });
          g.pedestrians?.scare?.(p);
          L.mem.gossip('prank', { who: 'Gonta', id: 'gonta', what: 'boo' });
          yield L.wait(0.6);
          n.gesture('laugh');
          yield L.wait(2.5);
        } else if (k === 'note' && !n.mem.flags.noteToday && g.player.pos.z > 6 && g.player.pos.z < 13.5 && n.playerDist < 25) {
          // sneak up behind you and stick a note on your back
          for (let i = 0; i < 60 && n.playerDist > 0.9; i++) {
            const P = g.player, back = V(P.pos.x - Math.sin(-P.yaw) * 0.0, P.pos.z);
            n.walk([back], { speed: 1.4 }); n.ghost = true;
            yield L.wait(0.2);
          }
          n.ghost = false; n.stop();
          if (n.playerDist <= 1.2) {
            n.mem.flags.noteToday = true;
            n.say('Nice shirt! Hehe...');
            sfx('paper', { vol: 0.5 });
            L.mem.gossip('prank', { who: 'Gonta', id: 'gonta', what: 'note' });
            g.state.flags.kickMe = g.clock?.stamp ?? 1;
            g.events.emit('pranked', { what: 'note' });
            yield L.goTo(n, V(n.pos.x + rnd(-6, 6), rnd(7, 12)), { speed: 2.8 });
            n.gesture('laugh');
            yield L.wait(2);
          }
        } else {
          yield L.goTo(n, V(rnd(-20, 20), rnd(6.8, 12.8)), { speed: 1.4 });
          if (Math.random() < 0.4 && n.playerDist < 12) n.say(pick(n.def.lines.idle));
          yield L.wait(rnd(2, 5));
        }
      }
      n.activity = null;
    },
  },
  onSlap(L, n) { n.gesture('cower'); },
  chat(L, n, { first }) {
    const q = L.game.sideQuests;
    return { start: [
      ...opener(L, n, { first, firstHello: ['I\'m Gonta! I didn\'t do it. Whatever it was.'], hello: ['Oh! Uh. Hi! I didn\'t do it!', 'Heyyy, shopkeeper!', 'Hehehe. What?'] }),
      { if: () => q?.isActive('pinpon') && (q.data('pinpon').rung?.length || 0) >= 3, then: 'pinponDone' },
      { if: () => q?.isActive('ota_prank') && q.stepIndex('ota_prank') === 0, then: 'apologise' },
      { say: 'Rock, paper, scissors! GO!', gesture: 'cheer' },
      { choose: [{ text: 'Rock!', value: 0 }, { text: 'Paper!', value: 1 }, { text: 'Scissors!', value: 2 }], time: 2.5, late: 'slow' },
      { do: (c) => { const mine = c.vars.choice, his = Math.floor(Math.random() * 3); c.vars.his = ['Rock', 'Paper', 'Scissors'][his]; c.vars.res = mine === his ? 'tie' : (mine - his + 3) % 3 === 1 ? 'win' : 'lose'; } },
      { if: (c) => c.vars.res === 'win', then: [(c) => `${c.vars.his}! Aww, you win. Fine, take my allowance.`, { give: 100, rel: 1 }] },
      { if: (c) => c.vars.res === 'lose', then: [(c) => `${c.vars.his}! I WIN! You owe me a hundred yen!`, { choose: [{ text: 'Pay up (¥100).', then: [{ pay: 100, rel: 1 }, 'Hehe, pleasure doing business!'] }, { text: 'Not a chance.', then: ['Cheapskate!'] }] }] },
      { if: (c) => c.vars.res === 'tie', then: [(c) => `${c.vars.his}?! A tie! You're good...`] },
      { if: () => !q?.isActive('pinpon') && !q?.isDone('pinpon'), then: ['Hey. Wanna learn the ultimate prank? Pinpon dash! Ring a doorbell and RUN!', { choose: [{ text: 'Teach me, master.', quest: 'pinpon', then: ['Ring three different doorbells on the lane. Then come back. Hehe!'] }, { text: 'That\'s mean.', rel: -1, then: ['Boring!'] }] }] },
    ],
    slow: ['Too slow! I win by default! Hahaha!'],
    apologise: ['Huh? Mrs. Ota wants WHAT?', { choose: [{ text: 'Apologise. Now.', then: ['...Fiiine. I\'ll go say sorry. But I\'m not sorry. ...Okay, a little.', { advance: 'ota_prank', rel: -1 }] }, { text: 'Or I tell your mum.', then: [{ expr: 'surprised', say: 'NOT MY MUM! Okay okay, I\'ll apologise!' }, { advance: 'ota_prank' }] }], time: 8, timeout: 1 }],
    pinponDone: ['You did it?! THREE doorbells?!', { advance: 'pinpon', rel: 2 }, 'You\'re a legend. A menace. Like me!'] };
  },
  quests: [{
    id: 'pinpon', title: 'Pinpon dash', giver: 'gonta', giverName: 'Gonta', color: '#f0c040',
    steps: [
      { text: 'Ring three different doorbells', sub: (g, q) => `${q.data.rung?.length || 0}/3 · the neighbours won't like it`, on: 'doorbell', test: (e, g, q) => { const r = q.data.rung ||= []; if (!r.includes(e.house)) r.push(e.house); g.sideQuests.refresh(); return r.length >= 3; } },
      { text: 'Tell Gonta', sub: 'He runs around the lane after school', talk: 'gonta' },
    ],
    reward: { money: 500, text: 'Prank master (the neighbours are less pleased)' },
  }],
};

// ------------------------------------------------------------------ the sorcerer
const KUROMARU = {
  id: 'kuromaru', name: 'Lord Kuromaru', role: 'Self-proclaimed sorcerer', stranger: 'the guy in the hood', color: '#9a6ad8',
  look: 'kuromaru', voice: { base: 190, duty: 0.125 }, tts: { pitch: 0.65, rate: 0.9 }, speed: 1.0,
  door: 'doorKuro', spot: 'alleyA1',
  hours: [[13, 15.5, 'wander'], [16, 23.5, 'spot'], [23.5, 13, 'home']],
  lines: {
    idle: ['Darkness... heed my call. ...It\'s a quarter past four. Darkness is at work.', 'The seal on my right eye grows restless.', 'I sense a great power... in that vending machine. ...It\'s the corn soup.', 'Mortals. Always buying capsules. Always.', 'This alley reeks of the other side. Also of cats.', 'Kneel. ...No? Fine.'],
    home: ['The dark council summons me. (Dinner.)', 'I must go. My... familiar needs feeding. (The goldfish.)'],
    slapped: ['You... you DARE strike the Keeper of the Ninth Shadow?!', 'My seal! You almost broke my seal!'],
    remember: ['The shadows remember your insolence, mortal. ...Also my cheek still hurts.'],
    discover: ['That figure... it hums with forbidden energy.'],
  },
  setup(L, n) { n.spellT = rnd(10, 20); },
  idle(L, n, dt) {
    n.look = n.playerDist < 7 ? 'player' : (n.alleyLook ||= V(-8.4, 20).setY(1.2));
    if ((n.spellT -= dt) <= 0) { n.spellT = rnd(18, 32); n.gesture('spell'); if (n.playerDist < 14) n.say(pick(n.def.lines.idle)); }
  },
  knock(L, n) {
    const q = L.game.sideQuests;
    if (!q || q.isActive('relic') || q.isDone('relic') || !L.mem.met('kuromaru') || !L.night) return null;
    return { id: 'relic', call: 'Mortal shopkeeper! I have need of thee!', sub: 'The sorcerer is outside', leave: 'The stars are not aligned. I shall return.', script: relicScript };
  },
  chat(L, n, { first }) {
    const g = L.game, q = g.sideQuests;
    if (n.knocking?.script) return n.knocking.script;
    return { start: [
      ...opener(L, n, { first, firstHello: [{ gesture: 'spell', say: 'Halt, mortal! You stand before Lord Kuromaru, Keeper of the Ninth Shadow!' }, { choose: [{ text: 'Cool eyepatch.', rel: 1, then: ['...It seals my Dragon Eye. Thank you. It\'s from a 100 yen shop.'] }, { text: 'Aren\'t you Mrs. Yamada\'s son?', rel: -1, then: ['THAT NAME HAS NO POWER HERE.'] }], time: 6, timeout: 0 }], hello: ['We meet again, mortal.', 'The shadows whispered of your coming.', 'Ah. The capsule merchant.'] }),
      { if: () => q?.isActive('relic') && heldFigure(g, ['yokai', 'obake_yashiki']), then: 'give' },
      { if: () => !q?.isActive('relic') && !q?.isDone('relic'), then: relicScript.start },
      { choose: [
        { text: 'Read my fortune. (¥100)', then: [{ pay: 100 }, { say: 'Choose a card! Quickly, before the darkness sees!', gesture: 'spell' }, { choose: [{ text: 'The Sun', then: ['The Sun! A bright day. A customer will smile at you. That is all. Fate is mostly small.'] }, { text: 'The Moon', then: ['The Moon... something strange walks the lane tonight. Something... green.'] }, { text: 'The Capsule', then: ['The Capsule! Your next pull... will be a capsule. ...The spirits are very literal.'] }], time: 4, timeout: 2 }] },
        { text: 'What\'s your real name?', then: ['I have no "real" name. I shed it in the Abyss.', { say: 'HIROSHI! DINNER!', who: 'mom', style: 'shout' }, '...That was a demon. Ignore it.'] },
        { text: 'Farewell, Dark Lord.', rel: 1, then: ['Farewell. Walk in shadow. ...Mind the step, it\'s dark.'] },
      ], time: 10, timeout: 2 },
    ],
    give: ['That relic... it reeks of the other world! Give it to me!', { choose: [{ text: 'Take it, Dark Lord.', do: () => giveHeld(g, n), advance: 'relic', rel: 2, then: [{ gesture: 'spell', say: 'YES! The seal is complete! Your shop is now protected by the Ninth Shadow!' }, 'Also here is money. My mother says I have to pay for things.'] }, { text: 'Never!', then: ['Then the darkness will wait. It\'s very patient.'] }] }] };
  },
  quests: [{
    id: 'relic', title: 'The cursed relic', giver: 'kuromaru', giverName: 'Lord Kuromaru', color: '#9a6ad8',
    steps: [
      { text: 'Get a figure from the Yokai or Haunted House series', check: (g) => ['yokai', 'obake_yashiki'].some((s) => Object.keys(g.state.discovered).some((k) => getItem(k)?.series === s)) },
      { text: 'Hold it and bring it to Lord Kuromaru', sub: 'He haunts the mouth of the alley by Mikawa-ya in the evening', talk: 'kuromaru' },
    ],
    reward: { money: 2500, text: 'Protected by the Ninth Shadow' },
  }],
};
const relicScript = { start: [
  'Listen well. To complete my seal I require a relic. A figure... of the other world. A yokai. A ghost.',
  'Your machines spit out such things, do they not?',
  { choose: [{ text: 'I\'ll find you one.', quest: 'relic', rel: 1, then: ['The Ninth Shadow thanks you. ...Don\'t tell my mom.'] }, { text: 'They\'re toys.', then: ['TOYS?! ...Toys can be cursed too.', { quest: 'relic' }] }] },
] };

// ------------------------------------------------------------------ the rubber pirate
const GOMUZO = {
  id: 'gomuzo', name: 'Captain Gomuzo', role: 'Rubber pirate (self-declared)', stranger: 'the guy in the straw hat', color: '#e8c878',
  look: 'gomuzo', voice: { base: 215, duty: 0.5 }, tts: { pitch: 1.15, rate: 1.12 }, speed: 1.35,
  door: 'doorGomu', spot: 'pirate',
  hours: [[9, 12, 'wander'], [12, 13.5, 'spot'], [13.5, 18, 'wander'], [18, 21.5, 'spot'], [21.5, 9, 'home']],
  visit: 0.3,
  lines: {
    idle: ['I\'m gonna be KING of this lane!', 'MEEEAT!', 'I\'m hungry. Again. Still.', 'Hahaha! What a nice day!', 'Has anyone seen my ship? It\'s a bathtub.'],
    visit: ['Is there meat in these?!', 'Treasure hunting!'],
    win: ['TREASURE!', 'Hahaha! I\'m keeping it!'], meh: ['Hm. Can\'t eat it.', 'Aw.'],
    home: ['Time to sleep in my garage-ship!'],
    slapped: ['Hahaha! That tickles! I\'m made of rubber!', 'Didn\'t hurt! Rubber!'],
    remember: ['You slapped me! It didn\'t hurt, but it was RUDE.'],
    discover: ['Is that TREASURE?!'],
  },
  setup(L, n) { n.eatT = rnd(6, 12); n.punchT = rnd(20, 40); },
  idle(L, n, dt) {
    n.look = n.playerDist < 6 ? 'player' : null;
    const meat = n.h.npcProps?.meat;
    if ((n.eatT -= dt) <= 0) {
      n.eatT = rnd(14, 24);
      n.gesture('eat'); if (meat) meat.visible = true;
      if (n.playerDist < 14) n.say(pick(['Mmmf! Meat!', 'Nom nom nom!', 'MEAT IS LIFE!']));
      setTimeout(() => { if (meat) meat.visible = false; if (n.h.currentGesture === 'eat') n.clearGesture(); }, 4500);
    }
    if ((n.punchT -= dt) <= 0) { n.punchT = rnd(30, 50); rubberPunch(L, n); }
  },
  onSlap(L, n) { L.mem.rel('gomuzo', 2); }, // rubber: no hard feelings
  move: (L, n) => rubberPunch(L, n),
  chat(L, n, { first }) {
    const g = L.game, q = g.sideQuests;
    const food = FOODS.find((id) => g.held.holding?.(id));
    return { start: [
      ...opener(L, n, { first, firstHello: ['Hey! I\'m Gomuzo! I\'m gonna be the King of this lane!', 'And you\'re gonna join my crew!'], hello: ['Hey! It\'s you!', 'Crewmate!', 'Hahaha! Hi!'] }),
      { if: () => q?.isActive('crew') && q.stepIndex('crew') === 2, then: 'crewDone' },
      { choose: [
        { text: 'Here, have this.', if: () => !!food, then: [{ do: () => giveHeld(g, n), rel: 2 }, () => (food === 'milk' ? 'MILK! I love milk! Not as much as meat. But I LOVE it!' : 'FOOD! Thank you, crewmate! *gulp* ...Got any more?')] },
        { text: 'Join your crew? Sure.', if: () => !q?.isActive('crew') && !q?.isDone('crew'), quest: 'crew', then: ['YES! Now we need more! Get the pompadour guy and his hungry friend!'] },
        { text: 'Why are you made of rubber?', then: ['I ate a weird gummy when I was a kid! Now I\'m stretchy!', { do: () => rubberPunch(L, n) }, 'See?! Hahaha!'] },
        { text: 'Are you hungry?', then: ['YES.'] },
        { text: 'Bye, Captain.', then: ['See ya, crewmate!'] },
      ] },
    ],
    crewDone: ['They said MAYBE?! That\'s basically YES!', { advance: 'crew', rel: 2 }, 'Our crew is the best crew! First mission: find meat.'] };
  },
  quests: [{
    id: 'crew', title: 'Crew wanted', giver: 'gomuzo', giverName: 'Captain Gomuzo', color: '#e8c878',
    steps: [
      { text: 'Recruit Josuke', sub: 'By the vending machines after school', talk: 'josuke' },
      { text: 'Recruit Okuyasu', sub: 'Wherever Josuke is', talk: 'okuyasu' },
      { text: 'Report to Captain Gomuzo', talk: 'gomuzo' },
    ],
    reward: { money: 2000, text: 'Honorary crew member' },
  }],
};
/** Wind up and punch the air with an arm that stretches like rubber. */
function rubberPunch(L, n) {
  if (!n.isHuman) return;
  n.gesture('gomu');
  n.say(pick(['RUBBER... PUNCH!', 'STRETCHY... FIST!']), { style: 'shout' });
  sfx('whoosh', { pos: n.pos.clone().setY(1.3), vol: 0.6 });
  const b = n.h.b, t0 = L.time;
  const fn = () => {
    const t = L.time - t0;
    const k = t < 0.45 ? 1 : t < 0.75 ? 1 + 3 * Math.sin(((t - 0.45) / 0.3) * Math.PI / 2) : t < 1.2 ? 4 - 3 * ((t - 0.75) / 0.45) : 1;
    b.armR.scale.y = k; b.handR.scale.y = 1 / k;
    if (t >= 1.25) { b.armR.scale.y = 1; b.handR.scale.y = 1; L.extras.splice(L.extras.indexOf(fn), 1); }
  };
  L.extras.push(fn);
}

// ------------------------------------------------------------------ the guy in the bush
const YABUKI = {
  id: 'yabuki', name: 'Mr. Yabuki', role: 'Neighbourhood watch (of one)', stranger: 'the man in the bush', color: '#8a9a5a',
  look: 'yabuki', voice: { base: 160, duty: 0.25 }, tts: { pitch: 0.85, rate: 1.18 }, speed: 1.1,
  door: 'doorYabuki', spot: 'bush',
  hours: [[6.5, 23.5, 'spot'], [23.5, 6.5, 'sleep']],
  lines: {
    near: ['...You can\'t see me.', 'Act natural. I\'m a bush.', 'Keep walking, citizen.'],
    slapped: ['OW! My cover is BLOWN!', 'Assault! Assault on a bush!'],
    slappedAgain: ['Why does everyone slap the bush?!'],
    remember: ['You slapped me. It\'s in my log. Page 41.'],
  },
  hint(L, n) {
    if (!n.present || n.busy) return null;
    if (!L.mem.met('yabuki') && n.inBush) return { key: 'LMB', text: 'Confront the man in the bush', sub: 'RMB: slap' };
    return undefined;
  },
  setup(L, n) {
    const camp = bushCamp();
    const s = SPOTS.bush;
    camp.position.set(s[0], 0, s[1]);
    camp.rotation.y = s[2];
    L.game.scene.add(camp);
    n.camp = camp;
    n.watchT = rnd(6, 12);
    n.hit.scale.set(1.6, 1, 1.6); // the whole bush answers
    let zt = 0;
    L.extras.push((dt) => {
      if (!n.sleeping || !n.present || n.playerDist > 10 || (zt -= dt) > 0) return;
      zt = 2.4;
      try { L.game.effects.mark({ sprite: 'zz', pos: n.h.headTop(_v), color: 0xe8e8f0, life: 2.2, size: 0.05 }); } catch { /* */ }
    });
  },
  acts: {
    *spot(n) {
      const L = this;
      if (!n.present || !n.inBush) {
        L.appear(n);
        n.clearGesture();
        yield L.goTo(n, V(SPOTS.bush[0], SPOTS.bush[1] - 0.9));
        yield L.goTo(n, sp('bush'));
        crouch(n, true);
      }
      n.faceYaw = SPOTS.bush[2];
      n.gesture('binoculars');
      if (n.h.npcProps?.bino) n.h.npcProps.bino.visible = true;
    },
    *sleep(n) {
      const L = this;
      if (!n.present || !n.inBush) { yield* YABUKI.acts.spot.call(L, n); }
      n.clearGesture();
      if (n.h.npcProps?.bino) n.h.npcProps.bino.visible = false;
      n.sleeping = true;
      n.say('Zzz... suspicious... zzz...', { style: 'think' });
    },
  },
  idle(L, n, dt) {
    n.sleeping = false;
    if ((n.watchT -= dt) <= 0) {
      n.watchT = rnd(12, 22);
      const t = L.game.clock?.time || '';
      const lines = [`${t}. Subject: salaryman, brown briefcase. Suspicious? ...Yes.`, `${t}. The train is late again. As predicted.`, 'The cat. The cat is watching ME.', `${t}. Mikawa-ya's delivery truck. Three minutes early. Why?`, 'That vending machine has been humming in B-flat all day.', 'Note to self: buy more bush.'];
      if (n.playerDist < 16) n.say(pick(n.playerDist < 3 ? n.def.lines.near : lines), { style: n.playerDist < 3 ? 'say' : 'think' });
    }
  },
  onSlap(L, n) {
    if (!n.inBush) return;
    // tumbles out of the bush, scolds you, crawls back in later
    crouch(n, false);
    n.clearGesture();
    if (n.h.npcProps?.bino) n.h.npcProps.bino.visible = false;
    n.place(n.pos.clone().add(V(0, -0.9)), 0);
    n.gesture('stomp');
    L.mem.gossip('slap', { who: 'the man in the bush', id: 'yabuki' });
    L.run(n, (function* () { yield L.wait(9); n.activity = null; }).call(L));
  },
  chat(L, n, { first }) {
    const q = L.game.sideQuests;
    return { start: [
      { if: () => first, then: [{ say: '...', style: 'think' }, { choose: [{ text: 'What are you doing in that bush?', then: ['Bush? What bush? I am a concerned citizen. Observing.'] }, { text: 'I can see you, you know.', then: ['...Impossible. I am one with the foliage.'] }, { text: '[Slap the bush]', silent: true, do: () => { slapNpc(L, n); }, end: 'slap' }], time: 6, timeout: 0 }, 'Yabuki. Neighbourhood watch. Founding member. Only member.'] },
      ...(first ? [] : opener(L, n, { hello: ['Psst. Over here. No, the bush.', 'Citizen.', 'You again. Keep your voice down.'] })),
      { if: () => q?.isActive('cucumber') && (L.mem.state.yokai.kappa?.n || 0) > 0, then: 'kappa' },
      { if: () => !q?.isActive('cucumber') && !q?.isDone('cucumber') && (n.mem.talks || 0) >= 1, then: 'quest' },
      { choose: [
        { text: 'Get out of the bush.', then: ['Negative. The bush is my office. And my home. And my cover.'] },
        { text: 'Spying on people is creepy.', then: ['I don\'t spy on PEOPLE. I watch the STREET. Trains. Trucks. The cat. Big difference.', { rel: 1 }] },
        { text: 'Seen anything interesting?', then: [(c) => pick(['The 6:40 was late four days in a row. Coincidence? I think not.', 'Somebody keeps stealing cucumbers from Mikawa-ya. At NIGHT.', 'Your customers. Many of them. Business is good, citizen.'])] },
        { text: '[Slap the bush]', silent: true, do: () => slapNpc(L, n), end: 'slap' },
      ], time: 9, timeout: 2 },
    ],
    quest: ['Citizen. I need a second pair of eyes. Something steals cucumbers from Mikawa-ya at night.', 'Green. Small. Waddles. Watch the lane after dark and report back.', { choose: [{ text: 'I\'ll keep watch.', quest: 'cucumber', rel: 1, then: ['Good. Don\'t get eaten.'] }, { text: 'It\'s probably a cat.', then: ['Cats don\'t WADDLE, citizen.', { quest: 'cucumber' }] }] }],
    kappa: ['You saw it? A KAPPA?!', '...I KNEW IT. Nobody believed me. Here. For your service.', { advance: 'cucumber', rel: 3 }],
    };
  },
  quests: [{
    id: 'cucumber', title: 'The cucumber thief', giver: 'yabuki', giverName: 'Mr. Yabuki', color: '#8a9a5a',
    steps: [
      { text: 'Watch the lane after dark', sub: 'Something green waddles around the west end at night', check: (g) => (g.state.npcs?.yokai?.kappa?.n || 0) > 0 },
      { text: 'Report to the man in the bush', talk: 'yabuki' },
    ],
    reward: { money: 2000, text: 'Deputy of the neighbourhood watch' },
  }],
};
function crouch(n, on) { n.inBush = on; n.h.root.position.y = on ? -0.55 : 0; n.ghost = on; n.noBase = on; }
function slapNpc(L, n) {
  const g = L.game;
  sfx('smack', { pos: n.pos.clone().setY(1.2), vol: 1 });
  g.player.shake = Math.max(g.player.shake || 0, 0.3);
  try { g.effects.emit({ sprite: 'paf', pos: n.h.headTop(_v), life: 0.6, size: 0.26, seq: [0, 1, 1, 1, 1, 2, 2, 3], fade: 0.12 }); } catch { /* */ }
  g.events.emit('slap', { point: n.pos.clone().setY(1.2), object: n.hit, human: n.h });
}

// ------------------------------------------------------------------ the biologist
const PLANTERS = [
  { kind: 'asagao', name: 'Morning glory', owner: "Mrs. Tanaka's", at: [-12.95, 5.62, 0], fact: 'Morning glories open at dawn and close by noon. Water them before the sun is high.' },
  { kind: 'bonsai', name: 'Black pine bonsai', owner: "Mrs. Ota's", at: [14.95, 5.62, 0], fact: 'A bonsai drinks little but often. Never let the soil dry out completely.' },
  { kind: 'tomato', name: 'Cherry tomatoes', owner: "the Watanabes'", at: [-4.6, 14.55, Math.PI], fact: 'Tomatoes want sun, deep water and a stake to lean on. Pinch off the side shoots.' },
];
const KUSAKA = {
  id: 'kusaka', name: 'Dr. Kusaka', role: 'Field biologist', stranger: 'the woman with the field bag', color: '#7ac08a',
  look: 'kusaka', voice: { base: 232, duty: 0.25 }, tts: { pitch: 1.05, rate: 1.0, gender: 'f' }, speed: 1.1,
  door: 'doorKusaka', spot: 'garden',
  hours: [[8, 10, 'survey'], [10, 12, 'spot'], [12, 13, 'home'], [13, 16.5, 'survey'], [16.5, 18, 'spot'], [18, 8, 'home']],
  visit: 0.2,
  lines: {
    idle: ['Hm. Aphids. Of course.', 'Dandelions in the gutter. Persistent little things.', 'This moss only grows where the air is clean. Good.'],
    visit: ['Do you have a plant series? No? Pity.', 'One turn. For science.'],
    win: ['Oh, lovely detail!', 'How charming.'], meh: ['A duplicate. Like most of nature.', 'Hm.'],
    home: ['Time to press some samples.', 'My notes won\'t write themselves.'],
    slapped: ['Excuse me?!', 'That was entirely uncalled for.'],
    remember: ['You slapped me once. I wrote it down. Under "invasive species".'],
    discover: ['What a beautiful specimen!'],
  },
  setup(L, n) {
    const g = L.game;
    n.planters = PLANTERS.map((P) => {
      const m = planter(P.kind);
      m.position.set(P.at[0], 0, P.at[1]); m.rotation.y = P.at[2];
      g.scene.add(m);
      const hit = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.9, 0.36), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.set(P.at[0], 0.45, P.at[1]);
      g.scene.add(hit);
      g.interaction.add(hit, {
        hint: () => {
          const q = g.sideQuests, seen = q?.data('flora')?.seen || [];
          if (q?.isActive('flora') && q.stepIndex('flora') === 0 && !seen.includes(P.kind)) return { key: 'LMB', text: `Inspect the ${P.name.toLowerCase()}`, sub: `${P.owner} · for Dr. Kusaka's survey` };
          return { key: '', text: P.name, sub: P.owner };
        },
        use: () => {
          const q = g.sideQuests, d = q?.data('flora');
          if (!q?.isActive('flora') || !d) return false;
          d.seen ||= [];
          if (!d.seen.includes(P.kind)) { d.seen.push(P.kind); g.monologue?.say(P.fact); sfx('page', { vol: 0.5 }); q.refresh(); q.poll('flora'); }
          return false;
        },
      });
      return { ...P, mesh: m, hit };
    });
  },
  acts: {
    *survey(n) {
      const L = this;
      L.appear(n);
      for (const P of [...PLANTERS].sort(() => Math.random() - 0.5)) {
        n.clearGesture();
        const front = V(P.at[0], P.at[1] + (P.at[2] ? -0.75 : 0.75));
        yield L.goTo(n, front);
        n.faceTo(V(P.at[0], P.at[1]));
        n.gesture('inspect');
        if (n.playerDist < 10) n.say(P.fact);
        yield L.wait(rnd(6, 10));
      }
      n.clearGesture();
      n.activity = null;
    },
  },
  idle(L, n) { n.look = n.playerDist < 6 ? 'player' : null; },
  chat(L, n, { first }) {
    const g = L.game, q = g.sideQuests;
    return { start: [
      ...opener(L, n, { first, firstHello: ['Oh! Hello. Midori Kusaka, field biologist. I study the plants of old neighbourhoods like this one.', 'You\'d be amazed what grows between the paving stones.'], hello: ['Hello again!', 'Ah, my favourite shopkeeper.', 'Did you know the moss on your shutter is a good sign?'] }),
      { if: () => q?.isActive('flora') && (q.data('flora')?.seen?.length || 0) >= 3, then: 'report' },
      { choose: [
        { text: 'How do I keep plants alive?', then: ['Three rules. Water in the morning, not at noon: wet leaves in hot sun scorch.', 'Light: most plants want a bright window, not a dark garage corner. And don\'t drown them: soggy roots rot.', { say: 'Quick quiz! When should you water?', gesture: 'point' }, { choose: [{ text: 'In the morning.', rel: 1, then: ['Correct! You\'ll make a fine gardener.', { set: { taughtPlants: true }, do: () => g.events.emit('plantLesson', { from: 'kusaka', lesson: 'water' }) }] }, { text: 'At noon, when it\'s hottest.', then: ['No! The leaves will scorch. Morning!'] }, { text: 'Whenever I remember.', then: ['...That\'s how most plants die, you know.'] }], time: 6, timeout: 2 }] },
        { text: 'Can I help with your research?', if: () => !q?.isActive('flora') && !q?.isDone('flora'), quest: 'flora', then: ['Wonderful! I\'m surveying the potted plants on the lane. There are three I want checked.', 'A morning glory, a bonsai and some tomatoes. Look at each one closely and come back.'] },
        { text: 'What\'s your favourite plant?', then: ['Today? The dandelion in your gutter. It refuses to die. I respect that.'] },
        { text: 'See you, Doctor.', then: ['Take care! Mind the moss.'] },
      ] },
    ],
    report: ['You checked all three? Let\'s see your notes...', 'Morning glory, healthy. Bonsai, a little thirsty. Tomatoes, thriving. Excellent work!', { advance: 'flora', rel: 2, set: { taughtPlants: true } }, 'When you start growing your own plants, come and ask me anything.'] };
  },
  quests: [{
    id: 'flora', title: 'Lane flora survey', giver: 'kusaka', giverName: 'Dr. Kusaka', color: '#7ac08a',
    steps: [
      { text: 'Inspect three potted plants on the lane', sub: (g, q) => `${q.data.seen?.length || 0}/3 · a morning glory, a bonsai, tomatoes`, check: (g, q) => (q.data.seen?.length || 0) >= 3 },
      { text: 'Report to Dr. Kusaka', sub: 'Near the garden house at the east end', talk: 'kusaka' },
    ],
    reward: { money: 1800, text: 'Plant care lessons', fn: (g) => g.events.emit('plantLesson', { from: 'kusaka', lesson: 'survey' }) },
  }],
};

// ------------------------------------------------------------------ yokai (after dark)
function yokai(kind, o) {
  return {
    id: kind, yokai: true, early: false, name: o.name, role: 'Yokai', stranger: o.stranger, color: o.color,
    build: () => new Creature(kind === 'kasa' ? 'kasa' : kind), voice: o.voice, tts: o.tts, speed: o.speed || 0.6,
    hitH: o.hitH || 1, hitW: 0.6, spot: kind, door: null,
    hours: o.hours || [[20, 4.5, 'night']],
    lines: o.lines,
    acts: {
      *night(n) {
        const L = this;
        if (!o.always && !tonight(L, o.salt, o.chance)) { if (n.present) n.setPresent(false); return; }
        if (!n.present) {
          const s = L.spot(kind);
          // only appear where nobody is looking
          while (L.onScreen(s.pos.clone().setY(0.6), 1.05) && s.pos.distanceTo(L.game.player.pos) < 14) yield L.wait(1);
          n.place(s.pos, s.rotY); n.setPresent(true);
          if (n.h.statue !== undefined) n.h.statue = false;
        }
        if (o.roam) { for (let i = 0; i < 4; i++) { yield L.goTo(n, V(o.roam[0] + rnd(-o.roam[2], o.roam[2]), rnd(6.8, 12.6))); yield L.wait(rnd(3, 8)); } n.activity = null; }
      },
      *home(n) {
        const L = this;
        if (o.statueByDay) { n.place(L.spot(kind).pos, L.spot(kind).rotY); n.setPresent(true); n.h.statue = true; return; }
        if (!n.present) return;
        while (L.onScreen(n.pos.clone().setY(0.6), 1.05) && n.playerDist < 12) yield L.wait(1);
        try { L.game.effects.puff({ pos: n.pos.clone().setY(0.5), count: 8, colors: [0xd8d0e8, 0xb8b0c8], size: 0.08 }); } catch { /* */ }
        n.setPresent(false);
      },
    },
    setup(L, n) {
      n.seenT = 0;
      L.extras.push((dt) => {
        if (!n.present || (o.statueByDay && n.h.statue)) return;
        if ((n.seenT -= dt) > 0) return;
        n.seenT = 0.5;
        if (n.playerDist < 9 && L.onScreen(n.pos.clone().setY(0.6), 0.85)) {
          const night = L.game.clock?.day ?? 0;
          if (n.mem.flags.seenNight !== night) {
            n.mem.flags.seenNight = night;
            const y = L.mem.sawYokai(kind);
            if (y.n === 1) { L.game.monologue?.say(o.first); try { audio.play('menace', { kind: 'go' }); } catch { /* */ } }
          }
        }
      });
    },
    hint: o.hint,
    idle(L, n) { n.look = n.playerDist < 5 ? 'player' : null; },
    onSlap: o.onSlap,
    chat: o.chat,
  };
}

const KAPPA = yokai('kappa', {
  name: 'Kappa', stranger: 'the green thing', color: '#5aa04a', salt: 1, chance: 0.75, roam: [-20, 0, 5],
  voice: { base: 260, duty: 0.5 }, tts: { pitch: 1.6, rate: 1.2 },
  first: 'Is that... a KAPPA?! The cucumber thief!',
  lines: { slapped: ['KWAH! Rude human!'] },
  chat: (L, n, { first }) => ({ start: [
    first ? 'KWAH! A human! Don\'t look at me! I\'m... a very green child.' : pick(['Kwah. You again.', 'Got cucumbers? No? Kwah.']),
    { choose: [
      { text: 'Bow politely.', then: [{ do: () => n.gesture('bow'), say: '...Oh! Manners! A kappa must always bow back...', wait: 1.6 }, { sound: 'pour', say: 'KWAAAH! My water! My dish! So... weak...' }, 'Fine! FINE! I promise. No more cucumbers from the shop. Kappa\'s honour.', { once: 'promise', give: 800, rel: 2, do: () => L.mem.gossip('yokai', { who: 'kappa', id: 'kappa' }) }] },
      { text: 'Sumo! Right now!', then: ['KWAH! You challenge a kappa?!', { choose: [{ text: 'PUSH!', then: [{ if: () => Math.random() < 0.3, then: ['K-kwah?! You... you won?! Impossible!', { give: 300 }], else: ['KWAHAHA! Too weak! Come back with more rice in you!'] }] }, { text: 'Dodge!', then: ['Kwah? Where did you go? ...You\'re just standing there.'] }], time: 2.2, timeout: 1 }] },
      { text: 'Did you steal cucumbers?', then: ['...No. ...Maybe. They were very lonely cucumbers.'] },
    ], time: 10, timeout: 2 },
  ] }),
});

const KITSUNE = yokai('kitsune', {
  name: 'Kitsune', stranger: 'the white fox', color: '#f4f0ea', salt: 2, chance: 0.6, hitH: 0.8,
  voice: { base: 340, duty: 0.125 }, tts: { pitch: 1.3, rate: 0.95, gender: 'f' },
  first: 'A white fox with... three tails?',
  chat: (L, n, { first }) => ({ start: [
    first ? 'Ara. A human who walks the lane at night. How brave. Or how foolish.' : 'Ara, ara. Back for more riddles?',
    'Answer my riddles, little shopkeeper. Quickly now. Foxes grow bored.',
    { say: 'I am round, I am full of hope, and I am usually a disappointment. What am I?' },
    { choose: [{ text: 'A capsule toy.', value: 1 }, { text: 'The moon.', value: 0 }, { text: 'A rice ball.', value: 0 }], time: 6 },
    { if: (c) => c.vars.choice !== 1, then: 'wrong' },
    'Hmm. Clever. Another. I have a handle but no door. I turn but never leave. I eat coins.',
    { choose: [{ text: 'A vending machine.', value: 0 }, { text: 'A gacha machine.', value: 1 }, { text: 'Mrs. Ota.', value: 0 }], time: 5 },
    { if: (c) => c.vars.choice !== 1, then: 'wrong' },
    'Last one. The more of me you take, the more you leave behind.',
    { choose: [{ text: 'Footsteps.', value: 1 }, { text: 'Money.', value: 0 }, { text: 'Capsules.', value: 0 }], time: 4 },
    { if: (c) => c.vars.choice !== 1, then: 'wrong' },
    'Ara! A clever one. Take this. Fox gold. It will not turn into leaves. ...Probably.',
    { once: 'riddles', give: 3000, rel: 2 },
  ], wrong: ['Wrong! Ohohoho! Come back when you\'re cleverer.', { rel: 0 }] }),
});

const KASA = yokai('kasa', {
  name: 'Kasa-obake', stranger: 'the umbrella', color: '#b8323a', salt: 4, chance: 0.5, hitH: 1.2, roam: [0, 0, 18], speed: 0.9,
  voice: { base: 380, duty: 0.5 }, tts: { pitch: 1.7, rate: 1.25 },
  first: 'An umbrella just hopped past me. With an EYE.',
  chat: (L, n, { first }) => ({ start: [
    first ? 'BERO-BERO-BEROOO! Did I scare you? Did I? DID I?' : 'Bero! It\'s you!',
    { do: () => { L.game.player.shake = 0.4; try { audio.play('pop', { vol: 0.6 }); } catch { /* */ } }, say: '*lick*' },
    { choose: [
      { text: 'Gross!', then: ['Hehehe! Umbrella kisses!'] },
      { text: 'Why are you out at night?', then: ['Nobody uses old paper umbrellas anymore. So I go out on my own. Hop, hop.', { rel: 1 }] },
      { text: 'Want to be the shop umbrella?', then: ['REALLY?! ...No. I\'d get bored. But ask me again when it rains! Bero!', { rel: 2 }] },
    ] },
  ] }),
});

export const MORE = [HATODA, GONTA, KUROMARU, GOMUZO, YABUKI, KUSAKA, KAPPA, KITSUNE, KASA];
