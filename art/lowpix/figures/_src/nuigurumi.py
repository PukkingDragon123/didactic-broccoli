"""Plush Pals (ぬいぐるみなかま): real kinds of soft toy, modelled low poly by hand in lowpix (docs/LOWPOLY.md) to the
proportions of reference photos, and photo-bashed with real CC0 fabric photos (Poly Haven: curly mohair, minky,
fleece, knit, felt, denim) under painted light, seams, stitched noses and safety eyes. Each sits on its own bottom.
Scale: a 30 cm shop plush made about 36 mm (1:8)."""
from figlib import Fig, Raster, text5

S = "nuigurumi"


# ------------------------------------------------------------------ plush kit
def body(F, pid, h, w, d, col, style, at=(0, 0, 0), belly=0.0, top=0.5, sides=12):
    """A seated plush body: a soft pear, widest low down where the stuffing settles, a flat-ish seat."""
    rings = [((0, 0, 0), [w * 0.78, d * 0.74]), ((0, h * 0.12, 0), [w * 0.98, d * 0.95]), ((0, h * 0.36, belly), [w, d]),
             ((0, h * 0.7, 0), [w * 0.86, d * 0.84]), ((0, h, 0), [w * top, d * top])]
    return F.loft(pid, rings, at, sides=sides, rnd=2.2, up=[0, 0, 1], col=col, style=style)


def head(F, pid, w, h, d, col, style, at, front=0.9, back=0.84, sides=12):
    """A stuffed head: a soft loft from the back seam to the face (the face is the 'end' cap)."""
    rings = [((0, -h * 0.02, -d / 2), [w * back * 0.7, h * back * 0.7]), ((0, 0, -d * 0.3), [w * 0.97, h * 0.97]),
             ((0, 0, d * 0.05), [w, h]), ((0, -h * 0.03, d * 0.32), [w * front, h * front * 0.96]),
             ((0, -h * 0.06, d / 2), [w * front * 0.66, h * front * 0.66])]
    return F.loft(pid, rings, at, sides=sides, rnd=2.2, col=col, style=style, seam="x")


def limb(F, pid, a, b, r0, r1, col, style, sides=8, mid=None, flat=0.92):
    """A stuffed arm / leg from a to b: a soft tube, a little fatter at the paw, ending in a stuffed dome."""
    pts = [a, mid, b] if mid else [a, b]
    rs = [r0, (r0 + r1) / 2 * 0.96, r1] if mid else [r0, r1]
    rings = [(p, [2 * r, 2 * r * flat]) for p, r in zip(pts, rs)]
    dx, dy, dz = (b[i] - pts[-2][i] for i in range(3))
    L = max((dx * dx + dy * dy + dz * dz) ** 0.5, 1e-6)
    for t, k in ((0.45, 0.86), (0.8, 0.52)):
        rings.append(((b[0] + dx / L * r1 * t, b[1] + dy / L * r1 * t, b[2] + dz / L * r1 * t), [2 * r1 * k, 2 * r1 * k * flat]))
    ex, ey, ez = (pts[1][i] - a[i] for i in range(3))
    E = max((ex * ex + ey * ey + ez * ez) ** 0.5, 1e-6)
    rings.insert(0, ((a[0] - ex / E * r0 * 0.5, a[1] - ey / E * r0 * 0.5, a[2] - ez / E * r0 * 0.5), [2 * r0 * 0.7, 2 * r0 * 0.7 * flat]))
    return F.loft(pid, rings, (0, 0, 0), sides=sides, rnd=2.2, subdiv=0, col=col, style=style)


def ear(F, pid, at, r, t, col, style, inner=None, rot=(0, 0, 0), sides=8):
    """A flat round sewn ear (two layers of plush, stuffed thin), its inner face a contrast fabric."""
    p = F.add(pid, "prism", at, size=[2 * r, 2 * r * 0.92, t], sides=sides, rot=list(rot), col=col, style=style, front_scale=[0.9, 0.9])
    if inner:
        F.layer(pid, id="inner", op="spots", centers=[[0, -r * 0.1, t / 2, r * 0.7]], ramp=inner, tone=3.0, faces=["front"])
    return p


def bead_eye(F, pid, at, r, rot=(0, 0, 0), parent=None):
    """A black plastic safety eye: a shiny domed bead with a white catchlight (the toy's own eye, not printed)."""
    F.add(pid, "prism", at, size=[2 * r, 2 * r, r * 0.9], sides=8, rot=list(rot), col="ink", style="pvc", tone=1.4,
          front_scale=[0.62, 0.62], parent=parent,
          paint={"ramp": "ink", "tone": 1.4, "stamps": [{"face": "front", "at": [1, 1], "art": ["w"], "key": {"w": "white:5"}}]})


