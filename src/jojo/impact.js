// Impact frames and pixel filters: one stepped post-process pass at the very end of the composer (off, and free,
// unless something asks for it).
//   impact frame  the frame freezes, snaps to a chunky pixel grid, inverts and posterises into a four-ink palette
//                 (ordered dither, no gradients), and bold speed lines burst from the subject (or streak sideways for a
//                 slap). The palette flips a couple of times and the lines re-ink every few frames, like a manga panel
//                 flickering on a page. An affectionate homage to a famous manga's colour-flipped impact panels.
//   filters       the photo mode's looks: gekiga (1-bit ink and screentone), game pocket (four greens), Shōwa print
//                 (sepia, stepped vignette), chunky pixel colour, negative, and the impact look without lines.
//   const fx = new Impact(game);  fx.frame({ at: Vector3 | [x, y] (0..1, y down), dur, lines: 'radial' | 'side' |
//     'none', palette, freeze: true, dir })   fx.filter('gekiga' | ... | null)   fx.update(dt)   fx.active
import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { CopyShader } from 'three/addons/shaders/CopyShader.js';

// four inks per palette, darkest first (display colours: the pass runs after the output transform)
export const PALETTES = {
  violet: ['#140a22', '#5a2a96', '#e0489c', '#fff0c8'],
  acid: ['#081812', '#167060', '#b4e83c', '#f6ffe0'],
  blood: ['#1a0808', '#9c1c18', '#ffb428', '#fff4d8'],
  ice: ['#0a0e24', '#2a4ab0', '#58e0e8', '#f4fbff'],
  gameboy: ['#1c2c18', '#3c6a30', '#8cb04a', '#d6e8a0'],
  sepia: ['#2a160c', '#6e4424', '#b8885a', '#f2dcb0'],
  gekiga: ['#1a1418', '#1a1418', '#f2ead8', '#f2ead8'],
  neon: ['#0c0820', '#3a1878', '#ff4aa0', '#ffe080'],
};
export const FILTERS = {
  gekiga: { mode: 3, pal: 'gekiga', pix: 2, name: 'Gekiga ink' },
  impact: { mode: 1, pal: 'violet', pix: 3, name: 'Impact panel' },
  pocket: { mode: 2, pal: 'gameboy', pix: 3, name: 'Game Pocket' },
  sepia: { mode: 4, pal: 'sepia', pix: 2, name: 'Shōwa print' },
  pixel: { mode: 5, pal: 'violet', pix: 4, name: 'Big pixels' },
  neon: { mode: 2, pal: 'neon', pix: 3, name: 'Night neon' },
  negative: { mode: 6, pal: 'ice', pix: 2, name: 'Negative' },
};

