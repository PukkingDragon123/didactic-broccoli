// Synth sounds for the drive, registered into the audio engine's tables at import time (like src/life/sfx.js).
//   one-shots: drvHorn (a tap), drvHandbrake (the lever's ratchet and clunk), drvShift (clutch and column lever),
//              drvBump (body thud, boxes rattling in the back), drvScrape
//   loops (audio.loop(name) -> handle; handle.synth.tune(...) steers it):
//     drvEngine   the little three-pot: lumpy idle, revs, intake roar with the throttle   tune(rpm, throttle)
//     drvWhine    first gear / reverse whine, rising with road speed                      tune(freq, level)
//     drvCrunch   tyres crunching grit on the old lane asphalt                              tune(grainsPerSecond)
//     drvRoad     tyres rolling (handle.filter follows the speed)
//     drvHornLoop the horn held down
import { SOUNDS, LOOPS } from '../core/audio.js';

const rand = (a, b) => a + Math.random() * (b - a);

Object.assign(SOUNDS, {
  /** A short toot (the loop below is the held horn). */
  drvHorn(a, t, o) {
    for (const f of [415, 494]) a.tone(o, t, { wave: a.pulse(0.5), f, dur: 0.22, vol: 0.05, attack: 0.01, curve: 'lin' });
  },
  /** The handbrake lever: a ratchet, then the clunk. */
  drvHandbrake(a, t, o) {
    for (let i = 0; i < 6; i++) a.burst(o, t + i * 0.042, { dur: 0.02, vol: 0.12, type: 'bandpass', f: rand(2600, 3200), q: 5 });
    a.tone(o, t + 0.27, { f: 180, f2: 110, dur: 0.09, vol: 0.12 });
  },
  /** A gear change: the clutch, a clack of the column lever. */
  drvShift(a, t, o) {
    a.burst(o, t, { dur: 0.04, vol: 0.06, type: 'bandpass', f: 1300, q: 3 });
    a.tone(o, t + 0.02, { type: 'triangle', f: 240, f2: 160, dur: 0.05, vol: 0.04 });
  },
  /** Bumping a kerb / a wall: a body thud and the moving boxes rattling in the back. p.v 0..1. */
  drvBump(a, t, o, p) {
    const v = p.v ?? 1;
    a.tone(o, t, { f: 95, f2: 45, dur: 0.25, vol: 0.4 * v });
    a.burst(o, t, { dur: 0.2, vol: 0.3 * v, type: 'lowpass', f: 600, buf: a.pink });
    for (let i = 0; i < 4; i++) a.burst(o, t + 0.06 + i * 0.05 + Math.random() * 0.03, { dur: 0.05, vol: 0.08 * v, type: 'bandpass', f: rand(500, 900), q: 2 });
  },
  /** Scraping along something. */
  drvScrape(a, t, o, p) {
    const v = p.v ?? 1;
    a.burst(o, t, { dur: 0.3, vol: 0.08 * v, type: 'bandpass', f: rand(1400, 2200), f2: rand(900, 1300), q: 2.5, buf: a.pink });
  },
});

