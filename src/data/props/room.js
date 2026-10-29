// Your room at SAKURA HEIGHTS #102: the lived-in clutter of a small 6-mat apartment (futon, desk, colour-box
// bookshelf full of manga, chabudai, kitchenette, cat plushie, cup noodle...). Facing +z, bottom-centre origin.
// Used by src/room/build.js; none of these has a museum footprint, so they never show up in the decor shop.
import { C, shade, mix } from '../../voxel/palette.js';
import { gloss, metal, glow, glass } from '../../voxel/VoxelModel.js';
import { hash, vnoise, fill, grain, path, rod } from './garage.js';

const TAU = Math.PI * 2;
const woodGrain = (base, axis = 'x', s = 3, amt = 0.14) => (x, y, z) => {
  const a = axis === 'x' ? [y, z] : axis === 'y' ? [x, z] : [x, y];
  const g = vnoise(a[0] * 3 + a[1] * 0.7, a[1] * 3, 0, 6, s);
  return shade(base, 1 - amt / 2 + (Math.sin(g * 18) * 0.5 + 0.5) * amt + hash(x, y, z, s) * 0.04);
};
/** Rounded box (radius r voxels). */
function rbox(v, x0, y0, z0, x1, y1, z1, r, c) {
  return v.shape(x0, y0, z0, x1, y1, z1, (x, y, z) => {
    const dx = Math.max(x0 + r - x, 0, x - (x1 - r));
    const dy = Math.max(y0 + r - y, 0, y - (y1 - r));
    const dz = Math.max(z0 + r - z, 0, z - (z1 - r));
    return dx * dx + dy * dy + dz * dz <= (r + 0.35) ** 2;
  }, c);
}
const soft = (c, s = 0, amt = 0.05) => (x, y, z) => shade(c, 1 - amt + hash(x, y, z, s) * amt * 2);

