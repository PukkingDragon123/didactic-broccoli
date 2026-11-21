"""The commuter train over the underpasses: a Shōwa-era private-railway EMU (an original line, the Kamiyama Electric
Railway 上山電鉄; no real company's livery or marks), modelled in lowpix from the classic 1960s-70s 18 m three-door steel
cars (reference: Shōwa private-railway commuter stock and JNR 101 / 103-type construction): 2.8 m wide, the floor
1.15 m above the rail, a shallow arched roof, two-piece sash windows, double sliding doors.

  train_cab  driving car (Tc): the flat three-window cab front with its gangway door, twin headlights under the roof
             arc, a roll destination sign, tail and marker lamps, wipers, grab rails, the front coupler with its air hoses
             and jumper cables, a small skirt; a horn and an antenna on the roof. The cab is at +z.
  train_mid  motor car (M): a diamond pantograph on its insulators with the roof wiring and lightning arrester.
Both: the body (ivory over Kamiyama green with a vermilion pinstripe), windows and doors as separate frames proud of
the shell, rain gutters, box ventilators and the roof walkway, the underfloor gear (controller, resistor grids,
compressor, battery box, air tanks), two coil-spring bogies (side frames, axle boxes, springs, wheelsets, brake
cylinders), couplers and gangway bellows at the inner ends. Weathered: brake dust on the bogies and the lower body,
soot and streaks on the roof, rain streaks under the windows, chipped paint on the edges.

Frame: x across (+x the right-hand side looking forward), y up from the rail top, z along the track (+z forward), the
car centred on its middle. 18 m over the body; the game couples three (src/world/Town.js makeTrain).
"""
import math
import os
import re

from arch import Spec, ramp, photo

FONT_JS = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', 'src', 'gfx', 'font5x7.js'))


def _glyphs():
    src = open(FONT_JS, encoding='utf8').read()
    out = {}
    for m in re.finditer(r"(?:'(.)'|([A-Z0-9])): '([.#|]+)'", src):
        out[m.group(1) or m.group(2)] = m.group(3).split('|')
    return out


GLYPHS = _glyphs()


def text5(s, ch='t', gap=1):
    """The game's own 5x7 pixel font (src/gfx/font5x7.js) as stamp art rows."""
    rows = [''] * 7
    for i, c in enumerate(s.upper()):
        g = GLYPHS.get(c) or GLYPHS['?']
        for r in range(7):
            rows[r] += g[r].replace('#', ch) + ('.' * gap if i < len(s) - 1 else '')
    return rows

L = 18.0          # body length
HW = 1.4          # half width
Y0, Y1 = 0.95, 3.3   # body skirt line, cantrail (gutter) line
SILL, WTOP = 1.98, 2.95  # window sill and top
DOORS = (-6.0, 0.0, 6.0)
BOGIE = 6.25      # bogie centres at +-BOGIE
WR = 0.43         # wheel radius (860 mm)
GAUGE = 0.5335    # half of 1067 mm (rail centres)


