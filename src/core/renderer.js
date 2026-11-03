// Renderer + post-processing stack with quality presets: ink outlines + screen-space god rays from the low sun,
// GTAO, bloom, colour grade, AgX filmic tone mapping, FXAA, then a light sharpen and dither (no banding).
// Viewmodel: whatever hangs off the camera (hands + held items, see vmRoots) is drawn in its own pass on top of the
// scene so it never pokes into walls.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { Pass } from 'three/addons/postprocessing/Pass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAPass } from 'three/addons/postprocessing/FXAAPass.js';
import { LightPool } from '../gfx/lightPool.js';
import '../gfx/sunMask.js'; // no direct sun inside Mikawa-ya (patches the light chunk at import)

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 0.32 },
    uGrain: { value: 0.035 },
    uSaturation: { value: 1.18 },
    uContrast: { value: 1.13 },
    uWarm: { value: 0.012 },
    uFlash: { value: new THREE.Color(0, 0, 0) },
    uAberration: { value: 0.0012 },
    uExposure: { value: 1.0 },
    // body state (src/needs/Needs.js through renderer.fx): tired (a darker, duller edge), lid (eyelids closing from top and
    // bottom), double (drunk double vision: a second, offset copy), wobble (drunk: the picture sways)
    uTired: { value: 0 }, uLid: { value: 0 }, uDouble: { value: 0 }, uWobble: { value: 0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime, uVignette, uGrain, uSaturation, uContrast, uWarm, uAberration, uExposure;
    uniform float uTired, uLid, uDouble, uWobble;
    uniform vec3 uFlash;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 uv = vUv;
      if (uWobble > 0.001) uv += vec2(sin(vUv.y * 7.0 + uTime * 1.3), cos(vUv.x * 5.0 + uTime * 0.9)) * 0.005 * uWobble;
      vec2 c = uv - 0.5;
      float r2 = dot(c, c);
      vec2 off = c * r2 * uAberration * 8.0;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + off).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - off).b;
      if (uDouble > 0.001) {
        vec2 d2 = vec2(sin(uTime * 0.7), cos(uTime * 0.53) * 0.35) * 0.018 * uDouble;
        col = mix(col, texture2D(tDiffuse, uv + d2).rgb, 0.42 * min(1.0, uDouble * 1.6));
      }
      col *= uExposure;
      // saturation & contrast in linear HDR (gentle)
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSaturation * (1.0 - 0.35 * uTired));
      col = max(vec3(0.0), (col - 0.18) * uContrast + 0.18);
      // warm cinematic split: shadows slightly teal, highlights warm
      col += vec3(uWarm, uWarm * 0.4, -uWarm * 0.6) * smoothstep(0.1, 1.2, l);
      col += vec3(-0.004, 0.002, 0.008) * (1.0 - smoothstep(0.0, 0.25, l));
      // vignette (tired: deeper and closer in)
      col *= 1.0 - min(0.96, uVignette + uTired * 0.6) * smoothstep(0.08 - uTired * 0.07, 0.55 - uTired * 0.15, r2 * 1.6);
      // eyelids: dark bands closing in from the top and bottom
      if (uLid > 0.001) col *= 1.0 - smoothstep(1.02 - uLid * 1.04, 1.1 - uLid * 1.04, abs(vUv.y - 0.5) * 2.0);
      // flash (reveals)
      col += uFlash;
      // film grain
      float g = hash(vUv * vec2(1920.0, 1080.0) + fract(uTime * 7.13) * 100.0) - 0.5;
      col += g * uGrain * (0.35 + l * 0.5);
      gl_FragColor = vec4(col, 1.0);
    }`,
};

// Anime-style ink outlines: edges where depth jumps (silhouettes and creases), drawn on the lit image.
const OutlineShader = {
  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: null },
    uRes: { value: new THREE.Vector2(1, 1) },
    uNear: { value: 0.05 },
    uFar: { value: 120 },
    uWidth: { value: 1.0 },
    uStrength: { value: 0.85 },
    uInk: { value: new THREE.Color(0x1c1016) },
    // god rays: sky pixels (no depth written) marched toward the sun's screen position
    uSun: { value: new THREE.Vector2(0.5, 0.5) },
    uSunOn: { value: 0 },
    uAspect: { value: 1 },
    uShaft: { value: 0.75 },
    uShaftCol: { value: new THREE.Color(1.0, 0.72, 0.42) },
  },
  vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse, tDepth;
    uniform vec2 uRes; uniform float uNear, uFar, uWidth, uStrength; uniform vec3 uInk;
    uniform vec2 uSun; uniform float uSunOn, uAspect, uShaft; uniform vec3 uShaftCol;
    varying vec2 vUv;
    float lin(vec2 uv) { float z = texture2D(tDepth, uv).x * 2.0 - 1.0; return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear)); }
    float sky(vec2 uv) { return step(0.99999, texture2D(tDepth, uv).x); }
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec4 col = texture2D(tDiffuse, vUv);
      vec2 o = uWidth / uRes;
      float d = lin(vUv);
      float dl = lin(vUv - vec2(o.x, 0.0)), dr = lin(vUv + vec2(o.x, 0.0));
      float du = lin(vUv + vec2(0.0, o.y)), dd = lin(vUv - vec2(0.0, o.y));
      // second derivative catches creases, first derivative catches silhouettes; both relative to distance
      float lap = abs(dl + dr + du + dd - 4.0 * d) / d;
      float jump = max(max(abs(dl - d), abs(dr - d)), max(abs(du - d), abs(dd - d))) / d;
      float e = max(smoothstep(0.05, 0.12, lap), smoothstep(0.08, 0.16, jump));
      e *= 1.0 - smoothstep(25.0, 60.0, d); // fade far away so the skyline stays soft
      vec3 outc = mix(col.rgb, uInk * col.rgb * 0.35 + uInk * 0.4, e * uStrength);
      // crepuscular rays: march from this pixel toward the sun, collecting open sky (wires, poles and roofs cut it)
      if (uSunOn > 0.001) {
        vec2 dv = (uSun - vUv) / 26.0;
        vec2 uv = vUv + dv * hash(vUv * uRes) ; // jittered start hides the steps
        float acc = 0.0, w = 1.0, wsum = 0.0;
        for (int i = 0; i < 26; i++) {
          uv += dv;
          float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
          acc += sky(uv) * w * inside; wsum += w; w *= 0.955;
        }
        float dist = length((uSun - vUv) * vec2(uAspect, 1.0));
        float k = (acc / wsum) * exp(-dist * 2.4) * uShaft * uSunOn;
        outc += uShaftCol * k * (1.0 - 0.6 * sky(vUv));
      }
      gl_FragColor = vec4(outc, col.a);
    }`,
};

