# Gacha Garage: project rules

First-person gacha-shop sim (Three.js + Vite). Shōwa-era Japanese back lane, voxel / low-poly 3D, pixel-art 2D.

## Look and feel (the owner's explicit rules)
- **Never use a white hover highlight / rim / outline glow** on interactables or anything else. Hover feedback is the
  crosshair hint text only.
- **All particles are 2D pixel-art sprites** (hand-pixelled frames, nearest filtering, stepped animation). No soft
  round glows, no smooth gradients, no additive blobs.
- 2D art is pixel art: no text effects (glows, gradients, bevels), no "AI-looking" slick posters, no circles-and-
  sparkles filler. Fonts: Alagard (UI), the 5x7 bitmap font for tiny text, DotGothic16 for kana.
- UI is paper, in detailed pixel art: notes, tickets, receipts, tags, notebook pages (src/ui/paper.js + paper.css: grain,
  torn / zig-zag edges, masking tape, hanko stamps), ink-coloured text, hard pixel shadows. New UI uses this kit.
- 3D art uses the owner's lowpix technique (docs/ART.md, last Update): properly proportioned models with detailed,
  realistic hand-painted pixel-art textures, built as lowpix specs (art/lowpix/) or converted from CC0 / CC BY Poly
  Haven and Sketchfab models; almost no voxel art. Never chibi, never stuck-together primitives, never cartoon.
  First-person arms are blocky but connected and flexible.
- **Toy look = faceted low-poly, hand-painted** (owner-approved): flat-shaded planes with visible but not chunky facets,
  about 800–1300 tris per toy depending on its detail (simple forms ~800, detailed figures up to ~1300; never
  decimate away a shape detail that reads at shelf distance; the 300–700 sample was too low), one 1024 px brush-stroke atlas (no normal map), facet-edge rims, painted wear, brushwork faces. Built with the
  lib facet mode (art/blender/toys/FACET.md); every series uses it.
- **Toys are modelled in Blender** (`tools/blender.sh script.py`, headless bpy): real subdivision / poly modelling
  with edge loops and creases, a detailed high-poly sculpt baked (normal, AO, colour) onto a clean low-poly game
  mesh, rigged clips for gimmicks, exported as glb. Never toys built from code primitives (balls, tubes, boxes).
  Each series has a strong original idea with a twist (transformations, costumes, playsets, dark-cute, mythic) and
  real gimmicks (press to animate, transform, keychain version, playset parts), like the owner's gashapon boards.
- **We model it ourselves**: low-poly lowpix models textured by photo-bashing real photos, per docs/LOWPOLY.md
  (reference → silhouette → refine in budget → photo-bash + hand paint → check against the photo). Downloads are
  reference only.
- **Low poly, stylised**: models use low triangle counts with clean, deliberate silhouettes (bevels and edge flow
  where they read, no noisy scan geometry); the hand-painted pixel-art texture carries the detail. Real proportions,
  not cartoon. Budgets: toy ≤1.5k tris, small prop ≤1k, furniture ≤3k, animal ≤3k, person ≤2.5k, machine ≤3k.
- **Toy faces are as simple as possible and hand-drawn** (gacha toys only; the in-game cats, dogs and other animals
  keep their own realistic look). The owner's own sketch is
  docs/ref/faces_owner.png: two small solid ink dots for eyes (slightly uneven, never perfectly round or matched), one
  brush-stroke mouth (a flat line with a little upturn at one end, a short slanted dash, or a big grin with a few
  vertical tooth strokes), wobbly and imperfect line weight, like a quick marker drawing. Cute comes from placement
  and spacing (eyes wide apart or tiny and close, mouth small or one big grin), not from detail. No iris, pupil,
  whites, highlights, lashes, sculpted lids or glossy "AI" eyes; no smooth vector-perfect shapes. Painted onto the
  texture, not modelled.
- **Toy style = real Japanese capsule-toy (gashapon) mascot figures** (owner's reference boards): original pun and
  fusion concepts (animal × food or object, little creatures with a job or a pose, transforming toys), chunky
  readable silhouettes, clean factory PVC paint with soft airbrushed blush and simple painted faces (bead eyes), about
  4–6 cm, series of 5–8 with one secret, each series on a bold gashapon display card. This cute mascot style is
  wanted for the toys (the world stays realistic). Original designs only: never copy a real product, character or
  brand. Still modelled by us in lowpix, low poly, per docs/LOWPOLY.md.
- Gacha toys are one consistent product line: every figure has the same finish (hand-painted pixel-art PVC, same
  lighting, ramps, texel density, quiet series bases), with no flat or untextured models and no noisy textures. **No
  reskins**: every catalogue entry is its own unique sculpt; a recolour exists only as a finish (gold, clear, glow…)
  of the same figure, never as a new entry. Check with art/lowpix/figures/audit.py. Most toys stand on their own
  (feet, bowl, plate, own base); a stand or diorama only where the toy really needs one.
- **Never use AI-generated models** (Meshy, Tripo, Rodin/Hyper3D, Luma, CSM, "made with AI", photo-to-3D services,
  AI mass uploaders): only models hand-made by real artists. **Never use scans** (photogrammetry, LiDAR, Object
  Capture, Polycam, Scaniverse… anything scanned). Check every
  Sketchfab source with `python3 tools/ai-check.py` (zero REJECT; look at every REVIEW yourself).
- Nothing visible may be untextured, a flat single colour, voxel-era vertex colours, speckle noise, a blown-up blurry
  painting or an obvious tiling repeat; texel density stays consistent across the game. Check with
  `tools/slot.sh node tools/look-audit.mjs [filter]` (shots/audit/AUDIT.txt).
- Speech, subtitles and chat choices are plain floating text (hard ink outline, no paper box).
- **All printed 2D art uses real images**: posters, flyers, packaging, product and drink labels, boxes, menus,
  magazines, signs with pictures, website product shots and gacha display cards are built from real photographs
  (toy cards: a render of the actual in-game toy on a real photo backdrop). Never drawn, procedural or AI-generated
  imagery. Real public-domain / CC0 vintage posters are welcome (brands retouched out); the rest is designed to a
  graphic-designer standard with free (OFL) print fonts (mincho, gothic, retro display), on real scanned paper
  (folds, fade, tape, wear). Typography stays flat (no glows, gradients, bevels). All names and brands are original
  (real ones are genre reference only). Paper UI uses real paper scans too.
- Real photos come from Google Open Images (CC BY), Wikimedia Commons (PD / CC0 / CC BY) or other CC0 sources, never
  AI images, each credited in CREDITS.md and public/CREDITS.txt.
- People talk in 8-bit voices (src/people/voice.js).

## Code
- New features go in their own modules; drop-in features are `src/plugins/*.js` exporting `install(game)`
  (loaded automatically, run once the whole game exists). Per-frame work: `Game.updaters.push((game, dt) => ...)`.
- Feature save data: `ensureState(game, key, defaults)` from src/game/stateExt.js (one top-level key per system;
  old saves must load).
- Cross-system talk through `game.events` (emit / on).
- Test headless: `node tools/run.mjs "index.html?autotest&q=low" steps.json`, `tools/shoot.mjs`, `window.dbg`
  (src/debug.js). Chromium is preinstalled; never run `playwright install`. On a shared machine wrap heavy runs in
  `tools/slot.sh <command>` so only a few headless browsers run at once.
- `npx vite build` must pass and the game must boot without console errors before committing.
