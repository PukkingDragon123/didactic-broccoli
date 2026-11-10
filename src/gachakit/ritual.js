// Opening a capsule, in your hands, step by step (the steps come from the capsule: cap.steps in src/game/Capsule.js):
//   peel   hold: the shrink band comes off round the seam as a curling strip (dragging the mouse hurries it); the
//          capsule turns in your fingers so the peel front stays in view; the strip drops when it lets go
//   crack  press: the tamper seal over the seam snaps (a pixel burst); wax and hanko seals take two or three knocks
//   twist  hold: strain against the locking lugs (let go and it springs back), a click, then the top slips round
//   pull   hold: the halves resist, then part; with a foil wrap inside the top is set aside first
//   foil   hold: the wrap tears open
// and only then the reveal (Reveal.open). Holding the button all the way through always works (a short beat between
// steps); nothing needs aim or timing. Progress is kept on the capsule's data (data.seal: steps done), so a
// half-opened capsule stays half-opened when you pocket it. Openers (the shop's tools) make every step quicker.
// RMB turns the capsule over in front of you (the small print, the mini-book through the dome).
// Wired into game.held without touching Held.js: installRitual(game) replaces its updateTwist and extends its hint.
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { OPENERS } from '../game/economy.js';
import { BAND_N } from './capsuleParts.js';

const POSE = { capsule: [0.14, -0.13, -0.37, 0.25, 0.4, 0.1], twist: [0.02, -0.095, -0.4, 0.4, 0.15, 0.05], inspect: [0, -0.005, -0.24] };
const TEXT = {
  peel: ['Hold LMB', 'Peel the band off'], crack: ['LMB', 'Crack the seal'], twist: ['Hold LMB', 'Twist past the lugs'], pull: ['Hold LMB', 'Pull the halves apart'], foil: ['Hold LMB', 'Tear the foil open'],
};
const SEAL_NAME = { sticker: 'Crack the seal', foil: 'Split the foil seal', wax: 'Break the wax seal', hanko: 'Break the hanko seal' };
const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _e = new THREE.Euler(), Y = new THREE.Vector3(0, 1, 0);

export function capOf(it) { return it?.ent?.cap || it?.obj?.userData?.capRef || null; }

