// The title: GACHA GARAGE as chunky 3D letters, hand-painted like the toys (tools/menulogo.py renders it through the
// cards' logo pipeline, tools/logo3d.py + art/blender/logo3d/scene.py, in the game's own 'garage' theme: enamel-sign
// tin with rust chips over the lane's green corrugated shutter steel; pixel-snapped with an ink die-cut keyline) at four
// pixel grids, so it always shows at a whole-number scale. It hangs from the top of the picture on two pixel-art chains
// hooked into its top line; under GARAGE a small navy enamel plate with ガチャ・ガレージ hangs on two S-hooks.
//   loadTitle() -> Promise<{ sizes: [{ w, h, src, hooks: [[x, y], [x, y]] }] }>
//   pickTitle(meta, maxW, maxH) -> { size, s }      paintChain(len) -> art      paintKanaPlate() -> { art, hooks }
import { art, textMask, kanaMask, rng, hex, shade, INK } from './pixel.js';

const BASE = (import.meta.env?.BASE_URL || '/') + 'img/menu/';
let meta = null;
export function loadTitle() {
  if (meta) return meta;
  meta = fetch(BASE + 'title.json').then((r) => r.json()).then((m) => Promise.all(m.sizes.map((s) => new Promise((res) => {
    const im = new Image(); im.onload = im.onerror = () => res(); im.src = BASE + s.src; s.url = im.src; s.img = im;
  }))).then(() => m)).catch(() => ({ sizes: [] }));
  return meta;
}

/** The best (size, whole-number scale) for a box: as big as fits, preferring finer grids over bigger texels. */
export function pickTitle(m, maxW, maxH) {
  let best = null;
  for (const size of m.sizes) for (let s = 1; s <= 4; s++) {
    const w = size.w * s, h = size.h * s;
    if (w > maxW || h > maxH) continue;
    const score = w - 130 * (s - 1);
    if (!best || score > best.score) best = { size, s, score };
  }
  if (!best && m.sizes.length) best = { size: m.sizes[0], s: 1 };
  return best;
}

// a chain, link by link: a face-on oval (5 x 6, its hole see-through) then an edge-on link (2 wide), steel, lit left
const LINK_A = ['.###.', '#sSs#', '#S.t#', '#s.t#', '#stt#', '.###.'];
const LINK_B = ['.##.', '.#S#', '.#s#', '.#t#', '.##.'];
const STEEL = { S: hex(0xd2d6de), s: hex(0x9aa0aa), t: hex(0x5e646e) };
/** A hanging chain `len` texels long (5 wide), whole links from the top; ends on a face-on link. */
export function paintChain(len) {
  const a = art(5, Math.max(6, len));
  let y = 0, k = 0;
  while (y < len) {
    const L = k % 2 ? LINK_B : LINK_A, ox = k % 2 ? 0 : 0;
    L.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') a.px(ox + i, y + j, INK); else if (STEEL[ch]) a.px(ox + i, y + j, STEEL[ch]); }));
    y += L.length - 1; k++;
  }
  return a;
}

/** The kana plate: navy enamel, a cream pin-line, screws, chips to black iron, ガチャ・ガレージ in cream (DotGothic16 at its
 *  native 16 px, one texel a font pixel: high-res, never blown up), two S-hooks above it. -> { art, hooks: [x, x] } */
export function paintKanaPlate() {
  let kana = textMask('ガチャ・ガレージ', 'DotGothic16', 16);
  if (!kana.w) kana = kanaMask('ガチャ・ガレージ'); // (the font not there yet: the hand-pixelled 7 px set)
  const K = 1;
  const PW = kana.w * K + 18, PH = kana.h * K + 12, HOOK = 7;
  const a = art(PW, PH + HOOK), r = rng(77);
  const NAVY = hex(0x26346e), NAVY_HI = hex(0x3a4c8e), NAVY_LO = hex(0x18224e), CREAM = hex(0xf2e6c6), IRON = hex(0x2a2428), RUST = hex(0x8a4a24);
  const inB = (x, y) => { const R = 3, cx = x < R ? R : x > PW - 1 - R ? PW - 1 - R : x, cy = y < R ? R : y > PH - 1 - R ? PH - 1 - R : y; return (x - cx) ** 2 + (y - cy) ** 2 <= R * R + 0.5; };
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
    if (!inB(x, y)) continue;
    const e = !inB(x - 1, y) || !inB(x + 1, y) || !inB(x, y - 1) || !inB(x, y + 1);
    const d = Math.min(x, y, PW - 1 - x, PH - 1 - y);
    a.px(x, HOOK + y, e ? INK : d === 2 ? CREAM : y === 1 ? NAVY_HI : y >= PH - 3 ? NAVY_LO : NAVY);
  }
  // the kana: a dark under-shade, then cream (a sign-writer's flat letter with a drop)
  const kx = 9, ky = HOOK + 6;
  for (let j = 0; j < kana.h; j++) for (let i = 0; i < kana.w; i++) if (kana.at(i, j)) for (let v = 0; v < K; v++) for (let u = 0; u < K; u++) a.px(kx + i * K + u + 1, ky + j * K + v + 1, NAVY_LO);
  for (let j = 0; j < kana.h; j++) for (let i = 0; i < kana.w; i++) if (kana.at(i, j)) for (let v = 0; v < K; v++) for (let u = 0; u < K; u++) a.px(kx + i * K + u, ky + j * K + v, (u + v) === 0 && r() < 0.4 ? hex(0xfffaea) : CREAM);
  // chips at the rim, rust bleeding from one
  for (const [u, v] of [[0.04, 0.5], [0.5, 0.98], [0.93, 0.1], [0.97, 0.8]]) {
    const x = Math.round(u * (PW - 1)), y = Math.round(v * (PH - 1));
    for (let k = 0; k < 3; k++) { const px = Math.max(1, Math.min(PW - 2, x + k - 1)), py = Math.max(1, Math.min(PH - 2, y + (k % 2))); if (inB(px, py)) a.px(px, HOOK + py, k ? IRON : RUST); }
  }
  // screws and the S-hooks (steel wire bent twice)
  const screw = (x, y) => { a.px(x, y, hex(0xd2d6de)); a.px(x + 1, y, hex(0x9aa0aa)); a.px(x, y + 1, hex(0x9aa0aa)); a.px(x + 1, y + 1, INK); };
  screw(3, HOOK + PH / 2 - 1 | 0); screw(PW - 5, HOOK + PH / 2 - 1 | 0);
  const hooks = [Math.round(PW * 0.2), Math.round(PW * 0.8)];
  const S = ['.##.', '#..#', '...#', '..#.', '.#..', '#...', '#..#', '.##.'];
  for (const hx of hooks) S.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') { a.px(hx - 2 + i, j - 1, j < 3 ? hex(0x9aa0aa) : INK); } }));
  for (const hx of hooks) { a.px(hx - 1, HOOK, shade(hex(0x9aa0aa), 0.8)); a.px(hx, HOOK, INK); }
  return { art: a, hooks, hookH: HOOK };
}
