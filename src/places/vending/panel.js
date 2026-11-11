// A machine you stand in front of and operate (the lane's vending machines, the ramen shop's ticket machine): click it
// and the camera eases in to its face (Player.lookOverride, a slow damped blend), you stand still, the mouse or the
// arrow keys move a lit selection over its buttons, LMB acts, RMB steps back (and back out). Hints use the crosshair
// line only; the machine's own pixel panel shows everything else.
//   const pm = new PanelMode(game, { onMove(dx, dy) | cols/rows, onAct(), onBack() -> true to leave, hint() })
//   pm.enter(view) / pm.view(v) (ease to another camera spot) / pm.exit()     view = { pos, look, fov }
import * as THREE from 'three';
import { Game } from '../../game/Game.js';
import { audio } from '../../core/audio.js';

const _m = new THREE.Matrix4(), _up = new THREE.Vector3(0, 1, 0);

export class PanelMode {
  constructor(game, o) {
    this.game = game;
    this.o = o;
    this.active = false;
    this.acc = { x: 0, y: 0 };
    this.t = 0;
    Game.updaters.push((g, dt) => this.update(dt));
  }

  enter(view) {
    const g = this.game, P = g.player;
    if (this.active) return;
    this.active = true;
    this.t = 0;
    this.acc.x = this.acc.y = 0;
    P.frozen = true;
    P.vel.set(0, 0, 0);
    // the crosshair stops picking things in the world meanwhile (the hint line is ours)
    const I = g.interaction;
    if (!this.iu) { this.iu = I.update; I.update = () => {}; }
    I.setHover(null); I.setHint(null); I.crossEl?.classList.remove('active');
    document.body.classList.add('nd-panel'); // the hint line moves down out of the machine's face
    this.view(view);
    audio.play('whoosh', { vol: 0.2, dur: 0.12 });
  }

  view(v) {
    const P = this.game.player;
    _m.lookAt(v.pos, v.look, _up);
    const q = new THREE.Quaternion().setFromRotationMatrix(_m);
    P.lookOverride = { pos: v.pos.clone(), quat: q, fovDelta: v.fov ?? 20 };
  }

  exit() {
    const g = this.game, P = g.player;
    if (!this.active) return;
    this.active = false;
    P.lookOverride = null;
    P.frozen = false;
    if (this.iu) { g.interaction.update = this.iu; this.iu = null; }
    document.body.classList.remove('nd-panel');
    g.interaction.setHint(null);
    if (g.needs) g.needs.hasPrev = false;
    this.o.onExit?.();
  }

  update(dt) {
    if (!this.active) return;
    const g = this.game, inp = g.input, o = this.o;
    this.t += dt;
    if (!inp.locked || g.cutscene.active || g.pc?.active) return;
    // the mouse nudges the selection (a cell every ~70 px of travel); keys move it a cell
    this.acc.x += inp.mouse.dx; this.acc.y += inp.mouse.dy;
    const step = 70;
    let mx = 0, my = 0;
    if (Math.abs(this.acc.x) > step) { mx = Math.sign(this.acc.x); this.acc.x = 0; }
    if (Math.abs(this.acc.y) > step) { my = Math.sign(this.acc.y); this.acc.y = 0; }
    if (inp.keyPressed('KeyA') || inp.keyPressed('ArrowLeft')) mx = -1;
    if (inp.keyPressed('KeyD') || inp.keyPressed('ArrowRight')) mx = 1;
    if (inp.keyPressed('KeyW') || inp.keyPressed('ArrowUp')) my = -1;
    if (inp.keyPressed('KeyS') || inp.keyPressed('ArrowDown')) my = 1;
    if ((mx || my) && this.t > 0.25) o.onMove?.(mx, my);
    if (this.t > 0.3 && (inp.buttonDown(0) || inp.keyPressed('KeyE') || inp.keyPressed('Space') || inp.keyPressed('Enter'))) o.onAct?.();
    else if (this.t > 0.3 && (inp.buttonDown(2) || inp.keyPressed('KeyQ') || inp.keyPressed('Backspace'))) { if (o.onBack?.() !== false) this.exit(); }
    if (!this.active) return;
    const h = o.hint?.();
    g.interaction.setHint(h || null);
  }
}
