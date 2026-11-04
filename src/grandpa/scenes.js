// Grandpa's cinematic scenes: cutscene scripts (src/game/Cutscene.js) and cinematic chats (src/talk/Talk.js).
//   tapScene     parked: he shuffles across the lane and knocks on the van window; you climb out
//   meetScript   the meeting (a chat): you got tall / short, a bow or an awkward hug, the van's clutch, why he's
//                leaving, and the key ring into your hands
//   storyScene   across the lane together; he pats the shutter, the shop in its heyday (the flashback), then his
//                stool: "Letter first. I'll supervise."
//   taxiArriveScene / byeScript / taxiLeaveScene   the goodbye: the taxi, his notebook, off down the lane
import * as THREE from 'three';
import { audio } from '../core/audio.js';
import { ease } from '../core/util.js';
import { GARAGE } from '../world/Garage.js';
import { propMesh } from '../world/props.js';
import { buildGrandpaHuman } from './Grandpa.js';
import { Taxi } from './props.js';
import { SISTER, TOWN } from './data.js';
import { talk as blipVoice } from '../people/voice.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const Z = GARAGE.maxZ;

/** A line over his head in a cutscene (big, with his name), and a waiter for it to be read. */
function line(c, sys, text, hold = 1.0, opts = {}) {
  const read = text.length / 26 + hold;
  sys.gp.say(text, { big: true, dur: read + 0.5, ...opts });
  return c.wait(read);
}

/** Your own character in a cutscene shot (the chat's avatar), kept animated; walk(to, speed) moves it along. */
function avatar(c, sys, pos, yaw) {
  const g = sys.game, h = g.talk?.avatar?.();
  if (!h) return null;
  const a = { h, to: null, speed: 0.7, look: null, sp: 0 };
  h.root.visible = true;
  h.root.position.copy(pos).setY(0);
  h.root.rotation.set(0, yaw, 0);
  h.hasPrev = false;
  c.every((dt) => {
    if (!a.h) return;
    let sp = 0;
    if (a.to) {
      const d = a.to.clone().sub(h.root.position).setY(0), L = d.length();
      if (L > 0.03) { sp = a.speed; h.root.position.addScaledVector(d.normalize(), Math.min(L, sp * dt)); const want = Math.atan2(d.x, d.z); h.root.rotation.y += Math.atan2(Math.sin(want - h.root.rotation.y), Math.cos(want - h.root.rotation.y)) * Math.min(1, dt * 6); }
      else a.to = null;
    } else if (a.face !== undefined && a.face !== null) h.root.rotation.y += Math.atan2(Math.sin(a.face - h.root.rotation.y), Math.cos(a.face - h.root.rotation.y)) * Math.min(1, dt * 4);
    h.update(dt, { speed: sp, lookAt: a.look === 'gp' ? sys.gp.head(new THREE.Vector3()) : a.look, talking: g.bubbles?.isTalking?.(h) });
  });
  a.hide = () => { h.root.visible = false; h.clearGesture?.(); a.h = null; };
  return a;
}

