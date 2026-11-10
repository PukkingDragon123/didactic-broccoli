// Phase 2 "People": floating text (src/people/Bubbles.js), cinematic chats with floating choices (game.talk,
// src/talk/Talk.js), real voices + talking to yourself (src/talk/speech.js, monologue.js), the named people of the
// lane with homes, routines, memory and quests (game.lane, src/npc/), knockable doors (game.doors), customers with
// personality (src/world/Pedestrians.js), the customer guestbook (game.guestbook), side quests (game.sideQuests),
// Codex People / Yokai entries and messenger threads.
import { Game } from '../game/Game.js';
import { Talk } from '../talk/Talk.js';
import { Speech } from '../talk/speech.js';
import { Monologue } from '../talk/monologue.js';
import { Guestbook } from '../talk/guestbook.js';
import { prebuildYokai } from '../npc/yokaiBuild.js';
import { Lane, ACTS } from '../npc/Lane.js';
import { Doors, DOOR_QUESTS } from '../npc/doors.js';
import { ROSTER } from '../npc/roster.js';
import { lostPigeon } from '../npc/roster2.js';
import { laneMemory } from '../npc/memory.js';
import { yokaiSelfLit } from '../npc/props.js';
import { SideQuests } from '../game/SideQuests.js';
import { setIcon } from '../ui/staticIcons.js';
import * as THREE from 'three';

const _v = new THREE.Vector3();

export function install(game) {
  const g = game;
  const s = g.state.settings;
  if (s.voice === undefined) s.voice = true;
  const speech = g.speech = new Speech(g);
  const mem = laneMemory(g);
  const talk = g.talk = new Talk(g);
  talk.speech = speech;
  talk.memory = (id) => mem.person(id);
  realVoices(g, speech);
  g.sideQuests ||= new SideQuests(g);
  for (const d of ROSTER) for (const q of d.quests || []) if (!g.sideQuests.get(q.id)) g.sideQuests.define(q);
  for (const q of DOOR_QUESTS) if (!g.sideQuests.get(q.id)) g.sideQuests.define(q);
  const lane = g.lane = new Lane(g);
  const doors = g.doors = new Doors(g, lane);
  const book = g.guestbook = new Guestbook(g);
  const self = g.monologue = new Monologue(g, speech);
  setTimeout(() => lostPigeon(lane), 3000);
  // the night's yokai are sculpted in a background worker now, so the first nightfall doesn't stop to build them
  setTimeout(() => prebuildYokai(), 4000);
  codex(g);
  messenger(g, mem);
  settingsUI(g, speech);
  // a quest that asks you to talk to someone shows a marker over their head
  markers(g, lane);
  Game.updaters.push((game, dt) => {
    yokaiSelfLit.value = 0.6 * (1 - (g.clock?.daylight?.() ?? 1));
    talk.update(dt);
    lane.update(dt);
    doors.update(dt);
    book.update(dt);
    self.update(dt);
    g.sideQuests.update(dt);
  });
  g.peopleDebug = debugPeople(g);
  setTimeout(() => { if (g.debug) g.debug.people = g.peopleDebug; }, 0);
}

/** Every floating line on the lane can also be spoken: near, on-screen speakers only, never piling up. */
function realVoices(g, speech) {
  g.bubbles.onSay = (target, text, opts) => {
    if (opts.big || !speech.enabled || g.cutscene?.active) return;
    const tts = target?.tts;
    if (!tts) return;
    if (target.headTop) target.headTop(_v); else if (target.getWorldPosition) target.getWorldPosition(_v); else return;
    const d = _v.distanceTo(g.camera.position);
    if (d > 7) return;
    const p = _v.project(g.camera);
    if (p.z > 1 || Math.abs(p.x) > 1.1) return;
    speech.speak(text, tts, { priority: 'ambient' });
  };
}

/** A "Real voices" switch in the settings panel, next to "Show hands". */
function settingsUI(g, speech) {
  const hands = document.getElementById('hands')?.closest('label');
  if (!hands || document.getElementById('voice-tts')) return;
  const row = document.createElement('label');
  row.className = 'row';
  row.innerHTML = '<span class="lbl" data-icon="sound_on">Real voices</span><input type="checkbox" id="voice-tts" />';
  hands.after(row);
  try { setIcon(row.querySelector('.lbl')); } catch { /* icons not ready */ }
  const box = row.querySelector('input');
  box.checked = g.state.settings.voice !== false;
  box.addEventListener('change', () => { g.state.settings.voice = box.checked; if (!box.checked) speech.stop(); g.save(); });
}

