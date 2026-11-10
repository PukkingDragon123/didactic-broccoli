// Wearable cosmetics for the humans: detailed hats, hoods, glasses and costume parts (modelled in src/peoplekit) that ride on
// the skeleton (head / chest / spine / hips / hand bones), plus the spec tweaks an outfit needs (onesie colours,
// a hood trims the hair). Head pieces are modelled once in 'head units' (1 voxel = 1/20 of the head height, head
// bone at the origin, +z = the face, +x = the wearer's left) and scaled per human; body pieces are sized from the
// human's proportions (the models: src/peoplekit/base.js). Cheap secondary motion: dino tail, chicken comb / head / wings, pompoms, bear ears.
//   applyCosmeticSpec(spec, look)      before building the Human (outfit colours, hair under hoods)
//   dressHuman(h, look)                attach the pieces; wraps h.update (animation) and h.dispose
//   cosmeticPreview(id)                an Object3D for thumbnails (mannequin head + the hat / glasses)
// look = { hat, outfit, face, bag, shoes } (cosmetic ids or null).
// More catalogue entries are registered by src/cosmetics/catalog.js: they bring their own spec(spec, look) (painted
// clothes, hats, glasses, bags, shoes), dress(ctx) (modelled parts, see dressHuman) and preview(add) (thumbnails).
import * as THREE from 'three';
import { meshVoxels } from '../voxel/mesher.js';
import { voxelMaterials } from '../voxel/materials.js';
import { hex } from './paintlib.js';
import { BASE } from '../peoplekit/base.js';
import { materialsFor } from '../peoplekit/kit.js';

export const SLOTS = [
  { id: 'hat', name: 'Hats', icon: 'cos_hat' },
  { id: 'outfit', name: 'Outfits', icon: 'cos_shirt' },
  { id: 'face', name: 'Face', icon: 'cos_glasses' },
  { id: 'bag', name: 'Bags', icon: 'cos_bag' },
  { id: 'shoes', name: 'Shoes', icon: 'cos_shoe' },
];

// colours shared between the painted suit and its voxel parts
const DINO = 0x5fb64a, DINO_D = 0x3f8c36, DINO_BELLY = 0xf0dc9c;
const BANANA = 0xf6d43c, BANANA_SPOT = 0x7a5a26;

/**
 * The catalogue. slot: hat | outfit | face. cover: a hat that covers the whole head (hair is trimmed, an outfit's
 * hood is hidden). hood: an outfit with a hood. price in yen.
 */
export const COSMETICS = [
  // ---- outfits
  { id: 'dino', slot: 'outfit', name: 'Dino Onesie', price: 2500, hood: true, desc: 'Rawr. Comes with a toothy hood, back spikes and a very waggy tail.' },
  { id: 'banana', slot: 'outfit', name: 'Banana Suit', price: 1800, hood: true, desc: 'A-peel-ing in every way. Ripe, spotty, unforgettable.' },
  { id: 'happi', slot: 'outfit', name: 'Festival Happi', price: 1200, desc: 'Indigo summer festival coat with a red collar and a hachimaki band.' },
  { id: 'box', slot: 'outfit', name: 'Box Robot', price: 500, desc: 'Grandpa\'s old delivery box, upcycled. Beep boop.' },
  // ---- hats
  { id: 'chicken', slot: 'hat', name: 'Chicken Hat', price: 800, desc: 'A whole hen, nesting on your head. She has opinions.' },
  { id: 'shark', slot: 'hat', name: 'Shark Hood', price: 1200, cover: true, desc: 'Gets eaten by a shark, looks great doing it.' },
  { id: 'frog', slot: 'hat', name: 'Kero Frog Cap', price: 600, cover: true, desc: 'Big googly eyes. Ribbit.' },
  { id: 'bear', slot: 'hat', name: 'Bear Hood', price: 900, cover: true, desc: 'Fluffy round ears for cold evenings.' },
  { id: 'cone', slot: 'hat', name: 'Traffic Cone', price: 300, cover: true, desc: 'Found it by the road. Totally official.' },
  { id: 'party', slot: 'hat', name: 'Party Hat', price: 200, desc: 'Every day is somebody\'s birthday.' },
  { id: 'bow', slot: 'hat', name: 'Giant Bow', price: 450, desc: 'Polka dots. Maximum cute.' },
  { id: 'nigiri', slot: 'hat', name: 'Salmon Nigiri', price: 700, desc: 'Fresh from the conveyor belt.' },
  // ---- face
  { id: 'shades', slot: 'face', name: 'Cool Shades', price: 350, desc: 'Instantly 40% cooler.' },
  { id: 'stars', slot: 'face', name: 'Star Glasses', price: 500, desc: 'For superstars and party animals.' },
  { id: 'groucho', slot: 'face', name: 'Disguise Kit', price: 400, desc: 'Nose, glasses, moustache. Nobody will know.' },
  { id: 'kitsune', slot: 'face', name: 'Fox Mask', price: 900, desc: 'A festival kitsune mask, worn on the side of the head.' },
];
export const COSMETIC_BY_ID = Object.fromEntries(COSMETICS.map((c) => [c.id, c]));

