// Sparse voxel model with a small library of "sculpting" primitives.
// Coordinates are integers. +y is up, +z faces the viewer (front), +x is right.
// A voxel value packs a 24-bit sRGB colour with a material id in the high bits.

export const MAT = {
  MATTE: 0, // soft plastic / vinyl / paint
  GLOSS: 1, // shiny enamel / glossy plastic
  METAL: 2, // chrome, steel, brass
  GLOW: 3, // emissive (lights, screens, neon)
  GLASS: 4, // transparent (windows, jelly, ice)
};

const OFF = 512;
const key = (x, y, z) => (x + OFF) + (y + OFF) * 1024 + (z + OFF) * 1048576;

/** Encode colour + material. `c` may already be an encoded value. */
export function enc(c, mat = MAT.MATTE) {
  if (c === null || c === undefined) return null;
  if (c >= 0x1000000) return c; // already encoded with a material
  return (c & 0xffffff) + mat * 0x1000000 + 0x8000000; // bit 27 = "explicit" flag
}
export const decColor = (v) => v & 0xffffff;
export const decMat = (v) => (v >= 0x8000000 ? Math.floor((v - 0x8000000) / 0x1000000) : 0);

// Material helpers: v.box(..., gloss(0xff0000))
export const matte = (c) => enc(c, MAT.MATTE);
export const gloss = (c) => enc(c, MAT.GLOSS);
export const metal = (c) => enc(c, MAT.METAL);
export const glow = (c) => enc(c, MAT.GLOW);
export const glass = (c) => enc(c, MAT.GLASS);

export class VoxelModel {
  constructor() {
    this.map = new Map();
    this._paint = false;
    this.jitter = 0.035; // subtle per-voxel colour variation for a hand-painted feel
    this.pivot = null; // optional {x,y,z} override for mesh origin
  }

  // ---------------------------------------------------------------- basics
  set(x, y, z, c) {
    x = Math.round(x); y = Math.round(y); z = Math.round(z);
    const k = key(x, y, z);
    if (c === null || c === undefined) {
      if (!this._paint) this.map.delete(k);
      return this;
    }
    if (this._paint && !this.map.has(k)) return this;
    this.map.set(k, enc(c));
    return this;
  }
  get(x, y, z) {
    const v = this.map.get(key(x, y, z));
    return v === undefined ? null : v;
  }
  has(x, y, z) { return this.map.has(key(x, y, z)); }
  remove(x, y, z) { this.map.delete(key(x, y, z)); return this; }
  get count() { return this.map.size; }

  /** Iterate voxels: fn(x, y, z, value) */
  forEach(fn) {
    for (const [k, v] of this.map) {
      const x = (k % 1024) - OFF;
      const y = (Math.floor(k / 1024) % 1024) - OFF;
      const z = Math.floor(k / 1048576) - OFF;
      fn(x, y, z, v);
    }
  }

  bounds() {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    this.forEach((x, y, z) => {
      if (x < minX) minX = x; if (y < minY) minY = y; if (z < minZ) minZ = z;
      if (x > maxX) maxX = x; if (y > maxY) maxY = y; if (z > maxZ) maxZ = z;
    });
    if (minX === Infinity) return { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0, w: 0, h: 0, d: 0 };
    return { minX, minY, minZ, maxX, maxY, maxZ, w: maxX - minX + 1, h: maxY - minY + 1, d: maxZ - minZ + 1 };
  }

  /** Run `fn` in paint mode: shapes only recolour voxels that already exist. */
  paint(fn) {
    const prev = this._paint;
    this._paint = true;
    try { fn(this); } finally { this._paint = prev; }
    return this;
  }

  // ------------------------------------------------------------ primitives
  /** Axis-aligned box, inclusive corners in any order. */
  box(x0, y0, z0, x1, y1, z1, c) {
    const [ax, bx] = x0 < x1 ? [x0, x1] : [x1, x0];
    const [ay, by] = y0 < y1 ? [y0, y1] : [y1, y0];
    const [az, bz] = z0 < z1 ? [z0, z1] : [z1, z0];
    for (let x = ax; x <= bx; x++) for (let y = ay; y <= by; y++) for (let z = az; z <= bz; z++) this.set(x, y, z, c);
    return this;
  }

