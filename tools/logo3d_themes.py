"""logo3d_themes.py: every series title's own themed finish (the owner: no default yellow; each title in its own colours
with a themed, hand-painted texture and small sculpted bits growing off the letters). Read by tools/logo3d.py.

A theme: v = the letter paints, cycled over the letters (f = face colour, L = painted pattern layers, s = side colour,
sL = side layers, default the face layers deepened; chip = the wear colour), pick = 'cycle' | 'line' | 'rand', bits =
the sculpted bits (k = kind, on = which letters: first / last / top / bot / ends / all, n = how many letters, paint =
'front' / 'side' / a hex colour / a paint dict), skewer = a stick through a line. Layer kinds (art/blender/logo3d/
scene.py paint()): spots / cells (voronoi bumps, seams), stripes (ax, sc, thr, gt), below (z < thr, gt), dab (a painted
highlight at p, r), ring, radial (p, n), grid / dots / checker (sc), blot (noise patches), seam (|x| < thr); w = the
brush wobble, zlt / zgt clip a layer to a height band, c2 paints it in two brush tones, a = its cover. Letter space:
cap height 1, x about -0.45 .. 0.45, z 0 (baseline) .. 1."""


def P(f, *L, s=None, sL=None, chip=None, rough=None):
    d = dict(f=f, L=list(L))
    if s is not None: d['s'] = s
    if sL is not None: d['sL'] = sL
    if chip is not None: d['chip'] = chip
    if rough is not None: d['rough'] = rough
    return d


def spots(sc, thr, c, w=0.06, **k): return dict(k='spots', sc=sc, thr=thr, c=c, w=w, **k)
def cells(sc, thr, c, w=0.03, **k): return dict(k='cells', sc=sc, thr=thr, c=c, w=w, **k)
def stripes(sc, thr, c, ax=(0, 0, 1), w=0.15, **k): return dict(k='stripes', sc=sc, thr=thr, c=c, ax=ax, w=w, **k)
def below(thr, c, w=0.1, **k): return dict(k='below', thr=thr, c=c, w=w, **k)
def dab(p, r, c, w=0.04, **k): return dict(k='dab', p=p, r=r, c=c, w=w, **k)
def blot(sc, thr, c, w=0.0, **k): return dict(k='blot', sc=sc, thr=thr, c=c, w=w, **k)


# shared bits
def B(k, on='bot', n=1, paint='front', **kw): return dict(k=k, on=on, n=n, paint=paint, **kw)