// ------------------------------------------------------------------ the models (src/peoplekit: smooth, detailed)
// Builders return a BufferGeometry from the people kit (head units unless noted); a VoxelModel is still accepted.
const _geos = new Map();
/** Geometry of a model, translated by -pivot (model units), cached per key. */
function cached(key, build, pivot = [0, 0, 0]) {
  let g = _geos.get(key);
  if (!g) {
    const m = build();
    if (m?.isBufferGeometry) { g = m; if (pivot[0] || pivot[1] || pivot[2]) g.translate(-pivot[0], -pivot[1], -pivot[2]); g.computeBoundingSphere(); }
    else { g = meshVoxels(m, { voxelSize: 1, origin: 'none' }); g.translate(-0.5 - pivot[0], -0.5 - pivot[1], -0.5 - pivot[2]); g.computeBoundingSphere(); }
    _geos.set(key, g);
  }
  return g;
}
const H = {
  dinoHood: BASE.dinoHood, bananaHood: BASE.bananaHood, happiBand: BASE.happiBand, sharkHood: BASE.sharkHood,
  bearHood: BASE.bearHood, bearEar: BASE.bearEar, frogCap: BASE.frogCap, cone: BASE.cone, party: BASE.party,
  pompom: BASE.pompom, bow: BASE.bow, nigiri: BASE.nigiri, chickenBody: BASE.chickenBody, chickenHead: BASE.chickenHead,
  chickenComb: BASE.chickenComb, chickenWing: BASE.chickenWing, shades: BASE.shades, stars: BASE.stars,
  groucho: BASE.groucho, kitsune: () => BASE.kitsune(), cord: BASE.cord,
};
/** The built-in models (the kitsune mask, the hoods...), for catalogue entries that reuse one. */
export const MODELS = H;
const mannequin = BASE.mannequin;

// ------------------------------------------------------------------ per-human body pieces (metric: V = height / 140)
const spike = (size) => BASE.spike(size);
const tailSeg = (len, r0, r1, spikeH) => BASE.tailSeg(len, r0, r1, spikeH);
function boxCostume(P) {
  const V = P.H / 140;
  const X = Math.round((P.bustX + 0.024) / V), Zf = Math.round((P.chestZ + P.bust * 0.6 + P.belly * 0.7 + 0.03) / V), Zb = -Math.round((P.chestZ + 0.034) / V);
  const Y0 = Math.round((P.hipY - 0.01 * P.H - P.waistY) / V), Y1 = Math.round((P.shoulderY + 0.012 * P.H - P.waistY) / V);
  return { v: BASE.box(X, Y0, Y1, Zb, Zf), V };
}

