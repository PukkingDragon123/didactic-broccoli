"""Minimal glTF binary read / write for the animal pipeline (positions, normals, uvs, indices, one PNG texture)."""
import json, struct
import numpy as np

CT = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}


def read_glb(path):
    b = open(path, 'rb').read()
    jl = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + jl])
    bin_off = 20 + jl + 8
    blob = b[bin_off:]

    def acc(i):
        a = j['accessors'][i]
        bv = j['bufferViews'][a['bufferView']]
        off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        n = a['count'] * NC[a['type']]
        arr = np.frombuffer(blob, dtype=CT[a['componentType']], count=n, offset=off)
        return arr.reshape(a['count'], NC[a['type']]) if NC[a['type']] > 1 else arr
    p = j['meshes'][0]['primitives'][0]
    out = {'pos': acc(p['attributes']['POSITION']).astype(np.float64), 'idx': acc(p['indices']).astype(np.int64).reshape(-1, 3)}
    if 'NORMAL' in p['attributes']:
        out['nrm'] = acc(p['attributes']['NORMAL']).astype(np.float64)
    if 'TEXCOORD_0' in p['attributes']:
        out['uv'] = acc(p['attributes']['TEXCOORD_0']).astype(np.float64)
    img = j.get('images', [{}])[0]
    if 'bufferView' in img:
        bv = j['bufferViews'][img['bufferView']]
        o = bv.get('byteOffset', 0)
        out['png'] = blob[o:o + bv['byteLength']]
    return out


def write_glb(path, pos, nrm, uv, idx, png, extra=None, name='mesh', rough=0.85, extras=None):
    """One mesh, one material (base colour = the PNG, nearest magnification); extra: {name: (array float32, type)}."""
    bufs, views, accs = [], [], []

    def add(arr, comp, typ, target=None, minmax=False):
        data = np.ascontiguousarray(arr).tobytes()
        off = sum(len(x) for x in bufs)
        pad = (-len(data)) % 4
        bufs.append(data + b'\0' * pad)
        v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(data)}
        if target:
            v['target'] = target
        views.append(v)
        a = {'bufferView': len(views) - 1, 'componentType': comp, 'count': int(arr.shape[0]), 'type': typ}
        if minmax:
            a['min'] = arr.min(0).tolist(); a['max'] = arr.max(0).tolist()
        accs.append(a)
        return len(accs) - 1
    attrs = {'POSITION': add(pos.astype(np.float32), 5126, 'VEC3', 34962, True),
             'NORMAL': add(nrm.astype(np.float32), 5126, 'VEC3', 34962),
             'TEXCOORD_0': add(uv.astype(np.float32), 5126, 'VEC2', 34962)}
    for k, (arr, typ) in (extra or {}).items():
        attrs[k] = add(arr.astype(np.float32), 5126, typ, 34962)
    ii = add(idx.reshape(-1).astype(np.uint32), 5125, 'SCALAR', 34963)
    data = png
    off = sum(len(x) for x in bufs)
    bufs.append(data + b'\0' * ((-len(data)) % 4))
    views.append({'buffer': 0, 'byteOffset': off, 'byteLength': len(data)})
    blob = b''.join(bufs)
    j = {'asset': {'version': '2.0', 'generator': 'gacha-garage animals'},
         'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [{'mesh': 0, 'name': name, **({'extras': extras} if extras else {})}],
         'meshes': [{'name': name, 'primitives': [{'attributes': attrs, 'indices': ii, 'material': 0}]}],
         'materials': [{'name': name, 'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}, 'metallicFactor': 0.0, 'roughnessFactor': rough}}],
         'textures': [{'source': 0, 'sampler': 0}], 'samplers': [{'magFilter': 9728, 'minFilter': 9987, 'wrapS': 33071, 'wrapT': 33071}],
         'images': [{'bufferView': len(views) - 1, 'mimeType': 'image/png'}],
         'buffers': [{'byteLength': len(blob)}], 'bufferViews': views, 'accessors': accs}
    js = json.dumps(j, separators=(',', ':')).encode()
    js += b' ' * ((-len(js)) % 4)
    out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob))
    out += struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(blob), 0x004E4942) + blob
    open(path, 'wb').write(out)
