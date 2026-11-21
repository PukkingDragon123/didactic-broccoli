// First-run graphics preset (performance). Until the player picks a preset in Settings, the game watches its own frame
// time while you play: after a short warm-up it takes the median of a few seconds of frames (shader compiles and other
// one-off hitches don't count) and, if that is slower than ~50 fps, steps the preset down one notch and measures again
// (high -> medium -> low -> very low; two notches at once when it is far too slow). The result is remembered (settings.autoQuality, so
// the next boot starts there) and a toast says what happened and where to change it. Picking a preset by hand turns it off.
// The very first boot starts from a guess made from the GPU's name (gpuTier: a software renderer or an old integrated
// chip starts on Very Low / Low instead of spending its first seconds on High), and the measuring still steps down.
//   const aq = autoQuality(game, { onChange(name) })   aq.frame(realDtSeconds) every gameplay frame
import { QUALITY } from './renderer.js';

const ORDER = ['verylow', 'low', 'medium', 'high', 'ultra'];
const NAMES = { verylow: 'Very Low', low: 'Low', medium: 'Medium', high: 'High', ultra: 'Ultra' };

/** A starting preset from the GPU's name (WEBGL_debug_renderer_info; Chromium / Electron give it unmasked). */
export function gpuTier(gl) {
  let name = '';
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    name = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '');
  } catch { return 'high'; }
  const n = name.toLowerCase();
  if (/swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/.test(n)) return 'verylow';
  if (/intel/.test(n)) {
    if (/\barc\b/.test(n)) return 'high'; // Arc discrete
    if (/iris.*xe|xe graphics|intel\(r\) graphics/.test(n)) return 'medium'; // Iris Xe / Core Ultra iGPUs
    return 'low'; // HD / UHD / older Iris
  }
  if (/radeon/.test(n) && /(vega \d+ graphics|radeon\(tm\) graphics|radeon graphics|r[2-7] |hd \d{4}|\b(5|6)\d0m\b)/.test(n)) return /hd \d{4}|r[2-7] /.test(n) ? 'low' : 'medium'; // APUs, old mobile Radeons
  if (/geforce/.test(n) && /(\bmx ?\d|\bgt \d|\b(7|8|9)\d0m\b)/.test(n)) return 'medium'; // MX / GT entry chips
  if (/mali|adreno|powervr|apple gpu/.test(n)) return 'low';
  return 'high';
}
const WARM = 2.5, MEASURE = 4; // seconds
const TARGET = 1 / 50, WAY_OFF = 1 / 24;

export function autoQuality(game, { onChange = () => {} } = {}) {
  const s = game.state.settings;
  const R = game.renderer;
  let phase = 'warm', t = 0, samples = [], done = !!s.quality, dropped = false;
  // the last boot's verdict, unless the player has chosen one; on the first boot, a guess from the GPU
  if (!s.quality && !s.autoQuality) {
    const guess = gpuTier(R.renderer.getContext());
    if (ORDER.indexOf(guess) < ORDER.indexOf(R.qualityName)) { R.setQuality(guess); onChange(guess); dropped = true; }
  }
  if (!s.quality && s.autoQuality && QUALITY[s.autoQuality] && s.autoQuality !== R.qualityName) { R.setQuality(s.autoQuality); onChange(s.autoQuality); }
  const set = (name) => { R.setQuality(name); s.autoQuality = name; onChange(name); dropped = true; phase = 'warm'; t = 0; samples = []; };
  return {
    get active() { return !done && !s.quality; },
    frame(dt) {
      if (done || s.quality) { done = true; return; }
      if (!(dt > 0) || dt > 0.25 || document.hidden || game.cutscene?.active) return; // tab switches, loading hitches, cutscenes
      t += dt;
      if (phase === 'warm') { if (t >= WARM) { phase = 'measure'; t = 0; samples = []; } return; }
      samples.push(dt);
      if (t < MEASURE || samples.length < 60) return;
      samples.sort((a, b) => a - b);
      const med = samples[samples.length >> 1];
      const i = ORDER.indexOf(R.qualityName);
      if (med > TARGET && i > 0) { set(ORDER[med > WAY_OFF ? Math.max(0, i - 2) : i - 1]); return; } // (far too slow: two notches)
      // settled
      done = true;
      s.autoQuality = R.qualityName;
      if (dropped) game.news(`Graphics set to ${NAMES[R.qualityName]}`, 'For a smoother frame rate. You can change it any time in Settings (Esc).', 7000);
      game.save?.();
    },
  };
}
