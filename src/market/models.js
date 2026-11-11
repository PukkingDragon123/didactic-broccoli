// 3D objects for market things: the item a listing sells (for its photo and for the real thing in your hands), graded
// slabs, sealed parcels you open in small steps, and the lazy, cached listing photos.
//   itemObject(game, item) -> Object3D           any item descriptor (src/market/catalog.js) or held 'mkt' data
//   makeSlabMesh(d), makeParcelMesh(data)         slab: { key, finish, score, cert, variant }; parcel: see parcelCtl
//   photo(game, key, build, { size, bg, thumb }) -> data URL or '' (queued: call pumpPhotos each frame while shown)
import * as THREE from 'three';
import { makeItemMesh } from '../game/collectibles.js';
import { buildMachineModel, MACHINE_SPECS, layout } from '../world/machineModels.js';
import { makeCapsuleBox } from '../game/capsuleBox.js';
import { propMesh } from '../world/props.js';
import { voxelMaterials } from '../voxel/materials.js';
import { parcelShellGeometry, parcelFlapGeometry } from '../props/things/parcel.js';
import { sealedBox } from '../props/things/carton.js';
import { Pix } from '../gfx/pix.js';
import { textW5 } from '../gfx/font5x7.js';
import { getItem, SERIES_BY_ID } from '../data/series/index.js';
import { COSMETIC_BY_ID, cosmeticPreview } from '../people/cosmetics.js';
import { CHARM_DEFS, TIPJAR_DEFS, itemTitle, BUILD } from './catalog.js';
const BUILD_MODELS = Object.values(import.meta.glob('../build/models.js', { eager: true }))[0] || null;
import { decorate, decorateFigure, tintMaterial } from './variants.js';
import { garmentMesh } from './thrift.js';
import { audio } from '../core/audio.js';

// ------------------------------------------------------------------ charms, jars, trinkets
export function charmMesh(id, variant = null) {
  const def = CHARM_DEFS[id] || CHARM_DEFS.daruma;
  let m;
  if (def.item) { m = makeItemMesh(def.item); m.scale.setScalar(2.4); }
  else m = propMesh(def.prop, { fallbackSize: [0.15, 0.2, 0.13] });
  if (def.mat === 'gold') m.material = voxelMaterials('gold');
  if (def.tint) m.material = tintMaterial(m.material, def.tint);
  if (def.scale) m.scale.setScalar(def.scale);
  const g = new THREE.Group();
  g.add(m);
  if (variant) decorate(m, variant, { kind: 'prop' });
  return g;
}
export function jarMesh(id, variant = null) {
  const m = propMesh(TIPJAR_DEFS[id]?.prop || 'mk_jar_pickle', { fallbackSize: [0.1, 0.15, 0.1] });
  const g = new THREE.Group(); g.add(m);
  if (variant) decorate(m, variant, { kind: 'prop' });
  return g;
}

