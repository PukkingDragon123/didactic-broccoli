// The garage interior detail pass: everything that makes Grandpa's garage read as a real, lived-in Shōwa garage
// turned gacha corner, built as a handful of merged static meshes (one per material) so it stays cheap on phones.
//   * surfaces: worn slab decals (oil, tyre tracks, cracks, scuffs, paint), a vinyl P-tile gacha corner, a trench
//     drain, banded contact AO along every floor / wall / ceiling junction and under the furniture, grime bands;
//   * structure: wooden joists, steel H-beams, wall columns and girts, skirting, conduit and old knob-and-tube wiring
//     with porcelain insulators, a breaker panel, outlets with plugged-in cables, inverted-Fuji fluorescent fixtures;
//   * dressing: coin changer, capsule return box, fire buckets, the sink with its gas water heater, a high shelf of
//     clutter, window-sill plants and a wind chime, handwritten cards, kids' drawings, a clock and a tear-off calendar;
//   * fake light: additive pixel halos on the ceiling / walls / floor that follow the tubes (no extra real lights).
// Contract: new GarageDetail(garage, G) after the garage's furniture and lights exist; update() once per frame.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { worldBox } from '../gfx/geo.js';
import { tex } from '../gfx/textures.js';
import { decalAtlas, cardAtlas } from '../gfx/garageArt.js';
import { propGeometry, propSize, hasProp } from './props.js';
import { voxelMaterials } from '../voxel/materials.js';
import { hash2 } from '../core/util.js';

const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// ------------------------------------------------------------------------------------------------ materials
const surfCache = new Map();
/**
 * Pixel-art recipe material at a TRUE pixel density (px per metre) for world-metre UVs (worldBox / batch boxes).
 * (geo.js pixMat's ppm option scales the other way: ppm 64 there gives 16 px/m.)
 */
export function surfMat(key, { ppm = 64, roughness = 0.85, metalness = 0, bump = 0.4, color = 0xffffff, env = 1, vertexColors = false } = {}) {
  const ck = [key, ppm, roughness, metalness, bump, color, env, vertexColors].join('|');
  if (surfCache.has(ck)) return surfCache.get(ck);
  const t = tex(key);
  const pw = t.size[0] * 32, ph = t.size[1] * 32;
  const map = t.map.clone();
  map.needsUpdate = true;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(ppm / pw, ppm / ph);
  let bm = null;
  if (bump) { bm = t.bump.clone(); bm.needsUpdate = true; bm.wrapS = bm.wrapT = THREE.RepeatWrapping; bm.repeat.copy(map.repeat); }
  const m = new THREE.MeshStandardMaterial({ map, bumpMap: bm, bumpScale: bump, roughness, metalness, color, envMapIntensity: env, vertexColors });
  surfCache.set(ck, m);
  return m;
}
const flat = (roughness, metalness = 0, extra = {}) => new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness, metalness, ...extra });

// ------------------------------------------------------------------------------------------------ batcher
const _c = new THREE.Color();
/** Static geometry batcher: transformed boxes / quads / tubes with baked vertex colours (tint × AO), merged per material. */
/** Whether static geometry at (centre) can catch light that casts shadows: the low sun only reaches the front of the
 *  room below ~2.3 m (through the shutter), the desk spot only the work table. Everything else skips the shadow maps. */
const castsAt = (c) => c.z > -1.7 && c.y < 2.3;

export class Batch {
  constructor(shade) { this.lists = new Map(); this.casters = new Map(); this.shade = shade; }
  /** Add a geometry already in world space. o: tint, k (brightness), alpha (needs an RGBA material), ao (false = no AO), src (halo source). */
  geo(mat, g, o = {}) {
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    const pos = g.attributes.position, n = pos.count;
    const rgba = !!mat.userData.rgba;
    const col = new Float32Array(n * (rgba ? 4 : 3));
    _c.set(o.tint ?? 0xffffff);
    const k = o.k ?? 1;
    for (let i = 0; i < n; i++) {
      const f = o.ao === false ? 1 : this.shade(pos.getX(i), pos.getY(i), pos.getZ(i));
      if (rgba) { col[i * 4] = _c.r * k; col[i * 4 + 1] = _c.g * k; col[i * 4 + 2] = _c.b * k; col[i * 4 + 3] = (o.alpha ?? 1); }
      else { col[i * 3] = _c.r * k * f; col[i * 3 + 1] = _c.g * k * f; col[i * 3 + 2] = _c.b * k * f; }
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, rgba ? 4 : 3));
    if (mat.userData.halo) g.setAttribute('aSrc', new THREE.BufferAttribute(new Float32Array(n).fill(o.src ?? 2), 1));
    if (g.index) g = g.toNonIndexed();
    let cast = o.cast;
    if (cast === undefined) { g.computeBoundingBox(); cast = castsAt(g.boundingBox.getCenter(new THREE.Vector3())); }
    const map = cast && !mat.transparent && !mat.userData.noCast && !mat.userData.halo ? this.casters : this.lists;
    if (!map.has(mat)) map.set(mat, []);
    map.get(mat).push(g);
    return g;
  }
  /** Box with its bottom at y. o: rx, ry, rz (about the box centre), unit (0..1 UVs), uv offset, plus geo() options. */
  box(mat, w, h, d, x, y, z, o = {}) {
    const g = o.unit ? new THREE.BoxGeometry(w, h, d) : worldBox(w, h, d);
    if (o.uv) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) + o.uv[0], uv.getY(i) + o.uv[1]); }
    if (o.rx) g.rotateX(o.rx);
    if (o.rz) g.rotateZ(o.rz);
    if (o.ry) g.rotateY(o.ry);
    g.translate(x, y + h / 2, z);
    return this.geo(mat, g, o);
  }
  /** Rectangle from corner p0 spanning a (u axis) and b (v axis); rect = atlas [u0, v0, u1, v1] or world-metre UVs. */
  quad(mat, p0, a, b, o = {}) {
    const p1 = p0.clone().add(a), p2 = p1.clone().add(b), p3 = p0.clone().add(b);
    const nrm = a.clone().cross(b).normalize();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([...p0.toArray(), ...p1.toArray(), ...p2.toArray(), ...p3.toArray()], 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([...nrm.toArray(), ...nrm.toArray(), ...nrm.toArray(), ...nrm.toArray()], 3));
    let uv;
    if (o.rect) { const [u0, v0, u1, v1] = o.rect; uv = o.flipU ? [u1, v0, u0, v0, u0, v1, u1, v1] : [u0, v0, u1, v0, u1, v1, u0, v1]; }
    else { const la = a.length(), lb = b.length(), s = o.uvScale || 1; uv = [0, 0, la * s, 0, la * s, lb * s, 0, lb * s]; }
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    return this.geo(mat, g, o);
  }
  /** Decal / card on a wall or floor. face: '+x' '-x' '+z' '-z' (wall normal) or '+y' (floor) / '-y' (ceiling). (x, y, z) = centre. */
  sticker(mat, rect, face, x, y, z, w, h, o = {}) {
    const rot = o.rot || 0, c = Math.cos(rot), s = Math.sin(rot);
    let U, Vv;
    if (face === '+y') { U = V3(c, 0, -s); Vv = V3(-s, 0, -c); }
    else if (face === '-y') { U = V3(c, 0, s); Vv = V3(-s, 0, c); }
    else {
      const n = { '+x': V3(1, 0, 0), '-x': V3(-1, 0, 0), '+z': V3(0, 0, 1), '-z': V3(0, 0, -1) }[face];
      const right = V3(0, 1, 0).cross(n); // viewer's right when facing the wall
      U = right.clone().multiplyScalar(c).add(V3(0, s, 0));
      Vv = V3(0, c, 0).sub(right.clone().multiplyScalar(s));
    }
    const a = U.multiplyScalar(w), b = Vv.multiplyScalar(h);
    const p0 = V3(x, y, z).sub(a.clone().multiplyScalar(0.5)).sub(b.clone().multiplyScalar(0.5));
    return this.quad(mat, p0, a, b, { ...o, rect });
  }
  /** Round-section tube through points. */
  tube(mat, pts, r, o = {}) {
    const curve = pts.length > 2 ? new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.2) : new THREE.LineCurve3(pts[0], pts[1]);
    const g = new THREE.TubeGeometry(curve, o.seg || Math.max(2, pts.length * 4), r, o.radial || 5, false);
    return this.geo(mat, g, o);
  }
  build(parent, { cast = false, receive = true, order = 0 } = {}) {
    const out = [];
    for (const [castList, lists] of [[false, this.lists], [true, this.casters]]) for (const [mat, list] of lists) {
      const g = mergeGeometries(list, false);
      for (const x of list) x.dispose();
      if (!g) continue;
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, mat);
      m.castShadow = cast && castList;
      m.receiveShadow = receive && !mat.userData.halo;
      m.matrixAutoUpdate = false;
      if (mat.userData.order) m.renderOrder = mat.userData.order;
      else if (order) m.renderOrder = order;
      m.userData.noRim = true;
      m.name = 'garageDetail:' + (mat.name || mat.type);
      parent.add(m);
      out.push(m);
    }
    this.lists.clear(); this.casters.clear();
    return out;
  }
}

