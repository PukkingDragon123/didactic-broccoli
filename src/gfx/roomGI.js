// Room lighting: bounce light, room reflections and real lamps for the interiors (the garage, Mikawa-ya, your room,
// Flat 103, Ramen Yamada...). Owned by the renderer (renderer.gi); rooms are registered by src/plugins/roomLight.js.
//
//   irradiance volume  a grid of light probes over the room's box (spacing per quality preset). Each probe renders the
//                      room around it into a small cube (32 px), which is projected to L1 spherical harmonics on the
//                      GPU straight into a 3D texture (three slices blocks: r, g, b). Every lit material samples it
//                      (src/gfx/giShader.js) in place of the flat sky fill: corners and the floor under things go dark,
//                      colours bleed, a lit floor lights the ceiling. The probes see the room with its current volume,
//                      so each pass adds a bounce (two passes on entry). Baked progressively after the frame (a few
//                      cube face at a time within a 2 ms budget per frame), rebaked when the room's state
//                      changes (lamp switch, shutter, the time of day through its windows), crossfaded when it swaps.
//   reflection probe   one 256 px cube at the room's capture point, prefiltered (PMREM), used as the scene environment
//                      while you're inside and box-projected onto the room's walls (glossy floors and counters mirror
//                      the room in the right place). Rooms flagged `global` (the garage) also become the environment
//                      outside, so it follows day and night.
//   lamp rig           two persistent spot lights (a shadowed key and an unshadowed fill) take the active room's lamps:
//                      real shadows under tables, stools and shelves, physical falloff, specular on lacquer and tile.
//                      They always exist (intensity 0, parked under the map), so no shader ever recompiles for them.
//
//   gi.add({ id, box: Box3, sky, global, group, active(), lights() -> [{ p, t, color, i, angle, pen, range }], key() })
//   gi.frame(dt) before the frame (pick the room, uniforms, rig, environment); gi.bake() after it; gi.finish() bakes
//   everything pending now (tools, boot).
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { GI } from './giShader.js';

const SH_N = 16; // samples per cube face edge (the cube is drawn at 2x: each sample is a 2x2 average)
const ProjectShader = {
  uniforms: { tCube: { value: null }, uChan: { value: new THREE.Vector3(1, 0, 0) } },
  vertexShader: /* glsl */`void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform samplerCube tCube; uniform vec3 uChan;
    vec3 dirOf(int f, float u, float v) {
      if (f == 0) return vec3(1.0, v, u);
      if (f == 1) return vec3(-1.0, v, u);
      if (f == 2) return vec3(u, 1.0, v);
      if (f == 3) return vec3(u, -1.0, v);
      if (f == 4) return vec3(u, v, 1.0);
      return vec3(u, v, -1.0);
    }
    void main() {
      vec4 acc = vec4(0.0); float ws = 0.0;
      for (int f = 0; f < 6; f++) for (int j = 0; j < ${SH_N}; j++) for (int i = 0; i < ${SH_N}; i++) {
        float u = (float(i) + 0.5) * ${(2 / SH_N).toFixed(6)} - 1.0, v = (float(j) + 0.5) * ${(2 / SH_N).toFixed(6)} - 1.0;
        float w = 1.0 / pow(1.0 + u * u + v * v, 1.5); // the texel's solid angle
        vec3 d = normalize(dirOf(f, u, v));
        vec3 L = textureCube(tCube, d).rgb;
        float c = dot(L, uChan);
        if (isnan(c) || isinf(c)) c = 0.0;
        acc += min(c, 64.0) * w * vec4(0.282095, 0.488603 * d.y, 0.488603 * d.z, 0.488603 * d.x);
        ws += w;
      }
      gl_FragColor = acc * (12.566371 / ws);
    }`,
};

const CHANS = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
const _v = new THREE.Vector3(), _c = new THREE.Color(), _black = new THREE.Color(0, 0, 0);
const PARK = new THREE.Vector3(0, -200, 0);

export class RoomGI {
  constructor(R) {
    this.R = R;
    this.rooms = new Map();
    this.cur = null;
    this.on = 0; // the volume's fade (0..1)
    this.rigK = 1; // the rig's fade in an on-map room you walk into
    this.debt = 0; // bake time (ms) run over the budget, paid back by skipping frames
    this.lastMs = 0; // bake time of the last frame (tools/interiors.mjs --trace)
    this.lampOff = 0; // 1: the active room's lamps are the rig's (src/places/Places.js turns its painted lamp term off)
    this.enabled = true;
    this.stats = { probes: 0, ms: 0, passes: 0 };
    this.baseEnv = null;
    this.K = 1; // indirect strength
  }

