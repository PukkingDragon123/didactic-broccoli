// The title screen's gacha machine: a Shōwa ¥100 unit (cream enamel, red trim, on its fruit crate) standing outside the
// half-rolled shutter, its window piled with capsules. Picking Continue / New Game plays it: the handle cranks round
// with its ratchet ticks, GACHAN, the flap kicks open, a capsule rolls into the tray, bounces, and pops open in a burst
// of pixel confetti (src/gfx/pixfx.js sprites through game.effects).
//   const m = new MenuMachine(game, { x, z, rotY });  await m.crank(1);  const cap = await m.dispense();  m.pop(cap)
//   m.update(dt)  m.world(x, y, z) (machine-local -> world)  m.handle / m.tray (local points)  m.dispose()
import * as THREE from 'three';
import { buildMachineModel } from '../world/machineModels.js';
import { bannerTexture } from '../gfx/banner.js';
import { pileGeometries, makeCapsule, CAPSULE_R } from '../game/Capsule.js';
import { SERIES } from '../data/series/index.js';
import { audio } from '../core/audio.js';

const COLORS = [0xff6f91, 0xffd23f, 0x5cc4ff, 0x58c06c, 0xff9a3c, 0xb07cff, 0xff5a5a, 0x7ee0d0];
const sfx = (n, o) => { try { audio.play(n, o); } catch { /* audio not ready */ } };
const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

export class MenuMachine {
  constructor(game, { x = 0, z = 0, rotY = 0, type = 'retro', series = null } = {}) {
    this.game = game;
    this.series = series || SERIES[0]?.id;
    let banner = null;
    try { banner = bannerTexture(this.series, game.thumbs); } catch { banner = null; }
    const b = this.built = buildMachineModel(type, { banner, no: 3 });
    this.L = b.L;
    this.root = new THREE.Group();
    this.root.name = 'menu-machine';
    this.root.position.set(x, 0, z);
    this.root.rotation.y = rotY;
    this.root.add(b.group);
    game.scene.add(this.root);
    this.buildPile();
    this.angle = 0;
    this.crankJob = null;
    this.flap = { open: 0, target: 0 };
    this.caps = [];
    this.shake = 0;
    const L = this.L;
    this.handle = new THREE.Vector3(L.handle.x, L.handle.y, L.handle.z);
    this.trayAt = new THREE.Vector3(0, L.tray.y, (L.tray.z0 + L.tray.z1) / 2);
    this.root.updateMatrixWorld(true);
  }

  world(x, y, z, out = new THREE.Vector3()) { return this.root.localToWorld(out.set(x, y, z)); }