/** Voxel props merged into one mesh per voxel material (static, no per-prop draw calls). */
export class PropBatch {
  constructor() { this.sets = new Map(); }
  add(id, x, y, z, ry = 0, s = 1, cast = undefined) {
    const geo = propGeometry(id);
    if (!geo) return null;
    if (cast === undefined) cast = castsAt(V3(x, y + geo.userData.size.y * s / 2, z));
    // six regions (left / right half × back / middle / front band) so what's off screen gets frustum-culled
    const key = (cast ? 'c' : 'n') + (x < 0 ? 'L' : 'R') + (z < -1.7 ? 'b' : z < 1.7 ? 'm' : 'f');
    if (!this.sets.has(key)) this.sets.set(key, { cast, lists: [[], [], [], [], []] });
    const lists = this.sets.get(key).lists;
    const m = new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), ry), V3(s, s, s));
    for (const gr of geo.groups) {
      // groups are contiguous vertex ranges (the mesher appends quads material by material)
      const idx = geo.index.array;
      let lo = Infinity, hi = -1;
      for (let i = gr.start; i < gr.start + gr.count; i++) { const v = idx[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
      const sub = new THREE.BufferGeometry();
      for (const name of ['position', 'normal', 'color']) {
        const a = geo.attributes[name];
        sub.setAttribute(name, new THREE.BufferAttribute(a.array.slice(lo * a.itemSize, (hi + 1) * a.itemSize), a.itemSize));
      }
      const ind = new Uint32Array(gr.count);
      for (let i = 0; i < gr.count; i++) ind[i] = idx[gr.start + i] - lo;
      sub.setIndex(new THREE.BufferAttribute(ind, 1));
      sub.applyMatrix4(m);
      lists[gr.materialIndex].push(sub);
    }
    return true;
  }
  build(parent, cast = true) {
    const mats = voxelMaterials('normal');
    for (const [key, set] of this.sets) set.lists.forEach((list, i) => {
      if (!list.length) return;
      const g = mergeGeometries(list, false);
      for (const x of list) x.dispose();
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, mats[i]);
      m.castShadow = cast && set.cast && i !== 4 && i !== 3;
      m.receiveShadow = true;
      m.matrixAutoUpdate = false;
      m.userData.noRim = true;
      m.name = 'garageDetail:props-' + key + i;
      parent.add(m);
    });
    this.sets.clear();
  }
}

/** The garage's shared static batches: SB (boxes / quads, baked AO by height and corners) and PB (voxel props). */
export function garageBatches(G) {
  const H = G.height;
  const SB = new Batch((x, y, z) => {
    let f = 0.6 + 0.4 * sstep(0, 0.45, y);
    f *= 1 - 0.14 * sstep(H - 0.5, H, y);
    const dx = Math.min(x - G.minX, G.maxX - x), dz = Math.min(z - G.minZ, G.maxZ - z);
    f *= 1 - 0.22 * (1 - sstep(0, 0.7, dx)) * (1 - sstep(0, 0.7, dz));
    return f;
  });
  return { SB, PB: new PropBatch() };
}

/** Bake a static mesh tree (already positioned in the garage group's space) into a batch instead of adding it. */
export function bakeInto(B, obj, parentMatrix = null) {
  obj.updateMatrix();
  const mw = parentMatrix ? parentMatrix.clone().multiply(obj.matrix) : obj.matrix.clone();
  if (obj.isMesh && obj.geometry && obj.visible) {
    if (!Array.isArray(obj.material)) B.geo(obj.material, obj.geometry.clone().applyMatrix4(mw), { ao: false });
    else {
      // multi-material (e.g. a framed print: art on the front face, frame on the rest): one piece per group
      const src = obj.geometry.index ? obj.geometry.toNonIndexed() : obj.geometry;
      for (const gr of src.groups) {
        const sub = new THREE.BufferGeometry();
        for (const [name, at] of Object.entries(src.attributes)) sub.setAttribute(name, new THREE.BufferAttribute(at.array.slice(gr.start * at.itemSize, (gr.start + gr.count) * at.itemSize), at.itemSize));
        B.geo(obj.material[gr.materialIndex], sub.applyMatrix4(mw), { ao: false });
      }
    }
  }
  for (const c of obj.children) bakeInto(B, c, mw);
}

/** Place a voxel prop into a prop batch with optional player obstacle / capsule collider (from its bounds). */
export function placeProp(game, PB, id, x, y, z, ry = 0, { scale = 1, block = false, phys = false, pad = 0.02, material = 'wood', cast = undefined } = {}) {
  if (!hasProp(id)) return null;
  PB.add(id, x, y, z, ry, scale, cast);
  const s = propSize(id).multiplyScalar(scale);
  const c = Math.abs(Math.cos(ry)), sn = Math.abs(Math.sin(ry));
  const ex = (s.x * c + s.z * sn) / 2, ez = (s.x * sn + s.z * c) / 2;
  if (block) game.player.addObstacle(x - ex - pad, x + ex + pad, z - ez - pad, z + ez + pad);
  if (phys) game.physics.addBox({ center: V3(x, y + s.y / 2, z), half: V3(ex, s.y / 2, ez), material });
  return s;
}

