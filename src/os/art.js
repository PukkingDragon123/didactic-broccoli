// Capsule 98 pixel art: desktop / app icons (registered in the shared icon set, so iconHTML('os_mail') works
// anywhere), tiny chrome glyphs (window buttons, arrows, ticks), the wallpapers and the little contact portraits.
// Everything is hand-pixelled grids or drawn pixel by pixel, scaled up with nearest-neighbour only.
import { defineIcon, iconHTML, iconURL, iconCanvas } from '../gfx/icons.js';
import { Pix } from '../gfx/pix.js';
import { hash2 } from '../core/util.js';

// ------------------------------------------------------------------ icons (16 x 16, shared palette letters)
const ICONS = {
  // the Capsule 98 logo: a capsule whose lower half is four coloured panels
  os_logo: { rows: [
    '.....WWWWWW.....',
    '...WWWWWWWWWW...',
    '..WWWWWWWWWWuW..',
    '.WWWWWWWWWWWWuW.',
    '.WWWWWWWWWWWWWu.',
    'WWWWWWWWWWWWWWWu',
    'kkkkkkkkkkkkkkkk',
    'RRRRYYYYEEEEBBBB',
    'RQRRYZYYEFEEBCBB',
    'RRRrYYYyEEEeBBBb',
    '.RRrYYYyEEEeBBb.',
    '.RRrYYYyEEEeBBb.',
    '..RrYYYyEEEeBb..',
    '...rrYYyEEebb...',
    '.....yyyeeee....',
  ] },
  os_globe: { rows: [
    '.....bBBBBb.....',
    '...bBCCBBEEBb...',
    '..bCCBBBEEEEBb..',
    '.bCBEEBBBEEEBBb.',
    '.BBEEEEBBBEEBBb.',
    'bBBEEEEEBBBBBBBb',
    'BBBBEEEBBBBEEBBb',
    'BBBBBEEBBBEEEEBb',
    'BBBBBBEEBBEEEEBb',
    'BBBBBBEEEBBEEBBb',
    'bBBBBBEEBBBBBBbb',
    '.bBBBBBEBBBBBBb.',
    '.bbBBBBBBBBBBbb.',
    '..bbbBBBBBBbbb..',
    '....bbbbbbbb....',
  ] },
  os_chat: { rows: [
    '.YYYYYYYYYY.....',
    'YZZZZZZZZZZY....',
    'YZZZZZZZZZZy....',
    'YZZkZZkZZkZy....',
    'YZZZZZZZZZZy....',
    'YZZZZZZZZZZy....',
    '.yyZZyySSSSSSSS.',
    '...YZySPPPPPPPPS',
    '...Yy.SPPPPPPPPp',
    '....y.SPWPPWPPWp',
    '......SPPPPPPPPp',
    '......SPPPPPPPPp',
    '.......ppPPpppp.',
    '...........pPp..',
    '............pp..',
  ] },
  os_mail: { rows: [
    '................',
    '................',
    'WWWWWWWWWWWWWWWW',
    'WuWWWWWWWWWWWWuw',
    'WWuWWWWWWWWWWuWw',
    'WWWuWWWWWWWWuWWw',
    'WWWWuWWWWWWuWWWw',
    'WWWWWuWQRWuWWWWw',
    'WWWWWWuRRuWWWWWw',
    'WWWWWuWuuWuWWWWw',
    'WWWWuWWWWWWuWWWw',
    'WWWuWWWWWWWWuWWw',
    'WWuWWWWWWWWWWuWw',
    'wwwwwwwwwwwwwwww',
  ] },
  os_bank: { rows: [
    '.......YY.......',
    '.....YYZZYY.....',
    '...YYZZZZZZYY...',
    '.YYZZZZYZZZZZYy.',
    'yyyyyyyyyyyyyyyy',
    '.wWw.wWw.wWw.wWw',
    '.wWu.wWu.wWu.wWu',
    '.wWu.wWu.wWu.wWu',
    '.wWu.wWu.wWu.wWu',
    '.wWu.wWu.wWu.wWu',
    '.wWu.wWu.wWu.wWu',
    'uuuuuuuuuuuuuuuu',
    'AAAAAAAAAAAAAAAA',
    'TTTTTTTTTTTTTTTt',
  ] },
  os_cal: { rows: [
    '..k..k..k..k....',
    'RRkRRkRRkRRkRRR.',
    'RQkQQkQQkQQkQQRr',
    'RQQQQQQQQQQQQQRr',
    'WWWWWWWWWWWWWWWu',
    'WkkWkkWkkWkkWkku',
    'WWWWWWWWWWWWWWWu',
    'WkkWkkWRRWkkWkku',
    'WWWWWWWRRWWWWWWu',
    'WkkWkkWkkWkkWkku',
    'WWWWWWWWWWWWWWWu',
    'WkkWkkWkkWWWWWWu',
    'WWWWWWWWWWWWWWWu',
    'uuuuuuuuuuuuuuuu',
  ] },
  os_codex: { rows: [
    '..RRRRRRRRRRRR..',
    '.RQQQQQQQQQQQRw.',
    '.RQRRRRRRRRRQRw.',
    '.RQRRRWWWWRRQRw.',
    '.RQRRWWWWWWRQRw.',
    '.RQRRWWWWWuRQRw.',
    '.RQRRkkkkkkRQRw.',
    '.RQRRYYYYYyRQRw.',
    '.RQRRYYYYYyRQRw.',
    '.RQRRRyyyyRRQRw.',
    '.RQRRRRRRRRRQRw.',
    '.RQQQQQQQQQQQRw.',
    '.RRRRRRRRRRRRRw.',
    '.rrrrrrrrrrrrrw.',
    '..wwwwwwwwwwwww.',
  ] },
  os_note: { rows: [
    '..k.k.k.k.k.k...',
    '.kWkWkWkWkWkWk..',
    '.ZZZZZZZZZZZZZZ.',
    '.ZZZZZZZZZZZZZy.',
    '.ZBBBBBBBBBBBZy.',
    '.ZZZZZZZZZZZZZy.',
    '.ZBBBBBBBBBZZZy.',
    '.ZZZZZZZZZZZZZy.',
    '.ZBBBBBBBBBBBZy.',
    '.ZZZZZZZZZZZZZy.',
    '.ZBBBBBBZZZZZZy.',
    '.ZZZZZZZZZZZZZy.',
    '.ZZZZZZZZZZZZZy.',
    '.yyyyyyyyyyyyyy.',
  ] },
  os_txt: { rows: [
    '.WWWWWWWWW......',
    '.WWWWWWWWWu.....',
    '.WkkkkkkWWuu....',
    '.WWWWWWWWWuuu...',
    '.WkkkkkkkkWWWu..',
    '.WWWWWWWWWWWWu..',
    '.WkkkkkkkkkkWu..',
    '.WWWWWWWWWWWWu..',
    '.WkkkkkkkWWWWu..',
    '.WWWWWWWWWWWWu..',
    '.WkkkkkkkkkkWu..',
    '.WWWWWWWWWWWWu..',
    '.uuuuuuuuuuuuu..',
  ] },
  os_bin: { rows: [
    '...lllllllllll..',
    '..LLLLLLLLLLLLl.',
    '...LgLgLgLgLgg..',
    '...LgLgLgLgLgg..',
    '...lgLgLgLgLgG..',
    '...lgLgLgLgLgG..',
    '....gLgLgLgLG...',
    '....gLgLgLgLG...',
    '....glgLgLglG...',
    '....glglglglG...',
    '.....gggggggG...',
    '.....GGGGGGG....',
  ] },
  os_bin_full: { rows: [
    '....WW.ZZZ.wW...',
    '...WuWZZZZWWuw..',
    '..LLLLLLLLLLLLl.',
    '...LgLgLgLgLgg..',
    '...LgLgLgLgLgg..',
    '...lgLgLgLgLgG..',
    '...lgLgLgLgLgG..',
    '....gLgLgLgLG...',
    '....gLgLgLgLG...',
    '....glgLgLglG...',
    '....glglglglG...',
    '.....gggggggG...',
    '.....GGGGGGG....',
  ] },
  os_power: { rows: [
    '.......RR.......',
    '...RR..QR..RR...',
    '..RR...QR...RR..',
    '.RR....QR....RR.',
    '.R.....QR.....r.',
    'RR.....QR.....rr',
    'RR............rr',
    'RR............rr',
    'RR............rr',
    '.R............r.',
    '.RR..........rr.',
    '..RR........rr..',
    '...RRr....rrr...',
    '.....rrrrrr.....',
  ] },
  os_folder: { rows: [
    '.YYYYY..........',
    'YZZZZZY.........',
    'YZZZZZZYYYYYYYY.',
    'YZZZZZZZZZZZZZZy',
    'YyyyyyyyyyyyyyyY',
    'YZZZZZZZZZZZZZZy',
    'YZZZZZZZZZZZZZZy',
    'YZZZZZZZZZZZZZZy',
    'YZZZZZZZZZZZZZZy',
    'YZZZZZZZZZZZZZZy',
    'yyyyyyyyyyyyyyyy',
  ] },
  os_pc: { rows: [
    '.wwwwwwwwwwwww..',
    '.wDDDDDDDDDDDwu.',
    '.wDccccccccDDwu.',
    '.wDcdcccccccDwu.',
    '.wDccccccccDDwu.',
    '.wDcccccccccDwu.',
    '.wDDDDDDDDDDDwu.',
    '.wwwwwwwwwFwwwu.',
    '..uuuuuuuuuuuu..',
    '.....wwwww......',
    '..wwwwwwwwwww...',
    '.wwwwwwwwwwwwwu.',
    '.uuuuuuuuuuuuuu.',
  ] },
  os_news: { rows: [
    '..wwwwwwwwwwwww.',
    '.wWWWWWWWWWWWWWu',
    '.wKKKKKKKKKKKKWu',
    '.wWWWWWWWWWWWWWu',
    '.wllllllWkkkkkWu',
    '.wlggggl.WWWWWWu',
    '.wlggggl.Wkkkkwu',
    '.wllllllWWWWWWWu',
    '.wWWWWWWWWWWWWWu',
    '.wkkkkkWkkkkkkWu',
    '.wWWWWWWWWWWWWWu',
    '.wkkkkWWkkkkkWWu',
    '.uuuuuuuuuuuuuuu',
  ] },
  os_sun: { rows: [
    '.......Y........',
    '...Y...Y...Y....',
    '....Y.....Y.....',
    '......YYY.......',
    '.....YZZZY......',
    'YY..YZZZZZY..YY.',
    '....YZZZZZy.....',
    '.....YZZZy......',
    '......yyy.......',
    '....Y.....Y.....',
    '...Y...Y...Y....',
    '.......Y........',
  ] },
  os_cloud: { rows: [
    '................',
    '.....WWWW.......',
    '....WWWWWW.WW...',
    '..WWWWWWWWWWWW..',
    '.WWWWWWWWWWWWWu.',
    'WWWWWWWWWWWWWWWu',
    'WWWWWWWWWWWWWWWu',
    '.uuuuuuuuuuuuuu.',
  ] },
  os_rain: { rows: [
    '.....llll.......',
    '....llllll.ll...',
    '..llllllllllll..',
    '.llllllllllllgg.',
    'lllllllllllllllg',
    '.gggggggggggggg.',
    '..B...B...B.....',
    '.B...B...B...B..',
    '....B...B...B...',
    '...B...B...B....',
  ] },
  os_user: { rows: [
    '.....kkkkkk.....',
    '....kiiiiiik....',
    '...kiiiiiiiik...',
    '...kihhhhhiik...',
    '...kikhhkhiik...',
    '...kihhhhhiik...',
    '....kijjjjik....',
    '.....kiiiik.....',
    '...BBBkkkkBBB...',
    '..BBBBBBBBBBBB..',
    '.BBBBBBBBBBBBBB.',
    '.BBBBBBBBBBBBBB.',
  ] },
  os_bill: { rows: [
    '.WWWWWWWWWWWW...',
    '.WkkkkkkWWWWWu..',
    '.WWWWWWWWWWWWu..',
    '.WkkkkWWWWkkWu..',
    '.WWWWWWWWWWWWu..',
    '.WkkkkkWWWkkWu..',
    '.WWWWWWWWWWWWu..',
    '.WWWWWWWRRRRWu..',
    '.WWWWWWWRQQRWu..',
    '.WWWWWWWRRRRWu..',
    '.WWWWWWWWWWWWu..',
    '.wuwuwuwuwuwuu..',
  ] },
  os_spam: { rows: [
    '....llllllll....',
    '...LLLLLLLLLLl..',
    '...SSSSSSSSSSp..',
    '...SPPPPPPPPPp..',
    '...SPYYYYYYYPp..',
    '...SPYKKKKKYPp..',
    '...SPYYYYYYYPp..',
    '...SPPPPPPPPPp..',
    '...SPPPPPPPPPp..',
    '...ppppppppppp..',
    '...LLLLLLLLLLl..',
    '....gggggggg....',
  ] },
  os_yokai: { rows: [
    '.....wwwwww.....',
    '...wwWWWWWWww...',
    '..wWWWWWWWWWWw..',
    '..wWWKKWWKKWWw..',
    '.wWWWKKWWKKWWWw.',
    '.wWWWWWWWWWWWWw.',
    '.wWWWWWRRWWWWWw.',
    '.wWWWWWWWWWWWWu.',
    '.wWWWWWWWWWWWuu.',
    '.wWWWWWWWWWWWu..',
    '.wWW.wWW.wWWu...',
    '.ww...ww..wu....',
  ] },
  os_run: { rows: [
    '.wwwwwwwwwwwwww.',
    '.wDDDDDDDDDDDDw.',
    '.wDFFDDDDDDDDDw.',
    '.wDDFFDDDDDDDDw.',
    '.wDDDFFDDDDDDDw.',
    '.wDDFFDDDDDDDDw.',
    '.wDFFDDFFFFFDDw.',
    '.wDDDDDDDDDDDDw.',
    '.wwwwwwwwwwwwww.',
  ] },
  os_help: { rows: [
    '.....BBBBBB.....',
    '...BBCCCCCCBB...',
    '..BCCBBBBBBCCB..',
    '..BCBBWWWWBBCb..',
    '.BCBBWWBBWWBBCb.',
    '.BCBBBBBBWWBBCb.',
    '.BCBBBBBWWBBBCb.',
    '.BCBBBBWWBBBBCb.',
    '.BCBBBBWWBBBBCb.',
    '..BCBBBBBBBBCb..',
    '..BCBBBWWBBBCb..',
    '...BbCCCCCCbb...',
    '.....bbbbbb.....',
  ] },
  os_find: { rows: [
    '...llllll.......',
    '..lCCCCCCl......',
    '.lCCWCCCCCl.....',
    '.lCWCCCCCCl.....',
    '.lCCCCCCCCl.....',
    '.lCCCCCCCCl.....',
    '..lCCCCCCl......',
    '...llllllTT.....',
    '.........TTT....',
    '..........TTT...',
    '...........TTT..',
    '............Tt..',
  ] },
  os_star: { rows: [
    '.......Y........',
    '......YZY.......',
    '......YZY.......',
    '.YYYYYZZZYYYYY..',
    '..YZZZZZZZZZy...',
    '...YZZZZZZZy....',
    '....YZZZZZy.....',
    '...YZZZyZZZy....',
    '...YZZy.yZZy....',
    '..Yyy.....yyy...',
  ] },
  os_lock: { rows: [
    '.....llll.......',
    '....lgggGl......',
    '...lg....Gl.....',
    '...lg....Gl.....',
    '..YYYYYYYYYy....',
    '..YZZZZZZZZy....',
    '..YZZZKKZZZy....',
    '..YZZZKKZZZy....',
    '..YZZZZKZZZy....',
    '..yyyyyyyyyy....',
  ] },
  os_info: { rows: [
    '.....BBBBBB.....',
    '...BBBBBBBBBB...',
    '..BBBBBWWBBBBB..',
    '.BBBBBBWWBBBBBb.',
    '.BBBBBBBBBBBBBb.',
    'BBBBBBWWWBBBBBBb',
    'BBBBBBBWWBBBBBBb',
    'BBBBBBBWWBBBBBBb',
    'BBBBBBBWWBBBBBBb',
    '.BBBBBBWWBBBBBb.',
    '.bBBBBWWWWBBBbb.',
    '..bbBBBBBBBBbb..',
    '...bbbBBBBbbb...',
    '.....bbbbbb.....',
  ] },
  os_warn: { rows: [
    '.......YY.......',
    '......YZZY......',
    '......YZZY......',
    '.....YZZZZY.....',
    '.....YZKKZY.....',
    '....YZZKKZZY....',
    '....YZZKKZZY....',
    '...YZZZKKZZZY...',
    '...YZZZKKZZZY...',
    '..YZZZZZZZZZZY..',
    '..YZZZZKKZZZZY..',
    '.YZZZZZKKZZZZZY.',
    '.yyyyyyyyyyyyyy.',
  ] },
  os_error: { rows: [
    '.....RRRRRR.....',
    '...RRRRRRRRRR...',
    '..RRRRRRRRRRRR..',
    '.RRRWWRRRRWWRRr.',
    '.RRRWWWRRWWWRRr.',
    'RRRRRWWWWWWRRRRr',
    'RRRRRRWWWWRRRRRr',
    'RRRRRRWWWWRRRRRr',
    'RRRRRWWWWWWRRRRr',
    '.RRRWWWRRWWWRRr.',
    '.rRRWWRRRRWWRrr.',
    '..rrRRRRRRRRrr..',
    '...rrrRRRRrrr...',
    '.....rrrrrr.....',
  ] },
  os_question: { rows: [
    '.....BBBBBB.....',
    '...BBBBBBBBBB...',
    '..BBBBWWWWBBBB..',
    '.BBBBWWBBWWBBBb.',
    '.BBBBBBBBWWBBBb.',
    'BBBBBBBBWWBBBBBb',
    'BBBBBBBWWBBBBBBb',
    'BBBBBBBWWBBBBBBb',
    'BBBBBBBBBBBBBBBb',
    '.BBBBBBWWBBBBBb.',
    '.bBBBBBWWBBBBbb.',
    '..bbBBBBBBBBbb..',
    '...bbbBBBBbbb...',
    '.....bbbbbb.....',
  ] },
  os_cart: { rows: [
    'kk..............',
    '.k..............',
    '.kPPPPPPPPPPPPk.',
    '.kPSPPSPPSPPPk..',
    '..kPPPPPPPPPPk..',
    '..kPSPPSPPSPk...',
    '...kPPPPPPPPk...',
    '...kkkkkkkkkk...',
    '...k........k...',
    '..kkk......kkk..',
    '..kWk......kWk..',
    '..kkk......kkk..',
  ] },
  os_doc: { rows: [
    '.WWWWWWWWW......',
    '.WBBBBBBWWu.....',
    '.WWWWWWWWWuu....',
    '.WBBBBBBBBWWu...',
    '.WWWWWWWWWWWu...',
    '.WRRRRWWBBBWu...',
    '.WRQQRWWWWWWu...',
    '.WRRRRWWBBBWu...',
    '.WWWWWWWWWWWu...',
    '.WBBBBBBBBBWu...',
    '.WWWWWWWWWWWu...',
    '.uuuuuuuuuuuu...',
  ] },
  os_disk: { rows: [
    'xxxxxxxxxxxxxx..',
    'xbllllllllllbx..',
    'xblWWWWWWWWlbxx.',
    'xblWkkkkkkWlbxx.',
    'xblWWWWWWWWlbxx.',
    'xblWkkkkWWWlbxx.',
    'xbllllllllllbxx.',
    'xbbbbbbbbbbbbxx.',
    'xbbLLLLLLLbbbxx.',
    'xbbLGGLLLLbbbxx.',
    'xbbLGGLLLLbbbxx.',
    'xxxxxxxxxxxxxxx.',
  ] },
  os_phone: { rows: [
    '..RRRRRRRRRRRR..',
    '.RQQQQQQQQQQQRr.',
    'RQRRr......RRRqr',
    'RRr..........rr.',
    '....RRRRRRRR....',
    '...RQQQQQQQQr...',
    '..RQRWRWRWRRRr..',
    '..RRRRRRRRRRRr..',
    '..RRRWRWRWRRRr..',
    '..RRRRRRRRRRRr..',
    '..RRRWRWRWRRRr..',
    '..rrrrrrrrrrrr..',
  ] },
  os_trophy: { rows: [
    '..YYYYYYYYYYYY..',
    'YYYZZZZZZZZZyYYY',
    'Y.YZZZZZZZZZyY.Y',
    'Y.YZZZZZZZZZyY.Y',
    '.YYZZZZZZZZZyYY.',
    '...YZZZZZZZyY...',
    '....YZZZZZyY....',
    '......YZy.......',
    '......YZy.......',
    '.....YZZZy......',
    '...TTTTTTTTT....',
    '...TAAAAAAAt....',
    '...ttttttttt....',
  ] },
  os_music: { rows: [
    '......kkkkkkkk..',
    '......kVVVVVVk..',
    '......kVkkkkVk..',
    '......kV....Vk..',
    '......kV....Vk..',
    '......kV....Vk..',
    '...VVVkV.VVVVk..',
    '..VIIVVV.VIIVV..',
    '..VVVVVv.VVVVv..',
    '...vvvv...vvv...',
  ] },
};

