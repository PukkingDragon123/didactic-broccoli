# GACHA GARAGE

A first-person **capsule-toy shop sim** in a Shōwa-era Japanese back lane, spring 1999.
Grandpa left you his garage, a key, a biscuit tin of savings and a stack of handwritten notes. You drive his
rusty kei van into the lane, roll the shutter up and start from nothing: no machines, ¥1,500 in your pocket,
the electricity off and a shy cat living behind the junk boxes.

Voxel and low-poly 3D, pixel-art 2D, a paper UI, 8-bit voices. Models, textures and people are generated in
code at runtime. Music and sound effects are recorded files (`public/audio`). Posters, flyers, prints and
thrift-shop clothes use real photos from Google Open Images (CC BY 2.0), pixelated. Every one is credited in
[CREDITS.md](CREDITS.md).

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
| **Left click** | use / pick up / place. **Hold** to crank, twist, sweep, pet. With empty hands: slap |
| **Right click** | inspect a figure · twist a capsule open · pick the cat up |
| **1–6** / **wheel** | inventory slot (six of them) |
| **Q** / **G** | drop what you're holding (anything, the key included) |
| **R** | rotate the furniture you're placing |
| **F** | move a piece of furniture |
| **E** | a prop's second function |
| **T** | think out loud. In a multiplayer room: chat. On a cardboard box: write a label |
| **Tab** (hold) | check your watch and wallet (and the room's list of players) |
| **J** | fold the side-quest notes away |
| **Esc** | pause and settings |

On phones there's a virtual stick and buttons: tap to use, tap the inventory to switch. Progress saves to
`localStorage` automatically.

## What's inside

**Opening up.** The intro drives you down the lane in Grandpa's van. After that, his notes tell you what to
do, in about thirty small, physical steps:
- read the KIDDO envelope and unlock the shutter;
- flip the breaker, air the place out, wipe the counter and count the cash tin;
- find the old OPEN sign in a junk box;
- feed Mikan (pour the milk yourself; it really pours);
- sweep up and take the trash out;
- do a neighbour's odd job to afford a used machine;
- order the machine, unbox it, plug it in and fill it;
- set its price, then hang the sign.

**The shop.**
- **Machines:** voxel machines with a lockable lid, a price plate and a coin box. Their coins go nowhere
  until you collect them.
- **Restocking:** cut the carton tape, open the flaps, drop capsules in one by one and swap the display card.
- **Pricing:** each machine's plate shows a recommended price based on how good the shop is. Charge more
  and fewer people play, and some of them complain out loud and in the guestbook.
- **Customers:** they ask questions, haggle and need quick answers (timed choices).
- **Shells:** they drop their empty capsule shells in the bin. You empty it into the dumpster, and the
  garbage truck comes on collection days.
- **Your own pulls:** you get to keep the shell in your hand. Drop it, sweep it up, or keep it in a box.
- **Figures:** 22 series and 176 figures. Secrets are 1 in 500. Rare finishes include clear, metallic,
  glow, gold, aurora and diamond.
- **Selling figures:** show rare ones on stands, pack them in a blister and sell them with your own price tag.
- **Toys:** some toys are playable, such as a foam-dart pistol, a squishy, a wind-up robot and a kendama.

**The computer (Capsule 98).** Sit down and the camera moves into the CRT. There's no pop-up window: it's a
small desktop OS with these apps:
- **Off-Hobby:** a second-hand marketplace with random lots, grades, flaws and funny variants (stickers,
  doodles, sun fade). You chat and haggle with sellers, bid in auctions, sell with your own price tags, and
  send figures off for KGS grading.
- **Daikoku Toys:** the wholesaler for machines and capsule stock.
- **Furniture, property and job sites:**
  - Hirano Kagu for furniture whose features work (phones, a gumball machine, a robot vacuum, storage boxes);
  - Ota Real Estate for the annex next door and the four-floor Gacha Kaikan mall with escalators and an elevator;
  - Inspired for staff. Interview procedurally generated applicants (a kappa, a tanuki, a ghost, a gyaru…)
    and give them shifts.
- **Other apps:**
  - kirakira-closet for clothes, including thrift pieces printed with real photos;
  - a lucky-charm shop;
  - mail with spam, a messenger for quests and suppliers, the bank, loans, bills and a phone;
  - a codex of figures, people and yokai, plus Steam-style achievements.

**Deliveries.** Orders come in a cream van with FREE CANDY painted on the side. Gen-san the driver remembers
your name and hands you a sweet every time.

**Days.**
- **Clock:** a real day/night cycle and a calendar, with rent day, bill days, holidays and festivals.
- **Bills:** electricity and rent arrive as bills you pay from the bank.
- **Energy:** eat at Mikawa-ya, the vending machines (37 drinks with pros and cons, and you can get drunk),
  or Ramen Yamada (a physical menu, gyoza and beer, dish-washing shifts). Sleep in your own bed, in a room
  you decorate.
- **End of day:** close the shutter and the camera pulls up into the sunset over the day's receipt.
- **Levels:** levelling up unlocks things. There are no upgrade shops. Money comes from your machines' coin
  boxes and from selling.
- **Side jobs:** dog walking, car washing, window cleaning, street sweeping and konbini shifts.
- **Plants:** grow them with advice from the biologist down the lane.

**The lane.**
- **Neighbours:** named neighbours with routines, memories and quests. You can ring their bells.
- **Conversations:** talk in cinematic scenes with floating text and choices, no speech bubbles.
- **Characters:**
  - a manga artist who wants to draw you;
  - two schoolboys with strong opinions about hair;
  - a masked old shopkeeper who loves cigars;
  - a pigeon man, a prankster, a sorcerer, a rubber pirate;
  - a man living in a bush who watches the street. You can confront him.
- **At night:** yokai come out, and there are more of them to collect.
- **Around town:** the steel pylon on the skyline, the park, Mikawa-ya, Sakura Heights, and the ghost alley
  where you must not look back.

**Multiplayer.** Host your shop and friends join with a room code (WebRTC, via PeerJS):
- you share the piggy bank;
- you can slap each other and pick each other's pockets;
- you can call 110, and the police fine whoever pranked;
- guests sleep on cardboard;
- without a connection, a visit code opens a read-only copy of a friend's shop.

**A nod to a certain bizarre manga.** ゴゴゴ sound effects, dramatic poses, "TO BE CONTINUED" freeze frames,
a time-stopping pocket watch and the Bizarre Pose Club series. These are affectionate fan homages.

## Tech

- **Engine:** Three.js (WebGL) and Vite, in plain ES modules. Quality presets go from Low to Ultra, with an
  auto-suggest.
- **Rendering:**
  - a greedy voxel mesher with baked AO;
  - procedural pixel-art textures;
  - one-draw-call pixel-sprite particles;
  - depth-based ink outlines;
  - post-processing: GTAO on high and ultra, bloom, colour grade and FXAA.
- **People:** one skinned low-poly mesh and one painted atlas per person, with procedural animation and
  8-bit voices. Real speech synthesis is optional.
- **Systems:** sphere physics for capsules, Verlet rope, liquid pour, A* pathfinding, and a generator-based
  cutscene engine.
- **Extending:** drop-in features live in `src/plugins/*.js` (export `install(game)`). Save data goes through
  `ensureState(game, key, defaults)` and systems talk through `game.events`.

```
src/core      renderer, input, touch, physics, audio, music
src/voxel     voxel models, mesher, finish materials
src/gfx       pixel textures and icons, particles, fonts, posters
src/world     garage, town, neighbours, pedestrians, the cat, the ghost alley
src/people    low-poly humans, faces, gestures, floating text, voices
src/npc       named neighbours, routines, memory, doors
src/talk      cinematic conversations, self-talk, guestbook
src/game      game hub, inventory, story, machines, capsules, reveal, toys, shells
src/sim       clock, calendar, bills, loans, levels, day summary
src/os        Capsule 98 desktop and its apps and websites (src/pc: the desk and the CRT)
src/market    Off-Hobby, Daikoku Toys, delivery van, grading, auctions
src/money     wallet, physical cash, ATM, piggy bank
src/build     furniture catalogue, placement, storage boxes, robot vacuum
src/life      intro, Grandpa's notes, opening steps, jobs, trash
src/needs     energy, food, drinks
src/places    Mikawa-ya, vending machines, Ramen Yamada, your room, plants, pigeons
src/staff     the Inspired job site and employees
src/growth    flat 103, the annex, the Gacha Kaikan
src/cosmetics clothes, closet, rewards
src/net       multiplayer
src/plugins   drop-in features
src/ui        paper UI kit, HUD, menu
tools/        headless runners, screenshots, perf, Steam capture
```

## Testing

```bash
node tools/run.mjs "index.html?autotest&q=low" steps.json   # scripted headless run (wait / eval / shot / log)
node tools/perf.mjs                                         # frame-time and draw-call profile
node tools/net-test.mjs                                     # two players over the loopback transport
node tools/steam-capture.mjs docs/steam/raw high            # store screenshots
```

`window.dbg` (src/debug.js) has helpers for scripted runs: `dbg.view(x, z, yaw, pitch)`, `dbg.time(h)`,
`dbg.shopOpen()`, `dbg.pc(page)` and more. The Steam store page text and images are in [docs/steam](docs/steam).
