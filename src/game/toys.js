// Interactive toys (series with `toy` items, e.g. src/data/series/omocha.js): what happens when you use one.
//  In your hand (left click with nothing targeted): squishy (hold to squeeze), super ball (throw, it bounces),
//  spinning top (spins on the surface you aim at, wobbles, topples), yo-yo (throw down, hold to sleep), wind-up
//  robot (wind, set down, it walks the floor or the table and turns at edges), kendama (flip the ball onto a cup or
//  the spike), foam dart blaster (darts fly with gravity and stick to walls and people), pocket LCD game (a little
//  runner on the toy's own screen: click to jump).
//  On a shelf or lying around (right click with empty hands): they play in place.
// game.toys.use(item) / hint(item) are wired into game.held here (instance wrappers, Held.js is untouched).
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { getItem } from '../data/series/index.js';
import { VoxelModel } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { voxelMaterials } from '../voxel/materials.js';
import { upres2x } from '../voxel/upres.js';
import { buildItemModel, ITEM_VOXEL } from './collectibles.js';
import { isFigure, figureData, playGimmick, stopGimmick } from '../figures/index.js';
import { DisplaySlots } from './Display.js';
import { draw5 } from '../gfx/font5x7.js';
import './gachaSfx.js';

const HINTS = {
  squishy: { key: 'Hold LMB', text: 'Squeeze it' },
  ball: { key: 'LMB', text: 'Throw the ball' },
  top: { key: 'LMB', text: 'Spin the top', sub: 'Aim at the floor or a table' },
  yoyo: { key: 'LMB', text: 'Throw the yo-yo', sub: 'Hold to let it sleep' },
  robot: { key: 'LMB', text: 'Wind it up and set it down' },
  kendama: { key: 'LMB', text: 'Flip the ball' },
  dartgun: { key: 'LMB', text: 'Fire a foam dart' },
  lcd: { key: 'LMB', text: 'Play Capsule Dash', sub: 'Click to jump' },
};
const MAX_DARTS = 14;
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _m3 = new THREE.Matrix4();
const item3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

export function toyKind(key) { return getItem(key)?.toy || null; }

// ------------------------------------------------------------------ geometry helpers
const partCache = new Map();
/** Mesh frame of an item: the full figure mesh is bottom-centred on its design-voxel bounds. */
function frameOf(item) {
  const b = buildItemModel(item).bounds();
  return { b, vs: ITEM_VOXEL, off: new THREE.Vector3(-(b.minX + b.w / 2) * ITEM_VOXEL, -b.minY * ITEM_VOXEL, -(b.minZ + b.d / 2) * ITEM_VOXEL) };
}
/** Design voxel coordinates -> the item mesh's local space. */
function toMesh(item, x, y, z, out = new THREE.Vector3()) {
  const f = frameOf(item);
  return out.set(x * f.vs, y * f.vs, z * f.vs).add(f.off);
}
// Sculpted toys (src/figures): their moving parts are the figure's joints, posed with playGimmick, and the points the
// play needs (item.points, item.screen with mm: true) are in the figure's millimetres.
/** Figure millimetres -> the item mesh's local space. */
function figPoint(item, p, out = new THREE.Vector3()) { return out.set(p[0], p[1], p[2]).applyMatrix4(figureData(item).C); }
/** The joint node of a posed figure mesh (after playGimmick). */
const jointNode = (mesh, name) => mesh.children.find((c) => c.userData.gimmickPart === name) || null;
const dartGeos = new Map();
/** A flying dart for a sculpted blaster: its loaded dart, centred on its own origin, pointing +z. */
function figureDart(item, inner) {
  let g = dartGeos.get(item.key);
  if (!g) {
    const live = !!inner.userData.gimmickLive;
    playGimmick(inner, null);
    const node = jointNode(inner, 'dart');
    if (!node) return null;
    g = node.geometry.clone();
    g.computeBoundingBox();
    const c = g.boundingBox.getCenter(new THREE.Vector3());
    g.translate(-c.x, -c.y, -c.z);
    dartGeos.set(item.key, g);
    if (!live) stopGimmick(inner);
  }
  const m = new THREE.Mesh(g, inner.material);
  m.castShadow = true;
  return m;
}
/** A moving part (item.parts[name]) as a mesh in the same frame as the figure (up-resolved like it). */
function partMesh(item, name) {
  const k = item.key + ':' + name;
  if (!partCache.has(k)) {
    const v = new VoxelModel();
    item.parts[name](v);
    partCache.set(k, meshVoxels(upres2x(v), { voxelSize: ITEM_VOXEL / 2, origin: 'none' }));
  }
  const m = new THREE.Mesh(partCache.get(k), voxelMaterials('normal'));
  m.castShadow = true;
  return m;
}

