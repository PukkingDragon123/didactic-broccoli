// Bakes the loading screen's pixel art (index.html #loading) into two small PNGs in public/img/ui/:
//   loading-van.png   Grandpa's van in side view, rendered headless from the real model (game.life.van, through the
//                     game's own renderer, so it wears the game's cel shading and ink), cut out, pixelled down to
//                     96 x 60 texels a frame at 24 texels a metre and reduced to a small palette: 8 frames of the
//                     wheels going round with the body bobbing on its springs, and under them 6 frames of a puff of
//                     exhaust (hand-pixelled: particles are 2D sprites)
//   loading-lane.png  the lane it drives through, painted here texel by texel as tiling rows 480 wide (the far
//                     skyline, the houses' silhouettes, the block wall with the poles and wires, the road), and the
//                     signs: a station-style name board (よみこみちゅう, the line the van runs along), the paper tag
//                     (読み込み中…), the odometer's frame and the 5x7 digits. No trees.
// The rows' places in the sheet are the LANE table below; index.html's inline CSS uses the same numbers.
// Usage: node tools/bake-loading.mjs [--lane | --van]     (the van needs the whole game: a few minutes headless;
//        on a shared machine: tools/slot.sh node tools/bake-loading.mjs)
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const only = process.argv.includes('--lane') ? 'lane' : process.argv.includes('--van') ? 'van' : 'both';
let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = createRequire('/opt/node-tools/node_modules/')('playwright')); }
const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'public/img/ui');
mkdirSync(out, { recursive: true });
const server = await createServer({ root, configFile: resolve(root, 'vite.config.js'), server: { port: 0, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] } }, logLevel: 'error' });
await server.listen();
const base = `http://127.0.0.1:${server.httpServer.address().port}/`;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const save = (name, url) => { const b = Buffer.from(url.split(',')[1], 'base64'); writeFileSync(resolve(out, name), b); console.log('wrote', `public/img/ui/${name}`, `${b.length} bytes`); };

