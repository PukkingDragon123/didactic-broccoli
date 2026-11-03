// The Shinkin Bank ATM kiosk across the lane (beside the vending machines). First person: walk up, put your card in
// the slot, type your PIN on the keypad (click the keys or use the number keys + Enter / Backspace), pick a soft key
// beside the screen. Withdraw: the note counter whirrs, the tray shutter opens and real notes stick out: take them and
// they are counted into your wallet. Deposit: notes from your wallet go into the tray and onto your account. Balance,
// paying bills, receipts from the printer, your card back at the end. Fees outside banking hours (¥110).
//   new Atm(game, { x, z, rotY })   atm.busy (a session is running), atm.root
// The screen is a 128 x 80 pixel canvas (5 x 7 bitmap font) redrawn only when something changes.
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { propMesh } from '../world/props.js';
import { draw5 } from '../gfx/font5x7.js';
import { formatYen } from '../core/util.js';
import { noteStack, cashInHand, payOut, splitCash } from './cashfx.js';
import './sfx.js';

const SW = 128, SH = 80;
const KEY_Y = [1.13, 1.075, 1.02, 0.965]; // soft keys (local y), top to bottom
const ROW_Y = KEY_Y.map((y) => Math.round((1.2 - y) / 0.28 * SH)); // the matching screen rows
const COL = { bg: '#14305e', bg2: '#1c3f78', bar: '#0c1c3a', ink: '#f4f0e0', dim: '#8ea6cc', hi: '#ffd23f', ok: '#7ae8a0', bad: '#ff7a6a' };
const fmt = (n) => '¥' + Math.round(n).toLocaleString('en-US');
const MAX_TX = 200000;

/** A pixel credit-card texture: the shop's Shinkin cash card. */
function cardTexture() {
  const c = document.createElement('canvas');
  c.width = 32; c.height = 20;
  const g = c.getContext('2d');
  g.fillStyle = '#2f8a5a'; g.fillRect(0, 0, 32, 20);
  g.fillStyle = '#58c06c'; g.fillRect(0, 13, 32, 3);
  g.fillStyle = '#e8c860'; g.fillRect(4, 5, 6, 5);
  g.fillStyle = '#b8902a'; g.fillRect(4, 7, 6, 1); g.fillRect(6, 5, 1, 5);
  draw5(g, 'ATM', 14, 4, { col: '#f4f0e0' });
  g.fillStyle = '#f4f0e0'; for (let i = 0; i < 4; i++) g.fillRect(3 + i * 7, 17, 5, 1);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
  return t;
}

/** Tiny key-cap texture: a label (or digit) on a coloured cap. */
function keyTexture(label, bg = '#d8dce0', ink = '#2a2c30') {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 12;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 16, 12);
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 11, 16, 1); g.fillRect(15, 0, 1, 12);
  g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(0, 0, 16, 1);
  if (label.length <= 2) draw5(g, label, 8, 3, { col: ink, align: 'center' });
  else { g.fillStyle = ink; g.fillRect(3, 5, 10, 2); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
  return t;
}

