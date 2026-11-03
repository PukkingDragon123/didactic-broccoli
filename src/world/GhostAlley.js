// The ghost alley (an affectionate nod to a certain bizarre adventure): alley A1 beside Mikawa-ya, a narrow way between
// a block wall and the shop's side that the map says isn't there. A red round post box at the mouth, one old lamp on a
// pole that never stops flickering, and at the end a cul-de-sac with a little Jizō shrine. Inside it is always dusk.
// A see-through girl in a school uniform waits there with her ghost dog. The rules are the old ones:
//   she walks you in to the shrine; to leave, you walk back out to the street, and whatever you hear behind you,
//   you must NOT look back until you're out. Footsteps follow you, something whispers, the dog barks, somebody who
//   sounds just like her asks you to turn round, and pale hand prints crawl past your feet. Look back and the
//   hands come out of the dark, grab you and drag you down the alley (you come to on the street, nothing worse).
//   Make it out and she waves from the shrine; the shrine's gift waits on the post box.
// Save flags (game.state.flags): ghostMet, ghostAlley (done, the reward was given), ghostFails (times caught).
//   new GhostAlley(game)  ->  update(dt) each frame
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createHuman } from '../people/index.js';
import { talk } from '../people/voice.js';
import { menace } from '../ui/menacing.js';
import { audio } from '../core/audio.js';
import { draw5 } from '../gfx/font5x7.js';
import { SERIES, SERIES_BY_ID } from '../data/series/index.js';
import { rollCapsule } from '../game/economy.js';
import { formatYen, hash2 } from '../core/util.js';

const X0 = -9.3, X1 = -7.5, MOUTH = 14.9, SHRINE = 20.15, BACK = 22.3; // the walkable alley; reaching SHRINE starts the walk out
const HOME = new THREE.Vector3(-8.5, 0, 16.4), END = new THREE.Vector3(-8.75, 0, 20.6);
const POST = new THREE.Vector3(-7.86, 0, 15.25), LAMP = new THREE.Vector3(-7.62, 0, 18.35);
const REWARD = 3000;
const _v = new THREE.Vector3(), _d = new THREE.Vector3();
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

const LINES = {
  idle: ['...', 'Never look back on the way out. That\'s the only rule.', 'This alley isn\'t on any map, you know.', 'My dog says hello.', 'It\'s always evening in here.'],
  after: ['You came back!', 'The shrine likes you now.', 'Still not looking back? Good.', 'My dog remembers you.'],
  leave: ['Leaving already?', 'Come back when you\'re brave.'],
  behind: ['Hey... turn around. It\'s me.', 'Wait! You dropped something!', 'Psst. Look. Just for a second.', 'Why won\'t you look at me?'],
  inner: ['(Footsteps. Right behind me.)', '(Something is breathing on my neck...)', '(Don\'t look. Don\'t look. Don\'t look.)', '(Was that my name?)'],
};

// ------------------------------------------------------------------ pixel art
/** Hand sprite frames (16 x 24 px each, three frames in a row: rising, open, grabbing). */
function handSheet() {
  const W = 16, H = 24, c = document.createElement('canvas');
  c.width = W * 3; c.height = H;
  const g = c.getContext('2d');
  const rows = [
    ['......##........', '.....#oo#.......', '.....#oo#.##....', '.....#oo##oo#...', '..##.#oo#oo#.##.', '.#oo##oo#oo##oo#', '.#oo#oo#oo#oo#oo#', '.#oooooooooooo#.', '..#ooooooooooo#.', '..#oooooooooo#..', '..#ooooooooo#...', '...#oooooooo#...', '...#oooooo#.....', '....#ooooo#.....', '....#ooooo#.....', '....#ooooo#.....', '...#ooooo#......', '...#ooooo#......', '...#oooo#.......', '..#ooooo#.......', '..#oooo#........', '..#oooo#........', '.#oooo#.........', '.#oooo#.........'],
    ['.#.....#........', '#o#.#.#o#.......', '#o##o##o#.#.....', '#o##o##o##o#....', '#o##o##o##o#....', '#oooooooooo#.#..', '#ooooooooooo#o#.', '#oooooooooooo#..', '.#oooooooooo#...', '.#ooooooooo#....', '..#oooooooo#....', '..#ooooooo#.....', '...#oooooo#.....', '...#ooooo#......', '...#ooooo#......', '...#ooooo#......', '..#ooooo#.......', '..#ooooo#.......', '..#oooo#........', '.#ooooo#........', '.#oooo#.........', '.#oooo#.........', '#oooo#..........', '#oooo#..........'],
    ['................', '................', '..####..........', '.#oooo####......', '#oooooooooo#....', '#ooooooooooo#...', '#oooooooooooo#..', '#oooooo##oooo#..', '.#oooo#..#ooo#..', '.#oooo#...#o#...', '..#ooooo##o#....', '..#oooooooo#....', '...#ooooooo#....', '...#oooooo#.....', '...#ooooo#......', '...#ooooo#......', '..#ooooo#.......', '..#ooooo#.......', '..#oooo#........', '.#ooooo#........', '.#oooo#.........', '.#oooo#.........', '#oooo#..........', '#oooo#..........'],
  ];
  rows.forEach((r, f) => r.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.' || x >= W) return;
    g.fillStyle = ch === '#' ? '#1a2a5a' : ((x + y) % 5 === 0 ? '#9ec8f0' : '#c8e4ff');
    g.fillRect(f * W + x, y, 1, 1);
  })));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  t.repeat.set(1 / 3, 1);
  return t;
}