// ------------------------------------------------------------------ spec tweaks
/** Change a fresh spec for the equipped look (call before new Human(spec)). */
export function applyCosmeticSpec(spec, look = {}) {
  const hat = COSMETIC_BY_ID[look.hat], out = COSMETIC_BY_ID[look.outfit];
  if (out?.id === 'dino' || out?.id === 'banana') {
    const dino = out.id === 'dino';
    spec.top = { kind: 'onesie', col: hex(dino ? DINO : BANANA), col2: dino ? hex(DINO_BELLY) : null, spots: dino ? hex(DINO_D) : hex(BANANA_SPOT), spotK: dino ? 0.7 : 0.95, spotF: dino ? 34 : 70, spotT: dino ? 0.72 : 0.83 };
    spec.bottom = { kind: 'slacks', col: hex(dino ? DINO : BANANA), noCrease: true };
    spec.legs = 'skin'; spec.socks = null;
    spec.shoes = dino ? { kind: 'comfort', col: hex(DINO_D) } : { kind: 'sneaker', col: hex(0x6a4a24), col2: hex(BANANA) };
    spec.acc = spec.acc.filter((a) => a.kind === 'camera');
  } else if (out?.id === 'happi') {
    spec.top = { kind: 'happi', col: hex(0x2a3f78), col2: hex(0xc8302a), col3: hex(0xf4f0e4), sleeve: 'mid' };
    spec.acc = spec.acc.filter((a) => a.kind !== 'backpack' && a.kind !== 'randoseru');
  } else if (out?.id === 'box') spec.acc = spec.acc.filter((a) => !['backpack', 'randoseru', 'shoulderbag', 'tote', 'camera', 'apron'].includes(a.kind));
  else if (out?.spec) out.spec(spec); // catalogue entries that bring their own look (thrift tees, src/market/thrift.js)
  // anything covering the whole head tucks the hair in (only the hair below the band stays)
  if (hat?.cover || out?.hood) spec.hat = { kind: 'hood' };
  else if (hat) spec.hat = null;
  if (look.face) spec.glasses = null;
  // the other slots' catalogue entries that paint the body (painted hats, glasses, bags, shoes)
  for (const c of [hat, COSMETIC_BY_ID[look.face], COSMETIC_BY_ID[look.bag], COSMETIC_BY_ID[look.shoes]]) if (c?.spec && !(c === hat && out?.hood)) c.spec(spec, look);
  return spec;
}

/** Hair height above the crown in head units (hats that sit on top of the hair are lifted by this). */
function hairLift(spec) {
  if (spec.hat) return 0;
  const st = spec.hair.style, vol = spec.hair.volume || 1;
  const th = { buzz: 0.016, short: 0.05 * vol, sidepart: 0.05 * vol, messy: 0.07, mushroom: 0.07, bowl: 0.05, bob: 0.055 * vol, long: 0.055 * vol, perm: 0.1, bald: 0 }[st] ?? 0.035 * vol;
  return th * 0.9 * 20;
}

// ------------------------------------------------------------------ dressing a human
const mesh = (geo) => { const m = new THREE.Mesh(geo, geo.userData.kit ? materialsFor(geo) : voxelMaterials('normal')); m.castShadow = true; m.receiveShadow = true; m.raycast = () => {}; return m; };
const pivotGroup = (p, child) => { const g = new THREE.Group(); g.position.set(p[0], p[1], p[2]); if (child) g.add(child); return g; };

/**
 * Attach the voxel pieces of `look` to h's bones and start their secondary motion. Returns the rig
 * ({ parts, update(dt), dispose() }); h.update and h.dispose are wrapped to drive / clean it up.
 */
