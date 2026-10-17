// ガチャマート E-MART — the retro Japanese shopping website on the garage PC.
import { UI, W, H, FJ, FE, COL, SPR, yen } from './ui.js';
import { SERIES, SERIES_BY_ID, ITEMS, getItem } from '../data/series/index.js';
import { RARITIES } from '../data/rarity.js';
import { FINISHES } from '../data/finishes.js';
import {
  MACHINE_TYPES, MACHINE_ORDER, MAX_MACHINES, machinePrice, UPGRADES, upgradeCost, capsuleCost, licensePrice,
  licenseRequirement, OPENERS, CHARMS, SHELF_PRICES, singlePrice, itemValue, capacityFor, crankTime,
  MUSEUM_PRICE, MUSEUM_REQ_COMPLETE, MUSEUM_EXPANSIONS,
} from '../game/economy.js';
import * as shop from '../game/shop.js';
import { buildMachineModel } from '../world/machineModels.js';
import { propMesh } from '../world/props.js';
import { DISPLAYS, FLOORS, WALLS, decorList, THEME_NAMES } from '../museum/catalog.js';
import { audio } from '../core/audio.js';
import { SHELF_SLOTS } from '../world/Garage.js';

const PAGES = [
  ['top', 'トップ', 'TOP'], ['machines', 'マシン', 'MACHINES'], ['refill', '補充', 'CAPSULES'], ['upgrade', '改造', 'UPGRADES'],
  ['tools', '道具', 'TOOLS'], ['museum', '博物館', 'MUSEUM'], ['used', '中古', 'USED'], ['sell', '買取', 'SELL'], ['book', '図鑑', 'BOOK'],
];
const X0 = 132, CW = 500, Y0 = 94, Y1 = 456;
const hex = (s) => s;

export class Site {
  constructor(game, canvas) {
    this.game = game;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ui = new UI(this.ctx);
    this.page = 'top';
    this.scroll = {};
    this.contentH = {};
    this.flash = null;
    this.t = 0;
    this.mouse = { x: W / 2, y: H / 2 };
    this.thumbCache = new Map();
    this.sub = { used: null, book: null, museum: 'displays' };
    this.counter = 12345 + Math.floor(Math.random() * 500);
    this.booted = false;
    this.bootT = 0;
  }

  // ------------------------------------------------------------------ thumbs
  itemThumb(key, size = 48, sil = false, finish = 'normal') { return this.game.thumbs.item(key, { size, silhouette: sil, finish }); }
  machineThumb(type) {
    const k = 'm:' + type;
    if (!this.thumbCache.has(k)) {
      const { group } = buildMachineModel(type);
      this.thumbCache.set(k, this.game.thumbs.renderObject(group, 80, { side: 0.6, up: 0.15 }));
    }
    return this.thumbCache.get(k);
  }
  propThumb(id) {
    const k = 'p:' + id;
    if (!this.thumbCache.has(k)) {
      const m = propMesh(id);
      this.thumbCache.set(k, this.game.thumbs.renderObject(m, 64, { side: 0.6, up: 0.3 }));
    }
    return this.thumbCache.get(k);
  }
  displayThumb(id) {
    const k = 'd:' + id;
    if (!this.thumbCache.has(k) && this.game.museum?.displayPreview) {
      this.thumbCache.set(k, this.game.thumbs.renderObject(this.game.museum.displayPreview(id), 64, { side: 0.6, up: 0.35 }));
    }
    return this.thumbCache.get(k);
  }

  go(page) {
    if (this.page !== page) { audio.play('uiClick', { vol: 0.6 }); audio.play('uiBeep', { f: 990, vol: 0.5 }); }
    this.page = page;
    this.scroll[page] = 0;
  }

  notify(res) {
    if (!res) return;
    this.flash = { ok: res.ok, msg: res.msg, t: 1.6 };
    if (res.ok) audio.play('purchase', { vol: 0.8 }); else audio.play('error', { vol: 0.6 });
  }

  wheel(d) {
    const p = this.page;
    const max = Math.max(0, (this.contentH[p] || 0) - (Y1 - Y0));
    this.scroll[p] = Math.max(0, Math.min(max, (this.scroll[p] || 0) + d * 36));
  }

  click() {
    if (this.flash && this.flash.t > 0.3) { this.flash.t = 0.3; return; }
    const r = this.ui.click(this.mouse.x, this.mouse.y);
    audio.play('uiClick', { vol: 0.5 });
    if (r === 'disabled') audio.play('error', { vol: 0.35 });
  }

