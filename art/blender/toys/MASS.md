# Mass production: one spec file, one command

A new toy series is one spec file, `art/blender/toys/<series>/series.json`, and one command:

```sh
python3 -I tools/newseries.py <series> --bg      # background, log: shots/series/<series>.log
python3 -I tools/newseries.py <series>           # the same in the foreground
```

It runs every step that is not done yet (resumable: state in `_build/<series>/newseries.json`; a figure is rebuilt
only when its script, its spec entry or `lib/parts.py` changed):

| step | what |
| --- | --- |
| scaffold | `<id>.py` per figure from the template (an existing script is never overwritten: custom touches stay) and the catalogue entry `src/data/series/<series>.js` (generated: names, price, items, gimmick sounds) |
| scene | the card's scene photo: `card.scene` (an Open Images id) or the first match of `card.scene_query` (Open Images labels, CC BY 2.0, unused), pinned into the spec and credited in CREDITS.md / public/CREDITS.txt. Look first: `--scenes` writes a contact sheet `shots/series/<series>_scenes.png` |
| build | `make.sh <series> <id> --faces` (two figures at a time, `GG_SERIES_JOBS`), with face close-ups for the audit; pack.mjs registers the GLBs in the manifest, `--faces` the alternate faces |
| card | toy renders, the 3D title (logo3d.py with the spec's `title` theme) and the card (`public/img/print/cards/<series>.webp`, `shots/clone/card7_<series>.png`) |
| audit | `shots/series/<series>_faces.png` (faces_audit.py) and `art/lowpix/figures/audit.py <series>` (px/mm FAILs are known) |
| sheet | the review sheet `shots/series/<series>.png` (look.mjs line-up: front, back, three gimmick frames; with the card) |

`--only build,card`, `--force card`, and `--rebake-card <any series>` (toys, title and card again: e.g. after a
remodel) do parts of it. Check the sheet; fix a figure in its spec or script and run the command again.

## The spec

```jsonc
{ "id": "yuubin", "order": 74, "name": "Tide Pool Post", "jp": "しおだまりゆうびん", "price": 300,
  "tagline": "...", "taglineJp": "...", "concept": "...", "themes": ["retro", "cute"],
  "card": { "bg": "#eef2ec", "accent": "#c8281e", "text": "#1e2a3a", "accent2": "#2a6a9a", "pattern": "dots", "kind": "...",
            "layout": "right",               // left | right | top (every position overridable: logo, hero, back, front, ...)
            "col": "#c8281e", "fill": "#f6eedc", "lines": ["TIDE POOL", "POST"], "kick": ["...", "..."],
            "burst": ["FIRST", "CLASS!"], "price": "coin", "hero_id": "yadokari", "calls": [["TEXT", 0.4, 0.3]],
            "scene_query": ["Rock", "Tide pool"], "cutouts": ["starfish_0", "oyster_1"], "sw": ["#c8281e"] },
  "capsule": ["#c8281e", "#f6eedc", "#2a6a9a", "#e8c040"],
  "title": { "v": [{ "f": "#c8281e", "L": [{ "k": "dab", "p": [-0.2, 0.76], "r": 0.08, "c": "#f08a80" }], "s": "#7a160e", "chip": "#f2b0a0" }],
             "bits": [{ "k": "rivet", "on": "all", "n": 3, "paint": "#e8c040" }] },   // tools/logo3d_themes.py vocabulary
  "defaults": { "frames": 60 },
  "figures": [ { "id": "fugu", "name": "...", "jp": "フグ", "rarity": "common", "species": "puffer", "desc": "...",
                 "gimmick": { "text": "Puff", "sfx": [[0.2, "toyTap"]] },
                 "palette": { "scale": "#d8c070", "capcloth": "#2a3a6a" },   // region -> colour (or {col, brush, base})
                 "face": { "spread": 0.9, "size": 0.1, "eyes": "sleepy" },    // over the family's face, in head radii
                 "face_style": { "eye": "round", "iris": "#e8d470" },         // a lib/face.py STYLE for a new species
                 "detail": 1.5,                                               // every piece's budget x (secrets)
                 "build": [ ["fish", { "kind": "puffer", "H": 6.6, "zc": 12 }],
                            ["cap", { "kind": "post", "part": "cap", "at": [0, 0.8, 17.8] }],
                            ["base", { "kind": "wave", "column": true, "part": "stand" }],
                            ["gim", "inflate", { "bone": "body", "f0": 8, "f1": 40 }] ] } ] }
```

`build` runs `lib/parts.py` functions in order; a string like `"HAND_R"` or `"HAND_R+0,-1,2"` is an anchor the
family set (plus an offset), resolved when the step runs. `["xform", {deg, axis, pivot, move}]` turns / moves
everything built so far (a figure lying on its back, a whole figure shifted back on its base).

## The parts library (`lib/parts.py`)

Real modelling with the lib (lofts with edge loops, subdivision cages, a sculpt baked onto the faceted game mesh:
FACET.md); every figure faceted (`GG_FACET=1` is set by parts.py). Proportions come from the spec and a per-figure
seed jitters each loft, so no two sculpts match (no reskins).

- Families: `mammal` (sit / stand / pop out of the base; ears point / round / long / floppy / tiny; tails thin /
  bushy / puff / stub / flat; snout length, brows, cheeks; `torso=False` under a cloak), `bird` (beak crow / hook /
  flat / short / long; wings folded or used as arms; owl disc and tufts; crest), `fish` (koi / slim / puffer with
  spines / seahorse), `crab` (claw sizes, fiddler, hermit; pinching finger bones), `insect` (head, thorax, abdomen,
  six legs, arms, antennae, wings), `reptile` (`kind='turtle'`: tabigame/_kame.py's realistic Turtle with its paint
  and face; `kind='lizard'`).
- Clothing: `cloak` (folds, tattered hem), `hood` (a thick cowl on its own bone: `hood_back` flips it), `sleeves`,
  `cap` (post / beret / boater), `bag`, `scarf`.
- Props: `scythe`, `lantern`, `book`, `letter` (stamp and postmark painted), `parcel`, `hanko`, `cup`, `can`,
  `postbox`.
- Bases: `base(kind=)` disc / mound / rock / puddle / wave (+ a water column) / wisp / coral; `part="stand"` keeps
  it still while the body moves.
- Gimmick presets: `hood_back`, `seq` (free keys), `wave`, `hop`, `flap`, `spin`, `inflate`, `pop`.
- `cage()`: a form the facet collapse would mangle (long straight walls under a soft dome) keeps its cage as the game
  mesh.

A figure's own touches go below `T = build(Toy(__file__))` in its script: extra pieces (`T.add(part, ...)`), paint
passes (`T.paints.append(fn(P, pt, sh, T))`), keys (`T.gim(fn(k, T))`), bones (`T.bone(name, at, parent)`). Look
at a figure before a full build: `GG_CLOSE=1 tools/blender.sh art/blender/toys/<series>/<id>.py --preview`.

Examples: `shinigami/` (Reapers' Day Off) and `yuubin/` (Tide Pool Post).
