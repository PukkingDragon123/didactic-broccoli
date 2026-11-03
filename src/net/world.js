// Host-authoritative world sync. The host's game is the world: a guest loads the host's snapshot when joining
// (snapshot()), then the host sends what changes and guests send what they do as small ops, which the host applies
// and passes on.
//   machines   host -> all: 'M' { l: [state...], ids, ack }  (stock as series counts, coin box yen, price, card, lid)
//              guest -> host: 'm' { id, seq, add, take, cash, price, series, lid } (diffs of what the guest did) / 'm+'
//   items      'it+' { n, k, d, p, r, v } / 'it-' { n } both ways (the host relays); host -> all 'itp' positions (1 s);
//              host -> guest 'gone' { n } when someone else picked it up first
//   furniture  'dec' { op: place | move | remove, ... } both ways; 'dst' { u, st } feature state (tip jars...)
//   wallet     host -> all 'W' { pg, rg } (piggy bank = the team wallet, register); guest -> host 'bal' { k, d }
//              host -> guest 'fix' { cash } when the shared money ran out under them. Cash and bank stay personal.
//   clock      host -> all 'clk' { d, m, p } once a second (guests run their clock locally in between)
//   displays   'dsp' { k, i, it } both ways: a figure put on / taken off a wall shelf or a museum case
//   fixtures   'fx' { l, sh, so } both ways: the garage lights, the shutter, the OPEN sign
//   orders     guest -> host 'order' { d, o } (the host's courier brings it); 'disc' { k, f } (the collection book)
//   ledger     guest -> host 'me' { cash, bank, pin, inv } (the host keeps a friend's pockets for next time)
// Guests run the lane's people and customers themselves for show only: a customer's turn on a guest's screen
// changes no stock or coins (the host's customers do that), and money that turns up on a guest's side without the
// guest doing anything (museum visitors, online sales, auctions...) is ignored.
import * as THREE from 'three';
import { GachaMachine } from '../game/GachaMachine.js';
import { FEATURES } from '../build/features.js';
import { STORAGE } from '../build/storage.js';
import { audio } from '../core/audio.js';

const r3 = (v) => Math.round(v * 1000) / 1000;
const countBy = (arr) => { const o = {}; for (const s of arr) o[s] = (o[s] || 0) + 1; return o; };
const ACT_WINDOW = 6000; // ms after your own click / key press that money and items count as yours

export class WorldSync {
  constructor(mp) {
    this.mp = mp;
    this.game = mp.game;
    this.applying = 0; // > 0 while applying remote changes (no echo)
    this.nseq = 1;
    this.mBase = new Map(); // guest: machine id -> { counts, cash, price, series, lid } (last authoritative)
    this.mLate = new Map(); // guest: machine id -> a host state that waits for a local animation
    this.mSeq = new Map(); // guest: machine id -> last op seq sent
    this.mAck = new Map(); // host: `${guest}|${machine}` -> seq applied
    this.mSent = new Map(); // host: machine id -> last sent json
    this.stSent = new Map(); // decor uid -> json
    this.decUse = new Map(); // guest: decor uid -> time of the last local use
    this.posSent = new Map(); // host: item nid -> [x, y, z]
    this.balSent = '';
    this.lastAct = 0;
    this.hostClock = null;
    this.wrapped = false;
  }

  get s() { return this.mp.s; }
  get host() { return this.mp.isHost; }
  /** Did the local player just do something (a click or a key)? */
  acting() {
    if (performance.now() - this.lastAct < ACT_WINDOW) return true;
    const g = this.game;
    // a hold (cranking a handle, pouring...) or your own test turn still dispensing
    return !!(g.input?.button?.(0) || g.machines.some((m) => m.state === 'dispensing' || m.state === 'returning' || m.state === 'cranking'));
  }
  apply(fn) { this.applying++; try { return fn(); } finally { this.applying--; } }

  // ------------------------------------------------------------------ the snapshot a joining guest loads
  snapshot(hello, guest) {
    const g = this.game;
    g.save?.();
    const st = JSON.parse(JSON.stringify(g.state));
    const L = this.mp.ledger.players[hello.pid] || {};
    for (const k of ['settings', 'net', '__visit', '__net']) delete st[k];
    st.loose = [];
    st.deliveries = [];
    st.netItems = this.itemList();
    st.inventory = Array.isArray(L.inv) ? L.inv : [null, null, null, null, null, null];
    st.wallet = { ...(st.wallet || {}), cash: Math.max(0, Math.round(L.cash ?? 2000)), bank: Math.max(0, Math.round(L.bank ?? 0)), pin: L.pin ?? null, atm: { tries: 0, lockUntil: 0, txn: 0 } };
    if (hello.avatar) st.avatar = hello.avatar;
    st.__owner = this.mp.me.name;
    st.__guestId = guest;
    if (st.flags) st.flags.welcomed = true;
    return st;
  }

