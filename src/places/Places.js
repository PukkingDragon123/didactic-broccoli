// game.places: the rooms you walk into that aren't on the lane itself. Interiors are built off-map (each in its own
// reserved zone) and only shown while you're in them; a door on the lane fades you through (the cutscene fade, no
// loading). While you're inside, the camera's far plane is pulled in so the whole town drops out of the frustum.
//
//   places.add({ id, name, group, spawn: { x, z, yaw }, exit: { x, z, yaw }, lamp: { x, y, z, color, intensity },
//                onEnter(), onExit(), update(dt) })      register an interior
//   places.enter(id) / places.exit()      (fade, teleport, show / hide)      places.where -> id | null
//   places.door(obj, { to, text, sub, reach })            a door on the lane that leads into an interior
//   places.mat(material) / places.voxel()   interior variants of materials: no sun, lit by the room's own lamp (a fake
//                                            point light in the shader, so no real light is ever added to the scene)
//   places.sitAt(seat) / places.standUp()   simple seats (stools, a sofa, the edge of the bed): you sit, energy comes back
import * as THREE from 'three';
import { Game } from '../game/Game.js';
import { audio } from '../core/audio.js';
import { voxelMaterials } from '../voxel/materials.js';

// ------------------------------------------------------------------ interior materials (one shared fake lamp)
export const LAMP = { pos: { value: new THREE.Vector3(0, 100, 0) }, col: { value: new THREE.Color(0, 0, 0) }, pos2: { value: new THREE.Vector3(0, 100, 0) }, col2: { value: new THREE.Color(0, 0, 0) } };
let INDOOR_BEGIN = null;
const lampTerm = (p, c) => `{ vec3 Lv = ${p} + vViewPosition; float d2 = dot(Lv, Lv); float nd = max(dot(normal, Lv * inversesqrt(max(d2, 1e-4))), 0.0);
  reflectedLight.directDiffuse += BRDF_Lambert(material.diffuseColor) * ${c} * (0.25 + 0.75 * nd) / (1.0 + d2 * 0.28); }`;
