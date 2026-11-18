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


# ------------------------------------------------------------------ uniform kit (series ekiin): the station cap
def station_cap(at, r=5.6, h=4.6, tilt=-8.0, yaw=0.0, visor=1.0, scale=(1.0, 1.0, 1.0)):
    """A Shōwa railway peaked cap sitting on a head at `at` (the crown's bottom centre), facing -y: a crown flaring a
    little to its flat top (region 'cap'), the band (region 'band'), a glossy visor (region 'visor') and the badge
    (region 'badge'). tilt: degrees about x (negative tips it back). Returns [(low, high), ...]."""
    out = []
    crown = tk.lathe('cap', [(0, 0.0), (r, 0.0), (r * 1.02, h * 0.42), (r * 1.13, h * 0.82), (r * 1.17, h * 0.97), (r * 1.08, h * 1.04), (0, h * 1.08)], n=18)
    out.append(low(crown, 'cap', 90, lo=0, hi=2, region=('cap', [('band', lambda C, N: (C[:, 2] < h * 0.42) & (np.abs(N[:, 2]) < 0.6))])))
    vz = h * 0.12
    pts = [(-r * 0.95, -r * 0.35), (-r * 0.7, -r * 1.05), (0.0, -r * 1.55 * visor), (r * 0.7, -r * 1.05), (r * 0.95, -r * 0.35), (0.0, -r * 0.75)]
    v = tk.slab('visor', pts, 0.8, plane='XY', at=vz, bevel=0.3, segs=1)
    tk.deform(v, lambda V: V + np.stack([0 * V[:, 0], 0 * V[:, 0], -0.16 * np.clip(-V[:, 1] - r * 0.6, 0, None) ** 1.3], 1))
    out.append(low(v, 'visor', 40, lo=0, hi=1, region='visor'))
    b = tk.slab('badge', circle_pts(1.1, 10), 0.6, plane='XZ', at=0.0, bevel=0.2, segs=1)
    tk.move(b, (0, -r * 1.03 - 0.15, h * 0.62))
    out.append(low(b, 'badge', 20, lo=0, hi=1, region='badge'))
    for lo_, hi_ in out:
        for o in (lo_, hi_):
            tk.scale(o, scale)
            tk.rotate(o, tilt, 'X')
            if yaw:
                tk.rotate(o, yaw, 'Z')
            tk.move(o, at)
    return out


def circle_pts(r, n, c=(0, 0)):
    return [(c[0] + r * math.cos(2 * math.pi * k / n), c[1] + r * math.sin(2 * math.pi * k / n)) for k in range(n)]


def drop_faces(ob, pred):
    """Delete the faces of a mesh whose centre / normal pass pred(C (n,3), N (n,3)): surfaces buried inside another part
    (they would only take texels from what you see)."""
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.faces.ensure_lookup_table()
    C = np.array([f.calc_center_median() for f in bm.faces])
    N = np.array([f.normal for f in bm.faces])
    kill = [f for f, k in zip(bm.faces, np.asarray(pred(C, N), bool)) if k]
    bmesh.ops.delete(bm, geom=kill, context='FACES')
    bm.to_mesh(ob.data)
    bm.free()
    ob.data.update()
    return ob


def flat_bottom(ob, h=0.9):
    """Press the lowest `h` mm of a mesh flat onto the shelf (z = 0): a hem or a sole that subdivision rounded off
    stands on its whole footprint again."""
    V = tk.verts(ob)
    V[:, 2] = np.where(V[:, 2] < h, 0.0, V[:, 2])
    tk.set_verts(ob, V)
    return ob
