// Money you can hold (src/money/): game.wallet (created by Game itself, so old saves migrate before anything reads
// state.money), the street ATM across the lane, the bank statement on the computer only seeing bank-side money, the
// input gate the ATM and the builder share, and debug helpers (game.moneyDebug).
import * as THREE from 'three';
import { Game } from '../game/Game.js';
import { Atm } from '../money/atm.js';
import { installInputGate } from '../money/gate.js';
import { cashInHand } from '../money/cashfx.js';
import '../money/money.css';
import '../money/sfx.js';

export function install(game) {
  const g = game, W = g.wallet;
  if (!W) return;
  installInputGate(g);
  bankStatement(g);
  // the ATM kiosk: across the lane between the street lamp and the vending machines, facing the shop
  const atm = new Atm(g, { x: -1.68, z: 14.45, rotY: Math.PI });
  g.atm = atm;
  Game.updaters.push((gg, dt) => atm.update(dt));
  if (W.migrated) g.tweens.wait(3, () => g.news('Your money is split now', `${fmtY(W.cash)} cash in your wallet, ${fmtY(W.bank)} in the bank (ATM across the lane)`, 8000));
  g.moneyDebug = {
    wallet: () => ({ cash: W.cash, bank: W.bank, piggy: W.piggy, register: W.register }),
    cash: (n = 10000) => cashInHand(g, n, { from: g.camera.localToWorld(new THREE.Vector3(0, -0.3, -0.8)) }),
    atm: () => { const p = atm.root.localToWorld(new THREE.Vector3(0, 0, 0.78)); g.player.pos.set(p.x, 0, p.z); g.player.yaw = Math.atan2(p.x - atm.root.position.x, p.z - atm.root.position.z); g.player.pitch = -0.5; return true; },
  };
}

const fmtY = (n) => '¥' + Math.round(n).toLocaleString('en-US');

/** The bank app wraps addMoney / spend to log every yen: only bank-side money belongs on the statement. */
function bankStatement(g) {
  const B = g.os?.bank, W = g.wallet;
  if (!B?.record || B._walletAware) return;
  B._walletAware = true;
  const record = B.record.bind(B);
  B.record = (d, label) => { if (W.channel() === 'bank') record(d, label); };
  const st = g.os.st?.bank;
  if (st) {
    // a fresh statement starts from the bank balance; a migrated save gets one tidy line for the cash taken out
    if (!st.tx.length) st.bal = W.bank;
    else if (W.migrated && st.bal != null && Math.round(W.bank - st.bal) !== 0) W.via('bank', () => record(W.bank - st.bal, 'Cash withdrawal (into your wallet)'));
  }
}
