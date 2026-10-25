// The garage radio: three stations (lo-fi, city-pop, chiptune) of real tracks (public/audio/music/radio_*,
// see CREDITS.md) heard through a small band-limited, crackly speaker at the radio's position.
// If a track can't be streamed the station falls back to generated music.
import { audio } from './audio.js';
import { bgm, Stream } from './bgm.js';

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);

// tracks: files in public/audio/music; chord = [root midi, intervals...] for the generated fallback
const STATIONS = [
  {
    name: 'FM Kissa 82.5', jp: '喫茶ローファイ', bpm: 76, swing: 0.58, tracks: ['radio_lofi1', 'radio_lofi2'],
    prog: [[53, 0, 4, 7, 11, 14], [55, 0, 4, 7, 10, 14], [52, 0, 3, 7, 10, 14], [50, 0, 3, 7, 10, 14]], // royal road in F: Bbmaj9 C9 Am9 Dm9
    drums: 'lofi', lead: 'bell', ep: true,
  },
  {
    name: 'Night Drive 89.1', jp: 'シティポップ', bpm: 104, swing: 0.5, tracks: ['radio_city1'],
    prog: [[50, 0, 3, 7, 10, 14], [55, 0, 4, 7, 10, 14, 21], [48, 0, 4, 7, 11, 14], [57, 0, 3, 7, 10]], // Dm9 G13 Cmaj9 Am7
    drums: 'pop', lead: 'synth', ep: true,
  },
  {
    name: 'Retro 8bit 77.7', jp: 'ピコピコ', bpm: 128, swing: 0.5, tracks: ['radio_chip1'],
    prog: [[48, 0, 4, 7], [45, 0, 3, 7], [53, 0, 4, 7], [55, 0, 4, 7]],
    drums: 'chip', lead: 'square', ep: false,
  },
];
const STREAM_VOL = 0.42; // real tracks are mastered much louder than the generated ones

export class Radio {
  constructor() {
    this.station = -1;
    this.timer = null;
    this.out = null;
    this.pos = null;
    this.seed = 1;
  }

  get stations() { return STATIONS; }

  attach(pos) { this.pos = pos; }

  /** Cycle off -> station 0 -> 1 -> 2 -> off. Returns new station index (-1 = off). */
  cycle() {
    const next = this.station + 1 >= STATIONS.length ? -1 : this.station + 1;
    this.setStation(next);
    return next;
  }

