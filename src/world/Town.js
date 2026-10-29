// The town outside the garage: a narrow Shōwa back lane in late golden hour running between two railway
// underpasses (ガード下), the garage's plain old front (eave, blocky lanterns, noren), the neighbours' houses
// with depth, side alleys, the enterable MIKAWA-YA corner store, utility poles and wires, commuter trains,
// sky and skyline.
//
// Layout (metres): the garage is x∈[-4,4], z∈[-5,5]; the lane runs along x in front of it. Near building
// line z=5.3, road z≈6.1..13.35, far building line z=14.9. Underpass mouths at x=±26 (opening z∈[6.6,12.6],
// clearance 3.4 m); the walkable lane ends 2.5 m inside each (x=±28.5); the underpasses run to x=±36.
//
// Contracts:
//   town.setShopOpen(open)  open = lanterns glowing, noren + OPEN flag/plate, bench and twin gacha out front;
//                           closed = dark lanterns, weeds and a taped notice (abandoned). Default open; cheap toggle.
//   town.tunnels = [{ x, z, dir, mouth }]  x = walkable end inside each underpass, z = road centre, dir = ±1 outward,
//                           mouth = x of the portal.
//   town.cornerShop = { counter: Object3D (click target), keeper: { pos: Vector3, rotY } (stands behind the
//                       counter; rotY for a model that faces +z at 0 → faces the door), inside: { minX, maxX, minZ, maxZ } }
//   town.lanes = [{ z, x0, x1 }]  straight pedestrian walking lines (one per side of the road), tunnel to tunnel.
//   town.spawnPoints = [Vector3]  deep inside each underpass (dark, out of sight) at the ends of the lanes.
//   town.garbageStation         Object3D of the neighbourhood garbage station (x≈-6.6, z≈5.8).
//   town.update(dt, t)          trains (+ sound) and small animations; called from Garage.update.
//   town.runTrain(side?, dir?)  force a train over the west (-1) or east (+1) underpass (debug/screenshots).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { worldBox, pixMat } from '../gfx/geo.js';
import { townPix, posterTexture, Pix } from '../gfx/textures.js';
import { propGeometry, propMesh, hasProp, propSize } from './props.js';
import { voxelMaterials } from '../voxel/materials.js';
import { hash2 } from '../core/util.js';
import { audio } from '../core/audio.js';
import { GARAGE } from './Garage.js';
import { installTunnelDarkness } from './tunnelDark.js';

// ------------------------------------------------------------------ layout
const ZB = 5.3, ZG0 = 5.75, ZG1 = 6.1, ZR1 = 13.35, ZG3 = 13.7, ZF = 14.9;
const XT = 26, XE = 36, XW = 28.5; // underpass mouth, far end, end of the walkable lane
const TZ0 = 6.6, TZ1 = 12.6, TH = 3.4, WALK = 11.65; // opening, clearance, walkway kerb
const YE = 4.25, YR = 4.72; // embankment top, rail top
const TRACKS = [30, 33];
const LANE_Z = [7.3, 11.2];
const TRAIN_CAR = 13.6, TRAIN_GAP = 0.5, TRAIN_N = 3;
const TRAIN_LEN = TRAIN_N * TRAIN_CAR + (TRAIN_N - 1) * TRAIN_GAP;

// pitch-black underpasses: everything inside fades to black a few metres past the portal (see tunnelDark.js);
// installed at import time so it is in place before any material is compiled
installTunnelDarkness({ x0: XT + 0.1, x1: XE + 1.5, z0: TZ0 - 0.35, z1: TZ1 + 0.35, y1: YE - 0.2, k: 1.0, d0: 3.2, d1: 6.0, fog: 0.3 });

let INDOOR_CHUNK = null, SAFE_BUMP = null;
/** Shader patch for town materials: NaN-safe bump mapping (degenerate derivatives on far/thin faces would
 *  otherwise poison bloom into a black frame) and, for indoor materials, no low-sun contribution. */
function townShader(m, indoor = false) {
  if (!SAFE_BUMP) {
    SAFE_BUMP = THREE.ShaderChunk.bumpmap_pars_fragment
      .replace(/normalize\( dFdx\( surf_pos\.xyz \) \)/, 'normalize( dFdx( surf_pos.xyz ) + vec3( 1e-7 ) )')
      .replace(/normalize\( dFdy\( surf_pos\.xyz \) \)/, 'normalize( dFdy( surf_pos.xyz ) + vec3( 1e-7 ) )')
      .replace('return normalize( abs( fDet ) * surf_norm - vGrad );', 'vec3 bn = abs( fDet ) * surf_norm - vGrad; return dot( bn, bn ) > 1e-14 ? normalize( bn ) : surf_norm;');
    INDOOR_CHUNK = THREE.ShaderChunk.lights_fragment_begin.replace('#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )', '#if 0');
  }
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <bumpmap_pars_fragment>', SAFE_BUMP);
    if (indoor) sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_begin>', INDOOR_CHUNK);
  };
  m.customProgramCacheKey = () => (indoor ? 'town-in' : 'town');
  return m;
}
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Baked shade under the bridge decks (the real darkness inside is per-pixel, see tunnelDark.js). */
function shadeAt(x, y, z) {
  const u = Math.abs(x);
  if (u < XT - 0.4 || u > XE + 0.3 || y > YE + 0.05 || z < TZ0 - 1.1 || z > TZ1 + 1.1) return 1;
  return 1 - 0.45 * sstep(XT - 0.4, XT + 1.4, u);
}

const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color(), _up = new THREE.Vector3(0, 1, 0);

/**
 * Static geometry batcher: boxes/planes are transformed, given baked vertex colours (tint × underpass
 * darkness × optional ground AO) and merged into one mesh per material.
 */
class Batch {
  constructor(shade = () => 1) { this.lists = new Map(); this.stack = [new THREE.Matrix4()]; this.shade = shade; }
  get top() { return this.stack[this.stack.length - 1]; }
  push(x, y, z, ry = 0, mirror = false) {
    const m = new THREE.Matrix4().makeRotationY(ry).setPosition(x, y, z);
    if (mirror) m.multiply(new THREE.Matrix4().makeScale(-1, 1, 1));
    this.stack.push(this.top.clone().multiply(m));
    return this;
  }
  pop() { this.stack.pop(); return this; }
  /** Local → world point under the current transform. */
  world(x, y, z) { return new THREE.Vector3(x, y, z).applyMatrix4(this.top); }
  yaw(ry = 0) { const e = this.top.elements; return Math.atan2(e[8], e[0]) + ry; }
  geo(mat, g, { tint = 0xffffff, k = 1, ao = 0, y0 = null } = {}) {
    const flip = this.top.determinant() < 0;
    g.applyMatrix4(this.top);
    if (flip && g.index) { const a = g.index.array; for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; } }
    const pos = g.attributes.position, n = pos.count, col = new Float32Array(n * 3);
    _c.set(tint);
    const r = _c.r * k, gg = _c.g * k, b = _c.b * k;
    const base = y0 ?? 0;
    for (let i = 0; i < n; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      let f = this.shade(x, y, z);
      if (ao) f *= 1 - ao * (1 - sstep(base, base + 1.1, y));
      col[i * 3] = r * f; col[i * 3 + 1] = gg * f; col[i * 3 + 2] = b * f;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (!this.lists.has(mat)) this.lists.set(mat, []);
    this.lists.get(mat).push(g);
    return g;
  }
  /** Box with its bottom at y (before rotation). o: unit (0..1 UVs per face), uv [du,dv] offset, rx/ry/rz, tint, k, ao. */
  box(mat, w, h, d, x, y, z, o = {}) {
    const g = o.unit ? new THREE.BoxGeometry(w, h, d) : worldBox(w, h, d);
    if (o.uv && !o.unit) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) + o.uv[0], uv.getY(i) + o.uv[1]); }
    if (o.rx) g.rotateX(o.rx);
    if (o.rz) g.rotateZ(o.rz);
    if (o.ry) g.rotateY(o.ry);
    g.translate(x, y + h / 2, z);
    if (o.ao && o.y0 === undefined) o = { ...o, y0: this.top.elements[13] + y };
    return this.geo(mat, g, o);
  }
  /** Upward-facing plane (world UVs in metres unless o.unit). */
  plane(mat, w, d, x, y, z, o = {}) {
    const g = new THREE.PlaneGeometry(w, d, o.sx || 1, o.sz || 1);
    if (!o.unit) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w + (o.uv?.[0] || 0), uv.getY(i) * d + (o.uv?.[1] || 0)); }
    g.rotateX(-Math.PI / 2);
    if (o.ry) g.rotateY(o.ry);
    g.translate(x, y, z);
    return this.geo(mat, g, o);
  }
  /** Vertical plane facing +z (rotate with o.ry). */
  quad(mat, w, h, x, y, z, o = {}) {
    const g = new THREE.PlaneGeometry(w, h);
    if (o.flipU) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i)); }
    if (o.ry) g.rotateY(o.ry);
    g.translate(x, y + h / 2, z);
    return this.geo(mat, g, o);
  }
  build(parent, { cast = false, receive = true } = {}) {
    for (const [mat, list] of this.lists) {
      const g = mergeGeometries(list, false);
      for (const x of list) x.dispose();
      if (!g) continue;
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, mat);
      m.castShadow = cast; m.receiveShadow = receive;
      m.matrixAutoUpdate = false;
      parent.add(m);
    }
    this.lists.clear();
  }
}

export class Town {
  constructor(game, garage) {
    this.game = game;
    this.garage = garage;
    this.group = new THREE.Group();
    this.group.name = 'town';
    game.scene.add(this.group);
    this.mats = new Map();
    this.inst = new Map();
    this.anchors = { near: [], far: [] };
    this.lights = [];
    this.build();
  }

  add(obj, parent = this.group) { parent.add(obj); return obj; }

