// Tiny Shokudō (ミニチュア食堂): diner food samples (食品サンプル), each on its own tableware, glossy like the real
// wax-and-vinyl ones in a shop window. Sculpt programs in millimetres (src/figures/sculpt.js); data: src/data/series/shokudo.js.
import { spline, ring, QUAL } from '../sculpt.js';
import { head, torso, blade } from '../anatomy.js';
import {
  fill, proj, wrap, vol, shade, under, crown, face, stamp, tone, tint, mix,
  circle, ellipse, rbox, seg, arc, poly, star, or, and, stroke, pair, all, label, kana, below, above, band, blob, blobs, repeatU, repeatV,
} from '../paint.js';

const MAKER = 'MANPUKUDO';
const GA = 2.39996; // the golden angle: small details placed by rule
const RICE = 0xf7f4ec, NORI = 0x25302a, SOY = 0x6a3a1e;
/** Only the outward-facing side of a vessel (a lathe's outside, not its inside). */
const outer = (L) => ({ ...L, prep: (ctx) => { let x = 0, z = 0; for (const p of ctx.pts) { x += p[0]; z += p[2]; } return ctx.n[0] * x + ctx.n[2] * z > 0 ? L.prep(ctx) : null; } });
const inner = (L) => ({ ...L, prep: (ctx) => { let x = 0, z = 0; for (const p of ctx.pts) { x += p[0]; z += p[2]; } return ctx.n[0] * x + ctx.n[2] * z <= 0 ? L.prep(ctx) : null; } });
/** Rice grains drawn as fine outlines, set out by the golden angle in a disc. */
function grains(cx, cy, R, n, a0 = 0) {
  const g = [];
  for (let i = 0; i < n; i++) { const a = a0 + i * GA, d = R * Math.sqrt((i + 0.5) / n); g.push(stroke(ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1.15, 0.62, a * 1.7), 0.2)); }
  return or(...g);
}
/**
 * A rounded rectangle w x d (half sizes) with corner radius rc at height y, n points (x QUAL.k) spaced evenly along
 * its edge (even cells keep the atlas patch narrow), starting at +z and running counter-clockwise seen from above.
 */
function rrect(w, d, rc, y, n) {
  n = Math.max(8, Math.round(n * QUAL.k));
  rc = Math.min(rc, w, d);
  const a = w - rc, b = d - rc, L = 4 * (a + b) + 2 * Math.PI * rc, out = [];
  for (let i = 0; i < n; i++) {
    let s = (i / n) * L - a; // (from the middle of the +z side)
    if (s < 0) s += L;
    const seg2 = [[2 * a, (t) => [a - t, d]], [Math.PI * rc / 2, (t) => [-a - rc * Math.sin(t / rc), b + rc * Math.cos(t / rc)]], [2 * b, (t) => [-w, b - t]], [Math.PI * rc / 2, (t) => [-a - rc * Math.cos(t / rc), -b - rc * Math.sin(t / rc)]],
      [2 * a, (t) => [-a + t, -d]], [Math.PI * rc / 2, (t) => [a + rc * Math.sin(t / rc), -b - rc * Math.cos(t / rc)]], [2 * b, (t) => [w, -b + t]], [Math.PI * rc / 2, (t) => [a + rc * Math.cos(t / rc), b + rc * Math.sin(t / rc)]]];
    let p = null;
    for (const [len, f] of seg2) { if (s <= len + 1e-9) { p = f(s); break; } s -= len; }
    p = p || [a, d];
    out.push([p[0], y, p[1]]);
  }
  return out;
}
/** A shallow dish: w x d half sizes, h tall, corner radius rc (rc = min(w, d) for an oval-ish one), a foot ring underneath. */
function dish(S, w, d, h, rc = 4, n = 28) {
  const R = (y, k) => rrect(w * k, d * k, rc * k, y, n);
  const rings = [R(0, 0.8), R(0.9, 0.82), R(h * 0.75, 0.98), R(h, 1), R(h, 0.95), R(h - 0.9, 0.84)];
  S.loft(rings, { caps: 'start' });
  S.emit([rings[rings.length - 1]], [0, 1, 0]);
}
/** A rounded triangle (an onigiri's face) w wide, h tall, corners rc: counter-clockwise points in xy, base on y = 0. */
function rtri(w, h, rc, k = 4) {
  const V = [[-w / 2, 0], [w / 2, 0], [0, h]], n = Math.max(3, Math.round(k * QUAL.k));
  const L = [w, Math.hypot(w / 2, h), Math.hypot(w / 2, h)], P = L[0] + L[1] + L[2];
  const rin = (w * h) / P, I = [0, rin]; // (the incentre)
  const nrm = (a, b) => Math.atan2(-(b[0] - a[0]), b[1] - a[1]);
  const out = [];
  for (let i = 0; i < 3; i++) {
    const p = V[(i + 2) % 3], v = V[i], q = V[(i + 1) % 3], k2 = 1 - rc / rin, c = [I[0] + (v[0] - I[0]) * k2, I[1] + (v[1] - I[1]) * k2];
    let a0 = nrm(p, v), a1 = nrm(v, q);
    while (a1 < a0) a1 += Math.PI * 2;
    for (let j = 0; j <= n; j++) { const a = a0 + (a1 - a0) * j / n; out.push([c[0] + Math.cos(a) * rc, c[1] + Math.sin(a) * rc]); }
  }
  return out;
}
/** Chopsticks: two tapered, squared-off sticks from a (the end you hold) to b (the tips). */
function chopsticks(S, a, b, gap, col) {
  S.paint(fill(col, { rough: 0.35 }), vol(blob(a, [3.4, 3.4, 3.4]), tone(col, 0.35)));
  for (const s of [-1, 1]) S.tube([[a[0], a[1] + s * gap, a[2]], [b[0], b[1] + s * gap * 0.25, b[2]]], [1.05, 0.45], { sides: 4 });
}

