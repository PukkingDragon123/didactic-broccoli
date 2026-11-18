"""The face kit's review sheet: hand-drawn faces (lib/face.py) on test heads, painted and baked the way the figures
are (facet mode), one tile per face.

    tools/blender.sh art/blender/toys/faces.py <out_dir>      -> <out_dir>/face_NN.png: the attitudes, then one per species
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
os.environ.setdefault('GG_FACET', '1')
import numpy as np  # noqa: E402

import tk  # noqa: E402
from fig import Fig  # noqa: E402
import face  # noqa: E402
import paint as pt  # noqa: E402

OUT = sys.argv[-1]
os.makedirs(OUT, exist_ok=True)
tk.reset()
F = Fig('facetest', 'head')
R, ZC = 11.0, 12.0
cage = tk.loft('head', [{'c': (0, 0, ZC + z), 'w': 2 * R * w, 'h': R * w, 'e': 2.3} for z, w in
                        ((-R, 0.35), (-R * 0.8, 0.8), (-R * 0.3, 1.0), (R * 0.3, 1.0), (R * 0.8, 0.78), (R, 0.3))],
               n=16, up=(0, -1, 0), cap0='round', cap1='round', capd=1.5)
low, high = tk.lowhigh(cage, 'head', lo=1, hi=3, tris=700, region='skin')
F.part('head', low, [high])
F.unwrap()
F.bake(ao_samples=16, ao_dist=5.0)
SKIN = ['#f1d9b8', '#eaa0a4', '#9cc98a', '#f4efe6', '#e8c05a', '#7fb3c8', '#2a2628', '#d98c54']


ATT = ['smug', 'determined', 'side_eye', 'sly', 'grumpy', 'derpy', 'bored', 'intense', 'toothy_smirk', 'fangy', 'deadpan',
       'mischief', 'sleepy_cool', 'villain', 'worried', 'cheeky']
SPC = ['owl', 'frog', 'tanuki', 'fox', 'pig', 'bear', 'cat', 'wolf', 'crow', 'fish', 'octopus', 'crab', 'turtle', 'rabbit',
       'giraffe', 'snake']
NAMES = ATT + SPC
BEAK = {'owl', 'crow'}


def face_set(fc, i):
    """The attitudes, then one face per species, drawn with the plain calls a figure script makes."""
    nm = NAMES[i]
    fc.species(nm)
    if nm == 'tanuki':
        fc.marks('tanuki', 0, 1.0, 1.4)
    fc.eyes('dot', 7.0, 0.85, 1.2, shape=1.2)
    if nm in BEAK:
        fc.nose('beak', 0, -1.8, 1.3)
    elif nm in ('pig',):
        fc.nose('snout', 0, -1.4, 1.2)
        fc.mouth('upturn', 3.0, -4.2)
    else:
        if nm in ('cat', 'fox', 'wolf', 'bear', 'rabbit'):
            fc.nose('tri' if nm != 'bear' else 'button', 0, -1.3, 0.6)
        fc.mouth('upturn', 4.0, -3.3)


tiles = []
for i in range(len(NAMES)):
    P = pt.Painter(F.maps, F.region_index, F.size)
    col = SKIN[i % len(SKIN)]
    P.fill('skin', pt.ramp(col, 7, shift=0.06), tone=P.shade(light=0.0, ao=0.85, cav=1.1), base=0.08)
    fc = face.Face(P, c=(0, -R, ZC), axis=(0, -1, 0), where=P.region('skin'), seed=11 + i,
                   ink='#efe4c8' if col == '#2a2628' else face.INK)
    face_set(fc, i)
    rgb = P.done()
    if i == 0:
        F.finish(rgb)
    else:
        n = F.size
        a = np.ones((n, n, 4), np.float32)
        a[:, :, :3] = np.clip(rgb, 0, 1)
        F.albedo.pixels.foreach_set(a.reshape(-1))
        F.albedo.update()
    tk.preview(os.path.join(OUT, f'face_{i:02d}.png'), [low], cam=((9, -48, 16), (0, 0, ZC + 0.5)), res=(300, 300), samples=16, lens=60)
    print('[faces]', i, flush=True)
