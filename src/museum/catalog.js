// Museum catalogue: display furniture and decorations (from prop libraries). Display sheets live in styles.js.
import { PROPS } from '../world/props.js';

export const DISPLAYS = {
  case_glass: { id: 'case_glass', name: 'Glass Showcase', jp: 'ガラスケース', price: 3500, footprint: [1, 0.5], slots: 4, beauty: 2, themes: ['home', 'city'], desc: 'A classic glass-topped case. 4 spots.' },
  shelf_open: { id: 'shelf_open', name: 'Open Shelf', jp: 'オープン棚', price: 5500, footprint: [1, 0.5], slots: 15, beauty: 2, themes: ['home', 'retro'], desc: 'Wooden shelf with 3 boards. 15 spots.' },
  pedestal: { id: 'pedestal', name: 'Spotlight Pedestal', jp: 'スポットライト台', price: 6000, footprint: [0.5, 0.5], slots: 1, beauty: 3, themes: ['city'], desc: 'One star, one spotlight. Rarity value ×2.', spotlight: true },
  cabinet_tall: { id: 'cabinet_tall', name: 'Collector Cabinet', jp: 'コレクションケース', price: 12000, footprint: [1, 0.5], slots: 15, beauty: 4, themes: ['home', 'city'], desc: 'Tall LED-lit glass cabinet. 15 spots.' },
  capsule_tower: { id: 'capsule_tower', name: 'Capsule Tower', jp: 'カプセルタワー', price: 9000, footprint: [0.5, 0.5], slots: 6, beauty: 5, themes: ['cute', 'retro'], desc: 'A giant acrylic capsule with 6 tiers.' },
  hinadan: { id: 'hinadan', name: 'Hina-dan Steps', jp: 'ひな壇', price: 15000, footprint: [1.5, 1], slots: 18, beauty: 5, themes: ['shrine', 'retro'], desc: 'Red-felt tiered stand like a doll festival. 18 spots.' },
  candy_jar: { id: 'candy_jar', name: 'Candy Jar Case', jp: 'キャンディ瓶ケース', price: 8000, footprint: [0.5, 0.5], slots: 4, beauty: 5, themes: ['candy', 'food', 'cute'], desc: 'A giant sweets jar. 4 spots.' },
  diorama_table: { id: 'diorama_table', name: 'Diorama Table', jp: 'ジオラマ台', price: 18000, footprint: [1.5, 1], slots: 8, beauty: 6, themes: ['nature', 'city'], desc: 'Miniature hills, river and trees. 8 spots.' },
  shrine_case: { id: 'shrine_case', name: 'Hokora Case', jp: '祠ケース', price: 16000, footprint: [1, 0.5], slots: 6, beauty: 6, themes: ['shrine', 'spooky'], desc: 'A tiny wooden shrine with a roof. 6 spots.' },
  space_pod: { id: 'space_pod', name: 'Star Pod', jp: '宇宙ポッド', price: 22000, footprint: [1, 1], slots: 6, beauty: 7, themes: ['space'], desc: 'Glass dome over a glowing starfield. 6 spots.' },
};

/** Decoration props usable in the museum (anything with a footprint + beauty in the prop libraries). */
export function decorList() {
  return Object.values(PROPS)
    .filter((p) => p.footprint && p.beauty)
    .map((p) => ({ ...p, price: decorPrice(p) }))
    .sort((a, b) => a.price - b.price);
}

export function decorPrice(p) {
  return Math.max(500, Math.round((Math.pow(p.beauty, 1.65) * 380) / 100) * 100);
}

export const THEME_NAMES = {
  cute: ['かわいい', 'Cute'], nature: ['自然', 'Nature'], food: ['食べ物', 'Food'], retro: ['レトロ', 'Retro'],
  spooky: ['おばけ', 'Spooky'], space: ['宇宙', 'Space'], shrine: ['神社', 'Shrine'], candy: ['おかし', 'Candy'],
  city: ['街', 'City'], ocean: ['海', 'Ocean'], home: ['おうち', 'Home'], weird: ['シュール', 'Weird'],
};