  /** Box shell with wall thickness t (open = array of faces to leave open: 'top','bottom','front','back','left','right'). */
  hollowBox(x0, y0, z0, x1, y1, z1, c, t = 1, open = []) {
    const [ax, bx] = x0 < x1 ? [x0, x1] : [x1, x0];
    const [ay, by] = y0 < y1 ? [y0, y1] : [y1, y0];
    const [az, bz] = z0 < z1 ? [z0, z1] : [z1, z0];
    for (let x = ax; x <= bx; x++) for (let y = ay; y <= by; y++) for (let z = az; z <= bz; z++) {
      const left = x < ax + t, right = x > bx - t, bottom = y < ay + t, top = y > by - t, back = z < az + t, front = z > bz - t;
      const onWall = (left && !open.includes('left')) || (right && !open.includes('right')) ||
        (bottom && !open.includes('bottom')) || (top && !open.includes('top')) ||
        (back && !open.includes('back')) || (front && !open.includes('front'));
      if (onWall) this.set(x, y, z, c);
    }
    return this;
  }

  /** Generic shape inside bounding box: test(x,y,z) => boolean */
  shape(x0, y0, z0, x1, y1, z1, test, c) {
    const [ax, bx] = x0 < x1 ? [x0, x1] : [x1, x0];
    const [ay, by] = y0 < y1 ? [y0, y1] : [y1, y0];
    const [az, bz] = z0 < z1 ? [z0, z1] : [z1, z0];
    for (let x = ax; x <= bx; x++) for (let y = ay; y <= by; y++) for (let z = az; z <= bz; z++) {
      if (test(x, y, z)) this.set(x, y, z, typeof c === 'function' ? c(x, y, z) : c);
    }
    return this;
  }

  /** Sphere centred at (cx,cy,cz). Half-integer centres work for even diameters. */
  sphere(cx, cy, cz, r, c) {
    return this.ellipsoid(cx, cy, cz, r, r, r, c);
  }

  ellipsoid(cx, cy, cz, rx, ry, rz, c) {
    const e = 0.15; // slightly generous so small spheres look round
    return this.shape(
      Math.floor(cx - rx), Math.floor(cy - ry), Math.floor(cz - rz),
      Math.ceil(cx + rx), Math.ceil(cy + ry), Math.ceil(cz + rz),
      (x, y, z) => {
        const dx = (x - cx) / (rx + e), dy = (y - cy) / (ry + e), dz = (z - cz) / (rz + e);
        return dx * dx + dy * dy + dz * dz <= 1;
      }, c);
  }

  /** Cylinder: base centre (cx,cy,cz), radius r, length h along axis ('x'|'y'|'z'). */
  cylinder(cx, cy, cz, r, h, c, axis = 'y') {
    const e = 0.2;
    const rr = (r + e) * (r + e);
    if (axis === 'y') return this.shape(Math.floor(cx - r), cy, Math.floor(cz - r), Math.ceil(cx + r), cy + h - 1, Math.ceil(cz + r),
      (x, y, z) => (x - cx) ** 2 + (z - cz) ** 2 <= rr, c);
    if (axis === 'x') return this.shape(cx, Math.floor(cy - r), Math.floor(cz - r), cx + h - 1, Math.ceil(cy + r), Math.ceil(cz + r),
      (x, y, z) => (y - cy) ** 2 + (z - cz) ** 2 <= rr, c);
    return this.shape(Math.floor(cx - r), Math.floor(cy - r), cz, Math.ceil(cx + r), Math.ceil(cy + r), cz + h - 1,
      (x, y, z) => (x - cx) ** 2 + (y - cy) ** 2 <= rr, c);
  }

  /** Tube (pipe) between radii. */
  tube(cx, cy, cz, rOuter, rInner, h, c, axis = 'y') {
    const e = 0.2;
    const ro = (rOuter + e) ** 2, ri = (rInner + e) ** 2;
    const test = (a, b) => { const d = a * a + b * b; return d <= ro && d > ri; };
    if (axis === 'y') return this.shape(Math.floor(cx - rOuter), cy, Math.floor(cz - rOuter), Math.ceil(cx + rOuter), cy + h - 1, Math.ceil(cz + rOuter),
      (x, y, z) => test(x - cx, z - cz), c);
    if (axis === 'x') return this.shape(cx, Math.floor(cy - rOuter), Math.floor(cz - rOuter), cx + h - 1, Math.ceil(cy + rOuter), Math.ceil(cz + rOuter),
      (x, y, z) => test(y - cy, z - cz), c);
    return this.shape(Math.floor(cx - rOuter), Math.floor(cy - rOuter), cz, Math.ceil(cx + rOuter), Math.ceil(cy + rOuter), cz + h - 1,
      (x, y, z) => test(x - cx, y - cy), c);
  }

