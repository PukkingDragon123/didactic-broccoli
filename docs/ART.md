# Gacha Garage art bible

**The direction (the owner's choice, November 2026): the blocky voxel look, high resolution and polished.**
The owner tried the low-poly cel-shaded, HD pixel-art and realistic downloaded-asset directions and preferred the
original voxel version (playable at the commit before the art overhaul, 06b6dbe). The game is back on that code; the
job now is to raise its quality without losing the look.

## 3D
- **Blocky, not too blocky.** Keep the voxel construction and its silhouettes, but use finer voxels where detail
  matters (faces, hands, signage, small parts, things you hold) and coarse ones only for big plain surfaces.
- **Detailed, high-resolution textures** on the block faces: painted detail (grain, wear, seams, print, stains placed
  by rule) at a density where it reads crisp up close; real photographs may be the base for surfaces and print.
  Nearest filtering for the pixel look, mipmaps so nothing shimmers.
- **Polish:** modelled small parts (handles, hinges, bolts, cables), baked AO, careful lighting, no ugly seams, no
  stuck-together primitive blobs, nothing generic or "AI-looking".
- **People and toy figures** share the human model's style: blocky box-segment bodies with good proportions, detailed
  painted faces and clothes. Toy figures are made like the people (a figure is a small blocky character or thing with
  detailed texture), not as smooth sculpts.
- **Hard rules:** no white hover highlight or rim, particles are 2D pixel sprites, no soft glow blobs.

## Update: mix low-poly with voxel (the owner's newest direction)
- The voxel version's detail and realism is the anchor; low-poly is mixed in where it helps: curved and round things
  (vehicles, bottles, cans, pipes, wheels, animals, tree limbs, people's softer forms) can use clean low-poly geometry
  with the same detailed pixel-art textures, next to blocky voxel buildings and props. The low-poly kits and models
  from the earlier phase are in git history (3648fb0: src/vehicles, src/props/kit, src/animals, src/town/foliage.js,
  src/kit) and may be ported and restyled to sit with the voxels (same texture style, same lighting).
- Never a clash: one palette, one texture style, one light; blocky stays the dominant read.

## Update: not cartoony, realistic pixel-art textures (the owner's newest words)
- "Don't look cartoony; the texture is super realistic and detailed pixel art; toys too." Textures everywhere (world,
  people, animals, toys) are realistic in colour, material and wear (real photos as the base where possible),
  rendered as detailed, crisp pixel art: natural, slightly muted colours, real shading and grime, no flat cartoon
  fills, no thick outlines, no saturated candy colours. Lighting is natural, not toon.

## 2D
- UI is paper in detailed pixel art (src/ui/paper.js). Speech is plain floating text.
- Drinks, products, posters and display cards are detailed art built from real photographs where possible, with
  original names (no real brands). Fonts: Alagard, the 5x7 bitmap font, DotGothic16.

## Sources
Real photos from Google Open Images (CC BY), CC0 textures (ambientCG, Poly Haven) and public-domain art are fine as
the base for textures and print; credit everything in CREDITS.md.
