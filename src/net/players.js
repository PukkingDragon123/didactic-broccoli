// The other players in your world: each one is their own saved avatar (src/people/avatar.js) walking, turning and
// looking where they look (interpolated ~120 ms behind the network so it stays smooth), with a pixel name tag
// (5x7 bitmap font), whatever they hold in their right hand, their arm poses (holding, carrying a box, slapping),
// emotes (the bizarre poses!) and asleep on their cardboard. Also your own state, sampled for the network.
//   const R = new RemotePlayer(mp, { id, name, avatar });  R.push(state);  R.update(dt);  R.dispose()
//   localState(game) -> [x, y, z, yaw, pitch, flags, held, eye]       heldCode(item) / heldMesh(code)
import * as THREE from 'three';
import { createAvatarHuman } from '../people/avatar.js';
import { GESTURES, EXTRA_POSES } from '../people/gestures.js';
import '../people/bizarre.js';
import { draw5, textW5 } from '../gfx/font5x7.js';
import { makeCapsule, makeShell } from '../game/Capsule.js';
import { makeItemMesh } from '../game/collectibles.js';
import { makeToolMesh } from '../game/Held.js';

export const COLORS = { H: '#ffd23f', g1: '#7fd1ff', g2: '#9cff9c', g3: '#ff9ab8', g4: '#c9a6ff', g5: '#ffb36b' };
export const colorOf = (id) => COLORS[id] || COLORS['g' + ((parseInt(String(id).slice(1), 10) || 1) % 5 + 1)];
// flags in a player's state
export const F = { ASLEEP: 1, SITTING: 2, PC: 4, RUN: 8, AWAY: 16, CROUCH: 32 };

const INTERP = 0.12; // seconds behind the newest state
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const _v = new THREE.Vector3(), _look = new THREE.Vector3();
const hitMat = new THREE.MeshBasicMaterial({ visible: false });

// ------------------------------------------------------------------ arm poses for players
Object.assign(GESTURES, {
  mp_hold: { dur: Infinity },
  mp_slap: { dur: 0.55, expr: 'angry' },
  mp_steal: { dur: 0.9, expr: 'grin' },
  mp_sleep: { dur: Infinity, expr: 'sleepy' },
});
const arm = (x, y, z, px, py, pz, hx = 0, hy = 0, hz = 0) => ({ t: [x, y, z], p: [px, py, pz], hand: [hx, hy, hz] });
const fr = (h) => { const P = h.P, k = P.H / 1.72; return { P, k, sx: P.shX, sy: P.shoulderY - P.waistY, m: (v) => v * k }; };
Object.assign(EXTRA_POSES, {
  // something small held out in front in the right hand
  mp_hold(t, h, g) {
    const { sy, m } = fr(h);
    g.R = arm(-m(0.1), sy - m(0.24), m(0.3), -1, -1, -0.3, 0, -1.2, 0);
  },
  // an open-palm slap: wind up out to the right, swing across
  mp_slap(t, h, g) {
    const { sx, sy, m } = fr(h), k = Math.min(1, t / 0.32), e = k * k * (3 - 2 * k);
    g.R = arm(-sx - m(0.32) + e * m(0.5), sy + m(0.05) - e * m(0.08), m(0.22) + Math.sin(e * Math.PI) * m(0.2), -1, 0, -0.6, 0, -1.4 + e, 0);
    g.chest[1] = 0.25 - e * 0.5; g.head[1] = -0.1;
  },
  // a quick dip into someone's pocket, low and forward
  mp_steal(t, h, g) {
    const { sy, m } = fr(h), k = Math.sin(Math.min(1, t / 0.9) * Math.PI);
    g.R = arm(-m(0.12), sy - m(0.5) - k * m(0.06), m(0.18) + k * m(0.24), -1, -0.8, -0.2, 0, -1.2, 0);
    g.spine[0] = 0.18 * k; g.head[0] = 0.2 * k; g.eyes = [1, 0.8];
  },
  // asleep: arms folded on the chest (the body itself is laid down by RemotePlayer)
  mp_sleep(t, h, g) {
    const { sy, m } = fr(h);
    g.R = arm(m(0.02), sy - m(0.3), m(0.14), -1, 0, -0.6, 0.2, -0.9, 0);
    g.L = arm(-m(0.02), sy - m(0.32), m(0.15), 1, 0, -0.6, 0.2, 0.9, 0);
    g.head[0] = 0.15;
  },
});

