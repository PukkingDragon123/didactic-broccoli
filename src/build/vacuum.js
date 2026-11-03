// "Kuru-kun", the robot vacuum (the 'vacuum' furniture feature). The placed piece is its charging dock; the robot
// drives around the garage floor on its own: it heads for empty capsule shells and spilt milk, sweeps up the everyday
// dust (game.sim dirt) as it goes, bumps into things (beep, back up, turn), and when the battery runs low or the floor
// is clean it finds its way home (A* on a coarse floor grid) and backs onto the dock to charge.
// Click the dock or the robot: start / stop. E: send it home. It starts by itself every few hours when it's dirty.
// st: { battery 0..1, mode 'docked' | 'cleaning' | 'returning' | 'paused', x, z, h (heading), cleaned, last (stamp) }
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { propMesh } from '../world/props.js';
import { GARAGE } from '../world/Garage.js';

const R = 0.17; // body radius (m)
const SPEED = 0.26;
const CELL = 0.15;
const B = { minX: GARAGE.minX + 0.05, maxX: GARAGE.maxX - 0.05, minZ: GARAGE.minZ + 0.05, maxZ: GARAGE.maxZ - 0.35 };
const _v = new THREE.Vector3();
const pct = (b) => `${Math.round(b * 100)}%`;

/** Where the robot sits when docked (in front of the dock, facing out). */
function dockSpot(p) {
  const v = p.root.localToWorld(new THREE.Vector3(0, 0, 0.2));
  return { x: v.x, z: v.z, h: p.root.rotation.y };
}

function obstacles(g, self) {
  const out = [];
  for (const o of g.player.obstacles) {
    if (!o.enabled || o === self) continue;
    if (o.maxX < B.minX - 0.3 || o.minX > B.maxX + 0.3 || o.maxZ < B.minZ - 0.3 || o.minZ > B.maxZ + 0.6) continue;
    out.push(o);
  }
  return out;
}
const hits = (obs, x, z, r = R) => {
  if (x - r < B.minX || x + r > B.maxX || z - r < B.minZ || z + r > B.maxZ) return true;
  for (const o of obs) {
    const cx = Math.max(o.minX, Math.min(x, o.maxX)), cz = Math.max(o.minZ, Math.min(z, o.maxZ));
    if ((x - cx) ** 2 + (z - cz) ** 2 < r * r) return true;
  }
  return false;
};

/** A* over a coarse grid of the garage floor. Returns [[x, z], ...] or null. */
function findPath(obs, from, to) {
  const W = Math.ceil((B.maxX - B.minX) / CELL), H = Math.ceil((B.maxZ - B.minZ) / CELL);
  const cx = (i) => B.minX + (i + 0.5) * CELL, cz = (j) => B.minZ + (j + 0.5) * CELL;
  const ci = (x) => Math.max(0, Math.min(W - 1, Math.floor((x - B.minX) / CELL))), cj = (z) => Math.max(0, Math.min(H - 1, Math.floor((z - B.minZ) / CELL)));
  const free = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) free[j * W + i] = hits(obs, cx(i), cz(j), R * 0.92) ? 0 : 1;
  const s = cj(from.z) * W + ci(from.x), t = cj(to.z) * W + ci(to.x);
  free[s] = 1; free[t] = 1;
  const gS = new Float32Array(W * H).fill(Infinity), came = new Int32Array(W * H).fill(-1), done = new Uint8Array(W * H);
  const open = [s];
  gS[s] = 0;
  const hf = (k) => Math.hypot((k % W) - (t % W), Math.floor(k / W) - Math.floor(t / W));
  let guard = 0;
  while (open.length && guard++ < 6000) {
    let bi = 0;
    for (let k = 1; k < open.length; k++) if (gS[open[k]] + hf(open[k]) < gS[open[bi]] + hf(open[bi])) bi = k;
    const cur = open.splice(bi, 1)[0];
    if (cur === t) break;
    done[cur] = 1;
    const x = cur % W, y = Math.floor(cur / W);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const n = ny * W + nx;
      if (!free[n] || done[n]) continue;
      if (dx && dy && (!free[y * W + nx] || !free[ny * W + x])) continue;
      const c = gS[cur] + (dx && dy ? 1.414 : 1);
      if (c < gS[n]) { gS[n] = c; came[n] = cur; if (!open.includes(n)) open.push(n); }
    }
  }
  if (came[t] < 0 && s !== t) return null;
  const path = [];
  for (let k = t; k !== s && k >= 0; k = came[k]) path.push([cx(k % W), cz(Math.floor(k / W))]);
  path.reverse();
  path.push([to.x, to.z]);
  return path;
}

