// Knocking on doors: every house along the lane has an intercom at its gate (the click target sits on the intercom
// that src/world/Neighbours.js builds; positions come from town.doors: { id, bell, gate, pos, side }). Ring and
// somebody answers (the lane's named people come out themselves when they're at home, the other neighbours have their
// own little chats), or a family member answers through the intercom, or nobody does. At night people are asleep (or
// very cross). Ring and walk off before they come out: pinpon dash, and they remember. Emits 'doorbell' { house }
// (Gonta's quest listens).
import * as THREE from 'three';
import { Npc } from './Npc.js';
import { createHuman } from '../people/index.js';
import { audio } from '../core/audio.js';
import { opener } from './roster.js';
import { formatYen } from '../core/util.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const NEAR = 5.38, FAR = 14.82;
const hitMat = new THREE.MeshBasicMaterial({ visible: false });
const sfx = (n, o = {}) => { try { audio.play(n, o); } catch { /* audio not ready */ } };

/** Residents who are not part of the lane's cast (built on first answer). */
const RES = {
  suzuki: { name: 'Mr. Suzuki', role: 'Neighbour (salaryman)', preset: 'salaryman', seed: 9, color: '#8aa0c8', tts: { pitch: 0.85 },
    chat: (L, n, f) => ({ start: [...opener(L, n, { first: f, firstHello: ['Ah... you\'re the one who reopened the gacha place. Suzuki. Next to the carport.'], hello: ['Oh. Evening.', 'Ah, it\'s you.'] }), 'My son spends his whole allowance at your shop, you know.', { choose: [{ text: 'Sorry about that!', rel: 1, then: ['Ha. Don\'t be. He\'s happier than I am. I sell insurance.'] }, { text: 'Tell him to bring friends!', then: ['...You\'re a businessman already. Your grandfather would laugh.'] }] }] }) },
  ota: { name: 'Mrs. Ota', role: 'Landlady', preset: 'grandma', seed: 12, color: '#c87a9a', tts: { pitch: 1.0, rate: 0.95 },
    chat: (L, n, f) => {
      const g = L.game, q = g.sideQuests;
      return { start: [...opener(L, n, { first: f, firstHello: ['Hmph. So you\'re the grandchild. I\'m Mrs. Ota. I own half this lane. Including your garage.'], hello: ['Yes?', 'Oh. You.', 'Is this about the rent?'] }),
        { if: () => q?.isActive('ota_prank') && q.stepIndex('ota_prank') === 1, then: ['That Gonta apologised? Well! Maybe you\'re not useless after all.', { advance: 'ota_prank', rel: 2 }] },
        { if: () => !q?.isActive('ota_prank') && !q?.isDone('ota_prank') && L.mem.recent('prank', 4), then: ['Someone keeps ringing my bell and running away. It\'s that Gonta boy, I KNOW it.', { choose: [{ text: 'I\'ll talk to him.', quest: 'ota_prank', then: ['Make him apologise. Properly.'] }, { text: 'Kids will be kids.', rel: -1, then: ['Kids will be kids. Landladies will be landladies. Remember that on rent day.'] }] }] },
        { choose: [{ text: 'When is rent due?', then: [() => rentLine(g)] }, { text: 'Lovely bonsai.', rel: 1, then: ['...It\'s forty years old. Older than you. Don\'t touch it.'] }, { text: 'Sorry to bother you.', then: ['Hmph.'] }] }] };
    } },
  kimura: { name: 'Mrs. Kimura', role: 'Next-door neighbour', preset: 'mom', seed: 22, color: '#e8a070',
    chat: (L, n, f) => ({ start: [...opener(L, n, { first: f, firstHello: ['Oh! Hello, neighbour! I\'m Kimura. Right next door. We share a wall!'], hello: ['Hi, neighbour!', 'Oh, hello!'] }), 'The machines go "gachan, gachan" all afternoon. I like it, actually. It sounds like business.', { choose: [{ text: 'Is it too loud?', rel: 1, then: ['Not at all! Louder than the trains? Never.'] }, { text: 'Want a free turn?', rel: 2, then: ['Oh, you\'re sweet! Maybe tomorrow. I made too much curry, by the way. I\'ll bring some by.', { remember: 'promised curry' }] }] }] }) },
  tanaka: { name: 'Mrs. Tanaka', role: 'Neighbour (Pichat)', preset: 'grandma', seed: 41, color: '#c8a0e0', tts: { pitch: 1.2, rate: 0.9 },
    chat: (L, n, f) => ({ start: [...opener(L, n, { first: f, firstHello: ['Oh my! Grandpa\'s little one, all grown up! Come in, come in... well, not IN. But hello!'], hello: ['Oh, it\'s you, dear!', 'Hello, dear! Have you eaten?'] }), { choose: [
      { text: 'How is your radio?', then: ['Still works perfectly! Your grandfather fixed it so well it outlived him.'] },
      { text: 'How is Kenta?', then: ['My grandson? He still wants that secret Neko Cafe figure. Ho ho. Some day!'] },
      { text: 'Have some tea with me?', rel: 1, then: ['Oh, how lovely. ...', { wait: 1.2 }, 'Ahh. Nothing like tea with a neighbour. Come by any time, dear.'] },
    ] }] }) },
  mori: { name: 'Mr. Mori', role: 'Neighbour (hard of hearing)', preset: 'grandpa', seed: 33, color: '#b8a888', tts: { pitch: 0.75, rate: 0.85, volume: 1 },
    chat: () => ({ start: [{ say: 'EH? WHO IS IT?', style: 'shout' }, { choose: [{ text: 'Hello, Mr. Mori!', then: [{ say: 'JELLO? NO THANK YOU! WE HAVE PLENTY!', style: 'shout' }] }, { text: 'I run the gacha shop!', then: [{ say: 'THE GOTCHA SHOP? WHAT DID YOU GOTCHA?', style: 'shout' }, { say: '...HAHAHA! JUST KIDDING. I HEARD YOU. NICE TO MEET YOU.', style: 'shout', rel: 1 }] }, { text: '(Wave and leave)', silent: true, then: [{ say: 'BYE BYE!', style: 'shout' }] }] }] }) },
  watanabe: { name: 'Mrs. Watanabe', role: 'Neighbour (new mum)', preset: 'mom', seed: 18, color: '#e890b0', tts: { pitch: 1.1 },
    chat: (L, n) => ({ start: [{ say: 'Shhh! The baby JUST fell asleep!', style: 'think' }, { choose: [{ text: '(whisper) Sorry!', rel: 1, then: ['(whisper) It\'s okay. Come back when she\'s awake. She likes the colourful capsules.'] }, { text: 'IS THIS A BAD TIME?', rel: -2, then: [{ sound: 'error', say: '...She\'s awake now. Thanks.' }] }], time: 5, timeout: 1 }] }) },
  yamada: { name: 'Mrs. Yamada', role: 'Kuromaru\'s mother', preset: 'mom', seed: 7, color: '#d0a8d8',
    chat: (L, n) => ({ start: ['Oh! Are you one of Hiroshi\'s friends? He doesn\'t... have many.', { choose: [{ text: 'You mean Lord Kuromaru?', then: ['...Is that what he calls himself now? Oh dear. Please be nice to him. He\'s a good boy.'] }, { text: 'Yes, I\'m a friend.', rel: 1, then: ['Oh, how wonderful! I\'ll tell him! HIROSHI! A FRIEND CAME BY!'] }] }] }) },
  gontaMom: { name: 'Gonta\'s mum', role: 'Sakura Heights 101', preset: 'mom', seed: 5, color: '#f0c040',
    chat: (L, n) => ({ start: [{ say: 'GONTA! ...Oh. Sorry. I thought you were him. Is he in trouble again?', style: 'shout' }, { choose: [{ text: 'He pranked me.', then: ['Of course he did. I\'ll take his snacks away. Again.'] }, { text: 'No, just saying hello.', rel: 1, then: ['That\'s a first! Hello!'] }] }] }) },
};
function rentLine(g) {
  const due = g.bills?.due?.().find((b) => b.kind === 'rent');
  if (due && g.clock) { const d = due.due - g.clock.day; return d > 0 ? `Rent is due in ${d} day${d === 1 ? '' : 's'}. ${formatYen(due.amount || 0)}. Don't be late.` : d === 0 ? 'Rent is due TODAY. I\'ll be watching.' : `Your rent is ${-d} day${d === -1 ? '' : 's'} LATE. Ota Real Estate does not forget.`; }
  return 'The 27th, same as always. Your grandfather was never late. Not once.';
}

