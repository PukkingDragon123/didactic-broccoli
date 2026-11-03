// Viewer module: every machine type with its banner, sample figures, a capsule pile and the price plate.
//   viewer.html?module=/src/dev/machines.js&angle=front[&type=standard][&series=uchu][&lid=1][&drawer=1]
import * as THREE from 'three';
import { buildMachineModel, MACHINE_SPECS, layout } from '../world/machineModels.js';
import { bannerTexture, bannerGlyphs } from '../gfx/banner.js';
import { Thumbs } from '../gfx/thumbs.js';
import { SERIES_BY_ID } from '../data/series/index.js';
import { makeItemMesh } from '../game/collectibles.js';
import { pileGeometries, capsuleSize, capsuleStyle, capsuleColor, CAPSULE_R } from '../game/Capsule.js';

export async function viewerEntries(params) {
  await document.fonts.load('16px "DotGothic16"', bannerGlyphs() + 'コイン投入口返却ボタン印を合わせてからコインを入れてくださいとりだしぐち見本円ねだんガチャ対象年齢才以上');
  const r = new THREE.WebGLRenderer({ antialias: true });
  const thumbs = new Thumbs(r);
  const def = { retro: 'mochi', standard: 'konbini', deluxe: 'dajare', royal: 'uchu' };
  const types = params.get('type') ? params.get('type').split(',') : Object.keys(MACHINE_SPECS);
  return types.map((t, ti) => {
    const series = params.get('series') || def[t];
    const b = buildMachineModel(t, { banner: bannerTexture(series, thumbs, { faded: t === 'retro' }), no: ti + 1 });
    const { group, L, domeAnchor } = b;
    b.plate.draw(MACHINE_SPECS[t].price, params.get('rec') ? +params.get('rec') : null);
    const S = SERIES_BY_ID[series];
    const keys = S.items.filter((i) => i.rarity !== 'secret').slice(0, 3).map((i) => i.key);
    keys.forEach((k, i) => {
      const f = makeItemMesh(k);
      const sz = f.geometry.userData.size;
      f.scale.setScalar(Math.min(1, (L.dome.h - 0.02) / sz.y));
      f.position.set((i - 1) * L.dome.w / 3, 0, 0);
      domeAnchor.add(f);
    });
    // a settled-looking pile of capsules in the window
    const size = capsuleSize(series), kind = capsuleStyle(series), pg = pileGeometries(size, kind, series), rr = CAPSULE_R[size];
    const W = L.window, n = +(params.get('fill') || 40);
    const bot = new THREE.InstancedMesh(pg.bottom, pg.bottomMat, n), top = new THREE.InstancedMesh(pg.top, pg.topMat, n);
    let seed = 3 + ti;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const nx = Math.floor((W.x1 - W.x0) / (2 * rr)), nz = Math.floor((W.z1 - W.z0) / (2 * rr));
    for (let i = 0; i < n; i++) {
      const ix = i % nx, iz = Math.floor(i / nx) % nz, iy = Math.floor(i / (nx * nz));
      const m = new THREE.Matrix4().compose(new THREE.Vector3(W.x0 + rr + ix * 2 * rr + (iy % 2) * rr * 0.5, W.y0 + rr + iy * rr * 1.7, W.z0 + rr + iz * 2 * rr), new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd() * 6, rnd() * 6, rnd() * 6)), new THREE.Vector3(1, 1, 1));
      bot.setMatrixAt(i, m); top.setMatrixAt(i, m);
      if (kind !== 'paper') bot.setColorAt(i, new THREE.Color(capsuleColor(series, rnd)));
    }
    top.renderOrder = 2;
    group.add(bot, top);
    if (params.get('lid')) b.lidPivot.rotation.x = -1.85;
    if (params.get('drawer')) b.drawer.position.z += L.coinBox.depth - 0.012;
    void layout;
    return { obj: group, label: `${t}<br><span class="r">${series}</span>` };
  });
}
