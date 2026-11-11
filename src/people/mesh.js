// Builds a person's one skinned mesh (one draw call) and its atlas layout.
//   - the body: the sculpted base mesh (src/people/base.js) fitted to the person, smooth-skinned (4 bones a vertex),
//     its own UV layout in the atlas' body square, the face front (and the eyeballs) planar-projected into the face
//     block that src/people/face.js paints; clothes shaped onto it (src/people/garments.js);
//   - the extras (hair, skirts, props): smooth lofts / prisms (src/people/body.js segments) packed around it;
//   - the modelled gear (src/people/gear.js): hats, glasses, bags, shoes, vertex-coloured.
// A far level of detail shares the atlas. Painters receive, per texel, the rest-pose surface point, its normal and the
// anatomical part (src/people/paint.js), so patterns run continuously across the body.
import * as THREE from 'three';
import { BONE_INDEX } from './body.js';
import { buildGear } from './gear.js';
import { baseBody, fitter } from './base.js';
import { SRC_JOINTS } from './base/data.js';
import { dressBody, garmentIslands, skirtPiece, collarPiece } from './garments.js';
import { buildHair, SWATCH, Mesh } from './hairMesh.js';

// 512: the body square gets 416 px (about 260 texels a metre on an adult: high-resolution pixel art, crisp up close);
// the face block (about 430 px a metre) and the extras pack into the strips around it
export const ATLAS = 512;
export const BODY_PX = 416;
const FACE_DENS = 430;
const PAD = 2;

function ring(y, r, ch) {
  const [cx, cz, hx, hz] = r;
  const c = ch * Math.min(hx, hz);
  if (c < 1e-5) return [[cx + hx, y, cz + hz], [cx - hx, y, cz + hz], [cx - hx, y, cz - hz], [cx + hx, y, cz - hz]];
  return [[cx + hx, y, cz + hz - c], [cx + hx - c, y, cz + hz], [cx - hx + c, y, cz + hz], [cx - hx, y, cz + hz - c],
    [cx - hx, y, cz - hz + c], [cx - hx + c, y, cz - hz], [cx + hx - c, y, cz - hz], [cx + hx, y, cz - hz + c]];
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/** Faces of one prism segment (rest pose) with their outward normal and an in-plane basis (U right, V up). */
function segFaces(s) {
  const B = ring(s.y0, s.b, s.ch), T = ring(s.y1, s.t, s.ch);
  if (s.rot) {
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...s.rot.e, 'XYZ'));
    const v = new THREE.Vector3();
    for (const p of [...B, ...T]) {
      v.set(p[0] - s.rot.p[0], p[1] - s.rot.p[1], p[2] - s.rot.p[2]).applyMatrix4(m);
      p[0] = v.x + s.rot.p[0]; p[1] = v.y + s.rot.p[1]; p[2] = v.z + s.rot.p[2];
    }
  }
  const c = [0, 0, 0];
  for (const p of [...B, ...T]) { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; }
  c[0] /= B.length * 2; c[1] /= B.length * 2; c[2] /= B.length * 2;
  const avg = (R) => R.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0]).map((x) => x / R.length);
  const up = s.rot ? norm(sub(avg(T), avg(B))) : [0, 1, 0];
  const out = [];
  const n = B.length;
  for (let i = 0; i < n; i++) {
    const a = B[i], b = B[(i + 1) % n], tb = T[(i + 1) % n], ta = T[i];
    let N = norm(cross(sub(b, a), sub(ta, a)));
    const mid = [(a[0] + b[0] + ta[0] + tb[0]) / 4, (a[1] + b[1] + ta[1] + tb[1]) / 4, (a[2] + b[2] + ta[2] + tb[2]) / 4];
    let pts = [a, b, tb, ta];
    const rel = sub(mid, c); const ax = dot(rel, up); const radial = [rel[0] - up[0] * ax, rel[1] - up[1] * ax, rel[2] - up[2] * ax];
    if (dot(N, radial) < 0) { N = [-N[0], -N[1], -N[2]]; pts = [b, a, ta, tb]; }
    if (Math.hypot(...sub(a, b)) < 1e-6 && Math.hypot(...sub(ta, tb)) < 1e-6) continue;
    out.push({ seg: s, kind: 'side', pts, N, tris: [0, 1, 2, 0, 2, 3] });
  }
  const cap = (P, top) => {
    const N = top ? up : [-up[0], -up[1], -up[2]];
    const pts = top ? [...P] : [...P].reverse();
    const t = [];
    for (let i = 1; i < pts.length - 1; i++) t.push(0, i, i + 1);
    const w = cross(sub(pts[1], pts[0]), sub(pts[2], pts[0]));
    if (dot(w, N) < 0) for (let i = 0; i < t.length; i += 3) [t[i + 1], t[i + 2]] = [t[i + 2], t[i + 1]];
    out.push({ seg: s, kind: top ? 'top' : 'bot', pts, N, tris: t });
  };
  if (s.caps === 'both' || s.caps === 'top') cap(T, true);
  if (s.caps === 'both' || s.caps === 'bot') cap(B, false);
  for (const f of out) {
    let V;
    if (f.kind === 'side') { V = sub(f.pts[3], f.pts[0]); const k = dot(V, f.N); V = norm([V[0] - f.N[0] * k, V[1] - f.N[1] * k, V[2] - f.N[2] * k]); }
    else V = f.kind === 'top' ? [0, 0, -1] : [0, 0, 1];
    if (f.kind !== 'side' && s.rot) { const k = dot(V, f.N); V = norm([V[0] - f.N[0] * k, V[1] - f.N[1] * k, V[2] - f.N[2] * k]); }
    f.V = V; f.U = norm(cross(V, f.N));
    f.o = f.pts[0];
    let s0 = Infinity, s1 = -Infinity, r0 = Infinity, r1 = -Infinity;
    for (const p of f.pts) { const d = sub(p, f.o); const u = dot(d, f.U), v = dot(d, f.V); s0 = Math.min(s0, u); s1 = Math.max(s1, u); r0 = Math.min(r0, v); r1 = Math.max(r1, v); }
    f.s0 = s0; f.s1 = s1; f.r0 = r0; f.r1 = r1;
  }
  return out;
}

