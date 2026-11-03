// What each piece of furniture DOES (src/build/catalogue.js `feature`). A feature is
//   { init(p, g), hint(p, held, g) -> { key, text, sub } | null, use(p, held, g), secondary?(p, g) + key2 label,
//     update?(p, dt, g) (only while it has something to animate), quality?(p, g) -> 0..1, dispose?(p, g) }
// p is the placed piece: { data (saved: id, uid, x, y, z, rot, st), def, root, parts, game }.
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { radio } from '../core/music.js';
import { pocketCash } from '../game/cash.js';
import { cashInHand, payOut } from '../money/cashfx.js';
import { yenCoinGeometry } from '../world/machineModels.js';
import { voxelMaterials } from '../voxel/materials.js';
import { photoInfo, randomPhoto } from './photos.js';
import { drawCalendar, NEON_DESIGNS, setFlaps } from './models.js';
import { STORAGE } from './storage.js';
import { VACUUM } from './vacuum.js';

const fmt = (n) => '¥' + Math.round(n).toLocaleString('en-US');
const _v = new THREE.Vector3();
const at = (p, x, y, z) => p.root.localToWorld(new THREE.Vector3(x, y, z));
const wobble = (g, obj, amt = 0.08, dur = 0.4) => { const r0 = obj.rotation.z; g.tweens.add({ dur, update: (k) => { obj.rotation.z = r0 + Math.sin(k * Math.PI * 4) * amt * (1 - k); }, done: () => { obj.rotation.z = r0; } }); };
const near = (p, g, r = 10) => p.root.position.distanceToSquared(g.player.pos) < r * r;

// ------------------------------------------------------------------ money
const piggy = {
  hint(p, held, g) {
    const W = g.wallet;
    return { key: 'LMB', text: W.cash > 0 ? `Drop ${fmt(Math.min(1000, W.cash))} in the piggy bank` : 'Piggy bank', sub: `${fmt(W.piggy)} inside · E shake ${fmt(Math.min(1000, W.piggy))} out` };
  },
  use(p, held, g) {
    const W = g.wallet, v = Math.min(1000, W.cash);
    if (v <= 0) { audio.play('piggyShake', { pos: p.root.position, vol: 0.5 }); g.news('Your wallet is empty', 'Nothing to drop in'); return; }
    W.toPiggy(v);
    g.updateMoney(false, -v);
    const slot = at(p, 0, 0.13, -0.01);
    payOut(g, v, slot);
    g.tweens.wait(0.35, () => { audio.play('piggyCoin', { pos: slot, vol: 0.8 }); wobble(g, p.root, 0.12); });
    g.events.emit('piggy', { delta: v, total: W.piggy });
  },
  key2: 'E',
  secondary(p, g) {
    const W = g.wallet, v = Math.min(1000, W.piggy);
    if (v <= 0) { audio.play('piggyShake', { pos: p.root.position, vol: 0.4 }); wobble(g, p.root, 0.2, 0.6); g.news('The piggy bank is empty'); return; }
    W.s.piggy -= v;
    W.emit('piggy', -v);
    audio.play('piggyShake', { pos: p.root.position, vol: 0.8 });
    wobble(g, p.root, 0.3, 0.6);
    cashInHand(g, v, { from: at(p, 0, 0.12, 0), label: 'Out of the piggy bank', onNote: (x) => { W.addCash(x); g.updateMoney(false, x); } });
    g.events.emit('piggy', { delta: -v, total: W.piggy });
  },
  quality: (p) => p.def.quality,
};

const register = {
  hint(p, held, g) {
    const v = g.wallet.register;
    return v > 0 ? { key: 'LMB', text: `Take the takings (${fmt(v)})`, sub: p.def.name } : { key: 'LMB', text: p.def.name, sub: "Customers' cash lands here" };
  },
  use(p, held, g) {
    const v = g.wallet.emptyRegister();
    const pos = at(p, 0, 0.15, 0.05);
    if (p.def.id === 'cash_register') audio.play('registerDrawer', { pos, vol: 0.8 });
    if (v <= 0) { if (p.def.id !== 'cash_register') audio.play('coinClink', { pos, v: 0.5 }); return; }
    g.wallet.s.cash -= v; // cashInHand counts it in note by note
    cashInHand(g, v, { from: pos, label: 'The takings, into your wallet', onNote: (x) => { g.wallet.s.cash += x; g.updateMoney(false, x); } });
  },
};

