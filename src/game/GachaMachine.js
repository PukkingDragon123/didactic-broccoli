// A gacha machine in the world.
//  * Customers pay the price on the machine's price plate: their ¥100 coins drop into its coin box (customerPlay).
//    You collect them by hand: unlock the coin box drawer, scoop the coins into your coin bag, push it shut.
//  * The price plate has -/+ buttons (¥100 steps) and shows the recommended price (game.sim, when there is one).
//  * Restocking is physical, in small steps: with a capsule carton in your hands, unlock and lift the lid, cut the
//    carton's tape, fold its flaps open, then put the capsules in one by one (hold to pour the rest once you're
//    going); a new series swaps the display card. Close and lock the lid when you're done.
//  * The owner's test play: the fake coin on a rope, the ratchet crank, capsule pile physics behind the window,
//    dispensing through the flap into the tray.
// Events: machinePlay { machine, price, series, customer }, coinsCollected { machine, amount }, machinePrice
// { machine, price }, machineRestock { machine, series, n }.
import * as THREE from 'three';
import { buildMachineModel, MACHINE_SPECS, VS, yenCoinGeometry } from '../world/machineModels.js';
import { MACHINE_SLOTS } from '../world/Garage.js';
import { Physics } from '../core/physics.js';
import { Rope } from './Rope.js';
import { audio } from '../core/audio.js';
import { ease } from '../core/util.js';
import { capsuleColor, capsuleRadius, capsuleSize, capsuleStyle, pileGeometries, makeCapsule } from './Capsule.js';
import { SERIES_BY_ID } from '../data/series/index.js';
import { capacityFor, crankTime, rollCapsule, MACHINE_TYPES } from './economy.js';
import { bannerTexture } from '../gfx/banner.js';
import { makeItemMesh, itemGeometry, hasItemGeometry } from './collectibles.js';
import { mergeByMaterial, partsBox } from '../voxel/merge.js';
import { FONT_EN } from '../gfx/pix.js';
import { voxelMaterials } from '../voxel/materials.js';
import { pocketCash } from './cash.js';
import { capBoxOf, openBoxStep } from './capsuleBox.js';
import { VoxelModel, metal } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import './gachaSfx.js';

const _m = new THREE.Matrix4();
const _s = new THREE.Vector3(1, 1, 1);
const _q = new THREE.Quaternion();
const _ax = new THREE.Vector3();
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3();
const PRICE_MIN = 100, PRICE_MAX = 3000;
const MAX_COINS_SHOWN = 40;
const HAND_PLACED_BEFORE_POUR = 3;

/** A little machine key (lid and coin box locks). */
let keyGeo = null;
function keyMesh() {
  if (!keyGeo) {
    const v = new VoxelModel();
    v.jitter = 0;
    const b = metal(0xd8b850), s = metal(0xd8dde4);
    v.ring(0, 3, 0, b, 'z');
    v.box(0, -6, 0, 0, 0, 0, s);
    v.set(1, -5, 0, s); v.set(1, -3, 0, s);
    keyGeo = meshVoxels(v, { voxelSize: 0.0028, origin: 'center' });
  }
  const m = new THREE.Mesh(keyGeo, voxelMaterials('normal'));
  m.userData.noRim = true;
  return m;
}

export class GachaMachine {
  constructor(game, data) {
    this.game = game;
    this.data = data;
    if (data.price === undefined) data.price = this.recommended;
    if (data.cash === undefined) data.cash = 0;
    this.init();
  }

  init() {
    const game = this.game, data = this.data;
    // data.at = { x, z, rotY }: a machine standing outside the garage (the annex, the Kaikan: src/growth/machines.js)
    const slot = data.at || MACHINE_SLOTS[data.slot];
    this.root = new THREE.Group();
    this.root.position.set(slot.x, 0, slot.z);
    this.root.rotation.y = slot.rotY;
    game.scene.add(this.root);
    this.root.updateMatrixWorld(true);
    this.ext = 0;
    const built = buildMachineModel(data.type, { no: data.no ?? (data.slot || 0) + 1 });
    this.parts = built;
    this.model = built.group;
    this.L = built.L;
    this.spec = MACHINE_SPECS[data.type];
    this.body = built.body;
    this.bannerMesh = built.bannerMesh;
    this.domeAnchor = built.domeAnchor;
    this.handleGroup = built.handleGroup;
    this.handleMesh = built.handlePivot;
    this.root.add(this.model);
    this.state = 'idle';
    this.angle = 0;
    this.inserted = 0;
    this.shake = 0;
    this.lid = { k: 0, target: 0, locked: true, busy: false, key: null };
    this.drawer = { k: 0, target: 0, open: false, busy: false, key: null };
    this.flap = { pivot: built.flapPivot, open: 0, target: 0 };
    this.placed = 0;
    this.pourT = 0;
    this.holdMode = null;
    this.spin = null;
    this.buildSoldOut();
    this.buildBanner();
    this.buildPile();
    this.buildCoins();
    this.buildColliders();
    this.buildRope();
    this.rope.setCoins(1);
    this.drawPrice();
    this.updateSoldOut();
    this.registerInteract();
  }

  /** Tear down and rebuild in place. */
  rebuild() {
    this.dispose();
    this.init();
  }

  // ------------------------------------------------------------------ public API
  /** Coin price of one turn (¥, a multiple of 100). */
  get price() { return this.data.price; }
  set price(v) {
    const p = Math.max(PRICE_MIN, Math.min(PRICE_MAX, Math.round(v / 100) * 100));
    if (p === this.data.price) return;
    this.data.price = p;
    this.drawPrice();
    this.game.events.emit('machinePrice', { machine: this, price: p });
  }
  /** Yen in the coin box. */
  get cash() { return this.data.cash || 0; }
  get isEmpty() { return this.data.stock.length <= 0; }
  get capacity() { return capacityFor({ type: this.data.type }); }
  /** Recommended price: the sim's demand model when there is one, else the series' list price. */
  get recommended() {
    const r = this.game.sim?.recommendedPrice?.(this);
    if (r) return Math.max(PRICE_MIN, Math.round(r / 100) * 100);
    return Math.max(PRICE_MIN, Math.round((SERIES_BY_ID[this.data.series]?.price || 100) / 100) * 100);
  }
  get lidOpen() { return this.lid.target > 0 || this.lid.k > 0.02; }
  /** Can a customer play right now? */
  canPlay() { return !this.data.broken && !this.data.fallen && !this.isEmpty && !this.lidOpen && this.state === 'idle' && !this.spin; }
  // kept for older callers (upgrades are gone)
  get hasMotor() { return false; }
  get coins() { return 1; }
  applyUpgrades() {}

