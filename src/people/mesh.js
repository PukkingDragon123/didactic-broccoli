// Turns a body plan into one skinned BufferGeometry with a packed texture atlas (1 draw call a person).
// Two kinds of surface:
//  - tubes (src/people/anatomy.js, hair.js): smooth lofted anatomy, rings of N points along a path, blended skin
//    weights per ring, smooth normals. Each tube owns one rectangular atlas island unwrapped cylindrically (u around,
//    v along), sized from the longest edge of every column / row so texels stay roughly square. A far level of detail
//    reuses the same islands with every other side / ring, so both levels share the atlas.
//  - segments (acc.js: bags, boxes, phones): the old chamfered prisms, every face its own planar texel rectangle.
// The head's front faces (tubes / segments marked block:'face') share one planar 'face block' so the face is painted
// as a single image (src/people/face.js). Painters receive, per texel, the rest-pose surface point and normal.
import * as THREE from 'three';
import { BONE_INDEX } from './body.js';

export const ATLAS = 512; // px; a person's whole atlas (1 MB). Texel density ~3 mm on the body, ~1.3 mm on the face
const FACE_DENS = 760; // px per metre on the face block
const PAD = 1;
const BASE_DENS = 560; // px per metre before the packer scales everything down to fit

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
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Faces of one segment (rest pose) with their outward normal and an in-plane basis (U right, V up). */
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