// ------------------------------------------------------------------ the LCD game
class LcdGame {
  constructor() {
    this.c = document.createElement('canvas');
    this.c.width = 48; this.c.height = 32;
    this.ctx = this.c.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.c);
    this.tex.magFilter = THREE.NearestFilter; this.tex.minFilter = THREE.NearestFilter;
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.reset();
    this.hi = 9999;
    this.draw();
  }
  reset() { this.y = 0; this.vy = 0; this.obs = []; this.spawn = 1.2; this.score = 0; this.over = false; this.t = 0; this.on = false; }
  jump() {
    if (!this.on || this.over) { this.reset(); this.on = true; audio.play('lcdBeep', { f: 1320, dur: 0.12 }); return; }
    if (this.y <= 0.01) { this.vy = 26; audio.play('lcdBeep', { f: 1760, dur: 0.05 }); }
  }
  update(dt, demo = false) {
    this.t += dt;
    if (demo) { this.on = true; if (this.over) this.reset(), this.on = true; }
    if (this.on && !this.over) {
      this.vy -= 90 * dt; this.y = Math.max(0, this.y + this.vy * dt); if (this.y === 0) this.vy = 0;
      this.spawn -= dt;
      if (this.spawn <= 0) { this.obs.push({ x: 50, big: Math.random() < 0.25 }); this.spawn = 0.9 + Math.random() * 1.1 - Math.min(0.5, this.score / 200); }
      for (const o of this.obs) o.x -= dt * (26 + Math.min(20, this.score / 8));
      this.obs = this.obs.filter((o) => o.x > -6);
      const prev = Math.floor(this.score);
      this.score += dt * 8;
      if (Math.floor(this.score / 25) > Math.floor(prev / 25)) audio.play('lcdBeep', { f: 2093, dur: 0.04 });
      for (const o of this.obs) {
        if (demo && o.x < 18 && o.x > 10 && this.y === 0) this.jump();
        if (o.x < 12 && o.x > 4 && this.y < (o.big ? 7 : 5)) { this.over = true; audio.play('lcdBeep', { f: 330, dur: 0.3 }); }
      }
    }
    this.drawT = (this.drawT || 0) - dt;
    if (this.drawT <= 0) { this.drawT = 1 / 15; this.draw(); }
  }
  draw() {
    const g = this.ctx, on = '#26301e', ghost = '#8f9c80';
    g.fillStyle = '#9fae8e'; g.fillRect(0, 0, 48, 32);
    // ghost segments (unlit LCD cells)
    g.fillStyle = ghost;
    for (const x of [6, 22, 38]) g.fillRect(x, 22, 5, 4);
    g.fillRect(6, 14, 5, 7);
    g.fillStyle = on;
    g.fillRect(0, 27, 48, 1);
    draw5(g, String(Math.floor(this.score)).padStart(4, '0'), 47, 1, { col: on, align: 'right' });
    if (!this.on) { draw5(g, 'CAPSULE', 24, 9, { col: on, align: 'center' }); draw5(g, 'DASH', 24, 18, { col: on, align: 'center' }); return; }
    // the runner: a capsule with legs
    const ry = Math.round(26 - this.y);
    g.fillRect(6, ry - 7, 5, 3); g.fillStyle = '#4a5a3a'; g.fillRect(6, ry - 4, 5, 2); g.fillStyle = on;
    if (Math.floor(this.t * 8) % 2 || this.y > 0) { g.fillRect(7, ry - 2, 1, 2); g.fillRect(9, ry - 2, 1, 2); } else { g.fillRect(6, ry - 2, 1, 2); g.fillRect(10, ry - 2, 1, 2); }
    for (const o of this.obs) { const x = Math.round(o.x); g.fillRect(x, o.big ? 20 : 22, 4, o.big ? 7 : 5); }
    if (this.over) draw5(g, 'GAME OVER', 24, 9, { col: on, align: 'center' });
    this.tex.needsUpdate = true;
  }
}

// ------------------------------------------------------------------ the system
export class Toys {
  constructor(game) {
    this.game = game;
    this.world = []; // running toys in the world (ball, top, robot)
    this.darts = [];
    this.squeeze = 0;
    this.squeezing = false;
    this.yoyo = null;
    this.kendama = null;
    this.lcds = new Map(); // item mesh -> LcdGame
    this.inPlace = [];
  }

  inner(it) { return it?.obj?.children.find((c) => c.userData.itemKey) || null; }
  kind(it) { return it?.kind === 'toy' ? toyKind(it.data.key) : null; }

  hint(it) {
    const k = this.kind(it);
    if (!k || this.game.held.busy) return null;
    const h = { ...HINTS[k] };
    if (k === 'lcd' && this.lcdOf(it)?.on) { h.text = this.lcdOf(it).over ? 'Play again' : 'Jump'; h.sub = `Score ${Math.floor(this.lcdOf(it).score)}`; }
    h.sub = h.sub ? `${h.sub} · RMB inspect` : 'RMB inspect · Q put down';
    return h;
  }

