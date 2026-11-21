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
  // the lane's three regulars (src/npc): never picked for the street (no STREET_WEIGHTS entry)
  { id: 'rohan', name: 'Kishibe Rohan' }, { id: 'josuke', name: 'Josuke' }, { id: 'okuyasu', name: 'Okuyasu' },
  // more named locals (src/npc/roster.js): never picked for the street either
  { id: 'hatoda', name: 'Mr. Hatoda' }, { id: 'gonta', name: 'Gonta' }, { id: 'kuromaru', name: 'Lord Kuromaru' },
  { id: 'gomuzo', name: 'Captain Gomuzo' }, { id: 'yabuki', name: 'Mr. Yabuki' }, { id: 'kusaka', name: 'Dr. Kusaka' },
  // job applicants from the Inspired site (src/staff): never picked for the street either
  { id: 'kappa', name: 'Kappa' }, { id: 'tanuki', name: 'Tanuki' }, { id: 'yurei', name: 'Yurei' }, { id: 'ninja', name: 'Not a Ninja' },
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

// The street cast dresses like the back lanes of the late 1960s-70s (Shōwa 40s; period street photos as reference):
// pomaded 7:3 partings, felt trilbies, horn-rims and pencil ties on the salarymen; set perms, headscarves, shirtwaist
// dresses, aprons and kappōgi on the women; gakuran with peaked caps, sailor suits below the knee, school satchels;
// grandpas in open-collar shirts with braces, or a vest and haramaki, flat caps and geta.
const BUILD = {
  salaryman: ({ pick, ch, rr, jit }) => {
    const suit = pick([0x2a3042, 0x34363a, 0x4a4a4c, 0x3e3a32, 0x2c3438, 0x4a4236]);
    return {
      sex: 'm', age: 'adult', H: rr(1.62, 1.74), build: rr(0.92, 1.06), belly: ch(0.3) ? rr(0.3, 0.9) : 0,
      skin: japaneseSkin(pick),
      hair: { style: pick(['sidepart', 'sidepart', 'sidepart', 'short']), col: pick([HAIR.black, HAIR.black, HAIR.soft]), part: ch(0.7) ? 1 : -1 },
      face: { stubble: rr(0.05, 0.35), browW: rr(1.0, 1.25) },
      glasses: ch(0.45) ? { kind: pick(['horn', 'horn', 'rect']), col: pick([[28, 24, 24], [28, 24, 24], [70, 44, 30]]), thick: 1.2 } : null,
      hat: ch(0.35) ? { kind: 'fedora', col: jit(pick([0x5a564e, 0x3e3c3a, 0x6a5a46, 0x4a4e52]), 0.05), col2: [30, 28, 28] } : null,
      top: { kind: 'suit', col: jit(suit, 0.05), shirt: jit(pick([0xf2f0e8, 0xf2f0e8, 0xf2f0e8, 0xe4e8ec]), 0.02), tie: jit(pick([0x6a2226, 0x2a3450, 0x2a2a2e, 0x3a4632, 0x5a3a2a]), 0.08), tieKind: pick(['solid', 'solid', 'stripe']), thinTie: true },
      bottom: { kind: 'slacks', col: jit(suit, 0.05), belt: [26, 22, 20] },
      shoes: { kind: 'oxford', col: jit(pick([0x1e1a18, 0x1e1a18, 0x3a2418]), 0.05) }, socks: { col: [30, 30, 36] },
      acc: [{ kind: 'briefcase', col: jit(pick([0x3a2418, 0x4a2c1a, 0x1e1c1c])) }],
      walk: { style: 'brisk' },
    };
  },
  office_lady: ({ pick, ch, rr, jit }) => {
    const uni = ch(0.4), c = pick([0x2a3048, 0x5a4a3e, 0x6a6a70, 0x3a4a5a, 0x7a3a3a]);
    return {
      sex: 'f', age: 'adult', H: rr(1.5, 1.6), build: rr(0.92, 1.02), bust: rr(0.7, 1.0),
      skin: japaneseSkin(pick),
      hair: { style: pick(['bob', 'bob', 'perm', 'bun', 'ponytail']), col: pick([HAIR.black, HAIR.black, HAIR.soft, HAIR.dbrown]), part: ch(0.5) ? 1 : -1 },
      face: { makeup: { liner: 0.35, lash: 0.5, shadow: pick([[150, 140, 160], [170, 130, 120], null]), blush: [230, 140, 130] }, lipstick: jit(pick([0xb84a50, 0xc05860, 0xa84448])), blush: 0.3 },
      glasses: ch(0.15) ? { kind: 'horn', col: [60, 36, 30], thick: 1 } : null,
      top: uni ? { kind: 'blazer', col: jit(c, 0.05), shirt: jit(pick([0xf4f2ea, 0xf0e8dc]), 0.02) } : { kind: 'blouse', col: jit(pick([0xf4f0e6, 0xe8dcc8, 0xd8e2e8, 0xf0dcd8, 0xe8e0b8]), 0.03), sleeve: pick(['short', 'long']), cardigan: ch(0.35) ? jit(pick([0xb8a888, 0x8a9aa8, 0xc8a0a0])) : null },
      bottom: { kind: 'skirt', cut: uni ? 'pencil' : 'aline', col: uni ? jit(c, 0.05) : jit(pick([0x3a3a48, 0x5a4a3a, 0x7a6a50, 0x6a3a3a, 0x3a4a3a])) },
      legs: 'tights', tights: jit(pick([0xd0a890, 0xc49a82]), 0.04),
      shoes: { kind: 'pumps', col: jit(pick([0x1e1a1a, 0x3a2418, 0x6a2a2a, 0xc8b49a])) },
      acc: [{ kind: 'handbag', col: jit(pick([0x3a2418, 0x1e1a1a, 0x6a2a2a, 0xc8b49a])) }],
      walk: { style: 'dainty' },
    };
  },
  schoolgirl: ({ pick, ch, rr, jit }) => {
    const winter = ch(0.55);
    const navy = jit(pick([0x1e2438, 0x22283e, 0x1a1e2c]), 0.03);
    return {
      sex: 'f', age: 'teen', H: rr(1.48, 1.58), build: rr(0.92, 1.0), bust: rr(0.4, 0.6),
      skin: japaneseSkin(pick),
      hair: { style: pick(['bob', 'bob', 'pigtails', 'long', 'ponytail', 'twintails']), col: pick([HAIR.black, HAIR.black, HAIR.soft]), part: ch(0.5) ? 1 : -1 },
      face: { blush: 0.45, eyeH: 1.05, lipFull: 0.85 },
      top: { kind: 'sailor', col: winter ? navy : [244, 244, 240], collar: navy, stripe: [240, 240, 236], scarf: jit(pick([0xa02a30, 0x1e2232, 0x2a3a6a, 0xf0f0ec]), 0.06), sleeve: winter ? 'long' : 'short' },
      bottom: { kind: 'skirt', cut: 'kneepleat', col: navy },
      legs: ch(0.5) ? 'kneesocks' : 'socks', socks: { col: ch(0.6) ? [246, 246, 244] : navy },
      shoes: { kind: 'loafer', col: jit(pick([0x2a1a14, 0x1e1a18])) },
      acc: [ch(0.6) ? { kind: 'briefcase', col: jit(pick([0x2a1a14, 0x3a2418])) } : { kind: 'shoulderbag', col: jit(0x8a7a5a), side: -1, school: true }],
      walk: { style: 'young' },
    };
  },
  schoolboy: ({ pick, ch, rr, jit }) => {
    const gaku = jit(pick([0x16161a, 0x16161a, 0x1a1e2c]), 0.03), summer = ch(0.2);
    return {
      sex: 'm', age: 'teen', H: rr(1.58, 1.72), build: rr(0.9, 1.02),
      skin: japaneseSkin(pick),
      hair: { style: pick(['buzz', 'buzz', 'short', 'sidepart']), col: pick([HAIR.black, HAIR.black, HAIR.soft]), part: ch(0.5) ? 1 : -1 },
      face: { browW: rr(1, 1.25) },
      hat: ch(0.7) ? { kind: 'gakubo', col: [24, 24, 28] } : null,
      top: summer ? { kind: 'shirt', col: [244, 244, 240], sleeve: 'short', tuck: true } : { kind: 'gakuran', col: gaku },
      bottom: { kind: 'slacks', col: gaku, belt: [24, 22, 20], noCrease: true },
      shoes: ch(0.6) ? { kind: 'loafer', col: jit(0x1e1a18) } : { kind: 'sneaker', col: [236, 234, 226], col2: [236, 234, 226] }, socks: { col: ch(0.5) ? [30, 30, 36] : [240, 240, 240] },
      acc: [ch(0.6) ? { kind: 'briefcase', col: jit(pick([0x2a1a14, 0x1e1a18])) } : { kind: 'shoulderbag', col: jit(0x8a7a5a), side: 1, school: true }],
      walk: { style: 'young' },
    };
  },
  grandma: ({ pick, ch, rr, jit }) => {
    const kappogi = ch(0.4);
    return {
      sex: 'f', age: 'elder', H: rr(1.4, 1.52), build: rr(0.96, 1.08), bust: 0.8,
      skin: pick([SKIN.fair, SKIN.light, SKIN.medium]),
      hair: { style: pick(['perm', 'perm', 'bun', 'bun']), col: pick([HAIR.grey, HAIR.silver, HAIR.white, HAIR.lavgrey, HAIR.dbrown]), grey: 1 },
      face: { wrinkles: 1, spots: 1, lipFull: 0.75, blush: 0.2 },
      glasses: ch(0.4) ? { kind: pick(['round', 'horn']), col: pick([[160, 130, 90], [120, 110, 110], [60, 40, 40]]), thick: 1 } : null,
      hat: ch(0.25) ? { kind: 'scarf', col: jit(pick([0x6a5a7a, 0x8a4a3a, 0x4a5a6a, 0xd8ccb0])), col2: [236, 230, 216] } : null,
      top: kappogi ? { kind: 'blouse', col: [242, 240, 232], sleeve: 'long' } : { kind: 'cardigan', col: jit(pick([0x8a7a6a, 0x6a5a6a, 0x7a8a7a, 0x8a3a3a, 0xa8987a, 0x5a5a64])), shirt: jit(pick([0xf0ece4, 0xe8dce4, 0xdce4e8])) },
      bottom: ch(0.55) ? { kind: 'skirt', cut: 'long', col: jit(pick([0x4a4040, 0x3a3a48, 0x5a4a3a, 0x4a4a42])) } : { kind: 'slacks', col: jit(pick([0x2a3048, 0x3a3a44, 0x4a3e36])), wide: true, noCrease: true }, // or monpe
      legs: 'socks', socks: { col: jit(pick([0xf0eee8, 0xb8a898])) },
      shoes: ch(0.6) ? { kind: 'sandal', col: jit(pick([0x8a5a32, 0xc8a878])) } : { kind: 'comfort', col: jit(pick([0x3a2a20, 0x5a5050])) },
      acc: [...(kappogi ? [{ kind: 'apron', col: [242, 240, 232], col2: [236, 232, 220] }] : []), ch(0.6) ? { kind: 'ecobag', col: jit(pick([0xc8b48a, 0x8a7a5a, 0x6a7a9a])), leek: ch(0.6) } : { kind: 'handbag', col: jit(pick([0x5a3a2a, 0x2a2622, 0x6a2a3a])) }],
      walk: { style: 'elder', hunch: rr(0.5, 1) },
    };
  },
  grandpa: ({ pick, ch, rr, jit }) => {
    const look = pick(['shirt', 'shirt', 'haramaki', 'jacket']);
    const hat = ch(0.6) ? { kind: look === 'jacket' && ch(0.4) ? 'fedora' : 'flatcap', col: jit(pick([0x6a5a48, 0x4a4a4e, 0x7a6a4a, 0x3a3430])), col2: [40, 34, 30] } : null;
    return {
      sex: 'm', age: 'elder', H: rr(1.52, 1.64), build: rr(0.92, 1.05), belly: ch(0.45) ? rr(0.2, 0.7) : 0,
      skin: pick([SKIN.light, SKIN.medium, SKIN.warm]),
      hair: { style: pick(['bald', 'bald', 'short', 'buzz', 'sidepart']), col: pick([HAIR.grey, HAIR.silver, HAIR.white]), grey: 1, part: 1 },
      face: { wrinkles: 1, spots: 1, mustache: ch(0.3), stubble: rr(0, 0.3), browW: 1.2, lipFull: 0.75 },
      glasses: ch(0.55) ? { kind: pick(['horn', 'round', 'round']), col: pick([[150, 120, 70], [40, 34, 30], [70, 44, 30]]), thick: 1.2 } : null,
      hat,
      top: look === 'haramaki' ? { kind: 'tee', col: [240, 238, 230], print: 'none', tuck: true, haramaki: jit(pick([0xb89a6a, 0x8a3a30, 0x6a6a4a, 0x8a8a84])) }
        : look === 'jacket' ? { kind: 'jacket', col: jit(pick([0x8a7a5a, 0x6a6a5e, 0x5a5a64, 0x6a5440])), shirt: jit(pick([0xe8e4dc, 0xc8d0d8])) }
        : { kind: 'shirt', col: jit(pick([0xe8e4d6, 0xc8d4dc, 0xd8ccb0, 0xb8c0a8, 0xe0d8d0])), sleeve: 'short', tuck: true, braces: ch(0.6) ? jit(pick([0x3a3a40, 0x5a3a2a, 0x6a2a2a])) : null },
      bottom: { kind: 'slacks', col: look === 'haramaki' ? jit(pick([0xd8d0bc, 0x8a8070])) : jit(pick([0x5a5a5a, 0x6a5e4e, 0x4a4a54, 0x7a7060])), belt: [50, 36, 26], wide: true },
      shoes: ch(0.55) ? { kind: 'sandal', col: jit(pick([0x8a5a32, 0x7a5030])) } : { kind: 'comfort', col: jit(pick([0x3a2a20, 0x2a2420])) }, socks: { col: ch(0.5) ? [236, 236, 232] : [90, 90, 96] },
      acc: !hat && ch(0.6) ? [{ kind: 'cane', col: jit(0x5a3a22) }] : [], // (cap + cane together go over the 2.5k budget)
      walk: { style: 'elder', hunch: rr(0.4, 0.9) },
    };
  },
  kid: ({ pick, ch, rr, jit }) => {
    const girl = ch(0.45);
    return {
      sex: girl ? 'f' : 'm', age: 'kid', H: rr(1.1, 1.28), build: rr(0.95, 1.08),
      skin: japaneseSkin(pick),
      hair: { style: girl ? pick(['bob', 'bob', 'pigtails']) : pick(['bowl', 'buzz', 'buzz', 'short']), col: pick([HAIR.black, HAIR.soft, HAIR.black]) },
      face: { blush: 0.6 },
      hat: ch(0.5) ? { kind: 'schoolhat', col: [246, 206, 40] } : !girl && ch(0.3) ? { kind: 'cap', col: jit(pick([0x2a3a6a, 0xa02a2a, 0x1e1e22])), col2: [240, 240, 236] } : null,
      top: girl && ch(0.5) ? { kind: 'blouse', col: jit(pick([0xf4f0e6, 0xe8d0d0, 0xd8e4e8])), sleeve: 'short' } : { kind: 'tee', col: jit(pick([0xf0ece0, 0xc84a3a, 0x4a6a9a, 0xd8b04a, 0x6a8a5a])), print: pick(['border', 'border', 'stripes', 'none']), col2: jit(pick([0x2a3a6a, 0xa02a2a, 0xf0ece0])) },
      bottom: girl ? { kind: 'skirt', cut: 'aline', col: jit(pick([0x2a3a6a, 0x8a3a3a, 0x5a4a3a])) } : { kind: 'shorts', col: jit(pick([0x2a3a6a, 0x5a4a3a, 0x3a3a3a, 0x6a6a5a])) },
      legs: ch(0.5) ? 'kneesocks' : 'socks', socks: { col: [246, 246, 244] },
      shoes: { kind: 'sneaker', col: jit(pick([0xf0ece0, 0x3a4a6a, 0xd8d0c0])), col2: jit(pick([0x2a3a6a, 0xa02a2a, 0xf0ece0])) },
      acc: ch(0.8) ? [{ kind: 'randoseru', col: jit(girl ? pick([0xb02a2a, 0xa02a30]) : pick([0x1e1a1a, 0x1e1a1a, 0x3a2418])) }] : [],
      walk: { style: 'kid' },
    };
  },
  tourist: ({ pick, ch, rr, jit }) => {
    const f = ch(0.45);
    const fair = ch(0.7);
    return {
      sex: f ? 'f' : 'm', age: 'adult', H: f ? rr(1.6, 1.74) : rr(1.72, 1.88), build: rr(0.95, 1.12), belly: !f && ch(0.3) ? rr(0.3, 0.9) : 0, bust: 1,
      skin: fair ? pick([SKIN.pale, SKIN.pale, SKIN.fair, SKIN.light]) : pick([SKIN.tan, SKIN.brown, SKIN.dark, SKIN.deep]),
      hair: { style: f ? pick(['long', 'long', 'bob', 'perm']) : pick(['messy', 'sidepart', 'short']), col: fair ? pick([HAIR.blonde, HAIR.chestnut, HAIR.brown, HAIR.ginger, HAIR.ash]) : pick([HAIR.black, HAIR.dbrown]), part: 1 },
      face: { iris: fair ? pick([IRIS.blue, IRIS.green, IRIS.grey, IRIS.hazel, IRIS.brown]) : IRIS.dbrown, lid: 'double', tilt: 0, eyeH: 1.15, freckles: fair && ch(0.4) ? 0.8 : 0, stubble: f ? 0 : rr(0.1, 0.6), mustache: !f && ch(0.3), blush: fair ? 0.45 : 0.15, browW: f ? 1 : 1.2 },
      glasses: ch(0.35) ? { kind: 'sun', col: [150, 120, 70], thick: 1 } : null,
      hat: ch(0.5) ? { kind: 'bucket', col: jit(pick([0xd8c8a0, 0x8a7a5a, 0xe8e4dc])), col2: jit(pick([0x8a3a2a, 0x3a4a6a])) } : null,
      top: ch(0.5) ? { kind: 'aloha', col: jit(pick([0x2a6a8a, 0xc86a3a, 0x3a5a3a, 0xe0c890, 0x6a3a2a])), col2: jit(pick([0xf0f0e8, 0xf0c040, 0xe8a070])) } : f ? { kind: 'blouse', col: jit(pick([0xf0e8d0, 0xd8a070, 0xc8d8c0])), sleeve: 'short' } : { kind: 'shirt', col: jit(pick([0xe8dcc0, 0xa8b8c8, 0xc8a878])), sleeve: 'short', tuck: true },
      bottom: f && ch(0.5) ? { kind: 'skirt', cut: 'long', col: jit(pick([0x8a5a3a, 0x5a6a3a, 0x3a3a5a])) } : ch(0.5) ? { kind: 'shorts', col: jit(pick([0xc8b48a, 0x8a8a6a, 0x6a6a5a])) } : { kind: 'jeans', col: jit(pick([0x3a4a6a, 0x4a5a7a])), wide: true, belt: [60, 40, 28] },
      legs: 'socks', socks: { col: [244, 244, 242] },
      shoes: ch(0.5) ? { kind: 'sneaker', col: jit(pick([0xf0ece0, 0x8a6a4a, 0x3a3a3e])), col2: jit(pick([0x2a4a8a, 0x8a3a2a, 0xf0ece0])) } : { kind: 'sandal', col: jit(0x5a3a24) },
      acc: [{ kind: 'camera', col: [26, 26, 28] }, ...(ch(0.5) ? [{ kind: 'backpack', col: jit(pick([0x6a5a3a, 0x8a3a2a, 0x3a4a3a, 0x3a4a6a])) }] : [])],
      walk: { style: 'normal', look: 1 },
    };
  },
  otaku: ({ pick, ch, rr, jit }) => ({ // the lane's bookish manga-and-model-kit lodger
    sex: 'm', age: 'adult', H: rr(1.62, 1.74), build: rr(0.9, 1.08), belly: ch(0.4) ? rr(0.3, 1.0) : 0,
    skin: pick([SKIN.fair, SKIN.light, SKIN.fair]),
    hair: { style: pick(['mushroom', 'messy', 'bowl']), col: pick([HAIR.black, HAIR.soft]) },
    face: { stubble: rr(0, 0.35), browW: rr(0.9, 1.15) },
    glasses: { kind: pick(['horn', 'horn', 'round']), col: pick([[24, 22, 24], [60, 36, 28]]), thick: pick([1.2, 1.6]) },
    top: ch(0.5) ? { kind: 'flannel', col: jit(pick([0x7a3a2a, 0x3a4a6a, 0x4a5a3a, 0x6a5a3a])), col2: jit(pick([0x2a2422, 0xe0d8c0])), tuck: true } : { kind: 'shirt', col: jit(pick([0xe0d8c0, 0xc8d0c8, 0xd8c8a8])), sleeve: 'short', tuck: true },
    bottom: { kind: 'slacks', col: jit(pick([0x5a4e3e, 0x3a3a40, 0x6a6450])), belt: [40, 30, 24], wide: true, noCrease: true },
    shoes: { kind: 'sneaker', col: jit(pick([0xe8e4dc, 0x6a5a4a])), col2: jit(pick([0x2a2a2e, 0x6a3a2a])) }, socks: { col: [220, 220, 220] },
    acc: [{ kind: 'shoulderbag', col: jit(pick([0x6a5a3a, 0x3a3a30])), side: 1, school: true }],
    walk: { style: 'slouch' },
  }),
  gyaru: ({ pick, rr, ch, jit }) => ({ // the lane's fashionable young woman, 70s: long centre-parted hair, flares, platforms
    sex: 'f', age: 'adult', H: rr(1.54, 1.64), build: rr(0.9, 1.0), bust: rr(0.8, 1.1),
    skin: japaneseSkin(pick),
    hair: { style: pick(['long', 'long', 'bob']), col: pick([HAIR.black, HAIR.soft, HAIR.dbrown]), part: 0 },
    face: { makeup: { liner: 0.5, lash: 0.8, shadow: pick([[150, 160, 190], [190, 150, 120]]), blush: [230, 140, 130] }, lipstick: jit(pick([0xc06a5a, 0xb85a60, 0xd08a78])), eyeH: 1.1, blush: 0.3, browW: 0.75 },
    hat: ch(0.3) ? { kind: 'scarf', col: jit(pick([0xd8a048, 0xe8e0d0, 0x8a4a3a])), col2: [240, 232, 210] } : null,
    top: ch(0.5) ? { kind: 'knit', col: jit(pick([0xd8a048, 0x8a4a3a, 0xe8dcc0, 0x6a7a4a])), sleeve: 'long', tuck: true } : { kind: 'blouse', col: jit(pick([0xf0e4c8, 0xe0a890, 0xc8d8b8])), sleeve: 'long' },
    bottom: ch(0.55) ? { kind: 'jeans', col: jit(pick([0x3a4a6a, 0x4a5a7a]), 0.04), wide: true, belt: [80, 50, 30] } : { kind: 'skirt', cut: 'long', col: jit(pick([0x8a4a2a, 0x5a3a2a, 0x3a4a3a, 0x6a3a4a])) },
    legs: 'socks', socks: { col: [220, 200, 180] },
    shoes: { kind: 'platform', col: jit(pick([0x5a3a24, 0x2a2220, 0xc8a878])) },
    acc: [{ kind: 'shoulderbag', col: jit(pick([0x8a5a32, 0x5a3a24, 0xc8a878])), side: 1 }],
    walk: { style: 'dainty' },
  }),
  mom: ({ pick, ch, rr, jit }) => {
    const dress = ch(0.5), dc = jit(pick([0xc8a890, 0x8aa0b0, 0xa8b088, 0xd8c8a0, 0xb08080, 0x7a8aa0]));
    return {
      sex: 'f', age: 'adult', H: rr(1.5, 1.6), build: rr(0.94, 1.06), bust: rr(0.8, 1.1),
      skin: japaneseSkin(pick),
      hair: { style: pick(['perm', 'perm', 'bob', 'bun']), col: pick([HAIR.black, HAIR.soft, HAIR.dbrown]), part: ch(0.5) ? 1 : -1 },
      face: { makeup: { liner: 0.15, lash: 0.4, blush: [230, 140, 130] }, lipstick: jit(pick([0xb86a6a, 0xc07a70])), blush: 0.35 },
      hat: ch(0.25) ? { kind: 'scarf', col: jit(pick([0xe8dcc0, 0xb04a3a, 0x4a6a8a, 0xd8b84a])), col2: [240, 236, 226] } : null,
      // a shirtwaist dress (blouse + A-line in one cloth), or a cardigan over a blouse and skirt
      top: dress ? { kind: 'blouse', col: dc, sleeve: 'short' } : { kind: 'blouse', col: jit(pick([0xf0ece0, 0xe0e8d8, 0xe8d8e0])), sleeve: 'short', cardigan: ch(0.6) ? jit(pick([0xa08a70, 0x6a7a8a, 0xd8c8b0, 0x8a4a3a])) : null },
      bottom: { kind: 'skirt', cut: 'aline', col: dress ? dc : jit(pick([0x6a6a5a, 0x3a3a48, 0x8a7a5a, 0x5a4a5a])) },
      legs: 'socks', socks: { col: jit(pick([0xe8e4dc, 0xd8c8b0])) },
      shoes: ch(0.5) ? { kind: 'sandal', col: jit(pick([0x8a5a32, 0xc8a878])) } : { kind: 'comfort', col: jit(pick([0xd8c8b0, 0x5a4a3a])) },
      acc: [...(ch(0.55) ? [{ kind: 'apron', col: jit(pick([0xf0ece4, 0xe8d8c0, 0xd8e0e8])), col2: [236, 232, 220] }] : []), { kind: 'ecobag', col: jit(pick([0xc8b48a, 0x9a8a5a, 0xd8c8a8])), leek: ch(0.7) }],
      walk: { style: 'normal' },
    };
  },
  delivery: ({ pick, ch, rr, jit }) => {
    const soba = ch(0.5), c = pick([[0x2a4a3a, 0xe8e4dc], [0x2a3a6a, 0xe8e4dc], [0x8a2a2a, 0xf0f0ec]]);
    return {
      sex: 'm', age: 'adult', H: rr(1.62, 1.74), build: rr(0.94, 1.06),
      skin: pick([SKIN.medium, SKIN.warm, SKIN.light]),
      hair: { style: pick(['short', 'buzz']), col: pick([HAIR.black, HAIR.soft]) },
      face: { stubble: rr(0.1, 0.4), browW: 1.15 },
      hat: soba ? { kind: 'headband', col: [240, 240, 236] } : { kind: 'cap', col: jit(c[0], 0.03), col2: hex(c[1]) },
      top: soba ? { kind: 'shirt', col: [242, 240, 232], sleeve: 'short', tuck: true } : { kind: 'workjacket', col: jit(c[0], 0.03), sleeve: 'long' },
      bottom: { kind: 'slacks', col: jit(pick([0x2a2e36, 0x3a3a34, 0x4a4438])), noCrease: true },
      shoes: soba ? { kind: 'sandal', col: jit(0x7a5030) } : { kind: 'sneaker', col: [220, 214, 200], col2: [60, 50, 40] }, socks: { col: [40, 40, 44] },
      acc: soba ? [{ kind: 'apron', col: jit(0x23304a), col2: [236, 232, 220] }] : [{ kind: 'pouch', col: jit(0x3a2a20) }],
      walk: { style: 'brisk' },
    };
  },
  construction: ({ pick, ch, rr, jit }) => {
    const vest = ch(0.35);
    return {
      sex: 'm', age: 'adult', H: rr(1.62, 1.76), build: rr(1.0, 1.15), belly: ch(0.3) ? rr(0.2, 0.6) : 0,
      skin: pick([SKIN.warm, SKIN.tan, SKIN.tan, SKIN.medium]),
      hair: { style: pick(['short', 'buzz', 'buzz']), col: pick([HAIR.black, HAIR.soft]) },
      face: { stubble: rr(0.3, 0.8), browW: 1.25 },
      hat: !vest && ch(0.7) ? { kind: 'hardhat', col: jit(pick([0xf0f0ec, 0xf0c838, 0xf0f0ec]), 0.03) } : { kind: 'headband', col: [240, 240, 236] },
      top: vest ? { kind: 'tee', col: [236, 234, 226], print: 'none', tuck: true, haramaki: jit(pick([0xb89a6a, 0x8a8a7a, 0x6a6a4a])) } : { kind: 'workjacket', col: jit(pick([0x8a8060, 0x3a4458, 0x6a6a68, 0x4a5a3a])), sleeve: 'long' },
      bottom: { kind: 'tobi', col: jit(pick([0x2a3048, 0x8a8060, 0x4a4a4e, 0x1e1e22, 0x6a5a4a])) },
      shoes: { kind: 'tabi', col: jit(pick([0x1e2230, 0x1e1e1e, 0x3a3a40])) },
      acc: [{ kind: 'towel', col: [240, 240, 236] }],
      walk: { style: 'heavy' },
    };
  },
  shopkeeper: ({ pick, ch, rr, jit }) => {
    const f = ch(0.6);
    return {
      sex: f ? 'f' : 'm', age: 'elder', H: f ? rr(1.44, 1.54) : rr(1.54, 1.64), build: rr(0.96, 1.06), bust: 0.8,
      skin: pick([SKIN.light, SKIN.medium, SKIN.warm]),
      hair: f ? { style: pick(['bun', 'perm']), col: pick([HAIR.grey, HAIR.silver, HAIR.dbrown]), grey: 1 } : { style: pick(['bald', 'short', 'buzz']), col: pick([HAIR.grey, HAIR.silver]), grey: 1 },
      face: { wrinkles: 1, spots: 1, lipFull: 0.8, blush: 0.3, mustache: !f && ch(0.3) },
      glasses: ch(0.5) ? { kind: pick(['round', 'horn']), col: pick([[150, 120, 70], [60, 40, 30]]), thick: 1 } : null,
      hat: f ? (ch(0.4) ? { kind: 'scarf', col: jit(pick([0xe8e0d0, 0x4a5a7a])), col2: [236, 232, 220] } : null) : ch(0.5) ? { kind: 'headband', col: [240, 240, 236] } : null,
      top: f ? { kind: 'blouse', col: [242, 240, 232], sleeve: 'long' } : { kind: 'shirt', col: jit(pick([0xe8e4dc, 0xc8c0a8])), sleeve: 'short', tuck: true },
      bottom: { kind: 'slacks', col: jit(pick([0x3a3a40, 0x4a4038])), noCrease: true, wide: true },
      shoes: { kind: 'sandal', col: jit(pick([0x8a5a32, 0x3a2c22])) }, socks: { col: [236, 236, 232] },
      acc: [{ kind: 'apron', col: f ? [242, 240, 232] : jit(pick([0x2a3450, 0x5a3a2a, 0x3a4a3a])), col2: [236, 232, 220] }],
      walk: { style: 'elder', hunch: rr(0.3, 0.7) },
    };
  },
};