// ------------------------------------------------------------------ graded slab
const slabLabels = new Map();
function slabLabel(d) {
  const k = `${d.key}|${d.finish}|${d.score}|${d.cert}`;
  if (slabLabels.has(k)) return slabLabels.get(k);
  const p = new Pix(64, 24, 3);
  p.fill(0xfbf6ea);
  p.rect(0, 0, 64, 6, 0xc8302a);
  p.tinyText('KGS', 3, 0, { color: 0xffffff });
  p.tinyText(d.cert || '', 61, 0, { color: 0xffe0d8, align: 'right' });
  // the name in two lines of 5x7 text, wrapped by measured width (39 px, clear of the score box) at spaces and
  // hyphens; a name that still doesn't fit ends in '.'
  const MAXW = 39, parts = (getItem(d.key)?.name || '').toUpperCase().match(/[^ -]+-?/g) || [], lines = [];
  let cur = '';
  for (const w of parts) {
    const next = cur ? (cur.endsWith('-') ? cur + w : cur + ' ' + w) : w;
    if (textW5(next) <= MAXW) { cur = next; continue; }
    if (cur) lines.push(cur);
    cur = w;
  }
  if (cur) lines.push(cur);
  const shown = lines.slice(0, 2).map((l, i, a) => {
    let t = l;
    const more = i === a.length - 1 && lines.length > 2;
    while (t.length > 1 && textW5(t + (more ? '.' : '')) > MAXW) t = t.slice(0, -1);
    return t + (more || t !== l ? '.' : '');
  });
  shown.forEach((l, i) => p.tinyText(l, 3, 7 + i * 8, { color: 0x2a2220 }));
  p.rect(44, 7, 18, 15, d.score >= 9.5 ? 0xf2c14e : 0xe8e0d0);
  p.tinyText(String(d.score), 53, 8, { color: 0x2a2220, align: 'center' });
  p.tinyText(d.error ? 'ERROR' : gradeWord(d.score).split(' ')[0].slice(0, 5), 53, 15, { color: 0x6a3a2a, align: 'center' });
  const t = p.texture(); t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  slabLabels.set(k, t);
  return t;
}
export function gradeWord(s) { return s >= 10 ? 'PRISTINE' : s >= 9.5 ? 'GEM MINT' : s >= 9 ? 'MINT' : s >= 8 ? 'NM-MT' : s >= 7 ? 'NR MINT' : s >= 5 ? 'EX' : s >= 3 ? 'VG' : 'POOR'; }
const acryl = new THREE.MeshPhysicalMaterial({ color: 0xf2faff, transparent: true, opacity: 0.2, roughness: 0.04, clearcoat: 1, depthWrite: false });
const acrylEdge = new THREE.MeshStandardMaterial({ color: 0xb8c8d4, roughness: 0.25, transparent: true, opacity: 0.45 });
/** A figure sealed in a graded acrylic slab (standing; bottom edge at y = 0, label facing +z). */
export function makeSlabMesh(d) {
  const g = new THREE.Group();
  const W = 0.08, H = 0.12, D = 0.046;
  const shell = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), acryl);
  shell.position.y = H / 2; shell.renderOrder = 3; shell.userData.noRim = true;
  g.add(shell);
  for (const [w, h, x, y] of [[W, 0.003, 0, 0.0015], [W, 0.003, 0, H - 0.0015], [0.003, H, -W / 2 + 0.0015, H / 2], [0.003, H, W / 2 - 0.0015, H / 2]]) {
    const e = new THREE.Mesh(new THREE.BoxGeometry(w, h, D + 0.001), acrylEdge); e.position.set(x, y, 0); e.userData.noRim = true; g.add(e);
  }
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.01, (W - 0.01) * 24 / 64), new THREE.MeshStandardMaterial({ map: slabLabel(d), roughness: 0.6 }));
  lab.position.set(0, H - 0.006 - (W - 0.01) * 12 / 64, D / 2 - 0.004);
  g.add(lab);
  const insert = new THREE.Mesh(new THREE.BoxGeometry(W - 0.012, 0.005, D - 0.008), new THREE.MeshStandardMaterial({ color: 0xf4f0e8, roughness: 0.7 }));
  insert.position.y = 0.008; g.add(insert);
  const fig = makeItemMesh(d.key, d.finish || 'normal');
  const sz = fig.geometry.userData.size || new THREE.Vector3(0.05, 0.06, 0.04);
  const sc = Math.min(1.2, 0.074 / sz.y, 0.066 / sz.x, (D - 0.006) / sz.z);
  fig.scale.setScalar(sc);
  fig.position.set(0, 0.011, 0);
  g.add(fig);
  if (d.variant) decorateFigure(fig, d.variant);
  g.userData.slab = d;
  return g;
}

// ------------------------------------------------------------------ the item a descriptor stands for
function boxPhoto(label, sub = '') {
  // "photo is of the box": a real taped carton (src/props/things/carton.js) with the seller's shipping label
  return sealedBox([0.32, 0.2, 0.24], { title: label, sub, kind: 'used' });
}

