// The invented makers behind everything you can buy in the lane, and the facts printed on each pack. Nothing here is a
// real company, product line, mascot or slogan: the brands were made up for this game (some tie in with the enamel
// signs in the garage: ゲンキン, ねこ印, ガチャラムネ).
//   BRANDS[id] = { jp, en, maker, addr, code (JAN maker digits), mascot, ink / paper / accent (house colours), tel }
//   DRINKS[id] = { brand, cont (container: src/products/containers.js), kind (品名), ing (原材料名), vol (内容量), mat }
export const BRANDS = {
  bancho: { jp: '番長珈琲', en: 'BANCHO COFFEE', maker: '番長珈琲本舗（株）', addr: '汐見市本町2-14', code: '10271', mascot: 'bancho', ink: 0x2a1a14, paper: 0xf4e6c4, accent: 0xe8c040, main: 0x5a2e16 },
  chako: { jp: 'ちゃこ園', en: 'CHAKO-EN TEA', maker: 'ちゃこ園製茶（株）', addr: '汐見市茶畑町88', code: '20418', mascot: 'chako', ink: 0x14361a, paper: 0xf4f0d8, accent: 0xc8281e, main: 0x3a8a3a },
  puku: { jp: 'プクポップ', en: 'PUKU POP', maker: '泡島飲料（株）', addr: '泡島町みなと1-3', code: '30552', mascot: 'puku', ink: 0x14285a, paper: 0xfffaf0, accent: 0xffd23f, main: 0x2a7ae0 },
  moobell: { jp: 'モーベル牧場', en: 'MOOBELL FARM', maker: 'モーベル乳業（株）', addr: '高原村まきば520', code: '40736', mascot: 'momo', ink: 0x1a3a6a, paper: 0xfffaf0, accent: 0xe0443a, main: 0x3a8ae0 },
  naminori: { jp: 'ナミノリ', en: 'NAMINORI SPORTS', maker: 'ナミノリ飲料（株）', addr: '汐見市浜通り7-1', code: '50193', mascot: 'shizuku', ink: 0x0a2a6a, paper: 0xf4f8fc, accent: 0xe0443a, main: 0x1e6ae0 },
  genkin: { jp: 'ゲンキン', en: 'GENKIN PHARMA', maker: 'ゲンキン製薬（株）', addr: '汐見市薬師町5-9', code: '60824', mascot: 'kokekko', ink: 0x3a1408, paper: 0xf4f0e8, accent: 0xc8281e, main: 0xe8b830 },
  hoho: { jp: 'ホーホー酒造', en: 'HOHO BREWERY', maker: 'ホーホー酒造（株）', addr: '汐見市蔵前町3-11', code: '70365', mascot: 'fukuro', ink: 0x101848, paper: 0xf4f0e0, accent: 0xd8a830, main: 0x1e2a6a },
  hokohoko: { jp: 'ほこほこ堂', en: 'HOKOHOKO-DO', maker: '（株）ほこほこ堂', addr: '汐見市湯気町1-8', code: '80947', mascot: 'nabe', ink: 0x3a1408, paper: 0xf4ead2, accent: 0xc8302a, main: 0xc47a44 },
  nazo: { jp: '謎商会', en: 'NAZO SHOKAI', maker: '（有）謎商会', addr: '住所不明', code: '99999', mascot: 'nazo', ink: 0x1e1e1e, paper: 0xf4f4f0, accent: 0x8a5ad8, main: 0x5a3a8a },
  // Mikawa-ya's shelves
  gacha: { jp: 'ガチャラムネ', en: 'GACHA RAMUNE', maker: 'ガチャ鉱泉所', addr: '汐見市川端町6', code: '31108', mascot: 'puku', ink: 0x14285a, paper: 0xfffaf0, accent: 0xe0443a, main: 0x2a7ae0 },
  neko: { jp: 'ねこ印', en: 'NEKO-JIRUSHI', maker: 'ねこ印食品（株）', addr: '汐見市しょうゆ町9', code: '81220', mascot: 'neko', ink: 0x3a1408, paper: 0xfffaf0, accent: 0xe0443a, main: 0xe0443a },
  chuta: { jp: 'チュー太製菓', en: 'CHU-TA SNACKS', maker: 'チュー太製菓（株）', addr: '汐見市ちくわ町2', code: '81455', mascot: 'chuta', ink: 0x2e1f28, paper: 0xfffaf0, accent: 0xffd23f, main: 0xe0443a },
  kamepan: { jp: 'かめパン', en: 'KAME-PAN BAKERY', maker: 'かめパン本舗', addr: '汐見市こむぎ町4', code: '81672', mascot: 'kamepan', ink: 0x4a2a14, paper: 0xfff4d8, accent: 0x58a84a, main: 0xf2cf72 },
  hotaru: { jp: 'ホタル電機', en: 'HOTARU ELECTRIC', maker: 'ホタル電機（株）', addr: '汐見市あかり町12', code: '91037', mascot: 'hotaru', ink: 0x1e2a4a, paper: 0xfffaf0, accent: 0xd8f060, main: 0x2a5aa8 },
  mogu: { jp: 'モグ園芸', en: 'MOGU GARDEN', maker: 'モグ園芸（株）', addr: '高原村つち畑31', code: '91266', mascot: 'mogu', ink: 0x2a3a10, paper: 0xf4f0d8, accent: 0x58a84a, main: 0x58a84a },
  omusubi: { jp: '三河屋', en: 'MIKAWA-YA', maker: '三河屋', addr: '横丁かど', code: '00100', mascot: 'omusubi', ink: 0x2e1f28, paper: 0xfffaf0, accent: 0xe0443a, main: 0xe0443a },
};

