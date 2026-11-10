// My Tiny Room (ミニチュアのお部屋): dollhouse furniture of a Shōwa house, each piece on its own tatami (the bath on its
// tiles), lived in. Sculpt programs in millimetres (src/figures/sculpt.js); data: src/data/series/heya.js.
import { spline, ring, swell, QUAL } from '../sculpt.js';
import { head, torso, loaf, blade, drape } from '../anatomy.js';
import {
  fill, proj, wrap, vol, shade, under, crown, face, stamp, tone, tint, mix, EYE,
  circle, ellipse, rbox, seg, arc, poly, star, or, and, cut, stroke, pair, all, label, kana, below, above, band, blob, blobs, repeatU, repeatV,
} from '../paint.js';

const MAKER = 'KOBEYA';
const GA = 2.39996;
const KIRI = 0xdcc49c, KEYAKI = 0xa8683c, TAT = 0xcdc489, HERI = 0x2e3446, IRON = 0x3a3436;
const outer = (L) => ({ ...L, prep: (ctx) => { let x = 0, z = 0; for (const p of ctx.pts) { x += p[0]; z += p[2]; } return ctx.n[0] * x + ctx.n[2] * z > 0 ? L.prep(ctx) : null; } });
/** Rounded rectangle section (half sizes w, d; corners rc) at height y, n evenly spaced points (x QUAL.k). */
function rrect(w, d, rc, y, n = 24) {
  n = Math.max(8, Math.round(n * QUAL.k));
  rc = Math.min(rc, w, d);
  const a = w - rc, b = d - rc, q = Math.PI * rc / 2, L = 4 * (a + b) + 4 * q, out = [];
  const parts = [[2 * a, (t) => [a - t, d]], [q, (t) => [-a - rc * Math.sin(t / rc), b + rc * Math.cos(t / rc)]], [2 * b, (t) => [-w, b - t]], [q, (t) => [-a - rc * Math.cos(t / rc), -b - rc * Math.sin(t / rc)]],
    [2 * a, (t) => [-a + t, -d]], [q, (t) => [a + rc * Math.sin(t / rc), -b - rc * Math.cos(t / rc)]], [2 * b, (t) => [w, -b + t]], [q, (t) => [a + rc * Math.cos(t / rc), b + rc * Math.sin(t / rc)]]];
  for (let i = 0; i < n; i++) {
    let s = (i / n) * L - a, p = null;
    if (s < 0) s += L;
    for (const [len, f] of parts) { if (s <= len + 1e-9) { p = f(s); break; } s -= len; }
    p = p || [a, d];
    out.push([p[0], y, p[1]]);
  }
  return out;
}
/** A cushion / pillow: a rounded slab w x d (half sizes), h thick, domed top and bottom. */
function pillow(S, c, w, d, h, rc, o = {}) {
  const st = o.st || [[0, 0.82], [0.12, 0.96], [0.3, 1], [0.7, 1], [0.88, 0.94], [0.97, 0.72], [1, 0.3]];
  S.loft(st.map(([t, k]) => rrect(w * k + (1 - k) * 0.6, d * k + (1 - k) * 0.6, rc * k, c[1] + t * h, o.n ?? 24).map((p) => [p[0] + c[0], p[1], p[2] + c[2]])));
}
/** The tatami a piece stands on: w x d half sizes, a heri border cloth down the long sides. */
function tatami(S, w, d) {
  const weave = repeatU(rbox(0, 0, 0.12, 200), 0.95);
  S.paint(
    fill(TAT, { rough: 0.9 }), proj('top', weave, tone(TAT, 0.1)), proj('top', or(rbox(0, d - 2.2, w + 1, 2.2), rbox(0, -d + 2.2, w + 1, 2.2)), HERI, { rough: 0.8 }),
    proj('top', or(repeatU(circle(0, d - 2.2, 0.45), 3.2, -w, w), repeatU(circle(0, -d + 2.2, 0.45), 3.2, -w, w)), 0xb8a46a), proj('front', all, HERI, { rough: 0.8 }), proj('back', all, HERI, { rough: 0.8 }),
    proj('right', repeatV(rbox(0, 0, 200, 0.18), 0.7), tone(TAT, 0.2)), proj('left', repeatV(rbox(0, 0, 200, 0.18), 0.7), tone(TAT, 0.2)), ...stamp(MAKER, { c: 0x7a7050 }),
  );
  S.box(-w, 0, -d, w, 3.2, d, { bevel: 0.6 });
  return 3.2;
}
/** Wood grain: a few hand-placed streaks along u (x), for a face w x h round (cx, cy). */
const grain = (cx, cy, w, h, k = 0) => or(seg(cx - w, cy + h * 0.5, cx + w, cy + h * 0.38, 0.3), seg(cx - w, cy - h * 0.2 + k, cx + w, cy - h * 0.1, 0.25), arc(cx + w * 0.3 - k, cy - h * 0.9, h * 0.8, 1.2, 2.2, 0.25), seg(cx - w, cy + h * 0.1, cx - w * 0.2, cy + h * 0.16, 0.2));

