// Your room: #102 at SAKURA HEIGHTS, the middle door on the ground floor (through the yard gate). A six-mat room with a
// kitchen strip (src/places/room/roomBuild.js builds it, off the map; it only exists while you're in it). The futon by the wall:
// slept in every morning, made with a little tug (hold LMB: a small energy bonus, "tidy" for the morning), slept in at
// night (the day's summary over the dark room, then the morning in bed), or a nap in the daytime. A sofa to rest on, a
// mini fridge for food you bring home, the window onto the lane (it gets dark with the evening), the ceiling lamp on
// its switch, the figure shelf over the desk for your best pulls, and a few spots where furniture from the catalogue
// can go (carry its box in and click the floor).
//   game.places.room = { enter(), sleep(), makeBed(), fridge, ... }      save: game.state.room (ensureState)
import * as THREE from 'three';
import { audio } from '../../core/audio.js';
import { ensureState } from '../../game/stateExt.js';
import { buildRoomDetailed, ROOM } from './roomBuild.js';
import { makeItemMesh } from '../../game/collectibles.js';
import { makeToolMesh } from '../../game/Held.js';
import { FURNITURE } from '../../build/catalogue.js';
import { FOODS } from '../../needs/foods.js';
import { summaryHTML, WAKE_HOUR } from '../../sim/summary.js';
import { prop, hitBox } from '../util.js';
import { convertAll } from '../ikit.js';
import { yen } from '../money.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ORIGIN = V(80, 0, -80); // the reserved zone x 70..90, z -90..-70
const DOOR = { x: 19.95, z: 2.2 }; // apartment 102's front door on the lane side
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const smooth = (k) => k * k * (3 - 2 * k);

export class Room {
  constructor(game, places) {
    this.game = game;
    this.places = places;
    this.s = ensureState(game, 'room', { v: 1, made: false, madeDay: 0, lamp: true, fridge: ['purin', 'oni_shake', 'vd_mugi'], figs: [], decor: [], slept: 0 });
    const g = game;
    const group = this.group = new THREE.Group();
    group.name = 'room102';
    group.position.copy(ORIGIN);
    g.scene.add(group);
    this.R = buildRoomDetailed(g, group, places);
    group.updateMatrixWorld(true);
    this.interiorMats();
    this.buildBed();
    this.buildTargets();
    this.buildDoorOutside();
    this.restoreFigs();
    places.add({
      id: 'room', name: 'Room 102', group,
      spawn: this.w(-0.35, 0, 1.05, 0), exit: { x: DOOR.x, z: DOOR.z + 0.75, yaw: Math.PI },
      lamp: { ...this.w(0, 2.15, -0.85), color: 0xffe2b8, intensity: 2.4, k: 1 },
      far: 30,
      onEnter: () => this.onEnter(), onExit: () => this.onExit(), update: (dt) => this.tick(dt),
    });
    this.applyLamp();
    for (const o of this.R.obstacles) g.player.addObstacle(o[0] + ORIGIN.x, o[1] + ORIGIN.x, o[2] + ORIGIN.z, o[3] + ORIGIN.z);
    g.events.on('daySummary', (d) => { this.endedDay = d.day; });
    g.events.on('newDay', () => { this.s.made = false; });
  }

  /** room-local -> world */
  w(x, y, z, yaw) { const p = { x: x + ORIGIN.x, y, z: z + ORIGIN.z }; if (yaw !== undefined) p.yaw = yaw; return p; }
  wv(x, y, z) { return V(x + ORIGIN.x, y, z + ORIGIN.z); }

  /** No sunlight in here: the builder gives every material its interior variant (lit by the ceiling lamp); the washi
   *  pendant's paper is self-lit while the lamp is on. */
  interiorMats() {
    const L = this.R.lamp;
    this.lampMats = { on: L?.on, off: L?.off };
  }