  /** Left click with a toy in hand. Returns true when the toy did something. */
  use(it) {
    const k = this.kind(it), g = this.game;
    if (!k || g.held.busy || g.held.inspecting) return false;
    if (k === 'squishy') { this.squeezing = true; audio.play('squeak', { pitch: 1 }); return true; }
    if (k === 'ball') { this.throwBall(it); return true; }
    if (k === 'top') { this.launch(it, 'top'); return true; }
    if (k === 'robot') { this.windRobot(it); return true; }
    if (k === 'yoyo') { if (!this.yoyo) this.startYoyo(it); return true; }
    if (k === 'kendama') { if (!this.kendama) this.flipKendama(it); return true; }
    if (k === 'dartgun') { this.fireDart(it); return true; }
    if (k === 'lcd') { this.lcdOf(it, true).jump(); return true; }
    return false;
  }

  // ---------------------------------------------------------------- squishy
  updateSquishy(dt, it) {
    const g = this.game, inner = this.inner(it);
    const want = this.squeezing && g.input.button(0) ? 1 : 0;
    if (this.squeezing && !want) { this.squeezing = false; audio.play('squeak', { pitch: 1.35 }); }
    this.squeeze += (want - this.squeeze) * Math.min(1, dt * (want ? 14 : 7));
    if (inner) { const k = this.squeeze; inner.scale.set(1 + 0.3 * k, 1 - 0.45 * k, 1 + 0.3 * k); }
  }

  // ---------------------------------------------------------------- thrown / launched toys
  /** Release the held toy and hand back its mesh holder at its world transform. */
  takeOut(it) {
    const g = this.game;
    const rel = g.held.release();
    if (!rel) return null;
    return rel;
  }

  throwBall(it) {
    const g = this.game;
    const rel = this.takeOut(it);
    if (!rel) return;
    const p = rel.obj.getWorldPosition(new THREE.Vector3());
    rel.obj.parent?.remove(rel.obj);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(g.camera.quaternion);
    this.spawnBall(rel.data, p, fwd.multiplyScalar(5.5).add(new THREE.Vector3(0, 1.2, 0)));
    audio.play('whoosh', { vol: 0.6, v: 0.12 });
    g.held.tossed = g.time;
  }

  /** A bouncy ball loose in the world (a pick-up-able toy with a lively physics body). */
  spawnBall(data, pos, vel) {
    const g = this.game;
    const ent = g.items.spawnToy({ key: data.key, finish: data.finish }, pos, { physics: false });
    const size = ent.mesh.geometry.userData.size, r = Math.max(0.012, size.y * 0.5);
    ent.mesh.position.y = -r;
    ent.body = g.physics.addBody({
      radius: r, position: pos.clone(), velocity: vel, object: ent.obj, restitution: 0.86, friction: 0.2, rollDamping: 0.4,
      onImpact: (speed) => { if (speed > 0.35 && audio.canPlay('ball' + ent.id, 0.05)) audio.play('boing', { pos: ent.body.pos, v: speed / 3 }); },
    });
    return ent;
  }