  // ---------------------------------------------------------------- materials
  /** Pixel-art recipe material with vertex colours (cached). */
  M(key, opts = {}) {
    const ck = 'p:' + key + JSON.stringify(opts);
    if (!this.mats.has(ck)) {
      const m = townShader(pixMat(key, opts).clone());
      m.vertexColors = true;
      if (opts.decal) { m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -4; }
      this.mats.set(ck, m);
    }
    return this.mats.get(ck);
  }
  /** Flat paint (tint per box via vertex colour). */
  P(rough = 0.75, metal = 0, extra = {}) {
    const ck = 'c:' + rough + ':' + metal + JSON.stringify(extra);
    if (!this.mats.has(ck)) this.mats.set(ck, new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: rough, metalness: metal, ...extra }));
    return this.mats.get(ck);
  }
  /** Self-lit paint (lamps, LEDs). */
  get G() {
    if (!this.mats.has('glow')) { const m = new THREE.MeshBasicMaterial({ vertexColors: true }); m.color.setScalar(1.5); this.mats.set('glow', m); }
    return this.mats.get('glow');
  }
  /** Unit-mapped town texture (windows, doors, signs). */
  T(key, w, h, { glow = 0, rough = 0.5, alpha = false, decal = false, metal = 0 } = {}) {
    const ck = 't:' + key + w + 'x' + h + glow + alpha + decal;
    if (!this.mats.has(ck)) {
      const map = townPix(key, w, h).texture();
      const m = new THREE.MeshStandardMaterial({ map, vertexColors: true, roughness: rough, metalness: metal });
      if (glow) { m.emissive = new THREE.Color(0xffffff); m.emissiveMap = map; m.emissiveIntensity = glow; }
      if (alpha) { m.alphaTest = 0.5; m.transparent = false; }
      if (decal) { m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -4; }
      this.mats.set(ck, m);
    }
    return this.mats.get(ck);
  }

  /** Clone of a lit material that ignores the low sun (interiors and the underpasses have no shadow coverage). */
  indoor(mat) {
    if (!this._indoor) this._indoor = new Map();
    if (!this._indoor.has(mat)) {
      this._indoor.set(mat, townShader(mat.clone(), true));
    }
    return this._indoor.get(mat);
  }
  indoorVoxel() {
    if (!this._inVox) { const n = voxelMaterials('normal'); this._inVox = [this.indoor(n[0]), this.indoor(n[1]), this.indoor(n[2]), n[3], this.indoor(n[4])]; }
    return this._inVox;
  }

  initMats() {
    const M = (k, o) => this.M(k, o);
    this.m = {
      road: M('asphaltHD', { roughness: 0.95, bump: 0.5, ppm: 40 }),
      paint: M('roadPaint', { roughness: 0.8, bump: 0, ppm: 64, decal: true }),
      strip: M('concrete', { roughness: 0.95, color: 0xb8b0a2, ppm: 40 }),
      paving: M('paving', { roughness: 0.92, ppm: 40 }),
      lid: M('gutterLid', { roughness: 0.92, ppm: 40 }),
      grate: M('grate', { roughness: 0.5, metalness: 0.5, ppm: 64, bump: 0 }),
      ground: M('gravel', { roughness: 1, color: 0x8a8070, ppm: 32 }),
      block: M('blockHD', { roughness: 0.92, bump: 1, ppm: 64 }),
      found: M('concrete', { roughness: 0.95, color: 0x9a948a, ppm: 48 }),
      conc: M('concreteHD', { roughness: 0.92, bump: 0.8, ppm: 64 }),
      wallCream: M('houseWall', { roughness: 0.9, color: 0xf0e2c4 }),
      wallBeige: M('houseWall', { roughness: 0.9, color: 0xe0cfb0 }),
      wallGrey: M('houseWall', { roughness: 0.9, color: 0xc8c8c0 }),
      wallBlue: M('houseWall', { roughness: 0.9, color: 0xb8c4cc }),
      mortar: M('mortar', { roughness: 0.95 }),
      mortarG: M('mortar', { roughness: 0.95, color: 0xd0d4bc }),
      mortarP: M('mortar', { roughness: 0.95, color: 0xe8dcc4 }),
      siding: M('siding', { roughness: 0.85, ppm: 64 }),
      tin: M('corrugatedHD', { roughness: 0.55, metalness: 0.35, bump: 1.2, ppm: 64, color: 0xa8b4b0 }),
      tinRed: M('corrugatedHD', { roughness: 0.6, metalness: 0.3, bump: 1.2, ppm: 64, color: 0xb87060 }),
      tinTeal: M('corrugatedHD', { roughness: 0.55, metalness: 0.35, bump: 1.2, ppm: 64, color: 0x7aa6a0 }),
      roofGrey: M('roofTile', { roughness: 0.55, metalness: 0.15 }),
      roofBlue: M('roofTile', { roughness: 0.5, metalness: 0.15, color: 0x9ab4dc }),
      roofBrown: M('roofTile', { roughness: 0.6, metalness: 0.1, color: 0xd09a80 }),
      roofGreen: M('roofTile', { roughness: 0.6, metalness: 0.1, color: 0xa8c0a0 }),
      brick: M('brickHD', { roughness: 0.92, bump: 1, ppm: 64 }),
      kenchi: M('kenchi', { roughness: 0.95, bump: 1.2, ppm: 64 }),
      tunnel: M('tunnelWall', { roughness: 0.95, bump: 0.8, ppm: 64 }),
      girder: M('girder', { roughness: 0.6, metalness: 0.3, ppm: 64, color: 0x9a8a80 }),
      ballast: M('ballast', { roughness: 1, ppm: 40 }),
      grass: M('grassFloor', { roughness: 1, color: 0x7a8a5a, ppm: 32 }),
      hazard: M('hazard', { roughness: 0.6, ppm: 64, bump: 0 }),
      tile: M('shopTile', { roughness: 0.4, ppm: 64 }),
      koshi: M('koshiita', { roughness: 0.6, ppm: 64 }),
      shikkui: M('shikkui', { roughness: 0.92, ppm: 64, color: 0xeee6d8 }),
      ceil: M('shopCeiling', { roughness: 0.85, ppm: 64 }),
      wood: M('woodDark', { roughness: 0.7 }),
      woodL: M('woodLight', { roughness: 0.7 }),
      shutterM: M('shutter', { roughness: 0.6, metalness: 0.4, bump: 1.5, color: 0xb8b0a0 }),
      pv: this.P(0.75),
      metal: this.P(0.4, 0.55),
      gloss: this.P(0.3),
      ridge: this.P(0.5, 0.2),
    };
    const W = (k, glow = 0) => this.T(k, 32, 24, { glow, rough: 0.25 });
    this.win = {
      lit: W('winLit', 0.75), lit2: W('winLit2', 0.75), lit3: W('winLit3', 0.75), lit4: W('winLit4', 0.75),
      dark: W('winDark'), frost: W('winFrost', 0.35), shoji: W('winShoji', 0.7), tv: W('winTV', 0.6), lace: W('winLace', 0.7),
    };
    this.doors = { genkan: this.T('doorGenkan', 32, 40, { glow: 0.55, rough: 0.4 }), apt: this.T('doorApt', 18, 40, { rough: 0.5, metal: 0.2 }) };
    this.glass = new THREE.MeshPhysicalMaterial({ color: 0xeaf2f0, transparent: true, opacity: 0.18, roughness: 0.05, clearcoat: 1, depthWrite: false });
  }

  // ---------------------------------------------------------------- voxel props
  /** Queue an instanced prop (static). o: block (player collision), dim (softer glow), scale. */
  prop(id, x, y, z, ry = 0, o = {}) {
    if (!hasProp(id)) return null;
    const key = id + (o.dim ? ':dim' : '') + (o.indoor ? ':in' : '');
    if (!this.inst.has(key)) this.inst.set(key, { id, dim: o.dim, indoor: o.indoor, list: [] });
    this.inst.get(key).list.push({ x, y, z, ry, s: o.scale || 1 });
    if (o.block) this.blockProp(id, x, z, ry, o.scale || 1, o.pad ?? 0.02);
    return true;
  }
  /** Single prop mesh (for things that toggle or get clicked). */
  single(id, x, y, z, ry = 0, o = {}, parent = this.group) {
    if (!hasProp(id)) return null;
    const m = propMesh(id, { castShadow: !!o.cast, receiveShadow: true });
    if (o.indoor && Array.isArray(m.material)) m.material = this.indoorVoxel();
    m.position.set(x, y, z); m.rotation.y = ry;
    if (o.scale) m.scale.setScalar(o.scale);
    parent.add(m);
    if (o.block) this.blockProp(id, x, z, ry, o.scale || 1, o.pad ?? 0.02);
    return m;
  }
  blockProp(id, x, z, ry, sc, pad) {
    const s = propSize(id);
    const hx = s.x * sc / 2, hz = s.z * sc / 2, c = Math.abs(Math.cos(ry)), sn = Math.abs(Math.sin(ry));
    const ex = hx * c + hz * sn + pad, ez = hx * sn + hz * c + pad;
    this.game.player.addObstacle(x - ex, x + ex, z - ez, z + ez);
  }
  flushProps() {
    for (const { id, dim, indoor, list } of this.inst.values()) {
      const geo = propGeometry(id);
      if (!geo) continue;
      const im = new THREE.InstancedMesh(geo, indoor ? this.indoorVoxel() : dim ? this.dimVoxel() : voxelMaterials('normal'), list.length);
      list.forEach((it, i) => {
        _q.setFromAxisAngle(_up, it.ry);
        im.setMatrixAt(i, _m4.compose(_p.set(it.x, it.y, it.z), _q, _s.setScalar(it.s)));
      });
      im.castShadow = false; im.receiveShadow = true;
      im.computeBoundingSphere();
      im.name = 'props:' + id;
      this.group.add(im);
    }
    this.inst.clear();
  }
  /** Voxel material set with a gentler glow (vending machines, lit signs up close). */
  dimVoxel() {
    if (!this._dim) {
      const n = voxelMaterials('normal');
      const g = n[3].clone(); g.color.setScalar(0.95);
      this._dim = [n[0], n[1], n[2], g, n[4]];
    }
    return this._dim;
  }

  // ---------------------------------------------------------------- build
  build() {
    this.initMats();
    this.B = new Batch(shadeAt);
    this.buildSky();
    this.buildGround();
    this.buildShopFront();
    this.buildNearSide();
    this.buildFarSide();
    this.buildCornerShop();
    this.buildUnderpasses();
    this.buildPoles();
    this.buildDressing();
    // small-scale dressing only: never let a decoration bug stop the lane from loading
    try { this.buildDetails(); } catch (e) { console.error('Town.buildDetails failed', e); }
    this.buildBackdrop();
    this.buildBounds();
    this.B.build(this.group);
    this.flushProps();
    this.buildTrains();
    this.setShopOpen(true);
    // contracts for pedestrians
    this.lanes = LANE_Z.map((z) => ({ z, x0: -XE + 1, x1: XE - 1 }));
    // x = the walkable end inside each underpass, mouth = its portal, dir = outward
    this.tunnels = [-1, 1].map((s) => ({ x: s * XW, z: (TZ0 + TZ1) / 2, dir: s, mouth: s * XT }));
    this.spawnPoints = [];
    for (const s of [-1, 1]) for (const z of LANE_Z) this.spawnPoints.push(new THREE.Vector3(s * (XE - 1), 0, z));
  }

  // ---------------------------------------------------------------- ground & road
  buildGround() {
    const B = this.B, m = this.m;
    // a catch-all ground under everything (no void between lots)
    B.plane(m.ground, 110, 90, 0, -0.02, 8, { k: 0.8 });
    // the asphalt runs through both underpasses to the junctions beyond
    B.plane(m.road, 2 * XT, ZR1 - ZG1, 0, 0, (ZG1 + ZR1) / 2);
    // near strip (aprons, house fronts) and the far paved strip
    for (const sx of [-1, 1]) B.plane(m.strip, XT - 4.3, ZG0 - 5.2, sx * (XT + 4.3) / 2, 0, (5.2 + ZG0) / 2, { uv: [sx * 0.3, 0] });
    for (const [a, b] of [[-XT, -9.5], [-7.4, XT]]) B.plane(m.paving, b - a, ZF - ZG3, (a + b) / 2, 0, (ZG3 + ZF) / 2);
    // side ditches: concrete lids with steel gratings at driveways and the shop front
    const gutter = (z0, z1, grates) => {
      let x = -XT;
      for (const [a, b] of [...grates.sort((p, q) => p[0] - q[0]), [XT, XT]]) {
        if (a > x) B.box(m.lid, a - x, 0.05, z1 - z0, (x + a) / 2, -0.05, (z0 + z1) / 2, { uv: [x, 0] });
        if (b > a) B.box(m.grate, b - a, 0.05, z1 - z0, (a + b) / 2, -0.048, (z0 + z1) / 2);
        x = b;
      }
    };
    gutter(ZG0, ZG1, [[-3.4, 3.4], [4.6, 7.6], [9.8, 11.3], [-20.6, -19.4]]);
    gutter(ZR1, ZG3, [[-9.5, -7.4], [10.1, 12.6], [-1.6, -0.9]]);
    // white edge lines (break at the alley mouths), narrowing into the underpasses
    const line = (x0, x1, z, w = 0.15) => B.box(m.paint, x1 - x0, 0.006, w, (x0 + x1) / 2, 0, z);
    const diag = (x0, z0, x1, z1) => { const len = Math.hypot(x1 - x0, z1 - z0); B.box(m.paint, len, 0.006, 0.15, (x0 + x1) / 2, 0, (z0 + z1) / 2, { ry: -Math.atan2(z1 - z0, x1 - x0) }); };
    line(-24, -3.6, 6.45); line(3.6, 9.6, 6.45); line(11.5, 24, 6.45);
    line(-24, -9.7, 13.0); line(-7.2, 24, 13.0);
    for (const s of [-1, 1]) {
      diag(s * 24, 6.45, s * XT, 6.95); diag(s * 24, 13.0, s * XT, 11.4);
      const pin = this.indoor(m.paint);
      B.box(pin, XE - XT + 3, 0.006, 0.15, s * (XT + XE + 3) / 2, 0, 6.95);
      B.box(pin, XE - XT, 0.006, 0.15, s * (XT + XE) / 2, 0, 11.4);
      // hatched narrowing (導流帯) before the far-side kerb
      for (let i = 0; i < 4; i++) diag(s * (24.3 + i * 0.45), 13.0, s * (24.3 + i * 0.45 + 0.5), 13.0 - 0.45 - i * 0.28);
    }
    // painted speed limit, the alley's stop line + 止まれ
    B.plane(this.T('speed30', 40, 24, { alpha: true, decal: true, rough: 0.8 }), 1.1, 1.8, 15.5, 0.004, 8.4, { unit: true, ry: -Math.PI / 2 });
    B.plane(this.T('speed30', 40, 24, { alpha: true, decal: true, rough: 0.8 }), 1.1, 1.8, -17.5, 0.004, 11.2, { unit: true, ry: Math.PI / 2 });
    B.plane(m.road, 2.1, 22.4 - ZG3, -8.45, 0, (ZG3 + 22.4) / 2, { uv: [7, 2] });
    line(-9.4, -7.5, 15.15, 0.3);
    B.plane(this.T('tomare', 48, 20, { alpha: true, decal: true, rough: 0.8 }), 1.5, 1.4, -8.45, 0.004, 16.1, { unit: true });
  }

  // ---------------------------------------------------------------- the shop front
  buildShopFront() {
    const G = GARAGE, H = G.height, B = this.B, m = this.m;
    // apron in front of the shutter
    B.plane(this.M('floorHD', { roughness: 0.85, ppm: 64 }), 8.6, ZG0 - 5.2, 0, 0, (5.2 + ZG0) / 2, { uv: [0, 0.4] });
    // corrugated cladding on the two piers
    for (const sx of [-1, 1]) B.box(m.tinTeal, 1.3, H + 0.05, 0.05, sx * 3.65, 0, 5.235, { uv: [sx, 0], ao: 0.15 });
    // a plain low false front above the shutter: corrugated cladding with returns, pilasters and coping
    const PH = 1.15;
    B.box(m.tinTeal, 8.7, PH, 0.26, 0, H, 5.08, { uv: [0.4, 0.3] });
    for (const sx of [-1, 1]) {
      B.box(m.tinTeal, 0.22, PH, 1.6, sx * 4.24, H, 4.3, { uv: [0.2, 0.3] });
      B.box(m.pv, 0.3, PH + 0.02, 0.34, sx * 4.25, H, 5.12, { tint: 0x5a5a52 });
    }
    B.box(m.pv, 9.0, 0.12, 0.46, 0, H + PH, 5.1, { tint: 0x5a5650 });
    B.box(m.pv, 8.8, 0.08, 0.36, 0, H + PH + 0.12, 5.08, { tint: 0x4a4640 });
    // a few bolted-on bits: conduit, an old enamel lamp bracket, a meter box
    B.box(m.pv, 6.8, 0.05, 0.05, 0, H + 0.95, 5.24, { tint: 0x3a3a38 });
    for (const x of [-2.2, 2.2]) { B.box(m.metal, 0.05, 0.05, 0.4, x, H + 0.82, 5.42, { tint: 0x2a2c2e }); B.box(m.metal, 0.24, 0.1, 0.24, x, H + 0.7, 5.62, { tint: 0x2a3a2e }); }
    B.box(m.pv, 0.32, 0.4, 0.12, -3.62, 2.2, 5.3, { tint: 0x8a8e88 });
    // the garage roof behind the parapet + an exterior skin on the exposed east wall
    B.box(m.tin, 8.7, 0.12, 10.6, 0, H + 0.14, -0.1, { k: 0.8 });
    B.box(m.tin, 0.06, H + 0.25, 10.4, 4.24, 0, -0.05, { uv: [0, 0.2], ao: 0.2, k: 0.9 });
    // fascia band + tin eave (庇) over the shutter
    B.box(m.wood, 8.4, 0.24, 0.08, 0, H - 0.02, 5.25);
    B.box(m.tinRed, 8.2, 0.07, 0.95, 0, H + 0.05, 5.7, { rx: 0.07 });
    B.box(m.tinRed, 8.0, 0.06, 0.5, 0, H + 0.11, 5.48, { rx: 0.07 });
    B.box(m.pv, 8.26, 0.14, 0.05, 0, H - 0.06, 6.16, { tint: 0x3a3430 });
    for (const sx of [-1, 1]) B.box(m.metal, 0.04, 0.5, 0.04, sx * 3.95, H - 0.4, 5.85, { rx: -0.9, tint: 0x5a5a58 });
    this.shop = { openG: new THREE.Group(), closedG: new THREE.Group() };
    this.add(this.shop.openG); this.add(this.shop.closedG);
    this.buildLanterns(H);
    this.noren(H, this.shop.openG);
    // the two lamp shades over the front only light up while the shop is open
    const bulbs = [-2.2, 2.2].map((x) => { const g = new THREE.BoxGeometry(0.16, 0.03, 0.16); g.translate(x, H + 0.685, 5.62); return g; });
    this.shop.openG.add(this.vmesh(mergeGeometries(bulbs), this.G));
    // out front: dagashiya-style things (open) — weeds and a taped notice (closed)
    const O = this.shop.openG, C = this.shop.closedG;
    this.single('gacha_twin', -2.55, 0, 5.62, 0, {}, O);
    this.single('shop_bench', 2.75, 0, 5.52, 0, {}, O);
    this.shop.obs = [this.game.player.addObstacle(-3.02, -2.08, 5.4, 5.84), this.game.player.addObstacle(2.27, 3.23, 5.34, 5.7)];
    this.single('kakigori_flag', 3.95, 0, 5.48, -0.25, {}, O);
    this.single('sign_stand', -3.55, 0, 5.62, 0.35, {}, O);
    this.prop('tanuki_statue', -4.05, 0, 5.5, 0.3);
    this.nobori(4.55, 5.5, O);
    // OPEN plate hanging on the right pier
    const plate = this.vmesh(new THREE.BoxGeometry(0.42, 0.18, 0.02), this.T('openPlate', 32, 14, { glow: 0.25 }));
    plate.position.set(3.62, 1.95, 5.28); O.add(plate);
    const cord = this.vmesh(new THREE.BoxGeometry(0.3, 0.01, 0.01), this.P(0.8)); cord.position.set(3.62, 2.12, 5.28); O.add(cord);
    for (const [x, z] of [[-4.2, 5.45], [4.25, 5.4], [-1.2, 5.32]]) this.single('weeds', x, 0, z, hash2(x, z) * 3, { scale: 0.9 }, C);
    const notice = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.56), new THREE.MeshStandardMaterial({ map: posterTexture('museumSign', 48, 64), roughness: 0.95, color: 0xc8c0b0 }));
    notice.position.set(-3.5, 1.45, 5.27); notice.rotation.z = 0.04; C.add(notice);
  }

  /** 暖簾 over the doorway: three indigo panels with a white capsule mark (shown while open). */
  noren(H, parent) {
    const mat = this.T('noren', 24, 40, { rough: 0.95 });
    const g = new THREE.Group();
    for (let i = -1; i <= 1; i++) {
      const panel = this.vmesh(new THREE.BoxGeometry(0.66, 0.72, 0.015), mat);
      panel.position.set(i * 0.69, H - 0.48, 6.06);
      panel.rotation.x = 0.03;
      g.add(panel);
    }
    const rod = this.vmesh(new THREE.BoxGeometry(2.3, 0.03, 0.03), this.P(0.6));
    rod.position.set(0, H - 0.1, 6.06);
    g.add(rod);
    parent.add(g);
  }

  /** Row of blocky paper lanterns under the eave. */
  buildLanterns(H) {
    const S = this.shop, B = this.B;
    const tex = townPix('lantern', 16, 24).texture();
    S.lanternM = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.3, roughness: 0.8 });
    const geos = [];
    for (const x of [-3.2, -1.6, 1.6, 3.2]) {
      const y = H - 0.55, z = 6.02;
      const g = new THREE.BoxGeometry(0.28, 0.36, 0.28); g.translate(x, y, z); geos.push(g);
      // tapered paper ends + black caps + hanging cord
      B.box(this.m.pv, 0.22, 0.04, 0.22, x, y + 0.18, z, { tint: 0xb0281e });
      B.box(this.m.pv, 0.22, 0.04, 0.22, x, y - 0.22, z, { tint: 0xb0281e });
      B.box(this.m.pv, 0.16, 0.05, 0.16, x, y + 0.22, z, { tint: 0x1a1414 });
      B.box(this.m.pv, 0.16, 0.05, 0.16, x, y - 0.27, z, { tint: 0x1a1414 });
      B.box(this.m.pv, 0.012, 0.2, 0.012, x, y + 0.27, z, { tint: 0x1a1414 });
      B.box(this.m.pv, 0.06, 0.06, 0.02, x, y - 0.33, z, { tint: 0xe8c040 });
    }
    S.lanterns = new THREE.Mesh(mergeGeometries(geos), S.lanternM);
    this.add(S.lanterns);
    S.glow = new THREE.PointLight(0xff9a60, 2.4, 6.5, 1.6);
    S.glow.position.set(0, H - 0.5, 6.4);
    this.add(S.glow);
  }

  /** のぼり: a tall OPEN flag on a pole with a weighted base. */
  nobori(x, z, parent) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const pole = this.P(0.4, 0.5);
    const mk = (geo, mat, px, py, pz) => { const m = this.vmesh(geo, mat); m.position.set(px, py, pz); g.add(m); return m; };
    mk(new THREE.BoxGeometry(0.03, 2.1, 0.03), pole, 0, 1.05, 0);
    mk(new THREE.BoxGeometry(0.42, 0.025, 0.025), pole, 0.21, 2.0, 0);
    mk(new THREE.BoxGeometry(0.3, 0.12, 0.3), new THREE.MeshStandardMaterial({ color: 0x2a6a3a, roughness: 0.6 }), 0, 0.06, 0);
    const flag = mk(new THREE.BoxGeometry(0.4, 1.5, 0.01), this.T('nobori', 20, 80, { rough: 0.9 }), 0.22, 1.25, 0);
    flag.rotation.y = 0.15;
    g.rotation.y = -0.25;
    parent.add(g);
  }

  setShopOpen(open) {
    const S = this.shop;
    if (!S) return;
    this.shopOpen = open;
    S.lanternM.emissiveIntensity = open ? 1.3 : 0;
    S.lanternM.color.setScalar(open ? 1 : 0.45);
    S.glow.intensity = open ? 2.4 : 0;
    S.openG.visible = open;
    S.closedG.visible = !open;
    for (const o of S.obs || []) o.enabled = open;
  }

  // ---------------------------------------------------------------- houses
  /**
   * A house with real depth in its own frame (front wall at local z=0, body toward -z), turned to face the lane.
   * o: { x, z, w, d, side(+1 near/-1 far), y0, floors, h1, h2, wallA, wallB, roof('gable'|'shed'|'flat'), roofM,
   *      eave, pent, balcony:{x0,x1}, win:[[floor, u, w, h, kind, {face,sill,grille,tobukuro}]], door:{x, kind, w}, antenna, gutterTint }
   */
  house(o) {
    const B = this.B, m = this.m;
    const W = o.w, D = o.d, side = o.side ?? 1, seed = Math.floor(Math.abs(o.x * 3.7 + o.z * 1.3));
    this._lite = !!o.lite;
    B.push(o.x, o.y0 || 0, o.z, side > 0 ? 0 : Math.PI);
    const base = o.y0 ? 0 : 0.4;
    if (base) B.box(m.found, W + 0.08, base, D + 0.08, 0, 0, -D / 2, { uv: [seed, 0] });
    const h1 = o.h1 ?? 2.65, h2 = (o.floors ?? 2) > 1 ? (o.h2 ?? 2.55) : 0;
    const fy = [base, base + h1];
    const wallA = o.wallA || m.wallCream, wallB = o.wallB || wallA;
    B.box(wallA, W, h1, D, 0, base, -D / 2, { uv: [seed % 3, 0], ao: o.y0 ? 0 : 0.22 });
    let top = base + h1;
    if (h2) {
      B.box(m.pv, W + 0.06, 0.12, D + 0.06, 0, top - 0.06, -D / 2, { tint: o.trim ?? 0x6a5a4a });
      B.box(wallB, W, h2, D, 0, top, -D / 2, { uv: [seed % 5, 0.4] });
      top += h2;
    }
    this.roof(W, D, top, o, wallB);
    // pent roof (下屋) over the ground floor, skipping the balcony
    if (o.pent && h2) {
      const spans = o.balcony ? [[-W / 2 - 0.12, o.balcony.x0 - 0.05], [o.balcony.x1 + 0.05, W / 2 + 0.12]] : [[-W / 2 - 0.12, W / 2 + 0.12]];
      for (const [a, b] of spans) if (b - a > 0.3) for (let j = 0; j < 3; j++) B.box(o.roofM || m.roofGrey, b - a, 0.11, 0.78 - j * 0.24, (a + b) / 2, fy[1] - 0.34 + j * 0.11, (0.78 - j * 0.24) / 2, { uv: [j * 0.3, 0] });
    }
    if (o.balcony) this.balcony(o.balcony, fy[1], seed);
    for (const w of o.win || []) this.window(W, w, fy);
    if (o.door) this.door(o.door, base, o.win, fy);
    // rain gutters + downpipes (offset from the gutter, wall brackets, a shoe over a splash block)
    const gt = o.gutterTint ?? 0x9a9690, e = o.eave ?? 0.45, dpx = (W / 2 + 0.06) * (seed % 2 ? 1 : -1);
    if (o.roof !== 'flat') {
      B.box(m.pv, W + 0.6, 0.1, 0.1, 0, top - 0.08, e + 0.03, { tint: gt });
      B.box(m.pv, 0.08, top - 0.12, 0.08, dpx, 0.08, 0.12, { tint: gt });
      B.box(m.pv, 0.07, 0.07, e - 0.04, dpx, top - 0.2, (e + 0.15) / 2 + 0.02, { tint: gt });
      B.box(m.pv, 0.13, 0.12, 0.13, dpx, top - 0.16, e + 0.03, { tint: gt });
      for (let y = 0.9; y < top - 0.5; y += 1.15) B.box(m.metal, 0.12, 0.03, 0.05, dpx, y, 0.1, { tint: 0x7a7a78 });
      B.box(m.pv, 0.08, 0.07, 0.16, dpx, 0.06, 0.2, { tint: gt });
      if (!o.y0) B.box(m.found, 0.24, 0.04, 0.3, dpx, 0, 0.36, { k: 0.9 });
    }
    B.box(m.pv, 0.08, top, 0.08, (W / 2 + 0.06) * (seed % 2 ? -1 : 1), 0, -D + 0.15, { tint: gt });
    if (!o.lite) this.weather(W, D, base, fy, top, seed, !!h2, o);
    // side-wall services: meter box, gas meter
    const sx = seed % 2 ? 1 : -1;
    B.box(m.pv, 0.06, 0.4, 0.3, sx * (W / 2 + 0.03), base + 1.1, -1.2, { tint: 0xc8c4bc });
    B.box(m.pv, 0.06, 0.28, 0.22, sx * (W / 2 + 0.03), base + 0.7, -2.1, { tint: 0xb8bcb0 });
    if (o.antenna) {
      const ax = o.antenna, ay = this._ridgeY, az = -D / 2;
      B.box(m.metal, 0.04, 1.6, 0.04, ax, ay, az, { tint: 0xb8bcc0 });
      B.box(m.metal, 0.03, 0.03, 1.4, ax, ay + 1.45, az, { tint: 0xb8bcc0 });
      for (let i = 0; i < 6; i++) B.box(m.metal, 0.5 - i * 0.05, 0.02, 0.02, ax, ay + 1.47, az - 0.6 + i * 0.24, { tint: 0xc8ccd0 });
    }
    // wire anchor at the front eave corner for service drops
    const anchor = B.world((W / 2 - 0.3) * (seed % 2 ? 1 : -1), top - 0.3, 0.3);
    (side > 0 ? this.anchors.near : this.anchors.far).push(anchor);
    B.pop();
    return { top, anchor };
  }

  /** Weathering and services on a house's lane face (in the house's frame): splash-back dirt, soot under the eaves,
   *  rain streaks, an address plate, wall-mounted AC units on brackets (o.ac = [[floor, u], ...]). */
  weather(W, D, base, fy, top, seed, two, o) {
    const B = this.B, m = this.m, drip = this.decal('stainDrip', 16, 48), sb = this.decal('stainBase', 32, 16);
    if (base) this.stainRow(sb, -W / 2 - 0.035, W / 2 + 0.035, 0, base, 0.052, 0, 0xb0aca4);
    if (!o.y0) this.stainRow(sb, -W / 2, W / 2, base, 0.4, 0.011, 0, 0xd0ccc4);
    if (!o.y0) for (const sx of [-1, 1]) this.stainRow(sb, -D, 0, base, 0.55, sx * (W / 2 + 0.011), sx * Math.PI / 2, 0xc0bcb4, 'z');
    if (o.roof !== 'flat') this.stainRow(drip, -W / 2, W / 2, top - 0.6, 0.6, 0.011, 0, 0xb8b4ac);
    for (let i = 0; i < 2; i++) {
      const k = hash2(seed, i + 3), u = (k - 0.5) * (W - 0.8);
      B.quad(drip, 0.35 + k * 0.4, 0.8 + k * 0.9, u, (two ? fy[1] : top) - 0.86 - k * 0.9, 0.012, { tint: 0xc8c4bc, flipU: i % 2 === 1 });
    }
    // 住居表示 address plate on the corner away from the downpipe
    const ax = (W / 2 - 0.25) * (seed % 2 ? -1 : 1);
    B.box(m.pv, 0.28, 0.12, 0.012, ax, base + 1.68, 0.006, { tint: 0x2a3a6a });
    this.addrPlate(seed % 3, 0.26, 0.1, ax, base + 1.69, 0.014);
    for (const [fl, u] of o.ac || []) {
      const ay = fy[fl] + (fl ? 0.3 : 0);
      if (fl) for (const dx of [-0.28, 0.28]) {
        B.box(m.metal, 0.04, 0.04, 0.38, u + dx, ay - 0.04, 0.19, { tint: 0x8a8e90 });
        B.box(m.metal, 0.04, 0.42, 0.04, u + dx, ay - 0.42, 0.02, { tint: 0x8a8e90 });
        B.box(m.metal, 0.03, 0.03, 0.5, u + dx, ay - 0.27, 0.17, { rx: 0.85, tint: 0x8a8e90 });
      }
      // the outdoor unit (low-poly: casing + pixel fan grille), its pipe duct running into the wall
      B.box(m.pv, 0.78, 0.54, 0.27, u, ay, 0.17, { tint: 0xe4e2d8 });
      this.sign('acFront', 0.76, 0.52, u, ay + 0.01, 0.306);
      B.box(m.pv, 0.06, 0.06, 0.24, u - 0.26, ay - 0.06, 0.17, { tint: 0x3a3a3a });
      B.box(m.pv, 0.06, 0.06, 0.24, u + 0.26, ay - 0.06, 0.17, { tint: 0x3a3a3a });
      B.box(m.pv, 0.09, 0.62, 0.07, u + 0.45, ay + 0.1, 0.04, { tint: 0xe0d8c4 });
      B.box(m.pv, 0.1, 0.1, 0.16, u + 0.45, ay + 0.1, 0.12, { tint: 0xd8d0bc });
    }
  }

  /** A row of ~1 m stain decals along local x (or z) at height y on a wall plane. */
  stainRow(mat, x0, x1, y, h, z, ry = 0, tint = 0xc0bcb4, axis = 'x') {
    const n = Math.max(1, Math.round((x1 - x0) / 1.1)), w = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      const c = x0 + (i + 0.5) * w, flipU = hash2(Math.round(c * 7), Math.round(z * 3 + y * 5)) < 0.5;
      if (axis === 'x') this.B.quad(mat, w, h, c, y, z, { ry, tint, flipU });
      else this.B.quad(mat, w, h, z, y, c, { ry, tint, flipU });
    }
  }

  /** Stepped (blocky) roof: gable with ridge along x, a shed, or a flat roof with parapet. */
  roof(W, D, yb, o, attic) {
    const B = this.B, m = this.m;
    const rm = o.roofM || m.roofGrey, kind = o.roof || 'gable';
    const e = o.eave ?? 0.45, es = o.verge ?? 0.3, s = o.step ?? 0.3, r = o.rise ?? 0.13;
    const barge = o.barge ?? 0x4a3a2e, RW = W + 2 * es;
    if (kind === 'flat') {
      B.box(m.conc, W + 0.1, 0.5, D + 0.1, 0, yb, -D / 2, { k: 0.9 });
      B.box(m.pv, W + 0.16, 0.08, D + 0.16, 0, yb + 0.5, -D / 2, { tint: 0x8a8680 });
      this._ridgeY = yb + 0.58;
      return;
    }
    // soffits under the front/back eaves
    B.box(m.pv, RW, 0.04, e, 0, yb - 0.04, e / 2, { tint: 0xd0c8b8 });
    if (kind === 'gable') B.box(m.pv, RW, 0.04, e, 0, yb - 0.04, -D - e / 2, { tint: 0xd0c8b8 });
    const mid = kind === 'gable' ? -D / 2 : -D - e;
    for (let i = 0; ; i++) {
      const y = yb + i * r, zo = e - i * s, zi = zo - s;
      if (zi <= mid + 0.001) {
        if (kind === 'gable') {
          const len = 2 * (zo - mid);
          B.box(rm, RW, r, len, 0, y, mid, { uv: [i * 0.1, 0] });
          B.box(m.ridge, RW + 0.08, 0.14, 0.34, 0, y + r, mid, { tint: 0x5a6068 });
          B.box(m.ridge, RW + 0.12, 0.09, 0.2, 0, y + r + 0.14, mid, { tint: 0x4a5058 });
          for (const sx of [-1, 1]) B.box(m.ridge, 0.14, 0.36, 0.42, sx * (RW / 2 + 0.06), y + r - 0.02, mid, { tint: 0x4a5058 });
          for (const sx of [-1, 1]) B.box(m.pv, 0.05, r + 0.02, len, sx * (RW / 2 + 0.025), y - 0.01, mid, { tint: barge });
          this._ridgeY = y + r + 0.23;
        } else {
          B.box(rm, RW, r, zo - mid, 0, y, (zo + mid) / 2);
          B.box(m.pv, RW, r + 0.06, 0.06, 0, y - 0.03, mid - 0.03, { tint: barge });
          this._ridgeY = y + r;
        }
        break;
      }
      B.box(rm, RW, r, s, 0, y, zi + s / 2, { uv: [i * 0.13, 0] });
      if (kind === 'gable') B.box(rm, RW, r, s, 0, y, -D - zi - s / 2, { uv: [i * 0.13, 0.5] });
      const a0 = kind === 'gable' ? Math.max(-D, -D - zi) : -D, a1 = Math.min(0, zi);
      if (a1 - a0 > 0.01) B.box(attic, W, r, a1 - a0, 0, y, (a0 + a1) / 2);
      for (const sx of [-1, 1]) {
        B.box(m.pv, 0.05, r + 0.02, s, sx * (RW / 2 + 0.025), y - 0.01, zi + s / 2, { tint: barge });
        if (kind === 'gable') B.box(m.pv, 0.05, r + 0.02, s, sx * (RW / 2 + 0.025), y - 0.01, -D - zi - s / 2, { tint: barge });
      }
    }
    // a Shōwa solar water heater (太陽熱温水器) on the front slope: collector panel + hot-water tank on legs
    if (o.solar !== undefined && kind === 'gable') {
      const ang = Math.atan2(r, s), slopeY = (z) => yb + (e - z) * r / s + r;
      const zc = e - 1.1, x = o.solar;
      B.box(m.metal, 1.7, 0.07, 1.3, x, slopeY(zc) + 0.08, zc, { rx: ang, tint: 0x8a9096 });
      B.box(m.gloss, 1.6, 0.04, 1.2, x, slopeY(zc) + 0.13, zc, { rx: ang, tint: 0x24324a });
      for (let i = 0; i < 7; i++) B.box(m.metal, 0.02, 0.05, 1.2, x - 0.72 + i * 0.24, slopeY(zc) + 0.13, zc, { rx: ang, tint: 0x9aa4ac });
      const zt = zc - 0.82, yt = slopeY(zt) + 0.22;
      for (const dx of [-0.7, 0.7]) B.box(m.metal, 0.05, 0.3, 0.05, x + dx, slopeY(zt) - 0.02, zt, { tint: 0x7a8088 });
      B.box(m.pv, 1.85, 0.38, 0.38, x, yt, zt, { tint: 0xe4e0d6 });
      for (const dx of [-0.93, 0.93]) B.box(m.pv, 0.04, 0.34, 0.34, x + dx, yt + 0.02, zt, { tint: 0xb8b4aa });
      B.box(m.pv, 0.04, 0.04, zt - zc + 0.6, x + 0.6, slopeY(zc) + 0.25, (zt + zc) / 2, { rx: ang, tint: 0x2a2a2a });
    }
  }

  /** Window with sash texture, sill, optional grille (面格子) and shutter box (戸袋). Spec: [floor, u, w, h, kind, opts]. */
  window(W, spec, fy) {
    const B = this.B, m = this.m;
    const [fl, u, w, h, kind, opt = {}] = spec;
    const face = opt.face || 'f';
    let x, z, ry;
    if (face === 'f') { x = u; z = 0; ry = 0; } else if (face === 'l') { x = -W / 2; z = -u; ry = -Math.PI / 2; } else { x = W / 2; z = -u; ry = Math.PI / 2; }
    const nx = Math.sin(ry), nz = Math.cos(ry), tx = Math.cos(ry), tz = -Math.sin(ry);
    const y = fy[fl] + (opt.sill ?? (fl ? 0.85 : 0.9));
    B.box(this.win[kind], w, h, 0.1, x, y, z, { unit: true, ry });
    // frame reveal + sill flashing
    B.box(m.metal, w + 0.1, 0.05, 0.12, x + nx * 0.05, y - 0.06, z + nz * 0.05, { ry, tint: 0xb8bcc0 });
    B.box(m.metal, w + 0.06, 0.04, 0.08, x + nx * 0.03, y + h, z + nz * 0.03, { ry, tint: 0x9aa0a6 });
    if (opt.grille) {
      for (let i = 0; i <= Math.round(w / 0.11); i++) { const t = -w / 2 + i * (w / Math.round(w / 0.11)); B.box(m.metal, 0.022, h + 0.08, 0.022, x + tx * t + nx * 0.11, y - 0.04, z + tz * t + nz * 0.11, { ry, tint: 0xc8ccd0 }); }
      for (const yy of [y - 0.04, y + h + 0.02]) B.box(m.metal, w + 0.04, 0.03, 0.03, x + nx * 0.11, yy, z + nz * 0.11, { ry, tint: 0xb8bcc0 });
    }
    if (opt.tobukuro) {
      const t = (w / 2 + 0.22) * opt.tobukuro;
      B.box(m.pv, 0.42, h + 0.12, 0.12, x + tx * t + nx * 0.06, y - 0.06, z + tz * t + nz * 0.06, { ry, tint: opt.tbTint ?? 0x8a7a62 });
    }
    if (opt.hood) B.box(m.pv, w + 0.3, 0.05, 0.36, x + nx * 0.18, y + h + 0.12, z + nz * 0.18, { ry, tint: 0x6a6a68 });
    // rain streaks under the sill
    const wp = B.world(x, y, z), hk = hash2(Math.round(wp.x * 7 + wp.z * 3), Math.round(y * 5));
    if (hk < 0.6 && !opt.clean && !this._lite) { const dh = 0.3 + hk * 0.6; B.quad(this.decal('stainDrip', 16, 48), w * 0.8, dh, x + nx * 0.012, y - 0.08 - dh, z + nz * 0.012, { ry, tint: 0xd8d4cc, flipU: hk < 0.3 }); }
    // summer bamboo blind (すだれ) hung over the window
    if (opt.sudare) {
      B.quad(this.T('sudare', 32, 48, { alpha: true, rough: 0.9 }), w + 0.16, h * opt.sudare + 0.08, x + nx * 0.17, y + h * (1 - opt.sudare) + 0.02, z + nz * 0.17, { ry });
      B.box(m.metal, w + 0.3, 0.025, 0.025, x + nx * 0.17, y + h + 0.1, z + nz * 0.17, { ry, tint: 0x6a6a68 });
    }
    // a window box of flowers on the sill
    if (opt.flowers) {
      B.box(m.pv, w * 0.9, 0.15, 0.2, x + nx * 0.16, y - 0.2, z + nz * 0.16, { ry, tint: 0x5a4030 });
      const n = Math.max(3, Math.round(w * 5)), cols = [0xe5383b, 0xff8fb2, 0xffd23f, 0xfbf8f0, 0x9a6ad8];
      for (let i = 0; i < n; i++) {
        const t = -w * 0.4 + (i + 0.5) * (w * 0.8 / n), fx = x + tx * t + nx * 0.16, fz = z + tz * t + nz * 0.16;
        B.box(m.pv, 0.13, 0.1, 0.14, fx, y - 0.06, fz, { ry, tint: hash2(i, wp.x) < 0.5 ? 0x3f7a32 : 0x4f8a3a });
        B.box(m.pv, 0.06, 0.05, 0.06, fx + tx * 0.02, y + 0.03 + hash2(i, 3) * 0.04, fz + tz * 0.02, { ry, tint: cols[Math.floor(hash2(i + wp.z, 5) * cols.length)] });
      }
    }
  }

  /** Front door: genkan sliding doors or a steel apartment door, with step, canopy, lamp, name plate and mailbox. */
  door(d, base, win = [], fy = [base, base + 2.65]) {
    const B = this.B, m = this.m;
    const w = d.w ?? (d.kind === 'apt' ? 0.9 : 1.5), x = d.x, y = base + (d.y ?? 0);
    B.box(this.doors[d.kind || 'genkan'], w, 2.0, 0.1, x, y, 0, { unit: true });
    B.box(m.metal, w + 0.12, 0.06, 0.12, x, y + 2.0, 0.02, { tint: 0x8a8478 });
    if (!d.noStep) B.box(m.found, w + 0.5, Math.max(0.1, base - 0.02), 0.6, x, 0, 0.3, { uv: [x, 0] });
    if (!d.noCanopy) { B.box(m.pv, w + 0.6, 0.06, 0.75, x, y + 2.28, 0.37, { tint: 0x5a5a58 }); B.box(m.pv, w + 0.6, 0.12, 0.04, x, y + 2.22, 0.74, { tint: 0x4a4a48 }); }
    const lx = x + (w / 2 + 0.25) * (d.lamp ?? 1);
    B.box(m.pv, 0.16, 0.22, 0.08, lx, y + 1.95, 0.04, { tint: 0x2a2a2a });
    B.box(this.G, 0.11, 0.15, 0.04, lx, y + 1.98, 0.09, { tint: 0xffd890 });
    // 表札 name plate on a little wooden backing, the intercom below it
    const dp = B.world(x, 0, 0), nk = Math.floor(hash2(Math.round(dp.x * 5), Math.round(dp.z * 5)) * 5) + 1;
    B.box(m.pv, 0.13, 0.25, 0.03, lx, y + 1.42, 0.015, { tint: 0x5a4030 });
    this.sign('names', 0.1, 0.2, lx, y + 1.445, 0.031, {}, [(nk - 1) * 12, 0, 12, 24]);
    B.box(m.pv, 0.08, 0.12, 0.04, lx, y + 1.22, 0.03, { tint: 0xd8d4cc });
    B.box(this.G, 0.02, 0.02, 0.01, lx, y + 1.3, 0.052, { tint: 0xff6040 });
    if (d.mail) B.box(m.pv, 0.32, 0.36, 0.14, lx, y + 0.8, 0.08, { tint: d.mail });
    // an old wooden milk box (牛乳箱) on the other side
    const mx = x - (w / 2 + 0.28) * (d.lamp ?? 1);
    const clear = !win.some(([fl, u, ww, , , op = {}]) => fl === 0 && (op.face || 'f') === 'f' && Math.abs(u - mx) < ww / 2 + 0.14 && fy[0] + (op.sill ?? 0.9) < y + 1.3);
    if (d.milk !== false && clear && hash2(nk, Math.round(dp.x)) < 0.6) {
      B.box(m.woodL, 0.2, 0.24, 0.15, mx, y + 1.0, 0.075, { k: 0.85 });
      B.box(m.wood, 0.22, 0.03, 0.17, mx, y + 1.24, 0.08);
      this.sign('signMilk', 0.15, 0.09, mx, y + 1.1, 0.152);
    }
  }

  /** 2F balcony: slab, aluminium railing, laundry pole with washing and maybe a futon airing. */
  balcony(b, fy1, seed) {
    const B = this.B, m = this.m;
    const w = b.x1 - b.x0, cx = (b.x0 + b.x1) / 2, d = b.d ?? 0.95;
    B.box(m.conc, w + 0.1, 0.16, d, cx, fy1 - 0.16, d / 2, { k: 0.95, uv: [seed, 0] });
    const rt = b.tint ?? 0xc8ccd0;
    if (b.panel) {
      B.box(m.pv, w + 0.1, 1.0, 0.05, cx, fy1, d - 0.03, { tint: b.panel });
      for (const sx of [-1, 1]) B.box(m.pv, 0.05, 1.0, d, cx + sx * (w / 2 + 0.02), fy1, d / 2, { tint: b.panel });
    } else {
      B.box(m.metal, w + 0.1, 0.05, 0.06, cx, fy1 + 1.0, d - 0.03, { tint: rt });
      B.box(m.metal, w + 0.1, 0.04, 0.05, cx, fy1 + 0.1, d - 0.03, { tint: rt });
      const n = Math.round(w / 0.12);
      for (let i = 0; i <= n; i++) B.box(m.metal, 0.025, 0.9, 0.025, b.x0 + i * (w / n), fy1 + 0.1, d - 0.03, { tint: rt });
      for (const sx of [-1, 1]) { B.box(m.metal, 0.05, 0.05, d, cx + sx * (w / 2 + 0.03), fy1 + 1.0, d / 2, { tint: rt }); for (let k = 1; k < 4; k++) B.box(m.metal, 0.025, 0.9, 0.025, cx + sx * (w / 2 + 0.03), fy1 + 0.1, k * d / 4, { tint: rt }); }
    }
    if (b.laundry !== false) {
      const py = fy1 + 1.85;
      B.box(m.metal, w - 0.2, 0.03, 0.03, cx, py, d * 0.55, { tint: 0x7ab0d8 });
      for (const sx of [-1, 1]) B.box(m.metal, 0.03, 0.4, 0.03, cx + sx * (w / 2 - 0.15), py - 0.2, d * 0.55, { tint: 0x9aa0a6 });
      const cols = [0xfbf8f0, 0x6a9ad8, 0xe86a7a, 0xffd23f, 0x5aa86a, 0xf4f0e8, 0x2a3a6a, 0xe8c8a0];
      let x = b.x0 + 0.2;
      for (let i = 0; x < b.x1 - 0.35; i++) {
        const cw = 0.24 + hash2(seed + i, 3) * 0.3, ch = 0.35 + hash2(seed + i, 4) * 0.45;
        if (hash2(seed + i, 5) < 0.8) B.box(m.pv, cw, ch, 0.03, x + cw / 2, py - ch, d * 0.55, { tint: cols[Math.floor(hash2(seed + i, 6) * cols.length)], ry: (hash2(i, seed) - 0.5) * 0.3 });
        x += cw + 0.1;
      }
    }
    if (b.futon) B.box(m.pv, Math.min(1.5, w - 0.3), 0.55, 0.14, cx + (b.futonX ?? 0), fy1 + 0.6, d + 0.04, { tint: b.futon });
  }

  /** Block wall along a building line with gaps; z is the wall's lane-side face. */
  blockWall(x0, x1, z, side, { h = 1.3, gaps = [], pillars = true, clean = [] } = {}) {
    const B = this.B, m = this.m, t = 0.15, zc = z - side * t / 2;
    const drip = this.decal('stainDrip', 16, 48), sb = this.decal('stainBase', 32, 16), ry = side > 0 ? 0 : Math.PI, zf = z + side * 0.011;
    // weathering on the lane face, split around spots that must stay clean (posters)
    const stain = (a, b) => {
      for (const [c0, c1] of clean) if (c1 > a && c0 < b) { stain(a, c0); stain(c1, b); return; }
      if (b - a < 0.3) return;
      this.stainRow(sb, a, b, 0, Math.min(0.5, h * 0.45), zf, ry, 0xc4c0b8);
      for (let u = a + 0.2; u < b - 0.5; u += 0.9 + hash2(u * 3, z) * 1.2) {
        const k = hash2(u, z * 2), w = Math.min(b - u, 0.4 + k * 0.6);
        if (k < 0.55) B.quad(drip, w, h * (0.3 + k * 0.5), u + w / 2, h - h * (0.3 + k * 0.5), zf, { ry, tint: 0xd0ccc4, flipU: k < 0.3 });
      }
    };
    let x = x0;
    for (const [a, b] of [...gaps, [x1, x1]]) {
      if (a - x > 0.05) {
        B.box(m.block, a - x, h, t, (x + a) / 2, 0, zc, { uv: [x * 0.7, 0], ao: 0.15 });
        B.box(m.found, a - x + 0.04, 0.07, t + 0.06, (x + a) / 2, h, zc, { uv: [x, 0] });
        stain(x + (pillars && x > x0 ? 0.27 : 0), a - (pillars && a < x1 ? 0.27 : 0));
      }
      if (b > a && pillars) for (const px of [a - 0.12, b + 0.12]) {
        B.box(m.block, 0.3, h + 0.25, 0.3, px, 0, zc, { uv: [px, 0.3], ao: 0.15 });
        B.box(m.found, 0.36, 0.08, 0.36, px, h + 0.25, zc);
      }
      x = b;
    }
  }

  /** Charred-cedar board fence (焼杉板塀) on a low block base, with posts and a cap rail; z is the lane-side face. */
  woodFence(x0, x1, z, side, { h = 1.6, gaps = [] } = {}) {
    const B = this.B, m = this.m, zc = z - side * 0.06;
    let x = x0;
    for (const [a, b] of [...gaps, [x1, x1]]) {
      if (a - x > 0.05) {
        B.box(m.block, a - x, 0.4, 0.15, (x + a) / 2, 0, z - side * 0.075, { uv: [x * 0.7, 0], ao: 0.15 });
        B.box(m.found, a - x + 0.02, 0.05, 0.17, (x + a) / 2, 0.4, z - side * 0.075);
        for (let u = x + 0.06; u < a - 0.04; u += 0.15) {
          const k = hash2(Math.round(u * 40), 5), bw = Math.min(0.14, a - 0.02 - u);
          B.box(m.wood, bw, h - 0.45 - k * 0.02, 0.025, u + bw / 2, 0.45, zc + side * 0.02, { tint: k < 0.2 ? 0x8a8070 : 0x5a5450, uv: [u * 3, k] });
        }
        for (const y of [0.7, h - 0.25]) B.box(m.wood, a - x, 0.06, 0.04, (x + a) / 2, y, zc - side * 0.01, { tint: 0x4a4440 });
        B.box(m.wood, a - x + 0.04, 0.05, 0.12, (x + a) / 2, h, zc, { tint: 0x3a3430 });
        for (let u = x + 0.05; u <= a; u += Math.max(0.5, (a - x) / Math.ceil((a - x) / 1.8))) B.box(m.wood, 0.09, h + 0.05, 0.09, Math.min(u, a - 0.05), 0, zc - side * 0.02, { tint: 0x3a3430 });
      }
      x = b;
    }
    // 冠木 gate posts with a little roof over the gap
    for (const [a, b] of gaps) {
      for (const px of [a - 0.06, b + 0.06]) B.box(m.wood, 0.14, 2.1, 0.14, px, 0, zc, { tint: 0x3a3430 });
      B.box(m.wood, b - a + 0.4, 0.1, 0.16, (a + b) / 2, 1.95, zc, { tint: 0x3a3430 });
      B.box(m.roofGrey, b - a + 0.6, 0.06, 0.5, (a + b) / 2, 2.12, zc, {});
    }
  }

  /** Sliding aluminium gate in a wall gap. */
  gate(a, b, z, side, open = 0.35) {
    const B = this.B, m = this.m, w = b - a - 0.06, zc = z - side * 0.25;
    const x = a + 0.03 + w / 2 - w * open;
    B.box(m.metal, w, 0.05, 0.05, x, 1.05, zc, { tint: 0x8a7a62 });
    B.box(m.metal, w, 0.05, 0.05, x, 0.08, zc, { tint: 0x8a7a62 });
    for (let i = 0; i <= Math.round(w / 0.1); i++) B.box(m.metal, 0.025, 0.97, 0.025, x - w / 2 + i * (w / Math.round(w / 0.1)), 0.08, zc, { tint: 0x9a8a72 });
  }

  /** Yard surface between a house front and the building line. */
  yard(x0, x1, z0, z1, mat) { this.B.plane(mat || this.m.strip, x1 - x0, z1 - z0, (x0 + x1) / 2, 0.002, (z0 + z1) / 2, { uv: [x0, z0], k: 0.92 }); }

  buildNearSide() {
    const m = this.m, B = this.B, s = 1;
    // ---- NE1: carport with the kei car, two-storey house
    this.house({ x: 7.05, z: 1.4, w: 5.2, d: 6.2, wallA: m.wallBeige, roofM: m.roofGrey, pent: true, balcony: { x0: -2.3, x1: 0.9, futon: 0xf0d8b0 }, antenna: 1.2,
      win: [[0, 1.4, 1.5, 1.1, 'lit', { flowers: true }], [0, -1.9, 0.7, 0.6, 'frost', { grille: true, sill: 1.3 }], [1, -0.7, 2.6, 1.85, 'lace', { sill: 0.05 }], [1, 1.8, 1.0, 1.0, 'dark', { tobukuro: 1 }],
        [0, 2.2, 1.2, 1.0, 'lit2', { face: 'r' }], [1, 4.0, 1.0, 1.0, 'dark', { face: 'r' }], [1, 2.0, 0.8, 0.9, 'lit3', { face: 'l' }]],
      door: { x: -0.4, kind: 'genkan', w: 1.3 } });
    this.yard(4.35, 9.75, 1.4, ZB - 0.15, m.strip);
    for (const [x, z] of [[4.6, 5.0], [7.5, 5.0], [4.6, 2.0], [7.5, 2.0]]) B.box(m.metal, 0.08, 2.35, 0.08, x, 0, z, { tint: 0xa8acae });
    B.box(m.metal, 3.2, 0.06, 3.5, 6.05, 2.36, 3.5, { rx: -0.05, tint: 0x9aa8b0 });
    B.box(m.metal, 3.2, 0.12, 0.08, 6.05, 2.28, 5.25, { tint: 0x8a9096 });
    this.prop('kei_car', 6.05, 0, 3.15, 0, { block: true });
    this.blockWall(7.6, 9.75, ZB, s, { gaps: [[8.35, 9.2]] });
    this.gate(8.35, 9.2, ZB, s);
    this.prop('ac_unit', 9.3, 0, 1.75, 0);
    // ---- alley A2 (dead end) between NE1 and NE2
    B.plane(m.strip, 1.5, 8.45, 10.55, 0.002, 5.2 - 4.225, { uv: [2, 2], k: 0.85 });
    this.blockWall(9.8, 11.3, -3.25, s, { h: 2.0, pillars: false });
    this.prop('twin_tub', 10.55, 0, -2.75, 0, { block: true });
    this.prop('mamachari', 10.1, 0, 1.2, 0.08, { block: true });
    this.prop('propane', 11.05, 0, 2.6, -Math.PI / 2, { block: true });
    this.prop('weeds', 10.6, 0, -3.0, 0.4);
    // ---- NE2: mortar house behind a gate
    this.house({ x: 13.95, z: 3.9, w: 5.2, d: 6.8, wallA: m.mortarG, wallB: m.mortarG, roofM: m.roofBlue, pent: true, antenna: -1.5, trim: 0x5a6a5a, solar: 0.9,
      win: [[0, -1.4, 1.6, 1.1, 'lit3', { grille: true }], [0, 1.6, 0.8, 0.6, 'frost', { sill: 1.3, grille: true }], [1, -1.2, 1.6, 1.1, 'shoji', { tobukuro: -1 }], [1, 1.4, 1.4, 1.1, 'lit', { hood: true, sudare: 0.7 }],
        [0, 2.0, 1.2, 1.0, 'dark', { face: 'l' }], [1, 3.5, 1.0, 0.9, 'lit4', { face: 'l' }], [1, 2.2, 0.8, 0.9, 'dark', { face: 'r' }]],
      door: { x: 0.3, kind: 'genkan', w: 1.3, mail: 0xc83a2a }, ac: [[1, 0.12]] });
    this.yard(11.3, 16.6, 3.9, ZB - 0.15, m.ground);
    this.blockWall(11.3, 16.6, ZB, s, { gaps: [[13.6, 14.6]] });
    this.gate(13.6, 14.6, ZB, s, 0.6);
    this.prop('potted_row', 12.3, 0, 4.6, 0);
    this.prop('ac_unit', 16.35, 0, 1.6, -Math.PI / 2);
    // ---- NE3: SAKURA HEIGHTS, a two-storey apartment with an exterior corridor and steel stairs
    this.apartment(19.35, 2.2);
    // ---- NE4: a little one-storey house with a garden, right up against the embankment
    this.house({ x: 24.2, z: 2.6, w: 2.9, d: 5.8, floors: 1, h1: 2.6, wallA: m.siding, roofM: m.roofBrown, eave: 0.55, verge: 0.25, barge: 0x3a2a20,
      win: [[0, 0.3, 1.6, 1.15, 'shoji', { tobukuro: -1 }], [0, 2.4, 1.2, 1.0, 'lit', { face: 'l' }]] });
    this.yard(22.75, 25.7, 2.6, ZB - 0.15, m.ground);
    for (const x of [23.3, 24.35, 25.4]) this.prop('bamboo_fence', x, 0, ZB - 0.1, 0);
    this.blockWall(22.6, 22.8, ZB, s, { pillars: false });
    this.prop('pine_tree', 23.4, 0, 3.8, 0.6, { scale: 0.9 });
    this.prop('stone_lantern', 25.0, 0, 3.6, -0.4, { scale: 0.8 });

    // ---- NW1: house beside the shop (garbage station out front)
    this.house({ x: -7.05, z: 3.4, w: 5.25, d: 7.0, wallA: m.siding, wallB: m.wallCream, roofM: m.roofBrown, pent: true, antenna: 1.0, trim: 0x4a3a2a,
      win: [[0, -1.2, 1.6, 1.15, 'lit', { grille: true }], [0, 1.7, 0.8, 0.6, 'frost', { sill: 1.3 }], [1, -1.4, 1.5, 1.1, 'lit2', { tobukuro: -1 }], [1, 1.3, 1.5, 1.1, 'tv'],
        [0, 2.4, 1.0, 1.0, 'lit4', { face: 'l' }], [1, 1.8, 1.0, 0.9, 'dark', { face: 'l' }]],
      door: { x: 0.6, kind: 'genkan', w: 1.2, lamp: -1, mail: 0x8a8e92 }, ac: [[1, -0.05]] });
    this.yard(-9.75, -4.35, 3.4, ZB - 0.15, m.strip);
    this.blockWall(-9.75, -4.35, ZB, s, { gaps: [[-5.35, -4.6]] });
    this.prop('plant_pots', -8.6, 0, 4.85, Math.PI, { scale: 0.75 });
    // ---- NW2: house behind a hedge
    this.house({ x: -12.55, z: 3.7, w: 5.2, d: 6.6, wallA: m.mortar, wallB: m.wallGrey, roofM: m.roofGrey, pent: true, balcony: { x0: -0.6, x1: 2.3 }, antenna: -1.4,
      win: [[0, -1.3, 1.6, 1.1, 'lit2', { flowers: true }], [0, 1.6, 1.2, 1.1, 'shoji', { grille: true }], [1, 0.85, 2.4, 1.85, 'lit4', { sill: 0.05 }], [1, -1.6, 1.2, 1.0, 'dark', { hood: true }],
        [0, 2.5, 1.2, 1.0, 'dark', { face: 'r' }], [1, 2.2, 1.0, 0.9, 'lit', { face: 'r' }], [1, 3.2, 0.9, 0.9, 'lit3', { face: 'l' }]],
      door: { x: 0.1, kind: 'genkan', w: 1.2 } });
    this.yard(-15.2, -9.9, 3.7, ZB - 0.15, m.ground);
    this.blockWall(-15.2, -9.9, ZB, s, { h: 0.5, gaps: [[-10.95, -10.1]] });
    for (const x of [-14.15, -12.15]) this.prop('hedge', x, 0.5, ZB - 0.32, 0);
    // ---- NW3: the old tobacco shop, shutter down for good
    this.house({ x: -18.0, z: ZB - 0.02, w: 5.15, d: 7.0, wallA: m.siding, wallB: m.wallBeige, roofM: m.roofGrey, trim: 0x3a2a20,
      win: [[1, -1.3, 1.4, 1.0, 'lit2', { tobukuro: 1 }], [1, 1.3, 1.4, 1.0, 'dark', { grille: true }], [0, 3.0, 1.0, 0.9, 'dark', { face: 'r' }], [1, 3.4, 1.0, 0.9, 'lit', { face: 'r' }]] });
    B.box(m.shutterM, 3.6, 2.1, 0.06, -18.2, 0.4, ZB + 0.01, { uv: [0, 0.3] });
    B.box(m.metal, 3.9, 0.3, 0.32, -18.2, 2.5, ZB + 0.1, { tint: 0x7a7e7a });
    B.box(this.T('oldSign', 96, 24, { rough: 0.9 }), 3.9, 0.55, 0.06, -18.2, 2.85, ZB + 0.04, { unit: true });
    this.prop('vending', -16.05, 0, 5.68, 0, { dim: true, block: true });
    this.prop('weeds', -19.6, 0, 5.45, 0.2);
    // ---- NW4: garden house by the embankment
    this.house({ x: -23.25, z: 2.0, w: 4.8, d: 6.0, wallA: m.wallCream, wallB: m.wallCream, roofM: m.roofGreen, pent: true, trim: 0x5a4a3a,
      win: [[0, -0.9, 1.8, 1.15, 'shoji', { tobukuro: 1 }], [1, 0.9, 1.4, 1.0, 'lit', { sudare: 0.65 }], [1, -1.3, 0.9, 0.9, 'dark'], [0, 2.4, 1.0, 1.0, 'lit3', { face: 'r' }]],
      door: { x: 1.3, kind: 'genkan', w: 1.2, lamp: -1 } });
    this.yard(-25.7, -20.85, 2.0, ZB - 0.15, m.ground);
    this.blockWall(-25.7, -20.85, ZB, s, { gaps: [[-22.6, -21.8]] });
    this.gate(-22.6, -21.8, ZB, s, 0.2);
    this.prop('pine_tree', -24.7, 0, 3.6, 0.2);
    this.prop('laundry_pole', -23.4, 0, 3.75, 0, { scale: 0.85 });
    // second row behind (skyline over the roofs; clear of the museum behind the garage)
    for (const [x, w, h] of [[-23, 6, 6.2], [-17, 5.5, 7.4], [-13.2, 3.4, 5.8], [13.8, 5, 7.0], [19.6, 6, 6.0], [24.4, 3.6, 7.6]]) this.backHouse(x, -6.3, w, 7, h, 1);
  }

  /** Cheap second-row house (body + stepped roof + a couple of windows). */
  backHouse(x, z, w, d, h, side) {
    const m = this.m, roofs = [m.roofGrey, m.roofBlue, m.roofBrown, m.roofGreen], walls = [m.wallCream, m.mortar, m.wallGrey, m.wallBeige];
    const k = Math.floor(hash2(x, z) * 4);
    this.house({ x, z, w, d, side, lite: true, floors: h > 6.5 ? 2 : 1, h1: h > 6.5 ? 2.7 : 3.2, h2: h - 3.4, wallA: walls[k], roofM: roofs[(k + 1) % 4], step: 0.45, rise: 0.2,
      win: [[0, -w / 4, 1.3, 1.0, hash2(x, 1) < 0.5 ? 'lit' : 'dark'], [h > 6.5 ? 1 : 0, w / 4, 1.2, 1.0, hash2(x, 2) < 0.6 ? 'lit3' : 'dark']] });
  }

  /** SAKURA HEIGHTS: exterior corridor, steel stairs, three doors a floor, mailboxes and bicycles. */
  apartment(x, z) {
    const B = this.B, m = this.m, W = 5.0, D = 7.0;
    this.house({ x, z, w: W, d: D, wallA: m.wallBlue, wallB: m.wallBlue, roof: 'shed', roofM: m.tin, eave: 0.6, step: 0.5, rise: 0.08, trim: 0x8a8e92, gutterTint: 0x7a7e82,
      win: [[0, -1.75, 0.6, 0.5, 'frost', { sill: 1.45, grille: true }], [0, 0.0, 0.6, 0.5, 'frost', { sill: 1.45, grille: true }], [0, 1.75, 0.6, 0.5, 'lit', { sill: 1.45, grille: true }],
        [1, -1.75, 0.6, 0.5, 'lit', { sill: 1.45, grille: true }], [1, 0.0, 0.6, 0.5, 'frost', { sill: 1.45, grille: true }], [1, 1.75, 0.6, 0.5, 'frost', { sill: 1.45, grille: true }],
        [0, 2.5, 1.2, 1.0, 'lit2', { face: 'l' }], [1, 2.5, 1.2, 1.0, 'dark', { face: 'l' }], [0, 5.0, 1.2, 1.0, 'tv', { face: 'l' }], [1, 5.0, 1.2, 1.0, 'lit', { face: 'l' }]] });
    B.push(x, 0, z, 0);
    const fy = [0.4, 3.05];
    for (const [i, fl] of [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]]) {
      const dx = -1.15 + i * 1.75;
      B.box(this.doors.apt, 0.85, 1.95, 0.1, dx, fy[fl], 0, { unit: true });
      B.box(this.G, 0.1, 0.1, 0.04, dx + 0.6, fy[fl] + 2.05, 0.06, { tint: hash2(i, fl) < 0.6 ? 0xffe0a0 : 0x9a9a8a });
      B.box(m.pv, 0.3, 0.4, 0.1, dx - 0.65, fy[fl] + 0.2, 0.08, { tint: 0x9aa4a8 });
    }
    // 2F corridor slab + solid parapet, columns
    B.box(m.conc, W + 0.9, 0.18, 1.2, 0.45, fy[1] - 0.18, 0.6, { k: 0.95 });
    B.box(m.pv, W + 0.9, 1.0, 0.06, 0.45, fy[1], 1.17, { tint: 0xd8dce0 });
    B.box(m.pv, W + 0.9, 0.06, 0.12, 0.45, fy[1] + 1.0, 1.17, { tint: 0x8a9096 });
    for (const cx of [-W / 2 + 0.05, 0, W / 2 + 0.85]) B.box(m.metal, 0.1, fy[1], 0.1, cx, 0, 1.15, { tint: 0x8a9096 });
    B.box(this.T('aptName', 48, 20), 0.9, 0.36, 0.04, -1.4, fy[1] + 0.35, 1.21, { unit: true });
    // steel stairs on the east end rising along -z
    const sx = W / 2 + 0.45, n = 14;
    const rx = -Math.atan2(fy[1] - 0.2, 3.3);
    for (let i = 0; i < n; i++) B.box(m.metal, 0.75, 0.04, 0.26, sx, 0.2 + (i + 1) * (fy[1] - 0.2) / n - 0.04, -2.95 + i * 0.24, { tint: 0x7a8288 });
    for (const dx of [-0.4, 0.4]) B.box(m.metal, 0.05, 0.25, 4.36, sx + dx, 1.6 - 0.125, -1.3, { rx, tint: 0x6a7278 });
    B.box(m.metal, 0.04, 0.04, 4.36, sx + 0.42, 2.5, -1.3, { rx, tint: 0xc8ccd0 });
    B.box(m.metal, 0.06, 0.9, 0.06, sx + 0.42, 0.2, -2.95, { tint: 0xc8ccd0 });
    // mailboxes, bicycles
    B.box(m.metal, 0.9, 0.55, 0.32, -2.0, 0.9, 1.0, { tint: 0xb8bcc0 });
    for (let i = 0; i < 6; i++) B.box(m.pv, 0.13, 0.12, 0.02, -2.38 + (i % 3) * 0.29 + 0.07, 1.0 + Math.floor(i / 3) * 0.24, 1.17, { tint: 0x9aa0a6 });
    B.box(m.metal, 0.08, 0.9, 0.08, -2.0, 0, 1.0, { tint: 0x8a8e92 });
    B.pop();
    this.yard(16.8, 22.65, z, ZB - 0.15, m.strip);
    this.blockWall(16.8, 22.65, ZB, 1, { h: 0.9, gaps: [[18.6, 20.2]], pillars: false });
    this.prop('mamachari', 21.2, 0, 4.3, Math.PI / 2 - 0.1);
    this.prop('scooter', 17.6, 0, 4.2, -Math.PI / 2 + 0.2);
    this.prop('recycle_cage', 17.6, 0, 3.0, 0);
  }

  buildFarSide() {
    const m = this.m, B = this.B, s = -1;
    // ---- FW1
    this.house({ x: -23.25, z: 16.3, w: 4.8, d: 7, side: s, wallA: m.wallGrey, wallB: m.wallGrey, roofM: m.roofBlue, pent: true, antenna: -1,
      win: [[0, 1.0, 1.6, 1.1, 'lit', { flowers: true }], [1, 1.0, 1.6, 1.1, 'lace'], [1, -1.4, 0.9, 0.9, 'dark', { tobukuro: -1 }], [0, 2.5, 1.0, 1.0, 'lit3', { face: 'r' }], [1, 2.8, 1.0, 0.9, 'dark', { face: 'r' }]],
      door: { x: -1.1, kind: 'genkan', w: 1.2 }, ac: [[1, -0.35]] });
    this.yard(-25.7, -20.85, ZF + 0.15, 16.3, m.ground);
    this.woodFence(-25.7, -20.85, ZF, s, { gaps: [[-22.15, -21.3]] });
    this.gate(-22.15, -21.3, ZF, s, 0.5);
    // ---- FW2
    this.house({ x: -18.1, z: 15.9, w: 5.0, d: 7, side: s, wallA: m.mortar, wallB: m.mortarP, roofM: m.roofBrown, pent: true, balcony: { x0: -2.1, x1: 0.8, futon: 0xfbf8f0, futonX: -0.2 },
      win: [[0, -1.3, 1.6, 1.1, 'lit4', { grille: true }], [0, 1.4, 1.2, 1.1, 'dark'], [1, -0.65, 2.4, 1.85, 'lit2', { sill: 0.05 }], [1, 1.6, 0.9, 0.9, 'lit', { sudare: 0.7 }], [0, 2.3, 1.0, 1.0, 'lit', { face: 'l' }], [1, 3.3, 0.9, 0.9, 'dark', { face: 'l' }]],
      door: { x: 0.9, kind: 'genkan', w: 1.1, lamp: -1, mail: 0x3a6a3a } });
    this.yard(-20.6, -15.55, ZF + 0.15, 15.9, m.strip);
    this.blockWall(-20.6, -15.55, ZF, s, { gaps: [[-18.6, -17.7]] });
    this.prop('vending', -17.0, 0, 14.45, Math.PI, { dim: true, block: true });
    this.prop('vending', -16.0, 0, 14.45, Math.PI, { dim: true, block: true });
    this.prop('drink_cans', -16.5, 0, 13.9, 0.6);
    // (corner shop x∈[-15.45,-9.4] is built separately; alley A1 x∈[-9.4,-7.45] with the Jizō shrine at its end)
    B.box(m.block, 0.15, 1.9, 2.5, -9.47, 0, 21.2, { ao: 0.15 });
    this.prop('jizo_shrine', -8.42, 0, 21.4, Math.PI, { block: true });
    this.prop('plant_pots', -9.05, 0, 19.8, Math.PI / 2, { scale: 0.7 });
    this.prop('weeds', -7.8, 0, 20.4, 1.2);
    this.prop('mirror_pole', -8.45, 0, 5.52, 0, { block: true });
    this.prop('tomare_sign', -7.15, 0, 14.72, 0, { block: true });
    B.box(m.block, 0.15, 1.9, 7.6, -7.38, 0, 18.6, { uv: [0, 0], ao: 0.15 });
    B.box(m.found, 0.21, 0.07, 7.6, -7.38, 1.9, 18.6);
    B.box(m.block, 2.2, 1.9, 0.15, -8.42, 0, 22.45, { ao: 0.15 });
    // ---- FE1
    this.house({ x: -4.5, z: 16.5, w: 5.4, d: 7, side: s, wallA: m.wallCream, wallB: m.wallBeige, roofM: m.roofGrey, pent: true, antenna: 1.4,
      win: [[0, -1.4, 1.6, 1.1, 'lit2'], [0, 1.6, 0.8, 0.6, 'frost', { sill: 1.3, grille: true }], [1, -1.2, 1.6, 1.1, 'lit', { tobukuro: -1 }], [1, 1.5, 1.2, 1.0, 'tv'],
        [0, 2.5, 1.0, 1.0, 'lit3', { face: 'l' }], [1, 3.0, 1.0, 0.9, 'dark', { face: 'r' }]],
      door: { x: 0.3, kind: 'genkan', w: 1.2, mail: 0xc83a2a }, ac: [[1, 0.2]] });
    this.yard(-7.4, -1.7, ZF + 0.15, 16.5, m.ground);
    this.blockWall(-7.4, -1.7, ZF, s, { gaps: [[-4.4, -3.5]], clean: [[-6.5, -4.55]] });
    this.gate(-4.4, -3.5, ZF, s, 0.45);
    // ---- FE2 (vending machines, post box and the lit street lamp out front)
    this.house({ x: 1.4, z: 16.6, w: 5.8, d: 7, side: s, wallA: m.siding, wallB: m.wallCream, roofM: m.roofBlue, pent: true, balcony: { x0: -0.4, x1: 2.6 }, trim: 0x3a2a20,
      win: [[0, -1.6, 1.6, 1.1, 'lit', { flowers: true }], [0, 1.6, 1.2, 1.0, 'lit3', { grille: true }], [1, 1.1, 2.6, 1.85, 'lace', { sill: 0.05 }], [1, -1.9, 1.0, 1.0, 'dark', { hood: true }],
        [0, 2.2, 1.0, 1.0, 'lit4', { face: 'r' }], [1, 2.5, 1.0, 0.9, 'lit2', { face: 'l' }]],
      door: { x: -0.1, kind: 'genkan', w: 1.2, lamp: -1 } });
    this.yard(-1.7, 4.45, ZF + 0.15, 16.6, m.strip);
    this.blockWall(-1.7, 4.45, ZF, s, { gaps: [[3.0, 3.8]] });
    // ---- FE3
    this.house({ x: 7.25, z: 16.0, w: 5.3, d: 7, side: s, wallA: m.mortarG, wallB: m.mortarG, roofM: m.roofGrey, pent: true, antenna: -1.2,
      win: [[0, -1.2, 1.8, 1.15, 'shoji', { tobukuro: 1 }], [0, 1.7, 0.8, 0.6, 'frost', { sill: 1.3 }], [1, -1.3, 1.5, 1.1, 'lit4', { sudare: 0.6 }], [1, 1.4, 1.5, 1.1, 'dark', { tobukuro: 1 }],
        [0, 2.6, 1.1, 1.0, 'lit', { face: 'l' }], [1, 2.6, 1.0, 0.9, 'lit2', { face: 'r' }]],
      door: { x: 0.4, kind: 'genkan', w: 1.2 }, ac: [[1, 0.05]] });
    this.yard(4.55, 9.95, ZF + 0.15, 16.0, m.ground);
    this.blockWall(4.55, 9.95, ZF, s, { h: 0.55, gaps: [[6.9, 7.8]] });
    for (const x of [5.6, 8.85]) this.prop('hedge', x, 0.55, ZF + 0.3, Math.PI, { scale: 0.95 });
    this.prop('potted_row', 7.35, 0, 14.48, Math.PI, { scale: 0.8 });
    // ---- FE4: modern-ish house with a shed roof and a driveway
    this.house({ x: 12.7, z: 18.4, w: 5.0, d: 6.4, side: s, wallA: m.wallGrey, wallB: m.siding, roof: 'shed', roofM: m.tin, eave: 0.5, step: 0.4, rise: 0.1, trim: 0x2a2a2a, gutterTint: 0x3a3a3a,
      win: [[0, -1.5, 1.4, 1.1, 'lit2'], [1, -0.6, 2.8, 0.9, 'lit', { sill: 0.9 }], [1, 1.9, 0.6, 0.9, 'dark'], [0, 2.4, 1.0, 1.0, 'dark', { face: 'l' }], [1, 3.4, 1.0, 0.9, 'tv', { face: 'r' }]],
      door: { x: 1.2, kind: 'apt', w: 0.95, mail: 0x2a2a2a } });
    this.yard(10.15, 15.3, ZF, 18.4, m.strip);
    this.prop('scooter', 11.3, 0, 16.5, Math.PI / 2 + 0.2, { block: true });
    this.prop('mamachari', 14.4, 0, 16.0, -Math.PI / 2 - 0.15, { block: true });
    this.prop('mirror_pole', 10.6, 0, 14.6, Math.PI, { block: true });
    // ---- FE5
    this.house({ x: 18.2, z: 16.0, w: 5.2, d: 7, side: s, wallA: m.mortarP, wallB: m.wallCream, roofM: m.roofBrown, pent: true, solar: -0.6, balcony: { x0: -2.2, x1: 0.6, futon: 0x6a9ad8 },
      win: [[0, -1.4, 1.6, 1.1, 'lit3'], [0, 1.6, 1.0, 1.0, 'dark', { grille: true }], [1, -0.8, 2.4, 1.85, 'lit', { sill: 0.05 }], [1, 1.6, 1.0, 1.0, 'lit2', { sudare: 0.75 }],
        [0, 2.6, 1.0, 1.0, 'lit', { face: 'r' }], [1, 3.1, 1.0, 0.9, 'dark', { face: 'l' }]],
      door: { x: 1.4, kind: 'genkan', w: 1.1, lamp: -1 } });
    this.yard(15.5, 20.9, ZF + 0.15, 16.0, m.strip);
    this.blockWall(15.5, 20.9, ZF, s, { gaps: [[16.4, 17.3]] });
    this.gate(16.4, 17.3, ZF, s, 0.3);
    this.prop('plant_pots', 19.6, 0, 14.53, Math.PI, { scale: 0.8 });
    // ---- FE6: rental garages (貸しガレージ)
    B.push(23.4, 0, 15.2, Math.PI);
    B.box(m.found, 4.7, 0.12, 5.2, 0, 0, -2.6);
    B.box(m.tin, 4.6, 2.7, 5.0, 0, 0.1, -2.6, { uv: [0, 0], ao: 0.2 });
    for (const dx of [-1.15, 1.15]) {
      B.box(m.shutterM, 2.0, 2.2, 0.05, dx, 0.1, 0.02);
      B.box(m.metal, 2.2, 0.26, 0.3, dx, 2.3, 0.12, { tint: 0x7a7e7a });
      B.box(m.pv, 0.3, 0.12, 0.02, dx + 0.6, 1.9, 0.06, { tint: 0xf4f0e6 });
    }
    B.box(m.tinRed, 5.0, 0.08, 5.5, 0, 2.8, -2.6, { rx: 0.06 });
    B.pop();
    this.yard(21.05, 25.7, ZF, 15.2, m.strip);
    this.prop('weeds', 22.1, 0, 15.0, 2);
    this.prop('weeds', 25.2, 0, 14.95, 0.6);
    // second row and a mid-rise block over the roofs
    for (const [x, w, h] of [[-23, 5.5, 7.6], [-17.2, 5, 6.2], [-11.6, 5.6, 7.2], [-5.4, 5.4, 6.0], [0.6, 5.6, 7.8], [6.6, 5.2, 6.4], [12.6, 5.8, 7.4], [18.6, 5.2, 6.1], [24.0, 4.6, 7.0]]) this.backHouse(x, 24.6 + hash2(x, 3) * 1.2, w, 7, h, -1);
    this.midrise(-6, 36, 16, 12.5);
    this.midrise(14, 38, 12, 15.5);
  }

  /** Four/five-storey マンション with a window grid and lit windows (background). */
  midrise(x, z, w, h) {
    const B = this.B, m = this.m;
    B.box(m.conc, w, h, 8, x, 0, z + 4, { k: 0.85, uv: [x, 0] });
    B.box(m.pv, w + 0.3, 0.4, 8.3, x, h, z + 4, { tint: 0x7a7672 });
    const floors = Math.floor(h / 3);
    for (let f = 0; f < floors; f++) {
      B.box(m.pv, w + 0.2, 0.12, 1.0, x, 0.9 + f * 3, z - 0.5, { tint: 0xb8b4ac });
      B.box(m.pv, w + 0.2, 0.9, 0.06, x, 1.02 + f * 3, z - 0.98, { tint: 0xc8c4bc });
      for (let i = 0; i < Math.floor(w / 3); i++) {
        const k = hash2(x + i, f);
        const kind = k < 0.35 ? 'lit' : k < 0.5 ? 'lit3' : k < 0.6 ? 'tv' : 'dark';
        B.box(this.win[kind], 1.8, 1.6, 0.1, x - w / 2 + 1.5 + i * 3, 1.1 + f * 3, z - 0.05, { unit: true, ry: Math.PI });
      }
    }
  }

  // ---------------------------------------------------------------- the corner store
  buildCornerShop() {
    const B = this.B, m = this.m;
    const x0 = -15.45, x1 = -9.4, z0 = ZF, z1 = 19.95, cx = (x0 + x1) / 2, H1 = 2.85;
    const dx0 = -13.3, dx1 = -11.55; // door opening
    // floor + threshold
    const I = (k) => this.indoor(k);
    B.box(I(m.tile), x1 - x0 - 0.5, 0.06, z1 - z0 - 0.25, cx, -0.048, (z0 + z1) / 2 + 0.02, { k: 0.9 });
    B.box(m.metal, dx1 - dx0 + 0.2, 0.025, 0.12, (dx0 + dx1) / 2, 0, z0 + 0.02, { tint: 0xb8bcc0 });
    // shell: side walls (both floors), back wall, ceiling / 2F floor
    for (const [xa, xb] of [[x0, x0 + 0.25], [x1 - 0.25, x1]]) {
      B.box(m.mortar, 0.25, H1 + 0.1, z1 - z0, (xa + xb) / 2, 0, (z0 + z1) / 2, { uv: [0, 0], ao: 0.15 });
    }
    B.box(m.mortar, x1 - x0, H1 + 0.1, 0.25, cx, 0, z1 - 0.125, { ao: 0.15 });
    // interior finishes: wainscot + plaster on the inner faces
    for (const sx of [-1, 1]) {
      const wx = sx < 0 ? x0 + 0.26 : x1 - 0.26;
      B.box(I(m.koshi), 0.02, 0.9, z1 - z0 - 0.3, wx, 0, (z0 + z1) / 2, { k: 0.9 });
      B.box(I(m.shikkui), 0.02, H1 - 0.9, z1 - z0 - 0.3, wx, 0.9, (z0 + z1) / 2, { k: 0.9 });
    }
    B.box(I(m.koshi), x1 - x0 - 0.5, 0.9, 0.02, cx, 0, z1 - 0.26, { k: 0.9 });
    B.box(I(m.shikkui), x1 - x0 - 0.5, H1 - 0.9, 0.02, cx, 0.9, z1 - 0.26, { k: 0.9 });
    B.box(I(m.ceil), x1 - x0 - 0.5, 0.06, z1 - z0 - 0.3, cx, H1 - 0.06, (z0 + z1) / 2 + 0.02, { k: 0.9 });
    B.box(I(m.wood), x1 - x0 - 0.6, 0.02, 0.2, cx, 2.3, z0 + 0.21, { k: 0.8 });
    B.box(m.wood, x1 - x0 - 0.5, 0.22, z1 - z0, cx, H1, (z0 + z1) / 2, { k: 0.8 });
    // shopfront: piers, kick panels, display windows, transom, door frame, open sliding doors
    for (const [a, b] of [[x0, x0 + 0.3], [x1 - 0.3, x1]]) B.box(m.mortar, b - a, H1 + 0.1, 0.28, (a + b) / 2, 0, z0 + 0.14, { ao: 0.2 });
    for (const [a, b] of [[x0 + 0.3, dx0], [dx1, x1 - 0.3]]) {
      B.box(m.pv, b - a, 0.6, 0.2, (a + b) / 2, 0, z0 + 0.1, { tint: 0x8a6a4a });
      B.box(m.metal, b - a, 0.05, 0.24, (a + b) / 2, 0.6, z0 + 0.1, { tint: 0xb8bcc0 });
      B.box(m.metal, 0.05, 1.6, 0.06, (a + b) / 2, 0.65, z0 + 0.1, { tint: 0xb8bcc0 });
      for (const sx of [a + 0.025, b - 0.025]) B.box(m.metal, 0.05, 1.6, 0.08, sx, 0.65, z0 + 0.1, { tint: 0xb8bcc0 });
      this.add(this.glassPane(b - a, 1.6, (a + b) / 2, 0.65 + 0.8, z0 + 0.1));
    }
    B.box(m.metal, x1 - x0 - 0.6, 0.06, 0.24, cx, 2.25, z0 + 0.1, { tint: 0xb8bcc0 });
    B.box(m.wood, x1 - x0 - 0.6, 0.6, 0.2, cx, 2.31, z0 + 0.1);
    for (const sx of [dx0, dx1]) B.box(m.metal, 0.06, 2.25, 0.12, sx, 0, z0 + 0.06, { tint: 0xa8acb0 });
    // the two door leaves, slid open in front of the windows
    for (const [a, b] of [[dx0 - 0.85, dx0 - 0.02], [dx1 + 0.02, dx1 + 0.85]]) {
      for (const sx of [a, b]) B.box(m.pv, 0.05, 2.18, 0.05, sx, 0.03, z0 - 0.04, { tint: 0xa8acb0 });
      for (const y of [0.03, 2.16]) B.box(m.pv, b - a, 0.05, 0.05, (a + b) / 2, y, z0 - 0.04, { tint: 0xa8acb0 });
      B.box(m.pv, b - a, 0.04, 0.05, (a + b) / 2, 0.95, z0 - 0.04, { tint: 0xa8acb0 });
      this.add(this.glassPane(b - a - 0.05, 2.1, (a + b) / 2, 1.08, z0 - 0.04));
    }
    // posters in the windows
    const poster = (key, w, h, x, y) => B.quad(this.T2(key), w, h, x, y, z0 + 0.13, { ry: Math.PI });
    poster('matsuri', 0.42, 0.64, -14.6, 1.0); poster('idol', 0.42, 0.64, -10.4, 1.0);
    // signboard, awning and the dwelling upstairs
    const sign = this.vmesh(new THREE.BoxGeometry(x1 - x0 + 0.1, 0.78, 0.12), [this.P(0.5), this.P(0.5), this.P(0.5), this.P(0.5), this.T('mikawaya', 240, 36, { glow: 0.55, rough: 0.4 }), this.P(0.5)]);
    sign.position.set(cx, H1 + 0.6, z0 - 0.16); sign.rotation.y = Math.PI;
    this.add(sign);
    B.box(m.metal, x1 - x0 + 0.2, 0.06, 0.16, cx, H1 + 0.98, z0 - 0.16, { tint: 0x3a3c40 });
    const aw = this.awningMat();
    for (let j = 0; j < 3; j++) B.box(aw, x1 - x0 - 0.3, 0.07, 0.9 - j * 0.28, cx, 2.3 + j * 0.07, z0 - (0.9 - j * 0.28) / 2, { uv: [0.2, 0] });
    B.box(aw, x1 - x0 - 0.3, 0.22, 0.03, cx, 2.1, z0 - 0.9, { uv: [0.2, 0] });
    this.house({ x: cx, z: z0, w: x1 - x0, d: z1 - z0, side: -1, y0: H1 + 0.22, floors: 1, h1: 2.5, wallA: m.wallCream, roofM: m.roofGrey, antenna: 1.6,
      win: [[0, -1.4, 1.6, 1.1, 'lit', { tobukuro: -1, sill: 0.8 }], [0, 1.5, 1.4, 1.0, 'lit2', { sill: 0.8 }], [0, 2.5, 1.2, 1.0, 'lit3', { face: 'l', sill: 0.8, clean: true }], [0, 2.5, 1.0, 1.0, 'dark', { face: 'r', sill: 0.8 }]] });
    // side (alley) wall details: a frosted window, an AC unit, the back door lamp
    B.box(this.win.frost, 0.8, 0.6, 0.1, x1, 1.6, 18.4, { unit: true, ry: Math.PI / 2 });
    this.prop('propane', x1 + 0.22, 0, 17.4, Math.PI / 2);
    this.prop('beercrate', -9.95, 0, 14.4, 0.15);
    this.prop('beercrate', -9.95, 0.28, 14.4, -0.1);
    this.prop('sign_stand', -11.15, 0, 14.5, Math.PI + 0.25, { block: true });
    // ---- interior
    const P = this.game.player;
    const IN = { indoor: true };
    this.prop('goods_shelf', x0 + 0.48, 0, 16.0, Math.PI / 2, IN);
    this.prop('goods_shelf2', x0 + 0.48, 0, 17.25, Math.PI / 2, IN);
    this.prop('goods_shelf', -12.71, 0, 16.6, Math.PI / 2, IN);
    this.prop('goods_shelf2', -13.15, 0, 16.6, -Math.PI / 2, IN);
    this.prop('milk_fridge', x1 - 0.6, 0, 18.55, -Math.PI / 2, IN);
    this.prop('dagashi_rack', x1 - 0.5, 0, 16.4, -Math.PI / 2, IN);
    this.prop('ramune_cooler', -10.85, 0, 15.4, Math.PI, IN);
    this.prop('wall_shelf_jars', -12.7, 1.35, z1 - 0.38, Math.PI, IN);
    this.prop('pendulum_clock', -14.4, 1.65, z1 - 0.3, Math.PI, IN);
    for (const x of [-13.9, -11.4]) this.prop('shop_lamp', x, H1 - 0.72, 17.2, 0, IN);
    // stacked crates of bottles in the back corner
    for (const [x, y, z, t] of [[-14.95, 0, 19.25, 0xc83a2a], [-14.95, 0.3, 19.25, 0xe8b830], [-14.45, 0, 19.3, 0xc83a2a]]) {
      B.box(I(m.pv), 0.45, 0.28, 0.36, x, y, z, { tint: t });
      for (let i = 0; i < 4; i++) B.box(I(m.gloss), 0.07, 0.1, 0.07, x - 0.15 + i * 0.1, y + 0.28, z, { tint: 0x5a3a1a });
    }
    // the counter (click target): glass showcase + old register + bell + lucky cat
    const counter = new THREE.Group();
    counter.name = 'cornerShopCounter';
    counter.position.set(-12.6, 0.45, 18.75); // origin 0.5 m under the counter top (things bought land on it)
    this.single('shop_counter', 0, -0.45, 0, Math.PI, IN, counter);
    this.single('cash_register', -0.45, 0.51, 0.1, 0, IN, counter);
    this.single('call_bell', 0.45, 0.51, -0.15, 0.3, IN, counter);
    this.single('manekineko', 0.65, 0.51, 0.15, Math.PI + 0.3, IN, counter);
    this.single('abacus', 0.05, 0.51, 0.1, Math.PI + 0.1, IN, counter);
    this.add(counter);
    this.game.physics.addBox({ center: new THREE.Vector3(-12.6, 0.48, 18.75), half: new THREE.Vector3(0.8, 0.48, 0.28), material: 'wood' });
    // fluorescent fixtures + the shop's light
    for (const x of [-14.0, -11.0]) {
      B.box(m.pv, 0.2, 0.06, 1.5, x, H1 - 0.13, 17.0, { tint: 0xe8e8e2 });
      B.box(this.G, 0.05, 0.04, 1.4, x - 0.05, H1 - 0.17, 17.0, { tint: 0xfff6e8 });
      B.box(this.G, 0.05, 0.04, 1.4, x + 0.05, H1 - 0.17, 17.0, { tint: 0xfff6e8 });
    }
    const L = new THREE.PointLight(0xfff0d8, 7, 8, 1.5);
    L.position.set(-12.4, 2.35, 17.3);
    this.add(L);
    this.cornerShop = {
      counter,
      keeper: { pos: new THREE.Vector3(-12.6, 0, 19.38), rotY: Math.PI },
      inside: { minX: x0 + 0.25, maxX: x1 - 0.25, minZ: z0, maxZ: z1 - 0.25 },
      door: { x0: dx0, x1: dx1, z: z0 },
    };
    // collisions: front piers + windows, walls, shelves, counter strip, fridge, rack, cooler
    const o = (a, b, c, d) => P.addObstacle(a, b, c, d);
    o(x0, dx0, z0 - 0.08, z0 + 0.24); o(dx1, x1, z0 - 0.08, z0 + 0.24);
    o(x0, x0 + 0.27, z0, z1); o(x1 - 0.27, x1, z0, z1); o(x0, x1, z1 - 0.28, z1);
    o(x0 + 0.25, x0 + 0.72, 15.35, 17.9);
    o(-13.4, -12.47, 15.98, 17.22);
    o(x0 + 0.25, -11.75, 18.45, z1); o(-11.8, x1 - 0.25, 18.95, z1);
    o(x1 - 0.95, x1 - 0.25, 18.1, 19.0); o(x1 - 0.78, x1 - 0.25, 15.88, 16.92);
    o(-11.35, -10.35, 15.12, 15.66);
    const ph = this.game.physics;
    for (const [cxx, czz, hx, hz] of [[x0 + 0.125, (z0 + z1) / 2, 0.125, (z1 - z0) / 2], [x1 - 0.125, (z0 + z1) / 2, 0.125, (z1 - z0) / 2], [cx, z1 - 0.125, (x1 - x0) / 2, 0.125]]) {
      ph.addBox({ center: new THREE.Vector3(cxx, 1.5, czz), half: new THREE.Vector3(hx, 1.5, hz), material: 'concrete' });
    }
  }

  /** Standalone mesh whose geometry gets a white colour attribute (so vertex-colour materials work). */
  vmesh(geo, mat) {
    const n = geo.attributes.position.count;
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
    return new THREE.Mesh(geo, mat);
  }
  glassPane(w, h, x, y, z) {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(w, h), this.glass);
    g.position.set(x, y, z); g.userData.noRim = true;
    return g;
  }
  /** Poster texture material (from the shared poster painters). */
  T2(key) {
    const ck = 'poster:' + key;
    if (!this.mats.has(ck)) this.mats.set(ck, new THREE.MeshStandardMaterial({ map: posterTexture(key, 64, 96), roughness: 0.9, vertexColors: true }));
    return this.mats.get(ck);
  }
  awningMat() {
    if (!this.mats.has('awning')) {
      const c = document.createElement('canvas'); c.width = 16; c.height = 4;
      const x = c.getContext('2d');
      for (let i = 0; i < 16; i++) { x.fillStyle = Math.floor(i / 2) % 2 ? '#f2f0ea' : '#2f8a4a'; x.fillRect(i, 0, 1, 4); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1);
      this.mats.set('awning', new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, vertexColors: true }));
    }
    return this.mats.get('awning');
  }

  // ---------------------------------------------------------------- the two railway underpasses
  buildUnderpasses() {
    const B = this.B, m = this.m;
    for (const s of [-1, 1]) {
      B.push(0, 0, 0, 0, s < 0); // mirrored for the west end: everything below is written for x > 0
      // retaining walls (間知石) either side of the portal, with coping
      for (const [za, zb] of [[-48, TZ0 - 1.4], [TZ1 + 1.4, 68]]) {
        B.box(m.kenchi, 1.0, YE - 0.25, zb - za, XT + 0.5, 0, (za + zb) / 2, { uv: [za * 0.37, 0], ao: 0.15 });
        B.box(m.found, 1.1, 0.25, zb - za, XT + 0.5, YE - 0.25, (za + zb) / 2, { uv: [za, 0] });
      }
      // brick abutments framing the opening, stone plinth and cap blocks
      for (const [za, zb] of [[TZ0 - 1.45, TZ0], [TZ1, TZ1 + 1.45]]) {
        B.box(m.brick, 0.45, TH + 0.6, zb - za, XT - 0.15, 0, (za + zb) / 2, { uv: [za, 0], ao: 0.2 });
        B.box(m.found, 0.55, 0.35, zb - za + 0.1, XT - 0.15, 0, (za + zb) / 2, { tint: 0xc8c0b0 });
        B.box(m.found, 0.6, 0.22, zb - za + 0.12, XT - 0.15, TH + 0.6, (za + zb) / 2, { tint: 0xd0c8b8 });
        B.box(m.brick, 0.5, YE - TH - 0.8, zb - za, XT - 0.12, TH + 0.82, (za + zb) / 2, { uv: [za, 0.4] });
        // hazard guards on the inner corners
        B.box(m.hazard, 0.05, 1.5, 0.36, XT - 0.4, 0.3, za < TZ0 ? zb - 0.18 : za + 0.18);
        B.box(m.hazard, 0.36, 1.5, 0.05, XT - 0.2, 0.3, za < TZ0 ? zb + 0.025 : za - 0.025);
      }
      // underpass side walls (brick, stained), segmented so the darkness can deepen; lit only by its lamps
      const I = (k) => this.indoor(k);
      B.plane(I(m.road), XE - XT, TZ1 - TZ0 + 0.4, (XT + XE) / 2, 0, (TZ0 + TZ1) / 2, { sx: 20, sz: 2, uv: [1.3, 0.2] });
      for (let x = XT + 0.05; x < XE - 0.01; x += 1) {
        const w = Math.min(1, XE - x);
        B.box(I(m.brick), w, TH, 0.6, x + w / 2, 0, TZ0 - 0.3, { uv: [x, 0], ao: 0.25 });
        B.box(I(m.brick), w, TH, 0.6, x + w / 2, 0, TZ1 + 0.3, { uv: [x + 0.3, 0], ao: 0.25 });
        B.box(I(m.tunnel), w, 1.1, 0.02, x + w / 2, 0.2, TZ0 + 0.005, { uv: [x, 0], k: 0.9 });
        B.box(I(m.found), w, 0.2, TZ1 - WALK, x + w / 2, 0, (WALK + TZ1) / 2, { uv: [x, 0] });
        B.box(I(m.pv), w, 0.21, 0.08, x + w / 2, 0, WALK + 0.04, { tint: 0xc8c4b8 });
        B.box(I(m.grate), w, 0.012, 0.26, x + w / 2, 0, TZ0 + 0.13);
      }
      // the girder bridge: riveted plate girders spanning the opening (outer face toward the lane), deck above
      const span0 = TZ0 - 1.45, span1 = TZ1 + 1.45;
      for (const gx of [XT - 0.05, XE + 0.15]) {
        const out = gx < XE ? -1 : 1;
        B.box(m.girder, 0.12, YE - TH - 0.06, span1 - span0, gx, TH + 0.06, (span0 + span1) / 2, { uv: [0, 0] });
        B.box(m.girder, 0.42, 0.08, span1 - span0, gx, TH - 0.02, (span0 + span1) / 2);
        B.box(m.girder, 0.38, 0.07, span1 - span0, gx, YE - 0.02, (span0 + span1) / 2);
        for (let z = span0 + 0.35; z < span1 - 0.2; z += 0.62) B.box(m.girder, 0.07, YE - TH - 0.08, 0.09, gx + out * 0.09, TH + 0.06, z);
        B.box(m.hazard, 0.02, 0.08, TZ1 - TZ0, gx + out * 0.22, TH - 0.02, (TZ0 + TZ1) / 2);
      }
      for (const gx of [27.6, 29.3, 31.6, 33.7, 35.2]) {
        B.box(I(m.girder), 0.07, 0.82, TZ1 - TZ0 + 1.2, gx, TH + 0.08, (TZ0 + TZ1) / 2, { k: 0.9 });
        B.box(I(m.girder), 0.34, 0.06, TZ1 - TZ0 + 1.2, gx, TH + 0.04, (TZ0 + TZ1) / 2, { k: 0.9 });
      }
      for (let x = XT + 0.1; x < XE; x += 1) {
        const w = Math.min(1, XE - x);
        B.box(I(m.girder), w, 0.08, TZ1 - TZ0 + 1.2, x + w / 2, TH + 0.9, (TZ0 + TZ1) / 2, { k: 0.6 });
        for (const z of [TZ0 + 1.2, (TZ0 + TZ1) / 2, TZ1 - 1.2]) B.box(I(m.girder), w, 0.18, 0.08, x + w / 2, TH + 0.45, z, { k: 0.9 });
      }
      // cable runs on the wall (no lamps: the underpass is pitch black a few metres in)
      B.box(I(m.pv), XE - XT - 0.4, 0.06, 0.06, (XT + XE) / 2, 2.95, TZ0 + 0.05, { tint: 0x2a2a2a });
      B.box(I(m.pv), XE - XT - 0.4, 0.04, 0.04, (XT + XE) / 2, 2.85, TZ0 + 0.04, { tint: 0x3a3a3a });
      for (let x = XT + 0.5; x < XE; x += 1.2) B.box(I(m.metal), 0.04, 0.2, 0.08, x, 2.8, TZ0 + 0.04, { tint: 0x4a4a48 });
      // a transverse drain grating across the dip at the mouth + a dark wet patch
      B.box(m.grate, 0.3, 0.012, TZ1 - TZ0, XT + 0.75, 0, (TZ0 + TZ1) / 2, { k: 0.85 });
      B.box(m.pv, 0.42, 0.02, TZ1 - TZ0, XT + 0.75, -0.01, (TZ0 + TZ1) / 2, { tint: 0x5a5856 });
      // walkway guard rail
      for (let x = XT + 0.6; x < XE - 0.2; x += 1.5) B.box(I(m.metal), 0.06, 0.95, 0.06, x, 0.2, WALK + 0.06, { tint: 0xe8e8e0 });
      for (const y of [0.62, 1.12]) B.box(I(m.metal), XE - XT - 0.7, 0.05, 0.05, (XT + 0.6 + XE - 0.1) / 2, y, WALK + 0.06, { tint: 0xe8e8e0 });
      // the embankment on top: grassy shoulders, ballast, sleepers, rails, fence, catenary
      const zA = -48, zB = 68, L = zB - zA, zc = (zA + zB) / 2;
      B.box(m.grass, XE - XT + 0.6, 0.3, L, (XT + XE) / 2 + 0.3, YE - 0.3, zc, { uv: [0, 0] });
      B.box(m.ballast, 7.2, 0.18, L, 31.5, YE, zc);
      B.box(m.ballast, 6.4, 0.12, L, 31.5, YE + 0.18, zc, { uv: [0.5, 0.5] });
      for (const tx of TRACKS) {
        for (let z = zA + 0.3; z < zB; z += 0.62) B.box(m.pv, 2.1, 0.12, 0.22, tx, YE + 0.24, z, { tint: 0x9a968e });
        for (const rx of [-0.535, 0.535]) {
          B.box(m.metal, 0.08, 0.14, L, tx + rx, YE + 0.36, zc, { tint: 0x6a4a3a });
          B.box(m.metal, 0.07, 0.03, L, tx + rx, YR - 0.03, zc, { tint: 0xd8dce0 });
        }
      }
      for (let z = zA; z < zB; z += 2.4) B.box(m.pv, 0.1, 1.25, 0.1, XT + 0.2, YE, z, { tint: 0x8a9a8a });
      for (const y of [0.45, 0.85, 1.2]) B.box(m.metal, 0.04, 0.04, L, XT + 0.2, YE + y, zc, { tint: 0x5a6a5a });
      for (const z of [-26, 4, 34, 64]) {
        B.box(m.metal, 0.26, 5.6, 0.26, XT + 0.75, YE, z, { tint: 0x8a9096 });
        B.box(m.metal, 7.2, 0.18, 0.16, XT + 0.75 + 3.6, YE + 5.0, z, { tint: 0x8a9096 });
        B.box(m.metal, 0.1, 0.1, 3.0, XT + 0.75 + 1.4, YE + 3.9, z, { rx: 0, rz: 0.75, tint: 0x8a9096 });
        for (const tx of TRACKS) { B.box(m.metal, 0.05, 0.7, 0.05, tx, YE + 4.3, z, { tint: 0x6a7076 }); B.box(m.pv, 0.12, 0.25, 0.12, tx, YE + 4.75, z, { tint: 0x7a5a3a }); }
      }
      for (const tx of TRACKS) {
        B.box(m.pv, 0.025, 0.025, L, tx, YR + 4.55, zc, { tint: 0x2a2624 });
        B.box(m.pv, 0.02, 0.02, L, tx, YR + 5.1, zc, { tint: 0x2a2624 });
      }
      // the far end is closed off in the dark (nothing bright shows through); the houses beyond only peek over the
      // embankment as a skyline
      B.box(I(m.pv), 0.1, YE - 0.2, TZ1 - TZ0 + 1.4, XE - 0.4, 0, (TZ0 + TZ1) / 2, { tint: 0x050505 });
      for (const [za, zb, h] of [[1.5, 9.1, 6.4], [9.1, 17.5, 5.8]]) {
        B.box(m.mortar, 6, h, zb - za, XE + 7.4, 0, (za + zb) / 2, { k: 0.8 });
        B.box(m.roofGrey, 6.6, 0.4, zb - za + 0.6, XE + 7.4, h, (za + zb) / 2, { k: 0.7 });
      }
      B.pop();
      // signs on the girder face (built unmirrored so their text reads correctly)
      const gx = s * (XT - 0.2), ry = s > 0 ? -Math.PI / 2 : Math.PI / 2;
      B.quad(this.T('clearance', 32, 32, { alpha: true, rough: 0.4 }), 0.62, 0.62, gx, TH + 0.15, 9.0, { ry });
      B.quad(this.T('clearancePlate', 64, 20, { rough: 0.4 }), 0.9, 0.28, gx, TH + 0.04, 10.2, { ry });
      B.quad(this.T('underpassName', 64, 20, { rough: 0.4 }), 0.62, 0.2, s * (XT - 0.39), 2.1, TZ1 + 0.72, { ry });
      this.tunnelMouth(s);
    }
  }

  /** Lane-side dressing of an underpass mouth (built unmirrored): grime under the girder, notices, conduit, a puddle. */
  tunnelMouth(s) {
    const B = this.B, m = this.m, ry = s > 0 ? -Math.PI / 2 : Math.PI / 2;
    const fx = s * (XT - 0.39), drip = this.decal('stainDrip', 16, 48), base = this.decal('stainBase', 32, 16);
    for (const [za, zb] of [[TZ0 - 1.45, TZ0], [TZ1, TZ1 + 1.45]]) {
      const zc = (za + zb) / 2, w = zb - za - 0.1;
      // splash-back dirt above the plinth
      B.quad(base, w, 0.45, fx, 0.3, zc, { ry, tint: 0xa8a49c });
    }
    // grime streaks down the girder web from the deck
    B.quad(drip, TZ1 - TZ0 + 2.6, 0.8, s * (XT - 0.12), TH + 0.1, (TZ0 + TZ1) / 2, { ry, tint: 0x7a7470 });
    // ひったくり注意 board on the other pier, a cable conduit and junction box beside the name plate
    this.sign('signSnatch', 0.4, 0.55, fx, 1.55, TZ0 - 0.72, { ry });
    B.push(0, 0, 0, 0, s < 0);
    B.box(m.pv, 0.06, TH + 0.2, 0.06, XT - 0.42, 0.4, TZ1 + 1.22, { tint: 0x6a6e70 });
    B.box(m.pv, 0.14, 0.42, 0.32, XT - 0.45, 1.05, TZ1 + 1.15, { tint: 0x8a9290 });
    B.box(m.pv, 0.02, 0.06, 0.2, XT - 0.53, 1.36, TZ1 + 1.15, { tint: 0xf2c41a });
    B.pop();
    // a crushed can in the corner just inside, puddles where the road dips under the bridge
    this.prop('drink_cans', s * (XT + 0.45), 0, TZ0 + 0.45, s * 0.6);
    this.puddle(s * (XT - 0.5), 8.1, 1.9, 1.15, 0.15 * s);
    this.puddle(s * (XT + 0.9), 11.0, 1.4, 1.0, -0.3 * s);
  }

  /** Alpha-cut town decal material (pixel stains, cracks, lids...). */
  decal(key, w, h, rough = 0.95) { return this.T(key, w, h, { alpha: true, decal: true, rough }); }

  /** Rain puddle on the ground: a mirror-smooth alpha-cut decal (reflects the probe; faint sky tint baked in). */
  puddle(x, z, w, d, ry = 0) {
    if (!this._puddleM) {
      const map = townPix('puddle', 32, 32).texture();
      const mat = new THREE.MeshStandardMaterial({ map, roughness: 0.1, metalness: 0.0, alphaTest: 0.5, vertexColors: true, envMapIntensity: 0.3 });
      mat.polygonOffset = true; mat.polygonOffsetFactor = -3; mat.polygonOffsetUnits = -6;
      // a cheap sky reflection: dusky zenith blue seen from above, the warm horizon glow at grazing angles (Fresnel)
      mat.onBeforeCompile = (sh) => {
        sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          float pFr = pow( 1.0 - clamp( dot( normalize( vViewPosition ), normal ), 0.0, 1.0 ), 5.0 );
          totalEmissiveRadiance += mix( vec3( 0.006, 0.007, 0.009 ), vec3( 0.085, 0.08, 0.07 ), pFr ) * step( diffuseColor.r, diffuseColor.b );`);
      };
      mat.customProgramCacheKey = () => 'puddle';
      this._puddleM = mat;
    }
    this.B.plane(this._puddleM, w, d, x, 0.006, z, { unit: true, ry });
  }

  /** Fake light pool (additive glow decal on the ground). */
  pool(x, z, r, col, k) {
    if (!this._pools) this._pools = [];
    const g = new THREE.PlaneGeometry(r * 2, r * 2);
    g.rotateX(-Math.PI / 2); g.translate(x, 0.012, z);
    const c = new THREE.Color(col).multiplyScalar(k), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    this._pools.push(g);
  }
  flushPools() {
    if (!this._pools?.length) return;
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
      vertexShader: 'varying vec3 vC; varying vec2 vUv; void main(){ vUv = uv; vC = color; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying vec3 vC; varying vec2 vUv; void main(){ vec2 q = floor((vUv - 0.5) * 24.0) / 24.0; float d = length(q) * 2.0; float a = pow(max(0.0, 1.0 - d), 1.8); gl_FragColor = vec4(vC * a * 0.35, 1.0); }',
    });
    const mesh = new THREE.Mesh(mergeGeometries(this._pools), mat);
    mesh.renderOrder = 2;
    this.add(mesh);
    this._pools = [];
  }

  // ---------------------------------------------------------------- utility poles, wires, lamps
  buildPoles() {
    const zP = 14.32, xs = [-22.4, -16.3, -6.3, 2.6, 10.0, 17.6, 24.6];
    for (const x of xs) {
      this.prop('utility_pole', x, 0, zP, Math.PI / 2);
      this.game.player.addObstacle(x - 0.2, x + 0.2, zP - 0.2, zP + 0.2);
    }
    const B = this.B, wm = this.P(0.9);
    const wire = (a, b, sag, r = 0.012) => {
      const pts = [];
      for (let k = 0; k <= 14; k++) { const t = k / 14; const p = a.clone().lerp(b, t); p.y -= Math.sin(t * Math.PI) * sag; pts.push(p); }
      B.geo(wm, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, r, 4), { tint: 0x1c1818 });
    };
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    for (let i = 0; i < xs.length - 1; i++) {
      const a = xs[i], b = xs[i + 1];
      for (const [dz, y, sag] of [[-0.8, 7.62, 0.45], [-0.4, 7.62, 0.5], [0.8, 7.62, 0.42], [-0.64, 7.0, 0.55], [0.64, 7.0, 0.5]]) wire(V(a, y, zP + dz), V(b, y, zP + dz), sag);
      wire(V(a, 5.0, zP + 0.16), V(b, 5.0, zP + 0.16), 0.35, 0.03);
      // the steel messenger above the telecom cable, with spiral lashing hangers every half metre
      wire(V(a, 5.2, zP + 0.16), V(b, 5.2, zP + 0.16), 0.35, 0.008);
      for (let x = a + 0.5; x < b - 0.4; x += 0.5) { const t = (x - a) / (b - a), y = 5.0 - Math.sin(t * Math.PI) * 0.35; B.box(wm, 0.012, 0.18, 0.012, x, y + 0.02, zP + 0.16, { tint: 0x2a2826 }); }
      wire(V(a, 4.7, zP + 0.18), V(b, 4.7, zP + 0.18), 0.3, 0.022);
    }
    // service drops to the houses on both sides
    for (const p of [...this.anchors.near, ...this.anchors.far]) {
      let best = xs[0];
      for (const x of xs) if (Math.abs(x - p.x) < Math.abs(best - p.x)) best = x;
      wire(V(best, 5.3, zP - 0.1), p, 0.35, 0.01);
    }
    wire(V(2.6, 5.3, zP - 0.1), V(3.9, 4.45, 5.15), 0.5, 0.01);
    wire(V(-6.3, 5.3, zP - 0.1), V(-4.2, 4.45, 5.15), 0.5, 0.01);
    // street lights (heads glow; one real light by the vending machines)
    for (const [x, z, ry] of [[-2.4, 14.42, Math.PI / 2], [13.6, 14.42, Math.PI / 2], [-19.0, 5.48, -Math.PI / 2], [21.8, 5.5, -Math.PI / 2]]) {
      this.prop('street_light', x, 0, z, ry, { block: true });
      this.pool(x, z + (z > 10 ? -0.9 : 0.9), 3.2, 0xffc880, 0.6);
    }
    const lamp = new THREE.PointLight(0xffc880, 4, 9, 1.5);
    lamp.position.set(-2.4, 3.9, 13.7);
    this.add(lamp);
  }

  // ---------------------------------------------------------------- street dressing
  buildDressing() {
    // vending machines + post box by the lamp (softened glow, one light for the pair)
    this.prop('vending', -0.62, 0, 14.43, Math.PI, { dim: true, block: true });
    this.prop('vending', 0.4, 0, 14.43, Math.PI, { dim: true, block: true });
    const vl = new THREE.PointLight(0xdff0ff, 2.2, 5, 1.6);
    vl.position.set(-0.1, 1.2, 13.4);
    this.add(vl);
    this.pool(-0.1, 13.4, 1.6, 0xcfe8ff, 0.45);
    this.pool(-16.5, 13.5, 1.5, 0xcfe8ff, 0.4);
    this.pool(-16.05, 6.3, 1.2, 0xcfe8ff, 0.35);
    this.pool(0, 6.6, 3.2, 0xff9a60, 0.35);
    this.pool(-12.45, 14.0, 2.2, 0xfff0c8, 0.5);
    this.prop('post_box', 1.5, 0, 14.3, Math.PI, { block: true });
    this.prop('drink_cans', -1.5, 0, 13.95, 0.3);
    // the garbage station by the shop (contract)
    this.garbageStation = this.single('garbage_station', -6.6, 0, 5.82, 0, { block: true });
    this.prop('weeds', -5.4, 0, 5.42, 0);
    // manholes, a power box, weeds along the walls and under the embankment
    for (const [x, z] of [[3.6, 9.4], [-14.8, 10.1]]) this.prop('manhole', x, 0.001, z, hash2(x, z) * 6);
    this.prop('power_box', 16.7, 0, 5.62, 0, { block: true });
    for (const [x, z] of [[-25.4, 5.45], [25.3, 5.45], [-25.2, 14.75], [25.3, 14.8], [-11.6, 5.45], [12.6, 5.4], [-3.0, 14.75], [9.2, 14.8], [21.2, 14.78], [-24.0, 14.78]]) this.prop('weeds', x, 0, z, hash2(x, z) * 6, { scale: 0.8 + hash2(z, x) * 0.4 });
    for (const s of [-1, 1]) for (const z of [5.7, 13.95]) this.prop('weeds', s * 25.6, 0, z, s, { scale: 1.1 });
    this.flushPools();
  }

  // ---------------------------------------------------------------- small-scale detail: road wear, lids, clutter
  /** Repeating (world-mapped) alpha-cut decal material from a town painter. */
  RT(key, w, h, ppm = 32, rough = 0.95) {
    const ck = 'rt:' + key + w + 'x' + h + ':' + ppm;
    if (!this.mats.has(ck)) {
      const map = townPix(key, w, h).texture();
      map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(ppm / w, ppm / h);
      const mt = new THREE.MeshStandardMaterial({ map, vertexColors: true, roughness: rough, alphaTest: 0.5 });
      mt.polygonOffset = true; mt.polygonOffsetFactor = -2; mt.polygonOffsetUnits = -4;
      this.mats.set(ck, mt);
    }
    return this.mats.get(ck);
  }

  /** Vertical quad (like Batch.quad) showing the sub-rectangle uv = [u0, v0, u1, v1] of its texture (atlases). */
  quadUV(mat, w, h, x, y, z, [u0, v0, u1, v1], o = {}) {
    const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
    if (o.ry) g.rotateY(o.ry);
    g.translate(x, y + h / 2, z);
    return this.B.geo(mat, g, o);
  }
  /** One of the three blue 住居表示 address plates from the atlas. */
  addrPlate(k, w, h, x, y, z, o = {}) { return this.sign('addrs', w, h, x, y, z, o, [0, k * 16, 40, 16]); }

  /** The small opaque lane signs (enamel ads, notices, plates, the AC grille...) packed into one texture, so they
   *  all merge into a single draw call. layout: painter key -> [x, y, w, h] in atlas pixels. */
  signs() {
    if (this._signs) return this._signs;
    const W = 160, H = 128;
    const layout = {
      enamelSoap: [0, 0, 24, 64], enamelRamune: [24, 0, 24, 64], enamelUniform: [48, 0, 24, 64], signSnatch: [72, 0, 32, 44], addrs: [104, 0, 40, 48],
      noticeBoard: [0, 64, 48, 32], signGarage: [48, 64, 48, 32], names: [96, 64, 60, 24],
      acFront: [0, 96, 36, 25], signPiano: [36, 96, 40, 14], signDog: [76, 96, 24, 16], signMilk: [100, 96, 16, 10],
    };
    const atlas = new Pix(W, H, 1);
    atlas.flush();
    for (const [k, [x, y, w, h]] of Object.entries(layout)) {
      try { atlas.ctx.drawImage(townPix(k, w, h).flush().canvas, x, y); } catch (e) { console.warn('town sign atlas: no painter for', k, e); }
    }
    atlas.pull();
    const mat = new THREE.MeshStandardMaterial({ map: atlas.texture(), vertexColors: true, roughness: 0.55 });
    return (this._signs = { W, H, layout, mat });
  }
  /** Vertical sign quad showing atlas entry `key` (or the sub-rectangle sub = [x, y, w, h] px inside it). */
  sign(key, w, h, x, y, z, o = {}, sub = null) {
    const S = this.signs(), [rx, ry, rw, rh] = S.layout[key], [sx, sy, sw, sh] = sub || [0, 0, rw, rh];
    return this.quadUV(S.mat, w, h, x, y, z, [(rx + sx) / S.W, 1 - (ry + sy + sh) / S.H, (rx + sx + sw) / S.W, 1 - (ry + sy) / S.H], o);
  }

  /** Square-section bar between two world points (guy wires, braces). */
  beam(mat, a, b, t, o = {}) {
    const d = new THREE.Vector3().subVectors(b, a), len = d.length();
    const g = new THREE.BoxGeometry(t, t, len);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.normalize()));
    g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    return this.B.geo(mat, g, o);
  }

  buildDetails() {
    const B = this.B, m = this.m, P = this.game.player, V = (x, y, z) => new THREE.Vector3(x, y, z);
    // ---- the road: patch repairs and a utility trench, cracks, lids, puddles, grit along the kerbs
    const patch = this.M('asphaltHD', { roughness: 0.9, bump: 0.4, ppm: 40, color: 0xd4d2ce, decal: true });
    const patchAt = (x, z, w, d, ry = 0) => B.plane(patch, w, d, x, 0.002, z, { ry, uv: [x * 0.37, z * 0.21] });
    patchAt(5.3, 9.73, 0.55, 7.2);
    patchAt(-10.2, 8.25, 9.4, 0.5);
    patchAt(3.6, 9.4, 1.5, 1.5, 0.12);
    patchAt(-20.6, 11.9, 2.2, 1.3, 0.05);
    patchAt(12.6, 7.3, 1.7, 1.1, -0.08);
    patchAt(-2.9, 12.3, 1.2, 0.9);
    patchAt(19.4, 10.6, 0.9, 2.6, 0.3);
    const crack = this.decal('roadCrack', 32, 32);
    for (const [x, z, sz, r] of [[-22.5, 9.0, 1.4, 0.4], [-16.8, 12.3, 1.1, 2.0], [-6.8, 10.9, 1.5, 1.1], [-1.2, 7.4, 1.0, 2.8], [8.6, 11.6, 1.6, 0.2], [14.3, 9.3, 1.3, 1.9], [22.6, 8.0, 1.5, 0.9], [-12.8, 6.9, 1.0, 1.5], [10.8, 12.9, 0.9, 3.1], [17.6, 7.0, 1.2, 2.4]]) B.plane(crack, sz, sz, x, 0.004, z, { unit: true, ry: r, tint: 0xa8a4a0 });
    // lids: fire hydrant (yellow ring), water valves, square utility covers, one more decorated manhole
    const lidH = this.decal('lidHydrant', 32, 32, 0.6), lidV = this.decal('lidValve', 12, 12, 0.6), lidS = this.decal('lidSquare', 24, 24, 0.6);
    for (const [x, z] of [[-10.6, 12.55], [17.2, 6.85]]) B.plane(lidH, 0.62, 0.62, x, 0.005, z, { unit: true, ry: hash2(x, z) * 6 });
    for (const [x, z] of [[-3.9, 12.95], [7.8, 12.9], [-17.9, 6.6], [21.4, 6.72], [11.2, 6.62], [-24.0, 6.7]]) B.plane(lidV, 0.24, 0.24, x, 0.005, z, { unit: true, ry: hash2(z, x) * 6 });
    for (const [x, z] of [[-24.2, 12.75], [14.6, 12.92], [-8.0, 6.72], [9.6, 6.62]]) B.plane(lidS, 0.55, 0.55, x, 0.005, z, { unit: true, ry: Math.round(hash2(x, 1) * 4) * Math.PI / 2 });
    // rain puddles where the camber dips toward the gutters
    for (const [x, z, w, d, r] of [[-12.0, 12.8, 1.7, 0.9, 0.1], [7.3, 6.75, 1.3, 0.8, -0.2], [19.6, 12.75, 1.9, 0.95, 0.05], [-20.4, 6.8, 1.2, 0.7, 0.3], [1.3, 12.95, 1.0, 0.55, -0.1], [-4.9, 6.75, 0.9, 0.5, 0.2]]) this.puddle(x, z, w, d, r);
    // grit, leaves and fag ends along both kerbs and at the foot of the walls
    const grit = this.RT('gutterGrit', 64, 8, 24);
    B.plane(grit, 2 * XT, 0.34, 0, 0.004, ZG1 + 0.17, { tint: 0xc0bcb4 });
    B.plane(grit, 2 * XT, 0.34, 0, 0.004, ZR1 - 0.17, { ry: Math.PI, tint: 0xc0bcb4 });
    B.plane(grit, XT - 4.4, 0.3, -(XT + 4.4) / 2, 0.005, ZB + 0.15, { tint: 0xb8b4ac });
    B.plane(grit, XT - 4.4, 0.3, (XT + 4.4) / 2, 0.005, ZB + 0.15, { tint: 0xb8b4ac });
    for (const [a, b] of [[-XT, -15.45], [-7.4, XT]]) B.plane(grit, b - a, 0.3, (a + b) / 2, 0.005, ZF - 0.15, { ry: Math.PI, tint: 0xb8b4ac });

    // ---- utility poles: address plates, a guy wire with its yellow guard at each end of the line, cable closures
    const zP = 14.32, poles = [-22.4, -16.3, -6.3, 2.6, 10.0, 17.6, 24.6];
    poles.forEach((x, i) => {
      if (x === -6.3) return; // the promo posters are on the wall right behind this one
      B.box(m.pv, 0.2, 0.32, 0.015, x, 2.3, zP - 0.175, { tint: 0x2a3a6a });
      this.addrPlate(i % 3, 0.18, 0.08, x, 2.5, zP - 0.184, { ry: Math.PI });
      this.addrPlate((i + 1) % 3, 0.18, 0.08, x, 2.34, zP - 0.184, { ry: Math.PI });
    });
    const guy = this.P(0.5, 0.6);
    for (const [px, ax] of [[-22.4, -24.0], [24.6, 25.75]]) {
      const top = V(px, 6.3, zP), foot = V(ax, 0.05, 14.62);
      this.beam(guy, top, foot, 0.025, { tint: 0x4a4c4e });
      const k = 1.9 / 6.25, g0 = foot.clone(), g1 = foot.clone().lerp(top, k);
      this.beam(m.hazard, g0, g1, 0.1);
      B.box(m.found, 0.3, 0.06, 0.3, ax, 0, 14.62);
      P.addObstacle(ax - 0.2, ax + 0.2, 14.42, 14.82);
    }
    for (let i = 0; i < poles.length - 1; i += 2) {
      const t = 0.32, x = poles[i] + (poles[i + 1] - poles[i]) * t, y = 5.0 - Math.sin(t * Math.PI) * 0.35;
      B.box(m.pv, 0.6, 0.15, 0.15, x, y - 0.075, zP + 0.16, { tint: 0x2a2a2c });
      for (const dx of [-0.32, 0.32]) B.box(m.pv, 0.05, 0.1, 0.1, x + dx, y - 0.05, zP + 0.16, { tint: 0x4a4a4c });
    }

    // ---- house-front clutter: pots, planters, fire buckets, bicycles, an extinguisher box, a reed screen
    this.prop('pot_cluster', 12.45, 0, 5.5, 0, { block: true, scale: 0.8 });
    this.prop('fire_ext_box', 15.7, 0, 5.5, 0, { block: true });
    this.prop('styro_planter', 15.75, 0, 4.55, 0);
    this.prop('pot_cluster', -19.75, 0, 14.65, Math.PI, { block: true, scale: 0.85 });
    this.prop('fire_buckets', 15.8, 0, 14.62, Math.PI, { block: true });
    this.prop('styro_planter', -24.9, 0, 14.6, Math.PI, { block: true, scale: 0.85 });
    this.prop('fire_ext_box', -20.75, 0, 14.72, Math.PI, { block: true });
    this.prop('mamachari', 22.35, 0, 14.5, -Math.PI / 2 + 0.05, { block: true });
    this.prop('mamachari', -14.55, 0, 5.62, Math.PI / 2 - 0.06, { block: true });
    // a reed screen (よしず) leaning against the garden house, rolled at the top
    {
      const g = new THREE.PlaneGeometry(0.95, 1.9); g.rotateX(-0.27); g.translate(23.05, 0.93, 2.6 + 0.27);
      B.geo(this.T('yoshizu', 30, 60, { alpha: true, rough: 0.9 }), g, {});
      B.box(m.pv, 1.0, 0.12, 0.12, 23.05, 1.76, 2.66, { tint: 0xb89a5a });
    }
    this.prop('pot_cluster', -21.2, 0, 2.45, 0, { scale: 0.7 });
    // stepping stones from the gate to the door in the garden of NW4
    for (const [x, z, r] of [[-22.2, 4.8, 0.2], [-22.05, 4.2, -0.3], [-22.15, 3.6, 0.5], [-21.95, 3.05, 0.1]]) B.box(m.found, 0.46, 0.05, 0.38, x, 0, z, { ry: r, tint: 0xb8b4ac, k: 0.95 });
    // 飛び出し注意 boy at the mouth of alley A2 (front art, plain grey back)
    const boy = this.T('tobidashi', 28, 48, { alpha: true, rough: 0.6 });
    B.quad(boy, 0.5, 0.86, 11.48, 0.02, 5.47, {});
    B.quad(boy, 0.5, 0.86, 11.48, 0.02, 5.465, { ry: Math.PI, flipU: true, tint: 0x8a8a88 });
    P.addObstacle(11.3, 11.66, 5.38, 5.56);
    // Shōwa enamel signs on the alley walls and the old tobacco shop, a beware-of-dog sticker on a gate pillar
    // (alley A1 beside Mikawa-ya is reserved for the ghost-alley feature: nothing is added inside it)
    this.sign('enamelSoap', 0.26, 0.7, -15.3, 0.95, ZF - 0.012, { ry: Math.PI });
    this.sign('enamelRamune', 0.25, 0.68, -20.43, 0.85, ZB + 0.02, {});
    this.sign('enamelUniform', 0.25, 0.68, -20.155, 0.85, ZB + 0.02, {});
    this.sign('signDog', 0.2, 0.13, 13.48, 0.95, ZB + 0.082, {});
    // post-mounted mailboxes on a few gate pillars, the rental garages' vacancy board
    for (const [x, z, f, c] of [[14.72, ZB, 1, 0x3a5a8a], [-21.18, ZF + 0.06, -1, 0xc83a2a], [17.42, ZF, -1, 0x4a6a4a], [-22.72, ZB, 1, 0x8a8e92]]) {
      B.box(m.pv, 0.3, 0.32, 0.13, x, 0.72, z + f * 0.14, { tint: c });
      B.box(m.pv, 0.33, 0.04, 0.16, x, 1.04, z + f * 0.14, { tint: c, k: 0.85 });
      B.box(m.pv, 0.2, 0.02, 0.01, x, 0.95, z + f * 0.21, { tint: 0x1a1a1a });
    }
    this.sign('signGarage', 0.6, 0.4, 24.55, 1.25, 15.14, { ry: Math.PI });
    // a pinch hanger of socks and a towel drying under the edge of NE1's carport roof
    {
      const hx = 7.05, hz = 5.0, hy = 1.92;
      B.box(m.metal, 0.012, 0.36, 0.012, hx, hy + 0.04, hz, { tint: 0xd8dce0 });
      for (const [dx, dz, w, d] of [[0, -0.14, 0.44, 0.02], [0, 0.14, 0.44, 0.02], [-0.21, 0, 0.02, 0.3], [0.21, 0, 0.02, 0.3]]) B.box(m.pv, w, 0.02, d, hx + dx, hy, hz + dz, { tint: 0x7ab0d8 });
      const cols = [0xfbf8f0, 0x2a3a6a, 0xe86a7a, 0xfbf8f0, 0x5aa86a, 0xffd23f];
      cols.forEach((c, i) => B.box(m.pv, 0.06, 0.16 + (i % 3) * 0.03, 0.012, hx - 0.18 + (i % 4) * 0.12, hy - 0.19 - (i % 3) * 0.03, hz + (i < 4 ? -0.14 : 0.14), { tint: c }));
      B.box(m.pv, 0.3, 0.26, 0.012, hx + 0.02, hy - 0.26, hz + 0.14, { tint: 0xf2a0b8, ry: 0.05 });
    }
    // the neighbourhood notice board by SAKURA HEIGHTS, a piano-class board on the FE3 wall
    for (const dx of [-0.42, 0.42]) B.box(m.wood, 0.07, 1.75, 0.07, 17.45 + dx, 0, 5.52, { tint: 0x5a4030 });
    B.box(m.wood, 0.98, 0.66, 0.05, 17.45, 0.98, 5.5, { tint: 0x5a4030 });
    this.sign('noticeBoard', 0.92, 0.6, 17.45, 1.01, 5.527);
    B.box(m.tinTeal, 1.12, 0.04, 0.3, 17.45, 1.72, 5.56, { rx: -0.25 });
    P.addObstacle(16.95, 17.95, 5.42, 5.62);
    this.sign('signPiano', 0.5, 0.18, 6.4, 0.25, ZF - 0.022, { ry: Math.PI });
    // a few birds perched on the thick cable between the poles
    for (const [i, t] of [[0, 0.4], [0, 0.47], [3, 0.55], [4, 0.3], [4, 0.36], [5, 0.62]]) {
      const a = poles[i], b = poles[i + 1], x = a + (b - a) * t, y = 5.0 - Math.sin(t * Math.PI) * 0.35;
      this.prop('pigeon', x, y + 0.02, zP + 0.16, hash2(i, t * 10) < 0.5 ? 0.15 : Math.PI - 0.2, { scale: 0.9 });
    }
    // a sprinkle of weeds and grass where the paving meets the walls
    const weedsAt = [];
    for (let x = -25; x < 25; x += 1.35) {
      const k = hash2(Math.round(x * 10), 7);
      if (k < 0.45) weedsAt.push([x + k, ZF - 0.12, Math.PI]);
      if (hash2(Math.round(x * 10), 8) < 0.35 && Math.abs(x) > 4.6) weedsAt.push([x + 0.5, ZB + 0.12, 0]);
    }
    for (const [x, z, r] of weedsAt) {
      if (z > 10 && x > -6.6 && x < -4.4) continue; // keep the posters clear
      if (z > 10 && x > -15.6 && x < -7.2) continue; // Mikawa-ya's front and the mouth of alley A1
      if (z > 10 && x > 10.1 && x < 15.4) continue; // the open driveway
      if (z < 10 && x > -7.6 && x < -5.6) continue; // garbage station
      this.prop('weeds', x, 0, z, r + hash2(z, x) * 2, { scale: 0.55 + hash2(x, 3) * 0.4 });
    }
  }

  // ---------------------------------------------------------------- sky & skyline
  buildSky() {
    // late golden hour, clear with a few clouds: blue zenith fading to warm haze, a glow band toward the low sun
    const cl = new SkyClouds().texture;
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        uSun: { value: new THREE.Vector3(-6, 3.2, 14).normalize() },
        uZen: { value: new THREE.Color(0x3f6fae) }, uUp: { value: new THREE.Color(0x6f9acb) },
        uMid: { value: new THREE.Color(0xa9c4dd) }, uHor: { value: new THREE.Color(0xe9dcc4) },
        uGlow: { value: new THREE.Color(0xf6d9a8) },
        uClouds: { value: cl },
      },
      vertexShader: 'varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
      fragmentShader: `uniform vec3 uSun, uZen, uUp, uMid, uHor, uGlow; uniform sampler2D uClouds; varying vec3 vD;
        float bayer(vec2 p){ vec2 q = mod(floor(p), 4.0); int i = int(q.x) + int(q.y) * 4;
          float b[16]; b[0]=0.;b[1]=8.;b[2]=2.;b[3]=10.;b[4]=12.;b[5]=4.;b[6]=14.;b[7]=6.;b[8]=3.;b[9]=11.;b[10]=1.;b[11]=9.;b[12]=15.;b[13]=7.;b[14]=13.;b[15]=5.;
          for (int k = 0; k < 16; k++) if (k == i) return b[k] / 16.0; return 0.0; }
        void main(){
          vec3 d = normalize(vD);
          float h = d.y, hl = max(length(d.xz), 1e-4);
          float az = atan(d.z, d.x + 1e-5);
          vec2 cell = vec2(floor(az * 200.0), floor(h * 300.0));
          float sunK = max(0.0, dot(d.xz / hl, normalize(uSun.xz)));
          float hq = h + (bayer(cell) - 0.5) / 70.0;
          vec3 col = mix(uHor, uMid, smoothstep(0.0, 0.14, hq));
          col = mix(col, uUp, smoothstep(0.12, 0.4, hq));
          col = mix(col, uZen, smoothstep(0.35, 0.95, hq));
          // warm glow band hugging the horizon toward the sun, and a soft halo around it
          col = mix(col, uGlow, pow(sunK, 4.0) * (1.0 - smoothstep(0.0, 0.3, h)) * 0.9);
          float sd = max(0.0, dot(d, uSun));
          col += vec3(1.0, 0.86, 0.62) * (pow(sd, 24.0) * 0.35 + pow(sd, 400.0) * 1.6);
          col = floor(col * 64.0 + bayer(cell + 5.0)) / 64.0;
          // a few soft clouds: off-white tops, warm lit edges, blue-grey undersides
          vec2 uv = vec2(cell.x / 200.0 / 6.2832 + 0.5, (h - 0.02) * 2.2);
          if (uv.y > 0.0 && uv.y < 1.0) {
            vec4 c = texture2D(uClouds, uv);
            vec3 cc = mix(c.rgb, c.rgb * vec3(1.05, 0.96, 0.86), pow(sunK, 2.0) * 0.7);
            col = mix(col, cc, c.a * smoothstep(0.02, 0.09, h) * 0.92);
          }
          if (h < 0.0) col = mix(uHor, uHor * 0.85, smoothstep(0.0, -0.2, h));
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(80, 32, 16), mat);
    dome.renderOrder = -10;
    dome.frustumCulled = false;
    this.add(dome);
  }

  /** Distant city all around: flat dusk silhouettes with lit windows (unfogged, merged). */
  buildBackdrop() {
    const p = townPix('skyline', 64, 128), pe = townPix('skylineE', 64, 128);
    void pe;
    const t = p.texture(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 8, 1 / 16);
    const mat = new THREE.MeshBasicMaterial({ map: t, fog: true, vertexColors: true });
    const B = new Batch();
    for (let i = 0; i < 54; i++) {
      const a = (i / 54) * Math.PI * 2 + hash2(i, 1) * 0.06;
      const r = 64 + hash2(i, 2) * 10;
      if (Math.abs(Math.cos(a)) > 0.82) continue;
      const x = Math.cos(a) * r, z = 9.6 + Math.sin(a) * r * 0.92;
      const w = 5 + hash2(i, 3) * 9, h = 6 + hash2(i, 4) * 10 + (hash2(i, 6) < 0.18 ? 10 : 0);
      const k = 0.8 + hash2(i, 5) * 0.3;
      B.push(x, 0, z, -a + Math.PI / 2);
      B.box(mat, w, h, 6, 0, 0, 0, { tint: new THREE.Color(0xffffff).multiplyScalar(k).getHex(), uv: [hash2(i, 7) * 8, 0] });
      if (hash2(i, 8) < 0.35) B.box(mat, 0.3, 3, 0.3, w * 0.3, h, 0, { tint: 0x8a96a6 });
      B.pop();
    }
    B.build(this.group, { receive: false });
  }

  // ---------------------------------------------------------------- bounds
  buildBounds() {
    const P = this.game.player, G = GARAGE;
    // lane ends inside the underpasses
    P.addObstacle(-90, -XW, -60, 60); P.addObstacle(XW, 90, -60, 60);
    for (const s of [-1, 1]) {
      const a = s > 0 ? XT - 0.4 : -XW - 1, b = s > 0 ? XW + 1 : -XT + 0.4;
      P.addObstacle(a, b, -60, TZ0); P.addObstacle(a, b, TZ1, 60);
      // guard rail along the walkway (open at the mouth so you can step up)
      const ra = s > 0 ? XT + 0.55 : -XW - 1, rb = s > 0 ? XW + 1 : -XT - 0.55;
      P.addObstacle(ra, rb, WALK, WALK + 0.12);
    }
    // near building line (walls, yards) except the garage opening and the A2 alley
    for (const [a, b] of [[-XT, -4.3], [4.3, 9.8], [11.3, XT]]) P.addObstacle(a, b, -60, ZB);
    P.addObstacle(9.65, 9.85, -60, ZB); P.addObstacle(11.25, 11.45, -60, ZB); P.addObstacle(9.6, 11.5, -60, -3.1);
    // far building line except the corner shop door and the A1 alley
    for (const [a, b] of [[-XT, -15.45], [-7.45, XT]]) P.addObstacle(a, b, ZF, 60);
    P.addObstacle(-9.55, -9.3, ZF, 60); P.addObstacle(-7.5, -7.25, ZF, 60); P.addObstacle(-9.6, -7.2, 22.3, 60);
    P.addObstacle(-15.45, -9.4, 19.95, 60);
    // thrown things stay on the street
    const ph = this.game.physics;
    for (const [cx, cz, hx, hz] of [[-15.15, ZB - 0.3, 10.85, 0.3], [15.15, ZB - 0.3, 10.85, 0.3], [0, ZF + 6, 26, 0.3], [-XW - 0.3, 9.6, 0.3, 4], [XW + 0.3, 9.6, 0.3, 4]]) {
      ph.addBox({ center: new THREE.Vector3(cx, 1.5, cz), half: new THREE.Vector3(hx, 1.5, hz), material: 'concrete' });
    }
    ph.addBox({ center: new THREE.Vector3(0, -0.5, G.maxZ + 7), half: new THREE.Vector3(45, 0.5, 16), material: 'concrete' });
  }

  // ---------------------------------------------------------------- trains
  makeTrain() {
    const g = new THREE.Group();
    const side = townPix('trainSide', 448, 104).texture(), sideE = townPix('trainSideE', 448, 104).texture();
    const front = townPix('trainFront', 90, 104).texture(), frontE = townPix('trainFrontE', 90, 104).texture();
    const sideM = new THREE.MeshStandardMaterial({ map: side, emissive: 0xffffff, emissiveMap: sideE, emissiveIntensity: 1.1, roughness: 0.35, metalness: 0.45, vertexColors: true });
    const frontM = new THREE.MeshStandardMaterial({ map: front, emissive: 0xffffff, emissiveMap: frontE, emissiveIntensity: 1.2, roughness: 0.35, metalness: 0.4, vertexColors: true });
    const B = new Batch(), pv = this.P(0.6, 0.3), dark = this.P(0.8);
    const W = 2.8, H = 3.25, y0 = 0.95;
    for (let i = 0; i < TRAIN_N; i++) {
      const cz = (i - (TRAIN_N - 1) / 2) * (TRAIN_CAR + TRAIN_GAP);
      B.push(0, 0, cz);
      for (const sx of [-1, 1]) B.quad(sideM, TRAIN_CAR, H, sx * W / 2, y0, 0, { ry: sx * Math.PI / 2 });
      for (const sz of [-1, 1]) {
        const cab = (i === 0 && sz < 0) || (i === TRAIN_N - 1 && sz > 0);
        B.quad(cab ? frontM : pv, W, H, 0, y0, sz * TRAIN_CAR / 2, { ry: sz > 0 ? 0 : Math.PI, tint: cab ? 0xffffff : 0x9aa0a6 });
        if (cab) for (const hx of [-0.95, 0.95]) B.box(this.G, 0.3, 0.14, 0.04, hx, y0 + 0.82, sz * (TRAIN_CAR / 2 + 0.02), { tint: 0xfff4d0 });
      }
      B.box(pv, W - 0.1, 0.12, TRAIN_CAR - 0.1, 0, y0 + H, 0, { tint: 0x9aa0a6 });
      B.box(pv, W - 0.6, 0.1, TRAIN_CAR - 0.6, 0, y0 + H + 0.12, 0, { tint: 0x8a9096 });
      for (const z of [-3.5, 3.5]) B.box(pv, 1.6, 0.35, 2.4, 0, y0 + H + 0.12, z, { tint: 0xb8bcc0 });
      B.box(dark, W - 0.3, 0.45, TRAIN_CAR - 3.2, 0, y0 - 0.45, 0, { tint: 0x2a2c2e });
      for (const z of [-TRAIN_CAR / 2 + 2.1, TRAIN_CAR / 2 - 2.1]) {
        B.box(dark, 2.3, 0.55, 2.6, 0, 0.12, z, { tint: 0x222426 });
        for (const wz of [-0.95, 0.95]) for (const wx of [-0.75, 0.75]) B.box(dark, 0.14, 0.62, 0.62, wx, 0.0, z + wz, { tint: 0x3a3a3a });
      }
      if (i === 1) {
        B.box(pv, 0.9, 0.2, 0.9, 0, y0 + H + 0.12, 0, { tint: 0x5a5e62 });
        B.box(pv, 0.06, 0.06, 1.3, 0, y0 + H + 0.62, 0.2, { rx: 0.7, tint: 0x3a3a3a });
        B.box(pv, 0.06, 0.06, 1.3, 0, y0 + H + 0.62, -0.2, { rx: -0.7, tint: 0x3a3a3a });
        B.box(pv, 1.5, 0.05, 0.12, 0, y0 + H + 1.0, 0, { tint: 0x2a2a2a });
      }
      if (i < TRAIN_N - 1) B.box(dark, 1.4, 2.4, TRAIN_GAP + 0.1, 0, y0 + 0.2, TRAIN_CAR / 2 + TRAIN_GAP / 2, { tint: 0x2a2a2a });
      B.pop();
    }
    B.build(g, { receive: false });
    return g;
  }

  buildTrains() {
    this.trains = [];
    for (const s of [-1, 1]) {
      const g = this.makeTrain();
      g.visible = false;
      this.add(g);
      this.trains.push({ g, s, wait: 10 + Math.random() * 25 + (s > 0 ? 14 : 0), z: 0, dir: 1, speed: 12.5, played: false });
    }
  }

  runTrain(side = null, dir = null) {
    const tr = side ? this.trains.find((t) => t.s === side) : this.trains[Math.floor(Math.random() * 2)];
    if (!tr) return;
    tr.dir = dir || (Math.random() < 0.5 ? 1 : -1);
    const track = TRACKS[Math.random() < 0.5 ? 0 : 1];
    tr.g.position.set(tr.s * track, YR, 0);
    tr.z = tr.dir > 0 ? -100 : 120;
    tr.g.rotation.y = tr.dir > 0 ? 0 : Math.PI;
    tr.g.visible = true;
    tr.played = false;
  }

  update(dt, t) {
    void t;
    if (!this.trains) return;
    for (const tr of this.trains) {
      if (!tr.g.visible) { tr.wait -= dt; if (tr.wait <= 0) this.runTrain(tr.s); continue; }
      tr.z += tr.dir * tr.speed * dt;
      tr.g.position.z = tr.z;
      const head = tr.z + tr.dir * TRAIN_LEN / 2;
      if (!tr.played && (9.6 - head) * tr.dir < 45) {
        tr.played = true;
        audio.play('train', { pos: new THREE.Vector3(tr.s * 31.5, 5.2, 9.6), dur: (TRAIN_LEN + 70) / tr.speed, vol: 1.0, ref: 7, bus: audio.amb });
      }
      if ((tr.dir > 0 && tr.z > 130) || (tr.dir < 0 && tr.z < -110)) { tr.g.visible = false; tr.wait = 30 + Math.random() * 50; }
    }
  }
}

/** Pixel cumulus band for the sky dome (u = azimuth, v = height above the horizon, alpha = coverage). */
class SkyClouds {
  constructor() {
    const w = 512, h = 64;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d');
    const img = x.createImageData(w, h), d = img.data;
    const put = (px, py, rgb, a) => { px = ((px % w) + w) % w; if (py < 0 || py >= h) return; const o = (py * w + px) * 4; if (d[o + 3] >= a) return; d[o] = rgb[0]; d[o + 1] = rgb[1]; d[o + 2] = rgb[2]; d[o + 3] = a; };
    const TOP = [244, 239, 230], WARM = [255, 226, 184], UNDER = [141, 152, 168], MIDC = [214, 214, 210];
    for (let i = 0; i < 13; i++) {
      const cx = Math.floor(hash2(i, 1) * w), base = 54 - Math.floor(hash2(i, 2) * 34), W = 26 + Math.floor(hash2(i, 3) * 60), H = 4 + Math.floor(hash2(i, 4) * 8);
      for (let k = 0; k < W; k++) {
        const t = k / W;
        const env = Math.sin(t * Math.PI) ** 0.6;
        const bumps = 0.6 + 0.4 * Math.abs(Math.sin(t * 7.3 + i)) * Math.abs(Math.sin(t * 3.1 + i * 2));
        const hh = Math.max(1, Math.round(H * env * bumps));
        for (let j = 0; j < hh; j++) {
          const py = base - j;
          let col = j < 2 ? UNDER : j < 3 ? MIDC : TOP;
          if (j >= hh - 1 && t < 0.6) col = WARM;
          const edge = k < 2 || k > W - 3 || j === hh - 1;
          put(cx + k, py, col, edge ? 150 : 225);
        }
      }
    }
    x.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.wrapS = THREE.RepeatWrapping;
    this.texture = t;
  }
}
