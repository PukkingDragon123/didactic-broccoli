// Grandpa's things: his walking cane (a crook handle, a rubber foot), the round paper fan he fans himself with (a
// goldfish on it), the beige desk telephone his calls ring on (src/props/things/grandpa.js), and the taxi that takes him to the
// station (a late-90s yellow-and-green taxi sedan from the vehicle kit, src/vehicles/taxi.js: fender mirrors, the lit
// roof lamp, the red 空車 sign, lace on the seats, a driver in his cap, a rear door that swings open by itself).
//   caneMesh() (origin = the grip, the shaft runs down -y)   fanMesh() (origin = the bottom of the handle)
//   phoneMesh() (origin = bottom centre)   new Taxi(game): root, setPose(x, z, heading), roll(d), setDoor(k), setLights(on)
import * as THREE from 'three';
import { taxiParts, TAXI } from '../vehicles/taxi.js';

// the cane, the fan and the phone are modelled in src/props/things/grandpa.js
export { caneMesh, fanMesh, phoneMesh, CANE_LEN } from '../props/things/grandpa.js';

export class Taxi {
  constructor(game) {
    this.game = game;
    const P = taxiParts(), M = P.mats, T = TAXI;
    const root = this.root = new THREE.Group();
    root.name = 'taxi';
    this.body = new THREE.Group();
    root.add(this.body);
    const b = new THREE.Mesh(P.body, M.body);
    b.castShadow = b.receiveShadow = true;
    this.body.add(b);
    const gl = new THREE.Mesh(P.glass, M.glass);
    gl.renderOrder = 2; gl.raycast = () => {};
    this.body.add(gl);
    // the automatic rear door, hinged at its front edge
    this.doorPivot = new THREE.Group();
    this.doorPivot.position.set(T.HINGE.x, 0, T.HINGE.z);
    const d = new THREE.Mesh(P.door, M.body);
    d.castShadow = true;
    const dg = new THREE.Mesh(P.doorGlass, M.glass);
    dg.renderOrder = 2; dg.raycast = () => {};
    this.doorPivot.add(d, dg);
    this.body.add(this.doorPivot);
    this.wheels = [];
    for (const [x, z] of [[-T.TRACK, T.AX], [T.TRACK, T.AX], [-T.TRACK, -T.AX], [T.TRACK, -T.AX]]) {
      const w = new THREE.Mesh(x > 0 ? P.wheelL : P.wheelR, M.body);
      w.position.set(x, T.WR, z);
      w.castShadow = true;
      root.add(w);
      this.wheels.push(w);
    }
    // lamps: headlights, tail lamps (as brakes), and the roof lamp / 空車 / meter, always lit
    const lit = (g) => { const m = new THREE.Mesh(g, M.lit); m.raycast = () => {}; this.body.add(m); return m; };
    this.heads = [lit(P.lit.heads)]; this.brakes = [lit(P.lit.brakes)];
    lit(P.lit.signs);
    this.setLights(true); this.setBrake(false);
    this.dist = 0;
    this.door = 0;
  }
  setPose(x, z, heading) { this.root.position.set(x, 0, z); this.root.rotation.y = heading; this.root.updateMatrixWorld(true); }
  roll(d) { this.dist += d; for (const w of this.wheels) w.rotation.x = this.dist / TAXI.WR; }
  /** The rear left door, 0 shut .. 1 open (it swings out on its front hinge). */
  setDoor(k) { this.door = k; this.doorPivot.rotation.y = -k * 1.3; }
  setLights(on) { for (const h of this.heads) h.visible = on; }
  setBrake(on) { for (const b of this.brakes) b.visible = on; }
  local(x, y, z, out = new THREE.Vector3()) { return this.root.localToWorld(out.set(x, y, z)); }
  /** Where a passenger stands to get in at the rear left door, and the seat behind it (world). */
  doorSpot(out = new THREE.Vector3()) { return this.local(DOOR_SPOT[0], 0, DOOR_SPOT[1], out); }
  seat(out = new THREE.Vector3()) { return this.local(SEAT[0], 0, SEAT[1], out); }
  dispose() { this.root.removeFromParent(); }
}
