// Hard cel highlights for glossy plastic, clear plastic and plated metal without a shader of our own: small painted
// "studio" environments (equirectangular, hard-edged) that standard materials reflect.
//   * gloss:  a plain grey room with two bright window panes (a tall mullioned one, a small one): on glossy plastic
//             the windows reflect as crisp white shapes, the classic cartoon highlight; nothing else shows.
//   * coat:   the same windows on black, for an additive clear coat over transparent shells (alpha blending would
//             fade a reflection away with the plastic's opacity).
//   * chrome: stepped bands (sky, a dark horizon line, the floor) for plated parts: cel chrome that turns with the view.
//   * pearl:  the same in pastel bands, for pearl shells.
// The rooms follow the camera's yaw (syncCelEnv, once a frame) so the highlight always sits on the upper left of a
// capsule, and their brightness follows the scene's ambient level (dark garage: dim highlights, no glow).
// Nothing here is brighter than paper white once reflected: no bloom.
import * as THREE from 'three';

const W = 1024, H = 512;
const envs = {};

/** Gnomonic membership: is direction d inside a w x h (radians) rectangle centred on (az, el), rolled by `roll`? */
function pane(az, el, w, h, roll = 0) {
  const c = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
  const right = new THREE.Vector3(Math.cos(az), 0, Math.sin(az)), up = new THREE.Vector3().crossVectors(right, c).normalize();
  if (roll) { const q = new THREE.Quaternion().setFromAxisAngle(c, roll); right.applyQuaternion(q); up.applyQuaternion(q); }
  const tw = Math.tan(w / 2), th = Math.tan(h / 2);
  return (d) => {
    const k = d.dot(c);
    if (k <= 0.05) return null;
    const x = d.dot(right) / k / tw, y = d.dot(up) / k / th;
    return Math.abs(x) <= 1 && Math.abs(y) <= 1 ? [x, y] : null;
  };
}

function paint(fn) {
  const data = new Uint16Array(W * H * 4), d = new THREE.Vector3(), hf = THREE.DataUtils.toHalfFloat;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    // three's equirect lookup: u = atan(z, x) / 2pi + 0.5, v = asin(y) / pi + 0.5
    const a = ((i + 0.5) / W - 0.5) * Math.PI * 2, el = ((j + 0.5) / H - 0.5) * Math.PI;
    d.set(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el));
    const c = fn(d, el), o = (j * W + i) * 4;
    data[o] = hf(c[0]); data[o + 1] = hf(c[1]); data[o + 2] = hf(c[2]); data[o + 3] = hf(1);
  }
  const t = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.HalfFloatType);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.LinearSRGBColorSpace;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

// the viewer looks along -z at yaw 0: the big window is up and to the left, the small one low on the right
const D2R = Math.PI / 180;
const WIN = [
  { p: pane(-38 * D2R, 42 * D2R, 36 * D2R, 32 * D2R, 0.12), k: 1, mullion: true },
  { p: pane(50 * D2R, -24 * D2R, 16 * D2R, 12 * D2R, -0.2), k: 0.4 },
  // one more behind the viewer, fainter: something still glints on the far side of a clear dome
  { p: pane(150 * D2R, 48 * D2R, 30 * D2R, 22 * D2R, 0), k: 0.3 },
];
function windows(d) {
  for (const w of WIN) {
    const q = w.p(d);
    if (!q) continue;
    // a cross bar and frame: four panes
    if (w.mullion && (Math.abs(q[0] - 0.05) < 0.1 || Math.abs(q[1] + 0.1) < 0.11)) return 0;
    return w.k;
  }
  return 0;
}

const MAKE = {
  // dielectrics reflect about 4% head on: the panes are painted that much brighter than white
  gloss: () => paint((d) => { const w = windows(d) * 20; return [0.36 + w, 0.35 + w, 0.39 + w]; }),
  coat: () => paint((d) => { const w = windows(d) * 22; return [w, w, w * 1.02]; }),
  chrome: () => paint((d, el) => {
    const e = el / D2R, w = windows(d);
    if (w > 0.5) return [1.06, 1.06, 1.06];
    const v = e > 62 ? 0.8 : e > 24 ? 0.98 : e > 7 ? 0.72 : e > -5 ? 0.2 : e > -32 ? 0.5 : e > -60 ? 0.68 : 0.42;
    return [v * 0.98, v, v * 1.03];
  }),
  pearl: () => paint((d, el) => {
    const e = el / D2R + Math.sin(Math.atan2(d.z, d.x) * 2) * 9, w = windows(d);
    if (w > 0.5) return [1.08, 1.08, 1.08];
    return e > 50 ? [1.0, 0.86, 0.93] : e > 22 ? [1.0, 0.97, 0.86] : e > -4 ? [0.84, 0.98, 0.93] : e > -34 ? [0.84, 0.9, 1.0] : [0.94, 0.86, 1.0];
  }),
};

