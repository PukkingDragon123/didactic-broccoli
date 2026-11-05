// The dressing room's magic, all hand-pixelled 2D sprites in an atlas of their own (same rules as src/gfx/pixfx.js:
// frame strips, nearest filtering, stepped animation, no soft blobs, fades are ordered-dither dissolves). The stage
// renders at art-pixel resolution, so a sprite pixel is one stage pixel (or two, three... up close: whole multiples).
//   const fx = new Sparkles(scene);  fx.emit({ sprite: 'kira', pos, vel, life, px, color, ... });  fx.update(dt)
// Sprites: kira (four-point twinkle), diamond, star5 (tumbling star), twinkle, mote, puff (smoke), rays (rare burst),
// confetti, heart, note. Letters: '.' empty; a-e a grey ramp the particle colour tints; Y a cream core, K ink (fixed).
import * as THREE from 'three';

const AW = 256, AH = 256;
const RAMP = { a: 1, b: 0.8, c: 0.6, d: 0.42, e: 0.26 };
const FIXED = { Y: [255, 244, 206], K: [42, 26, 44], P: [255, 190, 210], Q: [214, 92, 128] };
const atlas = new Uint8Array(AW * AH * 4);
const SPR = {};
let packX = 0, packY = 0, rowH = 0;

function alloc(w, h) {
  if (packX + w > AW) { packX = 0; packY += rowH + 1; rowH = 0; }
  const r = { x: packX, y: packY, w, h };
  packX += w + 1; rowH = Math.max(rowH, h);
  if (packY + h > AH) throw new Error('dressing sprite atlas full');
  return r;
}
function put(r, x, y, ch) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= r.w || y >= r.h) return;
  const o = ((r.y + y) * AW + r.x + x) * 4;
  if (RAMP[ch] !== undefined) { const v = Math.round(RAMP[ch] * 255); atlas[o] = atlas[o + 1] = atlas[o + 2] = v; atlas[o + 3] = 255; return; }
  const f = FIXED[ch];
  if (!f) return;
  atlas[o] = f[0]; atlas[o + 1] = f[1]; atlas[o + 2] = f[2]; atlas[o + 3] = 200; // alpha 200: never tinted
}
/** Hand-drawn frames (arrays of strings; smaller frames are centred in the largest). */
function art(name, frames) {
  const w = Math.max(...frames.flat().map((r) => r.length)), h = Math.max(...frames.map((f) => f.length));
  SPR[name] = { w, h, frames: frames.map((f) => {
    const r = alloc(w, h), oy = Math.floor((h - f.length) / 2);
    f.forEach((row, y) => { const ox = Math.floor((w - row.length) / 2); for (let x = 0; x < row.length; x++) put(r, ox + x, oy + y, row[x]); });
    return r;
  }) };
}
/** Frames drawn by code: fn(k, set(x, y, ch)). */
function code(name, n, w, h, fn) {
  SPR[name] = { w, h, frames: Array.from({ length: n }, (_, k) => { const r = alloc(w, h); fn(k, (x, y, ch) => put(r, x, y, ch)); return r; }) };
}

