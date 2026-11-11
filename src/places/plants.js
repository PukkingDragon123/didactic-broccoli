// Potted plants that live: a morning glory on your windowsill, a cactus on the desk, a tomato by your door at Sakura
// Heights (plus any plant you put in the shop from the furniture catalogue). They grow a stage a day when they've had
// water and light (seed, sprout, young, grown, flowering / fruiting), dry out over the day, wilt after a dry day (the
// leaves droop and go yellow-brown) and die if you forget them for good. The watering can (Mikawa-ya, or the one by
// your door) holds a few pours; refill it at the yard tap. Seeds go into an empty pot, fertiliser
// speeds a plant up. Dr. Kusaka's lessons ('plantLesson' events) unlock care tips in the hints and fertiliser at
// Mikawa-ya. Morning glories open in the morning only.
//   game.places.plants = { pots, water(pot), lessons }   save: game.state.plants (ensureState)
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { ensureState } from '../game/stateExt.js';
import { propMesh } from '../world/props.js';
import { FEATURES } from '../build/features.js';
import { hitBox } from './util.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const SPECIES = {
  asagao: { name: 'Morning glory', thirst: 0.55, need: 0.3, sun: 0.8 },
  tomato: { name: 'Tomato', thirst: 0.6, need: 0.35, sun: 0.9 },
  cactus: { name: 'Cactus', thirst: 0.12, need: 0.05, sun: 0.6, slow: 0.5 },
};
const STAGE = ['seed', 'sprout', 'young', 'grown', 'flowering'];
const ROOM_O = V(80, 0, -80);
const CAN_MAX = 5;

export class Plants {
  constructor(game, places) {
    this.game = game;
    this.places = places;
    this.s = ensureState(game, 'plants', { v: 1, lessons: {}, pots: [
      { spot: 'sill', species: 'asagao', growth: 1.2, water: 0.7, health: 1, fert: 0, dead: false },
      { spot: 'desk', species: 'cactus', growth: 2.1, water: 0.5, health: 1, fert: 0, dead: false },
      { spot: 'yard', species: 'tomato', growth: 1.0, water: 0.5, health: 1, fert: 0, dead: false },
    ], canGiven: false });
    this.pots = [];
    const room = places.room;
    // where the pots stand: the window sill (bright), the desk (half shade), the corridor by your door (full sun)
    this.SPOTS = {
      sill: { parent: room?.group, x: -0.62, y: 0.765, z: -2.18, sun: 1.0, label: 'on your windowsill' },
      desk: { parent: room?.group, x: 1.56, y: 0.72, z: -2.0, sun: 0.45, label: 'on your desk' },
      yard: { parent: null, x: 19.32, y: 0, z: 2.62, sun: 1.0, label: 'by your door', world: true },
    };
    for (const d of this.s.pots) this.makePot(d);
    // the watering can that lives by your door, the yard tap
    this.buildTap();
    const ev = game.events;
    ev.on('newDay', (e) => this.newDay(e));
    ev.on('plantLesson', (e) => this.lesson(e));
    this.hookDecorPlants();
    this.t = 0;
  }

  // ------------------------------------------------------------------ pots
  makePot(d) {
    const g = this.game, sp = this.SPOTS[d.spot];
    if (!sp) return;
    const holder = new THREE.Group();
    if (sp.world) holder.position.set(sp.x, sp.y, sp.z);
    else holder.position.set(sp.x, sp.y, sp.z);
    (sp.parent || g.scene).add(holder);
    const pot = { d, sp, holder, mesh: null, key: '', mats: null };
    const hb = hitBox(0.22, 0.42, 0.22, 0, 0.2, 0);
    holder.add(hb);
    g.interaction.add(hb, { reach: 2.2, hint: (held) => this.hint(pot, held), use: () => { this.use(pot); return false; } });
    this.pots.push(pot);
    this.refresh(pot);
  }

  stage(d) { return Math.max(0, Math.min(4, Math.floor(d.growth))); }
  shownStage(d) {
    let st = this.stage(d);
    // morning glories open in the morning only
    if (d.species === 'asagao' && st === 4) { const h = this.game.clock?.hours ?? 9; if (h > 12 || h < 5) st = 3; }
    return st;
  }

