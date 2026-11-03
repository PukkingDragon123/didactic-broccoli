// The actual work, done with the game's real systems (nothing is faked behind the scenes):
//   restock  take a capsule carton (loose in the shop, or out of a cardboard storage box), carry it to a sold-out
//            machine, unlock and lift the lid, cut the tape, fold the flaps, put the capsules in one by one, close and
//            lock the lid, fold the empty carton (or put the rest back)          GachaMachine.openLid / insertFromBox
//   sweep    sweep up empty capsules on the floor (and the everyday dust)     game.shells, game.sim dirt
//   trash    tie off the shop's trash bag and carry it to the garbage station  game.life.trash
//   collect  open a machine's coin box drawer, take the coins, put them in the register / piggy bank, or walk them to
//            the ATM across the lane                                           machine.data.cash, game.decor, wallet
//   greet    welcome customers, answer their questions, sell figures on the price-tagged stands  game.pedestrians
//   pack     find a figure you sold on Off-Hobby (storage bin, shelves, the floor), pack it, drop it in the OUTGOING
//            crate for Gen-san                                                 game.market
//   patrol   walk the lane at night (keeps pranksters and machine-shakers away)
// Mistakes come from stats and quirks: a sleepy student's slow hands, a restocker who forgets to lock a lid, a kappa
// slipping with a carton when his dish dries, a tanuki handing out leaves for change, a gyaru missing a customer
// because she's texting, a robot kid "optimising" a price plate.
//   findJob(w) -> job | null        JOBS[kind](w, job) -> generator       idle(w) -> generator
//   abortJob(w)                     put things back when a shift ends or someone gets fired mid-task
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { openBoxStep } from '../game/capsuleBox.js';
import { makeToolMesh } from '../game/Held.js';
import { makeItemMesh } from '../game/collectibles.js';
import { rollCapsule } from '../game/economy.js';
import { getItem } from '../data/series/index.js';
import { CAN, STATION } from '../life/trash.js';
import { machineSpot, node, inGarage } from './nav.js';
import { GREET_LINES, WORK_LINES } from './data.js';
import { formatYen } from '../core/util.js';

const V = (x, z) => new THREE.Vector3(x, 0, z);
const _v = new THREE.Vector3();
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
const sfx = (n, o = {}) => { try { audio.play(n, o); } catch { /* audio not ready */ } };
const GARAGE_FLOOR = (p) => Math.abs(p.x) < 3.95 && p.z > -4.9 && p.z < 4.95;

/** Stand `d` metres short of p, on the side toward `from`. */
function approach(p, from, d = 0.5) {
  const dx = from.x - p.x, dz = from.z - p.z, l = Math.hypot(dx, dz) || 1;
  return V(p.x + (dx / l) * d, p.z + (dz / l) * d);
}

// ================================================================== where things are
/** Capsule cartons the shop has: loose ones (on the floor, the racks, by the shutter) and refills packed in boxes. */
export function cartons(g) {
  const out = [];
  for (const e of g.items?.list || []) {
    if (e.kind !== 'box' || e.data?.type !== 'refill' || !(e.data.count > 0) || e._staffClaim) continue;
    const p = e.obj.position;
    if (Math.abs(p.x) < 6 && p.z > -5.2 && p.z < 8) out.push({ ent: e, pos: p.clone(), data: e.data });
  }
  for (const p of g.decor?.byFeature?.('storage') || []) {
    if (p._staffClaim || g.decor.stackedOn?.(p)?.length) continue;
    const items = p.data.st?.items || [];
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (it?.kind === 'box' && it.d?.type === 'refill' && it.d.count > 0) { out.push({ piece: p, idx: i, pos: p.root.position.clone(), data: it.d }); break; }
    }
  }
  return out;
}

function takeCarton(g, src) {
  if (src.ent) {
    if (!g.items.list.has(src.ent)) return null;
    g.items.detach(src.ent);
    return { data: src.ent.data, obj: src.ent.obj };
  }
  const items = src.piece?.data.st?.items;
  if (!items) return null;
  let i = items[src.idx]?.d === src.data ? src.idx : items.findIndex((x) => x.d === src.data);
  if (i < 0) i = items.findIndex((x) => x?.kind === 'box' && x.d?.type === 'refill' && x.d.count > 0);
  if (i < 0) return null;
  const it = items.splice(i, 1)[0];
  try { src.piece.feature?.refresh?.(src.piece, g); } catch { /* */ }
  const obj = g.delivery.meshFor(it.d);
  return { data: it.d, obj };
}

/** A carton goes back where it came from (into its storage box, or down on the floor there). */
function returnCarton(g, w, box, src) {
  const obj = w.drop() || box.obj;
  const items = src?.piece?.data.st?.items;
  if (items && items.length < 8) {
    items.push({ kind: 'box', d: box.data });
    try { src.piece.feature?.refresh?.(src.piece, g); } catch { /* */ }
    obj.removeFromParent();
    sfx('boxPack', { pos: src.piece.root.position, vol: 0.5 });
    return;
  }
  setDown(g, w, box.data, obj);
}
/** Put a box down at someone's feet, as a loose pick-up-able box. */
function setDown(g, w, data, obj, at = null) {
  obj.removeFromParent();
  obj.scale.setScalar(1);
  obj.rotation.set(0, Math.random() * 0.6 - 0.3, 0);
  const p = at || (w.npc ? w.npc.pos.clone().add(new THREE.Vector3(Math.sin(w.npc.yaw) * 0.45, 0, Math.cos(w.npc.yaw) * 0.45)) : V(1.6, 4.1));
  g.items.spawnBox(data, p.setY(0), obj);
  sfx('place', { pos: p, vol: 0.5 });
}