def base(name, desc):
    S = Spec(name, ppm=36, desc=desc)
    S.ramps(
        ivory=ramp('#e6dec6', 8, hue=8, sat=0.03, spread=0.72),
        green=ramp('#2f5c48', 8, hue=12, sat=0.04, spread=0.78),
        verm=ramp('#c4462c', 6, hue=12, sat=0.04, spread=0.7),
        alu=ramp('#aeb4b6', 7, hue=8, sat=0.02, spread=0.75),
        glass=ramp('#3c4c5c', 8, hue=14, sat=0.05, spread=0.85),
        seat=ramp('#6a8a6a', 6, hue=10, sat=0.03, spread=0.7),
        roof=ramp('#5e6062', 8, hue=8, sat=0.02, spread=0.8),
        under=ramp('#323436', 8, hue=8, sat=0.02, spread=0.8),
        rust=ramp('#6e4a34', 6, hue=12, sat=0.03, spread=0.75),
        rubber=ramp('#1e1f21', 5, hue=6, sat=0.01, spread=0.6),
        lamp=ramp('#f2ecd0', 6, hue=10, sat=0.03, spread=0.6),
        red=ramp('#a82a24', 6, hue=10, sat=0.03, spread=0.7),
        white=ramp('#eeece4', 6, hue=8, sat=0.02, spread=0.6),
        ink=ramp('#1c1c1e', 5, hue=6, sat=0.01, spread=0.5),
        porc=ramp('#8a5a3a', 6, hue=10, sat=0.03, spread=0.7),
        steel=ramp('#7a8084', 7, hue=8, sat=0.02, spread=0.75),
    )
    S.d['light'] = {'dir': [-0.45, 1.0, 0.6], 'strength': 0.4, 'gradient': 0.2, 'ao': 0.45, 'ao_height': 1.4}
    S.d['brush'] = {'length': 0.3, 'width': 0.04, 'rough': 0.35, 'flow': 'horizontal',
                    'textures': {'under': 'metal', 'roof': 'metal', 'steel': 'metal', 'rust': 'metal'}}
    rim = {'light_shift': 0.8, 'dark_shift': -0.8}
    # the livery: ivory above the window sills, Kamiyama green below, a vermilion pinstripe at the sill line
    sill_n = (SILL - (Y0 + Y1) / 2) / ((Y1 - Y0) / 2)
    S.style('body', ramp='ivory', tone=4.4, rim=rim, layers=[
        photo('painted_metal_shutter', scale=1.6, amount=0.16),
        {'id': 'lower', 'op': 'band', 'axis': 'y', 'from': -1.0, 'to': sill_n, 'ramp': 'green', 'tone': 3.6},
        {'id': 'stripe', 'op': 'band', 'axis': 'y', 'from': sill_n, 'to': sill_n + 0.045, 'ramp': 'verm', 'tone': 3.4},
        {'id': 'grime', 'op': 'gradient', 'axis': 'y', 'amount': 0.7},
        {'id': 'dust', 'op': 'band', 'axis': 'y', 'from': -1.0, 'to': -0.88, 'shift': -0.8, 'wobble': 0.04},
        {'id': 'streaks', 'op': 'spots', 'count': 46, 'radius': [0.012, 0.03], 'stretch': [0.35, 9, 0.35], 'shift': -0.5,
         'where': {'y': [-0.25, 0.55]}, 'faces': ['left', 'right']},
        {'id': 'seams', 'op': 'stripes', 'axis': 'y', 'period': 0.62, 'width': 0.025, 'shift': -0.6, 'faces': ['front', 'back']},
        {'id': 'wear', 'op': 'wear', 'width': 1, 'density': 0.25, 'ramp': 'under', 'tone': 2.4},
        {'id': 'under', 'op': 'fill', 'faces': ['bottom'], 'ramp': 'under', 'tone': 2.0}])
    S.style('door', ramp='ivory', tone=4.2, rim=rim, layers=[
        {'id': 'lower', 'op': 'band', 'axis': 'y', 'from': -1.0, 'to': (SILL - 2.1) / 0.95, 'ramp': 'green', 'tone': 3.6},
        {'id': 'stripe', 'op': 'band', 'axis': 'y', 'from': (SILL - 2.1) / 0.95, 'to': (SILL - 2.1) / 0.95 + 0.06, 'ramp': 'verm', 'tone': 3.4},
        {'id': 'gap', 'op': 'rect', 'faces': ['left', 'right'], 'rect': [0.49, 0.0, 0.51, 1.0], 'ramp': 'ink', 'tone': 1.2},
        {'id': 'winL', 'op': 'rect', 'faces': ['left', 'right'], 'rect': [0.1, 0.5, 0.42, 0.9], 'ramp': 'glass', 'tone': 2.6, 'bevel': True},
        {'id': 'winR', 'op': 'rect', 'faces': ['left', 'right'], 'rect': [0.58, 0.5, 0.9, 0.9], 'ramp': 'glass', 'tone': 2.6, 'bevel': True},
        {'id': 'sky', 'op': 'stripes', 'faces': ['left', 'right'], 'axis': [0, 1, 0.6], 'period': 0.34, 'width': 0.12, 'shift': 0.9,
         'range': [0.18, 0.85]},
        {'id': 'grime', 'op': 'gradient', 'axis': 'y', 'amount': 0.6},
        {'id': 'rubber', 'op': 'panel', 'inset': 1, 'shift': -1.2, 'highlight': 0.4, 'shadow': 1}])
    # two-piece sash windows: aluminium frame, the lower pane up, the upper pane down; sky in the glass, seat backs and
    # a strap or two behind it
    S.style('window', ramp='alu', tone=4.0, rim={'light_shift': 1.0, 'dark_shift': -0.9}, brush={'off': True}, layers=[
        {'id': 'lo', 'op': 'rect', 'faces': ['left', 'right'], 'rect': [0.05, 0.07, 0.95, 0.5], 'ramp': 'glass', 'tone': 2.4, 'bevel': True},
        {'id': 'hi', 'op': 'rect', 'faces': ['left', 'right'], 'rect': [0.05, 0.54, 0.95, 0.93], 'ramp': 'glass', 'tone': 3.2, 'bevel': True},
        {'id': 'seats', 'op': 'rect', 'faces': ['left', 'right'], 'rect': [0.08, 0.08, 0.92, 0.2], 'ramp': 'seat', 'tone': 2.0},
        {'id': 'sky', 'op': 'stripes', 'faces': ['left', 'right'], 'axis': [0, 1, 0.7], 'period': 0.42, 'width': 0.1, 'shift': 1.0,
         'range': [0.1, 0.9]},
        {'id': 'straps', 'op': 'stripes', 'faces': ['left', 'right'], 'axis': 'z', 'period': 0.24, 'width': 0.05, 'shift': -0.7,
         'range': [0.75, 0.88]}])
    S.style('roof', ramp='roof', tone=3.6, rim=rim, brush={'flow': 'x', 'length': 0.5, 'rough': 0.25}, layers=[
        photo('rusty_painted_metal', scale=1.2, amount=0.14),
        {'id': 'sheets', 'op': 'stripes', 'axis': 'z', 'period': 0.92, 'width': 0.03, 'shift': -0.8},
        {'id': 'soot', 'op': 'patches', 'scale': 0.6, 'threshold': 0.62, 'shift': -0.7},
        {'id': 'rust', 'op': 'patches', 'scale': 0.25, 'threshold': 0.78, 'ramp': 'rust', 'tone': 2.6}])
    S.style('under', ramp='under', tone=2.8, rim=rim, brush={'flow': 'long'}, layers=[
        photo('metal_plate', scale=0.8, amount=0.3),
        {'id': 'ribs', 'op': 'stripes', 'axis': 'z', 'period': 0.2, 'width': 0.12, 'shift': -0.5, 'faces': ['left', 'right']},
        {'id': 'dust', 'op': 'patches', 'scale': 0.2, 'threshold': 0.72, 'ramp': 'rust', 'tone': 2.2},
        {'id': 'bolts', 'op': 'rivets', 'inset': 2, 'spacing': 10, 'highlight': 0.8, 'shadow': 1}])
    S.style('grid', ramp='under', tone=2.6, rim=rim, layers=[
        {'id': 'slits', 'op': 'grille', 'faces': ['left', 'right'], 'rect': [0.06, 0.12, 0.94, 0.88], 'period': 3, 'dir': 'v', 'slit_tone': 0.8},
        {'id': 'heat', 'op': 'patches', 'scale': 0.15, 'threshold': 0.66, 'ramp': 'rust', 'tone': 2.4}])
    S.style('bogie', ramp='under', tone=2.4, rim=rim, layers=[
        {'id': 'dust', 'op': 'patches', 'scale': 0.12, 'threshold': 0.62, 'ramp': 'rust', 'tone': 2.2},
        {'id': 'bolts', 'op': 'rivets', 'inset': 2, 'spacing': 8, 'highlight': 0.7, 'shadow': 1}])
    S.style('wheel', ramp='steel', tone=3.0, rim=rim, brush={'off': True}, layers=[
        {'id': 'rust', 'op': 'patches', 'scale': 0.08, 'threshold': 0.4, 'ramp': 'rust', 'tone': 2.6, 'faces': ['front', 'back']},
        {'id': 'hub', 'op': 'spots', 'faces': ['front', 'back'], 'centers': [[0, 0, 0, 0.12]], 'ramp': 'under', 'tone': 2.0, 'bevel': True}])
    S.style('screen', ramp='alu', tone=3.8, rim={'light_shift': 1.0, 'dark_shift': -0.9}, brush={'off': True}, layers=[
        {'id': 'glass', 'op': 'rect', 'faces': ['front', 'back'], 'rect': [0.05, 0.06, 0.95, 0.94], 'ramp': 'glass', 'tone': 2.8, 'bevel': True},
        {'id': 'sky', 'op': 'stripes', 'faces': ['front', 'back'], 'axis': [1, 1, 0], 'period': 0.38, 'width': 0.12, 'shift': 1.0, 'range': [0.08, 0.92]},
        {'id': 'dash', 'op': 'rect', 'faces': ['front', 'back'], 'rect': [0.08, 0.07, 0.92, 0.2], 'ramp': 'under', 'tone': 2.2}])
    S.style('gangdoor', ramp='ivory', tone=4.2, rim=rim, layers=[
        {'id': 'lower', 'op': 'band', 'axis': 'y', 'from': -1.0, 'to': (SILL - 2.075) / 0.925, 'ramp': 'green', 'tone': 3.6},
        {'id': 'stripe', 'op': 'band', 'axis': 'y', 'from': (SILL - 2.075) / 0.925, 'to': (SILL - 2.075) / 0.925 + 0.06, 'ramp': 'verm', 'tone': 3.4},
        {'id': 'win', 'op': 'rect', 'faces': ['front', 'back'], 'rect': [0.14, 0.46, 0.86, 0.9], 'ramp': 'glass', 'tone': 2.6, 'bevel': True},
        {'id': 'sky', 'op': 'stripes', 'faces': ['front', 'back'], 'axis': [1, 1, 0], 'period': 0.3, 'width': 0.1, 'shift': 0.9, 'range': [0.45, 0.9]},
        {'id': 'grime', 'op': 'gradient', 'axis': 'y', 'amount': 0.6},
        {'id': 'rubber', 'op': 'panel', 'inset': 1, 'shift': -1.2, 'highlight': 0.4, 'shadow': 1}])
    S.style('alu', ramp='alu', tone=3.8, rim=rim, brush={'off': True})
    S.style('rubber', ramp='rubber', tone=2.4, rim={'light_shift': 0.6, 'dark_shift': -0.4},
            layers=[{'id': 'folds', 'op': 'stripes', 'axis': 'y', 'period': 0.09, 'width': 0.35, 'shift': -0.9}])
    S.style('steel', ramp='steel', tone=3.2, rim=rim)
    S.style('porc', ramp='porc', tone=3.6, rim={'light_shift': 1.0, 'dark_shift': -0.8}, brush={'off': True},
            layers=[{'id': 'sheds', 'op': 'stripes', 'axis': 'z', 'period': 0.05, 'width': 0.35, 'shift': -1.1}])
    return S


