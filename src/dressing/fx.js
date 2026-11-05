// The dressing room's small effects, as recipes over the stage's pixel sprites (src/dressing/sprites.js). Grounded and
// quiet: a piece of clothing going on makes a little puff of cloth dust and a curl of lint, a rare one adds a few
// sparkles in its rarity's colour; dust turns in the sunbeam. Nothing magic, no bursts, no glows.
//   idle(stage, dt)                  motes drifting in the window's sunbeam
//   equipPoof(stage, at, rarity)     a puff of cloth dust round the changed spot (+ at most a few sparkles when rare)
//   denied(stage, at)                a locked piece tried on: a small grey puff
// at = a fraction of your height (head 0.93, chest 0.65, hips 0.45, feet 0.05). All in stepped frames, dithered fades.
import * as THREE from 'three';
import { RARITIES } from '../data/rarity.js';

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const hexOf = (css) => parseInt(String(css).replace('#', ''), 16);
const DUST = [0xe2d6dc, 0xdcd0c6, 0xd8cee2]; // cloth dust: a warm grey with a lilac shade (it has to read on a cream wall)
const MOTE = [0xfff0d0, 0xf8e4c0];
/** Art-pixel size in world units that draws a sprite at 1x from the full view. */
const PX = 0.0072;
const _v = new THREE.Vector3();

let moteT = 0;
/** Dust motes turning slowly in the sun from the window (a handful at a time, single pixels). */
export function idle(st, dt) {
  const B = st.room?.beam;
  if (!B || (moteT -= dt) > 0) return;
  moteT = rnd(0.35, 0.8);
  if (st.fx.count > 60) return;
  // a point in the beam: somewhere across the window, partway down toward the floor round you
  _v.set(rnd(-0.5, 0.5) * B.w, rnd(-0.5, 0.5) * B.h, 0).applyQuaternion(B.q).add(B.from).addScaledVector(B.dir, rnd(1.6, 3.4));
  if (_v.y < 0.15 || _v.y > 2.2) return;
  fxEmit(st, { sprite: 'mote', x: _v.x, y: _v.y, z: _v.z, vx: rnd(-0.02, 0.02), vy: rnd(-0.03, 0.015), vz: rnd(-0.02, 0.02), life: rnd(3.5, 6), px: PX, color: pick(MOTE), fade: 0.3, fadeIn: 0.25, anim: 'loop', fps: rnd(2, 4),
    update: (p, d) => { p.x += (p.vx + Math.sin(p.age * 0.9 + p.seed) * 0.012) * d; p.y += p.vy * d; p.z += p.vz * d; } });
}
function fxEmit(st, o) { return st.fx.emit(o); }

/** The colours a rare piece's few sparkles take (none for common and uncommon). */
export function rarityColors(rarity) {
  if (!rarity || rarity === 'common' || rarity === 'uncommon') return null;
  const c = hexOf(RARITIES[rarity]?.color || '#ffd23f');
  return [c, c, 0xfff0c8];
}

/** A piece goes on: a puff of cloth dust round the spot, a curl of lint; a rare piece adds a few sparkles. */
export function equipPoof(st, at = 0.5, rarity = 'common') {
  const H = st.height, cy = at * H, K = st.fxScale();
  const n = 6;
  // (round the outside of you, toward the camera: never inside your head or behind you, whatever the zoom)
  const r = at > 0.85 ? 0.17 : at < 0.12 ? 0.15 : 0.24;
  for (let i = 0; i < n; i++) {
    const a = (i / (n - 1)) * Math.PI * 1.1 - Math.PI * 0.05 + rnd(-0.15, 0.15), sp = rnd(0.22, 0.38);
    fxEmit(st, { sprite: i % 2 ? 'puff' : 'dust', x: Math.cos(a) * r, y: cy + rnd(-0.05, 0.05) * K, z: Math.abs(Math.sin(a)) * r * 0.9 + 0.08, vx: Math.cos(a) * sp * K, vy: rnd(0.02, 0.14) * K, vz: Math.sin(a) * sp * K, drag: 5, life: rnd(0.45, 0.6), delay: rnd(0, 0.05), px: PX * (i % 2 ? 1.3 : 2), color: pick(DUST), fade: 0.35, flip: true });
  }
  if (at < 0.15) { // shoes: a little scuff of floor dust instead of lint
    for (const s of [-1, 1]) fxEmit(st, { sprite: 'dust', x: s * 0.16 * K, y: 0.02, z: 0.08, vx: s * 0.25 * K, vy: 0.08, drag: 4, life: 0.45, px: PX * 1.6, color: 0xe2d4c0, fade: 0.4, flip: s > 0 });
  } else fxEmit(st, { sprite: 'lint', x: rnd(-0.2, 0.2), y: cy + 0.06 * K, z: 0.24, vx: rnd(-0.05, 0.05), vy: -0.12 * K, life: 1.1, delay: 0.12, px: PX * 1.4, color: 0xd8ccd0, fade: 0.35, anim: 'loop', fps: 6,
    update: (p, d) => { p.y += p.vy * d; p.x += Math.sin(p.age * 5 + p.seed) * 0.08 * d; } });
  const cols = rarityColors(rarity);
  if (cols) {
    const m = rarity === 'secret' ? 5 : rarity === 'ultra' ? 4 : 3;
    for (let i = 0; i < m; i++) {
      const a = rnd(-1.3, 1.3), r = rnd(0.2, 0.3);
      fxEmit(st, { sprite: i === 0 ? 'kira' : 'twinkle', x: Math.sin(a) * r, y: cy + rnd(-0.08, 0.16) * K, z: Math.cos(a) * r, vy: 0.04 * K, life: rnd(0.6, 0.85), delay: 0.08 + i * 0.09, px: PX * (i === 0 ? 1 : 1.4), color: cols[i % cols.length], fade: 0.3 });
    }
  }
}

/** A locked piece tried on: a small grey puff. */
export function denied(st, at = 0.5) {
  const H = st.height, cy = at * H, K = st.fxScale();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + 0.4;
    fxEmit(st, { sprite: 'dust', x: Math.cos(a) * 0.18, y: cy, z: Math.abs(Math.sin(a)) * 0.16 + 0.08, vx: Math.cos(a) * 0.2 * K, vy: 0.06 * K, vz: Math.sin(a) * 0.2 * K, drag: 4, life: 0.45, px: PX * 1.4, color: 0xb8b0c4, fade: 0.4, flip: true });
  }
}

/** World position of a fraction of your height (for DOM bits that want to follow a spot). */
export function spotOf(st, at) { return _v.set(0, at * st.height, 0); }
