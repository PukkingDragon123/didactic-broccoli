// The new-game story. You drive Grandpa's old van into the lane at dusk (src/drive/, or the arrival cutscene here when
// it's missing); he's out front of his shut-up capsule-toy garage, waves you in and meets you (src/grandpa/), then walks
// you through the first jobs himself before he leaves; his notes, taped up all round the garage (src/life/notes.js),
// tick off as you go and carry on the guidance after he's gone, one small physical job at a time: his letter on the
// shutter, unlock the shutter, flip the main breaker, lights, air the place out,
// wipe the counter, the cash tin and the change float, his junk boxes (one hides the old OPEN sign), milk for Mikan,
// a broom and a new tube from Mikawa-ya, sweep, bag the rubbish and take it all out to the garbage station; then odd
// jobs for the neighbours until you can afford a used machine, its delivery crate to unbox, plug in, stock and price,
// and finally the sign on its hook, flipped to OPEN: the grand reopening.
//   story.done   story.isDone(taskId)   story.goal() -> { id, icon, text, sub, at } for the objective card
//   story.todo() -> [{ text, done }]   story.task(text) (a ticked-off chore: jingle, toast, save)
//   story.step() -> the current to-do id (the first one not done; 'shop' while Mikawa-ya has something you need)
//   story.newGame() -> Promise (the drive in, then meeting Grandpa; resolves once you have control)
// Events: 'story:step' { id, prev } (the current to-do changed), 'story:task' { text } (a chore was ticked off),
//         'drive:lane' / 'drive:parked' (the arrival cutscene's van, when src/drive isn't there to send them).
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { radio } from '../core/music.js';
import { bgm, TRACKS } from '../core/bgm.js';
import { ease, formatYen } from '../core/util.js';
import { propMesh } from '../world/props.js';
import { GARAGE, MACHINE_SLOTS } from '../world/Garage.js';
import { buildMachineModel } from '../world/machineModels.js';
import { TOOLS } from '../data/tools.js';
import { createHuman, GESTURES } from '../people/index.js';
import { machinePrice, capsuleCost } from './economy.js';
import { Pour } from './Pour.js';
import { Game } from './Game.js';
import { PARK } from '../life/van.js';
import { SINK, BREAKER, WINDOW, TRAY, JUNK, RUBBISH, CARDBOARD } from '../life/chores.js';
import { HOOK } from '../life/sign.js';
import { BOARD } from '../life/jobs.js';

const TIN_MONEY = 2500;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// the mess (floor positions inside the garage): dust to sweep (broom), rubbish to bag, cardboard to flatten
const PILES = [
  { id: 'p1', prop: 'dust_pile', x: -1.7, z: 3.4, r: 0.4 },
  { id: 'p2', prop: 'rubbish_pile', x: 1.25, z: 2.7, r: 1.2 },
  { id: 'p3', prop: 'cardboard_mess', x: 2.55, z: 0.95, r: 2.6 },
  { id: 'p4', prop: 'dust_pile', x: -1.0, z: -2.3, r: 4.1 },
  { id: 'p5', prop: 'rubbish_pile', x: 0.7, z: -3.5, r: 5.3 },
  { id: 'p6', prop: 'dust_pile', x: 2.35, z: -1.3, r: 0.9 },
];
const DUST_PILES = ['p1', 'p4', 'p6'];
// bags of rubbish Grandpa already tied off
const BAGS = [
  { id: 'b1', x: -2.35, z: -3.85, r: 0.3 },
  { id: 'b3', x: -0.55, z: 4.3, r: 4.4 },
];
// everything that has to go out to the garbage station
const TRASH = ['b1', 'b3', 'r_p2', 'r_p5', 'c_p3', 'j1', 'j2'];
const BOWL = new THREE.Vector3(-0.95, 0, 2.38);
const BED = new THREE.Vector3(-1.55, 0, 2.15);
const TIN = new THREE.Vector3(-1.52, 1.712, -4.66);

const dustColors = [0x9a8a78, 0x7a6e62, 0xb8a894, 0x5a5048];

export class Story {
  constructor(game) {
    this.game = game;
    this.piles = new Map();
    this.covers = new Map(); // (fallen machines from very old saves; FPBody looks here)
    this.t = 0;
  }

  get flags() { return this.game.state.story; }
  get done() { return !!this.flags.complete; }
  get life() { return this.game.life; }
  pileDefs() { return PILES; }

  /** Called once garage, town, machines and PC exist (before the plugins): the shutter and Mikan's corner. */
  init() {
    const g = this.game, f = this.flags, G = g.garage;
    for (const k of ['swept', 'bags', 'wiped', 'bagged', 'junkOpen', 'junkOut', 'plugged']) if (!Array.isArray(f[k])) f[k] = [];
    G.setShutter(this.done || f.shutter ? 1 : 0, true);
    g.garage.town?.setShopOpen?.(this.done || !!f.opened);
    this.bed = G.prop('cat_bed', BED.x, 0, BED.z, 0.5, { fallbackSize: [0.5, 0.22, 0.4], fallbackColor: 0xb89068 });
    this.bowl = null;
    this.setBowl(f.fed);
    if (!this.done && !f.radio) g.state.radio = -1;
  }

  /** Everything else, once game.life exists (src/plugins/life.js). */
  setup(life) {
    const g = this.game, f = this.flags, G = g.garage;
    life.chores.setup();
    if (this.done) return;
    // Grandpa's notes, where you'll need them
    const N = life.notes, T = G.table, D = G.pcDesk;
    if (!f.shutter) N.place('letter', { pos: V(0.85, 1.32, GARAGE.maxZ + 0.095), envelope: true, tilt: -0.06 });
    N.place('power', { pos: V(T.x, T.h + 0.008, T.z + 0.32), flat: true, rotY: 0.08, size: 0.17 });
    N.place('clean', { pos: V(SINK.x - 0.1, 0.715, SINK.z + 0.226), size: 0.15, tilt: 0.04 });
    N.place('tin', { pos: V(-1.18, 1.43, -4.452), size: 0.13, tilt: -0.05 });
    N.place('cat', { pos: V(-0.95, 0.566, 1.55), flat: true, rotY: 0.3, size: 0.13 });
    N.place('pc', { pos: V(D.x - 0.2, D.h + 0.003, D.z + 0.55), flat: true, rotY: -Math.PI / 2 + 0.1, size: 0.13 });
    N.place('machine', { pos: V(GARAGE.minX + 0.012, 1.3, 0.35), rotY: Math.PI / 2, size: 0.17, tilt: 0.03 });
    // the mess
    for (const p of PILES) if (DUST_PILES.includes(p.id) && !f.swept.includes(p.id)) this.addPile(p);
    const carried = new Set(g.held.slots.filter((s) => s?.data?.bag).map((s) => s.data.bag));
    for (const b of BAGS) if (!f.bags.includes(b.id) && !carried.has(b.id)) g.items.spawnTool({ id: 'trash_bag', story: true, bag: b.id }, V(b.x, 0, b.z), b.r);
    life.chores.respawnBags();
    // Grandpa's cash tin on the steel rack
    if (!f.cash) {
      this.tin = G.prop('cash_tin', TIN.x, TIN.y, TIN.z, 0.2, { fallbackSize: [0.18, 0.08, 0.14], fallbackColor: 0x3a6aa8 });
      g.interaction.add(this.tin, { hint: () => ({ key: 'LMB', text: "Open Grandpa's cash tin", sub: 'A biscuit tin, heavier than biscuits' }), use: () => { if (!this.flags.cash) g.cutscene.play((c) => this.cashScene(c)); return false; } });
    }
    // the dead fluorescent tube
    const tube = G.lights.tubes[1];
    if (!f.tube && tube) {
      tube.dead = true;
      G.setLights(G.lightsOn);
      g.interaction.add(tube.fix, {
        reach: 2.6,
        hint: () => (g.held.holding('tube') ? { key: 'LMB', text: 'Replace the tube' } : { key: '', text: 'This light is dead', sub: 'Needs a new fluorescent tube (Mikawa-ya)' }),
        use: () => { if (g.held.holding('tube')) g.cutscene.play((c) => this.tubeScene(c)); return false; },
      });
    }
    // bookkeeping from the other systems
    g.events.on('trashOut', ({ item }) => {
      const tag = item?.bag || item?.junk;
      if (!tag || this.done) return;
      if (!f.bags.includes(tag)) f.bags.push(tag);
      if (item.junk && !f.junkOut.includes(item.junk)) f.junkOut.push(item.junk);
      const left = TRASH.filter((t) => !f.bags.includes(t)).length;
      if (TRASH.includes(tag)) this.task(left ? `Out it goes. ${left} more to take out.` : 'All the junk is out!');
    });
    g.events.on('machinePrice', () => { if (!this.done && g.machines.length) this.markPriced(); });
    g.events.on('noteRead', ({ first }) => { if (first) { audio.play('task', { vol: 0.35 }); g.guide?.pulse(); } });
    g.events.on('signFlip', ({ open }) => { if (open) this.trySignOpen(); });
  }