/** Mrs. Ota's quest (Gonta's side is in roster2.js). */
export const DOOR_QUESTS = [{
  id: 'ota_prank', title: 'Ding-dong, you\'re caught', giver: 'ota', giverName: 'Mrs. Ota', color: '#c87a9a',
  steps: [
    { text: 'Make Gonta apologise to Mrs. Ota', sub: 'He runs around the lane after school', talk: 'gonta' },
    { text: 'Tell Mrs. Ota', sub: 'Ring her bell (east side, behind the gate)', talk: 'ota' },
  ],
  reward: { money: 1000, text: 'The landlady approves (a little)' },
}];

/** The houses of the lane: bell = the intercom at the gate, door = their front door, who = a lane person or resident.
 *  The coordinates below are fallbacks: town.doors (src/world/Neighbours.js) overrides bell / door / gate / side. */
const HOUSES = [
  { id: 'suzuki', family: 'Suzuki', bell: [6.65, NEAR], door: [6.65, 1.4], res: 'suzuki' },
  { id: 'ota', family: 'Ota', bell: [14.1, NEAR], door: [14.25, 3.9], res: 'ota' },
  { id: 'heights', family: 'Sakura Heights 101', bell: [19.95, NEAR], door: [19.95, 2.4], npc: 'gonta', res: 'gontaMom', out: 'Gonta? Out causing trouble. As usual.' },
  { id: 'kusaka', family: 'Kusaka', bell: [22.7, NEAR], door: [23.0, 3.4], npc: 'kusaka', out: null },
  { id: 'kimura', family: 'Kimura', bell: [-5.55, NEAR], door: [-6.45, 3.4], res: 'kimura' },
  { id: 'tanaka', family: 'Tanaka', bell: [-13.15, NEAR], door: [-12.45, 3.7], res: 'tanaka' },
  { id: 'tobacco', family: 'the old tobacco shop', bell: [-18.0, NEAR], door: null, empty: 'CLOSED FOR GOOD. THANK YOU FOR 40 YEARS.' },
  { id: 'hatoda', family: 'Hatoda', bell: [-22.2, NEAR], door: [-21.95, 2.2], npc: 'hatoda', out: null },
  { id: 'yabuki', family: 'Yabuki', bell: [-21.7, FAR], door: [-22.15, 16.1], npc: 'yabuki', note: 'A note on the gate: OUT ON PATROL. DO NOT DISTURB THE BUSH.' },
  { id: 'mori', family: 'Mori', bell: [-19.0, FAR], door: [-19.0, 15.9], res: 'mori' },
  { id: 'watanabe', family: 'Watanabe', bell: [-3.95, FAR], door: [-4.8, 16.5], res: 'watanabe' },
  { id: 'josuke', family: 'Josuke\'s house', bell: [1.6, FAR], door: [1.5, 16.4], npc: 'josuke', out: 'Josuke? He\'s out with that Okuyasu boy. Try the vending machines.' },
  { id: 'okuyasu', family: 'Okuyasu\'s house', bell: [6.85, FAR], door: [6.85, 15.8], npc: 'okuyasu', out: null },
  { id: 'yamada', family: 'Yamada', bell: [11.5, FAR], door: [11.5, 18.2], npc: 'kuromaru', res: 'yamada', out: 'Hiroshi? Out "communing with the darkness". He\'ll be back for dinner.' },
  { id: 'forrent', family: 'For rent', bell: [16.85, FAR], door: null, empty: 'A sign: FOR RENT. Nobody lives here.' },
  { id: 'garage6', family: 'Rental garage', bell: [22.25, FAR], door: [22.25, 15.4], npc: 'gomuzo', out: null, knockOnly: true },
  { id: 'rohan', family: 'Kishibe', bell: [10.55, -2.85], door: [10.55, -2.6], npc: 'rohan', note: 'A sign on the gate: NO VISITORS. THIS MEANS YOU.', grumpy: true },
];

