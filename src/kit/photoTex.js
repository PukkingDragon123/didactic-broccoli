// The shared photo texture library: real surfaces (wood, plaster, tin, asphalt, tatami...) from CC BY photographs
// (Google Open Images, credited one by one in CREDITS.md), cropped, made seamless and repainted into clean cartoon
// paint by tools/make-tex.py. Every tile is a 512 x 512 JPEG in public/img/tex/. Use these in place of generated
// patterns for anything that is a real material.
//
//   photoTex(name, { repeat = [1, 1], tint })                     -> THREE.Texture (fills in when the image arrives)
//   photoMat(name, { repeat, tint, roughness = 0.9, metalness = 0 }) -> a shared MeshStandardMaterial
//   photoRepeat(name, widthM, heightM)                            -> [u, v] for a face of that size in metres
//   PHOTO_TEX[name] = { file, metres, avg }    metres: the real size one tile covers; avg: its mean colour (hex)
//   photoTint(name, colour)                    the tint that makes the tile's mean colour come out as `colour`
//   whenPhotoTexReady()                        resolves when everything requested so far has loaded
//
// `tint` multiplies the tile, exactly like material.color (photoMat uses material.color, so tints share one texture;
// photoTex bakes it into the pixels). Textures are sRGB, repeat-wrapped, mipmapped, linear-filtered, anisotropy 8,
// cached per name + options, and every repeat of one tile shares a single upload. Until its image arrives a
// texture is the tile's flat mean colour, so nothing flashes black.
import * as THREE from 'three';

// name -> { file, metres, avg }. One tile covers `metres` x `metres` of the real surface.
export const PHOTO_TEX = {
  // wood
  wood_planks:      { file: 'wood_planks.jpg',      metres: 1.2, avg: 0xb99c79 }, // sawn boards, joints run along V
  wood_weathered:   { file: 'wood_weathered.jpg',   metres: 1.2, avg: 0x9b948a }, // grey, sun-bleached boards
  plywood:          { file: 'plywood.jpg',          metres: 1.2, avg: 0xc9ae86 },
  timber_dark:      { file: 'timber_dark.jpg',      metres: 1.0, avg: 0x604b3e }, // stained / charred posts and beams
  // walls
  plaster_cream:    { file: 'plaster_cream.jpg',    metres: 2.0, avg: 0xd9d0b9 },
  mortar_grey:      { file: 'mortar_grey.jpg',      metres: 2.0, avg: 0xa9a59c },
  block_wall:       { file: 'block_wall.jpg',       metres: 1.6, avg: 0xa9a6a1 }, // concrete blocks, whole courses per tile
  brick_red:        { file: 'brick_red.jpg',        metres: 1.0, avg: 0xa8695b },
  // metal
  tin_corrugated:   { file: 'tin_corrugated.jpg',   metres: 1.0, avg: 0xaab1b2 }, // ribs run along V
  tin_rusty:        { file: 'tin_rusty.jpg',        metres: 1.0, avg: 0x93725d }, // ribs run along V
  steel_painted:    { file: 'steel_painted.jpg',    metres: 1.5, avg: 0xc4c6c2 }, // light, neutral: made to be tinted
  steel_galvanised: { file: 'steel_galvanised.jpg', metres: 1.5, avg: 0xa9aeb0 },
  rust:             { file: 'rust.jpg',             metres: 1.0, avg: 0x8d5d43 },
  // concrete and road
  concrete:         { file: 'concrete.jpg',         metres: 2.5, avg: 0xb3b0a9 },
  concrete_stained: { file: 'concrete_stained.jpg', metres: 2.5, avg: 0x9d9a91 },
  asphalt:          { file: 'asphalt.jpg',          metres: 2.0, avg: 0x75757a },
  asphalt_patched:  { file: 'asphalt_patched.jpg',  metres: 3.0, avg: 0x67676b },
  // roofs
  roof_kawara:      { file: 'roof_kawara.jpg',      metres: 1.2, avg: 0x63676d }, // tile courses step down V
  roof_tin:         { file: 'roof_tin.jpg',         metres: 1.0, avg: 0x7f8d95 }, // seams run along V
  // indoor
  tatami:           { file: 'tatami.jpg',           metres: 0.3, avg: 0xbab17d }, // rush runs along U
  shoji_paper:      { file: 'shoji_paper.jpg',      metres: 0.5, avg: 0xe6e0d0 },
  cardboard:        { file: 'cardboard.jpg',        metres: 0.6, avg: 0xba9971 },
  canvas_cloth:     { file: 'canvas_cloth.jpg',     metres: 0.4, avg: 0xcfc6b0 },
  indigo_cloth:     { file: 'indigo_cloth.jpg',     metres: 0.4, avg: 0x45597d },
  paper_old:        { file: 'paper_old.jpg',        metres: 0.5, avg: 0xd9cba8 },
  // tiles
  tile_white:         { file: 'tile_white.jpg',         metres: 0.6, avg: 0xddddd5 }, // 4 x 4 tiles of 15 cm
  tile_checker_floor: { file: 'tile_checker_floor.jpg', metres: 0.6, avg: 0xa3a49e }, // 2 x 2 squares of 30 cm
  // ground
  gravel:           { file: 'gravel.jpg',           metres: 1.0, avg: 0x9e9a8f },
  soil:             { file: 'soil.jpg',             metres: 1.5, avg: 0x7d6752 },
  grass:            { file: 'grass.jpg',            metres: 1.5, avg: 0x7d9a5e },
  moss:             { file: 'moss.jpg',             metres: 1.0, avg: 0x6c8750 },
  bark_pine:        { file: 'bark_pine.jpg',        metres: 0.6, avg: 0x51433b }, // plated, fissures run along V
  bark_cherry:      { file: 'bark_cherry.jpg',      metres: 0.6, avg: 0x65514d }, // lenticel bands run across V
  // other
  rubber:           { file: 'rubber.jpg',           metres: 0.5, avg: 0x3d3c40 },
  frosted_glass:    { file: 'frosted_glass.jpg',    metres: 0.5, avg: 0xd0dddc },
};

