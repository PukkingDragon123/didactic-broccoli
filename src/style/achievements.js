// More achievements for the computer's trophy cabinet (game.os.achievements): the silly things you do in the lane,
// a few life milestones with progress counters, and the wardrobe ones. Several unlock cosmetics (reward.cosmetic,
// handed out by src/cosmetics via the 'achievement' event); the shop level 20 one now comes with a crown.
// Everything is counted from events other systems already emit (game.events): hairHit, npcSlapped, slap, drunk, bill,
// pooped, ate / eat, jobDone, coinsCollected, yokaiSeen, avatar, cosmetic; plus the ghost alley's save flag.
//   installStyleAchievements(game)    (src/plugins/style.js)
import { defineIcon } from '../gfx/icons.js';
import { ensureState } from '../game/stateExt.js';
import { COSMETIC_BY_ID, SLOTS } from '../people/cosmetics.js';

export const STYLE_ACHIEVEMENTS = [
  { id: 'fun_hair', name: "Don't Touch the Hair", desc: "Mess with Josuke's hair. Nobody messes with Josuke's hair.", icon: 'ach_hair', hidden: true, reward: { cosmetic: 'cx_pompadour' } },
  { id: 'fun_ghost3', name: 'I Said Don\'t Look Back', desc: 'Get dragged out of the ghost alley three times.', icon: 'ach_ghost', max: 3, reward: { cosmetic: 'cx_yurei' } },
  { id: 'fun_drunk_ramen', name: 'One More Round', desc: 'Get properly drunk at Ramen Yamada.', icon: 'ach_drunk', hidden: true, reward: { cosmetic: 'cx_tiehead' } },
  { id: 'fun_rent_late', name: "The Cheque's in the Mail", desc: 'Pay the rent late. The landlady remembers.', icon: 'ach_late', hidden: true, reward: { cosmetic: 'cx_paperbag' } },
  { id: 'fun_slaps', name: 'Hands of Fury', desc: 'Slap 10 people. Why are you like this?', icon: 'ach_slap', max: 10, reward: { cosmetic: 'cx_bandaid' } },
  { id: 'fun_pooped', name: 'Un ga Tsuku', desc: 'Get pooped on by a pigeon. In Japan that means good luck!', icon: 'ach_poop', hidden: true, reward: 777 },
  { id: 'life_foodie', name: 'Itadakimasu', desc: 'Eat 50 times: snacks, ramen, vending machine mysteries.', icon: 'ach_food', max: 50, reward: 500 },
  { id: 'life_jobs', name: 'Odd Jobber', desc: 'Finish 10 side jobs around the lane.', icon: 'ach_jobs', max: 10, reward: { cosmetic: 'cx_jumpsuit' } },
  { id: 'life_coins', name: 'Coin Collector', desc: 'Empty ¥100,000 out of your machines\' coin boxes.', icon: 'ach_coins', max: 100000, reward: { cosmetic: 'cx_yenshades' } },
  { id: 'life_yokai', name: 'Yokai Spotter', desc: 'Spot three different yokai in the neighbourhood.', icon: 'ach_yokai', max: 3, reward: { cosmetic: 'cx_kasa' } },
  { id: 'style_new', name: 'New Look', desc: 'Put on something from your closet.', icon: 'cos_shirt' },
  { id: 'style_closet', name: 'Walk-in Closet', desc: 'Own 25 pieces of clothing and accessories.', icon: 'cos_hanger', max: 25, reward: { cosmetic: 'cx_goldkicks' } },
  { id: 'style_capsule', name: 'Surprise Inside', desc: 'Find a piece of clothing inside a gacha capsule.', icon: 'capsule', hidden: true, reward: { cosmetic: 'cx_capsulepack' } },
  { id: 'style_full', name: 'Dressed to the Nines', desc: 'Wear a hat, a face piece, an outfit, a bag and shoes all at once.', icon: 'cos_hat' },
];
// rewards added to achievements other systems define
const EXTRA_REWARDS = { sim_level_20: { cosmetic: 'cx_crown' } };