  // ------------------------------------------------------------------ frame
  draw(dt, active) {
    this.t += dt;
    const ui = this.ui;
    const g = this.ctx;
    g.setTransform(this.canvas.width / W, 0, 0, this.canvas.height / H, 0, 0);
    g.imageSmoothingEnabled = false;
    if (!active) { this.drawScreensaver(dt); return; }
    if (!this.booted) {
      this.bootT += dt;
      this.drawBoot();
      if (this.bootT > 1.6) this.booted = true;
      return;
    }
    ui.begin(this.mouse, this.t);
    this.drawChrome();
    // main content
    const sy = this.scroll[this.page] || 0;
    ui.setClip(X0 - 4, Y0, CW + 8, Y1 - Y0);
    const h = (this[`page_${this.page}`]?.(X0, Y0 + 6 - sy, CW) || 0) + 12;
    ui.endClip();
    this.contentH[this.page] = h;
    // scrollbar
    if (h > Y1 - Y0) {
      ui.bevel(W - 6, Y0, 6, Y1 - Y0, '#e8e2d4', true);
      const th = Math.max(20, ((Y1 - Y0) * (Y1 - Y0)) / h);
      const ty = Y0 + (sy / (h - (Y1 - Y0))) * (Y1 - Y0 - th);
      ui.bevel(W - 6, ty, 6, th, '#c8c0b0');
    }
    this.drawFlash(dt);
    this.drawCursor();
  }

  drawChrome() {
    const ui = this.ui, s = this.game.state;
    ui.rect(0, 0, W, H, COL.bg);
    // header
    for (let y = 0; y < 52; y += 2) ui.rect(0, y, W, 2, y % 4 ? '#ff7a9a' : '#ff6f91');
    ui.rect(0, 50, W, 2, '#c8352a');
    ui.sprite(SPR.mascot, SPR.mascotLegend, 8, 5 + Math.round(Math.sin(this.t * 3) * 1), 3);
    ui.text('ガチャマート', 56, 6, { size: 26, color: '#fff', outline: '#c8352a' });
    ui.text('GACHA-MART  ★カプセルトイ専門ネット通販★', 58, 36, { size: 10, color: '#fff', font: FJ });
    ui.badge('NEW!', 222, 10, COL.yellow === '#ffd23f' ? '#2f6fd6' : '#2f6fd6', true);
    // wallet
    ui.bevel(420, 6, 152, 38, '#fffdf4');
    ui.text('所持金', 428, 10, { size: 10, color: COL.soft });
    ui.sprite(SPR.coin, { Y: '#ffd23f', K: '#b8860b' }, 428, 26, 2);
    ui.text(yen(s.money), 564, 22, { size: 16, color: COL.red, align: 'right', bold: true });
    // logout
    ui.button('×', 580, 8, 52, 34, () => this.onExit?.(), { color: '#e8e2d4', size: 16, sub: 'EXIT' });
    // marquee
    ui.rect(0, 52, W, 16, COL.navy);
    const msg = this.marqueeText();
    const mw = ui.measure(msg, 12);
    const off = W - ((this.t * 60) % (mw + W));
    ui.text(msg, off, 53, { size: 12, color: COL.yellow });
    // tabs
    const tw = W / PAGES.length;
    PAGES.forEach(([id, jp, en], i) => {
      const x = Math.round(i * tw), w = Math.round((i + 1) * tw) - x;
      const on = this.page === id;
      const hov = ui.hit(x, 68, w, 24, () => this.go(id));
      ui.rect(x, 68, w, 24, on ? '#fffdf4' : hov ? '#ffe9a0' : '#ffd23f');
      ui.frame(x, 68, w, 24, '#c8a020');
      ui.text(jp, x + w / 2, 70, { size: 12, color: on ? COL.red : COL.ink, align: 'center' });
      ui.text(en, x + w / 2, 83, { size: 7, color: COL.soft, align: 'center', font: FE });
    });
    ui.rect(0, 92, W, 2, '#c8a020');
    // sidebar
    this.drawSidebar(0, Y0, 124);
    // footer
    ui.rect(0, Y1, W, H - Y1, '#ece4d4');
    ui.rect(0, Y1, W, 1, COL.line);
    ui.text('Copyright (C) 2003 GACHA-MART Co.,Ltd. All Rights Reserved.  |  会社概要  |  推奨環境 640×480', W / 2, Y1 + 6, { size: 9, color: COL.soft, align: 'center', font: FJ });
  }

  marqueeText() {
    const s = this.game.state;
    const disc = Object.keys(s.discovered).length;
    return `★いらっしゃいませ！ガチャマートへようこそ★　　図鑑 ${disc}/${ITEMS.length}種　　★ロープ付きコインは何度でも使えます（店長談）★　　★ダブったら買取BOXへ！★　　★シリーズコンプでボーナス！★　　★博物館オーナー募集中★　　`;
  }

