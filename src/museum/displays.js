// Display furniture for the museum. Each builder returns { group, slots, owner?, update?, light? }.
// Local frame: origin at the footprint centre on the floor, front = +z. The furniture is modelled with the prop kit
// (src/props/models/fixtures.js: mu_*); the glass panes, glass shelves and LED strips stay here.
import * as THREE from 'three';
import { propMesh } from '../world/props.js';

const glassMat = () => new THREE.MeshPhysicalMaterial({ color: 0xf4fbff, transparent: true, opacity: 0.13, roughness: 0.03, clearcoat: 1, envMapIntensity: 2, depthWrite: false, side: THREE.DoubleSide });
const ledMat = (c = 0xfff0d8, k = 1.8) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) });

function add(group, mesh, x, y, z) { mesh.position.set(x, y, z); group.add(mesh); return mesh; }
function slotRow(slots, n, y, z, width, rotY = 0) {
  for (let i = 0; i < n; i++) slots.push({ pos: new THREE.Vector3(-width / 2 + (width / n) * (i + 0.5), y, z), rotY, size: [width / n, 0.13, 0.12], plaqueZ: 0.05 });
}
/** The glass of a case (its frame is part of the furniture's model). */
function glassBox(group, w, h, d, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), glassMat());
  m.position.set(x, y + h / 2, z);
  m.renderOrder = 3;
  m.userData.noRim = true;
  group.add(m);
  return m;
}
const glass = (geo, y) => { const m = new THREE.Mesh(geo, glassMat()); m.position.y = y; m.renderOrder = 3; m.userData.noRim = true; return m; };
/** The display's furniture model. */
const furniture = (g, id) => { const m = propMesh(id); m.raycast = () => {}; g.add(m); return m; };

export const BUILDERS = {
  case_glass() {
    const g = new THREE.Group(), slots = [];
    furniture(g, 'mu_case_glass');
    glassBox(g, 0.96, 0.22, 0.46, 0, 0.84, 0);
    slotRow(slots, 4, 0.84, 0.02, 0.92);
    return { group: g, slots, mats: [{ y: 0.8408, w: 0.94, d: 0.44 }] };
  },
  shelf_open() {
    const g = new THREE.Group(), slots = [];
    furniture(g, 'mu_shelf_open');
    for (const y of [0.4625, 0.8625, 1.2625]) slotRow(slots, 5, y, 0.02, 0.94);
    return { group: g, slots, mats: [0.4633, 0.8633, 1.2633].map((y) => ({ y, w: 0.95, d: 0.34 })) };
  },
  pedestal(opts = {}) {
    const g = new THREE.Group(), slots = [];
    furniture(g, 'mu_pedestal');
    glassBox(g, 0.3, 0.26, 0.3, 0, 1.0, 0);
    slots.push({ pos: new THREE.Vector3(0, 1.0, 0), rotY: 0, size: [0.28, 0.24, 0.28], plaqueZ: 0.12 });
    // real spotlights are budgeted (each light costs every pixel): the extra pedestals go without
    if (opts.light !== false) {
      const spot = new THREE.SpotLight(0xfff0d0, 6, 3.2, 0.32, 0.5, 1.5);
      spot.position.set(0, 2.9, 0.05);
      spot.target.position.set(0, 1.0, 0);
      g.add(spot, spot.target);
    }
    return { group: g, slots, spotlight: true, mats: [{ y: 1.0008, w: 0.29, d: 0.29 }] };
  },
  cabinet_tall() {
    const g = new THREE.Group(), slots = [];
    furniture(g, 'mu_cabinet_tall');
    glassBox(g, 0.98, 1.7, 0.44, 0, 0.12, 0);
    for (const y of [0.3, 0.78, 1.26]) {
      add(g, new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.012, 0.4), new THREE.MeshPhysicalMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0.35, roughness: 0.05 })), 0, y, 0);
      add(g, new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.008, 0.01), ledMat()), 0, y + 0.428, 0.19);
      slotRow(slots, 5, y + 0.007, 0.02, 0.92);
    }
    return { group: g, slots, mats: [0.3, 0.78, 1.26].map((y) => ({ y: y + 0.0068, w: 0.93, d: 0.39 })) };
  },
  capsule_tower() {
    const g = new THREE.Group(), slots = [];
    furniture(g, 'mu_capsule_tower');
    g.add(glass(new THREE.CylinderGeometry(0.21, 0.21, 1.1, 32, 1, true), 0.85));
    g.add(glass(new THREE.SphereGeometry(0.21, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), 1.4));
    for (const y of [0.3, 0.66, 1.02]) {
      add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.012, 32), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, roughness: 0.1 })), 0, y, 0);
      for (const sx of [-1, 1]) slots.push({ pos: new THREE.Vector3(sx * 0.085, y + 0.006, 0.02), rotY: 0, size: [0.16, 0.3, 0.3], plaque: false });
    }
    return { group: g, slots, mats: [0.3, 0.66, 1.02].map((y) => ({ y: y + 0.0068, r: 0.195 })) };
  },
  hinadan() {
    const g = new THREE.Group(), slots = [];
    furniture(g, 'mu_hinadan');
    const mats = [];
    for (let i = 0; i < 3; i++) {
      const h = 0.25 + i * 0.25, z = 0.33 - i * 0.3;
      slotRow(slots, 6, h, z + 0.02, 1.38);
      mats.push({ y: h + 0.0008, z, w: 1.48, d: 0.29 });
    }
    return { group: g, slots, mats };
  },
  candy_jar() {
    const g = new THREE.Group(), slots = [];
    furniture(g, 'mu_candy_jar');
    g.add(glass(new THREE.CylinderGeometry(0.19, 0.19, 0.42, 32, 1, true), 0.76));
    for (const [x, z] of [[-0.07, -0.06], [0.07, -0.06], [-0.07, 0.07], [0.07, 0.07]]) slots.push({ pos: new THREE.Vector3(x, 0.6, z), rotY: 0, size: [0.13, 0.3, 0.13], plaque: false });
    return { group: g, slots };
  },
  diorama_table() {
    const g = new THREE.Group(), slots = [];
    furniture(g, 'mu_diorama_table');
    for (let i = 0; i < 8; i++) {
      const x = -0.6 + (i % 4) * 0.4, z = i < 4 ? -0.28 : 0.28;
      slots.push({ pos: new THREE.Vector3(x, 0.82, z), rotY: 0, size: [0.2, 0.2, 0.2], plaqueZ: 0.08 });
    }
    return { group: g, slots };
  },
  shrine_case() {
    const g = new THREE.Group(), slots = [];
    furniture(g, 'mu_shrine_case');
    glassBox(g, 0.96, 0.58, 0.44, 0, 0.64, 0);
    slotRow(slots, 3, 0.645, 0.02, 0.9);
    slotRow(slots, 3, 0.936, 0.02, 0.9);
    return { group: g, slots, mats: [{ y: 0.6408, w: 0.94, d: 0.42 }, { y: 0.9368, w: 0.93, d: 0.39 }] };
  },
  space_pod() {
    const g = new THREE.Group(), slots = [];
    furniture(g, 'mu_space_pod');
    const turntable = new THREE.Group();
    turntable.position.y = 0.3;
    g.add(turntable);
    g.add(glass(new THREE.SphereGeometry(0.46, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), 0.3));
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
