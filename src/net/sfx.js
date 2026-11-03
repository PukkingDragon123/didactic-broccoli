// Synth sounds for playing together: the police bicycle's bell and kickstand, a whistle, flattened cardboard
// crinkling under you, a chat blip, a friend joining / leaving, a pocket being picked.
import { SOUNDS } from '../core/audio.js';

const N = (n) => 440 * Math.pow(2, (n - 69) / 12);

Object.assign(SOUNDS, {
  // the classic "chirin chirin" of a bicycle bell: two quick rings
  bikeBell(a, t, o) {
    for (const d of [0, 0.16]) a.bell(o, t + d, 2350, { dur: 0.5, vol: 0.09, partials: [1, 2.32, 3.9, 5.1], decays: [1, 0.6, 0.4, 0.3] });
  },
  kickstand(a, t, o) {
    a.burst(o, t, { dur: 0.04, vol: 0.25, type: 'bandpass', f: 2600, q: 3 });
    a.tone(o, t + 0.01, { type: 'triangle', f: 1300, f2: 900, dur: 0.08, vol: 0.05 });
    a.burst(o, t + 0.07, { dur: 0.05, vol: 0.12, type: 'lowpass', f: 900, buf: a.brown });
  },
  policeWhistle(a, t, o) {
    a.tone(o, t, { type: 'square', f: 2900, f2: 3100, dur: 0.22, vol: 0.025 });
    a.tone(o, t + 0.28, { type: 'square', f: 2900, f2: 3150, dur: 0.5, vol: 0.025 });
  },
  // lying down on flattened boxes: a dry rustle with a few crackles
  cardCrinkle(a, t, o) {
    a.burst(o, t, { dur: 0.35, vol: 0.18, type: 'bandpass', f: 1400, f2: 2600, q: 0.7, buf: a.pink });
    for (let i = 0; i < 5; i++) a.burst(o, t + 0.04 + i * 0.07 + Math.random() * 0.03, { dur: 0.025, vol: 0.16, type: 'highpass', f: 2400 + Math.random() * 1400 });
    a.burst(o, t + 0.3, { dur: 0.25, vol: 0.08, type: 'lowpass', f: 700, buf: a.brown });
  },
  netChat(a, t, o) {
    a.tone(o, t, { type: 'square', f: N(81), dur: 0.05, vol: 0.025 });
    a.tone(o, t + 0.06, { type: 'square', f: N(88), dur: 0.07, vol: 0.025 });
  },
  netJoin(a, t, o) {
    [76, 79, 84].forEach((n, i) => a.tone(o, t + i * 0.08, { type: 'square', f: N(n), dur: 0.09, vol: 0.028 }));
  },
  netLeave(a, t, o) {
    [84, 79, 72].forEach((n, i) => a.tone(o, t + i * 0.09, { type: 'square', f: N(n), dur: 0.1, vol: 0.025 }));
  },
  pickpocket(a, t, o) {
    a.burst(o, t, { dur: 0.12, vol: 0.12, type: 'bandpass', f: 2200, f2: 3600, q: 1.2, buf: a.pink });
    a.tone(o, t + 0.1, { type: 'square', f: N(88), dur: 0.05, vol: 0.02 });
    a.tone(o, t + 0.16, { type: 'square', f: N(93), dur: 0.08, vol: 0.02 });
  },
  snore(a, t, o) {
    a.burst(o, t, { dur: 0.9, vol: 0.06, type: 'lowpass', f: 260, f2: 420, buf: a.brown });
  },
});
