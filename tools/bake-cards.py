#!/usr/bin/env python3
"""bake-cards.py: the gacha display cards (台紙) and toy packaging art, from the ACTUAL in-game toys.
tools/render-toys.mjs renders every toy that exists (the game's own meshes, catalogue lighting, transparent) into
shots/.art-cache/toys/<series>/<item>.png + lineup.json; this lays them out like a real 1999 capsule-toy card: the
series title, the figures composited on a real photo backdrop (Open Images CC BY 2.0 / the game's credited photos),
a numbered line-up strip (全N種, the secret as a printed silhouette), price, age mark and maker line, then printed on
real card stock (tools/paperkit.py). Re-run both after the toy line-up changes:
  tools/slot.sh node tools/render-toys.mjs && python3 -I tools/bake-cards.py [series,...]
Out: public/img/print/cards/<series>.webp (320 x 280, the size src/gfx/banner.js draws).
"""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageFilter
from printkit import Panel, CACHE, ROOT, mixc, rgb
import paperkit as PK

TOYS = os.path.join(CACHE, 'toys')
OUT = os.path.join(ROOT, 'public', 'img', 'print', 'cards')
W, H = 320, 280
BACK = {  # series -> photo backdrop (focus x, y, zoom)
    'rojineko': ('local:back_street.jpg', (0.5, 0.6, 1.1)), 'denka': ('oi:f4200fadef07c329@test', (0.5, 0.55, 1.2)),
    'inusanpo': ('oi:1abfab68fd6a34c7@train', (0.6, 0.6, 1.2)), 'konchu': ('oi:42d6b48cf68049b9@test', (0.4, 0.5, 1.2)),
    'okashi': ('oi:f291d677045b5a38@test', (0.5, 0.6, 1.1)), 'sampuru': ('oi:6324262554f184ab@test', (0.5, 0.5, 1.2)),
    'shinkai': ('oi:f5cb8e5bda89bf5c@test', (0.5, 0.5, 1.1)), 'yacho': ('oi:ab7b7786ca8649a8@test', (0.5, 0.5, 1.0)),
    'hikidashi': ('oi:8cf0d90fadf83514@test', (0.5, 0.5, 1.1)), 'kaiun': ('oi:808e21f5b9632bab@test', (0.5, 0.5, 1.1)),
    'shugorei': ('oi:34f24d2374c50c25@test', (0.5, 0.5, 1.1)), 'machikado': ('oi:ae8ffd814db5ce63@test', (0.5, 0.5, 1.1)),
    'norimono': ('oi:43ef0d9ecd6dd4be@test', (0.5, 0.5, 1.1)), 'yatai': ('oi:ccf0a3b89149f0d5@train', (0.5, 0.6, 1.1)),
    'yudono': ('oi:2a1c261ad12e6f62@test', (0.3, 0.3, 1.0)), 'daikaiju': ('local:skyline.jpg', (0.5, 0.5, 1.0)),
    'tsukumo': ('oi:f4200fadef07c329@test', (0.2, 0.5, 1.4)), 'asobi': ('local:toy_shop.jpg', (0.5, 0.5, 1.1)),
}
INK = 0x1c1816; WHITE = 0xfbf8f1; RED = 0xc62a1f
RANK = {'secret': 4, 'ultra': 3, 'rare': 2, 'uncommon': 1, 'common': 0}


def hexc(s, d=0xf2e6cf):
    try: return int(str(s).lstrip('#'), 16)
    except Exception: return d


def toy(sid, iid):
    p = os.path.join(TOYS, sid, iid + '.png')
    if not os.path.exists(p): return None
    im = Image.open(p).convert('RGBA'); bb = im.getbbox()
    return im.crop(bb) if bb else None