def shell(S, cab):
    """Body, roof, gutters, ventilators, walkway, windows, doors, underfloor gear, bogies, the inner-end gangway."""
    # the car number in the 5x7 pixel font, white on the green below the sill at each end of both sides
    num = text5(('KD 1021' if cab else 'KD 1121'), gap=1)
    S.box('body', 2 * HW, Y1 - Y0, L, 0, Y0, 0, style='body', chamfer=0.03, hide=['top'],
          paint={'stamps': [{'faces': ['left', 'right'], 'at': 'bottom-left', 'offset': [40, -22], 'art': num, 'key': {'t': 'white:3'}}]})
    # the shallow arched roof (the lower half of the elliptic prism sits inside the body)
    S.prism('roof', 2 * HW + 0.02, 0.74, L + 0.02, [0, Y1, 0], sides=16, style='roof')
    for s in (-1, 1):
        S.box('gutter', 0.05, 0.06, L + 0.02, s * (HW + 0.02), Y1 - 0.02, 0, style='alu')
    S.box('walkway', 0.42, 0.03, L - 2.0, 0, Y1 + 0.35, 0, style='roof',
          paint={'layers': [{'id': 'slats', 'op': 'stripes', 'axis': 'z', 'period': 0.12, 'width': 0.3, 'shift': -1.0}]})
    vents = (-7.2, -4.6, -2.0, 2.0, 4.6, 7.2) if cab else (-7.2, -4.6, -2.0, 2.0)
    for z in vents:
        S.taper('vent', [0.86, 0.24, 0.62], [0, Y1 + 0.42, z], style='roof', front_scale=[0.82, 0.7], back_scale=[0.82, 0.7],
                paint={'layers': [{'id': 'louvre', 'op': 'grille', 'faces': ['left', 'right'], 'rect': [0.1, 0.15, 0.9, 0.85],
                                   'period': 2, 'dir': 'h', 'slit_tone': 1.0}]})
    # doors (double sliding, proud of the shell) and windows: two between each pair of doors, one by each end
    for z in DOORS:
        S.box('door', 0.024, 1.9, 1.3, HW + 0.006, 1.15, z, style='door', mirror=True)
        S.box('door_rail', 0.05, 0.05, 1.5, HW + 0.02, 3.07, z, style='alu', mirror=True)
        S.box('step', 0.12, 0.05, 1.3, HW + 0.05, 1.08, z, style='alu', mirror=True)
    wins = []  # (z, width): three between each pair of doors, one in each end section
    for a, b in zip(DOORS[:-1], DOORS[1:]):
        m = (a + b) / 2
        wins += [(m - 1.47, 1.18), (m, 1.18), (m + 1.47, 1.18)]
    wins += [(-(DOORS[-1] + 1.45), 1.2)]
    if cab:  # behind the cab: a short window, then the crew door
        wins += [(DOORS[-1] + 1.25, 0.8)]
        S.box('crew_door', 0.024, 1.85, 0.62, HW + 0.006, 1.15, L / 2 - 0.55, style='gangdoor', mirror=True,
              paint={'layers': [{'id': 'win', 'op': 'rect', 'faces': ['left', 'right'], 'rect': [0.14, 0.5, 0.86, 0.9], 'ramp': 'glass', 'tone': 2.6, 'bevel': True}]})
        S.rod('crew_grab', [HW + 0.05, 1.3, L / 2 - 0.15], [HW + 0.05, 2.6, L / 2 - 0.15], 0.016, sides=4, style='alu', mirror=True)
    else:
        wins += [(DOORS[-1] + 1.45, 1.2)]
    for z, ww in wins:
        S.box('window', 0.02, WTOP - SILL + 0.06, ww, HW + 0.004, SILL - 0.03, z, style='window', mirror=True)
    # underfloor gear between the bogies: controller, resistor grids, compressor, battery box, air tanks
    gear = [(-3.6, 1.2, 0.5, 0.55, 'under'), (-2.0, 1.4, 0.42, 0.7, 'grid'), (-0.2, 1.6, 0.48, 0.6, 'under'),
            (1.6, 1.3, 0.38, 0.75, 'grid'), (3.4, 1.0, 0.45, 0.6, 'under')]
    for z, d, h, w, st in gear:
        for s in (-1, 1):
            S.box('gear', w, h, d, s * (HW - 0.3 - w / 2 + 0.25), Y0 - h, z * (1 if s > 0 else -1), style=st)
    for s in (-1, 1):
        S.prism('tank', 0.36, 0.36, 2.2, [s * 0.3, Y0 - 0.26, 0.4 * s], sides=10, style='under')
    S.box('sill', 2 * HW - 0.3, 0.12, L - 0.4, 0, Y0 - 0.12, 0, style='under')
    for zc in (-BOGIE, BOGIE):
        bogie(S, zc)
    # inner end(s): gangway bellows and coupler
    for e in ((-1,) if cab else (-1, 1)):
        S.box('bellows', 1.05, 2.05, 0.28, 0, 1.1, e * (L / 2 + 0.12), style='rubber')
        coupler(S, e, inner=True)