// ------------------------------------------------------------------ named characters (fixed looks, no dice)
// The finishing touches the painted clothes can't do (Rohan's cropped top, Okuyasu's open jacket and scar, pins,
// headband, sketchbook) are added by src/npc/looks.js; spec.garb asks hair.js for a long coat's skirts (garb.js).
Object.assign(BUILD, {
  // the weird mangaka: slim, sharp, a designer cropped top over pale trousers
  rohan: () => ({
    sex: 'm', age: 'adult', H: 1.76, build: 0.9,
    skin: SKIN.fair,
    hair: { style: 'rohan', col: [38, 58, 50], hi: [120, 168, 150], part: -1 },
    face: { iris: [44, 120, 100], lid: 'double', tilt: 1.25, eyeW: 1.06, eyeH: 0.86, browW: 0.8, browArch: 1.5, lipFull: 0.78, blush: 0.12, browCol: [34, 46, 40] },
    top: { kind: 'knit', col: [46, 112, 84], sleeve: 'short', crop: true },
    bottom: { kind: 'slacks', col: [226, 214, 190], belt: [28, 24, 22], noCrease: false },
    shoes: { kind: 'loafer', col: [52, 36, 30] }, socks: { col: [40, 70, 60] },
    acc: [],
    walk: { style: 'brisk' },
  }),
  // the pompadour: tall, broad, a long dark gakuran with little gold pins
  josuke: () => ({
    sex: 'm', age: 'teen', H: 1.85, build: 1.08,
    skin: SKIN.light,
    hair: { style: 'pompadour', col: [34, 30, 44], hi: [150, 150, 200] },
    face: { iris: [64, 86, 140], lid: 'double', tilt: 0.55, eyeH: 1.0, browW: 1.25, browArch: 0.7, lipFull: 0.9 },
    top: { kind: 'gakuran', col: [26, 30, 50] },
    bottom: { kind: 'slacks', col: [26, 30, 50], belt: [24, 22, 20], noCrease: true },
    shoes: { kind: 'boots', col: [30, 26, 24] }, socks: { col: [30, 30, 36] },
    garb: { coat: { len: 0.82 } },
    acc: [],
    walk: { style: 'young' },
  }),
  // his best friend: stocky, rough buzzed spikes, a scar, the jacket worn open, baggy trousers
  okuyasu: () => ({
    sex: 'm', age: 'teen', H: 1.82, build: 1.16,
    skin: SKIN.warm,
    hair: { style: 'spiky', col: [52, 56, 70], hi: [150, 158, 186] },
    face: { iris: hex(IRIS.dbrown), lid: 'mono', tilt: 0.05, eyeW: 0.92, eyeH: 0.78, browW: 1.7, browArch: 0.2, lipFull: 1.0, stubble: 0.08 },
    top: { kind: 'gakuran', col: [30, 30, 40], open: true },
    bottom: { kind: 'slacks', col: [30, 30, 40], belt: [24, 22, 20], noCrease: true, wide: true },
    shoes: { kind: 'sneaker', col: [236, 234, 228], col2: [200, 50, 50] }, socks: { col: [236, 236, 236] },
    acc: [],
    walk: { style: 'heavy' },
  }),
});

