// Local steering for everyone who walks the lane (passers-by, customers, the named neighbours, staff): game.crowd.
// People never walk through each other, the player, parked bikes or props, or a moving truck. Each walker steers toward
// its next waypoint with smooth acceleration and turning (no snapping), predicts who it will meet in the next couple of
// seconds and sidesteps early (head-on: both keep LEFT, as people do in Japan; overtaking: pass on the right), slows
// down or waits to let someone by, walks round small obstacles and steps off the road for vehicles. A hard separation
// pass at the end of the frame guarantees nobody overlaps, and a walker that makes no progress for a few seconds
// briefly ghosts through (no deadlocks).
//   const C = crowdOf(game)
//   const a = C.agent(root.position, { r, kind, owner })   a.mobile: walking (only walkers are shoved apart; people standing
//   still hold their ground), a.anchor: in place on purpose (seated, queueing, at a machine, chatting: not even you shove them)
//   C.step(a, dt, { target, final, speed, ghost }) -> { speed, arrived, corner, blockedBy }   (one walking frame)
//   C.idle(a, dt)                                          (one standing frame: slows to a stop)
//   C.turn(a, root, dt, faceYaw?)                          face the walking direction (or a yaw while standing)
//   C.remove(a)   C.relax(dt) (the plugin calls it once a frame)   C.addVehicle(() => box|null)   C.addPeople(() => [...])
// Cheap: ~40 walkers at most; neighbour avoidance is recomputed ~12 times a second per walker (staggered) and only
// against people within 4 m; static obstacles come from the player's collision boxes (small ones near the lane only),
// bucketed in a 2 m grid that is rebuilt when that list changes.
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const CELL = 2;
const AVOID_DT = 1 / 12;
const HORIZON = 2.6; // seconds of look-ahead for people
const NEAR = 4.2; // metres: people farther than this are ignored by the avoidance
// the lane between the two building lines (people are kept off the house fronts while walking along it)
const LANE = { z0: 5.62, z1: 14.62, x: 30 };
const GAR = { x0: -3.75, x1: 3.75, z0: -4.75, z1: 4.92 };
const NONE = [];

export function crowdOf(game) { return game.crowd || (game.crowd = new Crowd(game)); }

export class Crowd {
  constructor(game) {
    this.game = game;
    this.agents = [];
    this.grid = new Map();
    this.obsN = -1; this.obsT = 0;
    this.vehicleSrc = [];
    this.vehicles = [];
    this.peopleSrc = [];
    this.foreign = [];
    this.vehT = 0;
    this.t = 0;
    this.stats = { minDist: Infinity, overlaps: 0, steps: 0, ghosts: 0 };
    const pl = game.player;
    this.playerAgent = { pos: pl.pos, vel: { x: 0, z: 0 }, r: 0.3, mobile: false, isPlayer: true, dir: { x: 0, z: 0 } };
    this.zSeq = 0;
  }

  /** Register a walker. pos: its root position (moved in place). */
  agent(pos, o = {}) {
    const a = {
      pos, vel: { x: 0, z: 0 }, dir: { x: 0, z: 1 }, r: o.r ?? 0.24, kind: o.kind || 'ped', owner: o.owner || null,
      mobile: true, ghostT: 0, av: { x: 0, z: 0, brake: 0, by: null }, avT: (this.zSeq++ % 12) * AVOID_DT / 12,
      lastD: Infinity, progT: 0, stuck: 0, speed: 0, side: 0, active: true, pushed: 0,
    };
    this.agents.push(a);
    return a;
  }
  remove(a) { const i = this.agents.indexOf(a); if (i >= 0) this.agents.splice(i, 1); a.active = false; }
  /** A provider of vehicle boxes: () => { minX, maxX, minZ, maxZ } | null (velocity is worked out here). */
  addVehicle(fn) { this.vehicleSrc.push({ fn, last: null, vx: 0, vz: 0 }); }
  /** A provider of other people to keep clear of (immovable): () => [Vector3...]. */
  addPeople(fn) { this.peopleSrc.push(fn); }

