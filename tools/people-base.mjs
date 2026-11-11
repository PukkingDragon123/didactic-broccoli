// Converts the CC0 base meshes (Quaternius, "Universal Base Characters" Standard: Superhero_Male_FullBody /
// Superhero_Female_FullBody glTF) into the people's compact base body: src/people/base/data.js.
//   node tools/people-base.mjs "<folder with the two .gltf + .bin>"
// What it does, per body:
//   - reposes the T-pose to the game's rest pose (arms hanging straight down, palms to the thighs, fingers relaxed),
//     skinned with dual quaternions so the shoulders keep their volume;
//   - maps the 65 UE-style bones onto the game's skeleton (src/people/body.js BONES): 4 weights a vertex;
//   - softens the superhero musculature (Taubin smoothing, masked to torso and limbs);
//   - decimates to a near and a far level of detail (meshoptimizer, face and hands weighted up);
//   - marks the face front (painted through the planar face block, src/people/face.js), eyeballs and nails;
//   - measures the landmarks the retarget needs (src/people/base.js).
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { MeshoptSimplifier } from 'meshoptimizer';

const SRC = process.argv[2];
const OUT = path.resolve(import.meta.dirname, '../src/people/base/data.js');
const OUR = ['hips', 'spine', 'chest', 'neck', 'head', 'armL', 'foreL', 'handL', 'armR', 'foreR', 'handR', 'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR', 'skirt', 'tailL', 'tailR', 'bag', 'prop', 'box'];
const TARGET = { near: 4700, far: 1000 }; // body triangles
const EYE_TRIS = { near: 110, far: 24 }; // a side

function mapBone(n) {
  const s = /_l$/.test(n) ? 'L' : /_r$/.test(n) ? 'R' : '';
  if (n === 'root' || n === 'pelvis') return 'hips';
  if (n === 'spine_01') return 'spine';
  if (n === 'spine_02' || n === 'spine_03' || n.startsWith('clavicle')) return 'chest';
  if (n === 'neck_01') return 'neck';
  if (n === 'Head') return 'head';
  if (n.startsWith('upperarm')) return 'arm' + s;
  if (n.startsWith('lowerarm')) return 'fore' + s;
  if (n.startsWith('hand') || /^(index|middle|ring|pinky|thumb)_/.test(n)) return 'hand' + s;
  if (n.startsWith('thigh')) return 'thigh' + s;
  if (n.startsWith('calf')) return 'shin' + s;
  if (n.startsWith('foot') || n.startsWith('ball')) return 'foot' + s;
  throw new Error('bone ' + n);
}

function loadGltf(file) {
  const g = JSON.parse(fs.readFileSync(file, 'utf8'));
  const bin = fs.readFileSync(path.join(path.dirname(file), g.buffers[0].uri));
  const acc = (i) => {
    const a = g.accessors[i], v = g.bufferViews[a.bufferView];
    const n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type];
    const T = { 5126: Float32Array, 5123: Uint16Array, 5125: Uint32Array, 5121: Uint8Array }[a.componentType];
    const off = (v.byteOffset || 0) + (a.byteOffset || 0);
    if (v.byteStride && v.byteStride !== n * T.BYTES_PER_ELEMENT) throw new Error('strided');
    return { n, a: new T(bin.buffer.slice(bin.byteOffset + off, bin.byteOffset + off + a.count * n * T.BYTES_PER_ELEMENT)) };
  };
  return { g, acc };
}

