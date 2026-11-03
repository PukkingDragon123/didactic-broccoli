// Synth sounds for the life features (the van, chores, side jobs, trash, the OPEN sign). Registered into the audio
// engine's tables at import time, so `audio.play('bark')` etc. just work; src/core/audio.js stays untouched.
import { SOUNDS, LOOPS } from '../core/audio.js';

const rand = (a, b) => a + Math.random() * (b - a);

Object.assign(SOUNDS, {
  /** A car door: the latch, the thunk of the panel. p.close: slam. */
  carDoor(a, t, o, p) {
    if (p.close) {
      a.tone(o, t, { f: 110, f2: 55, dur: 0.22, vol: 0.5 });
      a.burst(o, t, { dur: 0.18, vol: 0.4, type: 'lowpass', f: 700, buf: a.pink });
      a.burst(o, t + 0.01, { dur: 0.04, vol: 0.18, type: 'highpass', f: 2500 });
    } else {
      a.burst(o, t, { dur: 0.05, vol: 0.2, type: 'bandpass', f: 1800, q: 3 });
      a.tone(o, t + 0.04, { f: 180, f2: 120, dur: 0.12, vol: 0.18 });
      a.burst(o, t + 0.08, { dur: 0.3, vol: 0.06, type: 'bandpass', f: 600, q: 1, buf: a.pink });
    }
  },
  /** Engine cut: a last cough and the rattle dying. */
  engineOff(a, t, o) {
    a.tone(o, t, { type: 'sawtooth', f: 52, f2: 18, dur: 0.7, vol: 0.12, curve: 'lin', glide: 'lin' });
    a.burst(o, t, { dur: 0.5, vol: 0.12, type: 'lowpass', f: 300, f2: 80, buf: a.brown, rate: 2 });
  },
  /** The hot engine block ticking as it cools. */
  engineTick(a, t, o) {
    a.tone(o, t, { type: 'triangle', f: rand(2600, 3400), dur: 0.035, vol: 0.05 });
    a.burst(o, t, { dur: 0.012, vol: 0.06, type: 'highpass', f: 5000 });
  },
  /** The old main breaker clunking over, then the building waking up. */
  breaker(a, t, o) {
    a.burst(o, t, { dur: 0.06, vol: 0.5, type: 'lowpass', f: 1500 });
    a.tone(o, t, { f: 140, f2: 70, dur: 0.15, vol: 0.4 });
    a.tone(o, t + 0.12, { type: 'sawtooth', f: 50, dur: 0.9, vol: 0.03, attack: 0.3, curve: 'lin' });
    a.tone(o, t + 0.12, { type: 'triangle', f: 100, dur: 0.9, vol: 0.03, attack: 0.3, curve: 'lin' });
  },
  /** An aluminium sash rolling in its track. */
  windowSlide(a, t, o) {
    a.burst(o, t, { dur: 0.55, vol: 0.14, type: 'bandpass', f: 900, f2: 1300, q: 2, buf: a.pink, attack: 0.05 });
    for (let i = 0; i < 6; i++) a.burst(o, t + 0.05 + i * 0.08, { dur: 0.03, vol: 0.05, type: 'bandpass', f: rand(2000, 3000), q: 4 });
    a.tone(o, t + 0.55, { f: 300, f2: 180, dur: 0.08, vol: 0.12 });
  },
  /** A cloth swish across a surface. */
  wipe(a, t, o) {
    a.burst(o, t, { dur: 0.22, vol: 0.12, type: 'bandpass', f: rand(1400, 2000), f2: rand(2600, 3200), q: 0.9, attack: 0.04, buf: a.pink });
  },
  /** Water splashing out of a wrung cloth / a ladle. */
  splash(a, t, o, p) {
    const v = p.v ?? 1;
    a.burst(o, t, { dur: 0.4, vol: 0.18 * v, type: 'bandpass', f: 1800, f2: 700, q: 0.7, attack: 0.01 });
    for (let i = 0; i < 5; i++) a.tone(o, t + 0.05 + Math.random() * 0.25, { type: 'sine', f: rand(700, 1500), f2: rand(1600, 2400), dur: 0.05, vol: 0.03 * v });
  },
  /** Tap water into a bucket / onto a rag. */
  tap(a, t, o) {
    a.burst(o, t, { dur: 0.9, vol: 0.08, type: 'bandpass', f: 1600, q: 1.2, attack: 0.08, buf: a.pink });
    for (let i = 0; i < 8; i++) a.tone(o, t + i * 0.1 + Math.random() * 0.05, { f: rand(900, 1700), dur: 0.04, vol: 0.02 });
  },
  /** Plastic bag rustle (bagging, tying the knot). */
  bagRustle(a, t, o) {
    for (let i = 0; i < 7; i++) a.burst(o, t + i * 0.05 + Math.random() * 0.03, { dur: 0.06, vol: 0.09, type: 'highpass', f: rand(2500, 5000), q: 0.8 });
  },
  /** Scissors through a packing strap. */
  snip(a, t, o) {
    a.burst(o, t, { dur: 0.03, vol: 0.25, type: 'highpass', f: 4000 });
    a.tone(o, t, { type: 'triangle', f: 2200, f2: 1400, dur: 0.06, vol: 0.06 });
    a.burst(o, t + 0.04, { dur: 0.08, vol: 0.08, type: 'bandpass', f: 1200, q: 2 });
  },
  /** A plug pushed home and a little electric buzz. */
  plugIn(a, t, o) {
    a.burst(o, t, { dur: 0.04, vol: 0.3, type: 'lowpass', f: 2200 });
    a.tone(o, t + 0.05, { type: 'sawtooth', f: 100, dur: 0.35, vol: 0.025, attack: 0.05, curve: 'lin' });
  },
  /** A small dog's bark (Pochi). p.pitch shifts it. */
  bark(a, t, o, p) {
    const k = p.pitch ?? 1;
    a.tone(o, t, { wave: a.pulse(0.25), f: 620 * k, f2: 340 * k, dur: 0.11, vol: 0.13 });
    a.burst(o, t, { dur: 0.09, vol: 0.12, type: 'bandpass', f: 1100 * k, q: 1.5 });
    if (p.double !== false) {
      a.tone(o, t + 0.16, { wave: a.pulse(0.25), f: 680 * k, f2: 360 * k, dur: 0.1, vol: 0.12 });
      a.burst(o, t + 0.16, { dur: 0.08, vol: 0.1, type: 'bandpass', f: 1200 * k, q: 1.5 });
    }
  },
  /** A thin happy whine / a sniff. */
  whine(a, t, o) { a.tone(o, t, { wave: a.pulse(0.125), f: 900, f2: 1400, dur: 0.3, vol: 0.05, glide: 'lin' }); },
  sniff(a, t, o) { for (let i = 0; i < 3; i++) a.burst(o, t + i * 0.09, { dur: 0.05, vol: 0.07, type: 'bandpass', f: 2600, q: 2, buf: a.pink }); },
  /** A soft plop. */
  plop(a, t, o) { a.tone(o, t, { f: 260, f2: 90, dur: 0.12, vol: 0.18 }); a.burst(o, t, { dur: 0.06, vol: 0.06, type: 'lowpass', f: 600 }); },
  /** Rubber squeegee squeak across glass. */
  squeegee(a, t, o) {
    a.tone(o, t, { type: 'square', f: rand(820, 1000), f2: rand(1100, 1300), dur: 0.16, vol: 0.022, glide: 'lin' });
    a.burst(o, t, { dur: 0.16, vol: 0.05, type: 'bandpass', f: 2400, q: 3 });
  },
  /** Spray bottle: psst. */
  spray(a, t, o) { a.burst(o, t, { dur: 0.22, vol: 0.16, type: 'highpass', f: 3200, attack: 0.01 }); },
  /** Sponge scrubbing (wet). */
  scrub(a, t, o) {
    a.burst(o, t, { dur: 0.16, vol: 0.12, type: 'bandpass', f: rand(700, 1100), q: 1.4, buf: a.pink, attack: 0.02 });
    a.tone(o, t + 0.04, { f: rand(1800, 2600), dur: 0.03, vol: 0.015 });
  },
  /** The OPEN sign flipping on its cord: a wooden clack. */
  signFlip(a, t, o) {
    a.burst(o, t, { dur: 0.05, vol: 0.3, type: 'bandpass', f: 900, q: 2 });
    a.tone(o, t, { type: 'triangle', f: 520, f2: 380, dur: 0.08, vol: 0.12 });
    a.burst(o, t + 0.12, { dur: 0.03, vol: 0.12, type: 'bandpass', f: 1100, q: 2 });
  },
  /** Tape peeled off (the envelope on the shutter). */
  tape(a, t, o) { a.burst(o, t, { dur: 0.35, vol: 0.1, type: 'bandpass', f: 2600, f2: 1400, q: 1.2 }); },
  /** The garbage truck's packer blade (hydraulics + crunch). */
  packer(a, t, o) {
    a.tone(o, t, { type: 'sawtooth', f: 70, f2: 95, dur: 2.2, vol: 0.05, curve: 'lin', glide: 'lin', attack: 0.2 });
    a.burst(o, t, { dur: 2.2, vol: 0.06, type: 'bandpass', f: 500, q: 1, buf: a.brown, rate: 3, attack: 0.3 });
    for (let i = 0; i < 6; i++) a.burst(o, t + 0.8 + i * 0.18, { dur: 0.08, vol: 0.1, type: 'lowpass', f: 800 });
  },
  /** Air brakes hiss. */
  airBrake(a, t, o) { a.burst(o, t, { dur: 0.6, vol: 0.16, type: 'highpass', f: 2200, f2: 4000, attack: 0.02 }); },
  /** Coins poured into a tray. */
  coinPour(a, t, o) {
    for (let i = 0; i < 14; i++) a.tone(o, t + i * 0.045 + Math.random() * 0.02, { type: 'triangle', f: rand(2400, 4200), dur: 0.08, vol: 0.03 });
  },
});

