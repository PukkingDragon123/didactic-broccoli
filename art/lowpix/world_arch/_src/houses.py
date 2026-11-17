"""The lane's houses as lowpix models, generated from the exact parameters the game builds them with.

The town (src/world/Town.js house()) still lays the houses out, and keeps the parts that change or glow (window glass
and the rooms behind it, door leaves, name plates and signs, lamps, balconies and their laundry, each house's own
dressing in extra()); everything else of the house is this model: the foundation with its vents, the walls (mortar,
sprayed stucco, lap siding, weatherboard, prefab panels) with weathering placed by rule (splash-back at the foot, soot
under the eaves, rain streaks under each sill), the floor band, corner boards and tile skirts, real sloped roofs
(kawara in grey / glazed blue / brown / green / ibushi silver, standing-seam steel, slate, corrugated tin) with eave
tiles, a noshi ridge with onigawara, bargeboards, soffits and rafter ends, the pent roof over the ground floor, gutters
and downpipes on brackets, window casings, sills, grilles, hoods and shutter boxes, door casings, steps, canopies, lamp
housings, intercoms and mailboxes, wall air-conditioner units on brackets, meters, TV antennas and solar water heaters.

Input: art/lowpix/world_arch/houses.json, the town's own dump of every house() call (`index.html?dumphouses`, then
JSON.stringify(game.garage.town.houseDump); materials by their name in town.m). Houses are grouped into blocks that
share one atlas (one draw call each): BLOCKS below. Reference: 1990s Japanese residential back streets (Tokyo shitamachi,
Kyoto and Osaka suburbs): 1960s-80s wooden and light-steel two-storey houses, mortar and sprayed-stucco walls, J-tile
roofs, aluminium sashes.
"""
import json
import math
import os

from arch import Spec, ramp, photo

HERE = os.path.dirname(os.path.abspath(__file__))
DUMP = os.path.join(HERE, '..', 'houses.json')

# block id -> house ids (side + x, z in cm; see houseId in Town.js) and its texel density
BLOCKS = {
    'lane_nw': (['hn-705_340', 'hn-1255_370', 'hn-1800_528', 'hn-2325_200'], 28),
    'lane_ne': (['hn705_140', 'hn1395_390', 'hn1935_220', 'hn2420_260'], 28),
    'lane_fw': (['hf-2325_1630', 'hf-1810_1590', 'hf-1242_1490', 'hf-450_1650'], 28),
    'lane_fe': (['hf140_1660', 'hf725_1600', 'hf1270_1840', 'hf1820_1600'], 28),
}
LITE_PPM = 12  # the second rows behind (background, seen over the roofs): one atlas for all of them

# ------------------------------------------------------------------ materials -> paint
WALLS = {  # name: (base colour, kind)
    # the town's houseWall is painted lap boarding (下見板張り, painted), its siding a dark weathered clapboard
    'wallCream': ('#c9b690', 'lap'), 'wallBeige': ('#bca681', 'lap'), 'wallGrey': ('#a8a28e', 'lap'),
    'wallBlue': ('#98a3a6', 'lap'), 'mortar': ('#b9b3a4', 'mortar'), 'mortarG': ('#aeac90', 'mortar'),
    'mortarP': ('#c2b294', 'mortar'), 'siding': ('#43342a', 'siding'), 'board': ('#4e3d2e', 'board'),
    'boardL': ('#8a7a62', 'board'), 'prefab': ('#d6cfbb', 'prefab'), 'prefabB': ('#b89a7c', 'prefab'),
    'brick': ('#8a4e36', 'brick'), 'skirt': ('#7a5a44', 'tiles'), 'conc': ('#9a968c', 'mortar'),
    'shikkui': ('#e2dccc', 'stucco'), 'koshi': ('#5a4a3a', 'board'),
}
ROOFS = {  # name: (base colour, kind)
    'roofGrey': ('#62676f', 'kawara'), 'roofBlue': ('#4e6488', 'kawara'), 'roofBrown': ('#76574a', 'kawara'),
    'roofGreen': ('#5c6e5f', 'kawara'), 'roofIbushi': ('#5a6069', 'kawara'), 'roofMetal': ('#7a5040', 'seam'),
    'roofMetalB': ('#3e5268', 'seam'), 'roofSlate': ('#474b55', 'slate'), 'tin': ('#8e9894', 'corr'),
}


def hexc(v, default='#8a8a88'):
    if v is None:
        return default
    if isinstance(v, str):
        return v if v.startswith('#') else default
    return '#%06x' % int(v)


def mname(v, default):
    return v[2:] if isinstance(v, str) and v.startswith('m:') else default


def hash2(a, b):
    # src/core/util.js hash2 is not needed exactly; a stable pseudo-random per house for small variations
    h = math.sin(a * 127.1 + b * 311.7) * 43758.5453
    return h - math.floor(h)


