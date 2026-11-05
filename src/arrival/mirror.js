// The driver's door mirror, working for one shot of the opening: its glass shows a live, low-resolution render of the
// lane (nearest-filtered, so it stays pixel art) instead of its painted reflection. It's a film cheat rather than an
// optical mirror: the view comes from the mirror head toward a point you choose (Grandpa's stool), flipped left to
// right like a reflection, so the shot can show him waking up "behind" you. Rendered once a frame from the glass's
// onBeforeRender, while the glass is drawn, into a half-float target the main pipeline then tone-maps with the rest.
//   const m = new DoorMirror(van, () => game.frame)   m.aim(worldTarget, fov)   m.dispose()
import * as THREE from 'three';

// the glass of the driver's door mirror (src/life/van.js buildDoor / src/vehicles/parts.js doorMirror), in the door
// pivot's space (the door hangs at x = -0.7375, z = 1.585 in the body): centre, size; it faces the van's rear (-z)
const GLASS = { x: -0.115, y: 1.2, z: -0.1365, w: 0.084, h: 0.124 };
const RT_W = 72, RT_H = 106;

export class DoorMirror {
  constructor(van, frameOf) {
    this.van = van;
    this.frameOf = frameOf; // the game's frame counter: one reflection per frame, whatever the passes
    this.rt = new THREE.WebGLRenderTarget(RT_W, RT_H, { type: THREE.HalfFloatType, magFilter: THREE.NearestFilter, minFilter: THREE.NearestFilter, generateMipmaps: false, depthBuffer: true });
    this.cam = new THREE.PerspectiveCamera(22, RT_W / RT_H, 0.1, 160);
    this.target = new THREE.Vector3();
    const tex = this.rt.texture;
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.x = -1; tex.offset.x = 1; // a reflection: left and right swapped
    const m = new THREE.MeshBasicMaterial({ map: tex, toneMapped: true, fog: false });
    const glass = this.glass = new THREE.Mesh(new THREE.PlaneGeometry(GLASS.w, GLASS.h), m);
    glass.position.set(GLASS.x, GLASS.y, GLASS.z - 0.0012);
    glass.rotation.y = Math.PI; // facing the rear, where the driver looks at it from
    glass.name = 'arrival-mirror';
    glass.raycast = () => {};
    glass.userData.noRim = true;
    glass.onBeforeRender = (r) => this.draw(r);
    van.doorPivot.add(glass);
    this.frame = -1;
  }

  /** Point the reflection at a world position (the middle of the view) with a vertical field of view. */
  aim(target, fov = 22) {
    this.target.copy(target);
    if (this.cam.fov !== fov) { this.cam.fov = fov; this.cam.updateProjectionMatrix(); }
  }

  draw(r) {
    const f = this.frameOf();
    if (this.busy || f === this.frame) return; // once a frame (the AO pass draws the scene a second time)
    this.frame = f;
    const g = this.glass, scene = this.findScene();
    if (!scene) return;
    g.updateWorldMatrix(true, false);
    g.getWorldPosition(this.cam.position);
    this.cam.lookAt(this.target);
    this.cam.updateMatrixWorld();
    this.busy = true;
    const prevRT = r.getRenderTarget(), prevShadow = r.shadowMap.autoUpdate, prevXR = r.xr.enabled;
    g.visible = false;
    r.xr.enabled = false;
    r.shadowMap.autoUpdate = false; // (the shadows of this frame are drawn already)
    try {
      r.setRenderTarget(this.rt);
      r.state.buffers.depth.setMask(true);
      if (r.autoClear === false) r.clear();
      r.render(scene, this.cam);
    } finally {
      r.setRenderTarget(prevRT);
      r.shadowMap.autoUpdate = prevShadow;
      r.xr.enabled = prevXR;
      g.visible = true;
      this.busy = false;
    }
  }

  findScene() {
    let o = this.glass;
    while (o.parent) o = o.parent;
    return o.isScene ? o : null;
  }

  dispose() {
    this.glass.removeFromParent();
    this.glass.geometry.dispose();
    this.glass.material.dispose();
    this.rt.dispose();
  }
}
