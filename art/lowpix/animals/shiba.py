"""The lane's Shiba Inu as a lowpix sculpt, from photo reference of a red Shiba (shoulder 38 cm): a deep chest, a tucked
loin, a long straight back, a fox-like wedge head with a defined stop, small thick prick ears tilted forward, a
sickle tail curled over the back, straight legs with tight cat-like paws. Units: centimetres, +z forward, y up; the
joints match src/animals/dog.js DOG_BONES (metres x 100). The coat is painted by lowpix (orange fur with strands);
make.py adds the urajiro (cream underside, cheeks, chest, inner legs), the eyes, nose and markings per coat.
    python3 art/lowpix/animals/shiba.py  ->  art/lowpix/animals/specs/shiba.json
"""
import json, os

def ring(z, y, w, up, dn, x=0.0):
    # an egg section of half-width w, up / dn above and below the spine point -> lowpix ring
    return {"at": [round(x, 2), round(y + (up - dn) / 2, 2), round(z, 2)], "size": [round(2 * w, 2), round(up + dn, 2)]}

FUR = {"ramp": "fur", "tone": 6.2, "layers": [
    {"id": "under", "op": "gradient", "axis": "y", "amount": 1.6},
    {"id": "clumps", "op": "patches", "scale": 2.2, "threshold": 0.6, "shift": -0.8},
    {"id": "lights", "op": "patches", "scale": 1.8, "threshold": 0.7, "shift": 0.7, "faces": ["top", "sides"]},
    {"id": "hair", "op": "stripes", "axis": "path", "period": 0.7, "width": 0.22, "shift": -0.6, "wobble": 0.5},
    {"id": "shine", "op": "stripes", "axis": "path", "period": 1.3, "width": 0.18, "phase": 0.4, "shift": 0.9, "wobble": 0.6, "min_light": 0.2}]}