// ------------------------------------------------------------------ 1. the tap on the window
export function* tapScene(c, sys) {
  const g = sys.game, gp = sys.gp, van = g.life?.van, P = g.player;
  sys.mode = 'scene';
  gp.lookAt = null;
  if (gp.sitting) { gp.sitting = false; gp.sitT = 0; gp.setPose('gp_stand'); }
  gp.act(null);
  const eye = van ? van.eye(V(0, 0, 0)) : V(2.4, 1.42, 12.16);
  van?.setDoor(0);
  // he's already on his way over from where he waved you in
  if (gp.distTo(V(MARSH.x, 0, MARSH.z)) > 1.5) gp.place(V(MARSH.x, 0, MARSH.z), 0.2);
  gp.goTo(V(2.25, 0, 11.32), { speed: 0.8, direct: true, face: 0 });
  // a. from the driver's seat: the hot engine ticks, an old man comes across the lane
  yield c.cam({ pos: eye, look: V(1.7, 1.0, 8.6), fov: 56 });
  for (let i = 0; i < 2; i++) audio.play('engineTick', { pos: eye, vol: 1, delay: i * 0.5 });
  yield c.all(c.wait(2.6), line(c, sys, "Hold your horses! I'm coming!", 0.6));
  // b. outside, low: him shuffling up to the van
  yield c.cam({ pos: V(0.2, 0.55, 10.4), look: V(2.2, 1.1, 10.4), fov: 48 });
  yield c.all(c.cam({ pos: V(0.4, 0.6, 10.7), look: V(2.3, 1.2, 10.9), dur: 2.6 }), c.wait(2.6));
  // c. back in the cab, turning to the side window: a face at the glass, knuckles on it
  gp.place(V(2.3, 0, 11.36), 0);
  gp.lookAt = eye.clone();
  const pov = van ? van.local(0.22, 1.4, 0.62) : eye.clone().add(V(0.2, 0, 0.3)), win = van ? van.local(-1.05, 1.47, 1.02) : V(2.3, 1.3, 11.3);
  yield c.cam({ pos: pov, look: win, fov: 56 });
  gp.act('knock', 1.8);
  audio.play('knockGlass', { pos: V(2.3, 1.3, 11.78), vol: 1, delay: 0.15 });
  yield c.wait(1.2);
  yield line(c, sys, 'Oi! No parking in this lane!', 1.1);
  gp.expr('happy', 3); gp.act('laugh', 1.6);
  yield line(c, sys, '...Ha! Your face. Out you get, kiddo.', 0.9);
  // he steps back to make room for the door
  gp.goTo(V(2.05, 0, 9.35), { speed: 0.9, direct: true, face: 0 });
  yield c.wait(0.5);
  audio.play('carDoor', { pos: eye, vol: 1 });
  let k = 0;
  yield c.until((dt) => { k = Math.min(1, k + dt / 0.6); van?.setDoor(ease.outCubic(k)); return k >= 1; });
  // out of the cab and onto the road, facing him
  const out = V(2.3, 1.58, 10.5);
  yield c.cam({ pos: out, look: V(2.05, 1.42, 9.35), dur: 1.7, fov: 60, path: [eye.clone().lerp(V(2.36, 1.25, 11.2), 0.7)] });
  gp.place(V(2.05, 0, 9.35), Math.atan2(2.3 - 2.05, 10.5 - 9.35));
  gp.lookAt = 'player';
  P.pos.set(2.3, 0, 10.5);
  P.yaw = Math.atan2(-(2.05 - 2.3), -(9.35 - 10.5));
  P.pitch = -0.08;
  g.bubbles?.clear(gp.h);
  yield c.toPlayer(0.5);
}
const MARSH = { x: 2.2, z: 6.7 };

