// People of the lane: passers-by walk from tunnel to tunnel and live a little on the way. Who walks by depends on the
// hour and the day (src/npc/street.js: the morning commute to the station, students in pairs, the locals' shopping,
// lunch, the evening return, a tipsy salaryman humming home late at night...), and each has a few errands from a
// varied menu: the capsule machines out front, the notice board, a can from a vending machine, a cigarette by
// Mikawa-ya's ashtray, the pager, the shop bench, the post box, shopping inside Mikawa-ya; pairs walk side by side and
// chat, two neighbours who meet stop for a natter, dog walkers wait while the dog sniffs a pole, a cyclist rings
// the bell. Everyone steers (src/people/crowd.js: no walking through each other, the player, props or the garbage
// truck; keep left; smooth starts, stops and turns) and notices things (src/people/aware.js: glances, greetings by
// the time of day, gasps when you slap someone).
// Promote the shop (hand out flyers: they stop, read the actual sheet you gave them and react to it) and more of them
// come by; once GACHA GARAGE is open some turn in: they queue when a machine is busy (and shuffle forward), look at the
// display card, count coins out of their purse, hesitate at a steep price, feed the coins in, turn the handle, bend for
// the capsule, twist it open and react (a jump, a sigh, showing a friend), bin the shell in the return box and leave
// (sometimes after a second go). The coins go into the machine's coin box.
// Customers have a bit of personality: they ask you things when you're close ("Is the secret one in there?": a quick
// timed reply floats up, ignore them and they're offended), haggle over the figures you've priced on acrylic stands
// (click them for a cinematic haggle), complain (and write it in the guestbook by the door: src/talk/guestbook.js),
// react when slapped (each in their own way), bin their empty shells or drop them on your floor.
// Click anyone for a chat (src/talk/Talk.js); RMB slaps. Also the shopkeeper behind Mikawa-ya's counter.
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { GARAGE, MACHINE_SLOTS } from './Garage.js';
import { createHuman, Bubbles, HUMAN_PRESETS, prebuildHuman, takeHuman, humanReady } from '../people/index.js';
import { capsuleCost } from '../game/economy.js';
import { formatYen } from '../core/util.js';
import { talk } from '../people/voice.js';
import { profileOf } from '../talk/speech.js';
import { BIZARRE } from '../people/bizarre.js';
import { menace } from '../ui/menacing.js';
import { FLYERS, FLYER_BY_ID, FLYER_W, FLYER_H, flyerTexture } from '../gfx/flyers.js';
import { SERIES_BY_ID, getItem } from '../data/series/index.js';
import { RARITIES } from '../data/rarity.js';
import { crowdOf } from '../people/crowd.js';
import { awareOf } from '../people/aware.js';
import { streetDirector, ERRANDS, ARCH, TALK, SAY, SURNAMES, LANE_NEAR, LANE_FAR } from '../npc/street.js';
import { StreetDog, Lead, Cart, DOG_KINDS } from '../npc/streetProps.js';
import { propMesh } from './props.js';
import '../npc/poses.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _look = new THREE.Vector3(), _hand = new THREE.Vector3();
const hitMat = new THREE.MeshBasicMaterial({ visible: false });
const V = (x, z) => new THREE.Vector3(x, 0, z);
const LANE_END = 35;
const sfx = (n, o = {}) => { try { audio.play(n, o); } catch { /* audio not ready */ } };
const inGarage = (p) => Math.abs(p.x) < GARAGE.maxX && p.z < GARAGE.maxZ + 0.1 && p.z > GARAGE.minZ;

const LINES = {
  closed: ['That old garage has been shut for years...', 'I used to buy capsule toys here as a kid.', 'Is someone cleaning the old gacha place?', 'Hm? Light in the garage?'],
  open: ['Oh! The gacha garage is open again!', 'Capsule toys? Just one go...', 'I remember this place!', 'Ooh, what series do they have?'],
  stroll: ['Getting chilly in the evenings.', 'The 6:40 train is late again.', 'Did I leave the rice cooker on?', 'Nice sunset today.', 'I should call my mother.',
    'Yare yare... the train is late again.', 'They say the alley by Mikawa-ya is haunted. Never look back in there!', 'Is that a reference? It is, isn\'t it.',
    'My horoscope said: beware of capsule toys.', 'Good grief. Mondays.', 'Is that man in the bush... watching us?', 'So many pigeons today.'],
  flyer: ['A flyer? Oh, a gacha shop! I will take a look.', 'Thank you! Capsule toys, how nostalgic.', 'Ooh, cute. My kid will love this.'],
  afterFlyer: ['I will take a look later!', 'Thanks! I will keep this one.', 'I will tell my friends.', 'Okay, okay, I am curious now.'],
  play: ['Here goes...', 'Come on, the rare one...', 'One more turn, just one!', 'Please be the cat one...'],
  win: ['Yes! The one I wanted!', 'No way, a rare!', 'Look how tiny and detailed!', 'So cute!', 'Yes! Yes! YES!', 'This must be the work of fate!', 'NICE!'],
  meh: ['Aww, I already have this one.', 'Next time...', 'Hm, not bad.', 'A double. Typical.', 'Yare yare daze. A duplicate.', 'Useless, useless, USELESS!'],
  bye: ['Thanks! I will come back.', 'See you!', 'I will tell my friends about this place.', 'What a nice little shop.', 'Arigatou!'],
  excuse: ['Sumimasen!', 'Excuse me!', 'Shitsurei.', 'Oops, sorry!', 'Oh? You\'re approaching me?'],
  keeper: ['Welcome! Irasshaimase!', 'Ah, Grandpa\'s kid! Need anything?', 'Milk is in the fridge, brooms by the door.', 'Come again!'],
  ignored: ['Hello? ...Rude.', 'I asked you something!', 'Fine, don\'t answer.'],
  dirty: ['Ugh, empty capsules everywhere.', 'This floor... is that litter?'],
  enter: ['Ojama shimasu.', 'Hello~', 'Excuse me~'],
  queue: ['I\'ll wait.', 'After you.', 'Busy today!'],
  crowded: ['So crowded... another time.', 'Every machine is taken. Next time!'],
  giveUp: ['Too slow... I\'ll come back.', 'Never mind, I have a train to catch.'],
  hesitate: (p) => [`Hmm... ${p} a turn...`, `${p}? Hmm...`, `${p}... should I?`],
  again: ['One more!', 'Just one more...', 'Again! I can feel it!'],
  showMate: ['Look look!', 'Look what I got!', 'Ta-da!'],
  mateSees: ['Sugoi!', 'Lucky!', 'Cute!', 'Let me see!'],
  seeSlap: ['I\'m... going to go.', 'This shop is scary.', 'Eek! I\'m leaving!'],
};
// customers' reactions to a slap, by who they are
const SLAPPED = {
  kid: { line: ['WAAAAH! MOMMY!', 'You hit me! I\'m telling!'], gesture: 'cower', run: true },
  grandma: { line: ['Well I never! In MY day...!', 'Hmph! Take THAT!'], gesture: 'stomp', whack: true },
  grandpa: { line: ['Young people today! No respect!', 'I fought in... well, I fought my brother once!'], gesture: 'stomp' },
  salaryman: { line: ['I will be contacting my lawyer.', 'That is... a workplace incident.'], gesture: 'shrug' },
  office_lady: { line: ['Excuse me?! Unbelievable.', 'I am writing a review about this.'], gesture: 'stomp' },
  gyaru: { line: ['Omg?! I\'m posting this. Smile!', 'Ew, rude! Photo for evidence!'], gesture: 'photo' },
  otaku: { line: ['...My first slap. From a shopkeeper. Interesting.', 'This is just like chapter 34...'], gesture: 'think' },
  tourist: { line: ['Is this... a Japanese custom?!', 'Ow! Nobody told me about this in the guidebook!'], gesture: 'shrug' },
  default: { line: ['Ow!', 'HEY!', 'What was that for?!', 'Did you just slap me?!'], gesture: 'stomp' },
};
const LOCAL = new Set(['grandma', 'grandpa', 'mom', 'shopkeeper']);
const YOUNG = new Set(['schoolgirl', 'schoolboy', 'gyaru', 'kid']);
const ELDER = new Set(['grandma', 'grandpa']);

/** A customer's turn on a machine without a coin box: one capsule leaves the stock (and its window pile). */
function takeCapsule(m) {
  const st = m.data.stock;
  const series = st.splice(Math.floor(Math.random() * st.length), 1)[0];
  if (m.pile?.length) {
    let best = 0;
    for (let i = 1; i < m.pile.length; i++) if (m.pile[i].pos.y < m.pile[best].pos.y) best = i;
    const b = m.pile.splice(best, 1)[0];
    m.pileWorld.removeBody(b);
    for (const o of m.pile) o.wake();
    m.pileActive = 2;
    if (st.length > m.pile.length && m.pile.length < m.maxVisible) m.addPileCapsule(st[m.pile.length]);
  }
  return series;
}

