// Packing station on the work table: seal a figure into a blister card (a 'packaged' item: worth more at the sell
// box, and the boxed item the phase-2 marketplace sells), and acrylic display stands you place on any surface to show
// off a figure (a one-slot display with a price tag: RMB).
//   packFigure(game, heldToy) -> packaged data { key, finish, pack: 'blister' }
//   game.packing.addPacks(n) / addStands(n): supplies (E-Mart / the corner shop can sell them)
//   packagedValue(key, finish): what a sealed figure fetches
// Held-item hooks for the 'packaged' and 'stand' kinds are installed into game.held (Held.js untouched).
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { ensureState } from './stateExt.js';
import { makeItemMesh } from './collectibles.js';
import { getItem, SERIES_BY_ID } from '../data/series/index.js';
import { RARITIES } from '../data/rarity.js';
import { itemValue } from './economy.js';
import { DisplaySlots } from './Display.js';
import { Px, dk, lt, on } from '../products/px.js';
import { m5, m3, mk, bold, label, whenFontsReady } from '../products/type.js';
import { PAT, burst, infoBox, barcode } from '../products/print.js';
import { VoxelModel, gloss, glass, metal } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { voxelMaterials } from '../voxel/materials.js';
import { formatYen } from '../core/util.js';
import './gachaSfx.js';

const hex = (s) => parseInt(String(s || '#ffffff').replace('#', ''), 16);
export const PACKED_MULT = 1.3;
export function packagedValue(key, finish = 'normal') { return Math.round((itemValue(key, finish) * PACKED_MULT) / 10) * 10; }

