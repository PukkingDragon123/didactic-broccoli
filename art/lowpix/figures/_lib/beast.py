"""Four-legged animals for the figure kit: cats, dogs, foxes, tanuki, capybaras, otters... as lowpix lofts.

beast(F, kind, pose, ...) builds a posable animal facing +Z: a soft loft body, a head (loft, the face on its flat
front cap: tampo-printed eyes, a moulded muzzle and nose), ears, legs with paws, a tail chain. Poses: sit, loaf,
stand, walk, curl, lie, beg. Markings: tabby stripes, calico / tuxedo patches, socks, bib, mask.
Returns a dict with the part ids (head, body, tail, paws) so figures can pose / animate them.
"""
from figlib import Raster

KINDS = {
    #        body w,h,len   head w,h,d   snout len,w,h   ear (w,h,round)   leg  tail(len, thick, curl)
    "cat":    dict(body=(11, 10, 17), head=(14, 12, 11), snout=(2.6, 6.8, 4.6), ear=(5.2, 5.8, 0.15), leg=7.5, tail=(17, 2.6, 0.0), eye="cat"),
    "kitten": dict(body=(9, 8.4, 12), head=(13, 11.4, 10.4), snout=(2.2, 6.2, 4.2), ear=(5.0, 5.2, 0.15), leg=5.6, tail=(11, 2.4, 0.0), eye="cat"),
    "shiba":  dict(body=(11.5, 11, 18), head=(13, 11.5, 11), snout=(5.0, 7.0, 5.4), ear=(4.8, 5.4, 0.1), leg=9, tail=(10, 4.2, 1.0), eye="dog"),
    "akita":  dict(body=(13.5, 12.5, 19), head=(14.5, 13, 12), snout=(4.6, 8.0, 6.0), ear=(4.6, 4.6, 0.2), leg=9, tail=(12, 5.2, 1.0), eye="dog"),
    "dachs":  dict(body=(9.5, 9, 26), head=(10.5, 10, 10), snout=(6.5, 5.6, 4.8), ear=(4.2, 7.5, 0.9), leg=4.6, tail=(10, 2.4, 0.0), eye="dog"),
    "chin":   dict(body=(10, 9.5, 13), head=(14, 12.5, 10), snout=(1.4, 6.0, 4.0), ear=(4.6, 6.4, 0.85), leg=6, tail=(9, 5.4, 1.0), eye="dog"),
    "corgi":  dict(body=(12.5, 10.5, 20), head=(13.5, 11.5, 11), snout=(5.0, 7.0, 5.0), ear=(5.6, 7.0, 0.1), leg=4.8, tail=(2.5, 4.0, 0.0), eye="dog"),
    "fox":    dict(body=(9.5, 9.5, 18), head=(12, 10.5, 10), snout=(6.4, 5.6, 4.6), ear=(5.4, 7.2, 0.1), leg=9, tail=(18, 6.2, 0.3), eye="cat"),
    "tanuki": dict(body=(13, 12, 16), head=(13.5, 11.5, 10.5), snout=(4.2, 6.6, 5.0), ear=(4.2, 3.8, 0.45), leg=6, tail=(12, 6.8, 0.2), eye="dog"),
    "capy":   dict(body=(15, 13.5, 22), head=(11, 11.5, 15), snout=(6.0, 9.4, 8.6), ear=(3.0, 2.6, 0.6), leg=5.5, tail=(0.5, 1, 0.0), eye="dog"),
    "otter":  dict(body=(9, 8.5, 20), head=(10.5, 9, 9), snout=(3.4, 7.0, 4.6), ear=(2.4, 2.0, 0.6), leg=3.8, tail=(14, 4.2, 0.0), eye="dog"),
    "wolf":   dict(body=(12, 12, 21), head=(13, 11.5, 11.5), snout=(7.0, 6.6, 5.4), ear=(5.2, 6.4, 0.1), leg=11, tail=(16, 5.2, 0.2), eye="cat"),
}