// ------------------------------------------------------------------ what's in a hand, in a few characters
/** A compact code for a held item: 'c:series:color' capsule, 't:key:finish' toy, 'o:toolId' tool, 'b' box, 's:series:color' shell. */
export function heldCode(it) {
  if (!it) return '';
  const d = it.data || {};
  if (it.kind === 'capsule') return `c:${d.series}:${d.color ?? ''}`;
  if (it.kind === 'toy') return `t:${d.key}:${d.finish || 'normal'}`;
  if (it.kind === 'tool') return `o:${d.id}`;
  if (it.kind === 'box') return 'b';
  if (it.kind === 'shell') return `s:${d.series}:${d.color ?? ''}`;
  if (it.kind === 'cat') return 'k';
  return '';
}

/** A mesh for a held code, about hand-sized (null for a box: the body's own carried box is used). */
export function heldMesh(code) {
  const [k, a, b] = code.split(':');
  try {
    if (k === 'c') return makeCapsule(a, b === '' ? undefined : +b).group;
    if (k === 's') return makeShell(a, b === '' ? undefined : +b).group;
    if (k === 't') { const g = new THREE.Group(); g.add(makeItemMesh(a, b)); g.scale.setScalar(1.3); return g; }
    if (k === 'o') { const m = makeToolMesh(a); m.scale.setScalar(m.userData.handScale || 1); return m; }
  } catch (e) { console.warn('[net] held mesh', code, e); }
  return null;
}

/** Your own state for the network. */
export function localState(g) {
  const P = g.player;
  let flags = 0;
  if (g.mp?.sleep?.asleep) flags |= F.ASLEEP;
  if (g.decor?.sitting) flags |= F.SITTING;
  if (g.pc?.active) flags |= F.PC;
  if (g.input?.key('ShiftLeft') || g.input?.key('ShiftRight')) flags |= F.RUN;
  if (!g.input?.locked && !g.pc?.active) flags |= F.AWAY;
  const r = (v, n = 100) => Math.round(v * n) / n;
  return [r(P.pos.x), r(P.pos.y), r(P.pos.z), r(P.yaw, 1000), r(P.pitch, 1000), flags, heldCode(g.held?.item), r(P.eye)];
}

// ------------------------------------------------------------------ name tags: a little paper tag (5x7 pixel text)
function nameTag(name, color) {
  const s = 2, text = String(name).toUpperCase().slice(0, 16);
  const tw = textW5(text, s), w = tw + 22, h = 7 * s + 10;
  const c = document.createElement('canvas');
  c.width = w + 3; c.height = h + 3;
  const x = c.getContext('2d');
  let seed = 7;
  for (const ch of text) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  // hard shadow, then the receipt-paper tag with nibbled corners and a few grain specks
  x.fillStyle = 'rgba(26,18,22,0.45)';
  x.fillRect(3, 3, w, h);
  const paper = ['#f6f3ea', '#efe9dc', '#f6f3ea', '#faf7ee'];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const corner = (i < 2 || i >= w - 2) && (j < 2 || j >= h - 2) && !((i === 1 || i === w - 2) && (j === 1 || j === h - 2));
    const torn = (j === 0 || j === h - 1) && rnd() < 0.18;
    if (corner || torn) continue;
    x.fillStyle = paper[Math.floor(rnd() * paper.length)];
    x.fillRect(i, j, 1, 1);
  }
  // the player's colour as an ink-outlined swatch, then the name in ink
  x.fillStyle = '#241a1e'; x.fillRect(4, 4, 10, h - 8);
  x.fillStyle = color; x.fillRect(6, 6, 6, h - 12);
  draw5(x, text, 18, 5, { s, col: '#241a1e' });
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true, alphaTest: 0.1, fog: false });
  const sp = new THREE.Sprite(mat);
  const px = 0.0058; // metres per canvas pixel at the tag
  sp.scale.set(c.width * px, c.height * px, 1);
  sp.renderOrder = 5;
  sp.userData.noRim = true;
  sp.raycast = () => {};
  return sp;
}

