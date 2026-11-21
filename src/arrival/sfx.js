// Synth sounds for the opening (src/arrival/), registered into the audio engine's tables at import time.
//   arrIgnition  the key turned back in the ignition: the barrel's click and a detent
//   arrKeys      the key drawn out and the ring swinging: a few small metallic tinks
//   arrSettle    the van settling on its springs as the engine dies: a low creak and a body knock
//   lighter      a lighter's flick (the smokers' one from src/plugins/streetlife.js, if that hasn't registered it)
//   arrTofu      the tofu seller's horn down the lane at dusk (豆腐屋のラッパ): two reedy notes, the second bent and held
import { SOUNDS } from '../core/audio.js';

const rand = (a, b) => a + Math.random() * (b - a);

Object.assign(SOUNDS, {
  arrIgnition(a, t, o) {
    a.burst(o, t, { dur: 0.025, vol: 0.22, type: 'highpass', f: 2600 });
    a.tone(o, t + 0.01, { type: 'triangle', f: 1450, f2: 1100, dur: 0.05, vol: 0.05 });
    a.burst(o, t + 0.13, { dur: 0.03, vol: 0.18, type: 'bandpass', f: 1900, q: 3 });
  },
  arrKeys(a, t, o) {
    for (let i = 0; i < 6; i++) {
      const tt = t + i * 0.07 + rand(0, 0.04), f = rand(3200, 5200);
      a.tone(o, tt, { type: 'triangle', f, dur: 0.09, vol: 0.035 * (1 - i * 0.12) });
      a.tone(o, tt, { type: 'sine', f: f * 2.7, dur: 0.05, vol: 0.012 });
    }
    a.burst(o, t, { dur: 0.05, vol: 0.06, type: 'highpass', f: 3000 });
  },
  arrTofu(a, t, o) {
    // a brass toy horn: a buzzy sawtooth through a nasal band, with breath and a little vibrato; "pa-puu"
    for (const [dt, f, f2, dur, v] of [[0, 740, 732, 0.42, 0.05], [0.5, 830, 790, 1.05, 0.055]]) {
      a.tone(o, t + dt, { type: 'sawtooth', f, f2, dur, vol: v * 0.55, attack: 0.04 });
      a.tone(o, t + dt, { type: 'square', f: f * 1.002, f2: f2 * 1.004, dur, vol: v * 0.25, attack: 0.05 });
      a.burst(o, t + dt, { dur: dur * 0.9, vol: v * 0.35, type: 'bandpass', f: f * 2, q: 6, attack: 0.03 });
    }
  },
  arrSettle(a, t, o) {
    a.tone(o, t, { f: 95, f2: 60, dur: 0.18, vol: 0.18 });
    a.burst(o, t + 0.05, { dur: 0.35, vol: 0.05, type: 'bandpass', f: 380, f2: 260, q: 4, buf: a.brown });
    a.burst(o, t + 0.12, { dur: 0.04, vol: 0.06, type: 'bandpass', f: rand(700, 900), q: 2 });
  },
});
if (!SOUNDS.lighter) {
  SOUNDS.lighter = (a, t, o) => {
    a.burst(o, t, { dur: 0.03, vol: 0.25, type: 'highpass', f: 4200 });
    a.burst(o, t + 0.05, { dur: 0.18, vol: 0.08, type: 'bandpass', f: 1800, q: 1.2, attack: 0.02 });
  };
}
