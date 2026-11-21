// The physical UI kit (owner: "make UI felt kinda 3d and interactive, very detailed"): the game's panels and buttons are
// real Shōwa objects in pixel art, not paper: a wooden radio cabinet for settings, enamel push-plates for buttons, a
// tuning scale and brass knob for sliders, bakelite toggle switches, a wooden tool tray for the hotbar, an enamel price
// plate for the wallet. Every texture is painted texel by texel here (src/menu/pixel.js) and handed to CSS as custom
// properties (--ph-*), shown at whole-number scales with nearest filtering (src/ui/phys.css). Depth is a thick pixel
// side plus a hard ink shadow that slides with the cursor (parallax: --mx / --my on <html>, -1..1); hover lifts, tilts
// and warms an object, a press pushes it into its side with a wooden clack and a puff of pixel dust. Never a white
// outline or glow.
//   installPhys()            textures, parallax, press feedback, keyboard / gamepad focus for open panels (once)
//   new Spring(k, c)         .x .v .to   step(dt) -> x            (a damped spring for swings and tilts)
//   dust(x, y, { n, s, spread, up })   pixel-art dust puffs and wood chips at a screen point
//   knock(kind, vol)         'wood' | 'press' | 'tin' | 'chain' | 'hover'
//   pointer                  { x, y, vx, vy } (screen px, px/s)
import './phys.css';
import './float.css';
import { audio } from '../core/audio.js';
import { art, rng, shade, hex, INK } from '../menu/pixel.js';
import { iconHTML } from '../gfx/icons.js';

const play = (n, o = {}) => { try { audio.init(); audio.play(n, o); } catch { /* audio not ready */ } };

/** The kit's sounds: hollow wood, a pressed plate (click + knock), tin, a chain's rattle, a soft hover tap. */
export function knock(kind = 'wood', vol = 1) {
  if (kind === 'press') { play('uiClick', { vol: 0.55 * vol }); play('capsuleHit', { mat: 'wood', speed: 2.2, vol: 0.55 * vol }); }
  else if (kind === 'wood') play('capsuleHit', { mat: 'wood', speed: 1.2, vol: 0.32 * vol });
  else if (kind === 'tin') play('capsuleHit', { mat: 'metal', speed: 1.1, vol: 0.28 * vol });
  else if (kind === 'chain') { play('coinClink', { v: 0.7 * vol }); setTimeout(() => play('coinClink', { v: 0.45 * vol }), 70); }
  else if (kind === 'hover') play('uiHover', { vol: 0.8 * vol });
}

/** A damped spring (semi-implicit Euler, stable at any frame rate up to 1/20 s). */
export class Spring {
  constructor(k = 90, c = 10, x = 0) { this.k = k; this.c = c; this.x = x; this.v = 0; this.to = x; }
  step(dt) {
    if (!(dt > 0)) return this.x;
    dt = Math.min(dt, 0.05);
    for (let i = 0; i < 2; i++) { this.v += (-(this.x - this.to) * this.k - this.v * this.c) * dt / 2; this.x += this.v * dt / 2; }
    if (!Number.isFinite(this.x) || Math.abs(this.x - this.to) > 400) { this.x = this.to; this.v = 0; }
    return this.x;
  }
  get still() { return Math.abs(this.v) < 0.002 && Math.abs(this.x - this.to) < 0.002; }
}

// ------------------------------------------------------------------ the pointer, and the parallax it drives
export const pointer = { x: innerWidth / 2, y: innerHeight / 2, vx: 0, vy: 0, t: 0 };
let paraQueued = false;
function onPointer(e) {
  const t = performance.now(), dt = Math.max(8, t - pointer.t) / 1000;
  pointer.vx = pointer.vx * 0.5 + ((e.clientX - pointer.x) / dt) * 0.5;
  pointer.vy = pointer.vy * 0.5 + ((e.clientY - pointer.y) / dt) * 0.5;
  pointer.x = e.clientX; pointer.y = e.clientY; pointer.t = t;
  if (paraQueued) return;
  paraQueued = true;
  requestAnimationFrame(() => {
    paraQueued = false;
    const r = document.documentElement.style;
    r.setProperty('--mx', (Math.round((pointer.x / innerWidth * 2 - 1) * 20) / 20).toFixed(2));
    r.setProperty('--my', (Math.round((pointer.y / innerHeight * 2 - 1) * 20) / 20).toFixed(2));
  });
}