export function dressHuman(h, look = {}) {
  const P = h.P, J = h.J, b = h.b, spec = h.spec;
  const hu = P.hu, U = hu / 20;
  const kx = P.hw / (0.335 * hu), kz = P.hd / (0.42 * hu);
  const rig = { h, parts: [], anims: [], t: Math.random() * 10 };
  const hat = COSMETIC_BY_ID[look.hat], out = COSMETIC_BY_ID[look.outfit], face = COSMETIC_BY_ID[look.face];
  const bag = COSMETIC_BY_ID[look.bag], shoes = COSMETIC_BY_ID[look.shoes];
  // head rig in head units
  const head = new THREE.Group();
  head.name = 'cosmetics:head';
  head.scale.set(U * kx, U, U * kz);
  b.head.add(head);
  rig.parts.push(head);
  const eyeY = (P.eyeY - J.head[1]) / U; // ~6 for adults
  const lift = hairLift(spec);
  const hoodOn = out?.hood && !hat?.cover;
  const crown = new THREE.Group(); crown.position.y = hoodOn ? 3 : lift; head.add(crown);
  const eyes = new THREE.Group(); eyes.position.y = eyeY; head.add(eyes);
  const add = (parent, key, build, pivot = [0, 0, 0]) => { const m = mesh(cached(key, build, pivot)); const g = pivotGroup(pivot, m); parent.add(g); return g; };

  // ---- outfit
  if (out?.id === 'dino') {
    if (hoodOn) add(head, 'dinoHood', H.dinoHood);
    // spikes down the back + the tail
    const V = P.H / 140;
    const body = (bone, y, z, size) => { const s = add(b[bone], 'spike' + size, () => spike(size)); s.position.set(0, y, z); s.scale.setScalar(V); rig.parts.push(s); };
    const chestBack = (y) => -(P.chestZ * (0.92 - 0.1 * (y - P.waistY) / (P.shoulderY - P.waistY))) - 0.004;
    for (const [f, s] of [[0.86, 4], [0.52, 5], [0.18, 5]]) { const y = P.waistY + (P.shoulderY - P.waistY) * f; body('chest', y - J.chest[1], chestBack(y), s); }
    body('spine', (P.waistY + P.pelvisY) / 2 - J.spine[1], -P.waistZ - 0.006, 4);
    const tail = new THREE.Group();
    tail.position.set(0, P.hipY + 0.03 * P.H - J.hips[1], -P.hipsZ - 0.012);
    tail.scale.setScalar(V);
    b.hips.add(tail); rig.parts.push(tail);
    const segs = [[11, 5.2, 4.3, 2], [10, 4.3, 3.3, 3], [9, 3.3, 2.3, 2], [8, 2.3, 1.0, 0]];
    let parent = tail;
    const chain = [];
    segs.forEach(([len, r0, r1, sp], i) => {
      const g = add(parent, `tail${i}`, () => tailSeg(len, r0, r1, sp));
      if (i) g.position.set(0, 0, -segs[i - 1][0]);
      chain.push({ g, a: 0, v: 0, p: 0, pv: 0, base: i === 0 ? -0.62 : 0.2 + i * 0.04 });
      parent = g;
    });
    rig.anims.push({ kind: 'tail', chain });
  } else if (out?.id === 'banana') {
    if (hoodOn) add(head, 'bananaHood', H.bananaHood);
  } else if (out?.id === 'happi') {
    if (!hat?.cover) add(head, 'happiBand', H.happiBand);
  } else if (out?.id === 'box') {
    const { v, V } = boxCostume(P);
    const key = `box:${Math.round(P.H * 100)}:${Math.round(P.bustX * 1000)}:${Math.round((P.bust + P.belly) * 1000)}`;
    const g = add(b.chest, key, () => v);
    g.scale.setScalar(V);
    rig.parts.push(g);
  }
  // ---- hat
  if (hat) {
    const id = hat.id;
    if (id === 'shark') add(head, 'sharkHood', H.sharkHood);
    else if (id === 'bear') {
      add(head, 'bearHood', H.bearHood);
      const ears = [-1, 1].map((sx) => { const e = add(head, 'bearEar' + sx, () => H.bearEar(sx)); e.position.set(sx * 6.4, 16.2, 0.6); e.rotation.z = -sx * 0.25; return e; });
      rig.anims.push({ kind: 'ears', ears, t: 2 + Math.random() * 4, w: 0 });
    } else if (id === 'frog') add(head, 'frogCap', H.frogCap);
    else if (id === 'cone') add(head, 'cone', H.cone);
    else if (id === 'party') {
      const p = add(crown, 'party', H.party); p.position.set(2, 15.4, 1.6); p.rotation.set(-0.12, 0, -0.32);
      const pom = add(p, 'pompom', H.pompom); pom.position.set(0, 14, 0);
      rig.anims.push({ kind: 'bob', g: pom, x: 0, z: 0, vx: 0, vz: 0, amp: 0.9, base: p });
    } else if (id === 'bow') { const g = add(crown, 'bow', H.bow); g.position.set(2.6, 17, 3); g.rotation.set(-0.35, 0.1, -0.22); }
    else if (id === 'nigiri') { const g = add(crown, 'nigiri', H.nigiri); g.position.set(0, 15.4, 1.6); g.rotation.set(-0.06, 0.08, 0); }
    else if (id === 'chicken') {
      add(crown, 'chickenBody', H.chickenBody);
      const hd = add(crown, 'chickenHead', H.chickenHead, [0, 23.5, 5.5]);
      const comb = add(hd, 'chickenComb', H.chickenComb, [0, 29, 6.6]);
      comb.position.sub(hd.position);
      const wings = [-1, 1].map((sx) => add(crown, 'chickenWing' + sx, () => H.chickenWing(sx), [sx * 5.4, 23, 1]));
      rig.anims.push({ kind: 'chicken', head: hd, comb, wings, t: 1, yaw: 0, yawT: 0, peck: 0, flap: 0, flapT: 4 + Math.random() * 5, cx: 0, cz: 0, vx: 0, vz: 0 });
    }
  }
  // ---- face
  if (face) {
    if (face.id === 'kitsune') {
      const k = add(head, 'kitsune', H.kitsune);
      k.position.set(hoodOn || hat?.cover ? 9.6 : 7.4, 10.5, 1.2);
      k.rotation.set(-0.15, 1.2, 0.32);
      if (!hoodOn && !hat?.cover) add(head, 'cord', H.cord);
    } else if (H[face.id]) {
      const g = add(eyes, face.id, H[face.id]);
      g.position.z = hoodOn || hat?.cover ? 0.6 : 0;
    }
  }
  // ---- catalogue entries with voxel parts of their own (src/cosmetics/catalog.js)
  const ctx = { h, P, J, b, spec, U, kx, kz, head, crown, eyes, add, rig, hoodOn, hat, out, face, bag, shoes, lift, eyeY, mesh, pivotGroup };
  for (const c of [out, hat, face, bag, shoes]) if (c?.dress) { try { c.dress(ctx); } catch (e) { console.warn('cosmetic', c.id, e); } }
  // ---- peace-sign fingers (shown by gestures that ask for them: pose.vsign = 'L' | 'R' | 'LR')
  const sk = spec.skin;
  const skinMat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(sk[0] / 255 * 0.92, sk[1] / 255 * 0.9, sk[2] / 255 * 0.9, THREE.SRGBColorSpace), roughness: 0.85 });
  rig.vsign = ['L', 'R'].map((s) => {
    const g = new THREE.Group(), jh = J['hand' + s], Hh = P.H;
    for (const [dz, a] of [[0.01, -0.26], [-0.004, 0.18]]) {
      const f = new THREE.Mesh(fingerGeo(), skinMat);
      f.scale.set(0.0085 * Hh, 0.052 * Hh, 0.0085 * Hh);
      f.position.set(0, P.tipY + 0.03 * Hh - jh[1], 0.004 * Hh + dz * Hh - jh[2]);
      f.rotation.x = a;
      f.castShadow = true;
      f.raycast = () => {};
      g.add(f);
    }
    g.visible = false;
    b['hand' + s].add(g);
    rig.parts.push(g);
    return g;
  });
  rig.update = (dt) => updateRig(rig, dt);
  rig.dispose = () => { for (const p of rig.parts) p.removeFromParent(); rig.parts.length = 0; skinMat.dispose(); };
  // drive the rig from the human's own update
  const up = h.update, dis = h.dispose;
  h.update = function (dt, o) { up.call(this, dt, o); rig.update(Math.min(dt, 0.1)); };
  h.dispose = function () { rig.dispose(); dis.call(this); };
  h.cosmetics = rig;
  return rig;
}

