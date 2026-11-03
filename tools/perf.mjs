// Performance harness: boots the game headless (SwiftShader) and measures, per view and quality preset,
//   - CPU ms per frame split by system: every Game.update sub-step, every Game.updaters entry (labelled by the file and
//     line that registered it, read through the DevTools protocol), and the render passes (JS submission time);
//   - GPU-inclusive ms per render pass ("sync" frames call gl.finish() after each pass; SwiftShader rasterises on the
//     CPU, so this is the fill / shader cost that a real GPU would carry);
//   - renderer.info (draw calls, triangles, programs, textures, geometries), texture / buffer uploads per frame,
//     scene census (meshes, shadow casters, lights), JS heap and a rough allocation rate.
// SwiftShader is CPU-only: absolute FPS means nothing. Compare draw calls, triangles and CPU ms between runs.
//
// Usage:
//   node tools/perf.mjs [--q low,medium,high,ultra] [--views lane_day,lane_night,garage,park,mikawaya,ramen,pc]
//                       [--frames 24] [--sync 6] [--out shots/perf/run.json] [--shots shots/perf/before] [--profile medium]
//                       [--size 1280x720]
// --profile <q>: also record a sampled CPU profile per view at that quality and print the top self-time functions.
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const QS = flag('q', 'low,medium,high').split(',');
const VIEWS_ON = flag('views', 'lane_day,lane_night,garage,park,mikawaya,ramen,pc').split(',');
const FRAMES = +flag('frames', 12), SYNC = +flag('sync', 4), SETTLE = +flag('settle', 4);
const OUT = flag('out', 'shots/perf/run.json'), SHOTS = flag('shots', ''), PROFILE = flag('profile', '');
const [W, H] = flag('size', '960x540').split('x').map(Number);

// views: setup (in page, with window.dbg) run once; everything settles for a few simulated seconds before measuring
const VIEWS = {
  lane_day: 'dbg.time(11); dbg.view(3, 9.6, Math.PI / 2, 0.02);',
  lane_night: 'dbg.time(21.5); dbg.view(3, 9.6, Math.PI / 2, 0.02);',
  garage: `dbg.time(14); game.gachaDebug.setup(); dbg.view(0.6, 3.4, 0.35, -0.12);
    const P = game.pedestrians; P.open = true;
    for (let i = 0; i < 3; i++) { P.spawn(); const p = P.list[P.list.length - 1]; p.h.root.position.set(-0.6 + i * 0.7, 0, 6.2); p.path = []; P.routeIn(p, game.machines[i]); }
    dbg.step(4);`,
  park: 'dbg.time(11); dbg.view(13.2, -6.4, -0.55, -0.04);',
  mikawaya: 'dbg.time(11); dbg.view(-12.4, 15.55, Math.PI, -0.06);',
  ramen: 'dbg.time(19.5); dbg.needs.enter("ramen");',
  pc: 'dbg.time(14); dbg.view(0.4, 2.6, 0.55, -0.12); dbg.pc();',
};
// --ablate: per view, the fenced render time with one cost switched off at a time (what each feature costs)
const ABL = {
  none: ['', ''],
  pointLights: ['window.__abl = []; __game.scene.traverse((o) => { if ((o.isPointLight) && o.visible) { o.visible = false; __abl.push(o); } });', '__abl.forEach((o) => { o.visible = true; });'],
  shadows: ['__game.renderer.renderer.shadowMap.enabled = false; __game.scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { m.needsUpdate = true; }); });', '__game.renderer.renderer.shadowMap.enabled = true; __game.scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { m.needsUpdate = true; }); });'],
  shadowRender: ['window.__sr = __game.renderer.renderer.shadowMap.render; __game.renderer.renderer.shadowMap.render = () => {};', '__game.renderer.renderer.shadowMap.render = __sr;'],
  envMap: ['window.__env = __game.scene.environment; __game.scene.environment = null;', '__game.scene.environment = __env;'],
  post: ['window.__pp = __game.renderer.composer.passes.map((p) => p.enabled); __game.renderer.composer.passes.forEach((p, i) => { if (i > 1 && !p.renderToScreen) p.enabled = false; });', '__game.renderer.composer.passes.forEach((p, i) => { p.enabled = __pp[i]; });'],
  bloom: ['if (__game.renderer.bloom) __game.renderer.bloom.enabled = false;', 'if (__game.renderer.bloom) __game.renderer.bloom.enabled = true;'],
  halfRes: ['window.__pr = __game.renderer.renderer.getPixelRatio(); __game.renderer.renderer.setPixelRatio(__pr / 2); __game.renderer.resize();', '__game.renderer.renderer.setPixelRatio(__pr); __game.renderer.resize();'],
  fog: ['window.__fog = __game.scene.fog; __game.scene.fog = null;', '__game.scene.fog = __fog;'],
};
const ABLATE = args.includes('--ablate') ? flag('ablate-set', Object.keys(ABL).join(',')).split(',') : null;
const LEAVE = 'try { if (game.pc?.active) { game.pc.exit(); game.pc.finishExit(); } } catch (e) {} try { if (game.places?.where) game.places.exit({ instant: true }); } catch (e) {}';

