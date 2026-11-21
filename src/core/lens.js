// The lens: depth of field and camera motion blur, one pass in the composer between the ambient occlusion and the bloom
// (src/core/renderer.js). It reads the frame's linear depth (metres) from the alpha channel the outline pass leaves it
// (OutlineShader uDepthAlpha), so it never samples the depth texture of the target it draws into.
//   depth of field  a soft background: the frame is halved, blurred with a disc gather in which only samples that are
//                   themselves out of focus far enough reach a pixel (a sharp foreground never bleeds into the blur),
//                   and mixed back in by each pixel's own circle of confusion. In cutscenes (mode 'cine') a second
//                   gather spreads the out-of-focus foreground over what is behind it. The focus distance comes from
//                   `focus` (metres, set by a cutscene) or the auto-focus: the depth at the centre of the screen, read
//                   back a frame or two late without stalling (readRenderTargetPixelsAsync), eased like a focus pull.
//   motion blur     camera motion only: each pixel's world position is reprojected with last frame's camera, and the
//                   frame is sampled along that screen velocity, scaled to a fixed exposure (so it looks the same at
//                   any frame rate). Cuts and teleports (a big jump between two frames) are never blurred.
// The viewmodel (your hands and what they hold, drawn VM_DEPTH times closer: src/core/renderer.js) is never blurred
// and never smeared into the background: anything that reads nearer than VM_CUT is treated as in your hands.
//   pass.opts: { dof: 0..1, motionBlur: 0..1, mode: 'game' | 'cine', focus: metres | null, aperture: scale | null }
import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

/** Linear depth below which a pixel counts as the viewmodel (hands drawn VM_DEPTH closer read 0.1-0.3 m). */
export const VM_CUT = 0.3;

const VERT = /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

// the circle of confusion in full-resolution pixels (signed: negative in front of the focus, positive behind)
const COC = /* glsl */`
  uniform float uFocus, uFarPx, uNearPx, uBand, uVM, uFarD, uMinD, uRampD;
  float cocOf(float d) {
    if (d < uVM) return 0.0;
    float k = 1.0 - uFocus / max(d, 1e-3);
    // (in play the background only starts to soften a few metres out: the room you work in stays crisp)
    if (k > 0.0) return uFarPx * clamp((k - uBand) / (1.0 - uBand), 0.0, 1.0) * smoothstep(uMinD, uMinD + uRampD, d);
    return -uNearPx * clamp((-k - uBand) / 1.5, 0.0, 1.0);
  }`;

