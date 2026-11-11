// Machine-top POP displays (店頭ディスプレイ): what real capsule machines carry on top to show the series' samples.
// Three styles, each sized to the machine's mount (src/gachakit/machine.js: the rails on the lid):
//   cube    アクリルケース   a clear acrylic case with chamfered edges on a black gloss plinth, four chrome cap screws in
//                            the lid, a two-step milk-acrylic stand inside, the series flyer on a printed backing board,
//                            a header strip clipped to the front edge of the lid
//   rack    ひな壇ラック     an open three-step rack: stair-cut side cheeks in the series colour, white steps with coloured
//                            nosings, a tall printed back board and a header board across its top
//   header  ヘッダーボード   a die-cut header board with an arched top on two chrome posts (the series logo big, the line-up
//                            under it), one long step in front with a clear acrylic guard
// Origin: the centre of the mount on the lid's top, +z toward the machine's front, metres. Printed matter is pixel art
// (nearest filtering): the series' own flyer (src/gfx/banner.js) and a per-series sheet painted here.
//   buildDisplay(style, series, { w, d }, thumbs) -> { group, slots: [{ x, y, z, maxH, cell }], height, dispose() }
import * as THREE from 'three';
import { Geo } from '../vehicles/geom.js';
import { GeoS, roundBox } from '../gachakit/geo.js';
import { Pix, FONT_EN } from '../gfx/pix.js';
import { SERIES_BY_ID } from '../data/series/index.js';
import { bannerTexture, BANNER_W, BANNER_H } from '../gfx/banner.js';

export const STYLES = {
  cube: { name: 'Acrylic display case', jp: 'アクリルケース', price: 1800, desc: 'A clear case with a two-step stand, the series flyer behind. Holds 4 to 6 figures.' },
  rack: { name: 'Tiered display rack', jp: 'ひな壇ラック', price: 1400, desc: 'An open three-step rack with a printed back board. Holds 6 to 9 figures.' },
  header: { name: 'Header board display', jp: 'ヘッダーボード', price: 900, desc: 'A big printed header with the series logo, one step of figures in front. Holds 3 to 4.' },
};
export const STYLE_IDS = Object.keys(STYLES);

const hex = (s, d) => parseInt(String(s || d).replace('#', ''), 16);
const mixc = (a, b, t) => { const f = (s) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t); return (f(16) << 16) | (f(8) << 8) | f(0); };
const flat = () => [0.5, 0.5];

// ------------------------------------------------------------------ shared materials
let M = null;
function mats() {
  if (M) return M;
  M = {
    acrylic: new THREE.MeshStandardMaterial({ color: 0xf2fbff, transparent: true, opacity: 0.16, roughness: 0.06, metalness: 0, envMapIntensity: 1.1, depthWrite: false, side: THREE.DoubleSide }),
    edge: new THREE.MeshStandardMaterial({ color: 0xcfeee6, transparent: true, opacity: 0.5, roughness: 0.08, metalness: 0, envMapIntensity: 1, depthWrite: false }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xd8dde2, roughness: 0.16, metalness: 1, envMapIntensity: 1.2 }),
    black: new THREE.MeshStandardMaterial({ color: 0x232126, roughness: 0.38, metalness: 0 }),
    milk: new THREE.MeshStandardMaterial({ color: 0xf6f5f0, roughness: 0.3, metalness: 0 }),
    white: new THREE.MeshStandardMaterial({ color: 0xfaf8f2, roughness: 0.62, metalness: 0 }),
  };
  for (const [k, m] of Object.entries(M)) m.name = 'pop-' + k;
  return M;
}
const accentMats = new Map();
function accentMat(c) {
  if (!accentMats.has(c)) { const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0 }); m.name = 'pop-paint'; accentMats.set(c, m); }
  return accentMats.get(c);
}