const room = {
  // ------------------------------------------------------------------ bedding
  room_futon: {
    name: 'Futon', voxel: 0.02,
    build(v) {
      // shikibuton (mattress): cream ticking with faint stripes, rounded edges; pillow end at -z
      v.shape(-25, 0, -50, 24, 4, 49, (x, y, z) => {
        const ex = Math.max(0, Math.abs(x + 0.5) - 22.5), ez = Math.max(0, Math.abs(z + 0.5) - 47.5), ey = Math.max(0, y - 2);
        return ex * ex + ez * ez + ey * ey <= 6.5;
      }, (x, y, z) => (y < 4 ? shade(x % 6 === 0 ? 0xd8cbb0 : 0xeee4cc, 0.95 + hash(x, y, z, 1) * 0.06) : shade(0xf8f4ea, 0.97 + hash(x, y, z, 2) * 0.04)));
      // kakebuton (comforter): indigo with white asanoha-ish dots, puffy and rumpled, folded back at the head
      const quilt = (x, y, z) => {
        const u = ((x + 40) % 8), w = ((z + 80) % 8);
        if ((u === 3 && w === 3) || (u === 7 && w === 7)) return 0xf4efe4;
        if ((u + w) % 8 === 0 && hash(x >> 2, 0, z >> 2, 4) < 0.4) return 0x8fb0d8;
        return shade(0x3a5a9a, 0.92 + vnoise(x, 0, z, 5, 3) * 0.14);
      };
      v.shape(-27, 3, -22, 26, 12, 49, (x, y, z) => {
        const top = 8 + Math.round(vnoise(x, 0, z, 7, 5) * 3 + Math.sin(z * 0.18 + x * 0.05) * 0.8);
        const edge = Math.max(0, Math.abs(x + 0.5) - 24);
        const h = top - edge * 2.2;
        return y <= h && y >= 3 + (edge > 0 ? Math.max(0, 6 - edge * 3) : 0) - (edge > 0 ? 3 : 0);
      }, quilt);
      // the turned-back fold near the pillow shows the cream lining
      v.shape(-26, 8, -26, 25, 13, -18, (x, y, z) => {
        const t = (z + 26) / 8;
        const h = 9 + Math.round(Math.sin(t * Math.PI) * 3 + vnoise(x, 0, 0, 5, 7) * 1.5);
        return y <= h && Math.abs(x + 0.5) <= 24.5;
      }, (x, y, z) => (y >= 11 ? shade(0xf2e6cc, 0.95 + hash(x, y, z, 9) * 0.06) : quilt(x, y, z)));
      // soba-husk pillow in an orange gingham towel
      v.shape(-12, 4, -47, 11, 11, -35, (x, y, z) => {
        const nx = (x + 0.5) / 12.5, nz = (z + 41) / 6.5, ny = (y - 4) / 7;
        return nx * nx * 0.6 + nz * nz + ny * ny * 1.1 <= 1.15;
      }, (x, y, z) => ((x + 40) % 4 < 2) !== ((z + 40) % 4 < 2) ? 0xf6a65a : (((x + 40) % 4 < 2) ? 0xfbe6c8 : 0xfbd2a6));
      // a crumpled corner of the comforter pushed aside
      v.shape(14, 9, 30, 27, 16, 44, (x, y, z) => vnoise(x, y, z, 4, 11) > 0.42 && y <= 9 + (44 - z) * 0.35, quilt);
    },
  },

  room_zabuton: {
    name: 'Zabuton Cushion', voxel: 0.01,
    build(v) {
      const c = 0xd8643a;
      v.shape(-27, 0, -27, 26, 8, 26, (x, y, z) => {
        const r = Math.max(Math.abs(x + 0.5), Math.abs(z + 0.5)) / 27;
        const h = 8 - r * r * 5;
        return y <= h;
      }, (x, y, z) => shade((x + z + 80) % 10 < 1 ? 0xc0502a : c, 0.94 + hash(x, y, z, 3) * 0.07));
      for (const [x, z] of [[-24, -24], [23, -24], [-24, 23], [23, 23], [0, 0]]) { v.set(x, 7, z, 0x6a2a1a); v.set(x, 8, z, 0xf4d8a0); }
    },
  },

  room_plush: {
    name: 'Calico Cat Plushie', voxel: 0.008,
    build(v) {
      const W = 0xfbf6ec, O = 0xf08a3a, K = 0x3a2e2a;
      const fur = (x, y, z) => {
        const n = vnoise(x, y, z, 5, 21);
        const c = n > 0.62 ? O : n < 0.3 ? K : W;
        return shade(c, 0.95 + hash(x, y, z, 2) * 0.06);
      };
      v.ellipsoid(0, 9, 0, 10, 9, 9, fur); // sitting body
      v.ellipsoid(0, 22, 2, 9.5, 8, 8, fur); // head
      for (const s of [-1, 1]) {
        v.shape(s * 3, 27, -2, s * 9, 34, 5, (x, y, z) => { const ax = Math.abs(x); return y - 27 <= (9 - ax) * 1.4 && ax >= 3 && z >= 0 && z <= 3; }, s < 0 ? O : K);
        v.paint(() => v.shape(s * 5, 28, 3, s * 7, 31, 3, () => true, 0xffb0b8));
        v.ellipsoid(s * 5, 2, 7, 3, 2.5, 3.5, W); // paws
      }
      // face: big dark eyes with shine, pink nose, whiskers
      v.paint(() => {
        v.shape(-10, 14, 2, 10, 30, 10, (x, y, z) => z >= 6, W);
        for (const s of [-1, 1]) { v.box(s * 4 - (s > 0 ? 1 : 0), 21, 10, s * 4 + (s > 0 ? 0 : 1), 23, 10, K); v.set(s * 4 + (s > 0 ? -1 : 0), 23, 10, 0xffffff); }
        v.set(0, 20, 10, 0xff8fa0); v.box(-1, 18, 10, 1, 18, 10, 0x9a5a5a);
      });
      for (const s of [-1, 1]) for (const dy of [0, 2]) { v.set(s * 9, 19 + dy, 8, K); v.set(s * 10, 19 + dy, 7, K); }
      // tail curled round the front
      path(v, [[8, 3, -6], [12, 4, 0], [11, 3, 6], [6, 2, 9]], O, 1.8);
      v.set(6, 3, 10, K);
      // little red collar with a bell
      v.paint(() => v.shape(-9, 15, -8, 9, 16, 9, () => true, 0xd83a3a));
      v.sphere(0, 14, 9, 1.4, metal(0xf2c14e));
      // sewn tag
      v.box(-11, 3, -2, -11, 6, 1, 0xf4efe4);
    },
  },

  room_laundry: {
    name: 'Laundry Pile', voxel: 0.01,
    build(v) {
      // jeans, a red tee, a towel and a pair of socks, slumped on the floor
      const lump = (x0, z0, x1, z1, hmax, s, col) => v.shape(x0, 0, z0, x1, hmax, z1, (x, y, z) => {
        const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, rx = (x1 - x0) / 2, rz = (z1 - z0) / 2;
        const d = ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2;
        const h = hmax * (1 - d) * (0.55 + vnoise(x, 0, z, 5, s) * 0.7);
        return d <= 1 && y <= h;
      }, col);
      lump(-24, -14, 10, 16, 9, 1, (x, y, z) => shade((x + z) % 7 === 0 ? 0x2a3a6a : 0x3a5288, 0.9 + vnoise(x, y, z, 3, 2) * 0.18));
      lump(-6, -20, 22, 6, 11, 3, (x, y, z) => shade(0xd8463a, 0.88 + vnoise(x, y, z, 3, 4) * 0.2));
      v.paint(() => v.shape(2, 6, -14, 12, 12, -4, (x, y, z) => vnoise(x, y, z, 2, 7) > 0.5, 0xfbf3e0)); // print on the tee
      lump(8, -2, 26, 20, 7, 5, (x, y, z) => shade(((z + 40) >> 2) % 2 ? 0x8ad0c8 : 0xf4f0e6, 0.92 + hash(x, y, z, 5) * 0.08));
      for (const [x, z] of [[-26, 18], [-21, 20]]) { v.box(x, 0, z, x + 3, 1, z + 8, 0xf4f0e6); v.box(x, 0, z + 6, x + 3, 2, z + 8, 0x6a6a72); }
    },
  },

  // ------------------------------------------------------------------ furniture
  room_desk: {
    name: 'Study Desk', voxel: 0.01,
    build(v) {
      const top = woodGrain(0xc89a62, 'y', 5, 0.12), body = soft(0xe8e0cc, 3, 0.03), bodyD = 0xcfc5ae;
      // top with a darker edge band
      fill(v, -55, 69, -28, 54, 71, 27, top);
      v.paint(() => { v.box(-55, 69, 27, 54, 71, 27, 0x9a6a3a); v.box(-55, 69, -28, -55, 71, 27, 0x9a6a3a); v.box(54, 69, -28, 54, 71, 27, 0x9a6a3a); });
      // left panel leg + back modesty panel
      fill(v, -55, 0, -27, -53, 68, 26, body);
      fill(v, -52, 22, -27, 18, 68, -26, (x, y, z) => shade(bodyD, 0.96 + hash(x, y, z, 1) * 0.04));
      // drawer pedestal on the right: three drawers with chrome pulls, and a key lock
      fill(v, 19, 0, -27, 54, 68, 26, body);
      v.box(19, 0, 22, 54, 3, 27, 0x8a8478); // kick plinth
      for (const [y0, y1] of [[4, 24], [26, 46], [48, 66]]) {
        fill(v, 21, y0, 27, 52, y1, 27, (x, y, z) => shade(0xf2ead6, 0.97 + hash(x, y, z, y0) * 0.03));
        v.box(21, y1, 27, 52, y1, 27, bodyD);
        v.box(31, y1 - 5, 28, 42, y1 - 4, 28, gloss(0xd8dce2));
        v.box(31, y1 - 5, 27, 31, y1 - 4, 28, gloss(0xb8bcc2)); v.box(42, y1 - 5, 27, 42, y1 - 4, 28, gloss(0xb8bcc2));
      }
      v.set(48, 63, 28, metal(0xd8b860));
      // stickers on the side panel and drawer
      v.layer(['.YY.', 'YKKY', 'YYYY', '.YY.'], { Y: 0xffd23f, K: 0x3a2e2a }, { x: 23, y: 20, z: 28 });
      v.layer(['PPPPP', 'PWWWP', 'PPPPP'], { P: 0xff6f91, W: 0xffffff }, { x: 44, y: 41, z: 28 });
      v.layer(['.BBB.', 'BWWWB', 'BWBWB', 'BWWWB', '.BBB.'], { B: 0x2f6fd6, W: 0xffffff }, { x: -56, y: 60, z: 8, plane: 'zy' });
      // a pencil cup and a stack of school notebooks at the back-left
      v.cylinder(-48, 72, -20, 3.5, 10, gloss(0x58a8d8));
      v.cylinder(-48, 72, -20, 2.5, 10, null);
      v.cylinder(-48, 72, -20, 2.5, 1, 0x3a5a7a);
      for (const [x, z, h, c] of [[-49, -21, 16, 0xffd23f], [-47, -19, 14, 0xe5383b], [-48, -18, 17, 0x2f6fd6], [-46, -21, 13, 0x3a3a3a]]) { v.box(x, 73, z, x, 72 + h, z, c); v.set(x, 73 + h, z, c === 0x3a3a3a ? 0xc0c0c0 : 0xf4d8a8); }
      for (let i = 0; i < 4; i++) fill(v, -40 + (i % 2), 72 + i * 2, -22, -22 + (i % 2), 73 + i * 2, -10, (x, y) => ([0x5a8ad8, 0xf4f0e6, 0xd8643a, 0x58c06c][i]));
    },
  },

  room_chair: {
    name: 'Swivel Chair', voxel: 0.01,
    build(v) {
      const fab = (x, y, z) => shade((x + y + z) % 3 === 0 ? 0x2a4a7a : 0x34588c, 0.94 + hash(x, y, z, 6) * 0.06);
      const blk = gloss(0x2a2a2e), chrome = metal(0xb8bcc4);
      // five-star base with casters
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * TAU + 0.3;
        const ex = Math.round(Math.cos(a) * 26), ez = Math.round(Math.sin(a) * 26);
        rod(v, 0, 6, 0, ex, 4, ez, blk, 3);
        v.sphere(ex, 2, ez, 2.2, gloss(0x1a1a1c));
      }
      v.cylinder(0, 4, 0, 5, 4, blk);
      v.cylinder(0, 8, 0, 2.5, 30, chrome); // gas lift
      v.cylinder(0, 36, 0, 4, 3, blk);
      // seat cushion
      rbox(v, -22, 39, -21, 21, 46, 21, 3, fab);
      // back: a stem and a padded backrest
      v.box(-2, 40, -24, 1, 58, -22, blk);
      rbox(v, -20, 52, -28, 19, 86, -21, 3, fab);
      v.paint(() => { for (let y = 58; y <= 80; y += 7) v.box(-17, y, -21, 16, y, -21, 0x22406a); });
      // armrests
      for (const s of [-1, 1]) { v.box(s * 21 - 1, 46, -6, s * 21 + 1, 58, -4, blk); rbox(v, s * 21 - 3, 58, -18, s * 21 + 3, 61, 6, 1, blk); }
      // a hoodie slung over the back
      v.shape(-21, 64, -31, 20, 88, -19, (x, y, z) => {
        if (z > -20 && y < 84) return false;
        const sag = Math.round(Math.sin(((x + 21) / 41) * Math.PI) * 4);
        return y >= 70 - sag + (z > -27 ? 8 : 0) && vnoise(x, y, z, 4, 8) > 0.25;
      }, (x, y, z) => shade(0x6a8a5a, 0.88 + vnoise(x, y, z, 3, 9) * 0.2));
    },
  },

  room_bookshelf: {
    name: 'Colour-Box Bookshelf', voxel: 0.01,
    build(v) {
      const W = (x, y, z) => shade(0xf4efe4, 0.96 + hash(x, y, z, 3) * 0.04);
      fill(v, -22, 0, -15, 21, 1, 14, W); fill(v, -22, 0, -15, -21, 90, 14, W); fill(v, 20, 0, -15, 21, 90, 14, W);
      fill(v, -22, 89, -15, 21, 90, 14, W); fill(v, -20, 2, -15, 19, 88, -15, (x, y, z) => shade(0xd8d0bc, 0.96 + hash(x, y, z, 4) * 0.04));
      for (const y of [30, 60]) fill(v, -20, y, -14, 19, y + 1, 14, W);
      // manga volumes: runs of the same series (same spine colour, numbered bands)
      const series = [[0xe5383b, 0xfbf3e0], [0x2f6fd6, 0xffd23f], [0xf4f0e6, 0xe5383b], [0x3cae5a, 0xfbf3e0], [0xffd23f, 0x2a2a3a], [0x8a5bd6, 0xfbf3e0], [0xff8c2e, 0x2a2a3a], [0x2a2a3a, 0xff6f91], [0x2fb5a6, 0xfbf3e0]];
      const shelf = (y0, hTop, seed, from = -20, to = 19) => {
        let x = from, k = 0;
        while (x <= to) {
          const sIdx = Math.floor(hash(seed, k, 0, 1) * series.length), [c, band] = series[sIdx];
          const run = 3 + Math.floor(hash(seed, k, 1, 2) * 7);
          const h = Math.min(hTop, 16 + Math.floor(hash(seed, k, 2, 3) * 3) + (sIdx % 3 === 0 ? 5 : 0));
          for (let i = 0; i < run && x <= to; i++, x += 2) {
            if (hash(seed, k, i, 9) < 0.05) { x += 1; continue; } // a gap where a volume is out
            const d = 11 + (sIdx % 2);
            const zf = 12 - (sIdx % 2);
            fill(v, x, y0, zf - d, x + 1, y0 + h - 1, zf, (xx, yy, zz) => {
              if (zz < zf) return 0xf2ead2; // page block seen from above
              if (yy >= y0 + h - 4 && yy <= y0 + h - 3) return band;
              if (yy === y0 + 2) return shade(band, 0.9);
              return shade(c, 0.92 + hash(xx, yy, zz, 7) * 0.08 + (xx % 2) * 0.03);
            });
            if (i % 2 === 0) v.set(x, y0 + h - 8, zf, 0x2a2a2a); // volume number
          }
          k++;
          x += hash(seed, k, 4, 5) < 0.3 ? 1 : 0;
        }
      };
      shelf(2, 27, 3, -20, 8);
      // bottom right: a few volumes lying flat and an old game box
      for (let i = 0; i < 5; i++) fill(v, 10 + (i % 2), 2 + i * 2, -2, 19 - (i % 3), 3 + i * 2, 10, (x, y, z) => (z === 10 ? series[(i * 3) % series.length][0] : 0xf2ead2));
      fill(v, 9, 12, -2, 19, 27, 12, (x, y, z) => (z === 12 ? (y > 22 ? 0xe5383b : y > 15 ? shade(0x233a72, 1 + (x % 3) * 0.05) : 0xfbf3e0) : 0xe0d8c4));
      shelf(32, 27, 7);
      // top shelf: half manga, half a capsule jar and a little framed photo
      shelf(62, 26, 11, -20, 2);
      v.cylinder(10, 62, -4, 6, 13, glass(0xe8f4f8));
      for (let i = 0; i < 9; i++) v.sphere(7 + (i % 3) * 3, 64 + Math.floor(i / 3) * 3, -6 + ((i * 2) % 5), 1.6, gloss([0xff6f91, 0x5cc4ff, 0xffd23f, 0x58c06c, 0xd94fb0][i % 5]));
      v.cylinder(10, 75, -4, 6.5, 2, gloss(0xe5383b));
      fill(v, 13, 62, 6, 19, 71, 7, () => 0x8a5a32);
      v.layer(['SSSSS', 'SBBBS', 'SBGBS', 'SGGGS', 'SSSSS', 'SSSSS', 'SSSSS', 'SSSSS'], { S: 0xd8a0c8, B: 0x8ac8f0, G: 0x6ab060 }, { x: 14, y: 70, z: 8 });
      // a plush keychain hanging off the top
      v.sphere(-14, 85, 15, 2.5, 0xffd8e4);
      v.box(-14, 88, 15, -14, 89, 15, metal(0xd8dce2));
    },
  },

  room_figshelf: {
    name: 'Figure Display Shelf', voxel: 0.01,
    build(v) {
      // a wall-mounted white collection shelf: three ledges with warm LED strips under each and a dark back
      const W = (x, y, z) => shade(0xf6f2ea, 0.97 + hash(x, y, z, 3) * 0.03);
      fill(v, -36, 0, -9, -34, 74, 9, W); fill(v, 33, 0, -9, 35, 74, 9, W);
      fill(v, -36, 73, -9, 35, 75, 9, W);
      fill(v, -33, 0, -10, 32, 74, -10, (x, y, z) => shade(0x34303a, 0.95 + hash(x >> 1, y >> 1, z, 4) * 0.08));
      for (const y of [0, 24, 48]) {
        fill(v, -33, y, -9, 32, y + 1, 9, W);
        if (y > 0) v.box(-31, y - 1, 6, 30, y - 1, 7, glow(0xffe6b0)); // LED strip
      }
      v.box(-31, 72, 6, 30, 72, 7, glow(0xffe6b0));
      // name card on the top ledge front
      v.layer(['YYYYYYYYYYYY'], { Y: 0xffd23f }, { x: -6, y: 75, z: 10 });
    },
  },

  room_table: {
    name: 'Chabudai', voxel: 0.01,
    build(v) {
      const top = woodGrain(0x9a5a2e, 'y', 7, 0.16);
      v.shape(-38, 29, -38, 38, 32, 38, (x, y, z) => Math.hypot(x, z) <= 37.6, (x, y, z) => (Math.hypot(x, z) > 36.4 ? 0x6a3a1c : top(x, y, z)));
      v.shape(-34, 26, -34, 34, 28, 34, (x, y, z) => Math.hypot(x, z) <= 33 && Math.hypot(x, z) >= 30, 0x5a3218);
      for (const [x, z] of [[-22, -22], [21, -22], [-22, 21], [21, 21]]) fill(v, x, 0, z, x + 2, 28, z + 2, woodGrain(0x6a3a1c, 'x', 9));
      // a coaster ring stain and a TV remote
      v.paint(() => v.shape(-20, 32, 8, -8, 32, 20, (x, y, z) => { const d = Math.hypot(x + 14, z - 14); return d > 4.5 && d < 5.6; }, 0x7a4220));
      fill(v, 6, 33, -26, 10, 34, -12, () => gloss(0x3a3a40));
      for (let i = 0; i < 4; i++) v.set(8, 35, -24 + i * 3, i === 0 ? gloss(0xe5383b) : gloss(0xc8c8d0));
    },
  },

  room_tvrack: {
    name: 'TV Rack', voxel: 0.01,
    build(v) {
      const wd = woodGrain(0x6a4428, 'x', 4, 0.12);
      fill(v, -36, 0, -18, 35, 2, 17, wd); fill(v, -36, 36, -18, 35, 38, 17, wd);
      fill(v, -36, 3, -18, -34, 35, 17, wd); fill(v, 33, 3, -18, 35, 35, 17, wd);
      fill(v, -33, 18, -17, 32, 19, 17, wd); fill(v, -33, 3, -18, 32, 35, -18, (x, y, z) => shade(0x4a2e1a, 0.95 + hash(x, y, z, 2) * 0.05));
      // a VCR on the middle shelf with a clock glowing
      fill(v, -30, 20, -14, 8, 27, 12, (x, y, z) => gloss(shade(0x2c2c30, 0.96 + hash(x, y, z, 3) * 0.05)));
      v.box(-26, 23, 13, -6, 24, 13, gloss(0x111114));
      v.box(-2, 23, 13, 4, 24, 13, glow(0x40ff80));
      // game boxes and cartridges on the bottom shelf
      const cols = [0xe5383b, 0x2f6fd6, 0xffd23f, 0x58c06c, 0xff6f91, 0x8a5bd6];
      for (let i = 0; i < 9; i++) fill(v, -31 + i * 3, 3, -12, -30 + i * 3, 15, 10, (x, y, z) => (z === 10 ? (y > 12 ? 0xfbf3e0 : shade(cols[i % cols.length], 0.95 + (y % 3) * 0.03)) : 0xd8d0c0));
      for (let i = 0; i < 4; i++) fill(v, 2 + i * 6, 3, -8, 6 + i * 6, 9, 4, (x, y, z) => (y > 7 && z > -4 ? 0xe8e0cc : gloss(i % 2 ? 0x8a8a92 : 0x5a5a62)));
      v.box(26, 3, -10, 31, 16, 8, (x, y, z) => shade(0xc8a878, 0.95 + hash(x, y, z, 5) * 0.06));
    },
  },

  room_console: {
    name: 'Home Game Console', voxel: 0.005,
    build(v) {
      // an original 80s console: two-tone grey, red cartridge door, two wired pads
      const body = (x, y, z) => gloss(shade(0xd8d4cc, 0.97 + hash(x, y, z, 1) * 0.03));
      fill(v, -26, 0, -20, 25, 12, 19, body);
      fill(v, -26, 0, 14, 25, 9, 19, (x, y, z) => gloss(shade(0x8a8890, 0.97 + hash(x, y, z, 2) * 0.03)));
      fill(v, -14, 12, -16, 13, 13, 6, () => gloss(0xb83030)); // cartridge door
      // a cartridge sticking out
      fill(v, -11, 13, -12, 10, 26, 0, (x, y, z) => (z === 0 && y > 15 && y < 24 ? (y > 21 ? 0xffd23f : 0x2f6fd6) : gloss(0x5a5a62)));
      v.box(18, 6, 20, 21, 8, 20, gloss(0xe5383b)); v.box(10, 6, 20, 13, 8, 20, gloss(0x2a2a2e));
      v.box(-22, 10, 20, -21, 10, 20, glow(0xff4040));
      // controllers on cords
      const pad = (cx, cz, ry) => {
        const p = (x, z) => { const c = Math.cos(ry), s = Math.sin(ry); return [Math.round(cx + x * c - z * s), Math.round(cz + x * s + z * c)]; };
        for (let x = -15; x <= 15; x++) for (let z = -6; z <= 6; z++) {
          const [px, pz] = p(x, z);
          v.box(px, 0, pz, px, 2, pz, gloss(0xc83a3a));
          if (z > -6 && z < 6 && Math.abs(x) < 14) v.set(px, 3, pz, gloss(0xe8e4dc));
        }
        for (const [x, z] of [[-9, 0], [-11, 0], [-7, 0], [-9, -2], [-9, 2]]) { const [px, pz] = p(x, z); v.set(px, 4, pz, gloss(0x2a2a2e)); }
        for (const [x, z] of [[8, 1], [11, -1]]) { const [px, pz] = p(x, z); v.box(px, 4, pz, px + 1, 4, pz, gloss(0xe5383b)); }
        return p(0, -6);
      };
      const a = pad(-8, 44, 0.25), b = pad(30, 40, -0.4);
      path(v, [[-20, 2, 19], [-22, 1, 28], [-14, 0, 34], a.length ? [a[0], 1, a[1]] : [0, 0, 0]], gloss(0x2a2a2e));
      path(v, [[22, 2, 19], [28, 1, 26], [b[0], 1, b[1]]], gloss(0x2a2a2e));
    },
  },

  room_kitchen: {
    name: 'Kitchenette', voxel: 0.01,
    build(v) {
      const cab = (x, y, z) => shade(0xf0e6cc, 0.97 + hash(x, y, z, 2) * 0.03);
      fill(v, -60, 6, -29, 59, 81, 27, cab);
      v.box(-60, 0, -29, 59, 5, 24, 0x6a6058);
      // stainless counter with a sink on the left
      fill(v, -61, 82, -30, 60, 84, 29, (x, y, z) => metal(shade(0xc8ccd2, 0.95 + hash(x, y, z, 3) * 0.06)));
      v.box(-50, 70, -20, -14, 84, 18, null);
      fill(v, -50, 70, -20, -14, 70, 18, () => metal(0xa8acb2));
      for (const x of [-50, -14]) fill(v, x, 71, -20, x, 84, 18, () => metal(0xb8bcc2));
      for (const z of [-20, 18]) fill(v, -50, 71, z, -14, 84, z, () => metal(0xb8bcc2));
      v.cylinder(-32, 70, 0, 2, 1, metal(0x6a6e74));
      // faucet
      path(v, [[-32, 85, -24], [-32, 100, -24], [-32, 102, -18], [-32, 98, -12]], metal(0xd8dce2), 1);
      v.box(-36, 85, -27, -28, 87, -23, metal(0xd8dce2));
      // single gas burner on the right with a kettle
      fill(v, 6, 85, -18, 44, 90, 18, (x, y, z) => gloss(shade(0x2a2a2e, 0.96 + hash(x, y, z, 4) * 0.04)));
      for (const k of [6, 44]) v.box(k, 85, 19, k, 88, 19, 0x1a1a1c);
      v.cylinder(25, 91, 0, 9, 1, metal(0x5a5a60)); v.cylinder(25, 91, 0, 7, 1, null);
      for (let k = 0; k < 4; k++) { const a = k * TAU / 4 + 0.4; rod(v, 25, 92, 0, Math.round(25 + Math.cos(a) * 10), 92, Math.round(Math.sin(a) * 10), metal(0x3a3a3e)); }
      v.box(12, 86, 19, 16, 89, 21, gloss(0xd8dce2)); v.box(34, 86, 19, 38, 89, 21, gloss(0xd8dce2));
      // kettle (yellow enamel)
      v.shape(15, 92, -10, 35, 108, 10, (x, y, z) => { const r = 9 - Math.max(0, y - 100) * 0.55; return Math.hypot(x - 25, z) <= r; }, (x, y, z) => gloss(shade(0xf2c040, 0.95 + hash(x, y, z, 5) * 0.06)));
      path(v, [[17, 106, 0], [25, 112, 0], [33, 106, 0]], gloss(0x2a2a2e), 0.8);
      path(v, [[33, 96, 2], [40, 102, 4], [43, 104, 5]], gloss(0xf2c040), 1.2);
      v.sphere(25, 109, 0, 1.6, gloss(0x2a2a2e));
      // dish rack with a couple of plates and a mug
      fill(v, -10, 85, -24, 2, 86, -6, () => metal(0xd8dce2));
      for (let i = 0; i < 3; i++) v.cylinder(-9 + i * 4, 87, -15, 7, 1, gloss(0xf4f0e6), 'x');
      v.cylinder(-2, 85, 6, 3.5, 8, gloss(0x5aa0d8)); v.cylinder(-2, 86, 6, 2.5, 7, null);
      // washing-up liquid and a sponge
      v.box(-56, 85, -24, -53, 96, -21, gloss(0x58c06c)); v.box(-55, 97, -23, -54, 99, -22, gloss(0xf4f0e6));
      v.box(-47, 85, 20, -41, 87, 25, 0xffd23f); v.box(-47, 88, 20, -41, 88, 25, 0x3cae5a);
      // cabinet doors + handles below
      for (const [x0, x1] of [[-58, -31], [-29, -2], [0, 27], [29, 57]]) {
        v.paint(() => { v.box(x0, 8, 27, x1, 8, 27, 0xd8ccb0); v.box(x0, 79, 27, x1, 79, 27, 0xd8ccb0); v.box(x0, 8, 27, x0, 79, 27, 0xd8ccb0); });
        const hx = (x0 + x1) % 2 ? Math.round((x0 + x1) / 2) : (x0 + x1) / 2;
        v.box(hx - 4, 70, 28, hx + 4, 71, 28, metal(0xc8ccd2));
      }
      // a tea towel over the oven-door bar
      fill(v, 34, 54, 28, 46, 72, 29, (x, y, z) => (((y >> 2) % 2) ? 0xf4f0e6 : 0xd8463a));
    },
  },

  room_ac: {
    name: 'Wall Air Conditioner', voxel: 0.01,
    build(v) {
      v.shape(-40, 0, -11, 39, 27, 10, (x, y, z) => {
        const r = 6, dz = Math.max(0, z - 4), dy = Math.max(0, 6 - y);
        return dz * dz + dy * dy <= r * r;
      }, (x, y, z) => gloss(shade(0xf4f2ec, 0.97 + hash(x, y, z, 1) * 0.03)));
      v.paint(() => { for (let y = 16; y <= 24; y += 2) v.box(-36, y, 10, 35, y, 10, 0xe2ded4); });
      fill(v, -38, 0, 2, 37, 4, 8, () => gloss(0xd8d4ca));
      v.box(-34, 2, 9, 33, 2, 9, 0x8a8478);
      v.box(28, 9, 10, 29, 10, 10, glow(0x40d0ff));
      v.layer(['KKK.K.K.KK'], { K: 0xb8b4aa }, { x: -36, y: 12, z: 11 });
    },
  },

  room_lamp: {
    name: 'Ceiling Lamp', voxel: 0.01,
    build(v) {
      // a round fluorescent pendant: milky shade, twin rings glowing through, a pull string with a capsule toggle
      v.cylinder(0, 32, 0, 6, 4, gloss(0xe8e4dc));
      v.cylinder(0, 20, 0, 1, 12, gloss(0xf4f0e6));
      v.shape(-26, 6, -26, 26, 20, 26, (x, y, z) => {
        const d = Math.hypot(x, z), r = 26 - Math.max(0, y - 12) * 1.7;
        return d <= r && d >= r - 1.4 - (y === 6 ? 3 : 0);
      }, (x, y, z) => (y >= 18 ? gloss(0xf4f0e6) : glow(shade(0xfff2dc, 0.94 + (Math.hypot(x, z) % 3 < 1 ? 0.06 : 0)))));
      v.torus(0, 7, 0, 25.5, 0.6, gloss(0xd8b880));
      v.shape(-18, 7, -18, 18, 7, 18, (x, y, z) => { const d = Math.hypot(x, z); return d <= 18 && d >= 10; }, glow(0xfff8ec));
      v.cylinder(0, 6, 0, 9, 1, glow(0xfff4e0));
      // pull string + toggle
      for (let y = -14; y < 6; y++) v.set(12, y, 4, 0xf4f0e6);
      v.box(11, -18, 3, 13, -15, 5, gloss(0xff6f91));
      v.box(11, -20, 3, 13, -19, 5, gloss(0xf4f0e6));
    },
  },

  room_cupnoodle: {
    name: 'Cup Noodle', voxel: 0.004,
    build(v) {
      v.shape(-12, 0, -12, 12, 26, 12, (x, y, z) => { const r = 9 + y * 0.11; return Math.hypot(x, z) <= r; }, (x, y, z) => {
        const a = Math.atan2(z, x);
        if (y >= 10 && y <= 17) return Math.sin(a * 6) > 0.7 && y > 12 && y < 16 ? 0xffd23f : 0xe5383b;
        if (y === 9 || y === 18) return 0xffd23f;
        return shade(0xfbf8f0, 0.97 + hash(x, y, z, 1) * 0.03);
      });
      v.shape(-12, 22, -12, 12, 26, 12, (x, y, z) => Math.hypot(x, z) <= 10.5 && y >= 25, null);
      v.shape(-12, 24, -12, 12, 25, 12, (x, y, z) => Math.hypot(x, z) <= 10.5, (x, y, z) => (hash(x, y, z, 3) < 0.3 ? 0xf8e0a0 : 0xd89a48));
      // the peeled lid sticking up at the back
      v.shape(-9, 26, -20, 9, 33, -9, (x, y, z) => { const t = (y - 26) / 7; return Math.abs(z - (-10 - t * 8)) < 1 && Math.abs(x) <= 9 - t * 2; }, (x, y, z) => (Math.abs(x) < 4 && y > 28 ? 0xe5383b : 0xf4f0e6));
      // waribashi chopsticks on top
      for (const dz of [-2, 2]) for (let x = -16; x <= 16; x++) v.set(x, 27, dz + Math.round(x * 0.08), 0xe8cc98);
    },
  },

  room_trash: {
    name: 'Waste Bin', voxel: 0.01,
    build(v) {
      v.shape(-12, 0, -12, 12, 26, 12, (x, y, z) => { const r = 9 + y * 0.1, d = Math.hypot(x, z); return d <= r && (d >= r - 1.2 || y < 2); }, (x, y, z) => gloss(shade(0x7ab8d8, 0.95 + ((Math.atan2(z, x) * 6) % 1 < 0.2 ? 0.06 : 0))));
      for (const [x, z, y] of [[-3, 2, 22], [4, -3, 24], [0, 5, 25], [-5, -4, 21]]) v.shape(x - 4, y - 3, z - 4, x + 4, y + 4, z + 4, (xx, yy, zz) => Math.hypot(xx - x, yy - y, zz - z) <= 3.6 + vnoise(xx, yy, zz, 2, 5) * 0.8, (xx, yy, zz) => shade(0xf4f0e6, 0.85 + hash(xx, yy, zz, 6) * 0.15));
      v.box(5, 22, 4, 8, 30, 7, 0xe5383b);
    },
  },

  room_clock: {
    name: 'Wall Clock', voxel: 0.005,
    build(v) {
      v.cylinder(0, 0, 0, 28, 4, gloss(0x2a6a5a), 'z');
      v.cylinder(0, 0, 4, 25, 1, (x, y) => shade(0xfbf6ea, 0.98 + hash(x, y, 0, 2) * 0.03), 'z');
      for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; const r = k % 3 === 0 ? [19, 23] : [21, 23]; for (let d = r[0]; d <= r[1]; d++) v.set(Math.round(Math.sin(a) * d), Math.round(Math.cos(a) * d), 5, 0x2a2a2a); }
      // hands at about twenty to seven
      for (let d = 0; d <= 13; d++) { const a = (6.67 / 12) * TAU; v.set(Math.round(Math.sin(a) * d), Math.round(Math.cos(a) * d), 6, 0x2a2a2a); }
      for (let d = 0; d <= 20; d++) { const a = (40 / 60) * TAU; v.set(Math.round(Math.sin(a) * d), Math.round(Math.cos(a) * d), 6, 0x2a2a2a); }
      for (let d = -4; d <= 21; d++) { const a = (17 / 60) * TAU; v.set(Math.round(Math.sin(a) * d), Math.round(Math.cos(a) * d), 7, 0xd83a3a); }
      v.cylinder(0, 0, 6, 1.5, 2, gloss(0xd8b860), 'z');
    },
  },

  room_shoes: {
    name: 'Sneakers', voxel: 0.006,
    build(v) {
      const shoe = (cx, cz, ry, c) => {
        const cs = Math.cos(ry), sn = Math.sin(ry);
        for (let x = -7; x <= 7; x++) for (let z = -22; z <= 22; z++) for (let y = 0; y <= 12; y++) {
          const toe = z > 8 ? (z - 8) / 14 : 0, heel = z < -16 ? (-16 - z) / 6 : 0;
          const w = 7 - toe * 3 - heel * 2;
          if (Math.abs(x) > w) continue;
          const top = y <= 2 ? true : z > 10 ? y <= 7 - toe * 3 : z > -6 ? y <= 9 : y <= 12;
          if (!top) continue;
          if (y > 3 && z > -14 && z < 6 && Math.abs(x) < w - 2 && y > 6) continue; // opening
          const px = Math.round(cx + x * cs + z * sn), pz = Math.round(cz - x * sn + z * cs);
          const col = y <= 2 ? 0xf4f0e6 : (y === 3 ? 0xd8d0c0 : (Math.abs(x) >= w - 1 && z > -10 && z < 6 && y > 4 ? 0xffffff : c));
          v.set(px, y, pz, col);
        }
      };
      shoe(-9, 0, 0.12, 0xd83a3a); shoe(10, 3, -0.2, 0xd83a3a);
    },
  },

  room_hanger: {
    name: 'Shirt on a Hanger', voxel: 0.01,
    build(v) {
      // a hook at the top (hangs from a rail at y = top), an aloha shirt below
      path(v, [[0, 60, 0], [0, 63, 0], [2, 65, 0], [0, 67, 0], [-2, 65, 0]], metal(0xb8bcc2));
      path(v, [[-19, 52, 0], [0, 59, 0], [19, 52, 0]], gloss(0x9a6a3a), 0.6);
      const shirt = (x, y, z) => {
        const n = vnoise(x, y, 0, 4, 3);
        if (n > 0.68) return 0xffd8e0;
        if (n < 0.28) return 0x58b878;
        return shade(0x2a8ad8, 0.94 + hash(x, y, z, 2) * 0.06);
      };
      v.shape(-24, 0, -2, 23, 56, 2, (x, y, z) => {
        const ax = Math.abs(x + 0.5);
        if (y > 46) return ax <= 18 - (y - 46) * 1.1 && Math.abs(z) <= 1;
        if (y > 34) return ax <= 23.5 - (46 - y) * 0.2 && Math.abs(z) <= (ax < 15 ? 2 : 1);
        return ax <= 15.5 && Math.abs(z) <= 2;
      }, shirt);
      v.paint(() => { v.box(-1, 2, 2, 0, 52, 2, 0xf4f0e6); for (let y = 8; y < 50; y += 9) v.set(0, y, 2, 0xfbf3e0); });
      v.box(-6, 50, 2, 5, 53, 2, shirt);
    },
  },

  room_boxes: {
    name: 'Moving Boxes', voxel: 0.01,
    build(v) {
      const card = (s) => (x, y, z) => shade(0xc8a070, 0.92 + vnoise(x, y, z, 4, s) * 0.1 + hash(x, y, z, s) * 0.03);
      fill(v, -24, 0, -18, 23, 32, 17, card(1));
      v.box(-24, 31, -2, 23, 32, 1, 0xd8c8a8); v.box(-25, 14, 18, 24, 18, 18, 0xd8c8a8);
      fill(v, -18, 33, -14, 17, 56, 13, card(2));
      v.box(-18, 56, -1, 17, 56, 1, 0xd8c8a8);
      // marker writing (blocky letters) on the fronts
      v.layer(['K.K.KKK.K.K.KKK', 'KK..K.K.KK..K..', 'K.K.KKK.K.K.KKK'], { K: 0x2a2a3a }, { x: -8, y: 26, z: 18 });
      v.layer(['KKK.K.K.KKK', 'K...K.K.KK.', 'KKK.KKK.K..'], { K: 0xc83a3a }, { x: -6, y: 48, z: 14 });
      v.layer(['.R.R.', 'RRRRR', '.RRR.', '..R..'], { R: 0xe5383b }, { x: 10, y: 50, z: 14 });
    },
  },

  room_mug: {
    name: 'Mug', voxel: 0.004,
    build(v) {
      v.shape(-11, 0, -11, 11, 22, 11, (x, y, z) => { const d = Math.hypot(x, z); return d <= 10 && (d >= 8.6 || y < 2); }, (x, y, z) => gloss(y > 10 && y < 15 && Math.sin(Math.atan2(z, x) * 5) > 0.3 ? 0xff6f91 : 0xfbf8f0));
      v.cylinder(0, 2, 0, 8.6, 15, 0x6a3a1c);
      v.torus(13, 11, 0, 4.5, 1.2, gloss(0xfbf8f0), 'z');
    },
  },

  room_phone: {
    name: 'Cordless Phone', voxel: 0.005,
    build(v) {
      fill(v, -14, 0, -12, 13, 5, 11, () => gloss(0xe8e4da));
      fill(v, -9, 6, -10, 8, 9, 22, () => gloss(0xf2eee6));
      for (let i = 0; i < 12; i++) v.set(-6 + (i % 3) * 5, 10, -6 + Math.floor(i / 3) * 5, gloss(0x9a9890));
      v.box(-5, 10, 14, 4, 10, 18, glow(0x90e090));
      v.box(9, 6, -10, 11, 14, -8, glow(0xff4040));
    },
  },
};

export default room;