// ------------------------------------------------------------------ dual quaternions (repose without volume loss)
function dq(m) { // rigid Matrix4 -> [qr(4), qd(4)]
  const q = new THREE.Quaternion().setFromRotationMatrix(m), t = new THREE.Vector3().setFromMatrixPosition(m);
  const d = new THREE.Quaternion(t.x, t.y, t.z, 0).multiply(q);
  return [q.x, q.y, q.z, q.w, d.x * 0.5, d.y * 0.5, d.z * 0.5, d.w * 0.5];
}
function dqApply(b, p, out) {
  const n = Math.hypot(b[0], b[1], b[2], b[3]);
  const r = new THREE.Quaternion(b[0] / n, b[1] / n, b[2] / n, b[3] / n), d = new THREE.Quaternion(b[4] / n, b[5] / n, b[6] / n, b[7] / n);
  const t = d.clone().multiply(r.clone().conjugate()); // translation = 2 d r*
  out.copy(p).applyQuaternion(r).add(new THREE.Vector3(t.x * 2, t.y * 2, t.z * 2));
  return r;
}

function convert(file, sex) {
  const { g, acc } = loadGltf(file);
  const skin = g.skins[0], jn = skin.joints.map((j) => g.nodes[j].name);
  const IBM = acc(skin.inverseBindMatrices).a;
  const bindW = jn.map((_, i) => new THREE.Matrix4().fromArray(IBM, i * 16).invert());
  const jpos = (n) => new THREE.Vector3().setFromMatrixPosition(bindW[jn.indexOf(n)]);
  const parentOf = {};
  for (const j of skin.joints) for (const c of g.nodes[j].children || []) parentOf[g.nodes[c].name] = g.nodes[j].name;
  // ---- the repose: a world-space delta per joint, composed down the arm chains
  const D = jn.map(() => new THREE.Matrix4());
  const posed = (n) => jpos(n).applyMatrix4(D[jn.indexOf(n)]);
  const rotAbout = (pivot, q) => new THREE.Matrix4().makeTranslation(pivot.x, pivot.y, pivot.z).multiply(new THREE.Matrix4().makeRotationFromQuaternion(q)).multiply(new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z));
  const desc = (n) => { const out = [n]; for (const m of jn) { let p = parentOf[m]; while (p) { if (p === n) { out.push(m); break; } p = parentOf[p]; } } return out; };
  const applyTo = (n, M) => { for (const m of desc(n)) D[jn.indexOf(m)].premultiply(M); };
  const DOWN = new THREE.Vector3(0, -1, 0);
  for (const s of ['l', 'r']) {
    const sx = s === 'l' ? 1 : -1;
    const align = (a, b, joint) => { const pa = posed(a), pb = posed(b); applyTo(joint, rotAbout(pa, new THREE.Quaternion().setFromUnitVectors(pb.clone().sub(pa).normalize(), DOWN))); };
    align('upperarm_' + s, 'lowerarm_' + s, 'upperarm_' + s);
    align('lowerarm_' + s, 'hand_' + s, 'lowerarm_' + s);
    align('hand_' + s, 'middle_01_' + s, 'hand_' + s);
    // twist the hand about the vertical so the thumb points forward (palm to the thigh)
    const w = posed('hand_' + s), th = posed('thumb_02_' + s).sub(w); th.y = 0;
    const want = new THREE.Vector3(-sx * 0.25, 0, 1).normalize();
    const ang = Math.atan2(th.x, th.z) - Math.atan2(want.x, want.z);
    applyTo('hand_' + s, rotAbout(w, new THREE.Quaternion().setFromAxisAngle(DOWN, ang)));
    // relaxed fingers: curl towards the palm
    const palm = new THREE.Vector3(-sx, 0, 0.2).normalize();
    const CURL = { index: [0.12, 0.26, 0.16], middle: [0.16, 0.3, 0.18], ring: [0.2, 0.34, 0.2], pinky: [0.26, 0.38, 0.22], thumb: [0.05, 0.14, 0.12] };
    for (const [f, a] of Object.entries(CURL)) {
      for (let k = 0; k < 3; k++) {
        const j = `${f}_0${k + 1}_${s}`, c = `${f}_0${k + 2}_${s}`.replace('_04_', '_04_leaf_');
        const pj = posed(j), dir = posed(c.replace('leaf_leaf', 'leaf')).sub(pj).normalize();
        const n = f === 'thumb' ? new THREE.Vector3(-sx * 0.6, 0, -0.8).normalize() : palm;
        const axis = new THREE.Vector3().crossVectors(dir, n).normalize();
        applyTo(j, rotAbout(pj, new THREE.Quaternion().setFromAxisAngle(axis, a[k])));
      }
    }
  }
  const Dq = D.map(dq);
  const meshes = g.meshes.map((m) => m.primitives[0]);
  const bodyPrim = meshes[2], eyePrim = meshes[1];
  function prim(p, isEye) {
    const P = acc(p.attributes.POSITION).a, UV = acc(p.attributes.TEXCOORD_0).a, J = acc(p.attributes.JOINTS_0).a, W = acc(p.attributes.WEIGHTS_0).a, I = acc(p.indices).a;
    const nv = P.length / 3, pos = new Float32Array(nv * 3), bones = [], src = new Int16Array(nv);
    const v = new THREE.Vector3(), o = new THREE.Vector3();
    for (let i = 0; i < nv; i++) {
      const b = [0, 0, 0, 0, 0, 0, 0, 0];
      let first = null, best = -1;
      for (let k = 0; k < 4; k++) {
        const w = W[i * 4 + k]; if (w <= 0) continue;
        const q = Dq[J[i * 4 + k]];
        if (!first) first = q;
        const sg = q[0] * first[0] + q[1] * first[1] + q[2] * first[2] + q[3] * first[3] < 0 ? -w : w;
        for (let c = 0; c < 8; c++) b[c] += q[c] * sg;
        if (w > best) { best = w; src[i] = J[i * 4 + k]; }
      }
      dqApply(b, v.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]), o);
      pos[i * 3] = o.x; pos[i * 3 + 1] = o.y; pos[i * 3 + 2] = o.z;
      const acc2 = {};
      for (let k = 0; k < 4; k++) { const w = W[i * 4 + k]; if (w > 0) { const ob = isEye ? 'head' : mapBone(jn[J[i * 4 + k]]); acc2[ob] = (acc2[ob] || 0) + w; } }
      bones.push(Object.entries(acc2).sort((a, c) => c[1] - a[1]).slice(0, 4));
    }
    return { pos, uv: new Float32Array(UV), idx: new Uint32Array(I), bones, src };
  }
  const body = prim(bodyPrim, false), eyes = prim(eyePrim, true);
  // ---- weld (same position) for smoothing, normals and seams
  function welds(pos) {
    const map = new Map(), id = new Int32Array(pos.length / 3);
    let n = 0;
    for (let i = 0; i < id.length; i++) {
      const k = `${Math.round(pos[i * 3] * 1e5)},${Math.round(pos[i * 3 + 1] * 1e5)},${Math.round(pos[i * 3 + 2] * 1e5)}`;
      let w = map.get(k); if (w === undefined) { w = n++; map.set(k, w); }
      id[i] = w;
    }
    return { id, n };
  }
  // ---- soften the muscles (Taubin), masked to torso and limbs
  {
    const { id, n } = welds(body.pos), nb = Array.from({ length: n }, () => new Set());
    for (let t = 0; t < body.idx.length; t += 3) for (let k = 0; k < 3; k++) { const a = id[body.idx[t + k]], b = id[body.idx[t + (k + 1) % 3]]; nb[a].add(b); nb[b].add(a); }
    const P = new Float32Array(n * 3), mask = new Float32Array(n), cnt = new Float32Array(n);
    const soft = { hips: 1, spine: 1, chest: 1, armL: 1, foreL: 0.8, armR: 1, foreR: 0.8, thighL: 0.9, shinL: 0.7, thighR: 0.9, shinR: 0.7, neck: 0.5 };
    for (let i = 0; i < id.length; i++) {
      const w = id[i]; P.set(body.pos.subarray(i * 3, i * 3 + 3), w * 3);
      let m = 0; for (const [b, wt] of body.bones[i]) m += (soft[b] || 0) * wt;
      mask[w] += m; cnt[w]++;
    }
    for (let w = 0; w < n; w++) mask[w] /= cnt[w];
    const step = (lam) => {
      const Q = new Float32Array(P);
      for (let w = 0; w < n; w++) {
        if (!mask[w] || !nb[w].size) continue;
        let x = 0, y = 0, z = 0; for (const o of nb[w]) { x += P[o * 3]; y += P[o * 3 + 1]; z += P[o * 3 + 2]; }
        const k = lam * mask[w], s = nb[w].size;
        Q[w * 3] += k * (x / s - P[w * 3]); Q[w * 3 + 1] += k * (y / s - P[w * 3 + 1]); Q[w * 3 + 2] += k * (z / s - P[w * 3 + 2]);
      }
      P.set(Q);
    };
    for (let it = 0; it < (sex === 'm' ? 14 : 10); it++) { step(0.55); step(-0.58); }
    for (let i = 0; i < id.length; i++) body.pos.set(P.subarray(id[i] * 3, id[i] * 3 + 3), i * 3);
  }
  // ---- joints in the rest pose (our names) and landmarks
  const J = {};
  const pj = (n) => posed(n).toArray().map((x) => +x.toFixed(4));
  Object.assign(J, { hips: pj('pelvis'), spine: pj('spine_01'), chest: pj('spine_02'), neck: pj('neck_01'), head: pj('Head') });
  for (const [s, S] of [['l', 'L'], ['r', 'R']]) {
    J['arm' + S] = pj('upperarm_' + s); J['fore' + S] = pj('lowerarm_' + s); J['hand' + S] = pj('hand_' + s);
    J['thigh' + S] = pj('thigh_' + s); J['shin' + S] = pj('calf_' + s); J['foot' + S] = pj('foot_' + s);
    J['tip' + S] = pj('middle_04_leaf_' + s); J['ball' + S] = pj('ball_' + s); J['toe' + S] = pj('ball_leaf_' + s);
  }
  const L = measure(body, eyes, J);
  // ---- levels of detail
  const lods = {};
  for (const lod of ['near', 'far']) lods[lod] = pack(simplify(body, TARGET[lod], { head: 2.4, hand: 1.7 }), simplify(eyes, EYE_TRIS[lod] * 2, {}), L, welds);
  return { J, L, lods };
}

