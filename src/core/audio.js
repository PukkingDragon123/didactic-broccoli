// Web Audio sound engine: recorded samples (public/audio, see CREDITS.md) with a procedural synth
// version of every sound as the fallback (used while samples load, or if they can't be decoded).
import * as THREE from 'three';

const rand = (a, b) => a + Math.random() * (b - a);
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI -> Hz

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.volumes = { master: 0.8, sfx: 0.9, music: 0.55, ambience: 0.7 };
    this.loops = new Map();
    this._lastPlay = new Map();
    this.buffers = new Map(); // 'sfx/coin_clink1' -> AudioBuffer
    this._loading = new Map(); // key -> Promise<AudioBuffer|null>
    this._lastVar = new Map();
    this._readyFns = [];
    this.samplesLoaded = 0; this.samplesFailed = 0; this.samplesTotal = 0;
  }

  /** Run fn once the AudioContext exists (immediately if it already does). */
  onReady(fn) { if (this.ready) fn(); else this._readyFns.push(fn); }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC({ latencyHint: 'interactive' });
    this.master = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 3.5; comp.attack.value = 0.004; comp.release.value = 0.2;
    this.master.connect(comp).connect(ctx.destination);
    this.sfx = ctx.createGain();
    this.music = ctx.createGain();
    this.amb = ctx.createGain();
    this.sfx.connect(this.master); this.music.connect(this.master); this.amb.connect(this.master);
    this.reverb = ctx.createConvolver();
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.32;
    this.reverbSend.connect(this.reverb).connect(this.master);
    this.sfx.connect(this.reverbSend);
    this.amb.connect(this.reverbSend);
    this.setRoom('garage');
    this.noise = this.makeNoise(2.5, 'white');
    this.pink = this.makeNoise(4, 'pink');
    this.brown = this.makeNoise(4, 'brown');
    this.applyVolumes();
    this.ready = true;
    for (const fn of this._readyFns.splice(0)) { try { fn(); } catch (e) { console.warn(e); } }
    setTimeout(() => this.preload(), 50); // fetch + decode the samples in the background
  }

  // ---------------------------------------------------------------- recorded samples
  /** Fetch + decode one file ('sfx/coin_clink1' -> audio/sfx/coin_clink1.mp3); resolves null on failure. */
  loadBuffer(key) {
    if (this.buffers.has(key)) return Promise.resolve(this.buffers.get(key));
    if (this._loading.has(key)) return this._loading.get(key);
    const p = (async () => {
      try {
        const res = await fetch(`audio/${key}.mp3`);
        if (!res.ok) throw new Error(res.status + ' ' + key);
        const data = await res.arrayBuffer();
        const buf = await new Promise((ok, fail) => { const r = this.ctx.decodeAudioData(data, ok, fail); r?.catch?.(fail); });
        buf._head = leadIn(buf); // skip MP3 encoder padding if the decoder kept it
        this.buffers.set(key, buf);
        this.samplesLoaded++;
        return buf;
      } catch (e) {
        this.samplesFailed++;
        if (this.samplesFailed <= 3) console.warn('audio: sample unavailable, using synth', key, e?.message || e);
        return null;
      }
    })();
    this._loading.set(key, p);
    return p;
  }

  /** Load every sample in the background, a few at a time (UI and common sounds first). */
  async preload() {
    if (this._preloaded) return;
    this._preloaded = true;
    const keys = [...new Set([...Object.values(SAMPLES).flatMap(sampleKeys), ...Object.values(LOOP_SAMPLES)])];
    this.samplesTotal = keys.length;
    let i = 0;
    const worker = async () => { while (i < keys.length) await this.loadBuffer(keys[i++]); };
    await Promise.all([worker(), worker(), worker(), worker()]);
  }

  /** Play a recorded variant of `name` (true), or false when no sample is decoded yet. */
  playSample(name, opts = {}) {
    const def = SAMPLES[name];
    if (!def) return false;
    let files = def.f;
    if (def.by) files = files[def.by(opts)] || Object.values(files)[0];
    const dir = def.dir || 'sfx';
    const bufs = files.map((f) => this.buffers.get(`${dir}/${f}`)).filter(Boolean);
    if (!bufs.length) return false;
    const ctx = this.ctx;
    const n = def.n || 1;
    for (let k = 0; k < n; k++) {
      // a different variant from last time
      let vi = Math.floor(Math.random() * bufs.length);
      if (bufs.length > 1 && vi === this._lastVar.get(name)) vi = (vi + 1) % bufs.length;
      this._lastVar.set(name, vi);
      const buf = bufs[vi];
      const t = ctx.currentTime + (opts.delay || 0) + (n > 1 ? (k / n) * (def.spread || 1) + rand(0, 0.05) : 0);
      const out = this.out(opts);
      const s = ctx.createBufferSource();
      s.buffer = buf;
      const pj = def.pj ?? 0.05;
      let rate = (def.rate ? def.rate(opts) : 1) * (1 + rand(-pj, pj));
      if (def.fit && opts.dur) rate *= Math.min(1.25, Math.max(0.8, def.fit / opts.dur)); // stretch to the animation
      s.playbackRate.value = rate;
      const g = ctx.createGain();
      const vol = typeof def.vol === 'function' ? def.vol(opts) : (def.vol ?? 1);
      g.gain.value = vol * (1 + rand(-(def.vj ?? 0.1), def.vj ?? 0.1));
      s.connect(g).connect(out);
      const len = def.dur === true ? opts.dur : def.dur; // play only part of the sample, then fade
      if (len) {
        g.gain.setValueAtTime(g.gain.value, t + len);
        g.gain.linearRampToValueAtTime(0, t + len + 0.06);
        if (def.ramp) { s.playbackRate.setValueAtTime(rate * def.ramp[0], t); s.playbackRate.linearRampToValueAtTime(rate * def.ramp[1], t + len); }
        s.start(t, buf._head, len + 0.08);
      } else s.start(t, buf._head);
      s.onended = () => { try { out.disconnect(); } catch { /* gone */ } };
    }
    if (def.duck) this.onDuck?.(bufs[0].duration);
    for (const [other, delay, v = 1] of def.with || []) this.playSample(other, { ...opts, delay: (opts.delay || 0) + delay, vol: (opts.vol ?? 1) * v });
    if (def.synth) this.playSynth(name, opts);
    return true;
  }

  applyVolumes() {
    if (!this.ctx) return;
    const v = this.volumes;
    this.master.gain.value = v.master;
    this.sfx.gain.value = v.sfx;
    this.music.gain.value = v.music;
    this.amb.gain.value = v.ambience;
  }

  get now() { return this.ctx ? this.ctx.currentTime : 0; }

  makeNoise(sec, type) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * sec);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (type === 'pink') {
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
      } else if (type === 'brown') {
        last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5;
      } else d[i] = w;
    }
    return buf;
  }

  setRoom(kind) {
    if (!this.ctx || this.room === kind) return;
    this.room = kind;
    const ctx = this.ctx;
    const dur = kind === 'museum' ? 2.4 : kind === 'outside' ? 0.8 : 1.3;
    const decay = kind === 'museum' ? 2.6 : 3.4;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        let s = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
        // a few early reflections off concrete walls
        if (kind !== 'museum' && (i === Math.floor(len * 0.012) || i === Math.floor(len * 0.027) || i === Math.floor(len * 0.041))) s += ch ? 0.5 : -0.45;
        d[i] = s * 0.6;
      }
    }
    this.reverb.buffer = buf;
    this.reverbSend.gain.value = kind === 'museum' ? 0.42 : 0.3;
  }

  updateListener(camera) {
    if (!this.ctx) return;
    const l = this.ctx.listener;
    const p = camera.getWorldPosition(new THREE.Vector3());
    const f = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion()));
    const t = this.ctx.currentTime;
    if (l.positionX) {
      l.positionX.setTargetAtTime(p.x, t, 0.02); l.positionY.setTargetAtTime(p.y, t, 0.02); l.positionZ.setTargetAtTime(p.z, t, 0.02);
      l.forwardX.setTargetAtTime(f.x, t, 0.02); l.forwardY.setTargetAtTime(f.y, t, 0.02); l.forwardZ.setTargetAtTime(f.z, t, 0.02);
      l.upX.value = 0; l.upY.value = 1; l.upZ.value = 0;
    } else {
      l.setPosition(p.x, p.y, p.z); l.setOrientation(f.x, f.y, f.z, 0, 1, 0);
    }
  }

  /** Create an output node (optionally positional) feeding the given bus. */
  out(opts = {}) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.value = opts.vol ?? 1;
    if (opts.pos) {
      const p = ctx.createPanner();
      p.panningModel = 'equalpower';
      p.distanceModel = 'inverse';
      p.refDistance = opts.ref ?? 1.2;
      p.rolloffFactor = opts.rolloff ?? 1.1;
      p.maxDistance = 60;
      if (p.positionX) { p.positionX.value = opts.pos.x; p.positionY.value = opts.pos.y; p.positionZ.value = opts.pos.z; }
      else p.setPosition(opts.pos.x, opts.pos.y, opts.pos.z);
      g.connect(p).connect(opts.bus || this.sfx);
    } else g.connect(opts.bus || this.sfx);
    return g;
  }

  // ---------------------------------------------------------------- primitives
  tone(dest, t, { type = 'sine', f = 440, f2 = null, dur = 0.2, vol = 0.3, attack = 0.002, curve = 'exp', detune = 0, glide = null } = {}) {
    const ctx = this.ctx;
    const nyq = ctx.sampleRate * 0.47;
    if (f > nyq) return null; // inaudible partial
    if (f2 !== null) f2 = Math.min(f2, nyq);
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2 !== null) {
      if (glide === 'lin') o.frequency.linearRampToValueAtTime(f2, t + dur);
      else o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t + dur);
    }
    o.detune.value = detune;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    if (curve === 'exp') g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    else g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g).connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }

  burst(dest, t, { dur = 0.1, vol = 0.3, type = 'bandpass', f = 1000, f2 = null, q = 1, attack = 0.001, buf = null, rate = 1 } = {}) {
    const ctx = this.ctx;
    const s = ctx.createBufferSource();
    s.buffer = buf || this.noise;
    s.playbackRate.value = rate;
    const fl = ctx.createBiquadFilter();
    fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl).connect(g).connect(dest);
    const off = Math.random() * (s.buffer.duration - dur - 0.1);
    s.start(t, Math.max(0, off), dur + 0.05);
    return s;
  }

  bell(dest, t, f, { dur = 1.2, vol = 0.2, partials = [1, 2.0, 3.01, 4.2, 5.43], decays = [1, 0.7, 0.5, 0.35, 0.25] } = {}) {
    partials.forEach((p, i) => this.tone(dest, t, { f: f * p, dur: dur * decays[i], vol: vol / (i + 1.2), attack: 0.003 }));
  }

  /** Throttle helper so physics impacts don't machine-gun the mixer. */
  canPlay(key, gap) {
    const t = performance.now();
    if ((this._lastPlay.get(key) || 0) + gap * 1000 > t) return false;
    this._lastPlay.set(key, t);
    return true;
  }

  play(name, opts = {}) {
    if (!this.ready) return;
    try {
      if (this.playSample(name, opts)) return;
      this.playSynth(name, opts);
    } catch (e) { console.warn(e); }
  }

  playSynth(name, opts = {}) {
    const fn = SOUNDS[name];
    if (!fn) { if (!SAMPLES[name]) console.warn('no sound', name); return; }
    const out = this.out(opts);
    fn(this, this.ctx.currentTime + (opts.delay || 0), out, opts);
  }

  /** Continuous loop sound with controllable gain (returns {set(v), stop(), stopAll()}).
   *  Recorded loops start once decoded; until then the synth version (if any) plays and is crossfaded out. */
  loop(name, opts = {}) {
    if (!this.ready) return null;
    const def = LOOPS[name], key = LOOP_SAMPLES[name];
    if (!def && !key) return null;
    const ctx = this.ctx;
    const out = this.out({ ...opts, vol: 0 });
    const handle = { out, synth: null, src: null, dead: false };
    const startSample = (buf, xf) => {
      const s = ctx.createBufferSource();
      s.buffer = buf; s.loop = true;
      s.loopStart = buf._head; s.loopEnd = buf.duration - leadIn(buf, true);
      const g = ctx.createGain(); g.gain.value = xf ? 0 : 1;
      s.connect(g).connect(out);
      s.start(ctx.currentTime, rand(s.loopStart, s.loopEnd - 0.5));
      if (xf) {
        g.gain.setTargetAtTime(1, ctx.currentTime, xf / 3);
        const old = handle.synth, sg = handle.sg;
        if (old) { sg.gain.setTargetAtTime(0, ctx.currentTime, xf / 3); setTimeout(() => { try { old.stop?.(); } catch { /* stopped */ } }, xf * 2000); }
        handle.synth = null;
      }
      handle.src = s;
    };
    const buf = key && this.buffers.get(key);
    if (buf) startSample(buf, 0);
    else {
      if (def) {
        handle.sg = ctx.createGain(); handle.sg.connect(out);
        const h = def(this, handle.sg, opts);
        handle.synth = h; handle.filter = h.filter; handle.osc = h.osc;
      }
      if (key) this.loadBuffer(key).then((b) => { if (b && !handle.dead) startSample(b, 2); });
    }
    handle.set = (v, time = 0.1) => out.gain.setTargetAtTime(v, this.ctx.currentTime, time);
    handle.stop = () => { handle.dead = true; try { handle.synth?.stop(); handle.src?.stop(); } catch { /* stopped */ } };
    handle.stopAll = () => { out.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1); setTimeout(() => handle.stop(), 800); };
    return handle;
  }
}