// ------------------------------------------------------------------ more named locals (src/npc/roster.js)
Object.assign(BUILD, {
  // the pigeon man: flat cap, round glasses, a tweedy jacket and a bag of bread crusts
  hatoda: () => ({
    sex: 'm', age: 'elder', H: 1.62, build: 0.98, belly: 0.35,
    skin: SKIN.medium,
    hair: { style: 'short', col: HAIR.grey, grey: 1 },
    face: { wrinkles: 1, spots: 1, mustache: true, browW: 1.3, lipFull: 0.75, stubble: 0.2 },
    glasses: { kind: 'round', col: [70, 50, 34], thick: 1 },
    hat: { kind: 'flatcap', col: hex(0x6a6a52) },
    top: { kind: 'jacket', col: hex(0x9a8a6a), shirt: hex(0xe8e0d0) },
    bottom: { kind: 'slacks', col: hex(0x5a5448), belt: [50, 36, 26], wide: true },
    shoes: { kind: 'sandal', col: hex(0x8a5a32) }, socks: { col: [236, 236, 232] },
    acc: [{ kind: 'ecobag', col: hex(0xd8c8a8), leek: false }],
    walk: { style: 'elder', hunch: 0.5 },
  }),
  // the prankster: a cap, a loud tee, shorts, a backpack full of rubber snakes
  gonta: () => ({
    sex: 'm', age: 'teen', H: 1.58, build: 0.94,
    skin: SKIN.warm,
    hair: { style: 'messy', col: HAIR.soft },
    face: { blush: 0.5, browW: 1.15, browArch: 1.2 },
    hat: { kind: 'cap', col: hex(0xe85a2a), col2: [240, 240, 236] },
    top: { kind: 'tee', col: hex(0xe8c048), print: 'border', col2: hex(0xb83a2a) },
    bottom: { kind: 'shorts', col: hex(0x2e3a5e) },
    legs: 'kneesocks', socks: { col: [246, 246, 244] },
    shoes: { kind: 'sneaker', col: hex(0xf0f0ec), col2: hex(0xd83a2a) },
    acc: [{ kind: 'backpack', col: hex(0x2a6a3a) }],
    walk: { style: 'kid' },
  }),
  // the self-proclaimed sorcerer: a dark hoodie (hood up: src/npc/looks.js), black jeans, an eyepatch, pale
  kuromaru: () => ({
    sex: 'm', age: 'adult', H: 1.73, build: 0.88,
    skin: SKIN.pale,
    hair: { style: 'messy', col: HAIR.black },
    face: { iris: [120, 40, 60], lid: 'double', tilt: 1.1, browW: 0.9, browArch: 1.6, makeup: { liner: 0.7, lash: 0.2 }, lipFull: 0.8 },
    hat: { kind: 'hood' },
    top: { kind: 'knit', col: [40, 34, 52], sleeve: 'long' },
    bottom: { kind: 'slacks', col: [34, 32, 40], belt: [24, 22, 20], wide: true, noCrease: true },
    shoes: { kind: 'loafer', col: hex(0x1e1a18) }, socks: { col: [30, 30, 36] },
    acc: [],
    walk: { style: 'slouch' },
  }),
  // the straw-hat pirate: a red short-sleeved shirt worn open, rolled denim shorts, sandals, a scar under one eye
  gomuzo: () => ({
    sex: 'm', age: 'teen', H: 1.72, build: 0.96,
    skin: SKIN.warm,
    hair: { style: 'messy', col: HAIR.black },
    face: { iris: hex(IRIS.dbrown), lid: 'mono', tilt: 0.2, eyeW: 1.12, eyeH: 1.1, browW: 1.1, lipFull: 1.0, blush: 0.2 },
    hat: { kind: 'sunhat', col: hex(0xe8c878), col2: hex(0xc02a2a) },
    top: { kind: 'shirt', col: hex(0xc8282a), sleeve: 'short', open: true },
    bottom: { kind: 'shorts', col: hex(0x3a5a9a) },
    shoes: { kind: 'sandal', col: hex(0x8a5a32) }, // geta
    acc: [],
    walk: { style: 'young' },
  }),
  // the guy in the bush: camouflage-ish work jacket, cargo trousers, a cap, stubble and a pair of binoculars
  yabuki: () => ({
    sex: 'm', age: 'adult', H: 1.7, build: 1.0, belly: 0.2,
    skin: SKIN.medium,
    hair: { style: 'buzz', col: HAIR.dbrown },
    face: { stubble: 0.7, browW: 1.3, browArch: 0.4, eyeH: 0.9 },
    hat: { kind: 'cap', col: hex(0x5a6238), col2: hex(0x3a4226) },
    top: { kind: 'workjacket', col: hex(0x5e6640), sleeve: 'long' },
    bottom: { kind: 'cargo', col: hex(0x4a4a34) },
    shoes: { kind: 'boots', col: hex(0x3a2a20) }, socks: { col: [60, 60, 50] },
    acc: [{ kind: 'pouch', col: hex(0x3a3a2a) }],
    walk: { style: 'heavy' },
  }),
  // the biologist: an adult woman in field clothes: a sage polo under a khaki vest, cargo trousers, boots, a ponytail
  kusaka: () => ({
    sex: 'f', age: 'adult', H: 1.67, build: 0.96, bust: 0.95,
    skin: SKIN.light,
    hair: { style: 'ponytail', col: HAIR.dbrown, part: 1 },
    face: { makeup: { liner: 0.2, lash: 0.5, blush: [230, 150, 140] }, lipstick: hex(0xc07a70), blush: 0.3, browW: 1.0 },
    glasses: { kind: 'round', col: [120, 90, 60], thick: 1 },
    top: { kind: 'polo', col: hex(0xcadab8), vest: hex(0x9a8a5e), sleeve: 'long' },
    bottom: { kind: 'slacks', col: hex(0x7a6e52), noCrease: true, wide: true },
    shoes: { kind: 'boots', col: hex(0x5a3a24) }, socks: { col: [120, 110, 90] },
    acc: [{ kind: 'shoulderbag', col: hex(0x6a4a2a), side: 1 }],
    walk: { style: 'normal' },
  }),
});