/** Take each house's intercom, gate and front door from the town (Neighbours.js builds them and lists town.doors). */
function fromTown(game) {
  const list = game.garage?.town?.doors;
  if (!Array.isArray(list)) return;
  for (const H of HOUSES) {
    const d = list.find((e) => e.id === H.id);
    if (!d) continue;
    if (d.bell) { H.bell = [d.bell.x, d.bell.z]; H.bellY = d.bell.y; }
    if (d.pos) H.door = [d.pos.x, d.pos.z];
    if (d.gate) H.gate = [d.gate.x, d.gate.z];
    H.side = d.side; // +1: the house faces +z (near side, the villa), -1: faces -z (far side)
    H.atDoor = !!d.atDoor; // apartments: the bell is at the flat's own door
  }
}
/** +1 if the street is toward +z from this house's gate. */
const outward = (H) => H.side ?? (H.bell[1] > 10 ? -1 : 1);

export class Doors {
  constructor(game, lane) {
    this.game = game;
    this.lane = lane;
    this.residents = {};
    this.busy = null;
    this.rings = {};
    fromTown(game);
    for (const H of HOUSES) this.add(H);
  }

  add(H) {
    const g = this.game, out = outward(H);
    const box = new THREE.Mesh(new THREE.BoxGeometry(H.atDoor ? 0.5 : 0.7, H.atDoor ? 0.7 : 1.4, 0.3), hitMat);
    box.position.set(H.bell[0], H.atDoor ? H.bellY ?? 1.3 : 1.05, H.bell[1] - out * 0.12);
    box.name = 'doorbell:' + H.id;
    g.scene.add(box);
    H.box = box;
    g.interaction.add(box, {
      reach: 2.3,
      hint: (held) => {
        if (this.busy || g.talk?.active) return null;
        if (held && held.kind !== 'tool') return null;
        return { key: 'LMB', text: H.knockOnly ? 'Knock on the garage door' : 'Ring the doorbell', sub: H.family + (H.empty ? '' : ' · knock knock') };
      },
      use: () => { if (!this.busy) this.ring(H); return false; },
      noHighlight: true,
    });
  }