const _sunDir = new THREE.Vector3(), _sunP = new THREE.Vector3(), _camDir = new THREE.Vector3();
class OutlinePass extends ShaderPass {
  constructor(camera) { super(OutlineShader); this.camera = camera; this.sun = null; }
  render(renderer, writeBuffer, readBuffer, dt, mask) {
    const u = this.uniforms, cam = this.camera;
    u.tDepth.value = readBuffer.depthTexture;
    u.uNear.value = cam.near; u.uFar.value = cam.far;
    u.uRes.value.set(readBuffer.width, readBuffer.height);
    u.uAspect.value = readBuffer.width / Math.max(1, readBuffer.height);
    // the sun's screen position; the rays fade out when you look away from it
    let on = 0;
    const s = this.sun;
    if (s && s.visible !== false && s.intensity > 0.05) {
      _sunDir.subVectors(s.position, s.target.position).normalize();
      cam.getWorldDirection(_camDir);
      const facing = _camDir.dot(_sunDir);
      if (facing > 0) {
        _sunP.copy(cam.position).addScaledVector(_sunDir, 500).project(cam);
        u.uSun.value.set(_sunP.x * 0.5 + 0.5, _sunP.y * 0.5 + 0.5);
        on = THREE.MathUtils.smoothstep(facing, 0.1, 0.55) * Math.min(1, s.intensity / 1.5) * (this.rays ?? 1);
      }
    }
    u.uSunOn.value = on;
    super.render(renderer, writeBuffer, readBuffer, dt, mask);
  }
}