// ------------------------------------------------------------------ 2. the meeting (a cinematic chat)
export function meetScript(sys) {
  const g = sys.game, gp = sys.gp;
  return async (t) => {
    const me = t.session.me.h;
    await t.say('Kiddo! Look at you.', { gesture: 'wave', expr: 'happy' });
    await t.say('You got tall.');
    const a = await t.choose(['You got short.', 'Hi, Grandpa.', 'You look... the same.']);
    if (a === 0) { gp.act('laugh', 1.6); await t.say("Ha! I'm shrinking. Doctor says it's my back."); await t.say("I say it's the lane. Everything round here settles."); }
    else if (a === 1) await t.say("Hi yourself. All day in that van and that's all I get?");
    else { gp.act('shrug', 1.6); await t.say('Liar. I look like a walnut.'); }
    // a bow, or a hug
    const b = await t.choose([{ text: 'Bow politely', silent: true }, { text: 'Hug him', silent: true }]);
    if (b === 0) {
      me.gesture('bow');
      await t.wait(0.5);
      gp.act('bow', 2.4);
      await t.wait(2.2);
      gp.act('back', 2.2); gp.expr('sad', 2);
      await t.say('Oof. ...No more bowing.');
      await t.say("We're family. Family nods.", { gesture: 'nod' });
    } else {
      await hug(sys, me, t);
    }
    // the van
    gp.lookAt = g.life?.van ? g.life.van.local(0, 1.0, 0) : null;
    gp.act('point', 1.8, g.life?.van?.local(0, 1.0, 0));
    await t.say('And you got my van here in one piece.');
    gp.lookAt = 'player';
    await t.say('Does the clutch still bite?');
    const c = await t.choose(['It bit me twice.', 'What clutch?', 'I stalled at every light.']);
    if (c === 0) await t.say('Only twice? It likes you. It bit me for thirty years.');
    else if (c === 1) { gp.act('scratch', 2); await t.say('...That explains the noise I heard from the station.'); }
    else { gp.act('laugh', 1.6); await t.say('Good. Means you stopped at the lights. I never did.'); }
    // why he's going
    await t.say("Right. Listen. Today's my last day in the lane.");
    gp.act('back', 2.4); gp.expr('sad', 3);
    await t.say("My back's finished. No more crouching for capsules. No more lifting machines.");
    await t.say(`My sister ${SISTER}'s got a spare room in ${TOWN}. By the sea. Hot springs every morning.`);
    gp.expr('smile', 2);
    await t.say('Terrible.');
    const d = await t.choose(["I'll miss you.", 'Hot springs every morning sounds terrible.', "Who's going to feed the cat?"]);
    if (d === 0) { await t.say("Course you will. I'm wonderful."); gp.expr('sad', 2); await t.say("...I'll miss you too, kiddo. Don't tell anyone."); }
    else if (d === 1) { gp.act('nod', 1.4); await t.say("I know. I'll suffer through it. For my back."); }
    else { await t.say("You are. She doesn't know that yet."); await t.say('Neither did you. Surprise.'); }
    // the keys
    profile(t, true);
    gp.hold(keyRing(), { pos: [0.01, -0.09, 0.03], rot: [0.3, 0, 0] });
    gp.act('give', Infinity);
    await t.say('So. These are yours now.');
    await t.choose([{ text: 'Take the keys', silent: true }]);
    me.gesture('point', { dur: 1.0 });
    await t.wait(0.5);
    gp.hold(null);
    gp.act(null);
    profile(t, false);
    audio.play('pickup', { vol: 0.6 });
    if (g.held.find('key') < 0) g.held.giveTool('key');
    g.news("Grandpa's key ring", 'Shutter, padlock, back door... and one mystery key', 5000);
    await t.say("Shutter, padlock, back door, and one I've never figured out.");
    await t.say("Forty-one years. Never figured it out.", { gesture: 'shrug' });
    await t.say("Don't lose them. I did. Twice. That's why there are three.");
    await t.say("Come on. Let me show you the old girl. Before my back changes its mind.", { gesture: 'beckon' });
  };
}

/** Swing the chat's camera round to a profile two-shot (both of you side-on), or back (null). */
function profile(t, on) {
  const s = t.session;
  if (on) { if (!s._shot0) s._shot0 = s.shot; s.shot = { back: -0.45, side: 1.75 }; }
  else if (s._shot0) { s.shot = s._shot0; s._shot0 = null; }
}