// ------------------------------------------------------------------ 1. Onigiri Trio
export function onigiri(S) {
  const ORIBE = 0x3d7a58, CREAM = 0xe9dfc4, IRON = 0x6a4a34;
  S.paint(
    fill(CREAM, { rough: 0.32 }), vol((x, y, z) => x + 18 - z * 0.25, ORIBE, { rough: 0.25 }), proj('top', stroke(rbox(0, 0, 32, 17, 3), 0.5, 1.6), tone(CREAM, 0.18)),
    proj('top', or(arc(20, -4, 6, 0.4, 2.2, 0.5), arc(24, 2, 4, 3.4, 5.2, 0.45), seg(18, 6, 26, 9, 0.45), seg(22, 6, 21, 11, 0.4)), IRON), under(0.18), ...stamp(MAKER, { c: 0x8a7a5c }),
  );
  dish(S, 34, 19, 3.2, 5);
  const tri = rtri(21, 19, 4.4);
  const ball = (x, z, yaw, kind) => S.at([x, 3, z], [0, yaw, 0], () => {
    const base = kind === 'yaki' ? 0xcf8f4c : RICE;
    const nori = { ...vol(Object.assign((px, py) => Math.max(Math.abs(px) - 6.2, py - 8), { box: [-6.2, -1e4, -1e4, 6.2, 8, 1e4] }), NORI, { rough: 0.45 }) };
    S.paint(
      fill(base, { rough: kind === 'yaki' ? 0.3 : 0.6 }), proj('front', grains(0, 8.6, 7.6, 22), tone(base, 0.12)), proj('back', grains(0, 8.6, 7.6, 22, 1), tone(base, 0.12)),
      kind === 'yaki' ? [proj('front', or(rbox(-3, 11, 5, 0.7, 0.3, 0.5), rbox(2, 7, 6, 0.7, 0.3, 0.5), rbox(-1, 4, 4, 0.6, 0.3, 0.5)), 0x8a4a22, { alpha: 0.8 }), crown(-0.1)] : nori,
      kind === 'yaki' ? proj('back', or(rbox(0, 9, 6, 0.7, 0.3, -0.4), rbox(1, 5, 5, 0.6, 0.3, -0.4)), 0x8a4a22, { alpha: 0.8 }) : null, under(0.12),
    );
    const st = [[-5.4, 0.66], [-4.9, 0.86], [-3.4, 0.98], [0, 1], [3.4, 0.98], [4.9, 0.86], [5.4, 0.66]];
    S.loft(st.map(([z, k]) => tri.map(([px, py]) => [px * k, 7.2 + (py - 7.2) * k, z])));
    if (kind === 'ume') {
      S.paint(fill(0xc3303a, { rough: 0.35 }), proj('front', or(arc(-0.6, 17.4, 1.6, 0.2, 1.6, 0.3), arc(0.8, 16.4, 1.4, 3.4, 4.6, 0.3)), 0x8a1e2a), crown(-0.12));
      S.ball([0, 17.2, 1.4], [2.5, 2.1, 2.4], { segs: 10, rings: 6 });
    } else if (kind === 'shake') {
      for (let i = 0; i < 6; i++) {
        const a = i * GA, d = 1.6 * Math.sqrt(i + 0.5);
        S.paint(fill(i % 2 ? 0xf3906e : 0xee7d5c, { rough: 0.4 }), proj('front', seg(-1, 0.3, 1, -0.3, 0.25), 0xf8c4a8));
        S.at([Math.cos(a) * d, 17 - d * 0.5, 1 + Math.sin(a) * d * 0.7], [a, a * 0.7, 0.4], () => S.box(-1.2, -0.5, -0.8, 1.2, 0.5, 0.8, { bevel: 0.35 }));
      }
    }
  });
  ball(-13, 2, 0.2, 'ume');
  ball(5, -4, -0.1, 'shake');
  ball(19, 5, -0.45, 'yaki');
  // two slices of takuan, a fan of yellow half-moons
  for (const [i, x] of [[0, -4], [1, -1.4]].map((v) => v)) {
    S.paint(fill(0xf2d046, { rough: 0.35 }), proj('front', stroke(circle(0, 0, 4.2), 0.3), 0xe0b830), proj('back', stroke(circle(0, 0, 4.2), 0.3), 0xe0b830));
    const half = Array.from({ length: 11 }, (_, k) => [Math.cos(Math.PI * k / 10) * 5.6, Math.sin(Math.PI * k / 10) * 5.6]);
    S.at([x - 2, 3.4, 12 - i * 1.4], [-1.25 + i * 0.12, 0.25, 0], () => S.extrude(half, -0.7, 0.7, { bevel: 0.3 }));
  }
}

// ------------------------------------------------------------------ 2. Tamagoyaki Board
export function tamago(S) {
  const WOOD = 0xe4c48e, EGG = 0xf6d24e, BROWN = 0xd8962e;
  const woodGrain = or(seg(-25, 3, 25, 4.2, 0.35), seg(-25, -2, 25, -1.4, 0.35), seg(-25, 8.2, 25, 7.6, 0.3), arc(-6, -9, 6, 0.3, 2.8, 0.3), arc(14, 6, 4, 3.5, 6, 0.3));
  S.paint(fill(WOOD, { rough: 0.85 }), proj('top', woodGrain, tone(WOOD, 0.14)), proj('front', or(seg(-25, 5, 25, 5.4, 0.25), seg(-25, 6, 25, 5.9, 0.2)), tone(WOOD, 0.14)), under(0.2), ...stamp(MAKER, { c: 0x8a6a3a }));
  S.box(-27, 3, -13, 27, 6.6, 13, { bevel: 0.6 });
  S.paint(fill(tone(WOOD, 0.08), { rough: 0.85 }), under(0.2));
  for (const x of [-21, 17]) S.box(x, 0, -12, x + 4, 3.2, 12, { bevel: 0.4 });
  // the roll: rounded-square section, the browned skin of the pan on top, the end cut to show its layers
  const layers = (cx) => or(stroke(rbox(cx, 11.6, 6.4, 4.8, 2.6), 0.32), stroke(rbox(cx, 11.6, 4.4, 3, 1.6), 0.3), stroke(rbox(cx, 11.8, 2.2, 1.2, 0.8), 0.28), seg(cx - 6.6, 12.6, cx - 4.4, 12.6, 0.3));
  const egg = (end) => [
    fill(EGG, { rough: 0.36 }), proj('top', or(ellipse(-12, 1, 5, 2, 0.3), ellipse(-3, -2, 4, 1.4, -0.4)), BROWN, { alpha: 0.28 }), proj('top', or(seg(-19, 4.6, -4, 4.2, 0.35), seg(-17, -4.4, -2, -4.8, 0.35)), tint(EGG, 0.25)),
    proj('front', or(ellipse(-9, 15.8, 6, 0.8), ellipse(-1, 16, 3, 0.6)), BROWN, { alpha: 0.25 }), end, under(0.12),
  ];
  S.paint(egg(proj('right', layers(0), tint(EGG, 0.3))));
  const sec = (x, k = 1) => ring([x, 11.6, 0], 7 * k, 5 * k, 14, { axis: 'x', pow: 2.7 });
  S.loft([sec(-22, 0.82), sec(-21.5, 0.96), sec(-20.6, 1), sec(2, 1)]);
  // three slices leaning on each other
  for (let i = 0; i < 3; i++) {
    S.paint(egg([proj('right', layers(0), tint(EGG, 0.3)), proj('left', layers(0), tint(EGG, 0.3))]));
    S.at([6.5 + i * 5.2, 6.6, 0.4 * i], [0, -0.06 * i, -0.32], () => S.at([0, -6.6, 0], null, () => S.loft([sec(0), sec(3.6)])));
  }
  // grated daikon on a shiso leaf, a drop of soy on top
  S.paint(fill(0x5c9a48, { rough: 0.5 }), proj('top', or(seg(0, -6, 0, 6, 0.3), seg(0, 0, 3, 3, 0.25), seg(0, -3, -3, 0, 0.25), seg(0, 2, -2.6, 4.6, 0.25)), 0x8cc070));
  S.at([-14, 6.9, 8.6], [-Math.PI / 2 + 0.06, -1.1, 0], () => blade(S, 13, 9, 0.6, { shape: 'leaf', cup: 0.8 }));
  S.paint(fill(0xf4f2e8, { rough: 0.7 }), proj('front', or(arc(-1, 9.6, 2, 0.4, 2.4, 0.25), arc(1.6, 8.6, 1.4, 3.6, 5.4, 0.25), arc(-2.4, 8.4, 1.2, 0, 1.6, 0.25)), 0xd9d6ca), vol(blob([-15.6, 11.6, 8.8], [1.5, 1, 1.5]), SOY, { rough: 0.15 }));
  S.ball([-15.6, 8, 8.8], [3.6, 3.4, 3.2], { segs: 12, rings: 7 });
}

