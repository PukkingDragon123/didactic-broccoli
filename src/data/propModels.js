// Which lowpix model draws each voxel prop (the game is moving to lowpix models: docs/ART.md, the last Update).
// prop id -> { id: asset id (public/models/<id>.glb), fit: 'contain' (default) | 'x' | 'y' | 'z' | 'stretch', ry, tint }
// The model is fitted into the box of the prop's own voxel build (src/world/props.js), so every key, size, hit box and
// placement stays. Models: art/lowpix/world/world.json -> tools/lowpix-world.mjs -> public/models/lowpix/world/ (credits
// in CREDITS.md). A prop def's own `asset` wins over this table.
export const PROP_MODELS = {
};
