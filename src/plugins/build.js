// A shop you furnish (src/build/): the furniture catalogue with features (game.decor), the builder that places,
// turns and moves things (game.builder), cardboard storage boxes, the robot vacuum, the furniture web store, and the
// hooks into the rest of the game (held furniture boxes, delivery boxes, customers tipping and buying gumballs,
// the cat napping on her cushion). Debug: game.buildDebug.
import * as THREE from 'three';
import { Game } from '../game/Game.js';
import { audio } from '../core/audio.js';
import { iconURL } from '../gfx/icons.js';
import { Decor } from '../build/Decor.js';
import { Builder } from '../build/Builder.js';
import { FURNITURE, CATALOGUE, furnitureBox } from '../build/catalogue.js';
import { eatGumball } from '../build/features.js';
import { installFurnitureSite } from '../build/shopSite.js';
import { installInputGate } from '../money/gate.js';
import '../build/build.css';
import '../build/icons.js';
import '../money/sfx.js';

const isFurn = (it) => it?.kind === 'box' && it.data?.type === 'furniture' && !!FURNITURE[it.data.id];

export function install(game) {
  const g = game;
  installInputGate(g);
  const decor = new Decor(g);
  g.decor = decor;
  const builder = new Builder(g, decor);
  g.builder = builder;
  Game.updaters.push((gg, dt) => { builder.update(dt); decor.update(dt); });
  heldHooks(g);
  deliveryHooks(g);
  customerHooks(g);
  catHooks(g);
  starter(g);
  try { installFurnitureSite(g); } catch (e) { console.warn('furniture site', e); }
  g.buildDebug = debug(g);
}

/** Furniture boxes in your hands go to the builder; the gumball is eaten with a click. */
function heldHooks(g) {
  const P = g.placement, H = g.held;
  const hint0 = P.boxHint.bind(P), sec0 = P.boxSecondary.bind(P), prim0 = P.primary?.bind(P);
  P.boxHint = (it) => (isFurn(it) ? g.builder.boxHint(it) : hint0(it));
  P.boxSecondary = (it) => { if (!isFurn(it)) sec0(it); };
  P.primary = (it) => (isFurn(it) ? g.builder.primary(it) : prim0?.(it));
  const hint = H.hint.bind(H), primary = H.primary.bind(H);
  H.hint = () => (H.item?.kind === 'tool' && H.item.data.id === 'gumball' && !H.busy ? { key: 'LMB', text: 'Chew the gumball', sub: 'Q to put it down' } : hint());
  H.primary = () => {
    const it = H.item;
    if (it?.kind === 'tool' && it.data.id === 'gumball' && !H.busy) { H.consume(); eatGumball(g); return; }
    primary();
  };
  // the hotbar shows a carton for furniture boxes
  const hb = g.hotbar;
  if (hb?.iconFor) {
    const iconFor = hb.iconFor.bind(hb);
    hb.iconFor = (it) => (isFurn(it) ? iconURL(FURNITURE[it.data.id].feature === 'storage' ? 'carton' : 'carton', 2) : iconFor(it));
    hb.refresh?.(false);
  }
}

/** Delivery boxes of furniture look like their own carton (or, for a storage box, like the box itself). */
function deliveryHooks(g) {
  const D = g.delivery;
  const meshFor = D.meshFor.bind(D);
  D.meshFor = (data) => (data?.type === 'furniture' && FURNITURE[data.id] ? g.decor.boxMesh(data) : meshFor(data));
  // boxes restored from the save before this plugin existed: swap in the proper meshes
  for (const it of g.held.slots) {
    if (!isFurn(it)) continue;
    const old = it.obj, m = g.decor.boxMesh(it.data);
    m.position.copy(old.position); m.quaternion.copy(old.quaternion); m.scale.copy(old.scale); m.visible = old.visible;
    old.parent?.add(m); old.parent?.remove(old);
    it.obj = m;
  }
  for (const e of [...g.items.list]) {
    if (e.kind !== 'box' || e.data?.type !== 'furniture' || !FURNITURE[e.data.id]) continue;
    const p = e.obj.position.clone(), r = e.obj.rotation.y;
    g.items.destroy(e);
    const ent = g.items.spawnBox(e.data, p, g.decor.boxMesh(e.data));
    ent.obj.rotation.y = r;
  }
}

