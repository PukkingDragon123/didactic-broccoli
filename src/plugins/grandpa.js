// Grandpa in person (src/grandpa/): he meets you when you drive in, walks you through the opening jobs himself, says
// goodbye at a taxi, then phones now and then. Installed last (after the life and people plugins it builds on).
// Debug (with ?debug / ?autotest): dbg.grandpa.* jumps to each scene (see below).
import * as THREE from 'three';
import { Game } from '../game/Game.js';
import { GrandpaSystem, STOOL } from '../grandpa/index.js';
import * as scenes from '../grandpa/scenes.js';
import { Story } from '../game/Story.js';

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
    /** The van parked, him at the marshal spot (the moment before the window tap). */
    parked() { const v = g.life.van; v.setPose(3.4, 12.5, -Math.PI / 2); v.setDoor(0); sys.onLane(); return true; },
    /** Waving the van in: the van part-way down the lane. */
    marshal(x = 9) { const v = g.life.van; v.setPose(x, 12.5, -Math.PI / 2); sys.onLane(); return true; },
    /** The whole meeting (window tap, chat, story); choices are picked automatically when auto is true. */
    meet(auto = true) { this.parked(); sys.meet(); if (auto) this.autoPick(true); return true; },
    tap() { this.parked(); g.cutscene.play((c) => scenes.tapScene(c, sys)); return true; },
    chat() { sys.talk(scenes.meetScript(sys), { leave: false }); return true; },
    story() { g.cutscene.play((c) => scenes.storyScene(c, sys)); return true; },
    /** Skip the meeting: met, on his stool, guiding from the first job. */
    skipMeet() { if (!sys.gp) return 'he is gone in this save'; sys.s.met = true; sys.mode = 'guide'; sys.seatAt(); if (g.held.find('key') < 0) g.held.giveTool('key'); sys.director.start({ quiet: false }); return true; },
    /** Force story steps done up to (not including) `id`, e.g. dbg.grandpa.upTo('breaker'). */
    upTo(id) { forceUpTo(g, id); return g.story.step(); },
    /** Straight to the goodbye (everything up to the computer note done, you by the shutter). */
    bye(auto = true) { if (!sys.s.met) this.skipMeet(); forceUpTo(g, 'read_pc'); g.player.pos.set(0.6, 0, 6.6); sys.director.onStep(g.story.step(), null); if (auto) this.autoPick(true); return true; },
    arrive() { g.cutscene.play((c) => scenes.taxiArriveScene(c, sys)); return true; },
    leave() { g.cutscene.play((c) => scenes.taxiLeaveScene(c, sys)); return true; },
    /** A phone call from him right now (answer it with dbg.grandpa.answer()). */
    ring(id = 'arrived') { sys.phone.ring(id); return true; },
    /** Run a call's cinematic straight away (no PC). */
    call(id = 'arrived') { const fake = { ended: false, say: () => Promise.resolve(true), hangup() { this.ended = true; } }; sys.phone.cinematic(fake, sys.phone.script(id)); return true; },
    postcard() { sys.phone.postcard(); return true; },
    /** Keep picking the first floating choice whenever one shows (on: false stops). */
    autoPick(on = true, i = 0) { clearInterval(this._auto); if (on) this._auto = setInterval(() => pickChoice(i), 250); return on; },
    pick: pickChoice,
    stool: STOOL,
    /** Grandpa standing right here in front of you (for close-ups). */
    here(dist = 1.6) { const P = g.player, f = V(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)); const p = P.pos.clone().addScaledVector(f, dist); sys.gp.sitting = false; sys.gp.sitT = 0; sys.gp.setPose('gp_stand'); sys.gp.place(p, Math.atan2(P.pos.x - p.x, P.pos.z - p.z)); sys.gp.lookAt = 'player'; return [p.x, p.z]; },
    nav(marks = []) { return sys.nav.ascii(marks, -5, 5, -5.2, 13); },
  };
}

/** Do the opening's jobs up to `id` (cheat: flags straight in the save, the world tidied to match). */
export function forceUpTo(g, id) {
  const S = g.story, f = S.flags, L = g.life, G = g.garage;
  const order = Story.ORDER, stop = order.indexOf(id);
  for (let i = 0; i < stop; i++) {
    const k = order[i];
    if (S.isDone(k) && k !== 'shop') continue;
    switch (k) {
      case 'letter': if (!L.notes.isRead('letter')) L.s.notes.push('letter'); L.notes.remove('letter'); break;
      case 'shutter': f.shutter = true; G.setShutter(1, true); if (g.held.find('key') < 0) g.held.giveTool('key'); break;
      case 'read_power': case 'read_clean': case 'read_tin': case 'read_junk': case 'read_cat': case 'read_pc': case 'read_machine': { const n = k.slice(5); if (!L.notes.isRead(n)) L.s.notes.push(n); break; }
      case 'breaker': L.setPower(true); break;
      case 'lights': g.state.lightsOn = true; G.setLights(true); break;
      case 'window': f.windowDone = true; break;
      case 'wipe': while (f.wiped.length < 4) f.wiped.push('w' + f.wiped.length); break;
      case 'tin': if (!f.cash) S.takeCash(); break;
      case 'tray': f.tray = true; break;
      case 'junk': for (const st of [...L.chores.junk.values()]) L.chores.openJunk(st); for (const j of ['j1', 'j2']) if (!f.junkOpen.includes(j)) f.junkOpen.push(j); break;
      case 'feed': f.fed = true; g.street?.befriendCat?.(); break;
      case 'tube': if (!f.tube) { f.tube = true; const t = G.lights.tubes[1]; if (t) { t.dead = false; g.interaction.remove(t.fix); G.setLights(G.lightsOn); } } break;
      case 'sweep': for (const [pid, p] of S.piles) { g.interaction.remove(p.mesh); p.mesh.parent?.remove(p.mesh); S.piles.delete(pid); if (!f.swept.includes(pid)) f.swept.push(pid); } for (const p of ['p1', 'p4', 'p6']) if (!f.swept.includes(p)) f.swept.push(p); break;
      case 'bag': for (const p of ['p2', 'p3', 'p5']) if (!f.bagged.includes(p)) f.bagged.push(p); for (const [pid, st] of L.chores.piles) { g.interaction.remove(st.m); st.m.parent?.remove(st.m); L.chores.piles.delete(pid); } break;
      case 'trashout': for (const t of ['b1', 'b3', 'r_p2', 'r_p5', 'c_p3', 'j1', 'j2']) if (!f.bags.includes(t)) f.bags.push(t); for (const e of [...g.items.list]) if (e.data?.bag || e.data?.junk) g.items.destroy(e); for (let i = 0; i < g.held.slots.length; i++) { const it = g.held.slots[i]; if (it?.data?.bag || it?.data?.junk) g.held.consume(i); } break;
      default: break;
    }
  }
  L.notes.refreshAll();
  return S.step();
}
