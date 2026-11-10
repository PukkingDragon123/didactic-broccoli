// Opening a capsule, in your hands, step by step (the steps come from the capsule: cap.steps in src/game/Capsule.js),
// each a small knack rather than a long press (generous and quick on a plain capsule, a little more demanding on the
// rare ones, never a fail):
//   peel   hold LMB and drag round the seam, anticlockwise (the way the tab points): one turn round peels the band;
//          the capsule turns in your fingers with it. The wrong way round does nothing; on rare capsules a drag that is
//          too quick snags the strip for a moment. Only holding still peels it too, slowly.
//   crack  the capsule rocks in your fingers: press as it comes upright (the band on the gauge) and the seal snaps
//          clean; an off-beat press is a weak knock (three of those do it). Holding knocks by itself, slowly.
//   twist  press, press, press: one notch past the lugs a press, in an easy rhythm. Press too soon after the last and
//          your fingers slip (no notch; on rare capsules it slips back one). Holding ratchets round by itself, slowly.
//   pull   hold: the halves part.          foil   hold (or drag) to tear the wrap open.
// and only then the reveal (Reveal.open). A paper slip under the hint (src/gachakit/ritualGauge.js) shows the knack in
// hand. Progress is kept on the capsule's data (data.seal: steps done), so a half-opened capsule stays half-opened when
// you pocket it. Openers (the shop's tools) make every step quicker and its window wider. Touch: hold the use button
// and drag with the other thumb to peel; tap for the rest. RMB turns the capsule over in front of you.
// Wired into game.held without touching Held.js: installRitual(game) replaces its updateTwist and extends its hint.
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { OPENERS } from '../game/economy.js';
import { BAND_N } from './capsuleParts.js';
import { createGauge } from './ritualGauge.js';

const POSE = { capsule: [0.14, -0.13, -0.37, 0.25, 0.4, 0.1], twist: [0.02, -0.095, -0.4, 0.4, 0.15, 0.05], inspect: [0, -0.005, -0.24] };
const TEXT = {
  peel: ['Hold LMB', 'Drag anticlockwise round the seam'], crack: ['LMB', 'Crack the seal'], twist: ['LMB', 'Twist: press, press, press'], pull: ['Hold LMB', 'Pull the halves apart'], foil: ['Hold LMB', 'Tear the foil open'],
};
const SUB = {
  peel: 'Round once to peel it · holding peels slowly', crack: 'Press as it rocks upright', twist: 'An easy rhythm · too quick and it slips', pull: '', foil: '',
};
// how demanding each look is: [peel snag speed (rad/s), crack window (half width, 0..0.5), crack rock period (s),
//  twist gap (s), slip back a notch]
const KNACK = {
  plain: [Infinity, 0.21, 1.3, 0.14, false], glitter: [Infinity, 0.2, 1.25, 0.15, false], pearl: [15, 0.16, 1.1, 0.2, false],
  metal: [14, 0.15, 1.05, 0.22, true], gold: [12, 0.13, 0.95, 0.26, true], secret: [10.5, 0.11, 0.85, 0.3, true],
};
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const SEAL_NAME = { sticker: 'Crack the seal', foil: 'Split the foil seal', wax: 'Break the wax seal', hanko: 'Break the hanko seal' };
const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _e = new THREE.Euler(), Y = new THREE.Vector3(0, 1, 0);

export function capOf(it) { return it?.ent?.cap || it?.obj?.userData?.capRef || null; }

