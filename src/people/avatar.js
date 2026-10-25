// The player's own character (saved in state.avatar): a base look (body, skin, hair, clothes) plus cosmetics
// (hats, outfits, glasses... see cosmetics.js), bought with yen and equipped per slot.
//   const h = createAvatarHuman(game.state.avatar);  // a Human (see Human.js) wearing the equipped cosmetics
//   game.events.emit('avatar') whenever the saved look changes (the menu / first-person body rebuild then).
// Used by the menu (third person) and the first-person body, so both always match.
import { Human } from './Human.js';
import { makeSpec } from './presets.js';
import { hex, mixc } from './paintlib.js';
import { applyCosmeticSpec, dressHuman, COSMETICS, COSMETIC_BY_ID } from './cosmetics.js';
import './poses.js';

export { COSMETICS, COSMETIC_BY_ID };

// ------------------------------------------------------------------ base look options (free)
export const LOOK = {
  body: [{ id: 'm', name: 'Type A' }, { id: 'f', name: 'Type B' }],
  skin: [
    { id: 'fair', col: 0xf3d6c0 }, { id: 'light', col: 0xecc8aa }, { id: 'medium', col: 0xe0b48e }, { id: 'warm', col: 0xd6a37a },
    { id: 'tan', col: 0xc08a60 }, { id: 'brown', col: 0x8c5a3c }, { id: 'deep', col: 0x5e3a28 },
  ],
  hair: [
    { id: 'messy', name: 'Messy' }, { id: 'short', name: 'Short' }, { id: 'sidepart', name: 'Side part' }, { id: 'buzz', name: 'Buzz' },
    { id: 'mushroom', name: 'Mushroom' }, { id: 'bob', name: 'Bob' }, { id: 'ponytail', name: 'Ponytail' }, { id: 'long', name: 'Long' },
    { id: 'twintails', name: 'Twin tails' }, { id: 'bun', name: 'Bun' },
  ],
  hairCol: [
    { id: 'black', col: 0x2a2428 }, { id: 'brown', col: 0x5a3626 }, { id: 'chestnut', col: 0x8a5632 }, { id: 'blonde', col: 0xd8b878 },
    { id: 'ginger', col: 0xb05a2a }, { id: 'silver', col: 0xc4c0ba }, { id: 'pink', col: 0xe88aaa }, { id: 'blue', col: 0x3a5cb0 },
  ],
  top: [{ id: 'tee', name: 'T-shirt' }, { id: 'knit', name: 'Sweater' }, { id: 'flannel', name: 'Flannel' }, { id: 'aloha', name: 'Aloha' }],
  topCol: [
    { id: 'tomato', col: 0xd8553a }, { id: 'mustard', col: 0xe0a830 }, { id: 'mint', col: 0x7cc8a4 }, { id: 'sky', col: 0x6aa6dc },
    { id: 'navy', col: 0x2a3658 }, { id: 'plum', col: 0x7a4a82 }, { id: 'white', col: 0xf2f0ea }, { id: 'charcoal', col: 0x3a3a3e },
  ],
  bottom: [{ id: 'jeans', name: 'Jeans' }, { id: 'cargo', name: 'Cargo' }, { id: 'shorts', name: 'Shorts' }, { id: 'slacks', name: 'Black pants' }, { id: 'skirt', name: 'Skirt' }],
};
const col = (list, id) => (list.find((o) => o.id === id) || list[0]).col;

/** A brand-new save's character: Grandpa's grandkid in a tee and jeans. hat / outfit / face: equipped cosmetic ids. */
export const AVATAR_DEFAULT = {
  v: 1, seed: 7,
  body: 'm', skin: 'light', hair: 'messy', hairCol: 'black', top: 'tee', topCol: 'tomato', bottom: 'jeans',
  hat: null, outfit: null, face: null,
  owned: [],
};

/** A complete avatar record (fills missing fields; old saves and the first stub's { preset, seed } still work). */
export function normalizeAvatar(a) {
  const r = { ...AVATAR_DEFAULT, ...(a || {}) };
  r.owned = Array.isArray(r.owned) ? r.owned.filter((id) => COSMETIC_BY_ID[id]) : [];
  for (const s of ['hat', 'outfit', 'face']) if (r[s] && COSMETIC_BY_ID[r[s]]?.slot !== s) r[s] = null;
  return r;
}