def bogie(S, zc):
    """A coil-spring bogie (DT21-type): side frames outside the wheels, axle boxes, springs, bolster, wheelsets, brakes."""
    for s in (-1, 1):
        S.taper('frame', [0.16, 0.3, 2.9], [s * 0.86, 0.6, zc], style='bogie', front_scale=[1.0, 0.6], back_scale=[1.0, 0.6])
        for dz in (-1.05, 1.05):
            S.box('axlebox', 0.22, 0.28, 0.32, s * 0.82, WR - 0.14, zc + dz, style='bogie')
            S.prism('spring', 0.16, 0.16, 0.26, [s * 0.82, WR + 0.3, zc + dz * 0.72], sides=8, rot=[-90, 0, 0], style='steel',
                    paint={'layers': [{'id': 'coils', 'op': 'stripes', 'axis': 'z', 'period': 0.05, 'width': 0.4, 'shift': -1.2}]})
            S.prism('brake', 0.16, 0.16, 0.22, [s * 0.68, WR + 0.12, zc + dz * 0.6], sides=8, rot=[0, 90, 0], style='bogie')
    S.box('bolster', 2.1, 0.22, 0.5, 0, 0.66, zc, style='bogie')
    S.box('motor', 0.9, 0.42, 0.5, 0, 0.26, zc, style='under')
    for dz in (-1.05, 1.05):
        S.rod('axle', [-0.72, WR, zc + dz], [0.72, WR, zc + dz], 0.07, sides=6, style='steel')
        for s in (-1, 1):
            S.prism('wheel', 2 * WR, 2 * WR, 0.13, [s * (GAUGE + 0.03), WR, zc + dz], sides=14, rot=[0, 90, 0], style='wheel')


