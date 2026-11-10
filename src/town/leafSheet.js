// The foliage sheet: every leaf, needle, petal and blade in the game, hand-pixelled into one 2048 x 1024 sheet of
// 8 x 4 sprig cells (256 px each, the sprig's foot at the bottom centre of its cell). Each species is drawn the way a
// pixel artist draws it: hard-edged leaves set one by one along their stems, three or four tone clusters per leaf (a
// lit half with a rim of highlight, a shaded half, a dark fold down the midrib), a selective outline (softer where
// the light falls on the edge), the inside of the sprig a step darker than its tips. Nothing is noise: shapes come
// from each plant's own leaf outline (serration, lobes, notched petals), placements from hand-set lists.
// Magnification is nearest (the pixels stay crisp up close); the mip chain is built here, premultiplied, with the
// colour bled into the transparent texels (no dark fringe) and the alpha rescaled per cell so each level covers as
// much as the full-size art (alpha-cut foliage keeps its body at a distance instead of thinning and shimmering).
//   drawSheet() -> { data: Uint8Array RGBA (rows top-down), W, H }       (pure, runs in node for previews)
//   leafTexture() -> THREE.DataTexture with its mips                       CELLS[name] = [col, row, card m, core hex]
import * as THREE from 'three';

export const SW = 2048, SH = 1024, CS = 256;
// name: [col, row, card size in metres (the cell's world size), core tone (the dark inside of a crown)]
export const CELLS = {
  kaname: [0, 0, 0.34, 0x2a4626], kanameRed: [1, 0, 0.34, 0x2a4626], azalea: [2, 0, 0.32, 0x2c4828], small: [3, 0, 0.28, 0x2e4c28],
  pine: [4, 0, 0.4, 0x1e3626], pineTop: [5, 0, 0.42, 0x1e3626], blossom: [6, 0, 0.5, 0xd4a2b2], blossom2: [7, 0, 0.5, 0xd4a2b2],
  maple: [0, 1, 0.4, 0x2c4a24], mapleRed: [1, 1, 0.4, 0x6a2a20], camellia: [2, 1, 0.4, 0x16301e], hydrangea: [3, 1, 0.5, 0x2a4a24],
  hydrangeaFlower: [4, 1, 0.42, 0x4a5a8a], asagao: [5, 1, 0.42, 0x28462a], bamboo: [6, 1, 0.55, 0x2e5226], ivy: [7, 1, 0.3, 0x243e22],
  grass: [0, 2, 0.42, 0x34542a], weeds: [1, 2, 0.4, 0x34542a], pelargonium: [2, 2, 0.34, 0x2a4a26], tomato: [3, 2, 0.36, 0x2a4a24],
  pothos: [4, 2, 0.36, 0x264826], broad: [5, 2, 0.42, 0x244424], keyaki: [6, 2, 0.4, 0x2c4a24], moss: [7, 2, 0.3, 0x3a5426],
  monstera: [0, 3, 0.5, 0x1c3a22], fern: [1, 3, 0.45, 0x284a24], petals: [2, 3, 0.6, 0xe0b8c4], litter: [3, 3, 0.6, 0x6a5a40],
  pansy: [4, 3, 0.3, 0x2c4a26], sprout: [5, 3, 0.2, 0x3a5a2a], aloe: [6, 3, 0.3, 0x4a6a4a], candle: [7, 3, 0.4, 0x1e3626],
};
// the old kind names
export const ALIAS = { box: 'kaname', boxRed: 'kanameRed', leaf: 'broad' };

// ------------------------------------------------------------------------------------------------ pixels
let D = null, CX0 = 0, CY0 = 0, CX1 = 0, CY1 = 0, OX = 0, OY = 0; // the cell being drawn: clip rectangle, origin
const hex = (s) => (typeof s === 'number' ? [(s >> 16) & 255, (s >> 8) & 255, s & 255] : [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)]);
const ramp = (...c) => c.map(hex);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
function put(x, y, c) {
  x += OX; y += OY;
  if (x < CX0 || y < CY0 || x >= CX1 || y >= CY1) return;
  const o = (y * SW + x) * 4;
  D[o] = c[0]; D[o + 1] = c[1]; D[o + 2] = c[2]; D[o + 3] = 255;
}
/** A 1 px line (w 2 or 3: thickened downwards / sideways), Bresenham. */
function line(x0, y0, x1, y1, c, w = 1) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, steep = -dy > dx;
  let e = dx + dy;
  for (;;) {
    put(x0, y0, c);
    for (let k = 1; k < w; k++) steep ? put(x0 + k, y0, c) : put(x0, y0 + k, c);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * e;
    if (e2 >= dy) { e += dy; x0 += sx; }
    if (e2 <= dx) { e += dx; y0 += sy; }
  }
}
const qpt = (a, b, c, t) => [(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * b[0] + t * t * c[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * b[1] + t * t * c[1]];
/** A quadratic stem a -> c bowed through b, width tapering w0 -> w1 px, coloured by `col(t)`. */
function curve(a, b, c, col, w0 = 1, w1 = 1) {
  const n = Math.max(2, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / 3));
  let p = a;
  for (let i = 1; i <= n; i++) { const q = qpt(a, b, c, i / n); line(p[0], p[1], q[0], q[1], typeof col === 'function' ? col(i / n) : col, Math.max(1, Math.round(w0 + (w1 - w0) * i / n))); p = q; }
}

/**
 * The shape rasteriser: fn(u, v, dx, dy) gives a tone (0..4 into the ramp P, 10+ an accent o.acc[t - 10]) or -1 for
 * every pixel round (x0, y0); u runs along `ang` (canvas radians, -PI/2 is up), v across it. Edges get the outline:
 * P[0] where the edge faces away from the light (down / right), P[1] where it faces it. o.shift darkens the body.
 */
function shape(x0, y0, ang, R, fn, P, o = {}) {
  const X0 = Math.round(x0), Y0 = Math.round(y0), n = Math.ceil(R) + 2, S = 2 * n + 1;
  if (MASK.length < S * S) MASK = new Int16Array(S * S * 2);
  const M = MASK; M.fill(-1, 0, S * S);
  const c = Math.cos(ang), s = Math.sin(ang);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const dx = i - n, dy = j - n, t = fn(dx * c + dy * s, -dx * s + dy * c, dx, dy);
    if (t != null && t >= 0) M[j * S + i] = t;
  }
  const sh = o.shift || 0, out = o.outline !== false, acc = o.acc || [];
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const t = M[j * S + i];
    if (t < 0) continue;
    const X = X0 + i - n, Y = Y0 + j - n;
    if (t >= 10) { put(X, Y, acc[t - 10]); continue; }
    if (out) {
      const L = i > 0 ? M[j * S + i - 1] : -1, Rr = i < S - 1 ? M[j * S + i + 1] : -1, U = j > 0 ? M[(j - 1) * S + i] : -1, Dn = j < S - 1 ? M[(j + 1) * S + i] : -1;
      if (Rr < 0 || Dn < 0) { put(X, Y, P[0]); continue; }
      if (U < 0 || L < 0) { put(X, Y, P[clamp(1 + (o.litEdge || 0), 0, 4)]); continue; }
    }
    put(X, Y, P[clamp(t + sh, 0, 4)]);
  }
}

let MASK = new Int16Array(4096);
// the light comes from the top left of the sheet
const LX = -0.55, LY = -0.83;
const litSign = (ang) => ((-Math.sin(ang)) * LX + Math.cos(ang) * LY > 0 ? 1 : -1);

/**
 * A leaf from its base along ang: length L, half-width W, outline sin(PI t^a)^b (a > 1 widest towards the tip),
 * o.serr [tooth px, depth px], o.veins [spacing px, slope], o.gloss (a highlight streak), o.rib tone, o.tip (acuminate).
 */