/** ! over someone with a quest step waiting for you, ? over someone with a quest to give (they knock, too). */
function markers(g, lane) {
  const layer = document.createElement('div');
  layer.id = 'sq-marks';
  document.body.appendChild(layer);
  const els = new Map();
  let t = 0;
  Game.updaters.push((game, dt) => {
    if ((t -= dt) > 0 && !g.talk.active) { position(); return; }
    t = 0.5;
    for (const n of lane.list) {
      let kind = null;
      if (n.present && !n.busy && !g.talk.active) {
        if (g.sideQuests.talkStep(n.id)) kind = '!';
        else if (n.knocking) kind = '?';
      }
      let el = els.get(n);
      if (kind && !el) { el = document.createElement('div'); el.className = 'mk'; layer.appendChild(el); els.set(n, el); }
      if (el) { el.kind = kind; if (el.textContent !== (kind || '')) { el.textContent = kind || ''; el.classList.toggle('q', kind === '?'); } }
    }
    position();
  });
  function position() {
    for (const [n, el] of els) {
      let show = !!el.kind && n.present && n.playerDist < 26 && !g.talk.active;
      if (show) {
        n.h.headTop(_v); _v.y += 0.22;
        const v = _v.project(g.camera);
        show = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
        if (show) el.style.transform = `translate(${((v.x * 0.5 + 0.5) * innerWidth).toFixed(0)}px, ${((0.5 - v.y * 0.5) * innerHeight).toFixed(0)}px)`;
      }
      el.classList.toggle('on', show);
    }
  }
}

// ------------------------------------------------------------------ the Codex's People page
const LOOKS = {
  hatoda: { name: 'Mr. Hatoda', role: 'Pigeon enthusiast', look: { bg: 0xb8c8d8, hair: 'short', hairCol: 0x9a9690, glasses: 0x46321e, cap: true, capCol: 0x6a6a52, shirt: 0x9a8a6a }, desc: 'Feeds his six pigeons on the west side of the lane every day. Knows each one by name. Do not run at them.' },
  gonta: { name: 'Gonta', role: 'Prankster', look: { bg: 0xffe08a, cap: true, capCol: 0xe85a2a, shirt: 0xf0c040, mouth: 'grin', skin: 'warm' }, desc: 'Lives in Sakura Heights with his long-suffering mum. Doorbells, rubber snakes, notes on backs. Never did it.' },
  kuromaru: { name: 'Lord Kuromaru', role: 'Self-proclaimed sorcerer', look: { bg: 0x4a3a5a, hair: 'long', hairCol: 0x2c2438, shirt: 0x28223a, mark: true }, desc: 'Keeper of the Ninth Shadow. Haunts the alley by Mikawa-ya at dusk. Real name: Hiroshi Yamada. Home for dinner at seven.' },
  gomuzo: { name: 'Captain Gomuzo', role: 'Rubber pirate', look: { bg: 0x8ad0f0, hair: 'short', cap: true, capCol: 0xe8c878, shirt: 0xc8282a, mouth: 'grin', mark: true, skin: 'warm' }, desc: 'Sleeps in a rental garage he calls his ship. Arms like rubber. Stomach like a black hole. Wants you in his crew.' },
  yabuki: { name: 'Mr. Yabuki', role: 'Neighbourhood watch (of one)', look: { bg: 0x7a9a5a, cap: true, capCol: 0x5a6238, shirt: 0x5e6640, skin: 'tan' }, desc: 'Lives in a bush. Watches the street: trains, trucks, the cat. Logs everything. Do not slap the bush.' },
  kusaka: { name: 'Dr. Kusaka', role: 'Field biologist', look: { bg: 0xc8e8c0, hair: 'long', hairCol: 0x4a3226, glasses: 0x785a3c, shirt: 0x9a8a5e }, desc: 'Studies the plants of old neighbourhoods. Will teach you to keep anything green alive. Respects dandelions.' },
  ota: { name: 'Mrs. Ota', role: 'Landlady', look: { bg: 0xe8c0d0, hair: 'perm', hairCol: 0x9a9098, glasses: 0x6a3a5a, shirt: 0x7a4a6a }, desc: 'Ota Real Estate. Owns half the lane, your garage included. Rent on the 27th. Never late. Never.' },
  tanaka2: null,
  kimura: { name: 'Mrs. Kimura', role: 'Next-door neighbour', look: { bg: 0xf0d0b0, hair: 'bun', hairCol: 0x4a3226, shirt: 0xe8a070, blush: true }, desc: 'Shares a wall with the garage. Likes the "gachan" sound. Makes too much curry.' },
  suzuki: { name: 'Mr. Suzuki', role: 'Neighbour', look: { bg: 0xc0c8e0, hair: 'short', shirt: 0x2a3448, closed: true }, desc: 'Sells insurance. Tired. His son spends his allowance at your shop.' },
  mori: { name: 'Mr. Mori', role: 'Neighbour', look: { bg: 0xe0d8c0, hair: 'bald', glasses: 0x5a4a3a, shirt: 0x8a7a5a }, desc: 'Hard of hearing. Or is he? HAHAHA.' },
  watanabe: { name: 'Mrs. Watanabe', role: 'Neighbour', look: { bg: 0xf8d0e0, hair: 'long', hairCol: 0x5a3626, shirt: 0xe890b0 }, desc: 'New mum. The baby is ALWAYS just asleep.' },
};
function codex(g) {
  const C = g.os?.codex;
  if (!C) return;
  const met = (id) => !!g.state.npcs?.met?.[id];
  for (const [id, p] of Object.entries(LOOKS)) if (p) C.person({ id, ...p, met: () => met(id) });
  C.person({ id: 'tanaka', met: () => met('tanaka') || !!g.os?.st?.msgr?.threads?.tanaka });
}