Object.assign(LOOPS, {
  /**
   * A 660 cc three-cylinder: firing pulses at 1.5x the crank speed through a lowpass, one cylinder a little weak (the
   * lope at idle), a second harmonic for body, intake / exhaust roar that opens up with the throttle.
   */
  drvEngine(a, out) {
    const ctx = a.ctx, now = ctx.currentTime;
    const amp = ctx.createGain(); amp.gain.value = 0.75;
    const lope = ctx.createOscillator(); lope.frequency.value = 14;
    const lopeG = ctx.createGain(); lopeG.gain.value = 0.22;
    lope.connect(lopeG).connect(amp.gain);
    const fire = ctx.createOscillator(); fire.type = 'sawtooth'; fire.frequency.value = 21;
    const body = ctx.createOscillator(); body.type = 'square'; body.frequency.value = 42;
    const bodyG = ctx.createGain(); bodyG.gain.value = 0.12;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220; lp.Q.value = 1.6;
    fire.connect(lp); body.connect(bodyG).connect(lp);
    const n = ctx.createBufferSource(); n.buffer = a.brown; n.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 200; bp.Q.value = 0.9;
    const nG = ctx.createGain(); nG.gain.value = 0.25;
    n.connect(bp).connect(nG).connect(lp);
    lp.connect(amp).connect(out);
    for (const s of [lope, fire, body, n]) s.start(now);
    return {
      tune(rpm, thr = 0) {
        const t = ctx.currentTime, ff = (rpm / 60) * 1.5;
        fire.frequency.setTargetAtTime(ff, t, 0.05);
        body.frequency.setTargetAtTime(ff * 2, t, 0.05);
        lope.frequency.setTargetAtTime(rpm / 60, t, 0.05);
        lopeG.gain.setTargetAtTime(0.22 * Math.max(0.15, 1 - (rpm - 850) / 1800), t, 0.1);
        lp.frequency.setTargetAtTime(170 + ff * 3.2 + thr * 420, t, 0.06);
        bp.frequency.setTargetAtTime(160 + rpm * 0.07, t, 0.06);
        nG.gain.setTargetAtTime(0.18 + thr * 0.5, t, 0.08);
      },
      stop: () => { for (const s of [lope, fire, body, n]) s.stop(); },
    };
  },
  /** Straight-cut gear whine (first and reverse): a thin tone that climbs with the road speed. */
  drvWhine(a, out) {
    const ctx = a.ctx;
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 300;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 600;
    const g = ctx.createGain(); g.gain.value = 0;
    const g2 = ctx.createGain(); g2.gain.value = 0.35;
    o.connect(g); o2.connect(g2).connect(g); g.connect(out);
    o.start(); o2.start();
    return {
      tune(f, level) { const t = ctx.currentTime; o.frequency.setTargetAtTime(f, t, 0.05); o2.frequency.setTargetAtTime(f * 2.01, t, 0.05); g.gain.setTargetAtTime(level, t, 0.08); },
      stop: () => { o.stop(); o2.stop(); },
    };
  },
  /** Tyres crunching grit and the odd pebble on the old lane: little high clicks, as many as the wheels turn up. */
  drvCrunch(a, out) {
    const ctx = a.ctx;
    let alive = true, rate = 0, next = ctx.currentTime + 0.05;
    const tick = () => {
      if (!alive) return;
      if (rate < 0.5) next = Math.max(next, ctx.currentTime + 0.05);
      while (rate >= 0.5 && next < ctx.currentTime + 0.25) {
        const v = rand(0.02, 0.06);
        a.burst(out, next, { dur: rand(0.008, 0.02), vol: v, type: 'bandpass', f: rand(2200, 5200), q: rand(2, 5) });
        if (Math.random() < 0.08) a.tone(out, next, { type: 'triangle', f: rand(1800, 2600), f2: rand(900, 1200), dur: 0.03, vol: 0.02 });
        next += rand(0.3, 1.7) / rate;
      }
      setTimeout(tick, 60);
    };
    tick();
    return { tune(r) { rate = r; }, stop: () => { alive = false; } };
  },
  /** Tyres rolling on the asphalt (handle.filter follows the speed). */
  drvRoad(a, out) {
    const s = a.ctx.createBufferSource(); s.buffer = a.brown; s.loop = true;
    const bp = a.ctx.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 400; bp.Q.value = 0.7;
    const g = a.ctx.createGain(); g.gain.value = 1.6;
    s.connect(bp).connect(g).connect(out); s.start();
    return { stop: () => s.stop(), filter: bp };
  },
  /** The van's horn held down: two square-ish tones, a little tinny. */
  drvHornLoop(a, out) {
    const ctx = a.ctx, oscs = [];
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
    const g = ctx.createGain(); g.gain.value = 0.06;
    for (const f of [415, 494]) { const o = ctx.createOscillator(); o.setPeriodicWave(a.pulse(0.5)); o.frequency.value = f; o.connect(lp); o.start(); oscs.push(o); }
    lp.connect(g).connect(out);
    return { stop: () => oscs.forEach((o) => o.stop()) };
  },
});