// Last pass, in display space: a light contrast-adaptive sharpen (FXAA softens the pixel-art textures) and a
// triangular dither so the sky gradients and dim interiors never band.
const FinishShader = {
  uniforms: { tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uSharp: { value: 0.28 } },
  vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uSharp;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 o = 1.0 / uRes;
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      vec3 n = texture2D(tDiffuse, vUv + vec2(0.0, o.y)).rgb, s = texture2D(tDiffuse, vUv - vec2(0.0, o.y)).rgb;
      vec3 e = texture2D(tDiffuse, vUv + vec2(o.x, 0.0)).rgb, w = texture2D(tDiffuse, vUv - vec2(o.x, 0.0)).rgb;
      vec3 mn = min(c, min(min(n, s), min(e, w))), mx = max(c, max(max(n, s), max(e, w)));
      // adaptive amount: less where the local contrast is already high (no halos on the ink lines)
      vec3 amt = clamp(min(mn, 1.0 - mx) / max(mx, vec3(1e-3)), 0.0, 1.0);
      vec3 k = -sqrt(amt) * uSharp * 0.2;
      vec3 col = clamp((c + (n + s + e + w) * k) / (1.0 + 4.0 * k), 0.0, 1.0);
      float d = hash(vUv * uRes) + hash(vUv * uRes + 0.37) - 1.0;
      gl_FragColor = vec4(col + d / 255.0, 1.0);
    }`,
};

// Performance: ambient occlusion at a reduced resolution (QUALITY.aoScale), brought back up by a depth-aware upsample:
// each pixel blends the four nearest AO texels like a bilinear lookup, but weighted by how close each texel's depth is to
// its own, so the AO of a wall behind never bleeds onto the edge of something in front (no halos). It also multiplies
// the AO into the scene in the same pass (GTAOPass did a full-screen copy and then a multiply blend).
const AOUpsampleShader = {
  uniforms: {
    tDiffuse: { value: null }, tAO: { value: null }, tDepth: { value: null }, aoSize: { value: new THREE.Vector2(1, 1) },
    intensity: { value: 1 }, cameraNear: { value: 0.05 }, cameraFar: { value: 120 },
  },
  vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    #include <packing>
    uniform sampler2D tDiffuse, tAO;
    uniform highp sampler2D tDepth;
    uniform vec2 aoSize;
    uniform float intensity, cameraNear, cameraFar;
    varying vec2 vUv;
    float viewZ(vec2 uv) { return perspectiveDepthToViewZ(texture2D(tDepth, uv).x, cameraNear, cameraFar); }
    void main() {
      vec4 col = texture2D(tDiffuse, vUv);
      float z = viewZ(vUv);
      vec2 p = vUv * aoSize - 0.5, b = floor(p), f = p - b;
      vec3 ao = vec3(0.0);
      float ws = 0.0;
      for (int j = 0; j < 2; j++) for (int i = 0; i < 2; i++) {
        // the AO texel's centre: the depth the AO pass saw there
        vec2 t = (b + vec2(float(i), float(j)) + 0.5) / aoSize;
        float bw = (i == 0 ? 1.0 - f.x : f.x) * (j == 0 ? 1.0 - f.y : f.y);
        float w = bw / (0.01 + abs(viewZ(t) - z) / max(-z, 1e-3));
        ao += texture2D(tAO, t).rgb * w; ws += w;
      }
      ao /= max(ws, 1e-6);
      gl_FragColor = vec4(col.rgb * mix(vec3(1.0), ao, intensity), col.a);
    }`,
};

