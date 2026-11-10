// The built-in World Wide Web of 1999 (registered with game.os.browser.registerSite):
//   capsule.ne.jp        CapsuleNet, the portal: search, directory, headlines, weather
//   morio-shimbun.jp     the town paper        tenki.ne.jp     the weather        buzzlane.jp   promote your shop
//   capsule98.co.jp      the OS maker (help, updates)
// The shops live in src/market/ (registered by src/plugins/market.js): off-hobby.jp (second-hand marketplace),
// daikoku-toys.co.jp (the wholesaler's order desk), kgs-grading.jp, museum-works.jp, and gacha-mart.co.jp, which has
// closed its web store and points to them.
//   free-gacha-prize.biz / geohouses.ne.jp/~okuyasu / kappa-dance.ne.jp: the silly side of the web
import { h, esc, ic } from './ui.js';
import { yen } from '../OS.js';
import { now, MONTHS, WEEKDAYS, dateOfDay } from '../time.js';
import { hash2 } from '../../core/util.js';

const today = (game) => { const t = now(game); return `${WEEKDAYS[t.weekday]}, ${MONTHS[t.month]} ${t.date}, ${t.year}`; };
const counter = (n, len = 7) => `<span class="st-counter">${String(n).padStart(len, '0').split('').map((d) => `<i>${d}</i>`).join('')}</span>`;

// ------------------------------------------------------------------ weather (shared by the portal, the paper, 177)
const WX = [
  { id: 'sun', name: 'Sunny', icon: 'os_sun' }, { id: 'pc', name: 'Partly cloudy', icon: 'os_cloud' }, { id: 'cloud', name: 'Cloudy', icon: 'os_cloud' },
  { id: 'rain', name: 'Rain', icon: 'os_rain' }, { id: 'shower', name: 'Showers', icon: 'os_rain' },
];
const SEASON_T = { spring: [17, 8], summer: [30, 23], autumn: [20, 12], winter: [9, 1] };
export function forecast(game, day) {
  const g = game.weather?.forecast?.(day);
  if (g) return g;
  const season = game.calendar?.season?.(day) || 'spring';
  const r = hash2(day, 77), k = season === 'summer' ? 0.5 : 0.62;
  const wx = r < 0.3 ? WX[0] : r < k ? WX[1] : r < 0.8 ? WX[2] : r < 0.92 ? WX[3] : WX[4];
  const [hi, lo] = SEASON_T[season];
  const j = Math.round((hash2(day, 13) - 0.5) * 6);
  return { ...wx, hi: hi + j - (wx.id === 'rain' ? 3 : 0), lo: lo + Math.round(j / 2), rain: wx.id === 'rain' ? 80 : wx.id === 'shower' ? 60 : wx.id === 'cloud' ? 30 : wx.id === 'pc' ? 20 : 0 };
}

