// Capsule 98 sounds: synth voices added to the shared audio engine (so audio.play('osBoot') works anywhere),
// 8-bit chimes for the desktop plus the physical sounds of the desk: chair, keyboard, mouse, CRT and hard disk.
import { audio, SOUNDS } from '../core/audio.js';

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const rand = (a, b) => a + Math.random() * (b - a);

const V = {
  // ---------------------------------------------------------------- desktop chimes (8-bit)
  osBoot(a, t, o) {
    // the start-up jingle: a pulse arpeggio, a little answering phrase, then a bell chord over a bass note
    const lead = a.pulse(0.25), harm = a.pulse(0.125);
    [[72, 0], [76, 0.11], [79, 0.22], [84, 0.33], [83, 0.62], [79, 0.73], [81, 0.84]].forEach(([n, d]) => a.tone(o, t + d, { wave: lead, f: NOTE(n), dur: 0.16, vol: 0.035 }));
    [[60, 0], [67, 0.33], [65, 0.62]].forEach(([n, d]) => a.tone(o, t + d, { type: 'triangle', f: NOTE(n - 12), dur: 0.3, vol: 0.07 }));
    [76, 79, 84, 88].forEach((n, i) => a.tone(o, t + 1.02 + i * 0.03, { wave: harm, f: NOTE(n), dur: 1.3, vol: 0.022, attack: 0.02 }));
    a.bell(o, t + 1.02, NOTE(96), { dur: 1.6, vol: 0.035, partials: [1, 2, 3], decays: [1, 0.5, 0.3] });
    a.tone(o, t + 1.02, { type: 'triangle', f: NOTE(36), dur: 1.5, vol: 0.09, attack: 0.03 });
  },
  osOff(a, t, o) {
    const lead = a.pulse(0.25);
    [84, 79, 76, 72, 67].forEach((n, i) => a.tone(o, t + i * 0.1, { wave: lead, f: NOTE(n), dur: 0.2, vol: 0.03 }));
    a.tone(o, t + 0.5, { type: 'triangle', f: NOTE(48), dur: 0.9, vol: 0.07 });
  },
  osOpen(a, t, o) { a.tone(o, t, { wave: a.pulse(0.25), f: NOTE(79), dur: 0.04, vol: 0.022 }); a.tone(o, t + 0.04, { wave: a.pulse(0.25), f: NOTE(86), dur: 0.07, vol: 0.022 }); },
  osClose(a, t, o) { a.tone(o, t, { wave: a.pulse(0.25), f: NOTE(84), dur: 0.04, vol: 0.02 }); a.tone(o, t + 0.04, { wave: a.pulse(0.25), f: NOTE(77), dur: 0.06, vol: 0.02 }); },
  osMin(a, t, o) { a.tone(o, t, { wave: a.pulse(0.125), f: NOTE(81), f2: NOTE(69), dur: 0.08, vol: 0.018 }); },
  osMax(a, t, o) { a.tone(o, t, { wave: a.pulse(0.125), f: NOTE(69), f2: NOTE(81), dur: 0.08, vol: 0.018 }); },
  osMenu(a, t, o) { a.tone(o, t, { wave: a.pulse(0.25), f: NOTE(84), dur: 0.03, vol: 0.016 }); },
  osError(a, t, o) {
    a.tone(o, t, { wave: a.pulse(0.5), f: NOTE(55), dur: 0.22, vol: 0.04 });
    a.tone(o, t, { wave: a.pulse(0.5), f: NOTE(56), dur: 0.22, vol: 0.03 });
    a.tone(o, t + 0.04, { type: 'triangle', f: NOTE(43), dur: 0.2, vol: 0.06 });
  },
  osDing(a, t, o) { a.bell(o, t, NOTE(84), { dur: 0.8, vol: 0.05, partials: [1, 2, 3.01], decays: [1, 0.5, 0.3] }); },
  osQuestion(a, t, o) { a.tone(o, t, { wave: a.pulse(0.25), f: NOTE(76), dur: 0.08, vol: 0.03 }); a.tone(o, t + 0.09, { wave: a.pulse(0.25), f: NOTE(83), dur: 0.14, vol: 0.03 }); },
  osNotify(a, t, o) { a.tone(o, t, { wave: a.pulse(0.125), f: NOTE(91), dur: 0.05, vol: 0.022 }); a.tone(o, t + 0.06, { wave: a.pulse(0.125), f: NOTE(96), dur: 0.12, vol: 0.022 }); },
  osMail(a, t, o) {
    a.bell(o, t, NOTE(88), { dur: 0.6, vol: 0.045, partials: [1, 2.4], decays: [1, 0.4] });
    a.bell(o, t + 0.13, NOTE(93), { dur: 0.9, vol: 0.045, partials: [1, 2.4], decays: [1, 0.4] });
  },
  // the messenger's "uh-oh": two quick rising blips
  osMsg(a, t, o) {
    a.tone(o, t, { wave: a.pulse(0.25), f: NOTE(74), f2: NOTE(79), dur: 0.09, vol: 0.035, glide: 'lin' });
    a.tone(o, t + 0.13, { wave: a.pulse(0.25), f: NOTE(81), f2: NOTE(86), dur: 0.12, vol: 0.035, glide: 'lin' });
  },
  osSend(a, t, o) { a.tone(o, t, { wave: a.pulse(0.125), f: NOTE(86), f2: NOTE(98), dur: 0.07, vol: 0.02, glide: 'lin' }); },
  osTrash(a, t, o) {
    for (let i = 0; i < 9; i++) a.burst(o, t + i * 0.03 + rand(0, 0.015), { dur: 0.04, vol: 0.08, type: 'bandpass', f: rand(1500, 4500), q: 1.5 });
    a.burst(o, t + 0.32, { dur: 0.08, vol: 0.08, type: 'lowpass', f: 600 });
  },
  osCoin(a, t, o) { a.tone(o, t, { type: 'square', f: NOTE(83), dur: 0.06, vol: 0.025 }); a.tone(o, t + 0.07, { type: 'square', f: NOTE(88), dur: 0.22, vol: 0.025 }); },
  osPop(a, t, o) { a.tone(o, t, { wave: a.pulse(0.5), f: NOTE(72), f2: NOTE(96), dur: 0.06, vol: 0.02, glide: 'lin' }); },
  // a cheesy MIDI-ish loop phrase for the silly home pages (call again to loop)
  osMidi(a, t, o) {
    const lead = a.pulse(0.25);
    const mel = [72, 74, 76, 79, 76, 74, 72, 67, 69, 72, 74, 72];
    mel.forEach((n, i) => a.tone(o, t + i * 0.16, { wave: lead, f: NOTE(n), dur: 0.14, vol: 0.022 }));
    [48, 48, 53, 55].forEach((n, i) => a.tone(o, t + i * 0.48, { type: 'triangle', f: NOTE(n), dur: 0.4, vol: 0.05 }));
  },

  // ---------------------------------------------------------------- the desk
  chairScrape(a, t, o) {
    a.burst(o, t, { dur: 0.32, vol: 0.12, type: 'bandpass', f: 380, f2: 620, q: 3, buf: a.pink });
    a.burst(o, t + 0.05, { dur: 0.22, vol: 0.05, type: 'bandpass', f: 1400, f2: 1100, q: 6 });
    a.tone(o, t + 0.02, { type: 'sawtooth', f: 140, f2: 190, dur: 0.24, vol: 0.012, curve: 'lin' });
  },
  chairCreak(a, t, o) {
    a.burst(o, t, { dur: 0.06, vol: 0.18, type: 'lowpass', f: 300, buf: a.brown });
    a.burst(o, t + 0.05, { dur: 0.3, vol: 0.05, type: 'bandpass', f: 900, f2: 700, q: 9 });
    a.tone(o, t + 0.06, { type: 'sawtooth', f: 210, f2: 170, dur: 0.22, vol: 0.008, curve: 'lin' });
  },
  kbdKey(a, t, o, p) {
    const f = p.space ? 1800 : rand(2600, 3600);
    a.burst(o, t, { dur: 0.018, vol: p.space ? 0.09 : 0.07, type: 'bandpass', f, q: 2 });
    a.burst(o, t + 0.022, { dur: 0.02, vol: 0.05, type: 'lowpass', f: p.space ? 500 : 900 });
  },
  mouseClick(a, t, o) {
    a.burst(o, t, { dur: 0.01, vol: 0.09, type: 'highpass', f: 3200 });
    a.burst(o, t + 0.008, { dur: 0.012, vol: 0.04, type: 'bandpass', f: 1600, q: 3 });
  },
  crtOff(a, t, o) {
    a.tone(o, t, { f: 9000, f2: 1200, dur: 0.5, vol: 0.006 });
    a.burst(o, t, { dur: 0.05, vol: 0.2, type: 'lowpass', f: 300 });
    a.tone(o, t, { f: 70, f2: 40, dur: 0.18, vol: 0.12 });
  },
  pcSwitch(a, t, o) {
    a.burst(o, t, { dur: 0.015, vol: 0.25, type: 'highpass', f: 2000 });
    a.tone(o, t, { f: 120, f2: 60, dur: 0.08, vol: 0.15 });
  },
  hddSeek(a, t, o) {
    for (let i = 0; i < 14; i++) a.burst(o, t + i * rand(0.05, 0.12), { dur: 0.012, vol: rand(0.03, 0.07), type: 'bandpass', f: rand(2200, 3800), q: 4 });
    a.tone(o, t, { f: 120, dur: 1.4, vol: 0.006, attack: 0.3, curve: 'lin' });
  },
};

let done = false;
export function registerOSSounds() {
  if (done) return;
  done = true;
  for (const [k, fn] of Object.entries(V)) if (!SOUNDS[k]) SOUNDS[k] = fn;
}

/** Play an OS sound if OS sounds are on (vol scales with the Settings slider). */
export function osSound(game, name, opts = {}) {
  const st = game.state.os;
  if (st && st.sounds === false && !opts.force) return;
  const v = (st?.volume ?? 1) * (opts.vol ?? 1);
  try { audio.play(name, { ...opts, vol: v }); } catch { /* audio not ready */ }
}