/** The awkward hug: you step in, he props his cane on the van, pats your back twice too many times. */
async function hug(sys, me, t) {
  const gp = sys.gp;
  profile(t, true);
  const from = me.root.position.clone(), to = from.clone().lerp(gp.pos, 0.62).setY(0);
  let k = 0;
  gp.caneMode = 'lean';
  gp.caneAt = { pos: gp.pos.clone().add(V(0.32, 0.86, 0.12)), dir: V(0.12, -1, 0.05), yaw: 0.4 };
  gp.po.cane = 'free';
  await sys.until((dt) => { k = Math.min(1, k + dt / 0.6); me.root.position.lerpVectors(from, to, ease.inOutQuad(k)); return k >= 1; });
  me.gesture('hug');
  gp.act('hug', 3.6);
  gp.expr('happy', 4);
  await t.wait(1.4);
  await t.say('Okay. Okay. ...Okay.');
  await t.say("That's enough. People will talk.");
  me.clearGesture();
  k = 0;
  await sys.until((dt) => { k = Math.min(1, k + dt / 0.6); me.root.position.lerpVectors(to, from, ease.inOutQuad(k)); return k >= 1; });
  gp.caneMode = 'hand'; gp.caneAt = null; gp.po.cane = 'hand';
  profile(t, false);
}

function keyRing() {
  const m = propMesh('garage_key', { fallbackSize: [0.06, 0.02, 0.1], fallbackColor: 0xc8a040 });
  m.scale.setScalar(1.7); // (a touch big, so it reads in the shot)
  m.castShadow = false;
  return m;
}

