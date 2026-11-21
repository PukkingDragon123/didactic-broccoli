// The lens (src/core/lens.js) driven by the game: the Settings (state.settings.dof / .motionBlur, 0..1, default on;
// a Settings control only has to write them and call game.applySettings()), the mode (cutscenes and the title screen are
// shot 'cine': a wider aperture and the foreground blur) and a cutscene's own focus (c.focus, metres; c.aperture).
// ?nolens in the URL turns it off (crisp audits). Debug (with ?debug / ?autotest): dbg.lens.set({ dof, motionBlur, focus, mode, aperture }), dbg.lens.stats(),
//   dbg.lens.pick(x, y)     what is under a screen point (0..1, y down): names, distance, material
//   dbg.lens.nan()          NaN / Inf pixels in this frame's scene buffer (before any post pass) and what is under the first
//   dbg.lens.watch(sec)     runs the game for sec seconds (1/30 s steps), reading the screen back after every frame:
//                           the frames that came out black (or nearly) while no fade was up -> the black-glitch hunt
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const _v = new THREE.Vector3();

export function install(game) {
  const R = game.renderer, o = R.lensOpts;
  if (!o) return;
  const dbgSet = {};
  // ?nolens in the URL: the lens off (texture audits, tools/look-audit.mjs, want every distance crisp)
  if (typeof location !== 'undefined' && /[?&]nolens\b/.test(location.search)) { dbgSet.dof = 0; dbgSet.motionBlur = 0; }
  // (synced every rendered frame, the title screen's too: it ticks the world without game.update)
  const sync = () => {
    const g = game, s = g.state.settings || {};
    const c = g.cutscene;
    const cine = !!(c?.active || g.titleMenu);
    o.dof = dbgSet.dof ?? (s.dof === false ? 0 : +(s.dof ?? 1));
    o.motionBlur = dbgSet.motionBlur ?? (s.motionBlur === false ? 0 : +(s.motionBlur ?? 1));
    o.mode = dbgSet.mode ?? (cine ? 'cine' : 'game');
    // a cutscene's focus: metres, or 'look' (the distance to its look point, every frame); with none set, a cutscene
    // that drives the camera focuses on what it looks at (its subject, often off the centre of the frame) at a gentler
    // aperture; one that doesn't (a fade through a door) leaves the auto-focus on the centre of the screen
    const own = c?.active && c.focus != null;
    const cf = !c?.active ? null : c.focus === 'look' || (!own && c.camOn) ? c.pos.distanceTo(c.look) : c.focus ?? null;
    o.focus = dbgSet.focus !== undefined ? dbgSet.focus : cf;
    o.aperture = dbgSet.aperture !== undefined ? dbgSet.aperture : (c?.active ? c.aperture ?? (own ? null : 0.8) : null);
    o.focusRate = c?.active ? c.focusRate ?? 6 : 6;
    // the title screen: the menu's gacha machine sharp, the lane behind it soft (while the camera goes to you or into
    // the scene, whatever the shot looks at)
    const m = g.titleMenu;
    if (m && !c?.active && dbgSet.focus === undefined) {
      const cam = g.camera.position, look = m.shot?.cur?.look;
      if (!m.busy && m.machine?.root) o.focus = cam.distanceTo(_v.copy(m.machine.root.position).setY(0.85));
      else if (look) o.focus = cam.distanceTo(look);
      o.aperture = dbgSet.aperture ?? 0.85;
    }
    if (c?.snapFocus) { o.snapFocus = true; c.snapFocus = false; }
  };
  const render = R.render.bind(R);
  R.render = (dt, time) => { sync(); return render(dt, time); };
  const helpers = {
    /** Override the lens (undefined fields are left to the game; set({}) clears every override). */
    set(v = {}) { for (const k of ['dof', 'motionBlur', 'focus', 'mode', 'aperture']) { if (k in v) dbgSet[k] = v[k]; else delete dbgSet[k]; } return { ...o }; },
    stats() { return { opts: { ...o }, ...(R.lens?.stats || {}), on: !!R.lens }; },
    nan() {
      const r = R.renderer, mat = new THREE.ShaderMaterial({
        uniforms: { tDiffuse: { value: null } }, depthTest: false, depthWrite: false,
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main() { vec4 c = texture2D(tDiffuse, vUv); float bad = float(any(isnan(c.rgb)) || any(isinf(c.rgb))); float hot = float(max(c.r, max(c.g, c.b)) > 200.0); gl_FragColor = vec4(bad, hot, 0.0, 1.0); }',
      });
      const quad = new FullScreenQuad(mat);
      let rt = null;
      const out = R.outline, orig = out.render;
      out.render = function (rr, wb, rb, dt, mask) {
        rt = new THREE.WebGLRenderTarget(rb.width, rb.height, { depthBuffer: false });
        mat.uniforms.tDiffuse.value = rb.texture;
        rr.setRenderTarget(rt); quad.render(rr);
        return orig.call(this, rr, wb, rb, dt, mask);
      };
      try { R.render(0, game.time); } finally { out.render = orig; }
      const px = new Uint8Array(rt.width * rt.height * 4);
      r.readRenderTargetPixels(rt, 0, 0, rt.width, rt.height, px);
      let bad = 0, hot = 0, first = null;
      for (let i = 0; i < px.length; i += 4) {
        if (px[i] > 127) { bad++; if (!first) first = [(i / 4) % rt.width, Math.floor(i / 4 / rt.width)]; }
        if (px[i + 1] > 127) hot++;
      }
      let what = null;
      if (first) {
        const ray = new THREE.Raycaster();
        ray.setFromCamera(new THREE.Vector2(first[0] / rt.width * 2 - 1, first[1] / rt.height * 2 - 1), game.camera);
        const h = ray.intersectObject(game.scene, true).find((x) => x.object.visible);
        if (h) { const path = []; for (let p = h.object; p && path.length < 5; p = p.parent) path.push(p.name || p.type); what = { path: path.join(' < '), d: +h.distance.toFixed(2), mat: h.object.material?.type || null }; }
      }
      rt.dispose(); mat.dispose(); quad.dispose();
      return { bad, hot, first, what, size: [rt.width, rt.height] };
    },
    /** What is under screen point (x, y) in 0..1 (y down): [{ path, d, mat }] nearest first. */
    pick(x = 0.5, y = 0.5, n = 3) {
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(x * 2 - 1, 1 - y * 2), game.camera);
      const shown = (o) => { for (let p = o; p; p = p.parent) { if (!p.visible || p === game.camera) return false; } return true; };
      return ray.intersectObject(game.scene, true).filter((h) => shown(h.object)).slice(0, n).map((h) => {
        const path = []; for (let p = h.object; p && path.length < 5; p = p.parent) path.push(p.name || p.type);
        return { path: path.join(' < '), d: +h.distance.toFixed(2), mat: h.object.material?.name || h.object.material?.type || null, at: h.point.toArray().map((v) => +v.toFixed(2)) };
      });
    },
    watch(sec = 4, dt = 1 / 30) {
      const gl = R.renderer.getContext(), cv = R.renderer.domElement, px = new Uint8Array(4), fade = document.getElementById('fade');
      const frames = [];
      let minL = 1;
      for (let f = 0, n = Math.round(sec / dt); f < n; f++) {
        game.update(dt); game.render(dt);
        R.renderer.setRenderTarget(null);
        let sum = 0, black = 0;
        for (let j = 0; j < 6; j++) for (let i = 0; i < 8; i++) {
          gl.readPixels(Math.floor((i + 0.5) / 8 * cv.width), Math.floor((j + 0.5) / 6 * cv.height), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
          const l = (px[0] * 0.2126 + px[1] * 0.7152 + px[2] * 0.0722) / 255;
          sum += l; if (l < 0.02) black++;
        }
        const L = sum / 48, fv = +(fade?.style.opacity || 0);
        minL = Math.min(minL, L);
        if ((L < 0.04 || black >= 24) && fv < 0.5) frames.push({ f, L: +L.toFixed(3), black, cine: !!game.cutscene?.active });
      }
      return { frames: frames.slice(0, 20), n: frames.length, minL: +minL.toFixed(3) };
    },
  };
  let tries = 0;
  const attach = () => { if (game.debug) { game.debug.lens = helpers; return; } if (++tries < 50) setTimeout(attach, 200); };
  setTimeout(attach, 0);
}
