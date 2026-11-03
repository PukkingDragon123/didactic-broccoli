// Mikawa-ya, the corner store, run for real: everything for sale stands on its shelves (src/world/CornerShop.js stock
// plus the bread and onigiri wagon, pudding in the milk case, cup noodles, seeds and a watering can). Look at a thing:
// its name and price; click: you pay cash (the coins fly to the counter) and it's in your hands. Things come back on
// the shelves after a while. The old man (src/places/mikawaya/oldman.js) stands behind the counter puffing a cigar
// through his mask; he dozes off late at night (pay into the tray, he won't notice). Talk to him (click him or the
// counter): recommendations, the "your next line is..." trick, how he is definitely nobody famous, and a part-time
// cashier shift (src/places/mikawaya/cashier.js).
//   game.places.mikawaya = { oldman, stock, buy(unit), talk(), cashier }
// Save: game.state.mikawaya (ensureState): { met, rel, gone: { id: true } (sold for good), shifts, lastShift }.
import * as THREE from 'three';
import { ensureState } from '../../game/stateExt.js';
import { audio } from '../../core/audio.js';
import { makeToolMesh } from '../../game/Held.js';
import { SUPPLY_BY_ID } from '../../data/supplies.js';
import { FOODS } from '../../needs/foods.js';
import { TOOLS } from '../../data/tools.js';
import { makeOldMan } from './oldman.js';
import { Cashier } from './cashier.js';
import { payCash, yen } from '../money.js';
import { prop, hitBox } from '../util.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rnd = (a, b) => a + Math.random() * (b - a);
const _v = new THREE.Vector3();
const PLANT = { seeds: { name: 'Morning Glory Seeds', price: 200, desc: 'A summer classic. Plant them, water them every morning.' }, watering_can: { name: 'Watering Can', price: 800, desc: 'A blue tin watering can. Fill it at any tap.' }, fertiliser: { name: 'Fertiliser', price: 400, desc: 'Three scoops. Dr. Kusaka swears by it.' } };
const WAGON = { x: -10.85, z: 16.45 };

export class Mikawaya {
  constructor(game, places) {
    this.game = game;
    this.places = places;
    const town = game.garage.town;
    this.cs = town?.cornerShop;
    this.s = ensureState(game, 'mikawaya', { v: 1, met: false, rel: 0, gone: {}, shifts: 0, lastShift: 0, talks: 0 });
    this.units = [];
    this.t = 0;
    this.smokeT = 2;
    this.greetT = 0;
    this.inside = false;
    if (!this.cs) return;
    this.mats = town.indoorVoxel();
    this.group = new THREE.Group();
    this.group.name = 'mikawaya:stock';
    game.scene.add(this.group);
    this.buildWagon();
    this.buildStock();
    this.buildOldMan();
    this.hookCounter();
    this.cashier = new Cashier(game, this);
  }

  // ------------------------------------------------------------------ the goods, physically on the shelves
  buildWagon() {
    const w = prop('mk_wagon', this.mats, WAGON.x, 0, WAGON.z, Math.PI / 2);
    this.group.add(w);
    this.game.player.addObstacle(WAGON.x - 0.24, WAGON.x + 0.24, WAGON.z - 0.34, WAGON.z + 0.34);
  }

  /** A unit on a shelf: { id (food / supply / plant id), mesh, entry }. */
  addUnit(entry, u) {
    const m = prop(entry.prop, this.mats);
    m.position.copy(u.p); m.quaternion.copy(u.q); m.scale.setScalar(u.s || 1);
    this.group.add(m);
    const unit = { entry, mesh: m, gone: false, t: 0 };
    if (entry.jar) {
      // an endless jar: the click target is the jar itself (the prop is the candy, shown on the lid)
      m.visible = false;
      const hb = hitBox(...(entry.hit || [0.17, 0.25, 0.17]), u.p.x, u.p.y + 0.12, u.p.z);
      this.group.add(hb);
      unit.hit = hb;
    } else unit.hit = m;
    this.game.interaction.add(unit.hit, {
      reach: 2.2,
      hint: () => this.hint(unit),
      use: () => { this.buy(unit); return false; },
    });
    this.units.push(unit);
    if (entry.unique && this.s.gone[entry.id]) this.setGone(unit, true, true);
    return unit;
  }

