"""Hand-made lowpix models replacing the AI-generated sources the audit rejected (tools/ai-check.py): the 50cc
scooter, the wagasa parasol, the rope coil, the rice cooker, the mall's astronaut statue, and the park slide (its
source was flagged for review). Each is modelled from real reference, in metres, bottom centre at the origin, front +z,
in the orientation of the prop it draws (src/world/props.js fits it into the prop's own box).
"""
import math

from arch import Spec, ramp, photo


def _base(S):
    S.ramps(
        red=ramp('#b8382e', 7, hue=14, sat=0.04, spread=0.8), cream=ramp('#e6dcc4', 7, hue=10, sat=0.03, spread=0.7),
        chrome=ramp('#a8b0b6', 7, hue=10, sat=0.02, spread=0.9), rubber=ramp('#2a2a2c', 6, hue=8, sat=0.02, spread=0.6),
        black=ramp('#26262a', 6, hue=10, sat=0.02, spread=0.7), steel=ramp('#8e969a', 7, hue=10, sat=0.02, spread=0.75),
        rust=ramp('#6a3a26', 6, hue=14, sat=0.02, spread=0.75), yellow=ramp('#e2b02a', 6, hue=14, sat=0.04, spread=0.7),
        blue=ramp('#2f62a8', 6, hue=12, sat=0.04, spread=0.7), green=ramp('#3a8a4a', 6, hue=12, sat=0.04, spread=0.7),
        bamboo=ramp('#b89a5a', 7, hue=12, sat=0.04, spread=0.75), wood=ramp('#6a4a30', 7, hue=12, sat=0.04, spread=0.8),
        rope=ramp('#b49a68', 7, hue=12, sat=0.04, spread=0.8), white=ramp('#e8e6e0', 6, hue=8, sat=0.02, spread=0.6),
        pink=ramp('#d87a8a', 6, hue=12, sat=0.04, spread=0.7), glass=ramp('#3e4a52', 6, hue=12, sat=0.03, spread=0.8),
        conc=ramp('#9c978d', 7, hue=8, sat=0.02, spread=0.75), orange=ramp('#d8742a', 6, hue=14, sat=0.04, spread=0.7),
    )
    S.d['light'] = {'dir': [-0.45, 1.0, 0.6], 'strength': 0.45, 'gradient': 0.25, 'ao': 0.5, 'ao_height': 0.4}
    rim = {'light_shift': 1.0, 'dark_shift': -1.0}
    S.style('paint', rim=rim, layers=[{'id': 'mottle', 'op': 'noise', 'scale': 0.06, 'amount': 0.3},
                                      {'id': 'chips', 'op': 'wear', 'width': 1, 'density': 0.25, 'ramp': 'rust', 'tone': 2.4}])
    S.style('chrome', ramp='chrome', tone=4.2, rim={'light_shift': 1.6, 'dark_shift': -1.6}, brush={'flow': 'long'},
            layers=[{'id': 'gloss', 'op': 'gloss', 'dash': True, 'density': 0.5, 'shift': 1.5}])
    S.style('rubber', ramp='rubber', tone=2.4, rim={'light_shift': 0.6, 'dark_shift': -0.6},
            layers=[{'id': 'tread', 'op': 'stripes', 'axis': 'z', 'period': 0.02, 'width': 0.3, 'shift': -0.8, 'faces': ['sides']}])
    S.style('steel', ramp='steel', tone=3.6, rim=rim, layers=[{'id': 'mottle', 'op': 'noise', 'scale': 0.08, 'amount': 0.35},
                                                             {'id': 'rust', 'op': 'patches', 'scale': 0.08, 'threshold': 0.7, 'ramp': 'rust', 'tone': 2.6}])


