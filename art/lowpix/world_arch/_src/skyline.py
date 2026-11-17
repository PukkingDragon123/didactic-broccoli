"""The distant town round the lane (the skyline ring, 60-75 m out): four kinds of building the game instances and
stretches to each lot (Town.buildBackdrop): a 1970s apartment block (マンション) with balcony bands and the rooftop
water tank on its steel stand, an office building with a vertical sign and a rooftop billboard frame, a three-storey
shophouse row with its signboards and tiled parapet, and a sawtooth-roofed works with a brick chimney. Authored at a
unit lot (10 m wide, 6 m deep; heights as given), low texel density (they are only ever seen far away).
Window glass is painted in the 'glass' ramp: the game lights some of those texels at night.
"""
from arch import Spec, ramp, photo

GLASS = '#3a4652'


def _mats(S):
    S.ramps(conc=ramp('#a8a49a', 7, hue=8, sat=0.02, spread=0.7), tile=ramp('#c8bca4', 7, hue=10, sat=0.03, spread=0.7),
            glass=ramp(GLASS, 5, hue=12, sat=0.03, spread=0.6), steel=ramp('#7a848a', 6, hue=10, sat=0.02, spread=0.7),
            blue=ramp('#4a6a9a', 6, hue=12, sat=0.04, spread=0.7), red=ramp('#a8402e', 6, hue=14, sat=0.04, spread=0.7),
            cream=ramp('#d8d0bc', 6, hue=8, sat=0.02, spread=0.6), brick=ramp('#8a5440', 6, hue=12, sat=0.04, spread=0.7),
            roof=ramp('#5a5e66', 6, hue=12, sat=0.03, spread=0.7), green=ramp('#3a7a52', 6, hue=12, sat=0.04, spread=0.7),
            yellow=ramp('#d8a838', 6, hue=14, sat=0.04, spread=0.7))
    S.d['light'] = {'dir': [-0.45, 1.0, 0.6], 'strength': 0.4, 'gradient': 0.2, 'ao': 0.4, 'ao_height': 2.0}
    S.d['brush'] = {'off': True}


def windows(rows_h, y0, cols_w, x0=0.0, fill=0.55, floor_h=3.0):
    """Window band layers on the front face: glass between the piers on every floor."""
    return [{'id': 'glass_band', 'op': 'stripes', 'axis': 'y', 'period': floor_h, 'width': fill, 'phase': -y0, 'ramp': 'glass', 'tone': 2.4},
            {'id': 'piers', 'op': 'stripes', 'axis': 'x', 'period': cols_w, 'width': 0.32, 'phase': x0, 'ramp': 'conc', 'tone': 3.6}]


def mansion():
    S = Spec('sky_mansion', ppm=10, desc='Distant apartment block')
    _mats(S)
    H = 15.0
    S.box('body', 10, H, 6, 0, 0, 0, paint={'ramp': 'tile', 'tone': 3.8, 'layers': [
        {'op': 'stripes', 'faces': ['front'], 'axis': 'y', 'period': 3.0, 'width': 0.5, 'phase': -0.9, 'ramp': 'glass', 'tone': 2.4},
        {'op': 'stripes', 'faces': ['front'], 'axis': 'x', 'period': 2.5, 'width': 0.18, 'ramp': 'tile', 'tone': 3.6},
        {'op': 'stripes', 'faces': ['left', 'right', 'back'], 'axis': 'y', 'period': 3.0, 'width': 0.3, 'phase': -1.2, 'ramp': 'glass', 'tone': 2.4},
        {'op': 'stripes', 'faces': ['left', 'right', 'back'], 'axis': 'x', 'period': 2.0, 'width': 0.6, 'ramp': 'tile', 'tone': 3.7},
        {'op': 'gradient', 'axis': 'y', 'amount': 0.5}]})
    for f in range(1, 5):  # balcony slabs with their railings across the front
        S.box('balc', 10.2, 0.15, 1.0, 0, f * 3.0 - 0.1, 3.5, paint={'ramp': 'cream', 'tone': 3.8})
        S.box('rail', 10.2, 0.9, 0.05, 0, f * 3.0 + 0.05, 3.98, paint={'ramp': 'cream', 'tone': 3.4, 'layers': [
            {'op': 'stripes', 'axis': 'x', 'period': 0.5, 'width': 0.3, 'shift': -0.8}]})
    S.box('parapet', 10.2, 0.5, 6.2, 0, H, 0, paint={'ramp': 'conc', 'tone': 3.4})
    S.box('stair_core', 2.2, H + 1.6, 2.2, 3.4, 0, -1.0, paint={'ramp': 'conc', 'tone': 3.6, 'layers': [
        {'op': 'stripes', 'axis': 'y', 'period': 1.5, 'width': 0.2, 'ramp': 'glass', 'tone': 2.6, 'faces': ['front']}]})
    for x in (-3.4, -2.2):  # the water tank on its steel stand
        for z in (-1.6, -0.4):
            S.box('stand_leg', 0.15, 1.6, 0.15, x, H + 0.5, z, paint={'ramp': 'steel', 'tone': 3})
    S.box('tank', 1.8, 1.5, 1.8, -2.8, H + 2.1, -1.0, paint={'ramp': 'cream', 'tone': 3.6, 'layers': [{'op': 'gradient', 'axis': 'y', 'amount': -0.6}]})
    S.rod('antenna', [2.0, H + 0.5, 1.5], [2.0, H + 3.4, 1.5], 0.06, sides=4, paint={'ramp': 'steel', 'tone': 3.4})
    S.rod('ant_x', [1.4, H + 3.0, 1.5], [2.6, H + 3.0, 1.5], 0.04, sides=4, paint={'ramp': 'steel', 'tone': 3.4})
    return S


