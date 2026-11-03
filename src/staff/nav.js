// Getting around the garage for staff: a small waypoint graph of the aisles (in under the shutter, along the machine
// row, round the work table, the back corner and the right-hand wall) plus the way in from the lane. route(a, b) gives
// the points to walk from a to b without cutting through the machines, the table or the PC desk.
import * as THREE from 'three';
import { GARAGE, MACHINE_SLOTS } from '../world/Garage.js';

const V = (x, z) => new THREE.Vector3(x, 0, z);
// the aisle in front of the machines (customers stand at x = -2.45)
export const ROW_X = -2.45;
const N = {
  out: [0.4, 6.3], door: [0.4, 4.35], front: [-1.3, 3.55], frontR: [1.9, 3.5], rowN: [ROW_X, 3.0],
  midL: [-1.45, 0.1], midR: [1.75, 0.1], backL: [ROW_X, -3.95], back: [-0.2, -3.75], backR: [2.35, -3.25],
  right1: [2.6, 1.2], right2: [2.55, -1.6], sink: [2.6, -4.1],
};
const E = [
  ['out', 'door'], ['door', 'front'], ['door', 'frontR'], ['front', 'rowN'], ['front', 'midL'], ['frontR', 'midR'], ['frontR', 'right1'],
  ['midL', 'back'], ['midR', 'right1'], ['midR', 'right2'], ['right1', 'right2'], ['right2', 'backR'], ['backR', 'back'], ['backR', 'sink'], ['back', 'backL'], ['back', 'sink'],
];
// one node per machine slot along the row, chained from rowN to backL in order of z
const slots = MACHINE_SLOTS.map((s, i) => ({ i, z: s.z })).sort((a, b) => b.z - a.z);
let prev = 'rowN';
for (const s of slots) { const id = 'm' + s.i; N[id] = [ROW_X, s.z]; E.push([prev, id]); prev = id; if (s.z > -0.4 && s.z < 0.6) E.push([id, 'midL']); }
E.push([prev, 'backL']);

const ADJ = {};
for (const [a, b] of E) { (ADJ[a] ||= []).push(b); (ADJ[b] ||= []).push(a); }
const dist = (a, b) => Math.hypot(N[a][0] - N[b][0], N[a][1] - N[b][1]);

/** Inside the garage walls? */
export const inGarage = (p) => Math.abs(p.x) < GARAGE.maxX && p.z > GARAGE.minZ && p.z < GARAGE.maxZ - 0.05;

function nearest(p, inside) {
  let best = null, bd = Infinity;
  for (const id of Object.keys(N)) {
    if (inside === false && id !== 'out') continue;
    const d = Math.hypot(N[id][0] - p.x, N[id][1] - p.z);
    if (d < bd) { bd = d; best = id; }
  }
  return best;
}

function path(a, b) {
  if (a === b) return [a];
  const d = { [a]: 0 }, from = {}, open = new Set([a]);
  while (open.size) {
    let u = null;
    for (const x of open) if (u === null || d[x] < d[u]) u = x;
    open.delete(u);
    if (u === b) break;
    for (const v of ADJ[u] || []) {
      const nd = d[u] + dist(u, v);
      if (d[v] === undefined || nd < d[v]) { d[v] = nd; from[v] = u; open.add(v); }
    }
  }
  const out = [b];
  for (let x = b; x !== a; x = from[x]) { if (from[x] === undefined) return [a, b]; out.unshift(from[x]); }
  return out;
}

/** Waypoints from a to b (Vector3s). Through the shutter when one end is outside; along the aisles inside. */
export function route(a, b) {
  const ia = inGarage(a), ib = inGarage(b);
  const pts = [];
  if (!ia && !ib) return [b.clone().setY(0)];
  const na = ia ? nearest(a, true) : 'out', nb = ib ? nearest(b, true) : 'out';
  if (!ia) {
    // from the lane: along the near sidewalk to the shop front first
    if (Math.abs(a.x - 0.4) > 1.5 || a.z > 7.6) pts.push(V(a.x + Math.sign(0.4 - a.x) * Math.min(1.2, Math.abs(0.4 - a.x)), 6.9), V(0.4, 6.9));
  }
  const p = path(na, nb);
  // skip the first node when we're already past it (heading away from it)
  for (let i = 0; i < p.length; i++) {
    const id = p[i];
    if (i === 0 && p.length > 1 && ia) {
      const n0 = N[id], n1 = N[p[1]];
      const ax = a.x - n0[0], az = a.z - n0[1], bx = n1[0] - n0[0], bz = n1[1] - n0[1];
      if (ax * bx + az * bz > 0 && Math.hypot(ax, az) > 0.2) continue;
    }
    pts.push(V(N[id][0], N[id][1]));
  }
  if (!ib) {
    if (Math.abs(b.x - 0.4) > 1.5 || b.z > 7.6) pts.push(V(0.4, 6.9), V(b.x + Math.sign(0.4 - b.x) * Math.min(1.2, Math.abs(0.4 - b.x)), 6.9));
  }
  pts.push(b.clone().setY(0));
  // drop the second-to-last waypoint if the target is right next to it on the way
  return pts;
}

/** Where to stand to work a machine (in its aisle, facing it). */
export function machineSpot(m) {
  const slot = MACHINE_SLOTS[m.data.slot] || { x: -3.42, z: 0 };
  return { pos: V(slot.x + 0.92, slot.z), yaw: -Math.PI / 2 };
}
/** A named node as a Vector3 (sink, door, front...). */
export const node = (id) => (N[id] ? V(N[id][0], N[id][1]) : null);
