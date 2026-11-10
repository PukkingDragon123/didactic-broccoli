// Gacha capsules, low-poly and cel-shaded, built like the real ones (src/gachakit/capsuleShell.js: two moulded halves,
// seam ring, locking lugs, dimples, air holes, a flat spot, lettering round the rim) in 48 / 65 / 75 mm.
//  * Shell types (a series' `capsule.style`, or STYLE_BY_SERIES): 'clear' the classic two-tone (clear dome over a
//    coloured base), 'tab' fully clear (a tinted clear base), 'opaque' full colour, 'paper' frosted.
//    Shapes (capsule.shape, or SHAPE_BY_SERIES): 'ball', 'egg', 'daruma', 'can'.
//  * Rarity and finish show on the shell (lookFor): uncommon = glitter in tinted clear plastic, rare = pearl, a special
//    finish = anodised metal, ultra = gold plate, super secret = black lacquer with gilt lettering. The look travels in
//    the top byte of the capsule's colour (packLook), so it survives saves, the hotbar and the network untouched.
//  * Inside: the folded mini-book (cap.paper), the bag of parts, a foil wrap in the top tiers. Outside: a printed shrink
//    band round the seam, a tamper seal over it (sticker, foil sticker, wax, hanko), 当 on a special finish.
//  * Opening is a ritual in steps (cap.steps; src/gachakit/ritual.js drives it): peel the band(s), crack the seal,
//    twist past the lugs, pull the halves apart, tear the foil. cap.setStage(i, p) poses the capsule at step i, p done.
// Halves share geometry per size and shape; machine windows and cartons draw their piles instanced (pileGeometries).
import * as THREE from 'three';
import { SERIES_BY_ID } from '../data/series/index.js';
import { shellGeo, shellSkin } from '../gachakit/capsuleShell.js';
import { subRange } from '../gachakit/geo.js';
import { glossPlastic, clearPlastic, coatMaterial, platedMetal, pearlPlastic } from '../gachakit/celenv.js';
import { seriesSheet, sealSheet, bandMaterial, SEALS } from '../gachakit/capsulePrint.js';
import { leafletGeo, partsGeo, bagGeo, foilGeo, bandGeo, stickerGeo, dotStickerGeo, waxGeo, glitterGeo, faceGeo, labelBandGeo, BAND_N, BAND_VERTS, BAND_TAB, RIBBON_N, BAND_A0 } from '../gachakit/capsuleParts.js';

/** Capsule radii (m): Ø48, Ø65 and Ø75 mm. */
export const CAPSULE_R = { S: 0.024, M: 0.0325, L: 0.0375 };

export function capsuleSize(seriesId) {
  const s = SERIES_BY_ID[seriesId];
  if (s?.capsule?.size) return s.capsule.size;
  const p = s?.price || 100;
  return p <= 200 ? 'S' : p <= 500 ? 'M' : 'L';
}
export function capsuleRadius(seriesId) { return CAPSULE_R[capsuleSize(seriesId)]; }

// which kind of capsule each series ships in (a series can set capsule.style / capsule.shape itself)
const STYLE_BY_SERIES = {
  mochi: 'clear', shokudo: 'tab', kasa: 'paper', showa: 'tab', konbini: 'clear', heya: 'paper', yokai: 'opaque',
  onsen: 'clear', dajare: 'tab', kaiju: 'clear', uchu: 'clear', omamori: 'opaque', neko_cafe: 'clear', wagashi: 'paper',
  matsuri: 'tab', sentai: 'clear', densha: 'tab', umi: 'clear', obake_yashiki: 'opaque', bizarre: 'opaque',
};
const SHAPE_BY_SERIES = { kaiju: 'egg', omamori: 'daruma', konbini: 'can' };
export function capsuleStyle(seriesId) { return SERIES_BY_ID[seriesId]?.capsule?.style || STYLE_BY_SERIES[seriesId] || 'clear'; }
export function capsuleShape(seriesId) { return SERIES_BY_ID[seriesId]?.capsule?.shape || SHAPE_BY_SERIES[seriesId] || 'ball'; }

