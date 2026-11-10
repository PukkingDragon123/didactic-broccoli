// The town outside the garage: a Shōwa back lane in a provincial city (spring 1999) running between two railway
// underpasses, modelled low-poly from real construction and painted in cartoon textures: the neighbours' houses
// (src/world/Neighbours.js on src/town/house.js, rooms behind the windows from src/world/interiors.js), block walls
// and gates (src/town/walls.js), the road with its gutters, lids and paint (src/town/street.js), concrete utility
// poles and the wire tangle (src/town/poles.js), the girder bridges and embankments (src/town/bridge.js), the
// commuter train (src/town/train.js), the corner shop MIKAWA-YA (src/world/CornerShop.js), the park, back street and
// villa (src/world/Park.js), the sky and the roofscape skyline (src/town/sky.js), the steel pylon on its hill
// (src/world/Pylon.js), the neighbourhood's signs and seasonal things (src/town/japan.js), posters (LanePosters.js).
//
// Layout (metres, src/town/layout.js): the garage is x∈[-4,4], z∈[-5,5]; the lane runs along x in front of it. Near
// building line z=5.3, road z≈6.1..13.35, far building line z=14.9. Underpass mouths at x=±26 (opening z∈[6.6,12.6],
// clearance 3.4 m); the walkable lane ends 2.5 m inside each (x=±28.5); the underpasses run to x=±36.
// Alley A1 (x∈[-9.4,-7.45], beside Mikawa-ya) is the ghost alley (src/world/GhostAlley.js); alley A2 (x∈[9.8,11.3],
// between NE1 and NE2) is the passage to the park.
//
// Contracts:
//   town.setShopOpen(open)  open = the OPEN plate, bench and twin gacha out front; closed = weeds and a taped notice.
//   town.setLanterns(on)    the lanterns under the eave on / off; writing town.shopOpen = bool also sets them
//                           (town.shopOpen / town.lanternsOn are what the garage's own front reads).
//   town.shop = { openG, closedG, lanternM, glow, obs }   town.openPlate (the painted OPEN plate on the right pier)
//   town.tunnels = [{ x, z, dir, mouth }]   town.lanes = [{ z, x0, x1 }]   town.spawnPoints = [Vector3]
//   town.cornerShop = { counter, keeper, inside, door, seat, stock, tv, ... }   (src/world/CornerShop.js)
//   town.garbageStation     Object3D of the neighbourhood garbage station (x≈-6.6, z≈5.8; src/life/trash.js swaps it)
//   town.doors = [{ id, house, family, pos, gate, bell, rotY, side, unit?, atDoor?, knockOnly? }]  (Neighbours.js)
//   town.spots = { name: { pos, rotY, seat?, note } }   town.paths = { park: [Vector3...], villa: [...] }
//   town.park = { spots, route, bounds, entrance, gate }   town.pylon = { group, main: { x, z, base } }
//   town.update(dt, t)      trains (+ sound), the window rooms, zones and instanced-prop culling (from Garage.update)
//   town.runTrain(side?, dir?)   town.trains   town.applySky(look)
//   town.B / town.batch() (a static batcher, src/town/batch.js), town.m (materials by name), town.P(rough, metal),
//   town.indoor(mat), town.indoorVoxel(), town.sign(key, x, y, z, o) / signInto(batch, ...) (the trim atlas),
//   town.quadUV(mat, w, h, x, y, z, uvRect, o), town.puddle(x, z, w, d, ry), town.pool(x, z, r, colour, k).
import * as THREE from 'three';
import { propMesh, hasProp, propSize } from './props.js';
import { hash2 } from '../core/util.js';
import { audio } from '../core/audio.js';
import { installTunnelDarkness } from './tunnelDark.js';
import { buildCornerShop } from './CornerShop.js';
import { interiorMaterial, setInteriorSky } from './interiors.js';
import { buildNeighbours } from './Neighbours.js';
import { buildPark } from './Park.js';
import { buildPylon } from './Pylon.js';
import { buildLanePosters } from './LanePosters.js';
import { InstanceCuller } from './propCull.js';
import { Batch } from '../town/batch.js';
import { XT, XE, XW, TZ0, TZ1, YE, LANE_Z, shadeAt } from '../town/layout.js';
import { makeMats } from '../town/mats.js';
import { house } from '../town/house.js';
import { blockWall, woodFence, gate, yard } from '../town/walls.js';
import { buildGround, buildDressing, buildDetails, buildBounds } from '../town/street.js';
import { buildPoles } from '../town/poles.js';
import { buildUnderpasses } from '../town/bridge.js';
import { buildTrains, updateTrains, runTrain } from '../town/train.js';
import { buildSky, buildBackdrop, applySkyLook, midrise } from '../town/sky.js';
import { buildFront } from '../town/front.js';
import { buildJapan } from '../town/japan.js';

