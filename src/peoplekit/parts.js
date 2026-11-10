// Shared parts for the people kit's pieces (head units unless noted): kigurumi hood shells, ears, bead eyes, teeth,
// glasses (rims, lenses, bridges, hinges, temples), cords, pompoms, a mask's painted face. See kit.js for the builder.
import { MAT, PAINT0, HEAD, v3, oval, smooth, headRing, shade } from './kit.js';

export const INK = 0x1c1418, WHITE = 0xf8f6f0, MOUTH = 0xc8445a, TOOTH = 0xfffcf2, GOLD = 0xe8b840;

/** The hood opening of a kigurumi / costume hood: a face hole and the neck. hole: [hx, hy, centre y]. */
export function hoodOpen(hole = [5.9, 7.6, 3.2], neck = -4.2) {
  const [hx, hy, hc] = hole;
  return (p) => (p[2] > 2.2 && (p[0] / hx) ** 2 + ((p[1] - hc) / hy) ** 2 < 1) || p[1] < (p[2] > 2 ? neck : p[2] > -3 ? neck - 0.9 : neck - 1.9);
}
/**
 * A costume hood round the head (the face shows through the hole). o: { col | paint(p) -> hex, rim (lining), hole,
 * th, grow, mat }
 */
export function hood(K, o = {}) {
  const col = o.col ?? 0xffffff;
  K.shell({
    grow: o.grow ?? 0.35, th: o.th ?? 1.5, open: o.open || hoodOpen(o.hole, o.neck), pole: o.pole || [0, 0.45, -1], seg: o.seg ?? 56, rings: o.rings ?? 22,
    mat: o.mat ?? MAT.fur, hem: o.hem ?? 0.3,
    col: (p, side) => (side === 'out' ? (o.paint ? o.paint(p) ?? col : col) : typeof o.rim === 'function' ? o.rim(p) : o.rim ?? col),
  });
}

/** A soft ear (a cupped plate) standing up from (x, y, z), leaning out by `lean`. shape: 'round' | 'point'. */
export function ear(K, at, o = {}) {
  const w = o.w ?? 3.4, h = o.h ?? 3.6, shape = o.shape || 'round';
  const out = shape === 'point'
    ? smooth([[-w, 0], [-w * 0.55, h * 0.55], [-w * 0.08, h], [w * 0.08, h], [w * 0.55, h * 0.55], [w, 0], [0, -h * 0.25]], 5, true)
    : oval(w, h, 36, 2.2, 0, h * 0.25).map(([x, y]) => [x, Math.max(y, -h * 0.35)]);
  K.with(at, [o.tilt ?? -0.15, o.yaw ?? 0, o.lean ?? 0], 1, () => {
    K.plate(out, (x, y) => -0.35 * (1 - (x / w) ** 2) + 0.03 * y, o.th ?? 1.1, {
      mat: o.mat ?? MAT.fur, rings: 8,
      col: (p, side) => (side === 'front' && o.inner != null && Math.abs(p[0]) < w * 0.62 && p[1] > -h * 0.05 && p[1] < h * (shape === 'point' ? 0.78 : 0.88) ? o.inner : o.col),
    });
  });
}

/** A glossy bead eye (white, iris / pupil, a glint): centre c, radius r, looking along dir. */
export function bead(K, c, r, o = {}) {
  const look = v3.norm(o.dir || [0, 0, 1]);
  if (o.white !== false) K.blob(c, [r, r * (o.sy ?? 1), r], { mat: MAT.eye, col: o.white ?? WHITE, seg: 18 });
  const pr = r * (o.pupil ?? 0.62);
  const pc = v3.add(c, v3.mul(look, r * (o.white === false ? 0 : 0.55)));
  K.blob(pc, [pr, pr * (o.sy ?? 1), pr], { mat: MAT.eye, col: o.col ?? INK, seg: 16 });
  if (o.glint !== false) K.blob(v3.add(pc, v3.add(v3.mul(look, pr * 0.82), [pr * 0.35, pr * 0.4, 0])), [pr * 0.26, pr * 0.26, pr * 0.16], { mat: MAT.eye, col: 0xffffff, seg: 8 });
}