function leaf(x, y, ang, L, W, P, o = {}) {
  const a = o.a ?? 1, b = o.b ?? 0.8, ls = litSign(ang), down = Math.sin(ang) > 0.45 ? -1 : 0;
  const fn = (u0, v) => {
    const u = u0 + L / 2;
    if (u < 0 || u > L || v > W || v < -W) return -1;
    const t = u / L;
    let h = W * Math.pow(Math.sin(Math.PI * Math.pow(t, a)), b);
    if (o.tip && t > 0.8) h *= 1 - (t - 0.8) * o.tip;
    if (o.serr && t > 0.15) h -= o.serr[1] * ((u % o.serr[0]) / o.serr[0]);
    const av = Math.abs(v);
    if (av > h) return -1;
    if (av < 0.75 && t > 0.05 && t < 0.9) return o.rib ?? 1;
    const lit = v * ls > 0;
    let k;
    if (lit) {
      if (av > h - 1.6 && t > 0.14 && t < 0.86) return 4;
      if (o.gloss && Math.abs(av - h * 0.42) < 0.8 && t > 0.22 && t < 0.62) return 4;
      k = 3;
    } else {
      if (av > h - 1.8) return 1;
      k = 2;
    }
    if (t < 0.1) k--;
    if (o.veins && av > 1.4 && av < h - 1.4 && ((u - av * o.veins[1]) % o.veins[0] + o.veins[0]) % o.veins[0] < 1) k--;
    return k;
  };
  shape(x + Math.cos(ang) * L / 2, y + Math.sin(ang) * L / 2, ang, L / 2 + 1, fn, P, { shift: (o.shift || 0) + down, acc: o.acc });
}
/** A heart-shaped leaf (asagao, pothos, ivy-ish): two basal lobes either side of the petiole sinus. */
function heart(x, y, ang, L, W, P, o = {}) {
  const ls = litSign(ang), down = Math.sin(ang) > 0.45 ? -1 : 0;
  const fn = (u, v) => {
    const av = Math.abs(v), t = u / L;
    const lobe = ((av - W * 0.5) / (W * 0.55)) ** 2 + ((u - L * 0.2) / (L * 0.36)) ** 2 <= 1 && !(u < L * 0.08 && av < W * 0.18);
    const body = t >= 0.05 && t <= 1 && av <= W * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.62)), 0.75) * (t > 0.75 ? 1 - (t - 0.75) * 1.6 : 1);
    if (!lobe && !body) return -1;
    if (av < 0.75 && t > 0.08 && t < 0.88) return 1;
    if (o.vari && Math.abs(av - W * 0.3 - Math.sin(u * 0.21) * 2) < 1.6 && t > 0.2 && t < 0.8) return 10;
    const lit = v * ls > 0;
    if (lit) return t > 0.15 && t < 0.85 && av > W * 0.62 ? 4 : 3;
    return av > W * 0.7 ? 1 : 2;
  };
  shape(x, y, ang, L + 2, fn, P, { shift: (o.shift || 0) + down, acc: o.acc });
}
/** A palmate leaf (maple, ivy): lobes [angle offset, length share, half-width rad], drawn from the petiole point. */
function palm(x, y, ang, L, lobes, P, o = {}) {
  const ls = litSign(ang), serr = o.serr ?? 0;
  const fn = (u, v) => {
    const r = Math.hypot(u, v);
    if (r > L || r < 0.5) return r < 0.5 ? 2 : -1;
    const th = Math.atan2(v, u);
    let R = 0, near = 9, side = 0;
    for (const [a, len, hw] of lobes) {
      const d = Math.abs(th - a);
      if (d < hw) { const q = L * len * Math.pow(1 - d / hw, 0.55); if (q > R) { R = q; near = d * r; side = th - a; } }
    }
    if (serr) R -= serr * ((r % 4) / 4) * (r > L * 0.3 ? 1 : 0);
    const base = L * (o.web ?? 0.32);
    if (r > Math.max(R, base)) return -1;
    if (near < 0.8 && r > 1.5 && r < R - 2) return 1;
    const lit = side * ls < 0 ? true : false, edge = r > R - 1.6;
    if (lit) return edge && r > L * 0.3 ? 4 : 3;
    return edge ? 1 : 2;
  };
  shape(x, y, ang, L + 1, fn, P, { shift: o.shift || 0 });
}

/** Sprigs: stems [[x0, y0, cx, cy, x1, y1, depth]] bowed through (cx, cy), leaves alternate up each stem shrinking to
 *  a terminal pair. o: { L, W, gap, start, div, stem, stemW, leafO, draw(x, y, ang, L, W, shift, f) }. */
function sprigs(stems, P, o) {
  const draw = o.draw || ((x, y, ang, L, W, shift, f) => leaf(x, y, ang, L, W, o.tipP && f > o.tipFrom ? o.tipP : P, { ...o.leafO, shift }));
  for (const st of [...stems].sort((p, q) => (p[6] || 0) - (q[6] || 0))) {
    const [x0, y0, cx, cy, x1, y1, dep = 0] = st, a = [x0, y0], b = [cx, cy], c = [x1, y1];
    curve(a, b, c, o.stem || '#4a3a2a', o.stemW ?? 2, 1);
    let len = 0, prev = a; const pts = [];
    for (let i = 1; i <= 40; i++) { const q = qpt(a, b, c, i / 40); len += Math.hypot(q[0] - prev[0], q[1] - prev[1]); pts.push([q, len]); prev = q; }
    const at = (d) => { for (let i = 0; i < pts.length; i++) if (pts[i][1] >= d) { const q = pts[i][0], p0 = i ? pts[i - 1][0] : a; return [q, Math.atan2(q[1] - p0[1], q[0] - p0[0])]; } return [c, Math.atan2(c[1] - cy, c[0] - cx)]; };
    const n = Math.floor((len - (o.start ?? 16)) / o.gap);
    for (let i = 0; i <= n; i++) {
      const d = (o.start ?? 16) + i * o.gap, f = d / len, [q, ta] = at(d), side = (i + (st[7] || 0)) % 2 ? 1 : -1, k = 1 - 0.32 * f;
      draw(q[0], q[1], ta + side * ((o.div ?? 0.85) - 0.3 * f), o.L * k, o.W * k, dep - (f < 0.3 ? 1 : 0), f);
      if (o.node && i % 3 === 2 && f > 0.3) o.node(q[0], q[1], ta + side * 0.9, dep, i + (st[7] || 0));
    }
    const [, ta] = at(len);
    for (const sd of [-0.38, 0.38]) draw(c[0], c[1], ta + sd, o.L * 0.66, o.W * 0.62, dep, 1);
    draw(c[0], c[1], ta, o.L * 0.74, o.W * 0.66, dep, 1);
    if (o.tip) o.tip(c[0], c[1], ta, dep, st[7] || 0);
  }
}
/** Stems fanned from the foot of the cell: n stems over `spread` radians, lengths from a hand-set pattern. */
function fan(n, spread, lens, o = {}) {
  const out = [], fx = o.x ?? 128, fy = o.y ?? 250;
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) - 0.5 : 0, a = -Math.PI / 2 + t * spread, L = lens[i % lens.length], bow = (o.bow ?? 0.25) * Math.sign(t);
    const x1 = fx + Math.cos(a) * L, y1 = fy + Math.sin(a) * L, cx = fx + Math.cos(a - bow) * L * 0.55, cy = fy + Math.sin(a - bow) * L * 0.55;
    out.push([fx + t * 10, fy, cx, cy, x1, y1, Math.abs(t) > 0.3 ? -1 : 0, i]);
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ flowers
/** 染井吉野: five pale petals, each notched at the tip, a deep pink eye, a ring of stamens with yellow anthers.
 *  tilt squashes the face (a flower seen from the side), rot turns it. */
