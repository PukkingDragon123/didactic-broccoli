// The wholesale carton capsule refills come in: a corrugated box, flexo-printed in one ink plus the series' colour.
// Long sides: the series panel (its name in kana, カプセルトイ), a white shipping label with the lot and a JAN-style
// barcode (a real EAN-13 pattern over a made-up number), the handling marks (this way up, fragile, keep dry) and the
// 発売元 line. Short sides: 天地無用 arrows and the maker's mark. Flaps: 開封口 along the seam. Brown paper tape over
// the seam and down both ends. One painted atlas per series; the cut edges show the fluting.
import * as THREE from 'three';
import { Atlas, ROUGH } from '../vehicles/atlas.js';
import { Geo, boxMap } from '../vehicles/geom.js';
import { ramp, mix } from '../vehicles/paint.js';
import { SERIES_BY_ID } from '../data/series/index.js';
import { glyphMask, clearGlyphs } from './capsuleShell.js';

export const CARTON = [0.27, 0.15, 0.2]; // w, h, d
const T = 0.004; // board thickness
const KANA = 'カプセルトイ個入発売元ガチャガレージ寿町天地無用開封口取扱注意こわれもの';
const hex = (s, d) => parseInt(String(s || d).replace('#', ''), 16);
const KRAFT = 0xc9a26c, INK = 0x4a3222;

function kana(V, str, i, j, c, o = {}) {
  const m = glyphMask(str, o.size || 16), x0 = o.align === 'center' ? i - (m.w >> 1) : o.align === 'right' ? i - m.w : i;
  for (const [x, y] of m) V.px(x0 + x, j - y, c);
  return m.w;
}
/** EAN-13 modules (95 of them) for 12 digits; the check digit is worked out. Returns { bars: '0101...', digits }. */
function ean13(d12) {
  const Lc = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
  const Gc = Lc.map((s) => [...s].reverse().map((c) => (c === '1' ? '0' : '1')).join('')), Rc = Lc.map((s) => [...s].map((c) => (c === '1' ? '0' : '1')).join(''));
  const PAR = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
  const n = [...d12].map(Number), sum = n.reduce((a, v, k) => a + v * (k % 2 ? 3 : 1), 0), chk = (10 - (sum % 10)) % 10, all = [...n, chk];
  let bars = '101';
  for (let k = 1; k <= 6; k++) bars += (PAR[all[0]][k - 1] === 'L' ? Lc : Gc)[all[k]];
  bars += '01010';
  for (let k = 7; k <= 12; k++) bars += Rc[all[k]];
  return { bars: bars + '101', digits: all.join('') };
}

const made = new Map();
/** A series' carton: { mat, geo: { body, flapL, flapS, tape } } (shared by every carton of the series). */
export function cartonParts(series) {
  if (made.has(series)) return made.get(series);
  const build = () => { const A = new Atlas(1024, 512); return { A, geo: buildCarton(series, A) }; };
  const { A, geo } = build();
  const map = A.texture();
  map.anisotropy = 8;
  const mat = new THREE.MeshStandardMaterial({ map, roughness: 0.92, metalness: 0, envMapIntensity: 0.5 });
  mat.name = 'carton';
  const out = { mat, geo };
  made.set(series, out);
  try {
    const need = KANA + (SERIES_BY_ID[series]?.jp || '');
    if (!document.fonts?.check?.('16px "DotGothic16"', need)) document.fonts.load('16px "DotGothic16"', need).then(() => { clearGlyphs(); map.image = build().A.canvas(); map.needsUpdate = true; }, () => {});
  } catch { /* no font loading */ }
  return out;
}

