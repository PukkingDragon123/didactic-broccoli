// The drive's paper UI: a sticky note taped low on the left with the controls (W go · A/D steer · Space brake · H horn;
// it fades once you're rolling down the lane), a receipt-paper ticket for the radio station, a prompt card, and the
// cutscene layer's hold-to-skip bar (re-used: Space brakes here, so it's hold Enter, or the touch SKIP button).
//   ui.show(on)   ui.noteAway()   ui.ticket(text, jp)   ui.prompt(html | null)   ui.skipBar(k 0..1 | null)
import './drive.css';

export class DriveUI {
  constructor(game) {
    this.game = game;
    const el = document.createElement('div');
    el.id = 'drive-ui';
    el.innerHTML = `<div class="dn"><div class="h">Grandpa's van</div>
      <div class="r"><span class="k">W</span>go</div>
      <div class="r"><span class="k">A / D</span>steer</div>
      <div class="r"><span class="k">Space</span>brake</div>
      <div class="r"><span class="k">H</span>horn</div></div>
      <div class="tk"></div><div class="pr"></div>`;
    document.body.appendChild(el);
    this.el = el;
    this.note = el.querySelector('.dn');
    this.tk = el.querySelector('.tk');
    this.pr = el.querySelector('.pr');
    this.cut = document.getElementById('cutscene');
    this.skipEl = this.cut?.querySelector('.skip');
    this.skipLbl = this.skipEl?.querySelector('.lbl');
    this.skipFill = this.skipEl?.querySelector('.fill');
  }

  show(on) {
    document.body.classList.toggle('driving', on);
    if (on) { this.note.classList.remove('gone'); this.prompt(null); }
    else { this.skipBar(null); this.prompt(null); this.tk.classList.remove('show'); }
  }

  noteAway() { this.note.classList.add('gone'); }

  ticket(text, jp = '') {
    this.tk.innerHTML = `${text}${jp ? `<span class="jp">${jp}</span>` : ''}`;
    this.tk.classList.add('show');
    clearTimeout(this._tk);
    this._tk = setTimeout(() => this.tk.classList.remove('show'), 2600);
  }

  prompt(html) {
    if (!html) { this.pr.classList.remove('show'); return; }
    this.pr.innerHTML = html;
    this.pr.classList.add('show');
  }

  /** The cutscene layer's skip bar (only while no cutscene owns it). k: fill 0..1; null hides it. */
  skipBar(k) {
    const cs = this.game.cutscene;
    if (!this.cut || cs?.active) return;
    if (k === null || k <= 0.04) {
      if (this.cut.classList.contains('drive-skip')) { this.skipEl.classList.remove('show'); this.cut.classList.remove('on', 'drive-skip'); if (this._lbl !== undefined) this.skipLbl.textContent = this._lbl; }
      return;
    }
    if (!this.cut.classList.contains('drive-skip')) {
      this.cut.classList.add('on', 'drive-skip');
      this._lbl = this.skipLbl.textContent;
      this.skipLbl.textContent = this.game.input.touch ? 'Hold to skip' : 'Hold Enter to skip';
    }
    this.skipEl.classList.add('show');
    this.skipFill.style.transform = `scaleX(${Math.min(1, k)})`;
  }

  dispose() { this.show(false); this.el.remove(); }
}