export const VACUUM = {
  init(p, g) {
    const s = p.data.st;
    s.battery ??= 1; s.mode ??= 'docked'; s.cleaned ??= 0; s.last ??= g.clock?.stamp ?? 0;
    const bot = new THREE.Group();
    const body = propMesh('robot_vacuum', { fallbackSize: [0.34, 0.09, 0.34] });
    bot.add(body);
    // the side brush (a little three-armed star that spins)
    const brush = new THREE.Group();
    const bm = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.7 });
    for (let k = 0; k < 3; k++) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.004, 0.006), bm); arm.position.x = 0.035; const a = new THREE.Group(); a.rotation.y = k * 2.09; a.add(arm); brush.add(a); }
    brush.position.set(0.12, 0.006, 0.12);
    bot.add(brush);
    // the status light (green ready / blue cleaning / amber low)
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.004, 0.014), new THREE.MeshBasicMaterial({ color: 0x58e08a }));
    led.position.set(-0.002, 0.084, 0.07);
    bot.add(led);
    g.scene.add(bot);
    p.bot = { root: bot, brush, led, path: null, bumpT: 0, retarget: 0, stuck: 0, motor: null, back: 0 };
    if (s.mode === 'docked' || s.x === undefined) { const d = dockSpot(p); s.x = d.x; s.z = d.z; s.h = d.h; if (s.mode !== 'docked' && s.mode !== 'paused') s.mode = 'docked'; }
    bot.position.set(s.x, 0.003, s.z);
    bot.rotation.y = s.h;
    g.interaction.add(bot, { reach: 2.2, hint: () => VACUUM.hint(p, null, g), use: () => { VACUUM.use(p, null, g); return false; } });
    VACUUM.light(p);
  },

  hint(p, held, g) {
    const s = p.data.st;
    if (held && p.root) return null;
    const what = { docked: s.battery < 0.95 ? `Charging ${pct(s.battery)}` : 'Ready', cleaning: `Cleaning · battery ${pct(s.battery)}`, returning: 'Going home', paused: 'Paused' }[s.mode];
    return { key: 'LMB', text: s.mode === 'cleaning' || s.mode === 'returning' ? 'Stop the robot vacuum' : 'Start cleaning', sub: `Kuru-kun: ${what} · ${s.cleaned} cleaned up · E send it home` };
  },

  use(p, held, g) {
    const s = p.data.st;
    if (s.mode === 'cleaning' || s.mode === 'returning') { s.mode = 'paused'; audio.play('atmBeep', { pos: p.bot.root.position, f: 660, vol: 0.5 }); VACUUM.motor(p, false); }
    else VACUUM.start(p, g);
    VACUUM.light(p);
  },
  key2: 'E',
  secondary(p, g) { VACUUM.goHome(p, g); },

  start(p, g) {
    const s = p.data.st;
    if (s.battery < 0.15) { audio.play('vacStuck', { pos: p.bot.root.position }); g.news('Kuru-kun needs to charge first', `Battery ${pct(s.battery)}`); return; }
    s.mode = 'cleaning';
    s.last = g.clock?.stamp ?? 0;
    p.bot.path = null; p.bot.target = null; p.bot.back = 0; p.bot.turn = null;
    audio.play('vacStart', { pos: p.bot.root.position });
    VACUUM.motor(p, true);
    VACUUM.light(p);
  },

  goHome(p, g) {
    const s = p.data.st;
    if (s.mode === 'docked') return;
    s.mode = 'returning';
    p.bot.path = findPath(obstacles(g, p.obstacle), { x: s.x, z: s.z }, dockSpot(p));
    if (!p.bot.path) { audio.play('vacStuck', { pos: p.bot.root.position }); p.bot.path = [[dockSpot(p).x, dockSpot(p).z]]; }
    VACUUM.motor(p, true);
    VACUUM.light(p);
  },

  motor(p, on) {
    const b = p.bot;
    if (on && !b.motor && audio.ready) b.motor = audio.loop('vacMotor', { pos: b.root.position, ref: 1.2 });
    b.motor?.set(on ? 0.12 : 0, 0.2);
    if (!on && b.motor) { b.motor.stopAll(); b.motor = null; }
  },

  light(p) {
    const s = p.data.st;
    p.bot.led.material.color.setHex(s.battery < 0.2 ? 0xffa040 : s.mode === 'cleaning' || s.mode === 'returning' ? 0x58a0ff : 0x58e08a);
  },

  update(p, dt, g) {
    const s = p.data.st, b = p.bot;
    if (!b) return;
    if (s.mode === 'docked') {
      if (s.battery < 1) { s.battery = Math.min(1, s.battery + dt / 90); if (Math.random() < dt * 0.2) VACUUM.light(p); }
      // a clean-up round every three hours when the floor needs it
      const now = g.clock?.stamp ?? 0;
      if (s.battery > 0.9 && now - (s.last || 0) > 180 && VACUUM.dirty(g)) VACUUM.start(p, g);
      return;
    }
    if (s.mode === 'paused') return;
    if (b.motor) b.motor.set(0.12);
    b.brush.rotation.y += dt * 18;
    s.battery = Math.max(0, s.battery - dt / 260);
    if (s.mode === 'cleaning' && (s.battery < 0.18 || (!VACUUM.dirty(g) && g.clock && (g.clock.stamp - s.last) > 20))) { VACUUM.goHome(p, g); return; }
    const obs = obstacles(g, p.obstacle);
    // the player counts as an obstacle too
    const pl = g.player.pos;
    obs.push({ minX: pl.x - 0.2, maxX: pl.x + 0.2, minZ: pl.z - 0.2, maxZ: pl.z + 0.2, enabled: true });
    // backing out of the dock / after a bump
    if (b.back > 0) {
      b.back -= dt;
      const nx = s.x - Math.sin(s.h) * SPEED * 0.6 * dt, nz = s.z - Math.cos(s.h) * SPEED * 0.6 * dt;
      if (!hits(obs, nx, nz)) { s.x = nx; s.z = nz; }
      VACUUM.place(p);
      return;
    }
    if (b.turn) {
      const d = Math.atan2(Math.sin(b.turn - s.h), Math.cos(b.turn - s.h));
      const step = Math.sign(d) * Math.min(Math.abs(d), dt * 2.6);
      s.h += step;
      if (Math.abs(d) < 0.03) b.turn = null;
      VACUUM.place(p);
      return;
    }
    // where to: the path home, or litter / milk nearby, or just onwards
    let tx = null, tz = null;
    if (s.mode === 'returning') {
      const pt = b.path?.[0];
      if (!pt) { VACUUM.dock(p, g); return; }
      if (Math.hypot(pt[0] - s.x, pt[1] - s.z) < 0.08) { b.path.shift(); if (!b.path.length) { VACUUM.dock(p, g); return; } }
      [tx, tz] = b.path[0];
    } else {
      b.retarget -= dt;
      if (b.retarget <= 0) { b.retarget = 1.2; b.target = VACUUM.litter(p, g); }
      if (b.target) { tx = b.target.x; tz = b.target.z; }
    }
    if (tx !== null) {
      const want = Math.atan2(tx - s.x, tz - s.z);
      const d = Math.atan2(Math.sin(want - s.h), Math.cos(want - s.h));
      s.h += Math.sign(d) * Math.min(Math.abs(d), dt * 2.4);
      if (Math.abs(d) > 0.6) { VACUUM.place(p); return; } // turn on the spot first
    } else {
      s.h += Math.sin(g.time * 0.4 + p.data.x) * dt * 0.25; // a lazy wander
    }
    const nx = s.x + Math.sin(s.h) * SPEED * dt, nz = s.z + Math.cos(s.h) * SPEED * dt;
    if (hits(obs, nx, nz)) {
      // bump: a thunk, back off a bit, turn somewhere else
      audio.play('vacBump', { pos: b.root.position, vol: 0.6 });
      b.back = 0.35;
      b.turn = s.h + (Math.random() < 0.5 ? -1 : 1) * (1.6 + Math.random() * 1.6);
      b.stuck++;
      if (s.mode === 'returning') { b.path = findPath(obs, { x: s.x, z: s.z }, dockSpot(p)) || b.path; }
      if (b.stuck > 25) { audio.play('vacStuck', { pos: b.root.position }); b.stuck = 0; VACUUM.goHome(p, g); }
    } else { s.x = nx; s.z = nz; b.stuck = Math.max(0, b.stuck - dt); }
    // cleaning as it goes: shells, milk, everyday dust
    if (s.mode === 'cleaning') VACUUM.suck(p, g, dt);
    VACUUM.place(p);
  },

  place(p) { const s = p.data.st, r = p.bot.root; r.position.set(s.x, 0.003, s.z); r.rotation.y = s.h; },

  /** Is there anything to clean? */
  dirty(g) {
    if ((g.sim?.s?.dirt || 0) > 0.06) return true;
    for (const e of g.shells?.list || []) if (e.obj.position.y < 0.2 && inside(e.obj.position)) return true;
    return (g.pour?.puddles || []).some((q) => q.y < 0.05 && inside(q));
  },

  /** The nearest shell / puddle on the floor. */
  litter(p, g) {
    const s = p.data.st;
    let best = null, bd = 4.5;
    for (const e of g.shells?.list || []) {
      const q = e.obj.position;
      if (q.y > 0.2 || !inside(q)) continue;
      const d = Math.hypot(q.x - s.x, q.z - s.z);
      if (d < bd) { bd = d; best = { x: q.x, z: q.z, shell: e }; }
    }
    const pu = g.pour?.nearestPuddle?.({ x: s.x, z: s.z }, bd);
    if (pu && inside(pu)) best = { x: pu.x, z: pu.z, puddle: pu };
    return best;
  },

  suck(p, g, dt) {
    const s = p.data.st, sh = g.shells;
    if (g.sim?.s) g.sim.s.dirt = Math.max(0, g.sim.s.dirt - dt * 0.0012);
    if (sh) for (const e of [...sh.list]) {
      const q = e.obj.position;
      if (q.y > 0.15 || Math.hypot(q.x - s.x, q.z - s.z) > R + 0.03) continue;
      if (e.body) g.physics.removeBody(e.body);
      g.interaction.remove(e.obj);
      sh.list.delete(e);
      if (sh.state) sh.state.swept = (sh.state.swept || 0) + 1;
      const o = e.obj, p0 = o.position.clone();
      g.tweens.add({ dur: 0.25, update: (k) => { o.position.lerpVectors(p0, _v.set(s.x, 0.04, s.z), k); o.scale.setScalar(1 - k); }, done: () => o.parent?.remove(o) });
      audio.play('vacSuck', { pos: p.bot.root.position, vol: 0.7 });
      s.cleaned++;
      p.bot.target = null; p.bot.retarget = 0.2;
      g.events.emit('vacuumCleaned', { what: 'shell' });
    }
    const pu = g.pour?.nearestPuddle?.({ x: s.x, z: s.z }, R + 0.05);
    if (pu && !g.pour.lap(pu, 0.02, dt)) { s.cleaned++; audio.play('vacSuck', { pos: p.bot.root.position, vol: 0.6 }); g.events.emit('vacuumCleaned', { what: 'milk' }); }
  },

  dock(p, g) {
    const s = p.data.st, d = dockSpot(p);
    s.x = d.x; s.z = d.z; s.h = d.h;
    s.mode = 'docked';
    p.bot.path = null;
    VACUUM.place(p);
    VACUUM.motor(p, false);
    VACUUM.light(p);
    audio.play('vacDone', { pos: p.bot.root.position });
    g.save();
  },

  /** The dock was moved: the robot follows (if it was home). */
  moved(p) { if (p.data.st.mode === 'docked') { const d = dockSpot(p); Object.assign(p.data.st, { x: d.x, z: d.z, h: d.h }); VACUUM.place(p); } },

  dispose(p, g) {
    if (!p.bot) return;
    VACUUM.motor(p, false);
    g.interaction.remove(p.bot.root);
    p.bot.root.parent?.remove(p.bot.root);
    p.bot = null;
    p.data.st.mode = 'docked';
  },

  quality: (p) => p.def.quality,
};

function inside(q) { return q.x > B.minX && q.x < B.maxX && q.z > B.minZ && q.z < B.maxZ; }
