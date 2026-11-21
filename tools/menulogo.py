"""menulogo.py: the title screen's 3D hand-painted GACHA GARAGE title (src/menu/logo.js shows it). Same pipeline as the
gacha cards' titles (tools/logo3d.py + art/blender/logo3d/scene.py): our own GG Display glyphs extruded into chunky
blocks, painted in the game's own theme (tools/logo3d_themes.py 'garage': enamel-sign tin with rust chips over the lane's
green corrugated shutter steel, screw heads, the shutter key), under the toy key light with real contact shadows; then
pixel-snapped (hard alpha, quantised palette, ink die-cut keyline, hard ink ground shadow). One scene, rendered at a few
pixel grids so the menu can always show it at a whole-number scale (crisp at 1080p, 1440p and 4K):
  python3 -I tools/menulogo.py            -> public/img/menu/title_<w>.png (+ title.json: sizes, hanging points)"""
import os, sys, json, shutil, subprocess
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import logo3d
from printkit import ROOT

WIDTHS = (300, 400, 540)  # texel grids (the menu picks size x integer scale for the viewport)
DST = os.path.join(ROOT, 'public', 'img', 'menu')


def main():
    os.makedirs(logo3d.OUT, exist_ok=True); os.makedirs(DST, exist_ok=True)
    base = logo3d.spec('garage', dict(lines=['GACHA', 'GARAGE'], align='m'), [], None, (WIDTHS[-1], 400), 'garage_title')
    # a calm, frontal three-quarter view (it hangs face-on over the lane), a few more samples than a card title
    base['cam'] = dict(elev=12.0, azim=-14.0, dist=2.4); base['samples'] = 64
    paths = []
    for w in WIDTHS:
        S = dict(base, box=[w, 400], out=os.path.join(logo3d.OUT, 'garage_title_%d_raw.png' % w))
        p = os.path.join(logo3d.OUT, 'garage_title_%d.json' % w); json.dump(S, open(p, 'w')); paths.append(p)
    subprocess.run([os.path.join(ROOT, 'tools', 'blender.sh'), os.path.join(ROOT, 'art', 'blender', 'logo3d', 'scene.py')] + paths,
                   check=True, stdout=None if os.environ.get('LOGO3D_LOG') else subprocess.DEVNULL, cwd=ROOT)
    meta = dict(sizes=[])
    for w in WIDTHS:
        name = 'garage_title_%d' % w
        logo3d.finish(name)
        im = Image.open(os.path.join(logo3d.OUT, name + '.png'))
        # crop to the drawn pixels (+1 for the keyline), then find where the chains hook on: the top of the top line at
        # about a fifth in from each end
        bb = im.getchannel('A').getbbox(); im = im.crop(bb)
        A = np.asarray(im.getchannel('A')) == 255
        hooks = []
        for u in (0.2, 0.8):
            best = None
            for dx in range(-int(im.width * 0.08), int(im.width * 0.08) + 1):
                x = int(im.width * u) + dx
                ys = np.nonzero(A[:, x])[0]
                if len(ys) and (best is None or ys[0] < best[1]): best = (x, int(ys[0]))
            hooks.append(best)
        im.save(os.path.join(DST, 'title_%d.png' % w), optimize=True)
        meta['sizes'].append(dict(w=im.width, h=im.height, src='title_%d.png' % w, hooks=hooks))
        for t in ('_raw.png', '.json', '.png'):
            q = os.path.join(logo3d.OUT, name + t)
            if os.path.exists(q) and not os.environ.get('LOGO3D_KEEP'): os.remove(q)
    json.dump(meta, open(os.path.join(DST, 'title.json'), 'w'), indent=1)
    print('menulogo', [(s['w'], s['h']) for s in meta['sizes']])


if __name__ == '__main__':
    main()