  /** Spinning top / robot: leaves the hand for the surface under the crosshair (or the floor ahead). */
  launch(it, kind) {
    const g = this.game;
    const hit = g.placement?.surfaceHit?.(2.4);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(g.camera.quaternion).setY(0).normalize();
    const target = hit && hit.point.y < 1.4 ? hit.point.clone() : g.player.pos.clone().addScaledVector(fwd, 0.8).setY(0);
    const yaw = Math.atan2(fwd.x, fwd.z);
    const data = it.data;
    g.held.putTo(target, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), (obj) => {
      obj.scale.setScalar(1);
      const inner = obj.children.find((c) => c.userData.itemKey);
      if (inner) { inner.scale.setScalar(1); inner.position.set(0, 0, 0); inner.rotation.set(0, 0, 0); }
      obj.position.copy(target);
      obj.rotation.set(0, yaw, 0);
      if (kind === 'top') {
        audio.play('topSpin', { pos: target, dur: 5.5 });
        this.world.push({ kind, obj, inner, data, t: 0, dur: 5 + Math.random() * 2, spin: 30, drift: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).multiplyScalar(0.04) });
      } else this.world.push({ kind, obj, inner, data, t: 0, dur: 7 + Math.random() * 3, stepT: 0, y: target.y });
    }, { dur: 0.3, arc: 0.08, scale: 1 });
  }

  windRobot(it) {
    const g = this.game, inner = this.inner(it), item = getItem(it.data.key);
    if (this.winding) return;
    this.winding = true;
    audio.play('windup');
    let key = null, spin = null;
    if (inner && isFigure(item)) spin = (k) => playGimmick(inner, null, null, { key: -k * Math.PI * 4 });
    else if (inner && item.parts?.key) {
      key = partMesh(item, 'key');
      key.position.copy(toMesh(item, 0, 10, -6.5));
      inner.add(key);
    }
    g.tweens.add({ dur: 0.6, update: (k) => { if (key) key.rotation.z = k * Math.PI * 4; spin?.(k); inner && (inner.rotation.z = Math.sin(k * 30) * 0.03); }, done: () => {
      key?.parent?.remove(key);
      if (spin) stopGimmick(inner);
      this.winding = false;
      if (g.held.item === it) this.launch(it, 'robot');
    } });
  }

  updateWorld(dt) {
    const g = this.game;
    for (let i = this.world.length - 1; i >= 0; i--) {
      const w = this.world[i];
      w.t += dt;
      const o = w.obj;
      if (w.kind === 'top') {
        const k = Math.min(1, w.t / w.dur);
        o.rotation.y += w.spin * (1 - k * 0.7) * dt;
        const tilt = 0.04 + k * k * 0.45;
        const ph = w.t * (4 + k * 6);
        if (w.inner) { w.inner.rotation.x = Math.sin(ph) * tilt; w.inner.rotation.z = Math.cos(ph) * tilt; }
        o.position.addScaledVector(w.drift, dt * (1 - k));
        if (w.t >= w.dur) this.settle(w, i, 1.2);
      } else if (w.kind === 'robot') {
        const k = Math.min(1, w.t / w.dur), speed = 0.07 * (1 - k * k);
        const dir = _v.set(Math.sin(o.rotation.y), 0, Math.cos(o.rotation.y));
        const nx = o.position.x + dir.x * speed * dt, nz = o.position.z + dir.z * speed * dt;
        const ground = g.groundAt ? g.groundAt(nx, nz, w.y + 0.02) : 0;
        const ahead = g.groundAt ? g.groundAt(o.position.x + dir.x * 0.05, o.position.z + dir.z * 0.05, w.y + 0.02) : 0;
        if (Math.abs(ahead - w.y) > 0.03 || Math.abs(nx) > 3.8 || nz > 4.7 || nz < -4.8) o.rotation.y += Math.PI * (0.7 + Math.random() * 0.6); // an edge or a wall: turn round
        else { o.position.x = nx; o.position.z = nz; o.position.y = ground; w.y = ground; }
        if (w.inner) {
          w.inner.rotation.z = Math.sin(w.t * 13) * 0.12 * (1 - k); w.inner.position.y = Math.abs(Math.sin(w.t * 13)) * 0.003 * (1 - k);
          // a sculpted robot walks with its legs and swings its arms while the key unwinds
          if (isFigure(getItem(w.data.key))) { const s = Math.sin(w.t * 13) * (1 - k); playGimmick(w.inner, null, null, { legL: 0.4 * s, legR: -0.4 * s, armL: -0.45 * s, armR: 0.45 * s, key: w.t * 5 * (1 - k * 0.5) }); }
        }
        w.stepT -= dt;
        if (w.stepT <= 0 && k < 0.95) { w.stepT = 0.24; audio.play('robotStep', { pos: o.position, vol: 0.6 }); }
        if (w.t >= w.dur) this.settle(w, i, 0);
      }
    }
  }

  /** A launched toy stops: it becomes an ordinary toy lying where it ended up (topple = tilt it over). */
  settle(w, i, topple) {
    const g = this.game;
    this.world.splice(i, 1);
    const p = w.obj.position.clone(), yaw = w.obj.rotation.y;
    const finish = () => { w.obj.parent?.remove(w.obj); g.items.spawnToy({ key: w.data.key, finish: w.data.finish }, p, { rotY: yaw, physics: false }); };
    if (!topple) { finish(); return; }
    audio.play('place', { pos: p, vol: 0.6 });
    const x0 = w.inner?.rotation.x || 0;
    g.tweens.add({ dur: 0.4, update: (k) => { if (w.inner) w.inner.rotation.x = x0 + (topple - x0) * k * k; }, done: () => { g.tweens.wait(1.2, finish); } });
  }

  // ---------------------------------------------------------------- yo-yo
  startYoyo(it) {
    const inner = this.inner(it);
    if (!inner) return;
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xf4f0e0 }));
    line.frustumCulled = false;
    it.obj.add(line);
    const item = getItem(it.data.key);
    this.yoyo = { it, inner, line, t: 0, phase: 'down', d: 0, sleep: 0, c: isFigure(item) && item.points?.centre ? figPoint(item, item.points.centre) : null };
    audio.play('whoosh', { vol: 0.4, v: 0.08 });
  }

  updateYoyo(dt) {
    const Y = this.yoyo, g = this.game;
    if (!Y) return;
    const held = g.held.item === Y.it;
    const len = 0.2;
    if (Y.phase === 'down') { Y.d = Math.min(1, Y.d + dt / 0.3); if (Y.d >= 1) Y.phase = g.input.button(0) && held ? 'sleep' : 'up'; }
    else if (Y.phase === 'sleep') { Y.sleep += dt; if (!g.input.button(0) || Y.sleep > 4 || !held) { Y.phase = 'up'; audio.play('whoosh', { vol: 0.35, v: 0.06 }); } }
    else { Y.d = Math.max(0, Y.d - dt / 0.28); if (Y.d <= 0) this.endYoyo(); }
    if (!this.yoyo) return;
    const k = Y.phase === 'up' ? Y.d * Y.d : 1 - (1 - Y.d) * (1 - Y.d);
    Y.inner.position.y = -k * len;
    Y.inner.rotation.z -= dt * (Y.phase === 'sleep' ? 40 : 25);
    const pos = Y.line.geometry.attributes.position;
    if (Y.c) {
      // (a sculpted yo-yo spins about its axle, not about the point it stands on)
      const c = Y.c, a = Y.inner.rotation.z, cs = Math.cos(a), sn = Math.sin(a);
      Y.inner.position.x = c.x - (c.x * cs - c.y * sn);
      Y.inner.position.y = c.y - (c.x * sn + c.y * cs) - k * len;
      pos.setXYZ(0, c.x, 0.05, c.z); pos.setXYZ(1, c.x, c.y - k * len, c.z);
    } else { pos.setXYZ(0, 0, 0.05, 0); pos.setXYZ(1, 0, Y.inner.position.y + 0.02, 0); }
    pos.needsUpdate = true;
  }

  endYoyo() {
    const Y = this.yoyo;
    Y.line.parent?.remove(Y.line);
    Y.inner.position.x = 0; Y.inner.position.y = 0; Y.inner.rotation.z = 0;
    this.yoyo = null;
  }

  // ---------------------------------------------------------------- kendama
  flipKendama(it) {
    const inner = this.inner(it), item = getItem(it.data.key);
    if (inner && isFigure(item) && item.points) {
      // a sculpted kendama: its ball is a joint of the figure, flown along an arc in figure millimetres
      if (!playGimmick(inner, null)) return;
      const node = jointNode(inner, 'tama');
      if (!node) { stopGimmick(inner); return; }
      const r = Math.random(), target = r < 0.38 ? 'big' : r < 0.68 ? 'small' : r < 0.86 ? 'spike' : 'miss';
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xf4f0e0 }));
      line.frustumCulled = false;
      inner.add(line);
      this.kendama = { it, inner, node, line, item, fig: true, from: item.points.rest, to: item.points[target], t: 0, target };
      audio.play('whoosh', { vol: 0.4, v: 0.1 });
      return;
    }
    if (!inner || !item.parts) return;
    const ken = partMesh(item, 'ken'), ball = partMesh(item, 'tama');
    ken.position.copy(frameOf(item).off);
    inner.parent.add(ken);
    inner.parent.add(ball);
    for (const m of [ken, ball]) { m.scale.copy(inner.scale); m.quaternion.copy(inner.quaternion); m.position.applyQuaternion(inner.quaternion).add(inner.position); }
    inner.visible = false;
    const r = Math.random();
    const target = r < 0.38 ? 'big' : r < 0.68 ? 'small' : r < 0.86 ? 'spike' : 'miss';
    const at = { big: [-8.5, 15, 0], small: [6.5, 14.5, 0], spike: [0, 27, 0], miss: [3, 4, 2] }[target];
    const from = toMesh(item, 0, 27, 0), to = toMesh(item, ...at);
    this.kendama = { it, inner, ken, ball, from, to, t: 0, target, item };
    audio.play('whoosh', { vol: 0.4, v: 0.1 });
  }

  updateKendama(dt) {
    const K = this.kendama;
    if (!K) return;
    K.t += dt;
    const T = 0.75, k = Math.min(1, K.t / T);
    if (K.fig) {
      const F = figureData(K.item), a = K.from, b = K.to, P = item3(a, b, k);
      P[1] += Math.sin(k * Math.PI) * 40;
      _m.copy(F.C).multiply(_m2.makeTranslation(P[0], P[1], P[2])).multiply(_m3.makeRotationX(k * Math.PI * 4)).multiply(_m2.makeTranslation(-a[0], -a[1], -a[2])).multiply(F.Ci);
      K.node.matrix.copy(_m); K.node.matrixWorldNeedsUpdate = true;
      const pos = K.line.geometry.attributes.position;
      figPoint(K.item, K.item.points.string, _v); pos.setXYZ(0, _v.x, _v.y, _v.z);
      figPoint(K.item, [P[0], P[1] - K.item.points.r * 0.8, P[2]], _v); pos.setXYZ(1, _v.x, _v.y, _v.z); pos.needsUpdate = true;
      if (k >= 1 && !K.landed) this.kendamaLanded(K);
      if (K.t > T + 0.9 || this.game.held.item !== K.it) { K.line.parent?.remove(K.line); stopGimmick(K.inner); this.kendama = null; }
      return;
    }
    const p = _v.lerpVectors(K.from, K.to, k);
    p.y += Math.sin(k * Math.PI) * 0.09;
    K.ball.position.copy(p).applyQuaternion(K.inner.quaternion).add(K.inner.position);
    K.ball.rotation.x = k * Math.PI * 4;
    if (k >= 1 && !K.landed) this.kendamaLanded(K);
    if (K.t > T + 0.9 || this.game.held.item !== K.it) {
      K.ken.parent?.remove(K.ken); K.ball.parent?.remove(K.ball);
      K.inner.visible = true;
      this.kendama = null;
    }
  }

  kendamaLanded(K) {
    K.landed = true;
    if (K.target === 'miss') audio.play('place', { vol: 0.4 });
    else audio.play('kendamaClack', { spike: K.target === 'spike' });
    const msg = { big: 'Ōzara! (big cup)', small: 'Kozara! (small cup)', spike: 'TOME-KEN! On the spike!', miss: 'Missed... it dangles.' }[K.target];
    this.game.news(msg);
    if (K.target === 'spike') this.game.effects.sparks?.({ pos: (K.ball || K.node).getWorldPosition(_v2), count: 14, colors: [0xffd23f, 0xff8af0], speed: 0.4, size: 0.008 });
  }

  // ---------------------------------------------------------------- foam darts
  fireDart(it) {
    const g = this.game, inner = this.inner(it), item = getItem(it.data.key);
    if (!inner) return;
    const fig = isFigure(item) && item.points?.muzzle;
    const muzzle = inner.localToWorld(fig ? figPoint(item, item.points.muzzle) : toMesh(item, 0, 11, 18));
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(g.camera.getWorldQuaternion(_q));
    // from the muzzle, but aimed where the crosshair points
    const start = muzzle.lerp(g.camera.getWorldPosition(_v2).addScaledVector(dir, 0.3), 0.5);
    const dart = fig ? figureDart(item, inner) : partMesh(item, 'dart');
    if (!dart) return;
    if (fig) {
      // the loaded dart leaves the barrel; another is pushed home a moment later
      playGimmick(inner, null);
      const node = jointNode(inner, 'dart');
      if (node) node.visible = false;
      clearTimeout(this.reload);
      this.reload = setTimeout(() => { if (node) node.visible = true; if (!this.kendama) stopGimmick(inner); }, 450);
    }
    const holder = new THREE.Group();
    dart.position.copy(frameOf(item).off).multiplyScalar(0); // part frame: dart built around its own origin
    dart.position.set(0, 0, -ITEM_VOXEL * 0.5);
    holder.add(dart);
    holder.scale.setScalar(1.3);
    holder.position.copy(start);
    g.scene.add(holder);
    const D = { obj: holder, vel: dir.clone().multiplyScalar(11), stuck: false, t: 0, life: 40 };
    D.body = g.physics.addBody({
      radius: 0.006, position: start.clone(), velocity: D.vel.clone(), object: null, restitution: 0, friction: 1, collideBodies: false, gravityScale: 0.55, roll: false,
      onImpact: (speed) => { if (!D.stuck && speed > 1.2) this.stick(D); },
    });
    this.darts.push(D);
    while (this.darts.length > MAX_DARTS) this.removeDart(this.darts[0]);
    audio.play('dartPop', { pos: start, vol: 0.9 });
    // recoil
    g.tweens.add({ dur: 0.18, update: (k) => { inner.position.z = -Math.sin(k * Math.PI) * 0.012; inner.rotation.x = Math.sin(k * Math.PI) * 0.12; } });
  }

  stick(D, person = null) {
    const g = this.game;
    D.stuck = true;
    if (D.body) { const p = D.body.pos.clone(); g.physics.removeBody(D.body); D.body = null; D.obj.position.copy(p); }
    D.obj.position.addScaledVector(_v.copy(D.vel).normalize(), 0.012);
    if (person) person.attach(D.obj);
    audio.play('thwack', { pos: D.obj.getWorldPosition(_v2), vol: 0.8 });
    D.life = person ? 12 : 30;
  }

  removeDart(D) {
    const g = this.game;
    if (D.body) g.physics.removeBody(D.body);
    D.obj.parent?.remove(D.obj);
    this.darts.splice(this.darts.indexOf(D), 1);
  }

  updateDarts(dt) {
    const g = this.game;
    const people = g.pedestrians?.list || [];
    for (const D of [...this.darts]) {
      D.t += dt;
      if (!D.stuck && D.body) {
        D.vel.copy(D.body.vel);
        D.obj.position.copy(D.body.pos);
        if (D.vel.lengthSq() > 0.01) D.obj.quaternion.setFromUnitVectors(_v.set(0, 0, 1), _v2.copy(D.vel).normalize());
        for (const p of people) {
          const r = p.h?.root;
          if (!r) continue;
          const dx = D.obj.position.x - r.position.x, dz = D.obj.position.z - r.position.z, y = D.obj.position.y - r.position.y;
          if (dx * dx + dz * dz < 0.05 && y > 0.25 && y < 1.75) {
            this.stick(D, r);
            g.pedestrians.say?.(p.h, ['Hey!', 'Ow! A dart?!', 'Who did that?!', 'Very funny.'][Math.floor(Math.random() * 4)], 2);
            p.h.setExpression?.('wow', 2);
            break;
          }
        }
        if (D.t > 4 && !D.stuck) this.stick(D);
      } else {
        D.life -= dt;
        if (D.life <= 0) this.removeDart(D);
      }
    }
  }

  // ---------------------------------------------------------------- pocket LCD
  lcdOf(it, create = false) { const inner = this.inner(it); return inner ? this.lcdFor(inner, getItem(it.data.key), create) : null; }
  lcdFor(mesh, item, create = true) {
    let L = this.lcds.get(mesh);
    if (!L && create && item?.screen) {
      L = new LcdGame();
      const s = item.screen;
      const a = s.mm ? figPoint(item, [s.x0, s.y1, s.z]) : toMesh(item, s.x0, s.y1 + 1, s.z + 1), b = s.mm ? figPoint(item, [s.x1, s.y0, s.z]) : toMesh(item, s.x1 + 1, s.y0, s.z + 1);
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(b.x - a.x, a.y - b.y), new THREE.MeshBasicMaterial({ map: L.tex }));
      plane.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, a.z + 0.0004);
      plane.userData.noRim = true;
      plane.raycast = () => {};
      mesh.add(plane);
      L.plane = plane;
      this.lcds.set(mesh, L);
    }
    return L;
  }

  // ---------------------------------------------------------------- toys played with in place (shelf / floor)
  playInPlace(mesh, key, loose = null) {
    const k = toyKind(key), g = this.game, item = getItem(key);
    if (!k) return false;
    if (loose && (k === 'ball' || k === 'top' || k === 'robot')) {
      const p = loose.obj.position.clone(), yaw = loose.obj.rotation.y, data = loose.data;
      g.items.destroy(loose);
      if (k === 'ball') { this.spawnBall(data, p.add(new THREE.Vector3(0, 0.05, 0)), new THREE.Vector3((Math.random() - 0.5) * 0.6, 2.6, (Math.random() - 0.5) * 0.6)); return true; }
      const holder = new THREE.Group();
      const inner = mesh.clone();
      inner.position.set(0, 0, 0); inner.rotation.set(0, 0, 0);
      holder.add(inner);
      holder.position.copy(p); holder.rotation.y = yaw;
      g.scene.add(holder);
      if (k === 'top') { audio.play('topSpin', { pos: p, dur: 5 }); this.world.push({ kind: 'top', obj: holder, inner, data, t: 0, dur: 4.5, spin: 30, drift: new THREE.Vector3() }); }
      else { audio.play('windup', { pos: p }); this.world.push({ kind: 'robot', obj: holder, inner, data, t: 0, dur: 6, stepT: 0.5, y: p.y }); }
      return true;
    }
    if (this.inPlace.some((a) => a.mesh === mesh)) return true;
    const base = { p: mesh.position.clone(), r: mesh.rotation.clone(), s: mesh.scale.clone() };
    this.inPlace.push({ mesh, kind: k, base, t: 0, dur: k === 'lcd' ? 8 : 2.4, item });
    if (k === 'squishy') audio.play('squeak', { pos: mesh.getWorldPosition(_v) });
    if (k === 'dartgun') {
      // a real dart, fired the way it faces
      const fig = isFigure(item) && item.points?.muzzle;
      const muzzle = mesh.localToWorld(fig ? figPoint(item, item.points.muzzle) : toMesh(item, 0, 11, 18));
      const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(mesh.getWorldQuaternion(_q)).add(new THREE.Vector3(0, 0.15, 0)).normalize();
      const dart = fig ? figureDart(item, mesh) : partMesh(item, 'dart'), holder = new THREE.Group();
      if (!dart) return true;
      holder.add(dart); holder.scale.setScalar(1.3); holder.position.copy(muzzle); g.scene.add(holder);
      const D = { obj: holder, vel: dir.clone().multiplyScalar(7), stuck: false, t: 0, life: 40 };
      D.body = g.physics.addBody({ radius: 0.006, position: muzzle.clone(), velocity: D.vel.clone(), object: null, restitution: 0, friction: 1, collideBodies: false, gravityScale: 0.55, roll: false, onImpact: (speed) => { if (!D.stuck && speed > 1.2) this.stick(D); } });
      this.darts.push(D);
      audio.play('dartPop', { pos: muzzle, vol: 0.8 });
    }
    if (k === 'robot') audio.play('windup', { pos: mesh.getWorldPosition(_v) });
    return true;
  }

  updateInPlace(dt) {
    for (let i = this.inPlace.length - 1; i >= 0; i--) {
      const a = this.inPlace[i], m = a.mesh, b = a.base;
      a.t += dt;
      const k = Math.min(1, a.t / a.dur), fade = 1 - k;
      m.position.copy(b.p); m.rotation.copy(b.r); m.scale.copy(b.s);
      const t = a.t;
      switch (a.kind) {
        case 'squishy': { const s = Math.max(0, Math.sin(t * 9)) * fade; m.scale.set(b.s.x * (1 + 0.25 * s), b.s.y * (1 - 0.4 * s), b.s.z * (1 + 0.25 * s)); break; }
        case 'ball': { const h = Math.abs(Math.sin(t * 7)) * 0.06 * fade; m.position.y += h; if (h < 0.002 && audio.canPlay('bip' + m.id, 0.2) && fade > 0.1) audio.play('boing', { pos: m.getWorldPosition(_v), v: fade }); break; }
        case 'top': m.rotation.y += t * 25 * fade; m.rotation.x = Math.sin(t * 6) * 0.06 * (1 - fade + 0.3); break;
        case 'yoyo': {
          m.position.y -= Math.abs(Math.sin(t * 4)) * 0.05 * fade; m.rotation.z = -t * 20 * fade;
          // (a sculpted yo-yo spins about its axle)
          const c = isFigure(a.item) && a.item.points?.centre ? figPoint(a.item, a.item.points.centre, _v2) : null;
          if (c) { const r = m.rotation.z, cs = Math.cos(r), sn = Math.sin(r); m.position.add(_v.set(c.x - (c.x * cs - c.y * sn), c.y - (c.x * sn + c.y * cs), 0).multiply(b.s).applyEuler(_e.set(b.r.x, b.r.y, 0, b.r.order))); }
          break;
        }
        case 'robot': m.rotation.z = Math.sin(t * 13) * 0.1 * fade; m.position.y += Math.abs(Math.sin(t * 13)) * 0.002; if (Math.floor(t * 4) !== Math.floor((t - dt) * 4) && fade > 0.1) audio.play('robotStep', { pos: m.getWorldPosition(_v), vol: 0.5 }); break;
        case 'kendama': m.position.y += Math.abs(Math.sin(t * 5)) * 0.015 * fade; break;
        case 'dartgun': m.rotation.x = -Math.max(0, Math.sin(Math.min(1, t * 5) * Math.PI)) * 0.15; break;
        case 'lcd': { const L = this.lcdFor(m, a.item); L?.update(dt, true); if (k >= 1 && L) { L.reset(); L.draw(); L.tex.needsUpdate = true; } break; }
        default: break;
      }
      if (k >= 1) { m.position.copy(b.p); m.rotation.copy(b.r); m.scale.copy(b.s); this.inPlace.splice(i, 1); }
    }
  }

  // ---------------------------------------------------------------- per frame
  update(dt) {
    const g = this.game, it = g.held.item;
    const k = this.kind(it);
    if (k === 'squishy') this.updateSquishy(dt, it);
    else if (this.squeeze > 0) this.squeeze = 0;
    if (k === 'lcd') { const L = this.lcdOf(it); if (L?.on) L.update(dt); }
    this.updateYoyo(dt);
    this.updateKendama(dt);
    this.updateWorld(dt);
    this.updateDarts(dt);
    this.updateInPlace(dt);
    // right click with empty hands on a toy on a shelf / lying around: play with it there
    if (!it && g.input.buttonDown(2) && g.input.locked && !g.uiOpen && !g.pc?.active) {
      const h = g.interaction.hover;
      if (h) {
        const ent = [...g.items.list].find((e) => e.obj === h.obj && e.kind === 'toy');
        if (ent && toyKind(ent.data.key)) this.playInPlace(ent.mesh, ent.data.key, ent);
        else {
          for (const d of g.allDisplays()) {
            const s = d.slots.find((x) => x.hit === h.obj);
            if (s) { const cur = d.items[s.i]; if (cur && s.mesh && toyKind(cur.k)) this.playInPlace(s.mesh, cur.k); break; }
          }
        }
      }
    }
  }
}

