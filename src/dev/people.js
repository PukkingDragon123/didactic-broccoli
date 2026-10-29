// Dev page for the low-poly humans (src/people). Renders with the game's post stack (ink outlines, grade).
//   ?show=all            every preset, 3/4 front view, full body           (&seed=3 &walk=1 &t=0.4 &yaw=2.6 &cols=7)
//   ?show=faces          close-ups: presets x expressions                  (&presets=a,b &exprs=x,y &yaw=0.3 &dist=0.6)
//   ?show=gestures       gestures (also while walking with &speed=1.2)    (&preset=a,b &names=wave,bow &t=1.2)
//   ?show=walk           frames of the walk cycle past a fixed side camera (&preset=kid &speed=1.3 &n=8 &span=1.1)
//   ?show=dance          filmstrip of the dance over &beats beats      (&preset=a,b &style=bounce,bon|all &n=8 &bpm=120 &at=4 &stop=1)
//   ?show=turn           presets from several angles                       (&preset=a,b &angs=0,1.57 &zoom=head|upper)
//   ?show=bubbles        a little street scene with people chatting        (&t=2.5 &replace=1 &cz=2.4 &cx=-1)
//   ?show=atlas          the painted 256x256 atlases (&face=1: face block)  (&presets=a,b &scale=3 &expr=happy)
//   ?show=perf           20 random humans: creation / paint / update timings (window.__perf)
//   &hair=bob,long,..    cycle hair styles over the humans built; &nohat=1 removes hats
//   &q=high|medium|low   post-processing quality (default medium)          &w=.. &h=.. tile size
import * as THREE from 'three';
import { Renderer } from '../core/renderer.js';
import { createHuman as mkHuman, HUMAN_PRESETS, Bubbles, Human } from '../people/index.js';
import { makeSpec } from '../people/presets.js';
import { Pix } from '../gfx/pix.js';

let hairI = 0;
function createHuman(o) {
  if (!Q.get('hair') && !Q.has('nohat')) return mkHuman(o);
  const spec = makeSpec(o.preset || 'salaryman', o.seed || 1, o.height);
  if (Q.get('hair')) { const hs = Q.get('hair').split(','); spec.hair.style = hs[hairI++ % hs.length]; }
  if (Q.has('nohat')) spec.hat = null;
  return new Human(spec, { lazy: o.lazy });
}

const errBox = document.getElementById('err');
window.addEventListener('error', (e) => { errBox.textContent += (e.message || e) + '\n'; });
window.addEventListener('unhandledrejection', (e) => { errBox.textContent += String(e.reason?.stack || e.reason) + '\n'; });

const Q = new URLSearchParams(location.search);
const show = Q.get('show') || 'all';
const num = (k, d) => (Q.has(k) ? +Q.get(k) : d);

// ------------------------------------------------------------------ scene: dusk street light
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a2230);
const hemi = new THREE.HemisphereLight(0xffe8d6, 0x4a3a30, 1.35);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffbf8a, 3.2);
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
    const hm = place(createHuman({ preset: id, seed: seed + i * 7, lazy: false }), i * 3);
    const walk = Q.has('walk');
    settle(hm, walk ? 2 + num('t', 0) : 1.5, { speed: walk ? num('speed', 1.25) : 0 });
    tile(w, h, hm.spec.name, `${hm.height.toFixed(2)} m · ${hm.tris} tris`, () => { only([hm]); frameBody(hm, num('yaw', 0.55)); });
  });
} else if (show === 'turn') {
  const ids = Q.get('preset') ? Q.get('preset').split(',') : presetIds;
  const w = num('w', 260), h = num('h', 420);
  const angs = Q.get('angs') ? Q.get('angs').split(',').map(Number) : [0, 0.75, 1.57, 2.4, 3.14, -1.57];
  grid.style.gridTemplateColumns = `repeat(${num('cols', angs.length)}, ${w}px)`;
  ids.forEach((id, i) => {
    const hm = place(createHuman({ preset: id, seed: seed + i * 7, lazy: false }), i * 3);
    settle(hm, 1.5);
    for (const a of angs) tile(w, h, hm.spec.name, `yaw ${a}`, () => { only([hm]); frameBody(hm, a, num('pitch', 0.05)); });
  });
}