/** Pick a capsule colour for a series. */
export function capsuleColor(seriesId, rnd = Math.random) {
  const cols = SERIES_BY_ID[seriesId]?.capsule?.colors || [0xff9eb5, 0x9ed8ff, 0xfff09e];
  return cols[Math.floor(rnd() * cols.length)];
}

// ------------------------------------------------------------------ looks (rarity and finish on the shell)
export const LOOKS = ['plain', 'glitter', 'pearl', 'metal', 'gold', 'secret'];
/** The shell a rolled capsule comes in. */
export function lookFor(rarity, finish = 'normal') {
  if (rarity === 'secret') return 'secret';
  if (rarity === 'ultra') return 'gold';
  if (finish && finish !== 'normal') return 'metal';
  return rarity === 'rare' ? 'pearl' : rarity === 'uncommon' ? 'glitter' : 'plain';
}
/** A capsule colour carrying its look (and the 当 sticker of a special finish) above the 24 colour bits. */
export function packLook(rgb, look = 'plain', atari = false) { return (Math.max(0, LOOKS.indexOf(look)) + (atari ? 8 : 0)) * 0x1000000 + ((rgb ?? 0xffffff) & 0xffffff); }
export function unpackLook(color) { const c = color ?? 0xffffff, n = Math.floor(c / 0x1000000); return { rgb: c % 0x1000000, look: LOOKS[n & 7] || 'plain', atari: !!(n & 8) }; }
/** The packed colour for a capsule's data { series, rarity, finish, color }. */
export function dressColor(data) {
  const u = unpackLook(data.color ?? capsuleColor(data.series));
  return packLook(u.rgb, lookFor(data.rarity, data.finish), !!data.finish && data.finish !== 'normal');
}

// the steps of opening, per look: [kind, seconds | hits]
const STEPS = {
  plain: [['peel', 1.0], ['crack', 1], ['twist', 1.0], ['pull', 0.35]],
  glitter: [['peel', 0.7], ['peel', 0.7], ['crack', 1], ['twist', 1.0], ['pull', 0.35]],
  pearl: [['peel', 1.0], ['crack', 2], ['twist', 1.1], ['pull', 0.4]],
  metal: [['peel', 1.0], ['crack', 2], ['twist', 1.2], ['pull', 0.4]],
  gold: [['peel', 1.0], ['crack', 2], ['twist', 1.2], ['pull', 0.4], ['foil', 0.8]],
  secret: [['peel', 1.2], ['crack', 3], ['twist', 1.5], ['pull', 0.5], ['foil', 1.0]],
};
const SEAL_OF = { plain: 'sticker', glitter: 'sticker', pearl: 'foil', metal: 'foil', gold: 'wax', secret: 'hanko' };