// ------------------------------------------------------------------ the lane (painted in the page: it needs the fonts)
/* eslint-disable no-undef */
async function paintLane() {
  const { mask5, textW5 } = await import('/src/gfx/font5x7.js');
  await import('/node_modules/@fontsource/dotgothic16/400.css');
  await document.fonts.load('16px "DotGothic16"', 'よみこみちゅう読み込み中…杜王町');
  const T = 480, LANE = { skyline: [0, 96], far: [96, 176], near: [272, 212], road: [484, 40], misc: [524, 64] };
  const c = document.createElement('canvas');
  c.width = T; c.height = 588;
  const g = c.getContext('2d', { willReadFrequently: true });
  let seed = 1999;
  const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  /** A rect in a tiling row (wraps round the tile's ends). */
  const W = (x, y, w, h, col) => { x = ((Math.round(x) % T) + T) % T; R(x, y, w, h, col); if (x + w > T) R(x - T, y, w, h, col); };
  /** A stepped gable: apex at (cx, y), `h` rows, each `k` texels wider a side. */
  const gable = (cx, y, h, k, col, y0 = 0) => { for (let i = y0; i < h; i++) W(cx - (i + 1) * k, y + i, (i + 1) * k * 2, 1, col); };
  const text5 = (str, x, y, col, s = 1) => { g.fillStyle = col; for (const [i, j] of mask5(str)) g.fillRect(x + i * s, y + j * s, s, s); };
  /** DotGothic16 at its native 16 px as hard texels (thresholded). */
  const kana = (str, x, y, col) => {
    const t = document.createElement('canvas'); t.width = str.length * 16 + 4; t.height = 20;
    const tg = t.getContext('2d', { willReadFrequently: true });
    tg.font = '16px "DotGothic16"'; tg.textBaseline = 'top'; tg.fillStyle = '#000'; tg.fillText(str, 0, 1);
    const d = tg.getImageData(0, 0, t.width, t.height).data;
    g.fillStyle = col;
    for (let j = 0; j < t.height; j++) for (let i = 0; i < t.width; i++) if (d[(j * t.width + i) * 4 + 3] > 110) g.fillRect(x + i, y + j, 1, 1);
    return str.length * 16;
  };

  // ---- 1. the far skyline: flats, a gas holder, a bathhouse chimney, a pylon and its wires (one tone off the sky)
  {
    const [y0, H] = LANE.skyline, B = y0 + H, C = '#4b3c74', C2 = '#5a4a84';
    W(0, B - 14, T, 14, C);
    for (const [x, w, h] of [[10, 46, 40], [60, 30, 58], [96, 64, 30], [186, 38, 48], [230, 70, 26], [318, 34, 64], [356, 52, 36], [424, 44, 46]]) {
      W(x, B - h, w, h, C);
      W(x, B - h, w, 1, C2);
      if (h > 44) { W(x + 6, B - h - 6, 8, 6, C); W(x + w - 12, B - h - 10, 1, 10, C); } // a lift house, an aerial
      for (let j = B - h + 5; j < B - 16; j += 7) for (let i = x + 4; i < x + w - 4; i += 6) if (rnd() < 0.3) W(i, j, 2, 2, '#e8b070');
    }
    for (let i = 0; i < 26; i++) { const o = Math.round(((i - 13) / 13) ** 2 * 6); W(150 + i, B - 44 + o, 1, 44 - o, C); } // the gas holder's dome
    W(149, B - 40, 28, 1, C2);
    W(300, B - 86, 5, 86, C); W(299, B - 86, 7, 2, C2); W(300, B - 72, 5, 2, '#b0647f'); // the bathhouse chimney, its band
    // a pylon: two legs closing to the top, cross arms, the wires running off both ways
    for (let j = 0; j < 80; j++) { const s = Math.round(9 * (j / 80)); W(404 - s, B - 80 + j, 1, 1, C); W(404 + s, B - 80 + j, 1, 1, C); if (j % 10 === 0) W(404 - s, B - 80 + j, s * 2, 1, C); }
    for (const [ay, aw] of [[76, 14], [64, 18], [52, 12]]) W(404 - aw, B - ay, aw * 2, 1, C);
    for (const ay of [76, 64]) for (let x = 0; x < T; x++) { const u = x / T; W(404 + x, B - ay + Math.round(22 * 4 * u * (1 - u)), 1, 1, C); }
  }

  // ---- 2. the houses over the wall: tiled gables and flat roofs, aerials, a water tank, lit windows
  {
    const [y0, H] = LANE.far, B = y0 + H, C = '#2c2a54', C2 = '#3c3a6c', C3 = '#232146', LIT = '#f4c668', LIT2 = '#e8964e', DIM = '#454276';
    const win = (x, y, w, h, on) => { W(x, y, w, h, on ? (rnd() < 0.3 ? LIT2 : LIT) : DIM); W(x + (w >> 1), y, 1, h, C3); if (h > 6) W(x, y + (h >> 1), w, 1, C3); };
    const aerial = (x, y) => { W(x, y - 22, 1, 22, C3); for (const [dy, w] of [[-22, 9], [-18, 7], [-14, 5]]) W(x - (w >> 1), y + dy, w, 1, C3); };
    // [x, width, wall height, kind]
    for (const [x, w, wh, kind] of [[-6, 84, 74, 'side'], [82, 58, 118, 'flat'], [146, 76, 66, 'front'], [226, 64, 84, 'side'], [294, 44, 132, 'flat'], [342, 74, 60, 'side'], [420, 58, 92, 'front']]) {
      const top = B - wh;
      W(x, top, w, wh, C);
      W(x + w - 3, top, 3, wh, C3); // the side in shade
      if (kind === 'side') { // eaves along the lane: a band of tiles, ridge on top, the eaves' shadow under it
        for (let i = 0; i < 16; i++) W(x - 5 + (i < 4 ? 4 - i : 0), top - 16 + i, w + 10 - (i < 4 ? 8 - i * 2 : 0), 1, i % 4 === 3 ? C3 : C2);
        W(x + 2, top - 18, w - 4, 2, C3); W(x - 5, top, w + 10, 2, C3);
        aerial(x + w - 12, top - 18);
      } else if (kind === 'front') { // the gable to the lane
        gable(x + (w >> 1), top - 22, 22, (w + 10) / 44, C2); gable(x + (w >> 1), top - 19, 19, (w + 4) / 44, C, 2);
        W(x - 5, top, w + 10, 2, C3);
        win(x + (w >> 1) - 4, top - 10, 8, 6, rnd() < 0.5);
      } else { // a flat-roofed block: parapet, a water tank on legs, balconies
        W(x - 1, top - 3, w + 2, 3, C2);
        W(x + 8, top - 15, 14, 9, C2); W(x + 9, top - 6, 1, 3, C3); W(x + 20, top - 6, 1, 3, C3);
        aerial(x + w - 8, top - 3);
        for (let j = top + 20; j < B - 20; j += 24) W(x, j, w - 3, 2, C3);
      }
      // windows, two or more storeys; most are lit at this hour
      for (let j = top + 8; j < B - 26; j += 24) for (let i = x + 8; i < x + w - 16; i += 20) win(i, j, 11, 12, rnd() < 0.62);
    }
    W(0, B - 6, T, 6, C3);
  }

  // ---- 3. the lane's far side: the block wall, a gate, a drinks machine, a post box, a notice; the pole and the wires
  {
    const [y0, H] = LANE.near, B = y0 + H, top = B - 36;
    const WALL = '#48456f', HI = '#5d5a8a', LO = '#353359', CAP = '#67649a', INK = '#16152b', POLE = '#1b1a32', POLE2 = '#2d2b4d';
    W(0, top, T, 36, WALL);
    W(0, top, T, 3, CAP); W(0, top + 3, T, 1, LO);
    for (let r = 0; r < 5; r++) { // courses of blocks, the joints staggered
      const y = top + 4 + r * 6 + 5;
      W(0, y, T, 1, LO);
      for (let x = (r % 2) * 6; x < T; x += 12) W(x, y - 5, 1, 5, LO);
    }
    for (const x of [36, 48, 60, 252, 264, 276, 288, 396]) { // pierced blocks: a little cross of holes
      const y = top + 10;
      W(x + 1, y, 11, 5, HI); W(x + 5, y, 3, 5, INK); W(x + 2, y + 2, 9, 1, INK);
    }
    for (const x of [18, 97, 131, 222, 305, 371, 444, 470]) for (let j = 0; j < 4 + Math.floor(rnd() * 9); j++) W(x, top + 4 + j, 1, 1, LO); // rain streaks under the cap
    W(0, B - 2, T, 2, LO);
    // the gate: two posts with caps, a name plate, a low barred gate, dark beyond
    W(152, top - 4, 44, 40, INK);
    for (const x of [146, 194]) { W(x, top - 6, 8, 42, WALL); W(x - 1, top - 8, 10, 3, CAP); W(x + 7, top - 5, 1, 41, LO); }
    W(148, top + 6, 4, 6, '#e8dcc0'); W(149, top + 8, 2, 1, INK);
    for (let x = 156; x < 194; x += 4) W(x, top + 10, 1, 24, POLE2);
    W(154, top + 10, 40, 1, POLE2); W(154, top + 22, 40, 1, POLE2);
    // a notice board on the wall
    W(100, top + 8, 20, 16, '#3a2a30'); W(101, top + 9, 18, 14, '#d8ccb0'); W(103, top + 11, 9, 2, '#b23a3a'); for (const j of [15, 17, 19]) W(103, top + j, 14, 1, '#6a6078');
    // the drinks machine: lit from inside (hard texels of light, no glow)
    {
      const x = 330, y = B - 42;
      W(x, y, 24, 42, '#c9c4d4'); W(x + 23, y, 1, 42, '#8c88a4'); W(x, y, 24, 2, '#b23a4a'); W(x, y + 40, 24, 2, INK);
      W(x + 2, y + 4, 20, 18, '#fff3c8');
      for (let j = 0; j < 3; j++) for (let i = 0; i < 6; i++) W(x + 3 + i * 3, y + 6 + j * 6, 2, 4, ['#d8483e', '#2f6fb8', '#e8a828', '#3a8a58', '#e8e0d0', '#7a3a8a'][(i + j * 2) % 6]);
      W(x + 2, y + 24, 14, 3, '#5a566e'); W(x + 18, y + 24, 3, 5, '#2a2840'); W(x + 4, y + 32, 16, 5, '#2a2840');
      W(x - 1, B - 1, 26, 1, INK);
    }
    // the round post box
    { const x = 426, y = B - 30; W(x + 1, y, 10, 30, '#b8343a'); W(x, y + 2, 12, 5, '#b8343a'); W(x + 2, y - 2, 8, 2, '#8c2630'); W(x + 9, y + 2, 2, 28, '#8c2630'); W(x + 3, y + 9, 6, 1, INK); W(x + 3, y + 14, 5, 4, '#e8dcc0'); W(x, y + 27, 12, 3, '#3a3348'); }
    // the pole: crossarms and insulators, a transformer, a lamp on its bracket, step bolts, the hazard band, a block plate
    {
      const x = 93, y = y0 + 6;
      W(x, y, 7, H - 6, POLE); W(x + 5, y, 2, H - 6, POLE2); W(x - 1, y - 2, 9, 2, POLE2);
      W(x - 21, y + 8, 49, 3, POLE); for (const i of [-20, -10, 10, 24]) W(x + i, y + 5, 2, 3, POLE2);
      W(x - 15, y + 24, 37, 3, POLE); for (const i of [-14, 18]) W(x + i, y + 21, 2, 3, POLE2);
      W(x + 8, y + 40, 16, 24, POLE2); W(x + 8, y + 40, 16, 2, POLE); W(x + 8, y + 50, 16, 1, POLE); W(x + 8, y + 62, 16, 2, POLE); W(x + 12, y + 36, 2, 4, POLE); W(x + 18, y + 36, 2, 4, POLE);
      W(x - 9, y + 90, 9, 2, POLE); W(x - 9, y + 98, 9, 2, POLE);
      W(x + 7, y + 106, 22, 2, POLE); W(x + 24, y + 108, 10, 4, POLE2); W(x + 25, y + 112, 8, 1, '#ffe9a8'); W(x + 26, y + 113, 6, 1, '#f6c86a');
      for (let j = y + 76; j < B - 46; j += 12) W(x + ((j / 12) % 2 ? -3 : 7), j, 3, 1, POLE2);
      for (let j = 0; j < 28; j++) for (let i = 0; i < 7; i++) W(x + i, B - 44 + j, 1, 1, ((i + j) >> 2) % 2 ? '#d8a82c' : INK);
      W(x - 1, B - 62, 9, 12, '#2f5a9a'); W(x + 1, B - 60, 5, 1, '#e8e4d8'); W(x + 1, B - 57, 5, 1, '#e8e4d8'); W(x + 1, B - 54, 3, 1, '#e8e4d8');
      // the wires, pole to pole (the tile wraps): power on the arms, the fat telephone cables lower down
      for (const [wy, sag, th] of [[y + 4, 15, 1], [y + 6, 19, 1], [y + 20, 13, 1], [y + 22, 17, 1], [y + 90, 22, 2], [y + 98, 26, 1]]) {
        for (let i = 0; i < T; i++) { const u = i / T; W(x + 3 + i, wy + Math.round(sag * 4 * u * (1 - u)), 1, th, POLE); }
      }
    }
  }

  // ---- 4. the road: kerb, asphalt with a scatter of wear, the centre dashes, a drain grate and a manhole
  {
    const [y0, H] = LANE.road;
    W(0, y0, T, H, '#2b2947');
    W(0, y0, T, 2, '#5d5a8a'); W(0, y0 + 2, T, 2, '#3a3862');
    for (let i = 0; i < 260; i++) W(Math.floor(rnd() * T), y0 + 5 + Math.floor(rnd() * (H - 6)), rnd() < 0.3 ? 2 : 1, 1, rnd() < 0.5 ? '#333150' : '#25233f');
    for (let x = 0; x < T; x += 48) W(x, y0 + 30, 26, 2, '#8d8ab0');
    W(204, y0 + 6, 16, 5, '#1c1b34'); for (let i = 0; i < 5; i++) W(206 + i * 3, y0 + 7, 1, 3, '#45426c');
    for (let i = 0; i < 18; i++) { const hh = [1, 3, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 1][i]; W(360 + i, y0 + 16 - (hh >> 1), 1, hh, '#3d3b62'); }
    W(363, y0 + 16, 12, 1, '#25233f');
  }

  // ---- 5. the signs
  {
    const [y0] = LANE.misc, INK = '#1a1420', CREAM = '#f4eede', NAVY = '#1f2a52', RED = '#c8322c', INK2 = '#5e5046';
    // (a) the station-style name board, 168 x 60: よみこみちゅう, LOADING, the line (the van's marker rides it), the stops
    {
      const x = 0, y = y0, w = 168, h = 60;
      R(x + 1, y, w - 2, h, INK); R(x, y + 1, w, h - 2, INK);
      R(x + 1, y + 1, w - 2, h - 2, CREAM);
      R(x + 1, y + 1, w - 2, 3, NAVY);
      R(x + 1, y + h - 3, w - 2, 2, '#d8cfb8');
      const kw = 7 * 16; kana('よみこみちゅう', x + ((w - kw) >> 1), y + 5, NAVY);
      const l = 'LOADING'; g.fillStyle = INK2; let lx = x + ((w - (textW5(l) + 6 * 3)) >> 1); for (const ch of l) { text5(ch, lx, y + 24, INK2); lx += textW5(ch) + 4; }
      R(x + 10, y + 36, w - 20, 6, RED); R(x + 10, y + 38, w - 20, 2, '#e8dcc0'); // the line: red, a pale stripe down it
      R(x + 8, y + 34, 10, 10, INK); R(x + 10, y + 36, 6, 6, CREAM); // the stop you left
      R(x + w - 18, y + 34, 10, 10, INK); R(x + w - 16, y + 36, 6, 6, RED); // 杜王町: where you're going
      text5('KAIDO', x + 8, y + 48, INK2); R(x + 8 + textW5('KAID') + 2, y + 46, 3, 1, INK2); // (Kaidō, the highway)
      const r = 'MORIO-CHO', rx = x + w - 8 - textW5(r); text5(r, rx, y + 48, INK); R(rx + textW5('MORI') + 2, y + 46, 3, 1, INK); R(rx + textW5('MORIO-CH') + 2, y + 46, 3, 1, INK);
      R(rx - 11, y + 51, 6, 1, RED); R(rx - 6, y + 49, 1, 5, RED); R(rx - 5, y + 50, 1, 3, RED); R(rx - 4, y + 51, 1, 1, RED); // a little arrow
    }
    // (b) the paper tag, 140 x 26: manila, a punched hole, 読み込み中…, room on the right for "100%"
    {
      const x = 172, y = y0, w = 140, h = 26, cut = 6;
      const inside = (i, j) => i >= cut - j && i >= cut - (h - 1 - j) && i < w && j >= 0 && j < h;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        if (!inside(i, j)) continue;
        const rim = !inside(i - 1, j) || !inside(i + 1, j) || !inside(i, j - 1) || !inside(i, j + 1) || i === w - 1;
        const k = [0.97, 1, 1, 1, 1.02][Math.floor(rnd() * 5)];
        g.fillStyle = rim ? '#5c4026' : `rgb(${Math.round(226 * k)},${Math.round(200 * k)},${Math.round(140 * k)})`;
        g.fillRect(x + i, y + j, 1, 1);
      }
      for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) { const d = Math.hypot(i, j); if (d <= 1.5) g.clearRect(x + 7 + i, y + 13 + j, 1, 1); else if (d <= 3.2) R(x + 7 + i, y + 13 + j, 1, 1, '#f2e0b2'); }
      kana('読み込み中', x + 14, y + 4, INK); for (const i of [0, 4, 8]) R(x + 96 + i, y + 17, 2, 2, INK);
    }
    // (c) the odometer's frame, 62 x 17: five drums, the last (tenths) white with red figures, "KM"
    {
      const x = 316, y = y0, INKB = '#0e0c14';
      R(x, y, 62, 17, INKB); R(x + 1, y + 1, 60, 15, '#2a2630');
      for (let i = 0; i < 5; i++) R(x + 3 + i * 9, y + 3, 8, 11, i === 4 ? '#e8e4d8' : '#0e0c14');
      text5('KM', x + 49, y + 5, '#c8c0b0');
    }
    // (d) the 5x7 figures, 6 texels apart: white (the drums), red (the tenths), ink (the tag), then % in ink; a blank
    //     cell after each run of ten
    '0123456789'.split('').forEach((d, i) => { text5(d, 172 + i * 6, y0 + 30, '#f4eede'); text5(d, 172 + i * 6, y0 + 40, RED); text5(d, 172 + i * 6, y0 + 50, INK); });
    text5('%', 172 + 11 * 6, y0 + 50, INK);
    // (e) the van's marker on the line, 13 x 9: a tiny van in ink and mint
    {
      const x = 260, y = y0 + 30, M = '#bfe0cf';
      R(x + 1, y, 10, 1, INK); R(x, y + 1, 12, 6, INK); R(x + 12, y + 3, 1, 4, INK);
      R(x + 1, y + 1, 10, 5, M); R(x + 8, y + 2, 3, 2, '#3a4a6a'); R(x + 2, y + 2, 4, 2, '#3a4a6a'); R(x + 11, y + 4, 1, 2, M);
      R(x + 2, y + 6, 3, 3, INK); R(x + 8, y + 6, 3, 3, INK); R(x + 3, y + 7, 1, 1, '#c8c0b0'); R(x + 9, y + 7, 1, 1, '#c8c0b0');
    }
  }
  return c.toDataURL('image/png');
}