THEMES = {
    # Crabs in Food Cans: crab shell, orange-red with pale bumps and dark pits, a cream underside; claws and legs
    'kanikan': dict(v=[
        P(0xb8301e, below(0.2, 0xecd2a4, w=0.12, c2=0xdcb888), spots(11, 0.13, 0xd8542e, c2=0xe2643a), spots(20, 0.055, 0x5e160e),
          s=0x6e2014, chip=0xf2c49a),
        P(0xd04a26, below(0.22, 0xeed6aa, w=0.12, c2=0xdcb888), spots(8, 0.14, 0xe46a38, c2=0xee7c44), spots(16, 0.055, 0x781e12),
          s=0x7a2616, chip=0xf4cca4)],
        bits=[B('claw', 'first', s=1.55), B('claw', 'last', s=1.55), B('legs', 'bot', 3, th=0.05, s=1.25, paint=0xb8301e)]),
    # World Tour Turtles: shell-scute letters, olive and amber shells with dark seams, pale growth centres; flippers
    'tabigame': dict(pick='line', v=[
        P(0x5e7a34, spots(3.3, 0.3, 0x7c9440, c2=0x86a04a, w=0.08), spots(3.3, 0.13, 0xa4aa5c, w=0.08), cells(3.3, 0.06, 0x34421e, w=0.05),
          s=0x3e4a22, chip=0xc8c894),
        P(0x8c5a28, spots(3.3, 0.3, 0xa8743a, c2=0xb47e42, w=0.08), spots(3.3, 0.13, 0xc8964e, w=0.08), cells(3.3, 0.06, 0x4a2e16, w=0.05),
          s=0x4a3218, chip=0xe0c494)],
        bits=[B('flipper', 'bot', 3, paint=0x7a8a58, s=1.2), B('head', 'first', paint=0x7a8a58, s=1.2), B('tail', 'last', paint=0x7a8a58)]),
    # Sushi Bedtime: salmon / tuna / tamago toppings over a rice bed (grain cells), a nori band on the egg; rice grains
    'nedoko': dict(v=[
        P(0xf07a4a, stripes(7, 0.22, 0xf9c8a6, ax=(0.7, 0, 0.7), w=0.2), below(0.3, 0xf2efe6, w=0.12),
          cells(26, 0.07, 0xcfcabc, zlt=0.3, sq=(1, 1, 2.2)), s=0xc8582e, chip=0xfff0e0),
        P(0xb8283a, stripes(9, 0.12, 0xd8505a, ax=(0.6, 0, 0.8), w=0.25), below(0.3, 0xf2efe6, w=0.12),
          cells(26, 0.07, 0xcfcabc, zlt=0.3, sq=(1, 1, 2.2)), s=0x7a1a26, chip=0xfff0e0),
        P(0xe8a83a, stripes(6, 0.18, 0xc8862a, w=0.05), below(0.62, 0x1e2a22, gt=0.47, w=0.03), below(0.3, 0xf2efe6, w=0.12),
          cells(26, 0.07, 0xcfcabc, zlt=0.3, sq=(1, 1, 2.2)), s=0xb07a22, chip=0xfff0e0)],
        bits=[B('grain', 'all', paint=0xf4f2ea)]),
    # Dango Skewer Pals: hanami dango balls (pink, white, green), a painted gloss dab, a shade band; a bamboo skewer
    'dango': dict(v=[
        P(0xf09aac, dab((-0.18, 0.78), 0.09, 0xfcd8e0, w=0.05), below(0.18, 0xd87890, w=0.12), s=0xc06a80, chip=0xfff0f4),
        P(0xf2eee4, dab((-0.18, 0.78), 0.09, 0xffffff, w=0.05), below(0.18, 0xd8cfc0, w=0.12), s=0xb8ae9e, chip=0xffffff),
        P(0x8cbc5e, dab((-0.18, 0.78), 0.09, 0xc4e09a, w=0.05), below(0.18, 0x6a9a44, w=0.12), s=0x4e7a34, chip=0xe0f0c8)],
        skewer=dict(line='all', paint=0xc8a46a),
        bits=[B('drip', 'top', 2, paint=0x9a5a24)]),
    # The Hardwings: painted beetle carapace, hard bands of green / blue / violet, a wing-case seam, pits; legs, antennae
    'kouchuu': dict(v=[
        P(0x2a7050, stripes(3.2, 0.34, 0x2a4c8a, ax=(0.4, 0, 0.9), w=0.3), stripes(3.2, 0.12, 0x5a3c7c, ax=(0.4, 0, 0.9), w=0.3),
          dab((-0.15, 0.72), 0.07, 0x7cc8a0, asp=0.5), spots(18, 0.05, 0x14221c), s=0x161c1e, chip=0x9ad0b0),
        P(0x6a6e26, stripes(3.2, 0.34, 0x8a4a26, ax=(-0.4, 0, 0.9), w=0.3), stripes(3.2, 0.12, 0x2a6a4a, ax=(-0.4, 0, 0.9), w=0.3),
          dab((-0.15, 0.72), 0.07, 0xb0b860, asp=0.5), spots(18, 0.05, 0x1e1a10), s=0x1a1a14, chip=0xd0c890)],
        bits=[B('legs', 'bot', 2, paint=0x1e1c1a, th=0.03), B('antenna', 'top', 1, paint=0x1e1c1a), B('horn', 'top', 1, paint=0x2a1e16)]),
    # Bathhouse Regulars: tiled letters, blue and white tiles with grey grout; steam puffs
    'sento': dict(v=[
        P(0x3a7ac0, dict(k='checker', sc=5.5, c=0xe8eef0, a=1.0), dict(k='grid', sc=5.5, thr=0.09, c=0x8a9a9e, w=0.01),
          s=0x24508a, sL=[dict(k='grid', sc=5.5, thr=0.09, c=0x5a6a72)], chip=0xffffff),
        P(0x4aa8a8, dict(k='checker', sc=5.5, c=0xe8f0ec, a=1.0), dict(k='grid', sc=5.5, thr=0.09, c=0x8a9a9e, w=0.01),
          s=0x2a6a6e, sL=[dict(k='grid', sc=5.5, thr=0.09, c=0x5a6a72)], chip=0xffffff)],
        bits=[B('puff', 'top', 3, paint=0xeef0f0, gap=0.16)]),
    # Umbrella Arms: oiled wagasa paper, red and indigo, radiating ribs and paper fibres; bamboo ribs fanning out
    'kasabuki': dict(v=[
        P(0xc4302a, dict(k='radial', p=(0, 0.5), n=12, thr=0.07, c=0x7a1a16, w=0.02),
          stripes(30, 0.12, 0xd4483a, ax=(1, 0, 0.2), w=0.4), s=0x7a4a22, sL=[stripes(10, 0.1, 0x4a2c14)], chip=0xe8b088),
        P(0x2a3c70, dict(k='radial', p=(0, 0.5), n=12, thr=0.07, c=0x141c38, w=0.02),
          stripes(30, 0.12, 0x3a4e86, ax=(1, 0, 0.2), w=0.4), s=0x7a4a22, sL=[stripes(10, 0.1, 0x4a2c14)], chip=0xa8b8d8)],
        bits=[B('rib', 'top', 2, paint=0xa8783e)]),
    # Who's in the Suit?: rubber monster-suit hide, scales and a ribbed belly; bone dorsal plates
    'nakanohito': dict(v=[
        P(0x4c6c3a, spots(9, 0.22, 0x6a8a4a, sq=(1, 1, 1.6)), cells(9, 0.05, 0x22321a, sq=(1, 1, 1.6)),
          stripes(9, 0.3, 0x8a9858, zlt=0.32), s=0x2a3a20, chip=0xa8b888),
        P(0x4a504c, spots(9, 0.22, 0x666e66, sq=(1, 1, 1.6)), cells(9, 0.05, 0x1e2220, sq=(1, 1, 1.6)),
          stripes(9, 0.3, 0x8a8a78, zlt=0.32), s=0x262a28, chip=0xb0b4a8)],
        bits=[B('spike', 'top', 4, paint=0xd8d0b4, per=2)]),
    # Stationery Beasts: a green cutting mat with its grid, a two-tone eraser, red pencil lacquer; staples
    'henshin': dict(v=[
        P(0x2f7a5a, dict(k='grid', sc=8, thr=0.07, c=0xcfe4d0), dict(k='grid', sc=2, thr=0.03, c=0xf2f2e6), s=0x1e4e3a, chip=0xd8f0e0),
        P(0xe88a9a, below(0.42, 0x3a6ab0, w=0.03), s=0xb85a6a, chip=0xffe0e8),
        P(0xc8302a, stripes(5, 0.12, 0xe0503e, ax=(1, 0, 0), w=0.02), s=0xd0a070, sL=[stripes(14, 0.2, 0xb08050)], chip=0xe8c8a0)],
        bits=[B('staple', 'top', 2, paint=0x9aa2aa)]),
    # Appliance Animals: Showa enamel, mint, salmon and powder blue, a speaker-grille dot field; bakelite dials
    'kaden': dict(v=[
        P(0x78bea6, dict(k='dots', sc=10, thr=0.2, c=0x2e4a40, zlt=0.5), below(0.66, 0xefe6d2, gt=0.56, w=0.02), s=0x4a8a76, chip=0xe8f4ee),
        P(0xe08e78, dict(k='dots', sc=10, thr=0.2, c=0x5a2a20, zlt=0.5), below(0.66, 0xefe6d2, gt=0.56, w=0.02), s=0xa85a48, chip=0xfce8e0),
        P(0x88b2d0, dict(k='dots', sc=10, thr=0.2, c=0x2a3a52, zlt=0.5), below(0.66, 0xefe6d2, gt=0.56, w=0.02), s=0x5a7ea0, chip=0xeaf2fa)],
        bits=[B('knob', 'top', 2, paint=0x4a2a1c, paint2=0xe8dcc4)]),
    # Deep-Sea Night Stalls: abyssal indigo and deep-sea red hide with painted photophore dots; an angler lure, bubbles
    'yomise': dict(v=[
        P(0x1e2a5c, spots(10, 0.07, 0x8adcd8), stripes(4, 0.25, 0x2c3c7c, zlt=0.3), s=0x10162e, chip=0x6a7ab8),
        P(0x8a1e2c, spots(10, 0.07, 0xf2a888), stripes(4, 0.25, 0xa83040, zlt=0.3), s=0x4a0e18, chip=0xd87a7a)],
        bits=[B('lure', 'top', 1, paint=0x2a2030, paint2=0xc8f0e0), B('bubble', 'top', 2, paint=0xa8d4ea)]),
    # Ladder Frogs: frog skin, green with dark blotches, light flecks, a pale belly; toe pads
    'hashigo': dict(v=[
        P(0x4a9a3a, blot(4, 0.6, 0x2a5a24, w=0.05), spots(16, 0.05, 0x7cc454), below(0.24, 0xccdc94, w=0.12), s=0x2a5a24, chip=0xd0e8b0),
        P(0x6e8a34, blot(4, 0.6, 0x3a4a1c, w=0.05), spots(16, 0.05, 0x9ab04c), below(0.24, 0xd4d8a0, w=0.12), s=0x3a4a1c, chip=0xd8e0b0)],
        bits=[B('toes', 'bot', 3, paint='front')]),
    # Haunted House Part-Timers: weathered lavender plank paint peeling to dark wood, nail heads; ectoplasm drips
    'obakebaito': dict(v=[
        P(0x8a7a9c, stripes(4, 0.06, 0x2a2030, w=0.03), blot(6, 0.64, 0x4a3a34, w=0.05), spots(22, 0.025, 0x241e24), s=0x3a2a2c, chip=0xc8bcd8),
        P(0x6a3a5c, stripes(4, 0.06, 0x221624, w=0.03), blot(6, 0.64, 0x4a3a34, w=0.05), spots(22, 0.025, 0x1e161c), s=0x2e1e24, chip=0xb88aa8)],
        bits=[B('drip', 'top', 3, paint=0x86c068)]),
    # Yokai Kabuki: kumadori make-up, bold red (hero) and indigo (villain) sweeps on white paint, black lacquer sides
    'kabuki': dict(v=[
        P(0xf4f1ec, stripes(1.5, 0.3, 0xc81e2a, ax=(0.75, 0, 0.66), w=0.45, c2=0xa8141e), below(1.2, 0x1e1a1c, gt=0.9, w=0.05),
          s=0x1e1a1c, sL=[], chip=0xffffff),
        P(0xf4f1ec, stripes(1.5, 0.3, 0x2a3a8a, ax=(-0.75, 0, 0.66), w=0.45, c2=0x1e2a6a), below(1.2, 0x1e1a1c, gt=0.9, w=0.05),
          s=0x1e1a1c, sL=[], chip=0xffffff)]),
    # Edo Wind-Up Automata: warm zelkova wood grain and vermilion lacquer; a brass wind-up key
    'karakuri': dict(v=[
        P(0xa8683a, stripes(11, 0.3, 0x7a4422, ax=(0.15, 0, 1), w=0.5), spots(3, 0.06, 0x6a3a1c), s=0x6a3a1e, chip=0xe0b080),
        P(0xb4382a, stripes(11, 0.08, 0x8a2a20, ax=(0.15, 0, 1), w=0.5), s=0x241a18, sL=[], chip=0xe0a080)],
        bits=[B('key', 'last', paint=0xa8843c, s=1.7)]),
    # Anime Genre Club: cel paint, each letter a flat colour with one hard shadow shape and a hard light band
    'janru': dict(v=[
        P(0xd8346a, stripes(1.1, 0.42, 0x9a1e4a, ax=(0.7, 0, -0.7), w=0.05), below(1.2, 0xf27aa0, gt=0.84, w=0.03), s=0x1e1e3a, sL=[]),
        P(0x2ab0d0, stripes(1.1, 0.42, 0x1a6a9a, ax=(0.7, 0, -0.7), w=0.05), below(1.2, 0x8ae0f0, gt=0.84, w=0.03), s=0x1e1e3a, sL=[]),
        P(0x6a4ac8, stripes(1.1, 0.42, 0x3e2a8a, ax=(0.7, 0, -0.7), w=0.05), below(1.2, 0xa898ec, gt=0.84, w=0.03), s=0x1e1e3a, sL=[]),
        P(0xf07a2a, stripes(1.1, 0.42, 0xb8481a, ax=(0.7, 0, -0.7), w=0.05), below(1.2, 0xf8b070, gt=0.84, w=0.03), s=0x1e1e3a, sL=[])]),
    # Upside-Down Rain Charms: tenugui gingham cloth, blue and indigo; raindrops
    'teruteru': dict(v=[
        P(0xeef0ee, stripes(5, 0.5, 0x6a96c8, ax=(1, 0, 0), w=0.02, a=0.6), stripes(5, 0.5, 0x6a96c8, w=0.02, a=0.6), s=0x3a5a7a, sL=[], chip=0xffffff),
        P(0xeef0ee, stripes(5, 0.5, 0x3a4a8a, ax=(1, 0, 0), w=0.02, a=0.6), stripes(5, 0.5, 0x3a4a8a, w=0.02, a=0.6), s=0x2a3a5a, sL=[], chip=0xffffff)],
        bits=[B('drop', 'top', 2, paint=0x9ac8ea)]),
    # Weather Express: painted sky, blue with cloud blots and a deeper horizon, storm grey; cloud puffs, raindrops
    'otenki': dict(v=[
        P(0x4a90d8, blot(3, 0.6, 0xf2f4f8, w=0.05, c2=0xd8e2ee, sq=(1, 1, 2)), below(0.16, 0x2a6ab0, w=0.06), s=0x2a5aa0, chip=0xe0ecf8),
        P(0x6a7a8c, blot(3, 0.62, 0xc8d0da, w=0.05, c2=0xa8b4c0, sq=(1, 1, 2)), below(0.16, 0x4a5868, w=0.06), s=0x3a4656, chip=0xd8e0e8)],
        bits=[B('puff', 'top', 2, paint=0xf2f4f6, gap=-0.04)]),
    # Platform Staff: railway livery, two-tone painted steel (orange over green, navy over silver) with rivet rows
    'ekiin': dict(v=[
        P(0xe0702a, below(0.48, 0x2a6a3a, w=0.0), dict(k='dots', sc=7, thr=0.09, c=0x8a3a14, zgt=0.5), s=0x2a2a30, sL=[]),
        P(0x2a3a6a, below(0.48, 0xa8b0b8, w=0.0), dict(k='dots', sc=7, thr=0.09, c=0x18203e, zgt=0.5), s=0x2a2a30, sL=[])],
        bits=[B('rivet', 'all', paint=0x3a3a40)]),
    # The Gods' Messengers: shrine vermilion lacquer with a black foot band and gold-leaf flakes; shide paper zigzags
    'otsukai': dict(v=[
        P(0xd8402a, below(0.14, 0x1e1a1c, w=0.03), spots(20, 0.045, 0xd8b04a), s=0x8a2018, chip=0xf0b090),
        P(0x241e20, spots(16, 0.06, 0xd0a840), stripes(6, 0.05, 0x3a3034, w=0.3), s=0x8a2018, chip=0x8a7a70)],
        bits=[B('shide', 'top', 2, paint=0xf4f2ec)]),
    # Tsuppari Zoo: black leather and purple satin jacket cloth with a red racing band; studs
    'tsuppari': dict(v=[
        P(0x2a2a30, stripes(24, 0.4, 0x3a3a46, ax=(0.6, 0, 0.8), w=0.3), below(0.6, 0xc8302a, gt=0.46, w=0.02), s=0x141416, chip=0x6a6a74),
        P(0x5a2a7a, stripes(24, 0.4, 0x703a92, ax=(0.6, 0, 0.8), w=0.3), below(0.6, 0xc8302a, gt=0.46, w=0.02), s=0x2a1438, chip=0xa880c0)],
        bits=[B('stud', 'all', paint=0xa8acb4)]),
    # Playground Champions: playground steel, painted coat over coat, peeling to the coat below and to rust
    'meijin': dict(v=[
        P(0xd03a2a, blot(5, 0.64, 0x2a6ab0, w=0.04), blot(9, 0.72, 0x7a4a2a, w=0.04), s=0x5a4a44, chip=0xe8d8c8),
        P(0x2a6ab0, blot(5, 0.64, 0x3a8a4a, w=0.04), blot(9, 0.72, 0x7a4a2a, w=0.04), s=0x4a4a50, chip=0xd8e0e8),
        P(0x3a8a4a, blot(5, 0.64, 0xd03a2a, w=0.04), blot(9, 0.72, 0x7a4a2a, w=0.04), s=0x44504a, chip=0xd8e8d8)]),
    # Desert Road: layered sandstone strata and sand grains; a saguaro
    'sabaku': dict(v=[
        P(0xd07a3a, stripes(7, 0.3, 0xb05a2a, w=0.35), stripes(7, 0.1, 0xeaa868, w=0.35), spots(30, 0.05, 0x9a4a24), s=0x8a4422, chip=0xf0c898),
        P(0xb04a2a, stripes(7, 0.3, 0x8a3420, w=0.35), stripes(7, 0.1, 0xd88a5a, w=0.35), spots(30, 0.05, 0x7a2a18), s=0x6a2a18, chip=0xe8b088)],
        bits=[B('cactus', 'top', 1, paint=0x4a7a3a)]),
    # Harbour Town: boat-hull planks, teal and navy over red antifouling with a white waterline, rust; barnacles
    'minato': dict(v=[
        P(0x2a6a8a, stripes(5, 0.06, 0x163040, w=0.02), below(0.24, 0xeef0ee, w=0.03), below(0.18, 0xa8302a, w=0.03),
          blot(7, 0.7, 0x8a4a2a, sq=(1, 1, 0.3)), s=0x1e3a4a, chip=0xd8e8ee),
        P(0x24305a, stripes(5, 0.06, 0x121a30, w=0.02), below(0.24, 0xeef0ee, w=0.03), below(0.18, 0xa8302a, w=0.03),
          blot(7, 0.7, 0x8a4a2a, sq=(1, 1, 0.3)), s=0x161e36, chip=0xc8d0e8)],
        bits=[B('barnacle', 'bot', 2, paint=0xc8c2b4)]),
    # Dandy Gang: suit cloth, charcoal and navy pinstripe, brown windowpane tweed
    'datesha': dict(v=[
        P(0x34343c, stripes(13, 0.08, 0xd4d4cc, ax=(1, 0, 0), w=0.01), s=0x1a1a20, sL=[], chip=0x7a7a84),
        P(0x2a3050, stripes(13, 0.08, 0xc8ccd8, ax=(1, 0, 0), w=0.01), s=0x161a2c, sL=[], chip=0x6a7090),
        P(0x5a4434, stripes(5, 0.07, 0xb08a5a, ax=(1, 0, 0), w=0.01), stripes(5, 0.07, 0xb08a5a, w=0.01), s=0x2e2218, sL=[], chip=0x9a8070)]),
    # National Animal Parade: parade-balloon rubber, a colour per letter, a painted gloss dab; tied knots
    'okuni': dict(v=[
        P(c, dab((-0.2, 0.76), 0.085, h, w=0.05), below(0.16, d, w=0.12), s=d, chip=h)
        for c, h, d in ((0xd8342e, 0xf49a8a, 0x8a1e1a), (0x2a5ab8, 0x8ab4ec, 0x1a3a7a), (0x3a9a4a, 0x9ad8a0, 0x226a30),
                        (0xe8702a, 0xf8b888, 0xa8481a), (0x7a4ab0, 0xc0a0e8, 0x4e2e7a))],
        bits=[B('knot', 'all', paint='front')]),
}