  /** Cone with base centre (cx,cy,cz), base radius r, tip at +h along axis (negative h points the other way). */
  cone(cx, cy, cz, r, h, c, axis = 'y') {
    const n = Math.abs(h), s = Math.sign(h) || 1;
    for (let i = 0; i < n; i++) {
      const rr = r * (1 - i / n);
      if (rr < 0.3) { this.set(axis === 'x' ? cx + s * i : cx, axis === 'y' ? cy + s * i : cy, axis === 'z' ? cz + s * i : cz, c); continue; }
      if (axis === 'y') this.cylinder(cx, cy + s * i, cz, rr, 1, c, 'y');
      else if (axis === 'x') this.cylinder(cx + s * i, cy, cz, rr, 1, c, 'x');
      else this.cylinder(cx, cy, cz + s * i, rr, 1, c, 'z');
    }
    return this;
  }

  /** Torus (ring) around axis. R = major radius, r = minor radius. */
  torus(cx, cy, cz, R, r, c, axis = 'y') {
    const e = 0.2;
    const ext = R + r + 1;
    return this.shape(Math.floor(cx - ext), Math.floor(cy - ext), Math.floor(cz - ext), Math.ceil(cx + ext), Math.ceil(cy + ext), Math.ceil(cz + ext),
      (x, y, z) => {
        let a, b, h;
        if (axis === 'y') { a = x - cx; b = z - cz; h = y - cy; }
        else if (axis === 'x') { a = y - cy; b = z - cz; h = x - cx; }
        else { a = x - cx; b = y - cy; h = z - cz; }
        const q = Math.sqrt(a * a + b * b) - R;
        return q * q + h * h <= (r + e) * (r + e);
      }, c);
  }