  // ------------------------------------------------------------------ the futon
  buildBed() {
    const f = this.R.futonAt, P = this.places, conv = P._ikConv ||= (m) => P.mat(m);
    this.bed = { base: prop('bed_base', null, f.x, 0, f.z), made: prop('bed_duvet_made', null, f.x, 0, f.z), messy: prop('bed_duvet_messy', null, f.x, 0, f.z) };
    for (const m of Object.values(this.bed)) this.group.add(convertAll(m, conv));
    this.showBed();
    const hb = hitBox(1.0, 0.3, 2.0, f.x, 0.15, f.z);
    this.group.add(hb);
    this.game.interaction.add(hb, {
      reach: 2.4,
      hint: () => this.bedHint(),
      use: () => this.bedUse(),
      hold: {
        canStart: () => !this.s.made && !this.night(),
        start: () => { this.making = { t: 0 }; audio.play('futon', { vol: 0.7 }); },
        update: (dt) => this.makeStep(dt),
        done: () => this.s.made,
        end: () => { if (!this.s.made) this.showBed(); this.making = null; },
      },
    });
  }
  showBed() {
    const B = this.bed;
    B.made.visible = this.s.made; B.messy.visible = !this.s.made;
    B.messy.position.set(this.R.futonAt.x, 0, this.R.futonAt.z); B.messy.scale.setScalar(1);
  }
  night() { const h = this.game.clock?.hours ?? 12; return h >= 20 || h < 5; }
  bedHint() {
    const g = this.game;
    if (this.night()) return { key: 'LMB', text: 'Go to sleep', sub: g.needs ? `Energy ${Math.round(g.needs.energy)} / ${g.needs.max}` : '' };
    if (!this.s.made) return { key: 'Hold LMB', text: 'Make the bed', sub: 'Pull the comforter straight: a tidy start to the day' };
    return { key: 'LMB', text: 'Take a nap', sub: '2 hours. Energy back up a bit' };
  }
  bedUse() {
    if (this.night()) { this.sleep(); return false; }
    if (this.s.made) { this.nap(); return false; }
    return true; // starts the hold
  }
  makeStep(dt) {
    const M = this.making, B = this.bed, f = this.R.futonAt;
    if (!M || this.s.made) return;
    M.t += dt;
    const k = Math.min(1, M.t / 1.3);
    // the heap pulled across and smoothed: it sinks and spreads while it slides over the mattress
    B.messy.position.set(f.x - 0.06 * Math.sin(k * Math.PI), 0, f.z + 0.04 * Math.sin(k * 6));
    B.messy.scale.set(1 + 0.04 * k, 1 - 0.55 * smooth(k), 1);
    if (Math.floor(M.t * 3) !== Math.floor((M.t - dt) * 3)) audio.play('futon', { vol: 0.35 });
    if (k >= 1) {
      this.s.made = true; this.s.madeDay = this.game.clock?.day ?? 1;
      this.showBed();
      const g = this.game;
      g.effects.puff({ pos: this.wv(f.x, 0.25, f.z), count: 6, colors: [0xf4efe4, 0xd8e0f0], size: 0.06, up: 0.15, radius: 0.5 });
      audio.play('task', { vol: 0.4 });
      g.needs?.add(5, 'bed');
      g.needs?.buff('tidy', 240, 1);
      g.monologue?.say(pick(['There. A proper start to the day.', 'Grandpa would be proud.', 'Neat. Now, coffee.']), { force: true });
      g.events.emit('bedMade', { day: this.s.madeDay });
      g.save();
    }
  }

  // ------------------------------------------------------------------ sleeping
  /** Night: lie down, the day's summary over the dark room, morning in bed. */
  sleep() {
    const g = this.game, c = g.clock;
    if (g.cutscene.active || this.sleeping) return;
    const h = c?.hours ?? 22;
    const dayOf = h < 6 ? (c.day - 1) : c.day;
    this.sleeping = true;
    if (g.life?.signOpen) g.monologue?.say('The OPEN sign is still up at the shop... too late now.', { force: true });
    if (this.endedDay !== dayOf && g.sim && g.story?.done && !g.visiting) { g.sim.endDay('sleep'); return; } // -> sleepSummary
    this.sleepScene(null);
  }
  /** Called through game.sim.onSummary (src/plugins/needs.js) when the day ends in bed. */
  sleepSummary(data) { this.endedDay = data.day; this.sleepScene(data); }