def wheel(S, id, x, y, z, r, w, rim_r):
    S.prism(id + '_tyre', 2 * r, 2 * r, w, [x, y, z], sides=14, rot=[0, 90, 0], style='rubber')
    S.prism(id + '_rim', 2 * rim_r, 2 * rim_r, w + 0.01, [x, y, z], sides=12, rot=[0, 90, 0], style='chrome')
    S.prism(id + '_hub', 0.06, 0.06, w + 0.03, [x, y, z], sides=8, rot=[0, 90, 0], paint={'ramp': 'black', 'tone': 2.5})


def scooter():
    """A late-80s / 90s Japanese 50cc step-through scooter (原付): red body, cream leg shield and floor, round headlamp
    on the handlebar cowl, 10-inch wheels, chrome muffler and grab rail, a square tail lamp, mirrors on stalks."""
    S = Spec('scooter', ppm=256, desc='50cc scooter (made for the game)')
    _base(S)
    body = {'ramp': 'red', 'tone': 3.6}
    cream = {'ramp': 'cream', 'tone': 4.0}
    wheel(S, 'fw', 0, 0.2, 0.56, 0.2, 0.09, 0.12)
    wheel(S, 'rw', 0, 0.2, -0.5, 0.2, 0.1, 0.12)
    # floorboard and the frame tunnel under it
    S.box('floor', 0.3, 0.06, 0.62, 0, 0.26, 0.06, style='paint', paint=cream, chamfer=0.015)
    S.box('floor_mat', 0.26, 0.012, 0.5, 0, 0.32, 0.06, paint={'ramp': 'black', 'tone': 2.2, 'layers': [
        {'op': 'stripes', 'axis': 'z', 'period': 0.03, 'width': 0.4, 'shift': 0.8}]})
    # the leg shield rising to the steering head, tapering
    S.taper('shield', [0.42, 0.62, 0.08], [0, 0.6, 0.38], rot=[-12, 0, 0], front_scale=[1, 1], back_scale=[0.9, 1],
            style='paint', paint=body, chamfer=0.02)
    S.taper('apron', [0.36, 0.5, 0.06], [0, 0.6, 0.33], rot=[-12, 0, 0], style='paint', paint=cream, chamfer=0.015)
    # front fender over the wheel and the fork
    S.taper('fender', [0.18, 0.08, 0.36], [0, 0.42, 0.58], rot=[-8, 0, 0], front_scale=[0.8, 0.6], style='paint', paint=body, chamfer=0.02)
    for sx in (-1, 1):
        S.rod('fork', [sx * 0.06, 0.2, 0.58], [sx * 0.05, 0.6, 0.47], 0.018, style='chrome')
    S.rod('stem', [0, 0.6, 0.46], [0, 0.98, 0.4], 0.025, style='steel')
    # the handlebar cowl with the round headlamp, the bar ends and grips, mirrors
    S.box('cowl', 0.42, 0.13, 0.18, 0, 0.94, 0.42, style='paint', paint=body, chamfer=0.03)
    S.prism('lamp', 0.14, 0.14, 0.04, [0, 1.0, 0.52], sides=12, paint={'ramp': 'chrome', 'tone': 5, 'layers': [
        {'op': 'spots', 'faces': ['front'], 'centers': [[0, 0, 0.02, 0.055]], 'ramp': 'cream', 'tone': 5.2}]})
    for sx in (-1, 1):
        S.rod('grip', [sx * 0.2, 0.98, 0.4], [sx * 0.31, 0.98, 0.38], 0.02, paint={'ramp': 'black', 'tone': 2.2})
        S.rod('mstalk', [sx * 0.17, 1.0, 0.42], [sx * 0.23, 1.2, 0.4], 0.008, style='chrome')
        S.box('mirror', 0.1, 0.07, 0.015, sx * 0.24, 1.18, 0.4, style='chrome', chamfer=0.01)
        S.box('blinker', 0.05, 0.03, 0.04, sx * 0.19, 0.92, 0.5, paint={'ramp': 'orange', 'tone': 4})
    # the rear body: a smooth cowl over the engine, the seat on top, the tail lamp, the grab rail
    S.taper('rear', [0.32, 0.36, 0.66], [0, 0.48, -0.33], front_scale=[0.95, 0.9], back_scale=[0.7, 0.7], style='paint', paint=body, chamfer=0.06)
    S.taper('seat', [0.28, 0.1, 0.56], [0, 0.71, -0.26], front_scale=[0.85, 0.9], back_scale=[0.9, 0.9],
            paint={'ramp': 'black', 'tone': 2.6, 'layers': [{'op': 'stripes', 'axis': 'x', 'period': 0.07, 'width': 0.12, 'shift': -0.6}]}, chamfer=0.04)
    S.box('tail', 0.12, 0.05, 0.03, 0, 0.56, -0.67, paint={'ramp': 'red', 'tone': 5.0}, chamfer=0.01)
    S.box('plate', 0.12, 0.07, 0.01, 0, 0.44, -0.68, paint={'ramp': 'white', 'tone': 4, 'layers': [
        {'op': 'stripes', 'axis': 'y', 'period': 0.025, 'width': 0.3, 'ramp': 'blue', 'tone': 2.6}]})
    S.rod('rail', [-0.13, 0.66, -0.58], [0.13, 0.66, -0.58], 0.012, style='chrome')
    for sx in (-1, 1):
        S.rod('rail_s', [sx * 0.13, 0.66, -0.58], [sx * 0.14, 0.64, -0.3], 0.012, style='chrome')
    # engine unit and swing arm on the left, the chrome muffler on the right
    S.box('engine', 0.12, 0.14, 0.36, -0.1, 0.13, -0.38, style='steel', chamfer=0.02)
    S.rod('muffler', [0.13, 0.22, -0.2], [0.13, 0.26, -0.68], 0.045, sides=10, style='chrome')
    S.box('stand', 0.2, 0.02, 0.04, 0, 0.02, -0.25, style='steel')
    return S


