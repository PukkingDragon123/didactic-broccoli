// The vending machine's cabinet, low-poly, at the old prop's footprint (0.98 wide, 0.70 deep, 1.83 tall): a steel box
// on a plinth, a door with the glazed sample window (three ledges behind the glass), the coin column on the right
// (amount display, note slot, coin slot, return lever, change cup, lock), the maker's poster under plexi, the
// delivery port at the bottom, hinges, vents. Each line-up has its own livery, painted as pixel art (the maker's
// kana logo, mascot, colours) into one atlas per livery: the front and side are orthographic views, so a slot
// painted in the front view sits exactly on the little box modelled for it.
//   makeCabinet(liveryId) -> { group, geo, sheet, lit (material of the window's inside) }     CAB: the layout, metres
import * as THREE from 'three';
import { Geo, triplanar } from '../../vehicles/geom.js';
import { Sheet, R_PAINT, R_METAL, R_PLASTIC } from '../../products/containers.js';
import { Px, dk, lt, on, NONE } from '../../products/px.js';
import { m5, m3, mk, bold, x2, shear, label } from '../../products/type.js';
import { PAT, pill } from '../../products/print.js';
import { BRANDS } from '../../products/brands.js';
import { spr } from '../../products/labels.js';

export const CAB = {
  x0: -0.49, x1: 0.49, h: 1.83, zb: -0.35, zf: 0.3, zd: 0.345,
  win: { x0: -0.44, x1: 0.28, y0: 0.91, y1: 1.75, zb: 0.2 },
  port: { x0: -0.36, x1: 0.16, y0: 0.07, y1: 0.25, zb: 0.16 },
  ledge: [1.54, 1.26, 0.98], stripH: 0.07, cols: [-0.35, -0.17, 0.01, 0.19], sampleZ: 0.272,
  poster: { x0: -0.44, x1: 0.28, y0: 0.31, y1: 0.87 },
  slot: [0.385, 1.2], outlet: [-0.1, 0.105, 0.25],
};
const PPM = 448;

export const LIVERY = {
  coffee: { brand: 'bancho', door: 0xf0e6cc, body: 0x4a2a18, trim: 0xe8c040, ink: 0x2a1a14, title: 'コーヒー・お茶', mascot: ['bancho', 'thumb'], tag: 'いっぷく どうぞ', sub: 'COFFEE & TEA', logo: ['番長', '珈琲'] },
  soda: { brand: 'puku', door: 0xf2f5f8, body: 0x2a7ae0, trim: 0xffd23f, ink: 0x14285a, title: 'ジュース', mascot: ['puku', 'blow'], tag: 'シュワッと いこう！', sub: 'SODA & SPORTS', logo: ['プク', 'ポップ'] },
  corner: { brand: 'hokohoko', door: 0xf4ead2, body: 0xc8382e, trim: 0xf4ead2, ink: 0x3a1408, title: 'のみもの', mascot: ['nabe', 'ladle'], tag: 'ほっと ひといき', sub: 'DRINKS', logo: ['ほこ', 'ほこ堂'] },
  sake: { brand: 'hoho', door: 0xe6e2d6, body: 0x1e2a6a, trim: 0xd8a830, ink: 0x101848, title: 'お酒', mascot: ['fukuro', 'mug'], tag: 'こんやも おつかれさま', sub: 'BEER & CHU-HI', logo: ['ホーホー', '酒造'] },
  odd: { brand: 'nazo', door: 0xe8e4f0, body: 0x5a3a8a, trim: 0xd8f060, ink: 0x1e1e2e, title: 'めずらしい', mascot: ['nazo', 'shrug'], tag: 'なにが でるかな？', sub: 'ODDITIES', logo: ['謎', '商会'] },
};

const K = (s, z = 16) => mk(s, z), KB = (s) => bold(mk(s, 16)), K2 = (s) => x2(bold(mk(s, 16))), K4 = (s) => x2(x2(bold(mk(s, 16))));
const SIL = 0xc4c9cf, SIL_D = 0x8e949c, SIL_L = 0xe4e8ec, DARK = 0x2a2c32;
const big4 = new Map();
const mascot4 = (name, pose) => { const k = name + pose; if (!big4.has(k)) big4.set(k, spr(name, pose).x2().x2()); return big4.get(k); };