def eye_art(kind, w, h, iris="eye", look=0, closed=False):
    """Animal eyes as tampo prints: the colour layer sits 1px off its black line."""
    key = {"k": "ink:0", "d": "ink:1", "w": "white:-1", "s": "white:2", "i": f"{iris}:2", "j": f"{iris}:4", "l": f"{iris}:5", "p": "ink:0"}
    R = Raster(w + 2, h + 2)
    cx, cy = (w + 2) / 2, (h + 2) / 2
    if closed:
        R.arc(cx, cy - h * 0.15, w * 0.45, h * 0.4, 20, 160, "k", w=max(1, round(h / 5)))
        return R.rows(), key
    if kind == "cat":
        R.ell(cx, cy, w / 2, h / 2, "k")                                    # almond outline
        R.ell(cx + 0.6, cy + 0.4, w / 2 - 1, h / 2 - 1, "i")               # iris, a pixel off
        R.ell(cx + 0.6, cy + 0.4 + h * 0.18, w / 2 - 1.4, h * 0.22, "j", only="i")
        R.ell(cx + 0.6, cy + 0.4 + h * 0.3, w * 0.24, h * 0.12, "l", only="ij")
        R.ell(cx + look, cy, max(0.7, w * 0.13), h * 0.38, "p")             # slit pupil
        R.set(cx - w * 0.2 + look, cy - h * 0.22, "w")
        R.set(cx - w * 0.2 + look + 1, cy - h * 0.22, "w")
        R.set(cx + w * 0.22, cy + h * 0.2, "s")
        R.line([(1, cy - h * 0.38), (w * 0.3, cy - h * 0.5)], "k")          # outer flick
    elif kind == "dog":
        R.ell(cx, cy, w / 2, h / 2, "k")
        R.ell(cx + 0.5, cy + 0.6, w / 2 - 1, h / 2 - 1, "d", only="k")
        R.ell(cx - w * 0.16 + look, cy - h * 0.18, max(0.8, w * 0.17), max(0.8, h * 0.16), "w")
        R.set(cx + w * 0.2 + look, cy + h * 0.2, "s")
    elif kind == "bead":
        R.ell(cx, cy, w / 2, h / 2, "k")
        R.set(cx - w * 0.18, cy - h * 0.2, "w")
    return R.rows(), key


def nose_art(kind, w):
    key = {"k": "nose:1", "h": "nose:4", "d": "ink:0"}
    R = Raster(w, max(3, round(w * 0.6)))
    if kind == "cat":
        R.line([(0.5, 0.5), (w - 0.5, 0.5)], "k")
        R.line([(1, 1.5), (w - 1, 1.5)], "k")
        R.set(w / 2, 2.5, "k")
        R.set(w / 2 - 1, 0.5, "h")
    else:
        R.ell(w / 2, w * 0.28, w / 2, w * 0.3, "k")
        R.set(w / 2 - w * 0.2, w * 0.15, "h")
        R.set(w / 2 - w * 0.2 + 1, w * 0.15, "h")
    return R.rows(), key


