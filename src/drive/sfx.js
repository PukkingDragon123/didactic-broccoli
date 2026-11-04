// Synth sounds for the drive, registered into the audio engine's tables at import time (like src/life/sfx.js), plus a
// small helper for sources that move (the oncoming trucks, the train) and the van's own engine / road / wind bed.
//   one-shots: drvHorn (a tap), drvStart, drvHandbrake, drvShift, drvBump, drvScrape, drvTrainHorn, drvGravel
//   loops:     drvHornLoop, drvBells (level crossing kan-kan), drvFrogs (paddy frogs at dusk), drvRoad, drvWind,
//              drvTrain (wheels on the rails), drvTruck (a kei truck's two-stroke-ish rattle)
//   moving(name, pos, opts) -> { set(vol, t), at(x, y, z), stop() }   a positional loop whose source follows you
import { audio, SOUNDS, LOOPS } from '../core/audio.js';

const rand = (a, b) => a + Math.random() * (b - a);

Object.assign(SOUNDS, {
  /** Turning the key: the starter whirrs, the little three-pot catches. */
  drvStart(a, t, o) {
    a.burst(o, t, { dur: 0.08, vol: 0.12, type: 'bandpass', f: 2600, q: 3 });
    for (let i = 0; i < 6; i++) a.tone(o, t + 0.12 + i * 0.11, { type: 'sawtooth', f: 26 + i * 2, f2: 20, dur: 0.1, vol: 0.06 });
    a.burst(o, t + 0.12, { dur: 0.75, vol: 0.06, type: 'bandpass', f: 900, q: 1.2, buf: a.pink, attack: 0.05 });
    a.tone(o, t + 0.85, { type: 'sawtooth', f: 70, f2: 38, dur: 0.5, vol: 0.12, curve: 'lin', glide: 'lin' });
    a.burst(o, t + 0.85, { dur: 0.4, vol: 0.14, type: 'lowpass', f: 500, f2: 150, buf: a.brown, rate: 2 });
  },
  /** A short toot (the loop below is the held horn). */
  drvHorn(a, t, o) {
    for (const f of [415, 494]) a.tone(o, t, { wave: a.pulse(0.5), f, dur: 0.22, vol: 0.05, attack: 0.01, curve: 'lin' });
  },
  /** The handbrake lever: a ratchet, then the clunk. */
  drvHandbrake(a, t, o) {
    for (let i = 0; i < 5; i++) a.burst(o, t + i * 0.045, { dur: 0.02, vol: 0.12, type: 'bandpass', f: rand(2600, 3200), q: 5 });
    a.tone(o, t + 0.24, { f: 180, f2: 110, dur: 0.09, vol: 0.12 });
  },
  /** A gear change: the clutch, a clack of the column lever. */
  drvShift(a, t, o) {
    a.burst(o, t, { dur: 0.04, vol: 0.06, type: 'bandpass', f: 1300, q: 3 });
    a.tone(o, t + 0.02, { type: 'triangle', f: 240, f2: 160, dur: 0.05, vol: 0.04 });
  },
  /** Bumping a kerb / a fence: a body thud and the moving boxes rattling in the back. p.v 0..1. */
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
  /** Gravel spitting under the tyres (running onto the shoulder). */
  drvGravel(a, t, o) {
    for (let i = 0; i < 7; i++) a.burst(o, t + i * 0.035 + Math.random() * 0.02, { dur: 0.025, vol: 0.06, type: 'bandpass', f: rand(1800, 3600), q: 2 });
  },
  /** The local diesel's horn: two notes, a little sour. */
  drvTrainHorn(a, t, o) {
    for (const [f, d] of [[349, 0], [392, 0.02]]) {
      a.tone(o, t + d, { wave: a.pulse(0.25), f, dur: 0.55, vol: 0.06, attack: 0.03, curve: 'lin' });
      a.tone(o, t + 0.7 + d, { wave: a.pulse(0.25), f, dur: 1.1, vol: 0.06, attack: 0.03, curve: 'lin' });
    }
  },
});

