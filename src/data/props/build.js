// Props for money and shop furniture (src/money/, src/build/): the street ATM kiosk, the piggy bank, the tip jar, the
// gumball machine, the robot vacuum and its dock, a wall clock, an electric fan with separate blades, a round cat
// cushion and a gumball. Each entry: { name, voxel (metres per voxel), build(v) }. Facing +z. Props that need exact
// coordinates at runtime (the ATM's screen and slots, the clock's centre, the fan's hub) set v.pivot so model
// voxel (0, 0, 0) is the origin.
import { shade, mix } from '../../voxel/palette.js';
import { gloss, metal, glow, glass } from '../../voxel/VoxelModel.js';
import { hash, vnoise, fill } from './garage.js';

const R = Math.round;
const GUM = [0xff4f6a, 0xffd23f, 0x5cc4ff, 0x58c06c, 0xff9a3c, 0xb88ae8, 0xfff4e8, 0xff7ac8];
/** Set a pixel pattern on the plane z (rows[0] at y0 = top row). */
function stamp(v, rows, legend, x0, y0, z) {
  rows.forEach((row, r) => [...row].forEach((ch, c) => { if (legend[ch] !== undefined) v.set(x0 + c, y0 - r, z, legend[ch]); }));
}
const enamel = (c, k = 0.05, s = 1) => (x, y, z) => gloss(shade(c, 1 - k / 2 + hash(x, y, z, s) * k));

/** Gumballs filling the globe of the gumball machine up to `level` (0..1). Globe centre (0, 0, 0), radius 13. */
function gumballs(v, level) {
  const top = -11 + level * 22;
  for (let x = -12; x <= 12; x += 2) for (let y = -12; y <= 12; y += 2) for (let z = -12; z <= 12; z += 2) {
    const jx = x + (hash(x, y, z, 3) > 0.5 ? 1 : 0), jz = z + (hash(z, x, y, 4) > 0.5 ? 1 : 0);
    if (Math.hypot(jx, y, jz) > 11.2 || y > top + (hash(x, z, 0, 9) - 0.5) * 3) continue;
    const c = GUM[Math.floor(hash(x, y, z, 7) * GUM.length)];
    v.box(jx - 1, y - 1, jz - 1, jx, y, jz, gloss(c));
    v.set(jx - 1, y, jz, gloss(shade(c, 1.25)));
  }
}

