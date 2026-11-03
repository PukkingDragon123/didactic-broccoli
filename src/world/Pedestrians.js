// People of the lane: passers-by stroll from tunnel to tunnel. Promote the shop (hand out flyers: they stop, read the
// actual sheet you gave them and react to it) and more of them come by; once GACHA GARAGE is open some turn in, play a
// machine (the coins go into its coin box), talk in floating text and wander off again. Also the shopkeeper behind
// Mikawa-ya's counter.
// Customers have a bit of personality: they ask you things when you're close ("Is the secret one in there?": a quick
// timed reply floats up, ignore them and they're offended), haggle over the figures you've priced on acrylic stands
// (click them for a cinematic haggle), complain out loud (and write it in the guestbook by the door: src/talk/
// guestbook.js), react when slapped (each in their own way), bin their empty shells or drop them on your floor.
// Click anyone for a chat (src/talk/Talk.js); RMB slaps.
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
import '../npc/poses.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const _v = new THREE.Vector3(), _look = new THREE.Vector3();
const hitMat = new THREE.MeshBasicMaterial({ visible: false });

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
  bye: ['Thanks! I will come back.', 'See you!', 'I will tell my friends about this place.', 'What a nice little shop.'],
  excuse: ['Excuse me!', 'Pardon me.', 'Oops, sorry!', 'Oh? You\'re approaching me?'],
  keeper: ['Welcome! Irasshaimase!', 'Ah, Grandpa\'s kid! Need anything?', 'Milk is in the fridge, brooms by the door.', 'Come again!'],
  ignored: ['Hello? ...Rude.', 'I asked you something!', 'Fine, don\'t answer.'],
  dirty: ['Ugh, empty capsules everywhere.', 'This floor... is that litter?'],
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
    this.seed = (game.state.seed || 1) % 100000;
    this.open = !!game.state.story?.complete;
    this.askT = 20;
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
  // performance: the next passer-by (the next seed) is built and painted in the background, in idle time
  // (src/people/prebuild.js), so a spawn takes a finished person instead of building one on the spot
  prebuildNext() { prebuildHuman({ seed: this.seed }, this.game.renderer?.renderer); }

  spawn() {
    const g = this.game, town = g.garage.town;
    const lanes = town?.lanes?.length ? town.lanes : [{ z: GARAGE.maxZ + 2.2, x0: -24, x1: 24 }, { z: GARAGE.maxZ + 8.0, x0: -24, x1: 24 }];
    const lane = pick(lanes);
    const dir = Math.random() < 0.5 ? 1 : -1;
    const x0 = dir > 0 ? lane.x0 : lane.x1, x1 = dir > 0 ? lane.x1 : lane.x0;
    const h = takeHuman({ seed: this.seed }) || createHuman({ seed: this.seed });
    this.seed++;
    this.prebuildNext();
    h.root.position.set(x0, 0, lane.z + rnd(-0.3, 0.3));
    h.root.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    this.group.add(h.root);
    h.tts = profileOf(h);
    h.mesh.raycast = () => {};
    const p = {
      h, path: [new THREE.Vector3(x1, 0, h.root.position.z)], state: 'stroll', speed: rnd(1.0, 1.35) * (h.height < 1.35 ? 1.15 : 1), t: 0, chatT: rnd(4, 14), lane, visited: false, flyer: false, wait: 0,
      kind: h.spec.id, name: `the ${(h.spec.name || 'customer').toLowerCase()}`, patience: rnd(0.3, 1), mood: 0, voice: talk(h), tts: h.tts, asked: false, lodT: 0, acc: 0,
    };
    // will they come in? collectors may come for the figures on the stands instead of (or as well as) the machines
    if (this.open && Math.random() < Math.min(0.95, (0.18 + this.level() * 0.1) / this.crowd)) p.wantsIn = true;
    if (this.open && ['otaku', 'tourist', 'salaryman', 'gyaru', 'office_lady'].includes(p.kind) && Math.random() < 0.45) p.collector = true;
    // a simple box to click / slap (the skinned body doesn't need to be ray-tested)
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.55, h.height * 0.95, 0.5), hitMat);
    box.position.y = h.height * 0.48;
    box.userData.human = h;
    h.root.add(box);
    p.hit = box;
    g.interaction.add(box, {
      reach: 2.6,
      hint: (held) => {
        if (g.talk?.active) return null;
        if (g.held.holding('flyers') && !p.flyer && p.state === 'stroll') return { key: 'LMB', text: 'Hand out a flyer' };
        if (held && held.kind !== 'tool') return null;
        if (p.haggle && !p.haggle.done) return { key: 'LMB', text: `${cap(p.name)} wants to buy a figure`, sub: `${p.haggle.name} · ${formatYen(p.haggle.price)} on the tag · RMB: slap` };
        return { key: 'LMB', text: `Talk to ${p.name}`, sub: 'RMB: slap' };
      },
      use: () => { if (g.held.holding('flyers') && !p.flyer && p.state === 'stroll') this.giveFlyer(p); else this.chat(p); return false; },
      alt: () => { g.fp?.slap?.(); },
      noHighlight: true,
    });
    this.list.push(p);
  }

  remove(p) {
    this.hideSheet(p);
    this.game.interaction.remove(p.hit);
    this.bubbles.clear?.(p.h);
    p.h.root.parent?.remove(p.h.root);
    p.h.dispose?.();
    const i = this.list.indexOf(p);
    if (i >= 0) this.list.splice(i, 1);
  }

  /** Menacing ゴゴゴ beside someone, if they're on screen. */
  menaceOver(h) {
    const v = h.headTop(new THREE.Vector3()).project(this.game.camera);
    if (v.z > 1 || Math.abs(v.x) > 0.95 || Math.abs(v.y) > 0.95) return;
    menace({ kind: 'go', at: [(v.x * 0.5 + 0.5) * innerWidth + 30, (0.5 - v.y * 0.5) * innerHeight + 60], n: 3, dur: 2.4 });
  }

  say(h, text, dur = 3.2, style = 'say') {
    this.bubbles.say(h, text, { dur, style, onChar: talk(h) });
  }

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
    if (r.t > 4.3) { h.clearGesture(); this.hideSheet(p); p.read = null; if (Math.random() < 0.5) this.say(h, pick(LINES.afterFlyer), 2.4); }
  }

  /** Waypoints from the lane into the shop to stand in front of a machine. */
  routeIn(p, m) {
    const z = GARAGE.maxZ;
    const slot = MACHINE_SLOTS[m.data.slot];
    p.machine = m;
    p.path = [new THREE.Vector3(0.4, 0, z + 1.4), new THREE.Vector3(0.4, 0, z - 0.6), new THREE.Vector3(-2.2, 0, 3.1), new THREE.Vector3(-2.45, 0, slot.z)];
    p.state = 'goIn';
  }
  /** Into the shop to look at a priced figure on an acrylic stand. */
  routeStand(p, sale) {
    const z = GARAGE.maxZ, s = sale.stand.root.position;
    const inside = s.z < z;
    const front = new THREE.Vector3(s.x + Math.sin(sale.stand.root.rotation.y) * 0.75, 0, s.z + Math.cos(sale.stand.root.rotation.y) * 0.75);
    p.path = inside ? [new THREE.Vector3(0.4, 0, z + 1.4), new THREE.Vector3(0.4, 0, z - 0.6), front] : [front];
    p.sale = sale;
    p.state = 'goStand';
  }

  /** The very first customer gets a little cutscene: watch them walk in and try their luck. */
  *firstCustomerScene(c, p) {
    const r = p.h.root;
    const head = () => r.position.clone().add(new THREE.Vector3(0, 1.3, 0));
    yield c.cam({ pos: new THREE.Vector3(1.9, 1.55, 1.6), look: head(), dur: 1.1 });
    c.say('Your very first customer!', 1.6);
    let t = 0;
    yield { update: (dt) => { t += dt; c.look.lerp(head(), Math.min(1, dt * 4)); c.pos.lerp(new THREE.Vector3(r.position.x + 1.8, 1.5, r.position.z - 1.4), Math.min(1, dt * 0.8)); return p.state === 'play' || t > 14 || !this.list.includes(p); } };
    c.hideSay();
    yield c.wait(4.2);
    yield c.toPlayer(0.9);
  }

  routeOut(p) {
    const z = GARAGE.maxZ;
    const lane = p.lane;
    const end = Math.random() < 0.5 ? lane.x0 : lane.x1;
    const inside = p.h.root.position.z < z;
    p.path = [...(inside ? [new THREE.Vector3(-1.2, 0, 3.4), new THREE.Vector3(0.4, 0, z - 0.6), new THREE.Vector3(0.4, 0, z + 1.4)] : []), new THREE.Vector3(p.h.root.position.x, 0, lane.z), new THREE.Vector3(end, 0, lane.z)];
    if (inside && p.state === 'play') p.path.unshift(new THREE.Vector3(-2.2, 0, 3.1));
    p.state = 'leave';
    p.machine = null;
  }

  playMachine(p) {
    const g = this.game, m = p.machine;
    const playable = m && !m.data.broken && (m.canPlay ? m.canPlay() : m.data.stock.length > 0);
    if (!playable) {
      if (m && !m.data.stock.length && g.machines.every((x) => !x.data.stock.length)) this.complain(p, 'Everything is sold out! What kind of shop is this?');
      else this.say(p.h, 'Sold out? Aww.');
      this.routeOut(p); return;
    }
    p.state = 'play';
    p.t = 0;
    p.h.gesture('browse');
    // the price plate: too steep and they walk off grumbling (counted in the day's complaints)
    if (g.sim?.playChance && Math.random() > g.sim.playChance(m) * (p.lied === false ? 1.1 : 1)) {
      const line = g.sim.complaint?.(m, { count: false }) || pick(['Pricey...', 'For one capsule? No way.', 'Maybe next time.']);
      g.tweens.wait(1.4, () => { p.h.clearGesture?.(); this.complain(p, line); });
      g.laneMemory?.gossip('overpriced', { who: p.name });
      g.tweens.wait(4.6, () => { p.h.clearGesture?.(); this.routeOut(p); });
      return;
    }
    this.say(p.h, pick(LINES.play), 2);
    const pos = m.local(0, 1.0, m.L.front + 0.1);
    if (!m.customerPlay) {
      g.tweens.wait(1.3, () => { audio.play('coinInsert', { pos, vol: 0.6 }); });
      for (let i = 0; i < 4; i++) g.tweens.wait(1.8 + i * 0.28, () => audio.play('crankTick', { pos, vol: 0.5 }));
    }
    g.tweens.wait(m.customerPlay ? 1.2 : 3.1, () => {
      if (!this.list.includes(p)) return;
      let price, series;
      if (m.customerPlay) {
        const r = m.customerPlay();
        if (!r) return;
        ({ price, series } = r);
      } else {
        if (!m.data.stock.length) return;
        series = takeCapsule(m);
        price = capsuleCost(series) * 2;
        g.addMoney(price);
        audio.play('gachan', { pos, vol: 0.7 });
        m.openFlap?.();
      }
      g.state.stats.customers = (g.state.stats.customers || 0) + 1;
      // the empty shell: into the capsule return box, or (sometimes) dropped on your floor
      g.tweens.wait(2.6, () => {
        if (Math.random() < 0.7 && g.shells?.customerBin) g.shells.customerBin();
        else g.items.spawnShell?.(p.h.root.position.clone().add(new THREE.Vector3(0, 0.9, 0)), { series });
      });
      const lucky = Math.random() < 0.35;
      p.h.setExpression(lucky ? 'happy' : 'smile', 3);
      if (lucky && Math.random() < 0.5) { p.h.gesture(pick(BIZARRE)); this.menaceOver(p.h); } else p.h.gesture(lucky ? 'cheer' : 'shrug');
      // you told them the secret was "definitely" in there: they remember when it isn't
      if (p.lied && !lucky) g.tweens.wait(2, () => this.complain(p, 'The owner said the secret was in there. Liar!', { count: true }));
      else this.say(p.h, pick(lucky ? LINES.win : LINES.meh));
      if (lucky && Math.random() < 0.3) g.guestbook?.add({ kind: 'praise', who: cap(p.name), text: pick(['Got a rare one! Best shop on the lane!', 'Lovely little shop. Will come again.', 'The machines are so nostalgic. Thank you!']) });
      if (!g.state.flags.firstCustomer) { g.state.flags.firstCustomer = true; g.news(`Your first customer! ${formatYen(price)} in the coin box`, 'Open the coin box drawer to collect it'); }
    });
    g.tweens.wait(6.2, () => { if (!this.list.includes(p) || p.state !== 'play') return; p.h.clearGesture?.(); if (Math.random() < 0.6) this.say(p.h, pick(LINES.bye)); this.routeOut(p); });
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
    const g = this.game;
    const inShop = p.h.root.position.z < GARAGE.maxZ;
    const greet = inShop ? pick(['Nice little shop you have.', 'Oh! Are you the owner?', 'So many capsules!']) : pick(['Hm? Can I help you?', 'Oh, hello.', 'Yes?']);
    return { start: [
      greet,
      { choose: [
        { text: 'Come try the machines!', if: () => !inShop && this.open, then: [{ if: () => Math.random() < 0.6, then: ['Hmm... why not!', { do: () => { p.wantsIn = true; p.visited = false; } }], else: ['Maybe later. I\'m in a hurry.'] }] },
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
    p.h.gesture(R.gesture);
    setTimeout(() => { if (this.list.includes(p)) { this.bubbles.clear(p.h); this.say(p.h, pick(R.line), 2.8, 'shout'); } }, 150);
    try { g.effects.mark({ sprite: 'anger', pos: p.h.headTop(new THREE.Vector3()), color: 0xe5383b, life: 1.8, size: 0.05 }); } catch { /* */ }
    if (R.whack) g.tweens.wait(0.9, () => { try { audio.play('smack', { vol: 0.9 }); } catch { /* */ } g.player.shake = Math.max(g.player.shake || 0, 0.5); });
    g.guestbook?.add({ kind: 'complaint', who: cap(p.name), text: pick(['The owner SLAPPED me!', 'I got slapped. In a toy shop.', 'Assaulted by the shopkeeper. One star.']) });
    g.events.emit('complaint', { text: 'slapped', who: p.h, logged: true });
    g.laneMemory?.gossip('slap', { who: p.name });
    p.wait = 1.4;
    if (p.haggle) p.haggle.done = true;
    if (p.state !== 'leave') g.tweens.wait(1.5, () => { if (this.list.includes(p)) { p.h.clearGesture?.(); this.routeOut(p); if (R.run) p.speed *= 2.2; } });
  }

  /** Someone (Gonta) jumps out at a passer-by. */
  scare(p) {
    if (!this.list.includes(p)) return;
    p.h.gesture('cower');
    p.h.setExpression('surprised', 2);
    this.say(p.h, pick(['WAAH!', 'EEK!', 'Gah! My heart!']), 1.8, 'shout');
    p.wait = 2.2;
    this.game.tweens.wait(2, () => { if (this.list.includes(p)) this.say(p.h, pick(['Gonta! You little...!', 'Kids these days...', 'I almost dropped my groceries!'])); });
  }

  // ------------------------------------------------------------------ per frame
  update(dt) {
    const g = this.game;
    this.updateKeeper(dt);
    this.spawnT -= dt;
    if (this.spawnT <= 0 && !g.cutscene?.active) {
      // (if the next person isn't finished in the background yet, they get up to two seconds more)
      const wait = this.list.length < this.maxPeople() && !humanReady({ seed: this.seed }) && (this.spawnWait = (this.spawnWait || 0) + dt) < 2;
      if (!wait) {
        this.spawnWait = 0;
        this.spawnT = this.interval() * rnd(0.7, 1.3);
        if (this.list.length < this.maxPeople()) this.spawn();
      }
    }
    const pl = g.player.pos;
    // keep the top sheet of the stack in your hands showing the next design
    const it = g.held.item, top = it?.kind === 'tool' && it.data.id === 'flyers' ? it.obj.userData.flyerTop : null;
    if (top && top.userData.flyer !== this.nextFlyer()) { top.userData.flyer = this.nextFlyer(); top.material.map = flyerTexture(top.userData.flyer); top.material.needsUpdate = true; }
    this.askT -= dt;
    for (const p of [...this.list]) {
      const h = p.h, r = h.root;
      p.t += dt;
      if (p.read) this.updateReading(p, dt);
      let speed = 0;
      p.wait = Math.max(0, p.wait - dt);
      const tgt = p.path[0];
      if (tgt && !p.wait && p.state !== 'play' && p.state !== 'stand' && !p.talking) {
        const dx = tgt.x - r.position.x, dz = tgt.z - r.position.z, d = Math.hypot(dx, dz);
        // don't walk through the player: pause and excuse yourself
        const ahead = Math.hypot(pl.x - (r.position.x + (dx / (d || 1)) * 0.5), pl.z - (r.position.z + (dz / (d || 1)) * 0.5));
        if (ahead < 0.55) { p.wait = 0.6; if (!p.excused) { p.excused = true; this.say(h, pick(LINES.excuse), 1.6); } }
        else if (d < 0.15) p.path.shift();
        else {
          speed = p.speed * (p.state === 'goIn' || p.state === 'leave' || p.state === 'goStand' ? 0.85 : 1);
          const step = Math.min(d, speed * dt);
          r.position.x += (dx / d) * step;
          r.position.z += (dz / d) * step;
          const want = Math.atan2(dx, dz);
          r.rotation.y += ((want - r.rotation.y + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 7);
        }
      }
      // decisions
      if (p.state === 'stroll') {
        const nearShop = Math.abs(r.position.x - 0.4) < 1.2 && r.position.z > GARAGE.maxZ;
        if (nearShop && !p.visited) {
          p.visited = true;
          if (Math.random() < 0.5) this.say(h, pick(this.open ? LINES.open : LINES.closed));
          const open = this.open && (!g.sim?.isOpen || g.sim.isOpen());
          const sales = open && p.collector ? (g.packing?.forSale?.() || []).filter((s) => !this.list.some((o) => o.sale === s)) : [];
          const m = open && p.wantsIn ? g.machines.filter((x) => !x.data.broken && !x.data.fallen && x.data.stock.length)[Math.floor(Math.random() * 3)] || g.machines.find((x) => !x.data.broken && x.data.stock.length) : null;
          if (sales.length && (Math.random() < 0.6 || !m)) this.routeStand(p, pick(sales));
          else if (m && !this.list.some((o) => o !== p && o.machine === m && (o.state === 'goIn' || o.state === 'play'))) {
            this.routeIn(p, m);
            if (!g.state.flags.firstVisitScene && !g.cutscene.active) { g.state.flags.firstVisitScene = true; g.cutscene.play((c) => this.firstCustomerScene(c, p)); }
          } else if (open && p.wantsIn && !g.machines.some((x) => x.data.stock.length) && g.machines.length) this.complain(p, 'Sold out? Everything?! Aww.');
        }
        p.chatT -= dt;
        if (p.chatT < 0) { p.chatT = rnd(14, 30); if (Math.random() < 0.3) this.say(h, pick(LINES.stroll)); }
        if (!p.path.length) { this.remove(p); continue; }
      } else if (p.state === 'goIn' && !p.path.length) {
        const m = p.machine;
        r.rotation.y = m.root.rotation.y + Math.PI;
        // litter on the floor? they notice
        if (!p.noticed && (g.items?.list ? [...g.items.list].filter((e) => e.kind === 'shell' && e.obj.position.z < GARAGE.maxZ).length : 0) >= 4) { p.noticed = true; this.complain(p, pick(LINES.dirty)); }
        this.playMachine(p);
      } else if (p.state === 'goStand' && !p.path.length) {
        p.state = 'stand';
        const s = p.sale.stand.root.position;
        r.rotation.y = Math.atan2(s.x - r.position.x, s.z - r.position.z);
        if (!p.sale.stand.display.items[0]) { this.routeOut(p); continue; }
        this.startHaggle(p, p.sale);
      } else if (p.state === 'stand') {
        const H = p.haggle;
        if (!H) { this.routeOut(p); continue; }
        H.t += dt;
        if (!p.talking && (H.done || p.wantsOut)) { p.h.clearGesture?.(); g.tweens.wait(1.2, () => this.list.includes(p) && this.routeOut(p)); p.state = 'leaving'; }
        else if (!p.talking && H.t > 20 + p.patience * 25) {
          H.done = true;
          this.say(h, 'Nobody to ask... never mind.');
          g.guestbook?.add({ kind: 'question', who: cap(p.name), text: `Wanted to buy the ${H.name}, but nobody was around.` });
          g.tweens.wait(1.4, () => this.list.includes(p) && this.routeOut(p)); p.state = 'leaving';
        } else if (!p.talking && Math.floor(H.t) % 9 === 8 && Math.floor(H.t - dt) % 9 !== 8 && Math.hypot(pl.x - r.position.x, pl.z - r.position.z) < 9) this.say(h, pick(['Excuse me?', 'Hello? Shopkeeper?', 'About this figure...']), 2);
      } else if (p.state === 'leave' && !p.path.length) { this.remove(p); continue; }
      // a question for you when you're close to someone in the shop
      const pd = Math.hypot(pl.x - r.position.x, pl.z - r.position.z);
      if (!p.asked && !p.talking && this.askT <= 0 && pd < 3.2 && (p.state === 'goIn' || p.state === 'play') && !g.talk?.active && !g.cutscene?.active && g.input.locked) { this.askT = rnd(18, 35); this.ask(p); }
      // animation: full rate up close, a few frames a second far away or off screen
      let adt = dt;
      if (pd > 9 && !p.talking) {
        p.lodT -= dt; p.acc += dt;
        if (p.lodT > 0) continue;
        _v.copy(r.position); _v.y += 1;
        const v = _v.project(g.camera);
        p.lodT = v.z < 1 && Math.abs(v.x) < 1.15 && Math.abs(v.y) < 1.2 ? (pd > 25 ? 0.15 : 0.05) : 0.4;
        adt = Math.min(0.1, p.acc); p.acc = 0;
      }
      const look = p.talking ? _look.set(pl.x, g.player.eye, pl.z) : (p.state === 'play' && p.machine ? p.machine.local(0, 1.2, 0.3) : p.state === 'stand' && p.sale ? _look.copy(p.sale.stand.root.position).setY(p.sale.stand.root.position.y + 0.15) : (pd < 3 ? g.camera.position : null));
      if (p.talking) { const want = Math.atan2(pl.x - r.position.x, pl.z - r.position.z); r.rotation.y += Math.atan2(Math.sin(want - r.rotation.y), Math.cos(want - r.rotation.y)) * Math.min(1, dt * 5); }
      h.update(adt, { speed, lookAt: look, talking: this.bubbles.isTalking?.(h) });
    }
    this.bubbles.update(dt);
  }
}

const cap = (s) => String(s || '').replace(/^the /, 'The ');