else if (show === 'faces') {
  const exprs = Q.get('exprs') ? Q.get('exprs').split(',') : ['neutral', 'smile', 'happy', 'surprised', 'sad', 'angry', 'sleepy', 'blink'];
  const w = num('w', 180), h = num('h', 200);
  grid.style.gridTemplateColumns = `repeat(${num('cols', exprs.length)}, ${w}px)`;
  presetIds.forEach((id, i) => exprs.forEach((ex, k) => {
    const hm = place(createHuman({ preset: id, seed: seed + i * 7, lazy: false }), i * 3, k * 3);
    settle(hm, 0.5);
    hm.setExpression?.(ex);
    settle(hm, 0.5);
    tile(w, h, hm.spec.name, ex, () => { only([hm]); frameHead(hm, num('yaw', 0.25), num('dist', 0.75)); });
  }));
}

else if (show === 'walk') {
  // the human really walks (+x) past a fixed side camera: planted feet must not slide between frames
  const n = num('n', 8), speed = num('speed', 1.3), w = num('w', 190), h = num('h', 300), id = Q.get('preset') || 'salaryman';
  const T = num('span', 1.1); // seconds covered by the frames
  grid.style.gridTemplateColumns = `repeat(${n}, ${w}px)`;
  for (let i = 0; i < n; i++) {
    const hm = place(createHuman({ preset: id, seed, lazy: false }), 0, 0);
    hm.root.rotation.y = Math.PI / 2;
    const t0 = 2 + (T * i) / n, dt = 1 / 120;
    let x = -speed * 2 - 0.6;
    for (let t = 0; t < t0; t += dt) { x += speed * dt; hm.root.position.x = x; hm.update(dt, { speed }); }
    tile(w, h, hm.spec.name, `t+${(T * i / n).toFixed(2)}s`, () => {
      only([hm]);
      camera.position.set(0, hm.height * 0.5, 4.2); camera.lookAt(0, hm.height * 0.45, 0); camTarget.set(0, hm.height * 0.45, 0);
    });
  }
}
else if (show === 'gestures') {
  const names = Q.get('names') ? Q.get('names').split(',') : ['wave', 'bow', 'point', 'cheer', 'think', 'photo', 'talk', 'clap', 'shrug', 'browse', 'carry'];
  const ids = Q.get('preset') ? Q.get('preset').split(',') : ['salaryman'];
  const w = num('w', 200), h = num('h', 320);
  grid.style.gridTemplateColumns = `repeat(${Math.min(names.length, num('cols', 6))}, ${w}px)`;
  ids.forEach((id, j) => names.forEach((g, i) => {
    const hm = place(createHuman({ preset: id, seed: seed + j, lazy: false }), i * 3, j * 3);
    settle(hm, 1);
    hm.gesture(g);
    settle(hm, num('t', 1.0), { talking: g === 'talk', speed: num('speed', 0) });
    tile(w, h, hm.spec.name, g, () => { only([hm]); frameBody(hm, num('yaw', 0.6), num('pitch', 0.08)); });
  }));
}
else if (show === 'dance') {
  // one row per preset (or per style with &style=all): n frames spread over `beats` beats, starting `at` beats in
  const ids = Q.get('preset') ? Q.get('preset').split(',') : ['salaryman'];
  const styles = Q.get('style') === 'all' ? ['bounce', 'disco', 'step', 'wave', 'bon', 'twist', 'robot'] : (Q.get('style') || '').split(',').map((x) => x || undefined);
  const n = num('n', 8), beats = num('beats', 2), bpm = num('bpm', 120), at = num('at', 4), w = num('w', 170), h = num('h', 280);
  grid.style.gridTemplateColumns = `repeat(${n}, ${w}px)`;
  let row = 0;
  for (const id of ids) for (const st of styles) {
    for (let i = 0; i < n; i++) {
      const hm = place(createHuman({ preset: id, seed: seed + row, lazy: false }), i * 3, row * 3);
      settle(hm, 1);
      hm.gesture('dance', { bpm, style: st, mirror: Q.has('mirror') ? Q.get('mirror') === '1' : undefined });
      const T = (at + (beats * i) / n) * 60 / bpm, dt = 1 / 120;
      for (let t = 0; t < T - 1e-6; t += dt) hm.update(dt, Q.has('look') ? { lookAt: new THREE.Vector3(i * 3, 1.5, row * 3 + 5) } : {});
      if (Q.has('stop')) { hm.stopDance(); settle(hm, num('stop', 1), {}, dt); }
      tile(w, h, `${hm.spec.name} ${hm.gestures[0]?.pose && (hm.gestures.find((g) => g.name === 'dance')?.pose.style || '')}`, `b ${(at + beats * i / n).toFixed(2)}`, () => { only([hm]); frameBody(hm, num('yaw', 0.0), num('pitch', 0.06)); });
    }
    row++;
  }
}
else if (show === 'perf') {
  const N = num('n', 20), out = [];
  let t0 = performance.now();
  const hs = [];
  for (let i = 0; i < N; i++) hs.push(createHuman({ seed: 100 + i }));
  const tc = performance.now() - t0;
  t0 = performance.now();
  let steps = 0, worst = 0;
  let worstEnd = 0;
  while (hs.some((h) => h.job)) { const h = hs.find((x) => x.job), a = performance.now(); const done = h.stepPaint(); const dtm = performance.now() - a; if (hs.indexOf(h) > 2) { if (done) worstEnd = Math.max(worstEnd, dtm); else worst = Math.max(worst, dtm); } steps++; }
  const tp = performance.now() - t0;
  const t1 = performance.now(); for (let i = 0; i < 5; i++) createHuman({ seed: 300 + i, lazy: false }).dispose(); const te = (performance.now() - t1) / 5;
  hs.forEach((hm, i) => place(hm, (i % 5) * 1.2 - 2.4, -Math.floor(i / 5) * 1.5));
  t0 = performance.now();
  const F = 300;
  for (let f = 0; f < F; f++) hs.forEach((hm, i) => hm.update(1 / 60, { speed: i % 3 ? 1.2 : 0, talking: i % 4 === 0, lookAt: i % 2 ? camera.position : null }));
  const tu = (performance.now() - t0) / F;
  const tris = hs.reduce((a, h) => a + h.tris, 0);
  out.push(`${N} humans: create (lazy) ${(tc / N).toFixed(1)} ms each + time-sliced paint ${(tp / N).toFixed(1)} ms each (${steps} slices, worst ${worst.toFixed(1)} ms, final face step ${worstEnd.toFixed(1)} ms); eager create ${te.toFixed(1)} ms; update ${tu.toFixed(2)} ms/frame for all (incl. face repaints), ${tris} tris total (${(tris / N).toFixed(0)} avg)`);
  const w = 900, h = 520;
  grid.style.gridTemplateColumns = `${w}px`;
  tile(w, h, out[0], '', () => { only(hs); camera.position.set(0, 2.2, 6.5); camera.lookAt(0, 0.9, -2); camTarget.set(0, 0.9, -2); });
  console.log(out[0]); window.__perf = out[0];
}
else if (show === 'atlas') {
  const sc = num('scale', 3);
  grid.style.gridTemplateColumns = `repeat(${num('cols', 2)}, ${Q.has('face') ? 64 * sc : 256 * sc}px)`;
  presetIds.forEach((id, i) => {
    const hm = createHuman({ preset: id, seed: seed + i * 7, lazy: false });
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

if (show === 'bubbles') {
  // a little dusk street scene: people chatting in speech bubbles, seen from the player's eye height
  grid.remove();
  const W = innerWidth, Hh = innerHeight;
  const stage = document.getElementById('stage');
  stage.appendChild(R.renderer.domElement);
  R.renderer.setSize(W, Hh); R.composer.setSize(W, Hh);
  camera.fov = 55; camera.aspect = W / Hh; camera.updateProjectionMatrix();
  const cz = num('cz', 4.6), cx = num('cx', 0);
  camera.position.set(cx, 1.62, cz); camera.lookAt(cx * 0.8, num('ly', 1.25), 0); camTarget.set(cx, 1.2, 0);
  sun.position.set(-6, 5, 7); sun.target.position.set(0, 0, 0);
  back.position.set(0, 12, -30);
  const cast = [['salaryman', -2.1, -0.4, 0.5], ['schoolgirl', -0.7, 0.3, 0.15], ['grandpa', 0.8, -0.2, -0.4], ['kid', 1.7, 0.6, -0.5], ['gyaru', 3.2, -1.6, -0.6], ['tourist', -3.6, -2.2, 0.8]];
  const hs = cast.map(([id, x, z, ry], i) => { const hm = place(createHuman({ preset: id, seed: seed + i * 5, lazy: false }), x, z); hm.root.rotation.y = ry; return hm; });
  const bubbles = new Bubbles(camera, document.body);
  const T = num('t', 2.6);
  const script = [[0.0, 0, 'Is that old gacha garage open again?', 'say'], [0.3, 2, 'Hmm... I remember buying capsule toys here.', 'think'], [0.6, 3, 'WOW! A secret one!', 'shout'], [0.2, 1, 'No way!', 'say'], [0.9, 4, 'So cute!', 'say'], [1.4, 5, 'Excuse me, is this the way to the station?', 'say']];
  if (Q.has('replace')) script.push([T - 0.2, 0, 'Oh! Wait, it says OPEN!', 'say']);
  const dt = 1 / 60;
  const said = new Set();
  for (let t = 0; t < T; t += dt) {
    script.forEach((sc, i) => { if (!said.has(i) && t >= sc[0]) { said.add(i); bubbles.say(hs[sc[1]], sc[2], { style: sc[3], dur: 6 }); } });
    hs.forEach((hm, i) => hm.update(dt, { talking: bubbles.isTalking(hm), lookAt: i === 3 ? hs[2].root.position.clone().setY(1.4) : camera.position }));
    if (t > 0.5 && !hs[3].currentGesture) hs[3].gesture('cheer');
    if (t > 0.3 && !hs[2].currentGesture) hs[2].gesture('think');
    bubbles.update(dt);
  }
  scene.updateMatrixWorld(true);
  R.render(dt, T);
}
if (show === 'avatar') {
  // the player's avatar wearing each cosmetic (&items=dino,chicken &look=hair:bob,body:f &pose=selfie &zoom=head|upper &t=1.2)
  const { createAvatarHuman, COSMETICS, AVATAR_DEFAULT } = await import('../people/avatar.js');
  const look = Object.fromEntries((Q.get('look') || '').split(',').filter(Boolean).map((kv) => kv.split(':')));
  const items = Q.get('items') ? Q.get('items').split(',') : ['none', ...COSMETICS.map((c) => c.id)];
  const w = num('w', 200), h = num('h', 320);
  grid.style.gridTemplateColumns = `repeat(${Math.min(items.length, num('cols', 6))}, ${w}px)`;
  items.forEach((id, i) => {
    const c = COSMETICS.find((x) => x.id === id);
    const a = { ...AVATAR_DEFAULT, ...look };
    if (c) a[c.slot] = id;
    for (const extra of (Q.get('also') || '').split(',').filter(Boolean)) { const e = COSMETICS.find((x) => x.id === extra); if (e) a[e.slot] = extra; }
    const hm = place(createAvatarHuman(a), i * 3);
    settle(hm, 1);
    if (Q.get('pose')) hm.gesture(Q.get('pose'), { side: num('side', 1) });
    if (Q.get('expr')) hm.setExpression(Q.get('expr'));
    settle(hm, num('t', 1.2), { speed: num('speed', 0) });
    tile(w, h, c ? c.name : 'Default', c ? `¥${c.price}` : '', () => { only([hm]); frameBody(hm, num('yaw', 0.5), num('pitch', 0.08)); });
  });
}

await renderTiles();
document.getElementById('info').textContent = `${people.length} humans`;
window.__ready = true;
