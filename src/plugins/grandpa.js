// Grandpa in person (src/grandpa/): he meets you when you arrive, walks you through the opening jobs himself, says
// goodbye at a taxi, then phones now and then. Installed last (after the life and people plugins it builds on).
// Debug (with ?debug / ?autotest): dbg.grandpa.* jumps to each scene (see below).
import * as THREE from 'three';
import { Game } from '../game/Game.js';
import { GrandpaSystem, STOOL } from '../grandpa/index.js';
import * as scenes from '../grandpa/scenes.js';
import { forceUpTo } from '../grandpa/skip.js';
import { PARK } from '../life/van.js';

export function install(game) {
  // after every other plugin (game.life, game.talk, game.os must exist)
  Game.late.push(async (g) => {
    const sys = g.grandpa = new GrandpaSystem(g);
    sys.install();
    setTimeout(() => { if (g.debug) g.debug.grandpa = debugGrandpa(g, sys); }, 0);
  });
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** Debug helpers: jump to every beat. Async ones resolve when the beat has started (end your eval with `; 0`). */
function debugGrandpa(g, sys) {
  const pickChoice = (i = 0) => { const s = g.talk?.session; if (s?.choice && s.choice.result === null) { s.choice.pick(i); return true; } return false; };
  return {
    sys,
    get gp() { return sys.gp; },
    state() { const gp = sys.gp; return { mode: sys.mode, step: g.story.step?.(), s: sys.s, pos: gp ? [+gp.pos.x.toFixed(2), +gp.pos.z.toFixed(2)] : null, sitting: gp?.sitting, act: gp?.po.act, walking: gp?.walking, bye: sys.director?.byeWaiting, talk: !!g.talk?.active, cine: g.cutscene.active }; },
    /** The van parked, him up off his stool and on his way over (the moment before the window tap). */
    parked() { const v = g.life.van; v.setPose(PARK.x, PARK.z, PARK.heading); v.setDoor(0); sys.wake(); return true; },
    /** Asleep on his stool in the sun, Mikan at his feet (the opening's shot of him). */
    doze() { sys.doze(); return true; },
    /** The whole meeting (window tap, chat, story); choices are picked automatically when auto is true. */
    meet(auto = true) { this.parked(); sys.meet(); if (auto) this.autoPick(true); return true; },
    tap() { this.parked(); g.cutscene.play((c) => scenes.tapScene(c, sys)); return true; },
    chat() { sys.talk(scenes.meetScript(sys), { leave: false }); return true; },
    story() { g.cutscene.play((c) => scenes.storyScene(c, sys)); return true; },
    /** Skip the meeting: met, on his stool, guiding from the first job. */
    skipMeet() { if (!sys.gp) return 'he is gone in this save'; sys.s.met = true; sys.mode = 'guide'; sys.seatAt(); if (g.held.find('key') < 0) g.held.giveTool('key'); sys.director.start({ quiet: false }); return true; },
    /** Force story steps done up to (not including) `id`, e.g. dbg.grandpa.upTo('breaker'). */
    upTo(id) { forceUpTo(g, id); return g.story.step(); },
    /** Straight to the goodbye (everything up to sitting at the computer done, you by the shutter). */
    bye(auto = true) { if (!sys.s.met) this.skipMeet(); forceUpTo(g, 'job'); g.player.pos.set(0.6, 0, 6.6); sys.director.onStep(g.story.step(), null); if (auto) this.autoPick(true); return true; },
    arrive() { g.cutscene.play((c) => scenes.taxiArriveScene(c, sys)); return true; },
    leave() { g.cutscene.play((c) => scenes.taxiLeaveScene(c, sys)); return true; },
    /** A phone call from him right now (answer it with dbg.grandpa.answer()). */
    ring(id = 'arrived') { sys.phone.ring(id); return true; },
    /** Run a call's cinematic straight away (no PC). */
    call(id = 'arrived') { const fake = { ended: false, say: () => Promise.resolve(true), hangup() { this.ended = true; } }; sys.phone.cinematic(fake, sys.phone.script(id)); return true; },
    /** Keep picking the first floating choice whenever one shows (on: false stops). */
    autoPick(on = true, i = 0) { clearInterval(this._auto); if (on) this._auto = setInterval(() => pickChoice(i), 250); return on; },
    pick: pickChoice,
    stool: STOOL,
    /** Grandpa standing right here in front of you (for close-ups). */
    here(dist = 1.6) { const P = g.player, f = V(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)); const p = P.pos.clone().addScaledVector(f, dist); sys.gp.sitting = false; sys.gp.sitT = 0; sys.gp.setPose('gp_stand'); sys.gp.place(p, Math.atan2(P.pos.x - p.x, P.pos.z - p.z)); sys.gp.lookAt = 'player'; return [p.x, p.z]; },
    nav(marks = []) { return sys.nav.ascii(marks, -5, 5, -5.2, 13); },
  };
}

export { forceUpTo };
