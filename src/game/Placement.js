// Surfaces you can set things down on + held-box behaviour (refills, second-hand singles).
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { makeItemMesh } from './collectibles.js';
import { boxLabel } from './Delivery.js';

export class Placement {
  constructor(game) {
    this.game = game;
    this.surfaces = [];
  }

  addSurface(mesh) { mesh.userData.surface = true; this.surfaces.push(mesh); }

  surfaceHit(range = 2.2) {
    const hits = this.game.interaction.castAgainst(this.surfaces, range);
    for (const h of hits) {
      if (!h.face) continue;
      const n = h.face.normal.clone().transformDirection(h.object.matrixWorld);
      if (n.y > 0.7) return h;
    }
    return null;
  }

  boxHint(it) {
    const d = it.data;
    if (d.type === 'refill') return { key: '', text: 'Take it to a gacha machine', sub: `${boxLabel(d)} · Q to put down` };
    if (d.type === 'single') return { key: 'RMB', text: 'Open the mailer', sub: boxLabel(d) };
    if (this.game.museum?.boxHint) return this.game.museum.boxHint(it);
    return { key: 'Q', text: 'Put down' };
  }

  boxSecondary(it) {
    const g = this.game;
    const d = it.data;
    if (d.type === 'single') {
      // tear open the mailer -> collectible in hand
      const obj = g.held.release().obj;
      const wp = obj.getWorldPosition(new THREE.Vector3());
      obj.parent?.remove(obj);
      audio.play('boxOpen', { vol: 0.8 });
      g.effects.sparks({ pos: wp, count: 20, colors: [0xffffff, 0xffe9a0], speed: 0.5, size: 0.008 });
      const mesh = makeItemMesh(d.key, d.finish);
      const holder = new THREE.Group(); holder.add(mesh);
      holder.position.copy(wp);
      g.scene.add(holder);
      const isNew = g.discover(d.key, d.finish);
      g.held.take('toy', { key: d.key, finish: d.finish }, holder, { isNew });
      return;
    }
    g.museum?.boxSecondary?.(it);
  }
}