// ------------------------------------------------------------------ 3. the walk, his story, the flashback
export function* storyScene(c, sys) {
  const g = sys.game, gp = sys.gp, story = g.story, van = g.life?.van, P = g.player, st = g.street, cat = st?.cat;
  const me = avatar(c, sys, V(2.3, 0, 10.5), Math.PI + 0.2);
  // the van door shuts; you cross the lane together at his pace
  if (van && van.door > 0.5) { van.setDoor(0); audio.play('carDoor', { pos: van.local(-0.8, 1.0, 1.0), close: true, vol: 0.9 }); }
  gp.goTo(V(1.75, 0, 6.3), { speed: 0.62, direct: true, face: Math.PI });
  gp.lookAt = null;
  if (me) { me.to = V(0.95, 0, 6.65); me.speed = 0.62; me.look = 'gp'; }
  yield c.cam({ pos: V(-1.9, 1.2, 9.9), look: V(1.8, 1.0, 8.6), fov: 46 });
  yield c.all(c.cam({ pos: V(-1.5, 1.3, 9.2), look: V(1.4, 1.1, 7.6), dur: 4.4 }), line(c, sys, "Mind the cat. She's shy. She's also everywhere.", 1.6));
  // Mikan scoots off round the side
  if (cat && cat.wild) { cat.target = V(3.4, 0, 6.2); st.setCatState('flee', 6); }
  yield c.wait(1.2);
  // at the shutter
  gp.place(V(1.75, 0, 6.3), Math.PI);
  if (me) { me.h.root.position.set(0.95, 0, 6.65); me.to = null; me.face = Math.PI - 0.3; me.look = V(0.6, 1.5, Z); }
  if (cat && cat.wild) { cat.pos.copy(V(0.35, 0, 0.1)); st.setCatState('hide', 1e9); }
  gp.lookAt = V(1.6, 1.3, Z);
  yield c.cam({ pos: V(3.1, 1.4, 6.75), look: V(1.55, 1.38, 5.75), fov: 46 });
  gp.act('pat', 3.4);
  audio.play('thud', { pos: V(1.6, 1.2, Z), vol: 0.25 });
  yield c.all(c.cam({ pos: V(3.0, 1.45, 6.6), look: V(1.5, 1.38, 5.7), dur: 5.2 }), line(c, sys, 'Forty-one years I rolled this up every morning.', 0.6));
  yield line(c, sys, 'Six-thirty. Rain or shine.', 1.0);
  // looking up at the old front
  gp.lookAt = V(0.2, 3.0, Z);
  yield c.cam({ pos: V(0.5, 0.65, 8.7), look: V(0.4, 2.4, Z), fov: 58 });
  yield c.all(c.cam({ pos: V(0.6, 0.75, 8.2), look: V(0.4, 2.6, Z), dur: 4 }), line(c, sys, "In '78 we had the space monster series. The line went round the block.", 0.4));
  yield line(c, sys, 'Twice.', 0.9);
  // the flashback: the shop in his day
  const actors = [];
  const hidden = [gp.h.root, gp.cane, sys.stool, me?.h.root].filter(Boolean);
  yield c.flash(() => {
    c.memory(true);
    g.bubbles?.clear(gp.h);
    story.memorySet(true);
    for (const o of hidden) o.visible = false;
    const young = buildGrandpaHuman({ young: true });
    young.root.position.set(0.9, 0, 3.7); young.root.rotation.y = 0.15;
    g.scene.add(young.root);
    const ya = { h: young, look: null };
    c.every((dt) => ya.h && ya.h.update(dt, { speed: 0, lookAt: ya.look, talking: g.bubbles?.isTalking?.(ya.h) }));
    actors.push(ya,
      story.actor(c, 'kid', 12, -2.35, 0.35, -Math.PI / 2),
      story.actor(c, 'schoolgirl', 7, -2.1, 1.45, -Math.PI / 2 - 0.35),
      story.actor(c, 'schoolboy', 3, -1.55, -0.55, -Math.PI / 2 + 0.4),
      story.actor(c, 'kid', 29, 2.1, Z + 1.2, -2.6),
      story.actor(c, 'kid', 44, 0.4, Z + 1.9, Math.PI + 0.2));
    c.pos.set(2.6, 1.55, Z + 5.6); c.look.set(-1.0, 1.0, 1.6);
  });
  const [ya, k1, k2, k3, k4, k5] = actors;
  k1.h.gesture('browse'); k3.h.gesture('point');
  yield c.all(c.cam({ pos: V(1.9, 1.5, Z + 3.3), look: V(-0.4, 1.15, 1.8), dur: 4.2 }), c.say('After school they came running. Pocket money in their fists.', 1.0, 'Grandpa', sys.gp.voice),
    c.call(() => { k2.h.gesture('cheer'); audio.play('gachan', { pos: V(-3.2, 0.5, 0.8), vol: 0.8 }); }));
  c.hideSay();
  ya.look = c.pos; ya.h.gesture('wave');
  k4.h.gesture('wave'); k5.h.gesture('cheer');
  g.bubbles?.say(ya.h, 'One coin, one turn. Good luck!', { dur: 3.2, onChar: sys.gp.voice });
  yield c.cam({ pos: V(1.6, 1.55, Z + 1.4), look: V(0.85, 1.5, 3.7), dur: 2.6 });
  yield c.all(c.wait(1.4), c.say('Grown-ups pretended they weren\'t excited. They were.', 0.8, 'Grandpa', sys.gp.voice));
  c.hideSay();
  // back to now
  yield c.flash(() => {
    c.memory(false);
    for (const a of actors) g.bubbles?.clear?.(a.h);
    story.dropActors(actors);
    story.memorySet(false);
    for (const o of hidden) o.visible = true;
    gp.place(V(1.75, 0, 6.3), Math.PI);
    gp.lookAt = V(0.6, 2.2, Z);
    c.pos.set(0.35, 1.5, 7.3); c.look.set(1.75, 1.35, 6.3);
  });
  gp.expr('sad', 3.5);
  yield c.all(c.cam({ pos: V(0.4, 1.5, 7.15), look: V(1.75, 1.4, 6.3), dur: 3.4, fov: 40 }), line(c, sys, "...Anyway. That was then. Now it's dust and a cat.", 1.0));
  // to you: the plan
  gp.lookAt = V(0.95, 1.55, 6.65); // (you, standing beside him)
  gp.faceTo(V(0.95, 0, 6.65));
  gp.expr('smile', 3);
  if (me) { me.face = Math.atan2(1.75 - 0.95, 6.3 - 6.65); me.look = 'gp'; }
  yield c.cam({ pos: V(1.25, 1.5, 8.55), look: V(1.4, 1.3, 6.4), fov: 50 });
  yield line(c, sys, 'Right. My letter first. Then the shutter.', 0.6);
  gp.act('point', 2.2, V(0.85, 1.32, Z + 0.1));
  yield line(c, sys, "I'll supervise. Supervising's good for the back.", 0.8);
  // off to his stool
  sys.sitOnStool();
  yield c.all(c.cam({ pos: V(-0.4, 1.6, 8.6), look: V(2.4, 0.9, 5.9), dur: 3.6, fov: 54 }), c.wait(3.6));
  if (!gp.sitting || gp.sitT < 0.5) sys.seatAt();
  gp.po.fan = true;
  me?.hide();
  P.pos.set(0.95, 0, 6.65);
  P.yaw = Math.atan2(-(0.85 - 0.95), -(Z - 6.65));
  P.pitch = -0.02;
  g.bubbles?.clear(gp.h);
  yield c.toPlayer(0.8);
}