/** Skyline bottom-left packing of rectangles ({w, h}) into the atlas around the body square; false on overflow. */
function pack(rects) {
  const sky = new Int16Array(ATLAS);
  for (let x = 0; x < BODY_PX + PAD; x++) sky[x] = BODY_PX + PAD;
  const order = [...rects].sort((a, b) => b.h - a.h || b.w - a.w);
  for (const r of order) {
    if (r.w > ATLAS) return false;
    let bx = -1, by = 1e9;
    for (let x = 0; x + r.w <= ATLAS; x++) {
      const left = x === 0 || sky[x] !== sky[x - 1];
      const right = x + r.w === ATLAS || sky[x + r.w] !== sky[x + r.w - 1];
      if (!left && !right) continue;
      let y = 0;
      for (let i = x; i < x + r.w; i++) if (sky[i] > y) { y = sky[i]; if (y >= by) break; }
      if (y < by) { by = y; bx = x; }
    }
    if (by + r.h > ATLAS) return false;
    r.x = bx; r.y = by;
    for (let i = bx; i < bx + r.w; i++) sky[i] = by + r.h;
  }
  return true;
}

// ------------------------------------------------------------------ anatomical parts of the base body (for the painters)
const SRC = SRC_JOINTS;
const HANDB = new Set([BONE_INDEX.handL, BONE_INDEX.handR]), FOOTB = new Set([BONE_INDEX.footL, BONE_INDEX.footR]);
/** [part, painter] of a fitted body vertex. */
function partOf(b, src, x, y, z, P) {
  const H = P.H;
  switch (b) {
    case BONE_INDEX.hips: return [y < P.hipY + 0.012 * H ? 'hipsLo' : 'hipsUp', 'body'];
    case BONE_INDEX.spine: return ['spine', 'body'];
    case BONE_INDEX.chest: return [y < P.bustY ? 'chestLo' : y < P.shoulderY + 0.004 * H ? 'chestHi' : 'traps', 'body'];
    case BONE_INDEX.neck: return ['neck', 'skin'];
    case BONE_INDEX.head: {
      if (Math.abs(x) > P.hw * 0.93 && y < P.earTop + 0.01 && y > P.earBot - 0.012 && z < P.hcz + P.hd * 0.35) return ['ear', 'ear'];
      return [y < P.noseY ? 'jaw' : 'cranium', 'head'];
    }
    case BONE_INDEX.armL: case BONE_INDEX.armR: return ['uarm', 'body'];
    case BONE_INDEX.foreL: case BONE_INDEX.foreR: return ['farm', 'body'];
    case BONE_INDEX.thighL: case BONE_INDEX.thighR: return ['thigh', 'body'];
    case BONE_INDEX.shinL: case BONE_INDEX.shinR: return [y > P.kneeY - 0.1 * H ? 'calf' : 'shin', 'body'];
    default:
      if (HANDB.has(b)) { const n = SRC[src] || ''; return [n.startsWith('thumb') ? 'thumb' : /^(index|middle|ring|pinky)/.test(n) ? 'fingers' : 'palm', 'hand', /_0[34]_/.test(n) ? 1 : 0]; }
      if (FOOTB.has(b)) return [(SRC[src] || '').startsWith('ball') ? 'toe' : 'foot', 'shoe'];
      return ['spine', 'body'];
  }
}
// the painters' segment stand-ins, one per part (they read seg.part / seg.mat / seg.mirror)
const PSEG = {};
const pseg = (part, mat, tip) => PSEG[part + mat + tip] || (PSEG[part + mat + tip] = { part, mat, tip: !!tip, base: true });

