// Wall-mounted wooden collection shelves in the garage (5 boards × 8 spots, warm LED strips).
import * as THREE from 'three';
import { pixMat, boxMesh } from '../gfx/geo.js';
import { SHELF_SLOTS } from '../world/Garage.js';
import { DisplaySlots } from './Display.js';

export const SHELF = { w: 1.7, h: 1.32, d: 0.17, boards: 5, perBoard: 8, y0: 0.72 };

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
        defs.push({ pos: new THREE.Vector3(x, b * gapY + 0.022, SHELF.d / 2 - 0.02), rotY: 0, size: [0.2, gapY - 0.03, 0.15], plaqueZ: 0.055 });
      }
    }
    if (data.items.length < defs.length) data.items.push(...Array(defs.length - data.items.length).fill(null));
    this.display = new DisplaySlots(game, this.root, defs, data.items, { plaques: true });
  }

  build() {
    const wood = pixMat('woodLight', { roughness: 0.6 });
    const dark = pixMat('woodDark', { roughness: 0.7 });
    const { w, h, d, boards } = SHELF;
    const back = boxMesh(w + 0.04, h + 0.06, 0.02, dark);
    back.position.set(0, h / 2 - 0.01, 0.01);
    this.root.add(back);
    for (const sx of [-1, 1]) {
      const side = boxMesh(0.025, h + 0.06, d, wood);
      side.position.set(sx * (w / 2 + 0.012), h / 2 - 0.01, d / 2);
      this.root.add(side);
    }
    const gapY = h / boards;
    const ledMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd8a0).multiplyScalar(1.6) });
    for (let b = 0; b <= boards; b++) {
      const board = boxMesh(w, 0.022, d, wood);
      board.position.set(0, b * gapY + 0.011, d / 2);
      this.root.add(board);
      // warm LED strip under each board
      if (b > 0) {
        const led = new THREE.Mesh(new THREE.BoxGeometry(w - 0.06, 0.004, 0.008), ledMat);
        led.position.set(0, b * gapY - 0.002, d - 0.02);
        this.root.add(led);
      }
    }
    // soft light spill on the shelf
    const pl = new THREE.PointLight(0xffd8a0, 0.9, 1.6, 1.8);
    pl.position.set(0, h * 0.5, d + 0.18);
    this.root.add(pl);
  }

  update() { this.display.update(); }
}