let _finger = null;
function fingerGeo() {
  // a unit finger hanging down from its knuckle (y 0 .. -1)
  if (!_finger) { _finger = new THREE.BoxGeometry(1, 1, 1); _finger.translate(0, -0.5, 0); }
  return _finger;
}

const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), _m = new THREE.Matrix4();
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();

/** Chest-space orientation of a hand from its finger direction and palm normal ([fx, fy, fz, nx, ny, nz]). */
function handQ(d, side, out) {
  _y.set(-d[0], -d[1], -d[2]).normalize(); // the bone's +y runs from the fingertips back to the wrist
  _x.set(d[3], d[4], d[5]); if (side === 'L') _x.negate(); // left palms face -x, right palms +x (rest pose)
  _x.addScaledVector(_y, -_x.dot(_y)).normalize();
  _z.crossVectors(_x, _y);
  return out.setFromRotationMatrix(_m.makeBasis(_x, _y, _z));
}

/**
 * Poses may ask for more than the arm IK gives (applied after Human.update, blended by the gesture weight):
 *   pose.hands = { L, R: [finger dir, palm normal] }  hand orientation in chest space
 *   pose.phone = { up, face }                          the phone at pose.prop: its top along up, screen toward face
 *   pose.vsign = 'L' | 'R' | 'LR'                      peace-sign fingers
 */
