// Developer model viewer: renders a grid of voxel models for visual checks / screenshots.
// URL params:
//   ?series=mochi            all items of a series
//   ?item=mochi/shiba&finishes=1   one item in every finish
//   ?props=garage            all props from src/data/props/<name>.js (default export: { id: {name, build(v), voxel} })
//   &angle=back              view from behind;  &cols=4  grid columns
import '@fontsource/dotgothic16/400.css';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SERIES_BY_ID, getItem } from './data/series/index.js';
import { makeItemMesh } from './game/collectibles.js';
import { FINISHES } from './data/finishes.js';
import { RARITIES } from './data/rarity.js';
import { VoxelModel } from './voxel/VoxelModel.js';
import { meshVoxels } from './voxel/mesher.js';
import { voxelMaterials } from './voxel/materials.js';

const errBox = document.getElementById('err');
window.addEventListener('error', (e) => { errBox.textContent += (e.message || e) + '\n'; });

const params = new URLSearchParams(location.search);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.setScissorTest(true);
document.body.prepend(renderer.domElement);

const pmrem = new THREE.PMREMGenerator(renderer);
const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

async function loadEntries() {
  const entries = [];
  if (params.get('series')) {
    const s = SERIES_BY_ID[params.get('series')];
    if (!s) throw new Error('No series ' + params.get('series'));
    for (const it of s.items) {
      entries.push({ obj: makeItemMesh(it.key, params.get('finish') || 'normal'), label: `${it.name}<br><span class="r">${it.jp} · ${RARITIES[it.rarity].name}</span>` });
    }
  } else if (params.get('item')) {
    const it = getItem(params.get('item'));
    const list = params.get('finishes') ? Object.keys(FINISHES) : ['normal'];
    for (const f of list) entries.push({ obj: makeItemMesh(it.key, f), label: `${it.name}<br><span class="r">${FINISHES[f].name}</span>` });
  } else if (params.get('props')) {
    const mod = await import(`./data/props/${params.get('props')}.js`);
    const lib = mod.default;
    const only = params.get('only') ? params.get('only').split(',') : null;
    for (const [id, p] of Object.entries(lib)) {
      if (only && !only.includes(id)) continue;
      const v = new VoxelModel();
      p.build(v);
      const geo = meshVoxels(v, { voxelSize: p.voxel || 0.02 });
      const mesh = new THREE.Mesh(geo, voxelMaterials('normal'));
      entries.push({ obj: mesh, label: `${p.name || id}<br><span class="r">${id}</span>` });
    }
  } else if (params.get('chars')) {
    const { buildCharacter } = await import('./game/rig.js');
    const mod = await import(`./data/${params.get('chars')}.js`);
    const lib = mod.default;
    const pose = params.get('pose') || 'walk';
    for (const [id, def] of Object.entries(lib)) {
      def.id = id;
      const variants = def.variants || 1;
      for (let vi = 0; vi < Math.min(variants, +(params.get('variants') || 1)); vi++) {
        const ch = buildCharacter(def, vi);
        if (pose === 'walk') {
          ch.parts.legL.rotation.x = 0.45; ch.parts.legR.rotation.x = -0.45;
          ch.parts.armL.rotation.x = -0.5; ch.parts.armR.rotation.x = 0.5;
          ch.parts.head.rotation.y = 0.25;
        }
        entries.push({ obj: ch.root, label: `${def.name || id}<br><span class="r">${id} v${vi} · ${ch.height.toFixed(2)}m</span>` });
      }
    }
  } else if (params.get('module')) {
    // generic: module exporting viewerEntries() -> [{obj, label}]
    const mod = await import(/* @vite-ignore */ params.get('module'));
    entries.push(...(await mod.viewerEntries(params)));
  }
  return entries;
}

const labels = document.getElementById('labels');
const cells = [];

function layout(entries) {
  const n = entries.length;
  const cols = +(params.get('cols') || Math.ceil(Math.sqrt(n * (innerWidth / innerHeight))));
  const rows = Math.ceil(n / cols);
  const cw = innerWidth / cols, ch = innerHeight / rows;
  entries.forEach((e, i) => {
    const c = i % cols, r = Math.floor(i / cols);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x3a332c);
    scene.environment = env;
    scene.environmentIntensity = 0.55;
    scene.add(new THREE.HemisphereLight(0xfff1e0, 0x40342a, 0.9));
    const sun = new THREE.DirectionalLight(0xfff0d8, 2.2);
    sun.position.set(2, 4, 3);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.01;
    scene.add(sun);
    const obj = e.obj;
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z) * 0.5 || 0.1;
    sun.shadow.camera.left = sun.shadow.camera.bottom = -radius * 3;
    sun.shadow.camera.right = sun.shadow.camera.top = radius * 3;
    sun.shadow.camera.near = 0.01; sun.shadow.camera.far = 20;
    sun.position.copy(center).add(new THREE.Vector3(radius * 4, radius * 8, radius * 6));
    sun.target.position.copy(center);
    scene.add(sun.target);
    scene.add(obj);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(radius * 20, radius * 20), new THREE.MeshStandardMaterial({ color: 0x6b5a48, roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = box.min.y;
    floor.receiveShadow = true;
    scene.add(floor);
    const cam = new THREE.PerspectiveCamera(30, cw / ch, 0.001, 100);
    const back = params.get('angle') === 'back';
    const front = params.get('angle') === 'front';
    const dir = front ? new THREE.Vector3(0.12, 0.12, 1).normalize() : new THREE.Vector3(back ? -0.55 : 0.55, 0.42, back ? -1 : 1).normalize();
    const dist = radius / Math.sin(THREE.MathUtils.degToRad(15)) * (+(params.get('zoom') || 1.15));
    cam.position.copy(center).addScaledVector(dir, dist);
    cam.lookAt(center);
    cells.push({ scene, cam, x: c * cw, y: r * ch, w: cw, h: ch, obj });
    const lbl = document.createElement('div');
    lbl.className = 'lbl';
    lbl.innerHTML = e.label;
    lbl.style.left = `${c * cw + cw / 2}px`;
    lbl.style.top = `${r * ch + ch - 34}px`;
    labels.appendChild(lbl);
  });
}

function render() {
  for (const c of cells) {
    const y = innerHeight - c.y - c.h;
    renderer.setViewport(c.x, y, c.w, c.h);
    renderer.setScissor(c.x, y, c.w, c.h);
    renderer.render(c.scene, c.cam);
  }
}

try {
  const entries = await loadEntries();
  layout(entries);
  await document.fonts.ready;
  render();
  if (params.get('spin')) {
    renderer.setAnimationLoop(() => { for (const c of cells) c.obj.rotation.y += 0.01; render(); });
  }
  window.__ready = true;
} catch (e) {
  errBox.textContent += String(e.stack || e);
  window.__ready = true;
}
