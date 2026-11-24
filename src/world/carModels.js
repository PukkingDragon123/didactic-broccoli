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
const CAR_WHEELS = { mini_truck: { r: 0.265, at: [[-0.555, -0.932], [-0.555, 0.875], [0.555, -0.932], [0.555, 0.875]] } }; // tyres in a generic material
function carShape(g, id) {
  const wv = [], gl = [], pv = [];
  g.traverse((o) => {
    if (!o.isMesh) return;
    const I = o.geometry.index, P = o.geometry.attributes.position, mats = [].concat(o.material), groups = o.geometry.groups.length ? o.geometry.groups : [{ start: 0, count: o.geometry.index ? o.geometry.index.count : P.count, materialIndex: 0 }];
    for (const gr of groups) {
      const n = mats[gr.materialIndex]?.name || '';
      const isW = /wheel|tire|tyre/i.test(n), isG = GLASS.test(n), isP = PAINT.test(n);
      if (isP) { const N = o.geometry.attributes.normal; for (let k = gr.start; k < gr.start + gr.count; k++) { const i = I ? I.getX(k) : k; pv.push([P.getX(i), P.getY(i), P.getZ(i), N ? N.getX(i) : 0]); } }
      if (!isW && !isG) continue;
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
  if (!wheels.length && CAR_WHEELS[id]) for (const [x, z] of CAR_WHEELS[id].at) wheels.push(new THREE.Vector3(x, CAR_WHEELS[id].r, z));
  while (wheels.length < 4) wheels.push(new THREE.Vector3(0, -9, 0));
  const r = Math.max(0.2, Math.min(0.42, wheels[0].y > 0 ? wheels[0].y : 0.3));
  // each arch's lip: the nearest side-facing paint above that wheel's centre (a low percentile, so a stray flange won't count)
  const lip = new THREE.Vector4(r + 0.03, r + 0.03, r + 0.03, r + 0.03);
  wheels.forEach((w, i) => {
    if (w.y < -1) return;
    const ds = pv.filter((v) => Math.sign(v[0]) === Math.sign(w.x) && Math.abs(v[0]) > 0.25 && Math.abs(v[3]) > 0.5 && v[1] > w.y + 0.02)
      .map((v) => Math.hypot(v[1] - w.y, v[2] - w.z)).filter((d) => d > r * 0.9 && d < r * 1.8).sort((a, b) => a - b);
    if (ds.length > 4) lip.setComponent(i, ds[Math.min(ds.length - 1, Math.floor(ds.length * 0.04))]);
  });
  const belt = gl.length ? Math.min(...gl.map((v) => v[1])) : 1.0;
  const B = LP_ARCH[id] || { min: [-0.8, 0, -1.7], max: [0.8, 1.5, 1.7] }, half = new THREE.Vector2((B.max[0] - B.min[0]) / 2, (B.max[2] - B.min[2]) / 2);
  return { wheels, r, belt, lip, half };
}

/**
 * Painted wear on a car's opaque materials, in the house pixel art: computed per fragment in the model's own space on
 * a 4 mm grid, and always as shapes, never single pixels: long brush strokes a step lighter or darker laid along the
 * car, a slow posterised drift over each panel, darker panel edges, dust as clusters of round dabs (6-20 px, a ring
 * and a denser core) pooled toward the edges of whatever faces the sky, grime up from the sills in three lobed steps,
 * mud as a dark band on each arch lip with tapering splashes and drops above it, 2 px rain runs under the windows and
 * a few lobed paint chips (primer inside a dark rim) low on the doors.
 */
function wearPatch(m, S) {
  if (m.userData.carWear) return;
  m.userData.carWear = true;
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    prev?.call(m, sh, r);
    sh.uniforms.uWheels = { value: S.wheels }; sh.uniforms.uLip = { value: S.lip }; sh.uniforms.uBelt = { value: S.belt }; sh.uniforms.uHalf = { value: S.half };
    sh.vertexShader = sh.vertexShader.replace('void main() {', 'varying vec3 vCarP;\nvarying vec3 vCarN;\nvoid main() {')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vCarP = position; vCarN = normal;');
    sh.fragmentShader = sh.fragmentShader.replace('void main() {', `varying vec3 vCarP;
varying vec3 vCarN;
uniform vec3 uWheels[4];
uniform vec4 uLip;
uniform float uBelt;
uniform vec2 uHalf;
float cHash(vec3 p) { p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
float cNoise(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(cHash(i), cHash(i + vec3(1,0,0)), f.x), mix(cHash(i + vec3(0,1,0)), cHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(cHash(i + vec3(0,0,1)), cHash(i + vec3(1,0,1)), f.x), mix(cHash(i + vec3(0,1,1)), cHash(i + vec3(1,1,1)), f.x), f.y), f.z); }
vec4 cH4(vec2 c, float s) { return vec4(cHash(vec3(c, s)), cHash(vec3(c, s + 1.7)), cHash(vec3(c, s + 3.1)), cHash(vec3(c, s + 4.9))); }
vec3 cUnplane(vec2 uv, vec3 p, int ax) { return ax == 1 ? vec3(uv.x, p.y, uv.y) : ax == 0 ? vec3(p.x, uv.y, uv.x) : vec3(uv.x, uv.y, p.z); }
// brush strokes: long dabs laid one way across the panel, each a step lighter or darker (-2..2)
float cStrokes(vec2 q, float ang) {
  float s = 0.0; vec2 cell = floor(q / 10.0), dir = vec2(cos(ang), sin(ang));
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 c = cell + vec2(i, j); vec4 r = cH4(c, 3.0);
    if (r.z > 0.55) continue;
    vec2 d = q - (c + r.xy) * 10.0, e = vec2(dot(d, dir), dot(d, vec2(-dir.y, dir.x)));
    if (length(e / vec2(5.0 + 6.0 * r.w, 2.0 + 1.5 * r.x)) < 1.0) s += r.y < 0.5 ? -1.0 : 1.0;
  }
  return clamp(s, -2.0, 2.0);
}
// dust: round dabs 6-20 px across, gathered in clusters where m is high; a ring and a denser core (0..3)
float cDust(vec2 q, vec3 p, int ax, float m) {
  float lv = 0.0; vec2 cell = floor(q / 9.0);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 c = cell + vec2(i, j); vec4 r = cH4(c, 13.0);
    vec2 ctr = (c + r.xy) * 9.0;
    float cl = smoothstep(0.45, 0.75, cNoise(cUnplane(ctr / 256.0, p, ax) * 5.0));
    if (r.z > m * cl * 1.5) continue;
    if (length((q - ctr) / (vec2(1.0, 0.7 + 0.3 * r.x) * (3.0 + 6.0 * r.w))) < 1.0) lv += 1.0;
  }
  return min(lv, 3.0);
}
void main() {`)
      .replace('#include <map_fragment>', `#include <map_fragment>
  {
    vec3 p = vCarP, cn = normalize(vCarN), an = abs(cn);
    int ax = an.y >= an.x && an.y >= an.z ? 1 : an.x >= an.z ? 0 : 2;
    vec2 uv = ax == 1 ? p.xz : ax == 0 ? p.zy : p.xy;
    vec2 q = floor(uv * 256.0) + 0.5;                 // pixel centres on the 4 mm grid
    vec3 cp = floor(p * 256.0) / 256.0;
    // brushwork: strokes along the car, a step up or down, and a slow posterised drift over each panel
    float k = 1.0 + 0.03 * cStrokes(q, (ax == 1 ? 1.5708 : 0.0) + (cNoise(p * 2.0) - 0.5) * 0.6);
    k *= 0.96 + floor(cNoise(cp * 3.0) * 4.0) * 0.02;
    // panel edges: where the facet normal turns, a darker line
    k *= 1.0 - clamp(length(fwidth(cn)) * 1.4, 0.0, 0.22);
    vec3 col = diffuseColor.rgb * k;
    // grime up from the sills and door bottoms: three steps, the top edge broken in brushy lobes
    if (an.y < 0.75) {
      float g = clamp((0.46 - p.y) / 0.34, 0.0, 1.0) + (cNoise(p * 9.0) - 0.5) * 0.45 + (cNoise(p * 26.0) - 0.5) * 0.16;
      float gl = floor(clamp(g, 0.0, 0.999) * 4.0);
      if (gl > 0.0) col = mix(col, vec3(0.26, 0.22, 0.18), gl * 0.15);
    }
    // rain streaks from the window line: 2 px runs in two values, clustered under the corners
    float below = uBelt - p.y;
    if (an.y < 0.5 && below > 0.0 && below < 0.45) {
      float sx = floor((ax == 1 ? uv.x : uv.x) * 128.0);
      float r0 = cHash(vec3(sx, ax == 0 ? sign(p.x) : sign(p.z), 5.0)), len = 0.06 + 0.3 * cHash(vec3(sx, 2.0, 9.0));
      if (r0 < 0.16 * smoothstep(0.35, 0.65, cNoise(vec3(sx / 128.0 * 5.0, 1.0, ax))) && below < len)
        col = mix(col, vec3(0.30, 0.28, 0.25), below < len * 0.5 ? 0.24 : 0.14);
    }
    // dust on what faces the sky (roof, bonnet, the bed rails), pooled toward its edges and the foot of the glass
    float up = cn.y;
    if (up > 0.5) {
      float edge = max(max(smoothstep(0.6, 0.95, abs(p.x) / uHalf.x), smoothstep(0.75, 0.97, abs(p.z) / uHalf.y)),
                       max(1.0 - smoothstep(0.0, 0.12, abs(p.y - uBelt)), 1.0 - smoothstep(0.86, 0.97, up)));
      float lv = cDust(q, p, ax, smoothstep(0.5, 0.8, up) * (0.03 + 0.97 * edge));
      if (lv > 0.0) col = mix(col, vec3(0.58, 0.55, 0.48), 0.04 + lv * 0.035);
    }
    // mud splashed up from each arch lip: a dark band on the lip, tapering splashes and a few drops above it
    if (an.x > 0.25 && abs(p.x) > 0.25) for (int i = 0; i < 4; i++) {
      vec3 W = uWheels[i];
      if (W.y < -1.0) continue;
      float L = uLip[i]; vec2 dv = p.yz - W.yz;
      float dpx = (length(dv) - L) * 256.0;
      if (dpx < -4.0 || dpx > 46.0) continue;
      float s = atan(dv.x, dv.y) * L * 256.0, sec = floor(s / 10.0), mud = 0.0;
      if (dpx < 2.0 + 5.0 * cNoise(vec3(s / 10.0, float(i) * 7.0, 0.5))) mud = 2.0;
      for (int k2 = -1; k2 <= 1; k2++) {
        float c = sec + float(k2); vec4 r = cH4(vec2(c, float(i)), 31.0);
        if (r.w > 0.38) continue;
        float len = 8.0 + 26.0 * r.x * r.x, w = 2.0 + 2.5 * r.y, t = dpx / len;
        float ds = s - (c + r.z) * 10.0 - (r.z - 0.5) * 0.9 * dpx;     // thrown at a lean
        if (t >= 0.0 && t < 1.0 && abs(ds) < w * (1.0 - 0.55 * t)) mud = max(mud, t < 0.45 ? 2.0 : 1.0);
        if (length(vec2(ds, dpx - len)) < w * 0.9 + 0.8) mud = max(mud, 1.0);   // the blob it ends in
        if (r.x > 0.6 && length(vec2(ds, dpx - len - 5.0 - 4.0 * r.y)) < 1.6 + r.y) mud = max(mud, 1.0);
      }
      if (mud > 0.0) col = mix(col, mud > 1.0 ? vec3(0.16, 0.13, 0.10) : vec3(0.30, 0.25, 0.19), mud > 1.0 ? 0.85 : 0.7);
    }
    // paint chips low on the doors: a few lobed flakes, bare primer inside a dark rim
    if (an.y < 0.5 && p.y > 0.22 && p.y < 0.75) {
      vec2 c = floor(q / 22.0); vec4 r = cH4(c, 41.0);
      if (r.z < 0.05) {
        vec2 d = q - (c + 0.3 + 0.4 * r.xy) * 22.0;
        float a = atan(d.y, d.x), rr = (2.2 + 2.0 * r.w) * (1.0 + 0.28 * sin(3.0 * a + 6.28 * r.x) + 0.14 * sin(5.0 * a + 6.28 * r.y));
        float e = length(d) / rr;
        if (e < 1.0) col = e < 0.55 ? vec3(0.56, 0.55, 0.51) : vec3(0.13, 0.11, 0.10);
      }
    }
    diffuseColor.rgb = col;
  }`);
  };
  const key = m.customProgramCacheKey?.bind(m);
  m.customProgramCacheKey = () => (key ? key() : '') + 'carWear2';
  m.needsUpdate = true;
}

function dress(g, id) {
  const S = carShape(g, id);
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
  if (g) { dress(g, id); if (onLoad) queueMicrotask(onLoad); } else {
    g = archSlot(id, null, { cast });
    g.addEventListener?.('assetloaded', () => { dress(g, id); onLoad?.(); });
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
