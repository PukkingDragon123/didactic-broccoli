// Out of town: the road into Morio-chō at golden hour, an off-map zone built when the drive starts and disposed when you
// reach the lane (x 300..1100, z 150..400; nothing else lives out here). Low-poly / voxel, pixel textures, merged and
// instanced: the town's own batcher and materials (town.batch(), town.m), one instanced mesh per repeated prop.
//
// West along a narrow country road with white edge lines: flooded paddies mirroring the sky between grassy banks,
// utility poles with sagging wires (their long shadows striping the road), farmhouses behind their cedar windbreaks
// with a kura and a tin-roofed barn, a rusty bus stop with a vending machine glowing beside it, a roadside Jizō, an
// honour-system vegetable stand, sakura in bloom, hand-painted signs (杜王町 2km, ← 杜王町 / MORIO-CHO). The big steel
// pylon (the town's own lattice tower, instanced) stands by the turn: Grandpa's "left after the big tower". Straight on
// is a dead end (通行止め, with room to turn round). Left: past the ニコニコマート konbini, a level crossing on the
// single-track line (bells, flashing lamps, barriers, a two-car diesel), oncoming kei trucks, then the road dips under
// the main line's embankment into a dark underpass (ようこそ 杜王町へ over the portal), where the drive cuts to the
// town's real east underpass.
//
//   const C = new Country(game)   C.group   C.course (src/drive/route.js)   C.main (the road you follow)   C.S (key
//   distances along it)   C.heightAt(x, z)   C.update(dt, van)   C.obstacles (circles to bump into, refreshed each
//   update)   C.dispose()
import * as THREE from 'three';
import { Road, Course } from './route.js';
import { roadTexture, signAtlas, trainTextures } from './art.js';
import { keiTruckGeometry, disposeTrucks, TRUCK } from './models.js';
import { hull, project, drapeTris, strip, shadowMaterial, DynamicShadows } from './shadows.js';
import { bakeVoxels } from './bake.js';
import { moving } from './sfx.js';
import { propGeometry, propSize } from '../world/props.js';
import { voxelMaterials } from '../voxel/materials.js';
import { townPix } from '../gfx/textures.js';
import { audio } from '../core/audio.js';
import { hash2 } from '../core/util.js';

export const ZONE = { x0: 300, x1: 1100, z0: 150, z1: 400 };
const GROUND = -0.45, WATER = -0.4, BANK = -0.27;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ------------------------------------------------------------------ the roads
// the way into town, east to west (you start at s ≈ 18, by the road works)
const MAIN_PTS = [[1098, 214], [1078, 214], [1010, 216], [960, 226], [905, 246], [850, 255], [790, 250], [745, 238], [705, 232], [688, 238],
  [677, 258], [670, 288], [655, 318], [627, 339], [590, 347], [545, 349], [495, 343], [450, 336], [412, 334], [380, 334], [345, 334], [318, 334]];
// straight on at the tower: a dead end with a turning space
const SPUR_PTS = [[699, 232.6], [680, 229.4], [655, 225], [632, 221], [616, 219]];
export const TRACK_X = 590; // the single-track branch line (runs along z)
const EMB = { x0: 350, x1: 374, top: 5.6 }; // the main line's embankment (runs along z), the underpass under it
const DIP = { x0: 414, x1: 384, y: -1.6 }; // the road dips under the embankment
const CUT = { x0: 342, x1: 422, z0: 328, z1: 344 }; // terrain cells left out round the dip (filled by the cutting's walls)
const PYLONS = [{ x: 712, z: 203, ry: 0.12 }, { x: 742, z: 392, ry: 0.12 }, { x: 684, z: 158, ry: 0.1 }];
const HOUSES = [
  { id: 'f1', x: 1040, z: 188, ry: 0.02, w: 34, d: 24, kind: 'big' },
  { id: 'f2', x: 946, z: 270, ry: Math.PI + 0.2, w: 26, d: 20, kind: 'small' },
  { id: 'f3', x: 800, z: 218, ry: 0.05, w: 28, d: 22, kind: 'big' },
  { id: 'f4', x: 553, z: 376, ry: Math.PI - 0.05, w: 26, d: 20, kind: 'small' },
  { id: 'f5', x: 470, z: 310, ry: 0.0, w: 28, d: 20, kind: 'barn' },
];
const KONBINI = { x: 699, z: 263, ry: -Math.PI / 2 }; // its front faces west, onto the road south from the junction

const mainProfile = (s, len, x) => (x > DIP.x0 ? 0 : x < DIP.x1 ? DIP.y : DIP.y * sstep(0, 1, (DIP.x0 - x) / (DIP.x0 - DIP.x1)));

/** Reduced fog for things on the horizon (mountains, the pylons' far side): the fog factor scaled by k. */
function farFog(m, key, k) {
  m.onBeforeCompile = (sh) => {
    const chunk = THREE.ShaderChunk.fog_fragment.replace('smoothstep( fogNear, fogFar, vFogDepth )', `smoothstep( fogNear, fogFar, vFogDepth ) * ${k.toFixed(2)}`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <fog_fragment>', chunk);
  };
  m.customProgramCacheKey = () => 'drive-farfog-' + key;
  return m;
}

/** Water that mirrors the sky dome's colours (the same uniforms), with stepped pixel ripples and a hard sun glint. */
function waterMaterial(skyU) {
  const m = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true });
  const u = { uTime: { value: 0 } };
  m.onBeforeCompile = (sh) => {
    for (const k of ['uHor', 'uMid', 'uUp', 'uZen', 'uGlow', 'uSun', 'uSunCol', 'uSunK']) sh.uniforms[k] = skyU[k];
    sh.uniforms.uTime = u.uTime;
    sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = `varying vec3 vWP;
uniform vec3 uHor, uMid, uUp, uZen, uGlow, uSun, uSunCol; uniform float uSunK, uTime;
float wh(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float bay(vec2 p) { vec2 q = mod(floor(p), 2.0); return (q.x * 2.0 + q.y * 3.0 - q.x * q.y * 4.0) / 4.0; }
vec3 skyAt(vec3 d) {
  float h = d.y, hl = max(length(d.xz), 1e-4);
  float sunK = max(0.0, dot(d.xz / hl, normalize(uSun.xz)));
  vec3 col = mix(uHor, uMid, smoothstep(0.0, 0.14, h));
  col = mix(col, uUp, smoothstep(0.12, 0.4, h));
  col = mix(col, uZen, smoothstep(0.35, 0.95, h));
  return mix(col, uGlow, pow(sunK, 4.0) * (1.0 - smoothstep(0.0, 0.3, h)) * 0.9);
}
` + sh.fragmentShader.replace('#include <color_fragment>', `
  vec3 Vd = normalize(vWP - cameraPosition);
  vec2 cell = floor(vWP.xz * 3.0);
  float tt = floor(uTime * 3.0);
  vec2 rip = (vec2(wh(cell + tt * 0.37), wh(cell.yx + tt * 0.71 + 3.1)) - 0.5) * 0.05;
  vec3 R = reflect(Vd, normalize(vec3(rip.x, 1.0, rip.y)));
  R.y = abs(R.y);
  vec3 Rb = normalize(vec3(R.x, max(R.y, 0.0) * 1.6 + 0.08, R.z));
  vec3 sky = mix(skyAt(Rb), uUp, 0.35) * 0.8;
  // the far banks, treelines and hills mirrored as a dark band along the horizon
  float az = atan(R.z, R.x);
  float ridge = 0.03 + 0.025 * (0.5 + 0.5 * sin(az * 7.0 + 1.3)) * (0.6 + 0.4 * sin(az * 17.0));
  sky = mix(sky, mix(vec3(0.17, 0.2, 0.15), uHor * 0.55, 0.35), step(R.y, ridge) * 0.85);
  float sd = max(0.0, dot(R, normalize(uSun)));
  sky += uSunCol * (step(0.9985, sd) * 1.4 + pow(sd, 90.0) * 0.3) * uSunK;
  float fres = 0.22 + 0.62 * pow(1.0 - max(0.0, -Vd.y), 4.0);
  vec3 wc = mix(vColor.rgb, sky, fres);
  // cat's-paws of wind: short darker streaks drifting across, in whole pixels
  vec2 sc = floor(vec2(vWP.x * 1.5 + floor(uTime * 2.0) * 0.5, vWP.z * 6.0));
  wc *= 1.0 - 0.12 * step(0.86, wh(vec2(floor(sc.x / 6.0), sc.y)));
  wc = floor(wc * 40.0 + bay(gl_FragCoord.xy)) / 40.0;
  diffuseColor.rgb = wc;`);
  };
  m.customProgramCacheKey = () => 'drive-water';
  m.userData.u = u;
  return m;
}

