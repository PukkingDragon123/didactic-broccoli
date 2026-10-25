// People of the lane: a few neighbours stroll from tunnel to tunnel. Promote the shop (hand out flyers)
// and more of them come by; once GACHA GARAGE is open some turn in, play a machine (you earn the coins),
// chat in speech bubbles and wander off again. Also the shopkeeper behind Mikawa-ya's counter.
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { GARAGE, MACHINE_SLOTS } from './Garage.js';
import { createHuman, Bubbles, HUMAN_PRESETS } from '../people/index.js';
import { capsuleCost } from '../game/economy.js';
import { formatYen } from '../core/util.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

const LINES = {
  closed: ['That old garage has been shut for years...', 'I used to buy capsule toys here as a kid.', 'Is someone cleaning the old gacha place?', 'Hm? Light in the garage?'],
  open: ['Oh! The gacha garage is open again!', 'Capsule toys? Just one go...', 'I remember this place!', 'Ooh, what series do they have?'],
  stroll: ['Getting chilly in the evenings.', 'The 6:40 train is late again.', 'Did I leave the rice cooker on?', 'Nice sunset today.', 'I should call my mother.'],
  flyer: ['A flyer? Oh, a gacha shop! I will take a look.', 'Thank you! Capsule toys, how nostalgic.', 'Hm, maybe later. Thanks!', 'Ooh, cute. My kid will love this.'],
  play: ['Here goes...', 'Come on, the rare one...', 'One more turn, just one!', 'Please be the cat one...'],
  win: ['Yes! The one I wanted!', 'No way, a rare!', 'Look how tiny and detailed!', 'So cute!'],
  meh: ['Aww, I already have this one.', 'Next time...', 'Hm, not bad.', 'A double. Typical.'],
  bye: ['Thanks! I will come back.', 'See you!', 'I will tell my friends about this place.', 'What a nice little shop.'],
  excuse: ['Excuse me!', 'Pardon me.', 'Oops, sorry!'],
  keeper: ['Welcome! Irasshaimase!', 'Ah, Grandpa\'s kid! Need anything?', 'Milk is in the fridge, brooms by the door.', 'Come again!'],
};

