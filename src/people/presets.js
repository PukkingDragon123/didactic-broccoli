// The street cast: preset outfits + seeded variation (skin, hair, clothes colours, accessories, build).
// makeSpec(presetId, seed, height) -> a plain spec object that the body / paint / face builders read.
import { rng } from '../core/util.js';
import { hex, mixc } from './paintlib.js';

export const HUMAN_PRESETS = [
  { id: 'salaryman', name: 'Salaryman' }, { id: 'office_lady', name: 'Office Lady' },
  { id: 'schoolgirl', name: 'Schoolgirl' }, { id: 'schoolboy', name: 'Schoolboy' },
  { id: 'grandma', name: 'Grandma' }, { id: 'grandpa', name: 'Grandpa' }, { id: 'kid', name: 'Kid' },
  { id: 'tourist', name: 'Tourist' }, { id: 'otaku', name: 'Otaku' }, { id: 'gyaru', name: 'Gyaru' },
  { id: 'mom', name: 'Young Mom' }, { id: 'delivery', name: 'Delivery Worker' },
  { id: 'construction', name: 'Construction Worker' }, { id: 'shopkeeper', name: 'Shopkeeper' },
];
// how often each preset shows up on the street (randomHuman)
export const STREET_WEIGHTS = { salaryman: 3, office_lady: 2.5, schoolgirl: 2, schoolboy: 2, grandma: 2, grandpa: 2, kid: 1.6, tourist: 1.4, otaku: 1.2, gyaru: 1, mom: 1.6, delivery: 0.9, construction: 0.7, shopkeeper: 0 };

const SKIN = { fair: 0xf3d6c0, light: 0xecc8aa, medium: 0xe0b48e, warm: 0xd6a37a, tan: 0xc08a60, deep: 0xa06a46, pale: 0xf6dccc, brown: 0x8c5a3c, dark: 0x5e3a28 };
const HAIR = { black: 0x2a2428, soft: 0x352a26, dbrown: 0x4a3226, brown: 0x6a4228, chestnut: 0x8a5632, caramel: 0xa8743e, blonde: 0xd8b878, ash: 0xb8aa94, grey: 0x9a9690, silver: 0xc4c0ba, white: 0xe2ded6, ginger: 0xa85a2c, lavgrey: 0xb0a8b6 };
const IRIS = { brown: 0x4a2c1c, dbrown: 0x2e1c14, hazel: 0x6a5230, blue: 0x4a6c94, green: 0x55704a, grey: 0x6a7480 };

export function makeSpec(id, seed = 1, height) {
  const r = rng((seed * 2654435761) ^ hashStr(id));
  const pick = (a) => a[Math.floor(r() * a.length)];
  const ch = (p) => r() < p;
  const rr = (a, b) => a + (b - a) * r();
  const jit = (c, a = 0.08) => { const k = 1 + (r() * 2 - 1) * a; return hex(c).map((v) => Math.max(0, Math.min(255, v * k))); };
  const base = { id, name: (HUMAN_PRESETS.find((p) => p.id === id) || { name: id }).name, seed };
  const s = BUILD[id] ? BUILD[id]({ r, pick, ch, rr, jit }) : BUILD.salaryman({ r, pick, ch, rr, jit });
  const spec = { ...base, build: 1, belly: 0, acc: [], hat: null, glasses: null, socks: null, legs: 'skin', walk: { style: 'normal' }, ...s };
  if (height) spec.H = height;
  // shared derived face defaults
  const F = spec.face = { iris: hex(IRIS.dbrown), lid: ch(0.45) ? 'double' : 'mono', tilt: rr(0.4, 1.0), blush: 0.25, ...(spec.face || {}) };
  if (Array.isArray(F.iris) === false && typeof F.iris === 'number') F.iris = hex(F.iris);
  if (typeof spec.skin === 'number') spec.skin = hex(spec.skin);
  spec.skin = spec.skin.map((v) => Math.max(0, Math.min(255, v * (1 + (r() - 0.5) * 0.05))));
  const hc = typeof spec.hair.col === 'number' ? hex(spec.hair.col) : spec.hair.col;
  spec.hair.col = hc;
  spec.hair.hi = spec.hair.hi || (spec.hair.grey ? [250, 250, 248] : hc[0] < 80 ? mixc(hc, [176, 180, 214], 0.75) : mixc(hc, [255, 244, 222], 0.55));
  return spec;
}

