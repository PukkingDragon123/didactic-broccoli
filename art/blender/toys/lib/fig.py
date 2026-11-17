"""A toy figure: its parts (game mesh + sculpt), one UV atlas, the bakes, the paint, the rig and the GLB.

    F = Fig('henshin', 'wani')
    F.part('arm', low, [high, ...], bone='jaw', kind='gloss')
    F.build(paint)              # UVs, bakes (normal, AO, sculpt position / normal / region / cavity), paint, materials
    F.rig ... keys ...          # (rig.py)
    F.export()                  # art/blender/toys/_build/<series>/<id>.glb + .meta.json (pack.mjs packs it)

Bakes run in Cycles from each sculpt onto its game mesh (selected to active), one part at a time into its own image,
then composite by each part's UV mask; the paint is computed per texel from the baked maps (paint.py).
"""
import json
import math
import os
import time

import bpy  # (first: it provides bmesh and mathutils)
import bmesh  # noqa: F401
import numpy as np

import tk

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
BUILD = os.path.join(ROOT, 'art', 'blender', 'toys', '_build')
DENS_MAX = 5.0  # px per mm: the line's texel density (a figure that packs finer is brought down to it)


class Part:
    def __init__(s, name, low, highs, bone, kind):
        s.name, s.low, s.highs, s.bone, s.kind = name, low, highs, bone, kind


