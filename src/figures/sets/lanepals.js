// Lane Pals (ろじのなかま): the back lane's own people as chibi figures, built from their actual specs (the people kit's
// presets, src/people/presets.js; Mikawa-san's from src/places/mikawaya/oldman.js) through the chibi kit
// (src/figures/chibi.js). Sculpt programs in millimetres; the series data is src/data/series/lanepals.js.
import { chibi, chibiSpec, base } from '../chibi.js';
import { fill, proj, vol, under, crown, tone, tint, mix, circle, ellipse, rbox, seg, arc, or, above, band } from '../paint.js';

const MAKER = 'MOGURA';
const ASPHALT = 0x5e5c64, LINE = 0xece8dc;
/** The lane's base: an octagon of asphalt with a painted kerb line and the figure's name on the front. */
const laneBase = (text, o = {}) => ({
  shape: 'oct', r: o.r ?? 15.5, col: o.col ?? ASPHALT, rim: 0x34323a, text, maker: MAKER,
  top: [proj('top', or(rbox(-9.4, -7.6, 2.4, 0.55, 0.1), rbox(-3.2, -7.6, 2.4, 0.55, 0.1), rbox(3, -7.6, 2.4, 0.55, 0.1), rbox(9.2, -7.6, 2.4, 0.55, 0.1)), LINE, { near: -1 }),
    proj('top', or(circle(-6, 4, 0.3), circle(5, 7, 0.25), circle(8, -2, 0.3), circle(-2, 9, 0.25), circle(-9, -1, 0.3)), tint(o.col ?? ASPHALT, 0.2), { near: -1 }), ...(o.top || [])],
});

// ------------------------------------------------------------------ props
/** A gacha capsule, faceted, two-tone: in a fist (local +y out of it). */
function capsule(S, col = 0xe8483a) {
  const prof = (r) => [[0, -r], [r * 0.7, -r * 0.72], [r, 0], [r * 0.7, r * 0.72], [0, r]];
  S.at([0, 3.1, 0.4], [0.3, 0.4, 0], () => {
    S.paint(fill(0xf6f2ea, { rough: 0.3 }), vol(above(0.15), col, { rough: 0.25 }), vol(band(-0.15, 0.15), tone(col, 0.25)), crown(0.15), under(0.2));
    S.lathe(prof(2.6), { segs: 8 });
  });
}
/** A walking stick from a fist down to the ground (figure space): its crook in the hand. */
function cane(ctx, side, col = 0x4a2e1a, o = {}) {
  const { S } = ctx, g = ctx.pt('hand' + side, [ctx.J['hand' + side][0] + (side === 'L' ? -0.3 : 0.3), ctx.J['hand' + side][1] - 1.7, ctx.J['hand' + side][2] + 0.2]);
  const foot = [g[0] + (o.dx ?? 0), 0, g[2] + (o.dz ?? 1.2)];
  S.paint(fill(col, { rough: 0.35 }), crown(0.15), under(0.2));
  S.tube([V3(foot, [0, 0.1, 0]), V3(g, [0, -1, 0]), V3(g, [0, 1.2, 0]), V3(g, [0, 2.4, -1.2]), V3(g, [0, 1.6, -2.6])], 0.55, { sides: 6 });
  S.paint(fill(0x2a2420, { rough: 0.6 }));
  S.cyl(foot, 0.7, 0.8, { segs: 6 });
}
const V3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// ------------------------------------------------------------------ 1. Grandpa Tokuzō, holding up a capsule
export function tokuzo(S) {
  const spec = chibiSpec('gramps', 1937);
  chibi(S, spec, {
    pose: { chest: [0.16, 0, 0], neck: [-0.06, 0, 0], head: [-0.1, -0.12, -0.06], armL: [0.5, 0, 0.12], foreL: [-0.35, 0.5, -0.4], armR: [-1.0, 0.2, 0.32], foreR: [-1.3, 0.2, 0], handR: [0.3, 0, 0], thighL: [-0.06, 0, 0.06], thighR: [0.06, 0, 0.06] },
    expr: 'calm', props: [{ hand: 'R', build: (S2) => capsule(S2) }],
    parts: { armR: { name: 'capsule', axis: 'x', g: [0, -0.55], idle: 0.04 } },
    base: laneBase('TOKUZO'),
  });
}

