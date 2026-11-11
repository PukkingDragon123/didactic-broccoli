// HD voxel builds of the owner's three named pieces (phase 12): the Shigaraki tanuki by the shop, the sand castle in
// the park's sandbox and the tobidashi-bōya boy board at the mouth of alley A2. Fine voxels, modelled small parts,
// painted detail by rule. No default export: the prop libraries (shop.js, park.js, town.js) use these builds under
// their old keys, so positions, sizes and interactions stay as they were.
import { shade, mix } from '../../voxel/palette.js';
import { gloss, metal, MAT, enc, surf } from '../../voxel/VoxelModel.js';
import { hash, vnoise } from './garage.js';

const R = Math.round;
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
/** ellipsoid test */
const inE = (x, y, z, cx, cy, cz, rx, ry, rz) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2 <= 1;

// ================================================================================================ the tanuki
// Shigaraki ware (信楽焼): a glossy brown glaze that pools darker in the hollows and runs in drips, a cream belly, the
// unglazed clay of the base scorched orange in the kiln; the eight lucky traits: the straw hat, the big eyes, the smile,
// the belly, the sake flask, the ledger, the tail, the firm stance. ~0.31 m wide, 0.55 m tall (as before).
export function tanukiBuild(v) {
  v.jitter = 0.015;
  const G = (c) => surf('glaze', c, MAT.GLOSS);
  // glaze: brown with darker pools low down and in the back, slow drips running down, a few kiln speckles
  const glazeBrown = (x, y, z) => {
    const drip = vnoise(x * 0.35, y * 0.05, z * 0.35, 3, 11);
    let c = mix(0x5a3a22, 0x8a5a32, clamp01(0.35 + vnoise(x, y, z, 7, 3) * 0.5 + z * 0.006 - drip * 0.35));
    if (hash(x, y, z, 5) < 0.025) c = shade(c, 0.7);
    if (hash(x, y, z, 6) < 0.012) c = 0xb88a5a;
    return G(c);
  };
  const glazeDark = (x, y, z) => G(shade(mix(0x2e1e14, 0x4a3020, vnoise(x, y, z, 6, 8)), 0.95 + hash(x, y, z, 9) * 0.08));
  const cream = (x, y, z) => {
    const blush = clamp01(1 - Math.hypot(x, y - 34) / 26) * 0.18;
    let c = mix(0xf0dcb4, 0xe8c8a0, vnoise(x, y, z, 6, 4) * 0.6 + blush);
    if (hash(x, y, z, 12) < 0.02) c = shade(c, 0.86);
    return G(c);
  };
  const clay = (x, y, z) => {
    const fire = vnoise(x, y, z, 9, 21);
    let c = mix(0xb86a3a, 0xd89a62, fire);
    if (hash(x, y, z, 22) < 0.08) c = 0xf0d8b0; // feldspar grains in the clay
    else if (hash(x, y, z, 23) < 0.06) c = 0x6a3a22;
    return surf('soil', c);
  };

  // ---- base: an unglazed clay plinth, slightly irregular, with a glaze run where the feet sit
  for (let y = 0; y < 5; y++) v.shape(-31, y, -27, 31, y, 27, (x, _y, z) => (x / (31 - (y > 3 ? 1 : 0))) ** 2 + (z / (27 - (y > 3 ? 1 : 0))) ** 2 <= 1 + vnoise(x, 0, z, 6, 2) * 0.05, clay);
  // ---- feet (toes forward, claws marked)
  for (const s of [-1, 1]) {
    v.shape(s * 14 - 9, 5, -2, s * 14 + 9, 12, 20, (x, y, z) => inE(x, y, z, s * 14, 5, 9, 9, 7, 11), glazeDark);
    for (const t of [-4, 0, 4]) { v.set(s * 14 + t, 6, 20, G(0x1a120c)); v.set(s * 14 + t, 7, 20, G(0x1a120c)); }
  }
  // ---- tail: thick, curling round to the side on the base
  for (let i = 0; i <= 16; i++) {
    const t = i / 16, a = t * 2.2;
    const cx = R(-4 - Math.sin(a) * 14), cz = R(-20 - Math.cos(a) * 6), cy = R(16 - t * 8), r = 7 - t * 2.5;
    v.shape(cx - 8, cy - 8, cz - 8, cx + 8, cy + 8, cz + 8, (x, y, z) => Math.hypot(x - cx, y - cy, z - cz) <= r, (x, y, z) => (i > 12 ? glazeDark(x, y, z) : glazeBrown(x, y, z)));
  }
  // ---- body (pear-shaped: wide at the belly, narrower at the shoulders) and the belly
  v.shape(-30, 8, -26, 30, 70, 26, (x, y, z) => {
    const ry = (y - 8) / 62, w = 27 - (ry - 0.35) ** 2 * 26;
    return (x / w) ** 2 + ((z + 1) / (w * 0.88)) ** 2 <= 1;
  }, glazeBrown);
  v.paint(() => v.shape(-30, 10, 0, 30, 60, 27, (x, y, z) => inE(x, y, z, 0, 33, 4, 25, 25, 22), cream));
  // navel: a little dimple with a dark ring
  for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]]) v.paint(() => v.set(dx, 36 + dy, 27, G(0xa07a52)));
  v.remove(0, 36, 27); v.remove(0, 36, 26); v.set(0, 36, 25, G(0x5a3a22));
  // ---- arms
  const arm = (x0, y0, z0, x1, y1, z1, r0, r1) => {
    const n = 22;
    for (let i = 0; i <= n; i++) {
      const t = i / n, cx = x0 + (x1 - x0) * t, cy = y0 + (y1 - y0) * t, cz = z0 + (z1 - z0) * t, r = r0 + (r1 - r0) * t;
      v.shape(R(cx - r - 1), R(cy - r - 1), R(cz - r - 1), R(cx + r + 1), R(cy + r + 1), R(cz + r + 1), (x, y, z) => Math.hypot(x - cx, y - cy, z - cz) <= r, glazeBrown);
    }
  };
  arm(-22, 58, 0, -30, 34, 10, 7, 5.5); // left arm hangs to the flask
  arm(22, 58, 0, 27, 40, 16, 7, 5.5); // right arm bends forward to hold the ledger
  for (const [cx, cy, cz] of [[-31, 31, 11], [27, 37, 19]]) {
    v.shape(cx - 6, cy - 6, cz - 6, cx + 6, cy + 6, cz + 6, (x, y, z) => inE(x, y, z, cx, cy, cz, 5, 4.5, 5), glazeDark); // paws
  }
  // ---- the sake flask (徳利) hanging from the left paw on a cord, with its label
  const fx = -32, fz = 13;
  const flaskC = (x, y, z) => G(y > 22 ? 0xf2ead6 : shade(mix(0xe8dcc0, 0xd4c4a0, vnoise(x, y, z, 5, 31)), 0.96 + hash(x, y, z, 32) * 0.05));
  for (let y = 2; y <= 26; y++) {
    const t = (y - 2) / 24, r = t < 0.62 ? 6.5 + Math.sin(t / 0.62 * Math.PI) * 2.2 - (t > 0.5 ? (t - 0.5) * 24 : 0) : 2.6 + (t > 0.9 ? 0.8 : 0);
    v.shape(fx - 10, y, fz - 10, fx + 10, y, fz + 10, (x, _y, z) => Math.hypot(x - fx, z - fz) <= Math.max(2.2, r), flaskC);
  }
  for (let y = 4; y <= 4; y++) v.paint(() => v.shape(fx - 10, y, fz - 10, fx + 10, y, fz + 10, () => true, G(0x8a6a4a)));
  // label: 八 (hachi, "eight") on a white panel with a brush frame
  const fzF = fz + 8;
  for (let y = 8; y <= 16; y++) for (let x = fx - 3; x <= fx + 3; x++) v.paint(() => v.set(x, y, fzF, G(0xfaf6ea)));
  for (const [x, y] of [[-1, 14], [-1, 13], [-2, 12], [-2, 11], [-3, 10], [1, 14], [1, 13], [2, 12], [2, 11], [3, 10]]) v.paint(() => v.set(fx + x, y, fzF, G(0x1e140e)));
  for (let x = fx - 3; x <= fx + 3; x++) { v.paint(() => v.set(x, 17, fzF, G(0x8a2a1e))); v.paint(() => v.set(x, 7, fzF, G(0x8a2a1e))); }
  // cord from the paw to the neck of the flask
  for (let y = 27; y <= 29; y++) v.set(fx + 1, y, fz - 1, 0xc8a050);
  // ---- the ledger (通帳) in the right paw: a stitched account book with its cover title
  const bx0 = 24, bx1 = 34, by0 = 22, by1 = 40, bz = 22;
  for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) for (let z = bz - 3; z <= bz; z++) {
    const edge = z < bz && (x > bx0 && y > by0 && y < by1);
    v.set(x, y, z, edge ? G(shade(0xf6f0dc, y % 2 ? 0.95 : 1)) : G(0x2c3a5a));
  }
  for (let y = by0 + 1; y < by1; y += 3) v.set(bx0, y, bz + 1, G(0xe8dcc0)); // binding stitches
  for (let y = by0 + 2; y <= by1 - 2; y++) for (let x = bx0 + 3; x <= bx1 - 2; x++) v.set(x, y, bz, G(0xf2ead0)); // title slip
  const TSU = ['#.###', '..#.#', '#.###', '..#.#', '#.###', '.#...', '#.###']; // 通
  TSU.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') v.set(bx0 + 4 + i, by1 - 4 - j, bz, G(0x1e140e)); }));
  for (let x = bx0 + 3; x <= bx1 - 2; x++) v.set(x, by0 + 3, bz, G(0x8a2a1e)); // red seal line
  // ---- head
  v.shape(-24, 62, -20, 24, 100, 24, (x, y, z) => inE(x, y, z, 0, 80, 2, 21, 18, 19), glazeBrown);
  // cheek fluff bulging out at the sides
  for (const s of [-1, 1]) v.shape(s * 12 - 10, 66, -6, s * 12 + 10, 82, 18, (x, y, z) => inE(x, y, z, s * 18, 73, 6, 7, 7, 9), glazeBrown);
  // white muzzle and chin, the dark eye patches
  v.shape(-14, 64, 8, 14, 82, 25, (x, y, z) => inE(x, y, z, 0, 73, 14, 11, 8, 10), cream);
  for (const s of [-1, 1]) v.paint(() => v.shape(s * 9 - 8, 74, 4, s * 9 + 8, 90, 24, (x, y, z) => inE(x, y, z, s * 9, 82, 16, 7.5, 6, 6), glazeDark));
  // nose
  v.shape(-4, 75, 22, 4, 81, 27, (x, y, z) => inE(x, y, z, 0, 78, 23, 3.5, 2.6, 2.4), G(0x14100c));
  v.set(-1, 79, 25, G(0x6a5a50));
  // eyes: big, round, glossy, looking a little up and to the side (the lucky "look round you")
  for (const s of [-1, 1]) {
    const ex = s * 9, ey = 83, ez = R(2 + Math.sqrt(Math.max(0, 1 - (ex / 21) ** 2 - ((ey - 80) / 18) ** 2)) * 19) + 1;
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const d = Math.hypot(dx, dy);
      if (d > 4.4) continue;
      const pd = Math.hypot(dx - s * 0.8, dy - 0.6);
      let c = 0xfbf8f0;
      if (d > 3.6) c = 0x1a120c; // rim
      else if (pd <= 2.3) c = 0x14100c; // pupil
      if (dx === -1 && dy === 2) c = 0xffffff; // sparkle
      v.set(ex + dx, ey + dy, ez, G(c));
      v.set(ex + dx, ey + dy, ez - 1, G(0x1a120c));
    }
    // brow
    for (let dx = -3; dx <= 3; dx++) v.set(ex + dx, 90 + (Math.abs(dx) > 2 ? 0 : 1), ez - 1, G(0x2a1a10));
  }
  // smile: an upturned curve with a pink tongue
  for (let dx = -6; dx <= 6; dx++) {
    const y = R(70 + (dx * dx) * 0.06);
    const z = R(2 + Math.sqrt(Math.max(0, 1 - (dx / 11) ** 2 - ((y - 73) / 8) ** 2)) * 10) + 14;
    v.set(dx, y, z, G(0x3a1a12));
    if (Math.abs(dx) < 3) v.set(dx, y - 1, z - 1, G(0xd06a6a));
  }
  // ears, with a dark inside
  for (const s of [-1, 1]) {
    v.shape(s * 15 - 6, 90, -6, s * 15 + 6, 102, 6, (x, y, z) => inE(x, y, z, s * 15, 95, 0, 5, 6, 3.5), glazeDark);
    v.paint(() => v.shape(s * 15 - 3, 92, 2, s * 15 + 3, 98, 4, (x, y, z) => inE(x, y, z, s * 15, 95, 3, 2.5, 3.5, 1.5), G(0xc89070)));
  }
  // ---- straw kasa hat, tipped back: rings of woven straw, a darker rim band, the chin cord
  const hatTilt = 0.62, hcx = 0, hcy = 97, hcz = -10;
  const straw = (x, y, z) => {
    const r = Math.hypot(x - hcx, z - hcz);
    const weave = (R(r) + R(Math.atan2(z - hcz, x - hcx) * 10)) % 2;
    let c = mix(0xc49a50, 0x9a7438, vnoise(x, y, z, 4, 41) * 0.8);
    c = shade(c, weave ? 0.93 : 1.03);
    if (R(r) % 6 === 0) c = shade(c, 0.85);
    if (r > 21) c = shade(0x7a5a30, 0.95);
    return surf('wood', c);
  };
  for (let lvl = 0; lvl < 14; lvl++) {
    const rad = 24 - lvl * 1.75;
    for (let x = -rad; x <= rad; x++) for (let z = -rad; z <= rad; z++) {
      const r = Math.hypot(x, z);
      if (r > rad || r < rad - 3.2) continue;
      const yy = hcy + lvl * 1.05 - z * Math.sin(hatTilt) * 0.95;
      const zz = hcz + z * Math.cos(hatTilt);
      v.set(hcx + x, R(yy), R(zz), straw(hcx + x, R(yy), R(zz)));
      v.set(hcx + x, R(yy) + 1, R(zz), straw(hcx + x, R(yy) + 1, R(zz)));
    }
  }
  v.set(0, R(hcy + 15), hcz, surf('wood', 0x8a6a3a)); v.set(0, R(hcy + 16), hcz, surf('wood', 0x7a5a30)); // the knob
  // chin cord down past the cheeks
  for (const s of [-1, 1]) for (let y = 66; y <= 96; y++) v.set(s * R(20 - (96 - y) * 0.12), y, R(-2 + (96 - y) * 0.25), 0xb0884a);
  for (let x = -12; x <= 12; x++) v.set(x, 64, R(9 + (1 - (x / 12) ** 2) * 6), 0xb0884a);
}

