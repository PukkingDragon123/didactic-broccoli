// The four capsule-toy machines, low-poly with one painted atlas each, after the real machines of four eras:
//   retro     a 1970s countertop coin machine ("Cosmos-style"): a sheet-steel box in red enamel with a cream front,
//             a framed glass front, a slanted header sign, a chrome butterfly knob; chipped and rusty, on a fruit crate
//   standard  a 1990s single-crank floor machine: rounded moulded plastic, a clear case, a big dial, on its pedestal
//   deluxe    a two-tier station: the unit you play racked over a sister unit in a steel frame, black and gold
//   royal     the premium machine: pearl and gold, a wide case under an arched marquee, on a panelled cabinet
// Every machine has the parts of the real thing: the body with its panel seams and screws, the clear case with the
// display-card holder, the coin mechanism (slot, reject button, the coin-return cup), the ratchet crank on its dial,
// the chute with its flap and tray, the lockable lid with the sample topper, the coin box drawer, the price plate
// with its - / + buttons, feet, and print: あそびかた, コイン投入口, 返却口, とりだし口, 対象年齢, 誤飲注意, the
// 故障の際は… sticker and the maker's plate. All marks are the game's own.
// The layout (sizes, where the slot / crank / chute / drawer are) is src/world/machineModels.js layout(): the game
// logic and the first-person hands read it, so nothing here moves an interaction.
// Draw calls: one mesh for everything that never moves, one each for the lid, drawer, crank, flap, the two buttons,
// the price plate and the display card, two for clear plastic (case, lid hood).
import * as THREE from 'three';
import { Atlas, ROUGH } from '../vehicles/atlas.js';
import { Geo, triplanar, boxMap } from '../vehicles/geom.js';
import { ramp, mix } from '../vehicles/paint.js';
import { GeoS, roundBox } from './geo.js';
import { glyphMask, clearGlyphs } from './capsuleShell.js';

// the shared photo library, when it is there (the crate's boards are a photograph of sawn planks)
const kit = Object.values(import.meta.glob('../kit/photoTex.js', { eager: true }))[0] || {};
const KANA = 'あそびかたコインを入れるハンドル右にまわすカプセルとる投入口返却とりだし対象年齢才以上誤飲注意小さな部品故障の際は係員までお知らせください製造元ことぶき商会東京都寿町ガチャ回円準備中売切見本カプセルトイ';
const hx = (r, g, b) => (r << 16) | (g << 8) | b;
void hx;

// ----------------------------------------------------------------------------- styles
export const STYLES = {
  retro: { body: 0xc4483c, panel: 0xeadfc6, trim: 0xd8dcdc, accent: 0xf2c84a, ink: 0x7a1f18, dial: 0xd8dcdc, grip: 0xc4483c, knobFace: 0xe4e6e6, inner: 0xe9dcbc, bevel: 0.006, round: 0.006, wear: 1, stand: 'crate', header: 'slant', glass: 0xf4ecd0, flap: 'steel', sign: 'ガチャ', model: 'GS-70' },
  standard: { body: 0xf1efe8, panel: 0xf8f7f2, trim: 0x3f78c8, accent: 0xffd23f, ink: 0x1f3f78, dial: 0x3f78c8, grip: 0x3f78c8, knobFace: 0xf6f4ee, inner: 0xdfe8f4, bevel: 0.022, round: 0.034, wear: 0.25, stand: 'pedestal', header: 'band', glass: 0xeef6ff, flap: 'smoke', sign: 'カプセルトイ', model: 'GS-90' },
  deluxe: { body: 0x2c2b30, panel: 0x38363c, trim: 0xd8b04a, accent: 0xd8b04a, ink: 0xf0d890, dial: 0x1e1d21, grip: 0xd8b04a, knobFace: 0x2a282c, inner: 0x34323a, bevel: 0.012, round: 0.014, wear: 0, stand: 'twotier', header: 'board', glass: 0xf2f6ff, flap: 'smoke', sign: 'ガチャ', model: 'GS-500W', dark: true },
  royal: { body: 0xf6eef3, panel: 0xfffaf6, trim: 0xd24fa8, accent: 0xe2bc58, ink: 0x8a2a70, dial: 0xd24fa8, grip: 0xd24fa8, knobFace: 0xfaf4f0, inner: 0xfbe6f2, bevel: 0.02, round: 0.03, wear: 0, stand: 'cabinet', header: 'arch', glass: 0xfff6fc, flap: 'smoke', sign: 'ガチャ', model: 'GS-1000R', crown: true },
};
const STEEL = 0xb9bfc4, DARK = 0x1c1b20, RUBBER = 0x26262a;
const CHROME = [0x596068, 0x9aa3ab, 0xd3dade, 0xf6fafa]; // painted chrome: shade, mid, light, glint

// ----------------------------------------------------------------------------- painting helpers
function kana(V, str, i, j, c, o = {}) {
  const size = o.size || 16, m = glyphMask(str, size), x0 = o.align === 'center' ? i - (m.w >> 1) : o.align === 'right' ? i - m.w : i;
  if (o.outline !== undefined) for (const [x, y] of m) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) V.px(x0 + x + dx, j - y + dy, o.outline);
  for (const [x, y] of m) V.px(x0 + x, j - y, c);
  return m.w;
}
/** A cross-head screw, 7 px. */
function screw(V, i, j, R) {
  V.disc(i + 0.5, j - 0.5, 4.2, R[0]); V.disc(i + 0.5, j + 0.5, 3.4, R[2]); V.disc(i, j + 1, 2.2, R[3]);
  V.hline(i - 2, i + 2, j, R[0]); V.vline(i, j - 2, j + 2, R[0]);
}
/** A sticker's paper: a fill with a 1 px darker edge and clipped corners. */
function paper(V, c, edge) { V.box(0, 0, V.W, V.H, c); V.frame(0, 0, V.W, V.H, edge); for (const [i, j] of [[0, 0], [V.W - 1, 0], [0, V.H - 1], [V.W - 1, V.H - 1]]) V.px(i, j, 0, 0); }
/** Painted chrome on a patch: bands top to bottom. */
function chromeFill(V, i0, j0, i1, j1) {
  const h = j1 - j0;
  V.box(i0, j0, i1, j1, (i, j) => { const t = (j - j0) / h; return t > 0.82 ? CHROME[2] : t > 0.55 ? CHROME[3] : t > 0.42 ? CHROME[0] : t > 0.2 ? CHROME[1] : CHROME[2]; });
}

const built = new Map();
/**
 * The shared parts of a machine type: geometry and materials. spec: MACHINE_SPECS[type], L: layout(spec).
 * Returns { A, mats: { body, glass }, geo: { body, glass, lid, hood, drawer, handle, flap, btnMinus, btnPlus, key } }
 */
export function machineParts(type, spec, L) {
  if (built.has(type)) return built.get(type);
  const st = STYLES[type];
  const out = { st, mats: null, geo: null, A: null };
  const make = () => {
    // (the shelves fit 1024 x 1024 for the four machines; a taller sheet is the fallback if a spec ever outgrows it)
    for (const h of [1024, 2048]) {
      const A = new Atlas(1024, h);
      try { return { A, G: buildGeometry(type, spec, L, st, A) }; } catch (e) { if (h === 2048 || !/atlas full/.test(e.message)) throw e; }
    }
    return null;
  };
  const { A, G } = make();
  const map = A.texture(), roughnessMap = A.roughTexture();
  map.anisotropy = 8;
  const body = new THREE.MeshStandardMaterial({ map, roughnessMap, roughness: 1, metalness: 0, envMapIntensity: 0.7, alphaTest: 0.5 });
  body.name = 'machine-body';
  const glass = new THREE.MeshStandardMaterial({ map, roughness: 0.3, metalness: 0, transparent: true, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 0.8 });
  glass.name = 'machine-glass';
  const wood = G.crate ? kit.photoMat('wood_planks', { repeat: kit.photoRepeat('wood_planks', 1, 1), roughness: 0.9 }) : null;
  out.A = A; out.mats = { body, glass, wood }; out.geo = G;
  built.set(type, out);
  // the print needs the kana font: painted again once it has loaded (the layout is the same, only pixels change)
  try {
    if (!document.fonts?.check?.('16px "DotGothic16"', KANA)) document.fonts.load('16px "DotGothic16"', KANA).then(() => { clearGlyphs(); const again = make(); map.image = again.A.canvas(); map.needsUpdate = true; }, () => {});
  } catch { /* no font loading */ }
  return out;
}