def wagasa():
    """A big red wagasa parasol (野点傘) on a bamboo pole: oiled-paper canopy over 24 bamboo ribs, the white ring
    (蛇の目) near the rim, the lacquered head, a stand stone at the foot."""
    S = Spec('wagasa_parasol', ppm=128, desc='Wagasa parasol (made for the game)')
    _base(S)
    paper = {'ramp': 'red', 'tone': 3.4, 'brush': {'off': True}, 'rim': {'light_shift': 0.5, 'dark_shift': -0.5}, 'layers': [
        {'id': 'ribs', 'op': 'stripes', 'axis': 'around', 'period': 1 / 24, 'width': 0.12, 'shift': -0.8},
        {'id': 'ring', 'op': 'band', 'axis': 'z', 'from': -0.72, 'to': -0.6, 'ramp': 'white', 'tone': 3.8},
        {'id': 'oil', 'op': 'noise', 'scale': 0.15, 'amount': 0.4},
        {'id': 'under', 'op': 'fill', 'faces': ['back'], 'ramp': 'red', 'tone': 2.4}]}
    S.prism('canopy', 1.7, 1.7, 0.42, [0, 2.0, 0], sides=24, rot=[-90, 0, 0], front_scale=[0.04, 0.04], paint=paper)
    S.prism('head', 0.08, 0.08, 0.06, [0, 2.24, 0], sides=10, rot=[-90, 0, 0], paint={'ramp': 'black', 'tone': 2})
    for i in range(12):  # the ribs underneath, from the runner to the rim
        a = math.radians(i * 30)
        S.rod('rib', [0.05 * math.sin(a), 1.62, 0.05 * math.cos(a)], [0.82 * math.sin(a), 1.8, 0.82 * math.cos(a)], 0.006, sides=4,
              paint={'ramp': 'bamboo', 'tone': 3.4})
    S.prism('runner', 0.08, 0.08, 0.1, [0, 1.62, 0], sides=8, rot=[-90, 0, 0], paint={'ramp': 'bamboo', 'tone': 3})
    S.prism('pole', 0.04, 0.04, 2.0, [0, 1.12, 0], sides=8, rot=[-90, 0, 0], paint={'ramp': 'bamboo', 'tone': 3.6, 'layers': [
        {'op': 'stripes', 'axis': 'z', 'period': 0.35, 'width': 0.04, 'shift': -1.2}]})
    S.prism('stone', 0.36, 0.36, 0.14, [0, 0.07, 0], sides=10, rot=[-90, 0, 0], front_scale=[0.85, 0.85],
            paint={'ramp': 'conc', 'tone': 3.4, 'layers': [photo('concrete_wall_003', scale=0.4, amount=0.6)]})
    return S


