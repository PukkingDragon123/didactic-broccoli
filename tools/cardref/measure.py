#!/usr/bin/env python3
"""measure.py: the layout specs of the owner's reference gashapon cards (shots/clone/ref_<name>.png), as fractions
of the card's width / height (boxes x0, y0, x1, y1, measured by eye on a 10 x 10 grid), plus each region's colours
sampled with k-means (most common first). Writes tools/cardref/<name>.json; tools/bake-cards.py --ref <name> reads it.
  python3 -I tools/cardref/measure.py"""
import os, json
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

SPEC = {
    'crabcan': dict(
        aspect=438 / 367, bg='solid', logo=dict(style='heavy italic', fill='label_logo', outline=None, shadow=None, angle=0, shear=0.22),
        box=dict(lid=(.05, .01, .95, .10), price=(.02, .02, .16, .11), maker=(.86, .02, .97, .09), label=(.06, .12, .94, .33),
                 catch=(.25, .155, .75, .19), logo=(.15, .20, .85, .30), date=(.02, .29, .13, .36), obj=(.05, .37, .35, .57),
                 arrow=(.30, .52, .40, .60), hero=(.36, .31, .83, .71), dim=(.84, .35, .88, .67), catch2=(.07, .615, .32, .64),
                 big=(.06, .64, .48, .70), heroname=(.62, .675, .76, .70), lineup_lid=(.05, .71, .66, .77),
                 lineup=(.06, .74, .65, .895), lineup_head=(.25, .745, .46, .765), sticker=(.69, .72, .95, .89),
                 slogan=(.02, .90, .97, .935), footer=(0, .945, 1, 1), footer_maker=(.76, .95, .97, .98)),
        sample=dict(bg=(.02, .40, .05, .60), label=(.10, .14, .20, .17), label_logo=(.30, .21, .70, .29), lid_ring=(.10, .02, .90, .09),
                    lineup_name=(.10, .86, .60, .885), footer=(.05, .95, .70, 1))),
    'pipeotter': dict(
        override=dict(stripe='#cfe8f2', green='#1f9a3a', red='#e2403a', yellow='#f0b020', blue='#3a70c0', shadow='#8a9aa4',
                      cell='#f2ec96', maker='#e8862a'),  # picked by eye from a 2x zoom (the k-means boxes mix pipes in)
        aspect=356 / 367, bg='diagonal stripes', logo=dict(style='chunky rounded', fill='logo_a', fill2=['logo_b', 'logo_c', 'logo_d'],
                                                            outline=(2, 'white'), shadow=(1, 2, 'logo_shadow'), angle=0),
        box=dict(maker=(.02, .03, .10, .14), catch=(.38, .03, .80, .17), stripes=(0, 0, 1, .66), hero=(.60, .03, .97, .46),
                 pipes=(.05, .06, .62, .62), logo=(.02, .47, .97, .67), opts=(.02, .66, .30, .75), callout=(.40, .66, .80, .75),
                 extra=(.88, .66, .98, .75), count=(.02, .74, .12, .81), info=(.14, .745, .38, .80),
                 lineup=(.02, .80, .98, .985), lineup_head=(.02, .80, .98, .835), floor=(0, .76, 1, 1)),
        sample=dict(bg=(.30, .20, .40, .30), stripe=(.0, .30, .05, .45), logo_a=(.07, .52, .30, .64), logo_b=(.38, .50, .50, .64),
                    logo_c=(.52, .52, .64, .64), logo_d=(.80, .48, .96, .62), logo_shadow=(.05, .62, .95, .67), cell=(.05, .84, .25, .97),
                    cell_frame=(.02, .80, .98, .835), floor=(0, .78, 1, .80), maker=(.03, .04, .09, .13), count=(.02, .74, .12, .81))),
    'fruitdragon': dict(
        override=dict(red='#c8322a', leaf_dark='#2f5426', leaf_mid='#4f7a3a', leaf_light='#7ea255'),
        aspect=425 / 366, bg='leaves on cream', logo=dict(style='heavy brush', fill='logo', outline=(2, 'white'), shadow=None, angle=0),
        box=dict(catch=(.04, .025, .46, .085), logo1=(.07, .10, .42, .25), logo2=(.06, .25, .50, .36), sub=(.07, .37, .52, .43),
                 maker=(.87, .03, .97, .24), hero=(.43, .05, .84, .52), heroname=(.62, .26, .76, .29),
                 lineup=(.03, .47, .96, .72), lineup_names=(.03, .73, .96, .765), band=(0, .775, 1, 1),
                 price=(.02, .79, .185, .885), count=(.02, .85, .185, .885), age=(.02, .893, .185, .98),
                 warn=(.195, .79, .62, .98), warn_head=(.195, .79, .62, .81), warn_bar=(.195, .868, .62, .888),
                 makerblk=(.63, .79, .98, .98), qr=(.88, .80, .97, .875), barcode=(.79, .915, .97, .97)),
        sample=dict(bg=(.30, .40, .45, .46), leaf=(.0, .55, .06, .75), logo=(.08, .14, .38, .24), catch=(.05, .03, .45, .08),
                    sub=(.08, .375, .50, .425), band=(.0, .78, 1, .79), price_red=(.03, .86, .18, .88), warn_head=(.20, .79, .61, .81),
                    names=(.10, .735, .90, .76))),
}


def kmeans(px, k=3, it=12):
    px = px.reshape(-1, 3).astype(float)
    c = px[np.linspace(0, len(px) - 1, k).astype(int)]
    for _ in range(it):
        lab = ((px[:, None] - c[None]) ** 2).sum(2).argmin(1)
        c = np.array([px[lab == j].mean(0) if (lab == j).any() else c[j] for j in range(k)])
    n = np.bincount(lab, minlength=k)
    return ['#%02x%02x%02x' % tuple(int(v) for v in c[j]) for j in np.argsort(-n)]


for name, sp in SPEC.items():
    im = np.asarray(Image.open(os.path.join(ROOT, 'shots', 'clone', 'ref_%s.png' % name)).convert('RGB'))
    H, W = im.shape[:2]
    cols = {}
    for key, (x0, y0, x1, y1) in sp.pop('sample').items():
        cols[key] = kmeans(im[int(y0 * H):max(int(y1 * H), int(y0 * H) + 1), int(x0 * W):max(int(x1 * W), int(x0 * W) + 1)])
    sp['colours'] = cols; sp['ref'] = 'shots/clone/ref_%s.png' % name
    json.dump(sp, open(os.path.join(ROOT, 'tools', 'cardref', name + '.json'), 'w'), indent=1)
    print(name, json.dumps(cols))