// ------------------------------------------------------------------ pixel dust
// 4 frames of 8 x 8 texels, hand-placed: a puff that opens, thins and breaks up ('a' light dust, 'b' its shade)
const PUFF = [
  ['........', '........', '...ab...', '..aaab..', '..aabb..', '...bb...', '........', '........'],
  ['........', '..a.ab..', '.aaa.ab.', '.a....b.', '.ab...b.', '..bb.b..', '...b....', '........'],
  ['.a....b.', '........', 'a......b', '........', '........', 'b......b', '........', '..b..b..'],
  ['a.......', '.......b', '........', '........', '........', '........', 'b.......', '.....b..'],
];
const CHIP = [['........', '........', '...ab...', '...bb...', '........', '........', '........', '........']];
let dustURL = null;
function dustSheet() {
  if (dustURL) return dustURL;
  const a = art(40, 8), C = { a: hex(0xc8b490), b: hex(0x8a7454) };
  [...PUFF, CHIP[0]].forEach((f, k) => f.forEach((row, y) => [...row].forEach((ch, x) => { if (C[ch]) a.px(k * 8 + x, y, C[ch]); })));
  const c = document.createElement('canvas'); c.width = 40; c.height = 8;
  c.getContext('2d').putImageData(new ImageData(a.data, 40, 8), 0, 0);
  dustURL = c.toDataURL();
  return dustURL;
}
let fxLayer = null;
/** A few dust puffs (and wood chips that drop) around a screen point. */
export function dust(x, y, { n = 4, s = 2, spread = 30, up = 1, chips = 2 } = {}) {
  if (!fxLayer) { fxLayer = document.createElement('div'); fxLayer.id = 'ph-fx'; document.body.appendChild(fxLayer); }
  const url = dustSheet();
  for (let i = 0; i < n + chips; i++) {
    const chip = i >= n, el = document.createElement('i');
    el.className = chip ? 'ph-dust chip' : 'ph-dust';
    const dx = (Math.random() * 2 - 1) * spread, dy = chip ? 20 + Math.random() * 30 : -(6 + Math.random() * 14) * up;
    el.style.cssText = `left:${Math.round(x + (Math.random() * 2 - 1) * spread * 0.4)}px;top:${Math.round(y)}px;--u:${s}px;--dx:${Math.round(dx)}px;--dy:${Math.round(dy)}px;background-image:url(${url});animation-delay:${Math.round(Math.random() * 60)}ms`;
    el.addEventListener('animationend', () => el.remove(), { once: true });
    fxLayer.appendChild(el);
  }
}