  markPriced() {
    if (this.flags.priced) return;
    this.flags.priced = true;
    this.task('Price set. Kids pay with their pocket money, remember.');
  }

  // ------------------------------------------------------------------ the to-do list
  machine() { return this.game.machines[0] || null; }
  machineReady() {
    const m = this.machine(), f = this.flags;
    return !!m && m.data.stock.length > 0 && !m.lidOpen && (!f.crate || f.crate.stage === 'done');
  }
  totalMoney() { const W = this.game.wallet; return W ? W.cash + W.bank : this.game.state.money; }

  /** Is a to-do (a box on one of Grandpa's notes) done? */
  isDone(id) {
    const g = this.game, f = this.flags, L = this.life, N = L?.notes;
    const m = this.machine();
    switch (id) {
      case 'letter': return !!N?.isRead('letter') || f.shutter;
      case 'shutter': return !!f.shutter;
      case 'read_power': return !!N?.isRead('power');
      case 'breaker': return !!L?.power;
      case 'lights': return !!L?.power && g.garage.lightsOn;
      case 'window': return !!f.windowDone;
      case 'tube': return !!f.tube;
      case 'read_clean': return !!N?.isRead('clean');
      case 'wipe': return f.wiped.length >= 4;
      case 'sweep': return DUST_PILES.every((p) => f.swept.includes(p));
      case 'bag': return [...RUBBISH, ...CARDBOARD].every((p) => f.bagged.includes(p) || f.swept.includes(p));
      case 'trashout': return TRASH.every((t) => f.bags.includes(t) || (t.startsWith('r_') || t.startsWith('c_')) && f.swept.includes(t.slice(2)));
      case 'read_tin': return !!N?.isRead('tin');
      case 'tin': return !!f.cash;
      case 'tray': return !!f.tray;
      case 'read_junk': return !!N?.isRead('junk') || f.junkOpen.length > 0;
      case 'junk': return f.junkOpen.length >= JUNK.length;
      case 'read_cat': return !!N?.isRead('cat');
      case 'feed': return !!f.fed;
      case 'read_pc': return !!N?.isRead('pc');
      case 'job': return (L?.jobs?.s.count || 0) > 0 || g.machines.length > 0 || this.totalMoney() >= machinePrice('retro', 0) + 300;
      case 'buymachine': return g.machines.length > 0;
      case 'delivery': return !!m && (!f.crate || !['wait', 'arriving'].includes(f.crate.stage));
      case 'read_machine': return !!N?.isRead('machine');
      case 'unbox': return !!m && (!f.crate || ['plug', 'done'].includes(f.crate.stage));
      case 'plug': return !!m && (!f.crate || f.crate.stage === 'done');
      case 'restock': return !!m && m.data.stock.length > 0 && !m.lidOpen;
      case 'price': return !!f.priced;
      case 'read_sign': return !!L?.s.sign.found;
      case 'hang': return !!L?.s.sign.hung;
      case 'open': return !!f.opened;
      default: return false;
    }
  }

  /** The order the objective card walks you through (some of them come from notes you haven't read yet). */
  static ORDER = ['letter', 'shutter', 'read_power', 'breaker', 'lights', 'window', 'read_clean', 'wipe', 'read_tin', 'tin', 'tray', 'read_junk', 'junk', 'read_cat', 'shop', 'feed', 'tube', 'sweep', 'bag', 'trashout', 'read_pc', 'job', 'buymachine', 'delivery', 'read_machine', 'unbox', 'plug', 'restock', 'price', 'read_sign', 'hang', 'open'];

  todo() {
    return Story.ORDER.filter((id) => id !== 'shop').map((id) => ({ id, done: this.isDone(id) }));
  }

  /** Mikawa-ya shopping list for what the notes you've read ask for. */
  shopping() {
    const g = this.game, f = this.flags, H = g.held, N = this.life?.notes;
    const need = [];
    if (N?.isRead('cat') && !f.fed && !H.has('milk')) need.push('milk');
    if (N?.isRead('clean') && !this.isDone('sweep') && !H.has('broom')) need.push('a broom');
    if (N?.isRead('power') && !f.tube && !H.has('tube')) need.push('a fluorescent tube');
    return need;
  }

  /** The current to-do: the first not done in ORDER ('shop' while you need something from Mikawa-ya), else 'ready'. */
  step() {
    for (const id of Story.ORDER) {
      if (id === 'shop') { if (this.shopping().length) return 'shop'; continue; }
      if (!this.isDone(id)) return id;
    }
    return 'ready';
  }

  goal() {
    if (this.newGameRunning) return null; // the drive and the meeting: no card yet
    const gp = this.game.grandpa;
    const over = gp?.goalOverride?.();
    if (over) return over;
    let goal = null, id = 'ready';
    for (const k of Story.ORDER) {
      if (k === 'shop') { const need = this.shopping(); if (need.length) { id = k; goal = this.goalFor('shop', need); break; } continue; }
      if (!this.isDone(k)) { id = k; goal = this.goalFor(k); break; }
    }
    if (!goal && id === 'ready') goal = { id: 'ready', icon: 'sparkle', text: 'The garage is ready!', sub: 'Stand back and take a look...' };
    // while Grandpa's with you his own words are the guidance (the card shows his line; control hints stay)
    const line = goal && gp?.cardLine?.(id);
    if (line) {
      goal = { ...goal, say: line };
      if (goal.sub) goal.sub = goal.sub.replace(/Grandpa: "[^"]*"\.?\s*/g, '').replace(/^[.\s]+/, '').trim();
    }
    return goal;
  }