const Shader = {
  uniforms: {
    tDiffuse: { value: null }, tFreeze: { value: null }, uFreeze: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) }, uPix: { value: 3 }, uMode: { value: 0 },
    uP0: { value: new THREE.Color() }, uP1: { value: new THREE.Color() }, uP2: { value: new THREE.Color() }, uP3: { value: new THREE.Color() },
    uFocus: { value: new THREE.Vector2(0.5, 0.5) }, uLines: { value: 0 }, uSeed: { value: 0 }, uClear: { value: 0.18 },
    uOff: { value: new THREE.Vector2() }, uFlash: { value: 0 }, uDir: { value: 1 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform sampler2D tFreeze; uniform float uFreeze;
    uniform vec2 uRes; uniform float uPix; uniform int uMode;
    uniform vec3 uP0; uniform vec3 uP1; uniform vec3 uP2; uniform vec3 uP3;
    uniform vec2 uFocus; uniform float uLines; uniform float uSeed; uniform float uClear; uniform vec2 uOff;
    uniform float uFlash; uniform float uDir;
    varying vec2 vUv;
    float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
    float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
    float hash(float n) { return fract(sin(n * 12.9898 + 78.233) * 43758.5453); }
    vec3 ink(float q) { return q < 0.5 ? uP0 : q < 1.5 ? uP1 : q < 2.5 ? uP2 : uP3; }
    void main() {
      // the chunky grid: every block shows the colour at its centre
      vec2 cell = floor((gl_FragCoord.xy + uOff) / uPix);
      vec2 uv = clamp((cell + 0.5) * uPix / uRes, vec2(0.0), vec2(1.0));
      vec3 c = uFreeze > 0.5 ? texture2D(tFreeze, uv).rgb : texture2D(tDiffuse, uv).rgb;
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      float d = bayer4(cell);
      vec3 col;
      if (uMode == 1) {            // impact: inverted, hard contrast, four inks
        l = clamp((0.5 - l) * 1.7 + 0.5, 0.0, 1.0);
        col = ink(clamp(floor(l * 3.0 + d * 0.92), 0.0, 3.0));
      } else if (uMode == 2) {     // four-ink posterise, upright
        l = clamp((l - 0.5) * 1.35 + 0.52, 0.0, 1.0);
        col = ink(clamp(floor(l * 3.0 + d * 0.92), 0.0, 3.0));
      } else if (uMode == 3) {     // gekiga: ink, screentone in the mid tones, paper
        l = clamp((l - 0.5) * 1.5 + 0.55, 0.0, 1.0);
        float tone = step(0.5, fract((cell.x + cell.y) * 0.5)) * step(0.5, fract(cell.y * 0.5)); // a dot every 2x2
        col = l < 0.24 ? uP0 : l > 0.7 ? uP3 : (l < 0.47 ? (tone > 0.5 ? uP3 : uP0) : (d < (l - 0.47) * 4.3 ? uP3 : uP0));
      } else if (uMode == 4) {     // Shōwa print: sepia inks with a stepped vignette
        vec2 q = (cell + 0.5) * uPix / uRes - 0.5;
        float v = floor(clamp(length(q * vec2(uRes.x / uRes.y, 1.0)) * 1.6 - 0.35, 0.0, 1.0) * 3.0) / 3.0;
        l = clamp((l - 0.5) * 1.2 + 0.56 - v * 0.32, 0.0, 1.0);
        col = ink(clamp(floor(l * 3.0 + d * 0.92), 0.0, 3.0));
      } else if (uMode == 5) {     // chunky pixel colour: 5 levels a channel, dithered
        col = floor(c * 4.0 + d * 0.9) / 4.0;
      } else {                     // negative
        vec3 n = 1.0 - c;
        col = floor(n * 3.0 + d * 0.9) / 3.0;
      }
      // speed lines: bold wedges from the subject, re-inked every few frames (blocks, so the edges stair-step)
      if (uLines > 0.5 && uLines < 1.5) {
        vec2 dv = (cell + 0.5) * uPix - uFocus * uRes;
        float r = length(dv) / min(uRes.x, uRes.y);
        float a = (atan(dv.y, dv.x) / 6.2831853 + 0.5) * 110.0;
        float sec = floor(a), f = fract(a);
        float h1 = hash(sec + uSeed * 17.0), h2 = hash(sec * 1.31 + uSeed * 5.0), h3 = hash(sec * 2.17 + uSeed * 3.0);
        float w = 0.16 + 0.5 * h2;
        if (h1 > 0.42 && abs(f - 0.5) < w * 0.5 && r > uClear + h3 * 0.32) col = uP0;
      } else if (uLines > 1.5) {   // sideways streaks (a slap, a dash)
        float row = floor(cell.y / 1.0);
        float h1 = hash(row * 0.73 + uSeed * 11.0), h2 = hash(row * 1.91 + uSeed * 3.0);
        float x = uDir > 0.0 ? (cell.x * uPix) / uRes.x : 1.0 - (cell.x * uPix) / uRes.x;
        if (h1 > 0.7 && x < 0.18 + h2 * 0.45) col = h2 > 0.6 ? uP3 : uP0;
      }
      if (uFlash > 0.5) col = mix(col, uP3, 0.75);
      gl_FragColor = vec4(col, 1.0);
    }`,
};

const _v = new THREE.Vector3();

export class Impact {
  constructor(game) {
    this.game = game;
    this.pass = new ShaderPass(Shader);
    this.pass.enabled = false;
    this.u = this.pass.uniforms;
    this.copy = new FullScreenQuad(new THREE.ShaderMaterial({ ...CopyShader, uniforms: THREE.UniformsUtils.clone(CopyShader.uniforms) }));
    this.freezeRT = null;
    this.grab = false;
    this.fx = null; // the running impact frame
    this.filt = null; // the photo filter
    const pass = this.pass, self = this;
    const baseRender = pass.render.bind(pass);
    pass.render = function (renderer, writeBuffer, readBuffer, dt, mask) {
      const w = readBuffer.width, h = readBuffer.height;
      self.u.uRes.value.set(w, h);
      if (self.grab) {
        if (!self.freezeRT || self.freezeRT.width !== w || self.freezeRT.height !== h) {
          self.freezeRT?.dispose();
          self.freezeRT = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: false });
        }
        self.copy.material.uniforms.tDiffuse.value = readBuffer.texture;
        renderer.setRenderTarget(self.freezeRT);
        self.copy.render(renderer);
        self.u.tFreeze.value = self.freezeRT.texture;
        self.grab = false;
      }
      baseRender(renderer, writeBuffer, readBuffer, dt, mask);
    };
    // the pass rides at the end of every composer the renderer builds (quality changes rebuild it)
    const R = game.renderer;
    const build = R.buildComposer.bind(R);
    R.buildComposer = () => { build(); this.attach(); };
    this.attach();
  }

  attach() {
    const comp = this.game.renderer.composer;
    if (!comp || comp.passes.includes(this.pass)) return;
    comp.addPass(this.pass);
  }

  get active() { return !!this.fx; }

  setPalette(name) {
    const P = PALETTES[name] || PALETTES.violet;
    this.u.uP0.value.set(P[0]); this.u.uP1.value.set(P[1]); this.u.uP2.value.set(P[2]); this.u.uP3.value.set(P[3]);
  }

  /** Where a world point (or a screen fraction, y down) is, in the pass's coordinates (0..1, y up). */
  focusOf(at) {
    if (Array.isArray(at)) return [at[0], 1 - at[1]];
    if (at?.isVector3) { _v.copy(at).project(this.game.camera); if (_v.z < 1) return [_v.x * 0.5 + 0.5, _v.y * 0.5 + 0.5]; }
    return [0.5, 0.52];
  }

  /**
   * An impact frame. opts: at (the subject), dur (0.75 s), lines ('radial' | 'side' | 'none'), palette (a name or a
   * list to flip through), freeze (true: the frame holds), dir (+1 / -1 for side lines), pix (block size, css px),
   * clear (the calm circle round the subject, fraction of the short side). Returns a promise that resolves when it ends.
   */
  frame(o = {}) {
    const dpr = this.game.renderer.renderer.getPixelRatio();
    const pals = Array.isArray(o.palette) ? o.palette : [o.palette || 'violet', o.palette2 || 'blood'];
    const f = this.focusOf(o.at);
    this.u.uFocus.value.set(f[0], f[1]);
    this.u.uLines.value = o.lines === 'none' ? 0 : o.lines === 'side' ? 2 : 1;
    this.u.uDir.value = o.dir ?? 1;
    this.u.uClear.value = o.clear ?? 0.16;
    this.u.uPix.value = Math.max(2, Math.round((o.pix ?? 3) * dpr));
    this.u.uMode.value = o.mode ?? 1;
    this.u.uFreeze.value = o.freeze === false ? 0 : 1;
    this.grab = o.freeze !== false;
    this.setPalette(pals[0]);
    this.pass.enabled = true;
    this.fx?.res?.();
    return new Promise((res) => { this.fx = { t: 0, dur: o.dur ?? 0.75, pals, step: -1, res, shake: o.shake ?? 1 }; });
  }

  /** Photo mode's look (null: off). */
  filter(name) {
    this.filt = FILTERS[name] ? name : null;
    if (!this.fx) this.applyFilter();
  }

  applyFilter() {
    const F = FILTERS[this.filt];
    if (!F) { this.pass.enabled = false; return; }
    const dpr = this.game.renderer.renderer.getPixelRatio();
    this.u.uMode.value = F.mode; this.u.uPix.value = Math.max(1, Math.round(F.pix * dpr));
    this.u.uLines.value = this.filt === 'impact' ? 1 : 0; this.u.uFreeze.value = 0; this.u.uFlash.value = 0;
    this.u.uOff.value.set(0, 0); this.u.uFocus.value.set(0.5, 0.5); this.u.uClear.value = 0.22;
    this.setPalette(F.pal);
    this.pass.enabled = true;
  }

  update(dt) {
    const F = this.fx;
    if (!F) { if (this.filt && this.u.uLines.value > 0.5) this.u.uSeed.value = Math.floor(this.game.time * 8) % 97; return; }
    F.t += dt;
    // stepped: a hold-colour flash on the first frame, the lines re-ink every 0.08 s, the palette flips at a third and
    // two thirds, a stepped shake for the first beat
    const step = Math.floor(F.t / 0.08);
    if (step !== F.step) {
      F.step = step;
      this.u.uSeed.value = (step * 7 + 3) % 97;
      const pi = Math.min(F.pals.length - 1, Math.floor((F.t / F.dur) * F.pals.length));
      this.setPalette(F.pals[pi]);
      const dpr = this.game.renderer.renderer.getPixelRatio();
      const s = F.t < 0.24 ? F.shake * this.u.uPix.value * (step % 2 ? 1 : -1) : 0;
      this.u.uOff.value.set(Math.round(s), Math.round(s * 0.5 * dpr) % 2);
    }
    this.u.uFlash.value = F.t < 0.05 ? 1 : 0;
    if (F.t >= F.dur) {
      this.fx = null;
      this.u.uOff.value.set(0, 0); this.u.uFlash.value = 0; this.u.uFreeze.value = 0;
      if (this.filt) this.applyFilter(); else this.pass.enabled = false;
      F.res();
    }
  }
}