// ------------------------------------------------------------------ 2. Old Man Mikawa, both hands on his stick
export function mikawa(S) {
  const spec = chibiSpec('grandpa', 1937, {
    name: 'Mikawa-san', H: 1.95, build: 1.22, belly: 0.12, age: 'elder', skin: [230, 191, 154],
    hair: { style: 'short', col: [232, 230, 224], hi: [252, 252, 250], grey: 1 }, glasses: null, hat: null,
    top: { kind: 'jacket', col: [106, 94, 66], shirt: [46, 74, 54] }, bottom: { kind: 'slacks', col: [74, 68, 54], belt: [50, 36, 26] },
    shoes: { kind: 'comfort', col: [58, 42, 32] }, socks: { col: [90, 90, 96] }, acc: [],
  });
  spec.face = { ...spec.face, wrinkles: 1, mustache: false, stubble: 0.85, browW: 1.5, iris: [74, 108, 148], tilt: 0.3, lid: 'mono' };
  chibi(S, spec, {
    pose: { chest: [0.1, 0, 0], head: [-0.04, 0, 0], armR: [-0.7, 0.3, -0.05], foreR: [-0.9, 0.2, 0], armL: [-0.55, -0.2, -0.32], foreL: [-1.0, -0.2, 0.2], thighL: [0, 0, 0.08], thighR: [0, 0, 0.08] },
    expr: { eye: 'half', mouth: 'flat', brow: 'angry', blush: 0 }, props: [],
    parts: { head: { name: 'nod', axis: 'x', g: [0, 0.32], idle: 0.03 } },
    base: laneBase('MIKAWA'),
    extra: (ctx) => cane(ctx, 'R', 0x4a2e1a, { dz: 0.6, dx: -0.6 }),
  });
}

// ------------------------------------------------------------------ 3. The Sketchbook Sensei (the manga artist), mid-stroke
function sketchbook(S) {
  S.at([0.4, 1.4, 0.6], [-0.35, -0.3, 0.1], () => {
    S.paint(fill(0xc8a070, { rough: 0.7 }), under(0.2));
    S.box(-4.4, -0.3, -3.2, 0, 0, 3.2, { bevel: 0.1 });
    S.paint(fill(0xfbf8ee, { rough: 0.8 }), proj('top', or(ellipse(-2.2, 0.4, 1.3, 1.6), arc(-2.2, 0.0, 0.9, Math.PI * 1.2, Math.PI * 1.8, 0.16), seg(-3.6, -2.2, -0.8, -2.2, 0.14), seg(-3.4, -2.7, -1.2, -2.7, 0.14), seg(-3.8, 2.3, -3.0, 1.8, 0.14)), 0x4a4650), proj('top', or(...[0, 1, 2, 3, 4].map((i) => seg(-3.7 + i * 0.3, 2.6, -2.7 + i * 0.3, 1.4, 0.1))), 0x8a8690));
    S.box(-4.2, 0, -3.0, -0.2, 0.25, 3.0);
    S.paint(fill(0xb8b4b0, { rough: 0.3 }));
    for (let i = 0; i < 6; i++) S.at([0.05, 0.1, -2.6 + i * 1.04], [0, 0, Math.PI / 2], () => S.cyl([0, -0.4, 0], 0.32, 0.8, { segs: 5 }));
  });
}
function gpen(S) {
  S.paint(fill(0x2a2630, { rough: 0.3 }), crown(0.2));
  S.cyl([0, -2.4, 0], [0.45, 0.4], 6.2, { segs: 6 });
  S.paint(fill(0xd8d4cc, { rough: 0.2 }), proj('front', seg(0, 4.6, 0, 3.6, 0.12), 0x4a4650));
  S.cone([0, 3.8, 0], 0.5, 2.2, { segs: 4 });
}
export function mangaka(S) {
  const spec = chibiSpec('rohan', 1, { hat: { kind: 'headband', col: [47, 106, 88] } });
  const GOLD = 0xd8b45a, BAND = 0x2f6a58;
  const zz = (y0, amp) => { const f = (x, y, z) => { const a = Math.atan2(x, z - 0.6), u = a / (Math.PI * 2) * 22, tri = Math.abs(u - Math.floor(u) - 0.5) * 2; return Math.abs(y - (y0 + (tri - 0.5) * amp)) - 0.32; }; f.box = [-30, y0 - 3, -30, 30, y0 + 3, 30]; return f; };
  chibi(S, spec, {
    pose: { chest: [0.12, -0.25, 0.04], head: [0.12, 0.3, 0.08], armL: [-1.0, 0.2, 0.25], foreL: [-1.15, 0.4, 0], handL: [0, -0.4, 0], armR: [-0.85, -0.35, 0.5], foreR: [-1.5, -0.2, 0], thighL: [-0.25, 0, 0.12], shinL: [0.15, 0, 0], thighR: [0.2, 0, 0.1], shinR: [0.15, 0, 0], footR: [-0.1, 0, 0] },
    expr: { eye: 'sharp', mouth: 'smile', brow: 'angry', look: [0.5, -0.2] },
    bandPaint: (ctx) => { const y = ctx.P.hc[1] + ctx.P.hh * 0.43; return [fill(BAND, { rough: 0.5 }), vol(zz(y - 1.05, 0.9), GOLD), vol(zz(y + 1.05, 0.9), GOLD)]; },
    props: [{ hand: 'L', build: sketchbook }, { hand: 'R', build: gpen, rot: [0.4, 0, 0] }],
    parts: { armR: { name: 'pen', axis: 'z', g: [0, 0.35], idle: 0.06 } },
    base: laneBase('SENSEI'),
    head: (ctx) => { // the G-pen nib earrings
      const { S: s, P } = ctx;
      s.paint(fill(GOLD, { rough: 0.2 }), under(0.2));
      for (const sd of [1, -1]) { const p = ctx.headPt(-0.42, sd > 0 ? -0.06 : Math.PI + 0.06, 0.4); s.at([p[0], p[1] - 1.6, p[2]], null, () => s.cone([0, 0, 0], 0.55, -1.8, { segs: 4 })); }
      void P;
    },
  });
}

