// Manga sound effects for dramatic moments (an affectionate nod to a certain bizarre adventure): menacing ゴゴゴゴ,
// rumbling ドドドド or a big ドン!, popping up in a wobbling stagger. A DOM overlay in the pixel kana font.
//   menace({ kind: 'go' | 'do' | 'don', at: [x, y] (px; default: both screen edges), n, dur = 2.6, col })
//   toBeContinued(dur = 3.2)  sepia freeze-frame with the "TO BE CONTINUED" arrow sliding in (returns a Promise)
import './menacing.css';
import { audio } from '../core/audio.js';

const KINDS = {
  go: { ch: 'ゴ', col: '#b65cff', n: 4 },
  do: { ch: 'ド', col: '#ff5aa8', n: 4 },
  don: { ch: 'ドン!', col: '#ffd23f', n: 1 },
};
let layer = null;
function getLayer() {
  if (!layer) { layer = document.createElement('div'); layer.id = 'menace'; document.body.appendChild(layer); }
  return layer;
}

/** A column (or a few) of SFX glyphs; returns nothing, cleans itself up. */
export function menace({ kind = 'go', at = null, n, dur = 2.6, col, sound = true } = {}) {
  const K = KINDS[kind] || KINDS.go, L = getLayer();
  const W = innerWidth, H = innerHeight;
  const groups = at ? [{ x: at[0], y: at[1], dir: 1, small: true }] : [{ x: W * 0.06, y: H * 0.62, dir: 1 }, { x: W * 0.86, y: H * 0.5, dir: -1 }];
  const count = n ?? K.n;
  for (const gp of groups) {
    for (let i = 0; i < count; i++) {
      const el = document.createElement('span');
      el.className = 'mn' + (gp.small ? ' small' : '') + (kind === 'don' ? ' don' : '');
      el.textContent = K.ch;
      el.style.color = col || K.col;
      // a rising diagonal, each glyph a little bigger than the last
      const step = gp.small ? 26 : 58;
      el.style.left = `${Math.round(gp.x + i * step * 0.55 * gp.dir)}px`;
      el.style.top = `${Math.round(gp.y - i * step)}px`;
      el.style.animationDelay = `${i * 0.12}s, ${i * 0.12}s`;
      el.style.setProperty('--d', `${dur}s`);
      el.style.setProperty('--r', `${(gp.dir * (i % 2 ? 8 : -6))}deg`);
      L.appendChild(el);
      setTimeout(() => el.remove(), (dur + i * 0.12) * 1000 + 100);
    }
  }
  if (sound) { try { audio.play('menace', { kind }); } catch { /* audio not ready */ } }
}

/** The freeze-frame ending: sepia, the arrow slides in, a short sting. */
export function toBeContinued(dur = 3.2) {
  let cancel = null;
  const p = new Promise((res) => {
    document.body.classList.add('tbc');
    const el = document.createElement('div');
    el.id = 'tbc';
    el.innerHTML = '<span class="tbc-arrow"></span><span class="tbc-txt">TO BE CONTINUED</span>';
    document.body.appendChild(el);
    try { audio.play('tbc'); } catch { /* audio not ready */ }
    const t1 = setTimeout(() => { el.classList.add('out'); document.body.classList.remove('tbc'); }, dur * 1000);
    const t2 = setTimeout(() => { el.remove(); res(); }, dur * 1000 + 500);
    cancel = () => { clearTimeout(t1); clearTimeout(t2); document.body.classList.remove('tbc'); el.remove(); res(); };
  });
  p.cancel = cancel;
  return p;
}