/** Machines that need a refill (emptiest first). */
function hungryMachines(g) {
  return (g.machines || []).filter((m) => !m.data.broken && !m.data.fallen && m.state === 'idle' && !m.lidOpen && !m.lid?.busy && !m._staffClaim && m.data.stock.length < Math.max(1, m.capacity * 0.35))
    .sort((a, b) => a.data.stock.length - b.data.stock.length);
}

const loose = (g) => [...(g.shells?.list || [])].filter((e) => GARAGE_FLOOR(e.obj.position) && !e._staffClaim);

// ================================================================== choosing the next job
export function findJob(w) {
  const g = w.game, r = w.rec, role = r.role, st = r.stats || {};
  const fx = w.staff.fx(r);
  if (role === 'restock') {
    const ms = hungryMachines(g);
    if (ms.length) {
      const cs = cartons(g);
      for (const m of ms) {
        let c = cs.find((x) => x.data.series === m.data.series) || null;
        // an empty machine takes any series; a careless one mixes series into a half-full machine
        if (!c && (!m.data.stock.length || (st.reliability <= 2 && Math.random() < 0.3))) c = cs[0] || null;
        if (c) return { kind: 'restock', label: `restocking No.${(m.data.slot || 0) + 1}`, m, src: c };
      }
      if (!cs.length && !w.toldNoCartons) { w.toldNoCartons = true; return { kind: 'tell', label: 'looking for cartons', text: pick(['We\'re out of capsule cartons, boss!', 'No more cartons in storage. Order some?', `Machine No.${(ms[0].data.slot || 0) + 1} is empty and there are no cartons!`]) }; }
    }
  }
  if (role === 'clean' || (fx.neat && Math.random() < 0.3) || (role === 'restock' && Math.random() < 0.15) || (role === 'greet' && !g.sim?.isOpen?.() && Math.random() < 0.3)) {
    const sh = loose(g);
    if (sh.length) {
      const near = sh.sort((a, b) => a.obj.position.distanceToSquared(w.pos) - b.obj.position.distanceToSquared(w.pos))[0];
      return { kind: 'sweep', label: 'sweeping up', target: near };
    }
    if (role === 'clean') {
      const T = g.life?.trash;
      if (T && T.level >= Math.min(T.cap * 0.6, 14) && !T._staffClaim) return { kind: 'trash', label: 'taking the trash out' };
      if ((g.sim?.s?.dirt || 0) > 0.06 && Math.random() < 0.6) return { kind: 'dust', label: 'sweeping the floor' };
    }
  }
  if (role === 'coins') {
    const shift = w.staff.shiftLeft(r);
    const ms = (g.machines || []).filter((m) => !m._staffClaim && !m.drawer?.busy && !m.drawer?.open && m.state === 'idle' && (m.data.cash || 0) >= (shift < 0.6 ? 100 : 600)).sort((a, b) => b.data.cash - a.data.cash);
    if (ms.length) return { kind: 'collect', label: `emptying No.${(ms[0].data.slot || 0) + 1}'s coin box`, m: ms[0] };
  }
  if (role === 'greet') {
    const P = g.pedestrians;
    if (P && !w.onPhone) {
      const inShop = (p) => GARAGE_FLOOR(p.h.root.position);
      const sale = P.list.find((p) => p.state === 'stand' && p.haggle && !p.haggle.done && !p.talking && !p._staffClaim && p.haggle.t > 2.5);
      if (sale) return { kind: 'sell', label: 'selling a figure', p: sale };
      const q = P.list.find((p) => !p.asked && !p.talking && !p._staffClaim && (p.state === 'play' || p.state === 'goIn') && inShop(p) && p.h.root.position.distanceTo(w.pos) < 7);
      if (q && Math.random() < 0.5 + (st.charm || 3) * 0.1) return { kind: 'answer', label: 'helping a customer', p: q };
    }
  }
  if (role === 'courier') {
    const job = packJob(w);
    if (job) return job;
  }
  return null;
}

