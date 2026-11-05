// The dressing room's 8-bit chimes, registered into the game's synth (src/core/audio.js SOUNDS): NES-style pulse
// arpeggios and triangle tinkles. Play them with audio.play('kiraChime') like any other sound.
//   kiraChime      a piece goes on: a quick rising arpeggio and a sparkle on top
//   kiraRare       a rare / ultra piece: two octaves up, a bell, a shimmer of high blips
//   kiraSecret     a super secret one: a little fanfare
//   kiraHover      trying something on by hovering: a soft two-note blip
//   kiraDenied     not yours yet: two falling notes and a stamp thump
//   kiraCurtain    the curtains part: a cloth swish and a rising run
//   kiraBuy        paid at the counter: coins and a cheerful ding
import { SOUNDS } from '../core/audio.js';

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const rand = (a, b) => a + Math.random() * (b - a);

function arp(a, o, t, notes, { step = 0.055, dur = 0.09, vol = 0.045, duty = 0.25 } = {}) {
  notes.forEach((n, i) => a.tone(o, t + i * step, { wave: a.pulse(duty), f: NOTE(n), dur, vol, curve: 'lin' }));
}
function tinkle(a, o, t, n, vol = 0.02) {
  for (let i = 0; i < n; i++) a.tone(o, t + i * 0.045 + rand(0, 0.02), { type: 'triangle', f: rand(2400, 4200), dur: 0.07, vol });
}

const DRESS = {
  kiraChime(a, t, o) {
    arp(a, o, t, [76, 79, 84, 88, 91]);
    a.tone(o, t + 0.27, { wave: a.pulse(0.125), f: NOTE(96), dur: 0.22, vol: 0.035, curve: 'exp' });
    tinkle(a, o, t + 0.2, 4);
  },
  kiraRare(a, t, o) {
    arp(a, o, t, [72, 76, 79, 84, 88, 91, 96, 100], { step: 0.05 });
    a.bell(o, t + 0.42, NOTE(96), { dur: 1.0, vol: 0.07 });
    a.burst(o, t + 0.4, { dur: 0.6, vol: 0.03, type: 'highpass', f: 6000 });
    tinkle(a, o, t + 0.45, 9, 0.022);
  },
  kiraSecret(a, t, o) {
    [[72, 0], [76, 0.1], [79, 0.2], [84, 0.3], [79, 0.42], [84, 0.5], [88, 0.62], [91, 0.74]].forEach(([n, d]) => {
      a.tone(o, t + d, { wave: a.pulse(0.25), f: NOTE(n), dur: 0.11, vol: 0.045, curve: 'lin' });
      a.tone(o, t + d, { wave: a.pulse(0.5), f: NOTE(n - 12), dur: 0.11, vol: 0.025, curve: 'lin' });
    });
    [84, 88, 91, 96].forEach((n) => a.bell(o, t + 0.9, NOTE(n), { dur: 1.6, vol: 0.05 }));
    tinkle(a, o, t + 0.9, 14, 0.02);
  },
  kiraHover(a, t, o) {
    a.tone(o, t, { wave: a.pulse(0.125), f: NOTE(91), dur: 0.04, vol: 0.016, curve: 'lin' });
    a.tone(o, t + 0.04, { wave: a.pulse(0.125), f: NOTE(96), dur: 0.05, vol: 0.014, curve: 'lin' });
  },
  kiraDenied(a, t, o) {
    a.tone(o, t, { wave: a.pulse(0.5), f: NOTE(67), dur: 0.1, vol: 0.035, curve: 'lin' });
    a.tone(o, t + 0.11, { wave: a.pulse(0.5), f: NOTE(63), dur: 0.16, vol: 0.035, curve: 'lin' });
    a.burst(o, t + 0.3, { dur: 0.08, vol: 0.22, type: 'lowpass', f: 500, buf: a.pink });
    a.tone(o, t + 0.3, { f: 140, f2: 60, dur: 0.1, vol: 0.25 });
  },
  kiraCurtain(a, t, o) {
    a.burst(o, t, { dur: 0.55, vol: 0.07, type: 'bandpass', f: 900, f2: 2600, q: 0.8, buf: a.pink });
    arp(a, o, t + 0.3, [67, 71, 74, 79, 83, 86], { step: 0.045, vol: 0.03 });
    tinkle(a, o, t + 0.55, 5, 0.018);
  },
  kiraBuy(a, t, o) {
    a.burst(o, t, { dur: 0.06, vol: 0.18, f: 3200, q: 1 });
    arp(a, o, t + 0.05, [84, 88, 91, 96], { step: 0.06, vol: 0.04 });
    a.bell(o, t + 0.3, NOTE(100), { dur: 0.7, vol: 0.05 });
  },
};

let done = false;
export function installDressSounds() {
  if (done) return;
  done = true;
  for (const [k, fn] of Object.entries(DRESS)) if (!SOUNDS[k]) SOUNDS[k] = fn;
}
