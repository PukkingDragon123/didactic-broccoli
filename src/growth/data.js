// Growth: every property you can rent or buy, what it costs and when it unlocks. All tuning lives here.
//
// Zones off the map (reserved for growth: x 140..260, z -160..-60; each only exists while you're in it):
//   flat 103 (kitchen, bath, hobby room)   origin (150, 0, -70)   x 147..153,  z -73..-67
//   the shop annex (old tobacco shop)      origin (175, 0, -70)   x 170..180,  z -73..-64 (the painted lane outside)
//   Gacha Kaikan 1F / 2F / 3F / 4F         origins (160, 0, -110), (200, 0, -110), (240, 0, -110), (200, 0, -148)
//                                          each x origin±13, z origin±9; the window views reach x origin±17, z origin+13;
//                                          the slices of the next floor seen through the escalator wells sit at y ±4.2
//
// Money: a property is paid by bank transfer (game.sim.payDigital). Leases have key money now and monthly rent; a
// purchase takes a down payment and the rest as a Morio Shinkin mortgage (monthly instalments with interest). Every
// month's rent / instalment is a bill (game.bills), issued on the 20th and due on the 27th like the garage rent.
import * as THREE from 'three';

export const ORIGINS = {
  home103: new THREE.Vector3(150, 0, -70),
  annex: new THREE.Vector3(175, 0, -70),
  mall1: new THREE.Vector3(160, 0, -110),
  mall2: new THREE.Vector3(200, 0, -110),
  mall3: new THREE.Vector3(240, 0, -110),
  mall4: new THREE.Vector3(200, 0, -148),
};

export const AGENT = 'Ota Real Estate';
export const BANK = 'Morio Shinkin Bank';
export const SITE_URL = 'http://www.ota-fudosan.co.jp/';

/** kind: 'lease' (key money + monthly rent) | 'buy' (down payment + mortgage) | 'fitout' (one-off works on a building
 *  you own) | 'renovate' (one-off works in a flat you rent). need: listings that must be done first. */
