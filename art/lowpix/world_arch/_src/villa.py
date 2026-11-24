"""The mangaka's villa (岸辺邸) facing the park's back street, and the park's public toilet block, in world
coordinates (the layout of src/world/Park.js). Reference: 1930s-50s Western-style (洋館) houses in Japanese suburbs:
white roughcast render on a stone plinth, a string course and a deep cornice, a hipped slate roof with a brick
chimney, louvred shutters, a porch on slim columns, an iron-railed balcony on corbels; and the plain 1980s park
toilet: a glazed-tile dado under white render, a flat concrete roof slab, vent louvres, a wash basin.
The game keeps: the window glass and the rooms, the door leaf and its lamps, the studio, signs, the garden and gate.
"""
import math

from arch import Spec, ramp, photo

X0, X1, ZF, ZK = 12.3, 19.5, -22.2, -28.8
CX, W, D = (X0 + X1) / 2, X1 - X0, ZF - ZK
BASE, F1, F2 = 0.45, 3.0, 2.85
Y1, Y2 = BASE + F1, BASE + F1 + F2


def _mats(S):
    S.ramps(
        render=ramp('#e4e0d6', 8, hue=8, sat=0.02, spread=0.7),
        stone=ramp('#8e8c86', 7, hue=8, sat=0.02, spread=0.75),
        ink=ramp('#2a2c30', 6, hue=10, sat=0.03, spread=0.7),
        slate=ramp('#4c525e', 8, hue=12, sat=0.03, spread=0.75),
        brick=ramp('#8e5e4c', 7, hue=12, sat=0.04, spread=0.75),
        shutter=ramp('#2e3a36', 6, hue=12, sat=0.03, spread=0.7),
        cream=ramp('#d8d4cc', 6, hue=8, sat=0.02, spread=0.6),
        wood=ramp('#6a4026', 7, hue=12, sat=0.04, spread=0.8),
        tile=ramp('#7aa496', 7, hue=12, sat=0.04, spread=0.7),
        conc=ramp('#9c978d', 8, hue=8, sat=0.02, spread=0.75),
        moss=ramp('#5d6a3e', 6, hue=12, sat=0.03, spread=0.7),
        rust=ramp('#6a3a26', 6, hue=14, sat=0.02, spread=0.75),
        iron=ramp('#202226', 5, hue=10, sat=0.02, spread=0.6),
        galv=ramp('#8a9092', 7, hue=10, sat=0.02, spread=0.7),
    )
    S.d['brush'] = {'length': 0.2, 'width': 0.05, 'rough': 0.4, 'flow': 'vertical',
                    'textures': {'render': 'stone', 'stone': 'stone', 'slate': 'stone', 'brick': 'stone', 'conc': 'stone', 'wood': 'wood'}}
    rim = {'light_shift': 0.9, 'dark_shift': -0.9}
    S.style('render', ramp='render', tone=4.6, rim={'light_shift': 0.7, 'dark_shift': -0.8}, layers=[
        photo('painted_plaster_wall', scale=1.4, amount=0.55),
        {'id': 'rough', 'op': 'noise', 'scale': 0.06, 'amount': 0.35},
        {'id': 'grey', 'op': 'patches', 'scale': 0.8, 'threshold': 0.6, 'shift': -0.5},
        {'id': 'streaks', 'op': 'spots', 'count': 14, 'radius': [0.04, 0.1], 'stretch': [0.4, 6, 0.4], 'shift': -0.6},
        {'id': 'splash', 'op': 'band', 'axis': 'y', 'from': -1, 'to': -0.85, 'shift': -0.8, 'wobble': 0.04}])
    S.style('stone', ramp='stone', tone=3.6, rim=rim, layers=[
        {'id': 'courses', 'op': 'stripes', 'axis': 'y', 'period': 0.22, 'width': 0.08, 'shift': -1.2},
        {'id': 'joints', 'op': 'stripes', 'axis': 'x', 'period': 0.55, 'width': 0.04, 'shift': -1.1, 'space': 'world'},
        photo('concrete_wall_003', scale=1.0, amount=0.6),
        {'id': 'moss', 'op': 'patches', 'scale': 0.3, 'threshold': 0.7, 'ramp': 'moss', 'tone': 2.4}])
    S.style('ink', ramp='ink', tone=2.6, rim=rim, layers=[{'id': 'mottle', 'op': 'noise', 'scale': 0.2, 'amount': 0.3}])
    S.style('cream', ramp='cream', tone=3.8, rim=rim, layers=[{'id': 'mottle', 'op': 'noise', 'scale': 0.2, 'amount': 0.3}])
    S.style('slate', ramp='slate', tone=3.4, rim={'light_shift': 1.0, 'dark_shift': -1.0}, brush={'flow': 'x'}, layers=[
        {'id': 'course', 'op': 'stripes', 'axis': 'y', 'period': 0.16, 'width': 0.14, 'shift': -1.3, 'space': 'world'},
        {'id': 'joints', 'op': 'stripes', 'axis': 'x', 'period': 0.3, 'width': 0.06, 'shift': -0.9, 'space': 'world'},
        {'id': 'joints2', 'op': 'stripes', 'axis': 'z', 'period': 0.3, 'width': 0.06, 'shift': -0.9, 'space': 'world'},
        {'id': 'lichen', 'op': 'patches', 'scale': 0.4, 'threshold': 0.72, 'ramp': 'moss', 'tone': 3.0},
        {'id': 'mottle', 'op': 'noise', 'scale': 0.3, 'amount': 0.45}])
    S.style('brick', ramp='brick', tone=3.6, rim=rim, brush={'flow': 'horizontal'}, layers=[
        {'id': 'courses', 'op': 'stripes', 'axis': 'y', 'period': 0.075, 'width': 0.2, 'shift': -1.4},
        {'id': 'perp', 'op': 'stripes', 'axis': 'x', 'period': 0.22, 'width': 0.1, 'shift': -1.1},
        {'id': 'soot', 'op': 'gradient', 'axis': 'y', 'amount': -0.8}])
    S.style('shutter', ramp='shutter', tone=3.2, rim=rim, brush={'off': True}, layers=[
        {'id': 'louvres', 'op': 'stripes', 'axis': 'y', 'period': 0.085, 'width': 0.35, 'shift': -1.2, 'faces': ['front'],
         'bevel': {'highlight': 1, 'shadow': 0}},
        {'id': 'frame', 'op': 'panel', 'faces': ['front'], 'inset': 2, 'shift': 0.6},
        {'id': 'chips', 'op': 'wear', 'width': 1, 'density': 0.4, 'ramp': 'wood', 'tone': 2.4}])
    S.style('iron', ramp='iron', tone=2.2, rim=rim, layers=[{'id': 'rust', 'op': 'patches', 'scale': 0.1, 'threshold': 0.7, 'ramp': 'rust', 'tone': 2.4}])
    S.style('tile', ramp='tile', tone=3.6, rim=rim, brush={'off': True}, layers=[
        {'id': 'gx', 'op': 'stripes', 'axis': 'x', 'period': 0.1, 'width': 0.12, 'shift': -1.2, 'space': 'world'},
        {'id': 'gz', 'op': 'stripes', 'axis': 'z', 'period': 0.1, 'width': 0.12, 'shift': -1.2, 'space': 'world'},
        {'id': 'gy', 'op': 'stripes', 'axis': 'y', 'period': 0.1, 'width': 0.12, 'shift': -1.2},
        {'id': 'mottle', 'op': 'noise', 'scale': 0.1, 'amount': 0.5},
        {'id': 'grime', 'op': 'band', 'axis': 'y', 'from': -1, 'to': -0.6, 'shift': -0.7, 'wobble': 0.1}])
    S.style('conc', ramp='conc', tone=3.6, rim=rim, layers=[photo('concrete_wall_003', scale=1.2, amount=0.75),
                                                            {'id': 'stain', 'op': 'gradient', 'axis': 'y', 'amount': 0.6}])
    S.style('galv', ramp='galv', tone=3.6, rim=rim, layers=[{'id': 'mottle', 'op': 'noise', 'scale': 0.2, 'amount': 0.35}])


