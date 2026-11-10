// The garage's building kit: static low-poly parts collected per material and merged into one mesh each (plus one more
// for the parts that cast shadows). It is the vehicle kit's Geo (src/vehicles/geom.js: flat-shaded triangles, chamfered
// boxes, lathes) with two additions: a tint per face (vertex colour, so one pale tiling texture serves teal paint,
// rust-proof red and bare zinc) and uvs in world metres, so the tiling textures (src/gfx/garageArt.js) keep their
// real size on every wall, post and beam.
//   const K = new Kit(mats)                       mats: { key: Material (vertexColors: true; userData.avg = its photo's
//                                                 mean colour, userData.grainV = the photo's grain runs along V) }
//   K.box('wood', x0, y0, z0, x1, y1, z1, { tint, grain: 'y', bevel, cast, skip })
//   K.beam('wood', a, b, w, h, { tint })          a member of section w x h from a to b (grain along it)
//   K.rod('flat', a, b, r, { tint, sides })       K.sticker('print', rect, face, x, y, z, w, h, { rot, tint })
//   K.wave('totan', c0, c1, pt, n, { tint })      a corrugated sheet (real waves, matching the painted ones)
//   K.geo('flat', cast) -> the bucket's Geo, for lathes and hand-made faces (set .rgb with K.rgb(tint))
//   K.build(parent, name) -> meshes               K.mesh('wood', (g) => ...) -> a separate Mesh (moving / clickable parts)
import * as THREE from 'three';
import { Geo } from '../vehicles/geom.js';

const _c = new THREE.Color();
/** uv in metres by the face's dominant axis; `grain` names the axis the texture's u runs along. */
const METRES = {
  wall: (p, n) => { const ax = Math.abs(n[0]), ay = Math.abs(n[1]), az = Math.abs(n[2]); return ax >= ay && ax >= az ? [p[2], p[1]] : ay >= az ? [p[0], p[2]] : [p[0], p[1]]; },
  x: (p, n) => { const ax = Math.abs(n[0]), ay = Math.abs(n[1]), az = Math.abs(n[2]); return ax >= ay && ax >= az ? [p[2], p[1]] : ay >= az ? [p[0], p[2]] : [p[0], p[1]]; },
  y: (p, n) => { const ax = Math.abs(n[0]), ay = Math.abs(n[1]), az = Math.abs(n[2]); return ax >= ay && ax >= az ? [p[1], p[2]] : ay >= az ? [p[0], p[2]] : [p[1], p[0]]; },
  z: (p, n) => { const ax = Math.abs(n[0]), ay = Math.abs(n[1]), az = Math.abs(n[2]); return ax >= ay && ax >= az ? [p[2], p[1]] : ay >= az ? [p[2], p[0]] : [p[0], p[1]]; },
};

/** The same with u and v exchanged, for photos whose grain runs along V. */
const SWAP = Object.fromEntries(Object.entries(METRES).map(([k, f]) => [k, (p, n) => { const t = f(p, n); return [t[1], t[0]]; }]));

/** Geo with a colour per face. */
export class TGeo extends Geo {
  constructor() { super(1); this.col = []; this.rgb = [1, 1, 1]; this.uv = METRES.wall; }
  tri(a, b, c, hint = null, uvs = null) {
    const S = this.S[0], n = S.p.length;
    super.tri(a, b, c, hint, uvs);
    if (S.p.length > n) { const [r, g, bl] = this.rgb; this.col.push(r, g, bl, r, g, bl, r, g, bl); }
    return this;
  }
  build() {
    const g = super.build();
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.clearGroups();
    if (!this.flat) autoSmooth(g);
    return g;
  }
}

/** Smooth normals where the surface is smooth: every vertex takes the average of the faces meeting at its position
 *  that lie within `deg` of its own face (round pipes, lathes and wave sheets shade as curves; box edges and 45-degree
 *  chamfers stay hard). */