export function installRitual(g) {
  const H = g.held;
  const orig = H.updateTwist.bind(H), hint0 = H.hint.bind(H);
  const R = g.ritual = {
    beat: 0, kick: 0, spin: 0, acting: false, insp: false, rot: new THREE.Euler(0.1, 0, 0), zoom: 0, idle: 0, hold: 0, peelTick: -1, clicked: false, it: null,
    fx: 0, fy: -1, fa: -Math.PI / 2, wrong: 0, snag: 0, rock: 0, got: 0, flash: 0, notch: 0, lastNotch: -9, slip: 0, engaged: 0, msg: null, msgT: 0, look: false,
  };
  let gauge = null;
  try { gauge = createGauge(); } catch { /* no DOM (tests) */ }
  const say = (text, t = 1.1) => { R.msg = text; R.msgT = t; };
  const lookLock = (on) => { if (on === R.look) return; R.look = on; if (!R.insp) g.player.lookLocked = on; };
  // (a capsule that leaves the hands mid-peel gives the view back, and the slip goes)
  g.constructor.updaters.push(() => {
    const cap = H.item?.kind === 'capsule' ? capOf(H.item) : null;
    if (R.look && (!cap?.steps?.length || H.busy)) lookLock(false);
    if (!cap?.steps?.length || H.busy || R.insp) gauge?.hide();
  });
  const at = (cap, x, y, z) => cap.group.localToWorld(_v.set(x * cap.r, y * cap.r, z * cap.r)).clone();
  const fx = (o) => { try { g.effects.emit(o); } catch { /* effects not ready */ } };
  const scraps = (pos, colors, n, speed = 0.7) => { for (let i = 0; i < n; i++) fx({ sprite: 'confetti', pos: pos.clone(), vel: new THREE.Vector3((Math.random() - 0.5) * speed, 0.3 + Math.random() * speed, (Math.random() - 0.5) * speed), color: colors[i % colors.length], life: 0.9 + Math.random() * 0.5, size: 0.012, gravity: 2.4, drag: 2, flutter: 3, anim: 'loop', fps: 10, frame: i % 4, fade: 0.2, flip: true }); };

  /** The strip comes away: it falls out of your fingers and is gone. */
  const dropRibbon = (cap, band) => {
    band.dropped = true;
    const m = band.ribbon;
    m.geometry.setDrawRange(0, 22 * 6);
    H.anchor.attach(m);
    m.traverse((o) => o.layers.mask = cap.group.children[0].layers.mask);
    const p0 = m.position.clone(), r0 = m.rotation.clone();
    g.tweens.add({ dur: 0.55, update: (k) => { m.position.set(p0.x + 0.05 * k, p0.y - 0.42 * k * k, p0.z + 0.03 * k); m.rotation.set(r0.x + k * 2.2, r0.y + k * 1.3, r0.z - k * 1.6); }, done: () => m.parent?.remove(m) });
    band.holder.visible = false;
  };

  const finish = (it, cap, i) => {
    const s = cap.steps[i];
    it.data.seal = i + 1;
    R.beat = 0.16; R.hold = 0; R.clicked = false; R.peelTick = -1; R.got = 0; R.notch = 0; R.lastNotch = -9; R.wrong = 0; R.snag = 0; R.slips = 0; R.slipBack = false;
    lookLock(false);
    if (s.kind === 'peel') {
      const band = cap.bands[cap.steps.slice(0, i).filter((x) => x.kind === 'peel').length];
      if (band) { dropRibbon(cap, band); scraps(at(cap, 0.9, 0, 0.5), [band.tint, 0xffffff], 4, 0.5); }
      audio.play('tapeSnap', { vol: 0.8 });
    }
    if (i + 1 >= cap.steps.length) {
      // every seal is off: the pop, the mini-book, the figure
      R.acting = false; H.twisting = false; H.twist = 1;
      g.reveal.stopTool();
      g.reveal.open(it);
      return;
    }
    cap.setStage(i + 1, 0);
    if (s.kind === 'pull') { audio.play('capPull', { vol: 0.9 }); R.kick = 1; }
  };

  const drive = (it, cap, dt) => {
    const inp = g.input;
    if (cap._ritual !== it) {
      // a capsule new to the hands: pose it as far open as it was left (peeled bands stay peeled)
      cap._ritual = it;
      const at0 = Math.min(it.data.seal || 0, cap.steps.length - 1);
      cap.setStage(at0, 0);
      R.spin = cap.steps.slice(0, at0).filter((x) => x.kind === 'peel').length * Math.PI * 2; R.beat = 0;
    }
    const i = cap.stage.i, s = cap.steps[i];
    const free = !g.interaction.hover;
    const down = inp.button(0) && free, press = inp.buttonDown(0) && free;
    const speed = Math.min(4, 1.05 / (OPENERS[g.state.opener]?.time || 1.05));
    let p = cap.stage.p;
    // ---- look closer (RMB), when not in the middle of a pull
    const wantInsp = inp.button(2) && !down;
    if (wantInsp && !R.insp) { R.insp = true; H.inspecting = true; g.player.lookLocked = true; H.startTrans('inspect', 0.28); R.rot.set(0.25, 0, 0); R.zoom = 0; R.idle = 0; audio.play('whoosh', { vol: 0.4, dur: 0.2, v: 0.08 }); }
    else if (!wantInsp && R.insp) { R.insp = false; H.inspecting = false; g.player.lookLocked = false; H.startTrans(H.pose === 'inspect' ? 'capsule' : H.pose, 0.28); if (H.pose === 'inspect') H.pose = 'capsule'; }
    if (R.insp) {
      if (!H.trans) {
        const moved = Math.abs(inp.mouse.dx) + Math.abs(inp.mouse.dy) > 0.5;
        R.idle = moved ? 0 : R.idle + dt;
        R.rot.y += inp.mouse.dx * 0.008 + (R.idle > 1 ? dt * 0.7 : 0);
        R.rot.x = Math.max(-1.3, Math.min(1.3, R.rot.x + inp.mouse.dy * 0.008));
        if (inp.mouse.wheel) R.zoom = Math.max(-0.07, Math.min(0.1, R.zoom - inp.mouse.wheel * 0.02));
        it.obj.position.set(POSE.inspect[0], POSE.inspect[1], POSE.inspect[2] + R.zoom);
        it.obj.quaternion.setFromEuler(R.rot);
      }
      H.twisting = false; H.twist = 0;
      return;
    }
    // ---- both hands come in while you work on it (and stay in for a moment between presses)
    const K = KNACK[cap.look] || KNACK.plain, open = Math.min(1.6, 0.86 + 0.14 * speed);
    if (press) R.engaged = 1.1;
    R.engaged = Math.max(0, R.engaged - dt);
    const acting = down || R.engaged > 0 || (s.kind === 'twist' && p > 0.55 && p < 1);
    if (acting && !R.acting) { g.reveal.startTool(it); if (g.fp?.live && H.pose === 'capsule') H.startTrans('twist', 0.2); if (s.kind === 'pull') audio.play('twist', { dur: (s.dur || 1) / speed, vol: 0.7 }); }
    if (!acting && R.acting) g.reveal.stopTool();
    R.acting = acting;
    H.twisting = acting;
    R.hold = down ? R.hold + dt : 0;
    R.msgT = Math.max(0, R.msgT - dt); R.flash = Math.max(0, R.flash - dt); R.slip = Math.max(0, R.slip - dt);
    lookLock(s.kind === 'peel' && down && R.beat <= 0);
    if (R.beat > 0) R.beat -= dt;
    else if (s.kind === 'peel') {
      // a finger on the seam: the drag moves it round a ring; anticlockwise on screen is the way the strip comes away
      if (down) {
        const RAD = 70, mx = inp.mouse.dx, my = inp.mouse.dy;
        if (press || R.hold <= dt) { R.fx = Math.cos(R.fa) * RAD; R.fy = Math.sin(R.fa) * RAD; }
        R.fx += mx; R.fy += my;
        const l = Math.hypot(R.fx, R.fy) || 1;
        if (l > RAD) { R.fx *= RAD / l; R.fy *= RAD / l; }
        const a = Math.atan2(R.fy, R.fx), da = wrapA(a - R.fa) * Math.min(1, l / (RAD * 0.55));
        R.fa = a;
        let gain = dt * speed * 0.4 / s.dur; // (holding still: slowly)
        R.snagCool = Math.max(0, (R.snagCool || 0) - dt);
        if (R.snag > 0) { R.snag -= dt; gain = 0; }
        else if (-da > 0.002) {
          const w = -da / Math.max(dt, 1e-3), turn = (-da / (Math.PI * 2)) * Math.min(1.5, speed);
          // too quick on a rare capsule: the strip snags for a moment (and comes away grudgingly while you keep rushing)
          if (w > K[0] * open) { if (R.snagCool <= 0) { R.snag = 0.3; R.snagCool = 1.2; R.kick = 0.35; say('Gently: the strip snagged'); audio.play('tapePeel', { vol: 0.5, pitch: 0.6 }); } else gain += turn * 0.35; }
          else gain += turn;
          R.wrong = Math.max(0, R.wrong - dt * 2);
        } else if (da > 0.002) {
          R.wrong += da;
          if (R.wrong > 0.9) { R.wrong = 0; R.kick = 0.25; say('The other way round'); audio.play('tapePeel', { vol: 0.35, pitch: 0.55 }); }
        }
        p = Math.min(1, p + gain);
        const tick = Math.floor(p * BAND_N / 3);
        if (tick !== R.peelTick) { R.peelTick = tick; audio.play('tapePeel', { vol: 0.6, pitch: 0.9 + Math.random() * 0.25 }); }
      }
    } else if (s.kind === 'crack') {
      // it rocks in your fingers; a press as it comes upright cracks the seal clean, an off-beat one is a weak knock
      R.rock += dt / (K[2] * Math.max(1, 0.7 + speed * 0.3));
      const m = 0.5 + 0.5 * Math.sin(R.rock * Math.PI * 2);
      R.m = m;
      if (press || (down && R.hold > 0.45)) {
        R.hold = 0.04;
        const off = Math.abs(m - 0.5), clean = press && off < K[1] * open, perfect = clean && off < K[1] * open * 0.35;
        R.got += clean ? 1 : 0.34;
        if (clean) R.flash = 0.25;
        const hits = Math.min(s.hits, R.got);
        p = Math.min(1, hits / s.hits);
        const pos = at(cap, 0, 0, 1.05), last = p >= 1, wax = cap.seal?.kind === 'wax' || cap.seal?.kind === 'hanko';
        audio.play(wax ? 'waxCrack' : 'sealCrack', { vol: last ? 1 : clean ? 0.85 : 0.5, pitch: last ? 1 : clean ? 1.15 : 1.5 });
        fx({ sprite: 'burst', pos, size: last ? 0.11 : clean ? 0.08 : 0.05, life: 0.22, color: 0xfff6d8, fade: 0.2 });
        try { g.effects.sparks({ pos, count: last ? 10 : clean ? 6 : 2, colors: wax ? [0xd8303a, 0xffd0a0, 0x8a1418] : [0xffffff, 0xfff0b0], speed: 0.55, size: 0.009, life: 0.5, star: perfect ? 0.6 : 0.3 }); } catch { /* */ }
        R.kick = last ? 1 : clean ? 0.6 : 0.3;
        if (!clean && press) say('Off the beat: a weak knock', 0.8);
        if (!last) R.beat = 0.08;
      }
    } else if (s.kind === 'twist') {
      // a notch past the lugs a press, in an easy rhythm; too soon after the last and the fingers slip
      const N = Math.max(2, Math.round((s.dur || 1) * 3)), gap = K[3] / Math.min(1.8, 0.8 + 0.2 * speed), since = g.time - R.lastNotch;
      if (p < 0.55) {
        const auto = down && !press && R.hold > Math.max(0.5, gap * 1.8) && since > Math.max(0.5, gap * 1.8);
        if (press || auto) {
          if (press && since < gap && (R.slips || 0) < 3) {
            R.slip = 0.35; R.kick = 0.3; R.lastNotch = g.time; R.slips = (R.slips || 0) + 1;
            if (K[4] && R.notch > 0 && !R.slipBack) { R.notch--; R.slipBack = true; } // (once a step: a lesson, not a trap)
            say('Too quick: your fingers slipped', 0.9);
            audio.play('twist', { dur: 0.12, vol: 0.45 });
          } else {
            R.notch = Math.min(N, R.notch + 1); R.lastNotch = g.time; R.hold = auto ? 0.04 : R.hold; R.slips = 0;
            audio.play('lugClick', { vol: R.notch >= N ? 1 : 0.7, pitch: 0.9 + R.notch * 0.06 }); R.kick = R.notch >= N ? 0.8 : 0.35;
            if (R.notch >= N) try { g.effects.sparks({ pos: at(cap, 0.7, 0, 0.7), count: 3, colors: [0xffffff], speed: 0.3, size: 0.007, life: 0.3 }); } catch { /* */ }
          }
        }
        const target = R.notch >= N ? 0.56 : 0.55 * R.notch / N;
        p = Math.min(0.56, p + (target - p) * Math.min(1, dt * 14));
        if (R.notch >= N && target - p < 0.01) p = 0.56;
      } else p = Math.min(1, p + dt * 3.2); // past the lugs it slips round by itself
      R.twistN = N; R.ready = Math.min(1, since / gap);
    } else if (s.kind === 'pull') {
      if (down) p = Math.min(1, p + dt * speed * 1.25 / s.dur); else p = Math.max(0, p - dt * 1.5);
    } else if (s.kind === 'foil') {
      if (down) {
        const b = p, drag = Math.min(1.2, (Math.abs(inp.mouse.dx) + Math.abs(inp.mouse.dy)) * 0.03);
        p = Math.min(1, p + dt * speed * (1 + drag) / s.dur);
        if (Math.floor(p * 6) !== Math.floor(b * 6)) { audio.play('foilTear', { vol: 0.8, pitch: 0.9 + Math.random() * 0.3 }); scraps(at(cap, 0, 0.1, 0.2), cap.look === 'secret' ? [0xf2c14e, 0xfff0a0] : [0xdfe6f0, 0xffffff], 3, 0.9); }
      }
    }
    // ---- the gauge
    if (gauge) {
      const peels = cap.steps.filter((x) => x.kind === 'peel').length, donePeels = cap.steps.slice(0, i).filter((x) => x.kind === 'peel').length;
      gauge.draw(s.kind === 'peel' ? { kind: 'peel', p, fa: R.fa, snag: R.snag, bands: peels, done: donePeels }
        : s.kind === 'crack' ? { kind: 'crack', m: R.m ?? 0.5, w: K[1] * open, flash: R.flash, hits: s.hits, got: R.got }
          : s.kind === 'twist' ? { kind: 'twist', n: R.twistN || 3, done: R.notch, ready: R.ready ?? 1, slip: R.slip }
            : { kind: s.kind, p });
    }
    if (p !== cap.stage.p) cap.setStage(i, p);
    // ---- the capsule in the hands: it turns with the peel, strains with the twist, jumps on a knock
    R.kick = Math.max(0, R.kick - dt * 5);
    const peelK = cap.steps.reduce((a, x, n) => a + (x.kind === 'peel' ? (n < i ? 1 : n === i ? p : 0) : 0), 0);
    R.spin += (peelK * Math.PI * 2 - R.spin) * Math.min(1, dt * 14);
    H.twist = acting ? Math.max(0.06, s.kind === 'twist' || s.kind === 'pull' ? p : 0.3) : Math.max(0, (H.twist || 0) - dt * 2.5);
    if (!acting && H.twist <= 0 && H.pose === 'twist' && !H.trans) H.startTrans('capsule', 0.25);
    if (!H.trans) {
      const P = POSE[H.pose] || POSE.capsule, rar = it.data.rarity;
      const strain = s.kind === 'twist' && p < 0.55 ? p / 0.55 : s.kind === 'pull' ? p : 0;
      const sh = (acting ? 0.0012 + strain * 0.0022 : 0) * (rar === 'secret' ? 2.5 : rar === 'ultra' ? 1.7 : 1);
      it.obj.position.set(P[0] + (Math.random() - 0.5) * sh, P[1] + (Math.random() - 0.5) * sh + R.kick * 0.006, P[2] - R.kick * 0.004);
      const rockZ = s.kind === 'crack' && R.beat <= 0 ? ((R.m ?? 0.5) - 0.5) * 0.22 : 0, slipZ = R.slip > 0 ? Math.sin(R.slip * 60) * 0.03 : 0;
      _q.setFromEuler(_e.set(P[3], P[4], P[5] + rockZ + slipZ + (s.kind === 'twist' && p < 0.55 ? Math.sin(g.time * 40) * 0.01 * strain : 0)));
      it.obj.quaternion.copy(_q).multiply(_q2.setFromAxisAngle(Y, R.spin));
    }
    if (p >= 1) finish(it, cap, i);
  };

  H.updateTwist = function updateTwist(dt) {
    const it = H.item, cap = capOf(it);
    if (!cap?.steps?.length) return orig(dt);
    return drive(it, cap, dt);
  };
  H.hint = () => {
    const it = H.item, cap = it?.kind === 'capsule' ? capOf(it) : null;
    if (!cap?.steps?.length || H.busy) return hint0();
    if (R.insp) return { key: 'RMB', text: 'Turn it over', sub: 'Drag to turn · wheel to zoom' };
    const i = Math.min(cap.stage.i, cap.steps.length - 1), s = cap.steps[i], left = cap.steps.length - i;
    const text = s.kind === 'crack' ? `${SEAL_NAME[cap.seal?.kind] || TEXT.crack[1]}: press as it rocks upright` : TEXT[s.kind][1];
    const sub = R.msgT > 0 && R.msg ? R.msg : `${SUB[s.kind] ? SUB[s.kind] + ' · ' : ''}${left} step${left > 1 ? 's' : ''} to go · RMB look · Q drop`;
    return { key: TEXT[s.kind][0], text, sub };
  };
  return R;
}