class Fig:
    def __init__(s, series, fid, size=512, budget=1500):
        s.series, s.id, s.size, s.budget = series, fid, size, budget
        s.parts = []
        s.out = os.path.join(BUILD, series)
        os.makedirs(s.out, exist_ok=True)
        s.maps = {}
        s.meta = {'clips': {}, 'mats': {}, 'pts': {}}
        s.t0 = time.time()

    def log(s, *a):
        print(f'[{s.series}/{s.id} {time.time() - s.t0:6.1f}s]', *a, flush=True)

    # -------------------------------------------------------------- parts
    def part(s, name, low, highs, bone=None, kind='matte', sharp=None, uvw=1.0):
        """A part: its game mesh `low` (named `name`), its sculpt objects `highs` (any number, overlapping is fine)."""
        low.name = name
        low.data.name = name
        tk.smooth(low, sharp)
        for h in highs:
            tk.smooth(h)
            tk.clean_slots(h)
            if not h.data.materials:
                tk.set_region(h, name)
        s.parts.append(Part(name, low, highs, bone, kind))
        s.parts[-1].uvw = uvw  # texel density weight (small hidden mechanics get less)
        s.meta['mats'][name] = kind
        return low

    def tris(s):
        return sum(tk.tri_count(p.low) for p in s.parts)

    # -------------------------------------------------------------- UVs
    def unwrap(s, angle=66, margin=0.005):
        """One atlas for every part: islands cut where the surface turns more than `angle` (smart project), then
        re-unwrapped along those seams with minimum stretch (big, calm islands for pixel paint), one texel density
        everywhere, packed."""
        bpy.ops.object.select_all(action='DESELECT')
        lows = [p.low for p in s.parts]
        for o in lows:
            tk.triangulate(o)
            o.select_set(True)
        bpy.context.view_layer.objects.active = lows[0]
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=math.radians(angle), island_margin=margin, area_weight=0.0,
                                 correct_aspect=True, scale_to_bounds=False)
        bpy.ops.uv.select_all(action='SELECT')
        bpy.ops.uv.seams_from_islands(mark_seams=True)
        bpy.ops.uv.unwrap(method='MINIMUM_STRETCH', margin=margin)
        bpy.ops.uv.select_all(action='SELECT')
        bpy.ops.uv.average_islands_scale()
        bpy.ops.object.mode_set(mode='OBJECT')
        for p in s.parts:
            if p.uvw != 1.0:
                uv = p.low.data.uv_layers.active.data
                a = np.zeros(len(uv) * 2)
                uv.foreach_get('uv', a)
                uv.foreach_set('uv', a * p.uvw)
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.select_all(action='SELECT')
        bpy.ops.uv.pack_islands(rotate=True, margin=margin, shape_method='CONCAVE', margin_method='FRACTION')
        bpy.ops.object.mode_set(mode='OBJECT')
        bpy.ops.object.select_all(action='DESELECT')
        # texel density report (px per mm, area weighted)
        tot_a = tot_uv = 0.0
        for o in lows:
            me = o.data
            uv = me.uv_layers.active.data
            for p in me.polygons:
                tot_a += p.area
                l = list(p.loop_indices)
                a_, b_, c_ = (uv[i].uv for i in l[:3])
                tot_uv += abs((b_ - a_).cross(c_ - a_)) / 2
        s.density = s.size * math.sqrt(tot_uv / max(tot_a, 1e-9))
        if s.density > DENS_MAX:  # one texel density across the line: a small figure does not get finer pixels
            k = DENS_MAX / s.density
            for o in lows:
                uv = o.data.uv_layers.active.data
                a = np.zeros(len(uv) * 2)
                uv.foreach_get('uv', a)
                uv.foreach_set('uv', a * k)
            tot_uv *= k * k
            s.density = DENS_MAX
        areas = {}
        for o in lows:
            uv = o.data.uv_layers.active.data
            ua = sum(abs((uv[p.loop_indices[1]].uv - uv[p.loop_indices[0]].uv).cross(uv[p.loop_indices[2]].uv - uv[p.loop_indices[0]].uv)) / 2 for p in o.data.polygons)
            ar = sum(p.area for p in o.data.polygons)
            areas[o.name] = f'{ar:.0f}mm2 {s.size * math.sqrt(ua / max(ar, 1e-9)):.1f}px/mm'
        us = np.array([l.uv for o in lows for l in o.data.uv_layers.active.data])
        s.log('uv bounds', us.min(0), us.max(0))
        s.log(f'UV texel density {s.density:.2f} px/mm, UV coverage {tot_uv:.2f}, area {tot_a:.0f} mm2', areas)

    # -------------------------------------------------------------- bakes
    def _img(s, name, float_buf=True):
        im = bpy.data.images.get(name)
        if im:
            bpy.data.images.remove(im)
        im = bpy.data.images.new(name, s.size, s.size, alpha=True, float_buffer=float_buf)
        im.colorspace_settings.name = 'Non-Color'
        im.generated_color = (0, 0, 0, 0)
        return im

    def _region_ids(s):
        names = []
        for p in s.parts:
            for h in p.highs:
                for m in h.data.materials:
                    n = m.name[2:]
                    if n not in names:
                        names.append(n)
        return names

    def _setup_high_mats(s, mode):
        """mode: 'reg' (region id), 'pos' (figure-space position, normalised), 'cav' (pointiness), 'white'."""
        lo, hi = s.bbox
        for i, n in enumerate(s.regions):
            m = tk.region_mat(n)
            m.use_nodes = True
            nt = m.node_tree
            nt.nodes.clear()
            out = nt.nodes.new('ShaderNodeOutputMaterial')
            em = nt.nodes.new('ShaderNodeEmission')
            nt.links.new(em.outputs[0], out.inputs[0])
            if mode == 'reg':
                em.inputs['Color'].default_value = ((i + 1) / 255.0, 0, 0, 1)
            elif mode == 'pos':
                g = nt.nodes.new('ShaderNodeNewGeometry')
                a = nt.nodes.new('ShaderNodeVectorMath')
                a.operation = 'SUBTRACT'
                a.inputs[1].default_value = tuple(lo)
                b = nt.nodes.new('ShaderNodeVectorMath')
                b.operation = 'DIVIDE'
                b.inputs[1].default_value = tuple(hi - lo)
                nt.links.new(g.outputs['Position'], a.inputs[0])
                nt.links.new(a.outputs[0], b.inputs[0])
                nt.links.new(b.outputs[0], em.inputs['Color'])
            elif mode == 'cav':
                g = nt.nodes.new('ShaderNodeNewGeometry')
                nt.links.new(g.outputs['Pointiness'], em.inputs['Color'])
            else:
                em.inputs['Color'].default_value = (1, 1, 1, 1)

    def _low_mat(s, p, img):
        m = bpy.data.materials.get('B:' + p.name) or bpy.data.materials.new('B:' + p.name)
        m.use_nodes = True
        nt = m.node_tree
        nt.nodes.clear()
        out = nt.nodes.new('ShaderNodeOutputMaterial')
        em = nt.nodes.new('ShaderNodeEmission')
        em.inputs['Color'].default_value = (1, 1, 1, 1)
        nt.links.new(em.outputs[0], out.inputs[0])
        t = nt.nodes.new('ShaderNodeTexImage')
        t.image = img
        t.interpolation = 'Closest'
        nt.nodes.active = t
        p.low.data.materials.clear()
        p.low.data.materials.append(m)

    def _px(s, img, ch=4):
        a = np.empty(s.size * s.size * 4, dtype=np.float32)
        img.pixels.foreach_get(a)
        return a.reshape(s.size, s.size, 4)[:, :, :ch].copy()

    def bake(s, ao_samples=96, ao_dist=7.0, extrusion=1.2, reuse=False):
        """Bake every part. reuse: load the last bake of this figure (same geometry and UVs: paint iteration)."""
        cache = os.path.join(s.out, s.id + '_maps.npz')
        s.regions = s._region_ids()
        import hashlib
        h = hashlib.sha1()
        for p in s.parts:
            a = np.zeros(len(p.low.data.uv_layers.active.data) * 2, np.float32)
            p.low.data.uv_layers.active.data.foreach_get('uv', a)
            h.update(np.round(a, 5).tobytes())
            h.update(np.round(tk.verts(p.low), 3).tobytes())
        uvkey = h.hexdigest()
        if reuse and os.path.exists(cache) and str(np.load(cache, allow_pickle=True).get('uvkey', '')) != uvkey:
            s.log('the bake cache is for other UVs or geometry: baking again')
            reuse = False
        if reuse and os.path.exists(cache):
            z = np.load(cache, allow_pickle=True)
            s.maps = {k: z[k] for k in z.files if k not in ('regions', 'uvkey')}
            s.regions = list(z['regions'])
            s.region_index = {nm: i for i, nm in enumerate(s.regions)}
            s.log('reused the bake', cache)
            return
        sc = bpy.context.scene
        sc.render.engine = 'CYCLES'
        sc.cycles.device = 'CPU'
        sc.render.bake.use_selected_to_active = True
        if not sc.world:
            sc.world = bpy.data.worlds.new('w')
        sc.world.light_settings.distance = ao_dist
        s.extrusion = extrusion
        s.regions = s._region_ids()
        allh = [h for p in s.parts for h in p.highs]
        V = np.concatenate([tk.verts(h) for h in allh])
        s.bbox = (V.min(0) - 1, V.max(0) + 1)
        n = s.size
        acc = {k: np.zeros((n, n, c), np.float32) for k, c in (('nrm', 3), ('onrm', 3), ('ao', 1), ('pos', 3), ('reg', 1), ('cav', 1))}
        part = np.full((n, n), -1, np.int32)
        lows = [p.low for p in s.parts]
        for i, p in enumerate(s.parts):
            # only this part's game mesh renders (the other game meshes would shadow the AO); every sculpt stays
            for o in lows:
                o.hide_render = o is not p.low
            img = s._img('bake_tmp')
            s._low_mat(p, img)

            def run(kind, mode=None, space='TANGENT', s2a=True, samples=1):
                if mode:
                    s._setup_high_mats(mode)
                img.pixels.foreach_set(np.zeros(n * n * 4, np.float32))
                bpy.ops.object.select_all(action='DESELECT')
                if s2a:
                    for h in p.highs:
                        h.select_set(True)
                p.low.select_set(True)
                bpy.context.view_layer.objects.active = p.low
                sc.cycles.samples = samples
                bpy.ops.object.bake(type=kind, use_selected_to_active=s2a, cage_extrusion=s.extrusion,
                                    max_ray_distance=s.extrusion * 2.5, normal_space=space, margin=0, use_clear=False,
                                    target='IMAGE_TEXTURES')
                return s._px(img)

            mask = run('EMIT', 'white', s2a=False)[:, :, 0] > 0.5  # (the game mesh's own coverage)
            part[mask] = i
            got = run('NORMAL', space='TANGENT')
            acc['nrm'][mask] = got[mask][:, :3]
            got = run('NORMAL', space='OBJECT')
            acc['onrm'][mask] = got[mask][:, :3]
            got = run('EMIT', 'pos')
            acc['pos'][mask] = got[mask][:, :3]
            hit = got[:, :, 3] > 0.5
            got = run('EMIT', 'reg')
            acc['reg'][mask] = got[mask][:, :1]
            got = run('EMIT', 'cav')
            acc['cav'][mask] = got[mask][:, :1]
            got = run('AO', samples=ao_samples)
            acc['ao'][mask] = got[mask][:, :1]
            miss = mask & ~hit
            s.log(f'baked {p.name}: {mask.sum()} px, {miss.sum()} missed rays')
        for o in lows:
            o.hide_render = False
        lo, hi = s.bbox
        s.maps = {
            'part': part,
            'mask': part >= 0,
            'nrm': acc['nrm'],
            'on': acc['onrm'] * 2 - 1,
            'pos': lo + acc['pos'] * (hi - lo),
            'reg': np.rint(acc['reg'][:, :, 0] * 255).astype(np.int32) - 1,
            'cav': acc['cav'][:, :, 0],
            'ao': acc['ao'][:, :, 0],
        }
        # texels the rays missed (a gap between game mesh and sculpt): fill from their neighbours in the island
        bad = s.maps['mask'] & ((s.maps['reg'] < 0) | (np.linalg.norm(s.maps['on'], axis=2) < 0.5))
        if bad.any():
            s.log(f'filling {bad.sum()} missed texels')
            for k in ('nrm', 'on', 'pos', 'reg', 'cav', 'ao'):
                s.maps[k] = fill(s.maps[k], s.maps['mask'] & ~bad, s.maps['mask'])
        on = s.maps['on']
        s.maps['on'] = on / np.maximum(np.linalg.norm(on, axis=2), 1e-6)[:, :, None]
        s.region_index = {nm: i for i, nm in enumerate(s.regions)}
        np.savez_compressed(cache, regions=np.array(s.regions), uvkey=np.array(uvkey), **s.maps)

    # -------------------------------------------------------------- paint, materials
    def finish(s, rgb, roughness=0.42):
        """Write the painted albedo and the normal map, and give every game mesh the one figure material."""
        n = s.size
        mask = s.maps['mask']
        col = dilate(np.clip(rgb, 0, 1), mask, 10)
        nrm = dilate(s.maps['nrm'], mask, 10)
        nrm[~dilate_mask(mask, 10)] = (0.5, 0.5, 1.0)
        base = os.path.join(s.out, s.id)
        s.albedo = save_png(col, base + '_col.png', 'sRGB', n)
        s.normal = save_png(nrm, base + '_nrm.png', 'Non-Color', n)
        m = bpy.data.materials.get('toy_' + s.id) or bpy.data.materials.new('toy_' + s.id)
        m.use_nodes = True
        m.use_backface_culling = True  # (glTF doubleSided false: the game adds no back faces)
        nt = m.node_tree
        nt.nodes.clear()
        out = nt.nodes.new('ShaderNodeOutputMaterial')
        bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
        bsdf.inputs['Roughness'].default_value = roughness
        nt.links.new(bsdf.outputs[0], out.inputs[0])
        t = nt.nodes.new('ShaderNodeTexImage')
        t.image = s.albedo
        t.interpolation = 'Closest'
        nt.links.new(t.outputs['Color'], bsdf.inputs['Base Color'])
        tn = nt.nodes.new('ShaderNodeTexImage')
        tn.image = s.normal
        tn.interpolation = 'Closest'
        nm = nt.nodes.new('ShaderNodeNormalMap')
        nt.links.new(tn.outputs['Color'], nm.inputs['Color'])
        nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
        for p in s.parts:
            p.low.data.materials.clear()
            p.low.data.materials.append(m)
        s.material = m

    def drop_highs(s):
        for p in s.parts:
            for h in p.highs:
                tk.delete(h)
            p.highs = []

    # -------------------------------------------------------------- export
    def export(s, rig=None, extra_meta=None):
        bpy.ops.object.select_all(action='DESELECT')
        for p in s.parts:
            p.low.select_set(True)
        if rig:
            rig.arm.select_set(True)
            for e in rig.points:
                e.select_set(True)
        bpy.context.view_layer.objects.active = s.parts[0].low
        glb = os.path.join(s.out, s.id + '.glb')
        bpy.context.scene.frame_set(0)
        bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True, export_apply=True,
                                  export_yup=True, export_tangents=True, export_normals=True, export_texcoords=True,
                                  export_materials='EXPORT', export_image_format='AUTO', export_animations=bool(rig and rig.actions),
                                  export_animation_mode='ACTIONS', export_force_sampling=True, export_frame_step=1,
                                  export_anim_slide_to_zero=True, export_reset_pose_bones=True, export_def_bones=False,
                                  export_leaf_bone=False, export_skins=False, export_morph=False, export_lights=False,
                                  export_cameras=False, export_extras=False, export_optimize_animation_size=False,
                                  export_rest_position_armature=True)
        meta = dict(s.meta)
        meta['tris'] = s.tris()
        if rig:
            meta['clips'] = {a: a for a in rig.actions}
            meta['pts'] = {e.name[3:]: e.name for e in rig.points}
        meta.update(extra_meta or {})
        json.dump(meta, open(os.path.join(s.out, s.id + '.meta.json'), 'w'), indent=1)
        s.log(f'exported {glb}: {meta["tris"]} tris')
        return glb


