"""スカラベ・サニー Sunny, Drums (series kouchuu, The Hardwings): the scarab on drums, sitting on his stool behind his
little kit (a bass drum with a white front head, a rack tom, a snare on its stand, a ride cymbal on its stand), green-
gold metallic chitin, a grey-blue suit, sticks up and grinning under his mop-top.
Gimmick: a drum roll, a crash on the cymbal (it wobbles), and the mop-top shakes.

    tools/blender.sh art/blender/toys/kouchuu/sukarabe.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

os.environ.setdefault('GG_BZ_K', '1.2')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _band import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('kouchuu', 'sukarabe')
B = Build()
SEAT = 7.2
HR, HL = V3(-3.8, -5.2, 13.8), V3(4.0, -5.4, 14.2)
M = Beetle(B, hand_r=HR, hand_l=HL, hk=1.05, seat=SEAT)
M.antennae(club=True)
# the sticks, held up over the drums
B.add('arm_r', limb('stick_r', [HR + (0, -0.6, 0.6), HR + (-1.8, -1.8, -2.4)], [0.28, 0.2], tris=8, region='stick', n=5))
B.add('arm_l', limb('stick_l', [HL + (0, -0.6, 0.6), HL + (-1.6, -3.8, -1.8)], [0.28, 0.2], tris=8, region='stick', n=5))
# ------------------------------------------------------------------ the kit
B.add('body', turn('stool', [(0, 0), (2.8, 0), (2.8, 0.3), (0.6, 0.7), (0.6, SEAT - 1.2), (3.2, SEAT - 1.0), (3.4, SEAT - 0.3), (0, SEAT)],
                   (0, 1.2, 0), ('metal', [('seat', lambda C, N: C[:, 2] > SEAT - 1.1)]), tris=40, n=12))
BD = (0, -11.8, 5.0)
B.add('kit', turn('bass', [(0, -2.2), (4.7, -2.2), (5.0, -1.9), (5.0, 1.9), (4.7, 2.2), (0, 2.2)], BD, ('shell', [('dhead', lambda C, N: np.abs(N[:, 1]) > 0.8),
                   ('rim', lambda C, N: (np.abs(C[:, 1] - BD[1]) > 1.7) & (np.abs(N[:, 1]) < 0.8))]), tris=60, n=16, axis='Y'))
for sx in (1, -1):   # its two spurs
    B.add('kit', limb('spur', [(sx * 3.6, -10.4, 2.0), (sx * 5.2, -10.2, 0.3)], 0.25, tris=8, region='metal', n=4))
TOM = (1.8, -10.8, 12.0)
tom = tk.lathe('tom', [(0, -1.0), (2.1, -1.0), (2.2, -0.8), (2.2, 0.8), (2.1, 1.0), (0, 1.0)], n=12, centre=TOM)
tk.rotate(tom, -18, 'X', pivot=TOM)
B.add('kit', lowk(tom, 'tom', 40, ('shell', [('dhead', lambda C, N: C[:, 2] > TOM[2] + 0.6)])))
SN = (-5.8, -6.6, 10.4)
for a in (90, 210, 330):
    import math
    B.add('kit', limb('sleg', [(SN[0], SN[1], 6.0), (SN[0] + 2.4 * math.cos(math.radians(a)), SN[1] + 2.4 * math.sin(math.radians(a)), 0.25)], 0.22, tris=8,
                      region='metal', n=4))
B.add('kit', limb('spole', [(SN[0], SN[1], 0.6), (SN[0], SN[1], SN[2] - 1.0)], 0.3, tris=8, region='metal', n=5))
sn = tk.lathe('snare', [(0, -0.8), (2.5, -0.8), (2.6, -0.6), (2.6, 0.6), (2.5, 0.8), (0, 0.8)], n=12, centre=SN)
tk.rotate(sn, 10, 'Y', pivot=SN)
B.add('kit', lowk(sn, 'snare', 40, ('rimc', [('dhead', lambda C, N: C[:, 2] > SN[2] + 0.5)])))
CY = (6.4, -6.0, 17.0)
for a in (60, 180, 300):
    B.add('kit', limb('cleg', [(CY[0], CY[1], 6.0), (CY[0] + 2.4 * math.cos(math.radians(a)), CY[1] + 2.4 * math.sin(math.radians(a)), 0.25)], 0.22, tris=8,
                      region='metal', n=4))
B.add('kit', limb('cpole', [(CY[0], CY[1], 0.6), (CY[0], CY[1], CY[2] - 0.3)], 0.3, tris=10, region='metal', n=5))
cym = tk.lathe('cymbal', [(0, 0.5), (0.6, 0.45), (3.9, 0.0), (4.0, -0.15), (0.6, 0.25), (0, 0.3)], n=16, centre=CY)
tk.rotate(cym, -12, 'X', pivot=CY)
B.add('cymbal', lowk(cym, 'cymbal', 40, 'brass'))
B.commit(F, bones={'body': 'body', 'head': 'head', 'arm_r': 'arm_r', 'arm_l': 'arm_l', 'kit': 'root', 'cymbal': 'cymbal'})


def make_rig():
    R = M.rig(F, body=(0, 0.6, SEAT + 1.0), extra=lambda R: R.bone('cymbal', CY, parent='root'))
    k = R.key
    allb = ['root', 'body', 'head', 'arm_r', 'arm_l', 'cymbal']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        for i, f in enumerate(range(4, 28, 2)):   # the roll on the snare and tom
            k('arm_r', f, rot=('X', 14 if i % 2 == 0 else -4))
            k('arm_l', f, rot=('X', -4 if i % 2 == 0 else 14))
        k('arm_r', 30, rot=('X', -24))
        k('arm_l', 30, rot=[('X', -20), ('Z', -10)])
        k('arm_l', 34, rot=[('X', 16), ('Z', -6)], ease=('QUAD', 'EASE_IN'))    # the crash
        k('arm_r', 34, rot=('X', 16), ease=('QUAD', 'EASE_IN'))
        k('arm_r', 44)
        k('arm_l', 44)
        k('cymbal', 34)
        for j, f in enumerate(range(36, 56, 3)):
            a_ = 14 * (0.75 ** j)
            k('cymbal', f, rot=('X', a_ if j % 2 == 0 else -a_))
        k('cymbal', 58)
        shake(k, 6, 46, amp=13)
        k('body', 30)
        k('body', 35, move=(0, 0, 0.6))
        k('body', 40)
        for b in allb[:-1]:
            k(b, 58)
    return R


def paint(P, pt):
    X, Y, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    paint_member(P, pt, sh, chitin='#2e6a3e', suit='#6a7a8c', hair='#4a3022')
    gr = P.region('chitin') | P.region('face')
    P.fill(gr & (P.on[:, :, 2] > 0.55), pt.ramp('#8a9a3a', 6, shift=0.07), tone=sh, base=0.2, brush={'preset': 'gloss', 'shine': 0.5})   # gold sheen on top
    P.fill('stick', pt.ramp('#e8d0a0', 5, shift=0.04), tone=sh, base=0.2)
    P.fill('metal', pt.ramp('#b8bcc4', 6, shift=0.04, light=0.6), tone=sh, base=0.2, brush='metal')
    P.fill('rim', pt.ramp('#b8bcc4', 6, shift=0.04, light=0.6), tone=sh, base=0.2, brush='metal')
    P.fill('rimc', pt.ramp('#b8bcc4', 6, shift=0.04, light=0.6), tone=sh, base=0.2, brush='metal')
    P.fill('seat', pt.ramp('#2a2426', 5, light=0.6), tone=sh, base=0.2)
    P.fill('shell', pt.ramp('#2a2a40', 6, shift=0.06, light=0.6), tone=sh, base=0.2, brush={'preset': 'lacquer', 'flow': 'around', 'shine': 0.5})
    P.shift(P.region('shell') & bands(np.arctan2(Z - 5.0, X) * 3.0, 1.0, 0.18), 1)   # the pearl wrap's flecks of light
    dh = P.region('dhead')
    P.fill(dh, pt.ramp('#f2efe6', 5, shift=0.03), tone=sh, base=0.25, brush=False)
    d = np.hypot(X - BD[0], Z - BD[2])
    P.fill(dh & (Y < BD[1] - 1.5) & (np.abs(d - 3.3) < 0.45), pt.ramp('#c8302a', 5), tone=sh, base=0.2, brush=False)
    P.fill('brass', pt.ramp('#d8b048', 7, shift=0.08, light=0.6), tone=sh, base=0.2, brush={'preset': 'metal', 'flow': 'around'})
    P.shift(P.region('brass') & bands(np.hypot(X - CY[0], Y - CY[1]), 0.6, 0.12), -1)   # the lathing rings
    face_at(P, M, 304, size=0.58)
    P.lines(['shell'], ['dhead', 'rim', 'rimc'], step=1)
    P.clusters()
    return P.done()


go(F, make_rig, paint, frames=58, skip=[('arm_r', 'kit'), ('arm_l', 'kit'), ('arm_l', 'cymbal'), ('body', 'kit'), ('head', 'kit')],
   fold=(0, 10, 34, 40))
