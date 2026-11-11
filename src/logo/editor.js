// The sketchbook: a pixel editor for the shop's logo and name, on the paper kit (src/ui/paper.js + paper.css).
// A spiral sketch pad on a kraft board: tool tags down the left, the drawing on graph paper in the middle (32 x 32 or
// 64 x 64), the ink chips, lettering stamps (the 5 x 7 bitmap font or DotGothic16 kana) and the shop's name on the
// right, and the sign and noren as they will look along the bottom. Mouse, touch (pointer events) and keyboard:
//   B pencil  E eraser  G fill  L line  R rectangle  M mirror  I pick ink  T stamp  [ ] ink  Ctrl+Z / Ctrl+Y
//   arrows move the cursor, Space paints (line / rectangle: Space twice), Esc saves and closes. Right button erases.
//   openLogoEditor(game, { from }) -> Promise<boolean saved>
import { defineIcon, iconHTML } from '../gfx/icons.js';
import { mask5, textW5 } from '../gfx/font5x7.js';
import { audio } from '../core/audio.js';
import { INKS, INK_NAMES, LOGO_SIZES, NAME_MAX, DEFAULT_NAME, readLogo, writeLogo, crestPixels, nameJP, nameEN, logoCanvas } from './logo.js';
import { signPreview, norenPreview } from '../gfx/garageArt.js';
import './editor.css';

const sfx = (n, v = 0.5) => { try { audio.play(n, { vol: v }); } catch { /* audio not ready */ } };
const hexs = (c) => '#' + c.toString(16).padStart(6, '0');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ------------------------------------------------------------------ tool icons (16 x 16, the shared palette letters)
const ICONS = {
  le_pencil: ['............KK..', '...........KSSK.', '..........KSPPK.', '.........KKKPK..', '........KYYKK...', '.......KYYYK....', '......KYYyK.....', '.....KYYyK......', '....KYYyK.......', '...KAYyK........', '..KAAAK.........', '..KAAK..........', '.KkKK...........', '.KK.............', '................', '................'],
  le_eraser: ['................', '................', '.........KKKK...', '........KSSSSK..', '.......KSSSSSSK.', '......KSSSSSSPK.', '.....KCSSSSSPK..', '....KCCKSSSPK...', '...KCCCCKSPK....', '..KCCCCCCKK.....', '..KbCCCCK.......', '...KbCCK........', '....KKK.........', '................', '.k.k..k.........', '................'],
  le_fill: ['................', '.....KKKK.......', '....K....K......', '...KKKKKKKK.....', '..KlLLLLLLlK....', '..KlLLLLLLlKBB..', '..KlLWLLLLlKBBB.', '..KlLWLLLLlK.BB.', '...KlLLLLlK..BB.', '...KlLLLLlK...B.', '....KlllllK.....', '....KKKKKK......', '................', '................', '................', '................'],
  le_line: ['................', '.............KK.', '............KKK.', '...........KK...', '..........KK....', '.........KK.....', '........KK......', '.......KK.......', '......KK........', '.....KK.........', '....KK..........', '...KK...........', '.KKK............', '.KK.............', '................', '................'],
  le_rect: ['................', '................', '.KKKKKKKKKKKKKK.', '.KKKKKKKKKKKKKK.', '.KK..........KK.', '.KK..........KK.', '.KK..........KK.', '.KK..........KK.', '.KK..........KK.', '.KK..........KK.', '.KK..........KK.', '.KKKKKKKKKKKKKK.', '.KKKKKKKKKKKKKK.', '................', '................', '................'],
  le_mirror: ['.......R........', '.......R........', '...K...R...K....', '..KK.......KK...', '.KYK...R...KYK..', 'KYYK...R...KYYK.', 'KYYK.......KYYK.', '.KYK...R...KYK..', '..KK...R...KK...', '...K.......K....', '.......R........', '.......R........', '................', '................', '................', '................'],
  le_pick: ['................', '...........KKK..', '..........KkkkK.', '.........KkkkkK.', '........KKkkkK..', '.......KCKKKK...', '......KCCCK.....', '.....KCCCK......', '....KCCCK.......', '...KCCCK........', '..KBCCK.........', '..KBBK..........', '.KKKK...........', '.K..............', '................', '................'],
  le_undo: ['................', '................', '....K...........', '...KK...........', '..KRKKKKKKK.....', '.KRRRRRRRRRK....', '..KRKKKKKKRRK...', '...KK.....KRK...', '....K......KRK..', '...........KRK..', '..........KRRK..', '....KKKKKKRRK...', '....KRRRRRRK....', '....KKKKKKK.....', '................', '................'],
  le_redo: ['................', '................', '...........K....', '...........KK...', '.....KKKKKKKRK..', '....KRRRRRRRRRK.', '...KRRKKKKKKRK..', '...KRK.....KK...', '..KRK......K....', '..KRK...........', '..KRRK..........', '...KRRKKKKKK....', '....KRRRRRRK....', '.....KKKKKKK....', '................', '................'],
  le_clear: ['................', '....KKKKKKKK....', '...KwwwwwwwwK...', '...KwRwwwwRwK...', '...KwwRwwRwwK...', '...KwwwRRwwwK...', '...KwwwRRwwwK...', '...KwwRwwRwwK...', '...KwRwwwwRwK...', '...KwwwwwwwwK...', '...KwwwwwwwwK...', '...KuuuuuuuuK...', '....KKKKKKKK....', '................', '................', '................'],
  le_text: ['................', '...KKKKKKKKKK...', '...KTTTTTTTTK...', '....KtttttK.....', '.....KTTTK......', '.....KTTTK......', '.....KTTTK......', '....KTTTTTK.....', '...KRRRRRRRK....', '...KRWRRWWRK....', '...KRWRRRWRK....', '...KRWWWRWRK....', '...KRRRRRRRK....', '....KKKKKKK.....', '................', '................'],
};
let iconsDone = false;
function icons() { if (iconsDone) return; iconsDone = true; for (const [k, rows] of Object.entries(ICONS)) defineIcon(k, { rows }); }