  drawSidebar(x, y, w) {
    const ui = this.ui, s = this.game.state;
    ui.rect(x, y, w + 4, Y1 - y, '#f4ecdc');
    ui.rect(w + 4, y, 1, Y1 - y, COL.line);
    let yy = y + 6;
    ui.rect(x + 4, yy, w - 4, 16, COL.red);
    ui.text('◆カテゴリ', x + 8, yy + 2, { size: 11, color: '#fff' });
    yy += 20;
    for (const [id, jp] of PAGES.slice(1)) {
      ui.link(`▶ ${jp}`, x + 8, yy, () => this.go(id), { size: 11 });
      yy += 15;
    }
    yy += 6;
    ui.rect(x + 4, yy, w - 4, 16, COL.blue);
    ui.text('★人気ランキング', x + 8, yy + 2, { size: 11, color: '#fff' });
    yy += 20;
    const best = Object.keys(s.discovered).map((k) => [k, itemValue(k, 'normal')]).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (!best.length) { ui.text('まだデータなし', x + 8, yy, { size: 10, color: COL.soft }); yy += 16; }
    best.forEach(([k], i) => {
      const it = getItem(k);
      ui.text(`${i + 1}位`, x + 6, yy + 8, { size: 10, color: [COL.gold, '#8a8a9a', '#a86a3a'][i], bold: true });
      ui.image(this.itemThumb(k, 32), x + 28, yy, 28, 28);
      ui.text(it.jp, x + 58, yy + 8, { size: 9, max: 64 });
      yy += 30;
    });
    yy += 6;
    // visitor counter
    ui.text('あなたは', x + 8, yy, { size: 10, color: COL.soft });
    yy += 13;
    const n = String(this.counter + s.pulls).padStart(7, '0');
    for (let i = 0; i < 7; i++) { ui.rect(x + 8 + i * 15, yy, 13, 17, '#111'); ui.text(n[i], x + 14.5 + i * 15, yy + 1, { size: 13, color: '#4cff4c', align: 'center', font: FE }); }
    yy += 20;
    ui.text('人目のお客様です', x + 8, yy, { size: 10, color: COL.soft });
    yy += 18;
    // under construction sign
    const yb = Math.min(yy, Y1 - 34);
    for (let i = 0; i < w - 8; i += 8) ui.rect(x + 4 + i, yb, 4, 30, (i / 8 + Math.floor(this.t * 4)) % 2 ? '#ffd23f' : '#222');
    ui.rect(x + 14, yb + 7, w - 28, 16, '#ffd23f');
    ui.text('工事中', x + w / 2, yb + 8, { size: 11, color: '#222', align: 'center' });
  }

  drawFlash(dt) {
    if (!this.flash) return;
    const ui = this.ui;
    this.flash.t -= dt;
    if (this.flash.t <= 0) { this.flash = null; return; }
    const bw = 300, bh = 96, bx = (W - bw) / 2, by = 170;
    ui.rect(bx + 4, by + 4, bw, bh, 'rgba(0,0,0,0.35)');
    ui.bevel(bx, by, bw, bh, '#fffdf4');
    ui.rect(bx, by, bw, 18, this.flash.ok ? COL.blue : COL.red);
    ui.text(this.flash.ok ? 'ガチャマート' : 'エラー', bx + 6, by + 3, { size: 11, color: '#fff' });
    ui.sprite(SPR.mascot, SPR.mascotLegend, bx + 14, by + 32, 3);
    ui.text(this.flash.ok ? 'ありがとうございます！' : '申し訳ございません…', bx + 66, by + 30, { size: 14, color: this.flash.ok ? COL.ink : COL.red });
    ui.text(this.flash.msg || '', bx + 66, by + 54, { size: 11, color: COL.soft, max: bw - 76 });
  }

  drawCursor() {
    const ui = this.ui;
    const hand = ui.cursor === 'hand';
    ui.sprite(hand ? SPR.hand : SPR.arrow, SPR.cursorLegend, Math.round(this.mouse.x) - (hand ? 4 : 0), Math.round(this.mouse.y), 1);
  }

  drawBoot() {
    const ui = this.ui;
    ui.rect(0, 0, W, H, '#000');
    const k = this.bootT;
    ui.text('GACHA-MART BROWSER  Ver 2.03', 20, 20, { size: 12, color: '#c0c0c0', font: FE });
    ui.text(k > 0.3 ? 'ダイヤルアップ接続中… 56kbps' : '', 20, 44, { size: 12, color: '#c0c0c0' });
    ui.text(k > 0.9 ? '接続しました。' : '', 20, 64, { size: 12, color: '#7fff7f' });
    const p = Math.min(1, k / 1.5);
    ui.frame(20, 100, 300, 14, '#c0c0c0');
    ui.rect(22, 102, 296 * p, 10, '#2f6fd6');
    ui.sprite(SPR.mascot, SPR.mascotLegend, W / 2 - 21, 200, 3);
  }

