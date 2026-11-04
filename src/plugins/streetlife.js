// Street life (the lane feels lived in): wires the steering (src/people/crowd.js) and awareness (src/people/aware.js)
// into the world once everything exists. Vehicles people step aside for (the garbage truck, the courier's van, the
// player's van), other people to keep clear of (the truck crew, the courier, Mikan the cat), the goings-on people turn
// their heads to (a slap, a capsule popping open in your hands, a machine's gachan, the shutter rolling, a train on
// the bridge, the garbage truck, a doorbell), the neighbours' own days (src/npc/residents.js), a stray cat at night
// (src/npc/strayCat.js), and debug helpers: game.debug.crowd / dbg.crowd.
//   dbg.crowd.stats()       min distance between people since reset, overlaps, behaviour histogram, greetings...
//   dbg.crowd.reset()       zero the counters      dbg.crowd.fill(n)   spawn n passers-by now (around the lane)
//   dbg.crowd.queue(n)      n customers for one machine (a queue)      dbg.crowd.meet()   two neighbours meet
//   dbg.crowd.at(kind, x)   a passer-by doing an errand (gacha, vending, smoke, bench, board, phone, post, mikawaya)
//   dbg.crowd.slap()        slap the nearest passer-by (everyone around reacts)      dbg.crowd.cat()  the stray now
import * as THREE from 'three';
import { Game } from '../game/Game.js';
import { crowdOf } from '../people/crowd.js';
import { awareOf } from '../people/aware.js';
import { residentsLife } from '../npc/residents.js';
import { StrayCat } from '../npc/strayCat.js';
import { ERRANDS, POIS, POI_OF, ARCH, streetDirector } from '../npc/street.js';
import { SOUNDS } from '../core/audio.js';

const _b = new THREE.Box3();
const V = (x, z) => new THREE.Vector3(x, 0, z);

// a lighter's flick (smokers at the ashtray)
if (!SOUNDS.lighter) {
  SOUNDS.lighter = (a, t, o) => {
    a.burst(o, t, { dur: 0.03, vol: 0.25, type: 'highpass', f: 4200 });
    a.burst(o, t + 0.05, { dur: 0.18, vol: 0.08, type: 'bandpass', f: 1800, q: 1.2, attack: 0.02 });
  };
}

