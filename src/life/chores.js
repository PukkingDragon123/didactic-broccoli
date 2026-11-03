// The opening's small physical chores (with src/game/Story.js, which owns the to-do list and the flags in
// game.state.story): the main breaker, the window, the rag and the dusty counter, the roll of bin bags and the rubbish
// to bag, the cardboard to flatten, Grandpa's junk boxes (one hides the OPEN sign), the change float for the cash tray,
// and the first machine: its delivery crate (straps, carton sleeve, foam blocks) and its plug.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { audio } from '../core/audio.js';
import { ease } from '../core/util.js';
import { propMesh } from '../world/props.js';
import { GARAGE, MACHINE_SLOTS } from '../world/Garage.js';
import { Pix } from '../gfx/pix.js';
import { dustPatch, dissolveMat } from './art.js';
import { talk } from '../people/voice.js';

const DRIVER = talk(null, { base: 165, duty: 0.5 }); // the delivery man's 8-bit voice

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const DUST = [0x9a8a78, 0x7a6e62, 0xb8a894];
export const SINK = { x: 2.62, z: -4.76, top: 0.82 };
export const BREAKER = { x: 1.12, y: 2.0, z: -4.89 };
export const WINDOW = { x: -4, z0: 1.05, z1: 2.65, y0: 1.75, y1: 2.6 };
export const TRAY = { x: -0.52, y: 0.78, z: -0.2 };
export const PATCHES = [[-0.45, 0.22], [0.42, -0.22], [0.66, 0.2], [-0.1, -0.2]];
export const JUNK = [{ id: 'j1', x: -3.2, z: -0.2, sign: true }, { id: 'j2', x: -3.2, z: 0.85 }];
export const RUBBISH = ['p2', 'p5'];
export const CARDBOARD = ['p3'];

/** The view out of the opened window: the neighbour's block wall, a drainpipe, ivy and a strip of evening sky. */
function outsidePix() {
  const p = new Pix(40, 22, 33);
  p.gradient(0, 0, 40, 7, 0xf2b880, 0xe89a70);
  p.rect(0, 7, 40, 15, 0x9a968c);
  for (let y = 7; y < 22; y += 3) for (let x = (y % 2) * 3; x < 40; x += 6) p.rect(x, y, 1, 3, 0x7e7a72);
  for (let x = 0; x < 40; x++) p.px(x, 7 + (x % 5 === 0 ? 1 : 0), 0x6a665e);
  p.rect(30, 0, 2, 22, 0x6a7a6a); p.rect(30, 0, 1, 22, 0x8a9a8a);
  for (let i = 0; i < 40; i++) { const x = Math.floor(p.r() * 14), y = 8 + Math.floor(p.r() * 14); p.px(x, y, [0x3a6a32, 0x4a8a3a, 0x2a5a2a][i % 3]); }
  p.noise(0.05);
  return p;
}
/** Frosted wired glass like the garage's own pane (src/world/Garage.js). */
function frostPix() {
  const p = new Pix(32, 32, 5);
  p.fill(0xdde6e6);
  for (let i = 0; i < 32; i += 6) { p.rect(i, 0, 1, 32, 0xb8c4c4); p.rect(0, i, 32, 1, 0xb8c4c4); }
  return p;
}

export class Chores {
  constructor(game, life) {
    this.game = game;
    this.life = life;
    this.patches = [];
    this.junk = new Map();
    this.piles = new Map();
    this.t = 0;
  }

  get f() { return this.game.state.story; }

  /** Build everything the opening still needs (called by Story.setup once the world exists). */
  setup() {
    const f = this.f;
    for (const k of ['wiped', 'bagged', 'junkOpen', 'junkOut', 'plugged']) if (!Array.isArray(f[k])) f[k] = [];
    this.buildBreaker();
    this.buildWindow();
    if (!this.game.story.done) {
      this.buildSink();
      this.buildCounter();
      this.buildRubbish();
      this.buildJunk();
      this.buildTray();
    } else this.buildTray(true);
    this.game.events.on('machineBought', ({ machine }) => this.onMachineBought(machine));
    this.game.events.on('pickup', (ent) => this.onPickup(ent));
    // a crate still waiting from last time
    if (f.crate && !this.game.story.done) this.restoreCrate();
  }

  hand(p) { const fp = this.game.fp; if (fp?.live && p) fp.play('tap', 0.5, { at: fp.toAnchor(p, new THREE.Vector3()), hand: fp.freeHand() }); }

