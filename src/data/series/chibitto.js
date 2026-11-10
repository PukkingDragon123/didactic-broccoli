// Chibitto Heroes (ちびっとヒーローズ): eight original anime heroes and a secret as low-poly chibi figures on the game's
// human base model (the chibi kit, src/figures/chibi.js; sculpts in src/figures/sets/chibitto.js). 全8種 + シークレット.
import * as F from '../../figures/sets/chibitto.js';

/** The flyer's backdrop: rooftops against a dusk sky in hard pixel bands, wires, a water tank, the first stars. */
function dusk(p, K, s, h) {
  const W = 640, B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const bands = [0x2a2a5a, 0x3e3470, 0x6a4080, 0xa84c7c, 0xe0706a, 0xf6a868];
  const sky = h - 52;
  for (let y = 0; y < sky; y += 2) {
    const f = Math.min(bands.length - 1.001, (y / sky) * bands.length * 0.98), i = Math.floor(f), t = f - i;
    for (let x = 0; x < W; x += 2) p.rect(x, y, 2, 2, (B4[((y >> 1) & 3) * 4 + ((x >> 1) & 3)] + 0.5) / 16 < t * t * 1.2 - 0.1 ? bands[Math.min(bands.length - 1, i + 1)] : bands[i]);
  }
  for (const [x, y, b] of [[40, 22, 1], [118, 48, 0], [210, 18, 1], [300, 40, 0], [356, 14, 0], [452, 30, 1], [520, 60, 0], [600, 20, 1], [80, 80, 0], [560, 96, 0]]) { p.rect(x, y, 2, 2, 0xfff6d8); if (b) { p.rect(x - 2, y, 1, 2, 0xd8c8e8); p.rect(x + 3, y, 1, 2, 0xd8c8e8); p.rect(x, y - 2, 2, 1, 0xd8c8e8); p.rect(x, y + 3, 2, 1, 0xd8c8e8); } }
  // a thin moon
  for (let j = -18; j <= 18; j++) for (let i = -18; i <= 18; i++) if (i * i + j * j <= 324 && (i + 8) * (i + 8) + (j - 3) * (j - 3) > 260) p.px(540 + i, 70 + j, j < -6 ? 0xfff2c8 : 0xf6dca0);
  // rooftops: tiled gables, a flat roof with a water tank, an antenna, poles and wires
  const R = 0x241c34, R2 = 0x30263f, base = sky - 6;
  const gable = (x0, w, top, col) => { for (let y = top; y < base + 6; y++) { const k = Math.min(1, (y - top) / (w * 0.32)), hw = Math.round(w / 2 * k); p.rect(x0 + w / 2 - hw, y, hw * 2, 1, col); if ((y - top) % 4 === 0 && y > top + 2) p.rect(x0 + w / 2 - hw, y, hw * 2, 1, K.mixC(col, 0x000000, 0.25)); } };
  gable(-20, 170, base - 70, R2); gable(130, 140, base - 54, R); gable(420, 180, base - 78, R2); gable(560, 120, base - 50, R);
  p.rect(250, base - 96, 150, 102, R); p.rect(250, base - 98, 150, 3, 0x3a2e4a);
  for (const wx of [270, 300, 330, 360]) p.rect(wx, base - 70, 12, 10, 0xf2c86a);
  p.rect(300, base - 132, 46, 26, 0x2a2238); p.rect(298, base - 136, 50, 5, 0x3a2e4a); for (const lx of [304, 340]) p.rect(lx, base - 106, 3, 10, 0x2a2238);
  p.rect(380, base - 150, 2, 54, 0x2a2238); for (const [dy, w] of [[0, 18], [8, 12], [16, 8]]) p.rect(381 - w / 2, base - 146 + dy, w, 1, 0x2a2238);
  for (const px of [96, 470]) { p.rect(px, base - 160, 4, 166, 0x1e1828); p.rect(px - 14, base - 150, 32, 3, 0x1e1828); }
  for (let x = 0; x < W; x++) { const t = x < 98 ? x / 98 : x < 472 ? (x - 98) / 374 : (x - 472) / 168; const sag = Math.round(Math.sin(t * Math.PI) * (x < 98 || x > 472 ? 6 : 18)); p.px(x, base - 150 + sag, 0x1e1828); p.px(x, base - 144 + sag, 0x1e1828); }
  p.rect(0, h - 52, W, 52, 0x4a4060); p.rect(0, h - 52, W, 2, 0x8a7aa0); p.rect(0, h - 50, W, 1, 0x3a3050);
}