export function itemObject(g, it) {
  if (!it) return new THREE.Group();
  switch (it.t) {
    case 'figure': case 'toy': {
      const holder = new THREE.Group();
      const m = makeItemMesh(it.key, it.finish || 'normal', { hires: true });
      holder.add(m);
      if (it.variant) decorateFigure(m, it.variant);
      return holder;
    }
    case 'set': {
      const grp = new THREE.Group();
      it.keys.slice(0, 6).forEach((k, i, a) => {
        const m = makeItemMesh(k, it.finishes?.[i] || 'normal');
        m.position.x = (i - (a.length - 1) / 2) * 0.06;
        m.position.z = (i % 2) * -0.03;
        grp.add(m);
        if (i === 0 && it.variant) decorateFigure(m, it.variant);
      });
      return grp;
    }
    case 'machine': return machineObject(it.mtype, it.variant);
    case 'carton': { const c = makeCapsuleBox({ type: 'refill', series: it.series, count: it.count, stage: 2 }); c.userData.capBox.setStage(2, false); return c; }
    case 'charm': return charmMesh(it.id, it.variant);
    case 'tipjar': return jarMesh(it.id, it.variant);
    case 'garment': {
      const c = COSMETIC_BY_ID[it.cid];
      if (c && c.slot !== 'outfit' && !c.thrift) { const o = cosmeticPreview(it.cid); return o; }
      return garmentMesh(it.cid);
    }
    case 'slab': return makeSlabMesh(it);
    case 'mdecor': return propMesh(it.id, { fallbackSize: [0.4, 0.4, 0.4] });
    case 'mdisplay': return g.museum?.displayPreview ? g.museum.displayPreview(it.id) : boxPhoto('Display');
    case 'goods': return boxPhoto(itemTitle(it).split(' ').slice(-2).join(' '), 'used');
    case 'shelf': return boxPhoto('Wall shelf', 'used');
    case 'stands': return boxPhoto(`${it.n} stands`, 'acrylic');
    case 'blister': return boxPhoto(`${it.n} packs`, 'blister');
    case 'junk': {
      const b = boxPhoto('JUNK', '???');
      const tr = propMesh('mk_trinket_cassette'); tr.position.set(-0.06, 0.2, 0.02); tr.rotation.set(0.2, 0.5, 0.3); b.add(tr);
      const sp = propMesh('mk_trinket_spoon'); sp.position.set(0.07, 0.2, -0.02); sp.rotation.set(0, 1, 0.4); b.add(sp);
      return b;
    }
    case 'brick': return propMesh('mk_brick');
    case 'trinket': return propMesh(`mk_trinket_${it.id}`, { fallbackSize: [0.05, 0.05, 0.05] });
    case 'furn': {
      const def = BUILD?.FURNITURE?.[it.id];
      try { if (def && BUILD_MODELS?.buildPiece) return BUILD_MODELS.buildPiece(def, {}).root; } catch { /* fall through */ }
      return boxPhoto(def?.name || 'furniture', 'used');
    }
    default: return boxPhoto(it.t || 'item');
  }
}

/** A gacha machine model (a listing photo) with its variant on the faceplate. */
export function machineObject(type, variant) {
  const built = buildMachineModel(type, {});
  const L = built.L || layout(MACHINE_SPECS[type]);
  if (variant) decorateMachine(built.group, L, variant);
  return built.group;
}
/** Stickers on the lower faceplate, faded paint everywhere (machines in the garage use this too). */
export function decorateMachine(group, L, v) {
  decorate(group, v, { kind: 'machine', flat: true, face: { x0: -L.w / 2 + 0.03, x1: L.w / 2 - 0.03, y0: L.y0 + 0.04, y1: L.y0 + L.lowH - 0.04, z: L.front + 0.001 } });
}

