// Viewer module: every machine type with its banner and sample figures.
//   viewer.html?module=/src/dev/machines.js&angle=front[&type=standard][&series=uchu]
import * as THREE from 'three';
import { buildMachineModel, buildHandle, buildSlotModule, MACHINE_SPECS } from '../world/machineModels.js';
import { bannerTexture, bannerGlyphs } from '../gfx/banner.js';
import { Thumbs } from '../gfx/thumbs.js';
import { SERIES_BY_ID } from '../data/series/index.js';
import { makeItemMesh } from '../game/collectibles.js';

export async function viewerEntries(params) {
  await document.fonts.load('16px "DotGothic16"', bannerGlyphs() + 'コイン投入口返却ボタン印を合わせてからコインを入れてくださいとりだしぐち見本円');
  const r = new THREE.WebGLRenderer({ antialias: true });
  const thumbs = new Thumbs(r);
  const def = { retro: 'mochi', standard: 'konbini', deluxe: 'dajare', royal: 'uchu' };
  const types = params.get('type') ? params.get('type').split(',') : Object.keys(MACHINE_SPECS);
  return types.map((t) => {
    const series = params.get('series') || def[t];
    const { group, L, domeAnchor } = buildMachineModel(t, { banner: bannerTexture(series, thumbs, { faded: t === 'retro' }), ext: +(params.get('ext') || 0) });
    const h = buildHandle(L.handle.r, +(params.get('lvl') || 0));
    h.position.set(L.handle.x, L.handle.y, L.handle.z);
    group.add(h);
    const sm = buildSlotModule(t === 'retro');
    sm.position.set(L.slot.x, L.slot.y, L.front + 0.0005);
    group.add(sm);
    const S = SERIES_BY_ID[series];
    const keys = S.items.filter((i) => i.rarity !== 'secret').slice(0, 3).map((i) => i.key);
    keys.forEach((k, i) => {
      const f = makeItemMesh(k);
      const sz = f.geometry.userData.size;
      f.scale.setScalar(Math.min(1, (L.dome.h - 0.03) / sz.y));
      f.position.set((i - 1) * L.dome.w / 3, 0.008, 0);
      domeAnchor.add(f);
    });
    return { obj: group, label: `${t}<br><span class="r">${series}</span>` };
  });
}
