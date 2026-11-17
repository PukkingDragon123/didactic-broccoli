// Gacha machines: the layout the game plays on (sizes, where the slot / crank / chute / drawer are) and the assembly
// of the models: lowpix models (art/lowpix/machines/_src/gacha.py -> public/models/lowpix/machines/<type>.glb, loaded
// below before anything builds: their joints are the crank, lid, flap, coin drawer, price buttons and pawl), dressed with
// the pixel-art print decals and the window's clear panes (src/gachakit/voxmachine.js machineDressing). The old voxel
// build (voxmachine.js) is the fallback if a model fails to load, and `?voxelmachines` in the URL forces it.
//   retro     a 1970s countertop coin machine on a fruit crate      standard  a 1990s single-crank floor machine
//   deluxe    a two-tier station (the lower unit shuttered)          royal     the premium machine on its cabinet
// All dimensions in metres, machine-local: front = +z, origin = floor centre.
import * as THREE from 'three';
import { Pix, FONT_EN } from '../gfx/pix.js';
import { BANNER_W, BANNER_H } from '../gfx/banner.js';
import { voxelMachineParts, machineDressing, STYLES } from '../gachakit/voxmachine.js';
import { preloadLP, lpReady, lpMesh, lpPart, LP_MANIFEST } from '../gachakit/lowpix.js';
import { voxelMaterials } from '../voxel/materials.js';
import { activeLogo, paintLogo } from '../logo/logo.js';
import { VoxelModel, metal } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';

const lpCoin = () => !FORCE_VOXEL && lpReady('coins');
const FORCE_VOXEL = typeof location !== 'undefined' && /[?&]voxelmachines\b/.test(location.search);
if (typeof document !== 'undefined' && !FORCE_VOXEL) await preloadLP(['retro', 'standard', 'deluxe', 'royal', 'coins', 'mkey']);
const useLowpix = (type) => !FORCE_VOXEL && lpReady(type);

export const VS = 0.005; // the old models' 5 mm voxel: still the unit of a few offsets in the game logic

export const MACHINE_SPECS = {
  retro: {
    w: 0.34, d: 0.32, lowH: 0.36, caseH: 0.33, capH: 0.04, y0: 0.56, price: 100,
    dial: { x: -0.02, y: 0.215, ring: 0.075, knob: 0.05 }, slot: { dx: 0.082, y: 0.285 },
    outlet: { w: 0.12, y0: 0.025, y1: 0.105 }, tray: { w: 0.17, d: 0.12 },
    dome: { w: 0.24, h: 0.11, d: 0.16 }, style: STYLES.retro,
  },
  standard: {
    w: 0.36, d: 0.34, lowH: 0.37, caseH: 0.38, capH: 0.045, y0: 0.6, price: 300,
    dial: { x: -0.025, y: 0.22, ring: 0.082, knob: 0.055 }, slot: { dx: 0.088, y: 0.29 },
    outlet: { w: 0.13, y0: 0.025, y1: 0.115 }, tray: { w: 0.18, d: 0.13 },
    dome: { w: 0.28, h: 0.13, d: 0.18 }, style: STYLES.standard,
  },
  deluxe: {
    w: 0.4, d: 0.38, lowH: 0.38, caseH: 0.42, capH: 0.05, y0: 0.56, price: 500,
    dial: { x: -0.02, y: 0.215, ring: 0.088, knob: 0.06 }, slot: { dx: 0.1, y: 0.3 },
    outlet: { w: 0.15, y0: 0.025, y1: 0.12 }, tray: { w: 0.2, d: 0.14 },
    dome: { w: 0.32, h: 0.14, d: 0.2 }, style: STYLES.deluxe,
  },
  royal: {
    w: 0.44, d: 0.4, lowH: 0.4, caseH: 0.46, capH: 0.055, y0: 0.52, price: 1000,
    dial: { x: -0.03, y: 0.23, ring: 0.092, knob: 0.062 }, slot: { dx: 0.112, y: 0.315 },
    outlet: { w: 0.16, y0: 0.025, y1: 0.13 }, tray: { w: 0.22, d: 0.15 },
    dome: { w: 0.36, h: 0.16, d: 0.22 }, style: STYLES.royal,
  },
};