def stitch_nose(F, pid, w=7, h=5, ramp="ink", face="end", off=(0, 0), mouth=True):
    """An embroidered nose (satin-stitched triangle) and the stitched mouth below it."""
    R = Raster(w, h + (4 if mouth else 0))
    for y in range(h):
        k = (w - 1) * (1 - y / max(h, 1)) / 2
        for x in range(w):
            if abs(x - (w - 1) / 2) <= k + 0.3:
                R.set(x, y, "n" if (x + y) % 2 else "m")
    R.set(int(w / 2) - 1, 0, "h")
    if mouth:
        c = (w - 1) / 2
        R.line([(c, h), (c, h + 1.5)], "n")
        R.line([(c, h + 1.5), (c - 2.2, h + 3)], "n")
        R.line([(c, h + 1.5), (c + 2.2, h + 3)], "n")
    F.stamp(pid, R.rows(), {"n": f"{ramp}:1", "m": f"{ramp}:2", "h": f"{ramp}:4"}, face, off=off)


def tag(F, pid, at, rot=(0, 0, 0)):
    """The sewn-in care tag: a little folded white satin label with a red woven brand line."""
    art = ["wwwwww", "wrrrrw", "wwwwww", "wkkkkw", "wwwwww", "wkkkww", "wwwwww"]
    F.card(pid, art, {"w": "white:4", "r": "cc84838:3", "k": "ink:4"}, at, plane="yz", rot=list(rot))


def gingham(F, pid, col, period=1.7):
    """Woven gingham: crossed bands of the darker tone, darkest where they cross (painted, in part units)."""
    for ax in ("x", "y"):
        F.layer(pid, id="g" + ax, op="stripes", axis=ax, period=period, width=0.42, shift=-0.75, space="world")


def gimmick(F, kind="wobble", length=1.4, amp=8.0):
    """The toy's gimmick (click): the whole plush rocks on its seat (wobble), nods forward (nod) or hops (hop).
    Every part hangs off one root joint at the seat so it moves as one soft toy."""
    root = {"id": "root", "shape": "bone", "pivot": [0, 0, 0]}
    for p in F.spec["parts"]:
        p.setdefault("parent", "root")
    F.spec["parts"].insert(0, root)
    F.ids["root"] = root
    if kind == "hop":
        tr = [{"part": "root", "channel": "position", "keys": [[0, [0, 0, 0]], [0.25, [0, amp * 0.5, 0]], [0.5, [0, 0, 0]],
                                                              [0.75, [0, amp * 0.3, 0]], [1.0, [0, 0, 0]]]}]
    else:
        ax = 0 if kind == "nod" else 2
        k = lambda v: [v if i == ax else 0 for i in range(3)]
        tr = [{"part": "root", "keys": [[0, k(0)], [0.3, k(amp)], [0.65, k(-amp * 0.6)], [1.0, k(0)]]}]
    for t in tr:
        t["keys"] = [[round(a * length, 3), v] for a, v in t["keys"]]
    F.clip(kind, length, tr, role="gimmick")


