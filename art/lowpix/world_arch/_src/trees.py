"""Park and garden trees, modelled in lowpix (replacing the voxel trunk and the cone pine): a keyaki (Japanese zelkova:
a short trunk splitting into upswept limbs, a vase-shaped crown of leaf clumps) and a Japanese black pine (kuromatsu:
a leaning, twisting trunk, horizontal limbs ending in flat cloud pads, as pruned in Japanese gardens). Bark is grey
flaking zelkova / plated pine bark; the clumps carry painted leaf texture (light from above, dark undersides, gaps).
Bottom centre at the origin, metres; the game instances them.
"""
import math

from arch import Spec, ramp, photo


def _mats(S, leaf, bark):
    S.ramps(leaf=ramp(leaf, 8, hue=18, sat=0.05, spread=0.85), bark=ramp(bark, 7, hue=10, sat=0.03, spread=0.8),
            moss=ramp('#5d6a3e', 6, hue=12, sat=0.03, spread=0.7))
    S.d['light'] = {'dir': [-0.45, 1.0, 0.6], 'strength': 0.7, 'gradient': 0.5, 'ao': 0.5, 'ao_height': 1.5}
    S.style('bark', ramp='bark', tone=3.4, brush={'flow': 'path', 'length': 0.3}, layers=[
        {'id': 'ridges', 'op': 'stripes', 'axis': 'around', 'period': 0.09, 'width': 0.3, 'shift': -1.0, 'wobble': 0.2},
        photo('weathered_planks', scale=0.8, amount=0.35),
        {'id': 'moss', 'op': 'patches', 'scale': 0.2, 'threshold': 0.7, 'ramp': 'moss', 'tone': 2.6}])
    S.style('leaf', ramp='leaf', tone=4.0, rim={'light_shift': 0.6, 'dark_shift': -1.2}, brush={'flow': 'vertical', 'length': 0.12, 'rough': 0.7}, layers=[
        {'id': 'clusters', 'op': 'spots', 'count': 60, 'radius': [0.06, 0.16], 'shift': 0.5, 'bevel': {'shadow': 1, 'highlight': 0}},
        {'id': 'gaps', 'op': 'spots', 'count': 30, 'radius': [0.04, 0.1], 'shift': -1.6},
        {'id': 'under', 'op': 'gradient', 'axis': 'y', 'amount': 1.2},
        {'id': 'mottle', 'op': 'noise', 'scale': 0.15, 'amount': 0.6}])


def limb(S, id, pts, r0, r1, sides=7):
    n = len(pts)
    rings = [{'at': p, 'size': 2 * (r0 + (r1 - r0) * i / (n - 1))} for i, p in enumerate(pts)]
    S.part(id, 'loft', [0, 0, 0], [0, 0, 0], rings=rings, profile={'sides': sides, 'round': 2.2}, subdiv=0, style='bark', caps=[True, True])


def clump(S, id, c, w, h, sides=8):
    x, y, z = c
    rings = [{'at': [x, y - h / 2, z], 'size': 0.0}, {'at': [x, y - h * 0.3, z], 'size': w * 0.8}, {'at': [x, y + h * 0.05, z], 'size': w},
             {'at': [x, y + h * 0.35, z], 'size': w * 0.75}, {'at': [x, y + h / 2, z], 'size': 0.0}]
    S.part(id, 'loft', [0, 0, 0], [0, 0, 0], rings=rings, profile={'sides': sides, 'round': 2.0}, subdiv=0, style='leaf')


def keyaki():
    S = Spec('tree_keyaki', ppm=40, desc='Keyaki (zelkova) park tree')
    _mats(S, '#4f7a3a', '#7a756a')
    limb(S, 'trunk', [[0, 0, 0], [0.02, 0.8, 0], [0.0, 1.7, 0.03], [0.0, 2.3, 0.0]], 0.26, 0.18, sides=8)
    tips = []
    for i, a in enumerate((20, 110, 200, 290)):
        r = math.radians(a)
        dx, dz = math.sin(r), math.cos(r)
        p = [[0, 2.2, 0], [dx * 0.5, 3.2, dz * 0.5], [dx * 1.1, 4.4, dz * 1.1], [dx * 1.5, 5.4, dz * 1.5]]
        limb(S, f'limb{i}', p, 0.15, 0.05)
        tips.append(p[-1])
        limb(S, f'twig{i}', [p[1], [p[1][0] + dz * 0.6, 4.0, p[1][2] - dx * 0.6], [p[1][0] + dz * 0.9, 4.7, p[1][2] - dx * 0.9]], 0.06, 0.03, sides=5)
    for i, t in enumerate(tips):
        clump(S, f'crown{i}', [t[0] * 1.05, t[1] + 0.4, t[2] * 1.05], 2.4, 2.0)
    clump(S, 'crown_top', [0, 6.2, 0], 2.8, 1.8)
    for i, a in enumerate((65, 155, 245, 335)):
        r = math.radians(a)
        clump(S, f'crown_mid{i}', [math.sin(r) * 1.4, 4.6, math.cos(r) * 1.4], 1.8, 1.5)
    return S


def pine():
    S = Spec('tree_pine', ppm=40, desc='Japanese black pine (kuromatsu), garden-pruned')
    _mats(S, '#2f5a32', '#5e5248')
    limb(S, 'trunk', [[0, 0, 0], [0.15, 0.9, 0.05], [0.05, 1.8, 0.2], [0.35, 2.6, 0.15], [0.3, 3.3, 0.0]], 0.2, 0.1, sides=8)
    pads = [([0.3, 3.5, 0.0], 1.5, 0.55)]
    for i, (a, y, L) in enumerate(((30, 1.6, 1.4), (150, 2.1, 1.2), (260, 2.6, 1.1), (90, 2.9, 0.9))):
        r = math.radians(a)
        dx, dz = math.sin(r), math.cos(r)
        base = [0.1 + dx * 0.05, y, 0.12]
        end = [base[0] + dx * L, y + 0.15, base[2] + dz * L]
        limb(S, f'branch{i}', [base, [base[0] + dx * L * 0.5, y + 0.05, base[2] + dz * L * 0.5], end], 0.08, 0.04, sides=5)
        pads.append((end, 1.2 - i * 0.1, 0.45))
    for i, (c, w, h) in enumerate(pads):
        clump(S, f'pad{i}', [c[0], c[1] + 0.12, c[2]], w, h, sides=9)
    return S


def specs():
    return {'tree_keyaki': keyaki(), 'tree_pine': pine()}