def office():
    S = Spec('sky_office', ppm=10, desc='Distant office building with a vertical sign and a rooftop billboard')
    _mats(S)
    H = 18.0
    S.box('body', 10, H, 6, 0, 0, 0, paint={'ramp': 'conc', 'tone': 3.6, 'layers': [
        {'op': 'stripes', 'axis': 'y', 'period': 3.0, 'width': 0.45, 'phase': -1.0, 'ramp': 'glass', 'tone': 2.4, 'faces': ['front', 'left', 'right', 'back']},
        {'op': 'stripes', 'axis': 'x', 'period': 1.25, 'width': 0.16, 'ramp': 'conc', 'tone': 3.4, 'faces': ['front', 'back']},
        {'op': 'stripes', 'axis': 'z', 'period': 1.25, 'width': 0.16, 'ramp': 'conc', 'tone': 3.4, 'faces': ['left', 'right']},
        {'op': 'gradient', 'axis': 'y', 'amount': 0.5}]})
    S.box('sign', 1.0, 9.0, 0.3, -4.3, 5.0, 3.2, paint={'ramp': 'cream', 'tone': 4.2, 'layers': [
        {'op': 'rect', 'faces': ['front', 'back'], 'rect': [0.12, 0.05, 0.88, 0.95], 'ramp': 'blue', 'tone': 3.2},
        {'op': 'stripes', 'faces': ['front', 'back'], 'axis': 'y', 'period': 1.1, 'width': 0.55, 'ramp': 'cream', 'tone': 4.4, 'range': [-0.85, 0.85]}]})
    S.box('billboard', 7.0, 2.4, 0.3, 0.5, H + 1.4, 0.0, paint={'ramp': 'red', 'tone': 3.4, 'layers': [
        {'op': 'rect', 'faces': ['front', 'back'], 'rect': [0.05, 0.12, 0.6, 0.88], 'ramp': 'cream', 'tone': 4.2},
        {'op': 'rect', 'faces': ['front', 'back'], 'rect': [0.66, 0.2, 0.95, 0.8], 'ramp': 'yellow', 'tone': 3.8}]})
    for x in (-2.5, 0.5, 3.5):
        S.box('bb_leg', 0.2, 1.4, 0.2, x, H, 0.0, paint={'ramp': 'steel', 'tone': 3})
    S.box('roof_hut', 3.0, 2.2, 3.0, 3.0, H, -1.2, paint={'ramp': 'conc', 'tone': 3.2})
    return S