// ------------------------------------------------------------------ detail pass
// The owner's model, a little more detailed (same rig, same proportions, same atlas layout rules): every tube gets more
// sides and, on its longer spans, more rings, interpolated through the authored vertices (centripetal Catmull-Rom round
// each ring and along each column), so the authored silhouette stays where it was and the new vertices round it off
// between. Skin weights of new rings blend their neighbours'. The far level of detail keeps only the authored rings and
// about the authored sides (as before). part: [sides x, rings added per long span, span length (m) that earns one]
const DETAIL = {
  torso: [1.75, 1, 0.045], neck: [1.5, 0, 1], collar: [1.4, 0, 1], arm: [1.67, 1, 0.06], leg: [1.72, 1, 0.07],
  head: [1.5, 1, 0.035], nose: [1.34, 0, 1], ear: [1, 0, 1], palm: [1.34, 0, 1], fingers: [1.5, 0, 1], thumb: [1.5, 0, 1],
  foot: [1.34, 0, 1], sole: [1.5, 0, 1], heel: [1.5, 0, 1], skirt: [1.5, 1, 0.08],
  hairShell: [1.5, 1, 0.04], tail: [1.34, 1, 0.05], bun: [1.5, 0, 1], quiff: [1.5, 0, 1], spike: [1, 0, 1], tuft: [1, 0, 1],
  hatCrown: [1.5, 1, 0.03], brim: [1.6, 0, 1], visor: [1, 0, 1], headband: [1.3, 0, 1],
};
/** Catmull-Rom (centripetal) point between p1 and p2 at t, with neighbours p0, p3. */
function crPoint(p0, p1, p2, p3, t, out) {
  const d01 = Math.sqrt(dist(p0, p1)) || 1e-4, d12 = Math.sqrt(dist(p1, p2)) || 1e-4, d23 = Math.sqrt(dist(p2, p3)) || 1e-4;
  if (dist(p1, p2) < 1e-7) { out[0] = p1[0]; out[1] = p1[1]; out[2] = p1[2]; return out; }
  for (let i = 0; i < 3; i++) {
    // tangents (Barry-Goldman, scaled to the p1..p2 span)
    const m1 = (p1[i] - p0[i]) / d01 - (p2[i] - p0[i]) / (d01 + d12) + (p2[i] - p1[i]) / d12;
    const m2 = (p2[i] - p1[i]) / d12 - (p3[i] - p1[i]) / (d12 + d23) + (p3[i] - p2[i]) / d23;
    const a = m1 * d12, b = m2 * d12, t2 = t * t, t3 = t2 * t;
    out[i] = (2 * t3 - 3 * t2 + 1) * p1[i] + (t3 - 2 * t2 + t) * a + (-2 * t3 + 3 * t2) * p2[i] + (t3 - t2) * b;
  }
  return out;
}
const blendW = (wa, wb, t) => {
  const m = new Map();
  for (const [b, w] of wa || []) m.set(b, (m.get(b) || 0) + w * (1 - t));
  for (const [b, w] of wb || []) m.set(b, (m.get(b) || 0) + w * t);
  const e = [...m].filter((x) => x[1] > 1e-4).sort((x, y) => y[1] - x[1]).slice(0, 4), s = e.reduce((a, x) => a + x[1], 0) || 1;
  return e.map(([b, w]) => [b, w / s]);
};
/** More sides and rings for tube t (once; see DETAIL). Marks t.N0 (the authored sides) and the new rings `sub`. */
function refineTube(t) {
  if (t.refined) return;
  t.refined = true;
  const D = DETAIL[t.part] || [1, 0, 1], m = D[0];
  let R = t.rings;
  const N0 = R[0].pts.length;
  const N1 = Math.max(N0, Math.round(N0 * m));
  t.N0 = N0;
  if (N1 > N0) {
    // N1 points evenly in the ring's curve parameter (the authored points where it lands on whole numbers)
    R = R.map((rg) => {
      const P = rg.pts, pts = [];
      for (let i = 0; i < N1; i++) {
        const u = (i * N0) / N1, k = Math.floor(u + 1e-9), f = u - k;
        pts.push(f < 1e-6 ? P[k % N0] : crPoint(P[(k + N0 - 1) % N0], P[k % N0], P[(k + 1) % N0], P[(k + 2) % N0], f, [0, 0, 0]));
      }
      return { ...rg, pts };
    });
  }
  const N = R[0].pts.length;
  if (D[1] > 0 && R.length > 1) {
    const out = [];
    for (let r = 0; r < R.length - 1; r++) {
      const A = R[r], B = R[r + 1], A0 = R[Math.max(0, r - 1)], B1 = R[Math.min(R.length - 1, r + 2)];
      out.push(A);
      let len = 0;
      for (let k = 0; k < N; k++) len = Math.max(len, dist(A.pts[k], B.pts[k]));
      const n = Math.min(D[1], Math.floor(len / D[2]));
      for (let j = 1; j <= n; j++) {
        const s = j / (n + 1), pts = [];
        for (let k = 0; k < N; k++) pts.push(crPoint(A0.pts[k], A.pts[k], B.pts[k], B1.pts[k], s, [0, 0, 0]));
        const c = A.c && B.c ? crPoint(A0.c || A.c, A.c, B.c, B1.c || B.c, s, [0, 0, 0]) : pts.reduce((o, p) => [o[0] + p[0] / N, o[1] + p[1] / N, o[2] + p[2] / N], [0, 0, 0]);
        out.push({ pts, c, w: blendW(A.w, B.w, s), sub: true });
      }
    }
    out.push(R[R.length - 1]);
    R = out;
  }
  t.rings = R;
  t.N = N;
}

// ------------------------------------------------------------------ tubes
/**
 * Prepare a tube: smooth vertex normals, cumulative u / v lengths (metres) for its island, winding.
 * t.rings: [{ pts: [[x, y, z] x N], c: [x, y, z] (ring centre), w: [[bone, weight]...] }] (all rings the same N).
 */
