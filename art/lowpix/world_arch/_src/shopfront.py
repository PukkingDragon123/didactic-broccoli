"""The garage's shop front (Gacha Garage, the lane face of Grandpa's garage), in the garage frame (metres; the garage is
x in [-4, 4], z in [-5, 5], the lane face at z = 5.2). Reference: small 1960s-70s Japanese machine-shop / garage fronts
still standing in 1999 back lanes: a box-profile (角波) galvanised-steel false front painted teal and gone chalky, a steel
roller shutter in a pressed-steel hood box between C-channel guide rails, a tin pent eave (庇) of red-painted corrugated
sheet on angle-iron struts with a half-round gutter, a timber fascia board, galvanised flashing on the coping, conduit,
two goose-neck enamel lamps and an electric meter box.

Models: shopfront (64 px/m, the part you see up close), garage_shell (the roof and the exposed east wall, 24 px/m).
The shutter curtain itself is a separate model (shutter) whose atlas the rolling shutter mesh samples.
"""
from arch import Spec, ramp, photo

H = 3.2  # garage wall height
ZF = 5.2  # lane face of the front walls


def _common(S):
    S.ramps(
        teal=ramp('#456e5e', 8, hue=16, sat=0.04, spread=0.85),
        rust=ramp('#6a3a26', 7, hue=14, sat=0.02, spread=0.75),
        galv=ramp('#80878a', 8, hue=10, sat=0.02, spread=0.75),
        red=ramp('#763428', 7, hue=14, sat=0.02, spread=0.8),
        wood=ramp('#5a4232', 7, hue=12, sat=0.04, spread=0.8),
        conc=ramp('#a39e94', 8, hue=8, sat=0.02, spread=0.75),
        enamel=ramp('#2f5a46', 7, hue=14, sat=0.04, spread=0.8),
        white=ramp('#e6e2d6', 6, hue=8, sat=0.02, spread=0.6),
        iron=ramp('#3c3c3e', 6, hue=10, sat=0.02, spread=0.7),
        beige=ramp('#b8b4a4', 6, hue=8, sat=0.02, spread=0.7),
    )
    S.d['brush'] = {'length': 0.16, 'width': 0.03, 'rough': 0.45, 'overshoot': 0.2, 'flow': 'vertical',
                    'textures': {'teal': 'metal', 'galv': 'metal', 'red': 'metal', 'rust': 'metal', 'iron': 'metal',
                                 'wood': 'wood', 'conc': 'stone', 'enamel': 'metal'}}
    rim = {'light_shift': 1.0, 'dark_shift': -1.0}
    # box-profile cladding: raised ribs every 20 cm with a lit lip, chalky paint, rust bleeding from the laps and fixings
    S.style('teal', ramp='teal', tone=4.0, rim=rim, layers=[
        {'id': 'ribs', 'op': 'stripes', 'axis': 'x', 'period': 0.2, 'width': 0.28, 'shift': 0.7, 'space': 'world',
         'bevel': {'highlight': 1, 'shadow': 1, 'shadow_shift': -1.6, 'highlight_shift': 1.0}},
        photo('worn_corrugated_iron', scale=1.6, amount=0.55),
        {'id': 'chalk', 'op': 'noise', 'scale': 0.5, 'amount': 0.5},
        {'id': 'dirt', 'op': 'gradient', 'axis': 'y', 'amount': 0.9},
        {'id': 'rustrun', 'op': 'spots', 'count': 10, 'radius': [0.01, 0.025], 'stretch': [0.4, 6.0, 0.4],
         'ramp': 'rust', 'tone': 2.2},
        {'id': 'chips', 'op': 'wear', 'width': 2, 'density': 0.35, 'ramp': 'rust', 'tone': 2.2},
    ])
    S.style('galv', ramp='galv', tone=3.8, rim=rim, layers=[
        photo('corrugated_iron_02', scale=1.4, amount=0.45),
        {'id': 'spangle', 'op': 'noise', 'scale': 0.12, 'amount': 0.45},
        {'id': 'white_rust', 'op': 'patches', 'scale': 0.4, 'threshold': 0.66, 'shift': 0.8},
        {'id': 'grime', 'op': 'gradient', 'axis': 'y', 'amount': 0.6},
        {'id': 'rust', 'op': 'patches', 'scale': 0.2, 'threshold': 0.82, 'ramp': 'rust', 'tone': 3.0},
    ])
    S.style('iron', ramp='iron', tone=3.2, rim=rim, layers=[
        {'id': 'mottle', 'op': 'noise', 'scale': 0.2, 'amount': 0.4},
        {'id': 'rust', 'op': 'patches', 'scale': 0.15, 'threshold': 0.62, 'ramp': 'rust', 'tone': 2.6},
    ])
    S.style('red', ramp='red', tone=3.6, rim=rim, layers=[
        {'id': 'corr', 'op': 'stripes', 'axis': 'x', 'period': 0.076, 'width': 0.45, 'shift': 0.8, 'space': 'world',
         'bevel': {'highlight': 1, 'shadow': 1, 'shadow_shift': -1.2}},
        {'id': 'chalk', 'op': 'noise', 'scale': 0.4, 'amount': 0.6},
        {'id': 'rust', 'op': 'patches', 'scale': 0.3, 'threshold': 0.6, 'ramp': 'rust', 'tone': 2.8},
        {'id': 'edge', 'op': 'wear', 'width': 2, 'density': 0.5, 'ramp': 'rust', 'tone': 2.0},
    ])
    S.style('wood', ramp='wood', tone=3.4, rim=rim, brush={'flow': 'horizontal'}, layers=[
        photo('weathered_planks', scale=1.2, amount=0.7),
        {'id': 'grain', 'op': 'stripes', 'axis': 'y', 'period': 0.03, 'width': 0.25, 'shift': -0.6, 'wobble': 0.4},
        {'id': 'grey', 'op': 'patches', 'scale': 0.5, 'threshold': 0.55, 'shift': 0.7},
    ])
    S.style('conc', ramp='conc', tone=4.0, rim=rim, layers=[
        photo('concrete_wall_003', scale=1.2, amount=0.8),
        {'id': 'cracks', 'op': 'cracks', 'scale': 0.6, 'width': 1, 'threshold': 0.78, 'shift': -1.4},
        {'id': 'splash', 'op': 'band', 'axis': 'y', 'from': -1, 'to': -0.3, 'shift': -0.8, 'wobble': 0.3},
    ])


