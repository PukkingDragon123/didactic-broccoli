// The bigger wardrobe: hats, glasses and masks, outfits and jackets, photo-print tees, bags and shoes, registered into
// the cosmetics catalogue (src/people/cosmetics.js) at import time so every avatar (menu, first person, multiplayer)
// knows them. Each entry also says how you get it:
//   shop: true          the closet (main menu / the mirror in your room), for yen
//   web: true           Kirakira Closet, the fashion web shop in Capsule Navigator (delivered by Gen-san)
//   ach: 'id'           an achievement's reward (src/style/achievements.js)
//   quest: 'id'         a lane side quest's reward (src/cosmetics/rewards.js)
//   capsule: 'series'   a rare bonus inside that gacha series' capsules (src/cosmetics/capsules.js)
//   level: n            (with shop) the closet only stocks it from shop level n (game.progress.level)
//   secondhand: true    only ever found second-hand at Off-Hobby, the junk market (src/market)
//   itch: true          free for following the game on itch.io (src/cosmetics/itch.js)
// rarity: common | uncommon | rare | ultra | secret (the gacha's tiers and colours, src/data/rarity.js).
// Painted pieces use spec(spec, look) (hats, glasses, tops, bags, shoes the low-poly body already has); modelled pieces use
// dress(ctx) + preview(add, group, lift) with the models in src/cosmetics/voxels.js (src/peoplekit). Photo prints: src/cosmetics/prints.js.
import { COSMETICS, COSMETIC_BY_ID, MODELS } from '../people/cosmetics.js';
import { kigurumi, rainHood as rainHoodGeo } from '../peoplekit/bags.js';
import { hex } from '../people/paintlib.js';
import { defineIcon } from '../gfx/icons.js';
import { VX } from './voxels.js';
import { registerPrint, printOf } from './prints.js';
import { moreCosmetics } from './more.js';

// ------------------------------------------------------------------ placement helpers (head units, see voxels.js)
const onCrown = (key, build, pos = [0, 0, 0], rot = [0, 0, 0]) => ({
  dress: (c) => { const g = c.add(c.crown, key, build); g.position.set(...pos); g.rotation.set(...rot); return g; },
  preview: (add, g, lift) => add(key, build, [pos[0], pos[1] + lift, pos[2]], rot),
});
const onHead = (key, build) => ({ dress: (c) => c.add(c.head, key, build), preview: (add) => add(key, build) });
const onEyes = (key, build) => ({
  dress: (c) => { const g = c.add(c.eyes, key, build); g.position.z = c.hoodOn || c.hat?.cover ? 0.6 : 0; return g; },
  preview: (add) => add(key, build, [0, 6, 0]),
});
const sideMask = (key, build) => ({
  dress: (c) => {
    const off = c.hoodOn || c.hat?.cover;
    const k = c.add(c.head, key, build);
    k.position.set(off ? 9.6 : 7.4, 10.5, 1.2); k.rotation.set(-0.15, 1.2, 0.32);
    if (!off) c.add(c.head, 'cx_maskcord', maskCord);
  },
  preview: (add) => { add(key, build, [7.4, 10.5, 1.2], [-0.15, 1.2, 0.32]); add('cx_maskcord', maskCord); },
});
function maskCord() {
  // a thin red cord around the head (the kitsune mask's), shared by the festival masks
  return MODELS.cord();
}
const both = (...parts) => ({ dress: (c) => parts.forEach((p) => p.dress(c)), preview: (add, g, lift) => parts.forEach((p) => p.preview(add, g, lift)) });

// ------------------------------------------------------------------ painted pieces
const BAG_KINDS = ['backpack', 'randoseru', 'shoulderbag', 'tote', 'camera', 'ecobag', 'handbag', 'briefcase', 'pouch'];
const bag = (a) => ({ spec: (s) => { s.acc = s.acc.filter((x) => !BAG_KINDS.includes(x.kind)); s.acc.push({ ...a, col: hex(a.col) }); } });
const shoe = (k, col, col2, socks) => ({ spec: (s) => { s.shoes = { kind: k, col: hex(col), ...(col2 != null ? { col2: hex(col2) } : {}) }; if (socks) { s.socks = { col: socks }; if (s.legs === 'skin') s.legs = 'socks'; } } });
const pHat = (kind, col, col2) => ({ spec: (s) => { s.hat = { kind, col: hex(col), ...(col2 != null ? { col2: hex(col2) } : {}) }; } });
const pGlasses = (kind, col, thick = 1) => ({ spec: (s) => { s.glasses = { kind, col, thick }; } });
const top = (t, bottom = null, extra = null) => ({
  spec: (s) => {
    const T = { ...t };
    for (const k of ['col', 'col2', 'col3', 'shirt', 'tie', 'collar', 'scarf', 'band', 'vest']) if (typeof T[k] === 'number') T[k] = hex(T[k]);
    s.top = T;
    if (bottom) s.bottom = { ...bottom, col: hex(bottom.col) };
    extra?.(s);
  },
});
const onesie = (col, col2, spots, spotOpts = {}) => ({
  spec: (s) => {
    s.top = { kind: 'onesie', col: hex(col), col2: col2 != null ? hex(col2) : null, spots: spots != null ? hex(spots) : null, spotK: spotOpts.k ?? 0.8, spotF: spotOpts.f ?? 30, spotT: spotOpts.t ?? 0.72 };
    s.bottom = { kind: 'slacks', col: hex(col), noCrease: true };
    s.legs = 'skin'; s.socks = null;
    s.shoes = { kind: 'comfort', col: hex(spotOpts.feet ?? col) };
    s.acc = s.acc.filter((a) => a.kind === 'camera' || BAG_KINDS.includes(a.kind));
  },
});
/** A kigurumi hood in the onesie's colours with ears and the animal's face (head units; src/peoplekit/bags.js). */
function animalHood(key, o) {
  return {
    dress: (c) => { if (c.hoodOn) { c.add(c.head, key, () => kigurumi(key, o)); } },
    preview: (add) => add(key, () => kigurumi(key, o)),
  };
}