// ================================================================== the jobs
export const JOBS = {
  /** Say something (out of cartons...). */
  *tell(w, job) { w.say(job.text, { dur: 4 }); w.log(job.text); yield w.wait(4); },

  *restock(w, job) {
    const g = w.game, m = job.m, src = job.src;
    w.claim(job, m, src.ent || src.piece);
    // fetch the carton
    yield w.goTo(approach(src.pos, w.pos, 0.55));
    w.face(src.pos);
    w.npc.gesture('reach');
    yield w.wait(0.8 * w.slow);
    const box = takeCarton(g, src);
    w.npc.clearGesture();
    if (!box) return;
    sfx('pickup', { pos: src.pos, vol: 0.6 });
    w.carry(box.obj, { z: 0.02 });
    // to the machine (a dry kappa might slip on the way)
    const spot = machineSpot(m);
    yield w.goTo(spot.pos, spot.yaw);
    if (w.dry && Math.random() < 0.45) { yield* slip(w, box); return; }
    if (!(m.state === 'idle' && !m.lidOpen && !m.lid.busy && m.data.stock.length < m.capacity)) { returnCarton(g, w, box, src); return; }
    w.npc.faceTo(spot.yaw);
    yield w.wait(0.3);
    m.openLid();
    yield w.wait(1.1);
    if (!m.lidOpen) { returnCarton(g, w, box, src); return; } // (someone else is using it)
    // cut the tape, fold the flaps
    while ((box.data.stage ?? 0) < 2) { openBoxStep(box, m.local(0, m.L.top, 0.3)); yield w.wait(0.55 * w.slow); }
    w.npc.gesture('stock');
    const ghost = w.rec.quirks?.includes('ghost');
    let n = 0;
    while (box.data.count > 0 && m.data.stock.length < m.capacity && m.lidOpen) {
      m.insertFromBox(box, true);
      n++;
      if (ghost && n % 3 === 0) w.say(n === 9 ? 'Nine... and TEN! Ten! All here!' : `${n}...`, { dur: 1.2 });
      yield w.wait(Math.max(0.12, 0.34 * w.slow));
    }
    w.npc.gesture('haul');
    yield w.wait(0.4);
    // a careless restocker (or a sleepy one) can walk off with the lid unlocked: customers can't play until you shut it
    const st = w.rec.stats || {};
    const forget = Math.random() < (st.reliability <= 1 ? 0.3 : st.reliability <= 2 ? 0.15 : 0.02) * (w.rec.quirks?.includes('sleepy') ? 1.6 : 1);
    if (!forget) { if (m.lidOpen && !m.lid.busy) m.closeLid(); yield w.wait(1.3); }
    else { w.staff.mistake(w, `Left machine No.${(m.data.slot || 0) + 1}'s lid open`, 'Customers can\'t play it until it\'s closed and locked'); }
    w.log(`Restocked machine No.${(m.data.slot || 0) + 1} with ${n} capsules`);
    w.stat('restock', n);
    w.staff.mem(w.id).notes?.push?.({ t: g.clock?.stamp ?? 0, text: `restocked No.${(m.data.slot || 0) + 1}` });
    // the carton: empty ones fold flat, the rest goes back
    if (box.data.count <= 0) {
      const o = w.drop();
      if (o) { sfx('flapFold', { pos: w.pos, vol: 0.7 }); o.removeFromParent(); }
    } else {
      yield w.goTo(approach(src.pos, w.pos, 0.55));
      returnCarton(g, w, box, src);
    }
  },

  *sweep(w, job) {
    const g = w.game, e = job.target;
    w.claim(job, e);
    w.hold(makeToolMesh('broom'), 'broom');
    const p0 = e.obj.position.clone();
    yield w.goTo(approach(p0, w.pos, 0.55));
    if (!g.shells.list.has(e)) { w.unhold(); return; }
    w.face(p0);
    w.npc.gesture('sweep');
    yield w.wait(1.1 * w.slow);
    const n = sweepAt(g, w, p0, 0.55);
    w.npc.clearGesture();
    w.unhold();
    if (n) { w.stat('swept', n); w.log(`Swept up ${n} empty capsule${n > 1 ? 's' : ''}`); }
    if (g.sim?.s) g.sim.s.dirt = Math.max(0, g.sim.s.dirt - 0.02);
  },

  *dust(w) {
    const g = w.game;
    w.hold(makeToolMesh('broom'), 'broom');
    const spots = [V(-1.4, 2.6), V(-1.6, -1.8), V(1.8, 2.2), V(1.9, -1.4), V(0.2, 3.6), V(-0.3, -3.2)];
    for (let i = 0; i < 2; i++) {
      const p = pick(spots);
      yield w.goTo(p);
      w.npc.gesture('sweep');
      yield w.wait(2.2 * w.slow);
      sfx('sweep', { pos: p, vol: 0.5 });
      try { g.effects.puff({ pos: p.clone().setY(0.05), count: 4, color: 0xb8ab98, size: 0.05 }); } catch { /* */ }
      if (g.sim?.s) g.sim.s.dirt = Math.max(0, g.sim.s.dirt - 0.035);
      w.npc.clearGesture();
    }
    w.unhold();
    w.stat('dust');
  },

  *trash(w, job) {
    const g = w.game, T = g.life?.trash;
    if (!T) return;
    w.claim(job, T);
    yield w.goTo(V(CAN.x + 0.5, CAN.z - 0.35));
    w.face(V(CAN.x, CAN.z));
    if (T.level <= 0) return;
    w.npc.gesture('tie');
    for (let i = 0; i < 3; i++) { sfx('bagRustle', { pos: T.can?.position, vol: 0.7 }); yield w.wait(0.45 * w.slow); }
    const n = T.level;
    T.s.trash.level = 0;
    T.setFill?.();
    w.npc.clearGesture();
    w.hold(makeToolMesh('trash_bag'), 'bag');
    yield w.goTo(V(STATION.x + 0.95, STATION.z + 0.55));
    w.face(V(STATION.x, STATION.z));
    yield w.wait(0.4);
    w.unhold();
    T.s.station.n++;
    T.layBags?.();
    sfx('thud', { pos: V(STATION.x, STATION.z), v: 0.4 });
    sfx('bagRustle', { pos: V(STATION.x, STATION.z), vol: 0.6 });
    g.events.emit('trashOut', { item: { id: 'trash_bag', bag: 'can', fill: n }, staff: w.id });
    w.stat('bags');
    w.log(`Took a bag of trash (${n} capsules) to the garbage station`);
    g.save?.();
  },

  *collect(w, job) {
    const g = w.game, m = job.m;
    w.claim(job, m);
    const spot = machineSpot(m);
    yield w.goTo(spot.pos, spot.yaw);
    const D = m.drawer;
    if (D.busy || D.open || !(m.data.cash > 0)) return;
    w.npc.faceTo(spot.yaw);
    w.npc.gesture('reach');
    const at = m.coinAnchorWorld();
    D.busy = true;
    sfx('keyTurn', { pos: at, vol: 0.8 });
    yield w.wait(0.35);
    sfx('lockClick', { pos: at });
    D.target = 1;
    sfx('drawer', { pos: at, out: true });
    yield w.wait(0.6 * w.slow);
    const gross = m.data.cash || 0;
    m.data.cash = 0;
    m.updateCoins();
    for (let i = 0; i < Math.min(6, Math.ceil(gross / 200)); i++) g.tweens.wait(i * 0.08, () => sfx('coinClink', { pos: at, vol: 0.5 }));
    yield w.wait(0.6);
    D.target = 0;
    sfx('drawer', { pos: at, out: false });
    yield w.wait(0.4);
    sfx('lockClick', { pos: at });
    D.busy = false;
    w.npc.clearGesture();
    // honesty: a light-fingered collector keeps a little (and a tanuki's purse has a way of filling with leaves)
    const st = w.rec.stats || {};
    let net = gross, skim = 0;
    if (st.honesty <= 2 && Math.random() < (st.honesty <= 1 ? 0.5 : 0.25)) skim = Math.min(gross, Math.max(100, Math.round(gross * rnd(0.1, 0.25) / 100) * 100));
    if (w.rec.quirks?.includes('leaves') && Math.random() < 0.3) skim = Math.min(gross, skim + 100 * Math.max(1, Math.round(gross / 1000)));
    net -= skim;
    w.purse = (w.purse || 0) + net;
    w.purseFrom = m;
    if (skim) { w.rec.skim = (w.rec.skim || 0) + skim; w.rec.skimN = (w.rec.skimN || 0) + 1; }
    w.hold(coinBag(), 'bag');
    yield* deposit(w);
    w.log(`Emptied No.${(m.data.slot || 0) + 1}'s coin box: ${formatYen(net)}${skim && w.rec.quirks?.includes('leaves') ? ' (and some leaves?)' : ''}`);
    w.stat('coins', net);
  },

  *answer(w, job) {
    const g = w.game, p = job.p, P = g.pedestrians;
    w.claim(job, p);
    p.asked = true; // they ask the staff, not you
    yield w.goTo(approach(p.h.root.position, w.pos, 0.95));
    if (!P.list.includes(p) || p.talking) return;
    w.face(p.h.root.position);
    w.npc.look = p.h.headTop?.(new THREE.Vector3()) || null;
    const Q = P.questionFor(p);
    p.h.gesture?.('talk');
    P.say(p.h, Q.q, 3.4);
    yield w.wait(2.2);
    const st = w.rec.stats || {};
    // honest staff tell the truth; a smooth talker sells; a dishonest one fibs (and the customer remembers)
    const kinds = Q.a.map((a) => a[1]);
    let i = kinds.indexOf('honest');
    if (st.charm >= 4 && kinds.includes('sell') && Math.random() < 0.6) i = kinds.indexOf('sell');
    if (st.honesty <= 2 && kinds.includes('lie') && Math.random() < 0.6) i = kinds.indexOf('lie');
    if (w.rec.quirks?.includes('chatty') && kinds.includes('joke') && Math.random() < 0.5) i = kinds.indexOf('joke');
    if (i < 0) i = 0;
    let [ans, kind] = Q.a[i];
    // questions meant for the owner get passed on
    if (/Grandpa/.test(Q.q)) { ans = pick(['Not me, that\'s the boss! But yes, it\'s Grandpa\'s grandkid\'s shop now.', 'That\'s my boss! They\'re around here somewhere.']); kind = 'honest'; }
    w.npc.gesture('talk');
    w.say(ans, { dur: 3.2 });
    g.guestbook?.add?.({ kind: 'question', who: cap(p.name), text: `"${Q.q}" ${w.rec.given} (staff): "${ans}"` });
    yield w.wait(1.8);
    if (!P.list.includes(p)) return;
    if (kind === 'lie') { p.lied = true; P.say(p.h, 'Really?! Then I\'m playing!', 2.5); p.wantsIn = true; }
    else if (kind === 'joke') { p.h.gesture?.('laugh'); P.say(p.h, pick(['Ha! Funny.', 'Hehe. Okay, okay.']), 2.5); p.mood = (p.mood || 0) + 1; }
    else { p.lied = false; P.say(p.h, pick(['Thanks!', 'Oh, nice. Thank you!', 'Good to know.']), 2.5); p.mood = (p.mood || 0) + 1; }
    w.npc.look = null;
    w.stat('helped');
    w.log(`Answered a customer: "${Q.q}"`);
  },

  *sell(w, job) {
    const g = w.game, p = job.p, P = g.pedestrians, H = p.haggle;
    w.claim(job, p);
    yield w.goTo(approach(p.h.root.position, w.pos, 0.9));
    if (!P.list.includes(p) || p.talking || H.done) return;
    w.face(p.h.root.position);
    P.say(p.h, `${formatYen(H.price)} is a lot... would you take ${formatYen(H.offer)}?`, 3.5);
    yield w.wait(2.4);
    const st = w.rec.stats || {};
    const ch = (price) => Math.max(0.05, Math.min(0.97, 1.15 - (price / H.value - 1) * 0.55 + (p.mood || 0) * 0.1 + p.patience * 0.15 + (st.charm - 3) * 0.12 + (w.rec.quirks?.includes('phone') ? 0.15 : 0)));
    const mid = Math.round((H.offer + H.price) / 20) * 10;
    // a charming seller holds the price; most meet halfway; a pushover takes the offer
    const ask = st.charm >= 4 ? H.price : st.charm >= 2 ? mid : H.offer;
    w.npc.gesture('talk');
    w.say(ask === H.price ? `It's ${formatYen(H.price)}. Look at the paint on it!` : ask === mid ? `How about ${formatYen(mid)}? Meet me halfway!` : `${formatYen(H.offer)}? ...Okay, deal!`, { dur: 3 });
    yield w.wait(2.4);
    if (!P.list.includes(p) || H.done) return;
    const yes = ask === H.offer || Math.random() < ch(ask);
    if (!yes) { H.done = true; p.wantsOut = true; P.say(p.h, 'Hmm... no. Too much for me.', 2.5); w.log('Couldn\'t sell a figure (the customer walked)'); return; }
    if (!sellStand(g, w, p, ask)) return;
    P.say(p.h, 'Deal! Thank you!', 2.5);
    w.stat('sold'); w.stat('sales', ask);
    w.log(`Sold the ${H.name} for ${formatYen(ask)}`);
    // the tanuki gives change in leaves now and then
    if (w.rec.quirks?.includes('leaves') && Math.random() < 0.35) {
      yield w.wait(4);
      leaves(g, p.h.root.position);
      if (P.list.includes(p)) P.complain?.(p, 'Hey! My change turned into LEAVES!', { count: true });
      g.guestbook?.add?.({ kind: 'complaint', who: cap(p.name), text: 'Paid at the counter. Got my change in LEAVES. Actual leaves.' });
      w.staff.mistake(w, 'Paid a customer\'s change in leaves', 'Tanuki business');
    }
  },

  *pack(w, job) {
    const g = w.game, mk = g.market, M = mk?.state, s = job.ship, src = job.src;
    if (!M) return;
    w.claim(job, s);
    yield w.goTo(approach(src.pos, w.pos, 0.6));
    w.face(src.pos);
    w.npc.gesture('reach');
    yield w.wait(0.8 * w.slow);
    w.npc.clearGesture();
    if (s.status !== 'topack') return;
    // take it from wherever it was
    const k = `${src.key}|${src.finish}`;
    if (src.kind === 'storage') { if (!(g.state.storage[k] > 0)) return; g.state.storage[k]--; if (g.state.storage[k] <= 0) delete g.state.storage[k]; }
    else if (src.kind === 'display') { const it = src.display.items[src.i]; if (!it || it.k !== src.key) return; src.display.clearItem(src.i); }
    else if (src.kind === 'floor') { if (!g.items.list.has(src.ent)) return; g.items.destroy(src.ent); }
    const fig = new THREE.Group();
    try { fig.add(makeItemMesh(src.key, src.finish)); } catch { /* */ }
    w.carry(fig, { y: 0.05, z: -0.06 });
    const crate = mk.outboxPos?.() || V(-0.95, 4.5);
    yield w.goTo(approach(crate, V(0, 3), 0.62));
    w.face(crate);
    if (s.status !== 'topack') { putBack(g, w, src); return; }
    if (!(M.shipBoxes > 0)) { w.say('We\'re out of shipping boxes! Order some from Daikoku?', { dur: 4, always: true }); putBack(g, w, src); w.staff.notifyOnce(w, 'noboxes', 'Out of shipping boxes', `${w.rec.given} can't pack the Off-Hobby sale: order shipping boxes from Daikoku Toys`); return; }
    w.npc.gesture('tie');
    yield w.wait(1.4 * w.slow);
    w.drop(true);
    M.shipBoxes--;
    s.status = 'packed';
    s.packed = g.clock?.stamp ?? 0;
    sfx('tapeRip', { pos: crate, vol: 0.8 });
    mk.drawOutbox?.();
    if (M.pickupAt == null) M.pickupAt = (g.clock?.stamp ?? 0) + 40 + Math.random() * 30;
    try { mk.onPacked?.(s); } catch (e) { console.warn(e); }
    g.news?.(`${w.rec.given} packed a parcel`, `${getItem(src.key)?.name || 'A figure'} for ${s.buyer || 'the graders'} · in the OUTGOING crate for Gen-san`, 5000);
    w.stat('packed');
    w.log(`Packed the ${getItem(src.key)?.name || 'figure'} for ${s.buyer || 'KGS'}`);
    g.save?.();
  },

  *patrol(w) {
    const g = w.game;
    const pts = [V(0.4, 6.7), V(-5.6, 6.6), V(-2, 7.1), V(5.8, 6.6), V(2.2, 7.1)];
    if ((g.garage?.shutterOpen ?? 1) > 0.5) pts.push(V(0.4, 4.0)); // inside only while the shutter's up
    for (let i = 0; i < 3; i++) {
      const p = pick(pts);
      yield w.goTo(p);
      w.npc.gesture('patrol');
      yield w.wait(rnd(4, 8));
      if (Math.random() < 0.25) w.say(pick(['All quiet.', 'Hm? ...Just the wind.', 'Nothing to see here.', '(Yawn.) Stay sharp...', 'Who goes there? ...A cat. Okay.']), { dur: 2.6 });
      w.npc.clearGesture();
    }
    w.staff.s.guarded = g.clock?.day ?? 0;
    w.stat('patrols');
  },
};

