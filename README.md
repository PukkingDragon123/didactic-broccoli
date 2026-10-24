# GACHA GARAGE

A cozy first-person **capsule-toy shop game**, set on a quiet Shōwa-era Japanese back street at golden hour.
Grandpa has left you his old garage: a key, a notebook and a lot of dust. Clean it up, fix his machines,
feed the stray cat, roll the shutter up again and run the happiest gacha corner in the neighbourhood.
Crank the handle, twist the capsule open, put the tiny figures on display, and build a museum.

Everything (models, textures, people, sounds and music) is generated in code at runtime. There are no
external asset files.

## Play

```bash
npm install
npm run dev       # open the printed URL (Chrome / Edge / Firefox; desktop or phone)
npm run build     # static build in dist/ with relative paths; zip it for itch.io or host it anywhere
```

| Input | Action |
|---|---|
| **WASD** / arrows | walk (**Shift** to hurry) |
| **Mouse** | look |
| **Left click** | use / pick up / place. **Hold** to crank a handle, twist a capsule, sweep, lift or repair |
| **Right click** | inspect a figure (move the mouse to turn it, wheel to zoom) · twist a capsule open |
| **1–5** / **wheel** | switch inventory slot |
| **Q** | put down what you're holding |
| **R** | rotate furniture you're carrying · change the sheet of the display you're looking at |
| **F** | move a piece of museum furniture |
| **Esc** | pause & settings |

On phones: a virtual stick and buttons, tap to use, tap the hotbar to switch items. Progress saves
automatically to `localStorage`. Shops can be shared with a code (Host shop / Join friend on the menu).

## What's inside

**The story start.** You arrive in the lane with Grandpa's notebook and the garage key. Read the notebook
in first person: his letter, a to-do list that ticks itself off, tips, a sketch of the cat, and a map of
the lane. Behind the shutter the shop is a mess:
- dust piles to sweep with a broom;
- trash bags to carry to the garbage station;
- a knocked-over machine to lift and broken machines to repair with a tool kit;
- a dead fluorescent tube and a radio without batteries;
- Grandpa's cash tin on the steel rack.

Everything you need is on sale at Mikawa-ya, the little general store across the lane. Mikan, a shy
calico stray, hides in the garage until you pour her some milk. When everything is fixed the sign lights
up for the grand reopening.

**Cutscenes:**
- the intro along the lane;
- opening the shutter;
- feeding Mikan;
- the grand reopening;
- your first customer.

All of them can be skipped by holding a button.

**People.** Low-poly, PS1-style neighbours with painted realistic faces, expressions, a procedural walk
and gestures. They chat in pixel speech bubbles. Only a few walk the lane at first; hand out flyers to
promote the shop and more come by, walk in and play your machines. Museum visitors are drawn from the same
cast.

**The loop.** Coin on a rope, crank, capsule, reveal. Display the figures or sell the duplicates. Refill
sold-out machines from the PC, upgrade them, and buy new machines, tools and lucky charms. Any pull can
roll a special finish (Clear, Metallic, Glow-in-the-dark, Gold, Aurora, Diamond).

**Collectibles.** 19 series and 152 figures, each with a printed pixel-art banner (daishi) in its machine.

**GACHA-MART.** The old PC opens an early-2000s web store with big, clear cards, for machines, capsule
refills, upgrades, goods, the museum, second-hand figures, selling and your collection book.

**The museum.** Complete a series and rent the Shōwa-era shop behind the garage. Fill it with displays,
diorama sheets and decorations; visitors pay, look around, take photos, buy price-tagged figures and
leave tips.

**The lane.** Houses, walls and alleys, utility poles and wires, vending machines, Mikawa-ya, pigeons,
and railway underpass tunnels at both ends where trains rumble across.

## Tech

- Three.js (WebGL) and Vite, in plain ES modules.
- Rendering:
  - a greedy voxel mesher with baked AO;
  - procedural pixel-art textures with bump maps;
  - a reflection probe;
  - depth-based ink outlines;
  - post-processing: GTAO on high/ultra, bloom, colour grade and FXAA.
- People: one rigidly skinned low-poly mesh and one 256² painted atlas per person (1 draw call), with
  procedural animation.
- Gameplay systems:
  - custom sphere physics for capsules;
  - Verlet rope physics for the coin;
  - A* pathfinding for visitors;
  - a cutscene engine (generator scripts).
- Audio: fully synthesised Web Audio, including a procedural radio.
- Dev pages:
  - `viewer.html?series=mochi` (models);
  - `viewer.html?props=quest` (props);
  - `people.html?show=all` (people);
  - `icons.html` (pixel icons).

```
src/core      renderer, input, touch, physics, audio, music
src/voxel     voxel model + mesher + finish materials
src/gfx       pixel textures, pixel icons, particles, thumbnails, banners
src/world     garage, town, street life, pedestrians, the cat, machine cabinets, menu signs
src/people    low-poly humans, faces, gestures, speech bubbles
src/game      game hub, inventory, story, cutscenes, notebook, machines, capsules, reveal, shop, economy
src/ui        hotbar, shop UI (GACHA-MART + Mikawa-ya), HUD styles
src/pc        CRT PC
src/museum    museum hall, displays, visitors
src/data      collectible series, props, tools, supplies
tools/        headless screenshot / test runners (Playwright)
```