function sakuraFlower(x, y, R, rot, tilt, P, acc, shift = 0) {
  const ct = Math.cos(rot), st = Math.sin(rot), seg = Math.PI * 2 / 5, la = Math.atan2(LY, LX);
  const fn = (u, v, dx, dy) => {
    const px = dx * ct + dy * st, py = (-dx * st + dy * ct) / tilt, r = Math.hypot(px, py);
    if (r > R + 0.5) return -1;
    if (r < R * 0.2) return 10;                                       // the eye
    const th = Math.atan2(py, px);
    // five round petals: ellipses on their axes, overlapping only near the eye, a small notch at each tip
    let best = -1, ba = 0, bb = 0;
    for (let k = 0; k < 5; k++) {
      const ax = k * seg, ca = Math.cos(ax), sa = Math.sin(ax), a = px * ca + py * sa, b = -px * sa + py * ca;
      const e = ((a - R * 0.56) / (R * 0.47)) ** 2 + (b / (R * 0.33)) ** 2;
      if (e <= 1 && (best < 0 || e < best)) { best = e; ba = a; bb = b; }
    }
    if (best < 0) return -1;
    if (ba > R * 0.84 && Math.abs(bb) < 0.9 + (ba - R * 0.84) * 0.6) return -1; // the notch
    if (r < R * 0.42 && Math.abs(((th / seg) % 1 + 1) % 1 - 0.5) < 0.16) return r < R * 0.36 ? 11 : 12; // stamens, anthers
    if (r < R * 0.36) return 1;
    const lit = Math.cos(th + rot - la) > 0.1;
    if (best > 0.62) return lit ? 4 : 2;
    return lit ? 3 : 2;
  };
  shape(x, y, 0, R * 1.2, fn, P, { acc, shift, litEdge: 1 });
}
function bud(x, y, ang, L, P, shift = 0) {
  leaf(x, y, ang, L, L * 0.34, P, { a: 1.4, b: 0.7, shift, rib: 2 });
}
/** つつじ: a funnel of five broad lobes, the top one freckled, long stamens curling out. */
function azaleaFlower(x, y, R, rot, P, acc, shift = 0) {
  const ct = Math.cos(rot), st = Math.sin(rot);
  for (let k = 0; k < 5; k++) { const a = rot + (k - 2) * 0.22 - Math.PI / 2, L = R * 1.25; curve([x, y], [x + Math.cos(a) * L * 0.6, y + Math.sin(a) * L * 0.5], [x + Math.cos(a + 0.25) * L, y + Math.sin(a + 0.25) * L], acc[1]); put(Math.round(x + Math.cos(a + 0.25) * L), Math.round(y + Math.sin(a + 0.25) * L), acc[2]); }
  const fn = (u, v, dx, dy) => {
    const px = dx * ct + dy * st, py = -dx * st + dy * ct, r = Math.hypot(px, py), th = Math.atan2(py, px);
    const seg = Math.PI * 2 / 5, k = Math.round((th + Math.PI / 2) / seg), ph = th + Math.PI / 2 - k * seg;
    const Rr = R * (0.82 + 0.18 * Math.cos(ph * 2.5)) * (1 - 0.1 * Math.abs(Math.sin(ph * 2.5)));
    if (r > Rr) return -1;
    if (r < R * 0.18) return 1;
    if (Math.abs(ph) > 0.58 && r > R * 0.4) return 1;                 // the gap between lobes
    if (((k % 5) + 5) % 5 === 0 && r > R * 0.28 && r < R * 0.62 && (Math.round(px * 0.6) + Math.round(py * 0.6)) % 3 === 0 && Math.abs(ph) < 0.4) return 10; // freckles
    if (r < R * 0.32) return 2;
    return r > Rr - 1.4 ? 4 : Math.cos(th + rot - Math.atan2(LY, LX)) > 0 ? 3 : 2;
  };
  shape(x, y, 0, R + 1, fn, P, { acc, shift });
}
/** 椿: a cup of five round petals, a boss of yellow stamens on white filaments. */
function camelliaFlower(x, y, R, rot, tilt, P, acc, shift = 0) {
  const ct = Math.cos(rot), st = Math.sin(rot);
  const fn = (u, v, dx, dy) => {
    const px = dx * ct + dy * st, py = (-dx * st + dy * ct) / tilt, r = Math.hypot(px, py), th = Math.atan2(py, px);
    const seg = Math.PI * 2 / 5, k = Math.round(th / seg), ph = th - k * seg, Rr = R * (0.86 + 0.14 * Math.cos(ph * 2.5));
    if (r > Rr) return -1;
    if (r < R * 0.3) return (Math.round(px) + Math.round(py)) & 1 ? 10 : 11;
    if (r < R * 0.42) return 12;
    if (Math.abs(ph) > 0.56 && r < R * 0.85) return 1;
    const lit = Math.cos(th + rot - Math.atan2(LY, LX));
    return r > Rr - 1.4 && lit > 0 ? 4 : lit > 0.3 ? 3 : lit > -0.5 ? 2 : 1;
  };
  shape(x, y, 0, R + 1, fn, P, { acc, shift });
}
/** 紫陽花 floret: four broad sepals in a cross, a tiny eye. */
function floret(x, y, r, rot, P, acc, shift = 0) {
  const ct = Math.cos(rot), st = Math.sin(rot);
  const fn = (u, v, dx, dy) => {
    const px = dx * ct + dy * st, py = -dx * st + dy * ct, rr = Math.hypot(px, py), th = Math.atan2(py, px);
    const ph = th - Math.round(th / (Math.PI / 2)) * (Math.PI / 2), R = r * (0.7 + 0.3 * Math.cos(ph * 2));
    if (rr > R) return -1;
    if (rr < 0.8) return 10;
    if (Math.abs(ph) > 0.68 && rr > r * 0.3) return 1;
    return Math.cos(th + rot - Math.atan2(LY, LX)) > 0 ? 3 : 2;
  };
  shape(x, y, 0, r + 1, fn, P, { acc, shift, litEdge: 1 });
}
/** 朝顔: a round trumpet face, a white throat and five dark rays; tilt for one turned aside. */
function asagaoFlower(x, y, R, rot, tilt, P, acc, shift = 0) {
  const ct = Math.cos(rot), st = Math.sin(rot);
  const fn = (u, v, dx, dy) => {
    const px = dx * ct + dy * st, py = (-dx * st + dy * ct) / tilt, r = Math.hypot(px, py), th = Math.atan2(py, px);
    const ph = th - Math.round(th / (Math.PI * 0.4)) * (Math.PI * 0.4), Rr = R * (0.94 + 0.06 * Math.cos(ph * 2.5 + Math.PI));
    if (r > Rr) return -1;
    if (r < R * 0.16) return 11;
    if (r < R * 0.36) return 10;
    if (Math.abs(Math.sin((th + Math.PI * 0.2) * 2.5)) < 0.09 * R / Math.max(r, 1) * 3) return 12;
    const lit = Math.cos(th + rot - Math.atan2(LY, LX));
    return r > Rr - 1.4 ? (lit > 0 ? 4 : 1) : lit > 0.2 ? 3 : 2;
  };
  shape(x, y, 0, R + 1, fn, P, { acc, shift });
}
/** A five-petalled floret (pelargonium, tomato star, pansy face). */
function five(x, y, R, rot, P, o = {}) {
  const ct = Math.cos(rot), st = Math.sin(rot), sharp = o.sharp ?? 0;
  const fn = (u, v, dx, dy) => {
    const px = dx * ct + dy * st, py = -dx * st + dy * ct, r = Math.hypot(px, py), th = Math.atan2(py, px);
    const seg = Math.PI * 2 / 5, ph = th - Math.round(th / seg) * seg;
    const Rr = sharp ? R * (1 - Math.abs(ph) * 1.4) : R * (0.78 + 0.22 * Math.cos(ph * 2.5));
    if (r > Rr) return -1;
    if (r < (o.eye ?? 1.1)) return 10;
    if (o.face && r < R * 0.5 && py < 1) return 11;
    return Math.cos(th + rot - Math.atan2(LY, LX)) > 0 ? 3 : 2;
  };
  shape(x, y, 0, R + 1, fn, P, { acc: o.acc, shift: o.shift || 0, litEdge: 1 });
}

// ------------------------------------------------------------------------------------------------ needles and blades
/** 黒松 tuft: stiff paired needles fanned from a twig tip, back ones dark, upper ones lit, a pale bud in the middle. */
function needleTuft(x, y, ang, len, spread, n, P, o = {}) {
  const passes = [[1, 0], [2, 1], [3, 2]];
  for (const [tone, pass] of passes) for (let k = pass; k < n; k += 3) {
    const t = n > 1 ? k / (n - 1) - 0.5 : 0, a = ang + t * spread, L = len * (1 - Math.abs(t) * 0.45) * (k % 2 ? 0.92 : 1);
    const ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L, bend = 0.12 * (t >= 0 ? 1 : -1);
    const mx = x + Math.cos(a - bend) * L * 0.5, my = y + Math.sin(a - bend) * L * 0.5;
    const up = Math.sin(a) < -0.3 ? 1 : 0;
    curve([x, y], [mx, my], [ex, ey], (q) => P[clamp(tone + (o.shift || 0) + (q > 0.7 && up ? 1 : 0) - (q < 0.25 ? 1 : 0), 0, 4)]);
  }
  if (o.bud) { line(x, y, x + Math.cos(ang) * 6, y + Math.sin(ang) * 6, o.bud, 2); }
}
/** A grass blade from (x, y) to (x1, y1) bowed through (cx, cy), w px wide at the foot: lit edge, body, shaded edge. */
function blade(x, y, cx, cy, x1, y1, w, P, shift = 0) {
  const n = Math.max(6, Math.ceil(Math.hypot(x1 - x, y1 - y) / 1.5));
  for (let i = 0; i <= n; i++) {
    const t = i / n, [px, py] = qpt([x, y], [cx, cy], [x1, y1], t), [qx, qy] = qpt([x, y], [cx, cy], [x1, y1], Math.min(1, t + 0.02));
    const ww = Math.max(1, Math.round(w * (1 - t * 0.85))), dx = qx - px, dy = qy - py, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    const litFirst = nx * LX + ny * LY > 0;
    for (let k = 0; k < ww; k++) {
      const s = k - (ww - 1) / 2, tone = ww === 1 ? 2 : k === 0 ? (litFirst ? 3 : 1) : k === ww - 1 ? (litFirst ? 1 : 3) : 2;
      put(Math.round(px + nx * s), Math.round(py + ny * s), P[clamp(tone + shift + (t > 0.55 && tone === 3 ? 1 : 0) - (t < 0.12 ? 1 : 0), 0, 4)]);
    }
  }
}