// ------------------------------------------------------------------ 1. Chabudai Teatime
export function chabudai(S) {
  const y0 = tatami(S, 30, 24);
  // the low round table: a thick top with a turned rim, folding legs and an apron
  S.paint(fill(KEYAKI, { rough: 0.55 }), proj('top', or(arc(3, -2, 9, 0.2, 1.9, 0.3), arc(3, -2, 12, 3.4, 5.1, 0.3), arc(-4, 3, 5, 0.6, 2.8, 0.25), arc(3, -2, 14.6, 0.9, 2.4, 0.25)), tone(KEYAKI, 0.14)), vol(band(y0 + 14, y0 + 14.8), tone(KEYAKI, 0.18)), under(0.25), crown(0.05));
  S.lathe([[17, y0 + 13.4], [17.6, y0 + 14.4], [17.6, y0 + 15.6], [17, y0 + 16.2], [0, y0 + 16.2]], { segs: 32 });
  S.paint(fill(tone(KEYAKI, 0.1), { rough: 0.6 }), under(0.25));
  S.lathe([[13.4, y0 + 11.6], [13.4, y0 + 13.6], [12.6, y0 + 13.6], [12.6, y0 + 11.6]], { segs: 28, cap: false });
  for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2; S.at([Math.cos(a) * 12, y0, Math.sin(a) * 12], [0, -a, 0], () => S.lathe(spline([[1.2, 0], [1, 5], [1.3, 13.4]], 2), { segs: 8 })); }
  const top = y0 + 16.2;
  // the dobin: a squat pot, a lid with a knob, a spout, the arched rattan handle (tip it to pour)
  S.joint('pot', { pivot: [-2, top, 4.4], axis: 'x', min: 0, max: 0.6, rest: 0, g: [0, 0.5] }, () => {
    const POT = 0x5a6a62;
    S.paint(fill(POT, { rough: 0.4 }), outer(wrap(6.4, or(arc(-2, 5.6, 3, 0.4, 2.6, 0.4), arc(3, 4, 2.4, 3.4, 5.6, 0.4), seg(-6, 2.4, 6, 2.4, 0.3)), tint(POT, 0.25))), under(0.2), crown(0.06));
    S.lathe(spline([[3.6, 0], [6.2, 1.4], [7, 4], [6, 7.2], [3.6, 8.2]], 3), { segs: 18, at: [-2, top, -4] });
    S.lathe([[3.8, 8], [3.6, 8.8], [2.4, 9.4], [0.9, 9.6], [1.1, 10.6], [0.6, 11.2], [0, 11.2]], { segs: 14, at: [-2, top, -4] });
    S.tube(spline([[-2, top + 3, 1.4], [-2, top + 4.6, 4.6], [-2, top + 7.6, 6.8]], 2), [1.6, 1.1, 0.8], { sides: 8 });
    S.paint(fill(0xc8a06a, { rough: 0.7 }), proj('front', repeatU(rbox(0, 0, 0.2, 40), 1.1), 0x8a6a3a), proj('right', repeatU(rbox(0, 0, 0.2, 40), 1.1), 0x8a6a3a));
    S.tube(spline([[-8, top + 7, -4], [-7, top + 13.6, -4], [-2, top + 16, -4], [3, top + 13.6, -4], [4, top + 7, -4]], 3), 0.65, { sides: 6 });
  });
  // two yunomi of green tea, and the senbei on a plate
  for (const [x, z] of [[10, 6], [-11, 8]]) {
    S.paint(fill(0xe8e0cc, { rough: 0.35 }), outer(vol(band(top + 1.4, top + 2.6), 0x7a5a3a)), outer(wrap(3.2, or(seg(-1.6, top + 4.4, -1.6, top + 6.6, 0.3), seg(1.4, top + 4, 1.6, top + 6.8, 0.3)), 0x3a5a7a)), under(0.2));
    S.lathe([[0, top], [2.4, top], [2.8, top + 0.6], [3.2, top + 8], [2.8, top + 8], [2.5, top + 1.4], [0, top + 1.4]], { segs: 14, at: [x, 0, z] });
    S.paint(fill(0x9aaa3a, { rough: 0.1 }));
    S.lathe([[2.9, top + 6.6], [0, top + 6.6]], { segs: 14, at: [x, 0, z] });
  }
  S.paint(fill(0xf2eee4, { rough: 0.3 }), proj('top', stroke(circle(9, 6.6, 5), 0.5, 0.6), 0x3a5a9a), under(0.2));
  S.at([9, top, -6.6], null, () => S.lathe([[0, 0], [3.6, 0], [5.6, 1.2], [5.2, 1.4], [0, 0.6]], { segs: 18 }));
  for (const [i, [x, z, a]] of [[7.8, -5.8, 0.1], [10.4, -7.4, -0.25]].entries()) {
    S.paint(fill(0xb87a3a, { rough: 0.5 }), proj('top', or(...[0, 1, 2, 3].map((k) => circle(x + Math.cos(k * 1.6 + i) * 1.8, -z + Math.sin(k * 1.6 + i) * 1.8, 0.35))), 0x8a5428), i ? proj('top', rbox(x, -z, 1.5, 2.6, 0.2), 0x25302a) : null, under(0.2));
    S.at([x, top + 1 + i * 0.7, z], [a, 0, a * 0.5], () => S.cyl([0, 0, 0], 3.3, 0.7, { segs: 16, bevel: 0.3 }));
  }
}

// ------------------------------------------------------------------ 2. Zabuton Nap
export function zabuton(S) {
  const y0 = tatami(S, 28, 24);
  const RED = 0xb8343a, GOLD = 0xe2b64a, HAM = 0x9a9aa4, BELLY = 0xf6f2ea;
  const hishi = or(...[-15, -7.5, 0, 7.5, 15].flatMap((k) => [seg(k - 20, -20, k + 20, 20, 0.35), seg(k - 20, 20, k + 20, -20, 0.35)]));
  S.paint(fill(RED, { rough: 0.85 }), proj('top', and(hishi, rbox(0, 0, 19, 19)), tint(RED, 0.25)), proj('top', or(...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => circle(a * 7.5, b * 7.5, 0.9))), GOLD), vol(band(y0 + 3.3, y0 + 3.7), tone(RED, 0.25)), under(0.2));
  pillow(S, [0, y0, 0], 21, 21, 7, 6);
  S.paint(fill(GOLD, { rough: 0.5 }), proj('front', repeatU(rbox(0, 0, 0.18, 9), 0.7), tone(GOLD, 0.2)));
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { S.ball([x * 19.6, y0 + 3.6, z * 19.6], 1.2, { segs: 8, rings: 5 }); S.cone([x * 21, y0 + 0.4, z * 21], 1.4, 3, { segs: 8 }); }
  // the hamster, flat out: a pancake of fur, paws forward, a seed or two
  const t = y0 + 6.4;
  S.paint(fill(HAM, { rough: 0.85 }), vol(blob([0, t - 1, 4], [7, 2.4, 9]), BELLY), proj('top', rbox(0, 2, 0.8, 9, 0.6), tone(HAM, 0.4)), under(0.12));
  loaf(S, [0, t + 2.2, -1], [8.4, 2.6, 9], { flat: 0.6 });
  S.paint(fill(BELLY, { rough: 0.85 }), vol(blob([0, t + 6, 6], [6, 2.6, 4]), HAM), ...face({ at: [0, t + 2.6], gap: 4.6, r: 0.9, eye: 'closed', mouth: 'w', mw: 1.6, my: 1.7, near: 10 }), under(0.12));
  head(S, [0, t + 2.4, 8.6], [5.4, 3.4, 4.2], { muzzle: 0.35, brow: 0.1, cheek: 0.3, chin: 0.2, pow: 2.1 });
  S.paint(fill(0xf2a4ac, { rough: 0.3 }));
  S.ball([0, t + 1.6, 12.6], [0.7, 0.5, 0.5], { segs: 6, rings: 4 });
  for (const s of [1, -1]) {
    S.paint(fill(HAM), proj('front', ellipse(0, 1.4, 0.9, 1.1), 0xe8a0a8));
    S.at([s * 3.4, t + 4.6, 7.4], [-0.3, 0, -s * 0.6], () => blade(S, 2.6, 2.8, 0.6, { shape: 'round', cup: 0.5 }));
    S.paint(fill(0xf2c4c4, { rough: 0.6 }));
    S.at([s * 4.4, t + 0.2, 12.4], [0.2, s * 0.3, 0], () => S.ball([0, 0, 0], [1.2, 0.6, 1.5], { segs: 8, rings: 4 }));
    S.at([s * 5, t, -9], [0, s * 0.4, 0], () => S.ball([0, 0, 0], [1.3, 0.6, 1.6], { segs: 8, rings: 4 }));
  }
  // the snot bubble, breathing in and out
  S.part('bubble', { rest: 0.4, move: (k) => swell([1.2, t + 1.6, 13], 0.45 + k * 0.95) }, () => {
    S.clear(true);
    S.paint(fill(0xd8eef6, { rough: 0.05 }));
    S.ball([3, t + 2.2, 14.6], 2.2, { segs: 12, rings: 7 });
    S.clear(false);
  });
  S.paint(fill(0x3a3436, { rough: 0.4 }), proj('top', repeatU(rbox(0, 0, 0.25, 4), 0.9), 0xd8d4c8));
  for (const [x, z, a] of [[12, 13, 0.4], [14.6, 10, -0.6], [-13, 14, 1.2]]) S.at([x, y0 + 6.6, z], [0.2, a, 0], () => S.ball([0, 0, 0], [1, 0.7, 2], { segs: 8, rings: 4 }));
}