// ================================================================== helpers for the jobs
/** Broom swish: empty capsules near p skitter into the dustpan and are gone (the same as yours, game.shells). */
function sweepAt(g, w, p, r) {
  const sh = g.shells;
  if (!sh) return 0;
  let n = 0;
  sfx('sweep', { pos: p, vol: 0.7 });
  for (const e of [...sh.list]) {
    if (e.obj.position.distanceTo(p) > r) continue;
    // (shells.js keeps its own sweep private: this mirrors its detach)
    if (e.body) { g.physics.removeBody(e.body); e.body = null; }
    g.interaction.remove(e.obj);
    sh.list.delete(e);
    const o = e.obj, p0 = o.position.clone(), dir = new THREE.Vector3().subVectors(p0, w.pos).setY(0).normalize();
    g.tweens.add({ dur: 0.35, update: (k) => { o.position.copy(p0).addScaledVector(dir, k * 0.25); o.rotation.y += 0.3; o.scale.setScalar(1 - k * 0.9); }, done: () => o.parent?.remove(o) });
    sh.state.swept = (sh.state.swept || 0) + 1;
    n++;
  }
  try { g.effects.puff({ pos: p.clone().setY(0.04), count: 5, color: 0xb8ab98 }); } catch { /* */ }
  return n;
}