  /** The objective card for one to-do: what to do, Grandpa's words, and where. */
  goalFor(id, extra) {
    const g = this.game, H = g.held, f = this.flags, G = g.garage, L = this.life;
    const touch = document.body.classList.contains('touchmode'), c = touch ? 'tap' : 'click', hold = touch ? 'hold the use button' : 'hold left click';
    const pick = (t) => { const i = H.find(t); return i < 0 ? '' : touch ? ` (slot ${i + 1})` : ` (press ${i + 1})`; };
    const note = (n) => () => L.notes.world.get(n)?.getWorldPosition(V(0, 0, 0));
    const read = (n, where) => ({ id: 'read:' + n, icon: 'note', text: `Read Grandpa's note ${where}`, sub: 'His handwriting: one job at a time', at: note(n) });
    const gp = (s) => `Grandpa: "${s}"`;
    const m = this.machine();
    const mTop = () => m.root.getWorldPosition(V(0, 0, 0)).add(V(0, 1.2, 0));
    const counter = () => g.garage.town?.cornerShop?.counter?.getWorldPosition(V(0, 0, 0)).setY(1.25) || null;
    const pc = () => V(G.pcDesk.x, G.pcDesk.h + 0.55, G.pcDesk.z);
    const near = (list, at) => { const p = g.player.pos; let best = null, bd = Infinity; for (const o of list) { const q = at(o); const d = (q.x - p.x) ** 2 + (q.z - p.z) ** 2; if (d < bd) { bd = d; best = q; } } return best; };
    switch (id) {
      case 'letter': return { id, icon: 'note', text: "Read Grandpa's letter", sub: 'An envelope taped to the shutter', at: note('letter') };
      case 'shutter': return { id, icon: 'key', text: 'Unlock the shutter', sub: H.holding('key') ? `${c[0].toUpperCase() + c.slice(1)} the shutter` : `${gp("My key's on your ring.")} Hold it${pick('key')}`, at: () => V(0, 1.15, GARAGE.maxZ + 0.05) };
      case 'read_power': return read('power', 'on the counter');
      case 'breaker': return { id, icon: 'breaker', text: 'Flip the main breaker', sub: gp('Grey box by the back door. Flip it up.'), at: () => V(BREAKER.x, 2.0, BREAKER.z) };
      case 'lights': return { id, icon: 'bulb', text: 'Switch the lights on', sub: gp('Light switch, same wall.'), at: () => G.lightSwitch.getWorldPosition(V(0, 0, 0)) };
      case 'window': return { id, icon: 'window', text: 'Open the window', sub: gp('It stinks of cardboard in here.'), at: () => V(WINDOW.x + 0.1, 2.1, (WINDOW.z0 + WINDOW.z1) / 2) };
      case 'read_clean': return read('clean', 'on the sink');
      case 'wipe': {
        const it = H.slots.find((s) => s?.data?.id === 'rag');
        if (!it) return { id, icon: 'rag', text: 'Wipe the dusty counter', sub: gp("Rag's by the tap. Wet it, wipe the counter."), at: () => V(SINK.x - 0.18, 1.0, SINK.z + 0.18) };
        if (!it.data.wet) return { id: 'wipe:wet', icon: 'rag', text: 'Wet the rag', sub: H.holding('rag') ? `${c[0].toUpperCase() + c.slice(1)} the sink` : `Hold the rag${pick('rag')}, ${c} the sink`, at: () => V(SINK.x, 1.0, SINK.z) };
        return { id: 'wipe:go', icon: 'rag', text: `Wipe the counter (${4 - f.wiped.length} spots)`, sub: H.holding('rag') ? `Point at the dust and ${hold}` : `Hold the rag${pick('rag')}`, at: () => V(G.table.x, G.table.h + 0.2, G.table.z) };
      }
      case 'read_tin': return read('tin', 'on the steel rack');
      case 'tin': return { id, icon: 'cash_tin', text: "Open Grandpa's cash tin", sub: gp('Savings. For brooms and milk.'), at: () => this.tin?.getWorldPosition(V(0, 0, 0)).add(V(0, 0.15, 0)) };
      case 'tray': return { id, icon: 'coin_float', text: 'Fill the cash tray', sub: H.holding('coin_float') ? `${c[0].toUpperCase() + c.slice(1)} the tray on the counter` : `${gp('Coin bag = change float.')} Hold it${pick('coin_float')}`, at: () => V(TRAY.x, TRAY.y + 0.15, TRAY.z) };
      case 'read_junk': return read('junk', 'on the boxes');
      case 'junk': {
        const left = JUNK.filter((j) => !f.junkOpen.includes(j.id));
        return { id, icon: 'junk_box', text: `Look in Grandpa's junk boxes (${left.length})`, sub: gp('Keep anything that says OPEN!'), at: () => near(left, (j) => V(j.x, 0.6, j.z)) };
      }
      case 'read_cat': return read('cat', 'on the heater');
      case 'shop': return { id: 'shop:' + extra.join(), icon: 'shop', text: 'Shop at Mikawa-ya', sub: `Buy ${extra.length < 2 ? extra[0] : `${extra.slice(0, -1).join(', ')} and ${extra[extra.length - 1]}`} at the little store across the lane`, at: counter };
      case 'feed': return { id, icon: 'bowl', text: 'Feed Mikan', sub: H.holding('milk') ? `Tip it over the bowl: ${hold}` : `${gp('Bowl by the heater.')} Hold the milk${pick('milk')}`, at: () => this.bowl?.getWorldPosition(V(0, 0, 0)).add(V(0, 0.3, 0)) };
      case 'tube': return { id, icon: 'tube', text: 'Replace the dead tube', sub: H.holding('tube') ? `${c[0].toUpperCase() + c.slice(1)} the dark light` : `Hold the tube${pick('tube')}`, at: () => G.lights.tubes[1]?.light.position.clone() };
      case 'sweep': { const piles = [...this.piles.values()]; return { id, icon: 'broom', text: `Sweep up the dust (${piles.length} left)`, sub: H.holding('broom') ? `Point at the dust and ${hold}` : `Hold the broom${pick('broom')}`, at: () => near(piles, (p) => p.mesh.position.clone().setY(0.45)) }; }
      case 'bag': {
        const left = [...(L?.chores.piles.values() || [])];
        const card = left.every((p) => p.card);
        return { id, icon: card ? 'cardboard' : 'bin_bags', text: card ? 'Flatten the cardboard' : `Bag up the rubbish (${left.length})`, sub: card ? hold[0].toUpperCase() + hold.slice(1) + ' on it' : H.holding('bin_bags') ? `Point at a heap and ${hold}` : H.has('bin_bags') ? `Hold the bin bags${pick('bin_bags')}` : gp('Bin bags under the sink.'), at: () => (left.length ? near(left, (p) => p.m.position.clone().setY(0.4)) : V(SINK.x, 0.4, SINK.z)) };
      }
      case 'trashout': {
        const tags = new Set(H.slots.filter((s) => s?.data?.bag || s?.data?.junk).map((s) => s.data.bag || s.data.junk));
        if (tags.size) return { id: 'trash:carry', icon: 'trash_bag', text: 'Take it to the garbage station', sub: H.slots.some((s) => s === H.item && (s?.data?.bag || s?.data?.junk)) ? `Across the lane, left of the shop: ${c} it` : 'Hold what you carry, click the station', at: () => V(-6.6, 1.2, 5.8) };
        const lying = [...g.items.list].filter((e) => TRASH.includes(e.data?.bag || e.data?.junk));
        const left = TRASH.filter((t) => !f.bags.includes(t)).length;
        return { id, icon: 'trash_bag', text: `Take out the trash (${left} left)`, sub: 'Pick it up (you can carry several), out to the garbage station', at: lying.length ? () => near(lying, (e) => e.obj.position.clone().setY(0.6)) : () => V(-6.6, 1.2, 5.8) };
      }
      case 'read_pc': return read('pc', 'on the computer desk');
      case 'job': {
        const jg = L?.jobs.goal();
        if (jg) return jg;
        return { id, icon: 'board', text: 'Find an odd job', sub: gp('Neighbours need a hand. Board by the station.'), at: () => V(BOARD.x, 1.5, BOARD.z) };
      }
      case 'buymachine': {
        const jg = L?.jobs.goal();
        if (jg) return jg;
        const price = machinePrice('retro', 0);
        const total = this.totalMoney();
        if (total < price) return { id: 'buy:earn', icon: 'yen', text: `Earn ${formatYen(price - total)} more`, sub: `A used machine costs ${formatYen(price)}. Odd jobs on the notice board`, at: () => V(BOARD.x, 1.5, BOARD.z) };
        return this.bankGoal(price, 'machine') || { id, icon: 'machine', text: 'Buy your first machine', sub: `${c[0].toUpperCase() + c.slice(1)} the computer: Off-Hobby (used) or Daikoku Toys (new). ${gp('A used one is fine.')}`, at: pc };
      }
      case 'delivery': return { id, icon: 'truck', text: 'Wait for the delivery', sub: 'Gen-san brings it in the FREE CANDY van, to the shutter', at: () => V(0, 1.2, GARAGE.maxZ + 0.2) };
      case 'read_machine': return read('machine', 'on the machine wall');
      case 'unbox': {
        const st = f.crate?.stage;
        const text = st === 'straps' ? 'Cut the straps' : st === 'sleeve' ? 'Lift off the carton' : 'Pull out the foam blocks';
        return { id: 'unbox:' + st, icon: 'box', text, sub: st === 'sleeve' ? `${hold[0].toUpperCase() + hold.slice(1)} on it` : gp('Straps, carton, foam.'), at: mTop };
      }
      case 'plug': return { id, icon: 'plug', text: 'Plug it in', sub: gp('Plug it in behind. One per socket.'), at: () => V(MACHINE_SLOTS[m.data.slot].x + 0.1, 0.3, MACHINE_SLOTS[m.data.slot].z + 0.33) };
      case 'restock': {
        const box = [...g.items.list].find((e) => e.kind === 'box' && e.data?.type === 'refill');
        if (H.item?.kind === 'box' && H.item.data?.type === 'refill') return { id: 'restock:fill', icon: 'box', text: 'Fill your machine', sub: m.lidOpen ? `Put the capsules in one by one (${c}), then lock the lid` : `${c[0].toUpperCase() + c.slice(1)} the machine: unlock the lid`, at: mTop };
        if (box) return { id: 'restock:box', icon: 'box', text: 'Your capsules arrived', sub: 'Pick up the carton by the shutter', at: () => box.obj.position.clone().setY(0.7) };
        if (m.lidOpen) return { id: 'restock:lid', icon: 'machine', text: 'Close and lock the lid', sub: `${c[0].toUpperCase() + c.slice(1)} the machine`, at: mTop };
        if (!g.delivery.queue?.length) return this.bankGoal(capsuleCost(m.data.series || 'mochi') * 10, 'capsules') || { id: 'restock:order', icon: 'capsule', text: 'Order a box of capsules', sub: `On the computer: Daikoku Toys, Capsules. ${gp('Fill it up.')}`, at: pc };
        return { id: 'restock:wait', icon: 'box', text: 'Wait for the capsules', sub: 'The box comes to the shutter', at: () => V(0, 0.8, GARAGE.maxZ - 0.6) };
      }
      case 'price': return { id, icon: 'yen', text: 'Set the price', sub: `The plate on the machine: - and +. ${gp('Kids pay 100.')}`, at: () => m.local(0, m.L.slot.y - 0.1, m.L.front + 0.05) };
      case 'read_sign': {
        if (!L?.s.sign.found) return { id: 'sign:find', icon: 'open_sign', text: 'Pick up the old OPEN sign', sub: 'By the junk boxes', at: () => [...g.items.list].find((e) => e.data?.id === 'open_sign')?.obj.position.clone().setY(0.5) };
        return { id, icon: 'note', text: "Read Grandpa's card", sub: 'It came with the sign', at: null };
      }
      case 'hang': return { id, icon: 'open_sign', text: 'Hang the OPEN sign', sub: H.holding('open_sign') ? `On the hook right of the shutter: ${c} it` : `Hold the sign${pick('open_sign')}, the hook right of the shutter`, at: () => V(HOOK.x, HOOK.y - 0.2, HOOK.z + 0.1) };
      case 'open': return { id, icon: 'open_sign', text: this.machineReady() ? 'Flip the sign to OPEN!' : 'Get the machine ready', sub: this.machineReady() ? gp("Flip it to OPEN when the machine's ready.") : 'Stocked, lid locked', at: () => L.sign.board.getWorldPosition(V(0, 0, 0)) };
      default: return null;
    }
  }

