# Faceted low-poly: the toy line's style

The owner's direction: "a lot more low poly and more detail" — then "still low poly, just a little higher; the
high-detail models get more count". Every toy is a **visible low-poly**: crisp flat-shaded faces and chunky
deliberate planes, wearing a much richer **hand-painted** 1024 px texture: brush strokes that follow the form, a lit
rim along the facet edges, soft rubbed wear on hard corners, hand-brushed ink faces and stippled blush. No normal map
(it would smooth the facets away).

## The budgeting rule (polycount follows detail)

- Simple figures (a pig, a snail, a teru-teru body): about **700–800 tris**.
- Detailed figures (fingers, beaks, feathers, armour, props, multi-part mechanisms): up to about **1100**, so their
  modelled detail survives. A series' **secret**: up to **1200**.
- **Never let decimation erase a shape detail that reads at shelf distance** (ears, toes, beaks, teeth, cloth folds,
  props). The lib enforces it: every piece's collapse starts at `RATIO` (0.6) of its smooth-line budget and keeps
  more triangles, up to that budget, while any point of the form lies further than `TOL_MAX` (0.9 mm) from the facets
  (a feature was erased). Round forms are allowed to go chunky; features are not allowed to vanish. Pieces asked for
  16 tris or fewer keep them all; `facet.keeping()` keeps a whole piece (thin moving parts).
- A figure over 1100 (1200 for a secret) is trimmed: its bigger parts give up triangles in proportion.
- A figure that still lands under 600 (a simple one with a small smooth budget) is built again by `make.sh` with its
  collapse starting proportionally higher (`GG_FACET_RATIO`), once.

It is a lib-level mode (`lib/facet.py`): a figure script written for the smooth line converts by rebuilding. Sample:
henshin (`shots/blender_toys/facet_henshin.png`).

## Turning it on

- A whole series: add its id to `SERIES` in `lib/facet.py`, then `art/blender/toys/make.sh <series>`.
- One build: `GG_FACET=1 tools/blender.sh art/blender/toys/<series>/<id>.py` (or `GG_FACET=0` to force it off).
- New series are written for it from the start: model as usual (cages, sculpts, rig, gimmicks, `lib/face.py`), the
  lib does the rest.

## What the lib does (nothing to call)

| step | smooth line | facet mode |
| --- | --- | --- |
| game mesh | `tk.decimate(ob, n)` to n | from `facet.budget(n)` = `RATIO` (0.6) of n, growing toward n while a feature would be erased (the budgeting rule above; pieces asked for 16 or fewer keep them), symmetric across x = 0 when the part is, coplanar slivers merged, a vertex the collapse pushed more than 0.25 mm off the form pulled back, a body's footprint kept (its floor vertices are not collapsed), vertices in a canonical order (repeatable builds, so `--repaint` works) |
| parts never decimated | as built | reduced by `RATIO` in `F.part` |
| the whole figure | — | trimmed under 1100 tris (1200 for a secret) once every part is in (`facet.trim`, run by `F.unwrap` and `rig.check_clip`): the bigger parts give up triangles in proportion |
| shading | smooth + sharp angle | flat (one normal per face) |
| atlas | 512, colour + normal map | 1024 (double density), colour only; no tangents exported |
| bake | normal, AO, position, region, cavity | the same minus the normal map; 2 mm cage; texels whose rays missed are refilled from their 3D neighbours (no smeared streaks) |
| metal parts | `metal` material | painted chrome on a `gloss` material (a mirror finish only flashes black and white on flat facets) |
| in the game | — | the manifest entry carries `facet: 1`; `src/figures/lowpix.js` gives it a soft sheen (roughness ≥ 0.55, clearcoat ≤ 0.12, metalness ≤ 0.6) so glossy facets never flash white; the shine is painted |
| paint | ramp bands | the same ramps laid as brush strokes (`fill(..., brush=)`), then facet rims and wear (`P.done()`) |
| faces | ink dots and strokes | the same calls, painted as brushwork (bristle streaks, dry edge, pooled ends, stippled blush) |