// ------------------------------------------------------------------ job applicants in disguise (src/staff, Inspired)
// The base bodies of the odd ones who apply for shop jobs; their voxel extras (the kappa's dish, beak and shell, the
// tanuki's ears, tail and leaf, the yurei's forehead triangle, the ninja's mask) are added by src/staff/looks.js.
Object.assign(BUILD, {
  // a river kappa in a borrowed tee: short, green, a bowl cut ringing the (voxel) dish
  kappa: () => ({
    sex: 'm', age: 'adult', H: 1.42, build: 0.95, belly: 0.5,
    skin: [112, 172, 92],
    hair: { style: 'bowl', col: [38, 66, 42], hi: [96, 138, 90] },
    face: { iris: [214, 172, 44], lid: 'double', tilt: 0.3, eyeW: 1.2, eyeH: 1.2, browW: 0.55, lipFull: 0.7, blush: 0, browCol: [30, 54, 34] },
    top: { kind: 'tee', col: [232, 222, 156], print: 'none' },
    bottom: { kind: 'shorts', col: [62, 112, 142] },
    shoes: { kind: 'sandal', col: [112, 82, 52] },
    acc: [],
    walk: { style: 'young' },
  }),
  // a tanuki passing as a businessman: round belly, dark eye patches, a Shigaraki straw hat
  tanuki: () => ({
    sex: 'm', age: 'adult', H: 1.56, build: 1.12, belly: 1.4,
    skin: [198, 152, 106],
    hair: { style: 'short', col: [86, 62, 44] },
    face: { iris: [60, 36, 20], lid: 'mono', tilt: 0.1, eyeW: 1.15, eyeH: 1.05, browW: 1.3, lipFull: 0.9, blush: 0.45, stubble: 0.2, makeup: { liner: 0.7, lash: 0, shadow: [72, 52, 40] } },
    hat: { kind: 'sunhat', col: [214, 180, 112], col2: [122, 82, 42] },
    top: { kind: 'jacket', col: [122, 94, 64], shirt: [236, 228, 210] },
    bottom: { kind: 'slacks', col: [88, 72, 56], belt: [40, 30, 22] },
    shoes: { kind: 'sandal', col: [72, 52, 36] }, socks: { col: [236, 232, 220] },
    acc: [],
    walk: { style: 'heavy' },
  }),
  // a yurei: white burial kimono (blouse + long skirt), very long black hair, no colour in the face
  yurei: () => ({
    sex: 'f', age: 'teen', H: 1.56, build: 0.88, bust: 0.5,
    skin: [232, 236, 238],
    hair: { style: 'long', col: [20, 18, 24], hi: [70, 74, 96], volume: 1.25 },
    face: { iris: [40, 44, 60], lid: 'double', tilt: 0.9, eyeH: 0.8, browW: 0.7, lipFull: 0.7, blush: 0, lipstick: [190, 196, 204], makeup: { liner: 0.4, lash: 0.3, shadow: [170, 180, 196] } },
    top: { kind: 'blouse', col: [244, 244, 240], sleeve: 'long' },
    bottom: { kind: 'skirt', cut: 'long', col: [240, 240, 236] },
    legs: 'socks', socks: { col: [244, 244, 240] },
    shoes: { kind: 'sandal', col: [230, 226, 216] },
    acc: [],
    walk: { style: 'dainty' },
  }),
  // definitely not a ninja: all black, a headband, split-toe tabi
  ninja: () => ({
    sex: 'm', age: 'adult', H: 1.72, build: 0.96,
    skin: [224, 180, 142],
    hair: { style: 'short', col: [26, 24, 28] },
    face: { iris: [40, 28, 20], lid: 'mono', tilt: 0.9, eyeW: 0.95, eyeH: 0.8, browW: 1.3, browArch: 1.2 },
    hat: { kind: 'headband', col: [30, 32, 46] },
    top: { kind: 'workjacket', col: [36, 38, 52], sleeve: 'long' },
    bottom: { kind: 'tobi', col: [34, 36, 48] },
    shoes: { kind: 'tabi', col: [28, 28, 34] },
    acc: [],
    walk: { style: 'brisk' },
  }),
});

