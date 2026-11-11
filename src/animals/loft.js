// The animal kit: smooth low-poly bodies lofted from hand-authored cross-sections, painted per texel from a coat
// function in body space, and merged into one skinned mesh per animal. The paint is pixel art in the voxel game's style:
// each part is painted in square texel blocks (px: 2-4 atlas texels, ~2-4 mm on the animal, about the voxel world's
// texel), flat coat colours with hard tone steps (cool shadow, warm light), a fur grain of short strand ticks set by
// rule, nearest filtering up close and mipmaps so nothing shimmers.
//   const L = new Loft([{ p: [x, y, z], r: egg(w, up, dn), up: [0, 1, 0] }, ...], { cap: [lenStart, lenEnd] });
//   const S = L.sample(us, vs) -> { P, N, nu, nv }        (positions / normals on the tensor grid of u and v)
//   const B = new Builder(atlasW, atlasH, gutter, { px, grain });  B.part(L, { rect, cols, rows, skin, paint, px, grain });
//   B.geometry(); B.texture();     pixelate(ctx, x, y, w, h, k): turn a painted (antialiased) region into pixel art
// A section's radii are K control radii round the spine (theta 0 = the section's up side, PI / 2 = +side (the animal's
// left when the spine runs forward), PI = down), Catmull-Rom interpolated round the ring and along the spine, so the
// surface is smooth both ways. The UV seam sits on the underside (u = 0 / 1 at theta = PI).
import * as THREE from 'three';

export const K = 24;
const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const cr = (p0, p1, p2, p3, t) => {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
};
/** Wrapped angular distance. */
export const adist = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

/**
 * A cross-section: a superellipse w (half-width), up / dn (half-heights above / below the spine), p (2 = ellipse,
 * higher is boxier), with optional bumps [[theta, amp (m), width (rad)], ...] and a zig-zag fur fringe
 * { from, to (theta), n (tufts), amp }.
 */
export function egg(w, up, dn = up, o = {}) {
  const p = o.p ?? 2, r = new Float32Array(K);
  for (let k = 0; k < K; k++) {
    const th = (k / K) * TAU, sx = Math.sin(th), sy = Math.cos(th);
    const h = sy >= 0 ? up : dn, ww = sx >= 0 ? (o.wl ?? w) : (o.wr ?? w);
    let v = 1 / Math.pow(Math.abs(sx / ww) ** p + Math.abs(sy / h) ** p, 1 / p);
    for (const [t0, a, s] of o.bumps || []) { const d = adist(th, t0) / s; v += a * Math.exp(-d * d); }
    r[k] = Math.max(0, v);
  }
  return r;
}
export const scaleR = (r, s) => r.map((v) => v * s);

/** Fur tufts on a radius function: a saw-tooth fringe over [from, to] (theta), n teeth, amp metres. */
export function fringe(r, from, to, n, amp) {
  const out = Float32Array.from(r);
  for (let k = 0; k < K; k++) {
    const th = (k / K) * TAU;
    let d = adist(th, from); if (d < 0) d += TAU;
    const span = ((to - from) % TAU + TAU) % TAU;
    if (d > span) continue;
    const x = (d / span) * n, f = x - Math.floor(x), env = Math.sin((d / span) * Math.PI);
    out[k] += amp * env * (f < 0.5 ? f * 2 : 2 - f * 2);
  }
  return out;
}

/** Block mode (the default): every loft is a stack of chamfered block segments, like the people (src/people/mesh.js). */
export const BLOCK = { on: true, ch: 0.32 };