// ------------------------------------------------------------------ materials (cached)
const hexOf = (s, d) => parseInt(String(s || d).replace('#', ''), 16);
const lerpHex = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t).getHex();
// the skins' base tone is a light grey (room for brighter embossed edges): the tint is lifted to land on the colour
// (never past full brightness in any channel: a pale colour stays a little under itself rather than blooming)
const lift = (hex, k = 1.3) => { const c = new THREE.Color(hex).multiplyScalar(k), m = Math.max(c.r, c.g, c.b); return m > 0.94 ? c.multiplyScalar(0.94 / m) : c; };
const matCache = new Map();
function mat(kind, color = 0xffffff) {
  const k = kind + ':' + color;
  if (matCache.has(k)) return matCache.get(k);
  let m;
  if (kind === 'gloss') m = glossPlastic(shellSkin('plastic').tex, lift(color));
  else if (kind === 'clear') m = clearPlastic(shellSkin('clear').tex, 0xffffff);
  else if (kind === 'tint') m = clearPlastic(shellSkin('tint').tex, lift(color, 1.1));
  else if (kind === 'frost') m = clearPlastic(shellSkin('frost').tex, lift(color, 1.2));
  else if (kind === 'pearl') m = pearlPlastic(shellSkin('plastic').tex, lift(color, 1.25));
  else if (kind === 'metal') m = platedMetal(shellSkin('plastic').tex, lift(color, 1.15));
  else if (kind === 'secret') m = glossPlastic(shellSkin('secret').tex, 0xffffff, { env: 1.3 });
  else if (kind === 'foil') m = platedMetal(shellSkin('plastic').tex, lift(color, 1.2), { roughness: 0.12 });
  else if (kind === 'glitter') {
    const t = sealSheet().tex.clone();
    t.needsUpdate = true;
    m = new THREE.MeshStandardMaterial({ map: t, color: lift(color, 1.2), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.3, metalness: 0, envMapIntensity: 0.4 });
    m.userData.twinkle = t;
  }
  m.userData.kind = kind;
  matCache.set(k, m);
  return m;
}
/** [top, bottom] materials of a capsule: each { m (material), coat (clear: wants the clear coat) }. */
function shellMats(look, style, rgb) {
  const W = 0xffffff;
  if (look === 'glitter') return [{ m: mat('tint', lerpHex(rgb, W, 0.35)), coat: true }, { m: mat('tint', rgb), coat: true }];
  if (look === 'pearl') return [{ m: mat('pearl', lerpHex(rgb, W, 0.86)) }, { m: mat('pearl', lerpHex(rgb, W, 0.7)) }];
  if (look === 'metal') return [{ m: mat('metal', lerpHex(rgb, W, 0.3)) }, { m: mat('metal', rgb) }];
  if (look === 'gold') return [{ m: mat('metal', 0xf6d27a) }, { m: mat('metal', 0xeab842) }];
  if (look === 'secret') return [{ m: mat('secret') }, { m: mat('secret') }];
  if (style === 'opaque') return [{ m: mat('gloss', lerpHex(rgb, 0xfff8ee, 0.62)) }, { m: mat('gloss', rgb) }];
  if (style === 'paper') return [{ m: mat('frost', lerpHex(rgb, W, 0.5)) }, { m: mat('frost', rgb) }];
  if (style === 'tab') return [{ m: mat('clear'), coat: true }, { m: mat('tint', rgb), coat: true }];
  return [{ m: mat('clear'), coat: true }, { m: mat('gloss', rgb) }];
}
const seeThrough = (look, style) => look === 'glitter' || (look === 'plain' && style !== 'opaque');

function halfMesh(shape, r, part, res, M, parent, extras = null) {
  const g = shellGeo(shape, r, part, res, extras);
  const m = new THREE.Mesh(g.geo, M.m);
  m.receiveShadow = true;
  m.castShadow = !M.m.transparent;
  if (M.m.transparent) { m.renderOrder = 2; m.userData.noRim = true; }
  parent.add(m);
  if (M.coat) {
    const c = new THREE.Mesh(subRange(g.geo, g.outer[0], g.outer[1]), coatMaterial());
    c.renderOrder = 2.5; c.castShadow = false; c.userData.noRim = true; c.raycast = () => {};
    parent.add(c);
  }
  return m;
}

// glitter twinkles in steps: every fleck material's sheet moves down a frame
const TW = { t: -1 };
function twinkle() {
  const f = Math.floor(performance.now() / 170) % 4;
  if (f === TW.t) return;
  TW.t = f;
  for (const m of matCache.values()) if (m.userData.twinkle) m.userData.twinkle.offset.y = -(f * 8) / 256;
}

const easeOut = (x) => 1 - Math.pow(1 - x, 3);
/** How far the top has turned (rad) at twist progress k: a slow strain against the lugs, the click at 0.55, a slip. */
export function twistAngle(k) { return k < 0.55 ? 0.26 * Math.pow(k / 0.55, 1.5) : 0.26 + 0.8 * easeOut((k - 0.55) / 0.45); }

/**
 * Build a capsule group. Returns { group, top, bottom, r, paper, style, size, look, shape, steps, setStage, setTwist }.
 * color: 0xRRGGBB, or a packed colour (packLook). opts: { size, radius, style, shape, look, res: 'hi' | 'lo',
 * seals: false (no band / seal: the title screen's), empty (a shell: nothing inside) }
 */
