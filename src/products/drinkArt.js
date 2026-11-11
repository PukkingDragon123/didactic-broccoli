// The drinks' printed wraps, baked from real photographs by tools/bake-drinks.py (public/img/drinks/labels.webp +
// labels.json { 'drinks:wrap:<id>': [x, y, w, h] }, each the whole wrap at the container's size: front half | back half), served through
// the print sheets (src/products/printArt.js). A drink missing from the sheet keeps the label studio's drawing.
//   await whenDrinkArtReady()     drinkWrap(id) -> Px | null     drinkFront(id) -> Px | null (the front half)
//   bakedPanel(key) -> Px | null  any baked panel, e.g. the vending machines' ads ('poster:<livery>', 'side:<livery>')
import { whenPrintReady, printPx, printImage } from './printArt.js';

export const whenDrinkArtReady = whenPrintReady;
const key = (id) => 'drinks:wrap:' + id; // as the drinks sheet's region (src/products/containers.js), so it is laid in early
export const drinkWrap = (id) => printPx(key(id));
export function drinkFront(id) { const e = printImage(key(id)); return e ? printPx(key(id), 0, e.r[2] >> 1) : null; }
export const bakedPanel = (key) => printPx(key);
