// Striking a pose (an affectionate homage to a certain bizarre manga; original poses): press V for the pose tags,
// pick one (1-9, the wheel and a click, or a tap) and the camera swings out of your eyes to a low, tilted shot of
// your own character striking it, ゴゴゴ rising beside you, then back. People nearby answer with a pose of their own
// (or a shrug). Poses are learned: a few from the start, more from the eccentrics of the lane (src/jojo/society.js).
//   const pm = new PoseMenu(game, jojo)   pm.toggle()   pm.update(dt)
//   strikePose(game, name, { onDone })    the cinematic (a cutscene: hold to skip); emits 'pose' { name, by: 'player' }
//   poseScene(c, game, name, opts)        the same as a generator, for other scenes to yield* (the rival's pose-off)
import * as THREE from 'three';
import { POSE_INFO } from './poses.js';
import { BIZARRE_ALL } from '../people/bizarre.js';
import { standIn, freeShot, rollTo, V } from '../cinema/shots.js';
import { sting } from '../cinema/stings.js';
import { audio } from '../core/audio.js';

export const MENU_POSES = ['pose_point', 'pose_lean', 'pose_cross', 'pose_tower', 'pose_guard', 'pose_frame', 'pose_sweep', 'pose_reach', 'pose_coil', 'dab', 'flex', 'peace'];
export const START_POSES = ['pose_point', 'pose_lean', 'pose_cross', 'pose_tower', 'pose_guard', 'dab', 'flex', 'peace'];
export const TEACHER = { pose_frame: 'Madame Kujaku', pose_sweep: 'Madame Kujaku', pose_reach: 'Mr. Hidari', pose_coil: 'Mr. Hidari' };
export const STYLE_KANJI = { power: '力', grace: '雅', mystery: '謎' };
export const STYLE_NAME = { power: 'Power', grace: 'Grace', mystery: 'Mystery' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const _v = new THREE.Vector3();

/** The cinematic of your character striking `name`. opts: { shot: 'low' | 'hero', kana: 'go' | 'do' | null, hold }. */
export function* poseScene(c, g, name, { kana = 'go', hold = 1.9, side = null, swing = true, tick = true, keep = false } = {}) {
  const P = g.player, S = standIn(g);
  if (!S) return;
  const feet = V(P.pos.x, 0, P.pos.z), yaw = P.yaw + Math.PI;
  if (!keep || !S.h.root.visible) S.show(feet, yaw);
  if (tick) c.every((dt) => S.update(dt, c.game.camera.position));
  const sd = side ?? (Math.random() < 0.5 ? 1 : -1);
  const shot = freeShot(g, feet, yaw, { angles: [0.38 * sd, -0.38 * sd, 0.75 * sd, -0.75 * sd, 0, 1.2 * sd, -1.2 * sd], height: 0.78, lookY: 1.28 * (S.h.root.scale.y || 1) });
  // out of your eyes, over the shoulder and round to the front (a short eased arc), then a low tilted angle
  if (swing) {
    const mid = V(feet.x + Math.sin(yaw + 1.9 * sd) * 1.1, 1.45, feet.z + Math.cos(yaw + 1.9 * sd) * 1.1);
    yield c.cam({ pos: mid, look: V(feet.x, 1.3, feet.z), dur: 0.42, fov: 56 });
  }
  S.h.gesture(name, { hold: true });
  sting('pose');
  yield c.all(c.cam({ pos: shot.pos, look: shot.look, dur: 0.4, fov: 44 }), rollTo(c, -0.13 * sd, 0.4));
  if (kana) g.jojo?.kana.spawn({ kind: kana, at: S.h, side: -sd, n: 3, dur: hold + 0.8 });
  // a slow push in while the pose holds
  const close = shot.pos.clone().lerp(shot.look, 0.16); close.y = shot.pos.y + 0.06;
  yield c.all(c.cam({ pos: close, look: shot.look, dur: hold, fov: 38 }), rollTo(c, -0.09 * sd, hold));
  g.events.emit('pose', { name, by: 'player', pos: feet });
  return S;
}

/** Strike a pose with the cinematic camera (a skippable cutscene). */
export function strikePose(g, name, { onDone = null } = {}) {
  if (!g.cutscene || g.cutscene.active || g.talk?.active || g.pc?.active) return false;
  const J = g.jojo;
  let S = null;
  g.cutscene.play(function* (c) {
    S = yield* poseScene(c, g, name);
    yield c.all(c.toPlayer(0.55), rollTo(c, 0, 0.5));
  }, { skippable: true, letterbox: true }).then(() => {
    S?.hide();
    if (J) { J.s.posed = (J.s.posed || 0) + 1; J.s.seen[name] = (J.s.seen[name] || 0) + 1; }
    reactions(g, name);
    onDone?.();
  });
  return true;
}

/** People nearby answer a pose: a counter-pose (with a ゴゴゴ of their own), a clap, a shrug. */
export function reactions(g, name) {
  const P = g.player.pos, out = [];
  for (const n of g.lane?.list || []) {
    if (!n.present || n.busy || !n.isHuman || n.walking) continue;
    const d = Math.hypot(n.pos.x - P.x, n.pos.z - P.z);
    if (d < 7) out.push({ d, h: n.h, say: (t) => n.say(t), n });
  }
  for (const p of g.pedestrians?.list || []) {
    const r = p.h?.root;
    if (!r?.visible || p.talking) continue;
    const d = Math.hypot(r.position.x - P.x, r.position.z - P.z);
    if (d < 6) out.push({ d, h: p.h, say: (t) => g.bubbles?.say(p.h, t, { dur: 2.4 }) });
  }
  out.sort((a, b) => a.d - b.d);
  out.slice(0, 3).forEach((o, i) => {
    setTimeout(() => {
      const r = Math.random();
      if (r < 0.45) {
        const counter = pick(BIZARRE_ALL.filter((x) => x !== name));
        o.h.gesture(counter);
        g.jojo?.kana.spawn({ kind: Math.random() < 0.5 ? 'go' : 'do', at: o.h, n: 3, dur: 2.4 });
        o.say(pick(['Oh? You\'re approaching me?', 'Not bad. NOT BAD.', 'Hmph. Watch THIS.', 'Is this... a challenge?!', 'My spine says yes.']));
      } else if (r < 0.75) { o.h.gesture('clap'); o.say(pick(['Bravo!', 'What a pose!', 'Do it again!', 'Ooh, dramatic.'])); } else { o.h.gesture('shrug'); o.say(pick(['...Are you okay?', 'The shop guy\'s at it again.', 'Huh.', 'Kids these days.'])); }
    }, 300 + i * 450);
  });
  return out.length;
}

// ------------------------------------------------------------------ the pose tags (paper kit)
export class PoseMenu {
  constructor(game, jojo) {
    this.game = game;
    this.J = jojo;
    this.open = false;
    this.sel = 0;
    const el = this.el = document.createElement('div');
    el.id = 'pose-menu';
    el.className = 'hidden';
    document.body.appendChild(el);
    el.addEventListener('click', (e) => {
      const t = e.target.closest('[data-pose]');
      if (t) { e.stopPropagation(); this.choose(t.dataset.pose); }
    });
  }

  get list() { return MENU_POSES; }
  learned(name) { return this.J.s.learned.includes(name); }

  render() {
    const tags = this.list.map((p, i) => {
      const I = POSE_INFO[p] || { name: p };
      const lock = !this.learned(p);
      const st = I.style ? `<i class="st st-${I.style}" title="${STYLE_NAME[I.style]}">${STYLE_KANJI[I.style]}</i>` : '';
      return `<button class="pm-tag${lock ? ' lock' : ''}${i === this.sel ? ' sel' : ''}" data-pose="${p}"><kbd>${i < 9 ? i + 1 : ''}</kbd><b>${esc(I.name)}</b>${st}`
        + `<small>${lock ? `Learn it from ${esc(TEACHER[p] || 'someone on the lane')}` : esc(I.blurb || '')}</small></button>`;
    }).join('');
    this.el.innerHTML = `<div class="pm-card"><div class="pm-head"><span>Strike a pose</span><small>V close · 1-9 pick · <i class="st st-power">力</i> beats <i class="st st-mystery">謎</i> beats <i class="st st-grace">雅</i> beats <i class="st st-power">力</i></small></div><div class="pm-tags">${tags}</div></div>`;
  }

  toggle(on = !this.open) {
    const g = this.game;
    if (on && (g.cutscene?.active || g.talk?.active || g.pc?.active || g.uiOpen || g.cinema?.photo?.active)) return;
    this.open = on;
    if (on) { this.prevUi = g.uiOpen; g.uiOpen = true; this.render(); }
    else g.uiOpen = this.prevUi || false;
    this.el.classList.toggle('hidden', !on);
    try { audio.play(on ? 'paper' : 'uiHover', { vol: 0.4 }); } catch { /* */ }
  }

  choose(name) {
    if (!this.learned(name)) {
      this.el.querySelector(`[data-pose="${name}"]`)?.classList.add('shake');
      setTimeout(() => this.el.querySelector(`[data-pose="${name}"]`)?.classList.remove('shake'), 400);
      try { audio.play('uiHover', { vol: 0.5 }); } catch { /* */ }
      return;
    }
    this.toggle(false);
    // multiplayer: the room sees it too (the three classic poses and the fun ones are network emotes)
    const mp = this.game.mp || this.game.net;
    try { if (mp?.active && mp.social && ['pose_point', 'pose_lean', 'pose_cross', 'dab', 'flex', 'peace'].includes(name)) mp.social.emote(name); } catch { /* */ }
    strikePose(this.game, name);
  }

  update() {
    const g = this.game, inp = g.input;
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
    if (typing) return;
    if (!this.open) {
      if (inp.keyPressed('KeyV') && (inp.locked || inp.touch) && !g.uiOpen) this.toggle(true);
      return;
    }
    if (inp.keyPressed('KeyV') || inp.keyPressed('Escape') || inp.mouse.down[2]) { this.toggle(false); return; }
    for (let i = 0; i < 9; i++) if (inp.keyPressed('Digit' + (i + 1))) { this.choose(this.list[i]); return; }
    const w = inp.mouse.wheel;
    if (w) { this.sel = (this.sel + (w > 0 ? 1 : -1) + this.list.length) % this.list.length; this.render(); }
    if (inp.mouse.down[0] && inp.locked) this.choose(this.list[this.sel]);
  }
}
