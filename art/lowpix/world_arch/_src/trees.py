"""Park, garden and hillside trees, modelled in lowpix: the wood (a flared trunk, scaffold limbs and the branches that
reach into every leaf mass, bark photo-bashed from real CC0 bark of the species) and the dark inner crown (the shaded
leaf mass deep inside, so no gaps show sky). The leaves themselves are hand-pixelled sprig cards from the foliage sheet
(public/img/foliage.png, the same sprigs as the lane's hedges), scattered over each leaf mass by the game
(src/world/foliage.js) from the crown table this module writes: src/data/treeCrowns.json.

Species (Shōwa back lanes, parks and gardens; bottom centre at the origin, metres, the game instances and scales them):
  tree_keyaki  Japanese zelkova (欅): a short flared trunk splitting low into many upswept limbs, a broad vase crown.
  tree_sakura  Somei-yoshino cherry (桜): a short stout trunk, wide spreading limbs, a low flat-topped dome.
  tree_pine    Japanese black pine (黒松), garden-pruned: a leaning twisting trunk, tiered limbs, flat cloud pads.
  tree_kaki    Persimmon (柿): a crooked trunk, a few twisting limbs, an irregular rounded crown of glossy leaves.
Bark photos: Poly Haven (CC0) japanese_zelkova_bark, sakura_bark, pine_bark, japanese_hackberry_bark.
"""
import json
import math
import os
import random

from arch import Spec, ramp, photo

HERE = os.path.dirname(os.path.abspath(__file__))
CROWNS = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', 'src', 'data', 'treeCrowns.json'))


def _mats(S, bark, bark_photo, leaf, moss='#5d6a3e'):
    S.ramps(bark=ramp(bark, 8, hue=10, sat=0.04, spread=0.85), core=ramp(leaf, 7, hue=16, sat=0.05, spread=0.8),
            moss=ramp(moss, 6, hue=12, sat=0.04, spread=0.7))
    S.d['light'] = {'dir': [-0.45, 1.0, 0.6], 'strength': 0.6, 'gradient': 0.35, 'ao': 0.6, 'ao_height': 1.2}
    S.style('bark', ramp='bark', tone=3.6, rim={'light_shift': 0.6, 'dark_shift': -0.8},
            brush={'flow': 'path', 'length': 0.25, 'rough': 0.6}, layers=[
                photo(bark_photo, scale=0.9, amount=0.7, mode='colour'),
                {'id': 'base', 'op': 'gradient', 'axis': 'y', 'amount': 0.5},
                {'id': 'moss', 'op': 'patches', 'scale': 0.25, 'threshold': 0.7, 'ramp': 'moss', 'tone': 2.8}])
    # the inner crown: shaded leaf mass seen through the gaps between the sprig cards (dark, mottled, never flat)
    S.style('core', ramp='core', tone=1.1, light=0.35, rim={'light_shift': 0.2, 'dark_shift': -0.5},
            brush={'flow': 'vertical', 'length': 0.14, 'rough': 0.8}, layers=[
                {'id': 'clusters', 'op': 'spots', 'count': 70, 'radius': [0.07, 0.18], 'shift': 0.8, 'roughness': 0.6},
                {'id': 'holes', 'op': 'spots', 'count': 40, 'radius': [0.05, 0.12], 'shift': -1.0},
                {'id': 'under', 'op': 'gradient', 'axis': 'y', 'amount': 1.0}])


def limb(S, id, pts, r0, r1, sides=7, subdiv=0):
    n = len(pts)
    rings = [{'at': [round(a, 3) for a in p], 'size': round(2 * (r0 + (r1 - r0) * (i / (n - 1)) ** 0.8), 3)} for i, p in enumerate(pts)]
    S.part(id, 'loft', [0, 0, 0], [0, 0, 0], rings=rings, profile={'sides': sides, 'round': 2.2}, subdiv=subdiv,
           style='bark', caps=[False, True])


def core(S, id, c, rx, ry, sides=7):
    x, y, z = c
    rings = [{'at': [x, y - ry, z], 'size': 0.0}, {'at': [x, y - ry * 0.55, z], 'size': 2 * rx * 0.82},
             {'at': [x, y + ry * 0.1, z], 'size': 2 * rx}, {'at': [x, y + ry * 0.6, z], 'size': 2 * rx * 0.75},
             {'at': [x, y + ry, z], 'size': 0.0}]
    rings = [{'at': [round(a, 3) for a in r['at']], 'size': round(r['size'], 3)} for r in rings]
    S.part(id, 'loft', [0, 0, 0], [0, 0, 0], rings=rings, profile={'sides': sides, 'round': 2.0}, subdiv=0, style='core')


def bend(a, b, sag, rng, n=4, wob=0.12):
    """Points from a to b along a gentle curve (sag lifts / drops the middle, wob jitters sideways)."""
    out = []
    for i in range(n):
        t = i / (n - 1)
        p = [a[k] + (b[k] - a[k]) * t for k in range(3)]
        m = math.sin(t * math.pi)
        p[1] += sag * m
        if 0 < i < n - 1:
            p[0] += (rng.random() - 0.5) * wob * m
            p[2] += (rng.random() - 0.5) * wob * m
        out.append(p)
    return out


