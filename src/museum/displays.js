// Display furniture for the museum. Each builder returns { group, slots, owner?, update?, light? }.
// Local frame: origin at the footprint centre on the floor, front = +z.
import * as THREE from 'three';
import { pixMat, boxMesh, colMat } from '../gfx/geo.js';
import { VoxelModel, glow, metal, gloss, glass } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { voxelMaterials } from '../voxel/materials.js';
import { C } from '../voxel/palette.js';
import { hash2 } from '../core/util.js';

const glassMat = () => new THREE.MeshPhysicalMaterial({ color: 0xf4fbff, transparent: true, opacity: 0.13, roughness: 0.03, clearcoat: 1, envMapIntensity: 2, depthWrite: false, side: THREE.DoubleSide });
const ledMat = (c = 0xfff0d8, k = 1.8) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) });

function add(group, mesh, x, y, z) { mesh.position.set(x, y, z); group.add(mesh); return mesh; }
function slotRow(slots, n, y, z, width, rotY = 0) {
  for (let i = 0; i < n; i++) slots.push({ pos: new THREE.Vector3(-width / 2 + (width / n) * (i + 0.5), y, z), rotY, size: [width / n, 0.13, 0.12], plaqueZ: 0.05 });
}
function glassBox(group, w, h, d, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), glassMat());
  m.position.set(x, y + h / 2, z);
  m.renderOrder = 3;
  m.userData.noRim = true;
  group.add(m);
  // thin metal edges
  const em = colMat(0xd8dce2, { metalness: 0.9, roughness: 0.3 });
  for (const [ex, ez] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(group, new THREE.Mesh(new THREE.BoxGeometry(0.012, h, 0.012), em), x + ex * w / 2, y + h / 2, z + ez * d / 2);
  for (const ey of [0, h]) for (const ez of [-1, 1]) add(group, new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, 0.012), em), x, y + ey, z + ez * d / 2);
  return m;
}
function voxMesh(build, vs) {
  const v = new VoxelModel(); build(v);
  const m = new THREE.Mesh(meshVoxels(v, { voxelSize: vs }), voxelMaterials('normal'));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export const BUILDERS = {
  case_glass() {
    const g = new THREE.Group(), slots = [];
    const wood = pixMat('woodDark', { roughness: 0.5 });
    add(g, boxMesh(1.0, 0.82, 0.5, wood), 0, 0.41, 0);
    add(g, boxMesh(0.96, 0.02, 0.46, pixMat('velvet', { roughness: 0.9 })), 0, 0.83, 0);
    glassBox(g, 0.96, 0.22, 0.46, 0, 0.84, 0);
    add(g, boxMesh(0.9, 0.06, 0.02, colMat(0xd4a83a, { metalness: 0.9, roughness: 0.3 })), 0, 0.7, 0.252);
    slotRow(slots, 4, 0.84, 0.02, 0.92);
    return { group: g, slots };
  },
  shelf_open() {
    const g = new THREE.Group(), slots = [];
    const wood = pixMat('woodLight', { roughness: 0.6 });
    for (const sx of [-1, 1]) add(g, boxMesh(0.03, 1.55, 0.36, wood), sx * 0.485, 0.775, 0);
    add(g, boxMesh(1.0, 1.55, 0.02, pixMat('woodDark')), 0, 0.775, -0.17);
    for (const y of [0.05, 0.45, 0.85, 1.25]) add(g, boxMesh(0.97, 0.025, 0.36, wood), 0, y, 0);
    add(g, boxMesh(1.0, 0.03, 0.36, wood), 0, 1.55, 0);
    for (const y of [0.4625, 0.8625, 1.2625]) slotRow(slots, 5, y, 0.02, 0.94);
    return { group: g, slots };
  },
  pedestal(opts = {}) {
    const g = new THREE.Group(), slots = [];
    add(g, boxMesh(0.42, 0.06, 0.42, colMat(0x2a2220, { roughness: 0.4 })), 0, 0.03, 0);
    add(g, boxMesh(0.34, 0.9, 0.34, colMat(0xf4f2ec, { roughness: 0.35 })), 0, 0.51, 0);
    add(g, boxMesh(0.4, 0.04, 0.4, colMat(0xd4a83a, { metalness: 1, roughness: 0.25 })), 0, 0.98, 0);
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
    for (const sx of [-1, 1]) add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.8, 8), colMat(0xd4a83a, { metalness: 1, roughness: 0.3 })), sx * 0.32, 0.4, 0.38);
    const rope = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.012, 6, 16, Math.PI), colMat(0x9a1f2a, { roughness: 0.8 }));
    rope.rotation.z = Math.PI; rope.position.set(0, 0.78, 0.38); rope.scale.y = 0.4;
    g.add(rope);
    return { group: g, slots, spotlight: true };
  },
  cabinet_tall() {
    const g = new THREE.Group(), slots = [];
    const frame = colMat(0x2a2624, { metalness: 0.5, roughness: 0.4 });
    add(g, boxMesh(1.0, 0.12, 0.46, frame), 0, 0.06, 0);
    add(g, boxMesh(1.0, 0.06, 0.46, frame), 0, 1.83, 0);
    add(g, boxMesh(0.98, 1.7, 0.02, pixMat('woodDark')), 0, 0.97, -0.21);
    glassBox(g, 0.98, 1.7, 0.44, 0, 0.12, 0);
    for (const y of [0.3, 0.78, 1.26]) {
      add(g, new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.012, 0.4), new THREE.MeshPhysicalMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0.35, roughness: 0.05 })), 0, y, 0);
      add(g, new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.008, 0.01), ledMat()), 0, y + 0.44, 0.19);
      slotRow(slots, 5, y + 0.007, 0.02, 0.92);
    }
    return { group: g, slots };
  },
  capsule_tower() {
    const g = new THREE.Group(), slots = [];
    add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.25, 0.3, 24), new THREE.MeshPhysicalMaterial({ color: 0xff6f91, roughness: 0.25, clearcoat: 1 })), 0, 0.15, 0).castShadow = true;
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 1.1, 24, 1, true), glassMat());
    tube.position.y = 0.85; tube.renderOrder = 3; tube.userData.noRim = true; g.add(tube);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.21, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), glassMat());
    dome.position.y = 1.4; dome.renderOrder = 3; dome.userData.noRim = true; g.add(dome);
    add(g, new THREE.Mesh(new THREE.TorusGeometry(0.215, 0.012, 8, 24), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.2, clearcoat: 1 })), 0, 1.4, 0).rotation.x = Math.PI / 2;
    for (const y of [0.3, 0.66, 1.02]) {
      add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.012, 24), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, roughness: 0.1 })), 0, y, 0);
      for (const sx of [-1, 1]) slots.push({ pos: new THREE.Vector3(sx * 0.085, y + 0.006, 0.02), rotY: 0, size: [0.16, 0.3, 0.3], plaque: false });
    }
    return { group: g, slots };
  },
  hinadan() {
    const g = new THREE.Group(), slots = [];
    const felt = pixMat('velvet', { roughness: 0.95, color: 0xffb0b0 });
    for (let i = 0; i < 3; i++) {
      const h = 0.25 + i * 0.25, z = 0.33 - i * 0.3;
      add(g, boxMesh(1.5, h, 0.3, felt), 0, h / 2, z);
      slotRow(slots, 6, h, z + 0.02, 1.38);
    }
    // gold byobu screen
    const scr = voxMesh((v) => {
      for (let p = 0; p < 6; p++) for (let x = 0; x < 12; x++) for (let y = 0; y < 30; y++) v.set(p * 12 + x - 36, y, (p % 2) * 2, (x === 0 || y === 0 || y === 29) ? 0x2a1a10 : gloss(hash2(x + p * 12, y) < 0.08 ? 0xfff0a0 : 0xe8c050));
      v.box(-30, 8, 3, -26, 14, 3, 0xff8fb2); v.box(10, 18, 3, 14, 22, 3, 0xff8fb2);
    }, 0.02);
    scr.position.set(0, 0.75, -0.43);
    g.add(scr);
    // bonbori lanterns
    for (const sx of [-1, 1]) {
      add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.25, 6), colMat(0x2a1a10)), sx * 0.66, 0.875, -0.27);
      add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.12, 12), ledMat(0xffe0b0, 1.4)), sx * 0.66, 1.05, -0.27);
    }
    return { group: g, slots };
  },
  candy_jar() {
    const g = new THREE.Group(), slots = [];
    add(g, boxMesh(0.4, 0.55, 0.4, pixMat('woodLight')), 0, 0.275, 0);
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.42, 24, 1, true), glassMat());
    jar.position.y = 0.76; jar.renderOrder = 3; jar.userData.noRim = true; g.add(jar);
    add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 24), new THREE.MeshPhysicalMaterial({ color: 0xff8fb2, roughness: 0.3, clearcoat: 1 })), 0, 1.0, 0);
    add(g, new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), new THREE.MeshPhysicalMaterial({ color: 0xffd23f, roughness: 0.2, clearcoat: 1 })), 0, 1.06, 0);
    // candy bed
    const bed = voxMesh((v) => {
      for (let x = -8; x <= 8; x++) for (let z = -8; z <= 8; z++) if (x * x + z * z <= 64) v.set(x, Math.floor(hash2(x, z) * 2), z, gloss([0xff6f91, 0x5cc4ff, 0xffd23f, 0x58c06c, 0xffffff][Math.floor(hash2(z, x) * 5)]));
    }, 0.022);
    bed.position.y = 0.555; g.add(bed);
    for (const [x, z] of [[-0.07, -0.06], [0.07, -0.06], [-0.07, 0.07], [0.07, 0.07]]) slots.push({ pos: new THREE.Vector3(x, 0.6, z), rotY: 0, size: [0.13, 0.3, 0.13], plaque: false });
    return { group: g, slots };
  },
  diorama_table() {
    const g = new THREE.Group(), slots = [];
    const wood = pixMat('woodTable', { roughness: 0.5 });
    add(g, boxMesh(1.5, 0.06, 1.0, wood), 0, 0.72, 0);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(g, boxMesh(0.06, 0.69, 0.06, pixMat('woodDark')), sx * 0.69, 0.345, sz * 0.44);
    const terrain = voxMesh((v) => {
      for (let x = -35; x <= 34; x++) for (let z = -22; z <= 22; z++) {
        const river = Math.abs(z - Math.sin(x / 8) * 6) < 2.5;
        const h = river ? 0 : 1 + Math.max(0, Math.round((Math.sin(x / 7) + Math.cos(z / 6)) * 1.5 + (x < -20 ? (x + 20) * -0.25 : 0)));
        for (let y = 0; y <= h; y++) v.set(x, y, z, river ? glass(0x5ab8f0) : y === h ? (hash2(x, z) < 0.1 ? 0x8fd06a : 0x6db84c) : 0x8a6a4a);
        if (!river && hash2(x * 3, z) < 0.012) { for (let y = h + 1; y < h + 4; y++) v.set(x, y, z, 0x6a4a2a); v.sphere(x, h + 5, z, 2, 0x3a8a3a); }
      }
    }, 0.02);
    terrain.position.y = 0.75;
    g.add(terrain);
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
    const roof = voxMesh((v) => {
      for (let i = 0; i < 9; i++) v.box(-30 + i, i, -15 + Math.floor(i / 2), 29 - i, i, 14 - Math.floor(i / 2), i === 0 ? 0x2a2a30 : 0x3a5a4a);
      v.box(-31, 0, -16, -30, 1, 15, metal(C.gold)); v.box(29, 0, -16, 30, 1, 15, metal(C.gold));
      v.box(-2, 9, -10, 1, 11, 9, 0x2a2a30);
    }, 0.017);
    roof.position.y = 1.22;
    g.add(roof);
    // shimenawa + shide
    add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.98, 8), colMat(0xd8c080, { roughness: 0.9 })), 0, 1.2, 0.235).rotation.z = Math.PI / 2;
    for (let i = 0; i < 3; i++) add(g, new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.1), colMat(0xffffff, { extra: { side: THREE.DoubleSide } })), -0.3 + i * 0.3, 1.13, 0.24);
    slotRow(slots, 3, 0.645, 0.02, 0.9);
    slotRow(slots, 3, 0.936, 0.02, 0.9);
    return { group: g, slots };
  },
  space_pod() {
    const g = new THREE.Group(), slots = [];
    const base = voxMesh((v) => {
      for (let x = -24; x <= 24; x++) for (let z = -24; z <= 24; z++) {
        const d = x * x + z * z;
        if (d > 576) continue;
        for (let y = 0; y < 14; y++) v.set(x, y, z, d > 520 ? (y % 4 === 1 ? glow(0x7ad8ff) : metal(0xb8c0d0)) : 0x14183a);
        if (d <= 520 && hash2(x, z) < 0.03) v.set(x, 14, z, glow(0xffffff)); else if (d <= 520) v.set(x, 14, z, 0x0f1230);
      }
    }, 0.02);
    g.add(base);
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
  r.group.traverse((m) => { if (m.isMesh && !m.material.transparent) { m.castShadow = true; m.receiveShadow = true; } });
  return r;
}
