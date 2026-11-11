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
- **The light is global.** The renderer patches every lit material with realistic light and a light cel accent on the
  sun, cool readable shadows and ink outlines (src/core/renderer.js, src/gfx/sunMask.js; see the renderer contract
  below). Use `MeshStandardMaterial` (or the kit's materials) with a roughness that fits the material; don't write your
  own toon shader, don't use emissive blobs, never a white rim or hover highlight.
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

## Update: toys are stylised low-poly (the owner's latest direction, toys and figures only)
- Gacha figures are **crisp, stylised low-poly**: deliberate flat facets and hard planes like a polished
  low-poly sculpt, few segments on curves, flat-shaded faces, clean silhouettes. **No round blobs**: no figure
  part may read as a sphere, a tube or a smooth bean; heads, bodies and props are faceted and shaped.
- Polished, hand-designed, not AI-looking: strong shape language, readable character, painted details in clean
  flat colours.
- Anime figures are **chibi**, built on the game's human base model (src/people): big head, small body, anime face
  paint, hair and outfits from the human kit, dynamic poses on display bases.
- The world (town, buildings, interiors, props) keeps the detailed direction above.

## Update: high-resolution pixel-art textures, normal humans (the owner's latest direction)
- **Surfaces are high-resolution pixel art** (wins over "texels must never read as pixels" above): each texture is
  realistic in content (from the real photos in src/kit/photoTex.js, or painted from reference) and finished as
  hand-pixelled art: a limited palette per material (about 12 to 32 tones), clean pixel clusters, deliberate
  highlights and shadow tones, no noise, no blur, no smooth gradients. Pixels are crisp up close (nearest
  magnification) and never shimmer far away (mipmapped minification). Density: about 64 to 128 texels a metre for
  walls, roofs and roads, more for things you hold or stand in front of, so the pixels are small but readable.
- **People look like normal humans**: real adult proportions (about 7 to 7.5 heads), modelled faces (brow, eye
  sockets, nose, lips, ears, jaw), hands with fingers, hair as modelled locks, clothes with seams and folds; lightly
  cel-shaded like the rest of the world. Characterful and hand-designed, never generic or "AI-looking".
- Every model keeps getting more detailed: modelled small parts everywhere a person would look.

## Update: real assets from free libraries, never procedural art (the owner's latest direction)
- **Use real assets, adapted to the style.** The owner finds most code-built models and code-drawn 2D art ugly.
  Start every asset from real, freely licensed material and modify it to fit:
  - 3D models: Poly Haven (CC0, api.polyhaven.com; realistic scanned props, furniture, street and building parts);
  - textures: ambientCG (CC0) and Poly Haven textures; photos: Google Open Images (CC BY);
  - 2D art: real photos (Open Images), public-domain artwork, CC0 pixel art (OpenGameArt, filtered to CC0).
  Every one is credited in CREDITS.md (and public/CREDITS.txt) with source, author and licence.
- **Adapt, don't paste.** Imported models go through tools/import-asset.mjs (decimate to a sensible budget, real-world
  scale, textures re-made as high-resolution pixel art, light cel through the renderer) and load with
  src/kit/assets.js. 2D art is reduced to high-resolution pixel art the same way.
- **Code-built only when nothing suitable exists** (Japanese-specific things like the gacha machines, the vending
  machines, kei vans): then model it from photographs of the real thing, with its real parts, never from bare
  primitives, and texture it with real photo material.
- Product labels, posters and cards keep original names and mascots (no real brands), but their art is made from real
  images, not drawn by formula.

## Update: realistic, less anime, downloaded models (the owner's newest direction; wins over everything above)
- **Use downloaded models, not ours.** Nearly every 3D asset comes from free model sites (Poly Haven CC0 first;
  Sketchfab CC0 / CC BY downloadable models when the API token works; other CC0 libraries), modified so it looks good
  in the game: right scale, cleaned up, retextured or recoloured to fit the Shōwa lane, budgeted. Code-built models
  only for what no free site has, and even then from photo reference with real photo materials.
- **Realistic, less anime.** Realistic proportions and materials everywhere; the cel touch and ink outlines are
  subtle; people look like real people; no anime faces outside the toy figures.
- **Textures: polished.** Realistic texture content from the source models and CC0 libraries, finished with a clean,
  high-resolution, subtle pixel treatment where it helps; never muddy, noisy or posterised-looking.
- **Real images for every printed thing** (drinks first): labels, packets, posters and cards are built from real
  photographs, laid out with original names; never drawn by formula.

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
lighting of every built-in lit material; src/core/renderer.js draws the ink and the grade; src/sim/sky.js and
src/game/Lighting.js set the light by the time of day). The look is **realistic lighting, a realistic grade and only a
faint cel touch** (phase 11: "more realistic, less anime"): it is not a toon shader and not a pastel cartoon.

- **What it applies to:** `MeshStandardMaterial`, `MeshPhysicalMaterial`, `MeshLambertMaterial` and
  `MeshPhongMaterial`, including the kit's atlas materials and anything that extends them with `onBeforeCompile`.
  `MeshBasicMaterial` and custom `ShaderMaterial`s are drawn as they are (use them only for things that give light:
  a lit sign face, a tube, the sky). No setup is needed: don't write a toon shader, don't add gradient maps.