export const VM_LAYER = 4;
// the viewmodel is depth-tested as if VM_DEPTH times closer: only clip z changes (x/y, lighting and fog stay true), so it
// sits in front of any wall the player can touch while depth ratios (ink outlines, creases) stay exactly the same
export const VM_DEPTH = 0.45;

class ViewmodelPass extends Pass {
  constructor(scene, camera) {
    super();
    this.scene = scene; this.camera = camera;
    this.needsSwap = false;
    this.cam = new THREE.PerspectiveCamera();
    this.cam.layers.set(VM_LAYER);
    this.cam.matrixWorldAutoUpdate = false;
  }
  render(renderer, writeBuffer, readBuffer) {
    this.target = readBuffer; // where the scene was drawn this frame (its depth feeds GTAO)
    const c = this.camera, v = this.cam, s = this.scene;
    v.matrixWorld.copy(c.matrixWorld); v.matrixWorldInverse.copy(c.matrixWorldInverse);
    v.projectionMatrix.copy(c.projectionMatrix);
    v.projectionMatrix.elements[14] /= VM_DEPTH;
    v.projectionMatrixInverse.copy(v.projectionMatrix).invert();
    const bg = s.background, au = s.matrixWorldAutoUpdate, ac = renderer.autoClear;
    s.background = null; s.matrixWorldAutoUpdate = false; renderer.autoClear = false;
    renderer.setRenderTarget(this.renderToScreen ? null : readBuffer);
    renderer.render(s, v);
    s.background = bg; s.matrixWorldAutoUpdate = au; renderer.autoClear = ac;
  }
}
// (a subtree flagged userData.mainPass stays in the normal pass, depth-tested against the world)
// (point lights handed to the light pool stay on its hidden layer: the pool's proxies light both passes)
const toVM = (o) => {
  if (o.userData.mainPass) return;
  if (o.isLight) { if (!o.userData.pooled) o.layers.enable(VM_LAYER); } else o.layers.set(VM_LAYER);
  for (const c of o.children) toVM(c);
};
const toMain = (o) => { if (!o.isLight) o.layers.set(0); };
const lightToVM = (o) => { if (o.isLight && !o.userData.pooled) o.layers.enable(VM_LAYER); };

// Shadow casters' last-seen state, for the shadow update policy (Renderer.updateShadows)
const _sph = new THREE.Sphere(), _lp = new THREE.Vector3(), _lt = new THREE.Vector3(), _cp = new THREE.Vector3(), _vpm = new THREE.Matrix4();
const FAR_MOVER = 15; // m: casters moving farther than this from the camera refresh the shadow map at a third of the rate
// (kept in WeakMaps, not userData: Object3D.clone() copies userData through JSON)
const CASTER = new WeakMap(), SHADOW = new WeakMap();
function casterState(o) {
  let st = CASTER.get(o);
  if (!st) { st = { m: new Float64Array(16), v: -1, pv: -1, sphere: new THREE.Sphere(), prev: new THREE.Sphere(), skinned: !!o.isSkinnedMesh, skinT: 0 }; st.m[0] = NaN; CASTER.set(o, st); }
  return st;
}

