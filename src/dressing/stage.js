// The dressing room's stage: a little night theatre of its own (its own canvas, renderer and scene; the game world is
// never touched). You stand on a floating turntable shaped like the bottom half of a giant gacha capsule, a pixel
// magic circle turning under your feet, warm stage light from the front and a cool moonlight edge from behind.
//
// Crisp pixels: the 3D scene is drawn at art resolution (every art pixel is a whole number of screen pixels, scaled up
// with nearest filtering), then an output pass lays it over the painted backdrop (src/dressing/backdrop.js), inks a
// one-pixel outline round everything and a darker crease where something passes in front of something else, twinkles
// the painted stars in stepped frames and puts the curtains in front. The pixel sprites (src/dressing/sprites.js) are
// drawn last against the stage's depth, at the same resolution. No bloom, no glow: a neutral tone curve and that's all.
//
//   const st = new Stage(game, host);  st.layout(rectCSS);  st.setLook(look, { pop });  st.frame(dt)
//   st.zoomTo('face' | 'body' | 'legs' | 'feet' | 'full'), st.spinBy(rad), st.pose(yaw), st.react(kind)
//   st.fx (Sparkles), st.circle (MagicCircle), st.me (the Human), st.headScreen() -> { x, y } CSS px
import * as THREE from 'three';
import { createAvatarHuman, normalizeAvatar } from '../people/avatar.js';
import { Sparkles } from './sprites.js';
import { MagicCircle } from './circle.js';
import { paintBack, paintFront } from './backdrop.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// framing presets, as fractions of your height: the height the camera looks at and how much of you fills the stage
export const FOCUS = {
  full: { y: 0.43, span: 1.84 },
  body: { y: 0.71, span: 0.64 },
  face: { y: 0.885, span: 0.46 },
  hat: { y: 0.82, span: 0.8 },
  legs: { y: 0.3, span: 0.68 },
  feet: { y: 0.08, span: 0.5 },
  back: { y: 0.66, span: 0.74 },
};
const MIN_SPAN = 0.26, MAX_SPAN = 2.1;
/** How far the camera looks down: well down at your feet, level at your face, a little down for the full view. */
function pitchFor(fy, span) {
  const close = fy < 0.15 ? 0.46 : fy < 0.42 ? 0.3 : fy < 0.78 ? 0.15 : 0.05;
  return lerp(close, 0.24, clamp((span - 0.7) / 0.9, 0, 1));
}