- **Only the key light has a cel accent, and a faint one.** The sun / moon's N.L is mixed 12% with a soft two-step
  ramp (shade / lit, the step spread over N.L 0 to 0.25), which just firms up the terminator on a round form; a flat
  face keeps its natural tone. Cast shadows let about an eighth of the sun back in, slightly cool (`SHADOW_TINT`): the light a
  real shadow gets back from the bright street round it. The rest of the shade is the sky fill (hemisphere, cool blue)
  and the environment probe.
- **Light levels are photographic.** By day the sun is about three times the sky fill, so sunlit and shaded sides read
  like a photograph (not the flat, bright cartoon light we had); golden hour is an amber sun against blue shade with the
  exposure opened a little; night is dark blue, lit mostly by the lamps (src/sim/sky.js keys: si, hi, env, exp).
- **The sun's shadows follow you.** Its shadow map is a square centred a little ahead of the player (12 m half-size on
  low, 15 medium, 18 high, 24 ultra: `QUALITY.sunShadow`), snapped to whole texels in the light's frame so shadows never
  crawl, and redrawn only when you cross a grid line, the sun steps or a caster moves. Anything that stands up casts
  (`castShadow`: walls, roofs, poles, people, furniture); things lying flat on the ground (road, paint, decals, grates,
  chain-link) don't. The town's and the garage's static opaque casters are drawn into the map by a few merged,
  shadow-only chunks (`src/gfx/shadowProxy.js`, shown only during the shadow pass); small casters (under 0.3 m) more
  than 9 m away skip it.
- **Local lights are plain physical light: no steps, no rings, no discs.** Lamps, tubes, lanterns, the light pool and
  spots are smooth Lambert. Their falloff is softened near the source as if the lamp had a size (`SOFT_R`, 0.45 m: no
  hot spot on the ceiling or wall a lamp hangs by), and every spot cone fades out over at least 80% of its angle,
  whatever its penumbra, so a desk lamp or a headlight never draws a hard ellipse. Don't fake light with additive halo
  quads, light-shaft quads or light-pool decals: the lights and the shadow maps do that.
- **Speculars are physical (GGX), so roughness is how a material reads as itself.** A highlight from a light is never a
  pin-point: direct light is reflected at a roughness of at least 0.3 (`SPEC_MIN`; Phong shininess is capped at 40),
  while reflections of the environment keep the true roughness, so glass and chrome still mirror the sky. Give
  materials real variety:
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
- **Ink outlines** are thin and light: a half-value shade of the surface's own colour mixed in at about 40%, from the
  depth buffer, for every opaque mesh that writes depth (they define a form, they never read as drawn lines):
  - silhouettes (where something stands in front of something else by more than about 0.5% of its distance: 1.5 cm at
    3 m, so a poster, a decal or a bolt head lying on a surface is not outlined, and fine detail drops its ink with
    distance by itself);
  - creases sharper than about 70 degrees, drawn much lighter than silhouettes: a hard 90-degree edge gets a faint
    line, a chamfer and a smooth curve get none. Round things need enough segments to read as round: 12 or more sides (30 degrees a
    step or less). Where the depth is busy all round a pixel (a grille, a shelf of stock, a bundle of wires) creases
    are left out, so dense detail never turns into a scribble.
  - Lines keep the same weight on screen at any resolution, thin things (wires, railings) never swell, creases fade
    out between 5 and 12 m and silhouettes between 22 and 50 m.
  - **To opt out:** `import { noInk } from '../gfx/sunMask.js'` and wrap the material: `noInk(material)` (it sets the
    `NO_INK` define; opaque built-in materials only). Use it for foliage and grass cards, chain-link, dense grilles
    and other fine cut-outs that would turn into a tangle of lines. Transparent materials with `depthWrite: false`
    (glass) are never outlined; give a pane `depthWrite: true` if you want its edge drawn.
  - Don't paint black outlines round shapes in textures: the renderer draws them. Panel lines and seams inside a
    surface are yours to paint (in a darker tone of the surface colour).
- **Textures:** real surfaces come from the library (src/kit/photoTex.js): polished photo-scan tiles at 256 texels a
  metre (more for things seen up close), crisp up close (nearest magnification, a texel too small to read as a block),
  mipmapped and anisotropic far away, with the scan's own normal map for relief (`withPhotoNormal(material)`;
  `photoMat` does it for you). Imported models get the same finish (tools/import-asset.mjs through tools/pixelart.py
  polish()). No palette reduction, no posterising. Other new textures default to anisotropy 4.
- **Post:** full device resolution on every preset (never upscaled), the ink, light ambient occlusion on medium, high
  and ultra (contact shadow in corners and under things, only from surfaces within 30 cm in depth, so nothing standing
  in front of a wall leaves a dark ring on it), the grade (natural saturation, a gentle contrast curve, no lifted pastel
  blacks, a faint vignette) with neutral tone mapping, then FXAA. **No bloom and no screen-space god rays** on any preset (both drew
  soft round glows: round the lanterns, round the sun). No grain, no chromatic aberration, no sharpen pass. A lit thing
  (a lantern, a tube, a sign) reads by its own bright colour, not by a glow.
- **Hard rules still stand:** no white rim or hover highlight, no glow blobs, no rings or discs. Colour is natural
  (the old "pastel and a little desaturated" is gone); the reds of lanterns and signs stay readable.
