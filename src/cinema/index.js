// Cinematic presentation: the camera grammar (src/cinema/shots.js), the moments that get a letterboxed shot
// (moments.js), music stings (stings.js), photo mode (photo.js) and subtitle pacing.
//   game.cinema.on (setting: "Cinematic moments" in the pause menu)   game.cinema.sting(kind)   game.cinema.photo
// Save: game.state.cinema = { on, firsts: { key: day } }.
import './cinema.css';
import { ensureState } from '../game/stateExt.js';
import { installCamera } from './shots.js';
import { sting } from './stings.js';
import { Moments } from './moments.js';
import { PhotoMode } from './photo.js';

export class Cinema {
  constructor(game) {
    this.game = game;
    this.s = ensureState(game, 'cinema', { on: true, firsts: {} });
    installCamera(game);
    this.paceSubtitles();
    this.moments = new Moments(game, this);
    this.photo = new PhotoMode(game);
    this.settingsRow();
  }

  get on() { return this.s.on !== false; }
  sting(kind, o) { sting(kind, o); }

  /** Subtitles stay up long enough to read: never less than ~0.26 s a word (an author's longer hold still wins). */
  paceSubtitles() {
    const c = this.game.cutscene;
    if (!c || c._paced) return;
    c._paced = true;
    const say = c.say.bind(c);
    c.say = (text, hold = 2.2, who = '', voice = null) => {
      const words = String(text).trim().split(/\s+/).length, typing = String(text).length / 38;
      return say(text, Math.max(hold, 0.6 + words * 0.26 - typing * 0.6), who, voice);
    };
  }

  /** A checkbox in the pause menu's settings. */
  settingsRow() {
    const rows = document.querySelector('#pause .rows');
    if (!rows || document.getElementById('cine-on')) return;
    const l = document.createElement('label');
    l.className = 'row';
    l.innerHTML = '<span class="lbl" data-icon="eye">Cinematic moments</span><input type="checkbox" id="cine-on" />';
    rows.appendChild(l);
    const cb = l.querySelector('input');
    cb.checked = this.on;
    cb.addEventListener('change', () => { this.s.on = cb.checked; this.game.save?.(); });
  }

  update(dt) {
    this.moments.update(dt);
    this.photo.update(dt);
  }
}
