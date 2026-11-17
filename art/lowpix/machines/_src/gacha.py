"""The four capsule-toy machines as lowpix specs, after real Japanese machines (1970s steel ¥100 countertop units,
the 1990s moulded single-crank floor machines, two-tier stations and premium cabinet machines).

Every machine is two specs: <type> (the machine itself, fine texels) and <type>_stand (what it stands on, coarser).
Positions are machine-local millimetres, front +Z, the floor at y = 0, and follow src/world/machineModels.js layout()
exactly: the game logic, the first-person hands and the print decals read that layout, so nothing here moves an
interaction. The moving parts are joints (pack.mjs merges each into one mesh in its joint's frame):
  crank (the handle, turns about z)   lid (hinged at the back top)   flap (the chute's flap, hinged at its top)
  drawer (the locked coin box)        btn_minus / btn_plus (price buttons)   pawl (the ratchet's pawl, at the origin)
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "_lib"))
from mk import Spec, text3, text5, text_jp, ring_art  # noqa: E402

# src/world/machineModels.js MACHINE_SPECS (metres)
SPECS = {
    "retro": dict(w=0.34, d=0.32, lowH=0.36, caseH=0.33, capH=0.04, y0=0.56, dial=(-0.02, 0.215, 0.075, 0.05), slot=(0.082, 0.285),
                  outlet=(0.12, 0.025, 0.105), tray=(0.17, 0.12)),
    "standard": dict(w=0.36, d=0.34, lowH=0.37, caseH=0.38, capH=0.045, y0=0.6, dial=(-0.025, 0.22, 0.082, 0.055), slot=(0.088, 0.29),
                     outlet=(0.13, 0.025, 0.115), tray=(0.18, 0.13)),
    "deluxe": dict(w=0.4, d=0.38, lowH=0.38, caseH=0.42, capH=0.05, y0=0.56, dial=(-0.02, 0.215, 0.088, 0.06), slot=(0.1, 0.3),
                   outlet=(0.15, 0.025, 0.12), tray=(0.2, 0.14)),
    "royal": dict(w=0.44, d=0.4, lowH=0.4, caseH=0.46, capH=0.055, y0=0.52, dial=(-0.03, 0.23, 0.092, 0.062), slot=(0.112, 0.315),
                  outlet=(0.16, 0.025, 0.13), tray=(0.22, 0.15)),
}
BANNER_W, BANNER_H = 320, 280

# colours (src/gachakit/voxmachine.js STYLES, the identities kept)
STY = {
    "retro": dict(body="#b8432f", body2="#8c2e22", panel="#e8dcc0", band="#e8be48", dial="#c4483c", dialEdge="#7a2018", knob="#e6e2d6",
                  grip="#c4483c", inner="#e9dcbc", trim="#c4483c", header="#c4483c", metal="chrome", round=3, finish="enamel", flap="steel", stand="crate",
                  model_name="GS-70  100YEN", sign_jp="ガチャガチャ"),
    "standard": dict(body="#e9e8e1", body2="#cfcec6", panel="#f4f3ee", band="#3a72c4", dial="#3a72c4", dialEdge="#1f4688", knob="#f1efe8",
                     grip="#3a72c4", inner="#dde7f3", trim="#3a72c4", header="#3a72c4", metal="chrome", round=16, finish="abs", flap="smoke", stand="pedestal",
                     model_name="CAPSULE GS-90"),
    "deluxe": dict(body="#2b2a2f", body2="#1c1b1f", panel="#34323a", band="#1c1b1f", dial="#1e1d22", dialEdge="#d8b04a", knob="#2c2a2f",
                   grip="#d8b04a", inner="#302e36", trim="#d8b04a", header="#2b2a2f", metal="gold", round=8, finish="lacquer", flap="smoke", stand="twotier"),
    "royal": dict(body="#f2eaee", body2="#ddcfd8", panel="#fbf6f2", band="#c8509e", dial="#c8509e", dialEdge="#8a2a70", knob="#f8f2ee",
                  grip="#c8509e", inner="#f6e4ee", trim="#c8509e", header="#c8509e", metal="gold", round=16, finish="lacquer", flap="smoke", stand="cabinet",
                  model_name="ROYAL GS-1000", sign_jp="ガチャガチャ"),
}

# world face -> the local face of a vbox (a box pitched -90 deg so its chamfers round the vertical edges)
WF = {"front": "bottom", "back": "top", "top": "front", "bottom": "back", "left": "left", "right": "right"}


def layout(t):
    """machineModels.js layout(), in mm."""
    s = SPECS[t]
    w, d, y0, lowH, caseH, capH = (s[k] * 1000 for k in ("w", "d", "y0", "lowH", "caseH", "capH"))
    fz, hw = d / 2, w / 2
    bw = min(w - 50, caseH * 0.62 * (BANNER_W / BANNER_H))
    bh = bw * BANNER_H / BANNER_W
    caseY0 = y0 + lowH
    top = caseY0 + caseH + capH
    dx, dy, ring, knob = (v * 1000 for v in s["dial"])
    sdx, sy = (v * 1000 for v in s["slot"])
    ow, oy0, oy1 = (v * 1000 for v in s["outlet"])
    tw, td = (v * 1000 for v in s["tray"])
    O = dict(x0=-ow / 2, x1=ow / 2, y0=y0 + oy0, y1=y0 + oy1)
    slot = dict(x=hw - sdx, y=y0 + sy, z=fz + 12)
    return dict(
        w=w, d=d, hw=hw, fz=fz, y0=y0, lowH=lowH, caseH=caseH, capH=capH, caseY0=caseY0, top=top,
        handle=dict(x=dx, y=y0 + dy, z=fz + 10, r=knob), ring=ring, knob=knob,
        slot=slot, plate=dict(x=slot["x"], y=slot["y"] - 70, w=68, h=30), buttons=dict(y=slot["y"] - 106, dx=20),
        outlet=O, coin=dict(x0=O["x1"] + 16, x1=hw - 18, y0=y0 + 20, y1=y0 + oy1 + 5, depth=110),
        tray=dict(x0=-tw / 2, x1=tw / 2, z0=fz - 20, z1=fz + td, y=y0 + oy0 - 5, wall=35),
        hook=dict(x=hw + 12, y=y0 + dy + 20, z=fz - 50),
        lid=dict(y=caseY0 + caseH, z=-fz - 5, h=capH, lockX=w * 0.22),
        banner=dict(w=bw, h=bh, y=caseY0 + caseH - 14 - bh / 2, z=fz - 20),
        window=dict(x0=-hw + 16, x1=hw - 16, y0=caseY0 + 4, y1=caseY0 + caseH - 6, z0=-fz + 20),
    )


class M(Spec):
    """A Spec with machine helpers."""

    def vbox(s, pid, x0, y0, z0, x1, y1, z1, ch=0, front=None, faces=None, **kw):
        """A box with its VERTICAL edges chamfered (rounded cabinet corners): pitched so local z = world up.
        front: a ramp for the world-front face. Local faces: world front = 'bottom', back = 'top', top = 'front'."""
        W, H, D = x1 - x0, y1 - y0, z1 - z0
        p = s.add(pid, "box", ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), size=[W, D, H], rot=[-90, 0, 0],
                  **({"chamfer": min(ch, W * 0.45, D * 0.45)} if ch and ch >= 0.5 else {}), **kw)
        if front:
            s.layer(pid, id="frontpanel", op="fill", faces=["bottom"], ramp=front, tone=3.0)
        return p

    def screws(s, pid, pts, face="front", ramp="chrome"):
        """Screw heads (5x5 px) at face pixel coords."""
        key = {"h": f"{ramp}:4", "l": f"{ramp}:6", "s": f"{ramp}:1", "d": f"{ramp}:2"}
        art = [".hhh.", "hhsld", "hsssd", "hlsdd", ".ddd."]
        for (x, y) in pts:
            s.stamp(pid, art, key, face=face, at=[int(x), int(y)])


def side_graphic(s, pid, L, st, band, MET):
    """A printed panel on the lower unit's flanks: a colour band with a capsule and the name (pixel art, stamped)."""
    W = int(2 * L["fz"] * s.dens) - 24  # the flank's width in texels (minus the rounded corners)
    H = int(min(150, (L["caseY0"] - 16 - L["outlet"]["y1"] - 9) * 0.52) * s.dens)
    r = int(H * 0.36)
    rows = []
    for y in range(H):
        row = ""
        for x in range(W):
            # the band (a rounded strip), a lighter rule above and below
            if y < 2 or y >= H - 2:
                row += "l"
                continue
            cx, cy = int(W * 0.2), H // 2
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            if d <= r:
                if d > r - 2:
                    row += "o"  # the capsule's outline
                elif abs(y - cy) <= 1:
                    row += "s"  # its seam
                elif y < cy:
                    row += "w" if (x - cx + y - cy) > -r * 0.9 else "h"  # the clear top, a highlight
                else:
                    row += "c"  # the coloured half
            else:
                row += "b"
        rows.append(row)
    # the name, in kana, on the band
    jp = text_jp(st.get("sign_jp", "カプセルトイ"), max(10, int(H * 0.3)), "t")
    while jp and len(jp[0]) > W * 0.6:
        jp = text_jp(st.get("sign_jp", "カプセルトイ"), max(8, len(jp) - 2), "t")
    x0, y0 = int(W * 0.36), H // 2 - len(jp) // 2 - int(H * 0.12)
    for j, rr in enumerate(jp):
        if 0 <= y0 + j < H:
            row = list(rows[y0 + j])
            for i, ch in enumerate(rr):
                if ch == "t" and x0 + i < W:
                    row[x0 + i] = "t"
            rows[y0 + j] = "".join(row)
    en = text5(st.get("model_name", "GACHA"), "t")
    x1, y1 = int(W * 0.36), y0 + len(jp) + max(2, int(H * 0.08))
    for j, rr in enumerate(en):
        if 0 <= y1 + j < H - 2:
            row = list(rows[y1 + j])
            for i, ch in enumerate(rr):
                if ch == "t" and x1 + i < W:
                    row[x1 + i] = "u"
            rows[y1 + j] = "".join(row)
    key = {"b": f"{band}:3", "l": f"{band}:5", "o": f"{band}:1", "s": "paperw:3", "w": "paperw:6", "h": "paperw:5", "c": f"{band}:4",
           "t": "paperw:6", "u": "paperw:5"}
    # (a vbox's flanks have image-x running up the machine: the art is turned a quarter for them)
    Hh = len(rows)
    cw = ["".join(rows[Hh - 1 - j][i] for j in range(Hh)) for i in range(len(rows[0]))]
    ccw = ["".join(rows[j][len(rows[0]) - 1 - i] for j in range(Hh)) for i in range(len(rows[0]))]
    s.stamp(pid, ccw, key, face="right", at="left", off=(int(10 * s.dens), 0))
    s.stamp(pid, cw, key, face="left", at="right", off=(-int(10 * s.dens), 0))