  buildStock() {
    // the corner shop's own stock (supplies + dagashi): milk, brooms, tool kits, batteries, tubes, the watch, flyers...
    for (const e of this.cs.stock) for (const u of e.units) this.addUnit({ ...e, kind: 'supply' }, u);
    const Q = (ry = 0, rx = 0, rz = 0) => new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ'));
    const add = (id, propId, kind, list, restock = 40) => { for (const [x, y, z, ry, rx] of list) this.addUnit({ id, prop: propId, kind, restock }, { p: V(x, y, z), q: Q(ry || 0, rx || 0), s: 1 }); };
    const top = 0.765, low = 0.285, wx = WAGON.x;
    // the wagon: onigiri standing in rows facing the aisle, bread at the end, cup noodles and seeds underneath
    add('oni_tuna', 'food_onigiri_tuna', 'food', [[wx - 0.08, top, 16.24, -Math.PI / 2], [wx + 0.08, top, 16.24, -Math.PI / 2]]);
    add('oni_ume', 'food_onigiri_ume', 'food', [[wx - 0.08, top, 16.38, -Math.PI / 2], [wx + 0.08, top, 16.38, -Math.PI / 2]]);
    add('oni_shake', 'food_onigiri_shake', 'food', [[wx - 0.08, top, 16.52, -Math.PI / 2], [wx + 0.08, top, 16.52, -Math.PI / 2]]);
    add('melonpan', 'food_melonpan', 'food', [[wx - 0.09, top, 16.68, 0.3]]);
    add('anpan', 'food_anpan', 'food', [[wx + 0.09, top, 16.68, -0.4]]);
    add('cupnoodle', 'room_cupnoodle', 'food', [[wx - 0.07, low, 16.22, 0.2], [wx + 0.08, low, 16.24, -0.5], [wx, low, 16.4, 1.1]]);
    add('seeds', 'seed_packet', 'plant', [[wx - 0.07, low + 0.004, 16.62, -Math.PI / 2 + 0.2, -Math.PI / 2], [wx + 0.07, low + 0.004, 16.64, -Math.PI / 2 - 0.15, -Math.PI / 2]], 60);
    this.fert = [];
    add('fertiliser', 'fertiliser', 'plant', [[wx, low, 16.7, -Math.PI / 2]], 60);
    this.fert.push(this.units[this.units.length - 1]);
    add('watering_can', 'watering_can', 'plant', [[-11.12, 0, 16.92, -2.2]], 90);
    // chilled pudding in the milk case
    add('purin', 'food_purin', 'food', [[-9.91, 0.8, 17.73, -Math.PI / 2], [-9.91, 1.16, 17.56, -Math.PI / 2]], 50);
    this.refreshFert();
  }

  refreshFert() {
    const ok = !!this.game.state.plants?.lessons?.survey || !!this.game.state.plants?.lessons?.water;
    for (const u of this.fert) { u.locked = !ok; if (!u.gone) u.mesh.visible = ok; }
  }

  info(entry) {
    if (entry.kind === 'supply') { const s = SUPPLY_BY_ID[entry.id]; return s ? { name: s.name, price: s.price, desc: s.desc, tool: s.tool, uses: s.uses } : null; }
    if (entry.kind === 'plant') { const p = PLANT[entry.id]; return { ...p, tool: entry.id, uses: entry.id === 'fertiliser' ? 3 : undefined }; }
    const f = FOODS[entry.id];
    return f ? { name: f.name, price: f.price, desc: `${f.pros}. ${f.cons ? f.cons + '.' : ''}`, tool: entry.id } : null;
  }

  hint(unit) {
    if (unit.gone || unit.locked) return null;
    const i = this.info(unit.entry);
    if (!i) return null;
    if (this.cashier?.active) return { key: '', text: `${i.name} ${yen(i.price)}`, sub: 'You are minding the register' };
    const H = this.game.held;
    if (!H.canTake() && !(i.tool === 'flyers' && H.has('flyers'))) return { key: '', text: `${i.name}  ${yen(i.price)}`, sub: 'Your hands are full: free a slot (Q puts things down)' };
    const cash = this.game.wallet ? this.game.wallet.cash : this.game.state.money;
    return { key: 'LMB', text: `Buy ${i.name}  ${yen(i.price)}`, sub: cash < i.price ? `You have ${yen(cash)} in your wallet` : i.desc };
  }

