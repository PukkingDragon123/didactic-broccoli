// The dressing room's magic, as recipes over the stage's pixel sprites (src/dressing/sprites.js):
//   idle(stage, dt)                  twinkles drifting up off the dais rim, the odd mote dripping off the capsule's tip
//   equipBurst(stage, at, rarity)    a puff of pixel smoke round the changed spot, kira-kira stars bursting out, ribbons
//                                    of stars spiralling up your body, the magic circle flaring; rare and up: a bigger,
//                                    rarity-coloured burst with rays behind you and confetti stars raining down
//   glint(stage, at)                 hover: a few small twinkles at the spot (a preview, not a change)
//   denied(stage, at)                a locked piece tried on: a puff of grey smoke and one lonely star
// at = a fraction of your height (head 0.93, chest 0.65, hips 0.45, feet 0.05). All in stepped frames, dithered fades.
import * as THREE from 'three';
import { RARITIES } from '../data/rarity.js';

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const hexOf = (css) => parseInt(String(css).replace('#', ''), 16);
// a pastel candy palette for ordinary changes; rarities bring their own colour
const CANDY = [0xffd96a, 0xff9ec4, 0x9ad8ff, 0xb8f0a8, 0xd8b8ff, 0xfff0c0];
const SMOKE = [0xe8dcf8, 0xd0c4ec, 0xf4e8f0];
const RAINBOW = [0xff8a8a, 0xffc46a, 0xfff08a, 0x9af0a0, 0x8ad0ff, 0xc89aff];
const _v = new THREE.Vector3();

export function rarityColors(rarity) {
  if (!rarity || rarity === 'common' || rarity === 'uncommon') return CANDY;
  if (rarity === 'secret') return [hexOf(RARITIES.secret.color), 0xfff0b0, ...RAINBOW];
  const c = hexOf(RARITIES[rarity]?.color || '#ffd23f');
  return [c, c, 0xfff0c8, mix(c, 0xffffff, 0.45), mix(c, 0x6a4a9a, 0.3)];
}
function mix(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255, br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}

/** Art-pixel size in world units that draws a sprite at 1x from the full view (the stage scales it up close). */
const PX = 0.0072;

let idleT = 0, dripT = 0, shootT = 3;
export function idle(st, dt) {
  const fx = st.fx, y0 = st.float.position.y;
  idleT -= dt; dripT -= dt; shootT -= dt;
  if (shootT <= 0) {
    // now and then a shooting star crosses the sky far behind the stage
    shootT = rnd(5, 11);
    const V = st.viewRange(), z = -7, x0 = rnd(-1.5, 2.5), y = V.y1 + rnd(-0.2, 0.6) * (V.y1 - V.y0);
    fx.emit({ sprite: 'shoot', x: x0, y, z, vx: -rnd(2.6, 3.4), vy: -rnd(1.1, 1.5), life: 0.9, px: 0.03, color: 0xfff0c8, fade: 0.3 });
  }
  if (idleT <= 0) {
    idleT = rnd(0.08, 0.2);
    const a = Math.random() * TAU, r = rnd(0.5, 0.95);
    const slow = rnd(0.18, 0.34);
    const k = Math.random();
    fx.emit({
      sprite: k < 0.45 ? 'twinkle' : k < 0.7 ? 'kira' : k < 0.82 ? 'diamond' : 'mote', x: Math.cos(a) * r, y: y0 + rnd(0, 0.04), z: Math.sin(a) * r,
      vx: 0, vy: slow, vz: 0, life: rnd(1.6, 2.8), px: k < 0.45 || k >= 0.82 ? PX * 2.1 : PX, color: pick([0xffe8a8, 0xd8c8ff, 0xffc8dc, 0xc8ecff]),
      fade: 0.4, fadeIn: 0.15, anim: k < 0.45 || k >= 0.82 ? 'loop' : 'life', fps: rnd(5, 9),
      update: (p, d) => { p.y += p.vy * d; p.x += Math.sin(p.age * 2.3 + p.seed) * 0.06 * d; },
    });
  }
  // spun fast, the dais throws sparks off its rim (they fly off along the turn)
  const spin = Math.abs(st.yawVel || 0);
  for (let n = Math.floor(spin > 2 ? spin * dt * 9 + Math.random() : 0); n > 0 && !st.dragging; n--) {
    const a = Math.random() * TAU, r = 0.62, s = Math.sign(st.yawVel) * spin * 0.22;
    fx.emit({ sprite: Math.random() < 0.5 ? 'twinkle' : 'diamond', x: Math.cos(a) * r, y: y0 + rnd(-0.02, 0.03), z: Math.sin(a) * r, vx: Math.sin(a) * s, vy: rnd(0.1, 0.4), vz: -Math.cos(a) * s, drag: 1.5, gravity: 0.4, life: rnd(0.4, 0.7), px: PX * 2, color: pick([0xffd96a, 0xffc8dc, 0xc8ecff]), fade: 0.4 });
  }
  if (dripT <= 0) {
    // a slow mote off the capsule's round bottom, falling away into the night
    dripT = rnd(0.5, 1.1);
    fx.emit({ sprite: 'mote', x: rnd(-0.08, 0.08), y: y0 - 0.33, z: rnd(-0.08, 0.08), vy: -0.12, life: rnd(1.4, 2), px: PX, color: pick([0xffd96a, 0xff9ec4]), fade: 0.5, anim: 'loop', fps: 4 });
  }
}

