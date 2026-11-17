"""Helpers for writing lowpix specs of architecture in metres (the WORLD agent's kit).

Units are metres (density = texels per metre), Y up, front +Z, the ground at y = 0. Every model is authored in the
frame the game places it in (see each _src/<id>.py), so the packed .glb drops in with no re-centring.

    S = Spec('shopfront', ppm=64)
    S.ramps(tin=ramp('#5f8a80'))
    S.style('tin', ramp='tin', tone=3.6, layers=[...])
    S.box('pier', w, h, d, x, y, z, style='tin', chamfer=0.01)      # y = bottom (like Town's Batch.box), x/z = centre
    S.cbox('lamp', [w, h, d], [x, y, z], ...)                         # centre-based
    S.rod('pipe', [x0, y0, z0], [x1, y1, z1], r, sides=8, ...)        # a prism from a to b (pipes, rails, poles)
    S.slope('roof', x0, x1, z_eave, y_eave, z_top, y_top, t, ...)     # a sloped slab between an eave line and a top line
    S.write(path)
"""
import json
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
PHOTOS = os.path.abspath(os.path.join(HERE, '..', 'photos'))


def photo(name, scale=1.5, amount=0.6, **kw):
    """A photo-bash layer from art/lowpix/world_arch/photos/<name> (CC0 Poly Haven, see SOURCES.md)."""
    return dict(op='photo', src=os.path.join(PHOTOS, name), scale=scale, amount=amount, **kw)


def ramp(base, steps=7, hue=12, sat=0.06, spread=0.8):
    return {'base': base, 'steps': steps, 'hue_shift': hue, 'sat_shift': sat, 'spread': spread}


def _r(v):
    return [round(float(a), 4) for a in v]


class Spec:
    def __init__(self, name, ppm=64, light=None, brush=None, tris=60000, colors=400, desc=''):
        self.d = {
            'name': name,
            'description': desc,
            'license': 'CC0-1.0',
            'density': ppm,
            'budget': {'tris': tris, 'colors': colors},
            'light': light or {'dir': [-0.45, 1.0, 0.6], 'strength': 0.42, 'gradient': 0.25, 'ao': 0.55, 'ao_height': 1.2},
            'render': {'background': '#20242a', 'hero': [-32, 16], 'shadow': 0.4},
            'palette': {'ramps': {}},
            'styles': {},
            'parts': [],
        }
        if brush:
            self.d['brush'] = brush
        self.ids = {}

    # ---------------------------------------------------------------- palette and styles
    def ramps(self, **kw):
        self.d['palette']['ramps'].update(kw)

    def style(self, name, **paint):
        self.d['styles'][name] = paint

    # ---------------------------------------------------------------- parts
    def _id(self, id):
        n = self.ids.get(id, 0)
        self.ids[id] = n + 1
        return id if n == 0 else f'{id}_{n}'

    def part(self, id, shape, size, at, style=None, paint=None, rot=None, chamfer=None, parent=None, hide=None, **kw):
        p = {'id': self._id(id), 'shape': shape, 'size': _r(size), 'pivot': _r(at)}
        if parent:
            p['parent'] = parent
        if rot and any(abs(a) > 1e-6 for a in rot):
            p['rotation'] = _r(rot)
        if chamfer:
            p['chamfer'] = round(chamfer, 4)
        if style:
            p['style'] = style
        if paint:
            p['paint'] = paint
        if hide:
            p['hide'] = hide
        p.update(kw)
        self.d['parts'].append(p)
        return p['id']

    def box(self, id, w, h, d, x, y, z, **kw):
        """A box with its bottom at y (before rotation), centred on x and z."""
        return self.part(id, 'box', [w, h, d], [x, y + h / 2, z], **kw)

    def cbox(self, id, size, at, **kw):
        return self.part(id, 'box', size, at, **kw)

    def taper(self, id, size, at, **kw):
        return self.part(id, 'taper', size, at, **kw)

    def prism(self, id, w, h, length, at, sides=8, **kw):
        """A prism along local z (rot turns it)."""
        return self.part(id, 'prism', [w, h, length], at, sides=sides, **kw)

    def rod(self, id, a, b, r, sides=8, **kw):
        """A round prism from point a to point b (radius r)."""
        ax, ay, az = a
        bx, by, bz = b
        dx, dy, dz = bx - ax, by - ay, bz - az
        L = math.sqrt(dx * dx + dy * dy + dz * dz)
        yaw = math.degrees(math.atan2(dx, dz))
        pitch = -math.degrees(math.atan2(dy, math.hypot(dx, dz)))
        return self.part(id, 'prism', [2 * r, 2 * r, L], [(ax + bx) / 2, (ay + by) / 2, (az + bz) / 2], sides=sides,
                         rot=[pitch, yaw, 0], **kw)

    def slab(self, id, a, b, w, t, up=None, **kw):
        """A plank from a to b (centre line), width w across (horizontal), thickness t: beams, rafters, fascias."""
        ax, ay, az = a
        bx, by, bz = b
        dx, dy, dz = bx - ax, by - ay, bz - az
        L = math.sqrt(dx * dx + dy * dy + dz * dz)
        yaw = math.degrees(math.atan2(dx, dz))
        pitch = -math.degrees(math.atan2(dy, math.hypot(dx, dz)))
        return self.part(id, 'box', [w, t, L], [(ax + bx) / 2, (ay + by) / 2, (az + bz) / 2], rot=[pitch, yaw, 0], **kw)

    def slope(self, id, x0, x1, z0, y0, z1, y1, t, **kw):
        """A roof slab spanning x0..x1, running from the eave line (z0, y0) up to (z1, y1); its top surface on that line."""
        L = math.hypot(z1 - z0, y1 - y0)
        ang = math.atan2(y1 - y0, abs(z1 - z0))  # rise angle
        sgn = 1 if z1 < z0 else -1  # slopes up toward -z (front slope) or +z (back slope)
        # centre of the slab: midpoint of the top line, pushed down along the normal by t/2
        mz, my = (z0 + z1) / 2, (y0 + y1) / 2
        nz, ny = sgn * math.sin(ang), math.cos(ang)  # outward normal of the top surface
        cz, cy = mz - nz * t / 2, my - ny * t / 2
        rx = math.degrees(ang) * sgn  # +x pitches the +z end down (a front slope, rising toward -z)
        return self.part(id, 'box', [x1 - x0, t, L], [(x0 + x1) / 2, cy, cz], rot=[rx, 0, 0], **kw)

    def card(self, id, art, at, plane='xy', **kw):
        return self.part(id, 'card', [0, 0], at, art=art, plane=plane, **kw)

    def write(self, path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w') as f:
            json.dump(self.d, f, indent=1)
        return path