// tip jar: coins you can see inside
const tipjar = {
  init(p, g) {
    p.data.st.yen ??= 0;
    const im = new THREE.InstancedMesh(yenCoinGeometry(), voxelMaterials('normal'), 40);
    im.count = 0;
    im.castShadow = false;
    im.frustumCulled = false; // (its bounds would be computed while empty)
    p.root.add(im);
    p.parts.coins = im;
    tipjar.refresh(p);
  },
  refresh(p) {
    const im = p.parts.coins, n = Math.min(40, Math.ceil((p.data.st.yen || 0) / 30));
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let i = 0; i < n; i++) {
      const a = i * 2.4, r = 0.012 + ((i * 7) % 5) * 0.004;
      e.set((i % 3 - 1) * 0.4, a, (i % 2) * 0.3);
      m.compose(_v.set(Math.cos(a) * r, 0.012 + i * 0.0028, Math.sin(a) * r), q.setFromEuler(e), new THREE.Vector3(1, 1, 1));
      im.setMatrixAt(i, m);
    }
    im.count = n;
    im.instanceMatrix.needsUpdate = true;
  },
  hint(p) { const y = p.data.st.yen || 0; return y > 0 ? { key: 'LMB', text: `Empty the tip jar (${fmt(y)})`, sub: 'Happy customers tip' } : { key: '', text: 'Tip jar', sub: 'Happy customers drop coins in' }; },
  use(p, held, g) {
    const y = p.data.st.yen || 0;
    if (y <= 0) return;
    p.data.st.yen = 0;
    tipjar.refresh(p);
    pocketCash(g, y, at(p, 0, 0.1, 0), { coins: Math.min(12, Math.ceil(y / 50)), label: 'Tips' });
    g.events.emit('tipsCollected', { amount: y });
    g.save();
  },
  /** A coin arcs into the jar from `from`. */
  tip(p, amount, from, g) {
    const c = new THREE.Mesh(yenCoinGeometry(), voxelMaterials('normal'));
    const to = at(p, 0, 0.12, 0);
    const a = from ? from.clone() : to.clone().add(new THREE.Vector3(0.4, 0.5, 0.3));
    c.position.copy(a);
    g.scene.add(c);
    g.tweens.add({ dur: 0.6, update: (k) => { c.position.lerpVectors(a, to, k); c.position.y += Math.sin(k * Math.PI) * 0.35; c.rotation.x += 0.4; }, done: () => {
      c.parent?.remove(c);
      p.data.st.yen = (p.data.st.yen || 0) + amount;
      tipjar.refresh(p);
      audio.play('jarCoin', { pos: to, vol: 0.8 });
    } });
  },
  quality: (p) => p.def.quality,
};