// ------------------------------------------------------------------ 4. Pompadour Senpai, punching straight at you
export function senpai(S) {
  const spec = chibiSpec('josuke', 1);
  chibi(S, spec, {
    pose: { chest: [0.02, 0.3, 0], head: [0.04, -0.28, 0.04], armR: [-1.45, -0.1, 0.12], foreR: [-0.15, 0, 0], armL: [0.15, -0.3, 0.45], foreL: [-1.6, 0.2, -0.3], thighL: [-0.3, 0.1, 0.2], shinL: [0.2, 0, 0], thighR: [0.35, 0, 0.12], shinR: [0.3, 0, 0], footR: [-0.25, 0, 0] },
    expr: 'determined',
    parts: { armR: { name: 'punch', axis: 'x', g: [0, 0.5], idle: 0.03 } },
    coat: { len: 0.95, flare: 1.35, back: 1.6 },
    base: laneBase('SENPAI'),
    extra: (ctx) => { // the gold pins on his collar: a heart and a peace sign
      const { S: s, P } = ctx;
      ctx.in('chest', () => {
        s.paint(fill(0xe0b850, { rough: 0.2 }), crown(0.2), under(0.2));
        const z = P.chestZ * 0.8 + 0.4;
        s.at([-1.9, P.shoulderY - 0.4, z], [0, 0, 0], () => s.extrude([[0, -1], [1.1, 0.2], [0.6, 0.9], [0, 0.4], [-0.6, 0.9], [-1.1, 0.2]], 0, 0.45, { bevel: 0.1 }));
        s.at([1.9, P.shoulderY - 0.4, z], [Math.PI / 2, 0, 0], () => s.cyl([0, 0, 0], 0.95, 0.45, { segs: 8, bevel: 0.1 }));
      });
    },
  });
}

// ------------------------------------------------------------------ 5. Scar-Brow (the hungry one), swiping the air
export function scarbrow(S) {
  const spec = chibiSpec('okuyasu', 1);
  spec.top.inner = 0xd8a838;
  chibi(S, spec, {
    pose: { chest: [0.06, -0.35, -0.05], head: [0, 0.25, 0.05], armR: [-0.5, 0.2, 1.75], foreR: [-0.55, 0, 0.3], handR: [0, 0.6, 0], armL: [0.2, 0, 0.35], foreL: [-0.9, 0, 0], thighL: [-0.2, 0, 0.22], shinL: [0.2, 0, 0], thighR: [0.15, 0, 0.18], shinR: [0.2, 0, 0], hands: { R: 'open' } },
    expr: 'grin',
    parts: { armR: { name: 'swipe', axis: 'y', g: [0, -0.9], idle: 0.04 } },
    base: laneBase('SCARBROW'),
    head: (ctx) => { // the scar through his left brow, a stitch or two
      const { S: s, P } = ctx, x = P.eyeX + 0.6, y = P.eyeY + 3.8, z = ctx.faceZ((y - P.hc[1]) / P.hh, 0.06);
      s.paint(fill(mix(ctx.look.skin, 0xf8e8e0, 0.5), { rough: 0.4 }), proj('front', or(seg(x - 0.5, y + 1.4, x + 0.5, y - 1.6, 0.18), seg(x - 0.6, y - 0.2, x + 0.4, y + 0.1, 0.16)), tone(ctx.look.skin, 0.35)));
      s.at([x, y, z], [0, 0, -0.32], () => s.box(-0.35, -1.9, -0.05, 0.35, 1.9, 0.12));
    },
  });
}