// ------------------------------------------------------------------ sealed parcels (opened in steps)
const PVS = 0.01;
const PSIZES = { S: [22, 12, 16], M: [32, 18, 24], L: [44, 26, 32] };
// the carton and its flaps are modelled in src/props/things/parcel.js
const labelTexes = new Map();
function parcelLabel(from, to, kind) {
  const k = `${from}|${to}|${kind}`;
  if (labelTexes.has(k)) return labelTexes.get(k);
  const p = new Pix(64, 40, from.length);
  p.fill(0xfbf6ea);
  p.rect(0, 0, 64, 9, kind === 'out' ? 0x2a5aa8 : 0xc8302a);
  p.tinyText(kind === 'out' ? 'SHIP TO' : 'FROM', 3, 1, { color: 0xffffff });
  p.tinyText(from.toUpperCase().slice(0, 12), 3, 12, { color: 0x2a2220 });
  p.tinyText(to.toUpperCase().slice(0, 12), 3, 21, { color: 0x6a5a4a });
  // the courier's little FREE CANDY sticker in the corner
  p.rect(44, 28, 18, 10, 0xff7aa8); p.tinyText('FREE', 53, 28, { color: 0xffffff, align: 'center' }); p.tinyText('CNDY', 53, 33, { color: 0x2a2220, align: 'center' });
  for (let x = 3; x < 40; x += 2) p.rect(x, 31, 1, 6, x % 3 ? 0x2a2220 : 0xfbf6ea); // barcode
  const t = p.texture(); t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  labelTexes.set(k, t);
  return t;
}
const tapeM = new THREE.MeshStandardMaterial({ color: 0xc8a878, roughness: 0.35, transparent: true, opacity: 0.88 });

/**
 * A sealed parcel. data: { type: 'parcel', size: 'S'|'M'|'L', from, label, contents: [{ kind, d }], stage 0|1|2 }.
 * userData.parcel = controller { data, setStage(n), sync(), update(dt) }; contents show inside once it's open.
 */
export function makeParcelMesh(game, data) {
  data.stage ??= 0;
  const [W, H, D] = PSIZES[data.size] || PSIZES.M;
  const group = new THREE.Group();
  const shellGeo = parcelShellGeometry(W * PVS, H * PVS, D * PVS), mats = shellGeo.userData.page.mats();
  const shell = new THREE.Mesh(shellGeo, mats);
  shell.castShadow = shell.receiveShadow = true;
  group.add(shell);
  const lm = new THREE.MeshStandardMaterial({ map: parcelLabel(data.from || 'Off-Hobby', data.label || '', data.out ? 'out' : 'in'), roughness: 0.85 });
  const lw = Math.min(W * PVS * 0.55, 0.16);
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(lw, lw * 40 / 64), lm);
  lab.position.set(-W * PVS * 0.12, H * PVS * 0.5, D * PVS / 2 + 0.0008);
  lab.userData.noDecal = true;
  group.add(lab);
  const flaps = [];
  const mk = (long, sign) => {
    const piv = new THREE.Group();
    const fg = parcelFlapGeometry(W * PVS, D * PVS, long), m = new THREE.Mesh(fg, fg.userData.page.mats());
    m.castShadow = true;
    if (long) { piv.position.set(0, H * PVS, sign * (D / 2) * PVS); m.position.y = PVS; } else piv.position.set(sign * (W / 2) * PVS, H * PVS, 0);
    if (sign > 0) m.rotation.y = Math.PI;
    piv.add(m); group.add(piv);
    flaps.push({ piv, long, sign, k: data.stage >= 2 ? 1 : 0 });
  };
  mk(false, -1); mk(false, 1); mk(true, -1); mk(true, 1);
  const tape = new THREE.Group();
  const t1 = new THREE.Mesh(new THREE.BoxGeometry(W * PVS + 0.004, 0.002, 0.05), tapeM); t1.position.y = H * PVS + 2 * PVS + 0.001; tape.add(t1);
  for (const s of [-1, 1]) { const t2 = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.07, 0.05), tapeM); t2.position.set(s * (W * PVS / 2 + 0.002), H * PVS - 0.03, 0); tape.add(t2); }
  group.add(tape);
  const inside = new THREE.Group();
  group.add(inside);
  const ctl = {
    data, group,
    /** Rebuild the little things you can see inside (call after taking one out). */
    sync() {
      inside.clear();
      const list = data.contents || [];
      inside.visible = data.stage >= 2;
      if (!inside.visible) return;
      const n = Math.min(list.length, 6);
      for (let i = 0; i < n; i++) {
        let o;
        try { o = contentObject(game, list[i]); } catch { o = new THREE.Group(); }
        const b = new THREE.Box3().setFromObject(o), sz = b.getSize(new THREE.Vector3());
        const fit = Math.min(1, (W * PVS * 0.8 / Math.max(1, Math.min(n, 3))) / Math.max(sz.x, 0.01), (D * PVS * 0.4) / Math.max(sz.z, 0.01), (H * PVS * 0.9) / Math.max(sz.y, 0.01));
        o.scale.multiplyScalar(fit);
        const col = i % 3, row = Math.floor(i / 3);
        o.position.set((col - (Math.min(n, 3) - 1) / 2) * W * PVS * 0.28, H * PVS * 0.05 + row * 0.02, (row ? -1 : 1) * D * PVS * 0.18);
        o.rotation.y = (i * 1.7) % 1 - 0.5;
        o.traverse((m) => { if (m.isMesh) m.castShadow = false; });
        inside.add(o);
      }
    },
    setStage(n, animate = true) {
      data.stage = n;
      tape.visible = n < 1;
      for (const f of flaps) f.target = n >= 2 ? 1 : 0;
      if (!animate) for (const f of flaps) f.k = f.target;
      ctl.sync();
    },
    update(dt) {
      for (const f of flaps) {
        const want = f.target ?? (data.stage >= 2 ? 1 : 0);
        if (f.k !== want) f.k += Math.sign(want - f.k) * Math.min(Math.abs(want - f.k), dt * (f.long ? 3.2 : 4.5));
        const a = f.k * (Math.PI + 0.35);
        if (f.long) f.piv.rotation.x = f.sign * a; else f.piv.rotation.z = -f.sign * a;
      }
    },
    size: [W * PVS, H * PVS, D * PVS],
  };
  ctl.setStage(data.stage, false);
  ctl.update(0);
  group.userData.parcel = ctl;
  group.userData.size = ctl.size;
  let last = performance.now();
  shell.onBeforeRender = () => { const now = performance.now(); ctl.update(Math.min(0.05, (now - last) / 1000)); last = now; };
  return group;
}
export const parcelOf = (obj) => obj?.userData?.parcel || null;