// ------------------------------------------------------------------ 3. Takoyaki Boat
export function takoyaki(S) {
  const BOARD = 0xdcc29a, CRUST = 0xd99a4a, SAUCE = 0x5a2e18, MAYO = 0xf6eed2;
  const boat = (y, k) => { const n = Math.max(8, Math.round(18 * QUAL.k)), out = []; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const s = Math.sin(a); out.push([Math.cos(a) * 30 * k, y, Math.sign(s) * Math.abs(s) ** 0.55 * 15 * k]); } return out; };
  S.paint(fill(BOARD, { rough: 0.9 }), proj('top', or(seg(-24, -4, 24, -3.2, 0.25), seg(-22, 5, 22, 5.6, 0.25), seg(-18, 9.6, 18, 9.2, 0.2), seg(-16, -9.2, 18, -9.6, 0.2)), tone(BOARD, 0.12)), proj('front', kana('たこ焼', 0, 2.6, 2.6), 0xb0402a), under(0.2), ...stamp(MAKER, { c: 0x8a6a3a }));
  const R = [boat(0, 0.86), boat(4.6, 1), boat(4.6, 0.96), boat(0.6, 0.83)];
  S.loft(R, { caps: 'start' });
  S.emit([R[3]], [0, 1, 0]);
  const balls = [[-16, -4.6], [-5.4, -5], [5.2, -4.6], [-11, 5.4], [0, 5.2], [10.6, 5]];
  const top = [];
  for (const [i, [x, z]] of balls.entries()) {
    const y = 6.2, r = 6.2, dr = (a, k) => blob([x + Math.sin(a) * r * 0.9, y + 0.6, z + Math.cos(a) * r * 0.9], [1.1, 2.6 * k, 1.1]);
    const sauce = blobs(blob([x, y + 4.6, z], [6.6, 3.6, 6.6]), dr(0.4 + i, 1), dr(2.2 + i, 0.8), dr(4.1 + i, 1.1));
    const mayo = or(...[-4, -1.5, 1, 3.5].map((u, k) => seg(x + u, -z + (k % 2 ? 2.6 : -2.6), x + u + 2.5, -z + (k % 2 ? -2.6 : 2.6), 0.55)));
    const nori = or(...[0, 1, 2, 3, 4].map((k) => { const a = k * GA + i, d = 1.4 + k * 0.8; return rbox(x + Math.cos(a) * d, -z + Math.sin(a) * d, 0.32, 0.2, 0.05, a); }));
    S.paint(fill(CRUST, { rough: 0.5 }), vol(sauce, SAUCE, { rough: 0.18 }), proj('top', mayo, MAYO, { rough: 0.3 }), proj('top', nori, 0x4a7a32), under(0.2), crown(-0.04));
    S.ball([x, y, z], [r, r * 0.92, r], { segs: 14, rings: 8 });
    top.push([x, y + r * 0.92, z]);
  }
  // toothpicks, and the bonito flakes, still dancing in the heat
  S.paint(fill(0xead9b0, { rough: 0.8 }));
  for (const [a, b] of [[[6, 12, -4], [18, 30, -9]], [[-6, 11, 4.6], [-20, 26, 10]]]) S.tube([a, b], [0.42, 0.42, 0.16], { sides: 5 });
  S.joint('flakes', { pivot: [0, 13, 0], axis: 'x', min: -0.25, max: 0.25, rest: 0, idle: 0.18 }, () => {
    for (const [i, p] of top.entries()) for (let k = 0; k < 3; k++) {
      const a = i * 1.7 + k * 2.1;
      S.paint(fill([0xe2b49a, 0xd99c84, 0xecc4ae][k], { rough: 0.8 }), proj('front', or(seg(-0.4, 0.4, -0.2, 2.6, 0.18), seg(0.6, 0.6, 0.5, 2.2, 0.15)), 0xb87a66));
      S.at([p[0] + Math.cos(a) * 1.8, p[1] - 0.6, p[2] + Math.sin(a) * 1.8], [-1.15 + k * 0.3, a, 0.3 - k * 0.25], () => blade(S, 3.6, 3, 0.22, { shape: 'round', cup: 1.3 }));
    }
  });
}

// ------------------------------------------------------------------ 4. Shoyu Ramen
export function ramen(S) {
  const BOWL = 0xf6f2ea, RED = 0xc8302c, SOUP = 0xb2702e;
  // the raimon: a square meander running round under the rim, the bowl's oldest pattern
  const meander = repeatU(or(rbox(0, 0, 2.7, 0.3), rbox(2.4, -1.4, 0.3, 1.7), rbox(0.3, -2.8, 2.4, 0.3), rbox(-2.4, -1.1, 0.3, 1.7), rbox(-0.7, 0.6, 0.3, 0.9), rbox(-1.3, -1.6, 1.3, 0.3), rbox(0, -0.4, 0.3, 1.2)), 6.4);
  S.paint(
    fill(BOWL, { rough: 0.3 }), outer(wrap(24, and(meander, rbox(0, 17.4, 300, 1.6)), RED)), outer(vol(band(19.2, 19.8), RED)), outer(vol(band(14.2, 14.6), RED)),
    outer(wrap(20, or(arc(-14, 7, 5, 0.3, 2.6, 0.6), arc(-6, 9, 4, 3.6, 5.8, 0.5), arc(14, 7.6, 5, 0.6, 2.8, 0.6), arc(22, 9, 3.6, 3.4, 5.6, 0.5)), RED)),
    inner(vol(band(19.2, 19.7), RED)), under(0.16), ...stamp(MAKER, { c: 0x8a8070 }),
  );
  S.lathe([[0, 0.4], [8.6, 0.4], [9.2, 0], [9.8, 0.2], [10, 2.4], [12, 2.8], [17, 6], [21.4, 11.6], [23.6, 17], [24, 20.2], [23.6, 20.8], [23, 20.4], [21.8, 16.8], [18.8, 11.6], [13.6, 7], [0, 5]], { segs: 22 });
  S.paint(fill(SOUP, { rough: 0.12 }), proj('top', or(...[0, 1, 2, 3, 4, 5, 6].map((k) => { const a = k * GA, d = 6 + k * 1.9; return ellipse(Math.cos(a) * d, Math.sin(a) * d, 1.1 + (k % 3) * 0.4, 0.8 + (k % 2) * 0.3); })), 0xd8a050));
  S.lathe([[21.9, 16.4], [0, 16.4]], { segs: 22 });
  const top = 16.4;
  // chashu: two slices, rind round the edge
  for (const [x, z, a] of [[-9, 6, 0.12], [-4, 11, -0.2]]) {
    S.paint(fill(0xd9a088, { rough: 0.4 }), proj('top', or(arc(-1, 1, 3, 0.2, 2.6, 0.5), arc(1.6, -1.4, 2.4, 3.4, 5.6, 0.45)), 0xf0cdb4), vol((px, py, pz) => 6.4 - Math.hypot(px - x, pz - z), 0x8a4a28, { rough: 0.3 }));
    S.at([x, top + 0.4, z], [a, 0.4, -a], () => S.cyl([0, 0, 0], 7.4, 1.4, { segs: 16, bevel: 0.4 }));
  }
  // naruto, scalloped, with its pink whirl
  S.paint(fill(0xf8f4ee, { rough: 0.35 }), proj('top', or(arc(0, 0, 1, 0, Math.PI * 1.4, 0.75), arc(0.4, 0.2, 2.4, Math.PI * 0.9, Math.PI * 2.6, 0.75), arc(-0.3, 0, 3.8, Math.PI * 1.6, Math.PI * 3.2, 0.7)), 0xec6a8e));
  S.at([8, top + 0.2, 9.6], [-0.08, 0.3, 0.06], () => S.at([0, 0, 0], [Math.PI / 2, 0, 0], () => S.extrude(Array.from({ length: 48 }, (_, k) => { const a = (k / 48) * Math.PI * 2, r = 5.2 - 0.5 * Math.abs(Math.sin(a * 6)); return [Math.cos(a) * r, Math.sin(a) * r]; }), -1.1, 0.1, { bevel: 0.3 })));
  // ajitama, halved: the jammy yolk up
  S.paint(fill(0xc88a4a, { rough: 0.3 }), proj('top', ellipse(0, 0, 4.2, 3), 0xf6efe0), proj('top', ellipse(0.2, 0, 2.6, 2), 0xf09a24, { rough: 0.15 }), proj('top', ellipse(0.4, 0.2, 1.4, 1.1), 0xf8b23a));
  S.at([12, top - 0.6, -2], [0, -0.4, 0], () => S.ball([0, 0, 0], [5.4, 3.8, 4], { segs: 14, rings: 8, v1: 0.5 }));
  // menma and spring onion
  for (let i = 0; i < 4; i++) {
    S.paint(fill(0xc8984a, { rough: 0.4 }), proj('top', seg(-3, 0, 3, 0, 0.25), 0xa8783a));
    S.at([-12 + i * 1.4, top + 0.6 + (i % 2) * 0.5, -6 + i * 2.2], [0.1, 0.7 - i * 0.3, 0.1 * i], () => S.box(-4.2, -0.6, -0.9, 4.2, 0.6, 0.9, { bevel: 0.3 }));
  }
  S.paint(fill(0x6aa848, { rough: 0.4 }), crown(0.3));
  for (let i = 0; i < 9; i++) { const a = i * GA + 0.5, d = 2.4 + i * 0.6; S.at([2 + Math.cos(a) * d, top + 0.3, 1 + Math.sin(a) * d], [0, a, 0], () => S.torus([0, 0, 0], 1, 0.36, { segs: 7, sides: 4 })); }
  // the nori sheet standing at the back
  S.paint(fill(NORI, { rough: 0.45 }), proj('front', or(seg(-4, 0, -3.4, 14, 0.2), seg(1, 0, 1.6, 14, 0.2)), tint(NORI, 0.12)));
  S.at([3, top - 2, -15], [-0.35, 0.2, 0], () => S.box(-6, 0, -0.3, 6, 15, 0.3));
  // the noodle lift: chopsticks and a curtain of noodles, frozen mid-slurp (dip them back in)
  S.part('lift', { slide: [0, -8, 0], min: 0, max: 1, rest: 0, g: [0, 1] }, () => {
    chopsticks(S, [30, 44, -6], [2, 34, 4], 1.5, 0x8a3a24);
    S.paint(fill(0xf2d68a, { rough: 0.35 }), under(0.1));
    for (let k = 0; k < 9; k++) {
      const x = 1 + (k - 4) * 1.1, sw = Math.sin(k * 1.9) * 1.6, z = 4 + (k % 3 - 1) * 0.8;
      S.tube(spline([[x * 0.4 + 2, 34.4, z * 0.5 + 1.6], [x + sw * 0.4, 30, z], [x - sw, 25, z + 1], [x + sw, 20.5, z + 1.4], [x * 1.6 - sw, top - 1, z + 2]], 3), 0.5, { sides: 4, caps: false });
    }
  });
}