function posePost(rig) {
  const h = rig.h, b = h.b;
  let vs = '', phone = null, at = null, best = 0;
  for (const g of h.gestures) {
    const w = g.w * g.w * (3 - 2 * g.w), Q = g.pose;
    if (w < 0.01) continue;
    if (Q.vsign && w > 0.5) vs += Q.vsign;
    if (Q.hands) for (const s of ['L', 'R']) {
      const d = Q.hands[s];
      if (!d || (s === 'L' && h.holdL && g.name !== 'carry')) continue;
      handQ(d, s, _q);
      _q2.copy(b['arm' + s].quaternion).multiply(b['fore' + s].quaternion).invert().multiply(_q);
      b['hand' + s].quaternion.slerp(_q2, w);
    }
    if (Q.phone && Q.prop && w > 0.55 && w > best) { best = w; phone = Q.phone; at = Q.prop; }
  }
  rig.vsign[0].visible = vs.includes('L'); rig.vsign[1].visible = vs.includes('R');
  if (phone && b.prop.scale.x > 0) {
    // hand frame in chest space -> the phone's local transform under the hand
    const A = b.armR, F = b.foreR, Hn = b.handR;
    _q.copy(A.quaternion).multiply(F.quaternion);
    _v.copy(Hn.position).applyQuaternion(_q).add(_v2.copy(F.position).applyQuaternion(A.quaternion)).add(A.position);
    _q.multiply(Hn.quaternion);
    _y.set(phone.up[0], phone.up[1], phone.up[2]).normalize();
    _z.set(-phone.face[0], -phone.face[1], -phone.face[2]); // the screen is on the phone's -z side
    _z.addScaledVector(_y, -_z.dot(_y)).normalize();
    _x.crossVectors(_y, _z);
    _q3.setFromRotationMatrix(_m.makeBasis(_x, _y, _z));
    _q2.copy(_q).invert();
    b.prop.quaternion.copy(_q2).multiply(_q3);
    b.prop.position.set(at[0], at[1], at[2]).sub(_v).applyQuaternion(_q2);
  }
}

function updateRig(rig, dt) {
  if (dt <= 0) return;
  const h = rig.h, b = h.b;
  rig.t += dt;
  posePost(rig);
  // head acceleration in head space drives the dangly bits
  b.head.getWorldPosition(_v);
  if (!rig.hp) { rig.hp = _v.clone(); rig.hv = new THREE.Vector3(); rig.ha = new THREE.Vector3(); }
  _v2.subVectors(_v, rig.hp).divideScalar(dt);
  rig.ha.subVectors(_v2, rig.hv).divideScalar(dt).clampLength(0, 40);
  rig.hv.copy(_v2); rig.hp.copy(_v);
  b.head.getWorldQuaternion(_q).invert();
  const acc = _v2.copy(rig.ha).applyQuaternion(_q);
  for (const A of rig.anims) {
    if (A.kind === 'tail') {
      // idle wag + sway with the walk + lag behind turns
      const W = h.walkW, ph = h.phase * Math.PI * 2;
      const wag = Math.sin(rig.t * 2.1) * 0.22 * (1 - W) + Math.sin(ph) * 0.38 * W - h.yawRate * 0.22;
      A.chain.forEach((s, i) => {
        const tgt = wag * (0.55 + i * 0.25) + (i ? A.chain[i - 1].a * 0.45 : 0);
        s.v += ((tgt - s.a) * 60 - s.v * 7) * dt; s.a += s.v * dt;
        const ptgt = s.base + (i === 0 ? Math.sin(ph * 2) * 0.07 * W - W * 0.12 : Math.sin(rig.t * 1.3 + i) * 0.03);
        s.pv += ((ptgt - s.p) * 70 - s.pv * 9) * dt; s.p += s.pv * dt;
        s.g.rotation.set(s.p, s.a, 0, 'YXZ');
      });
    } else if (A.kind === 'chicken') {
      // chicken-y head snaps, the odd peck, wing flaps; the comb jiggles with the head
      A.t -= dt;
      if (A.t < 0) {
        A.t = 0.4 + Math.random() * 1.6;
        if (Math.random() < 0.18) A.peck = 1; else A.yawT = (Math.random() * 2 - 1) * 0.7;
      }
      A.yaw += (A.yawT - A.yaw) * Math.min(1, dt * 22);
      A.peck = Math.max(0, A.peck - dt * 3.2);
      const pk = Math.sin(A.peck * Math.PI) * 0.75;
      A.head.rotation.set(pk, A.yaw, Math.sin(rig.t * 3) * 0.04, 'YXZ');
      A.vx += (-A.cx * 140 - A.vx * 7 + acc.z * 0.35 + (A.peck > 0 ? 4 : 0)) * dt; A.cx += A.vx * dt;
      A.vz += (-A.cz * 140 - A.vz * 7 - acc.x * 0.35 + A.yaw * 0) * dt; A.cz += A.vz * dt;
      A.comb.rotation.set(A.cx * 0.5, 0, A.cz * 0.5);
      A.flapT -= dt;
      if (A.flapT < 0) { A.flapT = 3 + Math.random() * 6; A.flap = 1.2; A.vx += 3; }
      A.flap = Math.max(0, A.flap - dt);
      const f = A.flap > 0 ? Math.abs(Math.sin(A.flap * 18)) * 0.9 : 0;
      A.wings.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * -f; });
    } else if (A.kind === 'bob') {
      A.vx += (-A.x * 90 - A.vx * 6 + acc.z * 0.5) * dt; A.x += A.vx * dt;
      A.vz += (-A.z * 90 - A.vz * 6 - acc.x * 0.5) * dt; A.z += A.vz * dt;
      A.g.rotation.set(A.x * A.amp, 0, A.z * A.amp);
    } else if (A.kind === 'fn') A.fn(dt, rig, acc);
    else if (A.kind === 'ears') {
      A.t -= dt;
      if (A.t < 0) { A.t = 2.5 + Math.random() * 5; A.w = 1; }
      A.w = Math.max(0, A.w - dt * 2.5);
      const e = Math.sin(A.w * Math.PI * 3) * 0.25 * A.w;
      A.ears.forEach((g, i) => { g.rotation.z = (i ? -1 : 1) * 0.25 + (i ? -e : e); });
    }
  }
}

