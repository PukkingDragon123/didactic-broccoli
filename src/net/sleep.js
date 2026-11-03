// Sleeping over: the host owns the shop and sleeps in the bedroom; friends get flattened cardboard boxes on the
// garage floor. Lie down on yours (LMB): the boxes crinkle, the view tips up to the joists, little pixel z's drift
// up, and you stay put until you move. The day ends for everyone when the host goes to bed or calls it a day (with
// everyone asleep the host is told so, and N calls it a day: game.sim.endDay('sleep') and the night skip). Friends
// still awake when the host sleeps crash on their cardboard anyway.
//   host -> all 'night' { day }      (the host's clock jumped to the next morning)
import * as THREE from 'three';
import { audio } from '../core/audio.js';

// spots on the garage floor (the open middle, between the machines and the work table / shelves)
const SPOTS = [
  { x: 0.95, z: -2.15, yaw: Math.PI / 2 },
  { x: 0.95, z: -1.25, yaw: Math.PI / 2 },
  { x: 0.95, z: 2.15, yaw: Math.PI / 2 },
  { x: 0.95, z: 3.05, yaw: Math.PI / 2 },
];
const WAKE_HOUR = 7;
const LIE_EYE = 0.2;

/** A flattened carton, pixel-painted (corrugated brown, a darker fold line, packing tape, a stamp). */
function cardboardTexture(seed) {
  const W = 32, H = 64, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const cols = ['#b88a52', '#c09058', '#b28450', '#c4965e'];
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { x.fillStyle = cols[(i * 7 + j * 3 + Math.floor(rnd() * 3)) % cols.length]; x.fillRect(i, j, 1, 1); }
  x.fillStyle = '#8e6534'; x.fillRect(0, 21, W, 1); x.fillRect(0, 43, W, 1); // folds between the panels
  x.fillStyle = '#9a7040'; x.fillRect(0, 0, W, 1); x.fillRect(0, H - 1, W, 1); x.fillRect(0, 0, 1, H); x.fillRect(W - 1, 0, 1, H);
  x.fillStyle = '#d8c69a'; x.fillRect(14, 0, 4, 22); x.fillStyle = '#e6d6aa'; x.fillRect(15, 0, 1, 22); // tape
  x.fillStyle = '#5a3a26'; // a little "fragile" glass stamp
  for (const [i, j] of [[5, 30], [6, 30], [7, 30], [5, 31], [7, 31], [6, 32], [6, 33], [5, 34], [6, 34], [7, 34]]) x.fillRect(i, j, 1, 1);
  x.fillStyle = '#7a2c22'; x.fillRect(20, 52, 7, 1); x.fillRect(20, 54, 5, 1); x.fillRect(20, 56, 6, 1);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Sleep {
  constructor(mp) {
    this.mp = mp;
    this.game = mp.game;
    this.beds = new Map(); // player id -> { mesh, spot }
    this.asleep = false;
    this.allTold = false;
    this.nPress = 0;
  }
  get s() { return this.mp.s; }

  install() {
    const S = this.s, g = this.game;
    S.on('night', (m) => this.onNight(m));
    if (this.mp.isHost && !this.hooked) {
      this.hooked = true;
      // the host's clock skipped to a new morning (the bedroom, the day summary's "call it a day", N): night for all
      g.events.on('newDay', (e) => { if (e?.skipped && this.mp.active && !this.mp.world.applying) S.broadcast({ t: 'night', day: e.day }); });
    }
    this.refresh();
  }

  /** One cardboard bed per guest (in join order). */
  refresh() {
    const ids = [...this.s.players.keys()].filter((id) => id !== 'H').sort((a, b) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10));
    for (const [id, b] of this.beds) if (!ids.includes(id)) { this.removeBed(b); this.beds.delete(id); }
    ids.forEach((id, i) => { if (!this.beds.has(id)) this.beds.set(id, this.makeBed(id, SPOTS[i % SPOTS.length], i)); });
  }

  makeBed(id, spot, i) {
    const g = this.game;
    const root = new THREE.Group();
    root.position.set(spot.x, 0.004, spot.z);
    root.rotation.y = spot.yaw;
    // two flattened cartons, overlapping, a touch askew
    for (let k = 0; k < 2; k++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.08), new THREE.MeshStandardMaterial({ map: cardboardTexture(i * 2 + k + 3), roughness: 0.95 }));
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = (k ? 0.06 : -0.04);
      m.position.set(k ? 0.05 : -0.04, k * 0.003, k ? -0.78 : 0.12);
      m.receiveShadow = true;
      root.add(m);
    }
    // a lumpy rolled-up jacket for a pillow
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.07, 0.16), new THREE.MeshStandardMaterial({ color: 0x4a5a78, roughness: 0.9 }));
    pillow.position.set(0, 0.035, -1.18);
    pillow.castShadow = true;
    root.add(pillow);
    g.scene.add(root);
    const owner = () => this.s.players.get(id)?.name || 'a friend';
    const handler = {
      reach: 2.4,
      hint: (held) => {
        if (held) return null;
        const mine = id === this.s.myId;
        if (this.mp.isHost) return { key: '', text: `${owner()}'s cardboard bed`, sub: 'The owner sleeps upstairs' };
        if (!mine) return { key: '', text: `${owner()}'s cardboard bed` };
        return { key: 'LMB', text: 'Sleep on the cardboard', sub: 'The day ends when everyone is asleep (or the host says so)' };
      },
      use: (held) => { if (!held && id === this.s.myId && !this.mp.isHost) this.lieDown(); return false; },
    };
    // the hit area: a low box over the cartons
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 1.9), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(0, 0.06, -0.42);
    root.add(hit);
    g.interaction.add(hit, handler);
    return { root, hit, spot };
  }
  removeBed(b) { this.game.interaction.remove(b.hit); this.game.scene.remove(b.root); }

  bedOf(id) { return this.beds.get(id); }

  // ------------------------------------------------------------------ lying down / getting up
  lieDown(instant = false) {
    const g = this.game, P = g.player, b = this.bedOf(this.s.myId);
    if (!b || this.asleep) return;
    this.asleep = true;
    if (g.decor?.sitting) g.decor.standUp();
    // the feet at the near end, the head on the pillow: the view lies along the bed looking up
    const sp = b.spot, foot = new THREE.Vector3(sp.x, 0, sp.z).add(new THREE.Vector3(Math.sin(sp.yaw) * 0.1, 0, Math.cos(sp.yaw) * 0.1));
    const headAt = new THREE.Vector3(sp.x, 0, sp.z).add(new THREE.Vector3(-Math.sin(sp.yaw) * 1.05, 0, -Math.cos(sp.yaw) * 1.05));
    this.lie = { eye: P.eye, foot };
    P.vel.set(0, 0, 0);
    P.frozen = true;
    g.held.anchor.visible = false;
    const p0 = P.pos.clone(), e0 = P.eye, y0 = P.yaw, pt0 = P.pitch;
    // facing away from the pillow, so the camera at the head looks up and back along the body
    const yaw1 = sp.yaw + Math.PI;
    let dy = yaw1 - y0; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    const dur = instant ? 0.01 : 0.9;
    g.tweens.add({ dur, update: (k) => { const e = k * k * (3 - 2 * k); P.pos.lerpVectors(p0, headAt, e); P.pos.y = 0; P.eye = e0 + (LIE_EYE - e0) * e; P.yaw = y0 + dy * e; P.pitch = pt0 + (1.25 - pt0) * e; } });
    try { audio.play('cardCrinkle', { vol: 0.9 }); } catch { /* */ }
    this.zT = 1.2;
    this.lieT = 0;
    this.mp.ui?.toast('You lie down on the cardboard. Zzz... (move to get up)');
    this.mp.ui?.refresh();
  }

  getUp() {
    if (!this.asleep) return;
    const g = this.game, P = g.player;
    this.asleep = false;
    P.frozen = false;
    g.held.anchor.visible = true;
    const e0 = P.eye, pt0 = P.pitch, e1 = this.lie?.eye || 1.58;
    g.tweens.add({ dur: 0.6, update: (k) => { P.eye = e0 + (e1 - e0) * k; P.pitch = pt0 + (-0.1 - pt0) * k; } });
    try { audio.play('cardCrinkle', { vol: 0.6 }); } catch { /* */ }
    this.mp.ui?.refresh();
  }

  // ------------------------------------------------------------------ night
  /** Host: N with everyone asleep (or any time, twice): call it a day for the whole shop. */
  hostEndDay() {
    const g = this.game;
    if (g.cutscene?.active) return;
    const sim = g.sim, C = g.clock;
    g.cutscene.play(function* (c) {
      yield c.fade(1, 1.0);
      if (sim) { const f = sim.onSummary; sim.onSummary = null; try { sim.endDay('sleep'); } finally { sim.onSummary = f; } }
      C?.skipTo(WAKE_HOUR, { nextDay: true });
      g.lighting?.refresh?.();
      g.lighting?.update?.(0, g.time);
      yield c.wait(1.2);
      yield c.fade(0, 1.0);
      const d = g.calendar?.dateOf?.(C?.day);
      yield c.title(`Day ${C?.day ?? ''}`, d ? `${d.weekdayName}, ${d.monthName} ${d.date}` : '', 2);
    }, { skippable: true });
  }

  /** Guest: the host slept: lie down (wherever you were), fade out, wake up on the cardboard in the morning. */
  onNight(m) {
    if (this.mp.isHost) return;
    const g = this.game, self = this;
    if (g.talk?.active) return;
    const was = this.asleep;
    g.cutscene.play(function* (c) {
      yield c.fade(1, was ? 1.2 : 0.6);
      if (!self.asleep) self.lieDown(true);
      yield c.wait(1.6);
      yield c.fade(0, 1.2);
      yield c.title(`Day ${m.day ?? g.clock?.day ?? ''}`, was ? 'You slept like a log on the cardboard' : 'You crashed on the cardboard. Your back hurts.', 2);
    }, { skippable: true });
  }

  // ------------------------------------------------------------------ per frame
  update(dt) {
    const g = this.game, inp = g.input;
    if (this.asleep) {
      this.lieT += dt;
      // move (or click) to get up
      const moving = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].some((k) => inp.keyPressed(k));
      if (this.lieT > 1 && inp.locked && !g.cutscene?.active && (moving || inp.buttonDown(0))) { this.getUp(); return; }
      this.zT -= dt;
      if (this.zT <= 0) {
        this.zT = 1.6;
        const cam = g.camera, p = cam.getWorldPosition(new THREE.Vector3()).add(cam.getWorldDirection(new THREE.Vector3()).multiplyScalar(0.9)).add(new THREE.Vector3(0.12, -0.12, 0));
        g.effects?.mark?.({ sprite: 'zz', color: 0xffffff, pos: p, size: 0.08, life: 1.8, rise: 0.25, dx: 0.04, anim: 'loop', fps: 4 });
        if (Math.random() < 0.4) try { audio.play('snore', { vol: 0.5 }); } catch { /* */ }
      }
    }
    if (!this.mp.isHost) return;
    const guests = this.s.others();
    if (!guests.length) return;
    const sleeping = guests.filter((p) => (this.mp.stateOf(p.id)?.[5] | 0) & 1).length;
    if (sleeping === guests.length && !this.allTold) {
      this.allTold = true;
      this.mp.ui?.toast(`Everyone's asleep on the cardboard. Go to bed, or press N to call it a day.`);
    } else if (sleeping < guests.length) this.allTold = false;
    if (inp.locked && !g.uiOpen && !this.mp.ui?.typing && inp.keyPressed('KeyN')) {
      if (sleeping === guests.length || performance.now() - this.nPress < 4000) { this.nPress = 0; this.hostEndDay(); }
      else { this.nPress = performance.now(); this.mp.ui?.toast(`${guests.length - sleeping} still awake. Press N again to call it a day anyway.`); }
    }
  }

  dispose() { for (const b of this.beds.values()) this.removeBed(b); this.beds.clear(); }
}
