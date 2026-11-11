// Opening a capsule in your hands, step by step: a small knack each rather than one long press (generous on a common
// capsule, more demanding on the rare ones, never a fail; holding the button down still gets you there, slowly):
//   crack  the seal across the seam (a paper sticker, or red wax on ultra / secret capsules: src/game/capsuleSeals.js).
//          The capsule rocks in your fingers: press as it comes upright (the band on the gauge) and the seal cracks
//          clean; an off-beat press is a weak knock (about three of those to one clean one). Holding knocks slowly.
//   peel   hold LMB and drag round the seam, anticlockwise (the way the tape's end points): once round peels it, the
//          capsule turning in your fingers as it comes away. The wrong way round does nothing; on rare capsules a drag
//          that is too quick snags the strip for a moment. Holding still peels it too, slowly.
//   twist  press, press, press: one notch past the lugs a press, in an easy rhythm. Too soon after the last and your
//          fingers slip (on ultra / secret capsules it slips back one). Holding ratchets round by itself, slowly.
// and then the reveal (Reveal.open). A paper slip under the hint (src/game/ritualGauge.js) shows the knack in hand.
// Progress stays on the capsule's data (data.seal: steps done), so a half-opened capsule stays half-opened when you
// pocket it. Openers (the shop's tools) make every step quicker and its window wider. RMB turns it over to look.
// Wired in without touching Held.js: installRitual(game) (src/plugins/ritual.js) replaces held.updateTwist and
// extends held.hint, and dresses every capsule that spawns (items.spawnCapsule) in its seals.
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { OPENERS } from './economy.js';
import { dressSeals } from './capsuleSeals.js';
import { createGauge } from './ritualGauge.js';
import { POSES } from './Held.js';

const TEXT = { crack: 'LMB', peel: 'Hold LMB', twist: 'LMB' };
const SUB = { crack: 'Press as it rocks upright', peel: 'Drag anticlockwise round the seam', twist: 'Press, press, press: an easy rhythm' };
// per rarity: [peel snag speed (rad/s), crack window (half width, 0..0.5), crack rock period (s), twist gap (s),
//  slip back a notch, crack hits, twist length]
const KNACK = {
  common: [Infinity, 0.21, 1.3, 0.14, false, 2, 1], uncommon: [Infinity, 0.19, 1.2, 0.16, false, 2, 1.1],
  rare: [15, 0.16, 1.1, 0.2, false, 3, 1.3], ultra: [13, 0.14, 1.0, 0.24, true, 3, 1.6], secret: [10.5, 0.11, 0.85, 0.3, true, 4, 2],
};
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _e = new THREE.Euler(), Y = new THREE.Vector3(0, 1, 0);

export function capOf(it) { return it?.ent?.cap || it?.obj?.userData?.capRef || null; }

/** The steps for a capsule's contents. */
export function stepsFor(data) {
  const K = KNACK[data?.rarity] || KNACK.common;
  return [{ kind: 'crack', hits: K[5] }, { kind: 'peel', dur: 1 }, { kind: 'twist', dur: K[6] }];
}