let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = createRequire('/opt/node-tools/node_modules/')('playwright')); }
const root = resolve(import.meta.dirname, '..');
const server = await createServer({ root, configFile: resolve(root, 'vite.config.js'), server: { port: 0, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] } }, logLevel: 'error' });
await server.listen();
const url = `http://127.0.0.1:${server.httpServer.address().port}/index.html?autotest&q=${QS[0]}`;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--enable-precise-memory-info'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H } });
// a save with a quality set, so the first-run auto quality never switches presets under us (and the shop is running)
await ctx.addInitScript((q) => { try { localStorage.setItem('gacha-garage-save-v2', JSON.stringify({ settings: { quality: q }, perfRun: true })); } catch { /* */ } }, QS[0]);
const pg = await ctx.newPage();
const logs = [];
pg.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/Clock|GPU stall|willReadFrequently/.test(m.text())) logs.push(`[${m.type()}] ${m.text()}`); });
pg.on('pageerror', (e) => logs.push(`[pageerror] ${e.stack || e.message}`));
const cdp = await ctx.newCDPSession(pg);
const scripts = new Map();
cdp.on('Debugger.scriptParsed', (e) => scripts.set(e.scriptId, e.url));

// where a function was defined: "places/Places.js:40"
async function fnLocation(expr) {
  const { result } = await cdp.send('Runtime.evaluate', { expression: expr });
  if (!result.objectId) return '?';
  const props = await cdp.send('Runtime.getProperties', { objectId: result.objectId, ownProperties: true });
  const loc = props.internalProperties?.find((p) => p.name === '[[FunctionLocation]]')?.value?.value;
  if (!loc) return '?';
  const u = (scripts.get(loc.scriptId) || '').replace(/^.*?\/src\//, '').replace(/\?.*$/, '');
  return `${u}:${loc.lineNumber + 1}`;
}

// ------------------------------------------------------------------ in-page instrumentation
function instrument(labels) {
  const g = window.__game, R = g.renderer, r = R.renderer, gl = r.getContext();
  const P = window.__perf || (window.__perf = { on: false, sync: false, frame: null, frames: [], lastStart: 0 });
  const now = () => performance.now();
  const add = (label, ms) => { const f = P.frame; if (P.on && f) f.t[label] = (f.t[label] || 0) + ms; };
  const cnt = (label, n = 1) => { const f = P.frame; if (P.on && f) f.c[label] = (f.c[label] || 0) + n; };
  P.add = add; P.cnt = cnt;
  // a real fence: gl.finish() returns early in Chrome's command buffer, so clear a private 1x1 target and read it back
  // (the GPU process runs commands in order, so that read waits for everything submitted before it)
  if (!P.fbo) {
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    P.fbo = gl.createFramebuffer(); const prev = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    gl.bindFramebuffer(gl.FRAMEBUFFER, P.fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, prev); gl.bindTexture(gl.TEXTURE_2D, null);
    r.state?.reset?.();
    P.px = new Uint8Array(4);
    P.rp = gl.readPixels;
  }
  P.fence = () => {
    const prev = gl.getParameter(gl.FRAMEBUFFER_BINDING), sc = gl.isEnabled(gl.SCISSOR_TEST), cm = gl.getParameter(gl.COLOR_WRITEMASK);
    gl.bindFramebuffer(gl.FRAMEBUFFER, P.fbo); if (sc) gl.disable(gl.SCISSOR_TEST); gl.colorMask(true, true, true, true);
    gl.clearBufferfv(gl.COLOR, 0, [Math.random(), 0, 0, 1]);
    P.rp.call(gl, 0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, P.px);
    gl.colorMask(...cm); if (sc) gl.enable(gl.SCISSOR_TEST); gl.bindFramebuffer(gl.FRAMEBUFFER, prev);
  };
  const wrap = (obj, name, label, opt = {}) => {
    if (!obj || typeof obj[name] !== 'function' || obj[name].__perf) return;
    const f = obj[name];
    const w = function (...a) {
      const c0 = r.info.render.calls, t0 = now();
      try { return f.apply(this, a); } finally {
        if (opt.sync && P.sync) P.fence();
        add(label, now() - t0);
        if (opt.calls) cnt('calls:' + label.replace(/^r:/, ''), r.info.render.calls - c0);
      }
    };
    w.__perf = f; obj[name] = w;
  };
  P.wrap = wrap;
  // the frame: update + render
  if (!g.update.__perf) {
    const u = g.update, rd = g.render;
    g.update = function (dt) {
      const t = now();
      if (P.on) {
        const m = performance.memory?.usedJSHeapSize || 0;
        if (P.frame) P.frames.push(P.frame);
        P.frame = { t: {}, c: {}, interval: P.lastStart ? t - P.lastStart : 0, heap: m, heapUp: P.lastHeap && m > P.lastHeap ? m - P.lastHeap : 0 };
        P.lastHeap = m;
      }
      P.lastStart = t;
      try { return u.call(this, dt); } finally { add('update', now() - t); }
    };
    g.update.__perf = u;
    g.render = function (dt) {
      if (P.bd === 'arm') P.bd = 'on'; else if (P.bd === 'on') P.bd = 'done';
      r.info.autoReset = false; r.info.reset();
      if (P.sync) P.fence();
      const t = now();
      try { return rd.call(this, dt); } finally {
        if (P.sync) P.fence();
        add('render', now() - t);
        cnt('drawCalls', r.info.render.calls); cnt('triangles', r.info.render.triangles);
        cnt('points', r.info.render.points); cnt('lines', r.info.render.lines);
        // throttle: SwiftShader draws far slower than the page asks for frames, so without this the GPU backlog grows
        // without bound (screenshots time out, fences wait minutes). Outside the timed part of the frame.
        if (!P.sync) P.fence();
      }
    };
    g.render.__perf = rd;
    // GL uploads (CanvasTextures re-uploaded every frame, dynamic buffers)
    for (const k of ['texImage2D', 'texSubImage2D', 'bufferData', 'bufferSubData', 'texImage3D', 'compressedTexImage2D', 'readPixels', 'useProgram', 'getParameter', 'getError']) {
      const o = gl[k];
      gl[k] = function (...a) { cnt('gl.' + k); return o.apply(gl, a); };
    }
    wrap(g.scene, 'updateMatrixWorld', 'r:scene.updateMatrixWorld');
  }
  // Game.update sub-steps
  const sub = [['input', g.input, 'beginFrame'], ['player', g.player, 'update'], ['cutscene', g.cutscene, 'update'],
    ['interaction', g.interaction, 'update'], ['held', g.held, 'update'], ['notebook', g.notebook, 'update'],
    ['story', g.story, 'update'], ['guide', g.guide, 'update'], ['timeStop', g.timeStop, 'update'],
    ['physics', g.physics, 'step'], ['street', g.street, 'update'], ['pedestrians', g.pedestrians, 'update'],
    ['ghostAlley', g.ghostAlley, 'update'], ['goods', g.goods, 'update'], ['items', g.items, 'update'],
    ['delivery', g.delivery, 'update'], ['reveal', g.reveal, 'update'], ['tweens', g.tweens, 'update'],
    ['effects', g.effects, 'update'], ['garage', g.garage, 'update'], ['lighting', g.lighting, 'update'],
    ['thumbs', g.thumbs, 'tick'], ['ambientTick', g, 'ambientTick'], ['tipCheck', g, 'tipCheck'],
    ['  garage>town', g.garage.town, 'update'], ['  pedestrians>bubbles', g.pedestrians?.bubbles, 'update'],
    ['  interaction>raycast', g.interaction, 'pick']];
  for (const [l, o, n] of sub) wrap(o, n, l);
  if (g.machines[0]) wrap(Object.getPrototypeOf(g.machines[0]), 'update', 'machines');
  if (g.shelves[0]) wrap(Object.getPrototypeOf(g.shelves[0]), 'update', 'shelves');
  // Game.updaters (plugins / systems), labelled by where they were registered
  const U = g.constructor.updaters;
  U.forEach((f, i) => { if (f.__perf) return; const lab = 'u:' + (labels[i] || ('#' + i)); const w = (gg, dt) => { const t = now(); try { return f(gg, dt); } finally { add(lab, now() - t); } }; w.__perf = f; U[i] = w; });
  // render passes (composer is rebuilt on quality changes: re-instrument after setQuality)
  wrap(r.shadowMap, 'render', 'r:shadowMap', { sync: true, calls: true });
  for (const p of R.composer.passes) wrap(p, 'render', 'r:' + (p.constructor.name || 'pass'), { sync: true, calls: true });
  return U.length;
}

function census() {
  const g = window.__game, r = g.renderer.renderer;
  const c = { meshes: 0, visMeshes: 0, casters: 0, skinned: 0, instanced: 0, points: 0, sprites: 0, lights: 0, shadowLights: 0, pointLights: 0, objects: 0 };
  const walk = (o, vis) => {
    c.objects++;
    const v = vis && o.visible;
    if (o.isMesh) { c.meshes++; if (v) { c.visMeshes++; if (o.castShadow) c.casters++; if (o.isSkinnedMesh) c.skinned++; if (o.isInstancedMesh) c.instanced++; } }
    if (o.isPoints && v) c.points++;
    if (o.isSprite && v) c.sprites++;
    if (o.isLight && v) { c.lights++; if (o.castShadow) c.shadowLights++; if (o.isPointLight || o.isSpotLight) c.pointLights++; }
    for (const ch of o.children) walk(ch, v);
  };
  walk(g.scene, true);
  c.programs = r.info.programs?.length || 0;
  c.geometries = r.info.memory.geometries; c.textures = r.info.memory.textures;
  c.updaters = g.constructor.updaters.length;
  c.heapMB = +((performance.memory?.usedJSHeapSize || 0) / 1048576).toFixed(1);
  c.pixelRatio = r.getPixelRatio();
  c.domNodes = document.getElementsByTagName('*').length;
  if (g.renderer.lightPool) c.lightPool = { ...g.renderer.lightPool.stats, size: g.renderer.lightPool.size };
  if (g.renderer.shadowStats) c.shadow = { ...g.renderer.shadowStats };
  return c;
}

// which objects get drawn: hook onBeforeRender on every renderable for one frame, group by the top-level scene child
function breakdownStart() {
  const g = window.__game, B = window.__bd = { groups: {}, objs: new Map(), restore: [] };
  const topName = (o) => {
    let a = o, path = [];
    while (a.parent && a.parent !== g.scene) { if (a.name) path.unshift(a.name); a = a.parent; }
    let top = a.name || a.type;
    if (!a.name) { let nm = ''; a.traverse((c) => { if (!nm && c.name) nm = c.name; }); top += nm ? '(' + nm + ')' : `@${a.position.x.toFixed(0)},${a.position.z.toFixed(0)}`; }
    return [top, path.slice(0, 1).join('/')];
  };
  g.scene.traverse((o) => {
    if (!(o.isMesh || o.isPoints || o.isLine || o.isSprite)) return;
    const prev = o.onBeforeRender, [top, sub] = topName(o);
    const geo = o.geometry;
    const n = geo ? (geo.index ? geo.index.count : geo.attributes.position?.count || 0) : 0;
    const inst = o.isInstancedMesh ? o.count : 1;
    o.onBeforeRender = function (...a) {
      if (window.__perf?.bd !== 'on') return prev.apply(this, a);
      const grp = a[5];
      const tri = o.isMesh ? Math.min(grp ? grp.count : n, geo?.drawRange?.count ?? Infinity) / 3 * inst : 0;
      const k = top; const G = B.groups[k] || (B.groups[k] = { calls: 0, tris: 0, subs: {} });
      G.calls++; G.tris += tri; if (sub) G.subs[sub] = (G.subs[sub] || 0) + 1;
      const key = (o.name || o.type) + ' <' + top + (sub ? '/' + sub : '') + '>';
      const e = B.objs.get(key) || { calls: 0, tris: 0 }; e.calls++; e.tris += tri; B.objs.set(key, e);
      return prev.apply(this, a);
    };
    B.restore.push([o, prev]);
  });
}
function breakdownEnd() {
  const B = window.__bd; for (const [o, f] of B.restore) o.onBeforeRender = f;
  const groups = Object.entries(B.groups).sort((a, b) => b[1].calls - a[1].calls).map(([k, v]) => ({ k, calls: v.calls, ktris: Math.round(v.tris / 1000), subs: Object.entries(v.subs).sort((a, b) => b[1] - a[1]).slice(0, 6) }));
  const top = [...B.objs.entries()].sort((a, b) => b[1].tris - a[1].tris).slice(0, 25).map(([k, v]) => [k, v.calls, Math.round(v.tris / 1000)]);
  window.__bd = null;
  return { groups, topTris: top };
}

function summarize() {
  const P = window.__perf, F = P.frames;
  const out = { n: F.length, t: {}, c: {} };
  for (const f of F) {
    for (const [k, v] of Object.entries(f.t)) out.t[k] = (out.t[k] || 0) + v / F.length;
    for (const [k, v] of Object.entries(f.c)) out.c[k] = (out.c[k] || 0) + v / F.length;
  }
  const iv = F.map((f) => f.interval).filter((x) => x > 0).sort((a, b) => a - b);
  out.interval = iv.length ? iv[Math.floor(iv.length / 2)] : 0;
  out.allocMBs = F.reduce((a, f) => a + f.heapUp, 0) / 1048576 / Math.max(1e-3, F.reduce((a, f) => a + f.interval, 0) / 1000);
  P.frames = []; P.frame = null;
  return out;
}

const waitFrames = (n) => pg.evaluate((n) => new Promise((res) => { const g = window.__game; let k = 0; const r0 = g.render; g.render = function (dt) { const x = r0.call(this, dt); if (++k >= n) { g.render = r0; res(); } return x; }; }), n);

// ------------------------------------------------------------------ run
const results = { size: `${W}x${H}`, date: new Date().toISOString(), views: {} };
const profiles = {};
const save = () => { results.profiles = profiles; results.logs = logs.slice(0, 60); mkdirSync(dirname(resolve(root, OUT)), { recursive: true }); writeFileSync(resolve(root, OUT), JSON.stringify(results, null, 1)); };
try {
  await pg.goto(url, { waitUntil: 'load', timeout: 180000 });
  await pg.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
  // (the thumbnail prewarm queue would read pixels back every frame for minutes: measured separately, see --thumbs)
  const thumbsQ = await pg.evaluate('window.__game.thumbs.queue?.length || 0');
  results.thumbsQueue = thumbsQ;
  if (!args.includes('--thumbs')) await pg.evaluate('window.__game.thumbs.queue && (window.__game.thumbs.queue.length = 0)');
  await pg.evaluate('window.game = window.__game; dbg.shopOpen(); dbg.people?.spawnAll?.(); dbg.step(2); __game.renderer.debugShadows = true;');
  await waitFrames(10);
  await cdp.send('Debugger.enable');
  const nU = await pg.evaluate('__game.constructor.updaters.length');
  const labels = [];
  for (let i = 0; i < nU; i++) labels.push(await fnLocation(`(__game.constructor.updaters[${i}].__perf || __game.constructor.updaters[${i}])`));
  await cdp.send('Debugger.disable');
  console.log('updaters:', labels.join(', '));
  await pg.evaluate(instrument, labels);
  for (const v of VIEWS_ON) {
    await pg.evaluate(LEAVE);
    await pg.evaluate(VIEWS[v]);
    await waitFrames(6);
    results.views[v] = {};
    for (const q of QS) try {
      await pg.evaluate((q) => { __game.renderer.setQuality(q); }, q);
      await pg.evaluate(instrument, labels);
      await waitFrames(SETTLE);
      // CPU frames
      await pg.evaluate(() => { window.__perf.on = true; window.__perf.sync = false; window.__perf.frames = []; window.__perf.frame = null; });
      await waitFrames(FRAMES);
      const cpu = await pg.evaluate(summarize);
      // GPU-inclusive frames
      await pg.evaluate(() => { window.__perf.sync = true; });
      await waitFrames(SYNC);
      const sync = await pg.evaluate(summarize);
      await pg.evaluate(() => { window.__perf.on = false; window.__perf.sync = false; });
      const cen = await pg.evaluate(census);
      if (ABLATE) {
        results.views[v][q + ':ablate'] = {};
        for (const a of ABLATE) {
          await pg.evaluate(ABL[a][0]); await pg.evaluate(instrument, labels); await waitFrames(3);
          await pg.evaluate(() => { window.__perf.on = true; window.__perf.sync = true; window.__perf.frames = []; window.__perf.frame = null; });
          await waitFrames(SYNC);
          const sy = await pg.evaluate(summarize);
          await pg.evaluate(() => { window.__perf.on = false; window.__perf.sync = false; });
          await pg.evaluate(ABL[a][1]); await waitFrames(2);
          results.views[v][q + ':ablate'][a] = { render: sy.t.render, main: sy.t['r:RenderPass'], shadow: sy.t['r:shadowMap'], calls: sy.c.drawCalls };
          console.log(`  ablate ${v}@${q} -${a}: render(sync) ${sy.t.render?.toFixed(0)}ms main ${sy.t['r:RenderPass']?.toFixed(0)} shadow ${sy.t['r:shadowMap']?.toFixed(0)}`);
        }
      }
      results.views[v][q] = { cpu, sync, census: cen };
      save();
      console.log(`${v} @${q}: update ${cpu.t.update?.toFixed(2)}ms render(js) ${cpu.t.render?.toFixed(2)}ms render(sync) ${sync.t.render?.toFixed(1)}ms frame ${cpu.interval.toFixed(0)}ms calls ${cpu.c.drawCalls?.toFixed(0)} tris ${(cpu.c.triangles / 1000).toFixed(0)}k`);
      if (q === QS[0]) {
        await pg.evaluate(breakdownStart); await pg.evaluate(() => { window.__perf.bd = 'arm'; }); await waitFrames(2);
        await pg.evaluate(() => { window.__perf.bd = null; });
        results.views[v][q].draws = await pg.evaluate(breakdownEnd);
        console.log('  draws by group:', results.views[v][q].draws.groups.slice(0, 14).map((x) => `${x.k}:${x.calls}/${x.ktris}k`).join('  '));
      }
      if (SHOTS && q === QS[0]) { mkdirSync(resolve(root, SHOTS), { recursive: true }); await waitFrames(1); await pg.screenshot({ path: resolve(root, SHOTS, `${v}.png`), timeout: 600000 }).catch((e) => console.log('shot failed', v, e.message)); }
      if (PROFILE === q) {
        await cdp.send('Profiler.enable');
        await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
        await cdp.send('Profiler.start');
        await waitFrames(FRAMES);
        const { profile } = await cdp.send('Profiler.stop');
        await cdp.send('Profiler.disable');
        const self = new Map(); const dtv = profile.timeDeltas || []; const byId = new Map(profile.nodes.map((n) => [n.id, n]));
        const tot = new Map();
        (profile.samples || []).forEach((id, i) => { const n = byId.get(id); const cf = n.callFrame; const k = `${cf.functionName || '(anon)'} ${cf.url.replace(/^.*?\/(src|node_modules)\//, '$1/').replace(/\?.*$/, '')}:${cf.lineNumber + 1}`; self.set(k, (self.get(k) || 0) + (dtv[i] || 0) / 1000); });
        void tot;
        self.delete('(idle) :0'); const all = [...self.values()].reduce((a, b) => a + b, 0);
        self.delete('(idle) :0'); self.delete('(program) :0'); profiles[v] = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, ms]) => [k, +(ms / all * 100).toFixed(1)]);
        console.log(`  top self time (${v} @${q}):`); for (const [k, pc] of profiles[v].slice(0, 18)) console.log(`    ${pc.toFixed(1).padStart(5)}%  ${k}`);
      }
    } catch (e) { console.log(`ERROR in ${v} @${q}:`, e.message); }
  }
} catch (e) { console.error('ERROR', e.stack || e.message); }
finally {
  save();
  console.log('wrote', OUT);
  if (logs.length) console.log(logs.slice(0, 30).join('\n'));
  await browser.close();
  await server.close();
}