  refresh(pot) {
    const d = pot.d, st = this.shownStage(d);
    const key = `${d.species}:${st}:${d.dead ? 'x' : d.health < 0.5 ? 'w' : 'ok'}`;
    if (pot.key === key && pot.mesh) return;
    pot.key = key;
    pot.mesh?.parent?.remove(pot.mesh);
    const m = propMesh(d.empty ? 'plant_asagao_0' : `plant_${d.species}_${d.dead ? Math.min(st, 2) : st}`, { castShadow: false });
    const indoor = !pot.sp.world;
    let mats = indoor && this.places ? this.places.voxel() : m.material;
    // wilting: a drier, yellower, then brown cast (a tinted copy of the materials), drooping
    if (d.dead || d.health < 0.5) {
      mats = mats.map((x) => { if (!x.isMeshStandardMaterial) return x; const c = x.clone(); c.color = new THREE.Color(d.dead ? 0x7a5a3a : 0xb8a868); if (x.onBeforeCompile) { c.onBeforeCompile = x.onBeforeCompile; c.customProgramCacheKey = x.customProgramCacheKey; } return c; });
      m.rotation.z = d.dead ? 0.12 : 0.06;
    }
    m.material = mats;
    pot.holder.add(m);
    pot.mesh = m;
  }

  status(d) {
    const sp = SPECIES[d.species];
    if (d.empty) return 'An empty pot';
    if (d.dead) return `A dead ${sp.name.toLowerCase()}`;
    const w = d.water > 0.85 ? 'soggy' : d.water > 0.45 ? 'moist' : d.water > 0.15 ? 'drying out' : 'bone dry';
    return `${sp.name}, ${STAGE[this.stage(d)]}${d.health < 0.5 ? ' (wilting)' : ''} · soil ${w}`;
  }
  tip(pot) {
    const d = pot.d, L = this.s.lessons, sp = SPECIES[d.species];
    if (!L.water && !L.survey) return '';
    if (d.dead) return 'Pull it out and plant something new';
    if (d.water > 0.85 && d.species === 'cactus') return 'Tip: too wet, a cactus rots. Leave it be';
    if (d.water > 0.85) return 'Tip: soggy roots rot. Skip a day';
    if (d.water < sp.need + 0.1) { const h = this.game.clock?.hours ?? 9; return h >= 11 && h < 15 ? 'Tip: water it in the morning, not at noon' : 'Tip: it needs water'; }
    if (pot.sp.sun < sp.sun) return 'Tip: it wants more light than this';
    return d.fert > 0 ? 'Fertilised: growing fast' : 'Happy. Water it each morning';
  }

  hint(pot) {
    const H = this.game.held, it = H.item, d = pot.d;
    const sub = [this.tip(pot)].filter(Boolean).join('');
    if (it?.kind === 'tool' && it.data.id === 'watering_can' && !d.dead && !d.empty) {
      const left = it.data.water ?? CAN_MAX;
      return left > 0 ? { key: 'LMB', text: 'Water it', sub: `${this.status(d)} · can ${left}/${CAN_MAX}` } : { key: '', text: 'The can is empty', sub: 'Refill it at the yard tap by your door' };
    }
    if (it?.kind === 'tool' && it.data.id === 'seeds' && (d.empty || d.dead)) return { key: 'LMB', text: 'Plant the seeds', sub: 'Morning glory' };
    if (it?.kind === 'tool' && it.data.id === 'fertiliser' && !d.dead && !d.empty) return { key: 'LMB', text: 'Add fertiliser', sub: `Faster growth for a few days (${it.data.uses || 1} scoops left)` };
    if (d.dead) return { key: 'LMB', text: 'Pull out the dead plant', sub: 'Then plant seeds (Mikawa-ya)' };
    if (d.species === 'tomato' && this.stage(d) >= 4 && !d.picked) return { key: 'LMB', text: 'Pick the tomatoes', sub: 'Ripe!' };
    return { key: '', text: this.status(d), sub: sub || `${pot.sp.label}. A watering can would help` };
  }