export function installRitual(g) {
  const H = g.held;
  const orig = H.updateTwist.bind(H), hint0 = H.hint.bind(H);
  const R = g.ritual = { beat: 0, kick: 0, spin: 0, acting: false, insp: false, rot: new THREE.Euler(0.1, 0, 0), zoom: 0, idle: 0, hold: 0, peelTick: -1, clicked: false, it: null };
  const at = (cap, x, y, z) => cap.group.localToWorld(_v.set(x * cap.r, y * cap.r, z * cap.r)).clone();
  const fx = (o) => { try { g.effects.emit(o); } catch { /* effects not ready */ } };
  const scraps = (pos, colors, n, speed = 0.7) => { for (let i = 0; i < n; i++) fx({ sprite: 'confetti', pos: pos.clone(), vel: new THREE.Vector3((Math.random() - 0.5) * speed, 0.3 + Math.random() * speed, (Math.random() - 0.5) * speed), color: colors[i % colors.length], life: 0.9 + Math.random() * 0.5, size: 0.012, gravity: 2.4, drag: 2, flutter: 3, anim: 'loop', fps: 10, frame: i % 4, fade: 0.2, flip: true }); };

  /** The strip comes away: it falls out of your fingers and is gone. */
  const dropRibbon = (cap, band) => {
    band.dropped = true;
    const m = band.ribbon;
    m.geometry.setDrawRange(0, 16 * 6);
    H.anchor.attach(m);
    m.traverse((o) => o.layers.mask = cap.group.children[0].layers.mask);
    const p0 = m.position.clone(), r0 = m.rotation.clone();
    g.tweens.add({ dur: 0.55, update: (k) => { m.position.set(p0.x + 0.05 * k, p0.y - 0.42 * k * k, p0.z + 0.03 * k); m.rotation.set(r0.x + k * 2.2, r0.y + k * 1.3, r0.z - k * 1.6); }, done: () => m.parent?.remove(m) });
    band.holder.visible = false;
  };

  const finish = (it, cap, i) => {
    const s = cap.steps[i];
    it.data.seal = i + 1;
    R.beat = 0.16; R.hold = 0; R.clicked = false; R.peelTick = -1;
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
    if (cap._ritual !== it) { cap._ritual = it; cap.setStage(Math.min(it.data.seal || 0, cap.steps.length - 1), 0); R.spin = 0; R.beat = 0; }
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
    // ---- both hands come in while you work on it
    const acting = down || (s.kind === 'twist' && p > 0.55 && p < 1);
    if (acting && !R.acting) { g.reveal.startTool(it); if (g.fp?.live && H.pose === 'capsule') H.startTrans('twist', 0.2); if (s.kind === 'twist' || s.kind === 'pull') audio.play('twist', { dur: (s.dur || 1) / speed, vol: 0.7 }); }
    if (!acting && R.acting) g.reveal.stopTool();
    R.acting = acting;
    H.twisting = acting;
    R.hold = down ? R.hold + dt : 0;
    if (R.beat > 0) R.beat -= dt;
    else if (s.kind === 'peel') {
      if (down) {
        const drag = Math.min(1.2, (Math.abs(inp.mouse.dx) + Math.abs(inp.mouse.dy)) * 0.03);
        p = Math.min(1, p + dt * speed * (1 + drag) / s.dur);
        const tick = Math.floor(p * BAND_N / 3);
        if (tick !== R.peelTick) { R.peelTick = tick; audio.play('tapePeel', { vol: 0.6, pitch: 0.9 + Math.random() * 0.25 }); }
      }
    } else if (s.kind === 'crack') {
      // a press; holding knocks again every beat
      if (press || (down && R.hold > 0.3)) {
        R.hold = 0.04;
        const hits = Math.round(p * s.hits) + 1;
        p = Math.min(1, hits / s.hits);
        const pos = at(cap, 0, 0, 1.05), last = hits >= s.hits, wax = cap.seal?.kind === 'wax' || cap.seal?.kind === 'hanko';
        audio.play(wax ? 'waxCrack' : 'sealCrack', { vol: last ? 1 : 0.75, pitch: last ? 1 : 1.25 });
        fx({ sprite: 'burst', pos, size: last ? 0.11 : 0.07, life: 0.22, color: 0xfff6d8, fade: 0.2 });
        try { g.effects.sparks({ pos, count: last ? 10 : 5, colors: wax ? [0xd8303a, 0xffd0a0, 0x8a1418] : [0xffffff, 0xfff0b0], speed: 0.55, size: 0.009, life: 0.5, star: 0.3 }); } catch { /* */ }
        R.kick = last ? 1 : 0.6;
        if (!last) R.beat = 0.1;
      }
    } else if (s.kind === 'twist') {
      const before = p;
      if (p >= 0.55) p = Math.min(1, p + dt * 3.2); // past the lugs it slips round by itself
      else if (down) p = Math.min(0.56, p + dt * speed * 0.62 / s.dur);
      else p = Math.max(0, p - dt * 2.2); // the lugs push back
      if (before < 0.55 && p >= 0.55) { audio.play('lugClick', { vol: 1 }); R.kick = 0.8; try { g.effects.sparks({ pos: at(cap, 0.7, 0, 0.7), count: 3, colors: [0xffffff], speed: 0.3, size: 0.007, life: 0.3 }); } catch { /* */ } }
    } else if (s.kind === 'pull') {
      if (down) p = Math.min(1, p + dt * speed / s.dur); else p = Math.max(0, p - dt * 3);
    } else if (s.kind === 'foil') {
      if (down) {
        const b = p;
        p = Math.min(1, p + dt * speed / s.dur);
        if (Math.floor(p * 6) !== Math.floor(b * 6)) { audio.play('foilTear', { vol: 0.8, pitch: 0.9 + Math.random() * 0.3 }); scraps(at(cap, 0, 0.1, 0.2), cap.look === 'secret' ? [0xf2c14e, 0xfff0a0] : [0xdfe6f0, 0xffffff], 3, 0.9); }
      }
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
      _q.setFromEuler(_e.set(P[3], P[4], P[5] + (s.kind === 'twist' && p < 0.55 ? Math.sin(g.time * 40) * 0.01 * strain : 0)));
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
    const text = s.kind === 'crack' ? SEAL_NAME[cap.seal?.kind] || TEXT.crack[1] : s.kind === 'peel' && cap.look === 'secret' ? 'Peel the sealing band off' : TEXT[s.kind][1];
    return { key: TEXT[s.kind][0], text, sub: `${left} step${left > 1 ? 's' : ''} to go · RMB to look closer · Q to drop` };
  };
  return R;
}
