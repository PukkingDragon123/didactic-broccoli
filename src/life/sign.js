// The OPEN sign: Grandpa's old double-sided wooden sign (営業中 OPEN / 準備中 CLOSED) on a cord, found in one of his junk
// boxes. You hang it on the nail hook on the right pier, then flip it every morning and every night; customers only
// come in while it shows OPEN (game.sim.isOpen reads life.signOpen). The town's own painted OPEN plate on that pier is
// put away (this sign replaces it). The shop lanterns follow the sign once the shop has reopened.
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { ease } from '../core/util.js';
import { propMesh } from '../world/props.js';
import { signPix } from './art.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const HOOK = { x: 3.62, y: 2.2, z: 5.262 };

export class OpenSign {
  constructor(game, life) {
    this.game = game;
    this.life = life;
    this.s = life.s.sign;
    this.swing = 0;
    this.t = 0;
    this.build();
  }

  build() {
    const g = this.game;
    this.hideTownPlate();
    const hook = propMesh('hook_nail', { fallbackSize: [0.02, 0.03, 0.03] });
    hook.position.set(HOOK.x, HOOK.y - 0.015, HOOK.z);
    g.scene.add(hook);
    // the sign on its cord (pivot at the hook)
    const grp = new THREE.Group();
    grp.position.set(HOOK.x, HOOK.y, HOOK.z + 0.015);
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a30, roughness: 0.85 });
    const face = (open) => new THREE.MeshStandardMaterial({ map: signPix(open).texture(), roughness: 0.8 });
    this.openMat = face(true); this.closedMat = face(false);
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.21, 0.022), [wood, wood, wood, wood, this.openMat, this.closedMat]);
    board.position.y = -0.27;
    board.castShadow = true; board.receiveShadow = true;
    grp.add(board);
    const cordM = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.9 });
    for (const s of [-1, 1]) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.23, 0.006), cordM);
      c.position.set(s * 0.075, -0.075, 0);
      c.rotation.z = s * 0.95;
      grp.add(c);
    }
    g.scene.add(grp);
    this.grp = grp;
    this.board = board;
    this.angle = this.s.open ? 0 : Math.PI;
    grp.rotation.y = this.angle;
    grp.visible = !!this.s.hung;
    // click targets: the hook (hang it) and the board (flip it)
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.14), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(HOOK.x, HOOK.y - 0.2, HOOK.z + 0.06);
    g.scene.add(hit);
    g.interaction.add(hit, {
      reach: 2.6,
      hint: () => this.hint(),
      use: () => { this.use(); return false; },
    });
    this.hit = hit;
    this.applyLanterns();
  }

  /** The town's painted plate on the pier would hang right behind our sign: put it away. */
  hideTownPlate() {
    const openG = this.game.garage.town?.shop?.openG;
    if (!openG) return;
    for (const o of openG.children) {
      const p = o.position;
      if (Math.abs(p.x - 3.62) < 0.05 && Math.abs(p.z - 5.28) < 0.05 && p.y > 1.8 && p.y < 2.2) o.visible = false;
    }
  }

  hint() {
    const g = this.game;
    if (!this.s.hung) {
      if (g.held.holding('open_sign')) return { key: 'LMB', text: 'Hang the sign on the hook', sub: 'CLOSED side out, for now' };
      return this.s.found ? { key: '', text: 'The sign hook', sub: "Hold Grandpa's OPEN sign" } : { key: '', text: 'An old nail hook', sub: 'Something used to hang here' };
    }
    if (this.busy) return { key: '', text: '...' };
    return this.s.open ? { key: 'LMB', text: 'Flip the sign to CLOSED', sub: 'Customers stay out' } : { key: 'LMB', text: 'Flip the sign to OPEN', sub: g.story?.done ? 'Customers can come in' : "When the machine's ready" };
  }

  use() {
    const g = this.game;
    if (!this.s.hung) {
      if (!g.held.holding('open_sign')) return;
      const at = V(HOOK.x, HOOK.y - 0.27, HOOK.z + 0.03);
      g.held.putTo(at, new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), Math.PI), (obj) => {
        obj.parent?.remove(obj);
        this.s.hung = true;
        this.s.found = true;
        this.s.open = false;
        this.angle = Math.PI;
        this.grp.rotation.y = this.angle;
        this.grp.visible = true;
        this.swing = 1;
        audio.play('signFlip', { pos: at, vol: 0.9 });
        g.events.emit('signHung', {});
        g.story?.task?.('The sign is back on its hook.');
        g.save();
      }, { dur: 0.4, arc: 0.1, scale: 0.9 });
      return;
    }
    this.flip();
  }

  /** Flip it round (or set it: open true / false). */
  flip(open = !this.s.open, { quiet = false } = {}) {
    const g = this.game;
    if (this.busy || !this.s.hung || open === this.s.open) return;
    const fp = g.fp;
    if (!quiet && fp?.live) fp.play('tap', 0.5, { at: fp.toAnchor(this.board.getWorldPosition(V(0, 0, 0)), V(0, 0, 0)), hand: fp.freeHand() });
    this.busy = true;
    const from = this.angle, to = from + Math.PI;
    g.tweens.add({ delay: quiet ? 0 : 0.18, dur: 0.55, ease: ease.outBack, update: (k) => { this.angle = from + (to - from) * k; this.grp.rotation.y = this.angle; }, done: () => {
      this.angle = to % (Math.PI * 2);
      this.busy = false;
      this.swing = 0.7;
    } });
    if (!quiet) g.tweens.wait(0.2, () => audio.play('signFlip', { pos: this.board.getWorldPosition(V(0, 0, 0)), vol: 0.9 }));
    this.s.open = open;
    this.applyLanterns();
    g.events.emit('signFlip', { open });
    g.save();
  }

  /** Once the shop has reopened the lanterns are lit while the sign says OPEN. */
  applyLanterns() {
    const g = this.game, S = g.garage.town?.shop;
    if (!S?.lanternM || !g.story?.done) return;
    const on = this.life.signOpen;
    S.lanternM.emissiveIntensity = on ? 1.3 : 0;
    S.lanternM.color.setScalar(on ? 1 : 0.45);
    if (S.glow) S.glow.intensity = on ? 2.4 : 0;
  }

  update(dt) {
    this.t += dt;
    if (this.swing > 0.001 && this.grp.visible) {
      this.swing = Math.max(0, this.swing - dt * 0.9);
      this.grp.rotation.z = Math.sin(this.t * 7) * 0.12 * this.swing;
      this.grp.rotation.x = Math.sin(this.t * 5.3) * 0.05 * this.swing;
    }
  }
}
