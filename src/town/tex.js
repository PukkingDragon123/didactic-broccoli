// The town's tiling textures: high-resolution cartoon paint on canvases (flat fields, details in a darker tone of the
// surface, two or three hand-placed tones, wear placed by rule), linear filtering with mipmaps and anisotropy. Every
// texture repeats over a real size in metres (uvs are metres); the pale ones are tinted per building by vertex colour.
//   tile(key) -> THREE.Texture (cached)        TILE[key].size = [metres wide, metres tall]
import * as THREE from 'three';

const rnd = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const hx = (c) => '#' + c.toString(16).padStart(6, '0');
/** A tone of colour c: k < 1 darker (toward a cool shadow), k > 1 lighter (toward warm white). */
export function tone(c, k) {
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  const m = k <= 1 ? [r * k + 20 * (1 - k), g * k + 18 * (1 - k), b * k + 34 * (1 - k)] : [r + (255 - r) * (k - 1) * 2, g + (252 - g) * (k - 1) * 2, b + (236 - b) * (k - 1) * 2];
  return `rgb(${m.map((v) => Math.max(0, Math.min(255, Math.round(v)))).join(',')})`;
}
/** Draw fn at the tile and its eight neighbours so shapes wrap seamlessly. */
function wrap(x, W, H, fn) { for (const dx of [-W, 0, W]) for (const dy of [-H, 0, H]) { x.save(); x.translate(dx, dy); fn(); x.restore(); } }
function blot(x, cx, cy, r, R, n = 9, sq = 1) { x.beginPath(); for (let k = 0; k < n; k++) { const a = (k / n) * 6.2832, rr = r * (0.7 + R() * 0.6); x[k ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * sq); } x.closePath(); x.fill(); }

