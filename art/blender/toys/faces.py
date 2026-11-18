"""The face kit's review sheet: hand-drawn faces (lib/face.py) on test heads, painted and baked the way the figures
are (facet mode), one tile per face.

    GG_FACE_V3=1 tools/blender.sh art/blender/toys/faces.py <out_dir>      -> <out_dir>/face_NN.png (360 px tiles)
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


def face_set(fc, i):
    """24 faces: the eye shapes, catchlights, lids, lashes, brows, cheeks, the animal set, mouths and extras."""
    E, M = fc.eyes, fc.mouth
    if i == 0: E('oval', 7.0, 0.85, 1.2); M('upturn', 4.0, -3.4); fc.blush(9.5, -1.6)
    if i == 1: E('bean', 7.4, 0.9, 1.1); M('grin', 6.0, -3.0)
    if i == 2: E('halfmoon', 7.0, 0.95, 1.0); M('w', 3.0, -3.2); fc.blush(9.5, -1.4, style='hatch')
    if i == 3: E('lid', 7.0, 0.95, 1.0); M('line', 3.6, -3.4); fc.sweat(5.8, 3.4, 0.7)
    if i == 4: E('oval', 7.2, 1.0, 1.2, lashes=2); M('smug', 4.6, -3.2); fc.freckles(0, -1.2, 9.2)
    if i == 5: E('tiny', 5.0, 0.55, 1.0); M('o', 2.6, -2.8)
    if i == 6: E('bean', 7.0, 0.85, 1.2, lower=True); M('frown', 4.0, -3.6); fc.anger(5.6, 5.4, 1.4)
    if i == 7: E('oval', 7.0, 0.9, 1.2); M('open', 4.4, -2.6)
    if i == 8: E('squeeze', 7.0, 0.8, 1.2); M('shout', 4.2, -2.8)
    if i == 9: E('wink', 7.0, 0.85, 1.2); M('tongue', 4.4, -3.0); fc.blush(9.5, -1.4)
    if i == 10: E('dizzy', 7.0, 0.8, 1.2); M('wobble', 4.4, -3.4)
    if i == 11: E('halfmoon', 6.6, 0.85, 1.1); M('pout', 2.6, -3.2); fc.blush(9.0, -1.4, style='hatch')
    if i == 12: E('side', 7.0, 0.9, 1.2, look=1); M('dash', 3.0, -3.4)
    if i == 13: E('teary', 7.2, 0.9, 1.2); M('frown', 3.6, -3.6); fc.brows('worried', 7.2, 3.8, 2.6, 0.4)
    if i == 14: E('oval', 7.0, 0.8, 1.0, lid=True); fc.brows('angry', 7.2, 3.2, 2.8, 0.45); M('gritted', 5.0, -3.0)
    if i == 15: E('bean', 7.0, 0.8, 1.2); fc.brows('worried', 7.0, 3.4, 2.4, 0.38); M('wobble', 4.0, -3.4); fc.sweat(-6.0, 3.0, 0.7)
    if i == 16: E('oval', 7.6, 0.8, 1.2); fc.nose('tri', 0, -1.4, 0.7); fc.snout_mouth('cat', 0, -2.0, 2.4); fc.whiskers(0, -2.0, 7.0)
    if i == 17: E('bean', 7.0, 0.85, 1.1); fc.nose('button', 0, -1.4, 0.9); fc.snout_mouth('Y', 0, -2.2, 2.6)
    if i == 18: E('lid', 9.0, 0.8, 1.0); fc.nose('snout', 0, -1.6, 1.3); M('upturn', 3.0, -4.4)
    if i == 19: E('oval', 8.4, 0.85, 1.2); fc.nose('beak', 0, -1.8, 1.4)
    if i == 20: E('tiny', 5.4, 0.6, 1.0); fc.nose('tri', 0, -1.2, 0.55); fc.snout_mouth('rabbit', 0, -1.7, 2.0); fc.blush(8.8, -1.6)
    if i == 21: E('oval', 7.0, 0.9, 1.2); M('grin', 5.6, -3.0)
    if i == 22: fc.marks('tanuki', 0, 1.0, 1.4); E('oval', 7.4, 0.8, 1.2); M('w', 2.8, -3.0)
    if i == 23: E('halfmoon', 7.0, 0.9, 1.0); M('open', 4.0, -2.6); fc.freckles(0, -1.0, 9.0)


tiles = []
for i in range(24):
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
