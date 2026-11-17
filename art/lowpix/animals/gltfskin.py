"""Pose a skinned glTF (.gltf + .bin) on the CPU per the glTF spec: v' = sum_i w_i * jointWorld_i * IBM_i * v (world
space; the mesh node's own transform is ignored). Returns meshes with posed positions, uvs, indices, material names, and
every joint's world position (same frame), so a model's own skeleton can be read off its sculpt."""
import json, os
import numpy as np

CT = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def _mat(n):
    if 'matrix' in n:
        return np.array(n['matrix'], float).reshape(4, 4).T
    t = np.array(n.get('translation', [0, 0, 0]), float); r = n.get('rotation', [0, 0, 0, 1]); s = np.array(n.get('scale', [1, 1, 1]), float)
    x, y, z, w = r
    R = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                  [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                  [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
    M = np.eye(4); M[:3, :3] = R * s; M[:3, 3] = t
    return M


def load(path):
    g = json.load(open(path))
    blob = open(os.path.join(os.path.dirname(path), g['buffers'][0]['uri']), 'rb').read()

    def acc(i):
        a = g['accessors'][i]; bv = g['bufferViews'][a['bufferView']]
        off = bv.get('byteOffset', 0) + a.get('byteOffset', 0); n = NC[a['type']]
        stride = bv.get('byteStride'); dt = np.dtype(CT[a['componentType']])
        if stride and stride != n * dt.itemsize:
            raw = np.frombuffer(blob, np.uint8, count=stride * a['count'], offset=off).reshape(a['count'], stride)
            arr = raw[:, :n * dt.itemsize].copy().view(dt).reshape(a['count'], n)
        else:
            arr = np.frombuffer(blob, dt, count=a['count'] * n, offset=off).reshape(a['count'], n)
        if a.get('normalized') and dt.kind == 'u': arr = arr / np.iinfo(dt).max
        return arr.astype(np.float64) if dt.kind == 'f' or a.get('normalized') else arr
    parent = {}
    for i, n in enumerate(g['nodes']):
        for c in n.get('children', []): parent[c] = i
    world = {}

    def W(i):
        if i not in world:
            world[i] = (W(parent[i]) if i in parent else np.eye(4)) @ _mat(g['nodes'][i])
        return world[i]
    out, joints = [], {}
    for ni, n in enumerate(g['nodes']):
        if 'mesh' not in n: continue
        for p in g['meshes'][n['mesh']]['primitives']:
            pos = acc(p['attributes']['POSITION'])
            P4 = np.c_[pos, np.ones(len(pos))]
            if 'skin' in n:
                sk = g['skins'][n['skin']]
                ibm = acc(sk['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
                JM = np.stack([W(j) @ ibm[k] for k, j in enumerate(sk['joints'])])
                J = acc(p['attributes']['JOINTS_0']).astype(int); Wt = acc(p['attributes']['WEIGHTS_0'])
                Wt = Wt / (Wt.sum(1, keepdims=True) + 1e-12)
                v = np.zeros((len(pos), 4))
                for k in range(4):
                    v += Wt[:, k:k + 1] * np.einsum('nij,nj->ni', JM[J[:, k]], P4)
                for k, j in enumerate(sk['joints']):
                    joints[g['nodes'][j].get('name', str(j))] = W(j)[:3, 3]
            else:
                v = (W(ni) @ P4.T).T
            uv = acc(p['attributes']['TEXCOORD_0']) if 'TEXCOORD_0' in p['attributes'] else None
            idx = acc(p['indices']).reshape(-1, 3).astype(int)
            mat = g['materials'][p['material']]['name'] if 'material' in p else ''
            names = [g['nodes'][j].get('name') for j in g['skins'][n['skin']]['joints']] if 'skin' in n else None
            out.append(dict(node=n.get('name'), mat=mat, pos=v[:, :3], uv=uv, idx=idx,
                            joints=acc(p['attributes']['JOINTS_0']).astype(int) if 'skin' in n else None,
                            weights=acc(p['attributes']['WEIGHTS_0']) if 'skin' in n else None, names=names))
    return out, joints


def joints_from_weights(m, min_w=0.3):
    """Each joint's position read off the sculpt: the centroid of the vertices shared between a bone and its child
    (both weights >= min_w); the tip of a chain: the far end of the vertices owned by its last bone. Same frame as the
    posed vertices. Returns {name: xyz}."""
    P, J, Wt, names = m['pos'], m['joints'], m['weights'], m['names']
    Wn = Wt / (Wt.sum(1, keepdims=True) + 1e-12)
    out = {}
    order = np.argsort(-Wn, 1)
    j1 = J[np.arange(len(J)), order[:, 0]]; j2 = J[np.arange(len(J)), order[:, 1]]
    w1 = Wn[np.arange(len(J)), order[:, 0]]; w2 = Wn[np.arange(len(J)), order[:, 1]]
    for a in range(len(names)):
        for b in range(len(names)):
            if a >= b: continue
            m_ = ((j1 == a) & (j2 == b) | (j1 == b) & (j2 == a)) & (w2 >= min_w)
            if m_.sum() >= 3: out[(names[a], names[b])] = (P[m_].mean(0), int(m_.sum()))
    own = {}
    for a in range(len(names)):
        m_ = (j1 == a) & (w1 > 0.8)
        if m_.sum(): own[names[a]] = P[m_]
    return out, own
