"""Rigs and gimmick clips: an armature whose bones carry the toy's rigid parts (the way a real jointed capsule toy
moves: hinges and pivots), keyed in figure space and exported as glTF animations.

    R = Rig()
    R.bone('jaw', head=(0, -10, 12))                       # a pivot (bones point up; parent=... for chains)
    R.attach(part_obj, 'jaw')
    with R.action('gimmick'):
        R.key('jaw', 0); R.key('jaw', 12, rot=('X', -30)); R.key('jaw', 18, rot=('X', 0), ease='BACK')
Rotations are given about figure-space axes through the bone's pivot (degrees), moves in figure space (mm). A child
bone's keys are relative to its parent, as on a real toy.
"""
import math
from contextlib import contextmanager

import bpy
from mathutils import Matrix, Quaternion, Vector


def _fcurves(action):
    try:
        return list(action.fcurves)
    except AttributeError:
        pass
    out = []
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                out += list(bag.fcurves)
    return out


class Rig:
    def __init__(s, name='rig'):
        arm = bpy.data.armatures.new(name)
        s.arm = bpy.data.objects.new(name, arm)
        bpy.context.scene.collection.objects.link(s.arm)
        s.bones = {}
        s.actions = []
        s.points = []
        s._ease = {}
        s._edit(lambda eb: None)  # (creates the edit data once)

    def _edit(s, fn):
        bpy.ops.object.select_all(action='DESELECT')
        bpy.context.view_layer.objects.active = s.arm
        s.arm.select_set(True)
        bpy.ops.object.mode_set(mode='EDIT')
        r = fn(s.arm.data.edit_bones)
        bpy.ops.object.mode_set(mode='OBJECT')
        return r

    def bone(s, name, head, parent=None, length=4.0, tail=None):
        def mk(eb):
            b = eb.new(name)
            b.head = Vector(head)
            b.tail = Vector(tail) if tail else Vector(head) + Vector((0, 0, length))
            b.roll = 0
            if parent:
                b.parent = eb[parent]
                b.use_connect = False
        s._edit(mk)
        s.bones[name] = name
        return name

    def attach(s, ob, bone):
        """Parent a part to a bone, keeping it where it is."""
        ob.parent = s.arm
        ob.parent_type = 'BONE'
        ob.parent_bone = bone
        bpy.context.view_layer.update()
        b = s.arm.pose.bones[bone]
        # the bone-parent matrix is at the bone's tail
        M = s.arm.matrix_world @ b.matrix @ Matrix.Translation((0, b.bone.length, 0))
        ob.matrix_parent_inverse = M.inverted()
        ob.matrix_basis = Matrix.Identity(4)

    def point(s, name, at, bone=None):
        """A named gimmick point (pt_<name>) the game can read (src/figures/lowpix.js figurePoint)."""
        e = bpy.data.objects.new('pt_' + name, None)
        bpy.context.scene.collection.objects.link(e)
        e.location = Vector(at)
        if bone:
            s.attach(e, bone)
            e.matrix_basis = Matrix.Identity(4)
            bpy.context.view_layer.update()
            # keep the empty at `at`
            b = s.arm.pose.bones[bone]
            M = s.arm.matrix_world @ b.matrix @ Matrix.Translation((0, b.bone.length, 0))
            e.matrix_parent_inverse = M.inverted()
            e.matrix_basis = Matrix.Translation(Vector(at))
        s.points.append(e)
        return e

    @contextmanager
    def action(s, name):
        s.arm.animation_data_create()
        act = bpy.data.actions.new(name)
        act.use_fake_user = True
        s.arm.animation_data.action = act
        s.cur = act
        s._ease = {}
        for pb in s.arm.pose.bones:
            pb.rotation_mode = 'QUATERNION'
        yield act
        # interpolation per key: bezier (eased) unless the key asked for 'BACK' / 'LINEAR' / 'CONSTANT' / 'ELASTIC'
        for fc in _fcurves(act):
            bn = fc.data_path.split('"')[1] if '"' in fc.data_path else ''
            for kp in fc.keyframe_points:
                e = s._ease.get((bn, int(round(kp.co[0]))))
                if e:
                    kind, mode = e
                    kp.interpolation = kind
                    if kind in ('BACK', 'ELASTIC', 'BOUNCE', 'SINE', 'QUAD', 'CUBIC', 'EXPO'):
                        kp.easing = mode
                        if kind == 'BACK':
                            kp.back = 1.6
                else:
                    kp.interpolation = 'BEZIER'
            fc.update()
        s.actions.append(name)
        s.arm.animation_data.action = None
        for pb in s.arm.pose.bones:
            pb.rotation_quaternion = (1, 0, 0, 0)
            pb.location = (0, 0, 0)
            pb.scale = (1, 1, 1)

    def key(s, bone, frame, rot=None, move=None, scale=None, ease=None, quat=None):
        """Key a bone at `frame`: rot = (axis, degrees) or [(axis, deg), ...] about figure axes through the pivot;
        move = figure-space offset (mm); scale = uniform or (x, y, z) in bone space. The interpolation leaving this
        key: None (eased bezier), 'BACK' (overshoot), 'ELASTIC', 'BOUNCE', 'LINEAR' or 'CONSTANT'; ('BACK', 'EASE_IN')."""
        pb = s.arm.pose.bones[bone]
        R = pb.bone.matrix_local.to_3x3()  # armature (figure) space rest orientation
        Ri = R.inverted()
        q = Quaternion(quat) if quat is not None else Quaternion()
        if rot:
            rots = [rot] if isinstance(rot[0], str) else rot
            for ax, deg in rots:
                a = {'X': Vector((1, 0, 0)), 'Y': Vector((0, 1, 0)), 'Z': Vector((0, 0, 1))}[ax] if isinstance(ax, str) else Vector(ax)
                q = Quaternion(a.normalized(), math.radians(deg)) @ q
        # (as a quaternion product, not through a matrix: keeps a turn past 180 degrees going the way it was asked)
        ql = R.inverted().to_quaternion() @ q @ R.to_quaternion()
        prev = s._lastq.get(bone) if hasattr(s, '_lastq') else None
        if prev is not None and ql.dot(prev) < 0:
            ql.negate()
        s._lastq = getattr(s, '_lastq', {})
        s._lastq[bone] = ql.copy()
        pb.rotation_quaternion = ql
        pb.location = (Ri @ Vector(move)) if move else Vector((0, 0, 0))
        if scale is not None:
            pb.scale = (scale, scale, scale) if isinstance(scale, (int, float)) else scale
        else:
            pb.scale = (1, 1, 1)
        pb.keyframe_insert('rotation_quaternion', frame=frame)
        pb.keyframe_insert('location', frame=frame)
        pb.keyframe_insert('scale', frame=frame)
        if ease:
            s._ease[(bone, frame)] = (ease, 'EASE_OUT') if isinstance(ease, str) else tuple(ease)


