// Gacha Codex: the collection by series (owned figures as thumbnails, missing ones as silhouettes, counts and
// finishes), the people you've met, and a Yokai bestiary (rumours for now: sightings come in a later update).
//   game.os.codex.person({ id, name, role, look, desc, met() })   add someone to the People page
//   game.os.codex.yokai({ id, name, desc, rumor, look })            add a yokai;  game.os.codex.see(id) records a sighting
import { h, esc, ic } from './ui.js';
import { portraitURL } from '../art.js';
import { SERIES } from '../../data/series/index.js';
import { RARITIES } from '../../data/rarity.js';
import { FINISHES } from '../../data/finishes.js';
import { stampText } from '../time.js';

const thumbCache = new Map();

export function installCodex(game, os) {
  const st = os.st.codex ||= { seen: {} };
  const people = [];
  const yokai = [];
  const api = os.codex = {
    person(p) { const i = people.findIndex((x) => x.id === p.id); if (i >= 0) people[i] = { ...people[i], ...p }; else people.push(p); },
    yokai(y) { const i = yokai.findIndex((x) => x.id === y.id); if (i >= 0) yokai[i] = { ...yokai[i], ...y }; else yokai.push(y); },
    see(id) { if (!st.seen[id]) { st.seen[id] = game.clock?.stamp ?? 1; os.notify({ app: 'codex', title: 'New Codex entry', body: yokai.find((y) => y.id === id)?.name || id, icon: 'os_yokai' }); } },
  };
  const met = (id) => !!game.state.npcs?.met?.[id];
  const msgr = (id) => !!os.st.msgr?.threads?.[id];
  [
    { id: 'grandpa', name: 'Grandpa', role: 'The old shop owner', look: { bg: 0xd8c8a0, hair: 'bald', beard: 0xe8e4dc, glasses: 0x5a4a3a, shirt: 0x6a7a5a, closed: true }, desc: 'Ran the capsule toy garage for forty years. Left you the keys, the machines, and a lot of notes in odd places.', met: () => true },
    { id: 'mikan', name: 'Mikan', role: 'The calico cat', look: { cat: true, bg: 0xffd2a0 }, desc: 'Answers to "Mikan", or to the sound of a can opening. The real boss of the lane.', met: () => true },
    { id: 'keeper', name: 'Mrs. Mikawa', role: 'Mikawa-ya General Store', look: { bg: 0xf0c8a0, hair: 'perm', hairCol: 0x9a9098, hairHi: 0xc8c0c8, glasses: 0x8a3a3a, shirt: 0xc84a6a, mouth: 'grin' }, desc: 'Runs the corner shop across the lane. Has known you since you were this tall.', met: () => !!game.state.flags?.metKeeper },
    { id: 'josuke', name: 'Josuke', role: 'Regular, great hair', look: { bg: 0x8ab8e8, hair: 'pomp', hairCol: 0x2a2440, shirt: 0x1a2a6a, brows: true }, desc: 'Hangs out by the vending machines. Do NOT say anything about his hair.', met: () => met('josuke') },
    { id: 'okuyasu', name: 'Okuyasu', role: 'Regular, always hungry', look: { bg: 0xffc88a, hair: 'short', hairCol: 0x5a4a3a, shirt: 0x1a2a6a, mark: true, mouth: 'o' }, desc: 'Josuke\'s best friend. Thinks capsule toys might be a kind of bread.', met: () => met('okuyasu') || msgr('okuyasu') },
    { id: 'rohan', name: 'Rohan', role: 'Manga artist', look: { bg: 0x9ae0c8, hair: 'short', hairCol: 0x2a5a4a, band: 0x3aa088, shirt: 0x3a4a3a }, desc: 'Sketches everyone on the lane. Will stare at you. For reference, apparently.', met: () => met('rohan') },
    { id: 'tanaka', name: 'Mrs. Tanaka', role: 'Neighbour (Pichat)', look: { bg: 0xe8d0f0, hair: 'bun', hairCol: 0xb8b0b8, shirt: 0x8a6ab0, blush: true }, desc: 'Lives two doors down. Grandpa fixed her radio for free, every week, for twenty years.', met: () => msgr('tanaka') },
    { id: 'daikoku', name: 'Mr. Daikoku', role: 'Toy wholesaler', look: { bg: 0xffd23f, hair: 'bald', glasses: 0x2a2220, mouth: 'grin', shirt: 0x2a5aa8 }, desc: 'Sells capsules by the box. Loves a deal. Loves a deal he wins even more.', met: () => msgr('daikoku') },
  ].forEach(api.person);
  [
    ['kappa', 'Kappa', 'A river imp with a dish of water on its head. Loves cucumbers and sumo.', 'Kids say something green steals cucumbers from Mikawa-ya.'],
    ['tanuki', 'Tanuki', 'A shape-shifting raccoon dog, fond of sake and pranks.', 'A big-bellied statue by the shrine was in a different spot this morning.'],
    ['kitsune', 'Kitsune', 'A fox spirit. The more tails, the older and wiser.', 'Someone left fried tofu at the little shrine. It was gone in a minute.'],
    ['zashiki', 'Zashiki-warashi', 'A child spirit who brings luck to the house it lives in.', 'Small footprints in the dust of the garage, where nobody has walked.'],
    ['tsukumo', 'Tsukumogami', 'An old tool that came alive on its 100th birthday.', 'Grandpa\'s oldest machine was heard turning its own handle at night.'],
    ['karakasa', 'Kasa-obake', 'A one-eyed, one-legged paper umbrella that hops.', 'An umbrella hopped past the bus stop. It did not need a bus.'],
    ['nurikabe', 'Nurikabe', 'An invisible wall that blocks the road at night.', 'People walking home through the underpass bump into... nothing.'],
    ['rokurokubi', 'Rokurokubi', 'By day a normal person. By night, the neck stretches.', 'A neighbour swears she saw a head peek in through a second-floor window.'],
    ['bakeneko', 'Bakeneko', 'A cat that has lived long enough to become something more.', 'Mikan is very, very old, the old men say. Nobody knows how old.'],
    ['tengu', 'Tengu', 'A long-nosed mountain spirit with a feather fan.', 'Strong winds on a still day. A feather on the roof, bigger than a crow\'s.'],
    ['yuki', 'Yuki-onna', 'The snow woman of winter nights.', 'Only in winter. Ask again when it snows.'],
    ['umibozu', 'Umibozu', 'A giant dark head that rises from the sea.', 'Fishermen at the port won\'t say anything. They just change the subject.'],
  ].forEach(([id, name, desc, rumor]) => api.yokai({ id, name, desc, rumor }));

  os.registerApp({
    id: 'codex', name: 'Gacha Codex', label: 'Codex', icon: 'os_codex', group: 'Shop', w: 700, h: 500, minW: 560, minH: 380,
    about: 'Gacha Codex 1.0: every figure, everybody, and everything that goes bump on the lane.',
    open(win, args) {
      win.body.classList.add('cx');
      let tab = args.tab || 'coll', seriesId = SERIES.find((s) => !s.hidden)?.id;
      const tabsEl = h('div', { class: 'c98-tabs' });
      const panel = h('div', { class: 'c98-tabpanel cx-p' });
      win.body.append(tabsEl, panel);
      const drawTabs = () => {
        tabsEl.textContent = '';
        for (const [id, label] of [['coll', 'Collection'], ['people', 'People'], ['yokai', 'Yokai']]) {
          const b = h('button', { class: `c98-tab${tab === id ? ' on' : ''}`, text: label });
          b.addEventListener('click', () => { tab = id; draw(); });
          tabsEl.append(b);
        }
      };
      let queue = [], raf = 0;
      const pump = () => {
        raf = 0;
        if (!win.el.isConnected) return;
        const t0 = performance.now();
        while (queue.length && performance.now() - t0 < 6) {
          const [img, key, sil, finish] = queue.shift();
          const ck = `${key}|${sil}|${finish}`;
          if (!thumbCache.has(ck)) { try { thumbCache.set(ck, game.thumbs.item(key, { size: 48, silhouette: sil, finish }).toDataURL()); } catch { thumbCache.set(ck, ''); } }
          if (thumbCache.get(ck)) img.src = thumbCache.get(ck);
        }
        if (queue.length) raf = requestAnimationFrame(pump);
      };
      const thumb = (key, sil, finish = 'normal') => {
        const img = h('img', { class: 'cx-th', width: 48, height: 48, alt: '', draggable: 'false' });
        const ck = `${key}|${sil}|${finish}`;
        if (thumbCache.get(ck)) img.src = thumbCache.get(ck); else { queue.push([img, key, sil, finish]); if (!raf) raf = requestAnimationFrame(pump); }
        return img;
      };
      win.onClose(() => { cancelAnimationFrame(raf); queue = []; });
      const draw = () => {
        drawTabs();
        panel.textContent = '';
        queue = [];
        if (tab === 'coll') coll(); else if (tab === 'people') ppl(); else yk();
      };
      const coll = () => {
        const s = game.state, list = SERIES.filter((x) => !x.hidden);
        const all = list.reduce((a, x) => a + x.items.length, 0), got = list.reduce((a, x) => a + x.items.filter((it) => s.discovered[it.key]).length, 0);
        const left = h('div', { class: 'cx-series c98-list' });
        for (const se of list) {
          const n = se.items.filter((it) => s.discovered[it.key]).length;
          const row = h('div', { class: `cx-s${se.id === seriesId ? ' sel' : ''}`, html: `<span>${esc(se.name)}</span><b>${n}/${se.items.length}</b>${s.completed?.[se.id] ? ic('crown', 1) : ''}` });
          row.addEventListener('click', () => { seriesId = se.id; draw(); });
          left.append(row);
        }
        const se = list.find((x) => x.id === seriesId) || list[0];
        const right = h('div', { class: 'cx-right' });
        const info = h('div', { class: 'cx-info' });
        const n = se.items.filter((it) => s.discovered[it.key]).length;
        right.append(h('div', { class: 'cx-sh', html: `<b>${esc(se.name)}</b><span>${n} of ${se.items.length} found${s.completed?.[se.id] ? ' - complete!' : ''}</span>` }));
        const grid = h('div', { class: 'cx-grid' });
        for (const it of se.items) {
          const d = s.discovered[it.key], R = RARITIES[it.rarity] || RARITIES.common;
          const best = d ? Object.keys(d.f).filter((f) => FINISHES[f]).sort((a, b) => FINISHES[b].tier - FINISHES[a].tier)[0] : 'normal';
          const cell = h('div', { class: `cx-c${d ? '' : ' unk'}`, style: { '--rc': R.color } }, thumb(it.key, !d, d ? best : 'normal'), h('span', { text: d ? it.name : '???' }), d ? h('i', { text: `x${d.n}` }) : null);
          cell.addEventListener('click', () => {
            for (const c of grid.children) c.classList.remove('sel');
            cell.classList.add('sel');
            info.innerHTML = d
              ? `<b>${esc(it.name)}</b> <span class="cx-r" style="--rc:${R.color}">${esc(R.name)}</span><br>Pulled ${d.n} time${d.n > 1 ? 's' : ''}. Finishes: ${Object.keys(d.f).map((f) => `<span class="cx-f" style="--fc:${FINISHES[f]?.color || '#ccc'}">${esc(FINISHES[f]?.name || f)} x${d.f[f]}</span>`).join(' ')}`
              : `<b>???</b> <span class="cx-r" style="--rc:${R.color}">${esc(R.name)}</span><br>Not found yet. Keep turning those handles!`;
          });
          grid.append(cell);
        }
        info.innerHTML = '<span class="c98-dim">Click a figure for details.</span>';
        right.append(grid, info);
        panel.append(h('div', { class: 'c98-split' }, left, right));
        win.status(`${got} of ${all} figures discovered (${Math.round((got / all) * 100)}%)`, `${s.pulls || 0} capsules pulled`);
      };
      const ppl = () => {
        const grid = h('div', { class: 'cx-ppl' });
        let n = 0;
        for (const p of people) {
          const ok = !!p.met?.();
          if (ok) n++;
          grid.append(h('div', { class: `cx-pc${ok ? '' : ' unk'}` }, h('img', { class: 'c98-ava', src: portraitURL(ok ? p.look : p.look.cat ? { bg: 0xd8d0c0, robot: false, hair: 'bald', sil: true, shirt: 0x3a3236 } : { ...p.look, bg: 0xd8d0c0, sil: true, shirt: 0x3a3236, hairCol: 0x3a3236, band: null, cap: false, glasses: null, beard: null }), width: 72, height: 72 }),
            h('div', { html: ok ? `<b>${esc(p.name)}</b><small>${esc(p.role || '')}</small><p>${esc(p.desc || '')}</p>` : '<b>???</b><small>Not met yet</small><p>Someone on the lane you haven\'t met.</p>' })));
        }
        panel.append(grid);
        win.status(`${n} of ${people.length} people met`);
      };
      const yk = () => {
        panel.append(h('p', { class: 'cx-yh', html: `${ic('os_yokai', 1)} Grandpa's notes on the strange things of Morio-cho. Sightings: ${Object.keys(st.seen).length} / ${yokai.length}` }));
        const grid = h('div', { class: 'cx-ppl' });
        for (const y of yokai) {
          const seen = st.seen[y.id];
          grid.append(h('div', { class: `cx-pc${seen ? '' : ' unk'}` }, h('span', { class: 'cx-yi', html: ic('os_yokai', 3) }),
            h('div', { html: seen ? `<b>${esc(y.name)}</b><small>Seen ${esc(stampText(game, seen))}</small><p>${esc(y.desc)}</p>` : `<b>${esc(y.name)}</b><small>Not yet seen</small><p>Rumour: ${esc(y.rumor || '...')}</p>` })));
        }
        panel.append(grid);
        win.status(`${Object.keys(st.seen).length} yokai sighted`);
      };
      win.onArgs = (a) => { if (a?.tab) { tab = a.tab; draw(); } };
      draw();
    },
  });
}