  /** The window full of capsules: a loose hex stack, two instanced meshes (tinted bottoms, clear tops). */
  buildPile() {
    const W = this.L.window, r = CAPSULE_R.M;
    const pg = pileGeometries('M', 'clear', null);
    const pts = [];
    let s = 17;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let layer = 0; layer < 6; layer++) {
      const y = W.y0 + r + layer * r * 1.62;
      if (y > W.y0 + (W.y1 - W.y0) * 0.66) break;
      const off = (layer % 2) * r * 0.9;
      for (let x = W.x0 + r + off; x <= W.x1 - r + 1e-4; x += r * 2.06) for (let z = W.z0 + r + off; z <= W.z1 - r + 1e-4; z += r * 2.06) {
        pts.push(new THREE.Vector3(x + (rnd() - 0.5) * r * 0.25, y + (rnd() - 0.5) * r * 0.2, z + (rnd() - 0.5) * r * 0.25));
      }
    }
    const n = pts.length;
    const bot = new THREE.InstancedMesh(pg.bottom, pg.bottomMat, n), top = new THREE.InstancedMesh(pg.top, pg.topMat, n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1), c = new THREE.Color();
    pts.forEach((p, i) => {
      e.set(rnd() * 6.28, rnd() * 6.28, rnd() * 6.28);
      q.setFromEuler(e);
      m.compose(p, q, one);
      bot.setMatrixAt(i, m); top.setMatrixAt(i, m);
      bot.setColorAt(i, c.setHex(COLORS[Math.floor(rnd() * COLORS.length)]));
    });
    for (const im of [bot, top]) { im.frustumCulled = false; im.userData.noRim = true; im.raycast = () => {}; }
    bot.castShadow = true;
    top.renderOrder = 2;
    this.pile = new THREE.Group();
    this.pile.add(bot, top);
    this.built.group.add(this.pile);
  }

  /** A full turn of the handle (resolves on the GACHAN). */
  crank(dur = 1) {
    return new Promise((res) => { this.crankJob = { t: 0, dur, res, ticks: 0 }; });
  }

  /** The flap kicks open and a capsule rolls into the tray (resolves with it once it has settled). */
  dispense() {
    const L = this.L, r = CAPSULE_R.M;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const cap = makeCapsule(this.series, color, { size: 'M', style: 'clear' });
    const g = cap.group;
    const from = new THREE.Vector3(0, L.outlet.y0 + r * 1.2, L.front - 0.03);
    const to = new THREE.Vector3(0.012, L.tray.y + r + 0.006, this.trayAt.z + 0.01);
    g.position.copy(from);
    g.rotation.set(0, 0.6, 0.25);
    this.built.group.add(g);
    this.flap.target = 1;
    sfx('flap', { pos: this.world(0, L.outlet.y0, L.front), vol: 0.8 });
    this.caps.push(cap);
    return new Promise((res) => { cap.roll = { t: 0, from, to, res }; });
  }

  /** The capsule springs open: the lid flips up and away, confetti and a few stars burst out of it. */
  pop(cap) {
    if (!cap) return;
    const fx = this.game.effects;
    const p = cap.group.getWorldPosition(new THREE.Vector3());
    cap.fly = { t: 0, vy: 1.25, vx: (Math.random() - 0.5) * 0.4, spin: 9 + Math.random() * 6 };
    try {
      // paper confetti and a few stars out of the capsule (pixel sprites, sized to read from the camera a few metres off)
      const up = new THREE.Vector3();
      for (let i = 0; i < 34; i++) {
        up.set((Math.random() - 0.5) * 1.2, 1.4 + Math.random() * 1.1, (Math.random() - 0.5) * 1.2);
        fx?.emit({ sprite: 'confetti', pos: p.clone().add(new THREE.Vector3(0, 0.04, 0)), vel: up, color: COLORS[i % COLORS.length], life: 2.4 + Math.random(), size: 0.022, gravity: 3, drag: 2.2, flutter: 3.5, floor: true, anim: 'loop', fps: 10 + Math.random() * 6, frame: i % 4, landFrame: 4, fade: 0.2, flip: true });
      }
      fx?.sparks?.({ pos: p.clone().add(new THREE.Vector3(0, 0.06, 0)), count: 10, colors: [0xffd23f, 0xfff0c0, 0xff6f91], speed: 1.1, up: 0.6, size: 0.026, star: 1, life: 0.7 });
    } catch { /* effects not ready */ }
    sfx('pop', { pos: p, vol: 0.9 });
    sfx('confetti', { pos: p, vol: 0.5 });
  }

  update(dt) {
    const L = this.L;
    const j = this.crankJob;
    if (j) {
      j.t += dt;
      const k = Math.min(1, j.t / j.dur);
      this.angle = ease(k) * Math.PI * 2;
      const ticks = Math.floor(this.angle / (Math.PI / 6));
      if (ticks > j.ticks && k < 1) {
        j.ticks = ticks;
        sfx('crankTick', { pos: this.world(this.handle.x, this.handle.y, this.handle.z), pitch: 0.92 + Math.random() * 0.16, vol: 0.9 });
        this.shake = 0.004;
      }
      if (k >= 1) {
        this.crankJob = null; this.angle = 0;
        sfx('gachan', { pos: this.world(0, L.handle.y, L.front), vol: 1 });
        j.res();
      }
    }
    this.built.handlePivot.rotation.z = -this.angle;
    // the pile rattles with each click of the ratchet
    this.shake = Math.max(0, this.shake - dt * 0.02);
    this.pile.position.set((Math.random() - 0.5) * this.shake, Math.random() * this.shake, (Math.random() - 0.5) * this.shake);
    // the flap
    const f = this.flap;
    f.open += (f.target - f.open) * Math.min(1, dt * (f.target ? 18 : 7));
    this.built.flapPivot.rotation.x = -f.open * 1.1;
    for (const cap of this.caps) {
      const R = cap.roll;
      if (R) {
        R.t += dt;
        const k = Math.min(1, R.t / 0.42);
        const g = cap.group;
        g.position.lerpVectors(R.from, R.to, k);
        // a hop over the tray lip, then two little bounces
        const hop = k < 0.6 ? Math.sin((k / 0.6) * Math.PI) * 0.035 : Math.abs(Math.sin(((k - 0.6) / 0.4) * Math.PI * 2)) * 0.012 * (1 - k);
        g.position.y += hop;
        g.rotation.z = 0.25 * (1 - k);
        if (k > 0.55 && !R.hit) { R.hit = true; sfx('capsuleHit', { pos: g.getWorldPosition(new THREE.Vector3()), mat: 'capsule', speed: 2.4 }); }
        if (k >= 1) { cap.roll = null; this.flap.target = 0; R.res(cap); }
      }
      const F = cap.fly;
      if (F) {
        F.t += dt;
        F.vy -= 4.2 * dt;
        cap.top.position.y += F.vy * dt;
        cap.top.position.x += F.vx * dt;
        cap.top.rotation.x += F.spin * dt;
        cap.top.rotation.z += F.spin * 0.4 * dt;
        cap.bottom.rotation.z = Math.sin(F.t * 18) * 0.25 * Math.max(0, 1 - F.t * 1.5);
        if (cap.top.position.y < -0.05) { cap.top.visible = false; cap.fly = null; }
      }
    }
  }

  dispose() {
    this.root.removeFromParent();
    this.caps.length = 0;
  }
}
