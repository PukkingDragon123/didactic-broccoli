// Calling the police on a friend (110 on the desk phone, dialled from the computer). An officer walks his white
// bicycle into the lane, parks it by the shutter, follows the accused wherever they run to, and questions them in a
// short cinematic chat (src/talk/Talk.js) on their screen (everyone else sees his lines float over his head). The
// host reads the session's rap sheet: pranks that weren't paid for yet (slaps, picked pockets) get the prankster
// fined (half for owning up, more for lying) and stolen money goes back to its owners; nothing on the sheet means a
// false report, and the caller pays. Fines come straight out of cash (then the bank; the rest is let slide).
//   caller -> host 'police' { acc, claim }    host -> all 'cop' { ph: 'come' | 'talk' | 'verdict' | 'leave', ... }
//   accused -> host 'cop' { ph: 'here' } then { ph: 'plea', v }      host -> payer 'fine' { amount, why }
import * as THREE from 'three';
import { Npc } from '../npc/Npc.js';
import { Human } from '../people/Human.js';
import { makeSpec } from '../people/presets.js';
import { propMesh } from '../world/props.js';
import { audio } from '../core/audio.js';
import { GARAGE } from '../world/Garage.js';

const yen = (n) => '¥' + Math.round(n).toLocaleString('en-US');
const FINE = { slap: 500, steal: 1000, falseReport: 1000, assault: 2000 };
const SPAWN = new THREE.Vector3(-24, 0, 9.4), BIKE_AT = new THREE.Vector3(1.75, 0, 6.55);
const NAMES = ['Officer Sato', 'Officer Tanaka', 'Officer Mori', 'Officer Kobayashi'];
const _v = new THREE.Vector3();

/** The bobby from the police box: light blue shirt, navy cap and trousers, a belt pouch. */
function officerHuman(seed) {
  const spec = makeSpec('delivery', seed);
  Object.assign(spec, {
    name: 'Officer', H: 1.74, build: 1.04,
    hair: { style: 'short', col: [36, 30, 30] },
    hat: { kind: 'cap', col: [34, 44, 82], col2: [222, 190, 92] },
    top: { kind: 'polo', col: [168, 198, 228], band: [34, 44, 82], sleeve: 'short', uniform: true },
    bottom: { kind: 'slacks', col: [32, 38, 66], noCrease: true },
    shoes: { kind: 'boots', col: [22, 20, 22] }, socks: { col: [30, 30, 36] },
    acc: [{ kind: 'pouch', col: [26, 24, 26] }],
    walk: { style: 'brisk' },
  });
  return new Human(spec, { lazy: true });
}

/** A police bicycle: the mamachari prop, repainted white. */
function policeBike() {
  const m = propMesh('bicycle');
  m.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.color) return;
    o.geometry = o.geometry.clone();
    const c = o.geometry.attributes.color;
    for (let i = 0; i < c.count; i++) {
      const r = c.getX(i), g = c.getY(i), b = c.getZ(i);
      // the mint frame (green-dominant) turns white
      if (g > r * 1.15 && g > b * 0.95 && g > 0.25) { const v = Math.min(1, 0.72 + g * 0.3); c.setXYZ(i, v, v, v * 0.98); }
    }
    c.needsUpdate = true;
  });
  return m;
}

export class Police {
  constructor(mp) {
    this.mp = mp;
    this.game = mp.game;
    this.cop = null; // { npc, bike, acc, by, phase, ... } on every client
    this.case = null; // host: the case being handled
    this.group = new THREE.Group();
    this.group.name = 'police';
    this.game.scene.add(this.group);
  }
  get s() { return this.mp.s; }

  install() {
    const S = this.s, g = this.game;
    S.on('police', (m, from) => { if (this.mp.isHost) this.hostCall(from, m.acc, m.claim); });
    S.on('cop', (m, from) => this.onCop(m, from));
    S.on('fine', (m) => this.onFine(m));
    this.hookPhone();
    if (this.hooked) return;
    this.hooked = true;
    // slapping an officer is a bad idea
    g.events.on('slap', (e) => { if (this.cop && e?.human === this.cop.npc.h && this.mp.active) S.toHost({ t: 'cop', ph: 'assault' }); });
  }

