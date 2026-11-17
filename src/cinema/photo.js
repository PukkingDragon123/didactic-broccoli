// Photo mode (P): the world holds its breath for a picture. The camera comes loose (it floats within a few metres of
// where you stand, never through walls), your own character appears where you were so you can pose them, and the
// pixel-art filters of src/jojo/impact.js recolour the frame. Enter (or a click) takes the picture: the shutter
// snaps in steps, the shot comes out as a paper print with a date stamp, and the PNG is saved.
//   const pm = new PhotoMode(game)   pm.toggle()   pm.active   pm.update(dt)   pm.snap()
// Keys while it's on: mouse look · WASD move · Space / C up and down · wheel zoom · Z / X tilt · F / G filter ·
// 1-9 pose · 0 stand easy · H hide yourself · Enter / click take it · P / Esc back.
import * as THREE from 'three';
import { standIn, clearAt } from './shots.js';
import { sting } from './stings.js';
import { FILTERS } from '../jojo/impact.js';
import { POSE_INFO } from '../jojo/poses.js';
import { audio } from '../core/audio.js';

const FILTER_LIST = [null, 'gekiga', 'impact', 'pocket', 'sepia', 'pixel', 'neon', 'negative'];
const _e = new THREE.Euler(0, 0, 0, 'YXZ'), _d = new THREE.Vector3(), _v = new THREE.Vector3();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export class PhotoMode {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.cam = { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), fovDelta: 0 };
    this.yaw = 0; this.pitch = 0; this.roll = 0; this.fov = 50;
    this.fi = 0; this.pose = null; this.n = 0;
    const hud = this.hud = document.createElement('div');
    hud.id = 'photo-hud';
    hud.className = 'hidden';
    document.body.appendChild(hud);
    const print = this.print = document.createElement('div');
    print.id = 'photo-print';
    document.body.appendChild(print);
    const shutter = this.shutter = document.createElement('div');
    shutter.id = 'photo-shutter';
    shutter.innerHTML = '<i class="t"></i><i class="b"></i>';
    document.body.appendChild(shutter);
  }

  can() {
    const g = this.game;
    return !g.cutscene?.active && !g.talk?.active && !g.pc?.active && !g.uiOpen && !g.held?.busy && !g.jojo?.rival?.active;
  }

  toggle() { if (this.active) this.exit(); else this.enter(); }

  enter() {
    const g = this.game, P = g.player;
    if (this.active || !this.can()) return false;
    this.active = true;
    this.prev = { frozen: P.frozen, uiOpen: g.uiOpen, interaction: g.interaction.enabled, anchor: g.held.anchor.visible };
    P.frozen = true; g.uiOpen = true; g.uiCine = true; g.interaction.enabled = false; g.held.anchor.visible = false;
    g.clock?.hold?.('photo');
    document.body.classList.add('cine', 'photo-mode');
    // you, where you stood; the camera a couple of steps in front, looking back at you
    this.home = new THREE.Vector3(P.pos.x, 0, P.pos.z);
    this.S = standIn(g);
    const face = P.yaw + Math.PI;
    this.S?.show(this.home, face);
    this.showMe = true;
    let d = 2.1, x = this.home.x - Math.sin(P.yaw) * d, z = this.home.z - Math.cos(P.yaw) * d;
    while (d > 0.6 && !clearAt(g, x, z)) { d -= 0.3; x = this.home.x - Math.sin(P.yaw) * d; z = this.home.z - Math.cos(P.yaw) * d; }
    this.cam.pos.set(x, 1.45, z);
    _d.set(this.home.x - x, 1.3 - 1.45, this.home.z - z);
    this.yaw = Math.atan2(-_d.x, -_d.z); this.pitch = Math.atan2(_d.y, Math.hypot(_d.x, _d.z)); this.roll = 0;
    this.fov = 50; this.pose = null;
    this.apply();
    P.lookOverride = this.cam;
    g.jojo?.impact.filter(FILTER_LIST[this.fi]);
    this.render();
    this.hud.classList.remove('hidden');
    try { audio.play('whoosh', { vol: 0.2 }); } catch { /* */ }
    return true;
  }

  exit() {
    const g = this.game, P = g.player;
    if (!this.active) return;
    this.active = false;
    P.lookOverride = null;
    P.frozen = this.prev.frozen; g.uiOpen = this.prev.uiOpen || false; g.uiCine = false;
    g.interaction.enabled = this.prev.interaction !== false; g.held.anchor.visible = true;
    g.clock?.release?.('photo');
    document.body.classList.remove('cine', 'photo-mode');
    g.jojo?.impact.filter(null);
    this.S?.hide();
    this.hud.classList.add('hidden');
  }

  apply() {
    _e.set(this.pitch, this.yaw, this.roll, 'YXZ');
    this.cam.quat.setFromEuler(_e);
    this.cam.fovDelta = this.game.player.baseFov - this.fov;
  }

  render() {
    const F = FILTERS[FILTER_LIST[this.fi]];
    const pose = this.pose ? POSE_INFO[this.pose]?.name || this.pose : 'Standing easy';
    this.hud.innerHTML = `<div class="ph-tag"><small>Filter</small><b>${esc(F ? F.name : 'No filter')}</b><span>${this.fi + 1} / ${FILTER_LIST.length}</span></div>`
      + `<div class="ph-note"><b>Photo mode</b><span><kbd>Mouse</kbd> look <kbd>WASD</kbd> move <kbd>Space</kbd>/<kbd>C</kbd> up, down</span><span><kbd>Wheel</kbd> zoom <kbd>Z</kbd>/<kbd>X</kbd> tilt <kbd>F</kbd>/<kbd>G</kbd> filter</span>`
      + `<span><kbd>1-9</kbd> pose <kbd>0</kbd> stand <kbd>H</kbd> ${this.showMe ? 'hide' : 'show'} yourself</span><span><kbd>Enter</kbd> take it <kbd>P</kbd> back</span><i class="pose">${esc(pose)}</i></div>`;
  }

  update(dt) {
    const g = this.game, inp = g.input;
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
    if (!this.active) {
      if (!typing && inp.keyPressed('KeyP') && (inp.locked || inp.touch) && this.can()) this.enter();
      return;
    }
    this.S?.update(dt, this.cam.pos);
    if (inp.keyPressed('KeyP') || inp.keyPressed('Escape') || (!inp.locked && !inp.touch && !/autotest/.test(location.search))) { this.exit(); return; }
    // look
    const m = inp.mouse, sens = 0.0022 * (inp.sensitivity || 1) * (this.fov / 60);
    this.yaw -= m.dx * sens; this.pitch -= m.dy * sens * (inp.invertY ? -1 : 1);
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
    // move (relative to the view, level), within 6 m of you and clear of walls
    const sp = (inp.key('ShiftLeft') || inp.key('ShiftRight') ? 2.6 : 1.1) * dt;
    const f = (inp.key('KeyW') ? 1 : 0) - (inp.key('KeyS') ? 1 : 0), s = (inp.key('KeyD') ? 1 : 0) - (inp.key('KeyA') ? 1 : 0);
    const u = (inp.key('Space') ? 1 : 0) - (inp.key('KeyC') ? 1 : 0);
    if (f || s || u) {
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
      const p = this.cam.pos;
      const nx = p.x + (fx * f - fz * s) * sp, nz = p.z + (fz * f + fx * s) * sp;
      if (Math.hypot(nx - this.home.x, nz - this.home.z) < 6 && clearAt(g, nx, nz, 0.12)) { p.x = nx; p.z = nz; }
      p.y = Math.max(0.12, Math.min(4, p.y + u * sp));
    }
    if (inp.key('KeyZ')) this.roll = Math.min(0.5, this.roll + dt * 0.6);
    if (inp.key('KeyX')) this.roll = Math.max(-0.5, this.roll - dt * 0.6);
    if (m.wheel) this.fov = Math.max(18, Math.min(85, this.fov + Math.sign(m.wheel) * 3));
    this.apply();
    // filters, poses, you
    if (inp.keyPressed('KeyF') || inp.keyPressed('KeyG')) {
      this.fi = (this.fi + (inp.keyPressed('KeyF') ? 1 : -1) + FILTER_LIST.length) % FILTER_LIST.length;
      g.jojo?.impact.filter(FILTER_LIST[this.fi]);
      try { audio.play('uiHover', { vol: 0.4 }); } catch { /* */ }
      this.render();
    }
    const learned = (g.jojo?.s.learned || []).filter((p) => POSE_INFO[p]);
    for (let i = 0; i < 9; i++) if (inp.keyPressed('Digit' + (i + 1)) && learned[i] && this.S) { this.pose = learned[i]; this.S.h.gesture(this.pose, { hold: true }); sting('pose', { vol: 0.6 }); this.render(); }
    if (inp.keyPressed('Digit0') && this.S) { this.pose = null; this.S.h.clearGesture(); this.render(); }
    if (inp.keyPressed('KeyH') && this.S) { this.showMe = !this.showMe; this.S.h.root.visible = this.showMe; this.render(); }
    if (inp.keyPressed('Enter') || inp.keyPressed('NumpadEnter') || (inp.locked && m.down[0])) this.snap();
  }

  /** Take the picture: the shutter blades close and open in steps, the frame becomes a paper print, the PNG saved. */
  snap() {
    const g = this.game;
    this.hud.classList.add('hidden');
    let url = null;
    try { g.renderer.render(0, g.time); url = g.renderer.renderer.domElement.toDataURL('image/png'); } catch (e) { console.warn('photo', e); }
    this.hud.classList.remove('hidden');
    sting('shutter');
    const sh = this.shutter;
    sh.classList.remove('go'); void sh.offsetWidth; sh.classList.add('go');
    if (!url) return;
    this.n++;
    const d = g.clock ? g.calendar?.dateOf?.(g.clock.day) : null;
    const stamp = d ? `'99 ${String(d.month ?? 4).padStart(2, ' ')} ${String(d.date).padStart(2, ' ')}` : "'99  4 12";
    this.print.innerHTML = `<div class="pp"><img alt="" src="${url}"><span class="date">${esc(stamp)}</span><small>Gacha Garage · photo ${this.n}</small></div>`;
    this.print.classList.remove('show'); void this.print.offsetWidth; this.print.classList.add('show');
    clearTimeout(this._pt); this._pt = setTimeout(() => this.print.classList.remove('show'), 3200);
    if (!/autotest/.test(location.search)) {
      const a = document.createElement('a');
      a.href = url; a.download = `gacha-garage-day${g.clock?.day ?? 1}-${this.n}.png`;
      document.body.appendChild(a); a.click(); a.remove();
    }
    g.events.emit('photo', { n: this.n, filter: FILTER_LIST[this.fi], pose: this.pose });
  }
}
void _v;
