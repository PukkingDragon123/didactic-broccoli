// Viewer module: Mikan (CatRig) in every pose, and her face's expressions.   viewer.html?module=/src/dev/cat.js&cols=6
//   &set=poses (default) | face (close-ups of each expression) | gait (&speed=0.42 &n=8) | groove | stretch | groom
//   &yaw=0.6 turns each cat.
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
      ['walk', 'stand', 1], ['walk', 'walk 0.42', 2.13, { speed: 0.42 }], ['walk', 'trot 0.8 (happy)', 2.1, { speed: 0.8, mood: 'happy' }], ['walk', 'run 1.5 (scared)', 2.07, { speed: 1.5, mood: 'scared' }],
      ['sit', 'sit', 2, { from: 'walk' }], ['groom', 'groom: lick', 1.4, { from: 'sit' }], ['groom', 'groom: wash', 4.2, { from: 'sit' }],
      ['sleep', 'sleep loaf', 3, { curl: false }], ['sleep', 'sleep curl', 3, { curl: true }], ['held', 'held', 2], ['held', 'held + pet', 2, { extra: (r, t) => { if (t > 1.0 && t < 1.02) r.pet(); } }],
      ['drink', 'drink', 2.1], ['drink', 'drink: look up', 5.6], ['groove', 'groove', 2.1], ['hide', 'hide (scared)', 2, { mood: 'scared' }],
      ['stretch', 'stretch + yawn', 1.0], ['knead', 'knead', 2.2], ['sit', 'annoyed', 2, { extra: (r) => r.annoyed(1) }],
    ];
    for (const [pose, label, sec, o = {}] of L) add(make(pose, sec, o), label);
  } else if (set === 'face') {
    const F = [['open', 'w'], ['openL', 'w'], ['wide', 'open'], ['slit', 'w'], ['half', 'w'], ['content', 'happy'], ['sleepy', 'w'], ['squeeze', 'yawn'],
      ['blink', 'w'], ['open', 'blep'], ['content', 'lap'], ['half', 'hiss']];
    for (const [e, m] of F) {
      const r = make('sit', 1.5);
      r.say(e, m, 99); r.update(1 / 60, 0);
      add(r, `${e} · ${m}`);
      // frame the face: bounds cut down to the head
      r.hitBody.removeFromParent(); r.hitHead.removeFromParent();
      r.root.updateMatrixWorld(true);
      const c = r.b.head.localToWorld(new THREE.Vector3(0, 0.022, 0.04)).applyMatrix4(r.mesh.matrixWorld.clone().invert());
      r.mesh.boundingBox = new THREE.Box3().setFromCenterAndSize(c, new THREE.Vector3(0.12, 0.12, 0.12));
    }
  } else if (set === 'gait') {
    const speed = +(params.get('speed') || 0.42);
    for (let i = 0; i < n; i++) add(make('walk', 2 + i / n / (1.6 + speed * 5.5), { speed }), `t ${(i / n).toFixed(2)}`);
  } else if (set === 'groove') {
    for (let i = 0; i < n; i++) add(make('groove', 4 + (2 * i) / n * 0.5, { groove: { bpm: 120 } }), `beat ${(2 * i / n).toFixed(2)}`);
  } else {
    const dur = set === 'stretch' ? 3.2 : 6;
    for (let i = 0; i < n; i++) add(make(set, 0.05 + (dur * i) / n, { from: 'sit' }), `${set} ${((dur * i) / n).toFixed(1)}s`);
  }
  return out;
}