  setStation(i) {
    this.stop();
    this.station = i;
    bgm.duck(i >= 0, 0.2, 'radio'); // the background music steps aside while the radio plays
    if (i < 0 || !audio.ready) return;
    const ctx = audio.ctx;
    // radio voicing: band-limited, slightly saturated, positional at the radio
    this.out = audio.out({ pos: this.pos, bus: audio.music, ref: 2.5, rolloff: 0.8, vol: 0.9 });
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 110;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = i === 2 ? 7000 : 5200;
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let k = 0; k < 256; k++) { const x = k / 128 - 1; curve[k] = Math.tanh(x * 1.6) / Math.tanh(1.6); }
    shaper.curve = curve;
    this.in = ctx.createGain();
    this.in.gain.value = 0.9;
    this.in.connect(hp).connect(lp).connect(shaper).connect(this.out);
    this.crackle(i);
    this.def = STATIONS[i];
    audio.play('relay', { pos: this.pos, vol: 0.4 });
    this.ti = Math.floor(Math.random() * this.def.tracks.length);
    if (!this.stream(true)) this.generate();
  }

  /** Stream the station's current track into the radio speaker; tune in mid-song the first time. */
  stream(first) {
    try {
      const s = new Stream(`audio/music/${this.def.tracks[this.ti]}.mp3`, this.in, STREAM_VOL);
      s.onfail = () => { if (this.cur !== s) return; s.dispose(); this.cur = null; if (this.def && !this.timer) this.generate(); };
      s.onended = () => { if (this.cur !== s) return; s.dispose(); this.ti = (this.ti + 1) % this.def.tracks.length; this.stream(false); };
      if (first) s.seekRandom();
      s.play();
      this.cur = s;
      return true;
    } catch (e) { console.warn('radio', e); return false; }
  }

  /** Fallback: generated music in the station's style. */
  generate() {
    const ctx = audio.ctx;
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.4;
    this.bar = 0;
    this.melodyNote = 72;
    this.timer = setInterval(() => this.schedule(), 40);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.cur) { this.cur.kill(0.08); this.cur = null; }
    if (this.crackleSrc) { try { this.crackleSrc.stop(); } catch { /* */ } this.crackleSrc = null; }
    if (this.out) {
      const o = this.out;
      o.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.05);
      setTimeout(() => o.disconnect(), 600);
      this.out = null;
    }
  }

  crackle(i) {
    const ctx = audio.ctx;
    const len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let k = 0; k < len; k++) {
      d[k] = (Math.random() * 2 - 1) * 0.012;
      if (Math.random() < 0.0004) d[k] += (Math.random() * 2 - 1) * 0.5;
    }
    const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true;
    const g = ctx.createGain(); g.gain.value = i === 2 ? 0.25 : 0.6;
    s.connect(g).connect(this.in); s.start();
    this.crackleSrc = s;
  }

  rnd() { this.seed = (this.seed * 16807) % 2147483647; return this.seed / 2147483647; }

  schedule() {
    const ctx = audio.ctx;
    if (!ctx || !this.def) return;
    const def = this.def;
    const sixteenth = 60 / def.bpm / 4;
    while (this.nextTime < ctx.currentTime + 0.25) {
      const s = this.step % 16;
      const swingOff = s % 2 === 1 ? (def.swing - 0.5) * 2 * sixteenth : 0;
      this.playStep(s, this.nextTime + swingOff, sixteenth);
      this.nextTime += sixteenth;
      this.step++;
      if (this.step % 16 === 0) this.bar++;
    }
  }

  playStep(s, t, six) {
    const def = this.def;
    const chord = def.prog[Math.floor(this.bar / (def.drums === 'chip' ? 1 : 1)) % def.prog.length];
    const root = chord[0];
    const o = this.in;
    // drums
    if (def.drums === 'lofi') {
      if (s === 0 || s === 10) this.kick(t, 0.5);
      if (s === 4 || s === 12) this.snare(t, 0.18, 1800);
      if (s % 2 === 0) this.hat(t, s % 4 === 2 ? 0.05 : 0.03);
    } else if (def.drums === 'pop') {
      if (s % 4 === 0) this.kick(t, 0.45);
      if (s === 4 || s === 12) this.snare(t, 0.22, 2200);
      this.hat(t, s % 2 === 0 ? 0.04 : 0.02);
    } else {
      if (s % 4 === 0) this.kick(t, 0.35, true);
      if (s === 4 || s === 12) this.snare(t, 0.12, 5000);
      if (s % 2 === 0) this.hat(t, 0.02);
    }
    // bass
    if (def.drums === 'chip') {
      if (s % 2 === 0) audio.tone(o, t, { type: 'triangle', f: NOTE(root - 12 + (s % 8 === 4 ? 7 : 0)), dur: six * 1.8, vol: 0.16, curve: 'lin' });
    } else if (s === 0 || s === 7 || s === 10) {
      const n = s === 7 ? root + 7 - 12 : root - 12;
      audio.tone(o, t, { type: 'sine', f: NOTE(n), dur: six * (s === 0 ? 6 : 3), vol: 0.26, attack: 0.01, curve: 'lin' });
      audio.tone(o, t, { type: 'triangle', f: NOTE(n), dur: six * 2, vol: 0.05 });
    }
    // chords (electric piano)
    if (def.ep && (s === 0 || (s === 6 && this.rnd() < 0.6) || (s === 11 && this.rnd() < 0.3))) {
      const dur = s === 0 ? six * 8 : six * 4;
      chord.slice(1).forEach((iv, k) => this.ep(t + k * 0.012, NOTE(root + 12 + iv), dur, s === 0 ? 0.045 : 0.03));
    }
    if (!def.ep && s % 4 === 0) {
      // chiptune arpeggio
      for (let k = 0; k < 4; k++) {
        const iv = chord[1 + (k % (chord.length - 1))];
        audio.tone(o, t + k * six, { type: 'square', f: NOTE(root + 24 + iv), dur: six * 0.9, vol: 0.025, curve: 'lin' });
      }
    }
    // lead melody (pentatonic random walk, sparse)
    if ((s % 4 === 0 || s % 4 === 3) && this.rnd() < (def.lead === 'square' ? 0.8 : 0.4)) {
      const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
      const keyRoot = def.prog[0][0] % 12 + 60;
      const idx = Math.max(0, Math.min(scale.length - 1, Math.round((this.melodyNote - keyRoot) / 2.1) + Math.round((this.rnd() - 0.5) * 3)));
      const n = keyRoot + scale[idx];
      this.melodyNote = n;
      const dur = six * (1 + Math.floor(this.rnd() * 3));
      if (def.lead === 'bell') audio.bell(o, t, NOTE(n + 12), { dur: dur * 3, vol: 0.035, partials: [1, 2, 3], decays: [1, 0.4, 0.2] });
      else if (def.lead === 'synth') { audio.tone(o, t, { type: 'sawtooth', f: NOTE(n + 12), dur: dur * 1.3, vol: 0.02, attack: 0.02, curve: 'lin' }); audio.tone(o, t, { type: 'sine', f: NOTE(n + 24), dur: dur, vol: 0.02 }); }
      else audio.tone(o, t, { type: 'square', f: NOTE(n + 12), dur: dur * 0.9, vol: 0.03, curve: 'lin' });
    }
  }

  ep(t, f, dur, vol) {
    const ctx = audio.ctx;
    const car = ctx.createOscillator(); car.frequency.value = f;
    const mod = ctx.createOscillator(); mod.frequency.value = f;
    const mg = ctx.createGain(); mg.gain.setValueAtTime(f * 1.4, t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 0.5);
    mod.connect(mg).connect(car.frequency);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const trem = ctx.createOscillator(); trem.frequency.value = 4.5;
    const tg = ctx.createGain(); tg.gain.value = vol * 0.3;
    trem.connect(tg).connect(g.gain);
    car.connect(g).connect(this.in);
    car.start(t); mod.start(t); trem.start(t);
    car.stop(t + dur + 0.05); mod.stop(t + dur + 0.05); trem.stop(t + dur + 0.05);
  }

  kick(t, v, chip = false) {
    audio.tone(this.in, t, { type: chip ? 'square' : 'sine', f: chip ? 180 : 130, f2: 42, dur: 0.22, vol: v });
  }
  snare(t, v, f) {
    audio.burst(this.in, t, { dur: 0.16, vol: v, type: 'bandpass', f, q: 0.8 });
    audio.tone(this.in, t, { f: 190, f2: 140, dur: 0.06, vol: v * 0.5, type: 'triangle' });
  }
  hat(t, v) {
    audio.burst(this.in, t, { dur: 0.035, vol: v, type: 'highpass', f: 7500 });
  }
}

export const radio = new Radio();
if (/[?&](debug|autotest)\b/.test(location.search)) window.__radio = radio;