/** Accumulate area-weighted normals over welded (same base position) vertices. */
function weldNormals(pos, idx, weld, nWeld, out) {
  const acc = new Float32Array(nWeld * 3);
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const i of [idx[t], idx[t + 1], idx[t + 2]]) { const w = weld[i] * 3; acc[w] += nx; acc[w + 1] += ny; acc[w + 2] += nz; }
  }
  for (let i = 0; i < out.length / 3; i++) {
    const w = weld[i] * 3, l = Math.hypot(acc[w], acc[w + 1], acc[w + 2]) || 1;
    out[i * 3] = acc[w] / l; out[i * 3 + 1] = acc[w + 1] / l; out[i * 3 + 2] = acc[w + 2] / l;
  }
}

/** The fitted, dressed base body at one level of detail: arrays (+ atlas px per vertex), its triangles, the hair. */
function fittedBody(plan, lod, block, swatch) {
  const { P, J, spec } = plan;
  const m = baseBody(spec.sex, lod), fit = fitter(m, P, J);
  const n = m.nv, pos = new Float32Array(n * 3), o = [0, 0, 0];
  for (let i = 0; i < n; i++) { fit.map(i, o); pos[i * 3] = o[0]; pos[i * 3 + 1] = o[1]; pos[i * 3 + 2] = o[2]; }
  let idx = m.idx;
  // a closed shoe encloses the foot: drop the foot under its collar (never seen, and it would poke through)
  const sk = spec.shoes?.kind;
  if (plan.closedShoe) {
    const top = P.ankleY + (sk === 'boots' ? 0.03 : sk === 'tabi' ? 0.07 : 0.004) * P.H, keep = [];
    for (let t = 0; t < idx.length; t += 3) {
      let under = true;
      for (let k = 0; k < 3; k++) { const i = idx[t + k]; if (!FOOTB.has(m.bi[i * 4]) && !(m.bi[i * 4] === BONE_INDEX.shinL || m.bi[i * 4] === BONE_INDEX.shinR) || pos[i * 3 + 1] > top) under = false; }
      if (!under) keep.push(idx[t], idx[t + 1], idx[t + 2]);
    }
    idx = keep;
  }
  const apx = new Float32Array(n * 2), uv = [0, 0];
  const body = { m, n, n0: n, pos, apx, uv: m.uv, bi: m.bi, bw: m.bw, flags: m.flags, src: m.src, weld: m.weld, nWeld: m.nWeld, idx: Array.from(idx), col: null, gear: null };
  for (let i = 0; i < n; i++) { bodyUV(body, i, block, uv); apx[i * 2] = uv[0]; apx[i * 2 + 1] = uv[1]; }
  // clothes: hems, cuffs, collars and folds shaped on the surface (may add vertices / triangles)
  dressBody(body, plan, lod);
  skirtPiece(body, plan, lod, plan.islands?.skirt, plan.islands?.coat);
  if (lod === 'near') P.armClear = armClearance(body, P);
  body.nTris = body.idx.length / 3; // the painted triangles (the hair after them samples the swatch / vertex colours)
  const collar = collarPiece(body, plan, lod, Mesh);
  const hair = buildHair(spec, P, J, body, swatch, lod);
  if (collar) growBody(body, collar);
  if (hair) growBody(body, hair);
  const nrm = new Float32Array(body.n * 3);
  weldNormals(body.pos, body.idx, body.weld, body.nWeld, nrm);
  body.nrm = nrm;
  return body;
}