// ------------------------------------------------------------------ fun
const GUM_PRICE = 20, GUM_STOCK = 40;
const GUM_COLS = [0xff4f6a, 0xffd23f, 0x5cc4ff, 0x58c06c, 0xff9a3c, 0xb88ae8, 0xfff4e8];
const gumball = {
  init(p) { const s = p.data.st; s.stock ??= GUM_STOCK; s.coins ??= 0; gumball.refresh(p); },
  refresh(p) {
    const k = Math.ceil((p.data.st.stock / GUM_STOCK) * 4);
    p.parts.fills.forEach((f, i) => { f.visible = i === k - 1; });
  },
  hint(p, held, g) {
    const s = p.data.st;
    const coins = s.coins > 0 ? ` · E empty its coin box (${fmt(s.coins)})` : '';
    if (p.ball) return { key: 'LMB', text: 'Take the gumball', sub: 'Fresh out of the chute' };
    if (p.turning) return null;
    if (s.stock <= 0) return { key: 'LMB', text: 'Refill the globe (¥500 cash)', sub: 'Empty!' + coins };
    return { key: 'LMB', text: `Buy a gumball (${fmt(GUM_PRICE)})`, sub: `${s.stock} left${coins}` };
  },
  use(p, held, g) {
    const s = p.data.st;
    if (p.ball) { gumball.take(p, g); return; }
    if (p.turning) return;
    if (s.stock <= 0) {
      if (!g.wallet.via('cash', () => g.spend(500, 'Gumballs'))) return;
      s.stock = GUM_STOCK; gumball.refresh(p);
      audio.play('gumballRoll', { pos: p.root.position, vol: 0.6 });
      g.news('The globe is full again', `${GUM_STOCK} gumballs`);
      return;
    }
    if (!g.wallet.via('cash', () => g.spend(GUM_PRICE, 'Gumball'))) return;
    s.coins += GUM_PRICE;
    gumball.crank(p, g, true);
  },
  /** Coin in, knob round, a gumball rolls into the little tray (yours = it waits for you to take it). */
  crank(p, g, mine) {
    const s = p.data.st;
    p.turning = true;
    const knob = p.parts.knob;
    audio.play('coinInsert', { pos: at(p, 0, 0.75, 0.15), vol: 0.5 });
    g.tweens.add({ delay: 0.35, dur: 0.7, update: (k) => { knob.rotation.z = -k * Math.PI * 2; }, done: () => { knob.rotation.z = 0; } });
    g.tweens.wait(0.35, () => audio.play('gumballCrank', { pos: at(p, 0, 0.71, 0.16), vol: 0.7 }));
    g.tweens.wait(1.1, () => {
      s.stock = Math.max(0, s.stock - 1);
      gumball.refresh(p);
      audio.play('gumballRoll', { pos: at(p, 0, 0.66, 0.16), vol: 0.7 });
      const col = GUM_COLS[Math.floor(Math.random() * GUM_COLS.length)];
      const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.014, 1), new THREE.MeshStandardMaterial({ color: col, roughness: 0.3, flatShading: true }));
      ball.position.copy(p.parts.trayPos).add(new THREE.Vector3(0, 0.04, -0.03));
      p.root.add(ball);
      const a = ball.position.clone(), b = p.parts.trayPos.clone().add(new THREE.Vector3(0, 0.012, 0.012));
      g.tweens.add({ dur: 0.45, update: (k) => { ball.position.lerpVectors(a, b, k); ball.rotation.x += 0.3; }, done: () => {
        p.turning = false;
        if (mine) { p.ball = { mesh: ball, color: col }; return; }
        g.tweens.wait(1.2, () => ball.parent?.remove(ball)); // a customer took it
      } });
    });
  },
  take(p, g) {
    const b = p.ball;
    p.ball = null;
    b.mesh.parent?.remove(b.mesh);
    if (!g.held.giveTool('gumball', { color: b.color })) { eatGumball(g); return; }
    audio.play('pickup', { vol: 0.6 });
  },
  key2: 'E',
  secondary(p, g) {
    const s = p.data.st;
    if (!(s.coins > 0)) return;
    const v = s.coins;
    s.coins = 0;
    pocketCash(g, v, at(p, 0, 0.66, 0.12), { coins: Math.min(10, Math.ceil(v / 20)), label: 'The gumball machine' });
    g.save();
  },
  /** A customer buys one (called from the shop's machine plays). */
  customer(p, g) {
    const s = p.data.st;
    if (s.stock <= 0 || p.turning || p.ball) return false;
    s.coins += GUM_PRICE;
    gumball.crank(p, g, false);
    return true;
  },
  quality: (p) => p.def.quality * (p.data.st.stock > 0 ? 1 : 0.4),
};

/** Chew a gumball: crunch, chew, and blow a bubble that pops. */
export function eatGumball(g) {
  audio.play('chew', { vol: 0.8 });
  g.events.emit('eat', { item: 'gumball', energy: 2, kcal: 10 });
  g.tweens.wait(1.3, () => {
    const p = g.camera.localToWorld(new THREE.Vector3(0, -0.12, -0.32));
    g.effects.puff({ pos: p, count: 4, colors: [0xff8ab8, 0xffb0d0], size: 0.03, speed: 0.15, up: 0.05, life: 0.5 });
    audio.play('bubblePop', { vol: 0.7 });
  });
}