export default {
  id: 'chibitto',
  order: 15,
  name: 'Chibitto Heroes',
  jp: 'ちびっとヒーローズ',
  romaji: 'CHIBITTO HEROES',
  tagline: 'Small heroes, big entrances',
  taglineJp: 'ちいさくても、主人公。',
  price: 300,
  themes: ['city', 'cute', 'weird'],
  card: { bg: '#2e2a52', accent: '#f06aa0', text: '#fdf6ec', accent2: '#46c0c0', pattern: 'stars' },
  capsule: { colors: [0xf06aa0, 0x46c0c0, 0xf6cc4a, 0x6a4aa8], style: 'clear' },
  atlas: [2048, 2560],
  flyer: {
    maker: 'hoshimaru', scene: dusk, hero: 'kirara', side: ['ren', 'kagero'],
    title: [['ちびっと', 2, 'b'], ['ヒーローズ', 2, 'a']],
    catch: 'ちいさくても、主人公。', sub: '変身・抜刀・出撃！', gimmick: 'ポーズが決まる！',
  },
  items: [
    {
      id: 'kagero', name: 'Kagerō the Kunoichi', jp: 'くノ一かげろう', jpLines: ['くノ一', 'かげ', 'ろう'], rarity: 'common',
      desc: 'Crouched on the ridge since dusk. Her scarf gives her away every time.',
      figure: F.kagero, gimmick: { text: 'Flip the scarf' },
    },
    {
      id: 'aoi', name: 'Aoi of the Sword School', jp: '剣術少女あおい', jpLines: ['剣術', '少女', 'あおい'], rarity: 'common',
      desc: 'Oak bokken, first form, no mercy for the practice post.',
      figure: F.aoi, gimmick: { text: 'Draw the sword' },
    },
    {
      id: 'goda', name: 'Banchō Gōda', jp: 'ゴーダ番長', jpLines: ['ゴーダ', '番長'], rarity: 'common',
      desc: 'Coat on the shoulders, never through the sleeves. A leaf, for some reason.',
      figure: F.goda, gimmick: { text: 'Flip the coat' },
    },
    {
      id: 'sayo', name: 'Sayo the Shrine Maiden', jp: 'みこのさよ', jpLines: ['みこの', 'さよ'], rarity: 'uncommon',
      desc: 'One sealing charm, held out at arm\'s length. Bad spirits, form an orderly queue.',
      figure: F.sayo, gimmick: { text: 'Hold out the charm' },
    },
    {
      id: 'kei', name: 'Detective Kei', jp: '探偵ケイ', jpLines: ['探偵', 'ケイ'], rarity: 'uncommon',
      desc: 'The visor sees everything. The coat is for drama.',
      figure: F.kei, gimmick: { text: 'Lift the visor' },
    },
    {
      id: 'ren', name: 'Pilot Ren', jp: 'パイロット・レン', jpLines: ['パイ', 'ロット', 'レン'], rarity: 'rare',
      desc: 'Back from the sortie, helmet under one arm. Has not explained the robot.',
      figure: F.ren, gimmick: { text: 'Open the helmet visor' },
    },
    {
      id: 'mimi', name: 'Mimi the Idol', jp: 'アイドルみみ', jpLines: ['アイ', 'ドル', 'みみ'], rarity: 'rare',
      desc: 'Second chorus, last note, everybody point!',
      figure: F.mimi, gimmick: { text: 'Point' },
    },
    {
      id: 'kirara', name: 'Starfall Kirara', jp: '星降りきらら', jpLines: ['星降り', 'きらら'], rarity: 'ultra',
      desc: 'Caught halfway through the transformation. The ribbons are still deciding.',
      figure: F.kirara, gimmick: { text: 'Swing the wand' },
    },
    {
      id: 'puchi', name: 'Demon Lord Puchi', jp: '魔王プチ', rarity: 'secret',
      desc: 'Rules the underworld from a capsule. Very proud of the cape.',
      figure: F.puchi, gimmick: { text: 'Flip the cape' },
    },
  ],
};
