// Series 4 — Shōwa Retro Appliances (昭和レトロ家電)
// Nostalgic 1960s–80s Japanese home appliances in miniature, the kind found in grandma's house.
import { C, shade, mix } from '../../voxel/palette.js';
import { gloss, metal, glow, glass, enc } from '../../voxel/VoxelModel.js';

const K = C.ink;
const W = 0xffffff;

/** Deterministic 0..1 noise from integer coordinates. */
function hash(x, y, z) {
  let h = (x * 374761393 + y * 668265263 + z * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/**
 * Recolour the outer skin of a round (vertical-axis) body. u = position around the body
 * (0 at the front, n steps per full turn), fn(u, y, colour, x, z) -> new colour or undefined.
 * The voxel's material is kept unless fn returns an already-encoded value.
 */
function wrap(v, cx, cz, rMin, n, fn) {
  v.recolor((x, y, z, c, m) => {
    const dx = x - cx, dz = z - cz;
    if (Math.hypot(dx, dz) < rMin) return undefined;
    const u = Math.round((Math.atan2(dx, dz) / (Math.PI * 2)) * n);
    const nc = fn(u, y, c, x, z);
    if (nc === undefined || nc === null) return undefined;
    return nc >= 0x1000000 ? nc : enc(nc, m);
  });
}

/** Small triangular ear made of stacked slabs (front at z). */
function ear(v, x, y, z, color, inner, h = 3, w = 3) {
  for (let i = 0; i < h; i++) {
    const ww = Math.max(1, Math.round(w * (1 - i / h)));
    v.box(x - Math.floor(ww / 2), y + i, z, x + Math.ceil(ww / 2) - 1, y + i, z - 1, color);
    if (inner && i < h - 1 && ww > 2) v.set(x, y + i, z, inner);
  }
}

export default {
  id: 'showa',
  order: 4,
  name: 'Shōwa Retro Appliances',
  jp: '昭和レトロ家電',
  tagline: "Tiny treasures from grandma's house",
  taglineJp: 'なつかしい！おばあちゃん家の家電',
  price: 300,
  themes: ['retro', 'home'],
  card: { bg: '#f6e6c4', accent: '#d8692e', text: '#4a2a17', accent2: '#3f9a8c', pattern: 'checker' },
  capsule: { colors: [0xe9b43c, 0xd8692e, 0x5fb3a3, 0xf3e2c0, 0x9aa84a] },
  items: [
    // ------------------------------------------------------------------ common
    {
      id: 'suihanki', name: 'Flower Rice Cooker', jp: '花柄炊飯器', rarity: 'common',
      desc: 'Every Shōwa kitchen had one. The flowers make the rice 12% fluffier.',
      build(v) {
        const body = 0xfbf1dc, lid = 0xf1e2c2;
        // foot + barrel body
        v.cylinder(0, 0, 0, 7, 1, C.darkbrown);
        v.cylinder(0, 1, 0, 7.6, 1, gloss(body));
        v.cylinder(0, 2, 0, 8, 9, gloss(body));
        v.cylinder(0, 11, 0, 7.6, 1, gloss(body));
        v.cylinder(0, 12, 0, 8, 1, metal(C.chrome)); // chrome rim
        // domed lid + knob + steam vent
        v.shape(-8, 13, -8, 8, 16, 8, (x, y, z) => (x / 7.7) ** 2 + ((y - 12) / 4.5) ** 2 + (z / 7.7) ** 2 <= 1, gloss(lid));
        v.paint(() => v.cylinder(0, 13, 0, 8, 1, gloss(0xf2b56b))); // orange lid band
        v.box(-1, 17, -1, 1, 17, 1, gloss(C.darkbrown));
        v.set(0, 18, 0, gloss(C.darkbrown));
        v.project(['KKK'], { K: C.charcoal }, -1, 4, '+y');
        // retro flower print all around the barrel
        const petals = [0xf08a3a, 0xe0524a], centre = 0x8a4a1a, leaf = 0x7aa84a;
        wrap(v, 0, 0, 7.2, 48, (u, y, c) => {
          if (c !== body || y < 2 || y > 10) return undefined;
          const row = y >= 6 ? 1 : 0, cy = row ? 8 : 4;
          let du = ((u - (row ? 4 : 0)) % 8 + 8) % 8;
          if (du > 4) du -= 8;
          const dy = y - cy;
          const d = Math.abs(du) + Math.abs(dy);
          if (d === 0) return centre;
          if (d === 1) return mix(petals[row], 0xffe0a0, 0.35);
          if (d === 2) return petals[row];
          if ((du === 3 && dy === -1) || (du === -3 && dy === 1)) return leaf;
          return undefined;
        });
        v.paint(() => { v.cylinder(0, 1, 0, 8, 1, gloss(0xe0a46a)); });
        // front control panel: lever switch + cook / keep-warm lamps
        v.box(-2, 3, 8, 2, 7, 9, gloss(0xd9c49a));
        v.paint(() => v.box(-2, 3, 9, 2, 3, 9, gloss(0xb89a6a)));
        v.set(-1, 6, 9, glow(0xff4a30)); v.set(1, 6, 9, glow(0xffc23a));
        v.box(0, 3, 9, 0, 5, 9, C.charcoal);
        v.box(0, 5, 10, 0, 5, 10, gloss(C.charcoal)); v.set(0, 5, 11, gloss(C.orange)); // cook lever
        // carry handle
        const hc = gloss(0x6b3a1e);
        for (const z of [-1, 0, 1]) {
          v.line(-9, 12, z, -9, 16, z, hc); v.line(-9, 16, z, -7, 19, z, hc);
          v.line(-7, 19, z, 7, 19, z, hc);
          v.line(7, 19, z, 9, 16, z, hc); v.line(9, 16, z, 9, 12, z, hc);
        }
        v.box(-9, 11, -1, -8, 13, 1, metal(C.chrome)); v.box(8, 11, -1, 9, 13, 1, metal(C.chrome));
        // rice paddle in its holder (front-right)
        v.box(5, 4, 6, 7, 8, 7, gloss(lid));
        v.box(6, 8, 6, 6, 9, 6, C.white);
        v.ellipsoid(6, 11.5, 6, 0.4, 2.3, 1.4, gloss(C.white));
      },
    },
    {
      id: 'kurodenwa', name: 'Black Rotary Phone', jp: '黒電話', rarity: 'common',
      desc: 'Dialling a zero takes so long you forget who you were calling.',
      build(v) {
        // crocheted lace doily
        v.shape(-12, 0, -12, 12, 0, 12, (x, y, z) => {
          const r = Math.hypot(x, z), a = Math.atan2(z, x);
          if (r > 10.4 + 1.1 * Math.cos(a * 12)) return false;
          if (r > 7.5 && r < 8.9 && Math.cos(a * 12 + Math.PI) > 0.35) return false;
          if (r > 4.5 && r < 5.6 && Math.cos(a * 16) > 0.6) return false;
          return true;
        }, C.white);
        const ph = gloss(0x1e1b1e), ph2 = gloss(0x2c282c);
        // body: wide base tapering to a sloped dial face
        v.shape(-7, 1, -6, 7, 9, 6, (x, y, z) => {
          const hw = y <= 3 ? 7 : y <= 7 ? 6 : 5;
          const zf = y <= 2 ? 6 : y <= 4 ? 5 : y <= 6 ? 4 : y <= 8 ? 3 : 2;
          const zb = y <= 6 ? -6 : -5;
          if (Math.abs(x) > hw || z > zf || z < zb) return false;
          if (Math.abs(x) === hw && (z === zf || z === zb)) return false;
          return true;
        }, ph);
        v.paint(() => v.box(-7, 1, -6, 7, 1, 6, ph2));
        // rotary dial, embossed on the slope
        v.project([
          '..SSSSS..',
          '.SWKWKWS.',
          'SWKKKKKWS',
          'SKKWWWKKS',
          'SWKWRWKWS',
          'SKKWWWKKS',
          'SWKKKKKMS',
          '.SWKWKMS.',
          '..SSSSS..',
        ], { S: metal(C.silver), W: gloss(C.white), K: ph, R: gloss(C.red), M: metal(C.chrome) }, -4, 9, '+z', { raise: true });
        // cradle prongs
        for (const sx of [-1, 1]) {
          v.box(sx * 4, 10, -4, sx * 5, 10, 0, ph);
          v.set(sx * 5, 11, -4, ph); v.set(sx * 5, 11, 0, ph);
        }
        // handset with ear / mouth cups
        v.box(-6, 11, -3, 6, 12, -1, ph);
        v.paint(() => v.box(-6, 12, -3, 6, 12, -1, ph2));
        v.ellipsoid(-8, 11, -2, 2.2, 1.8, 2.2, ph); v.ellipsoid(8, 11, -2, 2.2, 1.8, 2.2, ph);
        v.box(-10, 9, -4, -6, 9, 0, null); v.box(6, 9, -4, 10, 9, 0, null); // flatten cup bottoms
        v.box(-9, 10, -3, -7, 10, -1, ph2); v.box(7, 10, -3, 9, 10, -1, ph2);
        // coiled cord down the left side
        let prev = null;
        for (let i = 0; i <= 34; i++) {
          const a = i * 1.1;
          const p = [Math.round(-10 + Math.cos(a) * 1.2), Math.round(9 - i * 0.24), Math.round(-2 + Math.sin(a) * 1.2)];
          if (prev) v.line(prev[0], prev[1], prev[2], p[0], p[1], p[2], ph);
          prev = p;
        }
        v.line(-10, 1, -2, -7, 1, -2, ph);
        // memo pad + pencil on the doily
        v.box(-9, 1, 3, -6, 1, 6, C.paper);
        v.paint(() => { v.box(-9, 1, 4, -6, 1, 4, C.pastelBlue); v.box(-9, 1, 6, -6, 1, 6, C.pastelBlue); });
        v.box(-9, 2, 5, -6, 2, 5, gloss(C.yellow)); v.set(-5, 2, 5, C.woodLight); v.set(-10, 2, 5, C.pink);
      },
    },
    {
      id: 'senpuki', name: 'Piano-Key Fan', jp: '扇風機', rarity: 'common',
      desc: 'Talk into the blades: "We... are... aliens..." Every kid did it.',
      build(v) {
        const bodyC = 0xf4efe2, trim = 0x6cc3b8, wire = gloss(0xd9dde2);
        // oval base with piano keys
        v.shape(-9, 0, -7, 9, 1, 7, (x, y, z) => (x / 9.3) ** 2 + (z / 7.3) ** 2 <= 1, gloss(trim));
        v.shape(-8, 2, -6, 8, 2, 6, (x, y, z) => (x / 8.2) ** 2 + (z / 6.2) ** 2 <= 1, gloss(bodyC));
        v.paint(() => v.shape(-9, 0, -7, 9, 0, 7, () => true, gloss(shade(trim, 0.8))));
        [-3, -1, 1, 3].forEach((x, i) => v.box(x, 3, 2, x, i === 1 ? 2 : 3, 5, gloss(i === 3 ? C.red : C.white)));
        v.cylinder(6, 3, 1, 1, 1, gloss(C.charcoal)); // timer knob
        v.set(6, 4, 1, gloss(C.charcoal));
        // pole
        v.cylinder(0, 3, -2, 2, 2, gloss(trim));
        v.cylinder(0, 5, -2, 1, 9, gloss(bodyC));
        v.cylinder(0, 9, -2, 1.5, 1, metal(C.chrome));
        // yoke + motor housing
        const cy = 19;
        v.line(0, 13, -2, 0, 16, -4, gloss(bodyC), 1);
        v.ellipsoid(0, cy, -4.5, 3.4, 3.4, 2.6, gloss(bodyC));
        v.paint(() => v.box(-4, cy - 4, -8, 4, cy + 4, -7, gloss(trim)));
        v.cylinder(0, cy + 3, -5, 1, 2, gloss(trim)); // oscillation knob
        v.set(0, cy + 5, -5, gloss(C.charcoal));
        // translucent blue blades
        v.shape(-8, cy - 8, -1, 8, cy + 8, -1, (x, y) => {
          const dx = x, dy = y - cy, r = Math.hypot(dx, dy);
          if (r < 1.5 || r > 7.6) return false;
          const a = (((Math.atan2(dy, dx) / (Math.PI * 2) + r * 0.025) * 3) % 1 + 1) % 1;
          return a < 0.6;
        }, (x, y) => gloss(Math.hypot(x, y - cy) > 6.2 ? 0x8fd0ff : 0x52aef0));
        v.cylinder(0, cy, -2, 1.6, 2, gloss(bodyC), 'z'); // hub
        // wire guard: back ring, front ring, side straps, front spokes
        v.torus(0, cy, -3, 8.4, 0.5, wire, 'z');
        v.torus(0, cy, 1, 8.4, 0.5, wire, 'z');
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
          const ex = Math.round(Math.cos(a) * 8.4), ey = Math.round(Math.sin(a) * 8.4);
          v.line(ex, cy + ey, -3, ex, cy + ey, 1, wire);
          v.line(Math.round(Math.cos(a) * 2), cy + Math.round(Math.sin(a) * 2), 1, ex, cy + ey, 1, wire);
          if (k % 2 === 0) v.line(Math.round(Math.cos(a) * 3), cy + Math.round(Math.sin(a) * 3), -3, ex, cy + ey, -3, wire);
        }
        // centre badge
        v.cylinder(0, cy, 1, 1.6, 2, gloss(trim), 'z');
        v.box(0, cy, 2, 0, cy, 3, metal(C.chrome));
        // little paper streamer tied to the guard, fluttering in the breeze
        v.line(2, cy + 8, 1, 3, cy + 8, 3, gloss(C.red));
        v.line(3, cy + 8, 3, 3, cy + 9, 5, gloss(C.red));
        v.set(4, cy + 9, 5, gloss(C.white));
      },
    },
    // ---------------------------------------------------------------- uncommon
    {
      id: 'terebi', name: 'Wooden TV on Legs', jp: '家具調テレビ', rarity: 'uncommon',
      desc: 'Smack the side twice for a clearer picture. Grandpa\'s official method.',
      build(v) {
        const wood = gloss(C.wood), woodD = gloss(C.woodDark);
        // splayed legs with brass caps
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
          v.line(sx * 10, 0, sz * 4, sx * 9, 4, sz * 3, woodD);
          v.line(sx * 10, 1, sz * 4, sx * 9, 4, sz * 4, woodD);
          v.set(sx * 10, 0, sz * 4, metal(C.brass));
        }
        // cabinet with wood grain
        v.box(-11, 5, -6, 11, 21, 5, wood);
        v.box(-11, 5, -6, 11, 5, 5, woodD);
        v.paint(() => {
          for (let y = 6; y <= 21; y++) for (let x = -11; x <= 11; x++) {
            if (hash(x >> 2, y, 3) < 0.22) { v.set(x, y, -6, gloss(shade(C.wood, 0.85))); }
          }
          for (let z = -6; z <= 5; z++) for (let y = 6; y <= 21; y++) {
            if (hash(z >> 2, y, 7) < 0.25) { v.set(-11, y, z, gloss(shade(C.wood, 0.85))); v.set(11, y, z, gloss(shade(C.wood, 0.85))); }
          }
          for (let z = -6; z <= 5; z++) for (let x = -11; x <= 11; x++) {
            if (hash(x >> 2, z, 11) < 0.2) v.set(x, 21, z, gloss(shade(C.wood, 0.86)));
          }
        });
        v.box(-11, 21, 5, 11, 21, 5, woodD);
        // CRT: dark bezel, recessed screen with a bulge, colour bars
        const scr = (x, y) => x >= -9 && x <= 3 && y >= 8 && y <= 18 && !((x === -9 || x === 3) && (y === 8 || y === 18));
        v.shape(-10, 7, 5, 4, 19, 5, (x, y) => !((x === -10 || x === 4) && (y === 7 || y === 19)), gloss(C.charcoal));
        v.shape(-9, 8, 5, 3, 18, 5, (x, y) => scr(x, y) && !(x >= -7 && x <= 1 && y >= 10 && y <= 16), null);
        const bars = [0xf2f2ea, 0xf0dc3c, 0x3cd8e4, 0x46d05a, 0xe04cc8, 0xe8443c, 0x4456e8];
        const barAt = (x, y) => {
          if (y <= 9) return [0x23306a, W, 0x2a1850, 0x111111, 0x111111, 0x2a2a2a][Math.min(5, Math.floor((x + 9) / 2.2))];
          return bars[Math.min(6, Math.floor((x + 9) / 1.9))];
        };
        v.shape(-9, 8, 4, 3, 18, 5, (x, y, z) => scr(x, y) && (z === 4 || (x >= -7 && x <= 1 && y >= 10 && y <= 16)), (x, y) => glow(barAt(x, y)));
        // control panel: channel dial, volume knob, speaker grille
        v.box(6, 7, 5, 10, 19, 5, gloss(0xd9c49a));
        v.project(['T.T.T', '.....', 'T...T', '.....', 'T.T.T'], { T: C.darkbrown }, 6, 18);
        v.box(7, 15, 6, 9, 17, 6, gloss(C.charcoal));
        v.box(8, 15, 7, 8, 17, 7, gloss(C.charcoal));
        v.set(8, 17, 7, gloss(C.white));
        v.box(7, 12, 6, 9, 12, 6, gloss(C.charcoal)); v.box(8, 11, 6, 8, 13, 6, gloss(C.charcoal));
        v.set(8, 12, 7, metal(C.chrome));
        v.paint(() => { for (let y = 7; y <= 10; y++) v.box(6, y, 5, 10, y, 5, y % 2 ? gloss(0x6b4a2a) : gloss(0xb89060)); });
        v.box(-4, 6, 6, 0, 6, 6, metal(C.brass)); // little nameplate
        // back vents
        v.paint(() => { for (let y = 9; y <= 18; y += 3) v.box(-7, y, -6, 7, y, -6, C.charcoal); });
        // lace doily on top, hanging over the front edge
        v.shape(-9, 22, -4, 1, 22, 4, (x, y, z) => !((x + z) % 3 === 0 && Math.abs(x + 4) < 4 && Math.abs(z) < 3) && !((x === -9 || x === 1) && (z === -4 || z === 4)), C.white);
        for (let x = -9; x <= 1; x++) v.set(x, 21, 6, C.white);
        for (let x = -8; x <= 1; x += 2) v.set(x, 20, 6, C.white);
        // kokeshi doll
        v.cylinder(-6, 23, 0, 1.3, 4, gloss(C.red));
        v.paint(() => { v.set(-6, 24, 1, gloss(C.yellow)); v.set(-5, 25, 1, gloss(C.yellow)); v.set(-7, 25, 1, gloss(C.yellow)); v.cylinder(-6, 23, 0, 1.3, 1, gloss(C.black)); });
        v.sphere(-6, 28.5, 0, 2, C.skin);
        v.paint(() => { v.ellipsoid(-6, 29.5, -0.5, 2.2, 1.6, 2.2, gloss(C.black)); });
        v.project(['K.K', '...', '.M.'], { K: K, M: C.red }, -7, 28);
        v.project(['P...P'], { P: C.blush }, -8, 27);
        // rabbit-ear antenna
        v.box(4, 22, -3, 7, 22, -1, gloss(C.charcoal));
        v.box(5, 23, -3, 6, 23, -1, gloss(C.charcoal));
        v.line(5, 24, -2, 1, 30, -2, metal(C.chrome));
        v.line(6, 24, -2, 10, 30, -2, metal(C.chrome));
        v.set(1, 31, -2, metal(C.chrome)); v.set(10, 31, -2, metal(C.chrome));
      },
    },
    {
      id: 'sentakuki', name: 'Twin-Tub Washer', jp: '二槽式洗濯機', rarity: 'uncommon',
      desc: 'Wash on the left, spin on the right, lose one sock somewhere in between.',
      build(v) {
        const top = gloss(C.white), blue = gloss(0x9fd0e8), blueD = gloss(0x6fb0d4);
        v.box(-11, 0, -5, 11, 0, 5, C.charcoal);                 // plinth
        v.box(-12, 1, -6, 12, 11, 6, blue);                        // coloured lower body
        v.box(-12, 12, -6, 12, 12, 6, metal(C.chrome));            // chrome trim
        v.box(-12, 13, -6, 12, 15, 6, top);                        // white top
        for (const sx of [-12, 12]) for (const sz of [-6, 6]) v.box(sx, 0, sz, sx, 15, sz, null); // soften corners
        v.paint(() => v.box(-12, 1, -6, 12, 1, 6, blueD));
        // wavy decoration + badge on the front
        v.project(['.WW...WW...WW...WW...WW.', 'W..W.W..W.W..W.W..W.W..W'], { W: gloss(C.white) }, -12, 4);
        v.box(-3, 8, 7, 3, 9, 7, gloss(0xdfe3e8));
        v.box(-2, 9, 7, -1, 9, 7, gloss(C.navy)); v.box(1, 8, 7, 2, 8, 7, gloss(C.red)); v.set(0, 9, 7, gloss(C.navy)); v.set(0, 8, 7, gloss(C.red));
        // control console at the back
        v.box(-12, 16, -6, 12, 18, -4, top);
        v.paint(() => v.box(-12, 16, -6, 12, 16, -4, gloss(C.offwhite)));
        for (const [kx, kc] of [[-8, C.navy], [-3, C.orange], [7, C.navy]]) {
          v.box(kx - 1, 16, -3, kx + 1, 18, -3, gloss(kc));
          v.box(kx, 16, -2, kx, 18, -2, gloss(shade(kc, 1.25)));
          v.set(kx, 18, -2, gloss(C.white));
          v.project(['T.T.T'], { T: C.gray }, kx - 2, 18, '-z');
        }
        // washing tub (left): open, full of foam
        v.box(-10, 5, -3, -2, 15, 4, null);
        v.box(-10, 5, -3, -2, 11, 4, gloss(0x7ec8ee));
        v.paint(() => v.shape(-11, 5, -4, -1, 15, 5, (x, y, z) => x === -11 || x === -1 || z === -4 || z === 5, gloss(0xc2d0d8)));
        v.paint(() => v.shape(-11, 15, -4, -1, 15, 5, (x, y, z) => x === -11 || x === -1 || z === -4 || z === 5, gloss(0x9aa8b2)));
        v.box(-10, 11, -3, -2, 11, 4, gloss(0x6cc0f0));
        v.paint(() => v.shape(-10, 11, -3, -2, 11, 4, (x, y, z) => hash(x, y, z) < 0.25, gloss(0xa8e0ff)));
        const foam = [[-6, 12.5, 0.5, 2.4], [-4.5, 13.5, 2, 1.7], [-7.5, 13.5, -1, 1.7], [-6, 15, 0.5, 2],
          [-5, 16.8, 1, 1.4], [-7, 16.6, 0, 1.2], [-6, 18.2, 0.5, 1]];
        foam.forEach(([x, y, z, r], i) => v.sphere(x, y, z, r, i % 2 ? 0xf4f8fb : C.white));
        v.sphere(-3.6, 15.5, 2.6, 1.2, glass(0xd8c8ff));
        v.sphere(-8, 17.5, -0.5, 1.1, glass(0xbfe8ff));
        v.sphere(-5, 19.6, 0.5, 0.9, glass(0xffd8f0));
        // a striped sock hanging over the front rim
        const sock = (y) => (y % 2 ? gloss(C.red) : gloss(C.white));
        for (let y = 12; y <= 15; y++) v.box(-7, y, 4, -6, y, 4, sock(y));
        v.box(-7, 16, 4, -6, 16, 6, sock(16));
        for (let y = 9; y <= 15; y++) v.box(-7, y, 7, -6, y, 7, sock(y));
        v.box(-7, 8, 7, -6, 8, 8, gloss(C.navy)); v.box(-7, 9, 8, -6, 9, 8, gloss(C.navy));
        // spin tub (right): closed lid with handle
        v.paint(() => v.box(2, 15, -3, 10, 15, 4, gloss(0xe6edf0)));
        v.paint(() => { v.box(3, 15, -2, 9, 15, 3, gloss(0xf4f8fa)); });
        v.box(5, 16, 3, 7, 16, 3, gloss(C.lightgray));
        // back: rating plate + power cord
        v.paint(() => { v.box(-9, 6, -6, -4, 9, -6, gloss(C.offwhite)); v.box(-8, 8, -6, -5, 8, -6, gloss(C.gray)); v.box(-8, 7, -6, -6, 7, -6, gloss(C.lightgray)); });
        v.line(6, 3, -7, 6, 1, -8, gloss(C.charcoal)); v.line(6, 1, -8, 9, 0, -9, gloss(C.charcoal));
        v.box(9, 0, -10, 10, 1, -10, gloss(C.white)); v.set(9, 2, -10, metal(C.chrome)); v.set(10, 2, -10, metal(C.chrome));
        // drain hose curled on the floor
        v.line(-13, 4, 2, -13, 1, 4, gloss(C.gray));
        v.line(-13, 1, 4, -12, 0, 7, gloss(C.gray));
        v.line(-12, 0, 7, -8, 0, 8, gloss(C.gray));
        v.set(-13, 5, 2, gloss(C.gray));
      },
    },
    // -------------------------------------------------------------------- rare
    {
      id: 'rajikase', name: 'Radio-Cassette Boombox', jp: 'ラジカセ', rarity: 'rare',
      desc: 'Holds one mixtape, taped off the radio, with the DJ talking over the intro.',
      build(v) {
        const shell = gloss(0x2a2a2f), plate = gloss(0xc4c8cf), chrome = metal(C.chrome);
        // body
        v.box(-13, 1, -4, 13, 15, 4, shell);
        for (const sx of [-13, 13]) for (const sy of [1, 15]) v.box(sx, sy, -4, sx, sy, 4, null);
        v.box(-12, 2, 4, 12, 14, 4, plate);
        for (const sx of [-12, 12]) v.box(sx, 0, -3, sx - Math.sign(sx) * 2, 0, 3, gloss(C.charcoal)); // feet
        // speakers
        for (const sx of [-1, 1]) {
          const cx = sx * 8.5;
          v.cylinder(cx, 6.5, 4, 4, 1, gloss(0x202024), 'z');
          v.paint(() => v.shape(cx - 4, 2, 4, cx + 4, 11, 4, (x, y) => ((x + y) & 1) === 0, gloss(0x3a3a40)));
          v.tube(cx, 6.5, 5, 4.2, 3.3, 1, chrome, 'z');
          v.tube(cx, 6.5, 5, 2.4, 1.6, 1, gloss(0x48484e), 'z');
          v.cylinder(cx, 6.5, 5, 1, 1, chrome, 'z');
          // tweeter
          v.cylinder(cx + sx * 2, 12.5, 5, 0.8, 1, chrome, 'z');
        }
        // tuner strip with glowing dial
        v.box(-11, 12, 4, 11, 13, 4, glow(0xffb347));
        for (let x = -10; x <= 10; x += 2) v.set(x, 13, 4, glow(0xd67a1c));
        v.box(2, 12, 4, 2, 13, 4, glow(0xff3020));
        v.box(-12, 12, 5, -12, 13, 5, chrome); v.box(12, 12, 5, 12, 13, 5, chrome);
        // VU meters
        v.box(-3, 11, 4, -1, 11, 4, glow(0xc8ff9a)); v.box(1, 11, 4, 3, 11, 4, glow(0xc8ff9a));
        v.set(-2, 11, 4, glow(0xff5030)); v.set(2, 11, 4, glow(0xff5030));
        // cassette door with window
        v.box(-4, 2, 4, 4, 10, 4, gloss(0x55565c));
        v.box(-3, 3, 3, 3, 9, 4, null);
        v.layer([
          'LLLLLLL',
          'OOOOOOO',
          'LWTTTWL',
          'LTTTTTL',
          'DDDDDDD',
        ], { L: C.cream, O: C.orange, W: C.white, T: 0x5a3a28, D: C.gray }, { x: -3, y: 8, z: 3 });
        v.box(-3, 3, 3, 3, 3, 3, C.darkgray); v.box(-3, 9, 3, 3, 9, 3, C.darkgray);
        v.box(-3, 4, 4, 3, 8, 4, glass(0xdfe8f0));
        v.box(-1, 2, 5, 1, 2, 5, chrome); // eject
        // piano keys + knobs on top
        [-5, -3, -1, 1, 3, 5].forEach((x, i) => v.box(x, 16, 1, x, 16, 3, i === 0 ? gloss(C.red) : chrome));
        v.box(7, 16, 2, 8, 17, 3, gloss(C.charcoal)); v.box(10, 16, 2, 11, 17, 3, gloss(C.charcoal));
        v.set(7, 17, 3, chrome); v.set(10, 17, 3, chrome);
        // carry handle
        for (const sx of [-10, 10]) v.box(sx, 16, -2, sx, 17, -1, chrome);
        v.box(-10, 18, -2, 10, 18, -1, chrome);
        v.box(-7, 19, -2, 7, 19, -1, gloss(C.charcoal));
        // back: battery door, vent slots, spec sticker
        v.box(-9, 3, -5, 9, 8, -5, gloss(0x3a3a40));
        v.paint(() => { for (let x = -8; x <= 8; x += 2) v.box(x, 4, -5, x, 7, -5, gloss(0x232328)); });
        v.box(-1, 8, -6, 1, 8, -6, gloss(0x3a3a40));
        v.paint(() => { for (let y = 11; y <= 13; y++) for (let x = -11; x <= -4; x += 2) v.set(x + (y & 1), y, -4, C.black); });
        v.paint(() => v.box(4, 10, -4, 9, 13, -4, C.paper));
        v.paint(() => { v.box(5, 12, -4, 8, 12, -4, C.gray); v.box(5, 11, -4, 7, 11, -4, C.lightgray); });
        // telescopic antenna
        v.box(11, 16, -3, 12, 16, -2, gloss(C.charcoal));
        v.line(12, 17, -3, 9, 22, -3, chrome);
        v.line(11, 17, -3, 8, 22, -3, chrome);
        v.line(8, 23, -3, 5, 28, -3, chrome);
        v.set(5, 29, -3, chrome);
      },
    },
    // ------------------------------------------------------------------- ultra
    {
      id: 'kotatsu', name: 'Kotatsu & Mikan', jp: 'こたつとみかん', rarity: 'ultra',
      desc: 'Once you get in, you never get out. The cat figured this out years ago.',
      build(v) {
        // tatami mat with cloth borders
        v.box(-13, 0, -12, 13, 1, 13, 0xcfc683);
        v.paint(() => {
          for (let z = -12; z <= 13; z += 2) v.box(-11, 1, z, 11, 1, z, 0xbdb470);
          v.box(-13, 0, -12, -12, 1, 13, 0x2f4030); v.box(12, 0, -12, 13, 1, 13, 0x2f4030);
          for (let z = -11; z <= 13; z += 3) { v.set(-13, 1, z, 0xc8b070); v.set(13, 1, z, 0xc8b070); }
        });
        // quilted futon draped over the frame, plaid pattern
        const fz = -1;
        const base = 0xe2763a, dark = 0x8c3a22, light = 0xf6c47a;
        const inFut = (x, y, z) => {
          const t = (10 - y) / 8;
          const ex = 9.3 + t * 2, ez = 9.3 + t * 2;
          return (Math.abs(x) / ex) ** 4 + (Math.abs(z - fz) / ez) ** 4 <= 1;
        };
        v.shape(-12, 2, -12, 12, 10, 10, inFut, (x, y, z) => {
          const bx = (x + 30) % 6, bz = (z + 31) % 6;
          if (bx === 0 || bz === 0 || y === 6) return dark;
          if (bx === 3 || bz === 3) return light;
          return base;
        });
        // lifted edge where the cat sneaks out: dark cavity glowing with heater light
        const cx = -3;
        v.shape(-10, 2, 2, 4, 10, 12, (x, y, z) => ((x - cx) / 6.3) ** 2 + ((y - 2) / 7.8) ** 2 <= 1, null);
        v.shape(-10, 2, 2, 4, 9, 3, (x, y, z) => ((x - cx) / 6.5) ** 2 + ((y - 2) / 7.9) ** 2 <= 1, (x, y) => (y <= 6 ? glow(0xff6a24) : 0x4a1e14));
        v.box(cx - 6, 2, 4, cx + 6, 2, 9, glow(0xff8a3a));
        // table top board
        v.shape(-11, 11, -12, 11, 12, 10, (x, y, z) => !((x === -11 || x === 11) && (z === -12 || z === 10)), (x, y, z) => {
          if (y === 11 || x === -11 || x === 11 || z === -12 || z === 10) return gloss(C.woodDark);
          return gloss(hash(x, 0, z >> 1) < 0.25 ? shade(C.woodLight, 0.9) : C.woodLight);
        });
        // bamboo basket of mikan
        const bx = -4, bzc = -4;
        v.cylinder(bx, 13, bzc, 3.6, 1, C.bamboo);
        v.tube(bx, 14, bzc, 4.4, 3.4, 2, C.bamboo);
        v.paint(() => v.shape(bx - 5, 14, bzc - 5, bx + 5, 15, bzc + 5, (x, y, z) => ((x + z + y) & 1) === 0, shade(C.bamboo, 0.78)));
        const mikan = gloss(0xff941c);
        for (const [x, y, z] of [[bx - 1.6, 15.2, bzc - 1.4], [bx + 1.7, 15.2, bzc - 1.2], [bx - 1.2, 15.2, bzc + 1.8], [bx + 1.6, 15.2, bzc + 1.7], [bx + 0.2, 17.4, bzc + 0.2]]) {
          v.sphere(x, y, z, 1.6, mikan);
        }
        v.set(bx, 19, bzc, C.darkbrown); v.set(bx + 1, 19, bzc, C.leaf); v.set(bx + 1, 19, bzc + 1, C.leaf);
        v.paint(() => { v.set(bx - 1, 16, bzc + 3, gloss(0xffb04a)); v.set(bx + 2, 16, bzc + 3, gloss(0xffb04a)); });
        // a peeled mikan, opened like a flower
        v.layer(['oo...oo', 'owo.owo', '.owwwo.', '..www..', '.owwwo.', 'owo.owo', 'oo...oo'], { o: gloss(0xff941c), w: 0xfff0d2 }, { x: 2, y: 13, z: 0, plane: 'xz' });
        v.sphere(5, 15, 3, 1.5, gloss(0xffb43c));
        v.paint(() => { v.box(5, 14, 0, 5, 17, 6, gloss(0xe8901e)); v.box(2, 14, 3, 8, 17, 3, gloss(0xe8901e)); });
        v.set(5, 17, 3, C.cream);
        // yunomi tea cup
        v.cylinder(6, 13, -6, 1.5, 4, gloss(0x8fae9c));
        v.paint(() => v.cylinder(6, 15, -6, 1.5, 1, gloss(0x5f7f6e)));
        v.cylinder(6, 16, -6, 0.6, 1, C.matcha);
        // the cat: hachiware, blissfully asleep, poking out from under the futon
        const fur = 0x9a958e, furD = 0x6a655f, wht = C.white;
        v.ellipsoid(cx, 5.2, 8.6, 4.3, 3.3, 3.4, wht);
        v.paint(() => v.shape(cx - 5, 7, 4, cx + 5, 9, 13, (x, y) => y >= 8 || Math.abs(x - cx) >= 3, (x, y, z) => ((x + z) % 3 === 0 ? furD : fur)));
        ear(v, cx - 3, 8, 8, fur, C.pink, 3, 3);
        ear(v, cx + 3, 8, 8, fur, C.pink, 3, 3);
        v.project(['K.K.K.K', '.K...K.', 'P..N..P', '..K.K..'], { K: K, P: C.blush, N: C.hotpink }, cx - 3, 6);
        v.ellipsoid(cx - 2.2, 2.5, 12.3, 1.3, 0.9, 1.4, wht);
        v.ellipsoid(cx + 2.2, 2.5, 12.3, 1.3, 0.9, 1.4, wht);
        // ...and its tail escaping out the right side
        for (const [x, z, c] of [[10.5, 0, fur], [12, 1, furD], [12.5, 3, fur], [12, 5, furD], [11, 6.5, fur]]) v.sphere(x, 3, z, 1, c);
      },
    },
    // ------------------------------------------------------------------ secret
    {
      id: 'massage', name: "Ojii-chan's Massage Chair", jp: 'じいちゃんのマッサージチェア', rarity: 'secret',
      desc: 'Ten yen buys three minutes of massage. He has been asleep for forty.',
      build(v) {
        // bathhouse changing-room floorboards
        v.box(-12, 0, -11, 12, 0, 11, C.woodLight);
        v.paint(() => { for (let x = -12; x <= 12; x += 4) v.box(x, 0, -11, x, 0, 11, shade(C.woodLight, 0.82)); });
        // the chair
        const vin = gloss(0x8e2a2e), vinD = gloss(0x6a1c22), vinL = gloss(0xa83a3a), chrome = metal(C.chrome);
        v.box(-8, 1, -8, 8, 5, 4, vinD);
        v.box(-8, 1, -8, 8, 1, 4, chrome);
        v.box(-8, 6, -8, 8, 8, 5, vin);
        v.box(-8, 9, -10, 8, 23, -6, vin);
        v.ellipsoid(0, 23, -8, 8, 3, 2.4, vin);
        v.paint(() => { for (const x of [-4, 0, 4]) v.box(x, 9, -6, x, 23, -6, vinD); });
        v.paint(() => v.box(-8, 8, -8, 8, 8, 5, vinL));
        for (const sx of [-1, 1]) {
          v.box(sx * 9, 6, -9, sx * 11, 12, 5, vin);
          v.box(sx * 9, 13, -9, sx * 11, 13, 5, vinL);
          v.box(sx * 9, 6, 5, sx * 11, 6, 5, chrome);
        }
        // back cover: quilted panels, motor vent, power cord
        v.paint(() => {
          for (let y = 11; y <= 23; y += 4) v.box(-8, y, -10, 8, y, -10, vinD);
          v.box(-4, 3, -9, 4, 5, -9, gloss(C.charcoal));
        });
        v.paint(() => { for (let x = -3; x <= 3; x += 2) v.box(x, 3, -9, x, 5, -9, gloss(0x505055)); });
        v.box(-5, 13, -11, 5, 20, -11, vinD);
        v.paint(() => v.box(-3, 18, -11, 3, 19, -11, gloss(C.cream)));
        v.line(6, 2, -9, 7, 1, -11, gloss(C.charcoal)); v.line(7, 1, -11, 10, 1, -11, gloss(C.charcoal));
        // coin box on the right armrest
        v.box(9, 14, 1, 11, 16, 5, chrome);
        v.box(10, 16, 2, 10, 16, 4, C.black);
        v.set(10, 15, 6, glow(0xff3a2a));
        v.set(9, 15, 6, gloss(C.yellow)); v.set(11, 15, 6, gloss(C.yellow));
        // grandpa: steteco legs, haramaki belly, running shirt
        const skin = C.skin, step = 0xeee3c8, hara = 0xc9a87a;
        v.box(-4, 9, -3, -1, 10, 6, step); v.box(1, 9, -3, 4, 10, 6, step);
        v.box(-4, 3, 6, -2, 8, 7, step); v.box(2, 3, 6, 4, 8, 7, step);
        v.box(-4, 2, 6, -2, 2, 7, skin); v.box(2, 2, 6, 4, 2, 7, skin);
        v.box(-4, 1, 6, -2, 1, 9, gloss(C.navy)); v.box(2, 1, 6, 4, 1, 9, gloss(C.navy)); // slippers
        v.ellipsoid(0, 12.5, -2, 5, 4.2, 3.6, hara);
        v.paint(() => { for (let y = 10; y <= 15; y += 2) v.box(-6, y, -6, 6, y, 2, shade(hara, 0.88)); });
        v.ellipsoid(0, 15.5, -2.5, 4.4, 2.6, 3, C.white);
        v.paint(() => v.box(-1, 16, 0, 1, 18, 1, skin));
        // arms resting on the armrests
        for (const sx of [-1, 1]) {
          v.line(sx * 4.5, 16, -2.5, sx * 8.5, 14, -1, skin, 1);
          v.line(sx * 9.5, 14.5, -1, sx * 9.5, 14.5, 3, skin, 0.8);
        }
        // coffee milk bottle in the left hand
        v.box(-11, 15, 3, -9, 18, 5, gloss(0xc89a68));
        v.box(-11, 18, 3, -9, 18, 5, glass(0xf2f6f8));
        v.box(-10, 19, 4, -10, 19, 4, C.white);
        v.paint(() => v.box(-11, 16, 3, -9, 16, 5, gloss(C.white)));
        v.sphere(-10, 15, 3, 1.2, skin);
        // big head, bald on top with a ring of white hair
        const hy = 21;
        v.sphere(0, hy, -1.5, 4.6, skin);
        v.paint(() => v.shape(-6, hy - 1, -7, 6, hy + 1, 0, (x, y, z) => z <= -3 || (Math.abs(x) >= 4 && z <= -1), C.white));
        v.ellipsoid(-4.8, hy, -1, 0.8, 1.3, 1, skin); v.ellipsoid(4.8, hy, -1, 0.8, 1.3, 1, skin);
        // sleeping face: shut eyes, bushy brows, moustache, open snoring mouth
        v.project(['.WW...WW.', '.........', '.KK...KK.', '.........', 'PP.....PP'], { W: C.lightgray, K: K, P: C.blush }, -4, hy + 3);
        v.project(['WW.WW', '..M..'], { W: C.white, M: C.mouth }, -2, hy - 2, '+z', { raise: true });
        v.set(0, hy - 1, 4, C.mouth);
        v.box(-1, hy - 1, 4, 1, hy - 1, 4, C.white); v.set(0, hy - 1, 4, C.mouth);
        v.box(0, hy, 3, 0, hy, 4, C.skinShade);
        // snot bubble (the universal sign of deep sleep)
        v.sphere(1.8, hy - 0.4, 5.6, 1.5, glass(0xbfe8ff));
        // folded bath towel on his head
        v.box(-2, hy + 4, -3, 2, hy + 5, 0, C.white);
        v.paint(() => { v.box(-2, hy + 4, -3, 2, hy + 5, -3, C.sky); v.box(-2, hy + 4, 0, 2, hy + 5, 0, C.sky); });
        // yellow wash basin with a bar of soap
        v.tube(8.5, 1, 7.5, 2.6, 1.6, 2, gloss(C.plasticYellow));
        v.cylinder(8.5, 1, 7.5, 1.6, 1, gloss(C.plasticYellow));
        v.box(8, 2, 7, 9, 2, 8, gloss(C.pastelPink));
      },
    },
  ],
};
