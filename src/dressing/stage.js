// The dressing room's stage: its own canvas, renderer and scene (the game world is never touched). You stand on a
// braided rug in a small walk-in closet on a spring afternoon (the set: src/dressing/room.js), in a patch of sun from the
// window behind the camera. Drag to turn you; let go and you slow to a stop, and after a while settle back to face the
// mirror (three-quarters on). The camera frames your face, your whole body or your feet.
//
// Crisp pixels: the scene is drawn at art resolution (every art pixel is a whole number of screen pixels, scaled up with
// nearest filtering) in two passes, the room and you, each with its depth. An output pass puts them together the way the
// game draws its world: the room gets the game's plum creases where depth jumps, you get a one-pixel ink outline and a
// darker crease where an arm passes in front of the body. Then the game's grade: a neutral tone curve, a little less
// saturation and contrast, darks lifted toward lilac (no black). The pixel sprites (src/dressing/sprites.js) are drawn
// last against the stage's depth, at the same resolution. No bloom, no glow.
//
//   const st = new Stage(game, host);  st.layout(rectCSS);  st.setLook(look, { pop });  st.frame(dt)
//   st.zoomTo('face' | 'body' | 'legs' | 'feet' | 'full'), st.spinBy(rad), st.pose(yaw), st.react(kind), st.hop()
//   st.fx (Sparkles), st.room (the set), st.me (the Human), st.headScreen() -> { x, y } CSS px
import * as THREE from 'three';
import { createAvatarHuman, normalizeAvatar } from '../people/avatar.js';
import { Sparkles } from './sprites.js';
import { buildRoom, LAYER } from './room.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// framing presets, as fractions of your height: the height the camera looks at and how much of you fills the stage
export const FOCUS = {
  full: { y: 0.45, span: 1.8 },
  body: { y: 0.71, span: 0.64 },
  face: { y: 0.885, span: 0.46 },
  hat: { y: 0.82, span: 0.8 },
  legs: { y: 0.3, span: 0.68 },
  feet: { y: 0.08, span: 0.5 },
  back: { y: 0.66, span: 0.74 },
};
const MIN_SPAN = 0.26, MAX_SPAN = 2.0;
export const REST_YAW = 0.32; // three-quarters on: where you settle when left alone
/** How far the camera looks down: well down at your feet, level at your face, a little down for the full view. */
function pitchFor(fy, span) {
  const close = fy < 0.15 ? 0.46 : fy < 0.42 ? 0.3 : fy < 0.78 ? 0.15 : 0.05;
  return lerp(close, 0.2, clamp((span - 0.7) / 0.9, 0, 1));
}