// ------------------------------------------------------------------ meshes
// The printed card and box are painted with the label studio (src/products): the series' name in kana, its colours and
// pattern, a rarity flash, the figure's name on a ribbon, and on the back the 品名 box, the small-parts warning and a
// JAN code, as on a 1999 blister card. Ultra rares and secrets go in a window box instead.
const INK = 0x2e1f28, PAPER = 0xfffaf0;
const KB = (t) => bold(mk(t, 16)), K = (t, z = 12) => mk(t, z);
const cardTex = new Map();
/** A texture painted from a Px, repainted once the label fonts are in. */
function pxTexture(paint) {
  const p0 = paint(), c = p0.canvas(1), t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4;
  whenFontsReady().then(() => { const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); paint().draw(g, 0, 0, 1); t.needsUpdate = true; });
  return t;
}
const patOf = (card, bg, a2) => ({ stars: PAT.dots(bg, lt(a2, 0.5), 14, 2.4), checker: PAT.checks(bg, lt(a2, 0.72), 10), stripes: PAT.stripes(bg, lt(a2, 0.72), 8, 'd'), grid: PAT.checks(bg, lt(a2, 0.8), 6) }[card?.pattern] || PAT.dots(bg, lt(a2, 0.6), 12, 2));
function star(p, cx, cy, r, c) { p.burst(cx, cy, r + 1, r * 0.45 + 1, 5, INK, -Math.PI / 2); p.burst(cx, cy, r, r * 0.45, 5, c, -Math.PI / 2); }
function wrapEN(str, n) { const out = ['']; for (const w of String(str).toUpperCase().split(' ')) { if ((out[out.length - 1] + ' ' + w).trim().length > n) out.push(w); else out[out.length - 1] = (out[out.length - 1] + ' ' + w).trim(); } return out; }
const janFor = (key) => { let h = 7; for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) % 100000; return '4955301' + String(h).padStart(5, '0'); };
/** The front of the card or box: w x h pixels, a clear patch (hole) where the figure shows. */
function paintFace(key, finish, w, h, hole) {
  const it = getItem(key) || {}, s = SERIES_BY_ID[it.series] || {}, card = s.card || {}, r = RARITIES[it.rarity] || RARITIES.common;
  const bg = hex(card.bg || '#fff6e8'), ac = hex(card.accent || '#e5383b'), a2 = hex(card.accent2 || card.accent || '#2f6fd6'), tx = hex(card.text || '#2a2220');
  const p = new Px(w, h); p.fill(bg); p.rect(0, 0, w, h, patOf(card, bg, a2));
  // the header: hang slot, the series in kana, its name small
  p.rect(0, 0, w, 44, ac); p.rect(0, 44, w, 3, tx); p.rect(0, 47, w, 1, lt(ac, 0.5));
  p.rrect(w / 2 - 15, 5, 30, 9, 4, dk(ac, 0.55)); p.rrect(w / 2 - 13, 7, 26, 5, 2, 0x1a1418);
  const jp = s.jp || '', mj = jp ? ([...jp].length * 17 > w - 10 ? K(jp, 12) : KB(jp)) : null;
  if (mj) label(p, mj, w / 2, 17, { c: on(ac), align: 'c' });
  label(p, m3((s.name || 'COLLECTION').toUpperCase().slice(0, Math.floor((w - 8) / 4))), w / 2, 36, { c: on(ac), align: 'c' });
  // where the figure sits: a lighter stage with the series' second colour round it
  if (hole) { const [x, y, hw, hh] = hole; p.rrect(x - 4, y - 4, hw + 8, hh + 8, 8, a2); p.rrect(x - 2, y - 2, hw + 4, hh + 4, 6, PAPER); p.rect(x, y, hw, hh, PAT.rays(lt(bg, 0.5), lt(a2, 0.78), x + hw / 2, y + hh * 0.7, 14)); p.rect(x, y + hh - 10, hw, 10, lt(a2, 0.55)); }
  // rarity: stars on a flash at the corner of the stage
  const fy = hole ? hole[1] + 4 : 60;
  burst(p, w - 26, fy + 10, 20, [m3(r.name.toUpperCase().split(' ')[0]), m5(String(r.stars))], { c: hex(r.color), text: INK, ink: INK, n: 12 });
  for (let i = 0; i < r.stars; i++) star(p, 12 + i * 13, fy + 2, 5, 0xffd23f);
  // the name on a ribbon, the finish as a foil sticker, the small print along the foot
  const ny = hole ? hole[1] + hole[3] + 10 : h - 50, lines = wrapEN(it.name || '', Math.floor((w - 22) / 6)).slice(0, 2);
  p.rect(6, ny, w - 12, lines.length * 10 + 8, tx); p.rect(6, ny + lines.length * 10 + 8, w - 12, 2, dk(tx, 0.4));
  lines.forEach((l, i) => label(p, m5(l), w / 2, ny + 5 + i * 10, { c: bg, align: 'c' }));
  if (finish && finish !== 'normal') { p.rrect(8, ny - 15, m5(finish.toUpperCase()).w + 10, 12, 3, 0xffd23f); p.frame(8, ny - 15, m5(finish.toUpperCase()).w + 10, 12, 0xb88a20); label(p, m5(finish.toUpperCase()), 13, ny - 12, { c: 0x6a4a08 }); }
  label(p, K('対象年齢6才以上', 10), 6, h - 14, { c: tx }); label(p, m3('NO.' + janFor(key).slice(7)), w - 6, h - 10, { c: tx, align: 'r' });
  p.frame(0, 0, w, h, dk(bg, 0.3));
  return p;
}
/** The back: the facts, the warning, the code. */
function paintBack(key, finish, w, h) {
  const it = getItem(key) || {}, s = SERIES_BY_ID[it.series] || {}, card = s.card || {};
  const bg = lt(hex(card.bg || '#fff6e8'), 0.4), ac = hex(card.accent || '#e5383b'), tx = hex(card.text || '#2a2220');
  const p = new Px(w, h); p.fill(bg);
  p.rect(0, 0, w, 20, ac); label(p, K(s.jp || 'コレクション', 12), 6, 4, { c: on(ac) });
  let y = infoBox(p, 5, 26, w - 10, [['品名', 'フィギュア'], ['材質', 'PVC・ABS'], ['対象年齢', '6才以上'], ['発売元', 'ガレージ玩具 汐見市横丁1']], { ink: tx, paper: PAPER, size: 10, lh: 12 });
  p.rect(5, y, w - 10, 40, 0xfff0a0); p.frame(5, y, w - 10, 40, 0xc8302a);
  label(p, K('ちゅうい', 10), 9, y + 2, { c: 0xc8302a });
  ['小さな部品があります。', '口に入れないでください。'].forEach((l, i) => label(p, K(l, 10), 9, y + 14 + i * 12, { c: tx }));
  barcode(p, Math.round((w - 113) / 2), h - 36, janFor(key), { h: 16 });
  p.frame(0, 0, w, h, dk(bg, 0.3));
  return p;
}
function cardTexture(key, finish, back = false) {
  const k = key + '|' + finish + (back ? '|b' : '');
  if (!cardTex.has(k)) cardTex.set(k, pxTexture(() => (back ? paintBack(key, finish, 144, 204) : paintFace(key, finish, 144, 204, [10, 54, 124, 96]))));
  return cardTex.get(k);
}