  drawScreensaver(dt) {
    const ui = this.ui;
    ui.begin({ x: -1, y: -1 }, this.t);
    ui.rect(0, 0, W, H, '#05060f');
    if (!this.saver) this.saver = Array.from({ length: 14 }, (_, i) => ({ x: Math.random() * W, y: Math.random() * H, vx: 30 + Math.random() * 50, vy: 20 + Math.random() * 30, c: ['#ff6f91', '#5cc4ff', '#ffd23f', '#58c06c', '#d94fb0'][i % 5], s: 3 + (i % 3) }));
    for (const c of this.saver) {
      c.x += c.vx * dt; c.y -= c.vy * dt;
      if (c.x > W + 30) c.x = -30; if (c.y < -30) c.y = H + 30;
      ui.sprite(SPR.capsule, { W: '#f4fbff', R: '#aaa', P: c.c }, Math.round(c.x), Math.round(c.y), c.s);
    }
    ui.text('GACHA-MART', W / 2, H / 2 - 30 + Math.sin(this.t) * 20, { size: 34, color: '#ff6f91', align: 'center', font: FE, outline: '#3a0a1a' });
    const d = new Date();
    ui.text(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`, W / 2, H / 2 + 20 + Math.sin(this.t) * 20, { size: 20, color: '#9fd9ff', align: 'center', font: FE });
    ui.text('クリックでログイン', W / 2, H - 40, { size: 14, color: '#888', align: 'center' });
  }

  // ------------------------------------------------------------------ helpers
  heading(x, y, w, jp, en, color = COL.red) {
    const ui = this.ui;
    ui.rect(x, y, w, 20, color);
    ui.rect(x, y + 20, w, 2, '#00000040');
    ui.text(`■ ${jp}`, x + 6, y + 3, { size: 13, color: '#fff' });
    ui.text(en, x + w - 6, y + 6, { size: 9, color: '#ffffffcc', align: 'right', font: FE });
    return 26;
  }
  panel(x, y, w, h, color = '#fff') { const ui = this.ui; ui.rect(x, y, w, h, color); ui.frame(x, y, w, h, COL.line); }

  // ------------------------------------------------------------------ pages
  page_top(x, y, w) {
    const ui = this.ui, g = this.game, s = g.state;
    let yy = y;
    // featured banner
    const next = SERIES.find((se) => !s.licenses.includes(se.id)) || SERIES[SERIES.length - 1];
    const bg = next.card.bg, ac = next.card.accent;
    ui.rect(x, yy, w, 112, bg);
    for (let i = 0; i < w; i += 14) ui.rect(x + i, yy, 7, 112, ac + '22');
    ui.rect(x, yy, w, 22, ac);
    ui.text(s.licenses.includes(next.id) ? '★全シリーズ取扱中★' : '★NEW ARRIVAL★ 新シリーズ入荷予定！', x + 8, yy + 4, { size: 13, color: '#fff' });
    ui.text(next.jp, x + 12, yy + 30, { size: 22, color: next.card.text, outline: '#fff' });
    ui.text(next.name, x + 14, yy + 58, { size: 11, color: next.card.text, font: FE });
    ui.text(next.taglineJp || next.tagline, x + 14, yy + 74, { size: 11, color: next.card.text });
    next.items.slice(0, 4).forEach((it, i) => ui.image(this.itemThumb(it.key, 48, !s.discovered[it.key] && it.rarity === 'secret'), x + w - 4 * 56 - 4 + i * 56, yy + 34, 52, 52));
    ui.button('くわしく見る ▶', x + 14, yy + 88, 110, 20, () => this.go('refill'), { size: 11, color: COL.yellow });
    if (Math.floor(this.t * 2) % 2) ui.text('NEW!', x + w - 50, yy + 92, { size: 13, color: COL.red, bold: true, font: FE });
    yy += 120;
    // news
    yy += this.heading(x, yy, w, 'お知らせ', 'NEWS', COL.blue);
    const disc = Object.keys(s.discovered).length;
    const news = [
      ['10/17', `あなたの図鑑：${disc} / ${ITEMS.length} 種　コンプ済み：${Object.keys(s.completed).length} シリーズ`],
      ['10/16', 'ロープ付きの偽コインは何度でも使えます。店長は知らないふりをしています。'],
      ['10/15', 'ダブったフィギュアはガレージの「買取BOX」へ。保管BOXは後でまとめて売れます。'],
      ['10/14', '同じシリーズを全種「展示」するとコンプリートボーナス！ 棚や博物館に飾ろう。'],
      ['10/12', 'マシン改造パーツで回転スピードUP・容量UP・ロープのコイン追加ができます。'],
      ['10/10', `空き倉庫を博物館に！ 博物館パック ${yen(MUSEUM_PRICE)}（コンプ ${MUSEUM_REQ_COMPLETE} シリーズ以上）`],
      ['10/08', '電気を消すと「蓄光ver.」がぼんやり光ります。ドア横のスイッチをどうぞ。'],
    ];
    for (const [d, t] of news) {
      ui.text(d, x + 6, yy, { size: 10, color: COL.red, font: FE });
      ui.text(t, x + 44, yy, { size: 11, max: w - 50 });
      yy += 17;
    }
    yy += 6;
    // recommendations
    yy += this.heading(x, yy, w, '店長のおすすめ', 'RECOMMENDED', COL.green);
    const recs = this.recommendations();
    const cw = Math.floor((w - 16) / 3);
    recs.forEach((r, i) => {
      const cx = x + i * (cw + 8);
      this.panel(cx, yy, cw, 96);
      if (r.img) ui.image(r.img, cx + 6, yy + 6, 44, 44);
      ui.text(r.title, cx + 54, yy + 8, { size: 11, max: cw - 58 });
      ui.text(r.sub, cx + 54, yy + 24, { size: 9, color: COL.soft, max: cw - 58 });
      ui.text(yen(r.price), cx + 6, yy + 56, { size: 14, color: COL.red, bold: true });
      ui.button(r.btn || '購入する', cx + 6, yy + 72, cw - 12, 18, () => this.notify(r.buy()), { size: 11, disabled: s.money < r.price });
    });
    yy += 104;
    return yy - y;
  }

  recommendations() {
    const g = this.game, s = g.state;
    const out = [];
    // a refill for the emptiest machine
    const m = g.machines.slice().sort((a, b) => a.data.stock.length / a.capacity - b.data.stock.length / b.capacity)[0];
    if (m) {
      const se = m.data.series;
      const n = Math.max(5, m.capacity - m.data.stock.length);
      out.push({ title: `${SERIES_BY_ID[se].jp} 補充`, sub: `${n}個入りカプセル`, price: capsuleCost(se) * n, img: this.itemThumb(SERIES_BY_ID[se].items[0].key, 48), buy: () => shop.buyRefill(g, se, n), btn: '注文する' });
      // cheapest upgrade
      let best = null;
      for (const mm of g.machines) for (const k of Object.keys(UPGRADES)) {
        const c = upgradeCost(k, mm.data.up[k] || 0, mm.data.type);
        if (c !== null && (!best || c < best.price)) best = { title: UPGRADES[k].jp, sub: UPGRADES[k].desc(mm.data.up[k] || 0), price: c, img: this.machineThumb(mm.data.type), buy: () => shop.buyUpgrade(g, mm, k) };
      }
      if (best) out.push(best);
    }
    const nextOpen = OPENERS[s.opener + 1];
    if (nextOpen) out.push({ title: nextOpen.jp, sub: nextOpen.name, price: nextOpen.price, img: null, buy: () => shop.buyOpener(g, s.opener + 1) });
    else {
      const t = MACHINE_ORDER.find((tt) => MACHINE_TYPES[tt].price > 0);
      out.push({ title: MACHINE_TYPES[t].jp, sub: MACHINE_TYPES[t].name, price: machinePrice(t, s.machines.filter((x) => x.type === t).length), img: this.machineThumb(t), buy: () => shop.buyMachine(g, t) });
    }
    return out.slice(0, 3);
  }

  page_machines(x, y, w) {
    const ui = this.ui, g = this.game, s = g.state;
    let yy = y;
    yy += this.heading(x, yy, w, 'ガチャマシン販売', 'MACHINES');
    ui.text(`設置スペース：${s.machines.length} / ${MAX_MACHINES}　　新品マシンには半分までカプセルが入っています`, x + 4, yy, { size: 11, color: COL.soft });
    yy += 18;
    for (const type of MACHINE_ORDER) {
      const T = MACHINE_TYPES[type];
      const owned = s.machines.filter((m) => m.type === type).length;
      const price = machinePrice(type, owned);
      this.panel(x, yy, w, 92);
      ui.image(this.machineThumb(type), x + 6, yy + 6, 80, 80);
      ui.text(T.jp, x + 94, yy + 8, { size: 16, color: COL.ink });
      ui.text(T.name, x + 94, yy + 28, { size: 10, color: COL.soft, font: FE });
      ui.text(T.desc, x + 94, yy + 42, { size: 10, color: COL.ink, max: 250 });
      ui.text(`容量 ${T.baseCap}個　回転 ${T.crank.toFixed(1)}秒${T.luck ? '　運+5%' : ''}　所有 ${owned}台`, x + 94, yy + 58, { size: 10, color: COL.blue });
      if (T.price === 0) ui.text('非売品 (お店の初代マシン)', x + w - 150, yy + 36, { size: 11, color: COL.soft });
      else {
        ui.text(yen(price), x + w - 12, yy + 14, { size: 18, color: COL.red, bold: true, align: 'right' });
        ui.text('送料無料', x + w - 12, yy + 36, { size: 9, color: COL.green, align: 'right' });
        const full = s.machines.length >= MAX_MACHINES;
        ui.button(full ? '満員' : '購入して設置', x + w - 120, yy + 58, 110, 24, () => this.notify(shop.buyMachine(g, type)), { disabled: full || s.money < price, color: COL.orange, size: 12 });
      }
      yy += 98;
    }
    return yy - y;
  }

  page_refill(x, y, w) {
    const ui = this.ui, g = this.game, s = g.state;
    let yy = y;
    yy += this.heading(x, yy, w, 'カプセル補充パック', 'CAPSULE REFILLS');
    ui.text('箱を持ってマシンをクリックすると補充できます。シリーズを入れ替えると台紙も変わります。', x + 4, yy, { size: 10, color: COL.soft });
    yy += 18;
    const disc = Object.keys(s.discovered).length;
    for (const se of SERIES) {
      const licensed = s.licenses.includes(se.id);
      const req = licenseRequirement(se.id);
      const locked = !licensed && disc < req;
      const h = 100;
      this.panel(x, yy, w, h, locked ? '#f0ece4' : '#fff');
      // mini card
      ui.rect(x + 4, yy + 4, 140, h - 8, se.card.bg);
      ui.rect(x + 4, yy + 4, 140, 18, se.card.accent);
      ui.text(se.jp, x + 8, yy + 6, { size: 12, color: '#fff', max: 132 });
      ui.text(se.name, x + 8, yy + 26, { size: 9, color: se.card.text, font: FE, max: 132 });
      ui.text(`1回 ${se.price}円`, x + 8, yy + 40, { size: 11, color: se.card.text });
      const got = se.items.filter((it) => s.discovered[it.key]).length;
      ui.text(`図鑑 ${got}/${se.items.length}`, x + 8, yy + 56, { size: 11, color: se.card.text });
      if (s.completed[se.id]) { ui.rect(x + 80, yy + 52, 60, 18, COL.red); ui.text('コンプ!', x + 110, yy + 54, { size: 11, color: '#fff', align: 'center' }); }
      ui.text(se.themes.map((t) => THEME_NAMES[t]?.[0] || t).join('・'), x + 8, yy + 76, { size: 9, color: se.card.text, max: 132 });
      // lineup
      se.items.forEach((it, i) => {
        const tx = x + 150 + (i % 4) * 40, ty = yy + 6 + Math.floor(i / 4) * 44;
        ui.rect(tx, ty, 38, 40, '#faf6ec');
        ui.image(this.itemThumb(it.key, 32, locked || !s.discovered[it.key]), tx + 3, ty + 2, 32, 32);
        ui.rect(tx, ty + 36, 38, 4, RARITIES[it.rarity].color);
      });
      // purchase area
      const bx = x + w - 150;
      if (licensed) {
        const cc = capsuleCost(se.id);
        ui.text(`1個 ${yen(cc)}`, bx + 140, yy + 6, { size: 10, color: COL.soft, align: 'right' });
        [10, 25, 50].forEach((n, i) => {
          ui.button(`${n}個入 ${yen(cc * n)}`, bx, yy + 22 + i * 25, 140, 21, () => this.notify(shop.buyRefill(g, se.id, n)), { size: 11, disabled: s.money < cc * n, color: COL.yellow });
        });
      } else if (locked) {
        ui.text('🔒 未解放', bx + 70, yy + 26, { size: 13, color: COL.soft, align: 'center' });
        ui.text(`図鑑 ${req}種 で解放`, bx + 70, yy + 46, { size: 11, color: COL.soft, align: 'center' });
        ui.text(`(現在 ${disc}種)`, bx + 70, yy + 62, { size: 10, color: COL.soft, align: 'center' });
      } else {
        const lp = licensePrice(se.id);
        ui.text('取扱契約', bx + 70, yy + 20, { size: 12, color: COL.ink, align: 'center' });
        ui.text(yen(lp), bx + 70, yy + 38, { size: 16, color: COL.red, bold: true, align: 'center' });
        ui.button('契約する', bx + 10, yy + 64, 120, 24, () => this.notify(shop.buyLicense(g, se.id)), { disabled: s.money < lp, color: COL.orange });
      }
      yy += h + 6;
    }
    return yy - y;
  }

  page_upgrade(x, y, w) {
    const ui = this.ui, g = this.game, s = g.state;
    let yy = y;
    yy += this.heading(x, yy, w, '改造パーツ', 'MACHINE UPGRADES');
    g.machines.forEach((m, idx) => {
      const T = MACHINE_TYPES[m.data.type];
      this.panel(x, yy, w, 112);
      ui.image(this.machineThumb(m.data.type), x + 4, yy + 4, 64, 64);
      ui.text(`No.${idx + 1}`, x + 8, yy + 72, { size: 11, color: COL.red, font: FE });
      ui.text(T.jp, x + 8, yy + 86, { size: 10, max: 64 });
      ui.text(`${SERIES_BY_ID[m.data.series]?.jp || ''}  ${m.data.stock.length}/${m.capacity}個  回転${crankTime(m.data).toFixed(2)}秒`, x + 74, yy + 4, { size: 10, color: COL.soft });
      Object.entries(UPGRADES).forEach(([k, U], i) => {
        const lvl = m.data.up[k] || 0;
        const cx = x + 74 + i * 140, cy = yy + 20;
        ui.rect(cx, cy, 134, 86, '#faf6ec');
        ui.frame(cx, cy, 134, 86, COL.line);
        ui.text(U.jp, cx + 4, cy + 3, { size: 11 });
        for (let p = 0; p < U.max; p++) ui.rect(cx + 4 + p * 13, cy + 20, 11, 6, p < lvl ? COL.green : '#d8d0c0');
        const cost = upgradeCost(k, lvl, m.data.type);
        ui.text(cost === null ? '最大レベル！' : U.desc(lvl), cx + 4, cy + 30, { size: 9, color: COL.soft, max: 126 });
        if (cost !== null) {
          ui.text(yen(cost), cx + 4, cy + 44, { size: 13, color: COL.red, bold: true });
          ui.button('改造する', cx + 4, cy + 62, 126, 19, () => this.notify(shop.buyUpgrade(g, m, k)), { size: 11, disabled: s.money < cost });
        } else ui.text('MAX', cx + 67, cy + 52, { size: 16, color: COL.gold, align: 'center', font: FE, bold: true });
      });
      yy += 118;
    });
    return yy - y;
  }

  page_tools(x, y, w) {
    const ui = this.ui, g = this.game, s = g.state;
    let yy = y;
    yy += this.heading(x, yy, w, 'カプセルオープナー', 'OPENING TOOLS');
    OPENERS.forEach((o, i) => {
      if (i === 0) return;
      this.panel(x, yy, w, 44, s.opener >= i ? '#eef8ee' : '#fff');
      ui.text(o.jp, x + 8, yy + 6, { size: 13 });
      ui.text(`${o.name} — ${o.desc}  開封 ${o.time}秒`, x + 8, yy + 24, { size: 9, color: COL.soft, max: w - 150 });
      if (s.opener >= i) ui.text('購入済み ✓', x + w - 12, yy + 14, { size: 12, color: COL.green, align: 'right' });
      else {
        ui.text(yen(o.price), x + w - 110, yy + 14, { size: 14, color: COL.red, bold: true, align: 'right' });
        ui.button('購入', x + w - 96, yy + 10, 84, 24, () => this.notify(shop.buyOpener(g, i)), { disabled: s.opener !== i - 1 || s.money < o.price });
      }
      yy += 50;
    });
    yy += 6;
    yy += this.heading(x, yy, w, '開運グッズ', 'LUCKY CHARMS', '#c8352a');
    ui.text('神棚に飾ると、レア＆特別仕上げが出やすくなります。', x + 4, yy, { size: 10, color: COL.soft });
    yy += 16;
    for (const [id, c] of Object.entries(CHARMS)) {
      const own = s.charms.includes(id);
      this.panel(x, yy, w, 44, own ? '#fff6e0' : '#fff');
      ui.text(c.jp, x + 8, yy + 6, { size: 13 });
      ui.text(`${c.name} — ${c.desc}`, x + 8, yy + 24, { size: 9, color: COL.soft, max: w - 150 });
      if (own) ui.text('ご利益中 ⛩', x + w - 12, yy + 14, { size: 12, color: COL.gold, align: 'right' });
      else {
        ui.text(yen(c.price), x + w - 110, yy + 14, { size: 14, color: COL.red, bold: true, align: 'right' });
        ui.button('購入', x + w - 96, yy + 10, 84, 24, () => this.notify(shop.buyCharm(g, id)), { disabled: s.money < c.price });
      }
      yy += 50;
    }
    yy += 6;
    yy += this.heading(x, yy, w, 'コレクション棚', 'SHELVES', COL.green);
    const n = s.shelves.length;
    this.panel(x, yy, w, 44);
    ui.text('壁掛けコレクション棚（40体）', x + 8, yy + 6, { size: 13 });
    ui.text(`設置済み ${n}/${SHELF_SLOTS.length}　LEDライト付き`, x + 8, yy + 24, { size: 9, color: COL.soft });
    if (n < SHELF_SLOTS.length) {
      ui.text(yen(SHELF_PRICES[n]), x + w - 110, yy + 14, { size: 14, color: COL.red, bold: true, align: 'right' });
      ui.button('購入', x + w - 96, yy + 10, 84, 24, () => this.notify(shop.buyShelf(g)), { disabled: s.money < SHELF_PRICES[n] });
    } else ui.text('壁がいっぱい', x + w - 12, yy + 14, { size: 12, color: COL.soft, align: 'right' });
    yy += 50;
    return yy - y;
  }

  page_used(x, y, w) {
    const ui = this.ui, g = this.game, s = g.state;
    let yy = y;
    yy += this.heading(x, yy, w, '中古フィギュア', 'SECOND-HAND SINGLES', '#6a2a9a');
    ui.text('足りない1体をピンポイントで！ 開封済み・美品。※プレミア価格です', x + 4, yy, { size: 10, color: COL.soft });
    yy += 18;
    const avail = SERIES.filter((se) => s.licenses.includes(se.id));
    if (!this.sub.used || !avail.find((a) => a.id === this.sub.used)) this.sub.used = avail[0]?.id;
    // series tabs
    let tx = x;
    for (const se of avail) {
      const tw = ui.measure(se.jp, 10) + 12;
      if (tx + tw > x + w) { tx = x; yy += 20; }
      const on = this.sub.used === se.id;
      const hov = ui.hit(tx, yy, tw, 18, () => { this.sub.used = se.id; audio.play('uiClick', { vol: 0.5 }); });
      ui.rect(tx, yy, tw, 18, on ? se.card.accent : hov ? '#ffe9a0' : '#ece4d4');
      ui.text(se.jp, tx + 6, yy + 3, { size: 10, color: on ? '#fff' : COL.ink });
      tx += tw + 4;
    }
    yy += 24;
    const se = SERIES_BY_ID[this.sub.used];
    if (!se) return yy - y;
    const cw = Math.floor((w - 12) / 4);
    se.items.forEach((it, i) => {
      const cx = x + (i % 4) * (cw + 4), cy = yy + Math.floor(i / 4) * 130;
      const known = !!s.discovered[it.key];
      this.panel(cx, cy, cw, 124);
      ui.image(this.itemThumb(it.key, 64, !known), cx + (cw - 64) / 2, cy + 4, 64, 64);
      ui.rect(cx, cy + 70, cw, 3, RARITIES[it.rarity].color);
      ui.text(known ? it.jp : '？？？', cx + cw / 2, cy + 76, { size: 10, align: 'center', max: cw - 6 });
      ui.stars(RARITIES[it.rarity].stars, cx + cw / 2 - 17, cy + 90, RARITIES[it.rarity].color);
      const p = singlePrice(it.key);
      ui.button(yen(p), cx + 6, cy + 100, cw - 12, 19, () => this.notify(shop.buySingle(g, it.key)), { size: 11, disabled: s.money < p, color: '#e0c8ff' });
    });
    yy += 2 * 130;
    return yy - y;
  }

  page_sell(x, y, w) {
    const ui = this.ui, g = this.game, s = g.state;
    let yy = y;
    yy += this.heading(x, yy, w, '高価買取', 'SELL YOUR COLLECTION', COL.green);
    const entries = Object.entries(s.storage).filter(([, c]) => c > 0);
    const total = entries.reduce((a, [k, c]) => { const [key, f] = k.split('|'); return a + itemValue(key, f) * c; }, 0);
    this.panel(x, yy, w, 54, '#f0fff0');
    ui.text(`保管BOX：${entries.reduce((a, [, c]) => a + c, 0)}点　査定額 ${yen(total)}`, x + 8, yy + 6, { size: 13 });
    ui.button('保管BOXを全部売る', x + 8, yy + 26, 160, 22, () => this.notify(shop.sellAllStored(g)), { disabled: !entries.length, color: COL.yellow, size: 11 });
    ui.button('展示中のダブりを売る', x + 176, yy + 26, 170, 22, () => this.notify(shop.sellDisplayedDupes(g)), { color: '#ffd0a0', size: 11 });
    yy += 62;
    if (!entries.length) {
      ui.text('保管BOXは空です。ガレージの青いフタの箱にフィギュアを入れてね。', x + 6, yy, { size: 11, color: COL.soft });
      yy += 20;
    }
    for (const [k, c] of entries) {
      const [key, f] = k.split('|');
      const it = getItem(key);
      if (!it) continue;
      this.panel(x, yy, w, 40);
      ui.image(this.itemThumb(key, 32, false, f), x + 4, yy + 4, 32, 32);
      ui.text(it.jp, x + 42, yy + 4, { size: 12 });
      ui.text(`${RARITIES[it.rarity].jp}${f !== 'normal' ? '・' + FINISHES[f].jp : ''}  ×${c}`, x + 42, yy + 22, { size: 10, color: f !== 'normal' ? COL.gold : COL.soft });
      ui.text(yen(itemValue(key, f)), x + w - 190, yy + 12, { size: 13, color: COL.red, align: 'right' });
      ui.button('1つ売る', x + w - 180, yy + 9, 76, 22, () => this.notify(shop.sellStored(g, k, 1)), { size: 11 });
      ui.button('取り出す', x + w - 96, yy + 9, 84, 22, () => { const ok = g.takeFromStorage(k); this.notify(ok ? { ok: true, msg: '配達します / Delivered to the garage' } : { ok: false, msg: '' }); }, { size: 11, color: '#d0e8ff' });
      yy += 44;
    }
    return yy - y;
  }

  page_book(x, y, w) {
    const ui = this.ui, g = this.game, s = g.state;
    let yy = y;
    yy += this.heading(x, yy, w, 'コレクション図鑑', 'COLLECTION BOOK', COL.navy);
    const disc = Object.keys(s.discovered).length;
    ui.text(`発見 ${disc}/${ITEMS.length}　コンプ ${Object.keys(s.completed).length}/${SERIES.length}　総回転数 ${s.pulls}　シークレット ${s.stats.secrets}回`, x + 4, yy, { size: 11, color: COL.soft });
    yy += 18;
    const shown = g.displayedKeys();
    for (const se of SERIES) {
      const got = se.items.filter((it) => s.discovered[it.key]).length;
      this.panel(x, yy, w, 74, s.completed[se.id] ? '#fff8e0' : '#fff');
      ui.rect(x, yy, 6, 74, se.card.accent);
      ui.text(se.jp, x + 12, yy + 4, { size: 12 });
      ui.text(`${got}/${se.items.length}`, x + 12, yy + 22, { size: 11, color: COL.soft, font: FE });
      if (s.completed[se.id]) {
        ui.rect(x + 12, yy + 42, 62, 22, COL.red);
        ui.text('コンプリート', x + 43, yy + 47, { size: 9, color: '#fff', align: 'center' });
      }
      se.items.forEach((it, i) => {
        const cx = x + 84 + i * 51;
        const d = s.discovered[it.key];
        ui.rect(cx, yy + 4, 48, 66, shown.has(it.key) ? '#eef8ff' : '#faf6ec');
        ui.image(this.itemThumb(it.key, 48, !d), cx, yy + 4, 48, 48);
        if (d) {
          let fx = cx + 2;
          for (const fid of Object.keys(d.f)) { if (fid === 'normal') continue; ui.rect(fx, yy + 54, 6, 6, FINISHES[fid].color); fx += 7; }
          ui.text(`×${d.n}`, cx + 46, yy + 58, { size: 9, color: COL.soft, align: 'right', font: FE });
        }
        ui.rect(cx, yy + 66, 48, 3, RARITIES[it.rarity].color);
      });
      yy += 80;
    }
    return yy - y;
  }

  page_museum(x, y, w) {
    const m = this.game.museum;
    if (m?.sitePage) return m.sitePage(this, x, y, w);
    this.ui.text('準備中…', x + 8, y + 8, { size: 14 });
    return 40;
  }
}

export { PAGES, X0, CW, Y0, Y1, DISPLAYS, FLOORS, WALLS, decorList, MUSEUM_EXPANSIONS, hex };