def shopfront():
    S = Spec('shopfront', ppm=144, desc="Gacha Garage's lane face: box-profile false front, piers, eave, shutter hood and rails")
    _common(S)
    # ---------------------------------------------------------------- the two piers (cladding over the concrete walls)
    for sx in (-1, 1):
        x = sx * 3.65
        S.box('pier', 1.3, H + 0.05 - 0.22, 0.05, x, 0.22, 5.235, style='teal', chamfer=0.006, hide=['back'])
        # a low concrete kerb at the foot, chipped, splashed
        S.box('kerb', 1.34, 0.22, 0.12, x, 0, 5.24, style='conc', chamfer=0.015, hide=['bottom', 'back'])
        # corner trim (galvanised angle) up the outer edge, and where the cladding meets the rail
        S.box('trim', 0.04, H + 0.03, 0.06, sx * 4.29, 0.2, 5.25, style='galv', hide=['bottom'])
        S.box('trim', 0.03, H - 0.2, 0.04, sx * 3.02 + sx * 0.03, 0.22, 5.245, style='galv', hide=['bottom'])
        # a horizontal lap joint half-way up (two sheets), with a row of fixings
        S.box('lap', 1.3, 0.03, 0.012, x, 1.9, 5.266, style='galv', hide=['back'],
              paint={'layers': [{'op': 'rivets', 'spacing': 13, 'inset': 0, 'ramp': 'galv', 'tone': 6, 'min_size': 1}]})
    # ---------------------------------------------------------------- guide rails (C-channel) and the shutter hood
    for sx in (-1, 1):
        x = sx * 3.02
        S.box('rail_web', 0.012, H - 0.38, 0.12, x + sx * 0.035, 0, 5.05, style='galv', hide=['bottom'])
        for z in (4.995, 5.105):
            S.box('rail_flange', 0.06, H - 0.38, 0.012, x + sx * 0.005, 0, z, style='galv', hide=['bottom'])
        S.box('rail_foot', 0.12, 0.05, 0.14, x, 0, 5.05, style='iron', chamfer=0.01)
    # the hood: a pressed-steel box with a rolled lower lip, end caps and a seam
    S.box('hood', 6.36, 0.36, 0.38, 0, H - 0.37, 5.05, style='galv', chamfer=0.03,
          paint={'layers': [{'id': 'screws', 'op': 'rivets', 'spacing': 40, 'inset': 2, 'ramp': 'galv', 'tone': 6.5, 'min_size': 3},
                            {'id': 'seam', 'op': 'stripes', 'axis': 'x', 'period': 2.12, 'width': 0.008, 'shift': -1.6, 'space': 'world'}]})
    S.box('hood_lip', 6.36, 0.04, 0.05, 0, H - 0.4, 5.22, style='galv', chamfer=0.012)
    for sx in (-1, 1):
        S.box('hood_cap', 0.03, 0.4, 0.42, sx * 3.2, H - 0.39, 5.05, style='galv', chamfer=0.008)
    # ---------------------------------------------------------------- timber fascia board over the hood
    S.box('fascia', 8.4, 0.22, 0.07, 0, H - 0.01, 5.255, style='wood', chamfer=0.01, hide=['back'])
    S.box('fascia_cap', 8.44, 0.025, 0.09, 0, H + 0.21, 5.255, style='galv')
    # ---------------------------------------------------------------- the false front (parapet) above the eave
    PH = 1.15
    S.box('parapet', 8.7, PH, 0.26, 0, H, 5.08, style='teal', chamfer=0.006, hide=['back', 'bottom'])
    for sx in (-1, 1):
        S.box('return', 0.22, PH, 1.6, sx * 4.24, H, 4.3, style='teal', hide=['bottom'])
        S.box('pilaster', 0.3, PH + 0.02, 0.34, sx * 4.25, H, 5.12, style='galv', chamfer=0.012,
              paint={'layers': [{'id': 'tone', 'op': 'fill', 'shift': -1.2}]})
    # coping: galvanised flashing in two steps with a drip edge, laps every 1.8 m
    S.box('coping', 9.0, 0.12, 0.46, 0, H + PH, 5.1, style='galv', chamfer=0.01,
          paint={'layers': [{'id': 'laps', 'op': 'stripes', 'axis': 'x', 'period': 1.8, 'width': 0.012, 'shift': -1.5, 'space': 'world'}]})
    S.box('coping_top', 8.8, 0.08, 0.36, 0, H + PH + 0.12, 5.08, style='galv', chamfer=0.02)
    # ---------------------------------------------------------------- the tin pent eave (庇) on struts, a half-round gutter
    # sheet: from the fascia (z 5.29, y 3.31) out to z 6.15, falling 0.1 m
    S.slope('eave', -4.1, 4.1, 6.15, H + 0.12, 5.29, H + 0.22, 0.03, style='red',
            paint={'layers': [{'id': 'under', 'op': 'fill', 'faces': ['bottom'], 'ramp': 'galv', 'tone': 3.0},
                              {'id': 'under_rust', 'op': 'patches', 'faces': ['bottom'], 'scale': 0.5, 'threshold': 0.6, 'ramp': 'rust', 'tone': 2.4}]})
    S.box('eave_flash', 8.2, 0.05, 0.12, 0, H + 0.2, 5.33, style='galv', rot=[-6, 0, 0])
    S.rod('gutter', [-4.15, H + 0.08, 6.2], [4.15, H + 0.08, 6.2], 0.06, sides=8, style='galv',
          paint={'layers': [{'id': 'leaf', 'op': 'patches', 'scale': 0.3, 'threshold': 0.7, 'ramp': 'rust', 'tone': 2}]})
    for sx in (-1, 1):
        S.rod('gutter_end', [sx * 4.15, H + 0.03, 6.2], [sx * 4.17, H + 0.03, 6.2], 0.058, sides=8, style='galv')
    # downpipe from the gutter's west end down the pier to a shoe at the kerb
    S.rod('dp_neck', [-4.1, H + 0.04, 6.2], [-4.15, H - 0.15, 5.4], 0.035, sides=6, style='galv')
    S.rod('dp', [-4.15, H - 0.15, 5.36], [-4.15, 0.12, 5.36], 0.035, sides=6, style='galv')
    S.rod('dp_shoe', [-4.15, 0.12, 5.36], [-4.15, 0.03, 5.5], 0.036, sides=6, style='galv')
    for y in (0.6, 1.5, 2.4):
        S.box('dp_clip', 0.09, 0.03, 0.1, -4.15, y, 5.32, style='iron')
    # angle-iron struts from the pier to the eave edge, and two more over the shutter
    for x in (-3.95, -1.35, 1.35, 3.95):
        S.slab('strut', [x, H - 0.5, 5.29], [x, H + 0.1, 6.05], 0.04, 0.04, style='iron')
        S.box('strut_plate', 0.1, 0.14, 0.012, x, H - 0.58, 5.296, style='iron')
    # ---------------------------------------------------------------- conduit, lamps, meter box
    S.rod('conduit', [-3.4, H + 0.95, 5.235], [3.4, H + 0.95, 5.235], 0.022, sides=6, style='galv')
    for x in (-3.4, 3.4):
        S.rod('conduit_drop', [x, H + 0.95, 5.235], [x, H + 0.55, 5.235], 0.022, sides=6, style='galv')
    for x in (-2.2, 2.2):
        S.box('lamp_base', 0.1, 0.12, 0.03, x, H + 0.88, 5.225, style='iron', chamfer=0.01)
        S.rod('lamp_arm', [x, H + 0.94, 5.24], [x, H + 0.92, 5.5], 0.014, sides=6, style='iron')
        S.rod('lamp_neck', [x, H + 0.92, 5.5], [x, H + 0.79, 5.62], 0.014, sides=6, style='iron')
        # enamel reflector shade: dark green outside, white inside (an open cone)
        S.prism('lamp_shade', 0.26, 0.26, 0.09, [x, H + 0.735, 5.62], sides=10, rot=[-90, 0, 0],
                front_scale=[0.36, 0.36], style='iron',
                paint={'ramp': 'enamel', 'tone': 3.4, 'layers': [
                    {'op': 'fill', 'faces': ['back'], 'ramp': 'white', 'tone': 4.4},
                    {'op': 'wear', 'width': 1, 'density': 0.5, 'ramp': 'iron', 'tone': 1.5}]})
    S.box('meter', 0.3, 0.4, 0.12, -3.62, 2.0, 5.32, style='galv', chamfer=0.02,
          paint={'ramp': 'beige', 'tone': 3.6, 'layers': [
              {'op': 'rect', 'faces': ['front'], 'rect': [0.18, 0.45, 0.82, 0.85], 'ramp': 'iron', 'tone': 1.2, 'bevel': True},
              {'op': 'rect', 'faces': ['front'], 'rect': [0.25, 0.58, 0.75, 0.72], 'ramp': 'white', 'tone': 3.4},
              {'op': 'rivets', 'faces': ['front'], 'inset': 1, 'spacing': 99, 'ramp': 'galv', 'tone': 5}]})
    S.rod('meter_cable', [-3.62, 2.4, 5.33], [-3.62, H - 0.5, 5.33], 0.012, sides=5, style='iron')
    return S


