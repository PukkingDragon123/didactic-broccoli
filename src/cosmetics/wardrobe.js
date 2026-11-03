// The mirror in your room (#102): a tall standing mirror leaning on the partition wall. Use it and you see yourself:
// the view swings round to the mirror's side of the room, you stand there in your current look, and the closet
// (src/ui/Closet.js) opens next to you to try things on, buy and wear them. Drag to turn round; Back to step away.
// The closet talks to a "stage" (here) the way it talks to the menu crew on the title screen:
//   setLook(look), react(id | 'spin' | false), closeCloset(), dragging, dragYaw, ray, proxy
//   installWardrobe(game) -> { open(), close() }      (game.wardrobe)
import * as THREE from 'three';
import { Closet } from '../ui/Closet.js';
import { createAvatarHuman, normalizeAvatar } from '../people/avatar.js';
import { ROOM } from '../room/build.js';
import { audio } from '../core/audio.js';
import { talk } from '../people/voice.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const MIRROR = { x: -0.89, z: ROOM.zPart - 0.12 }; // room-local, facing -z into the tatami room
const SPOT = { x: -0.25, z: -1.68 }; // where you stand to look at yourself (in front of the window)
const LINES = ['Looking good.', 'Hmm... yes.', 'Grandpa would laugh.', 'Fashion!', 'Is this too much?', 'Nailed it.'];

function mirrorMesh() {
  const g = new THREE.Group();
  g.name = 'room-mirror';
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a36, roughness: 0.7 });
  const W = 0.38, H = 1.32, T = 0.035;
  const box = (w, h, d, x, y, z, m = wood) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; g.add(b); return b; };
  // the frame, leaning back a little against the wall
  const f = new THREE.Group();
  f.rotation.x = -0.08;
  g.add(f);
  const add = (b) => { g.remove(b); f.add(b); return b; };
  add(box(W, T, T, 0, H, 0)); add(box(W, T, T, 0, 0.06, 0));
  add(box(T, H, T, -W / 2, H / 2 + 0.03, 0)); add(box(T, H, T, W / 2, H / 2 + 0.03, 0));
  // the glass: a cool grey-blue with stepped pixel streaks (no smooth reflections)
  const c = document.createElement('canvas'); c.width = 16; c.height = 48;
  const x = c.getContext('2d');
  x.fillStyle = '#7d93a6'; x.fillRect(0, 0, 16, 48);
  x.fillStyle = '#93a9bb'; for (let i = 0; i < 48; i++) { x.fillRect((i * 0.5 + 2) | 0, 47 - i, 2, 1); x.fillRect((i * 0.5 + 7) | 0, 47 - i, 1, 1); }
  x.fillStyle = '#6a7f92'; x.fillRect(0, 44, 16, 4);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(W - T, H - T), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.25, metalness: 0.3 }));
  glass.position.set(0, H / 2 + 0.04, T / 2 + 0.002);
  f.add(glass);
  // a little foot to stand on, and a tie hanging off the corner
  box(W + 0.06, 0.04, 0.16, 0, 0.02, 0.02);
  const tie = box(0.035, 0.32, 0.01, W / 2 + 0.01, H - 0.2, 0.03, new THREE.MeshStandardMaterial({ color: 0x8a2a2a, roughness: 0.8 }));
  g.remove(tie); f.add(tie); tie.rotation.z = 0.1;
  return g;
}