/** Landmarks measured on the reposed body (metres). */
function measure(body, eyes, J) {
  const P = body.pos, nv = P.length / 3, isB = (i, s) => body.bones[i][0][0] === s;
  const L = {};
  let crown = -1e9, eyeY = 0, eyeZ = 0, eyeX = 0, eyeR = 0, ne = 0;
  for (let i = 0; i < nv; i++) if (P[i * 3 + 1] > crown) crown = P[i * 3 + 1];
  for (let i = 0; i < eyes.pos.length / 3; i++) if (eyes.pos[i * 3] > 0) { eyeX += eyes.pos[i * 3]; eyeY += eyes.pos[i * 3 + 1]; eyeZ += eyes.pos[i * 3 + 2]; ne++; }
  eyeX /= ne; eyeY /= ne; eyeZ /= ne;
  for (let i = 0; i < eyes.pos.length / 3; i++) if (eyes.pos[i * 3] > 0) eyeR = Math.max(eyeR, Math.hypot(eyes.pos[i * 3] - eyeX, eyes.pos[i * 3 + 1] - eyeY, eyes.pos[i * 3 + 2] - eyeZ));
  // the midline profile of the face: chin (lowest front point), mouth (the deepest point between nose and chin), nose
  const mid = [];
  for (let i = 0; i < nv; i++) if (Math.abs(P[i * 3]) < 0.004 && P[i * 3 + 2] > 0 && P[i * 3 + 1] > eyeY - 0.17 && isB(i, 'head')) mid.push([P[i * 3 + 1], P[i * 3 + 2]]);
  mid.sort((a, b) => a[0] - b[0]);
  let nose = mid[0]; for (const m of mid) if (m[1] > nose[1] && m[0] < eyeY) nose = m;
  const chinPts = mid.filter((m) => m[1] > nose[1] - 0.045 && m[0] < nose[0] - 0.04);
  const chin = chinPts[0];
  let mouth = null; for (const m of mid) if (m[0] > chin[0] + 0.02 && m[0] < nose[0] - 0.02 && (!mouth || m[1] < mouth[1])) mouth = m;
  let base = null; for (const m of mid) if (m[0] > mouth[0] + 0.006 && m[0] < nose[0] && m[1] < nose[1] - 0.012) base = m; // subnasale
  let back = 0, front = -1e9, temple = 0, earX = 0;
  for (let i = 0; i < nv; i++) {
    if (!isB(i, 'head')) continue;
    const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
    if (y > eyeY) back = Math.min(back, z);
    if (Math.abs(x) < 0.01 && y > eyeY + 0.01 && y < eyeY + 0.05) front = Math.max(front, z);
    if (Math.abs(y - (eyeY + 0.045)) < 0.006) temple = Math.max(temple, Math.abs(x));
    if (Math.abs(y - eyeY + 0.01) < 0.012) earX = Math.max(earX, Math.abs(x));
  }
  Object.assign(L, { crown, chin: chin[0], chinZ: chin[1], mouth: mouth[0], mouthZ: mouth[1], nose: nose[0], noseZ: nose[1], noseBase: base ? base[0] : nose[0] - 0.012, eyeY, eyeX, eyeZ, eyeR, back, front, temple, earX });
  // torso half-widths and depths at levels: plane cross-sections of the torso's triangles (the neck's alone above the
  // shoulders, the upper thighs' with the hips)
  const lv = [], I = body.idx;
  const y0 = Math.min(J.thighL[1], J.thighR[1]) - 0.06, y1 = L.chin;
  const okTri = (y, t) => {
    for (let k = 0; k < 3; k++) {
      const i = I[t + k], by = body.bones[i][0][0];
      if (y > J.armL[1] + 0.03) { if (!(by === 'neck' || by === 'head' || by === 'chest') || Math.abs(P[i * 3]) > 0.085) return false; }
      else if (!(by === 'hips' || by === 'spine' || by === 'chest' || by === 'neck' || (by.startsWith('thigh') && y > J.thighL[1] - 0.07))) return false;
    }
    return true;
  };
  for (let y = y0; y <= y1 + 1e-6; y += 0.01) {
    let x = 0, zf = -1, zb = 1;
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
      const ya = P[a + 1], yb = P[b + 1], yc = P[c + 1];
      if ((ya < y && yb < y && yc < y) || (ya > y && yb > y && yc > y)) continue;
      if (!okTri(y, t)) continue;
      for (const [u, v] of [[a, b], [b, c], [c, a]]) {
        const yu = P[u + 1], yv = P[v + 1];
        if ((yu - y) * (yv - y) > 0 || yu === yv) continue;
        const k = (y - yu) / (yv - yu), px = P[u] + (P[v] - P[u]) * k, pz = P[u + 2] + (P[v + 2] - P[u + 2]) * k;
        x = Math.max(x, Math.abs(px)); zf = Math.max(zf, pz); zb = Math.min(zb, pz);
      }
    }
    if (x > 0) lv.push([+y.toFixed(3), +x.toFixed(4), +zf.toFixed(4), +zb.toFixed(4)]);
  }
  L.torso = lv;
  // crotch: the lowest torso point between the legs
  let crotch = 1e9; for (let i = 0; i < nv; i++) if (Math.abs(P[i * 3]) < 0.01 && P[i * 3 + 1] < J.hips[1]) crotch = Math.min(crotch, P[i * 3 + 1]);
  L.crotch = crotch;
  // limb radii (half-widths x / z about the joint line) at a few points along each bone
  const rad = (bone, a, b, ts) => ts.map((t) => {
    const y = a[1] + (b[1] - a[1]) * t; let rx = 0, rz = 0;
    for (let i = 0; i < nv; i++) {
      if (body.bones[i][0][0] !== bone || Math.abs(P[i * 3 + 1] - y) > 0.008) continue;
      rx = Math.max(rx, Math.abs(P[i * 3] - a[0])); rz = Math.max(rz, Math.abs(P[i * 3 + 2] - a[2]));
    }
    return [+rx.toFixed(4), +rz.toFixed(4)];
  });
  L.arm = rad('armL', J.armL, J.foreL, [0.35, 0.6]); L.fore = rad('foreL', J.foreL, J.handL, [0.15, 0.8]);
  L.thigh = rad('thighL', J.thighL, J.shinL, [0.25, 0.7]); L.shin = rad('shinL', J.shinL, J.footL, [0.3, 0.8]);
  for (const k of Object.keys(L)) if (typeof L[k] === 'number') L[k] = +L[k].toFixed(4);
  return L;
}

