// The dressing room's sounds, registered into the game's synth (src/core/audio.js SOUNDS) and played with
// audio.play('drRustle') like any other: cloth and paper, a wire hanger, a wardrobe door, with a soft 8-bit note on top
// only where something deserves it (a rare piece, paying at the counter).
//   drRustle     a piece goes on: a cloth rustle (two filtered-noise swishes) and the hanger's tick
//   drRare       a rare / ultra piece: the rustle and two soft pulse notes
//   drSecret     a super secret one: the rustle and a short four-note run
//   drHover      trying something on by pointing at it: a quiet brush of cloth
//   drDenied     not yours yet: a soft paper thup and two low notes
//   drOpen       into the room: a wardrobe door on its hinge and a floorboard
//   drBuy        paid at the counter: coins on the tray and a little till ding
import { SOUNDS } from '../core/audio.js';

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const rand = (a, b) => a + Math.random() * (b - a);

function swish(a, o, t, { dur = 0.12, vol = 0.09, f = 2200, f2 = 3600, q = 0.9 } = {}) {
  a.burst(o, t, { dur, vol, type: 'bandpass', f: f * rand(0.9, 1.1), f2: f2 * rand(0.9, 1.1), q, buf: a.pink, attack: 0.012 });
}
function tick(a, o, t, vol = 0.05) {
  a.tone(o, t, { type: 'triangle', f: rand(2300, 2700), dur: 0.025, vol });
  a.tone(o, t + 0.018, { type: 'triangle', f: rand(1500, 1800), dur: 0.02, vol: vol * 0.6 });
}

const DRESS = {
  drRustle(a, t, o) {
    swish(a, o, t, { dur: 0.13, vol: 0.1 });
    swish(a, o, t + 0.11, { dur: 0.16, vol: 0.08, f: 1600, f2: 2800 });
    tick(a, o, t + 0.04);
  },
  drRare(a, t, o) {
    DRESS.drRustle(a, t, o);
    a.tone(o, t + 0.2, { wave: a.pulse(0.25), f: NOTE(88), dur: 0.1, vol: 0.025, curve: 'lin' });
    a.tone(o, t + 0.3, { wave: a.pulse(0.25), f: NOTE(95), dur: 0.18, vol: 0.022, curve: 'exp' });
  },
  drSecret(a, t, o) {
    DRESS.drRustle(a, t, o);
    [84, 88, 91, 96].forEach((n, i) => a.tone(o, t + 0.2 + i * 0.075, { wave: a.pulse(0.25), f: NOTE(n), dur: 0.1, vol: 0.026, curve: 'lin' }));
    a.bell(o, t + 0.52, NOTE(96), { dur: 0.6, vol: 0.03 });
  },
  drHover(a, t, o) {
    swish(a, o, t, { dur: 0.07, vol: 0.035, f: 2600, f2: 3400 });
  },
  drDenied(a, t, o) {
    a.burst(o, t, { dur: 0.06, vol: 0.16, type: 'lowpass', f: 700, buf: a.pink });
    a.tone(o, t + 0.02, { wave: a.pulse(0.5), f: NOTE(64), dur: 0.08, vol: 0.022, curve: 'lin' });
    a.tone(o, t + 0.11, { wave: a.pulse(0.5), f: NOTE(60), dur: 0.12, vol: 0.022, curve: 'lin' });
  },
  drOpen(a, t, o) {
    // the wardrobe door: a short creak (a gliding square note, very quiet), the latch, a floorboard
    a.tone(o, t, { wave: a.pulse(0.125), f: 310, f2: 420, dur: 0.22, vol: 0.012, curve: 'lin' });
    a.burst(o, t + 0.18, { dur: 0.04, vol: 0.12, type: 'bandpass', f: 1800, q: 2 });
    a.tone(o, t + 0.32, { f: 120, f2: 90, dur: 0.08, vol: 0.08 });
    swish(a, o, t + 0.05, { dur: 0.2, vol: 0.04, f: 1200, f2: 2000 });
  },
  drBuy(a, t, o) {
    for (let i = 0; i < 3; i++) a.tone(o, t + i * 0.05, { type: 'triangle', f: rand(3000, 3600), dur: 0.05, vol: 0.04 });
    a.tone(o, t + 0.2, { wave: a.pulse(0.25), f: NOTE(91), dur: 0.06, vol: 0.03, curve: 'lin' });
    a.bell(o, t + 0.26, NOTE(96), { dur: 0.5, vol: 0.04 });
  },
};

let done = false;
export function installDressSounds() {
  if (done) return;
  done = true;
  for (const [k, fn] of Object.entries(DRESS)) if (!SOUNDS[k]) SOUNDS[k] = fn;
}