  sleepScene(data) {
    const g = this.game, f = this.R.futonAt, self = this;
    const pillow = this.wv(f.x, 0.42, f.z - 0.78), ceil = this.wv(f.x + 0.1, 2.3, f.z - 0.4);
    g.cutscene.play(function* (c) {
      // lie down, look at the ceiling, lamp off
      yield c.cam({ pos: g.camera.position.clone(), look: self.wv(f.x, 0.3, f.z), dur: 0.01 });
      yield c.cam({ pos: pillow, look: ceil, dur: 1.4, fov: 64 });
      audio.play('futon', { vol: 0.7 });
      self.s.made = false; self.showBed();
      yield c.wait(0.4);
      if (self.s.lamp) { audio.play('switchClick', { vol: 0.5 }); self.s.lamp = false; self.applyLamp(); }
      yield c.wait(0.8);
      yield c.fade(1, 1.4);
      if (data) yield* self.summaryCard(c, data);
      // the night
      g.needs && (g.needs.inBed = true);
      const ch = g.clock;
      ch.skipTo(WAKE_HOUR, { nextDay: ch.hours >= WAKE_HOUR });
      g.lighting?.refresh(); g.lighting?.update(0, g.time);
      self.s.slept = (self.s.slept || 0) + 1;
      self.s.lamp = false; self.applyLamp();
      audio.play('snore', { vol: 0.4 });
      yield c.wait(1.2);
      // morning: eyes open on the ceiling, sit up
      const d = g.calendar?.dateOf(ch.day);
      yield c.fade(0, 1.6);
      audio.play('furin', { vol: 0.5 });
      yield c.wait(0.6);
      yield c.cam({ pos: self.wv(f.x + 0.15, 0.95, f.z - 0.2), look: self.wv(f.x + 1.6, 1.0, f.z - 0.4), dur: 1.4 });
      g.player.pos.set(f.x + ORIGIN.x + 0.75, 0, f.z + ORIGIN.z + 0.1);
      g.player.yaw = -Math.PI / 2 + 0.3; g.player.pitch = -0.1;
      yield c.toPlayer(0.9);
      const head = g.calendar?.headline(ch.day) || [];
      if (d) yield c.title(`Day ${ch.day}`, `${d.weekdayName}, ${d.monthName} ${d.date}${head.length ? ' - ' + head[0].name : ''}`, 1.8);
    }, { skippable: true }).then(() => {
      this.sleeping = false;
      const N = g.needs;
      if (N?.hangover > 0.2) g.monologue?.say(pick(['Ugh. My head.', 'Why did I drink that much...', 'Water... sports drink... anything...']), { force: true });
      else g.monologue?.say(pick(['Morning. Bed first, then the shop.', 'Slept like a rock.', 'New day. Let\'s make the bed.']), { force: true });
      g.save();
    });
  }

