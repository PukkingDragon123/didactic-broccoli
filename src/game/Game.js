// The game hub: owns every system, the world, the save state and the main update loop.
import * as THREE from 'three';
import { Renderer } from '../core/renderer.js';
import { Input } from '../core/input.js';
import { Physics } from '../core/physics.js';
import { Tweens, Emitter, formatYen } from '../core/util.js';
import { audio } from '../core/audio.js';
import { radio } from '../core/music.js';
import { bgm } from '../core/bgm.js';
import { timeUniform } from '../voxel/materials.js';
import { Effects } from '../gfx/effects.js';
import { Thumbs } from '../gfx/thumbs.js';
import { initFlyers, prewarmFlyers } from '../gfx/flyers.js';
import { Posters } from '../world/Posters.js';
import { GhostAlley } from '../world/GhostAlley.js';
import { TimeStop } from './TimeStop.js';
import { Street } from '../world/Street.js';
import { Goods } from './goods.js';
import { Garage, GARAGE } from '../world/Garage.js';
import { Player } from './Player.js';
import { Interaction } from './Interaction.js';
import { Held } from './Held.js';
import { Items } from './Items.js';
import { Reveal } from './Reveal.js';
import { Lighting } from './Lighting.js';
import { GachaMachine } from './GachaMachine.js';
import { GarageShelf } from './Shelf.js';
import { Delivery } from './Delivery.js';
import { Placement } from './Placement.js';
import { loadState, saveState, clearState } from './state.js';
import { itemValue, capsuleCost, CHARMS, OPENERS } from './economy.js';
import { SERIES, SERIES_BY_ID, getItem } from '../data/series/index.js';
import { RARITIES } from '../data/rarity.js';
import { Story } from './Story.js';
import { Guide } from './Guide.js';
import { Cutscene } from './Cutscene.js';
import { Notebook } from './Notebook.js';
import { Hotbar } from '../ui/Hotbar.js';
import { makeToolMesh } from './Held.js';
import { makeCapsule } from './Capsule.js';
import { SUPPLY_BY_ID } from '../data/supplies.js';
import { TOOLS } from '../data/tools.js';
import { Bubbles } from '../people/index.js';
import { Pedestrians } from '../world/Pedestrians.js';