const bell = {
  hint: () => ({ key: 'LMB', text: 'Ring the bell', sub: 'Ding!' }),
  use(p, held, g) {
    const pos = at(p, 0, 0.07, 0);
    audio.play('bellDing', { pos, vol: 0.9 });
    g.effects.mark({ pos: pos.clone().add(new THREE.Vector3(0, 0.08, 0)), sprite: 'note', color: 0xffd23f, life: 1.2 });
    const k = p.root.children[0];
    if (k) { const y = k.position.y; g.tweens.add({ dur: 0.12, update: (q) => { k.position.y = y - Math.sin(q * Math.PI) * 0.004; }, done: () => { k.position.y = y; } }); }
    g.events.emit('bellRing', { pos, piece: p.data.uid });
  },
};

// ------------------------------------------------------------------ decor
const poster = {
  init(p, g) {
    const s = p.data.st;
    if (!s.photo) {
      const used = [...g.decor.pieces.values()].map((q) => q.data.st?.photo).filter(Boolean);
      s.photo = randomPhoto(used);
      s.frame = Math.floor(Math.random() * 6);
    }
    p.root.rotation.z = s.tilt || 0;
  },
  hint(p) { const i = photoInfo(p.data.st.photo); return { key: 'LMB', text: i ? `"${i.title}"` : 'Photo poster', sub: `Photo: ${i?.author || '?'} (CC BY 2.0) · E ${p.data.st.tilt ? 'straighten it' : 'tilt it'}` }; },
  use(p, held, g) { const i = photoInfo(p.data.st.photo); if (i) g.news(`"${i.title}"`, `Photo by ${i.author}, CC BY 2.0 (Google Open Images)`, 5200); },
  key2: 'E',
  secondary(p, g) {
    const s = p.data.st;
    s.tilt = s.tilt ? 0 : (Math.random() < 0.5 ? -1 : 1) * (0.03 + Math.random() * 0.05);
    const r0 = p.root.rotation.z;
    g.tweens.add({ dur: 0.25, update: (k) => { p.root.rotation.z = r0 + (s.tilt - r0) * k; } });
    audio.play('paper', { pos: p.root.position, vol: 0.5 });
  },
};

const clock = {
  init(p, g) { clock.set(p, g); p.unsub = g.events.on?.('hour', ({ hour }) => clock.chime(p, g, hour)); },
  set(p, g) {
    const m = g.clock?.minuteOfDay ?? 600;
    p.parts.minute.rotation.z = -((m % 60) / 60) * Math.PI * 2;
    p.parts.hour.rotation.z = -(((m / 60) % 12) / 12) * Math.PI * 2;
  },
  update(p, dt, g) { if ((p._t = (p._t || 0) - dt) <= 0) { p._t = 0.5; clock.set(p, g); } },
  chime(p, g, hour) {
    if (!p.root.parent || !near(p, g, 9)) return;
    const n = Math.min(4, (hour % 12) || 12);
    audio.play('clockChime', { pos: p.root.position, vol: 0.6, n });
  },
  hint: (p, held, g) => ({ key: 'LMB', text: `It's ${g.clock?.time || '--:--'}`, sub: g.calendar?.format?.(undefined, true) || '' }),
  use(p, held, g) { audio.play('clockTock', { pos: p.root.position, vol: 0.7 }); },
};

const calendar = {
  init(p, g) { drawCalendar(p.parts.calCanvas, g); p.parts.calTex.needsUpdate = true; p.unsub = g.events.on?.('newDay', () => { drawCalendar(p.parts.calCanvas, g); p.parts.calTex.needsUpdate = true; }); },
  hint: (p, held, g) => ({ key: 'LMB', text: g.calendar?.format?.(undefined, true) || 'Calendar', sub: 'Click: what is coming up' }),
  use(p, held, g) {
    const cal = g.calendar, day = g.clock?.day ?? 1;
    if (!cal) return;
    const up = [];
    for (let d = day; d < day + 21 && up.length < 3; d++) for (const s of cal.special(d) || []) if (up.length < 3) up.push(`${d === day ? 'Today' : cal.format(d)}: ${s.name}`);
    audio.play('paper', { pos: p.root.position, vol: 0.5 });
    g.news(up.length ? 'Coming up' : 'Nothing special for three weeks', up.join(' · '), 7000);
  },
};