  // ------------------------------------------------------------------ the main breaker (by the back door)
  buildBreaker() {
    const g = this.game, L = this.life;
    const pivot = new THREE.Group();
    pivot.position.set(BREAKER.x, BREAKER.y, BREAKER.z + 0.01);
    const lever = propMesh('breaker_lever', { fallbackSize: [0.05, 0.09, 0.03], fallbackColor: 0xd8282a });
    lever.position.set(0, 0, 0);
    pivot.add(lever);
    pivot.rotation.x = L.power ? 0.35 : Math.PI - 0.35;
    g.scene.add(pivot);
    this.breaker = pivot;
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.44, 0.08), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(BREAKER.x, 2.01, -4.92);
    g.scene.add(hit);
    g.interaction.add(hit, {
      hint: () => (L.power ? { key: 'LMB', text: 'Main breaker (on)', sub: 'Flip it off?' } : { key: 'LMB', text: 'Flip the main breaker', sub: 'The old grey box. MAIN, it says.' }),
      use: () => { this.flipBreaker(); return false; },
    });
  }

  flipBreaker() {
    const g = this.game, L = this.life, on = !L.power;
    const p = V(BREAKER.x, BREAKER.y, BREAKER.z);
    this.hand(p);
    const from = this.breaker.rotation.x, to = on ? 0.35 : Math.PI - 0.35;
    g.tweens.add({ delay: 0.18, dur: 0.16, ease: ease.inQuad, update: (k) => { this.breaker.rotation.x = from + (to - from) * k; }, done: () => {
      audio.play('breaker', { pos: p, vol: 1 });
      g.player.shake = Math.max(g.player.shake, 0.15);
      g.effects.sparks({ pos: p.clone().add(V(0, -0.05, 0.05)), count: on ? 6 : 2, colors: [0xfff4a0, 0xffb040], speed: 0.6, size: 0.01, gravity: 1, life: 0.4, star: 0.5 });
      L.setPower(on);
      if (on && !this.f.powerOn) { this.f.powerOn = true; g.story.task('Power! The old place hums back to life.'); }
    } });
  }

  // ------------------------------------------------------------------ the window (left wall): unlatch, slide it open
  buildWindow() {
    const g = this.game, W = WINDOW, f = this.f;
    const h = W.y1 - W.y0 - 0.04, half = (W.z1 - W.z0) / 2 - 0.01;
    const outTex = outsidePix().texture();
    this.outMat = new THREE.MeshStandardMaterial({ map: outTex, roughness: 0.9, emissive: 0xffffff, emissiveMap: outTex, emissiveIntensity: 0.55 });
    this.outGeo = new THREE.PlaneGeometry(1, h);
    this.outside = new THREE.Mesh(this.outGeo, this.outMat);
    this.outside.rotation.y = Math.PI / 2;
    this.outside.position.set(W.x + 0.046, (W.y0 + W.y1) / 2, W.z0 + 0.02);
    g.scene.add(this.outside);
    // the sash that slides: frame + frosted glass
    const sash = new THREE.Group();
    const frame = new THREE.MeshStandardMaterial({ color: 0xb8bdb8, metalness: 0.5, roughness: 0.4 });
    const ft = frostPix().texture();
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(half, h), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.35, color: 0xfff4e4, emissive: 0xffc890, emissiveMap: ft, emissiveIntensity: 0.95 }));
    glass.rotation.y = Math.PI / 2;
    sash.add(glass);
    const bars = [[0.025, h, -half / 2, 0], [0.025, h, half / 2, 0], [half, 0.025, 0, h / 2], [half, 0.025, 0, -h / 2]].map(([w, hh, z, y]) => {
      const b = new THREE.BoxGeometry(0.03, hh, w === 0.025 ? 0.025 : w);
      b.translate(0.012, y, z);
      return b;
    });
    sash.add(new THREE.Mesh(mergeGeometries(bars), frame));
    // the crescent latch in the middle
    const latch = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.05), new THREE.MeshStandardMaterial({ color: 0xd8c070, metalness: 0.7, roughness: 0.3 }));
    latch.position.set(0.03, 0, half / 2 - 0.02);
    sash.add(latch);
    this.latch = latch;
    sash.position.set(W.x + 0.06, (W.y0 + W.y1) / 2, W.z0 + 0.01 + half / 2);
    g.scene.add(sash);
    this.sash = sash;
    this.sashZ0 = sash.position.z;
    this.half = half;
    this.setWindow(f.window ? 1 : 0);
    const hit = new THREE.Mesh(new THREE.PlaneGeometry(W.z1 - W.z0, W.y1 - W.y0), new THREE.MeshBasicMaterial({ visible: false }));
    hit.rotation.y = Math.PI / 2;
    hit.position.set(W.x + 0.09, (W.y0 + W.y1) / 2, (W.z0 + W.z1) / 2);
    g.scene.add(hit);
    g.interaction.add(hit, {
      reach: 2.6,
      hint: () => ({ key: 'LMB', text: this.f.window ? 'Shut the window' : 'Open the window', sub: this.f.window ? 'Fresh air' : 'Flip the latch and slide it' }),
      use: () => { this.toggleWindow(); return false; },
    });
  }

  setWindow(k) {
    this.winK = k;
    const w = Math.max(0.001, k * this.half);
    this.outside.scale.x = w;
    this.outside.position.z = WINDOW.z0 + 0.01 + w / 2;
    this.outside.visible = k > 0.01;
    // keep the view from stretching: show only the part of the picture the gap reveals
    const uv = this.outGeo.attributes.uv;
    uv.setX(0, 1 - k); uv.setX(2, 1 - k); uv.setX(1, 1); uv.setX(3, 1);
    uv.needsUpdate = true;
    this.sash.position.z = this.sashZ0 + k * this.half;
    this.latch.rotation.x = k > 0 ? 1.2 : 0;
  }

  toggleWindow() {
    const g = this.game, open = !this.f.window;
    const p = V(WINDOW.x + 0.1, 2.1, 1.5);
    this.hand(p);
    if (this.busyWin) return;
    this.busyWin = true;
    audio.play('relay', { pos: p, vol: 0.4 });
    const from = this.winK, to = open ? 1 : 0;
    g.tweens.add({ delay: 0.25, dur: 0.75, ease: ease.inOutCubic, update: (k) => this.setWindow(from + (to - from) * k), done: () => {
      this.busyWin = false;
      this.f.window = open;
      if (open) {
        // a breath of air: the dust lifts and drifts in, the wind chime by the sill rings
        g.effects.puff({ pos: V(-3.6, 2.1, 1.85), count: 10, colors: DUST, size: 0.05, speed: 0.5, up: 0.05, gravity: -0.02, life: 2.2, radius: 0.4 });
        audio.play('furin', { pos: V(-3.8, 2.4, 2.05), vol: 0.9 });
        if (!this.f.windowDone) { this.f.windowDone = true; g.story.task('Fresh air at last.'); }
      }
    } });
    audio.play('windowSlide', { pos: p, vol: 0.9, delay: 0.25 });
  }

  // ------------------------------------------------------------------ the sink: the rag, the bin bags under it
  buildSink() {
    const g = this.game, f = this.f;
    this.rag = null;
    if (!f.wiped || f.wiped.length < PATCHES.length) this.placeRag();
    if (!f.binBags) {
      const roll = propMesh('bin_bags', { fallbackSize: [0.2, 0.08, 0.08] });
      roll.position.set(SINK.x - 0.05, 0.157, SINK.z + 0.02);
      roll.rotation.y = 0.2;
      g.scene.add(roll);
      this.roll = roll;
      g.interaction.add(roll, {
        hint: () => (g.held.canTake() ? { key: 'LMB', text: 'Take the bin bags', sub: 'Under the sink, where he said' } : { key: '', text: 'Bin bags', sub: 'Your hands are full' }),
        use: () => {
          if (!g.held.canTake()) return false;
          g.interaction.remove(roll); roll.parent?.remove(roll);
          g.held.giveTool('bin_bags', { uses: 5 });
          f.binBags = true;
          audio.play('bagRustle', { vol: 0.8 });
          g.save();
          return false;
        },
      });
    }
    // the basin: wet the rag
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.42), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(SINK.x, 0.74, SINK.z);
    g.scene.add(hit);
    this.sinkHit = hit;
    g.interaction.add(hit, {
      hint: () => (g.held.holding('rag') ? { key: 'LMB', text: g.held.item.data.wet ? 'Rinse the rag' : 'Wet the rag', sub: 'Cold tap water' } : null),
      use: () => {
        if (!g.held.holding('rag')) return false;
        const it = g.held.item;
        it.data.wet = true;
        it.data.dirt = 0;
        this.hand(V(SINK.x, 0.9, SINK.z));
        audio.play('tap', { pos: V(SINK.x, 0.9, SINK.z), vol: 0.9 });
        g.effects.splash({ pos: V(SINK.x, 0.68, SINK.z + 0.05), color: 0xd8ecff, size: 0.05, count: 6 });
        g.held.swing = 0.5;
        return false;
      },
    });
  }

  placeRag() {
    const g = this.game;
    if (this.rag) return;
    const ent = g.items.spawnTool({ id: 'rag', story: true, wet: false }, V(SINK.x - 0.18, SINK.top + 0.004, SINK.z + 0.18), 0.4);
    this.rag = ent;
  }

  // ------------------------------------------------------------------ the dusty counter (work table)
  buildCounter() {
    const g = this.game, f = this.f, T = g.garage.table;
    PATCHES.forEach(([dx, dz], i) => {
      if (f.wiped.includes(i)) return;
      const mat = dissolveMat(dustPatch(31 + i).texture({ nearest: true }));
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), mat);
      m.rotation.set(-Math.PI / 2, 0, i * 1.3);
      m.position.set(T.x + dx, T.h + 0.0062, T.z + dz);
      g.scene.add(m);
      const pt = { i, m, k: 0 };
      this.patches.push(pt);
      g.interaction.add(m, {
        hint: () => {
          if (g.held.holding('rag')) return g.held.item.data.wet ? { key: 'Hold LMB', text: 'Wipe the counter', sub: pt.k > 0 ? `${Math.round(pt.k * 100)}%` : 'Dust and old tea rings' } : { key: '', text: 'Dusty counter', sub: 'Wet the rag at the sink first' };
          return { key: '', text: 'Dusty counter', sub: "Grandpa's rag is by the sink" };
        },
        use: () => (g.held.holding('rag') && g.held.item.data.wet ? undefined : false),
        hold: {
          canStart: () => g.held.holding('rag') && g.held.item.data.wet,
          start: () => { pt.next = 0; },
          update: (dt) => this.wipe(pt, dt),
          done: () => pt.k >= 1 || !g.held.item?.data?.wet,
        },
      });
    });
  }

  wipe(pt, dt) {
    const g = this.game, it = g.held.item;
    pt.k = Math.min(1, pt.k + dt / 1.5);
    pt.m.material.opacity = 1 - 0.52 * pt.k;
    pt.next = (pt.next || 0) - dt;
    if (pt.next <= 0) {
      pt.next = 0.3;
      g.held.swing = 0.7;
      audio.play('wipe', { pos: pt.m.position, vol: 0.8 });
      g.effects.puff({ pos: pt.m.position.clone().add(V((Math.random() - 0.5) * 0.2, 0.03, (Math.random() - 0.5) * 0.2)), count: 2, colors: DUST, size: 0.03, speed: 0.15, life: 0.8 });
    }
    // the rag gets grubby and dries out: a rinse every couple of patches
    it.data.dirt = (it.data.dirt || 0) + dt;
    if (it.data.dirt > 3.4) { it.data.wet = false; g.news('The rag is filthy', 'Rinse it at the sink'); }
    if (pt.k < 1) return;
    g.interaction.remove(pt.m);
    pt.m.parent?.remove(pt.m);
    this.patches.splice(this.patches.indexOf(pt), 1);
    this.f.wiped.push(pt.i);
    g.effects.sparks({ pos: pt.m.position.clone().add(V(0, 0.05, 0)), count: 8, colors: [0xffffff, 0xfff0c0], speed: 0.3, size: 0.012, star: 1, life: 0.7 });
    if (!this.patches.length) {
      g.story.task('The counter shines. Well, nearly.');
      // the rag goes back by the tap
      if (g.held.holding('rag')) g.held.consume();
      else for (let i = 0; i < g.held.slots.length; i++) if (g.held.slots[i]?.data?.id === 'rag') g.held.consume(i);
    }
  }

  // ------------------------------------------------------------------ rubbish to bag, cardboard to flatten
  buildRubbish() {
    const g = this.game, f = this.f, S = g.story;
    for (const p of S.pileDefs()) {
      const bag = RUBBISH.includes(p.id), card = CARDBOARD.includes(p.id);
      if (!bag && !card) continue;
      if (f.bagged.includes(p.id) || f.swept.includes(p.id)) continue;
      const m = propMesh(p.prop, { fallbackSize: [0.6, 0.12, 0.5], fallbackColor: 0x8a7a66 });
      m.position.set(p.x, 0.002, p.z); m.rotation.y = p.r;
      g.garage.add(m);
      const st = { def: p, m, k: 0, card };
      this.piles.set(p.id, st);
      g.interaction.add(m, {
        hint: () => {
          if (card) return { key: 'Hold LMB', text: 'Flatten and tie the cardboard', sub: st.k > 0 ? `${Math.round(st.k * 100)}%` : 'For the recycling' };
          if (g.held.holding('bin_bags')) return { key: 'Hold LMB', text: 'Bag up the rubbish', sub: st.k > 0 ? `${Math.round(st.k * 100)}%` : 'Stuff it in, tie the knot' };
          return { key: '', text: 'A heap of old rubbish', sub: f.binBags ? 'Hold the bin bags' : 'Bin bags: under the sink' };
        },
        use: () => (card || g.held.holding('bin_bags') ? undefined : false),
        hold: {
          canStart: () => card || g.held.holding('bin_bags'),
          start: () => { st.next = 0; },
          update: (dt) => this.bagUp(st, dt),
          done: () => st.k >= 1,
          end: () => { if (st.k < 1) st.k = Math.max(0, st.k - 0.2); },
        },
      });
    }
  }

  bagUp(st, dt) {
    const g = this.game, p = st.m.position;
    st.k = Math.min(1, st.k + dt / (st.card ? 1.6 : 1.3));
    st.next -= dt;
    if (st.next <= 0) {
      st.next = 0.32;
      g.held.swing = 0.6;
      audio.play(st.card ? 'flapFold' : 'bagRustle', { pos: p, vol: 0.8 });
      g.effects.puff({ pos: p.clone().add(V(0, 0.08, 0)), count: 3, colors: DUST, size: 0.04, speed: 0.25 });
    }
    const s = 1 - st.k * 0.6;
    st.m.scale.set(s, s, s);
    if (st.k < 1) return;
    g.interaction.remove(st.m);
    st.m.parent?.remove(st.m);
    this.piles.delete(st.def.id);
    this.f.bagged.push(st.def.id);
    const id = st.card ? 'cardboard' : 'trash_bag';
    g.items.spawnTool({ id, story: true, bag: (st.card ? 'c_' : 'r_') + st.def.id }, p.clone(), st.def.r);
    audio.play('bagRustle', { pos: p, vol: 1 });
    if (!st.card) { const it = g.held.item; if (it?.data?.id === 'bin_bags') { it.data.uses = Math.max(0, (it.data.uses ?? 5) - 1); g.events.emit('slot', g.held.sel); } }
    // the last of the rubbish bagged: the roll's spent (one less thing to carry)
    const rubbishLeft = [...this.piles.values()].some((p) => !p.card);
    if (!rubbishLeft) { const i = g.held.find('bin_bags'); if (i >= 0) g.held.consume(i); }
    g.story.task(st.card ? 'Cardboard tied up.' : rubbishLeft ? 'Bagged and knotted.' : 'Bagged and knotted. That was the last bin bag.');
  }

  /** Bags (and cardboard) made from the rubbish but not out yet: back where they were made (story items aren't saved). */
  respawnBags() {
    const g = this.game, f = this.f, S = g.story;
    const carried = new Set(g.held.slots.filter((s) => s?.data?.bag).map((s) => s.data.bag));
    for (const p of S.pileDefs()) {
      if (!f.bagged.includes(p.id)) continue;
      const tag = (CARDBOARD.includes(p.id) ? 'c_' : 'r_') + p.id;
      if (f.bags.includes(tag) || carried.has(tag)) continue;
      g.items.spawnTool({ id: CARDBOARD.includes(p.id) ? 'cardboard' : 'trash_bag', story: true, bag: tag }, V(p.x, 0, p.z), p.r);
    }
  }

  // ------------------------------------------------------------------ Grandpa's junk boxes (one hides the OPEN sign)
  buildJunk() {
    const g = this.game, f = this.f;
    const carried = new Set(g.held.slots.filter((s) => s?.data?.junk).map((s) => s.data.junk));
    for (const J of JUNK) {
      if (f.junkOut.includes(J.id) || carried.has(J.id)) continue;
      if (f.junkOpen.includes(J.id)) { g.items.spawnTool({ id: 'junk_box', story: true, junk: J.id, bag: J.id }, V(J.x, 0, J.z), Math.PI / 2); continue; }
      const m = propMesh('junk_box', { fallbackSize: [0.47, 0.38, 0.4], fallbackColor: 0xc8965a });
      m.position.set(J.x, 0, J.z); m.rotation.y = Math.PI / 2;
      g.scene.add(m);
      const ob = g.player.addObstacle(J.x - 0.21, J.x + 0.21, J.z - 0.25, J.z + 0.25);
      const st = { J, m, ob };
      this.junk.set(J.id, st);
      g.interaction.add(m, {
        hint: () => ({ key: 'LMB', text: 'Look inside', sub: 'PARTS, in his marker' }),
        use: () => { this.openJunk(st); return false; },
      });
      if (J.id === 'j2') this.junkNote = this.life.notes.place('junk', { pos: V(J.x + 0.02, 0.402, J.z + 0.06), flat: true, rotY: -Math.PI / 2, size: 0.14 });
    }
    // the sign: lying where it was found, not yet in your hands
    if (f.junkOpen.includes('j1') && !this.life.s.sign.found && !carried.has('sign')) this.spawnSign(V(JUNK[0].x + 0.35, 0, JUNK[0].z));
  }

  openJunk(st) {
    const g = this.game, f = this.f, J = st.J;
    this.hand(st.m.position.clone().add(V(0, 0.38, 0)));
    audio.play('boxOpen', { pos: st.m.position, vol: 0.9 });
    g.interaction.remove(st.m);
    st.m.parent?.remove(st.m);
    g.player.removeObstacle(st.ob);
    this.junk.delete(J.id);
    if (J.id === 'j2') {
      // the note that was taped on top: read it as you lift the flaps
      const unread = !this.life.notes.isRead('junk');
      this.life.notes.remove('junk');
      if (unread) g.tweens.wait(0.7, () => this.life.notes.open('junk'));
    }
    f.junkOpen.push(J.id);
    // the opened box, ready to carry out
    g.items.spawnTool({ id: 'junk_box', story: true, junk: J.id, bag: J.id }, V(J.x, 0, J.z), Math.PI / 2);
    g.effects.puff({ pos: V(J.x, 0.45, J.z), count: 8, colors: DUST, size: 0.05, speed: 0.4, life: 1.6, radius: 0.2 });
    if (J.sign) {
      // something wooden under the springs and capsule halves...
      this.spawnSign(V(J.x + 0.38, 0, J.z), true);
      g.story.task("Grandpa's old OPEN sign! Keep that.");
    } else g.story.task('Rusty springs and a bent crank. Junk.');
    g.save();
  }

  spawnSign(pos, pop = false) {
    const g = this.game;
    const ent = g.items.spawnTool({ id: 'open_sign' }, pos, Math.PI / 2 + 0.3);
    if (pop) {
      const o = ent.obj, y1 = o.position.y;
      g.tweens.add({ dur: 0.55, ease: ease.outBounce, update: (k) => { o.position.y = y1 + 0.45 * (1 - k); }, done: () => audio.play('drop', { pos: o.position, vol: 0.6 }) });
    }
    return ent;
  }

  onPickup(ent) {
    const g = this.game;
    if (ent?.kind === 'tool' && ent.data?.id === 'open_sign' && !this.life.s.sign.found) {
      this.life.s.sign.found = true;
      // tucked in the frame, a card in his hand
      g.tweens.wait(0.5, () => this.life.notes.open('sign'));
    }
  }

  // ------------------------------------------------------------------ the cash tray on the counter
  buildTray(done = false) {
    const g = this.game, f = this.f;
    // stacks of 100-yen coins in the tray: one merged mesh
    const silver = new THREE.MeshStandardMaterial({ color: 0xd8dbe2, metalness: 0.85, roughness: 0.3 });
    const stacks = [];
    for (let i = 0; i < 6; i++) {
      const h = 0.022 * (0.6 + (i * 0.37 % 1) * 0.6);
      const c = new THREE.CylinderGeometry(0.0115, 0.0115, h, 8);
      c.translate(-0.05 + (i % 3) * 0.035, 0.005 + h / 2, -0.02 + Math.floor(i / 3) * 0.035);
      stacks.push(c);
    }
    this.coins = new THREE.Mesh(mergeGeometries(stacks), silver);
    this.coins.position.set(TRAY.x, TRAY.y, TRAY.z);
    this.coins.rotation.y = 0.25;
    this.coins.visible = done || !!f.tray;
    g.scene.add(this.coins);
    if (done || f.tray) return;
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.16), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(TRAY.x, TRAY.y + 0.03, TRAY.z);
    hit.rotation.y = 0.25;
    g.scene.add(hit);
    this.trayHit = hit;
    g.interaction.add(hit, {
      hint: () => (g.held.holding('coin_float') ? { key: 'LMB', text: 'Fill the cash tray', sub: 'Change for the customers' } : { key: '', text: 'The cash tray', sub: f.tin ? 'Empty. The change float goes in here' : 'Empty' }),
      use: () => {
        if (!g.held.holding('coin_float')) return false;
        g.held.consume();
        audio.play('coinPour', { pos: hit.position, vol: 1 });
        this.coins.visible = true;
        g.effects.sparks({ pos: hit.position.clone().add(V(0, 0.06, 0)), count: 10, colors: [0xffffff, 0xd8dbe2], speed: 0.4, size: 0.01, star: 1 });
        f.tray = true;
        g.interaction.remove(hit);
        g.story.task('Change float in the tray. Ready for customers.');
        return false;
      },
    });
  }

  /** The tin's float, into your hands (or onto the rack shelf when they're full). */
  giveFloat(at) {
    const g = this.game;
    if (!g.held.giveTool('coin_float')) g.items.spawnTool({ id: 'coin_float' }, at.clone(), 0);
  }

  // ------------------------------------------------------------------ the first machine arrives in a crate
  onMachineBought(m) {
    const g = this.game, f = this.f;
    if (g.story.done || f.crate || g.machines.length > 1) return;
    // whatever junk still stands in the corner gets shoved aside by the delivery men
    for (const st of [...this.junk.values()]) {
      const S = MACHINE_SLOTS[m.data.slot];
      if (Math.abs(st.J.z - S.z) > 0.6) continue;
      const nz = 3.7 - st.J.z * 0.4;
      st.m.position.set(-1.6, 0, nz);
      g.player.removeObstacle(st.ob);
      st.ob = g.player.addObstacle(-1.81, -1.39, nz - 0.25, nz + 0.25);
      if (st.J.id === 'j2') this.life.notes.place('junk', { pos: V(-1.58, 0.402, nz), flat: true, rotY: -Math.PI / 2, size: 0.14 });
    }
    // bought on the computer: GACHA-MART's men bring the crate round in a little while; carried in by Gen-san's van
    // (a second-hand one from the market, src/market/orders.js): it's here already, crate and all
    const viaVan = !!(g.courier?.busy || g.courier?.visit);
    f.crate = { id: m.data.id, stage: viaVan ? 'straps' : 'wait', t: 24 };
    if (viaVan) { this.buildCrate(m); g.story.task('Your machine is here, still in its crate.'); return; }
    this.hideMachine(m, true);
    g.news('Order confirmed', 'GACHA-MART: the delivery men bring it round shortly', 6000);
  }

  machine() { const c = this.f.crate; return c ? this.game.machines.find((m) => m.data.id === c.id) : null; }

  /** Hide / show a machine (in its crate, then unplugged). */
  hideMachine(m, hide) {
    m.root.visible = !hide;
    m.root.userData.disabled = hide;
    if (m.rope) { m.rope.mesh.visible = !hide; for (const c of m.rope.coins) c.visible = !hide; }
  }

  /** The plate and the banner stay dark until it's plugged in. */
  powerMachine(m, on) {
    m.model.traverse((o) => {
      const mat = o.material;
      if (!mat || Array.isArray(mat) || !mat.emissive) return;
      if (mat.userData.e0 === undefined) mat.userData.e0 = mat.emissiveIntensity;
      mat.emissiveIntensity = on ? mat.userData.e0 : 0;
    });
  }

  restoreCrate() {
    const f = this.f, m = this.machine();
    if (!m) { f.crate = null; return; }
    if (f.crate.stage === 'arriving') f.crate.stage = 'straps';
    if (f.crate.stage === 'wait') this.hideMachine(m, true);
    else if (f.crate.stage !== 'done') this.buildCrate(m);
    if (f.crate.stage !== 'done' && !f.plugged.includes(m.data.id)) this.powerMachine(m, false);
  }

  /** The delivery: a van outside, two men carry the crate in and stand it in the machine's spot. */
  *deliveryScene(c) {
    const g = this.game, m = this.machine(), z = GARAGE.maxZ;
    if (!m) return;
    audio.play('truck', { pos: V(0, 1, 9), vol: 1 });
    yield c.cam({ pos: V(1.6, 1.6, z + 5.2), look: V(0, 1.2, z), dur: 0.01, fov: 58 });
    yield c.fade(1, 0.01);
    yield c.fade(0, 0.6);
    c.say('Delivery! Sign here, please... where do you want it?', 1.2, 'Driver', DRIVER);
    audio.play('doorbell', { pos: V(1.5, 1.6, 4.9), vol: 0.9 });
    yield c.wait(2.0);
    yield c.fade(1, 0.45);
    c.hideSay();
    this.buildCrate(m);
    this.f.crate.stage = 'straps';
    const S = MACHINE_SLOTS[m.data.slot];
    audio.play('thud', { pos: V(S.x, 0.5, S.z), v: 0.9 });
    yield c.cam({ pos: V(S.x + 2.4, 1.5, S.z + 1.4), look: V(S.x, 0.9, S.z), fov: 56 });
    yield c.fade(0, 0.5);
    yield c.all(c.wait(1.6), c.say('Heavy... it\'s all yours. Mind the straps!', 0.8, 'Driver', DRIVER));
    c.hideSay();
    yield c.toPlayer(0.8);
    g.story.task('Your machine is here! Unbox it.');
  }

  buildCrate(m) {
    const g = this.game, f = this.f;
    this.hideMachine(m, f.crate.stage === 'straps' || f.crate.stage === 'sleeve');
    this.powerMachine(m, false);
    m.root.updateMatrixWorld(true);
    m.root.visible = true;
    const bb = new THREE.Box3().setFromObject(m.model);
    if (f.crate.stage === 'straps' || f.crate.stage === 'sleeve') m.root.visible = false;
    m.root.userData.disabled = f.crate.stage !== 'done';
    const size = bb.getSize(V(0, 0, 0)), c = bb.getCenter(V(0, 0, 0));
    const w = size.x + 0.08, d = size.z + 0.08, h = size.y + 0.1;
    const cr = this.crate = { group: new THREE.Group(), straps: [], foam: [], m, w, d, h, c };
    cr.group.position.set(c.x, 0, c.z);
    g.scene.add(cr.group);
    const card = new THREE.MeshStandardMaterial({ map: this.crateTex(), roughness: 0.92 });
    const plain = new THREE.MeshStandardMaterial({ color: 0xc8965a, roughness: 0.95 });
    // pallet
    const wood = new THREE.MeshStandardMaterial({ color: 0xb08850, roughness: 0.9 });
    for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.025, 0.09), wood); s.position.set(0, 0.0125, -d / 2 + 0.05 + i * (d - 0.1) / 3); s.castShadow = true; cr.group.add(s); }
    // the carton sleeve
    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [card, card, plain, plain, card, card]);
    sleeve.position.y = 0.025 + h / 2;
    sleeve.castShadow = true; sleeve.receiveShadow = true;
    cr.group.add(sleeve);
    cr.sleeve = sleeve;
    // two blue PP straps round it
    const strapM = new THREE.MeshStandardMaterial({ color: 0x2f6fd6, roughness: 0.5 });
    for (const y of [0.32, h - 0.25]) {
      const s = new THREE.Group();
      for (const [bw, bd, x, z] of [[w + 0.012, 0.03, 0, d / 2 + 0.003], [w + 0.012, 0.03, 0, -d / 2 - 0.003], [0.03, d + 0.012, w / 2 + 0.003, 0], [0.03, d + 0.012, -w / 2 - 0.003, 0]]) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(bw === 0.03 ? 0.006 : bw, 0.03, bw === 0.03 ? bd : 0.006), strapM);
        b.position.set(x, 0, z); s.add(b);
      }
      s.position.y = 0.025 + y;
      cr.group.add(s);
      cr.straps.push(s);
    }
    // foam corner blocks (on the machine's top, once the sleeve is off)
    const foamM = new THREE.MeshStandardMaterial({ color: 0xf4f6f4, roughness: 0.95 });
    for (const sx of [-1, 1]) {
      const fb = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, d - 0.02), foamM);
      fb.position.set(sx * (w / 2 - 0.08), size.y + 0.03, 0);
      fb.visible = false;
      cr.group.add(fb);
      cr.foam.push(fb);
    }
    // the stage we're at
    const stage = f.crate.stage;
    const cut = f.crate.cut || (f.crate.cut = []), foamOff = f.crate.foam || (f.crate.foam = []);
    cr.straps.forEach((s, i) => { if (cut.includes(i)) s.visible = false; });
    if (stage === 'foam' || stage === 'plug') { sleeve.visible = false; cr.foam.forEach((fb, i) => { fb.visible = !foamOff.includes(i) && stage === 'foam'; }); }
    // clicks
    cr.straps.forEach((s, i) => g.interaction.add(s, {
      hint: () => (s.visible && this.f.crate?.stage === 'straps' ? { key: 'LMB', text: 'Cut the strap', sub: 'Snip!' } : null),
      use: () => { this.cutStrap(i); return false; },
    }));
    g.interaction.add(sleeve, {
      hint: () => {
        const st = this.f.crate?.stage;
        if (st === 'straps') return { key: '', text: 'Machine crate', sub: 'Cut the straps first' };
        if (st === 'sleeve') return { key: 'Hold LMB', text: 'Lift off the carton', sub: cr.lift > 0 ? `${Math.round(cr.lift * 100)}%` : 'Careful, it\'s tall' };
        return null;
      },
      use: () => (this.f.crate?.stage === 'sleeve' ? undefined : false),
      hold: {
        canStart: () => this.f.crate?.stage === 'sleeve',
        start: () => { cr.lift = cr.lift || 0; },
        update: (dt) => this.liftSleeve(dt),
        done: () => this.f.crate?.stage !== 'sleeve',
        end: () => { if (this.f.crate?.stage === 'sleeve') { cr.lift = 0; sleeve.position.y = 0.025 + h / 2; } },
      },
    });
    cr.foam.forEach((fb, i) => g.interaction.add(fb, {
      hint: () => (fb.visible ? { key: 'LMB', text: 'Pull out the foam block', sub: 'Squeak' } : null),
      use: () => { this.pullFoam(i); return false; },
    }));
    if (stage === 'plug') this.buildPlug(m);
    // something to bump into
    cr.ob = stage === 'straps' || stage === 'sleeve' ? g.player.addObstacle(c.x - w / 2, c.x + w / 2, c.z - d / 2, c.z + d / 2) : null;
  }

  crateTex() {
    const p = new Pix(48, 64, 9);
    p.fill(0xc89a5f); p.noise(0.06);
    p.rect(0, 0, 48, 10, 0xe5383b); p.tinyText('GACHA-MART', 24, 2, { color: 0xffffff, align: 'center' });
    p.tinyText('FRAGILE', 24, 18, { color: 0xd8282a, align: 'center' });
    p.tinyText('THIS', 24, 30, { color: 0x2a2020, align: 'center' }); p.tinyText('SIDE UP', 24, 39, { color: 0x2a2020, align: 'center' });
    for (const x of [12, 36]) { p.rect(x - 1, 50, 2, 9, 0x2a2020); p.rect(x - 3, 52, 6, 1, 0x2a2020); p.rect(x - 2, 51, 4, 1, 0x2a2020); }
    return p.texture();
  }

  cutStrap(i) {
    const g = this.game, f = this.f, cr = this.crate, s = cr?.straps[i];
    if (!s?.visible || f.crate.stage !== 'straps') return;
    const p = s.getWorldPosition(V(0, 0, 0)).add(V(cr.w / 2, 0, 0));
    this.hand(p);
    audio.play('snip', { pos: p, vol: 1 });
    f.crate.cut.push(i);
    const y0 = s.position.y;
    g.tweens.add({ delay: 0.15, dur: 0.5, ease: ease.inQuad, update: (k) => { s.position.y = y0 - k * y0; s.scale.set(1 + k * 0.15, 1, 1 + k * 0.15); }, done: () => { s.visible = false; g.interaction.remove(s); } });
    if (f.crate.cut.length >= cr.straps.length) { f.crate.stage = 'sleeve'; g.story.task('Straps cut.'); }
    g.save();
  }

  liftSleeve(dt) {
    const g = this.game, f = this.f, cr = this.crate;
    cr.lift = Math.min(1, (cr.lift || 0) + dt / 1.3);
    cr.sleeve.position.y = 0.025 + cr.h / 2 + cr.lift * 0.35;
    g.player.shake = Math.max(g.player.shake, 0.12);
    if (cr.lift < 1) return;
    // off it comes: the sleeve folds flat (cardboard for the trash), the machine stands there in its foam
    f.crate.stage = 'foam';
    audio.play('flapFold', { pos: cr.sleeve.position, vol: 1 });
    cr.sleeve.visible = false;
    g.interaction.remove(cr.sleeve);
    if (cr.ob) { g.player.removeObstacle(cr.ob); cr.ob = null; }
    this.hideMachine(cr.m, false);
    cr.m.root.userData.disabled = true;
    for (const fb of cr.foam) fb.visible = true;
    g.items.spawnTool({ id: 'cardboard', story: true, bag: 'sleeve' }, V(cr.c.x + 0.9, 0, cr.c.z + 0.2), 0.3);
    g.effects.puff({ pos: V(cr.c.x, 1.0, cr.c.z), count: 10, colors: DUST, size: 0.05, speed: 0.5, life: 1.6, radius: 0.4 });
    g.story.task('There it is!');
    g.save();
  }

  pullFoam(i) {
    const g = this.game, f = this.f, cr = this.crate, fb = cr?.foam[i];
    if (!fb?.visible) return;
    const p = fb.getWorldPosition(V(0, 0, 0));
    this.hand(p);
    audio.play('squeegee', { pos: p, vol: 0.8 });
    f.crate.foam.push(i);
    const p0 = fb.position.clone();
    g.tweens.add({ delay: 0.15, dur: 0.35, update: (k) => { fb.position.set(p0.x + k * 0.5 * Math.sign(p0.x || 1), p0.y + Math.sin(k * Math.PI) * 0.15, p0.z); }, done: () => { fb.visible = false; g.interaction.remove(fb); g.effects.puff({ pos: fb.getWorldPosition(V(0, 0, 0)), count: 5, color: 0xf4f6f4, size: 0.04 }); } });
    if (f.crate.foam.length >= cr.foam.length) {
      f.crate.stage = 'plug';
      this.buildPlug(cr.m);
      g.story.task('Unboxed. Now plug it in.');
    }
    g.save();
  }

  buildPlug(m) {
    const g = this.game, f = this.f, S = MACHINE_SLOTS[m.data.slot];
    if (this.plug) return;
    const grp = new THREE.Group();
    const white = new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.5 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.06), white);
    grp.add(body);
    for (const dz of [-0.008, 0.008]) { const pin = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.003, 0.004), new THREE.MeshStandardMaterial({ color: 0xd8dce0, metalness: 0.9, roughness: 0.3 })); pin.position.set(-0.034, 0, dz); grp.add(pin); }
    const cord = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.012, 0.012), new THREE.MeshStandardMaterial({ color: 0x1e1e1e, roughness: 0.6 }));
    cord.position.set(0.17, -0.008, 0);
    grp.add(cord);
    grp.position.set(S.x - 0.32, 0.014, S.z + 0.33);
    grp.rotation.y = 0.4;
    g.scene.add(grp);
    this.plug = grp;
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.18), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.copy(grp.position);
    g.scene.add(hit);
    this.plugHit = hit;
    g.interaction.add(hit, {
      reach: 2.6,
      hint: () => ({ key: 'LMB', text: 'Plug it in', sub: 'The socket behind the machine' }),
      use: () => { this.plugIn(m); return false; },
    });
    void f;
  }

  plugIn(m) {
    const g = this.game, f = this.f, S = MACHINE_SLOTS[m.data.slot], pl = this.plug;
    if (!pl || this.plugging) return;
    this.plugging = true;
    const to = V(GARAGE.minX + 0.075, 0.39, S.z + 0.3);
    this.hand(pl.position);
    g.interaction.remove(this.plugHit);
    const from = pl.position.clone(), q0 = pl.quaternion.clone(), q1 = new THREE.Quaternion();
    g.tweens.add({ delay: 0.2, dur: 0.45, ease: ease.inOutCubic, update: (k) => { pl.position.lerpVectors(from, to, k); pl.position.y += Math.sin(k * Math.PI) * 0.15; pl.quaternion.slerpQuaternions(q0, q1, k); }, done: () => {
      audio.play('plugIn', { pos: to, vol: 1 });
      g.effects.sparks({ pos: to.clone().add(V(0.03, 0, 0)), count: 7, colors: [0xfff4a0, 0x9fe0ff], speed: 0.6, size: 0.01, gravity: 0.6, life: 0.4, star: 0.7 });
      this.powerMachine(m, true);
      m.root.userData.disabled = false;
      f.plugged.push(m.data.id);
      f.crate.stage = 'done';
      g.tweens.wait(0.25, () => { audio.play('jingleSmall', { vol: 0.5 }); g.story.task('It lights up! Now, capsules.'); });
      this.crate?.group.parent?.remove(this.crate.group);
      g.save();
    } });
  }

  // ------------------------------------------------------------------ per frame
  update(dt) {
    const g = this.game, f = this.f;
    this.t += dt;
    const c = f?.crate;
    if (c && c.stage === 'wait' && !g.cutscene.active && !g.pc?.active && !g.uiOpen) {
      c.t -= dt;
      if (c.t <= 0) { c.stage = 'arriving'; g.cutscene.play((cs) => this.deliveryScene(cs)); }
    }
    if (c && c.stage === 'arriving' && !g.cutscene.active) c.stage = this.crate ? 'straps' : 'wait';
  }

  toolHint() { return null; }
}
