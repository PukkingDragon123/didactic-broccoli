// Display furniture for the museum. Each builder returns { group, slots, owner?, update?, light? }.
// Local frame: origin at the footprint centre on the floor, front = +z. Textured throughout (src/gfx/hdtex.js); the
// sculpted parts are our own lowpix models (art/lowpix/world/made/r5_props.py: the hina-dan with its dolls, the space
// capsule; r4_props.py: the shrine roof, the diorama landscape) and the wrapped candies (candy_own), loaded lazily.
import * as THREE from 'three';
import { pixMat, boxMesh } from '../gfx/geo.js';
import { assetSlot, assetNow, loadAsset, preloadAssets } from '../kit/assets.js';
import { lpAsset } from '../kit/lowpixWorld.js';
import { treeInstances } from '../world/foliage.js';
import { hash2 } from '../core/util.js';

const glassMat = () => new THREE.MeshPhysicalMaterial({ color: 0xf4fbff, transparent: true, opacity: 0.13, roughness: 0.03, clearcoat: 1, envMapIntensity: 2, depthWrite: false, side: THREE.DoubleSide });
const ledMat = (c = 0xfff0d8, k = 1.8) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) });

// the sculpted parts start loading with the museum (so the shop's previews have them); built lazily either way
if (typeof document !== 'undefined') preloadAssets(['hinadan_own', 'diorama_own', 'shrine_roof_own', 'pod2_own', 'candy_own'].map(lpAsset));