const TOOLS = [
  ['pencil', 'Pencil', 'B'], ['eraser', 'Eraser', 'E'], ['fill', 'Fill', 'G'], ['line', 'Line', 'L'], ['rect', 'Box', 'R'],
  ['pick', 'Pick ink', 'I'], ['text', 'Stamp', 'T'], ['mirror', 'Mirror', 'M'], ['undo', 'Undo', 'Ctrl Z'], ['redo', 'Redo', 'Ctrl Y'],
];

let open = null; // the editor that's up

/** Open the sketchbook. Resolves true when the player saved. opts.from: 'desk' | 'pc' | 'debug'. */
export function openLogoEditor(game, opts = {}) {
  if (open) return open.promise;
  icons();
  const ed = new Editor(game, opts);
  open = ed;
  ed.promise.finally(() => { if (open === ed) open = null; });
  return ed.promise;
}
export const logoEditorOpen = () => open;

class Editor {
  constructor(game, opts) {
    this.game = game;
    this.opts = opts;
    const L = readLogo(game);
    this.size = L.size;
    this.px = L.px ? L.px.slice() : crestPixels(L.size);
    this.custom = !!L.px;
    this.jp = L.jp; this.en = L.en;
    this.ink = 6; this.tool = 'pencil'; this.prevTool = 'pencil'; this.mirror = false;
    this.undoS = []; this.redoS = [];
    this.stamp = { text: 'GG', font: '5x7' };
    this.cur = { x: -1, y: -1, kx: this.size >> 1, ky: this.size >> 1, keys: false };
    this.drag = null; this.anchor = null;
    this.dirty = false;
    this.promise = new Promise((res) => { this.resolve = res; });
    this.build();
    this.grab();
    this.render();
    this.preview(true);
    sfx('paper', 0.6);
  }

