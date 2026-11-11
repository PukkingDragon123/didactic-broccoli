# Japanese text for the Poly Haven fire extinguisher (korean_fire_extinguisher_01): 消火器 on the stand, a 消火器点検票
# inspection card dated Heisei 11 (1999). Usage: python3 -I tools/decals/extinguisher.py <body.png> <card.png> <outdir>
import sys, random
from PIL import Image, ImageDraw, ImageFont
F = '/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf'
body, card, out = sys.argv[1:4]
random.seed(7)
a = Image.open(body).convert('RGB'); d = ImageDraw.Draw(a)
for y in range(18, 52):
    for x in range(12, 160):
        r = random.randint(-6, 6); d.point((x, y), (118 + r, 24 + r // 2, 21 + r // 2))
f = ImageFont.truetype(F, 27)
for i, ch in enumerate('消火器'):
    d.text((24 + i * 46, 21), ch, font=f, fill=(222, 214, 206))
a.save(out + '/ext_body.png')
b = Image.open(card).convert('RGB'); d = ImageDraw.Draw(b)
paper = (226, 222, 214); red = (196, 52, 44); ink = (52, 50, 58)
d.rectangle((35, 35, 235, 63), fill=red)
d.text((52, 38), '消火器点検票', font=ImageFont.truetype(F, 22), fill=(238, 232, 224))
d.rectangle((35, 67, 235, 318), fill=paper)
for y in range(67, 319):
    for x in range(35, 236):
        if random.random() < 0.08: d.point((x, y), tuple(c - random.randint(4, 14) for c in paper))
s = ImageFont.truetype(F, 11); h = ImageFont.truetype(F, 13)
for y in (68, 92, 116, 140): d.line((35, y, 235, y), fill=red, width=2)
d.line((100, 68, 100, 116), fill=red); d.line((150, 68, 150, 116), fill=red); d.line((190, 68, 190, 116), fill=red)
d.text((40, 74), '設置年', font=s, fill=red); d.text((106, 72), '平成5', font=h, fill=ink); d.text((154, 74), '場所', font=s, fill=red); d.text((193, 72), '店内', font=h, fill=ink)
d.text((40, 98), '管理番号', font=s, fill=red); d.text((106, 96), '3-27', font=h, fill=ink); d.text((154, 98), '種類', font=s, fill=red); d.text((193, 98), '粉末', font=s, fill=ink)
for x in (82, 140, 180): d.line((x, 116, x, 318), fill=red)
d.text((40, 122), '点検日', font=s, fill=red); d.text((88, 122), '点検者', font=s, fill=red); d.text((143, 122), '結果', font=s, fill=red); d.text((184, 122), '備考', font=s, fill=red)
rows = [('11/1', '三河', '良'), ('11/4', '三河', '良'), ('11/7', '山田', '良'), ('11/10', '三河', '良'), ('11/13', '', '')]
for i in range(8):
    y = 140 + i * 22; d.line((35, y, 235, y), fill=(208, 140, 132))
    if i < len(rows) and rows[i][1]:
        dt, who, ok = rows[i]
        d.text((40, y + 4), dt, font=h, fill=ink); d.text((90, y + 4), who, font=h, fill=ink); d.text((152, y + 4), ok, font=h, fill=ink)
b.save(out + '/ext_card.png')
