// The dressing room's painted backdrop, pixel by pixel at the stage's art resolution (one texel = one stage pixel, so
// nothing is ever scaled): a night sky over the lane's rooftops in stepped, ordered-dithered bands, pixel stars that
// twinkle in the stage's output pass (their twinkle phase rides in the alpha channel), a crescent moon, the lane's
// roofs, telephone pole, antennas and a sakura tree against it (spring 1999), and in front of it all a theatre's
// velvet curtains and swagged valance with gold fringe, drawn back with gold tiebacks (or closed, for the opening).
//   paintBack(W, H, rect) -> { data: Uint8Array RGBA, W, H }       sky, stars, moon, roofs (opaque)
//   paintFront(W, H, rect, open 0..1) -> { data, W, H }             curtains + valance (alpha 0 elsewhere)
// rect = the stage area in art pixels { x, y, w, h } (the part of the screen the paper panel leaves free).

const C = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const SKY = [0x110c24, 0x171230, 0x1e163c, 0x271b4a, 0x322056, 0x3f2560, 0x4e2a66, 0x5e2f68, 0x6e3466].map(C);
const STAR = { dim: C(0x57528a), mid: C(0x9890c6), hi: C(0xe2d8f0), warm: C(0xf2e0ae), pink: C(0xe8a8c8) };
const MOON = { lit: C(0xf2e4a8), mid: C(0xdccb88), dark: C(0xb8a46a), crater: C(0xc9b676) };
const ROOF = { far: C(0x231735), farEdge: C(0x3a2a54), near: C(0x170f26), nearEdge: C(0x2e2246), win: C(0xf0c060), win2: C(0xd8963c), bar: C(0x6a3e1e) };
const BLOSSOM = [C(0xf4c6d6), C(0xe6a0bc), C(0xc47898), C(0x8a4a6e)];
const RED = [0x2e0814, 0x4e1020, 0x6e1828, 0x8e2232, 0xae2e3a, 0xc4444a].map(C);
const INK = C(0x1e0610);
const GOLD = [0xf4cc64, 0xd8a03a, 0xa8701e, 0x6a420e].map(C);

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bayer = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
function rng(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s ^ (s >>> 15), 2246822519) + 0x9e3779b9) >>> 0) / 4294967296); }

class Buf {
  constructor(W, H, opaque) { this.W = W; this.H = H; this.data = new Uint8Array(W * H * 4); if (opaque) this.data.fill(255); }
  set(x, y, c, a = 255) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.W || y >= this.H) return;
    const j = ((this.H - 1 - y) * this.W + x) * 4; // rows bottom-up: the texture is uploaded as is, row 0 = the bottom
    this.data[j] = c[0]; this.data[j + 1] = c[1]; this.data[j + 2] = c[2]; this.data[j + 3] = a;
  }
  alpha(x, y) { if (x < 0 || y < 0 || x >= this.W || y >= this.H) return 0; return this.data[((this.H - 1 - y) * this.W + x) * 4 + 3]; }
  rect(x0, y0, w, h, c) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, c); }
}