// ------------------------------------------------------------------ a remote player
export class RemotePlayer {
  constructor(mp, info) {
    this.mp = mp;
    this.game = mp.game;
    this.id = info.id;
    this.name = info.name || 'Friend';
    this.color = colorOf(info.id);
    this.buf = [];
    this.state = null;
    this.held = '';
    this.asleep = false;
    this.root = new THREE.Group();
    this.root.name = 'player:' + this.id;
    this.game.scene.add(this.root);
    this.build(info.avatar);
    this.tag = nameTag(this.name, this.color);
    this.game.scene.add(this.tag);
    this.root.visible = this.tag.visible = false; // until the first state arrives
  }

  build(avatar) {
    if (this.h) { this.root.remove(this.h.root); this.h.dispose?.(); }
    const h = createAvatarHuman(avatar || undefined, { lazy: true });
    h.ownSlapLines = true; // the net layer reacts to slaps on friends itself
    h.netPlayer = this;
    h.name = this.name;
    this.h = h;
    this.root.add(h.root);
    h.root.rotation.order = 'YXZ';
    // a simple box to aim at (steadier than the skinned mesh): clicks, slaps and the steal hint land on it
    if (!this.hit) {
      const H = h.height || 1.7;
      this.hit = new THREE.Mesh(new THREE.BoxGeometry(0.5, H * 0.96, 0.44), hitMat);
      this.hit.name = 'player-hit';
      this.hit.userData.netPlayer = this;
      this.root.add(this.hit);
      this.hit.position.y = H * 0.48;
    }
    this.hit.userData.human = h;
    h.mesh.raycast = () => {};
    this.heldObj = null; this.heldNow = null;
    if (this.held) { const c = this.held; this.held = ''; this.setHeld(c); }
  }

  get pos() { return this.root.position; }
  get yaw() { return this.h.root.rotation.y; }
  get talkTarget() { return this.h; }

  /** A state from the network: [x, y, z, yaw, pitch, flags, held, eye]. */
  push(s) {
    const now = performance.now() / 1000;
    this.buf.push({ t: now, s });
    while (this.buf.length > 20) this.buf.shift();
    this.state = s;
    if (!this.root.visible) { this.root.visible = this.tag.visible = true; this.snap(s); }
  }

  snap(s) {
    this.root.position.set(s[0], s[1], s[2]);
    this.h.root.rotation.y = s[3];
    this.h.hasPrev = false;
  }

  /** Interpolated [x, y, z, yaw, pitch] at time t (seconds). */
  sample(t) {
    const B = this.buf;
    if (!B.length) return null;
    if (t <= B[0].t) return B[0].s;
    for (let i = B.length - 1; i > 0; i--) {
      const a = B[i - 1], b = B[i];
      if (t >= a.t && t <= b.t) {
        const k = (t - a.t) / Math.max(1e-3, b.t - a.t);
        return [a.s[0] + (b.s[0] - a.s[0]) * k, a.s[1] + (b.s[1] - a.s[1]) * k, a.s[2] + (b.s[2] - a.s[2]) * k, a.s[3] + wrap(b.s[3] - a.s[3]) * k, a.s[4] + (b.s[4] - a.s[4]) * k];
      }
    }
    return B[B.length - 1].s;
  }

