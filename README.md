# ガチャガレージ · Gacha Garage

A cozy, first-person **voxel gachapon collecting game** set in a Japanese hobby garage at golden hour.
Insert the fake coin on a rope, crank the handle, watch the capsule roll out, twist it open, and reveal
a tiny handcrafted collectible. Display it, sell the duplicates, upgrade your machines, order new series
from a retro Japanese shopping site on an old CRT PC — and eventually open your own museum that real
little voxel visitors walk through.

Everything — models, textures, sounds and music — is generated in code at runtime. There are no
external asset files.

## Play

```bash
npm install
npm run dev       # open the printed URL (Chrome / Edge / Firefox, desktop)
npm run build     # static build in dist/ (relative paths; host anywhere)
```

Click the title screen to lock the mouse.

| Input | Action |
|---|---|
| **WASD** / arrows | walk (**Shift** to hurry) |
| **Mouse** | look |
| **Left click** | use / place / pick up — **hold** to crank a handle or twist a capsule |
| **Right click** | twist a capsule open · inspect a figure (move the mouse to turn it) · rotate furniture |
| **Q** | drop / set down what you're holding |
| **R** | rotate furniture · cycle paint finish |
| **F** | move a piece of museum furniture |
| **Scroll** | change the remodel roller's finish · scroll web pages |
| **Esc** | pause & settings (graphics quality, volumes, sensitivity, FOV, hints) |

Progress saves automatically to `localStorage`.

## What's inside

**The loop.** One rusty Shōwa-era 100-yen machine with a fake coin tied to a rope. Pull, open, discover,
display or sell. Duplicates go in the 買取BOX by the PC, or into the storage bin to sell later in bulk.
When a machine sells out (売切 flips up), order a refill box on the PC, carry it over and pour the capsules in.

**Collectibles.** 12 series, 96 figures. Each series has common, uncommon, rare, ultra-rare and
super-secret items:
もちもちアニマル · ミニチュア食堂 · 傘コレクション · 昭和レトロ家電 · コンビニライフ · ミニチュアのお部屋 ·
ゆるい妖怪 · おんせんどうぶつ · ダジャレ大作戦 · 怪獣おやつタイム · 宇宙ねこステーション · 開運おまもり.
Any pull can also roll a special finish: Clear, Metallic, Glow-in-the-dark (turn the lights off!), Gold,
Aurora or the ultra-rare Diamond.

**Reveals.** The reveal is physical, not a pop-up. Capsule halves fly off and bounce, the mini-book
flutters to the floor, and each rarity gets its own light beams, sparkles, confetti, coin showers and
sound. A secret makes the machine shake as it dispenses, the capsule leaks light while you twist it, and
the garage goes dark before the burst.

**Progression.** Machine upgrades all change the world visibly:
- a faster crank gear (the handle colour changes, then a motor appears);
- bigger hoppers (a clear capsule tank on top);
- more coins strung on the rope (more capsules per crank).

You can also buy new machines (Gacha Station, Deluxe 500, Royal Kirakira), opening tools, and lucky charms
for a kamidana shelf. New series are unlocked as your collection grows, and second-hand singles fill any gaps.

**ガチャマート E-Mart.** The old PC zooms in to a CRT running a 2003-style Japanese shopping site, with a
marquee, a visitor counter, an under-construction sign, rankings and 1-click buying. It's all drawn in
pixel art, with product photos rendered from the actual 3D models.

**The museum.** Complete a series and rent the warehouse behind the garage, then fill it:
- display furniture (glass cases, hina-dan steps, a capsule tower, a rotating star pod and more);
- 51 decorations;
- paintable floors and walls.

Matching themes (cute, food, space, shrine, candy…) boost the score. Visitors pay at reception, walk to
the exhibits that interest them, take photos, react and donate. The star plaque over the door shows your rating.

## Tech

- Three.js (WebGL) and Vite, in plain ES modules.
- Rendering: a greedy voxel mesher with baked ambient occlusion; procedural pixel-art textures with bump
  maps; a garage reflection probe; and post-processing (GTAO on high/ultra, bloom, colour grade, FXAA).
- Gameplay systems:
  - custom sphere physics for capsules;
  - Verlet rope physics for the coin;
  - A* pathfinding for visitors;
  - fully synthesised Web Audio, including a 3-station procedural radio.
- Content lives in `src/data/` (series, props, visitors). The modelling API is documented in
  `docs/VOXEL_GUIDE.md`. Preview models with `viewer.html?series=mochi`.

```
src/core      renderer, input, physics, audio, music
src/voxel     voxel model + mesher + finish materials
src/gfx       pixel textures, particles, thumbnails
src/world     garage, props, machine cabinets
src/game      game hub, machines, capsules, reveal, shelves, shop, economy
src/pc        CRT PC + E-Mart website
src/museum    museum hall, displays, visitors
src/data      12 collectible series, props, visitors
tools/        headless screenshot / test runners (Playwright)
```