  /** Online shopping is paid from the bank: when the cash is in your wallet, the ATM across the lane first. */
  bankGoal(amount, what) {
    const W = this.game.wallet, L = this.life;
    if (!W || W.bank >= amount || W.cash + W.bank < amount) return null;
    return { id: 'bank:' + what, icon: 'wallet', text: 'Put your cash in the bank', sub: `Online shops take card payments: ${formatYen(amount - W.bank)} more into the bank, at the ATM across the lane`, at: L?.atmPos ? () => L.atmPos() : null };
  }

  task(text) {
    audio.play('task', { vol: 0.7 });
    this.game.events.emit('story:task', { text });
    this.game.news(text, 'Done');
    this.game.save();
    this.life?.notes?.refreshAll();
  }

  // ------------------------------------------------------------------ tool hints & clicks (nothing targeted)
  toolHint(it) {
    const id = it.data.id;
    const f = this.flags;
    const L = this.life?.toolHint?.(it);
    if (L) return L;
    const H = {
      key: f.shutter ? { key: '', text: 'Garage key', sub: 'For the shutter padlock' } : { key: '', text: 'Garage key', sub: 'Use it on the shutter' },
      milk: { key: '', text: 'Milk', sub: 'Pour it into the cat bowl by the heater' },
      broom: { key: 'Hold LMB', text: 'Sweep', sub: 'Point at a mess to clean it up' },
      batteries: { key: '', text: 'Batteries', sub: 'For the radio on the fridge' },
      toolkit: { key: '', text: 'Tool kit', sub: 'For repairs' },
      tube: { key: '', text: 'Fluorescent tube', sub: 'For the dead ceiling light' },
      trash_bag: { key: '', text: 'Trash bag', sub: 'Garbage station across the lane, left of the shop' },
      flyers: { key: '', text: `Flyers (${it.data.uses || 0} left)`, sub: 'Hand them to people on the street' },
      watch: this.game.timeStop?.ready ? { key: 'LMB', text: 'Stop time', sub: 'Everything but you freezes for a few seconds' }
        : this.game.timeStop?.active ? { key: '', text: 'Time has stopped', sub: 'Only you can move' } : { key: '', text: 'Old pocket watch', sub: 'Still winding back up...' },
    };
    return H[id] || { key: 'Q', text: `Put down ${TOOLS[id]?.name || ''}` };
  }

  toolPrimary(it) {
    const id = it.data.id;
    if (id === 'broom') { this.game.held.swing = 1; audio.play('sweep', { vol: 0.5 }); }
    if (id === 'watch') this.game.timeStop?.start();
  }

  // ------------------------------------------------------------------ shutter (until the reopening; then src/life/routine.js)
  shutterHint() {
    if (this.flags.shutter) return null;
    if (!this.life?.notes.isRead('letter')) return { key: '', text: 'Locked', sub: "There's a letter taped to it" };
    if (this.game.held.holding('key')) return { key: 'LMB', text: 'Unlock the shutter' };
    const i = this.game.held.find('key');
    return { key: '', text: 'Locked', sub: i >= 0 ? `Select Grandpa's key (${i + 1}) and click` : 'It needs a key' };
  }

  useShutter() {
    if (this.flags.shutter || !this.game.held.holding('key') || !this.life?.notes.isRead('letter')) return false;
    this.game.cutscene.play((c) => this.openShutterScene(c));
    return false;
  }

  *openShutterScene(c) {
    const g = this.game, G = g.garage, z = GARAGE.maxZ;
    this.life?.notes.remove('letter');
    // the key in the old padlock
    yield c.cam({ pos: V(0.9, 1.45, z + 1.1), look: V(0.2, 0.7, z), dur: 0.7, fov: 50 });
    audio.play('keyTurn', { pos: V(0, 0.6, z), vol: 1 });
    const gpHere = !!g.grandpa?.present;
    yield c.all(c.wait(1.0), c.say(gpHere ? 'Stiff... come on... there.' : "It's been years since anyone opened this.", 0.6));
    // from inside the dark garage: the shutter rolls up and the evening pours in
    yield c.fade(1, 0.25);
    c.hideSay();
    yield c.cam({ pos: V(-1.3, 0.5, 0.6), look: V(0.2, 1.0, z), fov: 64 });
    yield c.fade(0, 0.25);
    audio.play('shutterRoll', { pos: V(0, 2, z), dur: 2.8, vol: 1 });
    let t = 0;
    yield {
      update: (dt) => {
        t = Math.min(1, t + dt / 2.8);
        G.setShutter(ease.inOutQuad(t));
        c.pos.set(-1.3 + t * 0.4, 0.5 + t * 0.35, 0.6 + t * 0.5);
        if (Math.random() < dt * 18) g.effects.sparks({ pos: V((Math.random() - 0.5) * 5.5, 0.2 + t * 2, z - 0.2 - Math.random() * 2), count: 3, colors: dustColors, speed: 0.15, size: 0.035, gravity: -0.05, life: 2.2, star: 0, drag: 1, radius: 1.2 });
        return t >= 1;
      },
    };
    this.flags.shutter = true;
    g.player.pos.set(0.4, 0, z + 1.6);
    g.player.yaw = 0; g.player.pitch = -0.05;
    g.street?.scareCat?.();
    audio.play('meow', { pos: V(-1, 0.3, 1), vol: 0.6, pitch: 1.2 });
    yield c.cam({ pos: V(0.4, 1.5, z + 2.4), look: V(-0.3, 0.9, 0), fov: 62 });
    yield c.all(c.cam({ pos: V(0.4, 1.55, z + 1.8), look: V(0.2, 0.8, 0.3), dur: 3.0 }), c.say(gpHere ? 'Dark and dusty... and something just ran under the table.' : 'Dark and dusty... and something just ran under the table. No power, either.', 1.4));
    c.hideSay();
    yield c.toPlayer(0.8);
    this.task('Shutter open!');
  }