  /** The bell's own position (lines from the intercom float there). */
  speaker(H) { const p = new THREE.Vector3(H.bell[0], (H.bellY ?? 1.0) + 0.55, H.bell[1]); return () => p; }

  intercom(H, text, style = 'say') {
    const g = this.game;
    g.bubbles.say(this.speaker(H), text, { style, dur: Math.max(2.6, 1.2 + text.length * 0.05), onChar: (ch) => { if (/[a-z]/i.test(ch) && Math.random() < 0.4) sfx('voice', { ch, base: 200, duty: 0.5, vol: 0.5 }); } });
  }

  async ring(H) {
    const g = this.game, L = this.lane, now = g.clock?.stamp ?? 0;
    this.busy = H;
    const at = new THREE.Vector3(H.bell[0], 1.2, H.bell[1]);
    if (H.knockOnly) { for (let i = 0; i < 3; i++) setTimeout(() => sfx('thud', { pos: at, vol: 0.7 }), i * 180); } else sfx('doorbell', { pos: at, vol: 0.8 });
    g.events.emit('doorbell', { house: H.id });
    const r = this.rings[H.id] = this.rings[H.id] && now - this.rings[H.id].t < 30 ? { t: now, n: this.rings[H.id].n + 1 } : { t: now, n: 1 };
    try {
      await this.wait(1.6);
      // empty houses, notes on the gate
      if (H.empty) { g.monologue?.say(H.empty); return; }
      const n = H.npc ? L.npc(H.npc) : null;
      const night = L.hour >= 22 || L.hour < 6.5;
      if (night && !(n && n.def.yokai)) {
        if (r.n >= 2) { this.intercom(H, pick(['Do you know what time it is?!', 'GO HOME! It\'s the middle of the night!', 'I\'m calling the police!']), 'shout'); if (n) L.mem.rel(n.id, -1); L.mem.gossip('noise', { who: H.family }); }
        else g.monologue?.say(pick(['No answer. Everyone\'s asleep.', 'Dark windows. They\'re asleep.']));
        return;
      }
      if (n && n.present) {
        // the lane person is out: someone else answers, or nobody does
        if (H.note) g.monologue?.say(H.note);
        else if (H.out) this.intercom(H, H.out);
        else g.monologue?.say(pick(['No answer.', 'Nobody home.']));
        return;
      }
      if (H.grumpy) { this.intercom(H, r.n > 1 ? 'I SAID: GO. AWAY.' : 'Go away. I\'m working.', r.n > 1 ? 'shout' : 'say'); if (r.n > 1) L.mem.rel(H.npc, -1); return; }
      if (!n && !H.res) { g.monologue?.say('No answer.'); return; }
      this.intercom(H, pick(['Coming!', 'Just a moment!', 'Yes, yes, coming...']));
      await this.wait(2.4);
      const who = n || this.resident(H);
      if (!who) return;
      await this.answer(H, who);
    } finally { this.busy = null; }
  }

