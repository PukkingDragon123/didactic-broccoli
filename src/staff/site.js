// Inspired (インスパイアード), the job site on the 1999 web (http://www.inspired.ne.jp/), and its desktop shortcut.
// Employer accounts open at shop level 10 (staff:1). Post an ad (the job, the hours, the wage, a line about the shop),
// then read the CVs as applicants trickle in: a portrait rendered from their actual 3D look, age, where they're from,
// what they've done, star ratings for every job, their quirks and Inspired's own "notes" (the red flags). Invite them
// to an interview at a time that suits, message them on Pichat, hire after the interview, or say no.
import { h, esc, ic } from '../os/apps/ui.js';
import { defineIcon } from '../gfx/icons.js';
import { formatYen } from '../core/util.js';
import { ROLES, HOURS, QUIRKS, WAGE_MIN, WAGE_MAX, WAGE_STD, AD_FEE, WEEKDAY, shiftText } from './data.js';
import { starsFor, quirkText } from './applicants.js';
import { portraitLater, portraitCached } from './looks.js';
import { INSPIRED } from './Staff.js';
import './site.css';

const yen = formatYen;
const URL0 = INSPIRED;

defineIcon('os_inspired', { rows: [
  '.....KKKKK......',
  '....KZZZZYK.....',
  '...KZWZZZYYK....',
  '..KZWZZZZYYyK...',
  '..KZZZZZZYYyK...',
  '..KZZZZZYYYyK...',
  '..KYZZZYYYyyK...',
  '...KYYYYYyyK....',
  '....KYyYyyK.....',
  '....KKyyyKK.....',
  '.....KlllK......',
  '.....KgggK......',
  '.....KlllK......',
  '.....KGGGK......',
  '......KKK.......',
  '................',
] });
defineIcon('os_rota', { rows: [
  '.....KKKKK......',
  '..KKKgLLLgKKK...',
  '..KTKKKKKKKTK...',
  '..KTwwwwwwwTK...',
  '..KTwRRwkkwTK...',
  '..KTwwwwwwwTK...',
  '..KTwEEwkkwTK...',
  '..KTwwwwwwwTK...',
  '..KTwBBwkkwTK...',
  '..KTwwwwwwwTK...',
  '..KTwYYwkkwTK...',
  '..KTwwwwwwwTK...',
  '..KTTTTTTTTTK...',
  '..KKKKKKKKKKK...',
  '................',
  '................',
] });

const PITCHES = ['Friendly little capsule toy shop. Cat on site.', 'Retro gacha shop seeks a hard worker. Free capsule every Friday!', 'Small shop, big dreams. Must like cats and capsules.', 'Help keep Grandpa\'s old gacha garage alive!', 'No experience needed. Just enthusiasm (and shoes).'];
const OTHER_JOBS = [
  ['Mikawa-ya General Store', 'Shelf stacker (mornings)', '¥700'], ['Ramen Taisho', 'Dishwasher (evenings, free ramen)', '¥760'], ['Morio Station', 'Platform pusher (rush hour)', '¥900'],
  ['Kame Sushi', 'Delivery on a scooter', '¥820'], ['Sakura Heights', 'Building caretaker', '¥680'], ['Karaoke Big Echo', 'Front desk (nights)', '¥850'],
  ['Hirano Kagu', 'Furniture mover', '¥950'], ['Morio Public Bath', 'Towel folder', '¥650'],
];
const STATUS = { new: ['NEW', 'n'], invited: ['INTERVIEW', 'i'], interviewed: ['INTERVIEWED', 'd'], hired: ['HIRED', 'h'], rejected: ['DECLINED', 'x'], stoodup: ['WAITED, LEFT', 'x'], withdrawn: ['WITHDREW', 'x'], former: ['FORMER STAFF', 'x'] };

