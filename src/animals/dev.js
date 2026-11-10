// Dev studio for the animals (viewer.html?module=/src/animals/dev.js&set=cat): each shot through the game's own renderer
// (cel accent, ink, grade) on a paving-grey floor, laid out on one sheet shown full-window (for tools/shoot.mjs).
//   &set=cat (poses) | face (expressions) | gait | dogs | pigeons | all        &cell=320
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Renderer } from '../core/renderer.js';

function run(rig, sec, speed = 0, extra) {
  const dt = 1 / 60;
  for (let t = 0; t < sec; t += dt) { if (speed) rig.root.position.z += speed * dt; extra?.(rig, t); rig.update(dt, speed); }
  return rig;
}

export async function viewerEntries(params) {
  const set0 = params.get('set') || 'cat', cell = +(params.get('cell') || 320);
  const sets = set0 === 'final' ? ['hero', 'face', 'cat', 'dogs', 'pigeons'] : set0 === 'final1' ? ['hero', 'face'] : set0 === 'final2' ? ['cat', 'dogs', 'pigeons'] : [set0];
  const shots = [];
  // a shot: { obj, at: [x, y, z] look target, dist, yaw, pitch, fov, label }
  for (const set of sets) {
  if (set === 'cat' || set === 'all' || set === 'face' || set === 'gait' || set === 'hero') {
    const { CatRig } = await import('../world/CatRig.js');
    const make = (pose, sec, o = {}) => {
      const r = new CatRig({ coat: o.coat });
      r.setPose(o.from || 'walk'); if (o.from) run(r, 1);
      r.setPose(pose, o.groove);
      if (o.mood) r.mood = o.mood; if (o.dark != null) r.dark = o.dark; if (o.curl != null) r.curl = o.curl;
      run(r, sec, o.speed || 0, o.extra);
      r.root.position.set(0, 0, 0); r.prevYaw = 0; r.update(1e-4, r.spd);
      return r;
    };
    if (set === 'hero') {
      const r = make('sit', 2.5, { from: 'walk' }); r.lookYaw = 0; r.glanceT = 99; r.glance = [0, 0]; r.update(1 / 60, 0);
      shots.push({ obj: r.root, yaw: 0.55, pitch: 0.18, label: 'Mikan sitting' });
      const r2 = make('walk', 1); r2.glanceT = 99; r2.glance = [0, 0]; r2.update(1 / 60, 0);
      shots.push({ obj: r2.root, rig: r2, head: true, dist: 0.36, yaw: 0.7, pitch: 0.12, label: 'head 3/4' });
      const r3 = make('sleep', 3, { curl: false }); shots.push({ obj: r3.root, yaw: 2.2, pitch: 0.35, label: 'loaf from behind' });
      const r4 = make('walk', 2.1, { speed: 0.42 }); shots.push({ obj: r4.root, yaw: -0.5, pitch: 0.25, label: 'walk, her right side' });
    } else if (set === 'face') {
      const F = [['open', 'w'], ['openL', 'w'], ['wide', 'open'], ['slit', 'w'], ['half', 'w'], ['content', 'happy'], ['sleepy', 'w'], ['squeeze', 'yawn'], ['blink', 'w'], ['open', 'blep'], ['content', 'lap'], ['half', 'hiss']];
      for (const [e, m] of F) { const r = make('walk', 1); r.say(e, m, 99); r.lookYaw = 0; r.glanceT = 99; r.glance = [0, 0]; r.update(1 / 60, 0); shots.push({ obj: r.root, rig: r, head: true, dist: 0.3, yaw: 0.25, pitch: 0.08, label: `${e} · ${m}` }); }
    } else if (set === 'gait') {
      const n = +(params.get('n') || 8), speed = +(params.get('speed') || 0.42);
      for (let i = 0; i < n; i++) shots.push({ obj: make('walk', 2 + i / n / (1.5 + speed * 4.2), { speed }).root, yaw: Math.PI / 2, pitch: 0.1, label: `t ${(i / n).toFixed(2)}` });
    } else {
      const L = [
        ['walk', 'stand', 1, {}, 0.7], ['walk', 'walk 0.42', 2.13, { speed: 0.42 }, 1.4], ['walk', 'trot 0.8 happy', 2.1, { speed: 0.8, mood: 'happy' }, 1.4], ['walk', 'run 1.5 scared', 2.07, { speed: 1.5, mood: 'scared' }, 1.4],
        ['sit', 'sit', 2.5, { from: 'walk' }, 0.6], ['groom', 'groom: lick', 1.4, { from: 'sit' }, 0.6], ['groom', 'groom: wash', 4.2, { from: 'sit' }, 0.6],
        ['sleep', 'sleep loaf', 3, { curl: false }, 0.6], ['sleep', 'sleep curl', 3, { curl: true }, 0.4], ['held', 'held', 2, {}, 0.3],
        ['drink', 'drink', 2.1, {}, 1.0], ['stretch', 'stretch + yawn', 1.0, {}, 1.2], ['knead', 'knead', 2.2, {}, 0.6], ['stalk', 'stalk', 2, {}, 1.3], ['hide', 'hide', 2, { mood: 'scared' }, 0.8],
        ['sit', 'stray (tabby)', 2.5, { from: 'walk', coat: 'tabby' }, 0.6],
      ];
      for (const [pose, label, sec, o, yaw] of L) shots.push({ obj: make(pose, sec, o).root, yaw, pitch: pose === 'held' ? 0.1 : 0.3, label });
    }
  }
  if (set === 'dogs' || set === 'all') {
    const { Shiba } = await import('../life/jobs/dog.js');
    const fake = { scene: new THREE.Scene(), effects: { mark() {} } };
    for (const [kind, pose, sp] of [['pochi', 'stand', 0], ['pochi', 'walk', 1.2], ['pochi', 'sit', 0], ['pochi', 'sniff', 0], ['kuro', 'sit', 0]]) {
      const d = new Shiba(fake, kind); d.pose = pose === 'walk' ? 'stand' : pose; d.speed = sp;
      for (let i = 0; i < 90; i++) d.update(1 / 60);
      d.root.removeFromParent();
      shots.push({ obj: d.root, yaw: 0.8, pitch: 0.25, label: `${kind} ${pose}` });
    }
    const { StreetDog, DOG_KINDS } = await import('./dog.js');
    for (const k of DOG_KINDS) { const d = new StreetDog(fake, k); d.speed = k === 'goma' ? 0.9 : 0; for (let i = 0; i < 60; i++) d.update(1 / 60); d.root.removeFromParent(); shots.push({ obj: d.root, yaw: 0.8, pitch: 0.25, label: k }); }
    const { GhostDog } = await import('../world/GhostAlley.js');
    const g = new GhostDog(); g.update(0.1, 0, false, null); shots.push({ obj: g.root, yaw: 0.8, pitch: 0.25, label: 'ghost dog' });
  }
  if (set === 'pigeons' || set === 'all') {
    await import('./props.js');
    const { propMesh } = await import('../world/props.js');
    const { makePigeon } = await import('./pigeon.js');
    for (const [label, a] of [['pigeon', {}], ['peck', { peck: 1 }], ['bob', { bob: 1 }], ['fly up', { fly: 1, flap: Math.PI / 2 }], ['fly down', { fly: 1, flap: -Math.PI / 2 }]]) {
      const m = makePigeon(); m.userData.anim(a); const g = new THREE.Group(); g.add(m); if (a.fly) m.position.y = 0.15;
      shots.push({ obj: g, yaw: label.startsWith('fly') ? 0.5 : 0.9, pitch: label.startsWith('fly') ? 0.5 : 0.2, label });
    }
    for (const id of ['pigeon_fly', 'stray_cat_sit', 'stray_cat']) shots.push({ obj: propMesh(id), yaw: 0.7, pitch: 0.3, label: 'prop ' + id });
  }
  }
  // ---- render
  const cols = +(params.get('cols') || Math.min(4, shots.length)), rows = Math.ceil(shots.length / cols);
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:0;top:0;width:${cell}px;height:${cell}px;opacity:0;pointer-events:none`;
  document.body.appendChild(host);
  const R = new Renderer(host);
  R.renderer.setSize(cell, cell);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xb9b4ac);
  scene.environment = new THREE.PMREMGenerator(R.renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;
  scene.add(new THREE.HemisphereLight(0xfff6ea, 0x8a8298, 0.8));
  const sun = new THREE.DirectionalLight(0xfff1dc, 1.8);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = sun.shadow.camera.bottom = -0.6; sun.shadow.camera.right = sun.shadow.camera.top = 0.6;
  sun.shadow.camera.near = 0.05; sun.shadow.camera.far = 6; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.002;
  scene.add(sun, sun.target);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 40), new THREE.MeshStandardMaterial({ color: 0xa8a49c, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  scene.add(floor);
  const cam = new THREE.PerspectiveCamera(24, 1, 0.01, 30);
  R.setup(scene, cam);
  R.registerShadowLight?.(sun, 1);
  if (R.grade) R.grade.uniforms.uVignette.value = 0;
  const sheet = document.createElement('canvas');
  sheet.width = cols * cell; sheet.height = rows * cell;
  const ctx = sheet.getContext('2d');
  let time = 0;
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    scene.add(s.obj);
    s.obj.updateMatrixWorld(true);
    let centre, rad;
    if (s.head) { centre = s.rig.b.head.localToWorld(new THREE.Vector3(0, 0.022, 0.04)); rad = 0.07; }
    else {
      const box = new THREE.Box3();
      s.obj.traverse((o) => { if (o.isSkinnedMesh) { o.skeleton.update(); const b2 = new THREE.Box3(); for (const bn of o.skeleton.bones) b2.expandByPoint(bn.getWorldPosition(new THREE.Vector3())); b2.expandByScalar(0.06); box.union(b2); } else if (o.isMesh && o.visible && o.material?.visible !== false) box.union(new THREE.Box3().setFromObject(o)); });
      centre = box.getCenter(new THREE.Vector3()); rad = box.getSize(new THREE.Vector3()).length() * 0.5;
    }
    const dist = rad / Math.sin(THREE.MathUtils.degToRad(12)) * (s.dist ? 1 : 1);
    const yaw = s.yaw ?? 0.6, pitch = s.pitch ?? 0.25;
    cam.position.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(s.dist && s.head ? s.dist : dist).add(centre);
    cam.lookAt(centre);
    sun.position.copy(centre).add(new THREE.Vector3(-0.6, 1.2, 0.8).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).multiplyScalar(1.2));
    sun.target.position.copy(centre);
    for (let k = 0; k < 2; k++) { time += 0.016; R.render(0.016, time); }
    ctx.drawImage(R.renderer.domElement, (i % cols) * cell, Math.floor(i / cols) * cell, cell, cell);
    ctx.fillStyle = '#2a2428'; ctx.font = '13px monospace'; ctx.textAlign = 'center';
    ctx.fillText(s.label, (i % cols) * cell + cell / 2, Math.floor(i / cols) * cell + cell - 8);
    scene.remove(s.obj);
  }
  sheet.style.cssText = 'position:fixed;left:0;top:0;z-index:10';
  document.body.appendChild(sheet);
  window.__sheet = sheet;
  return [];
}