// ------------------------------------------------------------------------------------------------ the palettes
// ramps: outline, shade, body, lit, highlight (pastel, a little desaturated, like the rest of the town)
const PAL = {
  kaname: ramp('#1c3220', '#2c4e2e', '#41703c', '#5f904a', '#8ab25c'),
  red: ramp('#461a16', '#7a2a22', '#a43c2c', '#c85a36', '#e48a4c'),
  azLeaf: ramp('#1e341e', '#30522c', '#476e38', '#668c44', '#8aac58'),
  azFl: ramp('#74244a', '#ae3c6c', '#d2588a', '#e884aa', '#f6b2ca'),
  small: ramp('#20361e', '#33572c', '#4a7838', '#6a9846', '#94ba60'),
  pine: ramp('#12261c', '#1e3c2a', '#2e5634', '#467442', '#6a9450'),
  pineL: ramp('#1a3424', '#2a4e30', '#3e6a3c', '#5a8a48', '#82ac5e'),
  bl: ramp('#d8a2b2', '#eebdca', '#f8dce3', '#fdeff3', '#fffafb'),
  bl2: ramp('#d29aac', '#eab4c4', '#f6d2dc', '#fce6ed', '#fff6f8'),
  twig: ramp('#2e2224', '#46343a', '#5c4646', '#745a56', '#8a7066'),
  maple: ramp('#1c381c', '#34602a', '#4e8438', '#72a648', '#9cc662'),
  mapleR: ramp('#481414', '#862220', '#b4382a', '#d65a34', '#ee8a48'),
  cam: ramp('#0e2418', '#1c3c26', '#2c5632', '#447842', '#78a260'),
  camFl: ramp('#560f18', '#8c1c26', '#bc2c34', '#dc4a46', '#f27a68'),
  hyd: ramp('#1c381c', '#32602a', '#4c8238', '#6ea446', '#94c25c'),
  hydFl: ramp('#383a78', '#5858a6', '#7884ca', '#98aee0', '#c2d2f0'),
  asa: ramp('#1a361c', '#2e5628', '#447638', '#629648', '#86b258'),
  asaFl: ramp('#28286a', '#3c449e', '#5866c6', '#7c8ede', '#aebef0'),
  bamboo: ramp('#203e1c', '#38682c', '#538838', '#76a846', '#a0c660'),
  ivy: ramp('#18301a', '#2a4e26', '#406e34', '#5c8e3e', '#84ae56'),
  grass: ramp('#223e1c', '#385f26', '#528034', '#74a242', '#9ec25e'),
  grassD: ramp('#2a3a1c', '#46552a', '#64703a', '#848c4a', '#a8aa62'),
  pel: ramp('#1c361a', '#325a28', '#4a7c36', '#6a9c46', '#90b85a'),
  pelFl: ramp('#661212', '#a42222', '#d43834', '#ee5846', '#f88a6e'),
  tom: ramp('#1c381a', '#2e5e28', '#447e34', '#609e42', '#84ba56'),
  pothos: ramp('#183418', '#2c5826', '#447e38', '#649e48', '#8cbe5e'),
  broad: ramp('#183216', '#2a5024', '#3e7432', '#5c9642', '#88b65c'),
  keyaki: ramp('#1e3a1a', '#345c28', '#4c7e36', '#6c9e44', '#94be5c'),
  moss: ramp('#22361a', '#385624', '#52742e', '#70943a', '#96b24c'),
  mon: ramp('#0e2618', '#1a4024', '#2a5c30', '#427c3e', '#6c9e56'),
  fern: ramp('#1a361a', '#2e5628', '#467a34', '#669e44', '#8ebe5c'),
  litter: ramp('#4a3420', '#6e5030', '#8a6a40', '#a88650', '#c4a468'),
  aloe: ramp('#2a4234', '#3e5e48', '#56785c', '#749870', '#9ab88a'),
};
const ACC = {
  bl: ['#c24e6c', '#e2a0b0', '#eccc6a'].map(hex),
  az: ['#8a1a46', '#c04070', '#f0e070'].map(hex),
  cam: ['#f0cc4a', '#e0a830', '#f4ecd4'].map(hex),
  hyd: ['#ece6f6'].map(hex),
  asa: ['#f4f4fa', '#e8e0a0', '#46389a'].map(hex),
  pel: ['#f6d8a0'].map(hex),
  tom: ['#a8902a'].map(hex),
  pothos: ['#e0d898'].map(hex),
  yel: ['#f2c832', '#d09a1c'].map(hex),
  white: ['#f2eee0', '#d8d0b4'].map(hex),
  pansy: ['#f4d040', '#3a2464'].map(hex),
};

