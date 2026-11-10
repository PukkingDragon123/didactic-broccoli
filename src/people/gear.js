// The street people's own hats, glasses, bags and shoes (spec.hat / spec.glasses / spec.acc / spec.shoes), modelled with
// the people kit (src/peoplekit/kit.js: lathes, washers, tubes, slabs, stitches) and merged into the person's own skinned
// mesh, so a person stays one draw call: buildMesh (src/people/mesh.js) appends these triangles rigidly skinned to their
// bones, and HumanMaterial draws them with their vertex colours, per-vertex roughness / metalness and the kit's cloth
// grain instead of the painted atlas.
//   hats    the cap, flat cap, bucket hat, sun hat, school hat and hard hat, in head units (the kit's head frame: chin -4,
//           eyes 6, brows 8, crown 16; scaled to the person's head like src/people/cosmetics.js), on the head bone
//   glasses round / rect specs and aviators: rims, bridge, hinges, temples (clear lenses stay a painted tint on the
//           face, dark lenses are modelled), on the head bone
//   bags    briefcase, handbag, eco bag (+ leek), tote, shoulder bag, camera, backpack (+ poster), randoseru, pouch, in
//           metres, on the hand / bag / chest / hips bones as before
//   shoes   sneaker, platform, comfort, loafer, oxford, pumps, sandal, boots, tabi: a shoe last round the foot (sole,
//           upper, collar, tongue, laces, toe caps, heels), the right one mirrored, on the foot (and shin) bones
// Built pieces are cached by kind and colour in their own frame; per person only the transform is applied.
//   const G = buildGear(plan) -> { pos, nrm, uv, col, gear, bone } | null      (plan: buildPlan(spec), with plan.spec)
//   new HumanMaterial({ map, roughness, ... })                                  the people's material (one program)
import * as THREE from 'three';
import { Kit, MAT, oval, smooth, shade, mix, v3, kitMaterials } from '../peoplekit/kit.js';
import { BONE_INDEX } from './body.js';

const TAU = Math.PI * 2;
const hexOf = (c) => (Array.isArray(c) ? ((c[0] & 255) << 16) | ((c[1] & 255) << 8) | (c[2] & 255) : c);
const lum = (c) => (((c >> 16) & 255) * 0.3 + ((c >> 8) & 255) * 0.59 + (c & 255) * 0.11) / 255;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const INK = 0x2a2226, BRASS = 0xc8a050, STEEL = 0xb8bcc4;

/** Kinds this module models (everything else stays a painted segment). */
export const GEAR_HATS = new Set(['cap', 'flatcap', 'bucket', 'sunhat', 'schoolhat', 'hardhat']);
export const GEAR_BAGS = new Set(['briefcase', 'handbag', 'ecobag', 'tote', 'shoulderbag', 'camera', 'backpack', 'randoseru', 'pouch']);
/** Shoes that enclose the foot (the foot box shrinks to an ankle inside them); sandals and pumps show the foot. */
export const CLOSED_SHOES = new Set(['sneaker', 'platform', 'comfort', 'loafer', 'oxford', 'boots', 'tabi']);
/** Shoes that show the foot: the foot itself is modelled too (skin, socks or tights). */
export const OPEN_SHOES = new Set(['sandal', 'pumps']);
const SHAFT = { boots: 0.035, tabi: 0.08 }; // boot tops: ankle + k * height

// ------------------------------------------------------------------ material table: [roughness, metalness, grain]
const RM = [];
{
  const T = { cloth: [0.92, 0, 1], knit: [0.96, 0, 1.5], straw: [0.86, 0, 1.4], paper: [0.92, 0, 0.9], card: [0.9, 0, 1], plastic: [0.45, 0, 0.35],
    gloss: [0.32, 0, 0.15], metal: [0.32, 1, 0.3], rubber: [0.78, 0, 0.5], matte: [0.75, 0, 0], eye: [0.12, 0.2, 0], leather: [0.5, 0, 0.6],
    wood: [0.7, 0, 1.1], fur: [0.97, 0, 1.2], soft: [0.82, 0, 0.6] };
  for (const [k, i] of Object.entries(MAT)) RM[i] = T[k] || null; // glass: not drawn (clear lenses are painted on the face)
}

// ------------------------------------------------------------------ the people's material
let GRAIN = null;
const grainU = { value: null }, grainRep = { value: 1 };
const MAP_FRAG = THREE.ShaderChunk.map_fragment.replace('diffuseColor *= sampledDiffuseColor;',
  'float gearOn = step( 0.001, vGear.x );\n\tdiffuseColor *= mix( sampledDiffuseColor, vec4( 1.0 ), gearOn );\n\tif ( gearOn > 0.5 ) diffuseColor.rgb *= mix( 1.0, 2.0 * texture2D( uGrain, vMapUv * uGrainRep ).r, vGear.z );');
/**
 * The people's MeshStandardMaterial: the painted atlas on the body, and on the modelled gear (vertices with a `gear`
 * attribute: roughness, metalness, grain) their vertex colours with the kit's cloth grain. A subclass so clones (the
 * interior lighting variants in src/growth/kit.js, src/town/mats.js) keep the patch.
 */
export class HumanMaterial extends THREE.MeshStandardMaterial {
  constructor(p) { super({ ...p, vertexColors: true }); }
  onBeforeCompile(sh) {
    if (!GRAIN) { GRAIN = kitMaterials('normal')[MAT.cloth].map; grainU.value = GRAIN; grainRep.value = GRAIN.repeat.x; }
    sh.uniforms.uGrain = grainU; sh.uniforms.uGrainRep = grainRep;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 gear;\nvarying vec3 vGear;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvGear = gear;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vGear;\nuniform sampler2D uGrain;\nuniform float uGrainRep;')
      .replace('#include <map_fragment>', MAP_FRAG)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n\tif ( vGear.x > 0.0 ) roughnessFactor = vGear.x;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n\tif ( vGear.x > 0.0 ) metalnessFactor = vGear.y;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\tif ( vGear.x > 0.0 ) totalEmissiveRadiance = emissive * diffuseColor.rgb;');
  }
  customProgramCacheKey() { return 'human-gear'; }
}

// ------------------------------------------------------------------ cache of built pieces (kit parts in their own frame)
const CACHE = new Map();
function piece(key, build) {
  let p = CACHE.get(key);
  if (p) { CACHE.delete(key); CACHE.set(key, p); return p; }
  const K = build();
  p = K.parts.map((B, mat) => (B && B.i.length && RM[mat] ? { p: new Float32Array(B.p), n: new Float32Array(B.n), u: new Float32Array(B.u), c: new Float32Array(B.c), i: B.i.slice(), rm: RM[mat] } : null)).filter(Boolean);
  CACHE.set(key, p);
  if (CACHE.size > 240) CACHE.delete(CACHE.keys().next().value);
  return p;
}

// ------------------------------------------------------------------ the output buffers
class Out {
  constructor() { this.pos = []; this.nrm = []; this.uv = []; this.col = []; this.gear = []; this.bone = []; this.idx = []; }
  /** Append a piece through matrix M (rest-pose model space) on `bone`; mirror: onto the other side (x -> -x, R bone). */
  add(parts, bone, M, mirror = false) {
    const nm = new THREE.Matrix3().getNormalMatrix(M), v = new THREE.Vector3(), n = new THREE.Vector3();
    const flip = (M.determinant() < 0) !== mirror;
    const bi = BONE_INDEX[mirror ? bone.replace(/L$/, 'R') : bone];
    for (const B of parts) {
      const base = this.pos.length / 3, nv = B.p.length / 3;
      for (let k = 0; k < nv; k++) {
        v.set(B.p[k * 3], B.p[k * 3 + 1], B.p[k * 3 + 2]).applyMatrix4(M);
        n.set(B.n[k * 3], B.n[k * 3 + 1], B.n[k * 3 + 2]).applyMatrix3(nm).normalize();
        this.pos.push(mirror ? -v.x : v.x, v.y, v.z);
        this.nrm.push(mirror ? -n.x : n.x, n.y, n.z);
        this.uv.push(B.u[k * 2], B.u[k * 2 + 1]);
        this.col.push(B.c[k * 3], B.c[k * 3 + 1], B.c[k * 3 + 2]);
        this.gear.push(B.rm[0], B.rm[1], B.rm[2]);
        this.bone.push(bi);
      }
      for (let k = 0; k < B.i.length; k += 3) {
        if (flip) this.idx.push(base + B.i[k], base + B.i[k + 2], base + B.i[k + 1]);
        else this.idx.push(base + B.i[k], base + B.i[k + 1], base + B.i[k + 2]);
      }
    }
  }
}
const mat4 = (pos = [0, 0, 0], rot = [0, 0, 0], s = 1) => new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2], 'XYZ')), Array.isArray(s) ? new THREE.Vector3(...s) : new THREE.Vector3(s, s, s));