/** The chamfered box ring in a section's frame: [side, up] points from the bottom centre round to it again (10). */
function boxRing(r, ch, out = []) {
  const U = r[0], L = r[K / 4], D = r[K / 2], R = r[(3 * K) / 4];
  const cb = ch * Math.min(L + R, U + D) * 0.5, cu = Math.min(cb, U * 0.8, L * 0.8, R * 0.8), cd = Math.min(cb, D * 0.8, L * 0.8, R * 0.8);
  const P = [[0, -D], [-R + cd, -D], [-R, -D + cd], [-R, U - cu], [-R + cu, U], [L - cu, U], [L, U - cu], [L, -D + cd], [L - cd, -D], [0, -D]];
  for (let k = 0; k < 10; k++) { out[k] ||= [0, 0]; out[k][0] = P[k][0]; out[k][1] = P[k][1]; }
  return out;
}

export class Loft {
  /**
   * sections: [{ p, r (K radii), up? }]; o.cap: [start, end] end lengths (0 = open end). In block mode (o.smooth unset)
   * a section is a chamfered box (its extents up / down / to each side, chamfer o.ch), joined to the next by flat
   * tapered faces, and the ends are bevelled flat caps; o.smooth: the Catmull-Rom loft of round rings.
   */
  constructor(sections, o = {}) {
    this.block = BLOCK.on && !o.smooth;
    this.ch = o.ch ?? BLOCK.ch;
    const S = sections.map((s) => ({ p: s.p.slice(), r: Float32Array.from(s.r), up: (s.up || o.up || [0, 1, 0]).slice() }));
    const [c0, c1] = o.cap || [0, 0];
    const dome = (end, len) => {
      if (!(len > 0)) return [];
      const a = end ? S[S.length - 1] : S[0], b = end ? S[S.length - 2] : S[1];
      const d = new THREE.Vector3(...a.p).sub(new THREE.Vector3(...b.p)).normalize();
      const out = [], m = o.capSteps || 4;
      if (this.block) {
        // a bevel, then the flat end face (its last ring collapses onto the centre at the same depth)
        for (const [f, s] of [[0.55, 0.84], [1, 0.52], [1, 0]]) out.push({ p: [a.p[0] + d.x * len * f, a.p[1] + d.y * len * f, a.p[2] + d.z * len * f], r: a.r.map((v) => v * s), up: a.up });
        return end ? out : out.reverse();
      }
      for (let k = 1; k <= m; k++) {
        const ang = (k / m) * Math.PI / 2, s = Math.cos(ang), off = len * Math.sin(ang);
        out.push({ p: [a.p[0] + d.x * off, a.p[1] + d.y * off, a.p[2] + d.z * off], r: a.r.map((v) => v * (k === m ? 0 : s)), up: a.up });
      }
      return end ? out : out.reverse();
    };
    this.S = [...dome(false, c0), ...S, ...dome(true, c1)];
    this.n = this.S.length;
    if (this.block) {
      // fixed u for the ring's corners (by the perimeter of the largest section): every face maps to a straight band of
      // the atlas, so the painted texels lie exactly on the flat faces
      let best = null, bl = -1;
      for (const sc of this.S) {
        const R = boxRing(sc.r, this.ch);
        let l = 0; for (let k = 1; k < 10; k++) l += Math.hypot(R[k][0] - R[k - 1][0], R[k][1] - R[k - 1][1]);
        if (l > bl) { bl = l; best = R; }
      }
      const cum = [0];
      for (let k = 1; k < 10; k++) cum.push(cum[k - 1] + Math.hypot(best[k][0] - best[k - 1][0], best[k][1] - best[k - 1][1]));
      this.ringU = cum.map((c) => (bl > 0 ? c / bl : 0));
      this.ringU[9] = 1;
    }
  }
  /** Block mode: the u of the ring's vertices and the v of every section (where a part puts its vertices). */
  grid() { return { us: this.ringU.slice(), vs: this.S.map((_, k) => k / (this.n - 1)) }; }

