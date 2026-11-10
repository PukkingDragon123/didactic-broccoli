// Dev only: a photo stage for prop turntables (src/props/dev/stage.html on the dev server). It uses the game's own
// renderer (cel ramp, lilac shadows, ink outlines, the grade) without booting the game, so a sheet of 300 props
// takes a couple of minutes.   propStage.cap(id, { voxel, az, el, zoom }) -> { url (PNG data URL), tris, calls, size }
import '@fontsource/dotgothic16/400.css';
import * as THREE from 'three';
import { Renderer } from '../../core/renderer.js';
import * as P from '../../world/props.js';
import { allPages, flushPages } from '../kit/page.js';
import { voxelMaterials } from '../../voxel/materials.js';

const R = new Renderer(document.getElementById('app'));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc9d6e2);
const camera = new THREE.PerspectiveCamera(28, innerWidth / innerHeight, 0.03, 160);
scene.add(camera);
const pm = new THREE.PMREMGenerator(R.renderer);
{
  // a soft outdoor probe (sky above, warm walls at the horizon, the road below), about what the game's own probe gives
  const es = new THREE.Scene(), g = new THREE.SphereGeometry(10, 24, 12), col = [], p = g.attributes.position, c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const t = p.getY(i) / 10; c.setRGB(...(t > 0.15 ? [0.5, 0.6, 0.72] : t > -0.1 ? [0.55, 0.5, 0.44] : [0.26, 0.24, 0.22])); col.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  es.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  scene.environment = pm.fromScene(es, 0.04).texture;
  scene.environmentIntensity = 0.85;
}
const sun = new THREE.DirectionalLight(0xfff2dc, 2.6);
sun.castShadow = true;
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.01;
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xb9cfe8, 0x6b5a4a, 0.95);
scene.add(hemi);
const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xb9b2a6, roughness: 0.95 }));
floor.receiveShadow = true;
scene.add(floor);
R.setup(scene, camera);
R.setQuality('high');
R.registerShadowLight(sun, 1);
let cur = null, time = 0;

function frame(obj, o) {
  const box = new THREE.Box3().setFromObject(obj), c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
  const r = Math.max(0.01, 0.5 * Math.hypot(s.x, s.y, s.z));
  const fov = o.fov ?? 28;
  camera.fov = fov; camera.aspect = innerWidth / innerHeight; camera.near = Math.max(0.004, r * 0.05); camera.far = 160;
  camera.updateProjectionMatrix();
  const d = (r * (o.zoom ?? 1.08)) / Math.sin((fov * Math.PI) / 360), az = o.az ?? 0.6, el = o.el ?? 0.38;
  camera.position.set(c.x + Math.sin(az) * Math.cos(el) * d, c.y + Math.sin(el) * d, c.z + Math.cos(az) * Math.cos(el) * d);
  camera.lookAt(c);
  // a studio sun: high, from the front left of the camera; its shadow box hugs the prop
  const a = az - 0.9, sc = sun.shadow.camera, k = Math.max(0.3, r * 2.2);
  sun.target.position.copy(c);
  sun.position.set(c.x + Math.sin(a) * 12, c.y + 13, c.z + Math.cos(a) * 12);
  sc.left = -k; sc.right = k; sc.top = k; sc.bottom = -k; sc.near = 1; sc.far = 40; sc.updateProjectionMatrix();
  return { r, size: [s.x, s.y, s.z], min: box.min.toArray(), max: box.max.toArray() };
}

function cap(id, o = {}) {
  if (cur) { scene.remove(cur); cur = null; }
  let m;
  try { m = o.voxel ? P.voxelPropMesh(id) : P.propMesh(id); } catch (e) { return { err: String(e?.stack || e) }; }
  if (!m) return { err: 'no mesh' };
  if (o.compat && m.geometry?.userData.lowPoly) m.material = voxelMaterials('normal'); // how code that has not switched to propMaterials() draws it
  m.traverse((x) => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } });
  flushPages();
  const raw = new THREE.Box3().setFromObject(m);
  m.position.y -= raw.min.y; // sit it on the floor whatever its origin
  scene.add(m); cur = m;
  scene.updateMatrixWorld(true);
  const info = frame(m, o);
  let tris = 0, calls = 0;
  m.traverse((x) => { if (x.isMesh) { const g = x.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; calls += Array.isArray(x.material) ? g.groups.length || 1 : 1; } });
  for (let i = 0; i < 3; i++) { sun.shadow.needsUpdate = true; R.renderer.shadowMap.needsUpdate = true; R.render(0, (time += 0.016)); }
  return { url: R.renderer.domElement.toDataURL('image/png'), tris, calls, lowPoly: !!m.geometry?.userData.lowPoly, raw: [...raw.min.toArray(), ...raw.max.toArray()], ...info };
}
/** The atlas pages as PNG data URLs (to look at the paint). */
function pages() { return allPages().map((p) => ({ name: p.family + p.n, used: p.used, props: p.props, url: p.canvas().toDataURL('image/png') })); }

window.propStage = { cap, pages, P, scene, R };
document.fonts.load('16px "DotGothic16"', '止まれ火の用心ゴミ出しルール燃えるキケン郵便消火器氷灯油').catch(() => {}).then(() => { window.__ready = true; });