function buildGeometry(type, spec, L, st, A) {
  const { w, d, y0, lowH, capH } = spec, caseH = L.caseH, hw = w / 2, hd = d / 2, yL = y0 + lowH, yC = yL + caseH;
  const B = ramp(st.body), PN = ramp(st.panel), TR = ramp(st.trim), AC = ramp(st.accent);
  const worn = st.wear > 0.5, rnd = (() => { let a = type.length * 977; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; })();
  const sw = (c, r = ROUGH.plastic) => A.swatch(c, r);
  const O = L.outlet, CB = L.coinBox, S = L.slot, HN = L.handle, T = L.tray, D = L.dome;
  const b = st.bevel;
  const PPM = 900;
  // ------------------------------------------------------------------ views
  // (allocated tallest first: the atlas packs in shelves)
  const V = {};
  V.F = A.view('F', { u: (p) => p[0], v: (p) => p[1], u0: -hw, u1: hw, v0: y0, v1: yL, ppm: PPM });
  V.SF = A.view('SF', { u: (p) => p[0], v: (p) => p[1], u0: -hw - 0.06, u1: hw + 0.06, v0: 0, v1: y0, ppm: 520 });
  V.DIAL = A.patch('DIAL', 232, 232);
  V.SR = A.view('SR', { u: (p) => -p[2], v: (p) => p[1], u0: -hd, u1: hd, v0: y0, v1: yL, ppm: 560 });
  V.SL = A.view('SL', { u: (p) => p[2], v: (p) => p[1], u0: -hd, u1: hd, v0: y0, v1: yL, ppm: 560 });
  V.SS = A.view('SS', { u: (p) => p[2], v: (p) => p[1], u0: -hd - 0.06, u1: hd + 0.06, v0: 0, v1: y0, ppm: 400 });
  V.W = A.view('W', { u: (p) => p[0], v: (p) => p[1], u0: -hw, u1: hw, v0: yL, v1: yC, ppm: 420 });
  V.KNOB = A.patch('KNOB', 150, 150);
  V.LF = A.view('LF', { u: (p) => p[0], v: (p) => p[1], u0: -hw - 0.008, u1: hw + 0.008, v0: -0.03, v1: capH + 0.09, ppm: PPM });
  V.GL = A.patch('GL', 160, 150); V.COIN = A.patch('COIN', 96, 124); V.INSTR = A.patch('INSTR', 184, 112); V.CLOSED = A.patch('CLOSED', 120, 84);
  V.SIGN = A.patch('SIGN', 220, 64); V.WOOD = A.patch('WOOD', 128, 64); V.PRICE = A.patch('PRICE', 64, 64); V.CHOKE = A.patch('CHOKE', 84, 60); V.FLAP = A.patch('FLAP', 72, 60); V.HOOD = A.patch('HOOD', 72, 56); V.MAKER = A.patch('MAKER', 188, 46);
  V.FAIL = A.patch('FAIL', 204, 42); V.AGE = A.patch('AGE', 140, 22); V.SLOT = A.patch('SLOT', 104, 22); V.RET = A.patch('RET', 56, 22); V.OUT = A.patch('OUT', 90, 22);
  paintAll(type, spec, L, st, A, V, { B, PN, TR, AC, worn, rnd });

  // ------------------------------------------------------------------ geometry
  const G = new GeoS(1), GL = new GeoS(1);
  const body2 = sw(B[1]), steel = sw(STEEL, ROUGH.metal), dark = sw(DARK, ROUGH.matte), rubber = sw(RUBBER, ROUGH.rubber);
  const chromeUV = (lvl = 2) => sw(CHROME[lvl], ROUGH.chrome), trimUV = sw(TR[2]), trimD = sw(TR[1]), panelUV = sw(PN[2]), accUV = sw(AC[2]);
  const ext = triplanar({ pz: V.F, px: V.SR, nx: V.SL, py: sw(B[3]), ny: dark, nz: body2 });
  const rectH = (r, m = 0) => [[r.x0 - m, r.y0 - m], [r.x1 + m, r.y0 - m], [r.x1 + m, r.y1 + m], [r.x0 - m, r.y1 + m]];
  /** A sticker / label: a quad a hair proud of a +z face, showing a whole patch. */
  const label = (Gx, patch, cx, cy, wm, z, hm = wm * patch.H / patch.W) => Gx.quad([cx - wm / 2, cy - hm / 2, z], [cx + wm / 2, cy - hm / 2, z], [cx + wm / 2, cy + hm / 2, z], [cx - wm / 2, cy + hm / 2, z], [0, 0, 1], [patch.st(0.002, 0.002), patch.st(0.998, 0.002), patch.st(0.998, 0.998), patch.st(0.002, 0.998)]);
  /** The same on a +x / -x face. */
  const labelSide = (Gx, patch, sx, cz, cy, wm, x, hm = wm * patch.H / patch.W) => Gx.quad([x, cy - hm / 2, cz + sx * wm / 2], [x, cy - hm / 2, cz - sx * wm / 2], [x, cy + hm / 2, cz - sx * wm / 2], [x, cy + hm / 2, cz + sx * wm / 2], [sx, 0, 0], [patch.st(0.002, 0.002), patch.st(0.998, 0.002), patch.st(0.998, 0.998), patch.st(0.002, 0.998)]);
  /** A raised frame round a rectangle on the front (four chamfered bars). */
  const frame = (Gx, r, t, z0, z1, uv, bev = 0.003) => Gx.with(uv, 0, () => {
    Gx.box(r.x0 - t, r.y1, z0, r.x1 + t, r.y1 + t, z1, { bevel: bev }); Gx.box(r.x0 - t, r.y0 - t, z0, r.x1 + t, r.y0, z1, { bevel: bev });
    Gx.box(r.x0 - t, r.y0, z0, r.x0, r.y1, z1, { bevel: bev }); Gx.box(r.x1, r.y0, z0, r.x1 + t, r.y1, z1, { bevel: bev });
  });
  /** Something round on the front, its axis along +z: profile [[radius, height]], painted through a polar patch or a swatch. */
  const turned = (Gx, cx, cy, cz, prof, segs, uv, patch = null, R = 1) => {
    const g2 = new GeoS(1);
    g2.push(new THREE.Matrix4().makeTranslation(cx, cy, cz).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)));
    g2.revolve(prof.map((p) => [p[0], p[1], 1]), segs, { uv: patch ? (k, t, s, p) => patch.st(Math.min(0.995, Math.max(0.005, 0.5 + p[0] / (2 * R))), Math.min(0.995, Math.max(0.005, 0.5 - p[2] / (2 * R)))) : uv });
    Gx.add(g2);
  };

  // ---- the lower unit: a chamfered shell, its front cut for the chute and the coin box bay
  G.with(ext, 0, () => {
    // (the bevel stops short of the coin box bay, which runs close to the corner)
    const bl = Math.min(st.round, 0.016), ch = 0.005;
    roundBox(G, -hw, y0, -hd, hw, yL, hd, bl, ext, { open: true, ch });
    G.polyHoles([[-hw + bl, y0 + ch], [hw - bl, y0 + ch], [hw - bl, yL - ch], [-hw + bl, yL - ch]], [rectH(O), rectH(CB)], (a, c) => [a, c, hd], [0, 0, 1]);
  });
  G.with(dark, 0, () => {
    G.box(O.x0, O.y0, hd - 0.15, O.x1, O.y1, hd, { inward: true, skip: ['pz'] });
    G.box(CB.x0, CB.y0, hd - CB.depth - 0.012, CB.x1, CB.y1, hd, { inward: true, skip: ['pz'] });
  });
  G.with(sw(mix(STEEL, DARK, 0.35), ROUGH.metal), 0, () => G.quad([O.x0, O.y0 + 0.052, hd - 0.15], [O.x1, O.y0 + 0.052, hd - 0.15], [O.x1, O.y0 + 0.002, hd - 0.004], [O.x0, O.y0 + 0.002, hd - 0.004], [0, 1, 0.2]));
  frame(G, O, 0.009, hd - 0.002, hd + 0.007, type === 'deluxe' || type === 'royal' ? accUV : chromeUV(2));
  frame(G, CB, 0.004, hd - 0.002, hd + 0.003, sw(mix(st.body, DARK, 0.45)), 0.0015);
  // the trim band round the top of the unit (the case sits in it)
  roundBox(G, -hw - 0.006, yL - 0.022, -hd - 0.006, hw + 0.006, yL + 0.006, hd + 0.006, Math.min(st.round, 0.016) + 0.006, triplanar({ pz: trimUV, px: trimUV, nx: trimUV, nz: trimD, py: sw(TR[3]), ny: trimD }), { ch: 0.005 });
  /** A screw you can see the head of: a domed head with its slot, standing off a +z face. */
  const screw3 = (Gx, x, y, z, rr = 0.0042, turn = 0.6) => {
    turned(Gx, x, y, z, [[rr, 0], [rr, 0.0005], [rr * 0.72, 0.0015], [0, 0.0019]], 12, chromeUV(2));
    Gx.push(new THREE.Matrix4().makeTranslation(x, y, z).multiply(new THREE.Matrix4().makeRotationZ(turn)));
    Gx.with(sw(CHROME[0], ROUGH.chrome), 0, () => { Gx.box(-rr * 0.7, -rr * 0.13, 0.0017, rr * 0.7, rr * 0.13, 0.002); Gx.box(-rr * 0.13, -rr * 0.7, 0.0017, rr * 0.13, rr * 0.7, 0.002); });
    Gx.pop();
  };
  for (const [sx, sy, tn] of [[-hw + 0.024, y0 + 0.022, 0.3], [hw - 0.025, y0 + 0.022, 1.1], [-hw + 0.024, yL - 0.045, 0.8], [hw - 0.025, yL - 0.045, 0.1]]) screw3(G, sx, sy, hd, 0.0045, tn);
  // ---- the dial: a bezel and the printed ratchet ring the crank sits in
  const kn = spec.dial.knob, R = spec.dial.ring;
  turned(G, HN.x, HN.y, hd, [[R + 0.02, 0], [R + 0.01, 0.0035], [R + 0.006, 0.0052], [R + 0.003, 0.0072], [R, 0.008], [kn + 0.009, 0.008], [kn + 0.007, 0.0072], [kn + 0.004, 0.003], [kn + 0.004, 0]], 56, null, V.DIAL, R + 0.006);
  // ---- the coin mechanism: its plate (slot, reject button), the return cup under the price plate
  const cm = { x0: S.x - 0.058, x1: S.x + 0.03, y0: S.y - 0.047, y1: S.y + 0.05 };
  G.with(boxMap(V.COIN, [cm.x0, cm.y0, hd, cm.x1, cm.y1, hd + 0.008]), 0, () => G.box(cm.x0, cm.y0, hd - 0.002, cm.x1, cm.y1, hd + 0.008, { bevel: 0.004, skip: ['nz'] }));
  G.with(chromeUV(3), 0, () => G.box(S.x - 0.006, S.y - 0.022, hd + 0.008, S.x + 0.006, S.y + 0.022, hd + 0.0115, { bevel: 0.002, skip: ['nz'] })); // the slot's raised lips
  G.with(dark, 0, () => G.box(S.x - 0.0022, S.y - 0.017, hd + 0.0116, S.x + 0.0022, S.y + 0.017, hd + 0.0118));
  turned(G, S.x - 0.036, S.y - 0.016, hd + 0.008, [[0.0125, 0], [0.0125, 0.003], [0.0095, 0.0045], [0.0095, 0.009], [0.0088, 0.0101], [0.007, 0.0108], [0, 0.0111]], 24, sw(0xc8352e)); // the reject button
  turned(G, S.x - 0.036, S.y - 0.016, hd + 0.008, [[0.0155, 0], [0.0155, 0.002], [0.0135, 0.0032], [0.0125, 0.0032]], 24, chromeUV(3)); // its collar
  for (const [sx, sy, tn] of [[cm.x0 + 0.006, cm.y0 + 0.006, 0.2], [cm.x1 - 0.006, cm.y0 + 0.006, 1.3], [cm.x0 + 0.006, cm.y1 - 0.006, 0.7], [cm.x1 - 0.006, cm.y1 - 0.006, 0]]) screw3(G, sx, sy, hd + 0.008, 0.003, tn);
  // price plate bezel, the buttons' plate
  const PL = L.plate;
  frame(G, { x0: PL.x - PL.w / 2, x1: PL.x + PL.w / 2, y0: PL.y - PL.h / 2, y1: PL.y + PL.h / 2 }, 0.004, hd - 0.002, hd + 0.006, sw(st.dark ? 0x0e0d10 : 0x2a2a30), 0.002);
  G.with(sw(st.dark ? 0x18171b : 0x34343a), 0, () => G.box(PL.x - 0.036, L.buttons.y - 0.013, hd - 0.002, PL.x + 0.036, L.buttons.y + 0.013, hd + 0.0015, { bevel: 0.001, skip: ['nz'] }));
  // the coin-return cup: a little pocket with a chrome lip
  const rc = { x0: PL.x - 0.021, x1: PL.x + 0.021, y0: L.buttons.y - 0.056, y1: L.buttons.y - 0.026 };
  if (rc.y0 > CB.y1 + 0.006) {
    frame(G, rc, 0.004, hd - 0.002, hd + 0.005, chromeUV(2), 0.002);
    G.with(dark, 0, () => G.quad([rc.x0, rc.y0, hd + 0.0005], [rc.x1, rc.y0, hd + 0.0005], [rc.x1, rc.y1, hd + 0.0005], [rc.x0, rc.y1, hd + 0.0005], [0, 0, 1]));
    G.with(chromeUV(1), 0, () => G.box(rc.x0, rc.y0, hd, rc.x1, rc.y0 + 0.008, hd + 0.009, { bevel: 0.003 }));
    label(G, V.RET, PL.x, rc.y1 + 0.011, 0.026, hd + 0.0012);
  }
  // ---- print on the front
  label(G, V.SLOT, Math.min(hw - 0.028, S.x - 0.012), cm.y1 + 0.0105, 0.05, hd + 0.0012);
  label(G, V.OUT, 0, O.y1 + 0.02, 0.045, hd + 0.0012);
  const ix = -hw + 0.012 + 0.036, freeL = HN.x - R - 0.008 - (-hw + 0.012);
  if (freeL > 0.06) label(G, V.INSTR, -hw + 0.014 + Math.min(0.072, freeL) / 2, yL - 0.07, Math.min(0.072, freeL), hd + 0.0012);
  else label(G, V.INSTR, ix, O.y1 + 0.075, 0.066, hd + 0.0012);
  label(G, V.AGE, -hw + 0.048, y0 + 0.02, 0.056, hd + 0.0012);
  label(G, V.FAIL, (O.x1 + hw) / 2 - 0.002, y0 + 0.011, Math.min(0.074, hw - O.x1 - 0.01), hd + 0.0012);
  label(G, V.CHOKE, -hw + 0.036, O.y1 + 0.03 - (freeL > 0.06 ? 0 : 0.05), 0.034, hd + 0.0012);
  if (type === 'retro') label(G, V.PRICE, HN.x + R * 0.2, HN.y + R + 0.03, 0.044, hd + 0.0012);
  labelSide(G, V.MAKER, 1, 0.02, yL - 0.06, 0.09, hw + 0.0012);
  labelSide(G, V.SIGN, -1, 0, y0 + lowH * 0.56, Math.min(0.2, d - 0.08), -hw - 0.0012);
  // ---- the tray under the chute: a floor, two cheeks, a lip
  const trayUV = st.dark ? sw(0x38363a, ROUGH.metal) : steel;
  G.with(trayUV, 0, () => {
    G.box(T.x0 - 0.006, T.y - 0.012, hd - 0.004, T.x1 + 0.006, T.y, T.z1 + 0.004, { bevel: 0.004 });
    G.box(T.x0 - 0.006, T.y, hd - 0.002, T.x0, T.y + T.wall, T.z1 + 0.004, { bevel: 0.002 }); G.box(T.x1, T.y, hd - 0.002, T.x1 + 0.006, T.y + T.wall, T.z1 + 0.004, { bevel: 0.002 });
    G.box(T.x0 - 0.006, T.y, T.z1 - 0.002, T.x1 + 0.006, T.y + T.wall * 0.78, T.z1 + 0.004, { bevel: 0.002 });
  });
  G.with(trayUV, 0, () => {
    // rolled rims along the lip and the cheeks, a flared edge in front
    G.cyl('x', [T.x0 - 0.006, T.y + T.wall * 0.78, T.z1 + 0.002], 0.004, T.x1 - T.x0 + 0.012, 10);
    for (const xx of [T.x0 - 0.003, T.x1 + 0.003]) G.cyl('z', [xx, T.y + T.wall, hd - 0.002], 0.0036, T.z1 - hd + 0.006, 10);
    G.quad([T.x0 - 0.006, T.y + T.wall * 0.5, T.z1 + 0.004], [T.x1 + 0.006, T.y + T.wall * 0.5, T.z1 + 0.004], [T.x1 + 0.006, T.y + T.wall * 0.78, T.z1 + 0.0095], [T.x0 - 0.006, T.y + T.wall * 0.78, T.z1 + 0.0095], [0, 0.4, 1]);
  });
  G.with(rubber, 0, () => G.quad([T.x0, T.y + 0.0008, hd], [T.x1, T.y + 0.0008, hd], [T.x1, T.y + 0.0008, T.z1 - 0.002], [T.x0, T.y + 0.0008, T.z1 - 0.002], [0, 1, 0]));
  // the drawer's runners in its bay
  G.with(steel, 0, () => { for (const xx of [CB.x0 + 0.002, CB.x1 - 0.005]) G.box(xx, CB.y0 + 0.001, hd - CB.depth, xx + 0.003, CB.y0 + 0.006, hd - 0.004); });

  // ---- the case: floor, back wall with its print, back posts, the display-card holder, the top rail
  G.with(V.W.map3, 0, () => G.quad([-hw + 0.006, yL, -hd + 0.012], [hw - 0.006, yL, -hd + 0.012], [hw - 0.006, yC, -hd + 0.012], [-hw + 0.006, yC, -hd + 0.012], [0, 0, 1]));
  G.with(sw(mix(st.inner, 0x000000, 0.08)), 0, () => G.quad([-hw + 0.006, yL + 0.0065, -hd + 0.012], [hw - 0.006, yL + 0.0065, -hd + 0.012], [hw - 0.006, yL + 0.0065, hd - 0.006], [-hw + 0.006, yL + 0.0065, hd - 0.006], [0, 1, 0]));
  G.with(triplanar({ pz: body2, px: sw(B[2]), nx: sw(B[2]), nz: body2, py: body2, ny: body2 }), 0, () => {
    G.box(-hw, yL, -hd, hw, yC, -hd + 0.012, { bevel: 0.004, skip: ['pz'] });
    for (const s of [-1, 1]) G.box(s > 0 ? hw - 0.018 : -hw, yL, -hd, s > 0 ? hw : -hw + 0.018, yC, -hd + 0.03, { bevel: 0.005 });
  });
  const bn = L.banner, bz = bn.z, clip = sw(mix(st.glass, 0x8a98a8, 0.25), ROUGH.glass);
  G.with(clip, 0, () => {
    // the card slides in from above between two rails; side clips hold it to the case's front
    for (const yy of [bn.y - bn.h / 2 - 0.004, bn.y + bn.h / 2]) G.box(-bn.w / 2 - 0.004, yy, bz - 0.004, bn.w / 2 + 0.004, yy + 0.004, bz + 0.004);
    for (const s of [-1, 1]) G.box(s * (bn.w / 2 + 0.002) - 0.002, bn.y - bn.h / 2, bz - 0.004, s * (bn.w / 2 + 0.002) + 0.002, bn.y + bn.h / 2, bz + 0.004);
    for (const s of [-1, 1]) G.box(s * (bn.w / 2 - 0.02) - 0.005, bn.y + bn.h / 2 + 0.004, bz - 0.002, s * (bn.w / 2 - 0.02) + 0.005, yC, bz + 0.002);
  });
  // steel-framed glass on the old machine: corner posts and a sill
  if (type === 'retro') G.with(triplanar({ pz: sw(B[2]), px: sw(B[2]), nx: sw(B[2]), nz: body2, py: body2, ny: body2 }), 0, () => {
    for (const s of [-1, 1]) G.box(s > 0 ? hw - 0.014 : -hw, yL, hd - 0.014, s > 0 ? hw : -hw + 0.014, yC, hd, { bevel: 0.003 });
    G.box(-hw, yL, hd - 0.012, hw, yL + 0.016, hd, { bevel: 0.003 }); G.box(-hw, yC - 0.014, hd - 0.012, hw, yC, hd, { bevel: 0.003 });
  });
  // ---- the clear case: both sides and the front, the front corners rounded
  {
    const rf = type === 'retro' ? 0.002 : type === 'standard' ? 0.034 : 0.02, ins = type === 'retro' ? 0.004 : 0.002, n = type === 'retro' ? 1 : 4;
    const path = [[-hw + ins, -hd + 0.012]];
    for (let k = 0; k <= n; k++) { const a = Math.PI - (k / n) * Math.PI / 2; path.push([-hw + ins + rf + Math.cos(a) * rf, hd - ins - rf + Math.sin(a) * rf]); }
    for (let k = 0; k <= n; k++) { const a = Math.PI / 2 - (k / n) * Math.PI / 2; path.push([hw - ins - rf + Math.cos(a) * rf, hd - ins - rf + Math.sin(a) * rf]); }
    path.push([hw - ins, -hd + 0.012]);
    let len = 0;
    const acc = [0];
    for (let k = 1; k < path.length; k++) { len += Math.hypot(path[k][0] - path[k - 1][0], path[k][1] - path[k - 1][1]); acc.push(len); }
    const nrm = path.map((p, k) => { const a = path[Math.max(0, k - 1)], c = path[Math.min(path.length - 1, k + 1)], dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz) || 1; return [-dz / l * -1, 0, dx / l * -1].map((v) => -v); });
    for (let k = 0; k + 1 < path.length; k++) {
      const p0 = path[k], p1 = path[k + 1], u0 = acc[k] / len, u1 = acc[k + 1] / len;
      // the front pane takes the middle of the patch (its streaks), the sides the plain edges
      GL.quadN([p0[0], yL, p0[1]], [p1[0], yL, p1[1]], [p1[0], yC, p1[1]], [p0[0], yC, p0[1]], nrm[k], nrm[k + 1], nrm[k + 1], nrm[k], V.GL.st(u0, 0.004), V.GL.st(u1, 0.004), V.GL.st(u1, 0.996), V.GL.st(u0, 0.996));
    }
  }

  // ---- stands
  const crateG = kit.photoMat && st.stand === 'crate' ? new Geo(1) : null;
  buildStand(type, spec, L, st, A, V, G, { crate: crateG, sw, steel, dark, rubber, chromeUV, trimUV, accUV, body2, B, TR, AC, label, frame, turned });

  // ------------------------------------------------------------------ the lid (lid space: y = 0 its underside)
  const LG = new GeoS(1), HG = new GeoS(1);
  {
    const lidUV = triplanar({ pz: V.LF, px: sw(B[2]), nx: sw(B[2]), nz: body2, py: sw(B[3]), ny: body2 });
    roundBox(LG, -hw - 0.008, 0, -hd - 0.008, hw + 0.008, capH, hd + 0.008, Math.max(0.008, st.round), lidUV, { ch: Math.min(0.008, st.round) });
    // the lock: a chrome barrel with its keyhole; hinge knuckles at the back
    const lk = L.lid.lockX;
    const g2 = new GeoS(1);
    g2.push(new THREE.Matrix4().makeTranslation(lk, capH / 2, hd + 0.008).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)));
    g2.revolve([[0.012, 0, 1], [0.012, 0.003, 1], [0.0105, 0.0045, 1], [0.0085, 0.0045, 1], [0.008, 0.006, 1], [0, 0.006, 1]], 24, { uv: sw(st.dark || type === 'royal' ? AC[2] : CHROME[2], ROUGH.chrome) });
    LG.add(g2);
    LG.with(dark, 0, () => LG.box(lk - 0.0012, capH / 2 - 0.0045, hd + 0.0141, lk + 0.0012, capH / 2 + 0.0045, hd + 0.0144));
    // the hinges: a barrel in three knuckles on its pin, a leaf screwed to the lid
    LG.with(sw(CHROME[1], ROUGH.chrome), 0, () => {
      for (const s of [-1, 1]) {
        const x = s * (hw * 0.62);
        for (const k of [-1, 0, 1]) LG.cyl('x', [x - 0.006 + k * 0.014, capH * 0.3, -hd - 0.0095], 0.0055, 0.012, 14);
        LG.cyl('x', [x - 0.024, capH * 0.3, -hd - 0.0095], 0.002, 0.048, 8);
        LG.box(x - 0.02, capH * 0.3, -hd - 0.0092, x + 0.02, capH * 0.86, -hd - 0.0078);
      }
    });
    // the header
    if (st.header === 'slant') {
      // a sign board leaning back on top of the lid
      LG.push(new THREE.Matrix4().makeTranslation(0, capH, hd - 0.03).multiply(new THREE.Matrix4().makeRotationX(-0.42)));
      LG.with(boxMap(V.SIGN, [-hw + 0.02, 0, -0.006, hw - 0.02, 0.07, 0]), 0, () => LG.box(-hw + 0.02, 0, -0.006, hw - 0.02, 0.07, 0, { bevel: 0.002 }));
      LG.pop();
      LG.with(steel, 0, () => { for (const s of [-1, 1]) LG.box(s * (hw - 0.05) - 0.003, capH, hd - 0.07, s * (hw - 0.05) + 0.003, capH + 0.05, hd - 0.064); });
    } else if (st.header === 'board' || st.header === 'arch') {
      // a marquee across the front edge of the lid
      const hh = st.header === 'arch' ? 0.082 : 0.062;
      LG.with(boxMap(V.SIGN, [-hw + 0.004, capH, hd - 0.012, hw - 0.004, capH + hh, hd]), 0, () => LG.box(-hw + 0.004, capH, hd - 0.012, hw - 0.004, capH + hh, hd, { bevel: 0.004 }));
      LG.with(accUV, 0, () => { LG.box(-hw, capH + hh, hd - 0.015, hw, capH + hh + 0.006, hd + 0.003, { bevel: 0.002 }); if (st.header === 'arch') LG.box(-hw * 0.55, capH + hh + 0.006, hd - 0.013, hw * 0.55, capH + hh + 0.024, hd + 0.001, { bevel: 0.008 }); });
    }
    // the sample topper: a plinth, corner posts, a top frame (the clear hood is the lid's own glass)
    const dw = D.w / 2 + 0.006, dd = D.d / 2 + 0.006, ty = capH, th = D.h + 0.014;
    roundBox(LG, -dw, ty, D.z - dd, dw, ty + 0.012, D.z + dd, 0.012, triplanar({ pz: trimUV, px: trimUV, nx: trimUV, nz: trimUV, py: sw(B[3]), ny: body2 }), { ch: 0.003 });
    LG.with(sw(B[1]), 0, () => {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) LG.box(sx * dw - (sx > 0 ? 0.005 : 0), ty + 0.012, D.z + sz * dd - (sz > 0 ? 0.005 : 0), sx * dw + (sx > 0 ? 0 : 0.005), ty + th, D.z + sz * dd + (sz > 0 ? 0 : 0.005));
      LG.box(-dw, ty + th, D.z - dd, dw, ty + th + 0.005, D.z + dd, { bevel: 0.002 });
    });
    if (st.crown) {
      // a little crown on the hood
      const cy = ty + th + 0.005;
      const c2 = new GeoS(1);
      c2.push(new THREE.Matrix4().makeTranslation(0, cy, D.z));
      c2.revolve([[0.034, 0, 1], [0.036, 0.006, 1], [0.03, 0.01, 1], [0.03, 0.026, 1], [0.024, 0.026, 1], [0.024, 0.008, 1]], 24, { uv: sw(AC[2], ROUGH.chrome) });
      LG.add(c2);
      LG.with(sw(AC[3], ROUGH.chrome), 0, () => { for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; LG.box(Math.cos(a) * 0.03 - 0.005, cy + 0.026, D.z + Math.sin(a) * 0.03 - 0.005, Math.cos(a) * 0.03 + 0.005, cy + 0.04, D.z + Math.sin(a) * 0.03 + 0.005, { bevel: 0.004 }); } });
      LG.with(sw(st.trim, ROUGH.lens), 0, () => LG.box(-0.009, cy + 0.008, D.z - 0.009, 0.009, cy + 0.03, D.z + 0.009, { bevel: 0.006 }));
    }
    // the hood's four panes
    const x0 = -D.w / 2, x1 = D.w / 2, z0 = D.z - D.d / 2, z1 = D.z + D.d / 2, yy0 = ty + 0.012, yy1 = ty + th;
    const pane = (a, c, n) => HG.quadN([a[0], yy0, a[1]], [c[0], yy0, c[1]], [c[0], yy1, c[1]], [a[0], yy1, a[1]], n, n, n, n, V.HOOD.st(0.01, 0.01), V.HOOD.st(0.99, 0.01), V.HOOD.st(0.99, 0.99), V.HOOD.st(0.01, 0.99));
    pane([x0, z1], [x1, z1], [0, 0, 1]); pane([x1, z1], [x1, z0], [1, 0, 0]); pane([x1, z0], [x0, z0], [0, 0, -1]); pane([x0, z0], [x0, z1], [-1, 0, 0]);
  }

  // ------------------------------------------------------------------ the coin box drawer (drawer space: x, y from its corner, z = 0 the front)
  const DG = new GeoS(1);
  {
    const dw = CB.x1 - CB.x0, dh = CB.y1 - CB.y0, dep = CB.depth;
    DG.with(triplanar({ pz: sw(mix(st.body, st.dark ? 0xffffff : 0x000000, 0.1)), px: body2, nx: body2, py: body2, ny: body2, nz: body2 }), 0, () => DG.box(0.0015, 0.0015, -0.004, dw - 0.0015, dh - 0.0015, 0.005, { bevel: 0.002 }));
    DG.with(steel, 0, () => {
      DG.box(0.006, 0, -dep, dw - 0.006, 0.004, -0.004);
      DG.box(0.006, 0.004, -dep, 0.009, dh * 0.6, -0.004); DG.box(dw - 0.009, 0.004, -dep, dw - 0.006, dh * 0.6, -0.004); DG.box(0.006, 0.004, -dep, dw - 0.006, dh * 0.6, -dep + 0.003);
    });
    // the lock and a finger pull
    const g2 = new GeoS(1);
    g2.push(new THREE.Matrix4().makeTranslation(dw * 0.7, dh * 0.62, 0.005).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)));
    g2.revolve([[0.008, 0, 1], [0.008, 0.003, 1], [0.006, 0.0045, 1], [0, 0.0045, 1]], 20, { uv: sw(st.dark || type === 'royal' ? AC[2] : CHROME[2], ROUGH.chrome) });
    DG.add(g2);
    DG.with(dark, 0, () => DG.box(dw * 0.7 - 0.001, dh * 0.62 - 0.0035, 0.0096, dw * 0.7 + 0.001, dh * 0.62 + 0.0035, 0.0098));
    DG.with(sw(CHROME[2], ROUGH.chrome), 0, () => DG.box(dw * 0.12, dh * 0.2, 0.005, dw * 0.5, dh * 0.3, 0.011, { bevel: 0.003 }));
  }

  // ------------------------------------------------------------------ the crank (its axis is +z through the origin)
  const HGm = new GeoS(1);
  {
    turned(HGm, 0, 0, 0, [[kn, 0], [kn, 0.007], [kn - 0.0015, 0.0095], [kn - 0.004, 0.011], [kn * 0.66, 0.011], [kn * 0.62, 0.0098], [kn * 0.58, 0.011], [0, 0.011]], 48, null, V.KNOB, kn);
    // the ratchet: twelve teeth round the rim, one for each click (the pawl rides them: see the machine's pawl)
    HGm.with(sw(CHROME[1], ROUGH.chrome), 0, () => {
      for (let k = 0; k < 12; k++) {
        const a0 = k * Math.PI / 6, a1 = a0 + 0.05, a2 = a0 + Math.PI / 6 - 0.04, P = (a, r, z) => [Math.cos(a) * r, Math.sin(a) * r, z];
        const A0 = P(a0, kn - 0.001, 0.0012), B0 = P(a1, kn + 0.0042, 0.0012), C0 = P(a2, kn - 0.001, 0.0012), A1 = P(a0, kn - 0.001, 0.006), B1 = P(a1, kn + 0.0042, 0.006), C1 = P(a2, kn - 0.001, 0.006);
        HGm.tri(A1, B1, C1, [0, 0, 1]); HGm.quad(A0, B0, B1, A1, [Math.sin(a0), -Math.cos(a0), 0]); HGm.quad(B0, C0, C1, B1, [Math.cos(a1 + 0.9), Math.sin(a1 + 0.9), 0]);
      }
    });
    const gripUV = sw(st.grip, type === 'retro' ? ROUGH.paint : ROUGH.plastic), gw = Math.max(0.011, kn * 0.24);
    if (type === 'retro') {
      // a butterfly knob: two wings on a chrome hub
      HGm.with(gripUV, 0, () => { for (const s of [-1, 1]) HGm.box(-gw * 0.8, s > 0 ? 0.004 : -kn * 0.9, 0.011, gw * 0.8, s > 0 ? kn * 0.9 : -0.004, 0.036, { bevel: 0.006 }); });
      turned(HGm, 0, 0, 0.011, [[gw * 1.25, 0], [gw * 1.25, 0.02], [gw * 1.15, 0.026], [gw * 0.8, 0.03], [0, 0.031]], 24, sw(CHROME[2], ROUGH.chrome));
    } else {
      HGm.with(gripUV, 0, () => HGm.box(-gw, -kn * 0.88, 0.011, gw, kn * 0.88, 0.04, { bevel: 0.007 }));
      HGm.with(sw(mix(st.grip, 0x000000, 0.25)), 0, () => { for (let k = -2; k <= 2; k++) if (k) HGm.box(-gw - 0.0012, k * kn * 0.2 - 0.003, 0.018, gw + 0.0012, k * kn * 0.2 + 0.003, 0.034); }); // finger ribs
      turned(HGm, 0, 0, 0.04, [[gw * 0.62, 0], [gw * 0.56, 0.002], [gw * 0.4, 0.003], [0, 0.0034]], 20, sw(type === 'standard' ? CHROME[2] : AC[2], ROUGH.chrome));
    }
    // the arrow at the top end of the bar
    HGm.with(sw(0xffd23f), 0, () => HGm.tri([-0.006, kn * 0.6, 0.0403], [0.006, kn * 0.6, 0.0403], [0, kn * 0.78, 0.0403], [0, 0, 1]));
  }
  // ------------------------------------------------------------------ the flap (hinged on its top edge at the origin)
  const FG = new GeoS(1);
  {
    const fw = O.x1 - O.x0 - 0.004, fh = O.y1 - O.y0 - 0.006;
    const uvs = [V.FLAP.st(0.01, 0.01), V.FLAP.st(0.99, 0.01), V.FLAP.st(0.99, 0.99), V.FLAP.st(0.01, 0.99)];
    FG.quad([-fw / 2, -fh, 0.001], [fw / 2, -fh, 0.001], [fw / 2, 0, 0.001], [-fw / 2, 0, 0.001], [0, 0, 1], uvs);
    FG.quad([-fw / 2, -fh, 0], [fw / 2, -fh, 0], [fw / 2, 0, 0], [-fw / 2, 0, 0], [0, 0, -1], uvs);
    FG.with(sw(CHROME[1], ROUGH.chrome), 0, () => {
      FG.cyl('x', [-fw / 2, 0, 0.001], 0.003, fw, 12);
      // the return spring coiled round the pin's end
      for (let k = 0; k < 6; k++) { FG.push(new THREE.Matrix4().makeTranslation(fw / 2 - 0.006 - k * 0.0021, 0, 0.001).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2 + 0.12))); FG.torus(0.0042, 0.0008, 12, 4); FG.pop(); }
    });
  }
  // ------------------------------------------------------------------ the price buttons, the key
  const btn = (col, plus) => {
    const g = new Geo(1);
    g.with(sw(col), 0, () => g.box(-0.0095, -0.0095, 0, 0.0095, 0.0095, 0.007, { bevel: 0.0025, skip: ['nz'] }));
    g.with(sw(0xfbf8f2), 0, () => { g.box(-0.005, -0.0012, 0.007, 0.005, 0.0012, 0.0078); if (plus) g.box(-0.0012, -0.005, 0.007, 0.0012, 0.005, 0.0078); });
    return g.build();
  };
  // the pawl that rides the crank's ratchet (pivot at the origin, its nose towards -x)
  const PG = new Geo(1);
  PG.with(sw(CHROME[2], ROUGH.chrome), 0, () => {
    PG.fan([[0.003, -0.003, 0], [0.003, 0.003, 0], [-0.004, 0.0028, 0], [-0.0115, 0.0002, 0], [-0.0115, -0.001, 0], [-0.004, -0.003, 0]].map(([x, y]) => [x, y, 0.004]), [0, 0, 1]);
    const pts = [[0.003, -0.003], [0.003, 0.003], [-0.004, 0.0028], [-0.0115, 0.0002], [-0.0115, -0.001], [-0.004, -0.003]];
    pts.forEach((p, k) => { const q = pts[(k + 1) % pts.length]; PG.quad([p[0], p[1], 0], [q[0], q[1], 0], [q[0], q[1], 0.004], [p[0], p[1], 0.004], [-(q[1] - p[1]), q[0] - p[0], 0]); });
    PG.cyl('z', [0, 0, 0], 0.0018, 0.0052, 8);
  });
  const KG = new Geo(1);
  KG.with(sw(0xd8b850, ROUGH.chrome), 0, () => { KG.torus(0.0065, 0.0016, 8, 4); KG.box(-0.0012, -0.021, -0.0008, 0.0012, -0.006, 0.0008); KG.box(0.0012, -0.019, -0.0008, 0.0036, -0.016, 0.0008); KG.box(0.0012, -0.014, -0.0008, 0.003, -0.012, 0.0008); });
  const fin = (g) => { const o = g.build(); o.clearGroups(); return o; };
  return { body: fin(G), glass: fin(GL), lid: fin(LG), hood: fin(HG), drawer: fin(DG), handle: fin(HGm), flap: fin(FG), btnMinus: btn(0xe04a44, false), btnPlus: btn(0x3fae60, true), key: fin(KG), pawl: fin(PG), knob: kn, crate: crateG ? fin(crateG) : null, flapClear: st.flap !== 'steel' };
}

