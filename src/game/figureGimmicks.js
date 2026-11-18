// Figure gimmicks (the Blender toy line, art/blender/toys): a figure whose GLB carries a 'gimmick' clip plays it when
// you press it, in your hand (src/plugins/figures.js), on a display shelf or lying loose (right click with empty hands,
// src/game/toys.js). The item's `gimmick.sfx` times little plastic sounds to the clip: [[seconds, sound, opts], ...].
//   hasFigureGimmick(key)            the item is a figure with a playable clip
//   playFigureGimmick(mesh)          play it (once; a press while it plays is ignored); returns the clip length
//   updateFigureGimmicks(dt)         per frame: the timed sounds
//   onFigurePress(fn)                more press behaviour (light-up parts, pull-back runs: src/plugins/toyKit.js):
//                                    fn(mesh, item) returns a duration (> 0) when it did something
// The data API of every gimmick (keychain, playset, light, pullback) is in art/blender/toys/GIMMICKS.md.
import { audio, SOUNDS } from '../core/audio.js';
import { getItem } from '../data/series/index.js';
import { isLowpix, lowpixManifest, playFigureClip, figureClipPlaying } from '../figures/lowpix.js';

const rand = (a, b) => a + Math.random() * (b - a);
Object.assign(SOUNDS, {
  /** A plastic joint clicking into place. */
  toyClick(a, t, o, p) {
    const f = (p.f || 2400) * rand(0.92, 1.08);
    a.burst(o, t, { dur: 0.018, vol: 0.32 * (p.v ?? 1), type: 'highpass', f });
    a.tone(o, t, { f: f * 0.45, f2: f * 0.3, dur: 0.035, vol: 0.07 * (p.v ?? 1), type: 'triangle' });
  },
  /** A run of clicks: a toy folding up or unfolding (kacha-kacha). */
  toyFold(a, t, o, p) {
    const n = p.n || 5;
    for (let i = 0; i < n; i++) {
      const f = rand(1900, 2900);
      a.burst(o, t + i * (p.gap || 0.055) + rand(0, 0.012), { dur: 0.016, vol: 0.26, type: 'highpass', f });
      a.tone(o, t + i * (p.gap || 0.055), { f: f * 0.4, f2: f * 0.28, dur: 0.03, vol: 0.05, type: 'triangle' });
    }
    a.burst(o, t + n * (p.gap || 0.055) + 0.02, { dur: 0.05, vol: 0.2, type: 'lowpass', f: 1100 });
  },
  /** Two hard plastic edges snapping together (a jaw, a stapler). */
  toySnap(a, t, o, p) {
    a.burst(o, t, { dur: 0.03, vol: 0.45 * (p.v ?? 1), type: 'bandpass', f: p.f || 1600, q: 1.4 });
    a.tone(o, t, { f: 520, f2: 240, dur: 0.06, vol: 0.12 * (p.v ?? 1), type: 'square' });
  },
  /** A crank ratchet going round. */
  toyRatchet(a, t, o, p) {
    const n = p.n || 12;
    for (let i = 0; i < n; i++) a.burst(o, t + i * (p.gap || 0.05), { dur: 0.012, vol: 0.2, type: 'highpass', f: rand(3000, 3800) });
  },
  /** Wings buzzing (a beetle). */
  toyBuzz(a, t, o, p) {
    a.tone(o, t, { type: 'sawtooth', f: 150, f2: 170, dur: p.dur || 0.4, vol: 0.05, attack: 0.03 });
    a.burst(o, t, { dur: p.dur || 0.4, vol: 0.05, type: 'bandpass', f: 600, q: 3, buf: a.pink });
  },
  /** A little hop landing on the shelf. */
  toyTap(a, t, o) {
    a.burst(o, t, { dur: 0.025, vol: 0.28, type: 'lowpass', f: 1500 });
  },
});

/** The item is a figure with a playable gimmick clip (and not one of toys.js's playable toys). */
export function hasFigureGimmick(key) {
  const it = getItem(key);
  return !!(it && !it.toy && isLowpix(it) && (lowpixManifest[key]?.clips?.gimmick || it.light || it.pullback));
}
const pressFns = [];
export function onFigurePress(fn) { pressFns.push(fn); }

const timed = []; // { mesh, t, events }
/** Play a figure's gimmick on its mesh (in a hand, on a shelf, on the floor). Returns the clip length (0: nothing). */
export function playFigureGimmick(mesh) {
  if (!mesh || figureClipPlaying(mesh)) return 0;
  const it = getItem(mesh.userData.itemKey);
  let extra = 0;
  for (const fn of pressFns) { try { extra = Math.max(extra, fn(mesh, it) || 0); } catch (e) { console.warn('figure press', e); } }
  if (it?.pullback && extra) return extra; // (it ran off: no clip on the mesh it left behind)
  const d = lowpixManifest[mesh.userData.itemKey]?.clips?.gimmick ? playFigureClip(mesh, 'gimmick') : 0;
  if (!d) return extra;
  const ev = it?.gimmick?.sfx;
  if (ev?.length) timed.push({ mesh, t: 0, next: 0, events: ev });
  else if (lowpixManifest[mesh.userData.itemKey]?.blender) { try { audio.play('toyFold', { pos: mesh.getWorldPosition(mesh.position.clone()) }); } catch { /* no sound */ } }
  else { try { audio.play('flap', { vol: 0.3 }); } catch { /* no such sound */ } } // (the older figures' wobble)
  return Math.max(d, extra);
}

/** Per frame: fire each playing gimmick's timed sounds. */
export function updateFigureGimmicks(dt) {
  for (let i = timed.length - 1; i >= 0; i--) {
    const T = timed[i];
    T.t += dt;
    while (T.next < T.events.length && T.events[T.next][0] <= T.t) {
      const [, name, opts] = T.events[T.next++];
      try { audio.play(name, { ...(opts || {}), pos: T.mesh.getWorldPosition(T.mesh.position.clone()) }); } catch { /* no sound */ }
    }
    if (T.next >= T.events.length || !T.mesh.parent) timed.splice(i, 1);
  }
}
