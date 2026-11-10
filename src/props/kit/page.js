// Prop atlases. Every prop family (street, garage, shop, room, decor) paints into shared pages: one page is one
// texture and one set of materials, so every prop on it draws with the same material (one draw call per prop, and
// props merged into a batch stay one draw call). A page is a vehicle-kit Atlas (src/vehicles/atlas.js) with three
// additions: it can be painted after its texture exists (props are built lazily: touch() re-uploads once per tick),
// its allocation can be rolled back (a prop that does not fit starts the family's next page), and it keeps the
// patches props share (a plank, a tread, a dirt line) so they are painted once per page.
//   const pg = pageFor('street')         the family's current page
//   pg.mats()                            [opaque, opaque, opaque, glow, glass]: the voxel material order (see below)
// Material order: props are drawn all over the game with a five-slot material array indexed by the old voxel
// material ids (0 matte, 1 gloss, 2 metal, 3 glow, 4 glass). The low-poly props keep that order: everything lit and
// opaque is slot 0, lamps and lit signs are slot 3 (unlit, bright), glass and cut-outs are slot 4.
import * as THREE from 'three';
import { Atlas, ROUGH } from '../../vehicles/atlas.js';

export const PAGE = 1024;
const FAMILIES = new Map(); // family -> [Page]
const pending = new Set();
let scheduled = false;

export class Page extends Atlas {
  constructor(family, n, size = PAGE) {
    super(size, size);
    this.family = family; this.n = n;
    this.cache = new Map(); // shared patches: key -> whatever the painter returned
    this.props = 0;
    this.ink(ROUGH.matte);
    this.r.fill(Math.round(ROUGH.matte * 255));
  }

  /** A patch painted once per page (shared by every prop on it). make() -> anything (usually a View). */
  shared(key, make) {
    if (!this.cache.has(key)) this.cache.set(key, make(this));
    return this.cache.get(key);
  }

  // ---- roll back a prop that did not fit
  mark() { return { shelf: { ...this.shelf }, sw: new Map(this.sw), swArea: this.swArea ? { ...this.swArea } : null, keys: new Set(this.cache.keys()), views: { ...this.views } }; }
  rollback(m) {
    this.shelf = m.shelf; this.sw = m.sw; this.swArea = m.swArea; this.views = m.views;
    for (const k of [...this.cache.keys()]) if (!m.keys.has(k)) this.cache.delete(k);
  }
  /** Fraction of the page's height in use. */
  get used() { return (this.shelf.y + this.shelf.h) / this.h; }

  // ---- textures that follow later painting
  canvas() {
    if (!this.cv) { this.cv = document.createElement('canvas'); this.cv.width = this.w; this.cv.height = this.h; }
    this.cv.getContext('2d').putImageData(new ImageData(this.d, this.w, this.h), 0, 0);
    return this.cv;
  }
  roughCanvas() {
    const w = this.w >> 1, h = this.h >> 1;
    if (!this.rcv) { this.rcv = document.createElement('canvas'); this.rcv.width = w; this.rcv.height = h; this.rd = new Uint8ClampedArray(w * h * 4); }
    const d = this.rd, r = this.r, W = this.w;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = r[(y * 2) * W + x * 2], i = (y * w + x) * 4; d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255; }
    this.rcv.getContext('2d').putImageData(new ImageData(d, w, h), 0, 0);
    return this.rcv;
  }
  texture() {
    if (this.tex) return this.tex;
    const t = new THREE.CanvasTexture(this.canvas());
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
    t.anisotropy = 4;
    t.name = `props:${this.family}${this.n}`;
    return (this.tex = t);
  }
  roughTexture() {
    if (this.rtex) return this.rtex;
    const t = new THREE.CanvasTexture(this.roughCanvas());
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapLinearFilter;
    return (this.rtex = t);
  }
  /** Painted since the last upload: refresh the textures once this tick is over. */
  touch() {
    if (!this.tex && !this.rtex) return;
    pending.add(this);
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => { scheduled = false; flushPages(); });
  }

  /** The page's materials in the voxel material order: [matte, gloss, metal, glow, glass]. */
  mats() {
    if (this.M) return this.M;
    const map = this.texture(), roughnessMap = this.roughTexture(), name = `prop:${this.family}${this.n}`;
    const body = new THREE.MeshStandardMaterial({ map, roughnessMap, roughness: 1, metalness: 0, envMapIntensity: 0.7 });
    body.name = name;
    // lamps, lit signs, screens: unlit and a little over white so they bloom like the old glow voxels did
    const glow = new THREE.MeshBasicMaterial({ map });
    glow.color.setScalar(1.8);
    glow.name = name + ':glow';
    // glass (alpha from the atlas) and cut-outs (wire mesh, spokes: alpha 0 or 255)
    const glass = new THREE.MeshStandardMaterial({ map, roughnessMap, roughness: 1, metalness: 0, transparent: true, alphaTest: 0.04, depthWrite: true, envMapIntensity: 1.0 });
    glass.name = name + ':glass';
    // a prop built and drawn in the same tick: upload the new paint before this page's first draw of the frame
    body.onBeforeRender = glow.onBeforeRender = glass.onBeforeRender = () => { if (pending.size) flushPages(); };
    this.M = [body, body, body, glow, glass];
    return this.M;
  }
}

/** Upload whatever was painted since the last upload (normally done by itself at the end of the tick). */
export function flushPages() {
  for (const p of pending) { if (p.tex) { p.canvas(); p.tex.needsUpdate = true; } if (p.rtex) { p.roughCanvas(); p.rtex.needsUpdate = true; } }
  pending.clear();
}

/** The page a family's next prop is built on (o.fresh: start a new one). */
export function pageFor(family, o = {}) {
  let list = FAMILIES.get(family);
  if (!list) FAMILIES.set(family, list = []);
  if (!list.length || o.fresh) list.push(new Page(family, list.length, o.size || PAGE));
  return list[list.length - 1];
}
export function allPages() { return [...FAMILIES.values()].flat(); }
