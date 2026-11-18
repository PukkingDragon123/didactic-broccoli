// Dev page for checking the Blender toy figures (art/blender/toys/look.mjs): the ACTUAL in-game mesh (makeItemMesh, the
// game's materials, the baked normal maps) rendered from any angle, at any moment of its gimmick clip, under the
// catalogue light of src/dev/printToys.js or a dimmer shop light. Only works under the Vite dev server.
//   toylook.html  ->  window.look(key, { size, yaw, pitch, t, light, finish, bg }) -> PNG data URL
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeItemMesh, whenItemReady } from '../game/collectibles.js';
import { playFigureClip, stopFigureClip } from '../figures/lowpix.js';

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
document.body.append(renderer.domElement);
const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const key = new THREE.DirectionalLight(0xfff4e6, 2.4); key.position.set(-1.2, 2.0, 1.6); key.castShadow = true; scene.add(key);
key.shadow.mapSize.set(1024, 1024);
const fill = new THREE.DirectionalLight(0xe6eeff, 0.7); fill.position.set(1.6, 0.6, 1.2); scene.add(fill);
const rim = new THREE.DirectionalLight(0xffffff, 1.1); rim.position.set(0.4, 1.4, -2.0); scene.add(rim);
const hemi = new THREE.HemisphereLight(0xfff8f0, 0x6a6058, 0.55); scene.add(hemi);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.22 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const cam = new THREE.PerspectiveCamera(22, 1, 0.001, 10);
const LIGHTS = {
  catalogue: { env: 0.35, key: 2.4, fill: 0.7, rim: 1.1, hemi: 0.55, exp: 1.0 },
  shop: { env: 0.25, key: 1.3, fill: 0.35, rim: 0.5, hemi: 0.5, exp: 0.95 }, // a dim, warm Shōwa shop
};

window.look = async (k, { size = 512, yaw = -0.6, pitch = 0.22, t = null, light = 'catalogue', finish = 'normal', variant = null, bg = null, frame = null } = {}) => {
  await whenItemReady(k);
  const L = LIGHTS[light] || LIGHTS.catalogue;
  scene.environmentIntensity = L.env; key.intensity = L.key; fill.intensity = L.fill; rim.intensity = L.rim; hemi.intensity = L.hemi;
  renderer.toneMappingExposure = L.exp;
  renderer.setClearColor(bg ? new THREE.Color(bg) : 0x000000, bg ? 1 : 0);
  const m = makeItemMesh(k, finish, { variant });
  for (let i = 0; i < 200 && m.userData.vpending; i++) await new Promise((r) => setTimeout(r, 25)); // (a variant's repaint loading)
  const holder = new THREE.Group(); holder.add(m); scene.add(holder);
  m.rotation.y = yaw;
  // the framing box is the rest pose's (or a given one), so every moment of a clip is shot from the same camera
  holder.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(m);
  if (t !== null) {
    const dur = playFigureClip(m, 'gimmick');
    const L2 = m.userData.figLive;
    if (L2) { L2.mixer.setTime(Math.min(t, dur)); L2.hold = true; }
  }
  const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
  const r = (frame || Math.max(s.x, s.y, s.z) * 0.5 * 1.15) + 1e-4;
  const d = r / Math.sin(THREE.MathUtils.degToRad(cam.fov / 2));
  cam.position.set(c.x, c.y + Math.sin(pitch) * d, c.z + Math.cos(pitch) * d);
  cam.lookAt(c);
  floor.scale.setScalar(d * 4);
  key.shadow.camera.left = key.shadow.camera.bottom = -r * 2; key.shadow.camera.right = key.shadow.camera.top = r * 2;
  key.shadow.camera.near = 0.001; key.shadow.camera.far = 10; key.position.set(c.x - 1.2, c.y + 2.0, c.z + 1.6); key.target.position.copy(c);
  key.target.updateMatrixWorld(); key.shadow.camera.updateProjectionMatrix();
  renderer.setSize(size, size, false);
  renderer.render(scene, cam);
  const url = renderer.domElement.toDataURL('image/png');
  stopFigureClip(m);
  scene.remove(holder);
  return url;
};
window.__ready = true;