  /** Spine centre, radii (K) and up hint at t (0..n-1). */
  at(t, out) {
    const S = this.S, n = this.n, i = clamp(Math.floor(t), 0, n - 2), f = t - i;
    if (this.block) {
      const b = S[i], c = S[i + 1];
      for (let q = 0; q < 3; q++) { out.p[q] = b.p[q] + (c.p[q] - b.p[q]) * f; out.up[q] = b.up[q] + (c.up[q] - b.up[q]) * f; }
      for (let k = 0; k < K; k++) out.r[k] = Math.max(0, b.r[k] + (c.r[k] - b.r[k]) * f);
      return out;
    }
    const a = S[Math.max(0, i - 1)], b = S[i], c = S[i + 1], d = S[Math.min(n - 1, i + 2)];
    for (let q = 0; q < 3; q++) { out.p[q] = cr(a.p[q], b.p[q], c.p[q], d.p[q], f); out.up[q] = b.up[q] + (c.up[q] - b.up[q]) * f; }
    for (let k = 0; k < K; k++) out.r[k] = Math.max(0, cr(a.r[k], b.r[k], c.r[k], d.r[k], f));
    return out;
  }

  /** Positions and normals on the grid us x vs (both 0..1; u wraps). P/N: Float32Array (nv * nu * 3). */
  sample(us, vs) {
    const nu = us.length, nv = vs.length, P = new Float32Array(nu * nv * 3), N = new Float32Array(nu * nv * 3);
    const T = new Float32Array(nv * 3), pole = new Uint8Array(nv);
    const A = { p: [0, 0, 0], up: [0, 0, 0], r: new Float32Array(K) }, B = { p: [0, 0, 0], up: [0, 0, 0], r: new Float32Array(K) };
    const t3 = new THREE.Vector3(), u3 = new THREE.Vector3(), s3 = new THREE.Vector3(), w3 = new THREE.Vector3();
    for (let j = 0; j < nv; j++) {
      const t = clamp(vs[j], 0, 1) * (this.n - 1), e = 0.004;
      this.at(Math.min(this.n - 1, t + e), A); this.at(Math.max(0, t - e), B);
      t3.set(A.p[0] - B.p[0], A.p[1] - B.p[1], A.p[2] - B.p[2]).normalize();
      T[j * 3] = t3.x; T[j * 3 + 1] = t3.y; T[j * 3 + 2] = t3.z;
      this.at(t, A);
      u3.set(A.up[0], A.up[1], A.up[2]);
      s3.crossVectors(u3, t3).normalize();
      w3.crossVectors(t3, s3).normalize();
      let rmax = 0;
      if (this.block) {
        const R = boxRing(A.r, this.ch, this._ring || (this._ring = [])), RU = this.ringU;
        for (let i = 0; i < nu; i++) {
          const u = ((us[i] % 1) + 1) % 1 || (us[i] >= 1 ? 1 : 0);
          let k = 0; while (k < 8 && u > RU[k + 1]) k++;
          const f = (u - RU[k]) / Math.max(1e-9, RU[k + 1] - RU[k]);
          const sx = R[k][0] + (R[k + 1][0] - R[k][0]) * f, sy = R[k][1] + (R[k + 1][1] - R[k][1]) * f;
          rmax = Math.max(rmax, Math.abs(sx), Math.abs(sy));
          const o = (j * nu + i) * 3;
          P[o] = A.p[0] + s3.x * sx + w3.x * sy; P[o + 1] = A.p[1] + s3.y * sx + w3.y * sy; P[o + 2] = A.p[2] + s3.z * sx + w3.z * sy;
        }
        pole[j] = rmax < 1e-5 ? 1 : 0;
        continue;
      }
      for (let i = 0; i < nu; i++) {
        const x = (((us[i] % 1) + 1) % 1) * K, k = Math.floor(x) % K, f = x - Math.floor(x);
        const r = cr(A.r[(k + K - 1) % K], A.r[k], A.r[(k + 1) % K], A.r[(k + 2) % K], f);
        const th = us[i] * TAU + Math.PI, sx = Math.sin(th) * Math.max(0, r), sy = Math.cos(th) * Math.max(0, r);
        rmax = Math.max(rmax, r);
        const o = (j * nu + i) * 3;
        P[o] = A.p[0] + s3.x * sx + w3.x * sy; P[o + 1] = A.p[1] + s3.y * sx + w3.y * sy; P[o + 2] = A.p[2] + s3.z * sx + w3.z * sy;
      }
      pole[j] = rmax < 1e-5 ? 1 : 0;
    }
    // normals: central differences round the ring and along the spine (a pole points along the spine)
    const a = new THREE.Vector3(), b = new THREE.Vector3(), nn = new THREE.Vector3();
    const get = (i, j, v) => { const o = (j * nu + i) * 3; return v.set(P[o], P[o + 1], P[o + 2]); };
    const wrapI = (i) => { const last = Math.abs(us[nu - 1] - us[0] - 1) < 1e-6 ? nu - 1 : nu; return ((i % last) + last) % last; };
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const o = (j * nu + i) * 3;
      if (pole[j]) { const s = j === 0 ? -1 : 1; N[o] = T[j * 3] * s; N[o + 1] = T[j * 3 + 1] * s; N[o + 2] = T[j * 3 + 2] * s; continue; }
      get(wrapI(i + 1), j, a).sub(get(wrapI(i - 1), j, b));
      const j0 = Math.max(0, j - 1), j1 = Math.min(nv - 1, j + 1);
      const c = get(i, j1, new THREE.Vector3()).sub(get(i, j0, nn));
      if (c.lengthSq() < 1e-14) c.set(T[j * 3], T[j * 3 + 1], T[j * 3 + 2]);
      nn.crossVectors(c, a).normalize();
      N[o] = nn.x; N[o + 1] = nn.y; N[o + 2] = nn.z;
    }
    return { P, N, nu, nv };
  }
}

