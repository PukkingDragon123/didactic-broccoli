// game.builder: placing and moving things in the shop.
//   Hold a furniture box (or a packed piece, or a cardboard box): a dim, solid, slightly see-through stand-in shows
//   where it will go, snapped to the floor (5 cm grid), a surface (table, desk, racks, shelf, sill, the top of a box or
//   a bench) or a wall (posters, clocks, signs). R / mouse wheel turn it in 15° steps (Shift: free, 2° per notch;
//   hold R to spin). A small icon by the crosshair says whether it fits; the hint says why not. LMB places it.
//   F on a placed piece, a gacha machine or a wall shelf moves it in place (LMB put down, RMB / Q / F cancel).
//   Machines and shelves snap to their slots (MACHINE_SLOTS / SHELF_SLOTS), so customers still find them.
// Validity: inside the garage, not through anything solid (player obstacles), not on the customers' path or the other
// keep-clear spots (ATTACH.keepClear), not where you stand, within the surface or wall zone, not over other pieces.
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { ATTACH, GARAGE, MACHINE_SLOTS, SHELF_SLOTS } from '../world/Garage.js';
import { FURNITURE } from './catalogue.js';
import { ghostOf, tintGhost } from './models.js';
import { iconURL } from '../gfx/icons.js';
import { STORAGE } from './storage.js';
import './icons.js';

const STEP = Math.PI / 12, FINE = Math.PI / 90;
const IN = { minX: GARAGE.minX + 0.04, maxX: GARAGE.maxX - 0.04, minZ: GARAGE.minZ + 0.04, maxZ: GARAGE.maxZ - 0.38 };
const snap = (v, s) => Math.round(v / s) * s;
const isFurnitureBox = (it) => it?.kind === 'box' && it.data?.type === 'furniture' && !!FURNITURE[it.data.id];

/** Distance from a segment to an axis-aligned rect (sampled: plenty for keep-clear checks). */
function rectSegDist(r, a, b) {
  let best = Infinity;
  for (let i = 0; i <= 8; i++) {
    const t = i / 8, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
    const cx = Math.max(r.minX, Math.min(x, r.maxX)), cz = Math.max(r.minZ, Math.min(z, r.maxZ));
    best = Math.min(best, Math.hypot(x - cx, z - cz));
  }
  return best;
}
const overlap = (a, b, pad = 0) => a.minX < b.maxX - pad && a.maxX > b.minX + pad && a.minZ < b.maxZ - pad && a.maxZ > b.minZ + pad;

export class Builder {
  constructor(game, decor) {
    this.game = game;
    this.decor = decor;
    this.rot = 0;
    this.ghosts = new Map();
    this.ghost = null;
    this.moving = null;
    this.pose = null;
    this.ray = new THREE.Raycaster();
    this.ray.far = 3.6;
    this.holdR = 0;
    this.buildProxies();
    // the validity icon beside the crosshair
    const el = document.createElement('div');
    el.id = 'build-ic';
    el.innerHTML = '<img alt="">';
    (document.getElementById('hud') || document.body).appendChild(el);
    this.icon = el;
    this.iconImg = el.querySelector('img');
    this.iconState = null;
  }

