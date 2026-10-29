// The shop's promo posters (pixel art from src/gfx/flyers.js) pasted up around the lane: on the garage piers once the
// shop is open, on the block wall across the lane, in Mikawa-ya's window and above the machines in the garage.
// Each is a sheet of paper with two strips of tape; the art is crisp up close (nearest filtering).
import * as THREE from 'three';
import { FLYER_W, FLYER_H, flyerTexture } from '../gfx/flyers.js';
import { GARAGE } from './Garage.js';

const TAPE = new THREE.MeshStandardMaterial({ color: 0xf2ead2, roughness: 0.55, transparent: true, opacity: 0.8, depthWrite: false });

/** A poster group (w metres wide; the sheet faces +z from its centre). */
export function posterMesh(id, w = 0.42) {
  const h = w * FLYER_H / FLYER_W;
  const g = new THREE.Group();
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: flyerTexture(id), roughness: 0.9 }));
  sheet.receiveShadow = true;
  g.add(sheet);
  for (const sx of [-1, 1]) {
    const t = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.2, w * 0.06), TAPE);
    t.position.set(sx * w * 0.42, h / 2 - w * 0.01, 0.0015);
    t.rotation.z = sx * -0.6;
    t.userData.noRim = true;
    g.add(t);
  }
  g.userData.poster = id;
  return g;
}

export class Posters {
  constructor(game) {
    const town = game.garage.town, G = GARAGE;
    const open = town?.shop?.openG || null;
    // [design, x, y (centre), z, facing (ry), tilt, only while the shop is open, width]
    const SPOTS = [
      ['reopen', -3.66, 1.32, G.maxZ + 0.272, 0, 0.025, true],
      ['kaiju', 3.62, 1.3, G.maxZ + 0.272, 0, -0.02, true],
      ['space', -6.02, 0.72, 14.888, Math.PI, 0.015, false],
      ['sakura', -5.0, 0.7, 14.888, Math.PI, -0.02, false],
      ['secret', -13.82, 1.36, 15.02, Math.PI, 0, false, 0.36],
      ['glow', G.maxX - 0.012, 2.1, 0.32, -Math.PI / 2, 0.01, false],
    ];
    this.list = [];
    for (const [id, x, y, z, ry, tilt, whenOpen, w] of SPOTS) {
      const p = posterMesh(id, w || 0.42);
      p.position.set(x, y, z);
      p.rotation.set(0, ry, tilt);
      (whenOpen && open ? open : game.scene).add(p);
      this.list.push(p);
    }
  }
}