export class Pedestrians {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.group = new THREE.Group();
    game.scene.add(this.group);
    this.bubbles = game.bubbles || (game.bubbles = new Bubbles(game.camera, document.body));
    this.spawnT = 3;
    this.ambT = 6;
    this.seed = (game.state.seed || 1) % 100000;
    this.open = !!game.state.story?.complete;
    this.askT = 20;
    this.time = 0;
    this.steer = crowdOf(game);
    this.aware = awareOf(game);
    this.director = streetDirector(game);
    this.buildKeeper();
    this.prebuildNext();
    game.events.on('slap', (e) => this.onSlap(e));
  }

  get promo() { return this.game.state.promo || (this.game.state.promo = { flyers: 0, level: 0 }); }
  /** The design on top of your stack: the stack cycles through every flyer as you hand them out. */
  nextFlyer() { return FLYERS[(this.promo.flyers || 0) % FLYERS.length].id; }
  setOpen(v) { this.open = v; this.spawnT = Math.min(this.spawnT, 4); }

  /** Promotion level 0..5 from flyers handed out (+1 each 8 flyers) and shop goods. */
  level() {
    const g = this.game, p = this.promo;
    let lv = Math.floor(p.flyers / 8);
    if (g.state.goods?.neon_open) lv += 1;
    if (g.state.npcs?.people?.rohan?.flags?.poster) lv += 1; // Rohan's poster on the shop front
    return Math.min(5, lv);
  }

  // the quality preset's crowd factor thins the passers-by on slower machines (each one is a skinned, animated person);
  // more of the ones who do come by turn in (spawn), so the shop gets about the same number of customers
  get crowd() { return this.game.renderer?.quality?.crowd ?? 1; }
  maxPeople() { return this.open ? Math.max(2, Math.round((2 + this.level() * 2) * this.crowd)) : 1; }
  interval() { return this.open ? 26 / (1 + this.level() * 0.6) : 45; }
  shopOpen() { return this.open && (!this.game.sim?.isOpen || this.game.sim.isOpen()); }

  // ------------------------------------------------------------------ the shopkeeper of Mikawa-ya
  buildKeeper() {
    const shop = this.game.garage.town?.cornerShop;
    if (!shop?.keeper) return;
    const h = createHuman({ preset: HUMAN_PRESETS.find((p) => /keeper|shop/i.test(p.id))?.id, seed: 77 });
    h.root.position.copy(shop.keeper.pos);
    h.root.rotation.y = shop.keeper.rotY;
    h.tts = { ...profileOf(h), pitch: 1.1, rate: 0.95 };
    this.group.add(h.root);
    this.keeper = { h, greetT: 0, near: false, name: 'Mrs. Mikawa', id: 'keeper' };
  }

  updateKeeper(dt) {
    const k = this.keeper;
    if (!k) return;
    const pl = this.game.player.pos;
    const d = Math.hypot(pl.x - k.h.root.position.x, pl.z - k.h.root.position.z);
    const near = d < 3.4;
    k.greetT -= dt;
    if (near && !k.near && k.greetT <= 0) { this.say(k.h, pick(LINES.keeper)); k.h.gesture('bow'); k.greetT = 25; }
    k.near = near;
    if (d > 30) return;
    // animation: full rate up close, a few frames a second farther away or off screen (like the passers-by: performance,
    // fewer bone uploads)
    const talking = this.bubbles.isTalking(k.h);
    let adt = dt;
    if (d > 9 && !talking) {
      k.lodT = (k.lodT || 0) - dt; k.acc = (k.acc || 0) + dt;
      if (k.lodT > 0) return;
      _v.copy(k.h.root.position); _v.y += 1;
      const v = _v.project(this.game.camera);
      k.lodT = v.z < 1 && Math.abs(v.x) < 1.15 && Math.abs(v.y) < 1.2 ? (d > 25 ? 0.15 : 0.05) : 0.4;
      adt = Math.min(0.1, k.acc); k.acc = 0;
    }
    k.h.update(adt, { speed: 0, lookAt: k.look || (near ? this.game.camera.position : null), talking });
  }

  // ------------------------------------------------------------------ spawning
  // performance: the next passer-by (or pair) is built and painted in the background, in idle time
  // (src/people/prebuild.js), so a spawn takes finished people instead of building them on the spot
  prebuildNext() {
    this.next = this.director.unit(() => this.seed++);
    for (const m of this.next.members) prebuildHuman(m, this.game.renderer?.renderer);
  }
  unitReady() { return !this.next || this.next.members.every((m) => humanReady(m)); }

  /** Someone (or a pair) walks into the lane from a tunnel. role: 'customer' (the sim's flow) | 'ambient' (the
   *  commute and other rush-hour walkers on top of it). Returns the (first) person. */
  spawn(role = 'customer') {
    const g = this.game, u = this.next;
    this.prebuildNext();
    const A = ARCH[u.arch] || ARCH.visitor;
    const dir = u.dir;
    const laneZ = dir > 0 ? LANE_NEAR + rnd(-0.55, 0.25) : LANE_FAR + rnd(-0.2, 0.7);
    const x0 = -dir * LANE_END;
    let lead = null;
    u.members.forEach((m, i) => {
      const h = takeHuman(m) || createHuman(m);
      const side = i === 0 ? 0 : (dir > 0 ? 1 : -1);
      h.root.position.set(x0 - dir * i * 0.5, 0, laneZ + side * 0.62);
      h.root.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      this.group.add(h.root);
      const p = this.makePerson(h, u, A, dir, laneZ + side * 0.62, role);
      if (i === 0) lead = p;
      else { p.leader = lead; lead.mate = p; p.mate = lead; p.side = side; p.state = 'follow'; p.path = []; this.director.counts.pairs++; }
    });
    // will they come in? collectors may come for the figures on the stands instead of (or as well as) the machines
    if (role !== 'ambient' && A.shop !== false && this.open && Math.random() < Math.min(0.95, (0.18 + this.level() * 0.1) / this.crowd)) lead.wantsIn = true;
    if (role !== 'ambient' && A.shop !== false && this.open && ['otaku', 'tourist', 'salaryman', 'gyaru', 'office_lady'].includes(lead.kind) && Math.random() < 0.45) lead.collector = true;
    lead.plan = this.director.plan(lead);
    // a granny with her shopping cart is off to Mikawa-ya, mostly
    if (lead.cart && !lead.plan.some((e) => e.kind === 'mikawaya') && Math.random() < 0.75) { const poi = this.director.choosePoi('mikawaya', lead); if (poi) { lead.plan.push({ kind: 'mikawaya', poi, x: poi.x }); lead.plan.sort((a, b) => (a.x - b.x) * lead.dir); } }
    this.director.counts.spawned++;
    if (role === 'ambient') this.director.counts.ambient++;
    return lead;
  }

  makePerson(h, u, A, dir, laneZ, role) {
    const g = this.game;
    h.tts = profileOf(h);
    h.mesh.raycast = () => {};
    const r = h.root;
    const kind = h.spec.id;
    const rush = u.arch === 'commuter' ? 1.06 : 1;
    const p = {
      h, path: [V(dir * LANE_END, laneZ)], state: 'stroll', speed: rnd(A.speed[0], A.speed[1]) * rush * (h.height < 1.35 ? 1.15 : 1), t: 0, chatT: rnd(4, 14),
      lane: { z: laneZ, x0: -LANE_END, x1: LANE_END }, visited: false, flyer: false, wait: 0,
      kind, name: `the ${(h.spec.name || 'customer').toLowerCase()}`, patience: rnd(0.3, 1), mood: 0, voice: talk(h), tts: h.tts, asked: false, lodT: Math.random() * 0.2, acc: 0,
      arch: u.arch, dir, laneZ, sex: h.spec.sex, local: LOCAL.has(kind) || u.arch === 'local' || u.arch === 'dogwalker', young: YOUNG.has(kind), surname: pick(SURNAMES),
      ambient: role === 'ambient', props: [], claims: [], plan: [], job: null, jobW: null, face: null, lookAt: null, focus: false,
    };
    // steering, awareness
    p.a = this.steer.agent(r.position, { r: u.arch === 'cyclist' ? 0.42 : 0.24, kind: 'ped', owner: p });
    p.aw = this.aware.add({
      h, pos: r.position, yaw: () => r.rotation.y, local: p.local, young: p.young, polite: ELDER.has(kind),
      busy: () => p.talking || !!p.leaveT || u.arch === 'cyclist',
      say: (text, style) => this.sayNear(p, text, style, undefined, true),
      canGesture: () => !p.h.currentGesture && !p.sit,
      greet: (w) => (Math.random() < (p.local ? 0.75 : 0.45) ? w : null),
      onReact: (kind2, n) => this.onSee(p, kind2, n),
    });
    // a simple box to click / slap (the skinned body doesn't need to be ray-tested)
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.55, h.height * 0.95, 0.5), hitMat);
    box.position.y = h.height * 0.48;
    box.userData.human = h;
    r.add(box);
    p.hit = box;
    g.interaction.add(box, {
      reach: 2.6,
      hint: (held) => {
        if (g.talk?.active) return null;
        if (g.held.holding('flyers') && !p.flyer && this.flyerable(p)) return { key: 'LMB', text: 'Hand out a flyer' };
        if (held && held.kind !== 'tool') return null;
        if (p.haggle && !p.haggle.done) return { key: 'LMB', text: `${cap(p.name)} wants to buy a figure`, sub: `${p.haggle.name} · ${formatYen(p.haggle.price)} on the tag · RMB: slap` };
        return { key: 'LMB', text: `Talk to ${p.name}`, sub: 'RMB: slap' };
      },
      use: () => { if (g.held.holding('flyers') && !p.flyer && this.flyerable(p)) this.giveFlyer(p); else this.chat(p); return false; },
      alt: () => { g.fp?.slap?.(); },
      noHighlight: true,
    });
    // the archetype's own things: a dog on a lead, a granny cart, a bicycle, a jog, a tipsy sway
    if (A.dog) {
      const dog = p.dog = new StreetDog(g, pick(DOG_KINDS));
      dog.pos.set(r.position.x + dir * 0.8, 0, r.position.z + 0.3);
      dog.heading = r.rotation.y;
      dog.name = pick(SAY.dogNames);
      dog.a = this.steer.agent(dog.pos, { r: 0.2, kind: 'dog', owner: p });
      dog.sniffT = 0; dog.nextSniff = rnd(6, 14);
      p.lead = new Lead(g.scene);
      h.gesture('leash');
      this.director.count('dogwalk');
    }
    if (kind === 'grandma' && (u.arch === 'local') && Math.random() < 0.45) {
      p.cart = new Cart(g.scene);
      h.gesture('pull_cart');
      p.speed *= 0.92;
      this.director.count('cart');
    }
    if (A.bike) {
      const bike = propMesh('mamachari', { castShadow: true });
      if (bike) { bike.position.set(0, 0, 0.2); r.add(bike); p.props.push(bike); p.bike = bike; }
      h.sit(0.84); h.sitK = 1; h.pedal = 0;
      h.gesture('handlebar');
      p.bellT = 0;
      this.director.count('cycle');
    }
    if (A.jog) { h.jog = 1; this.director.count('jog'); }
    if (A.tipsy) { h.tipsy = 1; h.setExpression('happy', 0); p.humT = rnd(2, 5); p.hicT = rnd(6, 12); this.director.count('tipsy'); }
    this.list.push(p);
    return p;
  }

  remove(p) {
    this.hideSheet(p);
    this.game.interaction.remove(p.hit);
    this.bubbles.clear?.(p.h);
    this.releaseMachine(p);
    this.director.releaseAll(p);
    this.steer.remove(p.a);
    this.aware.remove(p.aw);
    for (const m of p.props) m.removeFromParent();
    if (p.dog) { this.steer.remove(p.dog.a); p.dog.dispose(); p.lead?.dispose(); }
    p.cart?.dispose();
    p.h.root.parent?.remove(p.h.root);
    p.h.dispose?.();
    const i = this.list.indexOf(p);
    if (i >= 0) this.list.splice(i, 1);
    if (p.mate) { const m = p.mate; p.mate = null; m.mate = null; if (m.leader === p) { m.leader = null; if (this.list.includes(m) && m.state === 'follow') this.walkOn(m); } }
  }

  /** Back to walking the lane toward the end they were heading for. */
  walkOn(p) {
    p.state = 'stroll';
    p.job = null; p.jobW = null;
    p.path = [V(p.dir * LANE_END, p.laneZ)];
    p.face = null; p.lookAt = null; p.focus = false; p.followSpeed = null; p.goSpeed = null;
  }
  flyerable(p) { return p.state === 'stroll' || p.state === 'follow' || (p.state === 'errand' && !p.sit); }

  /** Menacing ゴゴゴ beside someone, if they're on screen. */
  menaceOver(h) {
    const v = h.headTop(new THREE.Vector3()).project(this.game.camera);
    if (v.z > 1 || Math.abs(v.x) > 0.95 || Math.abs(v.y) > 0.95) return;
    menace({ kind: 'go', at: [(v.x * 0.5 + 0.5) * innerWidth + 30, (0.5 - v.y * 0.5) * innerHeight + 60], n: 3, dur: 2.4 });
  }

  say(h, text, dur = 3.2, style = 'say') {
    // indoors (the garage, Mikawa-ya) nobody shouts
    if (style === 'shout' && h?.root && (inGarage(h.root.position) || (h.root.position.z > 14.95 && h.root.position.x < -9 && h.root.position.x > -15.5))) style = 'say';
    this.bubbles.say(h, text, { dur, style, onChar: talk(h) });
  }
  /** A line only when you're near enough to hear it (no floating text for people far down the lane), and only while
   *  the lane isn't already full of floating text (force: the next line of a conversation that has started). */
  sayNear(p, text, style = 'say', dur, force = false) {
    if (!p.h.root.visible || this.quiet()) return false; // hidden for a scene, or a cutscene / chat has the screen
    const r = p.h.root.position, pl = this.game.player.pos;
    const d = Math.hypot(r.x - pl.x, r.z - pl.z);
    if (d > 13) return false;
    dur = dur ?? Math.max(2.2, 1.1 + String(text).length * 0.055);
    if (!force && !this.aware.speakOk(3)) return false;
    this.aware.spoke(dur * 0.7);
    this.say(p.h, text, dur, style);
    return true;
  }
  voiceOf(h) { return talk(h); }
  /** Cutscenes (except your first customer's own) and chats: no street chatter. */
  quiet() { const g = this.game; return !!((g.cutscene?.active && !this.firstScene) || g.talk?.active); }
  /** Grandpa's scenes and the opening keep the lane clear (src/grandpa: hideCrowd): nobody new walks in. */
  get hold() { const g = this.game; return !!g.grandpa?.hidden; }

  /** A complaint you can see: a cross face, a stomp, an anger mark, a line, and an entry in the guestbook. */
  complain(p, text, { count = true } = {}) {
    const g = this.game;
    p.h.setExpression('angry', 3);
    p.h.gesture('stomp');
    try { g.effects.mark({ sprite: 'anger', pos: p.h.headTop(new THREE.Vector3()), color: 0xe5383b, life: 1.8, size: 0.05 }); } catch { /* */ }
    this.say(p.h, text, 3.4);
    g.guestbook?.add({ kind: 'complaint', who: cap(p.name), text });
    if (count) g.events.emit('complaint', { text, who: p.h, logged: true });
    p.mood -= 1;
  }

  giveFlyer(p) {
    const g = this.game, it = g.held.item;
    if (!it || p.flyer) return;
    p.flyer = true;
    const id = this.lastFlyer = this.nextFlyer();
    it.data.uses = (it.data.uses || 1) - 1;
    if (it.data.uses <= 0) g.held.consume(); else g.events.emit('slot', g.held.sel);
    this.promo.flyers++;
    audio.play('paper', { vol: 0.8 });
    // they stop, read it (the real sheet, in their hands) and react to that design
    this.showSheet(p, id);
    p.h.gesture('read_flyer');
    p.read = { id, t: 0, said: false };
    p.wait = 4.6;
    if (Math.random() < 0.65) p.wantsIn = true;
    const lv = this.level();
    if (lv > (this.promo.level || 0)) { this.promo.level = lv; g.news('Word is getting around!', `More people will visit (promotion level ${lv})`); audio.play('task', { vol: 0.6 }); }
  }

  /** The flyer in their hands while they read it (printed side up toward their face, the back shows the art too). */
  showSheet(p, id) {
    const h = p.h, k = h.P.H / 1.72;
    h.flyerAt = [0, 0.12 * k, 0.3 * k];
    const w = 0.24 * k, ht = w * FLYER_H / FLYER_W;
    const g = new THREE.Group(), geo = new THREE.PlaneGeometry(w, ht);
    const mat = (col) => new THREE.MeshStandardMaterial({ map: flyerTexture(id), emissiveMap: flyerTexture(id), emissive: 0x403a34, roughness: 0.85, color: col });
    const front = new THREE.Mesh(geo, mat(0xffffff));
    front.rotation.x = -0.4;
    const back = new THREE.Mesh(geo, mat(0xece4d4));
    back.rotation.set(0.4, Math.PI, 0);
    back.position.z = -0.002;
    g.add(front, back);
    g.rotation.y = Math.PI;
    g.position.set(...h.flyerAt);
    h.b.chest.add(g);
    p.sheet = g;
  }
  hideSheet(p) {
    if (!p.sheet) return;
    p.sheet.removeFromParent();
    p.sheet.children[0].geometry.dispose();
    for (const m of p.sheet.children) m.material.dispose();
    p.sheet = null;
  }

  /** Reading a flyer: a beat to take it in, a laugh and a line about that design, then on their way. */
  updateReading(p, dt) {
    const r = p.read, h = p.h;
    r.t += dt;
    if (!r.said && r.t > 1.3) {
      r.said = true;
      h.laughing = true;
      h.setExpression('happy', 2.6);
      this.say(h, pick(FLYER_BY_ID[r.id]?.lines || LINES.flyer), 3);
    }
    if (r.t > 2.9) h.laughing = false;
    if (r.t > 4.3) {
      h.clearGesture(); this.hideSheet(p); p.read = null;
      if (Math.random() < 0.5) this.say(h, pick(LINES.afterFlyer), 2.4);
      if (p.dog) h.gesture('leash'); if (p.cart) h.gesture('pull_cart'); if (p.carry === 'can') h.gesture('hold_can');
    }
  }

  // ------------------------------------------------------------------ jobs (a coroutine per person: errands, the machine)
  startJob(p, gen, state = 'errand') { p.job = gen; p.jobW = null; p.state = state; p.path = []; }
  tickJob(p) {
    const job = p.job;
    for (let guard = 0; guard < 6; guard++) {
      if (p.job !== job) return; // replaced or cancelled (routeOut, a slap...) from inside
      if (p.jobW && !p.jobW()) return;
      let nx;
      try { nx = job.next(); } catch (e) { console.error('pedestrian job', p.arch, e); if (p.job === job) { p.job = null; this.afterJob(p); } return; }
      if (p.job !== job) return;
      if (nx.done) { p.job = null; p.jobW = null; this.afterJob(p); return; }
      p.jobW = typeof nx.value === 'function' ? nx.value : null;
    }
  }
  afterJob(p) {
    if (['errand', 'meet'].includes(p.state)) {
      if (p.leaveT) return;
      if (p.state === 'meet' || p.state === 'errand') this.walkOn(p);
      if (p.dog && !p.h.currentGesture) p.h.gesture('leash');
      if (p.cart && !p.h.currentGesture) p.h.gesture('pull_cart');
    }
  }
  wait(sec) { const until = this.time + sec; return () => this.time >= until; }
  go(p, pts, { speed } = {}) {
    p.path = pts.map((q) => (q.isVector3 ? q.clone().setY(0) : V(q[0], q[1])));
    p.goSpeed = speed || null;
    return () => !p.path.length;
  }
  /** Shift someone in place (sitting down onto a bench, standing up) over dur seconds. */
  slide(p, to, dur) {
    const from = p.h.root.position.clone(), t0 = this.time;
    p.sliding = true;
    return () => {
      const k = Math.min(1, (this.time - t0) / dur), s = k * k * (3 - 2 * k);
      p.h.root.position.lerpVectors(from, to, s);
      if (k >= 1) { p.sliding = false; return true; }
      return false;
    };
  }
  faceTo(p, at) { const r = p.h.root.position; p.face = Math.atan2(at.x - r.x, at.z - r.z); }

  // ------------------------------------------------------------------ the shop: machines, queues, stands
  standOf(m) { const slot = MACHINE_SLOTS[m.data.slot] || { x: -3.42, z: 0 }; return V(-2.45, slot.z); }
  machineOk(m) { return m && this.game.machines.includes(m) && !m.data.broken && !m.data.fallen && m.data.stock.length > 0; }
  npcUsing(m) { return (this.game.lane?.list || []).some((n) => n.machine === m && n.present); }
  /** Who's playing a machine right now (a stale claim is let go: someone left or a neighbour's visit ended). */
  userOf(m) {
    const u = m._user;
    if (!u) return null;
    if (this.list.includes(u) ? u.machine === m && ['goIn', 'play'].includes(u.state) : u.machine === m && u.present) return u;
    m._user = null;
    return null;
  }
  /** The k-th place in the line behind a machine's player (null when there's no room there: furniture, walls). */
  queueSpot(m, k) {
    const S = this.standOf(m);
    const tries = [[0.8 * k, 0], [0.75 * k, 0.32], [0.75 * k, -0.32], [0.6 * k, 0.55 * Math.sign(1.5 - S.z)]];
    for (const [dx, dz] of tries) {
      const x = S.x + dx, z = S.z + dz;
      if (x > 3.4 || z > 4.4 || z < -4.5) continue;
      if (this.blockedAt(x, z, 0.24)) continue;
      return V(x, z);
    }
    return null;
  }
  blockedAt(x, z, r) {
    const boxes = this.steer.near(x, z, this._bx || (this._bx = []));
    for (const o of boxes) if (x > o.minX - r && x < o.maxX + r && z > o.minZ - r && z < o.maxZ + r) return true;
    return false;
  }
  /** The way in under the shutter (skipped when already inside). */
  doorPath(p, end) {
    const z = GARAGE.maxZ, r = p.h.root.position;
    const pts = [];
    if (r.z > z - 0.3) pts.push(V(0.4, z + 1.4), V(0.4, z - 0.6), V(-1.6, 3.3));
    pts.push(end);
    return pts;
  }

  /** Waypoints from the lane into the shop to stand in front of a machine (or in line behind whoever is playing it). */
  routeIn(p, m) {
    p.machine = m;
    p.job = null; p.jobW = null;
    const S = this.standOf(m);
    const u = this.userOf(m);
    if ((!u || u === p) && !(m._queue?.filter((q) => q !== p).length) && !this.npcUsing(m)) {
      m._user = p;
      p.path = this.doorPath(p, S);
      p.state = 'goIn';
      return true;
    }
    const Q = m._queue || (m._queue = []);
    if (!Q.includes(p)) Q.push(p);
    const spot = this.queueSpot(m, Q.indexOf(p) + 1);
    if (!spot) { Q.splice(Q.indexOf(p), 1); p.machine = null; return false; }
    p.path = this.doorPath(p, spot);
    p.state = 'queue';
    p.qT = 0;
    this.director.count('queue');
    return true;
  }
  /** They're done with the machine (or gave up waiting): the next in line steps up, the rest shuffle forward. */
  releaseMachine(p) {
    const m = p.machine;
    if (!m) return;
    if (m._queue) { const i = m._queue.indexOf(p); if (i >= 0) m._queue.splice(i, 1); }
    if (m._user === p) {
      m._user = null;
      const nx = m._queue?.shift();
      if (nx && this.list.includes(nx)) { m._user = nx; nx.state = 'goIn'; nx.path = [this.standOf(m)]; nx.h.clearGesture(); }
    }
  }
  /** At the shop front with a mind to go in: a machine (free, or the shortest line), a figure on a stand, or not. */
  enterShop(p) {
    const g = this.game;
    p.visited = true;
    const open = this.shopOpen();
    const sales = open && p.collector ? (g.packing?.forSale?.() || []).filter((s) => !this.list.some((o) => o.sale === s)) : [];
    const ok = open && p.wantsIn ? g.machines.filter((x) => this.machineOk(x) && !x.lidOpen) : [];
    const free = ok.filter((x) => !this.userOf(x) && !(x._queue?.length) && !this.npcUsing(x));
    let m = free.length && (Math.random() < 0.8 || ok.length === free.length) ? pick(free) : null;
    if (!m && ok.length) { const by = [...ok].sort((a, b) => (a._queue?.length || 0) - (b._queue?.length || 0)); m = (by[0]._queue?.length || 0) < 2 ? by[0] : null; }
    if (sales.length && (Math.random() < 0.6 || !m)) { this.routeStand(p, pick(sales)); this.director.count('stand'); return true; }
    if (m) {
      if (!this.routeIn(p, m)) { if (Math.random() < 0.5) this.sayNear(p, pick(LINES.crowded)); return false; }
      this.director.count('customer');
      if (Math.random() < 0.35) this.sayNear(p, pick(LINES.enter));
      if (p.state === 'goIn' && !g.state.flags.firstVisitScene && !g.cutscene.active) { g.state.flags.firstVisitScene = true; g.cutscene.play((c) => this.firstCustomerScene(c, p)); }
      return true;
    }
    if (open && p.wantsIn && !g.machines.some((x) => x.data.stock.length) && g.machines.length) this.complain(p, 'Sold out? Everything?! Aww.');
    else if (open && p.wantsIn && ok.length) this.sayNear(p, pick(LINES.crowded));
    return false;
  }

  /** Into the shop to look at a priced figure on an acrylic stand. */
  routeStand(p, sale) {
    const z = GARAGE.maxZ, s = sale.stand.root.position;
    const inside = s.z < z;
    const front = new THREE.Vector3(s.x + Math.sin(sale.stand.root.rotation.y) * 0.75, 0, s.z + Math.cos(sale.stand.root.rotation.y) * 0.75);
    p.job = null;
    p.path = inside ? [new THREE.Vector3(0.4, 0, z + 1.4), new THREE.Vector3(0.4, 0, z - 0.6), front] : [front];
    p.sale = sale;
    p.state = 'goStand';
  }

  /** The very first customer gets a little cutscene: watch them walk in and try their luck. */
  *firstCustomerScene(c, p) {
    const r = p.h.root;
    this.firstScene = true;
    const head = () => r.position.clone().add(new THREE.Vector3(0, 1.3, 0));
    yield c.cam({ pos: new THREE.Vector3(1.9, 1.55, 1.6), look: head(), dur: 1.1 });
    c.say('Your very first customer!', 1.6);
    let t = 0;
    yield { update: (dt) => { t += dt; c.look.lerp(head(), Math.min(1, dt * 4)); c.pos.lerp(new THREE.Vector3(r.position.x + 1.8, 1.5, r.position.z - 1.4), Math.min(1, dt * 0.8)); return p.state === 'play' || t > 14 || !this.list.includes(p); } };
    c.hideSay();
    yield c.wait(4.2);
    yield c.toPlayer(0.9);
    this.firstScene = false;
  }

  routeOut(p) {
    const z = GARAGE.maxZ;
    this.releaseMachine(p);
    this.director.releaseAll(p);
    if (p.sit) { p.h.sit(0); p.sit = null; p.sliding = false; }
    p.job = null; p.jobW = null; p.focus = false; p.lookAt = null; p.face = null;
    const r = p.h.root.position;
    const toEast = p.mate?.leader === p || !p.leader ? (Math.random() < 0.65 ? p.dir > 0 : p.dir < 0) : p.leader.dir > 0;
    const end = toEast ? LANE_END : -LANE_END;
    const laneZ = toEast ? LANE_NEAR + rnd(-0.5, 0.2) : LANE_FAR + rnd(-0.2, 0.6);
    p.dir = toEast ? 1 : -1; p.laneZ = laneZ; p.lane.z = laneZ;
    const inside = r.z < z;
    p.path = [...(inside ? [new THREE.Vector3(-1.2, 0, 3.4), new THREE.Vector3(0.4, 0, z - 0.6), new THREE.Vector3(0.4, 0, z + 1.4)] : []), new THREE.Vector3(r.x + p.dir * 1.5, 0, laneZ), new THREE.Vector3(end, 0, laneZ)];
    p.state = 'leave';
    p.machine = null;
    if (p.mate && p.leader !== p.mate && this.list.includes(p.mate) && ['follow'].includes(p.mate.state)) { /* the follower keeps following */ }
  }

  /** Kept for older callers: start the machine sequence for someone standing at their machine. */
  playMachine(p) { this.startJob(p, this.customerJob(p, p.machine), 'play'); }

  /** A customer's turn at a machine: card, price, purse, coins, handle, capsule, reaction, shell, maybe again. */
  *customerJob(p, m) {
    const g = this.game, h = p.h;
    const yawM = (m?.root.rotation.y ?? Math.PI / 2) + Math.PI;
    p.face = yawM; p.focus = true; p.phase = 'browse';
    p.lookAt = m ? m.local(0, 1.2, 0.3) : null;
    const playable = () => m && this.machineOk(m) && (m.canPlay ? m.canPlay() : m.data.stock.length > 0);
    // litter on the floor? they notice
    if (!p.noticed && (g.items?.list ? [...g.items.list].filter((e) => e.kind === 'shell' && e.obj.position.z < GARAGE.maxZ).length : 0) >= 4) { p.noticed = true; this.complain(p, pick(LINES.dirty)); yield this.wait(2); }
    if (!playable()) {
      if (m && !m.data.stock.length && g.machines.every((x) => !x.data.stock.length)) this.complain(p, 'Everything is sold out! What kind of shop is this?');
      else this.sayNear(p, 'Sold out? Aww.');
      yield this.wait(1.2);
      this.routeOut(p); return;
    }
    h.gesture('browse');
    yield this.wait(rnd(1.4, 2.6));
    const price = g.sim?.priceOf?.(m) ?? m.data.price ?? 200;
    const chance = g.sim?.playChance ? g.sim.playChance(m) : 1;
    // a steep price: a hesitation first
    if (chance < 0.8) { h.gesture('think'); this.sayNear(p, pick(LINES.hesitate(formatYen(price))), 'think'); this.director.count('hesitate'); yield this.wait(rnd(1.5, 2.6)); }
    if (g.sim?.playChance && Math.random() > chance * (p.lied === false ? 1.1 : 1)) {
      const line = g.sim.complaint?.(m, { count: false }) || pick(['Pricey...', 'For one capsule? No way.', 'Maybe next time.']);
      h.clearGesture?.(); this.complain(p, line);
      g.laneMemory?.gossip('overpriced', { who: p.name });
      yield this.wait(3.2);
      h.clearGesture?.(); this.routeOut(p); return;
    }
    for (let round = 0; round < 2; round++) {
      p.phase = 'pay';
      // coins out of the purse, into the slot
      h.gesture('purse');
      sfx('coinClink', { pos: h.root.position.clone().setY(0.95), vol: 0.25 });
      if (Math.random() < 0.5) this.sayNear(p, pick(LINES.play), 'say', 2);
      yield this.wait(rnd(1.2, 2.2));
      if (!playable()) { this.sayNear(p, 'Eh? Sold out?'); yield this.wait(1); break; }
      h.gesture('insert');
      yield this.wait(0.35);
      let price2, series, coins = 2;
      if (m.customerPlay) {
        const r = m.customerPlay();
        if (!r) { this.sayNear(p, 'Eh? It won\'t take my coins.'); yield this.wait(1.4); break; }
        ({ price: price2, series } = r); coins = Math.min(10, r.coins || 1);
      } else {
        if (!m.data.stock.length) break;
        const pos = m.local(0, 1.0, m.L.front + 0.1);
        audio.play('coinInsert', { pos, vol: 0.6 });
        series = takeCapsule(m);
        price2 = capsuleCost(series) * 2;
        g.addMoney(price2);
        g.tweens.wait(1.1, () => { audio.play('gachan', { pos, vol: 0.7 }); m.openFlap?.(); });
      }
      yield this.wait(coins * 0.13 + 0.2);
      // the handle: a full turn (the machine turns it in step)
      p.phase = 'crank';
      h.gesture('crank');
      if (!m.customerPlay) for (let i = 0; i < 4; i++) g.tweens.wait(i * 0.24, () => audio.play('crankTick', { pos: m.local(0, 1.0, 0.3), vol: 0.5 }));
      yield this.wait(1.0);
      h.clearGesture();
      yield this.wait(0.15);
      // bend for the capsule, twist it open
      h.gesture('reach_low');
      yield this.wait(1.0);
      h.gesture('twist_open');
      yield this.wait(0.55);
      sfx('pop', { pos: h.root.position.clone().setY(1.1), vol: 0.45 });
      yield this.wait(0.4);
      g.state.stats.customers = (g.state.stats.customers || 0) + 1;
      this.director.count('play');
      const lucky = Math.random() < 0.35;
      h.setExpression(lucky ? 'happy' : 'smile', 3);
      p.lookAt = null; p.focus = false; p.phase = 'react';
      if (lucky && Math.random() < 0.5) { h.gesture(pick(BIZARRE)); this.menaceOver(h); }
      else if (lucky) h.gesture('cheer');
      else if (Math.random() < 0.55) { h.gesture('sigh'); sfx('sigh', { pos: h.root.position.clone().setY(1.5), vol: 0.25 }); h.setExpression('sad', 2.2); }
      else h.gesture('shrug');
      this.director.count(lucky ? 'happy' : 'meh');
      // you told them the secret was "definitely" in there: they remember when it isn't
      if (p.lied && !lucky) g.tweens.wait(2, () => this.list.includes(p) && this.complain(p, 'The owner said the secret was in there. Liar!', { count: true }));
      else this.say(h, pick(lucky ? LINES.win : LINES.meh));
      if (lucky && Math.random() < 0.3) g.guestbook?.add({ kind: 'praise', who: cap(p.name), text: pick(['Got a rare one! Best shop on the lane!', 'Lovely little shop. Will come again.', 'The machines are so nostalgic. Thank you!']) });
      if (!g.state.flags.firstCustomer) { g.state.flags.firstCustomer = true; g.news(`Your first customer! ${formatYen(price2 ?? price)} in the coin box`, 'Open the coin box drawer to collect it'); }
      yield this.wait(2.2);
      // show a friend
      const mate = p.mate;
      if (mate && this.list.includes(mate) && mate.h.root.position.distanceTo(h.root.position) < 3.5) {
        this.faceTo(p, mate.h.root.position);
        h.gesture('show'); this.sayNear(p, pick(LINES.showMate));
        yield this.wait(1.2);
        if (this.list.includes(mate)) { mate.h.setExpression(lucky ? 'happy' : 'smile', 2); this.sayNear(mate, pick(LINES.mateSees)); }
        this.director.count('showFriend');
        yield this.wait(1.4);
        p.face = yawM;
      }
      // one more go?
      const again = round === 0 && playable() && !(m._queue?.length) && Math.random() < (lucky ? 0.18 : 0.28) * (0.6 + p.patience);
      if (!again) {
        // the empty shell: into the capsule return box, or (sometimes) dropped on your floor
        p.phase = 'shell';
        this.releaseMachine(p);
        p.machine = null;
        if (Math.random() < 0.72 && g.shells?.customerBin) {
          const bin = g.shells.binPos?.() || new THREE.Vector3(-3.45, 0.3, -0.725);
          const at = V(bin.x + 0.62, bin.z);
          if (!this.steer.occupied(at.x, at.z, 0.35, p.a)) {
            yield this.go(p, [at]);
            p.face = -Math.PI / 2;
            yield this.wait(0.3);
            h.gesture('post');
            yield this.wait(0.55);
          }
          g.shells.customerBin();
          this.director.count('bin');
          yield this.wait(0.5);
        } else { g.items.spawnShell?.(h.root.position.clone().add(new THREE.Vector3(0, 0.9, 0)), { series }); this.director.count('litter'); }
        break;
      }
      this.sayNear(p, pick(LINES.again));
      this.director.count('again');
      p.face = yawM; p.lookAt = m.local(0, 1.2, 0.3); p.focus = true;
      yield this.wait(0.8);
    }
    // a little bow on the way out (if you're there to see it)
    const pl = g.player.pos, d = Math.hypot(pl.x - h.root.position.x, pl.z - h.root.position.z);
    if (d < 5) { this.faceTo(p, pl); h.nod(1); if (Math.random() < 0.6) this.say(h, pick(LINES.bye)); yield this.wait(0.9); }
    h.clearGesture?.();
    this.routeOut(p);
  }

  // ------------------------------------------------------------------ questions (a quick floating reply)
  questionFor(p) {
    const g = this.game, ms = g.machines.filter((m) => m.data.stock.length);
    const has = (id) => ms.some((m) => m.data.series === id);
    const m = p.machine || ms[0];
    const Q = [
      { q: 'Is the secret one in there?', a: [['Maybe! It\'s 1 in 500.', 'honest'], ['Definitely, any minute now!', 'lie'], ['Ask the cat.', 'joke']] },
      { q: 'Do you have the cat series?', a: has('neko_cafe') ? [['Yes! Right over there.', 'honest'], ['Only for good customers.', 'joke']] : [['Not yet, soon!', 'honest'], ['Cats? No. Look at this one though!', 'sell']] },
      { q: m ? `How much is one turn on the ${SERIES_BY_ID[m.data.series]?.name || 'red'} one?` : 'How much is one turn?', a: [[m ? `${formatYen(g.sim?.priceOf?.(m) ?? m.data.price ?? 200)}. A fair price!` : 'Depends on the machine!', 'honest'], ['Cheaper than a train ticket!', 'sell']] },
      { q: 'Which machine is the luckiest?', a: [['The one I just refilled.', 'sell'], ['They\'re all the same, honestly.', 'honest'], ['The one with the cat sleeping on it.', 'joke']] },
      { q: 'Are you Grandpa\'s grandkid? He gave me my first capsule!', a: [['That\'s me!', 'honest'], ['Did he? Tell me about it!', 'honest']] },
      { q: 'Do you buy figures? I have doubles.', a: [['Not yet, sorry!', 'honest'], ['Only rare ones!', 'sell']] },
    ];
    return pick(Q);
  }

  async ask(p) {
    const g = this.game;
    if (!g.talk || g.talk.active) return;
    p.asked = true;
    const Q = this.questionFor(p);
    p.h.setExpression('smile', 3);
    p.h.gesture('talk');
    this.say(p.h, Q.q, 4);
    p.wait = Math.max(p.wait, 6);
    const i = await g.talk.quick(p, Q.a.map((a) => a[0]), { time: 4 + p.patience * 4 });
    if (!this.list.includes(p)) return;
    if (i < 0) {
      this.complain(p, pick(LINES.ignored), { count: false });
      g.guestbook?.add({ kind: 'question', who: cap(p.name), text: `"${Q.q}" (no answer)` });
      return;
    }
    const [ans, kind] = Q.a[i];
    // your answer floats just below your view (and is spoken in your voice)
    const at = () => { g.camera.getWorldDirection(_v); return g.camera.position.clone().addScaledVector(_v, 0.9).add(new THREE.Vector3(0, -0.3, 0)); };
    g.bubbles.say(at, ans, { style: 'me', dur: 2.4 });
    if (g.monologue) g.talk.speech?.speak(ans, g.monologue.profile, { priority: 'self' });
    g.guestbook?.add({ kind: 'question', who: cap(p.name), text: `"${Q.q}" You: "${ans}"` });
    await g.talk.wait(1.4);
    if (kind === 'lie') { p.lied = true; this.say(p.h, 'Really?! Then I\'m playing!'); p.wantsIn = true; }
    else if (kind === 'joke') { p.h.gesture('laugh'); this.say(p.h, pick(['Ha! Funny.', 'Hehe. Okay, okay.'])); p.mood += 1; }
    else { p.lied = false; this.say(p.h, pick(['Thanks!', 'Oh, nice. Thank you!', 'Good to know.'])); p.mood += 1; }
  }

  // ------------------------------------------------------------------ chat & haggle (cinematic)
  chat(p) {
    const g = this.game;
    if (!g.talk || g.talk.active) return;
    const prevWait = p.wait;
    p.talking = true;
    p.wait = 999;
    const sc = p.haggle && !p.haggle.done ? this.haggleScript(p) : this.smallTalk(p);
    g.talk.start(p, sc, { name: cap(p.name), color: '#e8d8b8' }).finally(() => { p.talking = false; p.wait = Math.min(prevWait, 1); });
  }

  smallTalk(p) {
    const inShop = p.h.root.position.z < GARAGE.maxZ;
    const greet = inShop ? pick(['Nice little shop you have.', 'Oh! Are you the owner?', 'So many capsules!']) : pick(['Hm? Can I help you?', 'Oh, hello.', 'Yes?']);
    return { start: [
      greet,
      { choose: [
        { text: 'Come try the machines!', if: () => !inShop && this.open, then: [{ if: () => Math.random() < 0.6, then: ['Hmm... why not!', { do: () => { p.wantsIn = true; p.visited = false; if (p.state === 'errand' || p.state === 'stroll') this.walkOn(p); } }], else: ['Maybe later. I\'m in a hurry.'] }] },
        { text: 'Enjoying the shop?', if: () => inShop, then: [pick(['Very much! It\'s so nostalgic.', 'It\'s a bit cramped. But cosy!', 'Your cat looked at me funny.'])] },
        { text: 'Seen anything strange around here?', then: [pick(['A man in a bush. With binoculars. I walked faster.', 'Some kid rang my bell and ran.', 'A guy in a straw hat ate my sandwich. Just... took it.', 'At night? They say yokai come out. I don\'t believe it. Mostly.'])] },
        { text: 'Have a nice day!', then: ['You too!'] },
      ] },
    ] };
  }

  haggleScript(p) {
    const g = this.game, H = p.haggle;
    const offer = H.offer, mid = Math.round((offer + H.price) / 20) * 10;
    const accept = (price) => {
      H.done = true;
      const sale = H.sale;
      if (!sale.stand.display.items[0]) return false;
      sale.stand.display.clearItem(0);
      g.addMoney(price);
      g.state.stats.sold = (g.state.stats.sold || 0) + 1;
      try { audio.play('register', { vol: 0.7 }); } catch { /* */ }
      g.effects?.coinBurst?.({ pos: sale.stand.root.position.clone().setY(sale.stand.root.position.y + 0.3), count: 6, up: 1.2, spread: 0.3, life: 1 });
      g.events.emit('figureSold', { key: H.key, finish: H.finish, price, haggled: true });
      g.laneMemory?.gossip('sold', { who: cap(p.name), key: H.key, price });
      g.guestbook?.add({ kind: 'haggle', who: cap(p.name), text: `Bought the ${H.name} for ${formatYen(price)} (tag ${formatYen(H.price)}).` });
      p.h.setExpression('happy', 3); p.h.gesture('cheer');
      g.save?.();
      return true;
    };
    const walk = () => { H.done = true; p.wantsOut = true; };
    const chance = (price) => Math.max(0.05, Math.min(0.95, 1.15 - (price / H.value - 1) * 0.55 + p.mood * 0.1 + p.patience * 0.15));
    return { start: [
      `About the ${H.name}... ${formatYen(H.price)} is a lot. Would you take ${formatYen(offer)}?`,
      { choose: [
        { text: `Deal. ${formatYen(offer)}.`, then: [{ do: () => accept(offer) }, 'Wonderful! Thank you!'] },
        { text: `Meet me halfway: ${formatYen(mid)}.`, then: [{ if: () => Math.random() < chance(mid), then: [{ do: () => accept(mid) }, 'Hmm... alright. Deal!'], else: ['Halfway? Hmm... no. Too much for me.', { do: walk }] }] },
        { text: `The tag says ${formatYen(H.price)}. Firm.`, then: [{ if: () => Math.random() < chance(H.price) * 0.75, then: [{ do: () => accept(H.price) }, '...Fine. It IS really nice.'], else: ['Then I\'ll pass. Too rich for me.', { do: () => { walk(); this.complain(p, 'Those figures are way overpriced.', { count: false }); } }] }] },
        { text: 'Not for sale, sorry.', then: ['Then why is there a price on it?!', { do: walk }] },
      ], time: 6 + p.patience * 6, timeout: 3 },
    ] };
  }

  /** A collector at a stand decides to haggle: they call out and wait a while for you. */
  startHaggle(p, sale) {
    const it = sale.item, item = getItem(it.k);
    if (!item) return;
    const value = Math.max(10, sale.price / (it.pm || 1));
    const offer = Math.max(10, Math.round((sale.price * rnd(0.6, 0.85)) / 10) * 10);
    p.haggle = { sale, key: it.k, finish: it.f, name: item.name, price: sale.price, value, offer, t: 0, done: false };
    p.h.gesture('think');
    this.say(p.h, pick([`Excuse me! Is the ${item.name} for sale?`, 'Hello? Can I ask about this figure?', `Ooh, a ${RARITIES[item.rarity]?.name || ''} ${item.name}... Excuse me!`]), 4);
    try { this.game.effects.mark({ sprite: 'bang', pos: p.h.headTop(new THREE.Vector3()), color: 0xffd23f, life: 2.4, size: 0.05 }); } catch { /* */ }
  }

  // ------------------------------------------------------------------ reactions
  onSlap({ human }) {
    const p = human && this.list.find((x) => x.h === human);
    if (!p) return;
    const g = this.game, R = SLAPPED[p.kind] || SLAPPED.default;
    p.slapped = (p.slapped || 0) + 1;
    if (p.sit) { p.h.sit(0); p.sit = null; p.sliding = false; p.a.mobile = true; }
    p.h.gesture(R.gesture);
    p.h.flinch(1);
    setTimeout(() => { if (this.list.includes(p)) { this.bubbles.clear(p.h); this.say(p.h, pick(R.line), 2.8, 'shout'); } }, 150);
    try { g.effects.mark({ sprite: 'anger', pos: p.h.headTop(new THREE.Vector3()), color: 0xe5383b, life: 1.8, size: 0.05 }); } catch { /* */ }
    if (R.whack) g.tweens.wait(0.9, () => { try { audio.play('smack', { vol: 0.9 }); } catch { /* */ } g.player.shake = Math.max(g.player.shake || 0, 0.5); });
    g.guestbook?.add({ kind: 'complaint', who: cap(p.name), text: pick(['The owner SLAPPED me!', 'I got slapped. In a toy shop.', 'Assaulted by the shopkeeper. One star.']) });
    g.events.emit('complaint', { text: 'slapped', who: p.h, logged: true });
    g.laneMemory?.gossip('slap', { who: p.name });
    p.wait = 1.4;
    p.job = null; p.jobW = null; p.focus = false;
    if (p.haggle) p.haggle.done = true;
    p.leaveT = true;
    if (p.state !== 'leave') g.tweens.wait(1.5, () => { if (this.list.includes(p)) { p.h.clearGesture?.(); this.routeOut(p); p.leaveT = false; if (R.run) p.speed *= 2.2; else p.speed *= 1.25; } });
  }

  /** Someone saw something (src/people/aware.js): a slap nearby scares some customers off; tourists take a photo. */
  onSee(p, kind) {
    if (kind !== 'slap' || p.slapped) return;
    p.mood -= 1;
    const inside = inGarage(p.h.root.position);
    if (inside && ['goIn', 'queue', 'play'].includes(p.state) && p.phase !== 'crank' && Math.random() < 0.35) {
      this.game.tweens.wait(1.6, () => { if (!this.list.includes(p)) return; this.sayNear(p, pick(LINES.seeSlap)); this.routeOut(p); p.speed *= 1.2; });
      this.director.count('fled');
    } else if ((p.kind === 'gyaru' || p.kind === 'tourist') && !p.h.currentGesture && Math.random() < 0.5) {
      this.game.tweens.wait(0.9, () => { if (!this.list.includes(p)) return; p.h.gesture('photo'); this.game.tweens.wait(2.2, () => this.list.includes(p) && p.h.clearGesture()); });
    } else if (p.state === 'stroll' && !p.wait) p.wait = rnd(1.2, 2.2);
  }

  /** Someone (Gonta) jumps out at a passer-by. */
  scare(p) {
    if (!this.list.includes(p)) return;
    p.h.gesture('cower');
    p.h.flinch(1);
    p.h.setExpression('surprised', 2);
    this.say(p.h, pick(['WAAH!', 'EEK!', 'Gah! My heart!']), 1.8, 'shout');
    p.wait = 2.2;
    this.game.tweens.wait(2, () => { if (this.list.includes(p)) this.say(p.h, pick(['Gonta! You little...!', 'Kids these days...', 'I almost dropped my groceries!'])); });
  }

  // ------------------------------------------------------------------ per frame
  update(dt) {
    const g = this.game;
    this.time += dt;
    this.updateKeeper(dt);
    this.spawnT -= dt;
    if (this.spawnT <= 0 && !g.cutscene?.active && !this.hold) {
      // (if the next person isn't finished in the background yet, they get up to two seconds more)
      const want = this.list.filter((p) => !p.ambient).length < this.maxPeople();
      const wait = want && !this.unitReady() && (this.spawnWait = (this.spawnWait || 0) + dt) < 2;
      if (!wait) {
        this.spawnWait = 0;
        this.spawnT = this.interval() * rnd(0.7, 1.3);
        if (want) this.spawn();
      }
    }
    // the commute and the other rush hours bring more people on top of the shop's own trade
    this.ambT -= dt;
    if (this.ambT <= 0 && !g.cutscene?.active && !this.hold) {
      this.ambT = rnd(3.5, 7);
      const want = Math.round(this.director.ambientTarget() * Math.min(1, this.crowd));
      if (this.list.filter((p) => p.ambient && !p.leader).length < want) {
        // (the next person gets a little longer to finish building in the background)
        if (this.unitReady() || (this.ambWait = (this.ambWait || 0) + 1) > 2) { this.ambWait = 0; this.spawn('ambient'); } else this.ambT = 1;
      }
    }
    const pl = g.player.pos;
    // keep the top sheet of the stack in your hands showing the next design
    const it = g.held.item, top = it?.kind === 'tool' && it.data.id === 'flyers' ? it.obj.userData.flyerTop : null;
    if (top && top.userData.flyer !== this.nextFlyer()) { top.userData.flyer = this.nextFlyer(); top.material.map = flyerTexture(top.userData.flyer); top.material.needsUpdate = true; }
    this.askT -= dt;
    if (!this.hold) this.director.tick(this, dt);
    for (const p of [...this.list]) {
      if (!this.list.includes(p)) continue;
      this.updatePerson(p, dt, pl);
    }
    this.bubbles.update(dt);
  }

  updatePerson(p, dt, pl) {
    const g = this.game, h = p.h, r = h.root;
    p.t += dt;
    if (p.read) this.updateReading(p, dt);
    p.wait = Math.max(0, p.wait - dt);
    if (p.job && !p.talking && !p.read) { this.tickJob(p); if (!this.list.includes(p)) return; }
    // decisions
    if (p.state === 'stroll') {
      if (p.arch === 'tipsy' && p.path.length === 1) p.path[0].z = p.laneZ + Math.sin(p.t * 0.45) * 0.9 + Math.sin(p.t * 1.3) * 0.25;
      const nearShop = Math.abs(r.position.x - 0.4) < 1.2 && r.position.z > GARAGE.maxZ;
      if (nearShop && !p.visited) {
        p.visited = true;
        if (Math.random() < 0.5) this.sayNear(p, pick(this.open ? LINES.open : LINES.closed));
        if (p.wantsIn || p.collector) this.enterShop(p);
      }
      // the next errand on the way
      const e = p.plan[0];
      if (p.state === 'stroll' && e && !p.wait && !p.read) {
        const ahead = (e.x - r.position.x) * p.dir;
        if (ahead < -2) p.plan.shift();
        else if (ahead < 2.5) { p.plan.shift(); const gen = ERRANDS[e.kind]; if (gen) this.startJob(p, gen(this, p, e.poi), 'errand'); }
      }
      if (p.state === 'stroll') this.strollLife(p, dt, pl);
      if (p.state === 'stroll' && !p.path.length) { this.remove(p); return; }
      if (p.state === 'stroll' && Math.abs(r.position.x) > LANE_END - 0.5 && p.t > 3) { this.remove(p); return; }
    } else if (p.state === 'follow') {
      this.updateFollower(p, dt);
      if (!this.list.includes(p)) return;
    } else if (p.state === 'goIn' && !p.path.length) {
      const m = p.machine;
      if (!m || m._user !== p) { this.routeOut(p); }
      else this.startJob(p, this.customerJob(p, m), 'play');
    } else if (p.state === 'queue') {
      this.updateQueue(p, dt);
    } else if (p.state === 'goStand' && !p.path.length) {
      p.state = 'stand';
      const s = p.sale.stand.root.position;
      p.face = Math.atan2(s.x - r.position.x, s.z - r.position.z);
      if (!p.sale.stand.display.items[0]) { this.routeOut(p); return; }
      this.startHaggle(p, p.sale);
    } else if (p.state === 'stand') {
      const H = p.haggle;
      if (!H) { this.routeOut(p); return; }
      H.t += dt;
      if (!p.talking && (H.done || p.wantsOut)) { p.h.clearGesture?.(); g.tweens.wait(1.2, () => this.list.includes(p) && this.routeOut(p)); p.state = 'leaving'; }
      else if (!p.talking && H.t > 20 + p.patience * 25) {
        H.done = true;
        this.say(h, 'Nobody to ask... never mind.');
        g.guestbook?.add({ kind: 'question', who: cap(p.name), text: `Wanted to buy the ${H.name}, but nobody was around.` });
        g.tweens.wait(1.4, () => this.list.includes(p) && this.routeOut(p)); p.state = 'leaving';
      } else if (!p.talking && Math.floor(H.t) % 9 === 8 && Math.floor(H.t - dt) % 9 !== 8 && Math.hypot(pl.x - r.position.x, pl.z - r.position.z) < 9) this.say(h, pick(['Excuse me?', 'Hello? Shopkeeper?', 'About this figure...']), 2);
    } else if (p.state === 'leave') {
      if (!p.path.length || (Math.abs(r.position.x) > LANE_END - 0.5 && p.path.length === 1)) { this.remove(p); return; }
    }
    // a question for you when you're close to someone in the shop
    const pd = Math.hypot(pl.x - r.position.x, pl.z - r.position.z);
    if (!p.asked && !p.talking && this.askT <= 0 && pd < 3.2 && (p.state === 'goIn' || p.state === 'queue' || (p.state === 'play' && p.phase === 'browse')) && !g.talk?.active && !g.cutscene?.active && g.input.locked) { this.askT = rnd(18, 35); this.ask(p); }
    // walking (steering), turning
    this.move(p, dt, pl);
    this.updateProps(p, dt, pd);
    // animation: full rate up close, a few frames a second far away or off screen
    let adt = dt;
    if (pd > 9 && !p.talking) {
      p.lodT -= dt; p.acc += dt;
      if (p.lodT > 0) return;
      _v.copy(r.position); _v.y += 1;
      const v = _v.project(g.camera);
      p.lodT = v.z < 1 && Math.abs(v.x) < 1.15 && Math.abs(v.y) < 1.2 ? (pd > 25 ? 0.15 : 0.05) : 0.4;
      adt = Math.min(0.1, p.acc); p.acc = 0;
    }
    h.update(adt, { speed: p.bike ? 0 : p.a.speed, lookAt: this.lookOf(p, pd), talking: this.bubbles.isTalking?.(h) });
  }

  /** Where their head turns: you (in a chat), a shock, the thing they're busy with, a glance, their companion. */
  lookOf(p, pd) {
    const g = this.game, pl = g.player.pos;
    if (p.talking) return _look.set(pl.x, g.player.eye, pl.z);
    const gl = this.aware.glance(p.aw);
    if (gl && (p.aw.glPri >= 2 || !p.focus)) return gl;
    if (p.lookAt) return p.lookAt;
    if (gl) return gl;
    if (p.state === 'stand' && p.sale) return _look.copy(p.sale.stand.root.position).setY(p.sale.stand.root.position.y + 0.15);
    if (p.talkTo && this.list.includes(p.talkTo)) return p.talkTo.h.headTop(_look);
    if (p.dog && p.dog.sniffT > 0) return p.dog.pos;
    if (p.state === 'queue' && p.machine) return p.machine._user?.h.root.position.clone().setY(1.0) || p.machine.local(0, 1.1, 0.3);
    if (p.mate && p.chatting > 0 && this.list.includes(p.mate)) return p.mate.h.headTop(_look);
    return pd < 2.2 && p.state !== 'stroll' ? g.camera.position : null;
  }

  move(p, dt, pl) {
    const r = p.h.root, a = p.a;
    const tgt = p.path[0];
    if (tgt && !p.wait && !p.talking && !p.sit && !p.sliding) {
      const inside = inGarage(r.position);
      let speed = (p.goSpeed || p.followSpeed || p.speed) * (inside ? 0.82 : 1);
      if (p.state === 'queue') speed = Math.min(speed, 0.7);
      const res = this.steer.step(a, dt, { target: tgt, final: p.path.length === 1, speed, ghost: false, tight: inside, patient: p.state === 'queue' || p.state === 'follow', corner: inside ? 0.35 : 0.5 });
      if (res.corner || res.arrived) p.path.shift();
      if (res.blockedBy === this.steer.playerAgent) {
        p.blockT = (p.blockT || 0) + dt;
        if (p.blockT > 0.7 && !p.excused) { p.excused = true; this.sayNear(p, pick(LINES.excuse), 'say', 1.6); p.h.nod(0.4); }
      } else p.blockT = 0;
      a.mobile = true;
    } else { this.steer.idle(a, dt); a.mobile = a.speed > 0.15; }
    a.anchor = !!(p.state === 'queue' || p.state === 'play' || p.sit || p.sliding || p.state === 'meet' || p.talking || p.state === 'stand') && a.speed < 0.2;
    a.noPush = !!(p.sit || p.sliding);
    let face = p.face;
    if (p.talking) face = Math.atan2(pl.x - r.position.x, pl.z - r.position.z);
    if (!p.sliding) this.steer.turn(a, r, dt, face);
  }

  /** Walking life: pairs chat, the tipsy man hums, the jogger puffs, the cyclist rings, the dog sniffs. */
  strollLife(p, dt, pl) {
    const r = p.h.root.position;
    const near = Math.hypot(pl.x - r.x, pl.z - r.z) < 13;
    p.chatT -= dt;
    if (p.chatting > 0) p.chatting -= dt;
    if (p.chatT < 0) {
      p.chatT = rnd(9, 18);
      const m = p.mate;
      if (m && this.list.includes(m) && near) {
        const pool = TALK[p.arch === 'student' ? 'student' : p.arch === 'local' ? 'local' : p.arch === 'visitor' ? 'visitor' : 'office'] || TALK.visitor;
        const lines = pick(pool);
        let t = 0;
        if (!this.aware.speakOk(2)) { p.chatT = rnd(3, 6); return; }
        for (const [w, text] of lines) {
          const s = w === 'a' ? p : m;
          this.game.tweens.wait(t, () => { if (!this.list.includes(s)) return; this.sayNear(s, text, 'say', undefined, true); s.h.setExpression(/!/.test(text) ? 'happy' : 'smile', 2); if (!s.h.currentGesture && Math.random() < 0.3) { s.h.gesture(/!/.test(text) ? 'laugh' : 'talk'); } });
          t += 1.4 + text.length * 0.05;
        }
        p.chatting = m.chatting = t + 0.5;
        this.director.count('pairTalk');
      } else if (!m && near && Math.random() < 0.25 && p.arch !== 'tipsy' && p.arch !== 'jogger') this.sayNear(p, pick(LINES.stroll), 'think');
    }
    if (p.arch === 'tipsy') {
      if ((p.humT -= dt) <= 0) {
        p.humT = rnd(5, 10);
        if (near && p.h.root.visible && this.sayNear(p, pick(SAY.tipsy))) { try { this.game.effects.mark({ sprite: 'note', pos: p.h.headTop(new THREE.Vector3()), color: 0xf2e6c8, life: 1.8, size: 0.035 }); } catch { /* */ } }
        if (Math.random() < 0.3 && Math.hypot(pl.x - r.x, pl.z - r.z) < 4) this.sayNear(p, pick(SAY.tipsyPlayer));
      }
      if ((p.hicT -= dt) <= 0) { p.hicT = rnd(7, 14); p.h.flinch(0.45); if (near) { sfx('hiccup', { pos: r.clone().setY(1.5), vol: 0.35 }); this.sayNear(p, '*hic*', 'say', 1.2); } }
    }
    if (p.arch === 'jogger' && near && Math.random() < dt / 5 && this.sayNear(p, pick(SAY.jog))) { try { this.game.effects.mark({ sprite: 'drop', pos: p.h.headTop(new THREE.Vector3()), color: 0x9ad0f0, life: 0.9, size: 0.03 }); } catch { /* */ } }
  }

  /** A follower walks beside their companion, and stands with them when they stop. */
  updateFollower(p, dt) {
    const L = p.leader;
    if (!L || !this.list.includes(L)) { this.walkOn(p); return; }
    const lr = L.h.root, yaw = lr.rotation.y, fx = Math.sin(yaw), fz = Math.cos(yaw), rx = -Math.cos(yaw), rz = Math.sin(yaw);
    const r = p.h.root.position;
    const moving = L.path.length > 0 && L.a.speed > 0.25;
    let tx, tz;
    if (moving) {
      tx = lr.position.x + rx * p.side * 0.62 - fx * 0.15; tz = lr.position.z + rz * p.side * 0.62 - fz * 0.15;
      const d = Math.hypot(tx - r.x, tz - r.z);
      p.followSpeed = Math.max(0.6, L.a.speed * (d > 1 ? 1.3 : d < 0.3 ? 0.85 : 1.05));
      p.face = null; p.lookAt = null;
    } else {
      const inside = inGarage(lr.position);
      const s = inside ? 0.7 : 0.72;
      tx = lr.position.x + rx * p.side * s - fx * (inside ? 0.45 : 0.25); tz = lr.position.z + rz * p.side * s - fz * (inside ? 0.45 : 0.25);
      // in the shop: half a step behind and beside them, out of the line's way
      if (inside && L.machine) { tx = lr.position.x + 0.75; tz = lr.position.z + 0.5 * p.side; if (this.blockedAt(tx, tz, 0.24)) { tx = lr.position.x + 1.05; tz = lr.position.z - 0.5 * p.side; } }
      p.followSpeed = Math.max(0.7, p.speed);
      p.face = L.face ?? yaw;
      p.lookAt = L.lookAt || null;
    }
    const d = Math.hypot(tx - r.x, tz - r.z);
    if (d > (moving ? 0.12 : 0.3)) { if (!p.path.length) p.path = [V(tx, tz)]; else p.path[0].set(tx, 0, tz); }
    else if (!moving) p.path = [];
    if (L.state === 'leave' && Math.abs(lr.position.x) > LANE_END - 1) { this.remove(p); }
  }

  updateQueue(p, dt) {
    const m = p.machine;
    if (!m || !this.machineOk(m)) { this.sayNear(p, 'Sold out? Aww.'); this.routeOut(p); return; }
    const Q = m._queue || [];
    const k = Q.indexOf(p) + 1;
    if (k <= 0) { if (m._user !== p) this.routeOut(p); return; }
    p.qT += dt;
    // first in line and nobody at the machine (they left, or it was a neighbour who's gone): step up
    if (k === 1 && !this.userOf(m) && !this.npcUsing(m)) { Q.shift(); m._user = p; p.state = 'goIn'; p.path = [this.standOf(m)]; p.h.clearGesture(); return; }
    const spot = this.queueSpot(m, k);
    const r = p.h.root.position;
    if (spot && !p.path.length && Math.hypot(spot.x - r.x, spot.z - r.z) > 0.3) p.path = [spot]; // shuffle forward
    if (!p.path.length) {
      p.face = Math.atan2(m.root.position.x - r.x, m.root.position.z - r.z);
      if (!p.qSaid && p.qT > 2 && Math.random() < 0.3) { p.qSaid = true; this.sayNear(p, pick(LINES.queue)); }
      if (p.qT > 14 && !p.h.currentGesture && Math.random() < dt / 8) p.h.gesture(Math.random() < 0.5 ? '_watch' : 'arms_crossed');
    }
    if (p.qT > 35 + p.patience * 45) { this.sayNear(p, pick(LINES.giveUp)); this.director.count('gaveUp'); this.routeOut(p); }
  }

  /** The things they carry or walk with. */
  updateProps(p, dt, pd) {
    const g = this.game, h = p.h, r = h.root;
    // what they walk with is hidden with them (Grandpa's scenes step people out of shot)
    if (p.dog) { p.dog.root.visible = r.visible; p.lead.mesh.visible = r.visible && pd < 30; }
    if (p.cart) p.cart.root.visible = r.visible;
    if (p.cart && !p.cartParked) { h.b.handR.getWorldPosition(_hand); p.cart.update(_hand); }
    if (p.dog) this.updateDog(p, dt, pd);
    if (p.bike) {
      h.pedal = p.a.speed * 5.2;
      // the bell for someone in the way ahead
      p.bellT -= dt;
      if (p.bellT <= 0 && p.a.speed > 1.5) {
        const fx = Math.sin(r.rotation.y), fz = Math.cos(r.rotation.y);
        const ahead = this.steer.agents.some((o) => o !== p.a && o.active && !o.hidden && ((o.pos.x - r.position.x) * fx + (o.pos.z - r.position.z) * fz) > 0.5 && ((o.pos.x - r.position.x) * fx + (o.pos.z - r.position.z) * fz) < 6 && Math.abs((o.pos.x - r.position.x) * fz - (o.pos.z - r.position.z) * fx) < 0.9);
        if (ahead) {
          p.bellT = 4;
          sfx('bikeBell', { pos: r.position.clone().setY(1), vol: 0.55 });
          this.aware.noise(r.position.clone().setY(1), 'bell', { r: 8, dur: [0.8, 1.6] });
          if (pd < 12 && Math.random() < 0.4) this.sayNear(p, pick(SAY.bell));
          this.director.count('bell');
        } else p.bellT = 0.4;
      }
    }
    if (p.smoking) {
      p.smokeT = (p.smokeT || 0) - dt;
      if (p.smokeT <= 0 && pd < 20) {
        p.smokeT = rnd(0.9, 1.6);
        p.smoking.getWorldPosition(_v2);
        try { g.effects.emit({ sprite: 'puff', pos: _v2, vy: 0.12, vx: rnd(-0.03, 0.03), vz: rnd(-0.03, 0.03), life: rnd(1.6, 2.4), size: rnd(0.035, 0.055), color: 0xd4d2cc, drag: 0.4, fade: 0.5, grow: [0.6, 1.6] }); } catch { /* */ }
      }
      // breathe out after a drag
      if (p.wasPuffing && !h.puffing && pd < 20) {
        h.b.head.getWorldPosition(_v2); _v2.y -= 0.05; _v2.x += Math.sin(r.rotation.y) * 0.12; _v2.z += Math.cos(r.rotation.y) * 0.12;
        for (let i = 0; i < 3; i++) try { g.effects.emit({ sprite: 'puff', pos: _v2, vx: Math.sin(r.rotation.y) * 0.25 + rnd(-0.05, 0.05), vy: 0.08, vz: Math.cos(r.rotation.y) * 0.25, life: rnd(1.4, 2.2), size: rnd(0.05, 0.08), color: 0xdcdad4, drag: 1.2, fade: 0.5, grow: [0.6, 1.8] }); } catch { /* */ }
      }
      p.wasPuffing = h.puffing;
    }
    if (p.sipT !== undefined && h.currentGesture === 'drink') {
      if (h.sipping && !p.sipped) { p.sipped = true; if (pd < 10) sfx('gulp', { pos: r.position.clone().setY(1.4), vol: 0.25 }); }
      if (!h.sipping) p.sipped = false;
    }
  }

  updateDog(p, dt, pd) {
    const D = p.dog, h = p.h, r = h.root, pl = this.game.player.pos;
    const yaw = r.rotation.y, fx = Math.sin(yaw), fz = Math.cos(yaw), rx = -Math.cos(yaw), rz = Math.sin(yaw);
    const walking = p.path.length && p.a.speed > 0.2;
    // sniff stops at poles, weeds and planters near the way
    D.nextSniff -= dt;
    if (D.sniffT > 0) {
      D.sniffT -= dt; D.pose = 'sniff';
      const dd = Math.hypot(D.pos.x - r.position.x, D.pos.z - r.position.z);
      if (dd > 1.3 && p.state === 'stroll') { p.wait = Math.max(p.wait, 0.25); h.leashTug = 0.5; }
      if (D.sniffT <= 0) { D.pose = 'stand'; D.nextSniff = rnd(10, 22); h.leashTug = 0; if (pd < 10 && Math.random() < 0.5) this.sayNear(p, pick(SAY.dog).replace('{d}', D.name)); }
    } else if (D.nextSniff <= 0 && walking && p.state === 'stroll') {
      const boxes = this.steer.near(r.position.x + fx * 2, r.position.z + fz * 2, this._db || (this._db = []));
      let best = null, bd = 3.2;
      for (const o of boxes) {
        if (o.maxX - o.minX > 1.2 || o.maxZ - o.minZ > 1.2) continue;
        const cx = Math.max(o.minX, Math.min(D.pos.x, o.maxX)), cz = Math.max(o.minZ, Math.min(D.pos.z, o.maxZ));
        const ahead = (cx - r.position.x) * fx + (cz - r.position.z) * fz;
        const dd = Math.hypot(cx - D.pos.x, cz - D.pos.z);
        // (stand just off it, nose to it)
        if (ahead > 0.3 && dd < bd && dd > 0.05) { bd = dd; best = [cx + (D.pos.x - cx) / dd * 0.3, cz + (D.pos.z - cz) / dd * 0.3, cx, cz]; }
      }
      D.nextSniff = best ? 999 : 3;
      if (best) { D.sniffAt = V(best[0], best[1]); D.sniffOn = V(best[2], best[3]); D.goSniff = true; D.goT = 0; }
    }
    let tx, tz;
    if (D.goSniff) {
      tx = D.sniffAt.x; tz = D.sniffAt.z;
      D.goT += dt;
      // too far from the owner, or it takes too long: never mind
      if (D.goT > 5 || Math.hypot(tx - r.position.x, tz - r.position.z) > 2.2) { D.goSniff = false; D.nextSniff = rnd(6, 12); }
      else if (Math.hypot(tx - D.pos.x, tz - D.pos.z) < 0.35) { D.goSniff = false; D.sniffT = rnd(3, 6); this.director.count('sniff'); }
    } else if (D.sniffT <= 0) {
      const lead = walking ? 0.75 : 0.45;
      tx = r.position.x + fx * lead + rx * 0.35; tz = r.position.z + fz * lead + rz * 0.35;
      // the player close by: a sniff at you, tail going
      if (Math.hypot(pl.x - D.pos.x, pl.z - D.pos.z) < 1.6 && !walking) { tx = pl.x - (pl.x - D.pos.x) * 0.3; tz = pl.z - (pl.z - D.pos.z) * 0.3; D.wag = 1; if (!D.metPlayer) { D.metPlayer = true; this.sayNear(p, SAY.dog[4]); } } else D.wag = 0.5;
    }
    const tgt = _v2.set(tx ?? D.pos.x, 0, tz ?? D.pos.z);
    const dd = Math.hypot(tgt.x - D.pos.x, tgt.z - D.pos.z);
    // keep within the lead
    const far = Math.hypot(D.pos.x - r.position.x, D.pos.z - r.position.z);
    if (dd > 0.08 && D.sniffT <= 0) {
      const res = this.steer.step(D.a, dt, { target: tgt, final: true, speed: Math.min(1.9, Math.max(0.6, p.a.speed * (far > 1.4 ? 1.4 : 1.1) + dd * 0.4)), tight: true, arrive: 0.08, patient: true });
      D.speed = res.speed;
    } else { this.steer.idle(D.a, dt); D.speed = D.a.speed; }
    if (D.speed > 0.1) D.heading = Math.atan2(D.a.vel.x, D.a.vel.z);
    else if (D.sniffT > 0 && D.sniffOn) D.heading = Math.atan2(D.sniffOn.x - D.pos.x, D.sniffOn.z - D.pos.z);
    if (far > 2.1) { D.pos.x = r.position.x + (D.pos.x - r.position.x) * 2.1 / far; D.pos.z = r.position.z + (D.pos.z - r.position.z) * 2.1 / far; }
    if (pd < 30) {
      D.update(dt);
      h.b.handR.getWorldPosition(_hand);
      p.lead.update(_hand, D.collar(_v));
    }
  }
}

const cap = (s) => String(s || '').replace(/^the /, 'The ');
void wrap;
