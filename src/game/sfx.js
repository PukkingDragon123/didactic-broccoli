// Extra synthesized one-shots, registered into the shared sound table (src/core/audio.js plays them by name):
// the open-hand slap, a cat's hiss and lapping tongue, milk splats and drips. Import for the side effect.
import { SOUNDS } from '../core/audio.js';

const add = (name, fn) => { if (!SOUNDS[name]) SOUNDS[name] = fn; };

// a flat palm on something: a bright crack of skin on skin and a dull thump under it
add('smack', (a, t, o, p) => {
  const v = p.v ?? 1;
  a.burst(o, t, { dur: 0.045, vol: 0.55 * v, type: 'highpass', f: 2200 });
  a.burst(o, t, { dur: 0.08, vol: 0.45 * v, type: 'bandpass', f: 1100, q: 0.8 });
  a.tone(o, t, { f: 210, f2: 80, dur: 0.09, vol: 0.32 * v });
});
add('hiss', (a, t, o) => {
  a.burst(o, t, { dur: 0.42, vol: 0.18, type: 'highpass', f: 3200, attack: 0.03 });
  a.burst(o, t, { dur: 0.3, vol: 0.08, type: 'bandpass', f: 5200, q: 2 });
});
add('lap', (a, t, o) => {
  a.burst(o, t, { dur: 0.03, vol: 0.06, type: 'bandpass', f: 1800, q: 3 });
  a.tone(o, t, { type: 'sine', f: 900, f2: 500, dur: 0.04, vol: 0.02 });
});
// milk hitting the floor (bigger, wetter) / the bowl (a plip into the milk) / a single drip
add('splat', (a, t, o, p) => {
  const v = p.v ?? 1;
  a.burst(o, t, { dur: 0.09, vol: 0.12 * v, type: 'bandpass', f: 1400, f2: 600, q: 1.2 });
  a.burst(o, t + 0.01, { dur: 0.05, vol: 0.06 * v, type: 'highpass', f: 3500 });
});
add('plip', (a, t, o, p) => {
  const v = p.v ?? 1;
  a.tone(o, t, { type: 'sine', f: 700 + Math.random() * 400, f2: 1400 + Math.random() * 500, dur: 0.06, vol: 0.05 * v });
  a.burst(o, t, { dur: 0.04, vol: 0.03 * v, type: 'bandpass', f: 2500, q: 2 });
});
add('drip', (a, t, o) => { a.tone(o, t, { type: 'sine', f: 1300 + Math.random() * 500, f2: 2200, dur: 0.05, vol: 0.04 }); });