function buildCarton(series, A) {
  const S = SERIES_BY_ID[series] || { name: series, jp: 'カプセルトイ', order: 0, price: 100, card: {} };
  const [w, h, d] = CARTON, hw = w / 2, hd = d / 2, PPM = 1000;
  const ac = hex(S.card?.accent, '#e5383b'), K = ramp(KRAFT, 0.7), white = 0xf8f2e2;
  const V = {
    L: A.patch('L', Math.round(w * PPM), Math.round(h * PPM)), S: A.patch('S', Math.round(d * PPM), Math.round(h * PPM)),
    TL: A.patch('TL', Math.round(w * PPM), Math.round(hd * PPM)), TS: A.patch('TS', Math.round(hd * PPM), Math.round(d * PPM)),
    TAPE: A.patch('TAPE', 280, 50), FLUTE: A.patch('FLUTE', 64, 8), IN: A.patch('IN', 32, 32),
  };
  A.ink(ROUGH.fabric);
  /** Kraft board: the liner with the fluting just showing through as faint lines. */
  const board = (P, vertical = false) => { P.fill(K[2]); const n = vertical ? P.W : P.H; for (let k = 3; k < n; k += 7) (vertical ? P.vline(k, 0, P.H - 1, K[3]) : P.hline(0, P.W - 1, k, K[3])); };
  // ---- a long side
  {
    const P = V.L;
    board(P);
    P.box(0, 0, P.W, 3, K[1]); P.box(0, P.H - 2, P.W, P.H, K[3]); // the bottom's wear line, the top fold catching light
    // the series panel, in its colour
    P.box(10, 46, 126, 138, ac); P.frame(10, 46, 126, 138, mix(ac, 0x000000, 0.35)); P.frame(13, 49, 123, 135, mix(ac, 0xffffff, 0.5));
    const jp = [...(S.jp || 'カプセルトイ')], lines = jp.length > 6 ? [jp.slice(0, Math.ceil(jp.length / 2)).join(''), jp.slice(Math.ceil(jp.length / 2)).join('')] : [jp.join('')];
    lines.slice(0, 2).forEach((l, k) => kana(P, [...l].slice(0, 6).join(''), 68, 130 - k * 19, white, { align: 'center' }));
    P.box(16, 68, 120, 86, white); kana(P, 'カプセルトイ', 68, 85, INK, { align: 'center' });
    P.text5(`${String(S.price || 100)} YEN CLASS`, 68, 62, white, { align: 'center' });
    // the shipping label: lot, quantity class, barcode
    P.box(142, 62, 262, 138, white); P.frame(142, 62, 262, 138, INK);
    P.text5((S.name || series).toUpperCase().slice(0, 18), 147, 133, INK); P.hline(145, 258, 123, INK);
    P.text5(`LOT 99-${String(4 + (S.order || 0) % 8).padStart(2, '0')}  S${String(S.order || 0).padStart(2, '0')}`, 147, 119, INK);
    const code = ean13('4990199' + String(S.order || 0).padStart(2, '0') + '001');
    [...code.bars].forEach((b2, k) => { if (b2 === '1') P.vline(154 + k, 76, 108 - (k < 3 || (k > 45 && k < 50) || k > 91 ? 0 : 4), INK); });
    P.text5(code.digits.slice(0, 1), 147, 74, INK); P.text5(code.digits.slice(1, 7), 160, 74, INK); P.text5(code.digits.slice(7), 207, 74, INK);
    // handling marks: this way up, fragile, keep dry
    const mark = (x, rows) => { P.frame(x, 8, x + 30, 42, INK); P.sprite(rows, { '#': INK }, x + 4, 38); };
    mark(142, ['..#......#..', '.###....###.', '#####..#####', '..#......#..', '..#......#..', '..#......#..', '..#......#..', '............', '############']);
    mark(178, ['.########.', '.#......#.', '.#..##..#.', '..#.##.#..', '...####...', '....##....', '....##....', '....##....', '..######..']);
    mark(214, ['....##....', '..######..', '.########.', '##########', '....##....', '....##....', '....##....', '.#..##....', '..###.....']);
    P.text5('MADE IN JAPAN', 256, 10 + 7, INK, { align: 'right' });
    kana(P, '発売元 ガチャガレージ', 10, 40, INK); P.text5('KOTOBUKI-CHO 3-8  TEL 0120-55-0199', 10, 18, INK);
    // scuffed corners
    for (const [i, j] of [[2, 6], [P.W - 9, 5], [3, P.H - 12]]) { P.box(i, j, i + 6, j + 4, K[3]); P.px(i + 1, j + 1, K[4]); }
  }
  // ---- a short side: this side up, the mark
  {
    const P = V.S;
    board(P);
    P.box(0, 0, P.W, 3, K[1]);
    P.box(0, 96, P.W, 112, ac); P.hline(0, P.W - 1, 95, mix(ac, 0x000000, 0.35));
    for (const x of [44, 132]) P.sprite(['....##....', '...####...', '..######..', '.########.', '##########', '...####...', '...####...', '...####...', '...####...', '...####...'], { '#': INK }, x, 84, 2);
    kana(P, '天地無用', P.W / 2, 56, INK, { align: 'center' });
    P.ring(P.W / 2, 26, 11, 13, INK); P.text5('GG', P.W / 2, 30, INK, { align: 'center' });
    kana(P, 'こわれもの', P.W / 2, 136, INK, { align: 'center' });
  }
  // ---- flaps: the long ones meet in the middle (開封口 along the seam), the short ones lie under them
  {
    const P = V.TL;
    board(P);
    P.box(0, 0, P.W, 5, ac); // the stripe along the free edge
    kana(P, '開封口', P.W / 2, 34, INK, { align: 'center' }); P.text5('OPEN HERE', P.W / 2, 44, INK, { align: 'center' });
    for (let i = 20; i < P.W - 20; i += 16) P.hline(i, i + 8, 10, INK); // the cut line
    kana(P, '取扱注意', 12, 92, INK); P.text5('HANDLE WITH CARE', P.W - 10, 86, INK, { align: 'right' });
    board(V.TS, true);
  }
  // ---- tape: brown paper tape with the maker's mark repeating
  {
    const P = V.TAPE, TP = ramp(0xb98952, 0.7);
    A.ink(ROUGH.tarp);
    P.fill(TP[2]); P.box(0, P.H - 3, P.W, P.H, TP[3]); P.box(0, 0, P.W, 2, TP[1]);
    for (let i = 14; i < P.W; i += 70) { P.ring(i + 8, 25, 8, 10, TP[0]); P.text5('GG', i + 8, 29, TP[0], { align: 'center' }); P.text5('GACHA', i + 24, 29, TP[0]); }
    for (let i = 4; i < P.W; i += 37) P.vline(i, 6, 12 + (i % 5), TP[3]); // wrinkles
    A.ink(ROUGH.fabric);
  }
  { const P = V.FLUTE; P.fill(K[1]); for (let i = 0; i < P.W; i += 4) { P.box(i, 2, i + 2, 6, K[0]); } P.hline(0, P.W - 1, 7, K[3]); P.hline(0, P.W - 1, 0, K[3]); }
  V.IN.fill(K[1]);

  // ---- geometry
  const inner = () => V.IN.st(0.5, 0.5), flute = (p, n) => V.FLUTE.st(((Math.abs(n[0]) > 0.5 ? p[2] : p[0]) * 20) % 1 * 0.9 + 0.05, 0.5);
  const sideUV = (box) => { const lg = boxMap(V.L, box), sh = boxMap(V.S, box); return (p, n) => (Math.abs(n[2]) > 0.5 ? lg(p, n) : Math.abs(n[0]) > 0.5 ? sh(p, n) : inner()); };
  const G = new Geo(1), bx = [-hw, 0, -hd, hw, h, hd];
  G.with(sideUV(bx), 0, () => G.box(...bx, { skip: ['py'] }));
  G.with(inner, 0, () => G.box(-hw + T, T, -hd + T, hw - T, h, hd - T, { inward: true, skip: ['py'] }));
  G.with(flute, 0, () => {
    G.quad([-hw, h, hd - T], [hw, h, hd - T], [hw, h, hd], [-hw, h, hd], [0, 1, 0]); G.quad([-hw, h, -hd], [hw, h, -hd], [hw, h, -hd + T], [-hw, h, -hd + T], [0, 1, 0]);
    G.quad([-hw, h, -hd], [-hw + T, h, -hd], [-hw + T, h, hd], [-hw, h, hd], [0, 1, 0]); G.quad([hw - T, h, -hd], [hw, h, -hd], [hw, h, hd], [hw - T, h, hd], [0, 1, 0]);
  });
  // flaps, hinged at the origin: the long ones reach +z, the short ones +x
  const flap = (long) => {
    const F = new Geo(1), b2 = long ? [-hw, 0, 0, hw, T, hd - 0.0005] : [0, 0, -hd + T, hw - 0.0005, T, hd - T];
    const top = boxMap(long ? V.TL : V.TS, b2);
    // the long flap's print reads from its free edge: v runs from the seam (z = hd) back to the hinge
    F.with((p, n) => (n[1] > 0.5 ? (long ? V.TL.st(Math.min(0.999, Math.max(0.001, (p[0] + hw) / w)), Math.min(0.999, Math.max(0.001, 1 - p[2] / hd))) : top(p, n)) : n[1] < -0.5 ? inner() : flute(p, n)), 0, () => F.box(...b2));
    const g = F.build(); g.clearGroups(); return g;
  };
  // tape over the seam and down both ends
  const TG = new Geo(1), ty = h + 2 * T + 0.0006;
  const tuv = (a, b2) => [V.TAPE.st(a, 0.02), V.TAPE.st(b2, 0.02), V.TAPE.st(b2, 0.98), V.TAPE.st(a, 0.98)];
  TG.quad([-hw - 0.001, ty, 0.025], [hw + 0.001, ty, 0.025], [hw + 0.001, ty, -0.025], [-hw - 0.001, ty, -0.025], [0, 1, 0], tuv(0.1, 0.9));
  for (const s of [-1, 1]) {
    TG.quad([s * (hw + 0.0008), ty, 0.025 * s], [s * (hw + 0.0008), ty, -0.025 * s], [s * (hw + 0.0008), h - 0.06, -0.025 * s], [s * (hw + 0.0008), h - 0.06, 0.025 * s], [s, 0, 0], s > 0 ? [V.TAPE.st(0.9, 0.02), V.TAPE.st(0.9, 0.98), V.TAPE.st(0.999, 0.98), V.TAPE.st(0.999, 0.02)] : [V.TAPE.st(0.1, 0.98), V.TAPE.st(0.1, 0.02), V.TAPE.st(0.001, 0.02), V.TAPE.st(0.001, 0.98)]);
    TG.quad([s * hw, ty, 0.025], [s * (hw + 0.001), ty, 0.025], [s * (hw + 0.001), ty, -0.025], [s * hw, ty, -0.025], [0, 1, 0], tuv(0.5, 0.51));
  }
  const fin = (g) => { const o = g.build(); o.clearGroups(); return o; };
  return { body: fin(G), flapL: flap(true), flapS: flap(false), tape: fin(TG) };
}