// ------------------------------------------------------------------ textures
const W = { hi: hex(0xc89058), mid: hex(0xa06a3a), lo: hex(0x7a4a26), deep: hex(0x4e2c16), dark: hex(0x34200f) };
const BRASS = { hi: hex(0xf2d27a), mid: hex(0xc8962e), lo: hex(0x8a5e1c) };
const ENAMEL = {
  red: { base: hex(0xc0302a), hi: hex(0xd8503e), lo: hex(0x8c1e20), side: hex(0x5e1416), pin: hex(0xf2e2c0) },
  navy: { base: hex(0x26346e), hi: hex(0x3a4c8e), lo: hex(0x18224e), side: hex(0x0e1430), pin: hex(0xf2e2c0) },
  cream: { base: hex(0xf0e4c4), hi: hex(0xfcf4de), lo: hex(0xcdb88e), side: hex(0x8a7650), pin: hex(0x26346e) },
  green: { base: hex(0x4e8a6c), hi: hex(0x6aa686), lo: hex(0x346650), side: hex(0x1c3a2c), pin: hex(0xf2e2c0) },
};
const roundIn = (x, y, w, h, r) => {
  const cx = x < r ? r : x > w - 1 - r ? w - 1 - r : x, cy = y < r ? r : y > h - 1 - r ? h - 1 - r : y;
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.6;
};
function url(a) {
  const c = document.createElement('canvas'); c.width = a.w; c.height = a.h;
  c.getContext('2d').putImageData(new ImageData(a.data, a.w, a.h), 0, 0);
  return `url(${c.toDataURL()})`;
}
function screw(a, x, y) {
  a.px(x, y, hex(0xd8dce2)); a.px(x + 1, y, hex(0xa2a8b2)); a.px(x + 2, y, hex(0x8a909c));
  a.px(x, y + 1, hex(0xa2a8b2)); a.px(x + 1, y + 1, INK); a.px(x + 2, y + 1, hex(0x6a707c));
  a.px(x, y + 2, hex(0x8a909c)); a.px(x + 1, y + 2, hex(0x6a707c)); a.px(x + 2, y + 2, hex(0x4a4e58));
}
/** Wood grain over a region: hard colour bands along the grain (x or y), knots, no gradients. */
function grainWood(a, x0, y0, w, h, seed, along = 'x', inside = () => true, tone = W) {
  const r = rng(seed);
  const bands = [], n = along === 'x' ? h : w;
  let v = 0;
  for (let i = 0; i < n; i++) { if (r() < 0.35) v = Math.floor(r() * 4); bands.push(v); }
  const knots = Array.from({ length: Math.max(1, Math.round(w * h / 900)) }, () => [Math.floor(r() * w), Math.floor(r() * h)]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!inside(x, y)) continue;
    const u = along === 'x' ? x : y, b = bands[along === 'x' ? y : x];
    const wob = Math.sin(u * 0.21 + b * 2.3 + (along === 'x' ? y : x) * 0.7) > 0.86;
    let c = [tone.mid, tone.hi, tone.mid, tone.lo][b];
    if (wob) c = tone.lo;
    for (const [kx, ky] of knots) { const d = Math.hypot((x - kx) * (along === 'x' ? 0.5 : 1), (y - ky) * (along === 'x' ? 1 : 0.5)); if (d < 1.6) c = tone.deep; else if (d < 2.6) c = tone.lo; }
    if (r() < 0.02) c = shade(c, 0.92);
    a.px(x0 + x, y0 + y, c);
  }
}

