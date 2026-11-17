// The rival: Gōda Tetsuzan of the Capsule Kingdom by the station (an original character) walks up the lane one
// afternoon to see what the fuss is about, and the two shopkeepers settle it the only honest way: a pose-off.
// A letterboxed standoff (feet-up low angle, a tilted two-shot, a narrow-lens stare and an impact frame), then three
// rounds: he strikes a pose, you answer with one of yours. Power beats Mystery, Mystery beats Grace, Grace beats
// Power. Win and he leaves you his yen shades and a fat envelope; lose and he'll be back in a few days. Either way:
// TO BE CONTINUED. He stops coming once you've beaten him (or after four visits).
//   const R = new Rival(game, jojo)   R.update(dt) (checks whether he comes today)   R.start({ now })   R.active
// Save (game.state.jojo.rival): { visits, wins, losses, draws, next (day), done }
import * as THREE from 'three';
import { makeCast, CAST, line, walker } from './cast.js';
import { POSE_INFO } from './poses.js';
import { poseScene, STYLE_KANJI, STYLE_NAME } from './pose.js';
import { V, orbit, standIn } from '../cinema/shots.js';
import { sting } from '../cinema/stings.js';
import { audio } from '../core/audio.js';

const BEATS = { power: 'mystery', mystery: 'grace', grace: 'power' }; // key beats value
const COUNTER = { mystery: 'power', grace: 'mystery', power: 'grace' }; // what beats the key
const HIS = ['pose_tower', 'pose_coil', 'pose_frame', 'pose_reach', 'pose_sweep', 'pose_guard', 'pose_point', 'pose_cross', 'pose_lean'];
const TAUNT = {
  pose_tower: 'Behold! The Tower of Commerce!',
  pose_coil: 'Can your eyes even follow THIS spine?',
  pose_frame: 'A face fit for a poster. Mine.',
  pose_reach: 'I reach out... and take your customers!',
  pose_sweep: 'A bow. For the end of your little garage.',
  pose_guard: 'Come, then. Show me what you sell.',
  pose_point: 'YOU. Yes, you.',
  pose_cross: 'Relaxed. Effortless. Infuriating, isn\'t it?',
  pose_lean: 'Lean back... and look down on you.',
};
// the marks in the lane in front of your shutter
const ME = V(0.4, 0, 7.25), HIM = V(0.4, 0, 9.85), ENTER = V(17, 0, 9.6);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export class Rival {
  constructor(game, jojo) {
    this.game = game;
    this.J = jojo;
    this.s = jojo.s.rival;
    this.h = null;
    this.active = false;
    this.checkT = 4;
    this.card = document.createElement('div');
    this.card.id = 'pose-off';
    this.card.className = 'hidden';
    this.board = document.createElement('div');
    this.board.id = 'pose-score';
    this.board.className = 'hidden';
    document.body.append(this.card, this.board);
    this.marks = [];
  }

  /** Does he come today? (afternoon, the shop open, you in or around it, nothing else going on) */
  update(dt) {
    if (this.active) { this.walkTick(dt); return; }
    if ((this.checkT -= dt) > 0) return;
    this.checkT = 6;
    const g = this.game, s = this.s, c = g.clock;
    if (s.done || !g.story?.done || !c || g.visiting || g.mp?.active) return;
    if (c.day < (s.next || 3) || s.lastDay === c.day) return;
    if (c.hours < 13.5 || c.hours > 18) return;
    if (!this.free()) return;
    const P = g.player.pos;
    if (Math.abs(P.x) > 8 || P.z < -1 || P.z > 13) return;
    if (Math.random() < 0.35) this.start();
  }

  free() {
    const g = this.game;
    return !g.cutscene?.active && !g.talk?.active && !g.pc?.active && !g.uiOpen && !g.jojo?.photo?.active && !g.timeStop?.active;
  }

  /** He comes up the lane (now: straight into the standoff, for tests). */
  start({ now = false } = {}) {
    if (this.active) return false;
    const g = this.game, s = this.s;
    this.active = true;
    s.visits = (s.visits || 0) + 1;
    s.lastDay = g.clock?.day ?? 0;
    const h = this.h || (this.h = makeCast('goda'));
    CAST.goda.h = h;
    g.scene.add(h.root);
    h.root.visible = true;
    this.walk = walker(h);
    if (now) { h.root.position.copy(HIM); h.root.rotation.set(0, Math.PI, 0); this.standoff(); return true; }
    h.root.position.copy(ENTER);
    h.root.rotation.set(0, -Math.PI / 2, 0);
    this.walk.to(HIM.x + 1.2, HIM.z, 1.35);
    this.phase = 'walk';
    this.walkT = 0;
    g.jojo.kana.spawn({ kind: 'do', at: h, n: 4, dur: 3.2, side: -1 });
    sting('menace');
    g.news?.(s.visits > 1 ? 'Gōda Tetsuzan is back' : 'A sharp-dressed man is walking up the lane', s.visits > 1 ? 'A rematch, by the look of him' : 'ドドドド...');
    return true;
  }

  walkTick(dt) {
    if (this.phase !== 'walk') return;
    const g = this.game, P = g.player.pos;
    this.walkT += dt;
    const arrived = this.walk.update(dt, g.camera.position);
    const near = Math.hypot(this.h.root.position.x - P.x, this.h.root.position.z - P.z) < 5.5;
    if ((arrived || near || this.walkT > 16) && this.free()) { this.phase = 'scene'; this.standoff(); }
    if (this.walkT > 40) this.leave(true);
  }

  standoff() {
    const g = this.game;
    this.phase = 'scene';
    g.cutscene.play((c) => this.scene(c), { skippable: true }).then(() => this.cleanup());
  }

  leave(silent = false) {
    if (!silent) return;
    this.cleanup();
  }

  cleanup() {
    const g = this.game;
    this.active = false;
    this.phase = null;
    this.card.className = 'hidden';
    this.board.className = 'hidden';
    if (this.h) { this.h.clearGesture?.(); this.h.root.visible = false; this.h.root.parent?.remove(this.h.root); }
    this.stand?.hide();
    g.jojo.kana.clear();
    g.save?.();
  }

  // ------------------------------------------------------------------ the scene
  *scene(c) {
    const g = this.game, J = g.jojo, h = this.h, W = this.walk, s = this.s, P = g.player;
    const first = (s.wins || 0) + (s.losses || 0) + (s.draws || 0) === 0;
    c.every((dt) => {
      W.update(dt, this.stand?.h.root.visible ? this.stand.h.headTop(new THREE.Vector3()) : c.game.camera.position);
      if (!W.moving && this.phase !== 'leave') W.face(Math.atan2(ME.x - h.root.position.x, ME.z - h.root.position.z), dt); // squared up to you
    });
    // you take your mark in front of the shutter; your own character stands in for the shots
    P.pos.copy(ME); P.yaw = Math.PI; P.pitch = 0;
    const S = this.stand = standIn(g);
    S.show(ME, 0);
    c.every((dt) => S.update(dt, h.headTop(new THREE.Vector3())));
    W.to(HIM.x, HIM.z, 1.2);
    h.root.position.set(HIM.x + 1.3, 0, HIM.z);
    // 1. his shoes, from the ground, coming to a stop: ドドド
    sting('standoff');
    yield c.cam({ pos: V(HIM.x - 0.9, 0.18, HIM.z - 1.6), look: V(HIM.x + 0.2, 1.2, HIM.z), fov: 42 });
    c.roll = 0.16;
    J.kana.spawn({ kind: 'do', at: h, n: 4, dur: 4, side: 1 });
    yield c.all(c.cam({ pos: V(HIM.x - 0.75, 0.22, HIM.z - 1.45), look: V(HIM.x, 1.45, HIM.z), dur: 2.0 }), c.wait(1.4));
    yield line(c, g, 'goda', first ? 'So. THIS is the "Gacha Garage" the whole lane keeps whispering about.' : 'Garage keeper. I said I would return.');
    // 2. the tilted two-shot: you in the foreground, him squared up
    yield c.cam({ pos: V(ME.x - 0.75, 1.45, ME.z - 0.95), look: V(HIM.x + 0.15, 1.45, HIM.z), fov: 46 });
    c.roll = -0.1;
    yield c.all(c.cam({ pos: V(ME.x - 0.7, 1.5, ME.z - 0.8), look: V(HIM.x + 0.1, 1.5, HIM.z), dur: 3.2 }), first
      ? line(c, g, 'goda', 'Gōda Tetsuzan. The Capsule Kingdom, by the station. Forty machines. Air conditioning. A LOYALTY CARD.')
      : line(c, g, 'goda', 'My spine has trained. My loyalty card now has a hologram.'));
    if (first) {
      yield line(c, g, 'me', pick(['...Is that a loyalty card in your pocket?', '...Okay?', 'We have a cat.']), { h: S.h });
      yield line(c, g, 'goda', 'Your customers keep coming back. MY customers keep asking why. I do not like questions.');
    }
    // 3. the stare: a narrow lens on his eyes, then the impact frame
    yield c.cam({ pos: V(HIM.x - 0.25, 1.6, HIM.z - 1.2), look: V(HIM.x, 1.62, HIM.z), fov: 30 });
    c.roll = 0.05;
    J.kana.spawn({ kind: 'go', at: h, n: 3, dur: 3, side: -1 });
    yield c.all(c.cam({ pos: V(HIM.x - 0.18, 1.62, HIM.z - 0.95), look: V(HIM.x, 1.63, HIM.z), dur: 1.6, fov: 18 }), line(c, g, 'goda', 'Between shopkeepers there is only one honest way to settle this...'));
    h.gesture('pose_point');
    sting('impact');
    J.kana.spawn({ kind: 'don', screen: [0.5, 0.2], size: 1.2, dur: 1.8, sound: false });
    yield c.all(this.impact(c, h.headTop(new THREE.Vector3()), { palette: ['violet', 'blood'], dur: 0.8 }), line(c, g, 'goda', 'A POSE-OFF!', { style: 'shout', hold: 1.0 }));
    // 4. the wide: both of you in the lane, the rules
    yield c.cam({ pos: V(3.6, 1.25, 8.55), look: V(0.4, 1.3, 8.55), fov: 50 });
    c.roll = 0;
    yield c.all(orbit(c, { center: V(0.4, 0, 8.55), radius: 3.2, from: Math.PI / 2 + 0.12, to: Math.PI / 2 - 0.1, height: 1.25, look: V(0.4, 1.3, 8.55), dur: 4.2 }),
      line(c, g, 'goda', 'Three rounds. Power crushes Mystery. Mystery bewitches Grace. Grace outclasses Power. Even a child knows this.'));
    // ------------------------------------------------ the rounds (not skippable: they're yours to play)
    c.skipping = false;
    c.skippable = false;
    let mine = 0, his = 0;
    this.marks = [];
    this.score(0, 0, 1);
    const used = new Set();
    for (let round = 1; round <= 3; round++) {
      const pose = pick(HIS.filter((p) => !used.has(p)));
      used.add(pose);
      const style = POSE_INFO[pose].style;
      // he strikes it: low front angle, a slow push in, his lettering
      h.gesture(pose, { hold: true });
      sting('pose');
      yield c.cam({ pos: V(HIM.x - 0.6, 0.85, HIM.z - 2.0), look: V(HIM.x, 1.35, HIM.z), fov: 44 });
      c.roll = round % 2 ? 0.12 : -0.12;
      J.kana.spawn({ kind: round === 3 ? 'do' : 'go', at: h, n: 3, dur: 3.4, side: round % 2 ? 1 : -1 });
      yield c.all(c.cam({ pos: V(HIM.x - 0.5, 0.95, HIM.z - 1.7), look: V(HIM.x, 1.4, HIM.z), dur: 2.0, fov: 38 }), line(c, g, 'goda', TAUNT[pose], { hold: 0.8 }));
      // your answer, on the side two-shot
      yield c.cam({ pos: V(3.3, 1.3, 8.5), look: V(0.4, 1.25, 8.55), fov: 48 });
      c.roll = 0;
      const ans = yield* this.choose(c, round, pose, style);
      const yourStyle = ans ? POSE_INFO[ans].style : null;
      const result = !ans ? -1 : yourStyle === COUNTER[style] ? 1 : yourStyle === style ? 0 : -1;
      if (ans) {
        P.yaw = Math.PI;
        S.h.root.rotation.set(0, 0, 0);
        yield* poseScene(c, g, ans, { kana: result > 0 ? 'go' : null, hold: 1.4, swing: false, side: round % 2 ? -1 : 1, tick: false, keep: true });
      } else {
        S.h.gesture('shrug');
        yield c.cam({ pos: V(ME.x + 0.9, 1.35, ME.z + 1.6), look: V(ME.x, 1.3, ME.z), fov: 46 });
        yield line(c, g, 'me', '...Um.', { h: S.h, hold: 0.7 });
      }
      if (result > 0) {
        mine++;
        sting('impact');
        J.kana.spawn({ kind: 'don', screen: [0.5, 0.22], dur: 1.6, sound: false });
        h.gesture('pose_shock');
        yield c.all(this.impact(c, S.h.headTop(new THREE.Vector3()), { palette: ['acid', 'violet'], dur: 0.7 }), c.wait(0.2));
        yield c.cam({ pos: V(HIM.x + 0.7, 1.5, HIM.z - 1.4), look: V(HIM.x, 1.55, HIM.z), fov: 40 });
        yield line(c, g, 'goda', pick(['Gh...! That angle...!', 'My... my elbow... trembles?!', 'Wh... what IS that spine?!']), { hold: 0.9 });
      } else if (result === 0) {
        yield c.cam({ pos: V(3.3, 1.3, 8.5), look: V(0.4, 1.25, 8.55), fov: 48 });
        yield line(c, g, 'goda', pick(['...Hm. A mirror.', 'The same element. How dull.', 'A stalemate. For now.']), { hold: 0.8 });
      } else {
        his++;
        sting('impact');
        yield c.all(this.impact(c, h.headTop(new THREE.Vector3()), { palette: ['blood', 'ice'], dur: 0.6, lines: 'side', dir: -1 }), c.wait(0.1));
        yield c.cam({ pos: V(HIM.x - 0.6, 1.0, HIM.z - 1.8), look: V(HIM.x, 1.45, HIM.z), fov: 40 });
        yield line(c, g, 'goda', ans ? pick(['Too soft! Your elbow betrays you!', 'HA! Did you learn that from a cat?', 'Predictable. Like a ¥100 machine.']) : 'Frozen stiff! Like your prices!', { hold: 0.9 });
      }
      this.score(mine, his, round, result);
      h.clearGesture(); S.h.clearGesture();
    }
    this.card.className = 'hidden';
    this.board.className = 'hidden';
    c.skippable = true;
    // ------------------------------------------------ the verdict
    const won = mine > his, lost = his > mine;
    if (won) { s.wins = (s.wins || 0) + 1; s.done = true; } else if (lost) s.losses = (s.losses || 0) + 1; else s.draws = (s.draws || 0) + 1;
    s.next = (g.clock?.day ?? 0) + 3;
    if (s.visits >= 4) s.done = true;
    g.events.emit('poseOff', { win: won, lose: lost, mine, his });
    if (won) {
      h.gesture('pose_shock');
      sting('win');
      yield c.cam({ pos: V(HIM.x - 0.3, 0.5, HIM.z - 1.5), look: V(HIM.x, 1.5, HIM.z), fov: 36 });
      c.roll = -0.18;
      J.kana.spawn({ kind: 'ban', screen: [0.5, 0.24], dur: 2.2 });
      yield c.all(this.impact(c, h.headTop(new THREE.Vector3()), { palette: ['violet', 'acid', 'blood'], dur: 1.0 }), line(c, g, 'goda', 'Im... impossible! Such SPINE...! Such ANGLES...!', { style: 'shout' }));
      c.roll = 0;
      yield c.cam({ pos: V(ME.x - 0.6, 1.45, ME.z - 0.9), look: V(HIM.x, 1.4, HIM.z), fov: 46 });
      yield line(c, g, 'goda', 'Enjoy your little garage, keeper. While it lasts. The Kingdom never forgets!');
      // he drops his shades and goes, fast
      const reward = s.wins === 1 ? 5000 : 2000;
      g.addMoney?.(reward);
      g.progress?.addXP?.(150, 'rival');
      this.grantShades();
    } else {
      sting(lost ? 'lose' : 'reveal');
      h.gesture(lost ? 'pose_tower' : 'pose_cross');
      yield c.cam({ pos: V(HIM.x - 0.5, 0.7, HIM.z - 1.9), look: V(HIM.x, 1.5, HIM.z), fov: 40 });
      c.roll = 0.12;
      J.kana.spawn({ kind: lost ? 'go' : 'zun', at: h, n: 3, dur: 3.2 });
      yield line(c, g, 'goda', lost ? 'As expected. Come back when your backbone has grown a backbone.' : 'A draw?! ...Then this was merely the first chapter.');
      c.roll = 0;
    }
    // he walks off east without looking back; the frame freezes on it
    this.phase = 'leave';
    W.to(ENTER.x, ENTER.z, won ? 2.4 : 1.4);
    yield c.cam({ pos: V(-1.6, 1.35, 7.2), look: V(3.5, 1.3, 9.8), fov: 48 });
    yield c.all(c.cam({ pos: V(-1.5, 1.4, 7.4), look: V(5.5, 1.3, 9.8), dur: 1.6 }), c.wait(1.4));
    if (!c.skipping) yield c.tbc(3.0);
    S.hide();
    yield c.toPlayer(0.6);
    if (won) g.news?.('You won the pose-off!', `¥${(s.wins === 1 ? 5000 : 2000).toLocaleString()} and a pair of yen shades he left behind`);
    else g.news?.(lost ? 'Gōda won the pose-off' : 'The pose-off was a draw', 'He\'ll be back in a few days. Practise your poses (V)');
  }

  /** An impact frame as a cutscene waiter. */
  impact(c, at, o) {
    let done = false;
    if (c.skipping) return null;
    this.game.jojo.impact.frame({ at, ...o }).then(() => { done = true; });
    return { update: () => done || c.skipping };
  }

  /** The answer card: three of your poses (one of each element when you know them), 6 s to pick. Returns a pose or null. */
  *choose(c, round, pose, style) {
    const g = this.game, J = g.jojo, inp = g.input;
    const learned = J.s.learned.filter((p) => POSE_INFO[p]?.style);
    const opts = [];
    for (const st of ['power', 'grace', 'mystery']) { const mine = learned.filter((p) => POSE_INFO[p].style === st); if (mine.length) opts.push(pick(mine)); }
    while (opts.length < 3 && learned.length > opts.length) { const p = pick(learned); if (!opts.includes(p)) opts.push(p); }
    opts.sort(() => Math.random() - 0.5);
    const TIME = 6;
    let t = 0, sel = 0, chosen = null;
    const render = () => {
      const left = Math.max(0, 1 - t / TIME);
      this.card.className = '';
      this.card.innerHTML = `<div class="po-card"><div class="po-head"><span>Round ${round}</span><b>${esc(POSE_INFO[pose].name)}</b><i class="st st-${style}">${STYLE_KANJI[style]}</i><small>${STYLE_NAME[style]}</small></div>`
        + `<div class="po-opts">${opts.map((p, i) => `<button class="po-opt${i === sel ? ' sel' : ''}" data-i="${i}"><kbd>${i + 1}</kbd><b>${esc(POSE_INFO[p].name)}</b><i class="st st-${POSE_INFO[p].style}">${STYLE_KANJI[POSE_INFO[p].style]}</i></button>`).join('')}</div>`
        + `<div class="po-time"><span style="width:${Math.round(left * 100)}%"></span></div><div class="po-rule"><i class="st st-power">力</i> beats <i class="st st-mystery">謎</i> beats <i class="st st-grace">雅</i> beats <i class="st st-power">力</i></div></div>`;
      this.card.querySelectorAll('.po-opt').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); chosen = opts[+b.dataset.i]; }));
    };
    render();
    const prevUi = g.uiOpen;
    g.uiOpen = true; // the number keys answer here, not in the hotbar
    try { audio.play('paper', { vol: 0.5 }); } catch { /* */ }
    let lastW = -1;
    yield c.until((dt) => {
      t += dt;
      for (let i = 0; i < opts.length; i++) if (inp.keyPressed('Digit' + (i + 1))) chosen = opts[i];
      if (inp.mouse.wheel) { sel = (sel + Math.sign(inp.mouse.wheel) + opts.length) % opts.length; render(); }
      if (inp.locked && inp.mouse.down[0]) chosen = opts[sel];
      const w = Math.ceil((1 - t / TIME) * 20);
      if (w !== lastW) { lastW = w; const bar = this.card.querySelector('.po-time span'); if (bar) bar.style.width = `${Math.max(0, w * 5)}%`; if (t > TIME - 2 && w % 2 === 0) { try { audio.play('clockTick', { vol: 0.4 }); } catch { /* */ } } }
      return chosen || t >= TIME;
    });
    this.card.className = 'hidden';
    g.uiOpen = prevUi;
    return chosen;
  }

  /** The scorecard: a receipt strip at the top with a hanko per round (〇 yours, ✕ his, △ a draw). */
  score(mine, his, round, result = null) {
    if (result !== null) this.marks.push(result > 0 ? 'win' : result < 0 ? 'loss' : 'draw');
    const cell = (i) => { const m = this.marks[i]; return `<i class="mk ${m || 'none'}">${m === 'win' ? '〇' : m === 'loss' ? '✕' : m === 'draw' ? '△' : ''}</i>`; };
    this.board.className = '';
    this.board.innerHTML = `<div class="ps-card"><span class="ps-who">You <b>${mine}</b></span><span class="ps-marks">${[0, 1, 2].map(cell).join('')}</span><span class="ps-who">${esc(CAST.goda.short)} <b>${his}</b></span><small>Round ${Math.min(3, round)} of 3</small></div>`;
  }

  grantShades() {
    const g = this.game, a = g.state.avatar;
    if (!a) return;
    a.owned ||= [];
    if (!a.owned.includes('cx_yenshades')) { a.owned.push('cx_yenshades'); g.events.emit('cosmetic', { id: 'cx_yenshades', how: 'rival' }); }
  }
}