  // ------------------------------------------------------------------ static obstacles (small boxes near the lane)
  statics() {
    const obs = this.game.player.obstacles;
    if (obs.length === this.obsN && this.t - this.obsT < 8) return;
    this.obsN = obs.length; this.obsT = this.t;
    this.grid.clear();
    for (const o of obs) {
      const w = o.maxX - o.minX, d = o.maxZ - o.minZ;
      if (w > 3.2 || d > 3.2 || w <= 0 || d <= 0) continue; // walls and whole buildings: the paths keep away from those
      if (o.maxX < -34 || o.minX > 34 || o.maxZ < -30 || o.minZ > 22) continue;
      for (let cx = Math.floor(o.minX / CELL); cx <= Math.floor(o.maxX / CELL); cx++) {
        for (let cz = Math.floor(o.minZ / CELL); cz <= Math.floor(o.maxZ / CELL); cz++) {
          const k = cx * 1000 + cz;
          let L = this.grid.get(k);
          if (!L) this.grid.set(k, (L = []));
          L.push(o);
        }
      }
    }
  }
  /** Boxes in the cells around (x, z). */
  near(x, z, out) {
    out.length = 0;
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const L = this.grid.get((cx + i) * 1000 + cz + j);
      if (L) for (const o of L) if (o.enabled && !out.includes(o)) out.push(o);
    }
    return out;
  }

  updateVehicles(dt) {
    if ((this.vehT -= dt) > 0) return;
    const step = 0.2 - this.vehT; this.vehT = 0.2;
    this.vehicles.length = 0;
    for (const V of this.vehicleSrc) {
      let b = null;
      try { b = V.fn(); } catch { b = null; }
      if (!b) { V.last = null; continue; }
      const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
      if (V.last) { V.vx = (cx - V.last.x) / step; V.vz = (cz - V.last.z) / step; } else { V.vx = V.vz = 0; }
      V.last = { x: cx, z: cz };
      this.vehicles.push({ minX: b.minX, maxX: b.maxX, minZ: b.minZ, maxZ: b.maxZ, vx: V.vx, vz: V.vz });
    }
    this.foreign.length = 0;
    for (const fn of this.peopleSrc) { try { for (const p of fn() || []) this.foreign.push(p); } catch { /* */ } }
  }

  // ------------------------------------------------------------------ one walking frame
  /**
   * o: { target: Vector3, final (last waypoint: slow down and stop), speed (preferred m/s), ghost (true: scripted, no
   *      avoidance at all; 'things': through props and walls (gardens, gates) but still clear of people),
   *      arrive (stop radius), corner (waypoint switch radius) }
   */
  step(a, dt, o) {
    const p = a.pos, T = o.target;
    this.stats.steps++;
    let dx = T.x - p.x, dz = T.z - p.z;
    const dist = Math.hypot(dx, dz);
    const res = this._res || (this._res = { speed: 0, arrived: false, corner: false, blockedBy: null });
    res.arrived = false; res.corner = false; res.blockedBy = null;
    if (!o.final && dist < (o.corner ?? 0.5)) { res.corner = true; res.speed = a.speed; return res; }
    if (o.final && dist < (o.arrive ?? 0.1)) { res.arrived = true; this.idle(a, dt); res.speed = a.speed; return res; }
    const fx = dx / dist, fz = dz / dist;
    a.dir.x = fx; a.dir.z = fz;
    const vPref = o.speed ?? 1.2;
    let want = vPref;
    if (o.final) want = vPref * clamp(dist / 0.9, 0.22, 1);
    a.ghostT = Math.max(0, a.ghostT - dt);
    a.ghosting = o.ghost === true;
    a.thingGhost = o.ghost === 'things' || a.ghostT > 0;
    const ghost = a.ghosting || a.thingGhost;
    // avoidance (staggered, ~12 Hz)
    a.avT -= dt;
    if (a.avT <= 0) { a.avT = AVOID_DT; if (a.ghosting) { a.av.x = a.av.z = 0; a.av.brake = 0; a.av.by = null; } else this.avoid(a, fx, fz, vPref, dist, o); }
    const av = a.av;
    let vx = fx * want * (1 - av.brake) + av.x, vz = fz * want * (1 - av.brake) + av.z;
    // keep to the lane while walking along it (not into the house fronts)
    if (!ghost && T.z > LANE.z0 && T.z < LANE.z1 && Math.abs(T.x) < LANE.x && p.z > LANE.z0 - 0.4 && p.z < LANE.z1 + 0.4 && Math.abs(p.x) < LANE.x) {
      if (p.z < LANE.z0 + 0.15) vz += (LANE.z0 + 0.15 - p.z) * 3;
      else if (p.z > LANE.z1 - 0.15) vz -= (p.z - LANE.z1 + 0.15) * 3;
    }
    const vm = Math.hypot(vx, vz), cap = vPref * 1.15;
    if (vm > cap) { vx *= cap / vm; vz *= cap / vm; }
    // acceleration-limited (people speed up over ~half a second and stop a little quicker)
    const ex = vx - a.vel.x, ez = vz - a.vel.z, el = Math.hypot(ex, ez);
    const acc = (Math.hypot(vx, vz) < a.speed ? 4.2 : 2.6) * dt;
    if (el > acc) { a.vel.x += ex / el * acc; a.vel.z += ez / el * acc; } else { a.vel.x = vx; a.vel.z = vz; }
    p.x += a.vel.x * dt; p.z += a.vel.z * dt;
    a.speed = Math.hypot(a.vel.x, a.vel.z);
    // progress watch: no headway for a while -> ghost through for a moment (never a deadlock)
    a.progT += dt;
    if (a.progT > 0.5) {
      // (waiting for a vehicle to pass is not being stuck)
      if (dist > a.lastD - 0.06 && !o.patient && a.av.by !== 'vehicle') a.stuck += a.progT; else a.stuck = Math.max(0, a.stuck - a.progT * 2);
      a.progT = 0; a.lastD = dist;
      if (a.stuck > (o.final && dist < 0.8 ? 1.6 : 3.2)) {
        a.stuck = 0;
        if ((o.final && dist < 0.8) || (o.final && dist < 2.5 && this.blocked(T.x, T.z, a.r * 0.6))) res.arrived = true; // close enough / the spot itself is taken by a thing
        else {
          a.ghostT = 1.6; this.stats.ghosts++;
          const L = this.stats.ghostLog || (this.stats.ghostLog = []);
          L.push([a.kind, a.owner?.arch || a.owner?.id || '', +p.x.toFixed(1), +p.z.toFixed(1), +T.x.toFixed(1), +T.z.toFixed(1), a.av.by?.isPlayer ? 'player' : a.av.by?.owner?.kind || a.av.by?.kind || (a.av.by ? 'x' : '-')]);
          if (L.length > 30) L.shift();
        }
      }
    }
    res.blockedBy = av.by && av.brake > 0.5 ? av.by : null;
    res.speed = a.speed;
    return res;
  }

  /** A standing frame: ease to a stop (a nudge from the separation pass is let go of gently). */
  idle(a, dt) {
    const k = Math.min(1, dt * 5);
    a.vel.x -= a.vel.x * k; a.vel.z -= a.vel.z * k;
    if (Math.abs(a.vel.x) + Math.abs(a.vel.z) < 0.01) { a.vel.x = a.vel.z = 0; }
    a.pos.x += a.vel.x * dt; a.pos.z += a.vel.z * dt;
    a.speed = Math.hypot(a.vel.x, a.vel.z);
    a.lastD = Infinity; a.stuck = 0;
  }

  /** Turn the body: toward the walking direction while moving (a sidestep only half turns it), else toward faceYaw. */
  turn(a, root, dt, faceYaw = null) {
    let want = null;
    if (a.speed > 0.18) {
      // mostly where the feet go, a little toward where they're heading (a sidestep doesn't swing the whole body round)
      const hx = a.vel.x + a.dir.x * 0.35 * a.speed, hz = a.vel.z + a.dir.z * 0.35 * a.speed;
      want = Math.atan2(hx, hz);
    } else if (faceYaw !== null && faceYaw !== undefined) want = faceYaw;
    if (want === null) return;
    const d = wrap(want - root.rotation.y);
    const maxTurn = (a.speed > 0.18 ? 5.5 : 3.2) * dt;
    root.rotation.y += clamp(d * (1 - Math.exp(-dt * (a.speed > 0.18 ? 7 : 5))), -maxTurn, maxTurn);
  }

  // ------------------------------------------------------------------ avoidance (velocity offsets + braking)
  avoid(a, fx, fz, vPref, dist, o) {
    const p = a.pos, av = a.av;
    let ax = 0, az = 0, brake = 0, by = null;
    const lx = fz, lz = -fx; // my left
    const consider = (b, bvx, bvz, br, mobile, ref) => {
      const qx = b.x - p.x, qz = b.z - p.z;
      const q2 = qx * qx + qz * qz;
      if (q2 > NEAR * NEAR || q2 < 1e-6) return;
      const wx = bvx - fx * vPref, wz = bvz - fz * vPref;
      const w2 = wx * wx + wz * wz;
      let t = w2 > 1e-6 ? -(qx * wx + qz * wz) / w2 : 0;
      t = clamp(t, 0, HORIZON);
      const cx = qx + wx * t, cz = qz + wz * t;
      const dmin = Math.hypot(cx, cz);
      const R = a.r + br + (o.tight ? 0.08 : 0.2);
      if (dmin >= R) return;
      const ahead = qx * fx + qz * fz;
      if (ahead < -0.3 && Math.sqrt(q2) > R) return; // behind me: their problem
      const lat = cx * lx + cz * lz; // + : they'll be on my left
      const bs = Math.hypot(bvx, bvz);
      const head = bs > 0.2 ? (bvx * fx + bvz * fz) / bs : 0; // -1 head-on, +1 same way
      let s;
      if (Math.abs(lat) < R * 0.35) s = head < -0.3 ? 1 : (head > 0.4 ? -1 : (a.side || (lat >= 0 ? -1 : 1))); // head-on: keep left; overtaking: pass on the right
      else s = lat > 0 ? -1 : 1;
      if (!a.side || Math.abs(lat) < R * 0.35) a.side = s;
      const u = (1 - t / HORIZON) ** 2 * (R - dmin) / R;
      const k = (mobile ? 1.5 : 2.2) * vPref * Math.min(1.5, u * 2.2);
      ax += lx * s * k; az += lz * s * k;
      // brake for someone close in front (a standing person is walked round instead)
      if (ahead > 0 && t < 1.1) {
        const bk = (1 - t / 1.1) * (R - dmin) / R * (mobile ? 1.3 : 0.6) * (dist < 1.2 && o.final ? 1.5 : 1);
        if (bk > brake) { brake = bk; by = ref; }
      }
    };
    for (const b of this.agents) {
      if (b === a || !b.active || b.hidden) continue;
      consider(b.pos, b.vel.x, b.vel.z, b.r, b.mobile && b.speed > 0.1, b);
    }
    const P = this.playerAgent, pv = this.game.player.vel;
    P.vel.x = pv.x; P.vel.z = pv.z;
    consider(P.pos, pv.x, pv.z, P.r, true, P);
    for (const f of this.foreign) consider(f, 0, 0, 0.26, false, null);
    // small obstacles: walk round them (probe along the heading)
    const L = 0.55 + vPref * 0.7;
    const boxes = a.thingGhost ? NONE : this.near(p.x + fx, p.z + fz, this._boxes || (this._boxes = []));
    const pad = a.r + 0.08;
    for (const b of boxes) {
      const s = rayBox(p.x, p.z, fx, fz, b.minX - pad, b.maxX + pad, b.minZ - pad, b.maxZ + pad);
      if (s < 0 || s > L || s > dist) continue;
      const cx = (b.minX + b.maxX) / 2 - p.x, cz = (b.minZ + b.maxZ) / 2 - p.z;
      const lat = cx * lx + cz * lz;
      const sd = lat > 0 ? -1 : 1;
      const k = (1 - s / L) * vPref * 1.6;
      ax += lx * sd * k; az += lz * sd * k;
      if (s < 0.25) brake = Math.max(brake, 0.4);
    }
    // vehicles: off the road, out of their way (a moving one's box reaches ahead of it)
    for (const v of a.thingGhost ? NONE : this.vehicles) {
      const pad2 = a.r + 0.45;
      let x0 = v.minX - pad2, x1 = v.maxX + pad2, z0 = v.minZ - pad2, z1 = v.maxZ + pad2;
      const lead = 2.2;
      if (v.vx > 0.2) x1 += v.vx * lead; else if (v.vx < -0.2) x0 += v.vx * lead;
      if (v.vz > 0.2) z1 += v.vz * lead; else if (v.vz < -0.2) z0 += v.vz * lead;
      const inside = p.x > x0 && p.x < x1 && p.z > z0 && p.z < z1;
      const moving = Math.abs(v.vx) + Math.abs(v.vz) > 0.2;
      if (inside && moving) {
        // step out sideways to the nearer long edge (a truck on this lane runs along x)
        const alongX = v.maxX - v.minX > v.maxZ - v.minZ;
        if (alongX) { const up = (z1 - p.z) < (p.z - z0); az += (up ? 1 : -1) * vPref * 1.8; ax *= 0.3; }
        else { const right = (x1 - p.x) < (p.x - x0); ax += (right ? 1 : -1) * vPref * 1.8; az *= 0.3; }
        brake = Math.max(brake, 0.85);
        by = by || 'vehicle';
      } else {
        const s = rayBox(p.x, p.z, fx, fz, x0, x1, z0, z1);
        if (s >= 0 && s < L + 0.6 && s < dist) {
          const cx = (v.minX + v.maxX) / 2 - p.x, cz = (v.minZ + v.maxZ) / 2 - p.z;
          const sd = cx * lx + cz * lz > 0 ? -1 : 1;
          const k = (1 - s / (L + 0.6)) * vPref * (moving ? 2.2 : 1.6);
          ax += lx * sd * k; az += lz * sd * k;
          if (moving && s < 1.2) { brake = Math.max(brake, 0.9); by = by || 'vehicle'; }
        }
      }
    }
    av.x = ax; av.z = az; av.brake = clamp(brake, 0, 1); av.by = by;
  }

  // ------------------------------------------------------------------ the hard constraints, once a frame
  relax(dt) {
    this.t += dt;
    this.statics();
    this.updateVehicles(dt);
    const A = this.agents, n = A.length, P = this.playerAgent;
    let minD = Infinity;
    for (let i = 0; i < n; i++) {
      const a = A[i];
      if (!a.active || a.hidden) continue;
      for (let j = i + 1; j < n; j++) {
        const b = A[j];
        if (!b.active || b.hidden) continue;
        const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
        if (dx > 1 || dx < -1 || dz > 1 || dz < -1) continue;
        const d = Math.hypot(dx, dz), R = a.r + b.r;
        if (d < minD) minD = d;
        if (d >= R || a.ghosting || b.ghosting) continue;
        const am = a.mobile && !a.noPush ? 1 : 0, bm = b.mobile && !b.noPush ? 1 : 0;
        if (!am && !bm) continue;
        const over = R - d, nx = d > 1e-5 ? dx / d : 1, nz = d > 1e-5 ? dz / d : 0;
        const ka = am / (am + bm), kb = bm / (am + bm);
        a.pos.x -= nx * over * ka; a.pos.z -= nz * over * ka;
        b.pos.x += nx * over * kb; b.pos.z += nz * over * kb;
      }
      // the player walks into them: they give way (gently) unless they're anchored (seated, queueing, at a machine, in a chat)
      if (!a.anchor && !a.noPush && !a.ghosting) {
        const dx = a.pos.x - P.pos.x, dz = a.pos.z - P.pos.z;
        const d = Math.hypot(dx, dz), R = a.r + P.r;
        if (d < R && d > 1e-5) { const k = Math.min(R - d, 2.5 * dt); a.pos.x += dx / d * k; a.pos.z += dz / d * k; a.pushed += dt; }
      }
      // props and parked things
      if (a.mobile && !a.noPush && !a.ghosting && !a.thingGhost && !a.noStatics) {
        const boxes = this.near(a.pos.x, a.pos.z, this._boxes2 || (this._boxes2 = []));
        for (const o of boxes) pushOut(a.pos, a.r, o.minX, o.maxX, o.minZ, o.maxZ);
        for (const v of this.vehicles) pushOut(a.pos, a.r + 0.05, v.minX, v.maxX, v.minZ, v.maxZ);
      }
    }
    if (minD < this.stats.minDist) this.stats.minDist = minD;
    this.stats.frameMin = minD;
  }

  /** Is (x, z) inside a prop or a vehicle (padded by r)? */
  blocked(x, z, r = 0.2) {
    for (const o of this.near(x, z, this._boxes3 || (this._boxes3 = []))) if (x > o.minX - r && x < o.maxX + r && z > o.minZ - r && z < o.maxZ + r) return true;
    for (const v of this.vehicles) if (x > v.minX - r && x < v.maxX + r && z > v.minZ - r && z < v.maxZ + r) return true;
    return false;
  }
  /** Is anyone (registered, or the player) standing within r of (x, z)? (spots, queues) */
  occupied(x, z, r = 0.35, except = null) {
    for (const a of this.agents) if (a !== except && a.active && !a.hidden && Math.hypot(a.pos.x - x, a.pos.z - z) < r) return a;
    for (const f of this.foreign) if (Math.hypot(f.x - x, f.z - z) < r) return f;
    if (Math.hypot(this.playerAgent.pos.x - x, this.playerAgent.pos.z - z) < r) return this.playerAgent;
    return null;
  }
}

