// Figure variants (art/blender/toys/GIMMICKS.md, "Variants"): every figure comes in 2–3 versions of the same sculpt
// (the standard one, an alternate colourway, an alternate face), mass-produced with no per-figure work
// (src/figures/lowpix.js figureVariants), pulled at random by weight. A series item may override them:
//   variants: [{ id, name, weight, texture?, tint?, hue?, show?: [node], hide?: [node] }, ...]
// variants[0] is the standard figure. A pulled figure's records carry `variant: '<id>'` next to `finish` (only for a
// non-standard one: old saves and plain records read as variants[0]). The loader (src/figures/lowpix.js) does the
// swap: texture = a repainted atlas (make.sh --faces), hue = the runtime colourway, tint = a colour multiplied over
// the paint, show / hide = GLB nodes.
import { getItem } from './series/index.js';
import { figureVariants } from '../figures/lowpix.js';

/** The item's variants (null without). */
export function variantsOf(keyOrItem) {
  const it = typeof keyOrItem === 'string' ? getItem(keyOrItem) : keyOrItem;
  return figureVariants(it); // (item.variants, or every figure's mass-produced defaults)
}

/** The variant record for an id (the standard one for none or an unknown id); null for an item without variants. */
export function getVariant(key, id) {
  const vs = variantsOf(key);
  if (!vs) return null;
  return (id && vs.find((v) => v.id === id)) || vs[0];
}

/** Roll a variant for an item: its id, or undefined for the standard figure (and items without variants). */
export function rollVariant(keyOrItem, rnd = Math.random) {
  const vs = variantsOf(keyOrItem);
  if (!vs) return undefined;
  const total = vs.reduce((a, v) => a + (v.weight ?? 1), 0);
  let x = rnd() * total;
  for (const v of vs) { x -= v.weight ?? 1; if (x < 0) return v === vs[0] ? undefined : v.id; }
  return undefined;
}

/** The id stored in records: undefined for the standard figure. */
export function variantId(key, id) {
  const v = getVariant(key, id);
  return v && v !== variantsOf(key)[0] ? v.id : undefined;
}

/** Spread into a toy record: { variant } for a non-standard variant, nothing otherwise. */
export const withVariant = (v) => (v ? { variant: v } : {});

/** The variant's display name for tags and labels ('' for an item without variants). */
export function variantName(key, id) { return getVariant(key, id)?.name || ''; }