export function autoSmooth(geo, deg = 40) {
  const P = geo.attributes.position.array, N = geo.attributes.normal.array, n = P.length / 3, cosT = Math.cos(deg * Math.PI / 180);
  const at = new Map();
  for (let i = 0; i < n; i++) {
    const k = Math.round(P[i * 3] * 4000) + ',' + Math.round(P[i * 3 + 1] * 4000) + ',' + Math.round(P[i * 3 + 2] * 4000);
    const l = at.get(k);
    if (l) l.push(i); else at.set(k, [i]);
  }
  const out = new Float32Array(N);
  for (const l of at.values()) {
    if (l.length < 2) continue;
    for (const i of l) {
      const ax = N[i * 3], ay = N[i * 3 + 1], az = N[i * 3 + 2];
      let x = 0, y = 0, z = 0;
      for (const j of l) { const bx = N[j * 3], by = N[j * 3 + 1], bz = N[j * 3 + 2]; if (ax * bx + ay * by + az * bz >= cosT) { x += bx; y += by; z += bz; } }
      const len = Math.hypot(x, y, z) || 1;
      out[i * 3] = x / len; out[i * 3 + 1] = y / len; out[i * 3 + 2] = z / len;
    }
  }
  N.set(out);
  geo.attributes.normal.needsUpdate = true;
}

