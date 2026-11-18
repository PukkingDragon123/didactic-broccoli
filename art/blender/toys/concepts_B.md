# Gacha Garage: the Blender toy line, agent B's series (4, 5, 6, 7, 8)

Same rules as concepts.md: original designs only (no product, character or brand from the boards or anywhere else),
every figure its own sculpt with a face, a pose and a real gimmick, factory PVC paint over a sculpt baked onto a
≤1.5k-tri game mesh, 512 px atlas, 40 to 65 mm. Series 4 to 6 are the ones in concepts.md, worked out here figure by
figure; 7 and 8 are new. Shared modelling helpers for these five series: art/blender/toys/teruteru/kit/bk.py.

---

## 4. さかさてるてる Sakasa Teru-teru: "Upside-Down Rain Charms" (dark-cute, keychains) — series `teruteru`

**Hook:** a teru-teru bōzu hung upside down brings rain instead of sun. Ours have had their hems gathered and tied
into a top-knot so they hang head-down, which turns every one of them into a raindrop: round head at the bottom
(they stand on its flattened crown), pinched neck tied with string, a cloth sack that tapers to a twisted knot whose
four handkerchief corners stick out like ears.
**Twist:** cute and slightly wrong. The child who made them drew the faces the right way up for an upside-down
doll; the cloth is soggy, a stitched smile, one eye in marker, ink running in the rain, and each one brings its
own weather with its own prop.
**Gimmick:** every figure is a keychain (a screw eye in its knot, `kit.eyepin`; the game hangs the ball chain from
`pt_chain`). Each has stubby cloth arms with mitten hands and two little feet, and a prop of its own. Press: the charm
shivers and does its weather.

| # | Figure | Look | Press | Rarity |
|---|--------|------|-------|--------|
| 1 | しとしと Shito-shito (Drizzle) | grey-blue soggy cloth, limp corners with three fat drops, a taro-leaf umbrella held up in one stubby hand, teary eyes under worried brows | shivers, the drops run down its cloth and splash, it tips the water off its leaf | common |
| 2 | ゴロゴロ Goro-goro (Thunder) | a tiger-stripe furoshiki, the knot twisted into a lightning bolt, the god's ring of six taiko on its neck string, a drumstick in each hand, a big white-toothed grin | the drum ring spins round its neck while it beats the drums, the bolt crackles | common |
| 3 | パラパラ Para-para (Hail) | crumpled newsprint washi with hailstones frozen into the creases, little fists up in a huff, cheeks puffed (> < eyes, pouting) | it puffs up and spits three hailstones that bounce off the shelf, fists flying | uncommon |
| 4 | もやもや Moya-moya (Fog) | pale lilac gauze printed with haze bands, one long corner hanging over an eye like a fringe, a wispy cloud scarf, a fidgeting hand, a sideways glance | it lifts the veil, peeks at you with both eyes and gives a shy little wave, then hides again | uncommon |
| 5 | ビュービュー Byū-byū (Typhoon) | storm-teal cloth wrung into a spiral, a streamer tail whipping round it, a paper pinwheel held up into the wind, swirl eyes | spins like a top twice, the pinwheel whirring, and wobbles to a dizzy stop | rare |
| S | にじくい Niji-kui (Rainbow Eater) | a black cloth charm with a fat round belly, hands on it, a chalk face (^ ^) and drippy rainbow lips, slurping a rainbow whose far end lies on the shelf | slurp: the rainbow is sucked in, it pats its belly, burps a little cloud, a new rainbow creeps out | secret |

Card: wet grey-blue sky paper with run ink, a big 逆さ! stamp, each charm hanging from a line of string.

---

## 5. かみのおつかい Kami no Otsukai: "The Gods' Messengers" (mythic) — series `otsukai`

**Hook:** the animal messengers of Japanese shrines as sleek black-lacquer and gold-leaf idols, the way the boards'
Egyptian gods are birds. Each sits on its own small vermilion shrine plinth (part of the idol, not a stand).
**Twist:** each one carries its shrine's attribute and looks like it takes the job very seriously, with a little
cute tell (a blush, a tongue, a too-big ribbon).
**Gimmick:** press and the messenger acts.

| # | Figure | Attribute | Press | Rarity |
|---|--------|-----------|-------|--------|
| 1 | 稲荷ギツネ Inari Fox | granary key in its mouth, red bib, jewel on the tail tip | the tail flicks and the key turns | common |
| 2 | 春日ジカ Kasuga Deer | a sakaki branch with shide paper hung on its antlers, a saddle cloth with wisteria | bows deeply (a Nara deer bow) and the shide sway | common |
| 3 | 三本足ガラス Sun Crow | three legs on a gold sun disc, wings folded like a cloak | spreads its wings, the sun disc turns | uncommon |
| 4 | 日吉ザル Hie Monkey | a gohei wand and a little eboshi cap | waves the gohei left, right, and bows | uncommon |
| 5 | 三峯オオカミ Mitsumine Wolf | a shimenawa rope round its neck with shide | lifts its head and howls, the jaw opens | rare |
| S | 白蛇 White Snake of Benzaiten | coiled round a gold biwa | rises out of its coil and plucks the biwa string with its tail | secret |

---

## 6. つっぱり動物園 Tsuppari Zoo: "Shōwa Street Delinquents" (attitude) — series `tsuppari`