// half resolution: four full-res texels averaged (the hands left out), alpha = the CoC (most negative wins: the
// foreground spreads; otherwise the smallest: a sharp edge never takes the background's blur)
const DownShader = {
  uniforms: { tDiffuse: { value: null }, uTexel: { value: new THREE.Vector2() }, uFocus: { value: 4 }, uFarPx: { value: 4 }, uNearPx: { value: 0 }, uBand: { value: 0.3 }, uVM: { value: VM_CUT }, uFarD: { value: 160 }, uMinD: { value: -1 }, uRampD: { value: 1 } },
  vertexShader: VERT,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform vec2 uTexel;
    varying vec2 vUv;
    ${COC}
    void main() {
      vec4 a = texture2D(tDiffuse, vUv + uTexel * vec2(-0.5, -0.5)), b = texture2D(tDiffuse, vUv + uTexel * vec2(0.5, -0.5));
      vec4 c = texture2D(tDiffuse, vUv + uTexel * vec2(-0.5, 0.5)), d = texture2D(tDiffuse, vUv + uTexel * vec2(0.5, 0.5));
      vec4 w = vec4(step(uVM, a.a), step(uVM, b.a), step(uVM, c.a), step(uVM, d.a)) + 1e-3;
      vec3 col = (a.rgb * w.x + b.rgb * w.y + c.rgb * w.z + d.rgb * w.w) / dot(w, vec4(1.0));
      vec4 k = vec4(cocOf(a.a), cocOf(b.a), cocOf(c.a), cocOf(d.a));
      float mn = min(min(k.x, k.y), min(k.z, k.w));
      float coc = mn < -0.5 ? mn : max(mn, 0.0);
      if (any(isnan(col)) || any(isinf(col))) col = vec3(0.0);
      gl_FragColor = vec4(min(col, vec3(64.0)), coc);
    }`,
};

// half resolution: the background blur (samples reach a pixel only if their own CoC covers the distance)
const FarShader = {
  uniforms: { tDown: { value: null }, uTexel: { value: new THREE.Vector2() } },
  defines: { TAPS: 12 },
  vertexShader: VERT,
  fragmentShader: /* glsl */`
    uniform sampler2D tDown; uniform vec2 uTexel;
    varying vec2 vUv;
    void main() {
      vec4 c0 = texture2D(tDown, vUv);
      float R = max(c0.a, 0.0) * 0.5; // (half-res pixels)
      if (R < 0.4) { gl_FragColor = vec4(c0.rgb, 1.0); return; }
      vec3 acc = c0.rgb; float ws = 1.0;
      for (int i = 0; i < TAPS; i++) {
        float r = sqrt((float(i) + 0.5) / float(TAPS)), th = float(i) * 2.39996323;
        vec4 s = texture2D(tDown, vUv + vec2(cos(th), sin(th)) * (r * R) * uTexel);
        float w = clamp(1.0 + max(s.a, 0.0) * 0.5 - r * R, 0.0, 1.0);
        acc += s.rgb * w; ws += w;
      }
      gl_FragColor = vec4(acc / ws, 1.0);
    }`,
};

// half resolution, cutscenes only: the foreground's blur spread over what is behind it (alpha: its coverage)
const NearShader = {
  uniforms: { tDown: { value: null }, uTexel: { value: new THREE.Vector2() }, uNearPx: { value: 0 } },
  defines: { TAPS: 12 },
  vertexShader: VERT,
  fragmentShader: /* glsl */`
    uniform sampler2D tDown; uniform vec2 uTexel; uniform float uNearPx;
    varying vec2 vUv;
    void main() {
      float R = uNearPx * 0.5;
      vec4 c0 = texture2D(tDown, vUv);
      float w0 = step(0.5, -c0.a * 0.5);
      vec3 acc = c0.rgb * w0; float ws = w0;
      for (int i = 0; i < TAPS; i++) {
        float r = sqrt((float(i) + 0.5) / float(TAPS)), th = float(i) * 2.39996323 + 0.7;
        vec4 s = texture2D(tDown, vUv + vec2(cos(th), sin(th)) * (r * R) * uTexel);
        float sc = max(-s.a, 0.0) * 0.5;
        float w = clamp(1.0 + sc - r * R, 0.0, 1.0) * step(0.5, sc);
        acc += s.rgb * w; ws += w;
      }
      float cov = clamp(ws / float(TAPS + 1) * 2.2, 0.0, 1.0);
      gl_FragColor = vec4(ws > 0.0 ? acc / ws : c0.rgb, cov);
    }`,
};

// full resolution: motion blur along the camera's screen velocity, then the blurred layers mixed in by CoC
const CompositeShader = {
  uniforms: {
    tDiffuse: { value: null }, tFar: { value: null }, tNear: { value: null },
    uReproj: { value: new THREE.Matrix4() }, uProj: { value: new THREE.Vector2(1, 1) }, uRes: { value: new THREE.Vector2(1, 1) },
    uMB: { value: 0 }, uMaxV: { value: 0.03 }, uDof: { value: 1 }, uNearOn: { value: 0 },
    uFocus: { value: 4 }, uFarPx: { value: 4 }, uNearPx: { value: 0 }, uBand: { value: 0.3 }, uVM: { value: VM_CUT }, uFarD: { value: 160 },
    uMinD: { value: -1 }, uRampD: { value: 1 },
  },
  defines: { MB_TAPS: 8 },
  vertexShader: VERT,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse, tFar, tNear;
    uniform mat4 uReproj; uniform vec2 uProj, uRes;
    uniform float uMB, uMaxV, uDof, uNearOn;
    varying vec2 vUv;
    ${COC}
    float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float d = c.a;
      vec3 col = c.rgb;
      if (any(isnan(col)) || any(isinf(col))) col = vec3(0.0);
    #if MB_TAPS > 0
      if (uMB > 0.0 && d >= uVM) {
        // this pixel in view space (from its depth), then where last frame's camera saw that point
        vec2 ndc = vUv * 2.0 - 1.0;
        vec4 pc = uReproj * vec4(ndc.x * d / uProj.x, ndc.y * d / uProj.y, -d, 1.0);
        vec2 v = (vUv - (pc.xy / max(pc.w, 1e-4) * 0.5 + 0.5)) * uMB;
        float L = length(v);
        if (pc.w > 1e-4 && L * uRes.y > 0.8) {
          v *= min(1.0, uMaxV / L);
          float j = ign(gl_FragCoord.xy) - 0.5;
          vec3 acc = col; float ws = 1.0;
          for (int i = 0; i < MB_TAPS; i++) {
            float t = (float(i) + 0.5 + j) / float(MB_TAPS) - 0.5;
            vec4 s = texture2D(tDiffuse, vUv + v * t);
            float w = step(uVM, s.a) * float(!(any(isnan(s.rgb)) || any(isinf(s.rgb)))); // (never smear the hands)
            acc += min(s.rgb, vec3(64.0)) * w; ws += w;
          }
          col = acc / ws;
        }
      }
    #endif
      if (uDof > 0.0) {
        float k = cocOf(d);
        col = mix(col, texture2D(tFar, vUv).rgb, smoothstep(0.5, 1.8, k) * uDof);
        if (uNearOn > 0.5) { vec4 n = texture2D(tNear, vUv); col = mix(col, n.rgb, n.a * uDof * step(uVM, d)); }
      }
      gl_FragColor = vec4(col, 1.0);
    }`,
};

