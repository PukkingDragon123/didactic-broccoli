// Entry point: fonts, title screen, pause menu, main loop.
import '@fontsource/dotgothic16/400.css';
import '@fontsource/pixelify-sans/400.css';
import './style.css';
import * as THREE from 'three';
import { Game } from './game/Game.js';
import { audio } from './core/audio.js';
import { installPC } from './pc/PC.js';
import { installMuseum } from './museum/Museum.js';
import { installDebug } from './debug.js';
import { ITEMS } from './data/series/index.js';

const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);

async function loadFonts() {
  // make sure every glyph we draw onto canvases is available before textures are generated
  const text = ITEMS.map((i) => i.jp).join('') + 'ガチャマート全種回円売切新入荷シークレットあり対象年齢才以上補充満杯安全第一禁煙怪獣大決戦迷い猫さがしています夏祭り月火水木金土日貸倉庫入居者募集中買取高価保管みかんワレモノ注意カプセル在庫天地無用お米新潟県産ライブ中古フィギュア個お届け物スーパー大冒険一二三四五六七八九十百千万';
  try {
    await Promise.all([
      document.fonts.load('16px "DotGothic16"', text),
      document.fonts.load('16px "Pixelify Sans"', 'ABCabc123'),
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

  $('loading').classList.add('hidden');
  $('start-btn').classList.remove('hidden');
  let started = false;
  let titleT = 0;

  const start = () => {
    audio.init();
    game.startAudio();
    game.input.lock();
  };
  $('title').addEventListener('click', start);
  $('resume-btn').addEventListener('click', (e) => { e.stopPropagation(); start(); });

  game.input.onLockChange = (locked) => {
    if (locked) {
      started = true;
      $('title').classList.add('hidden');
      $('pause').classList.add('hidden');
      $('hud').classList.remove('hidden');
      if (!game.state.flags.welcomed) {
        game.state.flags.welcomed = true;
        setTimeout(() => game.news('ようこそ、ガチャガレージへ！', 'Welcome! Insert the fake coin into the old machine.', 7000), 900);
      }
    } else if (started && !params.has('autotest')) {
      $('pause').classList.remove('hidden');
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
  $('reset-btn').addEventListener('click', () => { if (confirm('Erase all progress and start over?')) game.reset(); });
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
    if (!started && !params.has('autotest')) {
      // slow cinematic drift on the title screen
      titleT += dt;
      titleCam.a = titleT * 0.05;
      const cam = game.camera;
      cam.position.set(1.4 + Math.sin(titleCam.a) * 0.6, 1.45 + Math.sin(titleT * 0.2) * 0.05, 2.2 + Math.cos(titleCam.a) * 0.3);
      cam.lookAt(-2.4, 1.0, -0.6);
      game.time += dt;
      for (const m of game.machines) m.update(dt, game.time);
      game.garage.update(dt, game.time);
      game.effects.update(dt, game.time);
      game.lighting.update(dt, game.time);
      game.tweens.update(dt);
      game.render(dt);
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