function prepTube(t) {
  const R = t.rings, N = R[0].pts.length, closed = t.closed !== false;
  const nc = closed ? N : N - 1;
  // column widths (max over rings) and row heights (max over columns)
  const cu = new Float64Array(nc), cv = new Float64Array(R.length - 1);
  for (let k = 0; k < nc; k++) { let m = 0; for (const r of R) m = Math.max(m, dist(r.pts[k], r.pts[(k + 1) % N])); cu[k] = Math.max(m, 1e-4); }
  for (let r = 0; r < R.length - 1; r++) { let m = 0; for (let k = 0; k < N; k++) m = Math.max(m, dist(R[r].pts[k], R[r + 1].pts[k])); cv[r] = Math.max(m, 1e-4); }
  t.U = new Float64Array(nc + 1); t.V = new Float64Array(R.length);
  for (let k = 0; k < nc; k++) t.U[k + 1] = t.U[k] + cu[k];
  for (let r = 0; r < R.length - 1; r++) t.V[r + 1] = t.V[r] + cv[r];
  // smooth normals: central differences on the grid, oriented away from the ring centre
  t.nrm = R.map((rg, r) => rg.pts.map((p, k) => {
    const pa = R[Math.max(0, r - 1)], pb = R[Math.min(R.length - 1, r + 1)];
    const kl = closed ? (k + N - 1) % N : Math.max(0, k - 1), kr = closed ? (k + 1) % N : Math.min(N - 1, k + 1);
    let du = sub(rg.pts[kr], rg.pts[kl]);
    let dv = sub(pb.pts[k], pa.pts[k]);
    if (Math.hypot(...du) < 1e-7) du = sub(pb.pts[kr], pb.pts[kl]).map((x, i) => x + sub(pa.pts[kr], pa.pts[kl])[i]);
    let n = cross(du, dv);
    const out = sub(p, rg.c);
    if (Math.hypot(...n) < 1e-9) n = Math.hypot(...out) > 1e-6 ? out : sub(rg.c, (r > 0 ? R[r - 1] : R[r + 1]).c).map((x) => (r > 0 ? x : -x));
    n = norm(n);
    if (Math.hypot(...out) > 1e-6 && dot(n, out) < 0) n = n.map((x) => -x);
    else if (Math.hypot(...out) <= 1e-6) { const ax = sub(rg.c, (r > 0 ? R[r - 1] : R[r + 1]).c); if (dot(n, r > 0 ? ax : ax.map((x) => -x)) < 0) n = n.map((x) => -x); }
    return n;
  }));
  if (t.normalFix) for (let r = 0; r < R.length; r++) for (let k = 0; k < N; k++) t.nrm[r][k] = t.normalFix(t.nrm[r][k], R[r].pts[k], r, k);
  // winding: compare a quad's geometric normal with the smooth normals (pick the biggest quad)
  let best = -1, flip = false;
  for (let r = 0; r < R.length - 1; r++) for (let k = 0; k < nc; k++) {
    const a = R[r].pts[k], b = R[r].pts[(k + 1) % N], d = R[r + 1].pts[k];
    const g = cross(sub(b, a), sub(d, a)), l = Math.hypot(...g);
    if (l > best) { best = l; flip = dot(g, t.nrm[r][k]) < 0; }
  }
  t.flip = flip; t.N = N; t.nc = nc; t.s0 = 0;
}

/** Skyline bottom-left packing of rectangles ({w, h}) into size x size; returns false on overflow. */
function pack(rects, size) {
  const sky = new Int16Array(size);
  const order = [...rects].sort((a, b) => b.h - a.h || b.w - a.w);
  for (const r of order) {
    if (r.w > size) return false;
    let bx = -1, by = 1e9;
    for (let x = 0; x + r.w <= size; x++) {
      const left = x === 0 || sky[x] !== sky[x - 1];
      const right = x + r.w === size || sky[x + r.w] !== sky[x + r.w - 1];
      if (!left && !right) continue;
      let y = 0;
      for (let i = x; i < x + r.w; i++) if (sky[i] > y) { y = sky[i]; if (y >= by) break; }
      if (y < by) { by = y; bx = x; }
    }
    if (by + r.h > size) return false;
    r.x = bx; r.y = by;
    for (let i = bx; i < bx + r.w; i++) sky[i] = by + r.h;
  }
  return true;
}

/** Island position (atlas px) of tube vertex (ring r, column k). */
const tubeUV = (t, r, k) => [t.rect.x + PAD + t.Up[k], t.rect.y + PAD + (t.Vp[t.Vp.length - 1] - t.Vp[r])];
/** Cumulative metres -> whole texels: every ring / column boundary lands on a texel edge (crisp hems and seams), and every
 *  non-empty span gets at least one texel. */