  /** The day's numbers over black (the same card as the sunset fly-out), with one button: sleep. */
  *summaryCard(c, data) {
    const g = this.game;
    let el = document.getElementById('daysum');
    if (!el) { el = document.createElement('div'); el.id = 'daysum'; document.body.appendChild(el); }
    el.innerHTML = summaryHTML(g, data).replace(/<div class="ds-btns">[\s\S]*?<\/div><\/div>$/, '<div class="ds-btns"><button data-v="sleep">Good night<kbd>1</kbd></button></div></div>');
    el.classList.add('on');
    requestAnimationFrame(() => el.classList.add('show'));
    const prevUi = g.uiOpen;
    g.uiOpen = true;
    g.input.unlock?.();
    let done = false;
    const go = () => { if (done) return; done = true; try { audio.play('uiClick', { vol: 0.6 }); } catch { /* */ } g.input.lock?.(); };
    el.querySelectorAll('button').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); go(); }));
    const onKey = (e) => { if (e.code === 'Digit1' || e.code === 'Enter' || e.code === 'Space' || e.code === 'Escape') go(); };
    window.addEventListener('keydown', onKey);
    yield c.until(() => done || c.skipping);
    window.removeEventListener('keydown', onKey);
    el.classList.remove('show');
    setTimeout(() => el.classList.remove('on'), 400);
    g.uiOpen = prevUi;
    if (!g.input.locked) g.input.lock?.();
  }

  /** Daytime: two hours on the futon. */
  nap() {
    const g = this.game, f = this.R.futonAt, self = this;
    if (g.cutscene.active) return;
    g.cutscene.play(function* (c) {
      yield c.cam({ pos: self.wv(f.x, 0.42, f.z - 0.78), look: self.wv(f.x + 0.1, 2.3, f.z - 0.4), dur: 1.2, fov: 64 });
      audio.play('futon', { vol: 0.6 });
      yield c.fade(1, 1.0);
      g.clock?.advance(120);
      g.needs?.add(28, 'nap');
      if (g.needs?.has('sleepy')) g.needs.clear('sleepy');
      g.lighting?.refresh();
      yield c.wait(0.6);
      yield c.fade(0, 1.0);
      yield c.toPlayer(0.8);
    }).then(() => { g.monologue?.say(pick(['Ahh. Better.', 'Power nap.', 'Two hours gone. Worth it.']), { force: true }); });
  }

  // ------------------------------------------------------------------ everything else you can touch
  buildTargets() {
    const g = this.game, R = this.R, T = R.targets;
    const add = (obj, h) => { g.interaction.add(obj, h); return obj; };
    // the front door: back out to the lane
    add(T.door, { reach: 2.2, hint: () => ({ key: 'LMB', text: 'Go outside', sub: 'Sakura Heights #102' }), use: () => { this.places.exit({ sound: 'lockClick' }); return false; } });
    // the light switch by the door
    const sw = hitBox(0.12, 0.16, 0.06, -0.62, 1.15, ROOM.z1 - 0.02);
    this.group.add(sw);
    add(sw, { reach: 2.2, hint: () => ({ key: 'LMB', text: this.s.lamp ? 'Lights off' : 'Lights on' }), use: () => { this.s.lamp = !this.s.lamp; this.applyLamp(); audio.play('switchClick', { vol: 0.6 }); return false; } });
    // the sofa
    const so = R.sofaAt;
    const sh = hitBox(0.5, 0.45, 0.8, so.x, 0.25, so.z);
    this.group.add(sh);
    add(sh, { reach: 2.2, hint: () => (this.places.seat ? null : { key: 'LMB', text: 'Sit on the sofa', sub: 'Rest: energy comes back slowly (walk to stand up)' }), use: () => { this.places.sitAt({ pos: this.wv(so.x - 0.05, 0, so.z), yaw: Math.PI / 2, eye: 1.08, rest: 1.6 }); audio.play('sigh', { vol: 0.5 }); return false; } });
    // the mini fridge
    const fr = R.props.fridge;
    if (fr) add(fr, { reach: 2.2, hint: () => this.fridgeHint(), use: () => { this.fridgeUse(); return false; } });
    // the window
    add(T.window, { reach: 3, hint: () => ({ key: '', text: 'The lane, from your window', sub: this.night() ? 'Lamps on, the shop shutters down' : 'Laundry poles and the evening light' }), use: () => false });
    // the old computer and the figure shelf
    if (T.pc) add(T.pc, { reach: 2, hint: () => ({ key: '', text: 'Your old computer', sub: 'Mostly a shelf now. The real one is at the shop.' }), use: () => false });
    if (T.figShelf) add(T.figShelf, { reach: 2.4, hint: (held) => this.shelfHint(held), use: (held) => { this.shelfUse(held); return false; } });
    // a few floor spots for furniture from the catalogue (carry the box in)
    this.spots = [[0.75, 0, 1.0, Math.PI], [-0.35, 0, -1.85, 0], [0.25, 0, -0.1, Math.PI]].map(([x, y, z, rot], i) => ({ i, x, y, z, rot }));
    const floor = hitBox(3.5, 0.02, 4.3, 0, 0.0, 0);
    this.group.add(floor);
    add(floor, { reach: 2.6, hint: (held) => this.spotHint(held), use: (held, hit) => { this.spotUse(held, hit); return false; } });
  }

  buildDoorOutside() {
    const g = this.game;
    const hb = hitBox(0.95, 2.0, 0.12, DOOR.x, 0.4 + 1.0, DOOR.z + 0.08);
    g.scene.add(hb);
    this.places.door(hb, { to: 'room', text: 'Your room (102)', sub: 'Sakura Heights', reach: 2.2 });
    // a little name card on the door
    const c = document.createElement('canvas'); c.width = 32; c.height = 12;
    const x = c.getContext('2d'); x.fillStyle = '#f4f0e4'; x.fillRect(0, 0, 32, 12); x.fillStyle = '#2a2a3a';
    x.font = '10px "DotGothic16"'; x.textBaseline = 'top'; x.fillText('102', 6, 1);
    const tex = new THREE.CanvasTexture(c); tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.colorSpace = THREE.SRGBColorSpace;
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.06), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
    plate.position.set(DOOR.x + 0.27, 1.95, DOOR.z + 0.056);
    g.scene.add(plate);
  }

  applyLamp() {
    const L = this.places.list.room?.lamp;
    if (L) L.k = this.s.lamp ? 1 : 0;
    if (this.R.lamp) this.R.lamp.mesh.material = this.s.lamp ? this.lampMats.on : this.lampMats.off;
  }

  // ------------------------------------------------------------------ fridge
  fridgeHint() {
    const H = this.game.held, it = H.item, F = this.s.fridge;
    if (it?.kind === 'tool' && FOODS[it.data.id] && !H.busy) return { key: 'LMB', text: `Put the ${FOODS[it.data.id].name} in the fridge`, sub: `${F.length} / 8 inside` };
    if (!F.length) return { key: '', text: 'Mini fridge', sub: 'Empty. Bring food home from Mikawa-ya.' };
    if (!H.canTake()) return { key: '', text: 'Mini fridge', sub: 'Your hands are full' };
    return { key: 'LMB', text: `Take the ${FOODS[F[F.length - 1]]?.name || 'food'}`, sub: `${F.length} inside: ${F.map((id) => FOODS[id]?.name).join(', ')}` };
  }
  fridgeUse() {
    const g = this.game, H = g.held, it = H.item, F = this.s.fridge;
    const fr = this.R.props.fridge, at = fr.getWorldPosition(new THREE.Vector3()).add(V(0, 0.6, 0.2));
    audio.play('drawer', { vol: 0.5 });
    if (it?.kind === 'tool' && FOODS[it.data.id] && !H.busy) {
      if (F.length >= 8) { g.news('The fridge is full'); return; }
      F.push(it.data.id);
      H.putTo(at, new THREE.Quaternion(), (obj) => obj.parent?.remove(obj), { dur: 0.35 });
      g.save();
      return;
    }
    if (!F.length || !H.canTake()) return;
    const id = F.pop();
    const obj = makeToolMesh(id);
    obj.position.copy(at);
    g.scene.add(obj);
    H.take('tool', { id }, obj);
    g.save();
  }

  // ------------------------------------------------------------------ the figure shelf (your best pulls on display)
  slotWorld(i) { const p = this.R.figSlots[i]; return this.wv(p.x, p.y, p.z); }
  restoreFigs() {
    this.figMeshes = [];
    for (let i = 0; i < this.s.figs.length; i++) this.showFig(i);
  }
  showFig(i) {
    const d = this.s.figs[i];
    if (!d) return;
    const m = makeItemMesh(d.key, d.finish);
    const p = this.R.figSlots[i];
    m.position.set(p.x, p.y, p.z);
    m.rotation.y = -Math.PI / 2;
    m.scale.multiplyScalar(0.75);
    this.group.add(m);
    this.figMeshes[i] = m;
  }
  shelfHint(held) {
    const H = this.game.held, it = H.item;
    const n = this.s.figs.length, max = this.R.figSlots.length;
    if (it?.kind === 'toy') return n >= max ? { key: '', text: 'Figure shelf', sub: 'Full' } : { key: 'LMB', text: 'Put it on your shelf', sub: `${n} / ${max}. Just for you: not for sale` };
    if (n && H.canTake()) return { key: 'LMB', text: 'Take a figure down', sub: `${n} on the shelf` };
    void held;
    return { key: '', text: 'Figure shelf', sub: n ? `${n} figures` : 'Bring a figure home to put it here' };
  }
  shelfUse() {
    const g = this.game, H = g.held, it = H.item;
    if (it?.kind === 'toy') {
      const i = this.s.figs.length;
      if (i >= this.R.figSlots.length) return;
      const d = { key: it.data.key, finish: it.data.finish };
      H.putTo(this.slotWorld(i), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -Math.PI / 2, 0)), (obj) => { obj.parent?.remove(obj); this.s.figs.push(d); this.showFig(i); audio.play('place', { vol: 0.6 }); g.save(); }, { dur: 0.4 });
      return;
    }
    if (!this.s.figs.length || !H.canTake()) return;
    const i = this.s.figs.length - 1, d = this.s.figs.pop();
    const m = this.figMeshes[i];
    const holder = new THREE.Group();
    holder.add(makeItemMesh(d.key, d.finish));
    holder.position.copy(m ? m.getWorldPosition(new THREE.Vector3()) : this.slotWorld(i));
    m?.parent?.remove(m);
    g.scene.add(holder);
    H.take('toy', { key: d.key, finish: d.finish }, holder);
    g.save();
  }

  // ------------------------------------------------------------------ furniture from the catalogue
  isFurn(it) { return it?.kind === 'box' && it.data?.type === 'furniture' && !!FURNITURE[it.data.id]; }
  freeSpot(hit) {
    const used = new Set((this.s.decor || []).map((d) => d.spot));
    let best = null, bd = 9;
    const lp = hit ? this.group.worldToLocal(hit.point.clone()) : null;
    for (const s of this.spots) { if (used.has(s.i)) continue; const d = lp ? Math.hypot(lp.x - s.x, lp.z - s.z) : 0; if (d < bd) { bd = d; best = s; } }
    return best;
  }
  spotHint(held) {
    const it = this.game.held.item;
    if (!this.isFurn(it) || !this.game.decor) return null;
    const def = FURNITURE[it.data.id];
    if (def.mount !== 'floor') return { key: '', text: def.name, sub: 'Only floor furniture fits the spots in here' };
    const s = this.freeSpot(null);
    return s ? { key: 'LMB', text: `Put the ${def.name} here`, sub: 'One of the free spots in your room' } : { key: '', text: 'No space left', sub: 'Pack something up first (RMB on it)' };
  }
  spotUse(held, hit) {
    const g = this.game, H = g.held, it = H.item;
    if (!this.isFurn(it) || !g.decor) return;
    const def = FURNITURE[it.data.id];
    if (def.mount !== 'floor') return;
    const s = this.freeSpot(hit);
    if (!s) return;
    const data = it.data;
    const pos = this.wv(s.x, s.y, s.z);
    H.putTo(pos.clone().setY(0.3), new THREE.Quaternion(), (obj) => {
      obj.parent?.remove(obj);
      const p = g.decor.place(data.id, { x: pos.x, y: 0, z: pos.z, rot: s.rot }, { uid: data.uid, st: data.st });
      if (p) { (this.s.decor ||= []).push({ uid: p.data.uid, spot: s.i }); audio.play('place', { vol: 0.7 }); g.events.emit('roomDecor', { id: data.id }); }
      g.save();
    }, { dur: 0.4 });
  }
  /** Pieces in the room are part of game.decor; keep the spot list in step when they are packed up. */
  syncDecor() {
    const D = this.game.decor;
    if (!D) return;
    this.s.decor = (this.s.decor || []).filter((d) => D.pieces.has(d.uid));
    for (const d of this.s.decor) { const p = D.pieces.get(d.uid); if (p) p.root.visible = this.places.where === 'room'; }
  }

  // ------------------------------------------------------------------ per frame
  onEnter() {
    const g = this.game;
    this.syncDecor();
    this.lightView();
    if (!this.s.made && !this.night()) g.tweens.wait(1.2, () => g.tip?.('makebed', 'The futon is a mess', 'Hold LMB on it to make the bed'));
  }
  onExit() { this.syncDecor(); }
  lightView() {
    const day = this.game.clock?.daylight?.() ?? 1;
    const k = 0.3 + 0.7 * day;
    for (const m of this.R.view?.mats || []) m.color.setRGB(k, k * (0.92 + 0.08 * day), k * (0.85 + 0.15 * day));
    if (this.R.curtMat) this.R.curtMat.emissiveIntensity = 0.12 * day;
  }
  tick(dt) {
    this.viewT = (this.viewT || 0) - dt;
    if (this.viewT <= 0) { this.viewT = 3; this.lightView(); }
  }
  update() {
    if (this.places.where !== 'room' && (this.s.decor?.length) && !this._hid) { this._hid = true; this.syncDecor(); }
    if (this.places.where === 'room') this._hid = false;
  }
}
export { yen as _yen };