def garage_shell():
    S = Spec('garage_shell', ppm=144, desc="The garage's corrugated roof behind the false front and its exposed east wall")
    _common(S)
    S.box('roof', 8.7, 0.1, 10.5, 0, H + 0.12, -0.15, style='galv', hide=['bottom'],
          paint={'layers': [{'id': 'corr', 'op': 'stripes', 'axis': 'x', 'period': 0.25, 'width': 0.4, 'shift': 0.9,
                             'space': 'world', 'bevel': True},
                            {'id': 'rust2', 'op': 'patches', 'scale': 0.8, 'threshold': 0.55, 'ramp': 'rust', 'tone': 3}]})
    for z in (-5.4, -2.0, 1.4):
        S.box('roof_lap', 8.7, 0.02, 0.06, 0, H + 0.22, z, style='galv')
    S.box('east', 0.06, H + 0.25, 10.4, 4.24, 0, -0.05, style='galv', hide=['left'],
          paint={'layers': [{'id': 'corr', 'op': 'stripes', 'axis': 'z', 'period': 0.2, 'width': 0.3, 'shift': 0.8,
                             'space': 'world', 'bevel': True}]})
    return S


P = 0.09375  # shutter slat pitch: 6 texels at 64 px/m


def shutter():
    """The roller-shutter curtain (6.0 x 2.85 m): interlocking galvanised slats every 7.5 cm, the bottom bar with its
    rubber lip and the lock handle, grime splashed up from the lane, dents and rust at the joints. Only the lane face is
    painted; the game rolls it (Garage.setShutter maps the lower part of this face onto the visible curtain)."""
    S = Spec('shutter', ppm=64, desc='Roller shutter curtain')
    _common(S)
    S.box('curtain', 6.0, 2.85, 0.06, 0, 0, 5.05, style='galv', hide=['left', 'right', 'top', 'bottom', 'back'],
          paint={'tone': 4.0, 'brush': {'off': True}, 'layers': [
              # 6-texel slats (9.4 cm): the joint, a lit crown, the body curving down into the next joint
              *[{'id': f'slat{k}', 'op': 'stripes', 'axis': 'y', 'period': P, 'width': 1 / 6 - 0.01, 'phase': -k * P / 6 + 0.001,
                 'shift': sh} for k, sh in ((0, -2.2), (1, 1.2), (2, 0.5), (4, -0.4), (5, -1.0))],
              {'id': 'grime', 'op': 'band', 'axis': 'y', 'from': -1, 'to': -0.55, 'shift': -1.0, 'wobble': 0.25},
              {'id': 'dents', 'op': 'spots', 'count': 9, 'radius': [0.04, 0.12], 'shift': -0.7, 'bevel': True},
              {'id': 'joint_rust', 'op': 'spots', 'count': 22, 'radius': [0.01, 0.03], 'stretch': [3, 0.4, 1],
               'ramp': 'rust', 'tone': 2.4},
              {'id': 'bar', 'op': 'rect', 'rect': [0, 0, 1, 0.024], 'ramp': 'iron', 'tone': 2.6, 'bevel': True},
              {'id': 'lip', 'op': 'rect', 'rect': [0, 0, 1, 0.006], 'ramp': 'iron', 'tone': 0.6},
              {'id': 'handle', 'op': 'rect', 'rect': [0.488, 0.04, 0.512, 0.075], 'ramp': 'iron', 'tone': 1.6, 'bevel': True},
              {'id': 'lock', 'op': 'rect', 'rect': [0.496, 0.085, 0.504, 0.1], 'ramp': 'galv', 'tone': 6.0, 'bevel': True},
          ]})
    return S


