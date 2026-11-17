"""Chibi people for the figure kit: the game's blocky-but-not-too-blocky humans as lowpix parts.

chibi(F, ...) builds a posable little person (hips > torso > neck > head, arms with elbows and hands, legs with knees
and shoes) at `at`, faces +Z. Every joint is a lowpix part, so clips can move it (arm swings, nods, head turns).
Returns a dict of part ids and dimensions so a figure can hang props on the hands and hats on the head.

Poses are in degrees: arm=(forward, out, twist) raises an arm forward / out to its own side; leg=(forward, out);
elbow / knee bend forward; head=(nod down, turn to its left, tilt).
"""
from figlib import Raster

HAIR = ("short", "spiky", "bob", "long", "ponytail", "twin", "pompadour", "bun", "bald", "buzz", "topknot", "parted")


def chibi(F, at=(0, 0, 0), p="", sc=1.0, skin="#f0c9a2", hair="short", hair_col="#2b211c", top="#c8473b", top_style="cloth",
          bottom="#2f3b5c", bottom_style="cloth", shoes="#3b2c24", shoe_style="pvc", socks=None, sleeves="long", legs="pants",
          sleeve_col=None, gloves=None, glove_style="pvc", eyes="bead", mouth="smile", face=None, arm_l=(0, 8, 0), arm_r=(0, 8, 0),
          elbow_l=0, elbow_r=0, leg_l=(0, 2), leg_r=(0, 2), knee_l=0, knee_r=0, head=(0, 0, 0), lean=0, turn=0,
          head_size=(20, 18, 17), body=(12.5, 11, 8.2), leg_len=8.5, arm_len=9.5, sit=False, collar=None, belt=None,
          emblem=None, skirt_col=None, hair_seed=0, no_face=False, head_style="skin", neck=True, ears=True, torso_tone=3.1,
          helmet=None, tie=None, apron=None, hair_layers=None, shoe_h=2.6):
    s = sc
    hw, hh, hd = head_size[0] * s, head_size[1] * s, head_size[2] * s
    tw, th, td = body[0] * s, body[1] * s, body[2] * s
    LL, AL = leg_len * s, arm_len * s
    SK = F.c(skin, hue=10, k=0.06)
    TOP = F.c(top)
    SLV = F.c(sleeve_col) if sleeve_col else TOP
    BOT = F.c(bottom)
    SH = F.c(shoes)
    HC = F.c(hair_col, hue=16)
    o = {"p": p, "hw": hw, "hh": hh, "hd": hd, "tw": tw, "th": th, "td": td}
    hip_y = at[1] + (0 if sit else LL + shoe_h * s)
    F.bone(p + "hips", (at[0], hip_y, at[2]), rot=(0, turn, 0))
    # pelvis / shorts block
    if legs == "skirt":
        SKC = F.c(skirt_col) if skirt_col else BOT
        F.loft(p + "skirt", [((0, 2.6 * s, 0), [tw * 0.96, td * 0.98]), ((0, -1.0 * s, 0), [tw * 1.12, td * 1.12]),
                             ((0, -4.4 * s, 0), [tw * 1.42, td * 1.38])], (0, 0, 0), parent=p + "hips", col=SKC, style=bottom_style,
               sides=12, rnd=2.2, caps=(False, True), seam=True)
        F.layer(p + "skirt", id="pleats", op="stripes", axis="around", period=0.083, width=0.18, shift=-0.6)
    else:
        F.loft(p + "pelvis", [((0, -1.6 * s, 0), [tw * 0.96, td * 0.98]), ((0, 2.6 * s, 0), [tw * 0.98, td * 1.0])], (0, 0, 0),
               parent=p + "hips", col=BOT, style=bottom_style, sides=8, rnd=3.0, seam=True)
    # torso (a soft block, wider at the chest) with the shirt / suit paint
    F.loft(p + "torso", [((0, 0, 0), [tw * 0.97, td * 0.97]), ((0, th * 0.45, 0), [tw, td]), ((0, th * 0.85, 0), [tw * 0.93, td * 0.94]),
                         ((0, th, 0), [tw * 0.8, td * 0.82])], (0, 2.0 * s, 0), parent=p + "hips", col=TOP, style=top_style,
           sides=8, rnd=2.9, tone=torso_tone, rot=(lean, 0, 0), seam=True)
    o["torso"] = p + "torso"
    if belt:
        F.loft(p + "belt", [((0, 0, 0), [tw * 1.0, td * 1.02]), ((0, 1.5 * s, 0), [tw * 1.0, td * 1.02])], (0, 0.2 * s, 0),
               parent=p + "torso", col=belt, style="pvc", sides=8, rnd=2.9, tone=2.4)
    if collar:
        F.loft(p + "collar", [((0, 0, 0), [tw * 0.8, td * 0.86]), ((0, 1.4 * s, 0), [tw * 0.62, td * 0.7])], (0, th - 0.4 * s, 0),
               parent=p + "torso", col=collar, style=top_style, sides=8, rnd=2.4, tone=3.6)
    if tie:
        F.box(p + "tie", [2.0 * s, th * 0.7, 0.8 * s], (0, th * 0.55, td / 2 + 0.2 * s), ch=0.25 * s, parent=p + "torso", col=tie, style="pvc", tone=3.0)
    if apron:
        F.box(p + "apron", [tw * 0.86, th * 0.9 + 3.5 * s, 0.9 * s], (0, th * 0.36 - 1.6 * s, td / 2 + 0.2 * s), ch=0.3, parent=p + "torso",
              col=apron, style="cloth", tone=3.3)
    if emblem:
        emblem(F, p + "torso", o)
    # neck + head
    nk = p + "neck"
    F.cyl(nk, 2.6 * s, 2.2 * s, (0, th - 0.6 * s, 0), sides=8, parent=p + "torso", col=SK, style="skin", hide=["back", "front"]) if neck else \
        F.bone(nk, (0, th - 0.6 * s, 0), parent=p + "torso")
    F.bone(p + "head_j", (0, th + 1.4 * s, 0), parent=p + "torso", rot=(head[0], head[1], head[2]))
    hs = head_style
    if helmet:
        F.head(p + "head", hw, hh, hd, (0, hh * 0.5, 0), parent=p + "head_j", col=helmet, style="pvc", seam=True)
    else:
        F.head(p + "head", hw, hh, hd, (0, hh * 0.5, 0), parent=p + "head_j", col=SK, style=hs, seam=True)
    o["head"] = p + "head"
    if not no_face and not helmet:
        fk = dict(eyes=eyes, mouth=mouth, ey=round(hh * 0.1 * F.dens))
        fk.update(face or {})
        F.face(p + "head", **fk)
    if ears and not helmet and hair not in ("long", "bob", "twin"):
        for sx in (-1, 1):
            F.loft(p + ("ear_l" if sx > 0 else "ear_r"), [((0, 0, 0), [1.2 * s, 3.4 * s]), ((sx * 1.4 * s, 0, 0), [1.0 * s, 2.8 * s])],
                   (sx * hw * 0.47, -hh * 0.02 + hh * 0.5, -0.6 * s), parent=p + "head", col=SK, style="skin", sides=6, rnd=2.4, subdiv=0)
    if not helmet:
        hair_parts(F, p, hair, HC, hw, hh, hd, s, hair_seed, hair_layers)
    # arms: upper (sleeve), fore (sleeve or skin), hand
    for side, (pose, elbow) in (("l", (arm_l, elbow_l)), ("r", (arm_r, elbow_r))):
        sx = 1 if side == "l" else -1
        fwd, out, tw_ = (list(pose) + [0, 0, 0])[:3]
        sh = p + "arm_" + side
        F.bone(sh, (sx * (tw / 2 + 0.6 * s), th - 2.0 * s, 0), parent=p + "torso", rot=(-fwd, sx * tw_, sx * out))
        up_col = SLV if sleeves in ("long", "short") else SK
        up_sty = top_style if sleeves in ("long", "short") else "skin"
        F.loft(sh + "_up", [((0, 1.2 * s, 0), [3.9 * s, 3.9 * s]), ((0, -AL * 0.48, 0), [3.5 * s, 3.5 * s])], (0, 0, 0), parent=sh,
               col=up_col, style=up_sty, sides=8, rnd=2.6, subdiv=0)
        fo_col = SLV if sleeves == "long" else SK
        fo_sty = top_style if sleeves == "long" else "skin"
        F.bone(sh + "_el", (0, -AL * 0.46, 0), parent=sh, rot=(-elbow, 0, 0))
        F.loft(sh + "_fo", [((0, 0.4 * s, 0), [3.4 * s, 3.4 * s]), ((0, -AL * 0.42, 0), [3.2 * s, 3.2 * s])], (0, 0, 0), parent=sh + "_el",
               col=fo_col, style=fo_sty, sides=8, rnd=2.6, subdiv=0)
        if sleeves == "long" and sleeve_col is None and top_style != "pvc":
            F.layer(sh + "_fo", id="cuff", op="band", axis="y", **{"from": -1.0, "to": -0.72}, shift=-0.5)
        hc = F.c(gloves) if gloves else SK
        F.blob(sh + "_hand", 3.6 * s, 3.8 * s, 3.4 * s, (0, -AL * 0.42 - 3.6 * s, 0), parent=sh + "_el", col=hc,
               style=glove_style if gloves else "skin", sides=8, rnd=2.6, bottom=0.7, top=0.75)
        F.bone(sh + "_grip", (0, -AL * 0.42 - 1.8 * s, 0.4 * s), parent=sh + "_el")
        o["hand_" + side] = sh + "_grip"
        o["arm_" + side] = sh
    # legs: thigh+shin with a knee, shoes
    for side, (pose, knee) in (("l", (leg_l, knee_l)), ("r", (leg_r, knee_r))):
        sx = 1 if side == "l" else -1
        fwd, out = (list(pose) + [0, 0])[:2]
        if sit:
            fwd, knee = (fwd or 90), (knee if knee else 90)
        lg = p + "leg_" + side
        F.bone(lg, (sx * tw * 0.24, 0, 0), parent=p + "hips", rot=(-fwd, 0, sx * out))
        lc, lsty = (BOT, bottom_style) if legs == "pants" else (SK, "skin")
        F.loft(lg + "_th", [((0, 0.6 * s, 0), [4.9 * s, 5.0 * s]), ((0, -LL * 0.5, 0), [4.4 * s, 4.6 * s])], (0, 0, 0), parent=lg,
               col=lc, style=lsty, sides=8, rnd=2.7, subdiv=0)
        F.bone(lg + "_kn", (0, -LL * 0.48, 0), parent=lg, rot=(knee, 0, 0))
        F.loft(lg + "_sh", [((0, 0.4 * s, 0), [4.3 * s, 4.5 * s]), ((0, -LL * 0.52, 0), [3.9 * s, 4.1 * s])], (0, 0, 0), parent=lg + "_kn",
               col=lc, style=lsty, sides=8, rnd=2.7, subdiv=0)
        if socks:
            F.layer(lg + "_sh", id="sock", op="band", axis="y", **{"from": -1.0, "to": -0.2}, ramp=F.c(socks), tone=3.4)
        F.box(lg + "_shoe", [4.7 * s, shoe_h * s, 7.0 * s], (0, -LL * 0.52 - shoe_h * 0.5 * s + 0.2 * s, 1.0 * s), ch=0.9 * s,
              parent=lg + "_kn", col=SH, style=shoe_style, tone=2.6)
        F.layer(lg + "_shoe", id="sole", op="band", axis="y", **{"from": -1.0, "to": -0.45}, ramp="white", tone=4.4)
    return o


