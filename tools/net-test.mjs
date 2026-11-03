// Multiplayer test runner: several game pages in one headless browser, talking through the loopback transport
// (?net=loop: a BroadcastChannel instead of PeerJS / WebRTC). Small viewports and q=low: two live pages are heavy.
// Usage: node tools/net-test.mjs scenario.mjs [width] [height]
// scenario.mjs: export default async function ({ open, wait, root }) { const h = await open('host', 'pid=h1&name=Kenji'); ... }
//   open(name, query, { room: 'ABCDE' }) opens a guest straight into a room (sessionStorage as after JOIN FRIEND)
//   page wrapper: p.eval(js | fn, arg) / p.log(js) / p.shot(path) / p.reload() / p.waitFor(js, ms) / p.logs (errors) / p.page
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [scenarioArg, width = '480', height = '300'] = process.argv.slice(2);
let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = createRequire('/opt/node-tools/node_modules/')('playwright')); }

const root = resolve(import.meta.dirname, '..');
const server = await createServer({ root, configFile: resolve(root, 'vite.config.js'), server: { port: 0, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] } }, logLevel: 'error' });
await server.listen();
const base = `http://127.0.0.1:${server.httpServer.address().port}/`;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: +width, height: +height } });
const pages = [];
const T0 = Date.now();

async function open(name, query = '', { autotest = true, room = null } = {}) {
  const pg = await ctx.newPage();
  // room: open straight into a room as a guest (as if JOIN FRIEND had found it and reloaded)
  if (room) await pg.addInitScript((code) => { if (!sessionStorage.getItem('gg-test-init')) { sessionStorage.setItem('gg-test-init', '1'); sessionStorage.setItem('gacha-garage-net', JSON.stringify({ role: 'guest', code })); } }, room);
  const logs = [];
  pg.on('console', (m) => {
    const t = m.text();
    if (/willReadFrequently|GPU stall|Clock/.test(t)) return;
    if (['error', 'warning'].includes(m.type())) logs.push(`[${name} ${m.type()}] ${t}`);
    else if (/^\[net\]|^\[test\]/.test(t)) console.log(`  (${name} ${((Date.now() - T0) / 1000).toFixed(0)}s) ${t}`);
  });
  pg.on('pageerror', (e) => logs.push(`[${name} pageerror] ${e.stack || e.message}`));
  const url = `${base}index.html?${autotest ? 'autotest&' : ''}q=low&net=loop&netwait=900${query ? '&' + query : ''}`;
  await pg.goto(url, { waitUntil: 'load', timeout: 120000 });
  await ready(pg, name);
  const P = {
    name, page: pg, logs,
    eval: (js, arg) => (typeof js === 'function' ? pg.evaluate(js, arg) : pg.evaluate(js)),
    async log(js) { const v = await pg.evaluate(js); console.log(`> [${name}] ${typeof js === 'string' ? js.slice(0, 90) : 'fn'} => ${JSON.stringify(v)}`); return v; },
    async shot(path) { const f = resolve(root, path); mkdirSync(dirname(f), { recursive: true }); await pg.screenshot({ path: f, timeout: 120000 }); console.log(`saved ${path}`); },
    async reload() { await pg.reload({ waitUntil: 'load', timeout: 240000 }); await ready(pg, name); },
    ready: () => ready(pg, name),
    /** Stop drawing every frame (the game keeps running): two live pages in one software-GL browser are slow. */
    async quiet() { await pg.evaluate(() => { const g = window.__game; if (!g._render) { g._render = g.render; g.render = () => {}; } }); },
    /** Draw one frame now and screenshot it. */
    async snap(path) {
      await pg.evaluate(() => { const g = window.__game; g.camera.updateMatrixWorld(); (g._render || g.render).call(g, 0.016); });
      const f = resolve(root, path); mkdirSync(dirname(f), { recursive: true }); await pg.screenshot({ path: f, timeout: 120000 }); console.log(`saved ${path}`);
    },
    /** Poll until js is truthy (ms timeout; returns false instead of throwing). */
    async until(js, ms = 30000) { try { await pg.waitForFunction(js, null, { timeout: ms, polling: 250 }); return true; } catch { console.log(`  (${name}) timed out waiting for: ${String(js).slice(0, 80)}`); return false; } },
    async waitFor(js, ms = 20000) { await pg.waitForFunction(js, null, { timeout: ms, polling: 200 }); },
  };
  pages.push(P);
  return P;
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/** Wait for the game to boot, saying what the loading screen says now and then. */
async function ready(pg, name, ms = 360000) {
  const t0 = Date.now();
  for (;;) {
    let st = null;
    try { st = await pg.evaluate(() => [window.__ready === true, document.querySelector('#loading .load-label')?.textContent || '']); } catch { st = [false, '(navigating)']; }
    if (st[0]) { console.log(`  (${name}) ready in ${((Date.now() - t0) / 1000).toFixed(0)} s`); return; }
    if (Date.now() - t0 > ms) throw new Error(`${name} did not boot: ${st[1]}`);
    if ((Date.now() - t0) % 30000 < 2100) console.log(`  (${name}) ${st[1]}`);
    await wait(2000);
  }
}

try {
  const mod = await import(pathToFileURL(resolve(scenarioArg)).href);
  await mod.default({ open, wait, root, base });
} catch (e) { console.error('ERROR', e.stack || e.message); }
finally {
  for (const p of pages) if (p.logs.length) console.log(p.logs.slice(0, 30).join('\n'));
  await browser.close();
  await server.close();
}