// ------------------------------------------------------------------ pieces that need per-human fitting
/** A backpack on the chest bone, sized in metric units (V = H / 140). */
const voxBag = (key, build, k = 1) => ({
  dress: (c) => {
    const V = c.P.H / 140 * k;
    const g = c.add(c.b.chest, key, build);
    g.scale.setScalar(V);
    g.position.set(0, c.P.bustY - c.J.chest[1] - 0.02, -c.P.chestZ - 0.004);
    c.rig.parts.push(g);
  },
  preview: (add) => { const m = add(key, build, [0, 6, -10]); m.scale.setScalar(0.75); },
  thumb: 'back',
});
/** The pompadour, in the wearer's own hair colour. */
const pompadour = {
  dress: (c) => { const col = c.spec.hair?.col ? (c.spec.hair.col[0] << 16) | (c.spec.hair.col[1] << 8) | c.spec.hair.col[2] : 0x2a2428; c.add(c.head, 'cx_pomp' + col, () => VX.pompadour(col)); },
  preview: (add) => add('cx_pomp', () => VX.pompadour(0x2a2428)),
};
/** Pigeon on your head: bobs its head, looks around. */
const pigeon = {
  dress: (c) => {
    c.add(c.crown, 'cx_pigeonBody', VX.pigeonBody);
    const hd = c.add(c.crown, 'cx_pigeonHead', VX.pigeonHead, [0, 23, 4]);
    const st = { t: 0.5, yaw: 0, yawT: 0, bob: 0 };
    c.rig.anims.push({ kind: 'fn', fn: (dt, rig) => {
      st.t -= dt;
      if (st.t < 0) { st.t = 0.6 + Math.random() * 2; st.yawT = (Math.random() * 2 - 1) * 0.8; }
      st.yaw += (st.yawT - st.yaw) * Math.min(1, dt * 18);
      const W = rig.h.walkW || 0;
      st.bob = W > 0.1 ? Math.sin(rig.h.phase * Math.PI * 4) : Math.sin(rig.t * 1.3) * 0.15;
      hd.position.z = 4 + st.bob * 1.4;
      hd.rotation.set(0, st.yaw, 0);
    } });
  },
  preview: (add, g, lift) => { add('cx_pigeonBody', VX.pigeonBody, [0, lift, 0]); add('cx_pigeonHead', VX.pigeonHead, [0, lift, 0]); },
};
/** Propeller beanie: the blades spin faster when you walk. */
const propeller = {
  dress: (c) => {
    c.add(c.head, 'cx_propCap', VX.propCap);
    const p = c.add(c.head, 'cx_propBlade', VX.propBlade);
    p.position.set(0, 22, 2);
    c.rig.anims.push({ kind: 'fn', fn: (dt, rig) => { p.rotation.y += dt * (3 + (rig.h.walkW || 0) * 14); } });
  },
  preview: (add) => { add('cx_propCap', VX.propCap); add('cx_propBlade', VX.propBlade, [0, 22, 2], [0, 0.5, 0]); },
};
/** Chef / ramen whites: shirt, apron, a twisted towel round the head when no hat is on. */
const ramenChef = {
  ...top({ kind: 'shirt', col: 0xf4f2ec, sleeve: 'short' }, { kind: 'slacks', col: 0x2a2a30, noCrease: true }, (s) => { s.acc = s.acc.filter((a) => a.kind !== 'apron'); s.acc.push({ kind: 'apron', col: hex(0x24304a), col2: [236, 232, 220] }); }),
  dress: (c) => { if (!c.hat) c.add(c.head, 'cx_towelBand', towelBand); },
};
const towelBand = () => VX.towelBand();
const rainHood = {
  dress: (c) => { if (c.hoodOn) c.add(c.head, 'cx_rainhood', rainHoodModel); },
};
const rainHoodModel = () => rainHoodGeo();

// ------------------------------------------------------------------ the catalogue
const P = (photo, o = {}) => ({ photo, ...o });
const TEE = (id, name, photo, col, o = {}) => ({
  id, slot: 'outfit', name, price: o.price ?? 1600, rarity: o.rarity ?? 'uncommon', web: true, photoTee: true,
  desc: o.desc ?? 'A big pixel photo print, screen-printed by a guy in Koenji.', print: P(photo, o.print),
  spec(s) { const pr = printOf(id); s.top = { kind: o.knit ? 'knit' : 'tee', col: hex(col), col2: hex(0xf2f0ea), print: pr ? 'pix' : 'none', pix: pr, pixS: o.knit ? 1.15 : 1.3, pixY: -0.006, sleeve: o.knit ? 'long' : 'short' }; },
});

