// Test helpers for the products (window.dbg.products, with ?debug / ?autotest):
//   await dbg.products.ready()               every label painted
//   dbg.products.lineup(x, z, yaw, ids)      a plank at chest height with the given drinks / goods standing on it
//   dbg.products.clear()
import * as THREE from 'three';
import { drinkMesh, drinksSheet, isDrink } from './containers.js';
import { goodsMesh, goodsSheet } from './goods.js';

export function installProductsDebug(game) {
  if (typeof window === 'undefined') return;
  if (!window.dbg) { if ((installProductsDebug.n = (installProductsDebug.n || 0) + 1) < 40) setTimeout(() => installProductsDebug(game), 500); return; }
  if (window.dbg.products) return;
  let grp = null;
  window.dbg.products = {
    ready: () => { drinksSheet().material(); goodsSheet().material(); return Promise.all([drinksSheet().ready, goodsSheet().ready]).then(() => true); },
    lineup(x, z, yaw = 0, ids = ['vd_bancho', 'vd_cider', 'vd_melon', 'vd_strong', 'vd_ocha', 'vd_realbold', 'vd_onecup', 'ramune'], o = {}) {
      this.clear();
      grp = new THREE.Group();
      grp.position.set(x, o.y ?? 1.2, z); grp.rotation.y = yaw;
      const gap = o.gap ?? 0.1, n = ids.length;
      const plank = new THREE.Mesh(new THREE.BoxGeometry(n * gap + 0.1, 0.02, 0.2), new THREE.MeshStandardMaterial({ color: 0xb08a5a, roughness: 0.9 }));
      plank.position.y = -0.01; plank.receiveShadow = true; grp.add(plank);
      ids.forEach((id, i) => {
        const m = isDrink(id) ? drinkMesh(id) : goodsMesh(id);
        if (!m) return;
        m.position.set((i - (n - 1) / 2) * gap, 0, 0); m.rotation.y = (o.turn ?? 0) + (o.fan ? (i - (n - 1) / 2) * o.fan : 0);
        grp.add(m);
      });
      game.scene.add(grp);
      return n;
    },
    clear() { if (grp) { grp.parent?.remove(grp); grp = null; } },
  };
}