// lights: point lights evaluated per pixel (src/gfx/lightPool.js picks the most relevant ones in view).
// shadowEvery: the fastest a shadow map is redrawn while something in it moves (frames); a still scene redraws none.
// shadowMinR: casters smaller than this (bounding radius, m) don't trigger a redraw by moving.
// view: draw distance of small props (src/world/propCull.js). crowd: how many passers-by the lane holds (Pedestrians).
// aoScale: the resolution ambient occlusion is computed at (AOUpsampleShader brings it back up).
export const QUALITY = {
  low: { pixelRatio: 0.75, shadows: 1024, ao: false, bloom: true, aa: true, shadowType: THREE.PCFShadowMap, shadowEvery: 3, shadowMinR: 0.3, rays: 0, sharp: 0, lights: 4, view: 0.65, crowd: 0.6 },
  medium: { pixelRatio: 1.0, shadows: 2048, ao: false, bloom: true, aa: true, shadowType: THREE.PCFShadowMap, shadowEvery: 2, shadowMinR: 0.15, rays: 1, sharp: 1, lights: 5, view: 0.8, crowd: 0.8 },
  high: { pixelRatio: 1.0, shadows: 2048, ao: true, aoScale: 0.5, bloom: true, aa: true, shadowType: THREE.PCFShadowMap, shadowEvery: 2, rays: 1, sharp: 1, lights: 6, view: 1, crowd: 1 },
  ultra: { pixelRatio: 1.5, shadows: 4096, ao: true, bloom: true, aa: true, shadowType: THREE.PCFShadowMap, shadowEvery: 1, rays: 1, sharp: 1, lights: 8, view: 1.2, crowd: 1 },
};

