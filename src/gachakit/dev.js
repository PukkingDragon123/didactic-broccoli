// Viewer module for the gacha kit: viewer.html?module=/src/gachakit/dev.js&what=capsules|machines|carton
import * as THREE from 'three';
import { makeCapsule, makeShell, packLook, LOOKS, capsuleColor } from '../game/Capsule.js';

export async function viewerEntries(params) {
  const what = params.get('what') || 'capsules';
  try { await document.fonts.load('16px "DotGothic16"', 'ガチャ'); } catch { /* */ }
  const out = [];
  if (what === 'capsules') {
    const list = (params.get('list') || 'mochi:plain,showa:plain,yokai:plain,wagashi:plain,mochi:glitter,mochi:pearl,mochi:metal,mochi:gold,mochi:secret,kaiju:plain,omamori:plain,konbini:plain').split(',');
    const stage = params.get('stage') ? params.get('stage').split('.').map(Number) : null;
    for (const e of list) {
      const [series, look] = e.split(':');
      const cap = makeCapsule(series, packLook(capsuleColor(series, () => 0.1), look, look === 'metal'), { look });
      if (stage) cap.setStage(stage[0], (stage[1] || 0) / 10);
      const g = new THREE.Group();
      cap.group.rotation.set(+(params.get('rx') || 0.2), +(params.get('ry') || -0.5), 0);
      cap.group.position.y = cap.r * 1.2;
      g.add(cap.group);
      out.push({ obj: g, label: `${series} · ${look}<br><span class="r">${cap.style} ${cap.shape}</span>` });
    }
    void makeShell; void LOOKS;
  }
  return out;
}
