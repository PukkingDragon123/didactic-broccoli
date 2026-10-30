# Gacha Garage: project rules

First-person gacha-shop sim (Three.js + Vite). Shōwa-era Japanese back lane, voxel / low-poly 3D, pixel-art 2D.

## Look and feel (the owner's explicit rules)
- **Never use a white hover highlight / rim / outline glow** on interactables or anything else. Hover feedback is the
  crosshair hint text only.
- **All particles are 2D pixel-art sprites** (hand-pixelled frames, nearest filtering, stepped animation). No soft
  round glows, no smooth gradients, no additive blobs.
- 2D art is pixel art: no text effects (glows, gradients, bevels), no "AI-looking" slick posters, no circles-and-
  sparkles filler. Fonts: Alagard (UI), the 5x7 bitmap font for tiny text, DotGothic16 for kana.
- 3D art is chunky voxel / low-poly with pixel textures. First-person arms are blocky but connected and flexible.
- Real photos used for 2D backgrounds come from Google Open Images (CC BY), credited in CREDITS.md.
- People talk in 8-bit voices (src/people/voice.js).

## Code
- New features go in their own modules; drop-in features are `src/plugins/*.js` exporting `install(game)`
  (loaded automatically, run once the whole game exists). Per-frame work: `Game.updaters.push((game, dt) => ...)`.
- Feature save data: `ensureState(game, key, defaults)` from src/game/stateExt.js (one top-level key per system;
  old saves must load).
- Cross-system talk through `game.events` (emit / on).
- Test headless: `node tools/run.mjs "index.html?autotest&q=low" steps.json`, `tools/shoot.mjs`, `window.dbg`
  (src/debug.js). Chromium is preinstalled; never run `playwright install`.
- `npx vite build` must pass and the game must boot without console errors before committing.
