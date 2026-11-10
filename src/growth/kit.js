// Building kit for the growth zones (src/growth/): every bigger home, the shop annex and the Kaikan are interiors built
// off the map, shown only while you're in them (game.places), and registered with the interaction system only then.
//
//   new Zone(game, { id, name, origin, light: 'lamp' | 'bright', lamp, lamp2, far, spawn, exit, onEnter, onExit, update })
//     zone.group                       everything of the zone (hidden while you're elsewhere)
//     zone.L(x, y, z) -> Vector3       zone-local (metres from origin) -> world        zone.at(x, z, yaw) -> spawn point
//     zone.B                           a static batcher in zone-local coordinates (box / plane / quad, then zone.flush())
//     zone.mat(m) / zone.vox()         interior variants of a material / the voxel materials (no sun; lamp or fluorescent)
//     zone.convert(obj)                swap every material under obj for its interior variant
//     zone.block(x0, x1, z0, z1)       a player obstacle (zone-local rectangle)
//     zone.hit(w, h, d, x, y, z, handler) / zone.target(obj, handler)    clickables, live only while you're inside
//     zone.prop(id, x, y, z, ry, s)    a prop from propMesh, its own materials in their interior variants
//   bright(m)  fluorescent-lit material: flat bright shop lighting from above, no sun, no sky tint (the Kaikan)
//   Batch      the static batcher (vertex-coloured boxes merged into one mesh per material)
//   pixTex(w, h, draw) / canvasMat(w, h, draw, opts)   pixel-art canvas textures (nearest filtering)
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { worldBox } from '../gfx/geo.js';
import { propMesh } from '../world/props.js';
import { voxelMaterials } from '../voxel/materials.js';
import { audio } from '../core/audio.js';
import { converted } from '../places/ikit.js';

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const pick = (a) => a[Math.floor(Math.random() * a.length)];
export const rnd = (a, b) => a + Math.random() * (b - a);
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const smooth = (k) => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
const hitMat = new THREE.MeshBasicMaterial({ visible: false });
const LAMPED = new WeakSet(); // materials that already are game.places' lamp-lit interior variants

// ------------------------------------------------------------------ fluorescent interiors (the Kaikan)
export const FLU = { col: { value: new THREE.Color(1.5, 1.5, 1.45) }, up: { value: new THREE.Vector3(0, 1, 0) } };
let BRIGHT_BEGIN = null;
const brightCache = new Map();
/** A bright, evenly lit interior variant of a standard material: the sun and the sky's hemisphere light are switched off
 *  and a flat "ceiling full of tubes" light comes from above (stronger on floors and tops, softer on walls). */
