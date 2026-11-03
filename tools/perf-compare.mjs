// Compare two tools/perf.mjs result files as Markdown tables.
// Usage: node tools/perf-compare.mjs shots/perf/baseline.json shots/perf/after.json [--systems 12]
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const [fa, fb] = args.filter((a) => !a.startsWith('--'));
const nSys = +(args[args.indexOf('--systems') + 1] || 12);
const A = JSON.parse(readFileSync(fa, 'utf8')), B = JSON.parse(readFileSync(fb, 'utf8'));
const f = (x, d = 1) => (x === undefined || x === null || Number.isNaN(x) ? '-' : (+x).toFixed(d));
const pct = (a, b) => (a > 0 && b !== undefined ? `${b <= a ? '-' : '+'}${Math.abs((1 - b / a) * 100).toFixed(0)}%` : '');

console.log(`Before: ${fa} (${A.date}, ${A.size})  After: ${fb} (${B.date}, ${B.size})\n`);
console.log('| view | quality | draw calls | triangles | shadow draws | update ms (CPU) | render ms (CPU submit) | GPU-incl. render ms (fenced) | programs | lights in shader |');
console.log('|---|---|---|---|---|---|---|---|---|---|');
for (const v of Object.keys(A.views)) for (const q of Object.keys(A.views[v])) {
  if (q.includes(':')) continue;
  const a = A.views[v][q], b = B.views?.[v]?.[q];
  if (!b) continue;
  const row = (k, g, d = 0, s = 1) => `${f(g(a) / s, d)} → ${f(g(b) / s, d)} (${pct(g(a), g(b))})`;
  console.log(`| ${v} | ${q} | ${row('c', (x) => x.cpu.c.drawCalls)} | ${row('t', (x) => x.cpu.c.triangles, 0, 1000)}k | ${row('s', (x) => x.cpu.c['calls:shadowMap'] ?? 0)} | ${row('u', (x) => x.cpu.t.update, 2)} | ${row('r', (x) => x.cpu.t.render, 2)} | ${row('g', (x) => x.sync.t.render, 0)} | ${a.census.programs} → ${b.census.programs} | ${b.census.lightPool ? `${a.census.pointLights} → ${b.census.lightPool.size}` : ''} |`);
}

// per-system CPU (update sub-steps and updaters), averaged over every view and quality
console.log('\nCPU ms per frame by system (mean over all views and qualities measured in both runs):\n');
const sum = (R) => {
  const acc = {}; let n = 0;
  for (const v of Object.keys(R.views)) for (const q of Object.keys(R.views[v])) {
    if (q.includes(':') || !A.views[v]?.[q] || !B.views?.[v]?.[q]) continue;
    n++;
    for (const [k, x] of Object.entries(R.views[v][q].cpu.t)) acc[k] = (acc[k] || 0) + x;
  }
  for (const k of Object.keys(acc)) acc[k] /= Math.max(1, n);
  return acc;
};
const SA = sum(A), SB = sum(B);
const keys = Object.keys(SA).filter((k) => k !== 'update' && k !== 'render').sort((x, y) => (SA[y] || 0) - (SA[x] || 0)).slice(0, nSys);
console.log('| system | before | after |');
console.log('|---|---|---|');
for (const k of ['update', 'render', ...keys]) console.log(`| ${k} | ${f(SA[k], 2)} | ${f(SB[k], 2)} |`);

// per view x system detail for the slowest systems
console.log('\nPer view (first quality), top systems before → after (ms):\n');
for (const v of Object.keys(A.views)) {
  const q = Object.keys(A.views[v]).find((x) => !x.includes(':'));
  const a = A.views[v][q]?.cpu.t, b = B.views?.[v]?.[q]?.cpu.t;
  if (!a || !b) continue;
  const top = Object.keys(a).filter((k) => !['update', 'render'].includes(k)).sort((x, y) => a[y] - a[x]).slice(0, 6);
  console.log(`- ${v} @${q}: ` + top.map((k) => `${k} ${f(a[k], 2)}→${f(b[k], 2)}`).join(', '));
}