// key: [canvas w, h, metres w, h, painter(ctx, W, H, R)]
export const TILE = {
  // sprayed mortar (リシン吹付): pale, tinted per house
  plaster: [512, 512, 2, 2, (x, W, H, R) => {
    const c = 0xeeece6; x.fillStyle = hx(c); x.fillRect(0, 0, W, H);
    for (let i = 0; i < 16; i++) { const cx = R() * W, cy = R() * H, r = 26 + R() * 46; x.fillStyle = tone(c, i % 4 ? 0.965 : 1.03); wrap(x, W, H, () => blot(x, cx, cy, r, rnd(i + 7), 10, 0.7)); }
    x.fillStyle = tone(c, 0.9); for (let i = 0; i < 170; i++) x.fillRect(Math.floor(R() * W), Math.floor(R() * H), 1 + Math.floor(R() * 3), 1 + Math.floor(R() * 2));
    x.fillStyle = tone(c, 1.05); for (let i = 0; i < 90; i++) x.fillRect(Math.floor(R() * W), Math.floor(R() * H), 2, 1);
  }],
  // totan: corrugated zinc sheets (0.64 m wide, nailed in rows), rust under the nails and along the laps
  totan: [512, 1024, 1.28, 1.92, (x, W, H) => {
    const c = 0xe6e9e8, P = W / 40;
    for (let i = 0; i < 40; i++) { const x0 = i * P; x.fillStyle = tone(c, 0.8); x.fillRect(x0, 0, P, H); x.fillStyle = tone(c, 0.92); x.fillRect(x0 + 2, 0, P - 4, H); x.fillStyle = hx(c); x.fillRect(x0 + 4, 0, P - 8, H); x.fillStyle = tone(c, 1.06); x.fillRect(x0 + 5.5, 0, 1.6, H); }
    for (const sx of [0, 256]) { x.fillStyle = tone(c, 0.62); x.fillRect(sx, 0, 3, H); x.fillStyle = tone(c, 1.08); x.fillRect(sx + 3, 0, 2, H); }
    x.fillStyle = tone(c, 0.6); x.fillRect(0, 0, W, 4); x.fillStyle = tone(c, 1.08); x.fillRect(0, 4, W, 2);
    const rust = ['#a8683e', '#8a4e2c', '#c08a58'];
    for (let r = 0; r < 4; r++) for (let i = 0; i < 10; i++) {
      const nx = (i * 4 + 2) * P + P / 2, ny = 96 + r * 256, long = (i * 7 + r * 3) % 5 === 0 ? 150 : (i + r) % 3 === 0 ? 60 : 16;
      x.fillStyle = rust[0]; x.fillRect(nx - 2, ny, 4, long); x.fillStyle = rust[2]; x.fillRect(nx - 1, ny, 1.5, long * 0.6);
      x.fillStyle = rust[1]; x.beginPath(); x.arc(nx, ny, 4.2, 0, 7); x.fill(); x.fillStyle = '#d8dcdc'; x.fillRect(nx - 2, ny - 2.5, 2, 1.5);
    }
    x.fillStyle = rust[0]; for (let i = 0; i < 40; i += 3) x.fillRect(i * P + 1, H - 10 - (i % 4) * 6, P - 2, 10 + (i % 4) * 6);
  }],
  // shitami-ita clapboards with battens (押縁) every 0.45 m
  clap: [512, 512, 1.8, 1.44, (x, W, H, R) => {
    const c = 0xd9d3ca, K = [1, 0.94, 1.03, 0.97, 0.92, 1, 0.95, 1.02];
    for (let b = 0; b < 8; b++) {
      const y = b * 64; x.fillStyle = tone(c, K[b]); x.fillRect(0, y, W, 64);
      x.fillStyle = tone(c, K[b] * 0.9); for (let i = 0; i < 4; i++) { const gx = R() * W, gy = y + 10 + R() * 44, gl = 60 + R() * 160; wrap(x, W, H, () => x.fillRect(gx, gy, gl, 1.5)); }
      if (b % 3 === 1) { x.fillStyle = tone(c, 0.72); const kx = 40 + R() * (W - 80); x.beginPath(); x.ellipse(kx, y + 30, 7, 4, 0, 0, 7); x.fill(); }
      x.fillStyle = tone(c, 1.08); x.fillRect(0, y, W, 2); x.fillStyle = tone(c, 0.55); x.fillRect(0, y + 58, W, 6);
    }
    for (let k = 0; k < 4; k++) { const bx = k * 128 + 57; x.fillStyle = tone(c, 1.04); x.fillRect(bx, 0, 14, H); x.fillStyle = tone(c, 0.6); x.fillRect(bx + 14, 0, 3, H); x.fillStyle = tone(c, 1.1); x.fillRect(bx, 0, 2, H); x.fillStyle = tone(c, 0.5); for (let b = 0; b < 8; b++) x.fillRect(bx + 6, b * 64 + 28, 2, 2); }
  }],
  // J-form kawara, 8 x 8 tiles (0.265 x 0.235): the round ridge on the right third of every tile, course shadows
  kawara: [1024, 1024, 2.12, 1.88, (x, W, H) => {
    const c = 0xdcdee2, S = 128;
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
      const X = i * S, Y = j * S, h = ((i * 7 + j * 13 + (i * j) % 5) % 11), k = h === 0 ? 0.92 : h === 5 ? 1.04 : h === 8 ? 0.96 : 1;
      x.fillStyle = tone(c, k); x.fillRect(X, Y, S, S);
      x.fillStyle = tone(c, k * 0.86); x.fillRect(X, Y, 12, S);                    // in the lee of the ridge to the left
      x.fillStyle = tone(c, k * 0.72); x.fillRect(X + 88, Y, 3, S);                // the ridge's foot
      x.fillStyle = tone(c, k * 1.07); x.fillRect(X + 100, Y, 14, S);              // its lit crown
      x.fillStyle = tone(c, k * 0.9); x.fillRect(X + 120, Y, 8, S);
      x.fillStyle = tone(c, 0.56);                                                 // the lower lip's shadow, round under the ridge
      x.fillRect(X, Y + S - 7, 90, 7); x.beginPath(); x.ellipse(X + 109, Y + S - 9, 20, 9, 0, 0, Math.PI); x.fill();
      x.fillStyle = tone(c, 1.12); x.fillRect(X + 2, Y + S - 10, 84, 2.5);
    }
  }],
  // batten-seam tin roof (瓦棒葺き), seams every 0.455 m
  tinroof: [512, 512, 0.91, 0.91, (x, W, H, R) => {
    const c = 0xe2e5e6; x.fillStyle = hx(c); x.fillRect(0, 0, W, H);
    x.fillStyle = tone(c, 0.95); for (let i = 0; i < 9; i++) { const sx = R() * W, sy = R() * H; wrap(x, W, H, () => x.fillRect(sx, sy, 3 + R() * 5, 40 + R() * 90)); }
    for (const bx of [0, 256]) { x.fillStyle = tone(c, 0.86); x.fillRect(bx + 24, 0, 10, H); x.fillStyle = tone(c, 0.62); x.fillRect(bx, 0, 4, H); x.fillStyle = tone(c, 1.07); x.fillRect(bx + 4, 0, 16, H); x.fillStyle = tone(c, 0.78); x.fillRect(bx + 20, 0, 4, H); }
    x.fillStyle = tone(c, 0.7); x.fillRect(0, 0, W, 2.5); x.fillStyle = tone(c, 1.08); x.fillRect(0, 2.5, W, 2);
  }],
  // worn asphalt
  asphalt: [1024, 1024, 6, 6, (x, W, H, R) => {
    const c = 0x908e8c; x.fillStyle = hx(c); x.fillRect(0, 0, W, H);
    for (let i = 0; i < 10; i++) { const cx = R() * W, cy = R() * H, r = 60 + R() * 110; x.fillStyle = tone(c, i % 2 ? 0.95 : 1.035); wrap(x, W, H, () => blot(x, cx, cy, r, rnd(i + 3), 11, 0.6)); }
    for (let i = 0; i < 1500; i++) { const px = R() * W, py = R() * H, s = 1.5 + R() * 2.6; x.fillStyle = i % 5 < 3 ? tone(c, 1.13) : tone(c, 0.8); x.fillRect(px, py, s, s * (0.6 + R() * 0.6)); }
    x.strokeStyle = tone(c, 0.62); x.lineWidth = 1.6;
    for (let i = 0; i < 5; i++) { let px = R() * W, py = R() * H, a = R() * 6.28; const pts = [[px, py]]; for (let k = 0; k < 9; k++) { a += (R() - 0.5) * 1.3; px += Math.cos(a) * 26; py += Math.sin(a) * 26; pts.push([px, py]); } wrap(x, W, H, () => { x.beginPath(); pts.forEach(([u, v], k) => x[k ? 'lineTo' : 'moveTo'](u, v)); x.stroke(); }); }
  }],
  concrete: [512, 512, 2, 2, (x, W, H, R) => {
    const c = 0xc8c4bc; x.fillStyle = hx(c); x.fillRect(0, 0, W, H);
    for (let i = 0; i < 9; i++) { const cx = R() * W, cy = R() * H, r = 30 + R() * 60; x.fillStyle = tone(c, i % 3 ? 0.955 : 1.03); wrap(x, W, H, () => blot(x, cx, cy, r, rnd(i + 11), 9, 0.8)); }
    x.fillStyle = tone(c, 0.8); for (let i = 0; i < 70; i++) { x.beginPath(); x.arc(R() * W, R() * H, 0.8 + R() * 1.6, 0, 7); x.fill(); }
  }],
  // the far strip: concrete flags with tooled joints every 0.6 m
  paving: [512, 512, 1.2, 1.2, (x, W, H, R) => {
    const c = 0xc4c0b6;
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { x.fillStyle = tone(c, [1, 0.96, 0.97, 1.02][i + j * 2]); x.fillRect(i * 256, j * 256, 256, 256); }
    x.fillStyle = tone(c, 0.82); for (let i = 0; i < 60; i++) { x.beginPath(); x.arc(R() * W, R() * H, 1 + R() * 1.4, 0, 7); x.fill(); }
    for (const v of [0, 256]) { x.fillStyle = tone(c, 0.68); x.fillRect(v, 0, 4, H); x.fillRect(0, v, W, 4); x.fillStyle = tone(c, 1.07); x.fillRect(v + 4, 0, 2, H); x.fillRect(0, v + 4, W, 2); }
  }],
  // gutter lids (0.6 x 0.35) with their two hand notches
  lid: [512, 256, 0.6, 0.35, (x, W, H, R) => {
    const c = 0xc2beb6; x.fillStyle = hx(c); x.fillRect(0, 0, W, H);
    x.fillStyle = tone(c, 0.9); for (let i = 0; i < 40; i++) { x.beginPath(); x.arc(R() * W, R() * H, 1.2 + R() * 2, 0, 7); x.fill(); }
    x.fillStyle = tone(c, 0.6); x.fillRect(0, 0, 5, H); x.fillRect(W - 5, 0, 5, H); x.fillRect(0, 0, W, 5); x.fillRect(0, H - 5, W, 5);
    x.fillStyle = tone(c, 1.08); x.fillRect(5, 5, W - 10, 3); x.fillRect(5, 5, 3, H - 10);
    for (const nx of [5, W - 5]) { x.fillStyle = tone(c, 0.42); x.beginPath(); x.ellipse(nx, H / 2, 20, 38, 0, 0, 7); x.fill(); }
    x.fillStyle = tone(c, 0.6); x.fillRect(0, 0, 5, H); x.fillRect(W - 5, 0, 5, H);
  }],
  // steel grating over the gutter
  grate: [256, 256, 0.3, 0.3, (x, W, H) => {
    x.fillStyle = '#2e3033'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 8; i++) { x.fillStyle = '#8f9498'; x.fillRect(i * 32 + 4, 0, 12, H); x.fillStyle = '#c3c8ca'; x.fillRect(i * 32 + 4, 0, 4, H); x.fillStyle = '#5c6064'; x.fillRect(i * 32 + 14, 0, 2, H); }
    for (const y of [20, 148]) { x.fillStyle = '#7a7f83'; x.fillRect(0, y, W, 9); x.fillStyle = '#b4b9bb'; x.fillRect(0, y, W, 3); }
  }],
  // concrete block wall, 0.40 x 0.20 module, running bond
  block: [1024, 512, 1.6, 0.8, (x, W, H, R) => {
    const c = 0xc6c3bb; x.fillStyle = tone(c, 0.8); x.fillRect(0, 0, W, H);
    for (let j = 0; j < 4; j++) for (let i = -1; i < 4; i++) {
      const X = i * 256 + (j % 2) * 128, Y = j * 128, k = [1, 0.96, 1.03, 0.94, 0.99, 1.02, 0.97][(i * 3 + j * 5 + 7) % 7];
      wrap(x, W, H, () => {
        x.fillStyle = tone(c, k); x.fillRect(X + 4, Y + 4, 248, 120);
        x.fillStyle = tone(c, k * 1.07); x.fillRect(X + 4, Y + 4, 248, 3); x.fillStyle = tone(c, k * 0.84); x.fillRect(X + 4, Y + 120, 248, 4); x.fillRect(X + 248, Y + 4, 4, 120);
      });
      x.fillStyle = tone(c, k * 0.84); for (let n = 0; n < 6; n++) { const px = X + 14 + R() * 228, py = Y + 12 + R() * 100; wrap(x, W, H, () => x.fillRect(px, py, 3, 2)); }
    }
  }],
  // red brick, 0.22 x 0.07 module
  brick: [1024, 512, 0.88, 0.56, (x, W, H) => {
    const cs = [0xa87868, 0x9e6e60, 0xb08474, 0x8a6258, 0xa47468]; x.fillStyle = '#b9b1a4'; x.fillRect(0, 0, W, H);
    for (let j = 0; j < 8; j++) for (let i = -1; i < 4; i++) {
      const X = i * 256 + (j % 2) * 128, Y = j * 64, c = cs[(i * 3 + j * 7 + (i * j) % 3 + 9) % 5];
      wrap(x, W, H, () => { x.fillStyle = hx(c); x.fillRect(X + 4, Y + 4, 248, 56); x.fillStyle = tone(c, 1.1); x.fillRect(X + 4, Y + 4, 248, 3); x.fillStyle = tone(c, 0.78); x.fillRect(X + 4, Y + 56, 248, 4); });
    }
  }],
  // kenchi-ishi retaining wall: square stones laid on the diagonal
  stone: [512, 512, 0.9, 0.9, (x, W, H) => {
    const c = 0xaaa69c; x.fillStyle = tone(c, 0.62); x.fillRect(0, 0, W, H);
    for (const [cx, cy, k] of [[0, 0, 1], [256, 0, 0.94], [0, 256, 1.04], [256, 256, 0.97], [128, 128, 0.95], [384, 128, 1.03], [128, 384, 1], [384, 384, 0.92]]) wrap(x, W, H, () => {
      x.fillStyle = tone(c, k); x.beginPath(); x.moveTo(cx, cy - 120); x.lineTo(cx + 120, cy); x.lineTo(cx, cy + 120); x.lineTo(cx - 120, cy); x.fill();
      x.fillStyle = tone(c, k * 1.08); x.beginPath(); x.moveTo(cx, cy - 120); x.lineTo(cx + 120, cy); x.lineTo(cx + 104, cy); x.lineTo(cx, cy - 104); x.lineTo(cx - 104, cy); x.lineTo(cx - 120, cy); x.fill();
      x.fillStyle = tone(c, k * 0.88); x.beginPath(); x.moveTo(cx - 40, cy + 20); x.lineTo(cx + 30, cy + 50); x.lineTo(cx, cy + 90); x.fill();
    });
  }],
  // Oya stone: big greenish tuff blocks with pocks
  oya: [512, 512, 0.9, 0.6, (x, W, H, R) => {
    const c = 0xbcbea8; x.fillStyle = tone(c, 0.7); x.fillRect(0, 0, W, H);
    for (let j = 0; j < 2; j++) wrap(x, W, H, () => { const X = j * 256; x.fillStyle = tone(c, j ? 0.96 : 1.02); x.fillRect(X + 3, j * 256 + 3, 506, 250); x.fillStyle = tone(c, 1.1); x.fillRect(X + 3, j * 256 + 3, 506, 3); });
    for (let i = 0; i < 46; i++) { const px = R() * W, py = R() * H; x.fillStyle = i % 3 ? '#8f8a6c' : tone(c, 0.8); x.beginPath(); x.ellipse(px, py, 3 + R() * 6, 2 + R() * 3, R() * 3, 0, 7); x.fill(); }
  }],
  dirt: [512, 512, 2, 2, (x, W, H, R) => {
    const c = 0xcdbf9f; x.fillStyle = hx(c); x.fillRect(0, 0, W, H);
    for (let i = 0; i < 10; i++) { const cx = R() * W, cy = R() * H, r = 30 + R() * 60; x.fillStyle = tone(c, i % 2 ? 0.95 : 1.04); wrap(x, W, H, () => blot(x, cx, cy, r, rnd(i + 21), 9, 0.7)); }
    for (let i = 0; i < 260; i++) { x.fillStyle = i % 3 ? tone(c, 0.82) : tone(c, 1.1); x.fillRect(R() * W, R() * H, 2 + R() * 2, 1.5 + R() * 1.5); }
  }],
  grass: [512, 512, 2, 2, (x, W, H, R) => {
    const c = 0x8aa462; x.fillStyle = hx(c); x.fillRect(0, 0, W, H);
    for (let i = 0; i < 12; i++) { const cx = R() * W, cy = R() * H, r = 30 + R() * 50; x.fillStyle = tone(c, i % 2 ? 0.92 : 1.05); wrap(x, W, H, () => blot(x, cx, cy, r, rnd(i + 31), 9, 0.8)); }
    for (let i = 0; i < 300; i++) { const px = R() * W, py = R() * H; x.fillStyle = i % 2 ? tone(c, 0.78) : tone(c, 1.12); x.beginPath(); x.moveTo(px, py); x.lineTo(px + 3, py - 9 - R() * 6); x.lineTo(px + 5, py); x.fill(); }
  }],
  ballast: [512, 512, 1.2, 1.2, (x, W, H, R) => {
    x.fillStyle = '#56514b'; x.fillRect(0, 0, W, H);
    const cs = [0x8a857c, 0x9a948a, 0x7a746c, 0x8f8377];
    for (let i = 0; i < 300; i++) { const cx = R() * W, cy = R() * H, r = 9 + R() * 11, c = cs[i % 4]; wrap(x, W, H, () => { x.fillStyle = hx(c); blot(x, cx, cy, r, rnd(i), 6, 0.8); x.fillStyle = tone(c, 1.1); blot(x, cx - 2, cy - 3, r * 0.45, rnd(i + 1), 5, 0.7); }); }
  }],
  // generic sawn wood (grain along u): dark for posts and boards, light for shelves and decks
  wood: [512, 512, 1.2, 1.2, (x, W, H, R) => woodPaint(x, W, H, R, 0x6b4d38)],
  woodL: [512, 512, 1.2, 1.2, (x, W, H, R) => woodPaint(x, W, H, R, 0xc49a6c)],
  // pale timber to tint
  timber: [512, 512, 1.2, 1.2, (x, W, H, R) => woodPaint(x, W, H, R, 0xdcd4c8)],
  // 100 mm porch / shop floor tiles
  tile: [512, 512, 0.4, 0.4, (x, W, H) => {
    const c = 0xcfc4b4; x.fillStyle = tone(c, 0.7); x.fillRect(0, 0, W, H);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const k = [1, 0.96, 1.03, 0.98][(i + j * 3) % 4]; x.fillStyle = tone(c, k); x.fillRect(i * 128 + 5, j * 128 + 5, 118, 118); x.fillStyle = tone(c, k * 1.09); x.fillRect(i * 128 + 5, j * 128 + 5, 118, 4); x.fillStyle = tone(c, k * 0.86); x.fillRect(i * 128 + 5, j * 128 + 118, 118, 5); }
  }],
  // a shop's wainscot boards, white plaster, a board ceiling (the corner shop and the ramen bar inside)
  koshi: [512, 512, 0.9, 0.9, (x, W, H, R) => { const c = 0x8a6444; for (let i = 0; i < 6; i++) { const X = i * W / 6; x.fillStyle = tone(c, [1, 0.93, 1.05, 0.97, 0.9, 1.02][i]); x.fillRect(X, 0, W / 6, H); x.fillStyle = tone(c, 0.6); x.fillRect(X, 0, 3, H); x.fillStyle = tone(c, 0.85); for (let k = 0; k < 5; k++) x.fillRect(X + 10 + R() * 60, R() * H, 1.5, 60 + R() * 120); } }],
  shikkui: [256, 256, 2, 2, (x, W, H, R) => { const c = 0xf0ece2; x.fillStyle = hx(c); x.fillRect(0, 0, W, H); for (let i = 0; i < 8; i++) { const cx = R() * W, cy = R() * H; x.fillStyle = tone(c, 0.97); wrap(x, W, H, () => blot(x, cx, cy, 20 + R() * 30, rnd(i + 41), 9, 0.7)); } }],
  ceil: [512, 512, 0.9, 0.9, (x, W, H) => { const c = 0xc8ac84; for (let i = 0; i < 3; i++) { x.fillStyle = tone(c, [1, 0.95, 1.03][i]); x.fillRect(0, i * H / 3, W, H / 3); x.fillStyle = tone(c, 0.7); x.fillRect(0, i * H / 3, W, 3); } x.fillStyle = tone(c, 0.62); x.fillRect(W / 2 - 14, 0, 28, H); x.fillStyle = tone(c, 0.8); x.fillRect(W / 2 - 14, 0, 6, H); }],
  // steel roller-shutter slats, 75 mm
  shutter: [256, 512, 1.2, 0.6, (x, W, H) => {
    const c = 0xd4d2cc;
    for (let i = 0; i < 8; i++) { const Y = i * 64; x.fillStyle = hx(c); x.fillRect(0, Y, W, 64); x.fillStyle = tone(c, 1.08); x.fillRect(0, Y + 6, W, 10); x.fillStyle = tone(c, 0.86); x.fillRect(0, Y + 34, W, 18); x.fillStyle = tone(c, 0.56); x.fillRect(0, Y + 56, W, 8); }
  }],
  // yellow and black hazard stripes
  hazard: [256, 256, 0.4, 0.4, (x, W, H) => { x.fillStyle = '#e8c234'; x.fillRect(0, 0, W, H); x.fillStyle = '#2a2a2c'; for (let i = -2; i < 4; i++) { x.beginPath(); x.moveTo(i * 128, 0); x.lineTo(i * 128 + 64, 0); x.lineTo(i * 128 + 64 + 256, 256); x.lineTo(i * 128 + 256, 256); x.fill(); } }],
  // bathroom / skirt tiles, small and glossy
  skirt: [512, 512, 0.6, 0.6, (x, W, H) => { const c = 0xb9c6c4; x.fillStyle = tone(c, 0.7); x.fillRect(0, 0, W, H); for (let j = 0; j < 8; j++) for (let i = 0; i < 4; i++) { const X = i * 128 + (j % 2) * 64, k = [1, 0.95, 1.04][(i + j) % 3]; for (const dx of [0, -W]) { x.fillStyle = tone(c, k); x.fillRect(X + dx + 3, j * 64 + 3, 122, 58); x.fillStyle = tone(c, k * 1.1); x.fillRect(X + dx + 3, j * 64 + 3, 122, 5); } } }],
  // tatami-coloured straw (reed screens, sudare)
  reed: [256, 256, 0.3, 0.3, (x, W, H) => { const c = 0xc9b47c; for (let i = 0; i < 32; i++) { x.fillStyle = tone(c, [1, 0.9, 1.05, 0.95][i % 4]); x.fillRect(0, i * 8, W, 8); x.fillStyle = tone(c, 0.7); x.fillRect(0, i * 8 + 6.5, W, 1.5); } for (const v of [60, 190]) { x.fillStyle = '#6a5a3a'; x.fillRect(v, 0, 3, H); } }],
};
function woodPaint(x, W, H, R, c) {
  for (let i = 0; i < 6; i++) { const Y = i * H / 6, k = [1, 0.94, 1.04, 0.97, 0.91, 1.02][i]; x.fillStyle = tone(c, k); x.fillRect(0, Y, W, H / 6 + 1); x.fillStyle = tone(c, k * 0.84); for (let n = 0; n < 4; n++) { const gx = R() * W, gy = Y + 8 + R() * (H / 6 - 16), gl = 80 + R() * 200; wrap(x, W, H, () => x.fillRect(gx, gy, gl, 1.6)); } x.fillStyle = tone(c, 0.66); x.fillRect(0, Y, W, 2.5); }
}

const cache = new Map();
/** The tiling texture `key` (uvs in metres). */
export function tile(key) {
  if (cache.has(key)) return cache.get(key);
  const [w, h, mw, mh, paint] = TILE[key];
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  paint(x, w, h, rnd(key.length * 977 + key.charCodeAt(0) * 31));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 8;
  t.repeat.set(1 / mw, 1 / mh);
  t.name = 'town:' + key;
  cache.set(key, t);
  return t;
}