  // ------------------------------------------------------------------ wiring
  install() {
    if (!this.wrapped) {
      this.wrapped = true;
      // your own clicks and keys mark what follows as your doing
      const mark = () => { this.lastAct = performance.now(); };
      for (const ev of ['pointerdown', 'mousedown', 'keydown', 'touchstart']) addEventListener(ev, mark, true);
      this.wrapItems();
      this.wrapDecor();
    }
    if (this.host) this.installHost(); else this.installGuest();
    const S = this.s;
    S.on('it+', (m, from) => this.onItemAdd(m, from));
    S.on('it-', (m, from) => this.onItemDel(m, from));
    S.on('dec', (m, from) => this.onDecor(m, from));
    S.on('dst', (m, from) => this.onDecorSt(m, from));
    S.on('fx', (m, from) => this.onFixtures(m, from));
    S.on('dsp', (m, from) => this.onDisplay(m, from));
  }

  installHost() {
    const g = this.game, S = this.s;
    // every loose item gets a network id
    for (const e of g.items.list) if (!e.nid) e.nid = 'h' + this.nseq++;
    S.on('m', (m, from) => this.onMachineOp(m, from));
    S.on('m+', (m) => this.onMachineNew(m));
    S.on('bal', (m, from) => this.onBalance(m, from));
    S.on('order', (m) => { if (m.d) this.apply(() => g.delivery.order(m.d, m.o || {})); });
    S.on('disc', (m) => { if (m.k) g.discover(m.k, m.f || 'normal'); });
    S.on('me', (m, from) => this.onLedger(m, from));
    // the world keeps turning while the host sits in a menu (friends are still playing)
    const C = g.clock;
    if (C && !C._netHost) {
      C._netHost = true;
      const pr = C.pauseReason.bind(C);
      C.pauseReason = () => { const r = pr(); return r && this.mp.active && this.s.count > 1 && ['paused', 'menu', 'reading', 'cutscene'].includes(r) ? null : r; };
    }
  }

  installGuest() {
    const g = this.game, S = this.s, W = g.wallet;
    // the host's loose items, with their network ids
    for (const it of g.state.netItems || []) this.spawnRemote(it);
    delete g.state.netItems;
    S.on('M', (m) => this.onMachines(m));
    S.on('W', (m) => { W.s.piggy = m.pg ?? W.s.piggy; W.s.register = m.rg ?? W.s.register; });
    S.on('fix', (m) => { if (m.cash) { W.s.cash = Math.max(0, W.s.cash + m.cash); g.updateMoney(false, m.cash); if (m.msg) g.news(m.msg, '', 3500); } });
    S.on('clk', (m) => this.onClock(m));
    S.on('itp', (m) => this.onItemPos(m));
    S.on('gone', (m) => this.onGone(m));
    // the host's clock rules: the guest's runs on between ticks, and never stops for the guest's own menus
    const C = g.clock;
    if (C) {
      C.update = (dt) => { if (this.hostClock?.p) return; C.s.started = true; C.advanceReal(dt * C.speed); };
      // days, bills and loans are the host's business
      if (g.bills) g.bills.onDay = () => {};
      if (g.sim?.loans) g.sim.loans.onDay = () => {};
      if (g.sim) { g.sim.onNewDay = () => {}; g.sim.endDay = (reason) => ({ reason }); }
    }
    // a customer's turn on a guest's screen is for show: no stock, no coins (the host's customers do that)
    for (const m of g.machines) this.guestMachine(m);
    // takings from customers into the register / tips: the host's
    if (g.decor) { g.decor.tip = () => true; g.decor.toRegister = () => true; }
    // money that turns up without you doing anything (museum visitors, online sales, refunds...) is the host's
    const addMoney = g.addMoney.bind(g);
    g.addMoney = (v, quiet, reason) => { if (this.applying || this.acting()) return addMoney(v, quiet, reason); };
    const addBank = W.addBank.bind(W), addCash = W.addCash.bind(W);
    W.addBank = (v, r) => (this.applying || this.acting() ? addBank(v, r) : 0);
    W.addCash = (v, r) => (this.applying || this.acting() || this.cashInFlight ? addCash(v, r) : 0);
    // orders go to the host (their courier brings them into the shared world)
    const order = g.delivery.order.bind(g.delivery);
    g.delivery.order = (data, opts = {}) => {
      if (this.applying) return order(data, opts);
      const o = {}; for (const k of ['eta', 'minutes', 'delay', 'instant']) if (opts[k] !== undefined) o[k] = opts[k];
      S.toHost({ t: 'order', d: JSON.parse(JSON.stringify(data)), o });
      g.events?.emit('deliveryOrdered', { data, eta: opts.eta });
    };
    // shared money: the piggy bank (the team wallet) and the register
    this.wrapFeature('piggy', 'use'); this.wrapFeature('piggy', 'secondary'); this.wrapFeature('register', 'use');
    // finds go into the shop's collection book
    g.events.on('discover', ({ key, finish }) => S.toHost({ t: 'disc', k: key, f: finish }));
    // museum visitors and market ticks belong to the host's world
    const vis = g.museum?.visitors;
    if (vis) vis.spawn = () => null;
    if (g.market) g.market.tick = () => {};
  }