export function installStyleAchievements(game) {
  const g = game;
  const A = () => g.os?.achievements;
  const s = ensureState(g, 'styleAch', { slaps: 0, ate: 0, jobs: 0, coins: 0, yokai: [] });
  let defined = false;
  const extra = new Set(Object.keys(EXTRA_REWARDS));
  const define = () => {
    const a = A();
    if (!a?.define) return false;
    if (!defined) { for (const d of STYLE_ACHIEVEMENTS) a.define(d); defined = true; }
    // rewards for achievements other systems define (once they have)
    if (extra.size) for (const x of a.list()) if (extra.has(x.id) && x.name) { a.define({ id: x.id, reward: EXTRA_REWARDS[x.id] }); extra.delete(x.id); }
    return true;
  };
  define();
  const unlock = (id) => { if (define()) A().unlock(id); };
  const count = (id, n) => { if (define()) A().count?.(id, n); };

  const ev = g.events;
  ev.on('hairHit', () => unlock('fun_hair'));
  ev.on('npcSlapped', ({ id }) => { if (id === 'josuke') unlock('fun_hair'); });
  ev.on('slap', ({ human }) => { if (human) { s.slaps++; count('fun_slaps', s.slaps); } });
  ev.on('drunk', ({ level }) => { if (level >= 0.45 && g.places?.where === 'ramen') unlock('fun_drunk_ramen'); });
  ev.on('bill', ({ type, bill }) => { if (type === 'paid' && bill?.kind === 'rent' && (bill.overdue || bill.lateFee)) unlock('fun_rent_late'); });
  ev.on('pooped', () => unlock('fun_pooped'));
  const ate = () => { s.ate++; count('life_foodie', s.ate); };
  ev.on('ate', ate); ev.on('eat', ate);
  ev.on('jobDone', () => { s.jobs++; count('life_jobs', s.jobs); });
  ev.on('coinsCollected', ({ amount }) => { s.coins += Math.max(0, amount || 0); count('life_coins', s.coins); });
  ev.on('yokaiSeen', ({ id }) => { if (id && !s.yokai.includes(id)) s.yokai.push(id); count('life_yokai', s.yokai.length); });
  const look = () => {
    const a = g.state.avatar || {};
    if (SLOTS.some((x) => a[x.id])) unlock('style_new');
    if (SLOTS.every((x) => a[x.id] && COSMETIC_BY_ID[a[x.id]])) unlock('style_full');
    count('style_closet', (a.owned || []).length);
  };
  ev.on('avatar', look);
  ev.on('cosmetic', ({ kind }) => { if (kind === 'capsule') unlock('style_capsule'); look(); });

  // a slow poll: the OS may show up late, the ghost alley only keeps a save flag
  let t = 1;
  g.constructor.updaters.push((gg, dt) => {
    if ((t -= dt) > 0) return;
    t = 2;
    if (!define()) return;
    count('fun_ghost3', g.state.flags?.ghostFails || 0);
    count('fun_slaps', s.slaps); count('life_foodie', s.ate); count('life_jobs', s.jobs); count('life_coins', s.coins); count('life_yokai', s.yokai.length);
    count('style_closet', (g.state.avatar?.owned || []).length);
  });
}