class House:
    """Emits one house's parts into the spec under a bone at its origin (front wall at local z = 0, body toward -z)."""

    def __init__(self, S, o, lite=False, hide_back=False):
        self.S, self.o, self.lite, self.hide_back = S, o, lite, hide_back
        self.id = o['id']
        self.bone = S.part(self.id, 'bone', [0, 0, 0], [o['x'], o.get('y0') or 0, o['z']],
                           rot=[0, 0 if (o.get('side', 1) or 1) > 0 else 180, 0], paint={'ramp': 'conc'})

    # parts in the house frame
    def box(self, name, w, h, d, x, y, z, ry=0, **kw):
        return self.S.part(f'{self.id}_{name}', 'box', [w, h, d], [x, y + h / 2, z], parent=self.bone,
                           rot=[0, ry, 0] if ry else None, **kw)

    def raw(self, name, shape, size, at, **kw):
        return self.S.part(f'{self.id}_{name}', shape, size, at, parent=self.bone, **kw)

    def rod(self, name, a, b, r, sides=6, **kw):
        return self.S.rod(f'{self.id}_{name}', a, b, r, sides=sides, parent=self.bone, **kw)

    def slab(self, name, a, b, w, t, **kw):
        return self.S.slab(f'{self.id}_{name}', a, b, w, t, parent=self.bone, **kw)

    def slope(self, name, x0, x1, z0, y0, z1, y1, t, **kw):
        return self.S.slope(f'{self.id}_{name}', x0, x1, z0, y0, z1, y1, t, parent=self.bone, **kw)

    def col(self, c, steps=6):
        """A ramp for a tint (shared across the block)."""
        h = hexc(c)
        k = 'c' + h[1:]
        if k not in self.S.d['palette']['ramps']:
            self.S.ramps(**{k: ramp(h, steps, hue=10, sat=0.03, spread=0.7)})
        return k

    def tint(self, c, tone=None, style=None, layers=None, **paint):
        p = {'ramp': self.col(c)}
        if tone is not None:
            p['tone'] = tone
        if layers:
            p['layers'] = layers
        p.update(paint)
        return {'paint': p, 'style': style or 'flat'}

    # ---------------------------------------------------------------- the whole house
    def build(self):
        o = self.o
        W, D = o['w'], o['d']
        side = o.get('side', 1) or 1
        seed = math.floor(abs(o['x'] * 3.7 + o['z'] * 1.3))
        self.seed = seed
        y0 = o.get('y0') or 0
        base = 0 if y0 else (o.get('base') if o.get('base') is not None else 0.4)
        h1 = o.get('h1') or 2.65
        floors = o.get('floors') or 2
        h2 = (o.get('h2') or 2.55) if floors > 1 else 0
        fy = [base, base + h1]
        self.W, self.D, self.base, self.fy = W, D, base, fy
        wallA = mname(o.get('wallA'), 'wallCream')
        wallB = mname(o.get('wallB'), wallA)
        back = ['back'] if self.hide_back else []
        if base:
            self.box('found', W + 0.08, base, D + 0.08, 0, 0, -D / 2, style='found', hide=['bottom', 'top'] + back,
                     paint={'layers': self.vents(W, base, o)})
        self.box('wallA', W, h1, D, 0, base, -D / 2, style=self.wall_style(wallA), hide=['bottom'] + back + (['top'] if h2 else []),
                 paint={'layers': self.streaks(0, W, fy, o) + self.splash(base, 0)})
        top = base + h1
        if h2:
            self.box('band', W + 0.06, 0.12, D + 0.06, 0, top - 0.06, -D / 2, hide=['bottom'] + back, **self.tint(o.get('trim', 0x6a5a4a), 2.8, style='wood'))
            self.box('wallB', W, h2, D, 0, top, -D / 2, style=self.wall_style(wallB), hide=['bottom'] + back,
                     paint={'layers': self.streaks(1, W, fy, o) + self.soot(o)})
            top += h2
        self.top = top
        self.roof(W, D, top, o, wallB)
        # the game needs the ridge height (antennas, the pigeon loft): src/kit/lowpixArch.js LP_HOUSES
        self.S.d.setdefault('game', {}).setdefault('houses', {})[self.id] = {'ridge': round(self.ridge, 3)}
        if self.lite:
            for w in o.get('win') or []:
                self.casing(w)
            return
        if o.get('pent') and h2:
            self.pent(W, fy, o)
        sk = o.get('skirt')
        if isinstance(sk, dict):
            mat = mname(sk.get('mat'), 'skirt')
            self.box('skirt', W + 0.02, sk.get('h', 0.9), 0.03, 0, base, 0.012, style=self.wall_style(mat), hide=['bottom', 'back'])
        if o.get('corner') is not None:
            for sx in (-1, 1):
                self.box('corner', 0.07, top - base, 0.07, sx * (W / 2 - 0.02), base, 0.02, hide=['bottom'], **self.tint(o['corner'], 3.2, style='wood'))
        for w in o.get('win') or []:
            self.casing(w)
        if isinstance(o.get('door'), dict):
            self.door(o['door'], base)
        if o.get('roof') != 'flat':
            self.gutters(W, D, top, o, seed)
        else:
            gt = o.get('gutterTint', 0x9a9690)
            self.rod('dp_back', [(W / 2 + 0.06) * (-1 if seed % 2 else 1), top, -D + 0.15], [(W / 2 + 0.06) * (-1 if seed % 2 else 1), 0.05, -D + 0.15], 0.04, **self.tint(gt, 3.4, style='pipe'))
        for fl, u in o.get('ac') or []:
            self.ac(fl, u, fy)
        sx = 1 if seed % 2 else -1
        self.box('emeter', 0.06, 0.4, 0.3, sx * (W / 2 + 0.03), base + 1.1, -1.2, **self.tint(0xc8c4bc, 3.6, layers=[
            {'op': 'rect', 'faces': ['left', 'right'], 'rect': [0.2, 0.45, 0.8, 0.75], 'ramp': 'glass', 'tone': 2.2, 'bevel': True}]))
        self.box('gmeter', 0.08, 0.3, 0.24, sx * (W / 2 + 0.04), base + 0.65, -2.1, **self.tint(0xb8bcb0, 3.4))
        self.rod('gpipe', [sx * (W / 2 + 0.05), 0, -2.3], [sx * (W / 2 + 0.05), base + 0.65, -2.3], 0.02, **self.tint(0xc8b848, 3.4, style='pipe'))
        if o.get('antenna') is not None:
            self.antenna(o['antenna'], self.ridge, -D / 2)

    # ---------------------------------------------------------------- styles and weathering layers
    def wall_style(self, mat):
        return 'w_' + (mat if mat in WALLS else 'wallCream')

    def streaks(self, floor, W, fy, o):
        """Rain streaks under each window sill on this floor's front wall (spots placed at the sills)."""
        cs = []
        h_wall = fy[1] - fy[0]
        for w in o.get('win') or []:
            fl, u, ww, hh = w[0], w[1], w[2], w[3]
            opt = w[5] if len(w) > 5 and isinstance(w[5], dict) else {}
            if fl != floor or opt.get('face', 'f') != 'f' or opt.get('clean'):
                continue
            sill = opt.get('sill', 0.85 if fl else 0.9)
            y = fy[fl] + sill - 0.35
            # spot centres are in part coordinates (centred on the part): the wall part's centre is (0, fy+h/2, -D/2)
            cy = y - (fy[fl] + (h_wall if fl == 0 else (self.top_guess() - fy[1])) / 2)
            cs.append([u - ww * 0.25, cy, self.D / 2, 0.08])
            cs.append([u + ww * 0.2, cy - 0.1, self.D / 2, 0.06])
        if not cs:
            return []
        return [{'id': f'streak{floor}', 'op': 'spots', 'centers': cs, 'stretch': [0.6, 5.0, 0.6], 'shift': -0.7, 'faces': ['front']}]

    def top_guess(self):
        o = self.o
        return self.fy[1] + ((o.get('h2') or 2.55) if (o.get('floors') or 2) > 1 else 0)

    def splash(self, base, _):
        return [{'id': 'splash', 'op': 'band', 'axis': 'y', 'from': -1, 'to': -0.82, 'shift': -0.6, 'wobble': 0.06}]

    def soot(self, o):
        return [{'id': 'soot', 'op': 'band', 'axis': 'y', 'from': 0.8, 'to': 1, 'shift': -0.5, 'wobble': 0.05}]

    def vents(self, W, base, o):
        """Foundation vents (床下換気口) painted in: a dark slot with cast-iron bars, off the door."""
        if o.get('vents') is False or o.get('lite') or base < 0.3:
            return []
        out = []
        door = o.get('door') if isinstance(o.get('door'), dict) else None
        for vx in (-W * 0.3, W * 0.3):
            if door and abs(vx - door.get('x', 0)) < (door.get('w', 1.4)) / 2 + 0.4:
                continue
            fx0 = (vx - 0.2 + (W + 0.08) / 2) / (W + 0.08)
            fx1 = (vx + 0.2 + (W + 0.08) / 2) / (W + 0.08)
            y0, y1 = 0.12 / base, 0.27 / base
            out.append({'op': 'rect', 'faces': ['front'], 'rect': [fx0, y0, fx1, y1], 'ramp': 'iron', 'tone': 0.6, 'bevel': True})
            for i in range(4):
                bx = (vx - 0.15 + i * 0.1 + (W + 0.08) / 2) / (W + 0.08)
                out.append({'op': 'rect', 'faces': ['front'], 'rect': [bx - 0.004, y0, bx + 0.004, y1], 'ramp': 'galv', 'tone': 3.2})
        return out

    # ---------------------------------------------------------------- roofs
    def roof_paint(self, rm):
        return 'r_' + (rm if rm in ROOFS else 'roofGrey')

    def roof(self, W, D, yb, o, wallB):
        S = self
        rm = mname(o.get('roofM'), 'roofGrey')
        kind = o.get('roof') or 'gable'
        e = o.get('eave', 0.45) if o.get('eave') is not None else 0.45
        es = o.get('verge', 0.3) if o.get('verge') is not None else 0.3
        s = o.get('step') or 0.3
        r = o.get('rise') or 0.13
        k = r / s
        RW = W + 2 * es
        barge = o.get('barge', 0x4a3a2e)
        soffit = o.get('soffit', 0xd0c8b8)
        fascia = o.get('fascia', 0x3a2c22 if o.get('rafters') else 0x6a6258)
        rstyle = self.roof_paint(rm)
        kawara = ROOFS.get(rm, ('', ''))[1] == 'kawara' and o.get('tiles') is not False
        T = 0.24 if kawara else 0.12  # roof build-up thickness (perpendicular)
        tv = T / math.cos(math.atan(k))
        under = [{'id': 'soffit', 'op': 'fill', 'faces': ['bottom'], 'ramp': self.col(soffit), 'tone': 3.2}]
        if o.get('rafters'):
            under.append({'id': 'rafters', 'op': 'stripes', 'axis': 'x', 'period': 0.45, 'width': 0.16, 'faces': ['bottom'],
                          'ramp': self.col(0x5a4434), 'tone': 2.4, 'bevel': True})
        edge = [{'id': 'fascia', 'op': 'fill', 'faces': ['front', 'back', 'left', 'right'], 'ramp': self.col(fascia), 'tone': 2.8}]
        if kind == 'flat':
            self.box('parapet', W + 0.1, 0.5, D + 0.1, 0, yb, -D / 2, style='found', hide=['bottom'])
            self.box('cap', W + 0.16, 0.08, D + 0.16, 0, yb + 0.5, -D / 2, **self.tint(0x8a8680, 3.2, style='found'))
            self.ridge = yb + 0.58
            return
        if kind == 'hip':
            depth = D + 2 * e
            L = max(0.3, RW - depth + 0.3)
            hgt = (depth / 2) * k
            # the roof body: a taper pinched to the ridge; a fascia frame round its eaves
            self.raw('roof', 'taper', [RW, depth, hgt], [0, yb + 0.1 + hgt / 2, -D / 2], rot=[-90, 0, 0],
                     front_scale=[L / RW, 0], style=rstyle, hide=['front'],
                     paint={'layers': [{'id': 'soffit', 'op': 'fill', 'faces': ['back'], 'ramp': self.col(soffit), 'tone': 3.2}]})
            self.box('eaves', RW, 0.12, depth, 0, yb - 0.02, -D / 2, hide=['top'], **self.tint(fascia, 2.8, style='wood',
                     layers=[{'id': 'soffit', 'op': 'fill', 'faces': ['bottom'], 'ramp': self.col(soffit), 'tone': 3.2}]))
            self.box('ridge', L, 0.12, 0.26, 0, yb + 0.1 + hgt - 0.04, -D / 2, style='ridge_metal' if not kawara else 'ridge')
            self.ridge = yb + 0.1 + hgt + 0.1
            return
        if kind == 'shed':
            run = D + 2 * e
            y1 = yb + run * k
            self.slope('roof', -RW / 2, RW / 2, e, yb, -D - e, y1, T, style=rstyle, paint={'layers': under + edge})
            # the side walls rise to meet it: a right-angled wedge on top of each wall (the attic)
            hh = D * k + e * k - 0.04
            self.raw('attic', 'taper', [W, D, max(0.05, hh)], [0, yb - 0.02 + hh / 2, -D / 2], rot=[-90, 0, 0],
                     front_scale=[1, 0], front_shift=[0, D / 2], style=self.wall_style(wallB), hide=['front', 'back', 'bottom'])
            for sx in (-1, 1):
                self.slab('barge', [sx * (RW / 2 + 0.025), yb - 0.02 + 0.02, e], [sx * (RW / 2 + 0.025), y1 + 0.02, -D - e], 0.05, T + 0.06,
                          **self.tint(barge, 2.6, style='wood'))
            self.ridge = y1
            return
        # gable: two slabs meeting at the ridge over the middle, the gable triangles under them, bargeboards
        mid = -D / 2
        yr = yb + (e - mid) * k  # top of the slabs at the ridge line
        self.slope('roof_f', -RW / 2, RW / 2, e, yb, mid, yr, T, style=rstyle, paint={'layers': under + edge})
        self.slope('roof_b', -RW / 2, RW / 2, -D - e, yb, mid, yr, T, style=rstyle, paint={'layers': under + edge})
        hh = (yr - tv) - yb + 0.02
        if hh > 0.05:
            self.raw('attic', 'taper', [W, D, hh], [0, yb - 0.02 + hh / 2, mid], rot=[-90, 0, 0], front_scale=[1, 0],
                     style=self.wall_style(wallB), hide=['front', 'back'] + (['top'] if self.hide_back else []))
        for sx in (-1, 1):
            for zs, ze in ((e, mid), (-D - e, mid)):
                self.slab('barge', [sx * (RW / 2 + 0.025), yb - 0.04, zs], [sx * (RW / 2 + 0.025), yr + 0.0, ze], 0.05, T + 0.1,
                          **self.tint(barge, 2.6, style='wood'))
        if kawara:
            # noshi ridge: stacked flat tiles on a white mortar line, a round cap, onigawara at the ends
            self.box('ridge_mortar', RW + 0.02, 0.06, 0.42, 0, yr - 0.03, mid, **self.tint(0xe2ddd0, 3.6, style='flat'))
            self.box('ridge', RW + 0.08, 0.16, 0.32, 0, yr + 0.02, mid, style='ridge')
            self.raw('ridge_cap', 'prism', [0.2, 0.16, RW + 0.12], [0, yr + 0.2, mid], sides=8, rot=[0, 90, 0], style='ridge')
            for sx in (-1, 1):
                self.box('oni', 0.14, 0.4, 0.44, sx * (RW / 2 + 0.06), yr - 0.04, mid, style='ridge', chamfer=0.03)
            self.ridge = yr + 0.26
            # eave tiles (軒瓦) along the front and back eaves
            for zz, ry in ((e, 0), (-D - e, 180)):
                self.box('noki', RW, 0.12, 0.07, 0, yb - 0.1, zz + (0.02 if ry == 0 else -0.02), ry=ry, style='noki')
        else:
            self.box('ridge', RW + 0.06, 0.1, 0.3, 0, yr - 0.03, mid, style='ridge_metal')
            self.ridge = yr + 0.07
        if o.get('solar') is not None:
            self.solar(o['solar'], yb, e, k)

    def solar(self, x, yb, e, k):
        """A Shōwa solar water heater on the front slope: the collector panel and the tank on legs."""
        ang = math.degrees(math.atan(k))
        sy = lambda z: yb + (e - z) * k  # roof top at z
        zc = e - 1.1
        self.raw('solar', 'box', [1.7, 0.07, 1.3], [x, sy(zc) + 0.08, zc], rot=[ang, 0, 0], **self.tint(0x8a9096, 3.4, style='galvs',
                 layers=[{'op': 'rect', 'faces': ['top'], 'rect': [0.03, 0.04, 0.97, 0.96], 'ramp': 'glass', 'tone': 1.6, 'bevel': True},
                         {'op': 'stripes', 'faces': ['top'], 'axis': 'x', 'period': 0.24, 'width': 0.08, 'ramp': 'galv', 'tone': 4}]))
        zt = zc - 0.82
        for dx in (-0.7, 0.7):
            self.rod('solar_leg', [x + dx, sy(zt) - 0.05, zt], [x + dx, sy(zt) + 0.25, zt], 0.025, **self.tint(0x7a8088, 3, style='pipe'))
        self.raw('solar_tank', 'prism', [0.38, 0.38, 1.85], [x, sy(zt) + 0.41, zt], sides=8, rot=[0, 90, 0], **self.tint(0xe4e0d6, 3.8, style='galvs'))
        self.rod('solar_pipe', [x + 0.6, sy(zt) + 0.3, zt], [x + 0.6, sy(zc) + 0.15, zc + 0.6], 0.02, **self.tint(0x2a2a2a, 2, style='pipe'))

    def pent(self, W, fy, o):
        """The pent roof (下屋) over the ground floor, skipping the balcony."""
        b = o.get('balcony') if isinstance(o.get('balcony'), dict) else None
        spans = [[-W / 2 - 0.12, b['x0'] - 0.05], [b['x1'] + 0.05, W / 2 + 0.12]] if b else [[-W / 2 - 0.12, W / 2 + 0.12]]
        pm = mname(o.get('pentM') or o.get('roofM'), 'roofGrey')
        kawara = ROOFS.get(pm, ('', ''))[1] == 'kawara' and o.get('tiles') is not False
        for i, (a, c) in enumerate(spans):
            if c - a <= 0.3:
                continue
            self.slope(f'pent{i}', a, c, 0.8, fy[1] - 0.26, 0.0, fy[1] + 0.03, 0.18, style=self.roof_paint(pm),
                       paint={'layers': [{'id': 'soffit', 'op': 'fill', 'faces': ['bottom'], 'ramp': self.col(0x5a4a3a), 'tone': 2.6},
                                         {'id': 'rafters', 'op': 'stripes', 'axis': 'x', 'period': 0.45, 'width': 0.15, 'faces': ['bottom'],
                                          'ramp': self.col(0x3a2c22), 'tone': 2.4},
                                         {'id': 'fascia', 'op': 'fill', 'faces': ['front', 'left', 'right'], 'ramp': self.col(0x4a4a48), 'tone': 2.6}]})
            if kawara:  # the row of round eave-tile ends standing proud of the front edge
                self.box(f'pent_noki{i}', c - a, 0.13, 0.07, (a + c) / 2, fy[1] - 0.4, 0.84, style='noki')
            self.rod(f'pent_gutter{i}', [a, fy[1] - 0.42, 0.93], [c, fy[1] - 0.42, 0.93], 0.05, sides=6, **self.tint(o.get('gutterTint', 0x9a9690), 3.4, style='pipe'))

    def gutters(self, W, D, top, o, seed):
        gt = o.get('gutterTint', 0x9a9690)
        e = o.get('eave', 0.45) if o.get('eave') is not None else 0.45
        dpx = (W / 2 + 0.06) * (1 if seed % 2 else -1)
        p = self.tint(gt, 3.4, style='pipe')
        self.rod('gutter', [-W / 2 - 0.3, top - 0.08, e + 0.06], [W / 2 + 0.3, top - 0.08, e + 0.06], 0.065, sides=8, **p)
        self.rod('dp_neck', [dpx, top - 0.1, e + 0.03], [dpx, top - 0.35, 0.14], 0.035, **p)
        self.rod('dp', [dpx, top - 0.35, 0.12], [dpx, 0.14, 0.12], 0.04, **p)
        self.rod('dp_shoe', [dpx, 0.14, 0.12], [dpx, 0.04, 0.24], 0.04, **p)
        y = 0.9
        while y < top - 0.5:
            self.box('dp_clip', 0.12, 0.03, 0.06, dpx, y, 0.08, **self.tint(0x7a7a78, 3, style='pipe'))
            y += 1.15
        if not self.o.get('y0'):
            self.box('splash', 0.24, 0.04, 0.3, dpx, 0, 0.36, style='found')
        bx = (W / 2 + 0.06) * (-1 if seed % 2 else 1)
        self.rod('dp_back', [bx, top, -D + 0.15], [bx, 0.05, -D + 0.15], 0.04, **p)

    # ---------------------------------------------------------------- windows, doors, services
    def frame(self, opt):
        return opt.get('frame', 0xb8bcc0)

    def casing(self, spec):
        fl, u, w, h, kind = spec[0], spec[1], spec[2], spec[3], spec[4]
        opt = spec[5] if len(spec) > 5 and isinstance(spec[5], dict) else {}
        face = opt.get('face', 'f')
        W = self.W
        if face == 'f':
            x, z, ry = u, 0.0, 0.0
        elif face == 'l':
            x, z, ry = -W / 2, -u, -90.0
        else:
            x, z, ry = W / 2, -u, 90.0
        r = math.radians(ry)
        nx, nz, tx, tz = math.sin(r), math.cos(r), math.cos(r), -math.sin(r)
        sill = opt.get('sill', 0.85 if fl else 0.9)
        y = self.fy[fl] + sill
        ft = self.frame(opt)
        alu = self.tint(ft, 3.6, style='alu')
        n = len([1 for p in self.S.d['parts'] if p['id'].startswith(self.id + '_jamb')])
        for s in (-1, 1):
            self.box('jamb', 0.05, h + 0.04, 0.08, x + tx * s * (w / 2 + 0.02) + nx * 0.035, y - 0.02, z + tz * s * (w / 2 + 0.02) + nz * 0.035, ry=ry, **alu)
        self.box('sill', w + 0.1, 0.05, 0.12, x + nx * 0.05, y - 0.06, z + nz * 0.05, ry=ry, **alu)
        self.box('head', w + 0.06, 0.05, 0.09, x + nx * 0.035, y + h, z + nz * 0.035, ry=ry, **self.tint(0x9aa0a6, 3.2, style='alu'))
        if self.lite:
            return
        if opt.get('grille'):
            m = max(1, round(w / 0.11))
            for i in range(m + 1):
                t = -w / 2 + i * (w / m)
                self.box('grille', 0.022, h + 0.08, 0.022, x + tx * t + nx * 0.11, y - 0.04, z + tz * t + nz * 0.11, ry=ry, **self.tint(0xc8ccd0, 3.8, style='alu'))
            for yy in (y - 0.04, y + h + 0.02):
                self.box('grille_rail', w + 0.04, 0.03, 0.03, x + nx * 0.11, yy, z + nz * 0.11, ry=ry, **self.tint(0xb8bcc0, 3.6, style='alu'))
        if opt.get('tobukuro'):
            t = (w / 2 + 0.22) * opt['tobukuro']
            self.box('tobukuro', 0.42, h + 0.12, 0.12, x + tx * t + nx * 0.06, y - 0.06, z + tz * t + nz * 0.06, ry=ry,
                     **self.tint(opt.get('tbTint', 0x8a7a62), 3.2, style='board_t'))
            self.box('tobukuro_cap', 0.44, 0.04, 0.14, x + tx * t + nx * 0.06, y + h + 0.06, z + tz * t + nz * 0.06, ry=ry, **self.tint(0x5a5a58, 3, style='pipe'))
        if opt.get('hood'):
            self.box('hood', w + 0.3, 0.05, 0.36, x + nx * 0.18, y + h + 0.12, z + nz * 0.18, ry=ry, **self.tint(0x6a6a68, 3, style='galvs'))

    def door(self, d, base):
        kind = d.get('kind', 'genkan')
        w = d.get('w') or (0.9 if kind in ('apt', 'west') else 1.5)
        x = d.get('x', 0)
        y = base + (d.get('y') or 0)
        ct = 0x3a2a1c if kind == 'wood' else 0xe8e4dc if kind == 'west' else 0x8a8478
        p = self.tint(ct, 3.2, style='wood' if kind == 'wood' else 'alu')
        for s in (-1, 1):
            self.box('dcase', 0.07, 2.08, 0.1, x + s * (w / 2 + 0.035), y, 0.03, **p)
        self.box('dhead', w + 0.16, 0.07, 0.12, x, y + 2.0, 0.03, **p)
        if not d.get('noStep'):
            pm = d.get('porch')
            st = 'found' if pm != 'tile' else 'porch_tile'
            self.box('step', w + 0.5, max(0.1, base - 0.02), 0.6, x, 0, 0.3, style=st, hide=['bottom'])
            if base > 0.25:
                self.box('step2', w + 0.3, base / 2, 0.3, x, 0, 0.75, style=st, hide=['bottom'])
        if not d.get('noCanopy'):
            self.box('canopy', w + 0.6, 0.06, 0.75, x, y + 2.28, 0.37, **self.tint(0x5a5a58, 3, style='galvs'))
            self.box('canopy_edge', w + 0.6, 0.12, 0.04, x, y + 2.22, 0.74, **self.tint(0x4a4a48, 3, style='galvs'))
            for s in (-1, 1):
                self.slab('canopy_arm', [x + s * (w / 2 + 0.2), y + 1.98, 0.02], [x + s * (w / 2 + 0.2), y + 2.27, 0.7], 0.03, 0.03, **self.tint(0x6a6a68, 3, style='pipe'))
        lx = x + (w / 2 + 0.25) * (d.get('lamp') or 1)
        self.box('lamp', 0.16, 0.22, 0.08, lx, y + 1.95, 0.04, **self.tint(0x2a2a2a, 2.6, style='pipe'))
        self.box('nameboard', 0.13, 0.25, 0.03, lx, y + 1.42, 0.015, **self.tint(0x5a4030, 3, style='wood'))
        self.box('intercom', 0.08, 0.12, 0.04, lx, y + 1.22, 0.03, **self.tint(0xd8d4cc, 3.6, style='alu',
                 layers=[{'op': 'rect', 'faces': ['front'], 'rect': [0.2, 0.55, 0.8, 0.85], 'ramp': 'iron', 'tone': 1.5}]))
        if d.get('mail') is not None:
            self.box('mailbox', 0.32, 0.36, 0.14, lx, y + 0.8, 0.08, chamfer=0.01, **self.tint(d['mail'], 3.2, style='galvs',
                     layers=[{'op': 'rect', 'faces': ['front'], 'rect': [0.15, 0.78, 0.85, 0.86], 'ramp': 'iron', 'tone': 0.6, 'bevel': True}]))

    def ac(self, fl, u, fy):
        """A wall air-conditioner outdoor unit (on brackets upstairs), its pipe duct and the condensate drain."""
        ay = fy[fl] + (0.3 if fl else 0)
        if fl:
            for dx in (-0.28, 0.28):
                p = self.tint(0x8a8e90, 3, style='pipe')
                self.box('ac_arm', 0.04, 0.04, 0.38, u + dx, ay - 0.04, 0.19, **p)
                self.box('ac_post', 0.04, 0.42, 0.04, u + dx, ay - 0.42, 0.02, **p)
                self.slab('ac_brace', [u + dx, ay - 0.4, 0.03], [u + dx, ay - 0.05, 0.36], 0.03, 0.03, **p)
        self.box('ac', 0.78, 0.54, 0.27, u, ay, 0.17, chamfer=0.015, style='ac')
        for dx in (-0.26, 0.26):
            self.box('ac_foot', 0.06, 0.06, 0.24, u + dx, ay - 0.06, 0.17, **self.tint(0x3a3a3a, 2.4, style='pipe'))
        self.box('ac_duct', 0.09, 0.62, 0.07, u + 0.45, ay + 0.1, 0.04, **self.tint(0xe0d8c4, 3.6, style='alu'))
        self.box('ac_duct_cap', 0.1, 0.1, 0.16, u + 0.45, ay + 0.1, 0.12, **self.tint(0xd8d0bc, 3.6, style='alu'))
        self.rod('ac_drain', [u - 0.3, ay, 0.12], [u - 0.3, ay - 0.4, 0.12], 0.012, **self.tint(0x8a8a84, 3, style='pipe'))

    def antenna(self, ax, ay, az):
        p = self.tint(0xb8bcc0, 3.8, style='pipe')
        self.rod('ant_mast', [ax, ay - 0.1, az], [ax, ay + 1.6, az], 0.022, **p)
        self.rod('ant_boom', [ax, ay + 1.46, az - 0.72], [ax, ay + 1.46, az + 0.72], 0.016, **p)
        for i in range(6):
            wdt = 0.5 - i * 0.05
            self.rod('ant_el', [ax - wdt / 2, ay + 1.48, az - 0.6 + i * 0.24], [ax + wdt / 2, ay + 1.48, az - 0.6 + i * 0.24], 0.008, sides=4, **p)
        for sz in (-1, 1):
            self.rod('ant_guy', [ax, ay + 1.1, az], [ax + 0.9, ay - 0.15, az + sz * 0.9], 0.006, sides=4, **self.tint(0x8a8a88, 3, style='pipe'))