// ------------------------------------------------------------------ 5. Ebi Tempura Soba Set
export function soba(S) {
  const LAQ = 0x2a1e1e, VERM = 0xb8302a, SOBA = 0x9a8e7a, BAMBOO = 0xd8c48a, BATTER = 0xe8b452;
  // the tray: red lacquer, black rim
  S.paint(fill(VERM, { rough: 0.3 }), vol(above(2.6), LAQ, { rough: 0.3 }), under(0.2), ...stamp(MAKER, { c: 0xd8b0a0 }));
  S.box(-36, 0, -22, 36, 1.6, 22, { bevel: 0.5 });
  for (const [a, b, c, d] of [[-36, -22, 36, -20.6], [-36, 20.6, 36, 22], [-36, -20.6, -34.6, 20.6], [34.6, -20.6, 36, 20.6]]) S.box(a, 1.6, b, c, 3.2, d, { bevel: 0.3 });
  // the zaru box: lacquered, a bamboo mat on top
  S.paint(fill(LAQ, { rough: 0.3 }), proj('front', rbox(-13, 5, 16, 0.25), 0x8a6a3a), under(0.2));
  S.box(-30, 1.6, -18, 4, 7.6, 12, { bevel: 0.6 });
  S.paint(fill(BAMBOO, { rough: 0.6 }), proj('top', repeatU(rbox(0, 0, 0.18, 30), 1.6, -29, 3), tone(BAMBOO, 0.2)), proj('top', or(rbox(-13, 9, 17, 0.25), rbox(-13, -3, 17, 0.25)), 0x6a4a2a));
  S.box(-29, 7.6, -17, 3, 8.2, 11);
  // the soba heap: a mound, and the strands lying over it in loose loops
  const SB = [-13, 8.2, -2.6], hr = (r) => 9.6 * Math.max(0, 1 - (r / 11.4) ** 2) ** 0.62; // (height of the heap at a radius)
  const strands = or(...Array.from({ length: 18 }, (_, k) => arc(-13 + (k % 4) * 1.8 - 2.6, 2.6 + (k % 5) * 1.3 - 2.6, 4 + (k % 4) * 2, k * 0.9, k * 0.9 + 2.4, 0.3)));
  S.paint(fill(tone(SOBA, 0.12), { rough: 0.4 }), proj('top', strands, tone(SOBA, 0.3)), proj('front', strands, tone(SOBA, 0.3)));
  S.lathe([...spline([[11.4, 0], [10.4, 3.4], [7.6, 7], [4, 8.9], [0, 9.4]], 2)].map(([r, y]) => [r, y + SB[1]]), { segs: 16, at: [SB[0], 0, SB[2]], sz: 0.86 });
  S.paint(fill(SOBA, { rough: 0.35 }), crown(-0.1), under(0.15));
  for (let k = 0; k < 16; k++) {
    const a0 = k * GA, r0 = 2 + (k % 5) * 1.9, sweep = 1.6 + (k % 3) * 0.5, P = [];
    for (let j = 0; j <= 5; j++) { const a = a0 + sweep * j / 5, r = Math.min(11, r0 + Math.sin(j * 1.3 + k) * 1.6 + j * 0.5); P.push([SB[0] + Math.cos(a) * r, SB[1] + hr(r) + 0.35, SB[2] + Math.sin(a) * r * 0.86]); }
    S.tube(spline(P, 2), 0.5, { sides: 4, flat: [1, 0.65], caps: false });
  }
  S.paint(fill(NORI, { rough: 0.5 }));
  for (let k = 0; k < 7; k++) { const a = k * GA + 1, d = 1 + k * 0.9; S.at([-13 + Math.cos(a) * d, 8.2 + 9.4 - d * 0.25, -2.6 + Math.sin(a) * d], [0.2, a, 0.15], () => S.box(-1.6, 0, -0.25, 1.6, 0.2, 0.25)); }
  // two prawns and a shishito, in batter on the tray
  const prawn = (x, z, yaw) => S.at([x, 3.2, z], [0, yaw, 0], () => {
    S.paint(fill(BATTER, { rough: 0.55 }), vol(blobs(blob([4, 3, 2], [3, 1.4, 2]), blob([-6, 3.4, 1.6], [3, 1.2, 2.2]), blob([0, 4, -1.4], [2.4, 1, 1.6])), tint(BATTER, 0.3)), under(0.2));
    S.tube(spline([[-14, 2.6, 0], [-8, 3.6, 0.6], [0, 3.8, 0], [9, 2.8, -1], [13.4, 2, -1.4]], 3), (t) => (t < 0.85 ? 3 - Math.abs(t - 0.45) * 2.4 : 2 * (1 - t) / 0.15 + 0.6), { sides: 9 });
    for (const [px, py, pz] of [[-5, 6, 1.4], [3, 6.1, -0.6], [-10, 5, 0], [7, 5.2, 1.6]]) S.ball([px, py - 0.6, pz], [1.3, 0.9, 1.1], { segs: 6, rings: 4 });
    S.paint(fill(0xd8402a, { rough: 0.4 }), proj('front', seg(0, 0.6, 0, 3.4, 0.3), 0xa82a1a));
    for (const s of [-1, 1]) S.at([14, 2.2, -1.4], [0.2 * s, 0, -Math.PI / 2 + 0.3 * s], () => blade(S, 4.4, 3.6, 0.5, { shape: 'leaf' }));
  });
  prawn(16, -9, 0.15);
  prawn(18, -1, -0.12);
  S.paint(fill(0x4a8a3a, { rough: 0.4 }), vol(blob([20, 5, 9], [5, 2, 3]), BATTER), under(0.18));
  S.tube(spline([[12, 4.4, 10], [18, 5, 9.6], [24, 4.4, 8.4], [26.6, 4.2, 8]], 3), [1.3, 1.6, 1.5, 0.6], { sides: 7 });
  S.paint(fill(0x7aa04a));
  S.tube([[12, 4.4, 10], [10.6, 4.6, 10.4]], 0.4, { sides: 4 });
  // the dipping cup (sometsuke), dark tsuyu inside; wasabi and spring onion on a little plate
  S.paint(fill(0xf4f2ec, { rough: 0.25 }), outer(wrap(5.6, or(arc(-3, 7, 2, 0.2, 2.8, 0.45), arc(2, 6, 2.4, 3.4, 6, 0.45), seg(-6, 4.2, 6, 4.2, 0.35), seg(-9, 3.4, -4, 3.4, 0.35)), 0x2f5aa8)), outer(vol(band(10.4, 10.9), 0x2f5aa8)), under(0.15));
  S.lathe([[0, 3.2], [3.4, 3.2], [3.8, 3.4], [4.4, 4.2], [6, 11.4], [5.6, 11.6], [4.4, 5.2], [0, 4.6]], { segs: 16, at: [20, 0, 12] });
  S.paint(fill(0x3a1e10, { rough: 0.08 }));
  S.lathe([[5.4, 10], [0, 10]], { segs: 16, at: [20, 0, 12] });
  S.paint(fill(0xf4f2ec, { rough: 0.25 }), proj('top', stroke(ellipse(0, 0, 6, 4.2), 0.4, 0.6), 0x2f5aa8));
  S.at([30, 3.2, 14], null, () => S.lathe([[0, 0], [5, 0], [6.4, 1.2], [6, 1.4], [0, 0.8]], { segs: 14, sz: 0.7 }));
  S.paint(fill(0x8ac048, { rough: 0.5 }), proj('front', or(arc(0, 6, 1, 0, 2, 0.2), arc(1, 5, 1, 3, 5, 0.2)), 0x6a9a38));
  S.ball([28.4, 4.8, 14], [1.8, 1.4, 1.5], { segs: 9, rings: 5 });
  S.paint(fill(0x6aa848), crown(0.3));
  for (let i = 0; i < 5; i++) S.at([31.4 + (i % 3) * 1.2, 4.3, 13.2 + (i % 2) * 1.4], [0, i, 0], () => S.torus([0, 0, 0], 0.7, 0.3, { segs: 6, sides: 4 }));
}

