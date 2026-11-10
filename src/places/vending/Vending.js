// The lane's vending machines, working: walk up, click, and the camera eases in to the machine's face. Behind the glass
// stand twelve sample drinks (the real containers with their full labels: src/products), each over its price tag, its
// あったか〜い / つめた〜い strip and its button; move the lit selection (mouse or WASD), LMB to take a closer look: the
// drink comes out on a paper POP card and turns under your mouse (front, the small print on the back, the lid), LMB
// again to put the coins in. Clunk: the can drops into the port, the camera follows it down, LMB to take it. Drink it
// from your hand (src/needs/eat.js). The beer and chu-hi machine by Mikawa-ya only sells in the evening (and checks
// your age, in its way).
//   game.places.vending = { machines (list), open(machine) }
// The cabinets are modelled here (src/places/vending/cabinet.js) at the old voxel props' spots, which are put away.
import * as THREE from 'three';
import { audio } from '../../core/audio.js';
import { ensureState } from '../../game/stateExt.js';
import { makeToolMesh } from '../../game/Held.js';
import { propMesh } from '../../world/props.js';
import { draw5 } from '../../gfx/font5x7.js';
import { FOODS, MACHINES, isAlcohol } from '../../needs/foods.js';
import { kanji, loadLabelFonts } from './canArt.js';
import { PanelMode } from './panel.js';
import { makeCabinet, CAB } from './cabinet.js';
import { drinkGeometry, drinkMesh, drinksSheet } from '../../products/containers.js';
import { BRANDS, DRINKS } from '../../products/brands.js';
import { CONT } from '../../products/spec.js';
import { pixCanvas, hitBox, paperFill, tapeStrip } from '../util.js';
import { payCash, yen } from '../money.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
// the machines in the lane (Town.js): position, facing, line-up
const SPOTS = [
  { id: 'fe2a', x: -0.62, z: 14.43, rot: Math.PI, menu: 'coffee', name: 'Coffee & Tea', jp: 'コーヒー・お茶' },
  { id: 'fe2b', x: 0.4, z: 14.43, rot: Math.PI, menu: 'soda', name: 'Soda & Sports', jp: 'ジュース' },
  { id: 'fw2a', x: -17.0, z: 14.45, rot: Math.PI, menu: 'corner', name: 'Drinks', jp: 'のみもの' },
  { id: 'fw2b', x: -16.0, z: 14.45, rot: Math.PI, menu: 'sake', name: 'Beer & Chu-hi', jp: 'お酒', night: true },
  { id: 'nw3', x: -16.05, z: 5.68, rot: 0, menu: 'odd', name: 'Oddities', jp: 'めずらしい' },
  // the park plaza's pair (src/world/Park.js), where the teens hang out
  { id: 'park1', x: 16.22, z: -4.07, rot: -Math.PI / 2, menu: 'soda', name: 'Soda & Sports', jp: 'ジュース', park: true },
  { id: 'park2', x: 16.22, z: -5.09, rot: -Math.PI / 2, menu: 'coffee', name: 'Coffee & Tea', jp: 'コーヒー・お茶', park: true },
];
const COLS = 4, ROWS = 3;
const SW = 288, SH = 84, CELL = 72, ROW = 28; // the strip canvas: three bars of four cells
const BW = 288, BH = 336, BCH = 112; // the cards behind the samples: four by three cells of 72 x 112
const OUTLET = V(...CAB.outlet);
const CARD = { w: 0.46, h: 0.31, cw: 460, ch: 310 }; // the POP card behind the drink you are looking at
const hash = (i, k) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };

/** Several geometries (position / normal / uv), each with a matrix, as one. */
function merged(parts) {
  let n = 0;
  for (const [g] of parts) n += g.attributes.position.count;
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), T = new Float32Array(n * 2), v = new THREE.Vector3(), nm = new THREE.Matrix3();
  let o = 0;
  for (const [g, m] of parts) {
    const p = g.attributes.position, nn = g.attributes.normal, t = g.attributes.uv;
    nm.getNormalMatrix(m);
    for (let i = 0; i < p.count; i++, o++) {
      v.fromBufferAttribute(p, i).applyMatrix4(m); P[o * 3] = v.x; P[o * 3 + 1] = v.y; P[o * 3 + 2] = v.z;
      v.fromBufferAttribute(nn, i).applyMatrix3(nm).normalize(); N[o * 3] = v.x; N[o * 3 + 1] = v.y; N[o * 3 + 2] = v.z;
      T[o * 2] = t.getX(i); T[o * 2 + 1] = t.getY(i);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(N, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(T, 2));
  geo.computeBoundingSphere();
  return geo;
}

export class Vending {
  constructor(game, places) {
    this.game = game;
    this.places = places;
    this.s = ensureState(game, 'vending', { v: 1, bought: 0, ageOk: false, tray: {} });
    this.list = [];
    this.cur = null; this.sel = 0; this.mode = 'grid';
    this.turn = { yaw: 0, pitch: 0.12, idle: 0 };
    this.pm = new PanelMode(game, {
      onMove: (dx, dy) => this.move(dx, dy),
      onMouse: (dx, dy) => this.spin(dx, dy),
      onAct: () => this.act(),
      onBack: () => this.back(),
      hint: () => this.hint(),
      onExit: () => { const m = this.cur; this.cur = null; this.showStage(null); if (m) this.draw(m); },
    });
    this.retireOldProps();
    for (const sp of SPOTS) if (!sp.park || game.garage.town?.park) this.build(sp);
    this.buildStage();
    loadLabelFonts(Object.values(FOODS)).then(() => { for (const m of this.list) { this.draw(m); this.drawBack(m); } });
    this.machines = this.list;
  }

  /** The voxel machines Town.js queued as instanced props stand where ours do: take them out of the scene. */
  retireOldProps() {
    const old = [];
    this.game.scene.traverse((o) => { if (o.name === 'props:vending') old.push(o); });
    if (!old.length) return;
    const attic = new THREE.Group();
    attic.name = 'vending:retired'; attic.visible = false; // (the instance culler skips anything under a hidden parent)
    this.game.scene.add(attic);
    for (const o of old) attic.add(o);
  }

  // ------------------------------------------------------------------ the machines
  build(sp) {
    const g = this.game;
    const root = new THREE.Group();
    root.name = 'vending:' + sp.id;
    root.position.set(sp.x, 0, sp.z);
    root.rotation.y = sp.rot;
    g.scene.add(root);
    const m = { ...sp, root, items: MACHINES[sp.menu].map((id) => FOODS[id]), tray: null };
    const cab = m.cab = makeCabinet(sp.menu);
    root.add(cab.group);
    // the samples: twelve drinks standing on the ledges, one mesh
    const parts = m.items.map((f, i) => {
      const c = i % COLS, r = Math.floor(i / COLS);
      return [drinkGeometry(f.id, { sample: true }), new THREE.Matrix4().compose(V(CAB.cols[c] + (hash(i, 1) - 0.5) * 0.012, CAB.ledge[r], CAB.sampleZ), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), (hash(i, 2) - 0.5) * 0.3), V(1, 1, 1))];
    });
    m.samples = new THREE.Mesh(merged(parts), drinksSheet().lit());
    m.samples.name = 'vending:samples'; m.samples.raycast = () => {};
    root.add(m.samples);
    // the printed card behind each sample: the maker's colour, the drink's name (the window's back, lit like the strips)
    m.back = pixCanvas(BW, BH);
    m.backMat = new THREE.MeshBasicMaterial({ map: m.back.tex, color: 0xe6e6e6, toneMapped: true });
    const bp = new THREE.Mesh(new THREE.PlaneGeometry(CAB.win.x1 - CAB.win.x0, CAB.win.y1 - CAB.win.y0), m.backMat);
    bp.position.set((CAB.win.x0 + CAB.win.x1) / 2, (CAB.win.y0 + CAB.win.y1) / 2, CAB.win.zb + 0.003); bp.raycast = () => {}; bp.name = 'vending:cards';
    root.add(bp);
    // the three strips under them: price, hot / cold, the button and its lamp (the machine's own light: unlit)
    m.canvas = pixCanvas(SW, SH);
    m.mat = new THREE.MeshBasicMaterial({ map: m.canvas.tex, color: 0xe6e6e6, toneMapped: true });
    const w = CAB.win.x1 - CAB.win.x0, strips = [];
    CAB.ledge.forEach((y, r) => {
      const geo = new THREE.PlaneGeometry(w, CAB.stripH), uv = geo.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setY(k, 1 - (r + (1 - uv.getY(k))) / ROWS);
      strips.push([geo, new THREE.Matrix4().makeTranslation((CAB.win.x0 + CAB.win.x1) / 2, y - CAB.stripH / 2, 0.3515)]);
    });
    m.panel = new THREE.Mesh(merged(strips), m.mat);
    m.panel.name = 'vending:strips'; m.panel.raycast = () => {};
    root.add(m.panel);
    // the "getting ready" card hung inside the glass of the night machine in the daytime
    if (sp.night) {
      const sign = pixCanvas(96, 56, (c, cw, ch) => {
        c.fillStyle = '#c8302a'; c.fillRect(0, 0, cw, ch); c.fillStyle = '#f4ead2'; c.fillRect(3, 3, cw - 6, ch - 6);
        kanji(c, '準備中', cw / 2, 7, 16, 0xc8302a, { align: 'center' }); kanji(c, '夕方4時から', cw / 2, 28, 12, 0x2a1a14, { align: 'center' });
        draw5(c, 'FROM 16:00', cw / 2, 44, { s: 1, col: '#2a1a14', align: 'center' });
      });
      m.sign = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.175), new THREE.MeshStandardMaterial({ map: sign.tex, roughness: 0.9 }));
      m.sign.position.set(-0.08, 1.4, 0.325); m.sign.rotation.z = -0.04; m.sign.raycast = () => {};
      m.signArt = sign;
      root.add(m.sign);
    }
    root.updateMatrixWorld(true);
    // click box over the whole front
    const hb = hitBox(0.98, 1.85, 0.12, 0, 0.92, 0.36);
    root.add(hb);
    g.interaction.add(hb, {
      reach: 1.9,
      hint: () => {
        if (m.tray) return { key: 'LMB', text: `Take the ${m.tray.name}`, sub: 'From the port at the bottom' };
        const closed = this.closed(m);
        return { key: 'LMB', text: `${m.name} vending machine`, sub: closed || `${m.items.length} drinks · ${yen(Math.min(...m.items.map((f) => f.price)))}-${yen(Math.max(...m.items.map((f) => f.price)))}` };
      },
      use: () => { if (m.tray) this.takeTray(m); else this.open(m); return false; },
    });
    this.list.push(m);
    this.draw(m); this.drawBack(m);
    this.lightOne(m);
    // a can left in the port from before
    const left = this.s.tray[sp.id];
    if (left && FOODS[left]) this.dropCan(m, FOODS[left], true);
  }

  /** The beer machine sleeps in the daytime (and in the small hours). */
  closed(m) {
    if (!m.night) return null;
    const h = this.game.clock?.hours ?? 18;
    return h >= 16 || h < 2 ? null : '準備中 - opens at 16:00';
  }

  local(m, x, y, z) { return m.root.localToWorld(V(x, y, z)); }

  // ------------------------------------------------------------------ the cards behind the samples
  drawBack(m) {
    const css = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0');
    const mixc = (a, b, t) => { const f = (s) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t); return (f(16) << 16) | (f(8) << 8) | f(0); };
    const closed = this.closed(m);
    m.back.redraw((ctx, W, H) => {
      ctx.fillStyle = closed ? '#4a4e56' : '#f2f4f2'; ctx.fillRect(0, 0, W, H);
      m.items.forEach((f, i) => {
        const x = (i % COLS) * CELL, y = Math.floor(i / COLS) * BCH, d = DRINKS[f.id] || {}, b = BRANDS[d.brand] || { main: 0x8a8a8a, accent: 0xffd23f, ink: 0x241a1e, paper: 0xfffaf0 };
        const base = closed ? 0x5a5e66 : mixc(b.main, 0xffffff, 0.72), band = closed ? 0x4a4e56 : b.main;
        ctx.fillStyle = css(base); ctx.fillRect(x + 2, y + 2, CELL - 4, 86);
        ctx.fillStyle = css(mixc(base, 0xffffff, 0.35)); for (let k = -90; k < CELL; k += 12) for (let j = 0; j < 86; j++) { const xx = x + 2 + k + j; if (xx >= x + 2 && xx < x + CELL - 3) ctx.fillRect(xx, y + 2 + j, 3, 1); }
        ctx.fillStyle = css(band); ctx.fillRect(x + 2, y + 2, CELL - 4, 15);
        if (closed) return;
        // the name, in the maker's hand, over two lines if it is long
        const name = [...f.jp], per = name.length > 10 ? 6 : name.length > 5 ? Math.ceil(name.length / 2) : 5;
        kanji(ctx, name.slice(0, per).join(''), x + CELL / 2, y + 3, 12, (b.main & 0xff) + ((b.main >> 8) & 0xff) + ((b.main >> 16) & 0xff) > 420 ? b.ink : 0xffffff, { align: 'center' });
        if (name.length > per) kanji(ctx, name.slice(per, per * 2).join(''), x + CELL / 2, y + 19, 12, b.ink, { align: 'center' });
        // a little flash on some of them
        const tag = f.hot ? null : [null, '新発売', null, '人気', null, 'おすすめ', null][(i * 5 + m.id.length) % 7];
        if (tag) { ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 4, y + 34, tag.length * 10 + 6, 13); ctx.fillStyle = '#2e1f28'; ctx.fillRect(x + 4, y + 46, tag.length * 10 + 6, 1); kanji(ctx, tag, x + 7, y + 35, 10, 0xc8281e); }
      });
    });
  }

  // ------------------------------------------------------------------ the strips
  draw(m) {
    const sel = this.cur === m && this.mode !== 'tray' ? this.sel : -1;
    const closed = this.closed(m);
    const blink = Math.floor((this.game.time || 0) * 3) % 2 === 0;
    m.canvas.redraw((ctx, W, H) => {
      ctx.fillStyle = '#d9dde0'; ctx.fillRect(0, 0, W, H);
      m.items.forEach((f, i) => {
        const x = (i % COLS) * CELL, y = Math.floor(i / COLS) * ROW, on = i === sel;
        // the temperature band
        ctx.fillStyle = closed ? '#6a6e76' : f.hot ? '#d8362a' : '#2a6ad8'; ctx.fillRect(x, y, CELL, 12);
        ctx.fillStyle = closed ? '#565a62' : f.hot ? '#a8201a' : '#1a4aa8'; ctx.fillRect(x, y + 11, CELL, 1); ctx.fillRect(x + CELL - 1, y, 1, 12);
        kanji(ctx, f.hot ? 'あったか〜い' : 'つめた〜い', x + CELL / 2, y + 1, 10, 0xffffff, { align: 'center' });
        // the price tag, a paper slip in a holder
        ctx.fillStyle = '#8e949c'; ctx.fillRect(x + 3, y + 13, 42, 14);
        ctx.fillStyle = '#fbf8ee'; ctx.fillRect(x + 4, y + 14, 40, 12);
        draw5(ctx, `${f.price}`, x + 30, y + 17, { s: 1, col: '#241a1e', align: 'right' });
        kanji(ctx, '円', x + 31, y + 14, 10, 0x241a1e);
        ctx.fillStyle = '#c8302a'; ctx.fillRect(x + 6, y + 16, 2, 8);
        // the button: a lamp that lights when it is yours to press
        ctx.fillStyle = '#5a5e66'; ctx.fillRect(x + 48, y + 13, 21, 14);
        ctx.fillStyle = closed ? '#7a2420' : on ? (blink ? '#ff4a32' : '#a82418') : '#eef0ee'; ctx.fillRect(x + 49, y + 14, 19, 11);
        ctx.fillStyle = closed ? '#5a1a16' : on ? '#7a1810' : '#b8bcc0'; ctx.fillRect(x + 49, y + 24, 19, 2);
        if (closed) kanji(ctx, '売切', x + 58, y + 14, 10, 0xffb0a0, { align: 'center' });
        else if (!on) { ctx.fillStyle = '#c8ccd0'; ctx.fillRect(x + 51, y + 16, 15, 1); }
        if (on) { ctx.fillStyle = '#ffd23f'; ctx.fillRect(x, y, CELL, 1); ctx.fillRect(x, y, 1, ROW); ctx.fillRect(x + CELL - 1, y, 1, ROW); ctx.fillRect(x, y + ROW - 1, CELL, 1); }
      });
    });
    if (m.sign) m.sign.visible = !!closed;
    this.placeArrow();
  }

  // ------------------------------------------------------------------ the close look: a POP card and the drink itself
  buildStage() {
    const g = this.game;
    const st = this.stage = new THREE.Group();
    st.name = 'vending:stage'; st.visible = false;
    g.scene.add(st);
    this.card = pixCanvas(CARD.cw, CARD.ch);
    const card = new THREE.Mesh(new THREE.PlaneGeometry(CARD.w, CARD.h), new THREE.MeshBasicMaterial({ map: this.card.tex, color: 0xe9e9e9, toneMapped: true }));
    card.raycast = () => {};
    st.add(card);
    this.pivot = new THREE.Group();
    st.add(this.pivot);
    // the pointer over the chosen sample (a pixel arrow)
    const a = pixCanvas(11, 8, (c) => {
      const R = ['...kkkkk...', '...kyyyk...', 'kkkkyyykkkk', 'kyyyyyyyyyk', '.kyyyyyyyk.', '..kyyyyyk..', '...kyyyk...', '....kkk....'];
      R.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') { c.fillStyle = ch === 'k' ? '#2e1f28' : '#ffd23f'; c.fillRect(i, j, 1, 1); } }));
    });
    this.arrow = new THREE.Mesh(new THREE.PlaneGeometry(0.044, 0.032), new THREE.MeshBasicMaterial({ map: a.tex, transparent: true, alphaTest: 0.5, toneMapped: true }));
    this.arrow.visible = false; this.arrow.raycast = () => {};
    g.scene.add(this.arrow);
  }
  placeArrow() {
    const m = this.cur, a = this.arrow;
    if (!a) return;
    if (!m || this.mode !== 'grid' || this.closed(m)) { a.visible = false; return; }
    const i = this.sel, f = m.items[i], c = CONT[DRINKS[f.id]?.cont] || CONT.can350;
    const bob = Math.floor((this.game.time || 0) * 3) % 2 ? 0.004 : 0;
    a.position.copy(this.local(m, CAB.cols[i % COLS], CAB.ledge[Math.floor(i / COLS)] + c.h / 1000 + 0.03 + bob, 0.325));
    a.quaternion.copy(m.root.quaternion);
    a.visible = true;
  }
  /** Put the card and the drink in front of machine m (or away). */
  showStage(m) {
    const st = this.stage;
    if (!st) return;
    if (!m) { st.visible = false; return; }
    const f = m.items[this.sel], c = CONT[DRINKS[f.id]?.cont] || CONT.can350;
    st.position.copy(this.local(m, -0.08, 1.36, 0.56));
    st.quaternion.copy(m.root.quaternion);
    if (this.shown !== f.id) {
      this.shown = f.id;
      this.pivot.clear();
      const d = drinkMesh(f.id, { castShadow: false });
      d.material = drinksSheet().lit(); d.raycast = () => {};
      const s = Math.min(1.7, 0.2 / (c.h / 1000));
      d.scale.setScalar(s); d.position.y = -(c.h / 1000) * s / 2;
      this.pivot.add(d);
      this.pivot.position.set(-CARD.w / 2 + 0.105, 0.012, 0.075);
      this.turn.yaw = 0.35; this.turn.pitch = 0.1; this.turn.idle = 1;
    }
    st.visible = true;
    this.drawCard(m);
  }
  spin(dx, dy) {
    if (this.mode !== 'detail') return;
    const t = this.turn;
    if (dx || dy) { t.yaw += dx * 0.012; t.pitch = Math.max(-0.35, Math.min(1.2, t.pitch + dy * 0.008)); t.idle = 0; }
  }
  drawCard(m) {
    const f = m.items[this.sel], d = DRINKS[f.id] || {}, b = BRANDS[d.brand] || {}, mode = this.mode;
    const cash = this.game.wallet ? this.game.wallet.cash : 0;
    this.card.redraw((ctx, W, H) => {
      paperFill(ctx, 0, 0, W, H, { base: '#f4ecd6', seed: this.sel * 7 + 3, border: '#b8a888' });
      tapeStrip(ctx, 60, -2, 44, 10); tapeStrip(ctx, W - 110, -2, 44, 10);
      if (mode === 'age') {
        ctx.fillStyle = '#c8302a'; ctx.fillRect(40, 50, W - 80, 44);
        kanji(ctx, '年齢確認', W / 2, 56, 32, 0xffffff, { align: 'center' });
        kanji(ctx, 'お酒は20歳になってから', W / 2, 112, 16, 0x241a1e, { align: 'center' });
        draw5(ctx, 'AGE CHECK: ARE YOU 20 OR OVER?', W / 2, 142, { s: 2, col: '#241a1e', align: 'center', max: W - 40 });
        for (const x of [70, 250]) { ctx.fillStyle = '#2a8a3a'; ctx.fillRect(x, 176, 140, 46); ctx.fillStyle = '#1a5a26'; ctx.fillRect(x, 218, 140, 4); kanji(ctx, 'はい', x + 70, 182, 32, 0xffffff, { align: 'center' }); }
        draw5(ctx, 'PRESS EITHER BUTTON', W / 2, 250, { s: 1, col: '#6a5a4a', align: 'center' });
        return;
      }
      // where the drink stands: a printed spot, a ledge
      const sx = 105, sy = 150;
      ctx.fillStyle = '#ead9b4'; for (let y = -96; y <= 96; y += 4) for (let x = -84; x <= 84; x += 4) if (x * x / 7056 + y * y / 9216 <= 1 && ((x + y) / 4) % 2 === 0) ctx.fillRect(sx + x, sy + y, 2, 2);
      ctx.fillStyle = '#c8b48a'; ctx.fillRect(30, 262, 150, 3); ctx.fillStyle = '#a8946a'; ctx.fillRect(30, 265, 150, 1);
      draw5(ctx, 'MOVE THE MOUSE TO TURN IT', 105, 274, { s: 1, col: '#8a7a5a', align: 'center' });
      // the facts
      const x = 208;
      let y = 22;
      kanji(ctx, f.jp, x, y, 16, 0x241a1e); y += 22;
      draw5(ctx, f.name, x, y, { s: 2, col: '#241a1e', max: W - x - 14 }); y += 20;
      if (b.jp) { kanji(ctx, b.jp, x, y, 12, 0x6a5a4a); draw5(ctx, b.en || '', x + [...b.jp].length * 12 + 6, y + 3, { s: 1, col: '#6a5a4a' }); y += 18; }
      ctx.fillStyle = f.hot ? '#d8362a' : '#2a6ad8'; ctx.fillRect(x, y, 86, 16);
      kanji(ctx, f.hot ? 'あったか〜い' : 'つめた〜い', x + 43, y + 2, 12, 0xffffff, { align: 'center' });
      draw5(ctx, yen(f.price), W - 44, y - 2, { s: 3, col: '#c8302a', align: 'right' });
      kanji(ctx, '税別', W - 40, y + 6, 12, 0x241a1e);
      y += 28;
      const wrap = (t, col, sign) => {
        const words = String(t || '').toUpperCase().split(' ');
        let cur = '', first = true;
        const put = () => { if (first) draw5(ctx, sign, x, y, { s: 1, col }); draw5(ctx, cur, x + 10, y, { s: 1, col }); y += 11; first = false; };
        for (const wd of words) { if ((cur + ' ' + wd).trim().length > 36) { put(); cur = wd; } else cur = (cur + ' ' + wd).trim(); }
        if (cur) put();
        y += 3;
      };
      wrap(f.pros, '#2f7a40', '+'); wrap(f.cons, '#b8281e', '-');
      const st = [];
      if (f.energy) st.push(`ENERGY ${f.energy > 0 ? '+' : ''}${f.energy}`);
      if (f.full) st.push(`FILLING +${f.full}`);
      if (f.drunk > 0) st.push(`ALCOHOL ${Math.round(f.drunk * 100)}`);
      if (d.vol) st.push(String(d.vol).toUpperCase().replace(/[^0-9A-Z]/g, '') || '');
      draw5(ctx, st.filter(Boolean).join('  ·  '), x, y, { s: 1, col: '#4a3e36' });
      // the bottom: what the button will do
      const ok = cash >= f.price;
      ctx.fillStyle = ok ? '#2a8a3a' : '#8a8a84'; ctx.fillRect(x, H - 62, W - x - 14, 30);
      ctx.fillStyle = ok ? '#1a5a26' : '#6a6a64'; ctx.fillRect(x, H - 35, W - x - 14, 3);
      draw5(ctx, ok ? `INSERT ${yen(f.price)}` : 'NOT ENOUGH CASH', x + (W - x - 14) / 2, H - 54, { s: 2, col: '#ffffff', align: 'center' });
      draw5(ctx, `WALLET ${yen(cash)}`, x + (W - x - 14) / 2, H - 24, { s: 1, col: '#6a5a4a', align: 'center' });
    });
  }

  // ------------------------------------------------------------------ operating it
  open(m) {
    const g = this.game;
    if (this.pm.active || g.cutscene.active || g.talk?.active) return;
    this.cur = m; this.mode = 'grid';
    if (this.sel >= m.items.length) this.sel = 0;
    this.pm.enter(this.gridView(m));
    this.draw(m);
    audio.play('vendBeep', { vol: 0.4, f: 1320 });
  }
  gridView(m) { return { pos: this.local(m, -0.08, 1.36, 1.72), look: this.local(m, -0.08, 1.33, 0.3), fov: 22 }; }
  detailView(m) { return { pos: this.local(m, -0.08, 1.37, 1.2), look: this.local(m, -0.08, 1.36, 0.56), fov: 30 }; }

  move(dx, dy) {
    const m = this.cur;
    if (!m || this.mode !== 'grid') return;
    const n = m.items.length;
    let c = this.sel % COLS, r = Math.floor(this.sel / COLS);
    c = (c + dx + COLS) % COLS; r = (r + dy + ROWS) % ROWS;
    this.sel = Math.min(n - 1, r * COLS + c);
    audio.play('vendBeep', { vol: 0.25, f: 1760 });
    this.draw(m);
  }

  act() {
    const m = this.cur, g = this.game;
    if (!m) return;
    if (m.busy) return;
    if (this.mode === 'tray') { this.takeTray(m); return; }
    const closed = this.closed(m);
    if (closed) { audio.play('vendNo', { vol: 0.5 }); return; }
    const f = m.items[this.sel];
    if (this.mode === 'grid') {
      this.mode = 'detail';
      this.pm.view(this.detailView(m));
      this.showStage(m);
      audio.play('vendBeep', { vol: 0.4 });
      this.draw(m);
      return;
    }
    if (this.mode === 'age') { this.s.ageOk = true; this.mode = 'detail'; audio.play('vendBeep', { vol: 0.4 }); this.drawCard(m); return; }
    // detail: buy it
    if (isAlcohol(f.id) && !this.s.ageOk) { this.mode = 'age'; this.drawCard(m); audio.play('vendBeep', { vol: 0.4, f: 990 }); return; }
    if (m.tray) { audio.play('vendNo', { vol: 0.5 }); g.news('Take the one in the port first'); return; }
    const slot = this.local(m, CAB.slot[0], CAB.slot[1], 0.38);
    if (!payCash(g, f.price, `Vending: ${f.name}`, slot)) { audio.play('vendNo', { vol: 0.5 }); this.drawCard(m); return; }
    m.busy = true;
    this.showStage(null);
    this.pm.view(this.gridView(m));
    const n = Math.min(4, Math.ceil(f.price / 100));
    for (let i = 0; i < n; i++) g.tweens.wait(0.15 + i * 0.16, () => audio.play('coinInsert', { pos: slot, vol: 0.6 }));
    g.tweens.wait(0.25 + n * 0.16, () => audio.play('vendBeep', { pos: slot, vol: 0.5, f: 1568 }));
    g.tweens.wait(0.55 + n * 0.16, () => {
      audio.play('vendDrop', { pos: this.local(m, 0, 0.3, 0.3), vol: 0.9 });
      g.player.shake = Math.max(g.player.shake, 0.25);
      this.dropCan(m, f);
      this.s.bought++;
      this.mode = 'tray';
      this.pm.view({ pos: this.local(m, -0.12, 0.85, 0.78), look: this.local(m, -0.1, 0.16, 0.28), fov: 18 });
      m.busy = false;
      this.draw(m);
      g.events.emit('bought', { at: 'vending', id: f.id, price: f.price });
    });
  }

  back() {
    const m = this.cur;
    if (!m) return true;
    if (this.mode === 'detail' || this.mode === 'age') { this.mode = 'grid'; this.showStage(null); this.pm.view(this.gridView(m)); this.draw(m); audio.play('vendBeep', { vol: 0.25, f: 880 }); return false; }
    return true;
  }

  hint() {
    const m = this.cur;
    if (!m) return null;
    const f = m.items[this.sel];
    if (this.mode === 'tray') return { key: 'LMB', text: `Take the ${m.tray?.name || 'drink'}`, sub: 'Clunk!' };
    if (this.closed(m)) return { key: 'RMB', text: 'Step back', sub: this.closed(m) };
    if (this.mode === 'age') return { key: 'LMB', text: 'Press はい', sub: 'There is no いいえ button' };
    if (this.mode === 'detail') return { key: 'LMB', text: `Insert ${yen(f.price)}`, sub: `${f.name} · turn it with the mouse · RMB back to the line-up` };
    return { key: 'LMB', text: `Look closer: ${f.name}  ${yen(f.price)}`, sub: 'Move the mouse or WASD to choose · RMB step back' };
  }

  // ------------------------------------------------------------------ the port
  dropCan(m, f, instant = false) {
    const can = propMesh(f.prop, { castShadow: false });
    const c = CONT[DRINKS[f.id]?.cont] || CONT.can350, r = c.d / 2000;
    const p = OUTLET.clone().setY(CAB.port.y0 + r + 0.004);
    // lying on its side across the port, the label turned up towards you
    can.rotation.set(0, 0.6, Math.PI / 2, 'ZYX');
    can.position.copy(p).add(V(c.h / 2000, instant ? 0 : 0.14, 0));
    m.root.add(can);
    m.tray = { food: f, mesh: can, name: f.name };
    this.s.tray[m.id] = f.id;
    if (!instant) this.game.tweens.add({ dur: 0.22, update: (k) => { can.position.y = p.y + 0.14 * (1 - k * k); } });
  }

  takeTray(m) {
    const g = this.game, H = g.held, t = m.tray;
    if (!t) return;
    if (!H.canTake()) { g.news('Your hands are full', 'Free a slot (Q puts things down), then take it'); audio.play('error', { vol: 0.4 }); return; }
    const obj = makeToolMesh(t.food.id);
    obj.position.copy(t.mesh.getWorldPosition(new THREE.Vector3()));
    g.scene.add(obj);
    t.mesh.parent?.remove(t.mesh);
    m.tray = null;
    delete this.s.tray[m.id];
    H.take('tool', { id: t.food.id }, obj);
    audio.play('pickup', { vol: 0.6 });
    if (this.cur === m) { this.pm.exit(); this.cur = null; }
    this.draw(m);
    g.tip?.('drink', `${t.food.hot ? 'Hot' : 'Cold'} ${t.food.name} in hand`, 'Click to drink it (nothing targeted)');
    g.save();
  }

  /** The window's own light: brighter against the evening; the night machine's is off while it is closed. */
  lightOne(m) {
    const day = this.game.clock?.daylight?.() ?? 1, c = !!this.closed(m);
    m.mat.color.setScalar(c ? 0.45 : 0.8 + 0.18 * (1 - day)); m.backMat.color.setScalar(c ? 0.3 : 0.74 + 0.22 * (1 - day));
    m.cab.lit.emissiveIntensity = c ? 0.04 : 0.42 + 0.4 * (1 - day);
    m.samples.material = c ? drinksSheet().material() : drinksSheet().lit();
    drinksSheet().lit().emissiveIntensity = 0.42 + 0.4 * (1 - day);
    if (c !== m.wasClosed) { m.wasClosed = c; this.draw(m); this.drawBack(m); }
  }

  update(dt) {
    // the selection lamp blinks; the drink on the card turns; the beer machine wakes up in the evening
    this.blinkT = (this.blinkT || 0) - dt;
    if (this.cur && this.blinkT <= 0) { this.blinkT = 0.33; this.draw(this.cur); }
    if (this.stage?.visible) {
      const t = this.turn;
      t.idle += dt;
      if (t.idle > 1.2) t.yaw += dt * 0.7;
      this.pivot.rotation.set(t.pitch, t.yaw, 0, 'XYZ');
    }
    this.lightT = (this.lightT || 0) - dt;
    if (this.lightT <= 0) { this.lightT = 5; for (const m of this.list) this.lightOne(m); }
  }
}
export { SPOTS as VENDING_SPOTS, pick as _pick };