def fig_teddy():
    F = Fig(f"{S}/teddy", "Old Teddy", "Bald at the paws from forty years of hugs, in the dungarees Grandma sewed. Still the first one in the bed.")
    # reference: a 1930s mohair teddy in denim dungarees and a cream knitted jumper (refs/teddy.jpg, PD): seated,
    # head 0.45 of the height and as wide as the body, big round ears high on the head, a short pale muzzle,
    # long arms to the knees, legs straight out, worn felt pads.
    fur = F.c("#8a5a2c", hue=14, spread=0.85)
    pad = F.c("#b89068", spread=0.7)
    denim = F.c("#4a6a98", hue=8, spread=0.8)
    knit = F.c("#e2d2b0", spread=0.75)
    red = F.c("#c83a2c")
    F.loft("pants", [((0, 0, 0), [14.6, 12.6]), ((0, 2.2, 0.3), [17.4, 15.2]), ((0, 6.4, 0.6), [17.6, 15.0]), ((0, 10.6, 0.3), [15.6, 13.4])],
           (0, 0, 0), sides=10, rnd=2.2, up=[0, 0, 1], col=denim, style="jean")
    F.loft("jumper", [((0, 10.0, 0.3), [15.4, 13.2]), ((0, 13.6, 0), [14.6, 12.4]), ((0, 16.4, 0), [11.4, 9.8]), ((0, 17.6, 0), [8.0, 7.0])],
           (0, 0, 0), sides=10, rnd=2.2, up=[0, 0, 1], col=knit, style="knit")
    F.box("bib", [8.2, 6.4, 1.0], (0, 13.2, 6.4), ch=0.3, col=denim, style="jean", rot=[-12, 0, 0])
    F.stamp("bib", text5("TEDDY"), {"#": f"{red}:3"}, face="front", at="center", off=(0, 1))
    for sx in (-1, 1):
        F.box(f"strap{'LR'[sx > 0]}", [1.6, 8.0, 0.8], (sx * 3.4, 16.4, 4.6), ch=0.2, col=denim, style="jean", rot=[-38, 0, sx * -6])
        F.add(f"button{'LR'[sx > 0]}", "prism", (sx * 3.4, 15.6, 7.2), size=[1.2, 1.2, 0.5], sides=6, rot=[-12, 0, 0],
              col="#c8b070", style="metal")
    head(F, "head", 17.6, 15.6, 14.6, fur, "plush", at=(0, 24.8, 0.6), sides=12)
    F.loft("muzzle", [((0, 0, 0), [8.0, 6.4]), ((0, -0.3, 2.4), [7.2, 5.6]), ((0, -0.6, 3.8), [5.0, 3.8])], (0, 22.4, 6.0),
           sides=8, rnd=2.2, col=pad, style="felt")
    stitch_nose(F, "muzzle", 9, 5, off=(0, -4))
    for sx in (-1, 1):
        k = "LR"[sx > 0]
        ear(F, f"ear{k}", (sx * 7.0, 31.8, -1.2), 3.8, 2.0, fur, "plush", inner=pad, rot=(-8, sx * -14, sx * -20))
        bead_eye(F, f"eye{k}", (sx * 3.3, 26.9, 8.5), 1.0, rot=(0, sx * 20, 0))
        limb(F, f"arm{k}", (sx * 7.2, 15.2, 0.6), (sx * 9.4, 7.2, 4.4), 2.8, 2.5, knit, "knit", mid=(sx * 8.9, 11.4, 2.8))
        F.loft(f"paw{k}", [((sx * 9.5, 7.0, 4.6), [4.4, 4.0]), ((sx * 9.7, 4.6, 5.8), [4.6, 4.2]), ((sx * 9.8, 3.2, 6.4), [2.6, 2.4])],
               (0, 0, 0), sides=8, rnd=2.2, col=fur, style="plush")
        limb(F, f"leg{k}", (sx * 4.6, 3.4, 2.0), (sx * 5.6, 3.3, 10.6), 3.4, 3.3, denim, "jean")
        F.add(f"foot{k}", "prism", (sx * 5.7, 3.3, 12.4), size=[6.0, 6.4, 1.4], sides=10, col=pad, style="felt", front_scale=[0.86, 0.86])
    gimmick(F, "nod", 1.6, 10)
    return F