// ================================================================================================ the sand castle
// A child's sandcastle in the sandbox: a bucket-moulded keep with four towers (rings of the bucket's ridges still in
// the sand), crenellations cut with a spade, an arched gate, a drawbridge of an ice-lolly stick, a moat with a little
// water, a paper flag on a straw; beside it the upturned orange bucket, a blue spade, a green rake and a sieve, sand
// spilled and footprints. 1 m x 1 m footprint, 0.006 m voxels.
export function sandCastleBuild(v) {
  v.jitter = 0.02;
  const S = (x, y, z) => {
    // damp moulded sand: darker low down and where wet, grains of light and dark
    const wet = clamp01((14 - y) / 18) * 0.4;
    let c = mix(0xe2cc9c, 0xb89a68, wet + vnoise(x, y, z, 5, 3) * 0.25);
    const h = hash(x, y, z, 4);
    if (h < 0.07) c = shade(c, 1.1); else if (h < 0.13) c = shade(c, 0.88); else if (h < 0.15) c = 0x8a7a68;
    return surf('soil', c);
  };
  const loose = (x, y, z) => { let c = mix(0xe8d4a6, 0xd0b888, vnoise(x, y, z, 4, 8)); if (hash(x, y, z, 9) < 0.08) c = shade(c, 0.85); return surf('soil', c); };
  // ---- the mound the castle stands on, with the moat dug round it
  const MO = 46, MI = 38; // moat outer / inner radius
  v.shape(-80, 0, -80, 80, 4, 80, (x, y, z) => {
    const r = Math.hypot(x, z);
    if (r < MI) return y <= 4;
    if (r < MO) return y < 1; // the moat bed
    if (r < MO + 8) return y <= Math.round(3 - (r - MO) * 0.35); // the dug-out sand heaped round the moat
    return false;
  }, loose);
  // water in the moat (low on the far side)
  v.shape(-MO, 1, -MO, MO, 1, MO, (x, y, z) => { const r = Math.hypot(x, z); return r >= MI && r < MO && hash(x, 0, z, 77) < 0.92; }, enc(0x5a7a8a, MAT.GLASS));
  // ---- the keep: a bucket shape, tapering, with the bucket's ridges
  const keep = (cx, cz, r0, r1, h, y0) => {
    for (let y = 0; y < h; y++) {
      const t = y / (h - 1), r = r0 + (r1 - r0) * t - (y % 7 === 6 ? 0.6 : 0);
      v.shape(cx - r0 - 1, y0 + y, cz - r0 - 1, cx + r0 + 1, y0 + y, cz + r0 + 1, (x, _y, z) => Math.hypot(x - cx, z - cz) <= r, S);
    }
    // crenellations: alternate blocks round the top rim
    const top = y0 + h;
    for (let a = 0; a < 16; a++) {
      if (a % 2) continue;
      const th = (a / 16) * Math.PI * 2, rr = r1 - 1.5;
      const px = R(cx + Math.cos(th) * rr), pz = R(cz + Math.sin(th) * rr);
      v.shape(px - 2, top, pz - 2, px + 2, top + 3, pz + 2, () => true, S);
    }
    // the hollow at the top (a patted dip)
    v.shape(cx - r1, top - 1, cz - r1, cx + r1, top - 1, cz + r1, (x, y, z) => Math.hypot(x - cx, z - cz) <= r1 - 4, null);
  };
  keep(0, 0, 24, 19, 36, 5);
  for (const [tx, tz] of [[-24, -22], [24, -22], [-24, 22], [24, 22]]) keep(tx, tz, 10, 8, 26, 5);
  // curtain walls between the towers
  for (const [x0, z0, x1, z1] of [[-24, 22, 24, 22], [-24, -22, 24, -22], [-24, -22, -24, 22], [24, -22, 24, 22]]) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(z1 - z0));
    for (let i = 0; i <= n; i++) {
      const x = R(x0 + (x1 - x0) * i / n), z = R(z0 + (z1 - z0) * i / n);
      v.shape(x - 2, 5, z - 2, x + 2, 18, z + 2, () => true, S);
      if (i % 6 < 3) v.shape(x - 2, 19, z - 2, x + 2, 20, z + 2, () => true, S);
    }
  }
  // the gate: an arch through the front wall and the keep's front, a drawbridge stick over the moat
  v.shape(-5, 5, 18, 5, 16, 30, (x, y, z) => Math.abs(x) <= 4 && (y < 12 || Math.hypot(x, y - 12) <= 4), null);
  v.shape(-5, 5, 14, 5, 16, 26, (x, y, z) => Math.abs(x) <= 4 && (y < 12 || Math.hypot(x, y - 12) <= 4) && z > 20, null);
  for (let z = 26; z <= 50; z++) for (let x = -4; x <= 4; x++) v.set(x, R(5 - (z - 26) * 0.17), z, surf('wood', shade(0xd8b880, (x === -4 || x === 4) ? 0.88 : 0.98 + hash(x, 0, z, 3) * 0.06)));
  // windows: dark slits poked with a finger
  for (const [x, y, z] of [[-8, 30, 18], [8, 30, 18], [0, 34, 19], [-24, 20, 31], [24, 20, 31]]) for (let dy = 0; dy < 3; dy++) v.set(x, y + dy, z, surf('soil', 0x6a5a40));
  // shells pressed into the walls
  for (const [x, y, z, c] of [[-14, 12, 24, 0xf4e8dc], [14, 10, 24, 0xf0d8c8], [-30, 14, 0, 0xf8f0e4], [30, 16, 4, 0xe8c8b8]]) {
    v.set(x, y, z, gloss(c)); v.set(x + 1, y, z, gloss(shade(c, 0.9))); v.set(x, y + 1, z, gloss(shade(c, 0.94)));
  }
  // the flag: a bendy straw and a paper flag with a drawn rocket (the kid's emblem)
  for (let y = 41; y <= 68; y++) v.set(0, y, 0, gloss(y % 6 < 3 ? 0xf4f0e8 : 0xe5383b));
  const FLAG = ['WWWWWWWWWWWWWW', 'WWRRWWWWWWWWWW', 'WWRRRRWWWBBWWW', 'WWWRRRRRRBBWWW', 'WWRRRRWWWBBWWW', 'WWRRWWWWWWWWWW', 'WWWWWWWWWWWWWW'];
  FLAG.forEach((row, j) => [...row].forEach((ch, i) => {
    const c = ch === 'R' ? 0xe5383b : ch === 'B' ? 0x2a6ad8 : 0xfbf8f0;
    v.set(1 + i, 67 - j - R(Math.sin(i * 0.5) * 0.8), 0, surf('paper', c));
  }));
  // ---- the bucket, upturned beside the castle (orange, ridged, with its wire handle)
  const bx = 60, bz = -28;
  for (let y = 0; y < 22; y++) {
    const r = 15 - y * 0.18;
    const col = y === 21 || y === 0 ? 0xe8742a : y % 5 === 4 ? 0xf08a3a : 0xff8c2e;
    v.shape(bx - 16, y, bz - 16, bx + 16, y, bz + 16, (x, _y, z) => { const d = Math.hypot(x - bx, z - bz); return d <= r && (y > 19 || d >= r - 1.6); }, gloss(col));
  }
  for (let a = 0; a <= 20; a++) { const th = (a / 20) * Math.PI; v.set(R(bx + Math.cos(th) * 16), R(6 - Math.sin(th) * 0.5), R(bz + Math.sin(th) * 4 - 16), metal(0xc8ccd0)); }
  // a fish moulded in relief on the bucket's side (a print on the plastic)
  for (const [x, y] of [[0, 0], [1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [2, 1], [3, 1], [0, 2], [1, 2], [2, 2], [-2, 0], [-2, 2]]) v.set(bx + x - 2, 9 + y, bz + 15, gloss(0x2a7ad8));
  // ---- the spade, lying across the sand: blue blade, yellow handle
  for (let i = 0; i < 46; i++) { const x = R(-70 + i * 0.9), z = R(40 + i * 0.5); v.set(x, 1, z, gloss(0xf5c518)); v.set(x, 1, z + 1, gloss(0xe0b010)); }
  v.shape(-84, 1, 30, -66, 2, 44, (x, y, z) => { const u = x + 75, w = z - 37; return Math.abs(u * 0.5 + w * 0.9) < 6 && Math.abs(u * 0.9 - w * 0.5) < 8 - (y - 1) * 2; }, gloss(0x2a7ad8));
  // ---- the rake (green) and the sieve
  for (let i = 0; i < 40; i++) v.set(R(40 + i * 0.6), 1, R(48 - i * 0.2), gloss(0x3cae5a));
  for (let k = -6; k <= 6; k++) { v.set(R(64 + k * 0.2), 1, R(40 + k), gloss(0x3cae5a)); if (k % 2 === 0) v.set(R(66 + k * 0.2), 1, R(40 + k), gloss(0x2a8a46)); }
  for (let y = 0; y < 6; y++) v.shape(-66, y, -60, -40, y, -36, (x, _y, z) => { const d = Math.hypot(x + 53, z + 48); return d <= 12 && (d >= 10.8 || y === 0); }, (x, _y, z) => gloss(y === 0 && (x + z) % 2 ? 0xd8d0c0 : 0xe5383b));
  // ---- loose sand: spill near the bucket, a child's footprints
  for (let i = 0; i < 260; i++) {
    const a = hash(i, 1, 3) * Math.PI * 2, r = 16 + hash(i, 2, 3) * 22;
    const x = R(bx + Math.cos(a) * r), z = R(bz + Math.sin(a) * r);
    if (Math.hypot(x, z) > MO + 4) v.set(x, 0, z, loose(x, 0, z));
  }
  for (const [fx, fz, s] of [[-60, -10, 1], [-52, 6, -1], [-62, 22, 1]]) {
    v.shape(fx - 5, 0, fz - 9, fx + 5, 0, fz + 9, (x, y, z) => inE(x, 0, z, fx, 0, fz, 3.6, 1, 7.5) && !(Math.abs(z - fz - s) < 1 && Math.abs(x - fx) < 2), (x, y, z) => surf('soil', shade(0xc8ae7c, 0.92 + hash(x, 0, z, 5) * 0.06)));
  }
}