  get gl() { return this.R.renderer; }

  setup(scene) {
    this.scene = scene;
    const key = this.key = new THREE.SpotLight(0xffffff, 0, 6, 1.2, 0.8, 2);
    key.name = 'gi:key';
    key.castShadow = true;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.025;
    key.shadow.camera.near = 0.05;
    const fill = this.fill = new THREE.SpotLight(0xffffff, 0, 6, 1.2, 0.8, 2);
    fill.name = 'gi:fill';
    for (const L of [key, fill]) { L.position.copy(PARK); L.target.position.copy(PARK).y -= 1; scene.add(L, L.target); }
    this.R.registerShadowLight(key, 0.75);
    this.applyQuality();
  }

  /** The preset's settings: probe spacing (m) and count, or `single` (one probe per room), `ms` (bake budget per
   *  frame), `env` (false: no reflection probe), `shadow` (false: the rig's key casts no shadow). */
  get q() { return this.R.quality.gi || { spacing: 0.7, ms: 2 }; }

  /** A quality change: the key light's shadow on or off (the cheap presets skip it: one shadow sampler less in every
   *  lit material, no shadow map to redraw). */
  applyQuality() { if (this.key) this.key.castShadow = this.q.shadow !== false; }

  add(def) {
    const old = this.rooms.get(def.id);
    if (old) this.dispose(old);
    // (the definition itself: its getters, such as a zone's group built later, stay live)
    const r = Object.assign(def, { vol: null, env: null, envKey: null, volKey: null });
    r.at ||= r.box.getCenter(new THREE.Vector3()).setY(Math.min(r.box.max.y - 0.3, r.box.min.y + 1.35));
    this.rooms.set(def.id, r);
    return r;
  }

  dispose(r) {
    if (r.vol) for (const t of r.vol.rt) t.dispose();
    r.vol = null;
    r.env?.dispose?.();
    r.env = null;
  }

  /** Quality change: the probe spacing changed, rebuild every volume (lazily). */
  reset() { for (const r of this.rooms.values()) { if (r.vol) for (const t of r.vol.rt) t.dispose(); r.vol = null; r.volKey = null; } this.on = 0; }

  // ------------------------------------------------------------------ per frame (before the composer)
  /** The room the camera is in (an interior you entered, or an on-map room's box around you, or nearby). */
  pick(cam) {
    let best = null, bd = 1e9;
    for (const r of this.rooms.values()) {
      if (r.active) { if (r.active()) return r; continue; }
      const d = r.box.distanceToPoint(cam);
      if (d < bd) { bd = d; best = r; }
    }
    // (an on-map room stays picked while you're near it: what you see of it through its door keeps its light)
    if (best && (bd < (best === this.cur ? 9 : 6))) return best;
    return null;
  }

  frame(dt) {
    const cam = this.R.camera, scene = this.scene;
    if (!scene || !cam) return;
    cam.getWorldPosition(_v);
    const r = this.enabled ? this.pick(_v) : null;
    if (r !== this.cur) {
      this.cur = r;
      if (r?.active && r.group && this.q.shadow !== false) castShadows(r.group); // (an interior's own things throw the lamp's shadows while you're in it)
      this.on = r?.vol?.has ? 1 : 0;
      this.rigK = r?.active ? 1 : 0; // (teleported in behind a fade: at once; walked in: fades up)
    }
    const v = r?.vol;
    const want = v?.has ? 1 : 0;
    this.on += (want - this.on) * Math.min(1, dt * 3);
    if (want && this.on > 0.995) this.on = 1;
    this.rigK = Math.min(1, this.rigK + dt * 2.5);
    const U = GI;
    if (v && v.has) {
      U.ggPVTex.value = v.rt[0].texture;
      U.ggPVMin.value.copy(v.min); U.ggPVStep.value.copy(v.step); U.ggPVRes.value.copy(v.res);
      U.ggPVBias.value = Math.min(0.3, v.step.x * 0.45);
      U.ggBoxMin.value.copy(r.box.min); U.ggBoxMax.value.copy(r.box.max);
      U.ggPVOn.value = this.on; U.ggPVK.value = this.K * (r.k ?? 1);
    } else { U.ggPVOn.value = 0; U.ggPVTex.value = null; }
    // the room's reflection probe, box-projected, while you're inside it
    const inside = r && (r.active ? true : r.box.distanceToPoint(_v) < 0.3);
    if (r?.global && r.env) this.baseEnv = r.env;
    if (this.baseEnv === null && scene.environment && !this.isRoomEnv(scene.environment)) this.baseEnv = scene.environment;
    if (inside && r.env) {
      if (scene.environment !== r.env) scene.environment = r.env;
      scene.environmentIntensity = r.envK ?? 1;
      U.ggEnvBox.value = 1; U.ggEnvPos.value.copy(r.at); U.ggEnvMin.value.copy(r.box.min); U.ggEnvMax.value.copy(r.box.max);
      if (!r.box.containsPoint(U.ggEnvPos.value)) U.ggEnvBox.value = 0;
    } else {
      if (this.baseEnv && scene.environment !== this.baseEnv) scene.environment = this.baseEnv;
      U.ggEnvBox.value = 0;
    }
    if (inside && r.env) U.ggBoxMin.value.copy(r.box.min), U.ggBoxMax.value.copy(r.box.max);
    this.rig(r);
  }