const COMPOSITE_VS = /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const COMPOSITE_FS = /* glsl */`
  uniform sampler2D tBack, tFront, tColor, tDepth;
  uniform vec2 uRes; uniform float uTime, uNear, uFar, uFade, uMirror;
  uniform vec3 uInk;
  varying vec2 vUv;
  float lin(float d) { float z = d * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
  vec3 neutral(vec3 c) {
    const float S = 0.76; const float D = 0.15;
    float x = min(c.r, min(c.g, c.b)); float off = x < 0.08 ? x - 6.25 * x * x : 0.04; c -= off;
    float peak = max(c.r, max(c.g, c.b)); if (peak < S) return c;
    float d = 1.0 - S; float np = 1.0 - d * d / (peak + d - S); c *= np / peak;
    float g = 1.0 - 1.0 / (D * (peak - np) + 1.0); return mix(c, vec3(np), g);
  }
  vec3 srgb(vec3 c) { c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
  // the mirror in your room, as you step through it: grey-blue glass with stepped streaks, dissolving in a 4x4 dither
  vec3 glass(vec2 p) {
    float d = mod(p.x * 0.5 + p.y, 46.0), e = mod(p.x * 0.5 + p.y + 9.0, 61.0);
    vec3 c = vec3(0.49, 0.576, 0.651);
    if (d < 4.0 || e < 2.0) c = vec3(0.576, 0.663, 0.733);
    if (p.y < uRes.y * 0.06) c = vec3(0.416, 0.498, 0.573);
    return c;
  }
  void main() {
    vec2 px = 1.0 / uRes;
    if (uMirror > 0.0) {
      vec2 p = floor(vUv * uRes);
      vec2 q = mod(p, 4.0);
      float BAY[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
      float th = (BAY[int(q.y) * 4 + int(q.x)] + 0.5) / 16.0;
      if (th < uMirror) { gl_FragColor = vec4(glass(p), 1.0); gl_FragDepth = 0.0; return; }
    }
    vec4 F = texture2D(tFront, vUv);
    if (F.a > 0.5) { gl_FragColor = vec4(F.rgb * uFade, 1.0); gl_FragDepth = 0.0; return; }
    vec4 S = texture2D(tColor, vUv);
    float d = texture2D(tDepth, vUv).x;
    vec2 o[4]; o[0] = vec2(px.x, 0.0); o[1] = vec2(-px.x, 0.0); o[2] = vec2(0.0, px.y); o[3] = vec2(0.0, -px.y);
    if (S.a > 0.5) {
      // a crease where a neighbour is clearly in front (an arm across the body, a hat brim over the face)
      float z = lin(d), edge = 0.0;
      for (int i = 0; i < 4; i++) {
        vec2 q = vUv + o[i];
        float zn = lin(texture2D(tDepth, q).x);
        if (texture2D(tColor, q).a > 0.5 && z - zn > max(0.07, z * 0.035)) edge = 1.0;
      }
      vec3 c = srgb(neutral(S.rgb));
      c = mix(c, c * vec3(0.42, 0.36, 0.48), edge);
      gl_FragColor = vec4(c * uFade, 1.0); gl_FragDepth = d;
      return;
    }
    // the outline: an empty pixel next to a drawn one is ink (and takes the nearest neighbour's depth)
    float near = 1.0, hit = 0.0;
    for (int i = 0; i < 4; i++) { vec2 q = vUv + o[i]; if (texture2D(tColor, q).a > 0.5) { hit = 1.0; near = min(near, texture2D(tDepth, q).x); } }
    if (hit > 0.5) { gl_FragColor = vec4(uInk * uFade, 1.0); gl_FragDepth = near; return; }
    vec4 B = texture2D(tBack, vUv);
    vec3 c = B.rgb;
    if (B.a < 0.99) {
      // a painted star: twinkle in steps (bright, dim, out) on its own phase
      float ph = B.a * 255.0 - 200.0;
      float k = fract(floor(uTime * 2.0 + ph * 0.37) * 0.618 + ph * 0.13);
      c *= k < 0.16 ? 0.25 : k < 0.36 ? 0.55 : 1.0;
    }
    gl_FragColor = vec4(c * uFade, 1.0); gl_FragDepth = 1.0;
  }`;

function lambert(col) { return new THREE.MeshLambertMaterial({ color: col }); }