/** Decimate (meshoptimizer), regions weighted by scaling them up for the error metric. */
function simplify(m, targetTris, boost) {
  const nv = m.pos.length / 3, sp = new Float32Array(m.pos);
  for (let i = 0; i < nv; i++) {
    const b = m.bones[i][0][0], k = b === 'head' ? boost.head || 1 : b.startsWith('hand') ? boost.hand || 1 : 1;
    if (k !== 1) for (let c = 0; c < 3; c++) sp[i * 3 + c] *= k;
  }
  const attr = new Float32Array(nv * 2); attr.set(m.uv);
  let idx = m.idx;
  if (idx.length / 3 > targetTris) [idx] = MeshoptSimplifier.simplifyWithAttributes(m.idx, sp, 3, attr, 2, [0.4, 0.4], null, targetTris * 3, 0.2, []);
  return { ...m, idx };
}

/** Compact vertices, mark face / eye / nail, split the face front off along its border, and pack to bytes. */
function pack(body, eyes, L, welds) {
  // merge eyes into one vertex list
  const V = [], push = (m, eye) => {
    const map = new Map(), out = [];
    for (const i of m.idx) {
      if (!map.has(i)) { map.set(i, V.length); V.push({ p: [m.pos[i * 3], m.pos[i * 3 + 1], m.pos[i * 3 + 2]], uv: [m.uv[i * 2], m.uv[i * 2 + 1]], b: m.bones[i], src: m.src[i], eye }); }
      out.push(map.get(i));
    }
    return out;
  };
  const I = [...push(body, false), ...push(eyes, true)];
  // face front: head vertices in front of the ears, between the chin and the forehead
  const inFace = (v) => v.eye || (v.b[0][0] === 'head' && v.b[0][1] > 0.7 && v.p[2] > L.eyeZ - 0.035 && Math.abs(v.p[0]) < L.temple * 0.86 && v.p[1] > L.chin - 0.012 && v.p[1] < L.eyeY + 0.1);
  const triFace = [];
  for (let t = 0; t < I.length; t += 3) triFace.push(inFace(V[I[t]]) && inFace(V[I[t + 1]]) && inFace(V[I[t + 2]]));
  // split shared border vertices: face triangles get their own copy
  const faceCopy = new Map();
  for (let t = 0; t < I.length; t += 3) {
    if (!triFace[t / 3]) continue;
    for (let k = 0; k < 3; k++) {
      const i = I[t + k];
      if (V[i].face === undefined) V[i].face = true;
    }
  }
  for (let t = 0; t < I.length; t += 3) if (!triFace[t / 3]) for (let k = 0; k < 3; k++) { const i = I[t + k]; if (V[i].face) V[i].shared = true; }
  for (let t = 0; t < I.length; t += 3) {
    if (!triFace[t / 3]) continue;
    for (let k = 0; k < 3; k++) {
      const i = I[t + k];
      if (!V[i].shared) continue;
      let c = faceCopy.get(i);
      if (c === undefined) { c = V.length; V.push({ ...V[i], shared: false, face: true }); faceCopy.set(i, c); }
      I[t + k] = c;
    }
  }
  for (const v of V) if (v.shared) v.face = false;
  // nails: the back of the distal phalanges (src joints *_03 / thumb_03)
  const nv = V.length, pos = new Float32Array(nv * 3);
  V.forEach((v, i) => pos.set(v.p, i * 3));
  const { id } = welds(pos);
  // bytes
  let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const v of V) for (let c = 0; c < 3; c++) { mn[c] = Math.min(mn[c], v.p[c]); mx[c] = Math.max(mx[c], v.p[c]); }
  const q = new Int16Array(nv * 3), uv = new Uint16Array(nv * 2), bi = new Uint8Array(nv * 4), bw = new Uint8Array(nv * 4), wid = new Uint16Array(nv), fl = new Uint8Array(nv), sj = new Uint8Array(nv);
  V.forEach((v, i) => {
    for (let c = 0; c < 3; c++) q[i * 3 + c] = Math.round(((v.p[c] - mn[c]) / (mx[c] - mn[c])) * 65534 - 32767);
    uv[i * 2] = Math.round(v.uv[0] * 65535); uv[i * 2 + 1] = Math.round(v.uv[1] * 65535);
    const bb = v.b.filter(([, w], k) => k === 0 || w > 0.02), tot = bb.reduce((a, x) => a + x[1], 0);
    const ws = bb.map(([, w]) => Math.round((w / tot) * 255));
    ws[0] += 255 - ws.reduce((a, x) => a + x, 0); // the rounding's remainder to the main bone
    bb.forEach(([b], k) => { bi[i * 4 + k] = OUR.indexOf(b); bw[i * 4 + k] = ws[k]; });
    wid[i] = id[i];
    fl[i] = (v.face ? 1 : 0) | (v.eye ? 2 : 0);
    sj[i] = v.src;
  });
  const idx = new Uint16Array(I);
  const b64 = (a) => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');
  return { nv, ni: idx.length, mn: mn.map((x) => +x.toFixed(5)), mx: mx.map((x) => +x.toFixed(5)), pos: b64(q), uv: b64(uv), bi: b64(bi), bw: b64(bw), weld: b64(wid), flags: b64(fl), src: b64(sj), idx: b64(idx) };
}