// tiny 1-colour glyphs for the window chrome (no outline, no shadow)
const GLYPHS = {
  g_min: ['.......', '.......', '.......', '.......', '.......', 'KKKKKK.', 'KKKKKK.'],
  g_max: ['KKKKKKKK', 'KKKKKKKK', 'K......K', 'K......K', 'K......K', 'K......K', 'KKKKKKKK'],
  g_rest: ['..KKKKKK', '..KKKKKK', '..K....K', 'KKKKKK.K', 'KKKKKK.K', 'K....KKK', 'K....K..', 'KKKKKK..'],
  g_close: ['KK....KK', '.KK..KK.', '..KKKK..', '...KK...', '..KKKK..', '.KK..KK.', 'KK....KK'],
  g_right: ['K...', 'KK..', 'KKK.', 'KKKK', 'KKK.', 'KK..', 'K...'],
  g_left: ['...K', '..KK', '.KKK', 'KKKK', '.KKK', '..KK', '...K'],
  g_up: ['...K...', '..KKK..', '.KKKKK.', 'KKKKKKK'],
  g_down: ['KKKKKKK', '.KKKKK.', '..KKK..', '...K...'],
  g_check: ['......K', '.....KK', 'K...KK.', 'KK.KK..', '.KKK...', '..K....'],
  g_dot: ['.KK.', 'KKKK', 'KKKK', '.KK.'],
  g_grip: ['.........K', '..........', '.......K.K', '..........', '....K.K.K.', '..........', '.K.K.K.K.K'],
  g_back: ['....K....', '...KK....', '..KKKKKKK', '.KKKKKKKK', '..KKKKKKK', '...KK....', '....K....'],
  g_fwd: ['....K....', '....KK...', 'KKKKKKK..', 'KKKKKKKK.', 'KKKKKKK..', '....KK...', '....K....'],
  g_reload: ['..KKKK.K', '.K....KK', 'K....KKK', 'K.......', 'K......K', '.K....K.', '..KKKK..'],
  g_home: ['...KK...', '..KKKK..', '.KKKKKK.', 'KKKKKKKK', '.KK..KK.', '.KK..KK.', '.KK..KK.'],
  g_stop: ['KK....KK', '.KK..KK.', '..KKKK..', '...KK...', '..KKKK..', '.KK..KK.', 'KK....KK'],
};
const glyphCache = new Map();
/** Data URL of a chrome glyph in a colour (scale 1: shown at its natural pixel size times the layer zoom). */
export function glyphURL(name, color = '#2a2220') {
  const k = name + color;
  if (glyphCache.has(k)) return glyphCache.get(k);
  const rows = GLYPHS[name];
  const c = document.createElement('canvas');
  c.width = Math.max(...rows.map((r) => r.length)); c.height = rows.length;
  const g = c.getContext('2d');
  g.fillStyle = color;
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === 'K') g.fillRect(x, y, 1, 1); }));
  const url = c.toDataURL();
  glyphCache.set(k, url);
  return url;
}
export function glyph(name, color, scale = 1, cls = '') {
  const rows = GLYPHS[name];
  const w = Math.max(...rows.map((r) => r.length)), h = rows.length;
  return `<img class="c98-g ${cls}" src="${glyphURL(name, color)}" width="${w * scale}" height="${h * scale}" alt="" draggable="false">`;
}

