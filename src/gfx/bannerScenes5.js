// Display-card scenes for the new line-up (the lowpix figure series, src/data/series/*.js). Each new series is shown
// on a hand-pixelled backdrop: the painters of src/gfx/bannerScenes*.js reused under the new ids where the setting
// fits (a back lane for the stray cats, the diner window for the food samples, the Showa living room for the
// appliances...), with this season's own catchphrases. The figures standing in each scene are the series' own
// (pixel-rendered from their GLBs by src/gfx/banner.js).
import { SCENES as S1 } from './bannerScenes.js';
import { SCENES as S2 } from './bannerScenes2.js';
import { SCENES as S3 } from './bannerScenes3.js';
import { SCENES as S4 } from './bannerScenes4.js';

const OLD = () => ({ ...S1, ...S2, ...S3, ...S4 });
/** new series id -> the backdrop painter it uses */
const BACKDROP = {
  furoba: 'onsen', yokaiya: 'hyakki', gohan: 'shokudo', tanukibin: 'shotengai', nuigurumi: 'lanepals', sampuru: 'shokudo', denka: 'showa', konchu: 'matsuri', asobi: 'gecen', shinkai: 'umi', inusanpo: 'mochi',
  yacho: 'kasa', daikaiju: 'kaiju', hikidashi: 'bungu', machikado: 'shotengai', okashi: 'wagashi', norimono: 'densha', 
  shugorei: 'bizarre', kaiun: 'omamori', 
};
export const SCENES = Object.fromEntries(Object.entries(BACKDROP).map(([id, old]) => [id, (...a) => OLD()[old](...a)]));

export const BANNER_TEXT = {
  furoba: { catch: 'いい湯だな！銭湯なかま', sub: 'おふろあがりはコーヒー牛乳' },
  yokaiya: { catch: '夜店に妖怪あらわる！', sub: 'わたあめ・金魚・たこ焼き' },
  gohan: { catch: 'いただきます！ごはんズー', sub: 'おにぎりペンギンとなかまたち' },
  tanukibin: { catch: 'たぬき便、ただいま参上！', sub: '雨の日も風の日もおとどけします' },
  nuigurumi: { catch: 'ふわふわの仲間が集合！', sub: 'ぎゅっとしたくなるぬいぐるみ' },
  kogu: { catch: 'おじいちゃんの道具、勢ぞろい！', sub: '使いこまれた名品たち' },
  yaoya: { catch: 'とれたて！まちの八百屋さん', sub: '今日のおすすめはこちら' },
  daidokoro: { catch: 'なつかしの台所へようこそ', sub: 'ほうろう鍋とよそいきの茶器' },
  undou: { catch: 'よーい、どん！運動会', sub: '校庭のヒーローたち' },
  sampuru: { catch: '本物そっくり！食品サンプル', sub: 'ショーウィンドウの名物たち' },
  denka: { catch: 'なつかしの昭和家電が集合！', sub: '夕焼けのお茶の間で' },
  konchu: { catch: '夏休みの昆虫採集！', sub: '朝の雑木林で見つけたよ' },
  asobi: { catch: '遊べる！駄菓子屋おもちゃ', sub: '十円玉をにぎりしめて' },
  shinkai: { catch: '深海のふしぎな生きもの', sub: '水深千メートルの世界' },
  inusanpo: { catch: 'いっしょにおさんぽ行こう！', sub: '川べりの夕暮れ道' },
  yacho: { catch: '庭にやってくる小鳥たち', sub: '梅の枝でひとやすみ' },
  daikaiju: { catch: '大怪獣、街にあらわる！', sub: '夕焼けの大決戦' },
  hikidashi: { catch: '机の引き出し大集合！', sub: '新学期の文房具' },
  machikado: { catch: 'あの街角を手のひらに', sub: '商店街の夕暮れ' },
  okashi: { catch: 'おいしそうな和菓子たち', sub: '老舗の菓子処より' },
  norimono: { catch: '路地を走るのりものたち', sub: '朝の出発進行！' },
  shugorei: { catch: 'あらわれよ、守護の霊！', sub: '運命を守る者たち' },
  kaiun: { catch: 'ご利益たっぷり開運招福！', sub: '春の神社でおまいり' },
};
