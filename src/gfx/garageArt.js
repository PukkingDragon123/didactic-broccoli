// The garage's painted surfaces (src/world/Garage.js, GarageDetail.js), in the two kinds the art bible asks for:
//   * tiling cartoon paint for the big surfaces: canvases drawn as flat colour fields with details in a darker tone of
//     the surface, two or three hand-placed tones and wear placed by rule (rust under the nails, stains at the laps),
//     linear filtering with mipmaps and anisotropy. Uvs are metres; each texture repeats over its real size.
//       surface(key) -> THREE.Texture      SURF[key] = [canvas w, h, metres w, h, painter]
//   * the shutter curtain (one big painted view, lettering and rust included) and a sheet of floor / wall marks
//     (cracks, oil, tyre tracks, stains, flat contact shadows) with alpha:  shutterTexture()   marks() -> { tex, rect }
//   * printed matter as detailed pixel art (nearest filtering): the sign board, the noren, the lanterns, the stickers
//     and plates of a real Japanese garage (火の用心, 消火器, 分電盤, 点検済, 安全第一 ...):  prints() -> { tex, rect, px }
// Every name, mark and maker here is made up.
import * as THREE from 'three';
import { Pix } from './pix.js';

const hx = (c) => '#' + c.toString(16).padStart(6, '0');
/** A tone of colour c: k < 1 darker (toward a cool plum shadow), k > 1 lighter (toward warm white). */
export function tone(c, k) {
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  const m = k <= 1 ? [r * k + 24 * (1 - k), g * k + 18 * (1 - k), b * k + 36 * (1 - k)] : [r + (255 - r) * (k - 1) * 2, g + (250 - g) * (k - 1) * 2, b + (234 - b) * (k - 1) * 2];
  return (Math.max(0, Math.min(255, Math.round(m[0]))) << 16) | (Math.max(0, Math.min(255, Math.round(m[1]))) << 8) | Math.max(0, Math.min(255, Math.round(m[2])));
}
const T = (c, k) => hx(tone(c, k));
/** A small seeded random, for placement decisions only (never per-pixel noise). */
const rnd = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
/** Draw fn at the tile and its eight neighbours so shapes wrap seamlessly. */
function wrap(x, W, H, fn) { for (const dx of [-W, 0, W]) for (const dy of [-H, 0, H]) { x.save(); x.translate(dx, dy); fn(); x.restore(); } }
/** A flat blot with a hand-cut edge (n corners). */
function blot(x, cx, cy, rx, ry, R, n = 10) {
  x.beginPath();
  for (let k = 0; k < n; k++) { const a = (k / n) * 6.2832, s = 0.72 + R() * 0.5; x[k ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rx * s, cy + Math.sin(a) * ry * s); }
  x.closePath(); x.fill();
}

