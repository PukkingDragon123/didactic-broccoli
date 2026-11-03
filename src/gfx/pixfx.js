// Pixel-art particles. Every particle in the game is a small 2D sprite drawn pixel by pixel into one shared atlas
// (hand-pixelled frame strips, nearest filtering) and played as a stepped frame animation. Sprites are drawn as
// screen-aligned points whose on-screen size snaps to a whole number of screen pixels per art pixel (their centres
// snap to the pixel grid too), so the pixels stay square, chunky and crisp at any distance. No soft glows, gradients or
// additive blending: a texel is either drawn opaque or cut, and fades are ordered-dither dissolves on the art pixels.
// CPU-simulated (gravity, drag, flutter, floor bounces, following an object), all drawn in a single draw call.
//   const fx = new PixFX(scene, { groundAt(x, z, y) });  fx.emit({ sprite: 'spark', pos, vel, life, size, color });
//   fx.update(dt);   SPRITES lists what there is; sprite(name) gives its frames.
import * as THREE from 'three';

// ---------------------------------------------------------------------------------------------- the atlas
// Letters in the art: '.' empty; a-e a grey ramp that the particle's colour tints (a = full colour ... e = darkest
// outline shade); W a white that is never tinted; capitals in a sprite's own palette are fixed colours.
const AW = 512, AH = 256;
const RAMP = { a: 1, b: 0.78, c: 0.56, d: 0.36, e: 0.18 };
const atlas = new Uint8Array(AW * AH * 4);
const SPR = {};
let packX = 0, packY = 0, rowH = 0;

function alloc(w, h) {
  if (packX + w > AW) { packX = 0; packY += rowH + 1; rowH = 0; }
  const r = { x: packX, y: packY, w, h };
  packX += w + 1; rowH = Math.max(rowH, h);
  if (packY + h > AH) throw new Error('pixfx atlas full');
  return r;
}
function put(r, x, y, rgb, tinted) {
  if (x < 0 || y < 0 || x >= r.w || y >= r.h) return;
  const o = ((r.y + y) * AW + r.x + x) * 4;
  atlas[o] = rgb[0]; atlas[o + 1] = rgb[1]; atlas[o + 2] = rgb[2]; atlas[o + 3] = tinted ? 255 : 200; // alpha 200: untinted
}
const hexRGB = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
function texel(ch, pal) {
  if (RAMP[ch] !== undefined) { const v = Math.round(RAMP[ch] * 255); return [[v, v, v], true]; }
  if (ch === 'W') return [[255, 255, 255], false];
  if (pal && pal[ch] !== undefined) return [hexRGB(pal[ch]), false];
  return null;
}

/** A sprite from hand-drawn frames (arrays of strings, all frames padded to the largest one, centred). */
function art(name, frames, pal) {
  const w = Math.max(...frames.flat().map((r) => r.length)), h = Math.max(...frames.map((f) => f.length));
  SPR[name] = { w, h, frames: frames.map((f) => {
    const r = alloc(w, h), oy = Math.floor((h - f.length) / 2);
    f.forEach((row, y) => {
      const ox = Math.floor((w - row.length) / 2);
      for (let x = 0; x < row.length; x++) { const t = texel(row[x], pal); if (t) put(r, ox + x, oy + y, t[0], t[1]); }
    });
    return r;
  }) };
}

/** A sprite drawn by code: fn(k, set(x, y, ch)) for each of n frames of w x h. */
function code(name, n, w, h, fn, pal) {
  SPR[name] = { w, h, frames: Array.from({ length: n }, (_, k) => {
    const r = alloc(w, h);
    fn(k, (x, y, ch) => { const t = texel(ch, pal); if (t) put(r, Math.round(x), Math.round(y), t[0], t[1]); });
    return r;
  }) };
}