export function bright(m) {
  if (!m) return m;
  if (Array.isArray(m)) return m.map(bright);
  if (!m.isMeshStandardMaterial || m.userData.bright) return m;
  let c = brightCache.get(m);
  if (c) return c;
  if (!BRIGHT_BEGIN) {
    BRIGHT_BEGIN = THREE.ShaderChunk.lights_fragment_begin
      .replace('#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )', '#if 0')
      .replace('#if ( NUM_HEMI_LIGHTS > 0 )', '#if 0');
  }
  c = m.clone();
  c.userData.bright = true;
  const base = m.onBeforeCompile;
  c.onBeforeCompile = (sh, r) => {
    if (base && base !== THREE.Material.prototype.onBeforeCompile) base.call(m, sh, r);
    sh.uniforms.uFluC = FLU.col; sh.uniforms.uFluUp = FLU.up;
    sh.fragmentShader = sh.fragmentShader
      .replace('void main() {', 'uniform vec3 uFluC; uniform vec3 uFluUp;\nvoid main() {')
      .replace('#include <lights_fragment_begin>', BRIGHT_BEGIN)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
  { float fu = dot(normal, uFluUp); reflectedLight.directDiffuse += BRDF_Lambert(material.diffuseColor) * uFluC * (0.72 + 0.28 * fu); }`);
  };
  c.customProgramCacheKey = () => 'bright:' + (m.customProgramCacheKey?.() || '');
  brightCache.set(m, c);
  return c;
}
let brightVox = null;
export function brightVoxel() {
  if (!brightVox) { const n = voxelMaterials('normal'); brightVox = [bright(n[0]), bright(n[1]), bright(n[2]), n[3], bright(n[4])]; }
  return brightVox;
}

// ------------------------------------------------------------------ the batcher
const _c = new THREE.Color();
export class Batch {
  constructor() { this.lists = new Map(); this.off = V(); }
  add(mat, g, tint = 0xffffff, k = 1) {
    if (g.index) g = g.toNonIndexed();
    const n = g.attributes.position.count, col = new Float32Array(n * 3);
    _c.set(tint);
    for (let i = 0; i < n; i++) { col[i * 3] = _c.r * k; col[i * 3 + 1] = _c.g * k; col[i * 3 + 2] = _c.b * k; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.translate(this.off.x, this.off.y, this.off.z);
    if (!this.lists.has(mat)) this.lists.set(mat, []);
    this.lists.get(mat).push(g);
    return g;
  }
  /** Box with its bottom at y. o: tint, k, rx/ry/rz, unit (0..1 UVs per face), uv offset. World-metre UVs otherwise. */
  box(mat, w, h, d, x, y, z, o = {}) {
    const g = o.unit ? new THREE.BoxGeometry(w, h, d) : worldBox(w, h, d);
    if (o.uv) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) + o.uv[0], uv.getY(i) + o.uv[1]); }
    if (o.rx) g.rotateX(o.rx);
    if (o.rz) g.rotateZ(o.rz);
    if (o.ry) g.rotateY(o.ry);
    g.translate(x, y + h / 2, z);
    return this.add(mat, g, o.tint, o.k);
  }
  /** Vertical quad facing +z (turn with o.ry), bottom at y; unit UVs unless o.world. */
  quad(mat, w, h, x, y, z, o = {}) {
    const g = new THREE.PlaneGeometry(w, h);
    if (o.world) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * h); }
    if (o.ry) g.rotateY(o.ry);
    g.translate(x, y + h / 2, z);
    return this.add(mat, g, o.tint, o.k);
  }
  /** Upward plane at y (world UVs unless o.unit, o.uv an offset); o.down faces down (ceilings). */
  plane(mat, w, d, x, y, z, o = {}) {
    const g = new THREE.PlaneGeometry(w, d);
    if (!o.unit) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w * (o.s || 1) + (o.uv?.[0] || 0), uv.getY(i) * d * (o.s || 1) + (o.uv?.[1] || 0)); }
    g.rotateX(-Math.PI / 2);
    if (o.down) g.rotateX(Math.PI);
    if (o.ry) g.rotateY(o.ry);
    g.translate(x, y, z);
    return this.add(mat, g, o.tint, o.k);
  }
  /** Any geometry (already placed in local coordinates). */
  geo(mat, g, tint = 0xffffff, k = 1) { return this.add(mat, g, tint, k); }
  build(parent, { name = '' } = {}) {
    const out = [];
    for (const [mat, list] of this.lists) {
      const g = mergeGeometries(list, false);
      for (const x of list) x.dispose();
      if (!g) continue;
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, mat);
      m.matrixAutoUpdate = false; m.updateMatrix();
      m.receiveShadow = true;
      m.name = name;
      parent.add(m);
      out.push(m);
    }
    this.lists.clear();
    return out;
  }
}

// ------------------------------------------------------------------ pixel canvases
/** A pixel-art canvas texture (nearest filtering). draw(ctx, w, h). Returns { tex, canvas, ctx, redraw(fn) }. */
export function pixTex(w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  const o = { tex, canvas, ctx, w, h, redraw(fn) { ctx.clearRect(0, 0, w, h); ctx.imageSmoothingEnabled = false; (fn || draw)?.(ctx, w, h); tex.needsUpdate = true; } };
  if (draw) o.redraw(draw);
  return o;
}
/** A material showing a pixel canvas: basic (self-lit: neon, screens) or standard (paper, signs). */
export function canvasMat(w, h, draw, { glow = false, rough = 0.7, alpha = false, side = THREE.FrontSide } = {}) {
  const p = pixTex(w, h, draw);
  const m = glow
    ? new THREE.MeshBasicMaterial({ map: p.tex, transparent: alpha, alphaTest: alpha ? 0.5 : 0, side, toneMapped: true })
    : new THREE.MeshStandardMaterial({ map: p.tex, roughness: rough, transparent: false, alphaTest: alpha ? 0.5 : 0, side });
  m.userData.pix = p;
  return m;
}
/** Text with a 1px hard shadow (no glow, no gradient) on a pixel canvas. */
export function pixText(ctx, text, x, y, { size = 10, color = '#241a1e', font = 'DotGothic16', align = 'left', shadow = null } = {}) {
  ctx.font = `${size}px "${font}"`;
  ctx.textAlign = align; ctx.textBaseline = 'top';
  if (shadow) { ctx.fillStyle = shadow; ctx.fillText(text, Math.round(x) + 1, Math.round(y) + 1); }
  ctx.fillStyle = color; ctx.fillText(text, Math.round(x), Math.round(y));
}
/** A deterministic little noise pass (grain) over a canvas region. */
export function grain(ctx, x, y, w, h, colors, density = 0.08, seed = 3) {
  let s = (seed * 2654435761) >>> 0;
  const r = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  const n = Math.floor(w * h * density);
  for (let i = 0; i < n; i++) { ctx.fillStyle = colors[Math.floor(r() * colors.length)]; ctx.fillRect(x + Math.floor(r() * w), y + Math.floor(r() * h), 1, 1); }
}

// ------------------------------------------------------------------ a zone (an interior off the map)
export class Zone {
  constructor(game, o) {
    this.game = game;
    this.places = game.places;
    this.id = o.id;
    this.o = o.origin.clone();
    this.light = o.light || 'lamp';
    this.group = new THREE.Group();
    this.group.name = 'zone:' + o.id;
    game.scene.add(this.group);
    this.B = new Batch();
    this.B.off.copy(this.o);
    this.targets = [];
    this.live = false;
    this.def = this.places.add({
      id: o.id, name: o.name, group: this.group,
      spawn: o.spawn ? this.at(...o.spawn) : this.at(0, 0, 0), exit: o.exit,
      lamp: o.lamp ? { ...this.L(o.lamp.x, o.lamp.y, o.lamp.z), color: o.lamp.color, intensity: o.lamp.intensity, k: 1 } : null,
      lamp2: o.lamp2 ? { ...this.L(o.lamp2.x, o.lamp2.y, o.lamp2.z), color: o.lamp2.color, intensity: o.lamp2.intensity, k: 1 } : null,
      far: o.far || 40,
      onEnter: () => { this.setLive(true); o.onEnter?.(); },
      onExit: () => { this.setLive(false); o.onExit?.(); },
      onEntered: () => o.onEntered?.(),
      update: (dt) => { if (this.light === 'bright') this.updateBright(); o.update?.(dt); },
    });
  }

  get inside() { return this.places.where === this.id; }
  L(x = 0, y = 0, z = 0) { return V(x + this.o.x, y, z + this.o.z); }
  /** world -> zone-local */
  local(p) { return V(p.x - this.o.x, p.y, p.z - this.o.z); }
  at(x, z, yaw = 0) { return { x: x + this.o.x, z: z + this.o.z, yaw }; }

  mat(m) {
    if (!m) return m;
    if (Array.isArray(m)) return m.map((x) => this.mat(x));
    if (this.light === 'bright') return bright(m);
    if (LAMPED.has(m) || converted(m)) return m; // already an interior variant (converting twice would patch the shader twice)
    const c = this.places.mat(m);
    LAMPED.add(c);
    return c;
  }
  vox() {
    if (this.light === 'bright') return brightVoxel();
    const v = this.places.voxel();
    for (const m of v) LAMPED.add(m);
    return v;
  }
  convert(obj) {
    obj.traverse((o) => {
      if (!o.material) return;
      if (Array.isArray(o.material)) o.material = o.material.map((m) => this.mat(m));
      else o.material = this.mat(o.material);
    });
    return obj;
  }
  flush(parent = this.group) { return this.B.build(parent, { name: this.id }); }
  block(x0, x1, z0, z1) { return this.game.player.addObstacle(x0 + this.o.x, x1 + this.o.x, z0 + this.o.z, z1 + this.o.z, this.id); }

  /** A clickable (registered with the interaction system only while you're in the zone). */
  target(obj, handler) {
    obj.userData.handler = handler;
    this.targets.push(obj);
    if (this.live && !this.game.interaction.targets.includes(obj)) this.game.interaction.targets.push(obj);
    return obj;
  }
  untarget(obj) { const i = this.targets.indexOf(obj); if (i >= 0) this.targets.splice(i, 1); this.game.interaction.remove(obj); }
  hit(w, h, d, x, y, z, handler, parent = this.group) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), hitMat);
    m.position.copy(this.L(x, y, z)); // (sub-groups of a zone all sit at the world origin too)
    parent.add(m);
    if (handler) this.target(m, handler);
    return m;
  }
  setLive(on) {
    this.live = on;
    const I = this.game.interaction;
    for (const t of this.targets) {
      const i = I.targets.indexOf(t);
      if (on && i < 0) I.targets.push(t);
      if (!on && i >= 0) { I.targets.splice(i, 1); if (I.hover?.obj === t) I.setHover(null); }
    }
  }
  prop(id, x, y, z, ry = 0, s = 1, parent = this.group) {
    const m = propMesh(id, { castShadow: false });
    this.convert(m); // (the prop keeps its own materials: its atlas page, or the voxel set)
    m.position.copy(this.L(x, y, z));
    m.rotation.y = ry;
    if (s !== 1) m.scale.setScalar(s);
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  updateBright() {
    const cam = this.game.camera;
    FLU.up.value.set(0, 1, 0).transformDirection(cam.matrixWorldInverse);
  }
}

/** Fade through black and move to a place at a given spot (zone switches inside a building, the flat's doors). */
export function goTo(game, placeId, spot, { sound = 'slideDoor', fade = 0.3, after = null } = {}) {
  const g = game, P = g.places;
  if (!P || P.busy || g.cutscene.active) return false;
  P.busy = true;
  P.standUp();
  g.cutscene.play(function* (c) {
    if (sound) { try { audio.play(sound, { vol: 0.6 }); } catch { /* audio not ready */ } }
    yield c.fade(1, fade);
    if (placeId === null) P.setWhere(null); else P.setWhere(placeId);
    const pl = g.player;
    pl.pos.set(spot.x, 0, spot.z); pl.yaw = spot.yaw ?? 0; pl.pitch = spot.pitch ?? -0.05; pl.vel.set(0, 0, 0);
    if (g.needs) g.needs.hasPrev = false;
    yield c.wait(0.1);
    yield c.fade(0, fade * 1.3);
  }, { letterbox: false, skippable: false }).then(() => { P.busy = false; after?.(); });
  return true;
}

export const sfx = (name, opts = {}) => { try { audio.play(name, opts); } catch { /* audio not ready */ } };
