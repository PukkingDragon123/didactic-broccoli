// Parked vehicles from the converted, repainted models (art/lowpix/world_arch/_src/vehicles.py: real hand-made CC BY
// models, every maker's badge painted out by retouch_vehicles.mjs), with the lane's own number plates: kei yellow,
// set in the game's high-res pixel font (src/gfx/pixfont.js), the town (上山) and a made-up number.
//   parkedCar(id, parent, { x, z, ry, plate: { town, cls, kana, num }, cast }) -> Group | null (null: not loaded)
import * as THREE from 'three';
import { archPlace, archReady, archSlot } from './archModels.js';
import { LP_ARCH } from '../kit/lowpixArch.js';
import { drawPx, PX_LINE } from '../gfx/pixfont.js';

const PLATES = [];
if (typeof document !== 'undefined' && document.fonts) {
  Promise.all(['16px "Alagard"', '16px "DotGothic16"'].map((f) => document.fonts.load(f, '上山 480 さ 12-34').catch(() => null)))
    .then(() => { for (const d of PLATES) d(); }).catch(() => {});
}

/** A kei number plate (yellow, dark green ink, a pressed rim and two bolts) as a quad 0.33 x 0.165 m facing +z. */
function plate({ town = '上山', cls = '480', kana = 'さ', num = '12-34', bg = '#e8c93c', ink = '#1e2a1e', rim = '#b89a2a', hi = '#f4e27a' } = {}) {
  const ph = PX_LINE * 2 + 8, pw = Math.round(ph * 2);
  const c = document.createElement('canvas'); c.width = pw; c.height = ph;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearMipmapLinearFilter;
  const draw = () => {
    g.fillStyle = bg; g.fillRect(0, 0, pw, ph);
    g.fillStyle = rim; g.fillRect(0, 0, pw, 1); g.fillRect(0, ph - 1, pw, 1); g.fillRect(0, 0, 1, ph); g.fillRect(pw - 1, 0, 1, ph);
    g.fillStyle = hi; g.fillRect(1, 1, pw - 2, 1);
    for (const bx of [Math.round(pw * 0.2), Math.round(pw * 0.8)]) { g.fillStyle = '#8a8a80'; g.fillRect(bx, 3, 2, 2); }
    drawPx(g, `${town} ${cls}`, Math.round(pw / 2), 4, { col: ink, align: 'center', max: pw - 4 });
    drawPx(g, `${kana} ${num}`, Math.round(pw / 2), 4 + PX_LINE, { col: ink, align: 'center', max: pw - 4 });
    tex.needsUpdate = true;
  };
  draw();
  PLATES.push(draw);
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  m.name = 'numberPlate';
  const q = new THREE.Mesh(new THREE.PlaneGeometry(0.33, 0.165), m);
  q.userData.noRim = true;
  return q;
}

// the imported models' materials, by their source names: real glass (see-through, the sky and the street in it),
// chrome, the paint with a little clear-coat sheen; and where each one's plates go (front / rear height, metres)
const GLASS = /glass|window|blinn1SG|Material\.00[2-7]$/i, CHROME = /chrome|^crown(\.0\d\d)?$|caders/i, PAINT = /^(body|lambert2SG|Fix0101Mtl)$/i;
export const CAR_PLATES = { mini_truck: [0.36, 0.5], kei_van: [0.38, 0.52], taxi_sedan: [0.42, 0.62] };
const GLASS_M = new Map();
/** Where this model's wheels and window line are (object space, metres), from its own geometry. */
function carShape(g) {
  const wv = [], gl = [];
  g.traverse((o) => {
    if (!o.isMesh) return;
    const P = o.geometry.attributes.position, mats = [].concat(o.material), groups = o.geometry.groups.length ? o.geometry.groups : [{ start: 0, count: o.geometry.index ? o.geometry.index.count : P.count, materialIndex: 0 }];
    for (const gr of groups) {
      const n = mats[gr.materialIndex]?.name || '';
      const isW = /wheel|tire|tyre/i.test(n), isG = GLASS.test(n);
      if (!isW && !isG) continue;
      const I = o.geometry.index;
      for (let k = gr.start; k < gr.start + gr.count; k += 3) {
        const i = I ? I.getX(k) : k;
        (isW ? wv : gl).push([P.getX(i), P.getY(i), P.getZ(i)]);
      }
    }
  });
  const wheels = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const q = wv.filter((v) => Math.sign(v[0]) === sx && Math.sign(v[2]) === sz);
    if (q.length) wheels.push(new THREE.Vector3(...[0, 1, 2].map((k) => q.reduce((t, v) => t + v[k], 0) / q.length)));
  }
  while (wheels.length < 4) wheels.push(new THREE.Vector3(0, -9, 0));
  const r = Math.max(0.2, Math.min(0.42, wheels[0].y > 0 ? wheels[0].y : 0.3));
  const belt = gl.length ? Math.min(...gl.map((v) => v[1])) : 1.0;
  return { wheels, r, belt };
}