def villa():
    S = Spec('villa', ppm=48, desc="The mangaka's Western-style villa: render, slate hip roof, chimney, porch, balcony, front wall")
    _mats(S)
    zc = (ZF + ZK) / 2
    # stone plinth and the rendered body (split round the studio, as the game builds it so its window can be seen into)
    S.box('plinth', W + 0.1, BASE, D + 0.1, CX, 0, zc, style='stone', hide=['bottom', 'top'])
    SX0, SX1, SZ = 12.3, 15.5, -25.0
    S.box('body', W, F1 + F2, ZF - ZK - (ZF - SZ), CX, BASE, (SZ + ZK) / 2, style='render', hide=['bottom', 'top'])
    S.box('body_e', X1 - SX1, F1 + F2, ZF - SZ, (SX1 + X1) / 2, BASE, (ZF + SZ) / 2, style='render', hide=['bottom', 'top', 'back'])
    S.box('body_up', SX1 - SX0, F2, ZF - SZ, (SX0 + SX1) / 2, Y1, (ZF + SZ) / 2, style='render', hide=['top', 'back'])
    wx0, wx1, wy0, wy1 = 12.75, 15.15, 1.0, 2.95
    S.box('st_l', wx0 - SX0, F1, 0.2, (SX0 + wx0) / 2, BASE, ZF - 0.1, style='render', hide=['bottom'])
    S.box('st_r', SX1 - wx1, F1, 0.2, (wx1 + SX1) / 2, BASE, ZF - 0.1, style='render', hide=['bottom'])
    S.box('st_lo', wx1 - wx0, wy0 - BASE, 0.2, (wx0 + wx1) / 2, BASE, ZF - 0.1, style='render', hide=['bottom'])
    S.box('st_hi', wx1 - wx0, Y1 - wy1, 0.2, (wx0 + wx1) / 2, wy1, ZF - 0.1, style='render')
    S.box('st_w', 0.15, F1, ZF - SZ, SX0 + 0.075, BASE, (SZ + ZF) / 2, style='render', hide=['bottom'])
    S.box('st_e', 0.1, F1, ZF - SZ, SX1 - 0.05, BASE, (SZ + ZF) / 2, style='render', hide=['bottom'])
    # string course and the cornice with its dark drip band
    S.box('course', W + 0.08, 0.12, D + 0.08, CX, Y1 - 0.06, zc, style='cream', hide=['bottom'], chamfer=0.02)
    S.box('cornice', W + 0.34, 0.16, D + 0.34, CX, Y2, zc, style='cream', chamfer=0.03)
    S.box('cornice_drip', W + 0.44, 0.06, D + 0.44, CX, Y2 + 0.16, zc, style='ink')
    # hipped slate roof: a taper from the eaves up to a short ridge (rise 0.3 per 0.43 run, as the stepped courses)
    w0, d0 = W + 0.5, D + 0.5
    hgt = (d0 / 2) * (0.3 / 0.43)
    L = max(0.5, w0 - d0)
    S.part('roof', 'taper', [w0, d0, hgt], [CX, Y2 + 0.22 + hgt / 2, zc], rot=[-90, 0, 0], front_scale=[L / w0, 0],
           style='slate', hide=['front', 'back'])
    S.box('ridge', L + 0.1, 0.12, 0.24, CX, Y2 + 0.22 + hgt - 0.06, zc, style='ink')
    S.box('chimney', 0.6, 3.1, 0.6, 18.3, Y2 + 0.4, -26.2, style='brick', hide=['bottom'])
    S.box('chimney_cap', 0.72, 0.1, 0.72, 18.3, Y2 + 3.5, -26.2, style='ink', chamfer=0.02)
    # the studio window's black steel frame (glass and the room are the game's)
    wz = ZF + 0.005
    for x in (wx0, wx1, (wx0 * 2 + wx1) / 3, (wx0 + wx1 * 2) / 3):
        S.box('wframe_v', 0.06, wy1 - wy0, 0.08, x, wy0, wz, style='ink')
    for y in (wy0, wy1 - 0.05, 2.45):
        S.box('wframe_h', wx1 - wx0 + 0.06, 0.05, 0.08, (wx0 + wx1) / 2, y, wz, style='ink')
    S.box('wsill', wx1 - wx0 + 0.3, 0.07, 0.22, (wx0 + wx1) / 2, wy0 - 0.07, ZF + 0.08, style='cream')
    # the front door: panels, handle, casing, the porch roof on two columns, the steps
    dx, dw = 16.5, 1.0
    for u, v in ((-0.22, 0.35), (0.22, 0.35), (-0.22, 1.35), (0.22, 1.35)):
        S.box('dpanel', 0.32, 0.75, 0.03, dx + u, BASE + v, ZF + 0.07, paint={'ramp': 'wood', 'tone': 2.8}, chamfer=0.01)
    S.box('dhandle', 0.04, 0.2, 0.05, dx + 0.36, BASE + 1.0, ZF + 0.09, paint={'ramp': 'brick', 'tone': 5})
    for s in (-1, 1):
        S.box('dpost', 0.08, 2.62, 0.1, dx + s * (dw / 2 + 0.04), BASE, ZF + 0.03, style='ink')
    S.box('dhead', dw + 0.16, 0.08, 0.1, dx, BASE + 2.3, ZF + 0.03, style='ink')
    S.box('porch_roof', 1.9, 0.14, 1.15, dx, BASE + 2.72, ZF + 0.57, style='ink', chamfer=0.02)
    S.box('porch_cap', 1.95, 0.05, 1.2, dx, BASE + 2.86, ZF + 0.58, style='slate')
    for sx in (-0.82, 0.82):
        S.prism('column', 0.12, 0.12, 2.72, [dx + sx, BASE + 1.36, ZF + 1.05], sides=8, rot=[-90, 0, 0], style='cream')
        S.box('column_base', 0.2, 0.08, 0.2, dx + sx, BASE, ZF + 1.05, style='cream')
    S.box('porch', 1.9, BASE - 0.12, 1.2, dx, 0, ZF + 0.6, style='stone', hide=['bottom'])
    S.box('porch_step', 1.6, BASE - 0.28, 0.4, dx, 0, ZF + 1.36, style='stone', hide=['bottom'])
    S.box('lamp_box', 0.16, 0.26, 0.1, dx - 0.72, BASE + 1.85, ZF + 0.05, style='ink')
    # windows: sills, heads and louvred shutters
    for x, y, w, h, sh in ((18.45, 1.05, 1.3, 1.75, False), (13.0, Y1 + 0.75, 0.9, 1.35, True), (18.8, Y1 + 0.75, 0.9, 1.35, True)):
        S.box('sill', w + 0.14, 0.06, 0.18, x, y - 0.06, ZF + 0.06, style='cream')
        S.box('head', w + 0.1, 0.05, 0.08, x, y + h, ZF + 0.03, style='ink')
        if sh:
            for s in (-1, 1):
                S.box('shutter', w * 0.5, h + 0.05, 0.05, x + s * (w * 0.75 + 0.04), y - 0.02, ZF + 0.03, style='shutter')
    # the balcony: slab on corbels, a black iron railing with diamond scrolls, the French doors' frame
    bx0, bx1, bd, by = 14.1, 17.6, 0.95, Y1 - 0.02
    S.box('balc', bx1 - bx0 + 0.1, 0.16, bd, (bx0 + bx1) / 2, by - 0.16, ZF + bd / 2, style='cream')
    S.box('balc_drip', bx1 - bx0 + 0.14, 0.05, bd + 0.04, (bx0 + bx1) / 2, by - 0.2, ZF + bd / 2, style='cream')
    for k in range(4):
        S.box('corbel', 0.12, 0.14, 0.12, bx0 + 0.3 + k * ((bx1 - bx0 - 0.6) / 3), by - 0.34, ZF + bd - 0.08, style='cream')
    rz = ZF + bd - 0.04
    S.box('rail_top', bx1 - bx0, 0.05, 0.05, (bx0 + bx1) / 2, by + 0.95, rz, style='iron')
    S.box('rail_bot', bx1 - bx0, 0.04, 0.04, (bx0 + bx1) / 2, by + 0.1, rz, style='iron')
    x = bx0
    while x <= bx1 + 0.01:
        S.box('baluster', 0.022, 0.85, 0.022, x, by + 0.1, rz, style='iron')
        x += 0.125
    x = bx0 + 0.25
    while x < bx1:
        S.part('scroll', 'box', [0.16, 0.16, 0.02], [x, by + 0.8, rz], rot=[0, 0, 45], style='iron')
        x += 0.5
    for s in (bx0, bx1):
        for k in range(1, 5):
            S.box('baluster_s', 0.022, 0.85, 0.022, s, by + 0.1, ZF + k * (bd / 5), style='iron')
        S.box('rail_s', 0.05, 0.05, bd, s, by + 0.95, ZF + bd / 2, style='iron')
    for u in (-0.36, 0.36):
        S.box('fd_jamb', 0.06, 2.12, 0.06, 15.85 + u + (-0.34 if u < 0 else 0.34), by + 0.02, ZF + 0.04, style='ink')
    S.box('fd_head', 1.5, 0.08, 0.08, 15.85, by + 2.12, ZF + 0.04, style='ink')
    # east side: sills, the gas meter, the AC, the downpipes
    for y, z in ((1.1, -24.2), (Y1 + 0.75, -26.6), (1.5, -27.4)):
        S.box('esill', 0.16, 0.06, 1.12, X1 + 0.06, y - 0.06, z, style='cream')
    S.box('gas', 0.22, 0.32, 0.26, X1 + 0.11, 0.9, -25.6, paint={'ramp': 'cream', 'tone': 3.2})
    S.box('ac', 0.3, 0.54, 0.78, X1 + 0.17, 0, -27.8, chamfer=0.015, style='cream',
          paint={'layers': [{'op': 'grille', 'faces': ['right'], 'rect': [0.1, 0.1, 0.6, 0.9], 'period': 2, 'dir': 'h', 'slit_tone': 1.2}]})
    for x in (X1 + 0.05, X0 - 0.05):
        S.rod('dp', [x, 0.05, -22.35], [x, Y2 + 0.15, -22.35], 0.04, sides=6, style='galv')
    # the low front wall: render on a coping, the iron railing, gate pillars with lamp caps
    GX, ZW, WX = 16.5, -19.95 - 0.1, 11.45
    g0, g1 = GX - 0.6, GX + 0.6
    for a, b in ((WX + 0.02, g0 - 0.2), (g1 + 0.2, 20.2)):
        S.box('fwall', b - a, 1.0, 0.2, (a + b) / 2, 0, ZW, style='render', hide=['bottom'])
        S.box('fwall_cap', b - a + 0.04, 0.07, 0.28, (a + b) / 2, 1.0, ZW, style='ink')
        S.box('frail', b - a, 0.03, 0.03, (a + b) / 2, 1.62, ZW, style='iron')
        x = a + 0.06
        while x < b - 0.02:
            S.box('fbar', 0.02, 0.56, 0.02, x, 1.07, ZW, style='iron')
            x += 0.14
    for px in (g0 - 0.1, g1 + 0.1):
        S.box('pillar', 0.44, 1.5, 0.44, px, 0, ZW, style='render', hide=['bottom'])
        S.box('pillar_cap', 0.52, 0.08, 0.52, px, 1.5, ZW, style='ink')
        S.box('pillar_cap2', 0.22, 0.04, 0.22, px, 1.58, ZW, style='ink')
        S.box('lamp_cap', 0.24, 0.05, 0.24, px, 1.86, ZW, style='ink')
    return S