  /** 3D line with optional radius (thickness). */
  line(x0, y0, z0, x1, y1, z1, c, radius = 0) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), 1);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, z = z0 + (z1 - z0) * t;
      if (radius > 0) this.sphere(x, y, z, radius, c);
      else this.set(Math.round(x), Math.round(y), Math.round(z), c);
    }
    return this;
  }

  /**
   * Place a 2D pixel pattern as voxels on a plane.
   * rows: array of strings, rows[0] is the TOP row. legend maps chars to colours ('.' and ' ' are skipped).
   * plane 'xy' (default): x = ox + col, y = oy - row, z = oz.  (front-facing decal / flat cut-out)
   * plane 'xz': x = ox + col, z = oz + row, y = oy.           (floor/top pattern, row 0 = back)
   * plane 'zy': z = oz + col, y = oy - row, x = ox.           (side pattern)
   * depth: extrude this many voxels (along -z for xy, -y for xz, +x for zy).
   */
  layer(rows, legend, { x = 0, y = 0, z = 0, plane = 'xy', depth = 1 } = {}) {
    rows.forEach((row, r) => {
      [...row].forEach((ch, col) => {
        if (ch === '.' || ch === ' ') return;
        const c = legend[ch];
        if (c === undefined) return;
        for (let d = 0; d < depth; d++) {
          if (plane === 'xy') this.set(x + col, y - r, z - d, c);
          else if (plane === 'xz') this.set(x + col, y - d, z + r, c);
          else this.set(x + d, y - r, z + col, c);
        }
      });
    });
    return this;
  }

  /**
   * Project a 2D pixel pattern onto the surface of the model (recolours the first voxel hit).
   * dir: '+z' (seen from the front), '-z' (back), '+x' (right side), '-x' (left side), '+y' (from above).
   * (x, y) is the model coordinate of the pattern's top-left pixel for '+z'/'-z' (x across, y down per row);
   * for '+x'/'-x' the first coordinate is z; for '+y' it is (x, z) with rows going +z.
   * opts.raise = true places a new voxel in front of the surface instead of recolouring (embossed detail).
   */
  project(rows, legend, x0, y0, dir = '+z', opts = {}) {
    const b = this.bounds();
    rows.forEach((row, r) => {
      [...row].forEach((ch, col) => {
        if (ch === '.' || ch === ' ') return;
        const c = legend[ch];
        if (c === undefined) return;
        let hit = null;
        if (dir === '+z' || dir === '-z') {
          const x = x0 + col, y = y0 - r;
          if (dir === '+z') { for (let z = b.maxZ; z >= b.minZ; z--) if (this.has(x, y, z)) { hit = [x, y, z, 0, 0, 1]; break; } }
          else { for (let z = b.minZ; z <= b.maxZ; z++) if (this.has(x, y, z)) { hit = [x, y, z, 0, 0, -1]; break; } }
        } else if (dir === '+x' || dir === '-x') {
          const z = x0 + col, y = y0 - r;
          if (dir === '+x') { for (let x = b.maxX; x >= b.minX; x--) if (this.has(x, y, z)) { hit = [x, y, z, 1, 0, 0]; break; } }
          else { for (let x = b.minX; x <= b.maxX; x++) if (this.has(x, y, z)) { hit = [x, y, z, -1, 0, 0]; break; } }
        } else {
          const x = x0 + col, z = y0 + r;
          for (let y = b.maxY; y >= b.minY; y--) if (this.has(x, y, z)) { hit = [x, y, z, 0, 1, 0]; break; }
        }
        if (!hit) return;
        const [hx, hy, hz, nx, ny, nz] = hit;
        if (opts.raise) {
          const prev = this._paint; this._paint = false;
          this.set(hx + nx, hy + ny, hz + nz, c);
          this._paint = prev;
        } else {
          this.map.set(key(hx, hy, hz), enc(c));
          for (let d = 1; d < (opts.depth || 1); d++) {
            const k = key(hx - nx * d, hy - ny * d, hz - nz * d);
            if (this.map.has(k)) this.map.set(k, enc(c));
          }
        }
      });
    });
    return this;
  }

  // -------------------------------------------------------- transforms
  /** Mirror voxels across the plane x = 0 (odd widths, centre column x=0) or x = -0.5 (even=true). */
  mirrorX(even = false, fromNegative = true) {
    const add = [];
    this.forEach((x, y, z, v) => {
      if (fromNegative ? x < 0 : (even ? x > -1 : x > 0)) {
        add.push([even ? -1 - x : -x, y, z, v]);
      }
    });
    for (const [x, y, z, v] of add) this.map.set(key(x, y, z), v);
    return this;
  }

  mirrorZ(even = false, fromNegative = true) {
    const add = [];
    this.forEach((x, y, z, v) => {
      if (fromNegative ? z < 0 : (even ? z > -1 : z > 0)) add.push([x, y, even ? -1 - z : -z, v]);
    });
    for (const [x, y, z, v] of add) this.map.set(key(x, y, z), v);
    return this;
  }

  translate(dx, dy, dz) {
    const old = this.map;
    this.map = new Map();
    for (const [k, v] of old) {
      const x = (k % 1024) - OFF, y = (Math.floor(k / 1024) % 1024) - OFF, z = Math.floor(k / 1048576) - OFF;
      this.map.set(key(x + dx, y + dy, z + dz), v);
    }
    return this;
  }

  /** Rotate around the Y axis by 90° steps (clockwise seen from above). */
  rotateY(times = 1) {
    times = ((times % 4) + 4) % 4;
    for (let t = 0; t < times; t++) {
      const old = this.map;
      this.map = new Map();
      for (const [k, v] of old) {
        const x = (k % 1024) - OFF, y = (Math.floor(k / 1024) % 1024) - OFF, z = Math.floor(k / 1048576) - OFF;
        this.map.set(key(-z, y, x), v);
      }
    }
    return this;
  }

  /** Copy another model into this one at an offset. */
  merge(other, dx = 0, dy = 0, dz = 0) {
    other.forEach((x, y, z, v) => this.map.set(key(x + dx, y + dy, z + dz), v));
    return this;
  }

  clone() {
    const m = new VoxelModel();
    m.map = new Map(this.map);
    m.jitter = this.jitter;
    m.pivot = this.pivot ? { ...this.pivot } : null;
    return m;
  }

  /** Recolour voxels matching predicate(x,y,z,colour,mat) with fn(x,y,z,colour,mat) -> new value. */
  recolor(fn) {
    this.forEach((x, y, z, v) => {
      const nv = fn(x, y, z, decColor(v), decMat(v));
      if (nv !== undefined && nv !== null) this.map.set(key(x, y, z), enc(nv));
    });
    return this;
  }

  /** Small metal keychain ring + chain sticking up from (x,y,z). */
  keychain(x, y, z, len = 3) {
    for (let i = 0; i < len; i++) this.set(x, y + i, z, metal(i % 2 ? 0xb8b8c4 : 0xe4e4ec));
    this.ring(x, y + len + 2, z, metal(0xdcdce6), 'z');
    return this;
  }

  /** Small closed ring (5x5 pixel loop) facing along an axis. */
  ring(cx, cy, cz, c, axis = 'z') {
    const pts = [[-1, 2], [0, 2], [1, 2], [-2, 1], [2, 1], [-2, 0], [2, 0], [-2, -1], [2, -1], [-1, -2], [0, -2], [1, -2]];
    for (const [p, q] of pts) {
      if (axis === 'z') this.set(cx + p, cy + q, cz, c);
      else if (axis === 'x') this.set(cx, cy + q, cz + p, c);
      else this.set(cx + p, cy, cz + q, c);
    }
    return this;
  }

}