export class Renderer {
  constructor(container) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
    const r = this.renderer;
    r.outputColorSpace = THREE.SRGBColorSpace;
    // AgX: filmic roll-off for the golden-hour sky and the lit signs (the grade below adds back the punch)
    r.toneMapping = THREE.AgXToneMapping;
    r.toneMappingExposure = 1.12;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(r.domElement);
    r.domElement.id = 'game-canvas';
    this.qualityName = 'high';
    this.quality = QUALITY.high;
    this.composer = null;
    this.scene = null;
    this.camera = null;
    this.vmRoots = new Set(); // subtrees drawn by the viewmodel pass (layers are switched just for the frame)
    this.aoCam = new THREE.PerspectiveCamera(); // GTAO sees the scene + the viewmodel
    this.fx = { tired: 0, lid: 0, double: 0, wobble: 0 }; // body-state look, written by src/needs (survives quality changes)
    this.lightPool = new LightPool(VM_LAYER);
    this.casters = []; this.prevCasters = new Set(); this.moved = []; // shadow casters seen by this frame's walk
    this.shadowStats = { casters: 0, moved: 0, updates: 0, movers: [] };
  }

  setup(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.buildComposer();
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  buildComposer() {
    const r = this.renderer;
    const q = this.quality;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2) * q.pixelRatio);
    if (this.composer) this.composer.dispose?.();
    const size = new THREE.Vector2(window.innerWidth, window.innerHeight);
    const rt = new THREE.WebGLRenderTarget(size.x * r.getPixelRatio(), size.y * r.getPixelRatio(), { type: THREE.HalfFloatType, samples: 0 });
    rt.depthTexture = new THREE.DepthTexture(rt.width, rt.height);
    rt.depthTexture.type = THREE.UnsignedIntType;
    const composer = new EffectComposer(r, rt);
    composer.addPass(new RenderPass(this.scene, this.camera));
    this.vmPass = new ViewmodelPass(this.scene, this.camera);
    composer.addPass(this.vmPass);
    this.outline = new OutlinePass(this.camera);
    this.outline.uniforms.uWidth.value = Math.max(1, r.getPixelRatio());
    this.outline.rays = q.rays ?? 1;
    composer.addPass(this.outline);
    this.gtao = null;
    if (q.ao) {
      const gtao = new GTAOPass(this.scene, this.aoCam, size.x, size.y);
      // performance: AO from the depth buffer the scene pass already drew (normals rebuilt from depth) instead of
      // drawing the whole scene a second time with a normal material (that doubled the draw calls on high / ultra).
      // The composer alternates its two targets, so the depth texture is picked up each frame from the viewmodel pass.
      gtao.setGBuffer(composer.renderTarget2.depthTexture);
      const gtaoRender = gtao.render.bind(gtao);
      const k = q.aoScale && q.aoScale < 1 ? q.aoScale : 1;
      const up = k < 1 ? new ShaderPass(AOUpsampleShader) : null;
      gtao.render = (rr, wb, rb, dt, mask) => {
        const d = this.vmPass.target?.depthTexture;
        if (d && gtao.depthTexture !== d) { gtao.depthTexture = d; gtao.gtaoMaterial.uniforms.tDepth.value = d; gtao.pdMaterial.uniforms.tDepth.value = d; }
        gtaoRender(rr, wb, rb, dt, mask);
        if (up) {
          const u = up.uniforms;
          u.tAO.value = gtao.pdRenderTarget.texture; u.tDepth.value = gtao.depthTexture; u.intensity.value = gtao.blendIntensity;
          u.cameraNear.value = this.aoCam.near; u.cameraFar.value = this.aoCam.far;
          up.renderToScreen = gtao.renderToScreen;
          up.render(rr, wb, rb);
        }
      };
      if (up) {
        // AO and its denoise at k x the resolution; the upsample writes the frame (GTAOPass itself outputs nothing)
        const setSize = gtao.setSize.bind(gtao);
        gtao.setSize = (w, h) => { setSize(Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k))); up.uniforms.aoSize.value.set(gtao.width, gtao.height); };
        gtao.output = GTAOPass.OUTPUT.Off;
      } else gtao.output = GTAOPass.OUTPUT.Default;
      gtao.blendIntensity = 0.85;
      gtao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.5, thickness: 1.5, scale: 1.0, samples: 12, distanceFallOff: 1.0 });
      // (the denoise radius is in AO pixels: the same footprint on screen at any scale)
      gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6 * k, rings: 2, samples: 12 });
      composer.addPass(gtao);
      this.gtao = gtao;
    }
    this.bloom = null;
    if (q.bloom) {
      this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.32, 0.25, 0.92);
      composer.addPass(this.bloom);
    }
    this.grade = new ShaderPass(GradeShader);
    composer.addPass(this.grade);
    composer.addPass(new OutputPass());
    if (q.aa) composer.addPass(new FXAAPass());
    this.finish = null;
    if (q.sharp) {
      this.finish = new ShaderPass(FinishShader);
      composer.addPass(this.finish);
    }
    r.shadowMap.type = q.shadowType || THREE.PCFShadowMap;
    if (this.lightPool.size !== (q.lights || 6)) this.lightPool.setSize(q.lights || 6);
    this.composer = composer;
    for (const l of this.shadowLights || []) this.applyShadowSize(l);
  }

  setQuality(name) {
    if (!QUALITY[name]) return;
    this.qualityName = name;
    this.quality = QUALITY[name];
    if (this.scene) { this.buildComposer(); this.resize(); }
  }

  registerShadowLight(light, scale = 1) {
    this.shadowLights = this.shadowLights || [];
    light.userData.shadowScale = scale;
    this.shadowLights.push(light);
    this.applyShadowSize(light);
  }

  applyShadowSize(light) {
    const s = Math.max(256, Math.round(this.quality.shadows * (light.userData.shadowScale || 1)));
    if (light.shadow.mapSize.x !== s) {
      light.shadow.mapSize.set(s, s);
      light.shadow.map?.dispose();
      light.shadow.map = null;
    }
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    if (this.camera) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
    if (this.composer) this.composer.setSize(w, h);
    if (this.finish) { const pr = this.renderer.getPixelRatio(); this.finish.uniforms.uRes.value.set(w * pr, h * pr); }
  }

  /** One walk over the scene per frame: point lights for the light pool, shadow casters for the shadow policy. */
  scan() {
    const pool = this.lightPool, casters = this.casters;
    casters.length = 0;
    const walk = (o, vis) => {
      vis = vis && o.visible;
      if (o.isPointLight) { if (!o.userData.poolProxy) pool.offer(o, vis); }
      else if (vis && o.castShadow && (o.isMesh || o.isPoints || o.isLine)) casters.push(o);
      const ch = o.children;
      for (let i = 0; i < ch.length; i++) walk(ch[i], vis);
    };
    walk(this.scene, true);
  }

  /** Shadow update policy (performance). Most casters never move, so a shadow map is only redrawn when its light moved
   *  or turned (the sun steps 4 times a second while the clock runs), when a caster inside its frustum moved, appeared,
   *  disappeared or changed shape (people standing still: every 6th frame), or when it has no map yet; and then at most
   *  every `shadowEvery` frames (every 3 x shadowEvery when everything that moved is over FAR_MOVER metres away).
   *  A still scene redraws no shadows at all; with the light's whole area out of view, none either. */
  updateShadows() {
    const r = this.renderer, every = this.quality.shadowEvery || 1, moved = this.moved, minR = this.quality.shadowMinR || 0;
    if (this.debugShadows) this.shadowStats.movers = [];
    r.shadowMap.autoUpdate = false;
    // casters that changed since the last frame (world matrix, instances, vertices, skinning) or came / went
    moved.length = 0;
    const now = new Set(this.casters);
    for (const o of this.casters) {
      const st = casterState(o), e = o.matrixWorld.elements, m = st.m;
      const iv = o.instanceMatrix ? o.instanceMatrix.version + (o.count || 0) * 1e6 : 0, pv = o.geometry?.attributes?.position?.version ?? 0;
      let ch = iv !== st.v || pv !== st.pv || !this.prevCasters.has(o);
      if (!ch) for (let i = 0; i < 16; i++) if (e[i] !== m[i]) { ch = true; break; }
      // a person standing still still breathes and fidgets: their shadow is refreshed every 6th frame
      if (!ch && st.skinned && ++st.skinT >= 6) ch = true;
      if (!ch) continue;
      st.skinT = 0;
      m.set(e); st.v = iv; st.pv = pv;
      if (o.isInstancedMesh && !o.boundingSphere) o.computeBoundingSphere();
      const bs = o.boundingSphere || o.geometry?.boundingSphere || (o.geometry?.computeBoundingSphere?.(), o.geometry?.boundingSphere);
      st.prev.copy(st.sphere); // where its shadow was (it may have left the light's frustum)
      if (bs) st.sphere.copy(bs).applyMatrix4(o.matrixWorld); else st.sphere.set(_lp.setFromMatrixPosition(o.matrixWorld), 1);
      // small things (a pigeon, a capsule) don't force a redraw on the cheaper presets: their shadows catch up with the
      // next redraw (the sun's next step at the latest)
      if (st.sphere.radius < minR) continue;
      moved.push(st.sphere, st.prev);
      if (this.debugShadows && this.shadowStats.movers.length < 12) this.shadowStats.movers.push(`${o.parent?.name || ''}/${o.name || o.type} r=${st.sphere.radius.toFixed(2)}`);
    }
    for (const o of this.prevCasters) if (!now.has(o) && casterState(o).sphere.radius >= minR) moved.push(casterState(o).sphere); // hidden / removed
    this.prevCasters = now;
    let any = false;
    _cp.setFromMatrixPosition(this.camera.matrixWorld);
    for (const l of this.shadowLights || []) {
      const sh = l.shadow;
      sh.autoUpdate = false;
      // pending: 0 nothing to redraw, 1 only things moving far from you (redrawn at a third of the rate: their shadows
      // are small on screen), 2 redraw at the preset's rate (the light moved, something near you moved, it came back)
      let st = SHADOW.get(l);
      if (!st) SHADOW.set(l, st = { pos: new THREE.Vector3(NaN), tgt: new THREE.Vector3(), pending: 2, age: 1e9 });
      st.age++;
      if (!l.castShadow) continue;
      if (!sh.map) { sh.needsUpdate = true; any = true; st.pending = 0; st.age = 0; continue; }
      let vis = l.intensity > 0.01;
      for (let a = l; vis && a; a = a.parent) vis = a.visible;
      if (!vis || !this.shadowInView(l)) { st.pending = 2; continue; } // off, or its whole area is out of view: redraw later
      _lp.setFromMatrixPosition(l.matrixWorld);
      if (l.target) _lt.setFromMatrixPosition(l.target.matrixWorld);
      if (!_lp.equals(st.pos) || (l.target && !_lt.equals(st.tgt))) { st.pending = 2; st.pos.copy(_lp); st.tgt.copy(_lt); }
      if (st.pending < 2 && moved.length) {
        const f = sh.getFrustum();
        for (const sp of moved) {
          if (sp.radius < 0 || !f.intersectsSphere(sp)) continue;
          st.pending = Math.max(st.pending, sp.center.distanceTo(_cp) - sp.radius < FAR_MOVER ? 2 : 1);
          if (st.pending === 2) break;
        }
      }
      if (st.pending && st.age >= (st.pending === 2 ? every : every * 3)) { sh.needsUpdate = true; any = true; st.pending = 0; st.age = 0; this.shadowStats.updates++; }
    }
    if (any) r.shadowMap.needsUpdate = true;
    this.shadowStats.casters = this.casters.length; this.shadowStats.moved = moved.length >> 1;
  }

  /** Can the camera see any part of the area this light's shadow map covers? (a sphere around its shadow frustum) */
  shadowInView(l) {
    const c = l.shadow.camera, f = this._viewF;
    _lp.setFromMatrixPosition(l.matrixWorld);
    _lt.setFromMatrixPosition(l.target ? l.target.matrixWorld : l.matrixWorld).sub(_lp);
    if (_lt.lengthSq() < 1e-8) return true;
    _lt.normalize();
    if (c.isOrthographicCamera) {
      _sph.center.copy(_lp).addScaledVector(_lt, (c.near + c.far) / 2);
      _sph.radius = 0.5 * Math.hypot(c.right - c.left, c.top - c.bottom, c.far - c.near);
    } else {
      const far = l.distance || c.far, a = Math.min(1.45, l.angle ?? 1);
      _sph.center.copy(_lp).addScaledVector(_lt, far / 2);
      _sph.radius = Math.hypot(far / 2, far * Math.tan(a));
    }
    return f.intersectsSphere(_sph);
  }

  render(dt, time) {
    this.frameN = (this.frameN || 0) + 1;
    const s = this.scene;
    // world matrices once per frame: every pass below (scene, viewmodel, GTAO's normal pass) reuses them
    s.updateMatrixWorld();
    this._viewF ||= new THREE.Frustum();
    this._viewF.setFromProjectionMatrix(_vpm.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse));
    this.scan();
    this.lightPool.update(s, this.camera, dt);
    this.updateShadows();
    const gu = this.grade.uniforms, fx = this.fx;
    gu.uTime.value = time;
    gu.uTired.value = fx.tired; gu.uLid.value = fx.lid; gu.uDouble.value = fx.double; gu.uWobble.value = fx.wobble;
    // the sun for the god rays: the scene's shadow-casting directional light
    if (!this.outline.sun && this.frameN % 30 === 1) this.scene.traverse((o) => { if (!this.outline.sun && o.isDirectionalLight && o.castShadow) this.outline.sun = o; });
    // lights must light both passes; new ones are picked up within a few frames
    if (this.frameN % 8 === 1) this.scene.traverse(lightToVM);
    if (this.gtao) { this.aoCam.copy(this.camera, false); this.aoCam.layers.enable(VM_LAYER); }
    for (const o of this.vmRoots) toVM(o);
    const au = s.matrixWorldAutoUpdate;
    s.matrixWorldAutoUpdate = false;
    try { this.composer.render(dt); } finally { s.matrixWorldAutoUpdate = au; }
    for (const o of this.vmRoots) o.traverse(toMain);
  }
}