  // ------------------------------------------------------------------ dust piles (broom)
  addPile(p) {
    const g = this.game;
    const m = propMesh(p.prop, { fallbackSize: [0.6, 0.08, 0.5], fallbackColor: 0x8a7a66 });
    m.position.set(p.x, 0.002, p.z);
    m.rotation.y = p.r;
    g.garage.add(m);
    const pile = { def: p, mesh: m, k: 0 };
    this.piles.set(p.id, pile);
    g.interaction.add(m, {
      hint: () => (g.held.holding('broom')
        ? { key: 'Hold LMB', text: 'Sweep up', sub: pile.k > 0 ? `${Math.round(pile.k * 100)}%` : '' }
        : { key: '', text: 'Dust', sub: 'Sweep it with a broom (Mikawa-ya)' }),
      use: () => (g.held.holding('broom') ? undefined : false),
      hold: {
        canStart: () => g.held.holding('broom'),
        start: () => { pile.next = 0; },
        update: (dt) => this.sweep(pile, dt),
        done: () => pile.k >= 1,
      },
    });
  }

  sweep(pile, dt) {
    const g = this.game;
    pile.k = Math.min(1, pile.k + dt / 1.8);
    pile.next -= dt;
    const p = pile.mesh.position;
    if (pile.next <= 0) {
      pile.next = 0.42;
      g.held.swing = 1;
      audio.play('sweep', { pos: p, vol: 0.8 });
      g.effects.sparks({ pos: p.clone().add(V(0, 0.1, 0)), count: 10, colors: dustColors, speed: 0.35, size: 0.03, gravity: -0.08, life: 1.4, star: 0, drag: 1.4, radius: 0.4 });
    }
    const s = 1 - pile.k * 0.85;
    pile.mesh.scale.set(s, s * s, s);
    if (pile.k >= 1) {
      g.interaction.remove(pile.mesh);
      pile.mesh.parent?.remove(pile.mesh);
      this.piles.delete(pile.def.id);
      this.flags.swept.push(pile.def.id);
      audio.play('dust', { pos: p, vol: 0.8 });
      g.effects.sparks({ pos: p.clone().add(V(0, 0.15, 0)), count: 18, colors: [0xffffff, 0xfff0c0], speed: 0.4, size: 0.015, gravity: -0.1, life: 0.8, star: 1 });
      const left = this.piles.size;
      this.task(left ? `Swept! ${left} more to go` : 'The floor is clean!');
    }
  }

  // ------------------------------------------------------------------ the cat
  setBowl(full) {
    // the bowl's milk is a level that rises as you pour (src/game/Pour.js) and falls as Mikan drinks
    const g = this.game, G = g.garage;
    void full;
    if (!g.pour) { g.pour = new Pour(g); Game.updaters.push((gg, dt) => gg.pour.update(dt)); }
    if (this.bowl) { g.interaction.remove(this.bowl); this.bowl.parent?.remove(this.bowl); }
    this.bowl = G.prop('cat_bowl', BOWL.x, 0, BOWL.z, 0.3, { fallbackSize: [0.16, 0.05, 0.16], fallbackColor: 0xd86a4a });
    g.pour.attachBowl(this.bowl);
    g.interaction.add(this.bowl, {
      hint: () => {
        if (g.held.holding('milk')) return { key: 'Hold LMB', text: 'Pour the milk', sub: g.pour.bowlLevel > 0.95 ? 'It is full!' : 'Tip the carton over the bowl' };
        if (!this.flags.fed) return { key: '', text: 'An empty cat bowl', sub: 'She looks hungry. Milk from Mikawa-ya?' };
        return null;
      },
      use: () => false,
    });
  }

  *feedScene(c) {
    const g = this.game;
    const st = g.street;
    yield c.cam({ pos: V(BOWL.x + 1.3, 0.75, BOWL.z + 1.1), look: V(BOWL.x - 0.1, 0.12, BOWL.z), dur: 1.0 });
    if (st?.cat) { const cp = st.cat.pos; if (Math.hypot(cp.x - BOWL.x, cp.z - BOWL.z) > 2.6) cp.set(BOWL.x - 1.9, 0, BOWL.z - 1.1); }
    st?.catComeTo?.(BOWL);
    c.say('Psst... come on. It is for you.', 1.4);
    let waited = 0;
    yield c.until((dt) => !st || st.catArrived?.() || (waited += dt) > 7);
    yield c.wait(0.4);
    st?.catDrink?.(4);
    audio.play('purr', { pos: BOWL, vol: 0.8 });
    yield c.cam({ pos: V(BOWL.x + 0.75, 0.42, BOWL.z + 0.55), look: V(BOWL.x - 0.1, 0.12, BOWL.z - 0.05), dur: 2.2 });
    g.effects.hearts({ pos: BOWL.clone().add(V(0, 0.35, 0)), count: 3, size: 0.04, spread: 0.12 });
    c.say("Mikan. Grandpa's note was right: she's staying.", 2);
    yield c.wait(3.4);
    this.flags.fed = true;
    st?.befriendCat?.();
    c.hideSay();
    yield c.toPlayer(0.9);
    this.task('Mikan the cat trusts you now!');
  }

  // ------------------------------------------------------------------ cash tin, tube, radio
  takeCash(keepTin = false) {
    const g = this.game;
    if (this.flags.cash) return;
    this.flags.cash = true;
    g.interaction.remove(this.tin);
    const p = this.tin.getWorldPosition(V(0, 0, 0)).add(V(0, 0.1, 0.05));
    audio.play('boxOpen', { pos: p, vol: 0.7 });
    g.effects.coinBurst({ pos: p, count: 14, up: 1.4, spread: 0.4, life: 1.2 });
    if (g.wallet) g.wallet.via('cash', () => g.addMoney(TIN_MONEY, false, "Grandpa's tin")); else g.addMoney(TIN_MONEY);
    this.life?.chores.giveFloat(p);
    if (!keepTin) this.dropTin();
  }

  dropTin() {
    const t = this.tin;
    if (t) this.game.tweens.add({ dur: 0.5, ease: ease.inQuad, update: (k) => t.scale.setScalar(1 - k), done: () => t.parent?.remove(t) });
  }

  fixTube() {
    const g = this.game, G = g.garage, tube = G.lights.tubes[1];
    g.held.consume();
    g.interaction.remove(tube.fix);
    this.flags.tube = true;
    audio.play('zap', { pos: tube.light.position, vol: 0.8 });
    // the new tube strikes with a couple of flickers (if there's power to strike it)
    g.tweens.add({ dur: 1.4, update: (k) => { const on = k > 0.9 || Math.sin(k * 40) > 0.4; tube.dead = !on; G.setLights(G.lightsOn); }, done: () => { tube.dead = false; G.setLights(G.lightsOn); } });
    this.task('New tube in.');
  }

  radioHint() {
    const g = this.game;
    if (this.done || this.flags.radio) return undefined;
    if (!this.life?.power) return { key: '', text: "Grandpa's radio", sub: 'Dead. No power, and it wants batteries' };
    if (g.held.holding('batteries')) return { key: 'LMB', text: 'Put the batteries in' };
    return { key: '', text: "Grandpa's radio", sub: 'Dead. It takes AA batteries (Mikawa-ya)' };
  }

  useRadio() {
    const g = this.game;
    if (this.done || this.flags.radio) return true;
    if (!g.held.holding('batteries')) return false;
    g.held.consume();
    this.flags.radio = true;
    audio.play('relay', { vol: 0.6 });
    g.cutscene.play((c) => this.radioScene(c));
    return false;
  }

