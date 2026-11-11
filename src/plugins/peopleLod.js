// The people's level of detail (src/people/Human.js): each person swaps to their far mesh when the main camera is far
// from them. This tells them where the camera is, once a frame.
import * as THREE from 'three';
import { Game } from '../game/Game.js';
import { Human } from '../people/Human.js';

export function install(game) {
  const v = new THREE.Vector3();
  Human.viewer = v;
  Game.updaters.push((g) => { g.camera.getWorldPosition(v); });
}