// ------------------------------------------------------------------ 3. Tansu Chest
export function tansu(S) {
  const y0 = tatami(S, 26, 18);
  const W = 21, D = 11, H = 44, FRONT = D + 0.8;
  // the carcass: kiri wood, iron corner plates
  S.paint(fill(KIRI, { rough: 0.8 }), proj('right', grain(0, 20, 12, 6), tone(KIRI, 0.12)), proj('left', grain(0, 30, 12, 6, 1), tone(KIRI, 0.12)), proj('top', grain(0, 0, 20, 6), tone(KIRI, 0.12)),
    proj('front', or(rbox(-W, y0 + H, 3, 3), rbox(W, y0 + H, 3, 3), rbox(-W, y0 + 0.5, 3, 3), rbox(W, y0 + 0.5, 3, 3)), IRON, { rough: 0.5 }), proj('right', or(rbox(-D, y0 + H, 3, 3), rbox(D, y0 + H, 3, 3)), IRON, { rough: 0.5 }), under(0.2));
  S.box(-W, y0, -D, W, y0 + H, D, { bevel: 0.6 });
  S.paint(fill(tone(KIRI, 0.35), { rough: 0.8 }));
  S.box(-W + 1, y0 + 2, D - 0.2, W - 1, y0 + H - 1, D + 0.1);
  // the drawers: two small over three long; the third is pulled out (laundry in it, a sock escaping)
  const handle = (x, y, z) => {
    S.paint(fill(IRON, { rough: 0.45 }), crown(0.15));
    S.at([x, y, z], null, () => { S.box(-3.6, -1.2, 0, -2.2, 1.2, 0.5, { bevel: 0.2 }); S.box(2.2, -1.2, 0, 3.6, 1.2, 0.5, { bevel: 0.2 }); S.tube(spline([[-2.9, 0.4, 0.5], [-2.4, -1.8, 1.4], [0, -2.4, 1.6], [2.4, -1.8, 1.4], [2.9, 0.4, 0.5]], 2), 0.42, { sides: 6 }); });
  };
  const drawer = (x0, x1, y1, y2) => {
    S.paint(fill(KIRI, { rough: 0.75 }), proj('front', grain((x0 + x1) / 2, (y1 + y2) / 2, (x1 - x0) / 2, (y2 - y1) / 2), tone(KIRI, 0.1)), proj('front', stroke(rbox((x0 + x1) / 2, (y1 + y2) / 2, (x1 - x0) / 2 - 0.3, (y2 - y1) / 2 - 0.3, 0.3), 0.3), tint(KIRI, 0.2)));
    S.box(x0, y1, D - 1, x1, y2, FRONT, { bevel: 0.35 });
    handle((x0 + x1) / 2, (y1 + y2) / 2 + 0.8, FRONT);
  };
  drawer(-W + 1, -0.5, y0 + 35.6, y0 + 43); drawer(0.5, W - 1, y0 + 35.6, y0 + 43);
  drawer(-W + 1, W - 1, y0 + 26.4, y0 + 35); drawer(-W + 1, W - 1, y0 + 2, y0 + 10.6);
  S.rest = 0.62;
  S.joint('drawer', { slide: [0, 0, 13], min: 0, max: 1, rest: 0, g: [0, 1] }, () => {
    drawer(-W + 1, W - 1, y0 + 11.2, y0 + 25.8);
    S.paint(fill(tint(KIRI, 0.1), { rough: 0.85 }), under(0.2));
    S.box(-W + 1.4, y0 + 11.6, -D + 1, W - 1.4, y0 + 12.4, D - 1);
    S.box(-W + 1.4, y0 + 12.4, -D + 1, -W + 2.2, y0 + 24, D - 1); S.box(W - 2.2, y0 + 12.4, -D + 1, W - 1.4, y0 + 24, D - 1); S.box(-W + 2.2, y0 + 12.4, -D + 1, W - 2.2, y0 + 24, -D + 1.8);
    for (const [x, c, h] of [[-12, 0x6a8ac8, 5], [-3, 0xf2ece0, 6.4], [6, 0xd8705a, 5.6], [14, 0x8ab88a, 4.4]]) {
      S.paint(fill(c, { rough: 0.9 }), proj('front', seg(-3, 0, 3, 0, 0.3), tone(c, 0.2)), under(0.15));
      S.box(x - 4, y0 + 12.4, -D + 2.6, x + 4, y0 + 12.4 + h, D - 2.6, { bevel: 1.2 });
    }
    S.paint(fill(0xf2f0ea, { rough: 0.9 }), vol(above(y0 + 18), 0xd84a4a), vol(band(y0 + 15, y0 + 16), 0xd84a4a));
    S.tube(spline([[8, y0 + 18.4, 4], [9.6, y0 + 25, 10], [10.6, y0 + 22, 14], [10.6, y0 + 12, 15.4]], 3), 1.3, { sides: 8 });
  });
  // on top: a one-eyed daruma and a jade plant
  const top = y0 + H;
  S.paint(fill(0xc8302c, { rough: 0.35 }), proj('front', ellipse(-11, top + 5.2, 3.4, 2.8), 0xf6efe0),
    proj('front', or(circle(-12.5, top + 5.6, 0.85), stroke(circle(-9.5, top + 5.6, 0.9), 0.3), or(arc(-12, top + 3.8, 1, 3.6, 5.4, 0.35), arc(-10, top + 3.8, 1, 4, 5.8, 0.35))), EYE), proj('front', or(arc(-13.2, top + 7.2, 1.4, 0.3, 1.6, 0.4), arc(-8.8, top + 7.2, 1.4, 1.5, 2.8, 0.4)), EYE), proj('front', kana('福', -11, top + 1.6, 2.4), 0xe2b64a), under(0.2));
  S.lathe(spline([[3.4, 0], [4.6, 1.6], [4.4, 4.6], [3.4, 7], [2, 8.2], [0, 8.6]], 2).map(([r, y]) => [r, y + top]), { segs: 16, at: [-11, 0, 2] });
  S.paint(fill(0xb8683a, { rough: 0.7 }), vol(above(top + 4.4), tone(0xb8683a, 0.15)), under(0.2));
  S.lathe([[2.4, top], [3.6, top + 4.4], [3.8, top + 5], [3.4, top + 5], [0, top + 4.4]], { segs: 14, at: [11, 0, 0] });
  S.paint(fill(0x6a7a4a, { rough: 0.7 }));
  S.tube(spline([[11, top + 4, 0], [11.4, top + 7, 0.4], [10.6, top + 10, 0]], 2), 0.6, { sides: 6 });
  S.paint(fill(0x5a9a52, { rough: 0.4 }), proj('front', ellipse(0, 1, 0.6, 0.9), 0xa8c86a), crown(0.12));
  for (let k = 0; k < 9; k++) { const a = k * GA, h = 6 + k * 0.6; S.at([11 + Math.cos(a) * 2.4, top + h, Math.sin(a) * 2.4], [0.5 * Math.sin(a), a, 0.9 * Math.cos(a)], () => S.ball([0, 1.2, 0], [1.1, 1.6, 0.7], { segs: 8, rings: 5 })); }
}