def fig_bunny():
    F = Fig(f"{S}/bunny", "Gingham Bunny", "A 1930s cloth rabbit in a pink check romper, its painted face a little faded, its ears lined with satin.")
    # reference: a cotton stuffed rabbit (refs/bunny.jpg, PD, museum photo): standing, head 0.25 of the height,
    # ears as long as the head, a romper from neck to ankles, arms to mid-thigh, big flat cloth feet.
    cloth = F.c("#e6dcc6", spread=0.7)
    pink = F.c("#e2aab8", hue=8, spread=0.75)
    satin = F.c("#e8a8b8", spread=0.7)
    F.loft("romper", [((0, 3.2, 0), [6.2, 5.6]), ((0, 9.0, 0), [7.6, 6.6]), ((0, 13.0, 0.2), [12.0, 9.2]), ((0, 18.0, 0.3), [12.6, 9.6]),
                      ((0, 23.4, 0), [10.4, 8.4]), ((0, 25.0, 0), [6.6, 5.8])], (0, 0, 0), sides=10, rnd=2.2, up=[0, 0, 1],
           col=pink, style="cotton")
    gingham(F, "romper", pink)
    F.box("crotch", [3.4, 5.4, 5.0], (0, 10.4, 0), ch=1.2, col=pink, style="cotton")
    gingham(F, "crotch", pink)
    for sx in (-1, 1):
        k = "LR"[sx > 0]
        F.loft(f"leg{k}", [((sx * 3.0, 12.0, 0), [5.2, 5.0]), ((sx * 3.3, 6.0, 0.2), [4.8, 4.6]), ((sx * 3.4, 2.6, 0.3), [4.4, 4.2])],
               (0, 0, 0), sides=8, rnd=2.2, col=pink, style="cotton")
        gingham(F, f"leg{k}", pink)
        F.loft(f"foot{k}", [((sx * 3.5, 0.9, -2.2), [4.4, 1.8]), ((sx * 3.6, 1.2, 1.4), [5.0, 2.4]), ((sx * 3.7, 1.0, 4.4), [3.8, 1.8])],
               (0, 0, 0), sides=8, rnd=2.2, col=cloth, style="cotton")
        limb(F, f"arm{k}", (sx * 5.4, 22.0, 0.2), (sx * 7.0, 13.6, 1.2), 2.2, 1.9, pink, "cotton", mid=(sx * 6.6, 18.0, 0.6))
        gingham(F, f"arm{k}", pink)
        F.loft(f"hand{k}", [((sx * 7.1, 13.4, 1.2), [3.2, 3.0]), ((sx * 7.2, 11.6, 1.4), [3.2, 3.0]), ((sx * 7.2, 10.4, 1.4), [1.8, 1.6])],
               (0, 0, 0), sides=8, rnd=2.2, col=cloth, style="cotton")
        F.loft(f"ear{k}", [((sx * 2.6, 32.0, -0.6), [3.2, 1.6]), ((sx * 3.4, 37.0, -0.9), [4.2, 1.8]), ((sx * 4.0, 41.0, -1.2), [3.6, 1.6]),
                           ((sx * 4.2, 43.0, -1.3), [1.6, 1.0])], (0, 0, 0), sides=8, rnd=2.2, col=cloth, style="cotton")
        F.layer(f"ear{k}", id="satin", op="band", axis="z", **{"from": 0.15, "to": 1.0}, ramp=satin, tone=3.4)
    F.loft("collar", [((0, 24.4, 0), [7.8, 6.8]), ((0, 25.4, 0), [7.4, 6.4])], (0, 0, 0), sides=10, rnd=2.2, up=[0, 0, 1], col=pink, style="cotton")
    head(F, "head", 11.4, 11.0, 9.8, cloth, "cotton", at=(0, 29.8, 0.2), front=0.92, back=0.86, sides=10)
    # the painted face: blue eyes with a black pupil, a pink nose, a red mouth line and black whiskers
    eye = ["..bb..", ".bkkb.", "bkkwkb", "bkkkkb", ".bkkb.", "..bb.."]
    blue, red = F.c("#5a88c8"), F.c("#c83a3a")
    for sx in (-1, 1):
        F.stamp("head", eye, {"b": f"{blue}:3", "k": "ink:1", "w": "white:5"}, "end", off=(sx * 9, -3))
    face = Raster(30, 12)
    face.rect(13, 0, 17, 2, "p"); face.set(14, 2, "p"); face.set(15, 2, "p")
    face.line([(15, 3), (15, 4)], "m"); face.line([(15, 4), (12, 6)], "m"); face.line([(15, 4), (18, 6)], "m")
    for sgn in (-1, 1):
        for dy in (-1, 1):
            face.line([(15 + sgn * 4, 2 + dy * 0.5), (15 + sgn * 13, 1 + dy * 2.2)], "k")
    F.stamp("head", face.rows(), {"p": f"{satin}:2", "m": f"{red}:2", "k": "ink:2"}, "end", off=(0, 5))
    gimmick(F, "wobble", 1.2, 9)
    return F


def fig_penguin():
    F = Fig(f"{S}/penguin", "Penguin Plush", "A round minky penguin on orange felt feet. It sits up by itself, which is more than most.")
    # reference: a sitting penguin plush (refs/penguin.jpg, CC BY): one soft pear 1.15 times as tall as wide,
    # a black hood to the eyes, a white face and belly, grey back and flippers, a small orange beak, flat felt feet.
    grey = F.c("#7c8088", spread=0.75)
    white = F.c("#ecebe6", spread=0.7)
    black = F.c("#2c2c34", spread=0.6)
    orange = F.c("#e8702a", hue=10)
    F.loft("body", [((0, 0, 0), [21.0, 18.4]), ((0, 3.0, 0.2), [25.6, 22.4]), ((0, 10.0, 0.4), [26.4, 23.0]), ((0, 19.0, 0.2), [22.6, 20.2]),
                    ((0, 26.0, 0), [18.6, 17.4]), ((0, 31.0, -0.2), [13.0, 12.4]), ((0, 33.6, -0.4), [6.0, 5.8])],
           (0, 0, 0), sides=14, rnd=2.2, up=[0, 0, 1], col=grey, style="minky", seam="x")
    F.layer("body", id="belly", op="spots", centers=[[0, 11.0, 10.0, 11.6], [0, 21.0, 9.0, 8.0]], ramp=white, tone=3.4, roughness=0.15)
    F.layer("body", id="hood", op="band", axis="y", **{"from": 0.42, "to": 1.0}, ramp=black, tone=2.6, wobble=0.04)
    F.layer("body", id="face", op="spots", centers=[[-3.8, 24.4, 8.4, 3.4], [3.8, 24.4, 8.4, 3.4], [0, 22.2, 9.4, 4.0]], ramp=white, tone=3.3, roughness=0.1)
    F.loft("beak", [((0, 0, 0), [4.6, 2.8]), ((0, -0.2, 2.4), [3.0, 1.8]), ((0, -0.5, 3.6), [0.6, 0.5])], (0, 23.0, 8.6),
           sides=8, rnd=2.2, col=orange, style="felt")
    for sx in (-1, 1):
        k = "LR"[sx > 0]
        bead_eye(F, f"eye{k}", (sx * 3.8, 25.6, 8.0), 1.05, rot=(0, sx * 22, 0))
        F.loft(f"wing{k}", [((sx * 11.2, 19.0, 0), [2.2, 7.2]), ((sx * 13.2, 12.0, 0.6), [2.6, 7.6]), ((sx * 13.6, 6.0, 1.0), [2.0, 5.4]),
                            ((sx * 13.0, 3.6, 1.2), [1.2, 2.4])], (0, 0, 0), sides=8, rnd=2.2, col=grey, style="minky")
        F.loft(f"foot{k}", [((sx * 4.6, 0.8, 6.0), [5.0, 1.6]), ((sx * 5.2, 0.8, 9.4), [6.6, 1.6]), ((sx * 5.6, 0.7, 12.0), [5.4, 1.2])],
               (0, 0, 0), sides=8, rnd=2.4, col=orange, style="felt")
    gimmick(F, "hop", 1.2, 4)
    return F