/** Skin weights along a chain: bones [b0, b1, ...] meeting at joints vs [v1, v2, ...] (0..1), blended over +-blend. */
export function chain(bones, joints, blend = 0.08) {
  return (v) => {
    let k = 0;
    while (k < joints.length && v > joints[k]) k++;
    // nearest joint for blending
    let best = -1, bd = 1e9;
    for (let q = 0; q < joints.length; q++) { const d = Math.abs(v - joints[q]); if (d < bd) { bd = d; best = q; } }
    if (best >= 0 && bd < blend) {
      const s = smooth(-blend, blend, v - joints[best]);
      return [[bones[best], 1 - s], [bones[best + 1], s]];
    }
    return [[bones[k], 1]];
  };
}

/**
 * Collects lofted parts (and loose geometry) into one skinned BufferGeometry and paints one atlas.
 * part(loft, { rect: [x, y, w, h] px, cols, rows, skin: (v, P) => [[bone, w], ...], paint: (P, N, u, v) => 0xrrggbb,
 *              vRange: [v0, v1] (a slice of the loft), flipNormals })
 */
export class Builder {
  /**
   * o.px: default texel block (atlas texels per painted pixel); o.grain: default texture strength (0 = flat);
   * o.coat: 'fur' | 'feather' | 'leather' (the texture's kind, also per part); o.mute: how far colours are greyed (0..1).
   */
  constructor(W, H, gutter = 3, o = {}) {
    this.W = W; this.H = H; this.g = gutter; this.px = o.px || 1; this.grain = o.grain || 0; this.coat = o.coat || 'fur'; this.mute = o.mute ?? 0.12;
    this.pos = []; this.nrm = []; this.uv = []; this.si = []; this.sw = []; this.idx = [];
  }
  /** The atlas canvas, made on first use (a geometry-only build never paints). */
  get img() {
    if (!this._img) { this.cv = document.createElement('canvas'); this.cv.width = this.W; this.cv.height = this.H; this.ctx = this.cv.getContext('2d', { willReadFrequently: true }); this._img = this.ctx.createImageData(this.W, this.H); }
    return this._img;
  }
  get count() { return this.pos.length / 3; }
  vert(p, n, uv, skin) {
    this.pos.push(p[0], p[1], p[2]); this.nrm.push(n[0], n[1], n[2]); this.uv.push(uv[0], uv[1]);
    const s = (skin || [[0, 1]]).slice().sort((a, b) => b[1] - a[1]).slice(0, 4);
    const tot = s.reduce((a, b) => a + b[1], 0) || 1;
    for (let q = 0; q < 4; q++) { this.si.push(s[q] ? s[q][0] : 0); this.sw.push(s[q] ? s[q][1] / tot : 0); }
    return this.count - 1;
  }

