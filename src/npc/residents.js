// The neighbours who aren't part of the lane's cast (the ones who answer their doorbells, src/npc/doors.js) have days
// of their own now: they come out of their own front doors and go back in through them. Mr. Suzuki leaves for the
// station in the morning and comes back in the evening; Mrs. Kimura and Mrs. Watanabe shop at Mikawa-ya; Mrs. Tanaka
// waters her plants morning and evening; Mrs. Ota sweeps in front of her gate and comes to have a look at your shop;
// Mr. Mori does his radio exercises at dawn; Gonta's mum calls him in for dinner. Weekends differ. Each outing runs
// once a day when its hour comes round (the game.lane coroutines); click them on the lane for their chat.
//   residentsLife(game) -> { update(dt), away(resId) -> bool (out at work: the intercom stays quiet), stats }
import * as THREE from 'three';
import { HOUSES, RES, outward } from './doors.js';
import { POIS } from './street.js';
import { wateringCan, bagMesh, holdIn, free } from './streetProps.js';
import { makeToolMesh } from '../game/Held.js';
import { audio } from '../core/audio.js';

const V = (x, z) => new THREE.Vector3(x, 0, z);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const sfx = (n, o = {}) => { try { audio.play(n, o); } catch { /* audio not ready */ } };
const EAST = 27, LANE_N = 7.0, LANE_F = 11.6;

// [hour, act, arg] on weekdays / weekends (Saturday, Sunday, holidays)
const DAYS = {
  suzuki: { wk: [[7.6, 'commute', 1], [19.1, 'back', 1]], we: [[10.5, 'shop'], [15.2, 'walk']] },
  kimura: { wk: [[10.3, 'shop'], [16.6, 'shop']], we: [[10.8, 'shop'], [15.5, 'walk']] },
  tanaka: { wk: [[7.3, 'water'], [14.2, 'shop'], [17.4, 'water']], we: [[7.6, 'water'], [17.4, 'water']] },
  ota: { wk: [[9.0, 'sweep'], [13.6, 'inspect']], we: [[9.4, 'sweep']] },
  mori: { wk: [[6.5, 'exercise'], [15.5, 'walk']], we: [[6.5, 'exercise'], [11.0, 'walk']] },
  watanabe: { wk: [[11.0, 'shop'], [16.0, 'walk']], we: [[11.5, 'walk']] },
  gontaMom: { wk: [[10.0, 'shop'], [18.6, 'call']], we: [[18.6, 'call']] },
};