/** The settings cabinet: a 9-slice wooden frame (slice 12), stepped round corners, brass screws, a darker lip. */
function cabinet() {
  const S = 36, B = 12, a = art(S, S);
  const inO = (x, y) => roundIn(x, y, S, S, 4);
  grainWood(a, 0, 0, S, S, 7, 'x', (x, y) => inO(x, y) && (y < B || y >= S - B));
  grainWood(a, 0, 0, S, S, 9, 'y', (x, y) => inO(x, y) && y >= B && y < S - B && (x < B || x >= S - B));
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (!inO(x, y)) { a.clear(x, y); continue; }
    if (!inO(x - 1, y) || !inO(x + 1, y) || !inO(x, y - 1) || !inO(x, y + 1)) a.px(x, y, INK);
    else if (!inO(x, y - 2) || !inO(x - 2, y)) a.px(x, y, shade(W.hi, 1.06));
    else if (!inO(x, y + 2) || !inO(x + 2, y)) a.px(x, y, W.deep);
    const inner = x >= B && x < S - B && y >= B && y < S - B;
    if (inner) a.clear(x, y);
    // the inner lip: a dark rebate line and a lit bevel under it
    const d = Math.max(B - 1 - x, x - (S - B), B - 1 - y, y - (S - B), -99);
    if (!inner && x >= B - 2 && x < S - B + 2 && y >= B - 2 && y < S - B + 2) a.px(x, y, (x < B - 1 || y < B - 1) ? W.dark : W.hi);
    void d;
  }
  for (const [x, y] of [[4, 4], [S - 7, 4], [4, S - 7], [S - 7, S - 7]]) screw(a, x, y);
  return a;
}
/** An enamel plate (9-slice, slice 5): ink edge, a lit top row, a shaded bottom row, chips at the rim. */
function plate(c, seed = 3, pin = false) {
  const S = 16, a = art(S, S), r = rng(seed);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (!roundIn(x, y, S, S, 2)) continue;
    const e = !roundIn(x - 1, y, S, S, 2) || !roundIn(x + 1, y, S, S, 2) || !roundIn(x, y - 1, S, S, 2) || !roundIn(x, y + 1, S, S, 2);
    let k = c.base;
    if (e) k = INK; else if (y === 1) k = c.hi; else if (y >= S - 3) k = c.lo; else if (x === 1) k = c.hi;
    if (pin && !e && (x === 3 || y === 3 || x === S - 4 || y === S - 4) && x >= 3 && y >= 3 && x <= S - 4 && y <= S - 4) k = c.pin;
    a.px(x, y, k);
  }
  for (const [x, y] of [[1, 6], [S - 2, 9], [7, S - 2]]) if (r() < 0.8) { a.px(x, y, hex(0x2a2428)); }
  return a;
}
/** The face of a panel: painted plywood under cream enamel paint, a quiet mottle (quantised), a few dings. */
function faceTile() {
  const S = 64, a = art(S, S), r = rng(41), base = hex(0xefe3c4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let k = [1, 1, 1, 0.985, 1.012][Math.floor(r() * 5)];
    if (Math.sin(x * 0.19 + Math.sin(y * 0.05) * 3) > 0.93) k = 0.97; // brush marks along the panel
    a.px(x, y, shade(base, k));
  }
  for (let i = 0; i < 3; i++) { const x = Math.floor(r() * 60), y = Math.floor(r() * 60); a.px(x, y, hex(0xb8a47e)); a.px(x + 1, y, hex(0xd2c29c)); }
  return a;
}
/** The tuning scale under a slider: cream strip, an ink frame, ticks every 4 texels, long ones every 16. */
function dialTrack() {
  const w = 32, h = 10, a = art(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) a.px(x, y, y === 0 || y === h - 1 ? INK : y === 1 ? hex(0xfaf2dc) : hex(0xeadcb6));
  for (let x = 0; x < w; x += 4) { const L = x % 16 === 0 ? 5 : 3; for (let y = 2; y < 2 + L; y++) a.px(x, y, x % 16 === 0 ? hex(0xb3262a) : hex(0x5e5046)); }
  for (let x = 0; x < w; x++) a.px(x, h - 2, hex(0xcdb88e));
  return a;
}
/** The slider's knob: a red needle over a knurled brass knob. */
function dialKnob() {
  const rows = [
    '...#r#...',
    '...#r#...',
    '...#r#...',
    '..##r##..',
    '.#YYYYY#.',
    '#YYyYyYy#',
    '#YyYyYyo#',
    '#yYyYyoo#',
    '#yyyyooo#',
    '.#ooooo#.',
    '..#####..',
  ];
  const P = { '#': INK, r: hex(0xd83a2e), Y: BRASS.hi, y: BRASS.mid, o: BRASS.lo };
  const a = art(9, 11);
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (P[ch]) a.px(x, y, P[ch]); }));
  return a;
}
/** A bakelite toggle switch, off (lever left) and on (lever right, the red lamp lit). */
function toggle(on) {
  const rows = on ? [
    '................',
    '.##############.',
    '#vvvvvvvvvvvvvv#',
    '#vs.vvvvvvv###v#',
    '#vvvvvvvvv#YY#v#',
    '#vv#####v#YY#vv#',
    '#v#ccccc#YY##R##',
    '#v#ccccc#y#.#RR#',
    '#vv#####vvvv##v#',
    '#vvvvvvvvvvvvvv#',
    '#ooooooooooooos#',
    '.##############.',
  ] : [
    '................',
    '.##############.',
    '#vvvvvvvvvvvvvv#',
    '#v###vvvvvvv.sv#',
    '#v#YY#vvvvvvvvv#',
    '#vv#YY#v#####vv#',
    '##q##YY#ccccc#v#',
    '#qq#.#y#ccccc#v#',
    '#v##vvvv#####vv#',
    '#vvvvvvvvvvvvvv#',
    '#sooooooooooooo#',
    '.##############.',
  ];
  const P = { '#': INK, v: hex(0x5a3420), o: hex(0x3a2010), s: hex(0x8a909c), Y: hex(0xe8dcc0), y: hex(0xb8a888), c: on ? hex(0xf0e4c4) : hex(0xb8ac90), R: hex(0xf0503a), q: hex(0x6a2a22) };
  const a = art(16, 12);
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (P[ch]) a.px(x, y, P[ch]); }));
  return a;
}
/** The hotbar: a wooden tool tray (9-slice, slice 6) and its sunken compartments (slice 5), plain and picked. */
function tray() {
  const S = 20, a = art(S, S);
  grainWood(a, 0, 0, S, S, 21, 'x', (x, y) => roundIn(x, y, S, S, 3));
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (!roundIn(x, y, S, S, 3)) continue;
    if (!roundIn(x - 1, y, S, S, 3) || !roundIn(x + 1, y, S, S, 3) || !roundIn(x, y - 1, S, S, 3) || !roundIn(x, y + 1, S, S, 3)) a.px(x, y, INK);
    else if (y === 1) a.px(x, y, W.hi);
    else if (y >= S - 3) a.px(x, y, W.deep);
  }
  return a;
}
function cell(sel) {
  // a sunken compartment: shadowed top / left walls, a lit bottom / right lip, a quiet floor with a grain line every few
  // texels (so the 9-slice centre tiles cleanly at 2 px a texel); picked: a brass rim
  const S = 16, a = art(S, S);
  const floor = sel ? hex(0x7e5030) : hex(0x4e2e18), grainC = sel ? hex(0x6a4024) : hex(0x42260f), knot = sel ? hex(0x8a5a34) : hex(0x5a3820);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let c = floor;
    if (y % 4 === 1 && (x * 3 + y) % 7 !== 0) c = grainC;
    if (y % 8 === 3 && x % 8 === 5) c = knot;
    if (x === 0 || y === 0 || x === S - 1 || y === S - 1) c = sel ? BRASS.mid : INK;
    else if (x === 1 || y === 1) c = sel ? BRASS.lo : hex(0x1e1008);
    else if (x === 2 || y === 2) c = sel ? shade(floor, 0.8) : hex(0x341c0c);
    else if (x === S - 2 || y === S - 2) c = sel ? BRASS.hi : W.lo;
    a.px(x, y, c);
  }
  if (sel) { a.px(0, 0, INK); a.px(S - 1, 0, INK); a.px(0, S - 1, INK); a.px(S - 1, S - 1, INK); }
  return a;
}