def seated(F, fur, style, h=17.0, w=17.0, d=15.0, hw=17.0, hh=15.5, hd=14.5, hy=24.6, belly=None, belly_r=None):
    """The common seated-plush body and head (a soft pear and a stuffed head), returns the head's front z."""
    body(F, "body", h, w, d, fur, style, belly=0.8, sides=12)
    if belly:
        F.layer("body", id="belly", op="spots", centers=[[0, h * 0.42, d * 0.5, belly_r or w * 0.36]], ramp=belly, tone=3.3, roughness=0.2)
    head(F, "head", hw, hh, hd, fur, style, at=(0, hy, 0.6), sides=12)
    return 0.6 + hd / 2


def fig_panda():
    F = Fig(f"{S}/panda", "Panda Plush", "Black and white and soft all over, the prize from the department-store roof garden.")
    # reference: a seated panda plush (refs/panda.jpg, CC BY): a white head 0.42 of the height with black eye
    # patches and round black ears, a white body, black arms, legs and a black band over the shoulders.
    white, black = F.c("#ecebe4", spread=0.7), F.c("#26262c", spread=0.6)
    z = seated(F, white, "plush", hw=17.4, hh=15.4)
    F.layer("body", id="shoulders", op="band", axis="y", **{"from": 0.45, "to": 1.0}, ramp=black, tone=3.0, wobble=0.05)
    F.loft("muzzle", [((0, 0, 0), [7.4, 5.8]), ((0, -0.3, 2.2), [6.6, 5.0]), ((0, -0.6, 3.4), [4.4, 3.4])], (0, 22.4, z - 2.2),
           sides=10, rnd=2.2, col=white, style="plush")
    F.stamp("muzzle", ["..kkkk..", ".kkkkkk.", ".kkhkkk.", "..kkkk..", "...kk...", "...k....", "..k.k..."],
            {"k": f"{black}:2", "h": f"{black}:5"}, "end", off=(0, -2))
    F.layer("head", id="patches", op="spots", centers=[[-3.6, 1.6, 6.2, 2.6], [3.6, 1.6, 6.2, 2.6]], ramp=black, tone=3.0,
            roughness=0.15, stretch=[0.8, 1.15, 1.0])
    for sx in (-1, 1):
        k = "LR"[sx > 0]
        ear(F, f"ear{k}", (sx * 6.8, 31.6, -1.0), 3.2, 2.2, black, "plush", rot=(-8, sx * -14, sx * -20))
        bead_eye(F, f"eye{k}", (sx * 3.4, 26.6, z + 0.75), 0.95, rot=(0, sx * 20, 0))
        limb(F, f"arm{k}", (sx * 7.2, 15.2, 0.6), (sx * 8.8, 6.8, 5.0), 3.0, 2.8, black, "plush", mid=(sx * 8.6, 11.0, 3.0))
        limb(F, f"leg{k}", (sx * 4.8, 3.6, 2.0), (sx * 5.6, 3.4, 10.4), 3.6, 3.5, black, "plush")
    gimmick(F, "wobble", 1.4, 9)
    return F