// ------------------------------------------------------------------------------------------------ the cells
const CELL_ART = {
  // 要黐: clipped red-tip photinia, obovate leaves with fine teeth along stiff twigs
  kaname: () => sprigs(fan(11, 3.0, [196, 168, 210, 176, 200, 214, 182, 206, 170, 198, 190]), PAL.kaname, { L: 42, W: 10, gap: 10, start: 26, leafO: { a: 1.25, b: 0.75, serr: [4, 0.8], gloss: true } }),
  kanameRed: () => sprigs(fan(11, 3.0, [190, 172, 206, 180, 204, 210, 178, 200, 174, 194, 186]), PAL.kaname, { L: 42, W: 10, gap: 10, start: 26, tipP: PAL.red, tipFrom: 0.6, leafO: { a: 1.25, b: 0.75, serr: [4, 0.8], gloss: true } }),
  // つつじ in flower: small hairy leaves in whorls at the twig tips, magenta funnels on top
  azalea: () => sprigs(fan(11, 3.0, [150, 128, 168, 136, 158, 174, 140, 162, 128, 154, 146]), PAL.azLeaf, { L: 24, W: 6.5, gap: 7, start: 22, div: 1.0, leafO: { a: 1.05, b: 0.8 },
    node: (x, y, a, dep, i) => { if (i % 2) azaleaFlower(x + Math.cos(a) * 12, y + Math.sin(a) * 12, 18, a + i, PAL.azFl, ACC.az, dep); },
    tip: (x, y, a, dep, i) => azaleaFlower(x + Math.cos(a) * 8, y + Math.sin(a) * 8, 21 + (i % 3) * 2, a + i * 0.7, PAL.azFl, ACC.az, dep) }),
  // a fine small-leaved shrub (box-leaved holly, privet): many small elliptic leaves, close set
  small: () => sprigs(fan(13, 3.0, [190, 166, 206, 160, 182, 210, 174, 198, 158, 188, 200, 170, 180]), PAL.small, { L: 25, W: 7, gap: 6, start: 18, div: 1.25, stemW: 1, leafO: { a: 1, b: 0.8 } }),
  // 黒松, side view: twigs ending in tufts of long stiff needles, the pale spring candles at the tips
  pine: () => {
    const tw = [[128, 252, 124, 40], [124, 252, 40, 70], [132, 252, 216, 66], [120, 250, 10, 150], [136, 250, 246, 146], [126, 252, 76, 30], [130, 252, 180, 28]];
    for (const [x0, y0, x1, y1] of tw) curve([x0, y0], [(x0 + x1) / 2 + (x1 - x0) * 0.1, (y0 + y1) / 2 + 14], [x1, y1], PAL.twig[2], 3, 2);
    // back tufts low and dark, front tufts high and lit; long needles fanned upward
    const T = [[36, 200, 0.95, -1], [220, 198, 0.95, -1], [92, 210, 0.9, -1], [164, 208, 0.9, -1], [128, 190, 1, -1], [10, 150, 1, -1], [246, 146, 1, -1],
      [60, 156, 1, 0], [196, 152, 1, 0], [128, 140, 1.05, 0], [40, 70, 1.1, 0], [216, 66, 1.1, 0], [94, 96, 1.05, 0], [162, 94, 1.05, 0], [124, 40, 1.15, 0], [76, 30, 1, 0], [180, 28, 1, 0]];
    for (const [x, y, s, sh] of T) {
      needleTuft(x, y + 8, -Math.PI / 2, 58 * s, 3.6, 44, PAL.pine, { shift: sh });
      if (sh === 0 && y < 110) { line(x, y + 4, x, y - 12 * s, hex('#b0a67e'), 3); line(x, y + 2, x, y - 11 * s, hex('#d4ca9e'), 1); put(x + 1, Math.round(y - 13 * s), hex('#8a7a58')); }
    }
  },

  // 黒松 pad from above: tufts radiating like stars, packed into an oval
  pineTop: () => {
    const T = [];
    for (let ring = 0; ring < 4; ring++) { const n = ring ? ring * 6 : 1; for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + ring * 0.5, d = ring * 34; T.push([128 + Math.cos(a) * d * 1.05, 130 + Math.sin(a) * d * 0.95, 1.05 - ring * 0.08]); } }
    T.sort((p, q) => p[1] - q[1]);
    for (const [x, y, s] of T) for (let pass = 0; pass < 3; pass++) for (let k = pass; k < 30; k += 3) {
      const a = k / 30 * Math.PI * 2 + pass * 0.07, L = 34 * s * (k % 2 ? 0.86 : 1), up = Math.sin(a) < 0;
      curve([x, y], [x + Math.cos(a + 0.12) * L * 0.5, y + Math.sin(a + 0.12) * L * 0.5], [x + Math.cos(a) * L, y + Math.sin(a) * L], (q) => PAL.pineL[clamp(pass + 1 + (q > 0.6 && up ? 1 : 0) - (q < 0.2 ? 1 : 0), 0, 4)]);
    }
    for (const [x, y] of T) { for (let k = -2; k <= 2; k++) put(Math.round(x) + k, Math.round(y), hex('#c4ba90')); put(Math.round(x), Math.round(y) - 1, hex('#d8d0a8')); put(Math.round(x), Math.round(y) + 1, hex('#9a8a62')); }
  },

  // 染井吉野: umbels of three to five flowers on fine pedicels from short spurs along dark twigs; a few buds
  blossom: () => blossomCell(PAL.bl, [[128, 250, 120, 140, 122, 30], [124, 250, 70, 150, 26, 74], [132, 250, 190, 150, 232, 80], [120, 250, 50, 210, 6, 176], [136, 250, 206, 210, 250, 170]], 0),
  blossom2: () => blossomCell(PAL.bl2, [[128, 250, 140, 150, 150, 40], [124, 250, 80, 140, 52, 50], [132, 250, 200, 170, 236, 110], [120, 250, 40, 190, 10, 130], [130, 250, 110, 190, 90, 120]], 1),
  // いろはもみじ: seven-lobed leaves on fine red petioles, opposite pairs
  maple: () => mapleCell(PAL.maple),
  mapleRed: () => mapleCell(PAL.mapleR),
  // 椿: glossy dark leaves, a red camellia or two
  camellia: () => sprigs(fan(9, 2.9, [190, 164, 206, 172, 196, 208, 168, 186, 176]), PAL.cam, { L: 48, W: 14, gap: 14, start: 22, stem: '#3a3024', leafO: { a: 1.05, b: 0.75, serr: [5, 0.7], gloss: true, tip: 1.2 },
    tip: (x, y, a, dep, i) => { if (i % 3 !== 1) camelliaFlower(x + Math.cos(a) * 10, y + Math.sin(a) * 10, 22 + (i % 2) * 4, a + i, 0.7 + (i % 3) * 0.12, PAL.camFl, ACC.cam, dep); } }),
  // 紫陽花 leaves: big, broad, coarsely toothed, light green, veined
  hydrangea: () => sprigs(fan(5, 2.6, [120, 104, 116, 100, 112]), PAL.hyd, { L: 62, W: 22, gap: 26, start: 22, div: 0.8, stem: '#4a5a32', stemW: 3, leafO: { a: 1, b: 0.7, serr: [6, 2], veins: [9, 0.9], tip: 1.4 } }),
  // a mophead: florets packed into a dome, the lit side paler
  hydrangeaFlower: () => {
    // a dome of little bunches (five to seven florets each), the lit top-left paler, the underside a step darker
    const C = [];
    for (let ring = 0; ring < 5; ring++) { const n = ring ? ring * 6 : 1; for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + ring * 0.6, d = ring * 24; C.push([128 + Math.cos(a) * d, 128 + Math.sin(a) * d * 0.88]); } }
    C.sort((p, q) => p[1] - q[1]);
    C.forEach(([cx, cy], ci) => {
      const L = (cx - 128) * LX + (cy - 128) * LY, sh = L > 40 ? 1 : L < -50 ? -2 : L < -10 ? -1 : 0;
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + ci, d = k ? 9 : 0; floret(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 8.5, a * 1.3 + ci, PAL.hydFl, ACC.hyd, sh); }
    });
  },

  // 朝顔 on its string: heart leaves on long stalks, blue trumpets, a twining stem up the middle
  asagao: () => {
    curve([128, 252], [104, 160], [134, 10], PAL.asa[1], 2, 1); curve([128, 252], [156, 140], [118, 40], PAL.asa[2], 1, 1);
    const L = [[126, 226, 2.6, 44, -1], [130, 196, 0.5, 40, -1], [120, 168, 2.7, 46, 0], [138, 140, 0.4, 42, 0], [116, 110, 2.6, 40, 0], [136, 84, 0.6, 38, 0], [124, 56, 2.4, 34, 0], [132, 30, 0.9, 28, 0]];
    for (const [x, y, a, l, sh] of L) { const ex = x + Math.cos(-a) * 22, ey = y + Math.sin(-a) * 10 - 6; line(x, y, ex, ey, PAL.asa[1]); heart(ex, ey, -a - 0.2, l, l * 0.5, PAL.asa, { shift: sh }); }
    for (const [x, y, r, rot, tl] of [[176, 96, 26, 0.2, 0.92], [72, 152, 24, -0.3, 0.75], [186, 196, 22, 0.6, 0.6]]) asagaoFlower(x, y, r, rot, tl, PAL.asaFl, ACC.asa);
    bud(58, 60, -2.0, 18, PAL.asaFl, 0);
  },
  // 竹: fans of long lanceolate leaves hanging from fine twigs
  bamboo: () => {
    const twigs = [[128, 250, 132, 70], [126, 250, 60, 110], [130, 250, 200, 106], [124, 250, 20, 170], [132, 250, 236, 168]];
    for (const [x0, y0, x1, y1] of twigs) curve([x0, y0], [(x0 + x1) / 2, (y0 + y1) / 2 - 10], [x1, y1], hex('#7a8a48'), 2, 1);
    const F = [[132, 70, -1.3], [60, 110, -2.3], [200, 106, -0.8], [20, 170, -2.6], [236, 168, -0.5], [96, 168, -2.0], [166, 160, -1.1], [128, 140, -1.6]];
    F.forEach(([x, y, a], i) => { for (let k = 0; k < 5; k++) { const aa = a + (k - 2) * 0.42 + 1.2 * Math.sign(Math.cos(a)) * 0.3 + (k > 2 ? 0.5 : 0); leaf(x, y, aa + (Math.sin(aa) < 0 ? 0.6 : 0), 78 - Math.abs(k - 2) * 8, 7, PAL.bamboo, { a: 0.75, b: 0.6, tip: 2, shift: i > 4 ? 0 : -1 }); } });
  },
  // 蔦: three-lobed glossy leaves on long stalks along a creeping stem
  ivy: () => {
    curve([20, 250], [60, 120], [140, 20], hex('#5a4630'), 2, 1); curve([236, 252], [190, 140], [100, 50], hex('#5a4630'), 2, 1);
    const L = [[40, 200, -2.0, 32, -1], [70, 150, -1.0, 36, 0], [62, 92, -2.4, 30, 0], [110, 52, -1.2, 32, 0], [214, 210, -1.0, 34, -1], [196, 160, -2.2, 34, 0], [168, 110, -0.9, 36, 0], [128, 76, -2.0, 30, 0], [140, 180, -1.6, 34, -1], [96, 120, -1.9, 32, 0], [176, 44, -1.1, 26, 0],
      [20, 230, -1.4, 30, -1], [100, 220, -1.8, 32, -1], [176, 226, -1.3, 32, -1], [236, 180, -1.9, 30, -1], [30, 120, -1.5, 28, 0], [226, 100, -1.6, 30, 0], [80, 40, -1.7, 26, 0], [150, 140, -1.2, 32, 0], [50, 170, -1.7, 30, -1]];
    for (const [x, y, a, l, sh] of L) palm(x, y, a, l, [[0, 1, 0.75], [0.95, 0.72, 0.6], [-0.95, 0.72, 0.6]], PAL.ivy, { shift: sh, web: 0.5 });
  },
  // a tuft of meadow grass: blades fanning from the foot, a few seed heads
  grass: () => grassCell(PAL.grass, false),
  // weeds: grass, a dandelion, clover and its white heads, a henbit stem
  weeds: () => grassCell(PAL.grass, true),
  // ゼラニウム: round scalloped leaves with their dark zone, scarlet umbels standing above
  pelargonium: () => {
    // round scalloped leaves on long stalks, each with its dark horseshoe zone; scarlet umbels on stiff stems above
    const round = (x, y, R, sh) => shape(x, y, 0, R + 1, (u, v, dx, dy) => {
      const r = Math.hypot(dx, dy), th = Math.atan2(dy, dx), Rr = R * (0.9 + 0.1 * Math.abs(Math.cos(th * 4.5)));
      if (r > Rr || (r < R * 0.3 && Math.abs(th - Math.PI / 2) < 0.3)) return -1;
      if (Math.abs(r - R * 0.55) < 1.6 && Math.abs(th - Math.PI / 2) > 0.5) return 10;
      if (Math.abs(Math.sin(th * 4.5)) < 0.12 && r > 2) return 1;
      const lit = (dx * LX + dy * LY) / (r || 1);
      return r > Rr - 1.6 ? (lit > 0.2 ? 4 : 1) : lit > 0 ? 3 : 2;
    }, PAL.pel, { shift: sh, acc: [hex('#3e5a24')] });
    for (const [x, y, R, sh] of [[52, 196, 30, -1], [204, 194, 30, -1], [128, 206, 28, -1], [86, 156, 32, 0], [170, 154, 32, 0], [128, 128, 28, 0], [40, 140, 26, 0], [216, 138, 26, 0]]) { line(128, 250, x, y + R * 0.4, PAL.pel[1], 2); round(x, y, R, sh); }
    for (const [cx, cy] of [[92, 56], [166, 46], [128, 84]]) {
      line(128, 250, cx, cy + 14, PAL.pel[1], 2);
      for (let k = 0; k < 11; k++) { const a = k * 2.4, d = k ? 8 + (k % 3) * 5 : 0; five(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, 8.5, a, PAL.pelFl, { acc: ACC.pel }); }
    }
  },

  // トマト: compound leaves of toothed leaflets, a truss of small yellow star flowers
  tomato: () => {
    for (const [x1, y1, sh] of [[30, 120, -1], [226, 116, -1], [128, 24, 0], [70, 60, 0], [188, 58, 0]]) {
      curve([128, 252], [(128 + x1) / 2, 170], [x1, y1], PAL.tom[1], 2, 1);
      const a = Math.atan2(y1 - 170, x1 - (128 + x1) / 2);
      for (let k = 0; k < 4; k++) { const t = 0.4 + k * 0.17, [px, py] = qpt([128, 252], [(128 + x1) / 2, 170], [x1, y1], t); for (const s of [-1, 1]) leaf(px, py, a + s * 1.0, 26, 9, PAL.tom, { serr: [5, 1.6], veins: [6, 0.8], shift: sh }); }
      leaf(x1, y1, a, 30, 10, PAL.tom, { serr: [5, 1.6], veins: [6, 0.8], shift: sh });
    }
    for (const [x, y] of [[150, 110], [162, 98], [142, 96], [156, 84]]) five(x, y, 7, 0.3, ramp('#8a6a10', '#c8a020', '#e8c836', '#f4dc5a', '#fcec90'), { sharp: 1, acc: ACC.tom });
  },
  // ポトス: heart leaves splashed with cream, on trailing stems
  pothos: () => {
    for (const [x, y, a, l, sh] of [[64, 196, -2.4, 56, -1], [190, 196, -0.7, 56, -1], [128, 160, -1.6, 60, 0], [80, 120, -2.1, 54, 0], [176, 116, -1.0, 54, 0], [128, 70, -1.5, 50, 0]]) {
      line(128, 250, x, y, PAL.pothos[1], 2);
      heart(x, y, a, l, l * 0.42, PAL.pothos, { shift: sh, vari: true, acc: ACC.pothos });
    }
  },
  // broad glossy leaves (aucuba, fatsia-ish): the generic big-leaved shrub
  broad: () => sprigs(fan(7, 2.8, [196, 164, 212, 176, 204, 170, 188]), PAL.broad, { L: 66, W: 20, gap: 28, start: 28, div: 0.75, stemW: 3, leafO: { a: 1.1, b: 0.7, serr: [8, 1.2], gloss: true, veins: [11, 0.8], tip: 1.2 } }),
  // 欅: small toothed leaves in two rows along fine zig-zag twigs
  keyaki: () => sprigs(fan(11, 3.0, [196, 170, 210, 162, 188, 204, 172, 196, 160, 190, 180]), PAL.keyaki, { L: 26, W: 7, gap: 8, start: 16, div: 1.1, stemW: 1, stem: '#5a4a3a', leafO: { a: 0.9, b: 0.8, serr: [3, 1], tip: 2 } }),
  // 苔: a cushion of tiny star-tipped moss shoots, seen from above and the side
  moss: () => {
    // cushions of moss seen from the side: rounded humps of tiny upright shoots, each shoot a star of leaves
    const H = [[64, 196, 58, 0.9], [176, 188, 66, 1], [118, 150, 70, 1.1], [40, 120, 40, 0.8], [210, 112, 44, 0.85]];
    for (const [hx, hy, hr, s] of H) for (let y = hy - hr; y <= hy + hr * 0.6; y += 6) for (let x = hx - hr; x <= hx + hr; x += 7) {
      const e = ((x - hx) / hr) ** 2 + ((y - hy) / (hr * 0.75)) ** 2;
      if (e > 1) continue;
      const xx = x + ((y / 6) % 2) * 3, sh = y - hy < -hr * 0.4 ? 1 : y - hy > hr * 0.2 ? -1 : 0;
      for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * 0.55; line(xx, y, xx + Math.cos(a) * 4 * s, y + Math.sin(a) * 4 * s, PAL.moss[clamp(2 + sh + (k === 2 ? 1 : 0), 0, 4)]); }
      put(xx, y + 1, PAL.moss[clamp(1 + sh, 0, 4)]);
    }
    for (const [x, y] of [[100, 80], [140, 70], [168, 92], [84, 100], [196, 76]]) { line(x, y + 10, x + 1, y - 10, hex('#8a6a3a')); put(x + 1, y - 11, hex('#5a3a22')); put(x + 1, y - 12, hex('#7a5a32')); }
  },

  // モンステラ: one big split leaf, fenestrated, filling the card
  monstera: () => {
    // one big leaf: a heart cut by deep slits from the margin and a row of holes either side of the midrib
    line(128, 252, 128, 200, PAL.mon[1], 4);
    const L = 196, W = 96, ls = litSign(-Math.PI / 2), SL = [0.18, 0.3, 0.43, 0.56, 0.69, 0.81];
    shape(128, 116, -Math.PI / 2, 124, (u0, v) => {
      const u = u0 + 98, av = Math.abs(v), t = u / L;
      if (u < -16 || u > L) return -1;
      const lobe = ((av - W * 0.45) / (W * 0.55)) ** 2 + ((u - L * 0.22) / (L * 0.34)) ** 2 <= 1 && !(u < L * 0.06 && av < W * 0.12);
      const hw = t >= 0 ? W * Math.pow(Math.sin(Math.PI * Math.pow(Math.max(t, 0), 0.7)), 0.7) : 0;
      if (!lobe && av > hw) return -1;
      const edge = Math.max(hw, lobe ? W * 0.9 : 0);
      for (const q of SL) {
        // a slit runs from the margin in towards the rib, sloping to the tip
        const su = L * q + av * 0.42, d = Math.abs(u - su);
        if (av > edge * 0.42 && d < 1.6 + (av - edge * 0.42) * 0.05) return -1;
        if (Math.abs(av - edge * 0.3) < 4.5 && Math.abs(u - (L * q + edge * 0.3 * 0.42 + L * 0.06)) < 3.5) return -1;
      }
      if (av < 1.5 && u > 0 && u < L * 0.9) return 2;
      const lit = v * ls > 0;
      return lit ? (av > edge - 2 ? 4 : 3) : av > edge - 2 ? 1 : 2;
    }, PAL.mon);
  },

  // シダ: arching fronds of paired pinnae
  fern: () => {
    for (const [x1, y1, sh] of [[20, 140, -1], [236, 136, -1], [56, 50, 0], [200, 46, 0], [128, 20, 0]]) {
      const c = [(128 + x1) / 2 + (x1 < 128 ? -20 : x1 > 128 ? 20 : 0), Math.min(y1, 120) - 20];
      curve([128, 252], c, [x1, y1], PAL.fern[1], 2, 1);
      for (let k = 2; k < 18; k++) {
        const t = k / 18, [px, py] = qpt([128, 252], c, [x1, y1], t), [qx, qy] = qpt([128, 252], c, [x1, y1], t + 0.02), a = Math.atan2(qy - py, qx - px), L = 22 * Math.sin(Math.PI * Math.min(1, t * 1.1)) + 4;
        for (const s of [-1, 1]) leaf(px, py, a + s * 1.25, L, 3.4, PAL.fern, { a: 0.9, b: 0.9, shift: sh, serr: [3, 0.8] });
      }
    }
  },
  // fallen cherry petals on the ground (a horizontal card): single notched petals, some face up, some curled
  petals: () => {
    const P = [[40, 40, 0.4], [92, 30, 2.1], [150, 46, 1.2], [210, 34, 4.0], [26, 96, 2.8], [76, 88, 5.1], [128, 100, 0.9], [184, 92, 3.3], [232, 104, 1.8], [52, 148, 4.4], [104, 152, 2.5], [160, 140, 5.6], [214, 156, 0.2], [30, 206, 3.7], [84, 212, 1.4], [138, 198, 4.8], [190, 214, 2.9], [236, 224, 0.7], [112, 236, 3.1], [62, 64, 1.7], [176, 182, 4.2], [12, 160, 0.6], [246, 60, 2.2], [128, 60, 3.9]];
    for (const [x, y, a] of P) {
      const tone = Math.round((x * 3 + y) % 3), L = 15, Wd = 6;
      shape(x, y, a, L, (u0, v) => { const u = u0 + L / 2; if (u < 0 || u > L) return -1; const h = Wd * Math.sin(Math.PI * Math.pow(u / L, 0.75)); if (Math.abs(v) > h) return -1; if (u > L - 2.5 && Math.abs(v) < 1.2) return -1; return u < 3 ? 2 : Math.abs(v) > h - 1.5 ? (tone ? 4 : 2) : 3; }, PAL.bl, { litEdge: 1 });
    }
  },

  // leaf litter: old brown leaves lying flat
  litter: () => {
    const P = [[50, 50, 0.5], [140, 40, 2.4], [210, 70, 4.1], [40, 130, 1.3], [110, 120, 5.2], [180, 140, 3.0], [70, 200, 2.2], [150, 210, 0.3], [226, 200, 4.6]];
    for (const [x, y, a] of P) leaf(x - Math.cos(a) * 18, y - Math.sin(a) * 18, a, 38, 11, PAL.litter, { serr: [5, 1], veins: [7, 0.8] });
  },
  // パンジー and marigolds: a flower-bed annual in mixed colours
  pansy: () => {
    sprigs(fan(7, 2.6, [70, 60, 76, 64, 72, 58, 66]), PAL.small, { L: 22, W: 8, gap: 10, start: 12, leafO: { serr: [5, 1] } });
    const C = [ramp('#3a2066', '#5a3a96', '#7c5cba', '#a084d4', '#c4b0e8'), ramp('#806010', '#c09a20', '#e8c434', '#f4dc5a', '#fcf09a'), ramp('#7a7468', '#b0aa9a', '#dcd6c6', '#f0ecdf', '#fffcf4'), ramp('#6a1a2a', '#a8304a', '#cc4a62', '#e2768a', '#f2a6b4')];
    [[128, 110, 0], [80, 140, 1], [176, 136, 2], [100, 80, 3], [160, 84, 0], [52, 104, 2], [206, 100, 3], [128, 160, 1]].forEach(([x, y, c], i) => five(x, y, 18, i * 0.7, C[c], { acc: ACC.pansy, face: true, eye: 2 }));
  },
  // a seedling: two seed leaves and the first true leaves, on a pale stem
  sprout: () => {
    curve([128, 252], [126, 200], [128, 150], hex('#8aa860'), 3, 2);
    for (const s of [-1, 1]) leaf(128, 152, -Math.PI / 2 + s * 1.05, 52, 18, PAL.small, { a: 0.9, b: 0.9 });
    for (const s of [-1, 1]) leaf(128, 140, -Math.PI / 2 + s * 0.35, 66, 16, PAL.tom, { serr: [6, 2], veins: [8, 0.8] });
  },
  // アロエ: thick toothed spears in a rosette, glaucous green with pale flecks along them
  aloe: () => {
    for (const [a, l, sh] of [[-2.7, 100, -1], [-0.45, 100, -1], [-2.2, 120, 0], [-0.95, 118, 0], [-1.6, 130, 0], [-1.85, 110, -1], [-1.3, 112, -1]]) {
      leaf(128, 250, a, l, 16, PAL.aloe, { a: 0.6, b: 0.6, serr: [9, 2.2], shift: sh });
    }
  },
  // pine candles: young shoots standing up out of needle tufts (the top of a spring pad)
  candle: () => {
    for (const [x, y, s] of [[50, 170, 0.8], [206, 168, 0.8], [90, 140, 1], [166, 138, 1], [128, 120, 1.1]]) {
      needleTuft(x, y, -Math.PI / 2, 60 * s, 3.6, 32, PAL.pine, { shift: 0 });
      line(x, y, x, y - 46 * s, hex('#a89a70'), 3); line(x, y - 4, x, y - 44 * s, hex('#d4c89a'), 1);
    }
  },
};
function blossomCell(P, twigs, variant) {
  for (const [x0, y0, cx, cy, x1, y1] of twigs) curve([x0, y0], [cx, cy], [x1, y1], (q) => PAL.twig[q < 0.5 ? 2 : 3], 3, 1);
  // spurs along each twig, an umbel on each
  const U = [];
  twigs.forEach(([x0, y0, cx, cy, x1, y1], ti) => { for (const t of [0.34, 0.46, 0.58, 0.7, 0.82, 0.92, 1]) { const [x, y] = qpt([x0, y0], [cx, cy], [x1, y1], t); U.push([x, y, ti, t]); } });
  U.sort((a, b) => b[1] - a[1]);
  for (const [x, y, ti, t] of U) {
    const n = 3 + ((ti + Math.round(t * 10)) % 3), sh = y > 190 ? -1 : 0;
    for (let k = 0; k < n; k++) {
      const a = -Math.PI / 2 + (k - (n - 1) / 2) * 0.75 + ti * 0.2, d = 12 + (k % 2) * 6, fx = x + Math.cos(a) * d, fy = y + Math.sin(a) * d;
      line(x, y, fx, fy, PAL.twig[3]);
      if ((k + ti + variant) % 7 === 3) { bud(fx, fy + 2, a, 10, ramp('#8a3a52', '#b04a68', '#d0708a', '#e698ae', '#f4c0d0'), sh); continue; }
      sakuraFlower(fx, fy, 9 + ((k + ti) % 2), a * 2 + k, 0.62 + 0.38 * Math.abs(Math.sin(a * 3 + ti)), P, ACC.bl, sh);
    }
  }
  if (variant) for (const [x, y, a] of [[40, 120, -2.4], [214, 140, -0.6], [100, 190, -2.0], [176, 60, -1.0]]) leaf(x, y, a, 20, 6, ramp('#3a2a1a', '#6a4a24', '#8a6a2e', '#a88a3e', '#c4aa58'), { serr: [3, 0.7] });
}
function mapleCell(P) {
  const twigs = [[128, 252, 128, 34], [126, 252, 44, 64], [130, 252, 212, 64], [124, 250, 12, 150], [132, 250, 244, 150], [127, 252, 84, 120], [129, 252, 172, 118]];
  for (const [x0, y0, x1, y1] of twigs) curve([x0, y0], [(x0 + x1) / 2, (y0 + y1) / 2 + 10], [x1, y1], hex('#6a3a32'), 2, 1);
  const lobes = [[0, 1, 0.42], [0.82, 0.92, 0.4], [-0.82, 0.92, 0.4], [1.6, 0.7, 0.36], [-1.6, 0.7, 0.36], [2.3, 0.42, 0.3], [-2.3, 0.42, 0.3]];
  const S = [];
  twigs.forEach(([x0, y0, x1, y1], ti) => { for (const t of [0.36, 0.56, 0.78, 1]) { const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; const a = Math.atan2(y1 - y0, x1 - x0); for (const s of t < 1 ? [-1, 1] : [0]) S.push([x, y, a + s * 0.9, t, ti]); } });
  S.sort((p, q) => q[1] - p[1]);
  for (const [x, y, a, t] of S) { const ex = x + Math.cos(a) * 12, ey = y + Math.sin(a) * 12; line(x, y, ex, ey, hex('#8a3a2e')); palm(ex, ey, a, 32 - t * 4, lobes, P, { serr: 0.9, shift: y > 190 ? -1 : 0 }); }
}
function grassCell(P, weedy) {
  // blades: [foot dx, tip x, tip y, bow, width], hand set so the tuft fans evenly and arches out at the sides
  const B = [[-6, 10, 130, -44, 6], [6, 246, 124, 44, 6], [-4, 30, 66, -32, 6], [4, 226, 60, 32, 6], [-2, 66, 22, -18, 7], [2, 190, 18, 18, 7], [0, 108, 10, -8, 7], [1, 150, 12, 10, 7],
    [-5, 4, 190, -44, 5], [5, 252, 186, 44, 5], [-3, 88, 44, -12, 6], [3, 168, 40, 12, 6], [-1, 128, 26, 4, 6], [-4, 50, 100, -24, 6], [4, 208, 96, 24, 6],
    [-3, 20, 160, -40, 5], [3, 236, 156, 40, 5], [-2, 78, 70, -20, 6], [2, 180, 66, 20, 6], [0, 136, 54, -4, 6], [-1, 98, 96, -10, 5], [1, 160, 90, 10, 5]];
  B.forEach(([fx, x1, y1, bow, w], i) => { const x0 = 128 + fx, cx = (x0 + x1) / 2 + bow, cy = (252 + y1) / 2 + Math.abs(bow) * 0.4; blade(x0, 252, cx, cy, x1, y1, w, i % 4 === 3 ? PAL.grassD : P, i < 8 ? -1 : 0); });
  if (!weedy) {
    for (const [x, y] of [[100, 6], [158, 10]]) { line(128, 250, x, y + 30, PAL.grassD[2]); for (let k = 0; k < 8; k++) { const yy = y + k * 4; put(x - 1 - (k % 2), yy, hex('#b8a870')); put(x + 1 + (k % 2), yy + 1, hex('#9a8a58')); put(x, yy, hex('#c8bc84')); } }
    return;
  }
  // a dandelion rosette, a flower and a clock; clover leaves and white heads; henbit
  for (const a of [-2.8, -0.3, -2.2, -0.9]) leaf(128, 248, a, 60, 10, P, { serr: [8, 4], shift: -1 });
  line(150, 250, 176, 90, PAL.grass[2], 2);
  shape(176, 84, 0, 16, (u, v, dx, dy) => { const r = Math.hypot(dx, dy * 1.2); if (r > 14) return -1; return r < 3 ? 11 : Math.abs(Math.sin(Math.atan2(dy, dx) * 9)) < 0.3 ? 11 : 10; }, P, { acc: ACC.yel, outline: false });
  line(96, 250, 74, 70, PAL.grass[2], 1);
  for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, r = 12; line(74, 64, 74 + Math.cos(a) * r, 64 + Math.sin(a) * r, hex('#e8e4d8')); put(Math.round(74 + Math.cos(a) * r), Math.round(64 + Math.sin(a) * r), hex('#fffcf2')); }
  for (const [x, y] of [[40, 200], [210, 196], [60, 160]]) for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + (k - 1) * 2.1; leaf(x, y, a, 12, 6, P, { a: 1.5, b: 0.6 }); }
  for (const [x, y] of [[214, 150], [36, 128]]) { line(x, y + 40, x, y, PAL.grass[1]); shape(x, y, 0, 8, (u, v, dx, dy) => (Math.hypot(dx, dy) > 6 ? -1 : (dx + dy) & 1 ? 10 : 11), P, { acc: ACC.white }); }
  line(196, 250, 200, 140, hex('#6a4a5a')); for (const y of [140, 160, 180]) { leaf(200, y, -2.6, 12, 6, P, { serr: [3, 1] }); leaf(200, y, -0.5, 12, 6, P, { serr: [3, 1] }); for (const dx of [-3, 0, 3]) put(200 + dx, y - 6, hex('#c060a0')); }
}