export class Game {
  constructor(container) {
    this.container = container;
    this.events = new Emitter();
    this.tweens = new Tweens();
    this.state = loadState();
    this.visiting = !!this.state.__visit;
    if (this.visiting) this.noSave = true;
    this.renderer = new Renderer(container);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xa9c4dd);
    this.scene.fog = new THREE.Fog(0xd9cdb8, 25, 110);
    this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.03, 160);
    this.scene.add(this.camera);
    this.input = new Input(this.renderer.renderer.domElement);
    this.physics = new Physics();
    this.player = new Player(this.camera, this.input);
    this.frame = 0;
    this.time = 0;
    this.machines = [];
    this.shelves = [];
    this.newsEl = document.getElementById('news');
    this.moneyEl = document.querySelector('#money .val');
    this.deltaEl = document.getElementById('money-delta');
    this.shownMoney = this.state.money;
    this.ambT = { furin: 6, crow: 25, higurashi: 4, crossing: 90, chime: 240 };
  }

  async init(progress = () => {}) {
    const s = this.state.settings;
    this.renderer.setup(this.scene, this.camera);
    if (s.quality) this.renderer.setQuality(s.quality);
    progress(0.1);
    this.thumbs = new Thumbs(this.renderer.renderer);
    initFlyers(this.renderer.renderer, { thumbs: this.thumbs }); // flyers and posters are drawn lazily, in idle time
    this.effects = new Effects(this.scene, { groundAt: (x, z, y) => this.groundAt(x, z, y) });
    this.interaction = new Interaction(this);
    this.interaction.showHints = s.hints;
    this.held = new Held(this);
    this.cutscene = new Cutscene(this);
    this.notebook = new Notebook(this);
    this.story = new Story(this);
    this.items = new Items(this);
    this.reveal = new Reveal(this);
    this.placement = new Placement(this);
    this.delivery = new Delivery(this);
    this.garage = new Garage(this);
    this.street = new Street(this);
    this.posters = new Posters(this);
    this.lighting = new Lighting(this);
    progress(0.35);
    this.placement.addSurface(this.garage.floor);
    this.placement.addSurface(this.garage.tableTop);
    this.player.surfaceAt = (p) => (p.z < GARAGE.minZ - 0.1 ? (this.museum?.surfaceAt(p) || 'wood') : 'concrete');
    // machines & shelves from the save
    for (const m of this.state.machines) this.machines.push(new GachaMachine(this, m));
    progress(0.6);
    for (const sh of this.state.shelves) this.shelves.push(new GarageShelf(this, sh));
    this.restoreLoose();
    this.restoreInventory();
    this.setupFixedInteractables();
    this.applySettings();
    this.garage.setLights(this.state.lightsOn !== false);
    progress(0.75);
    // optional systems added by other modules (PC, museum)
    for (const fn of Game.plugins) await fn(this);
    this.goods = new Goods(this);
    this.story.init();
    this.hotbar = new Hotbar(this);
    this.guide = new Guide(this);
    this.bubbles = new Bubbles(this.camera, document.body);
    this.pedestrians = new Pedestrians(this);
    this.ghostAlley = new GhostAlley(this);
    this.timeStop = new TimeStop(this);
    for (const fn of Game.late) await fn(this);
    progress(0.9);
    this.bakeEnvironment();
    this.thumbs.prewarm(SERIES.flatMap((se) => se.items.map((it) => it.key)));
    prewarmFlyers();
    if (!this.story.done && !this.state.story.shutter) {
      // a new story: you're standing in the lane in front of Grandpa's locked shutter
      this.player.pos.set(0.4, 0, GARAGE.maxZ + 4.2);
      this.player.yaw = 0;
      this.player.pitch = 0.1;
    } else {
      this.player.pos.set(0.4, 0, 2.6);
      this.player.yaw = 0.55;
      this.player.pitch = -0.12;
    }
    this.updateMoney(true);
    progress(1);
    setInterval(() => this.save(), 15000);
    window.addEventListener('beforeunload', () => this.save());
  }

  /** Light probe: render the garage into a cube map for glossy reflections on capsules, chrome & glass. */
  bakeEnvironment() {
    const r = this.renderer.renderer;
    const rt = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
    const cc = new THREE.CubeCamera(0.05, 60, rt);
    cc.position.set(0.2, 1.4, 0.5);
    this.scene.add(cc);
    const hidden = [];
    this.scene.traverse((o) => { if (o.isPoints) { hidden.push(o); o.visible = false; } });
    cc.update(r, this.scene);
    hidden.forEach((o) => { o.visible = true; });
    const pm = new THREE.PMREMGenerator(r);
    this.scene.environment = pm.fromCubemap(rt.texture).texture;
    this.scene.environmentIntensity = 0.85;
    this.scene.remove(cc);
    rt.dispose();
  }

  groundAt(x, z, y) {
    // table tops, crates, desk; otherwise floor
    const T = this.garage.table;
    if (Math.abs(x - T.x) < T.w / 2 && Math.abs(z - T.z) < T.d / 2 && y > T.h - 0.05) return T.h;
    const D = this.garage.pcDesk;
    if (Math.abs(x - D.x) < D.w / 2 && Math.abs(z - D.z) < D.d / 2 && y > D.h - 0.05) return D.h;
    if (this.museum && z < GARAGE.minZ - 0.2) return this.museum.groundAt?.(x, z, y) ?? 0;
    return 0;
  }

  // ------------------------------------------------------------------ fixed garage interactables
  setupFixedInteractables() {
    const g = this;
    const G = this.garage;
    // sell box
    this.interaction.add(G.sellBox, {
      hint: (held) => {
        if (!held) return { key: '', text: 'Sell box', sub: 'Drop figures here to sell them' };
        if (held.kind === 'toy') return { key: 'LMB', text: `Sell for ${formatYen(itemValue(held.data.key, held.data.finish))}`, sub: this.countOwned(held.data.key) > 0 ? 'You have another one on display' : 'Not on display anywhere yet!' };
        if (held.kind === 'capsule') return { key: 'LMB', text: `Sell unopened for ${formatYen(this.unopenedValue(held.data))}` };
        return null;
      },
      use: (held) => { if (held && (held.kind === 'toy' || held.kind === 'capsule')) this.sellHeld(); return false; },
    });
    // storage bin
    this.interaction.add(G.storageBox, {
      hint: (held) => {
        const n = Object.values(this.state.storage).reduce((a, b) => a + b, 0);
        if (held?.kind === 'toy') return { key: 'LMB', text: 'Store for later', sub: `${n} stored - sell or take them out on the PC` };
        if (this.held.canTake() && n > 0) return { key: 'LMB', text: `Take one out (${n} stored)` };
        if (!held) return { key: '', text: 'Storage bin (empty)' };
        return null;
      },
      use: (held) => {
        if (held?.kind === 'toy') this.storeHeld();
        else if (this.held.canTake()) this.takeFromStorage();
        return false;
      },
    });
    // radio (dead until it gets batteries in a new story)
    radio.attach(G.radio.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.15, 0)));
    this.interaction.add(G.radio, {
      hint: (held) => {
        const sh = this.story.radioHint();
        if (sh !== undefined) return sh;
        return held ? null : { key: 'LMB', text: radio.station < 0 ? 'Turn the radio on' : 'Next station', sub: radio.station >= 0 ? radio.stations[radio.station].name : '' };
      },
      use: () => {
        if (!this.story.useRadio()) return false;
        const st = radio.cycle(); this.state.radio = st;
        this.news(st < 0 ? 'Radio off' : `Radio: ${radio.stations[st].name}`);
        return false;
      },
    });
    // Mikawa-ya's counter across the lane opens the corner-shop list
    const cs = G.town?.cornerShop;
    if (cs?.counter) this.interaction.add(cs.counter, {
      reach: 2.6,
      hint: () => ({ key: 'LMB', text: 'Shop at Mikawa-ya', sub: 'Milk, brooms, tools, batteries, flyers' }),
      use: () => {
        if (!this.shopUI) { this.news('The shop is closed right now'); return false; }
        // the first time: say hello to the shopkeeper behind the counter
        if (!this.state.flags.metKeeper && this.pedestrians?.keeper) { this.state.flags.metKeeper = true; this.cutscene.play((c) => this.story.meetKeeperScene(c)).then(() => this.shopUI.open('corner')); } else this.shopUI.open('corner');
        return false;
      },
    });
    // light switch
    this.interaction.add(G.lightSwitch, {
      hint: (held) => (held && held.kind !== 'tool' ? null : { key: 'LMB', text: G.lightsOn ? 'Lights off' : 'Lights on', sub: 'Glow-in-the-dark finishes shine in the dark' }),
      use: () => { G.setLights(!G.lightsOn); this.state.lightsOn = G.lightsOn; audio.play(G.lightsOn ? 'lightsOn' : 'relay', { pos: G.lightSwitch.getWorldPosition(new THREE.Vector3()), vol: 0.8 }); return false; },
    });
  }

  /** Buy something at Mikawa-ya: straight into your inventory, or onto the counter when your hands are full. */
  buySupply(id) {
    const sup = SUPPLY_BY_ID[id];
    if (!sup) return { ok: false, msg: 'Not sold here.' };
    if (this.state.money < sup.price) return { ok: false, msg: `You need ${formatYen(sup.price - this.state.money)} more.` };
    this.spend(sup.price);
    const extra = sup.uses ? { uses: sup.uses } : {};
    // flyers stack up in one slot
    if (sup.tool === 'flyers') {
      const i = this.held.find('flyers');
      if (i >= 0) { this.held.slots[i].data.uses += sup.uses; this.events.emit('slot', this.held.sel); this.save(); return { ok: true, msg: `${sup.name} added to your stack.` }; }
    }
    if (this.held.giveTool(sup.tool, extra)) { this.save(); return { ok: true, msg: `${sup.name} - in your bag (slot ${this.held.sel + 1}).` }; }
    const c = this.garage.town?.cornerShop?.counter;
    const p = c ? c.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.55, 0)) : this.player.pos.clone();
    this.items.spawnTool({ id: sup.tool, ...extra }, p, Math.random() * 6);
    this.save();
    return { ok: true, msg: `${sup.name} - your hands are full, it's on the counter.` };
  }

  // ------------------------------------------------------------------ economy actions
  unopenedValue(d) { return Math.round(capsuleCost(d.series) * 1.1); }

  sellHeld() {
    const held = this.held.item;
    const box = this.garage.sellBox;
    const target = box.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.25, 0));
    const value = held.kind === 'toy' ? itemValue(held.data.key, held.data.finish) : this.unopenedValue(held.data);
    this.held.putTo(target, new THREE.Quaternion(), (obj) => {
      obj.parent?.remove(obj);
      audio.play('sell', { pos: target, vol: 0.9 });
      this.addMoney(value);
      this.state.stats.sold++;
      const n = Math.min(14, 2 + Math.floor(Math.log2(value + 1)));
      this.effects.coinBurst({ pos: target.clone().add(new THREE.Vector3(0, 0.1, 0)), count: n, up: 1.6, spread: 0.6, life: 1.4 });
      this.effects.sparks({ pos: target, count: 12, colors: [0xffd23f, 0xffffff], speed: 0.5, size: 0.01 });
      this.save();
    }, { dur: 0.4, arc: 0.18, scale: 0.6 });
  }

  storeHeld() {
    const held = this.held.item;
    const target = this.garage.storageBox.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.3, 0));
    const k = `${held.data.key}|${held.data.finish}`;
    this.held.putTo(target, new THREE.Quaternion(), (obj) => {
      obj.parent?.remove(obj);
      this.state.storage[k] = (this.state.storage[k] || 0) + 1;
      audio.play('place', { pos: target, vol: 0.8 });
      this.save();
    }, { dur: 0.35, arc: 0.12, scale: 0.5 });
  }

  takeFromStorage(k = null) {
    const keys = Object.keys(this.state.storage).filter((x) => this.state.storage[x] > 0);
    if (!keys.length) return false;
    const pick = k && this.state.storage[k] ? k : keys[keys.length - 1];
    this.state.storage[pick]--;
    if (this.state.storage[pick] <= 0) delete this.state.storage[pick];
    const [key, finish] = pick.split('|');
    if (!this.held.canTake()) { this.delivery.order({ type: 'single', key, finish, label: getItem(key)?.name }, { delay: 0.5 }); return true; }
    const p = this.garage.storageBox.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.3, 0));
    const holder = new THREE.Group();
    holder.add(makeItemMeshLazy(key, finish));
    holder.position.copy(p);
    this.scene.add(holder);
    this.held.take('toy', { key, finish }, holder);
    audio.play('pickup');
    return true;
  }

  addMoney(v, quiet = false) {
    this.state.money += v;
    if (v > 0) this.state.earned += v;
    this.updateMoney(false, v);
    if (!quiet && v > 0 && audio.canPlay('coin', 0.05)) audio.play('register', { vol: 0.35 });
  }

  spend(v) {
    if (this.state.money < v) return false;
    this.state.money -= v;
    this.updateMoney(false, -v);
    return true;
  }

  updateMoney(instant = false, delta = 0) {
    if (instant) this.shownMoney = this.state.money;
    if (delta) {
      const el = this.deltaEl;
      el.textContent = (delta > 0 ? '+' : '−') + formatYen(Math.abs(delta)).replace('¥', '¥');
      el.classList.toggle('neg', delta < 0);
      el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
      clearTimeout(this._dT);
      this._dT = setTimeout(() => el.classList.remove('show'), 1600);
    }
  }

  luck() {
    let finish = OPENERS[this.state.opener]?.luck || 0, rare = 0;
    for (const c of this.state.charms) { finish += CHARMS[c]?.finishLuck || 0; rare += CHARMS[c]?.rareLuck || 0; }
    return { finish, rare };
  }

  /** Record a discovery. Returns true if this item was never seen before. */
  discover(key, finish) {
    if (getItem(key)?.mini) return false;
    const d = this.state.discovered;
    const isNew = !d[key];
    if (!d[key]) d[key] = { n: 0, f: {} };
    d[key].n++;
    d[key].f[finish] = (d[key].f[finish] || 0) + 1;
    this.events.emit('discover', { key, finish, isNew });
    return isNew;
  }

  /** How many of an item are currently displayed anywhere. */
  countOwned(key) {
    let n = 0;
    for (const s of this.allDisplays()) for (const it of s.items) if (it && it.k === key) n++;
    return n;
  }

  allDisplays() {
    const out = this.shelves.map((s) => s.display);
    if (this.museum) out.push(...this.museum.displays());
    return out;
  }

  displayedKeys() {
    const set = new Set();
    for (const d of this.allDisplays()) for (const it of d.items) if (it) set.add(it.k);
    return set;
  }

  onDisplayChanged(key, display, slot) {
    const it = getItem(key);
    if (!it) return;
    this.checkCompletion(it.series, display, slot);
    this.events.emit('display');
    this.save();
  }

  checkCompletion(seriesId, display, slot) {
    if (this.state.completed[seriesId]) return;
    const s = SERIES_BY_ID[seriesId];
    if (!s || s.hidden) return;
    const shown = this.displayedKeys();
    if (!s.items.every((it) => shown.has(it.key))) return;
    this.state.completed[seriesId] = true;
    const reward = s.price * 40;
    const p = slot?.mesh ? slot.mesh.getWorldPosition(new THREE.Vector3()) : this.camera.getWorldPosition(new THREE.Vector3());
    this.tweens.wait(0.4, () => {
      audio.play('confetti', { pos: p });
      audio.play('complete', { vol: 0.9, delay: 0.1 });
      this.effects.confetti({ pos: p.clone().add(new THREE.Vector3(0, 0.1, 0)), count: 160, speed: 2.6 });
      this.effects.sparks({ pos: p, count: 120, colors: [0xffd23f, 0xffffff, 0xff8af0], speed: 1, size: 0.012 });
      this.effects.coinBurst({ pos: p, count: 30, up: 2 });
      this.lighting.flicker(0.3);
      this.addMoney(reward);
      this.news(`Series complete: ${s.name}!`, `+${formatYen(reward)} bonus`);
    });
  }

  /** One-time contextual tip (shown once per save). */
  tip(key, text, sub = '') {
    if (this.state.flags['tip_' + key]) return;
    this.state.flags['tip_' + key] = true;
    this.news(text, sub, 6500);
  }

  /** A little toast in the corner: a main line and an optional smaller line. */
  news(text, sub = '', ms = 4200) {
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `<span class="t">${text}</span>${sub ? `<span class="sub">${sub}</span>` : ''}`;
    this.newsEl.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 500); }, ms);
    while (this.newsEl.children.length > 4) this.newsEl.firstChild.remove();
  }

  // ------------------------------------------------------------------ persistence
  restoreLoose() {
    for (const l of this.state.loose || []) {
      if (l.d?.type === 'roller') continue; // the museum remodel roller was retired (walls are fixed now)
      const p = new THREE.Vector3(...l.p);
      if (l.kind === 'capsule') this.items.spawnCapsule(l.d, p);
      else if (l.kind === 'toy') this.items.spawnToy({ key: l.d.key, finish: l.d.finish }, p, { physics: false, rotY: l.r || 0 });
      else if (l.kind === 'box') this.items.spawnBox(l.d, p, this.delivery.meshFor(l.d));
    }
    // deliveries that never arrived
    for (const d of this.state.deliveries || []) if (d.type !== 'roller') this.delivery.order(d, { delay: 1 });
    this.state.deliveries = [];
  }

  /** Rebuild the 5 inventory slots from the save. */
  restoreInventory() {
    const H = this.held;
    (this.state.inventory || []).forEach((it, i) => {
      if (!it || i >= H.slots.length) return;
      let obj = null;
      if (it.kind === 'tool' && TOOLS[it.d.id]) obj = makeToolMesh(it.d.id);
      else if (it.kind === 'capsule') { const cap = makeCapsule(it.d.series, it.d.color); obj = cap.group; obj.userData.capRef = cap; }
      else if (it.kind === 'toy') { obj = new THREE.Group(); obj.add(makeItemMeshLazy(it.d.key, it.d.finish)); }
      else if (it.kind === 'box') obj = this.delivery.meshFor(it.d);
      if (!obj) return;
      H.anchor.add(obj);
      H.sel = i;
      H.slots[i] = null;
      H.take(it.kind, it.d, obj, { dur: 0 });
      if (i !== 0) H.pocket(H.slots[i]);
    });
    H.sel = 0;
    if (H.slots[0]) { H.slots[0].obj.visible = true; H.pose = H.poseFor(H.slots[0]); H.holdScale = H.scaleFor(H.slots[0]); H.startTrans(H.pose, 0.01); }
  }

  save() {
    if (this.noSave) return;
    this.state.loose = this.items.serialize();
    if (!this.held.busy) this.state.inventory = this.held.serialize();
    this.state.deliveries = this.delivery.queue.map((q) => q.data);
    saveState(this.state);
  }

  reset() {
    this.noSave = true;
    clearState();
    location.reload();
  }

  applySettings() {
    const s = this.state.settings;
    audio.volumes.master = s.master; audio.volumes.music = s.music; audio.volumes.ambience = s.ambience;
    audio.applyVolumes();
    this.input.sensitivity = s.sens;
    this.player.baseFov = s.fov;
    this.interaction.showHints = s.hints;
  }

  startAudio() {
    audio.init();
    if (this.ambience) return;
    const A = (name, vol, pos) => { const h = audio.loop(name, { bus: audio.amb, pos, ref: 2 }); h?.set(vol, 1.5); return h; };
    this.ambience = {
      room: A('roomtone', 0.25),
      hum: A('hum', 0.012, new THREE.Vector3(0, 2.9, 0)),
      traffic: A('traffic', 0.12, new THREE.Vector3(0, 1, 12)), // recorded street ambience once loaded
      birds: A('birds', 0.07, new THREE.Vector3(-3, 6, 15)),
      cicadas: A('cicadas', 0.06, new THREE.Vector3(5, 5, 18)),
    };
    if (!bgm.current) bgm.play('garage', { fade: 3 }); // background music (main.js normally starts it with the fly-in)
    if (this.state.radio >= 0) radio.setStation(this.state.radio);
  }

  ambientTick(dt) {
    if (!audio.ready) return;
    const T = this.ambT;
    for (const k of Object.keys(T)) T[k] -= dt;
    const out = (x, y, z) => ({ pos: new THREE.Vector3(x, y, z), bus: audio.amb });
    if (T.furin <= 0) { T.furin = 7 + Math.random() * 14; audio.play('furin', { ...out(-3.9, 2.4, 1.8), vol: 0.8 }); }
    if (T.crow <= 0) { T.crow = 40 + Math.random() * 60; audio.play('crow', { ...out(6 - Math.random() * 12, 9, 22), vol: 0.5 }); }
    if (T.higurashi <= 0) { T.higurashi = 9 + Math.random() * 16; audio.play('higurashi', { ...out(-8 + Math.random() * 16, 6, 18), vol: 0.9, ref: 4 }); }
    if (T.crossing <= 0) { T.crossing = 150 + Math.random() * 150; audio.play('crossing', { ...out(-30, 2, 30), vol: 0.9, ref: 10 }); }
    if (T.chime <= 0) { T.chime = 600; audio.play('townChime', { ...out(40, 20, 60), vol: 1, ref: 30 }); }
  }

  tipCheck() {
    if (this.frame % 20) return;
    const h = this.held.item;
    if (this.machines.some((m) => m.state === 'ready' && !m.hasMotor)) this.tip('crank', 'Hold LMB on the handle to turn it');
    if (!h && [...this.items.list].some((e) => e.kind === 'capsule')) this.tip('pick', 'Pick up the capsule from the tray');
    if (h?.kind === 'capsule') this.tip('twist', 'Hold LMB to twist the capsule open');
    if (h?.kind === 'toy' && !this.held.busy) this.tip('toy', 'Put it on the shelf or sell it?', 'Shelves are on the right wall, the sell box is by the PC');
    if (this.machines.some((m) => m.data.stock.length === 0 && !m.data.broken)) this.tip('empty', 'Sold out!', 'Order capsule refills on the PC in the back corner');
    if ([...this.items.list].some((e) => e.kind === 'box')) this.tip('box', 'A delivery arrived by the shutter', 'Carry the box to a machine and click to pour the capsules in');
    if (this.story.done && this.state.money >= 2400 && this.machines.length < 3) this.tip('machine2', 'You can afford another machine', 'Check the PC');
    if (Object.keys(this.state.completed).length >= 1 && !this.state.museum.owned) this.tip('museum', 'Series complete!', 'The PC sells a museum licence for the back warehouse');
  }

  // ------------------------------------------------------------------ loop
  update(dt) {
    this.input.beginFrame(dt);
    this.frame++;
    this.time += dt;
    this.state.playTime += dt;
    const frozen = this.timeStop?.frozen; // the pocket watch: everything but you holds still
    if (!frozen) timeUniform.value = this.time;
    if (this.player.lookLocked) {
      const m = this.input.mouse; const sx = m.dx, sy = m.dy; m.dx = 0; m.dy = 0;
      this.player.update(dt);
      m.dx = sx; m.dy = sy;
    } else this.player.update(dt);
    this.cutscene.update(dt);
    this.camera.updateMatrixWorld();
    this.interaction.update(dt);
    this.held.update(dt);
    this.notebook.update(dt);
    this.story.update(dt);
    this.guide?.update(dt);
    this.timeStop?.update(dt);
    if (!frozen) {
      this.physics.step(dt);
      for (const m of this.machines) m.update(dt, this.time);
      this.street.update(dt, this.time);
      this.pedestrians?.update(dt);
      this.ghostAlley?.update(dt);
      this.goods?.update(dt);
      for (const s of this.shelves) s.update(dt);
      this.items.update(dt);
      this.delivery.update(dt);
    }
    this.reveal.update(dt, this.time);
    this.tweens.update(dt);
    this.effects.update(dt, this.time);
    this.garage.update(dt, this.time);
    this.lighting.update(dt, this.time);
    for (const fn of Game.updaters) fn(this, dt);
    this.tipCheck();
    this.thumbs.tick(1);
    this.ambientTick(dt);
    audio.updateListener(this.camera);
    // money counter roll-up
    if (this.shownMoney !== this.state.money) {
      const diff = this.state.money - this.shownMoney;
      this.shownMoney += Math.abs(diff) < 2 ? diff : diff * Math.min(1, dt * 8);
      if (Math.abs(this.state.money - this.shownMoney) < 0.5) this.shownMoney = this.state.money;
    }
    this.moneyEl.textContent = Math.round(this.shownMoney).toLocaleString('ja-JP');
    this.input.endFrame();
  }

  render(dt) { this.renderer.render(dt, this.time); }
}

Game.plugins = [];
Game.updaters = [];
Game.late = []; // installers that need the whole game built (src/plugins/*.js, registered in main.js)

import { makeItemMesh } from './collectibles.js';
function makeItemMeshLazy(k, f) { return makeItemMesh(k, f); }
export { SERIES, RARITIES };
