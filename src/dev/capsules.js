// Viewer module: every capsule style and size, a half-twisted one and an empty shell.
//   viewer.html?module=/src/dev/capsules.js
import * as THREE from 'three';
import { makeCapsule, makeShell, capsuleColor } from '../game/Capsule.js';

export async function viewerEntries(params) {
  const rows = (params.get('list') || 'mochi:S,konbini:M,showa:M,uchu:L,wagashi:S,bizarre:M,omamori:L,kaiju:M').split(',');
  const out = [];
  for (const r of rows) {
    const [series, size] = r.split(':');
    const g = new THREE.Group();
    const a = makeCapsule(series, capsuleColor(series, () => 0.1), { size, res: params.get('res') || 'hi' });
    a.group.rotation.set(0.25, 0.5, 0);
    a.group.position.x = -a.r * 1.3;
    const b = makeCapsule(series, capsuleColor(series, () => 0.6), { size, res: params.get('res') || 'hi' });
    b.setTwist(params.get('twist') ? +params.get('twist') : 0.7);
    b.group.rotation.set(-0.3, -0.3, 0.2);
    b.group.position.x = b.r * 1.3;
    g.add(a.group, b.group);
    const box = new THREE.Box3().setFromObject(g);
    g.position.y = -box.min.y;
    out.push({ obj: g, label: `${series} · ${size}<br><span class="r">${a.style}</span>` });
  }
  const sh = makeShell('mochi', 0xff9eb5);
  out.push({ obj: sh.group, label: 'empty shell' });
  return out;
}