// ------------------------------------------------------------------ 6. The Lane Gyaru, peace sign and a wink
export function gyaru(S) {
  const spec = chibiSpec('gyaru', 7, {
    hair: { style: 'long', col: [216, 184, 120], hi: [255, 236, 190], volume: 1.2, part: 1 },
    top: { kind: 'tee', col: [240, 160, 192], fitted: true, print: 'heart', col2: [232, 80, 138], sleeve: 'short' },
    bottom: { kind: 'skirt', cut: 'mini', col: [74, 106, 154] }, legs: 'loosesocks', socks: { col: [248, 248, 246] },
    shoes: { kind: 'platform', col: [240, 240, 236] }, acc: [{ kind: 'shoulderbag', col: [240, 240, 236], side: -1 }],
  });
  chibi(S, spec, {
    pose: { from: 'peace', chest: [0, 0.15, -0.06], head: [0.06, -0.12, 0.2], armL: [0.1, 0.4, 0.75], foreL: [-1.6, 0.3, -0.6], thighL: [0, 0, 0.12], thighR: [-0.25, 0, -0.04], shinR: [0.5, 0, 0], footR: [0.3, 0, 0] },
    expr: 'wink', palette: { iris: 0x6a4a2a },
    parts: { armR: { name: 'peace', axis: 'z', g: [0, -0.3], idle: 0.05 } },
    base: laneBase('GYARU', { col: 0x6a6670 }),
  });
}

// ------------------------------------------------------------------ secret: The Man in the Bush (pops up with his binoculars)
function binoculars(S) {
  S.paint(fill(0x2e3228, { rough: 0.4 }), under(0.2), crown(0.15));
  for (const s of [1, -1]) S.at([s * 1.3, 1.2, 0], [Math.PI / 2, 0, 0], () => S.cyl([0, -1.8, 0], [0.95, 1.1], 3.6, { segs: 6, bevel: 0.15 }));
  S.box(-1.2, 0.8, -0.6, 1.2, 1.6, 0.6, { bevel: 0.2 });
  S.paint(fill(0x8ab0c8, { rough: 0.05 }));
  for (const s of [1, -1]) S.at([s * 1.3, 1.2, 1.85], [Math.PI / 2, 0, 0], () => S.cyl([0, 0, 0], 0.82, 0.12, { segs: 6 }));
}
function bush(S) {
  const G = 0x4a7a3a, G2 = 0x6a9a48, G3 = 0x355a2c;
  S.paint(fill(G3, { rough: 0.6 }), crown(0.18), under(0.25));
  S.lathe([[0, 0], [10.4, 0.2], [12, 4], [11.4, 9], [9, 12.6], [0, 13.4]], { segs: 7 });
  // leaves: big cupped blades all over, placed by the golden angle, tilted out and up
  for (let i = 0; i < 46; i++) {
    const a = i * 2.39996, t = (i + 0.5) / 46, y = 1 + t * 13.6, r = Math.sqrt(Math.max(0.05, 1 - ((y - 5) / 10) ** 2)) * 11.6;
    S.paint(fill(i % 3 === 0 ? G2 : i % 3 === 1 ? G : tone(G, 0.15), { rough: 0.55 }), crown(0.18), under(0.25));
    S.at([Math.sin(a) * r, y, Math.cos(a) * r], [-(0.25 + t * 0.9), a, (i % 2 ? 0.35 : -0.35)], () => blade_(S, 1.3 + 0.4 * ((i * 7) % 3) / 2));
  }
}
function blade_(S, k = 1) { S.loft([[0, 0.25], [0.4, 1], [0.78, 0.7], [1, 0.04]].map(([t, w]) => [[-w * 2.4 * k, t * 5.4 * k, 0], [0, t * 5.4 * k, w * 0.8 * k + 0.3], [w * 2.4 * k, t * 5.4 * k, 0], [0, t * 5.4 * k, -0.3]])); }
export function yabuki(S) {
  const spec = chibiSpec('yabuki', 1);
  base(S, laneBase('???', { col: 0x5a6a4a }));
  S.rest = 0.15;
  S.joint('peek', { slide: [0, 7, 0], min: 0, max: 1, rest: 0.15, g: [0, 1] }, () => {
    chibi(S, spec, {
      base: false,
      pose: { hipsAt: [0, -6.6, 0], chest: [0.3, 0, 0], head: [-0.25, 0, 0], thighL: [-1.5, 0, 0.3], shinL: [2.3, 0, 0], thighR: [-1.5, 0, 0.3], shinR: [2.3, 0, 0], armL: [-1.25, -0.5, 0.15], foreL: [-1.6, 0.3, 0], armR: [-1.25, -0.5, 0.15], foreR: [-1.6, 0.3, 0] },
      expr: { eye: 'sharp', mouth: 'flat', brow: 'angry', sweat: true },
      props: [{ hand: 'R', build: binoculars, at: [1.2, 1.2, 0.6], rot: [-1.2, 0.3, 0] }],
    });
  });
  bush(S);
}