  guestMachine(m) {
    if (m._netGuest) return;
    m._netGuest = true;
    m.customerPlay = function () {
      if (!this.canPlay()) return null;
      const g = this.game, price = this.price, n = Math.max(1, Math.round(price / 100));
      const series = this.data.stock[Math.floor(Math.random() * this.data.stock.length)];
      const slotP = this.local(this.L.slot.x, this.L.slot.y, this.L.front + 0.02);
      for (let i = 0; i < Math.min(n, 10); i++) g.tweens.wait(i * 0.13, () => audio.play('coinInsert', { pos: slotP, vol: 0.55 }));
      const t0 = Math.min(n, 10) * 0.13 + 0.2;
      g.tweens.wait(t0, () => { this.spin = { t: 0, dur: 0.85 }; });
      g.tweens.wait(t0 + 0.9, () => this.openFlap());
      return { series, price, coins: n };
    };
    this.mBase.set(m.data.id, this.mState(m));
  }

  /** Wrap one furniture feature on a guest: the change it makes to a shared balance goes to the host. */
  wrapFeature(name, fn) {
    const F = FEATURES[name];
    if (!F?.[fn] || F[fn]._net) return;
    const orig = F[fn];
    const W = this.game.wallet;
    F[fn] = (...a) => {
      const pg = W.s.piggy, rg = W.s.register;
      this.cashInFlight = true;
      setTimeout(() => { this.cashInFlight = false; }, 4000);
      const r = orig.apply(F, a);
      const dp = W.s.piggy - pg, dr = W.s.register - rg;
      if (dp) this.s.toHost({ t: 'bal', k: 'piggy', d: dp });
      if (dr) this.s.toHost({ t: 'bal', k: 'register', d: dr });
      return r;
    };
    F[fn]._net = true;
  }

  // ------------------------------------------------------------------ per tick (10 Hz from the net plugin)
  tick(n) {
    if (this.host) {
      if (n % 3 === 0) this.sendMachines();
      if (n % 3 === 1) this.sendBalances();
      if (n % 10 === 0) { this.sendClock(); this.sendItemPositions(); }
      if (n % 10 === 5) this.sendDecorSt();
      if (n % 5 === 3) this.sendFixtures();
      if (n % 5 === 4) this.syncDisplays();
    } else {
      if (n % 2 === 0) this.guestMachineOps();
      if (n % 5 === 2) this.guestDecorSt();
      if (n % 30 === 7) this.sendLedger();
      if (n % 5 === 3) this.guestFixtures();
      if (n % 5 === 4) this.syncDisplays();
    }
  }

  // ------------------------------------------------------------------ machines
  mState(m) {
    const d = m.data;
    return { counts: countBy(d.stock), cash: d.cash || 0, price: d.price, series: d.series, lid: m.lid.target > 0 ? 1 : 0 };
  }
  mSer(m) {
    const d = m.data;
    return { id: d.id, type: d.type, slot: d.slot, variant: d.variant, used: d.used, grade: d.grade, series: d.series, price: d.price, cash: d.cash || 0, st: countBy(d.stock), lid: m.lid.target > 0 ? 1 : 0, broken: d.broken || 0, fallen: d.fallen || 0, up: d.up };
  }

  sendMachines() {
    const g = this.game, out = [];
    for (const m of g.machines) {
      const ser = this.mSer(m), j = JSON.stringify(ser);
      if (this.mSent.get(ser.id) !== j || this.forceM) { this.mSent.set(ser.id, j); out.push(ser); }
    }
    const ids = g.machines.map((m) => m.data.id).join(',');
    const idsChanged = ids !== this.mIds;
    if (!out.length && !idsChanged) return;
    this.mIds = ids;
    this.s.broadcast({ t: 'M', l: out, ids: idsChanged ? g.machines.map((m) => m.data.id) : undefined, ack: Object.fromEntries(this.mAck) });
    this.forceM = false;
  }