export function install(game) {
  const g = game;
  const C = crowdOf(g), A = awareOf(g);
  const D = streetDirector(g);
  // ---- vehicles (world boxes, refreshed a few times a second; their speed is worked out from the movement)
  const boxOf = (root) => { if (!root?.parent || !root.visible) return null; _b.setFromObject(root); if (_b.isEmpty() || _b.max.y < 0.3) return null; return { minX: _b.min.x, maxX: _b.max.x, minZ: _b.min.z, maxZ: _b.max.z }; };
  C.addVehicle(() => (g.life?.trash?.truck ? boxOf(g.life.trash.truckModel?.root) : null));
  C.addVehicle(() => (g.courier?.van ? boxOf(g.courier.van.root ?? g.courier.van) : null));
  C.addVehicle(() => (g.life?.van?.root ? boxOf(g.life.van.root) : null));
  // ---- other people walking about who aren't on the crowd's books
  C.addPeople(() => {
    const out = [];
    for (const c of g.life?.trash?.truck?.crew || []) if (c.h?.root) out.push(c.h.root.position);
    const dr = g.courier?.driver?.root;
    if (dr?.visible && dr.parent) out.push(dr.position);
    const gp = g.grandpa?.gp?.h?.root;
    if (gp?.visible && gp.parent) out.push(gp.position);
    const cat = g.street?.cat?.g;
    if (cat?.visible && !g.street.cat.held) out.push(cat.position);
    return out;
  });

  // ---- things people notice
  g.events.on('slap', (e) => { if (e?.point && e.human) A.noise(e.point, 'slap', { r: 13, dur: [2.6, 4.2], victim: e.human || null }); });
  g.events.on('discover', () => A.noise(g.camera.position.clone(), 'pop', { r: 6, dur: [1, 2], chance: 0.8, lines: ['Ooh, what did you get?', 'Lucky!', 'Show me!'], lineChance: 0.12 }));
  g.events.on('machinePlay', (e) => { if (e?.owner && e.machine?.root) A.noise(e.machine.root.position.clone().setY(1), 'gachan', { r: 6, dur: [0.8, 1.6], chance: 0.6 }); });
  g.events.on('doorbell', () => A.noise(g.player.pos.clone().setY(1.2), 'bell', { r: 9, dur: [1, 2], chance: 0.7 }));
  g.events.on('bellRing', (e) => A.noise((e?.pos || g.player.pos).clone(), 'bell', { r: 7, dur: [1, 2], chance: 0.6 }));

  const res = residentsLife(g);
  const cat = g.strayCat = new StrayCat(g);
  let shut = g.garage?.shutterOpen ?? 0, shutT = 0, truckN = 0, polT = 0;
  const trainSeen = new Map();
  Game.updaters.push((game2, dt) => {
    const frozen = g.timeStop?.frozen;
    if (!frozen) C.relax(dt);
    A.update(dt);
    res?.update(dt);
    if (!frozen) cat.update(dt);
    // polled goings-on (a few times a second)
    if ((polT -= dt) > 0) return;
    polT = 0.25;
    const s = g.garage?.shutterOpen ?? 0;
    shutT -= 0.25;
    if (Math.abs(s - shut) > 0.01 && shutT <= 0) { shutT = 4; A.noise(V(0.4, 5.2).setY(1.6), 'shutter', { r: 15, dur: [1.2, 2.5], chance: 0.85, lines: s > shut ? ['Oh! The gacha place is opening!', 'Ah, they\'re open.'] : ['Closing up already?'], lineChance: 0.15 }); }
    shut = s;
    for (const tr of g.garage?.town?.trains || []) {
      const on = tr.g.visible && Math.abs(tr.z - 9.6) < 35;
      if (on && !trainSeen.get(tr)) { trainSeen.set(tr, true); A.noise(new THREE.Vector3(tr.s * 31, 5, 9.6), 'train', { r: 22, dur: [1, 2.4], chance: 0.35 }); }
      else if (!on) trainSeen.set(tr, false);
    }
    const tk = g.life?.trash?.truck;
    if (tk && (truckN = (truckN + 1) % 12) === 1) { const p = g.life.trash.truckModel?.root?.position; if (p) A.noise(p.clone().setY(1.5), 'truck', { r: 20, dur: [1.5, 3], chance: 0.8 }); }
  });

  // ---- debug helpers
  const dbg = debugCrowd(g, C, A, D, cat);
  g.crowdDebug = dbg;
  setTimeout(() => { if (g.debug) g.debug.crowd = dbg; if (window.dbg) window.dbg.crowd = dbg; }, 0);
}