  // ------------------------------------------------------------------ the page
  build() {
    const el = document.createElement('div');
    el.id = 'logo-ed';
    const tools = TOOLS.map(([id, name, key]) => `<button class="le-tool" data-tool="${id}" title="${name} (${key})">${iconHTML('le_' + id, 2)}<small>${name}</small></button>`).join('');
    const inks = INKS.map((c, i) => (i ? `<button class="le-ink" data-ink="${i}" title="${INK_NAMES[i]}" style="--c:${hexs(c)}"></button>` : '')).join('');
    el.innerHTML = `<div class="le-dim"></div>
      <div class="le-book"><div class="le-board"></div><div class="le-page">
        <i class="le-rings"></i>
        <header><b>Sketchbook</b><span>看板とロゴ</span><small>Draw your shop's logo. It goes on the sign, the noren, your capsule prints, price plates and receipts.</small><button class="le-x" data-act="cancel" title="Close without saving"></button></header>
        <div class="le-body">
          <div class="le-tools">${tools}<button class="le-tool" data-tool="clear" title="Clear the page">${iconHTML('le_clear', 2)}<small>Clear</small></button></div>
          <div class="le-paper"><canvas class="le-cv" width="320" height="320"></canvas><div class="le-status"></div><div class="le-sizes">${LOGO_SIZES.map((s) => `<button data-size="${s}">${s} x ${s}</button>`).join('')}<button data-act="crest" title="Start again from Grandpa's crest">Grandpa's crest</button></div></div>
          <div class="le-side">
            <section><h4>Inks <i class="le-cur"></i><em class="le-inkname"></em></h4><div class="le-inks">${inks}</div></section>
            <section class="le-stamp"><h4>Lettering stamp</h4>
              <div class="le-row"><input class="le-stxt" maxlength="12" spellcheck="false" value="GG"><button data-font="5x7" title="5 x 7 capitals">ABC</button><button data-font="kana" title="DotGothic16 kana">かな</button></div>
              <p>Pick the Stamp tool, then click the drawing to print it in the ink you have.</p></section>
            <section class="le-name"><h4>Shop name</h4>
              <label><span>看板</span><input class="le-jp" maxlength="${NAME_MAX.jp}" spellcheck="false" placeholder="${DEFAULT_NAME.jp}"></label>
              <label><span>NAME</span><input class="le-en" maxlength="${NAME_MAX.en}" spellcheck="false" placeholder="${DEFAULT_NAME.en}"></label>
              <p>Up to ${NAME_MAX.jp} kana / kanji on the sign, ${NAME_MAX.en} letters in English.</p></section>
          </div>
        </div>
        <footer>
          <div class="le-prev"><canvas class="le-sign"></canvas><canvas class="le-noren"></canvas><img class="le-mini" alt=""></div>
          <div class="le-btns"><button data-act="cancel">Cancel<kbd>Esc</kbd></button><button class="le-done" data-act="done">Done<i></i></button></div>
        </footer>
      </div></div>`;
    document.body.appendChild(el);
    this.el = el;
    this.cv = el.querySelector('.le-cv');
    this.cx = this.cv.getContext('2d');
    this.$ = (s) => el.querySelector(s);
    this.$('.le-jp').value = this.jp === DEFAULT_NAME.jp ? '' : this.jp;
    this.$('.le-en').value = this.en === DEFAULT_NAME.en ? '' : this.en;
    // fit the book to the window: whole steps when there's room (pixel art stays crisp), shrunk on small screens
    this.fit = () => { const k = Math.min(innerWidth / 948, innerHeight / 628); el.style.setProperty('--k', k >= 1 ? Math.floor(k * 2) / 2 : k); };
    this.fit();
    addEventListener('resize', this.fit);
    // clicks
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || !el.contains(b)) return;
      e.stopPropagation();
      if (b.dataset.tool) this.pickTool(b.dataset.tool);
      else if (b.dataset.ink) { this.ink = +b.dataset.ink; if (this.tool === 'eraser' || this.tool === 'pick') this.tool = this.prevTool; sfx('uiClick', 0.35); this.render(); }
      else if (b.dataset.size) this.resize(+b.dataset.size);
      else if (b.dataset.font) { this.stamp.font = b.dataset.font; this.tool = 'text'; this.loadKana(); this.render(); }
      else if (b.dataset.act === 'crest') { this.snap(); this.px = crestPixels(this.size); this.changed(); }
      else if (b.dataset.act === 'cancel') this.close(false);
      else if (b.dataset.act === 'done') this.close(true);
    });
    el.querySelector('.le-dim').addEventListener('pointerdown', (e) => e.stopPropagation());
    // names and the stamp text
    const jp = this.$('.le-jp'), en = this.$('.le-en'), st = this.$('.le-stxt');
    jp.addEventListener('input', () => { this.jp = nameJP(jp.value) || DEFAULT_NAME.jp; this.loadKana(this.jp); this.preview(); });
    en.addEventListener('input', () => { const v = en.value.toUpperCase(); if (v !== en.value) en.value = v; this.en = nameEN(v) || DEFAULT_NAME.en; this.preview(); });
    st.addEventListener('input', () => { this.stamp.text = st.value; this.loadKana(); this.render(); });
    st.addEventListener('focus', () => { if (this.tool !== 'text') this.pickTool('text'); });
    // drawing: pointer events (mouse, pen and touch alike)
    const cv = this.cv;
    cv.addEventListener('pointerdown', (e) => this.down(e));
    cv.addEventListener('pointermove', (e) => this.move(e));
    cv.addEventListener('pointerup', (e) => this.up(e));
    cv.addEventListener('pointercancel', (e) => this.up(e, true));
    cv.addEventListener('pointerleave', () => { if (!this.drag) { this.cur.x = -1; this.render(); } });
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    this.onKey = (e) => this.key(e);
    addEventListener('keydown', this.onKey, true);
    requestAnimationFrame(() => el.classList.add('on'));
  }

  /** Free the mouse for the page (the PC already has it), take it back after. */
  grab() {
    const g = this.game;
    this.atPC = !!(g.pc?.active || g.os?.isOpen);
    this.prevUi = g.uiOpen;
    g.uiOpen = true;
    g.interaction?.setHint?.(null);
    if (!this.atPC) g.input.unlock?.();
  }
  release() {
    const g = this.game;
    g.uiOpen = this.prevUi;
    if (!this.atPC && !g.input.locked) g.input.lock?.();
  }

  close(save) {
    if (this.closing) return;
    this.closing = true;
    if (save) {
      const blank = !this.px.some((v) => v), crest = crestPixels(this.size), same = this.size === 32 && this.px.every((v, i) => v === crest[i]);
      writeLogo(this.game, { size: this.size, px: blank || same ? null : this.px, jp: this.jp, en: this.en });
      sfx('place', 0.7);
      this.el.classList.add('stamped');
    } else sfx('paper', 0.5);
    removeEventListener('keydown', this.onKey, true);
    removeEventListener('resize', this.fit);
    this.el.classList.add('out');
    setTimeout(() => this.el.remove(), save ? 420 : 260);
    this.release();
    this.resolve(!!save);
  }

  // ------------------------------------------------------------------ editing
  snap() { this.undoS.push({ size: this.size, px: this.px.slice() }); if (this.undoS.length > 80) this.undoS.shift(); this.redoS.length = 0; }
  undo() { const s = this.undoS.pop(); if (!s) return; this.redoS.push({ size: this.size, px: this.px.slice() }); this.size = s.size; this.px = s.px; this.changed(); sfx('uiClick', 0.3); }
  redo() { const s = this.redoS.pop(); if (!s) return; this.undoS.push({ size: this.size, px: this.px.slice() }); this.size = s.size; this.px = s.px; this.changed(); sfx('uiClick', 0.3); }
  changed() { this.dirty = true; this.render(); this.preview(); }

  pickTool(t) {
    if (t === 'undo') return this.undo();
    if (t === 'redo') return this.redo();
    if (t === 'mirror') { this.mirror = !this.mirror; sfx('uiClick', 0.35); return this.render(); }
    if (t === 'clear') { if (this.px.some((v) => v)) { this.snap(); this.px.fill(0); this.changed(); sfx('paper', 0.6); } return; }
    if (t !== 'pick' && t !== 'eraser') this.prevTool = t;
    this.tool = t; this.anchor = null;
    if (t === 'text') this.loadKana();
    sfx('uiClick', 0.35);
    this.render();
  }

  resize(n) {
    if (n === this.size || !LOGO_SIZES.includes(n)) return;
    this.snap();
    const o = this.size, src = this.px, out = new Uint8Array(n * n);
    if (n > o) { const k = n / o; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) out[y * n + x] = src[Math.floor(y / k) * o + Math.floor(x / k)]; }
    else {
      const k = o / n;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const cnt = new Map(); let inked = 0;
        for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) { const c = src[(y * k + j) * o + x * k + i]; if (c) { inked++; cnt.set(c, (cnt.get(c) || 0) + 1); } }
        let best = 0, bn = 0; for (const [c, m] of cnt) if (m > bn) { bn = m; best = c; }
        out[y * n + x] = inked * 4 >= k * k ? best : 0;
      }
    }
    this.size = n; this.px = out;
    this.cur.kx = Math.min(this.cur.kx * n / o, n - 1) | 0; this.cur.ky = Math.min(this.cur.ky * n / o, n - 1) | 0;
    sfx('uiClick', 0.4);
    this.changed();
  }

  set(x, y, c) {
    const n = this.size;
    const put = (i) => { if (i >= 0 && i < n && y >= 0 && y < n) this.px[y * n + i] = c; };
    put(x);
    if (this.mirror) put(n - 1 - x);
  }
  line(x0, y0, x1, y1, c) {
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy, x = x0, y = y0;
    for (;;) { this.set(x, y, c); if (x === x1 && y === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x += sx; } if (e2 <= dx) { e += dx; y += sy; } }
  }
  box(x0, y0, x1, y1, c) { this.line(x0, y0, x1, y0, c); this.line(x1, y0, x1, y1, c); this.line(x1, y1, x0, y1, c); this.line(x0, y1, x0, y0, c); }
  fill(x, y, c) {
    const n = this.size, from = this.px[y * n + x];
    const flood = (sx, sy) => {
      const from2 = this.px[sy * n + sx];
      if (from2 === c) return;
      const st = [[sx, sy]];
      while (st.length) { const [i, j] = st.pop(); if (i < 0 || j < 0 || i >= n || j >= n || this.px[j * n + i] !== from2) continue; this.px[j * n + i] = c; st.push([i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]); }
    };
    if (from === c) return;
    flood(x, y);
    if (this.mirror) flood(n - 1 - x, y);
  }

  /** The stamp's lit pixels, [[x, y]] from its top left, and its size. */
  stampMask() {
    const t = this.stamp.text.trim();
    if (!t) return { pts: [], w: 0, h: 0 };
    if (this.stamp.font === '5x7') {
      const k = this.size >= 64 ? 2 : 1, pts = [];
      for (const [x, y] of mask5(t)) for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) pts.push([x * k + i, y * k + j]);
      return { pts, w: textW5(t) * k, h: 7 * k };
    }
    const key = t + '|' + (this.kanaOK ? 1 : 0);
    if (this.kanaKey === key) return this.kanaMask;
    const c = document.createElement('canvas'), x = c.getContext('2d', { willReadFrequently: true });
    x.font = '16px "DotGothic16"';
    const w = Math.ceil(x.measureText(t).width) + 2;
    c.width = Math.max(1, w); c.height = 20;
    x.font = '16px "DotGothic16"'; x.textBaseline = 'top'; x.fillStyle = '#000'; x.fillText(t, 0, 1);
    const d = x.getImageData(0, 0, c.width, 20).data, pts = [];
    let maxY = 0;
    for (let j = 0; j < 20; j++) for (let i = 0; i < c.width; i++) if (d[(j * c.width + i) * 4 + 3] > 110) { pts.push([i, j]); maxY = Math.max(maxY, j); }
    const minY = pts.reduce((m, p) => Math.min(m, p[1]), 99);
    for (const p of pts) p[1] -= minY;
    this.kanaKey = key;
    this.kanaMask = { pts, w: c.width - 2, h: maxY - minY + 1 };
    return this.kanaMask;
  }
  loadKana(extra = '') {
    const t = this.stamp.text + extra;
    try { document.fonts?.load('16px "DotGothic16"', t).then(() => { this.kanaOK = true; this.kanaKey = null; this.render(); this.preview(); }, () => {}); } catch { /* no font loading */ }
  }
  stampAt(x, y) {
    const m = this.stampMask();
    if (!m.pts.length) return;
    this.snap();
    const ox = x - (m.w >> 1), oy = y - (m.h >> 1);
    for (const [i, j] of m.pts) this.set(ox + i, oy + j, this.ink);
    sfx('place', 0.45);
    this.changed();
  }

  // ------------------------------------------------------------------ input
  cell(e) {
    const r = this.cv.getBoundingClientRect(), n = this.size;
    return { x: Math.floor((e.clientX - r.left) / r.width * n), y: Math.floor((e.clientY - r.top) / r.height * n) };
  }
  inside(c) { return c.x >= 0 && c.y >= 0 && c.x < this.size && c.y < this.size; }
  down(e) {
    e.preventDefault();
    this.cv.setPointerCapture?.(e.pointerId);
    const c = this.cell(e);
    if (!this.inside(c)) return;
    this.cur.keys = false;
    this.apply(c, e.button === 2 ? 'eraser' : this.tool, 'down');
  }
  move(e) {
    const c = this.cell(e);
    this.cur.x = c.x; this.cur.y = c.y; this.cur.keys = false;
    if (this.drag) this.apply(c, this.drag.tool, 'move');
    else this.render();
  }
  up(e, cancel = false) {
    if (!this.drag) return;
    const c = this.cell(e);
    if (!cancel) this.apply(c, this.drag.tool, 'up');
    this.drag = null;
    this.render();
  }

  /** One tool step at cell c: phase 'down' | 'move' | 'up' (pointer) or 'key' (keyboard Space). */
  apply(c, tool, phase) {
    const n = this.size, cx = Math.max(0, Math.min(n - 1, c.x)), cy = Math.max(0, Math.min(n - 1, c.y));
    const ink = tool === 'eraser' ? 0 : this.ink;
    if (tool === 'pencil' || tool === 'eraser') {
      if (phase === 'down' || phase === 'key') { this.snap(); this.set(cx, cy, ink); if (phase === 'down') this.drag = { tool, x: cx, y: cy }; this.changed(); sfx('uiHover', 0.25); }
      else if (phase === 'move' && this.drag) { this.line(this.drag.x, this.drag.y, cx, cy, ink); this.drag.x = cx; this.drag.y = cy; this.changed(); }
      return;
    }
    if (tool === 'fill') { if (phase === 'down' || phase === 'key') { this.snap(); this.fill(cx, cy, this.ink); this.changed(); sfx('uiHover', 0.4); } return; }
    if (tool === 'pick') { if (phase === 'down' || phase === 'key') { const v = this.px[cy * n + cx]; if (v) this.ink = v; this.tool = this.prevTool; sfx('uiClick', 0.35); this.render(); } return; }
    if (tool === 'text') { if (phase === 'down' || phase === 'key') this.stampAt(cx, cy); return; }
    if (tool === 'line' || tool === 'rect') {
      if (phase === 'down') { this.drag = { tool, x: cx, y: cy, x1: cx, y1: cy }; this.render(); return; }
      if (phase === 'move' && this.drag) { this.drag.x1 = cx; this.drag.y1 = cy; this.render(); return; }
      if (phase === 'up' && this.drag) { this.snap(); (tool === 'line' ? this.line : this.box).call(this, this.drag.x, this.drag.y, cx, cy, this.ink); this.drag = null; this.changed(); sfx('uiHover', 0.4); return; }
      if (phase === 'key') {
        if (!this.anchor) { this.anchor = { x: cx, y: cy }; this.render(); return; }
        this.snap(); (tool === 'line' ? this.line : this.box).call(this, this.anchor.x, this.anchor.y, cx, cy, this.ink); this.anchor = null; this.changed(); sfx('uiHover', 0.4);
      }
    }
  }

  key(e) {
    if (!this.el.isConnected) return;
    const typing = /INPUT|TEXTAREA/.test(document.activeElement?.tagName || '');
    const k = e.code, ctrl = e.ctrlKey || e.metaKey;
    if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); if (typing) document.activeElement.blur(); else this.close(true); return; }
    if (typing) { if (k === 'Enter') document.activeElement.blur(); e.stopPropagation(); return; }
    e.stopPropagation();
    if (ctrl && k === 'KeyZ') { e.preventDefault(); if (e.shiftKey) this.redo(); else this.undo(); return; }
    if (ctrl && k === 'KeyY') { e.preventDefault(); this.redo(); return; }
    if (ctrl) return;
    const T = { KeyB: 'pencil', KeyP: 'pencil', KeyE: 'eraser', KeyG: 'fill', KeyL: 'line', KeyR: 'rect', KeyI: 'pick', KeyT: 'text', KeyM: 'mirror' }[k];
    if (T) { e.preventDefault(); this.pickTool(T); return; }
    if (k === 'BracketLeft' || k === 'BracketRight') { e.preventDefault(); this.ink = 1 + ((this.ink - 1 + (k === 'BracketLeft' ? INKS.length - 2 : 1)) % (INKS.length - 1)); sfx('uiClick', 0.3); this.render(); return; }
    const mv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k];
    const C = this.cur;
    if (mv) {
      e.preventDefault();
      const step = e.shiftKey ? 4 : 1;
      C.kx = Math.max(0, Math.min(this.size - 1, C.kx + mv[0] * step)); C.ky = Math.max(0, Math.min(this.size - 1, C.ky + mv[1] * step)); C.keys = true;
      if (this.keyPaint && (this.tool === 'pencil' || this.tool === 'eraser')) { this.set(C.kx, C.ky, this.tool === 'eraser' ? 0 : this.ink); this.changed(); } else this.render();
      return;
    }
    if (k === 'Space' || k === 'Enter') {
      e.preventDefault();
      C.keys = true;
      this.apply({ x: C.kx, y: C.ky }, this.tool, 'key');
      if (k === 'Space' && !e.repeat && (this.tool === 'pencil' || this.tool === 'eraser')) {
        // hold Space and steer with the arrows to draw a stroke
        this.keyPaint = true;
        const up = (ev) => { if (ev.code === 'Space') { this.keyPaint = false; removeEventListener('keyup', up, true); } };
        addEventListener('keyup', up, true);
      }
    }
  }

  // ------------------------------------------------------------------ drawing the page
  render() {
    const x = this.cx, n = this.size, S = this.cv.width, k = S / n;
    x.clearRect(0, 0, S, S);
    // graph paper: faint blue rules, darker every 8 cells, a red centre line when mirroring
    x.fillStyle = '#f6efdc'; x.fillRect(0, 0, S, S);
    for (let i = 0; i <= n; i++) {
      const p = Math.round(i * k);
      x.fillStyle = i % 8 === 0 ? 'rgba(47,90,154,.34)' : 'rgba(47,90,154,.13)';
      x.fillRect(p, 0, 1, S); x.fillRect(0, p, S, 1);
    }
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const c = this.px[j * n + i];
      if (!c) continue;
      x.fillStyle = hexs(INKS[c]);
      x.fillRect(Math.round(i * k), Math.round(j * k), Math.ceil(k), Math.ceil(k));
    }
    const ghost = (pts, ox, oy, col) => { x.fillStyle = col; for (const [i, j] of pts) { for (const ii of this.mirror ? [ox + i, n - 1 - (ox + i)] : [ox + i]) if (ii >= 0 && ii < n && oy + j >= 0 && oy + j < n) x.fillRect(Math.round(ii * k), Math.round((oy + j) * k), Math.ceil(k), Math.ceil(k)); } };
    const C = this.cur, hx = C.keys ? C.kx : C.x, hy = C.keys ? C.ky : C.y, over = hx >= 0 && hy >= 0 && hx < n && hy < n;
    const inkCol = hexs(INKS[this.ink]);
    // shape previews: what the line / box will be, in the ink, half-pressed
    const shape = this.drag && (this.drag.tool === 'line' || this.drag.tool === 'rect') ? [this.drag.x, this.drag.y, this.drag.x1, this.drag.y1, this.drag.tool] : this.anchor && over ? [this.anchor.x, this.anchor.y, hx, hy, this.tool] : null;
    if (shape) {
      const keep = this.px.slice(), mir = this.mirror;
      const [a, b, c2, d, t] = shape;
      (t === 'line' ? this.line : this.box).call(this, a, b, c2, d, 255);
      const pts = []; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (this.px[j * n + i] === 255) pts.push([i, j]);
      this.px = keep; this.mirror = false;
      x.globalAlpha = 0.7; ghost(pts, 0, 0, inkCol); x.globalAlpha = 1;
      this.mirror = mir;
    }
    if (over && this.tool === 'text') { const m = this.stampMask(); x.globalAlpha = 0.55; ghost(m.pts, hx - (m.w >> 1), hy - (m.h >> 1), inkCol); x.globalAlpha = 1; }
    if (this.mirror) { x.fillStyle = 'rgba(200,50,44,.8)'; for (let y = 0; y < S; y += 8) x.fillRect(S / 2 - 1, y, 2, 4); }
    // the cursor: a 2-px ink square round the cell (red for the eraser)
    if (over) {
      x.strokeStyle = this.tool === 'eraser' ? '#c8322c' : '#241a1e'; x.lineWidth = 2;
      x.strokeRect(Math.round(hx * k) + 1, Math.round(hy * k) + 1, Math.ceil(k) - 2 + (k < 8 ? 2 : 0), Math.ceil(k) - 2 + (k < 8 ? 2 : 0));
      if (this.mirror) x.strokeRect(Math.round((n - 1 - hx) * k) + 1, Math.round(hy * k) + 1, Math.ceil(k) - 2, Math.ceil(k) - 2);
    }
    // the side: tools, inks, sizes, fonts
    const el = this.el;
    el.querySelectorAll('.le-tool').forEach((b) => b.classList.toggle('on', b.dataset.tool === this.tool || (b.dataset.tool === 'mirror' && this.mirror)));
    el.querySelectorAll('.le-ink').forEach((b) => b.classList.toggle('on', +b.dataset.ink === this.ink));
    el.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('on', +b.dataset.size === n));
    el.querySelectorAll('[data-font]').forEach((b) => b.classList.toggle('on', b.dataset.font === this.stamp.font));
    el.querySelector('[data-tool="undo"]').disabled = !this.undoS.length;
    el.querySelector('[data-tool="redo"]').disabled = !this.redoS.length;
    this.$('.le-cur').style.background = inkCol;
    this.$('.le-inkname').textContent = INK_NAMES[this.ink];
    this.cv.dataset.tool = this.tool;
    const tip = { pencil: 'Pencil (B): click and drag. Right button erases.', eraser: 'Eraser (E): rub out to the paper.', fill: 'Fill (G): pour ink into a shape.', line: this.anchor ? 'Line: Space again to finish it.' : 'Line (L): drag from end to end.', rect: this.anchor ? 'Box: Space again for the other corner.' : 'Box (R): drag corner to corner.', pick: 'Pick ink (I): click a colour in the drawing.', text: 'Stamp (T): click to print the lettering.' }[this.tool] || '';
    this.$('.le-status').textContent = `${tip}${this.mirror ? '  Mirror on.' : ''}`;
  }

  /** Repaint the sign and noren previews (at most every 120 ms while drawing). */
  preview(now = false) {
    if (!now) { if (this.prevT) return; this.prevT = setTimeout(() => { this.prevT = 0; this.preview(true); }, 120); return; }
    if (!this.el?.isConnected) return;
    const crest = crestPixels(this.size), same = this.size === 32 && this.px.every((v, i) => v === crest[i]);
    const L = { size: this.size, px: same || !this.px.some((v) => v) ? null : this.px, custom: !same && this.px.some((v) => v), jp: this.jp, en: this.en, named: this.jp !== DEFAULT_NAME.jp || this.en !== DEFAULT_NAME.en, rev: -1 };
    const put = (cv, src) => { cv.width = src.width; cv.height = src.height; cv.getContext('2d').drawImage(src, 0, 0); };
    try { put(this.$('.le-sign'), signPreview(L)); put(this.$('.le-noren'), norenPreview(L)); this.$('.le-mini').src = logoCanvas(L, this.size === 64 ? 1 : 2, this.size).toDataURL(); } catch (err) { console.warn('logo preview', err); }
  }
}