// ------------------------------------------------------------------ messenger threads (quests over Pichat)
function messenger(g, mem) {
  const M = g.os?.messenger;
  if (!M) return;
  const q = g.sideQuests;
  const T = (id, name, avatar, about) => M.thread({ id, name, avatar, kind: 'npc', about });
  const F = mem.state.msg ||= {};
  // Rohan: a yokai hunt, once you've met him
  const ro = T('rohan', 'Kishibe Rohan', { bg: 0x9ae0c8, hair: 'short', hairCol: 0x2a5a4a, band: 0x3aa088, shirt: 0x3a4a3a }, 'Manga artist. Do not ask for autographs.');
  ro.onReply((v) => {
    if (v === 'hunt') { ro.post({ text: 'Yokai. Kappa, foxes, umbrellas that hop. They come out after dark on this lane. See two of them and tell me EVERYTHING. I pay well.', delay: 3 }); q.start('yokai_hunt'); }
    else if (v === 'no') ro.post({ text: 'Your loss. Reality waits for nobody.', delay: 2 });
  });
  // Josuke & Okuyasu
  const jo = T('josuke', 'Josuke', { bg: 0x8ab8e8, hair: 'pomp', hairCol: 0x2a2440, shirt: 0x1a2a6a, brows: true }, 'yo');
  jo.onReply((v) => { if (v === 'hair') jo.post({ text: 'heh. thanks. okuyasu says hi. he also says do u sell bread', delay: 2 }); else if (v === 'bread') jo.post({ text: 'thats what i told him. he doesnt believe me', delay: 2 }); });
  // the biologist: a plant tip a day
  const ku = T('kusaka', 'Dr. Kusaka', LOOKS.kusaka.look, 'Field biologist. Plant questions welcome at any hour (within reason).');
  ku.onReply((v) => { if (v === 'survey' && !q.isActive('flora') && !q.isDone('flora')) { q.start('flora'); ku.post({ text: 'Wonderful! A morning glory, a bonsai and some tomatoes on the lane. Look at each closely, then come and tell me.', delay: 2 }); } });
  const TIPS = ['Plant tip: yellow lower leaves usually mean too much water, not too little.', 'Plant tip: turn your pots a quarter turn every week so they grow straight.', 'Plant tip: rainwater beats tap water. Plants agree.', 'Plant tip: a dark garage is a cave. Most plants hate caves.'];
  // the sorcerer, at midnight
  const kr = T('kuromaru', 'Lord Kuromaru', LOOKS.kuromaru.look, 'Keeper of the Ninth Shadow. (Hiroshi)');
  kr.onReply((v) => { if (v === 'dark') kr.post({ text: '...You understand. Finally, someone understands. Goodnight, ally.', delay: 3 }); });
  // the prankster
  const go = T('gonta', 'Gonta', LOOKS.gonta.look, 'not a prankster');
  g.events.on('pranked', (e) => { if (e?.what === 'note' && mem.met('gonta')) go.post({ text: 'check ur back lol', delay: 40 }); });
  g.events.on('npcMet', ({ id }) => {
    if (id === 'rohan' && !F.rohan) { F.rohan = 1; ro.post({ text: 'This is Kishibe Rohan. Josuke gave me your contact. Tell me: have you seen anything... unusual on the lane at night?', delay: 60, choices: [{ label: 'Like what?', value: 'hunt' }, { label: 'No. Leave me alone.', value: 'no' }] }); }
    if (id === 'josuke' && !F.josuke) { F.josuke = 1; jo.post({ text: 'yo its josuke. got ur number from mrs tanaka. dont ask', delay: 45, choices: [{ label: 'Nice hair today btw', value: 'hair' }, { label: 'I do NOT sell bread', value: 'bread' }] }); }
    if (id === 'kusaka' && !F.kusaka) { F.kusaka = 1; ku.post({ text: 'Lovely to meet you today! If you ever want to help with my survey of the lane, just say the word.', delay: 50, choices: [{ label: 'Count me in!', value: 'survey' }, { label: 'Maybe later', value: 'later' }] }); }
    if (id === 'kuromaru' && !F.kuro) F.kuro = 1;
    if (id === 'gonta' && !F.gonta) { F.gonta = 1; go.post({ text: 'hi its gonta. i didnt do it', delay: 70 }); }
  });
  g.events.on('newDay', ({ day }) => {
    if (mem.met('kusaka')) ku.post({ text: TIPS[day % TIPS.length], delay: 30 });
    if (mem.met('kuromaru') && day % 2 === 0) kr.post({ text: ['The moon bleeds red tonight. ...It\'s the streetlight. Goodnight.', 'I dreamt of a capsule that held the void. It was empty. Like my wallet.', 'Mortal. Do you also feel the darkness? Or is it just me.'][day % 3], delay: 20, choices: day % 3 === 2 ? [{ label: 'I feel it too.', value: 'dark' }, { label: 'Go to sleep, Hiroshi.', value: 'sleep' }] : null });
  });
}