// ------------------------------------------------------------------ painting (pixels: x right, y down)
function paintFront(L) {
  const W = Math.round((CAB.x1 - CAB.x0) * PPM), H = Math.round(CAB.h * PPM), b = BRANDS[L.brand];
  const p = new Px(W, H), X = (x) => Math.round((x - CAB.x0) * PPM), Y = (y) => Math.round((CAB.h - y) * PPM);
  const box = (x0, y0, x1, y1, c) => p.rect(X(x0), Y(y1), X(x1) - X(x0), Y(y0) - Y(y1), c);
  p.fill(L.door);
  // the door's pressed edge, the kick band at the foot
  p.frame(3, 3, W - 6, H - 6, dk(L.door, 0.18)); p.frame(4, 4, W - 8, H - 8, lt(L.door, 0.5));
  box(CAB.x0, 0.05, CAB.x1, 0.3, L.body); box(CAB.x0, 0.295, CAB.x1, 0.3, L.trim);
  // the header: what this machine sells, the maker
  box(CAB.x0, 1.765, CAB.x1, CAB.h, L.body); box(CAB.x0, 1.76, CAB.x1, 1.765, L.trim);
  label(p, KB(L.title), X(CAB.win.x0) + 4, Y(1.815) + 2, { c: on(L.body) });
  label(p, m5(L.sub), X(CAB.win.x1) - 4, Y(1.805) + 2, { c: L.trim, align: 'r' });
  label(p, K(b.jp, 12), X(0.385), Y(1.812) + 1, { c: on(L.body), align: 'c' });
  // the window's chrome frame (the hole is cut in the model)
  const w = CAB.win; box(w.x0 - 0.014, w.y0 - 0.014, w.x1 + 0.014, w.y1 + 0.01, SIL_D); box(w.x0 - 0.01, w.y0 - 0.01, w.x1 + 0.01, w.y1 + 0.006, SIL_L); box(w.x0 - 0.004, w.y0 - 0.004, w.x1 + 0.004, w.y1 + 0.002, DARK);
  // ---- the coin column
  box(0.3, 0.9, 0.47, 1.75, lt(SIL, 0.1)); p.frame(X(0.3), Y(1.75), X(0.47) - X(0.3), Y(0.9) - Y(1.75), SIL_D);
  // amount display
  box(0.315, 1.6, 0.455, 1.67, DARK); box(0.322, 1.607, 0.448, 1.663, 0x1a0c0c);
  label(p, m5('000', 2), X(0.44), Y(1.655), { c: 0xff4a3a, align: 'r' }); label(p, K('円', 12), X(0.385), Y(1.705), { c: L.ink, align: 'c' });
  label(p, K('金額', 12), X(0.385), Y(1.735), { c: L.ink, align: 'c' });
  // note slot
  box(0.33, 1.44, 0.44, 1.52, DARK); box(0.34, 1.474, 0.43, 1.486, 0x0c0c10); box(0.34, 1.45, 0.43, 1.466, 0x2a6ad8);
  label(p, m3('1000'), X(0.385), Y(1.464), { c: 0xffffff, align: 'c' });
  label(p, K('千円札', 12), X(0.385), Y(1.555), { c: L.ink, align: 'c' });
  // coin slot plate: the slit, which coins it takes
  box(0.345, 1.14, 0.425, 1.3, SIL_L); p.frame(X(0.345), Y(1.3), X(0.425) - X(0.345), Y(1.14) - Y(1.3), SIL_D);
  box(0.381, 1.17, 0.389, 1.25, 0x0c0c10); box(0.378, 1.166, 0.381, 1.254, SIL_D);
  label(p, K('コイン', 12), X(0.385), Y(1.345), { c: L.ink, align: 'c' });
  [[10, 0xc88a4a], [50, SIL], [100, SIL], [500, 0xd8c070]].forEach(([v, c], i) => { const cx = X(0.325) + i * 18 + 9, cy = Y(1.115); p.ell(cx, cy, 7, 7, dk(c, 0.4)); p.ell(cx, cy, 6, 6, c); label(p, m3(String(v)), cx, cy - 2, { c: dk(c, 0.65), align: 'c' }); });
  // return lever, change cup
  box(0.355, 1.04, 0.415, 1.1, SIL_D); box(0.365, 1.05, 0.405, 1.09, DARK);
  label(p, K('返却', 12), X(0.385), Y(1.03), { c: L.ink, align: 'c' });
  box(0.33, 0.93, 0.44, 1.0, SIL_D); box(0.337, 0.935, 0.433, 0.99, 0x18181c); box(0.337, 0.985, 0.433, 0.99, SIL_L);
  // the lock
  p.ell(X(0.385), Y(0.82), 9, 9, SIL_D); p.ell(X(0.385), Y(0.82), 7, 7, SIL_L); p.rect(X(0.385) - 1, Y(0.82) - 4, 2, 8, DARK);
  // a maker's plate and an inspection sticker under it
  box(0.325, 0.7, 0.445, 0.76, SIL_L); p.frame(X(0.325), Y(0.76), X(0.445) - X(0.325), Y(0.7) - Y(0.76), SIL_D);
  label(p, m3('TYPE VM-36'), X(0.385), Y(0.752), { c: DARK, align: 'c' }); label(p, m3('100V 50/60HZ'), X(0.385), Y(0.737), { c: DARK, align: 'c' }); label(p, m3('1998.11 NO.' + b.code), X(0.385), Y(0.722), { c: DARK, align: 'c' });
  box(0.34, 0.6, 0.43, 0.67, 0xf8e040); label(p, K('点検済', 12), X(0.385), Y(0.662), { c: 0x2a2010, align: 'c' }); label(p, m3('99.03'), X(0.385), Y(0.625), { c: 0x2a2010, align: 'c' });
  // ---- the poster under plexi: the maker, the mascot, the pitch
  const P = CAB.poster, px0 = X(P.x0), py0 = Y(P.y1), pw = X(P.x1) - px0, ph = Y(P.y0) - py0;
  p.rect(px0 - 4, py0 - 4, pw + 8, ph + 8, SIL_D); p.rect(px0 - 2, py0 - 2, pw + 4, ph + 4, SIL_L);
  p.clip(px0, py0, pw, ph);
  p.rect(px0, py0, pw, ph, L.poster ? L.poster(px0, py0, pw, ph) : PAT.rays(L.body, lt(L.body, 0.14), px0 + pw * 0.72, py0 + ph * 0.6, 16));
  p.rect(px0, py0 + ph - 46, pw, 46, L.trim); p.rect(px0, py0 + ph - 49, pw, 3, on(L.trim) === 0x241a1e ? L.ink : L.door);
  const ms = mascot4(L.mascot[0], L.mascot[1]);
  p.blit(ms, px0 + pw - ms.w - 8, py0 + ph - ms.h - 30);
  (L.logo || [b.jp]).forEach((t, i) => label(p, K4(t), px0 + 10, py0 + 10 + i * 66, { c: L.trim, out: L.ink, ow: 2, sh: [4, 4, L.ink] }));
  label(p, m5(b.en, 2), px0 + 12, py0 + 146, { c: L.door, out: L.ink });
  label(p, KB(L.tag), px0 + 12, py0 + ph - 34, { c: on(L.trim) });
  pill(p, px0 + 12, py0 + 168, K('つめた〜い', 12), { c: 0x2a7ae0, text: 0xffffff, ink: L.ink });
  pill(p, px0 + 104, py0 + 168, K('あったか〜い', 12), { c: 0xe0443a, text: 0xffffff, ink: L.ink });
  p.clip();
  // plexi glare: two hard streaks
  for (let k = 0; k < ph; k++) { const x = px0 + 40 + Math.round((ph - k) * 0.5); if (k % 2 === 0 && x < px0 + pw - 2) { p.set(x, py0 + k, lt(p.get(x, py0 + k), 0.5)); p.set(x + 1, py0 + k, lt(p.get(x + 1, py0 + k), 0.5)); } }
  // ---- the delivery port's surround and label
  const q = CAB.port; box(q.x0 - 0.014, q.y0 - 0.012, q.x1 + 0.014, q.y1 + 0.012, SIL_D); box(q.x0 - 0.008, q.y0 - 0.006, q.x1 + 0.008, q.y1 + 0.006, DARK);
  label(p, K('とりだし口', 12), X((q.x0 + q.x1) / 2), Y(0.288), { c: on(L.body), align: 'c' });
  // vent slots at the foot, right
  for (let k = 0; k < 7; k++) box(0.22, 0.085 + k * 0.022, 0.45, 0.095 + k * 0.022, dk(L.body, 0.45));
  // wear, by rule: scuffs along the kick band, a run of grime under each corner of the window frame
  for (let x = 6; x < W - 6; x += 7) if ((x * 37) % 11 < 4) p.rect(x, H - 12 - ((x * 13) % 9), 3, 1, dk(L.body, 0.3));
  for (const gx of [X(w.x0 - 0.012), X(w.x1 + 0.008)]) for (let k = 0; k < 22; k++) if (k % 3 !== 2) p.set(gx + (k > 12 ? 1 : 0), Y(w.y0 - 0.016) + k, dk(L.door, 0.16));
  return p;
}
function paintSide(L) {
  const W = Math.round((CAB.zd - CAB.zb) * PPM), H = Math.round(CAB.h * PPM), b = BRANDS[L.brand];
  const p = new Px(W, H), Y = (y) => Math.round((CAB.h - y) * PPM);
  p.fill(L.body);
  p.rect(0, Y(1.765), W, 3, L.trim); p.rect(0, Y(0.3), W, 3, L.trim); p.rect(0, Y(0.3) + 3, W, H, dk(L.body, 0.16));
  p.frame(4, 4, W - 8, H - 8, dk(L.body, 0.22)); p.rect(5, 5, W - 10, 1, lt(L.body, 0.25));
  // the maker's name down the panel, the mascot under it
  const v = x2(x2(mk(b.jp.slice(0, 5), 16, { vert: true })));
  const vx = Math.round(W / 2 - v.w / 2);
  p.mask(v, vx + 4, 44, L.ink); p.mask(v, vx, 40, L.trim);
  const ms = mascot4(L.mascot[0], L.mascot[1]);
  const my = Math.min(Y(0.34) - ms.h, 40 + v.h + 26);
  p.ell(W / 2, my + ms.h - 8, ms.w * 0.5, 14, dk(L.body, 0.25));
  p.blit(ms, Math.round(W / 2 - ms.w / 2), my);
  label(p, m5(b.en, 2), W / 2, Y(0.33) + 12, { c: L.trim, align: 'c' });
  // louvres low down towards the back, rivets along the seams
  for (let k = 0; k < 9; k++) { p.rect(18, Y(0.26) + k * 9, 70, 4, dk(L.body, 0.5)); p.rect(18, Y(0.26) + k * 9 + 4, 70, 1, lt(L.body, 0.2)); }
  for (let y = 22; y < H - 10; y += 62) { p.rect(9, y, 2, 2, lt(L.body, 0.35)); p.rect(W - 11, y, 2, 2, lt(L.body, 0.35)); }
  // rain marks down from the top edge, rust starting at the foot
  for (let x = 14; x < W - 10; x += 23) for (let k = 0; k < 18 + (x * 7) % 26; k++) if (k % 4 !== 3) p.set(x + ((k > 20) ? 1 : 0), 8 + k, dk(L.body, 0.2));
  for (let x = 10; x < W - 10; x += 5) { const h = (x * 53) % 7; if (h > 3) p.rect(x, H - 6 - h, 3, h, 0x8a4a26); }
  return p;
}
function paintTop(L) {
  const p = new Px(250, 180); p.fill(dk(L.body, 0.1));
  p.frame(6, 6, 238, 168, dk(L.body, 0.3)); for (let k = 0; k < 6; k++) p.rect(40 + k * 30, 30, 18, 60, dk(L.body, 0.4));
  for (let i = 0; i < 60; i++) p.set((i * 67) % 250, (i * 41) % 180, lt(L.body, 0.25));
  return p;
}
function paintInner(L) {
  const p = new Px(162, 188), b = BRANDS[L.brand];
  p.fill(0xf4f6f4); p.rect(0, 0, 162, 188, PAT.stripes(0xf4f6f4, 0xe8edf0, 9, 'v'));
  void b;
  return p;
}