// ------------------------------------------------------------------ the per-series print sheet (512 x 512)
//   header (384 x 72): the strip over a case or a rack   board (384 x 264): the header style's big die-cut board
//   label (256 x 16): the plinth's front label           back (384 x 152): the backing board behind the flyer
const R = { header: [0, 0, 384, 72], board: [0, 76, 384, 264], label: [0, 344, 256, 16], back: [0, 364, 384, 148] };
const uvOf = ([x, y, w, h], S = 512) => [x / S, 1 - (y + h) / S, (x + w) / S, 1 - y / S];
const sheets = new Map();
function sheet(series, thumbs) {
  if (sheets.has(series)) return sheets.get(series);
  const p = new Pix(512, 512, 13), tex = p.texture();
  tex.anisotropy = 4;
  const out = { tex, mat: new THREE.MeshStandardMaterial({ map: tex, roughness: 0.58, metalness: 0 }) };
  out.mat.name = 'pop-print';
  const paint = () => { drawSheet(p, series, thumbs); p.flush(); tex.needsUpdate = true; };
  paint();
  const S = SERIES_BY_ID[series];
  try { document.fonts?.load('16px "DotGothic16"', (S?.jp || '') + '新発売全種回円ラインナップ見本カプセルトイ').then(paint, () => {}); } catch { /* no font loading */ }
  // the line-up shots come from the figure thumbnails (rendered a few a frame): paint again once they exist
  let tries = 0;
  const again = () => { if (++tries > 12) return; paint(); if (!out.shots) setTimeout(again, 1500); };
  setTimeout(again, 1200);
  out.paint = paint;
  sheets.set(series, out);
  return out;
}
function drawSheet(p, series, thumbs) {
  const S = SERIES_BY_ID[series] || { name: series, jp: 'カプセルトイ', price: 100, items: [], card: {} }, C = S.card || {};
  const bg = hex(C.bg, '#fff3e0'), ac = hex(C.accent, '#e5383b'), ac2 = hex(C.accent2, '#ffd23f'), ink = hex(C.text, '#3a2a30');
  const white = 0xfffdf6, red = 0xd8262e, paper = mixc(bg, white, 0.4);
  const items = S.items || [], shown = items.filter((i) => i.rarity !== 'secret'), n = shown.length + (items.some((i) => i.rarity === 'secret') ? 1 : 0);
  const title = S.jp || S.name;
  const fit = (str, sizes, maxW) => sizes.find((s) => p.measure(str, s) <= maxW) || sizes[sizes.length - 1];
  const burst = (cx, cy, r, c, c2) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const a = Math.atan2(y, x), d = Math.hypot(x, y), RR = r * (Math.cos(a * 8) > 0 ? 1 : 0.8); if (d <= RR) p.px(cx + x, cy + y, d > RR - 2 ? c2 : c); } };
  p.ctx.clearRect(0, 0, 512, 512); p.pull();
  // ---- header strip: the accent band, the title in big kana with a white outline, NEW burst, 全N種 and the price
  {
    const [X, Y, W, H] = R.header;
    p.rect(X, Y, W, H, ac); p.rect(X, Y, W, 4, mixc(ac, white, 0.3)); p.rect(X, Y + H - 6, W, 6, mixc(ac, 0x000000, 0.25));
    p.rect(X + 3, Y + 7, W - 6, 2, white); p.rect(X + 3, Y + H - 11, W - 6, 2, white);
    burst(X + 30, Y + 36, 24, ac2, red);
    p.text('新発売', X + 30, Y + 28, { size: 16, color: red, align: 'center' });
    const size = fit(title, [32, 16], 230);
    p.text(title, X + 196, Y + (size === 32 ? 18 : 26), { size, color: ink, outline: white, shadow: mixc(ac, 0x000000, 0.4), align: 'center' });
    p.rect(X + W - 70, Y + 14, 62, 22, white); p.frame(X + W - 70, Y + 14, 62, 22, ink);
    p.text(`全${n}種`, X + W - 39, Y + 17, { size: 16, color: red, align: 'center' });
    p.text(`1回¥${S.price || 100}`, X + W - 39, Y + 40, { size: 16, color: white, align: 'center' });
  }
  // ---- the big board: a band with the maker's line, the title, a sunburst, the line-up in numbered frames
  {
    const [X, Y, W, H] = R.board;
    p.rect(X, Y, W, H, paper);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const a = Math.atan2(y - 120, x - W / 2); if (Math.cos(a * 12) > 0.55) p.px(X + x, Y + y, mixc(paper, ac2, 0.35)); }
    p.rect(X, Y + H - 92, W, 92, mixc(bg, ac, 0.12));
    p.rect(X, Y + H - 94, W, 2, ac);
    p.rect(X + 8, Y + 44, W - 16, 2, ac);
    p.tinyText('CAPSULE TOY  SERIES', X + W / 2, Y + 50, { color: ink, align: 'center' });
    const size = fit(title, [48, 32, 16], W - 40);
    p.text(title, X + W / 2, Y + 64, { size, color: ink, outline: white, shadow: ac, align: 'center' });
    p.text(S.name || '', X + W / 2, Y + 64 + size + 6, { size: 16, color: ac, font: FONT_EN, align: 'center' });
    burst(X + W - 50, Y + 34, 28, ac2, red); p.text(`全${n}種`, X + W - 50, Y + 18, { size: 16, color: red, align: 'center' }); p.text(`¥${S.price || 100}`, X + W - 50, Y + 36, { size: 16, color: red, align: 'center' });
    // the line-up: up to five shots in white frames, numbered
    const row = shown.slice(0, 5), cw = Math.floor((W - 16) / Math.max(4, row.length)), sz = Math.min(64, cw - 8);
    let shots = 0;
    row.forEach((it, k) => {
      const cx = X + 8 + Math.round((W - 16 - cw * row.length) / 2) + k * cw + (cw >> 1), ty = Y + H - 84;
      p.rect(cx - (sz >> 1) - 2, ty - 2, sz + 4, sz + 4, ink); p.rect(cx - (sz >> 1), ty, sz, sz, white);
      let cv = null;
      try { cv = thumbs?.cache?.get(`${it.key}|normal|64|0`) || thumbs?.item?.(it.key, { size: 64 }); } catch { cv = null; }
      if (cv) { p.flush(); p.ctx.imageSmoothingEnabled = false; p.ctx.drawImage(cv, cx - (sz >> 1), ty, sz, sz); p.pull(); shots++; }
      p.circle(cx - (sz >> 1) + 5, ty + 5, 6, ac); p.tinyText(String(k + 1), cx - (sz >> 1) + 3, ty + 1, { color: white });
      p.tinyText(it.name.toUpperCase().slice(0, 10), cx, ty + sz + 4, { color: ink, align: 'center' });
    });
    if (row.length && shots === row.length) sheets.get(series) && (sheets.get(series).shots = true);
  }
  // ---- the plinth's label
  { const [X, Y, W, H] = R.label; p.rect(X, Y, W, H, 0x232126); p.tinyText(`${(S.name || '').toUpperCase().slice(0, 22)}  NOW ON SALE`, X + W / 2, Y + 4, { color: ac2, align: 'center' }); }
  // ---- the backing board behind the flyer: the series colour, a ruled frame, the corners cut in the accent
  {
    const [X, Y, W, H] = R.back;
    p.rect(X, Y, W, H, mixc(bg, ac, 0.18));
    p.frame(X + 4, Y + 4, W - 8, H - 8, white); p.frame(X + 6, Y + 6, W - 12, H - 12, ac);
    for (const [cx, cy, sx, sy] of [[X + 8, Y + 8, 1, 1], [X + W - 9, Y + 8, -1, 1], [X + 8, Y + H - 9, 1, -1], [X + W - 9, Y + H - 9, -1, -1]]) for (let k = 0; k < 14; k++) p.rect(sx > 0 ? cx : cx - (13 - k), cy + sy * k, 14 - k, 1, ac);
    p.tinyText('LINE-UP', X + 16, Y + H - 18, { color: ink });
    p.text('ラインナップ', X + W - 12, Y + H - 24, { size: 16, color: ink, align: 'right' });
  }
}