export const EXTRA = [
  // ================================================================== hats
  { id: 'cx_strawhat', slot: 'hat', name: 'Straw Hat', price: 1500, rarity: 'rare', quest: 'crew', desc: 'A captain lent it to you. Do not lose it. He will know.', ...onCrown('cx_strawhat', VX.strawhat, [0, -0.6, 0]) },
  { id: 'cx_beret', slot: 'hat', name: "Mangaka's Beret", price: 900, rarity: 'rare', quest: 'rohan_ref', desc: 'Smells of ink. Makes you want to draw everything.', ...onCrown('cx_beret', VX.beret, [0, -0.8, 0], [0, 0, -0.08]) },
  { id: 'cx_kappa', slot: 'hat', name: 'Kappa Dish', price: 1100, rarity: 'rare', quest: 'yokai_hunt', desc: 'Keep the water in the dish full. Bow carefully.', ...onCrown('cx_kappa', VX.kappa, [0, 1.6, 0]) },
  { id: 'cx_onigiri', slot: 'hat', name: 'Onigiri Hat', price: 700, rarity: 'uncommon', quest: 'snacks', desc: 'Okuyasu keeps looking at it. Hungrily.', ...onCrown('cx_onigiri', VX.onigiri, [0, -0.5, 1.6], [-0.06, 0, 0]) },
  { id: 'cx_pigeon', slot: 'hat', name: 'Pigeon Pal', price: 1200, rarity: 'rare', quest: 'poppo', desc: "Poppo's cousin. Bobs along when you walk. Probably house-trained.", ...pigeon },
  { id: 'cx_curlers', slot: 'hat', name: 'Hair Curlers', price: 500, rarity: 'uncommon', quest: 'ota_prank', desc: "Mrs. Ota's spare set. For when you can't be bothered.", ...onCrown('cx_curlers', VX.curlers, [0, 0.8, 0]) },
  { id: 'cx_shrub', slot: 'hat', name: 'Shrubbery', price: 900, rarity: 'rare', quest: 'cucumber', cover: true, desc: "Mr. Yabuki's spare bush. You are the neighbourhood watch now.", ...onHead('cx_shrub', VX.shrub) },
  { id: 'cx_explorer', slot: 'hat', name: 'Field Helmet', price: 1000, rarity: 'uncommon', quest: 'flora', desc: 'For surveying the lane flora. And the lane fauna (pigeons).', ...onCrown('cx_explorer', VX.explorer, [0, -0.8, 0]) },
  { id: 'cx_crown', slot: 'hat', name: 'Gacha King Crown', price: 9999, rarity: 'secret', ach: 'sim_level_20', desc: 'Shop level 20. The lane bows to you. (Mikan does not.)', ...onCrown('cx_crown', VX.crown, [0, -0.6, 0]) },
  { id: 'cx_yurei', slot: 'hat', name: 'Ghost Headband', price: 1200, rarity: 'rare', ach: 'fun_ghost3', desc: 'The white triangle of the departed. You looked back three times.', ...onHead('cx_yurei', VX.yurei) },
  { id: 'cx_tiehead', slot: 'hat', name: 'Necktie Headband', price: 800, rarity: 'rare', ach: 'fun_drunk_ramen', desc: 'The salaryman\'s crown, worn after the third beer.', ...onHead('cx_tiehead', VX.tiehead) },
  { id: 'cx_pompadour', slot: 'hat', name: 'Legendary Pompadour', price: 3000, rarity: 'ultra', ach: 'fun_hair', cover: true, desc: 'You touched the hair. Now you ARE the hair.', ...pompadour },
  { id: 'cx_kasa', slot: 'hat', name: 'Kasa-obake', price: 1600, rarity: 'rare', ach: 'life_yokai', desc: 'A one-eyed umbrella yokai that decided to live on your head.', ...onCrown('cx_kasa', VX.kasa, [0, -1.2, 0]) },
  { id: 'cx_paperbag', slot: 'hat', name: 'Paper Bag of Shame', price: 100, rarity: 'uncommon', ach: 'fun_rent_late', cover: true, desc: 'For when the landlady is looking for you.', ...onHead('cx_paperbag', VX.paperbag) },
  { id: 'cx_oni', slot: 'hat', name: 'Oni Horns', price: 1300, rarity: 'rare', capsule: 'yokai', desc: 'Setsubun horns on a tiger-stripe band. Beans not included.', ...both(onHead('cx_oniBand', VX.oniBand), onCrown('cx_oniHorns', VX.oniHorns, [0, -1, 0])) },
  { id: 'cx_catears', slot: 'hat', name: 'Cat Ears', price: 900, rarity: 'rare', capsule: 'neko_cafe', desc: 'Nya. Mikan is not impressed.', ...onCrown('cx_catears', VX.catears, [0, -0.8, 0]) },
  { id: 'cx_towel', slot: 'hat', name: 'Onsen Towel', price: 600, rarity: 'rare', capsule: 'onsen', desc: 'Folded just so. Ahh, that\'s the stuff.', ...onCrown('cx_towel', VX.towel, [0, 0.2, 0]) },
  { id: 'cx_octopus', slot: 'hat', name: 'Tako Hat', price: 1100, rarity: 'rare', capsule: 'umi', desc: 'Eight arms, one very good hug.', ...onCrown('cx_octopus', VX.octopus, [0, -0.8, 0]) },
  { id: 'cx_conductor', slot: 'hat', name: "Conductor's Cap", price: 1200, rarity: 'rare', capsule: 'densha', desc: 'Departing platform 2. Please stand behind the yellow line.', ...onCrown('cx_conductor', VX.conductor, [0, -1, 0]) },
  { id: 'cx_ranger', slot: 'hat', name: 'Ranger Helmet', price: 2200, rarity: 'ultra', capsule: 'sentai', cover: true, desc: 'Red is the leader. Obviously.', ...onHead('cx_ranger', VX.ranger) },
  { id: 'cx_astro', slot: 'hat', name: 'Space Helmet', price: 2400, rarity: 'ultra', capsule: 'uchu', cover: true, desc: 'One small step for the lane.', ...onHead('cx_astro', VX.astro) },
  { id: 'cx_propeller', slot: 'hat', name: 'Propeller Beanie', price: 1400, rarity: 'uncommon', web: true, cover: true, desc: 'Spins faster the faster you walk. Lift-off not guaranteed.', ...propeller },
  { id: 'cx_beanie', slot: 'hat', name: 'Mustard Beanie', price: 900, rarity: 'common', web: true, cover: true, desc: 'Chunky knit with a fluffy pompom.', ...onHead('cx_beanie', VX.beanie) },
  { id: 'cx_chef', slot: 'hat', name: 'Chef Toque', price: 1100, rarity: 'uncommon', web: true, cover: true, desc: 'Tall, pleated, very serious about broth.', ...onHead('cx_chef', VX.chef) },
  { id: 'cx_sprout', slot: 'hat', name: 'Little Sprout', price: 400, rarity: 'common', web: true, desc: 'Water daily. Talk to it.', ...onCrown('cx_sprout', VX.sprout, [0, -0.5, 0]) },
  { id: 'cx_ballcap', slot: 'hat', name: 'Lane Ball Cap', price: 600, rarity: 'common', shop: true, desc: 'A red cap from the batting centre.', ...pHat('cap', 0xc8302a, 0xf2f0ea) },
  { id: 'cx_bucket', slot: 'hat', name: 'Bucket Hat', price: 700, rarity: 'common', shop: true, desc: 'Fishing, festivals, bad hair days.', ...pHat('bucket', 0x6a7a5a) },
  { id: 'cx_flatcap', slot: 'hat', name: "Grandpa's Flat Cap", price: 800, rarity: 'common', shop: true, desc: 'Still smells of his pipe tobacco.', ...pHat('flatcap', 0x6a5a48) },
  { id: 'cx_sunhat', slot: 'hat', name: 'Summer Sun Hat', price: 900, rarity: 'common', shop: true, desc: 'Wide brim, ribbon band, cicadas in the background.', ...pHat('sunhat', 0xe8d4a0, 0x3a5aa0) },

  // ================================================================== face
  { id: 'cx_mask', slot: 'face', name: 'Face Mask', price: 200, rarity: 'common', shop: true, desc: 'Pollen season survival gear.', ...onEyes('cx_mask', VX.maskSurgical) },
  { id: 'cx_roundspecs', slot: 'face', name: 'Round Specs', price: 600, rarity: 'common', shop: true, desc: 'Wire-rim spectacles from the old optician.', ...pGlasses('round', [70, 50, 34], 1.2) },
  { id: 'cx_aviators', slot: 'face', name: 'Aviators', price: 800, rarity: 'common', shop: true, desc: 'Mirrored. Very 1985.', ...pGlasses('sun', [30, 28, 32], 1.3) },
  { id: 'cx_heart', slot: 'face', name: 'Heart Glasses', price: 700, rarity: 'uncommon', web: true, desc: 'Everything looks a bit lovelier.', ...onEyes('cx_heart', VX.heartglasses) },
  { id: 'cx_3d', slot: 'face', name: '3D Glasses', price: 400, rarity: 'common', web: true, desc: 'From the monster movie double feature.', ...onEyes('cx_3d', VX.glasses3d) },
  { id: 'cx_monocle', slot: 'face', name: 'Gold Monocle', price: 2500, rarity: 'rare', web: true, desc: 'For inspecting rare pulls. Indubitably.', ...onEyes('cx_monocle', VX.monocle) },
  { id: 'cx_eyepatch', slot: 'face', name: 'Eye of the Ninth Shadow', price: 900, rarity: 'rare', quest: 'relic', desc: 'Lord Kuromaru says it seals your dark power. It is an eyepatch.', ...onEyes('cx_eyepatch', VX.eyepatch) },
  { id: 'cx_swirl', slot: 'face', name: 'Swirly Specs', price: 600, rarity: 'uncommon', quest: 'pinpon', desc: "Gonta's prank glasses. You can't see a thing. Perfect.", ...onEyes('cx_swirl', VX.swirl) },
  { id: 'cx_yenshades', slot: 'face', name: 'Yen Shades', price: 2000, rarity: 'rare', ach: 'life_coins', desc: 'You emptied a lot of coin boxes. It shows.', ...onEyes('cx_yenshades', VX.yenshades) },
  { id: 'cx_bandaid', slot: 'face', name: 'Plasters', price: 100, rarity: 'uncommon', ach: 'fun_slaps', desc: 'Slap people, get slapped. It all evens out.', ...onEyes('cx_bandaid', VX.bandaid) },
  { id: 'cx_hyottoko', slot: 'face', name: 'Hyottoko Mask', price: 1000, rarity: 'rare', capsule: 'matsuri', desc: 'The funny festival face, worn on the side of the head.', ...sideMask('cx_hyottoko', VX.hyottoko) },
  { id: 'cx_onimask', slot: 'face', name: 'Oni Mask', price: 1200, rarity: 'rare', capsule: 'obake_yashiki', desc: 'Scary at the front, fun at the side.', ...sideMask('cx_onimask', VX.onimask) },

  // ================================================================== outfits
  { id: 'cx_gakuran', slot: 'outfit', name: 'Delinquent Gakuran', price: 2400, rarity: 'rare', quest: 'bizarre_hero', desc: 'Long jacket, gold buttons, an attitude. Hair sold separately.', ...top({ kind: 'gakuran', col: 0x1e2236 }, { kind: 'slacks', col: 0x1e2236, noCrease: true }) },
  { id: 'cx_sailor', slot: 'outfit', name: 'Sailor Uniform', price: 2200, rarity: 'uncommon', web: true, desc: 'Navy collar, red scarf, pleats.', ...top({ kind: 'sailor', col: 0xf4f4f0, collar: 0x2a3658, stripe: [240, 240, 236], scarf: 0xb02a30, sleeve: 'short' }, { kind: 'skirt', cut: 'pleated', col: 0x2a3658 }, (s) => { s.legs = 'socks'; s.socks = { col: [246, 246, 244] }; }) },
  { id: 'cx_suit', slot: 'outfit', name: 'Salaryman Suit', price: 3000, rarity: 'common', shop: true, desc: 'For bank visits and bowing.', ...top({ kind: 'suit', col: 0x2a2e3a, shirt: 0xf4f4f0, tie: 0x8a2a2a, tieKind: 'stripe' }, { kind: 'slacks', col: 0x2a2e3a }, (s) => { s.shoes = { kind: 'oxford', col: hex(0x1e1a18) }; }) },
  { id: 'cx_track', slot: 'outfit', name: 'Track Jacket', price: 1800, rarity: 'common', web: true, desc: 'Gym class, but make it fashion.', ...top({ kind: 'jacket', col: 0x2a4aa0, shirt: 0xf4f4f0, band: 0xf2f0ea, sleeve: 'long' }) },
  { id: 'cx_raincoat', slot: 'outfit', name: 'Yellow Raincoat', price: 1500, rarity: 'common', shop: true, hood: true, desc: 'For tsuyu, the rainy season. Hood up when you have no hat.', ...top({ kind: 'jacket', col: 0xf4c430, shirt: 0xf4f0e0, sleeve: 'long' }), ...rainHood },
  { id: 'cx_ramenchef', slot: 'outfit', name: 'Ramen Chef Whites', price: 1800, rarity: 'rare', capsule: 'shokudo', desc: 'White shirt, navy apron, towel round the head. Irasshai!', ...ramenChef },
  { id: 'cx_labcoat', slot: 'outfit', name: 'Lab Coat', price: 2000, rarity: 'uncommon', web: true, desc: 'For very scientific capsule research.', ...top({ kind: 'suit', col: 0xf4f4f2, shirt: 0xa8c8e8, tie: 0x2a3a6a }) },
  { id: 'cx_jumpsuit', slot: 'outfit', name: 'Work Jumpsuit', price: 1600, rarity: 'rare', ach: 'life_jobs', desc: 'Ten odd jobs done. Grease stains earned, not bought.', ...top({ kind: 'workjacket', col: 0x3a4a6a, sleeve: 'long' }, { kind: 'cargo', col: 0x3a4a6a }) },
  { id: 'cx_cardigan', slot: 'outfit', name: "Grandpa's Cardigan", price: 1200, rarity: 'common', shop: true, desc: 'Found it in the oshiire. Elbow patches of wisdom.', ...top({ kind: 'cardigan', col: 0x8a6a4a, shirt: 0xf0ece4 }) },
  { id: 'cx_happi_red', slot: 'outfit', name: 'Red Festival Happi', price: 1400, rarity: 'uncommon', web: true, desc: 'The neighbourhood association\'s red coat for the summer matsuri.', ...top({ kind: 'happi', col: 0xb02a2a, col2: 0x1e1e26, col3: 0xf4f0e4, sleeve: 'mid' }) },
  { id: 'cx_sukajan', slot: 'outfit', name: 'Souvenir Jacket', price: 3200, rarity: 'rare', web: true, desc: 'Shiny satin from Yokosuka. There is a tiger on the back (in spirit).', ...top({ kind: 'jacket', col: 0x2a1e3a, shirt: 0x1e1a1e, band: 0xd8a830, sleeve: 'long' }) },
  { id: 'cx_konbini', slot: 'outfit', name: 'Konbini Uniform', price: 1200, rarity: 'rare', capsule: 'konbini', desc: 'Striped and cheerful. Welcome! Points card?', ...top({ kind: 'polo', col: 0x3a8ad0, band: 0xf2f0ea, sleeve: 'short', uniform: true }) },
  { id: 'cx_cow', slot: 'outfit', name: 'Cow Kigurumi', price: 3500, rarity: 'rare', web: true, hood: true, desc: 'Moo. Black patches, pink nose, tiny horns.', ...onesie(0xf6f4ee, null, 0x1e1c22, { f: 9, t: 0.66, k: 1, feet: 0x1e1c22 }), ...animalHood('cx_cowhood', { col: 0xf6f4ee, rim: 0xe6e0d4, ear: 0x1e1c22, earIn: 0xf0a0b0, ears: 'round', paint: (x, y, z, col) => (col === 0xf6f4ee && ((x > 2 && y > 12) || (x < -4 && y < 6 && z < 4)) ? 0x1e1c22 : col), face: (m, { front }) => { for (let x = -3; x <= 3; x++) front(m, x, 13, 0xf0a0b0); front(m, -1, 13, 0x8a4a5a); front(m, 1, 13, 0x8a4a5a); for (const sx of [-1, 1]) { m.set(sx * 3, 21, 4, 0xf4e8c8); m.set(sx * 3, 22, 4, 0xf4e8c8); } } }) },
  { id: 'cx_shiba', slot: 'outfit', name: 'Shiba Kigurumi', price: 3200, rarity: 'rare', shop: true, hood: true, desc: 'Such suit. Very warm. Wow.', ...onesie(0xd8904a, 0xf6ecd8, null, { feet: 0xf6ecd8 }), ...animalHood('cx_shibahood', { col: 0xd8904a, rim: 0xf6ecd8, ears: 'point', earIn: 0xf6ecd8, face: (m, { front, gloss, INK }) => { front(m, 0, 13, gloss(INK)); for (const sx of [-1, 1]) front(m, sx * 4, 15, gloss(INK)); } }) },
  { id: 'cx_calico', slot: 'outfit', name: 'Mikan Kigurumi', price: 4400, rarity: 'ultra', web: true, hood: true, desc: 'Dress as the boss of the garage: a fat calico.', ...onesie(0xf6f0e4, null, 0xd8843a, { f: 10, t: 0.62, k: 1, feet: 0xf6f0e4 }), ...animalHood('cx_calicohood', { col: 0xf6f0e4, rim: 0xe8dcc8, ears: 'point', ear: 0x2a2224, earIn: 0xf0a0b0, paint: (x, y, z, col) => (col === 0xf6f0e4 && y > 13 ? (x > 1 ? 0xd8843a : x < -3 ? 0x2a2224 : col) : col), face: (m, { front, gloss, INK }) => { for (const sx of [-1, 1]) front(m, sx * 4, 15, gloss(0x5a9a3a)); front(m, 0, 13, 0xf08a9a); } }) },
  // big photo prints (Kirakira Closet), from the game's CC-BY photos
  TEE('cx_tee_koi', 'Koi Pond Tee', 'prints/koi_fish', 0xf2f0ea, { rarity: 'rare', price: 2200 }),
  TEE('cx_tee_redpanda', 'Red Panda Tee', 'prints/red_panda', 0xf2f0ea, { price: 1800 }),
  TEE('cx_tee_owl', 'Snowy Owl Tee', 'prints/snowy_owl', 0x2a2a32, { price: 1800 }),
  TEE('cx_tee_rocket', 'Moon Rocket Tee', 'prints/saturn_rocket', 0x1a1c2a, { rarity: 'rare', price: 2400 }),
  TEE('cx_tee_ferris', 'Ferris Wheel Tee', 'prints/ferris_wheel', 0x3a3a58, { price: 1600 }),
  TEE('cx_tee_lanterns', 'Lantern Night Tee', 'prints/lantern_festival', 0x241a1e, { price: 1800 }),
  TEE('cx_tee_sushi', 'Sushi Plate Tee', 'prints/sushi_plate', 0xf2f0ea, { price: 1500, rarity: 'common' }),
  TEE('cx_tee_sunflower', 'Sunflower Tee', 'prints/sunflowers', 0x2a5a8a, { price: 1500, rarity: 'common' }),
  TEE('cx_tee_shibuya', 'Neon Crossing Tee', 'prints/shibuya_night', 0x14141c, { rarity: 'rare', price: 2200 }),
  TEE('cx_tee_fuji', 'Fuji Morning Tee', 'lane/fuji_morning', 0xf2f0ea, { price: 1800 }),
  TEE('cx_tee_shinkansen', 'Bullet Train Tee', 'lane/shinkansen', 0x6aa6dc, { price: 2000 }),
  TEE('cx_tee_shiba', 'Shiba Puppy Tee', 'lane/shiba_puppy', 0xe0a830, { price: 1800, rarity: 'common' }),
  TEE('cx_knit_panda', 'Panda Photo Knit', 'prints/panda', 0x5a8a5a, { knit: true, rarity: 'ultra', price: 3800, desc: 'A chunky knit with a real panda photo, pixel-stitched. Grandma would cry.', print: { w: 16, h: 16, inks: 6 } }),
  TEE('cx_knit_penguin', 'Penguin Photo Knit', 'prints/penguins', 0x2a3a6a, { knit: true, rarity: 'rare', price: 3200, desc: 'Penguins, stitched in eight colours of wool.', print: { w: 16, h: 16, inks: 6 } }),

  // ================================================================== bags
  { id: 'cx_randoseru', slot: 'bag', name: 'Red Randoseru', price: 1800, rarity: 'uncommon', shop: true, desc: 'Six years of school in one leather box.', ...bag({ kind: 'randoseru', col: 0xc02a3a }) },
  { id: 'cx_backpack', slot: 'bag', name: 'Navy Backpack', price: 900, rarity: 'common', shop: true, desc: 'Room for capsules. Lots of capsules.', ...bag({ kind: 'backpack', col: 0x2a3658 }) },
  { id: 'cx_camera', slot: 'bag', name: 'Film Camera', price: 1500, rarity: 'uncommon', shop: true, desc: 'Twenty-four exposures of Mikan sleeping.', ...bag({ kind: 'camera', col: 0x1a1a1c }) },
  { id: 'cx_negi', slot: 'bag', name: 'Eco Bag with Leek', price: 300, rarity: 'common', shop: true, desc: 'The universal sign of a good supermarket run.', ...bag({ kind: 'ecobag', col: 0xd8c8a8, leek: true }) },
  { id: 'cx_tote', slot: 'bag', name: 'Canvas Tote', price: 500, rarity: 'common', web: true, desc: 'Says nothing. Very cool.', ...bag({ kind: 'tote', col: 0xe8dcc0, side: 1 }) },
  { id: 'cx_briefcase', slot: 'bag', name: 'Briefcase', price: 2000, rarity: 'uncommon', web: true, desc: 'Contains one onigiri and a spreadsheet.', ...bag({ kind: 'briefcase', col: 0x3a2418 }) },
  { id: 'cx_capsulepack', slot: 'bag', name: 'Capsule Backpack', price: 2500, rarity: 'ultra', ach: 'style_capsule', desc: 'A giant gacha capsule you can wear. Something rattles inside.', ...voxBag('cx_capsulepack', VX.capsulePack, 1.25) },
  { id: 'cx_teddypack', slot: 'bag', name: 'Teddy Backpack', price: 2200, rarity: 'rare', web: true, desc: 'He holds on to your shoulders. Forever.', ...voxBag('cx_teddypack', VX.teddyPack) },

  // ================================================================== shoes
  { id: 'cx_geta', slot: 'shoes', name: 'Wooden Geta', price: 900, rarity: 'uncommon', shop: true, desc: 'Karan-koron on the paving stones.', ...shoe('sandal', 0x8a5a32, null, [246, 244, 238]) },
  { id: 'cx_redhi', slot: 'shoes', name: 'Red High-tops', price: 1600, rarity: 'common', shop: true, desc: 'Canvas, rubber toe caps, laced up tight.', ...shoe('sneaker', 0xc8302a, 0xf2f0ea) },
  { id: 'cx_rainboots', slot: 'shoes', name: 'Rain Boots', price: 800, rarity: 'common', shop: true, desc: 'Puddles fear you.', ...shoe('boots', 0xf4c430) },
  { id: 'cx_loafers', slot: 'shoes', name: 'School Loafers', price: 1200, rarity: 'common', shop: true, desc: 'Polished every Monday.', ...shoe('loafer', 0x3a2418, null, [40, 40, 46]) },
  { id: 'cx_platform', slot: 'shoes', name: 'Pink Platforms', price: 2400, rarity: 'uncommon', web: true, desc: 'Eight centimetres taller and twice as fabulous.', ...shoe('platform', 0xf0a0c0) },
  { id: 'cx_jikatabi', slot: 'shoes', name: 'Jika-tabi', price: 1400, rarity: 'uncommon', web: true, desc: 'Split-toe work boots. Very good for climbing ladders.', ...shoe('tabi', 0x1e2230) },
  { id: 'cx_goldkicks', slot: 'shoes', name: 'Golden Sneakers', price: 8000, rarity: 'secret', ach: 'style_closet', desc: 'A walk-in closet earns a walk in these.', ...shoe('sneaker', 0xe8b830, 0xfff4c0) },
];