/** Distance along (dx, dz) from (x, z) to the box, or -1. */
function rayBox(x, z, dx, dz, x0, x1, z0, z1) {
  let t0 = 0, t1 = Infinity;
  if (Math.abs(dx) < 1e-9) { if (x < x0 || x > x1) return -1; } else {
    let a = (x0 - x) / dx, b = (x1 - x) / dx;
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a); t1 = Math.min(t1, b);
  }
  if (Math.abs(dz) < 1e-9) { if (z < z0 || z > z1) return -1; } else {
    let a = (z0 - z) / dz, b = (z1 - z) / dz;
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a); t1 = Math.min(t1, b);
  }
  return t0 <= t1 ? t0 : -1;
}

function pushOut(p, r, x0, x1, z0, z1) {
  const cx = clamp(p.x, x0, x1), cz = clamp(p.z, z0, z1);
  const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return;
  if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x += dx / d * (r - d); p.z += dz / d * (r - d); return; }
  const pl = p.x - x0, pr = x1 - p.x, pb = p.z - z0, pf = z1 - p.z, m = Math.min(pl, pr, pb, pf);
  if (m === pl) p.x = x0 - r; else if (m === pr) p.x = x1 + r; else if (m === pb) p.z = z0 - r; else p.z = z1 + r;
}

export const CROWD_LANE = LANE;
export const CROWD_GARAGE = GAR;
