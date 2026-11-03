// Per-instance culling for the town's instanced voxel props (performance). Each prop type is one InstancedMesh whose
// instances are spread along the whole lane, so the renderer's frustum test (one sphere around all of them) always
// passes and every bicycle, crate and vending machine was drawn even when it stood behind you; a single bicycle is
// ~27k triangles. Each frame this keeps, per InstancedMesh, only the instances whose own bounding sphere is in the
// view and within a draw distance that grows with the prop's size (big things such as trees and poles always stay;
// the quality preset's `view` scales it). The instance buffer is rewritten only when the visible set changes.
//   const c = new InstanceCuller();  c.add(instancedMesh)   after its matrices are set
//   c.update(camera, viewScale)       every frame (Town.update)
import * as THREE from 'three';

const _f = new THREE.Frustum(), _pm = new THREE.Matrix4(), _m = new THREE.Matrix4(), _cam = new THREE.Vector3();

export class InstanceCuller {
  constructor() { this.list = []; }

  add(im) {
    const geo = im.geometry;
    if (!geo.boundingSphere) geo.computeBoundingSphere();
    const n = im.count, base = im.instanceMatrix.array.slice(0, n * 16);
    const spheres = [];
    let r = 0;
    for (let i = 0; i < n; i++) {
      _m.fromArray(base, i * 16);
      const s = geo.boundingSphere.clone().applyMatrix4(_m);
      r = Math.max(r, s.radius);
      s.radius += 0.3; // margin: the camera may still turn a little before this frame is drawn
      spheres.push(s);
    }
    // draw distance: small props go first, anything taller than a person always stays
    const far = r > 1.6 ? Infinity : THREE.MathUtils.clamp(r * 60, 25, 90);
    this.list.push({ im, base, spheres, far, shown: null, idx: new Int32Array(n) });
  }

  update(camera, viewScale = 1) {
    _pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    _f.setFromProjectionMatrix(_pm);
    camera.getWorldPosition(_cam);
    for (const e of this.list) {
      const im = e.im;
      let vis = true;
      for (let a = im.parent; vis && a; a = a.parent) vis = a.visible; // (a zone hidden by Town.updateZones)
      if (!vis) continue;
      const far = e.far * viewScale, idx = e.idx;
      let n = 0;
      for (let i = 0; i < e.spheres.length; i++) {
        const s = e.spheres[i];
        if (_cam.distanceTo(s.center) - s.radius > far || !_f.intersectsSphere(s)) continue;
        idx[n++] = i;
      }
      // unchanged since last frame?
      const prev = e.shown;
      if (prev && prev.length === n) {
        let same = true;
        for (let k = 0; k < n; k++) if (prev[k] !== idx[k]) { same = false; break; }
        if (same) continue;
      }
      e.shown = idx.slice(0, n);
      const arr = im.instanceMatrix.array;
      for (let k = 0; k < n; k++) arr.set(e.base.subarray(idx[k] * 16, idx[k] * 16 + 16), k * 16);
      im.count = n;
      im.visible = n > 0; // an empty instanced draw still costs a draw call
      im.instanceMatrix.clearUpdateRanges();
      im.instanceMatrix.addUpdateRange(0, Math.max(16, n * 16));
      im.instanceMatrix.needsUpdate = true;
    }
  }
}
