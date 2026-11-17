// Look audit: boots the game headless, walks the camera through the world (so lazy assets load), then lists every
// visible mesh that breaks the art rules (docs/ART.md, CLAUDE.md): untextured single-colour meshes, voxel-era vertex
// colour meshes, a texture used as one flat colour, tiny or broken textures, and assets that failed to load.
// Usage: tools/slot.sh node tools/look-audit.mjs [filter] [out=shots/audit]
//   filter: only report groups whose label contains this text (e.g. "town", "garage", "asset:lowpix/animals").
// Writes <out>/AUDIT.txt (human) and <out>/audit.json. Exit code 0 always; read the PROBLEMS total.
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [filter = '', outDir = 'shots/audit'] = process.argv.slice(2);
let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = createRequire('/opt/node-tools/node_modules/')('playwright')); }
const root = resolve(import.meta.dirname, '..');
const server = await createServer({ root, configFile: resolve(root, 'vite.config.js'), server: { port: 0, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] } }, logLevel: 'error' });
await server.listen();
const url = `http://127.0.0.1:${server.httpServer.address().port}/index.html?autotest&q=high`;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await (await browser.newContext({ viewport: { width: 640, height: 360 } })).newPage();
const failed = new Set(), errors = [];
pg.on('console', (m) => {
  const t = m.text();
  const f = /asset failed to load:\s*(\S+)/.exec(t); if (f) failed.add(f[1]);
  if (m.type() === 'error') errors.push(t.slice(0, 200));
});
pg.on('pageerror', (e) => errors.push('[pageerror] ' + (e.message || e).toString().slice(0, 200)));

// Viewpoints that cover the garage, the lane, the shops, the park and the outskirts.
const P = Math.PI;
const VIEWS = [[0, 2, 0], [0, -2, P], [0, 13, 0], [-2, 10.5, -P / 2], [6, 9.5, P / 2], [-12, 12.5, P], [13, 13, P], [-8.5, 14.5, P],
  [-28, 8, P / 2], [20, 10, -P / 2], [-20, 10, P / 2], [0, -20, 0], [0, 30, 0], [30, -10, 0], [-30, -10, 0], [60, -30, 0]];

function audit() {
  const g = window.__game, scene = g.scene;
  scene.updateMatrixWorld(true);
  const visible = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  const label = (o) => {
    const chain = [];
    let asset = null;
    for (let p = o; p && p !== scene; p = p.parent) {
      if (!asset && p.userData?.asset) asset = p.userData.asset;
      if (p.name && !/^(Group|Scene|mesh|Object3D)$/i.test(p.name)) chain.unshift(p.name);
    }
    const top = chain.slice(0, 2).join(' > ') || '(unnamed ' + (o.geometry?.type || o.type) + ')';
    return asset ? top + ' [asset:' + asset + ']' : top;
  };
  const groups = new Map(), totals = {};
  const add = (cat, o, extra = '') => {
    totals[cat] = (totals[cat] || 0) + 1;
    const l = label(o), k = cat + '|' + l;
    let e = groups.get(k);
    if (!e) groups.set(k, e = { cat, label: l, n: 0, r: 0, at: null, extra });
    e.n++;
    const bs = o.geometry.boundingSphere || (o.geometry.computeBoundingSphere(), o.geometry.boundingSphere);
    const r = (bs?.radius || 0) * o.matrixWorld.getMaxScaleOnAxis();
    if (r > e.r) { e.r = +r.toFixed(2); const c = bs.center.clone().applyMatrix4(o.matrixWorld); e.at = [c.x, c.y, c.z].map((v) => +v.toFixed(1)); }
  };
  scene.traverse((o) => {
    if (!(o.isMesh || o.isSkinnedMesh || o.isInstancedMesh) || !o.geometry?.attributes?.position || !visible(o)) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!m || !m.visible || m.colorWrite === false) continue;
      if (m.isShaderMaterial || m.isRawShaderMaterial) { add('ok:shader', o); continue; }
      if (m.transparent && m.opacity < 0.6) { add('ok:transparent', o); continue; }
      const custom = !!m.onBeforeCompile && m.onBeforeCompile.toString().length > 40;
      if (m.map) {
        const im = m.map.image;
        if (!im || !(im.width > 0)) { add('BROKEN texture (no image)', o); continue; }
        const uv = o.geometry.attributes.uv;
        if (!uv) { add(custom ? 'ok:world-projected' : 'FLAT (map but no uv)', o); continue; }
        let a = 1e9, b = -1e9, c = 1e9, d = -1e9; const step = Math.max(1, Math.floor(uv.count / 500));
        for (let i = 0; i < uv.count; i += step) { const u = uv.getX(i), v = uv.getY(i); a = Math.min(a, u); b = Math.max(b, u); c = Math.min(c, v); d = Math.max(d, v); }
        const span = Math.max((b - a) * im.width * (m.map.repeat?.x || 1), (d - c) * im.height * (m.map.repeat?.y || 1));
        if (span < 3 && !custom) { add('FLAT (texture used as one colour)', o, '#' + m.color?.getHexString()); continue; }
        if (Math.max(im.width, im.height) <= 16 && !custom) { add('TINY texture (<=16px)', o, im.width + 'x' + im.height); continue; }
        add('ok:textured', o); continue;
      }
      if (custom) { add('ok:custom-shaded', o); continue; }
      if (o.geometry.attributes.color && m.vertexColors) { add('VOXEL-ERA vertex colours', o); continue; }
      if (m.isMeshBasicMaterial || m.isSpriteMaterial || m.isPointsMaterial) { add('ok:basic (light/ui)', o, '#' + m.color?.getHexString()); continue; }
      add('UNTEXTURED single colour', o, '#' + m.color?.getHexString());
    }
  });
  const list = [...groups.values()].filter((e) => !e.cat.startsWith('ok:')).sort((x, y) => y.r * Math.sqrt(y.n) - x.r * Math.sqrt(x.n));
  return { totals, list };
}

