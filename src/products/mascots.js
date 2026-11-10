// The brand mascots: little characters hand-built pixel by pixel from flat shapes, each with a face and a few poses, and
// a hard ink outline. One function per character: (pose, o) -> Px (transparent round it), 30-46 px tall.
// Every one of them is an original for this game's invented brands.
//   MASCOTS.bancho('cross' | 'thumb' | 'cup')     the coffee-bean delinquent of Ganko Coffee
//   MASCOTS.puku('float' | 'blow' | 'pop', { col })   the pufferfish of Puku Pop soda (takes the flavour's colour)
//   MASCOTS.chako('stand' | 'sip' | 'leaf')        the warbler in a tea-picker's hat, Chabashira-en
//   MASCOTS.momo('wave' | 'drink' | 'sleep')       the calf of Momo Dairy
//   MASCOTS.shizuku('run' | 'flex' | 'cheer')      the water-drop athlete of Nami Sports
//   MASCOTS.kokekko('flex' | 'crow' | 'point')     the rooster of Genkin Pharma
//   MASCOTS.fukuro('mug' | 'wink' | 'doze')        the night owl of Fukuro Brewery
//   MASCOTS.nabe('ladle' | 'steam' | 'bow')        the clay pot of Hokkori Foods
//   MASCOTS.nazo('shrug' | 'peek' | 'float')       the ghost of Nazo Shokai
//   + one-product characters: peppo, neko (cup noodles), chuta (puff stick), kamepan (bread), hotaru (lamps),
//     biri (batteries), mogu (fertiliser), omusubi (rice balls)
import { Px, NONE, dk, lt, mix } from './px.js';

export const INK = 0x2e1f28;
const WHITE = 0xfffaf0, PINK = 0xf8a8a8, RED = 0xe0443a;

/** A limb: an inked path with a coloured core (t wide). */
function limb(p, pts, c, t = 2, ink = INK) { p.path(pts, ink, t + 2); p.path(pts, c, t); }
/** A hand / foot blob with its ink. */
function blob(p, cx, cy, rx, ry, c, ink = INK) { p.ell(cx, cy, rx + 1, ry + 1, ink); p.ell(cx, cy, rx, ry, c); }
/** One eye at (x, y) = its top-left; kinds: dot, big, happy, closed, stern, wide, tiny. */
function eye(p, x, y, kind = 'dot', ink = INK) {
  if (kind === 'dot') { p.rect(x, y, 2, 3, ink); p.set(x, y, WHITE); }
  else if (kind === 'big') { p.rect(x, y, 3, 4, ink); p.set(x, y, WHITE); p.set(x + 1, y, WHITE); p.set(x, y + 1, WHITE); }
  else if (kind === 'happy') { p.set(x - 1, y + 2, ink); p.set(x, y + 1, ink); p.set(x + 1, y, ink); p.set(x + 2, y + 1, ink); p.set(x + 3, y + 2, ink); }
  else if (kind === 'closed') { p.set(x - 1, y + 1, ink); p.rect(x, y + 2, 3, 1, ink); p.set(x + 3, y + 1, ink); }
  else if (kind === 'stern') { p.rect(x, y + 1, 2, 2, ink); }
  else if (kind === 'wide') { p.rect(x - 1, y - 1, 4, 5, WHITE); p.frame(x - 1, y - 1, 4, 5, ink); p.rect(x, y + 1, 2, 2, ink); }
  else if (kind === 'tiny') p.rect(x, y + 1, 1, 2, ink);
}
/** A mouth centred on x; kinds: smile, grin, open, o, flat, frown, cat. */
function mouth(p, x, y, kind = 'smile', ink = INK) {
  if (kind === 'smile') { p.set(x - 2, y, ink); p.rect(x - 1, y + 1, 3, 1, ink); p.set(x + 2, y, ink); }
  else if (kind === 'grin') { p.rect(x - 3, y, 7, 3, ink); p.rect(x - 2, y, 5, 2, WHITE); p.set(x, y + 1, ink); }
  else if (kind === 'open') { p.rect(x - 2, y, 5, 1, ink); p.rect(x - 1, y + 1, 3, 2, ink); p.rect(x - 1, y + 1, 3, 1, 0xd8463a); p.set(x, y + 2, 0xf08a8a); }
  else if (kind === 'o') { p.rect(x - 1, y, 3, 3, ink); p.set(x, y + 1, 0xd8463a); }
  else if (kind === 'flat') p.rect(x - 2, y, 4, 1, ink);
  else if (kind === 'frown') { p.set(x - 2, y + 1, ink); p.rect(x - 1, y, 3, 1, ink); p.set(x + 2, y + 1, ink); }
  else if (kind === 'cat') { p.set(x - 2, y, ink); p.set(x - 1, y + 1, ink); p.set(x, y, ink); p.set(x + 1, y + 1, ink); p.set(x + 2, y, ink); }
}
const cheek = (p, x, y, c = PINK) => { p.rect(x, y, 2, 1, c); };
/** Finish a sprite: ink round the silhouette, trimmed. */
const done = (p, ink = INK) => p.outline(ink).trim();
/** Cartoon steam: a wavy white wisp rising from (x, y). */
function wisp(p, x, y, h, c = WHITE, ph = 0) { for (let i = 0; i < h; i++) { const dx = Math.round(Math.sin((i + ph) * 0.9) * 1.2); p.rect(x + dx, y - i, 2, 1, c); } }

