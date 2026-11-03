// The lane's vending machines, working: walk up, click, and the camera eases in to the machine's face. Behind the glass
// stand twelve original parody drinks (pixel-art cans and bottles, src/places/vending/canArt.js) with their prices and
// hot / cold tags; move the lit selection (mouse or WASD), LMB for a close-up of one (the label unrolled: kanji, price,
// what it does for you and against you), LMB again to put the coins in. Clunk: the can drops into the tray, the camera
// follows it down, LMB to take it. Drink it from your hand (src/needs/eat.js). The beer and chu-hi machine by Mikawa-ya
// only sells in the evening (and checks your age, in its way).
//   game.places.vending = { machines, near(), open(machine) }
// The machines are Town.js props; this only adds the panel over their window, a click box and the outlet.
import * as THREE from 'three';
import { audio } from '../../core/audio.js';
import { ensureState } from '../../game/stateExt.js';
import { makeToolMesh } from '../../game/Held.js';
import { propMesh } from '../../world/props.js';
import { draw5, textW5 } from '../../gfx/font5x7.js';
import { FOODS, MACHINES, isAlcohol } from '../../needs/foods.js';
import { drawSample, drawLabel, kanji, loadLabelFonts } from './canArt.js';
import { PanelMode } from './panel.js';
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
];
// the prop's display window (local metres): x -0.43..0.27, y 0.92..1.74, glass face at z 0.34
const WIN = { x0: -0.44, x1: 0.28, y0: 0.91, y1: 1.75, z: 0.368 };
const TW = 280, TH = 328; // panel texture (pixels)
const COLS = 4, ROWS = 3, CELL_W = 66, CELL_H = 96, GX = 8, GY = 26;
const OUTLET = V(-0.1, 0.13, 0.25);

export class Vending {
  constructor(game, places) {
    this.game = game;
    this.places = places;
    this.s = ensureState(game, 'vending', { v: 1, bought: 0, ageOk: false, tray: {} });
    this.list = [];
    this.cur = null; this.sel = 0; this.mode = 'grid';
    this.pm = new PanelMode(game, {
      onMove: (dx, dy) => this.move(dx, dy),
      onAct: () => this.act(),
      onBack: () => this.back(),
      hint: () => this.hint(),
      onExit: () => { this.cur = null; },
    });
    for (const sp of SPOTS) this.build(sp);
    loadLabelFonts(Object.values(FOODS)).then(() => { for (const m of this.list) this.draw(m); });
  }

  // ------------------------------------------------------------------ the machines
  build(sp) {
    const g = this.game;
    const root = new THREE.Group();
    root.position.set(sp.x, 0, sp.z);
    root.rotation.y = sp.rot;
    g.scene.add(root);
    root.updateMatrixWorld(true);
    const m = { ...sp, root, items: MACHINES[sp.menu].map((id) => FOODS[id]), tray: null, lit: 1 };
    // the lit panel over the window
    m.canvas = pixCanvas(TW, TH);
    m.mat = new THREE.MeshBasicMaterial({ map: m.canvas.tex, color: 0xdedede, toneMapped: true });
    const w = WIN.x1 - WIN.x0, h = WIN.y1 - WIN.y0;
    m.panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m.mat);
    m.panel.position.set((WIN.x0 + WIN.x1) / 2, (WIN.y0 + WIN.y1) / 2, WIN.z);
    m.panel.raycast = () => {};
    root.add(m.panel);
    // click box over the whole front
    const hb = hitBox(0.98, 1.85, 0.12, 0, 0.92, 0.36);
    root.add(hb);
    g.interaction.add(hb, {
      reach: 1.9,
      hint: () => {
        if (m.tray) return { key: 'LMB', text: `Take the ${m.tray.name}`, sub: 'From the tray at the bottom' };
        const closed = this.closed(m);
        return { key: 'LMB', text: `${m.name} vending machine`, sub: closed || `${m.items.length} drinks · ${yen(Math.min(...m.items.map((f) => f.price)))}-${yen(Math.max(...m.items.map((f) => f.price)))}` };
      },
      use: () => { if (m.tray) this.takeTray(m); else this.open(m); return false; },
    });
    this.list.push(m);
    this.draw(m);
    // a can left in the tray from before
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
  /** The panel pixel (px, py) as a point on the machine (world). */
  pixelAt(m, px, py) {
    const x = WIN.x0 + (px / TW) * (WIN.x1 - WIN.x0), y = WIN.y1 - (py / TH) * (WIN.y1 - WIN.y0);
    return this.local(m, x, y, WIN.z);
  }

