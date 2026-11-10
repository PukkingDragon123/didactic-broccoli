// Story and quest things (ids from src/data/props/quest.js): Grandpa's notebook and the garage key, the red tool
// kit, garbage bags, the piles to clear on day one, tied newspapers, the cash tin, the cat's bowl and bed, the old
// pocket watch, shop flyers, the OUT OF ORDER card, a cobweb, the menu's gear.
// (milk_carton, battery_pack and tube_box are products: src/products models them.)
import { paint, enamel, plastic, metal, chrome, matte, stone, wood, flat, rubber, fabric, ceramic, lighten, darken, mix } from '../kit/kit.js';
import { blob, tones, plank, carton, stack, tied, can, bottle, dirtBox } from '../kit/shapes.js';
import { kana, smallPrint, framed, mascot, clockFace, rustEdge } from '../kit/prints.js';
import { canLabel } from './street2.js';

const CARD = 0xc49a62;
/** A tied garbage bag: semi-clear white, the day's rubbish showing through as colour. */
function bag(K, B, lumpy) {
  const c = 0xc4c4bc, uv = tones(K, c, { light: 0xd4d4ce, dark: 0xa2a4a2, hi: 0.5, lo: -0.1 }), h = lumpy ? B.h * 0.8 : B.h * 0.74;
  blob(K, uv, 0, h * 0.52, 0, B.w / 2 - 0.01, h * 0.54, B.d / 2 - 0.01, { fine: 2, jit: lumpy ? 0.2 : 0.12, seed: lumpy ? 9 : 4, flatY: -0.86 });
  // what shows through: flat lumps of colour just under the skin
  const cols = [0xe8842a, 0x3a7ad8, 0xd8322a, 0xf2c21c, 0x3a9a4a];
  for (let k = 0; k < 6; k++) { const a = k * 1.05 + (lumpy ? 0.5 : 0), y = h * (0.25 + (k % 3) * 0.16); blob(K, flat(mix(cols[k % 5], c, 0.55), 0.9), Math.cos(a) * (B.w / 2 - 0.035), y, Math.sin(a) * (B.d / 2 - 0.03), 0.05, 0.045, 0.045, { seed: k + 20, jit: 0.25 }); }
  // the knot: a twisted neck and two ears
  K.lathe(flat(0xb8b8b0, 0.85), [0, h * 0.98, 0], [[0.05, 0], [0.022, 0.03], [0.02, 0.05]], 7);
  for (const s of [-1, 1]) K.tube(flat(0xcacac2, 0.85), [[0, h * 0.98 + 0.045, 0], [s * 0.04, h * 0.98 + 0.075, s * 0.01], [s * 0.07, B.y1 - 0.012, s * 0.015]], 0.012, 4, { flat: [0.008, 0.04], up: [0, 0, 1] });
  const lb = K.patch('moeru', 40, 20, (V) => { framed(V, 0xe8f0e8, 0x3a8a4a); kana(K, V, '可燃', 20, 18, 0x3a8a4a, { size: 16, align: 'center' }); }, { rough: 0.7, shared: true });
  K.at([0, h * 0.4, B.d / 2 - 0.006], () => K.face(lb, '+z', -0.07, -0.035, 0.07, 0.035, 0), { rx: -0.12 });
}