// ------------------------------------------------------------------ 4. Futon & Alarm Clock
export function futon(S) {
  const y0 = tatami(S, 34, 24);
  // the shikibuton folded in three, the kakebuton on top (sakura print), the soba-husk pillow
  const CREAM = 0xf4eedc, PINK = 0xf2b4bc, SAKURA = 0xf8e0e4;
  const flower = (cx, cy) => or(...[0, 1, 2, 3, 4].map((k) => circle(cx + Math.cos(k * 1.257 + 0.3) * 1.3, cy + Math.sin(k * 1.257 + 0.3) * 1.3, 0.95)));
  const fl = [[-20, 8], [-10, -4], [2, 10], [12, -8], [20, 4], [-24, -10], [6, -1]];
  for (let k = 0; k < 3; k++) {
    S.paint(fill(CREAM, { rough: 0.9 }), proj('front', seg(-30, 0, 30, 0, 0.3), tone(CREAM, 0.14)), under(0.15));
    pillow(S, [-4, y0 + k * 3.6, 0], 25 - k * 0.3, 19, 3.8, 3, { st: [[0, 0.95], [0.2, 1], [0.8, 1], [1, 0.94]] });
  }
  S.paint(fill(PINK, { rough: 0.9 }), proj('top', or(...fl.map(([x, z]) => flower(x - 4, z))), SAKURA), proj('top', or(...fl.map(([x, z]) => circle(x - 4, z, 0.5))), 0xd8506a),
    proj('front', or(...[[-20, 19], [-4, 18], [12, 19.5]].map(([x, y]) => flower(x, y))), SAKURA), vol(band(y0 + 15, y0 + 15.5), tone(PINK, 0.18)), under(0.18));
  pillow(S, [-5, y0 + 10.8, 0], 24, 18, 8.6, 5);
  S.paint(fill(0xf6f4ee, { rough: 0.85 }), proj('top', repeatV(rbox(0, 0, 30, 0.7), 2.6), 0x4a6aa8), proj('front', repeatV(rbox(0, 0, 30, 0.7), 2.6), 0x4a6aa8), under(0.15));
  pillow(S, [-6, y0 + 19.4, -6], 12, 6, 6, 4.4);
  // the twin-bell alarm clock, 7:00 (ring it)
  S.joint('clock', { pivot: [22, y0, 8], axis: 'z', min: -0.25, max: 0.25, rest: 0, g: [0, 0.2], idle: 0.03 }, () => {
    const CL = 0x3a6ac8;
    S.at([24, y0 + 9.4, 8], [0, -0.3, 0], () => {
      const dial = or(...Array.from({ length: 12 }, (_, k) => circle(Math.sin(k * Math.PI / 6) * 4.4, Math.cos(k * Math.PI / 6) * 4.4, k % 3 ? 0.3 : 0.55)));
      S.paint(fill(0xf8f6ee, { rough: 0.3 }), proj('front', dial, EYE), proj('front', or(seg(0, 0, 0, 3.8, 0.45), seg(0, 0, -1.4, -2.4, 0.55)), EYE), proj('front', seg(0, 0, 2.4, -3.2, 0.2), 0xd8302a), proj('front', label('SUN', 0, -1.8, 0.22), 0x8a8a8a, { hard: true }));
      S.extrude(Array.from({ length: 36 }, (_, k) => [Math.cos(k * Math.PI / 18) * 5.5, Math.sin(k * Math.PI / 18) * 5.5]), -0.6, 0.2);
      S.paint(fill(CL, { rough: 0.35 }));
      S.at([0, 0, -1.6], [Math.PI / 2, 0, 0], () => S.lathe([[0, -1.6], [6, -1.6], [6.6, -0.6], [6.6, 1.8], [6, 2.4], [5.4, 2.4], [5.4, 1.4], [0, 1.4]], { segs: 22 }));
      S.paint(fill(0xd8dce2, { rough: 0.2 }), crown(0.2));
      for (const s of [-1, 1]) {
        S.at([s * 4.2, 6.4, -1.6], [0, 0, s * 0.5], () => S.lathe(spline([[0, 0], [3, 0.2], [3.4, 1.6], [2.4, 3.2], [0, 3.6]], 2), { segs: 14 }));
        S.tube([[s * 3.6, -5.6, -1.6], [s * 5.4, -8.8, -1.2]], [0.7, 0.5], { sides: 6 });
      }
      S.tube([[0, 6.6, -1.6], [0, 9.6, -1.6]], 0.35, { sides: 5 });
      S.ball([0, 9.8, -1.6], [1.6, 0.9, 0.9], { segs: 8, rings: 4 });
      S.tube(spline([[-3.4, 7.4, -3.4], [0, 11.6, -3.4], [3.4, 7.4, -3.4]], 3), 0.45, { sides: 5 });
    });
  });
  // a little shiba plush keeping watch
  S.at([-28, y0 + 0.2, 13], [0, 0.6, 0], () => {
    const SH = 0xe0a058, CR = 0xf6ecd6;
    S.paint(fill(SH, { rough: 0.9 }), vol(blob([0, 3.6, 3.6], [3, 3.4, 2]), CR), under(0.15));
    torso(S, [0, 4.4, 0], [4.2, 4.4, 3.8], { belly: 0.2, sit: 0.4 });
    S.paint(fill(SH, { rough: 0.9 }), vol(blob([0, -1.6, 3.6], [3.4, 2.2, 2.8]), CR), ...face({ at: [0, 0.4], gap: 3.6, r: 0.6, eye: 'bead', mouth: null }), under(0.15));
    S.at([0, 11, 0.4], null, () => {
      head(S, [0, 0, 0], [4.4, 3.8, 3.8], { muzzle: 0.3, brow: 0.2, cheek: 0.2, chin: 0.2 });
      S.paint(fill(EYE, { rough: 0.3 }));
      S.ball([0, -0.8, 4], [0.7, 0.5, 0.4], { segs: 6, rings: 4 });
      S.paint(fill(SH, { rough: 0.9 }), proj('front', ellipse(0, 1.6, 0.8, 1.2), CR));
      for (const s of [1, -1]) S.at([s * 2.6, 2.6, -0.4], [0, 0, -s * 0.35], () => blade(S, 3.2, 3, 0.9, { shape: 'ear', cup: 0.4 }));
    });
  });
}

