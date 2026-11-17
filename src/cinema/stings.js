// Music stings for the cinematic moments: short, original chiptune cues on the music bus (they follow the Music
// volume), registered with the synth so audio.play() knows them.
//   sting('rise' | 'reveal' | 'secret' | 'standoff' | 'menace' | 'impact' | 'win' | 'lose' | 'machine' | 'farewell' |
//         'dusk' | 'shutter' | 'pose', { vol, delay })
import { audio, SOUNDS } from '../core/audio.js';

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);

function seq(a, o, t, notes, { step = 0.1, duty = 0.25, len = 0.9, vol = 0.05 } = {}) {
  const w = a.pulse(duty);
  notes.forEach((n, i) => { if (n != null) a.tone(o, t + i * step, { wave: w, f: NOTE(n), dur: step * len, vol, curve: 'lin' }); });
}
function chord(a, o, t, notes, { dur = 1.4, vol = 0.03, duty = 0.125, attack = 0.01 } = {}) {
  const w = a.pulse(duty);
  for (const n of notes) a.tone(o, t, { wave: w, f: NOTE(n), dur, vol, curve: 'lin', attack });
}
const bass = (a, o, t, n, dur = 0.5, vol = 0.12) => a.tone(o, t, { type: 'triangle', f: NOTE(n), dur, vol, curve: 'lin' });
const kick = (a, o, t, vol = 0.16) => { a.tone(o, t, { type: 'sine', f: 140, f2: 42, dur: 0.18, vol }); };
const snare = (a, o, t, vol = 0.1) => a.burst(o, t, { dur: 0.12, vol, type: 'bandpass', f: 1800, q: 0.8 });
const crash = (a, o, t, vol = 0.12, dur = 0.9) => a.burst(o, t, { dur, vol, type: 'highpass', f: 4200, attack: 0.002 });

