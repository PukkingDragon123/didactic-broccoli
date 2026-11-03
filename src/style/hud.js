// Minimal HUD (setting "Minimal HUD", on by default): the always-on paper HUD becomes contextual.
//  - the wallet receipt (#money) slides in only while your cash changes, then tucks away
//  - the clock ticket (#simclock: time, energy, level) shows briefly on the hour, on a new day, when you eat, level up or
//    run low on energy
//  - Grandpa's note / the goal card (#guide) tucks up under the top edge after a few seconds, leaving its bottom strip;
//    it drops back down when the goal changes
//  - the side quest list shows when a quest moves on
//  - the hotbar's tags slide down to a thin row of tag tops when you're not switching or picking things up
//  - crosshair hints drop their second line once you've seen it a few times (lines with prices / counts stay)
//  - hold Tab (or the wallet button on touch screens) to check: your hand pulls out your wallet with a wristwatch
//    (src/style/check.js) and everything peeks back in while you hold it
// It only toggles classes on the existing HUD elements (body.hud-min + body.pk-<part> / body.hud-check); the old
// always-on HUD is one checkbox away in the settings.
//   installMinimalHud(game) -> game.hudCtl = { peek(part, seconds), check(on), enabled, setEnabled(on) }
import './hud.css';
import { setIcon } from '../ui/staticIcons.js';

const PARTS = ['money', 'clock', 'guide', 'hotbar', 'quests'];

export function installMinimalHud(game) {
  const g = game, body = document.body, s = g.state.settings;
  if (s.minimalHud === undefined) s.minimalHud = true;
  const until = Object.fromEntries(PARTS.map((p) => [p, 0]));
  let now = performance.now() / 1000; // UI time: real seconds, whatever the frame rate
  const ctl = g.hudCtl = {
    get enabled() { return s.minimalHud !== false; },
    peek(part, sec = 3) { if (part in until) until[part] = Math.max(until[part], now + sec); },
    checking: false,
    fpCheck: false, // the 3D wallet is showing money + time (src/style/check.js)
    setEnabled(on) { s.minimalHud = !!on; body.classList.toggle('hud-min', !!on); swapPops(); g.save?.(); },
  };
  body.classList.toggle('hud-min', ctl.enabled);

  // ---- what makes each part peek
  const ev = g.events;
  ev.on('wallet', ({ kind, delta }) => { if (kind === 'cash' && delta) ctl.peek('money', 4); if (kind === 'withdraw' || kind === 'deposit') ctl.peek('money', 4); });
  ev.on('hour', () => ctl.peek('clock', 3.5));
  ev.on('newDay', () => { ctl.peek('clock', 6); ctl.peek('guide', 7); });
  ev.on('specialDay', () => ctl.peek('clock', 6));
  ev.on('levelUp', () => ctl.peek('clock', 6));
  ev.on('ate', () => ctl.peek('clock', 3));
  ev.on('exhausted', () => ctl.peek('clock', 5));
  ev.on('slot', () => ctl.peek('hotbar', 2.5));
  ev.on('held', () => ctl.peek('hotbar', 2.5));
  ev.on('pickup', () => ctl.peek('hotbar', 2.5));
  ev.on('sideQuest', () => { ctl.peek('quests', 7); ctl.peek('guide', 3); });
  ev.on('bill', ({ type }) => { if (type === 'paid') ctl.peek('money', 3); });
  // low energy: a reminder each time it drops past a mark (polled in the frame loop below)
  let lastE = 100, eT = 0;
  const energyCheck = () => {
    const N = g.needs;
    if (!N?.s) return;
    const e = N.s.energy / (N.max || 100) * 100;
    for (const m of [30, 15, 5]) if (lastE > m && e <= m) ctl.peek('clock', 5);
    lastE = e;
  };
  ctl.peek('guide', 9); ctl.peek('clock', 5); ctl.peek('money', 5); ctl.peek('hotbar', 5);

  // ---- XP pops float on their own while the clock ticket is tucked away
  const pops = document.createElement('div');
  pops.id = 'hm-pops';
  (document.getElementById('hud') || body).appendChild(pops);
  const H = g.simHud, pop0 = H?.pop?.bind(H);
  function swapPops() {
    if (!H || !pop0) return;
    H.pop = ctl.enabled ? (text) => {
      const p = document.createElement('span');
      p.className = 'hm-pop';
      p.textContent = text;
      pops.appendChild(p);
      setTimeout(() => p.remove(), 1500);
      while (pops.children.length > 3) pops.firstChild.remove();
    } : pop0;
  }
  swapPops();

  // ---- hints: the second line goes once you know it (unless it carries numbers: prices, counts, times)
  const I = g.interaction, set0 = I?.setHint?.bind(I);
  const seen = new Map();
  let lastText = '';
  if (set0) {
    I.setHint = (hint) => {
      if (hint?.text !== lastText) { lastText = hint?.text || ''; if (lastText) seen.set(lastText, (seen.get(lastText) || 0) + 1); }
      if (hint?.sub && ctl.enabled && (seen.get(hint.text) || 0) > 4 && !/[0-9¥]/.test(hint.sub)) hint = { ...hint, sub: '' };
      set0(hint);
    };
  }

  // ---- the goal card: peek when the goal changes
  let goalSig = '';
  const goalNow = () => { const G = g.guide; const sh = G?.shown; return sh ? `${G.label}|${sh.id}|${sh.text}` : ''; };

  // ---- settings row ("Minimal HUD", under "Show hints")
  const hints = document.getElementById('hints')?.closest('label');
  if (hints && !document.getElementById('hud-min')) {
    const row = document.createElement('label');
    row.className = 'row';
    row.innerHTML = '<span class="lbl" data-icon="eye">Minimal HUD</span><input type="checkbox" id="hud-min" />';
    hints.after(row);
    try { setIcon(row.querySelector('.lbl')); } catch { /* icons not ready */ }
    const box = row.querySelector('input');
    box.checked = ctl.enabled;
    box.addEventListener('change', () => ctl.setEnabled(box.checked));
    const tip = document.createElement('div');
    tip.className = 'hm-tip';
    tip.textContent = 'Hold Tab to check your wallet, watch and goal.';
    row.after(tip);
  }

  // ---- coming into play (from the title screen, a cutscene, the computer): everything shows for a moment
  const hudEl = document.getElementById('hud');
  let away = true;
  const awayNow = () => !!hudEl?.classList.contains('hidden') || body.classList.contains('cine') || !!g.pc?.active || body.classList.contains('dressing');
  const back = () => { ctl.peek('guide', 8); ctl.peek('clock', 5); ctl.peek('money', 5); ctl.peek('hotbar', 4); ctl.peek('quests', 6); };

  // ---- per frame: classes on <body>
  const cls = {};
  const toggle = (c, on) => { if (cls[c] !== on) { cls[c] = on; body.classList.toggle(c, on); } };
  g.constructor.updaters.push(() => {
    now = performance.now() / 1000;
    if (now - eT > 1) { eT = now; energyCheck(); }
    const a = awayNow();
    if (away && !a) back();
    away = a;
    const sig = goalNow();
    if (sig !== goalSig) { if (sig) ctl.peek('guide', 7); goalSig = sig; }
    const chk = ctl.checking;
    toggle('hud-check', chk);
    for (const p of PARTS) {
      const fpShows = chk && ctl.fpCheck && (p === 'money' || p === 'clock');
      toggle('pk-' + p, (until[p] > now || chk) && !fpShows);
    }
  });
  return ctl;
}