let installed = false;
function textures() {
  const r = document.documentElement.style;
  const set = (k, a) => r.setProperty(k, url(a));
  set('--ph-cab', cabinet());
  set('--ph-face', faceTile());
  for (const k of Object.keys(ENAMEL)) set(`--ph-${k}`, plate(ENAMEL[k], k.length * 7));
  set('--ph-plate', plate(ENAMEL.navy, 5, true));
  set('--ph-dial', dialTrack());
  set('--ph-knob', dialKnob());
  set('--ph-tog-off', toggle(false));
  set('--ph-tog-on', toggle(true));
  set('--ph-tray', tray());
  set('--ph-cell', cell(false));
  set('--ph-cell-sel', cell(true));
}

// ------------------------------------------------------------------ press feedback (delegated)
const PRESS = '.ph-press, #pause .panel button, #share .panel button, .tm-btn, #hotbar .slot';
function onDown(e) {
  const b = e.target.closest?.(PRESS);
  if (!b || b.disabled) return;
  b.classList.add('ph-down');
  knock(b.matches('#hotbar .slot') ? 'wood' : 'press', 0.8);
  const R = b.getBoundingClientRect();
  if (!b.matches('#hotbar .slot')) dust(R.left + R.width / 2, R.bottom, { n: 3, chips: 1, spread: Math.min(60, R.width / 3) });
  const up = () => { b.classList.remove('ph-down'); removeEventListener('pointerup', up, true); removeEventListener('pointercancel', up, true); };
  addEventListener('pointerup', up, true); addEventListener('pointercancel', up, true);
}
let lastHover = null;
function onOver(e) {
  const b = e.target.closest?.('#pause .panel button, #share .panel button, .tm-btn, .ph-press');
  if (b === lastHover) return;
  lastHover = b;
  if (b && e.pointerType !== 'touch') knock('hover', 0.7);
}