// ------------------------------------------------------------------ 5. Manga Bookshelf
export function hondana(S) {
  const y0 = tatami(S, 28, 14);
  const WOOD = 0x8a5a36, W = 23, D = 9, H = 56, sh = [y0 + 1.6, y0 + 19.2, y0 + 36.8];
  // the shelf: sides, top, a back board, two shelves
  S.paint(fill(WOOD, { rough: 0.6 }), proj('right', grain(0, 30, 9, 8), tone(WOOD, 0.14)), proj('left', grain(0, 26, 9, 8, 1), tone(WOOD, 0.14)), under(0.2), crown(0.05));
  S.box(-W, y0, -D, -W + 1.6, y0 + H, D, { bevel: 0.3 }); S.box(W - 1.6, y0, -D, W, y0 + H, D, { bevel: 0.3 });
  S.box(-W - 0.6, y0 + H - 1.6, -D - 0.4, W + 0.6, y0 + H, D + 0.6, { bevel: 0.4 });
  for (const y of sh) S.box(-W + 1.6, y - 1.6, -D, W - 1.6, y, D - 0.2, { bevel: 0.2 });
  S.paint(fill(tone(WOOD, 0.12), { rough: 0.7 }), proj('front', or(seg(-8, y0, -8, y0 + H, 0.3), seg(8, y0, 8, y0 + H, 0.3)), tone(WOOD, 0.3)));
  S.box(-W + 1.6, y0 + 1.6, -D, W - 1.6, y0 + H - 1.6, -D + 0.8);
  // the books: one series in matching spines, numbered, number seven missing; odd ones besides
  const SER = [0xd8402e, 0x3a6ac8, 0xf2c23a, 0x4a9a5a];
  const book = (x, y, w, h, c, n, lean = 0, d = 12) => {
    S.paint(fill(c, { rough: 0.55 }), proj('front', rbox(0, h * 0.62, w / 2 - 0.25, h * 0.18, 0.1), 0xf6f0e0), proj('front', rbox(0, h * 0.12, w / 2, 0.35), tone(c, 0.3)), n ? proj('front', label(String(n), 0, h * 0.3, 0.32), 0xf6f0e0, { hard: true }) : null, proj('top', rbox(0, 0, w / 2 - 0.3, d / 2 - 0.3), 0xf2ead6), under(0.2));
    S.at([x, y, D - 0.4 - d / 2], [0, 0, lean], () => S.box(-w / 2, 0, -d / 2, w / 2, h, d / 2, { bevel: 0.25 }));
  };
  let x = -W + 1.8, n = 1;
  for (let k = 0; k < 13; k++) { if (n === 7) { x += 2.6; n++; } book(x + 1.25, sh[0], 2.5, 13.6, SER[0], n++); x += 2.6; }
  book(x + 3.6, sh[0], 2.6, 13.6, SER[0], 14, -0.42);
  x = -W + 1.8;
  for (let k = 0; k < 10; k++) { book(x + 1.4, sh[1], 2.8, 14.6 - (k % 3) * 0.4, k < 6 ? SER[1] : SER[2], k < 6 ? k + 1 : k - 5); x += 2.9; }
  S.part('vol', { slide: [0, 0, 7], min: 0, max: 1, rest: 0, g: [0, 1] }, () => { book(x + 1.4, sh[1], 2.8, 14.2, SER[3], 1); });
  x += 3;
  for (let k = 0; k < 4; k++) { book(x + 1.4, sh[1], 2.8, 14.2, SER[3], k + 2); x += 2.9; }
  // top shelf: a stack lying flat and a kokeshi on it, a few more standing
  for (let k = 0; k < 4; k++) {
    const c = [0x8a6ac8, 0xe8806a, 0x5aa8a8, 0xf2d04a][k];
    S.paint(fill(c, { rough: 0.55 }), proj('front', rbox(0, sh[2] + k * 2.4 + 1.2, 6, 0.3), 0xf6f0e0), proj('right', rbox(0, sh[2] + k * 2.4 + 1.2, 5, 0.6), 0xf2ead6), under(0.2));
    S.box(-20 + k * 0.4, sh[2] + k * 2.4, -4, -6 - k * 0.3, sh[2] + k * 2.4 + 2.4, 7.6, { bevel: 0.2 });
  }
  S.paint(fill(0xf2e0b8, { rough: 0.5 }), vol(above(sh[2] + 16), EYE), vol(band(sh[2] + 9.6, sh[2] + 12.8), 0xd8402e), outer(wrap(2, or(circle(-1.6, sh[2] + 11.2, 0.6), circle(1.4, sh[2] + 10.6, 0.5)), 0xf2d04a)),
    ...face({ at: [-13, sh[2] + 16.6], gap: 2, r: 0.45, eye: 'closed', mouth: null, near: 0 }), under(0.15));
  S.lathe(spline([[2.4, 0], [2.6, 3], [2, 6], [2.2, 6.8]], 2).map(([r, y]) => [r, y + sh[2] + 9.6]), { segs: 14, at: [-13, 0, 2] });
  S.ball([-13, sh[2] + 18.2, 2], [2.7, 2.6, 2.6], { segs: 14, rings: 8 });
  for (let k = 0; k < 6; k++) book(-2 + k * 2.7 + 1.35, sh[2], 2.6, 13.4 - (k % 2), [0x5a5a6a, 0xe8b04a, 0x6aa8d8, 0xd85a7a, 0x7a9a4a, 0xf2ead6][k], 0, k === 5 ? -0.25 : 0);
  // on top: a gacha capsule, a cactus in its pot
  const top = y0 + H;
  S.paint(fill(0xf6f2ea, { rough: 0.3 }), vol(above(top + 4.4), 0x6ac8e8), under(0.15));
  S.ball([-14, top + 4.4, 0], 4.4, { segs: 14, rings: 8 });
  S.paint(fill(0xc87a4a, { rough: 0.8 }), under(0.2));
  S.lathe([[2.6, top], [3.4, top + 4.6], [3.8, top + 5.2], [3.2, top + 5.2], [0, top + 4.8]], { segs: 14, at: [12, 0, 1] });
  S.paint(fill(0x5a9a5a, { rough: 0.5 }), proj('front', or(seg(-1, 0, -1, 30, 0.2), seg(1, 0, 1, 30, 0.2)), tone(0x5a9a5a, 0.25)), crown(0.15));
  S.lathe(spline([[2.2, 4.6], [2.6, 7], [2.2, 10], [0, 11.6]], 2).map(([r, y]) => [r, y + top]), { segs: 12, at: [12, 0, 1] });
  S.paint(fill(0xf28aa8, { rough: 0.5 }));
  S.ball([12, top + 11.8, 1], [1.3, 0.8, 1.3], { segs: 8, rings: 4 });
}

