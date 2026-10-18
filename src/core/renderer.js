// Renderer + post-processing stack (GTAO, bloom, colour grade, tone mapping, FXAA) with quality presets.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
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
    uSaturation: { value: 1.08 },
    uContrast: { value: 1.04 },
    uWarm: { value: 0.03 },
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
  },
  vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse, tDepth;
    uniform vec2 uRes; uniform float uNear, uFar, uWidth, uStrength; uniform vec3 uInk;
    varying vec2 vUv;
    float lin(vec2 uv) { float z = texture2D(tDepth, uv).x * 2.0 - 1.0; return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear)); }
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
      gl_FragColor = vec4(mix(col.rgb, uInk * col.rgb * 0.35 + uInk * 0.4, e * uStrength), col.a);
    }`,
};

class OutlinePass extends ShaderPass {
  constructor(camera) { super(OutlineShader); this.camera = camera; }
  render(renderer, writeBuffer, readBuffer, dt, mask) {
    const u = this.uniforms;
    u.tDepth.value = readBuffer.depthTexture;
    u.uNear.value = this.camera.near; u.uFar.value = this.camera.far;
    u.uRes.value.set(readBuffer.width, readBuffer.height);
    super.render(renderer, writeBuffer, readBuffer, dt, mask);
  }
}

export const QUALITY = {
  low: { pixelRatio: 0.75, shadows: 1024, ao: false, bloom: true, aa: true, shadowType: THREE.PCFShadowMap, shadowEvery: 3 },
  medium: { pixelRatio: 1.0, shadows: 2048, ao: false, bloom: true, aa: true, shadowType: THREE.PCFShadowMap, shadowEvery: 2 },
  high: { pixelRatio: 1.0, shadows: 2048, ao: true, bloom: true, aa: true, shadowType: THREE.PCFShadowMap, shadowEvery: 1 },
  ultra: { pixelRatio: 1.5, shadows: 4096, ao: true, bloom: true, aa: true, shadowType: THREE.PCFShadowMap, shadowEvery: 1 },
};

export class Renderer {
  constructor(container) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
    const r = this.renderer;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(r.domElement);
    r.domElement.id = 'game-canvas';
    this.qualityName = 'high';
    this.quality = QUALITY.high;
    this.composer = null;
    this.scene = null;
    this.camera = null;
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
    this.outline = new OutlinePass(this.camera);
    this.outline.uniforms.uWidth.value = Math.max(1, r.getPixelRatio());
    composer.addPass(this.outline);
    this.gtao = null;
    if (q.ao) {
      const gtao = new GTAOPass(this.scene, this.camera, size.x, size.y);
      gtao.output = GTAOPass.OUTPUT.Default;
      gtao.blendIntensity = 0.85;
      gtao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.5, thickness: 1.5, scale: 1.0, samples: 12, distanceFallOff: 1.0 });
      gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
      composer.addPass(gtao);
      this.gtao = gtao;
    }
    this.bloom = null;
    if (q.bloom) {
      this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.42, 0.55, 0.92);
      composer.addPass(this.bloom);
    }
    this.grade = new ShaderPass(GradeShader);
    composer.addPass(this.grade);
    composer.addPass(new OutputPass());
    if (q.aa) composer.addPass(new FXAAPass());
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
    this.composer.render(dt);
  }
}