def beast(F, kind="cat", pose="sit", at=(0, 0, 0), p="", sc=1.0, coat="#c98a4b", belly=None, pattern=None, pat_col=None,
          eye_col="#8aa04a", nose="#c87a7a", inner_ear="#e0a8a0", yaw=0, head_rot=(0, 0, 0), tail_curl=None, closed=False,
          look=0, mouth="cat", socks=None, mask=None, style="fur", tail_tip=None, ear_rot=0, paw_col=None, scar=False, collar=None,
          tail_up=None, mouth_open=False, extra=None):
    k = KINDS[kind]
    s = sc
    bw, bh, bl = (v * s for v in k["body"])
    hw, hh, hd = (v * s for v in k["head"])
    sl, sw, sh = (v * s for v in k["snout"])
    ew, eh, eround = k["ear"]
    ew, eh = ew * s, eh * s
    LL = k["leg"] * s
    tl, tt, tc = k["tail"]
    tl, tt = tl * s, tt * s
    tc = tail_curl if tail_curl is not None else tc
    C = F.c(coat, hue=12)
    B = F.c(belly) if belly else F.c("#efe6d6", hue=8, k=0.05)
    PC = F.c(pat_col) if pat_col else None
    F.ramp("eye", eye_col, k=0.05)
    F.ramp("nose", nose, k=0.1)
    o = {"p": p}
    x0, y0, z0 = at
    sitting = pose in ("sit", "beg")
    # ---- body: a loft from rump (-Z) to chest (+Z); sitting bodies rise steeply
    if pose == "sit":
        rings = [((0, 0, -bl * 0.04), [bw * 1.22, bl * 0.56]), ((0, bh * 0.45, -bl * 0.02), [bw * 1.14, bl * 0.52]),
                 ((0, bh * 0.95, bl * 0.08), [bw * 0.86, bl * 0.38]), ((0, bh * 1.38, bl * 0.15), [bw * 0.68, bl * 0.3])]
        F.loft(p + "body", rings, (x0, y0 + 0.3 * s, z0), sides=14, rnd=2.05, col=C, style=style, rot=(0, yaw, 0), up=[0, 0, 1], seam="x")
        neck = (0, bh * 1.36, bl * 0.18)
    elif pose == "beg":
        rings = [((0, 0, 0), [bw * 1.0, bl * 0.4]), ((0, bh * 0.7, 0), [bw * 1.0, bl * 0.42]),
                 ((0, bh * 1.4, bl * 0.02), [bw * 0.84, bl * 0.34]), ((0, bh * 1.8, bl * 0.04), [bw * 0.7, bl * 0.28])]
        F.loft(p + "body", rings, (x0, y0 + 0.4 * s, z0), sides=12, rnd=2.3, col=C, style=style, rot=(0, yaw, 0), up=[0, 0, 1], seam="x")
        neck = (0, bh * 1.8, bl * 0.06)
    else:
        low = {"loaf": 0.0, "lie": 0.0, "curl": 0.0}.get(pose, LL * 0.85)
        sag = 0.0
        rings = [((0, 0, -bl * 0.5), [bw * 0.82, bh * 0.82]), ((0, 0.4 * s, -bl * 0.2), [bw, bh]),
                 ((0, -sag, bl * 0.14), [bw * 0.98, bh * 0.98]), ((0, bh * 0.08, bl * 0.42), [bw * 0.86, bh * 0.9])]
        F.loft(p + "body", rings, (x0, y0 + low + bh * 0.5, z0), sides=12, rnd=2.4, col=C, style=style, rot=(0, yaw, 0), seam="x")
        neck = (0, bh * 0.35, bl * 0.42)
    body = p + "body"
    o["body"] = body
    # belly / bib
    if belly is not False:
        if sitting:
            F.layer(body, id="bib", op="band", axis="z", **{"from": 0.25, "to": 1.0}, wobble=0.12, ramp=B, tone=3.6,
                    bevel={"shadow": 1, "highlight": 0, "shadow_shift": -0.8})
        else:
            F.layer(body, id="belly", op="band", axis="y", **{"from": -1.0, "to": -0.35}, wobble=0.1, ramp=B, tone=3.6)
    _pattern(F, body, pattern, PC, s)
    # ---- head
    hj = p + "head_j"
    F.bone(hj, neck, parent=body, rot=head_rot)
    hy = hh * 0.42
    front = 0.84
    rings = [((0, 0, -hd * 0.5), [hw * 0.78, hh * 0.8]), ((0, 0, -hd * 0.15), [hw, hh]), ((0, -hh * 0.02, hd * 0.22), [hw * 0.96, hh * 0.94]),
             ((0, -hh * 0.05, hd * 0.5), [hw * front, hh * front * 0.92])]
    if kind in ("capy",):
        rings = [((0, 0, -hd * 0.5), [hw * 0.8, hh * 0.86]), ((0, 0, -hd * 0.1), [hw, hh]), ((0, -hh * 0.06, hd * 0.25), [hw * 0.98, hh * 0.92]),
                 ((0, -hh * 0.1, hd * 0.5), [hw * 0.92, hh * 0.86])]
    F.loft(p + "head", rings, (0, hy, hd * 0.12), parent=hj, sides=14, rnd=2.25, col=C, style=style, seam=True)
    head = p + "head"
    o["head"] = head
    # face: eyes on the front cap, a moulded muzzle below them
    fw = hw * front * F.dens
    ekind = k["eye"]
    eW = max(5, round(fw * (0.2 if ekind == "cat" else 0.14)))
    eH = round(eW * (0.92 if ekind == "cat" else 1.1))
    gap = round(fw * 0.22)
    if kind == "capy":
        eW, eH, gap = max(4, round(fw * 0.09)), max(4, round(fw * 0.09)), round(fw * 0.3)
    ea, ek = eye_art(ekind, eW, eH, look=look, closed=closed)
    eb, _ = eye_art(ekind, eW, eH, look=look, closed=closed)
    eb = [r[::-1] for r in eb]
    ey = -round(hh * 0.1 * F.dens)
    F.stamp(head, ea, ek, "end", off=(-gap, ey))
    F.stamp(head, eb, ek, "end", off=(gap, ey))
    if mask:
        F.layer(head, id="mask", op="spots", centers=[[sx * hw * 0.22, hh * 0.05, hd * 0.5, hw * 0.2] for sx in (-1, 1)], ramp=F.c(mask), tone=2.4,
                stretch=[1.2, 0.8, 1.0])
    # muzzle: a soft lump on the front, with the nose and mouth line
    MZ = B if kind in ("cat", "kitten", "shiba", "akita", "fox", "corgi", "chin", "tanuki", "wolf") else C
    mz = p + "muzzle"
    F.loft(mz, [((0, 0, 0), [sw, sh]), ((0, -0.1 * s, sl * 0.55), [sw * 0.94, sh * 0.9]), ((0, -0.3 * s, sl), [sw * 0.66, sh * 0.66])],
           (0, -hh * 0.27, hd * 0.5 - 0.9 * s), parent=head, sides=12, rnd=2.1, col=MZ, style=style)
    nk = "cat" if kind in ("cat", "kitten") else "dog"
    na, nkk = nose_art(nk, max(4, round(sw * F.dens * (0.3 if nk == "cat" else 0.42))))
    F.stamp(mz, na, nkk, "end", off=(0, -round(sh * F.dens * 0.12)))
    if mouth:
        R = Raster(round(sw * F.dens * 0.6) + 2, 4)
        cx = R.w / 2
        if mouth_open:
            R.ell(cx, 1.5, R.w * 0.28, 2.2, "k")
            R.ell(cx, 2.2, R.w * 0.16, 1.2, "m")
        else:
            R.arc(cx - R.w * 0.2, 0.2, R.w * 0.2, 2.2, 20, 160, "k")
            R.arc(cx + R.w * 0.2, 0.2, R.w * 0.2, 2.2, 20, 160, "k")
        F.ramp("mouth", "#9a3a42")
        F.stamp(mz, R.rows(), {"k": "ink:1", "m": "mouth:3"}, "end", off=(0, round(sh * F.dens * 0.2)))
    # whisker pores
    F.layer(mz, id="pores", op="spots", centers=[[sx * sw * 0.3, -sh * 0.05 + dy, sl * 0.7, 0.32 * s] for sx in (-1, 1) for dy in (0, 0.9 * s)],
            shift=-1.2)
    # ears
    for sx in (-1, 1):
        en = p + ("ear_l" if sx > 0 else "ear_r")
        droop = eround > 0.5
        if droop:
            F.loft(en, [((0, 0, 0), [ew, 1.6 * s]), ((sx * ew * 0.2, -eh * 0.55, 0.2 * s), [ew * 0.95, 1.4 * s]), ((sx * ew * 0.25, -eh, 0.3 * s), [ew * 0.6, 1.1 * s])],
                   (sx * hw * 0.42, hh * 0.38 + hy, hd * 0.0), parent=hj, col=C if not PC or pattern != "ears" else PC, style=style, sides=8, rnd=2.4,
                   rot=(0, 0, sx * 18), subdiv=1)
        else:
            F.taper(en, [ew, 1.7 * s, eh], (sx * hw * 0.3, hh * 0.38 + hy - 0.6 * s, hd * 0.02), parent=hj, front=(0.12 + eround * 0.6, 0.6),
                    off=(0, 0, eh / 2), rot=(-82 + ear_rot, 0, sx * -(14 + eround * 10)), col=C, style=style, ch=0.35 * s)
            F.layer(en, id="inner", op="band", axis="x", **{"from": -0.5, "to": 0.5}, ramp=F.c(inner_ear, k=0.1), tone=3.2,
                    faces=["bottom"], bevel={"shadow": 1, "highlight": 0, "shadow_shift": -0.8})
            if tail_tip and kind == "fox":
                F.layer(en, id="tip", op="band", axis="z", **{"from": 0.3, "to": 1.0}, ramp="ink", tone=1.2)
    # legs
    paw = F.c(paw_col) if paw_col else (F.c(socks) if socks else C)
    if sitting:
        for sx in (-1, 1):
            nm = p + ("fleg_l" if sx > 0 else "fleg_r")
            F.loft(nm, [((0, 0, 0), [3.4 * s, 3.8 * s]), ((0, -bh * 0.55, 0.5 * s), [3.0 * s, 3.2 * s]), ((0, -bh * 1.02, 0.7 * s), [2.9 * s, 3.1 * s])],
                   (sx * bw * 0.19, bh * 1.05, bl * 0.24), parent=body, col=C, style=style, sides=10, rnd=2.2, subdiv=1)
            if socks:
                F.layer(nm, id="sock", op="band", axis="y", **{"from": -1.0, "to": -0.4}, wobble=0.1, ramp=paw, tone=3.6)
            F.blob(nm + "_paw", 3.8 * s, 2.0 * s, 4.6 * s, (0, -bh * 1.05 - 1.2 * s, 1.4 * s), parent=nm, col=paw, style=style, bottom=0.9, top=0.6)
            hn = p + ("haunch_l" if sx > 0 else "haunch_r")
            F.blob(hn, 5.4 * s, bh * 0.72, bl * 0.5, (sx * bw * 0.5, -0.2 * s, -bl * 0.04), parent=body, col=C, style=style, bottom=0.85, top=0.45,
                   sides=12, rnd=2.1, rot=(0, sx * -8, 0))
            F.blob(hn + "_foot", 3.6 * s, 2.0 * s, 5.8 * s, (sx * bw * 0.36, -0.2 * s, bl * 0.12), parent=body, col=paw, style=style, bottom=0.9, top=0.6)
        o["paw_l"] = p + "fleg_l_paw"
        o["paw_r"] = p + "fleg_r_paw"
    elif pose in ("stand", "walk"):
        sw_ = 18 if pose == "walk" else 0
        for sx in (-1, 1):
            for fr, z in (("f", bl * 0.32), ("h", -bl * 0.32)):
                nm = p + f"{fr}leg_{'l' if sx > 0 else 'r'}"
                swing = sw_ * (1 if (sx > 0) == (fr == "f") else -1)
                F.bone(nm, (sx * bw * 0.3, -bh * 0.1, z), parent=body, rot=(swing, 0, 0))
                F.loft(nm + "_up", [((0, 0.6 * s, 0), [4.4 * s, 4.8 * s] if fr == "h" else [3.8 * s, 4.0 * s]),
                                     ((0, -LL * 0.5, -0.6 * s if fr == "h" else 0.3 * s), [3.2 * s, 3.4 * s]),
                                     ((0, -(LL + bh * 0.4) + 1.0 * s, 0), [2.9 * s, 3.0 * s])], (0, 0, 0), parent=nm, col=C, style=style, sides=8, rnd=2.5, subdiv=1)
                if socks:
                    F.layer(nm + "_up", id="sock", op="band", axis="y", **{"from": -1.0, "to": -0.35}, wobble=0.1, ramp=paw, tone=3.6)
                F.blob(nm + "_paw", 3.6 * s, 2.0 * s, 4.4 * s, (0, -(LL + bh * 0.4) + 0.1 * s, 0.9 * s), parent=nm, col=paw, style=style, bottom=0.9, top=0.6)
        o["paw_l"] = p + "fleg_l_paw"
        o["paw_r"] = p + "fleg_r_paw"
    else:  # loaf / lie / curl: paws tucked forward
        for sx in (-1, 1):
            nm = p + ("fpaw_l" if sx > 0 else "fpaw_r")
            F.blob(nm, 3.6 * s, 2.4 * s, 5.4 * s, (sx * bw * 0.24, -bh * 0.5 + 0.1 * s, bl * 0.42), parent=body, col=paw, style=style, bottom=0.9, top=0.6)
            hn = p + ("haunch_l" if sx > 0 else "haunch_r")
            F.blob(hn, 3.4 * s, bh * 0.66, bl * 0.4, (sx * bw * 0.44, -bh * 0.5 + 0.1 * s, -bl * 0.25), parent=body, col=C, style=style, bottom=0.9, top=0.55)
        o["paw_l"] = p + "fpaw_l"
        o["paw_r"] = p + "fpaw_r"
    # tail: a chain loft from the rump
    if tl > 1.5:
        if sitting:
            base = (sx_ := 0, 0.8 * s, -bl * 0.18)
            path = [(0, 0, 0), (bw * 0.3, 0.2 * s, -tl * 0.18), (bw * 0.75, 0.3 * s, -tl * 0.05), (bw * 1.0, 0.4 * s, tl * 0.2), (bw * 0.9, 0.5 * s, tl * 0.42)]
        elif tc >= 0.9:  # curled up over the back (shiba, akita, chin)
            base = (0, bh * 0.2, -bl * 0.48)
            path = [(0, 0, 0), (0, tl * 0.38, -tl * 0.12), (0, tl * 0.62, tl * 0.1), (0, tl * 0.5, tl * 0.38)]
        elif pose in ("curl", "lie", "loaf"):
            base = (0, -bh * 0.2, -bl * 0.46)
            path = [(0, 0, 0), (bw * 0.4, -bh * 0.25, -tl * 0.1), (bw * 0.75, -bh * 0.3, tl * 0.18), (bw * 0.8, -bh * 0.3, tl * 0.45)]
        else:
            up = tail_up if tail_up is not None else 0.55
            base = (0, bh * 0.15, -bl * 0.48)
            path = [(0, 0, 0), (0, tl * up * 0.4, -tl * 0.35), (0, tl * up * 0.85, -tl * 0.55), (0, tl * up * 1.15, -tl * 0.5)]
        rings = []
        n = len(path)
        for i, pnt in enumerate(path):
            t = i / (n - 1)
            th = tt * (1.0 - 0.35 * t) if kind not in ("fox", "tanuki") else tt * (0.7 + 0.6 * (1 - abs(t - 0.6) * 1.6))
            rings.append((pnt, max(0.6 * s, th) if i < n - 1 else max(0.6 * s, th * 0.55)))
        F.loft(p + "tail", rings, base, parent=body, col=C, style=style, sides=8, rnd=2.3, chain=True, caps=(False, True))
        if tail_tip:
            F.layer(p + "tail", id="tip", op="band", axis="path", **{"from": 0.72, "to": 1.0}, ramp=F.c(tail_tip), tone=3.4)
        if pattern in ("tabby", "ring"):
            F.layer(p + "tail", id="rings", op="stripes", axis="path", period=2.6 * s, width=0.4, ramp=PC, tone=2.2,
                    bevel={"shadow": 1, "highlight": 0, "shadow_shift": -0.6})
        o["tail"] = p + "tail"
    if pattern in ("tabby", "mackerel") and PC:
        F.layer(head, id="m", op="stripes", axis="x", period=1.8 * s, width=0.45, range=[-0.35, 0.35], ramp=PC, tone=2.2, faces=["up", "-end"])
    if scar:
        F.stamp(head, ["k...", ".k..", "..k.", "...k", "..k."], {"k": "ink:2"}, "end", off=(gap + 2, ey - eH))
    if collar:
        F.loft(p + "collar", [((0, 0, 0), [hw * 0.78, hh * 0.62]), ((0, 0, 1.2 * s), [hw * 0.8, hh * 0.64])], (0, -0.2 * s, -1.0 * s), parent=hj,
               col=collar, style="pvc", sides=12, rnd=2.2, caps=(False, False), rot=(-70 if sitting else -20, 0, 0))
        F.cyl(p + "bell", 1.4 * s, 1.8 * s, (0, -1.6 * s, 2.4 * s), parent=hj, col="#d8b048", style="metal", sides=8)
    return o


def _pattern(F, body, pattern, PC, s):
    if not pattern or not PC:
        return
    if pattern == "tabby" or pattern == "mackerel":
        F.layer(body, id="stripes", op="stripes", axis="z", period=2.6 * s, width=0.42, wobble=0.3, ramp=PC, tone=2.2,
                bevel={"shadow": 1, "highlight": 0, "shadow_shift": -0.6})
    elif pattern == "calico":
        F.layer(body, id="patch", op="spots", count=4, radius=[3.0 * s, 5.0 * s], roughness=0.5, ramp=PC, tone=3.0,
                bevel={"shadow": 1, "highlight": 1})
    elif pattern == "tuxedo" or pattern == "saddle":
        F.layer(body, id="saddle", op="band", axis="y", **{"from": 0.05, "to": 1.0}, wobble=0.15, ramp=PC, tone=2.6)
    elif pattern == "patches":
        F.layer(body, id="patch", op="patches", scale=0.5, threshold=0.55, ramp=PC, tone=2.6, bevel={"shadow": 1, "highlight": 0})
    elif pattern == "urajiro":  # shiba: white undercoat, darker back
        F.layer(body, id="back", op="band", axis="y", **{"from": 0.3, "to": 1.0}, wobble=0.12, shift=-0.5)