  /** Guest: a machine state from the host. */
  onMachines(msg) {
    const g = this.game, me = this.s.myId;
    for (const ser of msg.l || []) {
      let m = g.machines.find((x) => x.data.id === ser.id);
      if (!m) { m = this.createMachine(ser); if (!m) continue; }
      this.flushMachine(m); // anything we did since the last tick goes out first (and holds this state back)
      const sent = this.mSeq.get(ser.id) || 0, ack = msg.ack?.[`${me}|${ser.id}`] || 0;
      if (ack < sent) continue; // our own change hasn't come back yet: don't undo it
      // mid-animation here (lid, coin drawer, a test turn): catch up once it's over
      if (m.lid.busy || m.drawer.busy || m.state !== 'idle') { this.mLate.set(ser.id, { ser, ack: msg.ack }); continue; }
      this.mLate.delete(ser.id);
      this.apply(() => this.applyMachine(m, ser));
      this.mBase.set(ser.id, this.mState(m));
    }
    if (msg.ids) {
      for (const m of [...g.machines]) if (!msg.ids.includes(m.data.id)) this.removeMachine(m);
    }
  }

  createMachine(ser) {
    const g = this.game;
    if (g.machines.some((m) => m.data.slot === ser.slot)) return null;
    const data = { id: ser.id, type: ser.type, slot: ser.slot, up: ser.up || { speed: 0, cap: 0, coins: 0 }, stock: [], series: ser.series, price: ser.price, cash: ser.cash };
    for (const k of ['variant', 'used', 'grade']) if (ser[k] !== undefined) data[k] = ser[k];
    for (const [s, n] of Object.entries(ser.st || {})) for (let i = 0; i < n; i++) data.stock.push(s);
    g.state.machines.push(data);
    let m = null;
    this.apply(() => { m = new GachaMachine(g, data); g.machines.push(m); });
    if (!this.host) this.guestMachine(m);
    return m;
  }

  removeMachine(m) {
    const g = this.game;
    m.dispose();
    g.machines.splice(g.machines.indexOf(m), 1);
    const i = g.state.machines.indexOf(m.data);
    if (i >= 0) g.state.machines.splice(i, 1);
  }

  /** Make a machine match a state (stock by series counts, coins, price, card, lid) with its visuals. */
  applyMachine(m, ser) {
    const d = m.data;
    const local = countBy(d.stock);
    for (const s of new Set([...Object.keys(local), ...Object.keys(ser.st || {})])) {
      const diff = (ser.st?.[s] || 0) - (local[s] || 0);
      for (let i = 0; i < -diff; i++) m.takeCapsule(s);
      for (let i = 0; i < diff; i++) { d.stock.push(s); if (m.pile.length < m.maxVisible) m.addPileCapsule(s); }
    }
    if (ser.series && ser.series !== d.series) { d.series = ser.series; m.swapCard(ser.series); }
    if ((d.cash || 0) !== ser.cash) { d.cash = ser.cash; m.updateCoins(); }
    if (ser.price && ser.price !== d.price) { d.price = ser.price; m.drawPrice(); }
    d.broken = ser.broken || undefined; d.fallen = ser.fallen || undefined;
    if (ser.lid && m.lid.target === 0) { m.lid.target = 1; m.lid.locked = false; }
    else if (!ser.lid && m.lid.target > 0 && !m.lid.busy) { m.lid.target = 0; m.lid.locked = true; m.lid.key?.parent?.remove(m.lid.key); m.lid.key = null; }
    m.updateSoldOut();
  }

  /** Guest: what did we change on each machine since the host's last word? */
  guestMachineOps() {
    for (const m of this.game.machines) {
      // a host state that waited for our own animation to finish
      const late = this.mLate.get(m.data.id);
      if (late && !m.lid.busy && !m.drawer.busy && m.state === 'idle') this.onMachines({ l: [late.ser], ack: late.ack });
      else this.flushMachine(m);
    }
  }