export function installRitual(g) {
  const H = g.held;
  const orig = H.updateTwist.bind(H), hint0 = H.hint.bind(H);
  const R = g.ritual = {
    beat: 0, kick: 0, spin: 0, acting: false, insp: false, rot: new THREE.Euler(0.1, 0, 0), zoom: 0, idle: 0, hold: 0, peelTick: -1,
    fx: 0, fy: -1, fa: -Math.PI / 2, wrong: 0, snag: 0, rock: 0, got: 0, flash: 0, notch: 0, lastNotch: -9, slip: 0, engaged: 0, msg: null, msgT: 0, look: false,
  };
  let gauge = null;
  try { gauge = createGauge(); } catch { /* no DOM */ }
  const say = (text, t = 1.1) => { R.msg = text; R.msgT = t; };
  const lookLock = (on) => { if (on === R.look) return; R.look = on; if (!R.insp) g.player.lookLocked = on; };

  // every capsule that spawns wears its seals (the hi-res ones: in the world, in the tray, in your hands)
  const I = g.items;
  if (I?.spawnCapsule && !I._sealed) {
    const sp = I.spawnCapsule.bind(I);
    I._sealed = true;
    I.spawnCapsule = (data, ...a) => { const ent = sp(data, ...a); try { if (!(data.seal >= 3)) dressSeals(ent.cap, data); } catch (e) { console.warn('seals', e); } return ent; };
  }
  const prep = (it, cap) => {
    if (!cap.rit) {
      if (!cap.seals) try { dressSeals(cap, it.data); } catch { /* */ }
      cap.rit = { steps: stepsFor(it.data), i: 0, p: 0 };
    }
    return cap.rit;
  };
  // (a capsule that leaves the hands mid-step gives the view back, and the slip goes)
  g.constructor.updaters.push(() => {
    const cap = H.item?.kind === 'capsule' ? capOf(H.item) : null;
    if (cap && !cap.seals && cap.paper) try { dressSeals(cap, H.item.data); } catch { /* */ }
    if (R.look && (!cap || H.busy)) lookLock(false);
    if (!cap || H.busy || R.insp) gauge?.hide();
  });
  const at = (cap, x, y, z) => cap.group.localToWorld(_v.set(x * cap.r, y * cap.r, z * cap.r)).clone();
  const fx = (f) => { try { f(g.effects); } catch { /* effects not ready */ } };

  /** A part comes away: it drops out of your fingers into the world, tumbling, and is gone. */
  const drop = (m, dur = 0.6) => {
    g.scene.attach(m);
    const p0 = m.position.clone(), r0 = m.rotation.clone(), s0 = m.scale.x;
    const gone = () => { m.parent?.remove(m); };
    g.tweens.add({ dur, update: (k) => { m.position.set(p0.x, p0.y - 0.5 * k * k, p0.z); m.rotation.set(r0.x + k * 2.2, r0.y + k * 1.3, r0.z - k * 1.6); m.scale.setScalar(s0 * (1 - k * 0.4)); }, done: gone });
    setTimeout(gone, (dur + 1.5) * 1000); // (whatever happens to the tween, it never lingers)
  };

  /** Show the capsule as far as `i` steps and `p` through the next. */
  const pose = (cap, i, p) => {
    const S = cap.seals, st = cap.rit.steps;
    if (S) {
      if (st[i]?.kind === 'crack') S.setCrack(p);
      if (st[i]?.kind === 'peel') S.setPeel(p);
    }
    const tw = st[i]?.kind === 'twist' ? p : 0;
    cap.setTwist?.(tw);
    cap.bottom.rotation.y = -tw * 0.6;
  };

  const finish = (it, cap, i) => {
    const s = cap.rit.steps[i];
    it.data.seal = i + 1;
    R.beat = 0.16; R.hold = 0; R.peelTick = -1; R.got = 0; R.notch = 0; R.lastNotch = -9; R.wrong = 0; R.snag = 0; R.slips = 0; R.slipBack = false;
    lookLock(false);
    const S = cap.seals;
    if (s.kind === 'crack' && S && !S.sealGone) {
      S.sealGone = true; S.setCrack(1); drop(S.seal, 0.5); S.setPeel(0);
      audio.play('paper', { vol: 0.9 });
    }
    if (s.kind === 'peel' && S && !S.tapeGone) {
      S.tapeGone = true; S.flap.visible = false; S.tape.geometry.setDrawRange(0, Infinity); drop(S.tape, 0.6);
      audio.play('paper', { vol: 1 });
      fx((E) => E.confetti({ pos: at(cap, 0.9, 0, 0.5), count: 3, colors: [0xf1e9d6, 0xb8282c], speed: 0.5, life: 0.9 }));
    }
    if (i + 1 >= cap.rit.steps.length) {
      // every seal is off: the pop, the mini-book, the figure
      R.acting = false; H.twisting = false; H.twist = 1;
      gauge?.hide();
      g.reveal.stopTool();
      g.reveal.open(it);
      return;
    }
    cap.rit.i = i + 1; cap.rit.p = 0;
    pose(cap, i + 1, 0);
  };

  const drive = (it, cap, dt) => {
    const inp = g.input;
    const rit = prep(it, cap);
    if (cap._ritual !== it) {
      // a capsule new to the hands: as far open as it was left
      cap._ritual = it;
      rit.i = Math.min(it.data.seal || 0, rit.steps.length - 1); rit.p = 0;
      pose(cap, rit.i, 0);
      R.spin = rit.i > 1 ? Math.PI * 2 : 0; R.beat = 0;
    }
    const i = rit.i, s = rit.steps[i];
    const free = !g.interaction.hover;
    const down = inp.button(0) && free, press = inp.buttonDown(0) && free;
    const speed = Math.min(4, 1.05 / (OPENERS[g.state.opener]?.time || 1.05));
    let p = rit.p;
    // ---- look closer (RMB), when not in the middle of a step
    const wantInsp = inp.button(2) && !down;
    if (wantInsp && !R.insp) { R.insp = true; H.inspecting = true; g.player.lookLocked = true; H.startTrans('inspect', 0.28); R.rot.set(0.25, 0, 0); R.zoom = 0; R.idle = 0; audio.play('whoosh', { vol: 0.4, dur: 0.2, v: 0.08 }); }
    else if (!wantInsp && R.insp) { R.insp = false; H.inspecting = false; g.player.lookLocked = R.look; H.startTrans(H.pose === 'inspect' ? 'capsule' : H.pose, 0.28); if (H.pose === 'inspect') H.pose = 'capsule'; }
    if (R.insp) {
      if (!H.trans) {
        const moved = Math.abs(inp.mouse.dx) + Math.abs(inp.mouse.dy) > 0.5;
        R.idle = moved ? 0 : R.idle + dt;
        R.rot.y += inp.mouse.dx * 0.008 + (R.idle > 1 ? dt * 0.7 : 0);
        R.rot.x = Math.max(-1.3, Math.min(1.3, R.rot.x + inp.mouse.dy * 0.008));
        if (inp.mouse.wheel) R.zoom = Math.max(-0.07, Math.min(0.1, R.zoom - inp.mouse.wheel * 0.02));
        const P = POSES.inspect.pos;
        it.obj.position.set(P.x, P.y, P.z + R.zoom);
        it.obj.quaternion.setFromEuler(R.rot);
      }
      H.twisting = false; H.twist = 0;
      return;
    }
    // ---- both hands come in while you work on it (and stay in for a moment between presses)
    const K = KNACK[it.data.rarity] || KNACK.common, open = Math.min(1.6, 0.86 + 0.14 * speed);
    if (press) R.engaged = 1.1;
    R.engaged = Math.max(0, R.engaged - dt);
    const acting = down || R.engaged > 0 || (s.kind === 'twist' && p > 0.55 && p < 1);
    if (acting && !R.acting) { g.reveal.startTool(it); if (g.fp?.live && H.pose === 'capsule') H.startTrans('twist', 0.2); }
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
        let gain = dt * speed * 0.3 / s.dur; // (holding still: slowly)
        R.snagCool = Math.max(0, (R.snagCool || 0) - dt);
        if (R.snag > 0) { R.snag -= dt; gain = 0; }
        else if (-da > 0.002) {
          const w = -da / Math.max(dt, 1e-3), turn = (-da / (Math.PI * 2)) * Math.min(1.5, speed);
          // too quick on a rare capsule: the strip snags for a moment (and comes away grudgingly while you keep rushing)
          if (w > K[0] * open) { if (R.snagCool <= 0) { R.snag = 0.3; R.snagCool = 1.2; R.kick = 0.35; say('Gently: the strip snagged'); audio.play('paper', { vol: 0.5 }); } else gain += turn * 0.35; }
          else gain += turn;
          R.wrong = Math.max(0, R.wrong - dt * 2);
        } else if (da > 0.002) {
          R.wrong += da;
          if (R.wrong > 0.9) { R.wrong = 0; R.kick = 0.25; say('The other way round'); }
        }
        p = Math.min(1, p + gain);
        const tick = Math.floor(p * 8);
        if (tick !== R.peelTick) { R.peelTick = tick; audio.play('paper', { vol: 0.45 }); }
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
        p = Math.min(1, Math.min(s.hits, R.got) / s.hits);
        const pos = at(cap, 0, 0, 1.05), last = p >= 1, wax = cap.seals?.kind === 'wax';
        audio.play('capsuleHit', { mat: 'capsule', speed: last ? 3 : clean ? 2.4 : 1.4, vol: last ? 1 : clean ? 0.8 : 0.5 });
        fx((E) => E.sparks({ pos, count: last ? 8 : clean ? 5 : 2, colors: wax ? [0xd8303a, 0xffd0a0, 0x8a1418] : [0xf4ecd8, 0xc0282c], speed: 0.5, size: 0.008, life: 0.45, star: perfect ? 0.6 : 0.2 }));
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
          if (press && since < gap && (R.slips || 0) < 5) {
            R.slip = 0.35; R.kick = 0.3; R.lastNotch = g.time; R.slips = (R.slips || 0) + 1;
            if (K[4] && R.notch > 0 && !R.slipBack) { R.notch--; R.slipBack = true; } // (once a step: a lesson, not a trap)
            say('Too quick: your fingers slipped', 0.9);
            audio.play('twist', { dur: 0.12, vol: 0.45 });
          } else {
            R.notch = Math.min(N, R.notch + 1); R.lastNotch = g.time; R.hold = auto ? 0.04 : R.hold; R.slips = 0;
            audio.play('crankTick', { vol: R.notch >= N ? 1 : 0.7, pitch: 0.9 + R.notch * 0.06 }); R.kick = R.notch >= N ? 0.8 : 0.35;
            if (R.notch >= N) audio.play('twist', { dur: 0.35, vol: 0.8 });
          }
        }
        const target = R.notch >= N ? 0.56 : 0.55 * R.notch / N;
        p = Math.min(0.56, p + (target - p) * Math.min(1, dt * 14));
        if (R.notch >= N && target - p < 0.01) p = 0.56;
      } else p = Math.min(1, p + dt * 3.2); // past the lugs it slips round by itself
      R.twistN = N; R.ready = Math.min(1, since / gap);
      // the secret's light leaks from the seam as it gives
      if (it.data.rarity === 'secret' && p > 0.2 && Math.random() < dt * 30 * p) fx((E) => E.sparks({ pos: at(cap, 0, 0, 0), count: 1, color: 0xfff0a0, speed: 0.35, size: 0.01, life: 0.4, gravity: 0, radius: 0.04, star: 1 }));
    }
    // ---- the gauge
    if (gauge) {
      gauge.draw(s.kind === 'peel' ? { kind: 'peel', p, fa: R.fa, snag: R.snag, bands: 1, done: 0 }
        : s.kind === 'crack' ? { kind: 'crack', m: R.m ?? 0.5, w: K[1] * open, flash: R.flash, hits: s.hits, got: R.got }
          : { kind: 'twist', n: R.twistN || 3, done: R.notch, ready: R.ready ?? 1, slip: R.slip });
    }
    if (p !== rit.p) { rit.p = p; pose(cap, i, p); }
    // ---- the capsule in the hands: it turns with the peel, strains with the twist, jumps on a knock
    R.kick = Math.max(0, R.kick - dt * 5);
    const peelK = i > 1 ? 1 : i === 1 ? p : 0;
    R.spin += (peelK * Math.PI * 2 - R.spin) * Math.min(1, dt * 14);
    H.twist = acting ? Math.max(0.06, s.kind === 'twist' ? p : 0.3) : Math.max(0, (H.twist || 0) - dt * 2.5);
    if (!acting && H.twist <= 0 && H.pose === 'twist' && !H.trans) H.startTrans('capsule', 0.25);
    if (!H.trans) {
      const P = POSES[H.pose] || POSES.capsule, rar = it.data.rarity;
      const strain = s.kind === 'twist' && p < 0.55 ? p / 0.55 : 0;
      const sh = (acting ? 0.0012 + strain * 0.0022 : 0) * (rar === 'secret' ? 2.5 : rar === 'ultra' ? 1.7 : 1);
      it.obj.position.set(P.pos.x + (Math.random() - 0.5) * sh, P.pos.y + (Math.random() - 0.5) * sh + R.kick * 0.006, P.pos.z - R.kick * 0.004);
      const rockZ = s.kind === 'crack' && R.beat <= 0 ? ((R.m ?? 0.5) - 0.5) * 0.22 : 0, slipZ = R.slip > 0 ? Math.sin(R.slip * 60) * 0.03 : 0;
      _q.setFromEuler(_e.set(P.rot.x, P.rot.y, P.rot.z + rockZ + slipZ + (s.kind === 'twist' && p < 0.55 ? Math.sin(g.time * 40) * 0.01 * strain : 0)));
      it.obj.quaternion.copy(_q).multiply(_q2.setFromAxisAngle(Y, R.spin));
    }
    if (p >= 1) finish(it, cap, i);
  };

  H.updateTwist = function updateTwist(dt) {
    const it = H.item, cap = capOf(it);
    if (!cap?.top || !it?.data) return orig(dt);
    return drive(it, cap, dt);
  };
  H.hint = () => {
    const it = H.item, cap = it?.kind === 'capsule' ? capOf(it) : null;
    if (!cap || H.busy) return hint0();
    if (R.insp) return { key: 'RMB', text: 'Turn it over', sub: 'Drag to turn · wheel to zoom' };
    const rit = prep(it, cap), i = Math.min(rit.i, rit.steps.length - 1), s = rit.steps[i], left = rit.steps.length - i;
    // (while your hands are at it the slip beside the capsule shows the knack: the hint keeps out of the way)
    if (R.acting) return R.msgT > 0 && R.msg ? { key: '', text: R.msg } : null;
    const text = s.kind === 'crack' ? (cap.seals?.kind === 'wax' ? 'Break the wax seal' : 'Crack the seal') : s.kind === 'peel' ? 'Peel the tape' : 'Twist it open';
    const sub = R.msgT > 0 && R.msg ? R.msg : `${SUB[s.kind]} · ${left} step${left > 1 ? 's' : ''} to go`;
    return { key: TEXT[s.kind], text, sub };
  };
  return R;
}
