// Contact pictures for Pichat (and anything else on the PC that shows a person): head-and-shoulders renders of the
// real in-game 3D people, made with the game's own renderer (game.thumbs) the first time they're needed and cached.
// No drawn faces: whoever a contact is, they're built through the people module's public API, so the pictures follow
// any change to the human models.
//
//   avatarFor(game, id, avatar, cb?) -> data URL now (cached) or a placeholder, then cb(url) once rendered
//   personOf(id, avatar)             -> { character } | { preset, seed } | null (who to build; null: not a person)
// avatar may be: a data: URL (used as is), { person: { character | preset, seed } }, or an old portrait look object
// (bg, hair, ...: only its colours and hints are used to pick a matching real person).
import * as THREE from 'three';
import { createHuman, HUMAN_PRESETS } from '../people/index.js';

const cache = new Map();
const waiting = new Map(); // key -> [cb]
const queue = [];
let pumping = false, cam = null, createCharacter = null, RES = null;
// lane characters have their own touches (src/npc/looks.js), residents their door records (src/npc/doors.js); loaded
// lazily so the PC never waits on them (and never imports the lane at start-up)
const libs = Promise.all([
  import('../npc/looks.js').then((m) => { createCharacter = m.createCharacter; }).catch(() => {}),
  import('../npc/doors.js').then((m) => { RES = m.RES; }).catch(() => {}),
]);

const PRESET_IDS = new Set(HUMAN_PRESETS.map((p) => p.id || p));
const STREET = ['salaryman', 'office_lady', 'mom', 'otaku', 'tourist', 'delivery', 'shopkeeper', 'grandpa', 'grandma', 'gyaru'];
const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

/** Who a contact is: a lane character, a resident behind a door, a named person, or a stranger picked from the id. */
export function personOf(id, avatar) {
  if (avatar?.person) return avatar.person;
  if (PRESET_IDS.has(id) && !STREET.includes(id)) return { character: id, seed: 7 };
  const r = RES?.[id];
  if (r?.preset) return { preset: r.preset, seed: r.seed ?? 1 };
  const a = avatar && typeof avatar === 'object' ? avatar : {};
  // a contact that isn't a person (a notice board, a shop's account): just its colour, no face
  if (Object.keys(a).every((k) => k === 'bg')) return null;
  const n = hash(id);
  let preset = STREET[n % STREET.length];
  if (a.hair === 'bald' || a.beard) preset = n % 2 ? 'shopkeeper' : 'salaryman';
  else if (a.hair === 'bun' || a.hair === 'perm') preset = 'grandma';
  else if (a.hair === 'long') preset = n % 2 ? 'office_lady' : 'gyaru';
  else if (a.cap) preset = 'delivery';
  return { preset, seed: 1 + (n % 997) };
}

const keyOf = (p, size) => `${p.character || p.preset}:${p.seed}:${size}`;
const bgOf = (avatar) => (avatar && typeof avatar === 'object' && typeof avatar.bg === 'number' ? avatar.bg : 0x8ab8c8);

/** A placeholder while the render waits: a plain tile in the contact's colour (no face). */
function blank(bg, size) {
  const k = `blank:${bg}:${size}`;
  if (cache.has(k)) return cache.get(k);
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const c = cv.getContext('2d');
  c.fillStyle = `#${bg.toString(16).padStart(6, '0')}`;
  c.fillRect(0, 0, size, size);
  const u = cv.toDataURL();
  cache.set(k, u);
  return u;
}

/** The contact picture for a thread: a URL right away (the render once it's cached), and cb(url) when it's ready. */
export function avatarFor(game, id, avatar, cb = null, size = 64) {
  if (typeof avatar === 'string') return avatar;
  const bg = bgOf(avatar), k = `${id}|${avatar?.person ? JSON.stringify(avatar.person) : ''}|${size}|${bg}`;
  if (cache.has(k)) return cache.get(k);
  if (cb) (waiting.get(k) || waiting.set(k, []).get(k)).push(cb);
  if (!queue.some((j) => j.k === k)) queue.push({ k, id, avatar, bg, size, game });
  pump();
  return blank(bg, size);
}

/** Renders one picture every couple of frames (a page full of contacts never hitches). */
async function pump() {
  if (pumping) return;
  pumping = true;
  await libs;
  const step = () => {
    const job = queue.shift();
    if (!job) { pumping = false; return; }
    let url = '';
    const p = personOf(job.id, job.avatar), pk = p ? `${keyOf(p, job.size)}:${job.bg}` : null;
    if (!p) url = blank(job.bg, job.size);
    else try { url = cache.get(pk) || render(job.game, p, job.size, job.bg); } catch (e) { console.warn('avatar', e); }
    if (url) { cache.set(job.k, url); if (pk) cache.set(pk, url); }
    for (const f of waiting.get(job.k) || []) { try { f(url || blank(job.bg, job.size)); } catch (e) { console.warn(e); } }
    waiting.delete(job.k);
    setTimeout(step, 30);
  };
  setTimeout(step, 30);
}

function build(p) {
  if (p.character && createCharacter) return createCharacter(p.character, { seed: p.seed ?? 7 });
  return createHuman({ preset: p.character || p.preset, seed: p.seed ?? 1, lazy: false });
}

function render(game, p, size, bg) {
  const T = game?.thumbs, r = T?.renderer;
  if (!r) return '';
  const h = build(p);
  h.finishPaint?.();
  h.setExpression?.('smile');
  h.update?.(0.016, {});
  h.root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(h.root);
  const eyeY = h.P?.eyeY ?? box.max.y - 0.11;
  cam ||= new THREE.PerspectiveCamera(22, 1, 0.01, 10);
  // head and shoulders, a touch from the side (an ID photo, not a mugshot)
  const top = Math.min(box.max.y, eyeY + 0.21) + 0.02, bottom = eyeY - 0.19;
  const cy = (top + bottom) / 2, half = (top - bottom) / 2;
  const dist = half / Math.tan(THREE.MathUtils.degToRad(11)) * 1.02;
  const dir = new THREE.Vector3(0.3, 0.06, 1).normalize();
  const zf = h.P?.zf ?? 0;
  cam.position.set(dir.x * dist, cy + dir.y * dist, dir.z * dist + zf * 0.5);
  cam.lookAt(0, cy, zf * 0.5);
  cam.updateProjectionMatrix();
  T.scene.add(h.root);
  if (T.rt.width !== size) T.rt.setSize(size, size);
  const prevRT = r.getRenderTarget(), prevClear = r.getClearColor(new THREE.Color()), prevAlpha = r.getClearAlpha();
  const px = new Uint8Array(size * size * 4);
  try {
    r.setRenderTarget(T.rt);
    r.setClearColor(bg, 1);
    r.clear();
    r.render(T.scene, cam);
    r.readRenderTargetPixels(T.rt, 0, 0, size, size, px);
  } finally {
    r.setRenderTarget(prevRT);
    r.setClearColor(prevClear, prevAlpha);
    T.scene.remove(h.root);
    h.dispose?.();
  }
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    const src = (size - 1 - y) * size * 4, dst = y * size * 4;
    for (let i = 0; i < size * 4; i++) img.data[dst + i] = i % 4 === 3 ? 255 : px[src + i];
  }
  ctx.putImageData(img, 0, 0);
  return cv.toDataURL();
}
