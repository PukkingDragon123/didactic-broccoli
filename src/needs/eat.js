// Eating and drinking what's in your hands: click with food selected (nothing targeted). The item comes up to your
// mouth (your hands follow it, src/game/FPBody.js grips whatever Held carries), a can is cracked open first, a bottle
// tips back for a few gulps, bread and onigiri go in a few bites (crumbs), noodles are slurped (steam), then
// game.needs.consume applies it. Every food / drink id is also a carried tool (TOOLS entries are registered here at
// import time, before the save restores your inventory).
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { TOOLS } from '../data/tools.js';
import { POSES } from '../game/Held.js';
import { FOODS, DRINK_IDS } from './foods.js';
import './icons.js';
import './sfx.js';

// carried foods (the dagashi already had TOOLS entries)
const CARRY = ['oni_ume', 'oni_tuna', 'oni_shake', 'melonpan', 'anpan', 'cupnoodle', 'purin', ...DRINK_IDS];
for (const id of CARRY) {
  const f = FOODS[id];
  if (TOOLS[id]) continue;
  const size = f.art?.shape === 'pet' ? 0.2 : f.art?.shape === 'tall' ? 0.16 : f.art?.shape === 'mini' ? 0.1 : f.art?.shape === 'cup' ? 0.085 : f.art ? 0.12 : id === 'cupnoodle' ? 0.12 : 0.1;
  TOOLS[id] = { name: f.name, icon: f.icon || 'box', prop: f.prop, desc: `${f.pros}. Click to ${verbOf(f)} it.`, hand: size };
}
// plant care and the ramen shop's ticket
Object.assign(TOOLS, {
  watering_can: { name: 'Watering Can', icon: 'watering_can', prop: 'watering_can', desc: 'Water your plants with it. Fill it at any tap.', keep: true, hand: 0.28 },
  seeds: { name: 'Morning Glory Seeds', icon: 'seeds', prop: 'seed_packet', desc: 'Plant them in an empty pot.', hand: 0.1 },
  fertiliser: { name: 'Fertiliser', icon: 'fertiliser', prop: 'fertiliser', desc: 'A scoop helps a plant grow faster. A few uses.', hand: 0.13 },
  meal_ticket: { name: 'Meal Ticket', icon: 'meal_ticket', prop: 'rm_ticket', desc: 'Hand it to the ramen master.', hand: 0.06 },
});
// the poses: up at your mouth (a bottle tips back, food is held close)
POSES.mouth = { pos: new THREE.Vector3(0.015, -0.085, -0.19), rot: new THREE.Euler(0.15, -0.2, 0.05) };
POSES.drink = { pos: new THREE.Vector3(0.0, -0.05, -0.17), rot: new THREE.Euler(1.15, 0.1, 0.0) };

export function verbOf(f) { return f.how === 'slurp' ? 'slurp' : f.how === 'eat' ? 'eat' : 'drink'; }
export const isFood = (it) => it?.kind === 'tool' && !!FOODS[it.data.id] && FOODS[it.data.id].how !== 'bowl';

const _p = new THREE.Vector3();
const smooth = (k) => k * k * (3 - 2 * k);

/** The hint while you hold something edible (nothing targeted). */
export function foodHint(game, it) {
  const f = FOODS[it.data.id];
  const v = verbOf(f);
  const opened = it.data.open ? ' (open)' : '';
  return { key: 'LMB', text: `${v[0].toUpperCase() + v.slice(1)} the ${f.name}${opened}`, sub: `${f.pros}${f.cons ? ' · ' + f.cons : ''}` };
}

