# GACHA GARAGE

A first-person **capsule-toy shop sim** in a Shōwa-era Japanese back lane, spring 1999.
Grandpa's back has given out and he's off to his sister's in Atami. Today is his last day in the lane. You
pull up in his rusty kei van across from the garage, he wakes up on his stool, hands you the keys, and spends
the afternoon showing you the ropes before his taxi comes. Then it's you: no machines, ¥1,500 in your pocket, the electricity
off and a shy cat living behind the junk boxes.

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

**The title screen.** The shop just after sunset, held like a poster: the shutter half rolled with warm light
spilling out, lanterns, Mikan asleep on the bench, pigeons on the roof ledge. The logo is a red enamel shop sign
hanging on two wires, and the menu is a string of paper tags under it, words only: a tall cream ticket for
Continue (or New Game on a fresh save), manila tags, two short kraft ones for the housekeeping; hover lifts a
tag and pencils a mark on it. Pick Continue or New Game and you
crank the ¥100 machine beside you; the capsule pops and the camera dives into the game.

**The dressing room.** Wardrobe on the menu (or the mirror in your room) opens a small walk-in closet on a
spring afternoon: floorboards, an open wardrobe, a clothes rack, a cheval mirror, sun through the window. You
stand on a rag rug; drag to turn, zoom to your face or feet. About 150 pieces: yukata, kogal uniforms, tengu and
fox masks, a chonmage wig, toilet slippers. Pieces you don't own yet show as silhouettes with a hanko padlock
and a slip saying how to get them (an achievement, a side quest, the web shop, a shop level, a capsule bonus, a
thrift find), with progress where it can be measured; you can try them on, but they get a NOT YOURS YET stamp.
Follow the game on itch.io (the tag on the title screen) and you get the Duck Head for free; the link lives in
`src/data/links.js`.

**Arriving.** The game opens with you driving in, and nothing else: a short film (letterboxed, to music, about
eighteen seconds, hold to skip) of Grandpa's old van coming out of the dark railway underpass into the late sun,
rolling down the lane past the houses with you at the wheel, and pulling up across from the garage, brake
lights on. The engine dies, Grandpa wakes on his stool and shuffles over. He taps on the window, you climb out,
and the two of you talk: a bow or an awkward hug, the van's clutch, the keys, the shop in its heyday. People
speak in plain floating text (no boxes), and you answer with numbered lines.

**Loading.** While the game builds, the van drives along in pixel art on a plain dark screen, puffing exhaust, with a
simple "Loading 42%" under it (the van is baked from the real model by `tools/bake-loading.mjs`).

**Opening up.** On day one Grandpa walks you through it himself: he shuffles over to each job, points,
thumps the breaker box to show you, and has something dry to say when you get it done (or when you slap him).
After the rubbish run his taxi comes; he leaves you his notebook, and his notes taped round the garage take you
through the rest, about thirty small, physical steps in all:
- unlock the shutter with the key he has just handed you;
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
- **Figures:** crisp low-poly sculpts with flat facets, in 30 series of 228 figures, including chibi anime heroes and chibi versions of the people in the lane. Secrets are 1 in 500. Rare finishes include clear, metallic,
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
  8-bit voices (real speech synthesis is optional); crowd steering that keeps left and gives way, glances and
  greetings, and errands chosen by the hour.
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
src/arrival   the opening: the van driving in, the hand-off to Grandpa
src/grandpa   Grandpa: the meeting, day one, the goodbye, his calls
src/vehicles  the vehicle kit: van, FREE CANDY van, garbage truck, taxi, cars
src/life      Grandpa's notes, opening steps, jobs, trash
src/needs     energy, food, drinks
src/places    Mikawa-ya, vending machines, Ramen Yamada, your room, plants, pigeons
src/staff     the Inspired job site and employees
src/growth    flat 103, the annex, the Gacha Kaikan
src/menu      the title screen
src/dressing  the dressing room
src/cosmetics clothes, rewards, the web shop
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
