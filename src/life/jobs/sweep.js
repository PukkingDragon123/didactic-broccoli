// Side job: the neighbourhood association's lane clean-up. Drifts of cherry petals and the odd can, scrap of paper and
// cigarette butts lie along the lane between the tunnels: sweep each one up with your broom (hold click), bag the lot,
// and put the bag out at the garbage station. The association's money comes out of the box on the board.
import * as THREE from 'three';
import { propMesh } from '../../world/props.js';
import { audio } from '../../core/audio.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const SPOTS = [
  ['petal_drift', -14, 6.5], ['petal_drift', -3.4, 6.35], ['petal_drift', 6.4, 6.55], ['petal_drift', 15.2, 6.45], ['petal_drift', -9.2, 13.05], ['petal_drift', 12.3, 13.0],
  ['litter_can', -17.2, 12.75], ['litter_can', 4.6, 7.2], ['litter_can', 19.1, 12.6],
  ['litter_paper', -6.2, 12.95], ['litter_paper', 9.2, 6.3], ['litter_butts', -1.3, 13.05],
];
const DUST = [0xb8a894, 0xffc2d4, 0xa8946a];

export class StreetSweep {
  constructor(game, jobs, def) {
    this.game = game;
    this.jobs = jobs;
    this.def = def;
    this.items = [];
    this.stage = 'sweep';
  }

  start() {
    const g = this.game;
    for (const [id, x, z] of SPOTS) {
      const m = propMesh(id, { fallbackSize: [0.3, 0.05, 0.3], fallbackColor: 0xffc2d4 });
      m.position.set(x, 0.004, z);
      m.rotation.y = (x * 7 + z) % 6;
      if (id === 'petal_drift') m.scale.setScalar(1.3);
      g.scene.add(m);
      const it = { id, m, k: 0, petals: id === 'petal_drift' };
      this.items.push(it);
      g.interaction.add(m, {
        reach: 2.4,
        hint: () => (g.held.holding('broom') ? { key: 'Hold LMB', text: it.petals ? 'Sweep up the petals' : 'Sweep it up', sub: it.k > 0 ? `${Math.round(it.k * 100)}%` : `${this.left()} left on the lane` } : { key: '', text: it.petals ? 'Cherry petals and leaves' : 'Litter', sub: 'Hold your broom' }),
        use: () => (g.held.holding('broom') ? undefined : false),
        hold: { canStart: () => g.held.holding('broom'), start: () => { it.next = 0; }, update: (dt) => this.sweep(it, dt), done: () => it.k >= 1 },
      });
    }
    this.off = g.events.on('trashOut', ({ item }) => { if (item?.bag === 'street') this.done(); });
  }

  left() { return this.items.filter((i) => i.k < 1).length; }

  sweep(it, dt) {
    const g = this.game, p = it.m.position;
    it.k = Math.min(1, it.k + dt / (it.petals ? 1.3 : 0.8));
    it.next -= dt;
    if (it.next <= 0) {
      it.next = 0.4;
      g.held.swing = 1;
      audio.play('sweep', { pos: p, vol: 0.7 });
      g.effects.sparks({ pos: p.clone().add(V(0, 0.06, 0)), count: it.petals ? 8 : 4, colors: DUST, speed: 0.3, size: it.petals ? 0.016 : 0.03, gravity: -0.05, life: 1.1, star: 0, drag: 1.4, radius: 0.3 });
    }
    const s = (it.petals ? 1.3 : 1) * (1 - it.k * 0.85);
    it.m.scale.set(s, s, s);
    if (it.k < 1) return;
    g.interaction.remove(it.m);
    it.m.parent?.remove(it.m);
    audio.play('dust', { pos: p, vol: 0.6 });
    if (!this.left()) {
      // into a bag with it
      this.stage = 'bag';
      audio.play('bagRustle', { vol: 0.9 });
      const data = { bag: 'street', job: 'street' };
      if (!g.held.giveTool('trash_bag', data)) g.items.spawnTool({ id: 'trash_bag', ...data }, g.player.pos.clone(), 0);
      g.news('The lane is clean', 'Bag it out at the garbage station', 4000);
    }
  }

  done() {
    if (this.stage === 'done') return;
    this.stage = 'done';
    this.game.tweens.wait(0.5, () => this.jobs.finish(this.def.pay, V(-5.05, 1.4, 5.6)));
  }

  goal() {
    const g = this.game;
    if (this.stage === 'sweep') {
      if (!g.held.has('broom')) return { id: 'street:broom', icon: 'broom', text: 'Get a broom for the clean-up', sub: 'Yours, or one from Mikawa-ya', at: () => g.garage.town?.cornerShop?.counter?.getWorldPosition(V(0, 0, 0)).setY(1.25) || null };
      const p = g.player.pos;
      const left = this.items.filter((i) => i.k < 1);
      let best = left[0];
      for (const i of left) if (i.m.position.distanceToSquared(p) < best.m.position.distanceToSquared(p)) best = i;
      return { id: 'street:sweep', icon: 'broom', text: `Sweep the lane (${left.length} left)`, sub: g.held.holding('broom') ? 'Hold click on the petals and litter' : 'Hold your broom', at: () => best.m.position.clone().setY(0.4) };
    }
    if (this.stage === 'bag') return { id: 'street:bag', icon: 'trash_bag', text: 'Put the bag out', sub: 'The garbage station, left of the shop', at: () => V(-6.6, 1.2, 5.8) };
    return null;
  }

  update() {}

  dispose() {
    const g = this.game;
    this.off?.();
    for (const it of this.items) { g.interaction.remove(it.m); it.m.parent?.remove(it.m); }
  }
}