def toilet():
    S = Spec('park_toilet', ppm=144, desc='The park public toilet block')
    _mats(S)
    x0, x1, z0, z1, H = 23.0, 25.75, -8.7, -5.85, 2.75
    xc, zc = (x0 + x1) / 2, (z0 + z1) / 2
    S.box('dado', x1 - x0, 1.1, z1 - z0, xc, 0, zc, style='tile', hide=['bottom', 'top'])
    S.box('upper', x1 - x0 - 0.01, H - 1.1, z1 - z0 - 0.01, xc, 1.1, zc, style='render', hide=['bottom', 'top'])
    S.box('band', x1 - x0 + 0.02, 0.06, z1 - z0 + 0.02, xc, 1.08, zc, paint={'ramp': 'tile', 'tone': 2.6})
    S.box('slab', x1 - x0 + 0.6, 0.18, z1 - z0 + 0.6, xc - 0.1, H, zc, style='conc', chamfer=0.02)
    S.box('parapet', x1 - x0 + 0.62, 0.06, z1 - z0 + 0.62, xc - 0.1, H + 0.18, zc, style='galv')
    for z in (-6.5, -7.95):
        for i in range(3):
            S.box('louvre', 0.04, 0.03, 0.6, x0 - 0.01, 2.25 + i * 0.1, z, style='ink')
        for dz in (-0.42, 0.42):
            S.box('dpost', 0.06, 2.05, 0.06, x0 - 0.03, 0, z + dz, style='galv')
        S.box('dhead', 0.06, 0.06, 0.9, x0 - 0.03, 2.0, z, style='galv')
        S.box('dstep', 0.4, 0.06, 0.9, x0 - 0.2, 0, z, style='conc')
    S.box('screen', 0.1, 2.0, 0.08, x0 - 0.42, 0, -7.22, style='tile')
    S.box('lamp', 0.12, 0.08, 0.3, x0 - 0.06, 2.38, -7.22, style='ink')
    S.box('basin', 0.7, 0.75, 0.42, 24.1, 0, z0 - 0.21, style='conc', hide=['bottom'])
    S.box('sink', 0.5, 0.06, 0.3, 24.1, 0.75, z0 - 0.2, style='galv')
    S.rod('tap', [24.1, 0.82, z0 - 0.06], [24.1, 0.98, z0 - 0.06], 0.02, sides=6, style='galv')
    S.rod('spout', [24.1, 0.96, z0 - 0.04], [24.1, 0.96, z0 - 0.16], 0.02, sides=6, style='galv')
    return S


def specs():
    return {'villa': villa(), 'park_toilet': toilet()}