/** A little cloth coin bag for the collector's hand. */
let _bagGeo = null;
function coinBag() {
  if (!_bagGeo) {
    _bagGeo = new THREE.BoxGeometry(0.09, 0.11, 0.08);
    _bagGeo.translate(0, -0.05, 0);
  }
  const m = new THREE.Mesh(_bagGeo, new THREE.MeshStandardMaterial({ color: 0x8a3a2a, roughness: 0.95 }));
  m.castShadow = true;
  return m;
}

/** The collected coins go into the register, else the piggy bank, else across the lane into the bank. */
function* deposit(w) {
  const g = w.game, amt = w.purse || 0;
  if (!amt) { w.unhold(); return; }
  const D = g.decor;
  const reg = D?.nearest?.('register', w.pos), pig = !reg && D?.nearest?.('piggy', w.pos);
  if (reg || pig) {
    const p = reg || pig;
    const front = p.root.localToWorld(new THREE.Vector3(0, 0, 0.62)).setY(0);
    yield w.goTo(front);
    w.face(p.root.position);
    yield w.wait(0.5);
    const from = w.inHand ? w.inHand.getWorldPosition(new THREE.Vector3()) : p.root.position.clone().setY(1);
    w.unhold();
    if (reg) D.toRegister(amt, from);
    else { g.wallet.s.piggy += amt; g.wallet.emit('piggy', amt); sfx('piggyCoin', { pos: p.root.position, vol: 0.8 }); g.events.emit('piggy', { delta: amt, total: g.wallet.piggy, staff: w.id }); }
  } else if (g.atm?.root && g.wallet) {
    const front = g.atm.root.localToWorld(new THREE.Vector3(0, 0, 0.75)).setY(0);
    yield w.goTo(front);
    w.face(g.atm.root.position);
    w.npc.gesture('reach');
    yield w.wait(2.2 * w.slow);
    w.npc.clearGesture();
    w.unhold();
    g.wallet.addBank(amt, `Deposit by ${w.rec.given} (coin boxes)`);
    sfx('register', { pos: front, vol: 0.4 });
  } else { w.unhold(); stash(g, amt, w); }
  // takings: it's income like any coin box you empty yourself (XP, the day's coins)
  g.state.earned = (g.state.earned || 0) + amt;
  g.events.emit('coinsCollected', { machine: w.purseFrom || null, amount: amt, staff: w.id });
  w.purse = 0; w.purseFrom = null;
  g.save?.();
}