class Tree:
    def __init__(self, id, desc, seed, bark, bark_photo, leaf):
        self.S = Spec(id, ppm=96, desc=desc)
        _mats(self.S, bark, bark_photo, leaf)
        self.rng = random.Random(seed)
        self.clumps = []  # [x, y, z, rx, ry, rz]
        self.n = 0

    def limb(self, pts, r0, r1, sides=7):
        self.n += 1
        limb(self.S, f'limb{self.n}', pts, r0, r1, sides)

    def clump(self, c, rx, ry, rz=None, core_k=0.64):
        rz = rx if rz is None else rz
        self.clumps.append([round(c[0], 3), round(c[1], 3), round(c[2], 3), round(rx, 3), round(ry, 3), round(rz, 3)])
        core(self.S, f'core{len(self.clumps)}', c, (rx + rz) / 2 * core_k, ry * core_k)

    def reach(self, frm, c, r0, r1, sag=0.0, sides=6):
        """A branch from frm into the leaf mass centred on c (ends inside it, hidden by the sprigs)."""
        end = [frm[k] + (c[k] - frm[k]) * 0.86 for k in range(3)]
        self.limb(bend(frm, end, sag, self.rng), r0, r1, sides)


# ------------------------------------------------------------------ species
def keyaki():
    T = Tree('tree_keyaki', 'Keyaki (Japanese zelkova) park tree: vase of upswept limbs, broad crown', 11,
             '#7d776c', 'japanese_zelkova_bark', '#3f6a32')
    r = T.rng
    T.limb([[0, -0.05, 0], [0.02, 0.35, 0.01], [0.0, 1.2, 0.03], [0.03, 2.1, 0.0]], 0.42, 0.25, sides=9)
    fork = [0.03, 2.05, 0.0]
    for i in range(6):
        a = math.radians(i * 60 + r.uniform(-14, 14))
        dx, dz = math.sin(a), math.cos(a)
        L = r.uniform(1.6, 2.1)
        mid = [dx * L, 2.05 + r.uniform(2.3, 2.9), dz * L]
        T.limb(bend(fork, mid, 0.15, r), 0.17, 0.09)
        # each scaffold limb feeds an outer and an upper leaf mass
        outer = [dx * (L + 1.3), mid[1] + r.uniform(0.1, 0.6), dz * (L + 1.3)]
        T.clump(outer, r.uniform(1.35, 1.6), r.uniform(1.0, 1.2))
        T.reach(mid, outer, 0.09, 0.035, sag=0.2)
        a2 = a + math.radians(r.choice((-1, 1)) * 25)
        upper = [math.sin(a2) * (L * 0.55), mid[1] + r.uniform(1.4, 1.9), math.cos(a2) * (L * 0.55)]
        T.clump(upper, r.uniform(1.3, 1.55), r.uniform(1.0, 1.15))
        T.reach(mid, upper, 0.08, 0.03)
    T.clump([0.1, 7.6, -0.1], 1.6, 0.95)
    # low skirt masses hanging off two limbs (the crown comes down, never a ball on a stick)
    for a in (35, 215):
        ra = math.radians(a)
        c = [math.sin(ra) * 2.6, 3.9, math.cos(ra) * 2.6]
        T.clump(c, 1.15, 0.85)
        T.reach([math.sin(ra) * 0.5, 3.0, math.cos(ra) * 0.5], c, 0.08, 0.03, sag=-0.1)
    return T, {'leaf': 'keyaki', 'mix': ['broad', 0.18], 'size': 0.95, 'tint': [0.98, 1.0, 0.9], 'density': 1.15}


def sakura():
    T = Tree('tree_sakura', 'Somei-yoshino cherry: short stout trunk, wide spreading limbs, low flat dome', 23,
             '#4e3a36', 'sakura_bark', '#3a5e30')
    r = T.rng
    T.limb([[0, -0.05, 0], [0.04, 0.4, 0.0], [0.1, 1.0, 0.05], [0.12, 1.45, 0.06]], 0.4, 0.3, sides=9)
    fork = [0.12, 1.4, 0.06]
    for i in range(5):
        a = math.radians(i * 72 + r.uniform(-12, 12))
        dx, dz = math.sin(a), math.cos(a)
        L = r.uniform(2.2, 2.7)
        mid = [fork[0] + dx * L, 1.4 + r.uniform(1.4, 1.9), fork[2] + dz * L]
        T.limb(bend(fork, mid, 0.35, r, n=5, wob=0.3), 0.2, 0.09)
        outer = [mid[0] + dx * 1.3, mid[1] + r.uniform(0.2, 0.5), mid[2] + dz * 1.3]
        T.clump(outer, r.uniform(1.4, 1.7), r.uniform(0.85, 1.0))
        T.reach(mid, outer, 0.09, 0.03, sag=0.1)
        a2 = a + math.radians(36)
        inner = [math.sin(a2) * 1.5, 3.9 + r.uniform(0.0, 0.5), math.cos(a2) * 1.5]
        T.clump(inner, r.uniform(1.3, 1.5), r.uniform(0.9, 1.05))
        T.reach([fork[0] + dx * L * 0.4, 2.3, fork[2] + dz * L * 0.4], inner, 0.1, 0.035)
    T.clump([0.2, 5.0, 0.0], 1.7, 0.8)
    return T, {'leaf': 'small', 'mix': ['broad', 0.3], 'size': 0.85, 'tint': [0.92, 0.96, 0.84], 'density': 1.2}