export class Kit {
  constructor(mats) { this.mats = mats; this.B = new Map(); }
  /** A colour (sRGB hex) as the linear vertex colour. On a photo material (userData.avg = the photo's mean colour) it
   *  is the colour the surface should come out as, so the vertex colour is that over the mean; no colour = the photo. */
  rgb(c, k = 1, key = null) {
    if (c === undefined || c === null) return [k, k, k];
    _c.setHex(c);
    const r = _c.r * k, g = _c.g * k, b = _c.b * k, avg = key ? this.mats[key]?.userData.avg : null;
    if (avg === undefined || avg === null) return [r, g, b];
    _c.setHex(avg);
    return [r / Math.max(_c.r, 0.02), g / Math.max(_c.g, 0.02), b / Math.max(_c.b, 0.02)];
  }
  /** The bucket of a material (cast: the parts drawn into the shadow maps). */
  geo(key, cast = false) {
    const k = key + (cast ? '|c' : '');
    let g = this.B.get(k);
    if (!g) { if (!this.mats[key]) throw new Error('garage kit: no material ' + key); g = new TGeo(); g.key = key; g.cast = cast; this.B.set(k, g); }
    g.uv = METRES.wall;
    return g;
  }
  use(key, o = {}) {
    const g = this.geo(key, !!o.cast);
    g.rgb = this.rgb(o.tint, o.k ?? 1, key);
    g.uv = o.uv || (this.mats[key].userData.grainV && o.grain ? SWAP[o.grain] : METRES[o.grain || 'wall']);
    return g;
  }
  box(key, x0, y0, z0, x1, y1, z1, o = {}) { this.use(key, o).box(x0, y0, z0, x1, y1, z1, o); return this; }
  /** A member from a to b, w wide (horizontal) and h deep, its grain along its length. */
  beam(key, a, b, w, h, o = {}) {
    const g = this.use(key, { ...o, grain: 'x' });
    const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = d.length();
    d.normalize();
    const side = Math.abs(d.y) > 0.999 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3().crossVectors(d, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(side, d);
    g.push(new THREE.Matrix4().makeBasis(d, up, side).setPosition(a[0], a[1], a[2]));
    g.box(-(o.e0 || 0), -h / 2, -w / 2, L + (o.e1 || 0), h / 2, w / 2, o);
    g.pop();
    return this;
  }
  rod(key, a, b, r, o = {}) { this.use(key, o).strut(a, b, r, { round: o.sides || (r < 0.007 ? 6 : 10) }); return this; }
  /**
   * A corrugated sheet (small-wave zinc: pitch P, the crests where the totan texture paints them): from c0 to c1 along
   * the sheet, pt(c, off, top) -> the point at c pushed `off` along the sheet's normal, on its lower (0) or upper (1)
   * edge; n the way it faces.
   */
  wave(key, c0, c1, pt, n, o = {}) {
    const g = this.use(key, o), P = o.pitch || 0.076, q = P / 6, amp = o.amp ?? 0.009, off = (c) => amp * Math.cos(2 * Math.PI * (c / P - 0.25));
    let c = c0;
    while (c < c1 - 1e-5) {
      const e = Math.min(c1, (Math.floor(c / q + 1e-4) + 1) * q);
      g.quad(pt(c, off(c), 0), pt(e, off(e), 0), pt(e, off(e), 1), pt(c, off(c), 1), n);
      c = e;
    }
    return this;
  }
  /** A rod through several points (pipes, cables). */
  pipe(key, pts, r, o = {}) {
    for (let i = 0; i + 1 < pts.length; i++) this.rod(key, pts[i], pts[i + 1], r, o);
    // a ball at every bend, so the run turns as one swept pipe
    if (r >= 0.008) for (let i = 1; i + 1 < pts.length; i++) this.ball(key, pts[i], r, o);
    return this;
  }
  ball(key, c, r, o = {}) {
    const g = this.use(key, o), n = o.sides || 10, prof = [];
    for (let k = 0; k <= 6; k++) { const a = (k / 6) * Math.PI; prof.push([Math.sin(a) * r, -Math.cos(a) * r]); }
    g.push(new THREE.Matrix4().makeTranslation(c[0], c[1], c[2])); g.lathe(prof, n); g.pop();
    return this;
  }
  /** A flat quad a b c d facing `hint`; o.rect = [u0, v0, u1, v1] over it (a at u0 v0, b at u1 v0). */
  quad(key, a, b, c, d, hint, o = {}) {
    const r = o.rect;
    this.use(key, o).quad(a, b, c, d, hint, r ? [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]] : null);
    return this;
  }
  /** A print or a mark on a surface. face: '+x' '-x' '+z' '-z' (the way it looks) or '+y' / '-y'; (x, y, z) its centre. */
  sticker(key, rect, face, x, y, z, w, h, o = {}) {
    const rot = o.rot || 0, c = Math.cos(rot), s = Math.sin(rot), V = (a, b, cc) => new THREE.Vector3(a, b, cc);
    let U, W, n;
    if (face === '+y') { U = V(c, 0, -s); W = V(-s, 0, -c); n = [0, 1, 0]; }
    else if (face === '-y') { U = V(c, 0, s); W = V(-s, 0, c); n = [0, -1, 0]; }
    else {
      const N = { '+x': V(1, 0, 0), '-x': V(-1, 0, 0), '+z': V(0, 0, 1), '-z': V(0, 0, -1) }[face];
      const right = V(0, 1, 0).cross(N);
      U = right.clone().multiplyScalar(c).add(V(0, s, 0)); W = V(0, c, 0).sub(right.clone().multiplyScalar(s)); n = N.toArray();
    }
    U.multiplyScalar(w / 2); W.multiplyScalar(h / 2);
    const P = (su, sw) => [x + U.x * su + W.x * sw, y + U.y * su + W.y * sw, z + U.z * su + W.z * sw];
    return this.quad(key, P(-1, -1), P(1, -1), P(1, 1), P(-1, 1), n, { ...o, rect });
  }
  /** A separate mesh from one material (for the parts that move or are clicked). */
  mesh(key, fn, o = {}) {
    const g = new TGeo(), V = this.mats[key].userData.grainV;
    g.rgb = this.rgb(o.tint, 1, key);
    g.tint = (c, k = 1) => { g.rgb = this.rgb(c, k, key); return g; };
    g.grain = (a) => { g.uv = V && a ? SWAP[a] : METRES[a || 'wall']; return g; };
    fn(g);
    const m = new THREE.Mesh(g.build(), this.mats[key]);
    m.castShadow = o.cast ?? true; m.receiveShadow = true;
    return m;
  }
  build(parent, name = 'garage') {
    const out = [];
    for (const g of this.B.values()) {
      if (!g.tris) continue;
      const m = new THREE.Mesh(g.build(), this.mats[g.key]);
      m.castShadow = g.cast; m.receiveShadow = true;
      m.matrixAutoUpdate = false; m.updateMatrix();
      m.name = `${name}:${g.key}${g.cast ? ':cast' : ''}`;
      if (this.mats[g.key].userData.order) m.renderOrder = this.mats[g.key].userData.order;
      parent.add(m); out.push(m);
    }
    this.B.clear();
    return out;
  }
}
export { METRES };