const DIR = 'img/tex/';
const GREY = 0x808080;
const sources = new Map();   // name | name@tint -> { source, textures: Set, loaded }
const textures = new Map();  // name | tint | repeat -> Texture
const materials = new Map();
const warned = new Set();
const pending = new Set();

const hexOf = (c) => (c == null ? null : new THREE.Color(c).getHex());
const hexStr = (h) => '#' + h.toString(16).padStart(6, '0');
function entry(name) {
  const e = PHOTO_TEX[name];
  if (!e && !warned.has(name)) { warned.add(name); console.warn(`photoTex: unknown texture "${name}" (names are in src/kit/photoTex.js)`); }
  return e || null;
}

const TILE = 512;   // every tile's size: the stand-in matches it, so swapping the photo in needs no new GPU storage
const SourceClass = THREE.TextureSource || THREE.Source;

/** A flat canvas (the stand-in until the photo arrives, at the tile's size; 4 px for an unknown name). */
function flat(hex, size = 4) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); g.fillStyle = hexStr(hex); g.fillRect(0, 0, size, size); // the whole placeholder, or it reads as transparent black until the photo loads
  return c;
}
const mul = (a, b) => { const A = new THREE.Color(a).multiply(new THREE.Color(b)); return A.getHex(); };

/** The image multiplied by a colour in linear light (the same result as material.color on the plain tile). */
function tinted(img, tintHex) {
  const c = document.createElement('canvas'); c.width = img.naturalWidth || img.width; c.height = img.naturalHeight || img.height;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
  const t = new THREE.Color(tintHex), k = [t.r, t.g, t.b];
  const lin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4), srgb = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);
  const lut = k.map((kc) => Uint8ClampedArray.from({ length: 256 }, (_, v) => Math.round(srgb(Math.min(1, lin(v / 255) * kc)) * 255)));
  const id = g.getImageData(0, 0, c.width, c.height), d = id.data;
  for (let i = 0; i < d.length; i += 4) { d[i] = lut[0][d[i]]; d[i + 1] = lut[1][d[i + 1]]; d[i + 2] = lut[2][d[i + 2]]; }
  g.putImageData(id, 0, 0);
  return c;
}

/** One upload per tile (+ baked tint), shared by every repeat of it. */
function sourceFor(name, tintHex) {
  const key = tintHex == null ? name : name + '@' + tintHex;
  let s = sources.get(key);
  if (s) return s;
  const e = entry(name);
  const base = e ? e.avg : GREY;
  s = { source: new SourceClass(flat(tintHex == null ? base : mul(base, tintHex), e ? TILE : 4)), textures: new Set(), loaded: !e };
  sources.set(key, s);
  if (!e || typeof document === 'undefined') return s;
  const job = new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      let data = img;
      try { if (tintHex != null) data = tinted(img, tintHex); } catch (err) { /* keep the plain tile */ }
      // a tile of another size needs new GPU storage: it gets a new Source (the stand-in's storage is the stand-in's
      // size, and writing a bigger image into it fails: "texSubImage2D: offset overflows texture dimensions")
      if ((data.naturalWidth || data.width) !== TILE || (data.naturalHeight || data.height) !== TILE) {
        s.source = new SourceClass(data);
        for (const t of s.textures) t.source = s.source;
      } else s.source.data = data;
      s.loaded = true;
      for (const t of s.textures) t.needsUpdate = true;
      res();
    };
    img.onerror = () => { if (!warned.has(key)) { warned.add(key); console.warn(`photoTex: could not load ${DIR}${e.file}`); } res(); };
    img.src = new URL(DIR + e.file, document.baseURI).href;
  });
  pending.add(job); job.then(() => pending.delete(job));
  return s;
}

