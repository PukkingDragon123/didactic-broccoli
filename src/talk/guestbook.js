// The customer guestbook (お客様ノート): a little lectern with a notebook outside the shop where customers write what
// they think: complaints (prices, sold-out machines, litter, being slapped...), questions they asked, haggles, and the
// odd compliment. Read it in the world (click the book) or on the PC ("Customer Voice").
//   game.guestbook.add({ kind: 'complaint' | 'question' | 'praise' | 'haggle', who, text })
// Saved in game.state.guestbook = { entries: [{ day, time, kind, who, text }] } (last 60).
import * as THREE from 'three';
import { ensureState } from '../game/stateExt.js';
import { guestbookStand } from '../npc/props.js';
import { audio } from '../core/audio.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const LABEL = { complaint: 'Complaint', question: 'Question', praise: 'Thank you', haggle: 'Deal' };
export const GUESTBOOK_POS = { x: -1.55, z: 5.55, rotY: 0 }; // on the apron, between the twin gacha and the door

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
    // the open book on the slanted top: a page texture we redraw when entries change
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 40;
    this.pageCv = cv;
    const tex = this.pageTex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
    const book = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.012, 0.26), [0, 0, 1, 0, 0, 0].map((i) => (i ? new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }) : new THREE.MeshStandardMaterial({ color: 0x8a2a2a, roughness: 0.8 }))));
    book.position.set(0, 1.03, 0.0);
    book.rotation.x = 0.36;
    book.castShadow = true;
    root.add(book);
    const pen = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.14), new THREE.MeshStandardMaterial({ color: 0x2a2a3a }));
    pen.position.set(0.17, 1.06, 0.06); pen.rotation.set(0.36, 0.5, 0);
    root.add(pen);
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

  /** The page you see on the lectern: scribbled lines (more ink as entries pile up) and a red mark for new ones. */
  drawPage() {
    const x = this.pageCv.getContext('2d'), n = this.s.entries.length;
    x.fillStyle = '#f2ead6'; x.fillRect(0, 0, 64, 40);
    x.fillStyle = '#c8b898'; x.fillRect(31, 0, 2, 40);
    for (let i = 0; i < Math.min(16, n); i++) {
      const col = i < 8 ? 3 : 35, row = 4 + (i % 8) * 4.4, w = 12 + ((i * 7) % 14);
      const e = this.s.entries[n - 1 - i];
      x.fillStyle = e?.kind === 'complaint' ? '#b8322e' : e?.kind === 'praise' ? '#2a7a3a' : '#2a3460';
      x.fillRect(col, Math.round(row), w, 1);
    }
    if (this.unread) { x.fillStyle = '#e5383b'; x.fillRect(58, 2, 4, 4); }
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
