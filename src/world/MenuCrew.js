// The main menu's cast: you (Grandpa's grandkid, in your saved look) chilling in the lane with your phone, plus a
// few friends goofing around in front of the shop - a selfie with a duck face, a lean-in peace sign, someone
// filming it all, someone else showing off. Friends wear random cosmetics. Click (tap) yourself and the camera
// dollies in for the closet (src/ui/Closet.js); drag to turn around, Back returns to the crane shot.
//   const crew = new MenuCrew(game);  crew.update(dt) after the menu camera is placed (it may take the camera over)
//   crew.pick(camera, ndcX, ndcY) -> true over your character;  crew.openCloset() / crew.dispose()
import * as THREE from 'three';
import { talk } from '../people/voice.js';
import { audio } from '../core/audio.js';
import { createAvatarHuman, randomAvatar, normalizeAvatar, COSMETIC_BY_ID } from '../people/avatar.js';
import { GESTURES } from '../people/gestures.js';
import { Closet } from '../ui/Closet.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
function weighted(list) { let t = list.reduce((s, [, w]) => s + w, 0) * Math.random(); for (const [v, w] of list) { if ((t -= w) <= 0) return v; } return list[0][0]; }
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

/** A soft white burst for phone camera flashes (additive, bright enough to bloom). */
function flashSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  // fades to black (not just to transparent): additive blending then adds nothing at the edges
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.3, '#fff6e4'); gr.addColorStop(0.6, '#6a645c'); gr.addColorStop(1, '#000000');
  g.fillStyle = '#000'; g.fillRect(0, 0, 64, 64); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  // a single point (not a Sprite): the AO pass skips points, so no grey square around the glow
  const m = new THREE.PointsMaterial({ map: tex, size: 1.1, sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false });
  m.color.setScalar(2.2);
  const s = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3)), m);
  s.frustumCulled = false;
  s.visible = false;
  s.raycast = () => {};
  return s;
}

// where everyone stands (right of the signpost; you on the street side of the walkers' lane at z 7.3, the friends in
// front of the shutter), facing
const SPOTS = {
  me: { x: 0.65, z: 7.95, yaw: 0.32 },
  selfie: { x: 1.72, z: 6.42, yaw: 0.3 },
  lean: { x: 2.17, z: 6.3, yaw: 0.22 },
  film: { x: 3.0, z: 6.62, yaw: -1.4 },
  show: { x: 3.95, z: 6.2, yaw: -0.1 },
};
const LINES = {
  me: ['Heh.', 'lol', 'This cat video...', 'Grandpa would love this.', 'Five more minutes...', 'Hm? Oh, hey.'],
  selfie: ['Duck face!', 'Say cheese!', 'One more!', 'Wait, I blinked.', 'Get my good side!', 'The lighting is perfect.'],
  lean: ['Peace!', 'Squeeze in!', 'Is my hat okay?', 'Me too, me too!'],
  film: ['Okay... action!', 'This is going viral.', 'And... cut!', 'Do it again, slower!'],
  show: ['Watch this!', 'Ta-da!', 'Nailed it.', 'Dance break!'],
};
const ITEM_LINES = { dino: 'Rawr!', chicken: 'Bawk!', frog: 'Ribbit.', shark: 'Chomp chomp.', banana: 'I am bananas.', cone: 'Road work ahead.', box: 'Beep boop.', groucho: 'Nobody recognises me.', happi: 'Wasshoi!', bear: 'Grr. Cute grr.', nigiri: 'Fresh!', kitsune: 'Festival time!', stars: 'Superstar!' };

