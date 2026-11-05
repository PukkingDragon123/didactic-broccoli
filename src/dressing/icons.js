// Hand-pixelled 16x16 icons for the dressing room's tabs and stamps (same palette letters as src/gfx/icons.js; the
// icon renderer adds the 1-texel ink outline). Hats, tops, glasses, bags and shoes reuse the closet's cos_* icons.
import { defineIcon } from '../gfx/icons.js';

let done = false;
export function installDressIcons() {
  if (done) return;
  done = true;
  // a boxwood comb (kushi)
  defineIcon('dr_hair', { rows: [
    '................',
    '................',
    '................',
    '....AAAAAAAA....',
    '...AAAAAAAAAT...',
    '..ATTTTTTTTTTt..',
    '..TtttttttttTt..',
    '..T.T.T.T.T.Tt..',
    '..T.T.T.T.T.T...',
    '..T.T.T.T.T.T...',
    '..t.t.t.t.t.t...',
    '..t.t.t.t.t.t...',
    '................',
    '................',
    '................',
    '................',
  ] });
  // a bottle of hair dye with a drip
  defineIcon('dr_dye', { rows: [
    '................',
    '......kkk.......',
    '......KKK.......',
    '.....VVVVV......',
    '.....vVVVv......',
    '....IVVVVVv.....',
    '....IVwwwVv.....',
    '....IVwPwVv.....',
    '....IVwwwVv.....',
    '....IVVVVVv.....',
    '....IVVVVVv.....',
    '....IVVVVVv..P..',
    '.....vvvvv...p..',
    '................',
    '................',
    '................',
  ] });
  // a face with rosy cheeks
  defineIcon('dr_face', { rows: [
    '................',
    '.....hhhhhh.....',
    '...hhhhhhhhhh...',
    '..hhhhhhhhhhhi..',
    '..hhhhhhhhhhhi..',
    '.hhhKKhhhhKKhhi.',
    '.hhhKhhhhhKhhhi.',
    '.hhhhhhhhhhhhhi.',
    '.hSShhhhhhhSShi.',
    '.hhhhhhhhhhhhji.',
    '..hhhhKKKKhhhj..',
    '..ihhhhhhhhhjj..',
    '...iijjjjjjjj...',
    '.....jjjjjj.....',
    '................',
    '................',
  ] });
  // three skin-tone paint chips fanned out
  defineIcon('dr_skin', { rows: [
    '................',
    '................',
    '..wwwwww........',
    '..whhhhw........',
    '..whhhhwwwww....',
    '..whhhhwjjjw....',
    '..whhhhwjjjwwww.',
    '..whhhhwjjjwMMw.',
    '..wwwwwwjjjwMMw.',
    '.......wjjjwMMw.',
    '.......wwwwwMMw.',
    '...........wMMw.',
    '...........wwww.',
    '................',
    '................',
    '................',
  ] });
  // jeans with a belt
  defineIcon('dr_pants', { rows: [
    '................',
    '...NNNNNNNNNN...',
    '...NNNNYNNNNN...',
    '...BBBBBBBBBB...',
    '...BCBBBbBBBB...',
    '...BCBBBbBBBB...',
    '...BBBBBbBBBB...',
    '...BBBBb.BBBB...',
    '...BBBBb.BBBB...',
    '...BBBBb.BBBb...',
    '...BBBb..BBBb...',
    '...BBBb..BBBb...',
    '...xxxx..xxxx...',
    '................',
    '................',
    '................',
  ] });
  // a dress form on its stand
  defineIcon('dr_body', { rows: [
    '.......nn.......',
    '......AAAA......',
    '....ATTTTTTt....',
    '...ATTTTTTTTt...',
    '...TTTTTTTTTt...',
    '....TTTTTTTt....',
    '....TTTTTTTt....',
    '.....TTTTTt.....',
    '....TTTTTTTt....',
    '...TTTTTTTTTt...',
    '....tttttttt....',
    '.......nn.......',
    '.......nn.......',
    '.......nn.......',
    '.....nnnnnn.....',
    '................',
  ] });
  // a red hanko seal with a padlock (locked pieces)
  defineIcon('dr_seal', { outline: false, shadow: false, rows: [
    '................',
    '.RRRRRRRRRRRRRR.',
    '.R............R.',
    '.R....RRRR....R.',
    '.R...R....R...R.',
    '.R...R....R...R.',
    '.R..RRRRRRRR..R.',
    '.R..RRRRRRRR..R.',
    '.R..RRR..RRR..R.',
    '.R..RRR..RRR..R.',
    '.R..RRRRRRRR..R.',
    '.R..RRRRRRRR..R.',
    '.R............R.',
    '.RRRRRRRRRRRRRR.',
    '................',
    '................',
  ] });
}
