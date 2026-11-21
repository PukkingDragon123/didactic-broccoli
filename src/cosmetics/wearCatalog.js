// The wardrobe's real-model pieces (src/cosmetics/wear.js): the voxel-era hats, glasses, masks and bags are redrawn with
// imported hand-made models (same ids, so saves, quests and achievements keep working), and the closet gets a rack of
// new hats, glasses, masks, scarves and bags. Fits are in head units (see wear.js); bags and scarves in metres.
//   applyWear(COSMETICS, BY_ID)  restyle the existing entries (called by src/cosmetics/catalog.js after registering)
//   WEAR_NEW                     the new entries (registered with the rest of the catalogue)
import { wearItem } from './wear.js';
import { preloadAssets } from '../kit/assets.js';

// ------------------------------------------------------------------ fits (model id, size, place; tuned on the display head)
const F = {
  // hats on the head (cover: hair tucked in under the band)
  cap: { m: 'wear_cap', w: 17.2, y: 10.2, z: 3.2, ry: 0 },
  beaniePom: { m: 'wear_beanie_pom', w: 17, y: 9.6, z: 2.2 },
  beanie: { m: 'wear_beanie', w: 17, y: 9.8, z: 2.2 },
  bucket: { m: 'wear_bucket', w: 23, y: 10.4, z: 2.3 },
  boonie: { m: 'wear_boonie', w: 25, yt: 18.2, z: 2.3 }, // (top: the chin cord hangs below the brim)
  strawhat: { m: 'wear_strawhat', w: 36, y: 10.9, z: 2.3 },
  boater: { m: 'wear_boater', w: 24, y: 12.6, z: 2.3 },
  flatcap: { m: 'wear_flatcap', w: 18, y: 11, z: 3.2 },
  flatcap2: { m: 'wear_flatcap2', w: 18, y: 11, z: 3.2 },
  sailor: { m: 'wear_sailor', w: 19, y: 11.2, z: 2.6 },
  peaked: { m: 'wear_peaked', w: 19, y: 11.2, z: 2.6 },
  tophat: { m: 'wear_tophat', w: 21, y: 12.4, z: 2.3 },
  tophat2: { m: 'wear_tophat2', w: 21, y: 12.4, z: 2.3 },
  cowboy: { m: 'wear_cowboy', w: 30, y: 11.6, z: 2.3 },
  cowboy2: { m: 'wear_cowboy2', w: 30, y: 11.6, z: 2.3 },
  hardhat: { m: 'wear_hardhat', w: 19.5, y: 10.6, z: 2.6 },
  pith: { m: 'wear_pith', w: 22, yt: 19.6, z: 2.3 }, // (top: a strap hangs under the brim)
  fedora: { m: 'wear_fedora', w: 25, y: 11.8, z: 2.3 },
  fedora2: { m: 'wear_fedora2', w: 25, y: 11.8, z: 2.3 },
  fedora3: { m: 'wear_fedora3', w: 25, y: 11.8, z: 2.3 },
  trilby: { m: 'wear_trilby', w: 23, y: 11.8, z: 2.3 },
  beret: { m: 'wear_beret', w: 19, y: 12.6, z: 2, rz: -0.14 },
  chef: { m: 'wear_chef', w: 17.5, y: 11, z: 2.2 },
  chef2: { m: 'wear_chef2', w: 17.5, y: 11, z: 2.2 },
  propeller: { m: 'wear_propeller', w: 17, y: 10, z: 2.3 },
  headphones: { m: 'wear_headphones', w: 19, y: 3.5, z: 2.4 },
  sweatband: { m: 'wear_sweatband', w: 16.6, y: 11.2, z: 2.4 },
  paperbag: { m: 'wear_paperbag', w: 19, y: -5.5, z: 2.4 },
  moto: { m: 'wear_moto', w: 21, y: -4.6, z: 2.6 },
  cone: { m: 'cone', w: 17, y: 9.5, z: 2.4 },
  // things that sit on the hair (crown)
  crown: { m: 'wear_crown', w: 13.5, y: 14.6, z: 2.2 },
  reindeer: { m: 'wear_reindeer', w: 22, y: 7.4, z: 2.6 },
  catears: { m: 'wear_catears', w: 15, y: 13.2, z: 2.4 },
  catears2: { m: 'wear_catears2', w: 15, y: 13.2, z: 2.4 },
  party: { m: 'wear_party', w: 8, y: 15.4, x: 2, z: 1.6, rz: -0.3 },
  bow: { m: 'wear_bow', w: 9, y: 14.8, x: 3.4, z: 2.6, rz: -0.25 },
  nigiri: { m: 'wear_nigiri2', w: 10, y: 15.6, z: 2 },
  onigiri: { m: 'food_onigiri2', w: 11, y: 15.6, z: 2, rx: -0.1 },
  towel: { m: 'wear_towel', w: 11, y: 15.8, z: 2 },
  octopus: { m: 'wear_octopus', w: 15, y: 15.2, z: 2 },
  shark: { m: 'wear_shark', w: 22, y: 15.4, z: 2, ry: Math.PI / 2 },
  frog: { m: 'wear_frog', w: 11, y: 15.6, z: 2 },
  rubberchicken: { m: 'wear_rubberchicken', w: 19, y: 15.2, z: 2, rz: Math.PI / 2 },
  woodchicken: { m: 'wear_woodchicken', w: 11, y: 15.4, z: 2 },
  duck: { m: 'wear_duck', w: 11, y: 15.6, z: 2 },
  teddy: { m: 'teddy', w: 12, y: 15.2, z: 2 },
  wagasa: { m: 'wear_wagasa2', w: 26, y: 15.6, z: 2 },
  kokeshi: { m: 'kokeshi2', h: 9, y: 15.6, z: 2 },
  daruma: { m: 'daruma', w: 10, y: 15.6, z: 2 },
  robot: { m: 'toy_robot2', h: 10, y: 15.6, z: 2 },
  kappaDish: { m: 'bowl_empty', w: 10, y: 15.4, z: 2 },
  bonsai: { m: 'bonsai', h: 13, y: 15, z: 1.5 },
  sprout: { m: 'aloe_pot', h: 6.5, y: 15.6, z: 2 },
  kabuto: { m: 'wear_kabuto', w: 24, y: 9.6, z: 2.2 },
  flowerclip: { m: 'wear_flowerclip', w: 4.5, cy: 12.2, x: 6.6, z: 5.6, ry: 1.2 },
  kagami: { m: 'wear_kagami', w: 11, y: 15.4, z: 2 },
  propeller3: { m: 'wear_propeller3', w: 17, y: 10, z: 2.3 },
  // glasses and things on the face (eyes: y relative to the eye line; zf = the front of the frames)
  round: { m: 'wear_round', w: 15.4, cy: 0, zf: 12 },
  frames: { m: 'wear_frames', w: 15.6, cy: 0, zf: 12 },
  aviator: { m: 'wear_aviator', w: 15.8, cy: -0.2, zf: 12 },
  shades: { m: 'wear_shades', w: 15.8, cy: 0, zf: 12 },
  heart: { m: 'wear_heartpink', w: 16, cy: 0.2, zf: 12 },
  goggles: { m: 'wear_goggles', w: 17.6, cy: 0.3, zf: 13.4 },
  stars: { m: 'wear_stars', w: 17, cy: 0.2, zf: 12 },
  groucho: { m: 'wear_groucho', w: 15, cy: -1.4, zf: 12.6 },
  glasses3d: { m: 'wear_3d', w: 15.4, cy: 0, zf: 12 },
  monocle: { m: 'wear_monocle', w: 9, cy: -1.5, x: -2.6, zf: 12, rx: -Math.PI / 2 }, // (the model lies flat)
  eyepatch: { m: 'wear_eyepatch', w: 16.4, cy: 0.4, zf: 11.9 },
  facemask: { m: 'wear_facemask', w: 12.5, cy: -3.2, zf: 12.4 },
  // festival masks: on the side of the head (wear.js 'side'), or over the face
  kitsune: { m: 'wear_kitsune', w: 11, cy: 0, zb: 0 },
  kitsune2: { m: 'wear_kitsune2', w: 11, cy: 0, zb: 0 },
  usagi: { m: 'wear_usagi_mask', w: 11, cy: 0, zb: 0 },
  frogmask: { m: 'wear_frog_mask', w: 11, cy: 0, zb: 0 },
  oni2: { m: 'wear_onimask2', w: 11.5, cy: 0, zb: 0 },
  oni3: { m: 'wear_onimask3', w: 11.5, cy: 0, zb: 0 },
  // round the neck / on the back (metres, for a 1.7 m wearer)
  neckerchief: { m: 'wear_neckerchief', w: 0.24, lift: 0.025, z: 0.02 },
  backpack: { m: 'wear_backpack', h: 0.42, ry: Math.PI },
  satchel: { m: 'wear_satchel', h: 0.4, ry: Math.PI },
  rucksack: { m: 'wear_rucksack', h: 0.46, ry: Math.PI },
  teddyPack: { m: 'teddy', h: 0.32, ry: Math.PI },
  robotPack: { m: 'toy_robot', h: 0.3, ry: Math.PI },
};
F.octopus2 = { m: 'wear_octopus2', w: 14, y: 15.2, z: 2 };
F.moto2 = { m: 'wear_moto2', w: 22, y: -3.6, z: 2.6 };
F.astro2 = { m: 'wear_astro2', w: 25, y: -7.5, z: 2.4 };
F.propeller2 = { m: 'wear_propeller2', w: 17, y: 10, z: 2.3 };
F.paperbag2 = { m: 'wear_paperbag2', w: 19, y: -5.5, z: 2.4 };
const hat = (k, cover = true) => ({ cover, ...wearItem(cover ? 'head' : 'crown', F[k]) });
const crown = (k) => wearItem('crown', F[k]);
const eyes = (k) => wearItem('eyes', F[k]);
const side = (k) => wearItem('side', F[k]);
const back = (k) => wearItem('back', F[k]);
const neck = (k) => wearItem('neck', F[k]);

