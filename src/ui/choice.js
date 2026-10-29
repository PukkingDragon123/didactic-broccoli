// A tiny dialogue-choice box (bottom centre, over the cutscene subtitles' space). Works with the pointer locked
// (number keys, W/S or the wheel to move, click / E / Enter to pick) and with a free cursor or touch (tap a button).
//   const i = await choose(game, ['Nice hair.', 'Is that bread?'])
//   in a cutscene script:  const i = yield* ask(c, game, ['A', 'B'])   (skipping the cutscene picks `def`)
import './sidequests.css';
import { audio } from '../core/audio.js';

let el = null;
function root() {
  if (!el) { el = document.createElement('div'); el.id = 'sq-choice'; document.body.appendChild(el); }
  return el;
}
const sfx = (n, v = 0.4) => { try { audio.play(n, { vol: v }); } catch { /* audio not ready */ } };

/** Show options; resolves with the picked index. */
export function choose(game, options, { def = 0 } = {}) {
  const box = root();
  let sel = 0, done = false, resolve;
  const prevUi = game.uiOpen;
  game.uiOpen = true;
  box.innerHTML = options.map((o, i) => `<button data-i="${i}"><span class="n">${i + 1}</span>${o}</button>`).join('')
    + `<div class="hint">${document.body.classList.contains('touchmode') ? 'Tap to answer' : '1-' + options.length + ' or click'}</div>`;
  const btns = [...box.querySelectorAll('button')];
  const paint = () => btns.forEach((b, i) => b.classList.toggle('sel', i === sel));
  paint();
  box.classList.add('on');
  const finish = (i) => {
    if (done) return;
    done = true;
    box.classList.remove('on');
    game.uiOpen = prevUi;
    window.removeEventListener('keydown', onKey, true);
    clearInterval(poll);
    sfx('uiClick', 0.5);
    resolve(i);
  };
  // (capture phase on window: runs before the game's Input, which then never sees the keys we used)
  const onKey = (e) => {
    const n = /^Digit(\d)$/.exec(e.code), eat = () => { e.preventDefault(); e.stopPropagation(); };
    if (n) { eat(); if (+n[1] >= 1 && +n[1] <= options.length) finish(+n[1] - 1); return; }
    if (e.code === 'KeyW' || e.code === 'ArrowUp') { eat(); sel = (sel + options.length - 1) % options.length; paint(); sfx('uiHover', 0.3); }
    if (e.code === 'KeyS' || e.code === 'ArrowDown') { eat(); sel = (sel + 1) % options.length; paint(); sfx('uiHover', 0.3); }
    if (e.code === 'KeyE' || e.code === 'Enter') { eat(); finish(sel); }
  };
  window.addEventListener('keydown', onKey, true);
  btns.forEach((b, i) => {
    b.addEventListener('pointerenter', () => { sel = i; paint(); });
    b.addEventListener('click', (e) => { e.stopPropagation(); finish(i); if (!game.input.locked && !game.input.touch) game.input.lock?.(); });
  });
  // with the pointer locked the DOM never sees the mouse: use the game's input (click / wheel)
  const inp = game.input;
  const poll = setInterval(() => {
    if (done || !inp.locked) return;
    if (inp.mouse.wheel) { sel = (sel + options.length + Math.sign(inp.mouse.wheel)) % options.length; inp.mouse.wheel = 0; paint(); }
  }, 30);
  const p = new Promise((r) => { resolve = r; });
  p.cancel = () => finish(def);
  p.pick = (i) => finish(i);
  p.clickSel = () => finish(sel);
  return p;
}

/** Cutscene waiter form: `const i = yield* ask(c, game, options)`. */
export function* ask(c, game, options, { def = 0 } = {}) {
  if (c.skipping) return def;
  let res = null;
  const p = choose(game, options, { def });
  p.then((i) => { res = i; });
  let armed = false;
  yield {
    update: () => {
      if (c.skipping && res === null) p.cancel();
      // a fresh click with the pointer locked picks the highlighted line (ignore the click that was already down)
      const inp = game.input;
      if (!inp.button(0)) armed = true;
      else if (armed && inp.locked && inp.buttonDown(0)) p.clickSel();
      return res !== null;
    },
  };
  return res ?? def;
}
