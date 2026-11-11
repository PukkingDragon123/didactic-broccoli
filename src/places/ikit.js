// The interiors' building kit (your room, flat 103, Ramen Yamada, the annex, Gacha Kaikan): the garage's Kit
// (src/garage/kit.js: parts merged per material, uvs in metres, a tint per part over a real photo surface) with the
// surfaces of a 1999 Japanese interior from the shared photo library (src/kit/photoTex.js) and the parts every one of
// these rooms is made of, each authored from reference rather than generated:
//   tatami (6 cm thick mats with their cloth heri on the long sides, laid so no four corners meet), boards, fusuma
//   (lacquered frame, paper face with a painted motif, the round hikite pull), shoji lattices, aluminium sashes, the
//   mouldings of a washitsu (habaki skirting, nageshi, mawaribuchi), flush doors, switch plates, the square washi
//   pendant of a six-mat room and the twin-tube fluorescent batten of a shop.
//
//   const K = new IKit(imats(conv))          conv: places.mat (lamp-lit rooms) or bright (the Kaikan); converted once
//   const F = K.at(ox, oy, oz, ry)           a frame turned by a multiple of 90 degrees: every helper below works in it
//   F.box(key, x0, y0, z0, x1, y1, z1, o)    F.bx(key, w, h, d, x, y, z, o) (bottom at y, centred)   F.beam / rod / pipe
//   F.lathe(key, x, y, z, [[r, h]...], segs, { axis })   F.sticker(key, rect, face, x, y, z, w, h)   F.glass(...)
//   F.tatami(x0, z0, x1, z1)  F.fusuma(x0, x1, y0, y1, z, o)  F.shoji(...)  F.sash(...)  F.switchPlate(x, y, z)
//   F.washiLamp(x, y, z) -> glow mesh   F.batten(x, y, z, len) -> tube mesh
//   K.done(parent, name) -> meshes (merged static parts + the glass)
// Keys: plaster juraku (fine sand plaster) wallpaper (vinyl) mortar wood timber ply tatami shoji paper cloth indigo card tile ftile conc stain paint zinc rubber
// frost (photos) and flat satin gloss chrome (plain paint), glow (self-lit), art (the painted fusuma motifs, see ART).
import * as THREE from 'three';
import { Kit } from '../garage/kit.js';
import { photoTex, PHOTO_TEX, withPhotoNormal } from '../kit/photoTex.js';

/** A photo tile at its real size for uvs in metres. */
export function surf(name) { const m = PHOTO_TEX[name]?.metres || 1; return photoTex(name, { repeat: [1 / m, 1 / m] }); }

// key: [photo, roughness, metalness, grain runs along V]
const SURF = {
  plaster: ['plaster_cream', 0.93], juraku: ['concrete', 0.96], wallpaper: ['canvas_cloth', 0.9], mortar: ['mortar_grey', 0.95],
  wood: ['wood_planks', 0.6, 0, true], timber: ['timber_dark', 0.72, 0, true], ply: ['plywood', 0.78],
  tatami: ['tatami', 0.93], shoji: ['shoji_paper', 0.92], paper: ['paper_old', 0.9], cloth: ['canvas_cloth', 0.97], indigo: ['indigo_cloth', 0.97],
  card: ['cardboard', 0.95], tile: ['tile_white', 0.38], ftile: ['tile_checker_floor', 0.55], conc: ['concrete', 0.92], stain: ['concrete_stained', 0.9],
  paint: ['steel_painted', 0.6, 0.1], zinc: ['steel_galvanised', 0.42, 0.55], rubber: ['rubber', 0.95], frost: ['frosted_glass', 0.32],
};

/** Is this already a lamp-lit (places.mat) or fluorescent (bright) interior variant? */
export const converted = (m) => { const k = m?.customProgramCacheKey?.() || ''; return k.startsWith('interior:') || k.startsWith('bright:'); };
/** Swap every material under obj for its interior variant (once). */
export function convertAll(obj, conv) {
  const one = (m) => (!m || converted(m) || !m.isMeshStandardMaterial ? m : conv(m));
  obj.traverse((o) => { if (o.material) o.material = Array.isArray(o.material) ? o.material.map(one) : one(o.material); });
  return obj;
}

