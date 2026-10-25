// Cutscenes: letterbox bars, fades, typewriter subtitles, title cards and scripted camera moves, written as
// generator scripts that yield "waiters":
//   game.cutscene.play(function* (c) { yield c.fade(0, 1); yield c.cam({ pos, look, dur: 3 }); c.say('Hello'); yield c.wait(2); });
// Hold Space / Enter / click to skip: every waiter then finishes at once, so the script's side effects still run.
import * as THREE from 'three';
import { audio } from '../core/audio.js';

const smooth = (k) => k * k * (3 - 2 * k);
const smoother = (k) => k * k * k * (k * (k * 6 - 15) + 10);

export class Cutscene {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.gen = null;
    this.waiter = null;
    this.camOn = false;
    this.pos = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.offset = new THREE.Vector3(); // extra camera offset on top of any move (footstep bob, shake)
    this.hand = 0; // handheld drift amplitude (metres); a touch of it makes every shot feel filmed
    this.handT = 0;
    this.fov = null;
    this.skipT = 0;
    this.skipping = false;
    const el = document.createElement('div');
    el.id = 'cutscene';
    el.innerHTML = '<div class="bar top"></div><div class="bar bot"></div><div class="sub"></div><div class="titlecard"><div class="t"></div><div class="s"></div></div><div class="skip"><span class="fill"></span><span class="lbl">Hold to skip</span></div>';
    document.body.appendChild(el);
    const fade = document.createElement('div');
    fade.id = 'fade';
    document.body.appendChild(fade);
    // white flash between the present and a memory; the memory look itself is CSS on the canvas (body.memory)
    const flash = document.createElement('div');
    flash.id = 'flash';
    document.body.appendChild(flash);
    const mem = document.createElement('div');
    mem.id = 'memory-vignette';
    document.body.appendChild(mem);
    this.flashEl = flash;
    this.ticks = [];
    this.el = el;
    this.fadeEl = fade;
    this.subEl = el.querySelector('.sub');
    this.titleEl = el.querySelector('.titlecard');
    this.skipEl = el.querySelector('.skip');
    this.fadeV = 0;
    this.typing = null;
    // touch screens: press and hold anywhere to skip
    this.ptr = false;
    window.addEventListener('pointerdown', () => { this.ptr = true; });
    window.addEventListener('pointerup', () => { this.ptr = false; });
    window.addEventListener('pointercancel', () => { this.ptr = false; });
  }

  /** Run a script. Returns a promise resolved when it ends. */
  play(script, { skippable = true, letterbox = true } = {}) {
    const g = this.game;
    if (this.active) this.finish();
    this.active = true;
    this.skippable = skippable;
    this.skipping = false;
    this.skipT = 0;
    this.hand = 0.006;
    this.gen = script(this);
    this.waiter = null;
    this.camOn = false;
    this.pos.copy(g.camera.position);
    g.camera.getWorldDirection(this.look).add(g.camera.position);
    g.player.frozen = true;
    g.interaction.enabled = false;
    g.held.anchor.visible = false; // the cinematic camera shouldn't carry what's in your hands
    g.uiCine = true;
    document.body.classList.add('cine');
    this.el.classList.toggle('letterbox', letterbox);
    this.el.classList.add('on');
    return new Promise((res) => { this.resolve = res; });
  }

  finish() {
    const g = this.game;
    this.active = false;
    this.gen = null;
    this.waiter = null;
    this.camOn = false;
    this.fov = null;
    g.player.frozen = false;
    g.interaction.enabled = true;
    g.held.anchor.visible = true;
    g.uiCine = false;
    document.body.classList.remove('cine');
    this.el.classList.remove('on', 'letterbox');
    this.subEl.classList.remove('show');
    this.titleEl.classList.remove('show');
    this.skipEl.classList.remove('show');
    this.setFade(0);
    this.typing = null;
    this.ticks = [];
    this.offset.set(0, 0, 0);
    this.memory(false);
    const r = this.resolve; this.resolve = null;
    r?.();
  }

  setFade(v) { this.fadeV = v; this.fadeEl.style.opacity = v; this.fadeEl.style.display = v > 0.001 ? 'block' : 'none'; }

  update(dt) {
    if (!this.active) return;
    const inp = this.game.input;
    // hold to skip
    if (this.skippable && !this.skipping) {
      const hold = inp.key('Space') || inp.key('Enter') || inp.button(0) || (inp.touch && this.ptr);
      this.skipT = hold ? this.skipT + dt : Math.max(0, this.skipT - dt * 2);
      this.skipEl.classList.toggle('show', this.skipT > 0.05);
      this.skipEl.querySelector('.fill').style.transform = `scaleX(${Math.min(1, this.skipT / 0.9)})`;
      if (this.skipT > 0.9) { this.skipping = true; this.skipEl.classList.remove('show'); }
    }
    // advance the script; while skipping, run it to the end this frame
    for (let guard = 0; guard < (this.skipping ? 400 : 8); guard++) {
      if (this.waiter && !this.waiter.update(this.skipping ? 999 : dt)) break;
      const nx = this.gen.next();
      if (nx.done) { this.finish(); return; }
      this.waiter = nx.value || null;
      if (!this.skipping) break;
    }
    if (this.typing) this.tickType(dt);
    for (const fn of this.ticks) fn(dt);
    this.applyCamera();
  }

  applyCamera() {
    if (!this.camOn) return;
    const cam = this.game.camera;
    const t = (this.handT += 1 / 60), h = this.hand;
    const nx = (Math.sin(t * 0.83) + Math.sin(t * 2.17 + 1.3) * 0.35) * h, ny = (Math.sin(t * 1.11 + 2) + Math.sin(t * 2.71) * 0.3) * h * 0.7;
    cam.position.copy(this.pos).add(this.offset);
    cam.position.x += nx; cam.position.y += ny;
    cam.lookAt(this.look.x + this.offset.x + nx * 2.4, this.look.y + this.offset.y - ny * 2.0, this.look.z + this.offset.z);
    if (this.fov && Math.abs(cam.fov - this.fov) > 0.01) { cam.fov = this.fov; cam.updateProjectionMatrix(); }
    cam.updateMatrixWorld();
  }

  /** Run fn(dt) every frame until the cutscene ends (actors, bubbles that must keep moving under any waiter). */
  every(fn) { this.ticks.push(fn); return null; }

  /** Sepia memory look on/off (CSS filter on the canvas + vignette). */
  memory(on) { document.body.classList.toggle('memory', !!on); return null; }

  /** A quick white flash; `mid` runs at the brightest moment (swap the scene there). */
  flash(mid = null, dur = 0.7) {
    let t = 0, fired = false;
    const el = this.flashEl;
    return {
      update: (dt) => {
        t = Math.min(dur, t + dt);
        const k = t / dur;
        el.style.display = 'block';
        el.style.opacity = k < 0.35 ? k / 0.35 : 1 - (k - 0.35) / 0.65;
        if (!fired && k >= 0.35) { fired = true; mid?.(); }
        if (t >= dur) { el.style.display = 'none'; el.style.opacity = 0; }
        return t >= dur;
      },
    };
  }

  // ------------------------------------------------------------------ waiters
  wait(sec) { let t = 0; return { update: (dt) => (t += dt) >= sec }; }
  until(fn) { return { update: (dt) => !!fn(dt) }; }
  call(fn) { fn(); return null; }
  all(...ws) { return { update: (dt) => ws.map((w) => !w || w.update(dt)).every(Boolean) }; }

  /** Camera move to pos looking at look (both Vector3). Without dur it cuts. path: extra via-points. */
  cam({ pos, look, dur = 0, fov = null, path = null, ease = smoother }) {
    this.camOn = true;
    const p0 = this.pos.clone(), l0 = this.look.clone(), f0 = this.fov ?? this.game.camera.fov;
    const pts = path ? [p0, ...path, pos] : null;
    const curve = pts ? new THREE.CatmullRomCurve3(pts, false, 'centripetal') : null;
    if (!dur) { this.pos.copy(pos); this.look.copy(look); if (fov) this.fov = fov; return null; }
    let t = 0;
    return {
      update: (dt) => {
        t = Math.min(dur, t + dt);
        const k = ease(t / dur);
        if (curve) curve.getPoint(k, this.pos); else this.pos.lerpVectors(p0, pos, k);
        this.look.lerpVectors(l0, look, k);
        if (fov) this.fov = f0 + (fov - f0) * k;
        return t >= dur;
      },
    };
  }

  /** Smoothly hand the camera back to the player's eyes. */
  toPlayer(dur = 0.8) {
    const g = this.game, P = g.player;
    const eye = new THREE.Vector3(P.pos.x, P.eye, P.pos.z);
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(P.pitch, P.yaw, 0, 'YXZ'));
    const w = this.cam({ pos: eye, look: eye.clone().add(dir), dur, fov: P.baseFov, ease: smooth });
    return w ? { update: (dt) => { const d = w.update(dt); if (d) this.camOn = false; return d; } } : (this.camOn = false, null);
  }

  fade(to, dur = 0.8) {
    const from = this.fadeV;
    let t = 0;
    if (!dur) { this.setFade(to); return null; }
    return { update: (dt) => { t = Math.min(dur, t + dt); this.setFade(from + (to - from) * smooth(t / dur)); return t >= dur; } };
  }

  /** Typewriter subtitle. Yield it to wait until typed + `hold` seconds. */
  say(text, hold = 2.2, who = '') {
    this.subEl.innerHTML = (who ? `<span class="who">${who}</span>` : '') + '<span class="txt"></span>';
    this.subEl.classList.add('show');
    this.typing = { text, i: 0, t: 0, el: this.subEl.querySelector('.txt') };
    let t = 0;
    const len = text.length / 38 + hold;
    return { update: (dt) => (t += dt) >= len };
  }

  hideSay() { this.subEl.classList.remove('show'); this.typing = null; return null; }

  tickType(dt) {
    const ty = this.typing;
    if (ty.i >= ty.text.length) return;
    ty.t += dt * 38;
    const n = Math.min(ty.text.length, Math.floor(ty.t));
    if (n > ty.i) {
      if (/[a-z0-9]/i.test(ty.text[n - 1]) && n % 2) audio.play('blip', { f: 520, vol: 0.6 });
      ty.i = n;
      ty.el.textContent = ty.text.slice(0, n);
    }
    if (this.skipping) ty.el.textContent = ty.text;
  }

  /** Big centred title card. */
  title(text, sub = '', hold = 2.6) {
    this.titleEl.querySelector('.t').textContent = text;
    this.titleEl.querySelector('.s').textContent = sub;
    this.titleEl.classList.add('show');
    let t = 0;
    return { update: (dt) => { t += dt; if (t >= hold) this.titleEl.classList.remove('show'); return t >= hold + 0.6; } };
  }
}
