// The old man who runs Mikawa-ya: very tall, broad-shouldered, a white beard, a hat with a band, a walking stick, and a
// face mask he never takes off (a cigar pokes through a hole in it). Looks a lot like a certain retired adventurer.
// He will tell you he has never been anywhere.
//   makeOldMan() -> { h (Human), cigarTip(out) -> world point, update(dt, opts), setNap(on, at) }
// Head pieces are voxel models in head units (1 = 1/20 of the head height; chin -4, nose 1.8, eyes 6, brows 8, hair line
// 13.2, crown 16; face plane z ~10.8), riding on the head bone like src/people/cosmetics.js.
import * as THREE from 'three';
import { Human } from '../../people/Human.js';
import { makeSpec } from '../../people/presets.js';
import { hex } from '../../people/paintlib.js';
import { VoxelModel, glow } from '../../voxel/VoxelModel.js';
import { meshVoxels } from '../../voxel/mesher.js';
import { voxelMaterials } from '../../voxel/materials.js';

const vm = () => { const v = new VoxelModel(); v.jitter = 0.02; return v; };
const geo = (v) => { const g = meshVoxels(v, { voxelSize: 1, origin: 'none' }); g.translate(-0.5, -0.5, -0.5); g.computeBoundingSphere(); return g; };
function each(x0, x1, y0, y1, z0, z1, fn) { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) fn(x, y, z); }

/** The cloth mask: over the nose and mouth, curved round the face, pleats, ear loops; a hole for the cigar. */
function mask() {
  const v = vm(), W = 0xf4f4f0, P = 0xdcdcd6, L = 0xe8e8e4;
  each(-9, 9, -6, 4, 3, 16, (x, y, z) => {
    const zf = 12.2 - (x / 9.4) ** 2 * 6.2 - (y < -2 ? -(y + 2) * 0.55 : 0) + (y > 2 ? -(y - 2) * 0.3 : 0);
    if (z < zf || z > zf + 1.4) return;
    if (Math.abs(x) <= 1 && y >= -1 && y <= 0) return; // the cigar hole
    v.set(x, y, z, y === -1 || y === 2 ? P : W);
  });
  // ear loops back to the ears
  for (const sx of [-1, 1]) {
    for (let z = 2; z <= 6; z++) { v.set(sx * 9, 4, z, L); v.set(sx * 9, -4, z, L); }
    v.set(sx * 9, 3, 2, L); v.set(sx * 9, -3, 2, L);
  }
  return v;
}
/** White beard: thick sideburns down the jaw and a trimmed chin beard showing under the mask. */
function beard() {
  const v = vm(), B = 0xeeece6, D = 0xd8d4cc;
  for (const sx of [-1, 1]) each(6, 8, -5, 7, 2, 8, (x, y, z) => {
    if (y > 4 && z < 5) return;
    if ((x - 6) + (z - 2) * 0.2 > 2.6 - (y < -2 ? (-2 - y) * 0.5 : 0)) return;
    v.set(sx * x, y, z, (x + y + z) % 3 ? B : D);
  });
  each(-7, 7, -11, -5, 3, 13, (x, y, z) => {
    const r = (x / 7) ** 2 + ((z - 8) / 5) ** 2 + ((y + 7) / 4.2) ** 2;
    if (r > 1) return;
    v.set(x, y, z, (x * 3 + y + z) % 4 ? B : D);
  });
  // bushy white eyebrows
  for (const sx of [-1, 1]) each(2, 5, 8, 9, 10, 11, (x, y, z) => { if (y === 9 && x === 5) return; v.set(sx * x, y, z, B); });
  return v;
}
/** A fedora: a pinched crown, a dark band, a curled brim. */
function hat() {
  const v = vm(), F = 0xb8a47e, D = 0x9a8662, BAND = 0x3a2a1e;
  const y0 = 12;
  each(-13, 13, y0 - 1, y0 + 10, -12, 15, (x, y, z) => {
    const rz = z - 2.4;
    if (y <= y0) { // brim
      const r = (x / 12.5) ** 2 + (rz / 12) ** 2;
      if (r > 1) return;
      const up = r > 0.7 && Math.abs(x) > 9 ? 1 : 0; // the sides curl up
      if (y === y0 - 1 + up) v.set(x, y, z, r > 0.85 ? D : F);
      return;
    }
    const k = (y - y0) / 10, rx = 8.2 - k * 1.4, rzz = 9.4 - k * 1.2;
    const r = (x / rx) ** 2 + (rz / rzz) ** 2;
    if (r > 1) return;
    if (y === y0 + 10 && Math.abs(x) < 2) return; // the pinch
    if (y > y0 + 8 && Math.abs(x) < 1) return;
    v.set(x, y, z, y <= y0 + 2 ? BAND : r > 0.8 ? D : F);
  });
  return v;
}
/** The cigar, poking out of the mask: brown wrap, a gold band, grey ash and the ember. */
function cigar() {
  const v = vm();
  for (let z = 0; z <= 11; z++) for (const [x, y] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    let c = 0x6a3a1e;
    if (z === 3) c = 0xd8a830;
    if (z >= 10) c = 0x9a9a94;
    v.set(x, y, z, c);
  }
  v.set(0, 0, 12, glow(0xff5a2a)); v.set(1, 1, 12, glow(0xd83a1a));
  return v;
}

export function makeOldMan(mats = null) {
  const spec = makeSpec('grandpa', 1937);
  Object.assign(spec, {
    name: 'Mikawa-san', H: 1.95, build: 1.22, belly: 0.12, age: 'elder',
    skin: hex(0xe6bf9a),
    hair: { style: 'short', col: hex(0xe8e6e0), hi: [252, 252, 250], grey: 1 },
    glasses: null, hat: null,
    top: { kind: 'jacket', col: hex(0x6a5e42), shirt: hex(0x2e4a36) },
    bottom: { kind: 'slacks', col: hex(0x4a4436), belt: [50, 36, 26] },
    shoes: { kind: 'comfort', col: hex(0x3a2a20) }, socks: { col: [90, 90, 96] },
    acc: [{ kind: 'cane', col: hex(0x4a2e1a) }],
    walk: { style: 'elder', hunch: 0.25 },
  });
  spec.face = { ...spec.face, wrinkles: 1, spots: 0.4, mustache: false, stubble: 0.85, browW: 1.5, iris: hex(0x4a6c94) };
  const h = new Human(spec, { lazy: true });
  h.tts = { gender: 'm', pitch: 0.78, rate: 0.92, seed: 37 };
  const P = h.P, J = h.J, U = P.hu / 20;
  const kx = P.hw / (0.335 * P.hu), kz = P.hd / (0.42 * P.hu);
  const head = new THREE.Group();
  head.scale.set(U * kx, U, U * kz);
  h.b.head.add(head);
  mats ||= voxelMaterials('normal');
  const add = (v, parent = head) => { const m = new THREE.Mesh(geo(v), mats); m.castShadow = true; m.raycast = () => {}; parent.add(m); return m; };
  add(mask()); add(beard()); add(hat());
  const cg = new THREE.Group();
  cg.position.set(0.5, -0.5, 12.0);
  cg.rotation.set(0.12, 0.38, 0);
  head.add(cg);
  add(cigar(), cg);
  const tip = new THREE.Object3D();
  tip.position.set(0.5, 0.5, 12.5);
  cg.add(tip);
  void J;
  return {
    h, head, cigar: cg,
    cigarTip(out = new THREE.Vector3()) { return tip.getWorldPosition(out); },
  };
}
