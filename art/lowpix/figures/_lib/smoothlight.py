"""Smooth painted light for the capsule-toy finish (CLAUDE.md toy rule: glossy factory PVC with soft clean shading).

lowpix paints its light per face (one dot(N, L) for the whole face), which leaves round forms covered in flat facet
patches. This extension, loaded at run time (the lowpix checkout itself stays untouched), gives round parts (lofts,
prisms) smooth vertex normals with a crease angle, interpolates them per texel the way a GPU would (Face.sample), and
paints the light, the stepped airbrush shade and a small specular highlight from those per-texel normals. Boxes and
tapers (crates, trays, boards) keep their crisp per-face light and rims.

A part opts into the highlight with paint.rim.spec = [threshold, tone shift] (figlib's "vinyl" style sets it).
Use: python3 art/lowpix/figures/_lib/lowpix_run.py <lowpix args>, or import this module before building.
"""
import inspect
import textwrap

import numpy as np

from lowpix import painter as P

CREASE = np.cos(np.radians(55.0))
SMOOTH_SHAPES = {"loft", "prism"}
HALF = None  # the highlight's half vector (light + a front-top view), set per painter


def _vertex_normals(inst):
    """Per-corner smooth normals for every face of a round part (area-weighted, within the crease angle)."""
    faces = inst.faces
    acc = {}
    info = []
    for f in faces:
        n = f.normal
        a = max(f.area(), 1e-9)
        keys = [tuple(np.round(p, 3)) for p in f.pts]
        info.append((f, n, keys))
        for k in keys:
            acc.setdefault(k, []).append((n, a))
    for f, n, keys in info:
        vn = []
        for k in keys:
            s = np.zeros(3)
            for m, a in acc[k]:
                if float(np.dot(m, n)) >= CREASE:
                    s += m * a
            L = np.linalg.norm(s)
            vn.append(s / L if L > 1e-9 else n)
        f._vn = np.array(vn)
        f.attrs["n"] = f._vn  # exported as the GLB's vertex normals too, so the game's lit view is smooth as well


_orig_init = P.FaceCtx.__init__


def _init(self, inst, face, fidx, light, bbox, density=2.0):
    _orig_init(self, inst, face, fidx, light, bbox, density)
    part = getattr(inst, "part", None) or {}
    if part.get("shape") not in SMOOTH_SHAPES:
        return
    if not getattr(inst, "_vn_done", False):
        _vertex_normals(inst)
        inst._vn_done = True
    vn = getattr(face, "_vn", None)
    if vn is None:
        return
    S, T = face.texel_grid(self.W, self.H)
    n = face.sample(S, T, vn)
    n = n / np.maximum(np.linalg.norm(n, axis=-1, keepdims=True), 1e-9)
    R = inst.world[:3, :3]
    nw = n @ R.T
    L = np.asarray(light, float)
    self.ndl_map = nw @ L
    h = L / np.linalg.norm(L) + np.array([0.0, 0.35, 1.0]) / np.linalg.norm([0.0, 0.35, 1.0])
    self.ndh_map = nw @ (h / np.linalg.norm(h))


P.FaceCtx.__init__ = _init

# paint_face: the light term from the per-texel normals when a face has them, plus the specular highlight
_src = textwrap.dedent(inspect.getsource(P.Painter.paint_face))
_old = "tone += lit * self.light_strength * ctx.ndl\n"
assert _old in _src, "lowpix paint_face changed: update smoothlight.py"
_new = ("tone += lit * self.light_strength * getattr(ctx, 'ndl_map', ctx.ndl)\n"
        "        _sp = paint.get('rim', {}).get('spec')\n"
        "        if _sp and getattr(ctx, 'ndh_map', None) is not None:\n"
        "            tone[ctx.ndh_map > float(_sp[0])] += float(_sp[1])\n")
_src = _src.replace(_old, _new)
_ns = {}
exec(compile(_src, P.__file__, "exec"), P.__dict__, _ns)
P.Painter.paint_face = _ns["paint_face"]