export class Stage {
  constructor(game, host) {
    this.game = game;
    const cv = this.canvas = document.createElement('canvas');
    cv.className = 'dr-canvas';
    host.appendChild(cv);
    const r = this.renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false, alpha: false, powerPreference: 'high-performance' });
    r.setPixelRatio(1);
    r.autoClear = false;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.BasicShadowMap; // hard pixel shadows
    r.setClearColor(0x000000, 0);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.05, 30);
    this.lights();
    this.buildDais();
    // output pass
    this.rt = new THREE.WebGLRenderTarget(4, 4, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthTexture: new THREE.DepthTexture(4, 4), generateMipmaps: false });
    this.rt.texture.generateMipmaps = false;
    this.blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); this.blank.needsUpdate = true;
    this.comp = new THREE.ShaderMaterial({
      uniforms: {
        tBack: { value: this.blank }, tFront: { value: this.blank }, tColor: { value: this.rt.texture }, tDepth: { value: this.rt.depthTexture },
        uRes: { value: new THREE.Vector2(4, 4) }, uTime: { value: 0 }, uNear: { value: this.camera.near }, uFar: { value: this.camera.far },
        uInk: { value: new THREE.Color(0x1e1224) }, uFade: { value: 1 }, uMirror: { value: 0 },
      },
      // (the depth test must be on for the depth writes to land: it always passes)
      vertexShader: COMPOSITE_VS, fragmentShader: COMPOSITE_FS, depthTest: true, depthFunc: THREE.AlwaysDepth, depthWrite: true,
    });
    this.quadScene = new THREE.Scene();
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.comp);
    quad.frustumCulled = false;
    this.quadScene.add(quad);
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.fxScene = new THREE.Scene();
    this.fx = new Sparkles(this.fxScene);
    // view state
    this.yaw = 0.35; this.yawVel = 0; this.autoSpin = 0.32;
    this.poseYaw = null; this.poseT = 0;
    this.focus = 'full'; this.goal = { ...FOCUS.full }; this.cam = { ...FOCUS.full, pitch: 0.24 };
    this.squashT = 1; this.t = 0; this.curtain = 0; this.curtainGoal = 1; this.fade = 1; this.mirror = 0;
    this.size = { W: 4, H: 4, S: 2 };
    this.rectArt = { x: 0, y: 0, w: 4, h: 4 };
    this.me = null;
  }

  lights() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight(0xa898d0, 0x3e2638, 1.35));
    const key = this.key = new THREE.DirectionalLight(0xffdcb0, 2.9);
    key.position.set(-1.6, 3.4, 3.2);
    key.castShadow = true;
    key.shadow.mapSize.set(512, 512);
    const sc = key.shadow.camera; sc.left = -1.1; sc.right = 1.1; sc.top = 2.2; sc.bottom = -0.6; sc.near = 0.5; sc.far = 9;
    key.shadow.bias = -0.0015; key.shadow.normalBias = 0.01;
    s.add(key, key.target);
    const rim = new THREE.DirectionalLight(0x8c86ff, 1.5); // moonlight from behind
    rim.position.set(2.2, 2.4, -3.2);
    s.add(rim);
    const foot = new THREE.DirectionalLight(0xff9a6a, 0.55); // warm footlights from below the front
    foot.position.set(0.4, -0.6, 3);
    s.add(foot);
  }

  /** The floating dais: the bottom half of a giant capsule, a cream rim with the seam ridge, the magic circle on top. */
  buildDais() {
    const float = this.float = new THREE.Group(); // bobs (stepped)
    this.scene.add(float);
    const turn = this.turn = new THREE.Group(); // the turntable (dais + you)
    float.add(turn);
    const R = 0.6, seg = 20;
    this.capMat = lambert(0xe2504e);
    const shell = new THREE.Mesh(new THREE.SphereGeometry(R, seg, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), this.capMat);
    shell.scale.y = 0.5; shell.position.y = -0.07;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.012, R, 0.07, seg, 1, false), lambert(0xf2e6d2));
    band.position.y = -0.035;
    const ridge = new THREE.Mesh(new THREE.TorusGeometry(R + 0.012, 0.016, 4, seg), lambert(0xd8c8ae));
    ridge.rotation.x = Math.PI / 2; ridge.position.y = -0.06;
    const top = new THREE.Mesh(new THREE.CircleGeometry(R - 0.02, seg), lambert(0x4a3a58));
    top.rotation.x = -Math.PI / 2; top.position.y = 0.0005;
    // a ring of stud "bolts" round the rim (reads as the turntable going round)
    const studG = new THREE.BoxGeometry(0.035, 0.02, 0.035), studM = lambert(0xc89a4a);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, st = new THREE.Mesh(studG, studM); st.position.set(Math.cos(a) * (R - 0.04), 0.004, Math.sin(a) * (R - 0.04)); turn.add(st); st.receiveShadow = true; }
    for (const m of [shell, band, ridge, top]) { m.receiveShadow = true; turn.add(m); }
    this.daisTop = top;
    // the magic circle: wider than the dais, it hangs in the air at its top (it doesn't turn with the turntable)
    this.circle = new MagicCircle(96);
    this.circle.mesh.scale.setScalar(1.7);
    this.circle.mesh.position.y = 0.006;
    float.add(this.circle.mesh);
    // the squash-and-stretch pivot you stand in
    this.pivot = new THREE.Group();
    turn.add(this.pivot);
    this.proxy = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.9, 0.6), new THREE.MeshBasicMaterial({ visible: false }));
    this.proxy.position.y = 0.95;
    turn.add(this.proxy);
  }

  get height() { return this.me?.height || 1.7; }

  /** Build (or rebuild) you in a look. opts.pop: squash and stretch as the new piece pops on. */
  setLook(look, opts = {}) {
    const old = this.me;
    const h = createAvatarHuman(normalizeAvatar(look), { lazy: false });
    h.shiftTarget = 0.6; h.shiftT = 1e9;
    h.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    // crisp texels when the painted atlas is drawn small (the game smooths them; the stage is pixel art)
    if (h.tex) { h.tex.minFilter = THREE.NearestMipmapNearestFilter; h.tex.needsUpdate = true; }
    this.pivot.add(h.root);
    if (old) {
      // carry the idle animation's phase over so a rebuild doesn't hitch
      h.root.rotation.y = old.root.rotation.y;
      old.dispose(); old.root.removeFromParent();
    }
    this.me = h;
    for (let i = 0; i < 3; i++) h.update(1 / 30, {});
    if (opts.pop) this.squash(opts.pop === 'big' ? 1.25 : 1);
    return h;
  }

  /** Squash and stretch (stepped, on twos). */
  squash(k = 1) { this.squashT = 0; this.squashK = k; }

  /** A little reaction: a gesture and an expression. */
  react(kind = 'pose') {
    const h = this.me;
    if (!h) return;
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    if (kind === 'spin') h.gesture?.('spin');
    else if (kind === 'wave') h.gesture?.('wave');
    else h.gesture?.(pick(['cheer', 'flex', 'peace', 'pose_point', 'pose_lean', 'pose_cross']));
    h.setExpression?.(kind === 'sad' ? 'sad' : 'happy', 1.6);
  }

  // ------------------------------------------------------------------------------------------ framing + layout
  /** The stage area (the part of the screen the panel leaves free), in CSS px. */
  layout(rect) {
    const dpr = window.devicePixelRatio || 1;
    const big = Math.min(innerWidth, innerHeight) > 520;
    const S = Math.max(2, Math.round((big ? 2 : 1.5) * dpr)); // device px per art px
    const W = Math.ceil((innerWidth * dpr) / S), H = Math.ceil((innerHeight * dpr) / S);
    const cv = this.canvas;
    this.renderer.setSize(W, H, false);
    cv.style.width = `${(W * S) / dpr}px`; cv.style.height = `${(H * S) / dpr}px`;
    const k = dpr / S;
    const ra = { x: Math.round(rect.x * k), y: Math.round(rect.y * k), w: Math.round(rect.w * k), h: Math.round(rect.h * k) };
    const changed = W !== this.size.W || H !== this.size.H || JSON.stringify(ra) !== JSON.stringify(this.rectArt);
    this.size = { W, H, S, k };
    this.rectArt = ra;
    this.rectCSS = rect;
    if (!changed) return;
    this.rt.setSize(W, H);
    this.comp.uniforms.uRes.value.set(W, H);
    this.fx.uRes.set(W, H);
    this.backTex?.dispose();
    const back = paintBack(W, H, ra);
    this.backTex = this.dataTex(back);
    this.comp.uniforms.tBack.value = this.backTex;
    this.paintCurtains(true);
  }

  dataTex(b) {
    const t = new THREE.DataTexture(b.data, b.W, b.H, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
    return t;
  }

  paintCurtains(force = false) {
    const k = Math.round(this.curtain * 8) / 8; // stepped: eight drawings from closed to open
    if (!force && k === this.curtainDrawn) return;
    this.curtainDrawn = k;
    this.frontTex?.dispose();
    this.frontTex = this.dataTex(paintFront(this.size.W, this.size.H, this.rectArt, k));
    this.comp.uniforms.tFront.value = this.frontTex;
  }

  /** Frame a preset ('full' | 'body' | 'face' | 'legs' | 'feet' | 'back'); instant = cut instead of easing. */
  zoomTo(name, instant = false) {
    const f = FOCUS[name];
    if (!f) return;
    this.focus = name;
    this.goal = { y: f.y, span: f.span };
    if (instant) Object.assign(this.cam, this.goal, { pitch: pitchFor(f.y, f.span) });
  }

  /** Zoom by a factor (< 1 = closer) about a point on the screen (CSS px): what's under it stays put. */
  zoomAt(clientX, clientY, factor) {
    const g = this.goal, rc = this.rectCSS || { x: 0, y: 0, w: innerWidth, h: innerHeight };
    const span = clamp(g.span * factor, MIN_SPAN, MAX_SPAN);
    const cy = rc.y + rc.h * 0.52;
    const at = g.y + ((cy - clientY) / rc.h) * g.span; // height (fraction of you) under the pointer
    g.y = at + (g.y - at) * (span / g.span);
    g.span = span;
    this.clampGoal();
    this.focus = 'free';
  }

  /** Pan up / down your body (CSS px dragged), when zoomed in. */
  panBy(dyCSS) {
    const g = this.goal, rc = this.rectCSS || { h: innerHeight };
    if (g.span > 1.3) return;
    g.y += (dyCSS / rc.h) * g.span;
    this.clampGoal();
    this.focus = 'free';
  }

  clampGoal() {
    const g = this.goal;
    // zoomed right out the view settles on the whole of you; zoomed in it can travel from your feet to your hat
    const k = clamp((g.span - 1.2) / (MAX_SPAN - 1.2), 0, 1);
    g.y = clamp(g.y, 0.04, 0.95);
    g.y = lerp(g.y, FOCUS.full.y, k);
  }

  /** Turn to show off a side (0 = facing you, PI = your back) and hold it for a while before the slow spin resumes. */
  pose(yaw = 0.3, hold = 2.6) { this.poseYaw = yaw; this.poseT = hold; }

  spinBy(rad) { this.yaw += rad; this.poseYaw = null; this.poseT = 0; }

  /** Drag velocity (rad/s) handed over on release: it eases back into the slow auto-spin. */
  fling(v) { this.yawVel = clamp(v, -9, 9); this.poseYaw = null; }

  updateCamera(dt) {
    const H = this.height, g = this.goal;
    const c = this.cam, k = 1 - Math.exp(-dt * 5);
    c.y = lerp(c.y, g.y, k); c.span = lerp(c.span, g.span, k); c.pitch = lerp(c.pitch, pitchFor(g.y, g.span), k);
    const fov = 30, half = THREE.MathUtils.degToRad(fov / 2);
    const span = c.span * H, dist = (span / 2) / Math.tan(half);
    const cam = this.camera;
    const ty = c.y * H + this.float.position.y;
    cam.position.set(0, ty + Math.sin(c.pitch) * dist, Math.cos(c.pitch) * dist);
    cam.lookAt(0, ty, 0);
    cam.updateMatrixWorld();
    // projection: the stage area (not the whole canvas) gets the symmetric view, centred a little below its middle
    // (the valance hangs over the top of it)
    const { W, H: Hh } = this.size, ra = this.rectArt;
    const P = cam.projectionMatrix, e = P.elements, n = cam.near, fr = cam.far, t = 1 / Math.tan(half);
    P.makePerspective(-1, 1, 1, -1, n, fr);
    e[0] = (ra.h / W) * t; e[5] = (ra.h / Hh) * t;
    e[8] = -(((ra.x + ra.w / 2) / W) * 2 - 1); e[9] = -(1 - ((ra.y + ra.h * 0.52) / Hh) * 2);
    cam.projectionMatrixInverse.copy(P).invert();
  }

  // ------------------------------------------------------------------------------------------ per frame
  frame(dt) {
    this.t += dt;
    const h = this.me;
    // spin: drag inertia eases back into the slow auto-spin; a pose turns you to show a side and holds
    if (this.dragging) { /* the drag sets yaw directly */ }
    else if (this.poseYaw != null) {
      const d = wrap(this.poseYaw - this.yaw);
      this.yaw += d * Math.min(1, dt * 4);
      if ((this.poseT -= dt) <= 0) this.poseYaw = null;
    } else {
      this.yawVel = lerp(this.yawVel, this.autoSpin, 1 - Math.exp(-dt * 1.2));
      this.yaw += this.yawVel * dt;
    }
    this.turn.rotation.y = this.yaw;
    // the float bobs a couple of pixels, stepped
    const bob = Math.round(Math.sin(this.t * 1.3) * 3) / 3;
    this.float.position.y = bob * 0.012;
    // squash and stretch on twos
    if (this.squashT < 1) {
      this.squashT = Math.min(1, this.squashT + dt / 0.5);
      const s = Math.floor(this.squashT * 12) / 12, K = this.squashK || 1;
      const sy = 1 + K * (s < 0.17 ? -0.2 : s < 0.42 ? 0.16 : s < 0.67 ? -0.06 : s < 0.84 ? 0.03 : 0);
      this.pivot.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
    } else this.pivot.scale.set(1, 1, 1);
    if (h) h.update(Math.min(dt, 0.05), {});
    this.circle.update(dt);
    this.fx.update(dt);
    // curtains (stepped drawings)
    if (this.curtain !== this.curtainGoal) {
      this.curtain = this.curtainGoal > this.curtain ? Math.min(this.curtainGoal, this.curtain + dt / 0.7) : Math.max(this.curtainGoal, this.curtain - dt / 0.5);
      this.paintCurtains();
    }
    this.updateCamera(dt);
    if (!this.noRender) this.render();
  }

  render() {
    const r = this.renderer;
    r.setRenderTarget(this.rt);
    r.setClearColor(0x000000, 0);
    r.clear(true, true, true);
    r.render(this.scene, this.camera);
    r.setRenderTarget(null);
    this.comp.uniforms.uTime.value = this.t;
    this.comp.uniforms.uFade.value = this.fade;
    this.comp.uniforms.uMirror.value = this.mirror;
    r.clear(true, true, true);
    r.render(this.quadScene, this.quadCam);
    r.render(this.fxScene, this.camera);
  }

  /** World position -> CSS px on the screen. */
  toScreen(v) {
    const p = v.clone().project(this.camera);
    return { x: (p.x * 0.5 + 0.5) * innerWidth, y: (1 - (p.y * 0.5 + 0.5)) * innerHeight };
  }
  headScreen() { return this.toScreen(new THREE.Vector3(0, this.height * 1.04 + this.float.position.y, 0)); }

  /** How big the magic should be: 1 in the full view, smaller up close (so a burst stays in the picture). */
  fxScale() { return clamp(this.cam.span / FOCUS.full.span, 0.32, 1); }
  /** The heights (world m) the camera sees, bottom and top. */
  viewRange() { const H = this.height, c = this.cam, y = c.y * H + this.float.position.y; return { y0: y - c.span * H * 0.5, y1: y + c.span * H * 0.5 }; }

  /** World point at a fraction of your height on your body (follows the turntable), for effects. */
  bodyPoint(frac, out = new THREE.Vector3()) { return out.set(0, frac * this.height + this.float.position.y, 0); }

  pick(clientX, clientY) {
    const ray = this._ray || (this._ray = new THREE.Raycaster());
    ray.setFromCamera({ x: (clientX / innerWidth) * 2 - 1, y: -(clientY / innerHeight) * 2 + 1 }, this.camera);
    return ray.intersectObject(this.proxy, false).length > 0;
  }

  dispose() {
    this.me?.dispose(); this.me = null;
    this.fx.dispose(); this.circle.dispose();
    this.backTex?.dispose(); this.frontTex?.dispose();
    this.rt.dispose(); this.renderer.dispose();
    this.canvas.remove();
  }
}