function snapPx(a, dens) {
  const o = new Int32Array(a.length);
  for (let i = 1; i < a.length; i++) o[i] = Math.max(o[i - 1] + (a[i] - a[i - 1] > 1e-6 ? 1 : 0), Math.round(a[i] * dens));
  return o;
}
/** Find the span of a snapped array holding pixel coordinate x: [index, fraction]. */
function spanAt(px, x) {
  let k = 0;
  const n = px.length - 1;
  while (k < n - 1 && px[k + 1] <= x) k++;
  const w = px[k + 1] - px[k];
  return [k, w > 0 ? Math.min(1, Math.max(0, (x - px[k]) / w)) : 0];
}

/**
 * Build the skinned geometry. Returns { geometry, geometryFar, faces, block, tris, trisFar, atlas }: faces (segment faces
 * and tubes) carry their atlas rect so painters can walk texels (see walkTexels); block describes the face image
 * ({ x, y, w, h, x0, y1, dens }).
 */
export function buildMesh(plan, size = ATLAS) {
  const { P } = plan;
  const faces = [], tubes = [];
  for (const s of plan.segs) {
    if (s.tube) { refineTube(s); prepTube(s); tubes.push(s); faces.push(s); } else for (const f of segFaces(s)) faces.push(f);
  }
  // face block: front-facing parts of the head, planar-projected on x / y (a margin round the head's width / height)
  const fdens = FACE_DENS * size / 512;
  const fx = P.hw * 1.12, fd = Math.round(fx * 2 * fdens) | 1;
  const dens = fd / (fx * 2);
  const block = { w: fd, h: Math.ceil((P.crown + 0.03 * P.hu - (P.chin - 0.05 * P.hu)) * dens) + 1, x0: -fx, y1: P.crown + 0.03 * P.hu, dens };
  const loose = [];
  for (const f of faces) {
    if (!f.tube && f.seg.block === 'face' && f.kind !== 'bot' && f.N[2] > 0.45) { f.block = true; continue; }
    loose.push(f);
  }
  const blockRect = { w: block.w + PAD * 2, h: block.h + PAD * 2 };
  const sizeAt = (f, scale) => {
    if (f.tube) {
      f.dens = BASE_DENS * scale * (f.dens0 || 1);
      f.Up = snapPx(f.U, f.dens); f.Vp = snapPx(f.V, f.dens);
      f.rect = { w: Math.max(2, f.Up[f.nc]) + PAD * 2, h: Math.max(2, f.Vp[f.Vp.length - 1]) + PAD * 2 };
      return;
    }
    f.dens = BASE_DENS * scale * (f.seg.dens || 1) * (f.seg.mat === 'head' || f.seg.mat === 'ear' ? 1.2 : 1) * (f.kind === 'side' ? 1 : 0.7);
    f.rect = { w: Math.max(1, Math.ceil((f.s1 - f.s0) * f.dens - 0.01)) + PAD * 2, h: Math.max(1, Math.ceil((f.r1 - f.r0) * f.dens - 0.01)) + PAD * 2 };
  };
  for (const t of tubes) t.dens0 = t.dens0 ?? t.dens ?? 1;
  let area = 0;
  for (const f of loose) { sizeAt(f, 1); area += f.rect.w * f.rect.h; }
  let scale = Math.min(1.2, Math.sqrt((size * size * 0.84 - blockRect.w * blockRect.h) / area));
  for (let tries = 0; tries < 80; tries++) {
    const rects = [blockRect];
    for (const f of loose) { sizeAt(f, scale); rects.push(f.rect); }
    if (pack(rects, size)) break;
    scale *= 0.98;
  }
  block.x = blockRect.x + PAD; block.y = blockRect.y + PAD;
  block.rect = blockRect;
  for (const t of tubes) { t.s1 = t.U[t.nc] ; t.rh = t.V[t.V.length - 1]; }
  const near = emit(plan, faces, tubes, block, size, 1);
  const far = emit(plan, faces, tubes, block, size, 2);
  return { geometry: near.g, geometryFar: far.g, faces: loose, block, tris: near.tris, trisFar: far.tris, atlas: size, scale };
}