/** A small wooden plaque in pixels: 振り返るな / DON'T LOOK BACK. */
function plaque() {
  const W = 96, H = 48, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
  const draw = () => {
    g.fillStyle = '#4a3020'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#5c3c26'; for (let y = 3; y < H; y += 6) g.fillRect(0, y, W, 2);
    g.fillStyle = '#2a1a10'; g.fillRect(0, 0, W, 2); g.fillRect(0, H - 2, W, 2); g.fillRect(0, 0, 2, H); g.fillRect(W - 2, 0, 2, H);
    g.fillStyle = '#c8b8a0'; g.fillRect(4, 4, 2, 2); g.fillRect(W - 6, 4, 2, 2);
    g.fillStyle = '#efe4cc'; g.font = '16px "DotGothic16", monospace'; g.textAlign = 'center'; g.textBaseline = 'top';
    g.fillText('振り返るな', W / 2, 7);
    draw5(g, 'DON\'T LOOK BACK', W / 2, 31, { col: '#e04a3a', align: 'center' });
    tex.needsUpdate = true;
  };
  draw();
  document.fonts?.load('16px "DotGothic16"', '振り返るな').then(draw).catch(() => {});
  return new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.22), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
}

/** Pixel-dithered warm disc for the lamp's pool of light (alpha-cut, no soft blob). */
function poolTexture() {
  const N = 32, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d'), im = g.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = Math.hypot(x - N / 2 + 0.5, y - N / 2 + 0.5) / (N / 2), k = 1 - d;
    const on = k > 0 && k * 1.4 > BAYER[(y & 3) * 4 + (x & 3)] / 16, o = (y * N + x) * 4;
    im.data[o] = 255; im.data[o + 1] = 200; im.data[o + 2] = 120; im.data[o + 3] = on ? 255 : 0;
  }
  g.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  return t;
}

/** Ghostly look for every mesh under root: see-through, pale blue, faintly glowing, no shadows. */
function ghostify(root, op = 0.55) {
  const mats = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      m.transparent = true; m.opacity = op; m.depthWrite = true; m.userData.op = op; mats.push(m);
      m.color?.set?.(0x8cc4ff);
      if (m.emissive) { m.emissive.set(0x2a5a92); m.emissiveIntensity = 0.55; if (m.map && !m.emissiveMap) m.emissiveMap = m.map; }
      m.needsUpdate = true;
    }
    o.castShadow = false; o.receiveShadow = false;
    o.renderOrder = 2;
    o.userData.ghost = true;
  });
  return mats;
}

/** Box geometry with a flat vertex colour (bottom at y unless centred). */
function cbox(w, h, d, x, y, z, col, { rx = 0, rz = 0, ry = 0, centre = false } = {}) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz); if (ry) g.rotateY(ry);
  g.translate(x, centre ? y : y + h / 2, z);
  const c = new THREE.Color(col), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}

// ------------------------------------------------------------------ the ghost dog (chunky voxel-ish rig)
class GhostDog {
  constructor() {
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
    const part = (geos, x, y, z) => { const m = new THREE.Mesh(mergeGeometries(geos), mat); const p = new THREE.Group(); p.position.set(x, y, z); p.add(m); return p; };
    const W = 0xf4f0e8, G = 0xb8b4ac, D = 0x2a2a2a;
    this.root = new THREE.Group();
    this.body = part([cbox(0.24, 0.22, 0.5, 0, -0.11, 0, W), cbox(0.25, 0.12, 0.2, 0, -0.02, -0.08, G), cbox(0.18, 0.16, 0.14, 0, -0.06, 0.27, W)], 0, 0.46, 0);
    this.head = part([cbox(0.2, 0.2, 0.2, 0, -0.05, 0.05, W), cbox(0.12, 0.1, 0.12, 0, -0.07, 0.19, W), cbox(0.05, 0.04, 0.03, 0, -0.01, 0.255, D),
      cbox(0.06, 0.1, 0.04, -0.085, 0.07, 0.0, G, { rz: 0.4 }), cbox(0.06, 0.1, 0.04, 0.085, 0.07, 0.0, G, { rz: -0.4 }),
      cbox(0.025, 0.025, 0.01, -0.05, 0.03, 0.15, D), cbox(0.025, 0.025, 0.01, 0.05, 0.03, 0.15, D), cbox(0.21, 0.04, 0.17, 0, -0.14, 0.04, 0xc84a3a)], 0, 0.62, 0.3);
    this.tail = part([cbox(0.05, 0.05, 0.22, 0, 0, 0.1, W, { rx: -0.6, centre: true })], 0, 0.5, -0.26);
    this.legs = [[-0.08, 0.17], [0.08, 0.17], [-0.08, -0.17], [0.08, -0.17]].map(([x, z]) => part([cbox(0.07, 0.36, 0.07, 0, -0.36, 0, W), cbox(0.08, 0.04, 0.1, 0, -0.36, 0.02, G)], x, 0.38, z));
    this.root.add(this.body, this.head, this.tail, ...this.legs);
    this.t = 0;
  }
  update(dt, speed, sit, lookAt) {
    this.t += dt;
    const swing = Math.min(1, speed * 1.8) * Math.sin(this.t * 11) * 0.5;
    this.legs.forEach((l, i) => { l.rotation.x = (i === 0 || i === 3 ? swing : -swing); });
    this.tail.rotation.y = Math.sin(this.t * (speed > 0.05 ? 9 : 5)) * 0.5;
    this.tail.rotation.x = -0.2;
    const s = sit ? 1 : 0;
    this.body.rotation.x = -0.35 * s; this.body.position.y = 0.46 - 0.08 * s;
    this.legs[2].position.y = this.legs[3].position.y = 0.38 - 0.12 * s;
    this.head.position.y = 0.62 + 0.04 * s + Math.sin(this.t * 2) * 0.005;
    if (lookAt) {
      _v.copy(lookAt); this.root.worldToLocal(_v);
      this.head.rotation.y = Math.max(-0.8, Math.min(0.8, Math.atan2(_v.x, _v.z - 0.3)));
    } else this.head.rotation.y *= 0.9;
  }
  /** A two-yip 8-bit bark from p. */
  bark(p) {
    try {
      const a = audio, out = a.out({ pos: p, vol: 0.5 }), t = a.ctx.currentTime;
      for (let i = 0; i < 2; i++) a.tone(out, t + i * 0.16, { wave: a.pulse(0.25), f: 620, f2: 340, dur: 0.1, vol: 0.28 });
    } catch { /* audio not ready */ }
  }
}