  /**
   * A customer's turn: the right number of ¥100 coins go into the coin box, the handle turns, one capsule comes
   * out of the chute. Returns { series, price, coins } or null when the machine can't be played.
   */
  customerPlay() {
    if (!this.canPlay()) return null;
    const g = this.game, price = this.price, n = Math.max(1, Math.round(price / 100));
    this.data.cash = this.cash + price;
    const series = this.takeCapsule();
    const slotP = this.local(this.L.slot.x, this.L.slot.y, this.L.front + 0.02);
    for (let i = 0; i < Math.min(n, 10); i++) g.tweens.wait(i * 0.13, () => audio.play('coinInsert', { pos: slotP, vol: 0.55 }));
    const t0 = Math.min(n, 10) * 0.13 + 0.2;
    g.tweens.wait(t0, () => { this.spin = { t: 0, dur: 0.85 }; });
    g.tweens.wait(t0 + 0.9, () => { audio.play('gachan', { pos: this.local(0, this.L.handle.y, this.L.front), vol: 0.8 }); this.openFlap(); });
    this.updateCoins();
    this.updateSoldOut();
    g.events.emit('machinePlay', { machine: this, price, series, customer: true });
    return { series, price, coins: n };
  }

  /** Take one capsule out of the stock (and the lowest one out of the window pile). Returns its series. */
  takeCapsule(prefer = null) {
    const st = this.data.stock;
    if (!st.length) return null;
    let idx = prefer ? st.indexOf(prefer) : -1;
    if (idx < 0) idx = Math.floor(Math.random() * st.length);
    const series = st.splice(idx, 1)[0];
    if (this.pile.length) {
      let best = -1, bestY = Infinity;
      for (let i = 0; i < this.pile.length; i++) {
        const b = this.pile[i];
        const y = b.pos.y - (b.userData.series === series ? 0.03 : 0);
        if (y < bestY) { bestY = y; best = i; }
      }
      const b = this.pile.splice(best, 1)[0];
      this.lastColor = b.userData.color;
      this.pileWorld.removeBody(b);
      for (const o of this.pile) o.wake();
      this.pileActive = 2;
      if (st.length > this.pile.length && this.pile.length < this.maxVisible) this.addPileCapsule(st[this.pile.length]);
      this.syncPile(0);
    } else this.lastColor = null;
    return series;
  }

  /** Empty the coin box into your coin bag. Returns the amount. */
  collect() {
    const amount = this.cash;
    if (amount <= 0) return 0;
    this.data.cash = 0;
    const from = this.coinAnchorWorld();
    this.updateCoins();
    pocketCash(this.game, amount, from, { coins: Math.min(MAX_COINS_SHOWN, Math.ceil(amount / 100)), label: `Coin box of machine No.${this.data.no ?? (this.data.slot || 0) + 1}` });
    this.game.events.emit('coinsCollected', { machine: this, amount });
    this.game.save();
    return amount;
  }

  // ------------------------------------------------------------------ construction
  local(x, y, z) { return this.root.localToWorld(new THREE.Vector3(x, y, z)); }