// --- sparkle: a twinkle that blooms into a four-point star and shrinks back (white heart, tinted arms)
art('spark', [
  ['a'],
  ['.b.', 'bab', '.b.'],
  ['..c..', '..a..', 'caWac', '..a..', '..c..'],
  ['...c...', '...b...', '...a...', 'cbaWabc', '...a...', '...b...', '...c...'],
  ['.c...c.', '...b...', '...a...', '.baWab.', '...a...', '...b...', '.c...c.'],
  ['..c..', '..a..', 'caWac', '..a..', '..c..'],
  ['.b.', 'bab', '.b.'],
  ['b'],
]);
// --- a plain mote / ember: a little block that shrinks
art('dot', [['ab', 'bc'], ['ab', 'bc'], ['a']]);
art('mote', [['a'], ['b']]);
// --- dust / smoke puff: a lumpy blob lit from the top left that swells, breaks up and scatters
art('puff', [
  ['.bb.', 'baab', 'bacc', '.cc.'],
  ['..bbb.', '.baaab', 'baaabc', 'baabcc', '.bccc.', '..cc..'],
  ['..bbb...', '.baaabb.', 'baaaaabc', 'baaabbcc', '.babbccd', '.bcccdd.', '..cdd...'],
  ['..b..bb.', '.ba.ab..', 'b.aa..bc', '.a...b.c', 'b.ab..cd', '..c.cd..', '...d....'],
  ['.c....c.', '....c...', 'c......d', '...c....', '.d...c..', '.....d..', '..d.....'],
]);
// --- confetti: a paper square tumbling (face on, tipping, edge on, the other way)
art('confetti', [['aab', 'abb'], ['ab.', 'bc.', '...'], ['a', 'c'], ['.ab', 'abc'], ['abb'], ['b', 'b', 'c']]);
// --- sakura petal tumbling
art('petal', [
  ['.LP.', 'LPPD', '.PD.'],
  ['LP.', 'PPD', '.D.'],
  ['LPPD'],
  ['.PL.', 'DPPL', '.DP.'],
], { L: 0xffe2ec, P: 0xffb4c8, D: 0xe08aa4 });
// --- coin: a gold go-en with its hole, spinning (face, three-quarter, half, edge)
code('coin', 6, 8, 8, (k, set) => {
  const ws = [8, 6, 4, 2, 4, 6], w = ws[k], cx = 3.5, cy = 3.5, rx = w / 2, ry = 4;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const dx = (x - cx) / rx, dy = (y - cy) / ry, d = dx * dx + dy * dy;
    if (d > 1.0 || w <= 0) continue;
    const edge = (((x - cx) / Math.max(0.5, rx - 1)) ** 2 + ((y - cy) / (ry - 1)) ** 2) > 1;
    const hole = w >= 6 && Math.abs(x - cx) < 1 && Math.abs(y - cy) < 1;
    if (hole) continue;
    if (w === 2) { set(x, y, y < 2 ? 'H' : y > 5 ? 'S' : 'Y'); continue; }
    set(x, y, edge ? 'O' : (x < cx - 0.5 && y < cy) ? 'H' : (x > cx + 0.5 && y > cy) ? 'S' : 'Y');
  }
}, { O: 0x8a5a14, Y: 0xf4c23c, H: 0xfff2a8, S: 0xc88a1c });
// --- heart: pops in, holds, and its glint goes out
art('heart', [
  ['O.O', 'OPO', '.O.'],
  ['.OO.OO.', 'OLPOPPO', 'OWLPPPO', 'OPPPPPO', '.OPPPO.', '..OPO..', '...O...'],
  ['.OO.OO.', 'OLPOPPO', 'OWLPPPO', 'OPPPPPO', '.OPPPO.', '..OPO..', '...O...'],
  ['.OO.OO.', 'OPPOPPO', 'OLPPPPO', 'OPPPPPO', '.OPPPO.', '..OPO..', '...O...'],
], { O: 0x7a1838, P: 0xff5f8a, L: 0xffa8c0 });
// --- shockwave ring: a pixel circle that grows, thins and breaks up
code('ring', 7, 25, 25, (k, set) => {
  const r = 2.5 + k * 1.6, c = 12, th = k < 3 ? 1.6 : 1.0;
  for (let y = 0; y < 25; y++) for (let x = 0; x < 25; x++) {
    const d = Math.hypot(x - c, y - c);
    if (Math.abs(d - r) > th / 2 + 0.25) continue;
    if (k >= 5 && (x + y + k) % 3 === 0) continue;
    if (k >= 6 && (x * 7 + y * 3) % 2 === 0) continue;
    set(x, y, d < r ? 'b' : 'a');
  }
});
// --- light burst behind a reveal: pixel rays round a starburst, turning in stepped frames (every other ray untinted)
code('burst', 6, 63, 63, (k, set) => {
  const c = 31, n = 16;
  for (let i = 0; i < n; i++) {
    // six frames turn the pattern by two ray spacings (long and short rays alternate), so the loop is seamless
    const a = (i / n) * Math.PI * 2 + (k / 6) * (Math.PI * 4 / n), L = i % 2 ? 21 : 30;
    for (let s = 4; s <= L; s += 0.5) {
      const x = c + Math.cos(a) * s, y = c + Math.sin(a) * s;
      if (s > L - 5 && Math.round(s * 2) % 3 === 0) continue; // ragged tips
      set(x, y, i % 2 ? (s < 12 ? 'W' : s < 17 ? 'b' : 'c') : s < 11 ? 'a' : s < 21 ? 'b' : 'c');
      if (s < 10 && i % 2 === 0) set(x + Math.sin(a) * 0.9, y - Math.cos(a) * 0.9, 'a'); // thicker at the root
    }
  }
  for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (Math.abs(x) + Math.abs(y) <= 2) set(c + x, c + y, 'W');
  for (const [x, y] of [[3, 0], [-3, 0], [0, 3], [0, -3], [2, 2], [-2, -2], [2, -2], [-2, 2]]) set(c + x, c + y, 'a');
});
// --- camera flash: a hard starburst that shrinks to a point
code('flash', 4, 15, 15, (k, set) => {
  const c = 7, L = [7, 5, 3, 1][k], D = [4, 3, 1, 0][k], B = [2, 1, 1, 0][k];
  for (let i = -L; i <= L; i++) { set(c + i, c, Math.abs(i) <= B ? 'W' : 'a'); set(c, c + i, Math.abs(i) <= B ? 'W' : 'a'); }
  for (let i = 1; i <= D; i++) for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) set(c + sx * i, c + sy * i, 'b');
  for (let y = -B; y <= B; y++) for (let x = -B; x <= B; x++) if (Math.abs(x) + Math.abs(y) <= B) set(c + x, c + y, 'W');
});
// --- liquid: a falling drop (round, then stretched by its speed), a splash crown, a spatter and a sitting droplet
art('drop', [['.a.', 'aab', '.b.'], ['.a.', '.a.', 'aab', 'abc', '.c.'], ['a.', 'ab', 'bc', 'c.']]);
art('splash', [
  ['.........', '.........', '...a.a...', '..a.a.a..', '.abbbbba.'],
  ['..a...a..', '.a.a.a.a.', '...b.b...', '..b...b..', '.bbbbbbb.'],
  ['.a.....a.', '.........', 'a..a.a..a', '.b.....b.', '..bbbbb..'],
  ['a.......a', '.........', '..c...c..', '.........', '...ccc...'],
]);
art('bead', [['ab', 'bc'], ['a']]);
// --- sleepy z, the anger vein, a startled mark, a little musical note
art('zz', [['aaaa', '..b.', '.b..', 'bbbb'], ['aaa', '.b.', 'bbb']]);
art('anger', [
  ['.RR.RR.', 'R.R.R.R', 'RR...RR', '.......', 'RR...RR', 'R.R.R.R', '.RR.RR.'],
  ['.R...R.', 'RR...RR', '.......', '.......', '.......', 'RR...RR', '.R...R.'],
], { R: 0xe8303a });
art('bang', [['.K.', 'KYK', 'KYK', 'KYK', '.K.', 'KYK', '.K.']], { K: 0x2a1a12, Y: 0xfff0a0 });
art('note', [['..aa', '..ab', '..a.', 'aaa.', 'aab.']]);
// --- "PAF!": a comic impact burst for a slap (spiky yellow star, white letters with a dark outline)
const FONT3 = { P: ['WW.', 'W.W', 'WW.', 'W..', 'W..'], A: ['.W.', 'W.W', 'WWW', 'W.W', 'W.W'], F: ['WWW', 'W..', 'WW.', 'W..', 'W..'], '!': ['W', 'W', 'W', '.', 'W'] };
code('paf', 4, 31, 19, (k, set) => {
  const cx = 15, cy = 9, sc = [0.45, 1, 1, 0.75][k];
  for (let y = 0; y < 19; y++) for (let x = 0; x < 31; x++) {
    const dx = x - cx, dy = (y - cy) / 0.62, a = Math.atan2(dy, dx), r = Math.hypot(dx, dy);
    const R = (10 + (Math.cos(a * 7 + 0.4) > 0.25 ? 4.2 : 0)) * sc;
    if (k === 3 && (x * 3 + y * 5) % 4 === 0) continue;
    if (r <= R - 1.7) set(x, y, r < R * 0.55 ? 'Y' : 'H'); else if (r <= R - 0.6) set(x, y, 'O'); else if (r <= R + 0.35) set(x, y, 'K');
  }
  if (k === 1 || k === 2) {
    // red comic letters with a dark drop shadow, right on the yellow
    const word = 'PAF!', x0 = cx - 6, y0 = cy - 2 - (k === 1 ? 1 : 0);
    const pts = [];
    let x = x0;
    for (const ch of word) { const g = FONT3[ch]; g.forEach((row, yy) => { for (let xx = 0; xx < row.length; xx++) if (row[xx] === 'W') pts.push([x + xx, y0 + yy]); }); x += g[0].length + 1; }
    for (const [px, py] of pts) { set(px + 1, py + 1, 'K'); }
    for (const [px, py] of pts) set(px, py, 'R');
  }
}, { Y: 0xfff09a, H: 0xffd23f, O: 0xff7a2a, K: 0x2a1a12, R: 0xd8262e });