// ----------------------------------------------------------------------------- stands
function buildStand(type, spec, L, st, A, V, G, K) {
  const { w, d, y0 } = spec, hw = w / 2, hd = d / 2;
  const { sw, steel, dark, rubber, chromeUV, accUV, B, label, frame, turned } = K;
  void turned;
  const SFs = triplanar({ pz: V.SF, px: V.SS, nx: V.SS, nz: sw(B[1]), py: sw(B[3]), ny: dark });
  if (st.stand === 'crate') {
    // a slatted fruit crate: corner posts, three slats a side, a boarded top
    const cw = hw + 0.1, cd = hd + 0.06, wood = boxMap(V.WOOD, [0, 0, 0, 1, 1, 1]);
    // (with the photo library the boards are their own mesh, uvs in metres with the grain along each board)
    const CG = K.crate, wuv = (x0, yy0, z0, x1, yy1, z1) => { const lx = x1 - x0, ly = yy1 - yy0, lz = z1 - z0, k = x0 * 3.1 + z0 * 1.7 + yy0 * 2.3; return (p, n) => (ly >= lx && ly >= lz ? [(Math.abs(n[0]) > 0.5 ? p[2] : p[0]) + k, p[1]] : lx >= lz ? [(Math.abs(n[1]) > 0.5 ? p[2] : p[1]) + k, p[0]] : [(Math.abs(n[1]) > 0.5 ? p[0] : p[1]) + k, p[2]]); };
    const plank = (x0, yy0, z0, x1, yy1, z1) => (CG ? CG.with(wuv(x0, yy0, z0, x1, yy1, z1), 0, () => CG.box(x0, yy0, z0, x1, yy1, z1, { bevel: 0.004 })) : G.with(boxMap(V.WOOD, [x0, yy0, z0, x1, yy1, z1]), 0, () => G.box(x0, yy0, z0, x1, yy1, z1, { bevel: 0.004 })));
    void wood;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) plank(sx * cw - (sx > 0 ? 0.03 : 0), 0, sz * cd - (sz > 0 ? 0.03 : 0), sx * cw + (sx > 0 ? 0 : 0.03), y0 - 0.016, sz * cd + (sz > 0 ? 0 : 0.03));
    const hs = (y0 - 0.016) / 3;
    for (let k = 0; k < 3; k++) {
      const ya = k * hs + 0.012, yb = (k + 1) * hs - 0.012;
      plank(-cw - 0.006, ya, cd, cw + 0.006, yb, cd + 0.012); plank(-cw - 0.006, ya, -cd - 0.012, cw + 0.006, yb, -cd);
      plank(cw, ya, -cd - 0.006, cw + 0.012, yb, cd + 0.006); plank(-cw - 0.012, ya, -cd - 0.006, -cw, yb, cd + 0.006);
    }
    for (let k = 0; k < 4; k++) { const z0 = -cd - 0.012 + k * (2 * cd + 0.024) / 4; plank(-cw - 0.012, y0 - 0.016, z0 + 0.003, cw + 0.012, y0, z0 + (2 * cd + 0.024) / 4 - 0.003); }
    G.with(dark, 0, () => G.box(-cw + 0.002, 0.004, -cd + 0.002, cw - 0.002, y0 - 0.02, cd - 0.002, { skip: ['py', 'ny'] }));
    // the stencil on the middle slat, and the machine's rubber feet on the boards
    label(G, V.CLOSED, 0, hs * 1.5, 0.2, cd + 0.0128, 2 * hs - 0.05 > 0.1 ? 0.1 : hs - 0.03);
    G.with(rubber, 0, () => { for (const sx of [-1, 1]) for (const sz of [-1, 1]) G.cyl('y', [sx * (hw - 0.04), y0 - 0.001, sz * (hd - 0.04)], 0.016, 0.004, 16); });
    return;
  }
  if (st.stand === 'pedestal') {
    // a moulded pedestal: a wide foot, a waisted column, a head the unit bolts to
    roundBox(G, -hw - 0.04, 0.012, -hd - 0.04, hw + 0.04, 0.085, hd + 0.04, 0.06, SFs, { ch: 0.014 });
    roundBox(G, -hw * 0.74, 0.085, -hd * 0.74, hw * 0.74, y0 - 0.05, hd * 0.74, 0.05, SFs, { ch: 0.006, noTop: true, noBottom: true });
    roundBox(G, -hw - 0.004, y0 - 0.055, -hd - 0.004, hw + 0.004, y0, hd + 0.004, 0.036, SFs, { ch: 0.01 });
    G.with(sw(mix(st.trim, 0x000000, 0.1)), 0, () => G.box(-hw * 0.745, 0.085, -hd * 0.745, hw * 0.745, 0.1, hd * 0.745, { bevel: 0.004 }));
    G.with(rubber, 0, () => { for (const sx of [-1, 1]) for (const sz of [-1, 1]) G.cyl('y', [sx * (hw + 0.005), 0, sz * (hd + 0.005)], 0.02, 0.012, 16); });
    return;
  }
  if (st.stand === 'twotier') {
    // the sister unit below (shuttered: 準備中), in a steel rack with levelling feet
    const fy = 0.05, ty = y0 - 0.012, uh = ty - fy, lh = uh * 0.52;
    roundBox(G, -hw, fy, -hd, hw, fy + lh, hd, st.round, SFs, { ch: 0.005 });
    G.with(triplanar({ pz: V.SF, px: sw(B[2]), nx: sw(B[2]), nz: sw(B[1]), py: sw(B[1]), ny: dark }), 0, () => { G.box(-hw, fy + lh, -hd, hw, ty, -hd + 0.012); for (const s of [-1, 1]) G.box(s > 0 ? hw - 0.014 : -hw, fy + lh, -hd, s > 0 ? hw : -hw + 0.014, ty, hd, { bevel: 0.003 }); G.box(-hw, ty - 0.02, -hd, hw, ty, hd, { bevel: 0.004 }); });
    // its window: a blind and the notice
    G.with(sw(mix(st.inner, 0xffffff, 0.06)), 0, () => G.quad([-hw + 0.014, fy + lh, hd - 0.004], [hw - 0.014, fy + lh, hd - 0.004], [hw - 0.014, ty - 0.02, hd - 0.004], [-hw + 0.014, ty - 0.02, hd - 0.004], [0, 0, 1]));
    label(G, V.CLOSED, 0, fy + lh + (ty - 0.02 - fy - lh) / 2, 0.15, hd - 0.003);
    // its dial, coin plate and chute (it is switched off: no crank on it today)
    const dy = fy + lh * 0.56, dr = spec.dial.ring * 0.8;
    turned(G, L.handle.x, dy, hd, [[dr + 0.005, 0], [dr + 0.005, 0.004], [dr, 0.007], [dr * 0.56, 0.007], [dr * 0.56, 0.02], [dr * 0.5, 0.024], [0, 0.024]], 20, null, V.DIAL, dr + 0.005);
    G.with(boxMap(V.COIN, [L.slot.x - 0.05, dy - 0.04, hd, L.slot.x + 0.026, dy + 0.045, hd + 0.007]), 0, () => G.box(L.slot.x - 0.05, dy - 0.04, hd - 0.002, L.slot.x + 0.026, dy + 0.045, hd + 0.007, { bevel: 0.004, skip: ['nz'] }));
    const o2 = { x0: L.outlet.x0, x1: L.outlet.x1, y0: fy + 0.02, y1: fy + 0.02 + (L.outlet.y1 - L.outlet.y0) * 0.8 };
    G.with(dark, 0, () => G.quad([o2.x0, o2.y0, hd + 0.0006], [o2.x1, o2.y0, hd + 0.0006], [o2.x1, o2.y1, hd + 0.0006], [o2.x0, o2.y1, hd + 0.0006], [0, 0, 1]));
    frame(G, o2, 0.008, hd - 0.002, hd + 0.006, accUV);
    // the rack: four uprights, rails, feet
    const up = sw(0x4a4c52, ROUGH.metal);
    G.with(up, 0, () => {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) G.box(sx * (hw + 0.012) - 0.009, 0.02, sz * (hd + 0.012) - 0.009, sx * (hw + 0.012) + 0.009, y0, sz * (hd + 0.012) + 0.009, { bevel: 0.002 });
      for (const yy of [fy - 0.02, ty]) { G.box(-hw - 0.02, yy, -hd - 0.02, hw + 0.02, yy + 0.012, hd + 0.02, { bevel: 0.002 }); }
    });
    G.with(rubber, 0, () => { for (const sx of [-1, 1]) for (const sz of [-1, 1]) G.cyl('y', [sx * (hw + 0.012), 0, sz * (hd + 0.012)], 0.016, 0.02, 16); });
    void steel; void chromeUV;
    return;
  }
  // the cabinet: a plinth, a panelled door, a gold kick strip, ball feet
  roundBox(G, -hw - 0.01, 0.04, -hd - 0.01, hw + 0.01, y0, hd + 0.01, 0.03, SFs, { ch: 0.008 });
  G.with(sw(mix(st.body, 0x000000, 0.5)), 0, () => G.box(-hw + 0.004, 0.012, -hd + 0.004, hw - 0.004, 0.04, hd - 0.004));
  G.with(accUV, 0, () => { G.box(-hw - 0.013, 0.04, -hd - 0.013, hw + 0.013, 0.062, hd + 0.013, { bevel: 0.006 }); G.box(-hw - 0.013, y0 - 0.02, -hd - 0.013, hw + 0.013, y0 - 0.004, hd + 0.013, { bevel: 0.005 }); });
  G.with(sw(mix(st.panel, st.trim, 0.06)), 0, () => G.box(-hw + 0.04, 0.1, hd + 0.008, hw - 0.04, y0 - 0.06, hd + 0.014, { bevel: 0.006, skip: ['nz'] }));
  label(G, V.CLOSED, 0, 0.1 + (y0 - 0.16) / 2, 0.16, hd + 0.0148);
  {
    const g2 = new GeoS(1);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { g2.push(new THREE.Matrix4().makeTranslation(sx * (hw - 0.03), 0, sz * (hd - 0.03))); g2.revolve([[0, 0, 1], [0.012, 0.001, 0], [0.02, 0.005, 0], [0.024, 0.012, 0], [0.021, 0.018, 0], [0.014, 0.021, 1]], 20, { uv: sw(st.accent, ROUGH.chrome) }); g2.pop(); }
    G.add(g2);
  }
  void rubber;
}