/** How far the arms must hang out (rad) for the hands to clear the hips / skirt at their side. */
function armClearance(B, P) {
  const y0 = P.tipY - 0.02, y1 = P.wristY + 0.06;
  let xm = 0;
  for (let i = 0; i < B.n; i++) {
    const b = B.bi[i * 4]; if (b === BONE_INDEX.handL || b === BONE_INDEX.handR || b === BONE_INDEX.foreL || b === BONE_INDEX.foreR || b === BONE_INDEX.armL || b === BONE_INDEX.armR) continue;
    const y = B.pos[i * 3 + 1], z = B.pos[i * 3 + 2];
    if (y < y0 || y > y1 || Math.abs(z) > 0.07) continue;
    xm = Math.max(xm, Math.abs(B.pos[i * 3]));
  }
  const dx = xm + 0.019 * (P.H / 1.7) - P.shX, L = P.shoulderY - (P.wristY + P.tipY) / 2;
  return dx > 0 ? Math.asin(Math.min(0.5, dx / L)) + 0.015 : 0;
}

/** Append a hairMesh.js Mesh (growable arrays, own atlas px, bones, optional vertex colours) to the body. */
function growBody(B, M) {
  const n0 = B.n, n = M.pos.length / 3, N = n0 + n;
  const cat = (A, add, T, per) => { const out = new T(N * per); out.set(A.subarray ? A.subarray(0, n0 * per) : A.slice(0, n0 * per)); out.set(add, n0 * per); return out; };
  B.pos = cat(B.pos, M.pos, Float32Array, 3);
  B.apx = cat(B.apx, M.apx, Float32Array, 2);
  B.bi = cat(B.bi, M.bi, Uint8Array, 4);
  B.bw = cat(B.bw, M.bw, Float32Array, 4);
  B.flags = cat(B.flags, new Uint8Array(n), Uint8Array, 1);
  B.src = cat(B.src, new Uint8Array(n), Uint8Array, 1);
  const w = new Uint16Array(n); for (let i = 0; i < n; i++) w[i] = B.nWeld + i;
  B.weld = cat(B.weld, w, Uint16Array, 1); B.nWeld += n;
  if (!B.col) { B.col = new Float32Array(n0 * 3).fill(1); B.gear = new Float32Array(n0 * 3); }
  B.col = cat(B.col, M.col, Float32Array, 3); B.gear = cat(B.gear, M.gear, Float32Array, 3);
  for (const i of M.idx) B.idx.push(i + n0);
  B.n = N;
}

/**
 * Build the skinned geometry. Returns { geometry, geometryFar, faces (painter jobs), block, tris, trisFar }.
 * faces: the extras' prism faces (atlas rect + basis) and the body's triangle batches (atlas px + rest positions).
 * block: the face image ({ x, y, w, h, x0, y1, dens }).
 */