export function installInto(game) {
  const toys = new Toys(game);
  game.toys = toys;
  const H = game.held;
  // held-item hooks (instance wrappers, Held.js is untouched)
  const hint = H.hint.bind(H), primary = H.primary.bind(H);
  H.hint = () => toys.hint(H.item) || hint();
  H.primary = () => { if (!toys.use(H.item)) primary(); };
  // loose toys and shelf toys tell you they can be played with
  const spawnToy = game.items.spawnToy.bind(game.items);
  game.items.spawnToy = (data, pos, opts) => {
    const ent = spawnToy(data, pos, opts);
    const h = ent.obj.userData.handler;
    if (h && toyKind(data.key)) { const orig = h.hint; h.hint = (...a) => { const r = orig(...a); return r && !game.held.item ? { ...r, sub: `${r.sub ? r.sub + ' · ' : ''}RMB play` } : r; }; }
    return ent;
  };
  const dHint = DisplaySlots.prototype.hint;
  if (!dHint.__toys) {
    DisplaySlots.prototype.hint = function hintWithToys(slot, held) {
      const r = dHint.call(this, slot, held);
      const it = this.items[slot.i];
      if (r && !held && it && toyKind(it.k) && !this.opts.prices) return { ...r, sub: `${r.sub ? r.sub + ' · ' : ''}RMB play` };
      return r;
    };
    DisplaySlots.prototype.hint.__toys = true;
  }
  game.constructor.updaters.push((g, dt) => toys.update(dt));
}
