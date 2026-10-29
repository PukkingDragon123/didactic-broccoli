// Keyboard / mouse / pointer-lock input with per-frame edge detection.
// Where pointer lock is refused (some embedded / sandboxed pages) it falls back to free-cursor look: moving the mouse
// turns the view and holding the cursor near a screen edge keeps turning (input.free).
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
    this.free = false; // free-cursor look (no pointer lock available)
    this.cursor = { x: 0.5, y: 0.5, in: false }; // last cursor position, 0..1 of the window

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.code;
      this.keys.add(k);
      this.pressed.add(k);
      if (this.locked && ['Tab', 'Space', 'KeyQ'].includes(k)) e.preventDefault();
      if (k === 'Escape' && this.free && this.locked) this.unlock(); // (the browser only does this for real pointer lock)
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.mouse.buttons = [false, false, false]; });
    document.addEventListener('mousemove', (e) => {
      this.cursor.x = e.clientX / innerWidth; this.cursor.y = e.clientY / innerHeight; this.cursor.in = true;
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
    document.addEventListener('mouseout', (e) => { if (!e.relatedTarget) this.cursor.in = false; });
    document.addEventListener('pointerlockerror', () => this.fallback());
    document.addEventListener('pointerlockchange', () => {
      if (this.free) return;
      this.locked = document.pointerLockElement === this.el;
      if (this.locked) this.everLocked = true;
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
    if (this.touch || this.free) { if (!this.locked) { this.locked = true; this.onLockChange?.(true); } return; }
    if (this.locked) return;
    if (!this.el.requestPointerLock) { this.fallback(); return; }
    const retry = () => { try { const q = this.el.requestPointerLock(); if (q && q.catch) q.catch(() => this.fallback()); } catch { this.fallback(); } };
    try {
      const p = this.el.requestPointerLock({ unadjustedMovement: true });
      if (p && p.catch) p.catch(retry);
    } catch { retry(); }
    // some sandboxed frames ignore the request without an error
    clearTimeout(this.lockT);
    this.lockT = setTimeout(() => { if (!document.pointerLockElement && !this.locked) this.fallback(); }, 700);
  }
  unlock() {
    if (this.touch || this.free) { if (this.locked) { this.locked = false; this.axis.x = this.axis.z = 0; this.keys.clear(); this.mouse.buttons = [false, false, false]; this.onLockChange?.(false); } return; }
    if (document.pointerLockElement) document.exitPointerLock();
  }
  /** Pointer lock isn't available here: play with a free cursor instead. */
  fallback() {
    // (once lock has worked, a refusal is only the browser's cool-down after Esc: just try again later)
    if (this.free || this.touch || this.everLocked) return;
    this.free = true;
    document.body.classList.add('free-look');
    if (!this.locked) { this.locked = true; this.onLockChange?.(true); }
  }
  /** Call at the start of each frame: free-cursor look keeps turning while the cursor rests near an edge. */
  beginFrame(dt) {
    if (!this.free || !this.locked || !this.cursor.in) return;
    const E = 0.07, zone = (v) => (v < E ? -(1 - v / E) : v > 1 - E ? (v - (1 - E)) / E : 0);
    this.mouse.dx += zone(this.cursor.x) * 900 * dt;
    this.mouse.dy += zone(this.cursor.y) * 420 * dt;
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