/** Draw the whole sheet into an RGBA buffer (rows top-down). */
export function drawSheet() {
  D = new Uint8Array(SW * SH * 4);
  for (const [name, [c, r]] of Object.entries(CELLS)) {
    // keep 3 px clear round every cell so the mips don't bleed between neighbours
    CX0 = c * CS + 3; CY0 = r * CS + 3; CX1 = (c + 1) * CS - 3; CY1 = (r + 1) * CS - 3;
    const fn = CELL_ART[name];
    if (!fn) continue;
    OX = c * CS; OY = r * CS; // cells are authored in their own 0..256 space
    fn();
  }
  OX = OY = 0;
  const out = D; D = null;
  return { data: out, W: SW, H: SH };
}

// ------------------------------------------------------------------------------------------------ the mips
const toLin = new Float32Array(256).map((_, i) => { const v = i / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
const toSrgb = (v) => Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055));

/** The mip chain: premultiplied linear 2x2 means, colour pushed into empty texels from coarser levels, alpha scaled
 *  per cell so a level keeps the coverage of level 0 under the 0.5 alpha cut. Returns [{ data, width, height }]. */
export function buildMips(data, W, H) {
  // linear premultiplied float levels
  const L0 = new Float32Array(W * H * 4);
  for (let i = 0; i < W * H; i++) { const a = data[i * 4 + 3] / 255; L0[i * 4] = toLin[data[i * 4]] * a; L0[i * 4 + 1] = toLin[data[i * 4 + 1]] * a; L0[i * 4 + 2] = toLin[data[i * 4 + 2]] * a; L0[i * 4 + 3] = a; }
  const lv = [{ f: L0, w: W, h: H }];
  while (lv[lv.length - 1].w > 1 || lv[lv.length - 1].h > 1) {
    const p = lv[lv.length - 1], w = Math.max(1, p.w >> 1), h = Math.max(1, p.h >> 1), f = new Float32Array(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 4; c++) {
      let s = 0;
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) s += p.f[((Math.min(p.h - 1, y * 2 + j)) * p.w + Math.min(p.w - 1, x * 2 + i)) * 4 + c];
      f[(y * w + x) * 4 + c] = s / 4;
    }
    lv.push({ f, w, h });
  }
  // the colour of every level, un-premultiplied; empty texels take the colour of the coarser level (push down)
  const col = lv.map((l) => new Float32Array(l.w * l.h * 3));
  for (let k = lv.length - 1; k >= 0; k--) {
    const l = lv[k], C = col[k];
    for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) {
      const i = y * l.w + x, a = l.f[i * 4 + 3];
      if (a > 1e-4) for (let c = 0; c < 3; c++) C[i * 3 + c] = l.f[i * 4 + c] / a;
      else if (k < lv.length - 1) { const u = lv[k + 1], j = Math.min(u.h - 1, y >> 1) * u.w + Math.min(u.w - 1, x >> 1); for (let c = 0; c < 3; c++) C[i * 3 + c] = col[k + 1][j * 3 + c]; }
    }
  }
  // per-cell coverage: level 0 counts texels over the cut; each level's alpha is scaled to match
  const cols = W / CS, rows = H / CS, cov0 = new Float32Array(cols * rows);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (data[(y * W + x) * 4 + 3] >= 128) cov0[Math.floor(y / CS) * cols + Math.floor(x / CS)]++;
  for (let i = 0; i < cov0.length; i++) cov0[i] /= CS * CS;
  const out = [];
  lv.forEach((l, k) => {
    const o = new Uint8Array(l.w * l.h * 4), cs = CS >> k;
    const scale = new Float32Array(cols * rows).fill(1);
    if (k > 0 && cs >= 2) for (let ci = 0; ci < cols * rows; ci++) {
      const cx = (ci % cols) * cs, cy = Math.floor(ci / cols) * cs, A = [];
      for (let y = 0; y < cs; y++) for (let x = 0; x < cs; x++) A.push(l.f[((cy + y) * l.w + cx + x) * 4 + 3]);
      let lo = 0.5, hi = 4;
      for (let it = 0; it < 14; it++) { const m = (lo + hi) / 2; let n = 0; for (const a of A) if (a * m >= 0.5) n++; if (n / A.length < cov0[ci]) lo = m; else hi = m; }
      scale[ci] = (lo + hi) / 2;
    }
    for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) {
      const i = y * l.w + x, ci = cs >= 1 ? Math.min(rows - 1, Math.floor(y / Math.max(1, cs))) * cols + Math.min(cols - 1, Math.floor(x / Math.max(1, cs))) : 0;
      for (let c = 0; c < 3; c++) o[i * 4 + c] = toSrgb(Math.min(1, col[k][i * 3 + c]));
      o[i * 4 + 3] = k === 0 ? data[i * 4 + 3] : Math.round(255 * Math.min(1, l.f[i * 4 + 3] * (cs >= 2 ? scale[ci] : 1.6)));
    }
    out.push({ data: o, width: l.w, height: l.h });
  });
  return out;
}

