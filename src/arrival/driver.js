// You at the wheel, seen from outside the van while the opening plays: your own character (the chat's avatar, in your
// saved look) sitting in the driver's seat, hands on the wheel ('arr_drive', src/arrival/poses.js), riding the body's
// sway. Borrowed from game.talk for as long as you're in the van and handed back standing, hidden, in the scene.
//   const d = new Driver(game, van)   d.update(dt, steerAngle)   d.visible = bool   d.dispose()
import './poses.js';

/** The driver's seat (van body space): where your feet are, the cushion's height above them. */
const SEAT = { x: -0.34, y: 0.3, z: 1.03, h: 0.42 };

export class Driver {
  constructor(game, van) {
    this.van = van;
    this.steer = 0;
    const h = this.h = game.talk?.avatar?.() || null;
    if (!h) return;
    this.home = h.root.parent;
    van.body.add(h.root);
    h.root.position.set(SEAT.x, SEAT.y, SEAT.z);
    h.root.rotation.set(0, 0, 0);
    h.root.visible = true;
    h.hasPrev = false;
    h.sit(SEAT.h); h.sitK = 1; h.sitV = 0; // (already sitting)
    h.gesture('arr_drive', { steer: () => this.steer });
  }

  set visible(v) { if (this.h) this.h.root.visible = v; }
  get visible() { return !!this.h?.root.visible; }

  update(dt, steer = 0) {
    this.steer = steer;
    if (this.h?.root.visible) this.h.update(dt, { speed: 0, lookAt: null, talking: false });
  }

  dispose() {
    const h = this.h;
    if (!h) return;
    this.h = null;
    h.clearGesture?.();
    h.sit(0); h.sitK = 0; h.sitV = 0;
    h.root.visible = false;
    (this.home || this.van.game?.scene)?.add(h.root);
    h.root.position.set(0, 0, 0);
    h.hasPrev = false;
  }
}
