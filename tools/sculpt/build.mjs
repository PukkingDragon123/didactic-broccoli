// Build the sculpted props: node tools/sculpt/build.mjs [tanuki] [sandcastle]
//   tanuki      -> public/models/tanuki_shigaraki.glb: a Shigaraki-ware tanuki (信楽焼): straw kasa pushed back, sake
//                  tokkuri in the right hand, the 通 ledger in the left, a big cream belly, glossy brown glaze with lighter
//                  runs on the raised parts, a round base; after photographs of the real statues (no free model exists)
//   sandcastle  -> public/models/sandcastle.glb: a child's castle in the park sandbox: a crenellated bucket-mould keep
//                  with the bucket's ribs, four small mould towers, patted walls with a gate, a moat with the dug sand
//                  heaped outside it, damp sand where it was moulded and in the moat, dry crust on top; the orange
//                  bucket lying beside it, a blue spade, a lolly-stick flag
// Then the models are drawn by the prop library (src/data/props: tanuki_statue, sand_toys) like any import.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import sharp from 'sharp';
import { resolve } from 'node:path';
import { V, ellipsoid, sphere, capsule, rbox, cone, torus, smin, smax, fbm, noise, polygonise, decimate, rampTexture, rowV, writeGLB } from './sdf.mjs';

const ROOT = resolve(import.meta.dirname, '../..');
const W = 256, H = 128;
const which = process.argv.slice(2);
const clamp = (x) => Math.max(0.02, Math.min(0.98, x));
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Colour a polygonised sculpt: per triangle, the group of its centre picks the ramp row (so rows never blend across a
 *  triangle), per corner the tone; returns { [part]: geometry } split by material part. */
function paint(g, groupAt, tone, partOf) {
  const ng = g.toNonIndexed(), pos = ng.attributes.position, nrm = ng.attributes.normal, n = pos.count;
  const uv = new Float32Array(n * 2), parts = {}, p = V(0, 0, 0), c = V(0, 0, 0), N = V(0, 0, 0);
  const tri = [];
  for (let i = 0; i < n; i += 3) {
    c.set(0, 0, 0); for (let k = 0; k < 3; k++) c.add(V(pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k))); c.multiplyScalar(1 / 3);
    const grp = groupAt(c);
    for (let k = 0; k < 3; k++) {
      p.set(pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k)); N.set(nrm.getX(i + k), nrm.getY(i + k), nrm.getZ(i + k));
      const [u, v] = tone(grp, p, N, c);
      uv[(i + k) * 2] = u; uv[(i + k) * 2 + 1] = v;
    }
    tri.push(partOf(grp));
  }
  ng.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  for (const name of new Set(tri)) {
    const sel = []; tri.forEach((t, j) => { if (t === name) sel.push(j); });
    const out = new THREE.BufferGeometry();
    for (const a of ['position', 'normal', 'uv']) {
      const src = ng.attributes[a], arr = new Float32Array(sel.length * 3 * src.itemSize);
      sel.forEach((j, s) => { for (let k = 0; k < 3 * src.itemSize; k++) arr[s * 3 * src.itemSize + k] = src.array[j * 3 * src.itemSize + k]; });
      out.setAttribute(a, new THREE.BufferAttribute(arr, src.itemSize));
    }
    out.setIndex([...Array(sel.length * 3).keys()]);
    parts[name] = out;
  }
  return parts;
}
async function png(rows, label) {
  const px = rampTexture(W, H, rows);
  let img = sharp(Buffer.from(px), { raw: { width: W, height: H, channels: 4 } });
  if (label) img = sharp(await img.png().toBuffer()).composite([{ input: Buffer.from(label), left: 192, top: 64 }]);
  return img.png({ palette: true, colours: 96, dither: 0 }).toBuffer();
}
const tris = (parts) => parts.reduce((s, p) => s + p.geometry.index.count / 3, 0);