let registered = false;
export function registerOSIcons() {
  if (registered) return;
  registered = true;
  for (const [k, def] of Object.entries(ICONS)) defineIcon(k, def);
}
export const ic = (name, scale = 1, cls = '') => iconHTML(name, scale, cls);
/** The biggest whole-pixel scale of an icon that fits in px (16-px UI glyphs and 24-px item sprites alike). */
export const icFit = (name, px, cls = '') => iconHTML(name, Math.max(1, Math.floor(px / Math.max(iconCanvas(name, 1).width, iconCanvas(name, 1).height))), cls);
export { iconURL };

// ------------------------------------------------------------------ wallpapers (320 x 240 pixel paintings)
export const WALLPAPERS = [
  { id: 'teal', name: 'Capsule Teal', draw: teal },
  { id: 'dusk', name: 'Dusk Lane', draw: dusk },
  { id: 'mikan', name: 'Mikan Nap', draw: mikan },
  { id: 'stars', name: 'Star Capsules', draw: stars },
  { id: 'plain', name: '(None)', draw: (p) => p.fill(0x2b7d7a) },
];
const wallCache = new Map();
export function wallpaperURL(id) {
  const w = WALLPAPERS.find((x) => x.id === id) || WALLPAPERS[0];
  if (!wallCache.has(w.id)) {
    const p = new Pix(320, 240, 7);
    w.draw(p);
    p.flush();
    wallCache.set(w.id, p.canvas.toDataURL());
  }
  return wallCache.get(w.id);
}
const wallImgs = new Map();
/** An <img> of the wallpaper (for drawing the desktop onto the monitor's idle picture). */
export function wallpaperImage(id) {
  if (!wallImgs.has(id)) { const im = new Image(); im.src = wallpaperURL(id); wallImgs.set(id, im); }
  return wallImgs.get(id);
}

