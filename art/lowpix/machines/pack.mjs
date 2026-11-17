// Pack the machines-area lowpix builds for the game: node art/lowpix/machines/pack.mjs   (art/lowpix/machines/make.py runs it)
// Reads node_modules/.cache/lowpix-machines/<spec>/*.glb + art/lowpix/machines/<spec>.meta.json and writes, per pack
// (PACKS below: a model and its stand share a file), public/models/lowpix/machines/<pack>.glb:
//   one node per joint (the meta's joints: crank, lid, flap, drawer...), plus 'body' (everything static) and, for a
//   stand spec, 'stand'. Each node holds ONE mesh, in its joint's frame (the node's translation is the pivot, metres),
//   with a primitive per (atlas, material kind): kinds come from the meta's mats (metal / gloss / glass / glow, else
//   matte), so the game can give chrome a metallic finish and the smoked flap a see-through one.
// Units: lowpix mm -> metres. Materials: unlit -> lit (the painted light stays in the atlas; game lights add to it).
// The atlas is cropped to its used rows and dilated (no dark seams in the mips), then quantized + meshopt.
// Writes src/gachakit/lowpix.manifest.json: { <pack>: { nodes: { name: { pivot, tris } }, size, atlas, bytes, meta } }.
import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { quantize, reorder, getBounds } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../../..');
const ART = resolve(ROOT, 'art/lowpix/machines');
const CACHE = resolve(ROOT, 'node_modules/.cache/lowpix-machines');
const OUT = resolve(ROOT, 'public/models/lowpix/machines');
const MAN = resolve(ROOT, 'src/gachakit/lowpix.manifest.json');
const UNIT = 0.001;
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
mkdirSync(OUT, { recursive: true });

// packs: output name -> the specs merged into it (a spec not named here packs on its own)
const PACKS = {};
for (const t of ['retro', 'standard', 'deluxe', 'royal']) PACKS[t] = [t, t + '_stand'];

const built = existsSync(CACHE) ? readdirSync(CACHE).filter((d) => readdirSync(join(CACHE, d)).some((f) => f.endsWith('.glb'))) : [];
const inPack = new Set(Object.values(PACKS).flat());
for (const id of built) if (!inPack.has(id)) PACKS[id] = [id];

async function polishAtlas(png) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, px = new Uint8ClampedArray(data);
  let maxY = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (px[(y * W + x) * 4 + 3] > 0) maxY = y;
  const Hc = Math.min(H, Math.ceil((maxY + 9) / 16) * 16);
  const solid = new Uint8Array(W * Hc), alpha = new Uint8Array(W * Hc);
  for (let i = 0; i < W * Hc; i++) { solid[i] = px[i * 4 + 3] > 0 ? 1 : 0; alpha[i] = px[i * 4 + 3]; }
  for (let pass = 0; pass < 16; pass++) {
    const add = [];
    for (let y = 0; y < Hc; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (solid[i]) continue;
      let r = 0, g = 0, b = 0, n = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = x + dx, Y = y + dy;
        if (X < 0 || Y < 0 || X >= W || Y >= Hc) continue;
        const j = Y * W + X;
        if (!solid[j]) continue;
        r += px[j * 4]; g += px[j * 4 + 1]; b += px[j * 4 + 2]; n++;
      }
      if (n) add.push([i, r / n, g / n, b / n]);
    }
    if (!add.length) break;
    for (const [i, r, g, b] of add) { px[i * 4] = r; px[i * 4 + 1] = g; px[i * 4 + 2] = b; solid[i] = 1; }
  }
  const keepAlpha = alpha.some((a, i) => solid[i] && a > 0 && a < 255);
  for (let i = 0; i < W * Hc; i++) px[i * 4 + 3] = keepAlpha ? alpha[i] : 255;
  const out = await sharp(Buffer.from(px.buffer, 0, W * Hc * 4), { raw: { width: W, height: Hc, channels: 4 } })
    .png({ compressionLevel: 9, palette: true, colours: 256, effort: 10 }).toBuffer();
  return { png: out, vScale: H / Hc, W, H: Hc };
}

const mul = (M, x, y, z, w = 1) => [M[0] * x + M[4] * y + M[8] * z + M[12] * w, M[1] * x + M[5] * y + M[9] * z + M[13] * w, M[2] * x + M[6] * y + M[10] * z + M[14] * w];
const man = existsSync(MAN) ? JSON.parse(readFileSync(MAN, 'utf8')) : {};

