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
import { Pix, FONT_EN } from '../gfx/pix.js';
import { VoxelModel, gloss, glass, metal } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { voxelMaterials } from '../voxel/materials.js';
import { formatYen } from '../core/util.js';
import './gachaSfx.js';

const hex = (s) => parseInt(String(s || '#ffffff').replace('#', ''), 16);
export const PACKED_MULT = 1.3;
export function packagedValue(key, finish = 'normal') { return Math.round((itemValue(key, finish) * PACKED_MULT) / 10) * 10; }

// ------------------------------------------------------------------ meshes
const cardTex = new Map();
function cardTexture(key, finish) {
  const k = key + '|' + finish;
  if (cardTex.has(k)) return cardTex.get(k);
  const it = getItem(key), s = SERIES_BY_ID[it?.series] || {};
  const p = new Pix(64, 90, 4);
  p.fill(hex(s.card?.bg || '#fff6e8'));
  p.rect(0, 0, 64, 16, hex(s.card?.accent || '#e5383b'));
  p.circle(32, 6, 3, 0xf4efe4); p.circle(32, 6, 2, 0x2a2220); // hang hole
  p.tinyText('COLLECTION', 32, 9, { color: 0xffffff, align: 'center' });
  const name = (it?.name || '').toUpperCase();
  const words = name.split(' '), lines = [''];
  for (const w of words) { if ((lines[lines.length - 1] + ' ' + w).trim().length > 11) lines.push(w); else lines[lines.length - 1] = (lines[lines.length - 1] + ' ' + w).trim(); }
  lines.slice(0, 2).forEach((l, i) => p.tinyText(l, 32, 70 + i * 8, { color: hex(s.card?.text || '#2a2220'), align: 'center' }));
  const r = RARITIES[it?.rarity] || RARITIES.common;
  for (let i = 0; i < r.stars; i++) p.tinyText('*', 32 - (r.stars - 1) * 3 + i * 6, 61, { color: hex(r.color), align: 'center' });
  if (finish && finish !== 'normal') p.tinyText(finish.toUpperCase(), 32, 86 - 2, { color: 0xb88a20, align: 'center' });
  const t = p.texture();
  cardTex.set(k, t);
  return t;
}

const bubbleMat = new THREE.MeshPhysicalMaterial({ color: 0xf4fbff, transparent: true, opacity: 0.22, roughness: 0.05, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
/** A figure sealed in a blister card (standing, the card's bottom edge at y = 0, facing +z). */
export function makePackagedMesh(key, finish = 'normal') {
  const g = new THREE.Group();
  const W = 0.072, H = 0.102, D = 0.003;
  const card = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), [
    ...Array(4).fill(new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.9 })),
    new THREE.MeshStandardMaterial({ map: cardTexture(key, finish), roughness: 0.75 }),
    new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 0.9 }),
  ]);
  card.position.y = H / 2;
  card.castShadow = true;
  g.add(card);
  const fig = makeItemMesh(key, finish);
  const sz = fig.geometry.userData.size;
  const sc = Math.min(1, 0.046 / sz.y, 0.056 / Math.max(sz.x, sz.z * 2));
  fig.scale.setScalar(sc);
  fig.position.set(0, 0.03, D / 2 + sz.z * sc / 2 + 0.002);
  fig.castShadow = false;
  g.add(fig);
  const bub = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.054, Math.max(0.018, sz.z * sc + 0.008)), bubbleMat);
  bub.position.set(0, 0.03 + 0.027 - 0.004, D / 2 + bub.geometry.parameters.depth / 2);
  bub.renderOrder = 3;
  bub.userData.noRim = true;
  g.add(bub);
  // a little foot so it stands
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.003, 0.03), new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 0.9 }));
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