def fig_tiger():
    F = Fig(f"{S}/tiger", "Tiger Plush", "Orange and striped with a big white muzzle, sitting very straight. The year of the tiger's lucky prize.")
    # reference: a seated tiger plush (refs/tiger.jpg, CC BY): a big round head 0.45 of the height with a wide white
    # muzzle and round ears, an orange body with a white chest, black stripes, legs out with white paws, a long tail.
    org, white, black = F.c("#e07a28", hue=10, spread=0.8), F.c("#f0e8d8", spread=0.7), F.c("#2a2224", spread=0.6)
    z = seated(F, org, "plush", hw=18.4, hh=15.8, belly=white)
    for part, period in (("body", 3.6), ("head", 3.2)):
        F.layer(part, id="stripes", op="stripes", axis="y", period=period, width=0.22, wobble=1.4, ramp=black, tone=2.6,
                faces=["-end"], range=[0.3, 1.0] if part == "head" else [0.0, 1.0])
    F.loft("muzzle", [((0, 0, 0), [9.4, 6.4]), ((0, -0.3, 2.4), [8.6, 5.6]), ((0, -0.6, 3.6), [5.6, 3.8])], (0, 22.2, z - 2.4),
           sides=10, rnd=2.2, col=white, style="plush")
    stitch_nose(F, "muzzle", 7, 4, ramp=F.c("#d87888"), off=(0, -4))
    for sx in (-1, 1):
        k = "LR"[sx > 0]
        ear(F, f"ear{k}", (sx * 7.0, 31.4, -1.0), 3.0, 1.8, org, "plush", inner=white, rot=(-8, sx * -14, sx * -22))
        bead_eye(F, f"eye{k}", (sx * 3.6, 26.8, z + 0.75), 1.05, rot=(0, sx * 20, 0))
        limb(F, f"arm{k}", (sx * 7.2, 15.2, 0.6), (sx * 8.4, 5.8, 5.6), 2.8, 2.7, org, "plush", mid=(sx * 8.4, 10.6, 3.6))
        limb(F, f"leg{k}", (sx * 4.8, 3.6, 2.0), (sx * 5.4, 3.4, 10.6), 3.4, 3.4, org, "plush")
        for pk in (f"arm{k}", f"leg{k}"):
            F.layer(pk, id="paw", op="band", axis="path", **{"from": 0.84, "to": 1.0}, ramp=white, tone=3.2)
            F.layer(pk, id="stripes", op="stripes", axis="path", period=2.6, width=0.25, ramp=black, tone=2.6, range=[0.15, 0.7])
    F.loft("tail", [((5.0, 1.4, -6.0), [2.4, 2.4]), ((9.0, 1.4, -8.4), [2.2, 2.2]), ((12.6, 1.6, -5.6), [2.0, 2.0]),
                    ((13.4, 2.4, -1.6), [1.8, 1.8]), ((13.0, 2.6, 0.6), [0.8, 0.8])], (0, 0, 0), sides=7, rnd=2.2, col=org, style="plush")
    F.layer("tail", id="rings", op="stripes", axis="path", period=2.4, width=0.4, ramp=black, tone=2.6)
    gimmick(F, "nod", 1.4, 8)
    return F


