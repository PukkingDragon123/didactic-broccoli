# Gacha Garage: project rules

First-person gacha-shop sim (Three.js + Vite). Shōwa-era Japanese back lane, voxel / low-poly 3D, pixel-art 2D.

## Look and feel (the owner's explicit rules)
- **Never use a white hover highlight / rim / outline glow** on interactables or anything else. Hover feedback is the
  crosshair hint text only.
- **Never use the gacha capsule as a generic button / menu icon** (Continue, New Game…): each button gets its own
  fitting, detailed pixel icon. No itch.io "follow" call-to-action in the menu. Menu UI is physical, kinda-3D and
  interactive (signs / tags with depth that tilt, swing and press), never flat.
- **All particles are 2D pixel-art sprites** (hand-pixelled frames, nearest filtering, stepped animation). No soft
  round glows, no smooth gradients, no additive blobs.
- 2D art is pixel art: no text effects (glows, gradients, bevels), no "AI-looking" slick posters, no circles-and-
  sparkles filler. **Every font in the game is pixel art AND high resolution** (owner, latest): Alagard, Pixelify Sans, GG Display,
  DotGothic16 for kana, or another high-res OFL pixel font, drawn at native pixel size or clean integer multiples;
  never a low-res font (no 5x7 / tiny bitmap fonts, no blown-up chunky glyphs); on UI, signs, posters, flyers, notices, labels, subtitles, everywhere.
  No smooth / vector / print fonts anywhere.
- The pixel-art kit (public/img/pixelkit via src/ui/pixelkit.js; built by tools/pixelkit/build.py, hand-pixelled or
  pixelised Blender renders to the docs/ref/pixel refs) is the standard for coins, notes, banks, tickets, receipts,
  stamp cards and capsules in the UI and on posters / cards: use it, never redraw them.
- UI is detailed pixel art that feels physical, kinda-3D and interactive (owner, latest: "not always paper"):
  inventory, pause, settings, HUD are cool objects (tin box, wooden drawer, enamel sign, radio dial…) with depth,
  tilt, press and swing, hard pixel shadows. The paper kit (src/ui/paper.js + paper.css) is only for things that really
  are paper (notes, tickets, receipts, tags). **Never the 2D gacha capsule icon anywhere in the UI.**
- 3D art uses the owner's lowpix technique (docs/ART.md, last Update): properly proportioned models with detailed,
  realistic hand-painted pixel-art textures, built as lowpix specs (art/lowpix/) or converted from CC0 / CC BY Poly
  Haven and Sketchfab models. **No voxel assets at all, ever** (owner, latest); any left are bugs to replace. Never chibi, never stuck-together primitives, never cartoon.
  First-person arms are blocky but connected and flexible.