for (const [pack, specs] of Object.entries(PACKS)) {
  const have = specs.filter((s) => built.includes(s));
  if (!have.length) continue;
  const out = new Document();
  const buf = out.createBuffer();
  const scene = out.createScene(pack);
  const nodes = new Map(); // name -> { pivot, prims: Map(key -> { pos, nrm, uv, idx, mat }) }
  const metaAll = {};
  let atlas = [];
  for (const sid of have) {
    const dir = join(CACHE, sid);
    const file = readdirSync(dir).find((f) => f.endsWith('.glb'));
    const meta = JSON.parse(readFileSync(join(ART, sid + '.meta.json'), 'utf8'));
    Object.assign(metaAll, { [sid]: { standBox: meta.standBox, sideQuad: meta.sideQuad, density: meta.density } });
    const doc = await io.read(join(dir, file));
    const root = doc.getRoot();
    const joints = meta.joints || {};
    const isStand = sid.endsWith('_stand');
    // the atlas: polished once, a texture in the output
    const texMap = new Map();
    for (const t of root.listTextures()) {
      const r = await polishAtlas(Buffer.from(t.getImage()));
      const ot = out.createTexture(sid).setImage(r.png).setMimeType('image/png');
      texMap.set(t, { tex: ot, vScale: r.vScale });
      atlas.push([sid, r.W, r.H]);
    }
    const jointOf = (n) => { for (let p = n; p; p = p.getParentNode()) { if (joints[p.getName()]) return p.getName(); } return isStand ? 'stand' : 'body'; };
    const partOf = (n) => n.getName().replace(/_mirror$/, '');
    for (const n of root.listNodes()) {
      const mesh = n.getMesh();
      if (!mesh) continue;
      const J = jointOf(n), piv = joints[J] || [0, 0, 0];
      if (!nodes.has(J)) nodes.set(J, { pivot: piv.map((v) => v * UNIT), prims: new Map() });
      const N = nodes.get(J), M = n.getWorldMatrix();
      const kind = meta.mats?.[partOf(n)] || 'matte';
      for (const p of mesh.listPrimitives()) {
        const mat = p.getMaterial(), base = mat?.getBaseColorTexture();
        const T = texMap.get(base);
        const ds = mat?.getDoubleSided() ? 1 : 0;
        const key = `${sid}|${kind}|${ds}`;
        if (!N.prims.has(key)) N.prims.set(key, { pos: [], nrm: [], uv: [], idx: [], tex: T?.tex, kind, ds, alpha: mat?.getAlphaMode() });
        const P = N.prims.get(key), base0 = P.pos.length / 3;
        const pa = p.getAttribute('POSITION').getArray(), na = p.getAttribute('NORMAL')?.getArray(), ua = p.getAttribute('TEXCOORD_0')?.getArray();
        for (let i = 0; i < pa.length / 3; i++) {
          const w = mul(M, pa[i * 3], pa[i * 3 + 1], pa[i * 3 + 2]);
          P.pos.push((w[0] * UNIT - N.pivot[0]), (w[1] * UNIT - N.pivot[1]), (w[2] * UNIT - N.pivot[2]));
          if (na) { const v = mul(M, na[i * 3], na[i * 3 + 1], na[i * 3 + 2], 0), l = Math.hypot(...v) || 1; P.nrm.push(v[0] / l, v[1] / l, v[2] / l); }
          if (ua) P.uv.push(ua[i * 2], ua[i * 2 + 1] * (T?.vScale || 1));
        }
        const ix = p.getIndices()?.getArray();
        if (ix) for (const k of ix) P.idx.push(k + base0);
        else for (let i = 0; i < pa.length / 3; i++) P.idx.push(i + base0);
      }
    }
  }
  // materials (one per atlas x kind x sidedness) and the nodes
  const mats = new Map();
  const info = {};
  for (const [name, N] of nodes) {
    const mesh = out.createMesh(name);
    let tris = 0;
    for (const [key, P] of N.prims) {
      if (!mats.has(key)) {
        const m = out.createMaterial(key.replace(/\|/g, ':')).setBaseColorTexture(P.tex || null).setDoubleSided(!!P.ds)
          .setRoughnessFactor({ metal: 0.38, gloss: 0.42, glass: 0.12, glow: 0.8 }[P.kind] ?? 0.82).setMetallicFactor(P.kind === 'metal' ? 0.55 : 0);
        if (P.kind === 'glass') m.setAlphaMode('BLEND').setBaseColorFactor([1, 1, 1, 0.55]);
        else if (P.alpha === 'MASK') m.setAlphaMode('MASK').setAlphaCutoff(0.5);
        mats.set(key, m);
      }
      const acc = (arr, type, Ctor) => out.createAccessor().setType(type).setArray(new Ctor(arr)).setBuffer(buf);
      const prim = out.createPrimitive().setMaterial(mats.get(key))
        .setAttribute('POSITION', acc(P.pos, 'VEC3', Float32Array))
        .setIndices(acc(P.idx, 'SCALAR', P.pos.length / 3 > 65535 ? Uint32Array : Uint16Array));
      if (P.nrm.length) prim.setAttribute('NORMAL', acc(P.nrm, 'VEC3', Float32Array));
      if (P.uv.length) prim.setAttribute('TEXCOORD_0', acc(P.uv, 'VEC2', Float32Array));
      mesh.addPrimitive(prim);
      tris += P.idx.length / 3;
    }
    const node = out.createNode(name).setMesh(mesh).setTranslation(N.pivot);
    scene.addChild(node);
    info[name] = { pivot: N.pivot.map((v) => +v.toFixed(5)), tris };
  }
  await out.transform(reorder({ encoder: MeshoptEncoder }), quantize());
  out.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  const path = join(OUT, pack + '.glb');
  await io.write(path, out);
  const b = getBounds(scene);
  const meta = {};
  for (const [sid, m] of Object.entries(metaAll)) if (m.sideQuad) meta.sideQuad = Object.fromEntries(Object.entries(m.sideQuad).map(([k, v]) => [k, +(v * UNIT).toFixed(4)]));
  for (const [sid, m] of Object.entries(metaAll)) if (m.standBox) meta.standBox = Object.fromEntries(Object.entries(m.standBox).map(([k, v]) => [k, +(v * UNIT).toFixed(4)]));
  man[pack] = { nodes: info, size: [0, 1, 2].map((i) => +(b.max[i] - b.min[i]).toFixed(4)), min: b.min.map((v) => +v.toFixed(4)), atlas, bytes: statSync(path).size, ...meta };
  const tris = Object.values(info).reduce((a, n) => a + n.tris, 0);
  console.log(`packed ${pack}: ${Object.keys(info).length} nodes, ${tris} tris, atlas ${atlas.map((a) => a[1] + 'x' + a[2]).join(' + ')}, ${(man[pack].bytes / 1024).toFixed(0)} KB`);
}
writeFileSync(MAN, JSON.stringify(Object.fromEntries(Object.entries(man).sort()), null, 1) + '\n');