function capsuleSprite(p, x, y, c, s = 1) {
  p.sprite(['.WWW.', 'WWWWW', 'RRRRR', 'CCCCC', '.CCC.'], { W: 0xfbf8f0, R: 0x9a9aa8, C: c }, x, y, s);
}

function teal(p) {
  const { w, h } = p;
  p.fill(0x2b7d7a);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((x + y * 3) % 8 === 0) p.px(x, y, 0x2f8783);
  const cols = [0xff6f91, 0x5cc4ff, 0xffd23f, 0x58c06c, 0xd94fb0, 0xff8c2e];
  for (let r = 0, y = 12; y < h; y += 40, r++) for (let x = (r % 2) * 30 + 14; x < w; x += 60) if (hash2(x, y) < 0.45) capsuleSprite(p, x, y, cols[Math.floor(hash2(y, x) * cols.length)], 2);
}

function dusk(p) {
  const { w, h } = p;
  // banded sky (flat bands, no smooth gradient)
  const bands = [0x2e2f6a, 0x3f3a7a, 0x5a4588, 0x7a4f8e, 0xa65a86, 0xd06e78, 0xef8c6c, 0xffa86a, 0xffc07a];
  const sky = Math.round(h * 0.72);
  for (let y = 0; y < sky; y++) {
    const t = y / sky * (bands.length - 1), i = Math.floor(t), f = t - i;
    const dither = f > 0.5 && ((Math.floor(y) + 0) % 2 === 0);
    for (let x = 0; x < w; x++) p.px(x, y, bands[Math.min(bands.length - 1, i + ((dither && (x % 2 === 0)) || f > 0.8 ? 1 : 0))]);
  }
  // sun
  const sx = Math.round(w * 0.72), sy = Math.round(h * 0.6);
  for (let y = -15; y <= 15; y++) for (let x = -15; x <= 15; x++) if (x * x + y * y <= 225 && sy + y < sky) p.px(sx + x, sy + y, y > 6 && y % 3 === 0 ? 0xffa86a : 0xffe0a0);
  // thin clouds
  for (let k = 0; k < 7; k++) { const y = Math.round(h * (0.14 + k * 0.07)), x0 = Math.round(hash2(k, 1) * w); for (let i = 0; i < 40 + k * 6; i++) p.px((x0 + i) % w, y, k > 3 ? 0xffc890 : 0xd88aa0); }
  // rooftops, a utility pole and wires
  let x = 0, k = 0;
  while (x < w) {
    const bw = 30 + Math.floor(hash2(k, 2) * 30), top = Math.round(h * (0.62 + hash2(k, 3) * 0.1));
    for (let xx = x; xx < x + bw; xx++) { const t = Math.abs(xx - x - bw / 2) / (bw / 2); for (let y = Math.round(top + t * 6); y < h; y++) p.px(xx, y, 0x2a2238); }
    if (hash2(k, 4) < 0.6) p.rect(x + 6, top + 12, 5, 4, 0xffd890);
    x += bw; k++;
  }
  for (const px of [Math.round(w * 0.22), Math.round(w * 0.86)]) { p.rect(px, Math.round(h * 0.25), 2, h, 0x1a1424); p.rect(px - 8, Math.round(h * 0.3), 18, 1, 0x1a1424); }
  for (let xx = 0; xx < w; xx++) p.px(xx, Math.round(h * 0.33 + Math.sin(xx / w * Math.PI * 2) * 6), 0x1a1424);
}