// ------------------------------------------------------------------ 6. Ketchup-Heart Omurice
export function omurice(S) {
  const PLATE = 0xf8f6f0, GOLD = 0xd8b04a, OMU = 0xf8d250, KETCH = 0xc8241e;
  S.paint(fill(PLATE, { rough: 0.25 }), proj('top', stroke(ellipse(0, 0, 33.6, 23.6), 0.6), GOLD, { rough: 0.2 }), proj('top', stroke(ellipse(0, 0, 31.6, 21.8), 0.25), GOLD), under(0.16), ...stamp(MAKER, { c: 0x9a9080 }));
  S.loft([ring([0, 0, 0], 28, 20, 24), ring([0, 0.9, 0], 28.6, 20.4, 24), ring([0, 2.4, 0], 34.4, 24.4, 24), ring([0, 3, 0], 35, 25, 24), ring([0, 3, 0], 33.4, 23.6, 24), ring([0, 1.8, 0], 29, 20.6, 24)], { caps: 'start' });
  S.emit([ring([0, 1.8, 0], 29, 20.6, 24)], [0, 1, 0]);
  // the omelette: a plump rugby ball, its seam tucked underneath, the ketchup heart on top
  const heart = or(circle(-3.4, 2.2, 4.2), circle(3.4, 2.2, 4.2), poly([[-7.4, 0.8], [7.4, 0.8], [0, -7.6]]));
  const drips = or(seg(-6, 7, -6.2, 9.4, 0.8), seg(4, 7.4, 4.3, 10.6, 0.8), circle(4.3, 7.4, 0.95));
  S.paint(
    fill(OMU, { rough: 0.32 }), proj('top', heart, KETCH, { rough: 0.15 }), proj('top', or(seg(-14, -1, -8, 3, 1.1), seg(8, 2, 14, -1, 1.1), seg(-14, -1, -16, -3.6, 0.9)), KETCH, { rough: 0.15 }),
    proj('front', drips, KETCH, { rough: 0.15, near: 4 }), proj('top', or(ellipse(-9, -5, 4, 1.4, 0.3), ellipse(10, 6, 3, 1.1, -0.2)), 0xf6e098, { alpha: 0.7 }), under(0.12),
  );
  const st = [[-1, 0.06, 0.06], [-0.94, 0.42, 0.44], [-0.7, 0.8, 0.82], [-0.25, 0.98, 1], [0.25, 0.98, 1], [0.7, 0.8, 0.82], [0.94, 0.42, 0.44], [1, 0.06, 0.06]];
  S.loft(spline(st, 2).map(([x, w, h]) => ring([x * 21, 3 + 7.6 * h * 0.55, 0], 10.4 * w, 7.6 * h, 16, { axis: 'x', pow: 2.2 }).map((p) => [p[0], Math.max(3.2, p[1]), p[2]])));
  // parsley, a little salad: lettuce, a tomato wedge, a slice of cucumber
  S.paint(fill(0x3f8a3a, { rough: 0.6 }), crown(0.15));
  for (let i = 0; i < 6; i++) { const a = i * GA; S.ball([-17 + Math.cos(a) * 1.6, 12 + Math.sin(a) * 0.8 - i * 0.2, -8 + Math.sin(a) * 1.4], 1.3, { segs: 7, rings: 4 }); }
  S.paint(fill(0x8ac850, { rough: 0.55 }), proj('top', or(seg(0, -8, 0, 8, 0.4), seg(0, 0, 4, 4, 0.3), seg(0, 3, -4, 6, 0.3)), 0xc8e89a), under(0.15));
  for (const [x, z, a] of [[22, -6, 0.6], [25, -1, 1.4], [20, -12, -0.4]]) S.at([x, 3.4, z], [-1.3, a, 0], () => blade(S, 12, 9, 0.6, { shape: 'round', cup: 2.4 }));
  S.paint(fill(0xd8302a, { rough: 0.25 }), proj('front', or(ellipse(0, 2.4, 2.4, 1.6), ellipse(0, 2.4, 1, 0.7)), 0xf08a6a), proj('front', or(circle(-1.2, 2.4, 0.35), circle(1.2, 2.6, 0.35), circle(0, 1.4, 0.35)), 0xf2d880));
  S.at([22, 5, 4], [0, -0.5, 0], () => S.extrude([[-4, 0], [4, 0], [3, 2.6], [0, 4.4], [-3, 2.6]], -2, 2, { bevel: 0.5 }));
  S.paint(fill(0xd8f0b0, { rough: 0.4 }), proj('front', stroke(circle(0, 0, 3.6), 0.6, 0.3), 0x3a7a2a), proj('front', or(...[0, 1, 2, 3, 4].map((k) => circle(Math.cos(k * 1.26) * 1.8, Math.sin(k * 1.26) * 1.8, 0.35))), 0xa8c878));
  S.at([28, 5.4, 6], [-0.9, 0.3, 0], () => S.cyl([0, -0.6, 0], 3.6, 1.2, { segs: 14 }));
  // the flag: the diner's own, on a toothpick (it turns in the breeze)
  S.joint('flag', { pivot: [-3, 0, -2], axis: 'y', min: -0.8, max: 0.8, rest: 0, g: [0, 0.8], idle: 0.25 }, () => {
    S.paint(fill(0xead9b0, { rough: 0.8 }));
    S.tube([[-3, 7, -2], [-3, 30, -2]], 0.32, { sides: 5 });
    // (the diner's own flag: a yellow pennant, a red border and a white rice bowl with steam)
    const bowl = (sx) => or(and(circle(sx * 4.8, 26.4, 2.4), { d: (u, v) => v - 26.4, b: null }), rbox(sx * 4.8, 26.6, 2.6, 0.3), seg(sx * 4.2, 27.6, sx * 4.4, 28.8, 0.3), seg(sx * 5.4, 27.6, sx * 5.6, 28.8, 0.3));
    S.paint(fill(0xf6d04a, { rough: 0.7 }), proj('front', stroke(rbox(4.8, 26, 4.8, 4, 0), 0.8, 0.4), 0xd8302a), proj('back', stroke(rbox(-4.8, 26, 4.8, 4, 0), 0.8, 0.4), 0xd8302a), proj('front', bowl(1), 0xf8f6f0), proj('back', bowl(-1), 0xf8f6f0));
    S.at([-3, 0, -2], null, () => S.box(0, 22, -0.2, 9.6, 30, 0.2));
  });
}

