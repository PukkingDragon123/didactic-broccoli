// Entry point: fonts, title screen, pause menu, main loop.
import '@fontsource/dotgothic16/400.css';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/jersey-10/400.css';
import '@fontsource/tiny5/400.css';
import '@fontsource/silkscreen/400.css';
import './style.css';
import * as THREE from 'three';
import { Game } from './game/Game.js';
import { audio } from './core/audio.js';
import { installPC } from './pc/PC.js';
import { installMuseum } from './museum/Museum.js';
import { installDebug } from './debug.js';
import { isTouchDevice, installTouch } from './core/touch.js';
import { MenuSigns } from './world/menuSigns.js';
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
      document.fonts.load('16px "Jersey 10"', 'ABCabc123'),
      document.fonts.load('16px "Tiny5"', 'ABCabc123'),
      document.fonts.load('16px "Silkscreen"', 'ABCabc123'),
    ]);
  } catch (e) { console.warn('font load', e); }
}

async function boot() {
  const pct = $('load-pct');
  await loadFonts();
  const game = new Game($('app'));
  window.__game = game;
  Game.plugins.push(installPC, installMuseum);
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
  const start = () => {
    audio.init();
    game.startAudio();
    const st = game.state.story;
    if (!started && !fly && !intro && !game.story.done && !st.intro && !game.visiting) {
      // a brand-new game: the intro cutscene instead of the fly-in
      intro = true;
      signs.dispose();
      $('title').classList.add('fade');
      setTimeout(() => $('title').classList.add('hidden'), 600);
      game.cutscene.play((c) => game.story.introScene(c), { skippable: true }).then(() => { intro = false; started = true; $('hud').classList.remove('hidden'); touch?.show(true); game.save(); });
    } else if (!started && !fly && !intro) fly = { t: 0, from: game.camera.position.clone(), q: game.camera.quaternion.clone() };
    game.input.lock();
  };
  // the 3D signpost in the street
  const signs = new MenuSigns(game.scene);
  signs.enabled = true;
  if (params.has('autotest')) signs.dispose();
  const canvas = game.renderer.renderer.domElement;
  const ndc = (e) => [(e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1];
  const menuOpen = () => !started && !fly && $('share').classList.contains('hidden') && $('pause').classList.contains('hidden');
  // pointer events cover mouse, pen and touch alike; listen on the window so overlays never swallow them
  window.addEventListener('pointermove', (e) => {
    if (!menuOpen()) return;
    const id = signs.pick(game.camera, ...ndc(e));
    if (id !== signs.hoverId && id) sfx('uiHover', 0.35);
    signs.hoverId = id;
    canvas.style.cursor = id ? 'pointer' : '';
  });
  let downAt = null;
  window.addEventListener('pointerdown', (e) => { if (menuOpen()) { downAt = { x: e.clientX, y: e.clientY, id: signs.pick(game.camera, ...ndc(e)) }; signs.hoverId = downAt.id; } });
  window.addEventListener('pointerup', (e) => {
    if (!menuOpen() || !downAt) return;
    const id = signs.pick(game.camera, ...ndc(e)) || (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 30 ? downAt.id : null);
    downAt = null;
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
      act.textContent = 'Copy code';
      note.textContent = 'Send this code to a friend so they can visit your shop';
    } else {
      $('share-title').textContent = 'Visit a friend';
      code.readOnly = false;
      code.value = '';
      code.placeholder = 'GG1....';
      act.textContent = 'Go!';
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

  game.input.onLockChange = (locked) => {
    if (locked) {
      started = true;
      $('title').classList.add('fade');
      setTimeout(() => $('title').classList.add('hidden'), 600);
      $('pause').classList.add('hidden');
      $('hud').classList.remove('hidden');
      touch?.show(true);
      if (game.visiting) setTimeout(() => game.news(`${game.state.__owner || "A friend"}'s shop`, 'Visiting - nothing is saved', 6000), 1200);
      else if (!game.state.flags.welcomed && game.story.done) {
        game.state.flags.welcomed = true;
        setTimeout(() => game.news('Welcome back to GACHA GARAGE!', '', 6000), 1400);
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
  // two-step confirm (dialogs aren't available everywhere)
  let resetArm = 0;
  $('reset-btn').addEventListener('click', () => {
    if (Date.now() - resetArm < 4000) { game.reset(); return; }
    resetArm = Date.now();
    $('reset-btn').textContent = 'Click again to erase everything';
    setTimeout(() => { $('reset-btn').textContent = 'Reset save data'; }, 4000);
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
      game.time += dt;
      for (const m of game.machines) m.update(dt, game.time);
      game.garage.update(dt, game.time);
      game.street.update(dt, game.time);
      game.effects.update(dt, game.time);
      game.lighting.update(dt, game.time);
      game.tweens.update(dt);
      signs.update(dt, game.time);
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
      game.render(dt);
      if (k >= 1) { fly = null; signs.dispose(); }
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