// ------------------------------------------------------------------ keyboard / gamepad focus inside open panels
const openPanel = () => ['pause', 'share'].map((id) => document.getElementById(id)).find((el) => el && !el.classList.contains('hidden'))
  || document.querySelector('.tm-modal') || document.querySelector('.tm-credits');
const focusables = (root) => [...root.querySelectorAll('button, input, select, textarea, [tabindex="0"]')].filter((el) => !el.disabled && el.offsetParent !== null && !el.closest('.hidden'));
function moveFocus(d) {
  const P = openPanel();
  if (!P) return false;
  const F = focusables(P);
  if (!F.length) return false;
  const i = F.indexOf(document.activeElement);
  const n = F[i < 0 ? (d > 0 ? 0 : F.length - 1) : (i + d + F.length) % F.length];
  n.focus({ preventScroll: false });
  return true;
}
function onKey(e) {
  if (!openPanel()) return;
  const a = document.activeElement, k = e.key;
  if (k !== 'ArrowDown' && k !== 'ArrowUp') return;
  if (a?.tagName === 'SELECT' || a?.tagName === 'TEXTAREA') return;
  if (moveFocus(k === 'ArrowDown' ? 1 : -1)) e.preventDefault();
}
// a pad: d-pad / left stick = arrow keys, A = Enter (click), B = Escape; only while a menu or panel is up
const pad = { held: {}, t: 0 };
const keyTo = (key) => {
  const t = document.activeElement && document.activeElement !== document.body ? document.activeElement : window;
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  t.dispatchEvent(ev);
  if (key === 'Enter' && !ev.defaultPrevented && document.activeElement?.matches?.('button')) document.activeElement.click();
  if ((key === 'ArrowLeft' || key === 'ArrowRight') && document.activeElement?.type === 'range') {
    const r = document.activeElement; r.value = +r.value + (key === 'ArrowRight' ? 1 : -1) * (+r.step || 0.05) * 4; r.dispatchEvent(new Event('input', { bubbles: true }));
  }
};
function pollPad(t) {
  requestAnimationFrame(pollPad);
  const P = navigator.getGamepads?.() || [];
  const g = [...P].find((p) => p && p.connected);
  if (!g) return;
  const title = document.querySelector('#title .tm:not(.off):not(.leaving)') && !document.querySelector('.dr-root, #dressing:not(.hidden)');
  if (!openPanel() && !title) return;
  const ax = g.axes[0] || 0, ay = g.axes[1] || 0, B = (i) => !!g.buttons[i]?.pressed;
  const want = { ArrowUp: B(12) || ay < -0.55, ArrowDown: B(13) || ay > 0.55, ArrowLeft: B(14) || ax < -0.55, ArrowRight: B(15) || ax > 0.55, Enter: B(0), Escape: B(1) };
  for (const [k, on] of Object.entries(want)) {
    const h = pad.held[k];
    if (on && (!h || (k.startsWith('Arrow') && t - h > 340))) {
      pad.held[k] = h ? t - 240 : t; // auto-repeat for the arrows
      if (k.startsWith('Arrow') && openPanel() && (k === 'ArrowUp' || k === 'ArrowDown') && document.activeElement?.tagName !== 'SELECT') moveFocus(k === 'ArrowDown' ? 1 : -1);
      else keyTo(k);
    } else if (!on) delete pad.held[k];
  }
}