export function buildMesh(plan, opts) {
  const it = buildMeshJob(plan, opts);
  let r; while (!(r = it.next()).done);
  return r.value;
}
/** buildMesh a step at a time (a generator: yields between the heavy parts; src/people/prebuild.js). */
export function* buildMeshJob(plan, { gear = true, far = true } = {}) {
  const { P } = plan;
  // ---- the extras (prism segments) and the face block share the strips around the body square
  const faces = [];
  for (const s of plan.segs) for (const f of segFaces(s)) faces.push(f);
  const dens = Math.min(FACE_DENS, (ATLAS - BODY_PX - PAD * 2 - 1) / (P.hw * 2));
  const fd = Math.round(P.hw * 2 * dens) | 1;
  // (down to a little under the chin: the face front of the base mesh tucks under the jaw)
  const block = { w: fd, h: Math.ceil((P.crown - P.chin + 0.022) * (fd / (P.hw * 2))) + 1, x0: -P.hw, y1: P.crown, dens: fd / (P.hw * 2) };
  const blockRect = { w: block.w + PAD * 2, h: block.h + PAD * 2 };
  const swRect = { w: SWATCH.w + PAD * 2, h: SWATCH.h + PAD * 2 };
  // the extra garments' islands (a skirt...), sized in metres, scaled with the extras
  const isl = garmentIslands(plan.spec, P).map((g) => ({ ...g, r: { w: 0, h: 0 } }));
  const islSize = (g, scale) => { g.r.w = Math.max(8, Math.ceil(g.mw * 300 * scale)) + PAD * 2; g.r.h = Math.max(8, Math.ceil(g.mh * 300 * scale)) + PAD * 2; };

  const sizeAt = (f, scale) => {
    f.dens = 300 * scale * (f.seg.dens || 1) * (f.kind === 'side' ? 1 : 0.7);
    f.rect = { w: Math.max(1, Math.ceil((f.s1 - f.s0) * f.dens - 0.01)) + PAD * 2, h: Math.max(1, Math.ceil((f.r1 - f.r0) * f.dens - 0.01)) + PAD * 2 };
  };
  let area = 0;
  for (const f of faces) { sizeAt(f, 1); area += f.rect.w * f.rect.h; }
  for (const g of isl) { islSize(g, 1); area += g.r.w * g.r.h; }
  const free = ATLAS * ATLAS - (BODY_PX + PAD) ** 2;
  let scale = Math.min(1.2, Math.sqrt((free * 0.8 - blockRect.w * blockRect.h - swRect.w * swRect.h) / Math.max(area, 1)));
  for (let tries = 0; tries < 80; tries++) {
    const rects = [blockRect, swRect];
    for (const f of faces) { sizeAt(f, scale); rects.push(f.rect); }
    for (const g of isl) { islSize(g, scale); rects.push(g.r); }
    if (pack(rects)) break;
    scale *= 0.96;
  }
  block.x = blockRect.x + PAD; block.y = blockRect.y + PAD;
  block.rect = blockRect;
  const swatch = { x: swRect.x + PAD, y: swRect.y + PAD, w: SWATCH.w, h: SWATCH.h };
  plan.islands = Object.fromEntries(isl.map((g) => [g.key, { x: g.r.x + PAD, y: g.r.y + PAD, w: g.r.w - PAD * 2, h: g.r.h - PAD * 2 }]));
  // the hair's strand swatch: painted like a prism face (paint.js 'hairSwatch')
  const swJob = { seg: { part: 'swatch', mat: 'hairSwatch' }, kind: 'side', N: [0, 0, 1], dens: 1, rect: { x: swatch.x - PAD, y: swatch.y - PAD, w: swatch.w + PAD * 2, h: swatch.h + PAD * 2 },
    s0: -PAD, s1: swatch.w + PAD, r0: -PAD, r1: swatch.h + PAD, o: [0, 0, 0], U: [1, 0, 0], V: [0, -1, 0] };
  // ---- the body (near and far)
  plan.closedShoe = !!plan.spec.shoes && !!plan.spec.shoes.kind && plan.gear !== null && gear && CLOSED.has(plan.spec.shoes.kind);
  const near = fittedBody(plan, 'near', block, swatch);
  yield;
  const jobs = bodyJobs(near, block, P);
  const G = gear ? (plan.gear !== undefined ? plan.gear : buildGear(plan)) : null;
  const geometry = assemble(near, faces, block, G);
  let geometryFar = null;
  if (far) { yield; const fb = fittedBody(plan, 'far', block, swatch); yield; geometryFar = assemble(fb, faces.filter((f) => !f.seg.small), block, G); }
  return { geometry, geometryFar, faces: [...faces, swJob, ...jobs], block, swatch, tris: geometry.index.count / 3, trisFar: geometryFar ? geometryFar.index.count / 3 : 0 };
}
const CLOSED = new Set(['sneaker', 'platform', 'comfort', 'loafer', 'oxford', 'boots', 'tabi']);

/** Atlas px of a body vertex (face block: planar on x / y; the rest: the base UV square). */
function bodyUV(B, i, block, out) {
  if (B.flags[i] & 3) { out[0] = block.x + (B.pos[i * 3] - block.x0) * block.dens; out[1] = block.y + (block.y1 - B.pos[i * 3 + 1]) * block.dens; }
  else { out[0] = PAD + B.uv[i * 2] * (BODY_PX - PAD * 2); out[1] = PAD + B.uv[i * 2 + 1] * (BODY_PX - PAD * 2); }
  return out;
}