/** Seconds of near-silence at the start (or end) of a decoded MP3: encoder padding some decoders keep. */
function leadIn(buf, end = false) {
  const d = buf.getChannelData(0), max = Math.min(d.length >> 1, 4096);
  let i = 0;
  while (i < max && Math.abs(d[end ? d.length - 1 - i : i]) < 0.002) i++;
  return i > 200 && i < max ? i / buf.sampleRate : 0;
}

// ======================================================================= one-shots
const SOUNDS = {
  coinInsert(a, t, o) {
    const f0 = rand(2200, 2600);
    [1, 2.76, 5.4, 8.93].forEach((p, i) => a.tone(o, t, { f: f0 * p, dur: 0.28 / (i + 1), vol: 0.14 / (i + 1) }));
    a.burst(o, t + 0.05, { dur: 0.14, vol: 0.08, f: 3500, q: 2 });
    a.burst(o, t + 0.21, { dur: 0.06, vol: 0.22, type: 'lowpass', f: 900 });
    a.tone(o, t + 0.21, { f: 170, f2: 90, dur: 0.09, vol: 0.25 });
    [0.28, 0.33, 0.36].forEach((d, i) => a.tone(o, t + d, { f: f0 * 0.7 * (1 + i * 0.13), dur: 0.05, vol: 0.05 }));
  },
  coinClink(a, t, o, p) {
    const f0 = rand(2600, 3400);
    const v = p.v ?? 1;
    [1, 2.6, 5.1].forEach((q, i) => a.tone(o, t, { f: f0 * q, dur: 0.12 / (i + 1), vol: 0.07 * v / (i + 1) }));
  },
  ropeZip(a, t, o) {
    a.burst(o, t, { dur: 0.32, vol: 0.18, f: 900, f2: 2600, q: 1.5 });
    a.tone(o, t + 0.25, { f: 2400, dur: 0.1, vol: 0.05 });
  },
  crankTick(a, t, o, p) {
    const pitch = p.pitch ?? 1;
    a.burst(o, t, { dur: 0.018, vol: 0.32, type: 'highpass', f: 2200 * pitch });
    a.tone(o, t, { f: 140 * pitch, f2: 80, dur: 0.05, vol: 0.22 });
    a.burst(o, t + 0.004, { dur: 0.05, vol: 0.12, f: 900 * pitch, q: 6 });
  },
  crankGrind(a, t, o) {
    a.burst(o, t, { dur: 0.16, vol: 0.06, type: 'bandpass', f: 600, f2: 400, q: 3, buf: a.brown, rate: 3 });
  },
  gachan(a, t, o) {
    a.burst(o, t, { dur: 0.12, vol: 0.4, type: 'bandpass', f: 420, q: 1.2 });
    a.tone(o, t, { f: 110, f2: 55, dur: 0.18, vol: 0.4 });
    a.burst(o, t + 0.06, { dur: 0.08, vol: 0.18, f: 1800, q: 4 });
    a.tone(o, t + 0.05, { f: 900, dur: 0.12, vol: 0.05, type: 'triangle' });
  },
  capsuleHit(a, t, o, p) {
    const s = Math.min(1, (p.speed ?? 1) / 3);
    const mat = p.mat || 'wood';
    const base = mat === 'metal' ? 2600 : mat === 'concrete' ? 1500 : mat === 'capsule' ? 2000 : 1100;
    const f = base * rand(0.85, 1.2);
    a.burst(o, t, { dur: 0.045, vol: 0.35 * s, f, q: 5 });
    a.tone(o, t, { f: f * 0.6, f2: f * 0.45, dur: 0.06, vol: 0.18 * s, type: 'triangle' });
    if (mat === 'wood') a.tone(o, t, { f: 220, f2: 140, dur: 0.07, vol: 0.25 * s });
    if (mat === 'metal') a.tone(o, t, { f: 3100, dur: 0.25, vol: 0.05 * s });
  },
  flap(a, t, o) {
    a.burst(o, t, { dur: 0.03, vol: 0.25, f: 1300, q: 3 });
    a.burst(o, t + 0.09, { dur: 0.025, vol: 0.18, f: 1500, q: 3 });
  },
  pickup(a, t, o) {
    a.burst(o, t, { dur: 0.16, vol: 0.12, type: 'lowpass', f: 400, f2: 2200, q: 0.7 });
    a.tone(o, t + 0.05, { f: 1900, dur: 0.04, vol: 0.06, type: 'triangle' });
  },
  whoosh(a, t, o, p) {
    a.burst(o, t, { dur: p.dur || 0.3, vol: p.v ?? 0.15, type: 'bandpass', f: 300, f2: 2400, q: 0.8, buf: a.pink });
  },
  twist(a, t, o, p) {
    const dur = p.dur ?? 0.8;
    const n = Math.max(3, Math.round(dur * 11));
    for (let i = 0; i < n; i++) {
      const tt = t + (i / n) * dur + rand(0, 0.02);
      a.burst(o, tt, { dur: 0.05, vol: 0.09 + i * 0.008, f: 1400 + i * 120, q: 9 });
      a.tone(o, tt, { f: 700 + i * 40, dur: 0.035, vol: 0.03, type: 'square' });
    }
  },
  pop(a, t, o, p) {
    const v = p.v ?? 1;
    a.burst(o, t, { dur: 0.012, vol: 0.6 * v, type: 'highpass', f: 1800 });
    a.tone(o, t, { f: 520, f2: 70, dur: 0.09, vol: 0.45 * v });
    a.burst(o, t + 0.005, { dur: 0.16, vol: 0.18 * v, f: 2300, q: 7 });
    a.burst(o, t, { dur: 0.08, vol: 0.2 * v, type: 'lowpass', f: 600, buf: a.pink });
  },
  paper(a, t, o) {
    for (let i = 0; i < 5; i++) a.burst(o, t + i * 0.06 + rand(0, 0.03), { dur: 0.06, vol: 0.05, f: rand(2500, 5000), q: 1.2 });
  },
  revealCommon(a, t, o) {
    a.tone(o, t, { f: 880, f2: 1320, dur: 0.12, vol: 0.12, type: 'triangle', glide: 'lin' });
    a.bell(o, t + 0.08, NOTE(84), { dur: 0.6, vol: 0.12 });
  },
  revealUncommon(a, t, o) {
    [84, 88, 91].forEach((n, i) => a.bell(o, t + i * 0.08, NOTE(n), { dur: 0.8, vol: 0.12 }));
    a.burst(o, t, { dur: 0.4, vol: 0.05, type: 'highpass', f: 5000 });
  },
  revealRare(a, t, o) {
    a.burst(o, t, { dur: 0.5, vol: 0.12, type: 'bandpass', f: 800, f2: 6000, q: 1.5, buf: a.pink });
    [84, 88, 91, 96, 100].forEach((n, i) => a.bell(o, t + 0.1 + i * 0.07, NOTE(n), { dur: 1.1, vol: 0.13 }));
    for (let i = 0; i < 10; i++) a.tone(o, t + 0.3 + i * 0.05, { f: rand(3000, 6500), dur: 0.12, vol: 0.03 });
  },
  revealUltra(a, t, o) {
    a.burst(o, t, { dur: 0.8, vol: 0.18, type: 'bandpass', f: 300, f2: 5000, q: 1, buf: a.pink });
    a.tone(o, t + 0.45, { f: 60, f2: 35, dur: 0.6, vol: 0.5 });
    [72, 76, 79, 83, 86].forEach((n) => a.bell(o, t + 0.45, NOTE(n), { dur: 2.2, vol: 0.09 }));
    [84, 88, 91, 96, 100, 103].forEach((n, i) => a.bell(o, t + 0.55 + i * 0.06, NOTE(n), { dur: 1.4, vol: 0.1 }));
    for (let i = 0; i < 20; i++) a.tone(o, t + 0.5 + i * 0.04, { f: rand(2500, 7000), dur: 0.15, vol: 0.025 });
  },
  // Secret part 1: lights die, low drone swells
  secretDim(a, t, o) {
    a.burst(o, t, { dur: 0.05, vol: 0.4, type: 'lowpass', f: 300 });
    a.tone(o, t, { f: 120, dur: 0.25, vol: 0.12, type: 'square' });
    const ctx = a.ctx;
    [36, 43, 48].forEach((n) => {
      const os = ctx.createOscillator(); os.type = 'sawtooth'; os.frequency.value = NOTE(n);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(120, t); lp.frequency.linearRampToValueAtTime(900, t + 1.6);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.06, t + 1.4); g.gain.linearRampToValueAtTime(0, t + 1.9);
      os.connect(lp).connect(g).connect(o); os.start(t); os.stop(t + 2);
    });
    for (let i = 0; i < 6; i++) a.tone(o, t + 0.3 + i * 0.22, { f: 50, f2: 40, dur: 0.18, vol: 0.18 + i * 0.05 }); // heartbeat
  },
  // Secret part 2: taiko + gong + choir + glitter fanfare
  secretBurst(a, t, o) {
    const ctx = a.ctx;
    a.tone(o, t, { f: 95, f2: 40, dur: 0.6, vol: 0.9 });
    a.burst(o, t, { dur: 0.25, vol: 0.5, type: 'lowpass', f: 500, buf: a.pink });
    [1, 1.47, 2.09, 2.56, 3.2, 4.1].forEach((p, i) => a.tone(o, t + 0.02, { f: 110 * p, dur: 4.5 - i * 0.5, vol: 0.09 / (1 + i * 0.4), attack: 0.02 }));
    // choir pad: Cmaj9 with detuned saws through a soft filter
    [60, 64, 67, 71, 74, 79].forEach((n) => {
      for (const det of [-8, 7]) {
        const os = ctx.createOscillator(); os.type = 'sawtooth'; os.frequency.value = NOTE(n); os.detune.value = det;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1600; lp.Q.value = 2;
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.022, t + 0.6); g.gain.linearRampToValueAtTime(0.0001, t + 4.2);
        os.connect(lp).connect(g).connect(o); os.start(t); os.stop(t + 4.3);
      }
    });
    // fanfare
    const fan = [[67, 0.15], [72, 0.15], [76, 0.15], [79, 0.45], [76, 0.15], [79, 0.9]];
    let tt = t + 0.5;
    for (const [n, d] of fan) {
      for (const det of [-6, 6]) a.tone(o, tt, { type: 'sawtooth', f: NOTE(n), dur: d + 0.15, vol: 0.05, attack: 0.02, curve: 'lin', detune: det });
      a.bell(o, tt, NOTE(n + 12), { dur: d + 0.4, vol: 0.05 });
      tt += d;
    }
    for (let i = 0; i < 40; i++) a.tone(o, t + 0.3 + i * 0.05, { f: rand(2500, 8000), dur: 0.2, vol: 0.022 });
  },
  finishMetallic(a, t, o) {
    a.burst(o, t, { dur: 0.5, vol: 0.12, type: 'bandpass', f: 2000, f2: 9000, q: 4 });
    a.tone(o, t, { f: 3300, dur: 1.0, vol: 0.05 }); a.tone(o, t, { f: 4950, dur: 0.7, vol: 0.03 });
  },
  finishGold(a, t, o) {
    for (let i = 0; i < 26; i++) {
      const tt = t + i * 0.04 + rand(0, 0.03);
      const f0 = rand(2400, 3600);
      a.tone(o, tt, { f: f0, dur: 0.12, vol: 0.05 }); a.tone(o, tt, { f: f0 * 2.7, dur: 0.06, vol: 0.02 });
    }
    a.bell(o, t, NOTE(79), { dur: 1.6, vol: 0.08 });
  },
  finishGlow(a, t, o) {
    [72, 79, 84, 88].forEach((n, i) => a.tone(o, t + i * 0.12, { f: NOTE(n), dur: 1.6, vol: 0.05, attack: 0.15, curve: 'lin', type: 'sine' }));
  },
  finishClear(a, t, o) {
    [96, 103].forEach((n, i) => a.bell(o, t + i * 0.1, NOTE(n), { dur: 0.9, vol: 0.07 }));
  },
  finishAurora(a, t, o) {
    [60, 64, 67, 71, 72, 76, 79, 83, 84, 88, 91, 95].forEach((n, i) => a.tone(o, t + i * 0.045, { type: 'triangle', f: NOTE(n), dur: 0.9, vol: 0.05 }));
  },
  finishDiamond(a, t, o) {
    for (let i = 0; i < 18; i++) a.bell(o, t + i * 0.07, rand(2800, 6200), { dur: 0.6, vol: 0.035, partials: [1, 2.4, 4.1], decays: [1, 0.5, 0.3] });
    a.burst(o, t, { dur: 1.2, vol: 0.05, type: 'highpass', f: 7000 });
  },
  newItem(a, t, o) {
    [79, 84, 88, 91].forEach((n, i) => a.tone(o, t + i * 0.09, { type: 'square', f: NOTE(n), dur: 0.12, vol: 0.035 }));
    a.bell(o, t + 0.36, NOTE(96), { dur: 0.8, vol: 0.06 });
  },
  place(a, t, o, p) {
    const f = p.mat === 'glass' ? 2400 : 900;
    a.burst(o, t, { dur: 0.04, vol: 0.32, f: f * rand(0.9, 1.1), q: 3 });
    a.tone(o, t, { f: p.mat === 'glass' ? 1800 : 320, f2: 180, dur: 0.06, vol: 0.2 });
    a.burst(o, t + 0.03, { dur: 0.02, vol: 0.1, type: 'highpass', f: 3000 });
  },
  register(a, t, o) {
    a.tone(o, t, { f: 1600, dur: 0.05, vol: 0.06, type: 'square' });
    a.burst(o, t + 0.02, { dur: 0.12, vol: 0.2, f: 2500, q: 1 });
    a.burst(o, t + 0.05, { dur: 0.25, vol: 0.14, type: 'lowpass', f: 700 });
  },
  sell(a, t, o) {
    a.burst(o, t, { dur: 0.08, vol: 0.25, f: 3000, q: 1 });
    a.bell(o, t + 0.07, 2637, { dur: 0.9, vol: 0.18, partials: [1, 1.5, 2.0, 3.0], decays: [1, 0.8, 0.6, 0.3] });
    for (let i = 0; i < 6; i++) SOUNDS.coinClink(a, t + 0.15 + i * 0.045 + rand(0, 0.02), o, { v: 0.8 });
  },
  complete(a, t, o) {
    const seq = [72, 76, 79, 84, 79, 84, 88, 91];
    seq.forEach((n, i) => {
      a.tone(o, t + i * 0.11, { type: 'square', f: NOTE(n), dur: 0.14, vol: 0.04 });
      a.bell(o, t + i * 0.11, NOTE(n + 12), { dur: 0.5, vol: 0.05 });
    });
    [72, 76, 79, 84].forEach((n) => a.bell(o, t + 0.95, NOTE(n), { dur: 2.0, vol: 0.08 }));
    a.burst(o, t + 0.9, { dur: 1.2, vol: 0.06, type: 'highpass', f: 6000 });
    a.tone(o, t + 0.9, { f: 70, f2: 40, dur: 0.5, vol: 0.4 });
  },
  confetti(a, t, o) {
    a.burst(o, t, { dur: 0.06, vol: 0.5, type: 'lowpass', f: 1200 });
    a.tone(o, t, { f: 200, f2: 60, dur: 0.15, vol: 0.4 });
    for (let i = 0; i < 12; i++) a.burst(o, t + 0.1 + i * 0.07, { dur: 0.05, vol: 0.03, f: rand(3000, 6000), q: 1 });
  },
  uiClick(a, t, o) {
    a.burst(o, t, { dur: 0.012, vol: 0.25, type: 'highpass', f: 2500 });
    a.burst(o, t + 0.05, { dur: 0.01, vol: 0.12, type: 'highpass', f: 3000 });
  },
  uiBeep(a, t, o, p) {
    a.tone(o, t, { type: 'square', f: p.f || 1320, dur: 0.05, vol: 0.03 });
  },
  uiHover(a, t, o) {
    a.tone(o, t, { type: 'square', f: 2400, dur: 0.015, vol: 0.01 });
  },
  purchase(a, t, o) {
    a.tone(o, t, { type: 'square', f: NOTE(88), dur: 0.09, vol: 0.04 });
    a.tone(o, t + 0.09, { type: 'square', f: NOTE(93), dur: 0.2, vol: 0.04 });
    a.bell(o, t + 0.09, NOTE(105), { dur: 0.6, vol: 0.04 });
  },
  error(a, t, o) {
    a.tone(o, t, { type: 'square', f: 220, dur: 0.12, vol: 0.05 });
    a.tone(o, t + 0.14, { type: 'square', f: 180, dur: 0.18, vol: 0.05 });
  },
  modem(a, t, o) {
    [1209, 1336, 1477, 1209, 1336].forEach((f, i) => { a.tone(o, t + i * 0.09, { type: 'sine', f, dur: 0.07, vol: 0.03 }); a.tone(o, t + i * 0.09, { f: 697 + i * 70, dur: 0.07, vol: 0.03 }); });
    a.tone(o, t + 0.55, { type: 'sine', f: 2100, dur: 0.35, vol: 0.03, curve: 'lin' });
    a.tone(o, t + 0.95, { type: 'square', f: 1200, f2: 2400, dur: 0.25, vol: 0.015, glide: 'lin' });
    a.burst(o, t + 1.2, { dur: 0.45, vol: 0.05, type: 'bandpass', f: 1800, q: 0.6 });
  },
  crtOn(a, t, o) {
    a.burst(o, t, { dur: 0.08, vol: 0.3, type: 'lowpass', f: 400 });
    a.tone(o, t, { f: 60, dur: 0.2, vol: 0.2 });
    a.tone(o, t + 0.05, { f: 9500, dur: 1.4, vol: 0.006, attack: 0.2, curve: 'lin' });
    for (let i = 0; i < 8; i++) a.burst(o, t + 0.05 + i * 0.03, { dur: 0.02, vol: 0.05, type: 'highpass', f: 4000 });
  },
  doorbell(a, t, o) {
    a.bell(o, t, NOTE(76), { dur: 1.4, vol: 0.2, partials: [1, 2, 3], decays: [1, 0.5, 0.3] });
    a.bell(o, t + 0.55, NOTE(72), { dur: 1.8, vol: 0.2, partials: [1, 2, 3], decays: [1, 0.5, 0.3] });
  },
  truck(a, t, o) {
    a.burst(o, t, { dur: 3.0, vol: 0.12, type: 'lowpass', f: 140, buf: a.brown, rate: 0.5, attack: 0.6 });
    a.tone(o, t + 2.0, { f: 900, dur: 0.15, vol: 0.02 });
  },
  footstep(a, t, o, p) {
    const surf = p.surface || 'concrete';
    const f = surf === 'wood' ? 380 : surf === 'tatami' ? 260 : surf === 'grass' ? 1800 : 600;
    a.burst(o, t, { dur: surf === 'grass' ? 0.09 : 0.05, vol: 0.12, type: surf === 'grass' ? 'bandpass' : 'lowpass', f: f * rand(0.85, 1.15), q: 0.8 });
    a.tone(o, t, { f: rand(60, 80), f2: 45, dur: 0.06, vol: surf === 'wood' ? 0.12 : 0.08 });
  },
  drop(a, t, o) {
    a.burst(o, t, { dur: 0.08, vol: 0.3, type: 'lowpass', f: 700 });
    a.tone(o, t, { f: 120, f2: 60, dur: 0.12, vol: 0.3 });
  },
  boxOpen(a, t, o) {
    for (let i = 0; i < 9; i++) a.burst(o, t + i * 0.035, { dur: 0.05, vol: 0.12, f: 1200 + i * 250, q: 2 });
    a.burst(o, t + 0.38, { dur: 0.1, vol: 0.18, type: 'lowpass', f: 900 });
    a.burst(o, t + 0.5, { dur: 0.1, vol: 0.14, type: 'lowpass', f: 1100 });
  },
  thud(a, t, o, p) {
    const v = p.v ?? 1;
    a.tone(o, t, { f: 90, f2: 40, dur: 0.35, vol: 0.6 * v });
    a.burst(o, t, { dur: 0.25, vol: 0.35 * v, type: 'lowpass', f: 500, buf: a.pink });
    a.burst(o, t + 0.02, { dur: 0.4, vol: 0.08 * v, type: 'bandpass', f: 2500, q: 0.5 });
  },
  upgrade(a, t, o) {
    for (let i = 0; i < 4; i++) { a.burst(o, t + i * 0.09, { dur: 0.02, vol: 0.2, type: 'highpass', f: 2600 }); a.tone(o, t + i * 0.09, { f: 300, dur: 0.03, vol: 0.06 }); }
    [72, 79, 84, 91].forEach((n, i) => a.bell(o, t + 0.42 + i * 0.07, NOTE(n), { dur: 1.0, vol: 0.08 }));
  },
  pour(a, t, o, p) {
    const n = p.n ?? 20;
    for (let i = 0; i < n; i++) SOUNDS.capsuleHit(a, t + i * (1.3 / n) + rand(0, 0.06), o, { speed: rand(0.8, 2.5), mat: i < n / 2 ? 'metal' : 'capsule' });
  },
  relay(a, t, o) {
    a.burst(o, t, { dur: 0.03, vol: 0.35, type: 'highpass', f: 1200 });
    a.tone(o, t, { f: 100, dur: 0.3, vol: 0.06, type: 'square' });
  },
  lightsOn(a, t, o) {
    for (let i = 0; i < 3; i++) a.burst(o, t + i * 0.07, { dur: 0.02, vol: 0.12, type: 'highpass', f: 3000 });
    a.tone(o, t + 0.2, { f: 120, dur: 0.6, vol: 0.02, type: 'sawtooth', curve: 'lin' });
  },
  shutter(a, t, o) {
    a.burst(o, t, { dur: 0.015, vol: 0.4, type: 'highpass', f: 2000 });
    a.burst(o, t + 0.06, { dur: 0.02, vol: 0.25, type: 'highpass', f: 1600 });
  },
  /** Pigeon coo: two soft hooting glides. */
  coo(a, t, o) {
    for (let i = 0; i < 2; i++) a.tone(o, t + i * 0.42, { f: 410, f2: 300, dur: 0.32, vol: 0.06, type: 'sine', attack: 0.06 });
    a.tone(o, t + 0.9, { f: 380, f2: 260, dur: 0.5, vol: 0.05, type: 'sine', attack: 0.08 });
  },
  /** Wing flaps of a startled pigeon. */
  flutter(a, t, o) {
    for (let i = 0; i < 9; i++) a.burst(o, t + i * 0.055, { dur: 0.04, vol: 0.18 - i * 0.015, type: 'bandpass', f: 900 + Math.random() * 500, q: 1.2 });
  },
  /** Cat meow: a rising-then-falling nasal tone. */
  meow(a, t, o, opts = {}) {
    const k = opts.pitch || 1;
    a.tone(o, t, { f: 520 * k, f2: 880 * k, dur: 0.18, vol: 0.09, type: 'sawtooth', attack: 0.03 });
    a.tone(o, t + 0.17, { f: 880 * k, f2: 460 * k, dur: 0.32, vol: 0.08, type: 'sawtooth' });
    a.burst(o, t, { dur: 0.45, vol: 0.03, type: 'bandpass', f: 1600 * k, q: 4 });
  },
  /** Purr: a low rumble. */
  purr(a, t, o) {
    for (let i = 0; i < 10; i++) a.burst(o, t + i * 0.07, { dur: 0.06, vol: 0.08, type: 'lowpass', f: 140, q: 2 });
  },
  /** Wooden lattice door sliding in its track: a low rumble with little rattles of the glass. */
  slideDoor(a, t, o) {
    a.burst(o, t, { dur: 0.55, vol: 0.22, type: 'lowpass', f: 380, f2: 220, q: 0.7, attack: 0.04 });
    a.burst(o, t, { dur: 0.5, vol: 0.06, type: 'bandpass', f: 1400, q: 3, attack: 0.05 });
    for (let i = 0; i < 4; i++) a.burst(o, t + 0.06 + i * 0.11 + rand(0, 0.03), { dur: 0.018, vol: 0.07, type: 'bandpass', f: rand(2400, 3600), q: 6 });
    a.burst(o, t + 0.56, { dur: 0.05, vol: 0.18, type: 'lowpass', f: 700 });
  },
  chimeEntrance(a, t, o) {
    [76, 72, 79, 84].forEach((n, i) => a.bell(o, t + i * 0.28, NOTE(n), { dur: 1.2, vol: 0.09, partials: [1, 2, 3], decays: [1, 0.4, 0.2] }));
  },
  coinDrop(a, t, o) {
    SOUNDS.coinClink(a, t, o, { v: 1.2 });
    SOUNDS.coinClink(a, t + 0.08, o, { v: 0.6 });
    SOUNDS.coinClink(a, t + 0.13, o, { v: 0.4 });
  },
  furin(a, t, o) {
    const f = rand(2700, 3300);
    a.bell(o, t, f, { dur: 3.2, vol: 0.05, partials: [1, 2.32, 4.25, 6.8], decays: [1, 0.6, 0.3, 0.2] });
  },
  crow(a, t, o) {
    for (let i = 0; i < 2; i++) {
      const ctx = a.ctx, tt = t + i * 0.45;
      const os = ctx.createOscillator(); os.type = 'sawtooth';
      os.frequency.setValueAtTime(520, tt); os.frequency.linearRampToValueAtTime(380, tt + 0.3);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 3;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, tt); g.gain.linearRampToValueAtTime(0.05, tt + 0.04); g.gain.linearRampToValueAtTime(0, tt + 0.32);
      os.connect(bp).connect(g).connect(o); os.start(tt); os.stop(tt + 0.35);
    }
  },
  higurashi(a, t, o) {
    // "kana-kana-kana" evening cicada: decaying AM chirps
    const ctx = a.ctx;
    const n = 10 + Math.floor(Math.random() * 8);
    const f0 = rand(4300, 4800);
    for (let i = 0; i < n; i++) {
      const tt = t + i * 0.16;
      const os = ctx.createOscillator(); os.frequency.setValueAtTime(f0 * (1 - i * 0.004), tt); os.frequency.linearRampToValueAtTime(f0 * 0.93, tt + 0.12);
      const am = ctx.createOscillator(); am.frequency.value = 55;
      const amg = ctx.createGain(); amg.gain.value = 0.5;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, tt);
      const v = 0.02 * (1 - i / n * 0.6);
      g.gain.linearRampToValueAtTime(v, tt + 0.02); g.gain.linearRampToValueAtTime(0, tt + 0.13);
      am.connect(amg).connect(g.gain);
      os.connect(g).connect(o); os.start(tt); os.stop(tt + 0.15); am.start(tt); am.stop(tt + 0.15);
    }
  },
  crossing(a, t, o) {
    for (let i = 0; i < 8; i++) a.bell(o, t + i * 0.42, i % 2 ? 760 : 700, { dur: 0.4, vol: 0.03, partials: [1, 2.7, 4.1], decays: [1, 0.4, 0.2] });
    a.burst(o, t + 1.4, { dur: 2.5, vol: 0.05, type: 'lowpass', f: 300, buf: a.brown, attack: 0.8 });
  },
  townChime(a, t, o) {
    // gentle original evening PA melody (pentatonic), distant
    const mel = [67, 67, 69, 67, 64, 64, 62, 64, 67, 67, 69, 72, 69, 67, 64, 62, 60];
    const dur = [0.5, 0.5, 0.5, 0.5, 1, 0.5, 0.5, 1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1.6];
    let tt = t;
    mel.forEach((n, i) => {
      a.tone(o, tt, { type: 'triangle', f: NOTE(n), dur: dur[i] * 1.6, vol: 0.022, attack: 0.04 });
      a.tone(o, tt, { type: 'sine', f: NOTE(n + 12), dur: dur[i] * 1.2, vol: 0.008, attack: 0.04 });
      tt += dur[i] * 0.9;
    });
  },
  visitorHappy(a, t, o) {
    a.tone(o, t, { type: 'sine', f: rand(500, 800), f2: rand(900, 1300), dur: 0.18, vol: 0.04, glide: 'lin' });
  },
  murmur(a, t, o) {
    for (let i = 0; i < 4; i++) a.burst(o, t + i * 0.12 + rand(0, 0.05), { dur: 0.1, vol: 0.03, f: rand(300, 900), q: 4, buf: a.pink });
  },
  motor(a, t, o, p) {
    const dur = p.dur || 1;
    a.tone(o, t, { type: 'sawtooth', f: 90, f2: 140, dur, vol: 0.03, curve: 'lin', glide: 'lin' });
    a.burst(o, t, { dur, vol: 0.05, type: 'bandpass', f: 800, q: 2, buf: a.brown, rate: 4 });
  },
  dust(a, t, o) {
    a.burst(o, t, { dur: 0.6, vol: 0.08, type: 'lowpass', f: 1500, f2: 300, buf: a.pink });
  },
  paint(a, t, o) {
    a.burst(o, t, { dur: 0.18, vol: 0.12, type: 'bandpass', f: 1200, f2: 600, q: 1 });
    a.tone(o, t + 0.05, { f: 500, dur: 0.05, vol: 0.05 });
  },
  rotate(a, t, o) {
    a.burst(o, t, { dur: 0.06, vol: 0.12, type: 'bandpass', f: 1600, q: 2 });
  },
  /** Straw broom swish across concrete. */
  sweep(a, t, o) {
    a.burst(o, t, { dur: 0.32, vol: 0.16, type: 'bandpass', f: 2600, f2: 1500, q: 0.7, attack: 0.04, buf: a.pink });
    a.burst(o, t + 0.05, { dur: 0.2, vol: 0.05, type: 'highpass', f: 5000 });
  },
  /** Wrench on a bolt: a ratchet run and a metallic tink. */
  wrench(a, t, o) {
    for (let i = 0; i < 5; i++) a.burst(o, t + i * 0.045, { dur: 0.015, vol: 0.22, type: 'highpass', f: rand(2600, 3400) });
    a.tone(o, t + 0.26, { f: rand(2300, 2900), dur: 0.35, vol: 0.05, type: 'triangle' });
    a.tone(o, t + 0.26, { f: 160, f2: 90, dur: 0.06, vol: 0.12 });
  },
  /** Electric crackle (repairs, an old tube striking). */
  zap(a, t, o) {
    for (let i = 0; i < 6; i++) a.burst(o, t + i * 0.03 + rand(0, 0.02), { dur: 0.012, vol: 0.18, type: 'highpass', f: rand(3000, 6000) });
    a.tone(o, t, { f: 60, dur: 0.18, vol: 0.05, type: 'square' });
  },
  /** An old key turning in a lock. */
  keyTurn(a, t, o) {
    a.burst(o, t, { dur: 0.05, vol: 0.2, f: 2400, q: 4 });
    a.burst(o, t + 0.16, { dur: 0.03, vol: 0.3, type: 'highpass', f: 1800 });
    a.tone(o, t + 0.16, { f: 900, f2: 600, dur: 0.08, vol: 0.06, type: 'triangle' });
    a.burst(o, t + 0.3, { dur: 0.04, vol: 0.35, type: 'lowpass', f: 900 });
  },
  /** A roller shutter rattling up its rails. */
  shutterRoll(a, t, o, p) {
    const dur = p.dur || 2.4;
    a.burst(o, t, { dur, vol: 0.2, type: 'bandpass', f: 500, f2: 900, q: 0.9, attack: 0.1, buf: a.brown, rate: 2 });
    const n = Math.floor(dur * 14);
    for (let i = 0; i < n; i++) a.burst(o, t + i * (dur / n) + rand(0, 0.02), { dur: 0.02, vol: 0.09, type: 'bandpass', f: rand(1400, 2600), q: 5 });
    a.burst(o, t + dur, { dur: 0.12, vol: 0.3, type: 'lowpass', f: 600 });
    a.tone(o, t + dur, { f: 130, f2: 70, dur: 0.2, vol: 0.2 });
  },
  /** Milk glugging into a bowl. */
  milk(a, t, o) {
    for (let i = 0; i < 7; i++) a.tone(o, t + i * 0.12 + rand(0, 0.03), { f: rand(380, 520), f2: rand(700, 900), dur: 0.07, vol: 0.05, attack: 0.01 });
    a.burst(o, t, { dur: 0.9, vol: 0.05, type: 'lowpass', f: 900, buf: a.pink });
  },
  /** A commuter train rumbling over the girder bridge (clatter of the joints on top). */
  train(a, t, o, p) {
    const dur = p.dur || 6;
    a.burst(o, t, { dur, vol: 0.35, type: 'lowpass', f: 220, f2: 140, attack: 1.2, buf: a.brown, rate: 1 });
    a.burst(o, t, { dur, vol: 0.06, type: 'bandpass', f: 900, q: 1.2, attack: 1.5, buf: a.pink });
    for (let i = 0; i < dur * 2.2; i++) {
      const tt = t + 0.8 + i * 0.45;
      a.burst(o, tt, { dur: 0.04, vol: 0.18, type: 'lowpass', f: 600 });
      a.burst(o, tt + 0.11, { dur: 0.04, vol: 0.15, type: 'lowpass', f: 650 });
    }
  },
  /** Typewriter blip for speech bubbles and subtitles. */
  blip(a, t, o, p) {
    a.tone(o, t, { type: 'square', f: (p.f || 620) * rand(0.94, 1.06), dur: 0.035, vol: 0.025 });
  },
  /** Page turn. */
  page(a, t, o) {
    a.burst(o, t, { dur: 0.22, vol: 0.12, type: 'bandpass', f: 1800, f2: 3800, q: 0.8, attack: 0.03, buf: a.pink });
  },
  /** Bright "task done" jingle. */
  task(a, t, o) {
    [76, 81, 88].forEach((n, i) => a.bell(o, t + i * 0.08, NOTE(n), { dur: 0.8, vol: 0.07, partials: [1, 2, 3], decays: [1, 0.4, 0.2] }));
  },
};