  isRoomEnv(t) { for (const r of this.rooms.values()) if (r.env === t) return true; return false; }

  /** The active room's lamps on the two persistent spots (parked when there are none). */
  rig(r) {
    const ls = r?.lights?.() || [];
    this.lampOff = r && r.lights ? 1 : 0;
    [this.key, this.fill].forEach((L, i) => {
      const d = ls[i];
      if (!d || !(d.i > 0)) { L.intensity = 0; if (!L.position.equals(PARK)) { L.position.copy(PARK); L.target.position.copy(PARK).y -= 1; L.target.updateMatrixWorld(); L.updateMatrixWorld(); } return; }
      L.position.set(d.p[0], d.p[1], d.p[2]);
      if (d.t) L.target.position.set(d.t[0], d.t[1], d.t[2]); else L.target.position.set(d.p[0], d.p[1] - 1, d.p[2]);
      L.color.set(d.color ?? 0xfff0dc);
      L.intensity = d.i * this.rigK;
      L.angle = d.angle ?? 1.25; L.penumbra = d.pen ?? 0.75; L.distance = d.range ?? 7; L.decay = 2;
      if (i === 0) { L.shadow.radius = d.soft ?? (this.R.quality.giSoft ?? 4); L.shadow.camera.far = L.distance; }
      L.updateMatrixWorld(); L.target.updateMatrixWorld();
    });
  }