  // ------------------------------------------------------------------ the panel
  draw(m) {
    const sel = this.cur === m ? this.sel : -1, mode = this.cur === m ? this.mode : 'grid';
    const closed = this.closed(m);
    const blink = Math.floor((this.game.time || 0) * 3) % 2 === 0;
    m.canvas.redraw((ctx, W, H) => {
      // the lit back of the window: pale blue-grey, the shelf bands
      ctx.fillStyle = closed ? '#3a3e46' : '#dfe7ee'; ctx.fillRect(0, 0, W, H);
      // header strip: the machine's name
      ctx.fillStyle = m.night ? '#c8302a' : m.menu === 'odd' ? '#5a3a8a' : '#2a6ad8';
      ctx.fillRect(0, 0, W, 20);
      draw5(ctx, m.name.toUpperCase(), 6, 7, { s: 1, col: '#ffffff' });
      kanji(ctx, m.jp, W - 6, 4, 12, 0xffffff, { align: 'right' });
      if (mode === 'detail' || mode === 'age') { this.drawDetail(ctx, m, W, H, mode); return; }
      m.items.forEach((f, i) => {
        const c = i % COLS, r = Math.floor(i / COLS);
        const x = GX + c * CELL_W, y = GY + r * (CELL_H + 4);
        // shelf
        ctx.fillStyle = closed ? '#2e3238' : '#c8d2da'; ctx.fillRect(x - 4, y + CELL_H - 22, CELL_W, 22);
        ctx.fillStyle = closed ? '#24272c' : '#aeb8c2'; ctx.fillRect(x - 4, y + CELL_H - 22, CELL_W, 2);
        // the sample
        const sw = f.art?.shape === 'mini' ? 26 : f.art?.shape === 'cup' ? 30 : 32, shh = f.art?.shape === 'pet' ? 70 : f.art?.shape === 'tall' ? 70 : f.art?.shape === 'mini' ? 46 : f.art?.shape === 'cup' ? 40 : 56;
        if (!closed) drawSample(ctx, f, x + Math.round((CELL_W - 8 - sw) / 2), y + CELL_H - 24 - shh, sw, shh);
        else { ctx.fillStyle = '#4a4e56'; ctx.fillRect(x + Math.round((CELL_W - 8 - sw) / 2), y + CELL_H - 24 - shh, sw, shh); }
        // the hot / cold strip, the price, the push button with its lamp
        ctx.fillStyle = f.hot ? '#e8402a' : '#2a7ae0'; ctx.fillRect(x, y + CELL_H - 21, CELL_W - 12, 9);
        draw5(ctx, f.hot ? 'HOT' : 'COLD', x + 2, y + CELL_H - 20, { s: 1, col: '#ffffff' });
        paperFill(ctx, x + 15, y + CELL_H - 10, CELL_W - 27, 9, { seed: i + 11 });
        draw5(ctx, `${f.price}`, x + CELL_W - 14, y + CELL_H - 9, { s: 1, col: '#241a1e', align: 'right' });
        const on = i === sel;
        ctx.fillStyle = on ? (blink ? '#ff3a2a' : '#8a1a12') : '#f4f6f4'; ctx.fillRect(x + 1, y + CELL_H - 9, 12, 7);
        ctx.fillStyle = '#5a5e64'; ctx.fillRect(x + 1, y + CELL_H - 2, 12, 1);
        if (on) {
          // a pixel arrow over the selected one
          ctx.fillStyle = '#ffd23f';
          const ax = x + Math.round((CELL_W - 8) / 2), ay = y + 2;
          for (let k = 0; k < 4; k++) ctx.fillRect(ax - k, ay + k, k * 2 + 1, 1);
          ctx.fillStyle = '#1a1216'; ctx.fillRect(ax - 4, ay + 4, 9, 1);
        }
      });
      if (closed) { ctx.fillStyle = '#c8302a'; ctx.fillRect(W / 2 - 60, H / 2 - 24, 120, 48); kanji(ctx, '準備中', W / 2, H / 2 - 18, 16, 0xffffff, { align: 'center' }); draw5(ctx, 'FROM 16:00', W / 2, H / 2 + 6, { s: 1, col: '#ffffff', align: 'center' }); }
    });
  }