export function makeCapsule(seriesId, color, opts = {}) {
  const u = unpackLook(color ?? capsuleColor(seriesId));
  const look = opts.look || u.look, rgb = u.rgb;
  const size = opts.size || capsuleSize(seriesId);
  const r = opts.radius || CAPSULE_R[size];
  const style = opts.style || capsuleStyle(seriesId), shape = opts.shape || capsuleShape(seriesId);
  const res = opts.res || 'hi', hi = res === 'hi';
  const group = new THREE.Group(), top = new THREE.Group(), bottom = new THREE.Group();
  group.add(top, bottom);
  const [MT, MB] = shellMats(look, style, rgb);
  halfMesh(shape, r, 'top', res, MT, top);
  halfMesh(shape, r, 'bottom', res, MB, bottom, opts.empty ? { key: 'empty', empty: true } : null);
  group.userData.capsule = true;
  const cap = { group, top, bottom, r, paper: null, style, size, look, shape, color: rgb, steps: [], stage: { i: 0, p: 0 }, bands: [], seal: null, foil: null };
  const S = SERIES_BY_ID[seriesId], sheet = hi ? seriesSheet(seriesId) : null;
  const add = (geo, material, parent, o = {}) => {
    const m = new THREE.Mesh(geo, material);
    m.castShadow = false; m.receiveShadow = !material.transparent;
    m.userData.noRim = true; m.raycast = () => {};
    if (o.order) m.renderOrder = o.order;
    parent.add(m);
    return m;
  };
  if (hi && !opts.empty) {
    // ---- inside: the mini-book against the back wall, the bag of parts in front of it
    const paper = cap.paper = add(leafletGeo(r), sheet.mat, bottom);
    paper.position.set(0, shape === 'can' ? -0.1 * r : 0, -0.36 * r);
    paper.rotation.x = -0.1;
    if (shape === 'can' || shape === 'egg') paper.scale.setScalar(0.82);
    if (seeThrough(look, style)) {
      const variant = ((S?.order || 1) + (rgb & 3)) % 4;
      cap.parts = add(partsGeo(r, variant), sheet.mat, bottom);
      cap.bag = add(bagGeo(r), coatMaterial(0.3), bottom, { order: 1.5 });
      if (shape === 'can') { cap.parts.scale.setScalar(0.8); cap.bag.scale.setScalar(0.8); }
    }
    if (look === 'gold' || look === 'secret') {
      cap.foil = add(foilGeo(r), mat('foil', look === 'secret' ? 0xd8a838 : 0xaeb8c6), bottom);
      cap.foil.visible = false; // shown once the halves part (nothing sees it before)
    }
  }
  if (look === 'glitter' && hi) {
    const gm = mat('glitter', lerpHex(rgb, 0xffffff, 0.75));
    add(glitterGeo(r, 'top'), gm, top).onBeforeRender = twinkle;
    add(glitterGeo(r, 'bottom'), gm, bottom);
  }
  // ---- shaped capsules: the daruma's face and its 福, the can's label
  if (hi && shape === 'daruma') {
    add(faceGeo(shape, r, 'top', SEALS.daruma, 44, [0.4, 0.52, 0.64, 0.76, 0.88, 0.98]), sealSheet().mat, top);
    add(faceGeo(shape, r, 'bottom', SEALS.fuku, 17, [-0.76, -0.66, -0.56, -0.46, -0.38]), sealSheet().mat, bottom);
  }
  if (hi && shape === 'can') add(labelBandGeo(shape, r, 'bottom', SEALS.can, -0.64, -0.2), sealSheet().mat, bottom);
  // ---- outside: the seal over the seam (its two pieces part with the halves), the band(s) round it
  const sealed = hi && opts.seals !== false;
  if (sealed) {
    const kind = SEAL_OF[look], sm = sealSheet().mat;
    const seal = cap.seal = { kind, hits: 0 };
    if (kind === 'sticker' || kind === 'foil') {
      const g = kind === 'sticker' ? stickerGeo(shape, r, [384, 0, 64, 96]) : stickerGeo(shape, r, SEALS.foil);
      seal.top = add(g.top, kind === 'sticker' ? sheet.mat : sm, top); seal.bottom = add(g.bottom, kind === 'sticker' ? sheet.mat : sm, bottom);
      seal.set = (f) => { seal.top.position.set(0, f * 0.022 * r, f * 0.035 * r); seal.bottom.position.set(0, -f * 0.012 * r, f * 0.018 * r); };
    } else {
      const a = waxGeo(shape, r, SEALS[kind]), b = waxGeo(shape, r, SEALS[kind + 'Cracked']);
      seal.top = add(a.top, sm, top); seal.bottom = add(a.bottom, sm, bottom);
      seal.topC = add(b.top, sm, top); seal.bottomC = add(b.bottom, sm, bottom);
      seal.set = (f) => {
        const cracked = f > 0.01, split = f >= 0.999 ? 1 : 0;
        seal.top.visible = seal.bottom.visible = !cracked; seal.topC.visible = seal.bottomC.visible = cracked;
        seal.topC.position.set(0, split * 0.03 * r, split * 0.01 * r); seal.bottomC.position.set(0, -split * 0.022 * r, 0);
      };
    }
    if (!opts.empty) {
      if (u.atari || opts.atari) add(dotStickerGeo(shape, r, SEALS.atari), sm, top);
      const ac = hexOf(S?.card?.accent, '#e5383b'), ac2 = hexOf(S?.card?.accent2, '#ffd23f');
      const tints = look === 'glitter' ? [ac2, ac] : look === 'secret' ? [0xffffff] : look === 'gold' ? [0xffd76a] : look === 'pearl' || look === 'metal' ? [0xe8eef8] : [ac];
      tints.forEach((tint, n) => {
        const bg = bandGeo(shape, r, look === 'secret' ? 'band2' : 'band', (tints.length - 1 - n) * 0.008);
        const total = BAND_TAB + BAND_N * BAND_VERTS, bm = bandMaterial(tint);
        const ring = add(subRange(bg.ring, 0, total), bm, bottom, { order: 2.2 + n * 0.01 });
        const holder = new THREE.Group();
        const ribbon = add(subRange(bg.ribbon, 0, 0), bm, holder, { order: 2.2 });
        holder.visible = false;
        bottom.add(holder);
        const band = { ring, ribbon, holder, k: 0, lipR: bg.lipR, tint };
        band.setPeel = (p) => {
          const k = Math.round(Math.min(1, Math.max(0, p)) * BAND_N);
          band.k = k;
          ring.visible = k < BAND_N;
          ring.geometry.setDrawRange(k ? BAND_TAB + k * BAND_VERTS : 0, total - (k ? BAND_TAB + k * BAND_VERTS : 0));
          holder.visible = k > 0 && k < BAND_N && !band.dropped;
          const a = BAND_A0 + k * (Math.PI * 2 / BAND_N);
          holder.position.set(Math.cos(a) * bg.lipR, 0, Math.sin(a) * bg.lipR);
          holder.rotation.y = -a;
          ribbon.geometry.setDrawRange(0, Math.min(RIBBON_N, k) * 6);
        };
        cap.bands.push(band); // the outermost band first: it peels first
      });
    } else seal.set(1);
  }
  if (sealed && !opts.empty) cap.steps = STEPS[look].map(([kind, n]) => (kind === 'crack' ? { kind, hits: n } : { kind, dur: n }));
  /** Pose the capsule: the steps before i done, step i at p (0..1). */
  cap.setStage = (i, p = 0) => {
    cap.stage.i = i; cap.stage.p = p;
    let b = 0, twist = 0, pull = 0, crack = 0, foil = 0, aside = false;
    cap.steps.forEach((s, n) => {
      const q = n < i ? 1 : n === i ? p : 0;
      if (s.kind === 'peel') cap.bands[b++]?.setPeel(q);
      else if (s.kind === 'crack') crack = q;
      else if (s.kind === 'twist') twist = q;
      else if (s.kind === 'pull') { pull = q; aside = n < i; }
      else if (s.kind === 'foil') foil = q;
    });
    cap.seal?.set(crack);
    const th = twistAngle(twist);
    top.rotation.set(0, th * 0.7, 0); bottom.rotation.y = -th * 0.3;
    if (aside) { top.position.set(-1.5 * r, 0.55 * r, 0.1 * r); top.rotation.set(0.2, th * 0.7, 1.0); } else top.position.set(0, pull * pull * 0.2 * r, 0);
    if (cap.foil) { cap.foil.visible = (aside || pull > 0.2) && foil < 1; cap.foil.scale.set(1 + foil * 0.3, 1 - foil * 0.8, 1 + foil * 0.3); }
    cap.twistK = twist;
  };
  /** Older callers and the dev viewer: just the twist, 0..1. */
  cap.setTwist = (k) => { const th = twistAngle(k); top.rotation.y = th * 0.7; bottom.rotation.y = -th * 0.3; top.position.y = k * r * 0.06; cap.twistK = k; };
  if (cap.steps.length) cap.setStage(0, 0);
  return cap;
}