const rug = {
  hint: (p, held, g) => ({ key: 'LMB', text: 'Shake out the rug', sub: g.time - (p.shook ?? -999) < 90 ? 'Already clean' : 'Gets the dust out of the shop' }),
  use(p, held, g) {
    audio.play('rugShake', { pos: p.root.position, vol: 0.8 });
    for (let i = 0; i < 3; i++) g.tweens.wait(i * 0.2, () => g.effects.puff({ pos: at(p, (Math.random() - 0.5) * 0.8, 0.1, (Math.random() - 0.5) * 0.4), count: 5, colors: [0xc8b8a0, 0xa89880], size: 0.06, up: 0.3 }));
    const body = p.parts.rug;
    if (body) g.tweens.add({ dur: 0.6, update: (k) => { body.position.y = 0.004 + Math.abs(Math.sin(k * Math.PI * 3)) * 0.05 * (1 - k); } });
    if (g.time - (p.shook ?? -999) >= 90 && g.sim?.s) { g.sim.s.dirt = Math.max(0, g.sim.s.dirt - 0.08); p.shook = g.time; }
  },
};

const plant = {
  hint: (p) => ({ key: 'LMB', text: p.def.name, sub: 'Touch the leaves' }),
  use(p, held, g) {
    audio.play('leafRustle', { pos: p.root.position, vol: 0.7 });
    g.effects.sparks({ pos: at(p, 0, p.box.max.y * 0.7, 0), count: 6, colors: [0x58c06c, 0x2f8a48, 0x9fdc7a], speed: 0.3, size: 0.012, star: 0, gravity: 0.8, life: 1 });
    wobble(g, p.root, 0.05, 0.5);
  },
};

// ------------------------------------------------------------------ signs
const neon = {
  init(p, g) { const s = p.data.st; s.on ??= true; s.design ??= p.def.model.neon; neon.show(p, g); },
  show(p) { const N = p.parts.neon; N.face.material.map = p.data.st.on && !p.flick ? N.on : N.off; N.face.material.needsUpdate = true; },
  hint: (p) => ({ key: 'LMB', text: p.data.st.on ? 'Switch the neon off' : 'Switch the neon on', sub: 'E change the design' }),
  use(p, held, g) { p.data.st.on = !p.data.st.on; audio.play('switchClick', { pos: p.root.position, vol: 0.7 }); neon.show(p, g); },
  key2: 'E',
  secondary(p, g) {
    const s = p.data.st;
    s.design = ((s.design ?? 0) + 1) % NEON_DESIGNS.length;
    g.decor.rebuild(p);
    audio.play('switchClick', { pos: p.root.position, vol: 0.6 });
  },
  update(p, dt, g) {
    // a tube that ticks now and then (a stepped blink, never a soft fade)
    if (!p.data.st.on || !near(p, g, 16)) return;
    p._f = (p._f ?? 3 + Math.random() * 8) - dt;
    if (p._f <= 0) { p.flick = !p.flick; p._f = p.flick ? 0.06 + Math.random() * 0.08 : 4 + Math.random() * 12; neon.show(p, g); }
  },
  quality: (p, g) => (p.data.st.on ? p.def.quality * (0.7 + 0.3 * (1 - (g.clock?.daylight?.() ?? 1))) : 0.05),
};

// ------------------------------------------------------------------ furniture
const seat = {
  hint: (p, held, g) => (g.decor.sitting?.piece === p ? null : { key: 'LMB', text: 'Sit down', sub: p.def.seats > 1 ? 'Customers sit and chat here too' : '' }),
  use(p, held, g) { g.decor.sit(p); },
};

const catbed = {
  hint: () => ({ key: 'LMB', text: 'Fluff the cushion', sub: "Mikan's favourite spot" }),
  use(p, held, g) {
    g.effects.puff({ pos: at(p, 0, 0.08, 0), count: 6, colors: [0xf4e6d0, 0xd87a4a], size: 0.04, up: 0.15 });
    audio.play('leafRustle', { pos: p.root.position, vol: 0.4 });
  },
};

