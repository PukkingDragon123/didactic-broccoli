"""The children's park's play equipment frames (world coordinates, src/world/Park.js playground()): the jungle gym
(a 3 x 3 x 3 cube of round steel pipe, each level its own colour, cast joint knuckles), the three horizontal bars
(鉄棒) on red posts with chrome bars and white caps, and the swing set's safety rails. Painted steel gone chalky,
chipped to rust at the joints and worn bright where hands go. Reference: 1980s-90s Japanese 児童公園 equipment.
"""
from arch import Spec, ramp

COLS = {'red': '#c8382e', 'blue': '#2f62a8', 'yellow': '#e2b42a', 'green': '#3a9a52'}


def playground():
    S = Spec('playground', ppm=192, desc='Park play equipment: jungle gym, horizontal bars, swing rails')
    S.ramps(rust=ramp('#6a3a26', 6, hue=14, sat=0.02, spread=0.75), chrome=ramp('#a8b0b6', 7, hue=10, sat=0.02, spread=0.85),
            white=ramp('#e6e2d8', 6, hue=8, sat=0.02, spread=0.6), **{k: ramp(c, 7, hue=14, sat=0.04, spread=0.8) for k, c in COLS.items()})
    rim = {'light_shift': 1.0, 'dark_shift': -1.0}
    for k in COLS:
        S.style(k, ramp=k, tone=3.6, rim=rim, brush={'flow': 'long'}, layers=[
            {'id': 'chalk', 'op': 'noise', 'scale': 0.08, 'amount': 0.4},
            {'id': 'rust', 'op': 'patches', 'scale': 0.06, 'threshold': 0.72, 'ramp': 'rust', 'tone': 2.6},
            {'id': 'chips', 'op': 'spots', 'count': 6, 'radius': [0.004, 0.01], 'ramp': 'rust', 'tone': 2.2}])
    S.style('chrome', ramp='chrome', tone=4.2, rim={'light_shift': 1.5, 'dark_shift': -1.4}, brush={'flow': 'long'},
            layers=[{'id': 'worn', 'op': 'noise', 'scale': 0.05, 'amount': 0.4}])
    # jungle gym
    cx, cz, n, s = 16.4, -13.3, 3, 0.55
    x0, z0 = cx - n * s / 2, cz - n * s / 2
    level = ['red', 'blue', 'yellow', 'green']
    for i in range(n + 1):
        for k in range(n + 1):
            S.rod('jg_post', [x0 + i * s, 0, z0 + k * s], [x0 + i * s, n * s + 0.04, z0 + k * s], 0.024, sides=6, style='red')
    for j in range(1, n + 1):
        for i in range(n + 1):
            S.rod('jg_x', [x0, j * s, z0 + i * s], [x0 + n * s, j * s, z0 + i * s], 0.02, sides=6, style=level[j])
            S.rod('jg_z', [x0 + i * s, j * s - 0.02, z0], [x0 + i * s, j * s - 0.02, z0 + n * s], 0.02, sides=6, style=level[j])
            for k in range(n + 1):
                S.prism('jg_knuckle', 0.06, 0.06, 0.06, [x0 + i * s, j * s - 0.01, z0 + k * s], sides=6, style='red')
    # horizontal bars (鉄棒)
    xs, z = [20.2, 21.15, 22.1, 23.05], -16.8
    for x in xs:
        S.rod('hb_post', [x, 0, z], [x, 1.42, z], 0.035, sides=6, style='red')
        S.prism('hb_cap', 0.09, 0.09, 0.05, [x, 1.445, z], sides=8, rot=[-90, 0, 0], paint={'ramp': 'white', 'tone': 3.8})
    for i, y in enumerate((0.85, 1.05, 1.25)):
        S.rod('hb_bar', [xs[i], y, z], [xs[i + 1], y, z], 0.017, sides=6, style='chrome')
    # swing safety rails (open at the sides)
    for z in (-9.95, -14.45):
        x = 19.0
        while x <= 22.61:
            S.rod('sr_post', [x, 0, z], [x, 0.7, z], 0.03, sides=6, style='yellow')
            x += 1.2
        for y in (0.34, 0.7):
            S.rod('sr_rail', [18.97, y, z], [22.63, y, z], 0.025, sides=6, style='blue')
    return S


def specs():
    return {'playground': playground()}