  setHeld(code) {
    if (code === this.held) return;
    this.held = code;
    const h = this.h;
    if (this.heldObj) { this.heldObj.parent?.remove(this.heldObj); this.heldObj = null; }
    const g = h.currentGesture;
    if (g === 'mp_hold' || g === 'carry') h.clearGesture();
    if (!code || code === 'k') return;
    if (code === 'b') { h.boxPos = h.boxPos || [0, 0.05, 0.3]; h.gesture('carry'); return; }
    const m = heldMesh(code);
    if (m) {
      m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.raycast = () => {}; } });
      m.position.set(0, -0.07, 0.02);
      h.b.handR.add(m);
      this.heldObj = m;
    }
    h.gesture('mp_hold');
  }

  /** Strike a pose (gesture name) for a while. */
  emote(name) {
    const h = this.h;
    if (!GESTURES[name]) return;
    this.emoteT = 4;
    h.gesture(name, { dur: GESTURES[name].dur === Infinity ? 3.5 : undefined });
  }

  action(kind) {
    if (kind === 'slap') this.h.gesture('mp_slap');
    else if (kind === 'steal') this.h.gesture('mp_steal');
  }

  setAsleep(on) {
    if (on === this.asleep) return;
    this.asleep = on;
    const r = this.h.root;
    if (on) {
      r.rotation.x = -Math.PI / 2;
      r.position.set(0, 0.11, 0);
      this.h.clearGesture();
      this.h.gesture('mp_sleep');
      this.h.setExpression('sleepy');
      this.zT = 0;
    } else {
      r.rotation.x = 0;
      r.position.set(0, 0, 0);
      this.h.clearGesture();
      this.h.setExpression('neutral');
      if (this.held) { const c = this.held; this.held = ''; this.setHeld(c); }
    }
  }

  update(dt) {
    const s = this.sample(performance.now() / 1000 - INTERP);
    const cur = this.state;
    if (!s || !cur) return;
    const flags = cur[5] | 0;
    const asleep = !!(flags & F.ASLEEP);
    if (asleep !== this.asleep) this.setAsleep(asleep);
    const r = this.root, before = _v.copy(r.position);
    const px = before.x, pz = before.z;
    if (this.asleep) {
      // lying down: their view sits at the head, looking along the body; the body's root is at the feet
      r.position.set(s[0] - Math.sin(s[3]) * 1.5, s[1], s[2] - Math.cos(s[3]) * 1.5);
      this.h.root.rotation.y = s[3] + Math.PI;
    } else {
      r.position.set(s[0], s[1], s[2]);
      // the body turns with the view (a little lazily, like a person following their head)
      const yaw = s[3] + Math.PI;
      this.h.root.rotation.y += wrap(yaw - this.h.root.rotation.y) * Math.min(1, dt * 14);
    }
    if (!this.asleep) this.setHeld(cur[6] || '');
    const speed = this.asleep ? 0 : Math.hypot(r.position.x - px, r.position.z - pz) / Math.max(dt, 1e-3);
    this.speed = (this.speed || 0) + (Math.min(speed, 5) - (this.speed || 0)) * Math.min(1, dt * 10);
    // where they look: ahead along their view (pitch lifts / lowers the head)
    let look = null;
    if (!this.asleep) {
      const eye = cur[7] || 1.58, p = s[4], yw = s[3];
      look = _look.set(r.position.x - Math.sin(yw) * Math.cos(p) * 3, r.position.y + eye + Math.sin(p) * 3, r.position.z - Math.cos(yw) * Math.cos(p) * 3);
    }
    this.h.update(dt, { speed: this.speed < 0.08 ? 0 : this.speed, lookAt: look, talking: !!this.game.bubbles?.isTalking?.(this.h) });
    if (this.emoteT > 0) { this.emoteT -= dt; if (this.speed > 0.4 && this.h.currentGesture && this.h.currentGesture !== 'mp_hold' && this.h.currentGesture !== 'carry') { this.emoteT = 0; this.h.clearGesture(); this.held = '_'; } }
    // the tag floats over the head
    const top = this.asleep ? _v.copy(r.position).add({ x: 0, y: 0.55, z: 0 }) : this.h.headTop(_v);
    this.tag.position.set(top.x, top.y + (this.asleep ? 0 : 0.05), top.z);
    this.tag.material.opacity = flags & F.AWAY ? 0.55 : 1;
    // little pixel z's over a sleeper
    if (this.asleep) {
      this.zT = (this.zT || 0) - dt;
      if (this.zT <= 0) { this.zT = 1.4; this.game.effects?.mark?.({ sprite: 'zz', color: 0xffffff, pos: r.position.clone().add(new THREE.Vector3(0, 0.35, 0)), size: 0.14, life: 1.6, rise: 0.3, dx: 0.03, anim: 'loop', fps: 4 }); }
    }
  }

  dispose() {
    this.game.scene.remove(this.root);
    this.game.scene.remove(this.tag);
    this.tag.material.map?.dispose(); this.tag.material.dispose();
    this.game.bubbles?.clear?.(this.h);
    this.h.dispose?.();
  }
}
