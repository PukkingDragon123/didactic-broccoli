# Toy gimmicks: the data API

How a Blender toy series (art/blender/toys/<series>/, src/data/series/<series>.js) asks for each gimmick. The
modelling side uses `art/blender/toys/lib/` (`kit.py` for the shared hardware and points); the game side is
`src/game/figureGimmicks.js`, `keychains.js`, `lightup.js`, `playsets.js`, `toys.js` (pull-back), wired by
`src/plugins/toyKit.js`. Build with `art/blender/toys/make.sh <series> [ids] [--fast] [--repaint] [--card] [--faces]`.

Every gimmick works in the three places a figure lives: in your hand (LMB, or a click while inspecting), on a display
shelf (RMB with empty hands, not on price-tagged sale displays) and lying loose (RMB).

Faces follow the owner's drawing (docs/ref/faces_owner.png): paint them with `lib/face.py` (the expression set is shown in
shots/blender_toys/faces.png; give each figure in a series its own face). Eyes are two small solid
ink dots, a little uneven. The mouth is ONE marker stroke: `upturn`, `line`, `dash`, `frown`, `grin` / `gritted` (teeth filled white,
ink separators), `shout`, `tongue`, `smug`, `wobble`, `pout`, `drool`, `w` or `o`. Eyes: `dot`, `big`, `tiny`, `happy`, `squeeze`,
`sleepy`, `dizzy`, `swirl`, `wink`, `side`, `teary`, `shock`; `brows('angry' | 'worried' | 'raised')`. The face sits low on the head. There are no modelled eyeballs, whites, irises, highlights or lids. On a dark
body, dot in a light ink (`ink='#efe4c8'`).

## 1. Press clip (`gimmick`)

The figure's rig has an action named `gimmick` (lib/rig.py `with R.action('gimmick'):`). A press plays it once and
the figure returns to rest.

```js
gimmick: { text: 'Transform', sfx: [[0.15, 'toyFold', { n: 6 }], [0.53, 'toyTap'], [1.0, 'toySnap']] }
```

`sfx`: `[seconds, sound, opts]`. The sounds are `toyClick`, `toyFold {n, gap}`, `toySnap {f, v}`, `toyRatchet {n, gap}`,
`toyBuzz {dur}`, `toyTap`, `chainJingle {n}`, `ledClick {on}`, plus any sound in src/core/audio.js (`drawer`, `tapeRip`, `whoosh`, ...).
Check the clip with the figure script's `--clip` mode (`lib/rig.py check_clip`): it must report 0 frames.

## 2. Keychain version (`keychain`)

The figure comes on a ball chain: a series (`keychain: true` on the series object makes the whole series keychains)
or an item (`keychain: true`, or `{ chain: 95 }` for the chain length in mm; 95 is the default).

- **Model:** a screw eye on top of the head, where the chain clips on:
  ```py
  import kit
  kit.eyepin(F, at=(0, y, top_z), bone='head')   # the loop's plane faces Y; axis='X' turns it
  ...
  R = make_rig(); kit.points(R)                    # writes pt_chain (and any other kit points) into the rig
  ```
  Without a `pt_chain` the chain clips to the top centre of the figure.
- **Game:** the hardware is the shared kit `_kit/keychain` (art/blender/toys/_kit/keychain.py: a nickel bead, the
  connector and a brass cup hook). The chain is a verlet rope of beads, drawn as one instanced mesh per chain.
  - Lying loose or standing on a shelf, the chain drapes from the screw eye.
  - In your hand it dangles and swings.
  - On a display slot it hangs from a cup hook under the board above, when the figure plus its chain fits; otherwise
    it stands.
  - In your hand, LMB (or F when the figure also has a press gimmick) clips it to your bag. You can carry up to 3
    (saved in `state.keychains.bag`); they swing at your hip, and with empty hands you look down and LMB to take one
    off.
  - World hooks: `game.keychains.addHook(id, object3d, localPos)` makes any hook hold one (saved in
    `state.keychains.hooks`). This is for the world owners, e.g. a key rack or a pegboard.
- **Budget:** the screw eye is about 40 tris of the figure's 1.5k.

## 3. Playset parts (`playset`)

Figures that each come with a piece of a bigger set (ladder sections, track, a stall) and join up when displayed
side by side.

```js
playset: { set: 'hashigo', in: 'in', out: 'out' }
```

- **Model:** two points in the GLB. `pt_in` is where this part sits on the previous one; `pt_out` is where the next
  part sits on it (`kit.connector(F, 'in', at, bone=...)`, `kit.connector(F, 'out', at, bone=...)`, then
  `kit.points(R)`). Model the peg and the socket into the sculpt so the joint reads, and keep `pt_in` of every part
  on the same spot relative to its peg.
