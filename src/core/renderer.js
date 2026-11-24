// Renderer + post-processing stack with quality presets: ink outlines + screen-space god rays from the low sun,
// GTAO, the lens (depth of field + camera motion blur, src/core/lens.js), bloom, colour grade, neutral tone mapping,
// FXAA, then a light sharpen and dither (no banding).
// Black-frame guard: a NaN or Inf from any one material (a zero-length normal, an over-bright emissive overflowing the
// half-float target) is caught where the frame enters the post chain (the outline pass), at the bloom's bright-pass and
// in the grade: left alone, the bloom's blur spread it into black squares and, through its smallest mip, black flashes
// over the whole screen.
// Viewmodel: whatever hangs off the camera (hands + held items, see vmRoots) is drawn in its own pass on top of the
// scene so it never pokes into walls.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAPass } from 'three/addons/postprocessing/FXAAPass.js';
import { LightPool } from '../gfx/lightPool.js';
import { LensPass } from './lens.js';
import '../gfx/sunMask.js'; // shared light patch at import: no sun inside Mikawa-ya, soft tinted shadows
import '../gfx/giShader.js'; // room light patch at import: bounce light from the probe volume, box-projected reflections
import { RoomGI } from '../gfx/roomGI.js';

// The look: a bright picture-book afternoon. Gentle pastel saturation, a soft contrast curve in log space (it never
// clips the darks), and the darkest tones lifted toward a cool lilac so nothing goes pure black.
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 0.12 },
    uGrain: { value: 0.02 },
    uSaturation: { value: 1.0 },
    uContrast: { value: 1.06 },
    uWarm: { value: 0.004 },
    // the floor the shadows are lifted to (linear, added to the darkest tones and fading out by the mid-tones)
    uLift: { value: new THREE.Color(0.004, 0.004, 0.005) },
    uFlash: { value: new THREE.Color(0, 0, 0) },
    uAberration: { value: 0.0006 },
    uExposure: { value: 1.0 },
    // eye adaptation (AdaptPass): a 1x1 texture holding the exposure factor the eye has settled on
    tAdapt: { value: null }, uAdaptOn: { value: 0 },
    // body state (src/needs/Needs.js through renderer.fx): tired (a darker, duller edge), lid (eyelids closing from top and
    // bottom), double (drunk double vision: a second, offset copy), wobble (drunk: the picture sways)
    uTired: { value: 0 }, uLid: { value: 0 }, uDouble: { value: 0 }, uWobble: { value: 0 },
    uToneExposure: { value: 1 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse, tAdapt;
    uniform float uTime, uVignette, uGrain, uSaturation, uContrast, uWarm, uAberration, uExposure, uAdaptOn;
    uniform float uTired, uLid, uDouble, uWobble;
    uniform vec3 uFlash, uLift;
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
      if (any(isnan(col)) || any(isinf(col))) col = vec3(0.0); // (never a NaN into the frame: see the black-frame guard)
      col *= uExposure * (uAdaptOn > 0.5 ? texture2D(tAdapt, vec2(0.5)).r : 1.0);
      // pastel: saturation down (tired: duller still)
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSaturation * (1.0 - 0.35 * uTired));
      // soft contrast around mid grey in log space: a power curve, so the darks are eased up, never clipped to black
      col = 0.18 * pow(max(col, vec3(0.0)) / 0.18, vec3(uContrast));
      // the darkest tones are lifted toward a cool lilac (no crushed blacks), fading out by the mid-tones
      col += uLift * (0.05 / (0.05 + l));
      // a hint of warmth in the highlights
      col += vec3(uWarm, uWarm * 0.45, -uWarm * 0.3) * smoothstep(0.15, 1.2, l);
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
    #ifdef GG_OUTPUT
      gl_FragColor = sRGBTransferOETF(vec4(ggNeutral(gl_FragColor.rgb), 1.0));
    #endif
    }`,
};
// Performance: the grade also does OutputPass's work (Khronos PBR Neutral tone mapping, then the sRGB transfer), the
// same maths in the same order, so the frame skips one full-screen pass and one half-float target round trip.
const NEUTRAL_GLSL = /* glsl */`
    uniform float uToneExposure;
    vec3 ggNeutral(vec3 color) { // (three's NeutralToneMapping, tonemapping_pars_fragment)
      const float StartCompression = 0.8 - 0.04;
      const float Desaturation = 0.15;
      color *= uToneExposure;
      float x = min(color.r, min(color.g, color.b));
      float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
      color -= offset;
      float peak = max(color.r, max(color.g, color.b));
      if (peak < StartCompression) return color;
      float d = 1. - StartCompression;
      float newPeak = 1. - d * d / (peak + d - StartCompression);
      color *= newPeak / peak;
      float g = 1. - 1. / (Desaturation * (peak - newPeak) + 1.);
      return mix(color, vec3(newPeak), g);
    }`;
const GradeOutputShader = { ...GradeShader, defines: { GG_OUTPUT: '' }, fragmentShader: GradeShader.fragmentShader.replace('varying vec2 vUv;', 'varying vec2 vUv;' + NEUTRAL_GLSL) };

// Anime-style ink outlines: edges where depth jumps (silhouettes and creases), drawn on the lit image.
const OutlineShader = {
  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: null },
    uRes: { value: new THREE.Vector2(1, 1) },
    uNear: { value: 0.05 },
    uFar: { value: 120 },
    uWidth: { value: 1.0 },
    uStrength: { value: 0.4 },
    uInk: { value: new THREE.Color(0x1c1016) },
    // the line is the surface's own colour darkened through a plum ink (cartoon ink: dark on dark things, a deeper shade
    // of the colour on bright ones, never a heavy black stroke across a sunny wall)
    uInkK: { value: new THREE.Color(0.24, 0.2, 0.28) },
    // god rays: sky pixels (no depth written) marched toward the sun's screen position
    uSun: { value: new THREE.Vector2(0.5, 0.5) },
    uSunOn: { value: 0 },
    uDepthAlpha: { value: 0 }, // 1: write the linear depth (m) to alpha, for the AO upsample after it (AOUpsampleShader)
    uAspect: { value: 1 },
    uShaft: { value: 0.75 },
    uShaftCol: { value: new THREE.Color(1.0, 0.72, 0.42) },
  },
  vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse, tDepth;
    uniform vec2 uRes; uniform float uNear, uFar, uWidth, uStrength; uniform vec3 uInk, uInkK;
    uniform vec2 uSun; uniform float uSunOn, uAspect, uShaft, uDepthAlpha; uniform vec3 uShaftCol;
    varying vec2 vUv;
    float lin(vec2 uv) { float z = texture2D(tDepth, uv).x * 2.0 - 1.0; return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear)); }
    float sky(vec2 uv) { return step(0.99999, texture2D(tDepth, uv).x); }
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec4 col = texture2D(tDiffuse, vUv);
      // the black-frame guard: a NaN / Inf pixel from a material becomes a neighbour's colour (or black), and nothing
      // brighter than the bloom can use goes on down the chain
      if (any(isnan(col.rgb)) || any(isinf(col.rgb))) {
        col.rgb = texture2D(tDiffuse, vUv + vec2(0.0, 1.0) / uRes).rgb;
        if (any(isnan(col.rgb)) || any(isinf(col.rgb))) col.rgb = vec3(0.0);
      }
      col.rgb = min(col.rgb, vec3(256.0));
      vec2 o = uWidth / uRes;
      float d = lin(vUv);
      float dl = lin(vUv - vec2(o.x, 0.0)), dr = lin(vUv + vec2(o.x, 0.0));
      float du = lin(vUv + vec2(0.0, o.y)), dd = lin(vUv - vec2(0.0, o.y));
      // second derivative catches creases, first derivative catches silhouettes; both relative to distance
      float lap = abs(dl + dr + du + dd - 4.0 * d) / d;
      float jump = max(max(abs(dl - d), abs(dr - d)), max(abs(du - d), abs(dd - d))) / d;
      // people's skin and faces (marked by alpha 0.5 from their material, src/people/Human.js) get no crease lines and a
      // lighter silhouette: inked creases across a face read as wooden planes
      float skin = step(col.a, 0.75) * step(0.25, col.a);
      float e = max(smoothstep(0.05, 0.12, lap) * (1.0 - skin), smoothstep(0.08, 0.16, jump) * (1.0 - 0.5 * skin));
      e *= 1.0 - smoothstep(25.0, 60.0, d); // fade far away so the skyline stays soft
      vec3 outc = mix(col.rgb, col.rgb * uInkK + uInk * 0.4, e * uStrength);
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
      gl_FragColor = vec4(outc, uDepthAlpha > 0.5 ? d : col.a);
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
// its own, so the AO of a wall behind never bleeds onto the edge of something in front (no halos). It runs at full
// resolution too (ultra), in place of GTAOPass's own copy + blend (one pass, and the depth kept in alpha). It also multiplies
// the AO into the scene in the same pass (GTAOPass did a full-screen copy and then a multiply blend). The depths come
// from the alpha channel of its input: the outline pass just before it leaves each pixel's linear depth there
// (OutlineShader uDepthAlpha), because this pass writes into the target that holds the scene's depth buffer.
const AOUpsampleShader = {
  uniforms: { tDiffuse: { value: null }, tAO: { value: null }, aoSize: { value: new THREE.Vector2(1, 1) }, intensity: { value: 1 }, uFar: { value: 1e9 } },
  vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse, tAO;
    uniform vec2 aoSize;
    uniform float intensity, uFar;
    varying vec2 vUv;
    float depthAt(vec2 uv) { vec2 s = vec2(textureSize(tDiffuse, 0)); return texelFetch(tDiffuse, ivec2(clamp(floor(uv * s), vec2(0.0), s - 1.0)), 0).a; }
    void main() {
      vec4 col = texture2D(tDiffuse, vUv);
      float z = col.a;
      // open sky (nothing drawn: the far plane) never takes AO; a wire or a twig's dark AO texel would otherwise print a
      // dark square on it (the AO pass and this upsample can pick different full-res pixels for a texel's depth)
      if (z >= uFar * 0.98) { gl_FragColor = vec4(col.rgb, z); return; }
      vec2 p = vUv * aoSize - 0.5, b = floor(p), f = p - b;
      vec3 ao = vec3(0.0);
      float ws = 0.0;
      for (int j = 0; j < 2; j++) for (int i = 0; i < 2; i++) {
        // the AO texel's centre (the depth the AO pass saw there)
        vec2 t = (b + vec2(float(i), float(j)) + 0.5) / aoSize;
        float bw = (i == 0 ? 1.0 - f.x : f.x) * (j == 0 ? 1.0 - f.y : f.y);
        float w = bw / (0.01 + abs(depthAt(t) - z) / max(z, 1e-3));
        ao += texture2D(tAO, t).rgb * w; ws += w;
      }
      ao /= max(ws, 1e-6);
      if (any(isnan(ao)) || any(isinf(ao))) ao = vec3(1.0); // (never let a bad AO texel through)
      ao = clamp(ao, 0.0, 1.0);
      gl_FragColor = vec4(col.rgb * mix(vec3(1.0), ao, intensity), z); // (the depth stays in alpha for the lens)
    }`,
};

