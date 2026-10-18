// Series 16 — Capsule Sentai Kapuranger (カプセル戦隊カプレンジャー)
// Tiny chibi henshin heroes, one very loyal grunt, a five-colour explosion and the giant combining robot.
import { C, shade, mix } from '../../voxel/palette.js';
import { VoxelModel, gloss, glow, glass } from '../../voxel/VoxelModel.js';

const K = C.ink;
const W = 0xffffff;
const SUIT = { red: 0xe8343a, blue: 0x2f6fd6, yellow: 0xffc21f, pink: 0xff7ab0, green: 0x3cbf5a };
const VISOR = 0x1c1e2e;
const SILVER = 0xdfe3ea;

/** Deterministic coordinate hash in [0, 1). */
function hash(x, y, z, s = 0) {
  let h = (x * 374761393 + y * 668265263 + z * 1274126177 + s * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const floorClip = (v) => v.box(-40, -12, -40, 40, -1, 40, null);

const VISORS = {
  red: [-5, 17, ['VVVVVVVVVVV', 'VHVVVVVVVVV', '.VVVV.VVVV.', '..VV...VV..']],
  blue: [-5, 17, ['V.........V', 'VVVVVVVVVVV', 'VHHVVVVVVVV', '.VVVVVVVVV.']],
  yellow: [-4, 17, ['.VV...VV.', 'VHVV.VHVV', 'VVVV.VVVV', '.VV...VV.']],
  pink: [-3, 18, ['.VV.VV.', 'VHVVVVV', 'VVVVVVV', '.VVVVV.', '..VVV..', '...V...']],
  green: [-4, 18, ['....V....', '..VVVVV..', 'VHVVVVVVV', '..VVVVV..', '....V....']],
};

/**
 * Chibi henshin hero (own model), facing +z, feet on y=0. Head (helmet) centre (0, 16, 0.3).
 * o: { suit, visor, arms: [[from,to],[from,to]], skirt, human (unmasked face), sit }
 */
function hero(o) {
  const m = new VoxelModel();
  const sc = o.suit, suit = gloss(sc), Wg = gloss(W);
  if (o.sit) {
    // thighs forward on the seat, shins hanging down, boots on the floor
    for (const s of [-1, 1]) {
      m.box(s * 1, 7, 0, s * 3, 8, 5, suit);
      m.box(s * 1, 2, 4, s * 3, 6, 6, suit);
      m.box(s * 1, 0, 4, s * 3, 2, 8, Wg);
      m.paint(() => m.box(s * 1, 2, 4, s * 3, 2, 8, suit));
    }
  } else {
    for (const s of [-1, 1]) {
      m.box(s * 1, 0, -1, s * 3, 2, 2, Wg);
      m.paint(() => m.box(s * 1, 2, -1, s * 3, 2, 2, suit));
      m.box(s * 1, 3, -1, s * 3, 4, 1, suit);
    }
  }
  // torso with white chest V bands and a capsule badge
  m.ellipsoid(0, 7.6, 0, 4.2, 3.8, 3.1, suit);
  m.paint(() => m.shape(-5, 6, 1, 5, 11, 6, (x, y) => Math.abs(Math.abs(x) - (11 - y) * 0.85) < 0.75 && y >= 7, Wg));
  m.project(['.YY.', 'YYYY', 'WWWW', '.WW.'], { Y: gloss(C.yellow), W: Wg }, -2, 10);
  // back: white shoulder bands + capsule mark between the shoulders
  m.paint(() => m.shape(-5, 6, -6, 5, 11, -1, (x, y) => Math.abs(Math.abs(x) - (11 - y) * 0.85) < 0.75 && y >= 7, Wg));
  m.project(['.WW.', 'WYYW', '.WW.'], { Y: gloss(C.yellow), W: Wg }, -2, 10, '-z');
  // belt + buckle
  m.paint(() => m.box(-5, 4, -4, 5, 5, 4, gloss(0x24242e)));
  m.project(['SSS', 'SRS'], { S: gloss(SILVER), R: gloss(C.red) }, -1, 5);
  if (o.skirt) {
    m.shape(-6, 3, -5, 6, 4, 5, (x, y, z) => { const r = Math.hypot(x, z * 1.15); return r <= 5.4 - (y - 3) * 0.8 && r > 3; }, suit);
    m.paint(() => m.shape(-6, 3, -5, 6, 3, 5, () => true, Wg));
  }
  // head
  if (o.human) {
    const skin = C.skin, hair = 0x2a2226;
    m.ellipsoid(0, 15.6, 0.3, 5.6, 5.3, 5.2, skin);
    m.recolor((x, y, z, c) => (c === skin && (y >= 18.5 || z <= -1.5 || (Math.abs(x) >= 5 && y >= 14)) ? hair : undefined));
    m.project(['KKK...KKK', '.........', '.KK...KK.'], { K }, -4, 17);
    m.project(['MMMMM', '.M.M.'], { M: hair }, -2, 13);
    m.project(['.T.'], { T: 0xc85a5a }, -1, 11);
    m.project(['B.B.B.B'], { B: shade(skin, 0.86) }, -3, 11);
    m.project(['PP.......PP'], { P: 0xffb0a0 }, -5, 14);
  } else {
    m.ellipsoid(0, 16, 0.3, 6, 5.7, 5.5, suit);
    // silver mouth plate + crest
    m.paint(() => m.shape(-6, 10, 2, 6, 12, 7, (x, y) => y <= 12 && Math.abs(x) <= 3 - (12 - y) * 0.5 + 1, gloss(SILVER)));
    m.recolor((x, y, z, c) => (c === sc && Math.abs(x) <= 0 && y >= 19 && z > -4 ? W : undefined));
    m.recolor((x, y, z, c) => (c === sc && y >= 10 && y <= 11 && z < 0 ? shade(sc, 0.72) : undefined));
    const [vx, vy, rows] = VISORS[o.visor || 'red'];
    m.project(rows, { V: gloss(VISOR), H: gloss(0x8fd8ff) }, vx, vy);
    // side ear-pieces
    for (const s of [-1, 1]) m.box(s * 6, 14, -1, s * 7, 16, 1, gloss(SILVER));
  }
  // arms with white gloves
  for (const [from, to] of o.arms || [[[-4.5, 9.5, 0], [-6, 6, 1]], [[4.5, 9.5, 0], [6, 6, 1]]]) {
    m.line(...from, ...to, suit, 1.2);
    m.sphere(...to, 1.4, Wg);
  }
  return m;
}

/** Rounded box: corners of every edge trimmed. */
function rbox(v, x0, y0, z0, x1, y1, z1, c) {
  v.box(x0, y0, z0, x1, y1, z1, c);
  for (const x of [x0, x1]) for (const z of [z0, z1]) v.box(x, y0, z, x, y1, z, null);
  for (const x of [x0, x1]) for (const y of [y0, y1]) v.box(x, y, z0, x, y, z1, null);
  for (const y of [y0, y1]) for (const z of [z0, z1]) v.box(x0, y, z, x1, y, z, null);
}

/** Smoke puff of the explosion. */
function puff(v, cx, cy, cz, r, col) {
  v.sphere(cx, cy, cz, r, col);
  v.sphere(cx - r * 0.6, cy - r * 0.3, cz + 0.5, r * 0.7, col);
  v.sphere(cx + r * 0.6, cy - r * 0.2, cz + 0.5, r * 0.7, col);
  v.paint(() => v.shape(cx - r - 2, cy - r - 2, cz - r - 2, cx + r + 2, cy + r + 2, cz + r + 2, (x, y, z) => y - cy + (x - cx) * 0.3 > r * 0.25, mix(col, W, 0.35)));
  v.paint(() => v.shape(cx - r - 2, cy - r - 2, cz - r - 2, cx + r + 2, cy + r + 2, cz + r + 2, (x, y) => y - cy < -r * 0.45, shade(col, 0.8)));
}

export default {
  id: 'sentai',
  order: 16,
  name: 'Capsule Sentai Kapuranger',
  jp: 'カプセル戦隊カプレンジャー',
  tagline: 'Tiny henshin heroes, assemble!',
  taglineJp: '変身！ちびっこヒーロー参上！',
  price: 500,
  themes: ['city', 'weird'],
  card: { bg: '#fff4d6', accent: '#e8343a', text: '#1e1e3a', accent2: '#2f6fd6', pattern: 'stars' },
  capsule: { colors: [0xe8343a, 0x2f6fd6, 0xffc21f, 0xff7ab0, 0x3cbf5a] },
  items: [
    {
      id: 'red', name: 'Kapu Red', jp: 'カプレッド', rarity: 'common',
      desc: 'The leader. Shouts his own name before every sentence, including "good morning".',
      build(v) {
        v.merge(hero({
          suit: SUIT.red, visor: 'red',
          arms: [[[-4.5, 9.5, 0], [-5, 6, 3]], [[4.5, 9.5, 0], [7, 15, 1]]],
        }));
        v.box(6, 16, 0, 8, 17, 2, gloss(W)); // fist up
      },
    },
    {
      id: 'blue', name: 'Kapu Blue', jp: 'カプブルー', rarity: 'common',
      desc: 'Cool, calm, and secretly practises the team pose alone in the mirror.',
      build(v) {
        v.merge(hero({
          suit: SUIT.blue, visor: 'blue',
          arms: [[[-4.5, 9.5, 0], [-3, 8, 5]], [[4.5, 9.5, 0], [2, 8, 5]]],
        }));
        // capsule blaster held forward in both hands
        rbox(v, -2, 7, 5, 2, 10, 10, gloss(0xe8ecf2));
        v.box(-1, 8, 11, 1, 9, 12, gloss(0x2f6fd6));
        v.set(0, 9, 13, glow(0x8fe0ff)).set(0, 8, 13, glow(0x8fe0ff));
        v.box(-1, 5, 6, 1, 7, 7, gloss(0x3a3a48));
        v.project(['BBB'], { B: gloss(0x2f6fd6) }, -1, 10);
      },
    },
    {
      id: 'yellow', name: 'Kapu Yellow', jp: 'カプイエロー', rarity: 'common',
      desc: 'Has eaten curry before every single battle since episode one. Undefeated.',
      build(v) {
        v.merge(hero({
          suit: SUIT.yellow, visor: 'yellow',
          arms: [[[-4.5, 9.5, 0], [-5, 8, 5]], [[4.5, 9.5, 0], [4, 10, 5]]],
        }));
        // curry plate in the left hand, spoon in the right
        v.ellipsoid(-5, 9, 6, 3.6, 0.6, 2.8, gloss(W));
        v.ellipsoid(-6, 10, 6, 1.8, 0.8, 1.8, 0xfffaf0);
        v.ellipsoid(-4, 10, 6.5, 1.8, 0.7, 1.6, gloss(0xc8862a));
        v.set(-4, 11, 6, 0xff8a3a).set(-3, 11, 7, 0x8a4a1a);
        v.line(4, 10, 6, 2, 14, 7, gloss(SILVER));
        v.ellipsoid(2, 15, 7, 0.8, 1, 0.6, gloss(SILVER));
      },
    },
    {
      id: 'pink', name: 'Kapu Pink', jp: 'カプピンク', rarity: 'uncommon',
      desc: 'Heart visor, heart baton, heart of steel. Has suplexed a kaiju. Twice.',
      build(v) {
        // star stage
        v.shape(-9, 0, -9, 9, 1, 9, (x, y, z) => {
          const a = Math.atan2(z, x), r = Math.hypot(x, z);
          const R = 6 + 2.6 * Math.cos(5 * (a + Math.PI / 2 - Math.PI / 5));
          return r <= Math.max(5.6, R);
        }, gloss(0xffd23f));
        v.paint(() => v.shape(-9, 1, -9, 9, 1, 9, (x, y, z) => Math.hypot(x, z) < 4, gloss(0xfff0a0)));
        v.merge(hero({
          suit: SUIT.pink, visor: 'pink', skirt: true,
          arms: [[[-4.5, 9.5, 0], [-7, 9, 3]], [[4.5, 9.5, 0], [5, 14, 3]]],
        }), 0, 2, 0);
        // peace sign by the visor
        v.set(5, 17, 3, gloss(W)).set(6, 18, 3, gloss(W)).set(4, 18, 3, gloss(W));
        // heart baton
        v.line(-7, 9, 3, -9, 16, 3, gloss(W));
        v.layer(['.HH.HH.', 'HHHHHHH', '.HHHHH.', '..HHH..', '...H...'], { H: gloss(0xff4f8a) }, { x: -12, y: 21, z: 3 });
        v.set(-11, 20, 4, gloss(W));
      },
    },
    {
      id: 'grunt', name: 'Combatant Grunt', jp: '戦闘員', rarity: 'uncommon',
      desc: 'Answers everything with "Iii!". Including his job interview. He got the job.',
      build(v) {
        const suit = 0x2a2434;
        v.merge(hero({
          suit, visor: 'red',
          arms: [[[-4.5, 9.5, 0], [-7, 15, 1]], [[4.5, 9.5, 0], [7, 15, 1]]],
        }));
        // repaint: purple ribs, single goggle eye, gold claw emblem, black gloves
        v.recolor((x, y, z, c) => (c === W && y < 12 && y > 5 ? 0x8a5bd6 : undefined));
        v.recolor((x, y, z, c) => (c === SILVER ? 0x4a4458 : c === VISOR || c === 0x8fd8ff ? suit : undefined));
        v.recolor((x, y, z, c) => (c === W && (y >= 14 || y <= 2) ? 0x3a3446 : undefined));
        v.project(['..RRRRR..', '.RRYYYRR.', '..RRRRR..'], { R: gloss(0xd8303a), Y: glow(0xffe060) }, -4, 17);
        v.project(['G.G.G', '.GGG.'], { G: gloss(C.gold) }, -2, 10);
        v.recolor((x, y, z, c) => (c === C.yellow ? 0x8a5bd6 : undefined));
        // spiky hood fin
        for (let i = 0; i < 4; i++) v.box(0, 21 + i, -2 + i, 0, 22 + i, -1 + i, gloss(0x8a5bd6));
      },
    },
    {
      id: 'bakuhatsu', name: 'Five-Colour Explosion', jp: '変身ポーズ大爆発', rarity: 'rare',
      desc: 'The quarry explodes in five colours behind him. Insurance stopped calling years ago.',
      build(v) {
        // rocky quarry slab
        v.shape(-13, 0, -9, 13, 2, 8, (x, y, z) => y < 2 || hash(x >> 1, 0, z >> 1, 4) < 0.7, (x, y, z) => (hash(x, y, z, 2) < 0.3 ? 0x8a7a6a : hash(x, y, z, 3) < 0.3 ? 0xa8988a : 0x9a8a7a));
        rbox(v, -4, 2, -2, 4, 4, 4, 0x8a7a6a);
        v.paint(() => v.box(-4, 4, -2, 4, 4, 4, 0xb0a090));
        // the five-colour blast arcing behind
        const pts = [[-10, 7, SUIT.green], [-9.5, 16, SUIT.blue], [0, 27, SUIT.red], [9.5, 16, SUIT.yellow], [10, 7, SUIT.pink]];
        for (const [x, y, c] of pts) puff(v, x, y, -7, 3.9, c);
        // fiery cores + flying sparks
        for (const [x, y] of [[-8, 4], [8, 4], [0, 10]]) v.sphere(x, y, -4, 1.6, glow(0xffb03a));
        for (const [x, y] of [[-12, 13], [12, 13], [-5, 22], [5, 22], [-6, 12], [6, 12]]) v.set(x, y, -5, glow(0xffe080));
        // red hero striking a pose on the rock
        v.merge(hero({
          suit: SUIT.red, visor: 'red',
          arms: [[[-4.5, 9.5, 0], [-8, 12, 2]], [[4.5, 9.5, 0], [6, 7, 4]]],
        }), 0, 5, 1);
        floorClip(v);
      },
    },
    {
      id: 'robo', name: 'Gattai Robo Kapu-Oh', jp: '合体ロボ カプオー', rarity: 'ultra',
      desc: 'Five capsule machines combine into one robot. It takes eight minutes. Kaiju wait politely.',
      build(v) {
        // hex display base
        v.shape(-12, 0, -12, 12, 1, 12, (x, y, z) => Math.max(Math.abs(x) * 0.87 + Math.abs(z) * 0.5, Math.abs(z)) <= 10.5, gloss(0x262a4a));
        v.paint(() => v.shape(-12, 1, -12, 12, 1, 12, (x, y, z) => Math.max(Math.abs(x) * 0.87 + Math.abs(z) * 0.5, Math.abs(z)) > 9.5, gloss(C.gold)));
        const red = gloss(SUIT.red), blue = gloss(SUIT.blue), yel = gloss(SUIT.yellow), wht = gloss(0xf4f6fa), gry = gloss(0x8a90a0), dk = gloss(0x3a3e4e);
        // legs (blue + yellow machines)
        for (const s of [-1, 1]) {
          rbox(v, s * 2, 2, -3, s * 6, 4, 5, s < 0 ? blue : yel); // feet
          rbox(v, s * 2, 5, -2, s * 5, 10, 2, wht);
          v.paint(() => v.box(s * 2, 7, 2, s * 5, 8, 2, s < 0 ? blue : yel));
          v.box(s * 2, 11, -1, s * 4, 12, 1, gry);
        }
        // waist
        rbox(v, -5, 12, -2, 5, 14, 2, dk);
        v.box(-1, 12, 3, 1, 14, 3, gloss(C.gold));
        // chest (red machine) with the capsule core
        rbox(v, -6, 15, -3, 6, 22, 3, red);
        v.cylinder(0, 18, 3, 2.6, 2, gloss(C.yellow), 'z');
        v.paint(() => v.shape(-3, 15, 3, 3, 18, 5, (x, y) => y < 18, gloss(W)));
        v.set(0, 19, 5, glow(0xfff2a0)).set(-1, 20, 4, glow(0xfff2a0));
        v.project(['W.W.W'], { W: wht }, -2, 22);
        // shoulders
        for (const s of [-1, 1]) {
          rbox(v, s * 7, 18, -3, s * 11, 23, 3, s < 0 ? blue : yel);
          v.paint(() => v.box(s * 7, 21, -3, s * 11, 21, 3, wht));
          // arms + fists
          v.box(s * 8, 12, -1, s * 10, 17, 1, gry);
          rbox(v, s * 7, 8, -2, s * 11, 12, 2, s < 0 ? blue : yel);
          v.project(['KKK'], { K: dk }, s < 0 ? -10 : 8, 10);
        }
        // head with V crest and glowing eyes
        rbox(v, -4, 23, -3, 4, 29, 3, wht);
        v.paint(() => v.box(-4, 28, -3, 4, 29, 3, blue));
        v.box(-3, 24, 3, 3, 25, 3, gloss(SILVER));
        v.project(['EE.EE'], { E: glow(0x5cf0ff) }, -2, 27);
        v.set(-3, 26, 4, gloss(VISOR)).set(3, 26, 4, gloss(VISOR));
        for (let i = 0; i <= 4; i++) v.set(-1 - i, 29 + Math.round(i * 0.6), 3, gloss(C.gold)).set(1 + i, 29 + Math.round(i * 0.6), 3, gloss(C.gold));
        v.box(0, 28, 3, 0, 30, 4, red);
        v.box(-5, 25, -1, -5, 27, 1, red).box(5, 25, -1, 5, 27, 1, red);
      },
    },
    {
      id: 'break', name: 'Suit Actor on Break', jp: 'スーツアクターの休憩', rarity: 'secret',
      desc: 'Between takes. Canned coffee, a towel, a sigh. Please do not tell the children.',
      build(v) {
        // folding chair
        const ch = gloss(0x6a7080);
        for (const s of [-1, 1]) {
          v.line(s * 5, 0, -3, s * 5, 7, 4, ch);
          v.line(s * 5, 0, 4, s * 5, 7, -3, ch);
          v.box(s * 5, 7, -3, s * 5, 16, -3, ch);
        }
        v.box(-5, 7, -3, 5, 7, 4, gloss(0x3a5a8a));
        v.box(-5, 10, -3, 5, 15, -3, gloss(0x3a5a8a));
        // the actor in his red suit, helmet off
        v.merge(hero({
          suit: SUIT.red, human: true, sit: true,
          arms: [[[-4.5, 9.5, 0], [-5, 8, 4]], [[4.5, 9.5, 0], [3, 11, 5]]],
        }), 0, 1, -1);
        // towel round the neck
        v.paint(() => v.shape(-5, 10, -5, 5, 11, 5, () => true, 0xfff8ea));
        v.box(-3, 7, 2, -2, 10, 3, 0xfff8ea).box(2, 7, 2, 3, 10, 3, 0xfff8ea);
        v.paint(() => v.box(-3, 8, 2, 3, 8, 3, 0x6fa8e8));
        // canned coffee
        v.cylinder(3, 11, 5, 1, 3, gloss(0x8a5a3a));
        v.paint(() => v.cylinder(3, 12, 5, 1.1, 1, gloss(W)));
        // sweat drop
        v.set(5, 19, 3, glass(0x9fe3ff)).set(5, 18, 3, glass(0x9fe3ff)).set(6, 18, 3, glass(0x9fe3ff));
        // helmet resting on the floor beside him, visor to the front
        const hx = -9, hz = 6;
        v.ellipsoid(hx, 4, hz, 3.8, 3.6, 3.6, gloss(SUIT.red));
        v.box(hx - 4, -1, hz - 4, hx + 4, 0, hz + 4, null);
        v.project(['VVVVVVV', 'VHVV.VV', '.VV.VV.'], { V: gloss(VISOR), H: gloss(0x8fd8ff) }, hx - 3, 6);
        v.project(['SSS'], { S: gloss(SILVER) }, hx - 1, 2);
        v.recolor((x, y, z, c) => (c === SUIT.red && x === hx && y >= 7 ? W : undefined));
        floorClip(v);
      },
    },
  ],
};
