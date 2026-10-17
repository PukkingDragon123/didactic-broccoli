// Scripted browser test runner.
// Usage: node tools/run.mjs "index.html?autotest&q=low" steps.json   (or steps inline as JSON string)
// steps: [{"eval":"js"}, {"wait":1000}, {"shot":"shots/a.png"}, {"log":"js expression to print"}]
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const [page = 'index.html?autotest&q=low', stepsArg = '[]', width = '1280', height = '720'] = process.argv.slice(2);
const steps = JSON.parse(existsSync(stepsArg) ? readFileSync(stepsArg, 'utf8') : stepsArg);

let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = createRequire('/opt/node-tools/node_modules/')('playwright')); }

const root = resolve(import.meta.dirname, '..');
const server = await createServer({ root, configFile: resolve(root, 'vite.config.js'), server: { port: 0, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] } }, logLevel: 'error' });
await server.listen();
const url = `http://127.0.0.1:${server.httpServer.address().port}/${page}`;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const pg = await (await browser.newContext({ viewport: { width: +width, height: +height } })).newPage();
const logs = [];
pg.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/Clock|GPU stall/.test(m.text())) logs.push(`[${m.type()}] ${m.text()}`); });
pg.on('pageerror', (e) => logs.push(`[pageerror] ${e.stack || e.message}`));
try {
  await pg.goto(url, { waitUntil: 'load', timeout: 120000 });
  await pg.waitForFunction(() => window.__ready === true, null, { timeout: 240000 });
  for (const s of steps) {
    if (s.eval) await pg.evaluate(s.eval);
    if (s.log) console.log('>', s.log, '=>', JSON.stringify(await pg.evaluate(s.log)));
    if (s.wait) await pg.waitForTimeout(s.wait);
    if (s.shot) { mkdirSync(dirname(resolve(root, s.shot)), { recursive: true }); await pg.screenshot({ path: resolve(root, s.shot), timeout: 120000 }); console.log('saved', s.shot); }
  }
} catch (e) { console.error('ERROR', e.message); }
finally {
  if (logs.length) console.log(logs.slice(0, 40).join('\n'));
  await browser.close();
  await server.close();
}