function emit(plan, faces, tubes, block, size, lod) {
  const pos = [], nrm = [], uv = [], si = [], sw = [], idx = [];
  const blockUV = (p) => [block.x + (p[0] - block.x0) * block.dens, block.y + (block.y1 - p[1]) * block.dens];
  const pushV = (p, n, U, V, w, mirror) => {
    pos.push(mirror ? -p[0] : p[0], p[1], p[2]);
    nrm.push(mirror ? -n[0] : n[0], n[1], n[2]);
    uv.push(U / size, 1 - V / size);
    for (let i = 0; i < 4; i++) {
      const e = w[i];
      si.push(e ? BONE_INDEX[mirror ? e[0].replace(/L$/, 'R') : e[0]] : 0);
      sw.push(e ? e[1] : 0);
    }
    return pos.length / 3 - 1;
  };
  const tri = (a, b, c, mirror) => { if (mirror) idx.push(a, c, b); else idx.push(a, b, c); };
  // --- segments
  if (lod === 1 || true) for (const f of faces) {
    if (f.tube || (lod > 1 && f.seg.lod0)) continue;
    for (const mirror of f.seg.mirror ? [false, true] : [false]) {
      const base = pos.length / 3, w = [[f.seg.bone, 1]];
      for (const p of f.pts) {
        let U, Vv;
        if (f.block) [U, Vv] = blockUV(p);
        else { const d = sub(p, f.o); U = f.rect.x + PAD + (dot(d, f.U) - f.s0) * f.dens; Vv = f.rect.y + PAD + (f.r1 - dot(d, f.V)) * f.dens; }
        pushV(p, f.N, U, Vv, w, mirror);
      }
      for (let i = 0; i < f.tris.length; i += 3) tri(base + f.tris[i], base + f.tris[i + 1], base + f.tris[i + 2], mirror);
    }
  }
  // --- tubes
  for (const t of tubes) {
    if (lod > 1 && t.lod0) continue; // near-only detail
    const R = t.rings, N = t.N, closed = t.closed !== false;
    // which rings / columns this level keeps (far: every other, ends and marked landmarks always)
    // (the far level: the authored rings and sides only, then every other one as before the detail pass)
    const step = lod > 1 ? (t.lodStep ?? 2) : 1;
    const rows = [], cols = [];
    for (let r = 0, o = 0; r < R.length; r++) {
      if (lod > 1 && R[r].sub) continue;
      if (step === 1 || r === 0 || r === R.length - 1 || R[r].keep || o % step === 0) rows.push(r);
      o++;
    }
    const N0 = t.N0 ?? N, kStep = lod > 1 ? Math.max(1, Math.round(N / (N0 >= (t.lodMinN ?? 8) ? N0 / 2 : N0))) : 1;
    for (let k = 0; k <= t.nc; k += kStep) cols.push(k);
    if (cols[cols.length - 1] !== t.nc) cols.push(t.nc);
    for (const mirror of t.mirror ? [false, true] : [false]) {
      const vid = new Map();
      const vert = (r, k) => {
        const key = r * 1000 + k;
        let v = vid.get(key);
        if (v === undefined) { const [U, V] = tubeUV(t, r, k); v = pushV(R[r].pts[k % N], t.nrm[r][k % N], U, V, R[r].w, mirror); vid.set(key, v); }
        return v;
      };
      const bvid = new Map();
      const bvert = (r, k) => {
        const key = r * 1000 + k;
        let v = bvid.get(key);
        if (v === undefined) { const p = R[r].pts[k % N]; const [U, V] = blockUV(p); v = pushV(p, t.nrm[r][k % N], U, V, R[r].w, mirror); bvid.set(key, v); }
        return v;
      };
      for (let ri = 0; ri < rows.length - 1; ri++) {
        const r0 = rows[ri], r1 = rows[ri + 1];
        for (let ci = 0; ci < cols.length - 1; ci++) {
          const k0 = cols[ci], k1 = cols[ci + 1];
          const pa = R[r0].pts[k0 % N], pb = R[r0].pts[k1 % N], pc = R[r1].pts[k1 % N], pd = R[r1].pts[k0 % N];
          const degBot = dist(pa, pb) < 1e-7, degTop = dist(pc, pd) < 1e-7;
          if (degBot && degTop) continue;
          let V = vert;
          if (t.block === 'face') {
            const nz = t.nrm[r0][k0 % N][2] + t.nrm[r0][k1 % N][2] + t.nrm[r1][k0 % N][2] + t.nrm[r1][k1 % N][2];
            const ny = t.nrm[r0][k0 % N][1] + t.nrm[r0][k1 % N][1] + t.nrm[r1][k0 % N][1] + t.nrm[r1][k1 % N][1];
            if (nz / 4 > (t.blockNz ?? 0.45) && ny / 4 > (t.blockNy ?? -0.7)) V = bvert;
          }
          const a = V(r0, k0), b = V(r0, k1), c = V(r1, k1), d = V(r1, k0);
          const f = t.flip !== mirror;
          if (!degBot) { if (f) idx.push(a, c, b); else idx.push(a, b, c); }
          if (!degTop) { if (f) idx.push(a, d, c); else idx.push(a, c, d); }
        }
      }
      // inner (back-facing) copy for single-sheet surfaces seen from both sides (hair curtains, brims)
      if (t.double) {
        const base = new Map();
        const ivert = (r, k) => {
          const key = r * 1000 + k;
          let v = base.get(key);
          if (v === undefined) {
            const p = R[r].pts[k % N], n = t.nrm[r][k % N], o = t.double;
            const [U, V] = tubeUV(t, r, k);
            v = pushV([p[0] - n[0] * o, p[1] - n[1] * o, p[2] - n[2] * o], [-n[0], -n[1], -n[2]], U, V, R[r].w, mirror);
            base.set(key, v);
          }
          return v;
        };
        for (let ri = 0; ri < rows.length - 1; ri++) {
          const r0 = rows[ri], r1 = rows[ri + 1];
          for (let ci = 0; ci < cols.length - 1; ci++) {
            const k0 = cols[ci], k1 = cols[ci + 1];
            if (t.doubleCols && !t.doubleCols(k0, k1)) continue;
            const a = ivert(r0, k0), b = ivert(r0, k1), c = ivert(r1, k1), d = ivert(r1, k0);
            const f = t.flip === mirror;
            if (dist(R[r0].pts[k0 % N], R[r0].pts[k1 % N]) > 1e-7) { if (f) idx.push(a, c, b); else idx.push(a, b, c); }
            if (dist(R[r1].pts[k0 % N], R[r1].pts[k1 % N]) > 1e-7) { if (f) idx.push(a, d, c); else idx.push(a, c, d); }
          }
        }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  g.setIndex(idx);
  return { g, tris: idx.length / 3 };
}

// ------------------------------------------------------------------ texel walking (painters, retouch)
const TAU = Math.PI * 2, Q = Math.PI / 2;
/** A fresh painter cursor (see walkTexels). */
export const cursor = () => ({ x: 0, y: 0, z: 0, i: 0, j: 0, f: null, seg: null, part: '', nx: 0, ny: 0, nz: 0, px: 0, kind: '', e: 0, rb: 0, rt: 0, rh: 0, lu: 0, lt: 0, tube: false });

/**
 * Walk every texel of one face / tube island: sets the cursor c (rest-pose point x, y, z; normal nx, ny, nz; part; kind
 * 'side' | 'top' | 'bot'; e: -1..1 across the face (tubes: the angle to the nearest of front / side / back); rb / rt / rh:
 * distance from the bottom / top edge, height (metres, along the surface); px: texel size; i, j: atlas texel; tubes also lu
 * (0..1 around) and lt (0..1 from the first ring to the last)) and calls fn(c). A generator: yields every ~1200 texels.
 */
export function* walkTexels(f, c, fn) {
  let run = 0;
  c.f = f; c.px = 1 / f.dens;
  if (f.tube) {
    const t = f, R = t.rings, N = t.N, W = t.rect.w, Hh = t.rect.h, Ut = t.U[t.nc], Vt = t.V[t.V.length - 1];
    c.seg = t; c.tube = true; c.rh = Vt;
    // per column: k, fa; per row: r, ft (in snapped texels)
    const ck = new Int32Array(W), cf = new Float32Array(W), cu = new Float32Array(W), Upn = t.Up[t.nc], Vpn = t.Vp[t.Vp.length - 1];
    for (let i = 0; i < W; i++) {
      const [k, fa] = spanAt(t.Up, Math.min(Upn, Math.max(0, i - PAD + 0.5)));
      ck[i] = k; cf[i] = fa; cu[i] = (t.U[k] + fa * (t.U[k + 1] - t.U[k])) / Ut;
    }
    for (let j = 0; j < Hh; j++) {
      if (run >= 1200) { run = 0; yield null; }
      run += W;
      const [r, ft] = spanAt(t.Vp, Math.min(Vpn, Math.max(0, Vpn - (j - PAD + 0.5))));
      const v = t.V[r] + ft * (t.V[r + 1] - t.V[r]);
      c.rb = v; c.rt = Vt - v; c.lt = v / Vt;
      const A = R[r].pts, B = R[r + 1].pts, NA = t.nrm[r], NB = t.nrm[r + 1];
      for (let i = 0; i < W; i++) {
        const k = ck[i], k2 = (k + 1) % N, fa = cf[i];
        const w00 = (1 - fa) * (1 - ft), w10 = fa * (1 - ft), w01 = (1 - fa) * ft, w11 = fa * ft;
        const a = A[k], b = A[k2], d = B[k], e = B[k2];
        c.x = a[0] * w00 + b[0] * w10 + d[0] * w01 + e[0] * w11;
        c.y = a[1] * w00 + b[1] * w10 + d[1] * w01 + e[1] * w11;
        c.z = a[2] * w00 + b[2] * w10 + d[2] * w01 + e[2] * w11;
        const na = NA[k], nb = NA[k2], nd = NB[k], ne = NB[k2];
        let nx = na[0] * w00 + nb[0] * w10 + nd[0] * w01 + ne[0] * w11, ny = na[1] * w00 + nb[1] * w10 + nd[1] * w01 + ne[1] * w11, nz = na[2] * w00 + nb[2] * w10 + nd[2] * w01 + ne[2] * w11;
        const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        c.nx = nx /= l; c.ny = ny /= l; c.nz = nz /= l;
        c.kind = ny > 0.75 ? 'top' : ny < -0.75 ? 'bot' : 'side';
        const ang = Math.atan2(nx, nz);
        c.e = (ang - Math.round(ang / Q) * Q) / (Q / 2);
        c.lu = cu[i];
        c.i = t.rect.x + i; c.j = t.rect.y + j;
        c.part = t.partAt ? t.partAt(c) : t.part;
        fn(c);
      }
    }
    return;
  }
  c.seg = f.seg; c.tube = false; c.part = f.seg.part; c.nx = f.N[0]; c.ny = f.N[1]; c.nz = f.N[2]; c.kind = f.kind;
  const Rr = f.rect, sw = f.s1 - f.s0, rh = f.r1 - f.r0;
  c.rh = rh;
  for (let j = 0; j < Rr.h; j++) {
    if (run >= 1200) { run = 0; yield null; }
    run += Rr.w;
    const r = f.r1 - (j - 0.5) / f.dens;
    for (let i = 0; i < Rr.w; i++) {
      const s = f.s0 + (i - 0.5) / f.dens;
      c.x = f.o[0] + f.U[0] * s + f.V[0] * r; c.y = f.o[1] + f.U[1] * s + f.V[1] * r; c.z = f.o[2] + f.U[2] * s + f.V[2] * r;
      c.i = Rr.x + i; c.j = Rr.y + j;
      c.e = sw > 0 ? ((s - f.s0) / sw) * 2 - 1 : 0;
      c.rb = r - f.r0; c.rt = f.r1 - r; c.lu = c.e * 0.5 + 0.5; c.lt = rh > 0 ? c.rb / rh : 0;
      fn(c);
    }
  }
}
void TAU;

/** The cursor at one texel (i, j: atlas px) of face / tube f (same fields as walkTexels); returns false outside it. */
export function texelAt(f, c, i, j) {
  const R = f.rect;
  if (i < R.x || j < R.y || i >= R.x + R.w || j >= R.y + R.h) return false;
  c.f = f; c.px = 1 / f.dens; c.i = i; c.j = j;
  if (!f.tube) {
    c.seg = f.seg; c.tube = false; c.part = f.seg.part; c.nx = f.N[0]; c.ny = f.N[1]; c.nz = f.N[2]; c.kind = f.kind;
    const sw = f.s1 - f.s0, rh = f.r1 - f.r0, r = f.r1 - (j - R.y - 0.5) / f.dens, s = f.s0 + (i - R.x - 0.5) / f.dens;
    c.x = f.o[0] + f.U[0] * s + f.V[0] * r; c.y = f.o[1] + f.U[1] * s + f.V[1] * r; c.z = f.o[2] + f.U[2] * s + f.V[2] * r;
    c.e = sw > 0 ? ((s - f.s0) / sw) * 2 - 1 : 0; c.rb = r - f.r0; c.rt = f.r1 - r; c.rh = rh; c.lu = c.e * 0.5 + 0.5; c.lt = rh > 0 ? c.rb / rh : 0;
    return true;
  }
  const t = f, Rg = t.rings, N = t.N, Ut = t.U[t.nc], Vt = t.V[t.V.length - 1];
  const Upn = t.Up[t.nc], Vpn = t.Vp[t.Vp.length - 1];
  const [k, fa] = spanAt(t.Up, Math.min(Upn, Math.max(0, i - R.x - PAD + 0.5)));
  const [r, ft] = spanAt(t.Vp, Math.min(Vpn, Math.max(0, Vpn - (j - R.y - PAD + 0.5))));
  const u = t.U[k] + fa * (t.U[k + 1] - t.U[k]), v = t.V[r] + ft * (t.V[r + 1] - t.V[r]), k2 = (k + 1) % N;
  const w00 = (1 - fa) * (1 - ft), w10 = fa * (1 - ft), w01 = (1 - fa) * ft, w11 = fa * ft;
  const A = Rg[r].pts, B = Rg[r + 1].pts, NA = t.nrm[r], NB = t.nrm[r + 1];
  const P3 = [0, 1, 2].map((m) => A[k][m] * w00 + A[k2][m] * w10 + B[k][m] * w01 + B[k2][m] * w11);
  const N3 = [0, 1, 2].map((m) => NA[k][m] * w00 + NA[k2][m] * w10 + NB[k][m] * w01 + NB[k2][m] * w11);
  const l = Math.hypot(N3[0], N3[1], N3[2]) || 1;
  c.seg = t; c.tube = true; c.rh = Vt; c.rb = v; c.rt = Vt - v; c.lt = v / Vt; c.lu = u / Ut;
  c.x = P3[0]; c.y = P3[1]; c.z = P3[2]; c.nx = N3[0] / l; c.ny = N3[1] / l; c.nz = N3[2] / l;
  c.kind = c.ny > 0.75 ? 'top' : c.ny < -0.75 ? 'bot' : 'side';
  const ang = Math.atan2(c.nx, c.nz); c.e = (ang - Math.round(ang / Q) * Q) / (Q / 2);
  c.part = t.partAt ? t.partAt(c) : t.part;
  return true;
}