// ---- kira: the four-point twinkle that blooms, holds and shrinks (cream heart, tinted arms, diagonal glints)
art('kira', [
  ['a'],
  ['.b.', 'bab', '.b.'],
  ['..c..', '..b..', 'cbYbc', '..b..', '..c..'],
  ['....c....', '....b....', '....a....', '...bab...', 'cbaaYaabc', '...bab...', '....a....', '....b....', '....c....'],
  ['.....c.....', '.....b.....', '.....a.....', '.c...a...c.', '....bab....', 'cbaaaYaaabc', '....bab....', '.c...a...c.', '.....a.....', '.....b.....', '.....c.....'],
  ['.....c.....', '.....b.....', '.....a.....', '.....a.....', '....bab....', 'cbaaaYaaabc', '....bab....', '.....a.....', '.....a.....', '.....b.....', '.....c.....'],
  ['....c....', '....b....', '....a....', '...bab...', 'cbaaYaabc', '...bab...', '....a....', '....b....', '....c....'],
  ['..c..', '..b..', 'cbYbc', '..b..', '..c..'],
  ['.b.', 'bab', '.b.'],
  ['b'],
]);
// ---- diamond: a hollow rhombus glint that pulses
art('diamond', [
  ['a'],
  ['.a.', 'aYa', '.a.'],
  ['..a..', '.bYb.', 'aY.Ya', '.bYb.', '..a..'],
  ['...a...', '..b.b..', '.b...b.', 'a..Y..a', '.b...b.', '..b.b..', '...a...'],
  ['..a..', '.b.b.', 'a...a', '.b.b.', '..a..'],
  ['.b.', 'b.b', '.b.'],
]);
// ---- twinkle: a small plus that flickers on and off (idle motes, trails)
art('twinkle', [['a'], ['.b.', 'bYb', '.b.'], ['.a.', 'aYa', '.a.'], ['a'], ['b'], ['.b.', 'bab', '.b.'], ['a']]);
art('mote', [['a'], ['b'], ['a'], ['c']]);
// ---- star5: a chubby five-point star, tumbling (cream top-left light, a darker rim bottom-right, ink outline)
code('star5', 6, 11, 11, (k, set) => {
  const c = 5, R = 5.2, r = 2.3, rot = (k / 6) * (Math.PI * 2 / 5) - Math.PI / 2;
  const pts = Array.from({ length: 10 }, (_, i) => { const a = rot + (i * Math.PI) / 5, rr = i % 2 ? r : R; return [c + Math.cos(a) * rr, c + Math.sin(a) * rr]; });
  const inside = (x, y) => { let n = false; for (let i = 0, j = 9; i < 10; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) n = !n; } return n; };
  const In = (x, y) => x >= 0 && y >= 0 && x < 11 && y < 11 && inside(x + 0.5, y + 0.5);
  for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) {
    if (In(x, y)) set(x, y, !In(x + 1, y) || !In(x, y + 1) ? 'c' : (!In(x - 1, y) || !In(x, y - 1)) && x + y < 11 ? 'Y' : 'a');
    else if (In(x - 1, y) || In(x + 1, y) || In(x, y - 1) || In(x, y + 1)) set(x, y, 'e');
  }
});
// ---- puff: a lumpy smoke cloud lit from the top left that swells, breaks up and scatters
code('puff', 6, 14, 14, (k, set) => {
  const lumps = [[6, 7, 3.6], [8.6, 6, 2.8], [4.2, 5.6, 2.5], [7.4, 9.2, 2.6], [9.6, 8.6, 2.2]];
  const sc = [0.45, 0.75, 1, 1.12, 1.2, 1.26][k];
  const hole = (x, y) => (k >= 3 && ((x * 5 + y * 3 + k) % (k === 3 ? 7 : k === 4 ? 3 : 2)) === 0);
  const d = (x, y) => Math.max(...lumps.map(([lx, ly, lr]) => lr * sc - Math.hypot(x - (7 + (lx - 7) * sc), y - (7 + (ly - 7) * sc))));
  for (let y = 0; y < 14; y++) for (let x = 0; x < 14; x++) {
    const v = d(x + 0.5, y + 0.5);
    if (v < 0 || hole(x, y)) continue;
    const lit = d(x - 0.6, y - 0.8) - v; // brighter toward the top left
    set(x, y, v < 0.7 ? (y > 7 ? 'd' : 'c') : lit < -0.35 ? 'a' : lit < 0.2 ? 'b' : 'c');
  }
});
// ---- rays: the rare burst behind you, rays round a star turning in stepped frames (long and short rays alternate)
code('rays', 6, 61, 61, (k, set) => {
  const c = 30, n = 16;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (k / 6) * (Math.PI * 4 / n), L = i % 2 ? 19 : 29;
    for (let s = 5; s <= L; s += 0.5) {
      if (s > L - 5 && Math.round(s * 2) % 3 === 0) continue; // ragged tips
      set(c + Math.cos(a) * s, c + Math.sin(a) * s, i % 2 ? (s < 12 ? 'b' : 'c') : s < 12 ? 'a' : s < 21 ? 'b' : 'c');
      if (s < 11 && i % 2 === 0) set(c + Math.cos(a) * s + Math.sin(a) * 0.9, c + Math.sin(a) * s - Math.cos(a) * 0.9, 'a');
    }
  }
  for (const [x, y] of [[0, -4], [0, 4], [-4, 0], [4, 0], [3, 3], [-3, -3], [3, -3], [-3, 3]]) set(c + x, c + y, 'b');
});
// ---- confetti: a paper square tumbling
art('confetti', [['aab', 'abb'], ['ab.', 'bc.'], ['a', 'c'], ['.ab', 'abc'], ['abb'], ['b', 'b', 'c']]);
// ---- heart: pops in, holds, its glint goes out
art('heart', [
  ['a.a', 'aaa', '.a.'],
  ['.aa.aa.', 'aYaaaab', 'aYaaaab', 'aaaaaab', '.aaaab.', '..aab..', '...b...'],
  ['.aa.aa.', 'aaaaaab', 'aYaaaab', 'aaaaaab', '.aaaab.', '..aab..', '...b...'],
]);
// ---- shooting star: a cream head with a tail that stretches out behind it (down-left) and breaks up as it fades
code('shoot', 6, 24, 12, (k, set) => {
  const L = [4, 9, 14, 18, 20, 20][k], hx = 21, hy = 2;
  for (let i = 0; i <= L; i++) {
    const x = hx - i, y = hy + Math.round(i * 0.45);
    if (k >= 4 && i > 4 && (i + k) % (k === 4 ? 3 : 2) === 0) continue;
    set(x, y, i === 0 ? 'Y' : i < 3 ? 'a' : i < L * 0.5 ? 'b' : i < L * 0.8 ? 'c' : 'd');
  }
  if (k < 4) { set(hx + 1, hy, 'b'); set(hx, hy - 1, 'b'); set(hx, hy + 1, 'c'); }
});
// ---- note: a little quaver for the chime
art('note', [['..aa', '..ab', '..a.', 'aaa.', 'aab.']]);