/**
 * Painted wear on a car's opaque materials, in the house pixel art (computed per fragment from the model's own space,
 * snapped to a 4 mm grid, so it reads as hand-placed pixels at 1 m and never as noise or a tiling pattern): short
 * brush dabs a step lighter or darker across every panel, a slow value drift over each panel, darker shading on the
 * panel edges (the creases between facets), dust on the roof and bonnet, grime up from the sills and door bottoms, mud
 * round the wheel arches, rain streaks under the windows and a few paint chips low on the doors.
 */
function wearPatch(m, S) {
  if (m.userData.carWear) return;
  m.userData.carWear = true;
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    prev?.call(m, sh, r);
    sh.uniforms.uWheels = { value: S.wheels }; sh.uniforms.uWR = { value: S.r }; sh.uniforms.uBelt = { value: S.belt };
    sh.vertexShader = sh.vertexShader.replace('void main() {', 'varying vec3 vCarP;\nvarying vec3 vCarN;\nvoid main() {')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vCarP = position; vCarN = normal;');
    sh.fragmentShader = sh.fragmentShader.replace('void main() {', `varying vec3 vCarP;
varying vec3 vCarN;
uniform vec3 uWheels[4];
uniform float uWR;
uniform float uBelt;
float cHash(vec3 p) { p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
float cNoise(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(cHash(i), cHash(i + vec3(1,0,0)), f.x), mix(cHash(i + vec3(0,1,0)), cHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(cHash(i + vec3(0,0,1)), cHash(i + vec3(1,0,1)), f.x), mix(cHash(i + vec3(0,1,1)), cHash(i + vec3(1,1,1)), f.x), f.y), f.z); }
void main() {`)
      .replace('#include <map_fragment>', `#include <map_fragment>
  {
    vec3 cp = floor(vCarP * 256.0) / 256.0;            // the 4 mm pixel grid
    vec3 cn = normalize(vCarN);
    float h = cHash(floor(vCarP * 128.0));           // 8 mm clusters for dirt (never lone pixels)
    // brush dabs: 6-pixel strokes along the panel, a step lighter or darker
    float dab = cHash(floor(vCarP * vec3(42.0, 256.0, 42.0)) + 7.0);
    float k = dab < 0.16 ? 0.93 : dab > 0.86 ? 1.06 : 1.0;
    // a slow value drift over each panel, posterised into steps
    k *= 0.94 + floor(cNoise(cp * 3.0) * 4.0) / 4.0 * 0.1;
    // panel edges: where the facet normal turns, a darker line
    k *= 1.0 - clamp(length(fwidth(cn)) * 1.4, 0.0, 0.22);
    vec3 col = diffuseColor.rgb * k;
    // dust on what faces the sky (roof, bonnet, the bed rails), in patches
    float up = clamp(cn.y, 0.0, 1.0);
    float dust = up * smoothstep(0.4, 0.8, cNoise(cp * 6.0)) * 0.4;
    if (h < dust && cNoise(cp * 24.0) > 0.45) col = mix(col, vec3(0.56, 0.52, 0.45), 0.22);
    // grime up from the sills and the door bottoms
    float y = vCarP.y;
    float grime = clamp((0.46 - y) / 0.36, 0.0, 1.0) * (0.55 + 0.45 * cNoise(cp * 9.0));
    if (h < grime * 0.85 && cNoise(cp * 20.0) > 0.35) col = mix(col, vec3(0.27, 0.23, 0.19), 0.4);
    // mud round the wheel arches
    for (int i = 0; i < 4; i++) {
      float d = length(vCarP.yz - uWheels[i].yz);
      if (uWheels[i].y > -1.0 && abs(vCarP.x) > 0.25 && d > uWR && d < uWR + 0.14) {
        float a = 1.0 - (d - uWR) / 0.14;
        if (h < a * 0.9 * (0.6 + 0.4 * cNoise(cp * 12.0))) col = mix(col, vec3(0.30, 0.25, 0.19), 0.55);
      }
    }
    // rain streaks under the windows: thin columns fading down from the window line
    float col1 = cHash(vec3(floor(vCarP.x * 64.0), floor(vCarP.z * 64.0), 3.0));
    float below = uBelt - y;
    if (abs(cn.y) < 0.5 && below > 0.0 && below < 0.5 && col1 < 0.07 && h < 1.0 - below / 0.5) col = mix(col, vec3(0.32, 0.30, 0.27), 0.28);
    // paint chips low on the doors and the sills
    if (abs(cn.y) < 0.5 && y > 0.22 && y < 0.7 && cHash(floor(vCarP * 128.0) + 11.0) > 0.994) col = mix(col, vec3(0.20, 0.20, 0.22), 0.7);
    diffuseColor.rgb = col;
  }`);
  };
  const key = m.customProgramCacheKey?.bind(m);
  m.customProgramCacheKey = () => (key ? key() : '') + 'carWear';
  m.needsUpdate = true;
}

