// Block-audit hooks (tools/block-audit.mjs; only with ?blockaudit in the URL, otherwise every call is a no-op): the
// static batchers (Town.js, src/room/build.js, src/growth/kit.js Batch) tag each box / plane / extra geometry they merge
// with the call site and its local bounds, and every mesh added to the scene remembers where it was added from, so the
// audit can list the primitive-built pieces by source line. Import it first (src/main.js) so the add hook sees all.
import * as THREE from 'three';

export const BLOCK_AUDIT = typeof location !== 'undefined' && /[?&]blockaudit\b/.test(location.search);
const recs = new WeakMap();
const SKIP = /blockTag\.js|\/node_modules\/|\bBatch\.|Object3D\.add|Group\.add|Mesh\.add|Scene\.add/;

/** The first three call-site frames outside the batchers and three.js, as 'src/world/Town.js:123'. */
function caller() {
  const out = [];
  for (const line of new Error().stack.split('\n').slice(1)) {
    if (SKIP.test(line)) continue;
    const m = line.match(/\/(src\/[^?:)]+)(?:\?[^:)]*)?:(\d+):\d+/);
    if (!m) continue;
    out.push(m[1] + ':' + m[2]);
    if (out.length >= 3) break;
  }
  return out;
}

/** A short description of a material: its texture key (pixMat), map name or colour. */
export function matDesc(m) {
  if (Array.isArray(m)) m = m[0];
  if (!m) return '?';
  const map = m.map;
  const k = m.userData?.key || m.name || map?.userData?.key || map?.name || (map?.image?.src ? map.image.src.split('/').pop().split('?')[0] : map ? 'canvas' : '');
  return (k || 'flat #' + m.color?.getHexString?.()) + (m.vertexColors ? ' (tinted)' : '');
}
/** A batcher pushed geometry g (final, in its build-parent's local frame) with material mat. kind: 'box' | 'plane' |
 *  'quad' | 'geo:<type>'. */
export function tagBlock(g, mat, kind) {
  if (!BLOCK_AUDIT) return;
  g.computeBoundingBox();
  const b = g.boundingBox;
  if (g.userData?.model) kind = 'model:' + g.userData.model; // (a real model's mesh merged into the batch: not a block)
  recs.set(g, { kind, min: b.min.toArray(), max: b.max.toArray(), mat: matDesc(mat), src: caller() });
}
/** The batcher merged list into mesh: hand the merged parts' records to the mesh (userData.blocks). */
export function tagBuilt(list, mesh) {
  if (!BLOCK_AUDIT) return;
  const parts = list.map((g) => recs.get(g)).filter(Boolean);
  if (parts.length) mesh.userData.blocks = parts;
}

if (BLOCK_AUDIT) {
  Error.stackTraceLimit = 16;
  const add = THREE.Object3D.prototype.add;
  THREE.Object3D.prototype.add = function (...objs) {
    for (const o of objs) if (o && (o.isMesh || o.isGroup) && !o.userData.src) o.userData.src = caller();
    return add.apply(this, objs);
  };
  window.__blockAudit = true;
}