/** Ordinary (or rare) change: the full recipe. */
export function equipBurst(st, at = 0.5, rarity = 'common') {
  const fx = st.fx, H = st.height, y0 = st.float.position.y, cy = y0 + at * H;
  const K = st.fxScale(), V = st.viewRange(); // up close the burst is smaller and the ribbons climb what you can see
  const cols = rarityColors(rarity);
  const rare = rarity === 'rare' || rarity === 'ultra' || rarity === 'secret';
  const big = rarity === 'ultra' || rarity === 'secret';
  const n = rare ? (big ? 34 : 24) : 14;
  // 1. a ring of smoke puffs swelling out round the spot
  for (let i = 0; i < (rare ? 12 : 9); i++) {
    const a = (i / (rare ? 12 : 9)) * TAU + rnd(-0.2, 0.2), sp = rnd(0.35, 0.6);
    fx.emit({ sprite: 'puff', x: Math.cos(a) * 0.18 * K, y: cy + rnd(-0.06, 0.06) * K, z: Math.sin(a) * 0.18 * K, vx: Math.cos(a) * sp * K, vy: rnd(0.05, 0.25) * K, vz: Math.sin(a) * sp * K, drag: 4.5, life: rnd(0.55, 0.8), px: PX * 2, color: pick(SMOKE), fade: 0.35, flip: true });
  }
  // 2. kira-kira stars bursting out
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, e = rnd(-0.6, 1.1), sp = rnd(0.8, rare ? 2.1 : 1.5) * K;
    fx.emit({ sprite: Math.random() < 0.75 ? 'kira' : 'diamond', x: 0, y: cy, z: 0, vx: Math.cos(a) * Math.cos(e) * sp, vy: Math.sin(e) * sp, vz: Math.sin(a) * Math.cos(e) * sp, drag: 3.2, gravity: 0.4 * K, life: rnd(0.55, 1.05), delay: rnd(0, 0.08), px: PX * (Math.random() < 0.35 ? 1 : 2), color: pick(cols), fade: 0.25 });
  }
  // 3. ribbons of stars spiralling up the body from the feet (a leader star, trailing twinkles that hang and blink out)
  const ribbons = rare ? 3 : 2;
  const lo = Math.max(y0 + 0.02, V.y0), hi = Math.min(y0 + H * 1.1, V.y1);
  for (let k = 0; k < ribbons; k++) {
    const a0 = (k / ribbons) * TAU + Math.random(), dur = rnd(0.85, 1.05), col = cols[k % cols.length];
    let trail = 0;
    fx.emit({
      sprite: 'star5', life: dur, px: PX * 2, color: col, fade: 0.12, anim: 'loop', fps: 14, delay: k * 0.06,
      update: (p, d) => {
        const u = Math.min(1, p.age / dur), a = a0 + u * TAU * 1.6, r = (0.42 - u * 0.2) * Math.max(0.6, K);
        p.x = Math.cos(a) * r; p.z = Math.sin(a) * r; p.y = lo + u * (hi - lo);
        if ((trail -= d) <= 0) {
          trail = 0.028;
          fx.emit({ sprite: 'twinkle', x: p.x, y: p.y, z: p.z, life: rnd(0.35, 0.6), px: PX * 1.5, color: mix(col, 0xfff4d8, 0.35), fade: 0.5, anim: 'loop', fps: 10 });
        }
      },
    });
  }
  // 4. a pop of hearts or notes on ordinary changes; rays and confetti on rare ones
  if (!rare) {
    for (let i = 0; i < 3; i++) {
      const a = rnd(-0.6, 0.6);
      fx.emit({ sprite: Math.random() < 0.5 ? 'heart' : 'note', x: Math.sin(a) * 0.3 * K, y: cy + 0.1 * K, z: 0.25 * K, vx: Math.sin(a) * 0.25 * K, vy: rnd(0.35, 0.55) * K, life: rnd(0.8, 1.1), delay: 0.12 + i * 0.07, px: PX * 2, color: pick([0xff7aa8, 0xffd96a, 0x9ad8ff]), fade: 0.3, drag: 1.5 });
    }
  } else {
    fx.emit({ sprite: 'rays', x: 0, y: cy, z: -0.35 * K, life: big ? 1.5 : 1.1, px: PX * (big ? 1.5 : 1.15), color: cols[0], fade: 0.35, fadeIn: 0.08, anim: 'loop', fps: 10 });
    for (let i = 0; i < (big ? 46 : 28); i++) {
      fx.emit({ sprite: Math.random() < 0.6 ? 'confetti' : 'star5', x: rnd(-0.75, 0.75) * K, y: Math.min(y0 + H * 1.15, V.y1) + rnd(0, 0.3) * K, z: rnd(-0.5, 0.6) * K, vy: rnd(-0.55, -0.25) * K, data: K, gravity: 0.3, drag: 0.6, life: rnd(1.4, 2.2), delay: rnd(0.1, 0.6), px: PX * 2, color: pick(cols), fade: 0.3, anim: 'loop', fps: rnd(8, 14), flip: true, update: confettiFall });
    }
  }
  st.circle.flare(rare ? cols[0] : pick([0xffd96a, 0xff9ec4]), rare);
}
function confettiFall(p, d) {
  const K = p.data || 1;
  p.vy -= 0.3 * K * d; p.vy = Math.max(p.vy, -0.7 * K);
  p.x += Math.sin(p.age * 5 + p.seed) * 0.25 * K * d; p.z += Math.cos(p.age * 4 + p.seed) * 0.12 * K * d;
  p.y += p.vy * d;
}

