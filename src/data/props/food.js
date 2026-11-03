// Food, drinks and the things around them: Mikawa-ya's onigiri, bread and pudding, the vending machines' cans and
// bottles (one prop per drink, generated from its label colours in src/needs/foods.js), potted plants at every growth
// stage, the watering can / seeds / fertiliser, and the ramen shop's pots, bowls, stools, lantern and sink.
// Each entry: { name, jp, voxel, build(v) }. Facing +z, bottom-centre origin, deterministic (hashed noise only).
import { shade, mix } from '../../voxel/palette.js';
import { gloss, metal, glow, glass } from '../../voxel/VoxelModel.js';
import { hash, fill } from './garage.js';
import { FOODS, DRINK_IDS } from '../../needs/foods.js';

const R = Math.round;
const P = {};

// ------------------------------------------------------------------ Mikawa-ya food
function onigiri(v, wrap) {
  v.jitter = 0.015;
  // a rounded triangle of rice, a nori band at the bottom, the clear film with a coloured stripe and a label
  for (let y = 0; y <= 20; y++) {
    const half = 11 - y * 0.5 - (y > 15 ? (y - 15) * 0.6 : 0);
    for (let x = -12; x <= 12; x++) {
      if (Math.abs(x) > half) continue;
      for (let z = -3; z <= 3; z++) {
        const edge = Math.abs(z) === 3 || Math.abs(x) > half - 1;
        let c = hash(x, y, z, 4) < 0.15 ? 0xe8e4dc : 0xfaf8f2;
        if (y < 9 && Math.abs(x) < 7) c = hash(x, y, z, 5) < 0.2 ? 0x1e2a1e : 0x14201a; // nori
        v.set(x, y, z, edge && z === 3 && y > 2 && y < 9 && Math.abs(x) < 4 ? gloss(wrap) : c);
      }
    }
  }
  // the film's tab stripe up the middle of the front, the "1" tab at the top
  v.paint(() => { for (let y = 0; y <= 20; y++) { if (v.has(0, y, 3)) v.set(0, y, 3, gloss(wrap)); } });
  v.set(0, 21, 0, gloss(wrap)); v.set(0, 21, 1, gloss(wrap));
}
P.food_onigiri_ume = { name: 'Onigiri (Ume)', jp: 'おにぎり', voxel: 0.004, build: (v) => onigiri(v, 0xd8302a) };
P.food_onigiri_tuna = { name: 'Onigiri (Tuna)', jp: 'おにぎり', voxel: 0.004, build: (v) => onigiri(v, 0x2a6ad8) };
P.food_onigiri_shake = { name: 'Onigiri (Salmon)', jp: 'おにぎり', voxel: 0.004, build: (v) => onigiri(v, 0xf08a3a) };

function bun(v, top, side, crack = 0, seed = 0) {
  v.jitter = 0.02;
  const r = 10;
  for (let y = 0; y <= 8; y++) {
    const rr = y < 3 ? r - (3 - y) * 0.6 : Math.sqrt(Math.max(0, r * r - ((y - 2) * 1.55) ** 2));
    for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) {
      if (x * x + z * z > rr * rr) continue;
      let c = y < 3 ? side : top;
      if (crack && y > 3 && (((x + z + 40) % 5 === 0) || ((x - z + 40) % 5 === 0))) c = shade(top, 0.82);
      if (!crack && y > 6 && hash(x, z, seed, 3) < 0.04) c = 0xf4ead2; // sesame
      v.set(x, y, z, c);
    }
  }
}
P.food_melonpan = { name: 'Melon Bread', jp: 'メロンパン', voxel: 0.005, build: (v) => { bun(v, 0xf4d070, 0xe8b058, 1); fill(v, -11, 0, -11, 11, 0, 11, glass(0xf4f4f0)); } };
P.food_anpan = { name: 'Anpan', jp: 'あんぱん', voxel: 0.005, build: (v) => { bun(v, 0x9a5420, 0xc88440, 0, 2); fill(v, -11, 0, -11, 11, 0, 11, glass(0xf4f4f0)); } };
P.food_purin = {
  name: 'Pudding', jp: 'プリン', voxel: 0.004,
  build(v) {
    v.jitter = 0.01;
    for (let y = 0; y <= 12; y++) v.cylinder(0, y, 0, 7 + y * 0.12, 1, (x, yy, z) => (yy > 9 ? 0x5a2a0a : glass(0xf8e8b0)));
    v.cylinder(0, 13, 0, 9, 1, gloss(0xf4f0e8));
    v.paint(() => v.cylinder(0, 13, 0, 5, 1, gloss(0xd8a040)));
  },
};