/**
 * A tiling photo texture. Returns at once (the tile's flat mean colour) and fills in when the image has loaded.
 * @param {string} name a key of PHOTO_TEX
 * @param {{ repeat?: [number, number] | number, tint?: THREE.ColorRepresentation, turn?: boolean }} [o] tint multiplies the
 *   tile; turn gives it a quarter turn (don't clone() a photo texture: a clone misses the swap when the photo arrives)
 * @returns {THREE.Texture}
 */
export function photoTex(name, { repeat = [1, 1], tint, turn = false } = {}) {
  const [ru, rv] = Array.isArray(repeat) ? repeat : [repeat, repeat];
  const tintHex = hexOf(tint) === 0xffffff ? null : hexOf(tint);
  const key = `${name}|${tintHex ?? ''}|${+ru.toFixed(4)},${+rv.toFixed(4)}${turn ? '|turn' : ''}`;
  let tex = textures.get(key);
  if (tex) return tex;
  const s = sourceFor(name, tintHex);
  tex = new THREE.Texture();
  tex.source = s.source;
  tex.name = 'photo:' + key;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.repeat.set(ru, rv);
  if (turn) tex.rotation = Math.PI / 2; // (a quarter turn: boards lying along a wall)
  tex.needsUpdate = true;
  s.textures.add(tex);
  textures.set(key, tex);
  return tex;
}

/**
 * A shared lit material wearing a photo texture (the renderer's cel shading and ink apply to it as to any standard
 * material). Roughness guide in docs/ART.md: 0.85-0.95 plaster, timber, cloth, rust; 0.6-0.75 painted metal, zinc;
 * 0.3-0.45 glazed tile. Don't mutate the result (it is shared): ask for another with different options.
 * @param {string} name
 * @param {{ repeat?: [number, number] | number, tint?: THREE.ColorRepresentation, roughness?: number, metalness?: number }} [o]
 * @returns {THREE.MeshStandardMaterial}
 */
export function photoMat(name, { repeat = [1, 1], tint, roughness = 0.9, metalness = 0 } = {}) {
  const [ru, rv] = Array.isArray(repeat) ? repeat : [repeat, repeat];
  const tintHex = hexOf(tint) ?? 0xffffff;
  const key = `${name}|${tintHex}|${+ru.toFixed(4)},${+rv.toFixed(4)}|${roughness}|${metalness}`;
  let m = materials.get(key);
  if (m) return m;
  m = new THREE.MeshStandardMaterial({ map: photoTex(name, { repeat: [ru, rv] }), color: tintHex, roughness, metalness });
  m.name = 'photo:' + name;
  materials.set(key, m);
  return m;
}

/** The repeat that shows a tile at its real size on a face `widthM` x `heightM` metres (UVs running 0..1 across it). */
export function photoRepeat(name, widthM, heightM = widthM) {
  const m = (entry(name) || { metres: 1 }).metres;
  return [widthM / m, heightM / m];
}

/**
 * The tint that brings a tile's mean colour to `colour` (so "this wall is that cream" keeps the photo's grain and
 * wear). Channels are capped at 1: a tile can be darkened or shifted, not lit up, so tint the light tiles
 * (plaster_cream, steel_painted, concrete, canvas_cloth, shoji_paper, tile_white).
 * @returns {THREE.Color}
 */
export function photoTint(name, colour) {
  const a = new THREE.Color((entry(name) || { avg: GREY }).avg), c = new THREE.Color(colour);
  return new THREE.Color(Math.min(1, c.r / Math.max(a.r, 1e-3)), Math.min(1, c.g / Math.max(a.g, 1e-3)), Math.min(1, c.b / Math.max(a.b, 1e-3)));
}

/** Resolves when every texture asked for so far has loaded (or failed). */
export function whenPhotoTexReady() {
  return pending.size ? Promise.all([...pending]).then(whenPhotoTexReady) : Promise.resolve();
}