/** What a parcel content entry looks like ({ kind: 'toy'|'mkt'|'tool', d }). */
export function contentObject(g, c) {
  if (c.kind === 'toy') { const h = new THREE.Group(); const m = makeItemMesh(c.d.key, c.d.finish || 'normal'); h.add(m); if (c.d.variant) decorateFigure(m, c.d.variant); return h; }
  if (c.kind === 'tool') return propMesh(c.d.id === 'gen_candy' ? 'candy_piece' : c.d.id, { fallbackSize: [0.05, 0.03, 0.03] });
  return mktObject(g, c.d);
}
/** Mesh for held / loose 'mkt' data: { t: 'charm'|'tipjar'|'slab'|'garment'|'brick'|'trinket', ... }. */
export function mktObject(g, d) {
  if (d.t === 'charm') return charmMesh(d.id, d.variant);
  if (d.t === 'tipjar') return jarMesh(d.id, d.variant);
  if (d.t === 'slab') return makeSlabMesh(d);
  if (d.t === 'garment') return garmentMesh(d.cid);
  if (d.t === 'brick') return propMesh('mk_brick');
  if (d.t === 'trinket') return propMesh(`mk_trinket_${d.id}`, { fallbackSize: [0.05, 0.05, 0.05] });
  return new THREE.Group();
}

