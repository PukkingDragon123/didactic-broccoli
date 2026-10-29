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
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime, uVignette, uGrain, uSaturation, uContrast, uWarm, uAberration, uExposure;
    uniform vec3 uFlash;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 c = vUv - 0.5;
      float r2 = dot(c, c);
      vec2 off = c * r2 * uAberration * 8.0;
      vec3 col;
      col.r = texture2D(tDiffuse, vUv + off).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - off).b;
      col *= uExposure;
      // saturation & contrast in linear HDR (gentle)
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSaturation);
      col = max(vec3(0.0), (col - 0.18) * uContrast + 0.18);
      // warm cinematic split: shadows slightly teal, highlights warm
      col += vec3(uWarm, uWarm * 0.4, -uWarm * 0.6) * smoothstep(0.1, 1.2, l);
      col += vec3(-0.004, 0.002, 0.008) * (1.0 - smoothstep(0.0, 0.25, l));
      // vignette
      col *= 1.0 - uVignette * smoothstep(0.08, 0.55, r2 * 1.6);
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
const toVM = (o) => {
  if (o.userData.mainPass) return;
  if (o.isLight) o.layers.enable(VM_LAYER); else o.layers.set(VM_LAYER);
  for (const c of o.children) toVM(c);
};
const toMain = (o) => { if (!o.isLight) o.layers.set(0); };
const lightToVM = (o) => { if (o.isLight) o.layers.enable(VM_LAYER); };

export const QUALITY = {
  low: { pixelRatio: 0.75, shadows: 1024, ao: false, bloom: true, aa: true, shadowType: THREE.PCFShadowMap, shadowEvery: 3, rays: 0, sharp: 0 },
  medium: { pixelRatio: 1.0, shadows: 2048, ao: false, bloom: true, aa: true, shadowType: THREE.PCFShadowMap, shadowEvery: 2, rays: 1, sharp: 1 },
  high: { pixelRatio: 1.0, shadows: 2048, ao: true, bloom: true, aa: true, shadowType: THREE.PCFShadowMap, shadowEvery: 1, rays: 1, sharp: 1 },
  ultra: { pixelRatio: 1.5, shadows: 4096, ao: true, bloom: true, aa: true, shadowType: THREE.PCFShadowMap, shadowEvery: 1, rays: 1, sharp: 1 },
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
    composer.addPass(new ViewmodelPass(this.scene, this.camera));
    this.outline = new OutlinePass(this.camera);
    this.outline.uniforms.uWidth.value = Math.max(1, r.getPixelRatio());
    this.outline.rays = q.rays ?? 1;
    composer.addPass(this.outline);
    this.gtao = null;
    if (q.ao) {
      const gtao = new GTAOPass(this.scene, this.aoCam, size.x, size.y);
      gtao.output = GTAOPass.OUTPUT.Default;
      gtao.blendIntensity = 0.85;
      gtao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.5, thickness: 1.5, scale: 1.0, samples: 12, distanceFallOff: 1.0 });
      gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
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

  render(dt, time) {
    // shadow maps are refreshed at a quality-dependent rate (most casters are static)
    this.frameN = (this.frameN || 0) + 1;
    const r = this.renderer;
    r.shadowMap.autoUpdate = false;
    let need = this.frameN % (this.quality.shadowEvery || 1) === 0;
    // a light that just started casting (or was resized) has no map yet: render it now
    for (const l of this.shadowLights || []) if (l.castShadow && !l.shadow.map) need = true;
    if (need) r.shadowMap.needsUpdate = true;
    this.grade.uniforms.uTime.value = time;
    // the sun for the god rays: the scene's shadow-casting directional light
    if (!this.outline.sun && this.frameN % 30 === 1) this.scene.traverse((o) => { if (!this.outline.sun && o.isDirectionalLight && o.castShadow) this.outline.sun = o; });
    // lights must light both passes; new ones are picked up within a few frames
    if (this.frameN % 8 === 1) this.scene.traverse(lightToVM);
    if (this.gtao) { this.aoCam.copy(this.camera, false); this.aoCam.layers.enable(VM_LAYER); }
    for (const o of this.vmRoots) toVM(o);
    this.composer.render(dt);
    for (const o of this.vmRoots) o.traverse(toMain);
  }
}