function add(group, mesh, x, y, z) { mesh.position.set(x, y, z); group.add(mesh); return mesh; }
// the metals, the plaster and the cords, all painted textures
const brass = () => pixMat('steel', { color: 0xe0b450, metalness: 0.9, roughness: 0.3 });
const chrome = () => pixMat('steel', { color: 0xe4e8ee, metalness: 0.9, roughness: 0.3 });
const gunmetal = () => pixMat('steel', { color: 0x4a4644, metalness: 0.5, roughness: 0.4 });
const plastic = (c) => pixMat('shikkui', { color: c, roughness: 0.35, bump: 0.3 });
/** One of our own models at (x, y, z) in the display's frame. */
function own(group, id, x, y, z, ry = 0) {
  const m = assetSlot(lpAsset(id), {});
  m.position.set(x, y, z); m.rotation.y = ry;
  group.add(m);
  return m;
}
function slotRow(slots, n, y, z, width, rotY = 0) {
  for (let i = 0; i < n; i++) slots.push({ pos: new THREE.Vector3(-width / 2 + (width / n) * (i + 0.5), y, z), rotY, size: [width / n, 0.13, 0.12], plaqueZ: 0.05 });
}
function glassBox(group, w, h, d, x, y, z, edges = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), glassMat());
  m.position.set(x, y + h / 2, z);
  m.renderOrder = 3;
  m.userData.noRim = true;
  group.add(m); // arch: the case's glass box (glazing)
  // thin metal edges
  if (!edges) return m;
  const em = chrome();
  for (const [ex, ez] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(group, new THREE.Mesh(new THREE.BoxGeometry(0.012, h, 0.012), em), x + ex * w / 2, y + h / 2, z + ez * d / 2); // arch: the glass box's metal glazing bars
  for (const ey of [0, h]) for (const ez of [-1, 1]) add(group, new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, 0.012), em), x, y + ey, z + ez * d / 2); // arch: the glass box's metal glazing bars
  return m;
}
/** A heap of wrapped fruit candies (our candy_own model, instanced) in a disc of radius r on y. */
function candyBed(group, r, y) {
  const make = () => {
    const t = assetNow(lpAsset('candy_own'));
    let src = null;
    t?.traverse((o) => { if (o.isMesh && !src) src = o; });
    if (!src) return false;
    const pts = [];
    for (let layer = 0; layer < 2; layer++) {
      for (let gx = -r; gx <= r; gx += 0.034) for (let gz = -r; gz <= r; gz += 0.026) {
        const k = hash2(Math.round(gx * 100) + layer * 7, Math.round(gz * 100));
        const x = gx + (k - 0.5) * 0.012 + (layer ? 0.017 : 0), z = gz + (hash2(gz * 100, gx * 100 + layer) - 0.5) * 0.01 + (layer ? 0.013 : 0);
        if (Math.hypot(x, z) > r - 0.02 || (layer && k < 0.35)) continue;
        pts.push([x, y + layer * 0.014, z, k * 6.283, layer]);
      }
    }
    const im = new THREE.InstancedMesh(src.geometry, src.material, pts.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
    pts.forEach(([x, yy, z, a, l], i) => im.setMatrixAt(i, m4.compose(new THREE.Vector3(x, yy, z), q.setFromEuler(e.set(l ? 0.25 : 0, a, l ? 0.2 : 0)), one)));
    im.castShadow = true; im.receiveShadow = true;
    group.add(im);
    return true;
  };
  if (!make()) loadAsset(lpAsset('candy_own')).then(make).catch(() => {});
}

/** The diorama landscape's ground height (m, above the table) at (x, z): the same field r4_props.py sculpted. */
function dioramaHeight(x, z) {
  const y = -z, W = 1.42;
  const river = y - Math.sin((x + W / 2) / W * 6.283 * 1.1) * 0.1125;
  let h = 0.05 + 0.025 * Math.sin(x * 5) * Math.cos(y * 6) + (x < -0.45 ? 0.05 * (-x - 0.45) / 0.26 : 0);
  h = Math.max(0.012, Math.min(0.12, h));
  const rv = Math.abs(river) / 0.045;
  if (rv < 1) h = 0.008 + (h - 0.008) * rv * rv;
  return h;
}

export const BUILDERS = {
  case_glass() {
    const g = new THREE.Group(), slots = [];
    const wood = pixMat('woodDark', { roughness: 0.5 });
    void wood;
    own(g, 'display_case', 0, 0, 0); // the case, its velvet top, brass plate and the glass box's metal edges (r6)
    glassBox(g, 0.96, 0.22, 0.46, 0, 0.84, 0, false);
    slotRow(slots, 4, 0.84, 0.02, 0.92);
    return { group: g, slots, mats: [{ y: 0.8408, w: 0.94, d: 0.44 }] };
  },
  shelf_open() {
    const g = new THREE.Group(), slots = [];
    const wood = pixMat('woodLight', { roughness: 0.6 });
    void wood;
    own(g, 'shelf_open', 0, 0, 0); // (r6 shelf_open: shelf tops at 0.0625 / 0.4625 / 0.8625 / 1.2625)
    for (const y of [0.4625, 0.8625, 1.2625]) slotRow(slots, 5, y, 0.02, 0.94);
    return { group: g, slots, mats: [0.4633, 0.8633, 1.2633].map((y) => ({ y, w: 0.95, d: 0.34 })) };
  },
  pedestal(opts = {}) {
    const g = new THREE.Group(), slots = [];
    add(g, boxMesh(0.42, 0.06, 0.42, pixMat('woodDark', { roughness: 0.4 })), 0, 0.03, 0);
    add(g, boxMesh(0.34, 0.9, 0.34, pixMat('shikkui', { roughness: 0.35 })), 0, 0.51, 0);
    add(g, boxMesh(0.4, 0.04, 0.4, brass()), 0, 0.98, 0);
    glassBox(g, 0.3, 0.26, 0.3, 0, 1.0, 0);
    slots.push({ pos: new THREE.Vector3(0, 1.0, 0), rotY: 0, size: [0.28, 0.24, 0.28], plaqueZ: 0.12 });
    // light beam cone (visual)
    const beam = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.8, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2c8, transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    beam.position.set(0, 1.95, 0);
    beam.userData.noRim = true;
    beam.raycast = () => {};
    g.add(beam);
    // real spotlights are budgeted (each light costs every pixel); extra pedestals rely on the beam glow
    if (opts.light !== false) {
      const spot = new THREE.SpotLight(0xfff0d0, 6, 3.2, 0.32, 0.5, 1.5);
      spot.position.set(0, 2.9, 0.05);
      spot.target.position.set(0, 1.0, 0);
      g.add(spot, spot.target);
    }
    // velvet rope stanchions
    for (const sx of [-1, 1]) add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.8, 8), brass()), sx * 0.32, 0.4, 0.38);
    const rope = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.012, 6, 16, Math.PI), pixMat('velvet', { color: 0xc8303a, roughness: 0.8 }));
    rope.rotation.z = Math.PI; rope.position.set(0, 0.78, 0.38); rope.scale.y = 0.4;
    g.add(rope);
    return { group: g, slots, spotlight: true, mats: [{ y: 1.0008, w: 0.29, d: 0.29 }] };
  },
  cabinet_tall() {
    const g = new THREE.Group(), slots = [];
    const frame = gunmetal();
    add(g, boxMesh(1.0, 0.12, 0.46, frame), 0, 0.06, 0);
    add(g, boxMesh(1.0, 0.06, 0.46, frame), 0, 1.83, 0);
    add(g, boxMesh(0.98, 1.7, 0.02, pixMat('woodDark')), 0, 0.97, -0.21);
    glassBox(g, 0.98, 1.7, 0.44, 0, 0.12, 0);
    for (const y of [0.3, 0.78, 1.26]) {
      add(g, new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.012, 0.4), new THREE.MeshPhysicalMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0.35, roughness: 0.05 })), 0, y, 0);
      add(g, new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.008, 0.01), ledMat()), 0, y + 0.44, 0.19);
      slotRow(slots, 5, y + 0.007, 0.02, 0.92);
    }
    return { group: g, slots, mats: [0.3, 0.78, 1.26].map((y) => ({ y: y + 0.0068, w: 0.93, d: 0.39 })) };
  },
  capsule_tower() {
    const g = new THREE.Group(), slots = [];
    add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.25, 0.3, 24), plastic(0xff6f91)), 0, 0.15, 0).castShadow = true;
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 1.1, 24, 1, true), glassMat());
    tube.position.y = 0.85; tube.renderOrder = 3; tube.userData.noRim = true; g.add(tube);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.21, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), glassMat());
    dome.position.y = 1.4; dome.renderOrder = 3; dome.userData.noRim = true; g.add(dome);
    add(g, new THREE.Mesh(new THREE.TorusGeometry(0.215, 0.012, 8, 24), plastic(0xf4f2ee)), 0, 1.4, 0).rotation.x = Math.PI / 2;
    for (const y of [0.3, 0.66, 1.02]) {
      add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.012, 24), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, roughness: 0.1 })), 0, y, 0);
      for (const sx of [-1, 1]) slots.push({ pos: new THREE.Vector3(sx * 0.085, y + 0.006, 0.02), rotY: 0, size: [0.16, 0.3, 0.3], plaque: false });
    }
    return { group: g, slots, mats: [0.3, 0.66, 1.02].map((y) => ({ y: y + 0.0068, r: 0.195 })) };
  },
  hinadan() {
    const g = new THREE.Group(), slots = [];
    const mats = [];
    // our own hina-dan (r5_props.py): four lacquered steps under a red mosen that hangs over the sides in folds, the
    // emperor and empress before a six-panel gold byobu with two bonbori on the top step, the tachibana and the cherry,
    // diamond rice cakes and lacquered tables at the ends; your toys stand in the middle of the three lower steps
    own(g, 'hinadan_own', 0, 0, 0);
    for (let i = 0; i < 3; i++) {
      const h = 0.25 + i * 0.25 + 0.003, z = 0.375 - i * 0.25;
      slotRow(slots, 6, h, z + 0.01, 1.1);
      mats.push({ y: h + 0.0008, z, w: 1.1, d: 0.22 });
    }
    return { group: g, slots, mats };
  },
  candy_jar() {
    const g = new THREE.Group(), slots = [];
    add(g, boxMesh(0.4, 0.55, 0.4, pixMat('woodLight')), 0, 0.275, 0);
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.42, 24, 1, true), glassMat());
    jar.position.y = 0.76; jar.renderOrder = 3; jar.userData.noRim = true; g.add(jar);
    add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 24), plastic(0xff8fb2)), 0, 1.0, 0);
    add(g, new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), plastic(0xffd23f)), 0, 1.06, 0);
    // a heap of wrapped candies on the jar's floor
    candyBed(g, 0.18, 0.562);
    for (const [x, z] of [[-0.07, -0.06], [0.07, -0.06], [-0.07, 0.07], [0.07, 0.07]]) slots.push({ pos: new THREE.Vector3(x, 0.6, z), rotY: 0, size: [0.13, 0.3, 0.13], plaque: false });
    return { group: g, slots };
  },
  diorama_table() {
    const g = new THREE.Group(), slots = [];
    const wood = pixMat('woodTable', { roughness: 0.5 });
    add(g, boxMesh(1.5, 0.06, 1.0, wood), 0, 0.72, 0);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(g, boxMesh(0.06, 0.69, 0.06, pixMat('woodDark')), sx * 0.69, 0.345, sz * 0.44);
    // the landscape (hills, a river, a footpath, flat plots under the slots) and a few model trees on the hills
    own(g, 'diorama_own', 0, 0.75, 0);
    const trees = { pine: [], keyaki: [] };
    for (const [x, z, kind, s] of [[-0.68, -0.08, 'pine', 0.032], [-0.42, 0.12, 'pine', 0.026], [-0.66, 0.4, 'keyaki', 0.018], [0.0, 0.2, 'keyaki', 0.02],
      [0.4, -0.02, 'pine', 0.028], [0.66, 0.1, 'keyaki', 0.017], [-0.2, 0.42, 'pine', 0.024], [0.22, -0.42, 'pine', 0.022]]) {
      trees[kind].push({ x, y: 0.75 + dioramaHeight(x, z) - 0.004, z, ry: hash2(x * 50, z * 50) * 6.283, s });
    }
    for (const k of Object.keys(trees)) treeInstances(k, g, trees[k], { cast: true });
    for (let i = 0; i < 8; i++) {
      const x = -0.6 + (i % 4) * 0.4, z = i < 4 ? -0.28 : 0.28;
      slots.push({ pos: new THREE.Vector3(x, 0.82, z), rotY: 0, size: [0.2, 0.2, 0.2], plaqueZ: 0.08 });
    }
    return { group: g, slots };
  },
  shrine_case() {
    const g = new THREE.Group(), slots = [];
    add(g, boxMesh(1.0, 0.6, 0.5, pixMat('woodDark', { roughness: 0.6 })), 0, 0.3, 0);
    add(g, boxMesh(1.0, 0.04, 0.5, pixMat('woodLight')), 0, 0.62, 0);
    glassBox(g, 0.96, 0.58, 0.44, 0, 0.64, 0);
    add(g, boxMesh(0.94, 0.012, 0.4, pixMat('woodLight')), 0, 0.93, 0);
    // a gabled copper roof with katsuogi and chigi (our own model)
    own(g, 'shrine_roof_own', 0, 1.2, 0);
    // shimenawa (a straw rope) + shide (zigzag paper)
    add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.98, 8), pixMat('tatami', { color: 0xe8d8a0, roughness: 0.9 })), 0, 1.2, 0.235).rotation.z = Math.PI / 2;
    const paper = pixMat('fusuma1', { color: 0xffffff, roughness: 0.9, bump: 0.2 }).clone(); paper.side = THREE.DoubleSide;
    for (let i = 0; i < 3; i++) add(g, new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.1), paper), -0.3 + i * 0.3, 1.13, 0.24);
    slotRow(slots, 3, 0.645, 0.02, 0.9);
    slotRow(slots, 3, 0.936, 0.02, 0.9);
    return { group: g, slots, mats: [{ y: 0.6408, w: 0.94, d: 0.42 }, { y: 0.9368, w: 0.93, d: 0.39 }] };
  },
  space_pod() {
    const g = new THREE.Group(), slots = [];
    // the base: a retro space capsule (our own model): fins, a riveted hull with its STAR POD-7 band and portholes, a chrome
    // rim, and four ribs arching over the glass dome to a red beacon
    own(g, 'pod2_own', 0, 0, 0);
    const turntable = new THREE.Group();
    turntable.position.y = 0.3;
    g.add(turntable);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.46, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), glassMat());
    dome.position.y = 0.3; dome.renderOrder = 3; dome.userData.noRim = true; g.add(dome);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      slots.push({ pos: new THREE.Vector3(Math.sin(a) * 0.25, 0, Math.cos(a) * 0.25), rotY: a, size: [0.16, 0.2, 0.16], plaque: false });
    }
    const pl = new THREE.PointLight(0x9fd8ff, 0.9, 1.6, 1.5);
    pl.position.y = 0.55; g.add(pl);
    return { group: g, slots, owner: turntable, update: (dt) => { turntable.rotation.y += dt * 0.25; } };
  },
};

export function buildDisplay(id, opts = {}) {
  const r = BUILDERS[id](opts);
  // displays without flat shelves get a round coaster under every slot
  if (!r.mats) r.mats = r.slots.map((sl) => ({ x: sl.pos.x, y: sl.pos.y + 0.0008, z: sl.pos.z, r: Math.min(sl.size[0], sl.size[2]) * 0.42, onOwner: true }));
  r.group.traverse((m) => { if (m.isMesh && !m.material.transparent) { m.castShadow = true; m.receiveShadow = true; } });
  return r;
}
