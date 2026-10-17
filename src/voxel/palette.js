// Shared hand-picked colour palette for voxel modelling. Values are sRGB hex.
// Using these keeps every series feeling like it belongs to the same handcrafted world.
export const C = {
  // neutrals
  white: 0xfbf8f2, cream: 0xf3e9d2, offwhite: 0xe9e4da, paper: 0xf5efe0,
  lightgray: 0xc9c6c0, gray: 0x8f8c88, darkgray: 0x55524f, charcoal: 0x2f2d2c, black: 0x1a1819,
  ink: 0x241c1c, // softer than black, for eyes/lines

  // skin / fur
  skin: 0xffd9bf, skinShade: 0xf2bfa0, tan: 0xe0a978, brown: 0x9a6239, darkbrown: 0x5e3a22,
  shiba: 0xe8a25a, shibaLight: 0xfff1df, fox: 0xf08a3a, tanuki: 0x8a6a4c, tanukiDark: 0x4a3828,
  panda: 0xc8553d,

  // blush / mouths
  blush: 0xff9fae, pink: 0xffb7c8, hotpink: 0xff6f9a, mouth: 0xc83c4a, tongue: 0xff7a86,

  // pastels
  pastelPink: 0xffd1dc, pastelBlue: 0xbfe3ff, pastelMint: 0xc6f2d6, pastelYellow: 0xfff2b3,
  pastelPurple: 0xe1d0ff, pastelPeach: 0xffd8bd, lavender: 0xc7b3f0,

  // brights
  red: 0xe5383b, vermilion: 0xe34234, orange: 0xff8c2e, yellow: 0xffd23f, lime: 0x9bd94a,
  green: 0x3cae5a, teal: 0x2fb5a6, sky: 0x5cc4ff, blue: 0x2f6fd6, navy: 0x233a72,
  purple: 0x8a5bd6, magenta: 0xd94fb0,

  // food
  rice: 0xfffdf6, nori: 0x1f2b22, salmon: 0xff9466, tuna: 0xd8344a, egg: 0xffd447,
  eggWhite: 0xfffaf0, broth: 0xd9a35a, noodle: 0xf7dc8f, naruto: 0xffe9ef, narutoSwirl: 0xff6f9a,
  soy: 0x5a2e1a, matcha: 0x8fb85a, anko: 0x5c2b2e, crust: 0xc9853f, bread: 0xf2c27b,
  tempura: 0xf5c35a, shrimp: 0xff8a5c, leaf: 0x5aa83c, scallion: 0x7cc95a, tofu: 0xfbf3e3,

  // materials
  wood: 0xb07a46, woodLight: 0xd4a46a, woodDark: 0x7a4e2b, bamboo: 0xc9c06a,
  brass: 0xd4a83a, silver: 0xd8dbe2, steel: 0x9aa3ad, chrome: 0xe8ecf2, copper: 0xc87a4a,
  gold: 0xf2c14e, rust: 0xa5532c,
  plasticRed: 0xe8453c, plasticBlue: 0x3f86e8, plasticYellow: 0xf7d046, plasticGreen: 0x58c06c,
  ceramic: 0xf4f1ea, lacquer: 0x9e1b1b, lacquerBlack: 0x241818,

  // nature
  grass: 0x6dbb4c, grassDark: 0x4a8c38, sakura: 0xffc2d4, sakuraDeep: 0xff8fb2, sea: 0x3a9ad9,
  sand: 0xe8d29a, stone: 0x9a9690, moss: 0x6f8f3e, sky2: 0x9fd9ff, night: 0x1b2347,
};

/** Quick helper to lighten/darken a hex colour by factor (e.g. 1.15 lighter, 0.8 darker). */
export function shade(hex, f) {
  const r = Math.min(255, Math.round(((hex >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((hex >> 8) & 255) * f));
  const b = Math.min(255, Math.round((hex & 255) * f));
  return (r << 16) | (g << 8) | b;
}

/** Mix two hex colours (t = 0 → a, 1 → b). */
export function mix(a, b, t) {
  const ch = (h, s) => (h >> s) & 255;
  const r = Math.round(ch(a, 16) + (ch(b, 16) - ch(a, 16)) * t);
  const g = Math.round(ch(a, 8) + (ch(b, 8) - ch(a, 8)) * t);
  const bl = Math.round(ch(a, 0) + (ch(b, 0) - ch(a, 0)) * t);
  return (r << 16) | (g << 8) | bl;
}
