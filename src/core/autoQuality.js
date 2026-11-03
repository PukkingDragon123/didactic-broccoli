// First-run graphics preset (performance). Until the player picks a preset in Settings, the game watches its own frame
// time while you play: after a short warm-up it takes the median of a few seconds of frames (shader compiles and other
// one-off hitches don't count) and, if that is slower than ~50 fps, steps the preset down one notch and measures again
// (high -> medium -> low; straight to low when it is far too slow). The result is remembered (settings.autoQuality, so
// the next boot starts there) and a toast says what happened and where to change it. Picking a preset by hand turns it off.
//   const aq = autoQuality(game, { onChange(name) })   aq.frame(realDtSeconds) every gameplay frame
import { QUALITY } from './renderer.js';

const ORDER = ['low', 'medium', 'high', 'ultra'];
const NAMES = { low: 'Low', medium: 'Medium', high: 'High', ultra: 'Ultra' };
const WARM = 2.5, MEASURE = 4; // seconds
const TARGET = 1 / 50, WAY_OFF = 1 / 24;

export function autoQuality(game, { onChange = () => {} } = {}) {
  const s = game.state.settings;
  const R = game.renderer;
  let phase = 'warm', t = 0, samples = [], done = !!s.quality, dropped = false;
  // the last boot's verdict, unless the player has chosen one
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
      if (med > TARGET && i > 0) { set(med > WAY_OFF && i > 1 ? 'low' : ORDER[i - 1]); return; }
      // settled
      done = true;
      s.autoQuality = R.qualityName;
      if (dropped) game.news(`Graphics set to ${NAMES[R.qualityName]}`, 'For a smoother frame rate. You can change it any time in Settings (Esc).', 7000);
      game.save?.();
    },
  };
}