  wait(sec) { return this.game.talk ? this.game.talk.wait(sec) : new Promise((r) => setTimeout(r, sec * 1000)); }

  /** A resident who isn't part of the lane cast: a plain neighbour (built once). */
  resident(H) {
    const R = RES[H.res];
    if (!R) return null;
    if (!this.residents[H.res]) {
      const def = { id: H.res, name: R.name, role: R.role, color: R.color, tts: R.tts, build: () => createHuman({ preset: R.preset, seed: R.seed }) };
      const n = new Npc(this.game, this.lane.group, def);
      n.mem = this.lane.mem.person(H.res);
      n.setPresent(false);
      n.res = R;
      this.residents[H.res] = n;
    }
    return this.residents[H.res];
  }

  /** They come out to the gate, chat, and go back in. */
  async answer(H, n) {
    const g = this.game, L = this.lane;
    const door = new THREE.Vector3(H.door[0], 0, H.door[1]);
    // they step out through the gate onto the lane side, where you can see them (flats: just outside their door)
    const out = outward(H), gx = H.gate ? H.gate[0] : H.bell[0] + 0.35, gz = H.gate ? H.gate[1] : H.bell[1];
    const inside = H.atDoor ? [] : [new THREE.Vector3(gx, 0, gz - out * 0.3)];
    const gate = H.atDoor ? new THREE.Vector3(door.x + 0.2, 0, door.z + out * 0.45) : new THREE.Vector3(gx + 0.15, 0, gz + out * 0.45);
    const own = !!L.list.includes(n);
    if (own) { L.cancel(n); n.activity = 'door'; }
    n.place(door, Math.atan2(gate.x - door.x, gate.z - door.z));
    n.setPresent(true);
    sfx('slideDoor', { pos: door.clone().setY(1), vol: 0.5 });
    n.walk([...inside, gate], { face: Math.atan2(g.player.pos.x - gate.x, g.player.pos.z - gate.z) });
    n.ghost = true;
    await g.talk.until(() => !n.walking);
    n.ghost = false;
    n.faceTo(g.player.pos);
    if (g.player.pos.distanceTo(gate) > 4.5) {
      // pinpon dash!
      n.say(pick(['Hello? ...Hmph. Kids.', 'Is anyone there? ...Honestly.']));
      L.mem.rel(n.id, -1);
      L.mem.gossip('dash', { who: H.family });
    } else {
      L.mem.meet(n.id);
      const sc = own ? null : n.res.chat(L, n, !n.mem.talks);
      if (own) await L.chat(n);
      else await g.talk.start(n, sc, { id: n.id });
      n.mem.seen = g.clock?.stamp ?? 0;
    }
    await this.wait(0.6);
    n.walk([...inside, door]); n.ghost = true;
    await g.talk.until(() => !n.walking);
    n.ghost = false;
    n.setPresent(false);
    if (own) n.activity = null;
  }

  update(dt) { for (const n of Object.values(this.residents)) if (n.present) n.update(dt); }
}