function debugCrowd(g, C, A, D, cat) {
  const P = () => g.pedestrians;
  const S = { minPair: Infinity, frames: 0, overlapFrames: 0, samples: 0, on: false };
  // a per-frame sampler of the closest two people (registered agents only, hidden ones skipped); on after reset()
  Game.updaters.push(() => {
    if (!S.on) return;
    const L = C.agents.filter((a) => a.active && !a.hidden && a.kind !== 'cat' && a.kind !== 'dog');
    let m = Infinity, mi = -1, mj = -1;
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const d = Math.hypot(L[i].pos.x - L[j].pos.x, L[i].pos.z - L[j].pos.z);
      if (d < m) { m = d; mi = i; mj = j; }
    }
    S.frames++;
    const tag = (a) => `${a.kind}:${a.owner?.arch || a.owner?.id || ''}${a.ghosting || a.ghostT > 0 ? '(ghost)' : ''}${a.anchor ? '(anchor)' : ''}`;
    if (m < Infinity) {
      S.samples++;
      if (m < S.minPair) { S.minPair = m; S.minWho = [tag(L[mi]), tag(L[mj]), +L[mi].pos.x.toFixed(1), +L[mi].pos.z.toFixed(1)]; }
      if (m < 0.4) { S.overlapFrames++; (S.overlaps ||= []).push([+m.toFixed(2), tag(L[mi]), tag(L[mj])]); if (S.overlaps.length > 20) S.overlaps.shift(); }
    }
  });
  return {
    S, C, A, D,
    track(on = true) { S.on = on; return on; },
    reset() { S.on = true; S.minPair = Infinity; S.minWho = null; S.overlaps = []; S.frames = 0; S.overlapFrames = 0; S.samples = 0; C.stats.minDist = Infinity; C.stats.ghosts = 0; for (const k of Object.keys(D.hist)) delete D.hist[k]; for (const k of Object.keys(A.stats)) A.stats[k] = typeof A.stats[k] === 'object' ? {} : 0; return true; },
    stats() {
      return {
        people: P().list.length, agents: C.agents.filter((a) => a.active && !a.hidden).length, minPair: +S.minPair.toFixed(3), minWho: S.minWho, overlapFrames: S.overlapFrames, overlaps: S.overlaps, frames: S.frames,
        ghosts: C.stats.ghosts, hist: { ...D.hist }, counts: { ...D.counts }, aware: JSON.parse(JSON.stringify(A.stats)), residents: g.residents ? { ...g.residents.stats } : null, cat: { ...cat.stats },
      };
    },
    fill(n = 6) { const out = []; for (let i = 0; i < n; i++) { const p = P().spawn('ambient'); const x = -20 + Math.random() * 40; for (const q of [p, p.mate].filter(Boolean)) { q.h.root.position.x = x + (q === p ? 0 : -p.dir * 0.4); } out.push(p.arch); } return out; },
    /** n customers heading for one machine: the first plays, the rest line up behind. */
    queue(n = 3, i = 0) {
      const Pd = P(), m = g.machines[i];
      const out = [];
      for (let k = 0; k < n; k++) {
        const p = Pd.spawn();
        for (const q of [p, p.mate].filter(Boolean)) { if (q !== p) { Pd.remove(q); } }
        p.h.root.position.set(0.4 + (k - 1) * 0.7, 0, 6.4 + k * 0.4); p.path = []; p.plan = []; p.wantsIn = true;
        Pd.routeIn(p, m);
        out.push(p.state);
      }
      return out;
    },
    meet(x = 6) {
      const Pd = P(), out = [];
      for (const dir of [1, -1]) {
        let p = null;
        for (let t = 0; t < 12 && (!p || !p.local); t++) { if (p) Pd.remove(p); p = Pd.spawn('ambient'); if (p.mate) Pd.remove(p.mate); }
        p.h.root.position.set(x - dir * 1.1, 0, 9.2 + dir * 0.4); p.path = [V(dir * 35, p.laneZ)]; p.plan = []; p.wantsIn = false; p.dir = dir; p.t = 10; p.met = true;
        out.push(p);
      }
      Pd.startJob(out[0], ERRANDS.meet(Pd, out[0], out[1], true), 'meet');
      Pd.startJob(out[1], ERRANDS.meet(Pd, out[1], out[0], false), 'meet');
      return out.map((p) => p.kind);
    },
    at(kind = 'vending', x = null) {
      const Pd = P();
      // somebody who'd do that (no schoolboys smoking)
      let p = null;
      for (let t = 0; t < 16; t++) { if (p) Pd.remove(p); p = Pd.spawn('ambient'); if (p.mate) Pd.remove(p.mate); if ((ARCH[p.arch]?.errands?.[kind] || 0) > 0 && !p.dog && !p.bike) break; }
      const poi = (POIS[POI_OF[kind] || kind] || [null])[0] || { x: x ?? 0 };
      p.h.root.position.set((x ?? poi.x) - p.dir * 3, 0, p.laneZ);
      p.plan = []; p.wantsIn = false;
      if (ERRANDS[kind]) Pd.startJob(p, ERRANDS[kind](Pd, p, poi), 'errand');
      return [p.kind, p.arch];
    },
    slap() {
      const Pd = P(), pl = g.player.pos;
      const p = [...Pd.list].sort((a, b) => a.h.root.position.distanceTo(pl) - b.h.root.position.distanceTo(pl))[0];
      if (!p) return null;
      g.events.emit('slap', { point: p.h.root.position.clone().setY(1.4), object: p.hit, human: p.h });
      return p.kind;
    },
    /** A passer-by of a given kind (commuter, student, local, worker, visitor, office, jogger, tipsy, nightowl,
     *  dogwalker, cyclist) walking in at x (default: a tunnel end). */
    arch(kind = 'cyclist', x = null) {
      const Pd = P();
      for (const m of Pd.next.members) { /* the prebuilt one stays for later */ void m; }
      Pd.next = D.unit(() => Pd.seed++, kind);
      const p = Pd.spawn('ambient');
      if (x !== null) for (const q of [p, p.mate].filter(Boolean)) q.h.root.position.x = x + (q === p ? 0 : -p.dir * 0.5);
      if (p.dog) p.dog.pos.set(p.h.root.position.x + p.dir * 0.8, 0, p.h.root.position.z + 0.3);
      return [p.arch, p.kind, p.dir];
    },
    cat() { cat.left = 1; cat.nextT = 0; cat.nightOf = (g.clock?.day ?? 1) + ((g.clock?.hours ?? 15) < 12 ? -1 : 0); if (!cat.on) cat.start(); return cat.on; },
  };
}