// ------------------------------------------------------------------ vending drinks (generated from the label colours)
function drinkProp(f) {
  const a = f.art || {};
  const body = a.body ?? 0xcccccc, band = a.band ?? 0xffffff, band2 = a.band2 ?? 0x333333;
  const label = (x, y, z, h) => {
    // a front logo band + a stripe and an emblem patch facing +z; the rest in body colour
    const u = y / h;
    if (u > 0.42 && u < 0.62) return z > 0 ? band : shade(band, 0.92);
    if (u > 0.64 && u < 0.7) return band2;
    if (u > 0.18 && u < 0.36 && z > 2 && Math.abs(x) < 4) return band2;
    return body;
  };
  return {
    name: f.name, jp: f.jp, voxel: 0.005,
    build(v) {
      v.jitter = 0.012;
      const s = a.shape || 'can';
      if (s === 'can' || s === 'tall') {
        const h = s === 'tall' ? 32 : 24, r = 6.5;
        v.cylinder(0, 0, 0, r, h, (x, y, z) => gloss(label(x, y, z, h)));
        v.cylinder(0, 0, 0, r - 0.5, 1, metal(0xb8bcc0));
        v.cylinder(0, h, 0, r - 1, 1, metal(0xc8ccd2));
        v.set(0, h + 1, 2, metal(0xa8acb2)); v.set(1, h + 1, 2, metal(0xa8acb2)); // the pull tab
      } else if (s === 'mini') {
        const h = 18;
        v.cylinder(0, 0, 0, 4.5, h, (x, y, z) => (y > 5 && y < 13 ? gloss(label(x, (y - 5) * 2.2, z, h)) : glass(shade(body, 0.9))));
        v.cylinder(0, h, 0, 3, 2, glass(shade(body, 0.9)));
        v.cylinder(0, h + 2, 0, 2, 3, glass(shade(body, 0.9)));
        v.cylinder(0, h + 5, 0, 2.4, 2, metal(band2));
      } else if (s === 'cup') {
        v.cylinder(0, 0, 0, 6, 15, (x, y, z) => (y > 3 && y < 11 ? gloss(label(x, (y - 3) * 3, z, 24)) : glass(0xe8f0f0)));
        v.cylinder(0, 15, 0, 6, 1, metal(0xd8b040));
      } else { // PET bottle
        const h = 34;
        v.cylinder(0, 0, 0, 6.5, h, (x, y, z) => {
          if (y > 10 && y < 24) return gloss(label(x, (y - 10) * 1.7, z, 24));
          return glass(mix(0xe8f2f6, body, 0.35));
        });
        v.cylinder(0, h, 0, 5, 2, glass(mix(0xe8f2f6, body, 0.3)));
        v.cylinder(0, h + 2, 0, 3, 3, glass(mix(0xe8f2f6, body, 0.3)));
        v.cylinder(0, h + 5, 0, 3.4, 3, gloss(band2 === 0xffffff ? band : band2));
      }
    },
  };
}
for (const id of DRINK_IDS) P['vd_' + id.slice(3)] = drinkProp(FOODS[id]);
// the "out of order" blank sample can (used for empty slots)
P.vd_blank = drinkProp({ name: 'Can', art: { body: 0xd8dce0, band: 0xb8bcc0, band2: 0x9aa0a6 } });