def lantern():
    """The shop's paper lantern (提灯): a red waxed-paper barrel on bamboo ribs with a white band, black lacquered rim
    caps top and bottom, the hanging cord and a yellow tassel. Centred on its middle (the game hangs four under the
    eave and makes the paper glow)."""
    S = Spec('lantern', ppm=160, desc='Red paper shop lantern')
    S.ramps(paper=ramp('#b8302a', 7, hue=14, sat=0.04, spread=0.75), white=ramp('#ece6d6', 6, hue=8, sat=0.02, spread=0.6),
            ink=ramp('#221c1c', 5, hue=8, sat=0.02, spread=0.6), gold=ramp('#d8a838', 6, hue=14, sat=0.04, spread=0.7))
    S.d['light'] = {'dir': [-0.45, 1.0, 0.6], 'strength': 0.3, 'gradient': 0.2, 'ao': 0.0, 'ao_height': 0.1}
    def paper(a, b):  # the white band at the belly: the end of each half that meets the other (normalised a..b)
        return {'ramp': 'paper', 'tone': 3.6, 'brush': {'off': True}, 'rim': {'light_shift': 0.4, 'dark_shift': -0.4}, 'layers': [
            {'id': 'band', 'op': 'band', 'axis': 'z', 'from': a, 'to': b, 'ramp': 'white', 'tone': 3.8},
            {'id': 'ribs', 'op': 'stripes', 'axis': 'z', 'period': 0.022, 'width': 0.22, 'shift': -1.0},
            {'id': 'crease', 'op': 'noise', 'scale': 0.03, 'amount': 0.3}]}
    # the barrel: two tapered 14-sided halves meeting at the belly
    S.prism('paper_lo', 0.3, 0.3, 0.17, [0, -0.085, 0], sides=14, rot=[-90, 0, 0], back_scale=[0.72, 0.72], hide=['front'], paint=paper(0.62, 1.0))
    S.prism('paper_hi', 0.3, 0.3, 0.17, [0, 0.085, 0], sides=14, rot=[-90, 0, 0], front_scale=[0.72, 0.72], hide=['back'], paint=paper(-1.0, -0.62))
    for y, n in ((0.185, 'cap_top'), (-0.185, 'cap_bot')):
        S.prism(n, 0.24, 0.24, 0.04, [0, y, 0], sides=14, rot=[-90, 0, 0], paint={'ramp': 'ink', 'tone': 2.0, 'brush': {'off': True}})
    S.prism('ring', 0.17, 0.17, 0.03, [0, 0.22, 0], sides=10, rot=[-90, 0, 0], paint={'ramp': 'ink', 'tone': 1.6})
    S.rod('cord', [0, 0.235, 0], [0, 0.44, 0], 0.006, sides=4, paint={'ramp': 'ink', 'tone': 1.4})
    S.box('tassel', 0.05, 0.06, 0.02, 0, -0.27, 0, paint={'ramp': 'gold', 'tone': 3.4})
    return S


def specs():
    return {'shopfront': shopfront(), 'garage_shell': garage_shell(), 'shutter': shutter(), 'lantern': lantern()}