def shops():
    S = Spec('sky_shops', ppm=10, desc='Distant three-storey shophouse row')
    _mats(S)
    H = 9.5
    S.box('body', 10, H, 6, 0, 0, 0, paint={'ramp': 'tile', 'tone': 3.6, 'layers': [
        {'op': 'stripes', 'axis': 'x', 'period': 3.33, 'width': 0.04, 'shift': -1.4},
        {'op': 'band', 'axis': 'y', 'from': -1, 'to': -0.45, 'ramp': 'glass', 'tone': 2.6, 'faces': ['front']},
        {'op': 'stripes', 'axis': 'y', 'period': 2.8, 'width': 0.42, 'phase': -4.2, 'ramp': 'glass', 'tone': 2.4, 'range': [-0.3, 0.9], 'faces': ['front']},
        {'op': 'stripes', 'axis': 'x', 'period': 1.66, 'width': 0.35, 'ramp': 'tile', 'tone': 3.5, 'range': [-0.3, 0.9], 'faces': ['front']},
        {'op': 'gradient', 'axis': 'y', 'amount': 0.4}]})
    for i, c in enumerate(('red', 'green', 'blue')):
        S.box('signboard', 3.0, 0.8, 0.2, -3.33 + i * 3.33, 2.8, 3.1, paint={'ramp': 'cream', 'tone': 4.0, 'layers': [
            {'op': 'rect', 'faces': ['front'], 'rect': [0.05, 0.15, 0.95, 0.85], 'ramp': c, 'tone': 3.2},
            {'op': 'stripes', 'faces': ['front'], 'axis': 'x', 'period': 0.5, 'width': 0.6, 'ramp': 'cream', 'tone': 4.2, 'range': [-0.6, 0.6]}]})
        S.box('awning', 3.0, 0.1, 1.0, -3.33 + i * 3.33, 2.4, 3.5, paint={'ramp': c, 'tone': 3.0})
    S.box('parapet', 10.1, 0.6, 6.1, 0, H, 0, paint={'ramp': 'roof', 'tone': 3, 'layers': [
        {'op': 'stripes', 'axis': 'x', 'period': 0.3, 'width': 0.3, 'shift': -0.8}]})
    S.box('ac', 0.8, 0.6, 0.3, 2.0, 6.0, 3.15, paint={'ramp': 'cream', 'tone': 3.8})
    return S


def works():
    S = Spec('sky_works', ppm=10, desc='Distant sawtooth-roofed works with a brick chimney')
    _mats(S)
    S.box('walls', 10, 5.0, 6, 0, 0, 0, paint={'ramp': 'steel', 'tone': 3.4, 'layers': [
        {'op': 'stripes', 'axis': 'x', 'period': 0.4, 'width': 0.4, 'shift': 0.6, 'faces': ['front', 'back']},
        {'op': 'band', 'axis': 'y', 'from': 0.2, 'to': 0.6, 'ramp': 'glass', 'tone': 2.4, 'faces': ['front']},
        {'op': 'stripes', 'axis': 'x', 'period': 2.5, 'width': 0.3, 'ramp': 'steel', 'tone': 3.4, 'range': [0.2, 0.6], 'faces': ['front']}]})
    for i in range(4):  # sawtooth: a steep glazed face toward +z, a long sloped back
        z0 = -3 + i * 1.5
        S.slope('saw', -5, 5, z0, 5.0, z0 + 1.4, 6.6, 0.1, paint={'ramp': 'roof', 'tone': 3.2, 'layers': [
            {'op': 'stripes', 'axis': 'x', 'period': 0.4, 'width': 0.3, 'shift': 0.6}]})
        S.box('saw_glass', 10, 1.6, 0.08, 0, 5.0, z0 + 1.45, paint={'ramp': 'glass', 'tone': 2.6, 'layers': [
            {'op': 'stripes', 'axis': 'x', 'period': 1.0, 'width': 0.1, 'ramp': 'steel', 'tone': 3}]})
    S.prism('chimney', 1.0, 1.0, 14.0, [3.5, 7.0, -1.5], sides=10, rot=[-90, 0, 0], front_scale=[0.7, 0.7], paint={'ramp': 'brick', 'tone': 3.4, 'layers': [
        {'op': 'stripes', 'axis': 'z', 'period': 0.25, 'width': 0.15, 'shift': -0.7},
        {'op': 'band', 'axis': 'z', 'from': 0.85, 'to': 1.0, 'shift': -1.4}]})
    return S


def specs():
    return {'sky_mansion': mansion(), 'sky_office': office(), 'sky_shops': shops(), 'sky_works': works()}