// additive pixel halo: radial falloff quantised to 24 steps, brightness per light source (uK)
const HALO_VS = `attribute float aSrc; uniform vec4 uK; varying vec3 vC; varying vec2 vUv;
  void main(){ vUv = uv; float k = aSrc < 0.5 ? uK.x : aSrc < 1.5 ? uK.y : aSrc < 2.5 ? uK.z : uK.w;
    vC = color * k; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const HALO_FS = `varying vec3 vC; varying vec2 vUv;
  void main(){ vec2 q = floor((vUv - 0.5) * 24.0 + 0.5) / 24.0; float d = length(q) * 2.0;
    float a = pow(max(0.0, 1.0 - d), 2.2); gl_FragColor = vec4(vC * a, 1.0); }`;

// ------------------------------------------------------------------------------------------------ detail
export class GarageDetail {
  constructor(garage, G) {
    this.garage = garage;
    this.game = garage.game;
    this.G = G;
    this.group = new THREE.Group();
    this.group.name = 'garageDetail';
    garage.group.add(this.group);
    this.B = garage.SB;
    this.P = garage.PB;
    this.initMats();
    this.floor();
    this.structure();
    this.fixtures();
    this.electrical();
    this.walls();
    this.dressing();
    this.ao();
    this.halos();
  }

  initMats() {
    const D = decalAtlas(), K = cardAtlas();
    this.D = D; this.K = K;
    const decal = (rough, metal = 0, order = 0) => {
      const m = new THREE.MeshStandardMaterial({ map: D.tex, vertexColors: true, alphaTest: 0.5, roughness: rough, metalness: metal, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
      m.userData.noCast = true; m.name = 'decal' + order;
      return m;
    };
    const ao = new THREE.MeshBasicMaterial({ color: 0x000000, vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
    ao.map = this.aoTex(); ao.userData.rgba = true; ao.userData.order = 1; ao.name = 'ao';
    const halo = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, side: THREE.DoubleSide,
      uniforms: { uK: { value: new THREE.Vector4(1, 1, 1, 1) } }, vertexShader: HALO_VS, fragmentShader: HALO_FS,
    });
    halo.userData.halo = true; halo.userData.order = 2; halo.name = 'halo';
    this.haloMat = halo;
    const card = new THREE.MeshStandardMaterial({ map: K.tex, vertexColors: true, alphaTest: 0.5, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2, side: THREE.DoubleSide });
    card.name = 'cards';
    const glowM = new THREE.MeshBasicMaterial({ vertexColors: true }); glowM.color.setScalar(1.6); glowM.name = 'glow';
    this.m = {
      decal: decal(0.85), oil: decal(0.5, 0.02, 1), card, ao, halo, glow: glowM,
      wood: surfMat('woodDark', { ppm: 48, roughness: 0.75, bump: 0.3, vertexColors: true }),
      woodL: surfMat('woodLight', { ppm: 48, roughness: 0.7, bump: 0.3, vertexColors: true }),
      ply: surfMat('plywoodHD', { ppm: 64, roughness: 0.78, bump: 0.25, vertexColors: true }),
      tile: surfMat('pTile', { ppm: 66.6667, roughness: 0.42, bump: 0.15, vertexColors: true }),
      cb: surfMat('cardboard', { ppm: 64, roughness: 0.95, bump: 0.3, vertexColors: true }),
      steel: flat(0.42, 0.55), paint: flat(0.72), gloss: flat(0.32), rubber: flat(0.92), white: flat(0.4),
      chrome: flat(0.22, 0.9),
    };
    for (const [k, v] of Object.entries(this.m)) if (!v.name) v.name = k;
  }

  /** 64 × 32 alpha atlas: left = banded edge gradient (u 0 → 1 fades out), right = soft banded rectangle. */
  aoTex() {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 32;
    const ctx = c.getContext('2d'), img = ctx.createImageData(64, 32);
    const steps = 7;
    for (let y = 0; y < 32; y++) for (let x = 0; x < 64; x++) {
      let a;
      if (x < 32) a = Math.pow(1 - x / 31, 1.7);
      else { const u = (x - 32 + 0.5) / 32, v = (y + 0.5) / 32; const e = Math.min(u, 1 - u, v, 1 - v) * 2; a = Math.pow(Math.min(1, e / 0.75), 1.2); }
      a = Math.round(a * steps) / steps;
      const i = (y * 64 + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = Math.round(a * 255);
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
    t.colorSpace = THREE.NoColorSpace;
    return t;
  }

  /** Decal on the floor / walls / ceiling from the decal atlas. */
  decal(name, face, x, y, z, w, h, o = {}) {
    return this.B.sticker(o.oil ? this.m.oil : this.m.decal, this.D.rect(name), face, x, y, z, w, h, { ao: false, ...o });
  }
  card(name, face, x, y, z, w, h, o = {}) {
    return this.B.sticker(this.m.card, this.K.rect(name), face, x, y, z, w, h, { ao: false, ...o });
  }
  /** A voxel prop merged into the static mesh; block = player obstacle, phys = capsule collider (axis-aligned bounds). */
  prop(id, x, y, z, ry = 0, o = {}) { return placeProp(this.game, this.P, id, x, y, z, ry, o); }

  // ---------------------------------------------------------------------------------------------- floor
  floor() {
    const G = this.G, B = this.B, m = this.m;
    const F = (n, x, z, w, h, o = {}) => this.decal(n, '+y', x, 0.0015 + (o.lift || 0), z, w, h, o);
    // where Grandpa's car used to stand: oil, drips and faded tyre tracks running in from the shutter
    F('oilBig', 0.35, -1.75, 1.6, 1.2, { rot: 0.25, oil: true, tint: 0xb4ada2 });
    F('oilSmall', -0.15, 3.05, 0.9, 0.68, { rot: -0.4, oil: true, tint: 0xb8b1a6 });
    F('oilDrips', 0.9, -0.95, 0.5, 0.5, { oil: true, tint: 0xbab4aa });
    F('oilDrips', -0.55, 2.35, 0.45, 0.45, { rot: 1.2, oil: true, tint: 0xbab4aa });
    for (const x of [-0.78, 0.82]) for (let k = 0; k < 2; k++) F('tyre', x + k * 0.04, 3.3 - k * 1.9, 0.2, 1.9, { rot: 0.02 * (k ? -1 : 1), tint: 0x9a958c, lift: 0.0002 });
    // cracks, a mortar patch, scuffs and spilt paint
    F('crack', 2.1, 1.85, 1.6, 0.8, { rot: 0.6, tint: 0xd0cac0 });
    F('crack', -1.6, -3.1, 1.4, 0.7, { rot: -0.9, tint: 0xd0cac0 });
    F('crack', 1.9, 3.95, 1.2, 0.6, { rot: 2.2, tint: 0xd0cac0 });
    F('patch', -1.15, -0.85, 0.9, 0.6, { rot: 0.3, tint: 0xa8a39a });
    F('paintBlue', 1.45, -0.75, 0.42, 0.42, { rot: 0.4, tint: 0xd0d8e8 });
    F('paintWhite', 2.75, -4.3, 0.5, 0.5, { rot: 1.1, tint: 0xe8e4dc });
    F('rings', 3.05, -4.55, 0.3, 0.3, { tint: 0xc0b8ac });
    F('rings', -2.6, -4.2, 0.28, 0.28, { rot: 1, tint: 0xc0b8ac });
    for (const sz of [-3.35, -2.3, -1.25, -0.2, 0.85, 1.9]) F('scuffs', -2.75, sz, 0.6, 0.3, { rot: Math.PI / 2 + (hash2(sz * 10, 3) - 0.5) * 0.6, tint: 0xd8d2c8, lift: 0.0072 });
    for (const sz of [-0.55, 1.25, 3.05]) F('scuffs', 3.3, sz, 0.5, 0.25, { rot: Math.PI / 2, tint: 0xf0eae0 });
    F('scuffs', 0.2, 4.2, 1.3, 0.65, { rot: 0.1, tint: 0xd8d2c8 });
    F('scuffs', 3.0, -3.0, 0.7, 0.35, { rot: 0.8, tint: 0xd8d2c8 });
    F('prints', 0.15, -3.6, 0.4, 0.8, { rot: 0.15, tint: 0xb0aa9e });
    F('damp', 2.55, -4.55, 0.9, 0.55, { tint: 0x8e8a82 });
    F('damp', 0.6, 4.45, 1.4, 0.5, { rot: 0.1, tint: 0x8e8a82 });
    F('dust', -3.3, 4.6, 0.9, 0.9, { tint: 0xc0b8aa });
    F('dust', 3.55, 2.0, 0.7, 0.7, { rot: 1.4, tint: 0xc0b8aa });
    F('dust', -0.95, -4.55, 0.8, 0.8, { tint: 0xc0b8aa });
    // dust drifted along the wall feet (tiles across, wall side first)
    // (a x b must point up: walk each wall so the room is on the left of the walking direction)
    const edge = (x0, z0, dx, dz, len, nx, nz, y = 0.0018) => {
      const r = this.D.rect('dustEdge');
      for (let s = 0; s < len - 0.01; s += 2) {
        const l = Math.min(2, len - s), w = 0.42;
        B.quad(m.decal, V3(x0 + dx * s, y, z0 + dz * s), V3(dx * l, 0, dz * l), V3(nx * w, 0, nz * w), { ao: false, tint: 0xb8b2a6, rect: [r[0], r[3], r[0] + (r[2] - r[0]) * (l / 2), r[1]] });
      }
    };
    edge(G.minX, G.minZ, 0, 1, 10, 1, 0, 0.0085);
    edge(G.maxX, G.maxZ, 0, -1, 10, -1, 0);
    edge(G.maxX, G.minZ, -1, 0, 8, 0, 1);
    edge(G.minX, G.maxZ, 1, 0, 1, 0, -1); edge(3.0, G.maxZ, 1, 0, 1, 0, -1);
    // vinyl P-tile floor laid over the slab for the gacha corner, with an aluminium edge strip
    const T = { x0: G.minX + 0.02, x1: -2.2, z0: -3.78, z1: 2.42 };
    const tile = B.box(m.tile, T.x1 - T.x0, 0.006, T.z1 - T.z0, (T.x0 + T.x1) / 2, 0, (T.z0 + T.z1) / 2, { tint: 0xf4f0e8 });
    void tile;
    B.box(m.chrome, 0.03, 0.008, T.z1 - T.z0 + 0.03, T.x1 + 0.015, 0, (T.z0 + T.z1) / 2, { tint: 0xc8ccd0, ao: false });
    for (const z of [T.z0 - 0.015, T.z1 + 0.015]) B.box(m.chrome, T.x1 - T.x0, 0.008, 0.03, (T.x0 + T.x1) / 2, 0, z, { tint: 0xc8ccd0, ao: false });
    // trench drain with a steel grating along the shutter threshold
    const dz = G.maxZ - 0.32;
    this.decal('grate', '+y', 0, 0.002, dz, 5.8, 0.16, { tint: 0xffffff });
    for (const s of [-1, 1]) B.box(m.steel, 5.84, 0.006, 0.025, 0, 0, dz + s * 0.092, { tint: 0x7a7670 });
    // a worn yellow "keep clear" box painted in front of the back door
    const Y = (x, z, w, rot) => F('yline', x, z, w, 0.05, { rot, tint: 0xffffff, lift: 0.0003 });
    Y(0, G.minZ + 1.2, 1.5, 0); Y(-0.75, G.minZ + 0.6, 1.2, Math.PI / 2); Y(0.75, G.minZ + 0.6, 1.2, Math.PI / 2);
    for (let i = 0; i < 4; i++) Y(-0.45 + i * 0.3, G.minZ + 0.6, 0.62, Math.PI / 4);
  }

  // ---------------------------------------------------------------------------------------------- structure
  structure() {
    const G = this.G, B = this.B, m = this.m, H = G.height;
    // wooden ceiling joists along z under the plywood, every 60 cm
    this.joistX = [];
    for (let i = 0; i <= 12; i++) {
      const x = -3.6 + i * 0.6;
      this.joistX.push(x);
      B.box(m.wood, 0.05, 0.1, 10.0, x, H - 0.1, 0, { tint: 0xc8b8a4 });
    }
    // perimeter plate where ceiling meets the walls
    for (const s of [-1, 1]) B.box(m.wood, 0.08, 0.1, 10.0, s * (G.maxX - 0.04), H - 0.1, 0, { tint: 0xb8a894 });
    B.box(m.wood, 8.0, 0.1, 0.08, 0, H - 0.1, G.minZ + 0.04, { tint: 0xb8a894 });
    // steel H-beams across (top flange, web, bottom flange) with stiffeners and bolt plates
    for (const z of [-3.4, -0.6, 2.2]) {
      const top = H - 0.1;
      B.box(m.steel, 8.0, 0.016, 0.15, 0, top - 0.016, z, { tint: 0x7c8288 });
      B.box(m.steel, 8.0, 0.2, 0.012, 0, top - 0.216, z, { tint: 0x747a80 });
      B.box(m.steel, 8.0, 0.016, 0.15, 0, top - 0.232, z, { tint: 0x7c8288 });
      for (let x = -3.4; x <= 3.4; x += 1.7) for (const s of [-1, 1]) B.box(m.steel, 0.012, 0.2, 0.065, x, top - 0.216, z + s * 0.039, { tint: 0x6a7076 });
      for (const s of [-1, 1]) B.box(m.steel, 0.02, 0.26, 0.2, s * (G.maxX - 0.01), top - 0.25, z, { tint: 0x6a7076 });
      // rust bloom on the bottom flange near the walls
      for (const s of [-1, 1]) this.decal('rust', '-y', s * 3.75, top - 0.233, z, 0.07, 0.4, { rot: Math.PI / 2, tint: 0xd0b8a8 });
    }
    // left wall: steel columns under the beams (none through the window) and girts
    for (const z of [-3.4, -0.6]) {
      const x = G.minX;
      B.box(m.steel, 0.012, H - 0.1, 0.15, x + 0.006, 0, z, { tint: 0x6e747a });
      B.box(m.steel, 0.12, H - 0.1, 0.012, x + 0.06, 0, z, { tint: 0x747a80 });
      B.box(m.steel, 0.012, H - 0.1, 0.15, x + 0.126, 0, z, { tint: 0x7c8288 });
      B.box(m.steel, 0.2, 0.012, 0.22, x + 0.1, 0, z, { tint: 0x5a6066 });
      for (const dz of [-0.06, 0.06]) B.box(m.chrome, 0.03, 0.02, 0.02, x + 0.03, 0.012, z + dz, { tint: 0x9aa0a6 });
    }
    // a short knee brace above the window where the third beam lands
    B.box(m.steel, 0.12, 0.42, 0.012, G.minX + 0.06, H - 0.52, 2.2, { tint: 0x747a80 });
    // girts: a timber cap on the block skirting and a steel channel above the window
    B.box(m.wood, 0.07, 0.04, 10.0, G.minX + 0.035, 1.0, 0, { tint: 0xa89a88 });
    B.box(m.steel, 0.06, 0.1, 10.0, G.minX + 0.03, 2.66, 0, { tint: 0x7a8086 });
    // right wall: dark skirting board and a dado batten
    B.box(m.wood, 0.018, 0.09, 10.0, G.maxX - 0.009, 0, 0, { tint: 0x8a6a50 });
    // back wall: a concrete step / plinth line and a cast ledge at the base
    for (const [x0, x1] of [[G.minX, -G.doorHalf - 0.06], [G.doorHalf + 0.06, G.maxX]]) B.box(m.paint, x1 - x0, 0.08, 0.02, (x0 + x1) / 2, 0, G.minZ + 0.01, { tint: 0x8a867e });
    // front piers: steel angle edge guards with hazard paint
    for (const s of [-1, 1]) {
      const x = s * 3.0;
      B.box(m.steel, 0.05, 1.1, 0.05, x + s * 0.025, 0, G.maxZ - 0.025, { tint: 0x8a8e92 });
      this.decal('hazard', '-z', x + s * 0.11, 0.55, G.maxZ - 0.0015, 1.1, 0.12, { rot: Math.PI / 2, tint: 0xffffff });
    }
  }

  // ---------------------------------------------------------------------------------------------- light fixtures
  /** Inverted-Fuji (逆富士) twin-tube fixture at (x, z): white body, sloped reflectors, sockets, hangers. tubeMat = shared emissive. */
  fixture(x, z, tubeMat, { tubes = true, body = true, len = 1.3 } = {}) {
    const B = this.B, m = this.m, H = this.G.height;
    const top = H - 0.18;
    if (body) B.box(m.white, 0.24, 0.022, len, x, top, z, { tint: 0xf2f0ea });
    // reflectors slope in towards the narrow bottom plate that carries the sockets (wide at the ceiling: 逆富士)
    for (const s of [-1, 1]) B.box(m.white, 0.006, 0.09, len - 0.02, x + s * 0.085, top - 0.085, z, { rz: -s * 0.7, tint: 0xf6f4ee, ao: false });
    B.box(m.white, 0.118, 0.012, len, x, top - 0.085, z, { tint: 0xe8e6e0, ao: false });
    for (const s of [-1, 1]) {
      B.box(m.white, 0.22, 0.04, 0.012, x, top - 0.04, z + s * len / 2, { tint: 0xe8e6e0, ao: false });
      B.box(m.white, 0.15, 0.045, 0.012, x, top - 0.085, z + s * len / 2, { tint: 0xe8e6e0, ao: false });
      B.box(m.gloss, 0.11, 0.032, 0.035, x, top - 0.118, z + s * (len / 2 - 0.035), { tint: 0xd8d4c8, ao: false });
      B.box(m.chrome, 0.008, H - 0.1 - top - 0.022, 0.008, x + s * 0.08, top + 0.022, z + s * 0.35, { tint: 0x9aa0a6, ao: false });
    }
    // glow starter (点灯管) and the brand sticker
    B.box(m.gloss, 0.02, 0.02, 0.02, x + 0.07, top - 0.03, z - len / 2 + 0.15, { tint: 0xd8e0f0, ao: false });
    if (tubes) for (const s of [-1, 1]) {
      const g = new THREE.CylinderGeometry(0.014, 0.014, len - 0.08, 8);
      g.rotateX(Math.PI / 2); g.translate(x + s * 0.034, top - 0.108, z);
      B.geo(tubeMat, g, { ao: false });
    }
    return top;
  }

  fixtures() {
    const G = this.G, H = G.height;
    const tubes = this.garage.lights.tubes;
    const mat0 = tubes[0].mat;
    // the two real fixtures (tubes[0] back, tubes[1] front = the dead one in a new game) get bodies around their tubes
    for (const t of tubes) {
      const p = t.light.position;
      this.fixture(p.x, p.z, null, { tubes: false, body: false });
    }
    // extra fixtures on the same switch (emissive only; their light is faked with halos)
    this.extraFix = [[-2.4, -2.0], [-2.4, 0.8], [2.4, -2.0], [2.4, 0.8], [0, 3.6]];
    for (const [x, z] of this.extraFix) this.fixture(x, z, mat0);
    // enamel pendant over the PC desk with a pull cord
    const D = this.garage.pcDesk;
    if (hasProp('shop_lamp')) this.prop('shop_lamp', D.x - 0.1, H - 0.1 - 0.68, D.z + 0.1, 0);
    this.B.box(this.m.paint, 0.004, 0.5, 0.004, D.x - 0.04, H - 0.1 - 1.1, D.z + 0.16, { tint: 0xe8e0c8, ao: false });
    this.B.box(this.m.gloss, 0.016, 0.03, 0.016, D.x - 0.04, H - 0.1 - 1.13, D.z + 0.16, { tint: 0xd8c8a0, ao: false });
  }

  // ---------------------------------------------------------------------------------------------- electrical
  electrical() {
    const G = this.G, B = this.B, m = this.m, H = G.height;
    const pvc = (pts, r = 0.011) => B.tube(m.gloss, pts, r, { tint: 0xb8b8b0, radial: 6 });
    const box = (w, h, d, x, y, z, tint = 0xe8e6de) => B.box(m.gloss, w, h, d, x, y, z, { tint });
    // breaker panel by the back door with conduits up to the ceiling
    const bx = 1.12, by = 1.8, bz = G.minZ;
    box(0.3, 0.42, 0.1, bx, by, bz + 0.05, 0xc8c8c0);
    this.card('breaker', '+z', bx, by + 0.21, bz + 0.1015, 0.28, 0.4);
    this.decal('smudge', '+z', bx + 0.08, by + 0.12, bz + 0.0012, 0.2, 0.2, { tint: 0x9a968e });
    for (const dx of [-0.09, 0, 0.09]) pvc([V3(bx + dx, by + 0.42, bz + 0.03), V3(bx + dx, H - 0.1, bz + 0.03)], 0.012);
    // old knob-and-tube wiring along the joists: twin black cable on white porcelain knobs, to every fixture
    const knobs = new Map();
    const run = (pts) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], n = Math.max(1, Math.floor(a.distanceTo(b) / 0.55));
        B.tube(m.rubber, [a, b], 0.0045, { tint: 0x222020, radial: 4, seg: 1 });
        for (let k = 0; k <= n; k++) { const p = a.clone().lerp(b, k / n); knobs.set(p.toArray().map((v) => Math.round(v * 20)).join(), p); }
      }
    };
    const yC = H - 0.1 - 0.012;
    // main run from the breaker up the back wall, along the back plate, then down the joists to the fixtures
    for (const [fx, fz] of [[0, -2.0], [0, 0.8], ...this.extraFix]) {
      const jx = this.joistX.reduce((a, b) => (Math.abs(b - fx) < Math.abs(a - fx) ? b : a)) + 0.045;
      run([V3(bx + 0.09, H - 0.06, bz + 0.08), V3(jx, H - 0.06, bz + 0.08), V3(jx, yC, bz + 0.3), V3(jx, yC, fz - 0.4)]);
      B.tube(m.rubber, [V3(jx, yC, fz - 0.4), V3(fx + 0.05, H - 0.2, fz - 0.45)], 0.004, { tint: 0x222020, radial: 4 });
    }
    // run for the gacha sign and lanterns along the left wall top
    run([V3(G.minX + 0.05, H - 0.15, -4.8), V3(G.minX + 0.05, H - 0.15, 4.6)]);
    for (const p of knobs.values()) box(0.022, 0.022, 0.022, p.x, p.y - 0.011, p.z, 0xf4f2ea);
    // round porcelain junction boxes
    for (const [x, z] of [[0.045, -4.4], [-2.355, -4.4], [2.445, -4.4], [0.045, 2.6]]) {
      const g = new THREE.CylinderGeometry(0.045, 0.045, 0.03, 10);
      g.translate(x, yC - 0.015, z);
      B.geo(m.gloss, g, { tint: 0xf0eee6 });
    }
    // left wall: grey conduit with an outlet behind each machine slot and a fat cable into the machine
    const wx = G.minX + 0.02;
    pvc([V3(wx, 0.42, -4.4), V3(wx, 0.42, 2.25)], 0.012);
    pvc([V3(wx, 0.42, -4.4), V3(wx, H - 0.15, -4.4)], 0.012);
    for (const sz of [-3.35, -2.3, -1.25, -0.2, 0.85, 1.9]) {
      const oz = sz + 0.3;
      box(0.04, 0.11, 0.075, G.minX + 0.02, 0.36, oz);
      box(0.004, 0.05, 0.04, G.minX + 0.042, 0.39, oz, 0xd8d4c8);
      B.box(m.rubber, 0.025, 0.03, 0.02, G.minX + 0.055, 0.385, oz, { tint: 0x1e1e1e });
      B.tube(m.rubber, [V3(G.minX + 0.07, 0.4, oz), V3(G.minX + 0.16, 0.3, oz - 0.05), V3(G.minX + 0.2, 0.02, oz - 0.15), V3(-3.62, 0.012, sz)], 0.006, { tint: 0x1e1e1e, radial: 4 });
    }
    // right wall: outlet + switch pair near the PC, plus the PC's cord
    box(0.03, 0.12, 0.08, G.maxX - 0.015, 0.32, -4.85);
    B.tube(m.rubber, [V3(G.maxX - 0.03, 0.34, -4.85), V3(3.8, 0.02, -4.6), V3(3.72, 0.02, -4.3)], 0.006, { tint: 0x2a2a2a, radial: 4 });
    // the desk lamp on the work table runs off an outlet by the back door: cord along the floor, gaffer-taped down
    const T = this.garage.table;
    box(0.03, 0.12, 0.08, 0.78, 0.3, G.minZ + 0.015);
    const lx = T.x + T.w / 2 - 0.1, lz = T.z - T.d / 2 + 0.1;
    const cord = [V3(0.78, 0.33, G.minZ + 0.06), V3(0.8, 0.008, G.minZ + 0.25), V3(1.0, 0.006, -3.6), V3(1.12, 0.006, -1.5), V3(lx + 0.02, 0.006, lz - 0.08), V3(lx, 0.05, lz), V3(lx, T.h - 0.07, lz)];
    B.tube(m.rubber, cord, 0.0055, { tint: 0x2a2a2a, radial: 4, seg: 40 });
    for (const [x, z, r] of [[0.98, -3.9, 0.1], [1.05, -2.7, 0.05], [1.12, -1.6, -0.02]]) this.decal('yline', '+y', x, 0.0105, z, 0.06, 0.16, { rot: r + Math.PI / 2, tint: 0x9a9a9a });
    // the light switch gets a label and a grubby halo
    const sw = this.garage.lightSwitch.position;
    this.card('switchTag', '+z', sw.x, sw.y + 0.12, G.minZ + 0.012, 0.11, 0.055);
    this.decal('smudge', '+z', sw.x, sw.y, G.minZ + 0.0013, 0.26, 0.26, { tint: 0x8e8a82 });
    pvc([V3(sw.x, sw.y + 0.07, G.minZ + 0.02), V3(sw.x, H - 0.1, G.minZ + 0.02)], 0.01);
  }

  // ---------------------------------------------------------------------------------------------- walls
  walls() {
    const G = this.G, B = this.B, m = this.m, H = G.height;
    // dithered grime rising from the floor along every wall (tiles every 2 m)
    const grime = (face, x0, z0, dx, dz, len, h, tint) => {
      for (let s = 0; s < len - 0.01; s += 2) {
        const l = Math.min(2, len - s);
        const r = this.D.rect('grime');
        const n = { '+x': V3(1, 0, 0), '-x': V3(-1, 0, 0), '+z': V3(0, 0, 1), '-z': V3(0, 0, -1) }[face];
        const p0 = V3(x0 + dx * s, 0, z0 + dz * s).add(n.clone().multiplyScalar(0.0012));
        B.quad(m.decal, p0, V3(dx * l, 0, dz * l), V3(0, h, 0), { ao: false, tint, rect: [r[0], r[1], r[0] + (r[2] - r[0]) * (l / 2), r[3]], flipU: false });
      }
    };
    // (each run walks to the viewer's right so the quads face into the room)
    grime('+x', G.minX, G.maxZ, 0, -1, 10, 0.32, 0x9a968c);
    grime('-x', G.maxX - 0.018, G.minZ, 0, 1, 10, 0.4, 0x8a6a50);
    grime('+z', G.minX, G.minZ, 1, 0, 4 - G.doorHalf - 0.06, 0.45, 0x9a968e);
    grime('+z', G.doorHalf + 0.06, G.minZ, 1, 0, 4 - G.doorHalf - 0.06, 0.45, 0x9a968e);
    for (const x0 of [-3.0, 4.0]) grime('-z', x0, G.maxZ, -1, 0, 1.0, 0.4, 0x9a968e);
    // water stains and rust runs
    this.decal('wallWater', '+x', G.minX + 0.0015, 1.38, 1.25, 0.5, 0.72, { tint: 0xc4ccd0 });
    this.decal('wallWater', '+x', G.minX + 0.0015, 1.4, 2.55, 0.4, 0.66, { tint: 0xc4ccd0 });
    this.decal('wallWater', '+z', -3.55, 2.55, G.minZ + 0.0012, 0.8, 1.2, { tint: 0xc8c4bc });
    this.decal('wallWater', '-x', G.maxX - 0.0015, 2.75, 3.95, 0.7, 0.9, { tint: 0xd0b48c });
    this.decal('wallWater', '+z', 3.45, 2.6, G.minZ + 0.0012, 0.6, 1.0, { tint: 0xc8c4bc });
    for (const [z, y, h] of [[-4.3, 2.3, 0.6], [-2.85, 2.1, 0.5], [0.45, 2.2, 0.55], [3.9, 2.0, 0.7], [-1.9, 1.7, 0.4]]) this.decal('rust', '+x', G.minX + 0.0014, y, z, 0.05, h, { tint: 0xe0c8b8 });
    // ceiling leak stains between the joists
    for (const [x, z, w, r] of [[-1.5, -4.0, 1.1, 0.3], [2.1, 1.6, 0.9, -0.5], [-0.3, 3.4, 0.8, 1.2], [3.2, -2.6, 0.7, 2.0]]) this.decal(r > 0.5 ? 'ceilStain2' : 'ceilStain', '-y', x, H - 0.0015, z, w, w * 0.75, { rot: r, tint: 0xd0c4b4 });

    // ---- left (machine) wall: price & info cards, kids' drawings, the window sill
    const lx = G.minX + 0.004;
    this.card('return', '+x', lx, 1.78, -0.725, 0.2, 0.125, { rot: 0.03 });
    this.card('drawCat', '+x', lx, 1.72, 0.33, 0.24, 0.18, { rot: -0.05 });
    this.card('drawGacha', '+x', lx, 1.64, -1.55, 0.24, 0.18, { rot: 0.04 });
    this.card('newCard', '+x', lx, 1.8, -2.02, 0.17, 0.14, { rot: -0.08 });
    this.card('changeCard', '+x', lx, 1.62, -4.1, 0.2, 0.125, { rot: 0.02 });
    this.card('rules', '+x', lx, 1.72, 4.35, 0.25, 0.28, { rot: -0.03 });
    // window sill plants and a wind chime under the head
    const win = this.garage.window;
    this.prop('cactus_pot', G.minX + 0.08, win.y0, win.z0 + 0.25, 0.5);
    this.prop('aloe_pot', G.minX + 0.08, win.y0, win.z1 - 0.3, 1.3);
    this.prop('furin', G.minX + 0.2, win.y1 - 0.03 - 0.264, (win.z0 + win.z1) / 2 + 0.2, Math.PI / 2);
    B.box(m.paint, 0.004, 0.03, 0.004, G.minX + 0.2, win.y1 - 0.035, (win.z0 + win.z1) / 2 + 0.2, { tint: 0xe8e0d0, ao: false });
    // curtain rod and a faded café curtain bunched at one side
    B.box(m.chrome, 0.012, 0.012, win.z1 - win.z0 + 0.2, G.minX + 0.12, win.y1 + 0.02, (win.z0 + win.z1) / 2, { tint: 0xc8ccd0, ao: false });
    for (let i = 0; i < 6; i++) B.box(m.paint, 0.02, win.y1 - win.y0 - 0.04, 0.035, G.minX + 0.11 + (i % 2) * 0.012, win.y0 + 0.03, win.z1 - 0.03 - i * 0.032, { tint: i % 2 ? 0xd8c8a0 : 0xe8dcb8 });

    // ---- right wall: a long high shelf of clutter on steel brackets, breaker-side clock and notes
    const sx = G.maxX - 0.13, sy = 2.45, sz0 = -1.12, sz1 = 3.78;
    B.box(m.ply, 0.26, 0.025, sz1 - sz0, sx, sy, (sz0 + sz1) / 2, { tint: 0xd8c8b0 });
    B.box(m.wood, 0.02, 0.04, sz1 - sz0, sx - 0.13, sy - 0.015, (sz0 + sz1) / 2, { tint: 0xa88a6a });
    for (const z of [-0.95, 0.9, 2.35, 3.6]) {
      B.box(m.steel, 0.2, 0.02, 0.02, G.maxX - 0.1, sy - 0.02, z, { tint: 0x5a6066 });
      B.box(m.steel, 0.02, 0.18, 0.02, G.maxX - 0.01, sy - 0.18, z, { tint: 0x5a6066 });
      B.box(m.steel, 0.012, 0.22, 0.012, G.maxX - 0.09, sy - 0.15, z, { rz: 0.72, tint: 0x5a6066 });
    }
    const top = sy + 0.025;
    const cbox = (z, w, h, d, label = null, rot = 0, tint = 0xffffff) => {
      B.box(m.cb, d, h, w, sx + 0.01, top, z, { ry: rot, tint });
      B.box(m.paint, d + 0.002, 0.002, 0.05, sx + 0.01, top + h, z, { ry: rot, tint: 0xd8c890, ao: false });
      if (label) this.card(label, '-x', sx + 0.01 - d / 2 - 0.002, top + h * 0.5, z, Math.min(w * 0.8, 0.2), Math.min(h * 0.6, 0.075));
    };
    cbox(-0.86, 0.36, 0.24, 0.22, 'stockLabel');
    this.prop('capsule_jar', sx + 0.02, top, -0.42, 0.3);
    this.prop('tin_robot', sx + 0.02, top, -0.12, -Math.PI / 2 + 0.3);
    this.prop('daruma', sx + 0.02, top, 0.22, -Math.PI / 2 - 0.2);
    this.prop('screw_jars', sx + 0.02, top, 0.62, -Math.PI / 2);
    this.prop('paint_tins', sx + 0.0, top, 1.1, -Math.PI / 2 + 0.4, { scale: 0.85 });
    cbox(1.55, 0.42, 0.3, 0.24, null, 0.05);
    cbox(1.52, 0.34, 0.16, 0.2, null, -0.12, 0xe8e0d0);
    cbox(2.0, 0.3, 0.22, 0.22, null, 0.08, 0xe8dcc8);
    cbox(2.42, 0.32, 0.2, 0.22, 'stockLabel', 0.04);
    this.prop('manga_stack', sx + 0.02, top, 2.85, 0.5, { scale: 0.7 });
    cbox(3.3, 0.38, 0.28, 0.23, null, -0.06, 0xf0e4d0);
    cbox(3.62, 0.26, 0.18, 0.2, 'stockLabel', -0.1);
    // PC corner: shelf with binders, photo, memo, a tear-off calendar on the back wall
    const D = this.garage.pcDesk;
    B.box(m.ply, 0.22, 0.02, 1.2, G.maxX - 0.11, 1.78, D.z + 0.05, { tint: 0xd8c8b0 });
    for (const z of [D.z - 0.45, D.z + 0.55]) B.box(m.steel, 0.18, 0.02, 0.02, G.maxX - 0.09, 1.76, z, { tint: 0x5a6066 });
    const binders = [0x2a5aa8, 0x2a5aa8, 0xc8302a, 0x3a8a4a, 0xe8c43a, 0x2a2a2c, 0x2a5aa8];
    binders.forEach((c, i) => B.box(m.gloss, 0.2, 0.26 - (i % 3) * 0.02, 0.045, G.maxX - 0.12, 1.8, D.z - 0.5 + i * 0.05, { tint: c }));
    for (let i = 0; i < 7; i++) B.box(m.paint, 0.002, 0.08, 0.025, G.maxX - 0.221, 1.88, D.z - 0.5 + i * 0.05, { tint: 0xf4f0e6, ao: false });
    this.prop('manekineko', G.maxX - 0.12, 1.8, D.z + 0.45, -Math.PI / 2 + 0.3);
    this.card('photo', '-x', G.maxX - 0.002, 1.42, D.z - 0.55, 0.12, 0.15, { rot: 0.06 });
    this.card('memo', '-x', G.maxX - 0.002, 1.45, D.z + 0.1, 0.14, 0.14, { rot: -0.08 });
    this.card('himekuri', '+z', 3.13, 1.62, G.minZ + 0.004, 0.15, 0.21);
    B.box(m.chrome, 0.012, 0.012, 0.012, 3.13, 1.73, G.minZ + 0.006, { tint: 0x9aa0a6, ao: false });
    // the back wall: clock over the door, a safety-first board above the racks, the sink with its water heater
    const cy = G.doorH + 0.5;
    B.box(m.gloss, 0.36, 0.36, 0.05, 0, cy - 0.18, G.minZ + 0.025, { tint: 0x8a5a32 });
    this.card('clock', '+z', 0, cy, G.minZ + 0.0515, 0.32, 0.32);
    this.card('anzen', '+z', -2.65, 2.55, G.minZ + 0.012, 0.6, 0.45, { rot: 0.01 });
    this.card('hinoyojin', '-z', -3.55, 1.75, G.maxZ - 0.012, 0.12, 0.36);
    this.prop('rope_coil', -3.22, 1.5, G.maxZ - 0.055, Math.PI);
    this.prop('straw_hat', G.maxX - 0.056, 2.1, 4.62, -Math.PI / 2);
    B.box(m.chrome, 0.03, 0.01, 0.01, G.maxX - 0.015, 2.47, 4.62, { tint: 0x9aa0a6, ao: false });
    // calendar / tin plate swap space: hooks with a dustpan and a hand brush by the pegboard
    this.decal('smudge', '-x', G.maxX - 0.0012, 1.1, 3.0, 0.4, 0.3, { tint: 0x8a6a50 });
  }

  // ---------------------------------------------------------------------------------------------- shop dressing
  dressing() {
    const G = this.G, B = this.B, m = this.m;
    // gacha corner: the coin changer at the back of the machine row, capsule return box, a crate of spare
    // capsules and a step stool for little ones in the gaps between the machines (never in front of a slot)
    this.prop('coin_changer', -3.73, 0, -4.1, Math.PI / 2, { block: true, phys: true });
    this.prop('capsule_return', -3.45, 0.006, -0.725, Math.PI / 2, { block: true, phys: true });
    // a carton of spare capsules (taped, labelled) with the jar of loose ones on top
    const cx = -3.66, cz = 0.33;
    B.box(m.cb, 0.36, 0.3, 0.42, cx, 0.006, cz, { tint: 0xf4ece0 });
    B.box(m.paint, 0.362, 0.002, 0.05, cx, 0.306, cz, { tint: 0xd8c890, ao: false });
    this.card('stockLabel', '+x', cx + 0.182, 0.2, cz, 0.22, 0.08);
    this.prop('capsule_jar', cx, 0.308, cz, 0.4);
    this.game.player.addObstacle(cx - 0.2, cx + 0.2, cz - 0.23, cz + 0.23);
    this.game.physics.addBox({ center: V3(cx, 0.31, cz), half: V3(0.18, 0.31, 0.21), material: 'wood' });
    this.prop('step_stool', -3.5, 0.006, -1.775, Math.PI / 2, { block: true, phys: true });
    if (hasProp('asagao_pot')) this.prop('asagao_pot', -3.6, 0.006, -2.83, Math.PI / 2, { block: true, phys: true, scale: 0.8 });
    // the pink public phone (ピンク電話) at the end of the machine row, under the window
    this.prop('pink_phone', -3.72, 0, 2.62, Math.PI / 2, { block: true, phys: true });
    // coin tray and an abacus on the far corner of the work table
    const T = this.garage.table;
    this.prop('coin_tray', T.x - 0.72, T.h, T.z - 0.3, 0.25);
    this.prop('abacus', T.x - 0.7, T.h, T.z - 0.12, -0.15);
    // storage along the plywood wall under the collection shelves: cartons, a tied newspaper bundle, flattened boxes
    const ux = G.maxX - 0.17;
    const carton = (z, w, h, d, tint, label = null, rot = 0, y = 0) => {
      B.box(m.cb, d, h, w, ux + (0.15 - d / 2), y, z, { ry: rot, tint });
      B.box(m.paint, d + 0.002, 0.002, 0.05, ux + (0.15 - d / 2), y + h, z, { ry: rot, tint: 0xd8c890, ao: false });
      if (label) this.card(label, '-x', ux + 0.15 - d - 0.002, y + h * 0.55, z, Math.min(w * 0.7, 0.2), Math.min(h * 0.4, 0.075));
    };
    carton(-0.92, 0.42, 0.32, 0.3, 0xf0e6d8, 'stockLabel', 0.03);
    carton(-0.5, 0.34, 0.24, 0.28, 0xe0d4c0, null, -0.05);
    carton(-0.5, 0.26, 0.16, 0.22, 0xf4ece0, null, 0.12, 0.24);
    // newspapers tied with string
    for (let i = 0; i < 9; i++) B.box(m.paint, 0.27, 0.022, 0.38, ux + 0.0 + (hash2(i, 5) - 0.5) * 0.02, i * 0.022, -0.02, { ry: (hash2(i, 6) - 0.5) * 0.08, tint: i % 3 ? 0xe8e2d4 : 0xd8d0c0 });
    for (const dz of [-0.09, 0.09]) B.box(m.paint, 0.275, 0.2, 0.008, ux, 0, -0.02 + dz, { tint: 0xf4f0e6, ao: false });
    this.prop('cardboard_bundle', G.maxX - 0.235, 0, 1.25, Math.PI / 2, { block: true, phys: true, scale: 0.8 });
    carton(1.68, 0.36, 0.3, 0.3, 0xe8dcc8, 'stockLabel', -0.04);
    carton(2.75, 0.44, 0.34, 0.3, 0xf0e6d8, null, 0.04);
    carton(3.25, 0.32, 0.24, 0.26, 0xe4d8c4, 'stockLabel', -0.08);
    for (const [z0, z1, h] of [[-1.15, -0.27, 0.42], [-0.22, 0.18, 0.2], [1.5, 1.86, 0.31], [2.52, 3.42, 0.35]]) {
      this.game.player.addObstacle(G.maxX - 0.34, G.maxX, z0, z1);
      this.game.physics.addBox({ center: V3(G.maxX - 0.17, h / 2, (z0 + z1) / 2), half: V3(0.17, h / 2, (z1 - z0) / 2), material: 'wood' });
    }
    // fire buckets left of the back door (outside the door's swing)
    this.prop('fire_buckets', -1.02, 0, -4.8, 0.2, { block: true, phys: true });
    // utility sink with the gas water heater above it, sandals in front
    this.prop('utility_sink', 2.62, 0, G.minZ + 0.24, 0, { block: true, phys: true });
    this.prop('water_heater', 2.8, 1.36 - 0.24, G.minZ + 0.2, 0);
    this.prop('sandals', 2.5, 0.002, -4.32, 0.25);
    // the PC corner: cord reel under the desk
    this.prop('cord_reel', 3.72, 0, -4.35, -Math.PI / 2 - 0.3, { phys: true });
    // paint tins on the beer crates by the shutter
    this.prop('paint_tins', 2.95, 0.58, 4.5, 0.4, { scale: 0.85 });
    // the long hooked pole for pulling the shutter down, leaning by the left pier
    const hp = V3(-3.12, 0, G.maxZ - 0.09), ht = V3(-3.16, 2.05, G.maxZ - 0.04);
    B.tube(m.steel, [hp, ht], 0.009, { tint: 0x8a8e92, radial: 5 });
    B.tube(m.steel, [ht, ht.clone().add(V3(0, 0.08, 0)), ht.clone().add(V3(0.05, 0.1, 0)), ht.clone().add(V3(0.07, 0.05, 0))], 0.007, { tint: 0x8a8e92, radial: 5 });
    B.box(m.rubber, 0.03, 0.06, 0.03, hp.x, 0, hp.z, { tint: 0x2a2a2a });
    // cobwebs in the high back corners
    if (hasProp('cobweb')) {
      this.prop('cobweb', G.minX + 0.194, G.height - 0.1 - 0.392, G.minZ + 0.012, 0);
    }
    void B; void m;
  }

  // ---------------------------------------------------------------------------------------------- contact AO
  ao() {
    const G = this.G, B = this.B, m = this.m, H = G.height;
    const R = [0, 0, 0.5, 1]; // gradient half of the AO atlas (u: 0 = dark edge)
    /** Strip along an edge: p0 + along*len, fading towards 'out' over 'w'. */
    const strip = (p0, along, out, w, a) => B.quad(m.ao, p0, out.clone().multiplyScalar(w), along, { ao: false, alpha: a, rect: R });
    const strips = [];
    const S = (p0, along, out, w, a) => strips.push([p0, along, out, w, a]);
    const up = V3(0, 1, 0), down = V3(0, -1, 0);
    // floor-wall junctions (floor side and wall side)
    const walls = [
      { p: V3(G.minX, 0, G.minZ), along: V3(0, 0, 10), n: V3(1, 0, 0) },
      { p: V3(G.maxX, 0, G.minZ), along: V3(0, 0, 10), n: V3(-1, 0, 0) },
      { p: V3(G.minX, 0, G.minZ), along: V3(8, 0, 0), n: V3(0, 0, 1) },
    ];
    for (const w of walls) {
      S(w.p.clone().setY(w.n.x > 0 ? 0.0095 : 0.003), w.along, w.n, 0.5, 0.42);
      S(w.p.clone().add(w.n.clone().multiplyScalar(0.003)), w.along, up, 0.4, 0.32);
      S(w.p.clone().setY(H).add(w.n.clone().multiplyScalar(0.003)), w.along, down, 0.35, 0.3);
      S(w.p.clone().setY(H - 0.003), w.along, w.n, 0.4, 0.28);
    }
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? G.minX : 3.0;
      S(V3(x0, 0.003, G.maxZ), V3(1, 0, 0), V3(0, 0, -1), 0.45, 0.38);
      S(V3(x0, 0, G.maxZ - 0.003), V3(1, 0, 0), up, 0.4, 0.3);
    }
    // vertical corners
    for (const [x, z, nx, nz] of [[G.minX, G.minZ, 1, 1], [G.maxX, G.minZ, -1, 1], [G.minX, G.maxZ, 1, -1], [G.maxX, G.maxZ, -1, -1]]) {
      S(V3(x + nx * 0.003, 0, z), V3(0, H, 0), V3(0, 0, nz), 0.38, 0.3);
      S(V3(x, 0, z + nz * 0.003), V3(0, H, 0), V3(nx, 0, 0), 0.38, 0.3);
    }
    for (const [p0, along, out, w, a] of strips) strip(p0, along, out, w, a);
    // soft contact shadows under furniture (right half of the atlas)
    const RS = [0.5, 0, 1, 1];
    const blob = (x, z, w, d, a = 0.55, y = 0.004) => B.quad(m.ao, V3(x - w / 2, y, z + d / 2), V3(w, 0, 0), V3(0, 0, -d), { ao: false, alpha: a, rect: RS });
    const T = this.garage.table, D = this.garage.pcDesk;
    blob(T.x, T.z, T.w + 0.5, T.d + 0.5, 0.5);
    blob(D.x, D.z, D.w + 0.4, D.d + 0.4, 0.55);
    blob(-3.25, G.minZ + 0.3, 1.5, 0.75, 0.55); blob(-1.85, G.minZ + 0.3, 1.5, 0.75, 0.55);
    blob(1.25, G.minZ + 0.3, 0.8, 0.8, 0.6); blob(2.62, G.minZ + 0.3, 0.9, 0.7, 0.5);
    blob(-0.95, 1.55, 0.7, 0.7, 0.5); blob(3.55, -2.15, 0.7, 0.7, 0.5); blob(3.55, -2.78, 0.75, 0.75, 0.5);
    blob(2.95, 4.5, 0.7, 0.6, 0.5); blob(-2.65, 4.5, 0.8, 0.8, 0.5); blob(-3.55, 3.78, 0.75, 1.9, 0.4); blob(-3.72, 2.62, 0.5, 0.55, 0.5); blob(3.62, 4.66, 0.7, 0.75, 0.4);
    blob(-3.73, -4.1, 0.55, 0.6, 0.5);
    for (const sz of [-3.35, -2.3, -1.25, -0.2, 0.85, 1.9]) blob(-3.42, sz, 0.62, 0.62, 0.45, 0.0075);
    for (const sz of [-0.55, 1.25, 3.05]) blob(3.88, sz, 0.3, 1.5, 0.35);
  }

  // ---------------------------------------------------------------------------------------------- fake light
  halos() {
    const G = this.G, B = this.B, m = this.m, H = G.height;
    const halo = (p0, a, b, color, k, src) => B.quad(m.halo, p0, a, b, { ao: false, tint: color, k, src, rect: [0, 0, 1, 1] });
    /** Ellipse halo centred at c on a plane spanned by unit vectors u, v. */
    const H2 = (c, u, v, w, h, color, k, src) => halo(c.clone().sub(u.clone().multiplyScalar(w / 2)).sub(v.clone().multiplyScalar(h / 2)), u.clone().multiplyScalar(w), v.clone().multiplyScalar(h), color, k, src);
    const X = V3(1, 0, 0), Z = V3(0, 0, 1), Y = V3(0, 1, 0);
    const cool = 0xd8e4ff, warm = 0xffb070;
    const fx = [[0, -2.0, 0], [0, 0.8, 1], ...this.extraFix.map(([x, z]) => [x, z, 0])];
    for (const [x, z, src] of fx) {
      // light splashed on the ceiling boards around the fixture, and a soft pool on the floor below
      H2(V3(x, H - 0.004, z), X, Z, 1.5, 2.6, cool, 0.55, src);
      H2(V3(x, 0.006, z), X, Z, 2.6, 3.6, cool, 0.1, src);
    }
    // warm wash on the wall behind the lit sign and each paper lantern
    H2(V3(G.minX + 0.012, 2.4, -0.6), Z, Y, 2.6, 1.2, warm, 0.35, 2);
    for (let i = 1; i < 8; i++) H2(V3(G.minX + 0.013, 2.62, -3.6 + i * 0.75), Z, Y, 0.55, 0.55, warm, 0.22, 2);
    // the coin changer's light box and the PC desk pendant
    H2(V3(G.minX + 0.012, 1.18, -4.1), Z, Y, 0.9, 0.7, 0xfff0d0, 0.2, 2);
    const D = this.garage.pcDesk;
    H2(V3(D.x, D.h + 0.004, D.z + 0.1), X, Z, 0.9, 1.0, 0xffd8a0, 0.22, 2);
    H2(V3(G.maxX - 0.006, 2.2, D.z + 0.1), Z, Y, 1.2, 1.0, 0xffd8a0, 0.14, 2);
    // daylight bouncing in under the open shutter onto the ceiling front
    H2(V3(0, H - 0.005, G.maxZ - 0.9), X, Z, 6.5, 2.2, 0xffd0a0, 0.18, 3);
  }

  update() {
    const tubes = this.garage.lights.tubes;
    const k = (t) => Math.max(0, Math.min(1, (t.mat.color.r - 0.15) / 2.05));
    const u = this.haloMat.uniforms.uK.value;
    u.x = k(tubes[0]);
    u.y = k(tubes[1]);
    u.z = 1;
    u.w = Math.max(0, this.garage.shutterOpen);
  }
}