// ------------------------------------------------------------------ electronics
const radioF = {
  hint: (p) => {
    const here = radio.pos && radio.pos.distanceTo(p.root.position) < 0.5;
    const on = here && radio.station >= 0;
    return { key: 'LMB', text: on ? 'Next station' : 'Turn the radio on', sub: on ? radio.stations[radio.station]?.name || '' : 'Music keeps people browsing' };
  },
  use(p, held, g) {
    const pos = at(p, 0, 0.15, 0);
    const here = radio.pos && radio.pos.distanceTo(p.root.position) < 0.5;
    radio.attach(pos);
    const st = here ? radio.cycle() : (radio.station >= 0 ? radio.station : radio.cycle());
    if (!here && radio.station >= 0) radio.setStation(radio.station);
    g.state.radio = st;
    audio.play('switchClick', { pos, vol: 0.6 });
    g.news(st < 0 ? 'Radio off' : `Radio: ${radio.stations[st].name}`);
  },
  quality: (p) => (radio.station >= 0 && radio.pos && radio.pos.distanceTo(p.root.position) < 0.5 ? p.def.quality : 0.04),
};

const fan = {
  init(p) { const s = p.data.st; s.speed ??= 0; s.swing ??= true; },
  hint: (p) => ({ key: 'LMB', text: ['Switch the fan on', 'Faster', 'Fastest', 'Switch the fan off'][p.data.st.speed], sub: `E ${p.data.st.swing ? 'stop the swing' : 'swing'}` }),
  use(p, held, g) {
    const s = p.data.st;
    s.speed = (s.speed + 1) % 4;
    audio.play('switchClick', { pos: p.root.position, vol: 0.6 });
  },
  key2: 'E',
  secondary(p) { p.data.st.swing = !p.data.st.swing; audio.play('switchClick', { pos: p.root.position, vol: 0.5 }); },
  update(p, dt, g) {
    const s = p.data.st, w = s.speed * 14;
    p.spin = (p.spin || 0) + (w - (p.spin || 0)) * Math.min(1, dt * 1.5);
    p.parts.blades.rotation.z -= p.spin * dt;
    if (s.swing && s.speed > 0) { p.sw = (p.sw || 0) + dt * 0.55; p.parts.head.rotation.y = Math.sin(p.sw) * 0.75; }
    const want = p.spin > 0.5 && near(p, g, 9) ? 0.05 + 0.04 * s.speed : 0;
    if (want && !p.hum && audio.ready) p.hum = audio.loop('fanHum', { pos: p.root.position.clone().setY(0.7), ref: 1.5 });
    p.hum?.set(want, 0.3);
    if (!want && p.hum && p.spin < 0.2) { p.hum.stopAll(); p.hum = null; }
  },
  dispose(p) { p.hum?.stop(); p.hum = null; },
  quality: (p, g) => (p.data.st.speed > 0 ? (g.calendar?.season?.() === 'summer' ? 0.35 : 0.1) : 0.04),
};