def fig_monkey():
    F = Fig(f"{S}/monkey", "Sock Monkey", "Sewn from a pair of brown work socks: the red heels are its mouth. Every grandma had the pattern.")
    # reference: two sock monkeys (refs/monkey.jpg, CC BY): seated, a long body, a head 0.3 of the height with a
    # cream muzzle and wide red lips, small round ears, long thin limbs with cream cuffs, a red pompom hat.
    knit, cream, red = F.c("#8a7660", spread=0.75), F.c("#e8dcc4", spread=0.65), F.c("#c8302a", hue=8)
    yel = F.c("#e8c040")
    body(F, "body", 15.0, 11.4, 9.8, knit, "knit", sides=10)
    F.layer("body", id="cream", op="band", axis="y", **{"from": -1.0, "to": -0.55}, ramp=cream, tone=3.2)
    head(F, "head", 12.0, 12.0, 11.0, knit, "knit", at=(0, 21.4, 0.2), sides=10)
    F.loft("muzzle", [((0, 0, 0), [9.6, 6.2]), ((0, -0.4, 2.6), [9.0, 5.8]), ((0, -0.8, 3.8), [6.6, 4.0])], (0, 18.6, 3.6),
           sides=10, rnd=2.2, col=cream, style="knit")
    lips = Raster(26, 9)
    lips.ell(13, 4.5, 12.6, 4.2, "r"); lips.ell(13, 4.5, 11.0, 1.4, "d"); lips.rect(2, 4, 24, 5, "d"); lips.set(10, 2, "h"); lips.set(11, 2, "h")
    F.stamp("muzzle", lips.rows(), {"r": f"{red}:3", "d": f"{red}:1", "h": f"{red}:5"}, "end", off=(0, 1))
    lathe_hat = [((0, 24.8, 0), [10.4, 9.8]), ((0, 26.6, 0), [9.4, 8.8]), ((0, 28.6, 0), [6.6, 6.2]), ((0, 29.8, 0), [2.6, 2.4])]
    F.loft("hat", lathe_hat, (0, 0, 0), sides=10, rnd=2.2, up=[0, 0, 1], col=red, style="knit", rot=[0, 0, 6])
    F.add("pompom", "prism", (-0.9, 30.4, 0), size=[3.6, 3.6, 3.2], sides=8, col=yel, style="plush", front_scale=[0.7, 0.7])
    for sx in (-1, 1):
        k = "LR"[sx > 0]
        ear(F, f"ear{k}", (sx * 6.4, 21.8, 0.0), 2.2, 1.4, knit, "knit", inner=cream, rot=(0, sx * -70, 0))
        bead_eye(F, f"eye{k}", (sx * 2.4, 23.2, 5.6), 0.8, rot=(0, sx * 16, 0))
        limb(F, f"arm{k}", (sx * 5.0, 13.6, 0.2), (sx * 6.8, 3.6, 4.6), 2.0, 1.9, knit, "knit", mid=(sx * 6.4, 8.6, 2.2))
        limb(F, f"leg{k}", (sx * 3.2, 2.6, 1.6), (sx * 4.4, 2.2, 15.6), 2.3, 2.2, knit, "knit")
        for pk in (f"arm{k}", f"leg{k}"):
            F.layer(pk, id="cuff", op="band", axis="path", **{"from": 0.78, "to": 1.0}, ramp=cream, tone=3.3)
            F.layer(pk, id="rib", op="stripes", axis="around", period=0.08, width=0.3, shift=-0.5, range=[0.78, 1.0])
    F.loft("tail", [((0, 3.0, -4.6), [2.4, 2.4]), ((1.0, 2.0, -10.0), [2.2, 2.2]), ((4.0, 1.2, -13.4), [2.0, 2.0]),
                    ((8.0, 1.2, -13.0), [1.8, 1.8]), ((9.6, 1.4, -11.4), [1.0, 1.0])], (0, 0, 0), sides=7, rnd=2.2, col=knit, style="knit")
    gimmick(F, "wobble", 1.4, 10)
    return F


def fig_raccoon():
    F = Fig(f"{S}/raccoon", "Raccoon Plush", "Grey fluff, a black bandit mask and a ringed tail. Looks guilty even when it isn't.")
    # reference: a standing raccoon plush (refs/raccoon.jpg, CC BY): on all fours, low and long (body 1.6 times as
    # long as tall), short black legs, a head a third of the body length tapering to a pointed white muzzle, a black
    # mask round the eyes under white brows, round ears, a thick ringed tail as long as the body.
    grey, white, black = F.c("#8a8a90", spread=0.8), F.c("#ecebe6", spread=0.7), F.c("#28282e", spread=0.6)
    F.loft("body", [((0, 10.0, -12.0), [10.0, 9.6]), ((0, 10.8, -8.6), [14.0, 13.0]), ((0, 11.2, -1.0), [14.6, 13.4]),
                    ((0, 11.4, 5.0), [13.0, 12.2]), ((0, 12.6, 8.6), [9.4, 9.0])], (0, 0, 0), sides=12, rnd=2.2, col=grey, style="plush")
    F.loft("head", [((0, 14.4, 6.6), [9.0, 8.4]), ((0, 15.4, 9.6), [12.0, 10.6]), ((0, 15.2, 12.4), [11.0, 9.4]),
                    ((0, 14.0, 15.0), [6.8, 5.8]), ((0, 13.2, 17.4), [3.8, 3.4]), ((0, 12.9, 18.4), [1.8, 1.6])],
           (0, 0, 0), sides=12, rnd=2.2, col=grey, style="plush")
    F.layer("head", id="muzzle", op="spots", centers=[[0, 13.2, 16.0, 3.6]], ramp=white, tone=3.4, roughness=0.1)
    F.layer("head", id="brow", op="spots", centers=[[-2.6, 16.8, 13.2, 1.9], [2.6, 16.8, 13.2, 1.9]], ramp=white, tone=3.4, roughness=0.1)
    F.layer("head", id="mask", op="spots", centers=[[-3.4, 15.0, 13.0, 2.3], [3.4, 15.0, 13.0, 2.3], [0, 14.8, 14.4, 1.4]], ramp=black,
            tone=3.0, roughness=0.15, stretch=[1.3, 0.8, 1.0])
    F.add("nose", "prism", (0, 13.0, 18.6), size=[1.8, 1.4, 1.0], sides=8, col=black, style="pvc", tone=1.6, front_scale=[0.7, 0.7])
    for sx in (-1, 1):
        k = "LR"[sx > 0]
        bead_eye(F, f"eye{k}", (sx * 3.0, 15.2, 14.2), 0.8, rot=(0, sx * 34, 0))
        ear(F, f"ear{k}", (sx * 4.0, 19.6, 9.6), 2.2, 1.3, grey, "plush", inner=white, rot=(-10, sx * -16, sx * -18))
        for z0, tag in ((5.0, "f"), (-8.4, "b")):
            limb(F, f"leg{tag}{k}", (sx * 4.4, 8.4, z0), (sx * 4.6, 2.4, z0 + 0.8), 2.6, 2.5, black, "plush", flat=1.0)
    F.loft("tail", [((0, 11.0, -11.4), [5.0, 5.0]), ((0, 10.0, -16.0), [6.2, 6.2]), ((1.6, 7.6, -20.4), [5.8, 5.8]),
                    ((3.6, 5.0, -23.0), [4.4, 4.4]), ((4.4, 4.2, -24.4), [1.8, 1.8])], (0, 0, 0), sides=10, rnd=2.2, col=grey, style="plush")
    F.layer("tail", id="rings", op="stripes", axis="path", period=3.0, width=0.42, ramp=black, tone=3.0)
    gimmick(F, "wobble", 1.2, 7)
    return F