const tex = new THREE.DataTexture(atlas, AW, AH, THREE.RGBAFormat, THREE.UnsignedByteType);
tex.magFilter = tex.minFilter = THREE.NearestFilter;
tex.generateMipmaps = false;
tex.needsUpdate = true;
export const SPRITES = SPR;

// ---------------------------------------------------------------------------------------------- drawing
// Colours are written as they are (sRGB, the stage's output pass does the same), clamped under a cream ceiling: no
// pure-white pixels, nothing that reads as a glow.
const VS = /* glsl */`
  attribute vec4 aFrame; attribute vec3 aCol; attribute vec3 aPF;
  uniform vec2 uRes;
  varying vec4 vFrame; varying vec3 vCol; varying float vFade; varying float vFlip;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec4 clip = projectionMatrix * mv;
    float ppu = 0.5 * uRes.y * projectionMatrix[1][1] / max(1e-4, -mv.z);
    float s = clamp(floor(aPF.x * ppu + 0.5), 1.0, 2.0); // whole art pixels, never blown up past 2x up close
    float size = min(max(aFrame.z, aFrame.w) * s, 256.0);
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
    float bay = b2(ip * 0.5) * 0.25 + b2(ip);
    if (bay >= vFade) discard;
    vec3 c = t.a > 0.9 ? t.rgb * vCol : t.rgb;
    float m = max(c.r, max(c.g, c.b));
    if (m > 0.97) c *= 0.97 / m;
    gl_FragColor = vec4(c, 1.0);
  }`;

const _c = new THREE.Color(), _v = new THREE.Vector3();
const ATTRS = ['position', 'aFrame', 'aCol', 'aPF'];