  // ------------------------------------------------------------------ 110 on the computer
  hookPhone() {
    const ph = this.game.os?.phone;
    if (!ph || ph._net) return;
    ph._net = true;
    const orig = ph.entries().find((e) => e.number === '110');
    const base = orig?.onCall;
    ph.register('110', {
      ...(orig || { name: 'Police (emergency)', icon: 'os_warn' }),
      onCall: async (c) => {
        const others = this.mp.active ? this.s.others() : [];
        if (!others.length) return base?.(c);
        const v = await c.ask('Morio Police. What is your emergency?', [
          ...others.map((p) => ({ label: `Report ${p.name}`, value: 'p:' + p.id })),
          { label: 'Something else', value: 'else' },
        ]);
        if (v === 'else') return base?.(c);
        if (!v) return;
        const acc = v.slice(2), name = this.s.players.get(acc)?.name || 'them';
        const claim = await c.ask(`And what did ${name} do?`, [{ label: 'They slapped me!', value: 'slap' }, { label: 'They picked my pocket!', value: 'steal' }, { label: 'Nothing. Hehe. (prank)', value: 'prank' }]);
        if (!claim) return;
        if (this.cop || this.case) { await c.say('All our officers are busy right now. Please call back later.'); return; }
        await c.say(claim === 'prank' ? 'Hm. We take every call seriously, caller. An officer is on his way.' : `Understood. An officer is on his way to talk to ${name}. Please stay calm.`);
        this.s.toHost({ t: 'police', acc, claim });
        this.game.events.emit('phone', { type: 'police', prank: claim === 'prank', number: '110', net: true });
      },
    });
  }

  // ------------------------------------------------------------------ host: the case
  hostCall(by, acc, claim) {
    if (this.case || !this.s.players.has(acc) || acc === by) return;
    const r = this.mp.social.rapOf(by);
    r.calls++;
    this.case = { by, acc, claim, t0: Date.now(), name: NAMES[Math.floor(Math.random() * NAMES.length)], seed: 1 + Math.floor(Math.random() * 900) };
    const C = this.case;
    this.s.broadcast({ t: 'cop', ph: 'come', acc, by, claim, name: C.name, seed: C.seed });
    this.onCop({ ph: 'come', acc, by, claim, name: C.name, seed: C.seed }, 'H');
    // if they never meet (the accused hid in a cupboard...), he finds them anyway
    C.timer = setTimeout(() => this.hostTalk(), 50000);
    this.mp.social.publish();
  }

  hostTalk() {
    const C = this.case;
    if (!C || C.talking) return;
    C.talking = true;
    clearTimeout(C.timer);
    const r = this.mp.social.rapOf(C.acc);
    const open = r.open.slice();
    const slaps = open.filter((o) => o.kind === 'slap').length, steals = open.filter((o) => o.kind === 'steal');
    C.open = open;
    C.guilty = open.length > 0;
    C.fine = slaps * FINE.slap + steals.reduce((a, o) => a + Math.max(FINE.steal, o.amount * 2), 0);
    const m = { t: 'cop', ph: 'talk', acc: C.acc, by: C.by, guilty: C.guilty, slaps, steals: steals.length, stolen: steals.reduce((a, o) => a + o.amount, 0) };
    this.s.broadcast(m);
    this.onCop(m, 'H');
    C.timer = setTimeout(() => this.hostVerdict(-1), 26000);
  }