def fig_hedgehog():
    F = Fig(f"{S}/hedgehog", "Hedgehog Plush", "A round prickle-pile hedgehog with a soft pale face. The spines are only pretending.")
    # reference: hedgehog plushes (refs/hedgehog.jpg, CC BY): a dome body 1.3 times as long as tall in long shaggy
    # brown pile, a pointed cream face, a big black nose, little feet. Made 38 mm long.
    pile, face, black = F.c("#5a3a22", hue=12, spread=0.95), F.c("#d8b890", spread=0.7), F.c("#28222a", spread=0.6)
    F.loft("body", [((0, 7.0, -15.0), [8.0, 6.4]), ((0, 8.4, -12.0), [20.0, 14.6]), ((0, 9.0, -5.0), [26.0, 18.0]),
                    ((0, 9.0, 2.6), [25.0, 17.0]), ((0, 8.6, 7.6), [20.0, 14.4]), ((0, 8.0, 10.4), [12.0, 9.6])],
           (0, 0, 0), sides=12, rnd=2.2, col=pile, style="fleece")
    F.layer("body", id="spines", op="photo", src="art/lowpix/photos/faux_fur_geometric", scale=8, amount=1.6)
    F.layer("body", id="tips", op="stripes", axis="z", period=0.8, width=0.35, wobble=2.5, shift=1.6)
    F.layer("body", id="roots", op="stripes", axis="x", period=1.1, width=0.3, wobble=2.5, shift=-1.2)
    F.loft("face", [((0, 6.6, 3.0), [15.0, 11.6]), ((0, 6.4, 8.6), [14.6, 11.0]), ((0, 5.8, 12.4), [10.4, 8.4]),
                    ((0, 5.0, 15.6), [6.0, 5.0]), ((0, 4.6, 17.4), [3.0, 2.6])], (0, 0, 0), sides=10, rnd=2.2, col=face, style="minky")
    F.add("nose", "prism", (0, 4.6, 17.8), size=[3.0, 2.6, 2.0], sides=8, col=black, style="pvc", tone=1.6, front_scale=[0.66, 0.66])
    for sx in (-1, 1):
        k = "LR"[sx > 0]
        bead_eye(F, f"eye{k}", (sx * 3.4, 8.0, 12.0), 1.0, rot=(0, sx * 30, 0))
        ear(F, f"ear{k}", (sx * 5.8, 12.4, 7.6), 1.8, 1.0, face, "minky", rot=(-10, sx * -20, 0))
        for z0, tag in ((8.0, "f"), (-8.0, "b")):
            F.loft(f"foot{tag}{k}", [((sx * 6.0, 2.6, z0), [3.6, 3.2]), ((sx * 6.2, 1.0, z0 + 1.4), [3.6, 2.0]),
                                     ((sx * 6.2, 0.6, z0 + 2.8), [2.4, 1.2])], (0, 0, 0), sides=7, rnd=2.2, col=face, style="minky")
    gimmick(F, "hop", 1.2, 3)
    return F


FIGS = {"teddy": fig_teddy, "bunny": fig_bunny, "penguin": fig_penguin, "panda": fig_panda, "tiger": fig_tiger,
        "monkey": fig_monkey, "raccoon": fig_raccoon, "hedgehog": fig_hedgehog}
