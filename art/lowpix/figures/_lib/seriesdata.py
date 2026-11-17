"""Write src/data/series/<id>.js for a series from its art/lowpix/figures/_src/<id>.py figures (names, descriptions)
plus the game data below (order, price, card colours, Japanese names, rarities, gimmick texts)."""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

R = {"c": "common", "u": "uncommon", "r": "rare", "x": "ultra", "s": "secret"}
SERIES = {
    "hikidashi": dict(order=2, name="Desk Drawer", jp="ひきだし文具", tagline="Everything in your school desk, small enough to lose", taglineJp="机の引き出し大集合！",
                      price=100, themes=["school", "retro", "home"], card=("#eef2f6", "#2a5aa8", "#1a2030", "#d83a2a", "grid"), caps=[0x2a5aa8, 0xd83a2a, 0xeef2f6, 0xe8c040],
                      items=[("fudebako", "筆箱セット", "c", None), ("cup", "えんぴつ立て", "c", None), ("stapler", "ホッチキス", "c", "Clack"), ("kezuri", "鉛筆削り", "u", "Turn the crank"),
                             ("soroban", "そろばん", "u", "Flick the beads"), ("pen", "万年筆", "r", None), ("randoseru", "赤いランドセル", "x", "Swing it"), ("golden", "黄金の万年筆", "s", "Turn it")]),
    "asobi": dict(order=5, name="Dagashi-ya Toys", jp="駄菓子屋おもちゃ", tagline="Old-school toys you can really play with", taglineJp="遊べる！駄菓子屋おもちゃ",
                  price=300, themes=["retro", "weird"], card=("#fff1d6", "#e8453c", "#3a2410", "#3f86e8", "checker"), caps=[0xe8453c, 0x3f86e8, 0xf7d046, 0x58c06c], style="tab",
                  items=[("squishy", "メロンパンスクイーズ", "c", None), ("superball", "スーパーボール", "c", None), ("koma", "手回しコマ", "c", None), ("yoyo", "チャンピオンヨーヨー", "u", None),
                         ("robot", "ゼンマイブリキロボ", "u", None), ("kendama", "けん玉", "r", None), ("dartgun", "スポンジダーツ銃", "x", None), ("lcdgame", "ポケット液晶ゲーム", "s", None)]),
    "machikado": dict(order=11, name="Street Corner", jp="街角コレクション", tagline="The corner of the street, small enough to keep", taglineJp="あの街角を手のひらに",
                      price=300, themes=["city", "retro"], card=("#efe8dc", "#c8392b", "#22201e", "#3a7a5a", "stripes"), caps=[0xc8392b, 0x3a7a5a, 0xefe8dc, 0xe8a83a],
                      items=[("posuto", "丸ポスト", "c", None), ("jihanki", "キャンディー自販機", "c", "Push the button"), ("shokasen", "消火栓", "c", None), ("cone", "工事のコーン", "u", "Knock it"),
                             ("denwa", "電話ボックス", "u", None), ("gaito", "街灯", "r", None), ("busstop", "田舎のバス停", "x", None), ("golden", "黄金のポスト", "s", "Turn it")]),
    "yudono": dict(order=12, name="Onsen Animals", jp="どうぶつ温泉", tagline="Everybody into the bath", taglineJp="いい湯だな〜どうぶつ温泉",
                   price=200, themes=["japan", "cute"], card=("#e6f0ee", "#3a8a8a", "#1a2828", "#e8a83a", "waves"), caps=[0x3a8a8a, 0xe8a83a, 0xe6f0ee, 0x8a5a3a],
                   items=[("capy", "ゆず湯カピバラ", "c", None), ("penguin", "湯おけペンギン", "c", "Waddle"), ("frog", "ひのき風呂のカエル", "c", "Hop in"), ("otter", "岩の上のカワウソ", "u", "Look round"),
                          ("duck", "お風呂のアヒル", "u", "Bob"), ("family", "カピバラ一家", "r", None), ("rotenburo", "雪見の露天風呂", "x", None), ("kinkapi", "金のカピバラ様", "s", "Turn it")]),
    "tsukumo": dict(order=13, name="Tsukumogami Parade", jp="付喪神パレード", tagline="After a hundred years, things wake up", taglineJp="百年たったら動きだす！",
                    price=300, themes=["spooky", "japan", "weird"], card=("#22263a", "#e8a83a", "#f0ead8", "#c83a4a", "stars"), caps=[0x22263a, 0xe8a83a, 0xc83a4a, 0x5ab8c8],
                    items=[("chochin", "ちょうちんおばけ", "c", "Hop"), ("kasa", "からかさおばけ", "c", "Hop"), ("geta", "はねる下駄", "c", "Hop"), ("kettle", "鉄瓶のつくも神", "u", "Rattle"),
                           ("broom", "ほうき神", "u", "Sweep"), ("mon", "紋ちょうちん", "r", "Hop"), ("parade", "百鬼夜行", "x", None), ("golden", "黄金の鉄瓶", "s", "Turn it")]),
    "norimono": dict(order=14, name="Lane Vehicles", jp="路地のりもの", tagline="Everything with wheels on our street", taglineJp="路地を走るのりものたち",
                     price=400, themes=["city", "retro"], card=("#e8eef2", "#2a6ab8", "#1a1e26", "#e8c040", "checker"), caps=[0x2a6ab8, 0xe8c040, 0xe8eef2, 0xc83a2a],
                     items=[("scooter", "ミントのスクーター", "c", "Ride"), ("keitruck", "軽トラ", "c", "Bump"), ("van", "配達バン", "c", "Bump"), ("bus", "ボンネットバス", "u", None),
                            ("patrol", "パトカー", "u", "Lights"), ("fire", "消防車", "r", "Go!"), ("tram", "チンチン電車", "x", "Ring the bell"), ("golden", "黄金のスクーター", "s", "Spin")]),
    "daikaiju": dict(order=16, name="Kaiju Diorama", jp="大怪獣ジオラマ", tagline="The monsters are in town", taglineJp="大怪獣、街にあらわる！",
                     price=400, themes=["weird", "city"], card=("#2a2a36", "#e85a2a", "#f0ece0", "#5ab84a", "stripes"), caps=[0xe85a2a, 0x5ab84a, 0x2a2a36, 0xe8c040],
                     items=[("gyaosaur", "ギャオザウルス", "c", "Roar"), ("anky", "アーマラス", "c", "Stomp"), ("kanigon", "カニゴン", "c", "Scuttle"), ("iwagame", "イワガメ", "u", "Turn"),
                            ("gamagon", "ガマゴン", "u", "Hop"), ("okami", "影の魔獣", "r", "Prowl"), ("tetsujin", "鋼鉄巨神", "x", "Nod"), ("golden", "黄金ギャオザウルス", "s", "Roar")]),
    "yatai": dict(order=18, name="Summer Festival Stalls", jp="夏祭り屋台", tagline="A summer night at the shrine festival", taglineJp="お祭りの屋台へようこそ！",
                  price=300, themes=["japan", "food", "retro"], card=("#2a2440", "#e85a3a", "#f6ecd8", "#f0c040", "dots"), caps=[0xe85a3a, 0xf0c040, 0x2a2440, 0x3a8ac8],
                  items=[("kingyo", "金魚すくい", "c", "Swish"), ("omen", "きつねのお面", "c", None), ("takoyaki", "たこ焼き舟", "c", None), ("wataame", "わたあめ", "u", None),
                         ("yoyo", "水ヨーヨー", "u", None), ("taiko", "祭り太鼓", "r", "Drum"), ("stall", "かき氷屋台", "x", None), ("golden", "黄金の金魚", "s", "Swish")]),
    "kaiun": dict(order=20, name="Lucky Charms", jp="開運招福", tagline="Good luck, in a capsule", taglineJp="ご利益たっぷり開運招福！",
                  price=500, themes=["shrine", "japan"], card=("#fff2e0", "#c8302a", "#2a1810", "#e8b830", "sakura"), caps=[0xc8302a, 0xe8b830, 0xfff2e0, 0x2a2a2a],
                  items=[("maneki", "招き猫", "c", "Beckon"), ("daruma", "だるま", "c", "Wobble"), ("torii", "朱の鳥居", "c", None), ("toro", "石灯籠", "u", None),
                         ("koi", "開運の鯉", "u", "Swim"), ("kitsune", "お稲荷さん", "r", None), ("jinja", "夕暮れの鳥居", "x", None), ("goldneko", "黄金の招き猫", "s", "Beckon")]),
    "shugorei": dict(order=22, name="Guardian Spirits", jp="守護霊ガーディアンズ", tagline="Every fate has a guardian. Pull yours.", taglineJp="あらわれよ、守護の霊！",
                     price=500, themes=["weird", "spooky"], card=("#1e1a2a", "#b85ae8", "#f0e8ff", "#f0c850", "stars"), caps=[0x1e1a2a, 0xb85ae8, 0xf0c850, 0x4ac8e8],
                     items=[("tetsu", "鉄の浪人", "c", "Turn"), ("kage", "影ふみ", "c", "Turn"), ("kishi", "忘れられた騎士", "c", "Turn"), ("ou", "老王の甲冑", "u", "Turn"),
                            ("raijin", "稲妻の刃", "u", "Strike"), ("yoroi", "空っぽの鎧", "r", "Turn"), ("mecha", "鋼の将軍", "x", "Turn"), ("golden", "黄金の守護霊", "s", "Turn")]),
}
TOYS = {"squishy": "squishy", "superball": "ball", "koma": "top", "yoyo": "yoyo", "robot": "robot", "kendama": "kendama", "dartgun": "dartgun", "lcdgame": "lcd"}