export class MenuCrew {
  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    this.group.name = 'menu-crew';
    game.scene.add(this.group);
    this.cast = [];
    this.t = 0;
    this.chatT = rnd(4, 7);
    this.hintT = game.state.flags?.closetSeen ? Infinity : 3.2;
    this.hover = false;
    this.k = 0; // closet camera blend
    this.open = false;
    this.ray = new THREE.Raycaster();
    // friends: random looks, always showing off some cosmetics (often the dino and the chicken)
    const s0 = Math.floor(Math.random() * 1000);
    const outfit = weighted([['dino', 3], ['banana', 2], ['happi', 1.4], ['box', 1.4]]);
    const hat = weighted([['chicken', 3], ['shark', 1.5], ['frog', 1.5], ['cone', 1.2], ['party', 1], ['bow', 1], ['nigiri', 1], ['bear', 1]]);
    const face = weighted([['shades', 2], ['groucho', 2], ['stars', 1.5], ['kitsune', 1]]);
    const hat2 = pick(['party', 'bow', 'nigiri', 'cone', null, null].filter((x) => x !== hat));
    const outfit2 = pick(['dino', 'banana', 'happi', 'box'].filter((x) => x !== outfit));
    this.add('selfie', randomAvatar(s0 + 1, { hat, face: Math.random() < 0.3 ? 'shades' : null }));
    this.add('lean', randomAvatar(s0 + 2, { outfit }));
    this.add('film', randomAvatar(s0 + 3, { face, hat: hat2 }));
    this.add('show', randomAvatar(s0 + 4, Math.random() < 0.6 ? { outfit: outfit2 } : { hat: pick(['frog', 'bear', 'shark'].filter((x) => x !== hat)) }));
    this.buildMe();
    // an invisible capsule around you for clicks / taps (generous on touch)
    this.proxy = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.95, 0.6), new THREE.MeshBasicMaterial({ visible: false }));
    this.proxy.position.y = 0.95;
    this.closet = new Closet(game, this);
    // the selfie taker's phone flash
    this.flash = flashSprite();
    this.flashT = 2;
  }

  get me() { return this.cast.find((c) => c.role === 'me'); }

  add(role, look) {
    const h = createAvatarHuman(look, { lazy: true });
    const sp = SPOTS[role];
    h.root.position.set(sp.x, 0, sp.z);
    h.root.rotation.y = sp.yaw;
    this.group.add(h.root);
    const c = { role, h, look, t: rnd(0.2, 1.2), act: null, lookAt: new THREE.Vector3(), lookMode: 'ahead', yaw: sp.yaw };
    this.cast.push(c);
    return c;
  }

  /** (Re)build your character from a look (saved one by default); keeps where you stand and face. */
  buildMe(look = this.game.state.avatar) {
    const old = this.me;
    const c = old || { role: 'me', t: 0.3, act: null, lookAt: new THREE.Vector3(), lookMode: 'phone', yaw: SPOTS.me.yaw };
    const h = createAvatarHuman(normalizeAvatar(look), { lazy: !old });
    const sp = SPOTS.me;
    h.root.position.set(sp.x, 0, sp.z);
    if (old) {
      h.root.rotation.y = old.h.root.rotation.y;
      this.game.bubbles?.clear(old.h);
      old.h.dispose();
      this.proxy.removeFromParent();
    } else { h.root.rotation.y = sp.yaw; this.cast.unshift(c); }
    c.h = h; c.look = look;
    // relaxed weight on one leg
    h.shiftTarget = 0.9; h.shiftT = 1e9;
    this.group.add(h.root);
    if (this.proxy) h.root.add(this.proxy);
    if (old && c.act) this.startAct(c, c.act, c.actOpts);
    return h;
  }

  /** Try a look on (closet preview) without saving. */
  setLook(look) { this.buildMe(look); }

  // ------------------------------------------------------------------ picking + closet
  pick(camera, x, y) {
    if (!this.me || this.k > 0.05) return false;
    this.ray.setFromCamera({ x, y }, camera);
    return this.ray.intersectObject(this.proxy, false).length > 0;
  }

  get busy() { return this.open || this.k > 0.001; }

  openCloset() {
    if (this.open) return;
    if (this.game.visiting) { this.say(this.me, "My closet's at home!"); return; }
    this.open = true;
    this.hover = false;
    const f = this.game.state.flags || (this.game.state.flags = {});
    f.closetSeen = true;
    this.hintT = Infinity;
    const me = this.me;
    this.game.bubbles?.clear(me.h);
    me.h.clearGesture();
    me.act = null;
    me.h.setExpression('smile', 1.5);
    setTimeout(() => { if (this.open) this.me.h.gesture('wave'); }, 500);
    this.camFrom = null; // captured on the next update (the crane pose)
    this.yawTarget = null;
    // the friends stop what they're doing to watch the fashion show
    for (const c of this.cast) if (c !== me) { c.h.clearGesture(); c.act = 'watch'; c.t = rnd(0.5, 1.5); }
    this.closet.open();
  }

  closeCloset() {
    if (!this.open) return;
    this.open = false;
    const me = this.me;
    me.h.clearGesture();
    setTimeout(() => { if (!this.open && this.me) this.startAct(this.me, 'phone_idle'); }, 700);
  }

  /** A little celebration when you put something on. */
  react(id) {
    const me = this.me;
    if (!me) return;
    const h = me.h;
    const fun = ['cheer', 'spin', 'flex', 'peace', 'dab'];
    const g = id === 'spin' ? 'spin' : pick(fun);
    if (g === 'spin') { this.spin = 0.001; me.spinFrom = h.root.rotation.y; h.setExpression('happy', 1.6); }
    else h.gesture(g);
    if (id && ITEM_LINES[id] && Math.random() < 0.7) this.say(me, ITEM_LINES[id]);
    // the audience goes wild
    const fans = this.cast.filter((c) => c !== me);
    fans.forEach((c, i) => setTimeout(() => { if (this.open && c.h.root.parent) { c.h.gesture(pick(['clap', 'cheer', 'clap', 'peace'])); c.t = 3; } }, 250 + i * 180 + Math.random() * 300));
    if (Math.random() < 0.6 && fans.length) setTimeout(() => { if (this.open) this.say(pick(fans), pick(['So cute!', 'Iconic.', 'Wow!', 'Love it!', 'Fashion!', 'Yes! That one!', 'Hahaha!'])); }, 700);
    try { audio.play('pop', { vol: 0.5 }); } catch { /* no audio yet */ }
  }

  // ------------------------------------------------------------------ acting
  startAct(c, act, opts = {}) {
    const h = c.h;
    c.act = act; c.actOpts = opts;
    if (!GESTURES[act]) return;
    h.gesture(act, opts);
    if (act === 'selfie') h.setExpression('duck', 0);
    else if (act === 'groupie') h.setExpression('happy', 0);
    else if (act === 'phone_idle') h.setExpression('neutral');
  }

  say(c, text, dur = 2.8) {
    if (!c || !this.game.bubbles) return;
    this.game.bubbles.say(c.h, text, { dur, onChar: talk(c.h, { vol: 0.7 }) });
  }

  /** What each friend gets up to next (called when their timer runs out). */
  direct(c) {
    const h = c.h, A = this.cast.find((x) => x.role === 'selfie'), B = this.cast.find((x) => x.role === 'lean');
    if (c.role !== 'me' && this.open) { c.act = 'watch'; c.t = rnd(3, 6); if (Math.random() < 0.3) h.gesture(pick(['clap', 'think', 'shrug'])); return; }
    if (c.act === 'watch') c.act = null;
    switch (c.role) {
      case 'me': {
        if (c.act !== 'phone_idle' && !this.open) { this.startAct(c, 'phone_idle'); c.t = rnd(4, 8); break; }
        const r = Math.random();
        if (r < 0.35) { c.lookMode = 'cam'; h.setExpression('smile', 2.2); c.t = 2.4; c.back = true; }
        else if (r < 0.6) { h.setExpression('happy', 1.4); c.t = rnd(5, 9); }
        else c.t = rnd(4, 8);
        break;
      }
      case 'selfie':
        if (c.act === 'selfie') { this.startAct(c, Math.random() < 0.5 ? 'peace' : 'film'); c.t = c.act === 'peace' ? 3 : rnd(4, 6); if (B?.act === 'groupie') { this.startAct(B, Math.random() < 0.5 ? 'clap' : 'peace'); B.t = 2.6; } }
        else { this.startAct(c, 'selfie'); c.t = rnd(6, 9); if (B) { this.startAct(B, 'groupie', { side: -1 }); B.t = c.t + 0.5; } }
        break;
      case 'lean':
        if (A?.act === 'selfie') { this.startAct(c, 'groupie', { side: -1 }); c.t = A.t + 0.5; }
        else { this.startAct(c, pick(['clap', 'shrug', 'peace', 'cheer'])); c.t = rnd(2.4, 4); }
        break;
      case 'film':
        if (c.act === 'film') { this.startAct(c, pick(['clap', 'think', 'cheer'])); c.t = rnd(2, 3); }
        else { this.startAct(c, 'film'); c.t = rnd(7, 12); }
        break;
      case 'show': {
        const acts = ['dab', 'flex', 'peace', 'cheer', 'wave'];
        if (GESTURES.dance) acts.push('dance', 'dance');
        let a = pick(acts);
        if (a === c.act) a = 'flex';
        if (a === 'dance') { h.gesture('dance', { bpm: 112 }); c.act = 'dance'; c.t = rnd(6, 10); }
        else { this.startAct(c, a); c.t = (GESTURES[a]?.dur || 2.5) + rnd(1, 3); }
        if (Math.random() < 0.25) { this.spinner = c; c.spinFrom = h.root.rotation.y; }
        break;
      }
      default: break;
    }
  }

  // ------------------------------------------------------------------ frame
  update(dt) {
    const g = this.game, cam = g.camera;
    this.t += dt;
    const me = this.me;
    // hovering yourself: you look up from the phone and wave
    if (this.hover && !this.wasHover && me?.act === 'phone_idle' && this.t - (this.waveAt ?? -9) > 6) {
      this.waveAt = this.t; me.h.gesture('wave'); me.h.setExpression('smile', 2); me.act = null; me.t = 2.6;
    }
    this.wasHover = this.hover;
    // timers, acting and looking
    for (const c of this.cast) {
      c.t -= dt;
      if (c.t <= 0 && !(c.role === 'me' && this.open)) {
        if (c.role === 'me' && c.back) { c.back = false; c.lookMode = 'phone'; c.t = rnd(5, 9); }
        else this.direct(c);
      }
      const h = c.h, r = h.root;
      // where they look: their phone, the camera, or straight ahead (keeps the head still while posing)
      const P = h.P;
      if (c.role === 'me' && this.open) c.lookAt.copy(cam.position);
      else if (c.act === 'watch' && me) me.h.headTop(c.lookAt).y -= 0.5;
      else if (c.role === 'me' && (this.hover || c.lookMode === 'cam')) c.lookAt.copy(cam.position);
      else if (c.role === 'me' && c.act === 'phone_idle') r.localToWorld(c.lookAt.set(-0.06 * P.H, P.waistY + 0.1 * P.H, 0.28 * P.H));
      else r.localToWorld(c.lookAt.set(0, P.eyeY, 2));
      // a full spin now and then (the show-off, or you after putting something on)
      let spinning = false;
      if (c === this.spinner || (c.role === 'me' && this.spin)) {
        const k = c.role === 'me' ? (this.spin += dt / 0.9) : (c.spinK = (c.spinK || 0) + dt / 1.1);
        if (k >= 1) { if (c.role === 'me') this.spin = 0; else { this.spinner = null; c.spinK = 0; } }
        else { r.rotation.y = (c.spinFrom ?? c.yaw) + ease(k) * Math.PI * 2; spinning = true; }
      }
      if (!spinning) {
        // you turn to face the closet camera; the turn steps come from the walk system
        const mp = me?.h.root.position;
        const want = c.role === 'me' && this.k > 0.02 && this.camTo ? Math.atan2(this.camTo.pos.x - r.position.x, this.camTo.pos.z - r.position.z) + (this.dragYaw || 0)
          : c.act === 'watch' && mp ? Math.atan2(mp.x - r.position.x, mp.z - r.position.z) : c.yaw;
        let d = Math.atan2(Math.sin(want - r.rotation.y), Math.cos(want - r.rotation.y));
        if (c.role !== 'me' || !this.open) d = Math.max(-dt * 3, Math.min(dt * 3, d));
        else if (this.dragging) d *= Math.min(1, dt * 30); else d *= Math.min(1, dt * 6);
        r.rotation.y += d;
      }
      h.update(dt, { lookAt: c.lookAt, talking: g.bubbles?.isTalking(h) });
    }
    // talk now and then (one bubble at a time; you only speak up for the hint)
    if (!this.open && this.k < 0.01 && !this.leaving) {
      this.hintT -= dt;
      if (this.hintT < 0 && me) {
        this.hintT = 26;
        this.say(me, document.body.classList.contains('touchmode') ? 'Psst! Tap me!' : 'Psst! Click me!', 3.6);
        me.lookMode = 'cam'; me.t = 4.2; me.back = true;
      }
      this.chatT -= dt;
      if (this.chatT < 0) {
        this.chatT = rnd(5, 9);
        const c = pick(this.cast);
        const own = [c.look?.hat, c.look?.outfit, c.look?.face].filter((id) => id && ITEM_LINES[id]);
        const line = own.length && Math.random() < 0.45 ? ITEM_LINES[pick(own)] : pick(LINES[c.role]);
        if (c.role !== 'me' || Math.random() < 0.5) this.say(c, line);
      }
    }
    this.updateFlash(dt);
    this.updateCamera(dt);
    // passers-by on the lane would walk right through the close-up: they step out of the shot meanwhile
    const peds = g.pedestrians?.list;
    if (peds && (this.k > 0 || this.hidPeds)) {
      this.hidPeds = this.k > 0;
      const p = me.h.root.position, cz = cam.position.z + 0.6;
      for (const q of peds) { const r = q.h.root; r.visible = !this.hidPeds || !(Math.abs(r.position.x - p.x) < 2.6 && r.position.z > p.z - 0.4 && r.position.z < cz); }
    }
  }

  /** Snap! Now and then during the selfie the phone flashes. */
  updateFlash(dt) {
    const A = this.cast.find((c) => c.role === 'selfie' && c.act === 'selfie');
    const f = this.flash;
    if (!A || A.h.b.prop.scale.x === 0) { f.visible = false; return; }
    if (f.parent !== A.h.b.prop) A.h.b.prop.add(f);
    this.flashT -= dt;
    if (this.flashT < 0) {
      this.flashT = rnd(1.8, 3.6);
      this.flashK = 0.16;
      try { audio.play('shutter', { vol: 0.25 }); } catch { /* no audio yet */ }
    }
    this.flashK = Math.max(0, (this.flashK || 0) - dt);
    f.visible = this.flashK > 0;
    f.material.opacity = Math.min(1, this.flashK / 0.08);
  }

  /** Play was pressed: you become the camera (it flies off through your spot); the friends wave goodbye. */
  leave() {
    this.leaving = true;
    const me = this.me;
    if (me) { this.game.bubbles?.clear(me.h); me.h.root.visible = false; }
    for (const c of this.cast) if (c !== me) { c.h.clearGesture(); c.act = 'wave'; c.t = 99; setTimeout(() => c.h.gesture?.('wave'), 200 + Math.random() * 500); }
  }

  /** The closet framing: you, full body, on the side of the screen the panel leaves free. */
  closetPose(out) {
    const p = this.me.h.root.position;
    const W = innerWidth, H = innerHeight;
    const r = this.closet.freeRect(); // the part of the screen not covered by the panel
    const aspect = W / H;
    // fit ~2.6 m of height (room for tall hats) and ~1.5 m of width into the free part of the view at a 34 degree
    // lens; the street is narrow (houses across the lane), so past ~3.6 m the lens widens instead
    const need = Math.max(1.3 / Math.max(0.3, r.h / H), 0.75 / (aspect * Math.max(0.25, r.w / W))); // = dist * tan(fov / 2)
    let tanV = Math.tan(THREE.MathUtils.degToRad(17)), dist = need / tanV;
    if (dist > 3.6) { dist = 3.6; tanV = need / dist; }
    dist = Math.max(2.4, dist);
    const fov = THREE.MathUtils.radToDeg(2 * Math.atan(tanV));
    // stand back toward the street (away from the shutter), slightly to the left so the friends stay mostly out of shot
    const dir = new THREE.Vector3(-0.12, 0, 1).normalize();
    const pos = new THREE.Vector3(p.x, 0, p.z).addScaledVector(dir, dist);
    pos.y = 1.15;
    // aim so your centre lands in the middle of the free rectangle
    const cx = ((r.x + r.w / 2) / W) * 2 - 1, cy = 1 - ((r.y + r.h / 2) / H) * 2;
    const look = new THREE.Vector3(p.x, 1.0, p.z);
    const fwd = look.clone().sub(pos).normalize(), right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
    look.addScaledVector(right, -cx * dist * tanV * aspect).add(new THREE.Vector3(0, -cy * dist * tanV, 0));
    out.pos = pos; out.look = look; out.fov = fov;
    return out;
  }

  updateCamera(dt) {
    const cam = this.game.camera;
    const want = this.open ? 1 : 0;
    if (want && !this.camFrom) this.camFrom = { fov: this.baseFov ?? cam.fov };
    if (!this.k && !want) return;
    this.baseFov = this.baseFov ?? cam.fov;
    this.k = want ? Math.min(1, this.k + dt / 1.15) : Math.max(0, this.k - dt / 0.95);
    this.camTo = this.closetPose(this.camTo || {});
    const e = ease(this.k);
    // blend from the crane pose (already in the camera this frame) to the close-up
    const q0 = cam.quaternion.clone(), p0 = cam.position.clone();
    const m = new THREE.Matrix4().lookAt(this.camTo.pos, this.camTo.look, new THREE.Vector3(0, 1, 0));
    const q1 = new THREE.Quaternion().setFromRotationMatrix(m);
    cam.position.copy(p0.lerp(this.camTo.pos, e));
    cam.quaternion.copy(q0.slerp(q1, e));
    cam.fov = this.baseFov + (this.camTo.fov - this.baseFov) * e;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    if (!this.k) { cam.fov = this.baseFov; cam.updateProjectionMatrix(); this.baseFov = null; this.camFrom = null; this.dragYaw = 0; }
  }

  dispose() {
    if (this.game.menuCrew === this) this.game.menuCrew = null;
    if (this.hidPeds) for (const q of this.game.pedestrians?.list || []) q.h.root.visible = true;
    this.closet.dispose();
    for (const c of this.cast) { this.game.bubbles?.clear(c.h); c.h.dispose(); }
    this.cast.length = 0;
    this.group.removeFromParent();
    this.flash.removeFromParent(); this.flash.geometry.dispose(); this.flash.material.map.dispose(); this.flash.material.dispose();
    if (this.baseFov) { this.game.camera.fov = this.baseFov; this.game.camera.updateProjectionMatrix(); }
  }
}
