// Camera grammar for the cinematic moments, on top of the generator cutscene engine (src/game/Cutscene.js):
// a dutch roll, eased orbits and push-ins, a check that a camera spot is free of walls, framing by composition (rule
// of thirds, a low angle, a narrow lens for a close-up: no blur), and your own character as a stand-in for the
// third-person shots.
//   installCamera(game)                         adds c.roll (radians) to every cutscene (reset when it ends)
//   orbit(c, { center, radius, from, to, height, look, dur, fov, ease })  an eased arc round a point (a waiter)
//   rollTo(c, roll, dur)                        ease the dutch angle
//   punch(c, { fov, dur })                      a quick push-in on the lens
//   freeShot(game, target, yaw, opts)          { pos, look } for a free spot facing target from yaw's front
//   standIn(game)                               your character: { h, show(pos, yaw), hide(), update(dt, lookAt) }
import * as THREE from 'three';

const smoother = (k) => k * k * k * (k * (k * 6 - 15) + 10);
const smooth = (k) => k * k * (3 - 2 * k);
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
const _f = new THREE.Vector3();

export function installCamera(game) {
  const c = game.cutscene;
  if (!c || c._rollPatched) return;
  c._rollPatched = true;
  c.roll = 0;
  const apply = c.applyCamera.bind(c), fin = c.finish.bind(c);
  c.applyCamera = function () {
    apply();
    if (this.camOn && this.roll) { game.camera.rotateZ(this.roll); game.camera.updateMatrixWorld(); }
  };
  c.finish = function () { this.roll = 0; fin(); };
}

/** An eased arc round center (angles in radians, 0 = +z); the camera looks at `look` (default: center). */
export function orbit(c, { center, radius = 2, from = 0, to = Math.PI / 4, height = 1.4, look = null, dur = 3, fov = null, ease = smoother, lift = 0 }) {
  c.camOn = true;
  const f0 = c.fov ?? c.game.camera.fov, l0 = c.look.clone();
  let t = 0;
  const place = (k) => {
    const a = from + (to - from) * k;
    c.pos.set(center.x + Math.sin(a) * radius, height + lift * k, center.z + Math.cos(a) * radius);
    c.look.lerpVectors(l0, look || center, Math.min(1, k * 3));
    if (fov) c.fov = f0 + (fov - f0) * Math.min(1, k * 2);
  };
  if (!dur) { place(1); return null; }
  return { update: (dt) => { t = Math.min(dur, t + dt); place(ease(t / dur)); return t >= dur; } };
}

export function rollTo(c, roll, dur = 0.6) {
  const r0 = c.roll || 0;
  let t = 0;
  if (!dur) { c.roll = roll; return null; }
  return { update: (dt) => { t = Math.min(dur, t + dt); c.roll = r0 + (roll - r0) * smooth(t / dur); return t >= dur; } };
}

/** A quick push in on the lens (and back out when `back`). */
export function punch(c, { fov = 30, dur = 0.25 } = {}) {
  const f0 = c.fov ?? c.game.camera.fov;
  let t = 0;
  return { update: (dt) => { t = Math.min(dur, t + dt); c.fov = f0 + (fov - f0) * smooth(t / dur); return t >= dur; } };
}

/** Is a camera at (x, z) clear of the walls and furniture the player collides with? */
export function clearAt(game, x, z, pad = 0.22) {
  for (const o of game.player.obstacles || []) {
    if (o.enabled === false) continue;
    if (x > o.minX - pad && x < o.maxX + pad && z > o.minZ - pad && z < o.maxZ + pad) return false;
  }
  return true;
}
/** Every point on the segment a..b clear (a camera's view line along the floor plan). */
export function clearLine(game, a, b, n = 8, pad = 0.05) {
  for (let i = 1; i < n; i++) { const k = i / n; if (!clearAt(game, a.x + (b.x - a.x) * k, a.z + (b.z - a.z) * k, pad)) return false; }
  return true;
}

/**
 * A free camera spot facing `target` (Vector3, the subject's feet) from in front of it (yaw: the way the subject
 * faces). Tries the given angles off the front (radians) and distances in order. opts: { angles, dists, height,
 * lookY, side } -> { pos, look, angle, dist }.
 */
export function freeShot(game, target, yaw, { angles = [0.35, -0.35, 0.7, -0.7, 0, 1.1, -1.1, 1.5, -1.5], dists = [2.4, 1.9, 1.5, 1.2], height = 1.0, lookY = 1.25 } = {}) {
  for (const d of dists) for (const a of angles) {
    const x = target.x + Math.sin(yaw + a) * d, z = target.z + Math.cos(yaw + a) * d;
    if (clearAt(game, x, z) && clearLine(game, _f.set(x, 0, z), target)) return { pos: V(x, height, z), look: V(target.x, lookY, target.z), angle: a, dist: d };
  }
  return { pos: V(target.x + Math.sin(yaw) * 1.1, height, target.z + Math.cos(yaw) * 1.1), look: V(target.x, lookY, target.z), angle: 0, dist: 1.1 };
}

/** Your own character for third-person shots (the one the chat two-shot uses: same look, same scale). */
export function standIn(game) {
  const h = game.talk?.avatar?.();
  if (!h) return null;
  const S = {
    h,
    show(pos, yaw) { h.root.visible = true; h.root.position.set(pos.x, 0, pos.z); h.root.rotation.set(0, yaw, 0); h.hasPrev = false; h.clearGesture?.(); return S; },
    hide() { h.clearGesture?.(); h.root.visible = false; },
    update(dt, lookAt = null) { if (h.root.visible) h.update(dt, { speed: 0, lookAt }); },
  };
  return S;
}

/** The yaw a Human faces (root rotation y) to look from a toward b. */
export const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
