// Settings > Skip tutorial, for returning players: Grandpa's guided first day (src/grandpa/director.js) is strict (he
// leads, won't let you skip ahead, fetches you back), so people who've done it before can turn it off. On: a new game
// goes from meeting him straight to a clean garage (he leaves for Atami without the goodbye scene); ticked during the
// opening, the clean-up is done at once. The setting lives in game.state.settings, so it carries over to new saves.
export function install(game) {
  const s = game.state.settings;
  if (s.skipTutorial === undefined) s.skipTutorial = false;
  const rows = document.querySelector('#pause .rows');
  if (!rows || document.getElementById('skip-tut')) return;
  const label = document.createElement('label');
  label.className = 'row';
  label.innerHTML = '<span class="lbl" data-icon="play">Skip tutorial</span><input type="checkbox" id="skip-tut" />';
  const hints = document.getElementById('hints')?.closest('label');
  if (hints?.parentNode === rows) hints.after(label); else rows.append(label);
  const box = label.querySelector('input');
  box.checked = !!s.skipTutorial;
  box.addEventListener('change', () => {
    s.skipTutorial = box.checked;
    // mid-opening, with Grandpa still guiding: do it now
    const gp = game.grandpa;
    if (box.checked && gp && gp.mode === 'guide' && !game.story?.done) gp.skipTutorial();
    game.save?.();
  });
}
