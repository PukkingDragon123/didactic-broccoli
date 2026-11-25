// A real model where code blocks used to be: an asset (a lowpix world model by its short id, src/kit/lowpixWorld.js, or
// any full asset id) set at a position, turned, and sized like the piece it replaces. Synchronous: an empty slot now,
// the model added when it loads (src/kit/assets.js assetSlot). mat(m) maps each material once it's in (an interior's
// lamp-lit variant: places.mat).
//   lpModel('kitchen_bench', x, y, z, { ry, size: [w, h, d], fit: 'contain' | 'stretch' | 'x' | 'y' | 'z', mat })
import * as THREE from 'three';
import { assetSlot, loadAsset, preloadAssets } from './assets.js';
import { lpAsset } from './lowpixWorld.js';

// The models that replaced the old code-block furniture and street clutter (tools/block-audit.mjs) load with the world,
// before the lane and the places are built, so they are there from the first frame (no furniture popping in).
const WORLD_MODELS = 'ac_unit barricade basket bath_mirror bicycle_old blade_sign bonsai books_old books_stack bookshelf chair_painted concrete_pipe desk_lamp desk_office donation_box drawing_board elec_meter floor_lamp furin geta hang_bar hang_sign hanger_shirt hanger_tee hook_m hose_reel jam_jar kitchen_bench lamp_dome lamp_fluoro lamp_pipe lantern laundry_pole_own laundry_shirt laundry_tee mailbox mailbox_bank menu_easel milk_box mk_island mk_shelf nobori_pole notice_board open_shelf5 paper_crumpled pencil pencil_case pickle_jar pinch_hanger plant_bench plant_pot2 clay_pot sat_dish shopbag_own showcase sign_posts signboard sponge standing_mirror standpipe_tap street_lamp_v stroller styro_box table_side ticket_machine trash_jp twin_tub_own umbrella_closed umbrella_stand vase_ceramic waterheater window_box counter_ramen steel_table range_hood stock_stove griddle_cab shelf_wall shelf_long caddy kitchen_unit wall_cupboard range_fan console_table collection_cabinet glass_showcase display_case shelf_open'.split(' ');
if (typeof document !== 'undefined') await preloadAssets(WORLD_MODELS.map(lpAsset));

export function lpModel(id, x, y, z, { ry = 0, size = null, fit = 'contain', mat = null, cast = true, receive = true, name = null } = {}) {
  const full = id.includes('/') ? id : lpAsset(id);
  const s = assetSlot(full, { size, fit, cast, receive });
  s.position.set(x, y, z);
  s.rotation.y = ry;
  if (name) s.name = name;
  if (mat) {
    const fix = () => s.traverse((o) => { if (o.isMesh && !o.userData.lpMat) { o.material = mat(o.material); o.userData.lpMat = true; } });
    fix();
    s.addEventListener('assetloaded', fix);
  }
  return s;
}

const _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
/**
 * Many copies of real models drawn instanced (one draw call per model material): pot plants, umbrella stands, laundry
 * along a whole lane. add(id, x, y, z, { ry, s: number | [sx, sy, sz], frame: Matrix4 (a batcher's current frame), color
 * (a tint for that copy: washing in its colours) }),
 * then build(parent) once: each model's instances appear when it has loaded.
 */
export class LpInstances {
  constructor() { this.lists = new Map(); }
  add(id, x, y, z, { ry = 0, s = 1, frame = null, color = null } = {}) {
    const full = id.includes('/') ? id : lpAsset(id);
    const sc = Array.isArray(s) ? s : [s, s, s];
    const m = new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromAxisAngle(_up, ry), _s.set(...sc));
    if (frame) m.premultiply(frame);
    if (!this.lists.has(full)) this.lists.set(full, []);
    if (color != null) m.userData = { color: new THREE.Color(color) };
    this.lists.get(full).push(m);
    return this;
  }
  build(parent, { cast = true, receive = true, mat = null } = {}) {
    for (const [id, list] of this.lists) {
      loadAsset(id).then((t) => {
        for (const c of t.children) {
          const im = new THREE.InstancedMesh(c.geometry, mat ? mat(c.material) : c.material, list.length);
          list.forEach((m, i) => { im.setMatrixAt(i, m); if (list.some((x) => x.userData?.color)) im.setColorAt(i, m.userData?.color || new THREE.Color(1, 1, 1)); });
          im.instanceMatrix.needsUpdate = true;
          im.computeBoundingBox(); im.computeBoundingSphere();
          im.castShadow = cast; im.receiveShadow = receive;
          im.name = 'lp:' + id;
          im.userData.asset = id;
          parent.add(im);
        }
      }).catch(() => {});
    }
    this.lists = new Map();
  }
}
