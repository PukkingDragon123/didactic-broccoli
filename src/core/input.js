// Keyboard / mouse / pointer-lock input with per-frame edge detection.
export class Input {
  constructor(element) {
    this.el = element;
    this.keys = new Set();
    this.pressed = new Set(); // keys pressed this frame
    this.mouse = { dx: 0, dy: 0, buttons: [false, false, false], down: [false, false, false], up: [false, false, false], wheel: 0 };
    this.locked = false;
    this.axis = { x: 0, z: 0 }; // analog move (touch joystick)
    this.touch = false;
    this.sensitivity = 1;
    this.invertY = false;
    this.onLockChange = null;

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.code;
      this.keys.add(k);
      this.pressed.add(k);
      if (this.locked && ['Tab', 'Space', 'KeyQ'].includes(k)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.mouse.buttons = [false, false, false]; });
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      // guard against the occasional huge spike some browsers emit on lock
      if (Math.abs(e.movementX) > 400 || Math.abs(e.movementY) > 400) return;
      this.mouse.dx += e.movementX;
      this.mouse.dy += e.movementY;
    });
    document.addEventListener('mousedown', (e) => {
      if (!this.locked) return;
      this.mouse.buttons[e.button] = true;
      this.mouse.down[e.button] = true;
    });
    document.addEventListener('mouseup', (e) => {
      if (this.touch) return;
      this.mouse.buttons[e.button] = false;
      this.mouse.up[e.button] = true;
    });
    document.addEventListener('wheel', (e) => {
      if (!this.locked) return;
      this.mouse.wheel += Math.sign(e.deltaY);
    }, { passive: true });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.el;
      if (!this.locked) { this.keys.clear(); this.mouse.buttons = [false, false, false]; }
      this.onLockChange?.(this.locked);
    });
  }

  /** Virtual mouse button (touch controls). */
  press(b, down) {
    if (down) { this.mouse.buttons[b] = true; this.mouse.down[b] = true; } else { this.mouse.buttons[b] = false; this.mouse.up[b] = true; }
  }
  tapKey(code) { this.pressed.add(code); }

  lock() {
    if (this.touch) { if (!this.locked) { this.locked = true; this.onLockChange?.(true); } return; }
    if (this.locked) return;
    try {
      const p = this.el.requestPointerLock({ unadjustedMovement: true });
      if (p && p.catch) p.catch(() => { try { this.el.requestPointerLock(); } catch { /* ignore */ } });
    } catch { try { this.el.requestPointerLock(); } catch { /* ignore */ } }
  }
  unlock() {
    if (this.touch) { if (this.locked) { this.locked = false; this.axis.x = this.axis.z = 0; this.onLockChange?.(false); } return; }
    if (document.pointerLockElement) document.exitPointerLock();
  }

  key(code) { return this.keys.has(code); }
  keyPressed(code) { return this.pressed.has(code); }
  button(b = 0) { return this.mouse.buttons[b]; }
  buttonDown(b = 0) { return this.mouse.down[b]; }
  buttonUp(b = 0) { return this.mouse.up[b]; }

  /** Call at the end of each frame. */
  endFrame() {
    this.pressed.clear();
    this.mouse.dx = 0; this.mouse.dy = 0; this.mouse.wheel = 0;
    this.mouse.down = [false, false, false];
    this.mouse.up = [false, false, false];
  }
}