// ------------------------------------------------------------------ geometry helpers
/** A flat quad with explicit uvs (a print on a board), facing +z unless rotated by the caller. */
function printQuad(w, h, uv, mat) {
  const g = new THREE.PlaneGeometry(w, h);
  const [u0, v0, u1, v1] = uv, a = g.attributes.uv;
  a.setXY(0, u0, v1); a.setXY(1, u1, v1); a.setXY(2, u0, v0); a.setXY(3, u1, v0);
  const m = new THREE.Mesh(g, mat);
  m.receiveShadow = true;
  return m;
}
/** The flyer card itself (8:7) fitted into w x h, centred. */
function flyerCard(series, thumbs, w, h) {
  let cw = Math.min(w, h * BANNER_W / BANNER_H), ch = cw * BANNER_H / BANNER_W;
  if (ch > h) { ch = h; cw = ch * BANNER_W / BANNER_H; }
  const mat = new THREE.MeshStandardMaterial({ map: bannerTexture(series, thumbs), roughness: 0.6, metalness: 0 });
  mat.name = 'pop-flyer';
  const m = new THREE.Mesh(new THREE.PlaneGeometry(cw, ch), mat);
  m.receiveShadow = true;
  return { mesh: m, w: cw, h: ch };
}
function screwHeads(G, pts, r = 0.0042, up = [0, 1, 0]) {
  for (const [x, y, z] of pts) {
    const m = new THREE.Matrix4().makeTranslation(x, y, z);
    if (up[2]) m.multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2 * up[2]));
    G.push(m);
    G.revolve([[r, 0, 1], [r, r * 0.25, 1], [r * 0.82, r * 0.62], [r * 0.45, r * 0.85], [0, r * 0.9]], 16, { uv: flat });
    G.pop();
  }
}
/** The 12 edges of a box as thin strips (acrylic edges light up where they're cut). */
function edgeStrips(G, x0, y0, z0, x1, y1, z1, t = 0.0034) {
  const e = t / 2;
  for (const y of [y0, y1]) for (const z of [z0, z1]) G.box(x0 + e, y - e, z - e, x1 - e, y + e, z + e);
  for (const x of [x0, x1]) for (const z of [z0, z1]) G.box(x - e, y0 + e, z - e, x + e, y1 - e, z + e);
  for (const x of [x0, x1]) for (const y of [y0, y1]) G.box(x - e, y - e, z0 + e, x + e, y + e, z1 - e);
}
const meshOf = (G, mat, shadow = true) => { const g = G.build(); g.clearGroups(); const m = new THREE.Mesh(g, mat); m.castShadow = shadow; m.receiveShadow = true; return m; };