/** Machine layout (metres), shared by the models, the game logic and the first-person hands. */
export function layout(spec) {
  const { w, d, y0, lowH, capH } = spec;
  const caseH = spec.caseH;
  const fz = d / 2;
  // the display card hangs at the top front of the window, capsules show below it (like the real ones)
  const bw = Math.min(w - 0.05, spec.caseH * 0.62 * (BANNER_W / BANNER_H));
  const bh = bw * (BANNER_H / BANNER_W);
  const bannerZ = fz - 0.02;
  const caseY0 = y0 + lowH;
  const top = caseY0 + caseH + capH;
  const slot = { x: w / 2 - spec.slot.dx, y: y0 + spec.slot.y, z: fz + 0.012 };
  const O = { x0: -spec.outlet.w / 2, x1: spec.outlet.w / 2, y0: y0 + spec.outlet.y0, y1: y0 + spec.outlet.y1, z: fz };
  return {
    ...spec,
    caseH, ext: 0,
    h: lowH + caseH + capH,
    front: fz,
    caseY0,
    window: { x0: -w / 2 + 0.016, x1: w / 2 - 0.016, y0: caseY0 + 0.004, y1: caseY0 + caseH - 0.006, z0: -fz + 0.02, z1: bannerZ - 0.008 },
    banner: { w: bw, h: bh, x: 0, y: caseY0 + caseH - 0.014 - bh / 2, z: bannerZ },
    handle: { x: spec.dial.x, y: y0 + spec.dial.y, z: fz + VS * 2, r: spec.dial.knob },
    slot,
    // price plate under the coin mech, its -/+ buttons below it
    plate: { x: slot.x, y: slot.y - 0.07, w: 0.068, h: 0.03, z: fz + VS * 2 },
    buttons: { y: slot.y - 0.106, dx: 0.02 },
    outlet: O,
    // coin box: a locked drawer to the right of the chute
    coinBox: { x0: O.x1 + 0.016, x1: w / 2 - 0.018, y0: y0 + 0.02, y1: y0 + spec.outlet.y1 + 0.005, z: fz, depth: 0.11 },
    tray: { x0: -spec.tray.w / 2, x1: spec.tray.w / 2, z0: fz - 0.02, z1: fz + spec.tray.d, y: y0 + spec.outlet.y0 - 0.005, wall: 0.035 },
    hook: { x: w / 2 + 0.012, y: y0 + spec.dial.y + 0.02, z: fz - 0.05 },
    // lid hinge (back top edge of the window)
    lid: { y: caseY0 + caseH, z: -fz - VS, h: capH, lockX: w * 0.22 },
    dome: { ...spec.dome, y: top, z: -0.01 },
    top,
    domeTop: top + spec.dome.h + 0.012,
  };
}

const fontsThen = (fn) => { try { document.fonts?.load('16px "DotGothic16"', '1回円売切').then(fn, () => {}); } catch { /* no font loading */ } };

/**
 * The price plate: an enamel card in the plate's bezel, 1回 and the price in big figures, the recommended price small
 * under it. Returns { texture, draw(price, rec) } (a live texture, one per machine).
 */
export function pricePlate(type) {
  const st = MACHINE_SPECS[type].style, W = 136, H = 60;
  const p = new Pix(W, H, 5);
  const tex = p.texture();
  const bg = st.dark ? 0x1a181c : 0xfbf6e8, ink = st.dark ? st.accent : 0xc8262c, sub = st.dark ? 0xb8a878 : 0x5a5450;
  let last = null;
  const draw = (price, rec = null) => {
    last = [price, rec];
    p.fill(bg);
    p.frame(0, 0, W, H, st.dark ? st.accent : 0x8a8478); p.frame(2, 2, W - 4, H - 4, st.dark ? 0x3a3438 : 0xe0d8c4);
    // the shop's own logo stamped in the corner once the player has drawn one (src/logo/logo.js)
    const L = activeLogo();
    if (L.custom) { paintLogo(p, 6, 4, 16, { L }); p.text('1回', 6, 21, { size: 16, color: sub }); } else p.text('1回', 6, 12, { size: 16, color: sub });
    const s = `¥${price}`, w = p.measure(s, 32, FONT_EN);
    p.text(s, Math.round(W - 8 - w), 2, { size: 32, color: ink, font: FONT_EN });
    p.rect(4, 40, W - 8, 1, st.dark ? 0x3a3438 : 0xd8d0bc);
    if (rec) p.tinyText(`REC ¥${rec}`, W / 2, 45, { color: price > rec * 1.25 ? 0xd8482a : price < rec * 0.8 ? 0xb8860a : sub, align: 'center' });
    else p.tinyText('PRICE PER TURN', W / 2, 45, { color: sub, align: 'center' });
    p.flush();
    tex.needsUpdate = true;
  };
  fontsThen(() => { if (last) draw(...last); });
  return { texture: tex, draw };
}