// ------------------------------------------------------------------ 6. Late-Night Study Desk
export function tsukue(S) {
  const y0 = tatami(S, 30, 20);
  const WOOD = 0xc89a64, TOP = y0 + 30, SIDE = 0xa87a48;
  // the desk: a top, a drawer pedestal, a side panel, the hutch with its shelf
  S.paint(fill(WOOD, { rough: 0.55 }), proj('top', grain(0, 0, 26, 9), tone(WOOD, 0.12)), proj('front', rbox(0, TOP - 1, 26, 0.2), tone(WOOD, 0.3)), under(0.25));
  S.box(-26, TOP - 2, -13, 26, TOP, 13, { bevel: 0.5 });
  S.paint(fill(SIDE, { rough: 0.6 }), proj('front', or(stroke(rbox(16, TOP - 7, 8, 3.6, 0.4), 0.35), stroke(rbox(16, TOP - 16, 8, 4.6, 0.4), 0.35), stroke(rbox(16, TOP - 25, 8, 3.6, 0.4), 0.35)), tone(SIDE, 0.3)),
    proj('front', or(rbox(16, TOP - 6.4, 2.6, 0.6, 0.3), rbox(16, TOP - 15.2, 2.6, 0.6, 0.3), rbox(16, TOP - 24.4, 2.6, 0.6, 0.3)), 0xd8dce2, { rough: 0.25 }), under(0.2));
  S.box(7, y0, -12, 25, TOP - 2, 12.4, { bevel: 0.4 });
  S.box(-25, y0, -12, -23, TOP - 2, 12, { bevel: 0.3 });
  S.box(-23, y0 + 3, -12, 7, y0 + 5, -10);
  S.paint(fill(WOOD, { rough: 0.55 }), proj('front', grain(0, TOP + 12, 22, 6), tone(WOOD, 0.1)), under(0.2));
  S.box(-26, TOP, -13, 26, TOP + 22, -11, { bevel: 0.3 });
  S.box(-26, TOP, -13, -24, TOP + 22, -4, { bevel: 0.3 }); S.box(24, TOP, -13, 26, TOP + 22, -4, { bevel: 0.3 });
  S.box(-26, TOP + 22, -13.4, 26, TOP + 23.6, -3.6, { bevel: 0.4 }); S.box(-24, TOP + 12, -11, 24, TOP + 13.2, -4.4);
  // on the hutch: books, a globe; a calendar and a cat photo on its back
  for (let k = 0; k < 8; k++) {
    const c = [0x3a6ac8, 0xd8402e, 0xf2c23a, 0x4a9a5a, 0xe8e0cc, 0x8a6ac8, 0xd86a8a, 0x5a5a6a][k];
    S.paint(fill(c, { rough: 0.55 }), proj('front', rbox(0, TOP + 19, 0.8, 1.6), 0xf6f0e0), under(0.2));
    S.box(-22 + k * 2.6, TOP + 13.2, -10.6, -19.8 + k * 2.6, TOP + 21 - (k % 3) * 0.8, -5, { bevel: 0.2 });
  }
  S.paint(fill(0xf6f2e6, { rough: 0.8 }), proj('front', label('4', 6, TOP + 9.4, 0.4), 0xd8402e, { hard: true }), proj('front', and(repeatU(rbox(0, 0, 0.1, 30), 1.4, 3, 9.6), rbox(6.3, TOP + 4.8, 3.6, 3)), 0x9a9a9a), proj('front', circle(7.4, TOP + 5.4, 0.7), 0xd8402e));
  S.box(2.4, TOP + 1.6, -11, 10, TOP + 11, -10.6);
  S.paint(fill(0xf2d0a0, { rough: 0.4 }), proj('front', ellipse(16, TOP + 6.6, 2.2, 1.8), 0x8a8a8a), proj('front', or(poly([[14.4, TOP + 7.8], [14.8, TOP + 9.4], [15.6, TOP + 8.2]]), poly([[17.6, TOP + 7.8], [17.2, TOP + 9.4], [16.4, TOP + 8.2]])), 0x8a8a8a), under(0.2));
  S.box(13, TOP + 3.4, -11, 19, TOP + 10, -10.6);
  S.paint(fill(0x3a8ac8, { rough: 0.35 }), proj('front', or(ellipse(-1, TOP + 30.6, 1.6, 2.2, 0.3), ellipse(1.6, TOP + 29, 1.2, 1, -0.4)), 0x6aaa5a), crown(0.12));
  S.ball([18, TOP + 30, -8], 3.6, { segs: 14, rings: 8 });
  S.paint(fill(0xc8a04a, { rough: 0.3 }));
  S.torus([18, TOP + 30, -8], 4.2, 0.35, { segs: 16, sides: 4 });
  S.cyl([18, TOP + 23.6, -8], [1.8, 1], 2.2, { segs: 10 });
  // homework: an open notebook (mostly cat doodles), a pencil, the pencil cup
  const lines = repeatV(rbox(0, 0, 9, 0.08), 1.2, -6, 6);
  S.paint(fill(0xf8f6ee, { rough: 0.85 }), proj('top', lines, 0x9ab4d8), proj('top', or(stroke(circle(-11, 1, 2), 0.3), poly([[-12.8, 2.4], [-12.4, 4], [-11.4, 2.8]]), poly([[-9.2, 2.4], [-9.6, 4], [-10.6, 2.8]]), arc(-11, 0.4, 0.8, 3.6, 5.8, 0.25), stroke(circle(-4.6, -2.6, 1.6), 0.28), poly([[-6, -1.6], [-5.8, -0.2], [-5, -1.2]]), poly([[-3.2, -1.6], [-3.4, -0.2], [-4.2, -1.2]])), 0x4a4a5a), proj('top', rbox(-8, 0, 0.2, 6.6), 0xd8d0c0), under(0.15));
  S.at([-8, TOP, 4], [0, 0.12, 0], () => { S.at([-0.1, 0, 0], [0, 0, 0.06], () => S.box(-9, 0, -6.6, 0, 0.8, 6.6)); S.at([0.1, 0, 0], [0, 0, -0.06], () => S.box(0, 0, -6.6, 9, 0.8, 6.6)); });
  S.at([0, TOP + 0.8, 8], [0, 0.3, 0], () => {
    S.paint(fill(0xf2c23a, { rough: 0.5 })); S.tube([[-3, 0.6, 0], [4.4, 0.6, 0]], 0.55, { sides: 6 });
    S.paint(fill(0xe9cf9c, { rough: 0.8 })); S.tube([[4.4, 0.6, 0], [6.6, 0.6, 0]], [0.55, 0.2], { sides: 6, caps: false });
    S.paint(fill(EYE)); S.tube([[6.6, 0.6, 0], [7.2, 0.6, 0]], [0.2, 0], { sides: 6 });
  });
  S.paint(fill(0x5aa8a8, { rough: 0.4 }), outer(wrap(2.4, star(0, TOP + 3, 1.6), 0xf6f0e0)), under(0.2));
  S.lathe([[2.2, TOP], [2.4, TOP + 6], [2, TOP + 6], [1.8, TOP + 1]], { segs: 14, at: [-19, 0, 6] });
  for (const [c, a] of [[0xd8402e, 0.2], [0x3a6ac8, -0.25], [0xf2c23a, 0.05]]) { S.paint(fill(c, { rough: 0.5 })); S.tube([[-19, TOP + 1, 6], [-19 + Math.sin(a) * 8, TOP + 10, 6 + Math.cos(a + 1) * 2]], 0.5, { sides: 6 }); }
  // the desk lamp, doing its very best (tilt it)
  S.paint(fill(0xf6f2ea, { rough: 0.35 }), under(0.2));
  S.cyl([-18, TOP, -6], [3.4, 2.8], 1.4, { segs: 16 });
  S.tube([[-18, TOP + 1.4, -6], [-18, TOP + 14, -6]], 0.6, { sides: 6 });
  S.joint('lamp', { pivot: [-18, TOP + 14, -6], axis: 'x', min: -0.5, max: 0.6, rest: 0, g: [0, 0.45] }, () => {
    S.paint(fill(0xf6f2ea, { rough: 0.35 }));
    S.tube([[-18, TOP + 14, -6], [-18, TOP + 20, 2]], 0.55, { sides: 6 });
    S.paint(fill(0xf6f2ea, { rough: 0.35 }), vol(below(TOP + 16), 0xfff6c8, { rough: 0.2 }), crown(0.1));
    S.at([-18, TOP + 19, 4], [0.55, 0, 0], () => S.lathe([[0.6, 3], [2.2, 2.4], [4, 0], [3.6, 0], [2, 2], [0.6, 2.4]], { segs: 16 }));
  });
  // the randoseru on its hook
  S.at([26, TOP - 12, 2], [0, Math.PI / 2, 0], () => {
    const RED = 0xc8282c;
    S.paint(fill(RED, { rough: 0.35 }), proj('front', stroke(rbox(0, 4, 5.2, 4.6, 2.4), 0.3, 0.6), tint(RED, 0.25)), proj('front', rbox(0, 1.4, 1, 1.2, 0.3), 0xd8c070, { rough: 0.25 }), under(0.2), crown(0.1));
    S.box(-6, -2, 0.8, 6, 9.6, 4.8, { bevel: 1.6 });
    S.box(-6.2, 0.6, 4.4, 6.2, 10, 5.6, { bevel: 0.8 });
    S.paint(fill(tone(RED, 0.2), { rough: 0.4 }));
    S.tube(spline([[-3, 9.6, 0.8], [-2, 12.6, 0.4], [2, 12.6, 0.4], [3, 9.6, 0.8]], 2), 0.4, { sides: 5 });
  });
}