  // ------------------------------------------------------------------ little cinematic moments
  /** Meeting the shopkeeper of Mikawa-ya the first time you walk up to the counter. */
  *meetKeeperScene(c) {
    const g = this.game, P = g.pedestrians, k = P?.keeper;
    if (!k) return;
    const kp = k.h.root.position;
    const head = V(kp.x, k.h.height - 0.08, kp.z);
    yield c.cam({ pos: V(kp.x + 1.7, 1.45, kp.z - 2.0), look: head, dur: 1.0, fov: 48 });
    k.look = c.pos;
    k.h.gesture('bow');
    P.say(k.h, 'Irasshaimase! Oh my... you have his eyes. You must be his grandkid!', 4.2);
    yield c.cam({ pos: V(kp.x + 1.2, 1.5, kp.z - 1.7), look: head, dur: 4.2 });
    k.h.gesture('point');
    P.say(k.h, 'Milk is in the fridge, brooms by the door. Tell me what you need, dear.', 4.0);
    yield c.cam({ pos: V(kp.x - 0.9, 1.55, kp.z - 1.5), look: V(kp.x - 0.4, 1.3, kp.z), dur: 4.0 });
    k.look = null;
    yield c.toPlayer(0.7);
  }

  /** Grandpa's biscuit tin: a close-up, the lid comes off, notes, coins and the change float. */
  *cashScene(c) {
    const t = this.tin;
    if (!t) return;
    const p = t.getWorldPosition(V(0, 0, 0));
    yield c.cam({ pos: p.clone().add(V(0.55, 0.32, 0.75)), look: p, dur: 0.9, fov: 42 });
    yield c.cam({ pos: p.clone().add(V(0.32, 0.26, 0.48)), look: p.clone().add(V(0, 0.03, 0)), dur: 1.1 });
    this.takeCash(true);
    yield c.all(c.cam({ pos: p.clone().add(V(0.22, 0.34, 0.5)), look: p.clone().add(V(0, 0.02, 0)), dur: 3.0 }), c.say(`${formatYen(TIN_MONEY)} in old notes, and a cloth bag of 100-yen coins: the change float.`, 1.4));
    c.hideSay();
    this.dropTin();
    yield c.toPlayer(0.7);
    this.task(`${formatYen(TIN_MONEY)} for supplies. Thanks, Grandpa.`);
  }

  /** The new fluorescent tube strikes and the garage fills with light. */
  *tubeScene(c) {
    const g = this.game, tube = g.garage.lights.tubes[1];
    const p = tube.light.position.clone();
    yield c.cam({ pos: V(p.x + 1.6, 1.1, p.z + 1.8), look: p, dur: 0.9, fov: 58 });
    this.fixTube();
    yield c.wait(1.6);
    yield c.all(c.cam({ pos: V(p.x + 0.4, 1.5, p.z + 3.2), look: V(p.x - 0.5, 1.0, p.z - 1.5), dur: 2.2 }), c.say(g.garage.lightsOn ? 'Much better. I can finally see the mess.' : "It's in. Now it just needs the switch.", 1.0));
    c.hideSay();
    yield c.toPlayer(0.7);
  }

  /** Batteries in: the radio crackles, finds a station, and the garage has music again. */
  *radioScene(c) {
    const g = this.game, p = g.garage.radio.getWorldPosition(V(0, 0, 0)).add(V(0, 0.12, 0));
    yield c.cam({ pos: p.clone().add(V(0.6, 0.15, 0.7)), look: p, dur: 0.9, fov: 46 });
    yield c.wait(0.8);
    g.state.radio = 0;
    radio.setStation(0);
    yield c.all(c.cam({ pos: p.clone().add(V(0.9, 0.35, 1.1)), look: p, dur: 2.8 }), c.say('The old radio still works! Grandpa never turned this station off.', 1.0));
    c.hideSay();
    yield c.toPlayer(0.7);
    this.task('The radio crackles back to life.');
  }

  // ------------------------------------------------------------------ grand reopening (the sign flipped to OPEN)
  trySignOpen() {
    const g = this.game, f = this.flags;
    if (this.done || f.opened) return;
    if (!this.machineReady()) {
      g.news('Not yet...', this.machine() ? 'Grandpa: "When the machine\'s ready." Stock it and lock the lid' : 'Grandpa: "When the machine\'s ready." You have no machine yet', 5000);
      g.tweens.wait(1.6, () => this.life?.sign.flip(false));
      return;
    }
    f.opened = true;
    g.tweens.wait(0.9, () => g.cutscene.play((c) => this.reopenScene(c)));
  }

  update(dt) {
    if (this.done) return;
    this.t += dt;
    // the current to-do, a few times a second: 'story:step' when it changes (Grandpa follows it)
    this.stepT = (this.stepT || 0) - dt;
    if (this.stepT <= 0 && this.life) {
      this.stepT = 0.25;
      const id = this.step();
      if (id !== this.cur) { const prev = this.cur; this.cur = id; if (prev !== undefined) this.game.events.emit('story:step', { id, prev }); }
    }
    const g = this.game, m = this.machine();
    // looking at the price plate and pressing it counts as setting the price
    if (m && !this.flags.priced && g.input.buttonDown(0)) {
      const h = g.interaction.hover;
      if (h?.obj === m.root) { const part = m.partOf(h.hit); if (part === 'priceUp' || part === 'priceDown' || part === 'plate') this.priceT = (this.priceT || 0) + 1; }
      if (this.priceT >= 2) this.markPriced();
    }
  }

  *reopenScene(c) {
    const g = this.game, z = GARAGE.maxZ, town = g.garage.town;
    const crowd = [];
    const BPM = TRACKS.party?.bpm || 120;
    yield c.fade(1, 0.6);
    const peds = g.pedestrians;
    for (const p of peds?.list || []) p.h.root.visible = false;
    const cast = [['grandma', 3, -2.2, z + 2.6], ['kid', 8, -1.1, z + 1.9], ['schoolgirl', 11, 0.1, z + 2.3], ['salaryman', 5, 1.3, z + 2.8],
      ['otaku', 2, 2.4, z + 2.1], ['mom', 6, -3.1, z + 3.6], ['construction', 4, 3.3, z + 3.4], ['schoolboy', 9, -0.6, z + 3.5], ['tourist', 13, 0.9, z + 4.1]];
    for (const [preset, seed, x, zz] of cast) crowd.push(this.actor(c, preset, seed, x, zz, Math.PI + Math.atan2(-x * 0.25, 1.2)));
    const cat = g.street?.cat;
    if (cat && !cat.held) { cat.pos.set(0.6, 0, z + 1.1); cat.heading = Math.PI; g.street.setCatState?.('sit', 30); }
    yield c.cam({ pos: V(2.6, 1.35, z + 7.6), look: V(0, 1.9, z), fov: 58 });
    yield c.fade(0, 0.9);
    yield c.all(c.cam({ pos: V(1.4, 1.55, z + 6.2), look: V(0, 2.2, z), dur: 3.2 }), c.say('Grandpa... the garage is open again.', 1.0));
    c.hideSay();
    // the sign, then the lanterns flicker on
    yield c.cam({ pos: V(HOOK.x - 0.8, 1.7, z + 1.6), look: V(HOOK.x, HOOK.y - 0.3, HOOK.z), dur: 1.4, fov: 50 });
    yield c.cam({ pos: V(0.6, 1.0, z + 4.6), look: V(0, 2.9, z), dur: 1.2, fov: 62 });
    audio.play('lightsOn', { vol: 1 });
    for (let i = 0; i < 4; i++) { town?.setShopOpen?.(i % 2 === 0); yield c.wait(0.12 + i * 0.05); }
    town?.setShopOpen?.(true);
    audio.play('complete', { vol: 0.9 });
    g.effects.confetti({ pos: V(0, 3.4, z + 0.8), count: 260, speed: 3.2 });
    for (const a of crowd) a.h.gesture(Math.random() < 0.5 ? 'cheer' : 'clap');
    yield c.title('OPEN FOR BUSINESS', '', 2.4);
    bgm.play('party', { fade: 0.6 });
    let songT = 0;
    c.every((dt) => { songT += dt; });
    const beat0 = TRACKS.party?.beat0 || 0;
    const clock = () => (bgm.time ?? songT) - beat0;
    const dance = (a) => a.h.gesture(GESTURES.dance ? 'dance' : 'cheer', { bpm: BPM, clock });
    crowd.forEach(dance);
    g.street?.setCatState?.('groove', 30, { bpm: BPM, clock });
    let t = 0;
    yield c.until((dt) => {
      t += dt;
      const k = t / 7.5;
      c.pos.set(-1.6 + k * 3.2, 1.55 + Math.sin(t * 0.6) * 0.1, z - 0.4 + Math.sin(k * Math.PI) * 0.5);
      c.look.set(-0.3 + k * 0.6, 1.05, z + 3.0);
      return t > 7.5;
    });
    const keeper = g.pedestrians?.keeper;
    yield c.all(c.cam({ pos: V(1.1, 1.5, z + 6.6), look: V(0, 1.5, z + 2.5), dur: 2.2 }), c.say('Flip the sign every morning, flip it back every night. Flyers from Mikawa-ya bring people in.', 1.6));
    c.hideSay();
    yield c.tbc(3.2);
    yield c.fade(1, 0.7);
    // the party goes on into the night: the shop's first business day starts the next morning (src/sim/clock.js)
    g.clock?.skipTo?.(8, { nextDay: true });
    this.dropActors(crowd);
    for (const p of peds?.list || []) p.h.root.visible = true;
    if (keeper) keeper.look = null;
    g.street?.setCatState?.('sit', 4);
    bgm.play('garage', { fade: 2 });
    yield c.toPlayer(0);
    yield c.fade(0, 0.7);
    this.flags.complete = true;
    this.life?.sign.applyLanterns();
    g.pedestrians?.setOpen?.(true);
    this.task('The shop is open for business!');
  }