def rope_coil():
    """A coil of hemp rope: four stacked turns of three-strand rope (the twist painted along each turn), a loose end."""
    S = Spec('rope_coil', ppm=320, desc='Coil of hemp rope (made for the game)')
    _base(S)
    rope = {'ramp': 'rope', 'tone': 3.6, 'brush': {'off': True}, 'layers': [
        {'id': 'twist', 'op': 'stripes', 'axis': 'path', 'period': 0.03, 'width': 0.35, 'shift': -1.2, 'zigzag': [0.012, 0.05], 'zig_axis': 'around'},
        {'id': 'fibre', 'op': 'noise', 'scale': 0.01, 'amount': 0.4}]}
    R, r = 0.16, 0.022
    for k, (rr, y) in enumerate(((R, r), (R - 0.004, 3 * r - 0.004), (R + 0.004, 5 * r - 0.008), (R - 0.002, 7 * r - 0.012))):
        rings = [{'at': [rr * math.cos(t), y, rr * math.sin(t)], 'size': 2 * r} for t in [i * 2 * math.pi / 16 for i in range(17)]]
        S.part(f'turn{k}', 'loft', [0, 0, 0], [0, 0, 0], rings=rings, profile={'sides': 8, 'round': 2.2}, subdiv=1, paint=rope)
    rings = [{'at': [R, 7 * r, 0.0], 'size': 2 * r}, {'at': [R + 0.05, 6 * r, 0.08], 'size': 2 * r},
             {'at': [R + 0.08, r, 0.16], 'size': 2 * r}, {'at': [R + 0.06, r, 0.26], 'size': 1.6 * r}]
    S.part('end', 'loft', [0, 0, 0], [0, 0, 0], rings=rings, profile={'sides': 8, 'round': 2.2}, subdiv=1, paint=rope)
    return S


