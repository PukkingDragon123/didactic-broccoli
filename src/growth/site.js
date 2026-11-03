// 太田不動産 OTA REAL ESTATE on the 1999 web (http://www.ota-fudosan.co.jp/): Mrs. Ota's listings around the lane and
// by the station, each with a hand-pixelled photo, the price, the shop level it opens at and an Apply button (the
// paper contract, src/growth/paper.js). "My contracts" lists what you rent and own, the monthly payments and the
// mortgages (pay one off early from here). Bookmarked and announced by mail once.
import { LISTINGS, LISTING, SITE_URL, downPayment, instalment, yen } from './data.js';
import './site.css';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const photos = {};

/** A little pixel "photo" for a listing (drawn once, 96x64). */
function photo(id) {
  if (photos[id]) return photos[id];
  const c = document.createElement('canvas'); c.width = 96; c.height = 64;
  const x = c.getContext('2d');
  const R = (col, a, b, w, h) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  const sky = (top, bot) => { for (let y = 0; y < 64; y += 4) R(y < 24 ? top : bot, 0, y, 96, 4); };
  if (id === 'home103' || id === 'hobby') {
    sky('#9fc3e0', '#b8d4e8');
    R('#a8b8c4', 6, 10, 84, 54); R('#8a9aa6', 6, 10, 84, 4); // the block
    for (const dx of [12, 40, 68]) { R('#d8d4c8', dx, 26, 16, 34); R('#5a6a7a', dx + 2, 28, 12, 30); R('#d8c870', dx + 11, 44, 2, 3); R('#f0e8a0', dx + 4, 20, 8, 3); }
    R('#fbf8f0', 70, 22, 12, 4); x.fillStyle = '#c8322c'; x.font = '8px "DotGothic16"'; x.fillText('103', 70, 21 + 6);
    R('#3a4a5a', 0, 60, 96, 4);
    if (id === 'hobby') { R('#241a1e', 18, 4, 60, 22); R('#f4e8c8', 20, 6, 56, 18); for (let i = 0; i < 7; i++) R(['#d8463a', '#3a7ad8', '#f0c040', '#5ab060'][i % 4], 23 + i * 7, 12, 5, 8); }
  } else if (id === 'annex') {
    sky('#9fc3e0', '#c0d8ea');
    R('#8a7a68', 4, 8, 88, 56); R('#6a5a48', 4, 8, 88, 3); // the old shop
    R('#b0a898', 10, 30, 52, 30); for (let y = 31; y < 60; y += 3) R('#8a8478', 10, y, 52, 1); // shutter
    R('#fbf6e8', 12, 14, 72, 12); x.fillStyle = '#8a3a2a'; x.font = '9px "DotGothic16"'; x.fillText('たばこ', 30, 23);
    R('#c84a3a', 66, 32, 18, 6); R('#dfeef0', 66, 38, 18, 14); R('#c84a3a', 64, 52, 22, 3); // the window
    R('#d8282a', 84, 40, 10, 22); R('#f4f0e6', 85, 42, 8, 8); // vending machine
    R('#5a5248', 0, 61, 96, 3); R('#5a8a3a', 4, 58, 6, 4);
  } else {
    // the Kaikan: a 4-floor block by the tracks, neon at night
    sky('#2a2848', '#3a3460');
    R('#d8d0c0', 14, 6, 68, 58);
    for (let f = 0; f < 4; f++) { const y = 10 + f * 13; R(['#f04a8a', '#4ad0f0', '#f0d040', '#8af04a'][f], 16, y, 64, 2); for (let i = 0; i < 8; i++) R(f === 3 ? '#fff4c8' : '#ffe8a0', 18 + i * 8, y + 4, 6, 6); }
    R('#e8303a', 34, 52, 28, 12); R('#9ad8f0', 40, 54, 16, 10); // the entrance
    x.fillStyle = '#ffd23f'; x.font = '8px "DotGothic16"'; x.fillText('ガチャ会館', 28, 8);
    R('#4a4a52', 0, 60, 14, 4); R('#4a4a52', 82, 60, 14, 4); R('#7a7a82', 84, 30, 12, 30); // the station
    if (LISTING[id]?.floor) { R('rgba(26,18,22,.55)', 0, 0, 96, 64); x.fillStyle = '#fff4c8'; x.font = '16px "DotGothic16"'; x.fillText(`${LISTING[id].floor}F`, 38, 40); }
  }
  photos[id] = c.toDataURL();
  return photos[id];
}