// ================================================================================================ the boy board
// 飛び出し坊や: the cut-out plywood boy found at the mouths of alleys, painted by the neighbourhood association: a boy in
// a yellow cap and a red shirt dashing out with his arms flung forward, a rough black outline, the paint chalky and
// chipped, the plywood edge showing its plies; bolted with two brackets to a galvanised post sunk in a concrete foot.
// Faces +z. Board 0.5 x 0.86 m on its post (as the old flat sign). 0.005 m voxels, 4 voxels thick.
/** The boy drawn as shapes (resolution independent): returns a palette code for board pixel (i, j), i across 0..W-1,
 *  j down 0..H-1, or '' outside the cut-out. */
function boyPixel(i, j) {
  const x = i, y = j; // pixel space: 100 x 172
  const E = (cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  const seg = (ax, ay, bx, by, r) => {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
    return Math.hypot(x - ax - dx * t, y - ay - dy * t) <= r;
  };
  // parts, front to back (first hit wins)
  // cap: dome + peak pointing forward (right, +x is the direction he runs)
  if (E(50, 30, 21, 15) && y < 31) return y > 27 ? 'y' : 'Y';
  if (y >= 27 && y <= 32 && x >= 52 && x <= 80 && (x - 52) * 0.14 + 27 <= y) return 'y';
  // face
  if (E(50, 42, 19, 17)) {
    if (E(60, 40, 3.2, 4.2)) return E(61, 39, 1.2, 1.4) ? 'W' : 'E';
    if (E(44, 40, 3.2, 4.2)) return E(45, 39, 1.2, 1.4) ? 'W' : 'E';
    if (y >= 49 && y <= 53 && x >= 47 && x <= 62 && E(54, 49, 8, 5) && y >= 49) return y === 49 || x < 49 || x > 60 ? 'M' : 'm';
    if (E(66, 46, 4, 3)) return 'p'; // cheek
    if (x < 37 && y < 47 && y > 30) return 'K'; // hair at the back under the cap
    if (x < 38) return 's';
    return 'S';
  }
  // ear
  if (E(31, 44, 4, 5)) return 's';
  // forward arm (flung out to his right, our right) and hand
  if (E(92, 74, 6, 6)) return 'A';
  if (seg(62, 70, 90, 74, 5)) return 'A';
  // back arm swinging behind (left)
  if (E(12, 92, 6, 6)) return 's';
  if (seg(36, 72, 14, 90, 5)) return 's';
  // shirt: a torso leaning forward with a white stripe
  if (seg(48, 66, 54, 104, 18)) {
    if (y > 82 && y < 88) return 'W';
    return x < 44 ? 'r' : 'R';
  }
  // sleeves
  if (seg(60, 68, 72, 71, 7) || seg(38, 70, 30, 78, 7)) return 'R';
  // shorts
  if (E(52, 112, 21, 11) && y > 104) return x < 44 ? 'b' : 'B';
  // legs: front leg kicked forward, back leg trailing
  if (seg(62, 118, 80, 140, 6)) return 'S';
  if (seg(42, 118, 26, 146, 6)) return 's';
  // socks
  if (seg(80, 140, 84, 150, 6)) return 'w';
  if (seg(26, 146, 22, 154, 6)) return 'w';
  // shoes
  if (E(92, 154, 10, 5)) return y > 156 ? 'h' : 'H';
  if (E(16, 160, 10, 5)) return y > 162 ? 'h' : 'H';
  return '';
}

export function boyBoardBuild(v) {
  v.jitter = 0.01;
  const W = 100, H = 172; // board pixels = voxels (0.005 m): 0.5 x 0.86 m
  const PAL = {
    Y: 0xf5c518, y: 0xd8a410, S: 0xf6c49a, s: 0xe0a47a, A: 0xf6c49a, p: 0xf09a8a, W: 0xfbf8f0, E: 0x1a1612, M: 0x8a1a1a, m: 0xe86a6a,
    K: 0x2a1a12, R: 0xe0282a, r: 0xb81e22, B: 0x2a4aa8, b: 0x1e3a88, w: 0xfbf8f0, H: 0x3a2a22, h: 0x241a14,
  };
  const grid = [];
  for (let j = 0; j < H; j++) { grid.push([]); for (let i = 0; i < W; i++) grid[j].push(boyPixel(i, j)); }
  const at = (i, j) => (i >= 0 && j >= 0 && i < W && j < H ? grid[j][i] : '');
  // the cut-out is the drawing plus a 3 px white border (the board is cut round the outline with a margin)
  const cut = (i, j) => { for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) if (di * di + dj * dj <= 10 && at(i + di, j + dj)) return true; return false; };
  const Z0 = 6; // board front face z (the post stands behind it)
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    if (!cut(i, j)) continue;
    const x = i - W / 2, y = H - 1 - j + 6; // the board's foot 3 cm above the ground (as the old flat sign)
    const p = at(i, j);
    // outline: a drawing pixel next to the white margin or to another colour region boundary on the outer edge
    let ink = false;
    if (p) for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const q = at(i + di, j + dj); if (!q) { ink = true; break; } }
    let c = p ? PAL[p] : 0xf4f0e6;
    if (ink) c = 0x1a1612;
    // weathering: sun-faded paint, chalky speckles, a few chips showing the plywood
    const fade = vnoise(x, y, 0, 18, 51) * 0.12;
    c = mix(c, 0xe8e0d0, fade);
    const chip = !p && vnoise(x, y, 0, 3, 52) > 0.8; // chips only in the white margin, where boards get knocked
    if (chip) c = 0xc8a878;
    v.set(x, y, Z0, surf('paint', c));
    // the board's body: plies seen on the cut edge, the back painted grey
    for (let z = Z0 - 3; z < Z0; z++) {
      const edge = !cut(i + 1, j) || !cut(i - 1, j) || !cut(i, j + 1) || !cut(i, j - 1);
      const ply = z % 2 ? 0xd8b880 : 0xb89060;
      v.set(x, y, z, edge ? surf('wood', ply) : surf('paint', 0x8a8a86));
    }
  }
  // the post: a galvanised steel pipe behind the board, from a concrete foot to just above the cap
  const post = (x, y, z) => metal(shade(0xb8bcbc, 0.9 + vnoise(x, y, z, 5, 61) * 0.14 - (y < 30 ? 0.08 : 0)));
  for (let y = 4; y <= 172; y++) v.shape(-3, y, -3, 3, y, 2, (x, _y, z) => Math.hypot(x, z + 0.5) <= 3, post);
  v.shape(-3, 173, -3, 3, 174, 2, (x, y, z) => Math.hypot(x, z + 0.5) <= 3.2, metal(0x8a8e8e)); // cap
  // brackets (U-bolts round the post, bolted through the board) top and bottom
  for (const by of [60, 92]) {
    for (let x = -5; x <= 5; x++) for (let y = by; y <= by + 4; y++) v.set(x, y, 2, metal(0x9aa0a0));
    for (const s of [-1, 1]) { v.set(s * 4, by + 2, 3, metal(0xd0d4d4)); v.set(s * 4, by + 2, Z0 + 1, metal(0xc0c4c4)); v.set(s * 4, by + 3, Z0 + 1, metal(0x9aa0a0)); }
    for (let x = -4; x <= 4; x++) v.set(x, by + 2, -4, metal(0xa8acac));
  }
  // rust streak from the lower bolts down the board's paint
  for (const s of [-1, 1]) for (let y = 80; y < 93; y++) if (hash(s, y, 0, 70) < 0.6 && v.has(s * 4, y, Z0)) v.set(s * 4, y, Z0, surf('rust', mix(0x9a5a2a, 0xc88a5a, (93 - y) / 13)));
  // the concrete foot, cracked, with a weed
  v.shape(-12, 0, -10, 12, 4, 8, (x, y, z) => y < 4 || (Math.abs(x) < 11 && z > -9 && z < 7), (x, y, z) => surf('concrete', shade(mix(0xa8a49a, 0x86827a, vnoise(x, y, z, 4, 71)), y === 4 && Math.abs(x - z * 0.6) < 0.8 ? 0.6 : 1)));
}