const tex = new THREE.DataTexture(atlas, AW, AH, THREE.RGBAFormat, THREE.UnsignedByteType);
tex.magFilter = tex.minFilter = THREE.NearestFilter;
tex.generateMipmaps = false;
tex.colorSpace = THREE.SRGBColorSpace;
tex.needsUpdate = true;

export const SPRITES = SPR;
export function sprite(name) { return SPR[name]; }

// ---------------------------------------------------------------------------------------------- drawing
const VS = /* glsl */`
  attribute vec4 aFrame; attribute vec3 aCol; attribute vec3 aPF;
  uniform vec2 uRes;
  varying vec4 vFrame; varying vec3 vCol; varying float vFade; varying float vFlip;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec4 clip = projectionMatrix * mv;
    // screen pixels per world unit at this depth -> whole screen pixels per art pixel (never below one)
    float ppu = 0.5 * uRes.y * projectionMatrix[1][1] / max(1e-4, -mv.z);
    float s = max(1.0, floor(aPF.x * ppu + 0.5));
    float size = min(max(aFrame.z, aFrame.w) * s, 480.0);
    // centre on the pixel grid so art pixels land on screen pixels
    if (clip.w > 0.0) {
      vec2 scr = (clip.xy / clip.w * 0.5 + 0.5) * uRes;
      float off = mod(size, 2.0) * 0.5;
      scr = floor(scr - off + 0.5) + off;
      clip.xy = (scr / uRes * 2.0 - 1.0) * clip.w;
    }
    gl_Position = clip;
    gl_PointSize = aPF.y > 0.0 ? size : 0.0;
    vFrame = aFrame; vCol = aCol; vFade = aPF.y; vFlip = aPF.z;
  }`;
