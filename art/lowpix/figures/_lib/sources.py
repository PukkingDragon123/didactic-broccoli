"""Real-model sources for the figures: polite Sketchfab downloads (one at a time, backing off on 429), node filters
(drop a scan's colour-checker cube, keep one part of a set) and source bounding boxes, so a figure can size its subject
and build its base around it before anything is converted.
"""
import hashlib
import json
import os
import re
import struct
import sys
import threading

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
LOWPIX = os.environ.get("LOWPIX", "/home/user/pukkingdragon123/symmetrical-goggles")
CONV = os.path.join(ROOT, "node_modules", ".cache", "lowpix-conv")
BBOX_CACHE = os.path.join(CONV, "bbox.json")
_lock = threading.Lock()


def _find(d):
    for base, _, files in os.walk(d):
        for f in sorted(files):
            if f.lower().endswith((".gltf", ".glb")) and "_drop_" not in f and "_keep_" not in f:
                return os.path.join(base, f)
    return None


def ensure_source(src):
    """A local .gltf/.glb path for a source (downloaded once into the shared cache)."""
    import time
    import urllib.error
    if src.startswith("polyhaven:"):
        asset = src.split(":", 1)[1]
        d = os.path.join(CONV, "src", "polyhaven_" + asset)
        f = _find(d)
        if f:
            return f
        sys.path.insert(0, LOWPIX)
        from lowpix.convert import polyhaven_fetch
        with _lock:
            p = polyhaven_fetch(asset, d, res="1k")
        json.dump({"name": asset.replace("_", " "), "author": "Poly Haven", "author_url": "https://polyhaven.com",
                   "source": "https://polyhaven.com/a/" + asset, "licence": "cc0",
                   "note": "CC0: no attribution required (credited anyway)."}, open(os.path.join(d, "ATTRIBUTION.json"), "w"), indent=1)
        return p
    if not src.startswith("sketchfab:"):
        return src
    os.environ.setdefault("LOWPIX_SKETCHFAB_TOKEN", "proxy-injected")
    sys.path.insert(0, LOWPIX)
    from lowpix.sketchfab import fetch
    uid = src.split(":", 1)[1]
    d = os.path.join(CONV, "src", "sketchfab_" + uid, "sketchfab_" + uid)
    f = _find(d)
    if f:
        return f
    with _lock:
        for attempt in range(14):
            f = _find(d)
            if f:
                return f
            try:
                return fetch(uid, d)
            except urllib.error.HTTPError as e:
                if e.code != 429:
                    raise
                wait = 45 * (attempt + 1)
                print(f"  sketchfab busy (429), waiting {wait}s for {uid}", flush=True)
                time.sleep(wait)
    raise RuntimeError("sketchfab kept refusing " + uid)


def _load_gltf(path):
    if path.endswith(".glb"):
        with open(path, "rb") as fh:
            data = fh.read()
        n = struct.unpack("<I", data[12:16])[0]
        return json.loads(data[20:20 + n])
    return json.load(open(path))


def _accessor(d, base, ai):
    """numpy view of a glTF accessor (non-sparse, from external .bin buffers)."""
    import numpy as np
    a = d["accessors"][ai]
    bv = d["bufferViews"][a["bufferView"]]
    buf = d["buffers"][bv["buffer"]]
    raw = open(os.path.join(base, buf["uri"]), "rb").read() if "uri" in buf else b""
    ct = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}[a["componentType"]]
    n = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[a["type"]]
    off = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
    stride = bv.get("byteStride", 0)
    item = np.dtype(ct).itemsize * n
    if stride and stride != item:
        arr = np.frombuffer(raw, dtype=np.uint8, count=stride * (a["count"] - 1) + item, offset=off)
        rows = np.lib.stride_tricks.as_strided(arr, (a["count"], item), (stride, 1))
        return np.frombuffer(rows.copy().tobytes(), dtype=ct).reshape(a["count"], n)
    return np.frombuffer(raw, dtype=ct, count=a["count"] * n, offset=off).reshape(a["count"], n)


def crop(path, box):
    """A copy of a glTF keeping only the triangles inside `box` [x0, y0, z0, x1, y1, z1] (source world units): a scanned
    cat cut out of its blanket, a dish lifted off the scanned table."""
    import numpy as np
    d = _load_gltf(path)
    base = os.path.dirname(path)
    nodes = d.get("nodes", [])
    lo, hi = np.array(box[:3]), np.array(box[3:])
    out = bytearray()
    blo, bhi = np.full(3, 1e18), np.full(3, -1e18)
    scenes = d.get("scenes", [{"nodes": list(range(len(nodes)))}])
    stack = [(r, np.eye(4)) for r in scenes[d.get("scene", 0)]["nodes"]]
    done = set()
    while stack:
        i, P = stack.pop()
        W = P @ _mat(nodes[i])
        if "mesh" in nodes[i] and nodes[i]["mesh"] not in done:
            done.add(nodes[i]["mesh"])
            for p in d["meshes"][nodes[i]["mesh"]]["primitives"]:
                V = _accessor(d, base, p["attributes"]["POSITION"]).astype(np.float64)
                V = (np.c_[V, np.ones(len(V))] @ W.T)[:, :3]
                I = _accessor(d, base, p["indices"]).reshape(-1, 3) if "indices" in p else np.arange(len(V)).reshape(-1, 3)
                inside = np.all((V >= lo) & (V <= hi), axis=1)
                I = I[inside[I].all(axis=1)].astype(np.uint32)
                if I.size:
                    blo, bhi = np.minimum(blo, V[I.reshape(-1)].min(0)), np.maximum(bhi, V[I.reshape(-1)].max(0))
                while len(out) % 4:
                    out.append(0)
                d.setdefault("bufferViews", []).append({"buffer": len(d["buffers"]), "byteOffset": len(out), "byteLength": I.nbytes, "target": 34963})
                d["accessors"].append({"bufferView": len(d["bufferViews"]) - 1, "componentType": 5125, "count": int(I.size), "type": "SCALAR"})
                p["indices"] = len(d["accessors"]) - 1
                out += I.tobytes()
        for c in nodes[i].get("children", []):
            stack.append((c, W))
    tag = "_drop_crop" + hashlib.sha1(json.dumps(box).encode()).hexdigest()[:6]
    bin_name = os.path.basename(path)[:-5] + tag + ".bin"
    open(os.path.join(base, bin_name), "wb").write(bytes(out))
    d["buffers"].append({"uri": bin_name, "byteLength": len(out)})
    o = path[:-5] + tag + ".gltf"
    json.dump(d, open(o, "w"))
    json.dump([blo.tolist(), bhi.tolist()], open(o[:-5] + ".bounds.json", "w"))
    return o


