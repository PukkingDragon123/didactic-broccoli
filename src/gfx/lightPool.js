// Point-light pool (performance). Every lit material evaluates every point light in the scene for every pixel, whether
// the light is near or 30 m away, and adding or removing a point light (an effect flash) recompiles every lit shader.
// So the game's own PointLights never reach the renderer directly: they are moved to a layer the cameras don't see,
// and each frame a fixed number of proxy lights (quality preset `lights`) copies the most relevant ones: lights whose
// range reaches into the view, scored by brightness and closeness. A light that enters or leaves the set fades over a
// fraction of a second, so nothing pops. The shader light count never changes at runtime.
//
// Game code keeps using its PointLights as before (intensity, colour, position, visible on the light or any parent,
// adding new ones at any time). Spot and directional lights (the shadow casters) are untouched.
//   pool.setSize(n)          number of proxies (rebuilds them; one shader recompile, only on a quality change)
//   pool.offer(light, visible)      each PointLight found by the renderer's per-frame scene walk
//   pool.update(scene, camera, dt)   then once per frame before rendering (Renderer.render)
//   pool.stats               { candidates, inView, used } of the last frame (tools/perf.mjs)
import * as THREE from 'three';

export const HIDDEN_LAYER = 30; // pooled originals live here: no camera has it enabled

const _f = new THREE.Frustum(), _pm = new THREE.Matrix4(), _s = new THREE.Sphere(), _v = new THREE.Vector3();
const FADE = 6; // 1/s: about 0.17 s in or out
const SCORE = new WeakMap();

export class LightPool {
  constructor(vmLayer) {
    this.vmLayer = vmLayer;
    this.slots = [];
    this.size = 0;
    this.scene = null;
    this.camPos = new THREE.Vector3(1e9, 0, 0);
    this.cands = [];
    this.stats = { candidates: 0, inView: 0, used: 0 };
  }

  setSize(n) {
    this.size = n;
    for (const s of this.slots) s.proxy.parent?.remove(s.proxy);
    this.slots = [];
    this.attached = false;
    this.camPos.set(1e9, 0, 0); // the new slots take their lights at once (no fade-in after a quality change)
  }

  makeSlots(scene) {
    for (let i = 0; i < this.size; i++) {
      const p = new THREE.PointLight(0xffffff, 0, 1, 2);
      p.name = 'lightPool:' + i;
      p.userData.poolProxy = true;
      p.layers.enable(this.vmLayer); // lights both the world pass and the viewmodel (hands) pass
      p.castShadow = false;
      p.matrixAutoUpdate = false; // positioned directly in world space (parent = scene at the origin)
      scene.add(p);
      this.slots.push({ proxy: p, src: null, k: 0 });
    }
    this.attached = true;
    this.scene = scene;
  }

  /** A PointLight found in the scene walk (Renderer.render does one walk per frame): moved off the camera layers the
   *  first time it is seen; `vis` = it and all its parents are visible. */
  offer(L, vis) {
    if (!L.userData.pooled) { L.userData.pooled = true; L.layers.set(HIDDEN_LAYER); }
    if (vis && L.intensity > 1e-3) this.cands.push(L);
  }

  /** After the walk: pick and fade. The candidate list is cleared for the next frame. */
  update(scene, camera, dt) {
    const cands = this.cands;
    if (!this.size) { cands.length = 0; return; }
    if (!this.attached || this.scene !== scene) { this.setSize(this.size); this.makeSlots(scene); }
    // the camera jumped (a door, a cutscene cut, the PC): no fades, pick the new set at once
    camera.getWorldPosition(_v);
    const jump = _v.distanceToSquared(this.camPos) > 4;
    this.camPos.copy(_v);
    _pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    _f.setFromProjectionMatrix(_pm);
    // score the lights that can reach something in view
    let inView = 0;
    for (const L of cands) {
      L.updateWorldMatrix(true, false);
      _s.center.setFromMatrixPosition(L.matrixWorld);
      _s.radius = L.distance > 0 ? L.distance : 60;
      if (!_f.intersectsSphere(_s)) { SCORE.set(L, -1); continue; }
      inView++;
      const d = _s.center.distanceTo(this.camPos) / _s.radius;
      SCORE.set(L, L.intensity / (1 + d * d));
    }
    // the best `size` of them
    const want = cands.filter((L) => SCORE.get(L) > 0).sort((a, b) => SCORE.get(b) - SCORE.get(a));
    if (want.length > this.size) want.length = this.size;
    const S = this.slots, step = jump ? 1 : Math.min(1, dt * FADE);
    for (const s of S) {
      if (s.src && want.includes(s.src)) { s.k = Math.min(1, s.k + step); s.keep = true; }
      else if (s.src) { s.k -= step; s.keep = false; if (s.k <= 0) { s.src = null; s.k = 0; } }
      else s.keep = false;
    }
    for (const L of want) {
      if (S.some((s) => s.src === L)) continue;
      const free = S.find((s) => !s.src);
      if (!free) break; // waits for an outgoing light to fade
      free.src = L; free.k = jump ? 1 : step; free.keep = true;
    }
    let used = 0;
    for (const s of S) {
      const p = s.proxy, L = s.src;
      if (!L) { p.intensity = 0; continue; }
      used++;
      p.color.copy(L.color);
      p.intensity = L.intensity * s.k;
      p.distance = L.distance; p.decay = L.decay;
      p.matrix.copy(L.matrixWorld); p.matrixWorld.copy(L.matrixWorld);
    }
    this.stats.candidates = cands.length; this.stats.inView = inView; this.stats.used = used;
    cands.length = 0;
  }
}
