// Rohan's signature gag: he opens you like a book. A pixel-paper spread over the screen lists your "profile" (pulled
// from the save), reveals an embarrassing secret, then he writes a new line in red ink.
//   const b = new ProfileBook(game);  yield b.open();  yield b.reveal();  yield b.write('...');  yield b.close();
// (every method returns a cutscene waiter; skipping finishes them at once)
import './book.css';
import { audio } from '../core/audio.js';
import { formatYen } from '../core/util.js';
import { SERIES_BY_ID, ITEMS } from '../data/series/index.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const sfx = (n, o = {}) => { try { audio.play(n, o); } catch { /* audio not ready */ } };

/** Facts about the player for the profile page. */
export function profileOf(game) {
  const s = game.state, d = s.discovered || {};
  const bySeries = {};
  for (const [k, v] of Object.entries(d)) { const sid = k.split('/')[0]; bySeries[sid] = (bySeries[sid] || 0) + (v?.n || 0); }
  const fav = Object.entries(bySeries).sort((a, b) => b[1] - a[1])[0];
  const found = Object.keys(d).filter((k) => !k.startsWith('mini/')).length;
  const total = ITEMS.filter((it) => !it.mini).length;
  const days = Math.max(1, s.npcs?.days || s.day || 1);
  const hours = (s.playTime || 0) / 3600;
  return {
    days, hours, money: s.money || 0, pulls: s.pulls || s.stats?.opened || 0,
    fav: fav ? SERIES_BY_ID[fav[0]]?.name || fav[0] : null, found, total,
    sold: s.stats?.sold || 0, customers: s.stats?.customers || 0,
  };
}

/** The most embarrassing true thing the save knows about you. */
export function secretOf(game) {
  const s = game.state, f = s.flags || {}, p = profileOf(game);
  const out = [];
  if (f.ghostFails > 1) out.push(`Looked back in the haunted alley ${f.ghostFails} times. Screamed at least once.`);
  else if (f.ghostFails === 1) out.push('Looked back in the haunted alley. Pretended it was on purpose.');
  if (p.sold > 8) out.push(`Has sold ${p.sold} figures. Apologised to ${Math.ceil(p.sold / 4)} of them first.`);
  if (p.pulls > 25) out.push(`Has pulled ${p.pulls} capsules and still says "just one more".`);
  if (p.money < 400) out.push(`Owns ${formatYen(p.money)} and a dream. Mostly the dream.`);
  if (s.story?.fed) out.push('Talks to the stray cat in a baby voice when nobody is around.');
  if (s.avatar?.outfit === 'dino' || s.avatar?.outfit === 'banana') out.push('Owns a full-body costume. Wore it to buy milk.');
  out.push('Practises dramatic poses in the reflection of the shutter.', 'Still sleeps with the light on. Blames the cat.');
  return out[Math.floor(Math.random() * Math.min(2, out.length))];
}

/** A quick pencil sketch of "you" for the corner of the page (60 x 74 px). */
function portrait() {
  const W = 60, H = 74, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.fillStyle = '#ece2c8'; g.fillRect(0, 0, W, H);
  const dot = (x, y, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), 1, 1); };
  // hatching background
  for (let y = 2; y < H; y += 3) for (let x = (y % 2) * 2; x < W; x += 5) if (Math.random() < 0.55) dot(x, y, '#cfc2a4');
  // head, ears, neck, shoulders
  for (let a = 0; a < Math.PI * 2; a += 0.03) dot(30 + Math.cos(a) * 13, 30 + Math.sin(a) * 16, '#3a3036');
  for (const sx of [-1, 1]) for (let a = 0; a < Math.PI * 2; a += 0.3) dot(30 + sx * 14 + Math.cos(a) * 2, 31 + Math.sin(a) * 3.5, '#4a4048');
  for (let y = 46; y < 54; y++) { dot(25, y, '#3a3036'); dot(35, y, '#3a3036'); }
  for (let x = 6; x < 54; x++) dot(x, 60 + Math.abs(x - 30) * -0.18 + 4, '#3a3036');
  // hair scribble
  for (let i = 0; i < 160; i++) { const a = Math.PI + Math.random() * Math.PI, r = 12 + Math.random() * 5; dot(30 + Math.cos(a) * r, 26 + Math.sin(a) * r * 1.05, '#2a2428'); }
  // eyes, brows, nose, a nervous little mouth
  for (const sx of [-1, 1]) { dot(30 + sx * 5, 30, '#1a1216'); dot(30 + sx * 5 + 1, 30, '#1a1216'); for (let i = -2; i <= 2; i++) dot(30 + sx * 5 + i, 26 - (i * sx > 0 ? 1 : 0), '#2a2428'); }
  dot(30, 34, '#5a4a50'); dot(31, 35, '#5a4a50');
  for (let x = 27; x <= 33; x++) dot(x, 40 + (x % 2), '#3a3036');
  // a sweat drop
  dot(44, 24, '#5a7ab0'); dot(44, 25, '#5a7ab0'); dot(43, 26, '#5a7ab0'); dot(45, 26, '#5a7ab0'); dot(44, 27, '#5a7ab0');
  return cv;
}

