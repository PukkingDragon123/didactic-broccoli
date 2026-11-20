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

import facet
import tk

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
BUILD = os.environ.get('GG_BUILD_ROOT') or os.path.join(ROOT, 'art', 'blender', 'toys', '_build')  # (GG_BUILD_ROOT: an isolated build, e.g. faces.py)
DENS_MAX = 5.6  # px per mm: the line's texel density (a figure that packs finer is brought down to it)


class Part:
    def __init__(s, name, low, highs, bone, kind):
        s.name, s.low, s.highs, s.bone, s.kind = name, low, highs, bone, kind


class Fig:
    def __init__(s, series, fid, size=512, budget=1500):
        s.facet = facet.ON = facet.enabled(series)  # the faceted low-poly style (lib/facet.py, FACET.md)
        facet.FIG = s if s.facet else None
        s._trimmed = False
        if s.facet and size == 512:
            size = facet.SIZE
        s.series, s.id, s.size, s.budget = series, fid, size, budget
        s.parts = []
        s.out = os.path.join(BUILD, series)
        os.makedirs(s.out, exist_ok=True)
        s.maps = {}
        s.meta = {'clips': {}, 'mats': {}, 'pts': {}}
        s.t0 = time.time()
        # a figure variant's repaint (GIMMICKS.md, "Variants"): make.sh --faces sets GG_VARIANT (JSON: texture, face);
        # the figure paints as usual with that face expression ('auto': one picked per figure) and finish() writes
        # only <id>.<texture>_col.png (same unwrap: --repaint), no GLB
        s.variant = json.loads(os.environ['GG_VARIANT']) if os.environ.get('GG_VARIANT') else None
        if s.variant:
            import face
            import zlib
            e = s.variant.get('face')
            face.EXPR = ('happy', 'sleepy', 'wink')[zlib.crc32(f'{series}/{fid}'.encode()) % 3] if e == 'auto' else e
            s.variant['face'] = face.EXPR
            s.log('variant face', face.EXPR)

    def log(s, *a):
        print(f'[{s.series}/{s.id} {time.time() - s.t0:6.1f}s]', *a, flush=True)

    # -------------------------------------------------------------- parts
    def part(s, name, low, highs, bone=None, kind='matte', sharp=None, uvw=1.0):
        """A part: its game mesh `low` (named `name`), its sculpt objects `highs` (any number, overlapping is fine)."""
        low.name = name
        low.data.name = name
        if s.facet:  # a deliberate low-poly, flat shaded (each face its own normal: crisp facets)
            if not low.get('facet'):
                facet.reduce(low, facet.budget(tk.tri_count(low)), cap=tk.tri_count(low))
            facet.flat(low)
        else:
            tk.smooth(low, sharp)
        for h in highs:
            tk.smooth(h)
            tk.clean_slots(h)
            if not h.data.materials:
                tk.set_region(h, name)
        s.parts.append(Part(name, low, highs, bone, kind))
        s.parts[-1].uvw = uvw  # texel density weight (small hidden mechanics get less)
        s.meta['mats'][name] = 'gloss' if (s.facet and kind == 'metal') else kind  # (facet: metal is painted chrome;
        # a mirror finish on flat facets would only flash black and white)
        return low

    def tris(s):
        return sum(tk.tri_count(p.low) for p in s.parts)

    def secret(s):
        """Is this figure its series' secret (src/data/series/<series>.js)? (a secret may carry more detail)"""
        import re
        try:
            src = open(os.path.join(ROOT, 'src', 'data', 'series', s.series + '.js'), encoding='utf8').read()
        except OSError:
            return False
        m = re.search(r"id: '" + re.escape(s.id) + r"'[^}]*?rarity: '(\w+)'", src)
        return bool(m and m.group(1) == 'secret')

    def facet_trim(s):
        """Facet mode: bring the figure under its budget once every part is in (unwrap and the clip check call it)."""
        if s.facet and not s._trimmed:
            s._trimmed = True
            facet.trim(s.parts, log=s.log, secret=s.secret())

    # -------------------------------------------------------------- UVs
    def unwrap(s, angle=None, margin=None):
        """One atlas for every part: islands cut where the surface turns more than `angle` (smart project), then
        re-unwrapped along those seams with minimum stretch (big, calm islands for pixel paint), one texel density
        everywhere except the faces nobody sees on a shelf (undersides: half density) and small hidden mechanics
        (Part.uvw), packed tight (1.5 px gutters: the paint is bled into them)."""
        angle = angle or float(os.environ.get('UV_ANGLE', 66))
        margin = margin or float(os.environ.get('UV_MARGIN', 0.002))
        s.facet_trim()
        bpy.ops.object.select_all(action='DESELECT')
        lows = [p.low for p in s.parts]
        for o in lows:
            tk.triangulate(o)
            o.select_set(True)
        if s._uv_cached(lows):
            return
        bpy.context.view_layer.objects.active = lows[0]
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=math.radians(angle), island_margin=margin, area_weight=0.0,
                                 correct_aspect=True, scale_to_bounds=False)
        bpy.ops.uv.select_all(action='SELECT')
        bpy.ops.uv.seams_from_islands(mark_seams=True)
        if os.environ.get('UVMODE', 'conformal') == 'stretch':
            bpy.ops.uv.unwrap(method='MINIMUM_STRETCH', margin=margin)
        elif os.environ.get('UVMODE', 'conformal') == 'conformal':
            bpy.ops.uv.unwrap(method='CONFORMAL', margin=margin)
        bpy.ops.uv.select_all(action='SELECT')
        bpy.ops.uv.average_islands_scale()
        bpy.ops.object.mode_set(mode='OBJECT')
        for p in s.parts:
            _weight_islands(p.low, p.uvw)
            if s.facet:
                facet.flat(p.low)
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.select_all(action='SELECT')
        for _ in range(int(os.environ.get('UV_PASSES', 1))):
            bpy.ops.uv.pack_islands(rotate=True, rotate_method=os.environ.get('UV_ROT', 'ANY'), margin=margin,
                                    shape_method=os.environ.get('UV_SHAPE', 'CONCAVE'), margin_method='FRACTION')
        bpy.ops.object.mode_set(mode='OBJECT')
        bpy.ops.object.select_all(action='DESELECT')
        # texel density report (px per mm, area weighted)
        tot_a = tot_uv = vis_a = vis_uv = 0.0
        for pt in s.parts:
            me = pt.low.data
            uv = me.uv_layers.active.data
            for p in me.polygons:
                l = list(p.loop_indices)
                a_, b_, c_ = (uv[i].uv for i in l[:3])
                ua = abs((b_ - a_).cross(c_ - a_)) / 2
                tot_a += p.area
                tot_uv += ua
                if pt.uvw == 1.0 and p.normal.z >= -0.6:  # what you see of the figure on a shelf
                    vis_a += p.area
                    vis_uv += ua
        s.density = s.size * math.sqrt(tot_uv / max(tot_a, 1e-9))
        s.density_seen = s.size * math.sqrt(vis_uv / max(vis_a, 1e-9))
        dmax = DENS_MAX * s.size / 512  # (the faceted style's 1024 atlas: double the density)
        if s.density_seen > dmax:  # one texel density across the line: a small figure does not get finer pixels
            k = dmax / s.density_seen
            s.density_seen = dmax
            for o in lows:
                uv = o.data.uv_layers.active.data
                a = np.zeros(len(uv) * 2)
                uv.foreach_get('uv', a)
                uv.foreach_set('uv', a * k)
            tot_uv *= k * k
            s.density *= k
        areas = {}
        for o in lows:
            uv = o.data.uv_layers.active.data
            ua = sum(abs((uv[p.loop_indices[1]].uv - uv[p.loop_indices[0]].uv).cross(uv[p.loop_indices[2]].uv - uv[p.loop_indices[0]].uv)) / 2 for p in o.data.polygons)
            ar = sum(p.area for p in o.data.polygons)
            areas[o.name] = f'{ar:.0f}mm2 {s.size * math.sqrt(ua / max(ar, 1e-9)):.1f}px/mm'
        us = np.array([l.uv for o in lows for l in o.data.uv_layers.active.data])
        s.log('uv bounds', us.min(0), us.max(0))
        s._uv_save(lows)
        s.log(f'UV texel density {s.density_seen:.2f} px/mm on what you see ({s.density:.2f} overall), UV coverage {tot_uv:.2f}, area {tot_a:.0f} mm2', areas)
        if os.environ.get('UVONLY'):
            raise SystemExit(0)

    @staticmethod
    def _loop_keys(o):
        """Each loop's (vertex position, face centre), rounded: matches the loops of the same geometry built again,
        whatever order subdivision and collapse left the vertices and faces in."""
        me = o.data
        V = tk.verts(o)
        L = np.zeros(len(me.loops), np.int64)
        me.loops.foreach_get('vertex_index', L)
        C = np.zeros(len(me.polygons) * 3)
        me.polygons.foreach_get('center', C)
        S = np.zeros(len(me.polygons), np.int64)
        me.polygons.foreach_get('loop_start', S)
        T = np.zeros(len(me.polygons), np.int64)
        me.polygons.foreach_get('loop_total', T)
        fc = np.repeat(C.reshape(-1, 3), T, axis=0)
        return np.round(np.concatenate([V[L], fc], 1), 2)

    def _uv_save(s, lows):
        d = {'density': np.array([s.density_seen, s.density])}
        for o in lows:
            a = np.zeros(len(o.data.uv_layers.active.data) * 2, np.float32)
            o.data.uv_layers.active.data.foreach_get('uv', a)
            d['uv:' + o.name] = a
            d['k:' + o.name] = s._loop_keys(o).astype(np.float32)
        np.savez_compressed(os.path.join(s.out, s.id + '_uv.npz'), **d)

    def _uv_cached(s, lows):
        """--repaint: the last unwrap of the same geometry (UV packing is slow and not repeatable, so without this
        the bake cache could never be reused)."""
        import sys
        path = os.path.join(s.out, s.id + '_uv.npz')
        if '--repaint' not in sys.argv or not os.path.exists(path):
            return False
        z = np.load(path)
        got = {}
        for o in lows:
            if 'k:' + o.name not in z.files:
                break
            old = {}
            for i, k in enumerate(np.round(z['k:' + o.name].astype(np.float64), 2)):
                old.setdefault(tuple(k), []).append(i)
            idx = [old[k].pop(0) if old.get(k) else None for k in map(tuple, s._loop_keys(o))]
            if None in idx or any(old.values()):
                break
            got[o.name] = z['uv:' + o.name].reshape(-1, 2)[idx]
        else:
            for o in lows:
                if not o.data.uv_layers:
                    o.data.uv_layers.new()
                o.data.uv_layers.active.data.foreach_set('uv', got[o.name].reshape(-1))
                if s.facet:
                    facet.flat(o)
            s.density_seen, s.density = (float(v) for v in z['density'])
            s.log('reused the last unwrap')
            return True
        s.log('the geometry changed since the last unwrap: unwrapping again')
        return False

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

    def bake(s, ao_samples=96, ao_dist=7.0, extrusion=1.2, reuse=False, ao_by_bone=False, ao_also=None):
        """Bake every part. reuse: load the last bake of this figure (same geometry and UVs: paint iteration).
        ao_by_bone: a part's AO sees only the sculpts of the parts on its own bone (plus ao_also {part: [parts]}), so
        nothing that moves carries another part's baked shadow (from B's teruteru kit)."""
        cache = os.path.join(s.out, s.id + '_maps.npz')
        s.regions = s._region_ids()
        import hashlib
        h = hashlib.sha1()
        VV = []
        for p in s.parts:
            a = np.zeros(len(p.low.data.uv_layers.active.data) * 2, np.float32)
            p.low.data.uv_layers.active.data.foreach_get('uv', a)
            h.update(np.round(a, 5).tobytes())
            VV.append(tk.verts(p.low))
        VV = np.concatenate(VV).astype(np.float32)
        h.update(str(VV.shape).encode())
        uvkey = h.hexdigest()
        if reuse and os.path.exists(cache):
            # (the same UVs, and the same geometry to 0.02 mm: a rebuild's float noise in the collapse must not force a
            # new bake, so the vertices are compared with a tolerance, not hashed)
            z = np.load(cache, allow_pickle=True)
            same = str(z.get('uvkey', '')) == uvkey and 'verts' in z.files and z['verts'].shape == VV.shape
            if not (same and float(np.abs(z['verts'] - VV).max()) < 0.02):
                s.log('the bake cache is for other UVs or geometry: baking again')
                reuse = False
        if reuse and os.path.exists(cache):
            z = np.load(cache, allow_pickle=True)
            s.maps = {k: z[k] for k in z.files if k not in ('regions', 'uvkey', 'verts')}
            pz = s.maps['pos']  # (cached as int16 5 um steps (float32 in older caches): see the save below)
            s.maps['pos'] = pz / 200.0 if pz.dtype == np.int16 else pz.astype(np.float64)
            for k in ('on', 'nrm', 'cav', 'ao'):
                s.maps[k] = s.maps[k].astype(np.float32)
            s.regions = list(z['regions'])
            s.region_index = {nm: i for i, nm in enumerate(s.regions)}
            s.log('reused the bake', cache)
            s._facet_maps()
            return
        sc = bpy.context.scene
        sc.render.engine = 'CYCLES'
        sc.cycles.device = 'CPU'
        sc.render.bake.use_selected_to_active = True
        if not sc.world:
            sc.world = bpy.data.worlds.new('w')
        sc.world.light_settings.distance = ao_dist
        s.extrusion = max(extrusion, 3.0) if s.facet else extrusion  # (a coarse facet mesh strays further from the sculpt)
        s.regions = s._region_ids()
        allh = [h for p in s.parts for h in p.highs]
        V = np.concatenate([tk.verts(h) for h in allh])
        s.bbox = (V.min(0) - 1, V.max(0) + 1)
        n = s.size
        acc = {k: np.zeros((n, n, c), np.float32) for k, c in (('nrm', 3), ('onrm', 3), ('ao', 1), ('pos', 3), ('reg', 1), ('cav', 1))}
        part = np.full((n, n), -1, np.int32)
        lows = [p.low for p in s.parts]
        if s.facet:  # (bake through a smooth cage: flat normals split the cage at every facet edge and rays miss)
            for o in lows:
                o.data.shade_smooth()
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
            if not s.facet:  # (facet: no normal map, it would smooth the facets away)
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
            hid = []
            if ao_by_bone:  # (only the sculpts that move with this part cast its AO)
                friends = {q.name for q in s.parts if q.bone == p.bone} | set((ao_also or {}).get(p.name, ()))
                for q in s.parts:
                    if q.name not in friends:
                        for h in q.highs:
                            hid.append((h, h.hide_render))
                            h.hide_render = True
            try:
                got = run('AO', samples=ao_samples)
            finally:
                for h, v in hid:
                    h.hide_render = v
            acc['ao'][mask] = got[mask][:, :1]
            miss = mask & ~hit
            s.log(f'baked {p.name}: {mask.sum()} px, {miss.sum()} missed rays')
        for o in lows:
            o.hide_render = False
            if s.facet:
                facet.flat(o)
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
        s.maps['missed'] = bad
        if bad.any() and not s.facet:  # (facet: refilled from their 3D neighbours, _facet_maps)
            s.log(f'filling {bad.sum()} missed texels')
            for k in ('nrm', 'on', 'pos', 'reg', 'cav', 'ao'):
                s.maps[k] = fill(s.maps[k], s.maps['mask'] & ~bad, s.maps['mask'])
        on = s.maps['on']
        s.maps['on'] = on / np.maximum(np.linalg.norm(on, axis=2), 1e-6)[:, :, None]
        s.region_index = {nm: i for i, nm in enumerate(s.regions)}
        # (the cache at 2048 is big: the maps are rounded to what the cache keeps, float16 normals / AO / cavity and
        # positions to 5 um, before anything is painted, so a --repaint from the cache paints exactly the same)
        for k in ('on', 'nrm', 'cav', 'ao'):
            s.maps[k] = s.maps[k].astype(np.float16).astype(np.float32)
        s.maps['pos'] = np.round(s.maps['pos'] * 200.0) / 200.0  # (positions to 5 um: int16 in the cache)
        small = {k: (v.astype(np.float16) if k in ('on', 'nrm', 'cav', 'ao') else np.round(v * 200.0).astype(np.int16) if k == 'pos' else v) for k, v in s.maps.items()}
        np.savez_compressed(cache, regions=np.array(s.regions), uvkey=np.array(uvkey), verts=VV, **small)
        s._facet_maps()

    def _facet_maps(s):
        """Facet mode: per texel the facet, its rim along facet edges, the distance to a hard edge, the texel density
        and whether it is metal (lib/facet.py maps; the paint's brushwork and rims use them)."""
        if not s.facet:
            return
        fm = facet.maps(s.parts, s.size)
        mask = s.maps['mask']
        got = fm['fid'] >= 0
        for k in ('fid', 'ppmm'):
            fm[k] = fill(fm[k], got & mask, mask, iters=8)
        fm['rim'][~got] = 0
        fm['hard'][~got] = 99.0
        missed = s.maps.get('missed')
        if missed is not None:
            s.maps['lpos'] = fm['lpos']
            k = facet.refill(s.maps, missed, got)
            rest = missed & ~got  # (a few edge texels off every triangle's centre: from their island neighbours)
            if rest.any():
                for key in ('on', 'pos', 'reg', 'cav', 'ao'):
                    s.maps[key] = fill(s.maps[key], mask & ~rest, mask)
            on = s.maps['on']
            s.maps['on'] = on / np.maximum(np.linalg.norm(on, axis=2), 1e-6)[:, :, None]
            s.log(f'facet: {k} missed texels refilled from their 3D neighbours, {int(rest.sum())} from the island')
        fm.pop('lpos', None)
        part = s.maps['part']
        fm['metal'] = np.isin(part, [i for i, p in enumerate(s.parts) if p.kind == 'metal']) & mask
        med = float(np.median(fm['ppmm'][mask & (fm['ppmm'] > 0)])) if (mask & (fm['ppmm'] > 0)).any() else 10.0
        fm['ppmm'] = np.where(fm['ppmm'] > 0, fm['ppmm'], med).astype(np.float32)
        s.maps.update(fm)
        s.log(f'facet maps: {int(got.sum())} texels on {int(fm["fid"].max()) + 1} facets, rims {int((fm["rim"] > 0).sum())} lit / {int((fm["rim"] < 0).sum())} dark')

    # -------------------------------------------------------------- paint, materials
    def finish(s, rgb, roughness=0.42):
        """Write the painted albedo and the normal map, and give every game mesh the one figure material."""
        n = s.size
        mask = s.maps['mask']
        if s.variant:  # a variant's repaint: write its atlas and stop (the GLB stays the standard figure's)
            import sys
            out = os.path.join(s.out, f"{s.id}.{s.variant['texture']}_col.png")
            save_png(dilate(np.clip(rgb, 0, 1), mask, 10), out, 'sRGB', n)
            s.log('variant', s.variant['texture'], '->', out)
            sys.exit(0)
        if os.environ.get('GG_FACE_ALSO'):
            s._face_also(mask, n)
        col = dilate(np.clip(rgb, 0, 1), mask, 10)
        base = os.path.join(s.out, s.id)
        s.albedo = save_png(col, base + '_col.png', 'sRGB', n)
        s.normal = None
        if not s.facet:  # (facet: no normal map)
            nrm = dilate(s.maps['nrm'], mask, 10)
            nrm[~dilate_mask(mask, 10)] = (0.5, 0.5, 1.0)
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
        if s.normal:
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
        shot = os.environ.get('GG_FACE_SHOT')
        if shot:  # (art/blender/toys/faces.py: a front 3/4 look at the painted figure, then stop)
            lows = [p.low for p in s.parts]
            V = np.concatenate([tk.verts(o) for o in lows])
            c, D = (V.min(0) + V.max(0)) / 2, float(np.ptp(V, axis=0).max()) * 1.35
            c[2] += 0.12 * float(np.ptp(V[:, 2]))
            tk.preview(shot, lows, cam=((c[0] + 0.4 * D, c[1] - D, c[2] + 0.28 * D), tuple(c)), res=(360, 360), samples=24)
            raise SystemExit(0)

    def drop_highs(s):
        for p in s.parts:
            for h in p.highs:
                tk.delete(h)
            p.highs = []

    # -------------------------------------------------------------- does it stand?
    def stability(s, contact=0.4):
        """How securely the figure stands at rest: the margin (mm) from its centre of mass (area-weighted over the game
        meshes) to the edge of its footprint (the convex hull of everything within `contact` mm of the floor), seen from
        above. Positive: inside, it stands; negative: it falls over. export() logs it with the tipping angle (the audit,
        art/lowpix/figures/audit.py, wants the figure to lean 8 degrees before it tips)."""
        T, A = [], []
        for p in s.parts:
            M = np.array(p.low.matrix_world)
            V = tk.verts(p.low) @ M[:3, :3].T + M[:3, 3]
            F = [list(f.vertices) for f in p.low.data.polygons]
            for f in F:
                for k in range(1, len(f) - 1):
                    a, b, c = V[f[0]], V[f[k]], V[f[k + 1]]
                    T.append((a + b + c) / 3)
                    A.append(np.linalg.norm(np.cross(b - a, c - a)) / 2)
        T, A = np.array(T), np.array(A)
        com = (T * A[:, None]).sum(0) / A.sum()
        allv = np.concatenate([tk.verts(p.low) @ np.array(p.low.matrix_world)[:3, :3].T + np.array(p.low.matrix_world)[:3, 3] for p in s.parts])
        z0 = allv[:, 2].min()
        P = allv[allv[:, 2] < z0 + contact][:, :2]
        P = np.unique(np.round(P, 3), axis=0)
        if len(P) < 3:
            return -99.0, com
        P = P[np.lexsort((P[:, 1], P[:, 0]))]

        def cr(u, v):
            return u[0] * v[1] - u[1] * v[0]

        def half(pts):
            h = []
            for q in pts:
                while len(h) >= 2 and cr(h[-1] - h[-2], q - h[-2]) <= 0:
                    h.pop()
                h.append(q)
            return h
        hull = half(P)[:-1] + half(P[::-1])[:-1]  # counter-clockwise
        c = com[:2]
        d = min(cr(b - a, c - a) / max(np.linalg.norm(b - a), 1e-9) for a, b in zip(hull, hull[1:] + hull[:1]))
        return float(d), com

    # -------------------------------------------------------------- export
    def export(s, rig=None, extra_meta=None):
        bpy.ops.object.select_all(action='DESELECT')
        for p in s.parts:
            p.low.select_set(True)
            if s.facet:
                facet.flat(p.low)
        if rig:
            rig.arm.select_set(True)
            for e in rig.points:
                e.select_set(True)
        bpy.context.view_layer.objects.active = s.parts[0].low
        glb = os.path.join(s.out, s.id + '.glb')
        bpy.context.scene.frame_set(0)
        bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True, export_apply=True,
                                  export_yup=True, export_tangents=not s.facet, export_normals=True, export_texcoords=True,
                                  export_materials='EXPORT', export_image_format='AUTO', export_animations=bool(rig and rig.actions),
                                  export_animation_mode='ACTIONS', export_force_sampling=True, export_frame_step=1,
                                  export_anim_slide_to_zero=True, export_reset_pose_bones=True, export_def_bones=False,
                                  export_leaf_bone=False, export_skins=False, export_morph=False, export_lights=False,
                                  export_cameras=False, export_extras=False, export_optimize_animation_size=False,
                                  export_rest_position_armature=True)
        meta = dict(s.meta)
        meta['tris'] = s.tris()
        if s.facet:
            meta['facet'] = 1
            lo, hi, cap = facet.TRIS
            if meta['tris'] > (cap if s.secret() else hi) or meta['tris'] < lo * 0.75:
                s.log(f'facet: {meta["tris"]} tris (simple ~{lo}, detailed up to {hi}, cap {cap})' + ('  << OVER THE CAP' if meta['tris'] > cap else '  (low)'))
        st, com = s.stability()
        meta['stand'] = round(st, 2)
        tip = math.degrees(math.atan2(st, max(com[2], 1e-3)))  # (art/lowpix/figures/audit.py wants >= 8 degrees)
        meta['tip'] = round(tip, 1)
        s.log(f'stands: centre of mass {np.round(com, 1)}, {st:.1f} mm inside its footprint, tips at {tip:.0f} deg' + ('' if tip >= 8.5 else '  << NOT SECURE (audit: >= 8 deg)'))
        meta['density'] = [round(getattr(s, 'density_seen', 0), 2), round(getattr(s, 'density', 0), 2)]
        if rig:
            meta['clips'] = {a: a for a in rig.actions}
            meta['pts'] = {e.name[3:]: e.name for e in rig.points}
        meta.update(extra_meta or {})
        json.dump(meta, open(os.path.join(s.out, s.id + '.meta.json'), 'w'), indent=1)
        s.log(f'exported {glb}: {meta["tris"]} tris')
        if os.environ.get('GG_FACE_CLOSE'):
            d = os.environ['GG_FACE_CLOSE']  # (a folder: <series>__<id>.png in it)
            os.makedirs(d, exist_ok=True)
            s.face_close(os.path.join(d, f'{s.series}__{s.id}.png'))
        return glb

    def _face_also(s, mask, n):
        """make.sh --faces: the alternate-face atlas painted in this same run (same mesh, UVs and bake as the figure
        it ships with: a separate --repaint run of a figure whose build is not repeatable would not line up). The
        figure's paint function is found in the caller (paint_fn / paint) and run again with face.EXPR set."""
        import inspect
        import zlib
        import face
        import paint as pt
        fr = inspect.currentframe().f_back.f_back
        fn = None
        for k in ('paint_fn', 'paint'):
            fn = fr.f_locals.get(k) or fr.f_globals.get(k)
            if callable(fn):
                break
        if not callable(fn):
            s.log('face also: no paint function found')
            return
        expr = ('happy', 'sleepy', 'wink')[zlib.crc32(f'{s.series}/{s.id}'.encode()) % 3]
        keep_mark = list(face.MARK)
        face.EXPR, face._WINK[0] = expr, 0
        try:
            P2 = pt.Painter(s.maps, s.region_index, s.size)
            rgb2 = fn(P2, pt) if len(inspect.signature(fn).parameters) >= 2 else fn(P2)
            save_png(dilate(np.clip(rgb2, 0, 1), mask, 10), os.path.join(s.out, f'{s.id}.face_col.png'), 'sRGB', n)
            open(os.path.join(s.out, f'{s.id}.face_expr'), 'w').write(expr)
            s.log('variant face', expr, '(painted with the figure)')
        finally:
            face.EXPR = None
            face.MARK[:] = keep_mark

    def face_close(s, path, res=320):
        """A head-on close-up of the painted face (the face audit sheet, faces_audit.py): framed on every texel
        lib/face.py inked, seen along the faces' axis."""
        import face
        recs = [(a, m & s.maps['mask']) for a, m in face.MARK if m is not None and (m & s.maps['mask']).any()]
        if not recs:
            s.log('face close-up: no face painted')
            return
        a0 = max(recs, key=lambda r: r[1].sum())[0]  # the main face; the marks facing about the same way go with it
        m = np.zeros_like(recs[0][1])
        for a, mm in recs:
            if float(a @ a0) > 0.6:
                m |= mm
        P = s.maps['pos'][m]
        a = a0 / max(1e-6, np.linalg.norm(a0))
        up = np.array([0.0, 0.0, 1.0]) if abs(a[2]) < 0.8 else np.array([0.0, 1.0, 0.0])
        u = np.cross(up, a)
        u /= np.linalg.norm(u)
        v = np.cross(a, u)
        c = (np.percentile(P, 1, axis=0) + np.percentile(P, 99, axis=0)) / 2
        ext = max(float(np.ptp(P @ u)), float(np.ptp(P @ v)))
        r = max(3.0, 0.72 * ext + 1.0)
        D = r / math.sin(math.atan(18 / 60))
        cam = c + a * D + v * 0.08 * D
        lows = [p.low for p in s.parts]
        tk.preview(path, lows, cam=(tuple(cam), tuple(c)), res=(res, res), samples=12, lens=60)
        s.log('face close-up ->', path)