  part(loft, o) {
    const [rx, ry, rw, rh] = o.rect, [v0, v1] = o.vRange || [0, 1];
    let us = [], vs = [], cols = o.cols, rows = o.rows;
    if (loft.block) {
      // block segments: a vertex at each corner of the ring, a ring at each section (flat faces between)
      const G = loft.grid();
      us = G.us; vs = G.vs.filter((v) => v >= v0 - 1e-9 && v <= v1 + 1e-9);
      cols = us.length - 1; rows = vs.length;
    } else {
      for (let i = 0; i <= cols; i++) us.push(i / cols);
      for (let j = 0; j < rows; j++) vs.push(v0 + (v1 - v0) * (j / (rows - 1)));
    }
    const S = loft.sample(us, vs), base = this.count, flip = o.flipNormals ? -1 : 1;
    for (let j = 0; j < rows; j++) for (let i = 0; i <= cols; i++) {
      const q = (j * (cols + 1) + i) * 3, p = [S.P[q], S.P[q + 1], S.P[q + 2]];
      this.vert(p, [S.N[q] * flip, S.N[q + 1] * flip, S.N[q + 2] * flip], [(rx + us[i] * rw) / this.W, (ry + ((vs[j] - v0) / (v1 - v0)) * rh) / this.H], o.skin(vs[j], p, us[i]));
    }
    for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols; i++) {
      const a = base + j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1;
      if (o.flipNormals) this.idx.push(a, b, c, b, d, c); else this.idx.push(a, c, b, b, c, d);
    }
    if (o.paint) this.paintLoft(loft, o);
    return { base, cols, rows, S };
  }

  /**
   * Paint a part's rect (plus gutter) from its 3D rest position, one colour per block of px x px texels (sampled at the
   * block's centre), with the fur grain: short strand ticks two blocks long along the spine, a shade darker (or a
   * lighter tick on lit fur), placed by a hash of the block, never smooth noise.
   */
  paintLoft(loft, o) {
    const [rx, ry, rw, rh] = o.rect, g = this.g, [v0, v1] = o.vRange || [0, 1], k = o.px || this.px, gr = o.grain ?? this.grain;
    const b0 = Math.floor(-g / k), bi1 = Math.ceil((rw + g) / k), bj1 = Math.ceil((rh + g) / k);
    const us = [], vs = [];
    for (let i = b0; i < bi1; i++) us.push((i * k + k / 2) / rw);
    for (let j = b0; j < bj1; j++) vs.push(v0 + (v1 - v0) * clamp((j * k + k / 2) / rh, 0, 1));
    const S = loft.sample(us, vs), D = this.img.data, flip = o.flipNormals ? -1 : 1;
    const P = new THREE.Vector3(), N = new THREE.Vector3();
    for (let j = 0; j < vs.length; j++) {
      for (let i = 0; i < us.length; i++) {
        const q = (j * us.length + i) * 3;
        P.set(S.P[q], S.P[q + 1], S.P[q + 2]); N.set(S.N[q] * flip, S.N[q + 1] * flip, S.N[q + 2] * flip);
        let c = o.paint(P, N, us[i], vs[j]);
        if (c >= 0) c = coatTexel(c, P, N, i + b0, j + b0, gr, o.coat || this.coat, o.mute ?? this.mute);
        const cr = (c >> 16) & 255, cg = (c >> 8) & 255, cb = c & 255;
        for (let y = ry + (j + b0) * k, y1 = y + k; y < y1; y++) {
          if (y < ry - g || y >= ry + rh + g || y < 0 || y >= this.H) continue;
          for (let x = rx + (i + b0) * k, x1 = x + k; x < x1; x++) {
            if (x < rx - g || x >= rx + rw + g || x < 0 || x >= this.W) continue;
            const d = (y * this.W + x) * 4;
            D[d] = cr; D[d + 1] = cg; D[d + 2] = cb; D[d + 3] = 255;
          }
        }
      }
    }
  }

  /** Loose triangles (whiskers, claws...): positions / normals arrays, one uv for all, one skin. */
  loose(geo, uv, skin) {
    const P = geo.attributes.position, Nn = geo.attributes.normal, base = this.count;
    for (let i = 0; i < P.count; i++) this.vert([P.getX(i), P.getY(i), P.getZ(i)], [Nn.getX(i), Nn.getY(i), Nn.getZ(i)], uv, skin);
    const I = geo.index;
    if (I) for (let i = 0; i < I.count; i++) this.idx.push(base + I.getX(i)); else for (let i = 0; i < P.count; i++) this.idx.push(base + i);
  }

  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.sw, 4));
    g.setIndex(this.idx);
    g.computeBoundingBox(); g.computeBoundingSphere();
    return g;
  }

  /** The painted atlas: crisp pixel art (nearest up close), mipmapped so it never shimmers at a distance. */
  texture(extra) {
    const img = this.img;
    this.ctx.putImageData(img, 0, 0);
    extra?.(this.ctx);
    return pixelTexture(this.cv);
  }
}