// ------------------------------------------------------------------ the old voxel pieces, redrawn (same ids)
// (name / desc only change where the new model is a different thing)
const RESTYLE = {
  // src/people/cosmetics.js (the first wardrobe)
  chicken: { ...crown('rubberchicken'), name: 'Rubber Chicken', desc: 'It squeaks when you nod. She has opinions.' },
  shark: { ...crown('shark'), cover: false, name: 'Shark Plush Hat', desc: 'A plush shark, mid-bite. Looks great doing it.' },
  frog: { ...crown('frog'), cover: false, name: 'Kero Frog Plush', desc: 'A soft green frog riding on your head. Ribbit.' },
  bear: { ...crown('teddy'), cover: false, name: 'Teddy on Top', desc: 'A worn old teddy, sitting on your head for cold evenings.' },
  cone: { ...hat('cone'), desc: 'Found it by the road. Totally official.' },
  party: crown('party'),
  bow: crown('bow'),
  nigiri: crown('nigiri'),
  shades: eyes('shades'),
  stars: eyes('stars'),
  groucho: eyes('groucho'),
  kitsune: side('kitsune'),
  // src/cosmetics/catalog.js
  cx_strawhat: hat('strawhat'),
  cx_beret: hat('beret'),
  cx_onigiri: crown('onigiri'),
  cx_explorer: hat('pith'),
  cx_crown: crown('crown'),
  cx_kappa: { ...crown('kappaDish'), desc: 'A glazed dish for the top of your head. Keep the water in it. Bow carefully.' },
  cx_shrub: { ...crown('bonsai'), cover: false, name: 'Bonsai Hat', desc: "Mr. Yabuki's spare bonsai. You are the neighbourhood watch now." },
  cx_sprout: { ...crown('sprout'), name: 'Little Aloe', desc: 'A potted aloe riding on your head. Water daily. Talk to it.' },
  cx_yurei: hat('sweatband', false),
  cx_tiehead: { ...hat('sweatband', false), name: 'Party Headband', desc: 'A towel band round the head, worn after the third beer.' },
  cx_kasa: { ...crown('wagasa'), name: 'Wagasa Parasol Hat', desc: 'An oiled-paper parasol that decided to live on your head. Kasa-obake approves.' },
  cx_paperbag: { ...hat('paperbag'), cover: true },
  cx_catears: crown('catears'),
  cx_towel: crown('towel'),
  cx_octopus: crown('octopus'),
  cx_conductor: hat('peaked'),
  cx_ranger: { ...hat('moto'), name: 'Ranger Helmet', desc: 'A proper motorcycle helmet. Red is the leader. Obviously.' },
  cx_astro: hat('astro2'),
  cx_propeller: hat('propeller'),
  cx_beanie: { ...hat('beaniePom'), name: 'Nordic Bobble Beanie', desc: 'Chunky knit with a zig-zag band and a fluffy pompom.' },
  cx_chef: hat('chef'),
  cx_ballcap: { ...hat('cap'), name: 'Lane Trucker Cap', desc: 'A mesh-back cap from the batting centre.' },
  cx_bucket: hat('bucket'),
  cx_flatcap: hat('flatcap2'),
  cx_sunhat: { ...hat('boater'), name: 'Summer Boater', desc: 'Stiff straw, black silk band, cicadas in the background.' },
  cx_mask: eyes('facemask'),
  cx_roundspecs: eyes('round'),
  cx_aviators: eyes('aviator'),
  cx_heart: eyes('heart'),
  cx_3d: eyes('glasses3d'),
  cx_monocle: eyes('monocle'),
  cx_eyepatch: eyes('eyepatch'),
  cx_swirl: { ...eyes('frames'), name: 'Thick Nerd Frames', desc: "Gonta's prank glasses. Heavy black plastic. You look very clever." },
  cx_yenshades: { ...eyes('goggles'), name: 'Brass Goggles', desc: 'You emptied a lot of coin boxes. You bought these with the change.' },
  cx_hyottoko: { ...side('frogmask'), name: 'Frog Festival Mask', desc: 'A grinning frog face from the festival stalls, worn on the side of the head.' },
  cx_onimask: side('oni2'),
  cx_capsulepack: { ...back('robotPack'), name: 'Tin Robot Pack', desc: 'A big wind-up tin robot riding piggy-back. Something rattles inside.' },
  cx_teddypack: back('teddyPack'),
  cx_backpack: { ...back('backpack'), name: 'Hiking Backpack', desc: 'Room for capsules. Lots of capsules.' },
  // src/cosmetics/more.js (the 1999 closet)
  cx_duck: { ...crown('duck'), cover: false, name: 'Duck Plush Hat', desc: 'A round little duck that sits on your head and judges.' },
  cx_hachimaki: hat('sweatband', false),
  cx_fishhat: hat('boonie'),
  cx_furoshiki: { ...back('rucksack'), name: "Kappa's Rucksack", desc: 'A canvas army pack, full of cucumbers. Smells of the river.' },
  cx_kabuto: { ...hat('kabuto'), name: 'Samurai Kabuto', desc: "A lacquered helmet for Children's Day. Stand up straight." },
  cx_sakuraclip: { ...crown('flowerclip'), name: 'Flower Hair Clip', desc: 'One big blossom, clipped on for hanami season.' },
  cx_kagami: crown('kagami'),
  cx_santa: { ...crown('kokeshi'), name: 'Kokeshi Topper', desc: 'A little wooden kokeshi doll, balanced just so.' },
  cx_daruma: { ...crown('daruma'), cover: false, name: 'Daruma Topper', desc: 'A red daruma riding on your head. One eye painted in, for luck.' },
  cx_capsulehat: { ...crown('robot'), cover: false, name: 'Tin Robot Topper', desc: 'A wind-up robot standing guard on your head.' },
  cx_visor: { ...hat('hardhat'), name: 'Safety Helmet', desc: 'Hard hat from the building site down the lane.' },
  cx_hardhat: hat('hardhat'),
  cx_gariben: { ...eyes('round'), name: 'Wire Round Specs', desc: 'The swot\'s glasses, blue-tinted.' },
  cx_kafun: eyes('facemask'),
  cx_wrapshades: eyes('shades'),
  cx_tengu: { ...side('oni3'), name: 'Red Oni Mask', desc: 'Scary at the front, fun at the side.' },
  cx_okame: side('usagi'),
  cx_kurogitsune: side('kitsune2'),
  cx_heromask: { ...side('frogmask'), name: 'Frog Hero Mask', desc: 'A bootleg festival-stall hero: a frog in goggles. Worn on the side.' },
  cx_blackmask: { ...eyes('facemask'), desc: 'A black mask and a hard stare. Nobody cuts the queue.' },
};

