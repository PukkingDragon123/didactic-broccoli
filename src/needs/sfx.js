// Synth sounds for eating, drinking, sleeping and the places you go (vending machines, the ramen shop, Mikawa-ya's
// register, the old man's cigar, pigeons). Registered into the audio engine's tables at import time.
import { SOUNDS } from '../core/audio.js';

const rand = (a, b) => a + Math.random() * (b - a);

Object.assign(SOUNDS, {
  /** One swallow: a low throat thump with a wet click. */
  gulp(a, t, o, p) {
    const v = p.v ?? 1;
    a.tone(o, t, { f: rand(150, 190), f2: 70, dur: 0.16, vol: 0.22 * v });
    a.burst(o, t + 0.02, { dur: 0.07, vol: 0.12 * v, type: 'bandpass', f: 900, f2: 400, q: 2 });
    a.tone(o, t + 0.1, { type: 'triangle', f: 420, f2: 260, dur: 0.05, vol: 0.05 * v });
  },
  /** Noodles going in: a rising airy slurp. */
  slurp(a, t, o, p) {
    const d = p.dur ?? 0.7;
    a.burst(o, t, { dur: d, vol: 0.18, type: 'bandpass', f: 700, f2: 2600, q: 1.5, attack: 0.08 });
    a.burst(o, t + d * 0.3, { dur: d * 0.6, vol: 0.08, type: 'highpass', f: 3000, attack: 0.05 });
    for (let i = 0; i < 4; i++) a.tone(o, t + i * d / 4, { type: 'triangle', f: rand(500, 900), f2: rand(900, 1400), dur: 0.05, vol: 0.03 });
  },
  /** A soft bite into bread / rice. */
  bite(a, t, o) {
    a.burst(o, t, { dur: 0.09, vol: 0.18, type: 'lowpass', f: 1400, f2: 500, q: 1 });
    a.burst(o, t + 0.05, { dur: 0.05, vol: 0.06, type: 'bandpass', f: 2500, q: 2 });
  },
  /** Chewing with the mouth closed. */
  munch(a, t, o) { for (let i = 0; i < 3; i++) a.burst(o, t + i * 0.18, { dur: 0.08, vol: 0.07, type: 'lowpass', f: 700, f2: 300, buf: a.pink }); },
  /** The ring pull: a click and a hiss. */
  canOpen(a, t, o) {
    a.burst(o, t, { dur: 0.02, vol: 0.3, type: 'highpass', f: 3500 });
    a.burst(o, t + 0.015, { dur: 0.35, vol: 0.22, type: 'highpass', f: 5000, f2: 2500, attack: 0.005 });
    a.tone(o, t, { type: 'square', f: 1800, f2: 900, dur: 0.02, vol: 0.04 });
  },
  /** A can or bottle dropping down the chute into the tray. */
  vendDrop(a, t, o) {
    a.burst(o, t, { dur: 0.12, vol: 0.15, type: 'bandpass', f: 1200, q: 2 });
    a.tone(o, t + 0.25, { f: 120, f2: 60, dur: 0.25, vol: 0.45 });
    a.burst(o, t + 0.25, { dur: 0.15, vol: 0.35, type: 'lowpass', f: 900, buf: a.pink });
    a.bell(o, t + 0.26, 980, { dur: 0.35, vol: 0.06, partials: [1, 2.7, 4.1], decays: [1, 0.5, 0.3] });
    a.tone(o, t + 0.45, { f: 160, f2: 90, dur: 0.1, vol: 0.12 });
  },
  /** A machine's push button. */
  vendBeep(a, t, o, p) { a.tone(o, t, { type: 'square', f: p.f ?? 1568, dur: 0.06, vol: 0.05, curve: 'lin' }); },
  /** Sold out / not enough money. */
  vendNo(a, t, o) { a.tone(o, t, { type: 'square', f: 330, dur: 0.12, vol: 0.05, curve: 'lin' }); a.tone(o, t + 0.14, { type: 'square', f: 247, dur: 0.18, vol: 0.05, curve: 'lin' }); },
  /** A big jaw-cracking yawn (your own voice: a glide with a breathy top). */
  yawn(a, t, o) {
    a.tone(o, t, { type: 'sawtooth', f: 180, f2: 260, dur: 0.6, vol: 0.05, attack: 0.15, glide: 'lin', curve: 'lin' });
    a.tone(o, t + 0.55, { type: 'sawtooth', f: 260, f2: 120, dur: 0.9, vol: 0.05, glide: 'lin' });
    a.burst(o, t, { dur: 1.4, vol: 0.06, type: 'bandpass', f: 800, f2: 400, q: 1, attack: 0.3, buf: a.pink });
  },
  hiccup(a, t, o) { a.tone(o, t, { type: 'triangle', f: 380, f2: 720, dur: 0.07, vol: 0.12 }); a.burst(o, t, { dur: 0.04, vol: 0.06, type: 'bandpass', f: 1400 }); },
  burp(a, t, o) { a.tone(o, t, { type: 'sawtooth', f: 95, f2: 70, dur: 0.35, vol: 0.08, attack: 0.03 }); a.burst(o, t, { dur: 0.3, vol: 0.05, type: 'lowpass', f: 400, buf: a.brown }); },
  /** A heavy sigh while you sit down to rest. */
  sigh(a, t, o) { a.burst(o, t, { dur: 0.9, vol: 0.08, type: 'bandpass', f: 900, f2: 350, q: 0.8, attack: 0.2, buf: a.pink }); },
  snore(a, t, o) { a.burst(o, t, { dur: 0.9, vol: 0.06, type: 'lowpass', f: 300, f2: 520, buf: a.brown, attack: 0.4 }); a.tone(o, t + 0.2, { type: 'sawtooth', f: 70, dur: 0.6, vol: 0.02, attack: 0.2 }); },
  /** The futon: a soft flump and a cloth rustle. */
  futon(a, t, o) {
    a.burst(o, t, { dur: 0.25, vol: 0.2, type: 'lowpass', f: 500, buf: a.pink });
    a.burst(o, t + 0.05, { dur: 0.4, vol: 0.08, type: 'bandpass', f: 2200, f2: 1400, q: 0.8 });
  },
  /** The old man's cigar: a slow pull and a breathy puff. */
  cigar(a, t, o) {
    a.burst(o, t, { dur: 0.5, vol: 0.05, type: 'bandpass', f: 1800, f2: 1200, q: 3, attack: 0.15 });
    a.burst(o, t + 0.7, { dur: 0.8, vol: 0.06, type: 'bandpass', f: 600, f2: 300, q: 0.7, attack: 0.05, buf: a.pink });
  },
  /** The till: a register key, the bell, the drawer. */
  regKey(a, t, o) { a.burst(o, t, { dur: 0.03, vol: 0.2, type: 'bandpass', f: 2400, q: 3 }); a.tone(o, t, { type: 'triangle', f: 1200, dur: 0.03, vol: 0.04 }); },
  scanBeep(a, t, o) { a.tone(o, t, { type: 'square', f: 2637, dur: 0.09, vol: 0.05, curve: 'lin' }); },
  /** A splat (pigeon droppings, a dropped noodle). */
  splat(a, t, o, p) {
    const v = p.v ?? 1;
    a.burst(o, t, { dur: 0.12, vol: 0.25 * v, type: 'lowpass', f: 1600, f2: 300 });
    a.tone(o, t, { f: 220, f2: 90, dur: 0.08, vol: 0.12 * v });
  },
  /** Plates clinking together in the sink or the rack. */
  dishClink(a, t, o) { a.bell(o, t, rand(1900, 2400), { dur: 0.3, vol: 0.06, partials: [1, 2.4, 3.9], decays: [1, 0.5, 0.3] }); },
  /** The tap running for a moment. */
  faucet(a, t, o, p) { a.burst(o, t, { dur: p.dur ?? 0.8, vol: 0.12, type: 'bandpass', f: 1800, q: 0.6, attack: 0.05, buf: a.pink }); },
  /** Gyoza hitting the hot pan. */
  sizzle(a, t, o) { a.burst(o, t, { dur: 1.6, vol: 0.12, type: 'highpass', f: 3500, attack: 0.02 }); a.burst(o, t, { dur: 0.3, vol: 0.1, type: 'bandpass', f: 1800, q: 1 }); },
  /** The ticket machine: a whirr and the ticket popping out. */
  ticket(a, t, o) {
    a.burst(o, t, { dur: 0.35, vol: 0.08, type: 'bandpass', f: 1200, f2: 1600, q: 4 });
    a.tone(o, t, { type: 'square', f: 90, dur: 0.35, vol: 0.02 });
    a.burst(o, t + 0.38, { dur: 0.04, vol: 0.15, type: 'highpass', f: 2500 });
  },
  /** The master's shout across the counter (a stylised 8-bit bark). */
  shout(a, t, o) { a.tone(o, t, { type: 'square', f: 300, f2: 420, dur: 0.12, vol: 0.05 }); a.tone(o, t + 0.13, { type: 'square', f: 420, f2: 260, dur: 0.18, vol: 0.05 }); },
  /** Leaves and water: watering a plant. */
  water(a, t, o) { a.burst(o, t, { dur: 1.1, vol: 0.12, type: 'bandpass', f: 2600, q: 0.7, attack: 0.1, buf: a.pink }); for (let i = 0; i < 6; i++) a.tone(o, t + 0.1 + i * 0.15, { type: 'sine', f: rand(1400, 2600), f2: rand(800, 1200), dur: 0.05, vol: 0.02 }); },
  /** A stagger: a scuffed step and a little grunt. */
  stumble(a, t, o) { a.burst(o, t, { dur: 0.12, vol: 0.2, type: 'lowpass', f: 900, buf: a.pink }); a.tone(o, t + 0.05, { type: 'sawtooth', f: 140, f2: 90, dur: 0.12, vol: 0.04 }); },
  /** A headache throb (hangover). */
  throb(a, t, o) { a.tone(o, t, { f: 55, dur: 0.25, vol: 0.12 }); a.tone(o, t + 0.3, { f: 52, dur: 0.25, vol: 0.08 }); },
});