export function residentsLife(game) {
  if (game.residents) return game.residents;
  const L = game.lane, D = game.doors;
  if (!L || !D) return null;
  const S = { done: {}, away: {}, stats: { outings: 0, byAct: {} }, t: 0, clicked: new Set() };
  const weekend = () => { try { const d = game.calendar?.dateOf(game.clock?.day ?? 1); return d.weekday === 0 || d.weekday === 6 || (d.specials || []).some((s) => s.kind === 'holiday'); } catch { return false; } };
  const house = (id) => HOUSES.find((h) => h.res === id);
  const door = (H) => V(H.door[0], H.door[1]);
  const gateIn = (H) => { const o = outward(H), gx = H.gate ? H.gate[0] : H.bell[0] + 0.35, gz = H.gate ? H.gate[1] : H.bell[1]; return V(gx, gz - o * 0.3); };
  const gateOut = (H) => { const o = outward(H), gx = H.gate ? H.gate[0] : H.bell[0] + 0.35, gz = H.gate ? H.gate[1] : H.bell[1]; return V(gx + 0.15, gz + o * 0.55); };
  const laneZ = (H) => (outward(H) > 0 ? LANE_N : LANE_F);
  const quiet = () => !!(game.cutscene?.active || game.talk?.active);
  const say = (n, text, o = {}) => { if (!quiet() && n.h.root.visible) n.say(text, o); };

  /** Build the resident (once) with a click target for a chat on the lane. */
  function who(id) {
    const H = house(id);
    if (!H) return null;
    const n = D.resident(H);
    if (n && !S.clicked.has(id)) {
      S.clicked.add(id);
      game.interaction.add(n.hit, {
        reach: 2.4,
        hint: () => (!n.present || n.busy || game.talk?.active || n.activity === 'door' ? null : { key: 'LMB', text: `Talk to ${L.mem.met(id) ? n.name : 'the neighbour'}`, sub: 'RMB: slap' }),
        use: () => { chat(n, H); return false; },
        alt: () => { game.fp?.slap?.(); },
        noHighlight: true,
      });
    }
    n.house = H;
    return n;
  }
  async function chat(n, H) {
    const g = game;
    if (!n.present || n.busy || !g.talk || g.talk.active) return;
    const first = L.mem.meet(n.id);
    L.cancel(n);
    n.clearGesture(); n.stop();
    dropProps(n);
    await g.talk.start(n, n.res.chat(L, n, first), { id: n.id });
    n.mem.seen = g.clock?.stamp ?? 0;
    // then on home
    if (n.present && n.activity !== 'door') { n.activity = 'home'; L.run(n, goIn(n, H)); }
  }
  function dropProps(n) { for (const m of n.props || []) free(m); n.props = []; }

  // ------------------------------------------------------------------ the outings (this = Lane)
  function* goOut(n, H) {
    n.place(door(H), Math.atan2(gateIn(H).x - H.door[0], gateIn(H).z - H.door[1]));
    n.setPresent(true);
    sfx('slideDoor', { pos: door(H).setY(1), vol: 0.4 });
    n.ghost = true;
    n.walk(H.atDoor ? [gateOut(H)] : [gateIn(H), gateOut(H)]);
    yield () => !n.walking;
    n.ghost = false;
  }
  function* goIn(n, H) {
    if (!n.present) return;
    yield L.goTo(n, V(gateOut(H).x, laneZ(H)));
    n.ghost = true;
    n.walk([gateOut(H), ...(H.atDoor ? [] : [gateIn(H)]), door(H)]);
    yield () => !n.walking;
    n.ghost = false;
    dropProps(n);
    sfx('slideDoor', { pos: door(H).setY(1), vol: 0.35 });
    n.setPresent(false);
    n.activity = null;
  }
  const ACTS = {
    *commute(n, H, dir) {
      yield* goOut(n, H);
      say(n, pick(['Ittekimasu.', 'Off to work...', 'Haa... Monday again.']), {});
      yield L.goTo(n, V(dir * EAST, dir > 0 ? LANE_N : LANE_F), { speed: 1.45 });
      n.setPresent(false);
      S.away[n.id] = true;
      n.activity = null;
    },
    *back(n, H, dir) {
      S.away[n.id] = false;
      n.place(V(dir * (EAST + 2), dir > 0 ? LANE_F : LANE_N), dir > 0 ? -Math.PI / 2 : Math.PI / 2);
      n.setPresent(true);
      yield L.goTo(n, V(gateOut(H).x + dir * 1, laneZ(H)), { speed: 1.2 });
      if (n.playerDist < 10) say(n, pick(['Tadaima...', 'What a day.', 'Haa... home.']), {});
      yield* goIn(n, H);
    },
    *shop(n, H) {
      const poi = POIS.mikawaya[0], mk = game.places?.mikawaya;
      yield* goOut(n, H);
      if (mk?.cashier?.active) { yield* goIn(n, H); return; }
      yield L.goTo(n, poi.out);
      n.walk([poi.door]); yield () => !n.walking;
      const b = pick(poi.browse);
      n.walk([V(b[0], b[1])], { face: b[2] }); yield () => !n.walking;
      n.gesture('browse');
      yield L.wait(rnd(5, 10));
      n.clearGesture();
      // (the left end of the counter: the passers-by pay at the right end)
      n.walk([V(-12.75, 16.72)], { face: 0 }); yield () => !n.walking;
      say(n, pick(['This, please.', 'And some tofu.', 'Ah, Mikawa-san. Just these.']), {});
      yield L.wait(1.5);
      sfx('coinDrop', { pos: V(-12.75, 16.72).setY(0.95), vol: 0.3 });
      n.h.nod?.(0.8);
      yield L.wait(1);
      n.props = [holdIn(n.h, bagMesh(), 'L', [0, -0.12, 0])];
      n.walk([poi.door, poi.out]); yield () => !n.walking;
      yield* goIn(n, H);
    },
    *water(n, H) {
      yield* goOut(n, H);
      const o = outward(H), at = gateOut(H);
      n.walk([V(at.x + 0.7, at.z - o * 0.05)], { face: o > 0 ? Math.PI : 0 }); yield () => !n.walking;
      n.props = [holdIn(n.h, wateringCan(), 'R', [0, -0.05, 0.02])];
      n.gesture('water');
      if (n.playerDist < 12) say(n, pick(['There you go, little ones.', 'Thirsty today, aren\'t you.', 'Grow, grow...']), { style: 'think' });
      yield L.wait(rnd(25, 45));
      n.clearGesture(); dropProps(n);
      yield* goIn(n, H);
    },
    *sweep(n, H) {
      yield* goOut(n, H);
      const o = outward(H), at = gateOut(H);
      let broom = null;
      try { broom = makeToolMesh('broom'); broom.scale.setScalar(broom.userData.handScale || 1); } catch { broom = null; }
      if (broom) { holdIn(n.h, broom, 'R', [0, -0.25, 0.08]); broom.rotation.x = 0.5; n.props = [broom]; }
      for (let k = 0; k < 3; k++) {
        n.walk([V(at.x + (k - 1) * 1.1, at.z + o * 0.25)], { face: o > 0 ? 0 : Math.PI }); yield () => !n.walking;
        n.gesture('sweep');
        sfx('sweep', { pos: n.pos.clone().setY(0.3), vol: 0.3 });
        yield L.wait(rnd(8, 14));
      }
      if (n.playerDist < 12) say(n, pick(['Hmph. Leaves everywhere.', 'Somebody has to keep this lane decent.']), { style: 'think' });
      n.clearGesture(); dropProps(n);
      yield* goIn(n, H);
    },
    *inspect(n, H) {
      yield* goOut(n, H);
      yield L.goTo(n, V(0.4 + rnd(-1, 1), 7.2));
      n.faceTo(V(0.4, 4));
      n.gesture('arms_crossed');
      if (n.playerDist < 14) say(n, pick(['Hmph. Still standing.', 'Keep it tidy. It\'s MY garage.', 'Not bad... not bad.']), {});
      yield L.wait(rnd(6, 10));
      n.clearGesture();
      yield* goIn(n, H);
    },
    *exercise(n, H) {
      yield* goOut(n, H);
      n.faceYaw = outward(H) > 0 ? 0 : Math.PI;
      if (n.playerDist < 14) say(n, 'Radio taiso... ichi, ni, san, shi!', {});
      for (let k = 0; k < 6; k++) { n.gesture(k % 2 ? 'stretch' : 'yawn'); yield L.wait(2.8); }
      n.clearGesture();
      yield* goIn(n, H);
    },
    *walk(n, H) {
      yield* goOut(n, H);
      const x = Math.max(-22, Math.min(22, gateOut(H).x + pick([-1, 1]) * rnd(8, 16)));
      yield L.goTo(n, V(x, laneZ(H) + rnd(-0.4, 0.4)), { speed: n.speed * 0.85 });
      yield L.wait(rnd(3, 8));
      yield* goIn(n, H);
    },
    *call(n, H) {
      yield* goOut(n, H);
      const G = L.npc('gonta');
      n.faceYaw = outward(H) > 0 ? 0 : Math.PI;
      for (let k = 0; k < 2; k++) {
        say(n, k ? 'GONTA! I\'m not calling a THIRD time!' : 'GONTAAA! DINNER!', { style: 'shout' });
        yield L.wait(3.5);
      }
      if (G?.present && !G.busy) { G.today = { override: 'home', until: L.time + 600 }; G.say?.('Coming, Mum!', { style: 'shout' }); }
      yield L.wait(2);
      yield* goIn(n, H);
    },
  };

  function update(dt) {
    S.t += dt;
    if (game.grandpa?.hidden) return; // (his scenes and the opening keep the lane clear: no outings start)
    if ((S.chk = (S.chk || 0) - dt) > 0) return;
    S.chk = 1.5;
    if (game.cutscene?.active || !game.story?.done && !game.state.story?.complete) return;
    const h = game.clock?.hours ?? 15, day = game.clock?.day ?? 1, we = weekend();
    for (const [id, sched] of Object.entries(DAYS)) {
      for (const [at, act, arg] of we ? sched.we : sched.wk) {
        if (h < at || h > at + 1.25) continue;
        const key = day + ':' + id + ':' + at;
        if (S.done[key]) continue;
        const H = house(id);
        if (!H || D.busy === H) continue;
        const n = who(id);
        if (!n || n.busy || L.busy(n) || n.activity === 'door') continue;
        S.done[key] = true;
        n.activity = act;
        n.props = n.props || [];
        L.run(n, ACTS[act].call(L, n, H, arg));
        S.stats.outings++;
        S.stats.byAct[act] = (S.stats.byAct[act] || 0) + 1;
      }
    }
    // weekday: Mr. Suzuki is at work from his commute to his return
    if (!we && (h >= 7.6 && h < 19.1)) S.away.suzuki = S.away.suzuki ?? true; else if (we || h >= 19.1 || h < 7.6) { if (!residentBusy('suzuki')) S.away.suzuki = false; }
  }
  const residentBusy = (id) => { const n = D.residents[id]; return n && (n.present || L.busy(n)); };

  game.residents = { update, away: (id) => !!S.away[id], stats: S.stats, S, who, RES };
  return game.residents;
}