// 1x1: the auto-focus sample, the median depth of five points round the screen centre (log-encoded in two bytes; blue:
// the centre is in your hands)
const FocusShader = {
  uniforms: { tDiffuse: { value: null }, uVM: { value: VM_CUT }, uAspect: { value: 1 } },
  vertexShader: VERT,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uVM, uAspect;
    varying vec2 vUv;
    void main() {
      float o = 0.018;
      float a = texture2D(tDiffuse, vec2(0.5, 0.5)).a;
      float b = texture2D(tDiffuse, vec2(0.5 - o / uAspect, 0.5)).a, c = texture2D(tDiffuse, vec2(0.5 + o / uAspect, 0.5)).a;
      float d = texture2D(tDiffuse, vec2(0.5, 0.5 - o)).a, e = texture2D(tDiffuse, vec2(0.5, 0.5 + o)).a;
      // median of five
      float m1 = max(min(a, b), min(max(a, b), c)), lo = min(min(a, b), c), hi = max(max(a, b), c);
      float med = max(min(max(lo, min(d, e)), hi), min(m1, max(d, e)));
      med = a < uVM ? a : med;
      float n = clamp(log2(max(med, 0.02) / 0.02) / 14.0, 0.0, 1.0) * 65535.0;
      float hb = floor(n / 256.0);
      gl_FragColor = vec4(hb / 255.0, (n - hb * 256.0) / 255.0, a < uVM ? 1.0 : 0.0, 1.0);
    }`,
};

const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _f = new THREE.Vector3(), _q = new THREE.Quaternion();

export class LensPass extends Pass {
  /**
   * cfg: the preset's lens ({ dof: taps, near: taps (0: no foreground blur), mb: taps, mbScale, farPx }).
   * opts: the shared options object (it outlives quality changes; the renderer keeps it).
   */
  constructor(camera, cfg, opts) {
    super();
    this.camera = camera;
    this.cfg = cfg;
    this.opts = opts;
    const mat = (S, defines) => new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.clone(S.uniforms), defines: { ...(S.defines || {}), ...defines }, vertexShader: S.vertexShader, fragmentShader: S.fragmentShader, depthTest: false, depthWrite: false });
    this.down = mat(DownShader);
    this.far = mat(FarShader, { TAPS: cfg.dof || 8 });
    this.near = cfg.near ? mat(NearShader, { TAPS: cfg.near }) : null;
    this.comp = mat(CompositeShader, { MB_TAPS: cfg.mb || 0 });
    this.focusMat = mat(FocusShader);
    this.quad = new FullScreenQuad(null);
    const rt = () => new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
    this.rtDown = rt(); this.rtFar = rt(); this.rtNear = this.near ? rt() : null;
    this.rtFocus = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
    this.focusPx = new Uint8Array(4);
    this.reading = false;
    this.autoFocus = 6; this.autoVM = false; // the last read-back
    this.focus = 6; // the eased focus distance (m)
    this.prevVP = new THREE.Matrix4();
    this.prevPos = new THREE.Vector3(); this.prevDir = new THREE.Vector3(); this.prevFov = 0;
    this.havePrev = false;
    this.width = 1; this.height = 1;
    this.stats = { focus: 0, auto: 0, mb: 0, cut: false };
  }

  setSize(w, h) {
    this.width = w; this.height = h;
    const hw = Math.max(1, Math.round(w / 2)), hh = Math.max(1, Math.round(h / 2));
    this.rtDown.setSize(hw, hh); this.rtFar.setSize(hw, hh); this.rtNear?.setSize(hw, hh);
  }

  dispose() {
    for (const r of [this.rtDown, this.rtFar, this.rtNear, this.rtFocus]) r?.dispose();
    for (const m of [this.down, this.far, this.near, this.comp, this.focusMat]) m?.dispose();
    this.quad.dispose();
  }

  draw(renderer, material, target) {
    this.quad.material = material;
    renderer.setRenderTarget(target);
    this.quad.render(renderer);
  }

  /** The auto-focus: render the centre's depth into a 1x1 target and read it back without waiting (a frame or two late). */
  sampleFocus(renderer, readBuffer) {
    if (this.reading || !renderer.readRenderTargetPixelsAsync) return;
    const u = this.focusMat.uniforms;
    u.tDiffuse.value = readBuffer.texture;
    u.uAspect.value = readBuffer.width / Math.max(1, readBuffer.height);
    this.draw(renderer, this.focusMat, this.rtFocus);
    this.reading = true;
    let p;
    try { p = renderer.readRenderTargetPixelsAsync(this.rtFocus, 0, 0, 1, 1, this.focusPx); } catch { this.reading = false; return; }
    Promise.resolve(p).then(() => {
      const px = this.focusPx, n = (px[0] * 256 + px[1]) / 65535;
      this.autoFocus = 0.02 * Math.pow(2, n * 14);
      this.autoVM = px[2] > 127;
      if (this.autoVM) this.autoFocus /= 0.45; // (the viewmodel is drawn VM_DEPTH closer: its real distance)
    }, () => {}).finally(() => { this.reading = false; });
  }

  render(renderer, writeBuffer, readBuffer, deltaTime) {
    const o = this.opts, cfg = this.cfg, cam = this.camera, dt = deltaTime > 0 ? deltaTime : 1 / 60;
    const cine = o.mode === 'cine';
    const cut = !!o.snapFocus; // (a cutscene's cut: no focus pull and no motion blur across it)
    const H = readBuffer.height, pxK = H / 1080; // (CoC and blur lengths are tuned at 1080 lines)
    // ---- focus: a cutscene's, or the centre of the screen; eased in log space like a focus puller's hand
    const dofOn = (o.dof ?? 1) > 0.001 && (cfg.dof || 0) > 0;
    if (dofOn) this.sampleFocus(renderer, readBuffer);
    const want = THREE.MathUtils.clamp(o.focus ?? this.autoFocus, 0.12, 400);
    const rate = o.focus != null ? (o.focusRate ?? 6) : cine ? 4 : 5.5;
    if (!(this.focus > 0) || o.snapFocus) { this.focus = want; o.snapFocus = false; } else this.focus = Math.exp(THREE.MathUtils.lerp(Math.log(this.focus), Math.log(want), 1 - Math.exp(-rate * dt)));
    // ---- the aperture: soft in play, wider in cutscenes and on something held up close
    const ap = o.aperture ?? (cine ? 1 : this.autoVM ? 1.35 : 0.8);
    const farPx = (cfg.farPx || 7) * ap * pxK, nearPx = cine && this.near ? (cfg.nearPx || 6) * ap * pxK : 0;
    const band = cine ? 0.1 : this.autoVM ? 0.15 : 0.26;
    // in play (not on something held up close) the blur starts a few metres out and is full from about 10 m
    const minD = cine || this.autoVM ? -1 : Math.max(2.5, this.focus * 1.2), rampD = cine || this.autoVM ? 1 : 7;
    for (const m of [this.down, this.comp]) {
      const u = m.uniforms;
      u.uFocus.value = this.focus; u.uFarPx.value = farPx; u.uNearPx.value = nearPx; u.uBand.value = band; u.uFarD.value = cam.far;
      u.uMinD.value = minD; u.uRampD.value = rampD;
    }
    // ---- motion blur: last frame's camera; a cut (a jump, a sudden turn or zoom) is never blurred
    cam.getWorldPosition(_p); cam.getWorldDirection(_f);
    const jump = cut || !this.havePrev || _p.distanceTo(this.prevPos) > 1.2 || _f.dot(this.prevDir) < 0.93 || Math.abs(cam.fov - this.prevFov) > 6;
    const mbK = (o.motionBlur ?? 1) * (cfg.mbScale ?? 0.6) * (cine ? 0.8 : 1);
    const cu = this.comp.uniforms;
    cu.uMB.value = cfg.mb && !jump && mbK > 0.001 ? mbK * THREE.MathUtils.clamp((1 / 60) / dt, 0.3, 2) : 0;
    cu.uMaxV.value = 0.035 * Math.min(1, mbK * 1.5);
    cu.uReproj.value.multiplyMatrices(this.prevVP, cam.matrixWorld);
    cu.uProj.value.set(cam.projectionMatrix.elements[0], cam.projectionMatrix.elements[5]);
    cu.uRes.value.set(readBuffer.width, H);
    this.prevVP.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    this.prevPos.copy(_p); this.prevDir.copy(_f); this.prevFov = cam.fov; this.havePrev = true;
    this.stats.focus = this.focus; this.stats.auto = this.autoFocus; this.stats.mb = cu.uMB.value; this.stats.cut = jump;
    // ---- the depth of field layers (half resolution)
    cu.uDof.value = dofOn ? Math.min(1, o.dof ?? 1) : 0;
    cu.uNearOn.value = nearPx > 0.5 ? 1 : 0;
    if (dofOn) {
      const du = this.down.uniforms;
      du.tDiffuse.value = readBuffer.texture;
      du.uTexel.value.set(1 / readBuffer.width, 1 / H);
      this.draw(renderer, this.down, this.rtDown);
      const fu = this.far.uniforms;
      fu.tDown.value = this.rtDown.texture;
      fu.uTexel.value.set(1 / this.rtDown.width, 1 / this.rtDown.height);
      this.draw(renderer, this.far, this.rtFar);
      cu.tFar.value = this.rtFar.texture;
      if (nearPx > 0.5) {
        const nu = this.near.uniforms;
        nu.tDown.value = this.rtDown.texture; nu.uTexel.value.copy(fu.uTexel.value); nu.uNearPx.value = nearPx;
        this.draw(renderer, this.near, this.rtNear);
        cu.tNear.value = this.rtNear.texture;
      }
    }
    // ---- composite (full resolution)
    cu.tDiffuse.value = readBuffer.texture;
    this.draw(renderer, this.comp, this.renderToScreen ? null : writeBuffer);
  }
}