// ------------------------------------------------------------------ the empty shell (after opening)
/** The two empty halves nested together (what is left in your hand once the figure is out). */
export function makeShell(seriesId, color, opts = {}) {
  const cap = makeCapsule(seriesId, color, { ...opts, res: opts.res || 'hi', empty: true });
  // the top half nests into the bottom one, tipped a little: the way people hand back empty capsules
  cap.top.rotation.set(Math.PI + 0.25, 0.6, 0.1);
  cap.top.position.set(cap.r * 0.08, -cap.r * 0.12, 0);
  cap.group.userData.shell = true;
  return cap;
}

// ------------------------------------------------------------------ instanced piles (machine windows, cartons)
const pileMats = {};
function pileMat(kind) {
  if (pileMats[kind]) return pileMats[kind];
  const lifted = new THREE.Color(1.12, 1.12, 1.12);
  let m;
  if (kind === 'gloss') m = glossPlastic(shellSkin('plastic').tex, lifted);
  else if (kind === 'tint') m = clearPlastic(shellSkin('tint').tex, new THREE.Color(1, 1, 1));
  else m = clearPlastic(shellSkin('frost').tex, new THREE.Color(1.05, 1.05, 1.05));
  return (pileMats[kind] = m);
}
/**
 * Shared low-detail geometry for piled capsules, per style + size (+ the series' shape). The bottoms are tinted per
 * instance; tops too when `tintTop` (opaque: a paler shade, see pileTopColor). coat / coatMat: the clear coat of the
 * domes (reflections only), to draw as a third instanced mesh with the same matrices.
 * Returns { top, bottom, topMat, bottomMat, r, coat, coatMat, tintTop }.
 */
export function pileGeometries(size = 'M', kind = 'clear', seriesId = null) {
  const r = CAPSULE_R[size], shape = seriesId ? capsuleShape(seriesId) : 'ball';
  const T = shellGeo(shape, r, 'top', 'lo'), B = shellGeo(shape, r, 'bottom', 'lo');
  const clearTop = kind === 'clear' || kind === 'tab';
  const topMat = clearTop ? mat('clear') : kind === 'opaque' ? pileMat('gloss') : pileMat('frost');
  const bottomMat = kind === 'clear' || kind === 'opaque' ? pileMat('gloss') : kind === 'tab' ? pileMat('tint') : pileMat('frost');
  return { top: T.geo, bottom: B.geo, topMat, bottomMat, r, coat: clearTop ? subRange(T.geo, T.outer[0], T.outer[1]) : null, coatMat: clearTop ? coatMaterial() : null, tintTop: !clearTop, shape };
}
/** The paler shade of an opaque or frosted capsule's top half. */
export function pileTopColor(hex, kind) { return lerpHex(hex & 0xffffff, kind === 'paper' ? 0xffffff : 0xfff8ee, kind === 'paper' ? 0.5 : 0.62); }
