// game.wallet: money you can hold. Physical cash (your wallet, shown on the HUD), the bank account (seen only on the
// computer and at the ATM), the piggy bank in the shop (the shared wallet in multiplayer later) and the cash
// register / tray on the counter (customers' money can go in there).
//
//   wallet.cash / bank / piggy / register      balances in yen (read-only numbers)
//   wallet.channel()                           'cash' or 'bank': where game.addMoney / game.spend go right now
//                                              (sitting at the computer = online = bank; anywhere else = cash)
//   wallet.via('bank' | 'cash', fn)            run fn with game.addMoney / game.spend forced onto one side
//   wallet.addCash(v, reason) / takeCash(v, reason) -> bool
//   wallet.addBank(v, reason) / takeBank(v, reason) -> bool      (no XP / earnings bookkeeping: use the sim for that)
//   wallet.deposit(v) / withdraw(v) -> bool    cash <-> bank (the ATM)
//   wallet.toPiggy(v) / fromPiggy(v) -> bool   cash <-> piggy bank
//   wallet.toRegister(v) / emptyRegister() -> amount   customers' money into the register; you take it all out
//   wallet.total()                             cash + bank + piggy + register
// game.state.money is kept as a live alias of the current channel (old code reads and writes it), so a v2 save's
// money is migrated once: up to ¥5,000 into your wallet, the rest into the bank.
// Events: 'wallet' { kind: 'cash'|'bank'|'piggy'|'register'|'deposit'|'withdraw', delta, cash, bank, piggy, register }.
import { ensureState } from '../game/stateExt.js';
import { START_MONEY } from '../game/economy.js';

export const MIGRATE_CASH = 5000;

export class Wallet {
  constructor(game) {
    this.game = game;
    const st = game.state;
    const fresh = !st.wallet;
    // a v2 save (or a fresh one) has only state.money: split it once
    const old = Number.isFinite(+st.money) ? Math.max(0, Math.round(+st.money)) : START_MONEY;
    this.s = ensureState(game, 'wallet', { v: 1, cash: 0, bank: 0, piggy: 0, register: 0, pin: null, card: true, atm: { tries: 0, lockUntil: 0, txn: 0 } });
    if (fresh) {
      const brandNew = !st.story?.intro && !(st.machines?.length);
      // a new game: the start money is in your pocket; an older save keeps a little cash and banks the rest
      const cash = brandNew ? old : Math.min(old, MIGRATE_CASH);
      this.s.cash = cash;
      this.s.bank = old - cash;
      this.migrated = !brandNew;
    }
    for (const k of ['cash', 'bank', 'piggy', 'register']) this.s[k] = Math.max(0, Math.round(+this.s[k] || 0));
    this.forced = [];
    // state.money: a live alias of whichever side is in use (JSON saves its current value; unused on load)
    const self = this;
    Object.defineProperty(st, 'money', {
      configurable: true, enumerable: true,
      get() { return self.s[self.channel()]; },
      set(v) { self.s[self.channel()] = Math.max(0, Math.round(+v || 0)); },
    });
  }

  get cash() { return this.s.cash; }
  get bank() { return this.s.bank; }
  get piggy() { return this.s.piggy; }
  get register() { return this.s.register; }
  get balance() { return this.s.bank; }
  total() { return this.s.cash + this.s.bank + this.s.piggy + this.s.register; }

  /** Where game.addMoney / game.spend go right now. */
  channel() {
    if (this.forced.length) return this.forced[this.forced.length - 1];
    return this.game.pc?.active ? 'bank' : 'cash';
  }

  /** Run fn with money calls forced onto 'bank' or 'cash'. */
  via(ch, fn) {
    this.forced.push(ch);
    try { return fn(); } finally { this.forced.pop(); }
  }

  emit(kind, delta) {
    const s = this.s;
    this.game.events.emit('wallet', { kind, delta, cash: s.cash, bank: s.bank, piggy: s.piggy, register: s.register });
  }

  // ------------------------------------------------------------------ raw moves (no XP / earnings bookkeeping)
  addCash(v, reason = '') { v = Math.round(v); if (!(v > 0)) return 0; this.s.cash += v; this.emit('cash', v, reason); return v; }
  takeCash(v) { v = Math.round(v); if (!(v > 0)) return true; if (this.s.cash < v) return false; this.s.cash -= v; this.emit('cash', -v); return true; }
  addBank(v, reason = '') {
    v = Math.round(v); if (!(v > 0)) return 0;
    this.s.bank += v; this.record(v, reason || 'Deposit'); this.emit('bank', v); return v;
  }
  takeBank(v, reason = '') {
    v = Math.round(v); if (!(v > 0)) return true; if (this.s.bank < v) return false;
    this.s.bank -= v; this.record(-v, reason || 'Withdrawal'); this.emit('bank', -v); return true;
  }

  /** Cash into the bank (the ATM). */
  deposit(v, label = 'ATM deposit') {
    v = Math.round(v);
    if (!(v > 0) || this.s.cash < v) return false;
    this.s.cash -= v; this.s.bank += v;
    this.record(v, label);
    this.emit('deposit', v);
    return true;
  }
  /** Bank into cash (the ATM). fee: charged to the account on top. */
  withdraw(v, fee = 0, label = 'ATM withdrawal') {
    v = Math.round(v); fee = Math.round(fee);
    if (!(v > 0) || this.s.bank < v + fee) return false;
    this.s.bank -= v + fee; this.s.cash += v;
    this.record(-v, label);
    if (fee) this.record(-fee, 'ATM fee');
    this.emit('withdraw', v);
    return true;
  }
  /** An account charge without cash changing hands (ATM fee, bill paid at the ATM...). */
  charge(v, label) { return this.takeBank(v, label); }

  toPiggy(v) { v = Math.round(v); if (!(v > 0) || this.s.cash < v) return false; this.s.cash -= v; this.s.piggy += v; this.emit('piggy', v); return true; }
  fromPiggy(v) { v = Math.min(Math.round(v), this.s.piggy); if (!(v > 0)) return false; this.s.piggy -= v; this.s.cash += v; this.emit('piggy', -v); return true; }
  toRegister(v) { v = Math.round(v); if (!(v > 0)) return 0; this.s.register += v; this.emit('register', v); return v; }
  emptyRegister() { const v = this.s.register; if (!v) return 0; this.s.register = 0; this.s.cash += v; this.emit('register', -v); return v; }

  /** A line on the online bank statement (game.os.bank) for money that moves without addMoney / spend. */
  record(d, label) {
    const B = this.game.os?.bank;
    if (!B?.record) return;
    this.via('bank', () => B.record(d, label));
  }
}

/** The one-time statement line for a migrated save (so the bank app's running balance is right). */
export function syncStatement(game) {
  const B = game.os?.bank, w = game.wallet;
  if (!B?.sync || !w) return;
  w.via('bank', () => B.sync());
}