def js(v):
    return json.dumps(v, ensure_ascii=False)


def write(sid, root):
    import importlib.util
    meta = SERIES[sid]
    spec = importlib.util.spec_from_file_location("src_" + sid, os.path.join(HERE, "..", "_src", sid + ".py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    figs = {k: fn() for k, fn in mod.FIGS.items()}
    bg, ac, tx, ac2, pat = meta["card"]
    caps = ", ".join("0x%06x" % c for c in meta["caps"])
    style = f", style: '{meta['style']}'" if meta.get("style") else ""
    lines = [f"// Series {meta['order']}: {meta['name']} ({meta['jp']}). Lowpix figures: art/lowpix/figures/_src/{sid}.py",
             "// (written by art/lowpix/figures/_lib/seriesdata.py; GLBs in public/models/lowpix/figures/" + sid + "/).",
             "export default {", f"  id: '{sid}',", f"  order: {meta['order']},", f"  name: {js(meta['name'])},", f"  jp: {js(meta['jp'])},",
             f"  tagline: {js(meta['tagline'])},", f"  taglineJp: {js(meta['taglineJp'])},", f"  price: {meta['price']},",
             f"  themes: {js(meta['themes'])},", f"  card: {{ bg: '{bg}', accent: '{ac}', text: '{tx}', accent2: '{ac2}', pattern: '{pat}' }},",
             f"  capsule: {{ colors: [{caps}]{style} }},", "  items: ["]
    for iid, jp, r, gm in meta["items"]:
        F = figs[iid]
        extra = ""
        if gm:
            extra += f", gimmick: {{ text: {js(gm)} }}"
        if sid == "asobi":
            extra += f", toy: '{TOYS[iid]}'"
            if iid == "robot":
                extra += ", figParts: { key: true }, ownParts: ['key']"
            if iid == "kendama":
                extra += ", figParts: { ken: true, tama: true }, ownParts: ['tama']"
            if iid == "dartgun":
                extra += ", figParts: { dart: true }, ownParts: ['dart']"
            if iid == "lcdgame":
                extra += ", screen: { pts: true }"
        lines.append(f"    {{ id: '{iid}', name: {js(F.name)}, jp: {js(jp)}, rarity: '{R[r]}', desc: {js(F.spec['description'])}{extra} }},")
    lines += ["  ],", "};", ""]
    open(os.path.join(root, "src", "data", "series", sid + ".js"), "w").write("\n".join(lines))


if __name__ == "__main__":
    root = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
    for sid in sys.argv[1:] or SERIES:
        write(sid, root)
        print("wrote", sid)