// ------------------------------------------------------------------ light primitives (people are many: few triangles)
/** Stitching lying on a surface: flat dashes, two triangles each. n: the surface normal (a vector or p -> vector). */
function seam(K, path, w, n, o = {}) {
  const dash = o.dash ?? w * 5, gap = o.gap ?? w * 3.5, lift = o.lift ?? w * 0.35;
  const L = [0];
  for (let i = 1; i < path.length; i++) L.push(L[i - 1] + v3.len(v3.sub(path[i], path[i - 1])));
  const at = (s) => { let i = 1; while (i < path.length - 1 && L[i] < s) i++; const t = (s - L[i - 1]) / Math.max(1e-9, L[i] - L[i - 1]); return v3.lerp(path[i - 1], path[i], clamp(t, 0, 1)); };
  for (let s = (o.phase ?? gap * 0.5); s + dash <= L[L.length - 1]; s += dash + gap) {
    const a = at(s), b = at(s + dash), d = v3.norm(v3.sub(b, a)), m = v3.lerp(a, b, 0.5);
    const nn = v3.norm(typeof n === 'function' ? n(m) : n);
    let sd = v3.cross(nn, d);
    if (v3.len(sd) < 1e-6) continue;
    sd = v3.mul(v3.norm(sd), w / 2);
    const up = v3.mul(nn, lift);
    const P = [v3.add(v3.sub(a, sd), up), v3.add(v3.add(a, sd), up), v3.add(v3.add(b, sd), up), v3.add(v3.sub(b, sd), up)];
    const c = v3.cross(v3.sub(P[1], P[0]), v3.sub(P[2], P[0]));
    K.tris(P, [nn, nn, nn, nn], v3.dot(c, nn) >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2], { mat: o.mat ?? MAT.cloth, col: o.col });
  }
}
/** A plain box (12 triangles) centred at c, half sizes s, in the current transform: buckles, latches, tabs. */
function box(K, c, s, o = {}) {
  const [x, y, z] = c, [a, b, d] = s, F = [
    [[1, 0, 0], [[a, -b, -d], [a, b, -d], [a, b, d], [a, -b, d]]], [[-1, 0, 0], [[-a, -b, d], [-a, b, d], [-a, b, -d], [-a, -b, -d]]],
    [[0, 1, 0], [[-a, b, -d], [-a, b, d], [a, b, d], [a, b, -d]]], [[0, -1, 0], [[-a, -b, d], [-a, -b, -d], [a, -b, -d], [a, -b, d]]],
    [[0, 0, 1], [[-a, -b, d], [a, -b, d], [a, b, d], [-a, b, d]]], [[0, 0, -1], [[a, -b, -d], [-a, -b, -d], [-a, b, -d], [a, b, -d]]]];
  for (const [nn, q] of F) if (!o.skip?.includes(nn.join(','))) K.tris(q.map((p) => [x + p[0], y + p[1], z + p[2]]), [nn, nn, nn, nn], [0, 1, 2, 0, 2, 3], o);
}
/** A short cylinder (button, rivet, dial) standing on +y in the current transform. */
const stud = (K, c, r, h, o = {}) => K.with(c, o.rot || [0, 0, 0], 1, () => K.lathe([[r, 0], [r, h * 0.75], [r * 0.8, h], [0, h]], { seg: o.seg ?? 8, mat: o.mat ?? MAT.metal, col: o.col ?? STEEL }));
/** A fan over a closed ring of 3D points round centre c, facing `dir` (+1: +y, -1: -y). */
function fan(K, c, ring, dir, o) {
  let A = 0; for (let i = 0; i < ring.length; i++) { const p = ring[i], q = ring[(i + 1) % ring.length]; A += (p[0] - c[0]) * (q[2] - c[2]) - (q[0] - c[0]) * (p[2] - c[2]); }
  const idx = [], n = ring.length, up = (A > 0) === (dir > 0);
  for (let i = 0; i < n; i++) idx.push(0, up ? 1 + ((i + 1) % n) : 1 + i, up ? 1 + i : 1 + ((i + 1) % n));
  K.tris([c, ...ring], [c, ...ring].map(() => [0, dir, 0]), idx, o);
}
/** A band round a closed 2D outline (x, z) from y0 to y1 with flat bottom (fan) and a lip at the top going inward. */
function band(K, outline, y0, y1, o = {}) {
  const n = outline.length, rows = o.rows || [[0, 0, 0], [0, 1, 0]]; // [inset, t (0 y0 .. 1 y1), _]
  const cx = outline.reduce((s, p) => s + p[0], 0) / n, cz = outline.reduce((s, p) => s + p[1], 0) / n;
  const P = (i, j) => { const [x, z] = outline[i % n], [ins, t] = rows[j], dx = x - cx, dz = z - cz, l = Math.hypot(dx, dz) || 1; return [x - (dx / l) * ins, y0 + (y1 - y0) * t, z - (dz / l) * ins]; };
  K.grid(n, rows.length - 1, P, { wrapU: true, mat: o.mat, col: o.col, out: (p) => [p[0] - cx, 0, p[2] - cz] });
  if (o.bottom !== false) fan(K, [cx, y0, cz], outline.map(([x, z]) => [x, y0, z]), -1, { mat: o.mat, col: o.bottomCol ?? o.col });
}

// ================================================================== hats (head units)
// The box head's cranium in head units: half width 6.7 tapering to 6.0 at the crown (y 16), half depth 8.4 -> 7.9, centred
// z 2.4 -> 1.7, with chamfered corners. Hats are superellipse lathes (e 2.6) centred on it, wide enough for the corners.
const HC = 1.95, HSZ = 1.15, HE = 2.6;
const sxF = (y, a) => Math.pow(Math.max(Math.abs(Math.sin(a)), 1e-4), 2 / HE - 1);
const szF = (y, a) => HSZ * Math.pow(Math.max(Math.abs(Math.cos(a)), 1e-4), 2 / HE - 1);
const hcz = (y) => HC - 0.05 * (y - 12);
/** A crown (lathe round the cranium): prof [[r, y, hard?]...] bottom to top. o.fwd(y): extra forward shift. */
function crown(K, prof, o = {}) {
  K.lathe(prof, { seg: o.seg ?? 28, sub: o.sub ?? 2, sx: sxF, sz: szF, shift: (y) => [0, hcz(y) + (o.fwd ? o.fwd(y) : 0)], ...o });
}
/** A point on the crown's superellipse ring of radius r at height y, angle a (0 = front). */
function ringPt(r, y, a, dz = 0) {
  const s = Math.sin(a), c = Math.cos(a);
  return [Math.sign(s) * Math.abs(s) ** (2 / HE) * r, y, hcz(y) + dz + Math.sign(c) * Math.abs(c) ** (2 / HE) * r * HSZ];
}
const ring = (r, y, n = 48, a0 = 0, a1 = TAU, dz = 0) => Array.from({ length: n }, (_, i) => ringPt(r, y, a0 + ((a1 - a0) * i) / (a1 === TAU ? n : n - 1), dz));
const loop = (pts) => pts.concat([pts[0]]);
const outN = (p) => [p[0], p[1] - 11, p[2] - hcz(p[1])]; // outward on a crown
/** A brim from the crown's base ring (r0 at y0) out to r1 (y1), droop: extra drop at the edge. */
function brim(K, r0, y0, r1, y1, th, o = {}) {
  const n = o.n ?? 36;
  K.washer(ring(r0, y0, n), ring(r1, y1, n), th, { rows: o.rows ?? 3, innerRim: false, ...o, shape: (p, t) => [p[0], p[1] - (o.droop || 0) * t * t, p[2]] });
}
const brimY = (r0, y0, r1, y1, droop, t) => [r0 + (r1 - r0) * t, y0 + (y1 - y0) * t - droop * t * t];