  hostVerdict(plea) {
    const C = this.case;
    if (!C || C.done) return;
    C.done = true;
    clearTimeout(C.timer);
    const S = this.mp.social, accName = this.s.players.get(C.acc)?.name || 'They', byName = this.s.players.get(C.by)?.name || 'the caller';
    let payer, amount, line, why;
    if (C.guilty) {
      const k = plea === 1 ? 0.5 : plea === 0 ? 1.5 : 1;
      amount = Math.max(500, Math.round((C.fine * k) / 100) * 100);
      payer = C.acc;
      why = plea === 0 ? 'pranks, and lying to an officer' : 'pranks on your friends';
      line = plea === 1 ? `Thank you for being honest. That's a ${yen(amount)} fine. Behave!` : plea === 0 ? `Lying to an officer, too? That makes it ${yen(amount)}. Pay up.` : `The record speaks for itself. ${yen(amount)} fine. Play nice now.`;
      // what they stole goes back to its owners
      for (const o of C.open) {
        if (o.kind !== 'steal') continue;
        const th = S.rapOf(C.acc).thefts.find((x) => x.victim === o.victim && x.amount === o.amount && !x.back);
        if (th) { th.back = true; this.s.send(o.victim, { t: 'loot', from: 'police', amount: o.amount }); }
      }
      S.rapOf(C.acc).open = [];
      S.rapOf(C.acc).fines += amount;
    } else {
      amount = FINE.falseReport;
      payer = C.by;
      why = 'a false report to the police';
      line = `${accName} hasn't done anything. Prank calls are an offence: ${byName} pays ${yen(amount)}.`;
      S.rapOf(C.by).fines += amount;
    }
    this.s.send(payer, { t: 'fine', amount, why });
    const m = { t: 'cop', ph: 'verdict', payer, amount, line, guilty: C.guilty };
    this.s.broadcast(m);
    this.onCop(m, 'H');
    S.feed(`${this.s.players.get(payer)?.name || 'Someone'} was fined ${yen(amount)} for ${why}`);
    S.publish();
    setTimeout(() => {
      this.s.broadcast({ t: 'cop', ph: 'leave' });
      this.onCop({ ph: 'leave' }, 'H');
      this.case = null;
    }, 7000);
  }

  // ------------------------------------------------------------------ everyone: the officer
  onCop(m, from) {
    const g = this.game, me = this.s.myId;
    if (this.mp.isHost && from !== 'H') {
      // the accused reached / answered the officer
      if (m.ph === 'here' && this.case && from === this.case.acc) this.hostTalk();
      else if (m.ph === 'plea' && this.case && from === this.case.acc) this.hostVerdict(m.v);
      else if (m.ph === 'assault') this.hostAssault(from);
      return;
    }
    if (this.mp.isHost && from === 'H' && (m.ph === 'here' || m.ph === 'plea' || m.ph === 'assault')) {
      if (m.ph === 'here' && this.case?.acc === 'H') this.hostTalk();
      else if (m.ph === 'plea' && this.case?.acc === 'H') this.hostVerdict(m.v);
      else if (m.ph === 'assault') this.hostAssault('H');
      return;
    }
    const names = (id) => (id === me ? 'you' : this.s.players.get(id)?.name || 'someone');
    if (m.ph === 'come') {
      this.spawn(m);
      const caller = this.s.players.get(m.by)?.name || 'Someone';
      if (m.acc === me) this.mp.ui?.toast(`${caller} called the police on you! An officer is coming...`, 'warn');
      else this.mp.ui?.log(`${m.by === me ? 'You' : caller} called the police on ${names(m.acc)}.`, 'sys');
      try { audio.play('bikeBell', { pos: SPAWN, vol: 0.6 }); } catch { /* */ }
    } else if (m.ph === 'talk') this.question(m);
    else if (m.ph === 'verdict') {
      const c = this.cop;
      if (c) { c.verdict = m.line; c.onVerdict?.(m.line); if (!c.chatting) c.npc.say(m.line, { dur: 5 }); }
    } else if (m.ph === 'leave') this.leave();
  }