const D = {};
const def = (id, brand, cont, kind, ing, vol, mat, o = {}) => { D[id] = { id, brand, cont, kind, ing, vol, mat, item: String(Object.keys(D).length * 37 + 101).padStart(5, '0'), ...o }; };
// 番長珈琲
def('vd_bancho', 'bancho', 'can190', 'コーヒー', 'コーヒー', '190g', 'steel', { note: '無糖・ブラック' });
def('vd_morning', 'bancho', 'can190', 'コーヒー飲料', '牛乳、砂糖、コーヒー、乳化剤', '190g', 'steel');
def('vd_maxsweet', 'bancho', 'can190', 'コーヒー飲料', '加糖練乳、砂糖、コーヒー、香料', '190g', 'steel');
def('vd_aulait', 'bancho', 'can190', '乳飲料', '牛乳、砂糖、コーヒー、乳化剤', '190g', 'steel', { hot: true });
def('vd_cocoa', 'bancho', 'can190', '清涼飲料水', '砂糖、ココア、牛乳、食塩、香料', '190g', 'steel', { hot: true, shake: true });
// ちゃこ園
def('vd_ocha', 'chako', 'pet500', '緑茶（清涼飲料水）', '緑茶、ビタミンC', '500ml', 'pet');
def('vd_mugi', 'chako', 'pet500', '麦茶（清涼飲料水）', '大麦', '500ml', 'pet');
def('vd_jasmine', 'chako', 'pet500', 'ジャスミン茶（清涼飲料水）', 'ジャスミン茶、ビタミンC', '500ml', 'pet');
def('vd_milktea', 'chako', 'pet500', '紅茶飲料', '牛乳、砂糖、紅茶、香料、乳化剤', '500ml', 'pet');
// プクポップ
def('vd_melon', 'puku', 'can350', '炭酸飲料', '果糖ぶどう糖液糖、香料、酸味料、着色料（黄4、青1）', '350ml', 'alu', { juice: 0 });
def('vd_kora', 'puku', 'can350', '炭酸飲料', '砂糖、カラメル色素、酸味料、香料、カフェイン', '350ml', 'alu', { juice: 0 });
def('vd_grape', 'puku', 'can350', '炭酸飲料', 'ぶどう果汁、果糖ぶどう糖液糖、香料、酸味料', '350ml', 'alu', { juice: 10 });
def('vd_cclemon', 'puku', 'pet500', '炭酸飲料', '砂糖、レモン果汁、ビタミンC、香料、酸味料', '500ml', 'pet', { juice: 1 });
def('vd_ramunecan', 'puku', 'can350', '炭酸飲料', '砂糖、酸味料、香料', '350ml', 'alu', { juice: 0 });
def('vd_cider', 'puku', 'can250', '炭酸飲料', '砂糖、香料、酸味料', '250ml', 'alu', { juice: 0 });
// モーベル牧場
def('vd_karupiko', 'moobell', 'pet500', '乳性飲料（清涼飲料水）', '砂糖、脱脂粉乳、乳酸菌飲料、香料、酸味料', '500ml', 'pet');
def('vd_warmmilk', 'moobell', 'can190', '乳飲料', '生乳、はちみつ、砂糖', '190g', 'steel', { hot: true });
// ナミノリ
def('vd_ponkari', 'naminori', 'pet500', '清涼飲料水', '砂糖、果汁、食塩、酸味料、香料、塩化K、乳酸Ca', '500ml', 'pet');
def('vd_aquaria', 'naminori', 'pet500', '清涼飲料水', '果糖ぶどう糖液糖、グレープフルーツ果汁、食塩、香料', '500ml', 'pet', { juice: 1 });
def('vd_water', 'naminori', 'pet500', 'ミネラルウォーター', '水（鉱泉水）', '500ml', 'pet');
// ゲンキン製薬
def('vd_realbold', 'genkin', 'bottle', '炭酸飲料', '砂糖、はちみつ、ローヤルゼリー、カフェイン、ビタミンB群', '120ml', 'glass');
def('vd_lipovita', 'genkin', 'bottle', '清涼飲料水', 'タウリン、砂糖、ビタミンB群、カフェイン、香料', '100ml', 'glass');
def('vd_kurozu', 'genkin', 'bottle', '清涼飲料水', '米黒酢、はちみつ、りんご果汁', '120ml', 'glass');
// ホーホー酒造
def('vd_morio', 'hoho', 'can350', 'ビール', '麦芽、ホップ', '350ml', 'alu', { alc: 5 });
def('vd_dryy', 'hoho', 'can350', 'ビール', '麦芽、ホップ、米、コーン、スターチ', '350ml', 'alu', { alc: 5 });
def('vd_strong', 'hoho', 'can500', 'リキュール（発泡性）', 'レモン、ウォッカ、酸味料、香料、甘味料', '500ml', 'alu', { alc: 9 });
def('vd_highball', 'hoho', 'can350', 'リキュール（発泡性）', 'ウイスキー、レモンスピリッツ、炭酸', '350ml', 'alu', { alc: 7 });
def('vd_onecup', 'hoho', 'cup', '清酒', '米、米こうじ、醸造アルコール', '180ml', 'glass', { alc: 15 });
def('vd_ume', 'hoho', 'can250', 'リキュール（発泡性）', '梅酒、糖類、酸味料、炭酸', '250ml', 'alu', { alc: 4 });
def('vd_nonal', 'hoho', 'can350', '炭酸飲料（ビールテイスト）', '麦芽、ホップ、香料、酸味料', '350ml', 'alu', { alc: 0 });
// ほこほこ堂
def('vd_cornsoup', 'hokohoko', 'can190', 'コーンスープ', 'スイートコーン、牛乳、砂糖、食塩、でん粉', '190g', 'steel', { hot: true, shake: true });
def('vd_shiruko', 'hokohoko', 'can190', 'しるこ', '砂糖、小豆、食塩', '190g', 'steel', { hot: true, shake: true });
def('vd_oden', 'hokohoko', 'can500', 'おでん', 'だいこん、こんにゃく、うずら卵、ちくわ、牛すじ、だし', '280g', 'steel', { hot: true });
// 謎商会
def('vd_natto', 'nazo', 'can350', '炭酸飲料', '砂糖、納豆エキス、カラメル色素、香料、ねばり', '350ml', 'alu');
def('vd_mystery', 'nazo', 'can350', 'なぞ', 'ひみつ', '？？？ml', 'alu');
def('vd_peppo', 'nazo', 'can350', '炭酸飲料', '砂糖、カラメル色素、香料（23種）、酸味料', '350ml', 'alu');
// Mikawa-ya's own marble soda
def('ramune', 'gacha', 'ramune', '炭酸飲料', '砂糖、酸味料、香料', '200ml', 'glass', { juice: 0 });

export const DRINKS = D;
/** JAN digits (12, the check digit is added by the barcode) for a product of a brand. */
export const janOf = (brand, item) => '49' + (BRANDS[brand]?.code || '00000') + String(item).padStart(5, '0');