/** A canvas as a pixel-art texture: nearest magnification, trilinear mipmaps (the voxel detail's filtering). */
export function pixelTexture(cv) {
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.anisotropy = 4;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  return t;
}

/**
 * Turn a painted, antialiased region of a canvas into pixel art: one colour per k x k block, the block's most common
 * colour (exact painted colours only, never a blend), except that ink (dark) or a catchlight (near white) covering a
 * quarter of the block wins, so thin lines and highlights survive. Fully transparent blocks stay transparent.
 */
export function pixelate(ctx, x0, y0, w, h, k) {
  const im = ctx.getImageData(x0, y0, w, h), d = im.data;
  for (let by = 0; by < h; by += k) for (let bx = 0; bx < w; bx += k) {
    const cnt = new Map();
    let n = 0;
    for (let y = by; y < Math.min(h, by + k); y++) for (let x = bx; x < Math.min(w, bx + k); x++) {
      const o = (y * w + x) * 4;
      n++;
      if (d[o + 3] < 128) { cnt.set(-1, (cnt.get(-1) || 0) + 1); continue; }
      const c = (d[o] << 16) | (d[o + 1] << 8) | d[o + 2];
      cnt.set(c, (cnt.get(c) || 0) + 1);
    }
    let best = -1, bn = -1, ink = -1, inkN = 0, hi = -1, hiN = 0;
    for (const [c, m] of cnt) {
      if (m > bn) { bn = m; best = c; }
      if (c < 0) continue;
      const l = (((c >> 16) & 255) * 0.3 + ((c >> 8) & 255) * 0.55 + (c & 255) * 0.15) / 255;
      if (l < 0.2 && m > inkN) { inkN = m; ink = c; }
      if (l > 0.93 && m > hiN) { hiN = m; hi = c; }
    }
    if (hi >= 0 && hiN >= n * 0.25 && best !== hi) best = hi;
    else if (ink >= 0 && inkN >= n * 0.25) best = ink;
    for (let y = by; y < Math.min(h, by + k); y++) for (let x = bx; x < Math.min(w, bx + k); x++) {
      const o = (y * w + x) * 4;
      if (best < 0) { d[o + 3] = 0; continue; }
      d[o] = (best >> 16) & 255; d[o + 1] = (best >> 8) & 255; d[o + 2] = best & 255; d[o + 3] = 255;
    }
  }
  ctx.putImageData(im, x0, y0);
}