/** Indexed triangular prism (gable end walls): w across x, apex h above y=0, d deep along z; world UVs. */
function gable(w, h, d) {
  const g = new THREE.BufferGeometry();
  const p = [], n = [], uv = [], idx = [];
  for (const sz of [-1, 1]) {
    const z = (sz * d) / 2, b = p.length / 3;
    p.push(-w / 2, 0, z, w / 2, 0, z, 0, h, z);
    for (let k = 0; k < 3; k++) n.push(0, 0, sz);
    uv.push(-w / 2, 0, w / 2, 0, 0, h);
    if (sz > 0) idx.push(b, b + 1, b + 2); else idx.push(b, b + 2, b + 1);
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

export class Country {
  constructor(game) {
    this.game = game;
    const town = game.garage.town;
    this.town = town;
    this.group = new THREE.Group();
    this.group.name = 'drive-country';
    this.own = { geo: new Set(), mat: new Set(), tex: new Set(), inst: [] };
    this.obstacles = [];
    this.t = 0;
    this.sun = game.lighting?.sunDir?.clone() || V3(-0.37, 0.32, 0.87).normalize();
    // roads and the drivable area
    this.main = new Road('main', MAIN_PTS, { half: 2.8, edge: 3.25, profile: mainProfile });
    this.spur = new Road('spur', SPUR_PTS, { half: 2.5, edge: 3.0 });
    const sAtX = (r, x) => { for (let i = 0; i < r.n; i++) if (r.x[i] <= x) return r.s[i]; return r.length; };
    const sNear = (r, x, z) => r.nearest(x, z, {}, true).s;
    this.S = {
      start: 20, sign2km: 46, farm1: sAtX(this.main, 1040), bus: sAtX(this.main, 880), jizo: sAtX(this.main, 812), stand: sAtX(this.main, 792),
      pylon: sAtX(this.main, 712), junction: sNear(this.main, 693, 235), konbini: sNear(this.main, 678, 262),
      crossing: sAtX(this.main, TRACK_X), dip: sAtX(this.main, DIP.x0), portal: sAtX(this.main, 371), tunnel: sAtX(this.main, 362), end: this.main.length - 1,
    };
    this.S.xingSign = this.S.crossing - 115;
    this.course = new Course({
      roads: [this.main, this.spur],
      pads: [{ x: 621, z: 219.5, r: 8.5 }, { x: 687, z: 258, r: 5.5 }], // the spur's turning space, the konbini apron
      rects: [{ x0: 681, x1: 698.6, z0: 253, z1: 275 }], // the konbini car park
    });
    this.atlas = signAtlas();
    this.own.tex.add(this.atlas.tex);
    this.build();
  }

  // ---------------------------------------------------------------- ownership (everything made here is disposed)
  mine(x) {
    if (x?.isMaterial) this.own.mat.add(x);
    else if (x?.isBufferGeometry) this.own.geo.add(x);
    else if (x?.isTexture) this.own.tex.add(x);
    return x;
  }

  /** A unit-mapped town texture as a material of the zone's own (like town.T, but disposed with the zone). */
  T(key, w, h, { alpha = false, decal = false } = {}) {
    const ck = `${key}:${w}x${h}:${alpha}:${decal}`;
    this._T ||= new Map();
    if (!this._T.has(ck)) {
      const map = this.mine(townPix(key, w, h).texture());
      const m = this.mine(new THREE.MeshStandardMaterial({ map, vertexColors: true, roughness: 0.6 }));
      if (alpha) m.alphaTest = 0.5;
      if (decal) { m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -4; }
      this._T.set(ck, m);
    }
    return this._T.get(ck);
  }

  /** Height of whatever is underfoot (road, verge, bank, paddy, a house plot). */
  heightAt(x, z) {
    let y = GROUND;
    for (const r of [this.main, this.spur]) {
      const q = r.nearest(x, z, this._hq || (this._hq = {}));
      const d = q.dist, top = q.y;
      if (d < r.half + 0.5) return top;
      if (d < r.half + 1.6) y = Math.max(y, top + (GROUND - top) * ((d - r.half - 0.5) / 1.1));
    }
    for (const p of this.plots || []) if (x > p.x0 && x < p.x1 && z > p.z0 && z < p.z1) return 0;
    if (this.inPaddy?.(x, z)) y = Math.max(y, WATER);
    return y;
  }

  build() {
    const g = this.game, town = this.town;
    this.B = town.batch();
    this.shadowTris = [];
    this.plots = HOUSES.map((h) => ({ x0: h.x - h.w / 2, x1: h.x + h.w / 2, z0: h.z - h.d / 2, z1: h.z + h.d / 2 }));
    this.plots.push({ x0: KONBINI.x - 0.5, x1: KONBINI.x + 9.5, z0: KONBINI.z - 8, z1: KONBINI.z + 8 });
    this.buildSky();
    this.buildTerrain();
    this.buildRoads();
    this.buildPaddies();
    this.buildPoles();
    this.buildHouses();
    this.buildKonbini();
    this.buildRoadside();
    this.buildPylons();
    this.buildTrees();
    this.buildRail();
    this.buildEmbankment();
    this.buildSigns();
    this.B.build(this.group, { receive: true });
    this.buildShadows();
    this.crossing = this.buildCrossing();
    this.train = this.buildTrain();
    this.trucks = [];
    this.truckPlan = [
      { at: this.S.farm1 + 40, spawn: 230, variant: 0, done: false },
      { at: this.S.crossing + 25, spawn: 170, variant: 1, done: false },
    ];
    this.dyn = new DynamicShadows(this.shadowMat, 1500);
    this.group.add(this.dyn.mesh);
    this.group.traverse((o) => { o.userData.noRim = true; if (o.isMesh && !o.isInstancedMesh) o.matrixAutoUpdate = o.matrixAutoUpdate && !!o.userData.moves; });
    g.scene.add(this.group);
    this.group.updateMatrixWorld(true);
  }

  // ---------------------------------------------------------------- sky, mountains, the ground beyond the zone
  buildSky() {
    // a ring of hazy ridges and a skirt of fields that follow the camera (backdrop: no parallax, like the sky)
    const ring = new THREE.Group();
    ring.name = 'drive-horizon';
    const pos = [], col = [], c = new THREE.Color();
    const N = 120;
    const layer = (r, h0, h1, tint, seed) => {
      for (let i = 0; i < N; i++) {
        const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
        const H = (a) => h0 + (h1 - h0) * (0.5 + 0.3 * Math.sin(a * 3 + seed) + 0.15 * Math.sin(a * 7.3 + seed * 2) + 0.05 * Math.sin(a * 17 + seed));
        const p = (a, y) => [Math.cos(a) * r, y, Math.sin(a) * r];
        const A = p(a0, -0.7), Bq = p(a1, -0.7), C = p(a1, H(a1)), D = p(a0, H(a0));
        pos.push(...A, ...C, ...Bq, ...A, ...D, ...C);
        c.setHex(tint);
        const k = 0.94 + hash2(i, seed) * 0.08;
        for (let j = 0; j < 6; j++) col.push(c.r * k, c.g * k, c.b * k);
      }
    };
    layer(395, 30, 78, 0x6a7a8c, 1.3);
    layer(330, 14, 40, 0x4e6a52, 4.1);
    // the skirt: fields out to the hills
    const S = 48;
    for (let i = 0; i < S; i++) {
      const a0 = (i / S) * Math.PI * 2, a1 = ((i + 1) / S) * Math.PI * 2;
      for (const [r0, r1] of [[30, 200], [200, 400]]) {
        const p = (a, r) => [Math.cos(a) * r, -0.66, Math.sin(a) * r];
        pos.push(...p(a0, r0), ...p(a1, r0), ...p(a1, r1), ...p(a0, r0), ...p(a1, r1), ...p(a0, r1));
        c.setHex(hash2(i, r0) < 0.5 ? 0x6a7a4a : 0x7a7a52);
        for (let j = 0; j < 6; j++) col.push(c.r, c.g, c.b);
      }
    }
    const geo = this.mine(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const mat = this.mine(farFog(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }), 'ridge', 0.72));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = -5;
    ring.add(mesh);
    this.horizon = ring;
    this.group.add(ring);
  }

  // ---------------------------------------------------------------- the ground
  buildTerrain() {
    const x0 = 270, x1 = 1130, z0 = 120, z1 = 430, cs = 8;
    const nx = Math.round((x1 - x0) / cs), nz = Math.round((z1 - z0) / cs);
    const pos = [], col = [], uv = [], c = new THREE.Color();
    const tone = (x, z) => {
      const k = hash2(Math.floor(x / 24), Math.floor(z / 16));
      // dry fields here and there: dark soil, a few with rapeseed in flower
      if (k < 0.12) return hash2(Math.floor(x / 24) + 3, Math.floor(z / 16)) < 0.4 ? 0xc8b84a : 0x8a6e4c;
      return k < 0.45 ? 0xb4a868 : k < 0.8 ? 0xa8a460 : 0x9ca45c; // early April: last year's grass still straw, new green coming
    };
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const ax = x0 + i * cs, az = z0 + j * cs, bx = ax + cs, bz = az + cs;
      if (bx > CUT.x0 && ax < CUT.x1 && bz > CUT.z0 && az < CUT.z1) continue;
      pos.push(ax, GROUND, az, ax, GROUND, bz, bx, GROUND, bz, ax, GROUND, az, bx, GROUND, bz, bx, GROUND, az);
      uv.push(ax, -az, ax, -bz, bx, -bz, ax, -az, bx, -bz, bx, -az);
      c.setHex(tone(ax + 4, az + 4));
      const k = (0.95 + hash2(i, j) * 0.08) * 1.15;
      for (let q = 0; q < 6; q++) col.push(c.r * k, c.g * k, c.b * k);
    }
    const geo = this.mine(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, this.town.m.grass);
    mesh.receiveShadow = false;
    mesh.name = 'terrain';
    this.group.add(mesh);
  }

  /** The asphalt ribbon of a road, its gravel shoulders and grass slopes down to the fields. */
  ribbon(r, mat, { from = 0, to = r.length, slope = true, half = r.half } = {}) {
    const P = [], U = [], N = [], I = [];
    const sideP = [], sideU = [], sideI = [];
    const pt = {};
    const ns = Math.ceil((to - from) / 1.0);
    for (let k = 0; k <= ns; k++) {
      const s = from + ((to - from) * k) / ns;
      r.at(s, 0, pt);
      const y = pt.y + 0.004, lx = pt.tz, lz = -pt.tx; // left normal
      P.push(pt.x - lx * half, y, pt.z - lz * half, pt.x + lx * half, y, pt.z + lz * half);
      U.push(0, s / 8, 1, s / 8);
      N.push(0, 1, 0, 0, 1, 0);
      if (k) { const b = (k - 1) * 2; I.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); }
      if (slope) {
        // per side: asphalt edge -> gravel lip -> grass down to the field
        const prof = [[r.half, y - 0.004], [r.half + 0.5, y - 0.02], [r.half + 1.6, GROUND + 0.01]];
        for (const sd of [-1, 1]) for (const [d, yy] of prof) { sideP.push(pt.x + lx * d * sd, yy, pt.z + lz * d * sd); sideU.push(pt.x + lx * d * sd, -(pt.z + lz * d * sd)); }
        if (k) {
          const b = (k - 1) * 6, c2 = k * 6;
          for (const [o, flip] of [[0, true], [3, false]]) for (let q = 0; q < 2; q++) {
            const a0 = b + o + q, a1 = b + o + q + 1, b0 = c2 + o + q, b1 = c2 + o + q + 1;
            if (flip) sideI.push(a0, a1, b0, a1, b1, b0); else sideI.push(a0, b0, a1, a1, b0, b1);
          }
        }
      }
    }
    const g = this.mine(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    g.setIndex(I);
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat);
    m.receiveShadow = false;
    this.group.add(m);
    if (slope) {
      const sg = new THREE.BufferGeometry();
      sg.setAttribute('position', new THREE.Float32BufferAttribute(sideP, 3));
      sg.setAttribute('uv', new THREE.Float32BufferAttribute(sideU, 2));
      sg.setIndex(sideI);
      sg.computeVertexNormals();
      const cols = new Float32Array(sideP.length);
      for (let i = 0; i < sideP.length / 3; i++) { const lip = i % 3 !== 2; cols.set(lip ? [1.2, 1.08, 0.82] : [1.12, 1.08, 0.78], i * 3); }
      sg.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      sg.computeBoundingSphere();
      this.mine(sg);
      this.group.add(new THREE.Mesh(sg, this.town.m.grass));
    }
  }

  buildRoads() {
    const tex = this.mine(roadTexture());
    const road = this.mine(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 }));
    this.ribbon(this.main, road, { to: this.S.dip - 1 });
    this.ribbon(this.main, road, { from: this.S.dip - 1, slope: false, half: 3.4 });
    // the dead-end spur: older asphalt, under the main road where they meet
    const spurM = this.mine(road.clone());
    spurM.color.setHex(0xd8d2c4); spurM.polygonOffset = true; spurM.polygonOffsetFactor = 2; spurM.polygonOffsetUnits = 2;
    this.ribbon(this.spur, spurM);
    // the konbini's forecourt and the spur's turning space: flat asphalt pads
    const padM = this.mine(road.clone());
    padM.color.setHex(0xc8c4bc); padM.polygonOffset = true; padM.polygonOffsetFactor = 3; padM.polygonOffsetUnits = 3;
    const pad = (x, z, w, d, ry = 0) => { const pg = this.mine(new THREE.PlaneGeometry(w, d)); pg.rotateX(-Math.PI / 2); pg.rotateY(ry); pg.translate(x, 0.002, z); const m = new THREE.Mesh(pg, padM); this.group.add(m); };
    pad(689.5, 264, 19, 24);
    pad(621, 219.5, 16, 16);
    // stop line and 止まれ before the level crossing (white paint decals)
    const paint = this.town.m.paint;
    const stopS = this.S.crossing + 9;
    const p = this.main.at(stopS, 1.4, {});
    this.B.push(p.x, p.y + 0.012, p.z, p.heading);
    this.B.plane(paint, 2.6, 0.3, 0, 0, 0, {});
    this.B.pop();
    const q = this.main.at(stopS + 4, 1.4, {});
    this.B.push(q.x, q.y + 0.012, q.z, q.heading + Math.PI);
    this.B.plane(this.T('tomare', 64, 32, { decal: true, alpha: true }), 2.2, 2.2, 0, 0, 0, { unit: true, tint: 0xf0ece0 });
    this.B.pop();
  }

  // ---------------------------------------------------------------- paddies
  buildPaddies() {
    const cells = [], CW = 26, CD = 15;
    const rr = (x, z) => Math.min(this.main.nearest(x, z, {}).dist, this.spur.nearest(x, z, {}).dist);
    const blocked = (x, z) => {
      if (rr(x, z) < 6.5) return true;
      for (const p of this.plots) if (x > p.x0 - 3 && x < p.x1 + 3 && z > p.z0 - 3 && z < p.z1 + 3) return true;
      if (Math.abs(x - TRACK_X) < 7 || x < EMB.x1 + 12) return true;
      for (const t of PYLONS) if (Math.hypot(x - t.x, z - t.z) < 11) return true;
      if (Math.hypot(x - 621, z - 219.5) < 13) return true;
      return false;
    };
    for (let x = 392; x < 1096; x += CW) for (let z = 150; z < 402; z += CD) {
      const ox = hash2(Math.round(z), 9) * 6;
      const ax = x + ox, bx = ax + CW, az = z, bz = z + CD;
      if ([[ax, az], [bx, az], [ax, bz], [bx, bz], [(ax + bx) / 2, (az + bz) / 2]].some(([px, pz]) => blocked(px, pz))) continue;
      if (hash2(Math.floor(ax), Math.floor(az)) < 0.12) continue; // a dry field instead (the terrain's colour shows)
      cells.push([ax, az, bx, bz]);
    }
    this.paddyCells = cells;
    // a coarse lookup for heightAt
    const key = (x, z) => `${Math.floor(x / 10)},${Math.floor(z / 10)}`;
    const grid = new Map();
    cells.forEach((c, i) => { for (let x = Math.floor(c[0] / 10); x <= Math.floor(c[2] / 10); x++) for (let z = Math.floor(c[1] / 10); z <= Math.floor(c[3] / 10); z++) { const k = `${x},${z}`; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); } });
    this.inPaddy = (x, z) => (grid.get(key(x, z)) || []).some((i) => { const c = cells[i]; return x > c[0] + 0.3 && x < c[2] - 0.3 && z > c[1] + 0.3 && z < c[3] - 0.3; });
    // water: one quad per paddy, the floor's tint (muddy / with a green sheen) in the vertex colour
    const P = [], C = [], c = new THREE.Color();
    for (const [ax, az, bx, bz] of cells) {
      const i0 = 0.3;
      const xa = ax + i0, xb = bx - i0, za = az + i0, zb = bz - i0;
      P.push(xa, WATER, za, xa, WATER, zb, xb, WATER, zb, xa, WATER, za, xb, WATER, zb, xb, WATER, za);
      c.setHex(hash2(Math.floor(ax), 5) < 0.3 ? 0x4a5a34 : 0x4e4634);
      for (let q = 0; q < 6; q++) C.push(c.r, c.g, c.b);
    }
    const wg = this.mine(new THREE.BufferGeometry());
    wg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    wg.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    wg.computeBoundingSphere();
    this.water = this.mine(waterMaterial(this.town.skyMat.uniforms));
    const wm = new THREE.Mesh(wg, this.water);
    wm.name = 'water';
    this.group.add(wm);
    // the banks between them (aze), grassy, a little higher than the water
    const B = this.B, grass = this.town.m.grass;
    for (const [ax, az, bx, bz] of cells) {
      const w = bx - ax, d = bz - az, h = BANK - (GROUND - 0.05);
      B.box(grass, w, h, 0.36, (ax + bx) / 2, GROUND - 0.05, az + 0.18, { tint: 0xb8b070 });
      B.box(grass, w, h, 0.36, (ax + bx) / 2, GROUND - 0.05, bz - 0.18, { tint: 0xb8b070 });
      B.box(grass, 0.36, h, d - 0.72, ax + 0.18, GROUND - 0.05, (az + bz) / 2, { tint: 0xb8b070 });
      B.box(grass, 0.36, h, d - 0.72, bx - 0.18, GROUND - 0.05, (az + bz) / 2, { tint: 0xb8b070 });
    }
  }

  // ---------------------------------------------------------------- utility poles and their wires
  buildPoles() {
    const poles = [];
    const alongMain = (s0, s1, step, d) => { for (let s = s0; s < s1; s += step) { const p = this.main.at(s, d, {}); poles.push({ x: p.x, z: p.z, h: p.heading, y: GROUND + 0.05 }); } };
    // on the left (south / sunny side), so their long shadows lie across the road
    alongMain(8, this.S.junction - 6, 34, 4.4);
    alongMain(this.S.junction + 22, this.S.crossing - 14, 34, 4.4);
    alongMain(this.S.crossing + 14, this.S.dip - 4, 34, 4.4);
    this.poles = poles;
    const B = this.B, m = this.town.m;
    for (const [i, p] of poles.entries()) {
      B.push(p.x, p.y, p.z, p.h + (hash2(i, 3) - 0.5) * 0.06);
      const shaft = new THREE.CylinderGeometry(0.12, 0.17, 9.4, 8, 1);
      shaft.translate(0, 4.7, 0);
      B.geo(m.conc, shaft, { tint: 0xc8c4bc });
      const guard = new THREE.CylinderGeometry(0.185, 0.19, 1.8, 8, 1, true);
      guard.translate(0, 0.9, 0);
      B.geo(m.hazard, guard, { tint: 0xffffff });
      B.box(m.found, 0.36, 0.5, 0.05, 0, 2.4, 0.17, { tint: 0x2a52a8 }); // the blue address plate
      // crossarms (across the road), insulators, a transformer on every third pole
      B.box(m.found, 1.9, 0.09, 0.09, 0, 7.36, 0, { tint: 0x9aa0a4 });
      B.box(m.found, 1.5, 0.08, 0.08, 0, 6.8, 0, { tint: 0x9aa0a4 });
      for (const x of [-0.8, -0.4, 0.4, 0.8]) B.box(m.found, 0.07, 0.14, 0.07, x, 7.45, 0, { tint: 0xf2efe6 });
      for (const x of [-0.64, 0.64]) B.box(m.found, 0.07, 0.12, 0.07, x, 6.88, 0, { tint: 0xf2efe6 });
      if (i % 3 === 1) { const tr = new THREE.CylinderGeometry(0.2, 0.2, 0.7, 7); tr.translate(0.32, 5.6, 0); B.geo(m.found, tr, { tint: 0xaab2ac }); }
      B.pop();
    }
    // wires: the crossarm's insulators to the next pole's, sagging
    const seg = [];
    const att = [[-0.8, 7.58], [-0.4, 7.58], [0.4, 7.58], [0.8, 7.58], [-0.64, 6.99], [0.64, 6.99], [0.2, 4.6]];
    const wp = (p, ax, ay) => V3(p.x + Math.cos(p.h) * ax, p.y + ay, p.z - Math.sin(p.h) * ax);
    for (let i = 0; i + 1 < poles.length; i++) {
      const a = poles[i], b = poles[i + 1];
      if (Math.hypot(a.x - b.x, a.z - b.z) > 45) continue;
      for (const [ax, ay] of att) {
        const A = wp(a, ax, ay), Bp = wp(b, ax, ay), sag = ay < 5 ? 0.55 : 0.42;
        let prev = A;
        for (let k = 1; k <= 10; k++) { const t = k / 10, P = A.clone().lerp(Bp, t); P.y -= 4 * sag * t * (1 - t); seg.push(prev.x, prev.y, prev.z, P.x, P.y, P.z); prev = P; }
      }
    }
    const lg = this.mine(new THREE.BufferGeometry());
    lg.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
    lg.computeBoundingSphere();
    this.group.add(new THREE.LineSegments(lg, this.mine(new THREE.LineBasicMaterial({ color: 0x24262a }))));
    // shadows of the poles: long thin strips thrown across the road
    for (const p of poles) this.shadowStrip(p.x, p.z, 8.0, 0.28, 0.6);
  }

  // ---------------------------------------------------------------- shadows
  shadowStrip(x, z, h, w, w2 = w) {
    const g = this.heightAt(x, z), a = [x, z], b = project(x, g + h, z, this.sun, g);
    strip(this.shadowTris, a, b, w, (px, pz) => this.heightAt(px, pz), 1.4, 0.03, w2);
  }
  shadowBox(x, z, ry, hw, hd, y0, y1, step = 2.6) {
    const pts = [], c = Math.cos(ry), s = Math.sin(ry);
    for (const lx of [-hw, hw]) for (const lz of [-hd, hd]) for (const y of [y0, y1]) {
      const wx = x + lx * c + lz * s, wz = z - lx * s + lz * c;
      pts.push(project(wx, y, wz, this.sun, GROUND));
    }
    drapeTris(this.shadowTris, hull(pts), (px, pz) => this.heightAt(px, pz), step, 0.03);
  }
  shadowTree(x, z, r, h) {
    const pts = [[x, z]];
    for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2; pts.push(project(x + Math.cos(a) * r, h * 0.55, z + Math.sin(a) * r, this.sun, GROUND)); }
    pts.push(project(x, h, z, this.sun, GROUND));
    drapeTris(this.shadowTris, hull(pts), (px, pz) => this.heightAt(px, pz), 3, 0.03);
  }
  buildShadows() {
    this.shadowMat = this.mine(shadowMaterial());
    const g = this.mine(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.shadowTris, 3));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, this.shadowMat);
    m.name = 'shadows';
    m.renderOrder = 1;
    this.group.add(m);
    this.shadowTris = null;
  }

  // ---------------------------------------------------------------- farmhouses
  buildHouses() {
    const B = this.B, m = this.town.m, T = (k, w, h, o) => this.T(k, w, h, o);
    for (const H of HOUSES) {
      // the plot: a stone-faced platform with a gravel yard
      B.push(H.x, 0, H.z, H.ry);
      B.box(m.kenchi, H.w, 0.5, H.d, 0, -0.5, 0, { tint: 0xd8d0c0 });
      B.box(m.ground, H.w - 0.2, 0.02, H.d - 0.2, 0, -0.01, 0, { tint: 0xb8b0a0 });
      const hx = H.kind === 'small' ? 10 : 13, hd = H.kind === 'small' ? 7 : 8.5;
      if (H.kind !== 'barn') {
        // the main house: dark board walls, plaster above, a long engawa with amado shutters, a big ibushi-tile roof
        const hz = -H.d / 2 + hd / 2 + 2.5, wallH = 3.1;
        B.box(m.board, hx, 1.2, hd, -H.w / 2 + hx / 2 + 2, 0, hz, { tint: 0x8a7a6a });
        B.box(m.wallCream, hx, wallH - 1.2, hd, -H.w / 2 + hx / 2 + 2, 1.2, hz, { tint: 0xf0e8d8 });
        const cx = -H.w / 2 + hx / 2 + 2;
        // front (faces +z): shutters, shoji, the genkan door
        for (let i = 0; i < Math.floor(hx / 1.8) - 1; i++) {
          const wx = cx - hx / 2 + 1.2 + i * 1.8;
          B.quad(i === 1 ? T('doorWood', 24, 32) : i % 3 === 2 ? T('winShoji', 32, 24) : T('amado', 32, 24), i === 1 ? 1.4 : 1.6, i === 1 ? 2.1 : 1.6, wx, i === 1 ? 0 : 0.5, hz + hd / 2 + 0.02, {});
        }
        // engawa (veranda) planks and posts
        B.box(m.boardL, hx, 0.12, 1.0, cx, 0.42, hz + hd / 2 + 0.5, { tint: 0xb89a70 });
        for (let k = 0; k <= 4; k++) B.box(m.boardL, 0.14, wallH - 0.4, 0.14, cx - hx / 2 + 0.2 + (k * (hx - 0.4)) / 4, 0.42, hz + hd / 2 + 0.95, { tint: 0x7a6248 });
        // roof
        const roofM = H.kind === 'small' ? m.tinRed : m.roofIbushi, th = 0.5, over = 1.0;
        const half = hd / 2 + over, L = half / Math.cos(th), rise = half * Math.tan(th);
        for (const sz of [-1, 1]) B.box(roofM, hx + 1.6, 0.22, L, cx, wallH - 0.11 + rise / 2 - over * Math.tan(th), hz + (sz * half) / 2, { rx: sz * th, tint: 0xffffff });
        B.box(m.roofIbushi, hx + 1.8, 0.3, 0.5, cx, wallH + rise - over * Math.tan(th) - 0.05, hz, { tint: 0x7a808a });
        B.push(cx, wallH, hz, Math.PI / 2);
        B.geo(m.wallCream, gable(hd, rise - over * Math.tan(th) + 0.05, hx - 0.02), { tint: 0xe8e0d0 });
        B.pop();
        this.shadowBox(H.x + Math.cos(H.ry) * cx + Math.sin(H.ry) * hz, H.z - Math.sin(H.ry) * cx + Math.cos(H.ry) * hz, H.ry, hx / 2, hd / 2, 0, wallH + rise * 0.7);
      }
      // the kura (white storehouse) or a barn
      if (H.kind === 'big') {
        const kx = H.w / 2 - 4, kz = -H.d / 2 + 4;
        B.box(m.skirt, 4.6, 1.0, 4.6, kx, 0, kz, { tint: 0x5a5a5e });
        B.box(m.wallCream, 4.6, 3.4, 4.6, kx, 1.0, kz, { tint: 0xfaf6ee });
        B.quad(T('winDark', 24, 24), 0.8, 0.8, kx, 3.0, kz + 2.32, {});
        for (const sz of [-1, 1]) B.box(m.roofIbushi, 5.6, 0.2, 3.1, kx, 4.4 + 0.55, kz + sz * 1.35, { rx: sz * 0.45, tint: 0xffffff });
        B.box(m.roofIbushi, 5.8, 0.3, 0.4, kx, 5.5, kz, { tint: 0x6a707a });
        B.push(kx, 4.4, kz, Math.PI / 2); B.geo(m.wallCream, gable(4.6, 1.05, 4.58), { tint: 0xf4f0e6 }); B.pop();
        this.shadowBox(H.x + Math.cos(H.ry) * kx + Math.sin(H.ry) * kz, H.z - Math.sin(H.ry) * kx + Math.cos(H.ry) * kz, H.ry, 2.3, 2.3, 0, 5.4);
      }
      if (H.kind === 'big' || H.kind === 'barn') {
        // a tin barn: open front, a dark inside, rice straw bundles
        const bx = H.kind === 'barn' ? -2 : H.w / 2 - 6, bz = H.kind === 'barn' ? 0 : H.d / 2 - 5, bw = H.kind === 'barn' ? 12 : 8, bd = 6;
        B.box(m.tinTeal, bw, 3.4, 0.08, bx, 0, bz - bd / 2, { tint: 0xd0d8d4 });
        for (const sx of [-1, 1]) B.box(m.tin, 0.08, 3.4, bd, bx + sx * bw / 2, 0, bz, { tint: 0xc8c0b0 });
        B.box(m.found, bw - 0.2, 3.3, 0.05, bx, 0, bz - bd / 2 + 0.1, { tint: 0x3a3632 });
        B.box(m.tinRed, bw + 0.8, 0.12, bd + 1.2, bx, 3.5, bz + 0.2, { rx: -0.12, tint: 0xd8c8b8 });
        for (let k = 0; k < 5; k++) B.box(m.boardL, 0.6, 1.1, 0.6, bx - bw / 2 + 1.2 + k * 0.7, 0, bz - 1.4, { tint: 0xe0c070 });
        if (H.kind === 'barn') this.signQuad('rice', 2.2, 1.1, bx + 2.2, 1.9, bz + bd / 2 + 0.05, 0);
        this.shadowBox(H.x + Math.cos(H.ry) * bx + Math.sin(H.ry) * bz, H.z - Math.sin(H.ry) * bx + Math.cos(H.ry) * bz, H.ry, bw / 2, bd / 2, 0, 3.6);
      }
      if (H.kind === 'small') {
        // vinyl greenhouses: white tunnels
        for (let k = 0; k < 3; k++) {
          const g = new THREE.CylinderGeometry(1.6, 1.6, 9, 10, 1, true, -Math.PI / 2, Math.PI);
          g.rotateZ(Math.PI / 2); g.rotateY(Math.PI / 2);
          B.push(H.w / 2 - 2.5 - k * 3.6, 0, 1.5, Math.PI / 2);
          B.geo(this.green || (this.green = this.mine(new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.35, transparent: true, opacity: 0.82, side: THREE.DoubleSide }))), g, { tint: 0xeef0ec });
          B.pop();
        }
      }
      // a laundry pole and a parked kei truck in the big yards
      if (H.kind === 'big') {
        for (const sx of [-1, 1]) B.box(m.found, 0.08, 2.0, 0.08, -2 + sx * 1.6, 0, H.d / 2 - 2.5, { tint: 0x8a8a8a });
        B.box(m.found, 3.4, 0.04, 0.04, -2, 1.9, H.d / 2 - 2.5, { tint: 0x8a8a8a });
        for (let k = 0; k < 4; k++) B.box(m.wallCream, 0.5, 0.6, 0.03, -3.2 + k * 0.75, 1.3, H.d / 2 - 2.5, { tint: [0xf4f0e6, 0x6a9ad8, 0xe86a7a, 0xf4f0e6][k] });
      }
      B.pop();
      this.parked ||= [];
      if (H.kind === 'big') this.parked.push({ x: H.x + Math.cos(H.ry) * (H.w / 2 - 6) + Math.sin(H.ry) * (H.d / 2 - 1.5), z: H.z - Math.sin(H.ry) * (H.w / 2 - 6) + Math.cos(H.ry) * (H.d / 2 - 1.5), h: H.ry + Math.PI / 2 });
    }
    for (const p of this.parked || []) this.shadowBox(p.x, p.z, p.h, 0.74, 1.7, 0, 1.8, 2);
  }

  // ---------------------------------------------------------------- the konbini at the junction
  buildKonbini() {
    const B = this.B, m = this.town.m, K = KONBINI, A = this.atlas;
    B.push(K.x, 0, K.z, K.ry);
    // the plot (its front faces +z locally: the road)
    B.box(m.conc, 16, 0.5, 10, 0, -0.5, -4.5, { tint: 0xc8c4bc });
    B.box(m.prefab, 14, 3.4, 8, 0, 0, -4.5, { tint: 0xf4f2ec });
    B.box(m.found, 14.4, 0.25, 8.4, 0, 3.4, -4.5, { tint: 0xd8d6d0 });
    // the band sign round the top, a lit window across the front
    this.signQuadB(B, 'konbini', 13.6, 1.1, 0, 2.4, -0.48, 0, true);
    this.signQuadB(B, 'konbiniWin', 10.5, 2.1, -1.2, 0.15, -0.47, 0, true);
    B.box(m.found, 2.0, 2.3, 0.06, 5.2, 0, -0.5, { tint: 0x9aa2aa });
    B.box(this.town.G, 1.8, 2.1, 0.04, 5.2, 0.05, -0.46, { tint: 0xe8f0f0 });
    // a phone box and a bench by the door, a bin
    B.box(m.found, 1.0, 2.2, 1.0, 6.6, 0, 1.2, { tint: 0x5aa86a });
    B.box(this.town.G, 0.9, 1.4, 0.92, 6.6, 0.6, 1.2, { tint: 0xc8e0c8 });
    B.box(m.boardL, 1.6, 0.42, 0.4, -6, 0, 0.6, { tint: 0x8a6a4a });
    B.box(m.found, 0.5, 0.9, 0.5, -4.6, 0, 0.5, { tint: 0x3a6ab8 });
    B.pop();
    // the pole sign at the corner, lit
    const ps = { x: 692.5, z: 249.5 };
    B.box(m.found, 0.25, 4.6, 0.25, ps.x, 0, ps.z, { tint: 0x9a9ea2 });
    for (const ry of [-0.6, Math.PI - 0.6]) { B.push(ps.x, 4.4, ps.z, ry); this.signQuadB(B, 'konbiniPole', 1.3, 1.8, 0, 0, 0.13, 0, true); B.pop(); }
    this.shadowBox(K.x - 4.5 * Math.sin(K.ry), K.z - 4.5 * Math.cos(K.ry), K.ry, 7, 4, 0, 3.6);
    this.shadowStrip(ps.x, ps.z, 6.2, 0.3, 1.2);
    // vending machines by the door (instanced with the bus stop's)
    const front = (lx, lz) => ({ x: K.x + Math.cos(K.ry) * lx + Math.sin(K.ry) * lz, z: K.z - Math.sin(K.ry) * lx + Math.cos(K.ry) * lz, h: K.ry });
    this.vendings = [front(-3.4, 0.0), front(-2.4, 0.0)];
  }

  // ---------------------------------------------------------------- bus stop, vending machine, Jizō, the vegetable stand, sakura
  buildRoadside() {
    const B = this.B, m = this.town.m;
    // the bus stop: a rusty tin shelter on posts, a bench inside, the round sign out by the road
    const bs = this.main.at(this.S.bus, 5.6, {});
    B.push(bs.x, 0, bs.z, bs.heading + Math.PI / 2);
    B.box(m.conc, 4.4, 0.08, 2.4, 0, -0.06, 0, { tint: 0xb8b2a4 });
    for (const [px, pz] of [[-2, -1], [2, -1], [-2, 1], [2, 1]]) B.box(m.found, 0.1, 2.4, 0.1, px, 0, pz, { tint: 0x6a5a4a });
    B.box(m.tinRed, 4.8, 0.08, 2.8, 0, 2.4, 0, { rx: 0.1, tint: 0xb8805a });
    B.box(m.tin, 4.0, 2.0, 0.06, 0, 0.3, 1.05, { tint: 0x9a7a5a });
    for (const sx of [-1, 1]) B.box(m.tin, 0.06, 2.0, 2.0, sx * 2.0, 0.3, 0.05, { tint: 0x8a6a4a });
    B.box(m.boardL, 3.2, 0.08, 0.45, 0, 0.45, 0.65, { tint: 0x8a6a48 });
    for (const sx of [-1, 1]) B.box(m.found, 0.08, 0.45, 0.4, sx * 1.4, 0, 0.65, { tint: 0x4a4a4a });
    this.signQuadB(B, 'busPlate', 1.0, 0.45, 0, 1.6, 1.0, Math.PI, false);
    B.pop();
    this.shadowBox(bs.x, bs.z, bs.heading, 2.4, 1.4, 0, 2.5);
    this.props = [];
    const sign = this.main.at(this.S.bus + 3, 3.6, {});
    this.props.push({ id: 'bus_stop', x: sign.x, z: sign.z, h: sign.heading - Math.PI / 2, y: 0 });
    // a vending machine glowing beside the shelter
    const vm = this.main.at(this.S.bus - 3.4, 4.4, {});
    this.vendings.push({ x: vm.x, z: vm.z, h: vm.heading - Math.PI / 2 });
    this.vendings.splice(1, 1); // one by the konbini door is enough
    // the Jizō in his little shrine, on the right, and the honour-system vegetable stand
    const jz = this.main.at(this.S.jizo, -4.6, {});
    this.props.push({ id: 'jizo_shrine', x: jz.x, z: jz.z, h: jz.heading + Math.PI / 2, y: GROUND + 0.05 });
    const st = this.main.at(this.S.stand, -4.4, {});
    B.push(st.x, GROUND, st.z, st.heading + Math.PI / 2);
    B.box(m.boardL, 1.6, 0.9, 0.7, 0, 0, 0, { tint: 0x9a7a52 });
    for (const sx of [-1, 1]) B.box(m.boardL, 0.08, 1.9, 0.08, sx * 0.75, 0, -0.3, { tint: 0x6a5238 });
    B.box(m.tinRed, 1.9, 0.06, 1.1, 0, 1.9, -0.1, { rx: 0.15, tint: 0xd8c0a0 });
    for (let k = 0; k < 3; k++) B.box(m.wallCream, 0.28, 0.2, 0.28, -0.5 + k * 0.5, 0.9, 0.05, { tint: [0x8ac05a, 0xe86a3a, 0xd8c070][k] });
    this.signQuadB(B, 'yasai', 0.9, 0.45, 0, 1.25, -0.25, 0, false);
    B.pop();
    // the road works at the very start (behind you), a cone or two
    const rw = this.main.at(4, 0, {});
    B.push(rw.x, 0, rw.z, rw.heading);
    B.box(m.hazard, 5.4, 0.25, 0.08, 0, 0.75, 0, { tint: 0xffffff });
    B.box(m.hazard, 5.4, 0.25, 0.08, 0, 0.25, 0, { tint: 0xffffff });
    for (const sx of [-1, 1]) B.box(m.found, 0.1, 1.1, 0.1, sx * 2.6, 0, 0, { tint: 0xd8d8d8 });
    this.signQuadB(B, 'works', 1.2, 0.8, 1.2, 1.05, 0.06, 0, false);
    B.pop();
    for (const d of [-1.6, 1.2]) { const c = this.main.at(7, d, {}); this.props.push({ id: 'cone', x: c.x, z: c.z, h: 0, y: 0 }); }
    // the dead end: a striped barricade and 通行止め, with a cone
    const de = this.spur.at(this.spur.length - 1, 0, {});
    B.push(de.x - 4.5, 0, de.z - 0.6, de.heading + Math.PI);
    for (const y of [0.35, 0.85]) B.box(m.hazard, 5.6, 0.24, 0.08, 0, y, 0, { tint: 0xffffff });
    for (const sx of [-1, 1]) B.box(m.found, 0.1, 1.2, 0.1, sx * 2.7, 0, 0, { tint: 0xd8d8d8 });
    this.signQuadB(B, 'closed', 1.6, 1.0, 0, 1.2, 0.06, 0, false);
    B.box(m.found, 0.08, 1.2, 0.08, 0, 0, -0.1, { tint: 0xd8d8d8 });
    B.pop();
    // sakura in bloom: by the bus stop, by the crossing, at the Jizō
    this.sakura = [this.main.at(this.S.bus + 9, 6.5, {}), this.main.at(this.S.crossing + 12, 7.0, {}), this.main.at(this.S.jizo + 4, -6.8, {})].map((p) => ({ x: p.x, z: p.z }));
    for (const p of this.sakura) this.props.push({ id: 'sakura_tree', x: p.x, z: p.z, h: hash2(p.x, p.z) * 6, y: GROUND, s: 2.1 });
    // place the props: baked into one mesh per voxel material (vending machines on their own, a gentler glow)
    const items = [], vend = [];
    const m4 = (p, s = 1) => new THREE.Matrix4().compose(V3(p.x, p.y, p.z), new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), p.h), V3(s, s, s));
    for (const p of this.props) {
      const geo = propGeometry(p.id);
      if (!geo) continue;
      items.push({ geo, matrix: m4(p, p.s || 1) });
      if (p.id === 'cone') continue;
      const sz = propSize(p.id);
      if (p.id === 'sakura_tree') this.shadowTree(p.x, p.z, sz.x * (p.s || 1) * 0.42, sz.y * (p.s || 1));
      else this.shadowBox(p.x, p.z, p.h, sz.x / 2, sz.z / 2, 0, sz.y);
    }
    const vg = propGeometry('vending');
    for (const v of this.vendings) { if (vg) vend.push({ geo: vg, matrix: m4({ ...v, y: 0 }) }); const sz = propSize('vending'); this.shadowBox(v.x, v.z, v.h, sz.x / 2, sz.z / 2, 0, sz.y); }
    for (const p of this.parked || []) items.push({ geo: keiTruckGeometry(2), matrix: m4({ ...p, y: 0 }) });
    this.bake(items, voxelMaterials('normal'), 'props');
    this.bake(vend, this.town.dimVoxel(), 'vending');
  }

  /** Concatenate voxel props per material (src/drive/bake.js) and add one mesh per material. */
  bake(items, mats, name) {
    bakeVoxels(items).forEach((g, i) => {
      if (!g) return;
      this.mine(g);
      const mesh = new THREE.Mesh(g, mats[i]);
      mesh.name = name + ':' + i;
      this.group.add(mesh);
    });
  }

  // ---------------------------------------------------------------- the pylons (the town's tower, instanced)
  buildPylons() {
    const src = this.town.pylon?.group?.children.filter((o) => o.isInstancedMesh) || [];
    if (src.length < 2) return;
    const [steel, ins] = src;
    this.treeSrc = src[2] || null;
    const mats = PYLONS.map((t) => new THREE.Matrix4().compose(V3(t.x, GROUND, t.z), new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), t.ry), V3(1, 1, 1)));
    for (const s of [steel, ins]) {
      const im = new THREE.InstancedMesh(s.geometry, s.material, PYLONS.length);
      im.name = 'pylons';
      mats.forEach((m4, i) => im.setMatrixAt(i, m4));
      im.computeBoundingSphere();
      this.group.add(im); this.own.inst.push(im);
    }
    // conductors between the towers and off to the horizon (attachment points as in Pylon.js)
    const ARMS = [{ y: 40.6, len: 6.4 }, { y: 47.4, len: 7.2 }, { y: 54.4, len: 6.4 }];
    const hw = (y) => (y <= 30 ? 5.2 - 3.2 * (y / 30) : 2.0 - (y - 30) * 0.022);
    const local = [];
    for (const { y, len } of ARMS) for (const sx of [-1, 1]) local.push(V3(sx * (hw(y) + len), y - 3.4, 0));
    const pts = mats.map((m4) => local.map((p) => p.clone().applyMatrix4(m4)));
    const seg = [];
    const wire = (a, b, sag) => { let prev = a; for (let k = 1; k <= 24; k++) { const t = k / 24, p = a.clone().lerp(b, t); p.y -= 4 * sag * t * (1 - t); seg.push(prev.x, prev.y, prev.z, p.x, p.y, p.z); prev = p; } };
    const span = (A, Bp, sag) => A.forEach((p, k) => wire(p, Bp[k], sag));
    span(pts[0], pts[1], 4.5); span(pts[0], pts[2], 2.6);
    span(pts[1], pts[1].map((p) => V3(p.x + 22, p.y - 4, p.z + 140)), 5);
    span(pts[2], pts[2].map((p) => V3(p.x - 18, p.y - 4, p.z - 140)), 5);
    const lg = this.mine(new THREE.BufferGeometry());
    lg.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
    lg.computeBoundingSphere();
    this.group.add(new THREE.LineSegments(lg, this.mine(farFog(new THREE.LineBasicMaterial({ color: 0x2a2c30 }), 'pwire', 0.6))));
    // its shadow: a long tapering strip
    this.shadowStrip(PYLONS[0].x, PYLONS[0].z, 58, 7, 1.0);
    // the fence and the plates round the main one's footing
    const B = this.B, m = this.town.m, T = PYLONS[0];
    for (const [ax, az, bx, bz] of [[-8, -8, 8, -8], [8, -8, 8, 8], [8, 8, -8, 8], [-8, 8, -8, -8]]) {
      const len = Math.hypot(bx - ax, bz - az);
      for (let k = 0; k <= 6; k++) B.box(m.found, 0.1, 2.2, 0.1, T.x + ax + (bx - ax) * k / 6, GROUND, T.z + az + (bz - az) * k / 6, { tint: 0x6a7a6a });
      B.push(T.x + (ax + bx) / 2, GROUND + 0.05, T.z + (az + bz) / 2, -Math.atan2(bz - az, bx - ax));
      B.quad(this.town.fenceMeshM(), len, 2.0, 0, 0, 0, { tint: 0x7a8a7a });
      B.pop();
    }
  }

  // ---------------------------------------------------------------- trees: cedar windbreaks, groves hiding the track's ends
  buildTrees() {
    const spots = [];
    const clump = (cx, cz, n, rx, rz, seed) => { for (let i = 0; i < n; i++) spots.push([cx + (hash2(i, seed) - 0.5) * rx, cz + (hash2(seed, i) - 0.5) * rz, 1.4 + hash2(i + 7, seed) * 0.9]); };
    for (const H of HOUSES) {
      // igune: the cedar windbreak on the house's back and west side
      const back = [H.x - Math.sin(H.ry) * (H.d / 2 + 3), H.z - Math.cos(H.ry) * (H.d / 2 + 3)];
      clump(back[0], back[1], 14, H.w + 6, 5, H.x);
      clump(H.x - H.w / 2 - 3, H.z, 6, 5, H.d, H.z);
    }
    clump(TRACK_X, 178, 26, 26, 30, 3); clump(TRACK_X, 396, 22, 26, 18, 5);
    clump(EMB.x1 + 6, 175, 14, 14, 40, 7); clump(EMB.x1 + 6, 392, 12, 14, 20, 9);
    clump(1085, 255, 10, 20, 14, 11); clump(640, 395, 10, 30, 10, 13); clump(820, 160, 12, 40, 10, 15);
    // keep them off the roads and the paddies
    const ok = spots.filter(([x, z]) => this.main.nearest(x, z, {}).dist > 7 && this.spur.nearest(x, z, {}).dist > 6 && !this.inPaddy(x, z) && Math.abs(x - TRACK_X) > 4.5);
    this.cedars = ok;
    let geo = this.treeSrc?.geometry, mat = this.treeSrc?.material;
    if (!geo) return;
    const im = new THREE.InstancedMesh(geo, mat, ok.length);
    im.name = 'cedars';
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = V3(), col = new THREE.Color();
    ok.forEach(([x, z, k], i) => {
      q.setFromAxisAngle(V3(0, 1, 0), hash2(x, z) * 6);
      im.setMatrixAt(i, m4.compose(V3(x, GROUND, z), q, s.set(k, k * (1.25 + hash2(z, x) * 0.4), k)));
      im.setColorAt(i, col.setRGB(0.62, 0.7, 0.62).multiplyScalar(0.8 + hash2(i, 3) * 0.3));
      if (this.main.nearest(x, z, {}).dist < 24) this.shadowTree(x, z, 1.3 * k, 5.6 * k * 1.45);
    });
    im.computeBoundingSphere();
    this.group.add(im); this.own.inst.push(im);
  }

  // ---------------------------------------------------------------- the single-track line and its crossing panel
  buildRail() {
    const B = this.B, m = this.town.m, z0 = 156, z1 = 398;
    B.box(m.ballast, 3.4, 0.45, z1 - z0, TRACK_X, GROUND, (z0 + z1) / 2, { tint: 0xc8c0b4 });
    const yR = 0.0;
    for (let z = z0 + 0.3; z < z1; z += 0.62) {
      if (Math.abs(z - this.crossZ()) < 3.3) continue;
      B.box(m.found, 2.2, 0.12, 0.22, TRACK_X, yR - 0.1, z, { tint: 0x6a5a4a });
    }
    for (const sx of [-0.535, 0.535]) B.box(m.found, 0.07, 0.13, z1 - z0, TRACK_X + sx, yR, (z0 + z1) / 2, { tint: 0x8a8682 });
    // the crossing panel (rubber / concrete between and beside the rails)
    B.box(m.conc, 3.4, 0.12, 6.2, TRACK_X, -0.1, this.crossZ(), { tint: 0x8a8884 });
  }
  crossZ() { return this.main.at(this.S.crossing, 0, {}).z; }

  // ---------------------------------------------------------------- the main line embankment, the underpass, the town beyond
  buildEmbankment() {
    const B = this.B, m = this.town.m, cz = 334, open = 3.6, y0 = DIP.y, H = 3.8, top = EMB.top;
    const xc = (EMB.x0 + EMB.x1) / 2, hb = (EMB.x1 - EMB.x0) / 2, ht = 4.5;
    const hwAt = (y) => hb - (hb - ht) * ((y - GROUND) / (top - GROUND));
    const yCut = y0 + H + 0.4, hc = hwAt(yCut), mid = 5.6;
    // grass slopes either side of the underpass; over it only the part above the headwalls
    const earth = (za, zb, yb, hwb) => this.extrude(B, m.grass, m.kenchi, [[xc - hwb, yb], [xc + hwb, yb], [xc + ht, top], [xc - ht, top]], za, zb, 0x8a9a5a, 0xb8b0a0);
    earth(150, cz - mid, GROUND, hb); earth(cz + mid, 400, GROUND, hb);
    earth(cz - mid, cz + mid, yCut, hc);
    // the top: ballast and the double track
    B.box(m.ballast, 9, 0.5, 250, xc, top, 275, { tint: 0xc8c0b4 });
    for (const tx of [-1.8, 1.8]) for (const sx of [-0.535, 0.535]) B.box(m.found, 0.07, 0.14, 250, xc + tx + sx, top + 0.5, 275, { tint: 0x8a8682 });
    // headwalls at both portals, with the opening; a lintel over it
    for (const px of [xc - hc, xc + hc]) {
      for (const sz of [-1, 1]) B.box(m.conc, 0.7, yCut - y0 + 0.3, mid - open, px, y0 - 0.1, cz + sz * (open + (mid - open) / 2), { tint: 0xb8b2a8 });
      B.box(m.conc, 0.7, yCut - (y0 + H) + 0.3, open * 2, px, y0 + H, cz, { tint: 0xb0aaa0 });
    }
    // inside: black (the light doesn't reach; the cut to the lane happens in here)
    const L = 2 * hc - 0.7;
    B.box(this.town.G, L, 0.02, open * 2, xc, y0 + 0.03, cz, { tint: 0x000000 });
    for (const sz of [-1, 1]) B.box(this.town.G, L, H, 0.02, xc, y0, cz + sz * (open - 0.02), { tint: 0x000000 });
    B.box(this.town.G, L, 0.02, open * 2, xc, y0 + H - 0.02, cz, { tint: 0x000000 });
    // the cutting down to it: concrete retaining walls, grass on top, a pipe railing
    for (const sz of [-1, 1]) {
      const za = sz < 0 ? CUT.z0 : cz + 3.35, zb = sz < 0 ? cz - 3.35 : CUT.z1;
      B.box(m.conc, CUT.x1 - (xc + hc), GROUND - y0 + 0.1, zb - za, (CUT.x1 + xc + hc) / 2, y0 - 0.1, (za + zb) / 2, { tint: 0xb8b4aa });
      B.box(m.conc, xc - hc - CUT.x0, GROUND - y0 + 0.1, zb - za, (CUT.x0 + xc - hc) / 2, y0 - 0.1, (za + zb) / 2, { tint: 0xb8b4aa });
      B.box(m.grass, CUT.x1 - CUT.x0, 0.02, zb - za, (CUT.x0 + CUT.x1) / 2, GROUND + 0.002, (za + zb) / 2, { tint: 0x8a9a5a });
      const rz = cz + sz * 3.45;
      for (let x = xc + hc + 1; x < DIP.x0 + 2; x += 2.5) B.box(m.found, 0.06, 0.9, 0.06, x, GROUND, rz, { tint: 0xd8d8d0 });
      B.box(m.found, DIP.x0 + 2 - (xc + hc + 1), 0.06, 0.06, (DIP.x0 + 2 + xc + hc + 1) / 2, GROUND + 0.86, rz, { tint: 0xe8e8e0 });
    }
    // the welcome board over the east portal, a height-limit plate
    this.signQuad('welcome', 6.4, 1.45, xc + hc + 0.4, yCut + 0.1, cz, Math.PI / 2);
    B.push(xc + hc + 0.37, y0 + H - 0.65, cz + open + 1.0, Math.PI / 2);
    this.town.signInto(B, 'danger', 0.4, 0.55, 0, 0, 0, {});
    B.pop();
    // the town beyond: rooftops over the embankment, a chimney, a water tower
    for (let i = 0; i < 26; i++) {
      const x = 306 + hash2(i, 1) * 36, z = 160 + i * 9.4 + hash2(i, 2) * 4, w = 5 + hash2(i, 3) * 6, h = 6 + hash2(i, 4) * 9;
      B.box(m.wallGrey, w, h, 6, x, GROUND, z, { tint: [0xc8c4b8, 0xb8bcc0, 0xd8ccb8][i % 3] });
      B.box(i % 2 ? m.roofIbushi : m.roofMetalB, w + 0.6, 0.4, 6.6, x, GROUND + h, z, { tint: 0xffffff });
    }
    B.box(m.found, 0.8, 22, 0.8, 318, GROUND, 250, { tint: 0xc8a8a0 });
    B.box(m.found, 4, 3, 4, 330, 14, 300, { tint: 0xb8c0c8 });
    for (const sx of [-1.4, 1.4]) for (const sz of [-1.4, 1.4]) B.box(m.found, 0.2, 14.4, 0.2, 330 + sx, GROUND, 300 + sz, { tint: 0x8a8e92 });
  }

  /** A prism along z from za to zb with cross-section poly ([x, y] ccw seen from +z): sides in mat, end caps in capMat. */
  extrude(B, mat, capMat, poly, za, zb, tint, capTint) {
    const P = [], N = [], U = [], I = [];
    const n = poly.length;
    for (let i = 0; i < n; i++) {
      const [x0, y0] = poly[i], [x1, y1] = poly[(i + 1) % n];
      const ex = x1 - x0, ey = y1 - y0, l = Math.hypot(ex, ey) || 1, nx = ey / l, ny = -ex / l;
      if (ny < -0.5) continue; // no bottom
      const b = P.length / 3;
      P.push(x0, y0, za, x1, y1, za, x1, y1, zb, x0, y0, zb);
      for (let k = 0; k < 4; k++) N.push(nx, ny, 0);
      U.push(0, za, l, za, l, zb, 0, zb);
      I.push(b, b + 2, b + 1, b, b + 3, b + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    g.setIndex(I);
    B.geo(mat, g, { tint });
    // caps: fan triangles of the (convex) cross-section at both ends
    for (const [z, sz] of [[za, -1], [zb, 1]]) {
      const c = new THREE.BufferGeometry(), cp = [], cn = [], cu = [], ci = [];
      for (const [x, y] of poly) { cp.push(x, y, z); cn.push(0, 0, sz); cu.push(x, y); }
      for (let i = 1; i + 1 < n; i++) { if (sz > 0) ci.push(0, i, i + 1); else ci.push(0, i + 1, i); }
      c.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
      c.setAttribute('normal', new THREE.Float32BufferAttribute(cn, 3));
      c.setAttribute('uv', new THREE.Float32BufferAttribute(cu, 2));
      c.setIndex(ci);
      B.geo(capMat, c, { tint: capTint });
    }
  }

  // ---------------------------------------------------------------- signs
  /** A quad from the drive's sign atlas into the main batch (world position, facing +z after ry). */
  signQuad(key, w, h, x, y, z, ry, glow = false) { this.B.push(x, y, z, ry); this.signQuadB(this.B, key, w, h, 0, 0, 0, 0, glow); this.B.pop(); }
  signQuadB(B, key, w, h, x, y, z, ry, glow) {
    const [u0, v0, u1, v1] = this.atlas.uv(key);
    const g = new THREE.PlaneGeometry(w, h);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) ? u1 : u0, uv.getY(i) ? v1 : v0);
    if (ry) g.rotateY(ry);
    g.translate(x, y + h / 2, z);
    if (!this.signM) {
      this.signM = this.mine(new THREE.MeshStandardMaterial({ map: this.atlas.tex, vertexColors: true, roughness: 0.7, alphaTest: 0.5, side: THREE.DoubleSide }));
      this.signG = this.mine(new THREE.MeshBasicMaterial({ map: this.atlas.tex, vertexColors: true, alphaTest: 0.5 }));
      this.signG.color.setScalar(1.15);
    }
    B.geo(glow ? this.signG : this.signM, g, {});
  }
  buildSigns() {
    const B = this.B, m = this.town.m;
    const board = (key, w, h, s, d, lift = 1.3, face = 0) => {
      const p = this.main.at(s, d, {});
      const ry = p.heading + Math.PI + face;
      B.push(p.x, p.y, p.z, ry);
      for (const sx of [-1, 1]) B.box(m.boardL, 0.1, lift + h * 0.6 - (GROUND - p.y), 0.1, sx * (w / 2 - 0.15), GROUND - p.y, -0.06, { tint: 0x6a5238 });
      this.signQuadB(B, key, w, h, 0, lift, 0, 0, false);
      B.pop();
      this.shadowStrip(p.x, p.z, lift + h, 0.15, w * 0.9);
    };
    board('morio2km', 1.9, 0.66, this.S.sign2km, 4.0);
    board('morioLeft', 1.8, 0.9, this.S.junction - 26, 4.0);
    board('xingAhead', 0.8, 0.8, this.S.xingSign, 3.9, 1.6);
    board('slow', 0.7, 0.7, this.S.crossing - 30, 3.9, 1.4);
    board('kanban', 1.6, 1.0, this.S.farm1 + 6, -4.2, 0.9);
    // dead end ahead, at the mouth of the spur
    const de = this.spur.at(10, -3.6, {});
    B.push(de.x, 0, de.z, de.heading + Math.PI); B.box(m.found, 0.07, 2.0, 0.07, 0, 0, -0.05, { tint: 0xc8c8c8 }); this.signQuadB(B, 'deadEnd', 0.6, 0.6, 0, 1.5, 0, 0, false); B.pop();
    // 止まれ at the crossing, both ways
    for (const [ds, d, flip] of [[9, 3.6, 0], [-9, -3.6, Math.PI]]) {
      const p = this.main.at(this.S.crossing + ds, d, {});
      B.push(p.x, 0, p.z, p.heading + Math.PI + flip); B.box(m.found, 0.07, 2.0, 0.07, 0, 0, -0.05, { tint: 0xc8c8c8 }); this.signQuadB(B, 'tomareSign', 0.7, 0.62, 0, 1.6, 0, 0, false); B.pop();
    }
    // white guardrails along the bends (posts every 2 m, a W-beam)
    const rail = (r, s0, s1, d) => {
      const a = {}, b = {};
      for (let s = s0; s < s1; s += 2) {
        r.at(s, d, a); r.at(Math.min(s1, s + 2), d, b);
        B.box(m.found, 0.12, 0.75, 0.12, a.x, a.y - 0.05, a.z, { tint: 0xd8d8d0 });
        const len = Math.hypot(b.x - a.x, b.z - a.z);
        B.push((a.x + b.x) / 2, a.y + 0.45, (a.z + b.z) / 2, Math.atan2(b.x - a.x, b.z - a.z));
        B.box(m.found, 0.05, 0.32, len + 0.02, 0, 0, 0, { tint: 0xf0f0e8 });
        B.pop();
      }
    };
    rail(this.main, this.S.junction + 4, this.S.junction + 60, -3.15);
    rail(this.main, this.S.crossing - 60, this.S.crossing - 12, -3.15);
    rail(this.spur, 12, this.spur.length - 8, 2.9);
  }

  // ---------------------------------------------------------------- the level crossing
  buildCrossing() {
    const B = this.town.batch(), m = this.town.m, cz = this.crossZ(), g = new THREE.Group();
    g.name = 'drive-crossing';
    const lamps = [], arms = [];
    // one post on the left of each approach: (x, z) of the post, the arm reaches across towards -dir
    const posts = [{ x: TRACK_X + 6.2, z: cz + 3.7, dir: -1, ry: Math.PI / 2 }, { x: TRACK_X - 6.2, z: cz - 3.9, dir: 1, ry: -Math.PI / 2 }];
    const lampOn = this.mine(new THREE.MeshBasicMaterial({ color: 0xff3020 })), lampOff = this.mine(new THREE.MeshStandardMaterial({ color: 0x3a1a18, roughness: 0.4 }));
    for (const P of posts) {
      B.push(P.x, 0, P.z, P.ry);
      B.box(m.hazard, 0.16, 3.4, 0.16, 0, 0, 0, { tint: 0xffffff, unit: true });
      // the crossbuck (yellow / black X), the bell box on top
      for (const a of [0.7, -0.7]) B.box(m.hazard, 1.2, 0.18, 0.04, 0, 2.95, 0.1, { rz: a, tint: 0xffffff });
      B.box(m.found, 0.3, 0.3, 0.3, 0, 3.45, 0, { tint: 0x2a2a2a });
      // the lamp bar with two hooded red lamps (lit / dark meshes switched)
      B.box(m.found, 1.2, 0.12, 0.08, 0, 2.15, 0.1, { tint: 0x1a1a1a });
      for (const sx of [-1, 1]) { B.box(m.found, 0.32, 0.32, 0.1, sx * 0.5, 2.0, 0.12, { tint: 0x111111 }); B.box(m.found, 0.34, 0.06, 0.18, sx * 0.5, 2.32, 0.2, { tint: 0x111111 }); }
      // the barrier machine at the foot
      B.box(m.hazard, 0.5, 1.0, 0.5, -0.45 * P.dir, 0, -0.35, { tint: 0xffffff });
      B.pop();
      for (const sx of [-1, 1]) {
        for (const lit of [true, false]) {
          const box = new THREE.Mesh(this.mine(new THREE.BoxGeometry(0.24, 0.24, 0.04)), lit ? lampOn : lampOff);
          box.position.set(P.x + Math.cos(P.ry) * sx * 0.5 + Math.sin(P.ry) * 0.19, 2.16, P.z - Math.sin(P.ry) * sx * 0.5 + Math.cos(P.ry) * 0.19);
          box.rotation.y = P.ry;
          box.visible = !lit;
          g.add(box);
          lamps.push({ mesh: box, lit, side: sx });
        }
      }
      // the barrier arm: yellow / black, pivoting at the machine; up = vertical
      const pivot = new THREE.Group();
      const px = P.x + Math.sin(P.ry) * -0.35 + Math.cos(P.ry) * (-0.45 * P.dir), pz = P.z + Math.cos(P.ry) * -0.35 - Math.sin(P.ry) * (-0.45 * P.dir);
      pivot.position.set(px, 0.85, pz);
      const armLen = 6.6;
      const ag = this.mine(new THREE.BoxGeometry(armLen, 0.1, 0.06));
      ag.translate(armLen / 2, 0, 0);
      ag.setAttribute('color', new THREE.Float32BufferAttribute(new Array(ag.attributes.position.count * 3).fill(1), 3)); // (town materials read vertex colours)
      const uv = ag.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * armLen * 1.6, uv.getY(i) * 0.25);
      const arm = new THREE.Mesh(ag, m.hazard);
      const holder = new THREE.Group();
      holder.rotation.y = P.dir > 0 ? -Math.PI / 2 : Math.PI / 2; // the arm reaches across the road (towards -z for the east post)
      holder.add(arm);
      pivot.add(holder);
      pivot.userData.moves = true; holder.userData.moves = true; arm.userData.moves = true;
      g.add(pivot);
      arms.push({ pivot, arm, holder, P, len: armLen, x: px, z: pz });
    }
    B.build(g, { receive: true });
    this.group.add(g);
    const X = { g, lamps, arms, state: 'idle', t: 0, k: 1, blink: 0, bell: null, cz };
    this.setArms(X, 1);
    return X;
  }
  /** Barrier arms: k = 1 up (vertical), 0 down (across the road). */
  setArms(X, k) {
    X.k = k;
    for (const A of X.arms) {
      // raise about the arm's own horizontal axis (perpendicular to its length)
      A.arm.rotation.z = k * Math.PI * 0.47;
    }
  }

  // ---------------------------------------------------------------- the train
  buildTrain() {
    const { side, front } = trainTextures();
    this.mine(side); this.mine(front);
    const sideM = this.mine(new THREE.MeshStandardMaterial({ map: side, roughness: 0.45, metalness: 0.1 }));
    const frontM = this.mine(new THREE.MeshStandardMaterial({ map: front, roughness: 0.45, metalness: 0.1 }));
    const B = this.town.batch(), m = this.town.m, CAR = 20, W = 2.9, H = 3.0, y0 = 1.05, GAP = 0.6;
    const g = new THREE.Group();
    g.name = 'drive-train';
    for (let i = 0; i < 2; i++) {
      const cz = (i - 0.5) * (CAR + GAP);
      B.push(0, 0, cz);
      for (const sx of [-1, 1]) B.quad(sideM, CAR, H, sx * W / 2, y0, 0, { ry: sx * Math.PI / 2, unit: true });
      const nose = i === 0 ? -1 : 1;
      B.quad(frontM, W, H, 0, y0, nose * CAR / 2, { ry: nose > 0 ? 0 : Math.PI });
      B.quad(m.found, W, H, 0, y0, -nose * CAR / 2, { ry: nose > 0 ? Math.PI : 0, tint: 0x9a968a });
      B.box(m.found, W - 0.1, 0.18, CAR - 0.1, 0, y0 + H, 0, { tint: 0x9aa0a6 });
      B.box(m.found, W - 0.7, 0.12, CAR - 0.8, 0, y0 + H + 0.18, 0, { tint: 0x8a9096 });
      for (const z of [-5, 5]) B.box(m.found, 0.9, 0.35, 1.4, 0, y0 + H + 0.18, z, { tint: 0x6a6e72 }); // radiators, exhaust
      B.box(m.found, 0.12, 0.6, 0.12, 0.6, y0 + H + 0.18, 2, { tint: 0x2a2a2a });
      B.box(m.found, W - 0.4, 0.5, CAR - 5, 0, y0 - 0.5, 0, { tint: 0x2a2c2e }); // underfloor engine / tanks
      for (const z of [-CAR / 2 + 2.6, CAR / 2 - 2.6]) {
        B.box(m.found, 2.3, 0.5, 2.6, 0, 0.18, z, { tint: 0x222426 });
        for (const wz of [-0.95, 0.95]) for (const wx of [-0.72, 0.72]) B.box(m.found, 0.14, 0.62, 0.62, wx, 0.04, z + wz, { tint: 0x3a3a3a });
      }
      // headlights lit at the leading end
      for (const hx of [-0.95, 0.95]) B.box(this.town.G, 0.26, 0.16, 0.04, hx, y0 + 0.62, nose * (CAR / 2 + 0.02), { tint: 0xfff4d0 });
      B.pop();
    }
    B.build(g, { receive: true });
    g.visible = false;
    g.userData.moves = true;
    this.group.add(g);
    return { g, len: 2 * CAR + GAP, z: -999, speed: 15.5, state: 'wait', sound: null, horn: false, CAR, W };
  }

  // ---------------------------------------------------------------- per frame
  /** ctx: { x, z, s (along the main road), v, heading, camera } */
  update(dt, ctx) {
    this.t += dt;
    if (this.water) this.water.userData.u.uTime.value = this.t;
    const cam = this.game.camera;
    this.horizon.position.set(cam.position.x, 0, cam.position.z);
    this.obstacles.length = 0;
    this.updateCrossing(dt, ctx);
    this.updateTrucks(dt, ctx);
    // moving shadows: the trucks, the train (the van's is drawn by the drive)
    this.dyn.begin();
    const hAt = (x, z) => this.heightAt(x, z);
    for (const T of this.trucks) if (T.mesh.visible) this.dyn.box(T.mesh.matrixWorld, TRUCK.width / 2, 0.2, TRUCK.height, -TRUCK.len / 2, TRUCK.len / 2, this.sun, hAt);
    if (this.train.g.visible) this.dyn.box(this.train.g.matrixWorld, this.train.W / 2, 0.4, 4.2, -this.train.len / 2, this.train.len / 2, this.sun, hAt, 3);
    if (ctx.vanMatrix) this.dyn.box(ctx.vanMatrix, 0.74, 0.25, 1.95, -1.72, 1.72, this.sun, hAt, 1.2);
    this.dyn.end();
  }

  updateCrossing(dt, ctx) {
    const X = this.crossing, T = this.train, sx = this.S.crossing;
    X.t += dt;
    const ahead = sx - ctx.s; // metres to the crossing
    if (X.state === 'idle' && ahead < 135 && ahead > 12) { X.state = 'warn'; X.t = 0; T.state = 'run'; T.z = 150; T.horn = false; }
    const ringing = X.state === 'warn' || X.state === 'down' || X.state === 'clear';
    if (ringing) {
      X.blink += dt;
      const on = Math.floor(X.blink / 0.5) % 2;
      for (const L of X.lamps) L.mesh.visible = L.lit ? (L.side > 0) === !!on : (L.side > 0) !== !!on;
      if (!X.bell && audio.ready) { X.bell = moving('drvBells', { ref: 6, rolloff: 1.1 }); X.bell?.at(TRACK_X + 6, 3.4, X.cz + 3.7); X.bell?.set(0.9, 0.05); }
    } else {
      for (const L of X.lamps) L.mesh.visible = !L.lit;
      if (X.bell) { X.bell.stop(0.4); X.bell = null; }
    }
    if (X.state === 'warn') {
      if (X.t > 1.4) this.setArms(X, Math.max(0, 1 - (X.t - 1.4) / 4.2));
      if (X.k <= 0) X.state = 'down';
    }
    // the train: comes from the north (z ≈ 150) and runs south over the crossing
    if (T.state === 'run') {
      const onCrossing = Math.abs(ctx.s - sx) < 4.5;
      const head = T.z + T.len / 2;
      // never into a van stopped on the rails: it waits back up the line
      const hold = onCrossing && head > X.cz - 40 && head < X.cz;
      if (!hold && (X.state === 'down' || head < X.cz - 60)) T.z += T.speed * dt;
      T.g.position.set(TRACK_X, 0, T.z);
      T.g.visible = T.z + T.len / 2 > 182 && T.z - T.len / 2 < 392;
      if (!T.sound && audio.ready) { T.sound = moving('drvTrain', { ref: 9, rolloff: 1.0 }); T.sound?.set(0.85, 0.5); }
      T.sound?.at(TRACK_X, 2, T.z);
      if (!T.horn && head > X.cz - 120) { T.horn = true; audio.play('drvTrainHorn', { pos: V3(TRACK_X, 3, head), ref: 14, vol: 1 }); }
      // the cars are something to bump into while they're near the road
      if (Math.abs(T.z - X.cz) < T.len / 2 + 4) for (let z = T.z - T.len / 2; z <= T.z + T.len / 2; z += 1.6) this.obstacles.push({ x: TRACK_X, z, r: 1.5, kind: 'train' });
      if (T.z - T.len / 2 > X.cz + 6 && X.state === 'down') { X.state = 'clear'; X.t = 0; }
      if (T.z - T.len / 2 > 395) { T.state = 'gone'; T.g.visible = false; T.sound?.stop(1.5); T.sound = null; }
    }
    if (X.state === 'clear') {
      if (X.t > 1.2) this.setArms(X, Math.min(1, (X.t - 1.2) / 3.2));
      if (X.k >= 1) { X.state = 'done'; }
    }
    // the arms, while they are down far enough to stop you
    if (X.k < 0.55) for (const A of X.arms) {
      const across = A.P.dir; // the arm reaches -z (east post) or +z (west post)
      for (let d = 0.6; d < A.len * 0.88; d += 0.5) this.obstacles.push({ x: A.x, z: A.z + across * d, r: 0.3, kind: 'barrier' });
    }
    X.g.updateMatrixWorld(true);
  }

  // ---------------------------------------------------------------- oncoming kei trucks
  updateTrucks(dt, ctx) {
    for (const P of this.truckPlan) {
      if (P.done || ctx.s < P.at) continue;
      P.done = true;
      const s = ctx.s + P.spawn;
      if (s > this.S.portal - 10) continue;
      const mesh = new THREE.Mesh(keiTruckGeometry(P.variant), voxelMaterials('normal'));
      mesh.userData.moves = true;
      this.group.add(mesh);
      this.trucks.push({ mesh, s, d: -1.45, v: 9.5, vt: 9.5, honk: 0, sound: null, wait: 0 });
    }
    const pt = {};
    for (const T of this.trucks) {
      if (!T.mesh.visible) continue;
      // keep to its own left (your right); if you're in its way it squeezes over, slows and stops, and honks
      const gap = T.s - ctx.s; // > 0: it's ahead of you
      const lat = Math.abs(ctx.d - T.d);
      let want = 9.5;
      if (gap > 0 && gap < 26 && lat < 2.2) { want = Math.max(0, (gap - 5.5) * 0.8); T.d += (-2.05 - T.d) * Math.min(1, dt * 1.5); if (gap < 18 && T.honk <= 0 && Math.abs(ctx.v) > 0.5) { T.honk = 4; audio.play('drvHorn', { pos: this.main.at(T.s, T.d, pt), ref: 6 }); this.onHonk?.(); } }
      else T.d += (-1.45 - T.d) * Math.min(1, dt * 0.8);
      T.honk -= dt;
      T.v += Math.max(-6 * dt, Math.min(2 * dt, want - T.v));
      T.s -= T.v * dt;
      this.main.at(T.s, T.d, pt);
      T.mesh.position.set(pt.x, pt.y, pt.z);
      T.mesh.rotation.set(0, pt.heading + Math.PI, 0);
      T.mesh.updateMatrixWorld();
      if (!T.sound && audio.ready) { T.sound = moving('drvTruck', { ref: 4, rolloff: 1.2 }); T.sound?.set(0.7, 0.3); }
      T.sound?.at(pt.x, 1, pt.z);
      if (T.sound?.h?.osc) T.sound.h.osc.frequency.value = 40 + T.v * 4;
      const fx = Math.sin(pt.heading + Math.PI), fz = Math.cos(pt.heading + Math.PI);
      for (const k of [-1.1, 0, 1.1]) this.obstacles.push({ x: pt.x + fx * k, z: pt.z + fz * k, r: 0.78, kind: 'truck' });
      if (T.s < ctx.s - 90 || T.s < 6) { T.mesh.visible = false; T.sound?.stop(0.8); T.sound = null; }
    }
  }

  // ---------------------------------------------------------------- teardown
  dispose() {
    const X = this.crossing, T = this.train;
    X?.bell?.stop(0.2); T?.sound?.stop(0.2);
    for (const tr of this.trucks || []) tr.sound?.stop(0.2);
    this.group.parent?.remove(this.group);
    // geometry / materials / textures made for the zone (the town's shared materials, prop and tower meshes stay)
    const shared = new Set();
    for (const id of ['bus_stop', 'jizo_shrine', 'cone', 'sakura_tree', 'vending']) { const g = propGeometry(id); if (g) shared.add(g); }
    for (const o of this.town.pylon?.group?.children || []) if (o.geometry) shared.add(o.geometry);
    this.group.traverse((o) => {
      if (o.geometry && !shared.has(o.geometry)) o.geometry.dispose();
    });
    for (const im of this.own.inst) im.dispose();
    for (const g of this.own.geo) g.dispose();
    for (const m of this.own.mat) m.dispose();
    for (const t of this.own.tex) t.dispose();
    this.dyn?.dispose();
    disposeTrucks();
    this.group.clear();
  }
}

