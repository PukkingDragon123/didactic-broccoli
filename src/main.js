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
import { autoQuality } from './core/autoQuality.js';
import { isTouchDevice, installTouch } from './core/touch.js';
import { TitleMenu } from './menu/Menu.js';
import { installStaticIcons, setLabel } from './ui/staticIcons.js';
import { encodeShop, decodeShop } from './game/shareCode.js';
import { prepareNet } from './net/boot.js';
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
  // multiplayer: a guest's tab connects to the host first and loads the host's world (src/net/boot.js)
  const loadLabel = document.querySelector('#loading .load-label');
  const netBoot = await prepareNet((t) => { if (loadLabel) loadLabel.innerHTML = `${t} <span id="load-pct"></span>`; });
  if (netBoot && loadLabel) loadLabel.innerHTML = 'Loading <span id="load-pct">0%</span>';
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
  const sfx = (n, v = 0.5) => { try { audio.init(); audio.play(n, { vol: v }); } catch { /* audio not ready */ } };

  let intro = false; // the new-game intro cutscene is playing
  let menu = null; // the title screen (src/menu/), until it hands over to the game
  // menu music: browsers only allow audio after a gesture, so it starts on the first click / tap / key
  const menuMusic = () => { if (started || intro || menu?.leaving) return; try { audio.init(); if (!bgm.current) bgm.play('menu', { fade: 2.5 }); } catch { /* no audio */ } };
  window.addEventListener('pointerdown', menuMusic, { once: true });
  window.addEventListener('keydown', menuMusic, { once: true });
  /** A brand-new game: the drive into the lane and meeting Grandpa (src/game/Story.js newGame) instead of the way in. */
  const isNewGame = () => { const st = game.state.story; return !game.story.done && !st.intro && !game.visiting; };
  // what used to happen the moment the pointer locked: the title goes, the HUD comes
  const showGame = () => {
    started = true;
    $('title').classList.add('fade');
    setTimeout(() => $('title').classList.add('hidden'), 600);
    $('pause').classList.add('hidden');
    $('hud').classList.remove('hidden');
    touch?.show(true);
    if (game.visiting) setTimeout(() => game.news(`${game.state.__owner || "A friend"}'s shop`, game.mp?.isGuest ? `Playing together · room ${game.mp.s.code} · T to chat` : 'Visiting - nothing is saved', 6000), 1200);
    else if (!game.state.flags.welcomed && game.story.done) {
      game.state.flags.welcomed = true;
      setTimeout(() => game.news('Welcome back!', '', 6000), 1400);
    }
  };
  /** The title screen's way out has played (the screen is dark): hand the scene back and go. */
  const enter = (kind) => {
    const fade = document.getElementById('tm-fade');
    menu?.dispose(); menu = null; game.titleMenu = null;
    if (kind === 'new') {
      intro = true;
      showGame();
      game.story.newGame().then(() => { intro = false; started = true; game.held.anchor.visible = true; $('hud').classList.remove('hidden'); touch?.show(true); game.save(); bgm.play('garage', { fade: 3 }); });
    } else {
      game.held.anchor.visible = true;
      showGame();
      if (!game.input.locked && !params.has('autotest')) { touch?.show(false); openSettings(); }
    }
    if (fade) { fade.className = 'off'; setTimeout(() => fade.remove(), 700); }
  };
  const start = () => {
    audio.init();
    game.startAudio();
    if (started || intro) { game.input.lock(); return; }
    if ($('share') && !$('share').classList.contains('hidden')) { game.mp?.ui?.closeMenu?.(); $('share').classList.add('hidden'); }
    const kind = isNewGame() ? 'new' : 'continue';
    if (kind === 'continue') bgm.play('garage', { fade: 3 });
    if (menu) menu.play(kind);
    else { game.input.lock(); enter(kind); }
  };
  // the title screen: dusk in the lane, the sign and the menu tags (autotest boots straight into the game)
  if (!params.has('autotest')) {
    menu = new TitleMenu(game, {
      lockInput: () => { audio.init(); game.startAudio(); game.input.lock(); },
      onEnter: (kind) => enter(kind),
      openSettings: () => { sfx('uiClick', 0.6); openSettings(); },
      openShare: (mode) => openShare(mode),
    });
    game.titleMenu = menu;
  }
  // whatever's in your hands hangs off the camera: keep it out of the menu shot
  game.held.anchor.visible = params.has('autotest');
  // Esc on the title closes an open panel
  window.addEventListener('keydown', (e) => {
    if (started || e.key !== 'Escape') return;
    for (const id of ['share', 'pause']) { const el = $(id); if (!el.classList.contains('hidden')) { el.querySelector('[data-close]')?.click(); e.preventDefault(); return; } }
  });

  // settings: the Settings tag on the menu, Esc / pause button in game
  const openSettings = () => {
    $('pause').classList.remove('hidden'); $('resume-btn').classList.toggle('hidden', !started);
    const mpOn = !!game.mp?.active;
    $('leave-btn').classList.toggle('hidden', !game.visiting && !mpOn);
    if (mpOn) setLabel('leave-btn', game.mp.isHost ? 'Close the room' : 'Leave the room', 'home');
  };
  for (const b of document.querySelectorAll('[data-close]')) b.addEventListener('click', (e) => {
    e.stopPropagation();
    b.closest('.overlay').classList.add('hidden');
    if (b.closest('#pause') && started) start();
  });
  $('resume-btn').addEventListener('click', (e) => { e.stopPropagation(); $('pause').classList.add('hidden'); if (started) start(); });
  $('leave-btn').addEventListener('click', () => {
    if (game.mp?.active) { const host = game.mp.isHost; game.mp.leave(); if (host) $('leave-btn').classList.add('hidden'); return; }
    try { sessionStorage.removeItem(VISIT_KEY); } catch { /* ignore */ }
    location.reload();
  });

  // host / join: a live room (multiplayer, src/net/), or the fallback: share a shop code / open a friend's shop read-only
  const share = $('share'), code = $('share-code'), act = $('share-act'), note = $('share-note');
  const openShare = (mode) => {
    if (!game.mp) return openShareCode(mode);
    // hosting from a read-only visit: back to your own shop first
    if (mode === 'host' && game.visiting && !game.mp.isGuest) { try { sessionStorage.removeItem(VISIT_KEY); } catch { /* ignore */ } location.reload(); return; }
    sfx('uiClick', 0.6);
    game.mp.ui.menu(mode, { onPlay: () => start(), fallback: (m, pasted) => openShareCode(m, pasted) });
  };
  const openShareCode = async (mode, pasted = '') => {
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
      code.value = pasted;
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

  if (game.mp?.bootError) { openShare('join'); game.mp.ui.note(`Couldn't get back into the room: ${game.mp.bootError.message}`, true); }

  let freeTold = false;
  game.input.onLockChange = (locked) => {
    if (locked) {
      if (game.input.free && !freeTold && !game.input.touch) { freeTold = true; setTimeout(() => game.news('Free-look mode', 'Move the mouse to look around; rest it at the screen edge to keep turning. Esc pauses.', 8000), 2500); }
      if (menu) return; // the title screen is still playing its way out: it calls enter() when it's done
      showGame();
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

  // ---------------- adaptive quality on first run (src/core/autoQuality.js): until a preset is picked in Settings
  const aq = params.has('autotest') || touch ? null : autoQuality(game, { onChange: (name) => { $('quality').value = name; } });
  let lastNow = performance.now();

  // ---------------- loop
  const clock = new THREE.Clock();
  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (intro) { game.update(dt); game.render(dt); return; }
    if (menu) {
      // the title screen ticks the world it shows and drives the camera (no player, clock or customers)
      menu.update(dt);
      game.render(dt);
      return;
    }
    game.update(dt);
    game.render(dt);
    const now = performance.now();
    aq?.frame((now - lastNow) / 1000); // the real frame time (dt above is clamped)
    lastNow = now;
  }
  frame();
  window.__ready = true;
}

boot().catch((e) => {
  console.error(e);
  $('loading').textContent = 'Error: ' + e.message;
  window.__ready = true;
});