// ------------------------------------------------------------------ debug helpers (window.dbg.people)
function debugPeople(g) {
  const L = g.lane;
  return {
    /** Build everyone now. */
    spawnAll() { while (L.pending.length) L.spawnNext(); return L.list.map((n) => n.id); },
    /** Put someone at a place (default in front of you), present, idle. */
    place(id, x, z, yaw) {
      this.spawnAll();
      const n = L.npc(id) || g.doors?.residents?.[id];
      if (!n) return null;
      L.cancel(n);
      n.activity = 'debug';
      n.setPresent(true);
      if (x === undefined) { const p = g.player.pos, f = g.camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize(); x = p.x + f.x * 1.6; z = p.z + f.z * 1.6; }
      n.place(new THREE.Vector3(x, 0, z), yaw ?? Math.atan2(g.player.pos.x - x, g.player.pos.z - z));
      n.h.finishPaint?.();
      return [n.pos.x, n.pos.z];
    },
    chat(id) { const n = L.npc(id); if (n) L.chat(n); return !!n; },
    /** Make someone come and knock on your shutter (their own reason, or a plain hello). */
    knock(id) {
      const n = L.npc(id);
      if (!n) return false;
      const why = n.def.knock?.(L, n) || { id: 'hello' + Date.now(), call: 'Hello? Anyone home?', sub: 'Someone is at your shop front' };
      L.cancel(n); n.activity = 'knock';
      L.run(n, ACTS.knock.call(L, n, why));
      return why.id;
    },
    /** A character's special move (the pirate's rubber punch...). */
    move(id) { const n = L.npc(id); n?.def.move?.(L, n); return !!n?.def.move; },
    where() { return L.list.map((n) => [n.id, n.activity, n.present, +n.pos.x.toFixed(1), +n.pos.z.toFixed(1)]); },
    release() { for (const n of L.list) if (n.activity === 'debug') n.activity = null; },
    /** Step the game while letting chats (async scripts) advance: await dbg.people.run(sec). */
    async run(sec, dt = 1 / 30) { for (let t = 0; t < sec; t += dt) { g.debug?.step(dt, dt); for (let k = 0; k < 8; k++) await null; } },
    /** Clean shots: no HUD, no hands. */
    clean(on = true) { document.body.classList.toggle('cine', on); g.uiCine = on; g.held.anchor.visible = !on; },
    state() { const s = g.talk.session; return s ? { line: s.line?.line?.chars?.map((c) => c.ch).join(''), choice: s.choice?.options, blend: +g.player.camBlend.toFixed(2), me: s._me?.h.root.visible } : null; },
  };
}