  hostAssault(by) {
    const S = this.mp.social;
    if (!this.cop) return;
    S.rapOf(by).fines += FINE.assault;
    this.s.send(by, { t: 'fine', amount: FINE.assault, why: 'slapping a police officer' });
    S.feed(`${this.s.players.get(by)?.name || 'Someone'} slapped the officer! ${yen(FINE.assault)} fine.`);
    S.publish();
    const line = { t: 'cop', ph: 'verdict', line: 'Assaulting an officer?! That is a fine, young one!' };
    this.s.broadcast(line);
    this.onCop(line, 'H');
  }

  spawn(m) {
    this.leave(true);
    const g = this.game;
    const npc = new Npc(g, this.group, {
      id: 'officer', name: m.name || 'Officer Sato', color: '#9cc4ff', voice: { base: 140, duty: 0.5 }, speed: 1.35,
      build: () => officerHuman(m.seed || 7),
    });
    npc.place(SPAWN, Math.PI / 2);
    const bike = policeBike();
    this.group.add(bike);
    this.cop = { npc, bike, acc: m.acc, by: m.by, phase: 'come', reT: 0, t: 0, biking: true };
    npc.walk(this.route(SPAWN, BIKE_AT), { speed: 1.35 });
  }

  /** Where the accused is right now (my own position if it's me). */
  accPos(out = _v) {
    const c = this.cop, me = this.s.myId;
    if (!c) return null;
    if (c.acc === me) return out.copy(this.game.player.pos).setY(0);
    const R = this.mp.avatar(c.acc);
    return R ? out.copy(R.root.position).setY(0) : null;
  }

  route(a, b) {
    const L = this.game.lane;
    if (L?.route) return L.route(a, b);
    return [b.clone()];
  }

  update(dt) {
    const c = this.cop;
    if (!c) return;
    const g = this.game, n = c.npc;
    c.t += dt;
    n.update(dt);
    // the bike rolls along at his left until it's parked
    if (c.biking) {
      const yaw = n.yaw;
      c.bike.position.copy(n.pos).add(_v.set(Math.cos(yaw) * 0.42, 0, -Math.sin(yaw) * 0.42));
      c.bike.rotation.y = yaw - Math.PI / 2;
      if (!n.walking && c.phase === 'come') {
        c.biking = false;
        c.bike.position.copy(BIKE_AT); c.bike.rotation.y = 0;
        try { audio.play('kickstand', { pos: BIKE_AT, vol: 0.6 }); } catch { /* */ }
        c.phase = 'seek';
      }
    }
    if (c.phase === 'seek') {
      const p = this.accPos();
      if (!p) return;
      const d = n.distTo(p);
      if (d < 1.35) {
        n.stop(); n.faceTo(p); n.look = c.acc === this.s.myId ? 'player' : null;
        c.phase = 'wait';
        if (c.acc === this.s.myId) this.s.toHost({ t: 'cop', ph: 'here' });
        return;
      }
      c.reT -= dt;
      if (c.reT <= 0 || !n.walking) {
        c.reT = 1.2;
        const to = p.clone().add(_v.subVectors(n.pos, p).setY(0).normalize().multiplyScalar(1.05));
        n.walk(this.route(n.pos.clone(), to), { speed: d > 6 ? 1.9 : 1.35 });
      }
    } else if (c.phase === 'wait' || c.phase === 'talk') {
      const p = this.accPos();
      if (p) {
        n.faceTo(p);
        // they wandered off mid-chat: follow
        if (n.distTo(p) > 2.6 && !c.chatting) { c.phase = 'seek'; c.reT = 0; }
      }
    } else if (c.phase === 'leave' && !n.walking) {
      if (c.biking || n.distTo(SPAWN) < 1) { this.dispose(); return; }
      c.biking = true;
      n.walk([SPAWN.clone()], { speed: 1.5 });
    }
  }