// ------------------------------------------------------------------ previews (thumbnails)
/** An Object3D showing a hat / face item on a plain display head (outfits: see avatar.js avatarPreview). */
export function cosmeticPreview(id) {
  const c = COSMETIC_BY_ID[id];
  const root = new THREE.Group();
  const g = new THREE.Group();
  root.add(g);
  const hm = mesh(cached('mannequin', mannequin));
  g.add(hm);
  const add = (key, build, pos, rot) => { const m = mesh(cached(key, build)); if (pos) m.position.set(...pos); if (rot) m.rotation.set(...rot); g.add(m); return m; };
  const lift = 1.2;
  if (!c) return root;
  switch (id) {
    case 'shark': add('sharkHood', H.sharkHood); break;
    case 'bear': add('bearHood', H.bearHood); for (const sx of [-1, 1]) add('bearEar' + sx, () => H.bearEar(sx), [sx * 6.4, 16.2, 0.6], [0, 0, -sx * 0.25]); break;
    case 'frog': add('frogCap', H.frogCap); break;
    case 'cone': add('cone', H.cone); break;
    case 'party': { const p = add('party', H.party, [2, 15.4 + lift, 1.6], [-0.12, 0, -0.32]); const pm = mesh(cached('pompom', H.pompom)); pm.position.set(0, 14, 0); p.add(pm); break; }
    case 'bow': add('bow', H.bow, [2.6, 17 + lift, 3], [-0.35, 0.1, -0.22]); break;
    case 'nigiri': add('nigiri', H.nigiri, [0, 15.4 + lift, 1.6], [-0.06, 0.08, 0]); break;
    case 'chicken': {
      add('chickenBody', H.chickenBody, [0, lift, 0]);
      const hd = mesh(cached('chickenHead', H.chickenHead, [0, 23.5, 5.5])); hd.position.set(0, 23.5 + lift, 5.5); g.add(hd);
      const cm = mesh(cached('chickenComb', H.chickenComb, [0, 29, 6.6])); cm.position.set(0, 29 - 23.5, 6.6 - 5.5); hd.add(cm);
      for (const sx of [-1, 1]) { const w = mesh(cached('chickenWing' + sx, () => H.chickenWing(sx), [sx * 5.4, 23, 1])); w.position.set(sx * 5.4, 23 + lift, 1); g.add(w); }
      break;
    }
    case 'kitsune': add('kitsune', H.kitsune, [7.4, 10.5, 1.2], [-0.15, 1.2, 0.32]); add('cord', H.cord); break;
    default:
      if (c.preview) c.preview(add, g, lift);
      else if (H[id]) add(id, H[id], [0, 6, 0]);
  }
  g.scale.setScalar(0.0117);
  return root;
}