/** Cone teeth, each placed with its own transform (base point, euler). */
export function toothAt(K, base, rot, len = 1.1, r = 0.45, col = TOOTH) {
  K.with(base, rot, 1, () => K.lathe([[0, -0.2], [r, 0], [r * 0.82, len * 0.45], [r * 0.2, len * 0.92], [0, len]], { seg: 10, mat: MAT.gloss, col }));
}

/** A closed cord / piping loop round the head at height y (grow out from the hair). */
export function cordRing(K, y, r = 0.32, o = {}) {
  K.tube(headRing(y, (o.grow ?? 0.15) + r, 48, o.tilt || 0), r, { closed: true, sides: 8, mat: o.mat ?? MAT.cloth, col: o.col ?? 0xd8302a });
}

/** A fluffy pompom of yarn tufts (sculpted) at c, radius r. */
export function pompom(K, c, r, col = 0xfffaf0, col2 = 0xf0e8d6) {
  const tufts = [];
  const N = 26, ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) { const y = 1 - (i / (N - 1)) * 2, rr = Math.sqrt(1 - y * y), a = i * ga; tufts.push([Math.cos(a) * rr * r * 0.74, y * r * 0.74, Math.sin(a) * rr * r * 0.74]); }
  K.sculpt((p) => {
    const q = v3.sub(p, c);
    let d = v3.len(q) - r * 0.8;
    for (const t of tufts) d = smin(d, v3.len(v3.sub(q, t)) - r * 0.27, r * 0.08);
    return d;
  }, [c[0] - r * 1.2, c[1] - r * 1.2, c[2] - r * 1.2, c[0] + r * 1.2, c[1] + r * 1.2, c[2] + r * 1.2], r / 9, { mat: MAT.knit, col: (p) => (p[1] - c[1] < -r * 0.45 ? col2 : col) });
}
function smin(a, b, k) { const h = Math.max(0, Math.min(1, 0.5 + 0.5 * (b - a) / k)); return b + (a - b) * h - k * h * (1 - h); }

// ------------------------------------------------------------------ glasses (eyes frame: origin at eye level, lenses at z 12)
/**
 * A pair of spectacles. o: { lens: 2D outline round the lens centre (the wearer's left lens), cx = 3.3, cy = 0.2, z = 12,
 * rim (radius), rimRy (in-plane width factor), rimCol, rimMat, lensCol, lensMat, lensTh, wrap (curve the fronts round the
 * face), bridge: 'arch' | 'bar' | 'double' | null, temples = true, hingeCol, pads }
 */