/** Pick a street preset id from a seed (weighted). */
export function streetPreset(seed) {
  const r = rng((seed * 40503) ^ 0x9e3779b9);
  const ids = Object.keys(STREET_WEIGHTS).filter((k) => STREET_WEIGHTS[k] > 0);
  let tot = ids.reduce((a, k) => a + STREET_WEIGHTS[k], 0), x = r() * tot;
  for (const k of ids) { if (x < STREET_WEIGHTS[k]) return k; x -= STREET_WEIGHTS[k]; }
  return ids[0];
}

// ------------------------------------------------------------------ Grandpa himself (src/grandpa/): one fixed look
// Flat cap, thick round glasses, a white moustache, a brown cardigan over a cream shirt, grey slacks, socks and
// sandals, an old man's stoop (his cane is a separate voxel prop, src/grandpa/props.js). Never on the street.
HUMAN_PRESETS.push({ id: 'gramps', name: 'Grandpa (Tokuzo)' });
Object.assign(BUILD, {
  gramps: () => ({
    sex: 'm', age: 'elder', H: 1.57, build: 1.03, belly: 0.55,
    skin: SKIN.medium,
    hair: { style: 'short', col: HAIR.white, grey: 1, volume: 1.25 },
    face: { iris: hex(IRIS.dbrown), lid: 'mono', tilt: 0.45, wrinkles: 1, spots: 1, mustache: true, browW: 1.4, browArch: 0.6, lipFull: 0.72, stubble: 0.12, blush: 0.5 },
    glasses: { kind: 'round', col: [48, 36, 30], thick: 1.8 },
    hat: null, // (bare-headed: his white hair is part of him)
    top: { kind: 'cardigan', col: hex(0x7a5030), shirt: hex(0xece2cc) },
    bottom: { kind: 'slacks', col: hex(0x5e5b56), belt: [50, 36, 26] },
    shoes: { kind: 'sandal', col: hex(0x4a3626) }, socks: { col: [212, 206, 194] },
    acc: [],
    walk: { style: 'elder', hunch: 0.9 },
  }),
});