  /** Guest: send what we did to one machine (stock in / out by series, coins scooped, price, card, lid). */
  flushMachine(m) {
    const id = m.data.id, base = this.mBase.get(id);
    if (!base) { this.s.toHost({ t: 'm+', d: JSON.parse(JSON.stringify(m.data)) }); this.mBase.set(id, this.mState(m)); return; }
    const cur = this.mState(m), op = { t: 'm', id };
    let any = false;
    const add = {}, take = {};
    for (const s of new Set([...Object.keys(base.counts), ...Object.keys(cur.counts)])) {
      const diff = (cur.counts[s] || 0) - (base.counts[s] || 0);
      if (diff > 0) { add[s] = diff; any = true; } else if (diff < 0) { take[s] = -diff; any = true; }
    }
    if (any) { if (Object.keys(add).length) op.add = add; if (Object.keys(take).length) op.take = take; }
    if (cur.cash !== base.cash) { op.cash = cur.cash - base.cash; any = true; }
    if (cur.price !== base.price) { op.price = cur.price; any = true; }
    if (cur.series !== base.series) { op.series = cur.series; any = true; }
    if (cur.lid !== base.lid) { op.lid = cur.lid; any = true; }
    if (!any) return;
    const seq = (this.mSeq.get(id) || 0) + 1;
    this.mSeq.set(id, seq);
    op.seq = seq;
    this.s.toHost(op);
    this.mBase.set(id, cur);
  }

  /** Host: a guest did something to a machine. */
  onMachineOp(op, from) {
    const g = this.game, m = g.machines.find((x) => x.data.id === op.id);
    if (!m) return;
    const d = m.data;
    this.apply(() => {
      for (const [s, n] of Object.entries(op.take || {})) for (let i = 0; i < n; i++) if (d.stock.includes(s)) m.takeCapsule(s);
      for (const [s, n] of Object.entries(op.add || {})) for (let i = 0; i < n; i++) { d.stock.push(s); if (m.pile.length < m.maxVisible) m.addPileCapsule(s); }
      if (op.series && op.series !== d.series) { d.series = op.series; m.swapCard(op.series); }
      if (op.price) m.price = op.price;
      if (op.cash) {
        if (op.cash < 0) {
          const want = -op.cash, got = Math.min(want, d.cash || 0);
          d.cash = (d.cash || 0) - got;
          if (got > 0) g.events.emit('coinsCollected', { machine: m, amount: got, by: from });
          if (got < want) this.s.send(from, { t: 'fix', cash: -(want - got), msg: 'Someone emptied that coin box first' });
        } else d.cash = (d.cash || 0) + op.cash;
        m.updateCoins();
      }
      if (op.lid !== undefined) {
        if (op.lid && m.lid.target === 0) { m.lid.target = 1; m.lid.locked = false; }
        else if (!op.lid && m.lid.target > 0) { m.lid.target = 0; m.lid.locked = true; m.lid.key?.parent?.remove(m.lid.key); m.lid.key = null; }
      }
      m.updateSoldOut();
    });
    this.mAck.set(`${from}|${op.id}`, op.seq || 0);
    this.mSent.delete(op.id); // send the result (and the ack) next tick
  }

  onMachineNew(msg) {
    const d = msg.d;
    if (!d?.id || this.game.machines.some((m) => m.data.id === d.id || m.data.slot === d.slot)) return;
    const st = countBy(d.stock || []);
    this.createMachine({ ...d, st });
  }

  // ------------------------------------------------------------------ the shared money
  sendBalances() {
    const W = this.game.wallet, j = `${W.s.piggy}|${W.s.register}`;
    if (j === this.balSent && !this.forceW) return;
    this.balSent = j; this.forceW = false;
    this.s.broadcast({ t: 'W', pg: W.s.piggy, rg: W.s.register });
  }

  onBalance(m, from) {
    const g = this.game, W = g.wallet, k = m.k === 'register' ? 'register' : 'piggy';
    const d = Math.round(+m.d || 0);
    if (!d) return;
    if (d > 0) W.s[k] += d;
    else {
      const got = Math.min(-d, W.s[k]);
      W.s[k] -= got;
      if (got < -d) this.s.send(from, { t: 'fix', cash: -(-d - got), msg: k === 'piggy' ? 'The piggy bank had less in it than you thought' : 'Someone already took the takings' });
    }
    W.emit(k, d);
    const p = this.s.players.get(from);
    if (k === 'piggy' && p) this.mp.social?.feed(`${p.name} ${d > 0 ? 'dropped' : 'shook out'} ¥${Math.abs(d).toLocaleString('en-US')} ${d > 0 ? 'into' : 'from'} the piggy bank`);
    this.forceW = true;
  }