const cache = new Map();
/** The kit's materials, converted for one kind of interior light (cached per converter). */
export function imats(conv) {
  if (cache.has(conv)) return cache.get(conv);
  const std = (o) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, ...o });
  const M = {};
  for (const [k, [photo, roughness, metalness = 0, grainV = false]] of Object.entries(SURF)) {
    const m = withPhotoNormal(std({ map: surf(photo), roughness, metalness }));
    m.userData.avg = PHOTO_TEX[photo].avg; m.userData.grainV = grainV;
    M[k] = m;
  }
  M.flat = std({ roughness: 0.82 }); M.satin = std({ roughness: 0.55, metalness: 0.25 }); M.gloss = std({ roughness: 0.34 });
  M.chrome = std({ roughness: 0.22, metalness: 1 }); M.glass2 = std({ roughness: 0.12 }); // (glass2: bottle glass, opaque)
  M.art = std({ map: ART().tex, transparent: true, depthWrite: false, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  for (const [k, m] of Object.entries(M)) { m.name = 'ikit-' + k; M[k] = conv ? conv(m) : m; }
  M.glow = new THREE.MeshBasicMaterial({ vertexColors: true }); M.glow.name = 'ikit-glow';
  // the washi pendant's diffuser: lit (self-lit paper) and switched off (plain paper in the room light)
  M.washiOn = new THREE.MeshBasicMaterial({ map: surf('shoji_paper'), vertexColors: true, color: new THREE.Color(1.22, 1.08, 0.86) }); M.washiOn.name = 'ikit-washiOn';
  M.washiOff = conv ? conv(std({ map: surf('shoji_paper'), roughness: 0.9, color: 0xc8c0b0 })) : std({ map: surf('shoji_paper'), roughness: 0.9 });
  M.washiOff.userData.avg = PHOTO_TEX.shoji_paper.avg;
  // shoji paper with the day behind it (self-lit; Places / zones set its colour by the daylight)
  M.shojiLit = new THREE.MeshBasicMaterial({ map: surf('shoji_paper'), vertexColors: true }); M.shojiLit.name = 'ikit-shojiLit'; M.shojiLit.userData.avg = PHOTO_TEX.shoji_paper.avg;
  M.glass = new THREE.MeshPhysicalMaterial({ color: 0xeaf2f4, transparent: true, opacity: 0.14, roughness: 0.05, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
  cache.set(conv, M);
  return M;
}

const norms = new Map();
/** A photo material for the plain batchers (vertex tints, uvs in metres): its colour is the inverse of the photo's mean, so a
 *  tint comes out as that colour with the photo's grain. metres: the size one tile covers (default: its real size). */
export function photoNorm(name, { rough = 0.85, metal = 0, metres } = {}) {
  const key = `${name}|${rough}|${metal}|${metres}`;
  if (norms.has(key)) return norms.get(key);
  const e = PHOTO_TEX[name], m = metres || e.metres, a = new THREE.Color(e.avg);
  const mat = new THREE.MeshStandardMaterial({ map: photoTex(name, { repeat: [1 / m, 1 / m] }), vertexColors: true, roughness: rough, metalness: metal });
  mat.color.setRGB(1 / a.r, 1 / a.g, 1 / a.b); mat.userData.avg = e.avg; mat.name = 'norm:' + name; withPhotoNormal(mat);
  norms.set(key, mat);
  return mat;
}

// ------------------------------------------------------------------ the painted fusuma motifs (one canvas, linear)
let art = null;
/** Hand-placed washes on fusuma paper: a misty ridge, gold suyari-gasumi bands, a pine bough (left and right leaf continue
 *  each other), and a plain kumo-zuri cloud paper. rect(name) -> [u0, v0, u1, v1]. */
export function ART() {
  if (art) return art;
  const W = 1024, H = 1024, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  // left and right leaf (512 x 1024 each, one picture across both): y down, 0 = top of the leaf
  const ridge = [[0, 640], [70, 600], [130, 612], [210, 560], [300, 585], [380, 540], [460, 566], [540, 520], [610, 548], [700, 500], [790, 535], [870, 560], [950, 530], [1024, 556]];
  x.fillStyle = 'rgba(150,166,172,0.42)';
  x.beginPath(); x.moveTo(0, 760); for (const [a, b] of ridge) x.lineTo(a, b); x.lineTo(1024, 760); x.closePath(); x.fill();
  x.fillStyle = 'rgba(126,146,150,0.38)';
  x.beginPath(); x.moveTo(120, 760); x.lineTo(180, 690); x.lineTo(260, 668); x.lineTo(330, 700); x.lineTo(420, 655); x.lineTo(520, 690); x.lineTo(600, 760); x.closePath(); x.fill();
  // suyari-gasumi: long rounded bands of gold-beige with a darker edge line
  const band = (x0, y0, w, h) => {
    x.fillStyle = 'rgba(214,190,132,0.62)'; x.strokeStyle = 'rgba(176,150,96,0.75)'; x.lineWidth = 3;
    x.beginPath(); x.moveTo(x0 + h / 2, y0); x.lineTo(x0 + w - h / 2, y0); x.arc(x0 + w - h / 2, y0 + h / 2, h / 2, -Math.PI / 2, Math.PI / 2); x.lineTo(x0 + h / 2, y0 + h); x.arc(x0 + h / 2, y0 + h / 2, h / 2, Math.PI / 2, Math.PI * 1.5); x.closePath(); x.fill(); x.stroke();
  };
  band(-60, 300, 520, 56); band(380, 236, 420, 44); band(700, 330, 380, 60); band(60, 742, 640, 70); band(560, 820, 520, 52); band(-40, 900, 300, 40);
  // the pine bough from the top left: a bent branch, fans of needles in two greens
  x.strokeStyle = '#7a6352'; x.lineCap = 'round';
  x.lineWidth = 14; x.beginPath(); x.moveTo(-10, 70); x.quadraticCurveTo(120, 60, 190, 120); x.quadraticCurveTo(250, 170, 330, 150); x.stroke();
  x.lineWidth = 8; x.beginPath(); x.moveTo(190, 120); x.quadraticCurveTo(220, 200, 290, 230); x.stroke();
  x.beginPath(); x.moveTo(80, 76); x.quadraticCurveTo(90, 140, 60, 190); x.stroke();
  const fan = (cx, cy, r, a0, a1, col) => {
    x.strokeStyle = col; x.lineWidth = 3;
    for (let a = a0; a <= a1; a += 0.13) { x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); x.stroke(); }
  };
  for (const [cx, cy, r, a0, a1, col] of [[330, 150, 62, -2.6, 0.4, '#5f7458'], [292, 232, 54, -1.2, 1.6, '#6c8262'], [196, 118, 58, -2.9, -0.5, '#5f7458'], [60, 190, 50, 0.6, 2.8, '#6c8262'], [140, 70, 46, -2.8, -0.8, '#6c8262'], [250, 166, 40, 0.2, 2.2, '#566a50']]) fan(cx, cy, r, a0, a1, col);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  art = { tex, canvas: c, rect: { left: [0, 0, 0.5, 1], right: [0.5, 0, 1, 1] } };
  return art;
}

// ------------------------------------------------------------------ the kit
const ROT = { y: new THREE.Matrix4().makeRotationZ(Math.PI / 2), z: new THREE.Matrix4().makeRotationY(-Math.PI / 2), x: new THREE.Matrix4() };
const FACES = { px: [1, 0, 0], nx: [-1, 0, 0], py: [0, 1, 0], ny: [0, -1, 0], pz: [0, 0, 1], nz: [0, 0, -1] };
const faceOf = (v) => (Math.abs(v[0]) > 0.5 ? (v[0] > 0 ? 'px' : 'nx') : Math.abs(v[1]) > 0.5 ? (v[1] > 0 ? 'py' : 'ny') : v[2] > 0 ? 'pz' : 'nz');

export class IKit extends Kit {
  constructor(mats) { super(mats); this.extra = []; this.root = new Frame(this, 0, 0, 0, 0); }
  at(ox = 0, oy = 0, oz = 0, ry = 0) { return new Frame(this, ox, oy, oz, ry); }
  /** Build the merged parts and the loose glass into parent. */
  done(parent, name = 'interior') {
    const out = this.build(parent, name);
    for (const m of this.extra) { parent.add(m); out.push(m); }
    this.extra = [];
    return out;
  }
}

export class Frame {
  constructor(K, ox, oy, oz, ry) {
    this.K = K; this.o = [ox, oy, oz];
    this.q = ((Math.round(ry / (Math.PI / 2)) % 4) + 4) % 4;
    this.ry = this.q * Math.PI / 2;
  }
  /** local -> parent coordinates */
  p(x, y, z) { let X = x, Z = z; for (let i = 0; i < this.q; i++) { const t = X; X = Z; Z = -t; } return [X + this.o[0], y + this.o[1], Z + this.o[2]]; }
  d(v) { let X = v[0], Z = v[2]; for (let i = 0; i < this.q; i++) { const t = X; X = Z; Z = -t; } return [X, v[1], Z]; }
  oo(o) {
    if (!this.q) return o;
    const r = { ...o };
    if (this.q % 2 && o.grain) r.grain = { x: 'z', z: 'x' }[o.grain] || o.grain;
    if (o.skip) r.skip = o.skip.map((f) => faceOf(this.d(FACES[f])));
    return r;
  }
  box(key, x0, y0, z0, x1, y1, z1, o = {}) {
    const a = this.p(x0, y0, z0), b = this.p(x1, y1, z1);
    this.K.box(key, Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2]), Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2]), this.oo(o));
    return this;
  }
  /** Box w x h x d with its bottom centre at (x, y, z). */
  bx(key, w, h, d, x, y, z, o = {}) { return this.box(key, x - w / 2, y, z - d / 2, x + w / 2, y + h, z + d / 2, o); }
  beam(key, a, b, w, h, o = {}) { this.K.beam(key, this.p(...a), this.p(...b), w, h, o); return this; }
  rod(key, a, b, r, o = {}) { this.K.rod(key, this.p(...a), this.p(...b), r, o); return this; }
  pipe(key, pts, r, o = {}) { this.K.pipe(key, pts.map((q) => this.p(...q)), r, o); return this; }
  ball(key, c, r, o = {}) { this.K.ball(key, this.p(...c), r, o); return this; }
  quad(key, a, b, c, d, hint, o = {}) { this.K.quad(key, this.p(...a), this.p(...b), this.p(...c), this.p(...d), this.d(hint), o); return this; }
  sticker(key, rect, face, x, y, z, w, h, o = {}) {
    const f = face[1] === 'y' ? face : (() => { const n = faceOf(this.d(FACES[(face[0] === '+' ? 'p' : 'n') + face[1]])); return (n[0] === 'p' ? '+' : '-') + n[1]; })();
    this.K.sticker(key, rect, f, ...this.p(x, y, z), w, h, o);
    return this;
  }
  /** A solid of revolution: prof [[r, h], ...] along the local axis ('y' up, 'z' out of a wall, 'x'). */
  lathe(key, x, y, z, prof, segs = 16, o = {}) {
    const g = this.K.use(key, o), P = this.p(x, y, z);
    g.push(new THREE.Matrix4().makeTranslation(P[0], P[1], P[2]).multiply(new THREE.Matrix4().makeRotationY(this.ry)).multiply(ROT[o.axis || 'y']));
    g.lathe(prof, segs, { a0: o.a0 ?? Math.PI / segs, flip: o.flip });
    g.pop();
    return this;
  }
  /** A pane of glass (w x h) centred at (x, y, z), facing local +z (o.side: facing +x). */
  glass(w, h, x, y, z, o = {}) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), o.mat || this.K.mats.glass);
    m.position.set(...this.p(x, y, z)); m.rotation.y = this.ry + (o.side ? Math.PI / 2 : 0);
    m.userData.noRim = true; m.renderOrder = 2;
    this.K.extra.push(m);
    return m;
  }

  // -------------------------------------------------------------- Japanese interior parts
  /** One tatami mat (top at y = 0): the rush along its length, black-brown heri on the long sides. */
  tatami(x0, z0, x1, z1, o = {}) {
    const g = 0.002, hw = 0.032, T = 0.055, alongX = x1 - x0 >= z1 - z0, tint = o.tint ?? 0xc2b781, heri = o.heri ?? 0x3a3530;
    if (alongX) {
      this.box('tatami', x0 + g, -T, z0 + g + hw, x1 - g, 0, z1 - g - hw, { tint, bevel: 0.005 });
      for (const [a, b] of [[z0 + g, z0 + g + hw], [z1 - g - hw, z1 - g]]) this.box('indigo', x0 + g, -T, a, x1 - g, 0.0015, b, { tint: heri, bevel: 0.004, grain: 'x' });
    } else {
      this.box('tatami', x0 + g + hw, -T, z0 + g, x1 - g - hw, 0, z1 - g, { tint, bevel: 0.005, grain: 'z' });
      for (const [a, b] of [[x0 + g, x0 + g + hw], [x1 - g - hw, x1 - g]]) this.box('indigo', a, -T, z0 + g, b, 0.0015, z1 - g, { tint: heri, bevel: 0.004, grain: 'z' });
    }
    return this;
  }
  /**
   * A fusuma leaf in the local x-y plane, its face at depth z looking toward +z (2 cm thick): lacquered frame, paper face,
   * the painted motif (o.art: an ART() rect name), the round hikite on the o.pull side ('left' / 'right').
   */
  fusuma(x0, x1, y0, y1, z, o = {}) {
    const fw = 0.019, d = 0.02, lac = o.frame ?? 0x2e2420, k = 'gloss';
    this.box(k, x0, y0, z - d, x0 + fw, y1, z, { tint: lac, bevel: 0.003 });
    this.box(k, x1 - fw, y0, z - d, x1, y1, z, { tint: lac, bevel: 0.003 });
    this.box(k, x0 + fw, y1 - fw, z - d, x1 - fw, y1, z, { tint: lac, bevel: 0.003 });
    this.box(k, x0 + fw, y0, z - d, x1 - fw, y0 + 0.03, z, { tint: lac, bevel: 0.003 });
    this.box('paper', x0 + fw, y0 + 0.03, z - d + 0.003, x1 - fw, y1 - fw, z - 0.003, { tint: o.paper ?? 0xe6dcc4, skip: ['nz'] });
    if (o.art) { const r = ART().rect[o.art]; this.sticker('art', r, '+z', (x0 + x1) / 2, (y0 + y1) / 2 + 0.01, z - 0.0025, x1 - x0 - 2 * fw, y1 - y0 - 0.05); }
    const hx = o.pull === 'left' ? x0 + 0.075 : x1 - 0.075, hy = y0 + 0.8;
    this.lathe('satin', hx, hy, z - 0.0035, [[0, -0.004], [0.019, -0.004], [0.021, 0.0], [0.028, 0.0012], [0.031, 0]], 16, { axis: 'z', tint: 0x8a7046 });
    this.lathe('gloss', hx, hy, z - 0.0042, [[0.0, 0.0], [0.019, 0.0]], 16, { axis: 'z', tint: 0x2a221e });
    return this;
  }
  /** A shoji: timber frame and kumiko lattice (nx x ny panes) in front of paper, face at z looking toward +z. */
  shoji(x0, x1, y0, y1, z, o = {}) {
    const fw = 0.028, d = 0.03, kw = 0.009, tint = o.tint ?? 0xd8bc94, nx = o.nx ?? 3, ny = o.ny ?? 6, kb = o.koshi ?? 0;
    this.box('wood', x0, y0, z - d, x0 + fw, y1, z, { tint, grain: 'y', bevel: 0.002 });
    this.box('wood', x1 - fw, y0, z - d, x1, y1, z, { tint, grain: 'y', bevel: 0.002 });
    this.box('wood', x0 + fw, y1 - fw, z - d, x1 - fw, y1, z, { tint, grain: 'x', bevel: 0.002 });
    this.box('wood', x0 + fw, y0, z - d, x1 - fw, y0 + fw + kb, z, { tint, grain: 'x', bevel: 0.002 });
    const ix0 = x0 + fw, ix1 = x1 - fw, iy0 = y0 + fw + kb, iy1 = y1 - fw;
    for (let i = 1; i < nx; i++) { const xx = ix0 + (ix1 - ix0) * i / nx; this.box('wood', xx - kw / 2, iy0, z - 0.016, xx + kw / 2, iy1, z - 0.004, { tint, grain: 'y' }); }
    for (let j = 1; j < ny; j++) { const yy = iy0 + (iy1 - iy0) * j / ny; this.box('wood', ix0, yy - kw / 2, z - 0.017, ix1, yy + kw / 2, z - 0.005, { tint, grain: 'x' }); }
    this.box(o.glow ? 'shojiLit' : 'shoji', ix0, iy0, z - 0.02, ix1, iy1, z - 0.019, { tint: o.paper ?? 0xf0eadc, skip: ['nz'] });
    return this;
  }
  /** An aluminium window in a wall whose room face is at z (looking toward +z): frame, two sliding sashes (the right one
   *  slid `open` metres behind the left), glass, the crescent lock. */
  sash(x0, x1, y0, y1, z, o = {}) {
    const al = o.tint ?? 0xc6cace, fw = 0.04, D = o.depth ?? 0.1, open = o.open ?? 0;
    this.box('satin', x0 - fw, y0 - fw, z - D, x1 + fw, y0, z, { tint: al, bevel: 0.004 });
    this.box('satin', x0 - fw, y1, z - D, x1 + fw, y1 + fw, z, { tint: al, bevel: 0.004 });
    this.box('satin', x0 - fw, y0, z - D, x0, y1, z, { tint: al, bevel: 0.004 });
    this.box('satin', x1, y0, z - D, x1 + fw, y1, z, { tint: al, bevel: 0.004 });
    const mid = (x0 + x1) / 2, sw = 0.03, leaf = (a, b, zz) => {
      this.box('satin', a, y0, zz - 0.028, a + sw, y1, zz, { tint: al, bevel: 0.003 });
      this.box('satin', b - sw, y0, zz - 0.028, b, y1, zz, { tint: al, bevel: 0.003 });
      this.box('satin', a + sw, y0, zz - 0.028, b - sw, y0 + 0.035, zz, { tint: al, bevel: 0.003 });
      this.box('satin', a + sw, y1 - 0.03, zz - 0.028, b - sw, y1, zz, { tint: al, bevel: 0.003 });
      if (!o.noGlass) this.glass(b - a - 2 * sw, y1 - y0 - 0.065, (a + b) / 2, (y0 + y1) / 2 + 0.0025, zz - 0.014, { mat: o.glassMat });
    };
    leaf(x0, mid + 0.02, z - D * 0.3);
    leaf(mid - 0.02 - open, x1 - open, z - D * 0.65);
    // the crescent lock on the meeting stiles
    this.bx('chrome', 0.05, 0.022, 0.016, mid + 0.005, (y0 + y1) / 2 - 0.01, z - D * 0.3 + 0.01, { bevel: 0.004 });
    this.lathe('chrome', mid + 0.005, (y0 + y1) / 2 + 0.018, z - D * 0.3 + 0.008, [[0.004, 0], [0.004, 0.02], [0, 0.022]], 8, { axis: 'z' });
    return this;
  }
  /** A Japanese wide-rocker switch plate (two switches) on a wall facing +z, centred at (x, y, z). */
  switchPlate(x, y, z, o = {}) {
    this.box('gloss', x - 0.04, y - 0.06, z, x + 0.04, y + 0.06, z + 0.008, { tint: o.tint ?? 0xf2efe6, bevel: 0.003 });
    for (const dy of [-0.025, 0.025]) this.box('gloss', x - 0.026, y + dy - 0.019, z + 0.008, x + 0.026, y + dy + 0.019, z + 0.014, { tint: 0xf6f4ee, bevel: 0.003 });
    this.box('flat', x - 0.006, y + 0.017, z + 0.014, x + 0.006, y + 0.021, z + 0.0145, { tint: 0x7ac08a });
    return this;
  }
  /** The square washi pendant of a six-mat room, hanging from a ceiling at height y (local x, z): rosette, cord, the
   *  wooden frame round four paper sides and a lid, the pull cord. Returns the diffuser mesh (swap washiOn / washiOff). */
  washiLamp(x, y, z, o = {}) {
    const K = this.K, s = o.size ?? 0.44, hh = o.height ?? 0.24, drop = o.drop ?? 0.55, wood = 0x8a6a4a, yb = y - drop - hh, yt = y - drop;
    this.lathe('gloss', x, y - 0.03, z, [[0, 0], [0.055, 0], [0.058, 0.012], [0.05, 0.026], [0.02, 0.03], [0, 0.03]], 20, { tint: 0xece8de });
    this.rod('flat', [x, y - 0.03, z], [x, yt + 0.04, z], 0.0035, { tint: 0x3a3632, sides: 6 });
    this.lathe('gloss', x, yt + 0.02, z, [[0, 0], [0.03, 0], [0.03, 0.025], [0, 0.03]], 12, { tint: 0x3a3632 });
    const h = s / 2, f = 0.016;
    // corner posts, top and bottom rims, the lattice bars across each side
    for (const [cx, cz] of [[-h, -h], [h, -h], [h, h], [-h, h]]) this.box('wood', x + cx - f / 2, yb, z + cz - f / 2, x + cx + f / 2, yt, z + cz + f / 2, { tint: wood, grain: 'y', bevel: 0.002 });
    for (const yy of [yb, yt - 0.018]) {
      this.box('wood', x - h - f / 2, yy, z - h - f / 2, x + h + f / 2, yy + 0.018, z - h + f / 2, { tint: wood, grain: 'x', bevel: 0.002 });
      this.box('wood', x - h - f / 2, yy, z + h - f / 2, x + h + f / 2, yy + 0.018, z + h + f / 2, { tint: wood, grain: 'x', bevel: 0.002 });
      this.box('wood', x - h - f / 2, yy, z - h + f / 2, x - h + f / 2, yy + 0.018, z + h - f / 2, { tint: wood, grain: 'z', bevel: 0.002 });
      this.box('wood', x + h - f / 2, yy, z - h + f / 2, x + h + f / 2, yy + 0.018, z + h - f / 2, { tint: wood, grain: 'z', bevel: 0.002 });
    }
    const ym = (yb + yt) / 2;
    for (const t of [-1 / 3, 1 / 3]) {
      this.box('wood', x + t * s - 0.004, yb, z - h - 0.012, x + t * s + 0.004, yt, z - h - 0.004, { tint: wood, grain: 'y' });
      this.box('wood', x + t * s - 0.004, yb, z + h + 0.004, x + t * s + 0.004, yt, z + h + 0.012, { tint: wood, grain: 'y' });
      this.box('wood', x - h - 0.012, yb, z + t * s - 0.004, x - h - 0.004, yt, z + t * s + 0.004, { tint: wood, grain: 'y' });
      this.box('wood', x + h + 0.004, yb, z + t * s - 0.004, x + h + 0.012, yt, z + t * s + 0.004, { tint: wood, grain: 'y' });
    }
    for (const [a, b] of [[x - h - 0.012, x + h + 0.012]]) {
      this.box('wood', a, ym - 0.004, z - h - 0.012, b, ym + 0.004, z - h - 0.004, { tint: wood, grain: 'x' });
      this.box('wood', a, ym - 0.004, z + h + 0.004, b, ym + 0.004, z + h + 0.012, { tint: wood, grain: 'x' });
    }
    for (const [a, b] of [[z - h - 0.012, z + h + 0.012]]) {
      this.box('wood', x - h - 0.012, ym - 0.004, a, x - h - 0.004, ym + 0.004, b, { tint: wood, grain: 'z' });
      this.box('wood', x + h + 0.004, ym - 0.004, a, x + h + 0.012, ym + 0.004, b, { tint: wood, grain: 'z' });
    }
    // the lid (a shallow pyramid of paper) and the pull cord with its bead
    this.box('wood', x - h, yt - 0.004, z - h, x + h, yt, z + h, { tint: 0x6a5038, skip: ['ny'] });
    this.rod('flat', [x + 0.06, yb + 0.02, z + 0.02], [x + 0.06, yb - 0.28, z + 0.02], 0.0018, { tint: 0xe8e2d4, sides: 5 });
    this.lathe('gloss', x + 0.06, yb - 0.31, z + 0.02, [[0, 0], [0.008, 0.004], [0.01, 0.014], [0.006, 0.026], [0, 0.03]], 10, { tint: 0xd8402a });
    // the paper sides and bottom: their own mesh (lit or not)
    const P = (lx, ly, lz) => this.p(lx, ly, lz);
    const g = K.mesh('washiOff', (G) => {
      const q = (a, b, c, d, n) => G.quad(P(...a), P(...b), P(...c), P(...d), this.d(n));
      const e = h - 0.002;
      q([x - e, yb, z + e], [x + e, yb, z + e], [x + e, yt, z + e], [x - e, yt, z + e], [0, 0, 1]);
      q([x + e, yb, z - e], [x - e, yb, z - e], [x - e, yt, z - e], [x + e, yt, z - e], [0, 0, -1]);
      q([x + e, yb, z + e], [x + e, yb, z - e], [x + e, yt, z - e], [x + e, yt, z + e], [1, 0, 0]);
      q([x - e, yb, z - e], [x - e, yb, z + e], [x - e, yt, z + e], [x - e, yt, z - e], [-1, 0, 0]);
      q([x - e, yb + 0.002, z - e], [x + e, yb + 0.002, z - e], [x + e, yb + 0.002, z + e], [x - e, yb + 0.002, z + e], [0, -1, 0]);
    }, { cast: false });
    K.extra.push(g);
    return g;
  }
  /** A ceiling batten with two bare fluorescent tubes along local x (length len), under a ceiling at height y. Returns
   *  { tubes: Mesh } (glow material; swap it to switch them off). */
  batten(x, y, z, len = 1.25, o = {}) {
    const K = this.K, h = len / 2;
    this.box('paint', x - h - 0.03, y - 0.055, z - 0.06, x + h + 0.03, y, z + 0.06, { tint: o.tint ?? 0xeceae2, bevel: 0.012 });
    for (const sx of [-1, 1]) for (const dz of [-0.035, 0.035]) this.box('gloss', x + sx * (h + 0.005) - 0.012, y - 0.085, z + dz - 0.014, x + sx * (h + 0.005) + 0.012, y - 0.055, z + dz + 0.014, { tint: 0xf4f2ea, bevel: 0.003 });
    const tubes = K.mesh(o.glowKey || 'glow', (G) => {
      for (const dz of [-0.035, 0.035]) {
        const a = this.p(x - h + 0.01, y - 0.072, z + dz), b = this.p(x + h - 0.01, y - 0.072, z + dz);
        G.strut(a, b, 0.0135, { round: 10 });
      }
    }, { cast: false, tint: o.glow ?? 0xf6f8f2 });
    K.extra.push(tubes);
    return tubes;
  }
}
