// The cinematic moments: short letterboxed camera moves for the beats that matter, all skippable (hold Space / click),
// none of them repeating. Every one is a cutscene script (src/game/Cutscene.js) with eased dollies and orbits, a dutch
// angle where it helps, framing by composition (low angles, a narrow lens for close-ups, the subject on a third),
// subtitle-paced floating lines and an original music sting.
//   first machine    the machine thuds down; a low push-in from the floor, a slow orbit, "No. 1" on a paper card
//   level-ups        the first one, then every fifth: your character strikes the Skyward Finger in front of the shop;
//                    the others get a light beat (letterbox bars snap in and out, a sting) without taking the camera
//   rare pulls       ultra: an impact frame on the figure; secret: the first one ever gets the full showcase (the
//                    frame freezes into an impact panel, then the camera circles the figure hanging in the air in
//                    front of you, ゴゴゴ rising), later ones the impact frame and the lettering
//   end of day / Grandpa's goodbye   music stings (the day summary's event; a cue in the taxi scene)
//   card(title, sub, stamp)  the paper title card these use (a manila tag with a red hanko)
import * as THREE from 'three';
import { V, standIn, freeShot, rollTo, orbit } from './shots.js';
import { sting } from './stings.js';
import { getItem } from '../data/series/index.js';

