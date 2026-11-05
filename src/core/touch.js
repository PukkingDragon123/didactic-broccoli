// Touch controls: left stick to walk, drag anywhere else to look, buttons for use / open / drop / rotate / move.
export function isTouchDevice() {
  return (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window) && !/[?&](autotest|debug)/.test(location.search);
}

export function installTouch(input, { onPause } = {}) {
  input.touch = true;
  document.body.classList.add('touchmode');
  const root = document.getElementById('touch');
  const stick = document.getElementById('stick');
  const knob = document.getElementById('stick-knob');
  const R = 52;
  let stickId = null, sx = 0, sy = 0;
  const setStick = (dx, dy) => {
    const d = Math.hypot(dx, dy), k = d > R ? R / d : 1;
    dx *= k; dy *= k;
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    input.axis.x = dx / R; input.axis.z = dy / R;
  };
  stick.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    stickId = t.identifier;
    const r = stick.getBoundingClientRect();
    sx = r.left + r.width / 2; sy = r.top + r.height / 2;
    setStick(t.clientX - sx, t.clientY - sy);
    e.preventDefault();
  }, { passive: false });

  // look: any touch that starts on the canvas
  const looks = new Map();
  window.addEventListener('touchstart', (e) => {
    if (!input.locked) return;
    for (const t of e.changedTouches) if (t.target.id === 'game-canvas' || t.target === document.body) looks.set(t.identifier, { x: t.clientX, y: t.clientY, x0: t.clientX, y0: t.clientY, t0: performance.now() });
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) { setStick(t.clientX - sx, t.clientY - sy); continue; }
      const l = looks.get(t.identifier);
      if (!l) continue;
      input.mouse.dx += (t.clientX - l.x) * 1.7;
      input.mouse.dy += (t.clientY - l.y) * 1.7;
      l.x = t.clientX; l.y = t.clientY;
    }
    if (input.locked) e.preventDefault();
  }, { passive: false });
  const end = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) { stickId = null; setStick(0, 0); }
      const l = looks.get(t.identifier);
      // a quick tap on the view acts like a click on whatever is under the crosshair
      if (l && input.locked && performance.now() - l.t0 < 250 && Math.hypot(t.clientX - l.x0, t.clientY - l.y0) < 12) {
        input.press(0, true);
        setTimeout(() => input.press(0, false), 60);
      }
      looks.delete(t.identifier);
    }
  };
  window.addEventListener('touchend', end);
  window.addEventListener('touchcancel', end);

  const hold = (id, b) => {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', (e) => { input.press(b, true); el.classList.add('on'); e.preventDefault(); }, { passive: false });
    const up = (e) => { input.press(b, false); el.classList.remove('on'); e.preventDefault(); };
    el.addEventListener('touchend', up, { passive: false });
    el.addEventListener('touchcancel', up, { passive: false });
  };
  const tap = (id, fn) => {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', (e) => { fn(); el.classList.add('on'); setTimeout(() => el.classList.remove('on'), 150); e.preventDefault(); }, { passive: false });
  };
  hold('t-use', 0);
  hold('t-alt', 2);
  tap('t-drop', () => input.tapKey('KeyQ'));
  tap('t-rot', () => input.tapKey('KeyR'));
  tap('t-move', () => input.tapKey('KeyF'));
  tap('t-pause', () => onPause?.());
  return {
    show(on) { root.classList.toggle('hidden', !on); if (!on) setStick(0, 0); },
  };
}