// ================================================================== the Shigaraki tanuki (0.42 x 0.53 x 0.36)
async function tanuki() {
  const A = -0.42, ca = Math.cos(A), sa = Math.sin(A), hc = [0, 0.452, -0.04];
  const hatLocal = (p) => { const y = p.y - hc[1], z = p.z - hc[2]; return V(p.x - hc[0], y * ca + z * sa, -y * sa + z * ca); };
  const G = {
    body: (p) => {
      let d = ellipsoid(p, [0, 0.19, 0], [0.135, 0.15, 0.115]);
      d = smin(d, ellipsoid(p, [0, 0.1, -0.005], [0.13, 0.085, 0.112]), 0.03);
      for (const s of [-1, 1]) {
        d = smin(d, ellipsoid(p, [s * 0.066, 0.042, 0.05], [0.052, 0.04, 0.068]), 0.025);
        d = smin(d, ellipsoid(p, [s * 0.07, 0.437, -0.004], [0.026, 0.03, 0.016]), 0.012);
        d = smin(d, capsule(p, [s * 0.042, 0.408, 0.078], [s * 0.068, 0.402, 0.062], 0.008), 0.006); // brows
      }
      d = smin(d, ellipsoid(p, [0, 0.3, -0.006], [0.108, 0.062, 0.088]), 0.035);
      d = smin(d, ellipsoid(p, [0, 0.372, 0.01], [0.096, 0.086, 0.088]), 0.03);
      d = smin(d, capsule(p, [-0.1, 0.305, 0.0], [-0.142, 0.205, 0.058], 0.036, 0.03), 0.02);
      d = smin(d, sphere(p, [-0.143, 0.188, 0.072], 0.031), 0.012);
      d = smin(d, capsule(p, [0.1, 0.305, 0.0], [0.135, 0.225, 0.062], 0.036, 0.03), 0.02);
      d = smin(d, sphere(p, [0.135, 0.212, 0.08], 0.03), 0.012);
      d = smin(d, ellipsoid(p, [0, 0.075, -0.122], [0.05, 0.046, 0.062]), 0.03);
      return d + (fbm(p, 40) - 0.5) * 0.0025;
    },
    belly: (p) => Math.min(ellipsoid(p, [0, 0.168, 0.04], [0.122, 0.13, 0.102]), ellipsoid(p, [0, 0.344, 0.074], [0.052, 0.036, 0.036])),
    eye: (p) => Math.min(ellipsoid(p, [-0.038, 0.382, 0.082], [0.027, 0.024, 0.014]), ellipsoid(p, [0.038, 0.382, 0.082], [0.027, 0.024, 0.014])),
    dark: (p) => Math.min(sphere(p, [-0.035, 0.38, 0.094], 0.0115), sphere(p, [0.035, 0.38, 0.094], 0.0115), ellipsoid(p, [0, 0.353, 0.111], [0.019, 0.014, 0.012])),
    flask: (p) => {
      let d = ellipsoid(p, [-0.152, 0.1, 0.086], [0.05, 0.058, 0.05]);
      d = smin(d, capsule(p, [-0.152, 0.14, 0.086], [-0.15, 0.2, 0.08], 0.017, 0.014), 0.025);
      d = smin(d, ellipsoid(p, [-0.15, 0.208, 0.08], [0.022, 0.009, 0.022]), 0.006);
      return d;
    },
    ledger: (p) => rbox(p, [0.138, 0.152, 0.098], [0.046, 0.062, 0.011], 0.004, -0.25, -0.12),
    hat: (p) => {
      const l = hatLocal(p);
      const brim = ellipsoid(l, [0, 0, 0], [0.168, 0.011, 0.168]) + Math.sin(Math.atan2(l.z, l.x) * 70) * 0.0006;
      const crown = smax(ellipsoid(l, [0, 0.022, 0], [0.078, 0.06, 0.078]), -l.y, 0.004);
      return smin(brim, crown, 0.02);
    },
    base: (p) => { const r = Math.hypot(p.x, p.z + 0.01) - 0.145; const y = Math.abs(p.y - 0.012) - 0.012; return Math.min(Math.max(r, y), 0) + Math.hypot(Math.max(r + 0.006, 0), Math.max(y + 0.006, 0)) - 0.006; },
  };
  const names = Object.keys(G);
  const sdf = (p) => {
    let d = smin(G.body(p), G.belly(p), 0.02);
    d = smin(d, G.base(p), 0.015);
    d = Math.min(d, G.eye(p), G.dark(p));
    d = smin(d, G.flask(p), 0.006);
    d = smin(d, G.ledger(p), 0.008);
    return Math.min(d, G.hat(p));
  };
  const groupAt = (p) => { let best = 'body', bd = Infinity; for (const k of names) { const d = G[k](p) - (k === 'dark' || k === 'eye' ? 0.002 : 0); if (d < bd) { bd = d; best = k; } } return best; };
  const ROW = { body: 0, base: 0, belly: 1, hat: 2, eye: 3, dark: 4, flask: 5, ledger: 6 };
  const tone = (grp, p, n) => {
    const v = rowV(ROW[grp], H), f = fbm(p, 55);
    if (grp === 'body' || grp === 'base') {
      // dark iron glaze in the hollows, the warm rust-brown breaking through on the raised parts, runs down the sides
      const run = noise(p.x * 60, p.y * 7, p.z * 60);
      let t = 0.42 + n.y * 0.18 + (f - 0.5) * 0.5 + (run - 0.5) * 0.35 + (grp === 'base' ? -0.18 : 0);
      if (p.y < 0.03) t -= 0.12;
      return [clamp(t), v];
    }
    if (grp === 'belly') {
      const mouth = Math.abs(p.x) < 0.032 && p.y > 0.328 + 7 * p.x * p.x && p.y < 0.334 + 7 * p.x * p.x && p.z > 0.09;
      if (mouth) return [0.25, rowV(4, H)];
      return [clamp(0.62 + n.y * 0.2 + (f - 0.5) * 0.45 - (p.y < 0.07 ? 0.25 : 0)), v];
    }
    if (grp === 'hat') {
      const l = hatLocal(p), a = Math.atan2(l.z, l.x), r = Math.hypot(l.x, l.z);
      const weave = Math.sin(a * 90 + Math.sin(r * 160) * 1.5) * 0.18 + Math.sin(r * 420) * 0.08;
      return [clamp(0.55 + weave + (n.y < -0.2 ? -0.28 : 0.05) + (f - 0.5) * 0.3), v];
    }
    if (grp === 'ledger') {
      // the cover's printed face (front), otherwise the paper edges and the card back
      const L = { x: (p.x - 0.138) * Math.cos(-0.25) - (p.z - 0.098) * Math.sin(-0.25) };
      if (n.z > 0.55) return [(192 + Math.max(1, Math.min(63, (L.x / 0.092 + 0.5) * 64))) / W, (64 + Math.max(1, Math.min(63, (0.5 - (p.y - 0.152) / 0.124) * 64))) / H];
      return [clamp(0.75 + (f - 0.5) * 0.3), v];
    }
    if (grp === 'flask') return [clamp(p.y > 0.168 ? 0.9 : 0.35 + n.y * 0.2 + (f - 0.5) * 0.4), v];
    if (grp === 'eye') return [clamp(0.8 + n.z * 0.15), v];
    return [clamp(0.3 + n.y * 0.4), v];
  };
  const rows = [
    [[0, 0x1e130d], [0.35, 0x3e2416], [0.6, 0x6a3a20], [0.82, 0x8e5428], [1, 0xb4783e]], // iron-brown glaze
    [[0, 0x8a6a44], [0.5, 0xc9ae7c], [0.8, 0xe2cf9e], [1, 0xf0e4c0]], // the belly and muzzle (unglazed cream)
    [[0, 0x6a4e28], [0.45, 0xb08c50], [0.75, 0xd2b070], [1, 0xe8d090]], // the straw hat
    [[0, 0xa8a090], [1, 0xf4f0e4]], // the whites of the eyes
    [[0, 0x0a0706], [1, 0x34261e]], // pupils, nose, mouth
    [[0, 0x4a2a18], [0.4, 0x7a4a26], [0.7, 0xa47240], [1, 0xe8dcc4]], // the tokkuri (brown glaze, a pale neck)
    [[0, 0x8a7a5a], [1, 0xeee2c0]], // the ledger's paper
  ];
  const label = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#e8dcb8"/><rect x="2" y="2" width="60" height="60" fill="none" stroke="#6a4a30" stroke-width="2"/><text x="32" y="47" font-family="IPAGothic" font-size="40" text-anchor="middle" fill="#2a1c14">通</text><rect x="10" y="52" width="44" height="3" fill="#8a3a2a"/></svg>`)).ensureAlpha().raw().toBuffer();
  let g = polygonise(sdf, [-0.22, 0, -0.2], [0.22, 0.54, 0.22], 120);
  g = await decimate(g, 9000);
  const P = paint(g, groupAt, tone, (grp) => (grp === 'hat' ? 'straw' : 'glaze'));
  const tex = await sharp(Buffer.from(rampTexture(W, H, rows)), { raw: { width: W, height: H, channels: 4 } }).composite([{ input: label, raw: { width: 64, height: 64, channels: 4 }, left: 192, top: 64 }]).png({ palette: true, colours: 128, dither: 0 }).toBuffer();
  const parts = [{ name: 'glaze', geometry: P.glaze, rough: 0.32 }, { name: 'straw', geometry: P.straw, rough: 0.9 }];
  await writeGLB(resolve(ROOT, 'public/models/tanuki_shigaraki.glb'), parts, tex);
  console.log('tanuki', tris(parts), 'tris');
}