def rice_cooker():
    """A 1990s electric rice cooker (炊飯器): a cream body printed with a band of pink flowers, the domed lid with its
    steam vent and the carry handle, a front panel with the keep-warm button and lamps, the rice paddle in its holder."""
    S = Spec('rice_cooker', ppm=480, desc='Electric rice cooker (made for the game)')
    _base(S)
    flowers = [[0.1 * math.cos(a), 0.0, 0.1 * math.sin(a), 0.016] for a in [i * math.pi / 5 for i in range(10)]]
    S.prism('body', 0.3, 0.3, 0.2, [0, 0.12, 0], sides=16, rot=[-90, 0, 0], front_scale=[0.96, 0.96],
            paint={'ramp': 'cream', 'tone': 4.0, 'brush': {'off': True}, 'layers': [
                {'id': 'band', 'op': 'band', 'axis': 'z', 'from': -0.2, 'to': 0.5, 'ramp': 'white', 'tone': 4.2},
                {'id': 'flowers', 'op': 'spots', 'centers': [[c[0] * 1.45, c[2] * 1.45, 0.02, c[3]] for c in flowers], 'ramp': 'pink', 'tone': 3.4, 'bevel': True},
                {'id': 'leaves', 'op': 'spots', 'count': 18, 'radius': [0.006, 0.01], 'where': {'z': [-0.04, 0.05]}, 'ramp': 'green', 'tone': 3.2},
                {'id': 'grime', 'op': 'gradient', 'axis': 'z', 'amount': 0.4}]})
    S.prism('foot', 0.28, 0.28, 0.02, [0, 0.01, 0], sides=16, rot=[-90, 0, 0], paint={'ramp': 'black', 'tone': 2.4})
    S.prism('lid', 0.29, 0.29, 0.06, [0, 0.25, 0], sides=16, rot=[-90, 0, 0], front_scale=[0.72, 0.72],
            paint={'ramp': 'cream', 'tone': 4.3, 'brush': {'off': True}, 'layers': [{'op': 'noise', 'scale': 0.02, 'amount': 0.3}]})
    S.prism('vent', 0.05, 0.05, 0.015, [0.0, 0.285, -0.03], sides=8, rot=[-90, 0, 0], paint={'ramp': 'chrome', 'tone': 3.4})
    S.box('handle', 0.2, 0.02, 0.03, 0, 0.3, 0.02, paint={'ramp': 'black', 'tone': 2.6}, chamfer=0.006)
    for sx in (-1, 1):
        S.box('handle_post', 0.02, 0.05, 0.03, sx * 0.1, 0.255, 0.02, paint={'ramp': 'black', 'tone': 2.6})
    S.box('panel', 0.12, 0.07, 0.03, 0, 0.1, 0.145, chamfer=0.008, paint={'ramp': 'white', 'tone': 4.0, 'layers': [
        {'op': 'rect', 'faces': ['front'], 'rect': [0.15, 0.2, 0.55, 0.6], 'ramp': 'orange', 'tone': 4.2, 'bevel': True},
        {'op': 'rect', 'faces': ['front'], 'rect': [0.68, 0.6, 0.78, 0.75], 'ramp': 'red', 'tone': 4.4},
        {'op': 'rect', 'faces': ['front'], 'rect': [0.68, 0.3, 0.78, 0.45], 'ramp': 'green', 'tone': 4.2}]})
    S.box('paddle_holder', 0.04, 0.08, 0.025, 0.15, 0.12, 0.05, paint={'ramp': 'cream', 'tone': 3.6})
    S.box('paddle', 0.03, 0.12, 0.008, 0.155, 0.16, 0.05, paint={'ramp': 'white', 'tone': 4.4}, chamfer=0.004)
    S.rod('cord', [-0.14, 0.05, -0.06], [-0.22, 0.01, -0.2], 0.006, sides=4, paint={'ramp': 'black', 'tone': 2.2})
    return S


