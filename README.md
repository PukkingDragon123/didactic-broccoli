# GACHA GARAGE

A cozy first-person **capsule-toy shop game**, set on a quiet Shōwa-era Japanese back street at golden hour.
Grandpa has left you his old garage: a key, a notebook and a lot of dust. Clean it up, fix his machines,
feed the stray cat, roll the shutter up again and run the happiest gacha corner in the neighbourhood.
Crank the handle, twist the capsule open, put the tiny figures on display, and build a museum.

Models, textures and people are generated in code at runtime. Music and sound effects are recorded files
(`public/audio`), and the shop's flyers and posters use real stock photos (`public/img/photos`); every one is
credited in [CREDITS.md](CREDITS.md).

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

**The story start.** You arrive in the lane with Grandpa's garage key. A single objective card (and a
waypoint) tells you what to do next. Behind the shutter the shop is a mess:
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

**Flyers and posters.** Fifteen pixel-art sheets (150 x 212 px) made from real stock photos (Google Open
Images, CC BY 2.0), dithered down to a few colours, with the game's own 3D models rendered on top as
outlined sprites and a hand-made 5 x 7 bitmap font:
- nine meme flyers (Such Capsule, Nope / Yep, Distracted Customer, Galaxy Collector, One Does Not Simply,
  Me at 3am, Expectation / Reality, New Manager, But It Was Me), all original parodies starring the game's cast;
- six promo posters (Grand Reopening, Kaiju Snack Time, Uchu Neko Station, Spring Sweets, Super Secret,
  Glow in the Dark), with the odds and prices taken from the game data.

The top sheet of the stack in your hands shows the design you hand out next. People stop, read the actual
sheet, laugh and say something about that design. The promo posters are taped up on the garage piers (once
the shop is open), the block wall across the lane, Mikawa-ya's window and the garage wall.

**The loop.** Coin on a rope, crank, capsule, reveal. Display the figures or sell the duplicates. Refill
sold-out machines from the PC, upgrade them, and buy new machines, tools and lucky charms. Any pull can
roll a special finish (Clear, Metallic, Glow-in-the-dark, Gold, Aurora, Diamond).

**Collectibles.** 20 series and 160 figures, each with a printed pixel-art banner (daishi) in its machine.

**GACHA-MART.** The old PC opens an early-2000s web store with big, clear cards, for machines, capsule
refills, upgrades, goods, the museum, second-hand figures, selling and your collection book.

**The museum.** Complete a series and rent the Shōwa-era shop behind the garage. Fill it with displays,
diorama sheets and decorations; visitors pay, look around, take photos, buy price-tagged figures and
leave tips.

**The lane.** Houses, walls and alleys, utility poles and wires, vending machines, Mikawa-ya, pigeons,
and railway underpass tunnels at both ends where trains rumble across. The tunnels are pitch black a few
metres in; people walk out of the dark.

**Bizarre touches.** An affectionate nod to a certain long-running manga about bizarre adventures. The
characters, art and names are all original:
- menacing ゴゴゴ / ドドド / ドン! sound effects pop up for ultra and secret pulls;
- dramatic poses: lucky customers and the menu crew strike them;
- the Bizarre Pose Club (奇妙なポーズ部), a new 8-figure series: The Pointer, Leaning Salaryman, Menacing
  Calico, Pompadour Senpai, To Be Continued, Phantom Partner, the Time-Stop Pocket Watch and the secret
  Ghost Alley Girl;
- "TO BE CONTINUED" freeze frames end the intro and the reopening;
- the ghost alley beside Mikawa-ya: a see-through girl and her ghost cat ask you to walk them to the Jizō
  shrine. Don't look back. Look back and something drags you out of the alley; make it and the shrine
  leaves you a rare capsule;
- the old pocket watch (Mikawa-ya, ¥4,000) stops time for five seconds. A negative-colour shockwave goes
  out, the world turns grey and holds still, and you can still walk around. It needs a minute to wind up;
- the lines people say on the street ("Yare yare... the train is late again.").

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
- Audio: Web Audio with recorded sound effects, ambience and music (`public/audio`), streamed background music
  with crossfades and ducking (`src/core/bgm.js`), a garage radio playing real tracks through a little speaker filter,
  and a synthesised version of every sound as the fallback.
  - Credits: music by Kevin MacLeod (incompetech.com, CC BY 4.0) plus CC0 / public-domain tracks, jingles and sounds
    from Kenney, OpenGameArt and pdsounds.org; the full list with sources and licences is in [CREDITS.md](CREDITS.md)
    (shipped as `CREDITS.txt`).
- Dev pages:
  - `viewer.html?series=mochi` (models);
  - `viewer.html?props=quest` (props);
  - `people.html?show=all` (people);
  - `icons.html` (pixel icons);
  - `flyers.html?w=450` (flyers and posters; `node tools/export-flyers.mjs <dir> 4` saves them as PNGs).

```
src/core      renderer, input, touch, physics, audio, music (radio), bgm
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