const props = {
  // ------------------------------------------------------------- the street ATM kiosk (pivot at the bottom centre)
  atm_kiosk: {
    name: 'Shinkin ATM Kiosk', voxel: 0.02,
    build(v) {
      v.jitter = 0.01;
      const cream = enamel(0xe8e4da, 0.04, 2), grey = enamel(0x8a9096, 0.05, 3), dark = gloss(0x2a2c30), green = enamel(0x2f8a5a, 0.04, 4);
      fill(v, -19, 0, -14, 18, 2, 11, gloss(0x3a3c40)); // plinth
      fill(v, -19, 3, -14, 18, 69, 9, cream); // the cabinet
      // a green band down each side and across the top
      v.paint(() => { v.box(-19, 3, -14, -19, 69, -11, green); v.box(18, 3, -14, 18, 69, -11, green); v.box(-19, 62, -14, 18, 66, 9, green); });
      // the fascia: a dark bezel round the screen (y 44..61), soft keys left and right of it
      fill(v, -14, 44, 9, 13, 61, 10, grey);
      fill(v, -11, 46, 10, 10, 59, 10, null);
      v.box(-11, 46, 9, 10, 59, 9, dark);
      // the privacy hood: grey wings either side of the screen and a slim brow over it
      for (const x of [-19, 18]) fill(v, x, 40, 9, x, 64, 14, grey);
      fill(v, -19, 64, 9, 18, 65, 12, grey);
      // the console: a ledge jutting out (y 34..39) that carries the keypad (keys are their own meshes)
      fill(v, -17, 33, 9, 16, 37, 18, cream);
      v.paint(() => v.box(-16, 37, 11, 3, 37, 18, grey)); // keypad well (the keys are their own meshes)
      // card slot block (right of the keypad) with its green light; the receipt slot on the ledge front
      fill(v, 6, 38, 11, 14, 41, 15, grey);
      v.paint(() => { v.box(7, 39, 15, 13, 39, 15, dark); v.box(7, 40, 15, 13, 40, 15, glow(0x2a9a4a)); });
      v.paint(() => v.box(7, 35, 18, 13, 35, 18, dark));
      // the cash tray (y 22..30): a dark mouth with a lip
      fill(v, -12, 21, 9, 11, 31, 11, grey);
      v.box(-10, 23, 11, 9, 29, 11, dark);
      fill(v, -12, 20, 11, 11, 21, 14, grey);
      // instruction plate and the coins sticker
      fill(v, -12, 12, 10, 11, 18, 10, enamel(0xf6f2e6, 0.02, 5));
      v.paint(() => { for (let y = 13; y <= 17; y += 2) v.box(-10, y, 10, R(-10 + hash(y, 1) * 6 + 10), y, 10, 0x6a6e74); v.box(4, 13, 10, 9, 17, 10, 0xe5383b); });
      // the lit sign on top: ATM in white on dark blue, a green leaf mark
      fill(v, -19, 70, -12, 18, 77, 10, gloss(0x1e3e78));
      v.paint(() => {
        const ATM = ['.###..#####.#...#', '#...#...#...##.##', '#####...#...#.#.#', '#...#...#...#...#', '#...#...#...#...#'];
        stamp(v, ATM, { '#': glow(0xe8f0ff) }, -6, 76, 10);
        stamp(v, ['.##.', '####', '.##.', '..#.'], { '#': glow(0x58c06c) }, -15, 76, 10);
        v.box(-19, 70, 10, 18, 70, 10, gloss(0x2a5aa8)); v.box(-19, 77, 10, 18, 77, 10, gloss(0x2a5aa8));
      });
      // the dark back and a vent
      v.paint(() => { for (let y = 8; y <= 30; y += 3) v.box(-12, y, -14, 11, y, -14, 0x9a968e); });
      v.pivot = { x: 0, y: 0, z: 0 };
    },
  },

  // ------------------------------------------------------------- piggy bank (豚の貯金箱), pink glazed ceramic
  piggy_bank: {
    name: 'Piggy Bank', voxel: 0.008,
    build(v) {
      v.jitter = 0.02;
      const pink = (x, y, z) => gloss(shade(0xf4a2b8, 0.95 + vnoise(x, y, z, 5, 2) * 0.08));
      v.ellipsoid(0, 9, 0, 8, 7, 10, pink);
      for (const [x, z] of [[-5, -6], [5, -6], [-5, 6], [5, 6]]) v.cylinder(x, 0, z, 2, 3, pink);
      v.cylinder(0, 9, 10, 3.2, 3, gloss(0xf6b4c6), 'z'); // snout
      v.set(-1, 9, 12, gloss(0x8a3a4a)); v.set(1, 9, 12, gloss(0x8a3a4a));
      for (const s of [-1, 1]) { v.box(s * 5, 15, 5, s * 6, 17, 6, pink); v.set(s * 6, 17, 6, gloss(0xe88aa4)); }
      for (const s of [-1, 1]) v.set(s * 3, 12, 9, gloss(0x2a1a1e));
      v.paint(() => { for (const s of [-1, 1]) v.set(s * 5, 10, 8, gloss(0xff7a9a)); }); // blush
      // painted flowers on the sides, a coin slot on the back
      v.paint(() => {
        for (const s of [-1, 1]) for (const [y, z] of [[9, -2], [6, 3], [12, 4]]) {
          v.set(s * 8, y, z, gloss(0xffffff)); v.set(s * 8, y + 1, z, gloss(0xe5383b)); v.set(s * 8, y - 1, z, gloss(0xe5383b)); v.set(s * 8, y, z + 1, gloss(0xe5383b)); v.set(s * 8, y, z - 1, gloss(0xe5383b));
        }
      });
      v.box(-2, 16, -2, 2, 16, -1, null);
      v.box(-2, 15, -2, 2, 15, -1, gloss(0x3a1a22));
      v.line(0, 9, -10, 1, 11, -11, gloss(0xf4a2b8)); v.set(2, 12, -11, gloss(0xf4a2b8)); // tail
    },
  },

  // ------------------------------------------------------------- tip jar (a glass jar with a paper label)
  tip_jar: {
    name: 'Tip Jar', voxel: 0.008,
    build(v) {
      v.jitter = 0;
      v.tube(0, 0, 0, 7, 6, 15, glass(0xd8eef4));
      v.cylinder(0, 0, 0, 6, 1, glass(0xc8e2ea));
      v.tube(0, 15, 0, 7, 5, 2, glass(0xe4f4f8)); // the lip
      // paper label tied round the middle: "TIPS" with a smile
      v.paint(() => v.shape(-8, 5, -8, 8, 10, 8, (x, y, z) => z > 2, (x, y, z) => (y === 5 || y === 10 ? 0xd8c890 : 0xf6f0e0)));
      const TIPS = ['###.#.###..##', '.#..#.#.#.#..', '.#..#.###..#.', '.#..#.#.....#', '.#..#.#....##'];
      stamp(v, TIPS, { '#': 0xe5383b }, -6, 9, 7);
      v.set(-7, 9, 6, 0xd8c890);
      v.pivot = { x: 0, y: 0, z: 0 };
    },
  },

  // ------------------------------------------------------------- gumball machine: stand + red head; globe and balls separate
  gumball_base: {
    name: 'Gumball Machine', voxel: 0.012,
    build(v) {
      const red = enamel(0xd8302a, 0.06, 2), chrome = metal(0xd8dce0);
      v.cylinder(0, 0, 0, 12, 2, red); v.cylinder(0, 2, 0, 9, 2, red);
      v.cylinder(0, 4, 0, 2.5, 46, chrome);
      v.cylinder(0, 50, 0, 7, 2, red);
      // the head: a square-ish cast block with the coin mech on the front
      fill(v, -9, 52, -9, 8, 66, 8, red);
      v.paint(() => { v.box(-9, 66, -9, 8, 66, 8, gloss(shade(0xd8302a, 1.15))); });
      fill(v, -5, 54, 9, 4, 64, 10, chrome); // mech plate
      v.cylinder(0, 59, 11, 3, 2, chrome, 'z'); // the knob hub
      v.box(-4, 58, 12, 3, 59, 13, chrome); // the turning handle
      v.box(-1, 62, 11, 0, 63, 11, gloss(0x2a2a2a)); // coin slot
      // the chute flap
      fill(v, -3, 52, 9, 2, 54, 12, chrome);
      v.box(-2, 53, 12, 1, 53, 12, gloss(0x2a2a2a));
      // the globe collar
      v.cylinder(0, 67, 0, 8, 1, chrome);
      // price sticker
      v.paint(() => { v.box(-8, 56, 8, -6, 61, 8, gloss(0xfff4d8)); v.set(-7, 59, 8, 0xe5383b); v.set(-7, 57, 8, 0xe5383b); });
      v.pivot = { x: 0, y: 0, z: 0 };
    },
  },
  gumball_globe: {
    name: 'Gumball Globe', voxel: 0.012,
    build(v) {
      v.jitter = 0;
      v.shape(-13, -13, -13, 13, 13, 13, (x, y, z) => { const d = Math.hypot(x, y, z); return d <= 13.2 && d > 12.1; }, glass(0xe0f4fa));
      v.cylinder(0, 12, 0, 4, 2, gloss(0xd8302a));
      v.sphere(0, 15, 0, 1.6, gloss(0xd8302a));
      v.pivot = { x: 0, y: 0, z: 0 };
    },
  },
  gumball_fill_1: { name: 'Gumballs', voxel: 0.012, build(v) { gumballs(v, 0.22); v.pivot = { x: 0, y: 0, z: 0 }; } },
  gumball_fill_2: { name: 'Gumballs', voxel: 0.012, build(v) { gumballs(v, 0.45); v.pivot = { x: 0, y: 0, z: 0 }; } },
  gumball_fill_3: { name: 'Gumballs', voxel: 0.012, build(v) { gumballs(v, 0.7); v.pivot = { x: 0, y: 0, z: 0 }; } },
  gumball_fill_4: { name: 'Gumballs', voxel: 0.012, build(v) { gumballs(v, 0.95); v.pivot = { x: 0, y: 0, z: 0 }; } },
  gumball: {
    name: 'Gumball', voxel: 0.004,
    build(v) { v.jitter = 0.02; v.sphere(0, 3, 0, 3, gloss(0xff4f6a)); v.set(-1, 5, 2, gloss(0xffb0c0)); },
  },

  // ------------------------------------------------------------- robot vacuum and its dock
  robot_vacuum: {
    name: 'Robot Vacuum', voxel: 0.006,
    build(v) {
      v.jitter = 0.01;
      const top = (x, y, z) => gloss(shade(0x34383e, 0.96 + hash(x, y, z, 2) * 0.04));
      v.cylinder(0, 1, 0, 28, 12, top);
      v.cylinder(0, 0, 0, 26, 1, gloss(0x1e2024));
      // the light-grey bumper round the front half
      v.paint(() => v.shape(-29, 2, -29, 29, 9, 29, (x, y, z) => Math.hypot(x, z) > 26.5 && z > -6, gloss(0xc8ccd0)));
      // a lid seam, the laser turret, the buttons
      v.paint(() => v.shape(-29, 13, -29, 29, 13, 29, (x, y, z) => { const d = Math.hypot(x, z); return d > 19 && d < 20; }, gloss(0x24272c)));
      v.cylinder(0, 13, -8, 6, 3, gloss(0x24272c));
      v.cylinder(0, 16, -8, 5, 1, gloss(0x3a3e44));
      v.box(-4, 13, 10, 3, 13, 13, gloss(0x24272c));
      v.box(-1, 13, 11, 0, 13, 12, glow(0x58e08a)); // the status light (changed by the game)
      v.pivot = { x: 0, y: 0, z: 0 };
    },
  },
  vacuum_dock: {
    name: 'Vacuum Dock', voxel: 0.006,
    build(v) {
      const w = (x, y, z) => gloss(shade(0xe8eaec, 0.97 + hash(x, y, z, 3) * 0.03));
      fill(v, -22, 0, -6, 21, 2, 10, w); // the ramp plate
      fill(v, -22, 3, -6, 21, 18, 0, w); // the back
      v.paint(() => { v.box(-22, 18, -6, 21, 18, 0, gloss(0xd0d4d8)); });
      for (const x of [-12, 11]) v.box(x, 3, 1, x + 1, 4, 2, metal(0xd8b860)); // charging contacts
      v.box(-2, 12, 1, 1, 14, 1, glow(0x58a0ff)); // the dock light
      v.pivot = { x: 0, y: 0, z: 0 };
    },
  },

  // ------------------------------------------------------------- wall clock (hands are separate meshes)
  wall_clock: {
    name: 'Wall Clock', voxel: 0.01,
    build(v) {
      v.jitter = 0.01;
      v.cylinder(0, 0, -3, 15, 3, gloss(0x7a4a26), 'z');
      v.paint(() => v.shape(-15, -15, -1, 15, 15, -1, (x, y) => Math.hypot(x, y) > 13.5, gloss(0x5a321a)));
      v.cylinder(0, 0, 0, 13, 1, 0xfbf6ea, 'z');
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2, r = k % 3 ? 11 : 10;
        for (let rr = r; rr <= 12; rr++) v.set(R(Math.sin(a) * rr), R(Math.cos(a) * rr), 1, 0x2a2420);
      }
      v.set(0, 0, 1, gloss(0xc8a040));
      v.pivot = { x: 0, y: 0, z: 0 };
    },
  },

  // ------------------------------------------------------------- electric fan: body and guard; the blades spin separately
  fan_stand: {
    name: 'Electric Fan', voxel: 0.01,
    build(v) {
      const cream = (x, y, z) => gloss(shade(0xece1c8, 0.96 + hash(x, y, z, 3) * 0.05));
      const chrome = gloss(0xd8dce0);
      v.cylinder(0, 0, 0, 15, 2, cream); v.cylinder(0, 2, 0, 13.6, 2, cream); v.cylinder(0, 4, 0, 9, 1, cream);
      [0xf4f0e6, 0x5aa0e8, 0x58c06c, 0xff8c2e].forEach((c, i) => v.box(-8 + i * 4, 3, 8, -6 + i * 4, 4, 12, gloss(c)));
      v.cylinder(0, 5, 0, 2.6, 28, cream); v.cylinder(0, 32, 0, 3, 2, gloss(0xc8bca0));
      v.cylinder(0, 34, 0, 1.6, 21, chrome);
      v.pivot = { x: 0, y: 0, z: 0 };
    },
  },
  fan_head: {
    name: 'Fan Head', voxel: 0.01,
    build(v) {
      const cream = (x, y, z) => gloss(shade(0xece1c8, 0.96 + hash(x, y, z, 3) * 0.05));
      const chrome = gloss(0xd8dce0), wire = gloss(0xa8adb3);
      v.box(-2, 55, -4, 2, 60, 0, cream);
      v.ellipsoid(0, 70, -6, 7, 7, 8.5, cream);
      v.paint(() => { for (let y = 66; y <= 74; y += 2) v.box(-5, y, -15, 5, y, -12, gloss(0x8a8270)); });
      const gy = 70;
      v.torus(0, gy, 3, 16.5, 0.9, chrome, 'z');
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2 + 0.1;
        v.line(Math.cos(a) * 3.5, gy + Math.sin(a) * 3.5, 8, Math.cos(a) * 16, gy + Math.sin(a) * 16, 4, wire);
        if (k % 2 === 0) v.line(Math.cos(a) * 3.5, gy + Math.sin(a) * 3.5, -1, Math.cos(a) * 16, gy + Math.sin(a) * 16, 2, wire);
      }
      v.torus(0, gy, 7, 8, 0.45, wire, 'z'); v.torus(0, gy, 6, 12.5, 0.45, wire, 'z');
      v.cylinder(0, gy, 0, 3.2, 2, cream, 'z');
      v.pivot = { x: 0, y: 55, z: -2 };
    },
  },
  fan_blades: {
    name: 'Fan Blades', voxel: 0.01,
    build(v) {
      v.shape(-15, -15, 2, 15, 15, 5, (x, y, z) => {
        const r = Math.hypot(x, y);
        if (r < 3 || r > 14.3) return false;
        const a = Math.atan2(y, x);
        for (let k = 0; k < 4; k++) {
          let da = a - (k * Math.PI / 2 + 0.5);
          da = Math.atan2(Math.sin(da), Math.cos(da));
          const w = 0.22 + 0.42 * (r / 14);
          if (Math.abs(da) < w) return z === (da > 0 ? 4 : 3);
        }
        return false;
      }, (x, y) => gloss(mix(0x5ab8d0, 0x9fdcea, Math.hypot(x, y) / 16)));
      v.cylinder(0, 0, 2, 3.2, 6, gloss(0xece1c8), 'z');
      v.cylinder(0, 0, 8, 2.4, 1, gloss(0x3a6ab0), 'z');
      v.set(0, 0, 9, gloss(0xf2c14e));
      v.pivot = { x: 0, y: 0, z: 0 };
    },
  },

  // ------------------------------------------------------------- a round cat cushion (donut bed)
  cat_cushion: {
    name: 'Cat Cushion', voxel: 0.01,
    build(v) {
      v.jitter = 0.03;
      const rim = (x, y, z) => shade(0xd87a4a, 0.92 + vnoise(x, y, z, 3, 2) * 0.12);
      v.shape(-22, 0, -22, 22, 12, 22, (x, y, z) => { const d = Math.hypot(x, z); const t = Math.hypot(d - 16, (y - 6) * 1.1); return t < 6.5; }, rim);
      v.cylinder(0, 0, 0, 15, 4, (x, y, z) => shade(0xf4e6d0, 0.94 + vnoise(x, y, z, 2, 5) * 0.1));
      v.paint(() => v.shape(-22, 0, -22, 22, 12, 22, (x, y, z) => { const a = Math.atan2(z, x); return Math.round(a * 6 / Math.PI) % 2 === 0 && y > 8; }, (x, y, z) => shade(0xe89a6a, 0.95 + hash(x, y, z, 1) * 0.06)));
    },
  },
};

export default props;