export class Sparkles {
  constructor(scene, max = 2400) {
    const N = this.max = max;
    this.pos = new Float32Array(N * 3); this.frm = new Float32Array(N * 4); this.col = new Float32Array(N * 3); this.pf = new Float32Array(N * 3);
    const g = new THREE.BufferGeometry();
    const attr = (a, n) => new THREE.BufferAttribute(a, n).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', attr(this.pos, 3)); g.setAttribute('aFrame', attr(this.frm, 4));
    g.setAttribute('aCol', attr(this.col, 3)); g.setAttribute('aPF', attr(this.pf, 3));
    g.setDrawRange(0, 0);
    this.uRes = new THREE.Vector2(640, 360);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: tex }, uAtlas: { value: new THREE.Vector2(AW, AH) }, uRes: { value: this.uRes } },
      vertexShader: VS, fragmentShader: FS, transparent: false, depthWrite: false, depthTest: true,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.raycast = () => {};
    scene.add(this.points);
    this.list = []; this.pool = [];
  }

  /**
   * One particle. o: sprite, pos | x y z, vel | vx vy vz, life, px (world size of one art pixel), color, gravity, drag,
   * anim 'life' | 'loop' | 'once', fps, frame, seq, fade (dissolve over the last fraction), fadeIn, flip, follow (Object3D:
   * pos is an offset in its space), delay (s before it shows), update(p, dt) (custom motion), data.
   */
  emit(o) {
    if (this.list.length >= this.max) return null;
    const S = SPR[o.sprite || 'twinkle'];
    if (!S) return null;
    const p = this.pool.pop() || {};
    p.S = S;
    p.x = o.pos ? o.pos.x : o.x || 0; p.y = o.pos ? o.pos.y : o.y || 0; p.z = o.pos ? o.pos.z : o.z || 0;
    p.vx = o.vel ? o.vel.x : o.vx || 0; p.vy = o.vel ? o.vel.y : o.vy || 0; p.vz = o.vel ? o.vel.z : o.vz || 0;
    p.age = -(o.delay || 0); p.life = o.life ?? 1;
    p.px = o.px ?? 0.0065;
    _c.set(o.color ?? 0xffffff);
    p.r = _c.r; p.g = _c.g; p.b = _c.b;
    p.grav = o.gravity ?? 0; p.drag = o.drag ?? 0; p.seed = Math.random() * 100;
    p.anim = o.anim || 'life'; p.fps = o.fps ?? 12; p.frame = o.frame ?? 0; p.seq = o.seq || null;
    p.fade = o.fade ?? 0.3; p.fadeIn = o.fadeIn ?? 0;
    p.flip = o.flip === true ? Math.random() < 0.5 : !!o.flip;
    p.follow = o.follow || null;
    p.upd = o.update || null; p.data = o.data || null;
    this.list.push(p);
    return p;
  }

  clear() { for (const p of this.list) this.pool.push(p); this.list.length = 0; this.points.geometry.setDrawRange(0, 0); }
  get count() { return this.list.length; }

  update(dt) {
    const L = this.list;
    let n = 0;
    for (let i = 0; i < L.length; i++) {
      const p = L[i];
      p.age += dt;
      if (p.age >= p.life) { p.follow = null; p.upd = p.data = null; this.pool.push(p); continue; }
      L[n++] = p;
      if (p.age < 0) continue;
      if (p.upd) p.upd(p, dt);
      else {
        const d = p.drag ? Math.max(0, 1 - p.drag * dt) : 1;
        p.vx *= d; p.vy *= d; p.vz *= d;
        p.vy -= p.grav * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      }
    }
    L.length = n;
    let k = 0;
    for (const p of L) if (p.age >= 0) this.write(p, k++);
    const g = this.points.geometry;
    g.setDrawRange(0, k);
    if (k) for (const a of ATTRS) { const at = g.attributes[a]; at.clearUpdateRanges(); at.addUpdateRange(0, k * at.itemSize); at.needsUpdate = true; }
  }

  frameOf(p) {
    const F = p.S.frames.length;
    if (p.anim === 'loop') return (p.frame + Math.floor(p.age * p.fps + p.seed * 7)) % F;
    if (p.anim === 'once') return Math.min(F - 1, p.frame + Math.floor(p.age * p.fps));
    if (p.anim === 'hold') return Math.min(F - 1, p.frame);
    const u = Math.min(0.9999, p.age / p.life);
    if (p.seq) return p.seq[Math.floor(u * p.seq.length)];
    return Math.min(F - 1, Math.floor(u * F));
  }

  write(p, i) {
    const r = p.S.frames[this.frameOf(p)];
    let x = p.x, y = p.y, z = p.z;
    if (p.follow) { _v.set(x, y, z); p.follow.localToWorld(_v); x = _v.x; y = _v.y; z = _v.z; }
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.frm[i * 4] = r.x; this.frm[i * 4 + 1] = r.y; this.frm[i * 4 + 2] = r.w; this.frm[i * 4 + 3] = r.h;
    this.col[i * 3] = p.r; this.col[i * 3 + 1] = p.g; this.col[i * 3 + 2] = p.b;
    let f = 1;
    if (p.fade > 0) f *= Math.min(1, (p.life - p.age) / (p.fade * p.life));
    if (p.fadeIn > 0) f *= Math.min(1, p.age / (p.fadeIn * p.life));
    this.pf[i * 3] = p.px; this.pf[i * 3 + 1] = Math.max(0, Math.min(1, f)) * 1.0001; this.pf[i * 3 + 2] = p.flip ? 1 : 0;
  }

  dispose() { this.points.removeFromParent(); this.points.geometry.dispose(); this.mat.dispose(); }
}
