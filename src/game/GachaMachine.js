// A gacha machine in the world: coin-on-a-rope insertion, ratchet crank, capsule pile physics behind the
// window, dispensing through the flap into the tray, refills, sold-out sign, display card and upgrade visuals.
import * as THREE from 'three';
import { buildMachineModel, buildHandle, buildMotor, buildSlotModule, caseExtension, MACHINE_SPECS } from '../world/machineModels.js';
import { MACHINE_SLOTS } from '../world/Garage.js';
import { Physics } from '../core/physics.js';
import { Rope } from './Rope.js';
import { audio } from '../core/audio.js';
import { ease } from '../core/util.js';
import { capsuleColor, capsuleRadius } from './Capsule.js';
import { pileGeometries } from './Capsule.js';
import { SERIES_BY_ID } from '../data/series/index.js';
import { capacityFor, crankTime, rollCapsule, MACHINE_TYPES } from './economy.js';
import { bannerTexture } from '../gfx/banner.js';
import { makeItemMesh } from './collectibles.js';

const UNIT_TOP = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
const UNIT_BOT = new THREE.SphereGeometry(0.985, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
const _m = new THREE.Matrix4();
const _s = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _ax = new THREE.Vector3();

export class GachaMachine {
  constructor(game, data) {
    this.game = game;
    this.data = data;
    this.init();
  }

  init() {
    const game = this.game, data = this.data;
    const slot = MACHINE_SLOTS[data.slot];
    this.root = new THREE.Group();
    this.root.position.set(slot.x, 0, slot.z);
    this.root.rotation.y = slot.rotY;
    game.scene.add(this.root);
    this.root.updateMatrixWorld(true);
    this.ext = caseExtension(data.up.cap || 0);
    const built = buildMachineModel(data.type, { ext: this.ext, no: (data.slot || 0) + 1 });
    this.model = built.group;
    this.L = built.L;
    this.spec = MACHINE_SPECS[data.type];
    this.body = built.body;
    this.bannerMesh = built.bannerMesh;
    this.domeAnchor = built.domeAnchor;
    this.root.add(this.model);
    this.state = 'idle';
    this.angle = 0;
    this.inserted = 0;
    this.pending = [];
    this.shake = 0;
    this.motor = null;
    this.buildSlot();
    this.buildTray();
    this.buildFlap();
    this.buildHandle();
    this.buildSoldOut();
    this.buildBanner();
    this.buildPile();
    this.buildColliders();
    this.buildRope();
    this.applyUpgrades(false);
    this.registerInteract();
  }

  /** Tear down and rebuild in place (the clear case grows with capacity upgrades). */
  rebuild() {
    this.dispose();
    this.init();
  }

  // ------------------------------------------------------------------ construction
  local(x, y, z) { return this.root.localToWorld(new THREE.Vector3(x, y, z)); }

  buildSlot() {
    const S = this.L.slot;
    const m = buildSlotModule(!!this.spec.style.worn);
    m.position.set(S.x, S.y, this.L.front + 0.0005);
    this.model.add(m);
  }

  buildTray() {
    const T = this.L.tray;
    const st = this.spec.style;
    const mat = new THREE.MeshPhysicalMaterial({ color: st.worn ? 0xd8ccb0 : this.data.type === 'deluxe' ? 0xdcd2bc : 0xeef0f2, roughness: 0.3, metalness: 0.1, clearcoat: 0.6 });
    const g = new THREE.Group();
    const add = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
    const tw = T.x1 - T.x0, td = T.z1 - T.z0;
    add(tw, 0.008, td, 0, T.y - 0.004, (T.z0 + T.z1) / 2);
    add(0.008, T.wall, td, T.x0, T.y + T.wall / 2, (T.z0 + T.z1) / 2);
    add(0.008, T.wall, td, T.x1, T.y + T.wall / 2, (T.z0 + T.z1) / 2);
    add(tw, T.wall * 0.8, 0.008, 0, T.y + T.wall * 0.4, T.z1);
    add(tw * 0.6, 0.012, 0.01, 0, T.y - 0.02, T.z1 - 0.02).rotation.x = 0.6;
    this.root.add(g);
    this.trayGroup = g;
  }

  buildFlap() {
    const O = this.L.outlet;
    const pivot = new THREE.Group();
    pivot.position.set(0, O.y1, O.z + 0.003);
    const flap = new THREE.Mesh(new THREE.BoxGeometry(O.x1 - O.x0 - 0.004, O.y1 - O.y0 - 0.004, 0.004),
      new THREE.MeshPhysicalMaterial({ color: 0xd8e4ec, transparent: true, opacity: 0.55, roughness: 0.2, clearcoat: 1 }));
    flap.position.y = -(O.y1 - O.y0) / 2;
    pivot.add(flap);
    this.root.add(pivot);
    this.flap = { pivot, open: 0, target: 0, t: 0 };
  }

  buildHandle() {
    const H = this.L.handle;
    this.handleGroup = new THREE.Group();
    this.handleGroup.position.set(H.x, H.y, H.z);
    this.root.add(this.handleGroup);
    this.handleLevel = -1;
  }

  buildSoldOut() {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 28;
    const ctx = c.getContext('2d');
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter;
    const draw = () => { ctx.fillStyle = '#d8282a'; ctx.fillRect(0, 0, 64, 28); ctx.fillStyle = '#fff'; ctx.font = '20px DotGothic16'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('売切', 32, 15); tex.needsUpdate = true; };
    draw();
    // the 売切 flag drops down over the coin slot
    const S = this.L.slot;
    const pivot = new THREE.Group();
    pivot.position.set(S.x, S.y + 0.034, this.L.front + 0.016);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.034), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, emissive: 0x401010, side: THREE.DoubleSide }));
    plate.position.y = -0.019;
    pivot.add(plate);
    pivot.rotation.x = -Math.PI * 0.95;
    this.root.add(pivot);
    this.soldOut = { pivot, k: 0 };
    this.redrawSoldOut = draw;
  }

  /** The printed banner inside the case + the sample figures in the dome on top. */
  buildBanner() {
    const series = this.data.series || 'mochi';
    const tex = bannerTexture(series, this.game.thumbs, { faded: this.data.type === 'retro' });
    const m = this.bannerMesh.material;
    m.map = tex; m.emissiveMap = tex; m.color.set(0xffffff); m.emissiveIntensity = 0.12; m.needsUpdate = true;
    // sample figures (見本)
    const A = this.domeAnchor;
    A.clear();
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
    const standM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    keys.forEach((k, i) => {
      const fig = makeItemMesh(k, 'normal');
      const sz = fig.geometry.userData.size;
      const sc = Math.min(1, (D.h - 0.03) / sz.y, (cell - 0.01) / Math.max(sz.x, sz.z));
      fig.scale.setScalar(sc);
      const x = -D.w / 2 + 0.01 + cell * (i + 0.5);
      fig.position.set(x, 0.008, (i % 2 ? -0.025 : 0.02));
      fig.rotation.y = -(i - (n - 1) / 2) * 0.28;
      fig.castShadow = false;
      turn.add(fig);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(Math.min(0.03, cell * 0.42), Math.min(0.032, cell * 0.44), 0.008, 20), standM);
      base.position.set(x, 0.004, fig.position.z);
      turn.add(base);
    });
    if (this.turntable) turn.position.z = 0;
    // 見本 card in the corner
    if (!GachaMachine.sampleTex) {
      const c = document.createElement('canvas'); c.width = 32; c.height = 16;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 32, 16); ctx.fillStyle = '#d8282a'; ctx.fillRect(0, 0, 32, 2); ctx.fillRect(0, 14, 32, 2);
      ctx.fillStyle = '#222'; ctx.font = '12px DotGothic16'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('見本', 16, 8.5);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
      GachaMachine.sampleTex = t;
    }
    const card = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.02), new THREE.MeshStandardMaterial({ map: GachaMachine.sampleTex, roughness: 0.6 }));
    card.position.set(D.w / 2 - 0.03, 0.012, D.d / 2 - 0.012);
    card.rotation.x = -0.5;
    card.userData.noRim = true;
    A.add(card);
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
    // funnel bump in the middle of the floor (capsules slump toward the centre like a real drum)
    pw.addBox({ center: new THREE.Vector3(W.x0 - 0.02, W.y0, cz), half: new THREE.Vector3(0.06, 0.03, hz), quat: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -0.4) });
    pw.addBox({ center: new THREE.Vector3(W.x1 + 0.02, W.y0, cz), half: new THREE.Vector3(0.06, 0.03, hz), quat: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.4) });
    const vol = (W.x1 - W.x0) * (W.y1 - W.y0) * (W.z1 - W.z0);
    const r = 0.038;
    this.maxVisible = Math.min(70, Math.floor(vol / Math.pow(r * 2, 3) * 0.62));
    const N = this.maxVisible + 4;
    const geo = pileGeometries(1);
    const botMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 });
    this.pileBot = new THREE.InstancedMesh(UNIT_BOT, botMat, N);
    this.pileTop = new THREE.InstancedMesh(UNIT_TOP, geo.clearMat, N);
    for (const im of [this.pileBot, this.pileTop]) { im.count = 0; im.frustumCulled = false; im.userData.noRim = true; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); }
    this.pileBot.castShadow = true;
    this.pileTop.renderOrder = 2;
    this.root.add(this.pileBot, this.pileTop);
    this.pile = [];
    this.pileActive = 0;
    const visible = Math.min(this.data.stock.length, this.maxVisible);
    for (let i = 0; i < visible; i++) this.addPileCapsule(this.data.stock[i], true);
    // pre-settle
    for (let i = 0; i < 160; i++) pw.step(1 / 60);
    this.syncPile(0);
  }

  addPileCapsule(seriesId, initial = false) {
    const W = this.L.window;
    const r = capsuleRadius(seriesId);
    const pos = initial
      ? new THREE.Vector3(THREE.MathUtils.lerp(W.x0 + r, W.x1 - r, Math.random()), W.y0 + r + this.pile.length * 0.012 + Math.random() * 0.05, THREE.MathUtils.lerp(W.z0 + r, W.z1 - r, Math.random()))
      : new THREE.Vector3(THREE.MathUtils.lerp(W.x0 + r, W.x1 - r, Math.random()), W.y1 + 0.05 + Math.random() * 0.15, THREE.MathUtils.lerp(W.z0 + r, W.z1 - r, Math.random()));
    const b = this.pileWorld.addBody({ radius: r, position: pos, velocity: new THREE.Vector3((Math.random() - 0.5) * 0.4, -0.5, (Math.random() - 0.5) * 0.4), restitution: 0.35, friction: 0.4, rollDamping: 3, linearDamping: 0.2 });
    b.userData.q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6));
    b.userData.color = capsuleColor(seriesId);
    b.userData.series = seriesId;
    b.userData.r = r;
    this.pile.push(b);
    this.pileActive = Math.max(this.pileActive, 2.5);
    return b;
  }

  syncPile(dt) {
    const col = new THREE.Color();
    for (let i = 0; i < this.pile.length; i++) {
      const b = this.pile[i];
      const w = b.angVel.length();
      if (w > 1e-4 && dt > 0) { _ax.copy(b.angVel).divideScalar(w); _q.setFromAxisAngle(_ax, w * dt); b.userData.q.premultiply(_q); }
      _s.setScalar(b.userData.r);
      _m.compose(b.pos, b.userData.q, _s);
      this.pileBot.setMatrixAt(i, _m);
      this.pileTop.setMatrixAt(i, _m);
      this.pileBot.setColorAt(i, col.set(b.userData.color));
    }
    this.pileBot.count = this.pileTop.count = this.pile.length;
    this.pileBot.instanceMatrix.needsUpdate = true;
    this.pileTop.instanceMatrix.needsUpdate = true;
    if (this.pileBot.instanceColor) this.pileBot.instanceColor.needsUpdate = true;
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
    if (L.bulge) box(-hw + 0.03, hw - 0.03, L.caseY0, L.caseY0 + L.caseH, hd, hd + L.bulge, 'glass');
    if (L.sidePanel) box(hw, hw + 0.024, 0, L.top + 0.02, -hd - 0.015, hd + 0.015);
    // chute ramp
    const rampQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.32);
    const rc = this.local(0, O.y0 + 0.015, L.front - 0.07);
    this.colliders.push(ph.addBox({ center: rc, half: new THREE.Vector3((O.x1 - O.x0) / 2, 0.012, 0.08), quat: q.clone().multiply(rampQ), material: 'metal' }));
    // tray
    box(T.x0, T.x1, T.y - 0.02, T.y, T.z0, T.z1, 'metal');
    box(T.x0 - 0.01, T.x0, T.y, T.y + T.wall, T.z0, T.z1);
    box(T.x1, T.x1 + 0.01, T.y, T.y + T.wall, T.z0, T.z1);
    box(T.x0, T.x1, T.y, T.y + T.wall * 0.8, T.z1 - 0.004, T.z1 + 0.004);
    // player footprint (world AABB)
    const bb = new THREE.Box3().setFromObject(this.model);
    const tb = new THREE.Box3().setFromObject(this.trayGroup);
    bb.union(tb);
    this.footprint = this.game.player.addObstacle(bb.min.x - 0.02, bb.max.x + 0.02, bb.min.z - 0.02, bb.max.z + 0.02);
    this.worldBox = bb;
  }

  buildRope() {
    const H = this.L.hook;
    const anchor = this.local(H.x, H.y, H.z);
    this.rope = new Rope(this.game.scene, anchor, 0.46, 16);
    const bb = new THREE.Box3().setFromObject(this.model).expandByScalar(0.008);
    this.rope.boxes.push(bb);
    for (let i = 0; i < 60; i++) this.rope.update(1 / 60);
  }

  registerInteract() {
    const g = this.game;
    g.interaction.add(this.root, {
      highlight: this.model,
      hint: (held, hit) => this.hint(held, hit),
      use: (held) => this.use(held),
      hold: {
        canStart: () => this.state === 'ready' && !this.hasMotor,
        start: () => { this.state = 'cranking'; },
        update: (dt) => this.crank(dt),
        end: () => { if (this.state === 'cranking') this.state = 'ready'; },
        done: () => this.state !== 'cranking' && this.state !== 'ready',
      },
    });
  }

  get hasMotor() { return (this.data.up.speed || 0) >= 5; }
  get capacity() { return capacityFor(this.data); }
  get coins() { return (this.data.up.coins || 0) + 1; }

  // ------------------------------------------------------------------ interaction
  hint(held) {
    const S = SERIES_BY_ID[this.data.series];
    if (held) {
      if (held.kind === 'box' && held.data.type === 'refill') {
        const free = this.capacity - this.data.stock.length;
        if (free <= 0) return { key: '×', text: '満杯 · Machine is full' };
        const s2 = SERIES_BY_ID[held.data.series];
        return { key: 'L', text: `補充 · Refill with ${s2.name}`, sub: `+${Math.min(free, held.data.count)} capsules` };
      }
      return null;
    }
    const n = this.data.stock.length;
    if (this.state === 'idle') {
      if (n <= 0) return { key: '×', text: '売り切れ · Sold out', sub: 'Order a capsule refill on the PC' };
      return { key: 'L', text: 'コインを入れる · Insert the coin', sub: `${S.jp} · ${n}/${this.capacity} left` };
    }
    if (this.state === 'ready') return this.hasMotor ? null : { key: 'Hold L', text: 'ハンドルを回す · Turn the handle', sub: `${Math.round((this.angle / (Math.PI * 2)) * 100)}%` };
    if (this.state === 'cranking') return { key: 'Hold L', text: 'ガチャガチャ…', sub: `${Math.round((this.angle / (Math.PI * 2)) * 100)}%` };
    return null;
  }

  use(held) {
    if (held) {
      if (held.kind === 'box' && held.data.type === 'refill') { this.refillFromHeld(); return false; }
      return false;
    }
    if (this.state === 'idle') {
      if (this.data.stock.length <= 0) { audio.play('error', { pos: this.local(0, 1, 0.3), vol: 0.6 }); this.shake = 0.15; return false; }
      this.insertCoin();
      return false; // don't start a hold on the same click
    }
    return true;
  }

  insertCoin() {
    const g = this.game;
    this.state = 'inserting';
    const S = this.L.slot;
    const slotW = this.local(S.x, S.y, S.z + 0.01);
    const start = this.rope.end.clone();
    const n = Math.min(this.coins, this.data.stock.length);
    this.inserted = n;
    this.rope.pin = start.clone();
    this.rope.wake();
    audio.play('whoosh', { pos: slotW, vol: 0.5, v: 0.08, dur: 0.25 });
    g.tweens.add({
      dur: 0.38, ease: ease.inOutCubic,
      update: (k) => {
        this.rope.pin.lerpVectors(start, slotW, k);
        this.rope.pin.y += Math.sin(k * Math.PI) * 0.06;
      },
      done: () => {
        for (let i = 0; i < n; i++) {
          g.tweens.wait(i * 0.13, () => {
            this.rope.coinsHidden = i + 1;
            audio.play('coinInsert', { pos: slotW, vol: 0.9 });
          });
        }
        g.tweens.wait(n * 0.13 + 0.15, () => {
          this.state = 'ready';
          this.angle = 0;
          if (this.hasMotor) this.startMotor();
        });
      },
    });
  }

  startMotor() {
    this.state = 'cranking';
    this.motorCrank = true;
    audio.play('motor', { pos: this.local(0, 0.6, 0), dur: crankTime(this.data) + 0.1, vol: 0.8 });
  }

  crank(dt) {
    if (this.state !== 'cranking') return;
    const speed = (Math.PI * 2) / crankTime(this.data);
    const prev = this.angle;
    this.angle = Math.min(Math.PI * 2, this.angle + speed * dt);
    // ratchet clicks every 30°
    const step = Math.PI / 6;
    if (Math.floor(this.angle / step) > Math.floor(prev / step)) {
      const p = this.local(0, this.L.handle.y, this.L.front);
      audio.play('crankTick', { pos: p, pitch: 0.9 + Math.random() * 0.2, vol: 0.9 });
      if (Math.random() < 0.6) audio.play('crankGrind', { pos: p, vol: 0.6 });
      // jostle the capsules
      for (const b of this.pile) { b.wake(); b.vel.add(new THREE.Vector3((Math.random() - 0.5) * 0.25, Math.random() * 0.35, (Math.random() - 0.5) * 0.25)); }
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
    const g = this.game;
    const n = this.inserted;
    const pos = this.local(0, this.L.handle.y, this.L.front);
    audio.play('gachan', { pos, vol: 1 });
    for (let i = 0; i < n; i++) g.tweens.wait(0.18 + i * 0.32, () => this.dispenseOne(i === n - 1));
  }

  dispenseOne(last) {
    const g = this.game;
    const st = this.data.stock;
    if (!st.length) { this.finishDispense(); return; }
    const idx = Math.floor(Math.random() * st.length);
    const seriesId = st.splice(idx, 1)[0];
    // remove the lowest pile capsule (matching series if possible) and reuse its colour
    let color = null;
    if (this.pile.length) {
      let best = -1, bestY = Infinity;
      for (let i = 0; i < this.pile.length; i++) {
        const b = this.pile[i];
        const y = b.pos.y - (b.userData.series === seriesId ? 0.03 : 0);
        if (y < bestY) { bestY = y; best = i; }
      }
      const b = this.pile.splice(best, 1)[0];
      color = b.userData.color;
      this.pileWorld.removeBody(b);
      for (const o of this.pile) o.wake();
      this.pileActive = 2;
      // a hidden capsule from storage takes its place when the window shows fewer than stock
      if (st.length > this.pile.length && this.pile.length < this.maxVisible) this.addPileCapsule(st[this.pile.length]);
    }
    const luck = g.luck();
    const roll = rollCapsule(seriesId, Math.random, { finishLuck: luck.finish + (MACHINE_TYPES[this.data.type].luck || 0), rareLuck: luck.rare });
    const data = { series: seriesId, key: roll.key, finish: roll.finish, rarity: roll.rarity, color: color ?? capsuleColor(seriesId) };
    const O = this.L.outlet;
    const r = capsuleRadius(seriesId);
    const spawn = this.local(0, O.y0 + r + 0.035, this.L.front - 0.12);
    const vel = new THREE.Vector3(0, -0.2, 0.55).applyQuaternion(this.root.quaternion);
    g.state.pulls++;
    // drama for the good stuff
    if (roll.rarity === 'secret') this.secretDrama();
    else if (roll.rarity === 'ultra') g.effects.sparks({ pos: this.local(0, O.y1, this.L.front + 0.03), count: 30, colors: [0xff8af0, 0xffffff], speed: 0.6, size: 0.012, star: 0.8 });
    g.tweens.wait(roll.rarity === 'secret' ? 0.9 : 0.05, () => {
      const ent = g.items.spawnCapsule(data, spawn, vel);
      if (roll.rarity === 'secret') ent.glint = 0;
      this.openFlap();
      if (last) g.tweens.wait(0.5, () => this.finishDispense());
    });
    this.updateSoldOut();
    g.events.emit('pull', { machine: this, data });
  }

  secretDrama() {
    const g = this.game;
    this.shake = 0.9;
    audio.play('thud', { pos: this.local(0, 0.6, 0.2), v: 0.8 });
    g.lighting?.flicker(0.9);
    const p = this.local(0, this.L.outlet.y1, this.L.front + 0.05);
    g.tweens.wait(0.5, () => {
      g.effects.sparks({ pos: p, count: 60, colors: [0xffd23f, 0xffffff, 0xff8af0], speed: 0.9, size: 0.014, star: 0.9 });
      g.effects.flash({ pos: p, color: 0xffd080, intensity: 4, distance: 2.5, dur: 0.8 });
    });
  }

  finishDispense() {
    if (this.state !== 'dispensing') return;
    this.state = 'returning';
    // the rope yanks the fake coin back out of the slot
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

  refillFromHeld() {
    const g = this.game;
    const held = g.held.item;
    const free = this.capacity - this.data.stock.length;
    if (free <= 0) { audio.play('error', { vol: 0.5 }); return; }
    const n = Math.min(free, held.data.count);
    const seriesId = held.data.series;
    const top = this.local(0, this.L.top + 0.25, 0);
    g.held.putTo(top, this.root.quaternion.clone(), (obj) => {
      obj.parent?.remove(obj);
      this.pour(seriesId, n);
    }, { dur: 0.45, arc: 0.15 });
    // leftover capsules stay in a smaller box
    const left = held.data.count - n;
    if (left > 0) g.tweens.wait(0.6, () => g.delivery.spawnRefillBox(seriesId, left, this.local(0.0, 0, 0.75)));
  }

  pour(seriesId, n) {
    const g = this.game;
    this.data.series = seriesId;
    this.buildBanner();
    audio.play('boxOpen', { pos: this.local(0, this.L.top, 0), vol: 0.7 });
    audio.play('pour', { pos: this.local(0, this.L.top, 0), n: Math.min(30, n), vol: 0.9 });
    for (let i = 0; i < n; i++) {
      this.data.stock.push(seriesId);
      if (this.pile.length < this.maxVisible) g.tweens.wait(i * 0.035, () => { if (this.pile.length < this.maxVisible) this.addPileCapsule(seriesId); });
    }
    this.shake = 0.25;
    this.updateSoldOut();
    g.effects.sparks({ pos: this.local(0, this.L.top + 0.05, 0), count: 20, colors: [0xffffff, 0xffe9a0], speed: 0.4, size: 0.01 });
    g.save();
  }

  updateSoldOut() { this.soldOut.want = this.data.stock.length <= 0 ? 1 : 0; }

  // ------------------------------------------------------------------ upgrades (visible changes)
  applyUpgrades(animate = true) {
    const up = this.data.up;
    const lvl = Math.min(5, up.speed || 0);
    if (lvl !== this.handleLevel) {
      this.handleGroup.clear();
      const h = buildHandle(this.L.handle.r, lvl);
      this.handleGroup.add(h);
      this.handleMesh = h;
      this.handleLevel = lvl;
    }
    // motor
    if (this.hasMotor && !this.motor) {
      this.motor = buildMotor();
      this.motor.position.set(-this.L.w / 2 - 0.05, this.L.handle.y - 0.04, this.L.front - 0.06);
      this.root.add(this.motor);
      const belt = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.004, 6, 24), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 }));
      const bx0 = -this.L.w / 2 - 0.05, bx1 = this.L.handle.x;
      belt.position.set((bx0 + bx1) / 2, this.L.handle.y, this.L.front + 0.025);
      belt.scale.set((bx1 - bx0) / 0.09 + 0.6, 0.9, 1);
      this.root.add(belt);
    }
    // capacity: the clear case grows taller (rebuild in place when idle)
    const ext = caseExtension(up.cap || 0);
    if (ext !== this.ext && animate && this.state === 'idle') {
      this.rebuild();
      this.game.tweens.wait(0.05, () => this.applyUpgrades(true));
      return;
    }
    this.rope.setCoins(this.coins);
    if (animate) {
      const p = this.local(0, this.L.top * 0.6, 0.2);
      this.game.effects.sparks({ pos: p, count: 40, colors: [0xffffff, 0xffd23f, 0x9fd9ff], speed: 0.8, size: 0.012, radius: 0.3 });
      this.game.effects.ring({ pos: this.local(0, 0.02, 0), size: 1.4, color: 0xffe9a0 });
      this.shake = 0.3;
      audio.play('upgrade', { pos: p, vol: 0.9 });
    }
    this.updateSoldOut();
  }

  // ------------------------------------------------------------------ per-frame
  update(dt, t) {
    // handle rotation (clockwise from the front)
    if (this.handleMesh) {
      const target = -this.angle;
      this.handleMesh.rotation.z += (target - this.handleMesh.rotation.z) * Math.min(1, dt * 25);
      if (this.state === 'idle' && this.angle === 0 && Math.abs(this.handleMesh.rotation.z) > 0.01) this.handleMesh.rotation.z = 0;
    }
    if (this.motorCrank) this.crank(dt);
    // flap
    const f = this.flap;
    f.open += (f.target - f.open) * Math.min(1, dt * (f.target ? 18 : 7));
    f.pivot.rotation.x = -f.open * 1.1;
    // sold out sign
    const so = this.soldOut;
    so.k += ((so.want || 0) - so.k) * Math.min(1, dt * 6);
    so.pivot.rotation.x = -Math.PI * 0.95 * (1 - so.k);
    so.pivot.visible = so.k > 0.01;
    // body shake
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt);
      const s = this.shake * 0.01;
      this.model.position.set((Math.random() - 0.5) * s, 0, (Math.random() - 0.5) * s);
    } else this.model.position.set(0, 0, 0);
    // capsule pile physics only while something is moving
    if (this.pileActive > 0) {
      this.pileActive -= dt;
      this.pileWorld.step(dt);
      this.syncPile(dt);
    }
    this.rope.update(dt);
    if (this.turntable) this.turntable.rotation.y += dt * 0.35;
  }

  dispose() {
    this.game.scene.remove(this.root);
    this.rope.dispose();
    for (const c of this.colliders) this.game.physics.removeCollider(c);
    this.game.player.removeObstacle(this.footprint);
    this.game.interaction.remove(this.root);
  }
}