// ------------------------------------------------------------------ the trophies' pixel icons (16 x 16)
defineIcon('ach_hair', { rows: [
  '................',
  '.....KKKKKKK....',
  '...KKkkkkkkkKK..',
  '..KkkKkkkkkkkkK.',
  '..KkKkkkkkkkkkkK',
  '..KkkkkKKKKKKkkK',
  '..KkkKK.....KKK.',
  '..KkK.hhhhh.....',
  '..KK.hhhhhhh....',
  '..KK.hhKhhKh....',
  '...K.hhhhhhh....',
  '.....hhhjjhh....',
  '......hhhhh.....',
  '.......hhh......',
  '................',
  '................',
] });
defineIcon('ach_ghost', { rows: [
  '................',
  '.......K........',
  '......KWK.......',
  '.....KWWWK......',
  '....KKKKKKK.....',
  '...KwwwwwwwK....',
  '..KwwKwwwKwwK...',
  '..KwwKwwwKwwK...',
  '..KwwwwwwwwwK...',
  '..KwwwKKKwwwK...',
  '..KwwwwwwwwwwK..',
  '..KwwwwwwwwwwuK.',
  '..KuwwwwwwwwuuK.',
  '...KuwKuwKuwKK..',
  '....KK.KK.KK....',
  '................',
] });
defineIcon('ach_drunk', { rows: [
  '................',
  '....wWWwWWw.....',
  '...WWwWWwWWW....',
  '...KKKKKKKKK....',
  '...KZYYYYYZK.KK.',
  '...KYYZYYYYKK.K.',
  '...KYYYYZYYK..K.',
  '...KYZYYYYYK..K.',
  '...KYYYYYZYKKK..',
  '...KyYYYYYyK....',
  '...KyyyyyyyK....',
  '...KKKKKKKKK....',
  '..Q.......Q.....',
  '.QRQ.....QRQ....',
  '..R.......R.....',
  '................',
] });
defineIcon('ach_late', { rows: [
  '................',
  '................',
  '.KKKKKKKKKKKKKK.',
  '.KwwwwwwwwwwwwK.',
  '.KwKwwwwwwwwKwK.',
  '.KwwKwwwwwwKwwK.',
  '.KwwwKKwwKKwwwK.',
  '.KwRRRRRRRRRRwK.',
  '.KwRQRQQRQRQRwK.',
  '.KwRQRQRRQRQRwK.',
  '.KwRRRRRRRRRRwK.',
  '.KwwwwwwwwwwwwK.',
  '.KKKKKKKKKKKKKK.',
  '................',
  '................',
  '................',
] });
defineIcon('ach_slap', { rows: [
  '................',
  '.....K.K.K......',
  '....KhKhKhK.....',
  '....KhKhKhK.K...',
  '.w..KhKhKhKKhK..',
  '..w.KhhhhhhKhK..',
  '.K..KhhhhhhhhK..',
  'KhK.KhhhhhhhK...',
  'KhhKhhhhhhhhK...',
  '.KhhhhhhhhhK....',
  'w.KhhhhhhhK.....',
  '.w.KjjjjjK......',
  '....KKKKK.......',
  '................',
  '................',
  '................',
] });
defineIcon('ach_poop', { rows: [
  '........W.......',
  '.......WWW......',
  '.......WwW......',
  '........W.......',
  '................',
  '.....GGG........',
  '....GgLgG.......',
  '...OGgKggGG.....',
  '....GcdggggG....',
  '.....GggggggGG..',
  '......GgggglggG.',
  '.......GGGGGGG..',
  '........O..O....',
  '.......OO.OO....',
  '................',
  '................',
] });
defineIcon('ach_food', { rows: [
  '..........A..A..',
  '.........A..A...',
  '........A..A....',
  '....wwwwA.A.....',
  '..wwWwWwWAwww...',
  '.KKKKKKKKKKKKK..',
  '.KRRRRRRRRRRRK..',
  '..KRRWRRRRWRK...',
  '..KRRRRRRRRRK...',
  '...KRRRRRRRK....',
  '....KKKKKKK.....',
  '.....KrrrK......',
  '.....KKKKK......',
  '................',
  '................',
  '................',
] });
defineIcon('ach_jobs', { rows: [
  '................',
  '..........LLL...',
  '.........LllgL..',
  '.........Llg....',
  '........LlgL....',
  '.......Llg......',
  '......Llg.......',
  '.....Llg........',
  '....Llg.........',
  '...LlgL.........',
  '..LlgggL........',
  '..LgG.GL........',
  '...L..L.........',
  '................',
  '................',
  '................',
] });
defineIcon('ach_coins', { rows: [
  '................',
  '.....KKKKKK.....',
  '....KZYYYYZK....',
  '....KyYYYYyK....',
  '....KKKKKKKK....',
  '...KZYYYYYYZK...',
  '...KyyYYYYyyK...',
  '...KKKKKKKKKK...',
  '..KZYYYYYYYYZK..',
  '..KyyYYYYYYyyK..',
  '..KKKKKKKKKKKK..',
  '.KZYYYYYYYYYYZK.',
  '.KyyyYYYYYYyyyK.',
  '.KKKKKKKKKKKKKK.',
  '................',
  '................',
] });
defineIcon('ach_yokai', { rows: [
  '.......K........',
  '......KRK.......',
  '.....KRRRK......',
  '....KRRRRRK.....',
  '...KRRWWWRRK....',
  '..KRRRWKWRRRK...',
  '.KRRRRWWWRRRRK..',
  'KrrrrrrrrrrrrrK.',
  '.KKKKKKKKKKKKK..',
  '.......N..PP....',
  '.......N..P.....',
  '.......N........',
  '.......N........',
  '......NNN.......',
  '.....N...N......',
  '................',
] });
