// Series 14: Lane Vehicles (路地のりもの). Lowpix figures: art/lowpix/figures/_src/norimono.py
// (written by art/lowpix/figures/_lib/seriesdata.py; GLBs in public/models/lowpix/figures/norimono/).
export default {
  id: 'norimono',
  order: 14,
  name: "Lane Vehicles",
  jp: "路地のりもの",
  tagline: "Everything with wheels on our street",
  taglineJp: "路地を走るのりものたち",
  price: 400,
  themes: ["city", "retro"],
  card: { bg: '#e8eef2', accent: '#2a6ab8', text: '#1a1e26', accent2: '#e8c040', pattern: 'checker' },
  capsule: { colors: [0x2a6ab8, 0xe8c040, 0xe8eef2, 0xc83a2a] },
  items: [
    { id: 'scooter', name: "Mint Scooter", jp: "ミントのスクーター", rarity: 'common', desc: "The family scooter in mint green, the one that took everyone everywhere.", gimmick: { text: "Ride" } },
    { id: 'keitruck', name: "Kei Truck", jp: "軽トラ", rarity: 'common', desc: "Small, white, unstoppable: carries the whole greengrocer's shop at dawn.", gimmick: { text: "Bump" } },
    { id: 'van', name: "Delivery Van", jp: "配達バン", rarity: 'common', desc: "The laundry's round-nosed van, two-tone and polished every Sunday.", gimmick: { text: "Bump" } },
    { id: 'bus', name: "Bonnet Bus", jp: "ボンネットバス", rarity: 'uncommon', desc: "The old mountain-line bus with its nose out front. Mind the step." },
    { id: 'patrol', name: "Patrol Car", jp: "パトカー", rarity: 'uncommon', desc: "Black and white, lamp on the roof, parked by the police box all afternoon.", gimmick: { text: "Lights" } },
    { id: 'fire', name: "Fire Engine", jp: "消防車", rarity: 'rare', desc: "Red as a lacquer bowl, bell polished, ladder ready. Out of the way!", gimmick: { text: "Go!" } },
    { id: 'tram', name: "Chin-Chin Tram", jp: "チンチン電車", rarity: 'ultra', desc: "The streetcar that rings its bell at every corner. Ten yen, any distance.", gimmick: { text: "Ring the bell" } },
    { id: 'golden', name: "Golden Rabbit Scooter", jp: "黄金のスクーター", rarity: 'secret', desc: "A round little scooter plated in gold for the maker's fiftieth birthday.", gimmick: { text: "Spin" } },
  ],
};
