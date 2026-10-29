// Dev page for the lane regulars (src/npc/looks.js): close-ups, full bodies and gestures in the people.html light.
//   npc.html?show=all                 each character: full body (3/4) + head close-up        (&ids=rohan,josuke &yaw=0.5)
//   npc.html?show=gestures&id=rohan   gestures of one character   (&names=sketch,stare &t=1.2 &yaw=0.6 &zoom=upper)
//   npc.html?show=turn&id=josuke      several angles              (&angs=0,1.57,3.14 &zoom=head|upper)
//   npc.html?show=trio                the three together, posing   (&t=1.5)
import * as THREE from 'three';
import { Renderer } from '../core/renderer.js';
import { Pix } from '../gfx/pix.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createCharacter } from '../npc/looks.js';
import '../npc/poses.js';
import '../people/bizarre.js';

const Q = new URLSearchParams(location.search);
const show = Q.get('show') || 'all';
const num = (k, d) => (Q.has(k) ? +Q.get(k) : d);
const errBox = document.getElementById('err');
window.addEventListener('error', (e) => { errBox.textContent += (e.message || e) + '\n'; });
window.addEventListener('unhandledrejection', (e) => { errBox.textContent += String(e.reason?.stack || e.reason) + '\n'; });

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a2230);
scene.add(new THREE.HemisphereLight(0xffe8d6, 0x4a3a30, 1.35));
const sun = new THREE.DirectionalLight(0xffbf8a, 3.2);
sun.castShadow = true;
Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 30 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight(0xa0b4ff, 0.9);
scene.add(fill);
const p = new Pix(64, 64, 9);
p.fill(0x4a4440).noise(0.12).speckle(0.05, [0x3a3532, 0x5a524c, 0x2f2b29]);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ map: p.texture({ repeat: [160, 160] }), roughness: 0.95 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
scene.add(ground);
const back = new THREE.Mesh(new THREE.PlaneGeometry(120, 40), new THREE.MeshBasicMaterial({ color: 0x8a5a6a, fog: false }));
scene.add(back);