def coupler(S, e, inner):
    z0 = e * (L / 2)
    S.box('draft', 0.3, 0.22, 0.5, 0, 0.72, z0 + e * 0.1, style='under')
    S.box('coupler', 0.32, 0.26, 0.24, 0, 0.7, z0 + e * (0.42 if inner else 0.48), style='steel')
    if not inner:
        for s in (-1, 1):
            S.rod('hose', [s * 0.35, 0.9, z0 + e * 0.05], [s * 0.42, 0.55, z0 + e * 0.32], 0.025, sides=5, style='rubber')
            S.rod('jumper', [s * 0.9, 1.05, z0 + e * 0.04], [s * 0.75, 0.75, z0 + e * 0.2], 0.03, sides=5, style='rubber')


def cab_front(S):
    """The flat three-window cab front at +z with its gangway door and lamps."""
    zf = L / 2 + 0.012
    # left / right windscreens and the gangway door with its own window (frames proud of the front sheet)
    for s in (-1, 1):
        S.box('windscreen', 0.82, 0.86, 0.024, s * 0.88, SILL + 0.02, zf, style='screen')
        S.rod('wiper', [s * 0.62, SILL + 0.1, zf + 0.03], [s * 0.86, SILL + 0.62, zf + 0.03], 0.012, sides=4, style='rubber')
        # twin headlights under the roof arc, tail + marker lamps low on the corners
        S.prism('headlight', 0.24, 0.24, 0.1, [s * 0.98, 3.1, zf + 0.04], sides=12, style='alu',
                paint={'layers': [{'id': 'lens', 'op': 'spots', 'faces': ['front'], 'centers': [[0, 0, 0, 0.1]], 'ramp': 'lamp', 'tone': 4.2, 'bevel': True}]})
        S.prism('taillight', 0.17, 0.17, 0.08, [s * 1.02, 1.42, zf + 0.03], sides=10, style='alu',
                paint={'layers': [{'id': 'lens', 'op': 'spots', 'faces': ['front'], 'centers': [[0, 0, 0, 0.07]], 'ramp': 'red', 'tone': 3.4, 'bevel': True}]})
        S.prism('marker', 0.12, 0.12, 0.06, [s * 1.02, 1.66, zf + 0.025], sides=8, style='alu',
                paint={'layers': [{'id': 'lens', 'op': 'spots', 'faces': ['front'], 'centers': [[0, 0, 0, 0.05]], 'ramp': 'lamp', 'tone': 3.2}]})
        S.rod('grab', [s * 1.25, 1.3, zf + 0.06], [s * 1.25, 2.6, zf + 0.06], 0.018, sides=5, style='alu')
        S.box('footstep', 0.3, 0.04, 0.16, s * 0.95, 0.98, zf + 0.08, style='alu')
    S.box('gangway', 0.7, 1.85, 0.026, 0, 1.15, zf, style='gangdoor')
    # the roll destination sign above the gangway door and the run-number board beside it
    # (the line's own termini, in the game's 5x7 pixel font: black on the white roll, the run number white on black)
    S.box('destination', 0.92, 0.27, 0.04, 0, 3.0, zf + 0.01, style='alu',
          paint={'layers': [{'id': 'roll', 'op': 'rect', 'faces': ['front'], 'rect': [0.04, 0.08, 0.96, 0.92], 'ramp': 'white', 'tone': 4.0}],
                 'stamps': [{'face': 'front', 'at': 'center', 'art': text5('OKUNO'), 'key': {'t': 'ink:1'}}]})
    S.box('runboard', 0.36, 0.24, 0.03, -1.0, 2.58, zf + 0.03, style='alu',
          paint={'layers': [{'id': 'num', 'op': 'rect', 'faces': ['front'], 'rect': [0.06, 0.08, 0.94, 0.92], 'ramp': 'ink', 'tone': 1.4}],
                 'stamps': [{'face': 'front', 'at': 'center', 'art': text5('21'), 'key': {'t': 'white:4'}}]})
    # the skirt under the buffer beam and the front coupler with its hoses
    S.taper('skirt', [2.3, 0.45, 0.1], [0, 0.66, zf + 0.02], style='under', front_scale=[0.86, 1.0])
    coupler(S, 1, inner=False)
    # horn and the train-radio antenna on the roof
    S.prism('horn', 0.12, 0.12, 0.34, [0.45, Y1 + 0.36, L / 2 - 1.0], sides=8, style='steel')
    S.rod('antenna', [-0.5, Y1 + 0.3, L / 2 - 1.4], [-0.5, Y1 + 0.55, L / 2 - 1.9], 0.02, sides=4, style='steel')
    S.box('antenna_bar', 0.03, 0.03, 0.7, -0.5, Y1 + 0.53, L / 2 - 2.0, style='steel')