- **Toy look = faceted low-poly, hand-painted** (owner-approved): flat-shaded chunky planes, still clearly low poly:
  simple figures ~1000–1200 tris, detailed figures (fingers, beaks, props, mechanisms) ~1500–1700, secrets ≤1900
  (the owner's higher-resolution pass; never decimate away a detail that reads at shelf distance), one 2048 px brush-stroke atlas (no normal map), facet-edge rims, painted wear, brushwork faces. Built with the
  lib facet mode (art/blender/toys/FACET.md); every series uses it.
- **Toys are modelled in Blender** (`tools/blender.sh script.py`, headless bpy): real subdivision / poly modelling
  with edge loops and creases, a detailed high-poly sculpt baked (normal, AO, colour) onto a clean low-poly game
  mesh, rigged clips for gimmicks, exported as glb. Never toys built from code primitives (balls, tubes, boxes).
  Each series has a strong original idea with a twist (transformations, costumes, playsets, dark-cute, mythic) and
  real gimmicks (press to animate, transform, keychain version, playset parts), like the owner's gashapon boards.
- **Props, world, cosmetics: mostly imported, detailed** (owner, latest: "more poly-heavy detailed assets, mostly find from
  Sketchfab and free websites, some by yourself"): hand-made CC0 / CC BY models from Sketchfab, Poly Haven and other
  free sites (ai-check, never AI, never scans, credited), restyled to fit (texel density, palette, wear); the rest we
  model ourselves per docs/LOWPOLY.md. No lazy blocky / primitive-built props anywhere. Toys stay modelled by us.
- **Detailed, clean geometry**: real proportions, clean silhouettes, no noisy scan meshes; detail where it reads.
  Budgets (use LODs): toy ≤2k tris, small prop ≤6k, furniture ≤12k, animal ≤8k, person ≤10k, machine / vehicle ≤20k.
- Story / UI (owner, latest): no Grandpa mail or paper notes stuck everywhere; no customer guest book. The PC starts
  with only 2 apps (more unlock later), uses real-photo wallpapers; message-app faces are renders of the real 3D
  models. Dialogue and the objective are floating text that looks great, with 3D transitions; scene transitions are
  cool and varied. The tutorial is forced, with Grandpa scolding.
- **Toy faces are hand-drawn, with some detail** (gacha toys only; the in-game cats, dogs and other animals keep
  their own realistic look). Base: the owner's sketch docs/ref/faces_owner.png (uneven ink eyes, one brush-stroke
  mouth, wobbly marker line weight). Newer direction: "better eyes and face, more detail, but hand-drawn": solid-ink
  eye shapes (bean, oval, half-moon, sleepy lid) with NO catchlight or white inside the eye, a lid stroke on bigger
  eyes, many cool face types with attitude, a unique species-specific face per animal, tapered brush brows, hatch or dabbed blush, inner-mouth colour, tongue and teeth detail, animal noses. Always
  ink and brush, slightly uneven between the two eyes; never glossy rendered "AI" eyes, irises with gradients,
  modelled eyeballs or vector-perfect shapes. Painted onto the texture with lib/face.py.
- **Toy animals are realistic: the whole model and the face, not just the texture** (owner, latest: "more realistic
  animals, like the turtles"): each animal is sculpted from its real anatomy (proper skull shape and jaw, neck, jointed
  limbs with claws, correct proportions, clean edge flow and silhouette; a turtle's carapace modelled scute by scute
  with its plastron and bridges, real beaks and feathers, fur in clumps, crab / beetle segments), and its face redone
  species-correct (where the eyes really sit, the species' iris, lids, nostrils, the mouth's real line), still
  hand-inked per the face rules. The painting follows the model: natural brush presets (lib/paint.py NATURAL: fur,
  feather, scale, skin, shell, chitin, frog) over a photo-bash of real CC0 / CC BY animal photos
  (art/blender/toys/lib/photos, credited); no flat-colour areas, no noise. Still gashapon mascots in budget; the World
  Tour Turtles (tabigame/_kame.py Turtle) are the benchmark.
- **Toy style = real Japanese capsule-toy (gashapon) mascot figures** (owner's reference boards): original pun and
  fusion concepts (animal × food or object, little creatures with a job or a pose, transforming toys), chunky
  readable silhouettes, clean factory PVC paint with soft airbrushed blush and simple painted faces (bead eyes), about
  4–6 cm, series of 5–8 with one secret, each series on a bold gashapon display card. This cute mascot style is
  wanted for the toys (the world stays realistic). Original designs only: never copy a real product, character or
  brand. Still modelled by us in lowpix, low poly, per docs/LOWPOLY.md.
- Gacha toys are one consistent product line: every figure has the same finish (hand-painted pixel-art PVC, same
  lighting, ramps, texel density, quiet series bases), with no flat or untextured models and no noisy textures. **No
  reskins**: every catalogue entry is its own unique sculpt; a recolour exists only as a finish (gold, clear, glow…)
  of the same figure, never as a new entry. Figures may have 2–3 variants of the same entry (alternate colourway,
  accessory, face expression), pulled at random. Check with art/lowpix/figures/audit.py. Most toys stand on their own
  (feet, bowl, plate, own base); a stand or diorama only where the toy really needs one.
- **Never use AI-generated models** (Meshy, Tripo, Rodin/Hyper3D, Luma, CSM, "made with AI", photo-to-3D services,
  AI mass uploaders): only models hand-made by real artists. **Never use scans** (photogrammetry, LiDAR, Object
  Capture, Polycam, Scaniverse… anything scanned). Check every
  Sketchfab source with `python3 tools/ai-check.py` (zero REJECT; look at every REVIEW yourself).
- **High-res pixel art textures only** (owner, latest): fine pixels at a high texel density (standard in docs/ART.md),
  never chunky or blurry low-res surfaces, above all floors and walls up close. Interiors are lit to look beautiful
  and realistic (indirect light, AO, soft shadows, plausible materials and reflections), scaled by quality preset.
- Nothing visible may be untextured, a flat single colour, voxel-era vertex colours, speckle noise, a blown-up blurry
  painting or an obvious tiling repeat; texel density stays consistent across the game. Check with
  `tools/slot.sh node tools/look-audit.mjs [filter]` (shots/audit/AUDIT.txt).
- Speech, subtitles and chat choices are plain floating text (hard ink outline, no paper box).
- **All printed 2D art uses real images**: posters, flyers, packaging, product and drink labels, boxes, menus,
  magazines, signs with pictures, website product shots and gacha display cards are built from real photographs
  (toy cards: a render of the actual in-game toy on a real photo backdrop). Never drawn, procedural or AI-generated
  imagery. **Gacha cards and toy posters (owner, latest): built ONLY from real-photo cut-outs of themed things (ocean water,
  waves, splashes, bubbles, fruit, leaves, stationery…; never photos of Japan scenes), real-photo backgrounds, our toy
  renders and pixel-font text. ZERO 2D art drawn by us (no drawn props, patterns, wavy lines, stripes, screen tone,
  drawn water), no generic "AI" backgrounds, no hanging confetti / bunting / pennants.**
  **Posters and cards copy the owner's gashapon boards (scratchpad/ref_gacha) closely, ALL TEXT IN ENGLISH, ALL
  TEXT IN PIXEL-ART FONTS** (Alagard, Pixelify Sans, high-res OFL pixel fonts), crisp at the pixel grid; only hard pixel
  outlines and hard offset shadows, no glow, gradient, bevel or slick AI-style effects; every poster a unique layout.
  **Titles are 3D, hand-painted and interactive (owner, latest; overrides "flat" for titles only):** series names and
  big call-outs are chunky extruded blocks built from the glyphs of our own hand-pixelled display face GG Display
  (tools/fonts/gg_display.py: bitmap source, 16 px caps, specimen shots/cards/font_specimen.png; served flat as the
  pixprint face 'ggd'), modelled and rendered in Blender (tools/logo3d.py + art/blender/logo3d/scene.py), painted like
  the toys (brush-stroke colour per letter, facet-edge rim, painted side colour, chipped wear) under the toy key light;
  letters tilt, bounce, stack, overlap and lean, and the series' own toys sit on, peek behind, hold or push them in the
  same scene (real contact shadows); every layout different; pixel-snapped at card scale with an ink die-cut keyline.
  **Every series title has its own themed colours and hand-painted themed texture, never a default yellow / cream**
  (tools/logo3d_themes.py: crab shell with a cream underside, turtle scutes, sushi toppings on rice, bath tiles, oiled
  wagasa paper with ribs, beetle carapace bands...), with small sculpted themed bits growing off the letters (claws,
  legs, flippers, drips, steam puffs, umbrella ribs, a skewer...); painted brushwork only, no CG gradients, chrome or
  glow. Kickers are flat GG Display; small text (legend, warnings, barcode) uses a high-res pixel font (never 5x7). Still no glow, gradient, chrome, Word-Art
  bevel or "AI" 3D text presets. Real public-domain / CC0 vintage posters are welcome (brands retouched out); the rest is designed to a
  graphic-designer standard with pixel fonts only (see the font rule), on real scanned paper
  (folds, fade, tape, wear). Typography stays flat (no glows, gradients, bevels). All names and brands are original
  (real ones are genre reference only). Paper UI uses real paper scans too.
- **Posters (owner, latest; overrides the poster rules above, gacha display cards keep the 3D-title card pipeline):**
  redesigned from Canva templates (human-designed layouts; never Canva's AI image generation), filled with renders of
  our real in-game models, real photos and English text, exported and baked as in-game textures. In-world sign text
  is crisp, well-set and polished, in pixel fonts set like real signs (good layout and spacing, pixel-snapped, no blur).
- Dialogue and all game text sound human: natural, specific, in-character; no "AI" jokes, quips, puns-for-puns'-sake
  or filler. Features, apps, machines and areas unlock one by one through play.
- No overlapping / interpenetrating parts (fingertips through palms, props through shelves, z-fighting); no models
  made of stacked blocks or primitives; nothing untextured. Hunt them down, every pass.
- Real photos come from Google Open Images (CC BY), Wikimedia Commons (PD / CC0 / CC BY) or other CC0 sources, never
  AI images, each credited in CREDITS.md and public/CREDITS.txt.
- **People (owner, final word):** the blocky human version from before commit dbbc66b, made a little more detailed
  (slightly more polys, better textures). Never change the rig (skeleton, bone names, bind pose, clips, attach points)
  and never swap the human model generation again without the owner asking.
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
