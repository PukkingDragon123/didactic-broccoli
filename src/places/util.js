// Small shared helpers for the places: pixel canvases as textures, an invisible click box, a person walking a path.
import * as THREE from 'three';
import { propMesh } from '../world/props.js';

/** A canvas texture with nearest filtering (pixel art). draw(ctx, w, h). Returns { tex, canvas, ctx, redraw(fn) }. */
export function pixCanvas(w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  const o = { tex, canvas, ctx, w, h, redraw(fn) { ctx.clearRect(0, 0, w, h); (fn || draw)?.(ctx, w, h); tex.needsUpdate = true; } };
  if (draw) o.redraw(draw);
  return o;
}

const hitMat = new THREE.MeshBasicMaterial({ visible: false });
/** An invisible box to click (raycasts still hit it). */
export function hitBox(w, h, d, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), hitMat);
  m.position.set(x, y, z);
  return m;
}

/** A voxel prop as a mesh with the given material set (interior / indoor), placed. */
export function prop(id, mats, x = 0, y = 0, z = 0, ry = 0, s = 1) {
  const m = propMesh(id, { castShadow: false });
  if (mats && Array.isArray(m.material)) m.material = mats;
  m.position.set(x, y, z); m.rotation.y = ry;
  if (s !== 1) m.scale.setScalar(s);
  m.receiveShadow = true;
  return m;
}

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
/** Move a Human along points (Vector3s) at speed; call every frame; returns true when arrived. */
export function walkStep(h, path, dt, speed = 1.1) {
  const r = h.root;
  const t = path[0];
  if (!t) { h.update(dt, { speed: 0 }); return true; }
  const dx = t.x - r.position.x, dz = t.z - r.position.z, d = Math.hypot(dx, dz);
  if (d < 0.06) { path.shift(); h.update(dt, { speed: 0 }); return !path.length; }
  const step = Math.min(d, speed * dt);
  r.position.x += dx / d * step; r.position.z += dz / d * step;
  r.rotation.y += wrap(Math.atan2(dx, dz) - r.rotation.y) * Math.min(1, dt * 8);
  h.update(dt, { speed });
  return false;
}
export function turnTo(h, yaw, dt) { const r = h.root; r.rotation.y += wrap(yaw - r.rotation.y) * Math.min(1, dt * 5); }

const _e = new THREE.Euler();
/** Sit a Human down on a seat at height seatY (stool, bench): hips lowered, thighs forward, shins hanging. Applied after
 *  every update while h.sitting is a number (sitDown / standUp). */
export function sitDown(h, seatY) {
  if (!h?.b || !h.rest) return;
  if (!h._sitWrapped) {
    h._sitWrapped = true;
    const up = h.update.bind(h);
    h.update = (dt, o) => { up(dt, o); if (h.sitting > 0) sitPose(h, h.sitting); };
  }
  h.sitting = seatY;
  sitPose(h, seatY);
}
export function standUp(h) { if (h) h.sitting = 0; }
function sitPose(h, seatY) {
  const b = h.b, P = h.P;
  const drop = Math.max(0, P.hipY - seatY);
  b.hips.position.y = h.rest.hips.y - drop;
  for (const [s, sd] of [['L', 1], ['R', -1]]) {
    b['thigh' + s].quaternion.setFromEuler(_e.set(-1.42, sd * 0.05, sd * 0.06, 'ZXY'));
    b['shin' + s].quaternion.setFromEuler(_e.set(1.38, 0, 0, 'YXZ'));
    b['foot' + s].quaternion.setFromEuler(_e.set(0.04, sd * 0.1, 0, 'YXZ'));
  }
}

/** A patch of paper in a canvas texture (the HUD's paper look, src/ui/paper.js): flat stock with a pixel grain of
 *  lighter and darker fibres, an ink-line border optional. Deterministic per position. */
export function paperFill(ctx, x, y, w, h, { base = '#f2e9d6', dark = '#d9ccb2', light = '#fbf6ea', border = null, seed = 7 } = {}) {
  ctx.fillStyle = base; ctx.fillRect(x, y, w, h);
  let s = (seed * 2654435761) >>> 0;
  const r = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  const n = Math.floor(w * h * 0.06);
  for (let i = 0; i < n; i++) { ctx.fillStyle = r() < 0.6 ? dark : light; ctx.fillRect(x + Math.floor(r() * w), y + Math.floor(r() * h), r() < 0.2 ? 2 : 1, 1); }
  if (border) { ctx.fillStyle = border; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h); }
}
/** A strip of masking tape (semi-opaque kraft with torn ends), as on the HUD's notes. */
export function tapeStrip(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(214, 196, 150, 0.85)'; ctx.fillRect(x + 1, y, w - 2, h);
  ctx.fillStyle = 'rgba(190, 170, 120, 0.9)';
  for (let i = 0; i < h; i += 2) { ctx.fillRect(x, y + i, 1, 1); ctx.fillRect(x + w - 1, y + i + 1, 1, 1); }
}