// ------------------------------------------------------------------ plants (pot + stage), the tools for them
const POT = 0xb8643a, POT_D = 0x8a4628, SOIL = 0x3a2614;
function pot(v, r = 7, h = 10) {
  for (let y = 0; y < h; y++) v.cylinder(0, y, 0, r - 2 + y * 0.22, 1, (x, yy, z) => (yy === h - 1 ? POT_D : hash(x, yy, z, 9) < 0.1 ? shade(POT, 0.9) : POT));
  v.cylinder(0, h - 2, 0, r - 1.2, 1, SOIL);
}
/** stage 0 seed (bare soil + a tag), 1 sprout, 2 young, 3 grown, 4 flowering / fruiting. */
function asagao(v, st) {
  pot(v);
  v.set(4, 10, 3, 0xf4f0e0); v.set(4, 11, 3, 0xf4f0e0); v.set(4, 12, 3, 0x2a6ad8); // the name tag
  if (st < 1) { v.set(-1, 9, 0, 0x5a3a20); v.set(2, 9, -2, 0x5a3a20); return; }
  const G = 0x4ab04a, GD = 0x2f8a3a;
  if (st === 1) { v.set(0, 9, 0, G); v.set(0, 10, 0, G); v.set(-1, 11, 0, GD); v.set(1, 11, 0, GD); return; }
  // a bamboo stick, the vine winding up it
  const top = st === 2 ? 20 : 34;
  for (let y = 9; y < top + 2; y++) v.set(0, y, -3, 0xc8a860);
  for (let y = 9; y < top; y++) { const a = y * 0.7; v.set(R(Math.cos(a) * 1.5), y, R(-3 + Math.sin(a) * 1.5), G); }
  const leaf = (x, y, z) => { for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) if (Math.abs(i) + Math.abs(j) < 2 || hash(x + i, y + j, z, 2) < 0.5) v.set(x + i, y + j, z, (i + j) % 2 ? GD : G); };
  for (let y = 12; y < top - 1; y += 4) leaf(y % 8 ? -3 : 3, y, -3 + (y % 3) - 1);
  if (st >= 4) {
    // trumpet flowers: blue / purple with a white throat
    for (const [x, y, z, c] of [[-4, top - 3, -1, 0x4a5ae0], [4, top - 9, 0, 0x8a4ad0], [-3, top - 15, 1, 0x4a5ae0]]) {
      for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) if (i * i + j * j <= 5) v.set(x + i, y + j, z, (i === 0 && j === 0) ? 0xf8f8ff : c);
    }
  }
}
function tomato(v, st) {
  pot(v, 8, 11);
  if (st < 1) { v.set(0, 10, 0, 0x5a3a20); return; }
  const G = 0x3a9a3a, GD = 0x2a7a2a;
  if (st === 1) { v.set(0, 10, 0, G); v.set(-1, 11, 0, G); v.set(1, 11, 0, GD); return; }
  const top = st === 2 ? 22 : 32;
  for (let y = 10; y < top; y++) v.set(0, y, 0, GD);
  for (let y = 13; y < top; y += 3) for (let i = 1; i <= 4; i++) { const sx = (y % 2 ? 1 : -1); v.set(sx * i, y + (i > 2 ? 1 : 0), (i % 2), i > 2 ? G : GD); v.set(sx * i, y + 1, (i % 2) - 1, G); }
  if (st >= 4) for (const [x, y, z] of [[3, top - 6, 2], [-3, top - 10, 2], [2, top - 14, -2], [-2, top - 4, -1]]) v.ellipsoid(x, y, z, 1.6, 1.6, 1.6, gloss(0xd8302a));
  else if (st === 3) for (const [x, y, z] of [[3, top - 6, 2], [-3, top - 10, 2]]) v.ellipsoid(x, y, z, 1.2, 1.2, 1.2, gloss(0x7ac04a));
}
function cactus(v, st) {
  pot(v, 6, 8);
  v.cylinder(0, 6, 0, 4, 1, 0xd8c8a0); // pebbles
  if (st < 1) { v.set(0, 7, 0, 0x5a8a4a); return; }
  const h = [0, 3, 7, 11, 13][st], G = 0x4a8a4a;
  for (let y = 7; y < 7 + h; y++) v.cylinder(0, y, 0, y > 7 + h - 2 ? 2 : 3, 1, (x, yy, z) => ((x + z) % 2 ? G : shade(G, 0.85)));
  if (st >= 3) for (let y = 10; y < 14; y++) v.set(4, y, 0, G);
  if (st >= 4) for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) v.set(i, 7 + h, j, i || j ? 0xff6f91 : 0xffd23f);
}
for (let st = 0; st <= 4; st++) {
  P['plant_asagao_' + st] = { name: 'Morning Glory', jp: '朝顔', voxel: 0.01, build: (v) => { v.jitter = 0.03; asagao(v, st); } };
  P['plant_tomato_' + st] = { name: 'Tomato', jp: 'トマト', voxel: 0.01, build: (v) => { v.jitter = 0.03; tomato(v, st); } };
  P['plant_cactus_' + st] = { name: 'Cactus', jp: 'サボテン', voxel: 0.008, build: (v) => { v.jitter = 0.03; cactus(v, st); } };
}
P.watering_can = {
  name: 'Watering Can', jp: 'じょうろ', voxel: 0.008,
  build(v) {
    v.jitter = 0.02;
    const C = gloss(0x3a9ad8), D = gloss(0x2a7ab8);
    for (let y = 0; y < 14; y++) v.cylinder(0, y, 0, 7 - y * 0.1, 1, y === 13 ? D : C);
    for (let i = 0; i < 12; i++) v.set(7 + i, 4 + R(i * 0.8), 0, D); // the spout
    v.box(18, 12, -2, 19, 15, 2, metal(0xc8ccd2)); // the rose
    for (let a = 0; a <= 8; a++) { const t = a / 8 * Math.PI; v.set(R(-6 + Math.cos(t) * -1), 14 + R(Math.sin(t) * 6), 0, D); v.set(-7 + a, 14 + R(Math.sin(t) * 6), 0, D); }
  },
};
P.seed_packet = {
  name: 'Seed Packet', jp: 'たね', voxel: 0.005,
  build(v) {
    v.jitter = 0.01;
    fill(v, -8, 0, 0, 8, 22, 1, (x, y) => (y > 16 ? 0xf4f0e0 : (x + y) % 7 === 0 ? 0x2a6ad8 : y > 6 && y < 14 && Math.abs(x) < 5 ? 0x8a4ad0 : 0x58c06c));
    fill(v, -8, 22, 0, 8, 23, 1, 0xe8e0c8);
  },
};
P.fertiliser = {
  name: 'Fertiliser', jp: '肥料', voxel: 0.006,
  build(v) {
    v.jitter = 0.02;
    fill(v, -8, 0, -4, 8, 20, 4, (x, y, z) => (y > 16 ? 0xd8c8a0 : y > 6 && y < 12 && z === 4 ? 0x2a8a3a : 0xe8e0c8));
    fill(v, -7, 21, -3, 7, 22, 3, 0xc8b890);
  },
};