  // ------------------------------------------------------------------ invisible stand-ins for the floor, surfaces and walls
  buildProxies() {
    const g = this.game, grp = new THREE.Group();
    grp.name = 'build-proxies';
    const inv = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(IN.maxX - IN.minX, IN.maxZ - IN.minZ), inv);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((IN.minX + IN.maxX) / 2, 0.0005, (IN.minZ + IN.maxZ) / 2);
    floor.userData.support = { kind: 'floor', id: 'floor', y: 0, x0: IN.minX, x1: IN.maxX, z0: IN.minZ, z1: IN.maxZ, h: 3 };
    grp.add(floor);
    this.floor = floor;
    this.surfaces = ATTACH.surfaces.map((s) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(s.x1 - s.x0, 0.006, s.z1 - s.z0), inv);
      m.position.set((s.x0 + s.x1) / 2, s.y - 0.003, (s.z0 + s.z1) / 2);
      m.userData.support = { kind: 'surface', ...s };
      grp.add(m);
      return m;
    });
    this.walls = ATTACH.walls.map((w) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w.u1 - w.u0, w.y1 - w.y0), inv);
      const u = (w.u0 + w.u1) / 2, y = (w.y0 + w.y1) / 2;
      if (w.face === '+z') { m.position.set(u, y, w.at); }
      else if (w.face === '-x') { m.position.set(w.at, y, u); m.rotation.y = -Math.PI / 2; }
      else { m.position.set(w.at, y, u); m.rotation.y = Math.PI / 2; }
      m.userData.wall = w;
      grp.add(m);
      return m;
    });
    g.scene.add(grp);
    grp.updateMatrixWorld(true);
    this.proxyGroup = grp;
  }

  // ------------------------------------------------------------------ what is being placed
  /** { def, st, uid, kind: 'box' | 'piece' | 'machine' | 'shelf', ... } or null. */
  source() {
    const g = this.game;
    if (this.moving) return this.moving;
    const it = g.held.item;
    if (isFurnitureBox(it) && !g.held.busy) return { kind: 'box', def: FURNITURE[it.data.id], st: it.data.st || {}, uid: it.data.uid || null, item: it };
    return null;
  }

  ghostFor(src) {
    if (src.kind === 'machine' || src.kind === 'shelf') return this.cloneGhost(src);
    const key = src.uid ? 'u:' + src.uid : 'd:' + src.def.id;
    let gh = this.ghosts.get(key);
    if (!gh) {
      gh = ghostOf(src.def, src.st || {});
      this.ghosts.set(key, gh);
    }
    return gh;
  }

  cloneGhost(src) {
    const key = src.kind + ':' + (src.kind === 'machine' ? src.m.data.id : src.sh.data.slot);
    let gh = this.ghosts.get(key);
    if (gh) return gh;
    const obj = src.kind === 'machine' ? src.m.model : src.sh.root;
    const root = new THREE.Group();
    const c = obj.clone(true);
    c.position.set(0, src.kind === 'machine' ? obj.position.y : 0, 0);
    c.rotation.set(0, 0, 0);
    if (src.kind === 'shelf') c.position.y = 0;
    root.add(c);
    root.traverse((o) => {
      if (o.isLight) o.visible = false;
      if (!o.isMesh) return;
      o.castShadow = o.receiveShadow = false;
      o.raycast = () => {};
      const conv = (m) => { const q = new THREE.MeshStandardMaterial({ color: 0xffffff, map: m.map || null, vertexColors: !!m.vertexColors, roughness: 1, metalness: 0, transparent: true, opacity: 0.6 }); if (m.color && !m.map) q.color.copy(m.color); q.color.multiplyScalar(0.5); q.userData.base = q.color.getHex(); return q; };
      o.material = Array.isArray(o.material) ? o.material.map(conv) : conv(o.material);
    });
    gh = { root, box: new THREE.Box3().setFromObject(c) };
    this.ghosts.set(key, gh);
    return gh;
  }

  // ------------------------------------------------------------------ per frame
  update(dt) {
    const g = this.game, inp = g.input, gate = g.inputGate;
    // F: pick up a piece / machine / shelf to move it
    if (!this.moving && inp.locked && !g.uiOpen && !g.pc?.active && !g.held.reading && !g.held.busy && inp.keyPressed('KeyF') && !isFurnitureBox(g.held.item)) this.tryMove();
    const src = this.source();
    if (!src) {
      if (this.ghost) { this.ghost.root.parent?.remove(this.ghost.root); this.ghost = null; }
      this.setIcon(null);
      if (gate) gate.wheel = false;
      this.pose = null;
      return;
    }
    if (gate) gate.wheel = true;
    // turning it: R / wheel (15° steps), Shift for free turning
    const free = inp.key('ShiftLeft') || inp.key('ShiftRight');
    if (src.kind !== 'machine' && src.kind !== 'shelf') {
      if (inp.keyPressed('KeyR')) { this.rot += free ? -STEP : STEP; this.holdR = 0; audio.play('rotate', { vol: 0.35 }); }
      if (inp.key('KeyR')) { this.holdR += dt; if (this.holdR > 0.35) this.rot += dt * 2.2; }
      if (inp.mouse.wheel) { this.rot += Math.sign(inp.mouse.wheel) * (free ? FINE : STEP); audio.play('rotate', { vol: 0.25 }); }
      if (!free && !inp.key('KeyR')) this.rot = snap(this.rot, STEP);
    }
    const pose = this.compute(src);
    this.pose = pose;
    // the ghost
    const gh = this.ghostFor(src);
    if (this.ghost !== gh) { if (this.ghost) this.ghost.root.parent?.remove(this.ghost.root); this.ghost = gh; g.scene.add(gh.root); }
    if (pose?.at) {
      gh.root.visible = true;
      gh.root.position.set(pose.x, pose.y, pose.z);
      gh.root.rotation.set(0, pose.rot, src.def?.mount === 'wall' ? (src.st?.tilt || 0) : 0);
      if (gh.okShown !== pose.ok) { tintGhost(gh.root, pose.ok); gh.okShown = pose.ok; }
    } else gh.root.visible = false;
    this.setIcon(pose?.at ? (pose.ok ? 'place_ok' : 'place_no') : null);
    // moving mode: its own hint and clicks (the normal interaction is off meanwhile)
    if (this.moving) {
      const I = g.interaction;
      const name = this.moving.kind === 'machine' ? 'the machine' : this.moving.kind === 'shelf' ? 'the shelf' : this.moving.def.name;
      I.setHint(pose?.ok ? { key: 'LMB', text: `Put ${name} here`, sub: this.moving.kind === 'piece' ? 'R / wheel turn (Shift: free) · RMB cancel' : 'Snaps to the free spots · RMB cancel' } : { key: '', text: pose?.why || 'Aim where it should go', sub: 'RMB cancel' });
      I.crossEl.classList.toggle('active', !!pose?.ok);
      if (inp.buttonDown(0)) { if (pose?.ok) this.finishMove(pose); else audio.play('error', { vol: 0.35 }); }
      else if (inp.buttonDown(2) || inp.keyPressed('KeyQ') || inp.keyPressed('KeyF') || !inp.locked) this.cancelMove();
    }
  }

  setIcon(name) {
    if (name === this.iconState) return;
    this.iconState = name;
    this.icon.classList.toggle('on', !!name);
    if (name) this.iconImg.src = iconURL(name, 2);
  }

  // ------------------------------------------------------------------ where would it go?
  compute(src) {
    const g = this.game;
    this.ray.setFromCamera(new THREE.Vector2(0, 0), g.camera);
    if (src.kind === 'machine') return this.machinePose(src);
    if (src.kind === 'shelf') return this.shelfPose(src);
    const def = src.def, gh = this.ghostFor(src), box = gh.box;
    if (def.mount === 'wall') return this.wallPose(src, box);
    const cands = [this.floor];
    if (def.mount === 'surface') {
      cands.push(...this.surfaces);
      for (const p of this.decor.pieces.values()) if (p.top && p !== src.piece && p.data.uid !== src.uid) cands.push(p.top);
    }
    const hit = this.ray.intersectObjects(cands, false)[0];
    if (!hit) return { at: false, why: 'Aim at the floor' + (def.mount === 'surface' ? ' or a table' : '') };
    const tp = hit.object.userData.pieceTop;
    const sup = tp ? { kind: 'top', piece: tp, y: hit.object.position.y + 0.002, h: 1 } : hit.object.userData.support;
    let x = hit.point.x, z = hit.point.z;
    const grid = sup.kind === 'floor' ? 0.05 : 0.02;
    x = snap(x, grid); z = snap(z, grid);
    const rot = this.rot;
    // the rotated footprint (local box corners)
    const c = Math.cos(rot), s = Math.sin(rot);
    // (an off-centre model: centre its footprint on the aim point)
    const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
    const ox = cx * c + cz * s, oz = -cx * s + cz * c;
    const hw = (box.max.x - box.min.x) / 2, hd = (box.max.z - box.min.z) / 2;
    const hx = Math.abs(hw * c) + Math.abs(hd * s), hz = Math.abs(hw * s) + Math.abs(hd * c);
    // fit it on a table / shelf / box top
    let rect;
    if (sup.kind === 'top') { const b = tp.aabb; rect = { x0: b.min.x, x1: b.max.x, z0: b.min.z, z1: b.max.z }; }
    else rect = { x0: sup.x0, x1: sup.x1, z0: sup.z0, z1: sup.z1 };
    if (sup.kind !== 'floor') {
      if (hx * 2 > rect.x1 - rect.x0 + 0.04 || hz * 2 > rect.z1 - rect.z0 + 0.04) return { at: true, ok: false, x: x - ox, y: sup.y, z: z - oz, rot, why: 'Too big to go there' };
      x = Math.max(rect.x0 + hx, Math.min(rect.x1 - hx, x));
      z = Math.max(rect.z0 + hz, Math.min(rect.z1 - hz, z));
    }
    const y = sup.kind === 'floor' ? 0 : sup.y;
    const fp = { minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz };
    const pose = { at: true, ok: true, x: x - ox, y, z: z - oz, rot, on: sup.kind === 'top' ? sup.piece.data.uid : null, support: sup.kind === 'top' ? 'top:' + sup.piece.data.uid : sup.id, fp };
    pose.why = this.check(src, pose, box, sup);
    pose.ok = !pose.why;
    return pose;
  }

  /** Why it can't go there (null = it can). */
  check(src, pose, box, sup) {
    const g = this.game, def = src.def, fp = pose.fp, me = src.piece;
    const flat = !!def.flat;
    const height = box.max.y - box.min.y;
    if (sup.kind === 'floor') {
      if (fp.minX < IN.minX || fp.maxX > IN.maxX || fp.minZ < IN.minZ || fp.maxZ > IN.maxZ) return 'Keep it inside the shop';
      // solid things in the way (walls, machines, the table, racks, other furniture)
      for (const o of g.player.obstacles) {
        if (!o.enabled || o === me?.obstacle) continue;
        if (o.maxX < IN.minX - 0.5 || o.minX > IN.maxX + 0.5 || o.maxZ < IN.minZ - 0.5 || o.minZ > IN.maxZ + 0.5) continue;
        if (overlap(fp, o, 0.005)) return 'Something is in the way';
      }
      if (!flat) {
        for (const k of ATTACH.keepClear) if (rectSegDist(fp, k.a, k.b) < k.r) return k.r > 0.6 ? 'Keep the delivery spot clear' : "Keep people's way through clear";
        const P = g.player.pos;
        if (def.block && P.x > fp.minX - 0.22 && P.x < fp.maxX + 0.22 && P.z > fp.minZ - 0.22 && P.z < fp.maxZ + 0.22) return "You're standing there";
        // machines (their fronts too: customers stand there)
        for (const m of g.machines) {
          const mp = m.root.position;
          if (overlap(fp, { minX: mp.x - 0.4, maxX: mp.x + 1.0, minZ: mp.z - 0.38, maxZ: mp.z + 0.38 })) return 'Too close to a gacha machine';
        }
      }
    } else if (height > (sup.h ?? 1) + 0.01) return 'Not enough room above';
    // other pieces on the same support
    for (const p of this.decor.pieces.values()) {
      if (p === me || p.data.uid === src.uid || p.data.wall) continue;
      const same = sup.kind === 'top' ? p.data.on === sup.piece.data.uid : (sup.kind === 'floor' ? !p.data.on && (p.data.y || 0) < 0.05 : Math.abs((p.data.y || 0) - pose.y) < 0.03 && !p.data.on);
      if (!same) continue;
      if (sup.kind === 'floor' && (flat !== !!p.def.flat)) continue; // a rug under a bench is fine
      if (overlap(fp, { minX: p.aabb.min.x, maxX: p.aabb.max.x, minZ: p.aabb.min.z, maxZ: p.aabb.max.z }, 0.005)) return 'It would overlap the ' + p.def.name.toLowerCase();
    }
    if (sup.kind === 'top') {
      const under = sup.piece;
      if (this.decor.stackedOn(under).some((q) => q !== me && q.data.uid !== src.uid) && under.feature === STORAGE) return 'Something is already on that box';
      if (me && this.isAbove(me, under)) return "Can't put it on itself";
    }
    return null;
  }

  isAbove(p, q) { for (let u = q; u; u = u.data.on ? this.decor.pieces.get(u.data.on) : null) if (u === p) return true; return false; }

  wallPose(src, box) {
    const g = this.game, def = src.def;
    const hit = this.ray.intersectObjects(this.walls, false)[0];
    if (!hit) return { at: false, why: 'Aim at a wall' };
    const w = hit.object.userData.wall;
    const wd = box.max.x - box.min.x, ht = box.max.y - box.min.y;
    let u = w.face === '+z' ? hit.point.x : hit.point.z, y = hit.point.y;
    u = snap(u, 0.025); y = snap(y, 0.025);
    u = Math.max(w.u0 + wd / 2, Math.min(w.u1 - wd / 2, u));
    y = Math.max(w.y0 + ht / 2, Math.min(w.y1 - ht / 2, y));
    const cy = (box.min.y + box.max.y) / 2;
    const pose = { at: true, ok: true, wall: w.face, y: y - cy, rot: w.face === '+z' ? 0 : w.face === '-x' ? -Math.PI / 2 : Math.PI / 2 };
    if (w.face === '+z') { pose.x = u; pose.z = w.at + 0.003; } else { pose.x = w.at + (w.face === '-x' ? -0.003 : 0.003); pose.z = u; }
    // the wall-side flip: on the left wall local +x runs towards -z
    const r = { u0: u - wd / 2, u1: u + wd / 2, y0: y - ht / 2, y1: y + ht / 2 };
    const hitsR = (b) => r.u0 < b.u1 && r.u1 > b.u0 && r.y0 < b.y1 && r.y1 > b.y0;
    let why = null;
    for (const b of ATTACH.wallBlock) if (b.face === w.face && hitsR(b)) { why = 'Something is on the wall there'; break; }
    if (!why && w.face === '+x') for (const m of g.machines) { const z = m.root.position.z; if (hitsR({ u0: z - 0.4, u1: z + 0.4, y0: 0, y1: 1.85 })) { why = 'Too close to a machine'; break; } }
    if (!why && w.face === '-x') for (const sh of g.shelves) { const z = sh.root.position.z; if (hitsR({ u0: z - 0.7, u1: z + 0.7, y0: 0.7, y1: 1.95 })) { why = 'A shelf is there'; break; } }
    if (!why) for (const p of this.decor.pieces.values()) {
      if (p === src.piece || p.data.uid === src.uid || p.data.wall !== w.face) continue;
      const b = p.aabb, pu0 = w.face === '+z' ? b.min.x : b.min.z, pu1 = w.face === '+z' ? b.max.x : b.max.z;
      if (hitsR({ u0: pu0, u1: pu1, y0: b.min.y, y1: b.max.y })) { why = 'It would overlap the ' + p.def.name.toLowerCase(); break; }
    }
    pose.why = why;
    pose.ok = !why;
    void def;
    return pose;
  }

  machinePose(src) {
    const g = this.game, m = src.m;
    const hit = this.ray.intersectObject(this.floor, false)[0];
    if (!hit) return { at: false, why: 'Aim at the machine row' };
    let best = -1, bd = 1.4;
    MACHINE_SLOTS.forEach((s, i) => { const d = Math.hypot(s.x - hit.point.x, s.z - hit.point.z); if (d < bd) { bd = d; best = i; } });
    if (best < 0) return { at: false, why: 'Machines go along the left wall' };
    const S = MACHINE_SLOTS[best];
    const pose = { at: true, ok: true, x: S.x, y: 0, z: S.z, rot: S.rotY, slot: best };
    const other = g.machines.find((q) => q !== m && q.data.slot === best);
    if (other) pose.why = 'Another machine is there';
    else for (const p of this.decor.pieces.values()) { if (!p.data.wall && p.aabb && overlap({ minX: S.x - 0.4, maxX: S.x + 1.0, minZ: S.z - 0.38, maxZ: S.z + 0.38 }, { minX: p.aabb.min.x, maxX: p.aabb.max.x, minZ: p.aabb.min.z, maxZ: p.aabb.max.z }) && !p.def.flat) { pose.why = `The ${p.def.name.toLowerCase()} is in the way`; break; } }
    pose.ok = !pose.why;
    return pose;
  }

  shelfPose(src) {
    const g = this.game, sh = src.sh;
    const hit = this.ray.intersectObjects([...this.walls, this.floor], false)[0];
    if (!hit) return { at: false, why: 'Aim at the right-hand wall' };
    let best = -1, bd = 1.6;
    SHELF_SLOTS.forEach((s, i) => { const d = Math.hypot(s.x - hit.point.x, s.z - hit.point.z); if (d < bd) { bd = d; best = i; } });
    if (best < 0) return { at: false, why: 'Shelves hang on the right-hand wall' };
    const S = SHELF_SLOTS[best];
    const pose = { at: true, ok: true, x: S.x, y: sh.root.position.y, z: S.z, rot: S.rotY, slot: best };
    if (g.shelves.some((q) => q !== sh && q.data.slot === best)) pose.why = 'Another shelf is there';
    else for (const p of this.decor.pieces.values()) { if (p.data.wall === '-x' && p.aabb && p.aabb.min.y < 1.95 && p.aabb.max.y > 0.75 && p.aabb.max.z > S.z - 0.7 && p.aabb.min.z < S.z + 0.7) { pose.why = `The ${p.def.name.toLowerCase()} is in the way`; break; } }
    pose.ok = !pose.why;
    return pose;
  }

  // ------------------------------------------------------------------ placing from your hands
  boxHint(it) {
    const def = FURNITURE[it.data.id];
    const p = this.pose;
    const turn = def.mount === 'wall' ? '' : 'R / wheel turn (Shift: free) · ';
    if (!p?.at) return { key: '', text: p?.why || 'Aim where it should go', sub: `${def.name} · ${turn}Q put the box down` };
    if (!p.ok) return { key: '', text: p.why, sub: `${def.name} · ${turn}Q put the box down` };
    return { key: 'LMB', text: `Place the ${def.name.toLowerCase()}`, sub: `${turn}Q put the box down` };
  }

  primary(it) {
    const g = this.game, p = this.pose;
    if (!p?.ok) { audio.play('error', { vol: 0.35 }); if (p?.why) g.interaction.setHint({ key: '', text: p.why }); return; }
    const def = FURNITURE[it.data.id], data = it.data;
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.rot);
    const target = new THREE.Vector3(p.x, p.y + (def.mount === 'wall' ? 0 : 0.05), p.z);
    const pose = { x: p.x, y: p.y, z: p.z, rot: p.rot, wall: p.wall || null, on: p.on || null };
    g.held.putTo(target, q, (obj) => {
      obj.parent?.remove(obj);
      const piece = this.decor.place(def.id, pose, { uid: data.uid, st: data.st });
      audio.play(data.uid ? 'place' : 'boxOpen', { pos: target, vol: 0.8 });
      g.effects.puff({ pos: target.clone().add(new THREE.Vector3(0, 0.08, 0)), count: data.uid ? 3 : 7, colors: [0xd8c8b0, 0xc8b8a0], size: 0.05, up: 0.2 });
      if (!data.uid) g.tip(`placed_${def.feature}`, `${def.name}: ${def.does}`, 'RMB packs it up again · F moves it', 8000);
      void piece;
    }, { dur: 0.32, arc: 0.12, scale: data.uid ? 1 : 0.7 });
  }

  // ------------------------------------------------------------------ moving things in place (F)
  tryMove() {
    const g = this.game;
    this.ray.setFromCamera(new THREE.Vector2(0, 0), g.camera);
    this.ray.far = 2.6;
    const targets = [...this.decor.list().map((p) => p.root), ...g.machines.map((m) => m.root), ...g.shelves.map((s) => s.root)];
    const hit = this.ray.intersectObjects(targets, true)[0];
    this.ray.far = 3.6;
    if (!hit) return;
    let o = hit.object;
    while (o && !o.userData.piece && !g.machines.some((m) => m.root === o) && !g.shelves.some((s) => s.root === o)) o = o.parent;
    if (!o) return;
    if (o.userData.piece) {
      const p = o.userData.piece;
      if (this.decor.stackedOn(p).length) { g.news('Take what is on top of it first'); audio.play('error', { vol: 0.4 }); return; }
      if (p.def.feature === 'vacuum' && p.data.st.mode !== 'docked') { g.news('Wait for Kuru-kun to come home first'); return; }
      this.rot = p.data.rot || 0;
      this.startMove({ kind: 'piece', piece: p, def: p.def, st: p.data.st, uid: p.data.uid, from: { ...p.data } });
      p.root.visible = false;
      this.decor.uncollide(p);
      return;
    }
    const m = g.machines.find((q) => q.root === o);
    if (m) {
      if (m.lidOpen || m.drawer?.open || m.state !== 'idle' || m.spin || m.data.fallen) { g.news('Close it up and let it stop first'); return; }
      this.startMove({ kind: 'machine', m });
      m.root.visible = false;
      return;
    }
    const sh = g.shelves.find((q) => q.root === o);
    if (sh) { this.startMove({ kind: 'shelf', sh }); sh.root.visible = false; }
  }

  startMove(src) {
    const g = this.game;
    this.moving = src;
    g.interaction.enabled = false;
    audio.play('pickup', { vol: 0.6 });
    g.tip('moveMode', 'Moving it', 'LMB put it down · R / wheel to turn · RMB cancel');
  }

  endMove() {
    const g = this.game;
    this.moving = null;
    g.interaction.enabled = true;
    if (this.ghost) { this.ghost.root.parent?.remove(this.ghost.root); this.ghost = null; }
    this.setIcon(null);
  }

  cancelMove() {
    const src = this.moving;
    if (!src) return;
    if (src.kind === 'piece') { const p = src.piece; this.decor.move(p, src.from); }
    else if (src.kind === 'machine') src.m.root.visible = true;
    else if (src.kind === 'shelf') src.sh.root.visible = true;
    audio.play('place', { vol: 0.4 });
    this.endMove();
  }

  finishMove(pose) {
    const g = this.game, src = this.moving;
    if (src.kind === 'piece') {
      this.decor.move(src.piece, { x: pose.x, y: pose.y, z: pose.z, rot: pose.rot, wall: pose.wall || null, on: pose.on || null });
      this.ghosts.delete('u:' + src.uid);
      audio.play('place', { pos: src.piece.root.position, vol: 0.7 });
    } else if (src.kind === 'machine') {
      const m = src.m;
      if (m.data.slot !== pose.slot) { m.data.slot = pose.slot; m.rebuild(); this.ghosts.delete('machine:' + m.data.id); }
      m.root.visible = true;
      audio.play('thud', { pos: m.root.position, v: 1 });
      g.player.shake = 0.15;
      g.events.emit('machineMoved', { machine: m, slot: pose.slot });
    } else if (src.kind === 'shelf') {
      const sh = src.sh, S = SHELF_SLOTS[pose.slot];
      sh.data.slot = pose.slot;
      sh.root.position.set(S.x, sh.root.position.y, S.z);
      sh.root.rotation.y = S.rotY;
      sh.root.visible = true;
      sh.root.updateMatrixWorld(true);
      this.ghosts.delete('shelf:' + pose.slot);
      audio.play('place', { pos: sh.root.position, vol: 0.8 });
    }
    this.endMove();
    g.save();
  }
}