def astronaut():
    """A shop statue of an astronaut in a white 1990s-style suit: the round helmet with its gold visor, the life-support
    backpack, the chest control box, ribbed joints, the mission patches, boots and gloves, standing on a round plinth."""
    S = Spec('astronaut', ppm=160, desc='Astronaut statue (made for the game)')
    _base(S)
    suit = {'ramp': 'white', 'tone': 4.0, 'layers': [{'op': 'noise', 'scale': 0.05, 'amount': 0.35},
                                                      {'op': 'stripes', 'axis': 'path', 'period': 0.05, 'width': 0.25, 'shift': -0.6}]}
    S.prism('plinth', 0.7, 0.7, 0.16, [0, 0.08, 0], sides=16, rot=[-90, 0, 0], paint={'ramp': 'blue', 'tone': 2.6, 'layers': [
        {'op': 'band', 'axis': 'z', 'from': 0.6, 'to': 1, 'ramp': 'yellow', 'tone': 3.6}]})
    for sx in (-1, 1):  # legs: boot, shin, thigh as lofts down to the boots
        x = sx * 0.11
        S.part(f'leg{sx}', 'loft', [0, 0, 0], [0, 0, 0], rings=[{'at': [x, 0.98, 0], 'size': [0.17, 0.18]}, {'at': [x, 0.62, 0.02], 'size': 0.15},
               {'at': [x, 0.3, 0.0], 'size': 0.14}, {'at': [x, 0.2, 0.0], 'size': 0.13}], profile={'sides': 10, 'round': 2.4}, paint=suit)
        S.box(f'boot{sx}', 0.15, 0.13, 0.26, x, 0.16, 0.04, paint={'ramp': 'cream', 'tone': 3.6, 'layers': [
            {'op': 'band', 'axis': 'y', 'from': -1, 'to': -0.5, 'ramp': 'black', 'tone': 2.4}]}, chamfer=0.04)
    S.part('torso', 'loft', [0, 0, 0], [0, 0, 0], rings=[{'at': [0, 0.95, 0], 'size': [0.36, 0.24]}, {'at': [0, 1.2, 0], 'size': [0.38, 0.26]},
           {'at': [0, 1.45, 0], 'size': [0.44, 0.28]}, {'at': [0, 1.55, 0], 'size': [0.3, 0.22]}], profile={'sides': 12, 'round': 2.6}, paint=suit)
    S.box('chest_box', 0.22, 0.13, 0.08, 0, 1.24, 0.15, chamfer=0.015, paint={'ramp': 'white', 'tone': 3.4, 'layers': [
        {'op': 'rect', 'faces': ['front'], 'rect': [0.1, 0.55, 0.3, 0.8], 'ramp': 'red', 'tone': 4},
        {'op': 'rect', 'faces': ['front'], 'rect': [0.4, 0.55, 0.6, 0.8], 'ramp': 'blue', 'tone': 4},
        {'op': 'rect', 'faces': ['front'], 'rect': [0.7, 0.55, 0.9, 0.8], 'ramp': 'yellow', 'tone': 4},
        {'op': 'rect', 'faces': ['front'], 'rect': [0.1, 0.15, 0.9, 0.4], 'ramp': 'black', 'tone': 2.4}]})
    S.box('pack', 0.4, 0.5, 0.2, 0, 1.08, -0.2, chamfer=0.04, paint={'ramp': 'white', 'tone': 3.8, 'layers': [
        {'op': 'panel', 'inset': 3, 'shift': -0.6}, {'op': 'rivets', 'spacing': 8, 'inset': 2, 'ramp': 'chrome', 'tone': 4}]})
    for sx in (-1, 1):
        S.part(f'arm{sx}', 'loft', [0, 0, 0], [0, 0, 0], rings=[{'at': [sx * 0.24, 1.48, 0], 'size': 0.14}, {'at': [sx * 0.3, 1.22, 0.03], 'size': 0.12},
               {'at': [sx * 0.31, 1.0, 0.08], 'size': 0.11}], profile={'sides': 10, 'round': 2.4}, paint=suit)
        S.box(f'glove{sx}', 0.1, 0.12, 0.1, sx * 0.31, 0.88, 0.1, paint={'ramp': 'cream', 'tone': 3.4}, chamfer=0.03)
        S.box(f'patch{sx}', 0.005, 0.06, 0.06, sx * 0.285, 1.36, 0.02, paint={'ramp': 'blue', 'tone': 3.4, 'layers': [
            {'op': 'rect', 'rect': [0.2, 0.2, 0.8, 0.8], 'ramp': 'red' if sx < 0 else 'yellow', 'tone': 4}]})
    S.part('neck_ring', 'prism', [0.26, 0.26, 0.05], [0, 1.58, 0], sides=14, rot=[-90, 0, 0], paint={'ramp': 'chrome', 'tone': 4})
    S.part('helmet', 'loft', [0, 0, 0], [0, 0, 0], rings=[{'at': [0, 1.58, 0], 'size': 0.26}, {'at': [0, 1.68, 0], 'size': 0.34},
           {'at': [0, 1.8, 0], 'size': 0.33}, {'at': [0, 1.9, 0], 'size': 0.2}, {'at': [0, 1.93, 0], 'size': 0.0}],
           profile={'sides': 14, 'round': 2.0}, paint={'ramp': 'white', 'tone': 4.2, 'layers': [
               {'id': 'visor', 'op': 'spots', 'centers': [[0, 0.0, 0.16, 0.12]], 'stretch': [1.2, 0.8, 1], 'ramp': 'yellow', 'tone': 3.2, 'bevel': True},
               {'id': 'shine', 'op': 'gloss', 'density': 0.4, 'shift': 1.2}]})
    return S