export class Atm {
  constructor(game, { x = -1.68, z = 14.45, rotY = Math.PI } = {}) {
    this.game = game;
    const g = game;
    this.root = new THREE.Group();
    this.root.position.set(x, 0, z);
    this.root.rotation.y = rotY;
    this.root.scale.setScalar(1.18); // (the model is drawn a little small: keypad at waist height, screen at chest height)
    this.root.name = 'atm';
    g.scene.add(this.root);
    const body = propMesh('atm_kiosk', { fallbackSize: [0.76, 1.6, 0.56] });
    this.root.add(body);
    this.root.updateMatrixWorld(true);
    // collision: the cabinet and its console
    const c = Math.cos(rotY), s = Math.sin(rotY);
    const ext = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    const pts = [ext(-0.46, -0.34), ext(0.46, -0.34), ext(-0.46, 0.46), ext(0.46, 0.46)];
    const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[1]);
    g.player.addObstacle(Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs));
    g.physics.addBox({ center: new THREE.Vector3(x, 0.8, z), half: new THREE.Vector3(0.4, 0.8, 0.32), rotY, material: 'metal' });

    // ---- the screen
    this.canvas = document.createElement('canvas');
    this.canvas.width = SW; this.canvas.height = SH;
    this.ctx = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.magFilter = THREE.NearestFilter; this.tex.minFilter = THREE.LinearFilter; this.tex.generateMipmaps = false;
    const scrMat = new THREE.MeshBasicMaterial({ map: this.tex });
    scrMat.color.setScalar(0.92);
    this.screen = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.28), scrMat);
    this.screen.position.set(0, 1.06, 0.202);
    this.screen.userData.noRim = true;
    this.root.add(this.screen);

    // ---- soft keys beside the screen
    this.soft = [];
    const softMat = new THREE.MeshStandardMaterial({ color: 0xb8bec4, roughness: 0.4, metalness: 0.3 });
    const softGeo = new THREE.BoxGeometry(0.034, 0.026, 0.012);
    for (const side of [-1, 1]) KEY_Y.forEach((y, i) => {
      const k = new THREE.Mesh(softGeo, softMat);
      k.position.set(side * 0.25, y, 0.226);
      this.root.add(k);
      const id = (side < 0 ? 'L' : 'R') + (i + 1);
      k.userData.home = k.position.z;
      this.soft.push(k);
      g.interaction.add(k, { reach: 1.9, hint: () => this.softHint(id), use: () => { this.press(k); this.onSoft(id); return false; } });
    });

    // ---- the keypad on the console (12 digits / blanks + cancel, clear, enter)
    this.keys = [];
    const kgeo = new THREE.BoxGeometry(0.045, 0.012, 0.032);
    const layout = [['1', '2', '3', 'CANCEL'], ['4', '5', '6', 'CLEAR'], ['7', '8', '9', 'ENTER'], ['', '0', '', '']];
    const fcol = { CANCEL: ['#e5383b', '#fff4f0'], CLEAR: ['#ffd23f', '#2a2c30'], ENTER: ['#3fae5a', '#f4fff4'] };
    layout.forEach((row, r) => row.forEach((lab, col) => {
      if (!lab) return;
      const f = fcol[lab];
      const cap = new THREE.MeshStandardMaterial({ map: keyTexture(f ? lab : lab, f ? f[0] : '#dfe3e6', f ? f[1] : '#2a2c30'), roughness: 0.45 });
      const side = new THREE.MeshStandardMaterial({ color: f ? new THREE.Color(f[0]).multiplyScalar(0.7) : 0x9aa0a6, roughness: 0.5 });
      const k = new THREE.Mesh(kgeo, [side, side, cap, side, side, side]);
      k.position.set(-0.27 + col * 0.056 + (f ? 0.008 : 0), 0.766, 0.245 + r * 0.037);
      if (f) k.scale.x = 1.25;
      k.userData.home = k.position.y;
      k.userData.key = lab;
      this.root.add(k);
      this.keys.push(k);
      g.interaction.add(k, { reach: 1.9, hint: () => this.keyHint(lab), use: () => { this.press(k); this.onKey(lab); return false; } });
    }));

    // ---- card slot, receipt printer, cash tray (invisible click targets + their moving parts)
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    this.cardHit = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.12), hitMat);
    this.cardHit.position.set(0.21, 0.8, 0.31);
    this.root.add(this.cardHit);
    g.interaction.add(this.cardHit, { reach: 1.9, hint: () => this.cardHint(), use: () => { this.onCardSlot(); return false; } });
    const cardMat = new THREE.MeshStandardMaterial({ map: cardTexture(), roughness: 0.4 });
    this.card = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.002, 0.0856), [cardMat, cardMat, cardMat, cardMat, cardMat, cardMat]);
    this.card.visible = false;
    this.root.add(this.card);

    this.trayHit = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.2, 0.14), hitMat);
    this.trayHit.position.set(0, 0.5, 0.29);
    this.root.add(this.trayHit);
    g.interaction.add(this.trayHit, { reach: 1.9, hint: () => this.trayHint(), use: () => { this.onTray(); return false; } });
    const shutter = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.006), new THREE.MeshStandardMaterial({ color: 0x5a6066, roughness: 0.35, metalness: 0.6 }));
    shutter.geometry.translate(0, -0.07, 0);
    shutter.position.set(0, 0.6, 0.243);
    this.root.add(shutter);
    this.shutter = shutter;
    this.shutterK = 0; this.shutterWant = 0;
    this.notes = null; // the stack sticking out of the tray

    this.receiptHit = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.16), hitMat);
    this.receiptHit.position.set(0.21, 0.71, 0.42);
    this.root.add(this.receiptHit);
    g.interaction.add(this.receiptHit, { reach: 1.9, hint: () => (this.receipt?.ready ? { key: 'LMB', text: 'Take the receipt' } : null), use: () => { this.takeReceipt(); return false; } });

    g.interaction.add(this.screen, { reach: 2.2, hint: () => this.screenHint(), use: () => false });
    // the cabinet itself: what it is, and a click when idle puts your card in
    g.interaction.add(this.root, {
      reach: 2.2,
      hint: () => (this.mode === 'idle' ? this.cardHint() : this.screenHint()),
      use: () => { if (this.mode === 'idle') this.onCardSlot(); return false; },
    });

    // ---- the session
    this.mode = 'idle';
    this.entry = '';
    this.msg = null;
    this.t = 0;
    this.dirty = true;
    this.blink = 0;
    this.pending = 0; // cash sitting in the tray (withdrawals) or waiting to go in (deposits)
    this.fovZoom = 0;
    this.draw();
  }

  get S() { return this.game.wallet.s; }
  get busy() { return this.mode !== 'idle'; }
  get near() { return this.game.player.pos.distanceTo(this.root.position) < 1.8; }

  // ------------------------------------------------------------------ fees and limits
  fee() {
    const c = this.game.clock, cal = this.game.calendar;
    if (!c || !cal) return 0;
    const h = c.hours, wd = cal.dateOf(c.day).weekday;
    const holiday = (cal.dateOf(c.day).specials || []).some((x) => x.kind === 'holiday');
    return wd === 0 || wd === 6 || holiday || h < 8.75 || h >= 18 ? 110 : 0;
  }

  // ------------------------------------------------------------------ hints
  softHint(id) {
    const o = this.options()[id];
    if (!o) return this.mode === 'idle' ? { key: '', text: 'Insert your card first' } : null;
    return { key: 'LMB', text: o.label, sub: o.sub || '' };
  }
  keyHint(lab) {
    if (this.mode === 'idle') return { key: '', text: 'Insert your card first', sub: 'The card slot is on the right' };
    const name = { CANCEL: 'Cancel', CLEAR: 'Clear', ENTER: 'Enter' }[lab] || lab;
    return { key: 'LMB', text: name, sub: this.wantsDigits() ? 'Or type: number keys, Enter, Backspace' : 'Pick with the keys beside the screen' };
  }
  cardHint() {
    if (this.mode === 'idle') {
      if (this.S.atm.lockUntil > (this.game.clock?.stamp ?? 0)) return { key: '', text: 'Card locked', sub: 'Too many wrong PINs - try again later' };
      return { key: 'LMB', text: 'Insert your cash card', sub: 'Shinkin Bank ATM' };
    }
    if (this.mode === 'takeCard') return { key: 'LMB', text: 'Take your card' };
    return { key: '', text: 'Your card is in the machine' };
  }
  trayHint() {
    if (this.mode === 'takeCash') return { key: 'LMB', text: `Take your cash (${fmt(this.pending)})` };
    if (this.mode === 'insertCash') return { key: 'LMB', text: `Put ${fmt(this.pending)} in the tray`, sub: `${fmt(this.S.cash)} in your wallet` };
    return { key: '', text: 'Cash tray' };
  }
  screenHint() {
    const t = { more: 'Anything else?', receiptAsk: 'Would you like a receipt?', idle: 'Insert your card', pin: 'Enter your PIN', setpin: 'Choose a 4-digit PIN', setpin2: 'Enter the PIN again', menu: 'Choose a service', withdraw: 'How much?', other: 'Type the amount in thousands', deposit: 'How much?', confirm: 'Press OK or Enter', takeCash: 'Take your cash from the tray', insertCash: 'Put the notes in the tray', takeCard: 'Take your card', balance: 'Your balance', bills: 'Pick a bill to pay' }[this.mode];
    return t ? { key: '', text: t, sub: this.mode === 'idle' ? 'Shinkin Bank ATM' : `Fee now: ${this.fee() ? '¥110' : 'free'}` } : { key: '', text: 'Please wait...' };
  }

  wantsDigits() { return ['pin', 'setpin', 'setpin2', 'other', 'otherDep'].includes(this.mode); }

  // ------------------------------------------------------------------ the soft-key options per screen
  options() {
    const m = this.mode, o = {};
    const amt = (id, v, kind) => { o[id] = { label: fmt(v), run: () => this.choose(kind, v) }; };
    if (m === 'menu') {
      o.L1 = { label: 'Withdrawal', run: () => this.go('withdraw') };
      o.L2 = { label: 'Deposit', run: () => this.go('deposit') };
      o.R1 = { label: 'Balance', run: () => this.go('balance') };
      o.R2 = { label: 'Pay bills', sub: `${(this.game.bills?.due?.() || []).length} unpaid`, run: () => this.go('bills') };
      o.R4 = { label: 'Return card', run: () => this.eject() };
    } else if (m === 'withdraw') {
      [1000, 5000, 10000, 20000].forEach((v, i) => amt('L' + (i + 1), v, 'withdraw'));
      [30000, 50000].forEach((v, i) => amt('R' + (i + 1), v, 'withdraw'));
      o.R3 = { label: 'Other amount', run: () => { this.entry = ''; this.go('other'); } };
      o.R4 = { label: 'Back', run: () => this.go('menu') };
    } else if (m === 'deposit') {
      const notes = Math.floor(this.S.cash / 1000) * 1000;
      [1000, 5000, 10000].forEach((v, i) => amt('L' + (i + 1), v, 'deposit'));
      if (notes > 0) o.L4 = { label: `All notes`, sub: fmt(notes), run: () => this.choose('deposit', notes) };
      o.R3 = { label: 'Other amount', run: () => { this.entry = ''; this.go('otherDep'); } };
      o.R4 = { label: 'Back', run: () => this.go('menu') };
    } else if (m === 'other' || m === 'otherDep') {
      o.R4 = { label: 'Back', run: () => this.go(m === 'other' ? 'withdraw' : 'deposit') };
      o.R3 = { label: 'OK', run: () => this.onKey('ENTER') };
    } else if (m === 'confirm') {
      o.R4 = { label: 'OK', run: () => this.commit() };
      o.L4 = { label: 'Back', run: () => this.go(this.tx.kind) };
    } else if (m === 'balance') {
      o.R3 = { label: 'Print receipt', run: () => { this.print({ title: 'BALANCE', lines: [['BALANCE', fmt(this.S.bank)]] }); } };
      o.R4 = { label: 'Return card', run: () => this.eject() };
      o.L4 = { label: 'Back', run: () => this.go('menu') };
    } else if (m === 'bills') {
      const due = (this.game.bills?.due?.() || []).slice(0, 3);
      due.forEach((b, i) => { o['L' + (i + 1)] = { label: `${b.name}`, sub: `${fmt(b.amount)} due ${this.game.calendar?.format?.(b.due) || ''}`, run: () => this.payBill(b) }; });
      o.L4 = { label: 'Back', run: () => this.go('menu') };
    } else if (m === 'receiptAsk') {
      o.R3 = { label: 'Receipt', run: () => { this.print(this.lastReceipt); this.after(); } };
      o.R4 = { label: 'No receipt', run: () => this.after() };
    } else if (m === 'more') {
      o.R3 = { label: 'More services', run: () => this.go('menu') };
      o.R4 = { label: 'Return card', run: () => this.eject() };
    }
    return o;
  }

  // ------------------------------------------------------------------ input
  press(k) {
    audio.play('atmKey', { pos: k.getWorldPosition(new THREE.Vector3()), vol: 0.6 });
    const home = k.userData.home;
    const down = (v) => { if (k.userData.key !== undefined) k.position.y = home - v; else k.position.z = home - v; };
    this.game.tweens.add({ dur: 0.16, update: (q) => down(Math.sin(q * Math.PI) * 0.004), done: () => down(0) });
  }

  onSoft(id) {
    const o = this.options()[id];
    if (!o) { audio.play('atmBeep', { pos: this.screenPos(), f: 900, vol: 0.5 }); return; }
    o.run();
  }

  onKey(lab) {
    if (this.mode === 'idle') return;
    if (lab === 'CANCEL') { if (['pin', 'setpin', 'setpin2', 'menu', 'more'].includes(this.mode)) this.eject(); else if (this.mode !== 'takeCash' && this.mode !== 'takeCard' && this.mode !== 'busy') this.go('menu'); return; }
    if (lab === 'CLEAR') { this.entry = this.entry.slice(0, -1); this.dirty = true; return; }
    if (lab === 'ENTER') { this.enter(); return; }
    if (!/^\d$/.test(lab) || !this.wantsDigits()) return;
    const max = this.mode === 'other' || this.mode === 'otherDep' ? 3 : 4;
    if (this.entry.length < max) this.entry += lab;
    this.dirty = true;
  }

  enter() {
    const m = this.mode, S = this.S;
    if (m === 'confirm') { this.commit(); return; }
    if (m === 'pin') {
      if (this.entry.length < 4) return this.error('Enter 4 digits');
      if (this.entry === S.pin) { S.atm.tries = 0; audio.play('atmOk', { pos: this.screenPos() }); this.go('menu'); return; }
      S.atm.tries = (S.atm.tries || 0) + 1;
      this.entry = '';
      if (S.atm.tries >= 3) {
        S.atm.tries = 0;
        S.atm.lockUntil = (this.game.clock?.stamp ?? 0) + 60;
        this.flash('Wrong PIN 3 times. Card locked for an hour.', COL.bad);
        this.game.tweens.wait(1.8, () => this.eject());
        return;
      }
      this.error(`Wrong PIN - ${3 - S.atm.tries} tries left`);
      return;
    }
    if (m === 'setpin') { if (this.entry.length < 4) return this.error('4 digits please'); this.newPin = this.entry; this.entry = ''; this.go('setpin2'); return; }
    if (m === 'setpin2') {
      if (this.entry !== this.newPin) { this.entry = ''; this.newPin = null; this.go('setpin'); this.error("PINs don't match"); return; }
      S.pin = this.newPin; this.newPin = null; this.entry = '';
      audio.play('atmOk', { pos: this.screenPos() });
      this.flash('PIN set. Remember it!', COL.ok);
      this.game.tweens.wait(1.2, () => { if (this.mode === 'setpin2') this.go('menu'); });
      return;
    }
    if (m === 'other' || m === 'otherDep') {
      const v = (+this.entry || 0) * 1000;
      if (!v) return this.error('Type an amount');
      this.choose(m === 'other' ? 'withdraw' : 'deposit', v);
    }
  }

  // ------------------------------------------------------------------ the card
  onCardSlot() {
    const g = this.game;
    if (this.mode === 'takeCard') { this.takeCard(); return; }
    if (this.mode !== 'idle') return;
    if (this.S.atm.lockUntil > (g.clock?.stamp ?? 0)) { audio.play('atmError', { pos: this.screenPos() }); this.flash('Card locked. Try later.', COL.bad); return; }
    this.startSession();
    // the card slides in from your hand
    const card = this.card;
    card.visible = true;
    const from = this.root.worldToLocal(g.camera.localToWorld(new THREE.Vector3(0.12, -0.2, -0.35)));
    const mid = new THREE.Vector3(0.21, 0.79, 0.38), end = new THREE.Vector3(0.21, 0.79, 0.27);
    g.tweens.add({ dur: 0.35, update: (k) => card.position.lerpVectors(from, mid, k * (2 - k)), done: () => {
      audio.play('cardIn', { pos: this.cardPos() });
      g.tweens.add({ dur: 0.45, update: (k) => card.position.lerpVectors(mid, end, k), done: () => { card.visible = false; } });
    } });
    this.mode = 'busy';
    this.msg = { text: 'Reading card...', col: COL.dim };
    this.dirty = true;
    g.tweens.wait(1.1, () => {
      audio.play('atmBeep', { pos: this.screenPos() });
      this.msg = null;
      this.entry = '';
      this.go(this.S.pin ? 'pin' : 'setpin');
    });
  }

  eject() {
    const g = this.game;
    if (this.mode === 'idle' || this.mode === 'takeCard') return;
    this.mode = 'takeCard';
    this.entry = '';
    this.dirty = true;
    audio.play('cardOut', { pos: this.cardPos() });
    const card = this.card;
    card.visible = true;
    const a = new THREE.Vector3(0.21, 0.79, 0.27), b = new THREE.Vector3(0.21, 0.79, 0.345);
    g.tweens.add({ dur: 0.4, update: (k) => card.position.lerpVectors(a, b, k) });
    this.beepT = 0.6;
  }

  takeCard() {
    const g = this.game, card = this.card;
    if (this.mode !== 'takeCard') return;
    const from = card.position.clone();
    const to = this.root.worldToLocal(g.camera.localToWorld(new THREE.Vector3(0.1, -0.22, -0.3)));
    audio.play('pickup', { vol: 0.5 });
    g.tweens.add({ dur: 0.3, update: (k) => card.position.lerpVectors(from, to, k), done: () => { card.visible = false; } });
    this.endSession();
    this.flash('Thank you!', COL.ok, 2.5);
  }

  startSession() {
    const g = this.game;
    this.session = true;
    g.inputGate && (g.inputGate.keys.add('KeyQ'));
    // step up to the machine and look at the screen
    const front = this.root.localToWorld(new THREE.Vector3(0, 0, 0.78));
    const P = g.player, p0 = P.pos.clone(), y0 = P.yaw, pi0 = P.pitch;
    const yaw = Math.atan2(-(this.root.position.x - front.x), -(this.root.position.z - front.z));
    let dy = yaw - y0; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    g.tweens.add({ dur: 0.45, update: (k) => {
      const e = k * k * (3 - 2 * k);
      P.pos.set(p0.x + (front.x - p0.x) * e, 0, p0.z + (front.z - p0.z) * e);
      P.yaw = y0 + dy * e; P.pitch = pi0 + (-0.5 - pi0) * e;
    } });
  }

  endSession() {
    const g = this.game;
    this.session = false;
    g.inputGate?.keys.delete('KeyQ');
    this.mode = 'idle';
    this.entry = '';
    this.tx = null;
    this.dirty = true;
    g.save();
  }

  /** You walked off mid-session: cash goes back to the account, the card back into your pocket. */
  abandon() {
    const g = this.game;
    if (this.mode === 'takeCash' && this.pending > 0) { this.S.bank += this.pending; this.game.wallet.record(this.pending, 'ATM: cash not taken, returned'); this.pending = 0; this.clearNotes(); this.shutterWant = 0; }
    if (this.mode === 'insertCash') { this.pending = 0; this.shutterWant = 0; }
    this.card.visible = false;
    g.news('You took your card back', 'The ATM cancelled the transaction');
    audio.play('atmError', { pos: this.screenPos(), vol: 0.6 });
    this.endSession();
  }

  // ------------------------------------------------------------------ transactions
  go(mode) { this.mode = mode; this.msg = null; this.dirty = true; if (mode === 'menu') this.entry = ''; audio.play('atmBeep', { pos: this.screenPos(), f: 1320, dur: 0.05, vol: 0.5 }); }

  choose(kind, v) {
    const S = this.S, fee = this.fee();
    if (v > MAX_TX) return this.error(`Limit ${fmt(MAX_TX)} per withdrawal`);
    if (kind === 'withdraw' && S.bank < v + fee) return this.error('Insufficient funds');
    if (kind === 'deposit' && S.cash < v) return this.error(`You only have ${fmt(S.cash)}`);
    if (kind === 'deposit' && v % 1000) return this.error('Notes only (¥1,000s)');
    this.tx = { kind, v, fee };
    this.go('confirm');
  }

  commit() {
    const g = this.game, tx = this.tx, S = this.S;
    if (!tx) return;
    if (tx.kind === 'withdraw') {
      if (S.bank < tx.v + tx.fee) return this.error('Insufficient funds');
      g.wallet.takeBank(tx.v, 'ATM withdrawal');
      if (tx.fee) g.wallet.takeBank(tx.fee, 'ATM fee');
      this.busyMsg('Counting your notes...', () => {
        this.pending = tx.v;
        this.mode = 'takeCash';
        this.dirty = true;
        this.shutterWant = 1;
        audio.play('atmShutter', { pos: this.trayPos(), open: true });
        this.showNotes(tx.v);
        this.lastReceipt = { title: 'WITHDRAWAL', lines: [['AMOUNT', fmt(tx.v)], ['FEE', fmt(tx.fee)], ['BALANCE', fmt(S.bank)]] };
        this.waitT = 30;
      }, splitCash(tx.v).notes.length);
    } else {
      this.pending = tx.v;
      this.mode = 'insertCash';
      this.dirty = true;
      this.shutterWant = 1;
      audio.play('atmShutter', { pos: this.trayPos(), open: true });
      this.waitT = 40;
    }
  }

  busyMsg(text, then, n = 10) {
    this.mode = 'busy';
    this.msg = { text, col: COL.ink };
    this.dirty = true;
    audio.play('atmWhirr', { pos: this.trayPos(), n: Math.min(30, 6 + n * 2) });
    this.game.tweens.wait(0.6 + Math.min(30, 6 + n * 2) * 0.075, () => { this.msg = null; then(); });
  }

  onTray() {
    const g = this.game;
    if (this.mode === 'takeCash' && this.pending > 0) {
      const v = this.pending;
      this.pending = 0;
      const from = this.trayPos();
      this.clearNotes();
      cashInHand(g, v, { from, label: 'From the ATM, into your wallet' });
      this.shutterWant = 0;
      g.tweens.wait(0.5, () => audio.play('atmShutter', { pos: this.trayPos(), open: false }));
      g.events.emit('atm', { kind: 'withdraw', amount: v });
      this.mode = 'receiptAsk';
      this.dirty = true;
      return;
    }
    if (this.mode === 'insertCash' && this.pending > 0) {
      const v = this.pending, S = this.S;
      if (S.cash < v) { this.error('Not enough cash'); this.shutterWant = 0; this.go('deposit'); return; }
      g.wallet.takeCash(v);
      g.updateMoney(false, -v);
      payOut(g, v, this.trayPos());
      this.pending = 0;
      this.shutterWant = 0;
      g.tweens.wait(0.45, () => audio.play('atmShutter', { pos: this.trayPos(), open: false }));
      const tx = this.tx;
      this.busyMsg('Counting...', () => {
        S.bank += v;
        g.wallet.record(v, 'ATM deposit');
        if (tx?.fee) { S.bank = Math.max(0, S.bank - tx.fee); g.wallet.record(-tx.fee, 'ATM fee'); }
        g.wallet.emit('deposit', v);
        audio.play('atmOk', { pos: this.screenPos() });
        g.events.emit('atm', { kind: 'deposit', amount: v });
        this.lastReceipt = { title: 'DEPOSIT', lines: [['AMOUNT', fmt(v)], ['FEE', fmt(tx?.fee || 0)], ['BALANCE', fmt(S.bank)]] };
        this.mode = 'receiptAsk';
        this.dirty = true;
      }, Math.ceil(v / 1000));
    }
  }

  payBill(b) {
    const g = this.game;
    const r = g.bills?.pay?.(b.id) || { ok: false, msg: 'Could not pay' };
    if (!r.ok) return this.error(/money/i.test(r.msg || '') ? 'Insufficient funds' : (r.msg || 'Error'));
    audio.play('atmOk', { pos: this.screenPos() });
    this.lastReceipt = { title: 'BILL PAYMENT', lines: [[String(b.name).toUpperCase().slice(0, 12), fmt(b.amount)], ['BALANCE', fmt(this.S.bank)]] };
    this.mode = 'receiptAsk';
    this.dirty = true;
  }

  after() { this.go('more'); }

  error(text) {
    audio.play('atmError', { pos: this.screenPos() });
    this.flash(text, COL.bad);
  }
  flash(text, col = COL.ink, sec = 1.8) { this.msg = { text, col, until: this.t + sec }; this.dirty = true; }

  // ------------------------------------------------------------------ notes in the tray, the receipt
  showNotes(v) {
    this.clearNotes();
    const st = noteStack(v, { max: 10 });
    st.rotation.y = Math.PI / 2;
    st.position.set(0, 0.452, 0.2);
    this.root.add(st);
    this.notes = st;
    const z0 = 0.2;
    this.game.tweens.add({ delay: 0.25, dur: 0.5, update: (k) => { st.position.z = z0 + 0.075 * k; } });
  }
  clearNotes() { if (this.notes) { this.notes.parent?.remove(this.notes); this.notes = null; } }

  print(rec) {
    const g = this.game;
    if (!rec) return;
    if (this.receipt?.mesh) this.receipt.mesh.parent?.remove(this.receipt.mesh);
    const c = document.createElement('canvas');
    c.width = 40; c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = '#f6f2e8'; x.fillRect(0, 0, 40, 64);
    x.fillStyle = '#2a5aa8'; x.fillRect(0, 0, 40, 6);
    draw5(x, 'SHINKIN', 20, 9, { col: '#2a2c30', align: 'center' });
    draw5(x, rec.title.slice(0, 7), 20, 19, { col: '#2a2c30', align: 'center' });
    let y = 30;
    for (const [k, v] of rec.lines.slice(0, 3)) { x.fillStyle = '#8a8e92'; x.fillRect(2, y - 2, 36, 1); draw5(x, v.replace('¥', '¥'), 38, y, { col: '#2a2c30', align: 'right' }); y += 11; void k; }
    draw5(x, (g.calendar?.format?.() || '').toUpperCase().slice(0, 7), 20, 56, { col: '#8a8e92', align: 'center' });
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.08), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2 + 0.25;
    m.position.set(0.21, 0.712, 0.36);
    this.root.add(m);
    this.receipt = { mesh: m, ready: false, rec, canvas: c };
    audio.play('receiptPrint', { pos: this.cardPos() });
    g.tweens.add({ dur: 1.0, update: (k) => { m.position.z = 0.36 + 0.05 * k; m.position.y = 0.712 - 0.012 * k * k; }, done: () => { this.receipt.ready = true; } });
  }

  takeReceipt() {
    const g = this.game, r = this.receipt;
    if (!r?.ready) return;
    r.mesh.parent?.remove(r.mesh);
    this.receipt = null;
    audio.play('notePaper', { vol: 0.6 });
    // a readable copy in the corner for a few seconds, then it's in your pocket
    const el = document.createElement('div');
    el.className = 'atm-receipt';
    const big = document.createElement('canvas');
    big.width = 160; big.height = 256;
    const bx = big.getContext('2d');
    bx.imageSmoothingEnabled = false;
    bx.drawImage(r.canvas, 0, 0, 160, 256);
    el.appendChild(big);
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 3800);
    g.events.emit('receipt', r.rec);
  }

  // ------------------------------------------------------------------ positions
  screenPos() { return this.screen.getWorldPosition(new THREE.Vector3()); }
  cardPos() { return this.root.localToWorld(new THREE.Vector3(0.21, 0.79, 0.32)); }
  trayPos() { return this.root.localToWorld(new THREE.Vector3(0, 0.47, 0.3)); }

  // ------------------------------------------------------------------ per frame
  update(dt) {
    const g = this.game;
    this.t += dt;
    const P = g.player.pos;
    const dist = Math.hypot(P.x - this.root.position.x, P.z - this.root.position.z);
    if (dist > 14) return; // out of sight: nothing to animate
    // the tray shutter
    if (Math.abs(this.shutterK - this.shutterWant) > 0.001) {
      this.shutterK += Math.sign(this.shutterWant - this.shutterK) * Math.min(Math.abs(this.shutterWant - this.shutterK), dt * 4);
      this.shutter.scale.y = Math.max(0.04, 1 - this.shutterK);
    }
    // number keys while a PIN or an amount is wanted
    const gate = g.inputGate;
    const wants = this.session && this.wantsDigits() && dist < 2;
    if (gate) gate.digits = wants;
    if (this.session && g.input.locked) {
      const inp = g.input;
      if (wants) {
        for (let i = 0; i <= 9; i++) if (inp.keyPressed('Digit' + i) || inp.keyPressed('Numpad' + i)) { this.pressKey(String(i)); }
        if (inp.keyPressed('Backspace')) this.pressKey('CLEAR');
      }
      if (inp.keyPressed('Enter') || inp.keyPressed('NumpadEnter')) this.pressKey('ENTER');
      if (dist > 2.4 && this.mode !== 'busy') this.abandon();
    }
    // zoom in a little while you use it
    const want = this.session && dist < 1.5 ? 1 : 0;
    if (want || this.fovZoom > 0) {
      this.fovZoom += (want - this.fovZoom) * Math.min(1, dt * 5);
      if (!want && this.fovZoom < 0.003) this.fovZoom = 0;
      g.player.baseFov = (g.state.settings.fov || 72) - 22 * this.fovZoom;
    }
    // waiting for you
    if (this.mode === 'takeCard') { this.beepT -= dt; if (this.beepT <= 0) { this.beepT = 1.4; audio.play('atmBeep', { pos: this.cardPos(), vol: 0.5 }); } }
    if (this.mode === 'takeCash' || this.mode === 'insertCash') {
      this.waitT -= dt;
      this.beepT = (this.beepT ?? 1) - dt;
      if (this.beepT <= 0) { this.beepT = 2; audio.play('atmBeep', { pos: this.trayPos(), f: 1100, vol: 0.45 }); }
      if (this.waitT <= 0) {
        if (this.mode === 'takeCash') { this.S.bank += this.pending; g.wallet.record(this.pending, 'ATM: cash not taken, returned'); this.clearNotes(); }
        this.pending = 0; this.shutterWant = 0;
        audio.play('atmShutter', { pos: this.trayPos(), open: false });
        this.flash('Timed out', COL.bad);
        this.go('menu');
      }
    }
    if (this.msg?.until && this.t > this.msg.until) { this.msg = null; this.dirty = true; }
    // blink the prompts twice a second
    const b = Math.floor(this.t * 2) % 2;
    if (b !== this.blink) { this.blink = b; this.dirty = true; }
    if (this.dirty && dist < 10) this.draw();
  }

  pressKey(lab) { const k = this.keys.find((q) => q.userData.key === lab); if (k) this.press(k); this.onKey(lab); }

  // ------------------------------------------------------------------ the screen
  draw() {
    this.dirty = false;
    const x = this.ctx, m = this.mode, S = this.S, o = this.options();
    const R = (a, b, w, h, c) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
    const T = (s, a, b, c = COL.ink, al = 'left') => draw5(x, s, a, b, { col: c, align: al });
    R(0, 0, SW, SH, COL.bg);
    for (let yy = 12; yy < SH; yy += 4) R(0, yy, SW, 1, COL.bg2); // scanline stripes
    R(0, 0, SW, 11, COL.bar);
    T('SHINKIN BANK', 3, 2, COL.ink);
    T(this.game.clock?.time || '', SW - 3, 2, COL.dim, 'right');
    // soft-key labels at their rows
    for (const [id, opt] of Object.entries(o)) {
      const row = ROW_Y[+id[1] - 1] - 3, left = id[0] === 'L';
      const lab = opt.label.toUpperCase().slice(0, 13);
      if (left) { R(0, row - 1, 3, 9, COL.hi); T(lab, 5, row, COL.ink); }
      else { R(SW - 3, row - 1, 3, 9, COL.hi); T(lab, SW - 5, row, COL.ink, 'right'); }
    }
    const mid = (s, y, c) => T(s, SW / 2, y, c, 'center');
    if (m === 'idle') {
      mid('WELCOME', 18, COL.hi);
      mid('INSERT YOUR CARD', 34, this.blink ? COL.ink : COL.dim);
      // an arrow to the card slot (bottom right)
      if (this.blink) { R(100, 56, 14, 3, COL.hi); R(110, 52, 3, 11, COL.hi); R(113, 54, 2, 7, COL.hi); }
      T(this.fee() ? 'FEE NOW ¥110' : 'NO FEE NOW', 4, 68, COL.dim);
    } else if (m === 'pin' || m === 'setpin' || m === 'setpin2') {
      mid(m === 'pin' ? 'ENTER YOUR PIN' : m === 'setpin' ? 'CHOOSE A NEW PIN' : 'ENTER IT AGAIN', 20, COL.hi);
      R(34, 36, 60, 13, COL.bar);
      for (let i = 0; i < 4; i++) { const on = i < this.entry.length; R(40 + i * 13, 40, 7, 6, on ? COL.ink : COL.bg2); }
      mid('PRESS ENTER', 58, this.blink ? COL.dim : COL.bg2);
    } else if (m === 'menu') {
      mid('PLEASE CHOOSE', 44, COL.dim);
    } else if (m === 'withdraw' || m === 'deposit') {
      mid(m === 'withdraw' ? 'WITHDRAWAL' : 'DEPOSIT', 44, COL.hi);
      if (m === 'deposit') mid(`WALLET ${fmt(S.cash)}`, 54, COL.dim);
    } else if (m === 'other' || m === 'otherDep') {
      mid(m === 'other' ? 'WITHDRAW HOW MUCH?' : 'DEPOSIT HOW MUCH?', 16, COL.hi);
      R(22, 32, 84, 13, COL.bar);
      T('¥' + (this.entry || '').padStart(3, ' ') + ',000', 64, 35, this.blink || this.entry ? COL.ink : COL.dim, 'center');
      mid('IN THOUSANDS', 52, COL.dim);
    } else if (m === 'confirm') {
      const tx = this.tx;
      mid(tx.kind === 'withdraw' ? 'WITHDRAW' : 'DEPOSIT', 16, COL.hi);
      mid(fmt(tx.v), 30, COL.ink);
      mid(`FEE ${fmt(tx.fee)}`, 42, COL.dim);
      mid('IS THIS RIGHT?', 56, COL.ink);
    } else if (m === 'takeCash') {
      mid('PLEASE TAKE', 22, COL.hi);
      mid('YOUR CASH', 32, COL.hi);
      if (this.blink) { R(58, 50, 12, 3, COL.ink); R(62, 53, 4, 6, COL.ink); }
      mid(fmt(this.pending), 64, COL.ink);
    } else if (m === 'insertCash') {
      mid('PUT YOUR NOTES', 22, COL.hi);
      mid('IN THE TRAY', 32, COL.hi);
      mid(fmt(this.pending), 46, COL.ink);
      if (this.blink) { R(58, 58, 12, 3, COL.ink); R(62, 61, 4, 6, COL.ink); }
    } else if (m === 'balance') {
      mid('BALANCE', 18, COL.dim);
      mid(fmt(S.bank), 30, COL.hi);
      mid('AVAILABLE', 42, COL.dim);
    } else if (m === 'bills') {
      if (!Object.keys(o).some((k) => k[0] === 'L' && k !== 'L4')) mid('NOTHING TO PAY', 36, COL.ok);
    } else if (m === 'receiptAsk') {
      mid('DONE!', 18, COL.ok);
      mid('A RECEIPT?', 34, COL.ink);
    } else if (m === 'more') {
      mid('ANYTHING ELSE?', 30, COL.ink);
    } else if (m === 'takeCard') {
      mid('PLEASE TAKE', 26, COL.hi);
      mid('YOUR CARD', 36, COL.hi);
      if (this.blink) { R(100, 56, 14, 3, COL.ink); R(110, 52, 3, 11, COL.ink); }
    }
    if (this.msg) {
      R(6, 26, SW - 12, 26, COL.bar);
      R(6, 26, SW - 12, 1, this.msg.col); R(6, 51, SW - 12, 1, this.msg.col);
      const words = this.msg.text.toUpperCase().split(' ');
      const lines = [];
      let cur = '';
      for (const w of words) { if ((cur + ' ' + w).trim().length > 19) { lines.push(cur.trim()); cur = w; } else cur += ' ' + w; }
      lines.push(cur.trim());
      lines.slice(0, 2).forEach((l, i) => mid(l, lines.length > 1 ? 30 + i * 10 : 35, this.msg.col));
    }
    this.tex.needsUpdate = true;
  }
}