// ----------------------------------------------------------------------------- the paint
function paintAll(type, spec, L, st, A, V, K) {
  const { w, d, y0, lowH, capH } = spec, hw = w / 2, hd = d / 2, yL = y0 + lowH;
  const { B, PN, TR, AC, worn, rnd } = K;
  const O = L.outlet, CB = L.coinBox, S = L.slot, HN = L.handle;
  const ink = st.dark ? 0xf0d890 : 0x2a2428, white = 0xfbf8f0, red = 0xc8282c;
  // ---- the lower unit's front
  {
    const F = V.F, I = (x) => F.i(x), J = (y) => F.j(y);
    A.ink(type === 'retro' ? ROUGH.paint : ROUGH.plastic);
    F.fill(B[2]);
    // the front panel, a seam round it (a dark gap, a light lip under it)
    const px0 = I(-hw + 0.014), px1 = I(hw - 0.014), py0 = J(y0 + 0.012), py1 = J(yL - 0.034);
    F.box(px0, py0, px1, py1, PN[2]);
    F.frame(px0, py0, px1, py1, mix(st.panel, 0x1c2238, 0.45)); F.hline(px0 + 1, px1 - 2, py0 + 1, PN[3]); F.vline(px0 + 1, py0 + 1, py1 - 2, PN[3]);
    // two tones of shading by rule: lighter up top where the case's light falls, a shade above the kick
    F.box(px0 + 2, py1 - 14, px1 - 2, py1 - 1, PN[3]);
    F.box(px0 + 2, py0 + 2, px1 - 2, py0 + 12, PN[1]);
    F.box(0, 0, F.W, J(y0 + 0.012), B[1]);
    // the recess shadow round the dial and round the chute
    const cx = I(HN.x), cy = J(HN.y), R = (spec.dial.ring + 0.006) * F.ppm;
    F.ring(cx + 2, cy - 3, R - 2, R + 5, PN[1]); F.ring(cx, cy, R - 2, R + 2, mix(st.panel, 0x1c2238, 0.5));
    F.box(I(O.x0) - 12, J(O.y0) - 6, I(O.x1) + 12, J(O.y1) + 12, PN[1]); F.frame(I(O.x0) - 12, J(O.y0) - 6, I(O.x1) + 12, J(O.y1) + 12, PN[0]);
    F.box(I(CB.x0) - 5, J(CB.y0) - 4, I(CB.x1) + 5, J(CB.y1) + 5, PN[1]);
    A.ink(ROUGH.chrome);
    for (const [sx, sy] of [[px0 + 9, py0 + 9], [px1 - 10, py0 + 9], [px0 + 9, py1 - 10], [px1 - 10, py1 - 10]]) screw(F, sx, sy, [CHROME[0], CHROME[1], CHROME[2], CHROME[3]]);
    A.ink(ROUGH.matte);
    if (st.wear > 0) {
      // wear by rule: capsules scuff the panel under the chute's lip, hands polish a patch left of the dial; on the old
      // machine the enamel has chipped at the lower corners, rust creeps up from the bottom edge and from the screws,
      // a price sticker has been peeled off above the coin plate
      for (const [di, dj, len] of [[6, -8, 9], [22, -11, 6], [40, -9, 12], [61, -12, 5]]) F.hline(I(O.x0) + di, I(O.x0) + di + len, J(O.y0) + dj, PN[3]);
      if (worn) {
        for (const [ci, cj] of [[px0 + 3, py1 - 5], [px1 - 6, py0 + 22]]) { F.box(ci, cj, ci + 5, cj + 3, 0x6a6a66); F.box(ci + 1, cj + 1, ci + 6, cj + 5, 0x8a8a84); F.px(ci + 2, cj + 2, 0x4a3020); }
        const rx = I(S.x) - 26, ry = J(S.y + 0.085);
        F.box(rx, ry, rx + 40, ry + 22, mix(st.panel, 0xfff8e0, 0.5)); F.box(rx + 3, ry + 3, rx + 14, ry + 9, mix(st.panel, 0x8a7a5a, 0.3)); F.box(rx + 22, ry + 12, rx + 36, ry + 18, mix(st.panel, 0x8a7a5a, 0.25));
        // the red enamel has faded where the sun reaches the top of the unit
        F.box(0, J(yL - 0.02), F.W, F.H, B[3]);
      }
    }
  }
  // ---- sides: a mould seam, vents, a hand recess
  for (const [SV, sgn] of [[V.SR, 1], [V.SL, -1]]) {
    A.ink(type === 'retro' ? ROUGH.paint : ROUGH.plastic);
    SV.fill(B[2]);
    const J = (y) => SV.j(y), I = (z) => SV.i(z);
    SV.box(0, 0, SV.W, J(y0 + 0.012), B[1]);
    SV.frame(I(-hd + 0.02), J(y0 + 0.02), I(hd - 0.02), J(yL - 0.03), B[1]); SV.hline(I(-hd + 0.02) + 1, I(hd - 0.02) - 2, J(y0 + 0.02) + 1, B[3]);
    for (let k = 0; k < 5; k++) { SV.box(I(-0.06), J(y0 + 0.05 + k * 0.014), I(0.06), J(y0 + 0.05 + k * 0.014) + 3, mix(st.body, 0x10121c, 0.6)); SV.hline(I(-0.06), I(0.06) - 1, J(y0 + 0.05 + k * 0.014) - 1, B[3]); }
    SV.box(I(-0.045), J(yL - 0.1), I(0.045), J(yL - 0.075), mix(st.body, 0x10121c, 0.5)); SV.hline(I(-0.045), I(0.045) - 1, J(yL - 0.1) - 1, B[3]);
    A.ink(ROUGH.chrome);
    for (const [zz, yy] of [[-hd + 0.035, y0 + 0.035], [hd - 0.035, y0 + 0.035], [-hd + 0.035, yL - 0.045], [hd - 0.035, yL - 0.045]]) screw(SV, I(zz), J(yy), CHROME);
    if (worn) { A.ink(ROUGH.matte); SV.box(I(0.02), J(y0 + 0.2), I(0.1), J(y0 + 0.24), mix(st.body, 0xfff4d8, 0.4)); }
  }
  // ---- the lid's front: the header band with CAPSULE TOYS and the sign
  {
    const F = V.LF;
    A.ink(ROUGH.plastic);
    F.fill(B[2]);
    const j0 = F.j(0.006), j1 = F.j(capH - 0.006), hc = st.header === 'band' ? TR[2] : st.dark ? 0x1a191d : type === 'retro' ? AC[2] : TR[2];
    F.box(0, j0, F.W, j1, hc); F.hline(0, F.W, j1 - 1, mix(hc, 0xffffff, 0.3)); F.hline(0, F.W, j0, mix(hc, 0x000000, 0.3));
    const tc = st.dark ? st.accent : type === 'retro' ? st.ink : white, cj = Math.round((j0 + j1) / 2);
    F.text5('CAPSULE TOYS', F.i(-hw + 0.02), cj + (capH > 0.045 ? 7 : 3), tc, { s: capH > 0.045 ? 2 : 1 });
    if (capH > 0.045) kana(F, st.sign, F.i(0.02), cj + 8, tc);
  }
  // ---- the case's back wall: a printed card (stripes and stars; the pile hides most of it)
  {
    const Wv = V.W, c0 = st.inner, c1 = mix(st.inner, st.trim, st.dark ? 0.22 : 0.16);
    A.ink(ROUGH.matte);
    // a plain card: one colour, a darker band where it meets the floor, a border line, the maker's mark in a corner
    Wv.fill(c0);
    Wv.box(0, 0, Wv.W, 10, mix(c0, 0x000000, 0.18)); Wv.frame(6, 14, Wv.W - 6, Wv.H - 6, c1);
    Wv.ring(26, Wv.H - 26, 10, 12, c1); Wv.text5('GG', 26, Wv.H - 22, c1, { align: 'center' });
  }
  // ---- stands
  paintStand(type, spec, L, st, A, V, K);
  // ---- the dial ring: the turn arrows and the ratchet's twelve stops
  {
    const P = V.DIAL, c = P.W / 2, Ro = c - 1, ring = spec.dial.ring / (spec.dial.ring + 0.006) * c, rin = (spec.dial.knob + 0.007) / (spec.dial.ring + 0.006) * c;
    A.ink(ROUGH.chrome);
    P.disc(c, c, Ro, st.dark || type === 'royal' ? AC[1] : CHROME[1]); P.ring(c, c, ring - 1, Ro, (i, j) => (j - i > 0 ? (st.dark || type === 'royal' ? AC[3] : CHROME[3]) : (st.dark || type === 'royal' ? AC[1] : CHROME[1])));
    A.ink(ROUGH.plastic);
    const DC = ramp(st.dial);
    P.disc(c, c, ring - 1, DC[2]); P.ring(c, c, ring - 4, ring - 1, DC[1]); P.ring(c, c, rin, rin + 3, DC[0]);
    const mid = (ring + rin) / 2, yel = st.dark ? st.accent : 0xffd23f;
    for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; P.line(Math.round(c + Math.cos(a) * (ring - 5)), Math.round(c + Math.sin(a) * (ring - 5)), Math.round(c + Math.cos(a) * (ring - 10)), Math.round(c + Math.sin(a) * (ring - 10)), DC[4]); }
    for (let s2 = 0; s2 < 2; s2++) {
      // two arrows running clockwise (the patch's y is up: clockwise is a falling angle)
      const a0 = s2 * Math.PI + 2.6, a1 = a0 - 1.9;
      for (let a = a0; a >= a1; a -= 0.006) for (let t = -2; t <= 2; t++) P.px(Math.round(c + Math.cos(a) * (mid + t)), Math.round(c + Math.sin(a) * (mid + t)), yel);
      for (let t = 0; t < 9; t++) { const a = a1 - t * 0.02; for (let q = -(8 - t); q <= 8 - t; q++) P.px(Math.round(c + Math.cos(a) * (mid + q)), Math.round(c + Math.sin(a) * (mid + q)), yel); }
    }
    P.disc(c, c, rin, mix(st.panel, 0x1c2238, 0.55));
  }
  // ---- the crank's disc
  {
    const P = V.KNOB, c = P.W / 2, KF = ramp(st.knobFace);
    A.ink(type === 'retro' ? ROUGH.chrome : ROUGH.plastic);
    P.disc(c, c, c, KF[2]); P.ring(c, c, c - 4, c, (i, j) => (j - i > 0 ? KF[3] : KF[1]));
    P.ring(c, c, c * 0.62, c * 0.62 + 2, KF[1]); P.ring(c, c, c * 0.62 + 2, c * 0.62 + 3, KF[3]);
    for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6 + 0.26; P.disc(c + Math.cos(a) * c * 0.82, c + Math.sin(a) * c * 0.82, 3, KF[1]); P.px(Math.round(c + Math.cos(a) * c * 0.82), Math.round(c + Math.sin(a) * c * 0.82) - 2, KF[4]); }
    if (st.wear > 0.5) for (const [x0, y0, x1, y1] of [[-28, 36, -19, 45], [6, 30, 17, 37], [30, -38, 36, -27]]) P.line(Math.round(c + x0), Math.round(c + y0), Math.round(c + x1), Math.round(c + y1), KF[0]);
  }
  // ---- clear plastic: the case (edges, two hard streaks on the front pane), the hood, the flap
  {
    const P = V.GL, tint = mix(st.glass, 0x9ab0c8, 0.3);
    A.ink(ROUGH.glass);
    P.box(0, 0, P.W, P.H, tint, worn ? 34 : 20);
    P.box(0, 0, P.W, 3, mix(tint, 0x304058, 0.5), 150); P.box(0, P.H - 3, P.W, P.H, 0xffffff, 150);
    // the front pane is the middle half of the strip
    const x0 = Math.round(P.W * 0.3), x1 = Math.round(P.W * 0.7);
    for (let j = 6; j < P.H - 6; j++) { const i = x0 + 8 + Math.round((j - 6) * 0.42); for (let q = 0; q < 7; q++) if (i + q < x1) P.px(i + q, j, 0xffffff, 96); for (let q = 12; q < 15; q++) if (i + q < x1) P.px(i + q, j, 0xffffff, 80); }
    if (worn) { for (let k = 0; k < 6; k++) P.line(x0 + 10 + k * 9, 20 + (k * 37) % 60, x0 + 16 + k * 9, 30 + (k * 37) % 60, 0xffffff, 0); P.box(x1 - 26, P.H - 44, x1 - 6, P.H - 30, 0xf4ecd0, 110); }
    const Hh = V.HOOD;
    Hh.box(0, 0, Hh.W, Hh.H, tint, 24); Hh.frame(0, 0, Hh.W, Hh.H, 0xffffff, 0); Hh.box(0, Hh.H - 2, Hh.W, Hh.H, 0xffffff, 150); Hh.box(0, 0, 2, Hh.H, 0xffffff, 110); Hh.box(Hh.W - 2, 0, Hh.W, Hh.H, mix(tint, 0x304058, 0.5), 120);
    for (let j = 5; j < Hh.H - 5; j++) for (let q = 0; q < 4; q++) Hh.px(10 + Math.round(j * 0.4) + q, j, 0xffffff, 90);
    const Fl = V.FLAP;
    if (st.flap === 'steel') { A.ink(ROUGH.chrome); chromeFill(Fl, 0, 0, Fl.W, Fl.H); Fl.frame(0, 0, Fl.W, Fl.H, CHROME[0]); Fl.text5('PUSH', Fl.W / 2, Fl.H / 2 + 4, CHROME[0], { align: 'center' }); }
    else { Fl.box(0, 0, Fl.W, Fl.H, 0x2c3440, 190); Fl.box(0, Fl.H - 3, Fl.W, Fl.H, 0x8a98a8, 230); for (let j = 4; j < Fl.H - 6; j++) for (let q = 0; q < 5; q++) Fl.px(12 + Math.round(j * 0.5) + q, j, 0x9fb0c4, 200); Fl.text5('PUSH', Fl.W / 2, 16, 0xc8d4e0, { align: 'center' }); }
  }
  // ---- print: stickers and labels (2.5 px to the millimetre)
  A.ink(ROUGH.matte);
  {
    const P = V.INSTR;
    paper(P, white, 0x8a8a84);
    P.box(1, P.H - 21, P.W - 1, P.H - 1, st.dark ? 0x2a282c : st.trim);
    kana(P, 'あそびかた', P.W / 2, P.H - 3, st.dark ? st.accent : white, { align: 'center' });
    ['コインを入れる', 'ハンドルを右にまわす', 'カプセルをとる'].forEach((t, k) => {
      const j = P.H - 27 - k * 28;
      P.disc(11, j - 8, 8, red); P.text5(String(k + 1), 9, j - 5, white);
      kana(P, t, 23, j, 0x2a2428);
      if (k < 2) P.sprite(['#####', '.###.', '..#..'], { '#': 0xb0b0a8 }, 9, j - 19);
    });
  }
  {
    const P = V.FAIL;
    paper(P, 0xfff2b0, 0xb89020);
    kana(P, '故障の際は', 4, P.H - 3, red); kana(P, '係員までお知らせください', P.W / 2, P.H - 22, 0x2a2428, { align: 'center' });
    P.text5('TEL 0120-55-0199', P.W - 4, P.H - 6, 0x6a5a20, { align: 'right' });
  }
  { const P = V.AGE; paper(P, 0xfff2b0, 0xb89020); kana(P, '対象年齢15才以上', P.W / 2, P.H - 3, 0x2a2428, { align: 'center' }); }
  {
    const P = V.CHOKE;
    paper(P, white, red);
    for (let j = 0; j < 26; j++) { const hwid = Math.round((26 - j) * 0.58); P.hline(21 - hwid, 21 + hwid, 28 + j, 0xffd23f); }
    P.outline([[6, 28], [36, 28], [21, 54]], 0x2a2428);
    P.vline(21, 37, 47, 0x2a2428); P.vline(20, 37, 47, 0x2a2428); P.box(20, 31, 22, 34, 0x2a2428);
    kana(P, '誤飲', 44, 56, red); kana(P, '注意', 44, 38, red);
    kana(P, '小さな部品', 2, 19, 0x2a2428);
  }
  {
    const P = V.MAKER;
    A.ink(ROUGH.chrome);
    chromeFill(P, 0, 0, P.W, P.H); P.frame(0, 0, P.W, P.H, CHROME[0]); P.frame(2, 2, P.W - 2, P.H - 2, CHROME[1]);
    for (const [i, j] of [[5, 5], [P.W - 6, 5], [5, P.H - 6], [P.W - 6, P.H - 6]]) { P.disc(i + 0.5, j + 0.5, 2.2, CHROME[0]); P.px(i, j, CHROME[3]); }
    kana(P, '製造元 ことぶき商会', P.W / 2, P.H - 4, 0x2a2c30, { align: 'center' });
    P.text5(`${st.model}  TOKYO KOTOBUKI 3-8`, P.W / 2, 13, 0x2a2c30, { align: 'center' });
    A.ink(ROUGH.matte);
  }
  { const P = V.SLOT; paper(P, st.dark ? 0x1a191d : st.trim === 0xd8dcdc ? red : st.trim, st.dark ? st.accent : white); kana(P, 'コイン投入口', P.W / 2, P.H - 3, st.dark ? st.accent : white, { align: 'center' }); }
  { const P = V.RET; paper(P, white, 0x8a8a84); kana(P, '返却口', P.W / 2, P.H - 3, 0x2a2428, { align: 'center' }); }
  { const P = V.OUT; paper(P, st.dark ? 0x1a191d : white, st.dark ? st.accent : 0x8a8a84); kana(P, 'とりだし口', P.W / 2, P.H - 3, st.dark ? st.accent : 0x2a2428, { align: 'center' }); }
  {
    // the old machine's price roundel
    const P = V.PRICE, c = P.W / 2;
    P.disc(c, c, c - 1, red); P.ring(c, c, c - 6, c - 4, 0xffe9a0); kana(P, '1回', c, c + 22, 0xffe9a0, { align: 'center' });
    P.text5(`¥${spec.price}`, c, c - 2, white, { align: 'center', s: 2 });
    if (worn) for (let k = 0; k < 9; k++) P.box(8 + (k * 23) % 44, 6 + (k * 17) % 50, 10 + (k * 23) % 44, 8 + (k * 17) % 50, mix(red, 0xe8c8a0, 0.5));
  }
  {
    // the sign: on the lid (slant / board / arch) and as the side badge
    const P = V.SIGN, bg = type === 'retro' ? AC[2] : st.dark ? 0x1a191d : type === 'royal' ? st.trim : st.trim, fg = type === 'retro' ? red : st.dark ? st.accent : white;
    A.ink(ROUGH.paint);
    P.fill(bg); P.frame(0, 0, P.W, P.H, mix(bg, 0x000000, 0.35)); P.frame(3, 3, P.W - 3, P.H - 3, fg);
    const m = glyphMask('ガチャ', 32);
    for (const [x, y] of m) { P.px(14 + x + 2, P.H - 14 - y - 2, mix(bg, 0x000000, 0.4)); }
    for (const [x, y] of m) P.px(14 + x, P.H - 14 - y, fg);
    P.text5(type === 'retro' ? '1 PLAY' : type === 'standard' ? 'GACHA STATION' : type === 'deluxe' ? 'DELUXE 500' : 'ROYAL KIRAKIRA', 118, P.H - 18, fg);
    P.text5(`¥${spec.price}`, 118, P.H - 34, type === 'retro' ? 0x2a2428 : st.dark ? white : AC[2] === bg ? white : st.accent, { s: 2 });
    if (type === 'royal') for (let i = 8; i < P.W - 6; i += 12) { P.disc(i, P.H - 6.5, 2.2, 0xfff2b0); P.disc(i, 6.5, 2.2, 0xfff2b0); } // marquee bulbs, painted
    if (worn) { A.ink(ROUGH.matte); P.box(60, 20, 96, 26, mix(bg, 0xffffff, 0.35)); P.box(150, 8, 158, 11, mix(bg, 0x6a6a66, 0.6)); }
    A.ink(ROUGH.matte);
  }
  {
    // 準備中 notice (two-tier's sister unit), the crate's stencil, the cabinet's emblem
    const P = V.CLOSED;
    if (type === 'retro') { P.box(0, 0, P.W, P.H, 0, 0); const m = glyphMask('ことぶき', 16); for (const [x, y] of m) { P.px(28 + x, P.H - 12 - y, 0x5a2a1a); } P.text5('KOTOBUKI SEIKA', P.W / 2, P.H - 36, 0x5a2a1a, { align: 'center' }); P.text5('No.8  20 KG', P.W / 2, P.H - 50, 0x5a2a1a, { align: 'center' }); P.frame(4, 4, P.W - 4, P.H - 4, 0x5a2a1a); }
    else if (type === 'deluxe') { paper(P, white, 0x2a2428); P.box(1, P.H - 26, P.W - 1, P.H - 1, red); kana(P, '準備中', P.W / 2, P.H - 6, white, { align: 'center' }); kana(P, 'カプセルトイ', P.W / 2, P.H - 34, 0x2a2428, { align: 'center' }); P.text5('COMING SOON', P.W / 2, 20, 0x6a6a66, { align: 'center' }); }
    else { A.ink(ROUGH.chrome); P.box(0, 0, P.W, P.H, 0, 0); P.ring(P.W / 2, P.H / 2, 30, 34, st.accent); P.ring(P.W / 2, P.H / 2, 25, 26, AC[1]); const m = glyphMask('ガ', 32); for (const [x, y] of m) P.px(P.W / 2 - 16 + x, P.H / 2 + 16 - y, st.accent); A.ink(ROUGH.matte); }
  }
  {
    // the coin plate: painted chrome, the slot's shadow, a coin's outline, the reject button's seat
    const P = V.COIN;
    A.ink(ROUGH.chrome);
    const gold = st.dark || type === 'royal';
    const C4 = gold ? [mix(st.accent, 0x201000, 0.5), AC[1], AC[2], AC[4]] : CHROME;
    P.box(0, 0, P.W, P.H, (i, j) => { const t = j / P.H; return t > 0.86 ? C4[2] : t > 0.6 ? C4[3] : t > 0.5 ? C4[1] : t > 0.47 ? C4[0] : t > 0.2 ? C4[1] : C4[2]; });
    P.frame(0, 0, P.W, P.H, C4[0]); P.frame(1, 1, P.W - 1, P.H - 1, C4[3]);
    const sx = Math.round(P.W * 0.66), sy = Math.round(P.H * 0.485);
    P.ring(sx, sy, 20, 22, C4[0]); P.ring(sx, sy - 1, 18, 20, C4[3]);
    P.text5(String(spec.price >= 500 ? 500 : 100), sx, sy + 42, C4[0], { align: 'center' }); P.text5('YEN', sx, sy - 34, C4[0], { align: 'center' });
    P.ring(Math.round(P.W * 0.25), Math.round(P.H * 0.32), 13, 15, C4[0]);
    P.text5('REJECT', Math.round(P.W * 0.25), Math.round(P.H * 0.32) - 20, C4[0], { align: 'center' });
    for (const [i, j] of [[5, 5], [P.W - 6, 5], [5, P.H - 6], [P.W - 6, P.H - 6]]) screw(P, i, j, C4);
  }
  {
    const P = V.WOOD, W0 = 0xb98f5c, R = ramp(W0, 0.8);
    A.ink(ROUGH.matte);
    P.fill(R[2]);
    P.hline(8, 70, 22, R[1]); P.hline(52, 120, 41, R[1]); P.hline(14, 44, 50, R[3]); // three long grain lines, drawn by hand
    P.ring(96, 24, 2, 4, R[1]); P.disc(96, 24, 1.6, R[0]); // one knot
    P.box(0, 0, P.W, 2, R[0]); P.box(0, P.H - 2, P.W, P.H, R[3]);
    for (const i of [4, P.W - 6]) for (const j of [8, P.H - 10]) { P.disc(i + 0.5, j + 0.5, 1.6, 0x4a4a4e); P.px(i, j + 1, 0x9a9aa0); P.vline(i, j - 4, j - 2, mix(W0, 0x6a3a1a, 0.5)); }
  }
}

