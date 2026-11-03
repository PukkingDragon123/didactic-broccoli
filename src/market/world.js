// The physical side of the market, installed into the running game:
//   - parcels (delivery data type 'parcel') opened in small steps: cut the tape, fold the flaps, take things out one by
//     one, flatten the empty box; RMB picks a closed parcel up (and they open in your hands too)
//   - 'mkt' items you carry and place: luck charms, tip jars, graded slabs, thrift clothes, junk-lot trinkets, the brick
//   - charms on display in the garage add luck (game.luck: finish / rare, customer footfall, fewer scams); tip jars
//     fill up as customers play and you empty them by hand
//   - figure variants (stickers, doodles, faded paint) follow the figure: in your hands, on the floor, on shelves and
//     stands, in the storage bin
//   - the OUTGOING crate by the shutter: hand it what you sold (or are sending to the graders), Gen-san picks it up
//   - Gen-san's free candy: click to eat
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { formatYen } from '../core/util.js';
import { makeItemMesh } from '../game/collectibles.js';
import { DisplaySlots } from '../game/Display.js';
import { GachaMachine } from '../game/GachaMachine.js';
import { propMesh } from '../world/props.js';
import { TOOLS } from '../data/tools.js';
import { getItem } from '../data/series/index.js';
import { COSMETIC_BY_ID } from '../people/cosmetics.js';
import { CHARM_DEFS, TIPJAR_DEFS, GRADES, itemTitle } from './catalog.js';
import { decorateFigure } from './variants.js';
import { mktObject, contentObject, parcelOf, decorateMachine } from './models.js';
import { marketState, courierState, nextId, stamp, yen } from './util.js';
import { FLAVORS } from './courier.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const inGarage = (p) => Math.abs(p[0] ?? p.x) < 4 && (p[2] ?? p.z) > -5 && (p[2] ?? p.z) < 5.1;
export const OUTBOX = { x: -0.95, z: 4.5, rot: Math.PI };

/** Display name of 'mkt' data. */
export function mktName(d) {
  if (!d) return '';
  if (d.t === 'charm') return CHARM_DEFS[d.id]?.name || 'Lucky charm';
  if (d.t === 'tipjar') return TIPJAR_DEFS[d.id]?.name || 'Tip jar';
  if (d.t === 'slab') return `KGS ${d.score} ${getItem(d.key)?.name || ''}`;
  if (d.t === 'garment') return COSMETIC_BY_ID[d.cid]?.name || 'Clothes';
  if (d.t === 'brick') return 'A brick (in newspaper)';
  if (d.t === 'trinket') return { button: 'A big button', spoon: 'A souvenir spoon', cassette: 'A mixtape', keychain: 'A keychain', batteries: 'Some old batteries', marble: 'A ramune marble' }[d.id] || 'A trinket';
  return d.t;
}
/** Luck from a charm at its grade (junk charms barely work; daruma doubles once an eye is painted). */
export function charmPotency(d) { const g = GRADES[d.grade || 'B']; return (g ? 0.5 + g.mult * 0.6 : 1) * (d.eyes ? 1.5 : 1) * (d.variant?.bootleg ? 0.1 : 1); }