// ------------------------------------------------------------------ Mikawa-ya: the bread & onigiri wagon
P.mk_wagon = {
  name: 'Wagon', jp: 'ワゴン', voxel: 0.02,
  build(v) {
    v.jitter = 0.02;
    const W = 0x9a6a3e, WD = 0x6a4428;
    for (const x of [-14, 14]) for (const z of [-9, 9]) v.box(x, 0, z, x, 38, z, WD); // legs
    fill(v, -15, 12, -10, 15, 13, 10, W); // lower shelf
    fill(v, -15, 36, -10, 15, 37, 10, W); // top tray
    for (const z of [-10, 10]) fill(v, -15, 38, z, 15, 40, z, WD); // tray lips
    for (const x of [-15, 15]) fill(v, x, 38, -10, x, 40, 10, WD);
    for (const x of [-14, 14]) for (const z of [-9, 9]) v.set(x, -1, z, 0x2a2a2a); // casters
  },
};

// ------------------------------------------------------------------ the ramen shop
P.rm_stool = {
  name: 'Ramen Stool', jp: '丸椅子', voxel: 0.02,
  build(v) {
    v.jitter = 0.02;
    v.cylinder(0, 30, 0, 9, 4, (x, y) => (y === 33 ? gloss(0xc8302a) : gloss(0xa82024))); // red vinyl seat
    v.cylinder(0, 29, 0, 6, 1, metal(0xa8acb2));
    v.cylinder(0, 0, 0, 1.5, 29, metal(0xc8ccd2));
    v.cylinder(0, 0, 0, 7, 1, metal(0x9aa0a6));
  },
};
P.rm_pot = {
  name: 'Stock Pot', jp: '寸胴鍋', voxel: 0.02,
  build(v) {
    v.jitter = 0.02;
    v.tube(0, 0, 0, 10, 9, 20, metal(0xb8bcc2));
    v.cylinder(0, 0, 0, 9, 1, metal(0x9aa0a6));
    v.cylinder(0, 16, 0, 8.6, 1, (x, y, z) => (hash(x, z, 1, 2) < 0.12 ? 0xf4e8c8 : 0xc89858)); // the broth
    for (const sx of [-1, 1]) v.box(sx * 11, 16, -1, sx * 12, 17, 1, metal(0x8a9096));
  },
};
P.rm_boiler = {
  name: 'Noodle Boiler', jp: 'ゆで麺機', voxel: 0.02,
  build(v) {
    v.jitter = 0.02;
    fill(v, -18, 0, -12, 18, 40, 12, (x, y) => metal(y > 38 ? 0xd8dce0 : 0xa8acb2));
    fill(v, -16, 38, -10, 16, 40, 10, (x, y, z) => (hash(x, z, 2, 3) < 0.15 ? 0xf4f8fc : 0xb8d8e8)); // boiling water
    for (let i = 0; i < 4; i++) { // tebo baskets hanging in
      const x = -11 + i * 7.3;
      v.tube(R(x), 38, 0, 3, 2, 4, metal(0x8a9096));
      v.box(R(x), 42, 0, R(x), 52, 0, 0x6a4428);
    }
    fill(v, -18, 2, 13, 18, 6, 13, 0x2a2a2a);
  },
};
function bowl(v, broth, toppings) {
  v.jitter = 0.015;
  for (let y = 0; y < 12; y++) v.cylinder(0, y, 0, 8 + y * 0.9, 1, (x, yy, z) => {
    const r = Math.hypot(x, z);
    if (r < 7 + yy * 0.9) return yy === 0 ? 0xf4f0e8 : null;
    return yy > 8 && (R(Math.atan2(z, x) * 5) % 2 === 0) ? gloss(0xc8302a) : gloss(0xf8f4ec); // the red rim pattern
  });
  // the inside: the walls are left hollow by the null test above; fill with broth
  if (broth !== null) v.cylinder(0, 9, 0, 15, 1, (x, y, z) => (Math.hypot(x, z) <= 15.6 ? broth : null));
  for (const [x, z, c, r] of toppings || []) v.cylinder(x, 10, z, r, 1, c);
}
const NOODLE = 0xf4d890;
const BOWLS = {
  shoyu: [0x8a4a1e, [[-6, -4, 0xe8b8a0, 4], [5, -3, 0xf8e8c8, 2.5], [5, -3, 0xf4b030, 1.2], [0, 6, 0x1e2a1e, 3], [-2, 0, NOODLE, 3], [6, 5, 0x6a8a2a, 1.5]]],
  miso: [0xc8883a, [[-5, -5, 0xe8b8a0, 4], [5, 3, 0xf4d040, 2.5], [0, 7, 0xe8e8d8, 3], [-3, 1, NOODLE, 3], [6, -4, 0xfff8d0, 1.5]]],
  tonkotsu: [0xf0e4c8, [[-5, -4, 0xe8b8a0, 4], [5, -3, 0xf8e8c8, 2.5], [5, -3, 0xf4b030, 1.2], [0, 6, 0x1e2a1e, 3], [4, 4, 0x3a8a2a, 2], [-2, 1, NOODLE, 3]]],
  shio: [0xe8d8a0, [[-5, -4, 0xe8b8a0, 4], [5, 4, 0xf4e040, 1.5], [0, 6, 0x6a8a2a, 2], [-2, 0, NOODLE, 3]]],
  tantan: [0xd04a1e, [[0, 0, 0x9a5a2a, 3], [5, -4, 0x3a8a2a, 2.5], [-5, 3, NOODLE, 3], [3, 5, 0xf8e8c8, 1.5]]],
};
for (const [k, [broth, tops]] of Object.entries(BOWLS)) P['rm_bowl_' + k] = { name: 'Ramen', jp: 'らーめん', voxel: 0.006, build: (v) => bowl(v, broth, tops) };
P.rm_bowl_empty = { name: 'Bowl', jp: '丼', voxel: 0.006, build: (v) => bowl(v, 0x8a5a2a, [[3, 2, 0x8a5a2a, 2]]) };
P.rm_bowl_dirty = { name: 'Dirty Bowl', jp: '丼', voxel: 0.006, build: (v) => bowl(v, 0x6a4a2a, [[-4, 3, 0x9a7a4a, 3], [5, -2, 0xc8a870, 2]]) };
P.rm_bowl_clean = { name: 'Clean Bowl', jp: '丼', voxel: 0.006, build: (v) => bowl(v, null, []) };
P.rm_gyoza = {
  name: 'Gyoza', jp: '餃子', voxel: 0.005,
  build(v) {
    v.jitter = 0.015;
    fill(v, -18, 0, -9, 18, 1, 9, gloss(0xf4f4f0)); // the plate
    for (let i = 0; i < 6; i++) {
      const x = -14 + i * 5.6;
      for (let y = 2; y <= 5; y++) for (let z = -6; z <= 6; z++) for (let dx = -2; dx <= 2; dx++) {
        if (Math.abs(z) > 6 - (y - 2) * 1.2 || Math.abs(dx) > 2 - (y > 4 ? 1 : 0)) continue;
        v.set(R(x + dx), y, z, y === 2 ? 0x9a5a1e : y === 3 && hash(x, z, 1, 1) < 0.5 ? 0xd8a050 : 0xf4e8c8);
      }
    }
  },
};
P.rm_rice = {
  name: 'Rice', jp: 'ライス', voxel: 0.005,
  build(v) {
    v.jitter = 0.015;
    for (let y = 0; y < 10; y++) v.cylinder(0, y, 0, 6 + y * 0.6, 1, (x, yy, z) => (Math.hypot(x, z) < 5 + yy * 0.6 ? null : gloss(yy > 7 ? 0x2a4a8a : 0xf4f0e8)));
    v.ellipsoid(0, 9, 0, 10, 4, 10, (x, y, z) => (y < 9 ? null : hash(x, y, z, 7) < 0.2 ? 0xe8e4dc : 0xfaf8f2));
  },
};
P.rm_chashu = {
  name: 'Chashu Bowl', jp: 'チャーシュー丼', voxel: 0.005,
  build(v) {
    v.jitter = 0.015;
    for (let y = 0; y < 10; y++) v.cylinder(0, y, 0, 7 + y * 0.6, 1, (x, yy, z) => (Math.hypot(x, z) < 6 + yy * 0.6 ? null : gloss(yy > 7 ? 0x1e1e1e : 0xc8302a)));
    v.cylinder(0, 9, 0, 11, 2, (x, y, z) => (hash(x, z, 1, 3) < 0.6 ? 0xb06a3a : y === 10 && hash(x, z, 2, 3) < 0.2 ? 0x4a9a3a : 0x8a4a1e));
  },
};
P.rm_beer = {
  name: 'Beer Bottle', jp: '瓶ビール', voxel: 0.006,
  build(v) {
    v.jitter = 0.01;
    v.cylinder(0, 0, 0, 6, 30, (x, y, z) => (y > 10 && y < 20 && z > 0 ? gloss(y > 13 && y < 17 ? 0x1e2a6a : 0xf4e8c0) : glass(0x6a3a10)));
    v.cylinder(0, 30, 0, 4, 4, glass(0x6a3a10));
    v.cylinder(0, 34, 0, 2, 10, glass(0x6a3a10));
    v.cylinder(0, 44, 0, 2.4, 2, metal(0xd8b040));
    // the little glass beside it
    v.cylinder(12, 0, 0, 3.5, 12, (x, y) => (y < 10 ? glass(0xf4c040) : glass(0xfaf8f0)));
  },
};
P.rm_sake = {
  name: 'Sake Flask', jp: '徳利', voxel: 0.005,
  build(v) {
    v.jitter = 0.01;
    for (let y = 0; y < 26; y++) { const r = y < 14 ? 5 + Math.sin(y / 14 * Math.PI) * 2 : Math.max(2, 6 - (y - 14) * 0.4); v.cylinder(0, y, 0, r, 1, gloss(y > 18 && y < 21 ? 0x1e3a6a : 0xf4f0e4)); }
    v.cylinder(10, 0, 0, 3, 5, (x, y) => gloss(y === 0 ? 0xe8e0d0 : 0xf4f0e4));
  },
};
P.rm_oolong = {
  name: 'Oolong Tea', jp: '烏龍茶', voxel: 0.005,
  build(v) { v.jitter = 0.01; v.tube(0, 0, 0, 5, 4, 24, glass(0xe8e0c8)); v.cylinder(0, 1, 0, 4, 20, glass(0x9a5a1e)); v.cylinder(0, 0, 0, 5, 1, glass(0xe8e0c8)); },
};
P.rm_lantern = {
  name: 'Red Lantern', jp: '赤提灯', voxel: 0.02,
  build(v) {
    v.jitter = 0.02;
    for (let y = 0; y < 30; y++) {
      const r = 8 + Math.sin(y / 30 * Math.PI) * 4;
      v.cylinder(0, y, 0, r, 1, (x, yy, z) => (yy % 5 === 0 ? glow(0xa8201e) : glow(0xe8402a)));
    }
    v.cylinder(0, -1, 0, 7, 2, 0x1e1e1e); v.cylinder(0, 30, 0, 7, 2, 0x1e1e1e);
    v.box(0, 32, 0, 0, 36, 0, 0x1e1e1e);
  },
};
P.rm_sink = {
  name: 'Sink', jp: 'シンク', voxel: 0.02,
  build(v) {
    v.jitter = 0.02;
    fill(v, -22, 0, -14, 22, 42, 14, (x, y) => metal(y > 40 ? 0xd8dce0 : 0xb8bcc2));
    fill(v, -18, 30, -10, 18, 42, 10, () => null); // the basin
    for (let x = -18; x <= 18; x++) for (let z = -10; z <= 10; z++) v.remove(x, 42, z);
    fill(v, -18, 29, -10, 18, 29, 10, metal(0x9aa0a6));
    v.paint(() => fill(v, -16, 29, -8, 16, 29, 8, (x, z) => metal(0x8a9096)));
    // the tap
    v.box(0, 42, -13, 0, 58, -13, metal(0xd8dce0));
    v.box(0, 58, -13, 0, 58, -5, metal(0xd8dce0));
    v.box(0, 55, -5, 0, 57, -5, metal(0xd8dce0));
    v.box(-3, 50, -13, 3, 51, -13, gloss(0x2a6ad8));
  },
};
P.rm_rack = {
  name: 'Dish Rack', jp: '水切りかご', voxel: 0.01,
  build(v) {
    v.jitter = 0.02;
    for (let x = -20; x <= 20; x += 4) for (let y = 0; y <= 14; y++) { v.set(x, y, -10, metal(0xc8ccd2)); v.set(x, y, 10, metal(0xc8ccd2)); }
    for (let z = -10; z <= 10; z += 4) for (let x = -20; x <= 20; x++) v.set(x, 0, z, metal(0xc8ccd2));
    for (let x = -20; x <= 20; x++) { v.set(x, 14, -10, metal(0xd8dce0)); v.set(x, 14, 10, metal(0xd8dce0)); }
  },
};
P.rm_sponge = {
  name: 'Sponge', jp: 'スポンジ', voxel: 0.005,
  build(v) { v.jitter = 0.02; fill(v, -7, 0, -4, 7, 3, 4, 0xf4d040); fill(v, -7, 4, -4, 7, 5, 4, 0x3a9a4a); },
};
P.rm_ticket = {
  name: 'Meal Ticket', jp: '食券', voxel: 0.003,
  build(v) { fill(v, -9, 0, 0, 9, 13, 0, (x, y) => (y > 9 ? 0x2a6ad8 : (x + y) % 9 === 0 ? 0x8a8a8a : 0xf4f0e4)); },
};

export default P;