const numCache = new Map();
/** The machine's number plate on the lid. */
function numberPlate(no) {
  if (numCache.has(no)) return numCache.get(no);
  const p = new Pix(72, 24, 4);
  p.fill(0xfbf8f0); p.frame(0, 0, 72, 24, 0x6a6a66); p.frame(1, 1, 70, 22, 0xd8d4c8);
  p.text(`No.${String(no).padStart(3, '0')}`, 36, 3, { size: 16, color: 0x2a2428, align: 'center', font: FONT_EN });
  const t = p.texture();
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 });
  numCache.set(no, m);
  return m;
}

const sideMats = new Map();
/** The flank print's material (public/img/machines/side_<type>.png, nearest-filtered). */
function sideMat(type) {
  if (!sideMats.has(type)) {
    const t = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}img/machines/side_${type}.png`);
    t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
    sideMats.set(type, new THREE.MeshStandardMaterial({ map: t, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  }
  return sideMats.get(type);
}

// ----------------------------------------------------------------------------- clear plastic (older callers)
const glassMats = new Map();
export function clearPlastic(tint = 0xf6fbff, opacity = 0.12) {
  const k = tint + ':' + opacity;
  if (!glassMats.has(k)) glassMats.set(k, new THREE.MeshStandardMaterial({ color: tint, transparent: true, opacity, roughness: 0.3, envMapIntensity: 0.8, depthWrite: false, side: THREE.DoubleSide }));
  return glassMats.get(k);
}

// ----------------------------------------------------------------------------- assembly
/**
 * Build the meshes for a machine type. opts: { no (machine number), banner (Texture) }.
 * Returns { group, L, body, bannerMesh, bannerHolder, domeAnchor, lid, lidPivot, drawer, coinAnchor, flapPivot,
 *   handleGroup, handlePivot, plate: { mesh, draw }, buttons: { minus, plus }, glassParts, mats }
 * Parts the game tells apart carry userData.part: 'lid', 'coinbox', 'plate', 'priceUp', 'priceDown', 'handle'.
 */
export function buildMachineModel(type, opts = {}) {
  const spec = MACHINE_SPECS[type], L = layout(spec);
  const lp = useLowpix(type);
  const P = lp ? null : voxelMachineParts(type, spec, L);
  const standBox = lp ? LP_MANIFEST[type].standBox : P.stand;
  const Gm = lp ? machineDressing(type, spec, L, standBox) : P.geo, M = lp ? Gm.mats : P.mats;
  const group = new THREE.Group();
  const mesh = (geo, mat = M.body, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = true; return m; };
  // a moving part: the lowpix model's joint (its geometry in the joint's frame), or the voxel part
  const part = (joint, voxGeo, shadow = true) => (lp ? Object.assign(lpMesh(type, joint), { castShadow: shadow }) : mesh(voxGeo, M.body, shadow));
  const print = (geo) => { const m = mesh(geo, M.print, false); m.userData.noRim = true; m.raycast = () => {}; return m; };
  const plane = (w, h, mat) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.userData.noRim = true; m.castShadow = false; m.receiveShadow = true; return m; };
  // everything that never moves: the stand, the lower unit, the window's frame, the tray, the fine chrome parts
  let body;
  if (lp) { body = new THREE.Group(); body.name = 'machine-body'; body.add(lpMesh(type, 'body'), lpMesh(type, 'stand')); } else body = mesh(Gm.body);
  group.add(body, print(Gm.bodyPrint));
  // the maker's side print, one quad on each flank (UVs 0..1: public/img/machines/side_<type>.png, a slot for print art)
  const SQ = lp && LP_MANIFEST[type].sideQuad;
  if (SQ) {
    const m = sideMat(type), w = SQ.z1 - SQ.z0, h = SQ.y1 - SQ.y0;
    for (const sx of [-1, 1]) {
      const q = print(new THREE.PlaneGeometry(w, h));
      q.material = m;
      q.position.set(sx * SQ.x, (SQ.y0 + SQ.y1) / 2, (SQ.z0 + SQ.z1) / 2);
      q.rotation.y = sx * Math.PI / 2;
      group.add(q);
    }
  }
  const glass = mesh(Gm.glass, M.glass, false);
  glass.renderOrder = 3; glass.userData.noRim = true; glass.raycast = () => {};
  group.add(glass);
  // the display card in its rails (GachaMachine sets the series' card; it slides up out of the open top to swap)
  const bannerMat = new THREE.MeshStandardMaterial({ map: opts.banner || null, color: opts.banner ? 0xffffff : 0xdddddd, roughness: 0.6 });
  const bannerHolder = new THREE.Group();
  bannerHolder.position.set(L.banner.x, L.banner.y, L.banner.z + 0.0005);
  const bannerMesh = plane(L.banner.w, L.banner.h, bannerMat);
  bannerHolder.add(bannerMesh);
  group.add(bannerHolder);
  // the lid on its hinge: the header sign, the lock, the number plate
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, L.lid.y, L.lid.z);
  group.add(lidPivot);
  const lid = new THREE.Group();
  lid.position.set(0, 0, -L.lid.z);
  lidPivot.add(lid);
  const lidMesh = part('lid', P?.geo.lid);
  lidMesh.userData.part = 'lid';
  const lidPrint = print(Gm.lidPrint);
  lidPrint.userData.part = 'lid';
  (lp ? lidPivot : lid).add(lidMesh); // (the lowpix lid is modelled round its hinge)
  lid.add(lidPrint);
  const num = plane(0.05, 0.017, numberPlate(opts.no || 1));
  num.position.set((L.lid.lockX + 0.014 + spec.w / 2 - 0.006) / 2, spec.capH / 2, spec.d / 2 + 0.0025 + 0.0008);
  num.userData.part = 'lid';
  lid.add(num);
  const D = L.dome;
  const domeAnchor = new THREE.Group();
  domeAnchor.position.set(0, spec.capH + 0.0125, D.z);
  lid.add(domeAnchor);
  // the coin box drawer
  const CB = L.coinBox;
  const drawer = new THREE.Group();
  drawer.position.set(CB.x0, CB.y0, CB.z);
  const drawerMesh = part('drawer', P?.geo.drawer);
  drawerMesh.userData.part = 'coinbox';
  const drawerPrint = print(Gm.drawerPrint);
  drawer.add(drawerMesh, drawerPrint);
  const coinAnchor = new THREE.Group(); // coins pile up in here
  coinAnchor.position.set(VS * 2, VS, -CB.depth + VS * 2);
  drawer.add(coinAnchor);
  group.add(drawer);
  // the crank
  const handleGroup = new THREE.Group();
  handleGroup.position.set(L.handle.x, L.handle.y, L.handle.z);
  const handle = part('crank', P?.geo.handle);
  handle.userData.part = 'handle';
  const hpiv = new THREE.Group();
  hpiv.add(handle);
  handleGroup.add(hpiv);
  group.add(handleGroup);
  // the ratchet's pawl on the bezel: it rides each tooth of the crank
  const pawl = part('pawl', P?.geo.pawl, false);
  const pa = 0.9, pr = spec.dial.knob + 0.008;
  pawl.position.set(L.handle.x + Math.cos(pa) * pr, L.handle.y + Math.sin(pa) * pr, L.front + 0.005);
  pawl.rotation.z = pa - Math.PI / 2;
  pawl.userData.rest = pawl.rotation.z;
  group.add(pawl);
  // the flap over the chute
  const O = L.outlet;
  const flapPivot = new THREE.Group();
  flapPivot.position.set(0, O.y1 - VS, L.front + VS * 0.5);
  const flap = part('flap', P?.geo.flap, false);
  if (!lp && Gm.flapClear) flap.renderOrder = 3;
  flapPivot.add(flap);
  group.add(flapPivot);
  // the price plate and its buttons
  const pp = pricePlate(type);
  const plateMesh = plane(L.plate.w, L.plate.h, new THREE.MeshStandardMaterial({ map: pp.texture, roughness: 0.55 }));
  plateMesh.position.set(L.plate.x, L.plate.y, L.front + 0.004);
  plateMesh.userData.part = 'plate';
  group.add(plateMesh);
  const minus = part('btn_minus', P?.geo.btnMinus, false), plus = part('btn_plus', P?.geo.btnPlus, false);
  minus.position.set(L.plate.x - L.buttons.dx, L.buttons.y, L.front);
  plus.position.set(L.plate.x + L.buttons.dx, L.buttons.y, L.front);
  minus.userData.part = 'priceDown'; plus.userData.part = 'priceUp';
  group.add(minus, plus);
  return {
    group, L, body, stand: body, bannerMesh, bannerHolder, domeAnchor, lid, lidPivot, drawer, coinAnchor, flapPivot, handleGroup, handlePivot: hpiv,
    plate: { mesh: plateMesh, draw: pp.draw }, buttons: { minus, plus }, glassParts: [glass], tray: body, mats: M, pawl, standBox, lowpix: lp,
  };
}

/** Handle (dev viewers): the crank on its own. */
export function buildHandle(r, type = 'standard') {
  if (useLowpix(type)) { const g = new THREE.Group(); g.add(lpMesh(type, 'crank')); return g; }
  const spec = MACHINE_SPECS[type], P = voxelMachineParts(type, spec, layout(spec));
  const m = new THREE.Mesh(P.geo.handle, P.mats.body);
  m.castShadow = true;
  const g = new THREE.Group();
  g.add(m);
  return g;
}

/** Kept for older callers: cases no longer grow (capacity upgrades are gone). */
export function caseExtension() { return 0; }

/** Fake coin on the owner's test rope (brass token with a hole, like a 5-yen coin). */
let coinGeo = null, coinMat = null;
export function makeCoin() {
  if (lpCoin()) { const m = lpMesh('coins', 'yen5'); m.castShadow = true; return m; } // the lowpix brass token
  if (!coinGeo) {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, 0.0115, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, 0.0028, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    coinGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.0012, bevelEnabled: true, bevelThickness: 0.0003, bevelSize: 0.0004, bevelSegments: 1, curveSegments: 8 });
    coinGeo.center();
    coinMat = new THREE.MeshStandardMaterial({ color: 0xe0b860, metalness: 1, roughness: 0.3, envMapIntensity: 1.8 });
  }
  const m = new THREE.Mesh(coinGeo, coinMat);
  m.castShadow = true;
  return m;
}

/**
 * A ¥100 coin lying flat, centred (Ø22.6 mm): the lowpix coin (art/lowpix/machines/_src/held.py), or the old voxel
 * disc if the model is missing. Shared geometry for coin piles; draw it with yenCoinMaterial().
 */
export function yenCoinMaterial() { return lpCoin() ? lpPart('coins', 'yen100').material : voxelMaterials('normal'); }
let yenGeo = null;
export function yenCoinGeometry() {
  if (!yenGeo && lpCoin()) yenGeo = lpPart('coins', 'yen100').geometry;
  if (!yenGeo) {
    const v = new VoxelModel();
    v.jitter = 0;
    for (let x = -4; x < 4; x++) for (let z = -4; z < 4; z++) {
      const d = Math.hypot(x + 0.5, z + 0.5);
      if (d > 4.1) continue;
      v.set(x, 0, z, metal(d > 3.2 ? 0xd4d6da : 0xe8eaee));
      if (d < 2.4 && ((x + z) & 1)) v.set(x, 0, z, metal(0xc8cace)); // the stamped "100"
    }
    yenGeo = meshVoxels(v, { voxelSize: 0.0029, origin: 'center' });
  }
  return yenGeo;
}

