"""The ghost alley's fixtures (alley A1 beside Mikawa-ya, world coordinates, src/world/GhostAlley.js): the old red
round post box (丸型ポスト: a cast-iron drum with its domed cap, the slot, the collection-times plate), the wooden
lamp pole with its arm and green enamel shade, the Jizō shrine's offerings and its two small stone lanterns, the row
of concrete drain lids, weeds in the cracks, a dead umbrella, broken flower pots and a cobwebbed meter.
"""
import math

from arch import Spec, ramp, photo

PX, PZ = -7.86, 15.25
LX, LZ = -7.62, 18.35


def hash2(a, b):
    h = math.sin(a * 127.1 + b * 311.7) * 43758.5453
    return h - math.floor(h)


def ghost_alley():
    S = Spec('ghost_alley', ppm=160, desc='Ghost alley fixtures: post box, lamp, shrine offerings, drain, weeds')
    S.ramps(red=ramp('#b82a20', 7, hue=14, sat=0.04, spread=0.8), iron=ramp('#2a2a2c', 6, hue=10, sat=0.02, spread=0.7),
            cream=ramp('#e8e2d2', 6, hue=8, sat=0.02, spread=0.6), wood=ramp('#5a4a3a', 7, hue=12, sat=0.04, spread=0.8),
            enamel=ramp('#2e5a3e', 6, hue=14, sat=0.04, spread=0.75), stone=ramp('#8a8880', 7, hue=8, sat=0.02, spread=0.75),
            conc=ramp('#8e8a82', 7, hue=8, sat=0.02, spread=0.75), weed=ramp('#4a6a32', 6, hue=16, sat=0.05, spread=0.8),
            terra=ramp('#a8583a', 6, hue=12, sat=0.04, spread=0.75), rust=ramp('#6a3a26', 6, hue=14, sat=0.02, spread=0.75),
            gold=ramp('#c8a840', 6, hue=14, sat=0.04, spread=0.7), navy=ramp('#3a3a5a', 6, hue=12, sat=0.03, spread=0.7),
            pink=ramp('#e8a0b8', 5, hue=12, sat=0.04, spread=0.6), yellow=ramp('#f0e0a0', 5, hue=12, sat=0.04, spread=0.6))
    rim = {'light_shift': 0.9, 'dark_shift': -0.9}
    S.style('red', ramp='red', tone=3.6, rim=rim, layers=[{'id': 'chalk', 'op': 'noise', 'scale': 0.05, 'amount': 0.4},
                                                         {'id': 'rust', 'op': 'patches', 'scale': 0.05, 'threshold': 0.7, 'ramp': 'rust', 'tone': 2.4},
                                                         {'id': 'grime', 'op': 'gradient', 'axis': 'z', 'amount': 0.5}])
    S.style('stone', ramp='stone', tone=3.4, rim=rim, layers=[photo('concrete_wall_003', scale=0.5, amount=0.7),
                                                             {'id': 'moss', 'op': 'patches', 'scale': 0.06, 'threshold': 0.65, 'ramp': 'weed', 'tone': 2.4}])
    S.style('wood', ramp='wood', tone=3.2, rim=rim, brush={'flow': 'long'}, layers=[photo('weathered_planks', scale=0.6, amount=0.6)])
    # the round post box
    S.prism('post_foot', 0.48, 0.48, 0.1, [PX, 0.05, PZ], sides=14, rot=[-90, 0, 0], paint={'ramp': 'iron', 'tone': 2.2})
    S.prism('post_drum', 0.42, 0.42, 1.05, [PX, 0.62, PZ], sides=14, rot=[-90, 0, 0], style='red')
    S.prism('post_cap', 0.46, 0.46, 0.12, [PX, 1.2, PZ], sides=14, rot=[-90, 0, 0], front_scale=[0.74, 0.74], style='red')
    S.prism('post_dome', 0.34, 0.34, 0.08, [PX, 1.3, PZ], sides=14, rot=[-90, 0, 0], front_scale=[0.35, 0.35], style='red')
    S.box('post_slot', 0.04, 0.03, 0.2, PX - 0.2, 0.98, PZ, paint={'ramp': 'iron', 'tone': 1.2})
    S.box('post_plate', 0.02, 0.18, 0.13, PX - 0.205, 0.62, PZ, paint={'ramp': 'cream', 'tone': 4, 'layers': [
        {'op': 'stripes', 'axis': 'y', 'period': 0.03, 'width': 0.3, 'ramp': 'iron', 'tone': 1.8, 'range': [-0.7, 0.6]}]})
    S.box('post_door', 0.02, 0.06, 0.13, PX - 0.21, 0.52, PZ, style='red')
    # the lamp on its pole
    S.box('lamp_pole', 0.12, 3.05, 0.12, LX, 0, LZ, style='wood', chamfer=0.01, hide=['bottom'])
    S.box('lamp_arm', 0.62, 0.05, 0.05, LX - 0.3, 2.8, LZ, paint={'ramp': 'iron', 'tone': 2.6})
    S.rod('lamp_drop', [LX - 0.56, 2.8, LZ], [LX - 0.56, 2.64, LZ], 0.012, sides=6, paint={'ramp': 'iron', 'tone': 2.4})
    S.prism('lamp_shade', 0.32, 0.32, 0.09, [LX - 0.56, 2.6, LZ], sides=12, rot=[-90, 0, 0], front_scale=[0.4, 0.4],
            paint={'ramp': 'enamel', 'tone': 3.2, 'layers': [{'op': 'fill', 'faces': ['back'], 'ramp': 'cream', 'tone': 4.2},
                                                             {'op': 'wear', 'width': 1, 'density': 0.5, 'ramp': 'iron', 'tone': 1.6}]})
    S.box('lamp_box', 0.1, 0.08, 0.04, LX + 0.06, 1.6, LZ, paint={'ramp': 'cream', 'tone': 3.6})
    # the shrine's offerings and its two stone lanterns
    S.prism('cup', 0.08, 0.08, 0.08, [-8.62, 0.46, 21.05], sides=10, rot=[-90, 0, 0], paint={'ramp': 'cream', 'tone': 4})
    S.prism('sake', 0.06, 0.06, 0.13, [-8.24, 0.485, 21.05], sides=10, rot=[-90, 0, 0], front_scale=[0.6, 0.6], paint={'ramp': 'cream', 'tone': 4.2})
    S.prism('coins', 0.06, 0.06, 0.03, [-8.42, 0.435, 20.98], sides=10, rot=[-90, 0, 0], paint={'ramp': 'gold', 'tone': 3.6})
    for x, c in ((-8.78, 'yellow'), (-8.06, 'pink')):
        S.prism('vase', 0.06, 0.06, 0.16, [x, 0.5, 21.1], sides=8, rot=[-90, 0, 0], style='stone')
        S.rod('stem', [x, 0.56, 21.1], [x + 0.02, 0.66, 21.1], 0.01, sides=4, paint={'ramp': 'weed', 'tone': 3})
        S.prism('bloom', 0.08, 0.08, 0.06, [x + 0.02, 0.68, 21.1], sides=8, rot=[-90, 0, 0], paint={'ramp': c, 'tone': 3.4})
    for x in (-9.05, -7.8):
        S.box('lantern_post', 0.16, 0.5, 0.16, x, 0, 21.0, style='stone', chamfer=0.02)
        S.box('lantern_tray', 0.26, 0.06, 0.26, x, 0.5, 21.0, style='stone', chamfer=0.015)
        S.box('lantern_fire', 0.14, 0.12, 0.14, x, 0.56, 21.0, style='stone', paint={'layers': [
            {'op': 'rect', 'faces': ['front', 'back', 'left', 'right'], 'rect': [0.25, 0.2, 0.75, 0.8], 'ramp': 'iron', 'tone': 1.4}]})
        S.taper('lantern_roof', [0.28, 0.1, 0.28], [x, 0.73, 21.0], rot=[-90, 0, 0], front_scale=[0.3, 0.3], style='stone')
    # the drain down the east side: concrete lids, a steel grating every few
    z, k = 15.6, 0
    while z < 21.5:
        grate = hash2(z * 10, 3) < 0.2
        S.box('lid', 0.28, 0.03, 0.56, -7.68, 0, z, style='stone' if not grate else None,
              paint={'ramp': 'iron', 'tone': 2.4, 'layers': [{'op': 'stripes', 'axis': 'x', 'period': 0.04, 'width': 0.4, 'shift': -1.2}]} if grate else None)
        z += 0.6
        k += 1
    # weeds in the cracks at the foot of both walls: crossed alpha-cut cards
    art = ['..g....g..', '..g...gg..', '.gg..gg...', '.g.g.g..g.', 'g..ggg.gg.', '.g.ggg.g..', '..gggggg..', '.ggggggg..']
    for i in range(14):
        zz = 15.4 + hash2(i, 5) * 6.2
        x = -9.24 if hash2(i, 6) < 0.5 else -7.61
        kk = hash2(i, 7)
        for ry in (0, 90):
            w = 0.18 + kk * 0.14
            S.part('weed', 'card', [w, w * 0.8], [x, w * 0.4, zz], art=art, plane='xy', rot=[0, ry + kk * 60, 0],
                   paint={'ramp': 'weed', 'tone': 3.2, 'art_key': {'g': 'weed:3'}, 'brush': {'off': True},
                          'layers': [{'op': 'gradient', 'axis': 'y', 'amount': 0.8}]})
    # an old broken umbrella, flower pots, the cobwebbed meter on Mikawa-ya's wall
    S.rod('umb_shaft', [-9.25, 0.0, 17.6], [-9.0, 0.85, 17.6], 0.012, sides=4, paint={'ramp': 'iron', 'tone': 2})
    S.taper('umb_canopy', [0.4, 0.4, 0.14], [-8.98, 0.78, 17.6], rot=[-90, 0, 28], front_scale=[0.1, 0.1], paint={'ramp': 'navy', 'tone': 3, 'layers': [
        {'op': 'patches', 'scale': 0.05, 'threshold': 0.6, 'shift': -1}]})
    S.prism('pot', 0.22, 0.22, 0.18, [-9.2, 0.09, 19.2], sides=10, rot=[-90, 0, 0], front_scale=[1.2, 1.2], paint={'ramp': 'terra', 'tone': 3.4})
    S.prism('pot_shard', 0.18, 0.18, 0.1, [-9.0, 0.05, 19.45], sides=6, rot=[-60, 30, 0], paint={'ramp': 'terra', 'tone': 3})
    S.box('meter', 0.06, 0.32, 0.26, -9.37, 1.35, 18.2, paint={'ramp': 'cream', 'tone': 3.4, 'layers': [
        {'op': 'rect', 'faces': ['right'], 'rect': [0.2, 0.55, 0.8, 0.85], 'ramp': 'iron', 'tone': 1.6, 'bevel': True}]}, chamfer=0.01)
    return S


def specs():
    return {'ghost_alley': ghost_alley()}
