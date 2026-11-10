// Container sizes for the products (millimetres, as the real things) and what that makes their labels in pixels.
// Labels are printed at PXMM pixels per millimetre: fine enough for 12 px small print, coarse enough to stay pixel art.
//   CONT[id] = { kind, d (diameter), h (height), y0 (label's bottom edge above the base), lh (label height) }
//   wrapSize(id) -> [w, h] pixels of the whole wrap (front half | back half); panelSize(id) -> one half
export const PXMM = 2;
export const CONT = {
  can190: { kind: 'can', d: 53, h: 104, y0: 6, lh: 92, ml: 190 },
  can250: { kind: 'can', d: 53, h: 133, y0: 6, lh: 121, ml: 250 },
  can350: { kind: 'can', d: 66, h: 122, y0: 6, lh: 110, ml: 350 },
  can500: { kind: 'can', d: 66, h: 167, y0: 6, lh: 155, ml: 500 },
  pet500: { kind: 'pet', d: 66, h: 205, y0: 88, lh: 68, ml: 500 },
  bottle: { kind: 'bottle', d: 38, h: 112, y0: 16, lh: 45, ml: 100 },
  cup: { kind: 'cup', d: 66, h: 102, y0: 24, lh: 52, ml: 180 },
  ramune: { kind: 'ramune', d: 56, h: 190, y0: 34, lh: 60, ml: 200 },
};
/** Whole-wrap pixel size: the circumference rounded to a multiple of 16 (the cylinder's sides), the label's height. */
export function wrapSize(id) { const c = CONT[id]; return [Math.round((Math.PI * c.d * PXMM) / 16) * 16, c.lh * PXMM]; }
export function panelSize(id) { const [w, h] = wrapSize(id); return [w / 2, h]; }
/** Lid / cap art size in pixels (square). */
export function topSize(id) { const c = CONT[id]; return c.kind === 'can' || c.kind === 'cup' ? c.d * PXMM : c.kind === 'pet' ? 60 : c.kind === 'ramune' ? 48 : 52; }