// ------------------------------------------------------------------ the three styles
export function buildDisplay(style, series, { w, d }, thumbs) {
  const S = SERIES_BY_ID[series] || {}, C = S.card || {};
  const ac = hex(C.accent, '#e5383b');
  const Mt = mats(), P = sheet(series, thumbs), uv = (n) => uvOf(R[n]);
  const group = new THREE.Group(), slots = [];
  const wide = w >= 0.3, n = wide ? 3 : 2;
  const row = (y, z, depth, maxH, count = n, inset = 0.012) => { const cell = (w - inset * 2) / count; for (let i = 0; i < count; i++) slots.push({ x: -w / 2 + inset + cell * (i + 0.5), y, z: z + (i % 2 ? -0.006 : 0.006), maxH, cell, depth, rot: -(i - (count - 1) / 2) * 0.22 }); };
  const disposables = [];
  let height = 0;

  if (style === 'cube') {
    const H = Math.min(0.21, Math.max(0.15, w * 0.6)), yb = 0.018, y1 = yb + H, t = 0.003, hd = d / 2, hw = w / 2;
    const B = new GeoS(1), A = new GeoS(1), E = new GeoS(1), K = new GeoS(1), Mk = new GeoS(1);
    // the plinth: black gloss, eased all round, a recess for the case to sit in
    roundBox(B, -hw - 0.004, 0, -hd - 0.004, hw + 0.004, yb, hd + 0.004, 0.006, flat, { ch: 0.0025 });
    // the case: five panes of 3 mm acrylic, their cut edges chamfered
    A.box(-hw, yb, hd - t, hw, y1, hd, { bevel: 0.0011 }); A.box(-hw, yb, -hd, hw, y1, -hd + t, { bevel: 0.0011 });
    A.box(-hw, yb, -hd + t, -hw + t, y1, hd - t, { bevel: 0.0011 }); A.box(hw - t, yb, -hd + t, hw, y1, hd - t, { bevel: 0.0011 });
    A.box(-hw - 0.001, y1, -hd - 0.001, hw + 0.001, y1 + t, hd + 0.001, { bevel: 0.0011 });
    edgeStrips(E, -hw, yb, -hd, hw, y1 + t, hd);
    // cap screws in the lid's corners, two on the plinth's front holding the case
    screwHeads(K, [[-hw + 0.009, y1 + t, -hd + 0.009], [hw - 0.009, y1 + t, -hd + 0.009], [-hw + 0.009, y1 + t, hd - 0.009], [hw - 0.009, y1 + t, hd - 0.009]], 0.0045);
    screwHeads(K, [[-hw + 0.014, yb / 2, hd + 0.004], [hw - 0.014, yb / 2, hd + 0.004]], 0.0032, [0, 0, 1]);
    // the two-step stand inside, milk acrylic with a coloured nosing on each step
    const s0 = yb + 0.014, s1 = yb + 0.056, zm = -0.004;
    Mk.box(-hw + t + 0.002, yb, zm, hw - t - 0.002, s0, hd - t - 0.006, { bevel: 0.0015 });
    Mk.box(-hw + t + 0.002, yb, -hd + t + 0.006, hw - t - 0.002, s1, zm, { bevel: 0.0015 });
    const Nz = new GeoS(1);
    Nz.box(-hw + t + 0.002, s0 - 0.003, hd - t - 0.008, hw - t - 0.002, s0 + 0.0004, hd - t - 0.005);
    Nz.box(-hw + t + 0.002, s1 - 0.003, zm - 0.002, hw - t - 0.002, s1 + 0.0004, zm + 0.001);
    group.add(meshOf(B, Mt.black), meshOf(Mk, Mt.milk), meshOf(Nz, accentMat(ac), false), meshOf(K, Mt.chrome, false));
    // the backing board and the flyer on it, just inside the back pane
    const bh = H - 0.008, back = printQuad(w - 0.01, bh, uv('back'), P.mat);
    back.position.set(0, yb + bh / 2 + 0.002, -hd + t + 0.0012);
    group.add(back);
    const fc = flyerCard(series, thumbs, w - 0.04, H - s1 + yb - 0.03);
    fc.mesh.position.set(0, y1 - 0.012 - fc.h / 2, -hd + t + 0.0022);
    group.add(fc.mesh); disposables.push(fc.mesh.material);
    // the plinth's front label
    const lab = printQuad(w - 0.03, 0.0094, uv('label'), P.mat);
    lab.position.set(0, yb * 0.55, hd + 0.0042);
    group.add(lab);
    // the header strip, clipped to the front edge of the lid, leaning back a touch
    const hh = Math.min(0.06, w * 0.19), hdr = new THREE.Group();
    const strip = printQuad(w + 0.004, hh, uv('header'), P.mat);
    strip.position.set(0, hh / 2, 0); strip.castShadow = true;
    const strip2 = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.004, hh), Mt.white); strip2.rotation.y = Math.PI; strip2.position.set(0, hh / 2, -0.0008);
    hdr.add(strip, strip2);
    const clips = new GeoS(1);
    for (const sx of [-1, 1]) clips.box(sx * (hw - 0.03) - 0.007, -0.002, -0.006, sx * (hw - 0.03) + 0.007, 0.012, 0.0022, { bevel: 0.0015 });
    hdr.add(meshOf(clips, Mt.chrome, false));
    hdr.position.set(0, y1 + t, hd - 0.012); hdr.rotation.x = -0.12;
    group.add(hdr);
    const ac1 = meshOf(A, Mt.acrylic, false), ed = meshOf(E, Mt.edge, false);
    ac1.renderOrder = 3; ed.renderOrder = 4;
    for (const m of [ac1, ed]) m.raycast = () => {};
    group.add(ac1, ed);
    row(s0, (zm + hd - t) / 2, hd - t - zm, H - (s0 - yb) - 0.012);
    row(s1, (-hd + t + zm) / 2, zm + hd - t, H - (s1 - yb) - 0.01);
    height = y1 + t + hh;
  } else if (style === 'rack') {
    const hw = w / 2, hd = d / 2, steps = [0.022, 0.058, 0.094], dep = (d - 0.012) / 3, th = 0.006;
    const B = new GeoS(1), Wt = new GeoS(1), Nz = new GeoS(1), K = new GeoS(1);
    roundBox(B, -hw - 0.003, 0, -hd - 0.003, hw + 0.003, 0.01, hd + 0.003, 0.004, flat, { ch: 0.002 });
    // the steps: white boards with a coloured nosing, a riser under each
    steps.forEach((h, k) => {
      const zf = hd - k * dep, zb = zf - dep;
      Wt.box(-hw + th, h - 0.006, zb, hw - th, h, zf, { bevel: 0.0012 });
      Wt.box(-hw + th, 0.01, zf - 0.004, hw - th, h - 0.006, zf - 0.001);
      Nz.box(-hw + th, h - 0.008, zf - 0.0005, hw - th, h + 0.0004, zf + 0.0015, { bevel: 0.0006 });
    });
    // the stair-cut cheeks, extruded with eased edges
    const shp = new THREE.Shape();
    const zs = [hd, ...steps.map((_, k) => hd - (k + 1) * dep)];
    shp.moveTo(hd, 0.01); steps.forEach((h, k) => { shp.lineTo(zs[k], h + 0.004); shp.lineTo(zs[k + 1] + 0.002, h + 0.004); });
    shp.lineTo(-hd, 0.15); shp.lineTo(-hd + 0.006, 0.15); shp.lineTo(-hd, 0.01);
    const cheek = new THREE.ExtrudeGeometry(shp, { depth: th - 0.002, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.001, bevelSegments: 1, curveSegments: 4 });
    cheek.rotateY(Math.PI / 2);
    const cheeks = [cheek.clone().translate(-hw + 0.001, 0, 0), cheek.translate(hw - th + 0.001, 0, 0)];
    const cm = new THREE.Mesh(mergeTwo(cheeks), accentMat(ac)); cm.castShadow = true; cm.receiveShadow = true;
    // the tall back board and the header board on top of it
    const bbH = 0.17, bz = -hd + 0.004;
    Wt.box(-hw, 0.01, bz - 0.004, hw, bbH, bz, { bevel: 0.0015 });
    screwHeads(K, [[-hw + 0.012, bbH - 0.012, bz + 0.0002], [hw - 0.012, bbH - 0.012, bz + 0.0002]], 0.003, [0, 0, 1]);
    group.add(meshOf(B, Mt.black), meshOf(Wt, Mt.white), meshOf(Nz, accentMat(ac), false), cm, meshOf(K, Mt.chrome, false));
    const back = printQuad(w - 0.006, bbH - 0.016, uv('back'), P.mat);
    back.position.set(0, 0.01 + (bbH - 0.016) / 2 + 0.002, bz + 0.0006);
    group.add(back);
    const fc = flyerCard(series, thumbs, w - 0.05, bbH - steps[2] - 0.02);
    fc.mesh.position.set(0, bbH - 0.01 - fc.h / 2, bz + 0.0014);
    group.add(fc.mesh); disposables.push(fc.mesh.material);
    const hh = Math.min(0.064, w * 0.2), hdr = printQuad(w + 0.016, hh, uv('header'), P.mat);
    hdr.position.set(0, bbH + hh / 2 - 0.004, bz + 0.0016); hdr.castShadow = true;
    const hdrBack = new THREE.Mesh(new THREE.BoxGeometry(w + 0.016, hh, 0.003), Mt.white); hdrBack.position.set(0, bbH + hh / 2 - 0.004, bz - 0.0002); hdrBack.castShadow = true;
    group.add(hdrBack, hdr);
    steps.forEach((h, k) => row(h, hd - k * dep - dep / 2, dep, 0.07 + k * 0.012, n));
    height = bbH + hh;
  } else {
    // header board
    const hw = w / 2, hd = d / 2, Hb = Math.min(0.24, Math.max(0.16, w * 0.68)), bz = -hd + 0.03, yb = 0.014;
    const B = new GeoS(1), Mk = new GeoS(1), A = new GeoS(1), K = new GeoS(1), E = new GeoS(1);
    roundBox(B, -hw - 0.003, 0, -hd - 0.003, hw + 0.003, yb, hd + 0.003, 0.005, flat, { ch: 0.0022 });
    // one long milk step and its clear guard
    const s0 = yb + 0.022;
    Mk.box(-hw + 0.004, yb, bz + 0.012, hw - 0.004, s0, hd - 0.006, { bevel: 0.0015 });
    A.box(-hw + 0.004, s0 - 0.006, hd - 0.006, hw - 0.004, s0 + 0.026, hd - 0.003, { bevel: 0.001 });
    edgeStrips(E, -hw + 0.004, s0 - 0.006, hd - 0.006, hw - 0.004, s0 + 0.026, hd - 0.003, 0.003);
    // two chrome posts behind the board, in round feet
    for (const sx of [-1, 1]) {
      K.cyl('y', [sx * (hw - 0.03), yb, bz - 0.006], 0.0032, Hb * 0.8, 16);
      K.push(new THREE.Matrix4().makeTranslation(sx * (hw - 0.03), yb, bz - 0.006));
      K.revolve([[0.009, 0, 1], [0.009, 0.003, 1], [0.006, 0.006], [0.0034, 0.008], [0, 0.008]], 16, { uv: flat });
      K.pop();
    }
    screwHeads(K, [[-hw + 0.012, yb / 2, hd + 0.003], [hw - 0.012, yb / 2, hd + 0.003]], 0.003, [0, 0, 1]);
    group.add(meshOf(B, Mt.black), meshOf(Mk, Mt.milk), meshOf(K, Mt.chrome, false));
    // the die-cut board: foam board with an arched top, the big print on its face
    const shp = new THREE.Shape(), rise = Hb * 0.16;
    shp.moveTo(-hw, 0); shp.lineTo(hw, 0); shp.lineTo(hw, Hb - rise);
    shp.absarc(0, Hb - rise - (hw * hw - rise * rise) / (2 * rise), (hw * hw + rise * rise) / (2 * rise), Math.atan2(rise + (hw * hw - rise * rise) / (2 * rise) - rise, hw), Math.PI - Math.atan2(rise + (hw * hw - rise * rise) / (2 * rise) - rise, hw), false);
    shp.lineTo(-hw, 0);
    const bg = new THREE.ExtrudeGeometry(shp, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.0008, bevelSize: 0.0008, bevelSegments: 1, curveSegments: 24 });
    const [u0, v0, u1, v1] = uv('board'), pos = bg.attributes.position, nor = bg.attributes.normal, uva = bg.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      if (Math.abs(nor.getZ(i)) > 0.9) uva.setXY(i, u0 + (u1 - u0) * (pos.getX(i) + hw) / w, v0 + (v1 - v0) * pos.getY(i) / Hb);
      else uva.setXY(i, u0 + 0.002, v1 - 0.002);
    }
    const board = new THREE.Mesh(bg, P.mat); board.castShadow = true; board.receiveShadow = true;
    board.position.set(0, yb + 0.004, bz);
    group.add(board);
    const ac1 = meshOf(A, Mt.acrylic, false), ed = meshOf(E, Mt.edge, false);
    ac1.renderOrder = 3; ed.renderOrder = 4;
    for (const m of [ac1, ed]) m.raycast = () => {};
    group.add(ac1, ed);
    row(s0, (bz + 0.012 + hd - 0.006) / 2 - 0.004, hd - 0.006 - bz - 0.012, Hb * 0.55, wide ? 4 : 3, 0.016);
    height = yb + Hb;
  }
  group.traverse((o) => { if (o.isMesh && o.castShadow === undefined) o.castShadow = true; });
  return { group, slots, height, dispose: () => { for (const m of disposables) m.dispose(); group.traverse((o) => { if (o.isMesh && o.geometry && !o.userData.shared) o.geometry.dispose(); }); } };
}

