// Rigging converted models (art/lowpix/animals: real CC BY animals, decimated and repainted as pixel-art coats) to the
// game's code-driven skeletons. Bones are laid out from the joints the build script fitted to each model (glTF node
// extras), and every vertex is skinned by distance to bone chains:
//   const w = skinByChains(positions, [{ pts: [[x, y, z], ...], bones: [i, ...], r, blend, where }, ...])
// A chain is a polyline through joints (bone k rides the segment pts[k] -> pts[k + 1]); a vertex goes to the chain it is
// closest to relative to that chain's radius r (a leg is thin, the trunk is thick), blended with any other chain that is
// almost as close, and inside a chain to the segment it is nearest, blended across each joint over `blend` metres.
// where(p) can restrict a chain (ears: only above the skull). Returns { skinIndex: Uint16Array, skinWeight: Float32Array }.
import * as THREE from 'three';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

function prepChain(c) {
  const P = c.pts.map((p) => new THREE.Vector3(...p)), L = [0];
  for (let k = 1; k < P.length; k++) L.push(L[k - 1] + P[k].distanceTo(P[k - 1]));
  return { ...c, P, L };
}

/** Distance from v to the chain and the bone weights along it. */
function onChain(c, v, d, q) {
  let best = 1e9, arc = 0;
  for (let k = 0; k + 1 < c.P.length; k++) {
    d.subVectors(c.P[k + 1], c.P[k]);
    const len2 = d.lengthSq() || 1e-12, t = clamp(q.subVectors(v, c.P[k]).dot(d) / len2, 0, 1);
    const dist = q.copy(c.P[k]).addScaledVector(d, t).distanceToSquared(v);
    if (dist < best) { best = dist; arc = c.L[k] + t * (c.L[k + 1] - c.L[k]); }
  }
  const B = c.bones, L = c.L;
  let k = 0;
  while (k < B.length - 1 && arc > L[k + 1]) k++;
  const bl = (j) => (Array.isArray(c.blend) ? c.blend[j] : c.blend ?? 0.02);
  const toEnd = L[k + 1] - arc, toStart = arc - L[k];
  let w;
  if (k + 1 < B.length && toEnd < bl(k)) { const s = smooth(-bl(k), bl(k), -toEnd); w = [[B[k], 1 - s], [B[k + 1], s]]; }
  else if (k > 0 && toStart < bl(k - 1)) { const s = smooth(-bl(k - 1), bl(k - 1), toStart); w = [[B[k - 1], 1 - s], [B[k], s]]; }
  else w = [[B[k], 1]];
  return { dist: Math.sqrt(best), w };
}

export function skinByChains(pos, chains, o = {}) {
  const n = pos.count, C = chains.map(prepChain);
  const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  const v = new THREE.Vector3(), d = new THREE.Vector3(), q = new THREE.Vector3();
  const sharp = o.sharp ?? 7, keep = o.keep ?? 0.6;
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(pos, i);
    const hits = [];
    for (const c of C) {
      if (c.where && !c.where(v)) continue;
      const h = onChain(c, v, d, q);
      hits.push({ s: h.dist / c.r, w: h.w });
    }
    hits.sort((a, b) => a.s - b.s);
    const acc = new Map();
    const s0 = hits[0].s;
    for (const h of hits) {
      if (h.s > s0 + keep) break;
      const k = Math.exp(-sharp * (h.s - s0));
      for (const [b, w] of h.w) acc.set(b, (acc.get(b) || 0) + w * k);
    }
    writeWeights(si, sw, i, acc);
  }
  return { skinIndex: si, skinWeight: sw };
}

/** Top four influences of a bone -> weight map, normalised. */
export function writeWeights(si, sw, i, acc) {
  const top = [...acc].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const tot = top.reduce((a, b) => a + b[1], 0) || 1;
  for (let k = 0; k < 4; k++) { si[i * 4 + k] = top[k] ? top[k][0] : 0; sw[i * 4 + k] = top[k] ? top[k][1] / tot : 0; }
}

/** Mix a vertex's weights toward one bone by t (0..1): the jaw, the tongue. */
export function mixToward(si, sw, i, bone, t) {
  if (t <= 0) return;
  const acc = new Map();
  for (let k = 0; k < 4; k++) if (sw[i * 4 + k] > 0) acc.set(si[i * 4 + k], (acc.get(si[i * 4 + k]) || 0) + sw[i * 4 + k] * (1 - t));
  acc.set(bone, (acc.get(bone) || 0) + t);
  writeWeights(si, sw, i, acc);
}

/** Bones from [name, parent, rest joint] rows (rest rotations identity, positions relative to the parent's joint). */
export function makeBones(rows) {
  const J = Object.fromEntries(rows.map(([n, , p]) => [n, p])), bones = [];
  for (const [name, parent, p] of rows) {
    const bn = new THREE.Bone();
    bn.name = name;
    const pp = parent ? J[parent] : [0, 0, 0];
    bn.position.set(p[0] - pp[0], p[1] - pp[1], p[2] - pp[2]);
    if (parent) bones.find((x) => x.name === parent).add(bn);
    bones.push(bn);
  }
  return { bones, J, b: Object.fromEntries(bones.map((x) => [x.name, x])) };
}