Budget: the export log warns when a figure is very low or over its cap; `--clip` prints `[facet] figure tris N`.
Tune with `GG_FACET_RATIO` / `GG_FACET_TOL_MAX` for a build, or give a part an explicit smaller `tk.decimate` target
in its script. Thin moving parts that crumple when faceted (a compass's
legs, a hinge pin) keep their smooth-line counts and are left out of the trim:

```py
import facet
with facet.keeping():
    LEGS = {nm: leg(nm, sx) for nm, sx in (('leg_l', 1), ('leg_r', -1))}
```

The clip check allows a faceted figure `CLIP_SLACK` (0.12 mm) more than its tolerance (faceted surfaces sit a few
tenths of a mm off the smooth form at the joints). If a gimmick clip still reports a clip at a hinge the parts are pinned through (the faceted surfaces sit up to about
0.5 mm off the smooth form), skip that pair in the script's `check_clip` call with a comment saying it is the hinge.

## Paint API additions (`lib/paint.py`, facet mode)

```py
P.fill('fur', FUR, tone=sh, brush='fur')               # a preset: pvc (default), gloss, metal, fur, feather,
P.fill('robe', CLOTH, tone=sh, brush='cloth')           #   wood, cloth, lacquer   (lib/facet.py PRESETS)
P.fill('hull', RED, tone=sh, brush={'preset': 'wood', 'flow': 'along', 'axis': (0, 1, 0), 'L': 9})
P.fill('decal', INK, brush=False)                       # no strokes (a flat printed area)
who, d = P.dabs(P.region('skin'), size=1.5, spacing=1.6)   # hand-dabbed pebbles / scales / spots
P.fill('skin', GREEN, tone=sh, base=-0.3 * (who >= 0))     #   (d: 0 at a dab's centre .. 1 at its edge)
P.shift(mask, +1)                                       # move shaded texels a ramp step lighter (-1 darker)
```

Stroke settings: `flow` ('around' the form, 'down' it, 'along' an `axis`, or a function (P, N) -> directions), `L` /
`W` stroke length / width (mm), `cover` (layers), `p` (share of strokes a step lighter, as many darker; the rest drag
the tone), `tilt` (degrees of hand wobble), `cross` (a second set across: weave), `shine` (lacquer highlight),
`chrome` (painted horizon), `glaze` (share of strokes laid half a step lighter / darker: painted as the colour
between two ramp tones, the painter's thin glaze). A stroke picks up the tone where it lands and drags it along, tapered at both ends, its
tail breaking into dry bristle streaks; light strokes favour faces that look up, dark ones faces that look down.

Presets are calm on big planes (pvc / gloss: few long strokes, mostly half-step glazes). Default preset by part: `metal` on metal parts and on regions named chrome / steel / gold / brass / pin / nickel /
tin, `pvc` elsewhere. Pick per region what the material is (fur, feather, cloth weave, wood grain, lacquer).

Flat ink (`P.flat`, face.py, printed details) is never brushed, rimmed or worn: prints stay crisp.

## Faces

Unchanged API (`lib/face.py`). In facet mode a big mark (14 texels or more across: a big dot, a wide grin stroke)
paints as brushwork (bristle streaks, dry edge, ink pooled inside the mark); a smaller one stays solid ink with only
its hand-drawn edge wobble, so small faces keep two crisp uneven dots and one stroke. `blush` is hand-dabbed stipple.
Keep faces simple: dots and one stroke.

## Iterating

- `--repaint` reuses the last unwrap (when the geometry is the same) and the last bake: a paint pass takes ~15 s.
- `--fast` bakes AO with fewer samples.
- `GG_FACET_BRUSH=0` paints without strokes; `GG_FACET_BRUSH=only` shows the strokes alone on a flat tone (debug).
- Review: `tools/slot.sh node art/blender/toys/look.mjs <series> out.png --views front,back,t1.0` (the game renderer),
  then `python3 -I art/blender/toys/sheet.py facet ...` for the old / new review sheet.
- `--clip` must still report 0 frames, and the export log's stand check must say it tips at >= 8 degrees.