  // ------------------------------------------------------------------ intro (new game)
  /** A person for a cutscene: placed, painted and kept animated until the scene ends. */
  actor(c, preset, seed, x, z, rotY, look = null) {
    const h = createHuman({ preset, seed });
    h.finishPaint?.();
    h.root.position.set(x, 0, z);
    h.root.rotation.y = rotY;
    this.game.scene.add(h.root);
    const a = { h, look };
    c.every((dt) => a.h && a.h.update(dt, { speed: 0, lookAt: a.look, talking: this.game.bubbles?.isTalking?.(a.h) }));
    return a;
  }

  dropActors(list) {
    for (const a of list) { this.game.bubbles?.clear?.(a.h); a.h.root.parent?.remove(a.h.root); a.h.dispose?.(); a.h = null; }
    list.length = 0;
  }

  /** Dress the garage as it was in Grandpa's day (true) or put the dusty present back (false). */
  memorySet(on) {
    const g = this.game, G = g.garage, f = this.flags, L = this.life;
    G.setShutter(on || f.shutter ? 1 : 0, true);
    G.town?.setShopOpen?.(on || !!f.opened);
    const tube = G.lights.tubes[1];
    if (tube && !f.tube) tube.dead = !on;
    if (L) { const p = L.s.power; L.s.power = on || p; G.setLights(on ? true : g.state.lightsOn === true); L.s.power = p; this.memPower = p; }
    for (const p of this.piles.values()) p.mesh.visible = !on;
    for (const e of g.items.list) if (e.data?.bag || e.data?.junk) e.obj.visible = !on;
    if (L) {
      for (const st of L.chores.piles.values()) st.m.visible = !on;
      for (const st of L.chores.junk.values()) st.m.visible = !on;
      for (const n of L.notes.world.values()) n.visible = !on;
      L.van.root.visible = !on;
    }
    if (g.street?.cat) g.street.cat.g.visible = !on;
    // his machines, three of them, in their old spots
    if (on && !this.memMachines) {
      this.memMachines = [0, 2, 4].map((i, k) => {
        const S = MACHINE_SLOTS[i];
        const b = buildMachineModel(k === 1 ? 'standard' : 'retro', { no: k + 1 });
        b.group.position.set(S.x, 0, S.z);
        b.group.rotation.y = S.rotY;
        g.scene.add(b.group);
        return b.group;
      });
    } else if (!on && this.memMachines) { for (const m of this.memMachines) m.parent?.remove(m); this.memMachines = null; }
  }

  /** Footsteps for a walking camera: a little bob on the cutscene's camera offset, a step sound per stride. */
  walkBob(c, amp = 0.035) {
    let t = 0;
    this.bobOn = true;
    c.every((dt) => {
      const prev = Math.sin(t * Math.PI * 1.9);
      t += dt;
      const s = Math.sin(t * Math.PI * 1.9);
      c.offset.y = this.bobOn ? Math.abs(s) * amp : c.offset.y * Math.max(0, 1 - dt * 6);
      if (this.bobOn && prev * s < 0) audio.play('footstep', { vol: 0.35 });
    });
  }

  // ------------------------------------------------------------------ a new game
  /**
   * The new-game flow: the drive into the lane (src/drive/, game.drive.start(); the arrival cutscene below when it's
   * not there), then meeting Grandpa (src/grandpa/; the old memory-and-letter ending when he's not there). Resolves
   * once you're on your feet with control.
   */
  async newGame() {
    const g = this.game;
    this.newGameRunning = true;
    try {
      if (g.drive?.start) {
        try { await g.drive.start({ exitPrompt: !g.grandpa?.gp }); } catch (e) { console.error('drive', e); }
        // whatever happened, the van ends up parked in its spot
        const van = this.life?.van;
        if (van && Math.hypot(van.root.position.x - PARK.x, van.root.position.z - PARK.z) > 0.5) { van.setPose(PARK.x, PARK.z, PARK.heading); g.events.emit('drive:parked', {}); }
      } else await g.cutscene.play((c) => this.arrivalScene(c), { skippable: true });
      if (g.grandpa?.meet && g.grandpa.gp) await g.grandpa.meet();
      else await g.cutscene.play((c) => this.letterScene(c), { skippable: true });
    } finally {
      this.newGameRunning = false;
      this.flags.intro = true;
      g.guide?.pulse();
      g.save();
    }
  }

