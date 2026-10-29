// Entry point: fonts, title screen, pause menu, main loop.
import '@fontsource/dotgothic16/400.css';
import '@fontsource/pixelify-sans/400.css';
import './ui/fonts.css';
import './style.css';
import * as THREE from 'three';
import { Game } from './game/Game.js';
import { audio } from './core/audio.js';
import { bgm } from './core/bgm.js';
import { installPC } from './pc/PC.js';
import { installMuseum } from './museum/Museum.js';
import { installFP } from './game/FPBody.js';
import { installDebug } from './debug.js';
import { isTouchDevice, installTouch } from './core/touch.js';
import { MenuSigns } from './world/menuSigns.js';
import { MenuGear } from './world/menuGear.js';
import { MenuCrew } from './world/MenuCrew.js';
import { MenuStyler } from './ui/MenuStyler.js';
import { installStaticIcons, setLabel } from './ui/staticIcons.js';
import { encodeShop, decodeShop } from './game/shareCode.js';
import { VISIT_KEY } from './game/state.js';
import { ITEMS } from './data/series/index.js';
import { bannerGlyphs } from './gfx/banner.js';
import { SHOP_TEXT } from './museum/Museum.js';

const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);

async function loadFonts() {
  // make sure every glyph we draw onto canvases is available before textures are generated
  const text = ITEMS.map((i) => i.jp).join('') + 'ガチャマート全種回円売切新入荷シークレットあり対象年齢才以上補充満杯安全第一禁煙怪獣大決戦迷い猫さがしています夏祭り月火水木金土日貸倉庫入居者募集中買取高価保管みかんワレモノ注意カプセル在庫天地無用お米新潟県産ライブ中古フィギュア個お届け物スーパー大冒険一二三四五六七八九十百千万' +
    'コイン投入口返却ボタン印を合わせてからコインを入れてくださいとりだしぐち見本円' + bannerGlyphs() + SHOP_TEXT;
  try {
    await Promise.all([
      document.fonts.load('16px "DotGothic16"', text),
      document.fonts.load('16px "Pixelify Sans"', 'ABCabc123'),
      document.fonts.load('16px "Alagard"', 'ABCabc123'),
      document.fonts.load('16px "GG Bold"', 'ABCabc123'),
      document.fonts.load('16px "GG Display"', 'ABCabc123'),
    ]);
  } catch (e) { console.warn('font load', e); }
}

