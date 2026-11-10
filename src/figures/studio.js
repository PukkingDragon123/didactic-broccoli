// Dev studio for sculpted figures (viewer.html?studio=<series>): each figure photographed through the game's own
// renderer (cel ramp, ink outlines, grade) from a hand-held distance, laid out on one sheet (window.__sheet, a canvas).
//   ?studio=machikado                 every figure of the series; rows: front, three-quarter, back
//   &items=cone,post                  only these          &angles=front,q,back,top,under
//   &finishes=1                       columns: the finishes (first item)      &gimmick=1   rows: t = 0, 0.5, 1
//   &cell=480                         cell size in px (the page's viewport should be the same size)
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Renderer } from '../core/renderer.js';
import { SERIES_BY_ID } from '../data/series/index.js';
import { makeItemMesh } from '../game/collectibles.js';
import { FINISHES } from '../data/finishes.js';
import { playGimmick, figureData, figureAtlas } from './index.js';

const ANGLES = { front: [0, 0.12], q: [-0.62, 0.3], back: [Math.PI, 0.16], side: [-Math.PI / 2, 0.12], top: [0, 1.25], under: [0.5, -1.0], q2: [0.7, 0.34] };

export async function runStudio(params) {
  // ?studio=all: every sheet in one go (window.__sheets: name -> canvas), for the shot scripts
  if (params.get('studio') === 'all') {
    const out = {}, stats = {}, R = makeStage(params);
    for (const id of ['machikado', 'menzoo', 'hakoiri']) {
      out[`${id}_views`] = sheet(R, id, params, 'views'); stats[id] = window.__stats;
      out[`${id}_gimmicks`] = sheet(R, id, params, 'gimmick');
    }
    const q = new URLSearchParams(params); q.set('items', params.get('finishItem') || 'seal');
    out.finishes = sheet(R, 'machikado', q, 'finishes');
    R.host.remove();
    window.__sheets = out; window.__stats = stats;
    return;
  }
  const R = makeStage(params);
  const c = sheet(R, params.get('studio'), params, params.get('finishes') ? 'finishes' : params.get('gimmick') ? 'gimmick' : 'views');
  R.host.remove();
  c.style.cssText = 'display:block;max-width:none';
  document.body.prepend(c);
  window.__sheet = c;
  const A = figureAtlas(params.get('studio'));
  if (params.get('atlas')) { const k = document.createElement('canvas'); k.width = A.w; k.height = A.h; k.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(A.d), A.w, A.h), 0, 0); window.__sheet = k; }
}

function makeStage(params) {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:0;top:0;opacity:0;pointer-events:none';
  document.body.appendChild(host);
  const R = new Renderer(host);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(params.get('bg') ? parseInt(params.get('bg'), 16) : 0xd9d2c4);
  scene.environment = new THREE.PMREMGenerator(R.renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;
  scene.add(new THREE.HemisphereLight(0xfff6ea, 0x8a8298, 0.8));
  const sun = new THREE.DirectionalLight(0xfff1dc, 1.7);
  sun.castShadow = true;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -0.12; sun.shadow.camera.right = sun.shadow.camera.top = 0.12;
  sun.shadow.camera.near = 0.05; sun.shadow.camera.far = 2; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.0006;
  scene.add(sun, sun.target);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(3, 40), new THREE.MeshStandardMaterial({ color: 0xd9d2c4, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  scene.add(floor);
  const cam = new THREE.PerspectiveCamera(22, 1, 0.01, 20);
  R.setup(scene, cam);
  R.registerShadowLight(sun, 1);
  if (R.grade) R.grade.uniforms.uVignette.value = 0;
  return { R, host, scene, sun, floor, cam, time: 0 };
}

/** One sheet of a series: mode 'views' (rows: angles), 'finishes' (columns: finishes of the first item) or 'gimmick' (rows: t). */
function sheet(St, seriesId, params, mode) {
  const { R, scene, sun, floor, cam } = St;
  const S = SERIES_BY_ID[seriesId];
  if (!S) throw new Error('No series ' + seriesId);
  const only = params.get('items')?.split(',');
  const items = S.items.filter((it) => !only || only.includes(it.id));
  const cell = +(params.get('cell') || 480);
  const rows = [];
  if (mode === 'finishes') {
    const fl = ['normal', ...Object.keys(FINISHES).filter((f) => f !== 'normal')];
    for (const a of (params.get('fangles') || 'q').split(',')) rows.push(fl.map((f) => ({ item: items[0], finish: f, angle: a, label: FINISHES[f].name })));
  } else if (mode === 'gimmick') {
    const g = items.filter((it) => Object.keys(figureData(it).defs).length);
    for (const t of [0, 0.5, 1]) rows.push(g.map((it) => ({ item: it, finish: 'normal', angle: 'q', t, label: `${it.name}  t=${t}` })));
  } else {
    for (const a of (params.get('angles') || 'front,q,back').split(',')) rows.push(items.map((it) => ({ item: it, finish: params.get('finish') || 'normal', angle: a, label: it.name })));
  }
  const cols = Math.max(...rows.map((r) => r.length));
  const sheet = document.createElement('canvas');
  sheet.width = cols * cell; sheet.height = rows.length * cell;
  const ctx = sheet.getContext('2d');
  ctx.fillStyle = '#d9d2c4'; ctx.fillRect(0, 0, sheet.width, sheet.height);
  const stats = {};
  for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[r].length; c++) {
    const q = rows[r][c];
    const mesh = makeItemMesh(q.item.key, q.finish);
    if (q.t !== undefined) playGimmick(mesh, q.t);
    scene.add(mesh);
    const sz = mesh.geometry.userData.size, [yaw, pitch] = ANGLES[q.angle] || ANGLES.q;
    const centre = new THREE.Vector3(0, sz.y * 0.5, 0), rad = 0.5 * Math.hypot(sz.x, sz.y, sz.z) * (q.t !== undefined ? 1.25 : 1.02);
    const dist = rad / Math.sin(THREE.MathUtils.degToRad(11)) * 1.0;
    cam.position.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(dist).add(centre);
    cam.lookAt(centre);
    // the key light keeps its place relative to the camera (upper left), like a photographer's lamp
    sun.position.copy(centre).add(new THREE.Vector3(-0.5, 0.9, 0.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).multiplyScalar(0.6));
    sun.target.position.copy(centre);
    floor.visible = pitch > -0.2;
    for (let k = 0; k < 3; k++) { St.time += 0.016; R.render(0.016, St.time); }
    ctx.drawImage(R.renderer.domElement, c * cell, r * cell, cell, cell);
    ctx.fillStyle = '#3a3038'; ctx.font = '13px monospace'; ctx.textAlign = 'center';
    ctx.fillText(`${q.label}${r === 0 && q.t === undefined && mode === 'views' ? ` · ${figureData(q.item).tris} tris` : ''}`, c * cell + cell / 2, r * cell + cell - 8);
    stats[q.item.id] = { tris: figureData(q.item).tris, size: [sz.x, sz.y, sz.z].map((v) => +(v * 1000).toFixed(1)) };
    scene.remove(mesh);
  }
  const A = figureAtlas(S.id);
  stats.atlas = { fill: +A.fill.toFixed(3), ...A.stats };
  window.__stats = stats;
  return sheet;
}