// ------------------------------------------------------------------------------------------------ back: sky + lane
export function paintBack(W, H, rect) {
  const b = new Buf(W, H, true), r = rng(1999);
  const horizon = rect.y + rect.h; // the rooftops sit on the bottom of the stage area
  // sky: stepped bands with a dithered seam between each pair
  const top = rect.y - 4, span = Math.max(40, horizon - top);
  for (let y = 0; y < H; y++) {
    const u = Math.max(0, Math.min(0.9999, (y - top) / span)) * (SKY.length - 1);
    const i = Math.floor(u), f = u - i;
    for (let x = 0; x < W; x++) b.set(x, y, SKY[Math.min(SKY.length - 1, f > 0.55 + 0.4 * bayer(x, y) ? i + 1 : i)]);
  }
  // stars: dim dust, brighter points, plus-shaped stars and a few big kira stars; twinkle phase in alpha (200..247)
  const area = W * H, stars = [];
  for (let n = 0; n < area / 140; n++) {
    const x = Math.floor(r() * W), y = Math.floor(r() * (horizon - 6));
    const fade = Math.max(0, 1 - (y - top) / span); // fewer near the horizon
    if (r() > 0.25 + fade) continue;
    stars.push([x, y, r()]);
  }
  for (const [x, y, k] of stars) {
    const ph = 200 + Math.floor(r() * 48);
    if (k < 0.62) b.set(x, y, r() < 0.5 ? STAR.dim : STAR.mid, r() < 0.3 ? ph : 255);
    else if (k < 0.9) b.set(x, y, r() < 0.3 ? STAR.warm : STAR.hi, ph);
    else if (k < 0.975) { b.set(x, y, STAR.hi, ph); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.set(x + dx, y + dy, STAR.mid, ph); }
    else {
      const c = r() < 0.5 ? STAR.warm : STAR.pink;
      b.set(x, y, STAR.hi, ph);
      for (const s of [1, 2]) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.set(x + dx * s, y + dy * s, s === 1 ? c : STAR.dim, ph);
    }
  }
  // the moon: a crescent up in the right of the stage area
  {
    const R = Math.max(5, Math.round(rect.h * 0.045)), mx = Math.round(rect.x + rect.w * 0.8), my = Math.round(rect.y + rect.h * 0.24);
    for (let y = -R - 1; y <= R + 1; y++) for (let x = -R - 1; x <= R + 1; x++) {
      const d = Math.hypot(x + 0.5, y + 0.5), cut = Math.hypot(x + 0.5 + R * 0.55, y + 0.5 - R * 0.3);
      if (d > R || cut < R * 0.92) continue;
      const rim = cut < R * 0.92 + 1.4 || d > R - 1;
      const cr = (x * 7 + y * 13) % 11 === 0 && !rim;
      b.set(mx + x, my + y, cr ? MOON.crater : rim ? (x + y > 0 ? MOON.dark : MOON.mid) : MOON.lit);
    }
  }
  roofs(b, rect, horizon, r);
  return b;
}