**Hook:** an 80s yankī gang of animals: pompadours, long embroidered coats, flat school caps, geta.
**Twist:** tough on the outside, soft at heart: each is caught doing something kind.
**As built** (art/blender/toys/tsuppari, ids niwatori, kuma, neko, kaeru, tanuki, mimizuku): the rooster has a lost
chick asleep in his pompadour; the frog wears a satin sukajan with 夜露死苦 embroidered down the back and squats on a
scrap of pavement (the duckling needs the base); the tanuki's flag and coat say 安全運転 / 交通安全 and the scooter is a
pull-back with a light-up headlamp; the owl wears his old coat as a cape. Kanji: tsuppari/_glyphs.py → glyphs.npz.

| # | Figure | Look | Press | Rarity |
|---|--------|------|-------|--------|
| 1 | リーゼント鶏 Regent Rooster | the cockscomb is a towering pompadour, gakuran jacket, a comb in his back pocket | the pompadour bounces, he whips out the comb | common |
| 2 | 番長グマ Banchō Bear | floor-length embroidered coat, geta, a stray kitten tucked inside | the coat flaps open: the kitten waves | common |
| 3 | スケバンネコ Sukeban Cat | ankle-long skirt, flat school bag, guarding the class rabbit | she glares round, the rabbit peeks out from behind her | uncommon |
| 4 | ヤンキー座りガエル Squatting Frog | the yankī squat, a grass stalk in his mouth, a wooden sword over his shoulder, a stray duckling | stands up, points the sword, the duckling follows | uncommon |
| 5 | 暴走タヌキ Bōsōzoku Tanuki | a scooter with a three-tier backrest and a flag, a medicine bag for his granny | the scooter pops a wheelie | rare |
| S | 元総長ミミズク Old Boss Eagle-Owl | sunglasses, a crossing guard's sash and flag | the head turns all the way round, the flag goes up | secret |

---

## 7. おばけ屋敷のバイト Obake Yashiki no Baito: "Haunted House Part-Timers" (dark-cute playset with action) — series `obakebaito`

**Hook:** the scares of a Shōwa amusement-park haunted house, each a cheap painted prop on its own stage block.
**Twist:** turn it round. Every scare is worked from behind by a bored animal part-timer in a happi coat: the mole
on the well's crank, the tanuki on the lantern pole, the hamster on the umbrella's string. Front: a horror. Back: a
tired little worker on minimum wage.
**Gimmick:** press: the scare springs and the part-timer works it in sync (the crank turns, the pole jiggles, the
string is yanked). The props are the playset; the secret is a light-up one.
**As built** (art/blender/toys/obakebaito, ids kasa, ido, chochin, rokuro, nuri, honmono; shared parts in _ob.py):
every scare stands in front of a black flat on a plum stage block (pt_in / pt_out with dowels: the blocks join side by
side into one corridor); the back of the flat is raw plywood with a 休憩中 note. The lantern ghost's part-timer is a
tanuki on a fishing-rod pole; the long-neck lady kneels and the weasel works a push rod through the flat; the wall
stands in the flat's place, held up by two rabbits; the secret's back is empty (a crate, cold tea, a coat on a nail).

| # | Figure | Scare (front) | Part-timer (back) | Press | Rarity |
|---|--------|---------------|-------------------|-------|--------|
| 1 | 傘おばけ Umbrella Ghost | a one-eyed paper umbrella on one geta | a hamster on a pull-string | the umbrella jumps and its tongue lolls out | common |
| 2 | 井戸おばけ Well Ghost | a well with a wigged white ghost inside | a mole turning the crank | the ghost rises out of the well and sways | common |
| 3 | 提灯おばけ Lantern Ghost | a paper lantern that splits into a grin | a tanuki on the bamboo pole | the mouth splits open, the tongue rolls out | uncommon |
| 4 | ろくろ首 Long-Neck Lady | a folding screen; a lady doll's head behind it | a weasel pushing the telescopic neck up | the neck shoots up over the screen | uncommon |
| 5 | ぬりかべ屋 The Wall | a plastered wall with eyes | a pair of rabbits behind it, pushing | the wall lurches forward and blinks | rare |
| S | ほんもの The Real One | a pale little ghost on an empty stage block | nobody | it rises and glows (light-up version) | secret |

---

## 8. からくり動物 Karakuri Dōbutsu: "Edo Wind-Up Automata" (wind-up mechanism) — series `karakuri`

**Hook:** Edo-period karakuri ningyō, the carved and lacquered mechanical dolls that served tea and turned
somersaults, made as animals in the same craft: gofun-white faces with fine painted features, silk-pattern
costumes, black-lacquer bases.
**Twist:** the mechanism is part of the charm: a brass wind key, gear windows in the base, a whalebone spring you
can see through the back hatch. Each one does one real karakuri trick.
**Gimmick:** wind-up: press and the key winds, then the trick plays (and the key unwinds as it runs).

| # | Figure | Trick | Rarity |
|---|--------|-------|--------|
| 1 | 茶運びタヌキ Tea-Carrier Tanuki | walks forward with a tea bowl on its tray, stops, bows, walks back | common |
| 2 | 段返りザル Somersault Monkey | flips backwards down its own three-step stair (the playset part) | common |
| 3 | 弓曳きウサギ Archer Rabbit | draws the bow, aims, looses an arrow at the little target on its base | uncommon |
| 4 | 文字書きフクロウ Calligrapher Owl | dips the brush and writes 寿 on the paper in front of it | uncommon |
| 5 | 傘回しネコ Parasol Cat | spins a parasol with a ball running round its rim | rare |
| S | 金の鳳凰 Golden Phoenix | the master's piece in gold leaf: spreads its wings and fans its tail | secret |
