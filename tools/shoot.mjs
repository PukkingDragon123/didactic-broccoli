// Screenshot helper for development.
// Usage:
//   node tools/shoot.mjs "viewer.html?series=mochi" shots/mochi.png [width] [height]
//   node tools/shoot.mjs "index.html?debug=1" shots/game.png 1280 720 --wait 4000 --eval "window.__game.debug.x()"
// Starts its own Vite dev server on a free port, so several copies can run at the same time.
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const args = process.argv.slice(2);
const flags = {};
const pos = [];
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) { flags[args[i].slice(2)] = args[i + 1]; i++; } else pos.push(args[i]);
}
const [page = 'viewer.html', out = 'shots/out.png', width = '1600', height = '1000'] = pos;

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  const req = createRequire('/opt/node-tools/node_modules/');
  ({ chromium } = req('playwright'));
}

const root = resolve(import.meta.dirname, '..');
const server = await createServer({ root, configFile: resolve(root, 'vite.config.js'), server: { port: 0, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] } }, logLevel: 'error' });
await server.listen();
const addr = server.httpServer.address();
const url = `http://127.0.0.1:${addr.port}/${page}`;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: +width, height: +height } });
const pg = await ctx.newPage();
const logs = [];
pg.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning' || flags.log) logs.push(`[${m.type()}] ${m.text()}`); });
pg.on('pageerror', (e) => logs.push(`[pageerror] ${e.stack || e.message}`));
try {
  await pg.goto(url, { waitUntil: 'load', timeout: 120000 });
  await pg.waitForFunction(() => window.__ready === true, null, { timeout: +(flags.timeout || 180000) });
  // Vite may full-reload once if it discovers new dependencies; wait for the page to settle again
  await pg.waitForTimeout(1500);
  await pg.waitForFunction(() => window.__ready === true, null, { timeout: +(flags.timeout || 180000) });
  if (flags.eval) {
    const r = await pg.evaluate(flags.eval);
    if (r !== undefined) console.log('eval:', typeof r === 'string' ? r : JSON.stringify(r));
  }
  if (flags.wait) await pg.waitForTimeout(+flags.wait);
  if (flags.eval2) {
    const r = await pg.evaluate(flags.eval2);
    if (r !== undefined) console.log('eval2:', typeof r === 'string' ? r : JSON.stringify(r));
    if (flags.wait2) await pg.waitForTimeout(+flags.wait2);
  }
  mkdirSync(dirname(resolve(root, out)), { recursive: true });
  await pg.screenshot({ path: resolve(root, out), timeout: 120000 });
  console.log('saved', out);
} catch (e) {
  console.error('ERROR', e.message);
} finally {
  if (logs.length) console.log(logs.slice(0, 60).join('\n'));
  await browser.close();
  await server.close();
}