/** The cashier sells the figure on a stand to the customer (as your own haggle would: Pedestrians.haggleScript). */
function sellStand(g, w, p, price) {
  const H = p.haggle, sale = H.sale;
  H.done = true;
  if (!sale.stand.display.items[0]) return false;
  sale.stand.display.clearItem(0);
  const at = sale.stand.root.position.clone().setY(sale.stand.root.position.y + 0.3);
  if (g.decor?.nearest?.('register', at)) { g.decor.toRegister(price, at); g.state.earned = (g.state.earned || 0) + price; }
  else if (g.wallet) g.wallet.via('cash', () => g.addMoney(price, true, 'Figure sold by staff'));
  else g.addMoney(price);
  g.state.stats.sold = (g.state.stats.sold || 0) + 1;
  sfx('register', { vol: 0.7, pos: at });
  try { g.effects?.coinBurst?.({ pos: at, count: 6, up: 1.2, spread: 0.3, life: 1 }); } catch { /* */ }
  g.events.emit('figureSold', { key: H.key, finish: H.finish, price, haggled: true, staff: w.id });
  g.laneMemory?.gossip('sold', { who: cap(p.name), key: H.key, price });
  g.guestbook?.add?.({ kind: 'haggle', who: cap(p.name), text: `Bought the ${H.name} for ${formatYen(price)} from ${w.rec.given} (tag ${formatYen(H.price)}).` });
  p.h.setExpression?.('happy', 3); p.h.gesture?.('cheer');
  g.save?.();
  return true;
}

/** Leaves fluttering down (pixel petals, tinted green). */
export function leaves(g, at, n = 6) {
  for (let k = 0; k < n; k++) {
    try {
      g.effects.emit({ sprite: 'petal', x: at.x + rnd(-0.2, 0.2), y: (at.y || 0) + rnd(1.0, 1.5), z: at.z + rnd(-0.2, 0.2), vx: rnd(-0.3, 0.3), vy: rnd(0.2, 0.6), vz: rnd(-0.3, 0.3), color: pick([0x6aa83a, 0x8ab84a, 0x4a8a2a]), life: rnd(4, 6), size: 0.03, gravity: 2.4, drag: 2.6, flutter: 5, floor: true, anim: 'loop', fps: rnd(8, 14), landFrame: 0, fade: 0.15, flip: true });
    } catch { /* */ }
  }
}

/** A dry kappa slips with a carton: it hits the floor (a loose box again) and a few capsules roll out. */
function* slip(w, box) {
  const g = w.game, n = w.npc;
  n.gesture('slip');
  w.say(pick(['Wah! My dish!', 'Slippery! SLIPPERY!', 'Kyuu~!']), { dur: 2, style: 'shout' });
  sfx('thud', { pos: n.pos, vol: 0.6 });
  const obj = w.drop();
  const at = n.pos.clone().add(new THREE.Vector3(Math.sin(n.yaw) * 0.5, 0, Math.cos(n.yaw) * 0.5));
  const spill = Math.min(box.data.count, 2 + Math.floor(Math.random() * 3));
  box.data.count -= spill;
  for (let i = 0; i < spill; i++) {
    try {
      const roll = rollCapsule(box.data.series, Math.random);
      g.items.spawnCapsule({ series: box.data.series, key: roll.key, finish: roll.finish, rarity: roll.rarity }, at.clone().setY(0.25), new THREE.Vector3(rnd(-1, 1), rnd(0.5, 1.2), rnd(-1, 1)));
    } catch { /* */ }
  }
  if (obj) { obj.userData.capBox?.setCount?.(box.data.count); setDown(g, w, box.data, obj, at); }
  w.staff.mistake(w, 'Slipped and dropped a capsule carton', 'His dish dried out: dry kappa, slippery kappa');
  yield w.wait(1.6);
}