/** Eat / drink the selected item. */
export function consumeHeld(game, { done } = {}) {
  const g = game, H = g.held, it = H.item;
  if (!isFood(it) || H.busy) return false;
  const f = FOODS[it.data.id], obj = it.obj, sel = H.sel;
  H.busy = true;
  H.trans = null;
  const fromP = obj.position.clone(), fromQ = obj.quaternion.clone();
  const drink = f.how !== 'eat' && f.how !== 'slurp';
  const P = drink ? POSES.drink : POSES.mouth;
  const toQ = new THREE.Quaternion().setFromEuler(P.rot);
  const mouth = () => g.camera.localToWorld(_p.set(0, -0.06, -0.16));
  const can = f.how === 'can' && !it.data.open;
  const t0 = can ? 0.55 : 0;
  const dur = f.how === 'slurp' ? 2.4 : drink ? 1.7 : 1.9;
  // a can: pull the tab with it still in front of you
  if (can) {
    audio.play('canOpen', { vol: 0.7 });
    it.data.open = true;
    g.tweens.wait(0.08, () => g.effects.sparks({ pos: obj.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.06, 0)), count: 7, colors: [0xffffff, 0xe8f4ff], speed: 0.35, size: 0.008, star: 0, gravity: 3, life: 0.4 }));
  }
  if (f.hot) g.effects.puff({ pos: obj.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.08, 0)), count: 3, colors: [0xf4f4f4, 0xe0e0e0], size: 0.035, up: 0.25, gravity: -0.2, life: 1.2 });
  // up to the mouth, the beats of eating, back down and gone
  g.tweens.add({
    dur: t0 + dur,
    update: (k) => {
      const t = k * (t0 + dur) - t0;
      if (t < 0) { obj.position.copy(fromP).y += Math.sin(Math.PI * (t + t0) / t0) * 0.01; return; }
      const u = t / dur;
      const up = smooth(Math.min(1, u / 0.22)) * (1 - smooth(Math.max(0, (u - 0.86) / 0.14)));
      obj.position.lerpVectors(fromP, P.pos, up);
      obj.quaternion.slerpQuaternions(fromQ, toQ, up);
      if (drink) { obj.rotateX(Math.sin(u * Math.PI * 3) * 0.06 * up); obj.position.y += Math.sin(u * Math.PI * 6) * 0.004 * up; }
      else obj.position.z += Math.max(0, Math.sin(u * Math.PI * 4)) * 0.025 * up; // bites: in, out
      if (u > 0.86) obj.scale.setScalar(Math.max(0.01, (1 - (u - 0.86) / 0.14)) * (H.holdScale || 1));
    },
    done: () => {
      obj.parent?.remove(obj);
      if (H.slots[sel] === it) H.slots[sel] = null;
      H.busy = false;
      H.removeTag?.();
      g.events.emit('held', H.item || null);
      g.events.emit('slot', H.sel);
      g.needs?.consume(f.id);
      if (drink && Math.random() < 0.25 && !f.hot) g.tweens.wait(0.5, () => audio.play('burp', { vol: 0.5 }));
      g.save();
      done?.(f);
    },
  });
  // sounds and crumbs on the beats
  const at = (s, fn) => g.tweens.wait(t0 + s, fn);
  if (drink) for (const s of [0.5, 0.85, 1.2]) at(s, () => audio.play('gulp', { vol: 0.8 }));
  else if (f.how === 'slurp') {
    at(0.45, () => audio.play('slurp', { vol: 0.8, dur: 0.8 }));
    at(1.35, () => audio.play('slurp', { vol: 0.7, dur: 0.6 }));
    for (const s of [0.4, 0.9, 1.5]) at(s, () => g.effects.puff({ pos: obj.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.07, 0)), count: 2, colors: [0xf8f8f8, 0xe4e4e4], size: 0.03, up: 0.22, gravity: -0.15, life: 1.0 }));
  } else {
    const crumb = f.id === 'puffstick' ? [0xffd23f, 0xe8b830] : f.id.startsWith('oni') ? [0xfaf8f2, 0x1e2a1e] : [0xf4d070, 0xc88440];
    for (const s of [0.45, 0.95, 1.45]) at(s, () => {
      audio.play('bite', { vol: 0.8 });
      g.effects.sparks({ pos: mouth(), count: 5, colors: crumb, speed: 0.4, size: 0.01, star: 0, gravity: 4, life: 0.7, dir: new THREE.Vector3(0, -0.6, 0), spread: 0.8 });
    });
    at(1.75, () => audio.play('munch', { vol: 0.6 }));
  }
  return true;
}

/** Hook food into Held's hint / click (nothing targeted). */
export function installEating(game) {
  const H = game.held;
  if (H._foodHooked) return;
  H._foodHooked = true;
  const hint = H.hint.bind(H), primary = H.primary.bind(H);
  const TOOL_HINT = {
    meal_ticket: (it) => ({ key: '', text: `Meal tickets: ${(it.data.dishes || []).map((d) => FOODS[d]?.name).join(', ')}`, sub: 'Sit at the counter: the master takes them' }),
    watering_can: (it) => ({ key: '', text: `Watering can (${it.data.water ?? 5} / 5)`, sub: 'Click a potted plant to water it · refill at the yard tap' }),
    seeds: () => ({ key: '', text: 'Morning glory seeds', sub: 'Click an empty pot to plant them' }),
    fertiliser: (it) => ({ key: '', text: `Fertiliser (${it.data.uses || 1} scoops)`, sub: 'Click a plant to feed it' }),
  };
  H.hint = () => {
    const it = H.item;
    if (isFood(it) && !H.busy) return foodHint(game, it);
    if (it?.kind === 'tool' && TOOL_HINT[it.data.id] && !H.busy) return TOOL_HINT[it.data.id](it);
    return hint();
  };
  H.primary = () => { if (isFood(H.item) && !H.busy) { consumeHeld(game); return; } primary(); };
}