const HAT_BUILD = {
  cap(col, col2) {
    const K = new Kit();
    const P = [[8.05, 11.5], [8.12, 13.4], [8.0, 15.3], [7.5, 16.7], [6.2, 17.8], [3.7, 18.5], [0, 18.7]];
    crown(K, P, { mat: MAT.cloth, col });
    K.tube(loop(ring(8.06, 11.55, 28)), 0.26, { sides: 4, mat: MAT.cloth, col: shade(col, 0.82) });
    // six panels: stitched seams, an eyelet on each, the button on top
    const R = smooth(P.map(([r, y]) => [r + 0.07, y]), 2);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU + TAU / 12;
      seam(K, R.slice(1, -1).map(([r, y]) => ringPt(r, y, a)), 0.16, outN, { col: shade(col, 0.68) });
      stud(K, ringPt(7.05, 16.9, a + TAU / 12), 0.38, 0.12, { rot: [0.95, a + TAU / 12, 0], mat: MAT.cloth, col: shade(col, 0.7), seg: 6 });
    }
    stud(K, [0, 18.6, hcz(18.6)], 0.85, 0.5, { mat: MAT.cloth, col: shade(col, 0.9), seg: 10 });
    // the embroidered badge on the front panels
    const fz = ringPt(8.12, 14.3, 0)[2];
    K.with([0, 14.3, fz - 0.12], [-0.14, 0, 0], 1, () => {
      K.slab([[-2.0, -1.2], [2.0, -1.2], [2.2, 0.9], [0, 1.6], [-2.2, 0.9]], 0.3, { b: 0.1, mat: MAT.cloth, col: col2 });
      stud(K, [0, 0.05, 0.13], 0.8, 0.12, { rot: [Math.PI / 2, 0, 0], mat: MAT.cloth, col: mix(col2, col, 0.8), seg: 10 });
    });
    // the visor: a curved bill from the front of the band, stitched in rows
    const n = 14, a0 = -1.05, a1 = 1.05;
    const inner = ring(8.0, 11.55, n, a0, a1), outer = inner.map((p, i) => { const a = a0 + ((a1 - a0) * i) / (n - 1), c = Math.cos(a); return [p[0] * (1.05 + 0.12 * c), p[1] - 0.25, p[2] + 7.4 * c * c + 0.4]; });
    const vshape = (p, t) => [p[0], p[1] - t * 0.55 - Math.abs(p[0]) * 0.11 * t, p[2]];
    K.washer(inner, outer, 0.42, { rows: 3, closed: false, innerRim: false, mat: MAT.cloth, col, underCol: shade(col, 0.6), shape: vshape });
    for (const t of [0.72, 0.86]) seam(K, inner.map((q, i) => { const p = outer[i]; const m = vshape([q[0] + (p[0] - q[0]) * t, q[1] + (p[1] - q[1]) * t, q[2] + (p[2] - q[2]) * t], t); m[1] += 0.21; return m; }).slice(1, -1), 0.14, [0, 1, 0.25], { col: shade(col, 0.7) });
    return K;
  },
  flatcap(col) {
    const K = new Kit();
    const fwd = (y) => 2.1 * sstep(11.6, 17.2, y);
    crown(K, [[8.05, 11.5], [8.3, 13.1], [8.5, 14.9], [8.45, 16.2], [7.6, 17.0], [5.0, 17.4], [0, 17.5]], { mat: MAT.knit, col, fwd, seg: 30 });
    K.tube(loop(ring(8.06, 11.55, 28)), 0.24, { sides: 4, mat: MAT.cloth, col: shade(col, 0.8) });
    // the crown snapped down onto the peak, the seam down the middle of the top
    stud(K, [0, 15.6, hcz(15.6) + fwd(15.6) + 9.15], 0.55, 0.28, { rot: [1.25, 0, 0], col: 0x8a7a62, seg: 8 });
    seam(K, Array.from({ length: 10 }, (_, j) => { const z = -7.6 + j * 1.75, y = 17.47 - Math.max(0, Math.abs(z) - 5) * 0.25; return [0, y, hcz(y) + fwd(y) + z]; }), 0.15, [0, 1, 0], { col: shade(col, 0.66) });
    // a short stiff peak
    const n = 12, a0 = -0.95, a1 = 0.95;
    const inner = ring(8.0, 11.6, n, a0, a1), outer = inner.map((p, i) => { const a = a0 + ((a1 - a0) * i) / (n - 1), c = Math.cos(a); return [p[0] * (1.02 + 0.06 * c), p[1] - 0.2, p[2] + 3.6 * c * c]; });
    K.washer(inner, outer, 0.4, { rows: 2, closed: false, innerRim: false, mat: MAT.knit, col: shade(col, 0.95), underCol: shade(col, 0.7), shape: (p, t) => [p[0], p[1] - t * 0.35, p[2]] });
    return K;
  },
  bucket(col, col2) {
    const K = new Kit();
    crown(K, [[8.15, 10.8], [8.2, 13.6], [8.05, 16.3], [7.55, 17.35, 1], [6.0, 17.8], [0, 17.9]], { mat: MAT.cloth, col });
    crown(K, [[8.3, 10.85], [8.35, 11.9], [8.32, 12.0]], { mat: MAT.cloth, col: col2, sub: 1 });
    K.tube(loop(ring(8.33, 11.95, 28)), 0.12, { sides: 4, mat: MAT.cloth, col: col2 });
    seam(K, loop(ring(7.62, 17.36, 36)), 0.14, [0, 1, 0], { col: shade(col, 0.7) });
    for (const sx of [-1, 1]) { const a = sx * 1.45; stud(K, ringPt(8.12, 14.8, a), 0.4, 0.2, { rot: [Math.PI / 2, a, 0], col: STEEL, seg: 8 }); }
    // the sloping brim with rings of stitching
    const B = [8.12, 10.85, 12.6, 9.2, 0.5];
    brim(K, B[0], B[1], B[2], B[3], 0.45, { mat: MAT.cloth, col, underCol: shade(col, 0.82), droop: B[4] });
    for (const t of [0.45, 0.85]) { const [r, y] = brimY(...B, t); seam(K, loop(ring(r, y + 0.22, 48)), 0.13, [0, 1, 0], { col: shade(col, 0.72), dash: 0.75, gap: 0.5 }); }
    return K;
  },
  sunhat(col, col2) {
    const K = new Kit();
    crown(K, [[8.15, 10.8], [8.22, 13.6], [8.05, 16.2], [7.35, 17.45], [5.2, 18.05], [0, 18.2]], { mat: MAT.straw, col });
    crown(K, [[8.3, 10.85], [8.36, 12.4], [8.33, 12.5]], { mat: MAT.cloth, col: col2, sub: 1 });
    // a wide soft brim that droops at the edge, woven in rings
    const B = [8.12, 10.85, 15.6, 9.9, 1.0];
    brim(K, B[0], B[1], B[2], B[3], 0.42, { mat: MAT.straw, col, underCol: shade(col, 0.8), droop: B[4], n: 40, rows: 3 });
    for (const t of [0.4, 0.78]) { const [r, y] = brimY(...B, t); K.tube(loop(ring(r, y + 0.2, 36)), 0.08, { sides: 3, mat: MAT.straw, col: shade(col, 0.84) }); }
    K.tube(loop(ring(8.17, 15.2, 28)), 0.08, { sides: 3, mat: MAT.straw, col: shade(col, 0.84) });
    // the ribbon's bow on the left side, tails hanging over the brim
    const b = ringPt(8.4, 11.6, 1.75);
    K.with(b, [0, 1.75, 0], 1, () => {
      for (const sx of [-1, 1]) K.blob([sx * 1.1, 0.25, 0.35], [1.25, 0.7, 0.38], { seg: 10, rings: 6, mat: MAT.cloth, col: col2 });
      K.blob([0, 0.2, 0.5], [0.45, 0.55, 0.4], { seg: 8, rings: 5, mat: MAT.cloth, col: shade(col2, 0.85) });
      for (const sx of [-1, 1]) K.tube([[sx * 0.2, 0, 0.55], [sx * 0.8, -1.3, 0.9], [sx * 1.15, -2.7, 1.5]], (t) => 0.42 + t * 0.12, { sides: 4, ry: 0.25, up: [0, 0, 1], sq: 4, caps: 'flat', mat: MAT.cloth, col: col2 });
    });
    return K;
  },
  schoolhat(col) {
    const K = new Kit();
    const band = mix(col, 0xffffff, 0.45);
    const P = [[8.15, 10.9], [8.22, 13.4], [8.05, 16.0], [7.1, 17.6], [4.6, 18.4], [0, 18.6]];
    crown(K, P, { mat: MAT.cloth, col });
    crown(K, [[8.32, 10.95], [8.36, 12.0], [8.33, 12.1]], { mat: MAT.cloth, col: band, sub: 1 });
    const R = smooth(P.map(([r, y]) => [r + 0.07, y]), 2);
    for (let k = 0; k < 4; k++) seam(K, R.slice(3, -1).map(([r, y]) => ringPt(r, y, (k / 4) * TAU + TAU / 8)), 0.15, outN, { col: shade(col, 0.74) });
    stud(K, [0, 18.55, hcz(18.6)], 0.7, 0.4, { mat: MAT.cloth, col: shade(col, 0.92), seg: 10 });
    const B = [8.12, 10.95, 11.9, 9.9, 0.35];
    brim(K, B[0], B[1], B[2], B[3], 0.42, { mat: MAT.cloth, col, underCol: shade(col, 0.85), droop: B[4], n: 32 });
    { const [r, y] = brimY(...B, 0.78); seam(K, loop(ring(r, y + 0.22, 40)), 0.13, [0, 1, 0], { col: shade(col, 0.72) }); }
    // the elastic chin strap, in front of the ears and under the chin
    const strap = [[8.0, 10.6, 3.4], [7.25, 6.6, 3.8], [6.95, 2.2, 4.4], [5.4, -1.9, 5.9], [3.2, -4.55, 7.2], [0, -4.85, 7.6], [-3.2, -4.55, 7.2], [-5.4, -1.9, 5.9], [-6.95, 2.2, 4.4], [-7.25, 6.6, 3.8], [-8.0, 10.6, 3.4]];
    K.tube(smooth(strap, 2), 0.2, { sides: 4, ry: 0.45, up: [1, 0, 0], mat: MAT.rubber, col: 0x2a2a30 });
    for (const sx of [-1, 1]) stud(K, [sx * 8.0, 10.6, 3.4], 0.36, 0.22, { rot: [0, 0, -sx * Math.PI / 2], seg: 8 });
    return K;
  },
  hardhat(col) {
    const K = new Kit();
    crown(K, [[8.6, 11.4], [8.7, 13.0], [8.55, 15.3], [7.8, 17.3], [5.9, 18.9], [3.0, 19.6], [0, 19.8]], { mat: MAT.gloss, col, seg: 32 });
    // three moulded ribs over the top, front to back
    for (const x of [-2.6, 0, 2.6]) {
      const path = [];
      for (let j = 0; j <= 10; j++) { const a = -1.25 + (j / 10) * 2.5, y = 15.3 + Math.cos(a) * 4.55; path.push([x * (0.55 + 0.45 * Math.cos(a)), y + 0.12 + (x ? -0.25 * Math.cos(a) : 0), hcz(y) + Math.sin(a) * 9.0]); }
      K.tube(path, x ? 0.42 : 0.6, { sides: 6, ry: x ? 0.7 : 0.9, up: [1, 0, 0], caps: 'round', mat: MAT.gloss, col: shade(col, 0.96) });
    }
    // the peak at the front, a narrow rim round the sides and back that curls up
    const n = 32, inner = ring(8.58, 11.45, n), outer = inner.map((p, i) => { const a = (i / n) * TAU, c = Math.cos(a), f = Math.max(0, c) ** 3; return [p[0] * 1.13, p[1] - 0.1, p[2] + (p[2] - hcz(11.45)) * 0.13 + f * 3.0]; });
    K.washer(inner, outer, 0.5, { rows: 3, innerRim: false, mat: MAT.gloss, col, underCol: shade(col, 0.72), shape: (p, t) => [p[0], p[1] + t * t * 0.55, p[2]] });
    // the safety decal on the front
    const fz = ringPt(8.7, 14.6, 0)[2];
    K.with([0, 14.7, fz - 0.1], [-0.2, 0, 0], 1, () => {
      stud(K, [0, 0, 0], 2.0, 0.2, { rot: [Math.PI / 2, 0, 0], mat: MAT.plastic, col: 0xf8f6ee, seg: 16 });
      box(K, [0, 0, 0.22], [0.42, 1.35, 0.06], { mat: MAT.plastic, col: 0x2e9a4a, skip: ['0,0,-1'] });
      box(K, [0, 0, 0.22], [1.35, 0.42, 0.06], { mat: MAT.plastic, col: 0x2e9a4a, skip: ['0,0,-1'] });
    });
    for (const sx of [-1, 1]) K.with(ringPt(8.62, 12.1, sx * 1.6), [0, sx * 1.6, 0], 1, () => box(K, [0, 0, 0.15], [0.6, 0.55, 0.18], { mat: MAT.plastic, col: shade(col, 0.85) }));
    return K;
  },
};

// ================================================================== glasses (head units, the eyes frame)
// Lenses centred at (±cx, cy) on z 12, temples back over the ears to x ±7.2 (the kit's eyes frame, src/peoplekit/face.js).
function glassesBuild(g) {
  const K = new Kit();
  const col = hexOf(g.col), th = g.thick || 1, sun = g.kind === 'sun', round = g.kind === 'round';
  const cx = 3.3, cy = round ? 0.25 : 0.15, z = 12, wrap = 0.05;
  const lens = round ? oval(1.95, 1.95, 18) : sun ? smooth([[-1.9, 1.25], [0.3, 1.45], [2.0, 1.15], [2.2, -0.2], [1.6, -1.55], [0.2, -2.0], [-1.3, -1.4], [-2.1, 0.0]], 2, true) : oval(2.25, 1.45, 18, 3.4);
  const rim = (round || sun ? 0.15 : 0.23) * th, mat = round || sun ? MAT.metal : MAT.plastic, rc = sun ? mix(col, 0xc8b070, 0.35) : col;
  const bend = (p) => [p[0], p[1], p[2] - wrap * p[0] * p[0]];
  let hw = 0, ytop = 0; for (const [x, y] of lens) { hw = Math.max(hw, Math.abs(x)); ytop = Math.max(ytop, y); }
  for (const sx of [1, -1]) {
    K.with([0, 0, 0], [0, 0, 0], [sx, 1, 1], () => {
      K.tube(loop(lens.map(([x, y]) => bend([cx + x, cy + y, z]))), rim, { sides: 5, ry: round || sun ? 1 : 1.3, up: [0, 0, 1], mat, col: rc });
      if (sun) {
        // a dark mirrored lens: a gently domed fan
        const c = bend([cx, cy, z + 0.25]), ring = lens.map(([x, y]) => bend([cx + x * 0.96, cy + y * 0.96, z]));
        const pos = [c, ...ring], nor = pos.map((p) => v3.norm([(p[0] - cx) * 0.12, (p[1] - cy) * 0.12, 1])), idx = [];
        for (let i = 0; i < ring.length; i++) idx.push(0, 1 + i, 1 + ((i + 1) % ring.length));
        K.tris(pos, nor, idx, { mat: MAT.eye, col: 0x23252e });
      }
      const hx = cx + hw + rim * 0.5, hy = cy + ytop * 0.5, hz = z - wrap * hx * hx;
      box(K, [hx + 0.15, hy, hz - 0.35], [0.28, 0.32, 0.5], { mat, col: rc });
      K.tube(smooth([[hx + 0.25, hy, hz - 0.7], [6.95, hy + 0.1, 8.5], [7.3, hy * 0.5 + 0.2, 4.5], [7.35, -0.4, 2.4], [7.05, -2.2, 1.2]], 2), round || sun ? 0.13 : 0.18, { sides: 4, ry: 1.6, up: [1, 0, 0], mat, col: rc, caps: 'flat' });
    });
  }
  const bp = [[-(cx - hw * 0.94), cy + ytop * 0.35, z], [0, cy + ytop * 0.55, z + 0.15], [cx - hw * 0.94, cy + ytop * 0.35, z]].map(bend);
  K.tube(smooth(bp, 2), rim * 0.85, { sides: 5, mat, col: rc });
  if (sun) K.tube(smooth([[-(cx - hw * 0.4), cy + ytop * 1.02, z], [0, cy + ytop * 1.08, z + 0.1], [cx - hw * 0.4, cy + ytop * 1.02, z]].map(bend), 2), rim * 0.7, { sides: 5, mat, col: rc });
  return K;
}

