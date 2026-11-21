// The old man who runs Mikawa-ya: very tall, broad-shouldered, a white beard, a hat with a band, a walking stick, and a
// face mask he never takes off (a cigar pokes through a hole in it). Looks a lot like a certain retired adventurer.
// He will tell you he has never been anywhere.
//   makeOldMan() -> { h (Human), head (his head bone), cigar (an anchor at the cigar), cigarTip(out) -> world point }
// No voxels: the pleated cloth mask with ear loops, the cigar and the white beard are modelled into the person and
// painted into his own atlas (src/people/acc.js faceGear, src/people/paint.js); his felt fedora is an imported
// hand-made model (src/cosmetics/wear.js).
import * as THREE from 'three';
import { Human } from '../../people/Human.js';
import { makeSpec } from '../../people/presets.js';
import { hex } from '../../people/paintlib.js';
import { wearPiece } from '../../cosmetics/wear.js';

export function makeOldMan(mats = null) {
  void mats; // (kept for callers: nothing he wears needs the voxel material set any more)
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
  // (the mask, beard and cigar are modelled pieces of the person; the hat is a real felt fedora model, below)
  spec.hat = { kind: 'hood' }; // hair tucked under the hat band
  const cigar = { kind: 'cigar' };
  spec.acc = [...spec.acc, { kind: 'mask', col: [244, 244, 240] }, { kind: 'beard', col: [238, 236, 230] }, cigar];
  spec.face = { ...spec.face, browCol: [236, 234, 228] };
  const h = new Human(spec, { lazy: true });
  h.tts = { gender: 'm', pitch: 0.78, rate: 0.92, seed: 37 };
  // the cigar's lit end rides on the head bone (rest pose: bones are axis-aligned, at the plan's joints)
  const J = h.J, tip = new THREE.Object3D(), t = cigar.tip || [0.02, h.P.mouthY, h.P.zf + 0.12];
  tip.position.set(t[0] - J.head[0], t[1] - J.head[1], t[2] - J.head[2]);
  h.b.head.add(tip);
  // his felt fedora with its band: an imported hand-made model (src/cosmetics/wear.js), in head units on the head bone
  const hu = new THREE.Group(), U = h.P.hu / 20;
  hu.scale.set(U * h.P.hw / (0.335 * h.P.hu), U, U * h.P.hd / (0.42 * h.P.hu));
  hu.add(wearPiece({ m: 'wear_fedora', w: 25.5, y: 11.6, z: 2.3, rx: -0.04 }));
  h.b.head.add(hu);
  return {
    h, head: h.b.head, cigar: tip,
    cigarTip(out = new THREE.Vector3()) { return tip.getWorldPosition(out); },
  };
}