  /**
   * Arrival (when the playable drive isn't there): Grandpa's van comes out of the dark east underpass under a passing
   * train, rolls down the lane at dusk (a shot from the driver's seat as the garage slides by; Grandpa out front waving
   * you in), pulls up across from the shutter, the engine dies and ticks as it cools. Ends in the cab.
   * Sends 'drive:lane' as the van comes into the lane and 'drive:parked' once it's stopped, as the drive does.
   */
  *arrivalScene(c, { legacy = false } = {}) {
    const g = this.game, z = GARAGE.maxZ, town = g.garage.town, van = this.life?.van;
    c.setFade(1);
    bgm.play('intro', { loop: false, fade: 1.2 });
    // the van and its drive (positions per frame, from the script's targets)
    const D = this.arrive = { x: 34, v: 0, to: 34, brake: false, cab: false, engine: null };
    if (van) {
      van.setPose(D.x, PARK.z, PARK.heading); van.setLights(true); van.setBrake(false); van.setDoor(0);
      try { D.engine = audio.loop('vanEngine', {}); D.engine?.set(0.22, 1.0); } catch { D.engine = null; }
      c.every((dt) => {
        if (!van) return;
        const left = D.x - D.to;
        // cruise toward the target, braking over the last few metres
        const want = left <= 0.001 ? 0 : D.brake ? Math.min(D.v, Math.max(0.35, left * 1.1)) : D.speed || 0;
        D.v += (want - D.v) * Math.min(1, dt * (D.brake ? 3 : 1.5));
        const step = Math.min(left, D.v * dt);
        D.x -= step;
        van.setPose(D.x, PARK.z, PARK.heading);
        van.roll(step);
        van.suspend((D.brake && D.v > 0.2 ? 0.02 : 0) + Math.sin(D.x * 3.1) * 0.003 * Math.min(1, D.v), Math.abs(Math.sin(D.x * 2.3)) * 0.006 * Math.min(1, D.v));
        if (D.engine?.osc) D.engine.osc.frequency.value = 34 + D.v * 6;
        if (D.cab) { van.eye(c.pos); c.pos.y -= 0.1; van.ahead(9, c.look); c.look.y -= 1.9; }
      });
    }
    if (!legacy) g.events.emit('drive:lane', { x: D.x });
    // 1. the east underpass at dusk: a train thunders over, headlights come out of the dark
    const tr = town?.trains?.find((t) => t.s > 0);
    if (tr) {
      town.runTrain(1, -1);
      const len = new THREE.Box3().setFromObject(tr.g).getSize(V(0, 0, 0)).z;
      tr.z = 9.6 + len / 2 + 10;
      tr.played = false;
    }
    yield c.cam({ pos: V(17.5, 0.75, 11.9), look: V(30, 1.3, 10.6), fov: 52 });
    D.to = 21; D.speed = 3.2;
    yield c.all(c.fade(0, 2.0), c.wait(3.6), c.say('Grandpa\'s lane. The trains still rattle the windows.', 1.0));
    yield c.cam({ pos: V(15.5, 0.85, 11.3), look: V(D.x - 2, 1.0, PARK.z), dur: 1.4 });
    // 2. from the driver's seat: the lane rolls by, the old garage on the left
    yield c.fade(1, 0.3);
    c.hideSay();
    D.cab = true; D.to = 6.5; D.speed = 2.6;
    if (van) { van.eye(c.pos); c.pos.y -= 0.1; van.ahead(9, c.look); c.look.y -= 1.9; }
    c.fov = 70;
    yield c.fade(0, 0.3);
    yield c.all(c.wait(3.0), c.say(legacy ? 'There it is. Gacha Garage.' : "There it is. Gacha Garage. ...And there's Grandpa.", 1.6));
    // 3. outside, low by the shutter: it pulls up across the lane, brake lights, a little nose dip
    yield c.fade(1, 0.25);
    c.hideSay();
    D.cab = false; D.to = PARK.x; D.brake = true;
    van?.setBrake(true);
    yield c.cam({ pos: V(1.2, 0.55, z + 1.15), look: V(4.2, 0.9, PARK.z), fov: 46 });
    yield c.fade(0, 0.25);
    yield c.until(() => D.x - PARK.x < 0.01 || !van || c.skipping);
    if (van) { D.x = PARK.x; van.setPose(PARK.x, PARK.z, PARK.heading); }
    van?.suspend(0.03, 0);
    yield c.wait(0.25);
    van?.suspend(0, 0);
    // engine off: a cough, the lights die, the hot block ticks
    audio.play('engineOff', { vol: 0.9 });
    D.engine?.stopAll(); D.engine = null;
    van?.setLights(false); van?.setBrake(false);
    g.effects.puff({ pos: van ? van.local(0.4, 0.25, -1.75) : V(5, 0.3, PARK.z), count: 5, color: 0x9a948a, size: 0.06, speed: 0.2, up: 0.15, life: 1.6 });
    if (!legacy) g.events.emit('drive:parked', {});
    yield c.cam({ pos: V(PARK.x - 1.9, 0.75, PARK.z - 1.35), look: V(PARK.x - 1.4, 0.55, PARK.z - 0.4), dur: 0.01, fov: 40 });
    for (let i = 0; i < 4; i++) { audio.play('engineTick', { pos: V(PARK.x - 1.5, 0.6, PARK.z), vol: 1 }); yield c.wait(0.35 + i * 0.12); }
    yield c.say('Made it. The old thing still runs.', 0.8);
    c.hideSay();
    // back in the driver's seat
    if (van) { van.eye(c.pos); c.look.copy(van.local(-1.2, 1.2, 0.9)); }
    c.fov = 64;
  }

  /** The old intro (no Grandpa in the game): the arrival, getting out, his day in a memory, the letter on the shutter. */
  *introScene(c) {
    yield* this.arrivalScene(c, { legacy: true });
    yield* this.letterScene(c, { inCab: true });
  }

  /** Out of the van, a memory of the shop in his day, then his envelope on the shutter (the old intro's ending). */
  *letterScene(c, { inCab = false } = {}) {
    const g = this.game, z = GARAGE.maxZ, van = this.life?.van;
    const actors = [];
    const D = this.arrive || { x: PARK.x, engine: null };
    if (!inCab && van) { van.eye(c.pos); c.look.copy(van.local(-1.2, 1.2, 0.9)); c.fov = 64; c.camOn = true; }
    // 4. getting out: from the seat, the door swings open, out onto the road, the shutter across the lane
    c.hideSay();
    if (van) { van.eye(c.pos); c.look.copy(van.local(-1.2, 1.2, 0.9)); }
    c.fov = 64;
    yield c.wait(0.4);
    audio.play('carDoor', { pos: c.pos, vol: 1 });
    let k = 0;
    yield c.until((dt) => { k = Math.min(1, k + dt / 0.6); van?.setDoor(ease.outCubic(k)); return k >= 1; });
    const out = van ? van.doorStep(V(0, 0, 0)).setY(1.58) : V(PARK.x, 1.58, PARK.z - 1.3);
    this.walkBob(c, 0.03);
    yield c.cam({ pos: out, look: V(0.3, 1.5, z), dur: 1.6, fov: 64, path: [c.pos.clone().lerp(out, 0.5).setY(1.25)] });
    this.bobOn = false;
    yield c.all(c.cam({ pos: out.clone().lerp(V(0.4, 1.58, z + 3.6), 0.35), look: V(0, 1.75, z), dur: 3.2 }), c.say("Grandpa's capsule toy shop. Shut for years.", 0.8));
    // 5. a memory: the shutter up, the lanterns lit, kids crowding his machines
    yield c.flash(() => {
      c.memory(true);
      c.hideSay();
      this.memorySet(true);
      actors.push(
        this.actor(c, 'grandpa', 41, 0.9, 3.7, 0.15),
        this.actor(c, 'kid', 12, -2.35, 0.35, -Math.PI / 2),
        this.actor(c, 'schoolgirl', 7, -2.1, 1.45, -Math.PI / 2 - 0.35),
        this.actor(c, 'schoolboy', 3, -1.55, -0.55, -Math.PI / 2 + 0.4),
        this.actor(c, 'kid', 29, 2.1, z + 1.2, -2.6));
      c.pos.set(2.6, 1.55, z + 5.6); c.look.set(-1.0, 1.0, 1.6);
    });
    const [gp, k1, k2, k3, k4] = actors;
    k1.h.gesture('browse'); k3.h.gesture('point');
    yield c.all(c.cam({ pos: V(1.9, 1.5, z + 3.3), look: V(-0.4, 1.15, 1.8), dur: 4.0 }), c.say('After school, kids lined up around the block for his machines.', 0.8),
      c.call(() => { k2.h.gesture('cheer'); audio.play('gachan', { pos: V(-3.2, 0.5, 0.8), vol: 0.8 }); }));
    gp.look = c.pos; gp.h.gesture('wave');
    k4.h.gesture('wave');
    g.pedestrians?.say(gp.h, 'One coin, one turn. Good luck!', 3.2);
    yield c.cam({ pos: V(1.6, 1.55, z + 1.4), look: V(0.85, 1.5, 3.7), dur: 2.4 });
    // 6. back to now: a locked shutter, and a letter taped to it
    yield c.flash(() => {
      c.memory(false);
      c.hideSay();
      this.dropActors(actors);
      this.memorySet(false);
      c.pos.set(1.4, 1.35, z + 1.5); c.look.set(0.85, 1.3, z);
    });
    audio.play('meow', { pos: V(-0.3, 0.3, z - 0.6), vol: 0.6, pitch: 1.15 });
    yield c.all(c.cam({ pos: V(1.1, 1.38, z + 0.75), look: V(0.85, 1.32, z), dur: 2.4, fov: 44 }), c.say('...an envelope. KIDDO. His handwriting.', 0.9));
    c.hideSay();
    // your own eyes, by the van, the shutter across the lane
    if (van) { D.x = PARK.x; van.setPose(PARK.x, PARK.z, PARK.heading); van.setDoor(1); van.setLights(false); van.setBrake(false); van.suspend(0, 0); }
    D.engine?.stopAll(); D.engine = null;
    const st = out.clone().setY(0);
    g.player.pos.set(st.x, 0, st.z);
    g.player.yaw = Math.atan2(-(0.85 - st.x), -(GARAGE.maxZ - st.z)); // facing the envelope on the shutter
    g.player.pitch = -0.02;
    yield c.tbc(3.0);
    bgm.play('garage', { fade: 4 });
    yield c.toPlayer(0.8);
    this.flags.intro = true;
    g.guide?.pulse();
  }
}
