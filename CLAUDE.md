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
- 3D art is **blocky voxel, made high resolution and polished** (the owner's choice, docs/ART.md): the old voxel
  look, but with finer voxels where detail matters, detailed high-resolution textures on the block faces, modelled
  small parts and careful lighting. Blocky, not too blocky. Never stuck-together primitive blobs, never generic.
- People and toy figures share one style: blocky box-segment humans (src/people), "blocky but not too blocky",
  with detailed painted textures. First-person arms are blocky but connected and flexible.
- Speech, subtitles and chat choices are plain floating text (hard ink outline, no paper box).
- Product labels, posters and gacha display cards are detailed art; drinks and products use real photographs. All
  names and brands are original (real ones are genre reference only).
- Real photos used for 2D backgrounds come from Google Open Images (CC BY), credited in CREDITS.md.
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