/** Customers at the machines: happy ones tip, some buy a gumball on the way out. */
function customerHooks(g) {
  g.events.on('machinePlay', ({ machine, customer }) => {
    if (!customer || !machine) return;
    const q = g.sim?.shopQuality?.().score ?? 0.5;
    const from = machine.local ? machine.local(0, 1.1, 0.55) : machine.root.position.clone().add(new THREE.Vector3(0.6, 1.1, 0));
    if (g.decor.byFeature('tipjar').length && Math.random() < 0.08 + 0.22 * q) {
      const amt = [10, 10, 50, 50, 100][Math.floor(Math.random() * 5)];
      g.tweens.wait(2.4, () => g.decor.tip(amt, from));
    }
    const gum = g.decor.nearest('gumball', from);
    if (gum && Math.random() < 0.14) g.tweens.wait(4 + Math.random() * 3, () => gum.feature.customer(gum, g));
  });
}

/** Mikan naps on her cushion now and then. */
function catHooks(g) {
  const S = g.street;
  if (!S?.pickCatTarget || S._decorHooked) return;
  S._decorHooked = true;
  const pick = S.pickCatTarget.bind(S), floor = S.catFloor?.bind(S);
  S.pickCatTarget = (away) => {
    const beds = g.decor.byFeature('catbed').filter((p) => !away || p.root.position.distanceTo(away) > 2);
    if (beds.length && Math.random() < 0.45) { const b = beds[Math.floor(Math.random() * beds.length)]; return b.root.position.clone().setY(0); }
    return pick(away);
  };
  if (floor) S.catFloor = (p) => {
    for (const b of g.decor.byFeature('catbed')) if (Math.hypot(p.x - b.root.position.x, p.z - b.root.position.z) < 0.17) return 0.05;
    return floor(p);
  };
}

/** Every shop starts with Grandpa's piggy bank on the PC desk and his coin tray on the work table. */
function starter(g) {
  const s = g.decor.s;
  if (s.starter) return;
  s.starter = true;
  g.decor.place('piggy_bank', { x: 3.58, y: 0.74, z: -3.38, rot: -Math.PI / 2 - 0.4 }, { animate: false });
  g.decor.place('cash_tray', { x: -0.48, y: 0.78, z: -0.18, rot: 0.25 }, { animate: false });
}

function debug(g) {
  return {
    /** Put a furniture box in your hands (or delivered: deliver = true). */
    give(id = 'tip_jar', deliver = false) {
      const data = furnitureBox(id);
      if (!data) return false;
      if (deliver) { g.delivery.order(data, { delay: 0.2 }); return true; }
      const mesh = g.decor.boxMesh(data);
      mesh.position.copy(g.camera.getWorldPosition(new THREE.Vector3()));
      g.scene.add(mesh);
      return g.held.take('box', data, mesh);
    },
    /** Place a piece directly. */
    place(id, x, z, rot = 0, y = 0, wall = null, st = null) { return !!g.decor.place(id, { x, y, z, rot, wall }, { st, animate: false }); },
    list: () => g.decor.list().map((p) => [p.def.id, +p.data.x.toFixed(2), +p.data.y.toFixed(2), +p.data.z.toFixed(2)]),
    ids: () => CATALOGUE.map((f) => f.id),
    use(id) { const p = g.decor.byFeature(FURNITURE[id]?.feature || id)[0] || g.decor.list().find((q) => q.def.id === id); if (p) g.decor.use(p, g.held.item); return !!p; },
    second(id) { const p = g.decor.list().find((q) => q.def.id === id); if (p?.feature?.secondary) p.feature.secondary(p, g); return !!p; },
    quality: () => [g.decor.quality(), g.sim?.shopQuality?.()],
    sound: (n) => audio.play(n),
  };
}