export function celEnv(name) { return (envs[name] ||= MAKE[name]()); }

// materials that reflect one of the rooms: [material, base intensity]
const tracked = [];
/** Give a material one of the painted rooms (k: its brightness there at the scene's normal ambient level). */
export function useCelEnv(mat, name, k = 1) {
  mat.envMap = celEnv(name);
  mat.envMapIntensity = k;
  mat.userData.celEnv = k;
  tracked.push(mat);
  return mat;
}

let lastYaw = null, lastK = null;
const _e = new THREE.Euler();
/** Once a frame: the rooms turn with the camera and dim with the scene's ambient level. */
export function syncCelEnv(scene, camera) {
  _e.setFromQuaternion(camera.getWorldQuaternion(new THREE.Quaternion()), 'YXZ');
  const yaw = _e.y, k = Math.max(0.12, Math.min(1.25, (scene.environmentIntensity ?? 0.85) / 0.85));
  if (lastYaw !== null && Math.abs(yaw - lastYaw) < 1e-4 && Math.abs(k - lastK) < 1e-3) return;
  lastYaw = yaw; lastK = k;
  for (const m of tracked) { m.envMapRotation.y = yaw; m.envMapIntensity = m.userData.celEnv * k; }
}

// ----------------------------------------------------------------------------- the materials
/** Glossy opaque plastic over a painted skin (tinted by `color`). */
export function glossPlastic(map, color = 0xffffff, o = {}) {
  const m = new THREE.MeshStandardMaterial({ map, color, roughness: o.roughness ?? 0.02, metalness: 0, ...o.extra });
  m.name = 'cel-gloss';
  return useCelEnv(m, 'gloss', o.env ?? 1);
}
/** Matte plastic / paper / card: the scene's own ambient, no window reflections. */
export function mattePlastic(map, color = 0xffffff, o = {}) {
  const m = new THREE.MeshStandardMaterial({ map, color, roughness: o.roughness ?? 0.8, metalness: 0, envMapIntensity: 0.6, ...o.extra });
  m.name = 'cel-matte';
  return m;
}
/** Clear (alpha-painted) plastic: the tint layer. Its reflections come from a coat() mesh over it. */
export function clearPlastic(map, color = 0xffffff, opacity = 1, o = {}) {
  const m = new THREE.MeshStandardMaterial({ map, color, opacity, transparent: true, depthWrite: o.depthWrite ?? true, roughness: 0.5, metalness: 0, envMapIntensity: 0.5, side: o.side ?? THREE.FrontSide, ...o.extra });
  m.name = 'cel-clear';
  return m;
}
/** The additive clear coat: only reflections (window panes, light glints), nothing of its own. */
const _coat = {};
export function coatMaterial(k = 1) {
  if (_coat[k]) return _coat[k];
  const m = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.02, metalness: 0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  m.name = 'cel-coat';
  return (_coat[k] = useCelEnv(m, 'coat', k));
}
/** Plated metal: banded reflections tinted by `color`. */
export function platedMetal(map, color = 0xffffff, o = {}) {
  const m = new THREE.MeshStandardMaterial({ map, color, roughness: o.roughness ?? 0.04, metalness: 1, ...o.extra });
  m.name = 'cel-plated';
  return useCelEnv(m, o.env || 'chrome', o.k ?? 1);
}
/** Pearl: a white body with pastel bands sliding over it. */
export function pearlPlastic(map, color = 0xffffff, o = {}) {
  const m = new THREE.MeshStandardMaterial({ map, color, roughness: 0.05, metalness: o.metalness ?? 0.55, ...o.extra });
  m.name = 'cel-pearl';
  return useCelEnv(m, 'pearl', o.k ?? 1);
}