// ======================================================================= loops
const LOOPS = {
  roomtone(a, out) {
    const s = a.ctx.createBufferSource(); s.buffer = a.brown; s.loop = true;
    const lp = a.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
    s.connect(lp).connect(out); s.start();
    return { stop: () => s.stop() };
  },
  hum(a, out) {
    const ctx = a.ctx;
    const nodes = [100, 200, 300].map((f, i) => {
      const o = ctx.createOscillator(); o.type = i === 0 ? 'sine' : 'triangle'; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = [0.5, 0.25, 0.08][i];
      o.connect(g).connect(out); o.start(); return o;
    });
    return { stop: () => nodes.forEach((n) => n.stop()) };
  },
  traffic(a, out) {
    const s = a.ctx.createBufferSource(); s.buffer = a.pink; s.loop = true;
    const lp = a.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
    const lfo = a.ctx.createOscillator(); lfo.frequency.value = 0.05;
    const lg = a.ctx.createGain(); lg.gain.value = 250;
    lfo.connect(lg).connect(lp.frequency);
    s.connect(lp).connect(out); s.start(); lfo.start();
    return { stop: () => { s.stop(); lfo.stop(); } };
  },
  rolling(a, out) {
    const s = a.ctx.createBufferSource(); s.buffer = a.pink; s.loop = true;
    const bp = a.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 1.5;
    s.connect(bp).connect(out); s.start();
    return { stop: () => s.stop(), filter: bp };
  },
  motorLoop(a, out) {
    const o = a.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 110;
    const lp = a.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600;
    o.connect(lp).connect(out); o.start();
    return { stop: () => o.stop(), osc: o };
  },
  crowd(a, out) {
    const s = a.ctx.createBufferSource(); s.buffer = a.pink; s.loop = true;
    const bp = a.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 600; bp.Q.value = 1.2;
    const lfo = a.ctx.createOscillator(); lfo.frequency.value = 3.1;
    const lg = a.ctx.createGain(); lg.gain.value = 220;
    lfo.connect(lg).connect(bp.frequency);
    s.connect(bp).connect(out); s.start(); lfo.start();
    return { stop: () => { s.stop(); lfo.stop(); } };
  },
};

