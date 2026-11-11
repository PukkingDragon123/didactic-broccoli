// The shared surface texture library: real materials (wood, plaster, tin, asphalt, tatami...) from CC0 scans (Poly
// Haven, ambientCG) and one CC BY photo (Google Open Images), all credited in CREDITS.md, turned into seamless
// high-resolution pixel art by tools/make-tex.py (tools/pixelart.py: shading ramps, a base tone, clean clusters,
// regraded to the game's palette). Each tile is a palette PNG in public/img/tex/ at the game's density: 128 texels a
// metre for walls, roofs, roads and ground, 192 to 256 for things seen up close (tatami, paper, cloth, tiles, bark).
// Use these in place of generated patterns for anything that is a real material.
//
//   photoTex(name, { repeat = [1, 1], tint, turn })               -> THREE.Texture (fills in when the image arrives)
//   photoMat(name, { repeat, tint, roughness = 0.9, metalness = 0 }) -> a shared MeshStandardMaterial
//   photoRepeat(name, widthM, heightM)                            -> [u, v] for a face of that size in metres
//   PHOTO_TEX[name] = { file, metres, avg }    metres: the real size one tile covers; avg: its mean colour (hex)
//   photoTint(name, colour)                    the tint that makes the tile's mean colour come out as `colour`
//   pixelFilter(texture)                       the pixel-art filtering below, for any other texture
//   pixelCanvas(texture, { alphaTest })        the same plus a linear-light mip chain, for a canvas painted once
//   linearMips(imageData, { alphaTest })       that mip chain (premultiplied, coverage-keeping with alphaTest)
//   whenPhotoTexReady()                        resolves when everything requested so far has loaded
//   photoTexStats()                            { textures, bytes } of the tiles uploaded so far (with their mips)
//
// Filtering (docs/ART.md): the texels are crisp up close (nearest magnification) and never shimmer far away: the mip
// chain is built here, each level the average of the one above in linear light (sRGB-correct), sampled trilinear and
// anisotropic (x8), so a road or a wall at a grazing angle stays clean. `tint` multiplies the tile, exactly like
// material.color (photoMat uses material.color, so tints share one texture; photoTex bakes it into the pixels).
// Textures are sRGB, repeat-wrapped, cached per name + options, and every repeat of one tile shares a single upload.
// Until its image arrives a texture is the tile's flat mean colour, so nothing flashes black.
import * as THREE from 'three';