export function installSites(game, os, browser) {
  const reg = (d) => browser.registerSite(d);
  const st = os.st.web;

  // ================================================================== CapsuleNet portal
  const DIRECTORY = [
    ['Shopping', [['Off-Hobby (second-hand)', 'http://www.off-hobby.jp/'], ['Daikoku Toy Wholesale', 'http://www.daikoku-toys.co.jp/'], ['Kura Museum Works', 'http://www.museum-works.jp/']]],
    ['News & Media', [['The Morio Shimbun', 'http://www.morio-shimbun.jp/']]],
    ['Weather', [['Tenki Net', 'http://www.tenki.ne.jp/']]],
    ['Business', [['BuzzLane Ads', 'http://www.buzzlane.jp/'], ['Morio Shinkin Bank', 'http://www.capsule.ne.jp/search?q=bank']]],
    ['Personal Pages', [['GeoHouses', 'http://www.geohouses.ne.jp/'], ["Okuyasu's Homepage", 'http://www.geohouses.ne.jp/~okuyasu/']]],
    ['Fun & Games', [['Kappa Dance!!', 'http://www.kappa-dance.ne.jp/'], ['FREE Prizes', 'http://www.free-gacha-prize.biz/']]],
    ['Computers', [['Capsule 98 Support', 'http://www.capsule98.co.jp/']]],
  ];
  reg({
    domain: 'capsule.ne.jp', title: 'CapsuleNet', keywords: 'portal search directory',
    render(page, path, nav, ctx) {
      if (path.startsWith('/search')) return search(page, ctx);
      const t = now(game), wx = forecast(game, t.day);
      const promo = activePromo();
      const heads = headlines(game).slice(0, 5);
      page.innerHTML = `<div class="st-portal">
        <div class="pt-top"><div class="pt-logo">${ic('os_logo', 2)}<b>Capsule<i>Net</i></b><small>Japan's friendly Internet</small></div>
          <div class="pt-nav"><a href="/search?q=mail">Mail</a> | <a href="http://www.morio-shimbun.jp/">News</a> | <a href="http://www.tenki.ne.jp/">Weather</a> | <a href="http://www.off-hobby.jp/">Shopping</a> | <a href="http://www.capsule98.co.jp/help">Help</a></div></div>
        <form class="pt-search"><input class="c98-field" name="q" placeholder="" autocomplete="off"><button class="c98-btn" type="submit">Search</button><span class="c98-dim">Tip: try "capsules" or "weather"</span></form>
        <div class="pt-ad">${promo ? `<a href="http://www.off-hobby.jp/" class="pt-own">${ic('shop', 2)}<span><b>GACHA GARAGE</b> - ${esc(promo.text || 'Capsule toys on the lane!')}</span><em>AD</em></a>` : `<a href="http://www.free-gacha-prize.biz/" class="pt-spam"><b>!! YOU HAVE WON !!</b> Claim your FREE gacha machine NOW <em>CLICK HERE</em></a>`}</div>
        <div class="pt-cols">
          <div class="pt-dir"><h3>Web Directory</h3>${DIRECTORY.map(([c, l]) => `<div class="pt-cat"><b>${esc(c)}</b><br>${l.map(([n, u]) => `<a href="${u}">${esc(n)}</a>`).join(', ')}</div>`).join('')}</div>
          <div class="pt-mid"><h3>Today's Headlines <small>${esc(today(game))}</small></h3><ul>${heads.map((a) => `<li><a href="http://www.morio-shimbun.jp/article/${a.id}">${esc(a.title)}</a></li>`).join('')}</ul>
            <h3>What's Cool</h3><ul><li><a href="http://www.kappa-dance.ne.jp/">The Dancing Kappa</a> - everybody is talking about it</li><li><a href="http://www.geohouses.ne.jp/~okuyasu/">A homepage about bread</a> (?)</li><li><a href="http://www.buzzlane.jp/">Advertise your shop online</a> from just ¥800</li></ul></div>
          <div class="pt-side"><h3>Weather</h3><a class="pt-wx" href="http://www.tenki.ne.jp/">${ic(wx.icon, 2)}<span><b>${esc(wx.name)}</b><br>${wx.hi}° / ${wx.lo}°C<br>Rain ${wx.rain}%</span></a>
            <h3>Stocks</h3><div class="pt-stk">NIKKEI 17,412 <span class="up">+38</span><br>GACHA IDX 1,999 <span class="up">+7</span><br>YEN/USD 121.4 <span class="dn">-0.6</span></div></div></div>
        <p class="pt-foot">Copyright (C) 1999 CapsuleNet Co., Ltd. | <a href="/search?q=about">About CapsuleNet</a> | <a href="/search?q=privacy">Privacy</a><br>You are visitor ${counter(48213 + Math.floor((game.state.playTime || 0) / 7))}</p></div>`;
      page.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); const q = page.querySelector('input').value.trim(); if (q) nav(`/search?q=${encodeURIComponent(q)}`); });
      setTimeout(() => page.querySelector('input')?.focus(), 30);
    },
  });

  function search(page, ctx) {
    const q = (ctx.url.query.get('q') || '').trim();
    ctx.title(q ? `CapsuleNet Search: ${q}` : 'CapsuleNet Search');
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const hits = [];
    for (const [d, s] of browser.sites) {
      if (s.listed === false) continue;
      const hay = `${d} ${s.title} ${s.keywords || ''}`.toLowerCase();
      const score = words.reduce((a, w) => a + (hay.includes(w) ? 1 : 0), 0);
      if (score) hits.push({ score, title: s.title, url: `http://www.${d}/`, text: s.blurb || s.keywords || '' });
    }
    hits.sort((a, b) => b.score - a.score);
    const junk = [
      { title: `${q} - FREE ${q.toUpperCase()} - ${q} ${q} ${q}`, url: 'http://www.free-gacha-prize.biz/', text: `${q} free free best ${q} cheap ${q} prize winner click here ${q}` },
      { title: `My ${q} page (under construction)`, url: 'http://www.geohouses.ne.jp/~okuyasu/', text: 'Welcome to my homepage!! Sign my guestbook!!' },
    ];
    page.innerHTML = `<div class="st-portal"><div class="pt-top"><div class="pt-logo"><a href="/">${ic('os_logo', 2)}</a><b>Capsule<i>Net</i></b><small>Search</small></div></div>
      <form class="pt-search"><input class="c98-field" name="q" value="${esc(q)}" autocomplete="off"><button class="c98-btn" type="submit">Search</button></form>
      ${q ? `<p class="pt-res">Results 1 - ${hits.length + (q.length > 2 ? junk.length : 0)} of about ${(hits.length * 1300 + 77).toLocaleString('en-US')} for <b>${esc(q)}</b>.</p>` : '<p>Type a word and press Search.</p>'}
      <ol class="pt-hits">${[...hits, ...(q.length > 2 ? junk : [])].map((r) => `<li><a href="${r.url}">${esc(r.title)}</a><br><span>${esc(r.text)}</span><br><cite>${esc(r.url)}</cite> - <a href="${r.url}" class="c98-dim">Similar pages</a></li>`).join('')}</ol>
      ${q && !hits.length ? `<p>No pages were found containing <b>"${esc(q)}"</b>. Check your spelling, or browse the <a href="/">directory</a>.</p>` : ''}</div>`;
    page.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); const v = page.querySelector('input').value.trim(); if (v) ctx.nav(`/search?q=${encodeURIComponent(v)}`); });
  }

  // ================================================================== The Morio Shimbun
  reg({
    domain: 'morio-shimbun.jp', title: 'The Morio Shimbun', keywords: 'news newspaper town morio local articles classifieds', blurb: 'Local news for Morio-cho since 1951.',
    render(page, path, nav, ctx) {
      const list = headlines(game);
      const m = /^\/article\/(\w+)/.exec(path);
      const mast = `<div class="nw-mast"><a href="/" class="nw-name">The Morio Shimbun</a><div class="nw-line"><span>${esc(today(game))}</span><span>Morio-cho, Edition ${(1000 + now(game).day)}</span><span>¥0 online</span></div></div>`;
      const side = sidebar();
      if (m) {
        const a = list.find((x) => String(x.id) === m[1]);
        if (!a) { ctx.notFound(); return; }
        ctx.title(`${a.title} - The Morio Shimbun`);
        page.innerHTML = `<div class="st-news">${mast}<div class="nw-cols"><div class="nw-main"><h1>${esc(a.title)}</h1><p class="nw-by">By ${esc(a.by || 'Staff Reporter')}</p>${a.body.split('\n\n').map((p) => `<p>${esc(p)}</p>`).join('')}<p><a href="/">&lt;&lt; Back to the front page</a></p></div>${side}</div></div>`;
        return;
      }
      if (path !== '/' && path !== '/index.html') { ctx.notFound(); return; }
      const [lead, ...rest] = list;
      page.innerHTML = `<div class="st-news">${mast}<div class="nw-cols"><div class="nw-main">
        <h1><a href="/article/${lead.id}">${esc(lead.title)}</a></h1><p>${esc(lead.body.split('\n\n')[0])} <a href="/article/${lead.id}">more...</a></p><hr>
        ${rest.map((a) => `<h2><a href="/article/${a.id}">${esc(a.title)}</a></h2><p>${esc(a.body.split('\n\n')[0].slice(0, 140))}... <a href="/article/${a.id}">more</a></p>`).join('')}</div>${side}</div>
        <p class="nw-foot">(C) 1999 The Morio Shimbun. All rights reserved. Do not reproduce without permission. <a href="http://www.capsule.ne.jp/">CapsuleNet</a></p></div>`;
    },
  });
  const sidebar = () => {
    const wx = forecast(game, now(game).day);
    return `<div class="nw-side"><h3>Weather</h3><p>${ic(wx.icon, 1)} ${esc(wx.name)}, ${wx.hi}°C. <a href="http://www.tenki.ne.jp/">Forecast</a></p>
      <h3>Classifieds</h3><p><b>LOST:</b> calico cat, answers to "Mikan". Probably asleep somewhere warm.</p><p><b>FOR SALE:</b> antique arrow, slightly pointy. Do not touch the tip. Serious buyers only.</p><p><b>WANTED:</b> part-time help at Mikawa-ya. Must like cats.</p>
      <h3>Advertisement</h3><p><a href="http://www.buzzlane.jp/">Your ad here! BuzzLane gets your shop noticed.</a></p></div>`;
  };

  // ================================================================== Tenki Net
  reg({
    domain: 'tenki.ne.jp', title: 'Tenki Net - Weather Forecast', keywords: 'weather forecast rain sun temperature tenki', blurb: 'The 5-day forecast for the Kanto region.',
    render(page) {
      const t = now(game);
      const days = Array.from({ length: 5 }, (_, i) => ({ day: t.day + i, f: forecast(game, t.day + i), d: dateOfDay(game, t.day + i) }));
      const f0 = days[0].f;
      const idx = f0.id === 'sun' ? 5 : f0.id === 'pc' ? 4 : f0.id === 'cloud' ? 3 : 2;
      page.innerHTML = `<div class="st-wx"><div class="wx-head"><b>Tenki<i>Net</i></b><span>Kanto Region &gt; Morio-cho</span></div>
        <div class="wx-now">${ic(f0.icon, 4)}<div><h2>Today: ${esc(f0.name)}</h2><p>High <b>${f0.hi}°C</b> / Low <b>${f0.lo}°C</b> &middot; Chance of rain ${f0.rain}%</p><p>Gacha Index: <b>${'*'.repeat(idx)}</b> ${['', '', 'Stay in', 'Not bad', 'Good day to shop', 'Perfect capsule weather!'][idx]}</p></div></div>
        <table class="wx-t"><tr>${days.map((x, i) => `<th>${i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : WEEKDAYS[x.d.weekday].slice(0, 3)}<br><small>${x.d.month + 1}/${x.d.date}</small></th>`).join('')}</tr>
        <tr>${days.map((x) => `<td>${ic(x.f.icon, 2)}<br>${esc(x.f.name)}</td>`).join('')}</tr>
        <tr>${days.map((x) => `<td><span class="hi">${x.f.hi}°</span> / <span class="lo">${x.f.lo}°</span></td>`).join('')}</tr>
        <tr>${days.map((x) => `<td>Rain ${x.f.rain}%</td>`).join('')}</tr></table>
        <p class="c98-dim">Forecasts by the Tenki Net weather desk. Updated every 3 hours. Dial 177 for the recorded forecast.</p></div>`;
    },
  });

  // ================================================================== BuzzLane: promote your shop
  const PACKS = [
    { id: 'bbs', name: 'Lane BBS post', desc: 'A friendly post on the Morio-cho community board.', price: 800, reach: 0.15, days: 1 },
    { id: 'flyer', name: 'E-flyer blast', desc: 'Your flyer in 2,000 CapsuleNet mailboxes.', price: 2500, reach: 0.3, days: 1 },
    { id: 'banner', name: 'Portal banner', desc: 'A banner on the CapsuleNet front page for two days.', price: 6000, reach: 0.5, days: 2 },
    { id: 'radio', name: 'Morio FM radio spot', desc: '30 seconds after the morning traffic report, three days running.', price: 15000, reach: 0.8, days: 3 },
  ];
  st.promo ||= [];
  function activePromo() { const t = now(game).stamp; return st.promo.filter((p) => p.until > t).slice(-1)[0] || null; }
  reg({
    domain: 'buzzlane.jp', title: 'BuzzLane Ads - Get Your Shop Noticed!', keywords: 'ads advertising promote promotion marketing customers shop business', blurb: 'Online and radio advertising for small shops.',
    render(page, path, nav, ctx) {
      const t = now(game);
      const act = st.promo.filter((p) => p.until > t.stamp);
      if (path.startsWith('/thanks')) {
        const p = st.promo[st.promo.length - 1];
        page.innerHTML = `<div class="st-buzz"><div class="bz-head"><b>Buzz<i>Lane</i></b></div><div class="bz-box"><h2>Thank you for your order!</h2><p>Campaign <b>No. ${esc(p?.no || '----')}</b> (${esc(p?.name || '')}) is now running.</p><p>Expect more customers on the lane. Good luck with your shop!</p><p><a href="/">Back to BuzzLane</a></p></div></div>`;
        return;
      }
      page.innerHTML = `<div class="st-buzz"><div class="bz-head"><b>Buzz<i>Lane</i></b><span>Advertising for the little shops of Morio-cho</span></div>
        <div class="bz-box"><h2>Get the word out!</h2><p>More people on the lane means more customers at your machines. Pick a package, write your slogan, and we do the rest.</p>
        ${act.length ? `<p class="bz-act">${ic('megaphone', 1)} Running now: ${act.map((p) => `${esc(p.name)} (until ${esc(game.calendar?.format?.(Math.floor(p.until / 1440) + 1) || 'soon')})`).join(', ')}</p>` : ''}
        <form><table class="bz-t"><tr><th></th><th>Package</th><th>Reach</th><th>Runs</th><th>Price</th></tr>
        ${PACKS.map((p, i) => `<tr><td><input type="radio" name="pk" value="${p.id}"${i === 1 ? ' checked' : ''}></td><td><b>${esc(p.name)}</b><br><small>${esc(p.desc)}</small></td><td>+${Math.round(p.reach * 100)}% customers</td><td>${p.days} day${p.days > 1 ? 's' : ''}</td><td>${yen(p.price)}</td></tr>`).join('')}</table>
        <p>Your slogan: <input class="c98-field bz-sl" name="sl" maxlength="40" value="Capsule toys on the lane - come and turn the handle!"></p>
        <p><button class="c98-btn def" type="submit">Place order</button> <span class="c98-dim">Payment by bank transfer from your Shinkin account.</span></p></form></div>
        <p class="c98-dim">BuzzLane Co. is a member of the Morio-cho Chamber of Commerce. Results may vary. Ads cannot make a cat sell capsules.</p></div>`;
      page.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = page.querySelector('input[name="pk"]:checked')?.value, p = PACKS.find((x) => x.id === id);
        const text = page.querySelector('.bz-sl').value.trim().slice(0, 40);
        if (!p) return;
        if (!(await os.confirm(`Order "${p.name}" for ${yen(p.price)}?`, 'BuzzLane order'))) return;
        const paid = game.sim?.payDigital ? game.sim.payDigital(p.price, `BuzzLane ad: ${p.name}`) : game.spend(p.price, `BuzzLane ad: ${p.name}`);
        if (!paid) { os.alert('Your bank declined the payment: insufficient funds.', 'BuzzLane', 'error'); return; }
        const no = String(1000 + st.promo.length * 7 + Math.floor(Math.random() * 7));
        st.promo.push({ no, id: p.id, name: p.name, text, until: now(game).stamp + p.days * 1440 });
        game.events.emit('promo', { reach: p.reach, days: p.days, kind: p.id, text });
        os.achievements?.unlock('os_promoter');
        nav('/thanks');
      });
    },
  });

  // (Daikoku Toy Wholesale's order desk: src/market/supplier.js)

  // ================================================================== Capsule 98 support
  reg({
    domain: 'capsule98.co.jp', title: 'Capsule Systems - Capsule 98', keywords: 'capsule 98 help support update windows os computer', blurb: 'Support and updates for Capsule 98.',
    render(page, path, nav, ctx) {
      const head = `<div class="c9-head">${ic('os_logo', 2)}<b>Capsule Systems</b><span><a href="/">Home</a> | <a href="/help">Help</a> | <a href="/update">Updates</a></span></div>`;
      if (path.startsWith('/help')) {
        ctx.title('Capsule 98 Help');
        page.innerHTML = `<div class="st-c9">${head}<h2>Capsule 98 Help Topics</h2><dl>
          <dt>Getting around</dt><dd>Double-click an icon to start a program. Drag a window by its title bar; drag its edges to resize it. Right-click things for more options.</dd>
          <dt>Standing up</dt><dd>Press <b>Esc</b>, or click the power button on the Start menu, to stand up from the computer. Capsule 98 keeps running while you're away.</dd>
          <dt>Keyboard shortcuts</dt><dd>Alt+F4 closes a window. In Capsule Navigator: Backspace goes back, F5 reloads, Ctrl+D adds a bookmark.</dd>
          <dt>Ordering stock</dt><dd>New machines and capsules: the Daikoku Toys order desk (or Mr. Daikoku's deals on Pichat). Second-hand everything: Off-Hobby. Deliveries come by courier.</dd>
          <dt>Bills and loans</dt><dd>Open Shinkin Online on the desktop. Bills arrive in your Mailbox; pay them before the due date to avoid late fees.</dd>
          <dt>Spam</dt><dd>Never pay a "processing fee" to claim a prize. Use the Spam button in Mailbox and the Block button in Pichat.</dd></dl></div>`;
        return;
      }
      if (path.startsWith('/update')) {
        ctx.title('Capsule 98 Update');
        page.innerHTML = `<div class="st-c9">${head}<h2>Capsule 98 Update</h2><p>Checking your computer for available updates...</p><div class="c98-prog"><i></i></div><p class="c9-st">Estimated time left: calculating...</p></div>`;
        const bar = page.querySelector('.c98-prog i'), stEl = page.querySelector('.c9-st');
        let k = 0;
        const iv = setInterval(() => {
          k += 0.07;
          bar.style.width = `${Math.min(95, Math.ceil(k * 20) * 5)}%`;
          stEl.textContent = `Estimated time left: ${Math.max(3, Math.round(48 - k * 40))} hours (28.8 Kbps)`;
          if (k > 1.2) { clearInterval(iv); os.alert('Capsule 98 Update could not continue.\n\nError 0x0000CAFE: The connection is too slow. Please try again with a faster modem.', 'Capsule 98 Update', 'error'); stEl.textContent = 'Update failed.'; }
        }, 220);
        return () => clearInterval(iv);
      }
      page.innerHTML = `<div class="st-c9">${head}<div class="c9-hero">${ic('os_logo', 6)}<div><h1>Capsule 98 <i>Second Edition</i></h1><p>Faster. Friendlier. Now with Capsule Navigator 4 and Pichat built in.</p><p><a href="/update">Get the latest updates</a> | <a href="/help">Help topics</a></p></div></div>
        <p>Thank you for registering your copy of Capsule 98. Product ID: 26814-OEM-0019981-04271.</p></div>`;
    },
  });

  // ================================================================== the silly web
  reg({
    domain: 'free-gacha-prize.biz', title: '!!! CONGRATULATIONS WINNER !!!', keywords: 'free prize winner gacha machine money', blurb: 'YOU ARE WINNER!!! claim FREE gacha machine now!!!', slow: true,
    render(page, path, nav, ctx) {
      if (path.startsWith('/thanks')) {
        page.innerHTML = '<div class="st-spam"><h1>THANK YOU!!!</h1><p>Your prize will be delivered in 6-8 business years.</p><p class="sp-small">Processing fee is non-refundable. Prize may differ from picture. There is no picture.</p></div>';
        return;
      }
      if (path.startsWith('/claim')) {
        page.innerHTML = `<div class="st-spam"><h1>ONE LAST STEP!!!</h1><p>To ship your FREE GACHA MACHINE (value ¥250,000) please pay the small processing fee of only <b>¥500</b>.</p><p><button class="c98-btn sp-pay">PAY ¥500 NOW</button></p><p class="sp-small">Offer valid for the next 00:04:59. Do not tell anyone.</p></div>`;
        page.querySelector('.sp-pay').addEventListener('click', async () => {
          if (!(await os.confirm('Send ¥500 to "Prize Center Ltd. (Cayman)"?', 'Payment'))) return;
          if (!game.spend(500, 'Prize Center Ltd. (Cayman)')) { os.alert('Insufficient funds.', 'Payment', 'error'); return; }
          os.achievements?.unlock('os_sucker');
          nav('/thanks');
        });
        return;
      }
      page.innerHTML = `<div class="st-spam"><div class="sp-blink">!!! CONGRATULATIONS !!!</div><h1>You are the 1,000,000th visitor!</h1>
        <p>You have been selected to receive a <b>FREE GACHA MACHINE</b> (value ¥250,000)!!!</p><p><a href="/claim" class="sp-btn">CLAIM YOUR PRIZE</a></p>
        <p class="sp-small">This is not a scam. 100% legit. As seen on TV. Click within 60 seconds or prize go to other winner.</p>${counter(1000000)}</div>`;
      if (!ctx.bw._popped) {
        ctx.bw._popped = true;
        setTimeout(() => { os.open('popup', { kind: 'singles' }); setTimeout(() => os.open('popup', { kind: 'virus' }), 450); }, 600);
      }
    },
  });

  reg({
    domain: 'geohouses.ne.jp', title: 'GeoHouses - free homepages', keywords: 'homepage personal free geohouses okuyasu bread', blurb: 'Build your own homepage for FREE!',
    render(page, path, nav, ctx) {
      const bar = '<div class="gh-bar"><b>GeoHouses</b> free homepages! <a href="/">Directory</a> | <a href="/~okuyasu/">Random page</a> | <a href="http://www.kappa-dance.ne.jp/">Next in the Lane Webring &gt;&gt;</a></div>';
      if (path.startsWith('/~okuyasu')) {
        ctx.title("~*~ OKUYASU's HOMEPAGE ~*~");
        if (path.includes('guestbook')) return guestbook(page, bar, ctx);
        page.innerHTML = `<div class="st-oku">${bar}<div class="ok-in"><h1>WELCOME 2 OKUYASU'S HOMEPAGE!!!</h1><div class="ok-uc"><span>UNDER CONSTRUCTION</span></div>
          <p>Hi!!! My name is Okuyasu and this is my homepage. I made it myself. My friend Josuke helped. He said it looks "fine".</p>
          <h2>MY TOP 10 BREADS</h2><ol><li>Melon bread</li><li>Melon bread (the big one)</li><li>Curry bread</li><li>Yakisoba bread</li><li>Anpan</li><li>Cream bread</li><li>The bread at Mikawa-ya</li><li>Bread</li><li>Bread with a capsule toy inside (I wish)</li><li>Josuke's lunch (not bread but good)</li></ol>
          <h2>PHOTOS</h2><p class="ok-ph"><span>[x]</span><span>[x]</span><span>[x]</span> (pictures coming soon!!!)</p>
          <p><button class="c98-btn ok-midi">Play my MIDI!</button> <a href="/~okuyasu/guestbook">Sign my GUESTBOOK!!!</a></p>
          <p>You are visitor number ${counter(17 + Object.keys(st.visited).length)}</p><p class="ok-small">Best viewed in Capsule Navigator. This page is (C) Okuyasu. Don't steal my bread list.</p></div></div>`;
        let iv = 0;
        page.querySelector('.ok-midi').addEventListener('click', (e) => {
          if (iv) { clearInterval(iv); iv = 0; e.target.textContent = 'Play my MIDI!'; return; }
          os.sound('osMidi'); iv = setInterval(() => { if (os.seated) os.sound('osMidi'); }, 1920); e.target.textContent = 'Stop the MIDI';
        });
        return () => clearInterval(iv);
      }
      page.innerHTML = `<div class="st-gh">${bar}<h1>GeoHouses Neighborhoods</h1><ul><li><b>Lane Street</b>: <a href="/~okuyasu/">~okuyasu</a> (bread), ~rohan (<i>This homepage is private.</i>)</li><li><b>Capsule Row</b>: <a href="http://www.kappa-dance.ne.jp/">the dancing kappa</a></li><li><b>Silicon Alley</b>: no homepages yet. Be the first!</li></ul><p>Want your own homepage? It's FREE! (sign-ups are closed this week)</p></div>`;
    },
  });
  function guestbook(page, bar, ctx) {
    const gb = st.guestbook ||= [['Josuke', 'nice page. the bread list is too long'], ['Rohan', 'The use of colour is an assault on the eyes. I took notes.'], ['Mom', 'Okuyasu dinner is ready']];
    page.innerHTML = `<div class="st-oku">${bar}<div class="ok-in"><h1>GUESTBOOK</h1>${gb.slice().reverse().map(([n, m]) => `<div class="ok-gb"><b>${esc(n)}</b> wrote:<br>${esc(m)}</div>`).join('')}
      <form><p>Name: <input class="c98-field" name="n" maxlength="20" value="Gacha Garage"></p><p>Message: <input class="c98-field ok-msg" name="m" maxlength="80"></p><p><button class="c98-btn" type="submit">Sign!</button> <a href="/~okuyasu/">Back</a></p></form></div></div>`;
    page.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      const n = page.querySelector('[name="n"]').value.trim(), m = page.querySelector('[name="m"]').value.trim();
      if (!n || !m) { os.alert('Please fill in your name and a message!', 'Guestbook', 'warn'); return; }
      gb.push([n.slice(0, 20), m.slice(0, 80)]);
      if (gb.length > 30) gb.splice(3, 1);
      ctx.nav('/~okuyasu/guestbook');
    });
  }

  reg({
    domain: 'kappa-dance.ne.jp', title: 'DANCE KAPPA DANCE', keywords: 'kappa dance fun funny animation yokai', blurb: 'The dancing kappa. Everybody is talking about it.',
    render(page) {
      page.innerHTML = `<div class="st-kappa"><h1>DANCE, KAPPA, DANCE!</h1><div class="kp-row">${'<i class="kp"></i>'.repeat(4)}</div><p>Don't forget to refill the water on your head!</p>${counter(88888 + Math.floor((game.state.playTime || 0) / 3))}<p><a href="http://www.geohouses.ne.jp/~okuyasu/">&lt;&lt; Prev</a> | Lane Webring | <a href="http://www.geohouses.ne.jp/">Next &gt;&gt;</a></p></div>`;
      if (!kappaURL) kappaURL = kappaSheet();
      for (const k of page.querySelectorAll('.kp')) k.style.backgroundImage = `url(${kappaURL})`;
      os.sound('osMidi');
      const iv = setInterval(() => { if (os.seated) os.sound('osMidi'); }, 1920);
      return () => clearInterval(iv);
    },
  });

  // ================================================================== pop-up ads (for the spammy sites)
  const POPS = {
    singles: { title: 'Hot Singles!', html: '<div class="pop pop-a"><b>HOT SINGLES</b><p>in MORIO-CHO want to meet YOU!!</p><p>(they are all Okuyasu)</p></div>' },
    virus: { title: 'WARNING!!!', html: '<div class="pop pop-b"><b>YOUR COMPUTER HAS 386 VIRUSES</b><p>Download CapsuleCleaner 2000 NOW to remove them!!!</p><p class="pop-fake"><span class="c98-btn">OK</span> <span class="c98-btn">Cancel</span></p></div>' },
    rich: { title: 'Earn ¥¥¥ at home', html: '<div class="pop pop-c"><b>EARN ¥500,000 A WEEK</b><p>from home stuffing capsules!! Ask me how!!!</p></div>' },
  };
  os.registerApp({
    id: 'popup', name: 'Advertisement', icon: 'os_spam', desktop: false, hidden: true, multi: true, resizable: false, w: 300, h: 190, cls: 'c98-pop',
    open(win, args) {
      const p = POPS[args.kind] || POPS.rich;
      win.setTitle(p.title);
      win.body.innerHTML = p.html;
      os.sound('osPop');
      win.x = Math.round(30 + Math.random() * (os.W - 360)); win.y = Math.round(20 + Math.random() * (os.deskH - 240)); win.place();
      let spawned = false;
      win.onClose(() => { if (!spawned && args.kind === 'virus' && Math.random() < 0.6) { spawned = true; setTimeout(() => os.open('popup', { kind: 'rich' }), 300); } });
    },
  });
}