function roofs(b, rect, horizon, r) {
  const W = b.W, H = b.H, u = Math.max(1, Math.round(rect.h / 180)); // building unit (1 at ~360-high stages)
  // far row: a ragged line of tiled roofs and flat tops
  const far = new Int16Array(W).fill(H);
  let x = 0;
  while (x < W) {
    const w = (14 + Math.floor(r() * 22)) * u, h = (10 + Math.floor(r() * 14)) * u, gable = r() < 0.6;
    for (let i = 0; i < w && x + i < W; i++) {
      const t = i / w, roof = gable ? Math.round(Math.min(t, 1 - t) * 2 * 6 * u) : 0;
      far[x + i] = Math.min(far[x + i], horizon - h - roof);
    }
    if (r() < 0.35) { const ax = x + Math.floor(w * (0.3 + r() * 0.4)), ah = (6 + Math.floor(r() * 6)) * u, top = horizon - h - (gable ? 6 * u : 0); for (let k = 0; k < ah; k++) far[ax] = Math.min(far[ax], top - k); for (let k = 1; k < ah; k += 2) { const w2 = Math.max(1, Math.round((ah - k) / 3)); for (let j = -w2; j <= w2; j++) if (ax + j >= 0 && ax + j < W) far[ax + j] = Math.min(far[ax + j], top - k); } }
    x += w + Math.floor(r() * 4);
  }
  for (let xx = 0; xx < W; xx++) for (let y = far[xx]; y < H; y++) b.set(xx, y, y === far[xx] ? ROOF.farEdge : ROOF.far);
  // windows in the far row, some lit
  for (let n = 0; n < W / 9; n++) {
    const wx = Math.floor(r() * W), wy = horizon - Math.floor((3 + r() * 8) * u);
    if (wy <= far[wx] + 2 * u || r() < 0.45) continue;
    const lit = r() < 0.7;
    for (let y = 0; y < 2 * u; y++) for (let k = 0; k < 2 * u; k++) b.set(wx + k, wy + y, lit ? (k === u && u > 1 ? ROOF.bar : r() < 0.85 ? ROOF.win : ROOF.win2) : ROOF.farEdge);
  }
  // near row: a long kawara roof on the left with its ridge, a flat block on the right, the water tank
  const near = new Int16Array(W).fill(H);
  const ridge = (x0, x1, base, rise) => { for (let xx = Math.max(0, x0); xx < Math.min(W, x1); xx++) { const t = (xx - x0) / (x1 - x0); near[xx] = Math.min(near[xx], base - Math.round(Math.min(t, 1 - t) * 2 * rise)); } };
  ridge(-10 * u, Math.round(W * 0.34), horizon + 2 * u, 10 * u);
  ridge(Math.round(W * 0.62), Math.round(W * 0.95), horizon + 3 * u, 7 * u);
  for (let xx = Math.round(W * 0.92); xx < W; xx++) near[xx] = Math.min(near[xx], horizon - 5 * u);
  for (let xx = 0; xx < W; xx++) for (let y = near[xx]; y < H; y++) {
    const edge = y === near[xx];
    const tile = !edge && (y - near[xx]) % (3 * u) === 0 && (xx + y) % 2 === 0; // kawara tile courses
    b.set(xx, y, edge ? ROOF.nearEdge : tile ? ROOF.farEdge : ROOF.near);
  }
  // water tank on stilts
  { const tx = Math.round(W * 0.95 - 10 * u), ty = horizon - 5 * u; for (let k = 0; k < 9 * u; k++) { b.set(tx + u, ty - k, ROOF.near); b.set(tx + 7 * u, ty - k, ROOF.near); } for (let y = 0; y < 6 * u; y++) for (let k = 0; k < 9 * u; k++) b.set(tx + k, ty - 9 * u - y, y === 5 * u ? ROOF.nearEdge : ROOF.near); }
  // the telephone pole with its cross arms and sagging wires
  const px = Math.round(rect.x + rect.w * 0.12), ptop = Math.round(horizon - rect.h * 0.42);
  for (let y = ptop; y < H; y++) for (let k = 0; k < 2 * u; k++) b.set(px + k, y, ROOF.near);
  for (const [dy, half] of [[3, 7], [8, 5]]) for (let k = -half * u; k <= half * u + u; k++) for (let t = 0; t < u; t++) b.set(px + k, ptop + dy * u + t, ROOF.near);
  for (const [dy, side] of [[3, -1], [3, 1], [8, 1]]) {
    const x0 = px + side * 6 * u, x1 = side < 0 ? -2 : W + 2, y0 = ptop + dy * u, len = Math.abs(x1 - x0);
    for (let s = 0; s <= len; s++) { const t = s / len, xx = x0 + Math.sign(x1 - x0) * s; b.set(xx, Math.round(y0 + Math.sin(t * Math.PI) * len * 0.06 + t * 4 * u), ROOF.nearEdge); }
  }
  // a sakura tree peeping over the right-hand roof: a crooked dark trunk and branches, blossom in lumpy clumps with
  // ragged, dithered edges and holes (lit from the moon's side, up and to the right)
  const sx = Math.round(rect.x + rect.w * 0.7), sy = horizon - 3 * u;
  const line = (x0, y0, x1, y1, w) => { const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))); for (let i = 0; i <= n; i++) for (let k = 0; k < w; k++) b.set(Math.round(x0 + ((x1 - x0) * i) / n) + k, Math.round(y0 + ((y1 - y0) * i) / n), ROOF.near); };
  line(sx, sy, sx + 2 * u, sy - 9 * u, 2 * u);
  line(sx + 2 * u, sy - 9 * u, sx - 7 * u, sy - 15 * u, u);
  line(sx + 2 * u, sy - 9 * u, sx + 9 * u, sy - 14 * u, u);
  line(sx + 2 * u, sy - 9 * u, sx + 3 * u, sy - 19 * u, u);
  const hsh = (x, y) => { let h = Math.imul(x * 374761393 + y * 668265263, 1274126177); h ^= h >>> 13; return ((h >>> 0) % 1000) / 1000; };
  const clumps = [[-7, -16, 4.2], [-2, -19, 4.6], [4, -20, 4.4], [9, -15, 4], [1, -14, 3.6], [-10, -11, 3], [12, -10, 2.8]];
  for (const [cx, cy, cr] of clumps) {
    const R = cr * u, X = sx + cx * u, Y = sy + cy * u;
    for (let y = -R - 1; y <= R + 1; y++) for (let k = -R - 1; k <= R + 1; k++) {
      const a = Math.atan2(y, k), wob = 0.78 + 0.3 * Math.sin(a * 3 + cx) + 0.12 * Math.sin(a * 7 + cy);
      const d = Math.hypot(k, y) / (R * wob);
      if (d > 1) continue;
      const hh = hsh(X + k, Y + y);
      if (d > 0.7 && hh < 0.35) continue; // ragged edge
      if (hh < 0.06) continue; // holes the sky shows through
      const lit = (k - y) / R + (hh - 0.5) * 0.5;
      b.set(X + k, Y + y, BLOSSOM[d > 0.86 ? 2 : lit > 0.5 ? 0 : lit > -0.25 ? 1 : 2]);
    }
  }
  // a few petals adrift
  for (let n = 0; n < 9; n++) b.set(sx + Math.round((r() - 0.3) * 40 * u), sy - Math.round(r() * 30 * u), BLOSSOM[r() < 0.5 ? 0 : 1]);
}

