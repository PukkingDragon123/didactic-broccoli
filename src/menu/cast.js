// Who's in the title shot: you (Grandpa's grandkid, in your saved look) idling by the gacha machine with your phone, and
// Mikan curled up asleep on the shop bench (her z's are pixel sprites). Hover over yourself and you look up and wave;
// click and the Wardrobe opens. Picking Continue / New Game, you pocket the phone, turn to the machine and crank it.
// Also a "stage" for the old closet (src/ui/Closet.js) while the new dressing room isn't there: setLook, react,
// closeCloset, dragging, dragYaw, ray, proxy.
//   const cast = new MenuCast(game, spots);  cast.update(dt, camera)  cast.pick(camera, x, y)  await cast.crank(m, 1)
import * as THREE from 'three';
import { createAvatarHuman, normalizeAvatar } from '../people/avatar.js';
import { CatRig } from '../world/CatRig.js';
import { talk } from '../people/voice.js';
import { audio } from '../core/audio.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const LINES = ['Hm? Oh, hey.', 'One more go...', 'Grandpa would love this.', 'Nice evening.', 'Shh, Mikan is asleep.'];

export class MenuCast {
  constructor(game, spots) {
    this.game = game;
    this.spots = spots;
    this.group = new THREE.Group();
    this.group.name = 'menu-cast';
    game.scene.add(this.group);
    this.ray = new THREE.Raycaster();
    this.proxy = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.9, 0.6), new THREE.MeshBasicMaterial({ visible: false }));
    this.proxy.position.y = 0.95;
    this.lookAt = new THREE.Vector3();
    this.t = 0; this.next = rnd(3, 6); this.mode = 'phone';
    this.hover = false; this.waveAt = -99;
    this.yaw = spots.me.yaw; this.yawGoal = spots.me.yaw;
    this.build(game.state.avatar);
    this.buildCat();
  }

  build(look) {
    const old = this.me;
    const h = createAvatarHuman(normalizeAvatar(look), { lazy: !old });
    h.root.position.set(this.spots.me.x, 0, this.spots.me.z);
    h.root.rotation.y = this.yaw;
    h.shiftTarget = 0.9; h.shiftT = 1e9; // weight on one leg
    if (old) { this.game.bubbles?.clear(old); this.proxy.removeFromParent(); old.dispose(); old.root.removeFromParent(); }
    this.me = h;
    this.group.add(h.root);
    h.root.add(this.proxy);
    if (this.mode === 'phone') h.gesture('phone_idle');
    return h;
  }

  buildCat() {
    const c = this.spots.cat;
    if (!c) return;
    const rig = this.cat = new CatRig();
    rig.setPose('sleep');
    rig.root.position.set(c.x, c.y, c.z);
    rig.root.rotation.y = c.yaw;
    rig.onFx = (kind, pos) => { if (kind === 'zz') this.game.effects?.mark({ sprite: 'zz', pos, color: 0xdce8ff, size: 0.03, life: 2.4, rise: 0.16, dx: 0.05 }); };
    this.group.add(rig.root);
  }

  // ------------------------------------------------------------------ the closet stage (old fallback)
  get dragging() { return !!this._drag; }
  set dragging(v) { this._drag = v; }
  setLook(look) { this.build(look); }
  react(id) {
    const h = this.me;
    if (id === 'spin') { this.spinK = 0.001; this.spinFrom = h.root.rotation.y; h.setExpression?.('happy', 1.6); }
    else h.gesture(pick(['cheer', 'peace', 'flex', 'pose_point', 'pose_cross']));
    try { audio.play('pop', { vol: 0.45 }); } catch { /* audio not ready */ }
  }
  closeCloset() { this.closetOpen = false; this.dragYaw = 0; this.onClosetClosed?.(); }

  // ------------------------------------------------------------------
  pick(camera, x, y) {
    if (!this.me || this.busy) return false;
    this.ray.setFromCamera({ x, y }, camera);
    return this.ray.intersectObject(this.proxy, false).length > 0;
  }

  say(text, dur = 2.6) { if (this.game.bubbles && this.me) this.game.bubbles.say(this.me, text, { dur, onChar: talk(this.me, { vol: 0.6 }) }); }

  /** Pocket the phone, turn to the machine's handle and give it a full turn (resolves when the turn is done). */
  async crank(machine, dur = 1) {
    const h = this.me;
    this.busy = true;
    this.mode = 'crank';
    this.game.bubbles?.clear(h);
    h.clearGesture();
    const hw = machine.world(machine.handle.x, machine.handle.y, machine.handle.z);
    const p = h.root.position;
    this.yawGoal = Math.atan2(hw.x - p.x, hw.z - p.z);
    await (this.sleep ? this.sleep(0.22) : wait(0.22));
    h.gesture('crank');
    await machine.crank(dur);
    h.clearGesture();
  }

  /** The capsule popped: a little cheer. */
  cheer() { this.me.gesture('cheer'); this.me.setExpression?.('happy', 2); }

  /** You turn round to face the camera (the wardrobe), or go back to your phone. */
  faceCamera(on) { this.facing = on; if (on) { this.me.clearGesture(); this.me.setExpression?.('smile', 2); } else if (this.mode === 'phone') this.me.gesture('phone_idle'); }

  update(dt, cam) {
    const h = this.me;
    if (!h) return;
    this.t += dt;
    // idle life: back to the phone, a glance at the camera, a stretch now and then
    if (this.mode === 'phone' && !this.closetOpen && !this.facing) {
      if (this.hover && !this.wasHover && this.t - this.waveAt > 5) { this.waveAt = this.t; h.clearGesture(); h.gesture('wave'); h.setExpression?.('smile', 2); this.glance = 2.6; this.next = 3; }
      this.next -= dt;
      if (this.next <= 0) {
        const r = Math.random();
        const phone = () => { if (!h.gestures?.some((x) => x.name === 'phone_idle' && !x.out)) h.gesture('phone_idle'); };
        if (r < 0.32) { phone(); this.glance = 2.4; h.setExpression?.('smile', 2); this.next = rnd(5, 9); }
        else if (r < 0.42 && !this.stretched) { this.stretched = true; h.clearGesture(); h.gesture(pick(['stretch', 'yawn'])); this.next = 3.2; }
        else if (r < 0.5 && !this.saidT) { phone(); this.saidT = true; this.say(pick(LINES)); this.next = rnd(6, 10); }
        else { phone(); this.next = rnd(5, 9); }
      }
    }
    this.wasHover = this.hover;
    this.glance = Math.max(0, (this.glance || 0) - dt);
    // where you look: your phone, the camera, or the handle you're turning
    const P = h.P;
    if (this.mode === 'crank') this.lookAt.copy(h.root.position).add(new THREE.Vector3(Math.sin(this.yawGoal) * 0.5, 0.75, Math.cos(this.yawGoal) * 0.5));
    else if (this.hover || this.glance > 0 || this.facing || this.closetOpen) this.lookAt.copy(cam.position);
    else h.root.localToWorld(this.lookAt.set(-0.06 * P.H, P.waistY + 0.1 * P.H, 0.28 * P.H));
    // turning (stepped by the walk system's turn-in-place), or a full spin when showing off a new look
    if (this.spinK) {
      this.spinK += dt / 0.9;
      if (this.spinK >= 1) this.spinK = 0;
      else h.root.rotation.y = this.spinFrom + this.spinK * Math.PI * 2;
    } else {
      const goal = this.facing || this.closetOpen ? Math.atan2(cam.position.x - h.root.position.x, cam.position.z - h.root.position.z) + (this.dragYaw || 0) : this.mode === 'crank' ? this.yawGoal : this.spots.me.yaw;
      const d = wrap(goal - h.root.rotation.y);
      h.root.rotation.y += this.dragging ? d * Math.min(1, dt * 30) : Math.max(-dt * 4, Math.min(dt * 4, d));
    }
    this.yaw = h.root.rotation.y;
    h.update(dt, { lookAt: this.lookAt, talking: this.game.bubbles?.isTalking(h) });
    this.cat?.update(dt, 0);
  }

  dispose() {
    if (this.me) { this.game.bubbles?.clear(this.me); this.me.dispose(); }
    this.group.removeFromParent();
  }
}

const wait = (s) => new Promise((r) => setTimeout(r, s * 1000));
