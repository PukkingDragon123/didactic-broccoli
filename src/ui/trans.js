// Scene transitions (owner: "cool and varied"): every cutscene fade (src/game/Cutscene.js setFade: doors, places,
// sleep, the day change, scripted scenes) is drawn as a pixel-art wipe instead of a flat black fade. The style is picked
// when a fade starts from clear: a long fade (sleep, a day ending) rolls the shop's corrugated shutter down; a quick one
// (a door, a building) drops a row of indigo noren; the rest alternate between a stepped iris and a dissolve of big pixel
// blocks. All stepped (8 levels), transforms / one small canvas only; the renderer's post-FX are someone else's.
//   installTransitions(game)            game.transition.next(style) forces the next one ('shutter' | 'noren' | 'iris' | 'blocks')
import { art, rng, hex, shade, INK } from '../menu/pixel.js';

const STYLES = ['iris', 'blocks'];
let layer = null, cur = null, forced = null, alt = 0, lastV = 0, lastDur = 0.8, blocksCv = null, order = null;

function shutterURL() {
  // 32 x 16 texels of corrugated steel: a lit ridge, the face, a dark groove, rivets at the guide rail
  const a = art(32, 16), base = hex(0x8a949a);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) {
    const r = y % 8;
    let c = r === 0 ? INK : r === 1 ? hex(0xc8d0d4) : r === 2 ? hex(0xaab4b8) : r < 6 ? base : r === 6 ? hex(0x6a7278) : hex(0x4a5258);
    if ((x * 7 + y * 3) % 23 === 0 && r > 2 && r < 6) c = shade(base, 0.9);
    if ((x + y * 5) % 41 === 0) c = hex(0x8a4a24); // a rust speck
    a.px(x, y, c);
  }
  const c = document.createElement('canvas'); c.width = 32; c.height = 16;
  c.getContext('2d').putImageData(new ImageData(a.data, 32, 16), 0, 0);
  return c.toDataURL();
}
function norenURL() {
  const a = art(16, 16), r = rng(5);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) a.px(x, y, r() < 0.06 ? hex(0x1a2250) : x % 8 === 0 ? hex(0x1e2a5c) : hex(0x26346e));
  const c = document.createElement('canvas'); c.width = 16; c.height = 16;
  c.getContext('2d').putImageData(new ImageData(a.data, 16, 16), 0, 0);
  return c.toDataURL();
}

function build() {
  layer = document.createElement('div');
  layer.id = 'ph-trans';
  layer.innerHTML = `<div class="t-shutter"><i class="slats"></i><i class="bar"></i></div>
    <div class="t-noren">${'<i></i>'.repeat(6)}</div><div class="t-iris"></div><canvas class="t-blocks"></canvas>`;
  document.body.appendChild(layer);
  layer.style.setProperty('--shutter', `url(${shutterURL()})`);
  layer.style.setProperty('--noren', `url(${norenURL()})`);
  blocksCv = layer.querySelector('.t-blocks');
}

function drawBlocks(v) {
  const B = 40, w = Math.ceil(innerWidth / B), h = Math.ceil(innerHeight / B);
  if (blocksCv.width !== w || blocksCv.height !== h || !order || order.length !== w * h) {
    blocksCv.width = w; blocksCv.height = h;
    const r = rng(17); order = Float32Array.from({ length: w * h }, (_, i) => { const x = i % w, y = (i / w) | 0; return Math.min(0.999, ((x + y) / (w + h)) * 0.55 + r() * 0.45); });
  }
  const g = blocksCv.getContext('2d');
  g.clearRect(0, 0, w, h);
  g.fillStyle = '#120a0e';
  for (let i = 0; i < order.length; i++) if (order[i] < v) g.fillRect(i % w, (i / w) | 0, 1, 1);
}

function set(v) {
  if (!layer) build();
  const q = Math.round(v * 8) / 8;
  if (v > 0.001 && lastV <= 0.001) { cur = forced || (lastDur >= 0.9 ? 'shutter' : lastDur <= 0.5 ? 'noren' : STYLES[alt++ % STYLES.length]); forced = null; layer.dataset.s = cur; }
  lastV = v;
  layer.style.display = v > 0.001 ? 'block' : 'none';
  layer.style.setProperty('--f', q);
  if (cur === 'blocks' && v > 0.001) drawBlocks(q);
}

export function installTransitions(game) {
  const C = game.cutscene;
  if (!C || C.__phTrans) return;
  C.__phTrans = true;
  const setFade = C.setFade.bind(C), fade = C.fade.bind(C);
  C.fade = (to, dur = 0.8) => { if (to > 0) lastDur = dur; return fade(to, dur); };
  C.setFade = (v) => { setFade(v); try { set(v); } catch { /* the plain fade still works */ } };
  document.body.classList.add('ph-trans-on');
  game.transition = { next: (s) => { forced = s; } };
}