- **Game** (src/game/playsets.js):
  - On one display board, parts of the same `set` in neighbouring slots join in slot order. The leftmost part stays;
    each next one slides over and clicks its `pt_in` onto the previous part's `pt_out`. This works upwards (a ladder)
    or along the board (a track), as long as the assembly fits the slot height.
  - Taking a part out re-joins the rest.
  - Each part still plays its own press clip where it stands.

## 4. Light-up parts (`light`)

Parts that light up: a lantern, a beacon, a firefly's tail.

```js
light: { part: 'lamp' /* or ['lamp', 'eyes'] */, color: '#ffd890', mode: 'press', dur: 4, blink: [0.5, 0.5] }
```

- **Model:** `F.part('lamp', lo, highs, bone=..., kind='led')`. Paint the part as the lit colour looks in daylight (a
  warm pale paint); the game shows it matte when off.
- **Modes:**
  - `press` lights it for `dur` seconds.
  - `toggle` switches it on each press.
  - `dark` lights it whenever the room lights are off.
- `blink` (optional) is `[on, off]` in seconds while lit.
- **Game** (src/game/lightup.js): when lit, the part is an unlit, brightened copy of its own painted pixels laid over
  it. That holds on the merged mesh and on the live rig while a clip plays. There is no bloom, no blob and no extra
  scene light.
- The figure-wide **glow-in-the-dark finish** (`glow` in src/data/finishes.js) already works on every Blender
  figure. Pale paint glows strongest, so leave the parts meant to glow light in the paint.

## 5. Pull-back / wind-up (`pullback`)

```js
pullback: { clip: 'run', speed: 0.8, dist: 1.0, wind: 0.45, text: 'Pull it back and let go', sfx: 'toyRatchet' }
```

- **Model:** a looping action named `run` (wheels turning, legs scurrying), keyed so frame 0 equals the last frame.
  The figure stands on wheels or feet at its origin, facing −Y in Blender (forward in the game).
- **Game** (src/game/toys.js):
  - In hand, LMB sets it down on the surface you aim at. It slides back while the spring winds (the `run` clip
    reversed, a ratchet), then runs forward with `run` looping, slowing over about `dist` metres, and stops dead at
    a table edge or a wall.
  - Lying loose, RMB starts the same run from where it lies.
  - On a shelf it revs in place for a moment.
- A figure can have both `pullback` and a `gimmick` clip. The press clip then plays only while you inspect it, or on
  a shelf.

## 6. Figure variants (automatic)

Every figure comes in up to three versions of the same sculpt, mass-produced with no per-figure work, pulled at
random next to the finish (src/data/variants.js `rollVariant`, called by `rollCapsule`) and shown as a variant tag
(the reveal caption, the hand tag, the shelf plaque, the hotbar picture):

| id | name | weight | how |
|---|---|---|---|
| `std` | Standard | 6 | the figure as built |
| `alt` | Alt Colour | 3 | runtime: the atlas's main body colour (its strongest chromatic hue) turned round the colour wheel by a per-figure amount; ink, greys, whites and other hues (eyes, details) stay (src/figures/lowpix.js `hueTex`) |
| `face` | Happy Face / Sleepy Face / Winking | 2 | a repainted atlas `public/models/lowpix/figures/<series>/<id>.face.webp` (lossless; shipped as a sparse patch over the GLB atlas, tools/webp-glb.mjs) with an expression picked per figure from the face kit; only figures listed in src/figures/variants.manifest.json |

- **Batch the faces:** `art/blender/toys/make.sh all --faces-only` (every series; or `make.sh <series> [ids] --faces`
  / `--faces-only`). Each figure script runs again on its last unwrap (`--repaint`) with `GG_VARIANT`
  (`{"texture":"face","face":"auto"}`): lib/fig.py sets lib/face.py `EXPR` (`happy` ^ ^, `sleepy` closed, `wink`
  every second eye shut; it applies to `fc.eyes()` and to single-dot eyes) and writes only `<id>.face_col.png`, no
  GLB. A repaint that changes nothing (a face not drawn with face.py) or that does not match the GLB's atlas (a stale
  unwrap) is dropped from the manifest.
- **Records:** `variant: '<id>'` next to `finish`, only for a non-standard one (`v` on display slots,
  `key|finish|variant` in storage); old saves read as the standard figure. Meshes: `makeItemMesh(key, finish,
  { variant })` → `lowpixMesh(item, finish, variant)`.
- **Override** (rarely): a series item may list its own `variants: [{ id, name, weight, texture?, hue?, tint?,
  show?: [node], hide?: [node] }]` (variants[0] standard; `show` nodes are hidden on the other variants).
- Check: `tools/slot.sh node art/blender/toys/look.mjs <series>/<id> out.png --variant alt`.

## Adding a gimmick kind

Lib features (new kit parts, points, clip helpers) are added by the lead modeller; ask through the coordinator.
Runtime behaviour plugs into `onFigurePress(fn)` (src/game/figureGimmicks.js) and `onFigureMesh(fn)`
(src/figures/lowpix.js).
