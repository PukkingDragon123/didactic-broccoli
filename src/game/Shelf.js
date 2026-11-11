// Wall-mounted wooden collection shelves in the garage (5 boards × 8 spots, warm LED strips).
import * as THREE from 'three';
import { thingMesh } from '../props/things/make.js';
import { plank } from '../props/kit/shapes.js';
import { fabric, metal } from '../props/kit/kit.js';
import { SHELF_SLOTS } from '../world/Garage.js';
import { DisplaySlots } from './Display.js';

export const SHELF = { w: 1.3, h: 1.08, d: 0.15, boards: 6, perBoard: 8, y0: 0.8 };

const OAK = 0xb98a58, OAK_D = 0x8a5e38, FELT = 0x7a5e8a;
/** The shelf unit, in the frame the slots use (back on the wall at z = 0, boards every h / boards from y = 0). */
function wallShelf(K) {
  const { w, h, d, boards } = SHELF, gap = h / boards;
  K.box(fabric(FELT), -w / 2 - 0.02, -0.01, 0, w / 2 + 0.02, h + 0.05, 0.02);
  for (const sx of [-1, 1]) {
    const x0 = sx * (w / 2 + 0.0005), x1 = sx * (w / 2 + 0.025);
    plank(K, OAK_D, Math.min(x0, x1), -0.012, 0, Math.max(x0, x1), h + 0.05, d, { bevel: 0.003 });
    // the hanging plate screwed to each upright's back edge
    K.box(metal(0x9a9590), sx * (w / 2 + 0.006) - 0.007, h + 0.01, -0.002, sx * (w / 2 + 0.006) + 0.007, h + 0.045, 0.0005, { bevel: 0.001 });
  }
  plank(K, OAK_D, -w / 2 - 0.025, h + 0.035, 0, w / 2 + 0.025, h + 0.06, d + 0.004, { bevel: 0.003 }); // the top cap
  for (let b = 0; b <= boards; b++) {
    const y = b * gap;
    plank(K, OAK, -w / 2, y, 0.02, w / 2, y + 0.016, d - 0.012, { bevel: 0.002, v: b });
    plank(K, OAK_D, -w / 2, y - 0.004, d - 0.012, w / 2, y + 0.02, d + 0.002, { bevel: 0.002 }); // the front lip
    // warm LED strip tucked under the board in front (a strip in its aluminium channel)
    if (b > 0) {
      K.box(metal(0xb8bcc0), -w / 2 + 0.03, y - 0.008, d - 0.03, w / 2 - 0.03, y, d - 0.014, { bevel: 0 });
      K.glow(() => K.box(0xffc890, -w / 2 + 0.032, y - 0.0085, d - 0.028, w / 2 - 0.032, y - 0.007, d - 0.016, { bevel: 0 }));
    }
  }
}

/** The shelf unit's mesh (origin: the middle of its bottom back edge on the wall). */
export const shelfMesh = () => thingMesh('decor', 'wallShelf', [-SHELF.w / 2 - 0.03, -0.012, 0, SHELF.w / 2 + 0.03, SHELF.h + 0.06, SHELF.d + 0.004], wallShelf);

export class GarageShelf {
  constructor(game, data) {
    this.game = game;
    this.data = data;
    const S = SHELF_SLOTS[data.slot];
    this.root = new THREE.Group();
    this.root.position.set(S.x, SHELF.y0, S.z);
    this.root.rotation.y = S.rotY;
    game.scene.add(this.root);
    this.build();
    this.root.updateMatrixWorld(true);
    const defs = [];
    const gapY = SHELF.h / SHELF.boards;
    for (let b = 0; b < SHELF.boards; b++) {
      for (let i = 0; i < SHELF.perBoard; i++) {
        const x = -SHELF.w / 2 + (SHELF.w / SHELF.perBoard) * (i + 0.5);
        defs.push({ pos: new THREE.Vector3(x, b * gapY + 0.016, SHELF.d / 2 - 0.015), rotY: 0, size: [SHELF.w / SHELF.perBoard, gapY - 0.03, 0.15], plaqueZ: 0.05 });
      }
    }
    if (data.items.length < defs.length) data.items.push(...Array(defs.length - data.items.length).fill(null));
    this.display = new DisplaySlots(game, this.root, defs, data.items, { plaques: true });
  }

  build() {
    // one modelled unit (src/props/kit: grained boards with a front lip, solid uprights, a felt back, hanging plates,
    // warm LED strips in the glow slot): a draw call or two instead of sixteen boxes
    this.root.add(shelfMesh());
    // soft light spill on the shelf
    const pl = new THREE.PointLight(0xffd8a0, 0.7, 1.4, 1.8);
    pl.position.set(0, SHELF.h * 0.5, SHELF.d + 0.18);
    this.root.add(pl);
  }

  update() { this.display.update(); }
}