// ------------------------------------------------------------------ panels swing shut instead of vanishing
// (#pause / #share are hidden by a class from many places: when it goes on, it's held off for the closing swing)
function closeSwing(id) {
  const el = document.getElementById(id);
  if (!el) return;
  let busy = false;
  new MutationObserver(() => {
    if (busy || !el.classList.contains('hidden') || el.dataset.phWas !== '1') { el.dataset.phWas = el.classList.contains('hidden') ? '0' : '1'; return; }
    busy = true;
    el.classList.remove('hidden'); el.classList.add('ph-closing');
    knock('wood', 0.5);
    setTimeout(() => { el.classList.remove('ph-closing'); el.classList.add('hidden'); el.dataset.phWas = '0'; busy = false; }, 220);
  }).observe(el, { attributes: true, attributeFilter: ['class'] });
  el.dataset.phWas = el.classList.contains('hidden') ? '0' : '1';
}

// ------------------------------------------------------------------ the settings cabinet: rows sorted into labelled sections
// (rows are added by several systems, some late: re-sorted every time the panel opens; unknown rows land in MORE)
const SECTIONS = [
  ['Sound', ['vol-master', 'vol-music', 'vol-amb', 'voice-tts']],
  ['Picture', ['quality', 'fov', 'hands', 'cine-on']],
  ['Controls', ['sens']],
  ['Help', ['hints', 'hud-min', 'skip-tut']],
  ['More', []],
];
function groupPause() {
  const rows = document.querySelector('#pause .rows');
  if (!rows) return;
  const secs = SECTIONS.map(([name]) => {
    let el = rows.querySelector(`.ph-sec[data-sec="${name}"]`);
    if (!el) { el = document.createElement('div'); el.className = 'ph-sec'; el.dataset.sec = name; el.innerHTML = `<div class="ph-sec-h">${name}</div>`; rows.appendChild(el); }
    return el;
  });
  const labels = [...rows.querySelectorAll('label')];
  for (const l of labels) {
    const id = l.querySelector('input, select')?.id || '';
    let k = SECTIONS.findIndex(([, ids]) => ids.includes(id));
    if (k < 0) k = SECTIONS.length - 1;
    const tip = l.nextElementSibling?.classList.contains('hm-tip') ? l.nextElementSibling : null;
    const order = SECTIONS[k][1].indexOf(id);
    l.style.order = order < 0 ? 50 : order * 2; if (tip) tip.style.order = (order < 0 ? 50 : order * 2) + 1;
    if (l.parentNode !== secs[k]) { secs[k].appendChild(l); if (tip) secs[k].appendChild(tip); }
  }
  for (const el of secs) el.hidden = !el.querySelector('label');
  // a Credits plate (the music and every other credit live on the credits receipt, not in this panel)
  const P = document.querySelector('#pause .panel');
  if (P && !document.getElementById('credits-btn')) {
    const b = document.createElement('button');
    b.id = 'credits-btn'; b.type = 'button';
    b.innerHTML = `${iconHTML('book', 2)}<span>Credits</span>`;
    b.addEventListener('click', (e) => { e.stopPropagation(); import('../menu/credits.js').then((m) => m.openCredits()); });
    (document.getElementById('reset-btn') || P.lastChild).before(b);
  }
}

/** Once: the textures, the parallax, the press feedback and the focus helpers. */
export function installPhys() {
  if (installed) return;
  installed = true;
  textures();
  addEventListener('pointermove', onPointer, { passive: true });
  addEventListener('pointerdown', onDown, true);
  addEventListener('pointerover', onOver, { passive: true });
  addEventListener('keydown', onKey);
  document.body.classList.add('phys-ui');
  closeSwing('pause'); closeSwing('share');
  const pz = document.getElementById('pause');
  if (pz) {
    groupPause();
    new MutationObserver(() => { if (!pz.classList.contains('hidden')) groupPause(); }).observe(pz, { attributes: true, attributeFilter: ['class'] });
  }
  requestAnimationFrame(pollPad);
}