export function specs(K, o) {
  const cx = o.cx ?? 3.3, cy = o.cy ?? 0.2, z = o.z ?? 12, r = o.rim ?? 0.3;
  const rimMat = o.rimMat ?? MAT.plastic, rimCol = o.rimCol ?? 0x1c1a20;
  const wrap = o.wrap ?? 0.06;
  const bend = (p) => [p[0], p[1], p[2] - wrap * p[0] * p[0]];
  const lens = o.lens;
  let hw = 0, ytop = 0, hh = 0;
  for (const [x, y] of lens) { hw = Math.max(hw, Math.abs(x)); ytop = Math.max(ytop, y); hh = Math.max(hh, Math.abs(y)); }
  for (const sx of [1, -1]) {
    K.with([0, 0, 0], [0, 0, 0], [sx, 1, 1], () => {
      const loop = lens.map(([x, y]) => bend([cx + x, cy + y, z]));
      if (r > 0) K.tube(loop, r, { closed: true, sides: 8, ry: o.rimRy ?? 1, up: [0, 0, 1], mat: rimMat, col: o.rimColF || rimCol });
      const shrink = o.lensIn ?? 0.92;
      K.plate(lens.map(([x, y]) => [cx + x * shrink, cy + y * shrink]), (x, y) => z - wrap * x * x + (o.bulge ?? 0.25) * (1 - ((x - cx) / hw) ** 2 - ((y - cy) / (hw * 0.8)) ** 2) * 0.5, o.lensTh ?? 0.22, {
        mat: o.lensMat ?? MAT.glass, col: o.lensCol ?? 0xdfe8ec, rings: 6,
        uvMap: (o.lensMat ?? 0) >= PAINT0 ? (x, y) => [(x - cx) / (2 * hw * shrink) + 0.5, (y - cy) / (2 * hh * shrink) + 0.5] : undefined,
      });
      // hinge block at the outer edge and the temple arm back over the ear
      const hx = cx + hw + r * 0.6, hy = cy + (o.hingeY ?? ytop * 0.55);
      const hz = z - wrap * hx * hx;
      if (o.temples !== false) {
        K.with([hx, hy, hz - 0.3], [0, 0.25, 0], 1, () => K.slab(oval(0.55, 0.45, 12, 4), 1.1, { mat: rimMat, col: o.hingeCol ?? rimCol, b: 0.2 }));
        const arm = smooth([[hx + 0.2, hy, hz - 0.6], [6.9, hy + 0.1, 8.5], [7.25, hy * 0.5 + 0.2, 4.5], [7.3, -0.4, 2.4], [7.0, -2.2, 1.2]], 4);
        K.tube(arm, o.templeR ?? 0.24, { sides: 6, ry: 1.6, up: [1, 0, 0], mat: rimMat, col: o.templeCol ?? rimCol, caps: 'round' });
      }
      if (o.pads !== false) K.blob([0.95, cy - 0.9, z - 1.2], [0.35, 0.55, 0.25], { mat: MAT.glass, col: 0xe8ecef, seg: 8 });
    });
  }
  // the bridge
  const b = o.bridge ?? 'arch';
  if (b === 'arch' || b === 'double') {
    const pts = [[-(cx - hw * 0.94), cy + ytop * 0.35, z], [0, cy + ytop * 0.55, z + 0.15], [cx - hw * 0.94, cy + ytop * 0.35, z]].map(bend);
    K.tube(smooth(pts, 4), r * 0.85, { sides: 8, mat: rimMat, col: rimCol });
    if (b === 'double') K.tube(smooth([[-(cx - hw * 0.4), cy + ytop * 1.02, z], [0, cy + ytop * 1.08, z + 0.1], [cx - hw * 0.4, cy + ytop * 1.02, z]].map(bend), 4), r * 0.7, { sides: 8, mat: rimMat, col: rimCol });
  } else if (b === 'bar') {
    K.tube([[-(cx - hw * 0.96), cy + ytop * 0.45, z], [cx - hw * 0.96, cy + ytop * 0.45, z]].map(bend), r * 1.1, { sides: 8, ry: 1.3, up: [0, 0, 1], mat: rimMat, col: rimCol });
  }
}

// ------------------------------------------------------------------ painted faces
/** Canvas painting helpers for hand-painted mask faces (u: 0..1 left to right on the canvas, v: 0..1 bottom to top). */
export function brush(g, w, h) {
  const X = (u) => u * w, Y = (v) => (1 - v) * h;
  return {
    fill(col, path) { g.fillStyle = col; g.beginPath(); path(this); g.fill(); },
    stroke(col, lw, path) { g.strokeStyle = col; g.lineWidth = lw * w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); path(this); g.stroke(); },
    m(u, v) { g.moveTo(X(u), Y(v)); }, l(u, v) { g.lineTo(X(u), Y(v)); },
    q(cu, cv, u, v) { g.quadraticCurveTo(X(cu), Y(cv), X(u), Y(v)); },
    c(a, b, c2, d, u, v) { g.bezierCurveTo(X(a), Y(b), X(c2), Y(d), X(u), Y(v)); },
    e(u, v, ru, rv, rot = 0) { g.ellipse(X(u), Y(v), ru * w, rv * h, rot, 0, Math.PI * 2); },
    bg(col) { g.fillStyle = col; g.fillRect(0, 0, w, h); },
  };
}
export { MAT, HEAD, v3, oval, smooth, headRing, shade };