const COMPOSITE_VS = /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const COMPOSITE_FS = /* glsl */`
  uniform sampler2D tRoom, tRoomD, tMe, tMeD;
  uniform vec2 uRes; uniform float uNear, uFar, uFade, uMirror;
  uniform vec3 uInk, uInkK, uLift, uFadeCol;
  varying vec2 vUv;
  float lin(float d) { float z = d * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
  vec3 neutral(vec3 c) {
    const float S = 0.76; const float D = 0.15;
    float x = min(c.r, min(c.g, c.b)); float off = x < 0.08 ? x - 6.25 * x * x : 0.04; c -= off;
    float peak = max(c.r, max(c.g, c.b)); if (peak < S) return c;
    float d = 1.0 - S; float np = 1.0 - d * d / (peak + d - S); c *= np / peak;
    float g = 1.0 - 1.0 / (D * (peak - np) + 1.0); return mix(c, vec3(np), g);
  }
  // the game's grade (src/core/renderer.js): pastel saturation, a soft log contrast, lilac in the darks
  vec3 grade(vec3 c) {
    c = neutral(c * 1.12);
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(vec3(l), c, 0.9);
    c = 0.18 * pow(max(c, vec3(0.0)) / 0.18, vec3(0.93));
    return c + uLift * (0.05 / (0.05 + l));
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
    vec2 o[4]; o[0] = vec2(px.x, 0.0); o[1] = vec2(-px.x, 0.0); o[2] = vec2(0.0, px.y); o[3] = vec2(0.0, -px.y);
    float dr = texture2D(tRoomD, vUv).x, dm = texture2D(tMeD, vUv).x;
    vec4 M = texture2D(tMe, vUv);
    bool me = M.a > 0.5 && dm <= dr;
    if (me) {
      // you: a crease where a part of you is clearly in front of another (an arm across the body, a brim over the face)
      float z = lin(dm), edge = 0.0;
      for (int i = 0; i < 4; i++) {
        vec2 q = vUv + o[i];
        float zn = lin(texture2D(tMeD, q).x);
        if (texture2D(tMe, q).a > 0.5 && z - zn > max(0.07, z * 0.035)) edge = 1.0;
      }
      vec3 c = srgb(grade(M.rgb));
      c = mix(c, c * vec3(0.42, 0.36, 0.48), edge);
      gl_FragColor = vec4(mix(uFadeCol, c, uFade), 1.0); gl_FragDepth = dm;
      return;
    }
    // your outline: a room pixel next to a pixel of you that is in front of it is ink
    float near = 1.0, hit = 0.0;
    for (int i = 0; i < 4; i++) {
      vec2 q = vUv + o[i];
      float dq = texture2D(tMeD, q).x;
      if (texture2D(tMe, q).a > 0.5 && dq <= texture2D(tRoomD, q).x && dq < dr) { hit = 1.0; near = min(near, dq); }
    }
    if (hit > 0.5) { gl_FragColor = vec4(mix(uFadeCol, uInk, uFade), 1.0); gl_FragDepth = near; return; }
    // the room, with the game's ink: where depth jumps (silhouettes) or folds (creases), the colour deepens through plum
    vec3 c = texture2D(tRoom, vUv).rgb;
    float d = lin(dr);
    float dl = lin(texture2D(tRoomD, vUv - vec2(px.x, 0.0)).x), dR = lin(texture2D(tRoomD, vUv + vec2(px.x, 0.0)).x);
    float du = lin(texture2D(tRoomD, vUv + vec2(0.0, px.y)).x), dd = lin(texture2D(tRoomD, vUv - vec2(0.0, px.y)).x);
    float lap = abs(dl + dR + du + dd - 4.0 * d) / d;
    float jump = max(max(dl - d, dR - d), max(du - d, dd - d)) / d; // only the near side of a jump is inked
    float e = max(step(0.06, lap) * step(d, 12.0), step(0.035, jump));
    c = srgb(grade(c));
    c = mix(c, c * uInkK + uInk * 0.35, e * 0.8);
    gl_FragColor = vec4(mix(uFadeCol, c, uFade), 1.0); gl_FragDepth = dr;
  }`;

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
    r.shadowMap.autoUpdate = false; // two passes a frame: the shadows are drawn once, before the first
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.05, 30);
    this.room = buildRoom();
    this.scene.add(this.room.group);
    // you turn on the spot (the rug stays put); the squash-and-stretch pivot and the hop live inside
    this.spin = new THREE.Group();
    this.scene.add(this.spin);
    this.pivot = new THREE.Group();
    this.spin.add(this.pivot);
    this.proxy = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.9, 0.6), new THREE.MeshBasicMaterial({ visible: false }));
    this.proxy.position.y = 0.95;
    this.spin.add(this.proxy);
    // the two passes and the output pass
    const rt = () => { const t = new THREE.WebGLRenderTarget(4, 4, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthTexture: new THREE.DepthTexture(4, 4), generateMipmaps: false }); t.texture.generateMipmaps = false; return t; };
    this.rtRoom = rt(); this.rtMe = rt();
    this.comp = new THREE.ShaderMaterial({
      uniforms: {
        tRoom: { value: this.rtRoom.texture }, tRoomD: { value: this.rtRoom.depthTexture }, tMe: { value: this.rtMe.texture }, tMeD: { value: this.rtMe.depthTexture },
        uRes: { value: new THREE.Vector2(4, 4) }, uNear: { value: this.camera.near }, uFar: { value: this.camera.far },
        uInk: { value: new THREE.Color(0x2a1a2a) }, uInkK: { value: new THREE.Color(0.62, 0.56, 0.68) }, uLift: { value: new THREE.Color(0.016, 0.015, 0.028) },
        uFade: { value: 1 }, uFadeCol: { value: new THREE.Color(0x2e2030) }, uMirror: { value: 0 }, // (fades up from a warm plum, never black)
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
    this.yaw = REST_YAW; this.yawVel = 0; this.idleT = 0;
    this.poseYaw = null; this.poseT = 0;
    this.focus = 'full'; this.goal = { ...FOCUS.full }; this.cam = { ...FOCUS.full, pitch: 0.2 };
    this.squashT = 1; this.hopT = 1; this.t = 0; this.fade = 1; this.mirror = 0;
    this.size = { W: 4, H: 4, S: 2 };
    this.rectArt = { x: 0, y: 0, w: 4, h: 4 };
    this.me = null;
  }

  get height() { return this.me?.height || 1.7; }

  /** Build (or rebuild) you in a look. opts.pop: a little squash as the new piece goes on. */
  setLook(look, opts = {}) {
    const old = this.me;
    const h = createAvatarHuman(normalizeAvatar(look), { lazy: false });
    h.shiftTarget = 0.6; h.shiftT = 1e9;
    h.root.traverse((o) => { o.layers.set(LAYER.me); if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
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
    if (opts.pop) this.squash(opts.pop === 'big' ? 0.8 : 0.55);
    return h;
  }

  /** Squash and stretch (stepped, on twos). */
  squash(k = 1) { this.squashT = 0; this.squashK = k; }
  /** A little hop on the spot (stepped). */
  hop(k = 1) { this.hopT = 0; this.hopK = k; }

  /** A little reaction: a gesture and an expression. */
  react(kind = 'pose') {
    const h = this.me;
    if (!h) return;
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    if (kind === 'spin') h.gesture?.('spin');
    else if (kind === 'wave') h.gesture?.('wave');
    else if (kind === 'look') { /* just the face */ }
    else h.gesture?.(pick(['peace', 'pose_point', 'pose_lean', 'pose_cross', 'cheer']));
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
    this.rtRoom.setSize(W, H); this.rtMe.setSize(W, H);
    this.comp.uniforms.uRes.value.set(W, H);
    this.fx.uRes.set(W, H);
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

  /** Turn to show off a side (0 = facing you, PI = your back) and hold it for a while. */
  pose(yaw = REST_YAW, hold = 2.6) { this.poseYaw = yaw; this.poseT = hold; this.idleT = 0; }

  spinBy(rad) { this.yaw += rad; this.poseYaw = null; this.poseT = 0; this.idleT = 0; }

  /** Drag velocity (rad/s) handed over on release: it slows to a stop. */
  fling(v) { this.yawVel = clamp(v, -8, 8); this.poseYaw = null; this.idleT = 0; }

  updateCamera(dt) {
    const H = this.height, g = this.goal;
    const c = this.cam, k = 1 - Math.exp(-dt * 5);
    c.y = lerp(c.y, g.y, k); c.span = lerp(c.span, g.span, k); c.pitch = lerp(c.pitch, pitchFor(g.y, g.span), k);
    const fov = 30, half = THREE.MathUtils.degToRad(fov / 2);
    const span = c.span * H, dist = (span / 2) / Math.tan(half);
    const cam = this.camera;
    const ty = c.y * H;
    cam.position.set(0, ty + Math.sin(c.pitch) * dist, Math.cos(c.pitch) * dist);
    cam.lookAt(0, ty, 0);
    cam.updateMatrixWorld();
    // projection: the stage area (not the whole canvas) gets the symmetric view, centred a little below its middle
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
    // turning: a drag sets the yaw; let go and you coast to a stop; a pose turns you to show a side and holds it; left
    // alone for a while you settle back three-quarters on
    if (this.dragging) this.idleT = 0;
    else if (this.poseYaw != null) {
      const d = wrap(this.poseYaw - this.yaw);
      this.yaw += d * Math.min(1, dt * 4);
      if ((this.poseT -= dt) <= 0) { this.poseYaw = null; this.idleT = 0; }
    } else {
      this.yawVel *= Math.exp(-dt * 2.6);
      if (Math.abs(this.yawVel) < 0.02) this.yawVel = 0;
      this.yaw += this.yawVel * dt;
      if (!this.yawVel && (this.idleT += dt) > 6) this.yaw += wrap(REST_YAW - this.yaw) * Math.min(1, dt * 1.2);
    }
    this.spin.rotation.y = this.yaw;
    // squash and stretch, and the hop, on twos
    let sy = 1, hy = 0;
    if (this.squashT < 1) {
      this.squashT = Math.min(1, this.squashT + dt / 0.42);
      const s = Math.floor(this.squashT * 10) / 10, K = this.squashK || 1;
      sy = 1 + K * (s < 0.2 ? -0.12 : s < 0.5 ? 0.08 : s < 0.7 ? -0.03 : 0);
    }
    if (this.hopT < 1) {
      this.hopT = Math.min(1, this.hopT + dt / 0.36);
      const s = Math.floor(this.hopT * 9) / 9;
      hy = Math.max(0, Math.sin(s * Math.PI)) * 0.05 * (this.hopK || 1);
    }
    this.pivot.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
    this.pivot.position.y = hy;
    if (h) h.update(Math.min(dt, 0.05), {});
    this.fx.update(dt);
    this.updateCamera(dt);
    if (!this.noRender) this.render();
  }

  render() {
    const r = this.renderer, cam = this.camera;
    r.setClearColor(0x000000, 0);
    // the room (shadows drawn once for both passes: you cast yours on the rug and the floor). Three's shadow pass only
    // draws what the camera's layers see, so this pass sees you too (you're drawn again on top from your own pass) and
    // the sun's window frame (it writes no colour and no depth)
    r.shadowMap.needsUpdate = true;
    cam.layers.set(LAYER.room); cam.layers.enable(LAYER.me); cam.layers.enable(LAYER.sunOnly);
    r.setRenderTarget(this.rtRoom);
    r.clear(true, true, true);
    r.render(this.scene, cam);
    // you
    cam.layers.set(LAYER.me);
    r.setRenderTarget(this.rtMe);
    r.clear(true, true, true);
    r.render(this.scene, cam);
    cam.layers.set(LAYER.room);
    r.setRenderTarget(null);
    this.comp.uniforms.uFade.value = this.fade;
    this.comp.uniforms.uMirror.value = this.mirror;
    r.clear(true, true, true);
    r.render(this.quadScene, this.quadCam);
    r.render(this.fxScene, cam);
  }

  /** World position -> CSS px on the screen. */
  toScreen(v) {
    const p = v.clone().project(this.camera);
    return { x: (p.x * 0.5 + 0.5) * innerWidth, y: (1 - (p.y * 0.5 + 0.5)) * innerHeight };
  }
  headScreen() { return this.toScreen(new THREE.Vector3(0, this.height * 1.04, 0)); }

  /** How big an effect should be: 1 in the full view, smaller up close (so a puff stays in the picture). */
  fxScale() { return clamp(this.cam.span / FOCUS.full.span, 0.32, 1); }
  /** The heights (world m) the camera sees, bottom and top. */
  viewRange() { const H = this.height, c = this.cam, y = c.y * H; return { y0: y - c.span * H * 0.5, y1: y + c.span * H * 0.5 }; }

  /** World point at a fraction of your height on your body, for effects. */
  bodyPoint(frac, out = new THREE.Vector3()) { return out.set(0, frac * this.height, 0); }

  pick(clientX, clientY) {
    const ray = this._ray || (this._ray = new THREE.Raycaster());
    ray.setFromCamera({ x: (clientX / innerWidth) * 2 - 1, y: -(clientY / innerHeight) * 2 + 1 }, this.camera);
    return ray.intersectObject(this.proxy, false).length > 0;
  }

  dispose() {
    this.me?.dispose(); this.me = null;
    this.fx.dispose();
    this.rtRoom.dispose(); this.rtMe.dispose(); this.renderer.dispose();
    this.canvas.remove();
  }
}
