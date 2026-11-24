"""MIKAWA-YA's ground floor shell and shop front, in world coordinates (the store faces -z onto the lane; x in
[-15.45, -9.4], z in [14.9, 19.95]; the dwelling upstairs is a house in lane_fw). Reference: 1960s-70s Japanese
よろず屋 / dagashiya fronts: mortar side walls and piers, varnished timber kick panels under aluminium display
windows, a timber fascia over the transom, aluminium sliding glass doors (glass is the game's own), a green-and-white
striped canvas awning on a steel frame with a scalloped valance, the signboard's steel frame.
The game keeps: the glass, the posters, the lit signboard face and everything inside (src/world/CornerShop.js).
"""
from arch import Spec, ramp, photo

X0, X1, Z0, Z1, H1 = -15.45, -9.4, 14.9, 19.95, 2.85
DX0, DX1 = -13.3, -11.55
CX = (X0 + X1) / 2


def mikawaya_shell():
    S = Spec('mikawaya_shell', ppm=144, desc='MIKAWA-YA shell and shop front')
    S.ramps(
        mortar=ramp('#b8b2a2', 8, hue=8, sat=0.02, spread=0.75),
        alu=ramp('#a6abae', 7, hue=10, sat=0.02, spread=0.7),
        wood=ramp('#6a4a32', 7, hue=12, sat=0.04, spread=0.8),
        green=ramp('#2f7a48', 6, hue=14, sat=0.04, spread=0.75),
        canvas=ramp('#e6e2d6', 6, hue=8, sat=0.02, spread=0.6),
        iron=ramp('#3a3c40', 6, hue=10, sat=0.02, spread=0.7),
        rust=ramp('#6a3a26', 6, hue=14, sat=0.02, spread=0.75),
        conc=ramp('#9c978d', 8, hue=8, sat=0.02, spread=0.75),
    )
    S.d['brush'] = {'length': 0.2, 'width': 0.04, 'rough': 0.4, 'flow': 'vertical',
                    'textures': {'mortar': 'stone', 'alu': 'metal', 'wood': 'wood', 'iron': 'metal', 'conc': 'stone'}}
    rim = {'light_shift': 0.9, 'dark_shift': -0.9}
    S.style('mortar', ramp='mortar', tone=4.0, rim=rim, layers=[
        photo('cracked_concrete_wall', scale=1.6, amount=0.6),
        {'id': 'patch', 'op': 'patches', 'scale': 0.6, 'threshold': 0.6, 'shift': -0.5},
        {'id': 'cracks', 'op': 'cracks', 'scale': 0.7, 'width': 1, 'threshold': 0.8, 'shift': -1.4},
        {'id': 'splash', 'op': 'band', 'axis': 'y', 'from': -1, 'to': -0.8, 'shift': -0.8, 'wobble': 0.05},
        {'id': 'dirt', 'op': 'gradient', 'axis': 'y', 'amount': 0.5}])
    S.style('alu', ramp='alu', tone=4.0, rim={'light_shift': 1.2, 'dark_shift': -1.0}, brush={'flow': 'long'},
            layers=[{'id': 'mottle', 'op': 'noise', 'scale': 0.15, 'amount': 0.3}, {'id': 'grime', 'op': 'gradient', 'axis': 'y', 'amount': 0.4}])
    S.style('wood', ramp='wood', tone=3.4, rim=rim, brush={'flow': 'horizontal'}, layers=[
        photo('weathered_planks', scale=1.0, amount=0.55),
        {'id': 'boards', 'op': 'stripes', 'axis': 'y', 'period': 0.15, 'width': 0.1, 'shift': -1.0},
        {'id': 'scuffs', 'op': 'band', 'axis': 'y', 'from': -1, 'to': -0.6, 'shift': -0.6, 'wobble': 0.1}])
    S.style('canvas', ramp='canvas', tone=3.8, rim={'light_shift': 0.6, 'dark_shift': -0.8}, brush={'flow': 'long', 'rough': 0.3}, layers=[
        {'id': 'stripes', 'op': 'stripes', 'axis': 'x', 'period': 0.5, 'width': 0.5, 'ramp': 'green', 'tone': 3.0, 'space': 'world'},
        {'id': 'fade', 'op': 'patches', 'scale': 0.5, 'threshold': 0.55, 'shift': 0.6},
        {'id': 'soot', 'op': 'noise', 'scale': 0.3, 'amount': 0.45},
        {'id': 'stain', 'op': 'spots', 'count': 12, 'radius': [0.03, 0.08], 'stretch': [1, 1, 3], 'shift': -0.8}])
    S.style('iron', ramp='iron', tone=3.0, rim=rim, layers=[{'id': 'rust', 'op': 'patches', 'scale': 0.15, 'threshold': 0.66, 'ramp': 'rust', 'tone': 2.6}])
    # side walls (outer and lane faces; the inner faces are behind the interior finishes) and the back wall
    for xa, xb, hide in ((X0, X0 + 0.25, 'right'), (X1 - 0.25, X1, 'left')):
        S.box('side', xb - xa, H1 + 0.1, Z1 - Z0, (xa + xb) / 2, 0, (Z0 + Z1) / 2, style='mortar', hide=['bottom', hide])
    S.box('back', X1 - X0, H1 + 0.1, 0.25, CX, 0, Z1 - 0.125, style='mortar', hide=['bottom', 'back'])
    S.box('floor2', X1 - X0 - 0.5, 0.22, Z1 - Z0, CX, H1, (Z0 + Z1) / 2, style='wood', hide=['top', 'bottom'])
    # the front: piers, kick panels under the display windows, sills, mullions, jambs
    for a, b in ((X0, X0 + 0.3), (X1 - 0.3, X1)):
        S.box('pier', b - a, H1 + 0.1, 0.28, (a + b) / 2, 0, Z0 + 0.14, style='mortar', hide=['bottom'], chamfer=0.01)
    for a, b in ((X0 + 0.3, DX0), (DX1, X1 - 0.3)):
        S.box('kick', b - a, 0.6, 0.2, (a + b) / 2, 0, Z0 + 0.1, style='wood', hide=['bottom'],
              paint={'layers': [{'op': 'panel', 'faces': ['back'], 'inset': 3, 'shift': -0.6}]})
        S.box('sill', b - a, 0.05, 0.24, (a + b) / 2, 0.6, Z0 + 0.1, style='alu')
        S.box('mullion', 0.05, 1.6, 0.06, (a + b) / 2, 0.65, Z0 + 0.1, style='alu')
        for sx in (a + 0.025, b - 0.025):
            S.box('jamb', 0.05, 1.6, 0.08, sx, 0.65, Z0 + 0.1, style='alu')
    S.box('transom', X1 - X0 - 0.6, 0.06, 0.24, CX, 2.25, Z0 + 0.1, style='alu')
    S.box('fascia', X1 - X0 - 0.6, 0.6, 0.2, CX, 2.31, Z0 + 0.1, style='wood', chamfer=0.01)
    for sx in (DX0, DX1):
        S.box('door_post', 0.06, 2.25, 0.12, sx, 0, Z0 + 0.06, style='alu')
    S.box('threshold', DX1 - DX0 + 0.2, 0.025, 0.12, (DX0 + DX1) / 2, 0, Z0 + 0.02, style='alu')
    # the two door leaves' aluminium frames (slid open in front of the windows)
    for a, b in ((DX0 - 0.85, DX0 - 0.02), (DX1 + 0.02, DX1 + 0.85)):
        for sx in (a, b):
            S.box('leaf_stile', 0.05, 2.18, 0.05, sx, 0.03, Z0 - 0.04, style='alu')
        for y in (0.03, 2.16):
            S.box('leaf_rail', b - a, 0.05, 0.05, (a + b) / 2, y, Z0 - 0.04, style='alu')
        S.box('leaf_bar', b - a, 0.04, 0.05, (a + b) / 2, 0.95, Z0 - 0.04, style='alu')
    # the signboard's steel frame (its lit face is the game's), top rail
    S.box('sign_rail', X1 - X0 + 0.2, 0.06, 0.16, CX, H1 + 0.98, Z0 - 0.16, style='iron')
    # the canvas awning: a sloped skin on a steel frame, the valance with its scallops
    S.slope('awning', X0 + 0.15, X1 - 0.15, Z0 - 0.9, 2.3, Z0, 2.52, 0.03, style='canvas')
    S.box('valance', X1 - X0 - 0.3, 0.22, 0.02, CX, 2.08, Z0 - 0.9, style='canvas',
          paint={'layers': [{'id': 'scallop', 'op': 'stripes', 'axis': 'x', 'period': 0.25, 'width': 0.5, 'shift': -0.6,
                             'range': [-1, -0.7], 'space': 'world'}]})
    for x in (X0 + 0.2, CX, X1 - 0.2):
        S.rod('awn_arm', [x, 2.52, Z0 + 0.02], [x, 2.3, Z0 - 0.88], 0.012, sides=4, style='iron')
    S.rod('awn_bar', [X0 + 0.15, 2.3, Z0 - 0.89], [X1 - 0.15, 2.3, Z0 - 0.89], 0.014, sides=6, style='iron')
    return S


def specs():
    return {'mikawaya_shell': mikawaya_shell()}