def spec():
    S = lambda z, y, w, u, d: ring(z, y * 100, w * 100, u * 100, d * 100)
    parts = []
    # trunk: rump -> loin (tucked) -> ribs (deep chest) -> withers -> neck
    parts.append({"id": "body", "shape": "loft", "style": "fur", "profile": {"sides": 12, "round": 2.0}, "subdiv": 1, "caps": [True, False],
                  "rings": [S(-21.6, .345, .045, .042, .050), S(-19.0, .338, .068, .062, .074), S(-13.0, .336, .074, .064, .066),
                            S(-6.0, .336, .078, .066, .086), S(1.5, .334, .084, .068, .122), S(8.5, .337, .084, .070, .134),
                            S(14.5, .350, .072, .064, .118), S(19.0, .378, .056, .055, .072), S(22.4, .412, .048, .048, .056),
                            S(24.6, .440, .041, .040, .044)]})
    # head: skull -> stop -> muzzle (a wedge narrowing to the nose)
    Sh = lambda z, y, w, u, d: ring(22.0 + (z - 22.0) * 1.06, y * 100, w * 110, u * 108, d * 108)
    parts.append({"id": "head", "shape": "loft", "style": "fur", "profile": {"sides": 10, "round": 2.3}, "subdiv": 1, "caps": [True, True],
                  "rings": [Sh(20.4, .466, .028, .028, .026), Sh(22.2, .469, .050, .044, .044), Sh(24.8, .467, .060, .047, .051),
                            Sh(27.0, .462, .054, .041, .047), Sh(28.8, .452, .036, .031, .039), Sh(30.8, .440, .026, .022, .024),
                            Sh(33.0, .435, .021, .018, .017), Sh(34.8, .433, .017, .015, .013)]})
    parts.append({"id": "jaw", "shape": "loft", "style": "fur", "profile": {"sides": 8, "round": 2.2}, "subdiv": 1, "caps": [True, True],
                  "rings": [S(27.0, .418, .026, .011, .019), S(29.7, .416, .021, .008, .014), S(32.2, .415, .016, .006, .010), S(34.0, .416, .012, .005, .007)]})
    parts.append({"id": "nose", "shape": "loft", "style": "nose", "profile": {"sides": 8, "round": 2.4}, "subdiv": 0, "caps": [True, True],
                  "rings": [S(35.0, .4365, .0125, .009, .0085), S(36.1, .438, .0115, .008, .0075)]})
    # ears: small thick triangles, base on the skull, tips tilted forward and out
    for s, n in ((1, "ear_l"), (-1, "ear_r")):
        parts.append({"id": n, "shape": "loft", "style": "fur", "profile": {"sides": 6, "round": 2.0}, "subdiv": 1, "caps": [True, True],
                      "rings": [{"at": [s * 3.0, 47.4, 24.4], "size": [6.0, 2.6]}, {"at": [s * 3.5, 49.6, 24.6], "size": [5.0, 2.0]},
                                {"at": [s * 4.0, 51.8, 25.0], "size": [3.2, 1.5]}, {"at": [s * 4.4, 54.0, 25.4], "size": [0.6, 0.5]}]})
    # legs: through the dog.js joints (shoulder / elbow / wrist / toes; hip / knee / hock / toes)
    for s, n in ((1, "l"), (-1, "r")):
        parts.append({"id": "fore_" + n, "shape": "loft", "style": "fur", "profile": {"sides": 8, "round": 2.1}, "subdiv": 1, "caps": [False, True],
                      "rings": [{"at": [s * 4.0, 34.0, 12.8], "size": [7.6, 11.4]}, {"at": [s * 5.0, 29.5, 13.4], "size": [8.2, 11.2]},
                                {"at": [s * 5.3, 20.5, 10.8], "size": [5.8, 6.8]}, {"at": [s * 5.1, 14.0, 11.5], "size": [4.6, 4.8]},
                                {"at": [s * 4.9, 9.0, 12.4], "size": [4.0, 4.0]}, {"at": [s * 4.8, 5.5, 13.0], "size": [3.9, 3.9]},
                                {"at": [s * 4.8, 3.0, 14.2], "size": [4.6, 4.2]}, {"at": [s * 4.8, 1.8, 15.6], "size": [4.8, 3.4]},
                                {"at": [s * 4.8, 1.4, 16.8], "size": [3.4, 2.0]}]})
        parts.append({"id": "hind_" + n, "shape": "loft", "style": "fur", "profile": {"sides": 8, "round": 2.1}, "subdiv": 1, "caps": [False, True],
                      "rings": [{"at": [s * 4.0, 36.0, -15.0], "size": [8.0, 13.0]}, {"at": [s * 5.6, 30.5, -16.5], "size": [9.6, 15.0]},
                                {"at": [s * 6.1, 25.0, -14.0], "size": [8.2, 12.0]}, {"at": [s * 6.1, 20.5, -12.0], "size": [5.8, 7.0]},
                                {"at": [s * 5.7, 15.0, -17.0], "size": [4.6, 5.4]}, {"at": [s * 5.2, 9.5, -22.2], "size": [4.0, 4.6]},
                                {"at": [s * 5.1, 5.0, -20.2], "size": [3.9, 3.9]}, {"at": [s * 5.1, 2.4, -18.0], "size": [4.6, 4.2]},
                                {"at": [s * 5.1, 1.6, -16.6], "size": [4.8, 3.2]}, {"at": [s * 5.1, 1.3, -15.4], "size": [3.4, 2.0]}]})
    # the sickle tail: up from the croup, curled forward over the back, tip resting on the hip
    parts.append({"id": "tail", "shape": "loft", "style": "fur", "profile": {"sides": 8, "round": 2.0}, "subdiv": 1, "caps": [False, True],
                  "rings": [{"at": [0, 37.0, -20.0], "size": [4.2, 4.2]}, {"at": [0, 40.0, -23.0], "size": [5.4, 5.4]},
                            {"at": [0, 44.5, -24.2], "size": [6.0, 6.0]}, {"at": [0, 48.4, -21.4], "size": [5.6, 5.6]},
                            {"at": [1.2, 49.2, -17.0], "size": [4.6, 4.6]}, {"at": [2.6, 47.0, -14.0], "size": [3.4, 3.4]}, {"at": [3.2, 44.6, -12.6], "size": [0.6, 0.6]}]})
    return {
        "name": "Shiba Inu", "description": "A red Shiba Inu for the lane (src/animals/dog.js), sculpted from photo reference.",
        "author": "Gacha Garage", "license": "CC0-1.0", "density": 7,
        "budget": {"tris": 2800, "colors": 64},
        "light": {"dir": [-0.45, 1.0, 0.6], "strength": 0.55, "gradient": 0.5, "ao": 0.9, "ao_height": 14.0},
        "brush": {"flow": "path", "length": 1.6, "width": 0.5, "rough": 0.45, "overshoot": 0.2, "textures": {"fur": "fur"}},
        "palette": {"ramps": {"fur": ["#2a1610", "#3d2114", "#552d18", "#6e3a1d", "#874823", "#9e562a", "#b26532", "#c3753d", "#d0864b", "#da985d", "#e3ab73", "#ebbf8d"],
                              "nose": ["#100c0c", "#1c1616", "#2a2222", "#3a3030"]}},
        "styles": {"fur": FUR, "nose": {"ramp": "nose", "tone": 1.2, "brush": {"off": True}}},
        "render": {"background": "#2a2622", "hero": [-38, 18], "shadow": 0.5},
        "parts": parts,
    }

if __name__ == '__main__':
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'specs', 'shiba.json')
    json.dump(spec(), open(out, 'w'), indent=1)
    print(out)