// ------------------------------------------------------------------ listing photos (lazy, cached)
const PHOTOS = new Map(); // key -> url ('' while queued)
const queue = [];
const BG = {
  tatami: (p) => { p.fill(0xb8b070); for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if ((x + (y >> 1)) % 3 === 0) p.px(x, y, 0xa8a060); for (let y = 0; y < p.h; y += 24) p.rect(0, y, p.w, 2, 0x3a5a3a); },
  table: (p) => { p.fill(0xa0683a); for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (Math.sin(x * 0.3 + Math.sin(y * 0.11) * 3) > 0.7) p.px(x, y, 0x8a5830); for (let y = 0; y < p.h; y += 20) p.rect(0, y, p.w, 1, 0x6a4020); },
  sheet: (p) => { p.fill(0x7aa0d8); for (let y = 2; y < p.h; y += 8) for (let x = (y >> 3) % 2 ? 2 : 6; x < p.w; x += 8) p.rect(x, y, 2, 2, 0xe8eef8); },
  news: (p) => { p.fill(0xd8d4c8); for (let y = 3; y < p.h; y += 4) for (let x = 2; x < p.w - 2; x++) if ((x * 7 + y * 3) % 11 > 2) p.px(x, y, 0x8a8a84); p.rect(4, 2, 30, 6, 0x4a4a48); },
  carpet: (p) => { p.fill(0x9a3a3a); p.speckle(0.2, [0x7a2a2a, 0xb04a4a, 0x6a2424]); },
  floor: (p) => { p.fill(0x9a9690); p.speckle(0.18, [0x8a8680, 0xaaa6a0, 0x7a7670]); },
  studio: (p) => { p.fill(0xf0ece4); for (let y = 0; y < p.h; y += 2) for (let x = (y >> 1) % 2; x < p.w; x += 2) p.px(x, y, 0xe6e2da); },
};
/**
 * A photo of an item: build() -> Object3D, rendered once (queued), composited over a backdrop. opts: { size, bg,
 * thumb (a finger in the corner, ha), side, up, blur (shot at half resolution) }. Returns the data URL or ''.
 */
export function photo(g, key, build, opts = {}) {
  const k = `${key}|${opts.size || 96}`;
  if (PHOTOS.has(k)) return PHOTOS.get(k);
  PHOTOS.set(k, '');
  queue.push({ k, build, opts, g });
  return '';
}
export const photoReady = (key, size = 96) => PHOTOS.get(`${key}|${size}`) || '';
/** Render queued photos for up to `ms`; returns the keys that finished. */
export function pumpPhotos(ms = 8) {
  const done = [];
  const t0 = performance.now();
  while (queue.length && performance.now() - t0 < ms) {
    const q = queue.shift();
    let url = '';
    try { url = renderPhoto(q.g, q.build, q.opts); } catch (e) { console.warn('market photo', e); }
    PHOTOS.set(q.k, url);
    done.push(q.k);
  }
  return done;
}
function renderPhoto(g, build, o) {
  const size = o.size || 96;
  const obj = build();
  obj.updateMatrixWorld(true);
  const rs = o.blur ? Math.max(32, size >> 1) : size;
  const shot = g.thumbs.renderObject(obj, rs, { side: o.side ?? 0.45, up: o.up ?? 0.3, outline: false });
  const p = new Pix(size, size, size);
  (BG[o.bg] || BG.studio)(p);
  p.flush();
  const ctx = p.ctx;
  ctx.imageSmoothingEnabled = false;
  // a soft-edged shadow blob under the item is a smooth gradient: a flat darker ellipse of pixels instead
  for (let y = 0; y < 6; y++) for (let x = 0; x < size * 0.6; x++) { const dx = (x - size * 0.3) / (size * 0.3), dy = (y - 3) / 3; if (dx * dx + dy * dy < 1) p.px(Math.round(size * 0.2 + x), Math.round(size * 0.86 + y), 0x000000, 50); }
  p.flush();
  ctx.drawImage(shot, 0, 0, rs, rs, 0, 0, size, size);
  if (o.thumb) {
    // the seller's thumb in the corner of the shot
    const tx = size - 22, ty = size - 18;
    p.pull();
    for (let y = 0; y < 22; y++) for (let x = 0; x < 26; x++) { const dx = (x - 13) / 13, dy = (y - 14) / 12; if (dx * dx + dy * dy < 1) p.px(tx + x, ty + y, dy < -0.5 ? 0xeab49a : 0xd8987a); }
    p.rect(tx + 8, ty + 4, 7, 4, 0xf4d0c0);
    p.flush();
  }
  return p.canvas.toDataURL();
}

// small sounds the market uses (synth, registered with the shared bank)
export function sfx(name, opts = {}) { try { audio.play(name, opts); } catch { /* not ready */ } }
export { SERIES_BY_ID };
