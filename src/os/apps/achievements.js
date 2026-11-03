// Achievements: a trophy cabinet like a game launcher's (pixel icons, locked / unlocked, progress), with a slide-up
// toast when one unlocks (or a HUD toast if you're away from the computer).
//   game.os.achievements.define({ id, name, desc, icon, reward?: { yen } | number, hidden? })
//   game.os.achievements.unlock(id) -> true the first time;  .has(id), .list(), .progress() -> { got, total }
// Unlocks of ids not defined yet are remembered and shown once they're defined.
import { h, esc, ic } from './ui.js';
import { yen } from '../OS.js';
import { now, stampText } from '../time.js';

export function installAchievements(game, os) {
  const st = os.st.ach ||= { got: {} };
  const defs = new Map();
  const views = new Set();
  const api = os.achievements = {
    define(a) { if (!a?.id) return; defs.set(a.id, { icon: 'os_trophy', ...defs.get(a.id), ...a }); for (const v of views) v(); },
    has: (id) => !!st.got[id],
    list: () => [...defs.values()].map((a) => ({ ...a, got: st.got[a.id] ?? null })),
    progress: () => ({ got: [...defs.keys()].filter((id) => st.got[id] != null).length, total: defs.size }),
    unlock(id) {
      if (st.got[id] != null || game.visiting) return false;
      st.got[id] = now(game).stamp;
      const a = defs.get(id) || { id, name: id, desc: '', icon: 'os_trophy' };
      const r = typeof a.reward === 'number' ? a.reward : a.reward?.yen;
      if (r > 0) game.addMoney(r, true, `Achievement: ${a.name}`);
      const html = `<span class="ach-ic">${ic(a.icon || 'os_trophy', 2)}</span><div><small>Achievement unlocked</small><b>${esc(a.name)}</b>${r > 0 ? `<small>+${yen(r)}</small>` : ''}</div>`;
      if (!os.toast(html, 4600, 'osCoin')) game.news?.('Achievement unlocked!', `${a.name}${r > 0 ? ` (+${yen(r)})` : ''}`, 5000);
      for (const v of views) v();
      game.events.emit('achievement', { id, name: a.name });
      return true;
    },
  };
  // the computer's own achievements
  [
    { id: 'os_boot', name: 'Hello, World', desc: 'Switch on Grandpa\'s computer', icon: 'os_logo' },
    { id: 'os_netizen', name: 'Netizen', desc: 'Visit 5 different websites', icon: 'os_globe' },
    { id: 'os_spam_spotter', name: 'Spam Spotter', desc: 'Block a spammer or mark a spam mail', icon: 'os_spam' },
    { id: 'os_sucker', name: 'Learned the Hard Way', desc: 'Pay a "processing fee" for a prize', icon: 'os_warn', hidden: true },
    { id: 'os_deal', name: 'Wholesale', desc: 'Strike a bulk deal with a supplier', icon: 'box' },
    { id: 'os_haggler', name: 'Hard Bargain', desc: 'Talk a supplier down to 30% off', icon: 'coin', reward: 500 },
    { id: 'os_promoter', name: 'Word of Mouth', desc: 'Run an ad for your shop', icon: 'megaphone' },
    { id: 'os_prank', name: 'Prank Caller', desc: 'Call the police on your friend', icon: 'os_phone', hidden: true },
    { id: 'os_caller', name: 'Hello?', desc: 'Make your first phone call', icon: 'os_phone' },
    { id: 'os_mail_all', name: 'Inbox Zero', desc: 'Read every mail in your Inbox', icon: 'os_mail' },
    { id: 'os_guestbook', name: 'I Was Here', desc: 'Sign a guestbook', icon: 'os_note' },
  ].forEach(api.define);
  const domains = new Set(Object.keys(os.st.web?.visited || {}).map((u) => u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]));
  game.events.on('os:web', ({ domain, href }) => { domains.add(domain); if (domains.size >= 5) api.unlock('os_netizen'); if (/guestbook/.test(href) && (os.st.web.guestbook?.length || 0) > 3) api.unlock('os_guestbook'); });
  game.events.on('phone', ({ type }) => { if (type === 'call') api.unlock('os_caller'); });
  os.on('power', (p) => { if (p === 'on') api.unlock('os_boot'); });

  os.registerApp({
    id: 'achievements', name: 'Achievements', label: 'Trophies', icon: 'os_trophy', group: 'Shop', w: 560, h: 470, minW: 420, minH: 320,
    about: 'Trophy Cabinet 1.0',
    open(win) {
      win.body.classList.add('ac');
      const head = h('div', { class: 'ac-head' });
      const list = h('div', { class: 'ac-list c98-list' });
      win.body.append(head, list);
      const draw = () => {
        const all = api.list();
        const p = api.progress();
        head.innerHTML = `${ic('os_trophy', 2)}<div><b>Gacha Garage</b><small>${p.got} of ${p.total} achievements unlocked (${p.total ? Math.round((p.got / p.total) * 100) : 0}%)</small><div class="c98-prog"><i style="width:${p.total ? Math.round((p.got / p.total) * 20) * 5 : 0}%"></i></div></div>`;
        list.textContent = '';
        const tn = now(game);
        for (const a of all.sort((x, y) => (y.got != null) - (x.got != null) || (x.got ?? 0) - (y.got ?? 0))) {
          const got = a.got != null, secret = a.hidden && !got;
          const r = typeof a.reward === 'number' ? a.reward : a.reward?.yen;
          list.append(h('div', { class: `ac-a${got ? ' got' : ''}` }, h('span', { class: 'ach-ic', html: ic(secret ? 'lock' : a.icon || 'os_trophy', 2) }),
            h('div', { html: `<b>${esc(secret ? 'Hidden achievement' : a.name)}</b><small>${esc(secret ? 'Keep playing to find out.' : a.desc || '')}</small>` }),
            h('span', { class: 'ac-d', html: got ? `Unlocked<br>${esc(stampText(game, a.got, tn))}` : r > 0 ? `Reward<br>${yen(r)}` : 'Locked' })));
        }
        win.status(`${p.got} / ${p.total}`);
      };
      views.add(draw);
      win.onClose(() => views.delete(draw));
      draw();
    },
  });
}