def pine():
    T = Tree('tree_pine', 'Japanese black pine (kuromatsu), garden-pruned: twisting trunk, tiered cloud pads', 37,
             '#5a4c42', 'pine_bark', '#22432c')
    r = T.rng
    trunk = [[0, -0.05, 0], [0.12, 0.8, 0.05], [0.02, 1.7, 0.22], [0.36, 2.6, 0.18], [0.28, 3.4, 0.0], [0.4, 4.1, -0.1]]
    T.limb(trunk, 0.24, 0.1, sides=8)
    tiers = ((30, 1.5, 1.55), (155, 2.0, 1.35), (265, 2.5, 1.25), (95, 2.9, 1.05), (210, 3.3, 0.85))
    for i, (a, y, L) in enumerate(tiers):
        ra = math.radians(a + r.uniform(-8, 8))
        dx, dz = math.sin(ra), math.cos(ra)
        k = y / 4.1
        base = [trunk[0][0] + (0.3 * k), y, 0.15 * (1 - k)]
        end = [base[0] + dx * L, y + 0.25, base[2] + dz * L]
        T.limb(bend(base, end, 0.25, r, n=4, wob=0.25), 0.09, 0.04, sides=6)
        T.clump([end[0], end[1] + 0.12, end[2]], 1.0 - i * 0.06, 0.4, core_k=0.62)
        # a second smaller pad off the side of the bigger tiers
        if i < 3:
            side = [base[0] + dx * L * 0.55 + dz * 0.6, y + 0.35, base[2] + dz * L * 0.55 - dx * 0.6]
            T.clump(side, 0.65, 0.3, core_k=0.62)
            T.reach([base[0] + dx * L * 0.4, y + 0.15, base[2] + dz * L * 0.4], side, 0.04, 0.02)
    T.clump([0.42, 4.35, -0.1], 1.05, 0.42, core_k=0.62)
    return T, {'leaf': 'pine', 'mix': ['pineTop', 0.35], 'size': 0.7, 'tint': [0.9, 0.98, 0.92], 'density': 1.45, 'flat': True}


def kaki():
    T = Tree('tree_kaki', 'Persimmon: crooked trunk, a few twisting limbs, an irregular rounded crown', 53,
             '#4a443e', 'japanese_hackberry_bark', '#2f5428')
    r = T.rng
    T.limb([[0, -0.05, 0], [0.08, 0.5, 0.02], [-0.05, 1.1, 0.1], [0.05, 1.5, 0.08]], 0.3, 0.2, sides=8)
    fork = [0.05, 1.45, 0.08]
    for i, a in enumerate((20, 140, 250)):
        ra = math.radians(a + r.uniform(-15, 15))
        dx, dz = math.sin(ra), math.cos(ra)
        mid = [fork[0] + dx * 1.2, 2.9 + r.uniform(0, 0.4), fork[2] + dz * 1.2]
        T.limb(bend(fork, mid, 0.1, r, n=4, wob=0.35), 0.15, 0.08)
        c1 = [mid[0] + dx * 0.9, mid[1] + 0.5, mid[2] + dz * 0.9]
        T.clump(c1, r.uniform(1.15, 1.35), r.uniform(0.95, 1.1))
        T.reach(mid, c1, 0.07, 0.03)
        ra2 = ra + math.radians(55)
        c2 = [math.sin(ra2) * 0.9, mid[1] + 1.4, math.cos(ra2) * 0.9]
        T.clump(c2, r.uniform(1.05, 1.25), r.uniform(0.9, 1.0))
        T.reach(mid, c2, 0.06, 0.025)
    T.clump([0.0, 5.0, 0.05], 1.1, 0.75)
    return T, {'leaf': 'broad', 'mix': ['camellia', 0.12], 'size': 0.75, 'tint': [0.86, 0.94, 0.8], 'density': 1.25}


def specs():
    out, crowns = {}, {}
    for fn in (keyaki, sakura, pine, kaki):
        T, leaves = fn()
        kind = T.S.d['name'][5:]
        out[T.S.d['name']] = T.S
        crowns[kind] = {'clumps': T.clumps, **leaves}
    os.makedirs(os.path.dirname(CROWNS), exist_ok=True)
    with open(CROWNS, 'w') as f:
        f.write('{\n' + ',\n'.join(f' "{k}": ' + json.dumps(v, separators=(',', ':')) for k, v in crowns.items()) + '\n}\n')
    return out