class Stage {
  constructor(game, room) {
    this.game = game; this.room = room;
    this.ray = new THREE.Raycaster();
    this.proxy = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.95, 0.6), new THREE.MeshBasicMaterial({ visible: false }));
    this.proxy.position.y = 0.95;
    this.dragYaw = 0; this.dragging = false;
    this.open = false;
    this.me = null;
  }
  get spot() { return this.room.wv(SPOT.x, 0, SPOT.z); }

  start() {
    const g = this.game;
    if (this.open || g.uiOpen || g.cutscene?.active) return false;
    this.open = true;
    this.prev = { frozen: g.player.frozen, anchor: g.held.anchor.visible };
    g.uiOpen = true; g.uiCine = true;
    g.player.frozen = true;
    g.held.anchor.visible = false;
    g.interaction.setHint(null);
    document.body.classList.add('dressing');
    this.dragYaw = 0;
    this.build(g.state.avatar);
    this.me.setExpression?.('smile', 1.5);
    setTimeout(() => { if (this.open) this.me?.gesture?.('wave'); }, 450);
    g.input.unlock();
    return true;
  }

  build(look) {
    const old = this.me;
    const h = createAvatarHuman(normalizeAvatar(look), { lazy: false });
    const p = this.spot;
    h.root.position.copy(p);
    const m = this.room.wv(MIRROR.x, 0, MIRROR.z);
    this.baseYaw = Math.atan2(m.x - p.x, m.z - p.z);
    h.root.rotation.y = old ? old.root.rotation.y : this.baseYaw;
    h.shiftTarget = 0.9; h.shiftT = 1e9;
    this.game.scene.add(h.root);
    h.root.add(this.proxy);
    if (old) { this.game.bubbles?.clear(old); old.dispose(); old.root.removeFromParent(); }
    this.me = h;
    return h;
  }

  /** The camera sits at the mirror, framing you inside the part of the screen the closet panel leaves free. */
  frame() {
    const g = this.game;
    const m = this.room.wv(MIRROR.x, 1.22, MIRROR.z - 0.05);
    const tgt = this.spot.setY(0.98);
    const free = this.closet?.freeRect?.() || { x: 0, y: 0, w: innerWidth * 0.55, h: innerHeight };
    const fov = 58;
    const tanV = Math.tan(THREE.MathUtils.degToRad(fov / 2)), tanH = tanV * innerWidth / innerHeight;
    const nx = ((free.x + free.w / 2) / innerWidth) * 2 - 1, ny = 1 - ((free.y + free.h / 2) / innerHeight) * 2;
    const o = this._o || (this._o = new THREE.PerspectiveCamera()); // (a camera's lookAt points its -z)
    o.position.copy(m);
    o.lookAt(tgt);
    o.rotateY(Math.atan(nx * tanH));
    o.rotateX(-Math.atan(ny * tanV));
    g.player.lookOverride = { pos: m, quat: o.quaternion.clone(), fovDelta: g.player.baseFov - fov };
  }

  update(dt) {
    if (!this.open || !this.me) return;
    const h = this.me;
    const want = this.baseYaw + this.dragYaw;
    let d = Math.atan2(Math.sin(want - h.root.rotation.y), Math.cos(want - h.root.rotation.y));
    if (this.spin > 0) { this.spin += dt / 0.9; h.root.rotation.y = this.spinFrom + Math.min(1, this.spin) * Math.PI * 2; if (this.spin >= 1) this.spin = 0; }
    else h.root.rotation.y += d * Math.min(1, dt * (this.dragging ? 30 : 6));
    h.update(dt, {});
    this.frame();
  }

  // ---- what the closet asks of a stage
  setLook(look) { if (this.open) this.build(look); }
  react(id) {
    const h = this.me;
    if (!h) return;
    if (id === 'spin') { this.spin = 0.001; this.spinFrom = h.root.rotation.y; h.setExpression?.('happy', 1.6); }
    else h.gesture?.(pick(['cheer', 'flex', 'peace', 'pose_point', 'pose_lean', 'pose_cross', 'spin'].filter((x) => x !== 'spin')));
    if (id && Math.random() < 0.45) this.game.bubbles?.say(h, pick(LINES), { dur: 2.4, onChar: talk(h, { vol: 0.6 }) });
    try { audio.play('pop', { vol: 0.45 }); } catch { /* audio not ready */ }
  }
  closeCloset() {
    const g = this.game;
    if (!this.open) return;
    this.open = false;
    document.body.classList.remove('dressing');
    g.player.lookOverride = null;
    g.player.frozen = this.prev?.frozen || false;
    g.held.anchor.visible = this.prev?.anchor ?? true;
    g.uiOpen = false; g.uiCine = false;
    if (this.me) { g.bubbles?.clear(this.me); this.proxy.removeFromParent(); this.me.dispose(); this.me.root.removeFromParent(); this.me = null; }
    g.input.lock();
  }
}

export function installWardrobe(game) {
  const g = game, room = g.places?.room;
  if (!room?.group) return null;
  const mesh = mirrorMesh();
  mesh.position.set(MIRROR.x, 0, MIRROR.z);
  mesh.rotation.y = Math.PI;
  room.group.add(mesh);
  const stage = new Stage(g, room);
  const closet = stage.closet = new Closet(g, stage);
  const api = {
    open() { if (g.visiting) { g.news?.('This is not your mirror'); return; } if (stage.start()) closet.open(); },
    close() { closet.close(); },
    get active() { return stage.open; },
  };
  g.interaction.add(mesh, {
    reach: 2.4,
    hint: () => ({ key: 'LMB', text: 'Look in the mirror', sub: 'Change clothes, try things on' }),
    use: () => { api.open(); return false; },
  });
  g.constructor.updaters.push((gg, dt) => stage.update(Math.min(dt, 0.05)));
  g.wardrobe = api;
  return api;
}
