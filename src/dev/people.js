// Dev page for the low-poly humans (src/people). Renders with the game's post stack (ink outlines, AO, grade).
//   ?show=all            every preset, 3/4 front view, full body         (&seed=3 &walk=1 &t=0.4 &cols=7)
//   ?show=faces          close-ups: presets x expressions               (&presets=a,b &exprs=x,y &angle=0.3)
//   ?show=gestures       one preset doing every gesture                  (&preset=salaryman &t=1.2)
//   ?show=walk           sequential frames of the walk cycle (side view) (&preset=..&speed=1.3&n=8)
//   ?show=turn           one human from several angles                   (&preset=..)
//   ?show=bubbles        a little street scene with people talking in speech bubbles (&t=2.5)
//   &q=high|medium|low   post-processing quality (default medium)        &w=..&h=.. tile size
import '@fontsource/tiny5/400.css';
import * as THREE from 'three';
import { Renderer } from '../core/renderer.js';
import { createHuman, HUMAN_PRESETS } from '../people/index.js';
import { Pix } from '../gfx/pix.js';

const errBox = document.getElementById('err');
window.addEventListener('error', (e) => { errBox.textContent += (e.message || e) + '\n'; });
window.addEventListener('unhandledrejection', (e) => { errBox.textContent += String(e.reason?.stack || e.reason) + '\n'; });

const Q = new URLSearchParams(location.search);
const show = Q.get('show') || 'all';
const num = (k, d) => (Q.has(k) ? +Q.get(k) : d);

// ------------------------------------------------------------------ scene: dusk street light
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a2230);
const hemi = new THREE.HemisphereLight(0xffe4cc, 0x4a3a30, 1.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffa868, 3.0);
sun.position.set(-4, 4.5, 6);
sun.castShadow = true;
Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 30 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight(0xa0b4ff, 0.9);
fill.position.set(5, 3, -3);
scene.add(fill);

function groundTex() {
  const p = new Pix(64, 64, 9);
  p.fill(0x4a4440).noise(0.12).speckle(0.05, [0x3a3532, 0x5a524c, 0x2f2b29]);
  const t = p.texture({ repeat: [160, 160] });
  return t;
}
const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ map: groundTex(), roughness: 0.95 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
// dusk backdrop far behind (gives the ink-outline pass a depth edge around silhouettes)
const sky = (() => {
  const c = document.createElement('canvas'); c.width = 4; c.height = 128;
  const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, '#2c2a4a'); gr.addColorStop(0.55, '#a8607a'); gr.addColorStop(0.8, '#f0a070'); gr.addColorStop(1, '#ffd8a0');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const back = new THREE.Mesh(new THREE.PlaneGeometry(120, 40), new THREE.MeshBasicMaterial({ map: sky, fog: false }));
back.position.set(0, 12, -30);
scene.add(back);

const R = new Renderer(document.createElement('div'));
R.qualityName = Q.get('q') || 'medium';
R.quality = { low: { pixelRatio: 1, shadows: 1024, ao: false, bloom: true, aa: true, shadowEvery: 1 }, medium: { pixelRatio: 1, shadows: 2048, ao: false, bloom: true, aa: true, shadowEvery: 1 }, high: { pixelRatio: 1, shadows: 2048, ao: true, bloom: true, aa: true, shadowEvery: 1 } }[R.qualityName];
const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 100);
const camTarget = new THREE.Vector3();
R.scene = scene; R.camera = camera;
R.buildComposer();
R.registerShadowLight(sun, 1);
let curW = 0, curH = 0;
function size(w, h) {
  if (w === curW && h === curH) return;
  curW = w; curH = h;
  R.renderer.setSize(w, h, false);
  R.composer.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}

// ------------------------------------------------------------------ tiles
const grid = document.getElementById('grid');
const people = [];
const tiles = [];
function tile(w, h, label, sub, setup) {
  const cell = document.createElement('div'); cell.className = 'cell';
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const lb = document.createElement('div'); lb.className = 'lbl'; lb.innerHTML = `${label}${sub ? `<span>${sub}</span>` : ''}`;
  cell.append(cv, lb); grid.append(cell);
  tiles.push({ w, h, cv, setup });
}
function frameBody(hm, yaw = 0.55, pitch = 0.08, fill = 0.9) {
  const z = Q.get('zoom');
  const H = hm.height, cy = z === 'head' ? H - 0.13 : z === 'upper' ? H * 0.78 : H * 0.5, half = z === 'head' ? 0.16 : z === 'upper' ? H * 0.24 : H * 0.5;
  const tgt = new THREE.Vector3().copy(hm.root.position).setY(cy);
  const dist = (half / fill) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) + 0.3;
  const a = hm.root.rotation.y + yaw;
  camera.position.set(tgt.x + Math.sin(a) * Math.cos(pitch) * dist, tgt.y + Math.sin(pitch) * dist, tgt.z + Math.cos(a) * Math.cos(pitch) * dist);
  camera.lookAt(tgt); camTarget.copy(tgt);
}
function frameHead(hm, yaw = 0.3, dist = 0.75) {
  const v = new THREE.Vector3();
  hm.root.updateMatrixWorld(true);
  hm.headTop(v); v.y -= 0.36; // head centre-ish
  const a = hm.root.rotation.y + yaw;
  camera.position.set(v.x + Math.sin(a) * dist, v.y + 0.03, v.z + Math.cos(a) * dist);
  camera.lookAt(v); camTarget.copy(v);
}
function only(list) { for (const p of people) p.root.visible = list.includes(p); }
function place(hm, x, z = 0) { hm.root.position.set(x, 0, z); people.push(hm); scene.add(hm.root); return hm; }
function settle(hm, sec, opts = {}, dt = 1 / 60) { for (let t = 0; t < sec; t += dt) hm.update(dt, opts); }