  /** The questioning: a cinematic chat on the accused's screen, floating lines for everyone else. */
  async question(m) {
    const c = this.cop, g = this.game;
    if (!c) return;
    c.phase = 'talk';
    const n = c.npc, me = this.s.myId;
    const caller = m.by === me ? 'you' : this.s.players.get(m.by)?.name || 'someone';
    const what = m.guilty ? [m.slaps ? `${m.slaps} slap${m.slaps > 1 ? 's' : ''}` : '', m.steals ? `picking pockets (${yen(m.stolen)})` : ''].filter(Boolean).join(' and ') : '';
    const intro = `Evening. ${n.name}, Morio police box. We got a call from ${caller}.`;
    const ask = m.guilty ? `Our records say: ${what}. Anything to say?` : 'They say you\'ve been causing trouble. Have you?';
    if (m.acc !== me) {
      const accName = this.s.players.get(m.acc)?.name || 'them';
      n.say(`Evening, ${accName}. ${n.name}, Morio police. About that call...`, { dur: 4 });
      setTimeout(() => { if (this.cop === c && !c.verdict) n.say(ask.replace('Anything to say?', ''), { dur: 4 }); }, 4300);
      return;
    }
    // it's me: a proper talk
    if (g.pc?.active) g.pc.exit?.();
    if (g.mp?.sleep?.asleep) g.mp.sleep.getUp();
    c.chatting = true;
    const verdict = new Promise((res) => { c.onVerdict = res; if (c.verdict) res(c.verdict); });
    const script = async (t) => {
      await t.say(intro, { gesture: 'bow' });
      await t.say(ask, { expr: 'angry' });
      const i = await t.choose(m.guilty ? ['It wasn\'t me!', '...Yes. I did it.', 'They started it!'] : ['I didn\'t do anything!', 'Who, me? Never.', '...Is this a prank?'], { time: 9 });
      this.s.toHost({ t: 'cop', ph: 'plea', v: m.guilty ? i : -1 });
      const line = await Promise.race([verdict, new Promise((r) => setTimeout(() => r(null), 9000))]);
      if (line) await t.say(line, { expr: m.guilty ? 'angry' : 'neutral' });
      await t.wait(0.4);
    };
    try { await g.talk.start(n, script, { leave: false, name: n.name, color: '#9cc4ff' }); } catch (e) { console.warn('[net] police talk', e); }
    c.chatting = false;
    // the chat couldn't start (a cutscene...): answer anyway
    if (!c.pleaded) this.s.toHost({ t: 'cop', ph: 'plea', v: -1 });
    c.pleaded = true;
  }

  leave(now = false) {
    const c = this.cop;
    if (!c) return;
    if (now) { this.dispose(); return; }
    c.phase = 'leave';
    c.npc.look = null;
    c.npc.walk(this.route(c.npc.pos.clone(), BIKE_AT), { speed: 1.4 });
    c.biking = false;
  }

  dispose() {
    const c = this.cop;
    if (!c) return;
    this.cop = null;
    this.game.bubbles?.clear?.(c.npc.h);
    this.group.remove(c.npc.h.root);
    c.npc.dispose();
    this.group.remove(c.bike);
  }

  // ------------------------------------------------------------------ paying up
  onFine(m) {
    const g = this.game, W = g.wallet;
    let left = Math.round(m.amount || 0);
    const cash = Math.min(left, W.s.cash);
    if (cash > 0) { W.s.cash -= cash; g.updateMoney(false, -cash); left -= cash; }
    let bank = 0;
    if (left > 0 && W.s.bank > 0) { bank = Math.min(left, W.s.bank); this.mp.world.apply(() => W.takeBank(bank, 'Police fine')); left -= bank; }
    this.mp.ui?.ticket(m.amount, m.why, `${bank ? `${yen(bank)} came out of the bank. ` : ''}${left > 0 ? `${yen(left)} you couldn't pay: let slide, this time.` : 'Paid in cash.'}`);
    try { audio.play('error', { vol: 0.5 }); } catch { /* */ }
  }
}

export { GARAGE };