const R = new Renderer(document.createElement('div'));
R.qualityName = Q.get('q') || 'medium';
R.quality = { pixelRatio: 1, shadows: 2048, ao: false, bloom: true, aa: true, shadowEvery: 1 };
const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 100);
const camTarget = new THREE.Vector3();
R.scene = scene; R.camera = camera;
R.buildComposer();
R.registerShadowLight(sun, 1);
scene.environment = new THREE.PMREMGenerator(R.renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.5;
let curW = 0, curH = 0;
function size(w, h) {
  if (w === curW && h === curH) return;
  curW = w; curH = h;
  R.renderer.setSize(w, h, false); R.composer.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
const grid = document.getElementById('grid');
const people = [], tiles = [];
function tile(w, h, label, setup) {
  const cell = document.createElement('div'); cell.className = 'cell';
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const lb = document.createElement('div'); lb.className = 'lbl'; lb.textContent = label;
  cell.append(cv, lb); grid.append(cell);
  tiles.push({ w, h, cv, setup });
}
function frameBody(hm, yaw = 0.55, pitch = 0.08, zoom = Q.get('zoom')) {
  const H = hm.height + 0.12, cy = zoom === 'head' ? H - 0.2 : zoom === 'upper' ? H * 0.74 : H * 0.5, half = zoom === 'head' ? 0.2 : zoom === 'upper' ? H * 0.28 : H * 0.52;
  const tgt = hm.root.position.clone().setY(cy);
  const dist = half / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) + 0.3;
  const a = hm.root.rotation.y + yaw;
  camera.position.set(tgt.x + Math.sin(a) * Math.cos(pitch) * dist, tgt.y + Math.sin(pitch) * dist, tgt.z + Math.cos(a) * Math.cos(pitch) * dist);
  camera.lookAt(tgt); camTarget.copy(tgt);
}
function only(list) { for (const q of people) q.root.visible = list.includes(q); }
function place(hm, x, z = 0) { hm.root.position.set(x, 0, z); people.push(hm); scene.add(hm.root); return hm; }
function settle(hm, sec, opts = {}, dt = 1 / 60) { for (let t = 0; t < sec; t += dt) hm.update(dt, opts); }
async function renderTiles() {
  for (const t of tiles) {
    size(t.w, t.h);
    t.setup();
    const cy = Math.atan2(camera.position.x - camTarget.x, camera.position.z - camTarget.z);
    sun.target.position.copy(camTarget).setY(0);
    sun.position.set(camTarget.x + Math.sin(cy - 0.8) * 6, 5, camTarget.z + Math.cos(cy - 0.8) * 6);
    fill.position.set(camTarget.x + Math.sin(cy + 2.6) * 6, 3, camTarget.z + Math.cos(cy + 2.6) * 6);
    back.position.set(camTarget.x - Math.sin(cy) * 30, 12, camTarget.z - Math.cos(cy) * 30); back.lookAt(camera.position.x, 12, camera.position.z);
    scene.updateMatrixWorld(true);
    R.render(1 / 60, 1);
    t.cv.getContext('2d').drawImage(R.renderer.domElement, 0, 0, t.w, t.h);
    await new Promise((r) => setTimeout(r, 0));
  }
}

const IDS = (Q.get('ids') || 'rohan,josuke,okuyasu').split(',');
const BASE = { rohan: 'hold_book', josuke: 'pockets', okuyasu: null };
if (show === 'all') {
  const w = num('w', 240), h = num('h', 380);
  grid.style.gridTemplateColumns = `repeat(${IDS.length * 2}, ${w}px)`;
  IDS.forEach((id, i) => {
    const hm = place(createCharacter(id), i * 3);
    if (BASE[id] && !Q.has('nobase')) hm.gesture(BASE[id]);
    settle(hm, 1.5);
    tile(w, h, `${hm.spec.name} ${hm.height.toFixed(2)} m, ${hm.tris} tris`, () => { only([hm]); frameBody(hm, num('yaw', 0.5), 0.06, 'body'); });
    tile(w, h, `${hm.spec.name} close-up`, () => { only([hm]); frameBody(hm, num('hyaw', 0.35), 0.04, 'head'); });
  });
} else if (show === 'gestures') {
  const id = Q.get('id') || 'rohan';
  const names = (Q.get('names') || 'hold_book,sketch,stare,flourish,study').split(',');
  const w = num('w', 220), h = num('h', 340);
  grid.style.gridTemplateColumns = `repeat(${Math.min(names.length, num('cols', 6))}, ${w}px)`;
  names.forEach((n, i) => {
    const hm = place(createCharacter(id), i * 3);
    settle(hm, 1);
    if (n !== 'none') hm.gesture(n);
    if (Q.get('expr')) hm.setExpression(Q.get('expr'));
    settle(hm, num('t', 1.2), { speed: num('speed', 0), talking: Q.has('talk') });
    tile(w, h, `${id}: ${n}`, () => { only([hm]); frameBody(hm, num('yaw', 0.6), num('pitch', 0.08)); });
  });
} else if (show === 'turn') {
  const id = Q.get('id') || 'josuke';
  const angs = (Q.get('angs') || '0,0.8,1.57,2.4,3.14,-1.57').split(',').map(Number);
  const w = num('w', 220), h = num('h', 340);
  grid.style.gridTemplateColumns = `repeat(${angs.length}, ${w}px)`;
  const hm = place(createCharacter(id), 0);
  if (BASE[id] && !Q.has('nobase')) hm.gesture(BASE[id]);
  settle(hm, 1.5, { speed: num('speed', 0) });
  for (const a of angs) tile(w, h, `${id} yaw ${a}`, () => { only([hm]); frameBody(hm, a, num('pitch', 0.05)); });
} else if (show === 'trio') {
  const w = num('w', 720), h = num('h', 420);
  grid.style.gridTemplateColumns = `${w}px`;
  const poses = (Q.get('poses') || 'pose_point,pose_cross,pose_lean').split(',');
  const hs = IDS.map((id, i) => { const hm = place(createCharacter(id), (i - 1) * 0.95, i === 1 ? -0.3 : 0); hm.root.rotation.y = (1 - i) * 0.25; settle(hm, 1); hm.gesture(poses[i]); settle(hm, num('t', 1.4)); return hm; });
  tile(w, h, 'the trio', () => { only(hs); camera.fov = 30; camera.position.set(0, 1.25, 6.4); camera.lookAt(0, 1.0, 0); camTarget.set(0, 1.0, 0); });
}
await renderTiles();
window.__ready = true;