  /** Pay for the thing and take it off the shelf into your hand. */
  buy(unit) {
    const g = this.game, H = g.held, e = unit.entry, i = this.info(e);
    if (!i || unit.gone || unit.locked || this.cashier?.active) return;
    if (!H.canTake() && !(i.tool === 'flyers' && H.has('flyers'))) { g.news('Your hands are full', 'Free a slot first'); audio.play('error', { vol: 0.4 }); return; }
    const till = this.cs.counter.getWorldPosition(new THREE.Vector3()).add(V(0, 0.55, 0));
    if (!payCash(g, i.price, `Mikawa-ya: ${i.name}`, till)) { this.line(pick(['You\'re short, kid. Your next line is: "I\'ll be right back!"', 'Money first, kid. Even for you.', 'Hm. The ATM is across the lane.'])); return; }
    const from = unit.hit.getWorldPosition(new THREE.Vector3());
    if (!e.jar) this.setGone(unit, true);
    else audio.play('lidCreak', { pos: from, vol: 0.5 });
    if (e.unique) this.s.gone[e.id] = true;
    // flyers stack up in the slot you have
    const fi = i.tool === 'flyers' ? H.find('flyers') : -1;
    if (fi >= 0) { H.slots[fi].data.uses += i.uses || 30; g.events.emit('slot', H.sel); }
    else {
      const obj = makeToolMesh(i.tool);
      obj.position.copy(from);
      g.scene.add(obj);
      const extra = i.uses ? { uses: i.uses } : {};
      if (i.tool === 'cupnoodle') extra.water = true;
      H.take('tool', { id: i.tool, ...extra }, obj);
    }
    audio.play('register', { pos: till, vol: 0.4 });
    g.events.emit('bought', { at: 'mikawaya', id: e.id, price: i.price });
    if (i.tool === 'cupnoodle') this.line('Hot water\'s on the house. Three minutes. Don\'t burn your tongue.');
    else if (Math.random() < 0.5) this.line(pick(['Thank you kindly.', 'Good choice.', 'Hm. Again?', 'Mind the step.', TOOLS[i.tool] && FOODS[i.tool] ? 'Eat it while it\'s fresh.' : 'Use it well.']));
    g.save();
  }

  setGone(unit, gone, forever = false) {
    unit.gone = gone;
    unit.mesh.visible = !gone && !unit.locked && !unit.entry.jar;
    unit.t = gone ? (forever ? Infinity : (unit.entry.restock || 40) * rnd(0.8, 1.3)) : 0;
  }

  // ------------------------------------------------------------------ the old man
  buildOldMan() {
    const g = this.game, cs = this.cs;
    const om = this.oldman = makeOldMan(this.mats); // (lit like the rest of the shop: no sun indoors)
    const h = om.h;
    this.home = { pos: cs.keeper.pos.clone(), rotY: cs.keeper.rotY };
    h.root.position.copy(this.home.pos);
    h.root.rotation.y = this.home.rotY;
    g.scene.add(h.root);
    // the old shopkeeper (src/world/Pedestrians.js) steps aside: the story's scenes and lines use this one now
    const P = g.pedestrians;
    if (P?.keeper) { P.keeper.h.root.parent?.remove(P.keeper.h.root); P.keeper.h.dispose?.(); }
    this.keeper = { h, greetT: 0, near: false, name: 'Mikawa-san', id: 'mikawa', look: null };
    if (P) { P.keeper = this.keeper; P.updateKeeper = () => {}; }
    // click him to talk
    const hit = hitBox(0.62, 1.9, 0.5, 0, 0.95, 0);
    h.root.add(hit);
    hit.userData.human = h;
    g.interaction.add(hit, {
      reach: 2.8,
      hint: () => (this.busy() ? null : { key: 'LMB', text: 'Talk to Mikawa-san', sub: this.napping() ? 'He\'s fast asleep' : 'The old man who runs the shop' }),
      use: () => { this.talk(); return false; },
    });
    this.hit = hit;
    this.who = { name: 'Mikawa-san', id: 'mikawa', h, color: '#e8c070', tts: h.tts };
  }