def check_clip(R, parts, frames, action='gimmick', skip=(), tol=0.25):
    """Report parts passing through each other during a clip: for every frame, the vertices of each part's game mesh
    that sit more than `tol` mm inside another part, beyond those already inside it at rest (joints are sleeved).
    skip: pairs (a, b) never compared. Returns {frame: [(a, b, count, depth)]}."""
    import numpy as np
    from mathutils.bvhtree import BVHTree
    R.arm.animation_data.action = bpy.data.actions[action]
    sc = bpy.context.scene
    skip = {tuple(sorted(p)) for p in skip}

    def world(o):
        """BVH trees of each loose piece of a part (joined pieces overlap: inside one piece counts), world space."""
        import bmesh
        bm = bmesh.new()
        bm.from_mesh(o.data)
        bm.transform(o.matrix_world)
        bm.verts.ensure_lookup_table()
        V = [v.co.copy() for v in bm.verts]
        comp, seen = [], set()
        for f in bm.faces:
            if f.index in seen:
                continue
            stack, faces = [f], []
            seen.add(f.index)
            while stack:
                g = stack.pop()
                faces.append([v.index for v in g.verts])
                for e in g.edges:
                    for h in e.link_faces:
                        if h.index not in seen:
                            seen.add(h.index)
                            stack.append(h)
            comp.append(BVHTree.FromPolygons(V, faces))
        bm.free()
        return V, comp

    def inside(V, comps):
        from mathutils import Vector as _V
        dirs = (_V((0.0123, 0.0071, 1.0)).normalized(), _V((1.0, 0.0113, 0.0089)).normalized())
        out = []
        for v in V:
            depth = 0.0
            for T in comps:
                odd = 0
                for dvec in dirs:
                    n, o_ = 0, v.copy()
                    for _ in range(16):
                        hit = T.ray_cast(o_, dvec)
                        if hit[0] is None:
                            break
                        n += 1
                        o_ = hit[0] + dvec * 1e-4
                    odd += n % 2
                if odd == 2:
                    near = T.find_nearest(v)
                    depth = max(depth, (v - near[0]).length if near[0] is not None else 0.0)
            out.append(depth)
        return np.array(out)

    names = [p.low.name for p in parts]
    base = {}
    res = {}
    for f in [0] + list(frames):
        sc.frame_set(f)
        bpy.context.view_layer.update()
        W = {p.low.name: world(p.low) for p in parts}
        for a in names:
            for b in names:
                if a == b or tuple(sorted((a, b))) in skip:
                    continue
                d = inside(W[a][0], W[b][1])
                m = d > tol
                if f == 0:
                    base[(a, b)] = m
                    continue
                new = m & ~base[(a, b)]
                if new.sum() >= 2:
                    res.setdefault(f, []).append((a, b, int(new.sum()), round(float(d[new].max()), 2)))
    sc.frame_set(0)
    R.arm.animation_data.action = None
    return res