function bar(n, max = 5) { return `<span class="isp-bar">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`; }
function stars(x) { const full = Math.floor(x), half = x - full >= 0.5; return `<span class="isp-stars">${'<b>*</b>'.repeat(full)}${half ? '<b class="h">*</b>' : ''}<i>${'*'.repeat(5 - full - (half ? 1 : 0))}</i></span>`; }
const pimg = (p, cls = '') => `<span class="isp-ph ${cls}" style="background:${esc(p.color || '#e8dcc0')}"><img data-ap="${p.id}" alt=""></span>`;
const ageText = (p) => (p.age > 120 ? `${p.age} (looks 12)` : String(p.age));

export function installInspired(game, staff) {
  const os = game.os, B = os?.browser;
  if (!B?.registerSite) return;

  // desktop shortcut (once the account is open) and the bookmark
  os.registerApp({ id: 'inspired', name: 'Inspired Jobs', label: 'Inspired', icon: 'os_inspired', group: 'Internet', unlocked: () => staff.unlocked(), lockedText: `Inspired employer accounts open at shop level ${game.progress?.levelFor('staff:1') ?? 10}.`, about: `Shortcut to ${URL0} - find your next part-timer.`, open: () => {} });
  const open0 = os.open.bind(os);
  os.open = (id, args = {}) => (id === 'inspired' ? open0('browser', { url: URL0 }) : open0(id, args));

  /** Fill every <img data-ap> on the page with its portrait (rendered a few at a time). */
  const portraits = (page, size = 48) => {
    for (const im of page.querySelectorAll('img[data-ap]')) {
      const p = staff.applicant(im.dataset.ap) || staff.rec(im.dataset.ap);
      if (!p) continue;
      const hit = portraitCached(p.look, { size });
      if (hit) { im.src = hit; continue; }
      portraitLater(game, p.look, (u) => { if (im.isConnected) im.src = u; }, { size });
    }
  };

  B.registerSite({
    domain: 'inspired.ne.jp', title: 'Inspired - find your next part-timer', keywords: 'job jobs work part-time baito arubaito hire staff employee employees recruit inspired cv resume interview',
    blurb: 'Part-time jobs and part-timers in Morio-cho. Post an ad, read CVs, hire.',
    render(page, path, nav, ctx) {
      const parts = path.split('/').filter(Boolean);
      const S = staff.s;
      const waiting = S.applicants.filter((p) => ['new', 'invited', 'interviewed'].includes(p.status)).length;
      const head = `<div class="isp-head"><a class="isp-logo" href="/">${ic('os_inspired', 2)}<b>Insp<i>i</i>red</b><span>インスパイアード</span></a>
        <div class="isp-tag">The job site that inspires. <small>(Mostly.)</small></div></div>
        <div class="isp-nav"><a href="/">Home</a><a href="/post">Post a job</a><a href="/applicants">Applicants${waiting ? ` <em>${waiting}</em>` : ''}</a><a href="/team">My team</a><a href="/help">Help</a></div>`;
      const foot = `<p class="isp-foot">Inspired K.K. &middot; 2-8-1 Ekimae, Morio-cho &middot; Tel 0120-23-1999 &middot; "Every job is a capsule: you never know what's inside."</p>`;
      let body = '';
      ctx.title?.('Inspired - find your next part-timer');
      if (!staff.unlocked() && parts[0] !== 'help') {
        const lv = game.progress?.level ?? 1, need = game.progress?.levelFor('staff:1') ?? 10;
        body = `<div class="isp-lock">${ic('os_warn', 2)}<div><h2>Employer accounts are for established shops</h2><p>Your shop is level <b>${lv}</b>. Come back at shop level <b>${need}</b> to post job ads and hire staff.</p><p>Until then, have a look at what the rest of Morio-cho is hiring for:</p></div></div>${otherJobs()}`;
        page.innerHTML = `<div class="isp">${head}${body}${foot}</div>`;
        return;
      }
      if (!parts.length) body = home();
      else if (parts[0] === 'post') body = postPage();
      else if (parts[0] === 'applicants') body = listPage(ctx.url?.query?.get?.('all') === '1');
      else if (parts[0] === 'cv' && parts[1]) body = cvPage(parts[1]);
      else if (parts[0] === 'team') body = teamPage();
      else if (parts[0] === 'help') body = helpPage();
      else { ctx.notFound?.(); return; }
      page.innerHTML = `<div class="isp">${head}${body}${foot}</div>`;
      portraits(page, 48);
      wire(page, nav, ctx);
    },
  });

  // ---------------------------------------------------------------- pages
  function home() {
    const S = staff.s, ads = S.ads.filter((a) => a.open);
    const fresh = S.applicants.filter((p) => p.status === 'new').slice(0, 4);
    const team = staff.list();
    return `<div class="isp-cols"><div class="isp-main">
      <div class="isp-box isp-hello"><h2>Welcome back, Gacha Garage!</h2><p>Room for <b>${staff.slots()}</b> staff at your shop level &middot; <b>${team.length}</b> on the team &middot; <b>${ads.length}</b> ad${ads.length === 1 ? '' : 's'} running.</p>
        <p><a class="isp-cta" href="/post">${ic('os_inspired', 1)} Post a job ad</a>${S.applicants.length ? ' <a class="isp-cta alt" href="/applicants">Read the CVs</a>' : ''}</p></div>
      <h3>Your ads</h3>${ads.length ? `<table class="isp-t"><tr><th>Job</th><th>Hours</th><th>Wage</th><th>Applicants</th><th>Ends</th><th></th></tr>${ads.map((a) => `<tr><td><b>${esc(ROLES[a.role]?.name)}</b></td><td>${esc(HOURS[a.hours]?.name)} ${shiftText(a.hours)}</td><td>${yen(a.wage)}/h</td><td>${a.n}</td><td>${endsIn(a.until)}</td><td><a href="#" data-close="${a.id}">Take down</a></td></tr>`).join('')}</table>` : '<p class="isp-dim">No ads running. Post one and the CVs start coming in within hours.</p>'}
      <h3>New applicants</h3>${fresh.length ? `<div class="isp-grid">${fresh.map(card).join('')}</div>` : '<p class="isp-dim">Nobody new yet.</p>'}
    </div><div class="isp-side">
      <div class="isp-box"><h4>Local wages</h4><p>Morio-cho average: <b>${yen(WAGE_STD)}/h</b>. Pay more, get more (and better) applicants.</p></div>
      <div class="isp-box"><h4>Elsewhere in Morio-cho</h4>${otherJobs(4)}</div>
      <div class="isp-box isp-ad"><b>Inspired TIP</b><p>Interview everyone. Some applicants are not what their photo suggests. Some are not human.</p></div>
    </div></div>`;
  }

  function otherJobs(n = 8) {
    const day = game.clock?.day ?? 1;
    const list = OTHER_JOBS.map((j, i) => [j, (i * 7 + day * 3) % OTHER_JOBS.length]).sort((a, b) => a[1] - b[1]).slice(0, n).map((x) => x[0]);
    return `<ul class="isp-other">${list.map(([who, what, pay]) => `<li><b>${esc(what)}</b><br><small>${esc(who)} &middot; ${pay}/h</small></li>`).join('')}</ul>`;
  }

  function postPage() {
    const roleOpts = Object.values(ROLES).map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join('');
    const hourOpts = Object.values(HOURS).map((x) => `<option value="${x.id}"${x.id === 'day' ? ' selected' : ''}>${esc(x.name)} (${shiftText(x.id)})</option>`).join('');
    const wageOpts = [];
    for (let w = WAGE_MIN; w <= WAGE_MAX; w += 50) wageOpts.push(`<option value="${w}"${w === WAGE_STD ? ' selected' : ''}>${yen(w)} / hour${w === WAGE_STD ? ' (local average)' : w < 650 ? ' (stingy)' : w >= 1100 ? ' (generous!)' : ''}</option>`);
    return `<div class="isp-box isp-form"><h2>Post a job ad</h2><p class="isp-dim">Your ad runs for 5 days. Listing fee ${yen(AD_FEE)}, paid from your bank account.</p>
      <table class="isp-ft">
        <tr><th>Job</th><td><select class="c98-field" name="role">${roleOpts}</select><div class="isp-desc" data-desc>${esc(ROLES.restock.desc)}</div></td></tr>
        <tr><th>Hours</th><td><select class="c98-field" name="hours">${hourOpts}</select></td></tr>
        <tr><th>Wage</th><td><select class="c98-field" name="wage">${wageOpts.join('')}</select></td></tr>
        <tr><th>About your shop</th><td><select class="c98-field" name="pitch">${PITCHES.map((p, i) => `<option value="${i}">${esc(p)}</option>`).join('')}</select></td></tr>
      </table>
      <p><button class="c98-btn isp-go" data-post>Post ad (${yen(AD_FEE)})</button></p></div>`;
  }

  function card(p) {
    const st = STATUS[p.status] || ['', ''];
    return `<a class="isp-card" href="/cv/${p.id}">${pimg(p)}<span class="isp-cb"><b>${esc(p.name)}</b><small>${ageText(p)} &middot; ${esc(ROLES[p.role]?.name || '')}</small>${stars(starsFor(p, p.role))}<i class="isp-st ${st[1]}">${st[0]}</i></span></a>`;
  }

  function listPage(all) {
    const S = staff.s;
    const list = S.applicants.filter((p) => all || !['rejected', 'stoodup', 'withdrawn', 'former'].includes(p.status));
    const rows = list.map((p) => {
      const st = STATUS[p.status] || ['', ''];
      return `<tr data-href="/cv/${p.id}"><td>${pimg(p, 'sm')}</td><td><a href="/cv/${p.id}"><b>${esc(p.name)}</b></a><br><small>${ageText(p)}, ${esc(p.from)}</small></td><td>${esc(ROLES[p.role]?.name)}<br>${stars(starsFor(p, p.role))}</td>
        <td class="isp-mini">Spd ${bar(p.stats.speed)} Hon ${bar(p.stats.honesty)}<br>Chm ${bar(p.stats.charm)} Rel ${bar(p.stats.reliability)}</td>
        <td><small>${esc(quirkText(p))}</small></td><td>${yen(p.want)}/h</td><td><i class="isp-st ${st[1]}">${st[0]}</i>${p.status === 'invited' ? `<br><small>${esc(staff.when(p.at))}</small>` : ''}</td></tr>`;
    }).join('');
    return `<h2>Applicants</h2><p class="isp-dim">${list.length} CV${list.length === 1 ? '' : 's'}. Click one to read it. ${all ? '<a href="/applicants">Hide the old ones</a>' : '<a href="/applicants?all=1">Show declined and old ones too</a>'}</p>
      ${list.length ? `<table class="isp-t isp-apps"><tr><th></th><th>Name</th><th>Applying for</th><th>Stats</th><th>Quirks</th><th>Wants</th><th>Status</th></tr>${rows}</table>` : '<div class="isp-box"><p>No applicants yet. <a href="/post">Post a job ad</a>: people usually reply within a few hours.</p></div>'}`;
  }

  function cvPage(id) {
    const p = staff.applicant(id) || staff.rec(id);
    if (!p) return '<div class="isp-box"><p>This CV has been removed.</p><p><a href="/applicants">Back to the applicants</a></p></div>';
    const st = STATUS[p.status] || ['', ''];
    if (p.status === 'new') p.seen = true;
    const roles = Object.values(ROLES).map((r) => `<tr><td>${esc(r.name)}</td><td>${stars(starsFor(p, r.id))}</td></tr>`).join('');
    const times = staff.inviteTimes(p);
    const can = staff.canHire();
    const act = [];
    if (['new', 'interviewed', 'invited'].includes(p.status)) act.push(`<span class="isp-act"><b>Invite to an interview:</b> ${times.map((t, i) => `<button class="c98-btn" data-invite="${i}">${esc(t.label)}</button>`).join(' ')}</span>`);
    if (p.status === 'interviewed') act.push(can ? `<button class="c98-btn isp-go" data-hire>Hire ${esc(p.given)} (${yen(p.wageOffered || staff.adFor(p)?.wage || p.want)}/h)</button>` : `<span class="isp-dim">No room on the team (shop level ${game.progress?.levelFor(`staff:${staff.list().length + 1}`) ?? '?'})</span>`);
    if (['new', 'interviewed', 'invited'].includes(p.status)) act.push('<button class="c98-btn" data-reject>Not interested</button>');
    if (p.status !== 'hired') act.push('<button class="c98-btn" data-chat>Message on Pichat</button>');
    const notes = (p.flags || []).map((f) => `<li>${ic('os_warn', 1)} ${esc(f)}</li>`).join('');
    return `<p><a href="/applicants">&lt;&lt; All applicants</a></p>
      <div class="isp-cv"><div class="isp-cvl">${pimg(p, 'big')}<i class="isp-st ${st[1]}">${st[0]}</i>${p.status === 'invited' ? `<p class="isp-dim">Interview ${esc(staff.when(p.at))}</p>` : ''}</div>
      <div class="isp-cvr"><h1>${esc(p.name)}</h1><p class="isp-blurb">"${esc(p.blurb)}"</p>
        <table class="isp-ft"><tr><th>Age</th><td>${ageText(p)}</td></tr><tr><th>From</th><td>${esc(p.from)}</td></tr><tr><th>Phone</th><td><a href="#" data-call>${esc(p.phone)}</a></td></tr>
        <tr><th>Applying for</th><td>${esc(ROLES[p.role]?.name)} &middot; ${esc(HOURS[p.hours]?.name || '')} ${p.hours ? shiftText(p.hours) : ''}</td></tr><tr><th>Wants</th><td>${yen(p.want)} / hour</td></tr>
        <tr><th>Can work</th><td>${(p.hoursOK || []).map((x) => esc(HOURS[x]?.name)).join(', ')}${p.nightOnly ? ' <b>(nights only!)</b>' : ''}</td></tr><tr><th>Day off</th><td>${WEEKDAY[p.dayOff] || '-'}</td></tr></table></div></div>
      <div class="isp-cols"><div class="isp-main">
        <h3>Experience</h3><ul>${p.cv.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
        <h3>Hobbies</h3><p>${esc(p.hobby)}</p>
        <h3>Quirks</h3><p>${(p.quirks || []).map((q) => `<b>${esc(QUIRKS[q]?.name)}</b>: ${esc(QUIRKS[q]?.desc)}`).join('<br>') || 'None declared.'}</p>
        <h3>Inspired's notes</h3><ul class="isp-flags">${notes}</ul>
      </div><div class="isp-side"><div class="isp-box"><h4>Stats</h4><table class="isp-mini"><tr><td>Speed</td><td>${bar(p.stats.speed)}</td></tr><tr><td>Honesty</td><td>${bar(p.stats.honesty)}</td></tr><tr><td>Charm</td><td>${bar(p.stats.charm)}</td></tr><tr><td>Reliability</td><td>${bar(p.stats.reliability)}</td></tr></table></div>
        <div class="isp-box"><h4>Good at</h4><table class="isp-mini">${roles}</table></div></div></div>
      <div class="isp-box isp-actions">${act.join(' ') || '<span class="isp-dim">Nothing to do here.</span>'}</div>`;
  }

  function teamPage() {
    const team = staff.list(), S = staff.s, bill = staff.wageBill();
    const cards = team.map((r) => `<div class="isp-tm">${pimg(r)}<div><b>${esc(r.name)}</b>${r.title ? ` <i class="isp-st h">${esc(r.title)}</i>` : ''}<br>${esc(ROLES[r.role]?.name)} &middot; ${esc(HOURS[r.hours]?.name)} ${shiftText(r.hours)} &middot; ${yen(r.wage)}/h<br>Morale ${bar(Math.round((r.morale ?? 60) / 20))} &middot; off on ${WEEKDAY[r.dayOff]}s</div></div>`).join('');
    const former = S.former.slice(0, 8).map((f) => `<li>${esc(f.name)}: ${esc(ROLES[f.role]?.name || '')}, ${f.why === 'fired' ? 'let go' : 'quit'} on day ${f.left} (${f.days} day${f.days === 1 ? '' : 's'})</li>`).join('');
    return `<h2>My team</h2><p class="isp-dim">${team.length} of ${staff.slots()} &middot; wages this week so far ${yen(bill.total)} &middot; payday in ${bill.inDays} day${bill.inDays === 1 ? '' : 's'} (Fridays). Manage shifts and jobs in the <b>Staff Rota</b> on your desktop, or just talk to them at the shop.</p>
      ${cards || '<div class="isp-box"><p>Nobody yet. <a href="/applicants">Read the CVs</a>.</p></div>'}${former ? `<h3>Former staff</h3><ul>${former}</ul>` : ''}`;
  }

  function helpPage() {
    return `<div class="isp-box"><h2>How Inspired works</h2><ol>
      <li><b>Post an ad</b>: the job, the hours, the wage. A better wage brings more applicants, sooner.</li>
      <li><b>Read the CVs</b> as they come in. Stars show how good someone would be at each job.</li>
      <li><b>Invite</b> the ones you like. They come to your shop at the time you pick: talk to them there.</li>
      <li><b>Hire</b> (or don't). Either way, they remember.</li>
      <li>Your staff come in for their shifts and do the job you gave them. Talk to them to change their job, hours or pay. Wages are paid from your bank every <b>Friday</b>.</li></ol>
      <p class="isp-dim">Inspired is not responsible for yokai, spirits, shapeshifters or ninjas found among applicants. Please interview responsibly.</p></div>`;
  }

  const endsIn = (until) => { const m = until - (game.clock?.stamp ?? 0); return m <= 0 ? 'ended' : m < 1440 ? `${Math.ceil(m / 60)} h` : `${Math.ceil(m / 1440)} days`; };

  // ---------------------------------------------------------------- buttons
  function wire(page, nav, ctx) {
    const parts = (ctx.url?.path || '/').split('/').filter(Boolean);
    const role = page.querySelector('select[name=role]');
    role?.addEventListener('change', () => { const d = page.querySelector('[data-desc]'); if (d) d.textContent = ROLES[role.value]?.desc || ''; });
    page.querySelector('[data-post]')?.addEventListener('click', async () => {
      const q = (n) => page.querySelector(`select[name=${n}]`)?.value;
      const r = staff.postAd({ role: q('role'), hours: q('hours'), wage: +q('wage'), pitch: PITCHES[+q('pitch')] || '' });
      await os.alert(r.msg, 'Inspired', r.ok ? 'info' : 'error');
      if (r.ok) nav('/');
    });
    for (const a of page.querySelectorAll('[data-close]')) a.addEventListener('click', async (e) => { e.preventDefault(); if (await os.confirm('Take this ad down? No more applicants will come from it.', 'Inspired')) { staff.closeAd(a.dataset.close); nav('/'); } });
    if (parts[0] !== 'cv') return;
    const p = staff.applicant(parts[1]) || staff.rec(parts[1]);
    if (!p) return;
    for (const b of page.querySelectorAll('[data-invite]')) b.addEventListener('click', async () => {
      const t = staff.inviteTimes(p)[+b.dataset.invite];
      if (!t) return;
      const r = staff.invite(p.id, t.at);
      await os.alert(r.msg, 'Inspired', r.ok ? 'info' : 'error');
      nav(`/cv/${p.id}`);
    });
    page.querySelector('[data-hire]')?.addEventListener('click', async () => {
      if (!(await os.confirm(`Hire ${p.name} as your ${ROLES[p.role]?.name}?`, 'Inspired'))) return;
      const r = staff.hire(p.id, { wage: p.wageOffered || undefined });
      await os.alert(r.msg, 'Inspired', r.ok ? 'info' : 'error');
      nav('/team');
    });
    page.querySelector('[data-reject]')?.addEventListener('click', async () => {
      if (!(await os.confirm(`Turn ${p.given} down? They'll be told politely.`, 'Inspired'))) return;
      staff.reject(p.id);
      nav('/applicants');
    });
    page.querySelector('[data-chat]')?.addEventListener('click', () => { staff.thread(p); os.messenger?.open('staff:' + p.id); });
    page.querySelector('[data-call]')?.addEventListener('click', (e) => { e.preventDefault(); staff.registerPhone(p); os.phone?.call(p.phone); });
  }
}
