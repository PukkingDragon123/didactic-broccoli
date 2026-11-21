// Capsule 98 art: desktop / app icons (registered in the shared icon set, so iconHTML('os_mail') works anywhere) and
// tiny chrome glyphs (window buttons, arrows, ticks): hand-pixelled grids, nearest-neighbour only. The wallpapers are
// real photographs and the contact portraits real 3D people (src/os/avatars.js).
import { avatarFor } from './avatars.js';
import { defineIcon, iconHTML, iconURL, iconCanvas } from '../gfx/icons.js';

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

// ------------------------------------------------------------------ wallpapers: real photographs
// Public-domain / CC0 photos from Wikimedia Commons (credited in CREDITS.md and public/CREDITS.txt), cropped to 4:3
// (1024 x 768) by tools/wallpapers.py into public/img/wallpapers/. '(None)' is the plain desktop colour.
const WP = (f) => `${import.meta.env?.BASE_URL ?? '/'}img/wallpapers/${f}`;
export const WALLPAPERS = [
  { id: 'fuji', name: 'Mount Fuji at Sunrise', photo: WP('fuji.jpg') },
  { id: 'sakura', name: 'Cherry Blossom River', photo: WP('sakura.jpg') },
  { id: 'atami', name: 'Atami Hot Springs, 1915', photo: WP('atami.jpg') },
  { id: 'clouds', name: 'Summer Clouds', photo: WP('clouds.jpg') },
  { id: 'sea', name: 'Sea and Sky', photo: WP('sea.jpg') },
  { id: 'plain', name: '(None)' },
];
export const DEFAULT_WALLPAPER = 'fuji';
/** A wallpaper id that exists (older saves had painted ones: they get the default photo). */
export const wallpaperId = (id) => (WALLPAPERS.some((w) => w.id === id) ? id : DEFAULT_WALLPAPER);
export function wallpaperURL(id) {
  const w = WALLPAPERS.find((x) => x.id === wallpaperId(id));
  return w?.photo || '';
}
const wallImgs = new Map();
/** An <img> of the wallpaper (for drawing the desktop onto the monitor's idle picture). */
export function wallpaperImage(id) {
  if (!wallImgs.has(id)) { const im = new Image(); im.src = wallpaperURL(id); wallImgs.set(id, im); }
  return wallImgs.get(id);
}

// ------------------------------------------------------------------ contact portraits
// Every face on the PC (Pichat contacts, sellers, the codex) is a render of a real in-game 3D person
// (src/os/avatars.js): a look object only picks who (its colours and hints), never a drawn face. The OS hands its game
// over at start-up (setPortraitGame) so the renders use the game's own renderer.
let portraitGame = null;
export function setPortraitGame(g) { portraitGame = g; }
const lookKey = (look) => { let h = 2166136261; for (const c of JSON.stringify(look || {})) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return `look${(h >>> 0).toString(36)}`; };
/** The picture for a look (or a { person } spec), as a data URL: the render when it's ready, a plain tile until then
 *  (every <img data-ava="key"> on the page is swapped to the render once it arrives). */
export function portraitURL(look = {}, id = null) {
  const key = id || lookKey(look);
  if (look?.cat) return catTile(look);
  return avatarFor(portraitGame, key, look, (url) => { for (const img of document.querySelectorAll('img[data-ava]')) if (img.dataset.ava === key) img.src = url; }, 48);
}
export const portraitKey = (look, id = null) => id || lookKey(look);
/** A cat contact has no person to render: a plain tile in its colours. */
function catTile(look) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 48;
  const c = cv.getContext('2d');
  c.fillStyle = `#${(look.bg ?? 0xd8d0c0).toString(16).padStart(6, '0')}`;
  c.fillRect(0, 0, 48, 48);
  return cv.toDataURL();
}
/** A plain tile (someone you haven't met yet in the codex). */
export const blankTile = (bg = 0x3a3236) => catTile({ bg });
export function portrait(look, px = 2, cls = '', id = null) {
  return `<img class="c98-ava ${cls}" src="${portraitURL(look, id)}" data-ava="${portraitKey(look, id)}" width="${24 * px}" height="${24 * px}" alt="" draggable="false">`;

}
