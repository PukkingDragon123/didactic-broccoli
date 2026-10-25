// Viewer module: Mikan (CatRig) in every pose / gait.   viewer.html?module=/src/dev/cat.js&cols=6
//   &set=poses (default) | gait (&speed=0.42 &n=8: one stride cycle) | groove (&n=8 over two beats) | stretch | groom
//   &yaw=0.6 turns each cat. Gait frames report the stance paws' world slip (mm per frame) in the label.
import * as THREE from 'three';
import { CatRig } from '../world/CatRig.js';

function run(rig, sec, speed = 0, extra) {
  const dt = 1 / 60;
  for (let t = 0; t < sec; t += dt) { if (speed) rig.root.position.z += speed * dt; extra?.(rig, t); rig.update(dt, speed); }
  return rig;
}
function make(pose, sec, opts = {}) {
  const r = new CatRig();
  r.setPose(opts.from || 'walk');
  if (opts.from) run(r, 1);
  r.setPose(pose, opts.groove);
  if (opts.mood) r.mood = opts.mood;
  if (opts.dark != null) r.dark = opts.dark;
  if (opts.curl != null) r.curl = opts.curl;
  run(r, sec, opts.speed || 0, opts.extra);
  return r;
}

export async function viewerEntries(params) {
  const set = params.get('set') || 'poses', yaw = +(params.get('yaw') ?? 0.6), n = +(params.get('n') || 8);
  const out = [];
  const add = (r, label) => { r.root.position.set(0, 0, 0); r.root.rotation.y = yaw; r.prevYaw = yaw; r.update(1e-4, r.spd); out.push({ obj: r.root, label }); };
  if (set === 'poses') {
    const L = [
      ['walk', 'stand', 1], ['walk', 'walk 0.42', 2.13, { speed: 0.42 }], ['walk', 'trot 0.8', 2.1, { speed: 0.8, mood: 'happy' }], ['walk', 'run 1.5', 2.07, { speed: 1.5, mood: 'scared' }],
      ['sit', 'sit', 2, { from: 'walk' }], ['groom', 'groom: lick', 2.4, { from: 'sit' }], ['groom', 'groom: wash', 4.2, { from: 'sit' }],
      ['sleep', 'sleep loaf', 3, { curl: false }], ['sleep', 'sleep curl', 3, { curl: true }], ['held', 'held', 2], ['held', 'held + pet', 2, { extra: (r, t) => { if (t > 1.4 && t < 1.42) r.pet(); } }],
      ['drink', 'drink', 2.1], ['drink', 'drink: look up', 5.6], ['groove', 'groove', 2.1], ['hide', 'hide (scared)', 2, { mood: 'scared', dark: 0.6 }],
      ['stretch', 'stretch: front', 1.2], ['stretch', 'stretch: hind', 2.4], ['knead', 'knead', 2.2],
    ];
    for (const [pose, label, sec, o = {}] of L) {
      const r = make(pose, sec, o);
      add(r, label);
      // reach checks: the mouth vs Street's bowl offset (0.27 m ahead), the held grip height (FPBody: 66% of the box)
      if (pose === 'drink') { const m = r.b.jaw.localToWorld(new THREE.Vector3(0, -0.002, 0.03)); out[out.length - 1].label += ` · mouth z ${(m.x * Math.sin(yaw) + m.z * Math.cos(yaw)).toFixed(3)} y ${m.y.toFixed(3)}`; }
      if (pose === 'held') { const B = r.mesh.boundingBox, a = r.b.armL.getWorldPosition(new THREE.Vector3()); out[out.length - 1].label += ` · box y ${B.min.y.toFixed(2)}..${B.max.y.toFixed(2)} grip ${(B.min.y + 0.66 * (B.max.y - B.min.y)).toFixed(2)} shoulder ${a.y.toFixed(2)}`; }
    }
  } else if (set === 'gait') {
    const speed = +(params.get('speed') || 0.42);
    for (let i = 0; i < n; i++) {
      const r = new CatRig();
      r.setPose('walk');
      const L = Math.min(0.55, Math.max(0.13, 0.13 + 0.26 * speed)), T = L / speed; // one stride
      run(r, 2, speed);
      // measure stance-paw slip over the next frame
      // contact points: front pads / hind toes (same offsets as CatRig.updateBounds)
      const pts = () => [['pawL', 0.017, -0.022], ['pawR', 0.017, -0.022], ['metaL', 0.04, -0.043], ['metaR', 0.04, -0.043]].map(([bn, z, y]) => r.b[bn].localToWorld(new THREE.Vector3(0, y, z)));
      run(r, (T * i) / n, speed);
      const before = pts();
      run(r, 1 / 60, speed);
      const after = pts();
      const slip = before.map((p, k) => (p.y < 0.012 && after[k].y < 0.012 ? Math.hypot(after[k].x - p.x, after[k].z - p.z) * 1000 : -1));
      add(r, `t ${(i / n).toFixed(2)} · slip ${slip.map((s) => (s < 0 ? '-' : s.toFixed(1))).join(' ')}<br>y ${before.map((p) => (p.y * 1000).toFixed(0)).join(' ')}`);
    }
  } else if (set === 'face') {
    // close-ups: the bounds are cut down to the head so the viewer frames the face
    const L = [['sit', 'face', 2, {}], ['sit', 'dark pupils', 3, { dark: 1 }], ['drink', 'lapping', 2.13, {}], ['held', 'held + pet', 2, { extra: (r, t) => { if (t > 1.4 && t < 1.42) r.pet(); } }], ['stretch', 'yawn', 1.05, {}], ['hide', 'scared', 2, { mood: 'scared' }]];
    for (const [pose, label, sec, o] of L) {
      const r = make(pose, sec, o);
      add(r, label);
      r.b.head.updateWorldMatrix(true, false);
      const c = r.b.head.localToWorld(new THREE.Vector3(0, 0.01, 0.035));
      r.root.updateWorldMatrix(true, true);
      const inv = r.mesh.matrixWorld.clone().invert();
      r.mesh.boundingBox.setFromCenterAndSize(c.clone().applyMatrix4(inv), new THREE.Vector3(0.09, 0.09, 0.09));
      r.whiskers.visible = true;
    }
  } else if (set === 'groove') {
    for (let i = 0; i < n; i++) add(make('groove', 4 + (2 * i) / n * 0.5, { groove: { bpm: 120 } }), `beat ${(2 * i / n).toFixed(2)}`);
  } else {
    const dur = set === 'stretch' ? 3.2 : 6;
    for (let i = 0; i < n; i++) add(make(set, 0.05 + (dur * i) / n, { from: 'sit' }), `${set} ${((dur * i) / n).toFixed(1)}s`);
  }
  return out;
}