// ------------------------------------------------------------------ 7. Hinoki Ofuro
export function ofuro(S) {
  const TILE = 0xe8eef0, GROUT = 0xb8c2c8, HINOKI = 0xecd2a4, BLUE = 0x6aa8c8;
  const tiles = (p) => or(repeatU(rbox(0, 0, 0.18, 200), p), repeatV(rbox(0, 0, 200, 0.18), p));
  // the floor and the back wall: small white tiles, a band of blue ones, a frosted window
  S.paint(fill(TILE, { rough: 0.35 }), proj('top', tiles(3.2), GROUT), proj('front', repeatU(rbox(0, 0, 0.18, 200), 3.2), GROUT), ...stamp(MAKER, { c: 0x7a8088 }), under(0.2));
  S.box(-32, 0, -22, 32, 3, 22, { bevel: 0.5 });
  S.paint(fill(TILE, { rough: 0.35 }), proj('front', tiles(3.2), GROUT), proj('front', rbox(0, 22, 40, 1.6), BLUE), under(0.2));
  S.box(-32, 3, -22, 32, 58, -19, { bevel: 0.4 });
  S.paint(fill(0x8a6a4a, { rough: 0.6 }));
  S.box(2, 30, -19.2, 26, 52, -18.2, { bevel: 0.3 });
  S.clear(true);
  S.paint(fill(0xd8e8ee, { rough: 0.5 }), proj('front', or(seg(2, 41, 26, 41, 0.6), seg(14, 30, 14, 52, 0.6)), 0x8a6a4a));
  S.box(3.2, 31.2, -18.4, 24.8, 50.8, -17.8);
  S.clear(false);
  // the tub: a square of hinoki boards, corner joints showing
  const T = 3, X0 = -28, X1 = 6, Z0 = -17, Z1 = 12, Hh = 25;
  const boards = or(...[6, 12, 18].map((y) => seg(-40, y, 40, y, 0.25)));
  S.paint(fill(HINOKI, { rough: 0.75 }), proj('front', boards, tone(HINOKI, 0.15)), proj('right', boards, tone(HINOKI, 0.15)), proj('front', or(seg(-14, 4, -10, 24, 0.25), arc(-20, 8, 5, 0.3, 1.8, 0.25)), tone(HINOKI, 0.1)), proj('top', all, tint(HINOKI, 0.1)), under(0.2));
  S.box(X0, 3, Z0, X1, 4.6, Z1);
  S.box(X0, 3, Z1 - T, X1, Hh, Z1, { bevel: 0.4 }); S.box(X0, 3, Z0, X1, Hh, Z0 + T, { bevel: 0.4 });
  S.box(X0, 3, Z0 + T, X0 + T, Hh, Z1 - T, { bevel: 0.4 }); S.box(X1 - T, 3, Z0 + T, X1, Hh, Z1 - T, { bevel: 0.4 });
  S.clear(true);
  S.paint(fill(0x9ad8d8, { rough: 0.05 }));
  S.box(X0 + T, 4.6, Z0 + T, X1 - T, Hh - 3, Z1 - T);
  S.clear(false);
  // the roll-up lid, rolled on the back rim; a towel over the front
  S.paint(fill(HINOKI, { rough: 0.75 }), proj('right', or(stroke(circle(0, Hh + 4.4, 3.4), 0.3), stroke(circle(0, Hh + 4.4, 2), 0.3)), tone(HINOKI, 0.25)), proj('left', stroke(circle(0, Hh + 4.4, 3.4), 0.3), tone(HINOKI, 0.25)), proj('front', repeatU(rbox(0, 0, 0.2, 100), 2.4), tone(HINOKI, 0.18)));
  S.at([(X0 + X1) / 2, Hh + 4.4, Z0 + 2], [0, 0, Math.PI / 2], () => S.cyl([0, -16, 0], 4.4, 32, { segs: 16 }));
  S.paint(fill(0xf2f0ea, { rough: 0.9 }), proj('front', or(rbox(0, Hh - 6, 20, 0.6), rbox(0, Hh - 7.6, 20, 0.3)), 0x6a9ac8), under(0.15));
  S.at([-10, Hh + 0.4, Z1 - 1.5], null, () => drape(S, -6, -3.4, 6, 3.4, 0, { nx: 6, nz: 6, th: 0.8, fold: (u, v) => (v > 0.5 ? -Math.max(0, v - 0.55) * 26 : 0) + 0.6 * Math.sin(u * Math.PI * 2) * (v > 0.6 ? 1 : 0) }));
  // the duck, holding the best corner (it bobs)
  S.joint('duck', { slide: [0, 1.6, 0], min: -1, max: 1, rest: 0, g: [0, 1], idle: 0.6 }, () => {
    S.paint(fill(0xf8d030, { rough: 0.3 }), under(0.15), crown(0.08));
    S.at([-6, Hh - 3, -10], [0, 0.6, 0], () => {
      loaf(S, [0, 1.4, 0], [3.6, 2.8, 4.6], { flat: 0.6 });
      S.paint(fill(0xf8d030, { rough: 0.3 }), ...face({ at: [0, 6.6], gap: 3.2, r: 0.55, eye: 'bead', mouth: null }));
      S.ball([0, 6, 2.6], [2.6, 2.4, 2.4], { segs: 12, rings: 7 });
      S.paint(fill(0xf28a2a, { rough: 0.3 }));
      S.ball([0, 5.2, 5], [1.3, 0.5, 1.4], { segs: 8, rings: 4 });
    });
  });
  // the wash corner: a stool, a wooden pail, the taps on the wall
  S.paint(fill(HINOKI, { rough: 0.75 }), proj('top', or(seg(-5, -1.4, 5, -1.4, 0.25), seg(-5, 1.4, 5, 1.4, 0.25)), tone(HINOKI, 0.15)), under(0.2));
  S.box(14, 9, -2, 26, 10.6, 6, { bevel: 0.5 }); S.box(15, 3, -1, 16.6, 9, 5); S.box(23.4, 3, -1, 25, 9, 5);
  S.paint(fill(HINOKI, { rough: 0.75 }), outer(wrap(4.6, repeatU(rbox(0, 0, 0.2, 40), 2.2), tone(HINOKI, 0.18))), outer(vol(band(5, 6), 0x9a8a6a)), outer(vol(band(10.4, 11.4), 0x9a8a6a)), under(0.2));
  S.lathe([[0, 3], [4.2, 3], [4.6, 3.6], [5, 13.4], [4.4, 13.4], [4, 4.4], [0, 4.4]], { segs: 18, at: [21, 0, 14] });
  S.paint(fill(0xd8dce2, { rough: 0.15 }), crown(0.2));
  for (const x of [14, 22]) { S.tube([[x, 22, -19], [x, 22, -15.6], [x, 20.6, -14.6]], 0.7, { sides: 8 }); S.cyl([x, 23, -16], 1.4, 1.4, { segs: 10 }); }
  S.paint(fill(0xd8302a, { rough: 0.4 })); S.cyl([14, 24.4, -16], 0.8, 0.6, { segs: 8 });
  S.paint(fill(0x3a6ac8, { rough: 0.4 })); S.cyl([22, 24.4, -16], 0.8, 0.6, { segs: 8 });
}

