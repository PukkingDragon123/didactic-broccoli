// TEMPORARY dev helper (deleted when visitors.js is done): ?chars=visitors_test&only=a,b&heads=1
import all from './visitors.js';
const q = new URLSearchParams(location.search);
const only = (q.get('only') || '').split(',').filter(Boolean);
const heads = q.get('heads');
const lib = {};
for (const [k, v] of Object.entries(all)) {
  if (only.length && !only.includes(k)) continue;
  lib[k] = !heads ? v : {
    ...v,
    build(p, vi) {
      v.build(p, vi);
      for (const n of ['torso', 'armL', 'armR', 'legL', 'legR']) if (!heads.includes(n)) p[n].map.clear();
    },
  };
}
export default lib;