  /** The counter (the guide points here; Game used to open a shop list): talk to him. */
  hookCounter() {
    const g = this.game, c = this.cs.counter;
    if (!c) return;
    g.interaction.remove(c);
    g.interaction.add(c, {
      reach: 2.6,
      hint: () => (this.busy() ? null : { key: 'LMB', text: 'Mikawa-ya\'s counter', sub: 'Everything is on the shelves: look at it to buy. Click to talk to the old man.' }),
      use: () => { this.talk(); return false; },
    });
  }

  busy() { return this.game.talk?.active || this.cashier?.active || this.game.cutscene?.active; }
  napping() { const h = this.game.clock?.hours ?? 15; return (h >= 23 || h < 6) && !this.cashier?.active; }

  /** A floating line over his head (8-bit voice). */
  line(text, dur) {
    const g = this.game, h = this.oldman.h;
    if (this.napping() || !g.bubbles) return;
    g.bubbles.say(h, text, { dur: dur ?? Math.max(2.4, 1.2 + text.length * 0.055) });
  }

  update(dt) {
    if (!this.cs) return;
    const g = this.game, pp = g.player.pos, h = this.oldman.h;
    this.t += dt;
    const d = Math.hypot(pp.x - h.root.position.x, pp.z - h.root.position.z);
    const near = d < 30;
    this.group.visible = d < 14;
    // restocking
    for (const u of this.units) if (u.gone && u.t !== Infinity) { u.t -= dt; if (u.t <= 0) this.setGone(u, false); }
    if (this.t % 5 < dt) this.refreshFert();
    this.cashier?.update(dt);
    if (!near || this.cashier?.napState) return;
    const cs = this.cs, inside = pp.x > cs.inside.minX && pp.x < cs.inside.maxX && pp.z > cs.inside.minZ && pp.z < cs.inside.maxZ;
    const nap = this.napping();
    // a greeting when you come in
    this.greetT -= dt;
    if (inside && !this.inside && this.greetT <= 0 && !this.busy()) {
      this.greetT = 50;
      if (!nap) this.line(this.s.met ? pick(['Irasshai.', 'Ah. Grandpa\'s kid.', 'Take your time. I\'ve got all day.', 'Back again? Hohoho.']) : 'Irasshai...');
    }
    this.inside = inside;
    // the cigar
    if (!nap && d < 12) {
      this.smokeT -= dt;
      if (this.smokeT <= 0) {
        this.smokeT = rnd(2.5, 5.5);
        const p = this.oldman.cigarTip(_v);
        g.effects.puff({ pos: p, count: 2 + Math.floor(Math.random() * 2), colors: [0xdcdcd4, 0xc4c4bc, 0xe8e8e0], size: 0.035, speed: 0.06, up: 0.16, gravity: -0.08, drag: 1.4, life: 2.6, radius: 0.01 });
        if (d < 5 && Math.random() < 0.5) audio.play('cigar', { pos: p, vol: 0.35 });
      }
    } else if (nap && d < 14) {
      this.smokeT -= dt;
      if (this.smokeT <= 0) { this.smokeT = rnd(1.8, 2.8); g.effects.mark({ sprite: 'zz', pos: h.headTop(_v).add(V(0.05, 0.02, 0)), color: 0xdce8ff, size: 0.05, life: 2.2, rise: 0.16, dx: 0.06 }); if (d < 6) audio.play('snore', { pos: _v, vol: 0.4 }); }
    }
    if (nap && !this.dozing) { this.dozing = true; h.setExpression('sleepy', 1e6); }
    if (!nap && this.dozing) { this.dozing = false; h.setExpression('neutral'); }
    const look = this.keeper.look || (inside && !nap ? g.camera.position : null);
    h.update(dt, { speed: 0, lookAt: look, talking: !!g.bubbles?.isTalking(h) || (g.talk?.active && g.talk.with?.h === h) });
  }