  // ------------------------------------------------------------------ the clock
  sendClock() {
    const C = this.game.clock;
    if (!C) return;
    this.s.broadcast({ t: 'clk', d: C.s.day, m: Math.round(C.s.minute * 100) / 100, p: C.paused ? 1 : 0, o: C.s.started ? 1 : 0 });
  }
  onClock(m) {
    const C = this.game.clock;
    if (!C) return;
    this.hostClock = m;
    const host = (m.d - 1) * 1440 + m.m, mine = C.stamp;
    if (Math.abs(host - mine) > 1.5) {
      const newDay = m.d !== C.s.day;
      C.s.day = m.d; C.s.minute = m.m; C._sun.key = '';
      this.game.events.emit('clockSkip', { from: mine, to: host });
      if (newDay) this.game.events.emit('newDay', { day: m.d, date: this.game.calendar?.dateOf(m.d), skipped: true });
      this.game.lighting?.refresh?.();
    }
  }

  // ------------------------------------------------------------------ items on the floor
  itemSer(e) {
    const o = e.obj, p = e.body ? e.body.pos : o.position;
    const out = { n: e.nid, k: e.kind, d: e.data, p: [r3(p.x), r3(p.y), r3(p.z)], r: r3(o.rotation.y) };
    if (e.body && e.body.vel.lengthSq() > 0.01) out.v = [r3(e.body.vel.x), r3(e.body.vel.y), r3(e.body.vel.z)];
    if (e.kind === 'toy') out.p[1] = r3(o.position.y - (e.body ? e.body.radius : 0));
    return out;
  }
  itemList() {
    const out = [];
    for (const e of this.game.items.list) {
      if (e.data?.story || e.kind === 'cat') continue;
      if (!e.nid) e.nid = 'h' + this.nseq++;
      out.push(this.itemSer(e));
    }
    return out;
  }
  findItem(nid) { for (const e of this.game.items.list) if (e.nid === nid) return e; return null; }

  wrapItems() {
    const I = this.game.items, self = this;
    for (const fn of ['spawnCapsule', 'spawnToy', 'spawnBox', 'spawnTool']) {
      const orig = I[fn].bind(I);
      I[fn] = function (...a) {
        const e = orig(...a);
        if (e && !e.nid) self.spawned(e);
        return e;
      };
    }
    const detach = I.detach.bind(I);
    I.detach = (e) => {
      const had = I.list.has(e);
      detach(e);
      if (had && e.nid && !this.applying && this.mp.active) this.s.broadcast({ t: 'it-', n: e.nid });
    };
  }

  /** A new loose item appeared here. */
  spawned(e) {
    if (this.applying) return; // (the remote add sets its own id)
    if (e.data?.story) return;
    const mine = this.s?.myId || 'x';
    e.nid = `${mine}.${this.nseq++}`;
    if (!this.mp.active) return;
    if (!this.host && !this.acting()) {
      // something the guest's own copy of the lane made up (litter, daily trash...): the host's world has its own
      setTimeout(() => { if (this.game.items.list.has(e)) this.apply(() => this.game.items.destroy(e)); }, 0);
      return;
    }
    // where it ends up: send once it is placed (tool / toy positions are set right after spawning)
    setTimeout(() => { if (this.game.items.list.has(e)) this.s.broadcast({ t: 'it+', ...this.itemSer(e) }); }, 0);
  }

  onItemAdd(m, from) {
    if (!m.n || this.findItem(m.n)) return;
    this.spawnRemote(m);
    if (this.host) this.s.broadcast({ ...m, t: 'it+' }, from);
  }

  spawnRemote(m) {
    const g = this.game, I = g.items, p = new THREE.Vector3(...m.p);
    let e = null;
    this.apply(() => {
      try {
        if (m.k === 'capsule') e = I.spawnCapsule(m.d, p, m.v ? new THREE.Vector3(...m.v) : null);
        else if (m.k === 'toy') e = I.spawnToy(m.d, p, { physics: false, rotY: m.r || 0 });
        else if (m.k === 'box') { const mesh = g.delivery.meshFor(m.d); e = I.spawnBox(m.d, p, mesh); e.obj.rotation.y = m.r || 0; }
        else if (m.k === 'tool') { e = I.spawnTool(m.d, p, m.r || 0); e.obj.position.copy(p); }
      } catch (err) { console.warn('[net] item spawn', m.k, err); }
    });
    if (e) e.nid = m.n;
    return e;
  }

  onItemDel(m, from) {
    const e = this.findItem(m.n);
    if (e) this.apply(() => this.game.items.destroy(e));
    if (this.host) {
      if (!e && from !== 'H') this.s.send(from, { t: 'gone', n: m.n });
      else this.s.broadcast({ t: 'it-', n: m.n }, from);
    }
  }

  /** Guest: we picked up something someone else got first. */
  onGone(m) {
    const H = this.game.held;
    const i = H.slots.findIndex((s) => s?.ent?.nid === m.n);
    if (i < 0) return;
    H.consume(i);
    this.game.news('Too slow!', 'Someone else grabbed it first', 3000);
  }