# ------------------------------------------------------------------ image helpers
def save_png(arr, path, space, n):
    im = bpy.data.images.get(os.path.basename(path))
    if im:
        bpy.data.images.remove(im)
    im = bpy.data.images.new(os.path.basename(path), n, n, alpha=False, float_buffer=False)
    im.colorspace_settings.name = space
    a = np.ones((n, n, 4), np.float32)
    a[:, :, :3] = arr[:, :, :3]
    im.pixels.foreach_set(a.reshape(-1))
    im.filepath_raw = path
    im.file_format = 'PNG'
    im.save()
    return im


def _shift(a, dy, dx):
    out = np.roll(a, (dy, dx), axis=(0, 1))
    return out


def fill(arr, good, region, iters=64):
    """Fill the texels of `region` that are not `good` from their good neighbours (nearest first)."""
    arr = arr.copy()
    good = good.copy()
    for _ in range(iters):
        todo = region & ~good
        if not todo.any():
            break
        acc = np.zeros(arr.shape, np.float64)
        cnt = np.zeros(arr.shape[:2], np.float64)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            g = _shift(good, dy, dx)
            v = _shift(arr, dy, dx)
            if arr.ndim == 3:
                acc[g] += v[g]
            else:
                acc[g] += v[g]
            cnt += g
        new = todo & (cnt > 0)
        if arr.ndim == 3:
            arr[new] = (acc[new] / cnt[new][:, None]).astype(arr.dtype) if arr.dtype != np.int32 else np.rint(acc[new] / cnt[new][:, None]).astype(np.int32)
        else:
            arr[new] = (acc[new] / cnt[new]).astype(arr.dtype) if arr.dtype != np.int32 else _mode_fill(arr, good, new)
        good = good | new
    return arr


def _mode_fill(arr, good, new):
    """Integer maps (region ids): take any good neighbour's value (no averaging)."""
    out = arr[new].copy()
    ys, xs = np.nonzero(new)
    for k, (y, x) in enumerate(zip(ys, xs)):
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            yy, xx = (y - dy) % arr.shape[0], (x - dx) % arr.shape[1]
            if good[yy, xx]:
                out[k] = arr[yy, xx]
                break
    return out


def dilate_mask(mask, px):
    m = mask.copy()
    for _ in range(px):
        m = m | _shift(m, 1, 0) | _shift(m, -1, 0) | _shift(m, 0, 1) | _shift(m, 0, -1)
    return m


def dilate(arr, mask, px):
    """Bleed the islands `px` texels into the gutters (mipmaps and seams never sample the empty background)."""
    return fill(arr, mask, dilate_mask(mask, px), iters=px)
