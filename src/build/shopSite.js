// Hirano Kagu (家具のヒラノ), the furniture and interior store on the 1999 web: the whole furniture catalogue
// (src/build/catalogue.js) with pictures rendered from the real models, paid from the bank, delivered in a box by the
// shutter. Registered with game.os.browser (http://www.hirano-kagu.co.jp/), bookmarked, and announced by mail once.
import { CATALOGUE, CATEGORIES, FURNITURE, orderFurniture } from './catalogue.js';
import { buildPiece } from './models.js';
import { unlockLevel } from '../data/unlocks.js';

const URL0 = 'http://www.hirano-kagu.co.jp/';
const yen = (n) => '¥' + Math.round(n).toLocaleString('en-US');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const thumbs = new Map();

function thumb(game, id) {
  if (thumbs.has(id)) return thumbs.get(id);
  let url = '';
  try {
    const b = buildPiece(FURNITURE[id], { photo: 'flyer_gacha_wall' });
    url = game.thumbs.renderObject(b.root, 72, { side: 0.55, up: 0.35 }).toDataURL();
  } catch (e) { console.warn('furniture thumb', id, e); }
  thumbs.set(id, url);
  return url;
}

export function installFurnitureSite(game) {
  const os = game.os, B = os?.browser;
  if (!B?.registerSite) return;
  B.registerSite({
    domain: 'hirano-kagu.co.jp', title: 'Hirano Kagu - Furniture & Interior', keywords: 'furniture interior decor poster posters plant plants sofa bench clock calendar neon sign rug fan tv radio piggy bank tip jar gumball vacuum robot box boxes storage register kagu',
    blurb: 'Furniture, decor and gadgets for your home and shop. Delivered to your door.',
    render(page, path, nav, ctx) {
      ctx.title?.('Hirano Kagu - Furniture & Interior');
      const cat = (ctx.url?.query?.get?.('c')) || 'all';
      const lv = game.progress?.level ?? 99;
      const tabs = ['all', ...Object.keys(CATEGORIES)].map((c) => `<a href="/?c=${c}" class="${c === cat ? 'on' : ''}">${c === 'all' ? 'All' : CATEGORIES[c]}</a>`).join(' | ');
      const list = CATALOGUE.filter((f) => cat === 'all' || f.category === cat);
      const rows = list.map((f) => {
        const need = f.unlock && game.progress && !game.progress.unlocked(f.unlock) ? unlockLevel(f.unlock) : 0;
        return `<div class="hk-item" data-id="${f.id}"><img class="hk-th" data-th="${f.id}" alt="">
          <div class="hk-txt"><b>${esc(f.name)}</b> <small>${esc(f.jp)}</small><p>${esc(f.desc)}</p><p class="hk-does">${esc(f.does)}</p></div>
          <div class="hk-buy"><span class="hk-price">${yen(f.price)}</span>${need ? `<span class="hk-lock">From shop level ${need}</span>` : `<button class="c98-btn hk-order" data-id="${f.id}">Order</button>`}</div></div>`;
      }).join('');
      page.innerHTML = `<div class="hk">
        <div class="hk-head"><b>家具のヒラノ</b><span>HIRANO KAGU</span><i>Furniture &amp; Interior since 1958 &middot; Free delivery in Morio-cho</i></div>
        <div class="hk-tabs">${tabs}</div>
        <div class="hk-note">Prices include tax. Paid by bank transfer from your Shinkin account. Your order arrives in a box at your door the same day.${lv < 99 ? '' : ''}</div>
        ${rows}
        <p class="hk-foot">Hirano Kagu Co., Ltd. &middot; 3-2-1 Ekimae, Morio-cho &middot; Tel 0120-58-1958 &middot; Posters are random photo prints: every one is different!</p></div>`;
      // pictures, a few at a time (rendered from the real 3D models)
      const imgs = [...page.querySelectorAll('img[data-th]')];
      const pump = () => {
        if (!page.isConnected) return;
        const t0 = performance.now();
        while (imgs.length && performance.now() - t0 < 12) { const im = imgs.shift(); const u = thumb(game, im.dataset.th); if (u) im.src = u; }
        if (imgs.length) setTimeout(pump, 30);
      };
      setTimeout(pump, 20);
      for (const b of page.querySelectorAll('.hk-order')) b.addEventListener('click', async () => {
        const f = FURNITURE[b.dataset.id];
        if (!(await os.confirm(`Order "${f.name}" for ${yen(f.price)}?\nIt will be delivered to your shutter.`, 'Hirano Kagu'))) return;
        const r = orderFurniture(game, f.id);
        if (!r.ok) { os.alert(r.msg.includes('bank') ? 'Your bank declined the payment: insufficient funds.\nDeposit cash at the ATM.' : r.msg, 'Hirano Kagu', 'error'); return; }
        os.alert(`Thank you for your order!\n${f.name} will be delivered shortly.`, 'Hirano Kagu');
      });
      void nav;
    },
  });
  // a bookmark, and a hello in the mailbox (once)
  const st = os.st;
  const web = st.web;
  if (web?.bookmarks && !web.bookmarks.some(([, u]) => u === URL0)) web.bookmarks.push(['Hirano Kagu (furniture)', URL0]);
  const flags = game.state.flags;
  if (!flags.hiranoMail && os.mail?.send) {
    flags.hiranoMail = true;
    os.mail.send({
      from: 'Hirano Kagu', subject: 'Furnish your new shop!', quiet: true,
      body: 'Dear shopkeeper,\n\nA shop sells better when it feels like a place. Posters (every print a surprise), clocks, benches, a tip jar, a gumball machine, even a robot vacuum: see our full catalogue at www.hirano-kagu.co.jp\n\nEverything is delivered to your door in a box. Open it where you want it.\n\nHirano Kagu, Ekimae',
    });
  }
}