// ------------------------------------------------------------------ 4. the goodbye: the taxi pulls up
const TAXI_Z = 8.75, TAXI_STOP = 0.55;
export function* taxiArriveScene(c, sys) {
  const g = sys.game, gp = sys.gp, P = g.player;
  sys.mode = 'scene';
  if (gp.sitting) { gp.sitting = false; gp.sitT = 0; gp.setPose('gp_stand'); }
  gp.act(null); gp.po.fan = false;
  gp.place(V(1.5, 0, 6.15), -0.9);
  gp.lookAt = V(-8, 1.2, TAXI_Z);
  P.pos.set(0.15, 0, 6.5); P.yaw = Math.atan2(-(1.5 - 0.15), -(6.15 - 6.5)); P.pitch = -0.05;
  g.bubbles?.clear(gp.h);
  // the taxi comes in from the west underpass
  const taxi = sys.taxi = new Taxi(g);
  g.scene.add(taxi.root);
  const T = { x: -18, v: 4.2, to: TAXI_STOP };
  taxi.setPose(T.x, TAXI_Z, Math.PI / 2);
  let engine = null;
  try { engine = audio.loop('taxiEngine', {}); engine?.set(0.2, 0.5); } catch { engine = null; }
  sys.taxiEngine = engine;
  c.every((dt) => {
    if (!sys.taxi) return;
    const left = T.to - T.x;
    const want = left <= 0.001 ? 0 : Math.min(T.cruise ?? 4.2, Math.max(0.4, left * 0.9));
    T.v += (want - T.v) * Math.min(1, dt * 2);
    const step = Math.min(Math.max(0, left), T.v * dt);
    T.x += step;
    sys.taxi.setPose(T.x, TAXI_Z, Math.PI / 2);
    sys.taxi.roll(step);
    sys.taxi.setBrake(T.v > 0.2 && left < 6);
    if (sys.taxiEngine?.osc) sys.taxiEngine.osc.frequency.value = 40 + T.v * 7;
  });
  yield c.cam({ pos: V(2.6, 1.45, 6.9), look: V(-6, 1.1, TAXI_Z), fov: 46 });
  audio.play('taxiHorn', { pos: V(-14, 1, TAXI_Z), vol: 0.8, delay: 0.8 });
  yield c.wait(2.2);
  yield c.cam({ pos: V(-0.35, 1.42, 7.45), look: V(1.5, 1.38, 6.15), fov: 38 });
  gp.lookAt = V(-2, 1.2, TAXI_Z);
  yield line(c, sys, "That'll be my taxi.", 0.6);
  yield c.cam({ pos: V(-1.8, 0.7, 6.4), look: V(1.0, 0.9, TAXI_Z), fov: 50 });
  yield c.until(() => T.x > TAXI_STOP - 0.02 || c.skipping);
  T.x = TAXI_STOP;
  taxi.setPose(T.x, TAXI_Z, Math.PI / 2);
  taxi.setBrake(false);
  yield c.wait(0.3);
  audio.play('taxiDoor', { pos: taxi.doorSpot(V(0, 1, 0)), vol: 0.9 });
  let k = 0;
  yield c.until((dt) => { k = Math.min(1, k + dt / 0.8); taxi.setDoor(ease.outCubic(k)); return k >= 1; });
  gp.lookAt = 'player';
  gp.faceTo(V(0.15, 0, 6.5));
  yield c.cam({ pos: V(-0.6, 1.4, 7.7), look: V(1.3, 1.25, 6.3), fov: 46 });
  yield line(c, sys, 'Booked it this morning, in case today went badly.', 0.8);
  gp.expr('smile', 2);
  yield line(c, sys, "It went fine. I'm still taking it.", 0.9);
  g.bubbles?.clear(gp.h);
  yield c.toPlayer(0.6);
}

