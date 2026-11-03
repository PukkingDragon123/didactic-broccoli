// Physical cash from the machines' coin boxes.
//
// pocketCash() is THE one place coin-box money reaches the player: the ¥100 coins fly out of the drawer into a
// little cloth coin bag in your hand, the bag jingles and is tucked away, and the amount is counted onto your money
// display coin by coin. Phase 2 (wallet cash vs bank, ATM) turns this into a real carried cash item: replace the
// body of pocketCash (keep its signature) and every caller follows.
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { VoxelModel, metal } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';
import { voxelMaterials } from '../voxel/materials.js';
import { yenCoinGeometry } from '../world/machineModels.js';
import './gachaSfx.js';

let bagGeo = null;
function coinBagGeometry() {
  if (bagGeo) return bagGeo;
  const v = new VoxelModel();
  v.jitter = 0.04;
  const cloth = 0x8a3a2a, dark = 0x6a2a1e, cord = 0xe8c860;
  v.ellipsoid(0, 6, 0, 6, 6, 5.5, cloth);
  v.box(-8, -1, -8, 8, 0, 8, null);
  v.ellipsoid(0, 13, 0, 3, 2, 3, cloth); // gathered neck
  v.paint(() => { for (let y = 2; y < 11; y += 3) v.ellipsoid(0, y, 0, 7, 0.6, 7, dark); });
  v.torus(0, 11, 0, 3.4, 0.8, cord); // drawstring
  v.set(3, 10, 3, cord); v.set(4, 9, 3, cord);
  v.project(['.YYY.', 'Y...Y', '.YYY.'], { Y: metal(0xe0c060) }, -2, 8); // a stamped coin mark
  bagGeo = meshVoxels(v, { voxelSize: 0.006, origin: 'center' });
  return bagGeo;
}

const coinMat = () => voxelMaterials('normal');

/**
 * Coins from `from` (world position) go into your coin bag and onto your money.
 * opts: { coins: how many coins fly (visual), label: news line, machine }
 * Returns the amount credited.
 */
export function pocketCash(game, amount, from, opts = {}) {
  const g = game;
  if (!(amount > 0)) return 0;
  const n = Math.max(1, Math.min(opts.coins ?? Math.ceil(amount / 100), 24));
  // the bag appears in your left hand (viewmodel, drawn on top of the world)
  const anchor = g.held.anchor;
  const bag = new THREE.Mesh(coinBagGeometry(), coinMat());
  bag.position.set(-0.17, -0.19, -0.42);
  bag.rotation.set(0.25, 0.4, 0);
  bag.scale.setScalar(0.01);
  bag.userData.noRim = true;
  anchor.add(bag);
  g.tweens.add({ dur: 0.25, update: (k) => bag.scale.setScalar(0.01 + 0.99 * k) });
  const target = new THREE.Vector3();
  const geo = yenCoinGeometry();
  let paid = 0;
  const share = Math.floor(amount / n);
  for (let i = 0; i < n; i++) {
    const c = new THREE.Mesh(geo, coinMat());
    c.position.copy(from).add(new THREE.Vector3((Math.random() - 0.5) * 0.06, Math.random() * 0.02, (Math.random() - 0.5) * 0.04));
    c.visible = false;
    g.scene.add(c);
    const start = c.position.clone();
    const spin = new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8);
    g.tweens.add({
      delay: 0.15 + i * 0.06, dur: 0.42,
      update: (k) => {
        c.visible = true;
        bag.updateWorldMatrix(true, false);
        target.setFromMatrixPosition(bag.matrixWorld);
        c.position.lerpVectors(start, target, k * k);
        c.position.y += Math.sin(k * Math.PI) * 0.12;
        c.rotation.set(spin.x * k, spin.y * k, spin.z * k);
        c.scale.setScalar(1 - k * 0.6);
      },
      done: () => {
        c.parent?.remove(c);
        const v = i === n - 1 ? amount - paid : share;
        paid += v;
        g.addMoney(v, true);
        audio.play('coinClink', { v: 0.9 });
        bag.scale.setScalar(1 + 0.12 * Math.sin(i * 1.7) ** 2);
      },
    });
  }
  const end = 0.15 + n * 0.06 + 0.5;
  audio.play('coinScoop', { pos: from, vol: 0.9 });
  g.tweens.wait(end, () => {
    audio.play('register', { vol: 0.5 });
    if (opts.label !== false) g.news(`+¥${amount.toLocaleString('en-US')}`, opts.label || 'Coins from the coin box, into your coin bag');
    // tuck the bag away
    const p0 = bag.position.clone();
    g.tweens.add({ dur: 0.35, update: (k) => { bag.position.set(p0.x - k * 0.05, p0.y - k * 0.3, p0.z); bag.rotation.z = k * 0.6; }, done: () => bag.parent?.remove(bag) });
  });
  return amount;
}