const CUES = {
  // level up: a quick climbing run onto a bright held chord
  rise(a, o, t) {
    seq(a, o, t, [60, 64, 67, 72, 76, 79], { step: 0.065, vol: 0.05 });
    chord(a, o, t + 0.42, [72, 76, 79, 84], { dur: 1.3, vol: 0.026 });
    bass(a, o, t + 0.42, 48, 1.1); kick(a, o, t + 0.42); crash(a, o, t + 0.42, 0.06);
  },
  // a rare pull: a held suspended chord that resolves up
  reveal(a, o, t) {
    chord(a, o, t, [62, 67, 69], { dur: 0.7, vol: 0.026, duty: 0.25 });
    seq(a, o, t + 0.05, [74, 76, 79, 81], { step: 0.11, vol: 0.035, duty: 0.125 });
    chord(a, o, t + 0.55, [67, 71, 74, 79], { dur: 1.4, vol: 0.026 });
    bass(a, o, t + 0.55, 43, 1.2);
  },
  // the secret: low rumble, a beat of silence, a huge major hit and a sparkling run down
  secret(a, o, t) {
    for (let i = 0; i < 6; i++) a.tone(o, t + i * 0.12, { wave: a.pulse(0.5), f: NOTE(31 + (i % 2)), dur: 0.11, vol: 0.09, curve: 'lin' });
    kick(a, o, t + 0.95, 0.2); crash(a, o, t + 0.95, 0.14, 1.4);
    chord(a, o, t + 0.95, [60, 64, 67, 72, 76], { dur: 2.2, vol: 0.026, duty: 0.25 });
    bass(a, o, t + 0.95, 36, 2.0, 0.14);
    seq(a, o, t + 1.1, [96, 91, 88, 84, 79, 76, 72], { step: 0.07, vol: 0.022, duty: 0.125 });
  },
  // two hard stabs, then the menacing walk
  standoff(a, o, t) {
    for (const [dt, n] of [[0, 40], [0.32, 41]]) { a.tone(o, t + dt, { wave: a.pulse(0.5), f: NOTE(n), dur: 0.26, vol: 0.1, curve: 'lin' }); kick(a, o, t + dt, 0.18); chord(a, o, t + dt, [n + 24, n + 27, n + 30], { dur: 0.24, vol: 0.022, duty: 0.25 }); }
    seq(a, o, t + 0.8, [52, null, 52, 55, null, 52, 58, 57], { step: 0.14, vol: 0.04, duty: 0.5 });
  },
  // a low throbbing pulse under the ゴゴゴ
  menace(a, o, t) {
    for (let i = 0; i < 8; i++) a.tone(o, t + i * 0.18, { wave: a.pulse(0.25), f: NOTE(33 + (i % 4 === 3 ? 1 : 0)), dur: 0.16, vol: 0.08, curve: 'lin' });
    chord(a, o, t, [57, 60, 63], { dur: 1.5, vol: 0.012, duty: 0.5, attack: 0.4 });
  },
  // the impact frame: a crash and a falling low hit
  impact(a, o, t) {
    kick(a, o, t, 0.22); crash(a, o, t, 0.16, 0.7);
    a.tone(o, t, { wave: a.pulse(0.5), f: 220, f2: 55, dur: 0.4, vol: 0.06 });
    a.burst(o, t, { dur: 0.25, vol: 0.12, type: 'lowpass', f: 1200, f2: 150 });
  },
  win(a, o, t) {
    seq(a, o, t, [67, 67, 67, 72, null, 76, 79], { step: 0.09, vol: 0.05 });
    chord(a, o, t + 0.63, [72, 76, 79, 84], { dur: 1.6, vol: 0.028 });
    bass(a, o, t + 0.63, 48, 1.4); kick(a, o, t + 0.63); crash(a, o, t + 0.63, 0.07, 1.2);
  },
  lose(a, o, t) {
    seq(a, o, t, [67, 66, 65], { step: 0.3, vol: 0.05, duty: 0.5, len: 0.95 });
    a.tone(o, t + 0.9, { wave: a.pulse(0.5), f: NOTE(64), f2: NOTE(61), dur: 1.0, vol: 0.05, curve: 'lin', glide: 'lin' });
    bass(a, o, t + 0.9, 40, 1.0, 0.1);
  },
  // the first machine: a jaunty little fanfare
  machine(a, o, t) {
    seq(a, o, t, [72, 74, 76, 79, null, 76, 79, 84], { step: 0.085, vol: 0.045 });
    chord(a, o, t + 0.68, [72, 76, 79], { dur: 1.2, vol: 0.026 });
    bass(a, o, t, 48, 0.3); bass(a, o, t + 0.34, 55, 0.3); bass(a, o, t + 0.68, 48, 1.0);
    kick(a, o, t + 0.68, 0.12); snare(a, o, t + 0.34, 0.05);
  },
  // Grandpa goes: a soft bell chord
  farewell(a, o, t) {
    for (const [dt, n] of [[0, 64], [0.35, 67], [0.7, 71], [1.05, 76]]) a.bell(o, t + dt, NOTE(n), { dur: 2.2, vol: 0.05, partials: [1, 2, 3.01], decays: [1, 0.5, 0.3] });
    chord(a, o, t + 0.2, [52, 59, 64], { dur: 2.6, vol: 0.012, duty: 0.5, attack: 0.6 });
  },
  // the day ends: a lazy falling phrase
  dusk(a, o, t) {
    seq(a, o, t, [79, 76, 74, 72, 69, 67], { step: 0.16, vol: 0.035, duty: 0.125, len: 1.2 });
    chord(a, o, t + 0.96, [60, 64, 67, 71], { dur: 1.8, vol: 0.02, duty: 0.25, attack: 0.05 });
  },
  shutter(a, o, t) { a.tone(o, t, { type: 'sine', f: 2600, dur: 0.03, vol: 0.12 }); a.burst(o, t + 0.01, { dur: 0.09, vol: 0.18, type: 'highpass', f: 2000 }); a.burst(o, t + 0.12, { dur: 0.06, vol: 0.1, type: 'bandpass', f: 900 }); },
  // striking a pose: a whip and a stab
  pose(a, o, t) {
    a.burst(o, t, { dur: 0.16, vol: 0.12, type: 'bandpass', f: 600, f2: 3200, q: 1.2 });
    a.tone(o, t + 0.16, { wave: a.pulse(0.5), f: NOTE(45), dur: 0.22, vol: 0.09, curve: 'lin' });
    chord(a, o, t + 0.16, [69, 72, 75], { dur: 0.3, vol: 0.02, duty: 0.25 });
  },
};

SOUNDS.cineSting = (a, t, o, p) => (CUES[p.kind] || CUES.reveal)(a, t, o, p);

export function sting(kind, { vol = 1, delay = 0 } = {}) {
  try { audio.play('cineSting', { kind, vol, delay, bus: audio.music }); } catch { /* audio not ready */ }
}
