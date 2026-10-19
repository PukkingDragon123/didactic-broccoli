// The main menu's settings button: a chunky voxel gear parked in the top-right corner of the view.
// It hangs off the camera a few centimetres in front of the lens (closer than anything in the street,
// so it never clips into the world but still gets the ink outlines), spins slowly, and on hover spins
// up, swells and glows. Uses the 'menu_gear' prop when it exists, else builds its own gear.
import * as THREE from 'three';
import { VoxelModel, gloss, matte } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { hasProp, propGeometry } from './props.js';

const DIST = 0.22; // metres in front of the camera
const MARGIN = 20; // px from the screen corner

function buildGearModel() {
  const v = new VoxelModel();
  v.jitter = 0.02;
  const R = 11, BODY = 8.2, HUB = 4.2, HOLE = 2.1, TEETH = 8;
  // cream enamel body (reads on the dark sky and, with its ink hull, on lit walls), brass hub, red cap
  const brass = 0xf3e9d2, brassHi = 0xfffaf0, brassLo = 0xb8a47e, ink = 0x5a3a26, cream = 0xffd23f, red = 0xe5383b;
  for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
    const r = Math.hypot(x + 0.5, y + 0.5) - 0.5;
    if (r > R) continue;
    const a = Math.atan2(y + 0.5, x + 0.5);
    const tooth = Math.cos(a * TEETH) > 0.12; // square-ish teeth
    if (r > BODY && !(tooth && r <= R)) continue;
    if (r < HOLE) continue;
    for (let z = -2; z <= 2; z++) {
      const face = z === 2 || z === -2;
      let c;
      if (r < HUB) c = face ? (r < HUB - 1.2 ? red : cream) : brassLo;
      else if (r > BODY - 1.3 || (tooth && r > BODY)) c = face ? (r > R - 1 || r > BODY + 1.6 ? brassHi : brass) : brassLo;
      else c = face ? brass : brassLo;
      // spokes cut-outs between hub and rim, on the faces only (adds depth)
      if (face && r > HUB + 0.4 && r < BODY - 1.6 && Math.cos(a * 4 + 0.4) > 0.55) c = ink;
      v.set(x, y, z, z === 2 && r >= HUB ? gloss(c) : matte(c));
    }
  }
  return v;
}

function boostedMaterials(boost) {
  const make = (rough, metal) => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: metal });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uBoost = boost;
      sh.fragmentShader = sh.fragmentShader
        .replace('void main() {', 'uniform float uBoost;\nvoid main() {')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += diffuseColor.rgb * uBoost;');
    };
    m.customProgramCacheKey = () => 'menu-gear';
    return m;
  };
  const matteM = make(0.6, 0.1), glossM = make(0.3, 0.35);
  return [matteM, glossM, glossM, matteM, matteM];
}

export class MenuGear {
  constructor(camera) {
    this.camera = camera;
    this.boost = { value: 0.42 };
    let geo = hasProp('menu_gear') ? propGeometry('menu_gear')?.clone() : null;
    if (geo) {
      geo.computeBoundingBox();
      const s = geo.boundingBox.getSize(new THREE.Vector3());
      if (s.y < Math.min(s.x, s.z) * 0.6) geo.rotateX(Math.PI / 2); // modelled lying flat: stand it up
    } else geo = meshVoxels(buildGearModel(), { voxelSize: 1, origin: 'center' });
    geo.computeBoundingBox();
    geo.translate(...geo.boundingBox.getCenter(new THREE.Vector3()).negate().toArray());
    geo.computeBoundingSphere();
    this.radius = geo.boundingSphere.radius;
    this.mesh = new THREE.Mesh(geo, boostedMaterials(this.boost));
    this.mesh.castShadow = false; this.mesh.receiveShadow = false;
    this.mesh.frustumCulled = false;
    this.mesh.userData.noRim = true;
    this.mesh.raycast = () => {};
    // inverted-hull ink outline: a slightly fatter black copy showing only its back faces
    this.hull = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x1a1216, side: THREE.BackSide, fog: false }));
    this.hull.scale.set(1.09, 1.09, 1.5);
    this.hull.frustumCulled = false;
    this.hull.raycast = () => {};
    this.mesh.add(this.hull);
    // tilt the gear towards the room so its thickness reads, then spin it about its own axle
    this.tilt = new THREE.Group();
    this.tilt.rotation.set(0.32, -0.42, 0);
    this.tilt.add(this.mesh);
    this.root = new THREE.Group();
    this.root.add(this.tilt);
    camera.add(this.root);
    this.hover = false;
    this.h = 0;
    this.spin = 0.7;
    this.sizePx = 64;
    this.layout();
    document.body.classList.add('has-3d-gear');
  }

  /** Keep the gear in the top-right corner for the current fov / aspect. */
  layout() {
    const cam = this.camera, H = innerHeight, W = innerWidth;
    this.sizePx = Math.round(Math.max(56, Math.min(92, H * 0.105)));
    const tan = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
    const half = DIST * tan; // half the view height at DIST
    const k = 1 + this.h * 0.18;
    const r = this.sizePx / 2;
    this.ndc = { x: 1 - (2 * (MARGIN + r)) / W, y: 1 - (2 * (MARGIN + r)) / H, r };
    this.root.position.set(this.ndc.x * half * cam.aspect, this.ndc.y * half, -DIST);
    this.root.scale.setScalar(((this.sizePx / H) * 2 * half / 2 / this.radius) * k);
  }

  pick(camera, ndcX, ndcY) {
    if (!this.root.parent) return false;
    const dx = (ndcX - this.ndc.x) * innerWidth / 2, dy = (ndcY - this.ndc.y) * innerHeight / 2;
    return Math.hypot(dx, dy) < this.ndc.r * 1.25;
  }

  update(dt) {
    this.h += ((this.hover ? 1 : 0) - this.h) * Math.min(1, dt * 10);
    this.spin += ((this.hover ? 4.2 : 0.7) - this.spin) * Math.min(1, dt * 4);
    this.mesh.rotation.z -= this.spin * dt;
    this.tilt.rotation.y = -0.42 + Math.sin(performance.now() / 1300) * 0.06;
    this.boost.value = 0.42 + this.h * 0.7;
    this.layout();
  }

  dispose() {
    this.root.parent?.remove(this.root);
    this.mesh.geometry.dispose();
    this.hull.material.dispose();
    for (const m of new Set(this.mesh.material)) m.dispose();
    document.body.classList.remove('has-3d-gear');
  }
}
