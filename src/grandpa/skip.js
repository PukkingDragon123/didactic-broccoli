// Doing the opening's jobs without playing them: the debug jumps (dbg.grandpa.upTo) and Settings > Skip tutorial for
// returning players (grandpa.skipTutorial). Flags go straight into the save and the world is tidied to match.
import { Story } from '../game/Story.js';

/** Do the opening's jobs up to `id` (cheat: flags straight in the save, the world tidied to match). */
export function forceUpTo(g, id) {
  const S = g.story, f = S.flags, L = g.life, G = g.garage;
  const order = Story.ORDER, stop = order.indexOf(id);
  for (let i = 0; i < stop; i++) {
    const k = order[i];
    if (S.isDone(k) && k !== 'shop') continue;
    switch (k) {
      case 'shutter': f.shutter = true; G.setShutter(1, true); if (g.held.find('key') < 0) g.held.giveTool('key'); break;
      case 'pc': f.pc = true; break;
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
  return S.step();
}

/** Skip the guided part of the opening: everything up to the odd jobs done (the rest is the game itself). */
export function forceTutorial(g) {
  const s = forceUpTo(g, 'job');
  g.story.flags.pc = true;
  return s;
}
