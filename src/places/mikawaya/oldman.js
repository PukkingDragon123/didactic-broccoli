// The old man who runs Mikawa-ya: very tall, broad-shouldered, a white beard, a hat with a band, a walking stick, and a
// face mask he never takes off (a cigar pokes through a hole in it). Looks a lot like a certain retired adventurer.
// He will tell you he has never been anywhere.
//   makeOldMan() -> { h (Human), cigarTip(out) -> world point, update(dt, opts), setNap(on, at) }
// Head pieces (src/peoplekit/npc.js OLDMAN: the cloth mask, white beard and brows, the fedora, the cigar) are in head
// units (1 = 1/20 of the head height; chin -4, nose 1.8, eyes 6, brows 8, hair line 13.2, crown 16; face plane z ~10.8),
// riding on the head bone like src/people/cosmetics.js.
import * as THREE from 'three';
import { Human } from '../../people/Human.js';
import { makeSpec } from '../../people/presets.js';
import { hex } from '../../people/paintlib.js';
import { kitMesh } from '../../peoplekit/kit.js';
import { OLDMAN, ember } from '../../peoplekit/npc.js';

const geos = new Map();
const geo = (k) => { let g = geos.get(k); if (!g) { g = OLDMAN[k](); geos.set(k, g); } return g; };

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
  // (mats: given when he stands indoors, out of the sun: the kit's indoor materials then)
  const variant = mats ? 'indoor' : 'normal';
  const add = (k, parent = head) => { const m = kitMesh(geo(k), variant); parent.add(m); return m; };
  add('mask'); add('beard'); add('hat');
  const cg = new THREE.Group();
  cg.position.set(0.5, -0.5, 12.0);
  cg.rotation.set(0.12, 0.38, 0);
  head.add(cg);
  add('cigar', cg);
  cg.add(ember());
  const tip = new THREE.Object3D();
  tip.position.set(0.5, 0.5, 12.5);
  cg.add(tip);
  void J;
  return {
    h, head, cigar: cg,
    cigarTip(out = new THREE.Vector3()) { return tip.getWorldPosition(out); },
  };
}