const _v = new THREE.Vector3(), _q = new THREE.Quaternion();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export class Moments {
  constructor(game, cine) {
    this.game = game;
    this.C = cine;
    this.queue = [];
    const card = this.cardEl = document.createElement('div');
    card.id = 'cine-card';
    document.body.appendChild(card);
    const bars = this.bars = document.createElement('div');
    bars.id = 'cine-bars';
    bars.innerHTML = '<i class="t"></i><i class="b"></i>';
    document.body.appendChild(bars);
    const ev = game.events;
    ev.on('machineBought', (e) => { if (this.game.state.machines.length === 1) this.once('machine', () => this.firstMachine(e.machine)); });
    ev.on('levelUp', (e) => this.levelUp(e));
    ev.on('daySummary', () => sting('dusk', { vol: 0.8 }));
    // the reveal: wrap open (the menacing build-up) and effects (the moment the figure appears)
    const R = game.reveal;
    if (R && !R._cine) {
      R._cine = true;
      const open = R.open.bind(R), effects = R.effects.bind(R);
      R.open = (item) => { if (item?.data?.rarity === 'secret') this.secretBuild(item); return open(item); };
      R.effects = (holder, data, isNew) => { effects(holder, data, isNew); try { this.onReveal(holder, data, isNew); } catch (e) { console.warn(e); } };
    }
  }

  get on() { return this.C.s.on !== false; }

  /** Run fn the first time `key` happens (saved), when cinematics are on. */
  once(key, fn) {
    const f = this.C.s.firsts;
    if (f[key]) return false;
    f[key] = this.game.clock?.day ?? 1;
    if (!this.on) return false;
    fn();
    return true;
  }

  free() {
    const g = this.game;
    return !g.cutscene?.active && !g.talk?.active && !g.pc?.active && !g.uiOpen && !g.cinema?.photo?.active && !g.held?.busy;
  }

  update(dt) {
    if (this.queue.length && this.free()) this.queue.shift()();
    if (this.barT > 0 && (this.barT -= dt) <= 0) this.bars.classList.remove('on');
  }

  // ------------------------------------------------------------------ the paper title card
  card(title, sub = '', stamp = '', hold = 2.6) {
    const el = this.cardEl;
    el.innerHTML = `<div class="cc"><b>${esc(title)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}${stamp ? `<i class="hk">${esc(stamp)}</i>` : ''}</div>`;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    let t = 0;
    return { update: (dt) => { t += dt; if (t >= hold || this.game.cutscene.skipping) { el.classList.remove('show'); return true; } return false; } };
  }

  /** A light beat: the letterbox bars snap in (in steps) and back out, with a sting; the camera stays yours. */
  beat(kind = 'rise', dur = 2.2) {
    if (!this.on) return;
    this.bars.classList.add('on');
    this.barT = dur;
    sting(kind, { vol: 0.85 });
  }

  // ------------------------------------------------------------------ the first machine
  firstMachine(m) {
    const g = this.game;
    if (!m?.root) return;
    const run = () => g.cutscene.play((c) => this.machineScene(c, m), { skippable: true });
    if (g.cutscene.active) this.queue.push(run); else run();
  }

  *machineScene(c, m) {
    const g = this.game;
    const r = m.root, p = r.getWorldPosition(new THREE.Vector3());
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(r.getWorldQuaternion(_q)); fwd.y = 0; fwd.normalize();
    const side = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const at = (f, s, y) => V(p.x + fwd.x * f + side.x * s, y, p.z + fwd.z * f + side.z * s);
    // from the floor as it lands, looking up at it
    yield c.cam({ pos: at(1.25, -0.55, 0.22), look: V(p.x, 1.2, p.z), fov: 44 });
    c.roll = 0.1;
    sting('machine');
    yield c.all(c.cam({ pos: at(1.05, -0.45, 0.3), look: V(p.x, 1.05, p.z), dur: 1.4 }), rollTo(c, 0.04, 1.4));
    // a slow orbit round the front, rising to eye level
    yield c.all(orbit(c, { center: V(p.x, 0, p.z), radius: 1.35, from: Math.atan2(fwd.x - side.x * 0.45, fwd.z - side.z * 0.45), to: Math.atan2(fwd.x + side.x * 0.5, fwd.z + side.z * 0.5), height: 0.7, lift: 0.75, look: V(p.x, 1.0, p.z), dur: 3.0, fov: 40 }), rollTo(c, 0, 1.5));
    this.game.jojo?.kana.spawn({ kind: 'don', at: V(p.x, 1.9, p.z), dur: 1.8, sound: false });
    yield c.all(this.card('Machine No. 1', 'Grandpa\'s garage is a gacha shop again', '祝'), c.cam({ pos: at(1.55, 0.35, 1.45), look: V(p.x, 1.1, p.z), dur: 2.6, fov: 36 }));
    yield c.toPlayer(0.8);
  }

  // ------------------------------------------------------------------ level ups
  levelUp({ level }) {
    if (!this.on) return;
    const big = level === 2 || level % 5 === 0;
    if (!big) { this.beat('rise'); return; }
    this.queue.push(() => {
      const g = this.game;
      if (!this.free()) { this.beat('rise'); return; }
      g.cutscene.play((c) => this.levelScene(c, level), { skippable: true });
    });
  }

  *levelScene(c, level) {
    const g = this.game, P = g.player, S = standIn(g);
    if (!S) return;
    const feet = V(P.pos.x, 0, P.pos.z), yaw = P.yaw + Math.PI;
    S.show(feet, yaw);
    c.every((dt) => S.update(dt, c.game.camera.position));
    const shot = freeShot(g, feet, yaw, { angles: [0.45, -0.45, 0.85, -0.85, 0, 1.3, -1.3], dists: [2.6, 2.1, 1.7, 1.3], height: 1.9, lookY: 1.2 });
    // up and out of your eyes to a high front angle, then down low as the pose snaps in
    yield c.cam({ pos: shot.pos, look: shot.look, dur: 0.7, fov: 52 });
    S.h.gesture('pose_tower', { hold: true });
    sting('rise');
    const low = shot.pos.clone().lerp(shot.look, 0.18); low.y = 0.55;
    yield c.all(c.cam({ pos: low, look: V(feet.x, 1.45, feet.z), dur: 0.55, fov: 42 }), rollTo(c, shot.angle > 0 ? -0.12 : 0.12, 0.55));
    g.jojo?.kana.spawn({ kind: 'go', at: S.h, n: 3, dur: 2.8, side: shot.angle > 0 ? 1 : -1, sound: false });
    yield c.all(this.card(`Level ${level}`, 'The shop levels up', '昇', 2.4), c.cam({ pos: low.clone().lerp(V(feet.x, 1.3, feet.z), 0.12), look: V(feet.x, 1.5, feet.z), dur: 2.4, fov: 36 }));
    yield c.all(c.toPlayer(0.6), rollTo(c, 0, 0.5));
    S.hide();
  }

  // ------------------------------------------------------------------ rare pulls
  secretBuild(item) {
    const g = this.game;
    sting('menace', { vol: 0.9 });
    g.jojo?.kana.spawn({ kind: 'go', at: () => item.obj?.getWorldPosition(_v), n: 3, dur: 2.2, side: -1, sound: false, size: 0.6 });
  }

  onReveal(holder, data, isNew) {
    const g = this.game, J = g.jojo, r = data.rarity;
    if (!J) return;
    const pos = () => holder.getWorldPosition(_v);
    if (r === 'rare' && isNew) J.kana.spawn({ kind: 'go', at: pos, n: 2, dur: 1.6, size: 0.45, sound: false });
    if (r === 'ultra') {
      sting('reveal', { delay: 0.4 });
      g.tweens.wait(0.45, () => { J.impact.frame({ at: holder.getWorldPosition(new THREE.Vector3()), palette: ['ice', 'violet'], dur: 0.45, clear: 0.12, freeze: false }); J.kana.spawn({ kind: 'do', at: pos, n: 3, dur: 2.2, size: 0.5, sound: false }); });
    }
    if (r !== 'secret') return;
    sting('secret');
    const first = !this.C.s.firsts.secret && this.on;
    J.impact.frame({ at: holder.getWorldPosition(new THREE.Vector3()), palette: ['violet', 'blood', 'acid'], dur: first ? 0.95 : 0.8, clear: 0.1 });
    J.kana.spawn({ kind: 'ban', screen: [0.5, 0.2], dur: 2.0, sound: false });
    if (!first) return;
    this.C.s.firsts.secret = g.clock?.day ?? 1;
    g.tweens.wait(1.0, () => { if (!g.cutscene.active && !g.talk?.active) g.cutscene.play((c) => this.showcase(c, holder, data), { skippable: true }).then(() => { this._restore?.(); this._restore = null; }); });
  }

  /** The figure hangs in the air where you held it; the camera circles it. */
  *showcase(c, holder, data) {
    const g = this.game, A = g.held.anchor, cam = g.camera;
    const it = getItem(data.key);
    // the hands' anchor stays where it is in the world while the camera leaves (it rides a stand-in for the camera)
    const proxy = new THREE.Object3D();
    cam.getWorldPosition(proxy.position); cam.getWorldQuaternion(proxy.quaternion);
    g.scene.add(proxy);
    const parent = A.parent;
    proxy.add(A);
    proxy.updateMatrixWorld(true);
    c.every(() => { A.visible = true; });
    const restore = this._restore = () => { if (A.parent === proxy) parent.add(A); g.scene.remove(proxy); };
    {
      const f = holder.getWorldPosition(new THREE.Vector3());
      const eye = cam.position.clone();
      const d0 = Math.max(0.3, Math.hypot(eye.x - f.x, eye.z - f.z));
      const a0 = Math.atan2(eye.x - f.x, eye.z - f.z);
      g.jojo.kana.spawn({ kind: 'go', screen: [0.1, 0.78], n: 4, dur: 4.2, side: 1, sound: false });
      g.jojo.kana.spawn({ kind: 'go', screen: [0.86, 0.66], n: 4, dur: 4.2, side: -1, sound: false, delay: 0.3 });
      let k = 0;
      c.every((dt) => { k += dt; if (Math.random() < dt * 6) g.effects.sparks({ pos: f, count: 2, colors: [0xffd23f, 0xffffff], speed: 0.25, size: 0.008, life: 0.8, gravity: -0.1, radius: 0.12, star: 1 }); });
      yield c.all(orbit(c, { center: f, radius: d0 * 1.15, from: a0, to: a0 + 2.5, height: f.y - 0.06, lift: 0.1, look: f, dur: 3.8, fov: 30 }), rollTo(c, -0.08, 1.2),
        this.card(it?.name || 'Secret', 'SECRET · 1 in 500', '秘', 3.4));
      yield c.all(c.toPlayer(0.8), rollTo(c, 0, 0.6));
    }
    restore();
  }
}