export default {
  family: 'garage',
  models: {
    // ------------------------------------------------------------- Grandpa's notebook (0.156 x 0.028 x 0.252)
    grandpa_notebook: (K, B) => {
      const lea = 0x6a4028, x0 = B.x0, x1 = B.x1 - 0.004;
      K.box(flat(0xe8e0c8, 0.95), x0 + 0.004, 0.003, B.z0 + 0.008, x1 - 0.002, 0.021, B.z1 - 0.012); // the page block
      K.box(matte(lea, 0.2), x0, 0, B.z0 + 0.004, x1, 0.003, B.z1 - 0.008, { bevel: 0.001 });
      K.box(matte(lea, 0.2), x0, 0.021, B.z0 + 0.004, x1, 0.0245, B.z1 - 0.008, { bevel: 0.001 }); K.box(matte(darken(lea, 0.15), 0.2), x0 - 0.001, 0, B.z0 + 0.004, x0 + 0.004, 0.0245, B.z1 - 0.008);
      const cv = K.patch('cover', 60, 96, (V) => { V.fill(lea); V.frame(3, 3, 57, 93, darken(lea, 0.25)); V.box(14, 62, 46, 82, 0xe8e0c8); V.frame(14, 62, 46, 82, 0x8a6a48); kana(K, V, '帳', 22, 80, 0x3a2a22, { size: 16 }); for (const [i, j] of [[5, 5], [53, 5], [5, 89], [53, 89]]) V.px(i, j, 0xc8a84a); }, { rough: 0.85 });
      K.face(cv, '+y', x0 + 0.002, B.z0 + 0.006, x1 - 0.002, B.z1 - 0.01, 0.0248);
      K.box(flat(0x26221e, 0.8), x1 - 0.03, -0.0005, B.z0 + 0.004, x1 - 0.022, 0.0253, B.z1 - 0.008); // the elastic
      K.sheet(fabric(0xc8302a), [0.0, 0.012, B.z1 - 0.012], [0.008, 0.012, B.z1 - 0.012], [0.01, 0.002, B.z1], [0.002, 0.002, B.z1]); // the ribbon marker
      K.rod(wood(0xe8b830), [B.x1 - 0.003, 0.006, -0.08], [B.x1 - 0.003, 0.006, 0.07], 0.0035, 6); K.cyl(flat(0x26221e, 0.6), B.x1 - 0.003, 0.006, 0.07, 0.0036, 0.008, 6, { axis: 'z', r1: 0.0008 });
    },

    // ------------------------------------------------------------- the old garage key on its wooden tag (0.14 x 0.013 x 0.034): the bit to +x
    garage_key: (K, B) => {
      const br = metal(0xc8a44a, 0.3), y = 0.004;
      K.torus(br, B.x1 - 0.118 + 0.07, y, 0, 0.011, 0.0032, 8, 4, { axis: 'y' });
      K.box(br, B.x1 - 0.038, y - 0.002, -0.0022, B.x1 - 0.002, y + 0.002, 0.0022); for (const [dx, d] of [[0.006, 0.008], [0.012, 0.005], [0.018, 0.009]]) K.box(br, B.x1 - dx - 0.004, y - 0.002, 0.002, B.x1 - dx, y + 0.002, 0.002 + d);
      K.torus(metal(0x8a8e92, 0.3), B.x1 - 0.118 + 0.05, y, 0, 0.008, 0.0012, 8, 3, { axis: 'y' });
      // the tag: a little board with 車庫 burnt into it
      plank(K, 0xc8a86a, B.x0, 0, -0.014, B.x0 + 0.05, 0.006, 0.014, { bevel: 0.001 });
      const tg = K.patch('shako', 32, 18, (V) => { V.fill(0xc8a86a); kana(K, V, '車庫', 16, 17, 0x4a3020, { size: 16, align: 'center' }); }, { rough: 0.8 });
      K.face(tg, '+y', B.x0 + 0.004, -0.011, B.x0 + 0.046, 0.011, 0.0062);
    },

    // ------------------------------------------------------------- the red tool kit (0.474 x 0.258 x 0.216)
    toolkit_case: (K, B) => {
      const red = paint(0xc42e28, 0.3), w = B.w / 2, d = B.d / 2;
      K.box(red, -w, 0, -d, w, 0.14, d, { bevel: 0.01 }); K.part('lid', [0, 0.14, -d], 'x', () => { K.box(red, -w + 0.004, 0.14, -d + 0.004, w - 0.004, 0.2, d - 0.004, { bevel: 0.014 }); K.tube(plastic(0x26262a, 0.15), [[-0.1, 0.2, 0], [-0.1, B.y1 - 0.012, 0], [0.1, B.y1 - 0.012, 0], [0.1, 0.2, 0]], 0.012, 5); });
      K.box(flat(0x8a1e1a, 0.6), -w - 0.001, 0.137, -d - 0.001, w + 0.001, 0.143, d + 0.001);
      for (const x of [-0.15, 0.15]) { K.box(metal(0x26262a, 0.2), x - 0.022, 0.1, d, x + 0.022, 0.17, d + 0.01, { bevel: 0.004 }); K.box(chrome(0xb4babf), x - 0.014, 0.145, d + 0.01, x + 0.014, 0.16, d + 0.014); }
      const lb = K.patch('tool', 64, 24, (V) => { framed(V, 0xf2c21c, 0x26221e); V.text5('TOOLS', 32, 18, 0x26221e, { align: 'center', s: 2 }); }, { rough: 0.5 });
      K.face(lb, '+z', -0.07, 0.04, 0.07, 0.092, d + 0.001);
      for (const s of [-1, 1]) K.box(metal(0x8a8e92), s * w - 0.002, 0.06, -0.03, s * w + 0.002, 0.11, 0.03);
    },

    trash_bag: (K, B) => bag(K, B, false),
    trash_bag_b: (K, B) => bag(K, B, true),

    // ------------------------------------------------------------- what the garage floor was left with: dust, rubbish, a mess of cardboard
    dust_pile: (K, B) => {
      const d = 0x8a8478;
      K.lathe(matte(d, 0.1), [0, 0, 0], [[0.27, 0], [0.2, 0.02], [0.08, 0.04], [0, 0.044]], 10, { sx: 1.1, sz: 0.82 });
      for (let k = 0; k < 9; k++) { const a = k * 0.7, r = 0.2 + (k % 3) * 0.035; blob(K, matte(k % 2 ? 0x9a9488 : 0x7a7468, 0.1), Math.cos(a) * r * 1.1, 0.008, Math.sin(a) * r * 0.82, 0.05, 0.01, 0.04, { seed: k, jit: 0.3, flatY: -0.2 }); }
      for (const [x, z, c] of [[0.1, 0.05, 0xc8a05a], [-0.12, -0.04, 0xe8e6de], [0.0, 0.12, 0xd8842a], [-0.05, 0.02, 0x4a4a4e]]) K.at([x, 0.036, z], () => K.box(flat(c, 0.9), -0.02, 0, -0.012, 0.02, 0.006, 0.012), { ry: x * 30 });
    },
    rubbish_pile: (K, B) => {
      blob(K, tones(K, 0xc4c4bc, { light: 0xd4d4ce, dark: 0xa2a4a2 }), 0.06, 0.09, 0.0, 0.11, 0.1, 0.1, { fine: true, jit: 0.16, seed: 3, flatY: -0.85 });
      K.lathe(flat(0xd0d0c8, 0.85), [0.06, 0.17, 0], [[0.03, 0], [0.012, 0.02], [0.03, 0.045]], 6);
      K.at([-0.14, 0.03, 0.06], () => can(K, 0, 0, -0.06, canLabel(K, 'coffee'), { r: 0.027, h: 0.104 }), { rx: Math.PI / 2, ry: 0.8 });
      can(K, 0.2, 0, 0.07, canLabel(K, 'cola'));
      K.at([-0.2, 0.03, -0.06], () => bottle(K, 0, 0, 0, 0.03, 0.2, K.tint(0x9ac8a4, 130), { glassy: true, cap: false }), { rz: 1.5, ry: 0.4 });
      for (const [x, z, c, s] of [[-0.05, -0.1, 0xe8e6de, 0.05], [0.14, -0.09, 0xd8322a, 0.035], [-0.1, 0.12, 0xc8a05a, 0.04], [B.x0 + 0.06, 0.0, 0xe8e6de, 0.04]]) blob(K, matte(c, 0.1), x, s * 0.5, z, s, s * 0.6, s * 0.9, { seed: Math.round(x * 100), jit: 0.3 });
      K.lathe(matte(0x8a8478, 0.1), [-0.02, 0, 0.0], [[0.24, 0.001], [0, 0.012]], 9, { sx: 1.1, sz: 0.65 });
    },
    cardboard_mess: (K, B) => {
      const c = [CARD, darken(CARD, 0.1), lighten(CARD, 0.06)];
      [[-0.15, 0.0, 0.0, 0.42, 0.3, 0.2, 0], [0.12, 0.012, 0.1, 0.36, 0.26, -0.5, 0.05], [0.0, 0.024, -0.14, 0.3, 0.22, 0.9, -0.04]].forEach(([x, y, z, w, d, ry, rz], i) => K.at([x, y + 0.004, z], () => { K.box(matte(c[i], 0.14), -w / 2, 0, -d / 2, w / 2, 0.008, d / 2); K.box(flat(darken(c[i], 0.2), 0.95), -w / 2, 0.008, -0.002, w / 2, 0.0088, 0.002); }, { ry, rz }));
      // one box half collapsed, a flap standing, a strip of old tape
      K.at([0.2, 0, -0.1], () => { K.tub(matte(CARD, 0.14), -0.13, 0, -0.1, 0.13, 0.15, 0.1, 0.006, { inside: flat(darken(CARD, 0.2), 0.95) }); K.sheet(matte(lighten(CARD, 0.06), 0.14), [-0.13, 0.15, 0.1], [0.13, 0.15, 0.1], [0.13, 0.2, 0.16], [-0.13, 0.2, 0.16], { back: flat(darken(CARD, 0.12), 0.95) }); }, { ry: -0.3 });
      K.at([-0.2, 0.012, 0.16], () => K.box(flat(0xc8a878, 0.5), -0.1, 0, -0.012, 0.1, 0.002, 0.012), { ry: 0.6 });
      K.glass(() => K.at([-0.1, 0.02, -0.16], () => K.box(K.tint(0xe8f0f0, 90), -0.08, 0, -0.05, 0.08, 0.03, 0.05, { bevel: 0.012 }), { ry: 0.3 })); // bubble wrap
    },

    // ------------------------------------------------------------- old newspapers tied with string (0.305 x 0.19 x 0.43)
    newspaper_stack: (K, B) => {
      const w = B.w / 2 - 0.008, d = B.d / 2 - 0.008, n = 9, th = (B.y1 - 0.012) / n;
      for (let k = 0; k < n; k++) { const dx = ((k * 0.37) % 1 - 0.5) * 0.012, dz = ((k * 0.61) % 1 - 0.5) * 0.014; K.box(flat(k % 2 ? 0xbcb6a4 : 0xc8c2b0, 0.95), -w + dx, k * th, -d + dz, w + dx, (k + 1) * th - 0.002, d + dz); K.box(flat(0x9a9484, 0.95), -w + dx, k * th + th * 0.5 - 0.001, d + dz, w + dx, k * th + th * 0.5 + 0.001, d + dz + 0.0006); }
      const fp = K.patch('shinbun', 72, 104, (V) => { V.fill(0xcec8b6); kana(K, V, '杜王新報', 64, 100, 0x26221e, { size: 16, vert: true, align: 'right' }); V.box(6, 60, 42, 96, 0x9a968a); V.box(10, 66, 38, 90, 0x6a665c); V.disc(24, 80, 7, 0xb8b4a8); for (let c = 0; c < 4; c++) smallPrint(V, 6 + c * 0, 54 - c * 13, 60, 4, 0x4a463e, { seed: c + 2 }); V.hline(4, 67, 57, 0x26221e); }, { rough: 0.95 });
      K.face(fp, '+y', -w, -d, w, d, n * th - 0.0016);
      tied(K, -w - 0.008, 0, -d - 0.008, w + 0.008, n * th - 0.002, d + 0.008, { c: flat(0xd8ccb0, 0.9), w: 0.003 });
    },

    // ------------------------------------------------------------- Grandpa's cash tin: an old biscuit tin (0.288 x 0.108 x 0.244)
    cash_tin: (K, B) => {
      const bl = 0x2a4a8a, R = 0.105, cx = B.x0 + R + 0.004, cz = B.z0 + R + 0.01;
      const side = K.patch('tin', 128, 20, (V) => { V.fill(bl); V.box(0, 0, 128, 3, 0xc8a84a); V.box(0, 17, 128, 20, 0xc8a84a); for (let k = 0; k < 8; k++) { V.disc(8 + k * 16, 10, 4, k % 2 ? 0xd8322a : 0xeeeae0); V.px(8 + k * 16, 10, 0xc8a84a); } }, { rough: 0.45 });
      K.lathe(metal(0xb4b8bc, 0.3), [cx, 0, cz], [[0, 0], [R, 0]], 12); K.wrap(side, cx, 0, 0.066, cz, R, { n: 12, lift: 0 });
      K.lathe(flat(0xc8a84a, 0.4), [cx, 0.066, cz], [[R, 0], [R - 0.006, 0.002], [R - 0.006, -0.05], [0, -0.05]], 12);
      // inside: notes in a band, a bank book
      K.box(flat(0x8a9a6a, 0.9), cx - 0.06, 0.016, cz - 0.03, cx + 0.03, 0.04, cz + 0.02); K.box(flat(0xe8e6de, 0.9), cx - 0.03, 0.0162, cz - 0.031, cx - 0.01, 0.0405, cz + 0.021); K.box(matte(0x3a7a5a, 0.1), cx + 0.01, 0.016, cz - 0.04, cx + 0.07, 0.03, cz + 0.05);
      // the lid, leaning against it: a painted ship
      const lid = K.view('lid', { u: (p) => p[0], v: (p) => -p[2], u0: -R, u1: R, v0: -R, v1: R, ppm: 420, rough: 0.45 }, (V) => { const c = V.W / 2; V.fill(bl); V.disc(c, c, c - 1, bl); V.ring(c, c, c - 5, c - 2, 0xc8a84a); V.disc(c, c, c - 14, 0xeeeae0); V.disc(c, c, c - 17, 0x5a9ac8); V.box(c - 20, c - 26, c + 20, c - 14, 0x2a4a8a); V.polyPx([[c - 14, c - 14], [c + 16, c - 14], [c + 10, c - 4], [c - 10, c - 4]], 0xd8322a); V.polyPx([[c - 2, c - 3], [c - 2, c + 20], [c + 14, c - 3]], 0xeeeae0); V.vline(c - 3, c - 4, c + 22, 0x4a3020); for (let k = 0; k < 12; k++) { const a = k * 0.5236; V.disc(c + Math.cos(a) * (c - 9.5), c + Math.sin(a) * (c - 9.5), 2, k % 2 ? 0xd8322a : 0xeeeae0); } });
      K.at([B.x1 - 0.06, 0.02, B.z1 - 0.1], () => { K.lathe(lid, [0, 0, 0], [[R + 0.003, -0.012], [R + 0.003, 0], [0, 0]], 12); K.lathe(flat(0xc8a84a, 0.4), [0, 0, 0], [[0, -0.011], [R, -0.011]], 12, { flip: true }); }, { rz: -1.05, ry: 0.5, order: 'YZX' });
    },

    // ------------------------------------------------------------- the cat's bowl, empty and with milk (0.135 across)
    cat_bowl: (K) => catBowl(K, false),
    cat_bowl_milk: (K) => catBowl(K, true),

    // ------------------------------------------------------------- a cat bed: a mikan box, a pink blanket (0.424 x 0.16 x 0.368)
    cat_bed: (K, B) => {
      const lb = K.patch('mikan', 96, 32, (V) => { V.fill(0xd89a4a); kana(K, V, 'みかん', 26, 30, 0xf2efe6, { size: 16, s: 1 }); V.disc(12, 16, 9, 0xe8742a); V.box(10, 24, 14, 27, 0x3a8a4a); V.box(0, 0, 96, 4, 0x3a8a4a); V.text5('10KG', 76, 18, 0xf2efe6, { align: 'center' }); }, { rough: 0.9 });
      K.tub(matte(0xd89a4a, 0.14), B.x0, 0, B.z0, B.x1, 0.13, B.z1, 0.008, { inside: flat(0xb07a3a, 0.95), bevel: 0.003 });
      K.face(lb, '+z', B.x0 + 0.03, 0.02, B.x1 - 0.03, 0.115, B.z1 + 0.001);
      // the blanket: tucked in, a fold hanging over the front edge
      const pk = fabric(0xf4b0c0);
      K.box(pk, B.x0 + 0.012, 0.03, B.z0 + 0.012, B.x1 - 0.012, 0.085, B.z1 - 0.012, { bevel: 0.02, edge: null });
      K.lathe(fabric(0xe89aac), [0, 0.085, 0], [[0.12, 0.0], [0.05, -0.012], [0, -0.014]], 8, { sx: 1.3, flip: false });
      K.tube(pk, [[B.x0 + 0.06, 0.1, B.z1 - 0.02], [B.x0 + 0.07, B.y1 - 0.012, B.z1 + 0.0], [B.x0 + 0.07, 0.07, B.z1 + 0.008]], 0.01, 4, { flat: [0.12, 0.012], up: [1, 0, 0] });
      for (const [x, z] of [[-0.1, 0.05], [0.08, -0.06], [0.12, 0.08]]) K.box(flat(0xf2efe6, 0.97), x - 0.012, 0.0852, z - 0.012, x + 0.012, 0.0858, z + 0.012);
    },

    // ------------------------------------------------------------- the old pocket watch (0.052 x 0.077 x 0.018): standing, dial to +z
    pocket_watch: (K, B) => {
      const br = metal(0x8a5a34, 0.3), cy = 0.027, R = 0.025;
      K.lathe(br, [0, cy, B.z0 + 0.002], [[0, 0], [R - 0.004, 0], [R, 0.004], [R, 0.01], [R - 0.003, 0.013]], 12, { axis: 'z' });
      const F = K.patch('dial', 48, 48, (V) => clockFace(V, 10, 9, { bg: 0xf2ead6, rim: 0x8a5a34, ink: 0x3a2a22, sec: 34 }), { rough: 0.4 });
      K.face(F, '+z', -R + 0.003, cy - R + 0.003, R - 0.003, cy + R - 0.003, B.z0 + 0.0152);
      K.cyl(br, 0, cy + R - 0.002, B.z0 + 0.008, 0.005, 0.01, 6); K.cyl(br, 0, cy + R + 0.008, B.z0 + 0.008, 0.007, 0.005, 8);
      K.torus(br, 0, B.y1 - 0.012, B.z0 + 0.008, 0.008, 0.002, 8, 3, { axis: 'z' });
    },

    // ------------------------------------------------------------- a stack of shop flyers (0.225 x 0.018 x 0.309)
    flyer_stack: (K, B) => {
      K.box(flat(0xe8e6de, 0.9), B.x0 + 0.003, 0, B.z0 + 0.003, B.x1 - 0.003, B.y1 - 0.003, B.z1 - 0.003);
      for (let k = 0; k < 4; k++) K.box(flat(0xc8c6be, 0.9), B.x0 + 0.003, 0.002 + k * 0.0035, B.z1 - 0.003, B.x1 - 0.003, 0.003 + k * 0.0035, B.z1 - 0.0024);
      const fl = K.patch('flyer', 84, 116, (V) => {
        V.fill(0xf2efe6); V.box(0, 96, 84, 116, 0xd8322a); V.text5('GACHA', 42, 112, 0xf2c21c, { align: 'center', s: 2 }); kana(K, V, 'ガチャ', 42, 96, 0xd8322a, { size: 16, s: 1, align: 'center' });
        for (const [x, c] of [[18, 0xe84a3a], [42, 0x3a7ad8], [66, 0xf2c21c]]) { V.disc(x, 62, 11, c); V.box(x - 11, 51, x + 11, 62, 0xe8e6de); V.disc(x, 62, 11, c); for (let j = 51; j < 62; j++) for (let i = x - 11; i <= x + 11; i++) if ((i - x) ** 2 + (j - 62) ** 2 <= 121) V.px(i, j, 0xdcdcd4); V.hline(x - 10, x + 10, 62, darken(c, 0.3)); V.px(x - 5, 68, 0xffffff); }
        V.box(6, 22, 78, 44, 0xf2c21c); V.text5('100 YEN', 42, 40, 0x26221e, { align: 'center', s: 1 }); V.text5('OPEN!', 42, 31, 0xd8322a, { align: 'center' });
        smallPrint(V, 8, 16, 68, 3, 0x6a6a6a); V.box(0, 0, 84, 5, 0x3a7ad8);
      }, { rough: 0.8 });
      K.at([0.004, B.y1 - 0.0028, -0.004], () => K.face(fl, '+y', B.x0 + 0.005, B.z0 + 0.005, B.x1 - 0.005, B.z1 - 0.005, 0), { ry: 0.04 });
    },

    // ------------------------------------------------------------- the OUT OF ORDER card (0.24 x 0.17 x 0.006)
    out_of_order: (K, B) => {
      const V = K.patch('koshou', 120, 85, (V) => { V.fill(0xf2ead6); V.frame(2, 2, 118, 83, 0xd8322a); V.frame(4, 4, 116, 81, 0xd8322a); V.text5('OUT OF', 60, 76, 0x26221e, { align: 'center', s: 2 }); V.text5('ORDER', 60, 56, 0x26221e, { align: 'center', s: 2 }); kana(K, V, '故障中', 60, 36, 0xd8322a, { size: 16, s: 2, align: 'center' }); }, { rough: 0.9 });
      K.box(flat(0xe6dec8, 0.9), B.x0, 0, -0.002, B.x1, B.y1, 0.002);
      K.face(V, '+z', B.x0, 0, B.x1, B.y1, 0.0026); K.face(V, '-z', B.x0, 0, B.x1, B.y1, -0.0026);
      for (const s of [-1, 1]) K.at([s * 0.095, B.y1 - 0.016, 0.003], () => K.box(flat(0xe8dca8, 0.5), -0.022, -0.01, 0, 0.022, 0.01, 0.0008), { rz: s * 0.5 }); // masking tape
    },

    // ------------------------------------------------------------- a corner cobweb (0.388 x 0.392): its corner at the top left
    cobweb: (K, B) => {
      const V = K.patch('web', 64, 64, (V) => {
        V.box(0, 0, 64, 64, 0xe8e8e4, 0);
        const c = 0xe8e8e4, o = [0, 63];
        for (let k = 0; k <= 6; k++) { const a = (k / 6) * (Math.PI / 2); for (let t = 0; t < 62; t++) V.px(Math.round(o[0] + Math.cos(a) * t), Math.round(o[1] - Math.sin(a) * t), c, 255); }
        for (const r of [14, 26, 38, 50, 60]) for (let k = 0; k < 6; k++) { const a0 = (k / 6) * (Math.PI / 2), a1 = ((k + 1) / 6) * (Math.PI / 2), sag = r * 0.9; for (let t = 0; t <= 16; t++) { const a = a0 + (a1 - a0) * (t / 16), rr = r - Math.sin((t / 16) * Math.PI) * (r - sag) * 0.5; V.px(Math.round(o[0] + Math.cos(a) * rr), Math.round(o[1] - Math.sin(a) * rr), c, 255); } }
        V.box(30, 30, 33, 33, 0x4a4a4e, 255); // its maker
      }, { rough: 0.9, shared: true });
      K.glass(() => K.face(V, '+z', B.x0, 0, B.x1, B.y1, 0, { both: true }));
    },

    // ------------------------------------------------------------- the menu's machined gear (0.3 across, origin at its centre)
    menu_gear: (K) => {
      const st = metal(0x5a5450, 0.25), n = 10, pts = [];
      for (let k = 0; k < n; k++) { const a = (k / n) * 6.2832, d = 6.2832 / n; for (const [da, r] of [[-0.3, 0.118], [-0.16, 0.148], [0.16, 0.148], [0.3, 0.118]]) pts.push([Math.cos(a + da * d * 1.2) * r, Math.sin(a + da * d * 1.2) * r]); }
      const hole = []; for (let k = 0; k < 12; k++) { const a = -(k / 12) * 6.2832; hole.push([Math.cos(a) * 0.03, Math.sin(a) * 0.03]); }
      K.prism(st, pts, { plane: 'xy', a: -0.04, b: 0.04, holes: [hole] });
      K.lathe(metal(0x6a645e, 0.25), [0, 0, -0.05], [[0.03, 0], [0.06, 0], [0.06, 0.1], [0.03, 0.1]], 12, { axis: 'z' }); K.lathe(flat(0x26221e, 0.6), [0, 0, -0.05], [[0.03, 0], [0.03, 0.1]], 12, { axis: 'z', flip: true });
      for (let k = 0; k < 5; k++) { const a = k * 1.2566; K.cyl(flat(0x3a3632, 0.6), Math.cos(a) * 0.088, Math.sin(a) * 0.088, 0.04, 0.012, 0.0006, 6, { axis: 'z' }); K.cyl(flat(0x3a3632, 0.6), Math.cos(a) * 0.088, Math.sin(a) * 0.088, -0.0406, 0.012, 0.0006, 6, { axis: 'z' }); }
    },
  },
};
function catBowl(K, milk) {
  const side = K.patch('bowl', 96, 14, (V) => { V.fill(0xe8e6de); V.box(0, 0, 96, 2, 0x2a52a8); V.box(0, 12, 96, 14, 0x2a52a8); for (let k = 0; k < 4; k++) mascot(V, 'kingyo', 6 + k * 24, 10, { r: 0x2a52a8, w: 0xe8e6de, k: 0x2a52a8 }); }, { rough: 0.4, shared: true });
  const R = 0.066, n = 12;
  K.lathe(ceramic(0xe8e6de), [0, 0, 0], [[0, 0], [0.036, 0], [0.038, 0.008]], n); K.wrap(side, 0, 0.008, 0.05, 0, 0.038, { n, r1: R, lift: 0 });
  K.lathe(ceramic(0x2a52a8), [0, 0.05, 0], [[R, 0], [R, 0.004], [R - 0.005, 0.004]], n); K.lathe(ceramic(0xe8e6de), [0, 0.054, 0], [[R - 0.005, 0], [0.03, -0.04], [0, -0.042]], n);
  if (milk) { K.lathe(flat(0xf6f4ec, 0.3), [0, 0.04, 0], [[0.052, 0], [0, 0]], n); K.lathe(flat(0xf6f4ec, 0.3), [R + 0.006, 0, 0.03], [[0.012, 0.0008], [0, 0.0012]], 6); }
}