// pitch-black underpasses: everything inside fades to black a few metres past the portal (see tunnelDark.js);
// installed at import time so it is in place before any material is compiled
installTunnelDarkness({ x0: XT + 0.1, x1: XE + 1.5, z0: TZ0 - 0.35, z1: TZ1 + 0.35, y1: YE - 0.2, k: 1.0, d0: 3.2, d1: 6.0, fog: 0.3 });

// props that stay drawn even when built inside a zone
const ZONE_ALWAYS = new Set(['street_light']);
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);

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

  // ---------------------------------------------------------------- props (the prop library, instanced)
  /** Queue an instanced prop (static). o: block (player collision), dim (softer glow), scale, zone. */
  prop(id, x, y, z, ry = 0, o = {}) {
    if (!hasProp(id)) return null;
    const zone = o.zone ?? (this._zone && !ZONE_ALWAYS.has(id) ? this._zone : null);
    const key = id + (o.dim ? ':dim' : '') + (o.indoor ? ':in' : '') + (zone ? '@' + zone : '');
    if (!this.inst.has(key)) this.inst.set(key, { id, dim: o.dim, indoor: o.indoor, zone, list: [] });
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
  /** One InstancedMesh per prop part (whatever the library builds a prop from), culled per instance. */
  flushProps() {
    for (const { id, dim, indoor, zone, list } of this.inst.values()) {
      let src;
      try { src = propMesh(id, { castShadow: false }); } catch (e) { console.warn('Town: prop failed', id, e); continue; }
      src.updateMatrixWorld(true);
      const parts = [];
      src.traverse((o) => { if (o.isMesh && o.geometry) parts.push(o); });
      for (const part of parts) {
        let mat = part.material;
        const voxel = Array.isArray(mat) && mat.length === 5;
        if (voxel && indoor) mat = this.indoorVoxel(); else if (voxel && dim) mat = this.dimVoxel();
        else if (indoor) mat = Array.isArray(mat) ? mat.map((k) => this.indoor(k)) : this.indoor(mat);
        const im = new THREE.InstancedMesh(part.geometry, mat, list.length);
        list.forEach((it, i) => {
          _q.setFromAxisAngle(_up, it.ry);
          im.setMatrixAt(i, _m4.compose(_p.set(it.x, it.y, it.z), _q, _s.setScalar(it.s)).multiply(part.matrixWorld));
        });
        im.castShadow = false; im.receiveShadow = true;
        im.computeBoundingSphere();
        im.name = 'props:' + id;
        im.matrixAutoUpdate = false;
        (zone ? this.zoneGroup(zone) : this.group).add(im);
        (this.cull ||= new InstanceCuller()).add(im); // only the instances in view are drawn (src/world/propCull.js)
      }
    }
    this.inst.clear();
  }
  /** A group that is only drawn near where it can be seen (the park behind the near-side houses). */
  zoneGroup(name) {
    if (!this.zones) this.zones = {};
    if (!this.zones[name]) { const g = new THREE.Group(); g.name = 'zone:' + name; this.group.add(g); this.zones[name] = g; }
    return this.zones[name];
  }
  /** The park is hidden by the houses everywhere except in the A2 passage, the yards behind the near side and the lane
   *  at the passage's mouth. */
  updateZones() {
    const z = this.zones?.park;
    if (!z) return;
    const p = this.game.camera.position;
    z.visible = (p.z < 6.2 && p.x > 9.4) || (p.x > 7 && p.x < 14.5 && p.z < 10.5) || this.forceZones === true;
  }

  // ---------------------------------------------------------------- drawing helpers (in the batch's current frame)
  /** A fresh static batcher (merge per material, baked vertex colours); build(parent) when done. */
  batch(shade) { return new Batch(shade); }
  /** Vertical quad showing trim-atlas entry `key`, its bottom centre at (x, y, z). o: w / h (metres; default the
   *  entry's own size), ry, rz, tint, sub. */
  sign(key, x, y, z, o = {}) { return this.signInto(this.B, key, x, y, z, o); }
  signInto(B, key, x, y, z, o = {}) {
    const A = this.atlas.trim;
    let [w, h] = A.size(key);
    if (o.w) { h = o.h ?? (h * o.w) / w; w = o.w; } else if (o.h) { w = (w * o.h) / h; h = o.h; }
    return B.quadUV(this.tm, w, h, x, y, z, A.uv(key, o.sub), o);
  }
  /** Vertical decal (stains, cracks): bottom centre at (x, y, z). o: w, h, flip, tint, ry, cut (alpha-cut board). */
  decalQ(key, x, y, z, o = {}) {
    const A = this.atlas.decal, [u0, v0, u1, v1] = A.uv(key);
    let [w, h] = A.size(key);
    if (o.w) { h = o.h ?? (h * o.w) / w; w = o.w; }
    return this.B.quadUV(o.cut ? this.cut : this.dm, w, h, x, y, z, o.flip ? [u1, v0, u0, v1] : [u0, v0, u1, v1], o);
  }
  /** Decal lying on the ground (road paint, lids, cracks), centred on (x, z). o: w, d, ry, tint, y. */
  decalG(key, x, z, o = {}) {
    const A = this.atlas.decal;
    let [w, d] = A.size(key);
    if (o.w) { d = o.d ?? (d * o.w) / w; w = o.w; }
    return this.B.plane(this.dm, w, d, x, o.y ?? 0.004, z, { ...o, rect: A.uv(key) });
  }
  /** A row of ~1.2 m decals along local x at height y on a wall plane z. */
  decalRow(key, x0, x1, y, h, z, k = 1) {
    const n = Math.max(1, Math.round((x1 - x0) / 1.2)), w = (x1 - x0) / n;
    for (let i = 0; i < n; i++) { const c = x0 + (i + 0.5) * w; this.decalQ(key, c, y, z, { w, h, k, flip: hash2(Math.round(c * 7), Math.round(z * 3 + y * 5)) < 0.5 }); }
  }
  /** Vertical quad showing the uv rectangle [u0, v0, u1, v1] of any material's texture (LanePosters.js). */
  quadUV(mat, w, h, x, y, z, uv, o = {}, B = this.B) { return B.quadUV(mat, w, h, x, y, z, uv, o); }
  /** Square-section bar between two world points (guy wires, braces). */
  beam(mat, a, b, t, o = {}) { return this.B.beam(mat, [a.x, a.y, a.z], [b.x, b.y, b.z], t, o); }
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
  /** 傘立て: a little stand by the door with two or three umbrellas (local frame of the current batch). */
  umbrellaStand(x, y, z, seed = 0) {
    const B = this.B, m = this.m, cols = [0x3a4a7a, 0xe8808a, 0xf4f0e6, 0x4a7a4a, 0x2a2a2c, 0xffdc6a];
    B.cyl(m.metal, 0.1, 0.11, 0.36, x, y, z, { tint: 0x8a8e90, sides: 8, caps: 'b' });
    for (let i = 0; i < 3; i++) {
      const c = cols[Math.floor(hash2(seed + i, 11) * cols.length)], dx = (i - 1) * 0.045, lean = (i - 1) * 0.12;
      B.lathe(m.pv, [[0.012, 0], [0.035, 0.12], [0.03, 0.62], [0.008, 0.66]], x + dx, y + 0.08, z + (hash2(i, seed) - 0.5) * 0.05, { rz: -lean, tint: c, sides: 6 });
      B.tube(m.pv, [[x + dx + lean * 0.66, y + 0.73, z], [x + dx + lean * 0.8, y + 0.86, z], [x + dx + lean * 0.8 + 0.04, y + 0.88, z], [x + dx + lean * 0.8 + 0.06, y + 0.83, z]], 0.01, { tint: 0x4a3a2a, sides: 4 });
    }
  }
  /** Hang a small batch on a pivot so it sways in the wind: M = the pivot's world matrix (its x axis is the hinge
   *  unless o.axis = 'y'), o.ph (phase), o.amp. Laundry on its pole, carp streamers on theirs. */
  swing(C, M, o = {}) {
    const piv = new THREE.Group(), sw = new THREE.Group();
    piv.matrixAutoUpdate = false; piv.matrix.copy(M); piv.name = 'town:swing';
    piv.add(sw);
    if (!C.build(sw, { name: 'swing' }).length) return null;
    (this.B === this.Bpark ? this.zoneGroup('park') : this.group).add(piv);
    (this.swings ||= []).push({ o: sw, ph: (o.ph || 0) * 1.7, amp: o.amp ?? 1, axis: o.axis || 'x' });
    return sw;
  }
  /** Rain puddle on the ground: a wet satin patch that picks up the sky. */
  puddle(x, z, w, d, ry = 0) {
    if (!this._puddleM) {
      const mat = new THREE.MeshStandardMaterial({ map: this.atlas.decal.tex, roughness: 0.4, metalness: 0, alphaTest: 0.5, vertexColors: true, envMapIntensity: 0.3 });
      mat.polygonOffset = true; mat.polygonOffsetFactor = -3; mat.polygonOffsetUnits = -6;
      mat.onBeforeCompile = (sh) => {
        sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          float pFr = pow( 1.0 - clamp( dot( normalize( vViewPosition ), normal ), 0.0, 1.0 ), 5.0 );
          totalEmissiveRadiance += mix( vec3( 0.006, 0.007, 0.009 ), vec3( 0.085, 0.08, 0.07 ), pFr );`);
      };
      mat.customProgramCacheKey = () => 'puddle';
      mat.name = 'puddle';
      this._puddleM = mat;
    }
    this.B.plane(this._puddleM, w, d, x, 0.006, z, { rect: this.atlas.decal.uv('puddle'), ry });
  }
  /** A pool of lamplight on the ground (a smooth falloff, stronger after dark). */
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
    this.poolK = this.poolK || { value: 1 };
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
      uniforms: { uK: this.poolK },
      vertexShader: 'varying vec3 vC; varying vec2 vUv; void main(){ vUv = uv; vC = color; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform float uK; varying vec3 vC; varying vec2 vUv; void main(){ float d = length(vUv - 0.5) * 2.0; float a = smoothstep(1.0, 0.0, d); gl_FragColor = vec4(vC * a * a * 0.2 * uK, 1.0); }',
    });
    const P = [], C = [], U = [];
    for (const g of this._pools) { const ng = g.toNonIndexed(); P.push(...ng.attributes.position.array); C.push(...ng.attributes.color.array); U.push(...ng.attributes.uv.array); g.dispose(); ng.dispose(); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 2; mesh.name = 'town:pools';
    this.add(mesh);
    this._pools = [];
  }

  // ---------------------------------------------------------------- buildings and walls (src/town)
  /**
   * A house in its own frame (front wall at local z=0, body toward -z), turned to face the lane.
   * o: { x, z, w, d, side(+1 near/-1 far), y0, floors, h1, h2, base, wallA, wallB ([material name, tint]),
   *      roof('gable'|'hip'|'shed'|'flat'), roofM ([name, tint]), pitch, eave, verge, pent, pentM,
   *      balcony:{x0,x1,d,futon,laundry,panel,dish,pots}, win:[[floor, u, w, h, kind, { face('f'|'l'|'r'), sill, grille,
   *      tobukuro, hood, sudare, flowers, amado, room, curtain, cc, lit, depth, screen }]],
   *      door:{ x, kind('genkan'|'wood'|'west'|'apt'), w, mail, lamp(±1), name, porch('tile'|'stone'), umbrella, milk,
   *      noCanopy, noStep }, antenna, gutterTint, trim, skirt:{h, mat, tint}, corner, rafters, vents, ac:[[floor, u]],
   *      solar, lite, extra(B, { W, D, base, fy, top, ridge }) }
   */
  house(o) { return house(this, o); }
  blockWall(x0, x1, z, side, o) { return blockWall(this, x0, x1, z, side, o); }
  woodFence(x0, x1, z, side, o) { return woodFence(this, x0, x1, z, side, o); }
  gate(a, b, z, side, open) { return gate(this, a, b, z, side, open); }
  yard(x0, x1, z0, z1, mat, tint) { return yard(this, x0, x1, z0, z1, mat, tint); }
  /** Cheap second-row house (walls, a real roof, two windows). */
  backHouse(x, z, w, d, h, side) {
    const k = Math.floor(hash2(x, z) * 4), two = h > 6.5;
    const walls = [['plaster', 0xe4d8be], ['plaster', 0xcfcabf], ['clap', 0x8a7a68], ['plaster', 0xd8ceb6]], roofs = [['kawara', 0x8a9098], ['kawara', 0x7f98be], ['kawara', 0xa88670], ['tinroof', 0x8f9aa0]];
    return this.house({ x, z, w, d, side, lite: true, floors: two ? 2 : 1, h1: two ? 2.7 : 3.0, h2: two ? Math.min(2.7, h - 3.6) : 0, wallA: walls[k], roofM: roofs[(k + 1) % 4], pitch: roofs[(k + 1) % 4][0] === 'tinroof' ? 0.28 : 0.45, antenna: hash2(x, 5) < 0.5 ? (hash2(x, 6) - 0.5) * w * 0.5 : undefined,
      win: [[0, -w / 4, 1.3, 1.0, hash2(x, 1) < 0.5 ? 'lit' : 'dark'], [two ? 1 : 0, w / 4, 1.2, 1.0, hash2(x, 2) < 0.6 ? 'lit3' : 'dark']] });
  }
  midrise(x, z, w, h) { return midrise(this, x, z, w, h); }

  // ---------------------------------------------------------------- build
  build() {
    makeMats(this);
    this.interiorM = interiorMaterial();
    const lane = this.B = new Batch(shadeAt);
    this.Bpark = new Batch(shadeAt);
    buildSky(this);
    buildGround(this);
    buildFront(this);
    buildNeighbours(this);
    // behind the near side: alley A2 opens into the passage, the park, the back street and the mangaka's villa
    // (the passage is drawn with the lane; the park itself only where it can be seen: see Park.js / updateZones)
    this._zone = 'park';
    try { this.park = buildPark(this); } catch (e) { console.error('Town: park failed', e); this.park = null; }
    this._zone = null;
    this.B = lane;
    buildCornerShop(this);
    buildUnderpasses(this);
    buildPoles(this);
    buildDressing(this);
    // small-scale dressing only: never let a decoration bug stop the lane from loading
    try { buildDetails(this); } catch (e) { console.error('Town.buildDetails failed', e); }
    try { buildJapan(this); } catch (e) { console.error('Town: neighbourhood details failed', e); }
    this.flushPools();
    try { buildBackdrop(this); } catch (e) { console.error('Town: backdrop failed', e); }
    buildBounds(this);
    try { buildLanePosters(this); } catch (e) { console.error('Town: lane posters failed', e); }
    this.B.build(this.group, { name: 'town' });
    this.Bpark.build(this.zoneGroup('park'), { name: 'park' });
    this.flushProps();
    buildTrains(this);
    try { this.pylon = buildPylon(this); } catch (e) { console.error('Town: pylon failed', e); }
    this.setShopOpen(true);
    this.buildSpots();
    // contracts for pedestrians
    this.lanes = LANE_Z.map((z) => ({ z, x0: -XE + 1, x1: XE - 1 }));
    this.tunnels = [-1, 1].map((s) => ({ x: s * XW, z: (TZ0 + TZ1) / 2, dir: s, mouth: s * XT }));
    this.spawnPoints = [];
    for (const s of [-1, 1]) for (const z of LANE_Z) this.spawnPoints.push(new THREE.Vector3(s * (XE - 1), 0, z));
  }

  /** town.spots (park, villa, passage) and town.paths (waypoints from the lane into the park), the villa's door. */
  buildSpots() {
    const pk = this.park, V3 = (x, z) => new THREE.Vector3(x, 0, z);
    const spot = (x, z, rotY, extra = {}) => ({ pos: V3(x, z), rotY, ...extra });
    this.spots = {
      a2Mouth: spot(10.55, 6.2, Math.PI, { note: 'the mouth of alley A2 on the lane (the way to the park)' }),
      passage: spot(10.55, 0.5, Math.PI, { note: 'halfway down the A2 passage' }),
      ...(pk?.spots || {}),
    };
    if (pk) {
      const g = pk.gate;
      this.spots.villaGate = spot(g.x, g.z + 0.45, Math.PI, { note: 'on the back street at the villa gate, facing it' });
      this.spots.villaDoor = spot(16.5, -21.55, 0, { note: 'the villa front door (inside the garden)' });
      this.doors.push({ id: 'rohan', house: 'villa', family: 'Kishibe', side: 1, rotY: 0, pos: V3(16.5, -21.55), gate: V3(g.x, g.z), bell: new THREE.Vector3(17.2, 0.85, g.z + 0.23) });
    }
    const inPark = [V3(10.55, 7.0), V3(10.55, 4.6), V3(10.5, -4.2), V3(12.6, -4.5), V3(13.8, -6.6), V3(17.6, -8.6)];
    this.paths = { park: inPark, villa: [...inPark, V3(18.3, -15.6), V3(18.3, -18.85), V3(16.5, -19.5)] };
  }

  // ---------------------------------------------------------------- the shop front's switches
  setShopOpen(open) {
    const S = this.shop;
    if (!S) return;
    this.shopOpen = open;
    S.openG.visible = open;
    S.closedG.visible = !open;
    S.open = open;
    for (const o of S.obs || []) o.enabled = open;
  }
  /** The lanterns under the eave (lit with the time of day while on); setting shopOpen also sets them. */
  setLanterns(on) {
    const S = this.shop;
    this.lanternsOn = !!on;
    if (!S?.lanternM) return;
    S.lanternM.emissiveIntensity = on ? 1.3 : 0;
    S.lanternM.color.setScalar(on ? 1 : 0.45);
    S.glow.intensity = on ? 2.4 : 0;
    if (this._lastSky) this.applySky(this._lastSky);
  }
  get shopOpen() { return !!this._shopOpen; }
  set shopOpen(v) { this._shopOpen = !!v; this.setLanterns(v); }

  // ---------------------------------------------------------------- time of day
  /**
   * Day / night for the town's own materials, called a few times a second by src/game/Lighting.js with the sky look
   * (src/sim/sky.js) plus { sunDir, moonDir, sunK, moonK, twinkle, power }. Only uniforms and intensities change.
   */
  applySky(L) {
    const night = L.night;
    applySkyLook(this, L);
    if (this.poolK) this.poolK.value = 0.4 + 1.1 * night;
    if (this.streetLamp) this.streetLamp.intensity = night > 0.3 ? 5.2 * Math.min(1, (night - 0.3) / 0.25) : 0;
    if (this.vendingLight) this.vendingLight.intensity = 1.6 + 1.2 * night;
    if (this.G) this.G.color.setScalar(1.05 + 0.55 * night);
    for (const m of this.trainMats || []) m.emissiveIntensity = 0.25 + 1.0 * night;
    setInteriorSky({ night, sky: new THREE.Color().copy(L.hor).lerp(L.up, 0.45).multiplyScalar(1 - 0.5 * night) });
    this._lastSky = L;
    const S = this.shop;
    if (S?.lanternM) {
      const on = (this.lanternsOn ? 1 : 0) * (L.power === false ? 0 : 1);
      S.lanternM.emissiveIntensity = on * (0.8 + 0.6 * night);
      S.glow.intensity = on * (1.2 + 1.8 * night);
    }
  }

  // ---------------------------------------------------------------- trains, per frame
  runTrain(side = null, dir = null) { return runTrain(this, side, dir); }
  update(dt, t) {
    void t;
    if (this.interiorM) this.interiorM.uniforms.uTime.value += dt;
    this.updateZones();
    this.cull?.update(this.game.camera, this.game.renderer?.quality?.view ?? 1);
    // the wind in the washing and the streamers
    this._wind = (this._wind || 0) + dt;
    for (const w of this.swings || []) {
      const tt = this._wind, g = Math.sin(tt * 0.31 + w.ph * 0.2) * 0.5 + 0.5;
      if (w.axis === 'y') { w.o.rotation.y = (Math.sin(tt * 0.6 + w.ph) * 0.22 + Math.sin(tt * 1.7 + w.ph) * 0.06) * w.amp; w.o.rotation.z = (Math.sin(tt * 2.3 + w.ph) * 0.05 - 0.1 * (1 - g)) * w.amp; }
      else w.o.rotation.x = (Math.sin(tt * 1.15 + w.ph) * 0.04 + Math.sin(tt * 0.43 + w.ph * 1.3) * 0.05) * (0.4 + g) * w.amp;
    }
    updateTrains(this, dt, audio);
  }
}