// ---------------------------------------------------------------------------------------------- tiling surfaces
export const SURF = {
  // totan: small-wave zinc sheets 0.8 m wide, pale so each wall tints it (teal paint, rust-proof red, bare zinc).
  // Twelve waves a sheet in three flat tones, the side lap, a row of umbrella nails every 0.8 m with rust under them.
  totan: [512, 1024, 0.8, 1.6, (x, W, H) => {
    const c = 0xe2e5e3, P = W / 12;
    x.fillStyle = hx(c); x.fillRect(0, 0, W, H);
    for (let i = 0; i < 12; i++) {
      x.fillStyle = T(c, 1.07); x.fillRect(i * P + P * 0.12, 0, P * 0.26, H); // the crest catching the light
      x.fillStyle = T(c, 0.86); x.fillRect(i * P + P * 0.62, 0, P * 0.3, H); // the valley
      x.fillStyle = T(c, 0.74); x.fillRect(i * P + P * 0.86, 0, 3, H);
    }
    // the side lap (one sheet over the next) and the end lap half way up
    x.fillStyle = T(c, 0.62); x.fillRect(0, 0, 4, H); x.fillStyle = T(c, 1.1); x.fillRect(4, 0, 3, H);
    x.fillStyle = T(c, 0.66); x.fillRect(0, H - 6, W, 6); x.fillStyle = T(c, 1.1); x.fillRect(0, H - 10, W, 3);
    // nails on every third crest, in rows: a washer, its shadow, and rust running down from some of them
    const rust = 0xb46a3c;
    [0.16, 0.5, 0.84].forEach((v, row) => {
      for (let i = 0; i < 12; i += 3) {
        const cx = (i + (row % 2 ? 1.5 : 0)) % 12 * P + P * 0.25, cy = v * H, k = (i + row * 5) % 4;
        if (k < 3) { const L = [150, 64, 230][k]; x.fillStyle = hx(tone(rust, 1.12)); x.globalAlpha = 0.55; x.beginPath(); x.moveTo(cx - 5, cy); x.lineTo(cx + 5, cy); x.lineTo(cx + 2, cy + L); x.lineTo(cx - 2, cy + L * 0.8); x.fill(); x.globalAlpha = 1; }
        x.fillStyle = T(c, 0.5); x.beginPath(); x.arc(cx + 1, cy + 2, 7, 0, 7); x.fill();
        x.fillStyle = hx(k === 1 ? tone(rust, 0.9) : tone(c, 0.82)); x.beginPath(); x.arc(cx, cy, 6, 0, 7); x.fill();
        x.fillStyle = T(c, 1.12); x.beginPath(); x.arc(cx - 1.5, cy - 1.5, 2.2, 0, 7); x.fill();
      }
    });
    // rust creeping up from the end lap
    x.fillStyle = hx(rust); x.globalAlpha = 0.5;
    for (const [i, h] of [[1, 34], [2, 22], [6, 44], [7, 26], [10, 30]]) x.fillRect(i * P + P * 0.58, H - 6 - h, P * 0.34, h);
    x.globalAlpha = 1;
  }],
  // sawn timber, the grain along u: long streaks in two darker tones, a knot, a split; pale so members tint it
  wood: [512, 128, 1, 0.25, (x, W, H, R) => {
    const c = 0xdcc29c;
    x.fillStyle = hx(c); x.fillRect(0, 0, W, H);
    for (let i = 0; i < 16; i++) {
      const y = (i + 0.5) / 16 * H + (R() - 0.5) * 3, len = W * (0.35 + R() * 0.6), x0 = R() * W;
      x.fillStyle = T(c, i % 3 ? 0.9 : 0.8); wrap(x, W, H, () => x.fillRect(x0, y, len, i % 4 ? 1.5 : 2.5));
    }
    x.fillStyle = T(c, 1.06); for (let i = 0; i < 6; i++) { const y = R() * H, x0 = R() * W; wrap(x, W, H, () => x.fillRect(x0, y, W * 0.4, 3)); }
    for (const [kx, ky, r] of [[120, 40, 9], [380, 92, 6]]) {
      x.fillStyle = T(c, 0.78); x.beginPath(); x.ellipse(kx, ky, r * 2.2, r, 0, 0, 7); x.fill();
      x.fillStyle = T(c, 0.58); x.beginPath(); x.ellipse(kx, ky, r, r * 0.6, 0, 0, 7); x.fill();
    }
  }],
  // plywood lining: 0.91 x 1.82 sheets, cathedral grain in two tones, the joint and its nails every 15 cm
  ply: [512, 1024, 0.91, 1.82, (x, W, H) => {
    const c = 0xdcbf94;
    x.fillStyle = hx(c); x.fillRect(0, 0, W, H);
    x.lineWidth = 3;
    for (const [cx, w0] of [[130, 70], [330, 95], [470, 50]]) for (let k = 0; k < 7; k++) {
      x.strokeStyle = T(c, k % 2 ? 0.9 : 0.84); x.beginPath();
      const w = w0 * (0.25 + k * 0.16), top = 120 + k * 60 + (cx % 90);
      x.moveTo(cx - w, H); x.quadraticCurveTo(cx - w * 0.8, top + 200, cx, top); x.quadraticCurveTo(cx + w * 0.8, top + 200, cx + w, H); x.stroke();
      x.beginPath(); x.moveTo(cx - w, 0); x.lineTo(cx - w, 40); x.moveTo(cx + w, 0); x.lineTo(cx + w, 40); x.stroke();
    }
    x.fillStyle = T(c, 0.6); x.fillRect(0, 0, 3, H); x.fillRect(0, 0, W, 3);
    x.fillStyle = T(c, 1.08); x.fillRect(3, 0, 2, H); x.fillRect(0, 3, W, 2);
    x.fillStyle = T(c, 0.55);
    for (let y = 40; y < H; y += 84) { x.fillRect(12, y, 5, 5); x.fillRect(W - 16, y, 5, 5); }
    for (let i = 60; i < W; i += 98) x.fillRect(i, 14, 5, 5);
  }],
  // the slab: trowelled concrete in 2 m bays, lighter and darker sweeps, the saw-cut joint, a few pits
  concrete: [512, 512, 2, 2, (x, W, H, R) => {
    const c = 0xc2bdb2;
    x.fillStyle = hx(c); x.fillRect(0, 0, W, H);
    for (let i = 0; i < 12; i++) { const cx = R() * W, cy = R() * H, rx = 50 + R() * 80, ry = 22 + R() * 34; x.fillStyle = T(c, i % 3 ? 0.955 : 1.035); const RR = rnd(i + 3); wrap(x, W, H, () => blot(x, cx, cy, rx, ry, RR, 9)); }
    x.fillStyle = T(c, 0.84); for (let i = 0; i < 46; i++) x.fillRect(Math.floor(R() * W), Math.floor(R() * H), 2 + (i % 3), 2);
    x.fillStyle = T(c, 0.62); x.fillRect(0, 0, W, 4); x.fillRect(0, 0, 4, H);
    x.fillStyle = T(c, 1.08); x.fillRect(0, 4, W, 2); x.fillRect(4, 0, 2, H);
  }],
  // concrete blocks (390 x 190) in running bond: three block tones by rule, raked joints, damp at the bed joints
  block: [512, 512, 0.8, 0.8, (x, W, H) => {
    const c = 0xbfbab0, bw = W / 2, bh = H / 4, j = 7;
    x.fillStyle = T(c, 0.66); x.fillRect(0, 0, W, H);
    for (let r = 0; r < 4; r++) for (let i = -1; i < 2; i++) {
      const x0 = i * bw + (r % 2 ? bw / 2 : 0), y0 = r * bh, k = (i * 3 + r * 5 + 8) % 5;
      x.fillStyle = T(c, [1, 0.95, 1.04, 0.97, 0.91][k]); x.fillRect(x0 + j / 2, y0 + j / 2, bw - j, bh - j);
      x.fillStyle = T(c, 1.09); x.fillRect(x0 + j / 2, y0 + j / 2, bw - j, 3);
      x.fillStyle = T(c, 0.84); x.fillRect(x0 + j / 2, y0 + bh - j / 2 - 4, bw - j, 4);
      if (k === 1) { x.fillStyle = T(c, 0.8); x.fillRect(x0 + 40, y0 + 30, 26, 5); x.fillRect(x0 + 150, y0 + 70, 14, 5); }
    }
  }],
  // the back wall: steel-trowelled mortar, big soft sweeps and one settled hairline
  mortar: [512, 512, 2.4, 2.4, (x, W, H, R) => {
    const c = 0xd2ccc0;
    x.fillStyle = hx(c); x.fillRect(0, 0, W, H);
    for (let i = 0; i < 9; i++) { const cx = R() * W, cy = R() * H, rx = 70 + R() * 90, ry = 34 + R() * 40; x.fillStyle = T(c, i % 2 ? 0.965 : 1.03); const RR = rnd(i + 11); wrap(x, W, H, () => blot(x, cx, cy, rx, ry, RR, 10)); }
    x.strokeStyle = T(c, 0.8); x.lineWidth = 2; x.beginPath(); x.moveTo(60, 0); x.lineTo(74, 120); x.lineTo(58, 230); x.lineTo(80, 330); x.lineTo(66, 512); x.stroke();
  }],
  // white 100 mm wall tiles behind the sink, grey grout, one cracked
  tile: [256, 256, 0.4, 0.4, (x, W, H) => {
    const c = 0xf0eee6, s = W / 4;
    x.fillStyle = T(c, 0.7); x.fillRect(0, 0, W, H);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      x.fillStyle = T(c, (i + j * 3) % 5 === 0 ? 0.95 : 1); x.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
      x.fillStyle = T(c, 1.1); x.fillRect(i * s + 3, j * s + 3, s - 6, 3);
    }
    x.strokeStyle = T(c, 0.72); x.lineWidth = 2; x.beginPath(); x.moveTo(s + 8, s * 2 + 6); x.lineTo(s * 2 - 10, s * 3 - 8); x.stroke();
  }],
  // terrazzo (人研ぎ) of the old sink: stone chips in three tones on a jittered grid
  terrazzo: [256, 256, 0.4, 0.4, (x, W, H, R) => {
    const c = 0xbcc0b6;
    x.fillStyle = hx(c); x.fillRect(0, 0, W, H);
    for (let j = 0; j < 9; j++) for (let i = 0; i < 9; i++) {
      const cx = (i + 0.2 + R() * 0.6) * W / 9, cy = (j + 0.2 + R() * 0.6) * H / 9, r = 3 + R() * 5, RR = rnd(i * 9 + j);
      x.fillStyle = [T(c, 1.1), T(c, 0.8), hx(0xa09a8c), T(c, 1.14)][(i + j * 2) % 4]; wrap(x, W, H, () => blot(x, cx, cy, r, r * 0.8, RR, 5));
    }
  }],
  // frosted wired glass (網入りガラス): a pale pane, the diamond wire in a darker tone
  glass: [256, 256, 0.3, 0.3, (x, W, H) => {
    const c = 0xe9efe9;
    x.fillStyle = hx(c); x.fillRect(0, 0, W, H);
    x.strokeStyle = T(c, 0.78); x.lineWidth = 2.5; x.beginPath();
    for (let k = -4; k <= 8; k++) { x.moveTo(k * 64, 0); x.lineTo(k * 64 + 256, 256); x.moveTo(k * 64, 0); x.lineTo(k * 64 - 256, 256); }
    x.stroke();
    x.fillStyle = T(c, 1.06); x.fillRect(0, 0, W, 10);
  }],
  // worn P-tile for the gacha corner: 30 cm vinyl tiles, cream and sea green in check, scuffed
  ptile: [512, 512, 0.6, 0.6, (x, W, H) => {
    const a = 0xe6dfcb, b = 0x9fc0ae, s = W / 2;
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
      const c = (i + j) % 2 ? a : b;
      x.fillStyle = hx(c); x.fillRect(i * s, j * s, s, s);
      x.fillStyle = T(c, 0.9); x.fillRect(i * s + 40 + j * 60, j * s + 70 + i * 50, 90, 6); x.fillRect(i * s + 150, j * s + 180 - i * 40, 46, 5);
      x.fillStyle = T(c, 1.06); x.fillRect(i * s + 20, j * s + 30, 70, 5);
      x.fillStyle = T(c, 0.68); x.fillRect(i * s, j * s, s, 2); x.fillRect(i * s, j * s, 2, s);
    }
  }],
  // the trench drain's grating: flat bars across a dark channel
  grate: [64, 64, 0.1, 0.16, (x, W, H) => {
    x.fillStyle = '#2b2a30'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#8f9496'; x.fillRect(0, 0, W, 7); x.fillRect(0, H - 7, W, 7);
    for (let i = 0; i < 4; i++) { x.fillStyle = '#9da2a3'; x.fillRect(i * 16 + 3, 7, 8, H - 14); x.fillStyle = '#c3c7c6'; x.fillRect(i * 16 + 3, 7, 2, H - 14); }
  }],
};
const surfCache = new Map();
/** A tiling surface texture (uvs in metres). */
export function surface(key) {
  if (surfCache.has(key)) return surfCache.get(key);
  const [w, h, mw, mh, paint] = SURF[key], c = canvas(w, h);
  paint(c.getContext('2d'), w, h, rnd(key.length * 977 + w));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / mw, 1 / mh); t.anisotropy = 8;
  t.name = 'garage:' + key;
  surfCache.set(key, t);
  return t;
}