/** Hover preview: a few small twinkles round the spot (quiet; a preview isn't a change). */
export function glint(st, at = 0.5) {
  const fx = st.fx, H = st.height, cy = st.float.position.y + at * H, K = st.fxScale();
  for (let i = 0; i < 5; i++) {
    const a = rnd(-1.2, 1.2), r = rnd(0.2, 0.34) * K;
    fx.emit({ sprite: i % 2 ? 'twinkle' : 'kira', x: Math.sin(a) * r, y: cy + rnd(-0.12, 0.14) * K, z: Math.cos(a) * r, vy: 0.08 * K, life: rnd(0.4, 0.65), delay: i * 0.04, px: PX * 0.9, color: pick(CANDY), fade: 0.4 });
  }
}

/** A locked piece tried on: a grey puff and one lonely star sinking. */
export function denied(st, at = 0.5) {
  const fx = st.fx, H = st.height, cy = st.float.position.y + at * H, K = st.fxScale();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    fx.emit({ sprite: 'puff', x: Math.cos(a) * 0.12 * K, y: cy, z: Math.sin(a) * 0.12 * K, vx: Math.cos(a) * 0.3 * K, vy: 0.12 * K, vz: Math.sin(a) * 0.3 * K, drag: 4, life: 0.6, px: PX, color: 0xa8a0b8, fade: 0.4, flip: true });
  }
  fx.emit({ sprite: 'star5', x: 0.28 * K, y: cy + 0.1 * K, z: 0.2 * K, vy: -0.25 * K, gravity: 0.6 * K, life: 0.9, px: PX, color: 0x8a84a0, fade: 0.4 });
}

/** Opening flourish: stars burst off the dais as the curtains part. */
export function curtainUp(st) {
  const fx = st.fx, y0 = st.float.position.y;
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * TAU, sp = rnd(0.5, 1.2);
    fx.emit({ sprite: pick(['kira', 'twinkle', 'diamond']), x: Math.cos(a) * 0.55, y: y0, z: Math.sin(a) * 0.55, vx: Math.cos(a) * sp * 0.4, vy: rnd(0.6, 1.4), vz: Math.sin(a) * sp * 0.4, drag: 2, life: rnd(0.8, 1.4), delay: 0.25 + Math.random() * 0.3, px: PX * 2, color: pick(CANDY), fade: 0.35 });
  }
}

/** World position of a fraction of your height (for DOM bits that want to follow a spot). */
export function spotOf(st, at) { return _v.set(0, st.float.position.y + at * st.height, 0); }