  // ------------------------------------------------------------------ baking (after the composer)
  makeVolume(r) {
    const mk = (res) => {
      const t = new THREE.WebGL3DRenderTarget(res.x, res.y, res.z * 3, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, depthBuffer: false });
      t.texture.minFilter = t.texture.magFilter = THREE.LinearFilter;
      t.texture.generateMipmaps = false;
      return t;
    };
    if (this.q.single) {
      // the cheap presets: one probe at the room's capture point, its bounce as the whole room's ambient
      const res = new THREE.Vector3(1, 1, 1);
      return { res, min: r.at.clone(), step: new THREE.Vector3(1, 1, 1), rt: [mk(res), mk(res)], has: false, i: -1, face: 0, pass: 0, count: 1 };
    }
    const s = this.q.spacing, b = r.box, M = 0.12;
    const size = b.getSize(new THREE.Vector3());
    const n = (len, sp) => Math.max(2, Math.round((len - 2 * M) / sp) + 1);
    // (vertical: a bit coarser, rooms are low; at most ~200 probes, coarser in big rooms)
    let sp = Math.max(s, Math.cbrt((size.x * size.y * size.z) / (this.q.max || 200) / 1.4));
    const res = new THREE.Vector3(n(size.x, sp), n(size.y, sp * 1.4), n(size.z, sp));
    const min = b.min.clone().addScalar(M), step = new THREE.Vector3(
      (size.x - 2 * M) / (res.x - 1), (size.y - 2 * M) / (res.y - 1), (size.z - 2 * M) / (res.z - 1));
    return { res, min, step, rt: [mk(res), mk(res)], has: false, i: -1, face: 0, pass: 0, count: res.x * res.y * res.z };
  }

  ensureTools() {
    if (this.cube) return;
    this.cubeRT = new THREE.WebGLCubeRenderTarget(SH_N * 2, { type: THREE.HalfFloatType, generateMipmaps: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    this.cube = new THREE.CubeCamera(0.03, 12, this.cubeRT);
    this.quad = new FullScreenQuad(new THREE.ShaderMaterial({ ...ProjectShader, uniforms: THREE.UniformsUtils.clone(ProjectShader.uniforms), depthTest: false, depthWrite: false, blending: THREE.NoBlending, toneMapped: false }));
    this.envRT = new THREE.WebGLCubeRenderTarget(256, { type: THREE.UnsignedByteType });
    this.envCam = new THREE.CubeCamera(0.05, 40, this.envRT);
    this.pmrem = new THREE.PMREMGenerator(this.gl);
  }

  /** Everything that must not be in a probe's view: your hands, particles, other zones' groups. */
  hideFor(r, hidden) {
    const hide = (o) => { if (o && o.visible) { o.visible = false; hidden.push(o); } };
    for (const o of this.R.vmRoots) hide(o);
    for (const o of this.R.points || []) hide(o);
    if (r.group && r.active) {
      // an interior off the map: only its own group (and the lights) stays, which also keeps each probe cheap
      for (const c of this.scene.children) {
        if (c === r.group || c.isLight || c.isCamera || c.userData.giKeep || hasLight(c)) continue;
        hide(c);
      }
    } else {
      // a room on the lane: whatever lies wholly beyond the probes' reach stays out (cheaper probes)
      _sph2.center.copy(r.box.getCenter(_v2)); _sph2.radius = r.box.getSize(_v2).length() / 2 + (r.sky ? 12 : 3);
      for (const c of this.scene.children) {
        if (c.isLight || c.isCamera || !c.visible || hasLight(c)) continue;
        const b = boundsOf(c);
        if (b && !b.intersectsSphere(_sph2)) hide(c);
      }
    }
  }

  /** Bake what the active room needs, one cube face at a time within this frame's time budget (the preset's `ms`,
   *  2 ms or less): a face that runs over is paid back by skipping the next frames, so entering a room never stalls,
   *  even on a weak GPU. The volume first (a pass at a time), then the reflection probe (six faces, then the prefilter).
   *  Returns false when there is nothing left to do. */
  bake({ all = false, limit = Infinity } = {}) {
    const r = this.cur;
    this.lastMs = 0;
    if (!r || !this.enabled) return false;
    const q = this.q, budget = all ? Infinity : (q.ms ?? 2);
    // key: a change rebakes two passes (a lamp switched, the shutter); minor: one pass on top of the current volume (the
    // sun moving on through the window)
    const major = r.key?.() ?? '', key = major + '|' + (r.minor?.() ?? '');
    if (!r.vol) { r.vol = this.makeVolume(r); r.volKey = null; }
    const v = r.vol;
    if (v.i < 0 && !r.envJob) {
      if (v.pass >= 2 && key === r.volKey) {
        if (q.env === false || r.envKey === key) return false;
        r.envJob = { face: 0, key };
      } else {
        if (key !== r.volKey) v.pass = v.has && r.volKey?.split('|')[0] === major ? 1 : 0;
        v.i = 0; v.face = 0; v.bakingKey = key;
      }
    }
    if (!all && this.debt > 0) { this.debt = Math.max(0, this.debt - (q.ms ?? 2)); return true; }
    const t0 = performance.now();
    const gl = this.gl, scene = this.scene, U = GI;
    this.ensureTools();
    for (const c of [this.cube, this.envCam]) if (c.coordinateSystem !== gl.coordinateSystem) { c.coordinateSystem = gl.coordinateSystem; c.updateCoordinateSystem(); }
    const save = { on: U.ggPVOn.value, k: U.ggPVK.value, env: U.ggEnvBox.value, envI: scene.environmentIntensity, bg: scene.background, auto: gl.shadowMap.autoUpdate, need: gl.shadowMap.needsUpdate, au: scene.matrixWorldAutoUpdate, ac: gl.autoClear, rt: gl.getRenderTarget(), t0: U.ggPVTex.value };
    const job = r.envJob;
    if (!job) {
      // the probes see direct light plus the current volume (the bounce so far); no sky fill, no reflections
      U.ggPVOn.value = 1; U.ggPVK.value = v.has ? this.K * (r.k ?? 1) : 0;
      U.ggPVTex.value = v.rt[0].texture;
      U.ggPVMin.value.copy(v.min); U.ggPVStep.value.copy(v.step); U.ggPVRes.value.copy(v.res); U.ggBoxMin.value.copy(r.box.min); U.ggBoxMax.value.copy(r.box.max);
      U.ggPVBias.value = Math.min(0.3, v.step.x * 0.45);
    }
    U.ggEnvBox.value = 0;
    scene.environmentIntensity = 0;
    if (!r.sky) scene.background = _black;
    gl.shadowMap.autoUpdate = false; gl.shadowMap.needsUpdate = false;
    scene.matrixWorldAutoUpdate = false;
    gl.autoClear = true;
    const hidden = [];
    this.hideFor(r, hidden);
    const size = r.box.getSize(_v);
    for (const c of this.cube.children) c.far = Math.max(6, size.length() + (r.sky ? 8 : 1));
    const build = v.rt[1];
    let n = 0;
    try {
      if (job) {
        // the reflection probe: a face per step, then the prefilter
        while (job.face <= 6) {
          if (job.face < 6) {
            if (job.face === 0) { this.envCam.position.copy(r.at); this.envCam.updateMatrixWorld(true); }
            gl.setRenderTarget(this.envRT, job.face);
            gl.render(scene, this.envCam.children[job.face]);
          } else {
            r.envTarget = this.pmrem.fromCubemap(this.envRT.texture, r.envTarget || null);
            r.env = r.envTarget.texture; r.envKey = job.key; r.envJob = null;
          }
          job.face++;
          if (performance.now() - t0 > budget) break;
        }
      } else {
        while (v.i < v.count && n < limit) {
          const i = v.i, ix = i % v.res.x, iy = Math.floor(i / v.res.x) % v.res.y, iz = Math.floor(i / (v.res.x * v.res.y));
          if (v.face === 0) {
            this.cube.position.set(v.min.x + ix * v.step.x, v.min.y + iy * v.step.y, v.min.z + iz * v.step.z);
            this.cube.updateMatrixWorld(true);
          }
          gl.setRenderTarget(this.cubeRT, v.face);
          gl.render(scene, this.cube.children[v.face]);
          if (++v.face === 6) {
            // the probe's six faces are in: project them to L1 SH, straight into its texel of the 3D texture
            v.face = 0; v.i++; n++;
            this.quad.material.uniforms.tCube.value = this.cubeRT.texture;
            gl.autoClear = false;
            for (let c = 0; c < 3; c++) {
              build.viewport.set(ix, iy, 1, 1); build.scissor.set(ix, iy, 1, 1); build.scissorTest = true;
              gl.setRenderTarget(build, c * v.res.z + iz);
              this.quad.material.uniforms.uChan.value = CHANS[c];
              this.quad.render(gl);
            }
            gl.autoClear = true;
          }
          if (performance.now() - t0 > budget) break;
        }
      }
    } finally {
      for (const o of hidden) o.visible = true;
      U.ggPVOn.value = save.on; U.ggPVK.value = save.k; U.ggEnvBox.value = save.env; U.ggPVTex.value = save.t0;
      scene.environmentIntensity = save.envI; scene.background = save.bg;
      gl.shadowMap.autoUpdate = save.auto; gl.shadowMap.needsUpdate = save.need;
      scene.matrixWorldAutoUpdate = save.au; gl.autoClear = save.ac;
      gl.setRenderTarget(save.rt);
    }
    const ms = performance.now() - t0;
    this.lastMs = ms;
    if (!all && ms > budget) this.debt += ms - budget;
    this.stats.probes += n; this.stats.ms += ms;
    if (!job && v.i >= v.count) {
      // a pass is done: it becomes the volume shown
      v.i = -1; v.pass++;
      v.rt.reverse();
      v.has = true;
      r.volKey = v.bakingKey;
      this.stats.passes++;
    }
    return true;
  }

  /** Bake what the active room still needs, now, up to `limit` probes; true while more is left (tools, tests: call it
   *  again after a fence, a software GPU drops the context when handed thousands of draws at once). */
  finish(limit = Infinity) {
    if (!this.cur) return false;
    const did = this.bake({ all: true, limit });
    this.on = 1;
    return did;
  }
}

/** Every solid mesh of an interior casts shadows (glass, glows and decals don't): the places build their props with
 *  shadows off, as the sun never reaches them; the rig's key light does. */
function castShadows(group) {
  group.traverse((o) => {
    if (!o.isMesh || o.castShadow || o.userData.noShadow) return;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!m || m.transparent || m.visible === false || !(m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial)) return;
    o.castShadow = true;
  });
}

const _sph2 = new THREE.Sphere(), _v2 = new THREE.Vector3(), BOUNDS = new WeakMap();
/** A top-level object's world bounds (cached for a minute: most of the lane never moves). */
function boundsOf(o) {
  let e = BOUNDS.get(o);
  const now = performance.now();
  if (!e || now - e.t > 60000) {
    const b = new THREE.Box3().setFromObject(o);
    e = { b: b.isEmpty() ? null : b.getBoundingSphere(new THREE.Sphere()), t: now };
    BOUNDS.set(o, e);
  }
  return e.b;
}

const LIT = new WeakMap();
/** Does this subtree hold a light the pool doesn't manage (hiding it would change the shaders' light count)? */
function hasLight(o) {
  let v = LIT.get(o);
  if (v === undefined) {
    v = false;
    o.traverse((c) => { if (c.isLight && !c.isPointLight && !c.isAmbientLight) v = true; });
    LIT.set(o, v);
  }
  return v;
}
