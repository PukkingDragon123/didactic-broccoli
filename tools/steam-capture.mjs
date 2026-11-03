// Captures the Steam store screenshots and the raw renders behind the capsule art.
// Usage: node tools/steam-capture.mjs [outDir=docs/steam/raw] [quality=high] [only=name,name]
// Each scene sets the game up through window.dbg / game APIs, waits for the world to settle and saves a PNG.
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const [outDir = 'docs/steam/raw', quality = 'high', onlyArg = ''] = process.argv.slice(2);
const only = onlyArg ? onlyArg.split(',') : null;
let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = createRequire('/opt/node-tools/node_modules/')('playwright')); }

const root = resolve(import.meta.dirname, '..');
mkdirSync(resolve(root, outDir), { recursive: true });
const server = await createServer({ root, configFile: resolve(root, 'vite.config.js'), server: { port: 0, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] } }, logLevel: 'error' });
await server.listen();
const base = `http://127.0.0.1:${server.httpServer.address().port}/index.html?autotest&q=${quality}`;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

// a save where the opening chores are done (no dust, rubbish or junk on the garage floor); loaded with a reload
const CLEAN_SAVE = `
  const g = window.__game, f = g.state.story;
  Object.assign(f, { intro: true, shutter: true, cash: true, fed: true, tube: true, radio: true, opened: true, complete: true });
  f.swept = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']; f.bags = ['b1', 'b3', 'r_p2', 'r_p5', 'c_p3', 'j1', 'j2'];
  f.bagged = ['p2', 'p5', 'p3']; f.junkOut = ['j1', 'j2']; f.junkOpen = ['j1', 'j2'];
  g.save(); 0
`;
// a shop in full swing: open, four stocked machines, the tubes lit, people about
const SETUP = `
  const g = window.__game;
  dbg.shopOpen();
  g.state.flags.firstVisitScene = true;
  try { g.gachaDebug.setup(['retro', 'standard', 'deluxe', 'royal'], 'mochi', 0.8); } catch (e) { console.warn(e); }
  try { g.garage.lights.tubes.forEach((t) => { t.dead = false; }); g.garage.setLights(true); } catch {}
  try { g.life && (g.life.signOpen = true); } catch {}
`;
const HIDE_HUD = `for (const id of ['hud', 'guide', 'waypoint', 'simclock', 'money', 'hotbar', 'news', 'touch']) { const e = document.getElementById(id); if (e) e.style.visibility = 'hidden'; }`;

const SCENES = [
  // 1. the lane at golden hour, the shop open, neighbours about
  { name: 'shot1_lane_golden', w: 1920, h: 1080, steps: [`${SETUP} dbg.time(17.2); dbg.people.spawnAll(); dbg.people.place('kusaka', 1.2, 7.4); dbg.people.place('hatoda', -1.6, 9.6); dbg.view(3.6, 11.6, 0.55, -0.02); dbg.step(2, 0.1);`] },
  // 2. a capsule cracked open by the machines (ultra rare)
  { name: 'shot2_garage_reveal', w: 1920, h: 1080, steps: [`${SETUP} dbg.time(14); dbg.view(0.6, 1.4, 1.25, -0.12); dbg.capsule('kaiju', 'ultra'); dbg.step(0.4, 0.1); dbg.open(); dbg.step(1.2, 0.1);`] },
  // 3. sitting at Capsule 98, browsing the second-hand site
  { name: 'shot3_pc_offhobby', w: 1920, h: 1080, steps: [`${SETUP} dbg.time(11); dbg.pc('top'); dbg.step(1, 0.1);`, `__game.os.open('offhobby'); 0`] },
  // 4. the lane after dark: lanterns, lit windows
  { name: 'shot4_lane_night', w: 1920, h: 1080, steps: [`${SETUP} dbg.time(21.5); dbg.people.spawnAll(); dbg.view(-5.5, 10.4, 2.6, 0.02); dbg.step(2, 0.1);`] },
  // 5. a conversation: floating text and choices, no speech bubbles
  { name: 'shot5_chat', w: 1920, h: 1080, steps: [`${SETUP} dbg.time(10.5); dbg.view(1.6, 8.6, 0.1, 0); dbg.people.place('hatoda', 1.3, 7.0); dbg.step(0.5, 0.1);`, `dbg.people.chat('hatoda'); 0`, `dbg.people.run(4)`] },
  // the raw render behind the capsule art (no HUD, no hands)
  { name: 'capsule_main', w: 1232, h: 706, hud: false, steps: [`${SETUP} dbg.time(17.3); dbg.people.clean(true); dbg.people.place('hatoda', -0.6, 5.4); dbg.people.place('kusaka', 2.6, 6.2); dbg.view(1.4, 10.2, 0.12, 0.05); dbg.step(1.5, 0.1);`] },
];

for (const sc of SCENES) {
  if (only && !only.includes(sc.name)) continue;
  const pg = await (await browser.newContext({ viewport: { width: sc.w, height: sc.h } })).newPage();
  pg.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await pg.goto(base, { timeout: 120000 });
  await pg.waitForFunction(() => window.__ready === true, null, { timeout: 400000 });
  await pg.evaluate(CLEAN_SAVE);
  await pg.reload({ waitUntil: 'load', timeout: 240000 });
  await pg.waitForFunction(() => window.__ready === true, null, { timeout: 400000 });
  await pg.waitForTimeout(1500);
  for (const s of sc.steps) { await pg.evaluate(s); await pg.waitForTimeout(2500); }
  if (sc.hud === false) await pg.evaluate(HIDE_HUD);
  await pg.waitForTimeout(4000);
  await pg.screenshot({ path: resolve(root, outDir, `${sc.name}.png`), timeout: 400000 });
  console.log('saved', sc.name);
  await pg.close();
}
await browser.close();
await server.close();