def slide():
    """A 1990s park slide: a steel ladder at the back (-z), the platform with its hoop rails, a stainless chute running
    down to the front (+z), the frame painted red and yellow, chipped and rusting at the joints."""
    S = Spec('slide', ppm=128, desc='Park slide (made for the game)')
    _base(S)
    red = {'ramp': 'red', 'tone': 3.6}
    yel = {'ramp': 'yellow', 'tone': 3.6}
    PY, Z0, Z1, W = 1.48, -1.6, -0.88, 0.8
    S.box('deck', W, 0.05, Z1 - Z0, 0, PY - 0.05, (Z0 + Z1) / 2, style='steel', paint={'layers': [
        {'op': 'stripes', 'axis': 'x', 'period': 0.06, 'width': 0.3, 'shift': -0.8, 'faces': ['top']}]})
    for px, pz in ((-W / 2, Z0), (W / 2, Z0), (-W / 2, Z1), (W / 2, Z1)):
        S.rod('post', [px, 0, pz], [px, PY + 0.6, pz], 0.025, sides=8, style='paint', paint=red)
    for sx in (-1, 1):
        for y in (PY + 0.32, PY + 0.6):
            S.rod('rail', [sx * W / 2, y, Z0], [sx * W / 2, y, Z1], 0.018, sides=8, style='paint', paint=yel)
    S.rod('rail_back', [-W / 2, PY + 0.6, Z0], [W / 2, PY + 0.6, Z0], 0.018, sides=8, style='paint', paint=yel)
    # the ladder at the back
    for sx in (-1, 1):
        S.rod('stringer', [sx * 0.32, 0, Z0 - 0.48], [sx * 0.32, PY + 0.56, Z0 - 0.04], 0.022, sides=8, style='paint', paint=red)
    for k in range(1, 6):
        t = k / 6
        S.rod('rung', [-0.32, PY * t, Z0 - 0.48 + 0.44 * t], [0.32, PY * t, Z0 - 0.48 + 0.44 * t], 0.016, sides=6, style='steel')
    # the stainless chute with its side walls, from the deck down to the run-out at the front
    L0, Y0, L1, Y1 = Z1, PY - 0.03, Z1 + 2.2, 0.32
    S.slope('chute', -0.25, 0.25, L1, Y1, L0, Y0, 0.03, style='chrome', paint={'layers': [
        {'op': 'stripes', 'axis': 'x', 'period': 0.5, 'width': 0.04, 'shift': -1.0},
        {'op': 'patches', 'scale': 0.2, 'threshold': 0.7, 'shift': -0.6}]})
    for sx in (-1, 1):
        S.slab('chute_wall', [sx * 0.27, Y0 + 0.08, L0], [sx * 0.27, Y1 + 0.08, L1], 0.03, 0.18, style='chrome')
    S.box('runout', 0.5, 0.03, 0.4, 0, Y1 - 0.06, L1 + 0.18, style='chrome')
    for sx in (-1, 1):
        S.rod('chute_leg', [sx * 0.25, 0, L1 - 0.1], [sx * 0.25, Y1 - 0.04, L1 - 0.1], 0.02, sides=8, style='paint', paint=red)
        S.rod('chute_leg2', [sx * 0.25, 0, L1 + 0.32], [sx * 0.25, Y1 - 0.06, L1 + 0.32], 0.02, sides=8, style='paint', paint=red)
    return S


def specs():
    # (the rice cooker is kept as a spec only: ASSETS replaced the rejected one with a museum scan)
    return {'scooter': scooter(), 'wagasa_parasol': wagasa(), 'rope_coil': rope_coil(), 'astronaut': astronaut(), 'slide': slide()}