// ------------------------------------------------------------------ 7. Sushi Geta Platter
export function sushi(S) {
  const GETA = 0xe0c08c, SHARI = 0xf6f2e6;
  S.paint(fill(GETA, { rough: 0.85 }), proj('top', or(seg(-38, 3, 38, 3.6, 0.3), seg(-38, -6, 38, -6.4, 0.3), arc(-10, 12, 9, 3.6, 5.6, 0.3), seg(-38, 8.6, 38, 8.2, 0.25)), tone(GETA, 0.14)), under(0.2), ...stamp(MAKER, { c: 0x8a6a3a }));
  S.box(-40, 5, -16, 40, 8.4, 16, { bevel: 0.6 });
  S.paint(fill(tone(GETA, 0.08), { rough: 0.85 }), under(0.2));
  for (const x of [-30, 26]) S.box(x, 0, -15, x + 4, 5.2, 15, { bevel: 0.4 });
  // a nigiri: a pressed pillow of rice, the neta draped over it
  const nigiri = (x, z, yaw, neta, extra) => S.at([x, 8.4, z], [0, yaw, 0], () => {
    S.paint(fill(SHARI, { rough: 0.6 }), proj('front', grains(0, 3, 4, 10), tone(SHARI, 0.1)), proj('right', grains(0, 3, 4, 10, 2), tone(SHARI, 0.1)), proj('left', grains(0, 3, 4, 10, 3), tone(SHARI, 0.1)), under(0.15));
    S.loft(spline([[-1, 0.5, 0.05], [-0.92, 0.86, 0.5], [-0.6, 1, 0.92], [0, 1, 1], [0.6, 1, 0.92], [0.92, 0.86, 0.5], [1, 0.5, 0.05]], 2).map(([zz, w, h]) => sect(12, (c, sn) => [Math.sign(c) * Math.abs(c) ** 0.8 * 5.4 * w, sn > 0 ? sn ** 0.8 * 6 * h : sn * 0.4, zz * 10])));
    if (neta) {
      S.paint(neta);
      const sheet = (u, v) => 6.6 * Math.sin(u * Math.PI) ** 0.5 - 1.4 * (v - 0.5) ** 2 * 4 + 0.6;
      // (the sheet runs along x; the neta lies along z, so turn it)
      S.at([0, 0, 0], [0, Math.PI / 2, 0], () => S.with({ crease: 70 }, () => drapeSheet(S, -12, -7, 12, 7, sheet)));
    }
    if (extra) extra();
  });
  const MAGURO = 0xc22a36, SALMON = 0xf28a52, EBI = 0xf6efe6;
  nigiri(-31, -2, 0.08, [fill(MAGURO, { rough: 0.25 }), proj('top', or(seg(-3, -9, 2, 9, 0.35), seg(1, -9, 5, 7, 0.3)), tint(MAGURO, 0.2)), under(0.2)]);
  nigiri(-17, -1, -0.06, [fill(SALMON, { rough: 0.25 }), proj('top', repeatU(rbox(0, 0, 0.45, 8, 0.2, 0.25), 3.2), 0xfcd8c0), under(0.2)]);
  nigiri(-3, -2, 0.1, [fill(EBI, { rough: 0.3 }), proj('top', repeatU(rbox(0, 0, 0.9, 8, 0.4), 3, -12, 8), 0xf05a3a), proj('top', repeatU(rbox(0.6, 0, 0.3, 8, 0.2), 3, -12, 8), 0xf8a080), under(0.2)]);
  // tamago with its nori belt
  S.at([11, 8.4, -2], [0, -0.08, 0], () => {
    S.paint(fill(SHARI, { rough: 0.6 }), proj('front', grains(0, 2, 4, 8), tone(SHARI, 0.1)), under(0.15));
    S.box(-5, 0, -9, 5, 4.6, 9, { bevel: 1.6 });
    S.paint(fill(0xf6d050, { rough: 0.35 }), proj('front', or(seg(-5, 6.6, 5, 6.6, 0.3), seg(-5, 8.4, 5, 8.4, 0.3)), 0xe0b030), proj('top', or(ellipse(-2, 4, 3, 1.4), ellipse(2, -5, 2, 1)), 0xd8962e, { alpha: 0.5 }));
    S.box(-6, 4.4, -11, 6, 10.4, 11, { bevel: 0.8 });
    S.paint(fill(NORI, { rough: 0.45 }));
    S.box(-6.4, 0.6, -2, 6.4, 10.9, 2, { bevel: 0.3, skip: [] });
  });
  // ikura gunkan: a nori wall round rice, glossy roe heaped on top
  S.at([25, 8.4, -2], [0, 0.1, 0], () => {
    S.paint(fill(NORI, { rough: 0.45 }), proj('front', or(seg(-4, 0, -4, 10, 0.2), seg(3, 0, 3, 10, 0.2)), tint(NORI, 0.1)));
    S.lathe([[6.6, 0], [6.6, 10], [6.2, 10], [6.2, 0.6]], { segs: 18, sz: 1.5, cap: false });
    S.paint(fill(SHARI, { rough: 0.6 }));
    S.lathe([[0, 6.6], [6.2, 6.6]].reverse(), { segs: 18, sz: 1.5 });
    S.clear(true);
    S.paint(fill(0xf46a1a, { rough: 0.1 }), crown(-0.2));
    for (let i = 0; i < 16; i++) { const a = i * GA, d = Math.sqrt(i + 0.5) * 1.5; S.ball([Math.cos(a) * d * 0.95, 7.8 + (1 - d / 6.2) * 2.2, Math.sin(a) * d * 1.45], 1.45, { segs: 6, rings: 4 }); }
    S.clear(false);
  });
  // gari, wasabi and a baran leaf
  S.paint(fill(0xf4b4b8, { rough: 0.35 }), proj('front', seg(-1, 1, 1, 3, 0.3), 0xe88a94));
  for (let i = 0; i < 4; i++) S.at([34 + (i % 2) * 1.4, 9 + i * 0.8, 9 + i * 0.4], [-1.1 + i * 0.3, i * 0.9, 0.3], () => blade(S, 5.4, 4.4, 0.5, { shape: 'round', cup: 0.6 }));
  S.paint(fill(0x8ac048, { rough: 0.5 }), proj('front', or(arc(0, 2, 1.4, 0, 2.4, 0.25), arc(1, 1, 1.2, 3.2, 5.2, 0.25)), 0x6a9a38));
  S.at([33, 8.4, -9], null, () => S.lathe(spline([[3, 0], [2.6, 1.6], [1.4, 3], [0, 3.6]], 2), { segs: 10 }));
  S.paint(fill(0x2f9a4a, { rough: 0.3 }), proj('front', seg(0, 0, 0, 7, 0.3), 0x5aba6a));
  const zig = [[-7, 0]]; for (let k = 0; k <= 7; k++) zig.push([-7 + k * 2, k % 2 ? 7.4 : 5.8]); zig.push([7, 0]);
  S.at([32.6, 8.4, 3], [0, Math.PI / 2 - 0.2, 0], () => S.extrude(zig, -0.25, 0.25));
}
/** A thick sheet over [x0, x1] x [z0, z1], lifted by fold(u, v) (a slice of fish over its rice). */
function drapeSheet(S, x0, z0, x1, z1, fold) {
  const nx = Math.round(8 * QUAL.k), nz = Math.round(5 * QUAL.k), th = 1.5, P = [], Q = [];
  for (let j = 0; j <= nz; j++) { const r = [], q = []; for (let i = 0; i <= nx; i++) { const u = i / nx, v = j / nz, y = fold(u, v); r.push([x0 + (x1 - x0) * u, y, z0 + (z1 - z0) * v]); q.push([x0 + (x1 - x0) * u, y - th * Math.sin(u * Math.PI) ** 0.3 - 0.05, z0 + (z1 - z0) * v]); } P.push(r); Q.push(q); }
  const polys = [];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    polys.push({ pts: [P[j][i], P[j + 1][i], P[j + 1][i + 1], P[j][i + 1]], hint: [0, 1, 0] });
    polys.push({ pts: [Q[j][i], Q[j][i + 1], Q[j + 1][i + 1], Q[j + 1][i]], hint: [0, -1, 0] });
  }
  for (let i = 0; i < nx; i++) for (const [j, s] of [[0, -1], [nz, 1]]) polys.push({ pts: [P[j][i], P[j][i + 1], Q[j][i + 1], Q[j][i]], hint: [0, 0, s] });
  for (let j = 0; j < nz; j++) for (const [i, s] of [[0, -1], [nx, 1]]) polys.push({ pts: [P[j][i], P[j + 1][i], Q[j + 1][i], Q[j][i]], hint: [s, 0, 0] });
  S.emit(polys);
}
/** A closed section of n points (x QUAL.k) from fn(cos, sin) -> [x, y, z], starting at the top like ring(). */
function sect(n, fn) { n = Math.max(4, Math.round(n * QUAL.k)); return Array.from({ length: n }, (_, i) => { const a = Math.PI / 2 - Math.PI / n + (i / n) * Math.PI * 2; return fn(Math.cos(a), Math.sin(a)); }); }