function dress(g) {
  const S = carShape(g);
  g.traverse((o) => {
    if (!o.isMesh) return;
    o.material = [].concat(o.material).map((m) => {
      const n = m.name || '';
      if (!/wheel|tire|tyre|rim|hub/i.test(n) && (GLASS.test(n) || (m.transparent && !/light|lamp/i.test(n)))) {
        // (a source's alpha-blended wheel is not glass)
        if (!GLASS_M.has(n)) {
          GLASS_M.set(n, new THREE.MeshPhysicalMaterial({ name: 'car-glass', color: 0x8fa3ad, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.3,
            depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.7, specularIntensity: 1 }));
        }
        o.renderOrder = 2;
        return GLASS_M.get(n);
      }
      if (CHROME.test(n)) { m.metalness = 0.85; m.roughness = 0.22; m.envMapIntensity = 1.3; }
      else if (PAINT.test(n)) { m.roughness = 0.42; m.metalness = 0.05; m.envMapIntensity = 0.9; }
      else { m.metalness = Math.min(m.metalness, 0.25); m.roughness = Math.max(m.roughness, 0.5); } // painted pixel art, not CG metal
      if (/wheel|tire|tyre/i.test(n) && m.transparent) { m.transparent = false; m.opacity = 1; m.alphaTest = 0.5; m.depthWrite = true; }
      if ((PAINT.test(n) || /^trims$/i.test(n)) && !m.transparent) wearPatch(m, S); // the painted panels only
      return m;
    });
    if (o.material.length === 1) o.material = o.material[0];
  });
  return g;
}

/** The imported model alone (materials dressed, its plates on), local frame: for vehicles the game drives itself.
 *  The models load lazily (they are big): the group is returned at once and fills in; onLoad() runs when it has. */
export function carBody(id, { plate: pl = {}, cast = true, onLoad = null } = {}) {
  if (!LP_ARCH[id]) return null;
  let g = archReady(id) ? archPlace(id, null, { cast }) : null;
  if (g) { dress(g); if (onLoad) queueMicrotask(onLoad); } else {
    g = archSlot(id, null, { cast });
    g.addEventListener?.('assetloaded', () => { dress(g); onLoad?.(); });
  }
  const box = LP_ARCH[id], [fy, ry] = CAR_PLATES[id] || [0.42, 0.5];
  const wrap = new THREE.Group();
  wrap.name = 'car:' + id;
  g.position.set(0, 0, 0); g.rotation.y = 0; g.updateMatrix(); g.matrixAutoUpdate = false;
  const f = plate(pl), r = plate(pl);
  f.position.set(0, fy, box.max[2] + 0.012);
  r.position.set(0, ry, box.min[2] - 0.012); r.rotation.y = Math.PI;
  wrap.add(g, f, r);
  if (id === 'mini_truck') { const gr = grilleSlats(0.5, 0.15); gr.position.set(0, 0.79, 1.672); wrap.add(gr); } // where the maker's badge was
  if (id === 'taxi_sedan') { const gr = grilleSlats(0.2, 0.22); gr.position.set(0, 0.7, 2.255); wrap.add(gr); } // the maker's emblem, cut from the grille
  return wrap;
}

/** A grille of dark horizontal slats with a lit top lip (pixel art), as a quad facing +z: covers a removed badge. */
function grilleSlats(w, h) {
  const W = Math.round(w * 256), H = Math.round(h * 256), c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#3c4044'; g.fillRect(0, 0, W, H);
  for (let y = 3; y < H - 2; y += 6) { g.fillStyle = '#16181a'; g.fillRect(2, y, W - 4, 3); g.fillStyle = '#8a9094'; g.fillRect(2, y - 1, W - 4, 1); }
  g.fillStyle = '#9aa0a4'; g.fillRect(0, 0, W, 1); g.fillStyle = '#202326'; g.fillRect(0, H - 1, W, 1);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter;
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.2, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  m.name = 'grilleSlats';
  const q = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  q.userData.noRim = true;
  return q;
}

export function parkedCar(id, parent, { x = 0, z = 0, ry = 0, plate: pl = {}, cast = true } = {}) {
  const wrap = carBody(id, { plate: pl, cast });
  if (!wrap) return null;
  wrap.position.set(x, 0, z); wrap.rotation.y = ry;
  wrap.updateMatrixWorld(true);
  parent.add(wrap);
  return wrap;
}

/** Lettering painted on a body panel (a cut-out quad facing +z, w x h metres): lines in the game's pixel font at its
 *  native 16 px grid, e.g. a taxi company's name and number on the doors. */
export function lettering(lines, w, h, { ink = '#1e3a24' } = {}) {
  const ph = PX_LINE * lines.length + 4, pw = Math.max(16, Math.round(ph * w / h));
  const c = document.createElement('canvas'); c.width = pw; c.height = ph;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearMipmapLinearFilter;
  const draw = () => { g.clearRect(0, 0, pw, ph); lines.forEach((t, k) => drawPx(g, t, Math.round(pw / 2), 3 + k * PX_LINE, { col: ink, align: 'center', max: pw - 2 })); tex.needsUpdate = true; };
  draw();
  PLATES.push(draw);
  const m = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  m.name = 'carLettering';
  const q = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  q.userData.noRim = true;
  return q;
}