// ------------------------------------------------------------------------------------------ front: curtains
export function paintFront(W, H, rect, open = 1) {
  const b = new Buf(W, H, false);
  const u = Math.max(1, Math.round(rect.h / 180));
  const vh = Math.max(14, Math.round(rect.h * 0.12)); // valance depth
  const top = rect.y;
  const k = Math.max(0, Math.min(1, open)), e = 1 - Math.pow(1 - k, 2);
  const half = rect.w / 2;
  const tieY = top + rect.h * 0.58;
  // inner edge of the left curtain at row y (the right one mirrors it about the stage centre)
  const openW = (y) => {
    const wTop = rect.w * 0.2, wTie = rect.w * 0.085, wBot = rect.w * 0.15;
    if (y < tieY) { const t = (y - top) / (tieY - top); return wTie + (wTop - wTie) * Math.pow(1 - Math.max(0, t), 1.7); }
    const t = (y - tieY) / (top + rect.h - tieY); return wTie + (wBot - wTie) * Math.pow(Math.min(1, t), 0.8);
  };
  const inner = (y) => half + 1 + (openW(y) - half - 1) * e;
  for (const side of [-1, 1]) {
    for (let y = top; y < Math.min(H, top + rect.h); y++) {
      const wi = Math.round(inner(y));
      for (let i = 0; i < wi + 1; i++) {
        const x = side < 0 ? rect.x + i : rect.x + rect.w - 1 - i;
        const uu = i / Math.max(1, wi); // 0 at the outer edge, 1 at the inner one (folds gather toward the tieback)
        const folds = 3 + Math.round(rect.w / 260);
        // a fold: a soft round highlight on its crest, a deep narrow valley (stepped into the five reds)
        const ph = (((uu * folds + side * 0.11 + (y - top) * 0.0007) % 1) + 1) % 1;
        const s = -Math.cos(ph * Math.PI * 2) * 0.8 + Math.sin(ph * Math.PI * 2) * 0.2 - 0.05;
        let sh = Math.max(1, Math.min(5, Math.round((s + 1) * 0.5 * 4.4) + 1)); // 1..5
        if (i >= wi - 1) sh = 0; // the inner edge in shadow
        else if (i === wi - 2) sh = 5; // catching the light
        if ((x + y) % 2 === 0 && Math.abs(s) > 0.92) sh = Math.max(1, sh - 1); // a dithered crease
        b.set(x, y, i === wi ? INK : RED[Math.max(0, Math.min(5, sh))]);
      }
      // bottom hem: a gold band
      if (y >= top + rect.h - 3 * u) for (let i = 0; i < wi; i++) b.set(side < 0 ? rect.x + i : rect.x + rect.w - 1 - i, y, GOLD[y === top + rect.h - 3 * u ? 0 : 2]);
    }
    // the tieback: a twisted gold rope round the gathered curtain, a tassel hanging off it
    if (e > 0.9) {
      const wi = Math.round(inner(tieY)), y0 = Math.round(tieY);
      for (let i = -1; i < wi + 2; i++) for (let t = 0; t < 3 * u; t++) {
        const x = side < 0 ? rect.x + i : rect.x + rect.w - 1 - i;
        b.set(x, y0 + t, (i + t) % 3 === 0 ? GOLD[2] : t === 0 ? GOLD[0] : GOLD[1]);
      }
      const tx = side < 0 ? rect.x + wi + 1 : rect.x + rect.w - 2 - wi;
      for (let t = 0; t < 4 * u; t++) b.set(tx, y0 + 3 * u + t, GOLD[1]);
      for (let t = 0; t < 7 * u; t++) for (let j = -Math.min(2 * u, Math.floor(t / 2) + 1); j <= Math.min(2 * u, Math.floor(t / 2) + 1); j++) b.set(tx + j, y0 + 7 * u + t, t === 7 * u - 1 ? GOLD[3] : (j + t) % 2 ? GOLD[1] : GOLD[2]);
    }
  }
  // the valance: swags across the top, stepped horizontal folds that follow each swag, gold fringe and tassels
  const n = Math.max(3, Math.round(rect.w / 120)), sw = rect.w / n;
  for (let x = rect.x; x < rect.x + rect.w; x++) {
    const j = Math.floor((x - rect.x) / sw), t = (x - rect.x - j * sw) / sw;
    const drop = Math.round(Math.sin(t * Math.PI) * vh * 0.42);
    const bot = top + Math.round(vh * 0.55) + drop;
    for (let y = Math.max(0, top - 40); y <= bot; y++) {
      const depth = (y - top) / Math.max(1, bot - top); // 0 at the rod, 1 at the hem
      const band = Math.floor(depth * 4.999);
      const sh = [2, 3, 4, 3, 1][band] + (t < 0.08 || t > 0.92 ? -1 : 0);
      b.set(x, y, y === bot ? INK : RED[Math.max(0, sh)]);
    }
    // fringe: gold threads under the hem, every other one longer
    const L = (x % 2 ? 2 : 3) * u + (x % 5 === 0 ? 1 : 0);
    for (let f = 1; f <= L; f++) b.set(x, bot + f, f === L ? GOLD[2] : x % 3 === 0 ? GOLD[1] : GOLD[0]);
    if (t < 1 / sw || j === 0 && x === rect.x) {
      // a tassel where two swags meet
      for (let q = 0; q < 6 * u; q++) for (let w = -u; w <= u; w++) b.set(x + w, top + Math.round(vh * 0.55) + q, q < 2 * u ? GOLD[0] : (w + q) % 2 ? GOLD[1] : GOLD[2]);
    }
  }
  // a gold band along the top of the valance (the pelmet board)
  for (let x = rect.x; x < rect.x + rect.w; x++) for (let y = Math.max(0, top - 2 * u); y < top + u; y++) b.set(x, y, y === top ? GOLD[2] : GOLD[0]);
  return b;
}

/** Where the curtains leave the stage open, in art pixels (for framing the camera): { x0, x1 } at mid height. */
export function curtainGap(rect) {
  return { x0: rect.x + rect.w * 0.085, x1: rect.x + rect.w * (1 - 0.085) };
}