// ------------------------------------------------------------------ 8. The Cat Did It (secret)
export function nekosawagi(S) {
  const y0 = tatami(S, 32, 24);
  const PAPER = 0xf6f2e6, FRAME = 0xb8905a, CAT = 0x3a3436, WHITE = 0xf6f2ea;
  // the shoji: a frame, the lattice, paper with a cat-shaped hole punched clean through
  const lat = or(...[-15, -7.5, 0, 7.5, 15].map((x) => rbox(x, 0, 0.5, 100)), ...[8, 16, 24, 32, 40].map((y) => rbox(0, y0 + y, 100, 0.5)));
  const hole = or(ellipse(-4, y0 + 15.4, 4.6, 4.2), circle(-4, y0 + 21.6, 3.4), poly([[-7, y0 + 23.4], [-6.6, y0 + 27.4], [-4.6, y0 + 24]]), poly([[-1, y0 + 23.4], [-1.4, y0 + 27.4], [-3.4, y0 + 24]]), seg(0, y0 + 13, 4, y0 + 18, 1.2), circle(10, y0 + 30.6, 0.9), circle(12, y0 + 34, 0.8), circle(-12, y0 + 36, 0.9));
  const backHole = { d: (u, v) => hole.d(-u, v), b: null };
  S.paint(fill(PAPER, { rough: 0.9 }), proj('front', lat, FRAME), proj('back', lat, FRAME), proj('front', hole, 0x4a4248), proj('back', backHole, 0x4a4248), proj('front', stroke(hole, 0.7, -0.4), tone(PAPER, 0.25)));
  S.at([0, 0, -16], null, () => S.extrude([[-21, y0 + 1.6], [21, y0 + 1.6], [21, y0 + 46], [-21, y0 + 46]], -0.3, 0.3));
  S.paint(fill(FRAME, { rough: 0.7 }), under(0.2));
  S.box(-23, y0, -17.4, -21, y0 + 48, -14.6); S.box(21, y0, -17.4, 23, y0 + 48, -14.6); S.box(-21, y0 + 46, -17.4, 21, y0 + 48, -14.6); S.box(-21, y0, -17.4, 21, y0 + 1.6, -14.6);
  // the vase, over; its flowers out, a puddle
  S.paint(fill(0x3a6a9a, { rough: 0.25 }), outer(wrap(4, or(arc(0, 5, 2, 0, 3, 0.5), arc(2, 9, 1.6, 3, 6, 0.4)), 0xe8eef2)), under(0.2));
  S.at([-14, y0 + 4, 8], [0, 0.4, Math.PI / 2 - 0.12], () => S.lathe(spline([[0, -6], [3.4, -5.6], [4.4, -2], [2.6, 3], [1.6, 5], [2.4, 6.4]], 3), { segs: 16, cap: 'bottom' }));
  S.clear(true);
  S.paint(fill(0xb8dce8, { rough: 0.05 }));
  S.at([-4, y0, 12], null, () => S.lathe([[0, 0.3], [9, 0.3], [9.6, 0], [0, 0]].reverse(), { segs: 18, sz: 0.5 }));
  S.clear(false);
  for (const [k, c] of [[0, 0xe8506a], [1, 0xf2c23a], [2, 0xf6f2ea]]) {
    S.paint(fill(0x4a8a3a, { rough: 0.6 }));
    const end = [-4 + k * 3, y0 + 1.6 + k * 0.4, 14 - k * 4];
    S.tube(spline([[-10.6, y0 + 4.4, 9.4], [-7, y0 + 2.4, 11 - k * 2], end], 2), 0.35, { sides: 5 });
    S.paint(fill(c, { rough: 0.6 }), crown(0.1));
    for (let p = 0; p < 5; p++) S.at([end[0] + Math.cos(p * 1.257) * 1.3, end[1] + 0.6, end[2] + Math.sin(p * 1.257) * 1.3], [0, p * 1.257, 1.2], () => S.ball([0, 0, 0], [1.4, 0.4, 0.9], { segs: 7, rings: 4 }));
  }
  // the toilet roll, unrolled across the room
  S.paint(fill(WHITE, { rough: 0.9 }), proj('right', or(stroke(circle(-6, y0 + 4.4, 3), 0.3), circle(-6, y0 + 4.4, 1.6)), 0xc8b89a), proj('left', or(stroke(circle(6, y0 + 4.4, 3), 0.3), circle(6, y0 + 4.4, 1.6)), 0xc8b89a), under(0.15));
  S.at([22, y0 + 4.4, 14], [0, 0.5, Math.PI / 2], () => S.cyl([0, -4, 0], 4.4, 8, { segs: 18 }));
  S.paint(fill(WHITE, { rough: 0.9 }), proj('top', repeatU(rbox(0, 0, 0.12, 4), 4.2), 0xd8d4c8));
  S.tube(spline([[19, y0 + 0.3, 16], [10, y0 + 0.3, 20], [2, y0 + 0.4, 17], [-2, y0 + 0.3, 19.6], [-12, y0 + 0.3, 20.4], [-24, y0 + 0.3, 17]], 3), 0.26, { sides: 4, flat: [16, 1] });
  // the culprit, asleep on a cushion all day, apparently (one eye opens)
  S.paint(fill(0x6a7ab8, { rough: 0.85 }), proj('top', or(seg(-10, -10, 10, 10, 0.4), seg(-10, 10, 10, -10, 0.4)), tint(0x6a7ab8, 0.25)), under(0.2));
  pillow(S, [12, y0, -2], 10, 9, 4.4, 3);
  const c = [12, y0 + 4.4, -2];
  S.paint(fill(CAT, { rough: 0.85 }), vol(blob([c[0] - 2, c[1] + 1, c[2] + 6], [5, 2.6, 2.6]), WHITE), crown(0.1), under(0.1));
  S.at(c, [0, -0.3, 0], () => {
    S.lathe(spline([[0.1, 0], [6.4, 0.4], [7.6, 2.6], [6, 5.2], [0.1, 6]], 2), { segs: 18, sx: 1.05, sz: 0.85 });
    S.paint(fill(CAT, { rough: 0.85 }), proj('top', repeatU(rbox(0, 0, 0.6, 3), 2.4, -40, 40), tone(CAT, 0.3)));
    S.tube(spline([[-6.4, 1.4, -2], [-6.6, 1.6, 3.6], [-3, 1.6, 6.8], [2.6, 1.4, 7.2]], 3), (t) => 1.5 - 0.5 * t, { sides: 7 });
    S.paint(fill(WHITE, { rough: 0.8 }));
    for (const x of [2.6, 4.6]) S.ball([x, 0.8, 6.2], [1.3, 0.8, 1.6], { segs: 8, rings: 4 });
  });
  S.joint('head', { pivot: [17, y0 + 7, 0], axis: 'z', min: -0.5, max: 0.1, rest: 0, g: [0, -0.4] }, () => S.at([17.4, y0 + 8.4, 2], [0, -0.7, -0.25], () => {
    S.paint(fill(CAT, { rough: 0.85 }), vol(blob([0, -2.6, 3], [3.4, 2, 2.4]), WHITE), proj('front', or(arc(-2.2, 0.8, 1.2, Math.PI * 1.15, Math.PI * 1.85, 0.4)), 0xf2ece0), proj('front', or(ellipse(2.2, 0.6, 1, 0.75), seg(1.1, 1, 3.3, 1, 0.4)), 0xf2d04a), proj('front', ellipse(2.2, 0.5, 0.25, 0.6), EYE), under(0.1));
    head(S, [0, 0, 0], [5, 4.2, 4.4], { muzzle: 0.3, brow: 0.2, cheek: 0.25, chin: 0.2 });
    S.paint(fill(0xe89aa0, { rough: 0.3 }));
    S.ball([0, -1, 4.3], [0.6, 0.45, 0.4], { segs: 6, rings: 4 });
    for (const s of [1, -1]) { S.paint(fill(CAT, { rough: 0.85 }), proj('front', ellipse(0, 1.8, 0.9, 1.4), 0xd88a90)); S.at([s * 3, 3, -0.4], [0, 0, -s * 0.45], () => blade(S, 4, 4, 1, { shape: 'ear', cup: 0.4 })); }
  }));
}
