// The customer guestbook (お客様ノート): a little lectern with a notebook outside the shop where customers write what
// they think: complaints (prices, sold-out machines, litter, being slapped...), questions they asked, haggles, and the
// odd compliment. Read it in the world (click the book) or on the PC ("Customer Voice").
//   game.guestbook.add({ kind: 'complaint' | 'question' | 'praise' | 'haggle', who, text })
// Saved in game.state.guestbook = { entries: [{ day, time, kind, who, text }] } (last 60).
import * as THREE from 'three';
import { ensureState } from '../game/stateExt.js';
import { guestbookStand } from '../npc/props.js';
import { propMesh } from '../world/props.js';
import { audio } from '../core/audio.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const LABEL = { complaint: 'Complaint', question: 'Question', praise: 'Thank you', haggle: 'Deal' };
export const GUESTBOOK_POS = { x: -1.55, z: 5.55, rotY: 0 }; // on the apron, between the twin gacha and the door
const PW = 128, PH = 80; // the open spread's pixel art
/** The two pages of the open notebook (its own frame, src/props/models/fixtures.js gb_book): curving up from the outer
 *  edges to the gutter, the spread's left half on the left page. */
function pageGeometry() {
  const pos = [], uv = [], idx = [], N = 10;
  for (const sx of [-1, 1]) {
    const base = pos.length / 3;
    for (let k = 0; k <= N; k++) {
      const t = k / N, x = sx * (0.008 + t * 0.19), y = 0.0045 + 0.012 * Math.sin(Math.PI * 0.5 * (1 - t)) ** 0.6 + 0.004 * (1 - t) - 0.004 * (1 - t) ** 8;
      const u = 0.5 + sx * (0.03 + t * 0.47);
      for (const [z, v] of [[-0.127, 1], [0.127, 0]]) { pos.push(x, y + 0.0006, z); uv.push(u, v); }
    }
    for (let k = 0; k < N; k++) { const a = base + k * 2; if (sx > 0) idx.push(a, a + 1, a + 3, a, a + 3, a + 2); else idx.push(a, a + 3, a + 1, a, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export class Guestbook {
  constructor(game) {
    this.game = game;
    this.s = ensureState(game, 'guestbook', { entries: [], read: 0 });
    if (!Array.isArray(this.s.entries)) this.s.entries = [];
    this.build();
    this.overlay();
    this.registerApp();
    game.events.on('complaint', (e) => { if (!e?.logged) this.add({ kind: 'complaint', who: e?.who?.spec?.name || 'A customer', text: e?.text || 'Too expensive.' }); });
  }

  add({ kind = 'complaint', who = 'A customer', text = '' }) {
    const g = this.game;
    this.s.entries.push({ day: g.clock?.day ?? 1, time: g.clock?.time || '', kind, who, text: String(text) });
    if (this.s.entries.length > 60) this.s.entries.splice(0, this.s.entries.length - 60);
    this.dirty = true;
    g.events.emit('guestbook', { kind, who, text });
  }
  get unread() { return Math.max(0, this.s.entries.length - (this.s.read || 0)); }

  // ---- the lectern
  build() {
    const g = this.game, P = GUESTBOOK_POS;
    const root = new THREE.Group();
    root.position.set(P.x, 0, P.z);
    root.rotation.y = P.rotY;
    root.add(guestbookStand());
    // the open notebook on the slanted top (covers, page blocks, spine, ribbon: src/props/models/fixtures.js gb_book), its
    // two pages curving up to the spine with a pixel-art spread we redraw when entries change, and a ballpoint on it
    const cv = document.createElement('canvas'); cv.width = PW; cv.height = PH;
    this.pageCv = cv;
    const tex = this.pageTex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.anisotropy = 4;
    const book = new THREE.Group();
    book.position.set(0, 1.028, 0.0);
    book.rotation.x = 0.36;
    book.add(propMesh('gb_book'));
    const pages = new THREE.Mesh(pageGeometry(), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 }));
    pages.castShadow = false; pages.receiveShadow = true;
    book.add(pages);
    const pen = propMesh('gb_pen');
    pen.position.set(0.105, 0.0215, 0.02); pen.rotation.set(0, 0.62, 0.035);
    book.add(pen);
    root.add(book);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.5), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 0.6;
    root.add(hit);
    root.traverse((o) => { if (o.isMesh && o !== hit) o.raycast = () => {}; });
    g.scene.add(root);
    this.root = root;
    g.player.addObstacle?.(P.x - 0.24, P.x + 0.24, P.z - 0.18, P.z + 0.18);
    this.drawPage();
    g.interaction.add(hit, {
      reach: 2.2,
      hint: (held) => (held && held.kind !== 'tool' ? null : { key: 'LMB', text: 'Read the customer guestbook', sub: this.unread ? `${this.unread} new entr${this.unread === 1 ? 'y' : 'ies'}` : `${this.s.entries.length} entries` }),
      use: () => { this.open(); return false; },
      noHighlight: true,
    });
  }

  /**
   * The spread you see on the lectern (pixel art, PW x PH: two pages with a gutter): ruled lines, the title and a
   * date line on the left page, the latest entries in handwriting-like scribble (ink by kind: red complaints, green
   * thanks, blue questions and deals) with a little mark at the start of each, and a red NEW tab for unread ones.
   */
  drawPage() {
    const x = this.pageCv.getContext('2d'), n = this.s.entries.length, H = PH, half = PW / 2;
    const px = (i, j, c, w = 1, h = 1) => { x.fillStyle = c; x.fillRect(i, j, w, h); };
    px(0, 0, '#f4ecd8', PW, H);
    // paper: warmer towards the edges, the gutter's shadow, the rules and the red margin
    for (let i = 0; i < 3; i++) { px(i, 0, '#ece2c8', 1, H); px(PW - 1 - i, 0, '#ece2c8', 1, H); }
    for (let i = -4; i < 4; i++) px(half + i, 0, ['#e6dabe', '#e0d3b4', '#d8c9a8', '#cdbd9a', '#cdbd9a', '#d8c9a8', '#e0d3b4', '#e6dabe'][i + 4], 1, H);
    for (let j = 14; j < H - 4; j += 7) { px(5, j, '#c8d4e0', half - 10, 1); px(half + 5, j, '#c8d4e0', half - 10, 1); }
    px(11, 4, '#e8a8a0', 1, H - 8); px(half + 11, 4, '#e8a8a0', 1, H - 8);
    // the title and the shop's stamp on the left page
    const ink = '#2a3048';
    for (const [i, w] of [[14, 6], [22, 4], [28, 7], [37, 5]]) px(i, 7, ink, w, 2);
    px(half - 14, 3, '#c8322c', 8, 8); px(half - 13, 4, '#f4ecd8', 6, 6); px(half - 12, 5, '#c8322c', 4, 4);
    // the entries, newest first, down the left page then the right
    const rows = Math.floor((H - 18) / 7), L = Math.min(rows * 2, n);
    for (let k = 0; k < L; k++) {
      const e = this.s.entries[n - 1 - k], page = k < rows ? 0 : 1, row = k % rows;
      const c = e?.kind === 'complaint' ? '#a8302c' : e?.kind === 'praise' ? '#2a6a34' : '#2a3460';
      const y = 12 + row * 7 + (page ? 7 : 0) - 1, x0 = page * half + 14, len = String(e?.text || '').length;
      // a mark: ! for a complaint, a heart for thanks, ? for a question, ¥ for a deal
      if (e?.kind === 'complaint') { px(x0 - 2, y - 3, c, 1, 3); px(x0 - 2, y + 1, c); }
      else if (e?.kind === 'praise') { px(x0 - 3, y - 2, c, 1, 1); px(x0 - 1, y - 2, c); px(x0 - 3, y - 1, c, 3, 1); px(x0 - 2, y, c); }
      else { px(x0 - 3, y - 3, c, 2, 1); px(x0 - 2, y - 2, c); px(x0 - 3, y - 1, c); px(x0 - 3, y + 1, c); }
      // the words: ragged runs of handwriting with an x-height wobble
      let i = x0, w = 0, seed = (len * 31 + k * 7) % 97;
      const end = page * half + half - 6 - ((k * 5) % 9);
      while (i < end) {
        w = 2 + (seed % 5); seed = (seed * 13 + 7) % 97;
        for (let a = 0; a < w && i + a < end; a++) px(i + a, y - ((a + seed) % 3 === 0 ? 1 : 0), c);
        if (seed % 4 === 0) px(i + 1, y - 2, c);
        i += w + 2;
      }
    }
    if (this.unread) { px(PW - 9, 0, '#e5383b', 6, 9); px(PW - 9, 9, '#c02a2e', 2, 1); px(PW - 5, 9, '#c02a2e', 2, 1); px(PW - 8, 3, '#f4ecd8', 4, 1); }
    this.pageTex.needsUpdate = true;
    this.dirty = false;
  }

  // ---- reading it
  overlay() {
    const el = document.createElement('div');
    el.id = 'tk-book';
    document.body.appendChild(el);
    this.el = el;
    this.onKey = (e) => { if (!this.isOpen) return; e.preventDefault(); e.stopPropagation(); if (['Escape', 'KeyE', 'KeyQ', 'Space', 'Enter'].includes(e.code)) this.close(); };
    window.addEventListener('keydown', this.onKey, true);
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.close(); });
  }
  html() {
    const E = this.s.entries.slice(-16).reverse();
    const rows = E.length ? E.map((e) => `<div class="row ${e.kind === 'praise' ? 'good' : e.kind === 'question' ? 'q' : ''}"><b>${esc(LABEL[e.kind] || e.kind)}</b> <i>Day ${e.day} ${esc(e.time)} · ${esc(e.who)}:</i> ${esc(e.text)}</div>`).join('') : '<div class="row"><i>Nobody has written anything yet.</i></div>';
    return `<div class="pg"><h2>Customer guestbook</h2><div class="sub">Please write your thoughts! (Grandpa's handwriting, 40 years ago)</div>${rows}<div class="close">Click or press E to close</div></div>`;
  }
  open() {
    const g = this.game;
    this.el.innerHTML = this.html();
    this.el.classList.add('on');
    this.isOpen = true;
    this.openedAt = g.frame;
    this.prevUi = g.uiOpen;
    g.uiOpen = true;
    this.s.read = this.s.entries.length;
    this.drawPage();
    try { audio.play('page', { vol: 0.6 }); } catch { /* */ }
  }
  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.el.classList.remove('on');
    this.game.uiOpen = this.prevUi || false;
    try { audio.play('page', { vol: 0.4 }); } catch { /* */ }
  }

  update() {
    if (this.dirty) this.drawPage();
    if (this.isOpen && this.game.frame > this.openedAt + 2 && this.game.input.buttonDown?.(0)) this.close();
  }

  // ---- the PC
  registerApp() {
    const os = this.game.os;
    if (!os?.registerApp) return;
    os.registerApp({
      id: 'guestbook', name: 'Customer Voice', label: 'Voices', icon: 'os_note', group: 'Shop', w: 520, h: 420,
      about: 'Customer Voice 1.0: what the people of the lane write in the guestbook by your shop.',
      open: (win) => {
        const draw = () => {
          const E = this.s.entries.slice().reverse();
          const n = { complaint: 0, question: 0, praise: 0, haggle: 0 };
          for (const e of this.s.entries) n[e.kind] = (n[e.kind] || 0) + 1;
          win.body.innerHTML = `<div style="padding:8px;overflow:auto;height:100%;box-sizing:border-box">${E.length ? E.map((e) => `<div style="margin-bottom:6px"><b>${esc(LABEL[e.kind] || e.kind)}</b> &middot; Day ${e.day} ${esc(e.time)} &middot; ${esc(e.who)}<br>${esc(e.text)}</div>`).join('') : 'No entries yet.'}</div>`;
          win.status?.(`${n.complaint} complaints`, `${n.question} questions`, `${n.praise + n.haggle} happy customers`);
        };
        draw();
        this.game.events.on('guestbook', () => { if (win.el?.isConnected) draw(); });
      },
    });
  }
}