  buildSoldOut() {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 28;
    const ctx = c.getContext('2d');
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter;
    ctx.fillStyle = '#d8282a'; ctx.fillRect(0, 0, 64, 28);
    ctx.fillStyle = '#fbf2e0'; ctx.fillRect(2, 2, 60, 1); ctx.fillRect(2, 25, 60, 1); ctx.fillRect(2, 2, 1, 24); ctx.fillRect(61, 2, 1, 24);
    ctx.font = `16px ${FONT_EN}`; ctx.textBaseline = 'top';
    const t = 'SOLD OUT';
    ctx.fillText(t, Math.round(32 - ctx.measureText(t).width / 2), 6);
    tex.needsUpdate = true;
    // the flag drops down over the coin slot
    const S = this.L.slot;
    const pivot = new THREE.Group();
    pivot.position.set(S.x, S.y + 0.034, this.L.front + VS * 3);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.033), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, side: THREE.DoubleSide }));
    plate.position.y = -0.019;
    plate.userData.noRim = true;
    pivot.add(plate);
    pivot.rotation.x = -Math.PI * 0.95;
    this.root.add(pivot);
    this.soldOut = { pivot, k: 0 };
  }

  /** The display card inside the window + the sample figures in the topper. */
  buildBanner() {
    const series = this.data.series || 'mochi';
    this.cardSeries = series;
    const tex = bannerTexture(series, this.game.thumbs, { faded: this.data.type === 'retro' });
    const m = this.bannerMesh.material;
    m.map = tex; m.emissiveMap = tex; m.color.set(0xffffff); m.emissiveIntensity = 0.1; m.needsUpdate = true;
    const A = this.domeAnchor;
    A.clear();
    this.disposeFigures();
    // machines come bare: the sample hood on the lid is put away, and a display top (src/display/) is what shows
    // figures up there now, so no sample figures are built
    return;
    const S = SERIES_BY_ID[series];
    const D = this.L.dome;
    const pick = (r, n = 0) => S.items.filter((i) => i.rarity === r)[n];
    const wide = D.w >= 0.3;
    const keys = (wide ? [pick('common', 0), pick('rare'), pick('ultra'), pick('uncommon', 0)] : [pick('common', 0), pick('ultra'), pick('uncommon', 0)]).filter(Boolean).map((i) => i.key);
    const turn = new THREE.Group();
    A.add(turn);
    this.turntable = this.spec.style.crown ? turn : null;
    const n = keys.length;
    const cell = (D.w - 0.02) / n;
    // performance: the sample figures are drawn as one merged mesh (one draw call per material, not per figure and
    // material). Each figure keeps its own level of detail as in src/game/collectibles.js (coarse voxels, the up-res
    // ones within 1.7 m of the camera, back beyond 2.1 m): the merged geometry is the matching mix (see updateFigures).
    const figs = keys.map((k, i) => {
      const fig = makeItemMesh(k, 'normal');
      const sz = fig.geometry.userData.size;
      const sc = Math.min(1, (D.h - 0.02) / sz.y, (cell - 0.01) / Math.max(sz.x, sz.z));
      fig.scale.setScalar(sc);
      fig.position.set(-D.w / 2 + 0.01 + cell * (i + 0.5), 0, (i % 2 ? -0.02 : 0.015));
      fig.rotation.y = -(i - (n - 1) / 2) * 0.28;
      fig.updateMatrix();
      const lod = fig.userData.lod; // (unset: one detail level only)
      return { key: k, matrix: fig.matrix, pos: fig.position, lod: !!lod, hi: !lod || lod.hi, geo: fig.geometry, mats: fig.material };
    });
    if (!figs.length) return;
    const F = this.figs = { list: figs, turn, t: 0, cache: new Map(), mask: -1, mesh: new THREE.Mesh(undefined, figs[0].mats) };
    F.mesh.castShadow = false; F.mesh.receiveShadow = true;
    F.mesh.userData.figures = keys;
    this.setFigureMask(figs.reduce((m, f, i) => m | (f.hi ? 1 << i : 0), 0));
    turn.add(F.mesh);
  }

  disposeFigures() { if (this.figs) for (const g of this.figs.cache.values()) g.dispose(); this.figs = null; }

  /** The merged sample figures with figure i up-res when bit i of mask is set. */
  setFigureMask(mask) {
    const F = this.figs;
    if (!F || mask === F.mask) return;
    F.mask = mask;
    let g = F.cache.get(mask);
    if (!g) {
      g = mergeByMaterial(F.list.map((f, i) => ({ geometry: !f.lod ? f.geo : itemGeometry(f.key, (mask >> i) & 1 ? {} : { lowres: true }), matrix: f.matrix })));
      F.cache.set(mask, g);
    }
    F.mesh.geometry = g;
  }

  /** Detail levels of the sample figures by distance (the same rule and rate as updateItemLod in collectibles.js). */
  updateFigures(dt) {
    const F = this.figs;
    if (!F || !F.list.some((f) => f.lod) || (F.t -= dt) > 0) return;
    F.t = 0.1;
    const cam = this.game.camera.getWorldPosition(_v);
    let mask = F.mask, built = 0;
    F.list.forEach((f, i) => {
      if (!f.lod) return;
      const d2 = F.turn.localToWorld(_v2.copy(f.pos)).distanceToSquared(cam), hi = (mask >> i) & 1;
      if (!hi && d2 < 1.7 * 1.7) {
        if (!hasItemGeometry(f.key)) { if (built >= 1) return; built++; }
        mask |= 1 << i;
      } else if (hi && d2 > 2.1 * 2.1) mask &= ~(1 << i);
    });
    this.setFigureMask(mask);
  }

  /** Slide the old card up out of the open top and the new one down into its slot. */
  swapCard(series) {
    if (series === this.cardSeries) return;
    const g = this.game, H = this.parts.bannerHolder, y0 = this.L.banner.y, lift = this.L.banner.h + 0.08;
    this.cardSeries = series;
    if (!this.lidOpen) { this.buildBanner(); return; }
    audio.play('paper', { pos: H.getWorldPosition(_v), vol: 0.9 });
    g.tweens.add({
      dur: 0.45, ease: ease.inOutCubic, update: (k) => { H.position.y = y0 + lift * k; },
      done: () => {
        this.data.series = series;
        this.buildBanner();
        g.tweens.add({ dur: 0.5, ease: ease.outCubic, update: (k) => { H.position.y = y0 + lift * (1 - k); }, done: () => audio.play('flap', { pos: H.getWorldPosition(_v), vol: 0.6 }) });
      },
    });
  }

  buildPile() {
    const W = this.L.window;
    this.pileWorld = new Physics();
    const pw = this.pileWorld;
    const t = 0.05;
    const cx = (W.x0 + W.x1) / 2, cy = (W.y0 + W.y1) / 2, cz = (W.z0 + W.z1) / 2;
    const hx = (W.x1 - W.x0) / 2, hy = (W.y1 - W.y0) / 2, hz = (W.z1 - W.z0) / 2;
    const B = (x, y, z, a, b, c) => pw.addBox({ center: new THREE.Vector3(x, y, z), half: new THREE.Vector3(a, b, c), material: 'metal', restitution: 0.3 });
    B(cx, W.y0 - t, cz, hx + t, t, hz + t); // floor
    B(cx, W.y1 + 0.6, cz, hx + t, t, hz + t); // ceiling (high, for pouring)
    B(W.x0 - t, cy + 0.3, cz, t, hy + 0.4, hz + t);
    B(W.x1 + t, cy + 0.3, cz, t, hy + 0.4, hz + t);
    B(cx, cy + 0.3, W.z0 - t, hx + t, hy + 0.4, t);
    B(cx, cy + 0.3, W.z1 + t, hx + t, hy + 0.4, t);
    // capsules slump toward the middle like over a real drum
    pw.addBox({ center: new THREE.Vector3(W.x0 - 0.02, W.y0, cz), half: new THREE.Vector3(0.06, 0.03, hz), quat: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -0.4) });
    pw.addBox({ center: new THREE.Vector3(W.x1 + 0.02, W.y0, cz), half: new THREE.Vector3(0.06, 0.03, hz), quat: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.4) });
    const vol = (W.x1 - W.x0) * (W.y1 - W.y0) * (W.z1 - W.z0);
    const r = capsuleRadius(this.data.series);
    this.maxVisible = Math.min(64, Math.floor(vol / Math.pow(r * 2, 3) * 0.6));
    this.pileSets = new Map(); // style|size -> { bot, top } instanced meshes
    this.pile = [];
    this.pileActive = 0;
    const visible = Math.min(this.data.stock.length, this.maxVisible);
    for (let i = 0; i < visible; i++) this.addPileCapsule(this.data.stock[i], true);
    for (let i = 0; i < 160; i++) pw.step(1 / 60);
    this.syncPile(0);
  }

  pileSet(series) {
    const size = capsuleSize(series), kind = capsuleStyle(series);
    const key = kind === 'paper' ? `${kind}|${size}|${series}` : `${kind}|${size}`;
    let set = this.pileSets.get(key);
    if (!set) {
      const pg = pileGeometries(size, kind, series);
      const N = this.maxVisible + 6;
      const bot = new THREE.InstancedMesh(pg.bottom, pg.bottomMat, N), top = new THREE.InstancedMesh(pg.top, pg.topMat, N);
      for (const im of [bot, top]) { im.count = 0; im.frustumCulled = false; im.userData.noRim = true; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.root.add(im); }
      bot.castShadow = true;
      top.renderOrder = 2;
      set = { bot, top, paper: kind === 'paper' };
      this.pileSets.set(key, set);
    }
    return set;
  }

  /** Add one capsule to the window pile: dropped in from above, or (initial) already settled. at: local position. */
  addPileCapsule(seriesId, initial = false, at = null) {
    const W = this.L.window;
    const r = capsuleRadius(seriesId);
    const pos = at ? at.clone() : initial
      ? new THREE.Vector3(THREE.MathUtils.lerp(W.x0 + r, W.x1 - r, Math.random()), W.y0 + r + this.pile.length * 0.01 + Math.random() * 0.05, THREE.MathUtils.lerp(W.z0 + r, W.z1 - r, Math.random()))
      : new THREE.Vector3(THREE.MathUtils.lerp(W.x0 + r, W.x1 - r, Math.random()), W.y1 + 0.04 + Math.random() * 0.1, THREE.MathUtils.lerp(W.z0 + r, W.z1 - r, Math.random()));
    const b = this.pileWorld.addBody({ radius: r, position: pos, velocity: new THREE.Vector3((Math.random() - 0.5) * 0.3, -0.6, (Math.random() - 0.5) * 0.3), restitution: 0.35, friction: 0.4, rollDamping: 3, linearDamping: 0.2 });
    b.userData.q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6));
    b.userData.color = capsuleColor(seriesId);
    b.userData.series = seriesId;
    b.userData.set = this.pileSet(seriesId);
    this.pile.push(b);
    this.pileActive = Math.max(this.pileActive, 2.5);
    return b;
  }

  syncPile(dt) {
    const col = new THREE.Color();
    for (const set of this.pileSets.values()) set.n = 0;
    for (const b of this.pile) {
      const w = b.angVel.length();
      if (w > 1e-4 && dt > 0) { _ax.copy(b.angVel).divideScalar(w); _q.setFromAxisAngle(_ax, w * dt); b.userData.q.premultiply(_q); }
      _m.compose(b.pos, b.userData.q, _s);
      const set = b.userData.set, i = set.n++;
      set.bot.setMatrixAt(i, _m);
      set.top.setMatrixAt(i, _m);
      if (!set.paper) set.bot.setColorAt(i, col.set(b.userData.color));
      if (!set.paper && set.top.material === set.bot.material) set.top.setColorAt(i, col.set(b.userData.color));
    }
    for (const set of this.pileSets.values()) {
      set.bot.count = set.top.count = set.n;
      set.bot.instanceMatrix.needsUpdate = true;
      set.top.instanceMatrix.needsUpdate = true;
      if (set.bot.instanceColor) set.bot.instanceColor.needsUpdate = true;
      if (set.top.instanceColor) set.top.instanceColor.needsUpdate = true;
    }
  }

  /** Voxel ¥100 coins in the coin box drawer (instanced). */
  buildCoins() {
    const im = new THREE.InstancedMesh(yenCoinGeometry(), voxelMaterials('normal'), MAX_COINS_SHOWN);
    im.count = 0;
    im.userData.part = 'coinbox';
    im.castShadow = true;
    this.parts.coinAnchor.add(im);
    this.coinMesh = im;
    const CB = this.L.coinBox;
    this.coinArea = { w: CB.x1 - CB.x0 - VS * 4, d: CB.depth - VS * 4 };
    this.updateCoins();
  }

  updateCoins() {
    const n = Math.min(MAX_COINS_SHOWN, Math.ceil(this.cash / 100));
    const A = this.coinArea, im = this.coinMesh;
    let seed = 11;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const cols = Math.max(1, Math.floor(A.w / 0.026)), rows = Math.max(1, Math.floor(A.d / 0.026));
    for (let i = 0; i < n; i++) {
      const cell = i % (cols * rows), layer = Math.floor(i / (cols * rows));
      const cx = (cell % cols + 0.5) / cols * A.w + (rnd() - 0.5) * 0.008;
      const cz = (Math.floor(cell / cols) + 0.5) / rows * A.d + (rnd() - 0.5) * 0.008;
      _q.setFromEuler(new THREE.Euler((rnd() - 0.5) * 0.4, rnd() * 6, (rnd() - 0.5) * 0.4));
      _m.compose(_v.set(cx, 0.003 + layer * 0.0032, cz), _q, _s);
      im.setMatrixAt(i, _m);
    }
    im.count = n;
    im.instanceMatrix.needsUpdate = true;
  }

  coinAnchorWorld() {
    const A = this.coinArea;
    return this.parts.coinAnchor.localToWorld(new THREE.Vector3(A.w / 2, 0.01, A.d / 2));
  }

  buildColliders() {
    const L = this.L, O = L.outlet, T = L.tray;
    const ph = this.game.physics;
    const q = this.root.quaternion;
    this.colliders = [];
    const box = (x0, x1, y0, y1, z0, z1, mat = 'metal', extraQ = null) => {
      const c = this.local((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      const quat = extraQ ? q.clone().multiply(extraQ) : q;
      this.colliders.push(ph.addBox({ center: c, half: new THREE.Vector3((x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2), quat, material: mat }));
    };
    const hw = L.w / 2, hd = L.d / 2;
    box(-hw, hw, O.y1 + 0.004, L.top, -hd, hd);
    box(-hw, O.x0, L.y0, O.y1 + 0.004, -hd, hd);
    box(O.x1, hw, L.y0, O.y1 + 0.004, -hd, hd);
    box(O.x0, O.x1, L.y0, O.y1, -hd, L.front - 0.14);
    box(-hw - 0.02, hw + 0.02, 0, L.y0, -hd - 0.02, hd + 0.02, 'wood');
    const D = L.dome;
    box(-D.w / 2, D.w / 2, L.top, L.domeTop, D.z - D.d / 2, D.z + D.d / 2, 'glass');
    const rampQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.32);
    const rc = this.local(0, O.y0 + 0.015, L.front - 0.07);
    this.colliders.push(ph.addBox({ center: rc, half: new THREE.Vector3((O.x1 - O.x0) / 2, 0.012, 0.08), quat: q.clone().multiply(rampQ), material: 'metal' }));
    box(T.x0, T.x1, T.y - 0.02, T.y, T.z0, T.z1, 'metal');
    box(T.x0 - 0.01, T.x0, T.y, T.y + T.wall, T.z0, T.z1);
    box(T.x1, T.x1 + 0.01, T.y, T.y + T.wall, T.z0, T.z1);
    box(T.x0, T.x1, T.y, T.y + T.wall * 0.8, T.z1 - 0.004, T.z1 + 0.004);
    const bb = partsBox(this.model);
    this.footprint = this.game.player.addObstacle(bb.min.x - 0.02, bb.max.x + 0.02, bb.min.z - 0.02, bb.max.z + 0.02);
    this.worldBox = bb;
  }

  buildRope() {
    const H = this.L.hook;
    const anchor = this.local(H.x, H.y, H.z);
    this.rope = new Rope(this.game.scene, anchor, 0.46, 16);
    const bb = partsBox(this.model).expandByScalar(0.008);
    this.rope.boxes.push(bb);
    for (let i = 0; i < 60; i++) this.rope.update(1 / 60);
  }

  registerInteract() {
    const g = this.game;
    g.interaction.add(this.root, {
      highlight: this.model,
      noHighlight: true,
      hint: (held, hit) => this.hint(held, hit),
      use: (held, hit) => this.use(held, hit),
      hold: {
        canStart: () => (this.holdMode === 'pour' ? this.canPour() : this.state === 'ready'),
        start: () => { if (this.holdMode === 'pour') this.pourT = 0; else this.state = 'cranking'; },
        update: (dt) => (this.holdMode === 'pour' ? this.pour(dt) : this.crank(dt)),
        end: () => { if (this.holdMode === 'pour') this.holdMode = null; else if (this.state === 'cranking') this.state = 'ready'; },
        done: () => (this.holdMode === 'pour' ? !this.canPour() : this.state !== 'cranking' && this.state !== 'ready'),
      },
    });
  }

  /** Which part of the machine a ray hit landed on ('lid', 'coinbox', 'priceUp', 'priceDown', 'plate', 'handle' or null). */
  partOf(hit) {
    let o = hit?.object;
    while (o && o !== this.root) { if (o.userData.part) return o.userData.part; o = o.parent; }
    return null;
  }

  // ------------------------------------------------------------------ interaction
  heldBox(held) { return held && held.kind === 'box' && held.data.type === 'refill' ? held : null; }

  hint(held, hit) {
    const part = this.partOf(hit);
    const yen = (v) => `¥${v.toLocaleString('en-US')}`;
    if (this.lid.busy || this.drawer.busy) return { key: '', text: '...' };
    const pop = this.game.popTops?.machineHint?.(this, held); // a display top in its box, or a figure for the display
    if (pop) return pop;
    // price plate
    if (part === 'priceUp' || part === 'priceDown') {
      const p = this.price, np = Math.max(PRICE_MIN, Math.min(PRICE_MAX, p + (part === 'priceUp' ? 100 : -100)));
      return { key: 'LMB', text: part === 'priceUp' ? `Raise the price to ${yen(np)}` : `Lower the price to ${yen(np)}`, sub: `Now ${yen(p)} · recommended ${yen(this.recommended)}` };
    }
    if (part === 'plate') return { key: '', text: `Price ${yen(this.price)} a turn`, sub: `Recommended ${yen(this.recommended)} · press - or + below` };
    // coin box
    if (part === 'coinbox') {
      if (this.drawer.open) return this.cash > 0 ? { key: 'LMB', text: `Scoop up the coins (${yen(this.cash)})`, sub: 'Into your coin bag' } : { key: 'LMB', text: 'Push the coin box shut', sub: 'It locks itself' };
      return this.cash > 0 ? { key: 'LMB', text: 'Unlock the coin box', sub: `${yen(this.cash)} inside · ${Math.ceil(this.cash / 100)} coins` } : { key: '', text: 'Coin box (empty)', sub: 'Customers\' coins collect here' };
    }
    const box = this.heldBox(held);
    if (box) return this.restockHint(box);
    if (held) return null;
    if (this.lidOpen) return { key: 'LMB', text: 'Close and lock the lid', sub: `${this.data.stock.length}/${this.capacity} capsules inside` };
    const S = SERIES_BY_ID[this.data.series];
    const n = this.data.stock.length;
    if (this.state === 'idle') {
      if (n <= 0) return { key: '', icon: 'warning', text: 'Sold out', sub: 'Bring a capsule carton to refill it' };
      return { key: 'LMB', text: 'Test turn (owner\'s token)', sub: `${S?.name || ''} · ${n}/${this.capacity} left · ${yen(this.price)} for customers` };
    }
    if (this.state === 'ready') return { key: 'Hold LMB', text: 'Turn the handle', sub: `${Math.round((this.angle / (Math.PI * 2)) * 100)}%` };
    if (this.state === 'cranking') return { key: 'Hold LMB', text: 'Gacha-gacha...', sub: `${Math.round((this.angle / (Math.PI * 2)) * 100)}%` };
    return { key: '', text: '...' };
  }

  restockHint(box) {
    const d = box.data, free = this.capacity - this.data.stock.length;
    const S2 = SERIES_BY_ID[d.series];
    if (!this.lidOpen) return { key: 'LMB', text: 'Unlock and lift the lid', sub: `To restock with ${S2?.name || ''}` };
    if ((d.stage ?? 0) === 0) return { key: 'LMB', text: 'Cut the tape on the carton', sub: `${S2?.name || ''} x${d.count}` };
    if (d.stage === 1) return { key: 'LMB', text: 'Fold the flaps open' };
    if (d.count <= 0) return { key: 'LMB', text: 'Close and lock the lid', sub: 'The carton is empty' };
    if (free <= 0) return { key: 'LMB', text: 'Close and lock the lid', sub: `Full (${this.data.stock.length}/${this.capacity})` };
    const sub = `${this.data.stock.length}/${this.capacity} inside · ${d.count} in the carton`;
    if (this.placed >= HAND_PLACED_BEFORE_POUR) return { key: 'LMB', text: 'Put a capsule in', sub: `${sub} · hold to pour the rest` };
    return { key: 'LMB', text: 'Put a capsule in', sub: this.data.series !== d.series && this.data.stock.length ? `${sub} · mixes with ${SERIES_BY_ID[this.data.series]?.name}` : sub };
  }

  use(held, hit) {
    const part = this.partOf(hit);
    this.holdMode = null;
    if (this.lid.busy || this.drawer.busy) return false;
    if (this.game.popTops?.machineUse?.(this, held)) return false;
    if (part === 'priceUp' || part === 'priceDown') { this.pressPrice(part === 'priceUp' ? 1 : -1); return false; }
    if (part === 'plate') return false;
    if (part === 'coinbox') { this.useCoinBox(); return false; }
    const box = this.heldBox(held);
    if (box) return this.useRestock(box);
    if (held) return false;
    if (this.lidOpen) { this.closeLid(); return false; }
    if (this.state === 'idle') {
      if (this.data.stock.length <= 0) { audio.play('error', { pos: this.local(0, 1, 0.3), vol: 0.6 }); this.shake = 0.15; return false; }
      this.insertCoin();
      return false;
    }
    return true;
  }

  useRestock(box) {
    const d = box.data;
    const free = this.capacity - this.data.stock.length;
    if (!this.lidOpen) { this.openLid(); return false; }
    if ((d.stage ?? 0) < 2) { openBoxStep(box, this.local(0, this.L.top, 0.3)); return false; }
    if (d.count <= 0 || free <= 0) { this.closeLid(); return false; }
    this.insertFromBox(box);
    if (this.placed >= HAND_PLACED_BEFORE_POUR) { this.holdMode = 'pour'; return true; }
    return false;
  }

  canPour() {
    const it = this.game.held.item;
    return !!(it && this.heldBox(it) && this.lidOpen && (it.data.stage ?? 0) >= 2 && it.data.count > 0 && this.data.stock.length < this.capacity);
  }

  /** Holding the button after the first few: the rest pours in quickly. */
  pour(dt) {
    this.pourT += dt;
    if (this.pourT < 0.32) return;
    this.pourAcc = (this.pourAcc || 0) + dt * 9;
    while (this.pourAcc >= 1 && this.canPour()) { this.pourAcc -= 1; this.insertFromBox(this.game.held.item, true); }
  }

  /** One capsule from the carton in your hands into the window. */
  insertFromBox(box, quick = false) {
    const g = this.game, d = box.data;
    if (d.count <= 0 || this.data.stock.length >= this.capacity) return;
    const ctl = capBoxOf(box.obj);
    const series = d.series;
    d.count--;
    ctl?.setCount(d.count);
    if (series !== this.cardSeries) this.swapCard(series);
    else this.data.series = series;
    this.data.stock.push(series);
    this.placed++;
    const color = capsuleColor(series);
    // a capsule leaves the carton and drops in through the open top
    const from = ctl ? ctl.mouth() : g.camera.localToWorld(new THREE.Vector3(0, -0.2, -0.4));
    const W = this.L.window;
    const r = capsuleRadius(series);
    const localTo = new THREE.Vector3(THREE.MathUtils.lerp(W.x0 + r, W.x1 - r, Math.random()), W.y1 + 0.03, THREE.MathUtils.lerp(W.z0 + r, W.z1 - r, Math.random()));
    const to = this.root.localToWorld(localTo.clone());
    const cap = makeCapsule(series, color, { res: 'lo' });
    cap.group.position.copy(from);
    cap.group.rotation.set(Math.random() * 6, Math.random() * 6, 0);
    g.scene.add(cap.group);
    const dur = quick ? 0.22 : 0.34;
    g.tweens.add({
      dur, ease: ease.inOutCubic,
      update: (k) => { cap.group.position.lerpVectors(from, to, k); cap.group.position.y += Math.sin(k * Math.PI) * (quick ? 0.05 : 0.09); cap.group.rotation.x += 0.2; },
      done: () => {
        cap.group.parent?.remove(cap.group);
        if (this.pile.length < this.maxVisible) { const b = this.addPileCapsule(series, false, localTo); b.userData.color = color; }
        if (!quick || audio.canPlay('capIn' + this.data.id, 0.07)) audio.play('capsuleIn', { pos: to, vol: quick ? 0.55 : 0.85 });
      },
    });
    if (!quick) g.held.swing = 0.4;
    this.updateSoldOut();
    g.events.emit('machineRestock', { machine: this, series, n: 1 });
    if (d.count <= 0) g.tweens.wait(dur + 0.05, () => this.foldEmptyBox(box));
  }

  /** The empty carton folds flat and goes out of your hands. */
  foldEmptyBox(box) {
    const g = this.game, it = g.held.item;
    if (!it || it !== box || box.data.count > 0) return;
    const obj = box.obj, s0 = obj.scale.clone();
    audio.play('flapFold', { vol: 0.8 });
    g.tweens.add({ dur: 0.35, ease: ease.inCubic, update: (k) => obj.scale.set(s0.x * (1 + k * 0.1), s0.y * (1 - 0.9 * k), s0.z * (1 - 0.3 * k)), done: () => {
      if (g.held.item === box) g.held.consume();
      g.news('Carton empty', 'Folded flat for the recycling');
    } });
  }

  openLid() {
    const g = this.game, L = this.L;
    if (this.state !== 'idle') return;
    this.lid.busy = true;
    const key = keyMesh();
    key.position.set(L.lid.lockX - VS * 0.5, L.lid.h / 2, this.spec.d / 2 + VS * 2.5);
    key.rotation.x = Math.PI / 2;
    this.parts.lid.add(key);
    this.lid.key = key;
    const p = this.local(L.lid.lockX, L.lid.y + L.lid.h / 2, L.front);
    audio.play('keyTurn', { pos: p, vol: 0.9 });
    g.tweens.add({ dur: 0.28, ease: ease.inOutCubic, update: (k) => { key.rotation.z = -k * Math.PI / 2; }, done: () => {
      audio.play('lockClick', { pos: p });
      this.lid.locked = false;
      this.lid.target = 1;
      audio.play('lidCreak', { pos: p, up: true });
      g.tweens.wait(0.55, () => { this.lid.busy = false; });
    } });
    this.placed = 0;
  }

  closeLid() {
    const g = this.game, L = this.L;
    this.lid.busy = true;
    this.lid.target = 0;
    const p = this.local(L.lid.lockX, L.lid.y + L.lid.h / 2, L.front);
    audio.play('lidCreak', { pos: p, up: false });
    g.tweens.wait(0.5, () => {
      audio.play('thud', { pos: p, v: 0.35 });
      this.shake = 0.12;
      const key = this.lid.key;
      audio.play('keyTurn', { pos: p, vol: 0.9 });
      g.tweens.add({ dur: 0.25, update: (k) => { if (key) key.rotation.z = -(1 - k) * Math.PI / 2; }, done: () => {
        audio.play('lockClick', { pos: p });
        key?.parent?.remove(key);
        this.lid.key = null;
        this.lid.locked = true;
        this.lid.busy = false;
        if (this.placed) g.news(`Machine No.${this.data.no ?? (this.data.slot || 0) + 1} restocked`, `${this.data.stock.length}/${this.capacity} capsules · locked`);
        this.placed = 0;
        g.save();
      } });
    });
  }

  useCoinBox() {
    const g = this.game, D = this.drawer;
    const p = this.coinAnchorWorld();
    if (!D.open) {
      if (this.cash <= 0) { audio.play('error', { pos: p, vol: 0.4 }); return; }
      // the key goes in, turns, the drawer slides out
      D.busy = true;
      const key = keyMesh();
      const CB = this.L.coinBox, dw = CB.x1 - CB.x0;
      key.position.set(dw * 0.7 + VS * 0.5, (CB.y1 - CB.y0) * 0.62 + VS * 0.5, VS * 3.5);
      key.rotation.x = Math.PI / 2;
      this.parts.drawer.add(key);
      D.key = key;
      audio.play('keyTurn', { pos: p, vol: 0.9 });
      g.tweens.add({ dur: 0.26, ease: ease.inOutCubic, update: (k) => { key.rotation.z = -k * Math.PI / 2; }, done: () => {
        audio.play('lockClick', { pos: p });
        D.target = 1;
        audio.play('drawer', { pos: p, out: true });
        g.tweens.wait(0.4, () => { D.open = true; D.busy = false; });
      } });
      return;
    }
    if (this.cash > 0) { this.collect(); return; }
    // push it shut: it locks itself
    D.busy = true;
    D.target = 0;
    audio.play('drawer', { pos: p, out: false });
    g.tweens.wait(0.35, () => {
      audio.play('lockClick', { pos: p });
      D.key?.parent?.remove(D.key);
      D.key = null;
      D.open = false;
      D.busy = false;
    });
  }

  pressPrice(dir) {
    const btn = dir > 0 ? this.parts.buttons.plus : this.parts.buttons.minus;
    const before = this.price;
    this.price = before + dir * 100;
    audio.play(this.price === before ? 'error' : 'btnClick', { pos: btn.getWorldPosition(_v), vol: 0.7 });
    const z0 = this.L.front;
    btn.position.z = z0 - VS * 1.2;
    this.game.tweens.wait(0.12, () => { btn.position.z = z0; });
    this.game.save();
  }

  drawPrice() {
    this.shownRec = this.game.sim?.recommendedPrice ? this.recommended : null;
    this.parts.plate.draw(this.price, this.shownRec);
  }

  // ------------------------------------------------------------------ the owner's test turn
  insertCoin() {
    const g = this.game;
    this.state = 'inserting';
    const S = this.L.slot;
    const slotW = this.local(S.x, S.y, S.z + 0.01);
    const start = this.rope.end.clone();
    this.inserted = 1;
    this.rope.pin = start.clone();
    this.rope.wake();
    audio.play('whoosh', { pos: slotW, vol: 0.5, v: 0.08, dur: 0.25 });
    g.tweens.add({
      dur: 0.38, ease: ease.inOutCubic,
      update: (k) => { this.rope.pin.lerpVectors(start, slotW, k); this.rope.pin.y += Math.sin(k * Math.PI) * 0.06; },
      done: () => {
        g.tweens.wait(0, () => { this.rope.coinsHidden = 1; audio.play('coinInsert', { pos: slotW, vol: 0.9 }); });
        g.tweens.wait(0.28, () => { this.state = 'ready'; this.angle = 0; });
      },
    });
  }

  /** Kept for the debug helper: the handle turns by itself. */
  startMotor() { this.state = 'cranking'; this.motorCrank = true; }

  crank(dt) {
    if (this.state !== 'cranking') return;
    const speed = (Math.PI * 2) / crankTime(this.data);
    const prev = this.angle;
    this.angle = Math.min(Math.PI * 2, this.angle + speed * dt);
    const step = Math.PI / 6;
    if (Math.floor(this.angle / step) > Math.floor(prev / step)) {
      const p = this.local(0, this.L.handle.y, this.L.front);
      audio.play('crankTick', { pos: p, pitch: 0.9 + Math.random() * 0.2, vol: 0.9 });
      if (Math.random() < 0.6) audio.play('crankGrind', { pos: p, vol: 0.6 });
      for (const b of this.pile) { b.wake(); b.vel.add(_v.set((Math.random() - 0.5) * 0.25, Math.random() * 0.35, (Math.random() - 0.5) * 0.25)); }
      this.pileActive = 1.5;
      this.shake = Math.max(this.shake, 0.04);
    }
    if (this.angle >= Math.PI * 2) {
      this.state = 'dispensing';
      this.motorCrank = false;
      this.dispenseAll();
    }
  }

  dispenseAll() {
    audio.play('gachan', { pos: this.local(0, this.L.handle.y, this.L.front), vol: 1 });
    this.game.tweens.wait(0.18, () => this.dispenseOne(true));
  }

  dispenseOne(last) {
    const g = this.game;
    if (!this.data.stock.length) { this.finishDispense(); return; }
    const seriesId = this.takeCapsule();
    const color = this.lastColor;
    const luck = g.luck();
    const roll = rollCapsule(seriesId, Math.random, { finishLuck: luck.finish + (MACHINE_TYPES[this.data.type]?.luck || 0), rareLuck: luck.rare });
    const data = { series: seriesId, key: roll.key, finish: roll.finish, rarity: roll.rarity, color: color ?? capsuleColor(seriesId) };
    const O = this.L.outlet;
    const r = capsuleRadius(seriesId);
    const spawn = this.local(0, O.y0 + r + 0.035, this.L.front - 0.12);
    const vel = new THREE.Vector3(0, -0.2, 0.55).applyQuaternion(this.root.quaternion);
    g.state.pulls++;
    if (roll.rarity === 'secret') this.secretDrama();
    else if (roll.rarity === 'ultra') g.effects.sparks({ pos: this.local(0, O.y1, this.L.front + 0.03), count: 24, colors: [0xff8af0, 0xffd23f], speed: 0.6, size: 0.012 });
    g.tweens.wait(roll.rarity === 'secret' ? 0.9 : 0.05, () => {
      const ent = g.items.spawnCapsule(data, spawn, vel);
      if (roll.rarity === 'secret') ent.glint = 0;
      this.openFlap();
      if (last) g.tweens.wait(0.5, () => this.finishDispense());
    });
    this.updateSoldOut();
    g.events.emit('pull', { machine: this, data });
    g.events.emit('machinePlay', { machine: this, price: 0, series: seriesId, owner: true });
  }

  secretDrama() {
    const g = this.game;
    this.shake = 0.9;
    audio.play('thud', { pos: this.local(0, 0.6, 0.2), v: 0.8 });
    g.lighting?.flicker(0.9);
    const p = this.local(0, this.L.outlet.y1, this.L.front + 0.05);
    g.tweens.wait(0.5, () => {
      g.effects.sparks({ pos: p, count: 50, colors: [0xffd23f, 0xff8af0, 0xffb347], speed: 0.9, size: 0.014 });
      g.effects.flash?.({ pos: p, color: 0xffd080, intensity: 4, distance: 2.5, dur: 0.8 });
    });
  }

  finishDispense() {
    if (this.state !== 'dispensing') return;
    this.state = 'returning';
    const g = this.game;
    g.tweens.wait(0.15, () => {
      const out = new THREE.Vector3(0.12, 0.04, 0.08).applyQuaternion(this.root.quaternion);
      this.rope.pin = null;
      this.rope.coinsHidden = 0;
      const end = this.rope.pts[this.rope.n - 1];
      end.o.copy(end.p).sub(out.multiplyScalar(0.05));
      this.rope.wake();
      audio.play('ropeZip', { pos: end.p, vol: 0.8 });
      g.tweens.wait(0.25, () => audio.play('coinClink', { pos: end.p, v: 0.8 }));
      this.state = 'idle';
      this.angle = 0;
      this.game.save();
    });
  }

  openFlap() {
    this.flap.target = 1;
    audio.play('flap', { pos: this.local(0, this.L.outlet.y0, this.L.front), vol: 0.8 });
    this.game.tweens.wait(0.45, () => { this.flap.target = 0; });
  }

  /** Older callers (a box clicked onto the machine) now go through the step-by-step restock. */
  refillFromHeld() { const it = this.game.held.item; if (this.heldBox(it)) this.useRestock(it); }

  updateSoldOut() { this.soldOut.want = this.data.stock.length <= 0 && !this.data.broken ? 1 : 0; }

  // ------------------------------------------------------------------ per-frame
  update(dt) {
    // handle: the player's crank, or a customer's quick turn
    if (this.spin) {
      const s = this.spin;
      const prev = s.t;
      s.t += dt;
      const step = 1 / 12;
      if (Math.floor((s.t / s.dur) / step) > Math.floor((prev / s.dur) / step) && s.t < s.dur) audio.play('crankTick', { pos: this.local(0, this.L.handle.y, this.L.front), vol: 0.45, pitch: 1.1 });
      this.angle = Math.min(1, s.t / s.dur) * Math.PI * 2;
      if (s.t >= s.dur) { this.spin = null; this.angle = 0; this.handleMesh.rotation.z = 0; }
    }
    const target = -this.angle;
    this.handleMesh.rotation.z += (target - this.handleMesh.rotation.z) * Math.min(1, dt * 25);
    if (this.state === 'idle' && !this.spin && this.angle === 0 && Math.abs(this.handleMesh.rotation.z) > 0.01) this.handleMesh.rotation.z = 0;
    if (this.motorCrank) this.crank(dt);
    // flap
    const f = this.flap;
    f.open += (f.target - f.open) * Math.min(1, dt * (f.target ? 18 : 7));
    f.pivot.rotation.x = -f.open * 1.1;
    // lid: swings up on its back hinge (with a little bounce at the top)
    const L = this.lid;
    if (L.k !== L.target) {
      L.k += Math.sign(L.target - L.k) * Math.min(Math.abs(L.target - L.k), dt * (L.target ? 2.4 : 2.8));
      this.parts.lidPivot.rotation.x = -ease.outBack(L.k) * 1.85;
      if (L.k === 0) this.parts.lidPivot.rotation.x = 0;
    }
    // coin drawer
    const D = this.drawer;
    if (D.k !== D.target) {
      D.k += Math.sign(D.target - D.k) * Math.min(Math.abs(D.target - D.k), dt * 3.2);
      this.parts.drawer.position.z = this.L.coinBox.z + ease.outCubic(D.k) * (this.L.coinBox.depth - 0.012);
    }
    // sold out flag
    const so = this.soldOut;
    so.k += ((so.want || 0) - so.k) * Math.min(1, dt * 6);
    so.pivot.rotation.x = -Math.PI * 0.95 * (1 - so.k);
    so.pivot.visible = so.k > 0.01;
    // body shake
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt);
      const s = this.shake * 0.01;
      this.model.position.set((Math.random() - 0.5) * s, 0, (Math.random() - 0.5) * s);
    } else if (this.model.position.x || this.model.position.z) this.model.position.set(0, 0, 0);
    // capsule pile physics only while something is moving
    if (this.pileActive > 0) {
      this.pileActive -= dt;
      this.pileWorld.step(dt);
      this.syncPile(dt);
    }
    this.rope.update(dt);
    if (this.turntable) this.turntable.rotation.y += dt * 0.35;
    this.updateFigures(dt);
    // the recommended price follows the shop's demand model: keep the plate current
    this.recT = (this.recT ?? Math.random() * 4) - dt;
    if (this.recT <= 0) { this.recT = 4; if (this.game.sim?.recommendedPrice && this.recommended !== this.shownRec) this.drawPrice(); }
  }

  dispose() {
    this.game.scene.remove(this.root);
    this.disposeFigures();
    this.rope.dispose();
    for (const c of this.colliders) this.game.physics.removeCollider(c);
    this.game.player.removeObstacle(this.footprint);
    this.game.interaction.remove(this.root);
  }
}