function patchInterior(m, src) {
  if (!INDOOR_BEGIN) INDOOR_BEGIN = THREE.ShaderChunk.lights_fragment_begin.replace('#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )', '#if 0');
  const base = src?.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    if (base) base.call(src, sh, r);
    sh.uniforms.uLampP = LAMP.pos; sh.uniforms.uLampC = LAMP.col; sh.uniforms.uLampP2 = LAMP.pos2; sh.uniforms.uLampC2 = LAMP.col2;
    sh.fragmentShader = sh.fragmentShader
      .replace('void main() {', 'uniform vec3 uLampP; uniform vec3 uLampC; uniform vec3 uLampP2; uniform vec3 uLampC2;\nvoid main() {')
      .replace('#include <lights_fragment_begin>', INDOOR_BEGIN)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>\n${lampTerm('uLampP', 'uLampC')}\n${lampTerm('uLampP2', 'uLampC2')}`);
  };
  m.customProgramCacheKey = () => 'interior:' + (src?.customProgramCacheKey?.() || '');
  return m;
}
const matCache = new Map();
let voxCache = null;

export class Places {
  constructor(game) {
    this.game = game;
    game.places = this;
    this.list = {};
    this.where = null;
    this.busy = false;
    this.seat = null;
    this.far = game.camera.far;
    this._v = new THREE.Vector3();
    Game.updaters.push((g, dt) => this.update(dt));
  }

  /** An interior variant of a material (cached): no sunlight, lit by the room's lamp. Keeps its maps and colour. */
  mat(m) {
    if (!m) return m;
    if (Array.isArray(m)) return m.map((x) => this.mat(x));
    if (!m.isMeshStandardMaterial) return m; // basic / glow materials stay as they are
    let c = matCache.get(m);
    if (!c) { c = patchInterior(m.clone(), m); matCache.set(m, c); }
    return c;
  }
  voxel() {
    if (!voxCache) { const n = voxelMaterials('normal'); voxCache = [this.mat(n[0]), this.mat(n[1]), this.mat(n[2]), n[3], this.mat(n[4]), this.mat(n[5])]; }
    return voxCache;
  }

  add(def) {
    this.list[def.id] = def;
    if (def.group) def.group.visible = false;
    return def;
  }
  inside() { return !!this.where; }
  current() { return this.where ? this.list[this.where] : null; }

  /** A door on the lane into interior `to`. */
  door(obj, { to, text, sub = '', reach = 2.4, can = null } = {}) {
    const g = this.game;
    g.interaction.add(obj, {
      reach,
      hint: () => {
        const why = can?.();
        if (why) return { key: '', text, sub: why };
        return { key: 'LMB', text, sub };
      },
      use: () => { if (!can?.()) this.enter(to); return false; },
    });
    return obj;
  }

  enter(id, { sound = 'slideDoor' } = {}) {
    const g = this.game, d = this.list[id];
    if (!d || this.busy || g.cutscene.active) return false;
    this.busy = true;
    this.standUp();
    const self = this;
    g.cutscene.play(function* (c) {
      try { audio.play(sound, { vol: 0.6 }); } catch { /* */ }
      yield c.fade(1, 0.35);
      self.setWhere(id);
      const P = g.player;
      P.pos.set(d.spawn.x, 0, d.spawn.z); P.yaw = d.spawn.yaw ?? 0; P.pitch = d.spawn.pitch ?? -0.05; P.vel.set(0, 0, 0);
      g.needs && (g.needs.hasPrev = false);
      yield c.wait(0.15);
      yield c.fade(0, 0.45);
    }, { letterbox: false, skippable: false }).then(() => { this.busy = false; d.onEntered?.(); });
    return true;
  }

  exit({ instant = false, sound = 'slideDoor' } = {}) {
    const g = this.game, d = this.current();
    if (!d || this.busy) return false;
    this.standUp();
    const out = () => {
      this.setWhere(null);
      const P = g.player;
      P.pos.set(d.exit.x, 0, d.exit.z); P.yaw = d.exit.yaw ?? 0; P.pitch = -0.05; P.vel.set(0, 0, 0);
      if (g.needs) g.needs.hasPrev = false;
    };
    if (instant) { out(); return true; }
    if (g.cutscene.active) return false;
    this.busy = true;
    g.cutscene.play(function* (c) {
      try { audio.play(sound, { vol: 0.6 }); } catch { /* */ }
      yield c.fade(1, 0.35);
      out();
      yield c.wait(0.15);
      yield c.fade(0, 0.45);
    }, { letterbox: false, skippable: false }).then(() => { this.busy = false; d.onExited?.(); });
    return true;
  }

  setWhere(id) {
    const g = this.game, prev = this.current();
    if (prev && prev.id !== id) { if (prev.group) prev.group.visible = false; prev.onExit?.(); }
    this.where = id;
    const d = this.current();
    const cam = g.camera;
    if (d) {
      if (d.group) d.group.visible = true;
      d.onEnter?.();
      cam.far = d.far || 40;
    } else cam.far = this.far;
    cam.updateProjectionMatrix();
    LAMP.col.value.setRGB(0, 0, 0); LAMP.col2.value.setRGB(0, 0, 0);
    g.events.emit('place', { where: id });
  }

  // ------------------------------------------------------------------ simple seats
  /** seat: { pos: Vector3 (floor point), yaw, eye, rest (rate), onStand() } */
  sitAt(seat) {
    const g = this.game, P = g.player;
    if (this.seat) this.standUp();
    this.seat = { ...seat, t: 0, eye0: P.eye };
    P.vel.set(0, 0, 0);
    const p0 = P.pos.clone(), e0 = P.eye, e1 = seat.eye ?? 1.15;
    let dy = (seat.yaw ?? P.yaw) - P.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    const y0 = P.yaw;
    g.tweens.add({ dur: 0.45, update: (k) => { const e = k * k * (3 - 2 * k); P.pos.lerpVectors(p0, seat.pos, e); P.pos.y = 0; P.eye = e0 + (e1 - e0) * e; P.yaw = y0 + dy * e; } });
    try { audio.play('chairCreak', { vol: 0.5 }); } catch { /* */ }
  }
  standUp() {
    const S = this.seat, P = this.game.player;
    if (!S) return;
    this.seat = null;
    const e0 = P.eye;
    this.game.tweens.add({ dur: 0.3, update: (k) => { P.eye = e0 + (S.eye0 - e0) * k; } });
    S.onStand?.();
  }

  // ------------------------------------------------------------------ standing at a work spot (register, sink)
  /** Hold you at `pos` (free look, no walking): obstacles around the spot are switched off meanwhile. */
  lockAt(pos, { yaw = null, pitch = null, eye = null } = {}) {
    const P = this.game.player;
    this.unlock();
    const r = P.radius + 0.06;
    const off = P.obstacles.filter((o) => o.enabled && pos.x > o.minX - r && pos.x < o.maxX + r && pos.z > o.minZ - r && pos.z < o.maxZ + r);
    for (const o of off) o.enabled = false;
    this.lock = { pos: pos.clone(), off, eye0: P.eye };
    P.pos.set(pos.x, 0, pos.z); P.vel.set(0, 0, 0);
    if (yaw !== null) P.yaw = yaw;
    if (pitch !== null) P.pitch = pitch;
    if (eye !== null) P.eye = eye;
    if (this.game.needs) this.game.needs.hasPrev = false;
  }
  unlock() {
    const L = this.lock;
    if (!L) return;
    for (const o of L.off) o.enabled = true;
    this.game.player.eye = L.eye0;
    this.lock = null;
  }

  update(dt) {
    const g = this.game, inp = g.input, P = g.player;
    if (this.lock) {
      for (const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight']) inp.keys.delete(k);
      inp.axis.x = inp.axis.z = 0;
      P.pos.x = this.lock.pos.x; P.pos.z = this.lock.pos.z; P.vel.set(0, 0, 0);
    }
    const S = this.seat;
    if (S) {
      S.t += dt;
      const walk = inp.key('KeyW') || inp.key('KeyA') || inp.key('KeyS') || inp.key('KeyD') || inp.axis.x || inp.axis.z;
      if (S.t > 0.5 && walk && !S.locked) this.standUp();
      else if (S.t > 0.45) { P.pos.x = S.pos.x; P.pos.z = S.pos.z; g.needs?.restAt(S.rest ?? 1); }
    }
    const d = this.current();
    if (!d) return;
    d.update?.(dt);
    // the room's lamp(s), in view space for the interior shader
    const cam = g.camera;
    cam.updateMatrixWorld();
    const L = d.lamp;
    if (L) {
      LAMP.pos.value.set(L.x, L.y, L.z).applyMatrix4(cam.matrixWorldInverse);
      LAMP.col.value.set(L.color ?? 0xffe8c8).multiplyScalar((L.intensity ?? 1) * (L.k ?? 1));
    }
    const L2 = d.lamp2;
    if (L2) {
      LAMP.pos2.value.set(L2.x, L2.y, L2.z).applyMatrix4(cam.matrixWorldInverse);
      LAMP.col2.value.set(L2.color ?? 0xffe8c8).multiplyScalar((L2.intensity ?? 1) * (L2.k ?? 1));
    }
  }
}