def filter_nodes(path, drop=None, keep=None):
    """A copy of a glTF without some nodes (drop: name regexes; "mat:<regex>" drops the primitives drawn with a
    material, such as a clock's glass), or with only some nodes (keep), beside the original so its buffers resolve."""
    if not (drop or keep) or not path.endswith(".gltf"):
        return path
    d = _load_gltf(path)
    nodes = d.get("nodes", [])
    parent = {}
    for i, n in enumerate(nodes):
        for c in n.get("children", []):
            parent[c] = i

    def chain(i):
        while i is not None:
            yield i
            i = parent.get(i)
    mats = [p[4:] for p in (drop or []) if p.startswith("mat:")]
    names = [p for p in (drop or []) if not p.startswith("mat:")]
    gone = set()
    if names:
        pat = re.compile("|".join(names))
        gone = {i for i, n in enumerate(nodes) if pat.search(n.get("name") or "")}
    if keep:
        pat = re.compile("|".join(keep))
        kept = {i for i, n in enumerate(nodes) if pat.search(n.get("name") or "")}
        gone |= {i for i, n in enumerate(nodes) if "mesh" in n and not any(a in kept for a in chain(i))}
    for i in gone:
        nodes[i].pop("mesh", None)
        if names and not keep:
            nodes[i].pop("children", None)
    if mats:
        pat = re.compile("|".join(mats))
        mnames = [m.get("name") or "" for m in d.get("materials", [])]
        for me in d.get("meshes", []):
            me["primitives"] = [p for p in me["primitives"] if not ("material" in p and pat.search(mnames[p["material"]]))]
        for n in nodes:
            if "mesh" in n and not d["meshes"][n["mesh"]]["primitives"]:
                n.pop("mesh")
    tag = "_drop_" + hashlib.sha1(("|".join(drop or []) + "#" + "|".join(keep or [])).encode()).hexdigest()[:6]
    out = path[:-5] + tag + ".gltf"
    json.dump(d, open(out, "w"))
    return out


def _mat(n):
    import numpy as np
    if "matrix" in n:
        return np.array(n["matrix"], float).reshape(4, 4).T
    t = np.array(n.get("translation", [0, 0, 0]), float)
    x, y, z, w = n.get("rotation", [0, 0, 0, 1])
    s = np.array(n.get("scale", [1, 1, 1]), float)
    R = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                  [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                  [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
    M = np.eye(4)
    M[:3, :3] = R * s
    M[:3, 3] = t
    return M


def bbox(path):
    """World-space [min, max] of a glTF's meshes (from the accessor bounds, so no geometry is read)."""
    import numpy as np
    if os.path.exists(path[:-5] + ".bounds.json"):  # a cropped scan: the kept triangles' bounds
        return json.load(open(path[:-5] + ".bounds.json"))
    cache = json.load(open(BBOX_CACHE)) if os.path.exists(BBOX_CACHE) else {}
    if path in cache:
        return cache[path]
    d = _load_gltf(path)
    nodes, meshes, acc = d.get("nodes", []), d.get("meshes", []), d.get("accessors", [])
    lo, hi = np.full(3, 1e18), np.full(3, -1e18)
    scenes = d.get("scenes", [{"nodes": list(range(len(nodes)))}])
    roots = scenes[d.get("scene", 0)]["nodes"]
    stack = [(r, np.eye(4)) for r in roots]
    while stack:
        i, P = stack.pop()
        n = nodes[i]
        W = P @ _mat(n)
        if "mesh" in n:
            for p in meshes[n["mesh"]]["primitives"]:
                a = acc[p["attributes"]["POSITION"]]
                if "min" not in a:
                    continue
                mn, mx = a["min"], a["max"]
                for cx in (mn[0], mx[0]):
                    for cy in (mn[1], mx[1]):
                        for cz in (mn[2], mx[2]):
                            v = W @ np.array([cx, cy, cz, 1.0])
                            lo, hi = np.minimum(lo, v[:3]), np.maximum(hi, v[:3])
        for c in n.get("children", []):
            stack.append((c, W))
    res = [lo.tolist(), hi.tolist()]
    cache[path] = res
    os.makedirs(CONV, exist_ok=True)
    json.dump(cache, open(BBOX_CACHE, "w"))
    return res


def prepare(src, drop=None, keep=None, box=None):
    """The local file lowpix converts: the downloaded source, filtered (nodes / materials) and cropped."""
    p = filter_nodes(ensure_source(src), drop, keep)
    return crop(p, box) if box else p


def subject_dims(src, drop=None, keep=None, box=None):
    """(w, h, d) of a source in its own units, after node filters and crop."""
    p = prepare(src, drop, keep, box)
    lo, hi = bbox(p)
    return [hi[i] - lo[i] for i in range(3)]
