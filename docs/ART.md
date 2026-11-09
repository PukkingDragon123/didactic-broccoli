# Gacha Garage art bible

The owner's direction: **low-poly, high-resolution, cel-shaded**, the same family as
the characters and the rebuilt vehicles. The town is built from real reference; textures stay cartoony. Printed
matter (labels, posters, display cards, UI) is detailed pixel art.

## 3D
- **No voxels, no chunky pixel textures** in the 3D world. Everything is clean low-poly with deliberate
  silhouettes: chamfer the edges that catch light, model the parts a person would notice (handles, hinges, seams,
  brackets, cables), leave the rest flat.
- **Real proportions and construction.** 1 unit = 1 m. Build things the way they are built: a wall has a
  foundation, a sill, a frame; a roof has a ridge, eaves, gutters and downpipes; a pole has steps, a transformer,
  insulators and guy wires. Look at reference before modelling (the town is a Shōwa-era back lane in a provincial
  Japanese city, spring 1999).
- **Cel shading is global.** The renderer patches every lit material with a banded light ramp, lilac shadows and
  ink outlines (src/core/renderer.js, src/gfx/sunMask.js). Use `MeshStandardMaterial` (or the kit's materials) with
  high roughness; don't write your own toon shader, don't use emissive blobs, never a white rim or hover highlight.
- **Textures are high-resolution cartoon paint**: flat colour fields, details drawn in a darker tone of the
  surface colour (not black), two or three hand-placed tones of shading, weathering placed by rule (rust under
  bolts, stains under sills, moss at the foot of walls), never random noise. Linear filtering with mipmaps and
  anisotropy for world surfaces. Texel density: 256 px/m or more for things you hold or stand in front of
  (machines, capsules, figures, products, the PC), 96 to 128 px/m for buildings and the road.
- **Modelling kit** (code, no external files): `src/vehicles/geom.js` (flat-shaded triangle builder: chamfered
  boxes, rods, cylinders, rings, polygons with holes, per-face UVs), `src/vehicles/atlas.js` (one painted atlas
  per object or set, with a roughness map), `src/vehicles/paint.js` (painting helpers), `src/vehicles/shell.js`
  (bodies from outlines with real openings). These four files are shared and frozen: import them, don't edit
  them; put new helpers in your own folder.
- **Performance**: merge static parts per atlas / material, keep moving parts separate, a handful of draw calls
  per object, no geometry nobody can see. The perf passes halved the draw calls; don't give that back.
- **Palette**: pastel and a little desaturated, as the grade is now; the reds of lanterns and signs stay readable.

## 2D
- Printed things are **detailed pixel art** with nearest filtering: product labels with a mascot, a logo, flavour
  art, small print and a barcode; posters; gacha display cards laid out like real capsule-toy flyers (logo, price
  badge, 全5種, a hero shot, the line-up row, a warning box, a made-up maker's mark); the paper UI.
- Speech and subtitles are **plain floating text** (a hard ink outline for legibility, no paper box behind it).
  HUD cards, notes and panels stay paper.
- Fonts: Alagard, the 5x7 bitmap font, DotGothic16. No glows, gradients or bevels on text.
- Particles are 2D pixel sprites.

## Originality
Real products and characters are reference for the genre only. Every design, name, mascot and logo in the game
is original; nothing is copied from a real toy line, drink or brand.