  // ------------------------------------------------------------------ talking
  talk() {
    const g = this.game, S = this.s;
    if (this.busy() || !g.talk) return;
    if (this.napping()) {
      audio.play('snore', { vol: 0.5 });
      g.monologue?.say(pick(['He\'s asleep. Snoring through the mask.', 'Better not wake him.', 'Zzz... "...Nigeru... no..." He\'s talking in his sleep.']), { force: true });
      return;
    }
    S.talks = (S.talks || 0) + 1;
    g.state.flags.metKeeper = true;
    const self = this;
    g.talk.start(this.who, async (t) => {
      if (!S.met) {
        S.met = true;
        await t.say('...Hm? A new face. Grandpa\'s kid, by the look of you. Welcome to Mikawa-ya.', { gesture: 'bow' });
        await t.say('Everything\'s on the shelves. Pick it up, you pay me, simple. No lists, no screens.');
        await t.say('Name\'s Mikawa. Just Mikawa. Never been anywhere, never fought anything. Just an old man with a shop.');
      } else await t.say(pick(['Hm? What is it, kid?', 'Irasshai. Need something?', 'You again. Good. The shop was getting quiet.']));
      for (let round = 0; round < 6; round++) {
        const shift = self.cashier.available();
        const opts = ['What\'s good today?', 'You look... very familiar.', shift === true ? 'Need a hand at the register?' : 'About that cigar...', 'See you, Mikawa-san.'];
        const i = await t.choose(opts);
        if (i === 0) await self.recommend(t);
        else if (i === 1) await self.notHim(t);
        else if (i === 2 && shift === true) {
          await t.say('Hohoho. Funny you should ask. My back says it\'s nap time.');
          await t.say('Mind the register for me. Punch the prices, give the right change. Five customers. ¥1,500, cash.');
          const y = await t.choose(['Leave it to me!', 'Maybe later.']);
          if (y === 0) { await t.say('Good. I\'ll be on the tatami. Wake me if there\'s a robbery. Or a fire. Not for a cockroach.'); self.startShift = true; return 'shift'; }
          await t.say('Hm. Your loss.');
        } else if (i === 2) {
          await t.say('The doctor says I have to quit. So I wear the mask.');
          await t.say('...Problem solved.', { expr: 'smug' });
          if (typeof shift === 'string') await t.say(shift);
        } else { await t.say(pick(['Come again. Mind the step.', 'Hm. Don\'t be a stranger.', 'Off you go. Run away if anything strange happens. Running is a fine strategy.'])); return; }
      }
    }, { name: 'Mikawa-san', id: 'mikawa', color: '#e8c070' }).then((r) => {
      if (this.startShift) { this.startShift = false; g.tweens.wait(0.3, () => this.cashier.start()); }
      void r;
    });
  }

  async recommend(t) {
    const g = this.game, h = g.clock?.hours ?? 15, N = g.needs;
    if (N && N.energy < 30) await t.say('You look half dead, kid. Eat something. Onigiri on the wagon. Pudding in the case, for later.');
    else if (N && N.hangover > 0.2) await t.say('Hohoho. Rough night? The blue sports drink in the machine outside. Trust me. I know.');
    else if (h < 10) await t.say('Morning? Onigiri and a hot can from the machine. Salmon. Your grandpa always took the salmon.');
    else if (h < 17) await t.say('Afternoon? A ramune from the tub. Thumb the marble in. Don\'t let it fly into your eye.');
    else await t.say('Evening. Cup noodles. I\'ll pour the water. Or go and see the ramen fellow down the lane, if you have the money.');
    if (g.places?.plants && !g.held.has('watering_can')) await t.say('And grow something, kid. Seeds on the wagon, the can by the counter. A shop needs something alive in it.');
  }

  /** "You're... aren't you...?" No. Never. */
  async notHim(t) {
    const S = this.s;
    S.rel = (S.rel || 0) + 1;
    if ((S.joke || 0) % 3 === 0) {
      await t.say('Familiar? Hohoho. I have that kind of face.');
      await t.say('Let me guess. Your next line is: "Wait, how did you know what I was going to say?!"', { gesture: 'point' });
      await t.choose(['Wait, how did you know what I was going to say?!', 'Wait, how did you know what I was going to—', '...!']);
      await t.say('Hohoho! Sixty years of practice, kid.', { gesture: 'laugh' });
    } else if (S.joke % 3 === 1) {
      await t.say('Who? Never heard of him. Never been to Egypt. Never been to anywhere.');
      await t.say('I was a... salaryman. In... insurance. Yes. Very boring. Next question.');
    } else {
      await t.say('Look. If I were some kind of famous old adventurer, would I be selling ¥10 puff sticks on a back lane?');
      await t.say('...Don\'t answer that. HOLY SHIITAKE, look at the time.', { gesture: 'shrug' });
    }
    S.joke = (S.joke || 0) + 1;
  }
}
