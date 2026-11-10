// Builds the yokai models (src/peoplekit/yokai.js) off the main thread, so the first nightfall never waits ~0.6 s for the
// kappa's sculpted body (src/npc/yokaiBuild.js starts it a little after boot). Each model comes back as plain arrays (a
// kit geometry: position / normal / uv / color, index, material groups) plus the pixels of any hand-painted texture
// (the kappa's shell), which the kit paints on an OffscreenCanvas here.
import { YOKAI } from '../peoplekit/yokai.js';

// the kit's paintTex() draws on document.createElement('canvas'): an OffscreenCanvas does the same job in a worker
if (typeof document === 'undefined' && typeof OffscreenCanvas !== 'undefined') self.document = { createElement: () => new OffscreenCanvas(1, 1), baseURI: self.location?.href || '' };

self.onmessage = (e) => {
  for (const kind of e.data.kinds) {
    try {
      const g = YOKAI[kind]();
      const A = (n) => g.attributes[n].array;
      const out = { kind, pos: A('position'), nrm: A('normal'), uv: A('uv'), col: A('color'), index: g.index.array, groups: g.groups.map((x) => [x.start, x.count, x.materialIndex]), extra: [] };
      const transfer = [out.pos.buffer, out.nrm.buffer, out.uv.buffer, out.col.buffer, out.index.buffer];
      for (const x of g.userData.extra || []) {
        const cv = x.tex?.image, img = cv?.getContext ? cv.getContext('2d').getImageData(0, 0, cv.width, cv.height) : null;
        out.extra.push({ key: x.key, rough: x.rough, metal: x.metal, w: img?.width || 1, h: img?.height || 1, data: img?.data || null });
        if (img) transfer.push(img.data.buffer);
      }
      self.postMessage(out, transfer);
    } catch (err) {
      self.postMessage({ kind, error: String(err?.message || err) });
    }
  }
};