// ================================================================== bags (metres)
/** A rounded rectangle (2D, CCW) w x h centred on the origin, corner radius r, n points a corner. */
const rrect = (w, h, r, n = 2) => {
  const out = [];
  for (const [cx, cy, a0] of [[w / 2 - r, -h / 2 + r, -Math.PI / 2], [w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, Math.PI / 2], [-w / 2 + r, -h / 2 + r, Math.PI]]) {
    for (let k = 0; k <= n; k++) { const a = a0 + (k / n) * Math.PI / 2; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  }
  return out;
};

const BAG_BUILD = {
  // held in the hand: built with the bag's width along x, thickness along z, the top edge at y = 0 (handles above)
  briefcase(col) {
    const K = new Kit({ uvk: 1 });
    const W = 0.42, Hh = 0.29, D = 0.085, O = rrect(W, Hh, 0.025, 2).map(([x, y]) => [x, y - Hh / 2]);
    K.slab(O, D, { b: 0.012, mat: MAT.leather, col });
    // the lid seam, brass latches, the handle on its loops, little feet
    for (const sz of [-1, 1]) seam(K, [[-W / 2 + 0.015, -0.055, sz * (D / 2 + 0.0005)], [W / 2 - 0.015, -0.055, sz * (D / 2 + 0.0005)]], 0.0025, [0, 0, sz], { col: shade(col, 0.6), dash: 0.009, gap: 0.006 });
    for (const sx of [-1, 1]) {
      box(K, [sx * 0.12, -0.04, D / 2 + 0.003], [0.016, 0.02, 0.004], { mat: MAT.metal, col: BRASS });
      box(K, [sx * 0.12, -0.034, D / 2 + 0.007], [0.009, 0.006, 0.002], { mat: MAT.metal, col: shade(BRASS, 1.15), skip: ['0,0,-1'] });
      stud(K, [sx * 0.18, -Hh - 0.003, 0], 0.007, 0.004, { rot: [Math.PI, 0, 0], col: BRASS, seg: 6 });
      box(K, [sx * 0.055, 0.006, 0], [0.006, 0.008, 0.012], { mat: MAT.metal, col: BRASS });
    }
    K.tube(smooth([[-0.055, 0.008, 0], [-0.05, 0.04, 0], [0, 0.05, 0], [0.05, 0.04, 0], [0.055, 0.008, 0]], 2), 0.009, { sides: 6, ry: 0.75, up: [0, 0, 1], mat: MAT.leather, col: shade(col, 0.9) });
    return K;
  },
  handbag(col) {
    const K = new Kit({ uvk: 1 });
    const O = smooth([[-0.13, -0.2], [0.13, -0.2], [0.135, -0.12], [0.105, -0.005], [-0.105, -0.005], [-0.135, -0.12]], 2, true);
    K.slab(O, 0.09, { b: 0.028, mat: MAT.leather, col, bend: (p) => [p[0], p[1], p[2] * (0.72 + 0.28 * sstep(0, -0.16, p[1]))] });
    // the gold kiss-lock frame along the top and its two little balls
    for (const dz of [-0.022, 0.022]) K.tube([[-0.105, 0.0, dz], [0.105, 0.0, dz]], 0.004, { sides: 5, mat: MAT.metal, col: BRASS, caps: 'flat' });
    for (const sx of [-1, 1]) K.tube([[sx * 0.105, 0.0, -0.022], [sx * 0.11, 0.0, 0], [sx * 0.105, 0.0, 0.022]], 0.004, { sides: 5, mat: MAT.metal, col: BRASS });
    for (const dz of [-0.006, 0.006]) K.blob([0.006 * Math.sign(dz), 0.01, dz], 0.0065, { seg: 8, rings: 5, mat: MAT.metal, col: BRASS });
    // croc scales: a few rows of raised tiles on the front and back
    for (const sz of [-1, 1]) for (let r = 0; r < 3; r++) for (let c = -2; c <= 2; c++) {
      const x = c * 0.04 + (r % 2) * 0.02, y = -0.06 - r * 0.045;
      if (Math.abs(x) > 0.1 + r * 0.01) continue;
      box(K, [x, y, sz * (0.034 + 0.008 * sstep(-0.02, -0.15, y))], [0.016, 0.018, 0.003], { mat: MAT.leather, col: shade(col, 0.9 + ((r + c) & 1) * 0.08), skip: [sz > 0 ? '0,0,-1' : '0,0,1'] });
    }
    // two rolled handles with rings
    for (const dz of [-0.02, 0.02]) K.tube(smooth([[-0.07, 0.002, dz], [-0.06, 0.06, dz], [0, 0.085, dz], [0.06, 0.06, dz], [0.07, 0.002, dz]], 2), 0.0065, { sides: 5, mat: MAT.leather, col: shade(col, 0.88) });
    return K;
  },
  ecobag(col, a) {
    const K = new Kit({ uvk: 1 });
    const O = smooth([[-0.17, -0.34], [0.17, -0.34], [0.175, -0.17], [0.17, 0], [-0.17, 0], [-0.175, -0.17]], 2, true);
    K.slab(O, 0.1, { b: 0.035, mat: MAT.cloth, col, bend: (p) => [p[0], p[1], p[2] * (0.55 + 0.45 * sstep(0.0, -0.12, p[1]))] });
    // a printed patch on the front (a little green leaf on cream) and the hem
    K.with([0, -0.19, 0.049], [0, 0, 0], 1, () => {
      box(K, [0, 0, 0], [0.065, 0.045, 0.0015], { mat: MAT.cloth, col: mix(col, 0xf8f4e8, 0.6), skip: ['0,0,-1'] });
      K.tris([[-0.03, -0.022, 0.002], [0.026, 0.025, 0.002], [0.004, -0.004, 0.002], [-0.024, 0.012, 0.002]], [[0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1]], [0, 2, 1, 0, 1, 3], { mat: MAT.cloth, col: 0x5a8a4a });
    });
    for (const sz of [-1, 1]) seam(K, [[-0.165, -0.025, sz * 0.024], [0.165, -0.025, sz * 0.024]], 0.002, [0, 0, sz], { col: shade(col, 0.7), dash: 0.008, gap: 0.006 });
    // two long strap handles to the hand
    for (const dz of [-0.022, 0.022]) K.tube(smooth([[-0.09, -0.04, dz], [-0.085, 0.005, dz], [-0.04, 0.05, dz * 0.6], [0, 0.058, 0], [0.04, 0.05, dz * 0.6], [0.085, 0.005, dz], [0.09, -0.04, dz]], 2), 0.01, { sides: 4, ry: 0.25, up: [0, 0, 1], sq: 4, mat: MAT.cloth, col: shade(col, 0.9) });
    if (a.leek) {
      // a leek: white shank, pale neck, dark green leaves fanning out
      K.with([-0.06, -0.12, 0.0], [0, 0, 0.32], 1, () => {
        K.tube([[0, -0.03, 0], [0, 0.0, 0], [0, 0.16, 0], [0, 0.22, 0], [0, 0.3, 0]], (t) => 0.014 + t * 0.003, { sides: 8, caps: 'round', mat: MAT.soft, col: (p) => (p[1] < 0.15 ? 0xf2f0e2 : p[1] < 0.24 ? 0xc8dca0 : 0x6aa04a) });
        for (const [dx, dz, len] of [[-0.03, 0.01, 0.17], [0.02, -0.012, 0.2], [0.04, 0.012, 0.14], [-0.006, 0.0, 0.22]]) K.tube(smooth([[0, 0.28, 0], [dx * 0.5, 0.28 + len * 0.5, dz * 0.5], [dx * 1.6, 0.28 + len, dz]], 2), (t) => 0.012 * (1 - t * 0.7), { sides: 5, ry: 0.55, caps: 'round', mat: MAT.soft, col: 0x4a8a3a });
      });
    }
    return K;
  },
  // on the bag bone (hanging at the hip): width along z, thickness along x, outward = +x; top at y = 0
  shoulderbag(col, a) {
    const K = new Kit({ uvk: 1 });
    const W = 0.24, Hh = 0.17, D = 0.08;
    K.with([0, 0, 0], [0, Math.PI / 2, 0], 1, () => {
      K.slab(rrect(W, Hh, 0.02, 2).map(([x, y]) => [x, y - Hh / 2]), D, { b: 0.014, mat: MAT.leather, col });
      // the flap over the top and down the outside, stitched, with a buckle strap or the school crest
      const F = [[-W / 2 + 0.004, 0.0], [W / 2 - 0.004, 0.0], [W / 2 - 0.004, -0.1], [W / 2 - 0.03, -0.122], [-W / 2 + 0.03, -0.122], [-W / 2 + 0.004, -0.1]];
      K.with([0, 0, D / 2 + 0.004], [0, 0, 0], 1, () => {
        K.slab(F, 0.006, { b: 0.0025, mat: MAT.leather, col: shade(col, 1.06), back: false });
        seam(K, loop(F.map(([x, y]) => [x * 0.92, y * 0.9 - 0.004, 0.003])), 0.002, [0, 0, 1], { col: shade(col, 0.66), dash: 0.008, gap: 0.005 });
        if (a.school) { stud(K, [0, -0.06, 0.002], 0.022, 0.003, { rot: [Math.PI / 2, 0, 0], col: BRASS, seg: 12 }); stud(K, [0, -0.06, 0.004], 0.012, 0.003, { rot: [Math.PI / 2, 0, 0], col: shade(BRASS, 1.2), seg: 10 }); }
        else { box(K, [0, -0.11, 0.004], [0.011, 0.025, 0.002], { mat: MAT.leather, col: shade(col, 0.82) }); box(K, [0, -0.122, 0.007], [0.013, 0.009, 0.002], { mat: MAT.metal, col: STEEL }); }
      });
    });
    // the strap leaving both top corners for the shoulder, on D-rings
    for (const sz of [-1, 1]) {
      box(K, [0, 0.01, sz * (W / 2 - 0.015)], [0.004, 0.01, 0.01], { mat: MAT.metal, col: STEEL });
      K.tube([[-0.004, 0.018, sz * (W / 2 - 0.015)], [-0.012, 0.08, sz * (W / 2 - 0.04)], [-0.02, 0.16, sz * 0.03]], 0.015, { sides: 4, ry: 0.22, up: [1, 0, 0], sq: 4, caps: 'flat', mat: MAT.cloth, col: mix(col, INK, 0.15) });
    }
    return K;
  },
  tote(col, a) {
    const K = new Kit({ uvk: 1 });
    const W = 0.34, Hh = 0.3, D = 0.1;
    const O = smooth([[-W / 2, -Hh], [W / 2, -Hh], [W / 2 + 0.01, -Hh / 2], [W / 2, 0], [-W / 2, 0], [-W / 2 - 0.01, -Hh / 2]], 2, true);
    K.with([0, 0, 0], [0, Math.PI / 2, 0], 1, () => {
      K.slab(O, D, { b: 0.03, mat: a.school ? MAT.leather : MAT.cloth, col, bend: (p) => [p[0], p[1], p[2] * (0.6 + 0.4 * sstep(0, -0.1, p[1]))] });
      for (const sz of [-1, 1]) seam(K, [[-W / 2 + 0.012, -0.025, sz * D * 0.31], [W / 2 - 0.012, -0.025, sz * D * 0.31]], 0.002, [0, 0, sz], { col: shade(col, 0.7), dash: 0.008, gap: 0.006 });
      box(K, [0, -0.17, D / 2 - 0.004], [0.075, 0.048, 0.002], { mat: a.school ? MAT.metal : MAT.cloth, col: a.school ? BRASS : mix(col, 0x8a3a3a, 0.45), skip: ['0,0,-1'] });
    });
    for (const sz of [-1, 1]) K.tube([[0.0, -0.03, sz * 0.09], [-0.004, 0.06, sz * 0.07], [-0.012, 0.15, sz * 0.02]], 0.014, { sides: 4, ry: 0.22, up: [1, 0, 0], sq: 4, caps: 'flat', mat: MAT.cloth, col: shade(col, 0.88) });
    return K;
  },
  // on the bag bone, hanging on the chest; facing +z, the body's centre at y = -0.045
  camera() {
    const K = new Kit({ uvk: 1 });
    const BODY = 0x26262a, CHROME = 0xc8ccd2;
    K.with([0, -0.045, 0], [0, 0, 0], 1, () => {
      K.slab(rrect(0.13, 0.078, 0.01, 2), 0.05, { b: 0.006, mat: MAT.leather, col: BODY });
      // the chrome top plate with the prism hump, dials, shutter button and the lens
      box(K, [0, 0.043, 0], [0.064, 0.005, 0.026], { mat: MAT.metal, col: CHROME, skip: ['0,-1,0'] });
      K.with([0, 0.048, 0.002], [0, 0, 0], 1, () => K.slab([[-0.024, 0], [0.024, 0], [0.014, 0.022], [-0.014, 0.022]], 0.036, { b: 0.003, mat: MAT.metal, col: CHROME }));
      for (const [x, r, h] of [[0.045, 0.011, 0.008], [-0.045, 0.01, 0.007], [0.03, 0.005, 0.009]]) stud(K, [x, 0.047, 0], r, h, { col: x === 0.03 ? 0x9a9ea6 : CHROME, seg: 10 });
      K.with([0.008, 0.0, 0.025], [Math.PI / 2, 0, 0], 1, () => {
        K.lathe([[0.024, 0, 1], [0.024, 0.012], [0.026, 0.013, 1], [0.026, 0.03], [0.023, 0.031, 1], [0.023, 0.045], [0.019, 0.047, 1], [0.0, 0.047]], { seg: 12, mat: MAT.metal, col: (p) => (p[1] > 0.012 && p[1] < 0.031 ? 0x1c1c20 : 0x2e2e34) });
        K.with([0, 0.0468, 0], [0, 0, 0], 1, () => K.lathe([[0.015, 0], [0.011, 0.0015], [0, 0.002]], { seg: 12, mat: MAT.eye, col: 0x28344a }));
      });
      for (const sx of [-1, 1]) box(K, [sx * 0.066, 0.035, 0], [0.004, 0.005, 0.003], { mat: MAT.metal, col: CHROME });
    });
    return K;
  },
  // on the chest bone against the back, built at the pack's height h: back face at z = 0, out along -z, y 0 .. h
  backpack(col, h) {
    const K = new Kit({ uvk: 1 });
    const W = 0.29, D = 0.14, dark = mix(col, INK, 0.3);
    const O = smooth([[-W / 2, 0.02 * h], [W / 2, 0.02 * h], [W / 2 + 0.008, 0.45 * h], [W / 2 - 0.02, h - 0.04], [W / 4, h - 0.005], [0, h], [-W / 4, h - 0.005], [-W / 2 + 0.02, h - 0.04], [-W / 2 - 0.008, 0.45 * h]], 2, true);
    K.with([0, 0, -D / 2], [0, 0, 0], 1, () => K.slab(O, D, { b: 0.04, mat: MAT.cloth, col, bend: (p) => [p[0], p[1], p[2] < 0 ? p[2] * (0.75 + 0.35 * Math.sin(Math.PI * clamp(p[1] / h, 0, 1))) : p[2]] }));
    // the zip round the main compartment, the front pocket with its own zip, the pulls
    const zip = []; for (let k = 0; k <= 16; k++) { const a = Math.PI * (k / 16); zip.push([Math.cos(a) * (W / 2 - 0.012), 0.42 * h + Math.sin(a) * (0.52 * h + 0.012), -D * (0.75 + 0.35 * Math.sin(Math.PI * clamp((0.42 * h + Math.sin(a) * 0.52 * h) / h, 0, 1))) - 0.002]); }
    seam(K, zip, 0.005, (p) => [p[0] * 0.5, (p[1] - 0.45 * h) * 0.5, -1], { col: shade(col, 0.55), dash: 0.006, gap: 0.003 });
    for (const sx of [-1, 1]) box(K, [sx * 0.06, h - 0.03, -D - 0.004], [0.006, 0.014, 0.002], { mat: MAT.metal, col: STEEL });
    K.with([0, 0.24 * h, -D * 1.05 - 0.012], [0, 0, 0], 1, () => {
      K.slab(rrect(W * 0.72, 0.36 * h, 0.04, 2), 0.04, { b: 0.014, mat: MAT.cloth, col: shade(col, 0.94) });
      seam(K, [[-W * 0.3, 0.13 * h, -0.021], [W * 0.3, 0.13 * h, -0.021]], 0.005, [0, 0, -1], { col: shade(col, 0.55), dash: 0.006, gap: 0.003 });
      box(K, [0.07, 0.13 * h - 0.016, -0.023], [0.006, 0.014, 0.002], { mat: MAT.metal, col: STEEL });
    });
    // the grab loop on top and the strap feet at the bottom corners
    K.tube(smooth([[-0.03, h - 0.012, -0.03], [-0.02, h + 0.02, -0.035], [0.02, h + 0.02, -0.035], [0.03, h - 0.012, -0.03]], 2), 0.008, { sides: 4, ry: 0.35, up: [0, 0, 1], mat: MAT.cloth, col: dark });
    for (const sx of [-1, 1]) K.tube([[sx * (W / 2 - 0.03), 0.06, -0.01], [sx * (W / 2 - 0.02), 0.03, 0.01]], 0.012, { sides: 4, ry: 0.3, up: [0, 0, 1], sq: 4, caps: 'flat', mat: MAT.cloth, col: dark });
    return K;
  },
  randoseru(col, h) {
    const K = new Kit({ uvk: 1 });
    const W = 0.235, D = 0.17, LIP = mix(col, 0xffffff, 0.06), lo = h * 0.32;
    // the box body, its padded back panel
    K.with([0, 0, -D / 2 - 0.012], [0, 0, 0], 1, () => K.slab(rrect(W, h, 0.03, 2).map(([x, y]) => [x, y + h / 2]), D, { b: 0.014, mat: MAT.leather, col }));
    K.with([0, h / 2, -0.008], [0, 0, 0], 1, () => K.slab(rrect(W * 0.86, h * 0.8, 0.04, 2), 0.016, { b: 0.007, mat: MAT.soft, col: shade(col, 0.8) }));
    // the lid: over the top and down the back to a third, its rounded end, stitched round the edge
    const L = [[0, h + 0.004, -0.004], [0, h + 0.012, -0.03], [0, h + 0.006, -0.08], [0, h + 0.004, -D + 0.02], [0, h - 0.006, -D - 0.022], [0, h - 0.03, -D - 0.026], [0, h * 0.6, -D - 0.026], [0, lo, -D - 0.026]];
    K.sweep(smooth(L, 2), [[W / 2 + 0.006, 0.004], [-W / 2 - 0.006, 0.004], [-W / 2 - 0.006, -0.004], [W / 2 + 0.006, -0.004]], { up: [1, 0, 0], mat: MAT.leather, col: LIP });
    K.with([0, lo, -D - 0.026], [0, 0, 0], 1, () => K.slab([...oval((W + 0.012) / 2, 0.065, 20).filter(([, y]) => y < -1e-4), [(W + 0.012) / 2, 0], [-(W + 0.012) / 2, 0]].sort((p, q) => Math.atan2(p[1], p[0]) - Math.atan2(q[1], q[0])), 0.008, { b: 0.0035, mat: MAT.leather, col: LIP }));
    seam(K, smooth([[-W / 2 + 0.008, h - 0.03, -D - 0.031], [-W / 2 + 0.008, lo + 0.005, -D - 0.031], [-W / 2 + 0.04, lo - 0.042, -D - 0.031], [0, lo - 0.056, -D - 0.031], [W / 2 - 0.04, lo - 0.042, -D - 0.031], [W / 2 - 0.008, lo + 0.005, -D - 0.031], [W / 2 - 0.008, h - 0.03, -D - 0.031]], 3), 0.003, [0, 0, -1], { col: shade(col, 0.7), dash: 0.008, gap: 0.006 });
    // the gold turn-lock at the bottom of the lid and its catch on the body
    stud(K, [0, lo - 0.035, -D - 0.03], 0.016, 0.007, { rot: [-Math.PI / 2, 0, 0], col: 0xd8b048, seg: 12 });
    box(K, [0, lo - 0.035, -D - 0.038], [0.012, 0.003, 0.002], { mat: MAT.metal, col: 0xc09838 });
    box(K, [0, lo - 0.08, -D - 0.026], [0.015, 0.025, 0.003], { mat: MAT.metal, col: 0xc09838 });
    // the side hooks and the reflective patches
    for (const sx of [-1, 1]) {
      K.tube([[sx * (W / 2 + 0.002), h * 0.42 + 0.02, -D / 2 - 0.012], [sx * (W / 2 + 0.014), h * 0.42, -D / 2 - 0.012], [sx * (W / 2 + 0.014), h * 0.42 - 0.02, -D / 2 - 0.012], [sx * (W / 2 + 0.006), h * 0.42 - 0.028, -D / 2 - 0.012]], 0.003, { sides: 4, caps: 'flat', mat: MAT.metal, col: STEEL });
      box(K, [sx * (W / 2 + 0.001), h * 0.75, -D / 2 - 0.012], [0.0015, 0.015, 0.025], { mat: MAT.plastic, col: 0xe8e4d4 });
    }
    return K;
  },
  // on the hips, on the front of the left hip: width along x, out along +z, top at y = 0
  pouch(col) {
    const K = new Kit({ uvk: 1 });
    K.with([0, -0.045, 0.024], [0, 0, 0], 1, () => {
      K.slab(rrect(0.11, 0.09, 0.022, 2), 0.045, { b: 0.016, mat: MAT.leather, col, bend: (p) => [p[0], p[1], p[2] * (0.8 + 0.2 * (1 - (p[0] / 0.055) ** 2))] });
      seam(K, [[-0.045, 0.03, 0.0235], [0.045, 0.03, 0.0235]], 0.004, [0, 0.2, 1], { col: shade(col, 0.55), dash: 0.004, gap: 0.0025 });
      box(K, [0.03, 0.02, 0.025], [0.004, 0.01, 0.0015], { mat: MAT.metal, col: STEEL });
    });
    box(K, [0, -0.035, 0.0], [0.022, 0.025, 0.003], { mat: MAT.leather, col: shade(col, 0.8) });
    return K;
  },
};

// ================================================================== shoes (foot units: length 1, heel at z 0, toe at z 1)
// A shoe last: the footprint's half width W(t) and the upper's height H(t) along the length; the upper's section is a
// superellipse from the sole edge over the top. The opening round the ankle is a lining-coloured top with a padded
// collar; laces, tongues, straps, toe caps, heels per kind. The sole is a band round the footprint with a flat bottom.
const SH = {
  sneaker: { st: 0.06, sole: 0xf2f0ea, mat: MAT.cloth, toe: 0.18, vamp: 0.28, collar: 0.24, laces: 5, cap: true, fox: true },
  platform: { st: 0.16, sole: 0xf4f2ee, mat: MAT.cloth, toe: 0.18, vamp: 0.27, collar: 0.23, laces: 4, cap: true },
  comfort: { st: 0.065, sole: 0xd2c8ba, mat: MAT.soft, toe: 0.23, vamp: 0.31, collar: 0.25, straps: 2 },
  loafer: { st: 0.035, sole: 0x2a2220, mat: MAT.leather, toe: 0.19, vamp: 0.27, collar: 0.2, heel: 0.05, saddle: true, polish: true },
  oxford: { st: 0.035, sole: 0x2a2220, mat: MAT.leather, toe: 0.19, vamp: 0.29, collar: 0.23, heel: 0.05, laces: 4, closed: true, toecap: true, polish: true },
  boots: { st: 0.06, sole: 0x2a2624, mat: MAT.rubber, toe: 0.22, vamp: 0.33, collar: 0.27, boot: true },
  tabi: { st: 0.05, sole: 0x2a2a30, mat: MAT.cloth, toe: 0.2, vamp: 0.31, collar: 0.27, boot: true, split: true },
  pumps: { st: 0.03, sole: 0x2a2220, mat: MAT.leather, toe: 0.17, vamp: 0.1, collar: 0.1, heel: 0.08, pump: true, polish: true, grow: 0.016 },
  foot: { st: 0, mat: MAT.soft, toe: 0.13, vamp: 0.24, collar: 0.33, boot: true, bare: true, grow: 0 },
  sandal: { st: 0.05, sandal: true },
};
const SL = 1.045, SZ0 = -0.26; // shoe length (x foot length), its heel's z (x foot length) from the ankle joint's z
/** Footprint half width at t (0 heel .. 1 toe). */
function footW(t, g = 0) {
  let w = g + (t < 0.62 ? 0.136 + 0.036 * sstep(0.12, 0.62, t) : 0.172 - 0.01 * sstep(0.62, 0.85, t));
  if (t < 0.16) w *= Math.sqrt(Math.max(0, 1 - ((0.16 - t) / 0.16) ** 2));
  if (t > 0.78) w *= Math.sqrt(Math.max(0, 1 - ((t - 0.78) / 0.22) ** 2));
  return w;
}
const footCx = (t) => -0.018 * sstep(0.55, 1, t); // the toe turns in a little (big toe side)
/** The footprint outline (x, z) between t0 and t1, n points a side, grown outward by m (round the toe and heel too). */
const footprint = (n, m, t0 = 0.0, t1 = 1.0) => {
  const o = [], T = (i) => t0 + (t1 - t0) * (0.5 - 0.5 * Math.cos((Math.PI * i) / n));
  for (let i = 0; i <= n; i++) { const t = T(i); o.push([footCx(t) + footW(t), t]); }
  for (let i = n; i >= 0; i--) { const t = T(i); o.push([footCx(t) - footW(t), t]); }
  // drop doubled points where the width is zero, then offset along the 2D normals
  const q = o.filter((p, i) => i === 0 || Math.hypot(p[0] - o[i - 1][0], p[1] - o[i - 1][1]) > 1e-4);
  if (Math.hypot(q[0][0] - q[q.length - 1][0], q[0][1] - q[q.length - 1][1]) < 1e-4) q.pop();
  const N = q.length;
  return q.map((p, i) => {
    const a = q[(i - 1 + N) % N], b = q[(i + 1) % N], tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1;
    let nx = tz / l, nz = -tx / l;
    if (nx * (p[0] - footCx(p[1])) + nz * (p[1] - 0.5) < 0) { nx = -nx; nz = -nz; }
    return [p[0] + nx * m, p[1] + nz * m];
  });
};
/** A last's height along the centre line, and a point on its surface (t along, a round from the outer side, grow g). */
function lastFns(S) {
  const st = S.st, E = S.boot ? 2.4 : 2.7, G = S.grow ?? 0.012;
  const top = (t) => {
    // the upper's height above the sole along the centre line
    const heel = S.collar + (S.boot ? 0.04 : 0.05), throat = S.pump ? S.collar : Math.max(S.vamp, S.collar + 0.03);
    if (t < 0.12) return heel;
    if (t < 0.46) return S.boot ? heel : S.collar + (heel - S.collar) * (1 - sstep(0.12, 0.3, t)) + (throat - S.collar) * sstep(0.34, 0.46, t);
    if (S.pump) return S.collar + (S.toe - S.collar) * sstep(0.46, 0.7, t) - 0.05 * sstep(0.85, 1, t) ** 2;
    return throat + (S.toe - throat) * sstep(0.46, 0.86, t) - S.toe * 0.6 * sstep(0.88, 1.0, t) ** 2;
  };
  const surf = (t, a, g = 0) => { const W = footW(t, G + g), c = Math.cos(a), s = Math.sin(a); return [footCx(t) + Math.sign(c) * Math.abs(c) ** (2 / E) * W, st - 0.004 + Math.abs(s) ** (2 / E) * (Math.max(0.02, top(t)) + g), t]; };
  /** The surface's height over (x, t). */
  const yAt = (t, x, g = 0) => { const W = Math.max(1e-4, footW(t, G + g)), k = clamp(Math.abs(x - footCx(t)) / W, 0, 1), c = k ** (E / 2); return st - 0.004 + Math.sqrt(1 - c * c) ** (2 / E) * (Math.max(0.02, top(t)) + g); };
  return { st, E, G, top, surf, yAt };
}
function shoeBuild(kind, col, col2, lining, socks = false) {
  const S = kind === 'foot' ? { ...SH.foot, socks } : SH[kind], K = new Kit({ uvk: 0.26 });
  const { st, E, G, top, surf } = lastFns(S);
  const NU = 8, NV = 16;
  const inOpen = (t, dx, W) => !S.boot && !S.pump && Math.abs(dx) < W * 0.66 * Math.sqrt(Math.max(0, 1 - ((t - 0.285) / 0.195) ** 2));
  const upCol = (p) => {
    const t = p[2], W = footW(t, G);
    if (inOpen(t, p[0] - footCx(t), W) && p[1] > st + top(t) * 0.82) return lining;
    return col;
  };
  // the upper (a sneaker's front is its rubber toe cap: a second patch from the same rows, so the edge is crisp)
  const T1 = S.cap ? 0.84 : 1, NV1 = S.cap ? NV - 4 : NV, outU = (p) => [p[0] - footCx(p[2]), p[1] - st - 0.05, (p[2] - 0.5) * 0.3];
  const upper = (t, i) => {
    const p = surf(t, (i / NU) * Math.PI), W = footW(t, G), dx = p[0] - footCx(t);
    if (inOpen(t, dx, W)) p[1] -= 0.03 * (1 - (Math.abs(dx) / (W * 0.66)) ** 2) * Math.sqrt(Math.max(0, 1 - ((t - 0.285) / 0.195) ** 2));
    return p;
  };
  K.grid(NU, NV1, (i, j) => upper(T1 * (S.cap ? 1 - Math.cos((Math.PI / 2) * (j / NV1)) : 0.5 - 0.5 * Math.cos((Math.PI * j) / NV1)), i), { mat: S.mat, col: upCol, out: outU });
  if (S.cap) K.grid(NU, 4, (i, j) => upper(T1 + (1 - T1) * Math.sin((Math.PI / 2) * (j / 4)), i), { mat: MAT.rubber, col: S.sole, out: outU });
  if (S.bare) {
    // toes: the split of tabi socks, or the creases between bare toes
    const grooves = S.socks ? [-0.05] : [-0.05, 0.0, 0.045, 0.085];
    for (const x of grooves) K.tube([[x, 0.03, 1.002], [x, top(0.95) - 0.004, 0.95], [x * 1.02, top(0.88) + 0.002, 0.88]], S.socks ? 0.01 : 0.005, { sides: 3, caps: 'flat', mat: S.mat, col: shade(col, S.socks ? 0.7 : 0.8) });
    return K;
  }
  // the sole: a band round the footprint (a stripe on sneakers), the lip under the upper, a flat bottom
  const fp = footprint(9, 0.02);
  const rows = S.fox ? [[0.004, 0], [0, 0.2], [0, 0.42], [0, 0.45], [0, 0.66], [0, 0.69], [0, 1], [0.03, 1]] : [[0.004, 0], [0, 0.25], [0, 1], [0.03, 1]];
  const solCol = S.fox ? (p) => (p[1] > st * 0.44 && p[1] < st * 0.67 ? col2 ?? INK : S.sole) : S.sole;
  band(K, fp, 0, st, { rows, mat: kind === 'loafer' || kind === 'oxford' || kind === 'pumps' ? MAT.leather : MAT.rubber, col: solCol, bottomCol: shade(S.sole, 0.7) });
  if (S.heel) band(K, S.pump ? footprint(4, -0.035, 0.0, 0.16) : footprint(4, 0.022, 0.0, 0.22), 0, S.heel, { rows: [[0.002, 0], [0, 0.3], [0, 1], [0.01, 1]], mat: MAT.leather, col: shade(S.sole, 1.1), bottomCol: S.sole });
  // the padded collar round the opening
  if (!S.boot && !S.pump) {
    const path = [];
    for (let k = 0; k < 16; k++) {
      const th = (k / 16) * TAU, t = 0.285 + 0.195 * Math.cos(th), W = footW(t) + 0.012, dx = Math.sin(th) * W * 0.66;
      const a = Math.acos(clamp(Math.abs(dx) / W, 0, 1));
      path.push([footCx(t) + dx, st - 0.004 + Math.abs(Math.sin(a)) ** (2 / E) * top(t) + 0.004, t]);
    }
    K.tube(loop(path), 0.02, { sides: 4, mat: S.mat === MAT.leather ? MAT.leather : MAT.soft, col: shade(col, 0.9) });
  }
  // laces over a tongue
  const laceCol = kind === 'sneaker' || kind === 'platform' ? 0xf6f6f2 : mix(col, INK, 0.5);
  if (S.laces) {
    const t0 = 0.47, t1 = S.closed ? 0.62 : 0.7, n = S.laces;
    K.with([footCx(0.44), st + top(0.46) - 0.006, 0.43], [-1.0, 0, 0], 1, () => box(K, [0, 0, 0], [0.06, 0.1, 0.008], { mat: S.mat, col: shade(col, 0.95) }));
    for (let k = 0; k < n; k++) {
      const t = t0 + (k / (n - 1)) * (t1 - t0), W = footW(t) + 0.012, wx = W * (S.closed ? 0.18 : 0.42) * (1 - 0.3 * (k / (n - 1)));
      const y = st + top(t) + 0.004;
      K.tube([[footCx(t) - wx, y - 0.004, t], [footCx(t), y + 0.004, t + 0.004], [footCx(t) + wx, y - 0.004, t]], 0.0075, { sides: 4, mat: MAT.cloth, col: laceCol });
      for (const sx of [-1, 1]) box(K, [footCx(t) + sx * wx * 1.08, y - 0.006, t], [0.008, 0.004, 0.008], { mat: MAT.metal, col: S.polish ? 0x3a3230 : STEEL, skip: ['0,-1,0'] });
    }
    if (!S.closed) { const t = t0 + 0.01, y = st + top(t) + 0.012; K.tube([[footCx(t) + 0.01, y, t], [footCx(t) + 0.06, y - 0.03, t - 0.04], [footCx(t) + 0.08, y - 0.08, t - 0.02]], 0.0065, { sides: 4, caps: 'flat', mat: MAT.cloth, col: laceCol }); }
  }
  if (S.toecap) seam(K, Array.from({ length: 9 }, (_, k) => surf(0.83 - 0.025 * Math.sin((k / 8) * Math.PI), 0.25 + (k / 8) * (Math.PI - 0.5))), 0.008, (p) => [p[0] - footCx(p[2]), 0.6, 0.2], { col: shade(col, 0.6), dash: 0.016, gap: 0.01 });
  if (S.saddle) {
    // the moc-toe seam and the penny strap across the vamp
    seam(K, Array.from({ length: 11 }, (_, k) => { const a = (k / 10) * Math.PI, t = 0.6 + 0.26 * Math.sin(a), q = surf(t, Math.PI / 2 - (Math.PI / 2 - 0.55) * Math.cos(a)); q[1] += 0.002; return q; }), 0.009, (p) => [p[0] - footCx(p[2]), 0.8, 0.1], { col: shade(col, 0.62), dash: 0.018, gap: 0.008 });
    K.tube(Array.from({ length: 7 }, (_, k) => { const q = surf(0.52, 0.3 + (k / 6) * (Math.PI - 0.6)); q[1] += 0.008; return q; }), 0.012, { sides: 4, ry: 0.4, up: [0, 0, 1], sq: 4, mat: MAT.leather, col: shade(col, 0.9) });
    box(K, [footCx(0.52), st + top(0.52) + 0.018, 0.52], [0.035, 0.003, 0.009], { mat: MAT.leather, col: shade(col, 0.5), skip: ['0,-1,0'] });
  }
  if (S.straps) for (let k = 0; k < S.straps; k++) {
    // hook-and-loop straps across the instep
    const t = 0.5 + k * 0.1;
    K.tube(Array.from({ length: 7 }, (_, q) => { const p = surf(t, 0.25 + (q / 6) * (Math.PI - 0.5)); p[1] += 0.008; return p; }), 0.022, { sides: 4, ry: 0.28, up: [0, 0, 1], sq: 5, caps: 'flat', mat: MAT.cloth, col: shade(col, 0.84) });
  }
  if (S.split) K.tube([[-0.05, st + 0.03, 1.0], [-0.052, st + top(0.94) - 0.01, 0.95], [-0.05, st + top(0.86) + 0.002, 0.82]], 0.012, { sides: 4, caps: 'round', mat: S.mat, col: shade(col, 0.55) });
  return K;
}
/** A boot's shaft round the shin (rest-pose metres): from y0 up to `top`, sections a little outside the shin. */
function shaftBuild(kind, col, shin, top, y0) {
  const K = new Kit({ uvk: 1 });
  const { lx, b0, b1, y0s, y1s } = shin;
  const at = (y) => { const t = clamp((y - y0s) / (y1s - y0s), 0, 1); return [b0[0] + (b1[0] - b0[0]) * t, b0[1] + (b1[1] - b0[1]) * t]; };
  const rows = [];
  for (let k = 0; k <= 4; k++) { const y = y0 + (top - y0) * (k / 4), [hx, hz] = at(y); rows.push([hx + 0.012 + (kind === 'boots' ? 0.006 * (k / 4) : 0), hz + 0.014, y]); }
  const E = 2.3, seg = 16, sp = (a, hx, hz, y) => { const s = Math.sin(a), c = Math.cos(a); return [lx + Math.sign(s) * Math.abs(s) ** (2 / E) * hx, y, Math.sign(c) * Math.abs(c) ** (2 / E) * hz]; };
  const mat = kind === 'tabi' ? MAT.cloth : MAT.rubber;
  K.grid(seg, rows.length - 1, (i, j) => sp((i / seg) * TAU, ...rows[j]), { wrapU: true, mat, col, out: (p) => [p[0] - lx, 0, p[2]] });
  const [hx, hz] = rows[rows.length - 1];
  K.tube(loop(Array.from({ length: seg }, (_, i) => sp((i / seg) * TAU, hx + 0.002, hz + 0.002, top))), 0.006, { sides: 4, mat, col: shade(col, 0.88) });
  if (kind === 'tabi') {
    // kohaze: little brass clasps up the inner side
    for (let k = 0; k < 4; k++) { const y = y0 + 0.03 + (top - y0 - 0.05) * (k / 3), [hx2, hz2] = at(y); K.with([lx - (hx2 + 0.012) * 0.86, y, -(hz2 + 0.014) * 0.55], [0, -Math.PI * 0.62, 0], 1, () => box(K, [0, 0, 0.002], [0.007, 0.004, 0.002], { mat: MAT.metal, col: BRASS })); }
  } else for (const sz of [-1, 1]) box(K, [lx, top + 0.01, sz * (hz + 0.006)], [0.011, 0.014, 0.002], { mat: MAT.rubber, col: shade(col, 0.85) });
  return K;
}
const SANDAL_BUILD = (col) => {
  const K = new Kit({ uvk: 0.26 }), light = lum(col) > 0.55;
  const st = 0.05, hanao = light ? 0x2a3458 : 0xa02a30;
  // an oval-ish board (zori: rush-covered; geta: wood) with a cord edge, and the hanao thong
  const fp = []; for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU, c = Math.cos(a), s = Math.sin(a); fp.push([Math.sign(s) * Math.abs(s) ** (2 / 3.2) * 0.215, 0.5 + Math.sign(c) * Math.abs(c) ** (2 / 3.2) * 0.51]); }
  band(K, fp.reverse(), 0, st, { rows: [[0.004, 0], [0, 0.3], [0, 1], [0.04, 1], [0.1, 1.02]], mat: light ? MAT.straw : MAT.wood, col, bottomCol: shade(col, 0.7) });
  fan(K, [0, st * 1.02, 0.5], fp.map(([x, z]) => [x * 0.52, st * 1.02, 0.5 + (z - 0.5) * 0.8]), 1, { mat: light ? MAT.straw : MAT.wood, col: shade(col, 1.05) });
  if (light) K.tube(loop(fp.map(([x, z]) => [x * 1.01, st * 0.55, 0.5 + (z - 0.5) * 1.01])), 0.006, { sides: 3, mat: MAT.cloth, col: shade(col, 0.72) });
  // the hanao, following the foot (lastFns(SH.foot), standing on the board)
  const F = lastFns(SH.foot), fy = (t, x) => st + F.yAt(t, x) + 0.016, post = [-0.05, 0.8];
  for (const sx of [-1, 1]) {
    const pts = [[post[0], fy(post[1], post[0]) - 0.004, post[1]], [post[0] + sx * 0.04, fy(0.7, post[0] + sx * 0.04), 0.7], [sx * 0.11, fy(0.56, sx * 0.11), 0.56], [sx * 0.165, fy(0.47, sx * 0.165) - 0.004, 0.47], [sx * 0.19, st + 0.035, 0.43], [sx * 0.2, st + 0.004, 0.42]];
    K.tube(smooth(pts, 2), 0.02, { sides: 6, ry: 0.8, mat: MAT.cloth, col: hanao });
  }
  K.tube([[post[0], st, post[1]], [post[0], fy(post[1], post[0]) - 0.004, post[1]]], 0.016, { sides: 5, mat: MAT.cloth, col: hanao });
  K.blob([post[0], fy(post[1], post[0]) + 0.004, post[1]], [0.026, 0.018, 0.026], { seg: 8, rings: 5, mat: MAT.cloth, col: shade(hanao, 0.85) });
  return K;
};