// name -> { file, metres, avg }. One tile covers `metres` x `metres` of the real surface (the scan's own size).
export const PHOTO_TEX = {
  // wood
  wood_planks:      { file: 'wood_planks.png',      metres: 1.88, avg: 0xb99c78 }, // hinoki boards, joints run along V
  wood_weathered:   { file: 'wood_weathered.png',   metres: 1.5,  avg: 0x9c9489 }, // grey, sun-bleached boards along V
  plywood:          { file: 'plywood.png',          metres: 0.98, avg: 0xcaaf86 },
  timber_dark:      { file: 'timber_dark.png',      metres: 2.0,  avg: 0x614b3c }, // stained posts and beams, grain along V
  // walls
  plaster_cream:    { file: 'plaster_cream.png',    metres: 2.0,  avg: 0xd9cfb8 },
  mortar_grey:      { file: 'mortar_grey.png',      metres: 1.0,  avg: 0xa9a59c },
  block_wall:       { file: 'block_wall.png',       metres: 2.0,  avg: 0xa8a59f }, // concrete blocks, whole courses per tile
  brick_red:        { file: 'brick_red.png',        metres: 2.0,  avg: 0xa96a5b },
  // metal
  tin_corrugated:   { file: 'tin_corrugated.png',   metres: 1.12, avg: 0xaab1b0 }, // ribs run along V
  tin_rusty:        { file: 'tin_rusty.png',        metres: 2.0,  avg: 0x936f58 }, // ribs run along V
  steel_painted:    { file: 'steel_painted.png',    metres: 1.5,  avg: 0xc4c6c2 }, // light, neutral: made to be tinted
  steel_galvanised: { file: 'steel_galvanised.png', metres: 1.5,  avg: 0xa9aeb0 }, // brushed along U
  rust:             { file: 'rust.png',             metres: 2.19, avg: 0x8e5b40 },
  // concrete and road
  concrete:         { file: 'concrete.png',         metres: 2.5,  avg: 0xb4b1a8 },
  concrete_stained: { file: 'concrete_stained.png', metres: 3.0,  avg: 0x9d9990 },
  asphalt:          { file: 'asphalt.png',          metres: 4.0, avg: 0x75767a },
  asphalt_patched:  { file: 'asphalt_patched.png',  metres: 3.0,  avg: 0x67676a }, // cracked
  // roofs
  roof_kawara:      { file: 'roof_kawara.png',      metres: 3.0,  avg: 0x65696e }, // tile courses step down V
  roof_tin:         { file: 'roof_tin.png',         metres: 2.0,  avg: 0x7f8d94 }, // seams run along V
  // indoor
  tatami:           { file: 'tatami.png',           metres: 1.0,  avg: 0xb9b07c }, // rush runs along U
  shoji_paper:      { file: 'shoji_paper.png',      metres: 0.5,  avg: 0xe6e0d0 },
  cardboard:        { file: 'cardboard.png',        metres: 0.6,  avg: 0xb99970 },
  canvas_cloth:     { file: 'canvas_cloth.png',     metres: 0.4,  avg: 0xd0c6b0 },
  indigo_cloth:     { file: 'indigo_cloth.png',     metres: 0.4,  avg: 0x44587c },
  paper_old:        { file: 'paper_old.png',        metres: 0.5,  avg: 0xd8cba8 },
  // tiles
  tile_white:         { file: 'tile_white.png',         metres: 1.0, avg: 0xdcdcd4 }, // 8 x 8 tiles of 12.5 cm
  tile_checker_floor: { file: 'tile_checker_floor.png', metres: 2.0, avg: 0xa6a399 }, // 8 x 8 squares of 25 cm
  // ground
  gravel:           { file: 'gravel.png',           metres: 2.0,  avg: 0x9c988d },
  soil:             { file: 'soil.png',             metres: 2.0,  avg: 0x7d6750 },
  grass:            { file: 'grass.png',            metres: 2.0,  avg: 0x7d9b5c },
  moss:             { file: 'moss.png',             metres: 1.0,  avg: 0x6d8750 },
  bark_pine:        { file: 'bark_pine.png',        metres: 2.0,  avg: 0x514238 }, // plated, fissures run along V
  bark_cherry:      { file: 'bark_cherry.png',      metres: 1.6,  avg: 0x66514c }, // lenticel bands run across V
  // other
  rubber:           { file: 'rubber.png',           metres: 0.75, avg: 0x3d3c40 },
  frosted_glass:    { file: 'frosted_glass.png',    metres: 0.5,  avg: 0xd1dcdc },
};

const DIR = 'img/tex/';
const GREY = 0x808080;
const ANISO = 8;
const sources = new Map();   // name | name@tint -> { source, mips, textures: Set, loaded }
const textures = new Map();  // name | tint | repeat -> Texture
const materials = new Map();
const warned = new Set();
const pending = new Set();
const SourceClass = THREE.TextureSource || THREE.Source;

// Nearest magnification that still lets three.js set anisotropic filtering: three r186 skips anisotropy when
// magFilter === THREE.NearestFilter (a number), though GL applies it to minification whatever the magnification
// filter is. Its filter table is a plain object keyed by the constants, so the same constant as a string selects
// GL NEAREST and passes that check.
const NEAREST_ANISO = String(THREE.NearestFilter);

/** Pixel-art filtering for any texture: crisp texels up close, trilinear + anisotropic mips far away. */
export function pixelFilter(tex, aniso = ANISO) {
  tex.magFilter = NEAREST_ANISO;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = aniso;
  return tex;
}

const hexOf = (c) => (c == null ? null : new THREE.Color(c).getHex());
const hexStr = (h) => '#' + h.toString(16).padStart(6, '0');
function entry(name) {
  const e = PHOTO_TEX[name];
  if (!e && !warned.has(name)) { warned.add(name); console.warn(`photoTex: unknown texture "${name}" (names are in src/kit/photoTex.js)`); }
  return e || null;
}

/** A flat 4 x 4 canvas: the stand-in until the tile arrives. */
function flat(hex) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = c.height = 4;
  const g = c.getContext('2d'); g.fillStyle = hexStr(hex); g.fillRect(0, 0, 4, 4);
  return c;
}
const mul = (a, b) => { const A = new THREE.Color(a).multiply(new THREE.Color(b)); return A.getHex(); };

// sRGB <-> linear for the mip chain
const TO_LIN = new Float32Array(256);
for (let v = 0; v < 256; v++) { const c = v / 255; TO_LIN[v] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }
const TO_SRGB = new Uint8Array(4097);
for (let i = 0; i <= 4096; i++) { const c = i / 4096; TO_SRGB[i] = Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055)); }