def card(s):
    c = s.get('card') or {}
    bg, acc, txt, acc2 = hexc(c.get('bg')), hexc(c.get('accent'), RED), hexc(c.get('text'), INK), hexc(c.get('accent2'), 0x2a5aa8)
    items = [i for i in s['items']]
    P = Panel(W, H, WHITE)
    # --- the photo stage
    ref, f = BACK.get(s['id'], ('local:gacha_rows.jpg', (0.5, 0.5, 1.0)))
    P.photo(ref, 0, 34, W, 168, f=f, sat=0.9, con=1.02, bright=0.92)
    # --- title band
    P.rect(0, 0, W, 34, acc); P.rect(0, 34, W, 2, txt)
    P.text(s['jp'], 'mochiy', 20, 10, 17, WHITE, anchor='lm', maxw=232)
    P.rect(W - 74, 5, 66, 24, WHITE); P.text('1回', 'kakub', 8, W - 66, 17, txt, anchor='lm')
    P.text('%d' % s['price'], 'bebas', 22, W - 30, 17, RED, anchor='rm'); P.text('円', 'kakub', 9, W - 13, 19, RED, anchor='rm')
    # --- line-up strip
    y0 = 204
    P.rect(0, y0, W, H - y0, bg); P.rect(0, y0, W, 2, txt)
    n = len(items); cw = (W - 12) / max(1, n)
    P.text('全%d種' % n, 'kaku', 9, W - 6, H - 8, txt, anchor='rm')
    P.text(s['name'].upper(), 'bebas', 9, 6, H - 8, txt, anchor='lm', track=1)
    P.text('対象年齢15才以上', 'kakub', 5.5, W / 2, H - 8, txt)
    im = P.image().convert('RGBA')
    # --- figures: the hero line on the stage (rarest in the middle, bigger), the full line-up in the strip
    stage = sorted([i for i in items if not i['secret']], key=lambda i: -RANK.get(i['rarity'], 0))[:5]
    order = stage[1::2][::-1] + stage[:1] + stage[2::2] if stage else []
    order = [stage[k] for k in ([3, 1, 0, 2, 4] if len(stage) == 5 else range(len(stage)))] if len(stage) == 5 else stage
    slots = len(order)
    for k, it in enumerate(order):
        t = toy(s['id'], it['id'])
        if t is None: continue
        hero = it is stage[0]
        th = int((150 if hero else 112) * (1 if slots <= 3 else 0.92))
        t = t.resize((max(1, int(t.width * th / t.height)), th), Image.LANCZOS)
        if t.width > (W / slots) * 1.25: t = t.resize((int(W / slots * 1.25), int(t.height * W / slots * 1.25 / t.width)), Image.LANCZOS)
        cx = int(W * (k + 0.5) / slots); by = 198 if hero else 192
        sh = Image.new('RGBA', t.size, (20, 14, 10, 0)); sh.putalpha(t.getchannel('A').point(lambda v: int(v * 0.45)))
        sh = sh.filter(ImageFilter.GaussianBlur(3))
        im.alpha_composite(sh, (cx - t.width // 2 + 4, by - t.height + 3))
        im.alpha_composite(t, (cx - t.width // 2, by - t.height))
    for k, it in enumerate(items):
        t = toy(s['id'], it['id'])
        x = int(6 + cw * k); bw = int(cw) - 2
        if t is None: continue
        t = t.resize((max(1, int(t.width * 50 / t.height)), 50), Image.LANCZOS)
        if t.width > bw: t = t.resize((bw, max(1, int(t.height * bw / t.width))), Image.LANCZOS)
        if it['secret']:  # printed as a flat ink silhouette, as real cards hide the secret
            a = t.getchannel('A'); t = Image.new('RGBA', t.size, rgb(txt) + (0,)); t.putalpha(a)
        im.alpha_composite(t, (x + (bw - t.width) // 2, 258 - t.height))
    num = Panel(W, H, 0); 
    out = im.convert('RGB')
    P2 = Panel(W, H, 0)
    for k, it in enumerate(items):
        x = 6 + cw * k
        P2.late.append(('ptext', str(k + 1) if not it['secret'] else '?', x + 2, 208, txt if not it['secret'] else RED, 1, 'b5', 'lt', False, 0, None, None, None))
    for job in P2.late:
        from printkit import _late_ptext
        _late_ptext(out, *job[1:])
    return PK.age(out, paper='Paper001', grain_k=0.6, fade=0.05, seed=hash(s['id']) % 997).convert('RGB')


if __name__ == '__main__':
    L = json.load(open(os.path.join(TOYS, 'lineup.json')))
    only = sys.argv[1].split(',') if len(sys.argv) > 1 else None
    os.makedirs(OUT, exist_ok=True)
    for sid, s in L.items():
        if only and sid not in only: continue
        im = card(s); im.save(os.path.join(OUT, sid + '.webp'), quality=92, method=6)
        print('card', sid, len(s['items']))
