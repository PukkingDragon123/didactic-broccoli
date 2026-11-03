// Paying and being paid in cash at the places around the lane (Mikawa-ya, vending machines, the ramen shop, the side
// jobs). Uses the wallet and the cash animations of src/money/ when they are there.
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { cashInHand, payOut } from '../money/cashfx.js';

/** Pay `amount` from your wallet (cash). to: world point the coins fly to. Returns false (nothing paid) when short. */
export function payCash(game, amount, reason = '', to = null) {
  const g = game, W = g.wallet;
  if (W && W.cash < amount) { g.shortOf?.('cash', amount); try { audio.play('error', { vol: 0.4 }); } catch { /* */ } return false; }
  const ok = W ? W.via('cash', () => g.spend(amount, reason)) : g.spend(amount, reason);
  if (ok && to) { try { payOut(g, amount, to); } catch { audio.play('coinClink', { pos: to, vol: 0.5 }); } }
  return ok !== false;
}

/** Wages / change into your hand (counted into the wallet as earnings). */
export function earnCash(game, amount, { from = null, label = null, done = null } = {}) {
  const g = game;
  amount = Math.round(amount);
  if (!(amount > 0)) { done?.(); return; }
  const credit = (v) => (g.wallet ? g.wallet.via('cash', () => g.addMoney(v, true)) : g.addMoney(v, true));
  try { cashInHand(g, amount, { from: from || g.camera.localToWorld(new THREE.Vector3(0, -0.2, -0.8)), onNote: credit, label, done }); }
  catch { credit(amount); g.news(`+¥${amount.toLocaleString('en-US')}`, label || ''); done?.(); }
}

export const yen = (n) => '¥' + Math.round(n).toLocaleString('en-US');