const bubbleMat = new THREE.MeshPhysicalMaterial({ color: 0xf4fbff, transparent: true, opacity: 0.22, roughness: 0.05, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
const edgeMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.9 });
/** A window box (ultra rares and secrets): printed all round, the figure behind a film window. */
function makeBoxed(key, finish) {
  const g = new THREE.Group(), W = 0.066, H = 0.096, D = 0.04, t = 0.0012;
  const it = getItem(key) || {}, s = SERIES_BY_ID[it.series] || {}, card = s.card || {};
  const face = pxTexture(() => paintFace(key, finish, 132, 192, [16, 52, 100, 92])), back = pxTexture(() => paintBack(key, finish, 132, 192));
  const side = new THREE.MeshStandardMaterial({ color: hex(card.accent || '#e5383b'), roughness: 0.8 });
  const fm = new THREE.MeshStandardMaterial({ map: face, roughness: 0.7 }), bm = new THREE.MeshStandardMaterial({ map: back, roughness: 0.8 });
  // the front is a frame round the window (four strips taking their part of the print)
  const wx0 = -W / 2 + (16 / 132) * W, wx1 = -W / 2 + (116 / 132) * W, wy1 = H - (52 / 192) * H, wy0 = H - (144 / 192) * H;
  const strip = (x0, y0, x1, y1) => { const geo = new THREE.PlaneGeometry(x1 - x0, y1 - y0), uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (x0 + uv.getX(i) * (x1 - x0) + W / 2) / W, (y0 + uv.getY(i) * (y1 - y0)) / H); geo.translate((x0 + x1) / 2, (y0 + y1) / 2, D / 2); const m = new THREE.Mesh(geo, fm); m.castShadow = true; g.add(m); };
  strip(-W / 2, 0, W / 2, wy0); strip(-W / 2, wy1, W / 2, H); strip(-W / 2, wy0, wx0, wy1); strip(wx1, wy0, W / 2, wy1);
  const shell = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), [side, side, side, side, new THREE.MeshBasicMaterial({ visible: false }), bm]);
  shell.position.y = H / 2; shell.castShadow = true; g.add(shell);
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(W - t, H - t), new THREE.MeshStandardMaterial({ color: lt(hex(card.bg || '#fff6e8'), 0.3), roughness: 0.9 }));
  inner.position.set(0, H / 2, -D / 2 + t); g.add(inner);
  const film = new THREE.Mesh(new THREE.PlaneGeometry(wx1 - wx0, wy1 - wy0), bubbleMat);
  film.position.set((wx0 + wx1) / 2, (wy0 + wy1) / 2, D / 2 - 0.0004); film.renderOrder = 3; film.userData.noRim = true; g.add(film);
  const fig = makeItemMesh(key, finish), sz = fig.geometry.userData.size, sc = Math.min(1, 0.04 / sz.y, 0.044 / Math.max(sz.x, sz.z * 1.4));
  fig.scale.setScalar(sc); fig.position.set(0, wy0 + 0.002, 0); fig.castShadow = false; g.add(fig);
  g.userData.packaged = { key, finish };
  return g;
}
/** A figure sealed in a blister card (standing, the card's bottom edge at y = 0, facing +z); the rarest come boxed. */
export function makePackagedMesh(key, finish = 'normal') {
  if ((RARITIES[getItem(key)?.rarity]?.stars || 1) >= 4) return makeBoxed(key, finish);
  const g = new THREE.Group();
  const W = 0.072, H = 0.102, D = 0.003;
  const card = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), [
    edgeMat, edgeMat, edgeMat, edgeMat,
    new THREE.MeshStandardMaterial({ map: cardTexture(key, finish), roughness: 0.75 }),
    new THREE.MeshStandardMaterial({ map: cardTexture(key, finish, true), roughness: 0.9 }),
  ]);
  card.position.y = H / 2;
  card.castShadow = true;
  g.add(card);
  const fig = makeItemMesh(key, finish);
  const sz = fig.geometry.userData.size;
  const sc = Math.min(1, 0.042 / sz.y, 0.054 / Math.max(sz.x, sz.z * 2));
  fig.scale.setScalar(sc);
  fig.position.set(0, 0.03, D / 2 + sz.z * sc / 2 + 0.002);
  fig.castShadow = false;
  g.add(fig);
  const bub = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.05, Math.max(0.018, sz.z * sc + 0.008)), bubbleMat);
  bub.position.set(0, 0.03 + 0.025 - 0.002, D / 2 + bub.geometry.parameters.depth / 2);
  bub.renderOrder = 3;
  bub.userData.noRim = true;
  g.add(bub);
  // a little foot so it stands
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.003, 0.03), edgeMat);
  foot.position.set(0, 0.0015, -0.012);
  g.add(foot);
  g.rotation.x = 0;
  g.userData.packaged = { key, finish };
  return g;
}