function paintStand(type, spec, L, st, A, V, K) {
  const { w, d, y0 } = spec, hw = w / 2, hd = d / 2, { B, PN, TR, AC, rnd } = K;
  const F = V.SF, Sd = V.SS, I = (x) => F.i(x), J = (y) => F.j(y);
  A.ink(ROUGH.plastic);
  if (st.stand === 'crate') { F.fill(0x2a2018); Sd.fill(0x2a2018); return; }
  if (st.stand === 'pedestal') {
    const P2 = ramp(mix(st.body, 0x8a98a8, 0.12));
    for (const X of [F, Sd]) { X.fill(P2[2]); X.box(0, 0, X.W, X.j(0.085), P2[1]); X.hline(0, X.W, X.j(0.085), P2[0]); X.box(0, X.j(y0 - 0.055), X.W, X.H, P2[3]); X.hline(0, X.W, X.j(y0 - 0.055), P2[1]); }
    // the column's front: a recessed panel with the maker's roundel and a kick scuff
    F.frame(I(-hw * 0.5), J(0.14), I(hw * 0.5), J(y0 - 0.1), P2[1]); F.hline(I(-hw * 0.5) + 1, I(hw * 0.5) - 2, J(0.14) + 1, P2[3]);
    F.ring(I(0), J(y0 * 0.55), 20, 23, TR[2]); F.text5('GG', I(0), J(y0 * 0.55) + 4, TR[2], { align: 'center' });
    A.ink(ROUGH.matte);
    for (const [di, dj, len] of [[4, 0, 14], [38, 5, 9], [90, 2, 18], [150, 6, 7]]) F.hline(I(-hw + 0.02) + di, I(-hw + 0.02) + di + len, J(0.03) + dj, P2[0]);
    return;
  }
  if (st.stand === 'twotier') {
    for (const X of [F, Sd]) { X.fill(B[2]); X.box(0, 0, X.W, X.j(0.07), B[1]); }
    const fy = 0.05, ty = y0 - 0.012, lh = (ty - fy) * 0.52;
    F.box(I(-hw + 0.014), J(fy + 0.012), I(hw - 0.014), J(fy + lh - 0.012), PN[2]); F.frame(I(-hw + 0.014), J(fy + 0.012), I(hw - 0.014), J(fy + lh - 0.012), mix(st.panel, 0x000000, 0.5));
    F.hline(I(-hw + 0.014) + 1, I(hw - 0.014) - 2, J(fy + 0.012) + 1, PN[3]);
    F.box(0, J(fy + lh - 0.008), F.W, J(fy + lh), TR[2]);
    A.ink(ROUGH.chrome);
    for (const [x, y] of [[-hw + 0.026, fy + 0.024], [hw - 0.026, fy + 0.024], [-hw + 0.026, fy + lh - 0.024], [hw - 0.026, fy + lh - 0.024]]) screw(F, I(x), J(y), [mix(st.accent, 0x201000, 0.5), AC[1], AC[2], AC[4]]);
    return;
  }
  // cabinet
  for (const X of [F, Sd]) {
    X.fill(B[2]); X.box(0, X.j(y0 - 0.06), X.W, X.H, B[3]);
    X.frame(X.i(-(X === F ? hw : hd) + 0.03), X.j(0.085), X.i((X === F ? hw : hd) - 0.03), X.j(y0 - 0.045), mix(st.body, st.trim, 0.3));
    X.frame(X.i(-(X === F ? hw : hd) + 0.03) + 2, X.j(0.085) + 2, X.i((X === F ? hw : hd) - 0.03) - 2, X.j(y0 - 0.045) - 2, AC[2]);
  }
  for (let k = 0; k < 6; k++) Sd.box(Sd.i(-0.07), Sd.j(0.14 + k * 0.018), Sd.i(0.07), Sd.j(0.14 + k * 0.018) + 3, mix(st.body, 0x403040, 0.5));
  void rnd; void d;
}