const _lum = (c) => (((c >> 16) & 255) * 0.3 + ((c >> 8) & 255) * 0.55 + (c & 255) * 0.15) / 255;
/** Value noise in 0..1 on a 3D lattice (smoothstepped trilinear): the soft clumping of a coat, before it is stepped. */
export function vnoise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const h = (a, b, c) => hash2i((a * 73 + c * 151) & 0xffff, (b * 197 + c * 37) & 0xffff);
  const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf), sz = zf * zf * (3 - 2 * zf);
  const l = (a, b, t) => a + (b - a) * t;
  return l(l(l(h(xi, yi, zi), h(xi + 1, yi, zi), sx), l(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), sx), sy),
    l(l(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), sx), l(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), sx), sy), sz);
}

/**
 * One painted pixel of a real coat, from the painter's colour c at rest point P (normal N), block (bi, bj) (bj runs
 * along the spine / limb): colour clumps (the fur parting and lying in tufts, a few % lighter or darker, stepped),
 * then the kind's texture by rule, then a slight greying to the game's natural palette.
 *   fur: hairs three pixels long, staggered: a dark root in the undercoat, the hair, a lit tip on fur facing up
 *   feather: overlapping feathers, a dark edge row and a pale tip row, staggered every other column pair
 *   leather: the pebbled skin of a nose or a pad
 */
export function coatTexel(c, P, N, bi, bj, gr, kind = 'fur', mute = 0.12) {
  if (gr > 0) {
    const pale = _lum(c) > 0.75 ? 0.55 : _lum(c) < 0.18 ? 1.5 : 1, g = gr * pale;
    const n = vnoise3(P.x * 95, P.y * 95, P.z * 95), q = n < 0.36 ? -1 : n > 0.64 ? 1 : 0;
    if (q) c = shade(c, q * g * 0.45);
    const bx = ((bi % 4096) + 4096) % 4096;
    if (kind === 'fur') {
      const off = Math.floor(hash2i(bx, 977) * 3), st = bj + off, id = Math.floor(st / 3), pos = st - id * 3, h = hash2i(bx, id & 0xffff);
      if (h < 0.42) c = pos === 0 ? shade(c, -g) : pos === 2 ? (N.y > -0.3 ? shade(c, g * 0.6) : c) : shade(c, -g * 0.3);
      else if (h > 0.96) c = shade(c, g * 0.45);
    } else if (kind === 'feather') {
      const col = bx >> 1, st = bj + (col & 1) * 2, pos = ((st % 4) + 4) % 4, h = hash2i(col, st >> 2 & 0xffff);
      if (pos === 0 && h < 0.75) c = shade(c, -g * 0.8); else if (pos === 3) c = shade(c, g * 0.35);
      else if (h > 0.9) c = shade(c, -g * 0.3);
    } else if (kind === 'leather') {
      const h = hash2i(bx, ((bj % 4096) + 4096) % 4096);
      if (h < 0.3) c = shade(c, -g * 0.8); else if (h > 0.86) c = shade(c, g * 0.6);
    }
  }
  if (mute > 0) { const l = Math.round(_lum(c) * 255); c = mixc(c, (l << 16) | (l << 8) | l, mute); }
  return c;
}