  use(pot) {
    const g = this.game, H = g.held, it = H.item, d = pot.d;
    const at = pot.holder.getWorldPosition(new THREE.Vector3());
    if (it?.kind === 'tool' && it.data.id === 'watering_can' && !d.dead && !d.empty) {
      const left = it.data.water ?? CAN_MAX;
      if (left <= 0) { audio.play('error', { vol: 0.4 }); return; }
      it.data.water = left - 1; it.data.uses = it.data.water;
      g.events.emit('slot', H.sel);
      this.pour(it, at);
      const h = g.clock?.hours ?? 9;
      d.water = Math.min(1.15, d.water + 0.6);
      d.wateredAt = g.clock?.stamp ?? 0;
      if (h >= 11 && h < 15 && d.species !== 'cactus') d.noon = (d.noon || 0) + 1; // scorched leaves (Kusaka's rule)
      g.events.emit('plantWatered', { species: d.species });
      g.save();
      return;
    }
    if (it?.kind === 'tool' && it.data.id === 'seeds' && (d.empty || d.dead)) {
      Object.assign(d, { species: 'asagao', growth: 0, water: 0.6, health: 1, dead: false, empty: false, fert: 0, picked: false });
      H.consume();
      audio.play('leafRustle', { pos: at, vol: 0.6 });
      g.effects.puff({ pos: at.clone().add(V(0, 0.12, 0)), count: 4, colors: [0x5a3a20, 0x3a2614], size: 0.03, up: 0.1 });
      this.refresh(pot); g.save();
      return;
    }
    if (it?.kind === 'tool' && it.data.id === 'fertiliser' && !d.dead && !d.empty) {
      d.fert = 3;
      it.data.uses = (it.data.uses || 1) - 1;
      if (it.data.uses <= 0) H.consume(); else g.events.emit('slot', H.sel);
      audio.play('bagRustle', { pos: at, vol: 0.5 });
      g.effects.sparks({ pos: at.clone().add(V(0, 0.12, 0)), count: 8, colors: [0xd8c8a0, 0xa89060], speed: 0.3, size: 0.01, star: 0, gravity: 3 });
      g.save();
      return;
    }
    if (d.dead) { Object.assign(d, { dead: false, empty: true, growth: 0 }); audio.play('leafRustle', { pos: at, vol: 0.6 }); this.refresh(pot); g.save(); return; }
    if (d.species === 'tomato' && this.stage(d) >= 4 && !d.picked) {
      d.picked = true; d.growth = 3.2;
      audio.play('leafRustle', { pos: at, vol: 0.6 });
      g.needs?.add(6, 'tomato'); g.needs?.feed(6);
      g.monologue?.say('Three little tomatoes, warm from the sun. Grandpa grew these too.', { force: true });
      this.refresh(pot); g.save();
      return;
    }
    audio.play('leafRustle', { pos: at, vol: 0.5 });
    g.effects.sparks({ pos: at.clone().add(V(0, 0.25, 0)), count: 4, colors: [0x58c06c, 0x2f8a48], speed: 0.25, size: 0.01, star: 0, gravity: 0.8, life: 0.8 });
  }