# ------------------------------------------------------------------ UV helpers
def _weight_islands(ob, w=1.0, under=0.45):
    """Scale each UV island (faces joined across non-seam edges) by w, and by `under` more when it faces down."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    uvl = bm.loops.layers.uv.active
    bm.faces.ensure_lookup_table()
    seen = set()
    for f in bm.faces:
        if f.index in seen:
            continue
        isl, stack = [], [f]
        seen.add(f.index)
        while stack:
            g = stack.pop()
            isl.append(g)
            for e in g.edges:
                if e.seam:
                    continue
                for h in e.link_faces:
                    if h.index not in seen:
                        seen.add(h.index)
                        stack.append(h)
        area = sum(g.calc_area() for g in isl)
        nz = sum(g.normal.z * g.calc_area() for g in isl) / max(area, 1e-9)
        k = w * (under if nz < -0.6 else 1.0)
        if abs(k - 1.0) < 1e-6:
            continue
        loops = [l for g in isl for l in g.loops]
        c = sum((l[uvl].uv for l in loops), mathutils_vec2()) / len(loops)
        for l in loops:
            l[uvl].uv = c + (l[uvl].uv - c) * k
    bm.to_mesh(ob.data)
    bm.free()


def mathutils_vec2():
    from mathutils import Vector
    return Vector((0.0, 0.0))


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


# ------------------------------------------------------------------ the figure script's command line (shared)
def montage(paths, out, cols=4):
    """Glue preview renders side by side (bpy images: no PIL inside Blender's Python); the parts are removed."""
    ims = [bpy.data.images.load(p) for p in paths]
    w, h = ims[0].size
    rows = (len(ims) + cols - 1) // cols
    big = np.ones((rows * h, cols * w, 4), np.float32)
    for i, im in enumerate(ims):
        a = np.empty(w * h * 4, np.float32)
        im.pixels.foreach_get(a)
        r, c = divmod(i, cols)
        big[(rows - 1 - r) * h:(rows - r) * h, c * w:(c + 1) * w] = a.reshape(h, w, 4)
    o = bpy.data.images.new('montage', cols * w, rows * h, alpha=False)
    o.pixels.foreach_set(big.reshape(-1))
    o.filepath_raw = out
    o.file_format = 'PNG'
    o.save()
    for p in paths:
        os.remove(p)
    print('[montage]', out)


def cli(F, make_rig, paint_fn, args=None, clip=None, cams=None, fold=(0, 30, 52, 68), ao_dist=6.0, roughness=0.42,
        res=(420, 420), ao_by_bone=True, ao_also=None):
    """The figure script's command line (the shape of agent C's cx.run, nakanohito/_suit.run, hashigo/_frog.run):
        --preview  sculpts and game meshes from each camera (one montage png: <id>_prev.png)
        --fold     the game meshes at the `fold` frames of the gimmick clip (<id>_fold.png)
        --clip     report parts passing through each other during the clip (clip = {frames, skip, tol}); 0 frames to ship
        (none)     unwrap, bake (--fast: fewer AO samples; --repaint: reuse the last bake; per-bone AO), paint, rig,
                   gimmick points (kit.points), export (with the stand check).
    paint_fn(P) or paint_fn(P, pt) returns P.done()."""
    import inspect
    import sys
    import kit
    args = sys.argv[1:] if args is None else args
    OUT = os.path.join(F.out, F.id)
    cams = cams or [((62, -70, 50), (0, 0, 22)), ((-62, 66, 44), (0, 2, 22))]
    F.log('tris', F.tris(), {p.name: tk.tri_count(p.low) for p in F.parts})
    if '--clip' in args:
        from rig import check_clip
        R = make_rig()
        clip = clip or {}
        res_ = check_clip(R, F.parts, clip.get('frames', range(1, 90)), skip=clip.get('skip', []), tol=clip.get('tol', 0.35))
        for f, L_ in sorted(res_.items()):
            print('CLIP', f, L_)
        print('CLIP frames', len(res_))
        sys.exit(0)
    if '--preview' in args or '--fold' in args:
        lows = [p.low for p in F.parts]
        highs = [h for p in F.parts for h in p.highs]
        paths = []
        if '--fold' in args:
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
    F.bake(ao_samples=24 if '--fast' in args else 128, ao_dist=ao_dist, reuse='--repaint' in args, ao_by_bone=ao_by_bone, ao_also=ao_also)
    P = pt.Painter(F.maps, F.region_index, F.size)
    F.finish(paint_fn(P, pt) if len(inspect.signature(paint_fn).parameters) >= 2 else paint_fn(P), roughness=roughness)
    F.drop_highs()
    R = make_rig()
    kit.points(R)
    F.export(R)