// Eye adaptation: the frame's average brightness (log luminance, centre-weighted, from a 16x16 grid of 4x4 samples)
// steers an exposure factor that eases toward it over about a second: step into a dim room and it opens up, look out
// at the sunlit lane and it closes down. Only part of the difference is made up (STRENGTH), so a night room still
// reads darker than noon. The factor lives in a 1x1 half-float texture the grade reads (no read-back, no stall).
const ADAPT = { KEY: 0.34, STRENGTH: 0.55, MIN: 0.62, MAX: 2.1, SPEED: 1.6 };
const LumShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; varying vec2 vUv;
    void main() {
      float acc = 0.0;
      for (int j = 0; j < 4; j++) for (int i = 0; i < 4; i++) {
        vec2 uv = vUv + (vec2(float(i), float(j)) - 1.5) / 64.0;
        vec3 c = texture2D(tDiffuse, uv).rgb;
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        if (isnan(l) || isinf(l)) l = 0.0;
        acc += log2(clamp(l, 1e-3, 64.0));
      }
      vec2 d = (vUv - 0.5) * vec2(1.6, 2.0);
      float w = 0.25 + exp(-dot(d, d) * 2.5);
      gl_FragColor = vec4(acc / 16.0 * w, w, 0.0, 1.0);
    }`,
};
const AdaptShader = {
  uniforms: { tLum: { value: null }, tPrev: { value: null }, uK: { value: 1 }, uSnap: { value: 1 }, uKey: { value: ADAPT.KEY }, uStrength: { value: ADAPT.STRENGTH }, uMin: { value: ADAPT.MIN }, uMax: { value: ADAPT.MAX } },
  vertexShader: /* glsl */`void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tLum, tPrev; uniform float uK, uSnap, uKey, uStrength, uMin, uMax;
    void main() {
      vec2 s = vec2(0.0);
      for (int j = 0; j < 16; j++) for (int i = 0; i < 16; i++) s += texelFetch(tLum, ivec2(i, j), 0).rg;
      float lum = exp2(s.x / max(s.y, 1e-4));
      float target = clamp(pow(uKey / max(lum, 1e-4), uStrength), uMin, uMax);
      float prev = texelFetch(tPrev, ivec2(0), 0).r;
      float e = (uSnap > 0.5 || !(prev > 0.0) || isnan(prev)) ? target : mix(prev, target, uK);
      gl_FragColor = vec4(e, lum, target, 1.0);
    }`,
};
const _adaptCam = new THREE.Vector3();
class AdaptPass extends Pass {
  constructor(camera) {
    super();
    this.needsSwap = false;
    this.camera = camera;
    const o = { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false };
    this.lum = new THREE.WebGLRenderTarget(16, 16, o);
    this.rt = [new THREE.WebGLRenderTarget(1, 1, o), new THREE.WebGLRenderTarget(1, 1, o)];
    this.lumQuad = new FullScreenQuad(new THREE.ShaderMaterial({ ...LumShader, uniforms: THREE.UniformsUtils.clone(LumShader.uniforms), depthTest: false, depthWrite: false }));
    this.adaptQuad = new FullScreenQuad(new THREE.ShaderMaterial({ ...AdaptShader, uniforms: THREE.UniformsUtils.clone(AdaptShader.uniforms), depthTest: false, depthWrite: false }));
    this.snap = true;
    this.pos = new THREE.Vector3(1e9, 0, 0);
  }
  get texture() { return this.rt[0].texture; }
  render(renderer, writeBuffer, readBuffer, dt) {
    // (a cut, a door or a teleport: the eye is already used to the new place)
    this.camera.getWorldPosition(_adaptCam);
    if (_adaptCam.distanceToSquared(this.pos) > 6) this.snap = true;
    this.pos.copy(_adaptCam);
    const ac = renderer.autoClear;
    renderer.autoClear = false;
    this.lumQuad.material.uniforms.tDiffuse.value = readBuffer.texture;
    renderer.setRenderTarget(this.lum);
    this.lumQuad.render(renderer);
    this.rt.reverse();
    const u = this.adaptQuad.material.uniforms;
    u.tLum.value = this.lum.texture; u.tPrev.value = this.rt[1].texture;
    u.uK.value = 1 - Math.exp(-Math.min(0.25, dt || 0) * ADAPT.SPEED);
    u.uSnap.value = this.snap ? 1 : 0;
    renderer.setRenderTarget(this.rt[0]);
    this.adaptQuad.render(renderer);
    renderer.autoClear = ac;
    if (this.gradeU) this.gradeU.tAdapt.value = this.rt[0].texture;
    this.snap = false;
  }
  dispose() { this.lum.dispose(); for (const t of this.rt) t.dispose(); this.lumQuad.dispose(); this.adaptQuad.dispose(); }
}

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
// maxPx: the most pixels a frame is drawn at (performance: a 4K / high-DPI screen on the cheaper presets renders at
// about this many and is scaled up, instead of four times the fill of a 1080p frame).
// verylow: the hard FPS-friendly preset for weak integrated GPUs (fewer lit point lights, no bloom, ~1000x560 pixels).
// lens (src/core/lens.js; none: off): dof = background blur taps (half resolution), near = foreground blur taps in
// cutscenes (0: none), mb = motion blur taps (full resolution, 0: none), mbScale = its exposure, farPx = the widest
// background blur (pixels at 1080 lines, cutscene aperture; play uses about 60% of it).
export const QUALITY = {
  verylow: { pixelRatio: 0.6, maxPx: 0.6e6, shadows: 1024, ao: false, bloom: false, aa: true, shadowType: THREE.PCFShadowMap, shadowEvery: 4, shadowMinR: 0.5, rays: 0, sharp: 0, lights: 2, view: 0.5, crowd: 0.45, lens: null, gi: { spacing: 1.0, per: 1, max: 90 }, giSoft: 2, shadowSoft: 1 },
  low: { pixelRatio: 0.75, maxPx: 1.0e6, shadows: 1024, ao: false, bloom: true, aa: true, shadowType: THREE.PCFShadowMap, shadowEvery: 3, shadowMinR: 0.3, rays: 0, sharp: 0, lights: 4, view: 0.65, crowd: 0.6, lens: { dof: 8, near: 0, mb: 5, mbScale: 0.55, farPx: 6 }, gi: { spacing: 0.8, per: 2, max: 140 }, giSoft: 3, shadowSoft: 1.5 },
  medium: { pixelRatio: 1.0, maxPx: 2.1e6, shadows: 2048, ao: true, aoScale: 0.5, aoSamples: 8, bloom: true, aa: true, shadowType: THREE.PCFShadowMap, shadowEvery: 2, shadowMinR: 0.15, rays: 1, sharp: 1, lights: 5, view: 0.8, crowd: 0.8, lens: { dof: 12, near: 10, mb: 7, mbScale: 0.65, farPx: 7, nearPx: 6 }, gi: { spacing: 0.7, per: 3, max: 180 }, giSoft: 4, shadowSoft: 2 },
  high: { pixelRatio: 1.0, shadows: 2048, ao: true, aoScale: 0.5, bloom: true, aa: true, shadowType: THREE.PCFShadowMap, shadowEvery: 2, rays: 1, sharp: 1, lights: 6, view: 1, crowd: 1, lens: { dof: 16, near: 12, mb: 9, mbScale: 0.7, farPx: 8, nearPx: 7 }, gi: { spacing: 0.6, per: 4, max: 220 }, giSoft: 5, shadowSoft: 2.5 },
  ultra: { pixelRatio: 1.5, shadows: 4096, ao: true, aoScale: 1, bloom: true, aa: true, shadowType: THREE.PCFShadowMap, shadowEvery: 1, rays: 1, sharp: 1, lights: 8, view: 1.2, crowd: 1, lens: { dof: 20, near: 16, mb: 12, mbScale: 0.7, farPx: 8, nearPx: 7 }, gi: { spacing: 0.5, per: 6, max: 320 }, giSoft: 6, shadowSoft: 3 },
};

export class Renderer {
  constructor(container) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
    const r = this.renderer;
    r.outputColorSpace = THREE.SRGBColorSpace;
    // Khronos PBR Neutral: true hues (the lanterns stay red, the sky stays blue) and a soft shoulder for the lit signs;
    // the grade before it sets the bright, pastel cartoon look
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 1.2;
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
    this.vignette = GradeShader.uniforms.uVignette.value; // the grade's resting vignette (Held's inspect view darkens it, then returns here)
    // the lens's options (src/core/lens.js; they survive quality changes): dof / motionBlur 0..1 (Settings), mode 'game'
    // or 'cine', focus (m, null: auto-focus on the centre of the screen), aperture (null: the mode's)
    this.lensOpts = { dof: 1, motionBlur: 1, mode: 'game', focus: null, aperture: null };
    this.lens = null;
    this.lightPool = new LightPool(VM_LAYER);
    this.casters = []; this.prevCasters = new Set(); this.moved = []; // shadow casters seen by this frame's walk
    this.points = []; // particle systems seen by this frame's walk (kept out of the light probes)
    this.gi = new RoomGI(this); // the interiors' bounce light, reflections and lamps (src/gfx/roomGI.js)
    this.shadowStats = { casters: 0, moved: 0, updates: 0, movers: [] };
  }

  setup(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.gi.setup(scene);
    this.buildComposer();
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  /** The drawing-buffer scale for this window: the preset's share of the screen's pixels, capped at q.maxPx. */
  pixelRatioFor(w = window.innerWidth, h = window.innerHeight) {
    const q = this.quality;
    let pr = Math.min(window.devicePixelRatio || 1, 2) * q.pixelRatio;
    if (q.maxPx && w * h * pr * pr > q.maxPx) pr = Math.sqrt(q.maxPx / Math.max(1, w * h));
    return pr;
  }

  buildComposer() {
    const r = this.renderer;
    const q = this.quality;
    r.setPixelRatio(this._pr = this.pixelRatioFor());
    if (this.composer) this.composer.dispose?.();
    // (a quality change: free the last build's own passes, their render targets and materials; passes other modules
    // attached, such as src/jojo's impact pass, are theirs to keep and re-attach)
    for (const p of this.ownPasses || []) { try { p.dispose?.(); } catch { /* already gone */ } }
    this.lens = null;
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
      // (the upsample also runs at full resolution: one pass instead of GTAOPass's copy + blend, NaN-safe, and it keeps
      // the depth in alpha for the lens)
      const up = this.aoUp = new ShaderPass(AOUpsampleShader);
      gtao.render = (rr, wb, rb, dt, mask) => {
        const d = this.vmPass.target?.depthTexture;
        if (d && gtao.depthTexture !== d) { gtao.depthTexture = d; gtao.gtaoMaterial.uniforms.tDepth.value = d; gtao.pdMaterial.uniforms.tDepth.value = d; }
        gtaoRender(rr, wb, rb, dt, mask);
        if (up) {
          up.uniforms.tAO.value = gtao.pdRenderTarget.texture; up.uniforms.intensity.value = gtao.blendIntensity; up.uniforms.uFar.value = this.camera.far;
          up.renderToScreen = gtao.renderToScreen;
          up.render(rr, wb, rb);
        }
      };
      {
        // AO and its denoise at k x the resolution; the upsample writes the frame (GTAOPass itself outputs nothing)
        const setSize = gtao.setSize.bind(gtao);
        gtao.setSize = (w, h) => { setSize(Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k))); up.uniforms.aoSize.value.set(gtao.width, gtao.height); };
        gtao.output = GTAOPass.OUTPUT.Off;
        this.outline.uniforms.uDepthAlpha.value = 1;
      }
      gtao.blendIntensity = 0.95; // (contact shadows where props meet floors and walls; the probe volume does the room-scale darkening)
      gtao.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.6, thickness: 1.2, scale: 1.0, samples: q.aoSamples || 12, distanceFallOff: 1.0 });
      // (the denoise radius is in AO pixels: the same footprint on screen at any scale)
      gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6 * k, rings: 2, samples: 12 });
      composer.addPass(gtao);
      this.gtao = gtao;
    }
    // eye adaptation: measured on the lit HDR frame (before the lens and the bloom), applied in the grade
    this.adapt = new AdaptPass(this.camera);
    composer.addPass(this.adapt);
    // the lens: depth of field + motion blur, on the HDR frame before the bloom (the depth is in alpha from here)
    if (q.lens) {
      this.outline.uniforms.uDepthAlpha.value = 1;
      this.lens = new LensPass(this.camera, q.lens, this.lensOpts);
      composer.addPass(this.lens);
    }
    this.bloom = null;
    if (q.bloom) {
      this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.24, 0.2, 1.15);
      // a sun glint on glass or chrome is many times brighter than a lit sign: capped before the blur, it can't bloom into
      // a white glowy halo (owner rule); lanterns, signs and the tubes (about 1.2 to 2.2) bloom as before
      const hp = this.bloom.materialHighPassFilter, MIX = 'gl_FragColor = mix( outputColor, texel, alpha );';
      // (and the black-frame guard: a NaN / Inf texel here would be blurred over the whole screen)
      if (hp.fragmentShader.includes(MIX)) { hp.fragmentShader = hp.fragmentShader.replace(MIX, `if ( any( isnan( texel.rgb ) ) || any( isinf( texel.rgb ) ) ) { texel = vec4( 0.0 ); v = 0.0; alpha = 0.0; }\ntexel.rgb *= min( 1.0, 2.2 / max( v, 1e-4 ) );\n${MIX}`); hp.needsUpdate = true; }
      composer.addPass(this.bloom);
    }
    // (the grade folds in the output transform when it is the standard one: Neutral tone mapping to sRGB)
    const fold = r.toneMapping === THREE.NeutralToneMapping && r.outputColorSpace === THREE.SRGBColorSpace;
    this.grade = new ShaderPass(fold ? GradeOutputShader : GradeShader);
    this.grade.material.toneMapped = false;
    this.grade.uniforms.tAdapt.value = this.adapt.texture; this.grade.uniforms.uAdaptOn.value = 1; this.adapt.gradeU = this.grade.uniforms;
    this.gradeOutput = fold;
    composer.addPass(this.grade);
    if (!fold) composer.addPass(new OutputPass());
    if (q.aa) composer.addPass(new FXAAPass());
    this.finish = null;
    if (q.sharp) {
      this.finish = new ShaderPass(FinishShader);
      composer.addPass(this.finish);
    }
    r.shadowMap.type = q.shadowType || THREE.PCFShadowMap;
    if (this.lightPool.size !== (q.lights || 6)) this.lightPool.setSize(q.lights || 6);
    this.composer = composer;
    this.ownPasses = composer.passes.slice();
    for (const l of this.shadowLights || []) this.applyShadowSize(l);
  }

  setQuality(name) {
    if (!QUALITY[name]) return;
    if (QUALITY[name].gi?.spacing !== this.quality.gi?.spacing) this.gi.reset();
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
    // soft shadows (PCF over a rotated Vogel disc, in shadow-map texels): wider on the better presets
    light.shadow.radius = (this.quality.shadowSoft ?? 2) * (light.userData.shadowSoft ?? 1);
    if (light.shadow.mapSize.x !== s) {
      light.shadow.mapSize.set(s, s);
      light.shadow.map?.dispose();
      light.shadow.map = null;
    }
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const pr = this.pixelRatioFor(w, h);
    // (a capped preset: the window grew or shrank; a ratio someone else set, such as tools/perf.mjs, is left alone)
    if (this.composer && this.renderer.getPixelRatio() === this._pr && Math.abs(pr - this._pr) > 1e-3) {
      this.renderer.setPixelRatio(this._pr = pr);
      this.composer.setPixelRatio(pr);
      this.outline.uniforms.uWidth.value = Math.max(1, pr);
    }
    this.renderer.setSize(w, h);
    if (this.camera) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
    if (this.composer) this.composer.setSize(w, h);
    if (this.finish) { const pr = this.renderer.getPixelRatio(); this.finish.uniforms.uRes.value.set(w * pr, h * pr); }
  }

  /** One walk over the scene per frame: point lights for the light pool, shadow casters for the shadow policy. */
  scan() {
    const pool = this.lightPool, casters = this.casters, points = this.points;
    casters.length = 0; points.length = 0;
    const walk = (o, vis) => {
      vis = vis && o.visible;
      if (o.isPointLight) { if (!o.userData.poolProxy) pool.offer(o, vis); }
      else if (vis && o.isPoints) { points.push(o); if (o.castShadow) casters.push(o); }
      else if (vis && o.castShadow && (o.isMesh || o.isLine)) casters.push(o);
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
    this.gi.frame(dt); // (the room's lamps on the rig before the shadow policy sees them)
    this.lightPool.update(s, this.camera, dt);
    this.updateShadows();
    const gu = this.grade.uniforms, fx = this.fx;
    gu.uTime.value = time;
    gu.uToneExposure.value = this.renderer.toneMappingExposure;
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
    // (after the frame: a few light probes of the room you're in, while its light is new or changed)
    try { this.gi.bake(); } catch (e) { this.gi.enabled = false; console.warn('room light bake off:', e); }
  }
}
