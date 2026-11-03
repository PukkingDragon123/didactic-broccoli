// Physical cash: pixel-art banknotes (Bank of Morio ¥1,000 / ¥5,000 / ¥10,000), little stacks of them, and the
// "cash in hand" moment: notes fly from where they come from (the ATM slot, the register, the piggy bank) into your
// left hand, fan out, and are counted into your wallet one flick at a time.
//   noteMesh(denom) / noteStack(amount) / splitCash(amount) -> { notes: [10000, 5000, 1000...], coins }
//   cashInHand(game, amount, { from, onNote(v), done, label })   the counting animation (credits through onNote)
//   payOut(game, amount, to)     a quick visual of you handing cash over (notes / coins fly from your hand to `to`)
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { draw5 } from '../gfx/font5x7.js';
import { yenCoinGeometry } from '../world/machineModels.js';
import { voxelMaterials } from '../voxel/materials.js';
import './sfx.js';

export const NOTES = [10000, 5000, 1000];
const NOTE_SIZE = { 1000: [0.15, 0.076], 5000: [0.156, 0.076], 10000: [0.16, 0.076] };
const NOTE_COL = {
  1000: { base: '#9ec4d8', mid: '#5e94b6', dark: '#2e5878', ink: '#1e3448', accent: '#d8ecf0' },
  5000: { base: '#c8b6dc', mid: '#9478ba', dark: '#5a4282', ink: '#2e2048', accent: '#ece0f4' },
  10000: { base: '#dcc89a', mid: '#b4925a', dark: '#7a5a30', ink: '#3e2a14', accent: '#f4ead0' },
};

const texCache = new Map();
/** 64 x 32 pixel-art note face. */
export function noteTexture(denom) {
  if (texCache.has(denom)) return texCache.get(denom);
  const C = NOTE_COL[denom] || NOTE_COL[1000];
  const c = document.createElement('canvas');
  c.width = 64; c.height = 32;
  const g = c.getContext('2d');
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  R(0, 0, 64, 32, C.base);
  // guilloche-ish rows of dots and a darker frame
  for (let y = 3; y < 29; y += 3) for (let x = 3 + (y % 2); x < 61; x += 4) R(x, y, 1, 1, C.accent);
  R(0, 0, 64, 1, C.dark); R(0, 31, 64, 1, C.dark); R(0, 0, 1, 32, C.dark); R(63, 0, 1, 32, C.dark);
  R(2, 2, 60, 1, C.mid); R(2, 29, 60, 1, C.mid); R(2, 2, 1, 28, C.mid); R(61, 2, 1, 28, C.mid);
  // the watermark oval (left) and a portrait in a cartouche (right)
  for (let y = 0; y < 18; y++) for (let x = 0; x < 14; x++) { const dx = (x - 6.5) / 7, dy = (y - 8.5) / 9; if (dx * dx + dy * dy < 1) R(6 + x, 7 + y, 1, 1, C.accent); }
  R(41, 6, 17, 20, C.mid);
  R(42, 7, 15, 18, C.base);
  const bust = ['....###....', '...#####...', '...##.##...', '...#####...', '....###....', '.....#.....', '..#######..', '.#########.', '###########', '###########'];
  bust.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') R(44 + i, 12 + j, 1, 1, C.dark); }));
  // denomination
  const n = String(denom);
  draw5(g, n, 22, 5, { col: C.ink });
  draw5(g, n, 60 - (n.length * 6 - 1) - 20, 22, { col: C.dark });
  g.fillStyle = C.ink; g.fillRect(22, 14, 16, 1);
  draw5(g, 'YEN', 23, 16, { col: C.mid });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  texCache.set(denom, t);
  return t;
}

const matCache = new Map();
function noteMat(denom) {
  if (!matCache.has(denom)) matCache.set(denom, new THREE.MeshStandardMaterial({ map: noteTexture(denom), roughness: 0.85, side: THREE.DoubleSide }));
  return matCache.get(denom);
}
const geoCache = new Map();
/** One banknote lying flat (x = length, z = width), centred. */
export function noteMesh(denom) {
  const [w, d] = NOTE_SIZE[denom] || NOTE_SIZE[1000];
  if (!geoCache.has(denom)) { const gg = new THREE.PlaneGeometry(w, d); gg.rotateX(-Math.PI / 2); geoCache.set(denom, gg); }
  const m = new THREE.Mesh(geoCache.get(denom), noteMat(denom));
  m.userData.noRim = true;
  m.userData.denom = denom;
  return m;
}

/** Notes and the coin remainder for an amount. */
export function splitCash(amount) {
  let left = Math.max(0, Math.round(amount));
  const notes = [];
  for (const d of NOTES) while (left >= d && notes.length < 60) { notes.push(d); left -= d; }
  return { notes, coins: left };
}

/** A neat little stack of notes (at most 12 shown). */
export function noteStack(amount, { max = 12 } = {}) {
  const g = new THREE.Group();
  const { notes } = splitCash(amount);
  notes.slice(0, max).forEach((d, i) => {
    const m = noteMesh(d);
    m.position.set((Math.random() - 0.5) * 0.004, i * 0.0012, (Math.random() - 0.5) * 0.003);
    m.rotation.y = (Math.random() - 0.5) * 0.05;
    g.add(m);
  });
  g.userData.notes = notes;
  return g;
}