export class ProfileBook {
  constructor(game) {
    this.game = game;
    let el = document.getElementById('rb');
    if (!el) { el = document.createElement('div'); el.id = 'rb'; document.body.appendChild(el); }
    this.el = el;
  }

  build(writeTitle = '') {
    const g = this.game, p = profileOf(g), secret = secretOf(g);
    this.secret = secret;
    const rows = [
      ['Name', '<s>???</s> &nbsp;(not written anywhere?!)'],
      ['Occupation', "Runs Grandpa's gacha garage"],
      ['Days in town', `${p.days}  (${p.hours < 1 ? 'under an hour' : p.hours.toFixed(1) + ' h'} in total)`],
      ['Money', formatYen(p.money)],
      ['Capsules pulled', String(p.pulls)],
      ['Favourite series', p.fav || 'none yet (how boring)'],
      ['Figures found', `${p.found} / ${p.total}`],
    ];
    this.el.innerHTML = `<div class="rb-book"><div class="rb-page l"><div class="rb-h"><span>Profile</span><span>p. 1</span></div><div class="rb-portrait"></div>`
      + rows.map(([k, v]) => `<div class="rb-row"><span class="k">${k}:</span><span class="v">${v}</span></div>`).join('')
      + '<div class="rb-foot"><span>~ Heaven-sent reference ~</span><span>1</span></div></div><div class="rb-spine"></div>'
      + `<div class="rb-page r"><div class="rb-h"><span>Secrets</span><span>p. 2</span></div><div class="rb-stamp">PRIVATE</div>`
      + `<div class="rb-row rb-secret"><span class="v">${esc(secret)}</span></div>`
      + `<div class="rb-row"><span class="k">Notes:</span><span class="v">${esc(writeTitle)}</span></div>`
      + '<div class="rb-write"></div><div class="rb-foot"><span></span><span>2</span></div></div></div>';
    this.el.querySelector('.rb-portrait').appendChild(portrait());
    this.rows = [...this.el.querySelectorAll('.rb-row')];
    this.writeEl = this.el.querySelector('.rb-write');
  }

  /** Flip the book open over the screen. */
  open() {
    this.build();
    const el = this.el;
    el.classList.remove('closing', 'open');
    el.classList.add('on');
    void el.offsetWidth;
    el.classList.add('open');
    sfx('page', { vol: 0.9 }); setTimeout(() => sfx('page', { vol: 0.7 }), 260);
    let t = 0;
    return { update: (dt) => (t += dt) > 0.8 };
  }

  /** Rows appear one by one (the left page, then the secret). */
  reveal(gap = 0.32) {
    let t = 0, i = 0;
    return {
      update: (dt) => {
        t += dt;
        while (i < this.rows.length && t > i * gap) { this.rows[i].classList.add('in'); if (i === this.rows.length - 2) sfx('menace', { kind: 'do' }); i++; }
        if (dt > 100) this.rows.forEach((r) => r.classList.add('in'));
        return i >= this.rows.length && t > i * gap + 0.4;
      },
    };
  }

  /** Red ink, letter by letter, with a scratchy nib. */
  write(text, cps = 16) {
    let t = 0, n = 0;
    this.writeEl.innerHTML = '<span class="txt"></span><span class="cur"></span>';
    const tx = this.writeEl.querySelector('.txt');
    return {
      update: (dt) => {
        t += dt;
        const k = Math.min(text.length, dt > 100 ? text.length : Math.floor(t * cps));
        if (k > n) { if (/\S/.test(text[k - 1]) && (k % 2)) sfx('paint', { vol: 0.35 }); n = k; tx.textContent = text.slice(0, n); }
        if (n >= text.length) { this.writeEl.querySelector('.cur')?.remove(); }
        return n >= text.length && t > text.length / cps + 0.9;
      },
    };
  }

  close() {
    const el = this.el;
    el.classList.add('closing');
    el.classList.remove('open');
    sfx('page', { vol: 0.8 });
    let t = 0;
    return { update: (dt) => { t += dt; if (t > 0.4 || dt > 100) { el.classList.remove('on', 'closing'); return true; } return false; } };
  }

  /** Remove instantly (cutscene ended early). */
  hide() { this.el.classList.remove('on', 'open', 'closing'); }
}