const FS = /* glsl */`
  uniform sampler2D uMap; uniform vec2 uAtlas;
  varying vec4 vFrame; varying vec3 vCol; varying float vFade; varying float vFlip;
  float b2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
  void main() {
    vec2 pc = gl_PointCoord;
    if (vFlip > 0.5) pc.x = 1.0 - pc.x;
    float cell = max(vFrame.z, vFrame.w);
    vec2 px = pc * cell - (vec2(cell) - vFrame.zw) * 0.5;
    if (px.x < 0.0 || px.y < 0.0 || px.x >= vFrame.z || px.y >= vFrame.w) discard;
    vec2 ip = floor(px);
    vec4 t = texture2D(uMap, (vFrame.xy + ip + 0.5) / uAtlas);
    if (t.a < 0.5) discard;
    // ordered-dither dissolve on the art pixels (4x4 Bayer)
    float bay = b2(ip * 0.5) * 0.25 + b2(ip);
    if (bay >= vFade) discard;
    vec3 c = t.a > 0.9 ? t.rgb * vCol : t.rgb;
    // kept just under the bloom threshold: crisp pixels, never a soft halo
    float m = max(c.r, max(c.g, c.b));
    if (m > 0.86) c *= 0.86 / m;
    gl_FragColor = vec4(c, 1.0);
  }`;