  drawDetail(ctx, m, W, H, mode) {
    const f = m.items[this.sel];
    ctx.fillStyle = '#f4f2ec'; ctx.fillRect(0, 20, W, H - 20);
    if (mode === 'age') {
      ctx.fillStyle = '#c8302a'; ctx.fillRect(10, 40, W - 20, 30);
      kanji(ctx, '年齢確認', W / 2, 46, 16, 0xffffff, { align: 'center' });
      draw5(ctx, 'AGE CHECK', W / 2, 84, { s: 2, col: '#1a1a1a', align: 'center' });
      draw5(ctx, 'ARE YOU 20 OR OVER?', W / 2, 112, { s: 1, col: '#1a1a1a', align: 'center' });
      for (const [i, x] of [[0, 40], [1, 150]]) { ctx.fillStyle = '#2a8a3a'; ctx.fillRect(x, 140, 90, 34); draw5(ctx, 'YES', x + 45, 150, { s: 2, col: '#ffffff', align: 'center' }); void i; }
      draw5(ctx, 'PRESS ANY BUTTON', W / 2, 200, { s: 1, col: '#5a5a5a', align: 'center' });
      return;
    }
    // the label unrolled on the left, the facts on a paper POP card taped up on the right
    drawLabel(ctx, f, 10, 28, 118, 186);
    paperFill(ctx, 132, 26, W - 138, 196, { border: '#b8a888', seed: this.sel + 3 });
    tapeStrip(ctx, 132 + (W - 138) / 2 - 18, 22, 36, 8);
    const x = 138;
    let y = 30;
    const line = (t, col = '#1a1a1a', s = 1) => { draw5(ctx, t, x, y, { s, col }); y += 7 * s + 4; };
    const wrap = (t, col, max = 23) => {
      const words = String(t).toUpperCase().split(' ');
      let cur = '';
      for (const w of words) { if ((cur + ' ' + w).trim().length > max) { line(cur, col); cur = w; } else cur = (cur + ' ' + w).trim(); }
      if (cur) line(cur, col);
    };
    kanji(ctx, f.jp, x, y, 12, 0x1a1a1a); y += 16;
    wrap(f.name, '#1a1a1a', 22);
    y += 2;
    ctx.fillStyle = f.hot ? '#e8402a' : '#2a7ae0'; ctx.fillRect(x, y, 40, 10);
    draw5(ctx, f.hot ? 'HOT' : 'COLD', x + 4, y + 2, { s: 1, col: '#ffffff' });
    draw5(ctx, yen(f.price), W - 8, y, { s: 2, col: '#1a1a1a', align: 'right' });
    y += 22;
    ctx.fillStyle = '#2f8a48'; draw5(ctx, '+', x, y, { s: 1, col: '#2f8a48' }); const y0 = y; x0wrap(ctx, f.pros, x + 8, y0, '#2f8a48'); y = y0 + 11 * lines(f.pros) + 4;
    draw5(ctx, '-', x, y, { s: 1, col: '#c8302a' }); x0wrap(ctx, f.cons, x + 8, y, '#c8302a'); y += 11 * lines(f.cons) + 6;
    const st = [];
    if (f.energy) st.push(`ENERGY ${f.energy > 0 ? '+' : ''}${f.energy}`);
    if (f.full) st.push(`FILLING +${f.full}`);
    if (f.drunk > 0) st.push(`ALCOHOL ${Math.round(f.drunk * 100)}`);
    for (const s of st) line(s, '#3a3a3a');
    // the bottom: the button
    const cash = this.game.wallet ? this.game.wallet.cash : 0;
    ctx.fillStyle = cash >= f.price ? '#2a8a3a' : '#8a8a8a'; ctx.fillRect(10, H - 54, W - 20, 30);
    draw5(ctx, cash >= f.price ? `INSERT ${yen(f.price)}` : 'NOT ENOUGH CASH', W / 2, H - 45, { s: 2, col: '#ffffff', align: 'center' });
    draw5(ctx, `WALLET ${yen(cash)}`, W / 2, H - 16, { s: 1, col: '#5a5a5a', align: 'center' });
    function lines(t) { return Math.max(1, Math.ceil(String(t || '').length / 20)); }
    function x0wrap(c, t, xx, yy, col) {
      const words = String(t || '').toUpperCase().split(' ');
      let cur = '', n = 0;
      for (const w of words) { if ((cur + ' ' + w).trim().length > 20) { draw5(c, cur, xx, yy + n * 11, { s: 1, col }); n++; cur = w; } else cur = (cur + ' ' + w).trim(); }
      if (cur) draw5(c, cur, xx, yy + n * 11, { s: 1, col });
    }
    void textW5;
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
  gridView(m) {
    return { pos: this.local(m, -0.08, 1.36, 1.72), look: this.local(m, -0.08, 1.33, 0.3), fov: 22 };
  }
  cellCenter(m, i) {
    const c = i % COLS, r = Math.floor(i / COLS);
    return this.pixelAt(m, GX + c * CELL_W + (CELL_W - 8) / 2, GY + r * (CELL_H + 4) + CELL_H * 0.5);
  }
  detailView(m) { return { pos: this.local(m, -0.06, 1.37, 1.36), look: this.local(m, -0.08, 1.35, 0.3), fov: 26 }; }

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
      audio.play('vendBeep', { vol: 0.4 });
      this.draw(m);
      return;
    }
    if (this.mode === 'age') { this.s.ageOk = true; this.mode = 'detail'; audio.play('vendBeep', { vol: 0.4 }); this.draw(m); return; }
    // detail: buy it
    if (isAlcohol(f.id) && !this.s.ageOk) { this.mode = 'age'; this.draw(m); audio.play('vendBeep', { vol: 0.4, f: 990 }); return; }
    if (m.tray) { audio.play('vendNo', { vol: 0.5 }); g.news('Take the one in the tray first'); return; }
    const slot = this.local(m, 0.36, 1.18, 0.38);
    if (!payCash(g, f.price, `Vending: ${f.name}`, slot)) { audio.play('vendNo', { vol: 0.5 }); this.draw(m); return; }
    m.busy = true;
    const n = Math.min(4, Math.ceil(f.price / 100));
    for (let i = 0; i < n; i++) g.tweens.wait(0.15 + i * 0.16, () => audio.play('coinInsert', { pos: slot, vol: 0.6 }));
    g.tweens.wait(0.25 + n * 0.16, () => audio.play('vendBeep', { pos: slot, vol: 0.5, f: 1568 }));
    g.tweens.wait(0.55 + n * 0.16, () => {
      audio.play('vendDrop', { pos: this.local(m, 0, 0.3, 0.3), vol: 0.9 });
      g.player.shake = Math.max(g.player.shake, 0.25);
      this.dropCan(m, f);
      this.s.bought++;
      this.mode = 'tray';
      this.pm.view({ pos: this.local(m, -0.12, 0.85, 0.75), look: this.local(m, -0.1, 0.18, 0.28), fov: 18 });
      m.busy = false;
      this.draw(m);
      g.events.emit('bought', { at: 'vending', id: f.id, price: f.price });
    });
  }

  back() {
    const m = this.cur;
    if (!m) return true;
    if (this.mode === 'detail' || this.mode === 'age') { this.mode = 'grid'; this.pm.view(this.gridView(m)); this.draw(m); audio.play('vendBeep', { vol: 0.25, f: 880 }); return false; }
    const c = m; this.cur = null; this.draw(c);
    return true;
  }

  hint() {
    const m = this.cur;
    if (!m) return null;
    const f = m.items[this.sel];
    if (this.mode === 'tray') return { key: 'LMB', text: `Take the ${m.tray?.name || 'drink'}`, sub: 'Clunk!' };
    if (this.closed(m)) return { key: 'RMB', text: 'Step back', sub: this.closed(m) };
    if (this.mode === 'age') return { key: 'LMB', text: 'Press YES', sub: 'There is no NO button' };
    if (this.mode === 'detail') return { key: 'LMB', text: `Insert ${yen(f.price)}`, sub: `${f.name} · RMB back to the line-up` };
    return { key: 'LMB', text: `Look closer: ${f.name}  ${yen(f.price)}`, sub: 'Move the mouse or WASD to choose · RMB step back' };
  }

  // ------------------------------------------------------------------ the tray
  dropCan(m, f, instant = false) {
    const can = propMesh(f.prop, { castShadow: false });
    const p = OUTLET.clone();
    can.position.copy(p).add(V(0, instant ? 0 : 0.18, 0));
    can.rotation.set(0, 0.2, Math.PI / 2);
    m.root.add(can);
    m.tray = { food: f, mesh: can, name: f.name };
    this.s.tray[m.id] = f.id;
    if (!instant) this.game.tweens.add({ dur: 0.22, update: (k) => { can.position.y = p.y + 0.18 * (1 - k * k); } });
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

  update(dt) {
    // the selection lamp blinks; the beer machine wakes up in the evening; the panel is dimmer in daylight
    this.blinkT = (this.blinkT || 0) - dt;
    if (this.cur && this.blinkT <= 0) { this.blinkT = 0.33; this.draw(this.cur); }
    this.lightT = (this.lightT || 0) - dt;
    if (this.lightT <= 0) {
      this.lightT = 5;
      const day = this.game.clock?.daylight?.() ?? 1;
      for (const m of this.list) {
        const k = 0.78 + 0.18 * (1 - day);
        m.mat.color.setScalar(k);
        const c = !!this.closed(m);
        if (c !== m.wasClosed) { m.wasClosed = c; this.draw(m); }
      }
    }
  }
}
export { SPOTS as VENDING_SPOTS, pick as _pick };