let standGeo = null;
/** Acrylic display stand: a clear stepped riser on a base with a printed plate (figure slot on top). */
function standMesh() {
  if (!standGeo) {
    const v = new VoxelModel();
    v.jitter = 0;
    const a = glass(0xe8f4fa);
    v.box(-8, 0, -7, 7, 1, 6, a);
    v.box(-6, 2, -5, 5, 6, 4, a);
    v.box(-8, 0, 7, 7, 3, 7, gloss(0x2a2a2e)); // plate edge
    v.box(-7, 1, 8, 6, 2, 8, metal(0xd8b850));
    standGeo = meshVoxels(v, { voxelSize: 0.0045, origin: 'bottom' });
  }
  const m = new THREE.Mesh(standGeo, voxelMaterials('normal'));
  m.castShadow = true;
  return m;
}
const STAND_TOP = 0.0045 * 7;

let stationGeo = null;
function stationMesh() {
  if (!stationGeo) {
    const v = new VoxelModel();
    v.jitter = 0.02;
    // a stack of blister cards (cream backing, red headers)
    for (let i = 0; i < 6; i++) { v.box(-16, i, -8, -4, i, 6, i === 5 ? 0xe8dcc4 : 0xd8ccb0); v.paint(() => v.box(-16, i, 3, -4, i, 6, 0xc8352a)); }
    // the heat sealer: dark grey body, a matte steel plate, red lever
    v.box(0, 0, -7, 12, 6, 6, gloss(0x4a5058));
    v.box(1, 7, -6, 11, 7, 5, 0x8a9098);
    v.box(2, 8, 2, 10, 9, 3, gloss(0xc8352a));
    v.box(9, 1, 7, 10, 2, 7, gloss(0x3cae5a)); // pilot light
    // a little box of acrylic stands
    v.hollowBox(-14, 7, -7, -6, 13, 1, glass(0xd8e8f0), 1, ['top']);
    v.box(-13, 8, -6, -7, 9, 0, glass(0xc8dce8));
    stationGeo = meshVoxels(v, { voxelSize: 0.01, origin: 'bottom' });
  }
  const m = new THREE.Mesh(stationGeo, voxelMaterials('normal'));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// ------------------------------------------------------------------ packing
/** Seal the held figure into a blister card (uses one pack). Returns the packaged data or null. */
export function packFigure(game, item) {
  const g = game, P = g.packing?.state;
  if (!item || item.kind !== 'toy' || !P || P.packs <= 0) return null;
  P.packs--;
  const data = { key: item.data.key, finish: item.data.finish || 'normal', pack: 'blister' };
  const st = g.packing.station;
  const spot = st.localToWorld(new THREE.Vector3(-0.1, 0.07, 0.02));
  g.held.putTo(spot, st.getWorldQuaternion(new THREE.Quaternion()), (obj) => {
    obj.parent?.remove(obj);
    const pk = makePackagedMesh(data.key, data.finish);
    pk.position.copy(spot).add(new THREE.Vector3(0, -0.05, 0));
    pk.quaternion.copy(st.getWorldQuaternion(new THREE.Quaternion()));
    pk.scale.setScalar(0.3);
    g.scene.add(pk);
    audio.play('blister', { pos: spot, vol: 0.9 });
    g.tweens.add({ dur: 0.35, update: (k) => pk.scale.setScalar(0.3 + 0.7 * k), done: () => {
      g.tweens.wait(0.25, () => { g.held.take('packaged', data, pk); g.save(); });
    } });
  }, { dur: 0.3, arc: 0.06, scale: 1 });
  g.events.emit('figurePacked', { data });
  return data;
}

// ------------------------------------------------------------------ install
export function installInto(game) {
  const g = game;
  const P = ensureState(g, 'packing', { packs: 10, stands: 3, placed: [], loose: [] });
  const api = {
    state: P,
    addPacks(n) { P.packs += n; },
    addStands(n) { P.stands += n; },
    pack: (item) => packFigure(g, item),
    stands: [],
    /** Figures on acrylic stands with a price tag (for customers who buy). */
    forSale() { return api.stands.filter((s) => s.display.items[0]?.pm).map((s) => ({ stand: s, item: s.display.items[0], price: s.display.priceOf(s.display.items[0]) })); },
  };
  g.packing = api;

  // the station on the work table
  const T = g.garage.table;
  const st = stationMesh();
  st.position.set(T.x - 0.22, T.h, T.z + 0.24);
  st.rotation.y = 0.12;
  g.scene.add(st);
  api.station = st;
  g.interaction.add(st, {
    hint: (held) => {
      if (held?.kind === 'toy') return P.packs > 0 ? { key: 'LMB', text: 'Seal it in a blister card', sub: `${P.packs} pack${P.packs === 1 ? '' : 's'} left · sealed figures sell for ${Math.round((PACKED_MULT - 1) * 100)}% more` } : { key: '', icon: 'warning', text: 'Out of blister packs', sub: 'Order packaging supplies' };
      if (held) return null;
      return P.stands > 0 ? { key: 'LMB', text: 'Take an acrylic stand', sub: `${P.stands} left · ${P.packs} blister packs` } : { key: '', text: 'Packing station', sub: `${P.packs} blister packs · no acrylic stands left` };
    },
    use: (held) => {
      if (held?.kind === 'toy') { if (P.packs > 0) packFigure(g, g.held.item); else audio.play('error', { vol: 0.5 }); return false; }
      if (!held && P.stands > 0 && g.held.canTake()) {
        P.stands--;
        const m = standMesh();
        m.position.copy(st.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(-0.1, 0.1, 0));
        g.scene.add(m);
        g.held.take('stand', {}, m);
        audio.play('pickup', { vol: 0.7 });
      }
      return false;
    },
  });

  // ---- acrylic stands in the world
  const spawnStand = (rec, animate = false) => {
    const root = new THREE.Group();
    root.position.set(rec.x, rec.y, rec.z);
    root.rotation.y = rec.rot || 0;
    g.scene.add(root);
    const base = standMesh();
    root.add(base);
    rec.items = rec.items || [null];
    const display = new DisplaySlots(g, root, [{ pos: new THREE.Vector3(0, STAND_TOP, 0), size: [0.1, 0.11, 0.09], plaque: false }], rec.items, { prices: true, plaques: false });
    const s = { rec, root, base, display };
    api.stands.push(s);
    g.interaction.add(base, {
      hint: (held) => (!held && !rec.items[0] ? { key: 'LMB', text: 'Pick up the acrylic stand' } : null),
      use: (held) => {
        if (held || rec.items[0] || !g.held.canTake()) return false;
        g.interaction.remove(base);
        display.dispose();
        root.parent?.remove(root);
        api.stands.splice(api.stands.indexOf(s), 1);
        P.placed.splice(P.placed.indexOf(rec), 1);
        const m = standMesh();
        m.position.copy(root.position);
        g.scene.add(m);
        g.held.take('stand', {}, m);
        audio.play('pickup', { vol: 0.7 });
        g.save();
        return false;
      },
    });
    if (animate) { root.scale.setScalar(0.5); g.tweens.add({ dur: 0.25, update: (k) => root.scale.setScalar(0.5 + 0.5 * k) }); }
    return s;
  };
  for (const rec of P.placed) spawnStand(rec);
  g.constructor.updaters.push(() => { for (const s of api.stands) s.display.update(); });

  const placeStand = () => {
    const hit = g.placement?.surfaceHit?.(2.2);
    if (!hit) { g.news('Aim at a table, a shelf or the floor'); audio.play('error', { vol: 0.4 }); return; }
    const p = hit.point.clone();
    const yaw = Math.atan2(g.camera.position.x - p.x, g.camera.position.z - p.z);
    const rec = { x: p.x, y: p.y, z: p.z, rot: yaw, items: [null] };
    g.held.putTo(p, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), (obj) => {
      obj.parent?.remove(obj);
      P.placed.push(rec);
      spawnStand(rec, true);
      audio.play('place', { pos: p, mat: 'glass', vol: 0.8 });
      g.tip?.('stand', 'Acrylic stand placed', 'Put a figure on it, RMB to give it a price tag');
      g.save();
    }, { dur: 0.3, arc: 0.05, scale: 1 });
  };

  // ---- loose sealed figures (not part of Items: kept in this system's own save key)
  const spawnLoosePack = (rec) => {
    const m = makePackagedMesh(rec.key, rec.finish);
    m.position.set(...rec.p);
    m.rotation.y = rec.r || 0;
    g.scene.add(m);
    g.interaction.add(m, {
      hint: () => (g.held.canTake() ? { key: 'LMB', text: 'Pick up the sealed figure', sub: `${getItem(rec.key)?.name || ''} · ${formatYen(packagedValue(rec.key, rec.finish))}` } : null),
      use: () => {
        if (!g.held.canTake()) return false;
        g.interaction.remove(m);
        P.loose.splice(P.loose.indexOf(rec), 1);
        g.held.take('packaged', { key: rec.key, finish: rec.finish, pack: 'blister' }, m);
        audio.play('pickup', { vol: 0.7 });
        return false;
      },
    });
  };
  for (const rec of P.loose) spawnLoosePack(rec);

  // ---- sell box takes sealed figures
  const sb = g.garage.sellBox, sh = sb?.userData.handler;
  if (sh) {
    const h0 = sh.hint, u0 = sh.use;
    sh.hint = (held, hit) => (held?.kind === 'packaged' ? { key: 'LMB', text: `Sell sealed for ${formatYen(packagedValue(held.data.key, held.data.finish))}`, sub: getItem(held.data.key)?.name } : h0(held, hit));
    sh.use = (held, hit) => {
      if (held?.kind !== 'packaged') return u0(held, hit);
      const value = packagedValue(held.data.key, held.data.finish);
      const target = sb.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.25, 0));
      g.held.putTo(target, new THREE.Quaternion(), (obj) => {
        obj.parent?.remove(obj);
        audio.play('sell', { pos: target, vol: 0.9 });
        g.addMoney(value);
        g.state.stats.sold++;
        g.effects.coinBurst?.({ pos: target.clone().add(new THREE.Vector3(0, 0.1, 0)), count: 8, up: 1.6, spread: 0.6, life: 1.4 });
        g.events.emit('figureSold', { key: held.data.key, finish: held.data.finish, packaged: true, price: value });
        g.save();
      }, { dur: 0.4, arc: 0.18, scale: 0.6 });
      return false;
    };
  }

  // ---- held-item hooks for 'packaged' and 'stand'
  const H = g.held;
  const poseFor = H.poseFor.bind(H), scaleFor = H.scaleFor.bind(H), hint = H.hint.bind(H), drop = H.drop.bind(H), primary = H.primary.bind(H);
  const mine = (it) => it?.kind === 'packaged' || it?.kind === 'stand';
  H.poseFor = (it) => (mine(it) ? 'toy' : poseFor(it));
  H.scaleFor = (it, pose) => (it?.kind === 'packaged' ? 1.5 : it?.kind === 'stand' ? 1.4 : scaleFor(it, pose));
  H.hint = () => {
    const it = H.item;
    if (it?.kind === 'packaged' && !H.busy) return { key: 'Q', text: `Sealed: ${getItem(it.data.key)?.name || ''}`, sub: `Sell box ${formatYen(packagedValue(it.data.key, it.data.finish))} · Q to set it down` };
    if (it?.kind === 'stand' && !H.busy) return { key: 'LMB', text: 'Place the acrylic stand', sub: 'Aim at a table, a shelf or the floor' };
    return hint();
  };
  H.primary = () => { if (H.item?.kind === 'stand' && !H.busy) { placeStand(); return; } primary(); };
  H.drop = () => {
    const it = H.item;
    if (it?.kind === 'stand') { placeStand(); return; }
    if (it?.kind !== 'packaged') return drop();
    const hit = g.placement?.surfaceHit?.(2.2);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(g.camera.quaternion);
    const target = hit && hit.point.y < 1.4 ? hit.point.clone() : g.player.pos.clone().add(new THREE.Vector3(fwd.x, 0, fwd.z).normalize().multiplyScalar(0.6));
    if (!hit) target.y = 0;
    const yaw = Math.atan2(g.camera.position.x - target.x, g.camera.position.z - target.z);
    H.putTo(target, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), (obj, rel) => {
      obj.parent?.remove(obj);
      const rec = { key: rel.data.key, finish: rel.data.finish, p: [target.x, target.y, target.z], r: yaw };
      P.loose.push(rec);
      spawnLoosePack(rec);
      audio.play('place', { vol: 0.7 });
    });
  };

  // items of these kinds that were in your inventory when the game was saved
  (g.state.inventory || []).forEach((it, i) => {
    if (!it || !mine({ kind: it.kind }) || H.slots[i]) return;
    const obj = it.kind === 'stand' ? standMesh() : makePackagedMesh(it.d.key, it.d.finish);
    H.anchor.add(obj);
    obj.visible = i === H.sel;
    H.slots[i] = { kind: it.kind, data: it.d, obj, ent: null };
    if (i === H.sel) { H.pose = 'toy'; H.holdScale = H.scaleFor(H.slots[i]); H.startTrans('toy', 0.01); }
  });
}
