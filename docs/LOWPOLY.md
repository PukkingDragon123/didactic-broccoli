# Low-poly modelling and photo-bash texturing (house method)

The owner's direction: we model the things ourselves, low poly and stylised, and texture them by photo-bashing real
photos. Downloads are reference only. Never scans, never AI models. Tool: lowpix (specs in art/lowpix/<area>/,
`python3 -m lowpix build|render|match|photo`, read its docs/SPEC.md, docs/STYLE_GUIDE.md and docs/PHOTOBASH.md).

## 1. Reference first
- Collect 3–6 real photos of the actual object: front, side, top, a close-up of the material. Google Open Images
  (CC BY), Wikimedia Commons (PD / CC0 / CC BY), Poly Haven textures (CC0). Note the licence; credit what ships.
- Measure it: real size in mm, and the proportions of the big parts (head : body, height : width). Write them down
  in the spec as comments. Proportion is what makes a model read as real; get it from the photo, never by eye.

## 2. Block out the silhouette
- Start from the 3–5 biggest masses (lofts, tapers, discs, boxes in lowpix). Check the silhouette from front, side,
  three-quarter and top against the reference photos (`lowpix render`, or `lowpix match` to overlay a photo).
- A good low-poly model reads from its outline alone. Put polygons where the outline curves (rims, shoulders, heads,
  handles); keep flat areas flat (one quad). Round things: 8–12 sides for small, 12–16 for hero curves.
- No stuck-together primitives: parts flow into each other (lofts with shared rings, bevelled joins, a small fillet
  where two parts meet). Every part has a reason; no floating details.

## 3. Refine within budget
- Budgets (CLAUDE.md): toy ≤1.5k tris, small prop ≤1k, furniture ≤3k, animal ≤3k, person ≤2.5k, machine ≤3k.
- Spend triangles on silhouette and the focal area (a face, a label, a handle); spend none on what the texture can
  show (seams, stitches, panel lines, buttons, small grooves: paint them).
- Bevel only the edges that catch light at viewing distance (one chamfer segment). Kill invisible faces (bottoms
  that sit on a surface, insides).
- Soft things (plush, cushions, food): rounded lofts with gentle bulges and pinched seams; never perfect spheres.
  Hard things (tins, tools, appliances): crisp planes, chamfered edges, real thickness on rims and lids.

## 4. Photo-bash the texture
- Material layer: `op: "photo"` with real material photos (fabric weave, felt, fur pile, plastic, enamel, wood,
  metal, paper, food surfaces). Use `mode: "colour"` for a realistic finish (the photo's own colours, relit by the
  painted light); `mode: "detail"` when the colour comes from hand-picked ramps (e.g. a dyed plush).
- Projected detail: for faces, labels, prints, packaging, use `lowpix match <spec> <landmarks> --image ref.jpg
  --project photo` to paint a real reference photo onto the model 1:1 from that view; clean up the projection edges
  and stretched sides by hand-painted strokes. Remove baked shadows and highlights from projected photos first
  (de-light): even out the brightness so the game light does the shading.
- Hand-paint on top: ramps with 5–7 steps, a key light from upper left, ambient occlusion in creases, a light rim on
  edges, wear on corners, dirt in recesses, stitches and seams as painted lines. Keep the saturation of the
  reference; a model must never look greyer than its photo.
- Texel density per CLAUDE.md, nearest filtering; then the pixel-hd finish (crisp pixels, no speckle noise).

## 5. Check before showing anyone
- Render front / three-quarter / top next to the reference photo at the same angle. Ask: does the outline match?
  Are the proportions right? Is the colour as rich as the photo? Does anything look melted, blobby, faceted where it
  should be round, or like boxes stuck together? If yes, fix it; don't ship it.
- In game at real viewing distance (shelf, hand, display top) and at 0.5 m.
- `look-audit` clean, triangle budget met, `ai-check` clean, credits written.

## Common failures (all seen in this project; never again)
- Scans decimated to a budget: melted, washed-out blobs. Never scans.
- Converting a downloaded model and calling it done: colours wash out, topology turns to mush. Model it ourselves.
- Flat single-colour parts, speckle noise, a blurry blown-up texture, a repeated tile.
- Boxes stuck together (the old tin robot), cartoon proportions, chibi heads.
