"""Agent C's shared helpers for its toy series (kaden, ekiin, kabuki, karakuri; concepts_C.md): the figure-script
command line (preview, fold, clip check, bake, paint, export), bead eyes and a few sculpt / paint fields.

    sys.path: art/blender/toys/lib and art/blender/toys/kaden/_cx
    import cx; ... cx.run(F, make_rig, paint, clip=dict(frames=range(1, 90), skip=[...]))
"""
import math
import os
import sys

import numpy as np

import tk  # (imports bpy first)
from mathutils import Vector

ARGS = sys.argv[1:]


def bead(name, c, ax, r=2.5, depth=1.4, n_lo=8, squash=1.0):
    """A glossy bead eye set into its socket: (low, high), centred at c, its dome facing ax."""
    ax = np.asarray(ax, float)
    ax = ax / np.linalg.norm(ax)
    out = []
    for nm, n_, lv in ((name + '_hi', 16, 2), (name, n_lo, 0)):
        b = tk.lathe(nm, [(0, -depth), (r * 0.8, -depth * 0.7), (r, 0.0), (r * 0.8, depth * 0.75), (0, depth)], n=n_)
        if squash != 1.0:
            tk.scale(b, (1, squash, 1))
        q = Vector((0, 0, 1)).rotation_difference(Vector(tuple(ax)))
        tk.transform(b, q.to_matrix().to_4x4())
        tk.move(b, tuple(c))
        tk.subsurf(b, lv)
        out.append(b)
    tk.set_region(out[0], 'eye')
    return out[1], out[0]


def low(o, name, tris, lo=1, hi=2, region=None, sculpt=None, keep_corners=False):
    """lowhigh + decimate in one go."""
    a, b = tk.lowhigh(o, name, lo=lo, hi=hi, sculpt=sculpt, region=region or name, keep_corners=keep_corners)
    tk.decimate(a, tris)
    return a, b


def polar(X, Z, c):
    """Radius and angle (degrees, 0 = +x, counter-clockwise seen from the front) of points about c=(x, z)."""
    dx, dz = X - c[0], Z - c[1]
    return np.hypot(dx, dz), np.degrees(np.arctan2(dz, -dx)) % 360


def montage(paths, out, cols=4):
    """Glue preview renders side by side (bpy images: no PIL inside Blender's Python)."""
    import bpy
    ims = [bpy.data.images.load(p) for p in paths]
    w, h = ims[0].size
    rows = (len(ims) + cols - 1) // cols
    big = np.ones((rows * h, cols * w, 4), np.float32)
    for i, im in enumerate(ims):
        a = np.empty(w * h * 4, np.float32)
        im.pixels.foreach_get(a)
        a = a.reshape(h, w, 4)
        r, c = divmod(i, cols)
        big[(rows - 1 - r) * h:(rows - r) * h, c * w:(c + 1) * w] = a
    o = bpy.data.images.new('montage', cols * w, rows * h, alpha=False)
    o.pixels.foreach_set(big.reshape(-1))
    o.filepath_raw = out
    o.file_format = 'PNG'
    o.save()
    for p in paths:
        os.remove(p)
    print('[montage]', out)


def run(F, make_rig, paint, clip=None, cams=None, fold=(0, 30, 52, 68), ao_dist=6.0, roughness=0.42, res=(420, 420)):
    """The figure script's command line:
        --preview  sculpts and game meshes from two sides (one montage png)
        --fold     the game meshes at the `fold` frames of the gimmick clip
        --clip     report parts passing through each other during the clip
        (none)     unwrap, bake (--fast: fewer AO samples; --repaint: reuse the last bake), paint, rig, export."""
    import bpy
    OUT = os.path.join(F.out, F.id)
    cams = cams or [((62, -70, 50), (0, 0, 22)), ((-62, 66, 44), (0, 2, 22))]
    if '--clip' in ARGS:
        from rig import check_clip
        R = make_rig()
        clip = clip or {}
        res_ = check_clip(R, F.parts, clip.get('frames', range(1, 90)), skip=clip.get('skip', []), tol=clip.get('tol', 0.35))
        for f, L_ in sorted(res_.items()):
            print('CLIP', f, L_)
        print('CLIP frames', len(res_))
        sys.exit(0)
    if '--preview' in ARGS or '--fold' in ARGS:
        lows = [p.low for p in F.parts]
        highs = [h for p in F.parts for h in p.highs]
        paths = []
        if '--fold' in ARGS:
            R = make_rig()
            R.arm.animation_data.action = bpy.data.actions['gimmick']
            for i, fr in enumerate(fold):
                bpy.context.scene.frame_set(fr)
                paths.append(OUT + f'_f{i}.png')
                tk.preview(paths[-1], lows, cam=cams[0], res=res)
            montage(paths, OUT + '_fold.png', cols=len(paths))
            sys.exit(0)
        for i, cam in enumerate(cams):
            paths.append(OUT + f'_h{i}.png')
            tk.preview(paths[-1], highs, cam=cam, res=res)
        for i, cam in enumerate(cams):
            paths.append(OUT + f'_l{i}.png')
            tk.preview(paths[-1], lows, cam=cam, res=res)
        montage(paths, OUT + '_prev.png', cols=len(cams) * 2)
        sys.exit(0)
    import paint as pt
    F.unwrap()
    F.bake(ao_samples=24 if '--fast' in ARGS else 128, ao_dist=ao_dist, reuse='--repaint' in ARGS)
    P = pt.Painter(F.maps, F.region_index, F.size)
    F.finish(paint(P), roughness=roughness)
    F.drop_highs()
    R = make_rig()
    F.export(R)


# ------------------------------------------------------------------ paint fields
def stripes(u, period, width):
    """Mask of bands across u: |u mod period| < width (centred)."""
    f = np.mod(u, period) - period / 2
    return np.abs(f) < width / 2


def chevrons(X, Z, x0, z0, period, w, spread=0.45):
    """Printed feather chevrons (rows of V marks) on a front: a mask."""
    v = Z - z0 + np.abs(X - x0) * spread
    return stripes(v, period, w)