def hair_parts(F, p, hair, HC, hw, hh, hd, s, seed=0, layers=None):
    hp = p + "head"
    if hair == "bald":
        F.layer(hp, id="shine", op="spots", centers=[[-hw * 0.18, hh * 0.42, hd * 0.05, 2.2 * s]], shift=0.9)
        return
    if hair == "buzz":
        F.layer(hp, id="buzz", op="band", axis="y", **{"from": 0.25, "to": 1.0}, wobble=0.04, ramp=HC, tone=2.6, faces=["-end"])
        F.layer(hp, id="buzz_b", op="band", axis="z", **{"from": -1.0, "to": -0.2}, ramp=HC, tone=2.6, faces=["-end"])
        F.layer(hp, id="stubble", op="speckle", density=0.12, shift=-0.6, faces=["-end"])
        return
    # the cap of hair: a shell over top / sides / back (the face stays clear)
    long_ = hair in ("long", "bob", "twin")
    lo = 0.5 if long_ else 0.22
    hs = hh * (1.0 if long_ else 0.74) + 1.6 * s
    sy = hh * 0.5 + hh * (0.5 - lo) * 0.0 + (hh * 0.13 if not long_ else hh * 0.03)
    F.loft(p + "hair", [((0, sy - hh * 0.02, -hd / 2 - 1.0 * s), [hw * 0.92, hs * 0.94]), ((0, sy, -hd * 0.25), [hw + 1.7 * s, hs + 0.6 * s]),
                        ((0, sy + 0.2 * s, hd * 0.22), [hw + 1.6 * s, hs + 0.2 * s]), ((0, sy + 0.9 * s, hd / 2 - 1.2 * s), [hw * 0.96, hs * 0.88])],
           (0, 0, 0), parent=p + "head_j", col=HC, style="matte", sides=10, rnd=2.5, subdiv=1, seam=True)
    F.layer(p + "hair", id="strands", op="stripes", axis="x", period=1.4 * s, width=0.3, wobble=0.25, shift=-0.6)
    F.layer(p + "hair", id="sheen", op="band", axis="y", **{"from": 0.35, "to": 0.62}, wobble=0.18, shift=1.0, faces=["lit"])
    if hair == "bob" or hair == "long" or hair == "twin":
        pass
    # bangs: a row of chunky tapering strands across the forehead
    n = 5
    fy = hh * 0.5 + hh * 0.36
    for i in range(n):
        u = (i - (n - 1) / 2) / ((n - 1) / 2)
        ln = (4.6 + 1.8 * ((i * 7 + seed) % 3) / 2) * s
        F.taper(p + f"bang{i}", [hw * 0.25, 2.2 * s, ln], (u * hw * 0.37, fy + 1.0 * s, hd / 2 - 0.3 * s), parent=p + "head_j",
                off=(0, 0, ln / 2), col=HC, style="matte", rot=(82, u * -12, 0), front=(0.3, 0.9), ch=0.5 * s)
    if hair == "spiky":
        for i, (a, ar) in enumerate([(0.1, 0.0), (0.35, 0.12), (0.35, 0.88), (0.6, 0.05), (0.6, 0.95), (0.85, 0.0), (0.55, 0.22), (0.55, 0.78)]):
            F.taper(p + f"spike{i}", [4.2 * s, 4.2 * s, 6.5 * s], (0, 0, 0), parent=p + "hair", front=(0.1, 0.1), ch=0.4 * s,
                    col=HC, style="matte", off=(0, 0, 2.6 * s), attach={"t": a, "around": ar, "align": "surface", "offset": -1.2 * s},
                    rot=(-55 - a * 40, 0, 0))
    if hair in ("long", "twin", "ponytail"):
        pass
    if hair == "long":
        F.taper(p + "hair_back", [hw * 0.98, 3.4 * s, hh * 1.25], (0, hh * 0.72, -hd / 2 - 0.4 * s), parent=p + "head_j", col=HC,
                style="matte", rot=(90, 0, 0), off=(0, 0, hh * 0.62), front=(1.08, 0.8), ch=1.0 * s)
        F.layer(p + "hair_back", id="strands", op="stripes", axis="x", period=1.6 * s, width=0.3, wobble=0.2, shift=-0.6)
    if hair in ("bob", "long", "twin"):
        for sx in (-1, 1):
            F.taper(p + ("lock_l" if sx > 0 else "lock_r"), [3.4 * s, hd * 0.7, hh * 0.95], (sx * (hw / 2 + 0.5 * s), hh * 0.62, 0.6 * s),
                    parent=p + "head_j", col=HC, style="matte", rot=(90, 0, 0), off=(0, 0, hh * 0.42), front=(0.7, 0.6), ch=0.8 * s)
            F.layer(p + ("lock_l" if sx > 0 else "lock_r"), id="strands", op="stripes", axis="z", period=1.5 * s, width=0.3, wobble=0.2, shift=-0.6)
    if hair == "ponytail":
        F.loft(p + "tail", [((0, 0, 0), 3.6 * s), ((0, -2.0 * s, -3.0 * s), 4.6 * s), ((0, -6.5 * s, -4.2 * s), 4.0 * s), ((0, -11 * s, -3.2 * s), 1.4 * s)],
               (0, hh * 0.75, -hd / 2 - 0.4 * s), parent=p + "head_j", col=HC, style="matte", sides=8, rnd=2.3, chain=True)
        F.cyl(p + "hairtie", 2.2 * s, 1.4 * s, (0, hh * 0.75, -hd / 2 - 0.6 * s), parent=p + "head_j", col="#c83a48", sides=8, rot=(80, 0, 0))
    if hair == "twin":
        for sx in (-1, 1):
            nm = p + ("tail_l" if sx > 0 else "tail_r")
            F.loft(nm, [((0, 0, 0), 3.4 * s), ((sx * 2.6 * s, -1.5 * s, -1.0 * s), 4.4 * s), ((sx * 3.6 * s, -7 * s, -1.2 * s), 3.6 * s),
                        ((sx * 2.4 * s, -12 * s, -0.4 * s), 1.2 * s)], (sx * hw * 0.42, hh * 0.86, -hd * 0.22), parent=p + "head_j",
                   col=HC, style="matte", sides=8, rnd=2.3, chain=True)
    if hair == "pompadour":
        F.loft(p + "pomp", [((0, 0, -hd * 0.25), [hw * 0.82, 5 * s]), ((0, 2.2 * s, hd * 0.25), [hw * 0.9, 7.5 * s]),
                            ((0, 2.6 * s, hd * 0.62), [hw * 0.82, 7.2 * s]), ((0, 0.6 * s, hd * 0.8), [hw * 0.6, 4.2 * s])],
               (0, hh * 0.98, 0), parent=p + "head_j", col=HC, style="pvc", sides=10, rnd=2.6)
        F.layer(p + "pomp", id="comb", op="stripes", axis="x", period=1.6 * s, width=0.25, shift=-0.7)
    if hair == "bun" or hair == "topknot":
        r = 4.4 * s if hair == "bun" else 2.6 * s
        F.blob(p + "bun", r * 2, r * 1.6, r * 2, (0, hh * 1.04, -hd * 0.12 if hair == "bun" else 0), parent=p + "head_j", col=HC, style="matte",
               sides=10, rnd=2.3, bottom=0.8, top=0.5)
    if hair == "parted":
        F.layer(p + "hair", id="part", op="band", axis="x", **{"from": 0.18, "to": 0.24}, shift=-1.2, faces=["up"])