// ------------------------------------------------------------------ the model
const cache = new Map();
export function makeCabinet(liveryId) {
  if (cache.has(liveryId)) { const c = cache.get(liveryId); return { ...c, group: c.build() }; }
  const L = LIVERY[liveryId] || LIVERY.corner, C = CAB;
  const S = new Sheet(1024, 1024, 'vending:' + liveryId);
  const FW = Math.round((C.x1 - C.x0) * PPM), FH = Math.round(C.h * PPM), SW = Math.round((C.zd - C.zb) * PPM);
  const vF = S.region('front', FW, FH, () => paintFront(L), R_PAINT, L.door);
  const vS = S.region('side', SW, FH, () => paintSide(L), R_PAINT, L.body);
  const vT = S.region('top', 250, 180, () => paintTop(L), R_PAINT, L.body);
  const vI = S.region('inner', 162, 188, () => paintInner(L), 0.7, 0xf4f6f4);
  const sw = (c, r = R_PAINT) => S.swatch(c, r);
  const uvF = (p) => vF.st((p[0] - C.x0) / (C.x1 - C.x0), p[1] / C.h);
  const uvS = (p, n) => vS.st(n[0] > 0 ? (C.zd - p[2]) / (C.zd - C.zb) : (p[2] - C.zb) / (C.zd - C.zb), Math.min(0.999, Math.max(0.001, p[1] / C.h)));
  const uvT = (p) => vT.st((p[0] - C.x0) / (C.x1 - C.x0), (p[2] - C.zb) / (C.zf - C.zb));
  const G = new Geo(2);
  const dark = sw(DARK, R_PLASTIC), sil = sw(SIL, R_METAL), silD = sw(SIL_D, R_METAL), bodyD = sw(dk(L.body, 0.25));
  // plinth
  G.with(sw(0x3a3c42, 0.8), 0, (g) => g.box(C.x0 + 0.02, 0, C.zb + 0.02, C.x1 - 0.02, 0.05, C.zf - 0.01));
  // the body: sides and top painted, back plain
  G.with(triplanar({ px: uvS, nx: uvS, py: uvT, nz: sw(dk(L.body, 0.12)), ny: bodyD }, bodyD), 0, (g) => g.box(C.x0, 0.05, C.zb, C.x1, C.h, C.zf, { bevel: 0.012, skip: ['pz'] }));
  // a fan housing on the roof, hinges down the left edge
  G.with(sw(dk(L.body, 0.3)), 0, (g) => { g.box(-0.36, C.h, -0.3, 0.36, C.h + 0.028, -0.02, { bevel: 0.008, skip: ['ny'] }); });
  G.with(silD, 0, (g) => { for (const y of [0.3, 0.95, 1.6]) g.cyl('y', [C.x0 - 0.004, y, C.zf + 0.022], 0.011, 0.1, 6); });
  // the body's face behind the door (seen through the holes' edges), then the door: a slab with two holes
  const w = C.win, q = C.port;
  const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const holes = [rect(w.x0, w.y0, w.x1, w.y1).reverse(), rect(q.x0, q.y0, q.x1, q.y1).reverse()];
  G.with(dark, 0, (g) => g.polyHoles(rect(C.x0 + 0.012, 0.062, C.x1 - 0.012, C.h - 0.012), holes, (a, b) => [a, b, C.zf], [0, 0, 1]));
  const dx0 = C.x0 + 0.008, dx1 = C.x1 - 0.008, dy0 = 0.058, dy1 = C.h - 0.008;
  G.with(uvF, 0, (g) => g.polyHoles(rect(dx0, dy0, dx1, dy1), holes, (a, b) => [a, b, C.zd], [0, 0, 1]));
  G.with(sw(dk(L.door, 0.3)), 0, (g) => {
    g.quad([dx0, dy0, C.zf], [dx0, dy0, C.zd], [dx0, dy1, C.zd], [dx0, dy1, C.zf], [-1, 0, 0]); g.quad([dx1, dy0, C.zf], [dx1, dy0, C.zd], [dx1, dy1, C.zd], [dx1, dy1, C.zf], [1, 0, 0]);
    g.quad([dx0, dy1, C.zf], [dx0, dy1, C.zd], [dx1, dy1, C.zd], [dx1, dy1, C.zf], [0, 1, 0]); g.quad([dx0, dy0, C.zf], [dx0, dy0, C.zd], [dx1, dy0, C.zd], [dx1, dy0, C.zf], [0, -1, 0]);
  });
  // the window's inside (lit): back wall with the maker's name, pale walls, three ledges
  G.with(triplanar({ nz: (p) => vI.st((p[0] - w.x0) / (w.x1 - w.x0), (p[1] - w.y0) / (w.y1 - w.y0)), pz: (p) => vI.st((p[0] - w.x0) / (w.x1 - w.x0), (p[1] - w.y0) / (w.y1 - w.y0)) }, sw(0xe2e8ec, 0.7)), 1, (g) => g.box(w.x0, w.y0, w.zb, w.x1, w.y1, C.zd, { inward: true, skip: ['pz'] }));
  G.with(sw(0xf4f6f4, 0.6), 1, (g) => { for (const y of C.ledge) g.box(w.x0, y - 0.012, w.zb, w.x1, y, 0.334, { skip: ['nx', 'px', 'nz'] }); });
  // the strip bars under each row (their faces are the machine's own lit strip, added by Vending.js)
  G.with(silD, 0, (g) => { for (const y of C.ledge) g.box(w.x0, y - C.stripH, 0.334, w.x1, y, 0.351, { skip: ['pz', 'nz'] }); });
  // the port: a dark throat
  G.with(sw(0x16161a, 0.9), 0, (g) => g.box(q.x0, q.y0, q.zb, q.x1, q.y1, C.zd, { inward: true, skip: ['pz'] }));
  G.with(silD, 0, (g) => g.quad([q.x0, q.y0 + 0.003, C.zd], [q.x1, q.y0 + 0.003, C.zd], [q.x1, q.y0 + 0.02, q.zb], [q.x0, q.y0 + 0.02, q.zb], [0, 1, 0.2]));
  // the coin column's hardware, each face taking the front view's paint
  const hw = triplanar({ pz: uvF }, sil);
  G.with(hw, 0, (g) => {
    g.box(0.315, 1.6, C.zd, 0.455, 1.67, C.zd + 0.008, { bevel: 0.002, skip: ['nz'] });
    g.box(0.33, 1.44, C.zd, 0.44, 1.52, C.zd + 0.014, { bevel: 0.003, skip: ['nz'] });
    g.box(0.345, 1.14, C.zd, 0.425, 1.3, C.zd + 0.006, { bevel: 0.002, skip: ['nz'] });
    g.box(0.33, 0.93, C.zd, 0.44, 1.0, C.zd + 0.012, { bevel: 0.003, skip: ['nz'] });
  });
  G.with(dark, 0, (g) => { g.box(0.368, 1.052, C.zd, 0.402, 1.088, C.zd + 0.022, { bevel: 0.004, skip: ['nz'] }); });
  G.with(sil, 0, (g) => { g.cyl('z', [0.385, 0.82, C.zd], 0.018, 0.008, 8); });
  // the poster's frame
  const P = C.poster;
  G.with(triplanar({ pz: uvF }, silD), 0, (g) => g.box(P.x0 - 0.008, P.y0 - 0.008, C.zd, P.x1 + 0.008, P.y1 + 0.008, C.zd + 0.006, { bevel: 0.002, skip: ['nz'] }));
  const geo = G.build();
  const body = S.material();
  const lit = body.clone(); lit.emissive = new THREE.Color(0xffffff); lit.emissiveMap = body.map; lit.emissiveIntensity = 0.5; lit.name = 'vending:lit';
  const glass = new THREE.MeshStandardMaterial({ color: 0xcfe6f0, transparent: true, opacity: 0.14, roughness: 0.06, metalness: 0, depthWrite: false });
  const gg = new THREE.PlaneGeometry(w.x1 - w.x0, w.y1 - w.y0).translate((w.x0 + w.x1) / 2, (w.y0 + w.y1) / 2, 0.3325);
  const build = () => {
    const group = new THREE.Group();
    const m = new THREE.Mesh(geo, [body, lit]); m.castShadow = true; m.receiveShadow = true; m.name = 'vending:cabinet';
    const g = new THREE.Mesh(gg, glass); g.renderOrder = 3; g.raycast = () => {}; g.name = 'vending:glass';
    group.add(m, g);
    return group;
  };
  const c = { geo, sheet: S, body, lit, glass, livery: L, build, tris: G.tris };
  cache.set(liveryId, c);
  return { ...c, group: build() };
}
export { NONE, shear };