async function boot() {
  installStaticIcons(); // pixel icons on the static buttons (and the loading bar)
  const pct = $('load-pct');
  await loadFonts();
  const game = new Game($('app'));
  window.__game = game;
  Game.plugins.push(installPC, installMuseum, installFP);
  // drop-in features: every src/plugins/*.js that exports install(game); they run once the world, the people and
  // every core system exist (see Game.late)
  for (const m of Object.values(import.meta.glob('./plugins/*.js', { eager: true }))) if (m.install) Game.late.push(m.install);
  await game.init((p) => { pct.textContent = `${Math.round(p * 100)}%`; });
  if (params.has('debug') || params.has('autotest')) installDebug(game, params);

  const touch = isTouchDevice() ? installTouch(game.input, { onPause: () => game.input.unlock() }) : null;
  if (touch && !game.state.settings.quality) game.renderer.setQuality('low');

  $('loading').classList.add('hidden');
  let started = false;
  let titleT = 0;
  let fly = null; // camera flight from the street into the garage
  const sfx = (n, v = 0.5) => { try { audio.init(); audio.play(n, { vol: v }); } catch { /* audio not ready */ } };

  let intro = false; // the new-game intro cutscene is playing
  // menu music: browsers only allow audio after a gesture, so it starts on the first click / tap / key
  const menuMusic = () => { if (started || fly || intro) return; try { audio.init(); if (!bgm.current) bgm.play('menu', { fade: 2.5 }); } catch { /* no audio */ } };
  window.addEventListener('pointerdown', menuMusic, { once: true });
  window.addEventListener('keydown', menuMusic, { once: true });
  const start = () => {
    audio.init();
    game.startAudio();
    dropGear();
    styler?.dispose(); styler = null;
    if (crew?.busy) crew.closet.close();
    const st = game.state.story;
    if (!started && !fly && !intro && !game.story.done && !st.intro && !game.visiting) {
      // a brand-new game: the intro cutscene instead of the fly-in
      intro = true;
      bgm.play('intro', { loop: false, fade: 2 });
      signs.dispose();
      crew?.dispose(); crew = null;
      $('title').classList.add('fade');
      setTimeout(() => $('title').classList.add('hidden'), 600);
      game.cutscene.play((c) => game.story.introScene(c), { skippable: true }).then(() => { intro = false; started = true; game.held.anchor.visible = true; $('hud').classList.remove('hidden'); touch?.show(true); game.save(); bgm.play('garage', { fade: 3 }); });
    } else if (!started && !fly && !intro) { fly = { t: 0, from: game.camera.position.clone(), q: game.camera.quaternion.clone() }; bgm.play('garage', { fade: 3 }); crew?.leave(); }
    game.input.lock();
  };
  // the 3D signpost in the street
  const signs = new MenuSigns(game.scene);
  signs.enabled = true;
  if (params.has('autotest')) signs.dispose();
  // the spinning 3D settings gear in the corner of the menu
  let gear = params.has('autotest') ? null : new MenuGear(game.camera);
  if (gear) document.body.classList.add('has-3d-gear');
  const dropGear = () => { gear?.dispose(); gear = null; document.body.classList.remove('has-3d-gear'); };
  // you and your friends goofing around in the lane; click yourself for the closet
  let crew = params.has('autotest') ? null : new MenuCrew(game);
  game.menuCrew = crew;
  // arrows beside you to restyle hair / top / bottoms (and colours) right on the menu
  let styler = crew ? new MenuStyler(game, crew) : null;
  // whatever's in your hands hangs off the camera: keep it out of the menu shot
  game.held.anchor.visible = params.has('autotest');
  const canvas = game.renderer.renderer.domElement;
  const ndc = (e) => [(e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1];
  const menuOpen = () => !started && !fly && !crew?.busy && $('share').classList.contains('hidden') && $('pause').classList.contains('hidden');
  // pointer events cover mouse, pen and touch alike; listen on the window so overlays never swallow them
  window.addEventListener('pointermove', (e) => {
    if (!menuOpen()) { if (gear) gear.hover = false; signs.hoverId = null; if (crew) crew.hover = false; return; }
    const overGear = !!gear?.pick(game.camera, ...ndc(e));
    if (overGear && !gear.hover) sfx('uiHover', 0.35);
    if (gear) gear.hover = overGear;
    const id = overGear ? null : signs.pick(game.camera, ...ndc(e));
    if (id !== signs.hoverId && id) sfx('uiHover', 0.35);
    signs.hoverId = id;
    const overMe = !id && !overGear && !!crew?.pick(game.camera, ...ndc(e));
    if (crew) crew.hover = overMe && e.pointerType !== 'touch';
    canvas.style.cursor = id || overGear || overMe ? 'pointer' : '';
  });
  let downAt = null;
  window.addEventListener('pointerdown', (e) => { if (menuOpen()) { downAt = { x: e.clientX, y: e.clientY, id: signs.pick(game.camera, ...ndc(e)), gear: !!gear?.pick(game.camera, ...ndc(e)), me: !!crew?.pick(game.camera, ...ndc(e)) }; signs.hoverId = downAt.id; } });
  window.addEventListener('pointerup', (e) => {
    if (!menuOpen() || !downAt) return;
    if (downAt.gear && gear?.pick(game.camera, ...ndc(e))) { downAt = null; sfx('uiClick', 0.6); openSettings(); return; }
    const id = signs.pick(game.camera, ...ndc(e)) || (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 30 ? downAt.id : null);
    const me = !id && downAt.me && (crew?.pick(game.camera, ...ndc(e)) || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 30);
    downAt = null;
    if (me) { sfx('uiClick', 0.6); crew.openCloset(); return; }
    if (!id) return;
    sfx('uiClick', 0.7);
    if (id === 'play') start();
    else openShare(id);
  });

  // settings: gear on the menu, Esc / pause button in game
  const openSettings = () => { $('pause').classList.remove('hidden'); $('resume-btn').classList.toggle('hidden', !started); $('leave-btn').classList.toggle('hidden', !game.visiting); };
  $('m-gear').addEventListener('click', () => { sfx('uiClick', 0.6); openSettings(); });
  for (const b of document.querySelectorAll('[data-close]')) b.addEventListener('click', (e) => {
    e.stopPropagation();
    b.closest('.overlay').classList.add('hidden');
    if (b.closest('#pause') && started) start();
  });
  $('leave-btn').addEventListener('click', () => { try { sessionStorage.removeItem(VISIT_KEY); } catch { /* ignore */ } location.reload(); });

  // host / join: share a shop code, or open a friend's shop read-only
  const share = $('share'), code = $('share-code'), act = $('share-act'), note = $('share-note');
  const openShare = async (mode) => {
    sfx('uiClick', 0.6);
    share.classList.remove('hidden');
    share.dataset.mode = mode;
    note.textContent = '';
    if (mode === 'host') {
      if (game.visiting) { try { sessionStorage.removeItem(VISIT_KEY); } catch { /* ignore */ } location.reload(); return; }
      $('share-title').textContent = 'Host your shop';
      code.readOnly = true;
      code.value = '...';
      game.save();
      code.value = await encodeShop(game.state);
      setLabel(act, 'Copy code', 'copy');
      note.textContent = 'Send this code to a friend so they can visit your shop';
    } else {
      $('share-title').textContent = 'Visit a friend';
      code.readOnly = false;
      code.value = '';
      code.placeholder = 'GG1....';
      setLabel(act, 'Go!', 'play');
      note.textContent = "Paste your friend's shop code";
      setTimeout(() => code.focus(), 50);
    }
  };
  act.addEventListener('click', async () => {
    if (share.dataset.mode === 'host') {
      try { await navigator.clipboard.writeText(code.value); note.textContent = 'Copied!'; }
      catch { code.select(); note.textContent = 'Selected - copy it with Ctrl+C'; }
      return;
    }
    try {
      const st = await decodeShop(code.value);
      sessionStorage.setItem(VISIT_KEY, JSON.stringify(st));
      sfx('purchase', 0.7);
      location.reload();
    } catch { note.textContent = "That code doesn't work"; sfx('error', 0.5); }
  });

  let freeTold = false;
  game.input.onLockChange = (locked) => {
    if (locked) {
      if (game.input.free && !freeTold && !game.input.touch) { freeTold = true; setTimeout(() => game.news('Free-look mode', 'Move the mouse to look around; rest it at the screen edge to keep turning. Esc pauses.', 8000), 2500); }
      started = true;
      $('title').classList.add('fade');
      setTimeout(() => $('title').classList.add('hidden'), 600);
      $('pause').classList.add('hidden');
      $('hud').classList.remove('hidden');
      touch?.show(true);
      if (game.visiting) setTimeout(() => game.news(`${game.state.__owner || "A friend"}'s shop`, 'Visiting - nothing is saved', 6000), 1200);
      else if (!game.state.flags.welcomed && game.story.done) {
        game.state.flags.welcomed = true;
        setTimeout(() => game.news('Welcome back!', '', 6000), 1400);
      }
    } else if (started && !params.has('autotest') && !game.uiOpen) {
      touch?.show(false);
      openSettings();
      game.save();
    }
  };

  // ---------------- settings panel
  const s = game.state.settings;
  $('quality').value = game.renderer.qualityName;
  $('vol-master').value = s.master; $('vol-music').value = s.music; $('vol-amb').value = s.ambience;
  $('sens').value = s.sens; $('fov').value = s.fov; $('hints').checked = s.hints;
  $('quality').addEventListener('change', (e) => { s.quality = e.target.value; game.renderer.setQuality(s.quality); game.save(); });
  const bind = (id, key) => $(id).addEventListener('input', (e) => { s[key] = +e.target.value; game.applySettings(); });
  bind('vol-master', 'master'); bind('vol-music', 'music'); bind('vol-amb', 'ambience'); bind('sens', 'sens'); bind('fov', 'fov');
  $('hints').addEventListener('change', (e) => { s.hints = e.target.checked; game.applySettings(); });
  $('hands').checked = s.hands !== false;
  $('hands').addEventListener('change', (e) => { s.hands = e.target.checked; game.fp?.setEnabled(s.hands); game.save(); });
  // two-step confirm (dialogs aren't available everywhere)
  let resetArm = 0;
  $('reset-btn').addEventListener('click', () => {
    if (Date.now() - resetArm < 4000) { game.reset(); return; }
    resetArm = Date.now();
    setLabel('reset-btn', 'Click again to erase', 'warning');
    setTimeout(() => setLabel('reset-btn', 'Reset save', 'trash'), 4000);
  });
  for (const el of document.querySelectorAll('#pause .panel')) el.addEventListener('click', (e) => e.stopPropagation());

  // ---------------- adaptive quality on first run
  let fpsSamples = [];
  const autoQuality = !s.quality;

  // ---------------- loop
  const clock = new THREE.Clock();
  const titleCam = { a: 0 };
  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (intro) { game.update(dt); game.render(dt); return; }
    if (!started && !params.has('autotest')) {
      // the menu: a slow crane shot of your shop from the street at dusk
      titleT += dt;
      const cam = game.camera;
      const a = titleT * 0.06;
      cam.position.set(1.9 + Math.sin(a) * 0.3, 1.55 + Math.sin(titleT * 0.17) * 0.04, 10.6 + Math.cos(a * 0.7) * 0.2);
      cam.lookAt(-0.5 + Math.sin(a) * 0.12, 1.9, 5.2);
      crew?.update(dt); // may take the camera over (closet close-up)
      styler?.update(dt, titleT > 0.8 && menuOpen());
      if (gear) gear.root.visible = !crew?.busy;
      game.time += dt;
      for (const m of game.machines) m.update(dt, game.time);
      game.garage.update(dt, game.time);
      game.street.update(dt, game.time);
      game.pedestrians?.update(dt);
      game.effects.update(dt, game.time);
      game.lighting.update(dt, game.time);
      game.tweens.update(dt);
      signs.update(dt, game.time);
      gear?.update(dt);
      game.render(dt);
      return;
    }
    if (fly) {
      // fly from the street, under the half-open shutter, to the player's eyes
      game.update(dt);
      fly.t += dt / 2.2;
      const k = Math.min(1, fly.t);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const cam = game.camera;
      const end = cam.position.clone(), endQ = cam.quaternion.clone();
      // under the half-open shutter into the garage, or (shutter still locked) a straight glide down the lane
      const inside = game.player.pos.z < 5;
      const p0 = fly.from, p1 = inside ? new THREE.Vector3(0.3, 1.05, 7.4) : p0.clone().lerp(end, 0.33), p2 = inside ? new THREE.Vector3(0.4, 1.2, 4.4) : p0.clone().lerp(end, 0.66);
      const u = 1 - e;
      const bez = p0.clone().multiplyScalar(u * u * u).add(p1.clone().multiplyScalar(3 * u * u * e)).add(p2.clone().multiplyScalar(3 * u * e * e)).add(end.clone().multiplyScalar(e * e * e));
      cam.position.copy(bez);
      cam.quaternion.copy(fly.q).slerp(endQ, Math.min(1, e * 1.15));
      cam.updateMatrixWorld();
      crew?.update(dt);
      game.render(dt);
      if (k >= 1) { fly = null; signs.dispose(); crew?.dispose(); crew = null; game.held.anchor.visible = true; }
      return;
    }
    game.update(dt);
    game.render(dt);
    if (autoQuality && fpsSamples.length < 240) {
      fpsSamples.push(dt);
      if (fpsSamples.length === 240) {
        const avg = fpsSamples.slice(60).reduce((a, b) => a + b, 0) / 180;
        if (avg > 1 / 30) { game.renderer.setQuality('low'); $('quality').value = 'low'; }
        else if (avg > 1 / 50) { game.renderer.setQuality('medium'); $('quality').value = 'medium'; }
      }
    }
  }
  frame();
  window.__ready = true;
}

boot().catch((e) => {
  console.error(e);
  $('loading').textContent = 'Error: ' + e.message;
  window.__ready = true;
});