def pantograph(S, zc):
    """A diamond (PS16-type) pantograph on four insulators, raised to the contact wire, with the roof wiring."""
    yb = Y1 + 0.38
    S.box('pan_base', 1.2, 0.08, 1.5, 0, yb, zc, style='steel')
    for dx in (-0.5, 0.5):
        for dz in (-0.6, 0.6):
            S.prism('insulator', 0.14, 0.14, 0.22, [dx, yb - 0.1, zc + dz], sides=8, rot=[-90, 0, 0], style='porc')
    S.box('pan_springs', 0.5, 0.14, 0.4, 0, yb + 0.08, zc, style='steel')
    H = 1.25
    for s in (-1, 1):
        x = s * 0.42
        b0, b1 = [x, yb + 0.1, zc - 0.5], [x, yb + 0.1, zc + 0.5]
        k0, k1 = [x * 0.8, yb + 0.62, zc - 0.82], [x * 0.8, yb + 0.62, zc + 0.82]
        t0, t1 = [x * 0.55, yb + H, zc - 0.18], [x * 0.55, yb + H, zc + 0.18]
        for a, b in ((b0, k0), (b1, k1), (k0, t0), (k1, t1)):
            S.rod('pan_arm', a, b, 0.024, sides=5, style='steel')
    for z in (-0.82, 0.82):
        S.rod('pan_cross', [-0.34, yb + 0.62, zc + z], [0.34, yb + 0.62, zc + z], 0.02, sides=4, style='steel')
    S.box('pan_head', 1.55, 0.06, 0.3, 0, yb + H, zc, style='steel',
          paint={'layers': [{'id': 'strips', 'op': 'stripes', 'faces': ['top'], 'axis': 'z', 'period': 0.15, 'width': 0.3, 'ramp': 'alu', 'tone': 4.4}]})
    for s in (-1, 1):
        S.rod('pan_horn', [s * 0.77, yb + H + 0.03, zc], [s * 0.98, yb + H - 0.18, zc], 0.02, sides=4, style='steel')
    # roof wiring to the lightning arrester and down through the roof
    S.prism('arrester', 0.14, 0.14, 0.3, [0.85, Y1 + 0.45, zc - 1.6], sides=8, rot=[-90, 0, 0], style='porc')
    S.rod('wire1', [0.3, yb + 0.06, zc - 0.7], [0.85, Y1 + 0.6, zc - 1.6], 0.02, sides=4, style='rubber')
    S.rod('wire2', [0.85, Y1 + 0.6, zc - 1.6], [0.85, Y1 + 0.33, zc - 2.6], 0.02, sides=4, style='rubber')


def cab():
    S = base('train_cab', 'Kamiyama Electric Railway commuter EMU, driving car (original livery)')
    shell(S, cab=True)
    cab_front(S)
    return S


def mid():
    S = base('train_mid', 'Kamiyama Electric Railway commuter EMU, motor car with pantograph (original livery)')
    shell(S, cab=False)
    pantograph(S, 5.6)
    return S


def specs():
    return {'train_cab': cab(), 'train_mid': mid()}