  /** Tip the can: water drops from the rose onto the plant. */
  pour(it, at) {
    const g = this.game, obj = it.obj, H = g.held;
    audio.play('water', { pos: at, vol: 0.7 });
    const q0 = obj.quaternion.clone();
    H.busy = true;
    g.tweens.add({ dur: 1.2, update: (k) => { const a = Math.sin(Math.PI * k) * 0.7; obj.quaternion.copy(q0).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), -a)); }, done: () => { obj.quaternion.copy(q0); H.busy = false; } });
    for (let i = 0; i < 10; i++) g.tweens.wait(0.2 + i * 0.07, () => g.effects.emit({ sprite: 'drop', x: at.x + (Math.random() - 0.5) * 0.12, y: at.y + 0.55, z: at.z + (Math.random() - 0.5) * 0.12, vy: -0.4, gravity: 9.8, color: 0xa8d8ff, life: 0.5, size: 0.03, floor: true, fade: 0.2 }));
  }

  // ------------------------------------------------------------------ the tap and the can
  buildTap() {
    const g = this.game, town = g.garage.town;
    const p = V(18.75, 0, 4.85);
    const grp = new THREE.Group();
    grp.position.copy(p);
    g.scene.add(grp);
    const steel = town?.P ? town.P(0.4, 0.6) : new THREE.MeshStandardMaterial({ color: 0x9aa0a6 });
    const pipe = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.75, 0.06).translate(0, 0.375, 0), steel); grp.add(pipe);
    const spout = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.14).translate(0, 0.72, 0.06), steel); grp.add(spout);
    const knob = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.02).translate(0, 0.8, 0), new THREE.MeshStandardMaterial({ color: 0x2a6ad8, roughness: 0.5 })); grp.add(knob);
    const can = propMesh('watering_can', { castShadow: false });
    can.position.set(0.18, 0, 0.08); can.rotation.y = -0.6; can.scale.setScalar(0.85);
    grp.add(can);
    this.yardCan = can;
    can.visible = !this.s.canGiven;
    const hb = hitBox(0.4, 0.9, 0.3, 0.05, 0.45, 0.05);
    grp.add(hb);
    g.interaction.add(hb, { reach: 2.2, hint: () => this.tapHint(), use: () => { this.tapUse(p); return false; } });
    g.player.addObstacle(p.x - 0.08, p.x + 0.08, p.z - 0.08, p.z + 0.08);
  }
  tapHint() {
    const H = this.game.held, it = H.item;
    if (it?.kind === 'tool' && it.data.id === 'watering_can') return { key: 'LMB', text: 'Fill the watering can', sub: `${it.data.water ?? CAN_MAX} / ${CAN_MAX}` };
    if (!this.s.canGiven) return H.canTake() ? { key: 'LMB', text: 'Take the watering can', sub: 'It came with the room. Your plants are thirsty' } : { key: '', text: 'A watering can', sub: 'Free a slot to take it' };
    return { key: '', text: 'The yard tap', sub: 'Bring the watering can to fill it' };
  }
  tapUse(p) {
    const g = this.game, H = g.held, it = H.item;
    if (it?.kind === 'tool' && it.data.id === 'watering_can') { this.refill(it, p); return; }
    if (!this.s.canGiven && H.canTake()) {
      this.s.canGiven = true;
      this.yardCan.visible = false;
      const obj = this.yardCan.clone();
      obj.position.copy(this.yardCan.getWorldPosition(new THREE.Vector3()));
      g.scene.add(obj);
      H.take('tool', { id: 'watering_can', water: CAN_MAX, uses: CAN_MAX }, obj);
      g.save();
    }
  }
  refill(it, at) {
    const g = this.game;
    it.data.water = CAN_MAX; it.data.uses = CAN_MAX;
    g.events.emit('slot', g.held.sel);
    audio.play('faucet', { pos: at, vol: 0.7, dur: 1.2 });
    for (let i = 0; i < 6; i++) g.tweens.wait(i * 0.12, () => g.effects.splash({ pos: at.clone().add(V(0, 0.55, 0.1)), color: 0xbfe0ff, size: 0.04, count: 2 }));
    g.save();
  }

  // ------------------------------------------------------------------ the days
  newDay() {
    const g = this.game;
    for (const pot of this.pots) {
      const d = pot.d, sp = SPECIES[d.species];
      if (d.empty || d.dead) continue;
      const watered = d.water >= sp.need;
      const light = Math.min(1, pot.sp.sun / sp.sun);
      if (watered && d.water < 1.05) {
        let k = 0.55 * light * (sp.slow || 1) * (d.fert > 0 ? 1.7 : 1) * (this.s.lessons.water ? 1.1 : 1);
        if (d.noon) k *= 0.8;
        d.growth = Math.min(4.99, d.growth + k);
        d.health = Math.min(1, d.health + 0.3);
      } else if (!watered) d.health -= d.species === 'cactus' ? 0.12 : 0.4;
      else d.health -= 0.15; // drowning
      if (d.health <= 0) { d.dead = true; d.health = 0; g.events.emit('plantDied', { species: d.species }); }
      d.water = Math.max(0, d.water - sp.thirst * (0.6 + 0.4 * pot.sp.sun));
      d.fert = Math.max(0, (d.fert || 0) - 1);
      d.noon = 0;
      if (this.stage(d) >= 4 && d.species === 'tomato') d.picked = false;
    }
    for (const p of this.pots) this.refresh(p);
  }

  lesson(e) {
    const g = this.game, L = this.s.lessons;
    if (!e?.lesson || L[e.lesson]) return;
    L[e.lesson] = true;
    g.places?.mikawaya?.refreshFert?.();
    if (e.lesson === 'water') g.news('Plant care: water in the morning', 'Your plants\' hints now show care tips', 6000);
    if (e.lesson === 'survey') {
      g.news('Dr. Kusaka\'s fertiliser', 'Mikawa-ya stocks it now. It makes plants grow much faster', 6000);
      g.monologue?.say('Fertiliser at Mikawa-ya. My morning glory is going to be huge.', { force: false });
    }
    g.save();
  }

  /** Plants bought from the furniture catalogue (game.decor) need water too: wilting ones look sad and count for less. */
  hookDecorPlants() {
    const F = FEATURES?.plant;
    if (!F || F._watered) return;
    F._watered = true;
    const hint0 = F.hint, use0 = F.use, self = this;
    F.hint = (p, held, g) => {
      const st = p.data.st, it = g.held.item;
      st.water ??= 0.7; st.health ??= 1;
      if (it?.kind === 'tool' && it.data.id === 'watering_can') return { key: 'LMB', text: `Water the ${p.def.name}`, sub: `Soil ${st.water > 0.45 ? 'moist' : st.water > 0.15 ? 'drying out' : 'dry'} · can ${it.data.water ?? CAN_MAX}/${CAN_MAX}` };
      const h = hint0(p, held, g);
      if (st.health < 0.5) return { key: h?.key || 'LMB', text: `${p.def.name} (wilting)`, sub: 'It needs water' };
      return h;
    };
    F.use = (p, held, g) => {
      const st = p.data.st, it = g.held.item;
      if (it?.kind === 'tool' && it.data.id === 'watering_can') {
        const left = it.data.water ?? CAN_MAX;
        if (left <= 0) { audio.play('error', { vol: 0.4 }); return; }
        it.data.water = left - 1; it.data.uses = it.data.water; g.events.emit('slot', g.held.sel);
        self.pour(it, p.root.getWorldPosition(new THREE.Vector3()));
        st.water = Math.min(1.1, (st.water ?? 0.5) + 0.6); st.health = Math.min(1, (st.health ?? 1) + 0.2);
        self.tintDecor(p);
        return;
      }
      use0(p, held, g);
    };
    F.quality = (p) => p.def.quality * (0.4 + 0.6 * (p.data.st.health ?? 1));
    this.game.events.on('newDay', () => {
      for (const p of this.game.decor?.byFeature?.('plant') || []) {
        const st = p.data.st;
        st.water ??= 0.7; st.health ??= 1;
        if (st.water < 0.25) st.health = Math.max(0.1, st.health - 0.3); else st.health = Math.min(1, st.health + 0.2);
        st.water = Math.max(0, st.water - 0.45);
        this.tintDecor(p);
      }
    });
  }
  tintDecor(p) {
    const st = p.data.st, sad = (st.health ?? 1) < 0.5;
    if (sad === !!p._sad) return;
    p._sad = sad;
    p.root.traverse((o) => {
      if (!o.isMesh || !Array.isArray(o.material)) return;
      if (sad) { o.userData.mats0 ||= o.material; o.material = o.material.map((m) => { if (!m.isMeshStandardMaterial) return m; const c = m.clone(); c.color = new THREE.Color(0xc8b070); return c; }); }
      else if (o.userData.mats0) o.material = o.userData.mats0;
    });
  }

  update(dt) {
    this.t += dt;
    // the morning glory opens and closes with the time of day (checked now and then)
    if ((this.chkT = (this.chkT || 0) - dt) > 0) return;
    this.chkT = 20;
    for (const p of this.pots) this.refresh(p);
    void pick;
  }
}
export { ROOM_O };