export const LISTINGS = [
  {
    id: 'home103', unlock: 'estate:home103', kind: 'lease', name: 'Sakura Heights #103', jp: 'さくらハイツ103号室',
    short: 'The flat next door', price: 30000, monthly: 18000, months: 0,
    blurb: 'The empty 1K next to yours. Mrs. Ota\'s nephew will put a door through the old bath wall so the two flats join up: a proper kitchen with a gas stove, a real tiled bathroom with an ofuro, and a 6-mat back room.',
    terms: ['Key money (reikin) ¥30,000, paid now', 'Rent ¥18,000 a month, on the 27th with your other rent', 'The connecting door stays when you leave. Mrs. Ota insists.'],
    perks: ['Cook simple meals for energy', 'A hot bath: energy back, hangover gone', 'Room for a hobby room later'],
  },
  {
    id: 'hobby', unlock: 'estate:hobby', kind: 'renovate', need: ['home103'], name: 'Hobby room (103)', jp: '趣味の部屋',
    short: 'Glass cases for your collection', price: 45000, monthly: 0,
    blurb: 'Turn the back room of 103 into a collector\'s den: a lit collection cabinet that shows one of every figure you have ever pulled, a glass showcase for your favourites and a chair to admire them from.',
    terms: ['Carpentry and glass cases ¥45,000, paid now', 'No change to the rent'],
    perks: ['Every figure you discovered, on show', 'A showcase for 24 favourites', 'A comfy chair (rest)'],
  },
  {
    id: 'annex', unlock: 'estate:annex', kind: 'buy', name: 'The old tobacco shop', jp: '旧杉本たばこ店',
    short: 'Next door to the garage, 2 doors down', price: 380000, down: 0.25, rate: 0.06, months: 12,
    blurb: 'Old Mr. Sugimoto\'s tobacco shop, shutter down since he retired. Sound building, terrible state. Clear it out, sweep it, fix the lights, paint it, and it\'s a second little gacha shop on the same lane: the GACHA GARAGE annex.',
    terms: ['Price ¥380,000: 25% down (¥95,000) now', 'Morio Shinkin mortgage for the rest: 12 monthly instalments, 6% interest', 'Sold as seen. The junk inside is yours now.'],
    perks: ['6 more machine spots', 'Its own customers off the lane', 'The old tobacco counter becomes a display'],
  },
  {
    id: 'mall', unlock: 'estate:mall', kind: 'buy', need: ['annex'], name: 'Gacha Kaikan building', jp: 'ガチャ会館ビル',
    short: 'Four floors by Morio Station', price: 4800000, down: 0.2, rate: 0.08, months: 36,
    blurb: 'The old Marumiya department store annex by the station, gutted and ready: four floors, an escalator well and a lift. Turn it into GACHA KAIKAN, a capsule-toy department store with walls of machines and crowds from the trains. The ground floor opens first; the floors above are fitted out one at a time.',
    terms: ['Price ¥4,800,000: 20% down (¥960,000) now', 'Morio Shinkin mortgage for the rest: 36 monthly instalments, 8% interest', 'Building fees ¥40,000 a month (lights, lift and escalator upkeep)'],
    perks: ['1F: 8 machine spots + walls of route machines (commission)', 'Escalators and a lift between floors', 'Station crowds'],
    fees: 40000,
  },
  { id: 'mall2', unlock: 'estate:mall2', kind: 'fitout', need: ['mall'], name: 'Kaikan 2F fit-out', jp: '2階 内装工事', short: 'Anime & character floor', price: 600000, floor: 2,
    blurb: 'Neon, tiles and machine walls for the second floor: the anime and character floor.', terms: ['Fit-out works ¥600,000, paid now'], perks: ['8 more machine spots', 'More crowds'] },
  { id: 'mall3', unlock: 'estate:mall3', kind: 'fitout', need: ['mall2'], name: 'Kaikan 3F fit-out', jp: '3階 内装工事', short: 'Retro & kaiju floor', price: 950000, floor: 3,
    blurb: 'The third floor: Showa retro machines, kaiju walls and a big daruma to pose with.', terms: ['Fit-out works ¥950,000, paid now'], perks: ['8 more machine spots', 'More crowds'] },
  { id: 'mall4', unlock: 'estate:mall4', kind: 'fitout', need: ['mall3'], name: 'Kaikan 4F fit-out', jp: '4階 内装工事', short: 'Premium & event floor', price: 1600000, floor: 4,
    blurb: 'The top floor: premium machines in black and gold, a giant capsule shell, the view over the tracks.', terms: ['Fit-out works ¥1,600,000, paid now'], perks: ['8 premium machine spots', 'The busiest floor'] },
];
export const LISTING = Object.fromEntries(LISTINGS.map((l) => [l.id, l]));

/** Bill kinds (registered with game.bills). */
export const BILLS = {
  lease103: { name: 'Rent: flat 103', from: AGENT },
  annexLoan: { name: 'Mortgage: shop annex', from: BANK },
  mallLoan: { name: 'Mortgage: Gacha Kaikan', from: BANK },
  mallFees: { name: 'Kaikan building fees', from: 'Morio Station Building Co.' },
};

/** Machine spots: [x, z, rotY] zone-local. The annex: 4 along the left wall, 2 at the back. */
export const ANNEX_SLOTS = [[-1.88, 1.55, Math.PI / 2], [-1.88, 0.5, Math.PI / 2], [-1.88, -0.55, Math.PI / 2], [-1.88, -1.6, Math.PI / 2], [-0.5, -2.33, 0], [0.6, -2.33, 0]];

/** Monthly instalment of a mortgage. */
export function instalment(principal, rate, months) { return Math.round(principal * (1 + rate) / months / 100) * 100; }
export function downPayment(l) { return l.kind === 'buy' ? Math.round(l.price * l.down / 1000) * 1000 : l.price; }

export const yen = (n) => '¥' + Math.round(n).toLocaleString('en-US');