// the 1999 closet (src/cosmetics/more.js): 46 more pieces built with the helpers above
export const MORE = moreCosmetics({ onCrown, onHead, onEyes, sideMask, both, bag, shoe, pHat, pGlasses, top, onesie, animalHood, voxBag });

// rarity and where the old items come from (they keep looking exactly the same)
const OLD = {
  dino: 'rare', banana: 'uncommon', happi: 'uncommon', box: 'common', chicken: 'rare', shark: 'rare', frog: 'uncommon', bear: 'uncommon',
  cone: 'common', party: 'common', bow: 'common', nigiri: 'uncommon', shades: 'common', stars: 'uncommon', groucho: 'common', kitsune: 'rare',
};
for (const c of COSMETICS) if (OLD[c.id]) { c.rarity ||= OLD[c.id]; c.shop = true; }
// the closet's fancier stock comes in as the shop grows (shop level; pieces you already own stay yours)
const LEVEL = { dino: 5, shark: 6, cx_suit: 3, cx_randoseru: 4, cx_shiba: 8 };

for (const c of [...EXTRA, ...MORE]) {
  if (COSMETIC_BY_ID[c.id]) continue;
  c.exclusive = !!(c.ach || c.quest || c.capsule || c.itch);
  if (c.print) registerPrint(c.id, c.print);
  COSMETICS.push(c);
  COSMETIC_BY_ID[c.id] = c;
}
for (const [id, lv] of Object.entries(LEVEL)) if (COSMETIC_BY_ID[id]) COSMETIC_BY_ID[id].level = lv;