// ================================================================== the sandbox castle (1.04 x 0.3 x 0.8)
async function sandcastle() {
  const cx = -0.06, cz = 0.0;
  const towers = [0, 1, 2, 3].map((k) => { const a = Math.PI / 4 + k * Math.PI / 2; return [cx + Math.cos(a) * 0.15, cz + Math.sin(a) * 0.15]; });
  const crenels = (p, x, z, y, R, n, hw) => { let d = Infinity; for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2 + 0.3; d = Math.min(d, rbox(p, [x + Math.cos(a) * R, y, z + Math.sin(a) * R], [hw, 0.014, 0.011], 0.003, -a)); } return d; };
  const mould = (p, x, z, y1, r0, r1, ribs) => {
    let d = cone(p, x, z, 0.012, y1, r0, r1);
    for (const y of ribs) d = smax(d, -torus(p, [x, y, z], r0 + (r1 - r0) * ((y - 0.012) / (y1 - 0.012)), 0.0035), 0.002);
    return d;
  };
  const castle = (p) => {
    let d = mould(p, cx, cz, 0.135, 0.09, 0.072, [0.05, 0.095]);
    d = Math.min(d, crenels(p, cx, cz, 0.146, 0.058, 6, 0.017));
    for (const [x, z] of towers) { d = smin(d, mould(p, x, z, 0.092, 0.054, 0.043, [0.05]), 0.006); d = Math.min(d, crenels(p, x, z, 0.1, 0.034, 4, 0.012)); }
    for (let k = 0; k < 4; k++) {
      const [x0, z0] = towers[k], [x1, z1] = towers[(k + 1) % 4], mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, len = Math.hypot(x1 - x0, z1 - z0);
      let w = rbox(p, [mx, 0.04, mz], [len / 2, 0.034, 0.017], 0.008, -Math.atan2(z1 - z0, x1 - x0));
      if (k === 0) w = smax(w, -capsule(p, [mx, 0.0, mz], [mx, 0.035, mz], 0.022), 0.006); // the gate, facing +z
      d = smin(d, w, 0.012);
    }
    return d;
  };
  const ground = (p) => {
    let d = smax(ellipsoid(p, [cx, -0.03, cz], [0.36, 0.056, 0.32]), -p.y, 0.004);
    d = smax(d, -torus(p, [cx, 0.024, cz], 0.235, 0.032), 0.012); // the moat
    d = smin(d, torus(p, [cx, 0.016, cz], 0.3, 0.022 + (noise(p.x * 30, 0, p.z * 30) - 0.5) * 0.012), 0.02); // dug sand
    for (let k = 0; k < 7; k++) { const a = k * 2.4, r = 0.33 + (k % 3) * 0.03; d = smin(d, sphere(p, [cx + Math.cos(a) * r, 0.0, cz + Math.sin(a) * r], 0.018 + (k % 2) * 0.008), 0.012); }
    return d;
  };
  const sdf = (p) => smin(castle(p), ground(p), 0.015) + (fbm(p, 70) - 0.5) * 0.004 + (noise(p.x * 260, p.y * 260, p.z * 260) - 0.5) * 0.0014;
  const groupAt = () => 'sand';
  const tone = (grp, p, n) => {
    const f = fbm(p, 90), moat = Math.abs(Math.hypot(p.x - cx, p.z - cz) - 0.235) < 0.045 && p.y < 0.03;
    // moulded sand is damp (dark); the tops and the far ground have dried to a pale crust
    const dry = sstep(0.06, 0.13, p.y + (f - 0.5) * 0.06) * 0.8 + (n.y > 0.85 && p.y > 0.02 ? 0.25 : 0) + (Math.hypot(p.x - cx, p.z - cz) > 0.3 ? 0.6 : 0) + (noise(p.x * 25, 1, p.z * 25) - 0.5) * 0.4;
    const wet = moat || dry < 0.45;
    return [clamp(0.5 + (f - 0.5) * 0.9 + n.y * 0.12 - (moat ? 0.25 : 0)), rowV(wet ? 0 : 1, H)];
  };
  let g = polygonise(sdf, [cx - 0.38, 0, cz - 0.36], [cx + 0.38, 0.17, cz + 0.36], 150);
  g = await decimate(g, 7000);
  const P = paint(g, groupAt, tone, () => 'sand');
  // the plastic things: the orange bucket on its side, the blue spade, the lolly-stick flag
  const part = (geo, row, t = 0.6, shade = true) => {
    const ng = geo.index ? geo.toNonIndexed() : geo; ng.computeVertexNormals();
    const n = ng.attributes.position.count, uv = new Float32Array(n * 2), nr = ng.attributes.normal;
    for (let i = 0; i < n; i++) { uv[i * 2] = clamp(t + (shade ? nr.getY(i) * 0.18 : 0)); uv[i * 2 + 1] = rowV(row, H); }
    ng.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    for (const k of Object.keys(ng.attributes)) if (!['position', 'normal', 'uv'].includes(k)) ng.deleteAttribute(k);
    return ng;
  };
  const prof = [[0, 0.002], [0.066, 0.002], [0.07, 0.006], [0.088, 0.128], [0.096, 0.13], [0.097, 0.138], [0.091, 0.139], [0.085, 0.132], [0.067, 0.012], [0.0, 0.012]].map(([r, y]) => new THREE.Vector2(r, y));
  const bucket = new THREE.LatheGeometry(prof, 32);
  bucket.rotateZ(Math.PI / 2 - 0.08); bucket.rotateY(0.7); bucket.translate(0.36, 0.093, -0.17);
  const rim = new THREE.TorusGeometry(0.094, 0.004, 6, 32); rim.rotateY(Math.PI / 2); rim.rotateZ(-0.08); rim.rotateY(0.7); rim.translate(0.36 - Math.cos(0.7) * 0.134, 0.093 - 0.011, -0.17 + Math.sin(0.7) * 0.134);
  const handle = new THREE.TorusGeometry(0.094, 0.0028, 5, 24, Math.PI); handle.rotateZ(Math.PI / 2 + 0.25); handle.rotateY(0.7); handle.translate(0.36 - Math.cos(0.7) * 0.11, 0.093, -0.17 + Math.sin(0.7) * 0.11);
  const blade = new THREE.Shape(); blade.moveTo(-0.045, 0); blade.lineTo(0.045, 0); blade.quadraticCurveTo(0.05, 0.07, 0.03, 0.1); blade.quadraticCurveTo(0, 0.125, -0.03, 0.1); blade.quadraticCurveTo(-0.05, 0.07, -0.045, 0);
  const sp = new THREE.ExtrudeGeometry(blade, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 2, curveSegments: 10 });
  const sh = new THREE.CylinderGeometry(0.011, 0.012, 0.15, 12); sh.translate(0, -0.075, 0.002);
  const grip = new THREE.TorusGeometry(0.022, 0.006, 6, 16); grip.translate(0, -0.165, 0.002);
  let spade = mergeGeometries([sp.toNonIndexed(), sh.toNonIndexed(), grip.toNonIndexed()].map((x) => { x.deleteAttribute('uv'); return x; }));
  spade.rotateX(-Math.PI / 2 + 0.06); spade.rotateY(2.2); spade.translate(-0.43, 0.012, 0.17);
  const stick = new THREE.CylinderGeometry(0.0025, 0.0025, 0.13, 6); stick.translate(cx, 0.135 + 0.06, cz);
  const flag = new THREE.BoxGeometry(0.05, 0.032, 0.0012); flag.translate(cx + 0.026, 0.235, cz);
  const plastic = mergeGeometries([part(bucket, 2, 0.6), part(rim, 2, 0.7), part(handle, 2, 0.5), part(spade, 3, 0.55), part(stick, 4, 0.6, false), part(flag, 5, 0.6, false)]);
  plastic.setIndex([...Array(plastic.attributes.position.count).keys()]);
  const rows = [
    [[0, 0x5e4a32], [0.5, 0x86704c], [1, 0xa4895e]], // damp sand
    [[0, 0xa88e62], [0.5, 0xcdb487], [1, 0xe8d6ac]], // dry sand
    [[0, 0xa83218], [0.5, 0xe0582a], [1, 0xf8904a]], // the bucket
    [[0, 0x1a3c78], [0.5, 0x2e66b4], [1, 0x5a92d8]], // the spade
    [[0, 0xb89a68], [1, 0xe2cc98]], // the lolly stick
    [[0, 0xb02a24], [1, 0xe8483a]], // the paper flag
  ];
  const tex = await sharp(Buffer.from(rampTexture(W, H, rows)), { raw: { width: W, height: H, channels: 4 } }).png({ palette: true, colours: 96, dither: 0 }).toBuffer();
  const parts = [{ name: 'sand', geometry: P.sand, rough: 0.95 }, { name: 'plastic', geometry: plastic, rough: 0.45 }];
  await writeGLB(resolve(ROOT, 'public/models/sandcastle.glb'), parts, tex);
  console.log('sandcastle', tris(parts), 'tris');
}

if (!which.length || which.includes('tanuki')) await tanuki();
if (!which.length || which.includes('sandcastle')) await sandcastle();
void png;