/** The goodbye chat: his notebook, the last bits of advice, a wave or a hug. */
export function byeScript(sys) {
  const g = sys.game, gp = sys.gp;
  return async (t) => {
    const me = t.session.me.h;
    const book = propMesh('grandpa_notebook', { fallbackSize: [0.15, 0.03, 0.2], fallbackColor: 0x5a3420 });
    book.scale.setScalar(0.85); book.castShadow = false;
    profile(t, true);
    gp.hold(book, { pos: [0.02, -0.1, 0.05], rot: [0.2, 0, 1.3] });
    gp.act('give', Infinity);
    await t.say('Here. I wrote everything down.');
    await t.say('Twice. Once in pencil, once in pen. The pen one\'s for when the pencil fades.');
    await t.choose([{ text: 'Take the notebook', silent: true }]);
    me.gesture('point', { dur: 1.0 });
    await t.wait(0.5);
    gp.hold(null); gp.act(null);
    profile(t, false);
    audio.play('page', { vol: 0.7 });
    g.news("Grandpa's notebook", "I'll keep it on the computer desk", 4500);
    await t.say("Machines are on the computer now. Odd jobs on the board by the station, for the money.");
    await t.say("The rest is on my notes. You'll be fine.", { gesture: 'nod' });
    const a = await t.choose(['Thank you, Grandpa.', 'Stay one more day?', 'Can I call you?']);
    if (a === 0) await t.say("Don't thank me. I'm leaving you a garage full of work and a cat that bites.");
    else if (a === 1) { gp.act('no', 1.4); await t.say("One more day and I'd start rearranging things. Then you'd want me gone."); await t.say('Better like this.'); }
    else { await t.say("Sundays. Not after eight. I'm in the bath."); await t.say("Number's in the notebook. Or I'll ring you. I'll probably ring you."); }
    gp.expr('sad', 3);
    await t.say('Look after the lane, kiddo. The kids, the neighbours, the cat.');
    gp.expr('smile', 3);
    await t.say('The toys are just the excuse.');
    const b = await t.choose(['Bye, Grandpa.', { text: 'Hug him', silent: true }]);
    if (b === 1) await hug(sys, me, t);
    else { gp.act('cap', 1.8); await t.say('Bye, kiddo.'); }
    gp.act('back', 1.6);
    await t.say("...Right. Before I get soppy. My back's had enough of standing anyway.");
  };
}