/** A hash of two integers in 0..1 (placing painted marks by rule). */
export function hash2i(a, b) {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ------------------------------------------------------------------ colour helpers
export const rgb = (c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
export const mixc = (a, b, t) => {
  t = clamp(t, 0, 1);
  const r = ((a >> 16) & 255) + ((((b >> 16) & 255) - ((a >> 16) & 255)) * t), g = ((a >> 8) & 255) + ((((b >> 8) & 255) - ((a >> 8) & 255)) * t), bl = (a & 255) + (((b & 255) - (a & 255)) * t);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
};
const COOL = 0x2a2238, WARM = 0xfff6e4;
/** Darker (cool, plum) / lighter (warm) tone of a colour: the painted shading steps. */
export const shade = (c, k) => (k < 0 ? mixc(c, COOL, -k) : mixc(c, WARM, k));

/** A tapered strand (whisker, claw) as a thin triangular tube along pts, radius r0 -> r1. */
export function strand(pts, r0, r1, sides = 3) {
  const pos = [], nrm = [], idx = [];
  const P = pts.map((p) => new THREE.Vector3(...p)), n = P.length;
  const t = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    t.subVectors(P[Math.min(n - 1, i + 1)], P[Math.max(0, i - 1)]).normalize();
    a.crossVectors(Math.abs(t.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : up, t).normalize(); b.crossVectors(t, a);
    const r = r0 + (r1 - r0) * (i / (n - 1));
    for (let s = 0; s < sides; s++) {
      const ang = (s / sides) * TAU, cx = Math.cos(ang), sy = Math.sin(ang);
      pos.push(P[i].x + (a.x * cx + b.x * sy) * r, P[i].y + (a.y * cx + b.y * sy) * r, P[i].z + (a.z * cx + b.z * sy) * r);
      nrm.push(a.x * cx + b.x * sy, a.y * cx + b.y * sy, a.z * cx + b.z * sy);
    }
  }
  for (let i = 0; i < n - 1; i++) for (let s = 0; s < sides; s++) {
    const p = i * sides + s, q = i * sides + ((s + 1) % sides);
    idx.push(p, q, p + sides, q, q + sides, p + sides);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setIndex(idx);
  return g;
}

/**
 * Skin weights from a bone polyline: pts [p0, p1, ... pn] (rest positions), bones [b0 .. b(n-1)] (bone k rides the
 * segment pk -> pk+1). A vertex follows the segment it is nearest to, blended across each joint over `blend` metres
 * (a number, or one per joint).
 */
export function polySkin(pts, bones, blend = 0.02) {
  const P = pts.map((p) => new THREE.Vector3(...p)), L = [0];
  for (let k = 1; k < P.length; k++) L.push(L[k - 1] + P[k].distanceTo(P[k - 1]));
  const d = new THREE.Vector3(), q = new THREE.Vector3(), v = new THREE.Vector3();
  return (_v, p) => {
    v.set(p[0], p[1], p[2]);
    let best = 1e9, arc = 0;
    for (let k = 0; k + 1 < P.length; k++) {
      d.subVectors(P[k + 1], P[k]);
      const len2 = d.lengthSq(), t = clamp(q.subVectors(v, P[k]).dot(d) / len2, 0, 1);
      const dist = q.copy(P[k]).addScaledVector(d, t).distanceToSquared(v);
      if (dist < best - 1e-12) { best = dist; arc = L[k] + t * (L[k + 1] - L[k]); }
    }
    let k = 0;
    while (k < bones.length - 1 && arc > L[k + 1]) k++;
    // blend with the neighbour across the nearer joint
    const toEnd = L[k + 1] - arc, toStart = arc - L[k], bE = Array.isArray(blend) ? blend[k] : blend, bS = Array.isArray(blend) ? blend[k - 1] : blend;
    if (k + 1 < bones.length && toEnd < bE) { const s = smooth(-bE, bE, -toEnd); return [[bones[k], 1 - s], [bones[k + 1], s]]; }
    if (k > 0 && toStart < bS) { const s = smooth(-bS, bS, toStart); return [[bones[k - 1], 1 - s], [bones[k], s]]; }
    return [[bones[k], 1]];
  };
}