try {
  await pg.goto(url, { waitUntil: 'load', timeout: 180000 });
  await pg.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
  await pg.evaluate(() => { try { window.dbg.shopOpen(); window.dbg.time(11); } catch {} });
  for (const [x, z, yaw] of VIEWS) {
    await pg.evaluate(([x, z, yaw]) => { window.dbg.view(x, z, yaw, 0.05); window.dbg.step(0.1); const g = window.__game; g.renderer.render(0, g.time); }, [x, z, yaw]);
    await pg.waitForTimeout(1200);
  }
  await pg.waitForTimeout(3000);
  const { totals, list } = await pg.evaluate(audit);
  const shown = list.filter((e) => !filter || e.label.includes(filter));
  const problems = shown.reduce((s, e) => s + e.n, 0);
  const lines = [`LOOK AUDIT ${new Date().toISOString()}${filter ? ' filter=' + filter : ''}`,
    `PROBLEMS: ${problems} meshes in ${shown.length} groups; failed asset loads: ${failed.size}`, '',
    'Totals (all visible meshes): ' + Object.entries(totals).map(([k, v]) => `${k}=${v}`).join(', '), ''];
  if (failed.size) lines.push('FAILED ASSET LOADS:', ...[...failed].map((f) => '  ' + f), '');
  let cat = null;
  for (const e of [...shown].sort((x, y) => x.cat.localeCompare(y.cat) || y.r * Math.sqrt(y.n) - x.r * Math.sqrt(x.n))) {
    if (e.cat !== cat) { lines.push('== ' + e.cat); cat = e.cat; }
    lines.push(`  ${String(e.n).padStart(4)} mesh  r=${String(e.r).padStart(5)}  at ${JSON.stringify(e.at)}  ${e.label}  ${e.extra || ''}`);
  }
  if (errors.length) lines.push('', 'CONSOLE ERRORS:', ...errors.slice(0, 20).map((e) => '  ' + e));
  mkdirSync(resolve(root, outDir), { recursive: true });
  writeFileSync(resolve(root, outDir, 'AUDIT.txt'), lines.join('\n') + '\n');
  writeFileSync(resolve(root, outDir, 'audit.json'), JSON.stringify({ totals, failed: [...failed], list: shown, errors }, null, 1));
  console.log(lines.slice(0, 6).join('\n'));
  console.log('written', outDir + '/AUDIT.txt');
} catch (e) { console.error('ERROR', e.message); }
finally { await browser.close(); await server.close(); }