function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }

const japaneseSkin = (pick) => pick([SKIN.fair, SKIN.light, SKIN.light, SKIN.medium, SKIN.medium, SKIN.warm]);

const BUILD = {
  salaryman: ({ pick, ch, rr, jit }) => {
    const suit = pick([0x2a3448, 0x30343a, 0x46484e, 0x1f2228, 0x3a3630, 0x283040]);
    return {
      sex: 'm', age: 'adult', H: rr(1.66, 1.8), build: rr(0.94, 1.1), belly: ch(0.35) ? rr(0.3, 1) : 0,
      skin: japaneseSkin(pick),
      hair: { style: pick(['sidepart', 'sidepart', 'short', 'buzz']), col: pick([HAIR.black, HAIR.black, HAIR.soft, HAIR.dbrown]), part: ch(0.5) ? 1 : -1 },
      face: { stubble: rr(0.15, 0.55), browW: rr(0.9, 1.2) },
      glasses: ch(0.35) ? { kind: pick(['rect', 'rect', 'round']), col: pick([[30, 26, 26], [120, 120, 126], [150, 120, 70]]), thick: 1 } : null,
      top: { kind: 'suit', col: jit(suit, 0.05), shirt: jit(pick([0xf4f4f0, 0xf4f4f0, 0xdce8f4, 0xf2e4e4]), 0.02), tie: jit(pick([0x8a2a2a, 0x2a3a6a, 0x3a5a3a, 0x6a2a4a, 0x8a6a2a, 0x2a2a2e]), 0.1), tieKind: pick(['stripe', 'solid', 'dots']) },
      bottom: { kind: 'slacks', col: jit(suit, 0.05), belt: [26, 22, 20] },
      shoes: { kind: 'oxford', col: jit(pick([0x1e1a18, 0x1e1a18, 0x4a2c1c]), 0.05) }, socks: { col: [30, 30, 36] },
      acc: [ch(0.7) ? { kind: 'briefcase', col: jit(pick([0x1e1c1c, 0x3a2418, 0x2a2a2e])) } : { kind: 'shoulderbag', col: jit(0x2a2622), side: 1 }],
      walk: { style: 'brisk' },
    };
  },
  office_lady: ({ pick, ch, rr, jit }) => {
    const jacket = pick([0x1e1e24, 0x2a3048, 0xc8b496, 0x5a5a60, 0xe8e0d4]);
    const blazer = ch(0.6);
    return {
      sex: 'f', age: 'adult', H: rr(1.54, 1.66), build: rr(0.92, 1.02), bust: rr(0.7, 1.1),
      skin: japaneseSkin(pick),
      hair: { style: pick(['bun', 'long', 'bob', 'ponytail', 'long']), col: pick([HAIR.black, HAIR.soft, HAIR.dbrown, HAIR.brown]), part: ch(0.5) ? 1 : -1 },
      face: { makeup: { liner: 0.3, lash: 0.6, shadow: pick([[180, 130, 120], [160, 120, 110], null]), blush: [230, 130, 130] }, lipstick: jit(pick([0xc0505a, 0xb86060, 0xd07070, 0xa84850])), blush: 0.35 },
      top: blazer ? { kind: 'blazer', col: jit(jacket, 0.05), shirt: jit(pick([0xf6f4ee, 0xf0e8e0, 0xe8eef6]), 0.02) } : { kind: 'blouse', col: jit(pick([0xf6f2ea, 0xe8d8e0, 0xd8e4ee, 0xf0e4d0]), 0.03), sleeve: pick(['long', 'short']) },
      bottom: { kind: 'skirt', cut: 'pencil', col: blazer ? jit(jacket, 0.05) : jit(pick([0x2a2a30, 0x3a3a44, 0x6a5a4a, 0x1e2230])) },
      legs: 'tights', tights: jit(pick([0xc8a088, 0xb8907a, 0x3a3236]), 0.04),
      shoes: { kind: 'pumps', col: jit(pick([0x1e1a1a, 0x1e1a1a, 0xc8a888, 0x6a2a2a])) },
      acc: [{ kind: ch(0.6) ? 'tote' : 'shoulderbag', col: jit(pick([0x6a4a30, 0x1e1a1a, 0xc8a888, 0x8a2a2a])), side: 1 }],
      walk: { style: 'dainty' },
    };
  },
  schoolgirl: ({ pick, ch, rr, jit }) => {
    const winter = ch(0.5);
    const navy = jit(pick([0x1e2438, 0x22283e, 0x1a1e2c]), 0.03);
    return {
      sex: 'f', age: 'teen', H: rr(1.5, 1.62), build: rr(0.92, 1.0), bust: rr(0.4, 0.7),
      skin: japaneseSkin(pick),
      hair: { style: pick(['long', 'ponytail', 'twintails', 'bob', 'long', 'ponytail']), col: pick([HAIR.black, HAIR.black, HAIR.soft, HAIR.dbrown]), part: ch(0.5) ? 1 : -1 },
      face: { blush: 0.45, eyeH: 1.08, lipFull: 0.9 },
      top: { kind: 'sailor', col: winter ? navy : [244, 244, 240], collar: navy, stripe: [240, 240, 236], scarf: jit(pick([0xb02a30, 0xb02a30, 0x2a3a6a, 0x2a5a4a]), 0.06), sleeve: winter ? 'long' : 'short' },
      bottom: { kind: 'skirt', cut: 'pleated', col: pick([navy, navy, jit(0x3a3a50)]), plaid: ch(0.3) ? [120, 40, 50] : null },
      legs: ch(0.25) ? 'loosesocks' : 'kneesocks', socks: { col: ch(0.25) ? [246, 246, 244] : navy },
      shoes: { kind: 'loafer', col: jit(pick([0x3a2418, 0x1e1a18])) },
      acc: [ch(0.6) ? { kind: 'shoulderbag', col: navy, side: -1, school: true } : { kind: 'backpack', col: jit(pick([0x1e1e24, 0x2a3048, 0x6a3a3a])) }],
      walk: { style: 'young' },
    };
  },
  schoolboy: ({ pick, ch, rr, jit }) => {
    const gaku = jit(pick([0x16161a, 0x16161a, 0x1a1e2c]), 0.03);
    return {
      sex: 'm', age: 'teen', H: rr(1.62, 1.76), build: rr(0.9, 1.02),
      skin: japaneseSkin(pick),
      hair: { style: pick(['short', 'short', 'buzz', 'sidepart', 'messy']), col: pick([HAIR.black, HAIR.black, HAIR.soft]), part: ch(0.5) ? 1 : -1 },
      face: { browW: rr(1, 1.25) },
      top: ch(0.75) ? { kind: 'gakuran', col: gaku } : { kind: 'shirt', col: [244, 244, 240], sleeve: 'short', tuck: true },
      bottom: { kind: 'slacks', col: gaku, belt: [24, 22, 20], noCrease: true },
      shoes: { kind: 'sneaker', col: jit(pick([0xf0f0ec, 0x1e1e22, 0xf0f0ec])), col2: jit(pick([0x2a3a6a, 0x1e1e22, 0xb02a30])) }, socks: { col: [240, 240, 240] },
      acc: [ch(0.5) ? { kind: 'backpack', col: jit(pick([0x1e1e24, 0x2a3048, 0x3a3a3a])) } : { kind: 'shoulderbag', col: jit(0x1e1e24), side: 1, school: true }],
      walk: { style: 'young' },
    };
  },
  grandma: ({ pick, ch, rr, jit }) => ({
    sex: 'f', age: 'elder', H: rr(1.44, 1.56), build: rr(0.96, 1.08), bust: 0.8,
    skin: pick([SKIN.fair, SKIN.light, SKIN.medium]),
    hair: { style: pick(['perm', 'perm', 'bun']), col: pick([HAIR.grey, HAIR.silver, HAIR.white, HAIR.lavgrey, HAIR.dbrown]), grey: 1 },
    face: { wrinkles: 1, spots: 1, lipFull: 0.75, blush: 0.2 },
    glasses: ch(0.45) ? { kind: pick(['round', 'rect']), col: pick([[160, 130, 90], [120, 110, 110], [60, 40, 40]]), thick: 1 } : null,
    hat: ch(0.25) ? { kind: 'sunhat', col: jit(pick([0xd8c49a, 0xe8e0d0, 0x8a7a6a])), col2: jit(pick([0x6a3a3a, 0x3a4a6a])) } : null,
    top: { kind: 'cardigan', col: jit(pick([0xb89a8a, 0x8a7a9a, 0x9aa088, 0x8a3a3a, 0xc8b89a, 0x6a6a74])), shirt: jit(pick([0xf0ece4, 0xe8dce4, 0xdce4e8])), pattern: ch(0.5) ? 'floral' : null },
    bottom: ch(0.6) ? { kind: 'skirt', cut: 'long', col: jit(pick([0x4a4040, 0x3a3a48, 0x5a4a3a, 0x6a6a6a])) } : { kind: 'slacks', col: jit(pick([0x5a5048, 0x3a3a44, 0x7a6a5a])), noCrease: true },
    legs: 'socks', socks: { col: jit(pick([0xb8a898, 0x8a8a8a])) },
    shoes: { kind: 'comfort', col: jit(pick([0x8a7a6a, 0x5a5050, 0xb8a890])) },
    acc: [ch(0.6) ? { kind: 'ecobag', col: jit(pick([0xd8c8a8, 0x8a9a7a, 0x6a7a9a])), leek: ch(0.6) } : { kind: 'handbag', col: jit(pick([0x5a3a2a, 0x2a2622, 0x6a2a3a])) }],
    walk: { style: 'elder', hunch: rr(0.5, 1) },
  }),
  grandpa: ({ pick, ch, rr, jit }) => ({
    sex: 'm', age: 'elder', H: rr(1.54, 1.68), build: rr(0.92, 1.05), belly: ch(0.4) ? rr(0.2, 0.7) : 0,
    skin: pick([SKIN.light, SKIN.medium, SKIN.warm]),
    hair: { style: pick(['bald', 'bald', 'short', 'buzz']), col: pick([HAIR.grey, HAIR.silver, HAIR.white]), grey: 1 },
    face: { wrinkles: 1, spots: 1, mustache: ch(0.25), stubble: rr(0, 0.3), browW: 1.2, lipFull: 0.75 },
    glasses: ch(0.5) ? { kind: pick(['rect', 'round']), col: pick([[150, 120, 70], [40, 34, 30], [140, 140, 146]]), thick: 1 } : null,
    hat: ch(0.6) ? { kind: 'flatcap', col: jit(pick([0x6a5a48, 0x4a4a4e, 0x7a6a4a, 0x3a3430])) } : null,
    top: ch(0.5) ? { kind: 'polo', col: jit(pick([0xc8c0a8, 0x8a9aa8, 0xe8e4dc, 0x6a7a6a])), vest: ch(0.5) ? jit(pick([0x5a4a3a, 0x3a3a48, 0x6a6a5a])) : null, sleeve: 'long' } : { kind: 'jacket', col: jit(pick([0xc8b890, 0x8a8a7a, 0x5a5a64])), shirt: jit(pick([0xe8e4dc, 0xc8d0d8])) },
    bottom: { kind: 'slacks', col: jit(pick([0x5a5a5a, 0x7a6a58, 0x4a4a54, 0x8a8070])), belt: [50, 36, 26] },
    shoes: ch(0.4) ? { kind: 'sandal', col: jit(0x4a3a2a) } : { kind: 'comfort', col: jit(pick([0x3a2a20, 0x5a5048])) }, socks: { col: ch(0.5) ? [236, 236, 232] : [90, 90, 96] },
    acc: ch(0.4) ? [{ kind: 'cane', col: jit(0x5a3a22) }] : [],
    walk: { style: 'elder', hunch: rr(0.4, 0.9) },
  }),
  kid: ({ pick, ch, rr, jit }) => {
    const girl = ch(0.45);
    return {
      sex: girl ? 'f' : 'm', age: 'kid', H: rr(1.12, 1.3), build: rr(0.95, 1.08),
      skin: japaneseSkin(pick),
      hair: { style: girl ? pick(['pigtails', 'bob', 'ponytail']) : pick(['bowl', 'short', 'buzz']), col: pick([HAIR.black, HAIR.soft, HAIR.dbrown]) },
      face: { blush: 0.6 },
      hat: ch(0.5) ? { kind: 'schoolhat', col: [246, 206, 40] } : ch(0.3) ? { kind: 'cap', col: jit(pick([0xb02a30, 0x2a4a8a, 0x2a6a3a, 0x1e1e22])), col2: [240, 240, 236] } : null,
      top: { kind: 'tee', col: jit(pick([0xe85a4a, 0x4a8ad8, 0xf0c040, 0x5ab06a, 0xf0f0ec, 0xe890b0, 0x8a6ad0])), print: pick(['stripes', 'star', 'circle', 'border']), col2: jit(pick([0xf0f0ec, 0x1e2a4a, 0xf0c040])) },
      bottom: girl && ch(0.6) ? { kind: 'skirt', cut: 'mini', col: jit(pick([0x2a3a6a, 0xd85a6a, 0x5a4a3a])) } : { kind: 'shorts', col: jit(pick([0x2a3a6a, 0x8a7a5a, 0x4a6a9a, 0x3a3a3a])) },
      legs: 'socks', socks: { col: [246, 246, 244] },
      shoes: { kind: 'sneaker', col: jit(pick([0xf0f0ec, 0x4a8ad8, 0xe85a4a, 0xf0c040])), col2: jit(pick([0x1e2a4a, 0xf0f0ec, 0xe85a4a])) },
      acc: ch(0.8) ? [{ kind: 'randoseru', col: jit(girl ? pick([0xc02a3a, 0xd86a8a, 0x8a3a6a, 0x6a3a2a]) : pick([0x1e1a1a, 0x3a2418, 0x2a3a6a])) }] : [],
      walk: { style: 'kid' },
    };
  },
  tourist: ({ pick, ch, rr, jit }) => {
    const f = ch(0.45);
    const fair = ch(0.7);
    return {
      sex: f ? 'f' : 'm', age: 'adult', H: f ? rr(1.6, 1.75) : rr(1.72, 1.9), build: rr(0.95, 1.12), belly: !f && ch(0.3) ? rr(0.3, 0.9) : 0, bust: 1,
      skin: fair ? pick([SKIN.pale, SKIN.pale, SKIN.fair, SKIN.light]) : pick([SKIN.tan, SKIN.brown, SKIN.dark, SKIN.deep]),
      hair: { style: f ? pick(['ponytail', 'long', 'bob']) : pick(['short', 'messy', 'sidepart']), col: fair ? pick([HAIR.blonde, HAIR.chestnut, HAIR.brown, HAIR.ginger, HAIR.ash]) : pick([HAIR.black, HAIR.dbrown]), part: 1 },
      face: { iris: fair ? pick([IRIS.blue, IRIS.green, IRIS.grey, IRIS.hazel, IRIS.brown]) : IRIS.dbrown, lid: 'double', tilt: 0, eyeH: 1.15, freckles: fair && ch(0.4) ? 0.8 : 0, stubble: f ? 0 : rr(0, 0.5), blush: fair ? 0.45 : 0.15, browW: f ? 1 : 1.2 },
      glasses: ch(0.3) ? { kind: 'sun', col: [24, 22, 24], thick: 1.2 } : null,
      hat: ch(0.6) ? (ch(0.5) ? { kind: 'bucket', col: jit(pick([0xd8c8a0, 0x6a7a5a, 0xe8e4dc])) } : { kind: 'cap', col: jit(pick([0xe8e4dc, 0x2a4a8a, 0xb02a30])), col2: [30, 30, 34] }) : null,
      top: ch(0.5) ? { kind: 'aloha', col: jit(pick([0x2a8ab0, 0xe86a4a, 0x2a6a4a, 0xf0d8a0, 0x4a3a8a])), col2: jit(pick([0xf0f0e8, 0xf0c040, 0xe85a7a])) } : { kind: 'tee', col: jit(pick([0xf0f0ec, 0x8ab0d8, 0xe8c8a0, 0x3a3a3e, 0x6a8a5a])), print: pick(['circle', 'border', 'none']), col2: jit(pick([0xb02a30, 0x2a4a8a, 0xf0c040])) },
      bottom: { kind: ch(0.6) ? 'shorts' : 'cargo', col: jit(pick([0xc8b48a, 0x8a8a6a, 0x6a6a5a, 0x3a4a6a])) },
      legs: 'socks', socks: { col: [244, 244, 242] },
      shoes: ch(0.6) ? { kind: 'sneaker', col: jit(pick([0xf0f0ec, 0x8a8a8a, 0x3a3a3e])), col2: jit(pick([0xe85a4a, 0x2a4a8a, 0x8a8a8a])) } : { kind: 'sandal', col: jit(0x3a3028) },
      acc: [{ kind: 'camera', col: [26, 26, 28] }, ...(ch(0.5) ? [{ kind: 'backpack', col: jit(pick([0x3a5a8a, 0x6a6a5a, 0xb05a3a, 0x2a2a2e])) }] : [])],
      walk: { style: 'normal', look: 1 },
    };
  },
  otaku: ({ pick, ch, rr, jit }) => ({
    sex: 'm', age: 'adult', H: rr(1.64, 1.76), build: rr(0.92, 1.12), belly: ch(0.5) ? rr(0.4, 1.1) : 0,
    skin: pick([SKIN.fair, SKIN.light, SKIN.fair]),
    hair: { style: pick(['mushroom', 'messy', 'mushroom']), col: pick([HAIR.black, HAIR.soft]) },
    face: { stubble: rr(0, 0.35), browW: rr(0.9, 1.15) },
    glasses: { kind: pick(['rect', 'rect', 'round']), col: pick([[24, 22, 24], [150, 150, 156], [60, 30, 30]]), thick: pick([1, 1.4]) },
    top: { kind: 'flannel', col: jit(pick([0x8a2a2a, 0x2a4a7a, 0x2a5a3a, 0x5a3a6a])), col2: jit(pick([0x1e1e22, 0xe8e4dc, 0x1e2a1e])), tuck: ch(0.6) },
    bottom: { kind: 'jeans', col: jit(pick([0x3a4a6a, 0x2a3450, 0x4a5a7a]), 0.04), belt: [40, 30, 24] },
    shoes: { kind: 'sneaker', col: jit(pick([0xe8e4dc, 0x6a6a6a, 0x2a2a2e])), col2: jit(pick([0x2a2a2e, 0xb02a30])) }, socks: { col: [220, 220, 220] },
    acc: [{ kind: 'backpack', col: jit(pick([0x1e1e22, 0x3a3a40, 0x2a3a2a])), poster: ch(0.6) }],
    walk: { style: 'slouch' },
  }),
  gyaru: ({ pick, rr, jit }) => ({
    sex: 'f', age: 'adult', H: rr(1.54, 1.66), build: rr(0.9, 1.0), bust: rr(0.8, 1.2),
    skin: pick([SKIN.tan, SKIN.warm, SKIN.deep, SKIN.tan]),
    hair: { style: pick(['long', 'long', 'twintails', 'ponytail']), col: pick([HAIR.blonde, HAIR.caramel, HAIR.ash, HAIR.blonde]), volume: 1.3, part: 1 },
    face: { makeup: { liner: 0.8, lash: 1, lower: true, shadow: pick([[190, 140, 110], [220, 160, 170]]), highlight: 0.5, blush: [240, 140, 150] }, lipstick: jit(pick([0xe8b0a0, 0xf0a8b0, 0xd89088])), eyeH: 1.15, blush: 0.3, browW: 0.8, browCol: [90, 64, 44] },
    top: { kind: 'tee', col: jit(pick([0xf0a0c0, 0xf0f0ec, 0x1e1e22, 0xf0e0a0])), fitted: true, print: pick(['heart', 'none', 'circle']), col2: jit(pick([0xe8508a, 0xf0c040, 0x1e1e22])), sleeve: 'short' },
    bottom: { kind: 'skirt', cut: 'mini', col: jit(pick([0x4a6a9a, 0x1e1e22, 0xe8e4dc, 0x8a3a4a])) },
    legs: 'loosesocks', socks: { col: [248, 248, 246] },
    shoes: { kind: 'platform', col: jit(pick([0xf0f0ec, 0x1e1e22, 0xf0a0c0])) },
    acc: [{ kind: 'shoulderbag', col: jit(pick([0xf0a0c0, 0xf0f0ec, 0x1e1e22])), side: 1 }],
    walk: { style: 'dainty' },
  }),
  mom: ({ pick, ch, rr, jit }) => ({
    sex: 'f', age: 'adult', H: rr(1.54, 1.66), build: rr(0.94, 1.06), bust: rr(0.8, 1.1),
    skin: japaneseSkin(pick),
    hair: { style: pick(['ponytail', 'bob', 'bun', 'long']), col: pick([HAIR.dbrown, HAIR.brown, HAIR.black, HAIR.chestnut]), part: ch(0.5) ? 1 : -1 },
    face: { makeup: { liner: 0.15, lash: 0.4, blush: [230, 140, 130] }, lipstick: jit(pick([0xc87a7a, 0xd08a80])), blush: 0.35 },
    top: ch(0.5) ? { kind: 'knit', col: jit(pick([0xe8d8c0, 0xc8a0a0, 0xa0b0c8, 0xd8d0b0, 0x9a8a7a])), sleeve: 'long' } : { kind: 'blouse', col: jit(pick([0xf0ece0, 0xe0e8d8, 0xe8d8e0])), sleeve: 'short', cardigan: ch(0.5) ? jit(pick([0xa08a70, 0x6a7a8a, 0xd8c8b0])) : null },
    bottom: ch(0.6) ? { kind: 'skirt', cut: 'long', col: jit(pick([0x6a6a5a, 0x3a3a48, 0xb8a888, 0x5a4a5a])) } : { kind: 'slacks', col: jit(pick([0xd8d0c0, 0x3a3a44, 0x6a7a8a])), wide: true, noCrease: true },
    legs: 'socks', socks: { col: jit(pick([0xe8e4dc, 0x8a8a8a])) },
    shoes: { kind: ch(0.5) ? 'sneaker' : 'comfort', col: jit(pick([0xf0f0ec, 0xd8c8b0, 0x5a4a3a])), col2: jit(pick([0xd8c8b0, 0x8a8a8a])) },
    acc: [ch(0.5) ? { kind: 'ecobag', col: jit(pick([0xd8c8a8, 0x8a9a7a, 0xe8e4dc])), leek: ch(0.7) } : { kind: 'tote', col: jit(pick([0xd8c8a8, 0x2a3048, 0x8a6a4a])), side: 1 }],
    walk: { style: 'normal' },
  }),
  delivery: ({ pick, rr, jit }) => {
    const c = pick([[0x2a6a3a, 0xe8e4dc], [0x2a3a6a, 0xf0c040], [0xb02a30, 0xf0f0ec], [0x3a3a40, 0xf08a30]]);
    return {
      sex: 'm', age: 'adult', H: rr(1.66, 1.8), build: rr(0.96, 1.1),
      skin: pick([SKIN.medium, SKIN.warm, SKIN.light]),
      hair: { style: pick(['short', 'buzz']), col: pick([HAIR.black, HAIR.dbrown, HAIR.brown]) },
      face: { stubble: rr(0.1, 0.4), browW: 1.15 },
      hat: { kind: 'cap', col: jit(c[0], 0.03), col2: hex(c[1]) },
      top: { kind: 'polo', col: jit(c[0], 0.03), band: hex(c[1]), sleeve: 'short', uniform: true },
      bottom: { kind: 'cargo', col: jit(pick([0x2a2e36, 0x3a3a34, 0x2a3424])) },
      shoes: { kind: 'boots', col: jit(0x1e1c1c) }, socks: { col: [40, 40, 44] },
      acc: [{ kind: 'pouch', col: jit(0x2a2622) }],
      walk: { style: 'brisk' },
    };
  },
  construction: ({ pick, ch, rr, jit }) => ({
    sex: 'm', age: 'adult', H: rr(1.64, 1.8), build: rr(1.0, 1.15), belly: ch(0.3) ? rr(0.2, 0.6) : 0,
    skin: pick([SKIN.warm, SKIN.tan, SKIN.tan, SKIN.medium]),
    hair: { style: pick(['short', 'buzz']), col: pick([HAIR.black, HAIR.dbrown, HAIR.brown]) },
    face: { stubble: rr(0.3, 0.8), browW: 1.25 },
    hat: { kind: 'hardhat', col: jit(pick([0xf0f0ec, 0xf0c838, 0xf0f0ec, 0x3a6ab0]), 0.03) },
    top: { kind: 'workjacket', col: jit(pick([0x8a8060, 0x3a4458, 0x6a6a68, 0x4a5a3a])), sleeve: 'long' },
    bottom: { kind: 'tobi', col: jit(pick([0x2a3048, 0x8a8060, 0x4a4a4e, 0x1e1e22, 0x6a5a7a])) },
    shoes: { kind: 'tabi', col: jit(pick([0x1e2230, 0x1e1e1e, 0x3a3a40])) },
    acc: [{ kind: 'towel', col: [240, 240, 236] }],
    walk: { style: 'heavy' },
  }),
  shopkeeper: ({ pick, ch, rr, jit }) => {
    const f = ch(0.6);
    return {
      sex: f ? 'f' : 'm', age: 'elder', H: f ? rr(1.46, 1.56) : rr(1.56, 1.66), build: rr(0.96, 1.06), bust: 0.8,
      skin: pick([SKIN.light, SKIN.medium, SKIN.warm]),
      hair: f ? { style: pick(['bun', 'perm']), col: pick([HAIR.grey, HAIR.silver, HAIR.dbrown]), grey: 1 } : { style: pick(['bald', 'short']), col: pick([HAIR.grey, HAIR.silver]), grey: 1 },
      face: { wrinkles: 1, spots: 1, lipFull: 0.8, blush: 0.3, mustache: !f && ch(0.3) },
      glasses: ch(0.5) ? { kind: 'round', col: pick([[150, 120, 70], [60, 40, 30]]), thick: 1 } : null,
      hat: !f && ch(0.4) ? { kind: 'headband', col: [240, 240, 236] } : null,
      top: f ? { kind: 'cardigan', col: jit(pick([0x8a7a6a, 0x6a5a6a, 0x7a8a7a])), shirt: jit(0xf0ece4) } : { kind: 'polo', col: jit(pick([0xe8e4dc, 0xc8c0a8])), sleeve: 'long' },
      bottom: { kind: 'slacks', col: jit(pick([0x3a3a40, 0x4a4038])), noCrease: true },
      shoes: { kind: 'sandal', col: jit(0x3a2c22) }, socks: { col: [236, 236, 232] },
      acc: [{ kind: 'apron', col: jit(pick([0x2a3450, 0x5a3a2a, 0x6a2a2a, 0x3a4a3a])), col2: [236, 232, 220] }],
      walk: { style: 'elder', hunch: rr(0.3, 0.7) },
    };
  },
};

/** Pick a street preset id from a seed (weighted). */
export function streetPreset(seed) {
  const r = rng((seed * 40503) ^ 0x9e3779b9);
  const ids = Object.keys(STREET_WEIGHTS).filter((k) => STREET_WEIGHTS[k] > 0);
  let tot = ids.reduce((a, k) => a + STREET_WEIGHTS[k], 0), x = r() * tot;
  for (const k of ids) { if (x < STREET_WEIGHTS[k]) return k; x -= STREET_WEIGHTS[k]; }
  return ids[0];
}