function putBack(g, w, src) {
  w.drop(true);
  const k = `${src.key}|${src.finish}`;
  g.state.storage[k] = (g.state.storage[k] || 0) + 1;
}

/** An Off-Hobby sale to pack, and where the figure is. */
function packJob(w) {
  const g = w.game, M = g.market?.state;
  if (!M?.ship?.length) return null;
  const want = M.ship.filter((s) => s.status === 'topack' && !s._staffClaim && (s.item?.kind === 'toy' || !s.item?.kind));
  for (const s of want) {
    const key = s.item.key, finish = s.item.finish || 'normal', k = `${key}|${finish}`;
    if (g.state.storage?.[k] > 0 && g.garage?.storageBox) {
      const pos = g.garage.storageBox.getWorldPosition(new THREE.Vector3()).setY(0);
      return { kind: 'pack', label: 'packing an Off-Hobby parcel', ship: s, src: { kind: 'storage', key, finish, pos } };
    }
    for (const d of g.allDisplays?.() || []) {
      const i = d.items.findIndex((it) => it && it.k === key && (it.f || 'normal') === finish);
      if (i < 0) continue;
      const pos = d.slots[i].hit.getWorldPosition(new THREE.Vector3());
      if (!inGarage(pos)) continue;
      return { kind: 'pack', label: 'packing an Off-Hobby parcel', ship: s, src: { kind: 'display', key, finish, display: d, i, pos: pos.setY(0) } };
    }
    for (const e of g.items?.list || []) {
      if (e.kind !== 'toy' || e.data.key !== key || (e.data.finish || 'normal') !== finish || !inGarage(e.obj.position)) continue;
      return { kind: 'pack', label: 'packing an Off-Hobby parcel', ship: s, src: { kind: 'floor', key, finish, ent: e, pos: e.obj.position.clone().setY(0) } };
    }
  }
  return null;
}

// ================================================================== being idle (and being themselves)
const POSTS = { restock: [V(-1.35, 2.2), -Math.PI / 2], clean: [V(-0.1, 3.75), Math.PI * 0.85], greet: [V(1.5, 3.9), -0.8], coins: [V(-1.3, -1.0), -Math.PI / 2], courier: [V(-0.2, 3.7), Math.PI * 0.9], guard: [V(1.7, 6.45), 0] };
export const postOf = (role) => POSTS[role] || POSTS.greet;

/** Idle for a while at one's post, doing whatever this person does when there's nothing to do. */
export function* idle(w) {
  const g = w.game, r = w.rec, n = w.npc, q = new Set(r.quirks || []);
  const [post, yaw] = postOf(r.role);
  if (n.distTo(post) > 0.6) { yield w.goTo(post, yaw); }
  n.faceTo(yaw);
  const h = g.clock?.hours ?? 12;
  // the kappa refills his dish at the sink when it's getting dry (if he remembers)
  if (q.has('dish') && (r.dish ?? 1) < 0.4 && (r.stats?.reliability ?? 3) >= 3) { yield* refillDish(w); return; }
  const roll = Math.random();
  if (q.has('phone') && roll < 0.45) { w.mood = { label: 'on her phone' }; w.onPhone = true; n.gesture('texting'); if (Math.random() < 0.4) w.say(pick(['Omg no way...', 'lol', 'Totally, totally...', 'He said WHAT?']), { dur: 2.2 }); yield w.wait(rnd(8, 16)); w.onPhone = false; n.clearGesture(); w.mood = null; return; }
  if (q.has('sleepy') && (h > 13 || h < 10) && roll < 0.5) { w.mood = { label: 'asleep on their feet' }; n.gesture('doze'); zz(g, w); yield w.wait(rnd(10, 20)); n.clearGesture(); w.mood = null; return; }
  if (q.has('leaves') && roll < 0.25) { n.gesture('drum'); sfx('thud', { pos: n.pos, vol: 0.25 }); w.say('Pon! Poko! Pon!', { dur: 2 }); yield w.wait(2.6); return; }
  if (q.has('bows') && roll < 0.3) { n.gesture('bow'); yield w.wait(2.4); return; }
  if (q.has('robots') && roll < 0.08) { yield* tinker(w); return; }
  if (q.has('ninja') && roll < 0.2) { const p = pick([V(1.7, -1.2), V(-1.3, 3.2), V(2.3, 2.6), post]); w.blinkTo(p, yaw); yield w.wait(rnd(3, 6)); return; }
  if (q.has('singer') && roll < 0.3) { try { g.effects.mark({ sprite: 'note', pos: n.h.headTop(new THREE.Vector3()), color: 0x2a2220, life: 2, size: 0.035 }); } catch { /* */ } }
  if (q.has('hungry') && roll < 0.1) { w.mood = { label: 'having a snack' }; w.say(pick(['Just a quick onigiri...', '*munch*']), { dur: 2 }); yield w.wait(rnd(6, 10)); w.mood = null; return; }
  if (q.has('catlover') && roll < 0.2 && g.street?.cat?.g && !g.street.cat.held) { const c = g.street.cat.g.position; if (inGarage(c)) { yield w.goTo(approach(c, w.pos, 0.6)); w.face(c); n.gesture('reach'); w.say(pick(['Who\'s a good kitty?', 'Mikan-chan~']), { dur: 2.2 }); yield w.wait(3); n.clearGesture(); return; } }
  // the greeter greets whoever comes in
  if (r.role === 'greet') { yield* greetLoop(w, rnd(6, 10)); return; }
  if (Math.random() < 0.12) w.say(w.line(WORK_LINES), { dur: 2.6 });
  yield w.wait(rnd(3, 6));
}