/** One axis of an area-weighted downscale (n -> m texels), wrapping: weights[x] = [[src, w], ...]. */
function areaWeights(n, m) {
  const out = [], s = n / m;
  for (let x = 0; x < m; x++) {
    const a = x * s, b = (x + 1) * s, w = [];
    for (let i = Math.floor(a); i < Math.ceil(b - 1e-9); i++) w.push([i % n, (Math.min(b, i + 1) - Math.max(a, i)) / s]);
    out.push(w);
  }
  return out;
}

/** The full mip chain of an RGBA image (ImageData), each level averaged in linear light from the level above (an
 *  exact 2 x 2 box when the size is even, area-weighted when it is odd); sizes follow GL: max(1, floor(n / 2)).
 *  With alpha the colour is averaged premultiplied, the colour of the opaque texels is bled under the clear ones (no
 *  dark fringe), and with `alphaTest` each level's alpha is rescaled so as much of it passes the test as of the full
 *  image (an alpha-cut mesh or fence keeps its body at a distance instead of thinning out and shimmering). */
export function linearMips(img, { alphaTest = 0 } = {}) {
  let w = img.width, h = img.height;
  const d0 = img.data, n0 = w * h;
  let alpha = false;
  for (let i = 3; i < d0.length; i += 4) if (d0[i] < 255) { alpha = true; break; }
  let cur = new Float32Array(n0 * 4);
  let br = 0, bg = 0, bb = 0, bn = 0;
  for (let i = 0; i < d0.length; i += 4) {
    const a = d0[i + 3] / 255;
    cur[i] = TO_LIN[d0[i]] * a; cur[i + 1] = TO_LIN[d0[i + 1]] * a; cur[i + 2] = TO_LIN[d0[i + 2]] * a; cur[i + 3] = a;
    if (a > 0.5) { br += TO_LIN[d0[i]]; bg += TO_LIN[d0[i + 1]]; bb += TO_LIN[d0[i + 2]]; bn++; }
  }
  const bleed = bn ? [br / bn, bg / bn, bb / bn] : [0, 0, 0];
  let cov0 = 0;
  if (alphaTest) for (let i = 3; i < d0.length; i += 4) if (d0[i] / 255 >= alphaTest) cov0++;
  cov0 /= n0;
  const encode = (f, nw, nh) => {
    const id = new ImageData(nw, nh), d = id.data;
    let k = 1;
    if (alpha && alphaTest) {   // the alpha scale that keeps the coverage
      let lo = 0.5, hi = 8;
      for (let it = 0; it < 16; it++) { const m = (lo + hi) / 2; let c = 0; for (let i = 3; i < f.length; i += 4) if (f[i] * m >= alphaTest) c++; if (c / (nw * nh) < cov0) lo = m; else hi = m; }
      k = (lo + hi) / 2;
    }
    for (let i = 0; i < d.length; i += 4) {
      const a = f[i + 3], inv = a > 1e-4 ? 1 / a : 0;
      for (let c = 0; c < 3; c++) {
        const v = alpha ? (a > 1e-4 ? f[i + c] * inv * Math.min(1, a * 4) + bleed[c] * (1 - Math.min(1, a * 4)) : bleed[c]) : f[i + c];
        d[i + c] = TO_SRGB[Math.round(Math.min(1, v) * 4096)];
      }
      d[i + 3] = alpha ? Math.round(255 * Math.min(1, a * k)) : 255;
    }
    return id;
  };
  const levels = [alpha ? encode(cur, w, h) : img];
  while (w > 1 || h > 1) {
    const nw = Math.max(1, w >> 1), nh = Math.max(1, h >> 1), WX = areaWeights(w, nw), WY = areaWeights(h, nh);
    const tmp = new Float32Array(nw * h * 4), nxt = new Float32Array(nw * nh * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < nw; x++) {
      const o = (y * nw + x) * 4;
      for (const [sx, k] of WX[x]) { const q = (y * w + sx) * 4; tmp[o] += cur[q] * k; tmp[o + 1] += cur[q + 1] * k; tmp[o + 2] += cur[q + 2] * k; tmp[o + 3] += cur[q + 3] * k; }
    }
    for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
      const o = (y * nw + x) * 4;
      for (const [sy, k] of WY[y]) { const q = (sy * nw + x) * 4; nxt[o] += tmp[q] * k; nxt[o + 1] += tmp[q + 1] * k; nxt[o + 2] += tmp[q + 2] * k; nxt[o + 3] += tmp[q + 3] * k; }
    }
    levels.push(encode(nxt, nw, nh));
    cur = nxt; w = nw; h = nh;
  }
  return levels;
}