function mergeTwo(list) {
  const g = new THREE.BufferGeometry(), n = list.reduce((a, b) => a + b.attributes.position.count, 0);
  const idx = list.map((x) => x.index ? x.toNonIndexed() : x);
  for (const name of ['position', 'normal', 'uv']) {
    const sz = idx[0].attributes[name].itemSize, arr = new Float32Array(n * sz);
    let o = 0; for (const x of idx) { arr.set(x.attributes[name].array, o); o += x.attributes[name].array.length; }
    g.setAttribute(name, new THREE.BufferAttribute(arr, sz));
  }
  return g;
}

/** The riser a display stands on so the machine's own header in front hides none of it: a black gloss block on the
 *  mount, a chrome band round its top, the series' NOW ON SALE label on its face. Spans y -lift..0. */
export function buildRiser(series, { w, d }, lift, thumbs) {
  const g = new THREE.Group(), Mt = mats();
  if (lift <= 0.002) return g;
  const B = new GeoS(1), K = new GeoS(1), hw = w / 2 + 0.006, hd = d / 2 + 0.004;
  roundBox(B, -hw, -lift, -hd, hw, -0.004, hd, 0.006, flat, { ch: 0.002 });
  roundBox(K, -hw - 0.0008, -0.004, -hd - 0.0008, hw + 0.0008, 0, hd + 0.0008, 0.0066, flat, { ch: 0.001 });
  g.add(meshOf(B, Mt.black), meshOf(K, Mt.chrome, false));
  if (lift > 0.02) {
    const lab = printQuad(w - 0.02, Math.min(0.012, lift * 0.4), uvOf(R.label), sheet(series, thumbs).mat);
    lab.position.set(0, -lift / 2 - 0.002, hd + 0.0006);
    g.add(lab);
  }
  return g;
}

/** Repaint a series' print sheet (its thumbnails have arrived). */
export function repaintSheet(series) { sheets.get(series)?.paint?.(); }
export { Geo };
