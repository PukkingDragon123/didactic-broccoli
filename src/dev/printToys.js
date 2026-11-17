// Dev page for the print bake (tools/render-toys.mjs): renders the ACTUAL in-game toys (makeItemMesh: the lowpix GLBs,
// the game's own materials and finishes) one by one as clean product shots on a transparent background, lit like a
// catalogue photo (a big soft key, a fill and a rim; no glow). The bake composes them onto real photo backdrops
// (tools/bake-cards.py). Only works under the Vite dev server.
//   printtoys.html  ->  window.renderToy(key, { size, yaw, pitch, finish }) -> PNG data URL;  window.toyList() -> [...]
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SERIES } from '../data/series/index.js';
import { makeItemMesh, whenItemReady } from '../game/collectibles.js';
import { RARITIES } from '../data/rarity.js';

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.setClearColor(0x000000, 0);
document.body.append(renderer.domElement);
const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;
const key = new THREE.DirectionalLight(0xfff4e6, 2.4); key.position.set(-1.2, 2.0, 1.6); scene.add(key);
const fill = new THREE.DirectionalLight(0xe6eeff, 0.7); fill.position.set(1.6, 0.6, 1.2); scene.add(fill);
const rim = new THREE.DirectionalLight(0xffffff, 1.1); rim.position.set(0.4, 1.4, -2.0); scene.add(rim);
scene.add(new THREE.HemisphereLight(0xfff8f0, 0x6a6058, 0.55));
const cam = new THREE.PerspectiveCamera(22, 1, 0.001, 10);

window.toyList = () => SERIES.filter((s) => !s.hidden).map((s) => ({
  id: s.id, name: s.name, jp: s.jp, price: s.price, card: s.card || null, order: s.order,
  items: s.items.map((it) => ({ key: it.key, id: it.id, name: it.name, jp: it.jp || '', rarity: it.rarity, secret: it.rarity === 'secret' })),
}));
window.rarities = () => RARITIES;

/** Render one toy: the mesh framed by its bounding box from a 3/4 view, size x size px, transparent. */
window.renderToy = async (k, { size = 384, yaw = -0.45, pitch = 0.16, finish = 'normal' } = {}) => {
  await whenItemReady(k);
  const m = makeItemMesh(k, finish);
  const holder = new THREE.Group(); holder.add(m); scene.add(holder);
  m.rotation.y = yaw;
  holder.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(m);
  const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
  const r = Math.max(s.x, s.y, s.z) * 0.5 * 1.08 + 1e-4;
  const d = r / Math.sin(THREE.MathUtils.degToRad(cam.fov / 2));
  cam.position.set(c.x, c.y + Math.sin(pitch) * d, c.z + Math.cos(pitch) * d);
  cam.lookAt(c);
  renderer.setSize(size, size, false);
  renderer.render(scene, cam);
  const url = renderer.domElement.toDataURL('image/png');
  scene.remove(holder);
  return url;
};
window.__ready = true;