def px(s, mm):
    return int(round(mm * s.dens))


def machine(t):
    L, st = layout(t), STY[t]
    s = M(t, f"Capsule machine ({t})", dens=0.65, budget=9000,
          desc=f"The {t} capsule-toy machine (Gacha Garage), after real Japanese gashapon machines. Machine-local mm.",
          light={"dir": [-0.5, 1.0, 0.7], "strength": 0.5, "gradient": 0.2, "ao": 0.45, "ao_height": 60.0})
    hw, fz, Y0, CY0 = L["hw"], L["fz"], L["y0"], L["caseY0"]
    O, CB, H, S = L["outlet"], L["coin"], L["handle"], L["slot"]
    fin = st["finish"]
    body = s.c(st["body"], k=0.06)
    body2 = s.c(st["body2"], k=0.06)
    panel = s.c(st["panel"], k=0.04, hue=8)
    band = s.c(st["band"], k=0.08)
    dial = s.c(st["dial"], k=0.08)
    dialE = s.c(st["dialEdge"], k=0.06)
    knob = s.c(st["knob"], k=0.04)
    grip = s.c(st["grip"], k=0.08)
    inner = s.c(st["inner"], k=0.04)
    hdr = s.c(st["header"], k=0.06)
    MET = "goldr" if st["metal"] == "gold" else "chrome"
    MST = "gold" if st["metal"] == "gold" else "chrome"
    rnd = st["round"]
    worn = fin == "enamel"

    # ------------------------------------------------------------------ the lower unit (the coin mechanism's housing)
    # It is built round its two openings (the chute and the coin box): the top block, a back block, and the front
    # pieces either side, their joins hidden under the trim rail and the chrome bezels.
    rowT = O["y1"] + 9  # top of the openings row (the trim rail covers this join)
    plinth = 14
    s.vbox("unit", -hw, rowT, -fz, hw, CY0 - 16, fz, ch=rnd, col=body, style=fin, front=panel, hide=["front", "back"])
    s.layer("unit", id="seam", op="panel", inset=px(s, 7), shift=-0.7, highlight=0.6, shadow=-0.4, faces=["bottom"])
    # side vents (two short rows of slits) and a moulding seam on the back
    s.layer("unit", id="vent", op="grille", rect=[0.62, 0.55, 0.92, 0.8], period=3, slit_tone=0.4, lip=0.6, faces=["right"])
    s.layer("unit", id="vent2", op="grille", rect=[0.3, 0.2, 0.7, 0.42], period=3, slit_tone=0.4, lip=0.6, faces=["top"])
    # the maker's side graphic, printed on both flanks: a big two-tone capsule, カプセルトイ and the model name, on a
    # coloured band (it is what makes a white machine read from across the shop)
    if t != "deluxe":
        side_graphic(s, "unit", L, st, band, MET)
    s.boxr("unit_back", O["x0"] - 6, Y0 + plinth, -fz, CB["x1"] + 6, rowT, fz - 130, ch=0, col=body, style=fin, hide=["top", "bottom", "front", "left", "right"])
    # the front pieces: left of the chute (full depth), between chute and coin box, right of the coin box (full depth),
    # the strips below the openings
    s.vbox("unit_l", -hw, Y0 + plinth, -fz, O["x0"] - 6, rowT, fz, ch=rnd, col=body, style=fin, front=panel, hide=["front", "back"])
    s.boxr("unit_m", O["x1"] + 6, Y0 + plinth, fz - 130, CB["x0"] - 6, rowT, fz, ch=0, col=panel, style=fin, hide=["top", "bottom", "back"])
    s.vbox("unit_r", CB["x1"] + 6, Y0 + plinth, -fz, hw, rowT, fz, ch=rnd, col=body, style=fin, front=panel, hide=["front", "back"])
    s.boxr("unit_ob", O["x0"] - 6, Y0 + plinth, fz - 130, O["x1"] + 6, O["y0"] - 4, fz, ch=0, col=panel, style=fin, hide=["bottom", "back", "left", "right"])
    s.boxr("unit_cb", CB["x0"] - 6, Y0 + plinth, fz - 130, CB["x1"] + 6, CB["y0"] - 4, fz, ch=0, col=panel, style=fin, hide=["bottom", "back", "left", "right"])
    # the dark insides of the chute and of the coin box's bay
    s.boxr("chute_in", O["x0"] - 6, O["y0"] - 4, fz - 130, O["x1"] + 6, rowT, fz - 0.5, ch=0, col="cavity", style="cavity", hide=["front"], double_sided=True, tone=2.2)
    s.layer("chute_in", id="ramp", op="gradient", axis="z", amount=1.4)
    s.boxr("coin_in", CB["x0"] - 6, CB["y0"] - 4, fz - 130, CB["x1"] + 6, rowT, fz - 0.5, ch=0, col="cavity", style="cavity", hide=["front"], double_sided=True, tone=1.6)
    # the plinth at the foot of the unit (darker, scuffed by shoes) and the trim band round the top
    s.vbox("plinth", -hw - 1, Y0, -fz - 1, hw + 1, Y0 + plinth, fz + 1, ch=rnd, col=body2 if not worn else s.c("#3a2a26"), style=fin, hide=["front", "back"])
    s.layer("plinth", id="kick", op="patches", scale=30, threshold=0.6, shift=-0.6)
    s.vbox("band", -hw - 1.5, CY0 - 16, -fz - 1.5, hw + 1.5, CY0, fz + 1.5, ch=rnd, col=MET if st["metal"] == "gold" or t == "retro" else band,
           style=MST if (st["metal"] == "gold" or t == "retro") else fin, hide=["front", "back"])
    if t in ("standard", "royal"):
        # a printed pin-stripe under the band
        s.vbox("band2", -hw - 0.8, CY0 - 22, -fz - 0.8, hw + 0.8, CY0 - 16, fz + 0.8, ch=rnd, col=MET, style=MST, hide=["front", "back"])
    # the trim rail across the front over the openings' join
    s.boxr("rail", -hw + 3, rowT - 4, fz, hw - 3, rowT + 4, fz + 2.5, ch=1.0, col=MET, style=MST)
    # screws in the front fascia's corners
    fw, fh = px(s, 2 * hw), px(s, CY0 - 16 - rowT)
    s.screws("unit", [(6, 6), (fw - 11, 6), (6, fh - 11), (fw - 11, fh - 11)], face="bottom", ramp=MET)

    # ------------------------------------------------------------------ the crank's dial plate (static)
    ring, kn = L["ring"], L["knob"]
    s.disc("dial_bezel", ring + 4, 4, (H["x"], H["y"], fz + 2), sides=32, col=MET, style=MST)
    s.disc("dial", ring, 3, (H["x"], H["y"], fz + 5.5), sides=32, col=dial, style=fin if fin != "enamel" else "abs", tone=3.0)
    # the turning arrows printed round the dial (まわす), a light ring, dark centre well
    R = px(s, ring)
    art = []
    for yy in range(-R, R + 1):
        row = ""
        for xx in range(-R, R + 1):
            d = math.hypot(xx, yy)
            a = math.atan2(-yy, xx)
            if d > R - 1.5:
                row += "e"
            elif d < px(s, kn) + 3:
                row += "w" if d > px(s, kn) + 1.5 else "c"
            else:
                seg = ((a + 2 * math.pi) % (math.pi / 2)) / (math.pi / 2)
                band_ = (d - px(s, kn) - 3) / max(1, (R - 1.5 - px(s, kn) - 3))
                if 0.12 < seg < 0.72 and abs(band_ - 0.5) < 0.16:
                    row += "a"  # the arrow shaft
                elif 0.72 <= seg < 0.86 and abs(band_ - 0.5) < 0.16 + (0.86 - seg) * 2.2:
                    row += "a"  # its head
                else:
                    row += "."
        art.append(row)
    s.stamp("dial", art, {"e": f"{dialE}:2", "w": f"{MET}:5", "c": f"{dialE}:1", "a": "paperw:5" if fin != "lacquer" or t == "royal" else f"{MET}:4"}, face="front")
    # the ratchet's pawl (a joint at the origin: the game places it on the bezel)
    s.joint("pawl", (0, 0, 0))
    s.boxr("pawl_b", -3, -4, -2, 3, 8, 2.5, ch=1.2, parent="pawl", col=MET, style=MST)
    s.disc("pawl_pin", 2.2, 3, (0, 0, 3), parent="pawl", sides=8, col=MET, style=MST, tone=5)

    # ------------------------------------------------------------------ the crank (joint)
    s.joint("crank", (H["x"], H["y"], H["z"]))
    hz = H["z"]
    # the toothed hub that the pawl rides, the knob, the grip bar across it, the centre cap and its screw
    s.disc("hub", kn + 5, 5, (H["x"], H["y"], fz + 9.5), parent="crank", sides=24, col=MET, style=MST, tone=2.6)
    s.layer("hub", id="teeth", op="fill", faces=[f"side{i}" for i in range(0, 24, 2)], shift=-1.6)
    s.disc("knob", kn, 12, (H["x"], H["y"], hz + 6), parent="crank", sides=28, top=0.94, col=knob, style="lacquer" if fin != "enamel" else "abs")
    s.layer("knob", id="grip", op="fill", faces=[f"side{i}" for i in range(0, 28, 2)], shift=-0.5)
    gl = kn * 1.9
    s.box("grip", [gl, 20, 18], (H["x"], H["y"], hz + 20), ch=6, parent="crank", col=grip, style="lacquer" if fin != "enamel" else "abs")
    s.disc("cap", 9, 4, (H["x"], H["y"], hz + 29.5), parent="crank", sides=16, top=0.8, col=MET, style=MST)
    s.stamp("cap", ["..d..", "..d..", "ddddd", "..d..", "..d.."], {"d": f"{MET}:1"}, face="front")
    # the arrow moulded on the grip's ends
    s.stamp("grip", ["l..", "ll.", "lll", "ll.", "l.."], {"l": "paperw:6"}, face="front", at="right", off=(-5, 0))

    # ------------------------------------------------------------------ the coin mechanism (static)
    mw, mh = 50, 66
    s.boxr("mech", S["x"] - mw / 2, S["y"] - 34, fz, S["x"] + mw / 2, S["y"] + mh - 34, fz + 7, ch=2.5, col=MET, style=MST)
    mwp, mhp = px(s, mw), px(s, mh)
    # the coin slot (a vertical slit with a chrome lip), the coin-return button, the "100" and the arrow
    sl = []
    sh_ = px(s, 30)
    for yy in range(sh_ + 4):
        if yy in (0, sh_ + 3):
            sl.append(".hhhhh.")
        else:
            sl.append("hddddsl")
    s.stamp("mech", sl, {"h": f"{MET}:2", "d": "cavity:0", "s": "cavity:2", "l": f"{MET}:6"}, face="front", at=[mwp // 2 - 3, px(s, 34 - 8 - 15)])
    s.stamp("mech", text3("100", "i"), {"i": "ink:1"}, face="front", at=[mwp // 2 - 5, px(s, 4)])
    s.stamp("mech", [".i.", "iii", "iii"], {"i": "ink:1"}, face="front", at=[mwp // 2 + 6, px(s, 34 - 8 - 15) + sh_ // 2])
    s.screws("mech", [(2, 2), (mwp - 7, 2), (2, mhp - 7), (mwp - 7, mhp - 7)], face="front", ramp=MET)
    s.disc("coin_ret", 6, 5, (S["x"], S["y"] - 27, fz + 9), sides=12, top=0.8, col=MET, style=MST, tone=4.0)
    # the price plate's bezel (the plate itself is the game's live texture, in front of it)
    P = L["plate"]
    s.boxr("plate_bz", P["x"] - P["w"] / 2 - 4, P["y"] - P["h"] / 2 - 4, fz, P["x"] + P["w"] / 2 + 4, P["y"] + P["h"] / 2 + 4, fz + 3.5, ch=1.5, col=MET, style=MST)
    # the -/+ buttons' sockets
    B = L["buttons"]
    for k, sx in (("l", -1), ("r", 1)):
        s.disc("btn_sock_" + k, 7.5, 3, (P["x"] + sx * B["dx"], B["y"], fz + 1.5), sides=16, col=MET, style=MST, tone=2.2)
    for k, sx, colr, plus in (("btn_minus", -1, "#c8463e", False), ("btn_plus", 1, "#3e9e58", True)):
        s.joint(k, (P["x"] + sx * B["dx"], B["y"], fz))
        s.disc(k + "_cap", 5.5, 6, (P["x"] + sx * B["dx"], B["y"], fz + 5), parent=k, sides=16, top=0.86, col=colr, style="lacquer")
        s.stamp(k + "_cap", ["...", "lll", "..."] if not plus else [".l.", "lll", ".l."], {"l": "paperw:6"}, face="front")

    # ------------------------------------------------------------------ the chute: chrome bezel, the flap (joint)
    bz = 7
    s.boxr("obz_l", O["x0"] - bz, Y0 + plinth, fz, O["x0"], O["y1"] + 4, fz + 4, ch=1.5, col=MET, style=MST)
    s.boxr("obz_r", O["x1"], Y0 + plinth, fz, O["x1"] + bz, O["y1"] + 4, fz + 4, ch=1.5, col=MET, style=MST)
    s.boxr("obz_b", O["x0"], O["y0"] - 6, fz, O["x1"], O["y0"], fz + 4, ch=1.5, col=MET, style=MST)
    # the hood over the chute (a little lip that throws the opening into shade)
    s.boxr("ohood", O["x0"] - bz, O["y1"], fz, O["x1"] + bz, O["y1"] + 7, fz + 9, ch=2, col=MET, style=MST)
    fy = O["y1"] - 5
    s.joint("flap", (0, fy, fz + 2.5))
    clear = st["flap"] != "steel"
    fl = s.boxr("flap_p", O["x0"] + 1, O["y0"] + 2, fz + 1, O["x1"] - 1, fy, fz + 4, ch=1.0, parent="flap",
                col=s.c("#4a5058" if clear else "#a8aeb4"), style="clear" if clear else "steel", mat="glass" if clear else "metal")
    if clear:
        s.layer("flap_p", id="label", op="rect", rect=[0.3, 0.42, 0.7, 0.58], shift=1.6, faces=["front"])
    else:
        s.layer("flap_p", id="ribs", op="stripes", axis="y", period=6, width=0.3, shift=-0.7, faces=["front"])
    s.disc("flap_pin", 3, O["x1"] - O["x0"] + 2 * bz - 2, (0, fy, fz + 3), axis="x", parent="flap", sides=8, col=MET, style=MST)

    # ------------------------------------------------------------------ the coin box drawer (joint) + its frame
    s.boxr("cbz", CB["x0"] - 5, CB["y0"] - 5, fz, CB["x1"] + 5, CB["y1"] + 5, fz + 2, ch=1.0, col=MET, style=MST, hide=["back"])
    s.layer("cbz", id="hole", op="rect", rect=[0.06, 0.06, 0.94, 0.94], ramp="cavity", tone=1.0, faces=["front"])
    s.joint("drawer", (CB["x0"], CB["y0"], fz))
    dw, dh = CB["x1"] - CB["x0"], CB["y1"] - CB["y0"]
    s.boxr("dr_front", CB["x0"], CB["y0"], fz, CB["x1"], CB["y1"], fz + 5, ch=1.2, parent="drawer", col=MET if t != "retro" else panel,
           style=MST if t != "retro" else fin)
    s.boxr("dr_box", CB["x0"] + 3, CB["y0"] + 3, fz - CB["depth"], CB["x1"] - 3, CB["y1"] - 6, fz, ch=0, parent="drawer", col=s.c("#6a6e74"), style="steel", hide=["top"])
    s.boxr("dr_floor", CB["x0"] + 5, CB["y0"] + 5, fz - CB["depth"] + 2, CB["x1"] - 5, CB["y0"] + 6, fz - 2, ch=0, parent="drawer", col="cavity", style="cavity", tone=2.5)
    # the lock (a chrome barrel with a keyhole) and a pull lip
    s.disc("dr_lock", 5.5, 4, (CB["x0"] + dw * 0.72, CB["y0"] + dh * 0.62, fz + 6.5), parent="drawer", sides=14, col=MET, style=MST)
    s.stamp("dr_lock", [".d.", "ddd", ".d.", ".d."], {"d": "cavity:0"}, face="front")
    s.boxr("dr_pull", CB["x0"] + dw * 0.2, CB["y0"] + 4, fz + 5, CB["x0"] + dw * 0.55, CB["y0"] + 8, fz + 9, ch=1.2, parent="drawer", col=MET, style=MST)

    # ------------------------------------------------------------------ the tray in front of the chute
    T = L["tray"]
    tcol, tsty = (MET, MST) if t != "standard" else (s.c("#d4d2ca"), "abs")
    s.boxr("tray_floor", T["x0"], T["y"] - 18, T["z0"], T["x1"], T["y"], T["z1"], ch=0, col=tcol, style=tsty)
    s.layer("tray_floor", id="mat", op="rect", rect=[0.06, 0.08, 0.94, 0.9], ramp="rubber", tone=2.6, faces=["top"])
    s.layer("tray_floor", id="ribs", op="stripes", axis="x", period=5, width=0.35, shift=0.6, faces=["top"])
    s.boxr("tray_wl", T["x0"] - 6, T["y"] - 18, T["z0"], T["x0"], T["y"] + T["wall"], T["z1"], ch=2, col=tcol, style=tsty)
    s.boxr("tray_wr", T["x1"], T["y"] - 18, T["z0"], T["x1"] + 6, T["y"] + T["wall"], T["z1"], ch=2, col=tcol, style=tsty)
    s.boxr("tray_lip", T["x0"] - 6, T["y"] - 18, T["z1"] - 4, T["x1"] + 6, T["y"] + T["wall"] * 0.8, T["z1"] + 4, ch=3, col=tcol, style=tsty)
    s.stamp("tray_lip", text_jp("とりだしぐち", 8, "i"), {"i": "ink:2" if t != "deluxe" else f"{MET}:5"}, face="front")

    # ------------------------------------------------------------------ the rope hook on the right side
    K = L["hook"]
    s.boxr("hook_plate", hw, K["y"] - 12, K["z"] - 9, hw + 3, K["y"] + 10, K["z"] + 9, ch=1, col=MET, style=MST)
    s.boxr("hook_arm", hw + 2, K["y"] + 1, K["z"] - 2, K["x"] + 2, K["y"] + 5, K["z"] + 2, ch=1, col=MET, style=MST)
    s.boxr("hook_tip", K["x"] - 2, K["y"] + 1, K["z"] - 2, K["x"] + 2, K["y"] + 12, K["z"] + 2, ch=1, col=MET, style=MST)

    # ------------------------------------------------------------------ the window frame (the clear panes are the game's)
    top = CY0 + L["caseH"]
    pw = 15
    framecol, framesty = (MET, MST) if st["metal"] == "gold" else ((band, fin) if t == "standard" else (body, fin))
    for k, (x0, z0) in {"fl": (-hw, fz - pw), "fr": (hw - pw, fz - pw), "bl": (-hw, -fz), "br": (hw - pw, -fz)}.items():
        s.vbox("post_" + k, x0, CY0, z0, x0 + pw, top - 9, z0 + pw, ch=min(rnd, 7), col=framecol, style=framesty)
    # the rims: under the lid (round the top) and the glass shoe along the bottom front
    s.boxr("rim_f", -hw + pw, top - 9, fz - pw, hw - pw, top, fz, ch=0, col=framecol, style=framesty, hide=["left", "right"])
    s.boxr("rim_b", -hw + pw, top - 9, -fz, hw - pw, top, -fz + pw, ch=0, col=framecol, style=framesty, hide=["left", "right"])
    s.vbox("rim_l", -hw, top - 9, -fz, -hw + pw, top, fz, ch=min(rnd, 7), col=framecol, style=framesty)
    s.vbox("rim_r", hw - pw, top - 9, -fz, hw, top, fz, ch=min(rnd, 7), col=framecol, style=framesty)
    s.boxr("shoe_f", -hw + pw, CY0, fz - 9, hw - pw, CY0 + 7, fz - 2, ch=1.5, col=MET, style=MST)
    s.boxr("shoe_l", -hw + 1, CY0, -fz + pw, -hw + 6, CY0 + 7, fz - pw, ch=1.5, col=MET, style=MST)
    s.boxr("shoe_r", hw - 6, CY0, -fz + pw, hw - 1, CY0 + 7, fz - pw, ch=1.5, col=MET, style=MST)
    # the back wall (printed with the maker's dot pattern) and the hopper funnel in the floor
    W = L["window"]
    s.boxr("backwall", -hw + pw, CY0, -fz + 2, hw - pw, top - 9, -fz + 20, ch=0, col=inner, style="abs", hide=["back", "top", "bottom"])
    s.layer("backwall", id="shade", op="gradient", axis="y", amount=0.35, faces=["front"])
    s.layer("backwall", id="scuff", op="fill", shift=0.0, faces=["front"])
    s.boxr("floor", -hw + pw, CY0 - 2, -fz + 20, hw - pw, CY0 + 1, fz - 9, ch=0, col=inner, style="abs", hide=["bottom", "left", "right", "front", "back"])
    fr = min(W["x1"] - W["x0"], fz * 2) * 0.27
    s.disc("funnel", fr, 2, (0, CY0 + 1.5, (W["z0"] + fz - 28) / 2), axis="y", sides=24, top=0.86, col=MET, style=MST, tone=2.4, hide=["back"])
    s.disc("funnel_in", fr - 8, 2, (0, CY0 + 2.2, (W["z0"] + fz - 28) / 2), axis="y", sides=24, col="cavity", style="cavity", tone=2.4, hide=["back"])
    s.layer("funnel_in", id="spokes", op="fill", faces=["front"], shift=0.0)
    # the display card's rails at the top front of the window
    Bn = L["banner"]
    for k, sx in (("l", -1), ("r", 1)):
        x = sx * (Bn["w"] / 2 + 3)
        s.boxr("rail_" + k, x - 2.5, Bn["y"] - Bn["h"] / 2 - 3, Bn["z"] - 5, x + 2.5, Bn["y"] + Bn["h"] / 2 + 2, Bn["z"] - 0.5, ch=0.8, col=MET, style=MST)
    s.boxr("rail_b", -Bn["w"] / 2 - 5, Bn["y"] - Bn["h"] / 2 - 5, Bn["z"] - 5, Bn["w"] / 2 + 5, Bn["y"] - Bn["h"] / 2 - 1, Bn["z"] - 0.5, ch=0.8, col=MET, style=MST)

    # ------------------------------------------------------------------ the lid (joint at its back hinge)
    Ld = L["lid"]
    s.joint("lid", (0, Ld["y"], Ld["z"]))
    lt = Ld["y"] + L["capH"]
    s.vbox("lid_box", -hw, Ld["y"] + 1, -fz - 5, hw, lt, fz + 2.5, ch=rnd, parent="lid", col=hdr if t != "deluxe" else body, style=fin,
           front=hdr, hide=["back"], double_sided=True)
    s.layer("lid_box", id="topband", op="panel", inset=px(s, 9), shift=-1.0, highlight=0.6, shadow=-0.4, faces=["front"])
    s.vbox("lid_seam", -hw + 0.5, Ld["y"], -fz - 4.5, hw - 0.5, Ld["y"] + 2, fz + 2, ch=rnd, parent="lid", col=body2, style=fin, hide=["front", "back"])
    if st["metal"] == "gold":
        s.vbox("lid_trim", -hw - 1, lt - 5, -fz - 6, hw + 1, lt, fz + 3.5, ch=rnd, parent="lid", col=MET, style=MST, hide=["front", "back"])
    # the lock barrel with its keyhole, the hinges, the mounting plate for a display top
    s.disc("lid_lock", 7, 5, (Ld["lockX"], Ld["y"] + L["capH"] / 2, fz + 4.5), parent="lid", sides=16, col=MET, style=MST)
    s.stamp("lid_lock", ["..d..", ".ddd.", "..d..", "..d..", ".ddd."], {"d": "cavity:0"}, face="front")
    for k, sx in (("l", -1), ("r", 1)):
        s.disc("hinge_" + k, 4.5, 34, (sx * hw * 0.55, Ld["y"] + 1, -fz - 5), axis="x", parent="lid", sides=10, col=MET, style=MST)
    # the top: a moulded panel where a display top bolts on, its four screw bosses
    tw, td = px(s, 2 * hw), px(s, 2 * fz + 7.5)
    s.screws("lid_box", [(int(tw * 0.22), int(td * 0.25)), (int(tw * 0.78) - 5, int(td * 0.25)), (int(tw * 0.22), int(td * 0.75) - 5),
                         (int(tw * 0.78) - 5, int(td * 0.75) - 5)], face="front", ramp="chrome")
    return s


# ------------------------------------------------------------------ stands
def stand(t):
    L, st = layout(t), STY[t]
    s = M(t + "_stand", f"Capsule machine stand ({t})", dens=0.4, budget=6000,
          light={"dir": [-0.5, 1.0, 0.7], "strength": 0.5, "gradient": 0.25, "ao": 0.55, "ao_height": 120.0})
    hw, fz, Y0 = L["hw"], L["fz"], L["y0"]
    MET = "goldr" if st["metal"] == "gold" else "chrome"
    MST = "gold" if st["metal"] == "gold" else "chrome"
    body = s.c(st["body"], k=0.06)
    body2 = s.c(st["body2"], k=0.06)
    trim = s.c(st["trim"], k=0.08)
    kind = st["stand"]
    if kind == "crate":
        # a slatted fruit crate (mikan box), on its end: corner posts, side slats with gaps, top boards, nails
        X0, X1, Z0, Z1 = -hw - 50, hw + 50, -fz - 35, fz + 35
        wood = s.c("#b08454", hue=10)
        wood2 = s.c("#9a7046", hue=10)
        post = 22
        for k, (px0, pz0) in {"a": (X0, Z0), "b": (X1 - post, Z0), "c": (X0, Z1 - post), "d": (X1 - post, Z1 - post)}.items():
            s.boxr("cpost_" + k, px0, 0, pz0, px0 + post, Y0 - 20, pz0 + post, ch=1.5, col=wood2, style="wood")
        slats = [(10, 170), (200, 370), (400, Y0 - 25)]
        for i, (a, b) in enumerate(slats):
            for zk, z in (("f", Z1 - 12), ("b", Z0)):
                s.boxr(f"slat_{zk}{i}", X0 + 2, a, z, X1 - 2, b, z + 12, ch=1.5, col=wood if i % 2 == 0 else wood2, style="wood")
            for xk, x in (("l", X0), ("r", X1 - 12)):
                s.boxr(f"slat_{xk}{i}", x, a, Z0 + 2, x + 12, b, Z1 - 2, ch=1.5, col=wood2 if i % 2 == 0 else wood, style="wood")
        # nail heads on the front slats
        for i, (a, b) in enumerate(slats):
            for xx in (X0 + 11, X1 - 11):
                for yy in (a + 22, b - 22):
                    s.disc(f"nail_{i}_{xx > 0}_{yy}", 3.5, 2, (xx, yy, Z1 + 1), sides=8, col="steel", style="steel", tone=2.2)
        nb = 4
        span = (Z1 - Z0 - (nb - 1) * 6) / nb
        for i in range(nb):
            z0 = Z0 + i * (span + 6)
            s.boxr(f"top{i}", X0, Y0 - 20, z0, X1, Y0, z0 + span, ch=2, col=wood if i % 2 else wood2, style="plank")
        s.boxr("strap", X0 - 1, Y0 - 60, Z1 - 2, X1 + 1, Y0 - 48, Z1 + 1.5, ch=0.6, col="steel", style="ironpaint")
        box = dict(x0=X0, x1=X1, z0=Z0, z1=Z1, front=Z1, printZ=Z1, printY=290)
    elif kind == "pedestal":
        X0, X1, Z0, Z1 = -hw - 15, hw + 15, -fz - 15, fz + 15
        s.vbox("foot", X0, 10, Z0, X1, 32, Z1, ch=24, col=s.c("#7a7e84"), style="ironpaint")
        s.vbox("foot_rub", X0 + 2, 4, Z0 + 2, X1 - 2, 10, Z1 - 2, ch=22, col="rubber", style="rubber")
        for k, (fx, fzz) in {"a": (X0 + 26, Z0 + 26), "b": (X1 - 26, Z0 + 26), "c": (X0 + 26, Z1 - 26), "d": (X1 - 26, Z1 - 26)}.items():
            s.disc("lev_" + k, 11, 6, (fx, 3, fzz), axis="y", sides=12, col="rubber", style="rubber")
        cw, cd = 2 * hw * 0.6, 2 * fz * 0.6
        ctop = Y0 - 28
        s.vbox("column", -cw / 2, 32, -cd / 2, cw / 2, ctop, cd / 2, ch=16, col=body, style="abs")
        s.layer("column", id="stripe", op="band", axis="x", **{"from": -0.08, "to": 0.08}, ramp=trim, tone=3.0, faces=["bottom"])
        s.layer("column", id="seam", op="panel", inset=4, shift=-0.8, faces=["left", "right"])
        s.vbox("col_foot", -cw / 2 - 2, 32, -cd / 2 - 2, cw / 2 + 2, 52, cd / 2 + 2, ch=17, col=trim, style="abs")
        s.vbox("col_top", -hw + 2, ctop, -fz + 2, hw - 2, Y0, fz - 2, ch=16, col=trim, style="abs")
        s.vbox("col_top2", -hw + 6, ctop - 6, -fz + 6, hw - 6, ctop, fz - 6, ch=14, col=body2, style="abs")
        # the maker's round badge on the column
        by = (32 + ctop) / 2 + 40
        s.disc("badge", 30, 3, (0, by, cd / 2 + 1.5), sides=24, col=trim, style="lacquer")
        s.disc("badge_in", 22, 2, (0, by, cd / 2 + 3.5), sides=24, col="paperw", style="lacquer", tone=4.5)
        s.stamp("badge_in", text5("C", "i"), {"i": f"{trim}:2"}, face="front")
        box = dict(x0=X0, x1=X1, z0=Z0, z1=Z1, front=Z1)
    elif kind == "twotier":
        X0, X1, Z0, Z1 = -hw - 12, hw + 12, -fz - 12, fz + 12
        iron = s.c("#3c3e44")
        for k, (px0, pz0) in {"a": (X0, Z0), "b": (X1 - 14, Z0), "c": (X0, Z1 - 14), "d": (X1 - 14, Z1 - 14)}.items():
            # angle iron: two flanges
            s.boxr("post_" + k, px0, 10, pz0, px0 + 14, Y0, pz0 + 3, ch=0, col=iron, style="ironpaint")
            s.boxr("post2_" + k, px0, 10, pz0, px0 + 3, Y0, pz0 + 14, ch=0, col=iron, style="ironpaint")
            s.boxr("pfoot_" + k, px0 - 1, 0, pz0 - 1, px0 + 15, 10, pz0 + 15, ch=2, col="rubber", style="rubber")
        for yk, y in (("lo", 30), ("hi", Y0 - 10)):
            s.boxr(f"rf_{yk}", X0, y, Z1 - 3, X1, y + 10, Z1, ch=0, col=iron, style="ironpaint")
            s.boxr(f"rb_{yk}", X0, y, Z0, X1, y + 10, Z0 + 3, ch=0, col=iron, style="ironpaint")
            s.boxr(f"rl_{yk}", X0, y, Z0, X0 + 3, y + 10, Z1, ch=0, col=iron, style="ironpaint")
            s.boxr(f"rr_{yk}", X1 - 3, y, Z0, X1, y + 10, Z1, ch=0, col=iron, style="ironpaint")
        # the sister unit, shuttered: black body, gold seam, a roller shutter over its window, a dial without crank
        ux0, ux1, uz0, uz1 = -hw + 6, hw - 6, -fz + 4, fz - 6
        uy0, uy1 = 42, Y0 - 12
        split = uy0 + (uy1 - uy0) * 0.45
        s.vbox("sis_lo", ux0, uy0, uz0, ux1, split, uz1, ch=8, col=body, style="lacquer")
        s.vbox("sis_seam", ux0 - 1, split, uz0 - 1, ux1 + 1, split + 8, uz1 + 1, ch=8, col=MET, style=MST)
        s.vbox("sis_hi", ux0, split + 8, uz0, ux1, uy1, uz1, ch=8, col=body, style="lacquer")
        sh = s.boxr("shutter", ux0 + 14, split + 22, uz1, ux1 - 14, uy1 - 14, uz1 + 3, ch=0, col=s.c("#5a5e64"), style="steel")
        s.layer("shutter", id="slats", op="stripes", axis="y", period=9, width=0.25, shift=-1.4, faces=["front"])
        s.layer("shutter", id="lip", op="stripes", axis="y", period=9, width=0.12, phase=2.5, shift=1.0, faces=["front"])
        cy = uy0 + (split - uy0) * 0.55
        s.disc("sis_dial", 48, 3, (-18, cy, uz1 + 1.5), sides=28, col=s.c("#242328"), style="lacquer")
        s.disc("sis_dialr", 52, 2, (-18, cy, uz1 + 0.5), sides=28, col=MET, style=MST)
        s.disc("sis_hub", 18, 4, (-18, cy, uz1 + 4), sides=16, col=MET, style=MST)
        box = dict(x0=X0, x1=X1, z0=Z0, z1=Z1, front=uz1, shutterY=(split + uy1) / 2, unitFront=uz1 + 3)
    else:  # cabinet
        X0, X1, Z0, Z1 = -hw - 10, hw + 10, -fz - 10, fz + 10
        pearl = body
        s.vbox("kick", X0 + 10, 0, Z0 + 10, X1 - 10, 40, Z1 - 10, ch=6, col=s.c("#3a3036"), style="lacquer")
        s.vbox("cab", X0, 40, Z0, X1, Y0 - 16, Z1, ch=8, col=pearl, style="lacquer")
        s.layer("cab", id="vent", op="grille", rect=[0.25, 0.45, 0.75, 0.75], period=4, slit_tone=0.6, lip=0.5, faces=["left", "right"])
        s.vbox("cornice", X0 - 2, Y0 - 16, Z0 - 2, X1 + 2, Y0, Z1 + 2, ch=9, col=MET, style=MST)
        s.vbox("skirt", X0 - 1, 40, Z0 - 1, X1 + 1, 50, Z1 + 1, ch=8, col=MET, style=MST)
        # the front panel framed in gold beading, the medallion
        fx0, fx1, fy0, fy1 = X0 + 22, X1 - 22, 70, Y0 - 44
        s.boxr("bead_t", fx0, fy1, Z1, fx1, fy1 + 5, Z1 + 3, ch=1.5, col=MET, style=MST)
        s.boxr("bead_b", fx0, fy0 - 5, Z1, fx1, fy0, Z1 + 3, ch=1.5, col=MET, style=MST)
        s.boxr("bead_l", fx0 - 5, fy0 - 5, Z1, fx0, fy1 + 5, Z1 + 3, ch=1.5, col=MET, style=MST)
        s.boxr("bead_r", fx1, fy0 - 5, Z1, fx1 + 5, fy1 + 5, Z1 + 3, ch=1.5, col=MET, style=MST)
        s.boxr("cab_panel", fx0, fy0, Z1 - 1, fx1, fy1, Z1 + 1, ch=0, col=s.c(st["panel"], k=0.04), style="lacquer")
        my = (fy0 + fy1) / 2
        s.disc("medal_o", 54, 3, (0, my, Z1 + 2.5), sides=28, col=MET, style=MST)
        s.disc("medal", 46, 3, (0, my, Z1 + 4.5), sides=28, col=trim, style="lacquer")
        s.disc("medal_i", 28, 2, (0, my, Z1 + 6.5), sides=24, col=MET, style=MST, tone=4.5)
        s.stamp("medal_i", text5("G", "i"), {"i": f"{trim}:1"}, face="front")
        box = dict(x0=X0, x1=X1, z0=Z0, z1=Z1, front=Z1)
    s.meta["standBox"] = box
    return s


TYPES = ["retro", "standard", "deluxe", "royal"]
SPECS_OUT = {t: machine for t in TYPES}
SPECS_OUT.update({t + "_stand": stand for t in TYPES})


def build_all():
    out = {}
    for t in TYPES:
        out[t] = machine(t)
        out[t + "_stand"] = stand(t)
    return out