// ------------------------------------------------------------------ the van (rendered by the game, pixelled in the page)
async function bakeVan() {
  const g = window.__game, van = g.life.van, scene = g.scene, cam = g.camera, R = g.renderer;
  const FW = 96, FH = 60, N = 8, PPM = 24, SS = 10; // frame (texels), frames, texels a metre, supersampling
  g.update = () => {}; g.render = () => {}; // (hold the live loop)
  window.dbg?.time?.(15.5);
  for (let i = 0; i < 3; i++) g.lighting?.update?.(0.016, g.time);
  // only the van, lit by the sun and the sky
  let sun = null;
  scene.traverse((o) => { if (!sun && o.isDirectionalLight && o.castShadow) sun = o; });
  for (const o of scene.children) { let mesh = false; o.traverse((q) => { if (q.isMesh || q.isSprite || q.isPoints || q.isLine) mesh = true; }); if (mesh && o !== van.root) o.visible = false; }
  van.root.visible = true;
  scene.fog = null;
  const u = R.grade?.uniforms;
  if (u) { if (u.uVignette) u.uVignette.value = 0; if (u.uGrain) u.uGrain.value = 0; if (u.uAberration) u.uAberration.value = 0; }
  if (R.bloom) R.bloom.strength = 0;
  // side on, the driver's side to the sun and to a long lens (as good as orthographic): the nose points screen-right
  const s = sun ? sun.position.clone().sub(sun.target.position).setY(0).normalize() : { x: 0, z: 1 };
  const P = { x: 3.4, z: 12.5 };
  van.setPose(P.x, P.z, Math.atan2(s.z, -s.x));
  van.setDoor(0); van.setLights(true); van.setBrake(false); van.steer(0);
  if (van.cab?.key) van.cab.key.visible = false;
  const DIST = 70, CY = (FH / 2 - 5) / PPM; // the wheels' contact line sits 5 texels above the frame's foot
  cam.position.set(P.x + s.x * DIST, CY, P.z + s.z * DIST);
  cam.lookAt(P.x, CY, P.z);
  cam.fov = 2 * Math.atan((FH / PPM / 2) / DIST) * 180 / Math.PI;
  cam.near = 20; cam.far = 200; cam.aspect = innerWidth / innerHeight;
  cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  const cv = R.renderer.domElement, W = FW * SS, H = FH * SS;
  const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H;
  const tg = tmp.getContext('2d', { willReadFrequently: true });
  const shot = async (bg) => {
    scene.background = van.bodyMesh.material.color.clone().setHex(bg);
    for (let i = 0; i < 2; i++) { R.render(0, g.time); await new Promise((r) => requestAnimationFrame(r)); }
    R.render(0, g.time);
    tg.clearRect(0, 0, W, H); tg.drawImage(cv, 0, 0, W, H);
    return tg.getImageData(0, 0, W, H).data;
  };
  const frames = [];
  for (let f = 0; f < N; f++) {
    for (const w of van.wheels) w.rotation.x = (f / N) * Math.PI * 2;
    van.lean(0, 0, [0, 0, 1, 1, 0, 0, -1, 0][f] / PPM); // a texel up, a texel down: the body on its springs
    scene.updateMatrixWorld(true);
    const a = await shot(0x000000), b = await shot(0x777777);
    // matte from the two backgrounds, then one colour per texel: the commonest of its samples
    const px = new Uint8ClampedArray(FW * FH * 4);
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
      const votes = new Map(); let solid = 0;
      for (let j = 0; j < SS; j++) for (let i = 0; i < SS; i++) {
        const k = ((y * SS + j) * W + x * SS + i) * 4;
        const d = Math.max(Math.abs(b[k] - a[k]), Math.abs(b[k + 1] - a[k + 1]), Math.abs(b[k + 2] - a[k + 2]));
        if (d > 0x77 * 0.78) continue; // the background shows through
        solid++;
        const key = (a[k] >> 4) << 8 | (a[k + 1] >> 4) << 4 | (a[k + 2] >> 4);
        const v = votes.get(key) || [0, 0, 0, 0]; v[0]++; v[1] += a[k]; v[2] += a[k + 1]; v[3] += a[k + 2]; votes.set(key, v);
      }
      if (solid < SS * SS * 0.45) continue;
      let best = null; for (const v of votes.values()) if (!best || v[0] > best[0]) best = v;
      const o = (y * FW + x) * 4;
      px[o] = best[1] / best[0]; px[o + 1] = best[2] / best[0]; px[o + 2] = best[3] / best[0]; px[o + 3] = 255;
    }
    frames.push(px);
  }
  // one small palette for all the frames: the commonest colours, near ones folded together
  const pop = new Map();
  for (const px of frames) for (let o = 0; o < px.length; o += 4) if (px[o + 3]) { const key = (px[o] >> 3) << 10 | (px[o + 1] >> 3) << 5 | (px[o + 2] >> 3); const v = pop.get(key) || [0, 0, 0, 0]; v[0]++; v[1] += px[o]; v[2] += px[o + 1]; v[3] += px[o + 2]; pop.set(key, v); }
  const pal = [];
  for (const v of [...pop.values()].sort((p, q) => q[0] - p[0])) {
    const col = [v[1] / v[0], v[2] / v[0], v[3] / v[0]];
    if (pal.length < 30 && !pal.some((p) => Math.abs(p[0] - col[0]) + Math.abs(p[1] - col[1]) + Math.abs(p[2] - col[2]) < 30)) pal.push(col.map(Math.round));
  }
  const near = (r, gg, b) => { let best = pal[0], bd = 1e9; for (const p of pal) { const d = (p[0] - r) ** 2 + (p[1] - gg) ** 2 + (p[2] - b) ** 2; if (d < bd) { bd = d; best = p; } } return best; };
  const sheet = document.createElement('canvas'); sheet.width = FW * N; sheet.height = FH + 16;
  const sg = sheet.getContext('2d');
  const INK = [26, 20, 32];
  frames.forEach((px, f) => {
    const img = sg.createImageData(FW, FH), d = img.data, at = (x, y) => x >= 0 && y >= 0 && x < FW && y < FH && px[(y * FW + x) * 4 + 3] > 0;
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
      const o = (y * FW + x) * 4;
      if (at(x, y)) { const p = near(px[o], px[o + 1], px[o + 2]); d[o] = p[0]; d[o + 1] = p[1]; d[o + 2] = p[2]; d[o + 3] = 255; }
      else if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) { d[o] = INK[0]; d[o + 1] = INK[1]; d[o + 2] = INK[2]; d[o + 3] = 255; } // the sprite's ink rim
      else if (y >= FH - 6 && y <= FH - 4) { // its shadow on the road: a flat dark strip under the body
        let over = false; for (let j = 0; j < y; j++) if (at(x, j)) { over = true; break; }
        if (over || at(x - 2, y - 8) || at(x + 2, y - 8)) { d[o] = 14; d[o + 1] = 12; d[o + 2] = 30; d[o + 3] = 120; }
      }
    }
    sg.putImageData(img, f * FW, 0);
  });
  // the exhaust: six hand-pixelled frames of a puff, 16 x 16, swelling and thinning as it drifts back and up
  const PUFF = [
    ['......', '......', '..##..', '.####.', '..##..', '......'],
    ['......', '.###..', '#####.', '#####.', '.###..', '......'],
    ['.####.', '######', '######', '######', '.####.', '..##..'],
    ['.##.#.', '####.#', '.#####', '###.##', '.##.#.', '......'],
    ['.#..#.', '#.##..', '..#.##', '#..#..', '.#..#.', '......'],
    ['......', '.#..#.', '....#.', '#.....', '..#...', '......'],
  ];
  PUFF.forEach((rows, f) => rows.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch !== '#') return;
    sg.fillStyle = (i + j + f) % 3 ? '#cfcbd8' : '#a9a4b8';
    sg.fillRect(f * 16 + 10 - f * 2 + i, FH + 9 - f - 0 + j - 3, 1, 1);
  })));
  return { url: sheet.toDataURL('image/png'), pal: pal.length };
}
/* eslint-enable no-undef */

try {
  if (only !== 'van') {
    const pg = await browser.newPage();
    await pg.route((u) => u.pathname === '/src/main.js', (r) => r.fulfill({ contentType: 'text/javascript', body: 'window.__ready = true;' }));
    await pg.goto(base + 'index.html', { waitUntil: 'load' });
    save('loading-lane.png', await pg.evaluate(paintLane));
    await pg.close();
  }
  if (only !== 'lane') {
    const pg = await (await browser.newContext({ viewport: { width: 960, height: 600 } })).newPage();
    pg.on('pageerror', (e) => console.log('[pageerror]', e.message));
    await pg.goto(base + 'index.html?autotest&q=high', { waitUntil: 'load', timeout: 240000 });
    await pg.waitForFunction(() => window.__ready === true, null, { timeout: 900000 });
    const r = await pg.evaluate(bakeVan);
    console.log('palette', r.pal, 'colours');
    save('loading-van.png', r.url);
  }
} catch (e) { console.error('ERROR', e.stack || e.message); process.exitCode = 1; } finally {
  await browser.close();
  await server.close();
}