const _v = new THREE.Vector3();
let busyUntil = 0;

/**
 * Cash into your hand and counted into the wallet. amount = what is counted; from = world position it comes from.
 * onNote(v) credits each piece as it is counted (default: wallet.addCash). done() at the end.
 */
export function cashInHand(game, amount, { from = null, onNote = null, done = null, label = null } = {}) {
  const g = game;
  amount = Math.round(amount);
  if (!(amount > 0)) { done?.(); return; }
  const credit = onNote || ((v) => g.wallet.addCash(v));
  const { notes, coins } = splitCash(amount);
  const anchor = g.held.anchor;
  const hand = new THREE.Group(); // the fan of notes in your left hand
  hand.position.set(-0.075, -0.1, -0.34);
  hand.rotation.set(1.15, 0.3, 0.12);
  anchor.add(hand);
  const shown = notes.slice(0, 10);
  const extra = notes.slice(10).reduce((a, b) => a + b, 0);
  const meshes = [];
  const start = from ? from.clone() : null;
  const t0 = Math.max(0, busyUntil - g.time);
  shown.forEach((d, i) => {
    const m = noteMesh(d);
    m.visible = false;
    hand.add(m);
    meshes.push(m);
    const fanA = (i - (shown.length - 1) / 2) * 0.12;
    g.tweens.add({
      delay: t0 + 0.05 + i * 0.07, dur: 0.32,
      update: (k) => {
        m.visible = true;
        const e = 1 - (1 - k) * (1 - k);
        if (start) {
          // from the world into the hand (positions in the hand's local frame)
          hand.updateWorldMatrix(true, false);
          const local = hand.worldToLocal(_v.copy(start));
          m.position.set(local.x * (1 - e), local.y * (1 - e) + Math.sin(k * Math.PI) * 0.03, local.z * (1 - e) + i * 0.0008);
        } else m.position.set(0, -0.08 * (1 - e), i * 0.0008);
        m.rotation.set(0, fanA * e, 0);
      },
      done: () => { if (i === 0) audio.play('notePaper', { vol: 0.5 }); },
    });
  });
  // the count: flick, flick, flick... (each note shifts across and is credited)
  const c0 = t0 + 0.12 + shown.length * 0.07 + 0.25;
  const step = Math.max(0.07, Math.min(0.16, 1.4 / Math.max(1, shown.length)));
  shown.forEach((d, i) => {
    g.tweens.wait(c0 + i * step, () => {
      const m = meshes[i];
      if (m) { m.position.x -= 0.05; m.rotation.y -= 0.35; }
      audio.play('noteFlick', { vol: 0.55, pitch: 0.95 + Math.random() * 0.1 });
      credit(d);
    });
  });
  const cEnd = c0 + shown.length * step;
  if (extra > 0) g.tweens.wait(cEnd, () => credit(extra));
  if (coins > 0) g.tweens.wait(cEnd + 0.05, () => { audio.play('coinClink', { v: 0.9 }); credit(coins); });
  const end = cEnd + 0.35;
  busyUntil = g.time + end;
  g.tweens.wait(end, () => {
    audio.play('walletSnap', { vol: 0.6 });
    if (label !== false) g.news(`+¥${amount.toLocaleString('en-US')}`, label || 'Counted into your wallet');
    const p0 = hand.position.clone();
    g.tweens.add({ dur: 0.3, update: (k) => { hand.position.set(p0.x - k * 0.06, p0.y - k * 0.28, p0.z); hand.rotation.z = 0.15 + k * 0.7; }, done: () => { hand.parent?.remove(hand); done?.(); } });
  });
}

/** You hand cash over: a couple of notes / coins fly from your hand to `to` (visual only). */
export function payOut(game, amount, to) {
  const g = game;
  if (!to || !(amount > 0)) return;
  const { notes, coins } = splitCash(amount);
  const cam = g.camera.getWorldPosition(new THREE.Vector3());
  const fwd = new THREE.Vector3(-0.15, -0.25, -0.45).applyQuaternion(g.camera.quaternion);
  const from = cam.add(fwd);
  const pieces = [...notes.slice(0, 4).map((d) => noteMesh(d)), ...(coins > 0 ? [new THREE.Mesh(yenCoinGeometry(), voxelMaterials('normal'))] : [])];
  pieces.forEach((m, i) => {
    g.scene.add(m);
    m.position.copy(from);
    const spin = Math.random() * 4;
    g.tweens.add({
      delay: i * 0.08, dur: 0.38,
      update: (k) => { m.position.lerpVectors(from, to, k); m.position.y += Math.sin(k * Math.PI) * 0.1; m.rotation.y = spin * k; m.scale.setScalar(1 - k * 0.3); },
      done: () => { m.parent?.remove(m); if (i === 0) audio.play(m.userData.denom ? 'notePaper' : 'coinClink', { pos: to, vol: 0.5 }); },
    });
  });
}