export function installEstateSite(game, growth) {
  const os = game.os, B = os?.browser;
  if (!B?.registerSite) return;
  B.registerSite({
    domain: 'ota-fudosan.co.jp', title: 'Ota Real Estate - Morio-cho', keywords: 'ota real estate fudosan rent flat apartment house shop building property lease buy mortgage landlady sakura heights tobacco kaikan',
    blurb: 'Flats, houses and shops for rent and for sale in Morio-cho. Since 1962.',
    render(page, path, nav, ctx) {
      ctx.title?.('Ota Real Estate - Morio-cho');
      const mine = path.startsWith('/my');
      const head = `<div class="ota-head"><b>太田不動産</b><span>OTA REAL ESTATE</span><i>Flats, houses &amp; shops in Morio-cho since 1962 &middot; Tel 3-2711</i></div>
        <div class="ota-tabs"><a href="/" class="${mine ? '' : 'on'}">Listings</a> | <a href="/my" class="${mine ? 'on' : ''}">My contracts</a></div>`;
      page.innerHTML = `<div class="ota">${head}${mine ? myPage(game, growth) : listPage(game, growth)}
        <p class="ota-foot">Ota Real Estate &middot; 2-11 Kamiyama-cho, Morio &middot; Open when Mrs. Ota is home (always) &middot; Prices include tax. Contracts are sealed with your personal hanko.</p></div>`;
      page.addEventListener('click', async (e) => {
        const t = e.target.closest('[data-apply], [data-payoff]');
        if (!t) return;
        e.preventDefault(); e.stopPropagation();
        if (t.dataset.apply) {
          const ok = await growth.apply(t.dataset.apply);
          os.sound?.(ok ? 'osCoin' : 'osError');
          ctx.nav(ctx.url.path);
        }
        if (t.dataset.payoff) {
          const l = growth.s.loans.find((x) => x.id === t.dataset.payoff);
          if (!l || !(await os.confirm(`Pay off the rest of this mortgage now?\n${yen(l.left)} from your bank account.`, 'Morio Shinkin Bank'))) return;
          const r = growth.payoff(l.id);
          os.sound?.(r.ok ? 'osCoin' : 'osError');
          await os.alert(r.msg, 'Morio Shinkin Bank', r.ok ? 'info' : 'warn');
          ctx.nav('/my');
        }
      });
      void nav;
    },
  });
  // a bookmark (Mrs. Ota writes herself when a listing opens up: Growth.mailNew)
  const web = os.st?.web;
  if (web?.bookmarks && !web.bookmarks.some(([, u]) => u === SITE_URL)) web.bookmarks.push(['Ota Real Estate', SITE_URL]);
}

function listPage(game, growth) {
  const rows = LISTINGS.map((L) => {
    const st = growth.status(L.id);
    const price = L.kind === 'lease' ? `${yen(L.price)} key money<br>${yen(L.monthly)} / month`
      : L.kind === 'buy' ? `${yen(L.price)}<br><small>${yen(downPayment(L))} down + ${L.months} x ${yen(instalment(L.price - downPayment(L), L.rate, L.months))}</small>`
        : yen(L.price);
    const act = st.state === 'available' ? `<button class="c98-btn ota-apply" data-apply="${L.id}">Apply</button>`
      : st.state === 'done' ? `<span class="ota-done">${esc(st.why)}</span>` : `<span class="ota-lock">${esc(st.why)}</span>`;
    return `<div class="ota-item ${st.state}"><img src="${photo(L.id)}" alt="">
      <div class="ota-txt"><b>${esc(L.name)}</b> <small>${esc(L.jp)}</small><p class="ota-short">${esc(L.short)}</p><p>${esc(L.blurb)}</p>
      <ul>${(L.perks || []).map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>
      <div class="ota-buy"><span class="ota-price">${price}</span>${act}</div></div>`;
  }).join('');
  return `<div class="ota-note">New this month! <blink>&#9733;</blink> Sakura Heights #103 &middot; the old tobacco shop on Kamiyama lane &middot; a whole building by Morio Station (listed for Morio Shinkin Bank).</div>${rows}`;
}

function myPage(game, growth) {
  const done = LISTINGS.filter((L) => growth.has(L.id));
  if (!done.length) return '<p class="ota-empty">No contracts yet. Have a look at our <a href="/">listings</a>.</p>';
  const list = done.map((L) => `<li><b>${esc(L.name)}</b> &middot; since day ${growth.s.done[L.id]}</li>`).join('');
  const monthly = growth.monthly();
  const total = monthly.reduce((a, m) => a + m.amount, 0);
  const loans = growth.loans().map((l) => `<tr><td>${esc(l.name)}</td><td>${yen(l.principal)}</td><td>${l.closed ? 'Paid off' : `${yen(Math.min(l.monthly, l.left))} / month`}</td><td>${l.closed ? '-' : yen(l.left)}</td><td>${l.closed ? '' : `<button class="c98-btn" data-payoff="${l.id}">Pay off</button>`}</td></tr>`).join('');
  return `<h3>Your properties</h3><ul class="ota-mine">${list}</ul>
    <h3>Every month</h3><table class="ota-tab">${monthly.map((m) => `<tr><td>${esc(m.name)}</td><td>${yen(m.amount)}</td></tr>`).join('')}<tr class="t"><td>Total (bills on the 20th, due the 27th)</td><td>${yen(total)}</td></tr></table>
    ${loans ? `<h3>Mortgages (Morio Shinkin Bank)</h3><table class="ota-tab"><tr><th>Property</th><th>Borrowed</th><th>Instalment</th><th>Left to pay</th><th></th></tr>${loans}</table>` : ''}`;
}