/** The body's painter jobs: triangles grouped by part (face-block triangles are the face painter's). */
function bodyJobs(B, block, P) {
  const groups = new Map();
  const vp = new Array(B.n);
  for (let i = 0; i < B.n; i++) vp[i] = B.vpart?.[i] || partOf(B.bi[i * 4], B.src[i], B.pos[i * 3], B.pos[i * 3 + 1], B.pos[i * 3 + 2], P);
  for (let t = 0; t < B.nTris * 3; t += 3) {
    const a = B.idx[t], b = B.idx[t + 1], c = B.idx[t + 2];
    if ((B.flags[a] & 3) && (B.flags[b] & 3) && (B.flags[c] & 3)) continue;
    const pa = vp[a], pb = vp[b], pc = vp[c];
    const p = pb[0] === pc[0] && pb[0] !== pa[0] ? pb : pa;
    const key = p[0] + '|' + p[1] + '|' + (p[2] || 0);
    let g = groups.get(key);
    if (!g) { g = { seg: pseg(p[0], p[1], p[2] || 0), kind: 'tris', N: [0, 0, 1], uv: [], p: [], n: [], dens: BODY_PX / 1.6 }; groups.set(key, g); }
    for (const i of [a, b, c]) {
      g.uv.push(B.apx[i * 2], B.apx[i * 2 + 1]);
      g.p.push(B.pos[i * 3], B.pos[i * 3 + 1], B.pos[i * 3 + 2]);
      g.n.push(B.nrm[i * 3], B.nrm[i * 3 + 1], B.nrm[i * 3 + 2]);
    }
  }
  return [...groups.values()];
}

/** One BufferGeometry: fitted body + prism extras + gear. */
function assemble(B, faces, block, G) {
  const pos = [], nrm = [], uv = [], si = [], sw = [], idx = [];
  for (let i = 0; i < B.n; i++) {
    pos.push(B.pos[i * 3], B.pos[i * 3 + 1], B.pos[i * 3 + 2]);
    nrm.push(B.nrm[i * 3], B.nrm[i * 3 + 1], B.nrm[i * 3 + 2]);
    uv.push(B.apx[i * 2] / ATLAS, 1 - B.apx[i * 2 + 1] / ATLAS);
    for (let k = 0; k < 4; k++) { si.push(B.bi[i * 4 + k]); sw.push(B.bw[i * 4 + k]); }
  }
  for (const i of B.idx) idx.push(i);
  const emit = (f, mirror) => {
    const base = pos.length / 3;
    const bone = BONE_INDEX[mirror ? f.seg.bone.replace(/L$/, 'R') : f.seg.bone];
    for (const p of f.pts) {
      const d = sub(p, f.o);
      const U = f.rect.x + PAD + (dot(d, f.U) - f.s0) * f.dens, Vv = f.rect.y + PAD + (f.r1 - dot(d, f.V)) * f.dens;
      pos.push(mirror ? -p[0] : p[0], p[1], p[2]);
      nrm.push(mirror ? -f.N[0] : f.N[0], f.N[1], f.N[2]);
      uv.push(U / ATLAS, 1 - Vv / ATLAS);
      si.push(bone, 0, 0, 0); sw.push(1, 0, 0, 0);
    }
    for (let i = 0; i < f.tris.length; i += 3) {
      if (mirror) idx.push(base + f.tris[i], base + f.tris[i + 2], base + f.tris[i + 1]);
      else idx.push(base + f.tris[i], base + f.tris[i + 1], base + f.tris[i + 2]);
    }
  };
  for (const f of faces) { emit(f, false); if (f.seg.mirror) emit(f, true); }
  const nBody = pos.length / 3, nAll = nBody + (G ? G.pos.length / 3 : 0);
  const col = new Float32Array(nAll * 3).fill(1, 0, nBody * 3), gr = new Float32Array(nAll * 3);
  if (B.col) { col.set(B.col); gr.set(B.gear); } // vertex-coloured hair ties / bands
  if (G) {
    for (let i = 0; i < G.pos.length; i++) { pos.push(G.pos[i]); nrm.push(G.nrm[i]); }
    for (let i = 0; i < G.uv.length; i++) uv.push(G.uv[i]);
    col.set(G.col, nBody * 3); gr.set(G.gear, nBody * 3);
    for (const b of G.bone) { si.push(b, 0, 0, 0); sw.push(1, 0, 0, 0); }
    for (const i of G.idx) idx.push(i + nBody);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('gear', new THREE.BufferAttribute(gr, 3));
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  g.setIndex(nAll > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
  return g;
}