// ------------------------------------------------------------------ 8. Neko Yatai (secret)
export function yatai(S) {
  const WOOD = 0xb0844e, DARK = 0x6a4a2e, NAVY = 0x2a3a6a, LANT = 0xe8402e, CAT = 0xf2ece0, TABBY = 0xe0a050;
  const plank = (w, h) => or(...Array.from({ length: Math.ceil(h / 3.4) }, (_, k) => seg(-w, k * 3.4, w, k * 3.4, 0.3)));
  // the cart: a plank body on two spoked wheels, a counter along the front
  S.paint(fill(WOOD, { rough: 0.8 }), proj('front', plank(30, 26), tone(WOOD, 0.2)), proj('right', plank(30, 26), tone(WOOD, 0.2)), proj('left', plank(30, 26), tone(WOOD, 0.2)),
    proj('front', rbox(0, 13, 12, 6, 0.6), 0xf4ead2), proj('front', kana('おでん', 0, 13.6, 6.4), 0x2a2430), under(0.2), ...stamp(MAKER, { c: 0x5a3a20 }));
  S.box(-24, 7, -12, 24, 26, 12, { bevel: 0.6 });
  S.paint(fill(DARK, { rough: 0.6 }), crown(0.12), under(0.2));
  S.box(-27, 26, -14, 27, 28.6, 16, { bevel: 0.5 });
  for (const s of [-1, 1]) {
    S.paint(fill(DARK, { rough: 0.6 }));
    S.at([s * 25.6, 11, 0], [0, 0, Math.PI / 2], () => { S.torus([0, 0, 0], 10, 1.2, { segs: 18, sides: 6 }); S.cyl([0, -1.6, 0], 2.2, 3.2, { segs: 10 }); for (let k = 0; k < 8; k++) S.tube([[0, 0, 0], [Math.cos(k * Math.PI / 4) * 9.4, 0, Math.sin(k * Math.PI / 4) * 9.4]], 0.55, { sides: 4, caps: false }); });
  }
  S.paint(fill(DARK, { rough: 0.6 }));
  for (const s of [-1, 1]) S.box(s * 22 - 1.4, 0, -2, s * 22 + 1.4, 7, 2);
  S.tube([[-24, 15, 12], [-40, 12, 14]], 1, { sides: 6 }); S.tube([[-24, 15, -12], [-40, 12, -14]], 1, { sides: 6 });
  // posts and a pitched roof, the noren hanging from the eave
  S.paint(fill(DARK, { rough: 0.7 }), under(0.2));
  for (const [x, z] of [[-24, -11], [24, -11], [-24, 13], [24, 13]]) S.box(x - 1, 28.6, z - 1, x + 1, 52, z + 1);
  S.paint(fill(0x7a6a5a, { rough: 0.75 }), proj('top', repeatU(rbox(0, 0, 0.3, 30), 4), 0x5a4a3e), under(0.3));
  for (const s of [-1, 1]) S.at([0, 56, 1], [s * 0.42, 0, 0], () => S.box(-31, -1, 0, 31, 1, s * 18, { bevel: 0.4 }));
  S.paint(fill(DARK));
  S.box(-31.5, 55.6, -0.6, 31.5, 58, 2.6, { bevel: 0.4 });
  const noren = (k) => [fill(NAVY, { rough: 0.9 }), proj('front', kana(['ね', 'こ', 'や'][k], 0, -0.2, 4.8), 0xf4ead2), under(0.2)];
  for (let k = 0; k < 3; k++) { S.paint(noren(k)); S.at([-16 + k * 16, 52, 17.2], null, () => S.box(-7.4, -3.6, -0.3, 7.4, 3.6, 0.3)); }
  // the lantern, swinging a little
  S.joint('lantern', { pivot: [-27, 52, 16], axis: 'z', min: -0.4, max: 0.4, rest: 0, idle: 0.15 }, () => {
    S.paint(fill(LANT, { rough: 0.6 }), wrap(4.6, kana('おでん', 0, 40.4, 5.6), 0x2a2430), vol(band(42.3, 45), tint(LANT, 0.14)), shade(vol(band(37.2, 38)), 0.2));
    S.lathe(spline([[1.8, 36], [4.4, 37], [5, 40.4], [4.4, 44], [1.8, 45]], 3), { segs: 14, at: [-27, 0, 16] });
    S.paint(fill(0x2a2430));
    S.cyl([-27, 35.2, 16], 2.2, 1.2, { segs: 10 }); S.cyl([-27, 44.8, 16], 2.2, 1.2, { segs: 10 }); S.tube([[-27, 46, 16], [-27, 52, 16]], 0.3, { sides: 4 });
  });
  // the oden pot set into the counter: a square bath of broth, a skewer or three
  S.paint(fill(0xb8bcc2, { rough: 0.35 }), under(0.2));
  S.box(-20, 26, -4, -2, 30, 12, { bevel: 0.4 });
  S.paint(fill(0x9a6a2a, { rough: 0.1 }));
  S.box(-19, 29.2, -3, -3, 29.8, 11);
  for (const [x, z, kind] of [[-15, 3, 0], [-9, 7, 1], [-6, 1, 2]]) {
    S.paint(fill(kind === 0 ? 0x8a8478 : kind === 1 ? 0xe4c88a : 0xd8b07a, { rough: 0.5 }), under(0.2));
    if (kind === 0) S.at([x, 31, z], [0.3, 0.3, 0], () => S.extrude([[-2.4, -2], [2.4, -2], [0, 2.4]], -0.8, 0.8, { bevel: 0.3 }));
    else if (kind === 1) S.cyl([x, 29.4, z], 2.8, 2.4, { segs: 12 });
    else S.at([x, 30.6, z], [0, 0, 0.3], () => S.tube([[-2.6, 0, 0], [2.6, 0, 0]], 1.3, { sides: 8 }));
    S.paint(fill(0xead9b0));
    S.tube([[x, 29.6, z], [x + 1, 38, z - 1]], 0.3, { sides: 4 });
  }
  // the cat, behind the counter in a hachimaki
  S.paint(fill(CAT, { rough: 0.7 }), vol(blobs(blob([8, 29, -6], [6, 4, 4]), blob([3, 35, -6], [3, 3, 3])), TABBY), under(0.18));
  torso(S, [8, 32.4, -5], [7.6, 9, 6], { belly: 0.14, hips: 1.04, sit: 0.3 });
  S.paint(fill(0xf4f2ec, { rough: 0.8 }), proj('front', kana('一番', 0, 32, 3.6), NAVY), under(0.2));
  S.lathe([[6.8, 24], [7.8, 28], [7.4, 33], [0, 33.4]], { segs: 14, at: [8, 0, -4.4], sz: 0.86 });
  S.joint('head', { pivot: [8, 40, -5], axis: 'z', min: -0.3, max: 0.3, rest: 0, idle: 0.08 }, () => S.at([8, 45, -4], null, () => {
    S.paint(fill(CAT, { rough: 0.7 }), vol(blobs(blob([-3.6, 3.6, 2], [3.4, 3, 4]), blob([4, 4, -2], [3, 2, 4])), TABBY), ...face({ at: [0, 0.6], gap: 6, r: 1.1, eye: 'closed', mouth: 'w', mw: 2.6, my: 2.6, blush: 0xf2a0a0 }), under(0.14), crown(0.06));
    head(S, [0, 0, 0], [7.2, 6.2, 6.4], { muzzle: 0.25, brow: 0.2, cheek: 0.22, chin: 0.2, pow: 2.2 });
    S.paint(fill(0xf09aa0, { rough: 0.3 }));
    S.ball([0, -0.8, 6.3], [0.9, 0.6, 0.5], { segs: 6, rings: 4 });
    S.paint(fill(0x6a6068), proj('front', pair(or(seg(3.2, -1.4, 7, -0.6, 0.22), seg(3.2, -2.2, 7, -2.8, 0.22))), 0x6a6068));
    for (const s of [1, -1]) { S.paint(fill(s > 0 ? TABBY : CAT, { rough: 0.7 }), proj('front', ellipse(0, 2.6, 1.3, 2), 0xf2b0b0)); S.at([s * 4.4, 4.4, -0.6], [0, 0, -s * 0.5], () => blade(S, 5.4, 5.6, 1.4, { shape: 'ear', cup: 0.6 })); }
    S.paint(fill(0xf4f2ec, { rough: 0.85 }), proj('front', circle(0, 3.4, 1.2), 0xd8302a));
    S.lathe([[7.3, 2.2], [7.4, 4.4], [6.9, 4.6], [6.8, 2.4]], { segs: 18, sz: 0.9, cap: false });
    S.tube(spline([[-1, 4, -6.4], [-3, 5.4, -9], [-1.6, 7, -10.4]], 2), 0.6, { sides: 4 });
  }));
  S.paint(fill(CAT, { rough: 0.7 }), under(0.16));
  S.joint('arm', { pivot: [14, 37, -3], axis: 'z', min: -0.6, max: 0.4, rest: 0, g: [0, -0.55], idle: 0.1 }, () => {
    S.tube(spline([[14, 37, -3], [17, 33, 1], [16, 31, 5]], 2), 1.8, { sides: 7 });
    S.paint(fill(0xb8bcc2, { rough: 0.3 }));
    S.tube([[15.6, 30.4, 5.4], [8, 31.6, 7]], 0.4, { sides: 4 });
    S.lathe([[0, 0], [1.8, 0.2], [2.2, 1.6], [1.8, 1.8], [0.6, 0.8]], { segs: 10, at: [7.4, 30, 7.2] });
  });
  S.tube(spline([[2, 37, -3], [0, 33, 2], [-1, 31, 5]], 2), 1.8, { sides: 7 });
  // the price board: dried sardines only
  S.paint(fill(0xf4ead2, { rough: 0.8 }), proj('front', kana('にぼし', 0, 6.8, 3.6), 0x2a2430), proj('front', label('ONLY', 0, 2.4, 0.42), 0xd8302a, { hard: true }), proj('front', or(ellipse(-6, 1.2, 2.4, 0.9), poly([[-3.8, 1.2], [-2.6, 2.4], [-2.6, 0]])), 0x7a8a9a), under(0.2));
  S.at([17, 28.6, 12], [-0.15, -0.2, 0], () => S.box(-8, 0, -0.5, 8, 10, 0.5, { bevel: 0.3 }));
}