Object.assign(LOOPS, {
  /** A small kei-van engine: a lumpy low sawtooth through a lowpass (handle.osc.frequency follows the revs). */
  vanEngine(a, out) {
    const ctx = a.ctx;
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 38;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; lp.Q.value = 2;
    const n = ctx.createBufferSource(); n.buffer = a.brown; n.loop = true;
    const ng = ctx.createGain(); ng.gain.value = 0.5;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 9;
    const lg = ctx.createGain(); lg.gain.value = 0.25;
    const amp = ctx.createGain(); amp.gain.value = 0.7;
    lfo.connect(lg).connect(amp.gain);
    o.connect(lp); n.connect(ng).connect(lp);
    lp.connect(amp).connect(out);
    o.start(); n.start(); lfo.start();
    return { stop: () => { o.stop(); n.stop(); lfo.stop(); }, osc: o, filter: lp };
  },
  /** The garbage truck's jingle, an original little 8-bit melody on loop (Japanese trucks play one as they go). */
  truckTune(a, out) {
    const ctx = a.ctx;
    const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
    const mel = [72, 74, 76, 79, 76, 74, 72, 67, 69, 72, 74, 72, 0, 76, 74, 72];
    const step = 0.26;
    let alive = true, next = ctx.currentTime + 0.05, i = 0;
    const g = ctx.createGain(); g.gain.value = 1; g.connect(out);
    const tick = () => {
      if (!alive) return;
      while (next < ctx.currentTime + 0.4) {
        const n = mel[i % mel.length];
        if (n) a.tone(g, next, { wave: a.pulse(0.25), f: NOTE(n), dur: step * 0.9, vol: 0.05, attack: 0.005 });
        if (i % 4 === 0) a.tone(g, next, { type: 'triangle', f: NOTE(48 + (i % 8 ? 7 : 0)), dur: step * 1.8, vol: 0.05 });
        next += step; i++;
      }
      setTimeout(tick, 120);
    };
    tick();
    return { stop: () => { alive = false; g.disconnect(); } };
  },
  /** A diesel truck idling. */
  diesel(a, out) {
    const ctx = a.ctx;
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 30;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
    const n = ctx.createBufferSource(); n.buffer = a.brown; n.loop = true;
    const ng = ctx.createGain(); ng.gain.value = 0.6;
    o.connect(lp); n.connect(ng).connect(lp); lp.connect(out);
    o.start(); n.start();
    return { stop: () => { o.stop(); n.stop(); }, osc: o };
  },
});