/** Where mip level k sits in the baked sheet (public/img/foliage.png): level 0 at the origin, the rest down a column. */
export function MIP_AT(k) {
  if (k === 0) return [0, 0];
  let y = 0;
  for (let i = 1; i < k; i++) y += Math.max(1, SH >> i);
  return [SW, y];
}

let TEX = null;
/** The baked sheet as a texture: nearest magnification, the baked mips for minification. Until the image has arrived
 *  it is one transparent texel (the cards are cut away, never drawn black). */
export function leafTexture() {
  if (TEX) return TEX;
  const c = document.createElement('canvas'); c.width = c.height = 1;
  const t = new THREE.Texture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.premultiplyAlpha = false;
  t.needsUpdate = true;
  TEX = t;
  const img = new Image();
  img.onload = async () => {
    try {
      const o = { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }, lv = [];
      for (let k = 0, n = Math.log2(Math.max(SW, SH)) + 1; k < n; k++) {
        const [x, y] = MIP_AT(k), w = Math.max(1, SW >> k), h = Math.max(1, SH >> k);
        lv.push(await createImageBitmap(img, x, y, w, h, o));
      }
      t.source = new (THREE.TextureSource || THREE.Source)(lv[0]);
      t.mipmaps = lv;
      t.generateMipmaps = false;
      t.needsUpdate = true;
    } catch (e) { console.warn('foliage: could not read the sheet', e); }
  };
  img.onerror = () => console.warn('foliage: could not load img/foliage.png');
  img.src = new URL('img/foliage.png', document.baseURI).href;
  return t;
}
/** uv rectangle [u0, vFoot, u1, vTip] of a cell (data rows run top-down and are uploaded unflipped: v = row / H). */
export function cellUV(name) {
  const [c, r] = CELLS[ALIAS[name] || name] || CELLS.small, e = 0.5 / SW;
  return [c * CS / SW + e, ((r + 1) * CS - 3) / SH, (c + 1) * CS / SW - e, (r * CS + 3) / SH];
}