// the TV: tiny pixel programmes at a few frames a second
const CH = ['Static', 'Baseball', 'Cooking show', 'Weather', 'Anime'];
const tv = {
  init(p) { const s = p.data.st; s.on ??= false; s.ch ??= 1; tv.draw(p, 0); },
  hint: (p) => ({ key: 'LMB', text: p.data.st.on ? 'Switch the TV off' : 'Switch the TV on', sub: p.data.st.on ? `Channel ${p.data.st.ch}: ${CH[p.data.st.ch]} · E next channel` : 'E next channel' }),
  use(p, held, g) { const s = p.data.st; s.on = !s.on; audio.play(s.on ? 'tvOn' : 'switchClick', { pos: p.root.position, vol: 0.7 }); tv.draw(p, g.time); },
  key2: 'E',
  secondary(p, g) { const s = p.data.st; s.on = true; s.ch = (s.ch + 1) % CH.length; audio.play('tvChannel', { pos: p.root.position, vol: 0.6 }); tv.draw(p, g.time); },
  update(p, dt, g) {
    if (!p.data.st.on || !near(p, g, 9)) return;
    p._t = (p._t || 0) - dt;
    if (p._t > 0) return;
    p._t = 1 / 6;
    tv.draw(p, g.time);
  },
  draw(p, t) {
    const c = p.parts.screenCanvas, x = c.getContext('2d'), s = p.data.st;
    const R = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
    const f = Math.floor(t * 6);
    if (!s.on) { R(0, 0, 40, 32, '#1e2624'); R(14, 20, 6, 1, '#2e3a36'); }
    else if (s.ch === 0) { for (let i = 0; i < 40 * 32; i += 1) { const v = (Math.sin(i * 12.9898 + f * 78.233) * 43758.5453) % 1; const k = Math.floor(Math.abs(v) * 200) + 40; x.fillStyle = `rgb(${k},${k},${k})`; x.fillRect(i % 40, Math.floor(i / 40), 1, 1); } }
    else if (s.ch === 1) {
      R(0, 0, 40, 32, '#3a8a3a'); R(0, 0, 40, 9, '#5a7ac8');
      R(12, 14, 16, 10, '#c8a070'); R(19, 18, 2, 2, '#f4f0e6');
      R(19 + Math.round(Math.sin(f * 0.7) * 6), 20 - Math.abs(Math.round(Math.cos(f * 0.7) * 6)), 1, 1, '#ffffff');
      R(4 + (f % 30), 23, 2, 4, '#e8e8f0'); R(4 + (f % 30), 22, 2, 1, '#2a2a6a');
      R(0, 26, 40, 6, '#1a1a2a'); x.fillStyle = '#ffd23f'; x.fillRect(2, 28, 3, 2); x.fillRect(30, 28, 2 + (f % 3), 2);
    } else if (s.ch === 2) {
      R(0, 0, 40, 32, '#e8d8c0'); R(0, 22, 40, 10, '#a87a4a');
      R(12, 16, 16, 8, '#3a3a3a'); R(11, 15, 18, 2, '#5a5a5a');
      for (let i = 0; i < 3; i++) R(15 + i * 4 + ((f + i) % 2), 10 - ((f + i * 2) % 5), 2, 2, '#ffffff');
      R(30, 6, 6, 10, '#f4c8a0'); R(29, 4, 8, 3, '#ffffff');
    } else if (s.ch === 3) {
      R(0, 0, 40, 32, '#2a5aa8');
      const jp = [[24, 6], [23, 8], [22, 10], [20, 12], [18, 14], [16, 16], [14, 17], [12, 19], [10, 20], [8, 22]];
      for (const [a, b] of jp) R(a, b, 4, 2, '#58c06c');
      R(26 + (f % 2), 9, 4, 4, '#ffd23f'); R(14, 14, 5, 3, '#e8eef4'); R(15, 17, 1, 2 + (f % 2), '#9ad0ff');
      R(0, 27, 40, 5, '#1a3570'); x.fillStyle = '#ffffff'; x.fillRect(2, 29, 8, 1); x.fillRect(14, 29, 6, 1);
    } else {
      R(0, 0, 40, 32, '#ffb0c8'); R(0, 22, 40, 10, '#a8e0a0');
      const px = (f * 2) % 48 - 6;
      R(px, 12, 6, 6, '#f4d8b8'); R(px, 11, 6, 3, '#2a2420'); R(px + 1, 18, 4, 4, '#e5383b'); R(px + (f % 2), 22, 2, 2, '#2a2a6a'); R(px + 4 - (f % 2), 22, 2, 2, '#2a2a6a');
      for (let i = 0; i < 4; i++) R((i * 13 + f) % 40, 4 + (i % 2) * 3, 3, 1, '#ffffff');
    }
    p.parts.screenTex.needsUpdate = true;
  },
  quality: (p) => (p.data.st.on ? p.def.quality : 0.06),
};

export const FEATURES = { piggy, register, tipjar, gumball, bell, poster, clock, calendar, rug, plant, neon, seat, catbed, radio: radioF, fan, tv, storage: STORAGE, vacuum: VACUUM };
void setFlaps;