async function renderTiles() {
  for (const t of tiles) {
    size(t.w, t.h);
    t.setup();
    // key light from the camera's front-left (consistent across views), cool rim from behind
    const cy = Math.atan2(camera.position.x - camTarget.x, camera.position.z - camTarget.z);
    sun.target.position.copy(camTarget).setY(0);
    sun.position.set(camTarget.x + Math.sin(cy - 0.8) * 6, 5, camTarget.z + Math.cos(cy - 0.8) * 6);
    fill.position.set(camTarget.x + Math.sin(cy + 2.6) * 6, 3, camTarget.z + Math.cos(cy + 2.6) * 6);
    back.position.set(camTarget.x - Math.sin(cy) * 30, 12, camTarget.z - Math.cos(cy) * 30); back.lookAt(camera.position.x, 12, camera.position.z);
    R.render(1 / 60, 1);
    t.cv.getContext('2d').drawImage(R.renderer.domElement, 0, 0, t.w, t.h);
    await new Promise((r) => setTimeout(r, 0));
  }
}

// ------------------------------------------------------------------ views
const presetIds = Q.get('presets') ? Q.get('presets').split(',') : HUMAN_PRESETS.map((p) => p.id);
const seed = num('seed', 1);

if (show === 'all') {
  const cols = num('cols', 7), w = num('w', 220), h = num('h', 360);
  grid.style.gridTemplateColumns = `repeat(${cols}, ${w}px)`;
  presetIds.forEach((id, i) => {
    const hm = place(createHuman({ preset: id, seed: seed + i * 7 }), i * 3);
    const walk = Q.has('walk');
    settle(hm, walk ? 2 + num('t', 0) : 1.5, { speed: walk ? num('speed', 1.25) : 0 });
    tile(w, h, hm.spec.name, `${hm.height.toFixed(2)} m · ${hm.tris} tris`, () => { only([hm]); frameBody(hm, num('yaw', 0.55)); });
  });
} else if (show === 'turn') {
  const hm = place(createHuman({ preset: Q.get('preset') || presetIds[0], seed }), 0);
  settle(hm, 1.5);
  const w = num('w', 260), h = num('h', 420);
  const angs = [0, 0.75, 1.57, 2.4, 3.14, -1.57];
  grid.style.gridTemplateColumns = `repeat(${angs.length}, ${w}px)`;
  for (const a of angs) tile(w, h, hm.spec.name, `yaw ${a}`, () => { only([hm]); frameBody(hm, a, 0.05); });
}

else if (show === 'faces') {
  const exprs = Q.get('exprs') ? Q.get('exprs').split(',') : ['neutral', 'smile', 'happy', 'surprised', 'sad', 'angry', 'sleepy', 'blink'];
  const w = num('w', 180), h = num('h', 200);
  grid.style.gridTemplateColumns = `repeat(${exprs.length}, ${w}px)`;
  presetIds.forEach((id, i) => exprs.forEach((ex, k) => {
    const hm = place(createHuman({ preset: id, seed: seed + i * 7 }), i * 3, k * 3);
    settle(hm, 0.5);
    hm.setExpression?.(ex);
    settle(hm, 0.5);
    tile(w, h, hm.spec.name, ex, () => { only([hm]); frameHead(hm, num('yaw', 0.25), num('dist', 0.75)); });
  }));
}

else if (show === 'atlas') {
  const sc = num('scale', 3);
  grid.style.gridTemplateColumns = `repeat(${num('cols', 2)}, ${Q.has('face') ? 64 * sc : 256 * sc}px)`;
  presetIds.forEach((id, i) => {
    const hm = createHuman({ preset: id, seed: seed + i * 7 });
    if (Q.get('expr')) { hm.setExpression?.(Q.get('expr')); settle(hm, 0.5); }
    hm.pix.flush();
    const cell = document.createElement('div'); cell.className = 'cell';
    const cv = document.createElement('canvas'); cv.width = 256 * sc; cv.height = 256 * sc;
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.fillStyle = '#f0f'; g.fillRect(0, 0, cv.width, cv.height);
    if (Q.has('face')) { const b = hm.face.B; cv.width = b.w * sc; cv.height = b.h * sc; g.imageSmoothingEnabled = false; g.drawImage(hm.pix.canvas, b.x, b.y, b.w, b.h, 0, 0, cv.width, cv.height); cv.style.width = cv.width + 'px'; }
    else g.drawImage(hm.pix.canvas, 0, 0, cv.width, cv.height);
    const lb = document.createElement('div'); lb.className = 'lbl'; lb.textContent = `${hm.spec.name} atlas`;
    cell.append(cv, lb); grid.append(cell);
  });
}

await renderTiles();
document.getElementById('info').textContent = `${people.length} humans`;
window.__ready = true;
