// Synth sounds for money and shop furniture: banknotes, the ATM (beeps, card reader, note counter, receipt
// printer), the piggy bank, the tip jar, the gumball machine, the counter bell, the fan, the robot vacuum.
import { SOUNDS, LOOPS } from '../core/audio.js';

const rand = (a, b) => a + Math.random() * (b - a);
const N = (n) => 440 * Math.pow(2, (n - 69) / 12);

Object.assign(SOUNDS, {
  // ---------------------------------------------------------------- cash
  notePaper(a, t, o) {
    a.burst(o, t, { dur: 0.14, vol: 0.16, type: 'bandpass', f: 2200, f2: 4200, q: 0.8, buf: a.pink });
    a.burst(o, t + 0.06, { dur: 0.05, vol: 0.08, type: 'highpass', f: 3800 });
  },
  noteFlick(a, t, o, p) {
    const k = p.pitch || 1;
    a.burst(o, t, { dur: 0.035, vol: 0.2, type: 'highpass', f: 3000 * k });
    a.burst(o, t + 0.01, { dur: 0.06, vol: 0.1, type: 'bandpass', f: 1800 * k, q: 1.5, buf: a.pink });
  },
  walletSnap(a, t, o) {
    a.burst(o, t, { dur: 0.08, vol: 0.18, type: 'lowpass', f: 700, buf: a.brown });
    a.burst(o, t + 0.09, { dur: 0.02, vol: 0.25, type: 'highpass', f: 2500 });
    a.tone(o, t + 0.09, { f: 900, f2: 500, dur: 0.04, vol: 0.05, type: 'square' });
  },
  // ---------------------------------------------------------------- the ATM
  atmBeep(a, t, o, p) { a.tone(o, t, { type: 'square', f: p.f || 1480, dur: p.dur || 0.09, vol: 0.035 }); },
  atmKey(a, t, o) {
    a.burst(o, t, { dur: 0.012, vol: 0.22, type: 'highpass', f: 2800 });
    a.tone(o, t + 0.005, { type: 'square', f: 1760, dur: 0.06, vol: 0.03 });
  },
  atmError(a, t, o) {
    a.tone(o, t, { type: 'square', f: 392, dur: 0.14, vol: 0.04 });
    a.tone(o, t + 0.17, { type: 'square', f: 330, dur: 0.22, vol: 0.04 });
  },
  atmOk(a, t, o) {
    a.tone(o, t, { type: 'square', f: N(84), dur: 0.08, vol: 0.03 });
    a.tone(o, t + 0.09, { type: 'square', f: N(88), dur: 0.08, vol: 0.03 });
    a.tone(o, t + 0.18, { type: 'square', f: N(91), dur: 0.16, vol: 0.03 });
  },
  cardIn(a, t, o) {
    a.burst(o, t, { dur: 0.12, vol: 0.14, type: 'bandpass', f: 1200, f2: 700, q: 2 });
    a.tone(o, t + 0.1, { type: 'sawtooth', f: 160, f2: 210, dur: 0.35, vol: 0.03 });
    a.burst(o, t + 0.46, { dur: 0.03, vol: 0.22, type: 'lowpass', f: 1100 });
  },
  cardOut(a, t, o) {
    a.tone(o, t, { type: 'sawtooth', f: 210, f2: 160, dur: 0.32, vol: 0.03 });
    a.burst(o, t + 0.3, { dur: 0.1, vol: 0.12, type: 'bandpass', f: 900, f2: 1500, q: 2 });
  },
  atmWhirr(a, t, o, p) {
    const n = p.n || 10;
    a.tone(o, t, { type: 'sawtooth', f: 90, f2: 120, dur: 0.25 + n * 0.08, vol: 0.025, curve: 'lin' });
    for (let i = 0; i < n; i++) a.burst(o, t + 0.12 + i * 0.075 + rand(0, 0.01), { dur: 0.03, vol: 0.13, type: 'bandpass', f: 2600, q: 3, buf: a.pink });
  },
  atmShutter(a, t, o, p) {
    a.tone(o, t, { type: 'sawtooth', f: p.open ? 140 : 180, f2: p.open ? 190 : 120, dur: 0.3, vol: 0.03 });
    a.burst(o, t + 0.28, { dur: 0.05, vol: 0.2, type: 'lowpass', f: 800 });
  },
  receiptPrint(a, t, o) {
    for (let i = 0; i < 16; i++) a.burst(o, t + i * 0.055, { dur: 0.045, vol: 0.09, type: 'bandpass', f: 3400 + (i % 3) * 300, q: 4 });
    a.tone(o, t, { type: 'square', f: 70, dur: 0.95, vol: 0.012, curve: 'lin' });
    a.burst(o, t + 0.95, { dur: 0.03, vol: 0.18, type: 'highpass', f: 2200 });
  },
  // ---------------------------------------------------------------- piggy bank, tip jar, register
  piggyCoin(a, t, o) {
    const f = rand(2300, 2900);
    [1, 2.4, 4.1].forEach((q, i) => a.tone(o, t, { f: f * q, dur: 0.14 / (i + 1), vol: 0.07 / (i + 1) }));
    a.tone(o, t + 0.05, { f: 420, f2: 360, dur: 0.22, vol: 0.06 }); // the hollow belly
  },
  piggyShake(a, t, o) {
    for (let i = 0; i < 10; i++) { const tt = t + rand(0, 0.45); a.tone(o, tt, { f: rand(2200, 3400), dur: 0.05, vol: 0.04 }); a.burst(o, tt, { dur: 0.02, vol: 0.05, type: 'highpass', f: 2000 }); }
    a.tone(o, t, { f: 380, f2: 330, dur: 0.4, vol: 0.03 });
  },
  jarCoin(a, t, o) {
    const f = rand(3000, 3800);
    [1, 2.2, 3.9].forEach((q, i) => a.tone(o, t, { f: f * q, dur: 0.18 / (i + 1), vol: 0.06 / (i + 1) }));
    a.tone(o, t + 0.04, { f: f * 1.5, dur: 0.06, vol: 0.02 });
  },
  registerDrawer(a, t, o) {
    a.bell(o, t, 1980, { dur: 0.9, vol: 0.12 });
    a.burst(o, t + 0.05, { dur: 0.18, vol: 0.14, type: 'bandpass', f: 600, f2: 400, q: 2, buf: a.brown });
    a.burst(o, t + 0.24, { dur: 0.04, vol: 0.2, type: 'lowpass', f: 900 });
  },
  // ---------------------------------------------------------------- furniture
  bellDing(a, t, o) { a.bell(o, t, rand(2560, 2640), { dur: 1.6, vol: 0.18, partials: [1, 2.32, 3.81, 5.4], decays: [1, 0.6, 0.4, 0.25] }); },
  gumballCrank(a, t, o) {
    for (let i = 0; i < 5; i++) { a.burst(o, t + i * 0.09, { dur: 0.025, vol: 0.2, type: 'highpass', f: 1900 }); a.tone(o, t + i * 0.09, { f: 700, dur: 0.03, vol: 0.03, type: 'square' }); }
  },
  gumballRoll(a, t, o) {
    a.burst(o, t, { dur: 0.5, vol: 0.08, type: 'bandpass', f: 700, f2: 1100, q: 3, buf: a.brown, rate: 2 });
    a.tone(o, t + 0.5, { f: 1200, dur: 0.06, vol: 0.06 });
    a.burst(o, t + 0.5, { dur: 0.03, vol: 0.15, type: 'lowpass', f: 1500 });
  },
  chew(a, t, o) { for (let i = 0; i < 4; i++) a.burst(o, t + i * 0.22, { dur: 0.12, vol: 0.09, type: 'lowpass', f: 500, buf: a.brown }); },
  bubblePop(a, t, o) { a.tone(o, t, { f: 600, f2: 1400, dur: 0.05, vol: 0.12 }); a.burst(o, t, { dur: 0.04, vol: 0.2, type: 'highpass', f: 1500 }); },
  rugShake(a, t, o) { for (let i = 0; i < 3; i++) a.burst(o, t + i * 0.2, { dur: 0.15, vol: 0.2, type: 'lowpass', f: 600, f2: 300, buf: a.pink }); },
  leafRustle(a, t, o) { a.burst(o, t, { dur: 0.35, vol: 0.12, type: 'bandpass', f: 3000, f2: 5000, q: 0.7, buf: a.pink }); },
  clockChime(a, t, o, p) { const n = p.n || 1; for (let i = 0; i < n; i++) a.bell(o, t + i * 1.1, 523, { dur: 1.8, vol: 0.1 }); },
  clockTock(a, t, o) { a.burst(o, t, { dur: 0.02, vol: 0.12, type: 'bandpass', f: 1800, q: 4 }); a.burst(o, t + 0.5, { dur: 0.02, vol: 0.1, type: 'bandpass', f: 1400, q: 4 }); },
  switchClick(a, t, o) { a.burst(o, t, { dur: 0.015, vol: 0.3, type: 'highpass', f: 2400 }); a.tone(o, t, { f: 300, f2: 120, dur: 0.05, vol: 0.06 }); },
  tvOn(a, t, o) { a.tone(o, t, { f: 15600, dur: 0.6, vol: 0.006 }); a.burst(o, t, { dur: 0.25, vol: 0.12, type: 'highpass', f: 1500 }); a.burst(o, t + 0.02, { dur: 0.06, vol: 0.2, type: 'lowpass', f: 300, buf: a.brown }); },
  tvChannel(a, t, o) { a.burst(o, t, { dur: 0.18, vol: 0.12, type: 'highpass', f: 1200 }); a.burst(o, t, { dur: 0.02, vol: 0.2, type: 'lowpass', f: 900 }); },
  boxPack(a, t, o) {
    a.burst(o, t, { dur: 0.12, vol: 0.2, type: 'lowpass', f: 900, buf: a.pink });
    a.burst(o, t + 0.14, { dur: 0.3, vol: 0.18, type: 'bandpass', f: 1400, f2: 3600, q: 0.9 }); // tape
  },
  marker(a, t, o) { for (let i = 0; i < 5; i++) a.burst(o, t + i * 0.08 + rand(0, 0.03), { dur: 0.06, vol: 0.06, type: 'bandpass', f: 2600, q: 2, buf: a.pink }); },
  // ---------------------------------------------------------------- the robot vacuum
  vacStart(a, t, o) { [76, 81, 84, 88].forEach((n, i) => a.tone(o, t + i * 0.1, { type: 'square', f: N(n), dur: 0.09, vol: 0.03 })); },
  vacDone(a, t, o) { [88, 84, 81, 88, 93].forEach((n, i) => a.tone(o, t + i * 0.11, { type: 'square', f: N(n), dur: 0.1, vol: 0.03 })); },
  vacBump(a, t, o) { a.burst(o, t, { dur: 0.05, vol: 0.25, type: 'lowpass', f: 500 }); a.tone(o, t, { f: 140, f2: 90, dur: 0.07, vol: 0.12 }); },
  vacSuck(a, t, o) { a.burst(o, t, { dur: 0.25, vol: 0.12, type: 'bandpass', f: 900, f2: 2400, q: 1.5 }); a.tone(o, t + 0.2, { f: 1800, dur: 0.04, vol: 0.03 }); },
  vacStuck(a, t, o) { for (let i = 0; i < 3; i++) a.tone(o, t + i * 0.25, { type: 'square', f: 880, dur: 0.12, vol: 0.03 }); },
});

Object.assign(LOOPS, {
  /** The vacuum's motor and brushes. */
  vacMotor(a, out) {
    const s = a.ctx.createBufferSource(); s.buffer = a.pink; s.loop = true;
    const bp = a.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 0.8;
    const o = a.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 180;
    const og = a.ctx.createGain(); og.gain.value = 0.15;
    const lp = a.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
    s.connect(bp).connect(out); o.connect(lp).connect(og).connect(out);
    s.start(); o.start();
    return { stop: () => { s.stop(); o.stop(); } };
  },
  /** An electric fan humming. */
  fanHum(a, out) {
    const s = a.ctx.createBufferSource(); s.buffer = a.pink; s.loop = true;
    const lp = a.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
    const o = a.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 100;
    const og = a.ctx.createGain(); og.gain.value = 0.25;
    s.connect(lp).connect(out); o.connect(og).connect(out);
    s.start(); o.start();
    return { stop: () => { s.stop(); o.stop(); } };
  },
});
