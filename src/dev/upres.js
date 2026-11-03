// Viewer module: collectibles before / after the 2x up-res, side by side.
//   viewer.html?module=/src/dev/upres.js&s=mochi,kaiju[&only=after|before][&n=4]
import { SERIES_BY_ID } from '../data/series/index.js';
import { makeItemMesh, setItemUpres } from '../game/collectibles.js';

export async function viewerEntries(params) {
  const ids = (params.get('s') || 'mochi').split(',');
  const only = params.get('only');
  const n = +(params.get('n') || 8);
  const skip = +(params.get('skip') || 0);
  const out = [];
  const o = {};
  for (const k of ['mode', 'sigma', 'threshold']) if (params.get(k)) o[k] = isNaN(+params.get(k)) ? params.get(k) : +params.get(k);
  if (params.get('recolor')) o.recolor = params.get('recolor') === '1';
  if (params.get('ao') === 'hard') o.aoCurve = [0.5, 0.68, 0.84, 1.0];
  setItemUpres(true, o);
  for (const id of ids) {
    const S = SERIES_BY_ID[id];
    for (const it of S.items.slice(skip, skip + n)) {
      if (only !== 'after') {
        const m = makeItemMesh(it.key, params.get('finish') || 'normal', { lowres: true });
        out.push({ obj: m, label: `${it.name}<br><span class="r">before · ${m.geometry.userData.quads * 2} tris</span>` });
      }
      if (only !== 'before') {
        const m = makeItemMesh(it.key, params.get('finish') || 'normal');
        out.push({ obj: m, label: `${it.name}<br><span class="r">after · ${m.geometry.userData.quads * 2} tris</span>` });
      }
    }
  }
  window.__stats = out.map((e) => e.label);
  return out;
}