await MeshoptSimplifier.ready;
const out = {};
let srcNames = null;
for (const [sex, name] of [['m', 'Superhero_Male_FullBody'], ['f', 'Superhero_Female_FullBody']]) {
  const r = convert(path.join(SRC, name + '.gltf'), sex);
  out[sex] = r;
  if (!srcNames) { const g = JSON.parse(fs.readFileSync(path.join(SRC, name + '.gltf'), 'utf8')); srcNames = g.skins[0].joints.map((j) => g.nodes[j].name); }
  console.log(sex, 'near', r.lods.near.ni / 3, 'tris', r.lods.near.nv, 'verts; far', r.lods.far.ni / 3, 'tris');
  console.log(JSON.stringify({ J: r.J, L: { ...r.L, torso: undefined } }));
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `// Generated by tools/people-base.mjs from the CC0 "Universal Base Characters" (Standard) by Quaternius
// (quaternius.com, CC0 1.0). Reposed, rigged to the game's skeleton, softened and decimated; see that tool.
// Per sex: J (rest-pose joints), L (landmarks), lods.near / lods.far (base64 typed arrays).
export const SRC_JOINTS = ${JSON.stringify(srcNames)};
export const BASE = ${JSON.stringify(out)};
`);
console.log('wrote', OUT, (fs.statSync(OUT).size / 1024).toFixed(0), 'KB');
