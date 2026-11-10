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

## Update: detailed, not low-poly (the owner's later direction)
- Models are **detailed and polished, not low-poly**: curved surfaces are smooth (enough segments, smooth normals
  where the real thing is smooth, hard edges where it has them), small parts are modelled, not painted on.
  No object may read as stuck-together primitives (bare spheres, cylinders, boxes): give everything its real
  profile. Moving parts get proper pivots / rigs.
- The shading is **realistic with a light cel touch**: only the key light is softly banded; local lights fall off
  smoothly (no rings or discs on walls and floors); speculars are soft. Ink outlines and the pastel grade stay.
- Keep the frame rate: merge statics, instance repeats, give far or tiny things a simpler level of detail.

## Update: no procedural-looking art (the owner's later direction)
- **Nothing may look generated.** No noise functions, random speckle, generated grain, repeated stamp patterns or
  formula shapes in textures or models.
- **Surfaces come from real photographs**, cleaned into cartoon textures (flattened, a few tones, the real grain
  and wear kept). Use the shared library: `photoTex(name, { repeat, tint })` and `photoMat(name, { repeat, tint,
  roughness })` from `src/kit/photoTex.js` (names in that file; photos are CC BY from Google Open Images, credited
  in CREDITS.md). Small painted details on top are drawn by hand, placed deliberately.
- **Shapes are authored by hand**: each object gets its own profiles and sections from reference, not a generic
  generator with random parameters.

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
lighting of every built-in lit material; src/core/renderer.js draws the ink and the grade). The look is **realistic
lighting with a light cel touch**: it is not a hard toon shader.

- **What it applies to:** `MeshStandardMaterial`, `MeshPhysicalMaterial`, `MeshLambertMaterial` and
  `MeshPhongMaterial`, including the kit's atlas materials and anything that extends them with `onBeforeCompile`.
  `MeshBasicMaterial` and custom `ShaderMaterial`s are drawn as they are (use them only for things that give light:
  a lit sign face, a tube, the sky). No setup is needed: don't write a toon shader, don't add gradient maps.
- **The key light is softly banded, nothing else.** The sun / moon's shading is pulled half way toward three wide,
  soft-edged steps, so a round form shows a gentle band and a flat face keeps its natural tone. Cast shadows are
  lilac, never black, with the shadow map's soft edge. **Local lights (lamps, tubes, lanterns, the light pool) are
  plain smooth Lambert with their natural falloff: no steps**, so they never draw rings or discs on a wall, a floor or
  a ceiling. Don't fake light with additive halo quads or light-pool decals either.
- **Speculars are physical (GGX), so roughness is how a material reads as itself.** Give materials real variety:
  - 0.85 to 0.95: concrete, mortar, plaster, raw timber, cloth, paper, rust, rubber;
  - 0.6 to 0.75: painted metal, enamel, zinc sheet, old plastic, vinyl floor, varnished wood;
  - 0.3 to 0.45: glazed tile, lacquer, capsule plastic, clean car paint (a soft highlight);
  - 0.05 to 0.25: glass, lenses, polished chrome (with `metalness: 1`).
  Keep big flat surfaces (floors, walls, counters) at 0.5 or rougher: a glossy floor under a lamp shows a round hot
  spot, which is exactly the "circle" the owner doesn't want. With an atlas, write roughness per pixel:
  `A.ink(ROUGH.chrome)` and so on (src/vehicles/atlas.js `ROUGH`). Keep `metalness` at 0 except for bare polished
  metal. Never use `emissive` to brighten a surface: only for things that are lit from inside.
- **Normals:** smooth where the real thing is smooth (pipes, lathes, bowls, corrugated sheet), hard where it has an
  edge. The garage's kit smooths automatically below 40 degrees (src/garage/kit.js `autoSmooth`); a 45-degree chamfer
  stays crisp.
- **Ink outlines** come from the depth buffer, for every opaque mesh that writes depth:
  - silhouettes (where something stands in front of something else by more than about 0.5% of its distance: 1.5 cm at
    3 m, so a poster, a decal or a bolt head lying on a surface is not outlined, and fine detail drops its ink with
    distance by itself);
  - creases sharper than about 55 degrees: a hard 90-degree edge is inked, a chamfer and a smooth curve are not.
    Round things need enough segments to read as round: 12 or more sides (30 degrees a step or less).
  - Lines keep the same weight on screen at any resolution, thin things (wires, railings) never swell, creases fade
    out beyond 24 m and silhouettes beyond 75 m.
  - **To opt out:** `import { noInk } from '../gfx/sunMask.js'` and wrap the material: `noInk(material)` (it sets the
    `NO_INK` define; opaque built-in materials only). Use it for foliage and grass cards, chain-link, dense grilles
    and other fine cut-outs that would turn into a tangle of lines. Transparent materials with `depthWrite: false`
    (glass) are never outlined; give a pane `depthWrite: true` if you want its edge drawn.
  - Don't paint black outlines round shapes in textures: the renderer draws them. Panel lines and seams inside a
    surface are yours to paint (in a darker tone of the surface colour).
- **Textures:** new textures default to anisotropy 4. Anisotropy only works with a linear magnification filter
  (three.js skips it for `NearestFilter`), so big tiling surfaces must be linear-filtered with mipmaps.
- **Post:** full device resolution on every preset (never upscaled), FXAA after the ink, no grain, no chromatic
  aberration, no sharpen pass. Bloom is only for lit things (lanterns, tubes, signs above about 1.15 linear).
- **Hard rules still stand:** no white rim or hover highlight, no glow blobs, pastel and a little desaturated.