const _c = new THREE.Color(), _v = new THREE.Vector3();
const ATTRS = ['position', 'aFrame', 'aCol', 'aPF'];

export class PixFX {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.groundAt = opts.groundAt || (() => 0);
    const N = this.max = opts.max || 6000;
    this.pos = new Float32Array(N * 3);
    this.frm = new Float32Array(N * 4);
    this.col = new Float32Array(N * 3);
    this.pf = new Float32Array(N * 3);
    const g = new THREE.BufferGeometry();
    const attr = (a, n) => new THREE.BufferAttribute(a, n).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', attr(this.pos, 3));
    g.setAttribute('aFrame', attr(this.frm, 4));
    g.setAttribute('aCol', attr(this.col, 3));
    g.setAttribute('aPF', attr(this.pf, 3));
    g.setDrawRange(0, 0);
    this.uRes = new THREE.Vector2(1280, 720);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: tex }, uAtlas: { value: new THREE.Vector2(AW, AH) }, uRes: { value: this.uRes } },
      vertexShader: VS, fragmentShader: FS,
      transparent: true, depthWrite: false, depthTest: true,
    });
    const pts = this.points = new THREE.Points(g, this.mat);
    pts.frustumCulled = false;
    pts.renderOrder = 20;
    pts.name = 'pixfx';
    pts.raycast = () => {};
    pts.onBeforeRender = (renderer) => {
      const rt = renderer.getRenderTarget();
      if (rt) this.uRes.set(rt.width, rt.height); else renderer.getDrawingBufferSize(this.uRes);
    };
    scene.add(pts);
    this.list = [];
    this.pool = [];
    this.t = 0;
  }

  /**
   * Spawn one particle. o: sprite, pos (or x, y, z), vel (or vx, vy, vz), life (s), size (world size of the sprite's
   * longer side) or px (world size of one art pixel), color (hex / Color), gravity (m/s2 down), drag (1/s), flutter
   * (sideways drift while falling), floor (land on the ground), bounce (0..1), anim 'life' | 'loop' | 'once' | 'hold',
   * fps, frame, seq (frame list played over the life), fade (dissolve over that last fraction of the life), fadeIn,
   * flip (mirror; true = random), follow (Object3D: rides along with it, pos is then the offset), grow [from, to],
   * landFrame, onLand(p), onBounce(p), update(p, dt) (custom motion). Returns the particle.
   */
  emit(o) {
    if (this.list.length >= this.max) return null;
    const S = SPR[o.sprite || 'dot'];
    if (!S) return null;
    const p = this.pool.pop() || {};
    p.S = S;
    p.x = o.pos ? o.pos.x : o.x || 0; p.y = o.pos ? o.pos.y : o.y || 0; p.z = o.pos ? o.pos.z : o.z || 0;
    p.vx = o.vel ? o.vel.x : o.vx || 0; p.vy = o.vel ? o.vel.y : o.vy || 0; p.vz = o.vel ? o.vel.z : o.vz || 0;
    p.age = 0; p.life = o.life ?? 1;
    p.px = o.px ?? (o.size ?? 0.02) / Math.max(S.w, S.h);
    _c.set(o.color ?? 0xffffff);
    p.r = _c.r; p.g = _c.g; p.b = _c.b;
    p.grav = o.gravity ?? 0; p.drag = o.drag ?? 0; p.flut = o.flutter ?? 0; p.seed = Math.random() * 100;
    p.floor = !!o.floor; p.bounce = o.bounce ?? 0; p.landed = false; p.bounces = 0;
    p.anim = o.anim || 'life'; p.fps = o.fps ?? 12; p.frame = o.frame ?? 0; p.seq = o.seq || null;
    p.fade = o.fade ?? 0.3; p.fadeIn = o.fadeIn ?? 0; p.alpha = o.alpha ?? 1;
    p.flip = o.flip === true ? Math.random() < 0.5 : !!o.flip;
    p.follow = o.follow || null;
    p.grow = o.grow || null;
    p.landFrame = o.landFrame ?? -1;
    p.onLand = o.onLand || null; p.onBounce = o.onBounce || null; p.upd = o.update || null;
    p.data = o.data || null;
    this.list.push(p);
    return p;
  }

  kill(p) { p.age = p.life = 0; }

  get count() { return this.list.length; }

  update(dt) {
    this.t += dt;
    const L = this.list;
    let n = 0;
    for (let i = 0; i < L.length; i++) {
      const p = L[i];
      p.age += dt;
      if (p.age >= p.life) { p.follow = null; p.onLand = p.onBounce = p.upd = p.data = null; this.pool.push(p); continue; }
      this.step(p, dt);
      L[n] = p;
      this.write(p, n);
      n++;
    }
    L.length = n;
    const g = this.points.geometry;
    g.setDrawRange(0, n);
    if (n) for (const k of ATTRS) { const a = g.attributes[k]; a.clearUpdateRanges(); a.addUpdateRange(0, n * a.itemSize); a.needsUpdate = true; }
  }

  step(p, dt) {
    if (p.upd) { p.upd(p, dt); return; }
    if (p.follow) return;
    if (p.landed) return;
    const d = p.drag ? Math.max(0, 1 - p.drag * dt) : 1;
    p.vx *= d; p.vy *= d; p.vz *= d;
    p.vy -= p.grav * dt;
    if (p.flut) {
      const fall = p.vy < 0 ? 1 : 0.3;
      p.vx += Math.sin(p.age * 6.3 + p.seed) * p.flut * dt * fall;
      p.vz += Math.cos(p.age * 5.1 + p.seed * 1.3) * p.flut * dt * fall;
    }
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.floor) {
      const gy = this.groundAt(p.x, p.z, p.y + 0.05) + p.px * 0.5;
      if (p.y < gy) {
        p.y = gy;
        if (p.bounce > 0 && p.vy < -0.5 && p.bounces < 3) {
          p.vy *= -p.bounce; p.vx *= 0.6; p.vz *= 0.6; p.bounces++;
          p.onBounce?.(p);
        } else {
          p.landed = true; p.vx = p.vy = p.vz = 0;
          if (p.landFrame >= 0) { p.anim = 'hold'; p.frame = p.landFrame; }
          p.onLand?.(p);
        }
      }
    }
  }

  frameOf(p) {
    const F = p.S.frames.length;
    switch (p.anim) {
      case 'hold': return Math.min(F - 1, p.frame);
      case 'loop': return (p.frame + Math.floor(p.age * p.fps + p.seed * 7)) % F;
      case 'once': return Math.min(F - 1, p.frame + Math.floor(p.age * p.fps));
      default: {
        const u = Math.min(0.9999, p.age / p.life);
        if (p.seq) return p.seq[Math.floor(u * p.seq.length)];
        return Math.min(F - 1, Math.floor(u * F));
      }
    }
  }

  write(p, i) {
    const r = p.S.frames[this.frameOf(p)];
    let x = p.x, y = p.y, z = p.z;
    if (p.follow) { p.follow.getWorldPosition(_v); x += _v.x; y += _v.y; z += _v.z; }
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.frm[i * 4] = r.x; this.frm[i * 4 + 1] = r.y; this.frm[i * 4 + 2] = r.w; this.frm[i * 4 + 3] = r.h;
    this.col[i * 3] = p.r; this.col[i * 3 + 1] = p.g; this.col[i * 3 + 2] = p.b;
    const left = p.life - p.age;
    let f = p.alpha;
    if (p.fade > 0) f *= Math.min(1, left / (p.fade * p.life));
    if (p.fadeIn > 0) f *= Math.min(1, p.age / (p.fadeIn * p.life));
    const px = p.grow ? p.px * (p.grow[0] + (p.grow[1] - p.grow[0]) * Math.min(1, p.age / p.life)) : p.px;
    this.pf[i * 3] = px; this.pf[i * 3 + 1] = Math.max(0, Math.min(1, f)) * 1.0001; this.pf[i * 3 + 2] = p.flip ? 1 : 0;
  }
}
