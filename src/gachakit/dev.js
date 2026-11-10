// Viewer module for the gacha kit: viewer.html?module=/src/gachakit/dev.js&what=capsules|machines|carton
import * as THREE from 'three';
import { makeCapsule, makeShell, packLook, LOOKS, capsuleColor } from '../game/Capsule.js';

export async function viewerEntries(params) {
  const what = params.get('what') || 'capsules';
  try { await document.fonts.load('16px "DotGothic16"', 'ガチャ'); } catch { /* */ }
  const out = [];
  if (what.includes('capsules')) {
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
  if (what.includes('machines')) {
    const { buildMachineModel, MACHINE_SPECS } = await import('../world/machineModels.js');
    const { pileGeometries, CAPSULE_R } = await import('../game/Capsule.js');
    for (const t of (params.get('type') || 'retro,standard,deluxe,royal').split(',')) {
      const b = buildMachineModel(t, { no: 7 });
      b.plate.draw(MACHINE_SPECS[t].price, MACHINE_SPECS[t].price);
      if (params.get('lid')) b.lidPivot.rotation.x = -1.6;
      if (params.get('drawer')) b.drawer.position.z += 0.09;
      if (params.get('crank')) b.handlePivot.rotation.z = -0.7;
      // a few capsules behind the glass
      const W = b.L.window, pg = pileGeometries('M', 'clear', null), n = 14, r = CAPSULE_R.M;
      const bot = new THREE.InstancedMesh(pg.bottom, pg.bottomMat, n), top = new THREE.InstancedMesh(pg.top, pg.topMat, n), coat = new THREE.InstancedMesh(pg.coat, pg.coatMat, n);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
      for (let i = 0; i < n; i++) { q.setFromEuler(new THREE.Euler(i * 1.7, i * 2.3, i)); m.compose(new THREE.Vector3(W.x0 + r + (i % 4) * (W.x1 - W.x0 - 2 * r) / 3, W.y0 + r + Math.floor(i / 8) * r * 1.7, W.z0 + r + (Math.floor(i / 4) % 2) * (W.z1 - W.z0 - 2 * r)), q, new THREE.Vector3(1, 1, 1)); bot.setMatrixAt(i, m); top.setMatrixAt(i, m); bot.setColorAt(i, c.setHex([0xff9eb5, 0x9ed8ff, 0xfff09e, 0xb5f0b0][i % 4])); }
      coat.instanceMatrix = top.instanceMatrix; top.renderOrder = 2; coat.renderOrder = 2.5;
      b.group.add(bot, top, coat);
      out.push({ obj: b.group, label: t });
    }
  }
  if (what.includes('carton')) {
    const { makeCapsuleBox } = await import('../game/capsuleBox.js');
    for (const [series, stage] of [['mochi', 0], ['uchu', 0], ['yokai', 1], ['mochi', 2], ['kaiju', 2]]) {
      const g = makeCapsuleBox({ type: 'refill', series, count: 20, stage });
      const c = g.userData.capBox; c.setStage(stage, false); for (let i = 0; i < 40; i++) c.update(0.05);
      if (params.get('back')) g.rotation.y = Math.PI * 0.75;
      out.push({ obj: g, label: `${series} · stage ${stage}` });
    }
  }
  return out;
}
