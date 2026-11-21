// Wearable cosmetics as real models: hats, glasses, masks, scarves and bags imported from hand-made CC0 / CC BY models
// (art/lowpix/world/world.json, ids 'wear_*' and a few props worn as hats, converted to the game's pixel-art style by
// tools/lowpix-world.mjs; credits in CREDITS.md). Each piece is fitted onto the wearer once its model is in:
//   wearPiece(fit)  -> THREE.Group  (head units for head pieces, metres for body pieces; empty until the model loads)
//   fit = { m: model id under lowpix/world/, w | h: size (x width | y height, in the anchor's units),
//           y: bottom | cy: centre | yt: top (y), z: centre | zf: front | zb: back (z), x, rx, ry, rz: turn the model first }
// Head units (src/people/cosmetics.js): 1 = a twentieth of the head's height, head bone at the origin, +z = the face,
// crown y 16, hairline 13.2, brows 8, eyes 6, cranium centre z 2.4, face plane z 10.8.
//   wearDress(fit, anchor) / wearPreview(fit, anchor): the { dress, preview } pair a catalogue entry spreads in;
//   anchor: 'head' (on the head group, hair tucked in when the entry has cover) | 'crown' (rides on the hair) | 'eyes'
//   (glasses: y relative to the eye line) | 'side' (a festival mask worn on the side of the head) | 'neck' | 'back'.
//   WEAR_MODELS: every model id, preloaded at boot (src/plugins/wear.js) so thumbnails and the mirror show them at once.
import * as THREE from 'three';
import { asset, assetNow } from '../kit/assets.js';

export const WEAR_MODELS = new Set();
/** 'wear_cap' -> 'lowpix/world/wear_cap'; a full asset id ('lowpix/animals/...') is kept. */
const modelId = (m) => (m.includes('/') ? m : 'lowpix/world/' + m);
const _b = new THREE.Box3(), _s = new THREE.Vector3(), _c = new THREE.Vector3();
const noRay = () => {};

/** A model fitted by `fit` into its parent's units (see the header). */
export function wearPiece(fit) {
  const id = modelId(fit.m);
  WEAR_MODELS.add(id);
  const g = new THREE.Group();
  g.name = 'wear:' + fit.m;
  const place = (t) => {
    const inner = t;
    inner.rotation.set(fit.rx || 0, fit.ry || 0, fit.rz || 0, 'YXZ');
    const wrap = new THREE.Group();
    wrap.add(inner);
    wrap.updateMatrixWorld(true);
    _b.setFromObject(wrap);
    _b.getSize(_s); _b.getCenter(_c);
    const k = fit.w ? fit.w / _s.x : fit.h ? fit.h / _s.y : 1;
    wrap.scale.setScalar(k);
    const ax = _c.x, ay = fit.cy != null ? _c.y : fit.yt != null ? _b.max.y : _b.min.y, az = fit.zf != null ? _b.max.z : fit.zb != null ? _b.min.z : _c.z;
    wrap.position.set((fit.x || 0) - ax * k, (fit.cy ?? fit.yt ?? fit.y ?? 0) - ay * k, (fit.zf ?? fit.zb ?? fit.z ?? 0) - az * k);
    wrap.traverse((o) => { if (o.isMesh) { o.raycast = noRay; o.castShadow = true; o.receiveShadow = true; } });
    g.add(wrap);
    g.userData.ready = true;
  };
  const now = assetNow(id);
  if (now) place(now);
  else asset(id).then(place).catch((e) => console.warn('wear piece failed:', id, e?.message || e));
  return g;
}

/** Where a head piece goes on a dressed human (ctx from dressHuman) or on the thumbnail's display head. */
function mount(c, anchor) {
  if (anchor === 'crown') return c.crown;
  if (anchor === 'eyes') return c.eyes;
  return c.head;
}

/**
 * The { dress, preview } of a catalogue entry drawn with one or more fitted models.
 *   anchor 'head' | 'crown' | 'eyes' | 'side' | 'neck' | 'back'; fits: one fit or a list (pieces of one look)
 */
export function wearItem(anchor, ...fits) {
  return {
    wear: fits.map((f) => modelId(f.m)),
    dress: (c) => {
      for (const f of fits) {
        if (anchor === 'neck' || anchor === 'back' || anchor === 'torso') { bodyPiece(c, anchor, f); continue; }
        const p = wearPiece(f);
        if (anchor === 'side') { // a festival mask pushed to the side of the head
          const off = c.hoodOn || c.hat?.cover;
          p.position.set(off ? 2.2 : 0, 0, 0);
          c.head.add(sideWrap(p));
        } else {
          if (anchor === 'eyes' && (c.hoodOn || c.hat?.cover)) p.position.z = 0.6;
          mount(c, anchor).add(p);
        }
      }
    },
    preview: (add, g, lift) => {
      for (const f of fits) {
        if (anchor === 'neck' || anchor === 'back' || anchor === 'torso') continue;
        const p = wearPiece(f);
        if (anchor === 'side') { g.add(sideWrap(p)); continue; }
        if (anchor === 'crown') p.position.y += lift;
        if (anchor === 'eyes') p.position.y += 6;
        g.add(p);
      }
    },
    thumb: anchor === 'back' ? 'back' : undefined,
  };
}
/** A mask turned to the side of the head (it was the kitsune's spot in the voxel days). */
function sideWrap(p) {
  const s = new THREE.Group();
  s.position.set(7.6, 9.6, 1.2);
  s.rotation.set(-0.15, 1.2, 0.32);
  s.add(p);
  return s;
}
/** Scarves (round the neck) and bags (on the back), in metres on the chest bone, sized to the wearer. */
function bodyPiece(c, anchor, f) {
  const P = c.P, J = c.J, k = (P.H || 1.7) / 1.7;
  const fit = { ...f, w: f.w ? f.w * k : undefined, h: f.h ? f.h * k : undefined };
  if (anchor === 'neck') {
    fit.yt = (f.y ?? 0) * k + P.neckBase - J.chest[1] + (f.lift ?? 0.02) * k; // the knot / collar at the base of the neck
    delete fit.y;
    fit.z = (f.z ?? 0.01) * k;
    delete fit.zf; delete fit.zb;
  } else if (anchor === 'torso') { // worn round the body (the cardboard box costume), centred on the chest
    fit.cy = (f.y ?? 0) * k + P.bustY - J.chest[1];
    fit.z = (f.z ?? 0) * k;
    delete fit.y; delete fit.zf; delete fit.zb;
  } else {
    fit.y = (f.y ?? 0) * k + P.bustY - J.chest[1] - 0.12 * k;
    fit.zf = -P.chestZ - 0.01 * k + (f.z ?? 0) * k;
    delete fit.z; delete fit.zb;
  }
  const p = wearPiece(fit);
  c.b.chest.add(p);
  c.rig.parts.push(p);
}