/** The new pieces (closet, web shop): imported models, priced and ranked like the rest. */
export const WEAR_NEW = [
  { id: 'cw_newsboy', slot: 'hat', name: 'Grey Newsboy Cap', price: 900, rarity: 'common', shop: true, desc: 'Eight panels of grey tweed and a button on top.', ...hat('flatcap') },
  { id: 'cw_beanie', slot: 'hat', name: 'Grey Knit Beanie', price: 700, rarity: 'common', shop: true, desc: 'Soft rib knit for cold mornings at the garage.', ...hat('beanie') },
  { id: 'cw_boonie', slot: 'hat', name: 'Camo Boonie', price: 1100, rarity: 'uncommon', web: true, desc: 'Floppy brim, camouflage print, a chin cord you never use.', ...hat('boonie') },
  { id: 'cw_strawhat', slot: 'hat', name: 'Rice-field Straw Hat', price: 1200, rarity: 'common', shop: true, desc: 'Wide woven brim with an orange band. Shade for the whole lane.', ...hat('strawhat') },
  { id: 'cw_sailor', slot: 'hat', name: "Captain's Cap", price: 1600, rarity: 'uncommon', web: true, desc: 'White top, black band, gold braid. Ferry to Awaji, anyone?', ...hat('sailor') },
  { id: 'cw_tophat', slot: 'hat', name: 'Silk Top Hat', price: 2400, rarity: 'rare', web: true, desc: 'For very formal capsule openings.', ...hat('tophat') },
  { id: 'cw_tophat2', slot: 'hat', name: 'Magician\'s Top Hat', price: 2600, rarity: 'rare', web: true, desc: 'No rabbit inside. We checked.', ...hat('tophat2') },
  { id: 'cw_cowboy', slot: 'hat', name: 'Leather Cowboy Hat', price: 2200, rarity: 'uncommon', web: true, desc: 'Worn brim, hatband, a long way from Texas.', ...hat('cowboy') },
  { id: 'cw_cowboy2', slot: 'hat', name: 'Ranch Hat', price: 1900, rarity: 'uncommon', shop: true, desc: 'Pale felt with a pinched crown.', ...hat('cowboy2') },
  { id: 'cw_fedora', slot: 'hat', name: 'Brown Fedora', price: 2000, rarity: 'uncommon', shop: true, desc: 'Grosgrain band, pinched crown. Like the old man at Mikawa-ya.', ...hat('fedora') },
  { id: 'cw_fedora2', slot: 'hat', name: 'Charcoal Fedora', price: 2000, rarity: 'uncommon', web: true, desc: 'Dark felt for detective work.', ...hat('fedora2') },
  { id: 'cw_fedora3', slot: 'hat', name: 'Tan Fedora', price: 1800, rarity: 'common', web: true, desc: 'A Sunday hat for the shotengai.', ...hat('fedora3') },
  { id: 'cw_trilby', slot: 'hat', name: 'Linen Trilby', price: 1700, rarity: 'common', shop: true, desc: 'Short brim, summer linen, very Showa salaryman on holiday.', ...hat('trilby') },
  { id: 'cw_chef2', slot: 'hat', name: 'Pleated Toque', price: 1200, rarity: 'uncommon', web: true, desc: 'A hundred pleats, a hundred ways to boil an egg.', ...hat('chef2') },
  { id: 'cw_reindeer', slot: 'hat', name: 'Reindeer Antlers', price: 600, rarity: 'common', web: true, desc: 'A headband for the Christmas cake queue.', ...crown('reindeer') },
  { id: 'cw_catears', slot: 'hat', name: 'Fluffy Cat Ears', price: 800, rarity: 'uncommon', web: true, desc: 'Big soft ears on a hidden band.', ...crown('catears2') },
  { id: 'cw_octopus2', slot: 'hat', name: 'Pink Octopus Plush', price: 1000, rarity: 'uncommon', web: true, desc: 'Eight soft arms round your head.', ...crown('octopus2') },
  { id: 'cw_woodchicken', slot: 'hat', name: 'Pecking Hen Toy', price: 900, rarity: 'uncommon', web: true, desc: 'A wooden hen from the toy shop. Peck, peck.', ...crown('woodchicken') },
  { id: 'cw_moto2', slot: 'hat', name: 'Vintage Bike Helmet', price: 2800, rarity: 'rare', web: true, desc: 'Open face, leather trim, goggles not included.', ...hat('moto2') },
  { id: 'cw_propeller2', slot: 'hat', name: 'Whirly Cap', price: 1300, rarity: 'uncommon', web: true, desc: 'A propeller cap in primary colours.', ...hat('propeller2') },
  { id: 'cw_propeller3', slot: 'hat', name: 'Rainbow Whirly Cap', price: 1300, rarity: 'uncommon', shop: true, desc: 'Red, yellow, blue and a little propeller.', ...hat('propeller3') },
  { id: 'cw_headphones', slot: 'hat', name: 'Studio Headphones', price: 2600, rarity: 'uncommon', web: true, desc: 'Closed back, coiled cable, your own private city pop.', ...crown('headphones') },
  { id: 'cw_paperbag2', slot: 'hat', name: 'Lunch Sack', price: 100, rarity: 'common', web: true, desc: 'Brown paper, two eye holes. Nobody knows it is you.', ...hat('paperbag2') },
  { id: 'cw_frames', slot: 'face', name: 'Horn-rim Glasses', price: 900, rarity: 'common', shop: true, desc: 'Thick black frames from the optician by the station.', ...eyes('frames') },
  { id: 'cw_goggles', slot: 'face', name: 'Brass Steampunk Goggles', price: 2400, rarity: 'rare', web: true, desc: 'Leather strap, riveted brass, tinted lenses.', ...eyes('goggles') },
  { id: 'cw_aviator2', slot: 'face', name: 'Gold Aviators', price: 1400, rarity: 'uncommon', web: true, desc: 'Thin gold wire and green lenses.', ...eyes('aviator') },
  { id: 'cw_neckerchief', slot: 'bag', name: 'Red Neckerchief', price: 700, rarity: 'common', shop: true, desc: 'A red scarf knotted at the throat. Scout\'s honour.', ...neck('neckerchief') },
  { id: 'cw_satchel', slot: 'bag', name: 'Leather Rucksack', price: 2400, rarity: 'uncommon', web: true, desc: 'Brass buckles, a rolled blanket, room for a bento.', ...back('satchel') },
  { id: 'cw_rucksack', slot: 'bag', name: 'Canvas Rucksack', price: 1600, rarity: 'common', shop: true, desc: 'An old army-surplus pack from the junk market.', ...back('rucksack') },
];

/** Restyle the existing entries in place (keeps ids, prices, how you get them). */
export function applyWear(list, byId) {
  for (const [id, r] of Object.entries(RESTYLE)) {
    const c = byId[id];
    if (!c) continue;
    delete c.spec; // (a painted hat / glasses: the model replaces it)
    Object.assign(c, r);
  }
  // the models load in the background now, so thumbnails and the mirror have them when first asked
  const ids = new Set();
  for (const c of list) for (const m of c.wear || []) ids.add(m);
  for (const c of WEAR_NEW) for (const m of c.wear || []) ids.add(m);
  if (typeof document !== 'undefined') preloadAssets([...ids]);
}
