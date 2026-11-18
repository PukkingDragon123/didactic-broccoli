// Light-up figures (art/blender/toys/GIMMICKS.md, "light"): parts modelled as kind 'led' (a lantern, an aviation
// lamp, a firefly's tail) are painted matte like the rest and light up as an unlit, brightened copy of their own
// painted texture laid over them (no blobs, no bloom: the pixels themselves glow). item.light:
//   { part: 'lamp' | ['lamp', ...], color: '#ffd890' (multiplies the paint), mode: 'press' | 'toggle' | 'dark',
//     dur: 4 (press: seconds lit), blink: [on, off] seconds (optional: blinks while lit) }
//   press: a press lights it for `dur`; toggle: each press switches it; dark: lit whenever the lights are off.
// Works on the figure's merged mesh and on its live rig while a clip plays (the part's own rig meshes swap material).
import * as THREE from 'three';
import { audio, SOUNDS } from '../core/audio.js';
import { glowUniform } from '../voxel/materials.js';
import { figurePartMesh, figureReady, figureTextures, loadFigure } from '../figures/lowpix.js';

Object.assign(SOUNDS, {
  /** A tiny slide switch and bulb click. */
  ledClick(a, t, o, p) {
    a.burst(o, t, { dur: 0.012, vol: 0.22, type: 'highpass', f: p.on === false ? 2600 : 3400 });
    a.burst(o, t + 0.03, { dur: 0.01, vol: 0.12, type: 'bandpass', f: 1800, q: 2 });
  },
});

const parts = (L) => (Array.isArray(L.part) ? L.part : [L.part || 'led']);
const mats = new Map(); // key|colour -> lit material per atlas

function litMaterial(key, tex, color) {
  const ck = key + '|' + color + '|' + (tex?.uuid || '');
  let m = mats.get(ck);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(color).multiplyScalar(1.6), transparent: true, opacity: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2, alphaTest: 0.5 });
    m.userData.lit = true;
    mats.set(ck, m);
  }
  return m;
}

export class LightUp {
  constructor(game) { this.game = game; this.lit = new Set(); }

  /** (lowpix mesh hook) */
  adopt(mesh, item) {
    if (!item?.light) return;
    mesh.userData.light = { cfg: { color: '#ffe6a0', mode: 'press', dur: 4, ...item.light }, on: false, t: 0, item };
    if (!mesh.userData.gimmick) mesh.userData.gimmick = item.gimmick || { text: item.light.mode === 'toggle' ? 'Switch it on' : 'Light it up' };
    if (item.light.mode === 'dark') this.lit.add(mesh);
  }

  /** A press: light it (press), switch it (toggle). Returns how long it stays lit. */
  press(mesh) {
    const L = mesh?.userData.light;
    if (!L || L.cfg.mode === 'dark') return 0;
    const on = L.cfg.mode === 'toggle' ? !L.on : true;
    L.on = on; L.t = 0;
    this.lit.add(mesh);
    audio.play('ledClick', { pos: mesh.getWorldPosition(new THREE.Vector3()), on });
    return on && L.cfg.mode === 'press' ? L.cfg.dur : 0.2;
  }

  overlay(mesh, L) {
    if (L.over !== undefined) return L.over;
    if (!figureReady(L.item.key)) { loadFigure(L.item); return null; }
    const tex = figureTextures(L.item.key);
    const g = new THREE.Group(); g.name = 'light';
    for (const name of parts(L.cfg)) {
      const pm = figurePartMesh(L.item, name);
      pm.material = litMaterial(L.item.key, tex[0] || null, L.cfg.color);
      pm.castShadow = false; pm.raycast = () => {};
      g.add(pm);
    }
    mesh.add(g);
    L.over = g;
    return g;
  }

  /** While a clip plays the figure is its jointed rig: light the part's own meshes there. */
  rigParts(mesh, L, on) {
    const rig = mesh.userData.figLive?.rig;
    if (!rig) return false;
    for (const name of parts(L.cfg)) {
      const node = rig.getObjectByName(name);
      node?.traverse((o) => {
        if (!o.isMesh) return;
        if (!o.userData.unlit) o.userData.unlit = o.material;
        o.material = on ? litMaterial(L.item.key, o.userData.unlit.map, L.cfg.color) : o.userData.unlit;
      });
    }
    return true;
  }

  update(dt) {
    const dark = glowUniform.value > 1.6; // (src/game/Lighting.js raises it as the lights go down)
    for (const mesh of this.lit) {
      const L = mesh.userData.light;
      if (!mesh.parent && L.t > 1) { this.lit.delete(mesh); continue; }
      L.t += dt;
      if (L.cfg.mode === 'dark') L.on = dark;
      if (L.cfg.mode === 'press' && L.on && L.t > L.cfg.dur) L.on = false;
      let vis = L.on;
      if (vis && L.cfg.blink) { const [a, b] = L.cfg.blink; vis = (L.t % (a + b)) < a; }
      const over = this.overlay(mesh, L);
      const live = this.rigParts(mesh, L, vis);
      if (over) over.visible = vis && !live;
      if (L.cfg.mode !== 'dark' && !L.on && L.t > 0.5) { if (over) over.visible = false; this.rigParts(mesh, L, false); this.lit.delete(mesh); }
    }
  }
}