/** A customer's turn: one capsule leaves the machine's stock (and its window pile). Returns its series. */
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
    this.buildKeeper();
  }

  get promo() { return this.game.state.promo || (this.game.state.promo = { flyers: 0, level: 0 }); }
  setOpen(v) { this.open = v; this.spawnT = Math.min(this.spawnT, 4); }

  /** Promotion level 0..5 from flyers handed out (+1 each 8 flyers) and shop goods. */
  level() {
    const g = this.game, p = this.promo;
    let lv = Math.floor(p.flyers / 8);
    if (g.state.goods?.neon_open) lv += 1;
    return Math.min(5, lv);
  }

  maxPeople() { return this.open ? 2 + this.level() * 2 : 1; }
  interval() { return this.open ? 26 / (1 + this.level() * 0.6) : 45; }

  // ------------------------------------------------------------------ the shopkeeper of Mikawa-ya
  buildKeeper() {
    const shop = this.game.garage.town?.cornerShop;
    if (!shop?.keeper) return;
    const h = createHuman({ preset: HUMAN_PRESETS.find((p) => /keeper|shop/i.test(p.id))?.id, seed: 77 });
    h.root.position.copy(shop.keeper.pos);
    h.root.rotation.y = shop.keeper.rotY;
    this.group.add(h.root);
    this.keeper = { h, greetT: 0, near: false };
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
    k.h.update(dt, { speed: 0, lookAt: k.look || (near ? this.game.camera.position : null), talking: this.bubbles.isTalking(k.h) });
  }

  // ------------------------------------------------------------------ spawning
  spawn() {
    const g = this.game, town = g.garage.town;
    const lanes = town?.lanes?.length ? town.lanes : [{ z: GARAGE.maxZ + 2.2, x0: -24, x1: 24 }, { z: GARAGE.maxZ + 8.0, x0: -24, x1: 24 }];
    const lane = pick(lanes);
    const dir = Math.random() < 0.5 ? 1 : -1;
    const x0 = dir > 0 ? lane.x0 : lane.x1, x1 = dir > 0 ? lane.x1 : lane.x0;
    const h = createHuman({ seed: this.seed++ });
    h.root.position.set(x0, 0, lane.z + rnd(-0.3, 0.3));
    h.root.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    this.group.add(h.root);
    const p = { h, path: [new THREE.Vector3(x1, 0, h.root.position.z)], state: 'stroll', speed: rnd(1.0, 1.35) * (h.height < 1.35 ? 1.15 : 1), t: 0, chatT: rnd(4, 14), lane, visited: false, flyer: false, wait: 0 };
    // will they come in?
    if (this.open && Math.random() < 0.18 + this.level() * 0.1) p.wantsIn = true;
    g.interaction.add(h.root, {
      reach: 2.6,
      hint: () => (g.held.holding('flyers') && !p.flyer && p.state === 'stroll' ? { key: 'LMB', text: 'Hand out a flyer' } : null),
      use: () => { if (g.held.holding('flyers')) this.giveFlyer(p); return false; },
      noHighlight: true,
    });
    this.list.push(p);
  }

  remove(p) {
    this.game.interaction.remove(p.h.root);
    this.bubbles.clear?.(p.h);
    p.h.root.parent?.remove(p.h.root);
    p.h.dispose?.();
    this.list.splice(this.list.indexOf(p), 1);
  }

  say(h, text, dur = 3.2) {
    this.bubbles.say(h, text, { dur, onChar: (ch) => { if (/[a-z]/i.test(ch) && Math.random() < 0.5) audio.play('blip', { f: 380 + (h.height || 1.6) * 120, vol: 0.4 }); } });
  }

  giveFlyer(p) {
    const g = this.game, it = g.held.item;
    if (!it || p.flyer) return;
    p.flyer = true;
    it.data.uses = (it.data.uses || 1) - 1;
    if (it.data.uses <= 0) g.held.consume(); else g.events.emit('slot', g.held.sel);
    this.promo.flyers++;
    audio.play('paper', { vol: 0.8 });
    p.h.gesture('bow');
    this.say(p.h, pick(LINES.flyer));
    p.wait = 1.8;
    if (Math.random() < 0.65) p.wantsIn = true;
    const lv = this.level();
    if (lv > (this.promo.level || 0)) { this.promo.level = lv; g.news('Word is getting around!', `More people will visit (promotion level ${lv})`); audio.play('task', { vol: 0.6 }); }
  }

  /** Waypoints from the lane into the shop to stand in front of a machine. */
  routeIn(p, m) {
    const z = GARAGE.maxZ;
    const slot = MACHINE_SLOTS[m.data.slot];
    p.machine = m;
    p.path = [new THREE.Vector3(0.4, 0, z + 1.4), new THREE.Vector3(0.4, 0, z - 0.6), new THREE.Vector3(-2.2, 0, 3.1), new THREE.Vector3(-2.45, 0, slot.z)];
    p.state = 'goIn';
  }

  /** The very first customer gets a little cutscene: watch them walk in and try their luck. */
  *firstCustomerScene(c, p) {
    const g = this.game, r = p.h.root;
    const head = () => r.position.clone().add(new THREE.Vector3(0, 1.3, 0));
    yield c.cam({ pos: new THREE.Vector3(1.9, 1.55, 1.6), look: head(), dur: 1.1 });
    c.say('Your very first customer!', 1.6);
    let t = 0;
    yield { update: (dt) => { t += dt; c.look.lerp(head(), Math.min(1, dt * 4)); c.pos.lerp(new THREE.Vector3(r.position.x + 1.8, 1.5, r.position.z - 1.4), Math.min(1, dt * 0.8)); return p.state === 'play' || t > 14 || !this.list.includes(p); } };
    c.hideSay();
    yield c.wait(4.2);
    yield c.toPlayer(0.9);
    void g;
  }

  routeOut(p) {
    const z = GARAGE.maxZ;
    const lane = p.lane;
    const end = Math.random() < 0.5 ? lane.x0 : lane.x1;
    p.path = [new THREE.Vector3(-2.2, 0, 3.1), new THREE.Vector3(0.4, 0, z - 0.6), new THREE.Vector3(0.4, 0, z + 1.4), new THREE.Vector3(0.4, 0, lane.z), new THREE.Vector3(end, 0, lane.z)];
    p.state = 'leave';
  }

  playMachine(p) {
    const g = this.game, m = p.machine;
    if (!m || m.data.broken || !m.data.stock.length) { this.say(p.h, 'Sold out? Aww.'); this.routeOut(p); return; }
    p.state = 'play';
    p.t = 0;
    p.h.gesture('browse');
    this.say(p.h, pick(LINES.play), 2);
    const pos = m.local(0, 1.0, m.L.front + 0.1);
    g.tweens.wait(1.3, () => { audio.play('coinInsert', { pos, vol: 0.6 }); });
    for (let i = 0; i < 4; i++) g.tweens.wait(1.8 + i * 0.28, () => audio.play('crankTick', { pos, vol: 0.5 }));
    g.tweens.wait(3.1, () => {
      if (!m.data.stock.length) return;
      const series = takeCapsule(m);
      const price = capsuleCost(series) * 2;
      g.addMoney(price);
      g.state.stats.customers = (g.state.stats.customers || 0) + 1;
      audio.play('gachan', { pos, vol: 0.7 });
      g.effects.coinBurst({ pos: pos.clone().add(new THREE.Vector3(0, 0.3, 0)), count: 6, up: 1.2, spread: 0.3, life: 1 });
      m.openFlap?.();
      const lucky = Math.random() < 0.35;
      p.h.setExpression(lucky ? 'happy' : 'smile', 3);
      p.h.gesture(lucky ? 'cheer' : 'shrug');
      this.say(p.h, pick(lucky ? LINES.win : LINES.meh));
      if (!g.state.flags.firstCustomer) { g.state.flags.firstCustomer = true; g.news(`Your first customer! +${formatYen(price)}`, 'Customers pay for every turn on your machines'); }
    });
    g.tweens.wait(6.2, () => { p.h.clearGesture?.(); if (Math.random() < 0.6) this.say(p.h, pick(LINES.bye)); this.routeOut(p); });
  }

  // ------------------------------------------------------------------ per frame
  update(dt) {
    const g = this.game;
    this.updateKeeper(dt);
    this.spawnT -= dt;
    if (this.spawnT <= 0 && !g.cutscene?.active) {
      this.spawnT = this.interval() * rnd(0.7, 1.3);
      if (this.list.length < this.maxPeople()) this.spawn();
    }
    const pl = g.player.pos;
    for (const p of [...this.list]) {
      const h = p.h, r = h.root;
      p.t += dt;
      let speed = 0;
      p.wait = Math.max(0, p.wait - dt);
      const tgt = p.path[0];
      if (tgt && !p.wait && p.state !== 'play') {
        const dx = tgt.x - r.position.x, dz = tgt.z - r.position.z, d = Math.hypot(dx, dz);
        // don't walk through the player: pause and excuse yourself
        const ahead = Math.hypot(pl.x - (r.position.x + (dx / (d || 1)) * 0.5), pl.z - (r.position.z + (dz / (d || 1)) * 0.5));
        if (ahead < 0.55) { p.wait = 0.6; if (!p.excused) { p.excused = true; this.say(h, pick(LINES.excuse), 1.6); } }
        else if (d < 0.15) p.path.shift();
        else {
          speed = p.speed * (p.state === 'goIn' || p.state === 'leave' ? 0.85 : 1);
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
          const m = this.open && p.wantsIn ? g.machines.filter((x) => !x.data.broken && !x.data.fallen && x.data.stock.length)[Math.floor(Math.random() * 3)] || g.machines.find((x) => !x.data.broken && x.data.stock.length) : null;
          if (m && !this.list.some((o) => o !== p && o.machine === m && (o.state === 'goIn' || o.state === 'play'))) {
            this.routeIn(p, m);
            if (!g.state.flags.firstVisitScene && !g.cutscene.active) { g.state.flags.firstVisitScene = true; g.cutscene.play((c) => this.firstCustomerScene(c, p)); }
          }
        }
        p.chatT -= dt;
        if (p.chatT < 0) { p.chatT = rnd(14, 30); if (Math.random() < 0.3) this.say(h, pick(LINES.stroll)); }
        if (!p.path.length) { this.remove(p); continue; }
      } else if (p.state === 'goIn' && !p.path.length) {
        // face the machine and play
        const m = p.machine;
        r.rotation.y = m.root.rotation.y + Math.PI;
        this.playMachine(p);
      } else if (p.state === 'leave' && !p.path.length) { this.remove(p); continue; }
      const look = p.state === 'play' && p.machine ? p.machine.local(0, 1.2, 0.3) : (Math.hypot(pl.x - r.position.x, pl.z - r.position.z) < 3 ? g.camera.position : null);
      h.update(dt, { speed, lookAt: look, talking: this.bubbles.isTalking?.(h) });
    }
    this.bubbles.update(dt);
  }
}