def styles(S):
    S.ramps(
        conc=ramp('#9c978d', 8, hue=8, sat=0.02, spread=0.75),
        iron=ramp('#3a3a3c', 6, hue=10, sat=0.02, spread=0.7),
        galv=ramp('#8a9092', 7, hue=10, sat=0.02, spread=0.7),
        rust=ramp('#6a3a26', 6, hue=14, sat=0.02, spread=0.75),
        glass=ramp('#3e4a52', 6, hue=12, sat=0.03, spread=0.7),
        moss=ramp('#5d6a3e', 6, hue=12, sat=0.03, spread=0.7),
        grime=ramp('#4a463e', 6, hue=8, sat=0.02, spread=0.6),
        tileporch=ramp('#a88c78', 6, hue=10, sat=0.02, spread=0.7),
        whitec=ramp('#e2ddd0', 6, hue=8, sat=0.02, spread=0.6),
    )
    S.d['brush'] = {'length': 0.2, 'width': 0.05, 'rough': 0.4, 'overshoot': 0.2, 'flow': 'vertical',
                    'textures': {'conc': 'stone', 'iron': 'metal', 'galv': 'metal', 'rust': 'metal'}}
    rim = {'light_shift': 0.9, 'dark_shift': -0.9}
    S.style('flat', rim=rim, layers=[{'id': 'mottle', 'op': 'noise', 'scale': 0.3, 'amount': 0.35}])
    S.style('pipe', rim=rim, brush={'flow': 'long'}, layers=[{'id': 'mottle', 'op': 'noise', 'scale': 0.2, 'amount': 0.35},
                                                            {'id': 'grime', 'op': 'gradient', 'axis': 'y', 'amount': 0.4}])
    S.style('alu', rim={'light_shift': 1.2, 'dark_shift': -1.0}, brush={'flow': 'long'}, layers=[{'id': 'mottle', 'op': 'noise', 'scale': 0.2, 'amount': 0.25}])
    S.style('galvs', rim=rim, layers=[{'id': 'mottle', 'op': 'noise', 'scale': 0.25, 'amount': 0.4},
                                      {'id': 'rust', 'op': 'patches', 'scale': 0.2, 'threshold': 0.74, 'ramp': 'rust', 'tone': 2.6}])
    S.style('wood', rim=rim, brush={'flow': 'long'}, layers=[photo('weathered_planks', scale=1.0, amount=0.45),
                                                             {'id': 'grain', 'op': 'noise', 'scale': 0.15, 'amount': 0.4}])
    S.style('board_t', rim=rim, brush={'flow': 'vertical'}, layers=[
        {'id': 'boards', 'op': 'stripes', 'axis': 'x', 'period': 0.105, 'width': 0.12, 'shift': -1.0},
        photo('weathered_planks', scale=1.0, amount=0.4)])
    S.style('found', ramp='conc', tone=3.6, rim=rim, layers=[
        photo('concrete_wall_003', scale=1.2, amount=0.75),
        {'id': 'cracks', 'op': 'cracks', 'scale': 0.6, 'width': 1, 'threshold': 0.8, 'shift': -1.3},
        {'id': 'damp', 'op': 'band', 'axis': 'y', 'from': -1, 'to': -0.4, 'shift': -0.7, 'wobble': 0.2},
        {'id': 'moss', 'op': 'patches', 'scale': 0.3, 'threshold': 0.72, 'ramp': 'moss', 'tone': 2.4},
    ])
    S.style('porch_tile', ramp='tileporch', tone=3.4, rim=rim, brush={'off': True}, layers=[
        {'id': 'gx', 'op': 'stripes', 'axis': 'x', 'period': 0.15, 'width': 0.12, 'shift': -1.2},
        {'id': 'gz', 'op': 'stripes', 'axis': 'z', 'period': 0.15, 'width': 0.12, 'shift': -1.2},
        {'id': 'mottle', 'op': 'noise', 'scale': 0.15, 'amount': 0.5}])
    S.style('ac', ramp='whitec', tone=3.6, rim={'light_shift': 1.0, 'dark_shift': -1.0}, layers=[
        {'id': 'grille', 'op': 'grille', 'faces': ['front'], 'rect': [0.06, 0.12, 0.62, 0.88], 'period': 2, 'dir': 'h', 'slit_tone': 1.2},
        {'id': 'fan', 'op': 'spots', 'faces': ['front'], 'centers': [[-0.1, 0.0, 0.135, 0.17]], 'ramp': 'iron', 'tone': 1.4, 'bevel': True},
        {'id': 'hub', 'op': 'spots', 'faces': ['front'], 'centers': [[-0.1, 0.0, 0.135, 0.04]], 'ramp': 'whitec', 'tone': 3},
        {'id': 'side_slits', 'op': 'grille', 'faces': ['left', 'right'], 'rect': [0.15, 0.2, 0.85, 0.8], 'period': 2, 'dir': 'h', 'slit_tone': 1.6},
        {'id': 'grime', 'op': 'gradient', 'axis': 'y', 'amount': 0.6},
        {'id': 'rust', 'op': 'patches', 'scale': 0.1, 'threshold': 0.78, 'ramp': 'rust', 'tone': 2.8},
    ])
    S.style('ridge', ramp='r_ridge', tone=3.2, rim={'light_shift': 1.0, 'dark_shift': -1.1}, brush={'flow': 'long'}, layers=[
        {'id': 'noshi', 'op': 'stripes', 'axis': 'y', 'period': 0.055, 'width': 0.2, 'shift': -1.2, 'faces': ['front', 'back']},
        {'id': 'joints', 'op': 'stripes', 'axis': 'x', 'period': 0.3, 'width': 0.06, 'shift': -1.0},
        {'id': 'lichen', 'op': 'patches', 'scale': 0.2, 'threshold': 0.74, 'ramp': 'moss', 'tone': 3.2}])
    S.style('ridge_metal', ramp='galv', tone=3.2, rim=rim, layers=[{'id': 'mottle', 'op': 'noise', 'scale': 0.2, 'amount': 0.3}])
    S.style('noki', ramp='r_ridge', tone=3.0, rim={'light_shift': 1.0, 'dark_shift': -1.0}, brush={'off': True}, layers=[
        # the round ends of the eave tiles: a disc with a crest every 30 cm, the dark gap between
        {'id': 'gap', 'op': 'stripes', 'axis': 'x', 'period': 0.3, 'width': 0.18, 'shift': -1.8, 'faces': ['front']},
        {'id': 'boss', 'op': 'stripes', 'axis': 'x', 'period': 0.3, 'width': 0.1, 'phase': -0.15, 'shift': 1.0, 'faces': ['front'],
         'range': [-0.4, 0.5]},
        {'id': 'lip', 'op': 'band', 'axis': 'y', 'from': -1, 'to': -0.6, 'shift': -0.8}])
    S.ramps(r_ridge=ramp('#4e535c', 7, hue=12, sat=0.03, spread=0.8))
    # walls
    for name, (c, kind) in WALLS.items():
        S.ramps(**{'w' + name: ramp(c, 8, hue=10, sat=0.03, spread=0.75)})
        lay = []
        if kind == 'stucco':  # sprayed lithin / stucco: fine grain, patchy fading
            lay = [photo('painted_plaster_wall', scale=1.4, amount=0.55), {'id': 'grain', 'op': 'noise', 'scale': 0.08, 'amount': 0.35},
                   {'id': 'fade', 'op': 'patches', 'scale': 0.9, 'threshold': 0.55, 'shift': 0.5}]
        elif kind == 'mortar':  # trowelled cement mortar: hairline cracks and patched repairs
            lay = [photo('cracked_concrete_wall', scale=1.6, amount=0.6), {'id': 'patch', 'op': 'patches', 'scale': 0.7, 'threshold': 0.62, 'shift': -0.5},
                   {'id': 'cracks', 'op': 'cracks', 'scale': 0.8, 'width': 1, 'threshold': 0.82, 'shift': -1.4}]
        elif kind == 'lap':  # painted lap boarding: 18 cm boards, a shadow under each lap, a lit top edge, butt joints, flaking paint
            lay = [{'id': 'laps', 'op': 'stripes', 'axis': 'y', 'period': 0.18, 'width': 0.2, 'shift': -1.5, 'space': 'world',
                    'bevel': {'highlight': 1, 'shadow': 0, 'highlight_shift': 0.9}},
                   {'id': 'butts', 'op': 'spots', 'count': 40, 'radius': [0.008, 0.012], 'stretch': [0.3, 6, 0.3], 'shift': -1.0},
                   {'id': 'flake', 'op': 'patches', 'scale': 0.2, 'threshold': 0.8, 'shift': -0.6},
                   {'id': 'fade', 'op': 'patches', 'scale': 0.9, 'threshold': 0.55, 'shift': 0.4},
                   {'id': 'grain', 'op': 'noise', 'scale': 0.1, 'amount': 0.3}]
        elif kind == 'siding':  # dark weathered clapboard: a shadow line under each board, a lit lip at its foot
            lay = [{'id': 'laps', 'op': 'stripes', 'axis': 'y', 'period': 0.18, 'width': 0.2, 'shift': -1.4, 'space': 'world',
                    'bevel': {'highlight': 1, 'shadow': 0, 'highlight_shift': 1.2}},
                   photo('weathered_planks', scale=1.2, amount=0.6),
                   {'id': 'grey', 'op': 'patches', 'scale': 0.6, 'threshold': 0.62, 'shift': 0.6},
                   {'id': 'mottle', 'op': 'noise', 'scale': 0.15, 'amount': 0.4}]
        elif kind == 'board':  # weatherboard (下見板) with battens (押縁) every 90 cm
            lay = [{'id': 'boards', 'op': 'stripes', 'axis': 'y', 'period': 0.1875, 'width': 0.17, 'shift': -1.4, 'space': 'world',
                    'bevel': {'highlight': 1, 'shadow': 0}},
                   {'id': 'battens', 'op': 'stripes', 'axis': 'x', 'period': 0.9, 'width': 0.05, 'shift': 0.6, 'bevel': True},
                   photo('weathered_planks', scale=1.2, amount=0.6), {'id': 'grey', 'op': 'patches', 'scale': 0.6, 'threshold': 0.6, 'shift': 0.7}]
        elif kind == 'prefab':  # light-steel prefab: enamelled ribbed panels, a joint every 90 cm, rust at the feet
            lay = [{'id': 'joints', 'op': 'stripes', 'axis': 'x', 'period': 0.9, 'width': 0.04, 'shift': -1.4, 'bevel': True},
                   {'id': 'ribs', 'op': 'stripes', 'axis': 'x', 'period': 0.15, 'width': 0.12, 'shift': 0.5},
                   {'id': 'rust', 'op': 'band', 'axis': 'y', 'from': -1, 'to': -0.9, 'ramp': 'rust', 'tone': 3, 'wobble': 0.05},
                   {'id': 'chalk', 'op': 'noise', 'scale': 0.5, 'amount': 0.35}]
        elif kind == 'brick':
            lay = [{'id': 'courses', 'op': 'stripes', 'axis': 'y', 'period': 0.0625, 'width': 0.25, 'shift': -1.5},
                   {'id': 'perp', 'op': 'stripes', 'axis': 'x', 'period': 0.25, 'width': 0.12, 'shift': -1.2},
                   {'id': 'mottle', 'op': 'noise', 'scale': 0.12, 'amount': 0.6}]
        elif kind == 'tiles':  # mosaic tile skirt
            lay = [{'id': 'gx', 'op': 'stripes', 'axis': 'x', 'period': 0.0625, 'width': 0.25, 'shift': -1.4},
                   {'id': 'gy', 'op': 'stripes', 'axis': 'y', 'period': 0.0625, 'width': 0.25, 'shift': -1.4},
                   {'id': 'mottle', 'op': 'noise', 'scale': 0.06, 'amount': 0.8}]
        lay += [{'id': 'dirt', 'op': 'gradient', 'axis': 'y', 'amount': 0.5}]
        S.style('w_' + name, ramp='w' + name, tone=4.2, rim={'light_shift': 0.8, 'dark_shift': -0.8},
                brush={'flow': 'horizontal' if kind in ('lap', 'siding', 'board', 'brick') else 'vertical'}, layers=lay)
    # roofs: the top face is the roofing; the slab's other faces are overridden per part (soffit, fascia)
    for name, (c, kind) in ROOFS.items():
        S.ramps(**{'r' + name: ramp(c, 8, hue=14, sat=0.04, spread=0.8)})
        if kind == 'kawara':  # J-tiles: a rounded crown and a dark trough every 30 cm, a course shadow every 26 cm
            lay = [{'id': 'crown', 'op': 'stripes', 'axis': 'x', 'period': 0.3, 'width': 0.34, 'shift': 0.9, 'space': 'world', 'faces': ['up', 'top']},
                   {'id': 'trough', 'op': 'stripes', 'axis': 'x', 'period': 0.3, 'width': 0.14, 'phase': 0.17, 'shift': -1.4, 'space': 'world', 'faces': ['up', 'top']},
                   {'id': 'course', 'op': 'stripes', 'axis': 'z', 'period': 0.26, 'width': 0.14, 'shift': -1.2, 'faces': ['up', 'top'],
                    'bevel': {'highlight': 1, 'shadow': 0}},
                   photo('grey_roof_tiles_02', scale=1.5, amount=0.4),
                   {'id': 'lichen', 'op': 'patches', 'scale': 0.35, 'threshold': 0.7, 'ramp': 'moss', 'tone': 3.0},
                   {'id': 'stain', 'op': 'noise', 'scale': 0.6, 'amount': 0.4}]
            if name == 'roofIbushi':
                lay.append({'id': 'sheen', 'op': 'noise', 'scale': 0.3, 'amount': 0.5})
        elif kind == 'seam':  # standing-seam steel (瓦棒): a batten roll every 45 cm, chalky paint, rust
            lay = [{'id': 'seam', 'op': 'stripes', 'axis': 'x', 'period': 0.45, 'width': 0.1, 'shift': 1.0, 'space': 'world', 'bevel': True},
                   {'id': 'chalk', 'op': 'noise', 'scale': 0.5, 'amount': 0.45},
                   {'id': 'rust', 'op': 'patches', 'scale': 0.4, 'threshold': 0.66, 'ramp': 'rust', 'tone': 2.8}]
        elif kind == 'slate':  # colorbest slate: staggered courses
            lay = [{'id': 'course', 'op': 'stripes', 'axis': 'z', 'period': 0.21, 'width': 0.12, 'shift': -1.3, 'faces': ['up', 'top']},
                   {'id': 'joints', 'op': 'stripes', 'axis': 'x', 'period': 0.45, 'width': 0.05, 'shift': -1.0, 'space': 'world'},
                   {'id': 'moss', 'op': 'patches', 'scale': 0.3, 'threshold': 0.72, 'ramp': 'moss', 'tone': 2.6},
                   {'id': 'mottle', 'op': 'noise', 'scale': 0.3, 'amount': 0.4}]
        else:  # corrugated tin
            lay = [{'id': 'corr', 'op': 'stripes', 'axis': 'x', 'period': 0.1, 'width': 0.45, 'shift': 0.9, 'space': 'world', 'bevel': True},
                   photo('rusty_corrugated_iron', scale=1.6, amount=0.4),
                   {'id': 'rust', 'op': 'patches', 'scale': 0.5, 'threshold': 0.6, 'ramp': 'rust', 'tone': 2.8}]
        S.style('r_' + name, ramp='r' + name, tone=3.6, rim={'light_shift': 1.0, 'dark_shift': -1.0},
                brush={'flow': 'z' if kind in ('kawara', 'seam', 'corr') else 'x'}, layers=lay)


def load_dump():
    with open(DUMP) as f:
        return json.load(f)


def specs():
    dump = {h['id']: h for h in load_dump()}
    out = {}
    for bid, (ids, ppm) in BLOCKS.items():
        S = Spec(bid, ppm=ppm, tris=90000, colors=900, desc='Lane houses ' + ', '.join(ids))
        styles(S)
        for hid in ids:
            if hid not in dump:
                print('houses: no dump for', hid)
                continue
            o = dump[hid]
            House(S, o, hide_back=(o.get('side', 1) or 1) < 0).build()
        out[bid] = S
    # the background rows: lite houses, one atlas
    lite = [h for h in dump.values() if h.get('lite')]
    if lite:
        S = Spec('lane_back', ppm=LITE_PPM, tris=60000, colors=600, desc='The second rows behind the lane (background)')
        styles(S)
        for o in lite:
            House(S, o, lite=True).build()
        out['lane_back'] = S
    return out