/** Pixel-art filtering plus the linear-light mip chain for a canvas that is painted once (call again after a
 *  repaint). Returns the texture. */
export function pixelCanvas(tex, { alphaTest = 0, aniso = ANISO } = {}) {
  const c = tex.image;
  pixelFilter(tex, aniso);
  if (!c || !c.getContext) return tex;
  const mips = linearMips(c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height), { alphaTest });
  tex.mipmaps = mips; tex.generateMipmaps = false; tex.needsUpdate = true;
  return tex;
}

/** The tile's pixels, multiplied by a colour in linear light (the same result as material.color on the plain tile). */
function pixels(img, tintHex) {
  const c = document.createElement('canvas'); c.width = img.naturalWidth || img.width; c.height = img.naturalHeight || img.height;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
  const id = g.getImageData(0, 0, c.width, c.height);
  if (tintHex != null) {
    const t = new THREE.Color(tintHex), k = [t.r, t.g, t.b], d = id.data;
    const lut = k.map((kc) => Uint8ClampedArray.from({ length: 256 }, (_, v) => TO_SRGB[Math.round(Math.min(1, TO_LIN[v] * kc) * 4096)]));
    for (let i = 0; i < d.length; i += 4) { d[i] = lut[0][d[i]]; d[i + 1] = lut[1][d[i + 1]]; d[i + 2] = lut[2][d[i + 2]]; }
  }
  return id;
}

/** One upload per tile (+ baked tint), shared by every repeat of it. */
function sourceFor(name, tintHex) {
  const key = tintHex == null ? name : name + '@' + tintHex;
  let s = sources.get(key);
  if (s) return s;
  const e = entry(name);
  const base = e ? e.avg : GREY;
  s = { source: new SourceClass(flat(tintHex == null ? base : mul(base, tintHex))), mips: [], textures: new Set(), loaded: !e, bytes: 0 };
  sources.set(key, s);
  if (!e || typeof document === 'undefined') return s;
  const job = new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      try {
        const mips = linearMips(pixels(img, tintHex));
        // a new Source: its GPU storage is allocated at the tile's size with the whole chain
        s.source = new SourceClass(mips[0]);
        s.mips = mips;
        s.bytes = mips.reduce((a, m) => a + m.width * m.height * 4, 0);
        for (const t of s.textures) { t.source = s.source; t.mipmaps = mips; t.generateMipmaps = false; t.needsUpdate = true; }
      } catch (err) { console.warn(`photoTex: could not read ${DIR}${e.file}`, err); }
      s.loaded = true;
      res();
    };
    img.onerror = () => { if (!warned.has(key)) { warned.add(key); console.warn(`photoTex: could not load ${DIR}${e.file}`); } res(); };
    img.src = new URL(DIR + e.file, document.baseURI).href;
  });
  pending.add(job); job.then(() => pending.delete(job));
  return s;
}

/**
 * A tiling texture from the library. Returns at once (the tile's flat mean colour) and fills in when the image has loaded.
 * @param {string} name a key of PHOTO_TEX
 * @param {{ repeat?: [number, number] | number, tint?: THREE.ColorRepresentation, turn?: boolean }} [o] tint multiplies the
 *   tile; turn gives it a quarter turn (don't clone() a photo texture: a clone misses the swap when the tile arrives)
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
  if (s.mips.length) { tex.mipmaps = s.mips; tex.generateMipmaps = false; }
  tex.name = 'photo:' + key;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  pixelFilter(tex);
  tex.repeat.set(ru, rv);
  if (turn) tex.rotation = Math.PI / 2; // (a quarter turn: boards lying along a wall)
  tex.needsUpdate = true;
  s.textures.add(tex);
  textures.set(key, tex);
  return tex;
}

/**
 * A shared lit material wearing a library texture (the renderer's cel shading and ink apply to it as to any standard
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
 * The tint that brings a tile's mean colour to `colour` (so "this wall is that cream" keeps the texture's grain and
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

/** What the library has uploaded: tiles (one per name + tint) and their bytes with the mip chains. */
export function photoTexStats() {
  let bytes = 0, n = 0;
  for (const s of sources.values()) if (s.bytes) { bytes += s.bytes; n++; }
  return { textures: n, bytes };
}