function* greetLoop(w, sec) {
  const g = w.game, P = g.pedestrians;
  const t0 = w.time;
  while (w.time - t0 < sec) {
    if (P && !w.onPhone) {
      for (const p of P.list) {
        if (p._greeted || !(p.state === 'goIn' || p.state === 'goStand')) continue;
        const pp = p.h.root.position;
        if (pp.z > 5.4 || pp.z < 2.5 || Math.abs(pp.x - 0.4) > 2) continue;
        p._greeted = true;
        w.face(pp);
        w.say(w.line(GREET_LINES), { dur: 2.2 });
        if (w.rec.quirks?.includes('bows') || Math.random() < 0.4) w.npc.gesture('bow');
        p.mood = (p.mood || 0) + 1;
        w.stat('greeted');
        // the ghost's welcome is a bit much for some
        if (w.rec.quirks?.includes('ghost') && Math.random() < 0.12) {
          g.tweens.wait(1.2, () => { if (!P.list.includes(p)) return; P.say?.(p.h, pick(['EEK! A GHOST!', 'W-why is it so cold in here?!', 'Her feet! Where are her FEET?!']), 2.2, 'shout'); p.h.gesture?.('cower'); g.tweens.wait(1.6, () => P.list.includes(p) && P.routeOut?.(p)); });
          w.staff.mistake(w, 'Scared off a customer', 'Some people aren\'t ready for a ghost at the counter');
        }
        yield w.wait(1.8);
        break;
      }
    }
    yield w.wait(0.5);
  }
}

function* refillDish(w) {
  const g = w.game;
  w.mood = { label: 'refilling his dish' };
  const sink = node('sink');
  yield w.goTo(sink, Math.PI);
  w.npc.gesture('bow');
  yield w.wait(1);
  sfx('pour', { pos: sink, vol: 0.5 });
  try { g.effects.splash({ pos: w.npc.h.headTop(new THREE.Vector3()), color: 0x8ac8f0, count: 6, size: 0.06 }); } catch { /* */ }
  w.rec.dish = 1;
  w.h?.staffRig?.setDish?.(1);
  w.say(pick(['Aaah. Much better.', 'Refreshing!', 'Full dish, full power!']), { dur: 2.4 });
  yield w.wait(1.6);
  w.mood = null;
}

/** The robot kid "improves" a price plate (+¥100). */
function* tinker(w) {
  const g = w.game;
  const ms = (g.machines || []).filter((m) => m.state === 'idle' && !m._staffClaim);
  if (!ms.length) return;
  const m = pick(ms);
  const spot = machineSpot(m);
  w.mood = { label: 'tinkering with a machine' };
  yield w.goTo(spot.pos, spot.yaw);
  w.npc.gesture('reach');
  w.say(pick(['Ooh, let me just optimise this...', 'Beep boop. Calibrating!', 'I can make this better!']), { dur: 2.6 });
  yield w.wait(2.4);
  w.npc.clearGesture();
  const before = m.price;
  m.price = before + 100;
  if (m.price !== before) { sfx('btnClick', { pos: m.local(0, 1, 0.3), vol: 0.6 }); w.staff.mistake(w, `"Optimised" No.${(m.data.slot || 0) + 1}'s price plate to ${formatYen(m.price)}`, 'Check the price before customers complain'); }
  w.mood = null;
}

function zz(g, w) {
  try { g.effects.mark({ sprite: 'zz', pos: w.npc.h.headTop(new THREE.Vector3()), color: 0xffffff, life: 2.4, size: 0.04 }); } catch { /* */ }
}

// ================================================================== safely stopping
/** Put everything back when a job is cut short (shift over, fired, a chat about something urgent). */
export function abortJob(w) {
  const g = w.game, job = w.job;
  if (job?.kind === 'restock' && job.m?.lidOpen && job.m._staffClaim === w.id && !job.m.lid.busy) job.m.closeLid();
  if (w.carried) {
    const o = w.drop();
    if (o?.userData?.capBox) setDown(g, w, o.userData.capBox.data, o);
    else if (job?.kind === 'pack' && job.src) { o?.removeFromParent(); putBack(g, w, job.src); }
    else o?.removeFromParent();
  }
  if (w.purse) { const amt = w.purse; w.purse = 0; stash(g, amt, w); g.state.earned = (g.state.earned || 0) + amt; g.events.emit('coinsCollected', { machine: w.purseFrom || null, amount: amt, staff: w.id }); w.log(`Left ${formatYen(amt)} of coin-box money for you`); }
  w.unhold();
  w.onPhone = false; w.mood = null;
  w.cleanupJob();
  w.stopJob();
}

/** Coin-box money with nowhere to walk it: into the register (if there is one), the piggy bank, else the bank. */
function stash(g, amt, w) {
  const D = g.decor, W = g.wallet;
  if (!W) { g.addMoney(amt, true); return; }
  if (D?.nearest?.('register')) { W.toRegister(amt); return; }
  if (D?.nearest?.('piggy')) { W.s.piggy += amt; W.emit('piggy', amt); return; }
  W.addBank(amt, `Deposit by ${w?.rec?.given || 'staff'} (coin boxes)`);
}
void _v;