// ------------------------------------------------------------------ the dancing kappa: a 4-frame pixel sprite sheet
let kappaURL = null;
function kappaSheet() {
  const c = document.createElement('canvas');
  c.width = 32 * 4; c.height = 32;
  const g = c.getContext('2d');
  const G = '#58c06c', D = '#2f8a48', Y = '#ffd23f', K = '#1a1416', W = '#e8f4ff', S = '#c8a070';
  const px = (x, y, w, hh, col) => { g.fillStyle = col; g.fillRect(x, y, w, hh); };
  for (let f = 0; f < 4; f++) {
    const o = f * 32, bob = f % 2 ? 1 : 0, arm = [0, 3, 0, -3][f], leg = [0, 2, 0, -2][f];
    px(o + 10, 4 + bob, 12, 10, G); px(o + 11, 3 + bob, 10, 2, W); px(o + 12, 2 + bob, 8, 1, '#a8e2ff'); // head + plate
    px(o + 12, 7 + bob, 2, 2, K); px(o + 18, 7 + bob, 2, 2, K); px(o + 14, 10 + bob, 4, 2, Y); // eyes, beak
    px(o + 10, 14 + bob, 12, 9, G); px(o + 12, 15 + bob, 8, 7, S); px(o + 10, 14 + bob, 12, 1, D); // shell belly
    px(o + 5, 13 + bob + arm, 5, 3, G); px(o + 22, 13 + bob - arm, 5, 3, G); // arms
    px(o + 11 - leg, 23 + bob, 4, 6, D); px(o + 17 + leg, 23 + bob, 4, 6, D); // legs
    px(o + 10 - leg, 28, 6, 2, G); px(o + 16 + leg, 28, 6, 2, G);
  }
  return c.toDataURL();
}