  sendItemPositions() {
    const l = [];
    for (const e of this.game.items.list) {
      if (!e.nid || !e.body) continue;
      const p = e.body.pos, prev = this.posSent.get(e.nid);
      if (prev && Math.abs(prev[0] - p.x) + Math.abs(prev[1] - p.y) + Math.abs(prev[2] - p.z) < 0.03) continue;
      const a = [r3(p.x), r3(p.y), r3(p.z)];
      this.posSent.set(e.nid, a);
      l.push([e.nid, ...a]);
    }
    if (l.length) this.s.broadcast({ t: 'itp', l });
  }
  onItemPos(m) {
    for (const [n, x, y, z] of m.l || []) {
      const e = this.findItem(n);
      if (!e) continue;
      if (e.body) { if (e.body.pos.distanceTo(_p.set(x, y, z)) > 0.04) { e.body.pos.set(x, y, z); e.body.vel.multiplyScalar(0.2); e.body.wake?.(); } }
      else e.obj.position.set(x, y, z);
    }
  }

  // ------------------------------------------------------------------ furniture
  wrapDecor() {
    const D = this.game.decor;
    if (!D || D._net) return;
    D._net = true;
    const place = D.place.bind(D), move = D.move.bind(D), remove = D.remove.bind(D);
    const pose = (d) => ({ x: d.x, y: d.y, z: d.z, rot: d.rot, wall: d.wall, on: d.on });
    D.place = (id, ps, opts = {}) => {
      const p = place(id, ps, opts);
      if (p && !this.applying && this.mp.active) this.s.broadcast({ t: 'dec', op: 'place', id, u: p.data.uid, pose: pose(p.data), st: p.data.st });
      return p;
    };
    D.move = (p, ps) => {
      const r = move(p, ps);
      if (!this.applying && this.mp.active) this.s.broadcast({ t: 'dec', op: 'move', u: p.data.uid, pose: pose(p.data) });
      return r;
    };
    D.remove = (p, opts = {}) => {
      const r = remove(p, opts);
      if (!opts.keepData && !this.applying && this.mp.active) this.s.broadcast({ t: 'dec', op: 'remove', u: p.data.uid });
      return r;
    };
    this.game.events.on('decorUse', (e) => { if (e?.uid) this.decUse.set(e.uid, performance.now()); });
  }

  onDecor(m, from) {
    const D = this.game.decor;
    if (!D) return;
    const p = D.pieces.get(m.u);
    this.apply(() => {
      try {
        if (m.op === 'place' && !p) D.place(m.id, m.pose, { uid: m.u, st: m.st || {}, animate: true });
        else if (m.op === 'move' && p) D.move(p, m.pose);
        else if (m.op === 'remove' && p) D.remove(p);
      } catch (e) { console.warn('[net] decor', m.op, e); }
    });
    if (this.host) this.s.broadcast(m, from);
  }

  sendDecorSt() {
    const D = this.game.decor;
    if (!D) return;
    for (const p of D.pieces.values()) {
      const j = JSON.stringify(p.data.st || {});
      if (this.stSent.get(p.data.uid) === j) continue;
      const first = !this.stSent.has(p.data.uid);
      this.stSent.set(p.data.uid, j);
      if (!first) this.s.broadcast({ t: 'dst', u: p.data.uid, st: p.data.st });
    }
  }
  guestDecorSt() {
    const D = this.game.decor;
    if (!D) return;
    const now = performance.now();
    for (const p of D.pieces.values()) {
      const j = JSON.stringify(p.data.st || {}), prev = this.stSent.get(p.data.uid);
      if (prev === undefined) { this.stSent.set(p.data.uid, j); continue; }
      if (prev === j) continue;
      this.stSent.set(p.data.uid, j);
      if (now - (this.decUse.get(p.data.uid) || -1e9) < 4000) this.s.toHost({ t: 'dst', u: p.data.uid, st: p.data.st });
    }
  }
  onDecorSt(m, from) {
    const D = this.game.decor, p = D?.pieces.get(m.u);
    if (!p) return;
    p.data.st = m.st || {};
    this.stSent.set(m.u, JSON.stringify(p.data.st));
    try {
      if (p.feature?.refresh) p.feature.refresh(p, this.game);
      else if (p.feature === STORAGE) STORAGE.refresh(p, this.game);
    } catch (e) { console.warn('[net] decor state', e); }
    if (this.host) this.s.broadcast(m, from);
  }