// ================================================================== assembling a person's gear
const keyOf = (...a) => a.map((x) => (Array.isArray(x) ? x.join(',') : typeof x === 'object' && x ? JSON.stringify(x) : String(x))).join('|');

/** Build a person's modelled gear: arrays in rest-pose model space, or null when they wear none. */
export function buildGear(plan) {
  const spec = plan.spec;
  if (!spec) return null;
  const { P, J } = plan, H = P.H, hu = P.hu, U = hu / 20;
  const kx = P.hw / (0.335 * hu), kz = P.hd / (0.42 * hu);
  const out = new Out();
  // head frame: head units -> rest-pose metres on the head bone
  const head = (y0) => new THREE.Matrix4().makeTranslation(J.head[0], J.head[1], J.head[2]).multiply(new THREE.Matrix4().makeScale(U * kx, U, U * kz)).multiply(new THREE.Matrix4().makeTranslation(0, y0, 0));
  const Hh = spec.hat;
  if (Hh && GEAR_HATS.has(Hh.kind)) {
    const col = hexOf(Hh.col), col2 = Hh.col2 != null ? hexOf(Hh.col2) : Hh.kind === 'cap' ? 0xf2f0ea : shade(col, 0.6);
    out.add(piece(keyOf('hat', Hh.kind, col, col2), () => HAT_BUILD[Hh.kind](col, col2)), 'head', head(0));
  }
  const G = spec.glasses;
  if (G) {
    const eyeY = (P.eyeY - J.head[1]) / U;
    out.add(piece(keyOf('glasses', G.kind, G.col, G.thick || 1), () => glassesBuild(G)), 'head', head(eyeY));
  }
  // bags
  for (const a of spec.acc) {
    const k = a.kind;
    if (!GEAR_BAGS.has(k)) continue;
    const col = hexOf(a.col || [80, 80, 80]);
    if (k === 'briefcase' || k === 'handbag' || k === 'ecobag') {
      const x = P.shX + 0.01 * H, top = P.tipY + 0.02;
      out.add(piece(keyOf(k, col, !!a.leek), () => BAG_BUILD[k](col, a)), 'handL', mat4([x, top - 0.04, 0.01], [0, Math.PI / 2, 0]));
    } else if (k === 'shoulderbag' || k === 'tote') {
      const sd = a.side || 1, big = k === 'tote' || a.school, d = big ? 0.06 : 0.045;
      const x = sd * (P.hipsX + d + 0.008), y1 = P.hipY + (big ? 0.12 : 0.08) * H;
      out.add(piece(keyOf(k, col, !!a.school), () => BAG_BUILD[k](col, a)), 'bag', sd > 0 ? mat4([x, y1, -0.01]) : mat4([x, y1, -0.01], [0, Math.PI, 0]));
    } else if (k === 'camera') {
      const z = P.chestZ + P.bust + 0.045, y = P.bustY - 0.01 * H;
      const M = mat4([0, y + 0.045, z - 0.005]);
      out.add(piece('camera', () => BAG_BUILD.camera()), 'bag', M);
      out.add(piece('camera', () => BAG_BUILD.camera()), 'prop', mat4([J.prop[0], J.prop[1] + 0.045, J.prop[2]], [0, 0, 0], 0.95));
      // the strap up round the neck
      out.add(piece(keyOf('camstrap', Math.round(P.neckBase * 100), Math.round(z * 1000), Math.round(y * 1000)), () => {
        const K = new Kit({ uvk: 1 });
        for (const sx of [-1, 1]) K.tube(smooth([[sx * 0.066, y + 0.035, z - 0.005], [sx * 0.08, y + 0.08, z - 0.02], [sx * 0.07, P.neckBase - 0.02, P.chestZ * 0.75], [sx * 0.055, P.neckBase + 0.012 * H, 0.0], [0, P.neckBase + 0.016 * H, -0.045]], 2), 0.008, { sides: 4, ry: 0.25, up: [0, 0, 1], sq: 4, caps: 'flat', mat: MAT.cloth, col: 0x2a2a30 });
        return K;
      }), 'bag', new THREE.Matrix4());
    } else if (k === 'backpack' || k === 'randoseru') {
      const rs = k === 'randoseru';
      const y0 = rs ? P.waistY - 0.03 * H : P.waistY - 0.05 * H, y1 = rs ? P.shoulderY + 0.015 * H : P.shoulderY - 0.01 * H;
      const zb = -P.chestZ;
      const h = Math.round((y1 - y0) * 200) / 200;
      out.add(piece(keyOf(k, col, h), () => BAG_BUILD[k](col, h)), 'chest', mat4([0, y0, zb]));
      // the shoulder straps from the top of the pack over the shoulders to the front of the chest (per person)
      const sx0 = P.chestTopX * 0.62, strapCol = rs ? col : mix(col, INK, 0.25);
      out.add(piece(keyOf('packstraps', k, strapCol, Math.round(sx0 * 1000), Math.round(y1 * 1000), Math.round(P.shoulderY * 1000), Math.round(P.chestZ * 1000), Math.round(P.bust * 1000)), () => {
        const K = new Kit({ uvk: 1 });
        for (const sx of [-1, 1]) {
          const x = sx * sx0, path = [[x, y1 - 0.06, zb - 0.012], [x, P.shoulderY + 0.006 * H, zb * 0.55], [x * 1.02, P.shoulderY + 0.013 * H, 0.0], [x * 1.04, P.shoulderY + 0.002 * H, P.chestZ * 0.75 + P.bust * 0.5], [x * 1.04, P.shoulderY - 0.035 * H, P.chestZ + P.bust + 0.008], [x * 1.06, P.bustY - 0.02 * H, P.chestZ + P.bust + 0.01]];
          K.tube(smooth(path, 2), rs ? 0.018 : 0.022, { sides: 4, ry: 0.28, up: [1, 0, 0], sq: 4, caps: 'flat', mat: rs ? MAT.leather : MAT.soft, col: strapCol });
          if (!rs) K.with([x * 1.06, P.bustY - 0.025 * H, P.chestZ + P.bust + 0.016], [0, 0, 0], 1, () => K.slab(rrect(0.032, 0.02, 0.005, 2), 0.006, { b: 0.0025, mat: MAT.plastic, col: 0x1e1e22 }));
        }
        return K;
      }), 'chest', new THREE.Matrix4());
      if (a.poster) out.add(piece('poster', () => {
        const K = new Kit({ uvk: 1 });
        K.tube([[0, 0, 0], [0, 0.27, 0]], 0.022, { sides: 14, caps: 'flat', mat: MAT.paper, col: (p) => (p[1] > 0.262 ? 0xd85a80 : 0xece6d4) });
        K.tube(oval(0.0235, 0.0235, 14).map(([x, z]) => [x, 0.19, z]), 0.003, { closed: true, sides: 5, mat: MAT.rubber, col: 0xd84a7a });
        return K;
      }), 'chest', mat4([0.15 * 0.55, y1 - 0.05, zb - 0.085 * 0.8], [-0.2, 0, -0.25]));
    } else if (k === 'pouch') {
      out.add(piece(keyOf('pouch', col), () => BAG_BUILD.pouch(col)), 'hips', mat4([P.hipsX * 0.62, P.pelvisY - 0.005 * H, P.hipsZ + 0.012]));
    }
  }
  // shoes
  const Sh = spec.shoes;
  if (Sh && SH[Sh.kind]) {
    const fl = P.footL, lx = P.hipX + 0.003 * H, col = hexOf(Sh.col), col2 = Sh.col2 != null ? hexOf(Sh.col2) : null;
    const lining = Sh.kind === 'tabi' || Sh.kind === 'boots' ? shade(col, 0.6) : spec.socks ? hexOf(spec.socks.col) : 0x6a5a52;
    const M = new THREE.Matrix4().makeTranslation(lx, 0, SZ0 * fl).multiply(new THREE.Matrix4().makeScale(fl, fl, fl * SL));
    // (the foot frame is uniform in x and y and stretched by SL along the length: the canonical last runs t 0..1)
    if (OPEN_SHOES.has(Sh.kind)) {
      // the foot shows: skin, socks or tights, standing on the sandal's board / in the pump
      const sockOn = (spec.legs === 'kneesocks' || spec.legs === 'loosesocks' || spec.socks) && spec.legs !== 'tights';
      let fc = sockOn ? hexOf(spec.socks?.col || [244, 242, 236]) : hexOf(spec.skin || [224, 180, 142]);
      if (spec.legs === 'tights') fc = mix(fc, hexOf(spec.tights || [60, 50, 54]), 0.6);
      const st = Sh.kind === 'sandal' ? 0.05 : SH.pumps.st;
      const foot = piece(keyOf('foot', fc, !!sockOn), () => shoeBuild('foot', fc, null, fc, !!sockOn));
      const Mf = new THREE.Matrix4().makeTranslation(lx, st * fl, SZ0 * fl).multiply(new THREE.Matrix4().makeScale(fl, fl, fl * SL));
      out.add(foot, 'footL', Mf);
      out.add(foot, 'footL', Mf, true);
    }
    const shoe = Sh.kind === 'sandal' ? piece(keyOf('sandal', col), () => SANDAL_BUILD(col)) : piece(keyOf('shoe', Sh.kind, col, col2, lining), () => shoeBuild(Sh.kind, col, col2, lining));
    out.add(shoe, 'footL', M);
    out.add(shoe, 'footL', M, true);
    if (SHAFT[Sh.kind]) {
      const top = P.ankleY + SHAFT[Sh.kind] * H, tw = P.thighX, mid = P.kneeY - 0.1 * H;
      const wide = spec.bottom?.wide ? 0.86 / 0.37 : 1;
      const shin = { lx: P.hipX, b0: [tw * 0.37 * Math.min(wide, 1.6), tw * 0.42 * Math.min(wide, 1.6)], b1: [tw * 0.64 * Math.min(wide, 1.25), tw * 0.7 * Math.min(wide, 1.25)], y0s: P.ankleY - 0.006 * H, y1s: mid };
      const sh = piece(keyOf('shaft', Sh.kind, col, Math.round(top * 1000), Math.round(P.hipX * 1000), Math.round(tw * 1000), Math.round(P.ankleY * 1000), Math.round(mid * 1000), wide), () => shaftBuild(Sh.kind, col, shin, top, P.ankleY - 0.02 * H));
      out.add(sh, 'shinL', new THREE.Matrix4());
      out.add(sh, 'shinL', new THREE.Matrix4(), true);
    }
  }
  if (!out.idx.length) return null;
  return out;
}