// ------------------------------------------------------------------ the town paper
export function headlines(game) {
  const t = now(game), s = game.state;
  const out = [];
  const spec = game.calendar?.headline?.(t.day) || [];
  if (spec.length) out.push({ id: 'today', title: `Today in Morio-cho: ${spec[0].name}`, body: `${spec[0].name} is here! ${spec[0].note || 'Shops on the lane expect a busy day.'}\n\nThe Morio Shimbun wishes all our readers a pleasant ${spec[0].name}.` });
  const pulls = s.pulls || 0;
  out.push({ id: 'garage', title: pulls > 0 ? `Gacha garage on the back lane: ${pulls.toLocaleString('en-US')} capsules and counting` : 'Old gacha garage on the back lane reopens', by: 'Lane Desk',
    body: pulls > 0 ? `The little capsule toy shop in the old garage has now served ${pulls.toLocaleString('en-US')} capsules, and the regulars say it's the best fun on the lane since the vending machines started selling corn soup.\n\n"I came for one capsule and stayed for twelve," said a local schoolboy, who asked not to be named because his mother reads this paper.\n\nThe shop's owner, the grandchild of the much-loved previous owner, could not be reached for comment. They were busy refilling a machine.`
      : `After years behind a rusty shutter, Grandpa's capsule toy garage on the back lane is showing signs of life.\n\nNeighbours report lights on late at night and the sound of someone sweeping. "About time," said Mrs. Mikawa of the corner shop. "The cat missed the place."` });
  out.push(
    { id: 'cat', title: 'Calico cat "Mikan" elected unofficial mayor of the lane', body: 'In a vote nobody organised, residents of the back lane have agreed that the calico cat known as Mikan is in charge.\n\nMikan could not be reached for comment. She was asleep on a warm machine.' },
    { id: 'artist', title: 'Local manga artist denies spying on neighbours "for reference"', by: 'Culture Desk', body: 'A well-known manga artist living near the lane has denied reports that he follows residents around with a sketchbook.\n\n"I observe," he told this reporter, staring at the reporter\'s left ear for an uncomfortably long time. "Reality is the best reference. Your ear, for example. Hold still."' },
    { id: 'arrow', title: 'Antique arrowhead missing from shop display; police "baffled"', by: 'Police Beat', body: 'An unusual antique arrowhead has vanished from a display case in town. The owner describes it as "old, pointy, and probably best left alone".\n\nPolice ask anyone who has seen it, or who has recently developed strange abilities, to call 110.' },
    { id: 'tunnel', title: 'Underpass lights to be fixed "next year", says ward office (again)', body: 'The lights in the railway underpass near the lane will be repaired next year, the ward office confirmed for the fourth year in a row.\n\nResidents are advised to walk quickly and never look back.' },
    { id: 'corn', title: 'Vending machine by the lane now sells hot corn soup all summer', body: 'The vending machine opposite the garage has been restocked with hot corn soup in the middle of summer. "Somebody keeps buying it," the operator said. "We don\'t ask questions."' },
    { id: 'pose', title: 'Strange-pose craze sweeps Morio Middle School', body: 'Teachers report pupils striking dramatic poses in the corridors, often with one hand on the forehead. "It started with two boys by the vending machines," said one teacher. "Now even the principal does it."' },
  );
  return out;
}