export function installWorld(game, mk) {
  const g = game, M = marketState(g), H = g.held;
  M.variants ||= {};
  M.loose ||= [];
  let pendingV = null; // a variant waiting for the figure that is about to land in your hand

  // ================================================================== figure variants follow the figure
  const take0 = H.take.bind(H);
  H.take = (kind, data, obj, opts) => {
    if (kind === 'toy' && data && !data.variant && pendingV && pendingV.key === data.key && (pendingV.finish || 'normal') === (data.finish || 'normal')) { data.variant = pendingV.v; }
    pendingV = null;
    const r = take0(kind, data, obj, opts);
    if ((kind === 'toy' || kind === 'packaged') && data?.variant) decorateFigure(obj, data.variant);
    return r;
  };
  const spawnToy0 = g.items.spawnToy.bind(g.items);
  g.items.spawnToy = (data, pos, opts) => { const e = spawnToy0(data, pos, opts); if (data?.variant) decorateFigure(e.obj, data.variant); return e; };
  if (!DisplaySlots.prototype._mkt) {
    DisplaySlots.prototype._mkt = true;
    const use0 = DisplaySlots.prototype.use, show0 = DisplaySlots.prototype.showItem;
    DisplaySlots.prototype.use = function (slot, held) {
      const cur = this.items[slot.i];
      const hv = held?.kind === 'toy' ? held.data.variant : null;
      if (cur?.v) pendingV = { key: cur.k, finish: cur.f, v: cur.v };
      const r = use0.call(this, slot, held);
      if (hv && this.items[slot.i]) this.items[slot.i].v = hv;
      return r;
    };
    DisplaySlots.prototype.showItem = function (i, data, pop) { show0.call(this, i, data, pop); if (data?.v) decorateFigure(this.slots[i].mesh, data.v); };
  }
  // storage keeps a variant as a third key part: "key|finish|v12"
  const store0 = g.storeHeld.bind(g), takeOut0 = g.takeFromStorage.bind(g);
  g.storeHeld = () => {
    const held = H.item;
    if (!(held?.kind === 'toy' && held.data.variant)) return store0();
    const vid = nextId(M, 'v');
    M.variants[vid] = held.data.variant;
    const k = `${held.data.key}|${held.data.finish}|${vid}`;
    const target = g.garage.storageBox.getWorldPosition(V3()).add(V3(0, 0.3, 0));
    H.putTo(target, new THREE.Quaternion(), (obj) => { obj.parent?.remove(obj); g.state.storage[k] = (g.state.storage[k] || 0) + 1; audio.play('place', { pos: target, vol: 0.8 }); g.save(); }, { dur: 0.35, arc: 0.12, scale: 0.5 });
  };
  g.takeFromStorage = (k = null) => {
    const keys = Object.keys(g.state.storage).filter((x) => g.state.storage[x] > 0);
    const pick = k && g.state.storage[k] ? k : keys[keys.length - 1];
    const [key, finish, vid] = String(pick || '').split('|');
    if (vid && M.variants[vid]) pendingV = { key, finish, v: M.variants[vid] };
    const r = takeOut0(pick);
    pendingV = null;
    return r;
  };
  // machines bought second-hand keep their stickers and faded paint
  if (!GachaMachine.prototype._mkt) {
    GachaMachine.prototype._mkt = true;
    const init0 = GachaMachine.prototype.init;
    GachaMachine.prototype.init = function () { init0.call(this); if (this.data.variant) decorateMachine(this.model, this.L, this.data.variant); };
  }
  for (const m of g.machines) if (m.data.variant) decorateMachine(m.model, m.L, m.data.variant);
  // re-attach variants the restore code dropped (loose figures, figures in your hands, on shelves)
  for (const l of g.state.loose || []) {
    if (l.kind !== 'toy' || !l.d?.variant) continue;
    const e = [...g.items.list].find((x) => x.kind === 'toy' && x.data.key === l.d.key && !x.data.variant && Math.abs(x.obj.position.x - l.p[0]) < 0.02 && Math.abs(x.obj.position.z - l.p[2]) < 0.02);
    if (e) { e.data.variant = l.d.variant; decorateFigure(e.obj, l.d.variant); }
  }
  for (const s of H.slots) if (s?.kind === 'toy' && s.data.variant) decorateFigure(s.obj, s.data.variant);
  for (const d of g.allDisplays()) d.items.forEach((it, i) => { if (it?.v && d.slots[i]?.mesh) decorateFigure(d.slots[i].mesh, it.v); });

  // ================================================================== 'mkt' things in your hands and in the world
  const looseObjs = new Map(); // rec -> obj
  const spawnLoose = (rec, animate = false) => {
    const obj = mktObject(g, rec.d);
    obj.position.set(...rec.p);
    obj.rotation.y = rec.r || 0;
    g.scene.add(obj);
    looseObjs.set(rec, obj);
    if (rec.d.t === 'tipjar') updateJar(rec, obj);
    g.interaction.add(obj, {
      hint: (held) => looseHint(rec, held),
      use: (held) => { looseUse(rec, obj, held); return false; },
      alt: () => pickLoose(rec, obj),
    });
    if (animate) { obj.scale.setScalar(0.6); g.tweens.add({ dur: 0.25, update: (k) => obj.scale.setScalar(0.6 + 0.4 * k) }); }
    return obj;
  };
  const looseHint = (rec, held) => {
    const d = rec.d, nm = mktName(d);
    if (held) return null;
    if (d.t === 'tipjar') return { key: 'LMB', text: d.cash ? `Empty the tip jar (${yen(d.cash)})` : 'Tip jar (empty)', sub: `${nm} · RMB to pick it up` };
    if (d.t === 'charm') {
      const on = inGarage(rec.p);
      if (d.id === 'daruma' && !d.eyes) return { key: 'LMB', text: 'Make a wish: paint one eye', sub: `${nm} · RMB to pick it up` };
      return { key: 'LMB', text: `Pick up ${nm}`, sub: on ? luckText(d) : 'Bring it into the shop for its luck to work' };
    }
    return { key: 'LMB', text: `Pick up ${nm}` };
  };
  const looseUse = (rec, obj, held) => {
    const d = rec.d;
    if (held) return;
    if (d.t === 'tipjar' && d.cash) {
      const v = d.cash; d.cash = 0;
      g.addMoney(v, false, 'Tip jar');
      audio.play('coinDrop', { pos: obj.position, vol: 0.8 });
      g.effects.coinBurst?.({ pos: obj.position.clone().add(V3(0, 0.12, 0)), count: Math.min(10, 2 + Math.floor(v / 40)), up: 1.2, spread: 0.3, life: 1 });
      g.news(`Tips: +${yen(v)}`, 'Thank you, customers!');
      updateJar(rec, obj);
      g.save();
      return;
    }
    if (d.t === 'charm' && d.id === 'daruma' && !d.eyes) {
      d.eyes = 1;
      audio.play('paint', { pos: obj.position, vol: 0.7 });
      g.news('You painted one eye and made a wish', 'Paint the other when it comes true. Luck x1.5!');
      g.save();
      return;
    }
    pickLoose(rec, obj);
  };
  const pickLoose = (rec, obj) => {
    if (!H.canTake()) { g.news('Your hands are full'); return; }
    g.interaction.remove(obj);
    looseObjs.delete(rec);
    M.loose.splice(M.loose.indexOf(rec), 1);
    H.take('mkt', rec.d, obj);
    audio.play('pickup', { vol: 0.7 });
    g.save();
  };
  for (const rec of M.loose) spawnLoose(rec);
  /** Put a 'mkt' thing in the world (tests, other systems): d = mkt data, p = [x, y, z]. */
  mk.placeLoose = (d, p, r = 0) => { const rec = { d, p, r }; M.loose.push(rec); spawnLoose(rec, true); return rec; };

  /** Put a 'mkt' thing down on a surface you aim at (or the floor in front). */
  const placeHeld = (dropAnywhere = false) => {
    const it = H.item;
    const hit = g.placement?.surfaceHit?.(2.2);
    const fwd = V3(0, 0, -1).applyQuaternion(g.camera.quaternion);
    if (!hit && !dropAnywhere) { g.news('Aim at a table, a shelf or the floor'); audio.play('error', { vol: 0.4 }); return; }
    const target = hit && hit.point.y < 1.6 ? hit.point.clone() : g.player.pos.clone().add(V3(fwd.x, 0, fwd.z).normalize().multiplyScalar(0.6)).setY(0);
    const yaw = Math.atan2(g.camera.position.x - target.x, g.camera.position.z - target.z);
    H.putTo(target, new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), yaw), (obj, rel) => {
      obj.parent?.remove(obj);
      const rec = { d: rel.data, p: [target.x, target.y, target.z], r: yaw };
      M.loose.push(rec);
      spawnLoose(rec, true);
      audio.play('place', { pos: target, vol: 0.7 });
      if (rel.data.t === 'charm' && inGarage(rec.p)) g.news(`${mktName(rel.data)} is watching over the shop`, luckText(rel.data));
      if (rel.data.t === 'tipjar' && inGarage(rec.p)) g.tip?.('tipjar', 'Tip jar out', 'Customers drop coins in it now and then: click to empty it');
      g.save();
    }, { dur: 0.3, arc: 0.05, scale: 1 });
  };
  const wear = () => {
    const it = H.item, cid = it.data.cid, c = COSMETIC_BY_ID[cid];
    if (!c) { H.consume(); return; }
    const A = g.state.avatar;
    if (A) { A.owned = [...new Set([...(A.owned || []), cid])]; A[c.slot] = cid; }
    H.consume();
    audio.play('pickup', { vol: 0.7 });
    g.events.emit('avatar');
    g.news(`You put on the ${c.name}`, it.data.smell ? `It smells a bit like ${it.data.smell}. It's in your closet now.` : "It's in your closet now (main menu)");
    g.save();
  };

  // ---- held hooks ('mkt', parcels, candy)
  const poseFor = H.poseFor.bind(H), scaleFor = H.scaleFor.bind(H), hint0 = H.hint.bind(H), drop0 = H.drop.bind(H), primary0 = H.primary.bind(H);
  const isParcel = (it) => it?.kind === 'box' && it.data?.type === 'parcel';
  H.poseFor = (it) => (it?.kind === 'mkt' ? (it.data.t === 'garment' || it.data.t === 'brick' ? 'item' : 'toy') : poseFor(it));
  H.scaleFor = (it, pose) => (it?.kind === 'mkt' ? ({ slab: 1.5, charm: 1.1, tipjar: 1.0, garment: 0.75, brick: 0.7, trinket: 1.6 }[it.data.t] || 1) : scaleFor(it, pose));
  H.hint = () => {
    const it = H.item;
    if (!it || H.busy) return hint0();
    if (it.kind === 'mkt') {
      const d = it.data, nm = mktName(d);
      if (d.t === 'garment') return { key: 'LMB', text: `Put on the ${nm}`, sub: 'Q to set it down' };
      if (d.t === 'brick') return { key: 'Q', text: "It's a brick.", sub: 'Wrapped in yesterday\'s paper. File a claim on Off-Hobby.' };
      if (d.t === 'slab') return { key: 'LMB', text: `Place: ${nm}`, sub: `Graded ${d.score} · sells for a lot more on Off-Hobby` };
      if (d.t === 'charm') return { key: 'LMB', text: `Place the ${nm}`, sub: luckText(d) };
      if (d.t === 'tipjar') return { key: 'LMB', text: `Place the ${nm}`, sub: 'On the table or a shelf in the shop: customers tip' };
      return { key: 'LMB', text: `Place: ${nm}`, sub: 'Q to set it down' };
    }
    if (isParcel(it)) return parcelHeldHint(it);
    if (it.kind === 'tool' && it.data.id === 'gen_candy') return { key: 'LMB', text: `Eat the ${FLAVORS[it.data.flavor] || 'fruit'} candy`, sub: 'From Gen-san. Free!' };
    return hint0();
  };
  H.primary = () => {
    const it = H.item;
    if (it?.kind === 'mkt' && !H.busy) { if (it.data.t === 'garment') wear(); else placeHeld(); return; }
    if (isParcel(it) && !H.busy) { parcelStep(it, null); return; }
    if (it?.kind === 'tool' && it.data.id === 'gen_candy' && !H.busy) { eatCandy(); return; }
    primary0();
  };
  H.drop = () => { const it = H.item; if (it?.kind === 'mkt') { placeHeld(true); return; } drop0(); };
  // things of this kind that were in your inventory when the game was saved
  (g.state.inventory || []).forEach((it, i) => {
    if (!it || it.kind !== 'mkt' || H.slots[i]) return;
    const obj = mktObject(g, it.d);
    H.anchor.add(obj);
    obj.visible = i === H.sel;
    H.slots[i] = { kind: 'mkt', data: it.d, obj, ent: null };
    if (i === H.sel) { H.pose = H.poseFor(H.slots[i]); H.holdScale = H.scaleFor(H.slots[i]); H.startTrans(H.pose, 0.01); }
  });

  // ---- candy
  const eatCandy = () => {
    const it = H.item, f = FLAVORS[it.data.flavor] || 'fruit';
    audio.play('candyWrapper', { vol: 0.7 });
    audio.play('candyCrunch', { vol: 0.6, delay: 0.25 });
    H.consume();
    const C = courierState(g);
    C.eaten = (C.eaten || 0) + 1;
    g.events.emit('ate', { id: 'gen_candy', flavor: it.data.flavor, energy: 6 });
    g.energy?.add?.(6);
    g.news(pick([`Mmm, ${f}!`, `A ${f} candy. Tastes like the Showa era.`, `${f[0].toUpperCase() + f.slice(1)}. Gen-san has good taste.`]), C.eaten > 1 ? `Free candies eaten: ${C.eaten}` : '');
    if (C.eaten >= 10) g.os?.achievements?.unlock('mkt_sweet_tooth');
  };

  // ================================================================== parcels
  const spawnBox0 = g.items.spawnBox.bind(g.items);
  g.items.spawnBox = (data, pos, mesh) => {
    const ent = spawnBox0(data, pos, mesh);
    if (data?.type === 'parcel') ent.obj.userData.handler = parcelHandler(ent);
    return ent;
  };
  for (const e of g.items.list) if (e.kind === 'box' && e.data?.type === 'parcel') e.obj.userData.handler = parcelHandler(e);
  function nextName(d) { const c = d.contents?.[0]; if (!c) return ''; if (c.kind === 'toy') return getItem(c.d.key)?.name || 'a figure'; if (c.kind === 'tool') return TOOLS[c.d.id]?.name || c.d.id; return mktName(c.d); }
  function parcelHint(d) {
    const st = d.stage ?? 0, n = d.contents?.length || 0;
    if (st === 0) return { key: 'LMB', text: 'Cut the tape', sub: `From ${d.from || 'Off-Hobby'}${d.label ? ` · ${d.label}` : ''}` };
    if (st === 1) return { key: 'LMB', text: 'Fold the flaps open', sub: d.label || '' };
    if (n) return { key: 'LMB', text: `Take out ${nextName(d)}`, sub: `${n} thing${n > 1 ? 's' : ''} inside` };
    return { key: 'LMB', text: 'Flatten the empty box' };
  }
  function parcelHeldHint(it) { const h = parcelHint(it.data); return h.text === 'Flatten the empty box' ? { ...h, sub: 'or Q to put it down' } : h; }
  function parcelHandler(ent) {
    return {
      hint: (held) => {
        const d = ent.data, h = parcelHint(d);
        if (d.stage >= 2 && d.contents?.length && !H.canTake()) return { key: '', text: 'Your hands are full', sub: `Next: ${nextName(d)}` };
        return held ? h : { ...h, sub: `${h.sub ? h.sub + ' · ' : ''}RMB to pick it up` };
      },
      use: () => { parcelStep(null, ent); return false; },
      alt: () => { if ((ent.data.contents?.length ?? 0) || ent.data.stage < 2) g.items.pickUp(ent); },
    };
  }
  /** One step on a parcel (held `it` or loose `ent`). */
  function parcelStep(it, ent) {
    const obj = it ? it.obj : ent.obj, d = it ? it.data : ent.data;
    const ctl = parcelOf(obj);
    const pos = obj.getWorldPosition(V3()).add(V3(0, 0.2, 0));
    const st = d.stage ?? 0;
    if (st < 2) { ctl?.setStage(st + 1); audio.play(st === 0 ? 'tapeRip' : 'flapFold', { pos, vol: 0.9 }); return; }
    if (d.contents?.length) {
      if (!H.canTake()) { g.news('Your hands are full', 'Put something down first'); audio.play('error', { vol: 0.4 }); return; }
      const c = d.contents.shift();
      const o = c.kind === 'toy' ? (() => { const h = new THREE.Group(); h.add(makeItemMesh(c.d.key, c.d.finish || 'normal')); return h; })() : c.kind === 'tool' ? null : contentObject(g, c);
      ctl?.sync();
      audio.play('boxOpen', { pos, vol: 0.6 });
      if (c.kind === 'tool') { H.giveTool(c.d.id, c.d.flavor ? { flavor: c.d.flavor } : {}); }
      else {
        o.position.copy(pos);
        g.scene.add(o);
        if (c.kind === 'toy') {
          const isNew = g.discover(c.d.key, c.d.finish || 'normal');
          H.take('toy', { key: c.d.key, finish: c.d.finish || 'normal', ...(c.d.variant ? { variant: c.d.variant } : {}) }, o, { isNew });
        } else H.take('mkt', c.d, o);
      }
      if (c.kind === 'mkt' && c.d.t === 'brick') { g.news('...it is a brick.', 'Wrapped in newspaper. You got scammed. File a claim on Off-Hobby!'); M.stats.scammed++; g.os?.achievements?.unlock('mkt_brick'); }
      g.events.emit('parcelItem', { from: d.from, item: c });
      g.save();
      return;
    }
    // flatten the empty box: it becomes cardboard for the garbage station (if that exists) or just goes
    audio.play('paper', { pos, vol: 0.8 });
    if (it) { H.consume(); if (TOOLS.cardboard) H.giveTool('cardboard'); }
    else {
      g.items.destroy(ent);
      if (TOOLS.cardboard) g.items.spawnTool({ id: 'cardboard' }, obj.position.clone(), Math.random() * 6);
    }
    g.save();
  }

  // ================================================================== luck from charms on display
  const activeCharms = () => M.loose.filter((r) => r.d.t === 'charm' && inGarage(r.p));
  mk.luck = () => {
    const out = { finish: 0, rare: 0, foot: 0, ward: 0, tips: 0 };
    for (const r of activeCharms()) { const L = CHARM_DEFS[r.d.id]?.luck || {}, k = charmPotency(r.d); for (const key of Object.keys(L)) out[key] += L[key] * k; }
    out.finish = Math.min(0.5, out.finish); out.rare = Math.min(0.5, out.rare); out.foot = Math.min(0.4, out.foot); out.ward = Math.min(0.9, out.ward); out.tips = Math.min(1.5, out.tips);
    return out;
  };
  const luck0 = g.luck.bind(g);
  g.luck = () => { const b = luck0(), m = mk.luck(); return { ...b, finish: b.finish + m.finish, rare: b.rare + m.rare }; };
  if (g.sim?.footfall) { const ff = g.sim.footfall.bind(g.sim); g.sim.footfall = () => ff() * (1 + mk.luck().foot); }

  // ================================================================== tip jars: customers drop coins in
  let seenCust = g.state.stats?.customers || 0;
  const jarCoins = new Map();
  function updateJar(rec, obj) {
    let c = jarCoins.get(rec);
    if (!c) {
      c = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 8), new THREE.MeshStandardMaterial({ color: 0xe0b860, metalness: 0.9, roughness: 0.35 }));
      c.userData.noDecal = true; c.raycast = () => {};
      obj.add(c);
      jarCoins.set(rec, c);
    }
    const k = Math.min(1, (rec.d.cash || 0) / 600);
    c.visible = k > 0;
    c.scale.set(1, 0.3 + k * 3, 1);
    c.position.y = 0.012 + k * 0.03;
  }
  mk.tick = () => {
    const n = g.state.stats?.customers || 0;
    if (n > seenCust) {
      const jars = M.loose.filter((r) => r.d.t === 'tipjar' && inGarage(r.p));
      const L = mk.luck();
      for (let i = seenCust; i < n; i++) for (const r of jars) {
        const def = TIPJAR_DEFS[r.d.id], gm = GRADES[r.d.grade || 'B']?.mult ?? 0.6;
        if (Math.random() < 0.1 * (def?.rate || 1) * (0.6 + gm * 0.5) / Math.max(1, jars.length * 0.7)) {
          r.d.cash = (r.d.cash || 0) + [10, 10, 10, 50, 100][Math.floor(Math.random() * 5)] * (1 + L.tips);
          r.d.cash = Math.round(r.d.cash / 10) * 10;
          const o = looseObjs.get(r);
          if (o) { updateJar(r, o); audio.play('coinDrop', { pos: o.position, vol: 0.5 }); }
        }
      }
    }
    seenCust = n;
  };

  // ================================================================== the OUTGOING crate
  const crate = propMesh('mk_outbox', { fallbackSize: [0.48, 0.21, 0.34] });
  crate.position.set(OUTBOX.x, 0, OUTBOX.z);
  crate.rotation.y = OUTBOX.rot;
  g.scene.add(crate);
  const inCrate = new THREE.Group();
  crate.add(inCrate);
  const parcelGeo = new THREE.BoxGeometry(0.15, 0.08, 0.11), parcelMat = new THREE.MeshStandardMaterial({ color: 0xc89a5f, roughness: 0.95 });
  const labelMat = new THREE.MeshStandardMaterial({ color: 0xfbf6ea, roughness: 0.9 });
  mk.outboxPos = () => V3(OUTBOX.x, 0, OUTBOX.z);
  mk.drawOutbox = () => {
    inCrate.clear();
    const packed = (M.ship || []).filter((s) => s.status === 'packed');
    packed.slice(0, 6).forEach((s, i) => {
      const b = new THREE.Mesh(parcelGeo, parcelMat);
      b.position.set(((i % 3) - 1) * 0.15, 0.06 + Math.floor(i / 3) * 0.085, 0);
      b.rotation.y = (i * 0.7) % 0.3 - 0.15;
      b.castShadow = true;
      const l = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.045), labelMat);
      l.rotation.x = -Math.PI / 2; l.position.y = 0.041; b.add(l);
      inCrate.add(b);
    });
  };
  mk.collectOutbox = () => {
    let n = 0;
    for (const s of M.ship || []) if (s.status === 'packed') { s.status = 'shipped'; s.shipped = stamp(g); n++; mk.onShipped?.(s); }
    M.pickupAt = null;
    mk.drawOutbox();
    g.save();
    return n;
  };
  mk.drawOutbox();
  const heldDesc = (it) => {
    if (!it) return null;
    if (it.kind === 'toy') return { kind: 'toy', key: it.data.key, finish: it.data.finish || 'normal' };
    if (it.kind === 'packaged') return { kind: 'packaged', key: it.data.key, finish: it.data.finish || 'normal' };
    if (it.kind === 'mkt' && it.data.t === 'slab') return { kind: 'slab', key: it.data.key, finish: it.data.finish || 'normal', score: it.data.score };
    return null;
  };
  const matchShip = (hd) => (M.ship || []).find((s) => s.status === 'topack' && s.item.key === hd.key && (s.item.finish || 'normal') === hd.finish && (s.item.kind === hd.kind || (s.item.kind === 'toy' && hd.kind === 'toy')) && (hd.kind !== 'slab' || s.item.score === hd.score));
  g.interaction.add(crate, {
    hint: (held) => {
      const it = H.item;
      const waiting = (M.ship || []).filter((s) => s.status === 'topack').length, packed = (M.ship || []).filter((s) => s.status === 'packed').length;
      const hd = heldDesc(it);
      if (hd) {
        const s = matchShip(hd);
        if (!s) return { key: '', text: 'Nobody bought this one', sub: waiting ? `${waiting} sale${waiting > 1 ? 's' : ''} to pack: see Off-Hobby > To ship` : 'List it on Off-Hobby first' };
        if (M.shipBoxes <= 0) return { key: '', text: 'No shipping boxes left', sub: 'Order some from Daikoku Toys' };
        return { key: 'LMB', text: s.kind === 'grading' ? 'Pack it for the graders (KGS)' : `Pack it for ${s.buyer}`, sub: `${M.shipBoxes} shipping box${M.shipBoxes === 1 ? '' : 'es'} left · Gen-san collects` };
      }
      if (held) return null;
      return { key: '', text: 'OUTGOING', sub: packed ? `${packed} parcel${packed > 1 ? 's' : ''} for Gen-san's next visit` : waiting ? `${waiting} to pack: bring the item here` : 'Things you sell or send for grading go here' };
    },
    use: () => {
      const it = H.item, hd = heldDesc(it);
      const s = hd && matchShip(hd);
      if (!s || M.shipBoxes <= 0) return false;
      M.shipBoxes--;
      const target = crate.localToWorld(V3(0, 0.15, 0));
      H.putTo(target, new THREE.Quaternion(), (obj) => {
        obj.parent?.remove(obj);
        s.status = 'packed';
        s.packed = stamp(g);
        if (it.data.variant) s.item.variant = it.data.variant;
        audio.play('tapeRip', { pos: target, vol: 0.8 });
        mk.drawOutbox();
        // Gen-san swings by for it within the hour (or on his next delivery)
        if (M.pickupAt == null) M.pickupAt = stamp(g) + 40 + Math.random() * 30;
        g.news('Packed and labelled', "Gen-san picks it up on his next visit");
        mk.onPacked?.(s);
        g.save();
      }, { dur: 0.35, arc: 0.12, scale: 0.4 });
      return false;
    },
  });
}

function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
export function luckText(d) {
  const L = CHARM_DEFS[d.id]?.luck || {}, k = charmPotency(d), out = [];
  if (L.finish) out.push(`finishes +${Math.round(L.finish * k * 100)}%`);
  if (L.rare) out.push(`rare pulls +${Math.round(L.rare * k * 100)}%`);
  if (L.foot) out.push(`customers +${Math.round(L.foot * k * 100)}%`);
  if (L.ward) out.push(`scams -${Math.round(L.ward * k * 100)}%`);
  if (L.tips) out.push(`tips +${Math.round(L.tips * k * 100)}%`);
  return out.length ? `Luck: ${out.join(', ')}` : 'A lucky charm';
}
export { itemTitle, formatYen };