Object.assign(LOOPS, {
  /** The van's horn held down: two square-ish tones, a little tinny. */
  drvHornLoop(a, out) {
    const ctx = a.ctx, oscs = [];
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
    const g = ctx.createGain(); g.gain.value = 0.06;
    for (const f of [415, 494]) { const o = ctx.createOscillator(); o.setPeriodicWave(a.pulse(0.5)); o.frequency.value = f; o.connect(lp); o.start(); oscs.push(o); }
    lp.connect(g).connect(out);
    return { stop: () => oscs.forEach((o) => o.stop()) };
  },
  /** Level-crossing bells: kan, kan, kan, alternating two pitches. */
  drvBells(a, out) {
    const ctx = a.ctx;
    let alive = true, next = ctx.currentTime + 0.05, i = 0;
    const tick = () => {
      if (!alive) return;
      while (next < ctx.currentTime + 0.3) {
        a.bell(out, next, i % 2 ? 755 : 690, { dur: 0.42, vol: 0.09, partials: [1, 2.71, 4.13], decays: [1, 0.45, 0.2] });
        a.tone(out, next, { wave: a.pulse(0.25), f: i % 2 ? 1510 : 1380, dur: 0.05, vol: 0.012 });
        next += 0.42; i++;
      }
      setTimeout(tick, 90);
    };
    tick();
    return { stop: () => { alive = false; } };
  },
  /** Frogs in the flooded paddies: overlapping kero-kero trills, now near, now far. */
  drvFrogs(a, out) {
    const ctx = a.ctx;
    let alive = true, next = ctx.currentTime + 0.1;
    const tick = () => {
      if (!alive) return;
      while (next < ctx.currentTime + 0.5) {
        const f = rand(380, 620), n = 2 + Math.floor(Math.random() * 4), v = rand(0.006, 0.02);
        for (let k = 0; k < n; k++) {
          a.tone(out, next + k * 0.09, { wave: a.pulse(0.125), f: f * rand(0.97, 1.03), f2: f * 0.8, dur: 0.05, vol: v, attack: 0.004 });
          a.burst(out, next + k * 0.09, { dur: 0.04, vol: v * 0.8, type: 'bandpass', f: f * 2.2, q: 6 });
        }
        next += rand(0.05, 0.35);
      }
      setTimeout(tick, 120);
    };
    tick();
    return { stop: () => { alive = false; } };
  },
  /** Tyres on old asphalt (filter follows the speed: handle.filter). */
  drvRoad(a, out) {
    const s = a.ctx.createBufferSource(); s.buffer = a.brown; s.loop = true;
    const bp = a.ctx.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 400; bp.Q.value = 0.7;
    const g = a.ctx.createGain(); g.gain.value = 1.6;
    s.connect(bp).connect(g).connect(out); s.start();
    return { stop: () => s.stop(), filter: bp };
  },
  /** Wind past the open quarter-light. */
  drvWind(a, out) {
    const s = a.ctx.createBufferSource(); s.buffer = a.pink; s.loop = true;
    const bp = a.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.6;
    s.connect(bp).connect(out); s.start();
    return { stop: () => s.stop(), filter: bp };
  },
  /** A two-car diesel: the engine drone and the joints clacking under the wheels. */
  drvTrain(a, out) {
    const ctx = a.ctx;
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 46;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
    const n = ctx.createBufferSource(); n.buffer = a.brown; n.loop = true;
    const ng = ctx.createGain(); ng.gain.value = 0.9;
    o.connect(lp); n.connect(ng).connect(lp); lp.connect(out);
    o.start(); n.start();
    let alive = true, next = ctx.currentTime + 0.1;
    const tick = () => {
      if (!alive) return;
      while (next < ctx.currentTime + 0.3) {
        a.burst(out, next, { dur: 0.035, vol: 0.22, type: 'lowpass', f: 700 });
        a.burst(out, next + 0.1, { dur: 0.035, vol: 0.18, type: 'lowpass', f: 760 });
        next += 0.52;
      }
      setTimeout(tick, 100);
    };
    tick();
    return { stop: () => { alive = false; o.stop(); n.stop(); }, osc: o };
  },
  /** A kei truck's busy little engine. */
  drvTruck(a, out) {
    const ctx = a.ctx;
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 52;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    const n = ctx.createBufferSource(); n.buffer = a.brown; n.loop = true;
    const ng = ctx.createGain(); ng.gain.value = 0.5;
    const amp = ctx.createGain(); amp.gain.value = 0.5;
    o.connect(lp); n.connect(ng).connect(lp); lp.connect(amp).connect(out);
    o.start(); n.start();
    return { stop: () => { o.stop(); n.stop(); }, osc: o };
  },
});

/**
 * A positional loop whose source moves (a PannerNode we own). bus defaults to sfx. Returns null before audio starts.
 *   const h = moving('drvTruck', { ref: 4 }); h.at(x, y, z); h.set(0.6); h.stop();
 */
export function moving(name, { ref = 3, rolloff = 1.2, bus = null } = {}) {
  if (!audio.ready || !LOOPS[name]) return null;
  const ctx = audio.ctx;
  const g = ctx.createGain(); g.gain.value = 0;
  const p = ctx.createPanner();
  p.panningModel = 'equalpower'; p.distanceModel = 'inverse'; p.refDistance = ref; p.rolloffFactor = rolloff; p.maxDistance = 400;
  g.connect(p).connect(bus || audio.sfx);
  let h;
  try { h = LOOPS[name](audio, g, {}); } catch (e) { console.warn('drive sound', name, e); return null; }
  return {
    h, gain: g,
    set(v, time = 0.1) { g.gain.setTargetAtTime(v, ctx.currentTime, time); },
    at(x, y, z) {
      const t = ctx.currentTime;
      if (p.positionX) { p.positionX.setTargetAtTime(x, t, 0.03); p.positionY.setTargetAtTime(y, t, 0.03); p.positionZ.setTargetAtTime(z, t, 0.03); } else p.setPosition(x, y, z);
    },
    stop(fade = 0.25) {
      g.gain.setTargetAtTime(0, ctx.currentTime, fade / 3);
      setTimeout(() => { try { h.stop(); } catch { /* stopped */ } try { g.disconnect(); p.disconnect(); } catch { /* gone */ } }, fade * 1000 + 300);
    },
  };
}
