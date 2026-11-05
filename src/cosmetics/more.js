// The 1999 closet: 46 more pieces for the dressing room, all things you'd see on a Tokyo back lane that spring (school
// uniforms and a kogal's loose socks, a yukata, a school jersey, a salaryman's loosened tie, hay-fever goggles, a folded
// newspaper kabuto for Children's Day...), plus the free Duck Head for following the game on itch.io. Each says how you
// get it, in the catalogue's terms (src/cosmetics/catalog.js): shop (the closet, maybe from a shop level), web
// (kirakira-closet.jp), ach (an achievement: rewards.js hands it over), quest (a lane side quest), capsule (a rare bonus in
// a gacha series), secondhand (only at Off-Hobby, the junk market), itch (src/cosmetics/itch.js).
//   moreCosmetics(kit) -> [entries]     kit: the placement and painting helpers from catalog.js
import { hex } from '../people/paintlib.js';
import { V99 } from './voxels99.js';

export function moreCosmetics(K) {
  const { onCrown, onHead, onEyes, sideMask, bag, shoe, pHat, top, onesie, animalHood } = K;

  /** An obi round the waist (yukata), sized to the wearer. */
  const obi = (col, col2, bow = true) => ({
    dress: (c) => {
      const P = c.P, V = P.H / 140, y0 = P.waistY - 0.012 * P.H, h = Math.round(0.07 * P.H / V);
      const t = 0.4, X = Math.round((P.waistX + (P.bustX - P.waistX) * t + 0.002) / V), Z = Math.round((P.waistZ + P.belly / 3 + 0.003 * P.H + 0.004) / V);
      const g = c.add(c.b.spine, `cx_obi:${X}:${Z}:${h}:${col}:${bow}`, () => V99.obi(X, Z, h, col, col2, bow));
      g.scale.setScalar(V);
      g.position.set(0, y0 - c.J.spine[1], 0.002 * P.H);
      c.rig.parts.push(g);
    },
  });
  /** A tie hanging from the collar down the chest, pulled loose. */
  const looseTie = {
    dress: (c) => {
      const P = c.P, V = P.H / 140;
      const g = c.add(c.b.chest, 'cx_tie', () => V99.tie());
      g.scale.setScalar(V);
      g.position.set(0.004 * P.H, P.neckBase - 0.035 * P.H - c.J.chest[1], P.chestZ + P.bust + 0.006 * P.H + 0.012);
      g.rotation.z = 0.05;
      c.rig.parts.push(g);
    },
  };
  /** A tanuki tail at the back of the hips, swaying (and swishing when you walk). */
  const tanukiTail = {
    dress: (c) => {
      const P = c.P, V = P.H / 140;
      const root = c.pivotGroup([0, P.hipY + 0.025 * P.H - c.J.hips[1], -P.hipsZ - 0.01]);
      root.scale.setScalar(V);
      c.b.hips.add(root); c.rig.parts.push(root);
      const segs = [[5, 3, 5.6], [8, 5.6, 6.2], [8, 6.2, 2.6]];
      let parent = root;
      const chain = segs.map(([len, r0, r1], i) => {
        const g = c.add(parent, `cx_tanuki${i}`, () => V99.tanukiSeg(len, r0, r1, i === segs.length - 1));
        if (i) g.position.set(0, 0, -segs[i - 1][0]);
        parent = g;
        return g;
      });
      chain[0].rotation.x = -1.05; // down from the hips, then curling back out
      let t = Math.random() * 6;
      c.rig.anims.push({ kind: 'fn', fn: (dt, rig) => {
        t += dt;
        const W = rig.h.walkW || 0, ph = (rig.h.phase || 0) * Math.PI * 2;
        const sway = Math.sin(t * 1.7) * 0.18 * (1 - W) + Math.sin(ph) * 0.35 * W;
        chain.forEach((g, i) => { g.rotation.y = sway * (0.6 + i * 0.3); if (i) g.rotation.x = 0.42 + Math.sin(t * 1.1 + i) * 0.05; });
      } });
    },
    preview: () => {},
    thumb: 'back',
  };
  const chonmage = {
    dress: (c) => { const s = c.spec.skin || [236, 200, 170], col = (s[0] << 16) | (s[1] << 8) | s[2]; c.add(c.head, 'cx_chon' + col, () => V99.chonmage(col)); },
    preview: (add) => add('cx_chon', () => V99.chonmage()),
  };
  const both = (...parts) => ({ dress: (c) => parts.forEach((p) => p.dress?.(c)), preview: (add, g, lift) => parts.forEach((p) => p.preview?.(add, g, lift)) });
  const kogal = top({ kind: 'cardigan', col: 0xe6d6ae, shirt: 0xf6f4ee }, { kind: 'skirt', cut: 'pleated', col: 0x4a5a7a }, (s) => {
    s.bottom.plaid = hex(0x9a3a3a); s.legs = 'loosesocks'; s.socks = { col: [248, 246, 242] };
    s.shoes = { kind: 'loafer', col: hex(0x3a2418) }; // (a shoes piece, if you wear one, goes on over these)
  });

  return [
    // ================================================================== hats
    { id: 'cx_duck', slot: 'hat', name: 'Duck Head', price: 0, rarity: 'rare', itch: true, cover: true, desc: 'A whole duck, for your whole head. Free, with our thanks for following the game.', ...onHead('cx_duck', V99.duck) },
    { id: 'cx_hachimaki', slot: 'hat', name: 'Hisshō Hachimaki', price: 300, rarity: 'common', shop: true, desc: 'Certain Victory! For exams, festivals and very hard gacha pulls.', ...onHead('cx_hachimaki', V99.hachimaki) },
    { id: 'cx_kabuto', slot: 'hat', name: 'Newspaper Kabuto', price: 100, rarity: 'common', shop: true, desc: "Folded from yesterday's Asahi for Children's Day. Still smells of ink.", ...onCrown('cx_kabuto', V99.kabuto, [0, -1.2, 0]) },
    { id: 'cx_sakuraclip', slot: 'hat', name: 'Sakura Hair Clip', price: 300, rarity: 'common', shop: true, desc: 'One blossom, clipped on for hanami season.', ...onCrown('cx_sakuraclip', V99.sakuraClip, [7.4, 10.5, 5.2], [0, 1.15, 0.15]) },
    { id: 'cx_schoolcap', slot: 'hat', name: 'Yellow School Hat', price: 500, rarity: 'common', shop: true, desc: 'So the cars can see you on the way to school.', ...pHat('schoolhat', 0xf4c430) },
    { id: 'cx_hardhat', slot: 'hat', name: 'Safety Helmet', price: 1200, rarity: 'common', shop: true, level: 4, desc: 'Safety First, in green. For when the shop gets a renovation.', ...pHat('hardhat', 0xf0ece0) },
    { id: 'cx_fishhat', slot: 'hat', name: "Fisherman's Bucket Hat", price: 1300, rarity: 'uncommon', quest: 'crew', desc: 'The captain\'s spare, lures still hooked in. Smells of the harbour.', ...onCrown('cx_fishhat', V99.fishHat, [0, -0.8, 0]) },
    { id: 'cx_santa', slot: 'hat', name: 'Christmas Cake Hat', price: 600, rarity: 'common', web: true, desc: 'Worn by every konbini part-timer selling Christmas cake on the 24th.', ...onCrown('cx_santa', V99.santa, [0, -1.4, 0]) },
    { id: 'cx_capsulehat', slot: 'hat', name: 'Capsule Helmet', price: 1800, rarity: 'rare', ach: 'sim_three_machines', cover: true, desc: 'Three machines! You are now, technically, a capsule.', ...onHead('cx_capsulehat', V99.capsuleHat) },
    { id: 'cx_daruma', slot: 'hat', name: 'Daruma Hood', price: 2200, rarity: 'rare', ach: 'sim_debt_free', cover: true, desc: 'Debt free: the wish came true. Paint in the other eye.', ...onHead('cx_daruma', V99.daruma) },
    { id: 'cx_kagami', slot: 'hat', name: 'Kagami Mochi Hat', price: 1500, rarity: 'rare', capsule: 'mochi', desc: 'New Year on your head. Do not eat until January the eleventh.', ...onCrown('cx_kagami', V99.kagami, [0, -1, 0]) },
    { id: 'cx_visor', slot: 'hat', name: 'Pachinko Visor', price: 900, rarity: 'uncommon', capsule: 'showa', desc: 'See-through green. Lucky, says the man who wore it before you.', ...onHead('cx_visor', V99.visor) },
    { id: 'cx_chonmage', slot: 'hat', name: 'Chonmage Wig', price: 1500, rarity: 'uncommon', secondhand: true, cover: true, desc: 'From a party shop that closed in 1993. The topknot is real horsehair.', ...chonmage },

    // ================================================================== glasses & masks
    { id: 'cx_gariben', slot: 'face', name: 'Bottle-bottom Specs', price: 500, rarity: 'common', shop: true, desc: 'Lenses as thick as your cram-school textbook.', ...onEyes('cx_gariben', V99.gariben) },
    { id: 'cx_kafun', slot: 'face', name: 'Hay Fever Kit', price: 800, rarity: 'common', shop: true, desc: 'Goggles and a mask. Cedar pollen season, every spring, everybody.', ...onEyes('cx_kafun', V99.kafun) },
    { id: 'cx_wrapshades', slot: 'face', name: 'Y2K Wraparounds', price: 1600, rarity: 'uncommon', web: true, desc: 'The future is purple-to-orange and arrives in nine months.', ...onEyes('cx_wrapshades', V99.wrapShades) },
    { id: 'cx_kaiser', slot: 'face', name: 'Kaiser Moustache', price: 500, rarity: 'common', web: true, desc: 'Waxed, curled, distinguished. Mostly glue.', ...onEyes('cx_kaiser', V99.kaiser) },
    { id: 'cx_tengu', slot: 'face', name: 'Tengu Mask', price: 1800, rarity: 'rare', capsule: 'omamori', desc: 'The mountain goblin, nose and all. Mind the doorways.', ...onEyes('cx_tengu', V99.tengu) },
    { id: 'cx_okame', slot: 'face', name: 'Okame Mask', price: 1000, rarity: 'rare', capsule: 'matsuri', desc: "Hyottoko's sweetheart: round cheeks, good fortune.", ...sideMask('cx_okame', V99.okame) },
    { id: 'cx_kurogitsune', slot: 'face', name: 'Black Fox Mask', price: 1600, rarity: 'rare', quest: 'relic', desc: 'Lord Kuromaru insists it is cursed. It is very nicely painted.', ...sideMask('cx_kurogitsune', V99.kurogitsune) },
    { id: 'cx_heromask', slot: 'face', name: 'Bootleg Hero Mask', price: 700, rarity: 'uncommon', capsule: 'pachimon', desc: 'From a festival stall. The hero is called Ultla-Man.', ...sideMask('cx_heromask', V99.heroMask) },
    { id: 'cx_blackmask', slot: 'face', name: 'Sukeban Mask', price: 900, rarity: 'uncommon', capsule: 'bizarre', desc: 'A long skirt, a yo-yo and this. Nobody cuts in line.', ...onEyes('cx_blackmask', V99.blackMask) },

    // ================================================================== outfits
    { id: 'cx_yukata', slot: 'outfit', name: 'Indigo Yukata', price: 3800, rarity: 'rare', web: true, desc: 'Cotton, indigo, a red obi bow at the back. Fireworks not included.', ...top({ kind: 'blouse', col: 0x2a3a6a, shirt: 0xf2ead8, sleeve: 'long' }, { kind: 'skirt', cut: 'long', col: 0x2a3a6a }, (s) => { s.legs = 'skin'; s.socks = null; s.acc = s.acc.filter((a) => a.kind !== 'backpack' && a.kind !== 'randoseru'); }), ...obi(0xc8303a, 0xf2c84a) },
    { id: 'cx_ryokan', slot: 'outfit', name: 'Ryokan Yukata', price: 2000, rarity: 'uncommon', ach: 'gr_bath', desc: 'The one the inn lends you, after the bath. Ii yu da na.', ...top({ kind: 'blouse', col: 0xe8eef2, shirt: 0xf6f4ee, sleeve: 'long' }, { kind: 'skirt', cut: 'long', col: 0xe8eef2 }, (s) => { s.legs = 'skin'; s.socks = null; }), ...obi(0x2a3658, 0x2a3658, false) },
    { id: 'cx_jersey', slot: 'outfit', name: 'School Jersey', price: 1500, rarity: 'common', shop: true, desc: 'Green jāji, white stripes, your name in marker on the chest.', ...top({ kind: 'jacket', col: 0x2a6a4a, shirt: 0xf4f4f0, band: 0xf2f0ea, sleeve: 'long' }, { kind: 'slacks', col: 0x2a6a4a, noCrease: true }) },
    { id: 'cx_blazer', slot: 'outfit', name: 'Blazer Uniform', price: 2600, rarity: 'uncommon', shop: true, level: 3, desc: 'Navy blazer, grey trousers, a crest on the pocket. Straighten up.', ...top({ kind: 'blazer', col: 0x2a3050, shirt: 0xf4f4f0 }, { kind: 'slacks', col: 0x6a6a72 }, (s) => { s.shoes = { kind: 'loafer', col: hex(0x3a2418) }; }) },
    { id: 'cx_kogal', slot: 'outfit', name: 'Kogal Uniform', price: 3200, rarity: 'rare', web: true, desc: 'Beige cardigan, plaid mini, loose socks. Cho-kawaii, 1999 style.', ...kogal },
    { id: 'cx_overtime', slot: 'outfit', name: 'Overtime Shirt & Tie', price: 1200, rarity: 'common', shop: true, desc: 'Half past ten, tie loosened, one more round at the izakaya.', ...top({ kind: 'shirt', col: 0xf2f2ee, sleeve: 'long', tuck: true }, { kind: 'slacks', col: 0x4a4c56 }), ...looseTie },
    { id: 'cx_hanten', slot: 'outfit', name: 'Hanten', price: 1300, rarity: 'uncommon', capsule: 'heya', desc: "Grandma's padded house coat. Kotatsu sold separately.", ...top({ kind: 'happi', col: 0x3a4468, col2: 0x24202a, col3: 0x3a4468, sleeve: 'long' }) },
    { id: 'cx_jinbei', slot: 'outfit', name: 'Summer Jinbei', price: 1600, rarity: 'common', shop: true, desc: 'Cool cotton for hot nights: tied at the side, shorts to match.', ...top({ kind: 'happi', col: 0x4a6a8a, col2: 0x3a5878, col3: 0x4a6a8a, sleeve: 'mid' }, { kind: 'shorts', col: 0x4a6a8a }, (s) => { s.legs = 'skin'; s.socks = null; }) },
    { id: 'cx_overalls', slot: 'outfit', name: 'Denim Dungarees', price: 2400, rarity: 'uncommon', web: true, desc: 'Bib, buckles, a cream tee under. Very Harajuku this year.', ...top({ kind: 'tee', col: 0xf2ece0, col2: 0xf2ece0, print: 'none', sleeve: 'short' }, { kind: 'jeans', col: 0x3a5480 }, (s) => { s.acc = s.acc.filter((a) => a.kind !== 'apron'); s.acc.push({ kind: 'apron', col: hex(0x3a5480), col2: [214, 180, 90] }); }) },
    { id: 'cx_pyjamas', slot: 'outfit', name: 'Flannel Pyjamas', price: 1800, rarity: 'uncommon', ach: 'sim_night_owl', desc: 'For night owls. The slippers come with them.', ...top({ kind: 'flannel', col: 0x9ab8d8, col2: 0xf2f0ea }, { kind: 'slacks', col: 0x9ab8d8, noCrease: true }, (s) => { s.shoes = { kind: 'comfort', col: hex(0xc8b8e0) }; }) },
    { id: 'cx_tanuki', slot: 'outfit', name: 'Tanuki Kigurumi', price: 3600, rarity: 'rare', web: true, hood: true, desc: 'Round ears, a dark mask, a big fluffy tail. Pon-poko.', ...onesie(0x8a6a4a, 0xe8d6b4, null, { feet: 0x4a3a2e }), ...both(animalHood('cx_tanukihood', { col: 0x8a6a4a, rim: 0xe8d6b4, ear: 0x4a3a2e, earIn: 0x6a5040, ears: 'round', paint: (x, y, z, col, d, e) => (col === 0xe8d6b4 && Math.abs(x) > 2 && y > 5 && y < 10 ? 0x4a3a2e : col) }), tanukiTail) },

    // ================================================================== bags
    { id: 'cx_randoseru_k', slot: 'bag', name: 'Black Randoseru', price: 1800, rarity: 'common', shop: true, desc: 'Six years of school, in black. Built like a tank.', ...bag({ kind: 'randoseru', col: 0x24202a }) },
    { id: 'cx_randoseru_l', slot: 'bag', name: 'Lavender Randoseru', price: 2400, rarity: 'uncommon', web: true, desc: 'New for 1999: randoseru in colours! Grandpa does not approve.', ...bag({ kind: 'randoseru', col: 0xb8a0d8 }) },
    { id: 'cx_shoulderbag', slot: 'bag', name: 'Canvas Shoulder Bag', price: 1100, rarity: 'common', shop: true, desc: 'Olive canvas, one long strap, room for a Walkman and a manga.', ...bag({ kind: 'shoulderbag', col: 0x6a7a4a }) },
    { id: 'cx_handbag', slot: 'bag', name: 'Obachan Handbag', price: 1400, rarity: 'uncommon', web: true, desc: 'Purple, faux croc, full of candy for strangers.', ...bag({ kind: 'handbag', col: 0x7a4a8a }) },
    { id: 'cx_pouch', slot: 'bag', name: 'Gamaguchi Pouch', price: 600, rarity: 'common', shop: true, desc: 'A frog-mouth purse with a snap. Clack.', ...bag({ kind: 'pouch', col: 0xd85a6a }) },
    { id: 'cx_tanukitail', slot: 'bag', name: 'Tanuki Tail', price: 1400, rarity: 'rare', capsule: 'yokai', desc: 'Clip it on and nobody can tell what you really are.', ...tanukiTail },
    { id: 'cx_furoshiki', slot: 'bag', name: "Thief's Furoshiki", price: 1500, rarity: 'rare', quest: 'cucumber', desc: 'Green with white swirls: the classic burglar bundle. Full of cucumbers.', ...K.voxBag('cx_furoshiki', V99.furoshiki, 1.45) },

    // ================================================================== shoes
    { id: 'cx_zori', slot: 'shoes', name: 'Straw Zori', price: 700, rarity: 'common', shop: true, desc: 'Woven straw, red thongs, white tabi socks.', ...shoe('sandal', 0xd8c08a, null, [248, 246, 240]) },
    { id: 'cx_fishboots', slot: 'shoes', name: 'Fish Market Boots', price: 900, rarity: 'common', shop: true, desc: 'White rubber, as worn at Tsukiji at four in the morning.', ...shoe('boots', 0xeeebe2) },
    { id: 'cx_uwabaki', slot: 'shoes', name: 'Uwabaki', price: 400, rarity: 'common', shop: true, desc: 'School indoor shoes with a blue toe. Your name on the heel.', ...shoe('sneaker', 0xf2f0ea, 0x3a6ac8) },
    { id: 'cx_toilet', slot: 'shoes', name: 'Lucky Toilet Slippers', price: 777, rarity: 'uncommon', ach: 'fun_pooped', desc: 'Un ga tsuku: a pigeon blessed you. Never wear them out of the toilet. (You will.)', ...shoe('comfort', 0x58b06a) },
    { id: 'cx_neonrunners', slot: 'shoes', name: "Neon Runners '95", price: 4500, rarity: 'rare', secondhand: true, desc: 'People got mugged for these. Yours are a bit worn at the heel.', ...shoe('sneaker', 0xc8e04a, 0x3a3a48) },
    { id: 'cx_slippers', slot: 'shoes', name: 'Guest Slippers', price: 300, rarity: 'common', shop: true, desc: 'Brown vinyl, from the shoe cupboard by the door.', ...shoe('comfort', 0x8a5a3a) },
  ];
}