export const MASCOTS = {
  // ------------------------------------------------------------ Ganko Coffee: Mame Bancho, a coffee bean with a quiff
  bancho(pose = 'cross') {
    const p = new Px(50, 50), BEAN = 0xb06a36, BD = 0x7e4420, BL = 0xd08a4c, CREASE = 0xf2d8a0, COAT = 0x2a3a78, CD = 0x1c2858, GLOVE = WHITE;
    const calm = pose === 'cup';
    // a school coat thrown over his shoulders: the empty sleeves hang at his sides, red lining showing
    p.poly([[12, 22], [7, 38], [12, 40], [16, 26]], COAT); p.poly([[38, 22], [43, 38], [38, 40], [34, 26]], COAT);
    p.rect(8, 37, 4, 2, RED); p.rect(39, 37, 4, 2, RED);
    p.line(10, 27, 9, 34, CD, 1); p.line(40, 27, 41, 34, CD, 1);
    // short legs, wooden clogs with red thongs
    p.rect(19, 41, 4, 3, BD); p.rect(27, 41, 4, 3, BD);
    p.rect(17, 44, 7, 2, 0xd8a868); p.rect(26, 44, 7, 2, 0xd8a868);
    for (const x of [17, 22, 26, 31]) p.rect(x, 46, 2, 1, 0x9a6a38);
    p.set(20, 44, RED); p.set(29, 44, RED);
    // the bean: tall, roasted, the pale crease running down its middle
    p.ell(25, 28, 11.5, 14, BEAN);
    p.crescent(25, 28, 11.5, 14, -3, -3, BD);
    p.ell(17.5, 22, 1.5, 4, BL); p.set(18, 17, BL);
    p.path([[25, 15], [24, 20], [26, 26], [24, 32], [25, 41]], BD, 3); p.path([[25, 15], [24, 20], [26, 26], [24, 32], [25, 41]], CREASE, 1);
    // the collar of the coat round his shoulders
    p.poly([[13, 20], [17, 18], [19, 23], [14, 26]], COAT); p.poly([[37, 20], [33, 18], [31, 23], [36, 26]], COAT);
    p.set(16, 22, 0xe8c040); p.set(34, 22, 0xe8c040);
    // the quiff: one big roll of hair jutting out over his brow, in coffee-black with a blue sheen
    const H = 0x2a2030, HL = 0x6a6ea8;
    p.ell(24, 12, 9, 4.5, H); p.ell(32, 11, 7, 5.5, H); p.ell(37, 13, 4, 3.5, H);
    p.path([[17, 10], [22, 8], [29, 7], [35, 7]], HL, 1); p.path([[31, 10], [37, 10]], HL, 1); p.set(39, 12, HL);
    // the face: dark glasses (two happy arcs when he has his coffee)
    if (calm) { eye(p, 18, 23, 'happy'); eye(p, 29, 23, 'happy'); cheek(p, 16, 27, 0xe89a6a); cheek(p, 33, 27, 0xe89a6a); }
    else {
      p.rect(15, 21, 9, 5, INK); p.rect(27, 21, 9, 5, INK); p.rect(24, 22, 3, 1, INK); p.rect(14, 22, 1, 1, INK); p.rect(36, 22, 1, 1, INK);
      p.rect(16, 22, 7, 3, 0x3a4a6a); p.rect(28, 22, 7, 3, 0x3a4a6a); p.rect(16, 22, 2, 1, 0xa8c0e8); p.rect(28, 22, 2, 1, 0xa8c0e8);
    }
    if (pose === 'thumb') { p.rect(20, 29, 7, 3, INK); p.rect(21, 29, 5, 2, WHITE); }
    else if (calm) mouth(p, 25, 29, 'smile');
    else { p.rect(22, 30, 4, 1, INK); p.set(26, 29, INK); }
    if (!calm) { p.line(27, 30, 34, 27, 0xe8d080, 1); p.rect(35, 25, 2, 2, 0x58a84a); p.set(36, 24, 0x58a84a); } // a stalk between his teeth
    // arms
    if (pose === 'cross') {
      limb(p, [[15, 37], [31, 34]], BL, 3); limb(p, [[35, 37], [19, 34]], BL, 3);
      blob(p, 17, 34, 2, 2, GLOVE); blob(p, 33, 34, 2, 2, GLOVE);
    } else if (pose === 'thumb') {
      limb(p, [[15, 33], [12, 37], [16, 39]], BL, 2); blob(p, 17, 39, 2, 2, GLOVE);
      limb(p, [[35, 33], [41, 29], [43, 23]], BL, 2); blob(p, 44, 21, 2.5, 2.5, GLOVE); p.rect(43, 15, 3, 5, INK); p.rect(44, 16, 1, 4, GLOVE);
    } else {
      limb(p, [[15, 34], [20, 38]], BL, 2); limb(p, [[35, 34], [30, 38]], BL, 2);
      p.rect(20, 33, 11, 9, INK); p.rect(21, 34, 9, 7, WHITE); p.rect(21, 37, 9, 2, RED); p.rect(21, 34, 9, 1, 0x4a2a14);
      p.rect(31, 35, 3, 5, INK); p.set(31, 36, WHITE); p.set(31, 37, WHITE); p.set(31, 38, WHITE);
      blob(p, 20, 39, 1.5, 1.5, GLOVE); blob(p, 31, 39, 1.5, 1.5, GLOVE);
    }
    const s = p.outline(INK);
    if (calm) { wisp(s, 22, 6, 6, WHITE, 0); wisp(s, 28, 5, 5, WHITE, 2); }
    return s.trim();
  },

  // ------------------------------------------------------------ Puku Pop: Puku the pufferfish
  puku(pose = 'float', o = {}) {
    const col = o.col ?? 0x3aa0e8, D = dk(col, 0.28), p = new Px(50, 44), FIN = o.fin ?? 0xffd23f;
    const cx = 23.5, cy = 23;
    // tail and fins behind
    p.poly([[9, 23], [2, 16], [4, 23], [2, 30]], FIN); p.line(4, 20, 7, 22, dk(FIN, 0.3), 1); p.line(4, 26, 7, 24, dk(FIN, 0.3), 1);
    p.poly([[21, 9], [25, 5], [28, 10]], FIN);
    // little spikes all round
    for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2 + 0.2, x = Math.round(cx + Math.cos(a) * 14.2 - 0.5), y = Math.round(cy + Math.sin(a) * 13.2 - 0.5); p.rect(x, y, 2, 2, a > 0.3 && a < 2.9 ? WHITE : col); }
    p.ell(cx, cy, 13, 12, col);
    // white belly with a wavy edge, spots on the back
    p.shape(cx - 13, cy - 12, 26, 24, (x, y) => ((x - cx) / 13) ** 2 + ((y - cy) / 12) ** 2 <= 1 && y > cy + 2.5 + Math.sin(x * 0.9) * 1.2, WHITE);
    p.crescent(cx, cy, 13, 12, -3, -4, (x, y) => (y > cy + 3 ? 0xd8dcee : D));
    for (const [x, y] of [[15, 15], [20, 13], [27, 13], [32, 16], [17, 19], [30, 19]]) p.rect(x, y, 2, 2, D);
    p.rect(17, 14, 3, 1, lt(col, 0.5)); p.rect(16, 15, 1, 2, lt(col, 0.5));
    // side fin
    p.ell(33.5, 28, 3.5, 2.5, INK); p.ell(33.5, 28, 2.5, 1.5, FIN);
    // the face
    if (pose === 'pop') { eye(p, 21, 20, 'wide'); eye(p, 29, 20, 'wide'); mouth(p, 26, 27, 'o'); }
    else if (pose === 'blow') { eye(p, 21, 20, 'happy'); eye(p, 29, 20, 'happy'); p.rect(25, 25, 4, 4, INK); p.rect(26, 26, 2, 2, 0xf07a6a); }
    else { eye(p, 20, 19, 'big'); eye(p, 28, 19, 'big'); p.rect(24, 25, 3, 3, 0xf07a6a); p.set(25, 26, INK); }
    cheek(p, 17, 24); cheek(p, 32, 24);
    const s = p.outline(INK);
    if (pose === 'blow') { for (const [x, y, r] of [[37, 20, 2.5], [42, 13, 3.5], [38, 6, 2]]) { s.ell(x, y, r + 1, r + 1, INK); s.ell(x, y, r, r, 0xd8f4ff); s.set(Math.round(x - r / 2), Math.round(y - r / 2), WHITE); } }
    if (pose === 'pop') { for (const [x, y] of [[40, 9], [44, 20], [5, 8]]) { s.rect(x, y - 2, 1, 5, FIN); s.rect(x - 2, y, 5, 1, FIN); } }
    return s.trim();
  },

  // ------------------------------------------------------------ Chabashira-en: Chako the warbler, in a tea-picker's hat
  chako(pose = 'stand') {
    const p = new Px(46, 46), G = 0x93a850, GD = 0x6c8238, BELLY = 0xf4eecb, STRAW = 0xe8c878, SD = 0xb8924a;
    // tail
    p.poly([[11, 33], [3, 40], [8, 41], [14, 37]], GD);
    // feet
    for (const x of [18, 25]) { p.rect(x, 39, 1, 3, 0xf0a030); p.rect(x - 1, 42, 4, 1, 0xf0a030); }
    // the round body
    p.ell(22, 28, 11, 11, G);
    p.crescent(22, 28, 11, 11, -3, -3, GD);
    p.ell(23, 31, 7, 6.5, BELLY);
    p.rect(21, 33, 1, 1, SD); p.rect(25, 34, 1, 1, SD); p.rect(23, 36, 1, 1, SD);
    // wing(s)
    if (pose === 'stand') { p.ell(12.5, 29, 3.5, 6, INK); p.ell(12.5, 29, 2.5, 5, GD); p.line(12, 27, 12, 32, dk(GD), 1); limb(p, [[32, 27], [37, 22]], GD, 3); p.line(37, 20, 39, 18, INK, 1); p.line(38, 22, 41, 21, INK, 1); }
    else { p.ell(12.5, 30, 3.5, 5.5, INK); p.ell(12.5, 30, 2.5, 4.5, GD); p.ell(32.5, 30, 3.5, 5.5, INK); p.ell(32.5, 30, 2.5, 4.5, GD); }
    // the face
    if (pose === 'sip') { eye(p, 17, 23, 'happy'); eye(p, 25, 23, 'happy'); } else { eye(p, 18, 22, 'dot'); eye(p, 26, 22, 'dot'); }
    p.poly([[20.5, 25], [25.5, 25], [23, 28.6]], 0xf0a030); p.rect(21, 24, 4, 1, INK);
    cheek(p, 15, 26); cheek(p, 29, 26);
    // the straw hat with its red cord
    p.poly([[22.5, 7], [7, 19], [39, 19]], STRAW);
    p.line(22, 9, 13, 18, SD, 1); p.line(23, 9, 23, 18, SD, 1); p.line(24, 9, 33, 18, SD, 1); p.rect(8, 18, 30, 1, SD);
    p.rect(21, 6, 4, 2, RED);
    p.line(12, 20, 14, 25, RED, 1); p.line(34, 20, 32, 25, RED, 1);
    if (pose === 'sip') {
      // a cup of green tea held in both wings, a stalk standing upright in it
      p.rect(17, 30, 12, 9, INK); p.rect(18, 31, 10, 7, WHITE); p.rect(18, 31, 10, 2, 0x9ac048); p.rect(18, 35, 10, 1, 0x3a6ab8); p.rect(23, 28, 1, 4, 0x4a7a2a);
    }
    if (pose === 'leaf') { limb(p, [[32, 30], [38, 24], [40, 9]], 0x6a8a3a, 1); for (const [x, y, f] of [[41, 8, 1], [36, 13, -1], [42, 16, 1]]) { p.ell(x + f * 2, y, 3.5, 2.5, INK); p.ell(x + f * 2, y, 2.5, 1.5, 0x58a84a); p.set(x + f * 2, y, 0x3a7a2a); } }
    const s = done(p);
    if (pose === 'sip') { const q = new Px(s.w, s.h); q.blit(s, 0, 0); return q; }
    return s;
  },

  // ------------------------------------------------------------ Momo Dairy: Momo the calf
  momo(pose = 'wave') {
    const p = new Px(50, 50), W = WHITE, PATCH = 0x3c3038, MUZ = 0xf8b8b0, HOOF = 0x3c3038;
    // tail
    p.path([[17, 40], [10, 38], [8, 33]], INK, 3); p.path([[17, 40], [10, 38], [8, 33]], W, 1); p.ell(7.5, 31, 2, 2.5, PATCH);
    // body and legs
    p.rect(17, 43, 5, 4, W); p.rect(27, 43, 5, 4, W); p.rect(17, 46, 5, 2, HOOF); p.rect(27, 46, 5, 2, HOOF);
    p.ell(24.5, 38, 9, 8, W);
    p.shape(15, 30, 20, 16, (x, y) => ((x - 24.5) / 9) ** 2 + ((y - 38) / 8) ** 2 <= 1 && ((x - 31) / 5) ** 2 + ((y - 40) / 4.5) ** 2 <= 1, PATCH);
    // ears and horns
    p.ell(8.5, 17, 5, 3, PATCH); p.ell(9, 17.5, 2.5, 1.5, MUZ);
    p.ell(40.5, 17, 5, 3, W); p.ell(40, 17.5, 2.5, 1.5, MUZ);
    p.rect(15, 6, 3, 4, 0xe8d8a0); p.rect(31, 6, 3, 4, 0xe8d8a0);
    // head
    p.ell(24.5, 20, 13, 11, W);
    p.crescent(24.5, 20, 13, 11, -3, -3, 0xdcd8e6);
    p.shape(8, 8, 20, 20, (x, y) => ((x - 24.5) / 13) ** 2 + ((y - 20) / 11) ** 2 <= 1 && ((x - 15.5) / 6) ** 2 + ((y - 16) / 6.5) ** 2 <= 1, PATCH);
    p.rect(22, 8, 2, 2, W); p.rect(24, 7, 2, 3, W); p.rect(26, 8, 2, 2, W); // a tuft
    p.ell(24.5, 26, 8, 5, MUZ); p.rect(21, 25, 2, 2, dk(MUZ, 0.45)); p.rect(26, 25, 2, 2, dk(MUZ, 0.45));
    // the face
    if (pose === 'sleep') { eye(p, 15, 17, 'closed', W); eye(p, 31, 17, 'closed'); }
    else if (pose === 'drink') { eye(p, 15, 16, 'happy', W); eye(p, 31, 16, 'happy'); }
    else { p.ell(16.5, 17.5, 2.5, 3, W); p.rect(16, 16, 2, 3, INK); p.set(16, 16, W); eye(p, 31, 16, 'dot'); }
    if (pose === 'drink') p.rect(20, 28, 9, 1, W); else mouth(p, 24, 28, 'smile', dk(MUZ, 0.55));
    cheek(p, 11, 22); cheek(p, 36, 22);
    // collar and bell
    p.rect(17, 31, 15, 2, RED);
    p.ell(24.5, 34, 3, 3, INK); p.ell(24.5, 34, 2, 2, 0xffd23f); p.rect(24, 34, 1, 2, INK);
    // arms
    if (pose === 'wave') { limb(p, [[33, 36], [39, 30], [41, 24]], W, 2); p.rect(40, 21, 3, 3, HOOF); limb(p, [[16, 36], [14, 41]], W, 2); p.rect(13, 41, 3, 2, HOOF); }
    else if (pose === 'drink') {
      limb(p, [[16, 37], [20, 40]], W, 2); limb(p, [[33, 37], [29, 40]], W, 2);
      p.rect(20, 34, 9, 11, INK); p.rect(21, 35, 7, 9, 0xd8f0ff); p.rect(21, 37, 7, 7, W); p.rect(21, 40, 7, 2, 0x3a8ae0); p.rect(22, 33, 5, 2, INK); p.rect(23, 33, 3, 1, RED);
      p.rect(19, 40, 3, 2, HOOF); p.rect(27, 40, 3, 2, HOOF);
    } else { limb(p, [[16, 37], [20, 41]], W, 2); limb(p, [[33, 37], [29, 41]], W, 2); }
    if (pose === 'sleep') {
      // a nightcap flopping over
      p.poly([[13, 12], [36, 12], [38, 6], [30, 2], [20, 3]], 0x4a7ad8);
      p.poly([[30, 2], [38, 6], [44, 12], [42, 15]], 0x4a7ad8);
      for (let x = 15; x < 36; x += 4) p.rect(x, 6, 2, 2, W);
      p.rect(13, 11, 24, 2, W);
      p.ell(43.5, 16, 2.5, 2.5, W);
    }
    return done(p);
  },

  // ------------------------------------------------------------ Nami Sports: Shizuku-kun, a drop of water in a headband
  shizuku(pose = 'run') {
    const p = new Px(48, 50), B = 0x4ab4f4, BD = 0x2a8ad4, GLOVE = WHITE, SHOE = RED;
    const cx = 24, cy = 28;
    const inside = (x, y) => ((x - cx) / 11) ** 2 + ((y - cy) / 11) ** 2 <= 1 || (y < cy - 4 && y > 5 && Math.abs(x - (cx + (cy - 4 - y) * 0.12)) < (y - 5) * 0.52);
    // limbs behind the body
    if (pose === 'run') {
      limb(p, [[20, 37], [14, 42], [9, 40]], B, 2); blob(p, 8, 39, 3, 2, SHOE); p.rect(7, 39, 3, 1, WHITE);
      limb(p, [[28, 37], [33, 41], [37, 44]], B, 2); blob(p, 39, 45, 3, 2, SHOE); p.rect(38, 45, 3, 1, WHITE);
      limb(p, [[14, 29], [8, 27], [6, 22]], B, 2); blob(p, 6, 20, 2, 2, GLOVE);
      limb(p, [[34, 29], [40, 31], [43, 27]], B, 2); blob(p, 44, 25, 2, 2, GLOVE);
    } else {
      limb(p, [[20, 38], [19, 44]], B, 2); blob(p, 18, 46, 3, 2, SHOE); p.rect(17, 46, 3, 1, WHITE);
      limb(p, [[28, 38], [29, 44]], B, 2); blob(p, 30, 46, 3, 2, SHOE); p.rect(29, 46, 3, 1, WHITE);
      if (pose === 'flex') {
        limb(p, [[14, 28], [8, 27], [8, 20]], B, 3); blob(p, 8, 18, 2.5, 2.5, GLOVE);
        limb(p, [[34, 28], [40, 27], [40, 20]], B, 3); blob(p, 40, 18, 2.5, 2.5, GLOVE);
      } else {
        limb(p, [[15, 25], [9, 17], [8, 11]], B, 2); blob(p, 8, 9, 2.5, 2.5, GLOVE);
        limb(p, [[33, 25], [39, 17], [40, 11]], B, 2); blob(p, 40, 9, 2.5, 2.5, GLOVE); p.rect(39, 4, 1, 4, INK); p.rect(42, 4, 1, 4, INK);
      }
    }
    p.shape(10, 2, 30, 40, inside, B);
    p.shape(10, 2, 30, 40, (x, y) => inside(x, y) && !inside(x + 3, y + 3), BD);
    p.ell(18, 24.5, 1.5, 3, 0xd8f2ff); p.rect(18, 20, 2, 1, 0xd8f2ff);
    // the headband, its tails flying
    p.shape(10, 19, 30, 3, (x, y) => inside(x, y) && y > 19 && y < 22, RED);
    p.rect(22, 20, 4, 1, WHITE);
    p.poly([[13, 20], [6, 16], [5, 19], [12, 22]], RED); p.poly([[13, 21], [5, 23], [6, 26], [13, 23]], RED);
    // the face
    if (pose === 'cheer') { eye(p, 19, 24, 'happy'); eye(p, 27, 24, 'happy'); mouth(p, 24, 29, 'open'); }
    else if (pose === 'flex') { p.line(18, 23, 21, 24, INK, 1); p.line(30, 23, 27, 24, INK, 1); eye(p, 19, 25, 'stern'); eye(p, 28, 25, 'stern'); mouth(p, 24, 30, 'grin'); }
    else { eye(p, 20, 24, 'dot'); eye(p, 28, 24, 'dot'); mouth(p, 25, 29, 'open'); }
    cheek(p, 16, 28); cheek(p, 31, 28);
    const s = p.outline(INK);
    if (pose === 'run') for (const [x, y] of [[3, 30], [1, 35]]) { s.rect(x, y, 2, 3, 0x8ad4ff); s.set(x, y - 1, 0x8ad4ff); }
    return s.trim();
  },

  // ------------------------------------------------------------ Genkin Pharma: Kokekko the rooster
  kokekko(pose = 'flex') {
    const p = new Px(50, 52), W = WHITE, SH = 0xd9d5e6, COMB = 0xe0402c, BEAK = 0xf2a22e, TAIL = 0x2c5e5a, TL = 0x3f8a7a;
    // tail feathers
    p.poly([[13, 34], [2, 20], [6, 18], [15, 28]], TAIL); p.poly([[12, 36], [1, 30], [3, 26], [14, 32]], TL); p.poly([[14, 31], [6, 12], [10, 11], [17, 26]], TL);
    // legs
    for (const x of [20, 28]) { p.rect(x, 44, 2, 4, BEAK); p.rect(x - 2, 48, 6, 1, BEAK); p.set(x - 2, 49, BEAK); p.set(x + 3, 49, BEAK); }
    // body, chest out
    p.ell(25, 35, 11, 10.5, W);
    p.crescent(25, 35, 11, 10.5, -3, -3, SH);
    for (const [x, y] of [[22, 36], [26, 38], [30, 35]]) { p.set(x, y, SH); p.set(x + 1, y + 1, SH); p.set(x + 2, y, SH); }
    const crow = pose === 'crow', hx = crow ? 27 : 26, hy = crow ? 17 : 18;
    // comb, wattle, head
    p.ell(hx - 4, hy - 9, 2.5, 3.5, COMB); p.ell(hx, hy - 10.5, 2.5, 4, COMB); p.ell(hx + 4, hy - 9, 2.5, 3.5, COMB);
    p.ell(hx, hy, 8, 8, W);
    p.crescent(hx, hy, 8, 8, -2, -2, SH);
    if (crow) {
      p.poly([[hx + 5, hy - 5], [hx + 14, hy - 12], [hx + 8, hy - 1]], BEAK); p.poly([[hx + 6, hy], [hx + 13, hy + 1], [hx + 6, hy + 4]], BEAK);
      p.poly([[hx + 6, hy - 2], [hx + 11, hy - 5], [hx + 8, hy]], 0xb02a20);
      eye(p, hx + 1, hy - 4, 'happy');
    } else {
      p.poly([[hx + 6, hy - 2], [hx + 14, hy + 1], [hx + 6, hy + 4]], BEAK); p.line(hx + 7, hy + 1, hx + 12, hy + 1, dk(BEAK, 0.5), 1);
      p.line(hx - 1, hy - 5, hx + 4, hy - 3, INK, 1); p.line(hx - 1, hy - 4, hx + 4, hy - 2, INK, 1);
      p.rect(hx + 2, hy - 2, 2, 3, INK); p.set(hx + 2, hy - 2, W);
    }
    p.ell(hx + 5, hy + 8, 2, 3.5, COMB);
    cheek(p, hx - 3, hy + 2);
    // wings
    if (pose === 'flex') {
      limb(p, [[33, 32], [40, 31], [41, 23]], W, 3); blob(p, 41, 21, 3, 3, W); p.ell(38.5, 30, 2, 2.5, SH);
      limb(p, [[17, 33], [13, 38], [18, 40]], W, 3);
    } else if (pose === 'point') {
      limb(p, [[33, 33], [42, 31]], W, 3); p.rect(43, 30, 4, 2, INK); p.rect(43, 30, 3, 1, W);
      limb(p, [[17, 33], [13, 38], [18, 40]], W, 3);
    } else { limb(p, [[33, 33], [39, 37], [40, 43]], W, 3); limb(p, [[17, 33], [11, 37], [10, 43]], W, 3); }
    const s = p.outline(INK);
    if (crow) for (const [x0, y0, x1, y1] of [[45, 3, 48, 0], [46, 9, 49, 8], [41, 1, 42, -2]]) s.line(x0, Math.max(0, y0), x1, Math.max(0, y1), COMB, 1);
    return s.trim();
  },

  // ------------------------------------------------------------ Fukuro Brewery: the night owl
  fukuro(pose = 'mug') {
    const p = new Px(52, 48), BR = 0x8e5e38, BD = 0x66401f, CREAM = 0xf6e6c2, AMBER = 0xf0b030;
    // feet
    for (const x of [18, 27]) { p.rect(x, 43, 5, 2, 0xf0a030); p.rect(x, 45, 1, 1, 0xf0a030); p.rect(x + 2, 45, 1, 1, 0xf0a030); p.rect(x + 4, 45, 1, 1, 0xf0a030); }
    // ear tufts, body
    p.poly([[11, 16], [10, 4], [18, 11]], BR); p.poly([[36, 16], [37, 4], [29, 11]], BR);
    p.ell(23.5, 27, 14, 17, BR);
    p.crescent(23.5, 27, 14, 17, -4, -4, BD);
    // belly with rows of feather ticks
    p.ell(23.5, 34, 9, 9, CREAM);
    for (let r = 0; r < 3; r++) for (let k = 0; k < 4 - (r === 2 ? 1 : 0); k++) { const x = 17 + k * 4 + (r % 2) * 2, y = 31 + r * 4; p.set(x, y, 0xc8a070); p.set(x + 1, y + 1, 0xc8a070); p.set(x + 2, y, 0xc8a070); }
    // the face: two big discs, heavy lids
    for (const ex of [17, 30]) { p.ell(ex, 19, 6.5, 6.5, BD); p.ell(ex, 19, 5.5, 5.5, CREAM); }
    const lid = (ex, k) => p.shape(ex - 6, 13, 12, 12, (x, y) => ((x - ex) / 5.5) ** 2 + ((y - 19) / 5.5) ** 2 <= 1 && y < 19 - 5.5 + k, 0xb07a4a);
    if (pose === 'doze') { for (const ex of [17, 30]) { lid(ex, 11); p.rect(ex - 3, 20, 6, 1, INK); p.set(ex - 4, 19, INK); p.set(ex + 3, 19, INK); } }
    else {
      for (const ex of [17, 30]) { if (pose === 'wink' && ex === 30) { lid(ex, 11); eye(p, ex - 2, 18, 'happy'); continue; } p.ell(ex + 0.5, 20, 2.6, 3, INK); p.rect(ex - 1, 18, 2, 2, WHITE); lid(ex, 4); p.rect(ex - 5, 17, 10, 1, INK); }
    }
    p.poly([[21.5, 21], [25.5, 21], [23.5, 26]], 0xf0a030); p.rect(22, 21, 3, 1, INK);
    cheek(p, 12, 25, 0xf08a70); cheek(p, 33, 25, 0xf08a70);
    // wings
    p.ell(9.5, 31, 3, 7, INK); p.ell(9.5, 31, 2, 6, BD);
    if (pose === 'mug') {
      limb(p, [[37, 30], [42, 26]], BD, 3);
      // a foaming mug held up
      p.rect(39, 12, 10, 13, INK); p.rect(40, 14, 8, 10, AMBER); p.rect(41, 15, 1, 7, 0xffd870); p.rect(46, 16, 1, 1, 0xffe8a0); p.rect(44, 19, 1, 1, 0xffe8a0);
      p.rect(49, 15, 3, 7, INK); p.rect(49, 17, 1, 3, 0x000000 & 0); p.set(49, 17, AMBER); p.set(49, 18, AMBER); p.set(49, 19, AMBER);
      p.ell(41.5, 11, 2.5, 2.5, WHITE); p.ell(45, 10, 3, 3, WHITE); p.ell(48, 11.5, 2, 2, WHITE); p.rect(40, 12, 9, 2, WHITE); p.rect(40, 14, 2, 3, WHITE);
    } else if (pose === 'wink') { limb(p, [[37, 29], [43, 23]], BD, 3); p.line(44, 21, 46, 18, INK, 1); p.line(45, 23, 48, 22, INK, 1); }
    else { p.ell(37.5, 31, 3, 7, INK); p.ell(37.5, 31, 2, 6, BD); }
    const s = p.outline(INK);
    if (pose === 'doze') { let x = 40, y = 12; for (const k of [3, 2]) { s.rect(x, y, k + 1, 1, 0x8ab0f0); s.line(x + k, y, x, y + k, 0x8ab0f0, 1); s.rect(x, y + k, k + 1, 1, 0x8ab0f0); x += 5; y -= 6; } }
    return s.trim();
  },

  // ------------------------------------------------------------ Hokkori Foods: Nabe-san the clay pot
  nabe(pose = 'ladle') {
    const p = new Px(54, 52), POT = 0xc47a44, PD = 0x96552c, RIM = 0xe6ac70, LID = 0x9a5630, GLZ = 0xf4e6c4, MIT = RED;
    const lift = pose === 'steam' ? 6 : 0, cx = 26.5;
    const bowl = (x, y) => y >= 24 && y <= 45 && Math.abs((x - cx) / 16) ** 2.6 + Math.abs((y - 24) / 21) ** 2.6 <= 1;
    // little feet, the two ear handles
    for (const x of [16, 25, 34]) p.rect(x, 45, 4, 3, PD);
    p.ell(8.5, 28, 3, 2.5, RIM); p.ell(44.5, 28, 3, 2.5, RIM);
    // the bowl: deep and round-bottomed, an unglazed band low down
    p.shape(9, 23, 36, 24, bowl, POT);
    p.shape(9, 23, 36, 24, (x, y) => bowl(x, y) && !bowl(x + 3, y + 2), PD);
    p.shape(9, 40, 36, 6, (x, y) => bowl(x, y) && y > 41, PD);
    p.rrect(8, 22, 37, 4, 2, RIM); p.rect(10, 25, 33, 1, dk(RIM, 0.3));
    // the lid: a low dome, glaze dashes, a knob
    p.shape(12, 10 - lift, 30, 14, (x, y) => ((x - cx) / 14) ** 2 + ((y - (22 - lift)) / 8) ** 2 <= 1 && y < 22 - lift, LID);
    for (let k = 0; k < 6; k++) { const a = Math.PI * (0.16 + k * 0.136), x = Math.round(cx - Math.cos(a) * 10), y = Math.round(21 - lift - Math.sin(a) * 4.5); p.rect(x - 1, y, 2, 1, GLZ); }
    p.rect(24, 11 - lift, 5, 3, LID); p.ell(cx, 10.5 - lift, 4, 2, RIM);
    if (lift) { p.rect(13, 17, 27, 5, 0xf8e8b0); for (const [x, c] of [[15, 0xf0a030], [20, WHITE], [25, 0x7ab84a], [30, 0xf4d040], [35, WHITE]]) p.rect(x, 18, 3, 4, c); }
    // the face on the bowl
    if (pose === 'steam') { eye(p, 19, 30, 'happy'); eye(p, 31, 30, 'happy'); mouth(p, 26, 35, 'open'); }
    else if (pose === 'bow') { eye(p, 19, 30, 'closed'); eye(p, 31, 30, 'closed'); mouth(p, 26, 35, 'smile'); }
    else { eye(p, 20, 30, 'big'); eye(p, 31, 30, 'big'); mouth(p, 26, 36, 'smile'); }
    cheek(p, 15, 35); cheek(p, 36, 35);
    // arms in red mittens
    if (pose === 'ladle') {
      limb(p, [[42, 34], [47, 29]], POT, 2); blob(p, 48, 27, 2.5, 2.5, MIT);
      p.rect(47, 7, 3, 20, INK); p.rect(48, 8, 1, 18, 0xd8dce4); p.ell(48.5, 5, 4.5, 3.5, INK); p.ell(48.5, 5, 3.5, 2.5, 0xd8dce4); p.rect(46, 4, 5, 1, 0xf0b040);
      limb(p, [[11, 34], [6, 38]], POT, 2); blob(p, 5, 39, 2.5, 2.5, MIT);
    } else if (pose === 'bow') { limb(p, [[11, 34], [20, 41]], POT, 2); limb(p, [[42, 34], [33, 41]], POT, 2); blob(p, 22, 41, 2.5, 2.5, MIT); blob(p, 31, 41, 2.5, 2.5, MIT); }
    else { limb(p, [[11, 33], [5, 27]], POT, 2); blob(p, 4, 25, 2.5, 2.5, MIT); limb(p, [[42, 33], [48, 27]], POT, 2); blob(p, 49, 25, 2.5, 2.5, MIT); }
    const s = p.outline(INK);
    const steam = (x, y, h, ph) => { for (let i = 0; i < h; i++) { const dx = Math.round(Math.sin((i + ph) * 0.8) * 1.5); s.rect(x + dx - 1, y - i, 4, 1, INK); } for (let i = 0; i < h; i++) { const dx = Math.round(Math.sin((i + ph) * 0.8) * 1.5); s.rect(x + dx, y - i, 2, 1, WHITE); } };
    if (pose === 'steam') { steam(18, 9, 8, 0); steam(26, 6, 5, 2); steam(34, 9, 8, 4); }
    if (pose === 'ladle') { steam(20, 7, 6, 1); steam(31, 7, 6, 3); }
    return s.trim();
  },

  // ------------------------------------------------------------ Nazo Shokai: Nazo-san, a polite ghost with a question
  nazo(pose = 'shrug') {
    const p = new Px(48, 50), W = WHITE, SH = 0xd6cfe8, Q = 0x8a5ad8;
    const cx = 24, top = 10, hem = pose === 'peek' ? 30 : 40;
    const inside = (x, y) => {
      if (y < top || x < cx - 12 || x > cx + 12) return false;
      if (y < top + 12) return ((x - cx) / 12) ** 2 + ((y - (top + 12)) / 12) ** 2 <= 1;
      if (pose === 'float') { const t = (y - (top + 12)) / (hem - top - 12); return y < hem && Math.abs(x - (cx - t * t * 7)) < 12 - t * t * 9; }
      return y < hem + Math.sin(x * 0.85) * 2.2;
    };
    // the question-mark curl
    p.path([[24, 11], [24, 7], [27, 5], [30, 3], [29, 0], [25, 0], [22, 2]], Q, 2);
    p.shape(8, 8, 32, 40, inside, W);
    p.shape(8, 8, 32, 40, (x, y) => inside(x, y) && !inside(x + 3, y + 2), SH);
    // odd eyes, a small mouth, a bow tie
    p.ell(19.5, 20.5, 3, 3.5, INK); p.rect(18, 18, 2, 2, W); p.ell(29, 21, 1.8, 2.2, INK);
    if (pose === 'shrug') mouth(p, 24, 27, 'flat'); else if (pose === 'float') mouth(p, 24, 26, 'o'); else mouth(p, 24, 27, 'cat');
    cheek(p, 14, 25, 0xc8b8f0); cheek(p, 32, 25, 0xc8b8f0);
    if (pose !== 'peek') { p.poly([[24, 32], [19, 29], [19, 35]], RED); p.poly([[24, 32], [29, 29], [29, 35]], RED); p.rect(23, 31, 2, 3, dk(RED, 0.3)); }
    // arms
    if (pose === 'shrug') { limb(p, [[13, 28], [7, 26], [4, 22]], W, 2); blob(p, 4, 20, 2.5, 2, W); limb(p, [[35, 28], [41, 26], [44, 22]], W, 2); blob(p, 44, 20, 2.5, 2, W); }
    else if (pose === 'peek') { p.rect(4, 30, 40, 3, 0xc8a070); blob(p, 14, 30, 3, 2.5, W); blob(p, 34, 30, 3, 2.5, W); }
    else { limb(p, [[35, 26], [41, 22]], W, 2); blob(p, 42, 20, 2.5, 2.5, W); }
    const s = p.outline(INK);
    if (pose === 'peek') { s.cut(0, 33, s.w, 20); s.rect(3, 32, 42, 1, INK); }
    return s.trim();
  },

  // ------------------------------------------------------------ one-product characters
  /** Mr. Peppo: a gentleman's head, bowler hat, monocle, a heroic moustache. */
  peppo() {
    const p = new Px(40, 40), SKIN = 0xf6caa2, HAT = 0x2e1f28, BAND = 0xb0283a;
    p.ell(20, 23, 10, 10, SKIN);
    p.crescent(20, 23, 10, 10, -3, -3, dk(SKIN, 0.18));
    p.ell(9.5, 24, 2, 3, SKIN); p.ell(30.5, 24, 2, 3, SKIN);
    // bowler
    p.shape(9, 2, 22, 14, (x, y) => ((x - 20) / 10) ** 2 + ((y - 14) / 10) ** 2 <= 1 && y < 14, HAT);
    p.rect(10, 11, 20, 3, BAND); p.rrect(5, 14, 30, 3, 1, HAT);
    p.rect(13, 6, 4, 1, 0x6a5a70); p.rect(12, 7, 1, 2, 0x6a5a70);
    // monocle on a chain, an eye, a wink of an eyebrow
    p.ring(25.5, 21.5, 4, 4, 1, 0xe8c040); p.rect(24, 20, 2, 3, INK); p.set(24, 20, WHITE); p.line(29, 24, 32, 32, 0xe8c040, 1);
    eye(p, 14, 20, 'happy'); p.rect(13, 17, 4, 1, INK); p.rect(23, 16, 5, 1, INK);
    p.rect(19, 23, 2, 3, dk(SKIN, 0.3));
    // the moustache: two big curls
    p.ell(15.5, 28, 4.5, 2.5, INK); p.ell(24.5, 28, 4.5, 2.5, INK); p.rect(10, 25, 2, 2, INK); p.set(9, 24, INK); p.rect(28, 25, 2, 2, INK); p.set(30, 24, INK);
    p.rect(18, 31, 4, 1, 0xb0283a);
    // bow tie
    p.poly([[20, 36], [14, 33], [14, 39]], BAND); p.poly([[20, 36], [26, 33], [26, 39]], BAND); p.rect(19, 35, 2, 3, dk(BAND, 0.3));
    return done(p);
  },
  /** Neko-jirushi's cat: a lucky-cat face with chopsticks and a noodle. */
  neko(pose = 'slurp') {
    const p = new Px(44, 40), W = WHITE, O = 0xf0a040;
    p.poly([[8, 16], [8, 4], [17, 10]], W); p.poly([[36, 16], [36, 4], [27, 10]], O);
    p.poly([[10, 13], [10, 8], [14, 11]], PINK); p.poly([[34, 13], [34, 8], [30, 11]], PINK);
    p.ell(22, 21, 14, 12, W);
    p.shape(8, 9, 28, 24, (x, y) => ((x - 22) / 14) ** 2 + ((y - 21) / 12) ** 2 <= 1 && ((x - 32) / 8) ** 2 + ((y - 13) / 7) ** 2 <= 1, O);
    p.crescent(22, 21, 14, 12, -3, -3, 0xdcd8e6);
    eye(p, 15, 18, 'happy'); eye(p, 27, 18, 'happy');
    p.rect(21, 22, 3, 2, PINK); mouth(p, 22, 25, 'cat');
    for (const s of [-1, 1]) { p.line(22 + s * 9, 23, 22 + s * 15, 22, INK, 1); p.line(22 + s * 9, 25, 22 + s * 15, 26, INK, 1); }
    cheek(p, 11, 24); cheek(p, 32, 24);
    p.rect(13, 32, 19, 2, RED); p.ell(22.5, 35, 2.5, 2.5, 0xffd23f); p.set(22, 36, INK);
    if (pose === 'slurp') { p.path([[22, 27], [23, 30], [22, 33], [24, 36]], 0xf4d890, 2); }
    return done(p);
  },
  /** Chu-ta, the puff stick's mouse, hugging a wedge of cheese. */
  chuta() {
    const p = new Px(40, 40), G = 0xb8b4c8, GD = 0x8a86a0;
    p.path([[10, 34], [4, 32], [3, 27], [6, 24]], PINK, 1);
    p.ell(11, 10, 6, 6, G); p.ell(11, 10, 3.5, 3.5, PINK); p.ell(29, 10, 6, 6, G); p.ell(29, 10, 3.5, 3.5, PINK);
    p.ell(20, 19, 11, 9.5, G); p.crescent(20, 19, 11, 9.5, -3, -3, GD);
    p.ell(20, 31, 8, 6.5, G); p.ell(20, 32, 5, 4.5, WHITE);
    eye(p, 15, 17, 'big'); eye(p, 23, 17, 'big');
    p.rect(19, 22, 3, 2, PINK); p.rect(19, 24, 3, 3, WHITE); p.rect(20, 24, 1, 3, 0xd8d0c0);
    cheek(p, 11, 21); cheek(p, 27, 21);
    // the cheese
    p.poly([[22, 27], [36, 31], [36, 38], [22, 38]], 0xffd23f); p.poly([[22, 27], [36, 31], [22, 31]], 0xffe880);
    for (const [x, y] of [[26, 34], [32, 35], [29, 32]]) p.rect(x, y, 2, 2, 0xe8a820);
    blob(p, 22, 32, 2, 2, G); blob(p, 28, 37, 2, 2, G);
    p.rect(14, 36, 4, 2, PINK); p.rect(22, 38, 0, 0, PINK);
    return done(p);
  },
  /** Kame-pan: a tortoise whose shell is a melon bun. */
  kamepan() {
    const p = new Px(44, 34), SK = 0x8ac06a, BUN = 0xf2cf72, BD = 0xd8a850;
    p.ell(8, 26, 4, 3, SK); p.ell(30, 28, 4, 3, SK); p.ell(14, 29, 4, 3, SK); p.poly([[3, 20], [0, 23], [5, 23]], SK);
    p.ell(35, 15, 6.5, 6, SK); p.crescent(35, 15, 6.5, 6, -2, -2, dk(SK, 0.2));
    eye(p, 36, 13, 'dot'); mouth(p, 37, 18, 'smile'); cheek(p, 32, 17);
    p.shape(3, 4, 30, 24, (x, y) => ((x - 18) / 14) ** 2 + ((y - 24) / 17) ** 2 <= 1 && y < 25, BUN);
    p.shape(3, 4, 30, 24, (x, y) => ((x - 18) / 14) ** 2 + ((y - 24) / 17) ** 2 <= 1 && y < 25 && ((x + y) % 7 === 0 || (x - y + 70) % 7 === 0), BD);
    p.rect(4, 24, 28, 2, dk(BUN, 0.3));
    p.rect(11, 10, 4, 1, 0xfff0c0); p.rect(10, 11, 1, 3, 0xfff0c0);
    return done(p);
  },
  /** Hotaru: the firefly of the lamp maker, tail alight. */
  hotaru() {
    const p = new Px(40, 36), B = 0x34303c, GL = 0xd8f060;
    p.ell(11, 12, 7, 4, 0xd8ecf8); p.ell(27, 10, 7, 4, 0xd8ecf8); p.line(7, 12, 14, 12, 0xa8c8e0, 1); p.line(24, 10, 31, 10, 0xa8c8e0, 1);
    p.ell(19, 22, 6, 9, B); p.shape(12, 24, 14, 9, (x, y) => ((x - 19) / 6) ** 2 + ((y - 22) / 9) ** 2 <= 1 && y > 25, GL);
    p.rect(14, 25, 10, 1, 0xa8c030); p.rect(15, 28, 8, 1, 0xa8c030);
    p.ell(19, 11, 6, 5.5, RED); p.crescent(19, 11, 6, 5.5, -2, -2, dk(RED, 0.25));
    eye(p, 15, 9, 'dot'); eye(p, 21, 9, 'dot'); mouth(p, 19, 13, 'smile');
    p.line(16, 6, 13, 1, INK, 1); p.line(22, 6, 25, 1, INK, 1); p.rect(12, 0, 2, 2, INK); p.rect(25, 0, 2, 2, INK);
    const s = p.outline(INK);
    for (const [x, y] of [[9, 30], [29, 30], [19, 34], [6, 25], [32, 25]]) s.rect(x, y, 2, 1, GL);
    return s.trim();
  },
  /** Biri-kun: a lightning bolt with a grin (batteries). */
  biri() {
    const p = new Px(34, 42), Y = 0xffd23f;
    p.poly([[20, 1], [7, 22], [15, 22], [10, 40], [28, 16], [19, 16], [26, 1]], Y);
    p.poly([[24, 1], [26, 1], [19, 16], [17, 16]], 0xffeb90);
    eye(p, 13, 17, 'dot'); eye(p, 19, 17, 'dot'); mouth(p, 17, 22, 'grin');
    limb(p, [[9, 21], [4, 17]], Y, 1); limb(p, [[25, 19], [30, 15]], Y, 1);
    blob(p, 3, 15, 2, 2, WHITE); blob(p, 31, 13, 2, 2, WHITE);
    return done(p);
  },
  /** Mogu: a mole in a straw hat with a trowel (fertiliser). */
  mogu() {
    const p = new Px(40, 38), M = 0x7a5a48, MD = 0x5a3e30;
    p.ell(20, 26, 11, 10, M); p.crescent(20, 26, 11, 10, -3, -3, MD); p.ell(20, 29, 6, 5.5, 0xe8c8a8);
    p.ell(20, 21, 4.5, 3, PINK); p.rect(19, 20, 3, 2, 0xd86a6a);
    eye(p, 13, 17, 'tiny'); eye(p, 26, 17, 'tiny'); mouth(p, 20, 25, 'smile');
    p.poly([[20, 3], [6, 14], [34, 14]], 0xe8c878); p.rect(6, 13, 28, 2, 0xb8924a); p.rect(18, 2, 4, 2, 0x58a84a);
    blob(p, 9, 28, 3, 2.5, PINK); blob(p, 31, 28, 3, 2.5, PINK);
    p.rect(32, 14, 2, 12, 0xa87a4a); p.poly([[30, 6], [36, 6], [35, 14], [31, 14]], 0xc8ccd4);
    return done(p);
  },
  /** Omusubi-kun: a rice ball with a nori belt and a face. */
  omusubi(o = {}) {
    const p = new Px(34, 32);
    p.poly([[17, 2], [29, 22], [26, 28], [8, 28], [5, 22]], WHITE);
    p.ell(17, 6, 4, 4, WHITE); p.ell(8, 24, 4, 4, WHITE); p.ell(26, 24, 4, 4, WHITE);
    p.rect(10, 20, 14, 9, 0x26342a); p.rect(11, 21, 2, 1, 0x3e5244); p.rect(18, 24, 3, 1, 0x3e5244);
    eye(p, 13, 12, 'dot'); eye(p, 20, 12, 'dot'); mouth(p, 17, 16, 'smile'); cheek(p, 10, 15); cheek(p, 23, 15);
    if (o.dot) p.ell(17.5, 5.5, 2, 2, o.dot);
    return done(p);
  },
};

export { limb, blob, eye, mouth, cheek, wisp, NONE, mix };
