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
  bolts, stains under sills, moss at the foot of walls), never random noise. Texels must never read as pixels:
  the kit's atlases (nearest magnification) are painted at 256 px/m or more for things you hold or stand in front
  of (machines, capsules, figures, products, the PC); big tiling surfaces (walls, roofs, the road) use
  canvas-painted tiling textures with linear filtering, mipmaps and anisotropy, at 128 px/m or more.
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

## Renderer contract
What the renderer does to your models by itself, and the few switches you have (src/gfx/sunMask.js patches the
lighting of every built-in lit material; src/core/renderer.js draws the ink and the grade).

- **What gets cel shading:** `MeshStandardMaterial`, `MeshPhysicalMaterial`, `MeshLambertMaterial` and
  `MeshPhongMaterial`, including the kit's atlas materials and anything that extends them with `onBeforeCompile`.
  `MeshBasicMaterial` and custom `ShaderMaterial`s are drawn as they are (use them only for things that give light:
  a lit sign face, a tube, the sky). No setup is needed: don't write a toon shader, don't add gradient maps.
- **Light bands:** the sun / moon shade every face in three flat tones (shade / half / full, a narrow soft edge on
  each step); lamps (point and spot lights) in two. Cast shadows have a crisp edge and are lilac, never black. Model
  with flat faces (non-indexed geometry, the kit's `Geo`): each face takes one clean tone. Smooth normals are fine on
  round things (a capsule, a head): they show a band line.
- **Roughness decides the highlight.** There is no smooth specular lobe any more:
  - `roughness >= 0.5`: matte, no highlight. Use this for almost everything: 0.8 to 0.95 for wood, concrete, plaster,
    cloth, paper, rust; 0.6 to 0.7 for painted metal, enamel, old plastic, vinyl.
  - `roughness <= 0.3`: glossy: one hard-edged toon highlight per light, smaller the lower the value. 0.18 to 0.25
    for capsule plastic, glazed ceramic and lacquer; 0.05 to 0.15 for glass and lenses; 0.18 with `metalness: 1` for
    chrome (it also gets a cartoon sky / horizon / ground reflection in place of the environment map).
  - 0.3 to 0.46 fades between the two; avoid it unless you want a faint highlight (car paint at 0.42).
  - With an atlas, write it per pixel: `A.ink(ROUGH.chrome)` and so on (src/vehicles/atlas.js `ROUGH`); the roughness
    map is what the highlight reads.
  - Keep `metalness` at 0 except for chrome and bare polished steel (a metal has no diffuse colour, so it only shows
    its reflection). Never use `emissive` to brighten a surface: only for things that are lit from inside.
- **Ink outlines** come from the depth buffer, for every opaque mesh that writes depth:
  - silhouettes (where something stands in front of something else by more than about 0.5% of its distance: 1.5 cm at
    3 m, so a poster or a decal lying on a wall is not outlined);
  - creases sharper than about 55 degrees. So a hard 90-degree edge is inked, and a 45-degree chamfer is not: chamfer
    the edges that should catch light softly, leave the ones that should read as drawn lines sharp. Cylinders with 12
    or more sides read as round (no lines between facets); 8 sides or fewer show their edges.
  - Lines keep the same weight on screen at any resolution, thin things (wires, railings) never swell, creases fade
    out beyond 30 m and silhouettes beyond 75 m.
  - **To opt out:** `import { noInk } from '../gfx/sunMask.js'` and wrap the material: `noInk(material)` (it sets the
    `NO_INK` define; opaque built-in materials only). Use it for foliage and grass cards, chain-link and other fine
    cut-outs that would turn into a tangle of lines. Transparent materials with `depthWrite: false` (glass) are never
    outlined; give a pane `depthWrite: true` if you want its edge drawn.
  - Don't paint black outlines round shapes in textures: the renderer draws them. Panel lines and seams inside a
    surface are yours to paint (in a darker tone of the surface colour).
- **Textures:** new textures default to anisotropy 4. Anisotropy only works with a linear magnification filter
  (three.js skips it for `NearestFilter`), so big tiling surfaces must be linear-filtered with mipmaps.
- **Post:** full device resolution on every preset (never upscaled), FXAA after the ink, no grain, no chromatic
  aberration, no sharpen pass. Bloom is only for lit things (lanterns, tubes, signs above about 1.15 linear); a toon
  highlight stays under that.
- **Hard rules still stand:** no white rim or hover highlight, no glow blobs, pastel and a little desaturated.