// ------------------------------------------------------------------ 5. into the taxi and away down the lane
export function* taxiLeaveScene(c, sys) {
  const g = sys.game, gp = sys.gp, P = g.player, taxi = sys.taxi, town = g.garage.town, st = g.street, cat = st?.cat;
  const me = avatar(c, sys, V(-1.0, 0, 6.35), 0.9);
  if (me) me.look = 'gp';
  const door = taxi.doorSpot(V(0, 0, 0)), seat = taxi.seat(V(0, 0, 0));
  gp.lookAt = null;
  gp.goTo(door, { speed: 0.6, direct: true, face: 0 });
  // a. the shuffle to the door
  yield c.cam({ pos: V(3.0, 1.3, 6.4), look: V(0.4, 1.1, 7.6), fov: 48 });
  yield c.all(c.cam({ pos: V(2.8, 1.35, 6.6), look: V(0.2, 1.1, 7.8), dur: 2.6 }), c.wait(2.6));
  gp.place(door, 0);
  // b. he turns, sits down into the back seat, pulls his cane in after him
  yield c.cam({ pos: V(1.4, 1.2, 6.2), look: V(door.x, 0.9, door.z + 0.4), fov: 50 });
  gp.faceTo(Math.PI);
  yield c.wait(0.6);
  const from = gp.pos.clone();
  gp.sitDown({ seat: 0.42 });
  let k = 0;
  yield c.until((dt) => { k = Math.min(1, k + dt / 1.3); gp.pos.lerpVectors(from, seat, ease.inOutQuad(k)); return k >= 1; });
  gp.faceTo(Math.PI / 2);
  // the driver knows him (everyone in the lane does)
  const driver = new THREE.Object3D();
  driver.position.set(-0.4, 1.35, 0.3);
  taxi.root.add(driver);
  g.bubbles?.say(driver, `Toku-san! Off to ${TOWN}, then?`, { dur: 2.8, onChar: blipVoice(null, { base: 190, duty: 0.25, vol: 0.7 }) });
  yield c.wait(2.2);
  yield line(c, sys, 'Station, please. The slow way. Past the river.', 0.6);
  // c. the door shuts by itself
  audio.play('taxiDoor', { pos: door, close: true, vol: 1 });
  k = 0;
  yield c.until((dt) => { k = Math.min(1, k + dt / 0.7); taxi.setDoor(1 - ease.inCubic(k)); return k >= 1; });
  g.player.shake = 0.08;
  // d. away east, a wave through the back window, under the bridge as a train goes over
  const T = { x: taxi.root.position.x, v: 0 };
  const off = gp.pos.clone().sub(taxi.root.position);
  c.every((dt) => {
    if (!sys.taxi) return;
    T.v = Math.min(3.6, T.v + dt * 1.3);
    const step = T.v * dt;
    T.x += step;
    sys.taxi.setPose(T.x, TAXI_Z, Math.PI / 2);
    sys.taxi.roll(step);
    if (sys.taxiEngine?.osc) sys.taxiEngine.osc.frequency.value = 40 + T.v * 9;
    gp.pos.set(T.x + off.x, 0, TAXI_Z + off.z);
  });
  gp.lookAt = V(-2, 1.4, 6.5);
  gp.act('wave', 4);
  const tr = town?.trains?.find((t) => t.s > 0);
  if (tr) town.runTrain(1, -1);
  yield c.cam({ pos: V(-1.2, 1.5, 7.9), look: V(3.5, 1.2, TAXI_Z), fov: 46 });
  yield c.all(c.cam({ pos: V(-1.0, 1.55, 8.1), look: V(12, 1.4, TAXI_Z), dur: 5.0 }), c.wait(5.0));
  // e. you in the lane; the cat comes to sit by your feet
  if (cat && !cat.held) { cat.pos.set(1.0, 0, 6.2); cat.heading = 1.8; st.setCatState('sit', 30); }
  if (me) { me.h.root.position.set(0.2, 0, 6.9); me.face = Math.PI / 2 + 0.2; me.look = V(20, 1.4, TAXI_Z); }
  yield c.cam({ pos: V(-0.2, 1.05, 5.4), look: V(1.4, 1.2, 8.4), fov: 44 });
  yield c.all(c.cam({ pos: V(-0.4, 1.1, 5.7), look: V(1.4, 1.3, 8.6), dur: 4.6 }), c.say('...Bye, Grandpa.', 2.6));
  c.hideSay();
  yield c.fade(1, 0.8);
  sys.taxiEngine?.stopAll?.(); sys.taxiEngine = null;
  sys.taxi?.dispose(); sys.taxi = null;
  gp.setVisible(false);
  me?.hide();
  P.pos.set(0.2, 0, 6.9);
  P.yaw = 0.15; // facing back into the garage
  P.pitch = -0.08;
  yield c.toPlayer(0);
  yield c.fade(0, 0.8);
}