/** How you get a cosmetic, for the closet / shop cards. */
export function sourceOf(c) {
  if (!c) return null;
  if (c.itch) return { kind: 'itch', text: 'Follow us on itch.io' };
  if (c.thrift || c.secondhand) return { kind: 'thrift', text: 'Thrift find on Off-Hobby' };
  if (c.ach) return { kind: 'ach', text: 'Achievement reward', id: c.ach };
  if (c.quest) return { kind: 'quest', text: 'Side quest reward', id: c.quest };
  if (c.capsule) return { kind: 'capsule', text: 'Rare bonus in capsules', id: c.capsule };
  if (c.web) return { kind: 'web', text: 'kirakira-closet.jp' };
  return { kind: 'shop', text: 'Closet', level: c.level || 0 };
}
export const RARITY_RANK = { common: 0, uncommon: 1, rare: 2, ultra: 3, secret: 4 };

// ------------------------------------------------------------------ wardrobe icons: the slots (hats, outfits, glasses,
// bags, shoes) and the hanger (the dressing room's tabs, the style achievements)
defineIcon('cos_hat', { rows: [
  '................',
  '.......YY.......',
  '......YZZy......',
  '.......yy.......',
  '.....RRRRRR.....',
  '....RQQRRRRr....',
  '...RQRRRRRRRr...',
  '...RRRRRRRRRr...',
  '..RRRRRRRRRRRr..',
  '..RRRRRRRRRRRr..',
  '..wWWWWWWWWWWu..',
  '..wWuWuWuWuWuu..',
  '..wuuuuuuuuuuu..',
  '................',
  '................',
  '................',
] });
defineIcon('cos_shirt', { rows: [
  '................',
  '................',
  '....EEe..eEE....',
  '..EEFEeeeeEEEe..',
  '.EFFEEEEEEEEEEe.',
  '.EFEEEEEEEEEEEe.',
  '.eEEEEEEEEEEEee.',
  '..eeEEEEEEEEee..',
  '....EEEEEEEEe...',
  '....EYYEEEEEe...',
  '....EEEEEEEEe...',
  '....EEEEEEEEe...',
  '....EEEEEEEEe...',
  '....eeeeeeeee...',
  '................',
  '................',
] });
defineIcon('cos_glasses', { rows: [
  '................',
  '................',
  '................',
  '................',
  '................',
  '.KKKKKKKKKKKKKK.',
  '.KDDDDDKKDDDDDK.',
  '.KDCDDDKKDCDDDK.',
  '.KDDDDDK.KDDDDK.',
  '..KDDDK...KDDK..',
  '...KKK.....KK...',
  '................',
  '................',
  '................',
  '................',
  '................',
] });
defineIcon('cos_hanger', { rows: [
  '................',
  '.......gg.......',
  '......g..g......',
  '.........g......',
  '........g.......',
  '.......gg.......',
  '......glLg......',
  '.....gL..lg.....',
  '....gL....lg....',
  '...gL......lg...',
  '..gL........lg..',
  '.gLllllllllllgg.',
  '.gGGGGGGGGGGGGG.',
  '................',
  '................',
  '................',
] });
defineIcon('cos_bag', { rows: [
  '................',
  '.....kkkkkk.....',
  '....k......k....',
  '....k......k....',
  '..TTTTTTTTTTTT..',
  '.TAAAAAAAAAAAAt.',
  '.TAAAAAAAAAAAAt.',
  '.TAAAAYYAAAAAAt.',
  '.TAAAAYYAAAAAAt.',
  '.TTTTTTTTTTTTTt.',
  '.TAAAAAAAAAAAAt.',
  '.TAAAAAAAAAAAAt.',
  '.TAAAAAAAAAAAAt.',
  '.tttttttttttttt.',
  '................',
  '................',
] });
defineIcon('cos_shoe', { rows: [
  '................',
  '................',
  '................',
  '................',
  '...RRRR.........',
  '...RWRRR........',
  '...RRWRRR.......',
  '...RRRWRRRR.....',
  '...RRRRRRRRRR...',
  '..RRRRRRRRRRRRr.',
  '..RRRRRRRRRRRRr.',
  '..WWWWWWWWWWWWWu',
  '..uuuuuuuuuuuuu.',
  '................',
  '................',
  '................',
] });