// ------------------------------------------------------------------ the alley
export class GhostAlley {
  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    this.group.name = 'ghostAlley';
    game.scene.add(this.group);
    this.buildScenery();
    // the girl
    const h = this.h = createHuman({ preset: 'schoolgirl', seed: 4404, height: 1.5 });
    h.finishPaint?.();
    this.mats = ghostify(h.root);
    // a depth-only copy drawn first, so only her outer surface shows through (no arms seen through the body)
    const pre = new THREE.SkinnedMesh(h.mesh.geometry, new THREE.MeshBasicMaterial({ colorWrite: false, map: h.tex, alphaTest: 0.5, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2 }));
    pre.bind(h.mesh.skeleton, h.mesh.bindMatrix);
    pre.renderOrder = 1; pre.boundingSphere = h.mesh.boundingSphere;
    h.mesh.add(pre);
    this.pre = pre;
    h.root.position.copy(HOME);
    h.root.rotation.y = Math.PI; // facing the street
    this.group.add(h.root);
    this.voice = talk(null, { base: 520, duty: 0.125, vol: 0.75 });
    // her dog
    const dog = this.dog = new GhostDog();
    this.mats.push(...ghostify(dog.root, 0.5));
    dog.root.position.set(HOME.x + 0.45, 0, HOME.z + 0.1);
    dog.root.rotation.y = Math.PI + 0.3;
    this.group.add(dog.root);
    this.dogSpeed = 0;
    this.state = 'wait'; // wait -> lead (walking her to the shrine) -> out (walking out, eyes front) -> wait
    this.t = 0; this.chatT = 4; this.grace = 0; this.speed = 0; this.alpha = 1; this.spookT = 3; this.spookN = 0;
    this.dusk = 0;
    game.interaction.add(h.root, {
      hint: () => (this.present ? { key: 'LMB', text: 'The girl in the alley', sub: this.flags.ghostAlley ? 'She looks happy to see you' : 'She is a little see-through...' } : null),
      use: () => { if (this.present) this.say(this.flags.ghostAlley ? pick(LINES.after) : pick(LINES.idle)); return false; },
      noHighlight: true,
    });
    game.interaction.add(dog.root, {
      hint: () => (this.present ? { key: 'LMB', text: 'Her dog', sub: 'Your hand goes right through him' } : null),
      use: () => { if (this.present) { dog.bark(dog.root.position.clone().setY(0.6)); } return false; },
      noHighlight: true,
    });
    this.buildOverlay();
  }

  get flags() { return this.game.state.flags || (this.game.state.flags = {}); }
  get inAlley() { const p = this.game.player.pos; return p.x > X0 - 0.1 && p.x < X1 + 0.1 && p.z > MOUTH + 0.25 && p.z < BACK; }
  /** She's there from late afternoon until dawn (and always while she's walking with you). */
  get present() {
    if (this.state !== 'wait') return true;
    const hr = this.game.clock?.hours ?? 18;
    return hr >= 16.5 || hr < 4.5;
  }

  say(text, dur = 3.4) { this.game.pedestrians?.bubbles.say(this.h, text, { dur, onChar: this.voice }); }

  // ---------------------------------------------------------------- scenery: post box, the lamp, the shrine's offerings, clutter
  buildScenery() {
    const G = this.group, geos = [];
    // 丸型ポスト: the old red round post box at the mouth (a 12-sided drum, domed cap, slot, white plate)
    const drum = new THREE.CylinderGeometry(0.21, 0.21, 1.05, 12); drum.translate(POST.x, 0.62, POST.z);
    const paint = (g, col) => { const c = new THREE.Color(col), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); if (g.index) return g.toNonIndexed(); return g; };
    const cap = new THREE.CylinderGeometry(0.17, 0.23, 0.12, 12); cap.translate(POST.x, 1.2, POST.z);
    const dome = new THREE.CylinderGeometry(0.06, 0.17, 0.08, 12); dome.translate(POST.x, 1.3, POST.z);
    const foot = new THREE.CylinderGeometry(0.24, 0.24, 0.1, 12); foot.translate(POST.x, 0.05, POST.z);
    geos.push(paint(drum, 0xc8281e), paint(cap, 0xb82018), paint(dome, 0xb82018), paint(foot, 0x2a2a2a));
    for (const g of [cbox(0.2, 0.03, 0.04, POST.x - 0.2, 0.98, POST.z, 0x1a1a1a, { ry: Math.PI / 2 }), cbox(0.02, 0.18, 0.13, POST.x - 0.205, 0.62, POST.z, 0xf4f0e6), cbox(0.02, 0.06, 0.13, POST.x - 0.21, 0.52, POST.z, 0xc8281e)]) geos.push(g.toNonIndexed());
    // the lamp: a weathered wooden pole by the east wall, an enamel shade on an arm over the alley
    for (const g of [cbox(0.12, 3.05, 0.12, LAMP.x, 0, LAMP.z, 0x5a4a3a), cbox(0.62, 0.05, 0.05, LAMP.x - 0.3, 2.8, LAMP.z, 0x3a3a38), cbox(0.03, 0.18, 0.03, LAMP.x - 0.56, 2.64, LAMP.z, 0x2a2a28),
      cbox(0.3, 0.06, 0.3, LAMP.x - 0.56, 2.56, LAMP.z, 0x2e5a3e), cbox(0.2, 0.05, 0.2, LAMP.x - 0.56, 2.61, LAMP.z, 0x2e5a3e), cbox(0.1, 0.08, 0.04, LAMP.x + 0.06, 1.6, LAMP.z, 0xe8e4d8)]) geos.push(g.toNonIndexed());
    // the shrine: offerings (a cup of water, sake, flowers, a little pile of coins), a red bib, two small stone lanterns
    for (const g of [cbox(0.08, 0.08, 0.08, -8.62, 0.42, 21.05, 0xe8e4dc), cbox(0.06, 0.13, 0.06, -8.24, 0.42, 21.05, 0xf4f0e6), cbox(0.05, 0.05, 0.05, -8.42, 0.42, 20.98, 0xc8a840),
      cbox(0.04, 0.2, 0.04, -8.78, 0.42, 21.1, 0x3e7a34), cbox(0.08, 0.06, 0.08, -8.78, 0.6, 21.1, 0xf8f0a0), cbox(0.04, 0.2, 0.04, -8.06, 0.42, 21.1, 0x3e7a34), cbox(0.08, 0.06, 0.08, -8.06, 0.6, 21.1, 0xf0a0c0),
      cbox(0.18, 0.5, 0.18, -9.05, 0, 21.0, 0x8a8880), cbox(0.26, 0.06, 0.26, -9.05, 0.5, 21.0, 0x7a7870), cbox(0.14, 0.12, 0.14, -9.05, 0.56, 21.0, 0xe8c070), cbox(0.26, 0.08, 0.26, -9.05, 0.68, 21.0, 0x7a7870),
      cbox(0.18, 0.5, 0.18, -7.8, 0, 21.0, 0x8a8880), cbox(0.26, 0.06, 0.26, -7.8, 0.5, 21.0, 0x7a7870), cbox(0.14, 0.12, 0.14, -7.8, 0.56, 21.0, 0xe8c070), cbox(0.26, 0.08, 0.26, -7.8, 0.68, 21.0, 0x7a7870)]) geos.push(g.toNonIndexed());
    // clutter down the alley: a covered drain on the east side, weeds, an old umbrella, broken pots, a cobwebbed meter on Mikawa-ya's wall
    for (let z = 15.6; z < 21.5; z += 0.6) geos.push(cbox(0.28, 0.03, 0.58, -7.68, 0, z, hash2(z * 10, 3) < 0.2 ? 0x6a6a64 : 0x8a8a84).toNonIndexed());
    for (let i = 0; i < 14; i++) { const z = 15.4 + hash2(i, 5) * 6.2, x = hash2(i, 6) < 0.5 ? -9.3 : -7.55, k = hash2(i, 7); geos.push(cbox(0.12 + k * 0.1, 0.1 + k * 0.25, 0.12, x + (x < -8 ? 0.06 : -0.06), 0, z, k < 0.5 ? 0x4a6a32 : 0x5a7a3a, { ry: k * 3 }).toNonIndexed()); }
    for (const g of [cbox(0.04, 0.9, 0.04, -9.25, 0, 17.6, 0x2a2a2a, { rz: 0.5 }), cbox(0.36, 0.06, 0.36, -9.05, 0.75, 17.6, 0x3a3a5a, { rz: 0.5 }),
      cbox(0.22, 0.18, 0.22, -9.2, 0, 19.2, 0xa8583a), cbox(0.18, 0.1, 0.12, -9.0, 0, 19.45, 0x98482a, { ry: 0.6 }),
      cbox(0.06, 0.32, 0.26, -9.37, 1.35, 18.2, 0xc8c4bc), cbox(0.02, 0.1, 0.14, -9.34, 1.45, 18.2, 0x2a2c2e)]) geos.push(g.toNonIndexed());
    const mesh = new THREE.Mesh(mergeGeometries(geos.map((g) => { if (!g.attributes.normal) g.computeVertexNormals(); if (g.attributes.uv) g.deleteAttribute('uv'); return g; })), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }));
    mesh.receiveShadow = true;
    G.add(mesh);
    this.game.player.addObstacle(POST.x - 0.24, POST.x + 0.24, POST.z - 0.24, POST.z + 0.24);
    this.game.player.addObstacle(LAMP.x - 0.08, LAMP.x + 0.08, LAMP.z - 0.08, LAMP.z + 0.08);
    // the bulb (flickers), its dithered pool on the ground
    this.bulbM = new THREE.MeshBasicMaterial({ color: 0xffd890 });
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.12), this.bulbM);
    bulb.position.set(LAMP.x - 0.56, 2.52, LAMP.z);
    G.add(bulb);
    this.poolM = new THREE.MeshBasicMaterial({ map: poolTexture(), alphaTest: 0.5, transparent: true, opacity: 0.32, depthWrite: false, color: 0xffc880 });
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.0), this.poolM);
    pool.rotation.x = -Math.PI / 2; pool.position.set(LAMP.x - 0.65, 0.014, LAMP.z); pool.renderOrder = 2;
    G.add(pool);
    this.flick = 1; this.flickT = 0;
    // the plaque on the block wall at the mouth
    const pl = plaque();
    pl.position.set(-7.462, 1.42, 15.75);
    pl.rotation.y = -Math.PI / 2;
    G.add(pl);
    // the hands (sprites out of the dark) and their pale prints crawling along the ground
    const sheet = handSheet();
    this.hands = [];
    for (let i = 0; i < 18; i++) {
      const m = new THREE.SpriteMaterial({ map: sheet.clone(), color: 0xd8ecff, transparent: true, alphaTest: 0.5, depthWrite: false, fog: false });
      m.map.repeat.set(1 / 3, 1); m.map.needsUpdate = true;
      const s = new THREE.Sprite(m);
      s.scale.set(0.42, 0.63, 1); s.visible = false; s.renderOrder = 5;
      G.add(s);
      this.hands.push({ s, m, t: 0, f: 0 });
    }
    this.shadows = [];
    for (let i = 0; i < 4; i++) {
      const t = sheet.clone(); t.repeat.set(1 / 3, 1); t.offset.x = 1 / 3; t.needsUpdate = true;
      const m = new THREE.MeshBasicMaterial({ map: t, color: 0x5a78c8, transparent: true, opacity: 0.5, alphaTest: 0.3, depthWrite: false });
      const s = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.05), m);
      s.rotation.x = -Math.PI / 2; s.visible = false; s.renderOrder = 3;
      G.add(s);
      this.shadows.push({ s, k: i });
    }
  }

  // ---------------------------------------------------------------- the dusk overlay (ordered-dither vignette) and screen hands
  buildOverlay() {
    const c = document.createElement('canvas');
    c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;image-rendering:pixelated;z-index:4;opacity:0;mix-blend-mode:multiply';
    c.width = 160; c.height = 90;
    (document.getElementById('app') || document.body).appendChild(c);
    const g = c.getContext('2d'), im = g.createImageData(c.width, c.height);
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      const dx = (x / c.width - 0.5) * 1.6, dy = (y / c.height - 0.5) * 1.25, r = Math.hypot(dx, dy);
      const dark = r * r * 1.25 > BAYER[(y & 3) * 4 + (x & 3)] / 16 + 0.18, o = (y * c.width + x) * 4;
      // dusk violet everywhere, deep indigo at the dithered edges
      im.data[o] = dark ? 52 : 214; im.data[o + 1] = dark ? 40 : 170; im.data[o + 2] = dark ? 96 : 200; im.data[o + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    this.overlay = c;
    // the grab: big pixel hands closing in from the screen edges
    const h = document.createElement('canvas');
    h.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;image-rendering:pixelated;z-index:5;display:none';
    h.width = 160; h.height = 90;
    (document.getElementById('app') || document.body).appendChild(h);
    this.grab = h;
    this.sheetImg = handSheet().image;
  }

  drawGrab(k) {
    const c = this.grab, g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    g.imageSmoothingEnabled = false;
    const f = k < 0.35 ? 0 : k < 0.7 ? 1 : 2, W = 16, H = 24, s = 2;
    const spots = [[-0.05, 0.75, 0.3], [0.95, 0.7, -0.3], [0.1, 1.0, 0.15], [0.85, 1.0, -0.2], [0.35, 1.05, 0.05], [0.62, 1.05, -0.05], [-0.05, 0.3, 0.6], [0.98, 0.25, -0.6]];
    spots.forEach(([x, y, a], i) => {
      const kk = Math.max(0, Math.min(1, k * 1.4 - i * 0.06));
      const px = (x + (0.5 - x) * kk * 0.45) * c.width, py = (y - kk * 0.35) * c.height;
      g.save(); g.translate(Math.round(px), Math.round(py)); g.rotate(a + (x > 0.5 ? Math.PI * 0.1 : -Math.PI * 0.1)); if (x > 0.5) g.scale(-1, 1);
      g.drawImage(this.sheetImg, f * W, 0, W, H, -W * s / 2, -H * s * 0.2, W * s, H * s);
      g.restore();
    });
  }

  // ---------------------------------------------------------------- per frame
  update(dt) {
    const g = this.game, h = this.h, P = g.player;
    this.t += dt;
    // the alley's own dusk: deeper in, darker and more violet (it's always evening in here)
    const depth = this.inAlley ? Math.min(1, (P.pos.z - MOUTH) / 3.5) : 0;
    this.dusk += (depth - this.dusk) * Math.min(1, dt * 3);
    this.overlay.style.opacity = (this.dusk * (this.state === 'out' ? 0.62 : 0.45)).toFixed(3);
    this.overlay.style.display = this.dusk > 0.01 ? 'block' : 'none';
    // the lamp: on, then a stutter, sometimes out for a beat
    if ((this.flickT -= dt) <= 0) {
      const r = Math.random();
      this.flick = r < 0.08 ? 0 : r < 0.25 ? 0.35 : 1;
      this.flickT = this.flick === 1 ? 0.2 + Math.random() * (this.state === 'out' ? 0.6 : 2.2) : 0.05 + Math.random() * 0.12;
    }
    const night = Math.max(0.35, g.lighting?.state?.night ?? 0.6);
    this.bulbM.color.setRGB(1, 0.85, 0.56).multiplyScalar(0.2 + this.flick * 1.3);
    this.poolM.opacity = 0.55 * this.flick * Math.max(0.5, night);
    const dPl = P.pos.distanceTo(h.root.position), near = dPl < 7;
    const show = this.present && dPl < 30;
    h.root.visible = this.dog.root.visible = show;
    this.updateHands(dt);
    if (!show) return;
    // she floats a hand's width off the ground and flickers a little
    h.root.position.y = 0.05 + Math.sin(this.t * 1.7) * 0.025;
    const flick = (1 + Math.sin(this.t * 7.3) * 0.05 + (Math.random() < 0.01 ? -0.35 : 0)) * this.alpha;
    for (const m of this.mats) m.opacity = m.userData.op * flick;
    this.pre.visible = this.alpha > 0.3;
    if (!g.cutscene.active) this.logic(dt);
    // walk toward the target (lead: the shrine) or stand
    const tgt = this.state === 'wait' ? HOME : END;
    _d.subVectors(tgt, h.root.position).setY(0);
    const dist = _d.length();
    const want = dist > 0.08 ? Math.min(0.95, dist * 1.6) : 0;
    this.speed += (want - this.speed) * Math.min(1, dt * 4);
    if (this.speed > 0.02) {
      h.root.position.addScaledVector(_d.normalize(), this.speed * dt);
      const yaw = Math.atan2(_d.x, _d.z);
      h.root.rotation.y += Math.atan2(Math.sin(yaw - h.root.rotation.y), Math.cos(yaw - h.root.rotation.y)) * Math.min(1, dt * 6);
    } else {
      // stand facing the player when they're near, else the street
      const look = near ? Math.atan2(P.pos.x - h.root.position.x, P.pos.z - h.root.position.z) : Math.PI;
      h.root.rotation.y += Math.atan2(Math.sin(look - h.root.rotation.y), Math.cos(look - h.root.rotation.y)) * Math.min(1, dt * 3);
    }
    h.update(dt, { speed: this.speed, lookAt: near ? g.camera.position : null, talking: g.pedestrians?.bubbles.isTalking(h) });
    // the dog trots at her heel
    const D = this.dog, side = _v.set(0.45, 0, 0.1).applyAxisAngle(THREE.Object3D.DEFAULT_UP, h.root.rotation.y).add(h.root.position).setY(0);
    _d.subVectors(side, D.root.position).setY(0);
    const cd = _d.length(), cs = cd > 0.12 ? Math.min(1.2, cd * 2.2) : 0;
    this.dogSpeed += (cs - this.dogSpeed) * Math.min(1, dt * 5);
    if (this.dogSpeed > 0.05) {
      D.root.position.addScaledVector(_d.normalize(), this.dogSpeed * dt);
      const yaw = Math.atan2(_d.x, _d.z);
      D.root.rotation.y += Math.atan2(Math.sin(yaw - D.root.rotation.y), Math.cos(yaw - D.root.rotation.y)) * Math.min(1, dt * 8);
    }
    D.root.position.y = 0.03 + Math.sin(this.t * 1.9 + 1) * 0.015;
    D.update(dt, this.dogSpeed, this.dogSpeed < 0.05, near ? g.camera.position : null);
  }

  logic(dt) {
    const g = this.game, P = g.player, f = this.flags;
    this.grace = Math.max(0, this.grace - dt);
    if (this.state === 'wait') {
      if ((this.chatT -= dt) < 0 && P.pos.distanceTo(this.h.root.position) < 4.5 && !this.inAlley) {
        this.chatT = 14 + Math.random() * 10;
        this.say(f.ghostAlley ? pick(LINES.after) : pick(LINES.idle));
      }
      if (this.inAlley && !f.ghostAlley) g.cutscene.play((c) => this.introScene(c));
      return;
    }
    if (this.state === 'lead') {
      if (!this.inAlley) { this.state = 'wait'; this.say(pick(LINES.leave)); return; }
      if (P.pos.z > SHRINE) g.cutscene.play((c) => this.shrineScene(c));
      return;
    }
    // 'out': eyes front all the way to the street
    if (P.pos.z < MOUTH - 0.2 && P.pos.x > X0 - 1 && P.pos.x < X1 + 1) { g.cutscene.play((c) => this.winScene(c)); return; }
    g.camera.getWorldDirection(_v);
    if (this.grace <= 0 && P.pos.z > MOUTH + 0.3 && _v.z > 0.35) { g.cutscene.play((c) => this.caughtScene(c), { skippable: false, letterbox: false }); return; }
    this.spook(dt);
  }

  /** Something behind you: footsteps keeping pace, whispers, the dog, her voice asking you to turn round. */
  spook(dt) {
    const g = this.game, P = g.player;
    if ((this.spookT -= dt) > 0) return;
    this.spookT = 1.6 + Math.random() * 2.2;
    const behind = P.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.6, 1.2, 1.3 + Math.random()));
    const k = this.spookN++ % 6;
    try {
      if (k === 0 || k === 3) for (let i = 0; i < 3; i++) setTimeout(() => { try { audio.play('footstep', { pos: behind, surface: 'concrete' }); } catch { /* */ } }, i * 420);
      else if (k === 1) { const out = audio.out({ pos: behind, vol: 0.5 }), t = audio.ctx.currentTime; for (let i = 0; i < 4; i++) audio.burst(out, t + i * 0.13, { dur: 0.1, vol: 0.12, type: 'bandpass', f: 2400 + Math.random() * 1600, q: 3 }); g.monologue?.say(pick(LINES.inner), { force: true }); }
      else if (k === 2) this.dog.bark(behind);
      else if (k === 4) this.say(pick(LINES.behind), 2.6);
      else audio.play('furin', { pos: behind, vol: 0.6 });
    } catch { /* audio not ready */ }
  }

  /** Hand sprites rising out of the dark (caught) and pale hand prints crawling ahead of you (walking out). */
  updateHands(dt) {
    const g = this.game, P = g.player;
    for (const H of this.hands) {
      if (!H.s.visible) continue;
      H.t += dt;
      const f = Math.max(0, Math.min(2, Math.floor(H.t * 7)));
      if (f !== H.f) { H.f = f; H.m.map.offset.x = f / 3; }
      // rise, then lunge toward the camera in steps
      const step = Math.floor(H.t * 10) / 10;
      H.s.position.lerpVectors(H.from, H.to, Math.min(1, Math.max(0, step * 1.3)));
    }
    const out = this.state === 'out' && !g.cutscene.active;
    this.shadows.forEach((S, i) => {
      S.s.visible = out && this.grace <= 0;
      if (!S.s.visible) return;
      // they slide past your feet toward the street in steps, as if whatever casts them were right behind you
      const lag = Math.floor(((this.t * 0.3 + i * 0.27) % 1) * 8) / 8;
      S.s.visible = lag > 0.05 && lag < 0.9;
      S.s.position.set(Math.max(X0 + 0.2, Math.min(X1 - 0.2, P.pos.x + (i - 1.5) * 0.36)), 0.016, P.pos.z - 1.7 - lag * 2.2);
      S.s.rotation.z = Math.PI + (i - 1.5) * 0.14;
    });
  }

  // ---------------------------------------------------------------- scenes
  *introScene(c) {
    const g = this.game, h = this.h;
    const hp = h.root.position, eye = new THREE.Vector3(-8.35, g.player.eye, Math.min(g.player.pos.z, hp.z - 1.6));
    yield c.cam({ pos: eye, look: new THREE.Vector3(hp.x, 1.25, hp.z), dur: 0.8 });
    menace({ kind: 'go', dur: 3.2 });
    h.gesture?.('wave');
    this.dog.bark(this.dog.root.position.clone().setY(0.6));
    yield c.say('Oh! A visitor. You can see me? And my dog?', 1.4, 'Girl in the alley', this.voice);
    yield c.say('This alley is a crossing. Walk me to the little shrine at the end.', 1.4, 'Girl in the alley', this.voice);
    yield c.say('Going in is easy. It\'s the way OUT that has a rule.', 1.4, 'Girl in the alley', this.voice);
    c.hideSay();
    this.state = 'lead'; this.grace = 1.5; this.flags.ghostMet = true;
    yield c.toPlayer(0.6);
  }

  *shrineScene(c) {
    const g = this.game, P = g.player, h = this.h;
    yield c.cam({ pos: new THREE.Vector3(-8.2, 1.5, 19.4), look: new THREE.Vector3(h.root.position.x, 1.2, h.root.position.z), dur: 0.8 });
    yield c.say('Here we are. Now listen carefully.', 1.0, 'Girl in the alley', this.voice);
    yield c.say('Walk back out to the street. Whatever you hear behind you...', 1.2, 'Girl in the alley', this.voice);
    menace({ kind: 'do', dur: 2.8 });
    yield c.say('DON\'T. LOOK. BACK. Not until you\'re out. Or they\'ll take you.', 1.8, 'Girl in the alley', this.voice);
    c.hideSay();
    this.flick = 0; this.flickT = 0.6;
    // face the way out
    P.yaw = 0; P.pitch = -0.05;
    this.state = 'out'; this.grace = 2.2; this.spookT = 2.5; this.spookN = 0;
    yield c.toPlayer(0.7);
  }

  *caughtScene(c) {
    const g = this.game, P = g.player, cam = g.camera;
    audio.play('menace', { kind: 'don' });
    // the hands: out of the ground and the walls in front of you (the way you just looked), reaching for you
    cam.getWorldDirection(_v).setY(0).normalize();
    const eye = cam.getWorldPosition(new THREE.Vector3());
    this.hands.forEach((H, i) => {
      const a = (i / this.hands.length - 0.5) * 2.2, dist = 1.2 + (i % 4) * 0.55;
      const side = new THREE.Vector3(-_v.z, 0, _v.x);
      const base = eye.clone().addScaledVector(_v, dist).addScaledVector(side, Math.sin(a) * 1.1);
      base.x = Math.max(X0 - 0.05, Math.min(X1 + 0.05, base.x));
      H.from = base.clone().setY(-0.35 + (i % 3) * 0.6);
      H.to = eye.clone().addScaledVector(_v, 0.35).addScaledVector(side, Math.sin(a) * 0.35).setY(eye.y - 0.25 + (i % 3) * 0.2);
      H.s.position.copy(H.from); H.t = -(i % 6) * 0.06; H.f = -1; H.s.visible = true;
    });
    this.grab.style.display = 'block';
    document.body.classList.add('lookback');
    yield c.wait(0.12);
    document.body.classList.remove('lookback');
    let k = 0;
    yield c.until((dt) => { k += dt; this.drawGrab(Math.floor(Math.min(1, k / 0.7) * 6) / 6); return k > 0.75; });
    // dragged: yanked down the alley in jerks, then the dark
    const from = P.pos.clone(), to = new THREE.Vector3(-8.4, 0, BACK - 0.6);
    k = 0;
    yield c.all(c.fade(1, 0.9), c.until((dt) => {
      k += dt;
      const s = Math.floor(Math.min(1, k / 0.9) * 8) / 8;
      P.pos.lerpVectors(from, to, s * 0.7); P.pitch = 0.25 + Math.sin(k * 40) * 0.04;
      this.drawGrab(1);
      return k > 0.9;
    }));
    this.hands.forEach((H) => { H.s.visible = false; });
    this.grab.style.display = 'none';
    // you come to on the street, facing the alley again
    P.pos.set(-8.4, 0, MOUTH - 1.1); P.vel?.set(0, 0, 0); P.yaw = Math.PI; P.pitch = -0.05;
    this.h.root.position.copy(HOME); this.dog.root.position.set(HOME.x + 0.45, 0, HOME.z + 0.1);
    this.state = 'wait'; this.speed = 0;
    this.flags.ghostFails = (this.flags.ghostFails || 0) + 1;
    yield c.wait(0.5);
    yield c.fade(0, 0.8);
    yield c.say('You looked back... Hands came out of the dark and dragged you away.', 1.4);
    yield c.say('...You came to on the street. She\'s waiting at the mouth of the alley again.', 1.2);
    c.hideSay();
    this.say('Eyes forward this time. Promise?', 3);
  }

  *winScene(c) {
    const g = this.game, h = this.h, f = this.flags;
    // you're out: now you may look back. She waves from the shrine; the shrine's gift waits on the post box
    yield c.cam({ pos: new THREE.Vector3(-8.1, 1.7, MOUTH - 0.6), look: new THREE.Vector3(-8.6, 1.0, END.z - 0.5), dur: 1.1 });
    menace({ kind: 'don', at: [innerWidth * 0.5 - 140, innerHeight * 0.16], dur: 2.2 });
    h.gesture?.('wave');
    this.dog.bark(this.dog.root.position.clone().setY(0.6));
    const sid = SERIES_BY_ID.bizarre ? 'bizarre' : pick(SERIES.filter((s) => !s.hidden)).id;
    let roll = rollCapsule(sid, Math.random, { rareLuck: 1.5 });
    for (let i = 0; i < 6 && (roll.rarity === 'common' || roll.rarity === 'uncommon'); i++) roll = rollCapsule(sid, Math.random, { rareLuck: 1.5 });
    const first = !f.ghostAlley;
    if (first) {
      g.items.spawnCapsule({ series: sid, ...roll }, POST.clone().setY(1.45), new THREE.Vector3(0, 0.3, -0.4));
      g.addMoney(REWARD);
    }
    f.ghostAlley = true;
    yield c.say('You made it out without looking back!', 1.2, 'Girl in the alley', this.voice);
    yield c.say(first ? 'The shrine left you something on the post box. Thank you for walking with me.' : 'See? Not so scary. Come and visit us.', 1.4, 'Girl in the alley', this.voice);
    c.hideSay();
    if (first) g.news('The ghost alley\'s blessing', `A rare capsule + ${formatYen(REWARD)}`);
    // she fades out, then back at the mouth where she always waits
    yield c.until((dt) => { this.alpha = Math.max(0, this.alpha - dt * 0.8); return this.alpha <= 0; });
    h.root.position.copy(HOME); this.dog.root.position.set(HOME.x + 0.45, 0, HOME.z + 0.1);
    this.state = 'wait'; this.speed = 0;
    yield c.toPlayer(0.7);
    this.alpha = 1;
  }
}