/** The human spec for an avatar look (also used for the menu crew's friends). */
export function avatarSpec(a) {
  a = normalizeAvatar(a);
  const f = a.body === 'f';
  const spec = makeSpec(f ? 'office_lady' : 'salaryman', a.seed || 7);
  const tc = hex(col(LOOK.topCol, a.topCol)), dark = tc[0] + tc[1] + tc[2] < 260;
  Object.assign(spec, {
    name: 'You', sex: f ? 'f' : 'm', age: 'adult', H: f ? 1.64 : 1.72, build: f ? 0.95 : 1, belly: 0, bust: 0.8,
    glasses: null, hat: null, legs: 'skin', socks: { col: [240, 240, 238] },
    walk: { style: 'young' },
    acc: [],
  });
  spec.skin = hex(col(LOOK.skin, a.skin));
  const hc = hex(col(LOOK.hairCol, a.hairCol));
  spec.hair = { style: a.hair, col: hc, part: 1, volume: 1 };
  spec.hair.hi = hc[0] < 80 ? mixc(hc, [176, 180, 214], 0.75) : mixc(hc, [255, 244, 222], 0.55);
  spec.face = { ...spec.face, stubble: 0, wrinkles: 0, spots: 0, mustache: false, makeup: f ? { liner: 0.25, lash: 0.6, blush: [236, 140, 140] } : null, lipstick: null, blush: f ? 0.4 : 0.28, browW: f ? 1 : 1.1, lid: 'double', tilt: 0.5 };
  const tops = {
    tee: { kind: 'tee', col: tc, print: 'none', col2: [244, 242, 236], sleeve: 'short' },
    knit: { kind: 'knit', col: tc, sleeve: 'long' },
    flannel: { kind: 'flannel', col: tc, col2: dark ? [220, 214, 200] : [40, 34, 36], tuck: false },
    aloha: { kind: 'aloha', col: tc, col2: dark ? [240, 200, 90] : [244, 240, 228] },
  };
  spec.top = tops[a.top] || tops.tee;
  const bots = {
    jeans: { kind: 'jeans', col: hex(0x3a4c70), belt: [40, 30, 24] },
    cargo: { kind: 'cargo', col: hex(0x8a8466) },
    shorts: { kind: 'shorts', col: hex(0x6a6a58) },
    slacks: { kind: 'slacks', col: hex(0x24242a), noCrease: true },
    skirt: { kind: 'skirt', cut: 'pleated', col: hex(0x2c3048) },
  };
  spec.bottom = bots[a.bottom] || bots.jeans;
  if (a.bottom === 'skirt' || a.bottom === 'shorts') { spec.legs = 'socks'; spec.socks = { col: [246, 246, 244] }; }
  spec.shoes = { kind: 'sneaker', col: [242, 240, 234], col2: hex(0xd03a30) };
  return applyCosmeticSpec(spec, a);
}

/**
 * Build the avatar as a Human wearing the equipped cosmetics. opts: { lazy (default false: painted right away) }.
 * The Human gets h.avatar (the normalised record) and h.cosmetics (the voxel rig; see dressHuman).
 */
export function createAvatarHuman(avatar = AVATAR_DEFAULT, opts = {}) {
  const a = normalizeAvatar(avatar);
  const h = new Human(avatarSpec(a), { lazy: opts.lazy ?? false });
  h.avatar = a;
  dressHuman(h, a);
  return h;
}

/** A random look for a friend in the menu (seeded), wearing some of the cosmetics. */
export function randomAvatar(seed, extra = {}) {
  let s = (seed * 2654435761) >>> 0;
  const r = () => ((s = (Math.imul(s ^ (s >>> 15), 2246822519) + 0x9e3779b9) >>> 0) / 4294967296);
  const pick = (list) => list[Math.floor(r() * list.length)].id;
  const f = r() < 0.5;
  const fHair = ['bob', 'ponytail', 'long', 'twintails', 'bun', 'messy'], mHair = ['messy', 'short', 'sidepart', 'buzz', 'mushroom'];
  return normalizeAvatar({
    seed: 11 + seed * 13, body: f ? 'f' : 'm', skin: pick(LOOK.skin.slice(0, 6)), hair: (f ? fHair : mHair)[Math.floor(r() * 5.99)],
    hairCol: r() < 0.55 ? 'black' : pick(LOOK.hairCol), top: pick(LOOK.top), topCol: pick(LOOK.topCol),
    bottom: f && r() < 0.4 ? 'skirt' : pick(LOOK.bottom.slice(0, 4)), ...extra,
  });
}
