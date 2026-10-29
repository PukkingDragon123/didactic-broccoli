// 8-bit voices for everyone who talks in speech bubbles (and the subtitles in cutscenes): a chiptune chirp per
// letter (audio.js 'voice'), pitched by the speaker's height and given one of three pulse timbres by their seed,
// so the same person always sounds the same.
//   bubbles.say(h, text, { onChar: talk(h) })      talk(h, { vol }) -> onChar callback
import { audio } from '../core/audio.js';

const DUTIES = [0.125, 0.25, 0.5];

/** The voice of a human (or anything with a height / seed): { base Hz, duty }. */
export function voiceOf(h) {
  if (!h.voice) {
    const H = h.height || h.P?.H || 1.65, s = Math.abs((h.spec?.seed ?? h.seed ?? 7) | 0);
    h.voice = { base: 150 + Math.max(0, 1.9 - H) * 300 + (s % 9) * 9, duty: DUTIES[s % 3] };
  }
  return h.voice;
}

/** An onChar callback that chirps every other letter, the way old RPG text boxes talk. */
export function talk(h, { vol = 1, base, duty } = {}) {
  const v = h ? voiceOf(h) : { base: base || 300, duty: duty || 0.25 };
  let n = 0;
  return (ch) => {
    if (!/[a-z0-9]/i.test(ch)) return;
    if (n++ % 2) return;
    try { audio.play('voice', { ch, base: base || v.base, duty: duty || v.duty, vol }); } catch { /* audio not ready */ }
  };
}
