"""The street's own hardware: the concrete utility pole (コンクリート柱) the lane's wires hang from.

utility_pole: in the prop's frame (Town places it turned a quarter: the crossarms then run across the lane), 8 m to the
top, tapering 0.36 -> 0.22 m: spun concrete with its seam lines and the maker's plate, the tiger-striped guard sleeve,
a wrap-around enamel advert band, the pole-number plate, step bolts from 3.7 m up on alternate sides, two galvanised
crossarms on braces with white porcelain pin insulators, two pole-mounted transformers on their brackets with drop
leads, cable clamps, moss and splash dirt at the foot. Reference: Japanese distribution poles (Tokyo Electric /
NTT shared poles), 1990s.
"""
import math

from arch import Spec, ramp, photo


def utility_pole():
    S = Spec('utility_pole', ppm=40, desc='Concrete utility pole with crossarms, insulators and transformers')
    S.ramps(
        conc=ramp('#a29e95', 8, hue=8, sat=0.02, spread=0.75),
        yellow=ramp('#d8aa2a', 6, hue=14, sat=0.04, spread=0.7),
        ink=ramp('#2a2826', 5, hue=8, sat=0.02, spread=0.6),
        blue=ramp('#2c4f94', 6, hue=12, sat=0.04, spread=0.7),
        cream=ramp('#e8e2d2', 6, hue=8, sat=0.02, spread=0.6),
        red=ramp('#b8322c', 6, hue=12, sat=0.04, spread=0.7),
        galv=ramp('#8e9698', 7, hue=10, sat=0.02, spread=0.7),
        trans=ramp('#9aa49e', 7, hue=10, sat=0.02, spread=0.7),
        porc=ramp('#e6e2d8', 6, hue=8, sat=0.02, spread=0.6),
        rust=ramp('#6a3a26', 6, hue=14, sat=0.02, spread=0.75),
        moss=ramp('#5d6a3e', 6, hue=12, sat=0.03, spread=0.7),
    )
    S.d['brush'] = {'length': 0.25, 'width': 0.04, 'rough': 0.4, 'flow': 'vertical',
                    'textures': {'conc': 'stone', 'galv': 'metal', 'trans': 'metal', 'rust': 'metal'}}
    rim = {'light_shift': 0.9, 'dark_shift': -0.9}
    S.style('galv', ramp='galv', tone=3.6, rim=rim, brush={'flow': 'long'}, layers=[
        {'id': 'mottle', 'op': 'noise', 'scale': 0.15, 'amount': 0.35},
        {'id': 'rust', 'op': 'patches', 'scale': 0.1, 'threshold': 0.72, 'ramp': 'rust', 'tone': 2.6}])
    S.style('porc', ramp='porc', tone=4.0, rim={'light_shift': 1.2, 'dark_shift': -1.0}, brush={'off': True},
            layers=[{'id': 'ribs', 'op': 'stripes', 'axis': 'z', 'period': 0.03, 'width': 0.35, 'shift': -1.2}])
    S.style('trans', ramp='trans', tone=3.8, rim=rim, brush={'flow': 'vertical'}, layers=[
        {'id': 'fins', 'op': 'stripes', 'axis': 'x', 'period': 0.05, 'width': 0.35, 'shift': -0.9, 'faces': ['sides']},
        {'id': 'grime', 'op': 'gradient', 'axis': 'y', 'amount': 0.6},
        {'id': 'rust', 'op': 'patches', 'scale': 0.12, 'threshold': 0.74, 'ramp': 'rust', 'tone': 2.8}])
    H = 8.0
    # the shaft: a 12-sided tapered prism standing up (local +z of the prism points up)
    S.prism('shaft', 0.36, 0.36, H, [0, H / 2, 0], sides=12, rot=[-90, 0, 0], front_scale=[0.6, 0.6],
            paint={'ramp': 'conc', 'tone': 4.0, 'rim': rim, 'layers': [
                photo('concrete_wall_003', scale=0.8, amount=0.65),
                {'id': 'seam', 'op': 'stripes', 'axis': 'x', 'period': 0.5, 'width': 0.03, 'shift': -1.0},
                {'id': 'streaks', 'op': 'spots', 'count': 30, 'radius': [0.01, 0.025], 'stretch': [0.5, 0.5, 8], 'shift': -0.8},
                {'id': 'splash', 'op': 'band', 'axis': 'z', 'from': -1, 'to': -0.94, 'shift': -1.0, 'wobble': 0.02},
                {'id': 'moss', 'op': 'band', 'axis': 'z', 'from': -1, 'to': -0.985, 'ramp': 'moss', 'tone': 2.4, 'wobble': 0.01},
            ]})
    # the tiger-striped plastic guard sleeve (トラ巻き, 0.08 - 1.84 m): clean diagonal yellow and black bands
    def r_at(y):
        return 0.18 - (y / H) * 0.072
    S.prism('sleeve', 2 * r_at(0.08) + 0.024, 2 * r_at(0.08) + 0.024, 1.76, [0, 0.96, 0], sides=12, rot=[-90, 0, 0],
            front_scale=[(r_at(1.84) + 0.012) / (r_at(0.08) + 0.012)] * 2, hide=['front', 'back'],
            paint={'ramp': 'yellow', 'tone': 3.4, 'brush': {'off': True}, 'rim': {'light_shift': 0.6, 'dark_shift': -0.6}, 'layers': [
                {'id': 'tiger', 'op': 'stripes', 'axis': [0.0, 0.55, 1.0], 'period': 0.3, 'width': 0.5, 'ramp': 'ink', 'tone': 1.6},
                {'id': 'scuff', 'op': 'noise', 'scale': 0.06, 'amount': 0.35},
                {'id': 'mud', 'op': 'band', 'axis': 'z', 'from': -1, 'to': -0.82, 'shift': -0.9, 'wobble': 0.03}]})
    # the wrap-around enamel advert band (2.16 - 2.96 m): blue, cream rims, a red line, the advertiser's lines
    S.prism('ad', 2 * r_at(2.16) + 0.016, 2 * r_at(2.16) + 0.016, 0.8, [0, 2.56, 0], sides=12, rot=[-90, 0, 0],
            front_scale=[(r_at(2.96) + 0.008) / (r_at(2.16) + 0.008)] * 2, hide=['front', 'back'],
            paint={'ramp': 'blue', 'tone': 3.0, 'brush': {'off': True}, 'rim': {'light_shift': 0.6, 'dark_shift': -0.6}, 'layers': [
                {'id': 'rim_lo', 'op': 'band', 'axis': 'z', 'from': -1, 'to': -0.93, 'ramp': 'cream', 'tone': 3.8},
                {'id': 'rim_hi', 'op': 'band', 'axis': 'z', 'from': 0.93, 'to': 1, 'ramp': 'cream', 'tone': 3.8},
                {'id': 'red', 'op': 'band', 'axis': 'z', 'from': -0.9, 'to': -0.84, 'ramp': 'red', 'tone': 3.2},
                {'id': 'text1', 'op': 'band', 'axis': 'z', 'from': 0.3, 'to': 0.6, 'ramp': 'cream', 'tone': 4.0},
                {'id': 'text1_gaps', 'op': 'stripes', 'axis': 'x', 'period': 0.05, 'width': 0.3, 'ramp': 'blue', 'tone': 3.0, 'range': [0.3, 0.6]},
                {'id': 'text2', 'op': 'band', 'axis': 'z', 'from': -0.5, 'to': -0.1, 'ramp': 'cream', 'tone': 3.9},
                {'id': 'text2_gaps', 'op': 'stripes', 'axis': 'x', 'period': 0.07, 'width': 0.35, 'ramp': 'blue', 'tone': 3.0, 'range': [-0.5, -0.1]},
                {'id': 'chips', 'op': 'spots', 'count': 8, 'radius': [0.01, 0.02], 'ramp': 'ink', 'tone': 1.4}]})
    S.prism('cap', 0.24, 0.24, 0.06, [0, H + 0.03, 0], sides=12, rot=[-90, 0, 0], front_scale=[0.7, 0.7],
            paint={'ramp': 'conc', 'tone': 2.8})
    S.prism('footing', 0.5, 0.5, 0.08, [0, 0.04, 0], sides=12, rot=[-90, 0, 0], front_scale=[0.8, 0.8],
            paint={'ramp': 'conc', 'tone': 3.2, 'layers': [{'op': 'noise', 'scale': 0.1, 'amount': 0.6}]})
    # the pole-number plate (green on white) at 3.3 m
    S.box('plate', 0.1, 0.22, 0.012, 0, 3.2, 0.152, rot=[0, 0, 0], paint={'ramp': 'cream', 'tone': 3.8, 'layers': [
        {'op': 'rect', 'rect': [0.1, 0.55, 0.9, 0.9], 'ramp': 'blue', 'tone': 2.4},
        {'op': 'stripes', 'axis': 'y', 'period': 0.04, 'width': 0.3, 'ramp': 'ink', 'tone': 1.5, 'range': [-0.7, 0.0]}]})
    # step bolts, alternate sides
    y, s = 3.7, 1
    while y <= 6.75:
        r = 0.165 - (y / H) * 0.07
        S.rod('step', [s * r, y, 0], [s * (r + 0.16), y + 0.01, 0], 0.012, sides=6, style='galv')
        y += 0.32
        s = -s
    # crossarms (腕金) along x with braces, pin insulators on top
    for ya, half, ins in ((7.46, 0.9, (-0.8, -0.4, 0.4, 0.8)), (6.88, 0.74, (-0.64, 0.64))):
        S.box('arm', 2 * half, 0.07, 0.07, 0, ya - 0.035, 0.0, style='galv', chamfer=0.006)
        S.box('arm_band', 0.26, 0.1, 0.26, 0, ya - 0.05, 0, style='galv')
        for sx in (-1, 1):
            S.rod('brace', [sx * 0.12, ya - 0.42, 0.06], [sx * half * 0.6, ya - 0.035, 0.03], 0.012, sides=4, style='galv')
        for x in ins:
            S.prism('ins', 0.08, 0.08, 0.12, [x, ya + 0.06, 0.0], sides=8, rot=[-90, 0, 0], front_scale=[0.55, 0.55], style='porc')
            S.rod('ins_pin', [x, ya, 0.0], [x, ya + 0.02, 0.0], 0.012, sides=4, style='galv')
    # two pole-mounted transformers on brackets (x = +0.4 and -0.4), the leads up to the crossarm
    for x, y0, h, r in ((0.4, 5.28, 0.72, 0.19), (-0.4, 5.52, 0.48, 0.15)):
        S.prism('trans', 2 * r, 2 * r, h, [x, y0 + h / 2, 0], sides=10, rot=[-90, 0, 0], style='trans')
        S.prism('trans_lid', 2 * r - 0.02, 2 * r - 0.02, 0.05, [x, y0 + h + 0.025, 0], sides=10, rot=[-90, 0, 0], front_scale=[0.75, 0.75],
                paint={'ramp': 'trans', 'tone': 3.0})
        S.prism('bushing', 0.05, 0.05, 0.1, [x, y0 + h + 0.1, 0.05], sides=6, rot=[-90, 0, 0], style='porc')
        for yy in (y0 + 0.15, y0 + h - 0.15):
            S.box('trans_brkt', abs(x) - 0.1, 0.05, 0.08, x / 2 + (0.05 if x > 0 else -0.05), yy, 0, style='galv')
        S.rod('lead', [x, y0 + h + 0.15, 0.05], [x * 2, 6.94, 0.0], 0.008, sides=4, paint={'ramp': 'ink', 'tone': 1.4})
    # telecom clamp and cable closure on the lane side
    S.box('clamp', 0.3, 0.06, 0.3, 0, 4.98, 0, style='galv')
    S.box('closure', 0.16, 0.5, 0.16, 0.24, 4.6, 0.0, chamfer=0.02, paint={'ramp': 'ink', 'tone': 2.0, 'layers': [
        {'op': 'stripes', 'axis': 'y', 'period': 0.08, 'width': 0.2, 'shift': 0.8}]})
    return S


def specs():
    return {'utility_pole': utility_pole()}