// ---------------------------------------------------------------------------------------------- the shutter curtain
export const SHUTTER = { w: 6.08, h: 2.7, pitch: 0.075 };
let shutterTex = null;
/** The whole curtain as one painted view (u across the 6.08 m, v up the 2.7 m): slats, rust, the lettering. */
export function shutterTexture() {
  if (shutterTex) return shutterTex;
  const W = 2048, H = 1024, c = canvas(W, H), x = c.getContext('2d'), base = 0xb3bdbc, rust = 0xa85e34;
  const sy = H / SHUTTER.h, sx = W / SHUTTER.w, P = SHUTTER.pitch * sy, n = Math.ceil(H / P);
  x.fillStyle = hx(base); x.fillRect(0, 0, W, H);
  // the band that sat rolled against the damp box for years, and the foot that stood in the splash
  const band = (y0, y1, k) => { x.fillStyle = hx(rust); x.globalAlpha = k; x.fillRect(0, H - y1 * sy, W, (y1 - y0) * sy); x.globalAlpha = 1; };
  band(1.5, 1.95, 0.5); band(1.62, 1.82, 0.5); band(0, 0.16, 0.45);
  const R = rnd(71);
  x.fillStyle = hx(tone(rust, 0.8));
  for (let i = 0; i < 26; i++) { const rx = R() * W, ry = H - (1.5 + R() * 0.45) * sy; blot(x, rx, ry, 30 + R() * 60, 8 + R() * 10, rnd(i + 5), 8); }
  // lettering, as on every garage door in Japan: 出入口につき / 駐車禁止 (stencilled, worn at the slat edges)
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = '#c23a30'; x.globalAlpha = 0.82;
  x.font = '288px "DotGothic16", monospace'; x.fillText('駐車禁止', W / 2, H - 0.86 * sy);
  x.font = '112px "DotGothic16", monospace'; x.fillStyle = '#3d4a5c'; x.fillText('出入口につき', W / 2, H - 1.33 * sy);
  x.globalAlpha = 1;
  // the slats: a lit upper lip, the face, the shaded roll at the bottom and the dark joint
  for (let k = 0; k <= n; k++) {
    const y = H - k * P;
    x.fillStyle = 'rgba(255,252,240,0.34)'; x.fillRect(0, y - P, W, P * 0.16);
    x.fillStyle = 'rgba(40,34,60,0.2)'; x.fillRect(0, y - P * 0.34, W, P * 0.22);
    x.fillStyle = 'rgba(36,28,52,0.62)'; x.fillRect(0, y - P * 0.12, W, P * 0.12);
  }
  // rust running down from slat ends by the rails, dents, an old paint run
  for (const [u, v, len] of [[0.05, 2.3, 0.5], [0.12, 1.5, 0.34], [5.96, 2.1, 0.62], [6.0, 1.2, 0.3], [2.3, 1.55, 0.26], [3.9, 1.6, 0.4], [4.6, 1.52, 0.22]]) {
    x.fillStyle = hx(tone(rust, 0.92)); x.globalAlpha = 0.6; x.fillRect(u * sx - 5, H - v * sy, 10, len * sy); x.globalAlpha = 1;
  }
  for (const [u, v] of [[1.2, 0.7], [4.9, 1.1], [3.3, 0.35]]) {
    x.fillStyle = 'rgba(255,252,240,0.3)'; x.beginPath(); x.ellipse(u * sx - 4, H - v * sy - 4, 40, 18, 0.3, 0, 7); x.fill();
    x.fillStyle = 'rgba(40,34,60,0.22)'; x.beginPath(); x.ellipse(u * sx + 5, H - v * sy + 5, 34, 14, 0.3, 0, 7); x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.name = 'garage:shutter';
  return (shutterTex = t);
}

// ---------------------------------------------------------------------------------------------- floor and wall marks
let marksOut = null;
/** Marks with alpha, drawn flat on the floor and the walls: { tex, rect(name) -> [u0, v0, u1, v1] }. */
export function marks() {
  if (marksOut) return marksOut;
  const W = 1024, H = 1024, c = canvas(W, H), x = c.getContext('2d'), rects = {};
  const at = (name, x0, y0, w, h, fn) => { rects[name] = [x0 / W, 1 - (y0 + h) / H, (x0 + w) / W, 1 - y0 / H]; x.save(); x.beginPath(); x.rect(x0, y0, w, h); x.clip(); x.translate(x0, y0); fn(w, h); x.restore(); };
  const ink = 'rgb(58,50,64)';
  // cracks: a dark line with a light lip, branching (three of them)
  const crack = (pts, br) => (w, h) => {
    for (const [col, off, lw] of [['rgba(255,250,236,0.55)', 2.5, 2.5], [ink, 0, 3.5]]) {
      x.strokeStyle = col; x.lineWidth = lw; x.lineJoin = 'round'; x.beginPath();
      pts.forEach(([u, v], i) => x[i ? 'lineTo' : 'moveTo'](u * w + off, v * h + off)); x.stroke();
      x.lineWidth = lw * 0.6; for (const b of br) { x.beginPath(); b.forEach(([u, v], i) => x[i ? 'lineTo' : 'moveTo'](u * w + off, v * h + off)); x.stroke(); }
    }
  };
  at('crackA', 0, 0, 400, 200, crack([[0.02, 0.2], [0.16, 0.32], [0.3, 0.26], [0.46, 0.5], [0.62, 0.46], [0.8, 0.7], [0.98, 0.78]], [[[0.3, 0.26], [0.36, 0.08], [0.44, 0.04]], [[0.62, 0.46], [0.7, 0.3]]]));
  at('crackB', 400, 0, 300, 200, crack([[0.04, 0.9], [0.2, 0.62], [0.34, 0.66], [0.5, 0.36], [0.72, 0.3], [0.96, 0.06]], [[[0.5, 0.36], [0.56, 0.6], [0.66, 0.74]]]));
  at('crackC', 700, 0, 320, 200, crack([[0.02, 0.5], [0.22, 0.42], [0.4, 0.58], [0.6, 0.5], [0.98, 0.56]], [[[0.4, 0.58], [0.44, 0.84]]]));
  // oil where the car stood: a flat stain, a darker heart, a few drips beside it
  const oil = (seed) => (w, h) => {
    const R = rnd(seed);
    x.fillStyle = 'rgba(64,56,62,0.42)'; blot(x, w / 2, h / 2, w * 0.44, h * 0.42, R, 13);
    x.fillStyle = 'rgba(44,38,50,0.5)'; blot(x, w * 0.46, h * 0.52, w * 0.24, h * 0.22, R, 10);
    x.fillStyle = 'rgba(52,46,56,0.5)'; for (let i = 0; i < 5; i++) blot(x, w * (0.1 + R() * 0.8), h * (0.08 + R() * 0.84), 7 + R() * 6, 6 + R() * 5, R, 6);
  };
  at('oilA', 0, 200, 300, 230, oil(5)); at('oilB', 300, 200, 200, 160, oil(9));
  // tyre tracks: two faint bands with the tread's chevrons
  at('tyre', 500, 200, 60, 500, (w, h) => {
    x.fillStyle = 'rgba(60,54,66,0.13)'; x.fillRect(8, 0, w - 16, h);
    x.fillStyle = 'rgba(52,46,60,0.14)'; for (const u of [14, 27, 40]) x.fillRect(u, 0, 5, h);
    for (const [y, hh] of [[40, 30], [150, 60], [300, 24], [380, 50], [470, 30]]) x.clearRect(0, y, w, hh);
  });
  // water down a wall from a leak, rust from a bolt, damp at a wall's foot, a scuff
  at('water', 580, 200, 150, 300, (w, h) => {
    x.fillStyle = 'rgba(70,74,88,0.2)'; x.beginPath(); x.moveTo(w * 0.3, 0); x.lineTo(w * 0.7, 0); x.lineTo(w * 0.84, h * 0.5); x.lineTo(w * 0.66, h); x.lineTo(w * 0.5, h * 0.82); x.lineTo(w * 0.34, h * 0.94); x.lineTo(w * 0.16, h * 0.46); x.fill();
    x.fillStyle = 'rgba(70,74,88,0.2)'; x.beginPath(); x.moveTo(w * 0.42, 0); x.lineTo(w * 0.58, 0); x.lineTo(w * 0.62, h * 0.7); x.lineTo(w * 0.46, h * 0.76); x.fill();
  });
  at('rust', 740, 200, 60, 300, (w, h) => {
    x.fillStyle = 'rgba(168,94,52,0.6)'; x.beginPath(); x.moveTo(w * 0.2, 0); x.lineTo(w * 0.8, 0); x.lineTo(w * 0.6, h * 0.55); x.lineTo(w * 0.52, h); x.lineTo(w * 0.42, h * 0.62); x.fill();
    x.fillStyle = 'rgba(128,66,38,0.7)'; x.fillRect(w * 0.36, 0, w * 0.28, h * 0.2);
  });
  at('damp', 0, 440, 480, 150, (w, h) => {
    const R = rnd(3); x.fillStyle = 'rgba(66,70,82,0.2)'; x.beginPath(); x.moveTo(0, h);
    for (let i = 0; i <= 12; i++) x.lineTo(i / 12 * w, h * (0.25 + 0.5 * R() * (i % 2 ? 1 : 0.5)));
    x.lineTo(w, h); x.fill();
    x.fillStyle = 'rgba(92,116,82,0.3)'; for (let i = 0; i < 9; i++) blot(x, (i + 0.5) / 9 * w, h - 10 - R() * 10, 24 + R() * 14, 9, R, 7);
  });
  at('scuff', 0, 600, 300, 120, (w, h) => {
    x.strokeStyle = 'rgba(54,48,60,0.34)'; x.lineWidth = 5; x.lineCap = 'round';
    for (const [a, b, cc, d] of [[0.06, 0.3, 0.5, 0.2], [0.2, 0.55, 0.9, 0.42], [0.1, 0.8, 0.62, 0.7], [0.55, 0.86, 0.94, 0.8]]) { x.beginPath(); x.moveTo(a * w, b * h); x.lineTo(cc * w, d * h); x.stroke(); }
  });
  // a painted line (bay markings, the keep-clear box): solid, chipped along its edges and worn through in places
  at('line', 0, 730, 512, 40, (w, h) => {
    const R = rnd(21); x.fillStyle = '#fff'; x.fillRect(0, 4, w, h - 8);
    for (let i = 0; i < 22; i++) { const u = R() * w, top = i % 2; x.clearRect(u, top ? 4 : h - 4 - (3 + R() * 6), 8 + R() * 22, 3 + R() * 6); }
    for (const [u, v, ww, hh] of [[96, 10, 30, 9], [300, 20, 44, 10], [404, 8, 18, 14]]) x.clearRect(u, v, ww, hh);
  });
  // the soft contact shadow under furniture (it stands in for ambient occlusion on the presets without it)
  at('shade', 320, 600, 200, 120, (w, h) => { x.shadowColor = 'rgba(52,44,70,0.34)'; x.shadowBlur = 22; x.shadowOffsetX = 1000; x.fillStyle = '#000'; x.fillRect(34 - 1000, 30, w - 68, h - 60); x.shadowColor = 'transparent'; x.shadowBlur = 0; x.shadowOffsetX = 0; });
  // a round stain (a paint tin stood here) and spilt paint
  at('ring', 540, 720, 110, 110, (w, h) => { x.strokeStyle = 'rgba(120,78,50,0.5)'; x.lineWidth = 7; x.beginPath(); x.arc(w / 2, h / 2, w * 0.38, 0.3, 6.0); x.stroke(); });
  at('spill', 660, 520, 180, 180, (w, h) => { const R = rnd(8); x.fillStyle = 'rgba(88,128,178,0.85)'; blot(x, w / 2, h / 2, w * 0.36, h * 0.3, R, 11); for (let i = 0; i < 6; i++) blot(x, w * (0.12 + R() * 0.76), h * (0.12 + R() * 0.76), 6 + R() * 7, 5 + R() * 6, R, 6); x.fillStyle = 'rgba(150,184,220,0.9)'; blot(x, w * 0.44, h * 0.44, w * 0.14, h * 0.1, R, 7); });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.name = 'garage:marks';
  return (marksOut = { tex, rect: (n) => rects[n] });
}

// ---------------------------------------------------------------------------------------------- printed matter
const RED = 0xc8322c, INK = 0x2a2230, CREAM = 0xf4ecd6, INDIGO = 0x25355c, WHITE = 0xf8f6ee;
/** The shop's crest (丸に割り菱カプセル): a ring, a capsule split by its seam, a small lozenge in the upper half. */
function crest(p, cx, cy, r, fg, bg) {
  p.circle(cx, cy, r, fg); p.circle(cx, cy, Math.round(r * 0.84), bg); p.circle(cx, cy, Math.round(r * 0.66), fg);
  const t = Math.max(2, Math.round(r * 0.09));
  p.rect(cx - r + t, cy - t, 2 * (r - t), 2 * t, bg);
  const d = Math.round(r * 0.26), my = cy - Math.round(r * 0.36);
  for (let j = -d; j <= d; j++) { const w = Math.round((d - Math.abs(j)) * 1.5); p.rect(cx - w, my + j, 2 * w + 1, 1, bg); }
  const d2 = Math.round(d * 0.45);
  for (let j = -d2; j <= d2; j++) { const w = Math.round((d2 - Math.abs(j)) * 1.5); p.rect(cx - w, my + j, 2 * w + 1, 1, fg); }
}
/** Kana / kanji set upright one under the other (the long vowel mark turned upright, as in vertical writing). */
function vtext(p, str, cx, y, size, color, gap = 0) {
  [...str].forEach((ch, i) => {
    const yy = y + i * (size + gap);
    if (ch === 'ー') p.rect(cx - Math.round(size * 0.06), yy + Math.round(size * 0.1), Math.max(2, Math.round(size * 0.12)), Math.round(size * 0.8), color);
    else p.text(ch, cx, yy, { size, color, align: 'center' });
  });
}
const screws = (p, x, y, w, h, c = 0x8a8e90) => { for (const [i, j] of [[4, 4], [w - 6, 4], [4, h - 6], [w - 6, h - 6]]) { p.rect(x + i, y + j, 3, 3, c); p.px(x + i, y + j, 0xdfe2e0); } };

// name: [w, h, painter(p, x, y, w, h)] in pixels; the sheet is 512 px per metre for plates read close up, 256 for boards
const PRINTS = {
  // the sign board on the false front: enamelled tin, 4.0 x 0.8 m (256 px/m)
  signBoard: [1020, 205, (p, x, y, w, h) => {
    p.rect(x, y, w, h, CREAM); p.rect(x, y, w, 6, tone(CREAM, 1.06)); p.rect(x, y + h - 8, w, 8, tone(CREAM, 0.86));
    p.frame(x + 8, y + 8, w - 16, h - 16, RED); p.frame(x + 9, y + 9, w - 18, h - 18, RED); p.frame(x + 14, y + 14, w - 28, h - 28, tone(RED, 0.7));
    crest(p, x + 104, y + 100, 70, RED, CREAM);
    p.text('ガチャガレージ', x + 198 + 3, y + 22 + 3, { size: 112, color: tone(RED, 0.55) });
    p.text('ガチャガレージ', x + 198, y + 22, { size: 112, color: RED });
    p.rect(x + 200, y + 146, 780, 3, INK);
    p.text('カプセルトイ・だがし・おもちゃ', x + 204, y + 156, { size: 32, color: INK });
    p.text('☎22-5871', x + 716, y + 156, { size: 32, color: INK });
    // enamel chipped at the bolts and along the lower edge, rust showing
    for (const [i, j] of [[26, 26], [w - 30, 26], [26, h - 30], [w - 30, h - 30], [w / 2, 22], [w / 2, h - 28]]) { p.circle(x + i, y + j, 9, 0x9a5a36); p.circle(x + i, y + j, 5, 0x5a3a2a); p.rect(x + i - 2, y + j + 8, 4, 22, 0xb07848, 150); }
    for (const [i, ww] of [[330, 40], [640, 26], [870, 54]]) { p.rect(x + i, y + h - 12, ww, 12, 0x9a5a36); p.rect(x + i + 4, y + h - 16, ww - 12, 5, 0xb07848); }
  }],
  // noren: three indigo panels, resist-dyed white (256 px/m, 0.66 x 0.72 m each)
  norenL: [169, 184, (p, x, y, w, h) => { noren(p, x, y, w, h); vtext(p, 'ガチャ', x + w / 2, y + 22, 48, WHITE, 2); }],
  norenC: [169, 184, (p, x, y, w, h) => { noren(p, x, y, w, h); crest(p, x + (w >> 1), y + 98, 60, WHITE, INDIGO); }],
  norenR: [169, 184, (p, x, y, w, h) => { noren(p, x, y, w, h); vtext(p, 'ガレージ', x + w / 2, y + 26, 32, WHITE, 6); }],
  // a paper lantern's skin, wrapped round (u) the body: red paper, bamboo ribs, the shop's kana front and back
  lantern: [256, 128, (p, x, y, w, h) => {
    p.rect(x, y, w, h, 0xd6382e);
    for (let j = 6; j < h; j += 12) { p.rect(x, y + j, w, 2, 0xb02a26); p.rect(x, y + j + 2, w, 1, 0xe85a48); }
    p.rect(x, y, w, 10, 0x2a2026); p.rect(x, y + h - 10, w, 10, 0x2a2026);
    for (const cx of [64, 192]) { p.rect(x + cx - 30, y + 18, 60, 92, 0xf4ead8); for (let j = 18; j < 110; j += 12) p.rect(x + cx - 30, y + j, 60, 1, 0xd8cdb8); vtext(p, cx === 64 ? 'ガチャ' : 'まつり', x + cx, y + 24, 16, INK, 12); }
  }],
  // the lit GACHA CORNER box over the machine row (1.6 x 0.4 m at 256)
  gachaSign: [410, 102, (p, x, y, w, h) => {
    p.rect(x, y, w, h, 0xfff4e0); p.rect(x, y, w, 9, RED); p.rect(x, y + h - 9, w, 9, RED);
    p.text('ガチャガチャ', x + (w >> 1), y + 13, { size: 64, color: RED, align: 'center' });
    p.tinyText('GACHA  CORNER', x + (w >> 1), y + 81, { color: INK, align: 'center' });
    for (const cx of [26, w - 27]) crest(p, x + cx, y + 46, 15, RED, 0xfff4e0);
  }],
  // 安全第一 with the green cross (0.6 x 0.45 m at 256)
  anzen: [154, 116, (p, x, y, w, h) => {
    p.rect(x, y, w, h, WHITE); p.frame(x, y, w, h, 0x2f8a4e); p.frame(x + 1, y + 1, w - 2, h - 2, 0x2f8a4e);
    p.rect(x + 66, y + 12, 22, 50, 0x2f8a4e); p.rect(x + 52, y + 26, 50, 22, 0x2f8a4e);
    p.text('安全第一', x + (w >> 1), y + 72, { size: 32, color: 0x2f8a4e, align: 'center' });
  }],
  // everything below is 512 px per metre
  hinoyojin: [56, 168, (p, x, y, w, h) => {
    p.rect(x, y, w, h, WHITE); for (let k = 0; k < 3; k++) p.frame(x + k, y + k, w - 2 * k, h - 2 * k, RED);
    vtext(p, '火の用心', x + (w >> 1), y + 12, 32, RED, 4);
    p.rect(x + 8, y + h - 12, w - 16, 2, RED);
  }],
  shokaki: [64, 190, (p, x, y, w, h) => {
    p.rect(x, y, w, h, RED); p.frame(x + 3, y + 3, w - 6, h - 6, WHITE);
    vtext(p, '消火器', x + (w >> 1), y + 14, 32, WHITE, 8);
    for (let j = 0; j < 16; j++) p.rect(x + (w >> 1) - (16 - j), y + h - 46 + j, 2 * (16 - j), 1, WHITE);
    p.rect(x + (w >> 1) - 5, y + h - 58, 10, 14, WHITE);
  }],
  // the distribution board's face (0.3 x 0.42 m): the knife switch's slot stays clear in the middle for the lever
  breaker: [154, 216, (p, x, y, w, h) => {
    const c = 0xc9c6b8;
    p.rect(x, y, w, h, c); p.rect(x, y, w, 3, tone(c, 1.1)); p.rect(x, y + h - 4, w, 4, tone(c, 0.8)); p.frame(x, y, w, h, tone(c, 0.62));
    screws(p, x, y, w, h);
    p.rect(x + 40, y + 10, 74, 22, 0xd8dadc); p.frame(x + 40, y + 10, 74, 22, 0x6a6e72); p.text('分電盤', x + 77, y + 13, { size: 16, color: INK, align: 'center' });
    p.rect(x + 61, y + 44, 32, 100, 0x26222c); p.frame(x + 59, y + 42, 36, 104, tone(c, 0.66));
    p.text('入', x + 108, y + 48, { size: 16, color: RED }); p.text('切', x + 108, y + 122, { size: 16, color: INK });
    p.tinyText('MAIN', x + 16, y + 52, { color: INK }); p.text('主幹', x + 12, y + 64, { size: 16, color: INK }); p.tinyText('30A', x + 20, y + 86, { color: RED });
    for (let k = 0; k < 3; k++) { const cx = x + 36 + k * 41, cy = y + 172; p.circle(cx, cy, 13, 0x74706a); p.circle(cx, cy, 11, 0xf0ece0); p.rect(cx - 7, cy - 1, 14, 3, 0x8a8478); p.tinyText(String(k + 1), cx - 2, cy + 16, { color: INK }); }
    p.rect(x + 8, y + 104, 46, 30, 0xf2d648); p.frame(x + 8, y + 104, 46, 30, 0x8a7420); p.text('点検済', x + 31, y + 106, { size: 16, color: INK, align: 'center' }); p.tinyText('H10.4', x + 31, y + 123, { color: INK, align: 'center' });
    p.rect(x + 102, y + 146, 44, 14, 0x3a6ab0); p.tinyText('HOAN', x + 124, y + 149, { color: WHITE, align: 'center' });
  }],
  // the watt-hour meter's face under its glass (0.2 m across)
  meter: [104, 104, (p, x, y, w, h) => {
    p.circle(x + 52, y + 52, 51, 0x5a5e62); p.circle(x + 52, y + 52, 48, 0xe8e6da);
    p.rect(x + 22, y + 26, 60, 18, 0x1e1c24); for (let k = 0; k < 5; k++) { p.rect(x + 24 + k * 12, y + 28, 10, 14, k === 4 ? RED : 0x2e2c36); p.tinyText('04127'[k], x + 26 + k * 12, y + 31, { color: WHITE }); }
    p.tinyText('kWh', x + 52, y + 48, { color: INK, align: 'center' });
    p.rect(x + 14, y + 62, 76, 5, 0x9a9ea0); p.rect(x + 14, y + 62, 76, 1, 0xdfe2e0); p.rect(x + 58, y + 62, 8, 5, RED);
    p.tinyText('100V 30A 50Hz', x + 52, y + 72, { color: INK, align: 'center' }); p.tinyText('No.582714', x + 52, y + 82, { color: 0x6a6660, align: 'center' });
  }],
  kentei: [64, 40, (p, x, y, w, h) => { p.rect(x, y, w, h, 0x4a9a5c); p.frame(x, y, w, h, 0x2a6a3a); p.text('検定', x + (w >> 1), y + 3, { size: 16, color: WHITE, align: 'center' }); p.tinyText('H16.3', x + (w >> 1), y + 24, { color: WHITE, align: 'center' }); }],
  keiyaku: [64, 32, (p, x, y, w, h) => { p.rect(x, y, w, h, WHITE); p.frame(x, y, w, h, RED); p.text('契約', x + 4, y + 6, { size: 16, color: RED }); p.tinyText('30A', x + 40, y + 12, { color: RED }); }],
  maker: [150, 36, (p, x, y, w, h) => { p.rect(x, y, w, h, 0xcfd3d4); p.frame(x, y, w, h, 0x6a6e72); p.text('ミカサシヤッター', x + (w >> 1), y + 4, { size: 16, color: 0x24406a, align: 'center' }); p.tinyText('MIKASA  NO.3  1971', x + (w >> 1), y + 24, { color: 0x24406a, align: 'center' }); }],
  dento: [44, 24, (p, x, y, w, h) => { p.rect(x, y, w, h, WHITE); p.frame(x, y, w, h, 0x8a8478); p.text('電灯', x + (w >> 1), y + 4, { size: 16, color: INK, align: 'center' }); }],
  sessui: [44, 44, (p, x, y, w, h) => { p.circle(x + 22, y + 22, 21, 0x3a7ac0); p.circle(x + 22, y + 22, 18, WHITE); p.text('節水', x + 22, y + 13, { size: 16, color: 0x3a7ac0, align: 'center' }); }],
  chui: [150, 44, (p, x, y, w, h) => { p.rect(x, y, w, h, 0xf2cc30); p.frame(x, y, w, h, INK); p.frame(x + 1, y + 1, w - 2, h - 2, INK); p.text('頭上注意', x + (w >> 1), y + 6, { size: 32, color: INK, align: 'center' }); }],
  seiton: [150, 44, (p, x, y, w, h) => { p.rect(x, y, w, h, 0x2f5fa8); p.frame(x + 2, y + 2, w - 4, h - 4, WHITE); p.text('整理整頓', x + (w >> 1), y + 6, { size: 32, color: WHITE, align: 'center' }); }],
  hazard: [64, 32, (p, x, y, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) p.px(x + i, y + j, ((i + j) >> 3) % 2 ? 0x2a2630 : 0xf2c830); }],
  // the cutting mat on the counter (0.8 x 0.5 m at 256)
  mat: [205, 128, (p, x, y, w, h) => {
    p.rect(x, y, w, h, 0x2f6a4c);
    for (let i = 6; i < w; i += 13) p.rect(x + i, y + 4, 1, h - 8, (i - 6) % 65 ? 0x3d7c5c : 0x7ab592);
    for (let j = 4; j < h; j += 13) p.rect(x + 4, y + j, w - 8, 1, (j - 4) % 65 ? 0x3d7c5c : 0x7ab592);
    p.frame(x + 3, y + 3, w - 6, h - 6, 0x7ab592); p.tinyText('A2  CUTTING MAT', x + 10, y + h - 12, { color: 0x7ab592 });
    p.line(x + 60, y + 30, x + 150, y + 74, 0x26583e); p.line(x + 90, y + 96, x + 180, y + 40, 0x26583e);
  }],
  // notices and papers (0.2 to 0.3 m)
  rules: [128, 144, (p, x, y, w, h) => {
    p.rect(x, y, w, h, 0xfbf3d8); p.frame(x, y, w, h, 0xb8a888); p.rect(x, y, w, 26, RED); p.text('おやくそく', x + (w >> 1), y + 5, { size: 16, color: WHITE, align: 'center' });
    ['ならんでね', 'たたかない', 'ゴミはかごへ'].forEach((s, i) => { p.circle(x + 12, y + 46 + i * 30, 5, RED); p.text(s, x + 22, y + 38 + i * 30, { size: 16, color: INK }); });
    p.rect(x + 44, y - 0, 40, 8, 0xe8dcae, 200);
  }],
  kaishu: [104, 64, (p, x, y, w, h) => { p.rect(x, y, w, h, WHITE); p.frame(x, y, w, h, 0x3a7ac0); p.frame(x + 1, y + 1, w - 2, h - 2, 0x3a7ac0); p.text('カプセル', x + (w >> 1), y + 8, { size: 16, color: 0x3a7ac0, align: 'center' }); p.text('回収箱↓', x + (w >> 1), y + 34, { size: 16, color: INK, align: 'center' }); }],
  ryogae: [104, 64, (p, x, y, w, h) => { p.rect(x, y, w, h, 0xf2d648); p.frame(x, y, w, h, INK); p.text('両替', x + (w >> 1), y + 4, { size: 32, color: INK, align: 'center' }); p.tinyText('1000 > 100x10', x + (w >> 1), y + 46, { color: INK, align: 'center' }); }],
  memo: [72, 72, (p, x, y, w, h) => { p.rect(x, y, w, h, 0xf8e878); p.rect(x, y + h - 8, w, 8, 0xe0cc58); for (let j = 0; j < 4; j++) p.rect(x + 8, y + 14 + j * 12, [50, 40, 54, 26][j], 2, 0x5a5670); p.circle(x + (w >> 1), y + 5, 4, RED); }],
  photo: [64, 78, (p, x, y, w, h) => { p.rect(x, y, w, h, WHITE); p.frame(x, y, w, h, 0xc8c2b4); p.rect(x + 5, y + 5, w - 10, 52, 0x8ab4d8); p.rect(x + 5, y + 38, w - 10, 19, 0x6a9a5a); p.rect(x + 16, y + 26, 30, 20, 0xe6e9e8); p.rect(x + 16, y + 26, 30, 5, 0xb0483a); p.rect(x + 26, y + 34, 12, 12, 0x5a626a); p.tinyText('S46', x + (w >> 1), y + 64, { color: 0x6a6660, align: 'center' }); }],
  // the block's enamel address plate (町名看板)
  chome: [64, 216, (p, x, y, w, h) => { p.rect(x, y, w, h, 0x2f5fa8); p.frame(x + 2, y + 2, w - 4, h - 4, WHITE); vtext(p, '昭和町二丁目', x + (w >> 1), y + 10, 32, WHITE, 1); p.circle(x + (w >> 1), y + 6, 2, 0xc8ccd0); p.circle(x + (w >> 1), y + h - 6, 2, 0xc8ccd0); }],
  // the fluorescent fitting's rating label and the pull-cord tag
  tag: [28, 44, (p, x, y, w, h) => { p.rect(x, y, w, h, 0xf2e8c8); p.frame(x, y, w, h, 0x9a8a60); p.circle(x + (w >> 1), y + 6, 3, 0x5a5040); vtext(p, '点灯', x + (w >> 1), y + 12, 16, INK, 0); }],
};
function noren(p, x, y, w, h) {
  p.rect(x, y, w, h, INDIGO);
  for (let j = 3; j < h; j += 6) p.rect(x, y + j, w, 1, tone(INDIGO, 1.08));
  p.rect(x, y, w, 12, tone(INDIGO, 0.8)); for (let i = 10; i < w; i += 40) p.rect(x + i, y, 14, 12, tone(INDIGO, 1.16));
  p.rect(x, y, 2, h, tone(INDIGO, 0.75)); p.rect(x + w - 2, y, 2, h, tone(INDIGO, 0.75)); p.rect(x, y + h - 3, w, 3, tone(INDIGO, 0.75));
}

let printsOut = null;
/** The print sheet: { tex, rect(name) -> [u0, v0, u1, v1], px(name) -> [w, h] } (pixel art, nearest). */
export function prints() {
  if (printsOut) return printsOut;
  const W = 1024, H = 1024, p = new Pix(W, H, 7), rects = {}, sizes = {};
  let sx = 0, sy = 0, sh = 0;
  for (const [name, [w, h, paint]] of Object.entries(PRINTS)) {
    if (sx + w + 4 > W) { sx = 0; sy += sh; sh = 0; }
    paint(p, sx + 2, sy + 2, w, h);
    rects[name] = [(sx + 2) / W, 1 - (sy + 2 + h) / H, (sx + 2 + w) / W, 1 - (sy + 2) / H]; sizes[name] = [w, h];
    sx += w + 4; sh = Math.max(sh, h + 4);
  }
  if (sy + sh > H) console.warn('garage print sheet is full');
  const tex = p.texture();
  tex.name = 'garage:prints';
  return (printsOut = { tex, rect: (n) => rects[n], px: (n) => sizes[n] });
}