// ======================================================================= recorded samples
// name -> { f: files in public/audio/<dir>/ (or {group: files} picked by by(opts)), vol (number | fn(opts)),
//   pj/vj: random pitch/volume spread, rate(opts), fit: seconds of the sample that should span opts.dur,
//   dur: play only this long (true = opts.dur), ramp: playback-rate sweep over dur, n/spread: n hits spread over
//   `spread` s, with: [[other, delay, vol]], synth: also play the synth version, duck: dips the music bed }
// Anything without an entry here (or not decoded yet) uses the synth in SOUNDS.
const V = (base, n) => Array.from({ length: n }, (_, i) => base + (i + 1));
const SAMPLES = {
  uiClick: { f: V('ui_click', 3), vol: 0.8 },
  uiHover: { f: V('ui_hover', 2), vol: 0.06 },
  error: { f: V('ui_error', 2), vol: 0.3, pj: 0.02 },
  rotate: { f: V('ui_tick', 2), vol: 0.08 },
  relay: { f: V('switch', 3), vol: 0.4 },
  crankTick: { f: V('crank_tick', 3), vol: 0.14, rate: (p) => p.pitch ?? 1 },
  footstep: {
    by: (p) => ({ wood: 'wood', grass: 'grass', tatami: 'carpet' })[p.surface] || 'concrete',
    f: { concrete: V('step_concrete', 5), wood: V('step_wood', 5), grass: V('step_grass', 4), carpet: V('step_carpet', 4) },
    vol: 0.12, pj: 0.08, vj: 0.2,
  },
  capsuleHit: {
    by: (p) => p.mat || 'wood',
    f: { wood: V('hit_wood', 4), metal: V('hit_metal', 4), concrete: V('hit_concrete', 4), capsule: V('hit_plastic', 4), glass: V('hit_glass', 4) },
    vol: (p) => 0.46 * Math.min(1, (p.speed ?? 1) / 3), pj: 0.12,
  },
  place: { by: (p) => (p.mat === 'glass' ? 'glass' : 'wood'), f: { wood: V('hit_wood', 4), glass: V('hit_glass', 4) }, vol: 0.36 },
  thud: { f: V('thud', 4), vol: (p) => 1.1 * (p.v ?? 1), pj: 0.08 },
  drop: { f: V('drop', 4), vol: 0.75 },
  pickup: { f: V('cloth', 3), vol: 0.1 },
  page: { f: V('page', 5), vol: 0.08 },
  paper: { f: V('paper', 3), vol: 0.08 },
  boxOpen: { f: V('box_open', 2), vol: 0.1 },
  pour: { f: V('pour', 3), vol: 0.3, rate: () => 0.85, n: 4, spread: 1.1 },
  flap: { f: V('flap', 3), vol: 0.15 },
  gachan: { f: V('gachan', 3), vol: 0.2 },
  coinInsert: { f: V('coin_insert', 4), vol: 0.4 },
  coinClink: { f: V('coin_clink', 4), vol: (p) => 0.08 * (p.v ?? 1), pj: 0.08 },
  coinDrop: { f: ['coin_drop1'], vol: 0.1 },
  purchase: { f: ['coins_jingle'], vol: 0.25 },
  sell: { f: ['coins_jingle'], vol: 0.3, synth: true },
  keyTurn: { f: V('key_unlock', 2), vol: 0.3 },
  doorbell: { f: ['doorbell'], vol: 0.8, pj: 0 },
  shutter: { f: ['camera'], vol: 0.2 },
  shutterRoll: { f: ['shutter_roll'], vol: 0.15, fit: 2.85, pj: 0.02 },
  slideDoor: { f: ['slide_door'], vol: 0.06 },
  twist: { f: ['ratchet'], vol: 0.12, dur: true, ramp: [0.92, 1.12], pj: 0.03 },
  upgrade: { f: ['ratchet'], vol: 0.5, dur: 0.4, with: [['jingleSmall', 0.32, 0.8]] },
  jingleSmall: { f: ['jingle_complete'], dir: 'music', vol: 0.5, pj: 0 },
  milk: { f: ['pour_milk'], vol: 0.1 },
  meow: { f: V('meow', 4), vol: 0.15, rate: (p) => p.pitch || 1 },
  purr: { f: V('purr', 3), vol: 0.06 },
  coo: { f: V('coo', 3), vol: 0.18 },
  flutter: { f: ['wings1'], vol: 0.06, rate: () => 1.6 },
  crow: { f: V('crow', 4), vol: 0.08 },
  furin: { f: V('furin', 3), vol: 0.4, rate: () => rand(1.1, 1.3) },
  task: { f: ['jingle_task'], dir: 'music', vol: 0.28, pj: 0 },
  newItem: { f: ['jingle_new'], dir: 'music', vol: 0.25, pj: 0 },
  complete: { f: ['jingle_open'], dir: 'music', vol: 0.55, pj: 0, duck: true },
};
const sampleKeys = (d) => (Array.isArray(d.f) ? d.f : Object.values(d.f).flat()).map((f) => `${d.dir || 'sfx'}/${f}`);
// loop name -> recorded ambience (seamless loops)
const LOOP_SAMPLES = { traffic: 'amb/street', birds: 'amb/birds', cicadas: 'amb/cicadas' };

export const audio = new AudioEngine();
export { SOUNDS, LOOPS, SAMPLES, LOOP_SAMPLES };
if (/[?&](debug|autotest)\b/.test(location.search)) window.__audio = audio;