  // ------------------------------------------------------------------ figures on shelves and in the museum's cases
  /** Every display with a key both sides agree on: wall shelves by their order, museum fittings by uid. */
  displays() {
    const g = this.game, out = [];
    g.shelves.forEach((sh, i) => { if (sh.display) out.push(['s' + i, sh.display]); });
    for (const p of g.museum?.placed || []) if (p.display) out.push(['m' + p.data.uid, p.display]);
    return out;
  }
  /** Host: what changed goes to everyone. Guest: what we put down / took goes to the host. */
  syncDisplays() {
    const seen = (this.dspSeen ||= new Map());
    for (const [k, d] of this.displays()) {
      d.items.forEach((it, i) => {
        const key = k + '|' + i, j = JSON.stringify(it || null), prev = seen.get(key);
        if (prev === j) return;
        seen.set(key, j);
        if (prev === undefined) return;
        if (this.host) this.s.broadcast({ t: 'dsp', k, i, it: it || null });
        else if (this.acting()) this.s.toHost({ t: 'dsp', k, i, it: it || null });
      });
    }
  }
  onDisplay(m, from) {
    const d = this.displays().find((x) => x[0] === m.k)?.[1];
    if (!d || !d.slots[m.i]) return;
    const cur = JSON.stringify(d.items[m.i] || null), want = JSON.stringify(m.it || null);
    (this.dspSeen ||= new Map()).set(m.k + '|' + m.i, want);
    if (cur !== want) {
      this.apply(() => {
        if (!m.it) d.clearItem(m.i);
        else { d.items[m.i] = { ...m.it }; d.showItem(m.i, d.items[m.i], true); if (this.host) this.game.onDisplayChanged?.(m.it.k, d, d.slots[m.i]); }
      });
    }
    if (this.host) this.s.broadcast(m, from);
  }

  // ------------------------------------------------------------------ the garage itself: lights, shutter, OPEN sign
  fixtures() {
    const g = this.game, G = g.garage;
    return { l: G.lightsOn ? 1 : 0, sh: Math.round((G.shutterOpen ?? 1) * 50) / 50, so: g.life?.signOpen ? 1 : 0 };
  }
  sendFixtures() {
    const f = this.fixtures(), j = JSON.stringify(f);
    if (j === this.fxSent && !this.forceW) return;
    this.fxSent = j;
    this.s.broadcast({ t: 'fx', ...f });
  }
  /** Guest: we flicked the switch / rolled the shutter / flipped the sign. */
  guestFixtures() {
    if (!this.fxBase) return;
    const f = this.fixtures(), b = this.fxBase;
    if (f.l === b.l && f.sh === b.sh && f.so === b.so) return;
    if (!this.acting()) return;
    this.fxBase = f;
    this.s.toHost({ t: 'fx', ...f });
  }
  onFixtures(m, from) {
    const g = this.game, G = g.garage, f = this.fixtures();
    this.apply(() => {
      if (m.l !== undefined && m.l !== f.l) { G.setLights(!!m.l); g.state.lightsOn = !!m.l; }
      if (m.sh !== undefined && Math.abs(m.sh - f.sh) > 0.01) G.setShutter(m.sh);
      if (m.so !== undefined && m.so !== f.so && g.life?.sign?.flip) g.life.sign.flip(!!m.so, { quiet: true });
    });
    if (this.host) { this.fxSent = ''; void from; } else this.fxBase = this.fixtures();
  }

  // ------------------------------------------------------------------ a guest's own pockets, kept by the host
  sendLedger() {
    const g = this.game, W = g.wallet;
    const m = { t: 'me', cash: W.s.cash, bank: W.s.bank, pin: W.s.pin ?? null, inv: g.held.busy ? undefined : g.held.serialize() };
    const j = JSON.stringify(m);
    if (j === this.ledgerSent) return;
    this.ledgerSent = j;
    this.s.toHost(m);
  }
  onLedger(m, from) {
    const p = this.s.players.get(from);
    if (!p?.pid) return;
    const L = this.mp.ledger.players[p.pid] ||= {};
    L.name = p.name;
    if (Number.isFinite(m.cash)) L.cash = Math.max(0, Math.round(m.cash));
    if (Number.isFinite(m.bank)) L.bank = Math.max(0, Math.round(m.bank));
    if (m.pin !== undefined) L.pin = m.pin;
    if (Array.isArray(m.inv)) L.inv = m.inv;
    L.last = Date.now();
    p.cash = L.cash;
  }

  /** Host: everything once more (after a guest rejoins). */
  resync() { this.mSent.clear(); this.forceW = true; this.fxSent = ''; }
}

const _p = new THREE.Vector3();
