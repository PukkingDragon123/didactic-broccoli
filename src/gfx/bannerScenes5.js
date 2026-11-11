// Real-art backdrops for every display card: a photograph (Google Open Images, CC BY 2.0) or a public-domain print (the
// Met's open access ukiyo-e, CC0) of the series' place, with the real surface the figures stand on along the bottom,
// reduced to high-resolution pixel art by tools/bake-art.py and shipped as PNGs (public/img/art/cards/<series>.png,
// 320 x 169, printed in 2 x 2 blocks). Sources and credits: CREDITS.md, "Display-card backdrops". Each file loads the
// first time its card is drawn; banner.js draws the card again once it is in.
const IDS = ['mochi', 'hoshitate', 'shokudo', 'hakoiri', 'kasa', 'bungu', 'showa', 'konbini', 'omocha', 'heya', 'machikado', 'kaden', 'yokai', 'onsen', 'dajare', 'pachimon', 'kaiju', 'uchu', 'omamori', 'neko_cafe', 'wagashi', 'matsuri', 'sentai', 'densha', 'umi', 'obake_yashiki', 'bizarre', 'lanepals', 'menzoo', 'oden', 'shotengai', 'haniwa', 'chibitto'];
const W = 640;
const IMG = {};
const loads = [];
function image(id) {
  if (IMG[id] || typeof Image === 'undefined') return IMG[id];
  const im = new Image();
  loads.push(new Promise((res) => { im.onload = res; im.onerror = res; }));
  im.src = `${import.meta.env.BASE_URL}img/art/cards/${id}.png`;
  return (IMG[id] = im);
}
/** Resolves when every backdrop asked for so far is in. */
export const flyerPhotos = () => Promise.all(loads);
export const flyerPhotosReady = () => Object.values(IMG).every((im) => im.complete);

export const FLYER_SCENES = Object.fromEntries(IDS.map((id) => ['art:' + id, (p, K, s, h) => {
  const im = image(id);
  if (im && im.complete && im.naturalWidth) {
    p.flush();
    p.ctx.imageSmoothingEnabled = false;
    p.ctx.drawImage(im, 0, 0, W, h);
    p.pull();
    return;
  }
  // (until the picture is in: the card's own paper colour)
  p.rect(0, 0, W, h, K.mixC(K.hex(s.card.bg), 0xffffff, 0.3));
  p.rect(0, h - 52, W, 52, K.mixC(K.hex(s.card.bg), 0x5a4a3a, 0.3));
}]));