function mikan(p) {
  const { w, h } = p;
  p.fill(0xffd2a0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((x * 7 + y * 13) % 29 === 0) p.px(x, y, 0xffc890);
  for (let i = 0; i < 26; i++) { const x = Math.round(hash2(i, 1) * w), y = Math.round(hash2(i, 2) * h); p.circle(x, y, 2, 0xffbf86); for (const [dx, dy] of [[-3, -3], [0, -4], [3, -3]]) p.px(x + dx, y + dy, 0xffbf86); }
  const cx = Math.round(w / 2), cy = Math.round(h * 0.62);
  p.rect(cx - 50, cy + 8, 100, 14, 0xd8643a); p.rect(cx - 48, cy + 8, 96, 2, 0xe8845a);
  for (let y = -16; y <= 8; y++) for (let x = -38; x <= 38; x++) {
    if ((x / 38) ** 2 + (y / 16) ** 2 > 1) continue;
    const n = hash2(Math.floor((x + 40) / 9), Math.floor((y + 20) / 7));
    p.px(cx + x, cy + y, n > 0.7 ? 0xf08a3a : n < 0.2 ? 0x3a2e2a : 0xfbf6ec);
  }
  for (let y = -10; y <= 6; y++) for (let x = -14; x <= 14; x++) if ((x / 14) ** 2 + (y / 10) ** 2 <= 1) p.px(cx + 30 + x, cy - 4 + y, x < 0 ? 0xfbf6ec : 0xf08a3a);
  p.rect(cx + 22, cy - 18, 4, 5, 0xf08a3a); p.rect(cx + 36, cy - 18, 4, 5, 0x3a2e2a);
  p.rect(cx + 24, cy - 4, 4, 1, 0x3a2e2a); p.rect(cx + 33, cy - 4, 4, 1, 0x3a2e2a);
  p.sprite(['K...K', '.K.K.', '..K..', '.K.K.', 'K...K'].map((r) => r.replace(/K/g, 'Z')), { Z: 0x8a5a3a }, cx + 48, cy - 34, 1);
}

function stars(p) {
  const { w, h } = p;
  p.fill(0x14123a);
  for (let y = Math.round(h * 0.6); y < h; y++) for (let x = 0; x < w; x++) if ((x + y) % 2 === 0 || y > h * 0.8) p.px(x, y, 0x221a4a);
  for (let i = 0; i < 160; i++) p.px(Math.round(hash2(i, 3) * w), Math.round(hash2(i, 4) * h), hash2(i, 5) < 0.2 ? 0xffe8a0 : 0xc8d8ff);
  const cols = [0xff6f91, 0x5cc4ff, 0xffd23f, 0x58c06c, 0xd94fb0];
  for (let i = 0; i < 9; i++) capsuleSprite(p, Math.round(hash2(i, 8) * (w - 20)), Math.round(hash2(i, 9) * (h - 20)), cols[i % cols.length], 2);
  p.circle(Math.round(w * 0.8), Math.round(h * 0.22), 14, 0xfff4c8); p.circle(Math.round(w * 0.8) + 5, Math.round(h * 0.22) - 3, 12, 0x14123a);
}

// ------------------------------------------------------------------ contact portraits (24 x 24)
const SKIN = { fair: [0xf6dcc6, 0xe0b89a], tan: [0xd9a57a, 0xb47c56], warm: [0xeec09a, 0xc8946c] };
const portraitCache = new Map();
/**
 * A tiny pixel portrait. look: { bg, skin, hair, hairCol, glasses, cap, capCol, band, beard, mouth, robot, cat, ghost, shirt }
 * Returns a data URL (24 x 24; show it at 2x or 3x with image-rendering: pixelated).
 */
export function portraitURL(look = {}) {
  const key = JSON.stringify(look);
  if (portraitCache.has(key)) return portraitCache.get(key);
  const p = new Pix(24, 24, 3);
  p.fill(look.bg ?? 0x8ac6d8);
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) if ((x + y) % 4 === 0) p.px(x, y, 0xffffff, 26);
  const ink = 0x2a2220;
  if (look.robot) {
    p.rect(5, 5, 14, 13, 0xb8c0cc); p.rect(5, 5, 14, 1, 0xdfe4ea); p.rect(18, 5, 1, 13, 0x7a8494);
    p.rect(11, 1, 2, 4, 0x7a8494); p.rect(10, 0, 4, 2, 0xe5383b);
    p.rect(7, 9, 3, 3, look.eye ?? 0xff3a3a); p.rect(14, 9, 3, 3, look.eye ?? 0xff3a3a);
    for (let x = 8; x < 16; x += 2) p.rect(x, 14, 1, 2, ink);
    p.rect(3, 19, 18, 5, 0x5a6474);
    p.rect(9, 20, 6, 2, 0xffd23f);
    p.flush();
    const u = p.canvas.toDataURL(); portraitCache.set(key, u); return u;
  }
  if (look.cat) {
    const c = look.catCol ?? 0xf08a3a, w = 0xfbf6ec;
    p.rect(4, 8, 16, 12, w); p.rect(4, 8, 8, 6, c); p.rect(14, 14, 6, 6, 0x3a2e2a);
    p.rect(4, 4, 4, 5, c); p.rect(16, 4, 4, 5, 0x3a2e2a); p.rect(5, 5, 2, 3, 0xff9fae);
    p.rect(8, 12, 2, 2, ink); p.rect(14, 12, 2, 2, ink); p.rect(11, 15, 2, 1, 0xff6f91);
    p.rect(10, 16, 1, 1, ink); p.rect(13, 16, 1, 1, ink);
    p.rect(1, 14, 4, 1, ink); p.rect(19, 14, 4, 1, ink);
    p.flush();
    const u = p.canvas.toDataURL(); portraitCache.set(key, u); return u;
  }
  const [sk, skd] = look.sil ? [0x4a4046, 0x3a3236] : SKIN[look.skin || 'fair'];
  const hc = look.hairCol ?? 0x2a2428;
  // shoulders / shirt
  p.rect(3, 19, 18, 5, look.shirt ?? 0x3f86e8); p.rect(9, 19, 6, 2, sk);
  // neck + head
  p.rect(10, 16, 4, 3, skd);
  p.rect(6, 6, 12, 11, sk); p.rect(7, 17, 10, 1, sk); p.rect(17, 7, 1, 10, skd);
  p.rect(5, 10, 1, 3, sk); p.rect(18, 10, 1, 3, skd); // ears
  // hair
  const H = look.hair || 'short';
  if (H === 'short' || H === 'spiky') {
    p.rect(5, 3, 14, 4, hc); p.rect(5, 6, 2, 4, hc); p.rect(17, 6, 2, 4, hc);
    if (H === 'spiky') for (let x = 5; x < 19; x += 3) p.rect(x, 1, 2, 2, hc);
  } else if (H === 'pomp') {
    p.rect(5, 4, 14, 3, hc); p.rect(4, 0, 15, 4, hc); p.rect(17, 1, 4, 3, hc); p.rect(5, 6, 1, 3, hc); p.rect(18, 6, 1, 3, hc);
    p.rect(6, 1, 10, 1, look.hairHi ?? 0x5a4a6a);
  } else if (H === 'bun') {
    p.rect(5, 4, 14, 3, hc); p.rect(5, 6, 2, 6, hc); p.rect(17, 6, 2, 6, hc); p.rect(9, 0, 6, 4, hc);
  } else if (H === 'long') {
    p.rect(5, 3, 14, 4, hc); p.rect(4, 5, 3, 13, hc); p.rect(17, 5, 3, 13, hc);
  } else if (H === 'bald') {
    p.rect(6, 5, 12, 2, sk); p.rect(5, 8, 1, 3, 0xd8d0c8); p.rect(18, 8, 1, 3, 0xd8d0c8);
  } else if (H === 'perm') {
    for (let x = 4; x < 20; x += 2) for (let y = 2; y < 8; y += 2) p.rect(x, y, 2, 2, (x + y) % 4 ? hc : (look.hairHi ?? 0x9a8aa0));
    p.rect(4, 7, 2, 5, hc); p.rect(18, 7, 2, 5, hc);
  }
  if (look.band) { p.rect(5, 6, 14, 2, look.band); }
  if (look.cap) { p.rect(5, 2, 14, 5, look.capCol ?? 0xe5383b); p.rect(4, 6, 10, 2, look.capCol ?? 0xe5383b); p.rect(10, 3, 3, 2, 0xffffff); }
  // face (a silhouette has none)
  const eyeY = 10;
  if (look.sil) { p.flush(); const u = p.canvas.toDataURL(); portraitCache.set(key, u); return u; }
  if (look.closed) { p.rect(8, eyeY + 1, 3, 1, ink); p.rect(13, eyeY + 1, 3, 1, ink); }
  else { p.rect(8, eyeY, 2, 2, ink); p.rect(14, eyeY, 2, 2, ink); p.px(8, eyeY, 0xffffff); p.px(14, eyeY, 0xffffff); }
  if (look.brows) { p.rect(7, eyeY - 2, 4, 1, hc); p.rect(13, eyeY - 2, 4, 1, hc); }
  if (look.glasses) { p.frame(7, eyeY - 1, 4, 4, look.glasses); p.frame(13, eyeY - 1, 4, 4, look.glasses); p.rect(11, eyeY, 2, 1, look.glasses); }
  if (look.beard) { p.rect(7, 14, 10, 3, look.beard); p.rect(6, 12, 1, 3, look.beard); p.rect(17, 12, 1, 3, look.beard); p.rect(10, 14, 4, 1, 0x8a4e34); }
  else if (look.mouth === 'grin') { p.rect(9, 14, 6, 1, ink); p.rect(10, 15, 4, 1, 0xff9fae); }
  else if (look.mouth === 'o') { p.rect(11, 14, 2, 2, ink); }
  else { p.rect(10, 14, 4, 1, 0x8a4e34); }
  if (look.blush) { p.rect(7, 12, 2, 1, 0xff9fae); p.rect(15, 12, 2, 1, 0xff9fae); }
  if (look.mark) p.rect(16, 13, 1, 1, ink);
  p.flush();
  const u = p.canvas.toDataURL();
  portraitCache.set(key, u);
  return u;
}
export function portrait(look, px = 2, cls = '') {
  return `<img class="c98-ava ${cls}" src="${portraitURL(look)}" width="${24 * px}" height="${24 * px}" alt="" draggable="false">`;
}
